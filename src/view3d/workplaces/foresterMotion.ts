import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 국유림 관리소 (2026-11-01, the workplace pipeline, at the user's request), in the made-up 솔재 hills. Each
 * motion is a round of beats: where the dweller is, where the hands go, what moves. The piece reads the same script by
 * the same clock (forester.ts), so the tree comes down when the cut is through and the tray fills as the pots go in.
 *
 * - fgPlant (묘목 포트): a pot off the stack, soil scooped in, a seedling set and firmed, watered, tagged, into its tray.
 * - fgLearn (묘목 포트): the 기사 hands over sprigs: needles counted, two kinds held side by side, a note, a question.
 * - fgThin (숲가꾸기 구역): the lean read, the saw started at the stump, the notch, the back cut, the shout, the tree
 *   going over away from the camera, a length on the blocks bucked, a round carried to the stack.
 * - fgPest (숲가꾸기 구역): the browned pine's needles felt, a hole drilled for a chip, bagged, a red ribbon tied, written up.
 * - fgWatch (산불 감시탑): up the ladder, the ridges swept with binoculars, a thread of smoke, the fire finder sighted on
 *   it, reported by radio, down again.
 * - fgDrill (산불 감시탑): a folding table at the foot, the map spread, lines of fire drawn, the crew given their sector.
 * - fgTrail (숲길 안내판): the board brushed, an arrow repainted, the post tapped upright, weeds pulled, the card ticked.
 * - fgGuide (숲길 안내판): two visitors shown the way, then slow breaths with arms rising, a sprig to smell.
 * - fgTruck (산림 진화 차량): the tank's gauge read, the reel paid out and sprayed, a tyre kicked, ticked off.
 * - fgMeasure (표준지 측정목): the tape round the trunk at breast height, read, paced back, the top sighted, written up.
 * - fgTrap (재선충 트랩): the cup unhooked from the funnels, tipped in the tray, beetles counted under the glass, re-hung.
 * - fgGear (산불 장비 창고): the doors opened, a backpack pump shouldered and tried, a rake counted, the list ticked.
 * - fgPatrol (순찰 현황판): the map read, a radio off its charger and tried, the patrol's magnet moved, signed out.
 * - fgSignIn (입산 신고대): a hiker writes in the book, the dweller checks it, shows the closed area, gives a leaflet.
 * - fgDesk (관리소 책상): the day's log written, the map on the screen worked, the stamp.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece
 * the dweller's left hand is on −x. `bd(side, up, ahead)` is from the body, its side counted to their left.
 */
export type FgMotion = 'fgPlant' | 'fgLearn' | 'fgThin' | 'fgPest' | 'fgWatch' | 'fgDrill' | 'fgTrail' | 'fgGuide' | 'fgTruck' | 'fgMeasure' | 'fgTrap' | 'fgGear' | 'fgPatrol' | 'fgSignIn' | 'fgDesk';
export const FG_MOTIONS = new Set<string>(['fgPlant', 'fgLearn', 'fgThin', 'fgPest', 'fgWatch', 'fgDrill', 'fgTrail', 'fgGuide', 'fgTruck', 'fgMeasure', 'fgTrap', 'fgGear', 'fgPatrol', 'fgSignIn', 'fgDesk']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const fgPhase = (p: THREE.Vector3) => frac(p.x * 0.417 + p.z * 0.629);
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
  /** Where they are; `u` for the beats where the body itself moves on (a ladder, a sweep of the eyes). */
  at(k: string, u: number): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface FgNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number): { st: St; key: Key } {
  const here = s.at(k, u);
  const idx = s.seq.findIndex(([q]) => q === k);
  const fx = Math.sin(here.yaw);
  const fz = Math.cos(here.yaw);
  const lx = Math.cos(here.yaw);
  const lz = -Math.sin(here.yaw);
  const c: Ctx = {
    t,
    H,
    st: here,
    bd: (side, up, ahead) => [here.x + lx * side + fx * ahead, (here.sit ? (here.floor ?? 0) : here.y) + up, here.z + lz * side + fz * ahead],
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
export function fgNow(m: FgMotion, t: number, ph: number, H = 1.6): FgNow {
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
export function fgPose(m: FgMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = fgNow(m, t, fgPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  let pose: BodyPose;
  if (s.sit) pose = { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y };
  else if (N.walking) pose = { kind: 'walk', at, yaw };
  else pose = { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: !s.sit && k.crouch ? k.crouch : undefined,
    },
  };
}
const writing = (a: V, t: number, u: number, w = 0.12): V => [a[0] - w / 2 + w * ((u * 3) % 1) + 0.006 * Math.sin(t * 19), a[1] + 0.008 * Math.cos(t * 23), a[2]];
const lowL = (c: Ctx) => c.bd(0.2, 0.56 * c.H, 0.1);
const lowR = (c: Ctx) => c.bd(-0.2, 0.56 * c.H, 0.1);
/** A card held up in the left hand to write on: the hands and the pen. */
function onCard(c: Ctx, u: number, nod = 0.34): Key {
  const card = c.bd(0.08, 0.64 * c.H, 0.28);
  const pen = writing(add(card, -0.02, 0.02, 0.02), c.t, u, 0.1);
  return { l: add(card, 0.06, -0.04, 0), gl: 0.8, r: pen, gr: 0.75, nod, props: { card, pen: add(pen, 0, 0.03, 0.01) } };
}

// =============================================================================================
// 묘목 포트 (saplingBed, 2 × 1): a bench of seedling trays under a low shade net; soil bin, stack of pots, can.

export const SB = {
  stand: 0.68,
  stack: [-0.78, 0.86, 0.2] as V,
  soil: [-0.36, 0.8, 0.2] as V,
  flat: [0.3, 0.8, -0.2] as V,
  work: [0.06, 0.8, 0.26] as V,
  can: [0.66, 0.78, 0.24] as V,
  tags: [0.34, 0.78, 0.28] as V,
  /** The empty place in the front tray. */
  slot: [-0.28, 0.82, -0.14] as V,
  box: [-0.68, 0.8, -0.18] as V,
};
const PLANT: Script = {
  seq: [['pot', 1.4, 0.6], ['soil', 2.8, 0.5], ['sprout', 2.4, 0.5], ['firm', 2.0, 0.5], ['water', 2.8, 0.5], ['tag', 1.8, 0.5], ['set', 1.8, 0.8]],
  at: (k) => (k === 'pot' || k === 'soil' ? st(-0.26, SB.stand) : k === 'set' ? st(-0.14, SB.stand) : k === 'water' ? st(0.3, SB.stand) : st(0.06, SB.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { soil: c.p('soil', 0.15, 0.9), sprout: c.p('sprout', 0.6, 0.8), tag: c.p('tag', 0.5, 0.8), slot: c.p('set', 0.55, 0.8), wet: c.p('water', 0.2, 0.9), pour: 0 };
    switch (k) {
      case 'pot': {
        const p = lerpV(SB.stack, SB.work, sm(u, 0.25, 0.92));
        return { r: add(p, 0.03, 0.05, 0.03), gr: 0.85, l: lowL(c), nod: 0.42, props: { pot: p }, n };
      }
      case 'soil': {
        const f = (u * 3) % 1;
        const tr = lerpV(add(SB.soil, 0, 0.03, 0), add(SB.work, 0, 0.13, 0), Math.sin(f * PI));
        return { l: add(SB.work, -0.05, 0.05, 0.03), gl: 0.85, r: tr, gr: 0.9, nod: 0.46, lean: 0.1, props: { pot: SB.work, trowel: tr }, n };
      }
      case 'sprout': {
        const h = lerpV(SB.flat, add(SB.work, 0, 0.14, 0), sm(u, 0.2, 0.62));
        return { l: add(SB.work, -0.05, 0.05, 0.03), gl: 0.85, r: h, gr: 0.75, nod: 0.46, props: { pot: SB.work, sprig: u < 0.62 ? h : null }, n };
      }
      case 'firm': {
        const d = 0.012 * Math.sin(c.t * 9);
        return { l: add(SB.work, -0.045, 0.08 + d, 0.01), gl: 0.5, r: add(SB.work, 0.045, 0.08 - d, 0.01), gr: 0.5, nod: 0.5, lean: 0.12, props: { pot: SB.work }, n };
      }
      case 'water': {
        const e = sm(u, 0.1, 0.3) * (1 - sm(u, 0.84, 1));
        const can = lerpV(SB.can, add(SB.work, 0.2, 0.26, 0), e);
        return { r: add(can, 0.03, 0.1, 0), gr: 0.9, l: lowL(c), nod: 0.42, props: { pot: SB.work, can }, n: { ...n, tilt: e, pour: u > 0.3 && u < 0.84 ? 1 : 0 } };
      }
      case 'tag': {
        const h = lerpV(SB.tags, add(SB.work, 0.05, 0.1, 0.03), sm(u, 0.1, 0.5));
        return { l: add(SB.work, -0.05, 0.05, 0.03), gl: 0.85, r: h, gr: 0.8, nod: 0.46, props: { pot: SB.work }, n };
      }
      default: {
        const p = lerpV(SB.work, SB.slot, sm(u, 0.05, 0.8));
        return { l: add(p, -0.05, 0.05, 0.02), gl: 0.85, r: add(p, 0.05, 0.05, 0.02), gr: 0.85, lean: 0.2, nod: 0.42, props: { pot: u < 0.8 ? p : null }, n };
      }
    }
  },
};
const LEARN: Script = {
  seq: [['take', 2.6, 0.6], ['count', 3.6, 0.5], ['side', 3.4, 0.5], ['note', 3.4, 0.6], ['ask', 2.8, 0.7]],
  at: (k) => (k === 'note' ? st(-0.28, SB.stand + 0.05, PI - 0.3) : st(-0.28, SB.stand, k === 'ask' ? PI / 2 + 0.3 : PI)),
  key(k, u, c): Key {
    const n: Record<string, number> = { sen: 1, talk: 0, both: 0 };
    const held = c.bd(0.1, 0.72 * c.H, 0.26);
    if (k === 'take') {
      const h = lerpV(SB.box, held, sm(u, 0.2, 0.8));
      return { r: h, gr: 0.7, l: lowL(c), nod: 0.4, props: { pine: h }, n: { ...n, talk: 1 } };
    }
    if (k === 'count') {
      // A fingertip goes along the bundle of needles: two in the sheath, not five.
      return { l: held, gl: 0.75, r: add(held, -0.04 + 0.03 * Math.sin(c.t * 3), 0.05, 0), gr: 0.25, nod: 0.36, tap: true, props: { pine: held }, n };
    }
    if (k === 'side') {
      const a = c.bd(0.14, 0.72 * c.H, 0.28);
      const b = c.bd(-0.14, 0.72 * c.H, 0.28);
      return { l: a, gl: 0.75, r: b, gr: 0.75, nod: 0.3, props: { pine: a, five: b }, n: { ...n, both: 1, talk: 1 } };
    }
    if (k === 'note') {
      const K = onCard(c, u);
      return { ...K, n };
    }
    return { l: lowL(c), r: c.bd(-0.2, 0.84 * c.H, 0.24), gr: 0.2, palms: 0.8, nod: 0, n: { ...n, talk: 1 } };
  },
};

// =============================================================================================
// 숲가꾸기 구역 (thinningSite, 2 × 1), the pines standing behind its footprint: one banded for felling, one browned.

export const TH = {
  /** The banded tree, cut at `cut`. It goes over away from the camera. */
  tree: [0.38, -0.66] as [number, number],
  cut: 0.46,
  stump: [-0.72, 0.42, 0.14] as V,
  saw: [-0.72, 0.46, 0.14] as V,
  /** The browned pine, with the ribbon. */
  sick: [-0.52, -0.5] as [number, number],
  /** The length on its blocks, bucked at these. */
  log: [0.42, 0.26, 0.2] as V,
  /** The stack of rounds, past the right of the footprint's middle. */
  rounds: [0.96, 0.14, 0.26] as V,
  bag: [-0.84, 0.46, 0.34] as V,
};
/** The saw's rear handle at `o`, the bar along `yaw`; the two hands on it. */
const sawHands = (o: V, yaw: number): { r: V; l: V } => ({ r: add(o, 0, 0.05, 0), l: add(o, Math.sin(yaw) * 0.2 + Math.cos(yaw) * 0.05, 0.1, Math.cos(yaw) * 0.2 - Math.sin(yaw) * 0.05) });
const THIN: Script = {
  seq: [['look', 2.8, 0.8], ['start', 2.4, 1.0], ['notch', 3.8, 0.9], ['back', 3.8, 0.8], ['shout', 1.4, 0.3], ['fall', 3.0, 1.0], ['buck', 4.4, 0.6], ['carry', 2.4, 0.9], ['next', 1.3, 0.9]],
  at(k) {
    if (k === 'start') return st(-0.42, 0.62, -PI / 2);
    if (k === 'notch') return st(TH.tree[0], TH.tree[1] + 0.68);
    if (k === 'back') return st(TH.tree[0] + 0.7, TH.tree[1], -PI / 2);
    if (k === 'shout' || k === 'fall') return st(0.92, 0.2, PI + 0.5);
    if (k === 'buck') return st(TH.log[0] - 0.12, 0.72);
    if (k === 'carry') return st(0.82, 0.66, PI / 2 + 1.2);
    if (k === 'next') return st(-0.1, 0.62, PI);
    return st(0.1, 0.62);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { notch: c.p('notch', 0.2, 0.9), backCut: c.p('back', 0.3, 0.95), fall: c.p('fall', 0.02, 0.92), hit: 0, chips: 0, smoke: 0, run: 0, cuts: c.p('buck', 0.2, 0.9), rounds: c.p('carry', 0.6, 0.9), sawYaw: PI, up: 0, spotter: 1, shout: 0 };
    switch (k) {
      case 'look':
        // A long look up the trunk, an arm held out to read the lean, the band and the way out.
        return { l: c.bd(0.2, 0.92 * c.H, 0.3), gl: 0.1, palms: 0.9, r: lowR(c), nod: -0.3 + 0.08 * Math.sin(c.t), n };
      case 'start': {
        // Down to the saw on the stump, the cord pulled twice, and it catches.
        const f = (u * 2) % 1;
        const pull = u < 0.66 ? Math.sin(f * PI) : 0;
        const r: V = add(TH.saw, 0.1, 0.1 + 0.32 * pull, 0.06 - 0.1 * pull);
        return { l: add(TH.saw, -0.06, 0.1, 0.02), gl: 0.9, r, gr: 0.9, crouch: 0.42, nod: 0.5, lean: 0.14, props: { saw: TH.saw }, n: { ...n, sawYaw: -PI / 2, smoke: u > 0.66 ? 1 : 0, run: u > 0.66 ? 1 : 0 } };
      }
      case 'notch': {
        const o: V = [TH.tree[0] + 0.02 * Math.sin(c.t * 2), TH.cut + 0.03, TH.tree[1] + 0.42 - 0.08 * sm(u, 0, 0.8)];
        const h = sawHands(o, PI);
        return { ...h, gl: 0.95, gr: 0.95, crouch: 0.34, nod: 0.46, lean: 0.14, props: { saw: o }, n: { ...n, chips: u > 0.1 ? 1 : 0, run: 1, smoke: 1 } };
      }
      case 'back': {
        const o: V = [TH.tree[0] + 0.42 - 0.1 * sm(u, 0, 0.9), TH.cut + 0.04, TH.tree[1] + 0.02 * Math.sin(c.t * 2)];
        const h = sawHands(o, -PI / 2);
        return { ...h, gl: 0.95, gr: 0.95, crouch: 0.34, nod: 0.46, lean: 0.14, props: { saw: o }, n: { ...n, sawYaw: -PI / 2, chips: u > 0.1 ? 1 : 0, run: 1, smoke: 1 } };
      }
      case 'shout':
      case 'fall': {
        // Back along the way out, the saw held low; an arm up to warn: 나무 넘어갑니다.
        const o: V = c.bd(-0.26, 0.42 * c.H, 0.08);
        return { r: add(o, 0, 0.05, 0), gr: 0.9, l: k === 'shout' ? c.bd(0.2, 1.12 * c.H, 0.1) : lowL(c), gl: 0.2, palms: 0.9, nod: k === 'fall' ? -0.24 - 0.1 * u : -0.1, props: { saw: o }, n: { ...n, sawYaw: PI + 0.5, shout: k === 'shout' ? 1 : 0, hit: k === 'fall' && u > 0.86 ? 1 : 0, run: 1 } };
      }
      case 'buck': {
        const across = (u * 2) % 1;
        const o: V = [TH.log[0] + (u < 0.5 ? -0.14 : 0.14), TH.log[1] + 0.14 - 0.12 * across, TH.log[2] + 0.36];
        const h = sawHands(o, PI);
        return { ...h, gl: 0.95, gr: 0.95, crouch: 0.4, nod: 0.5, lean: 0.16, props: { saw: o }, n: { ...n, chips: 1, run: 1, smoke: 1 } };
      }
      case 'carry': {
        const a: V = add(TH.log, 0.14, 0.04, 0);
        const p = lerpV(a, TH.rounds, sm(u, 0.15, 0.85));
        return { l: add(p, -0.13, 0.06, 0.02), gl: 0.9, r: add(p, 0.13, 0.06, 0.02), gr: 0.9, crouch: 0.5 * (1 - Math.sin(u * PI)), nod: 0.42, lean: 0.14, props: { round: u < 0.85 ? p : null, saw: TH.saw }, n: { ...n, sawYaw: -PI / 2, cuts: 1 } };
      }
      default:
        // On to the next: the paint can, a band sprayed on the tree that was left to come on.
        return { r: c.bd(-0.14, 0.86 * c.H, 0.34), gr: 0.8, l: lowL(c), nod: -0.12, props: { saw: TH.saw, spray: c.bd(-0.14, 0.86 * c.H, 0.36) }, n: { ...n, sawYaw: -PI / 2, up: sm(u, 0, 1), spray: 1 } };
    }
  },
};
const PEST: Script = {
  seq: [['needle', 3.2, 0.7], ['drill', 3.8, 0.5], ['chip', 2.6, 0.7], ['bag', 2.0, 0.8], ['ribbon', 3.0, 0.7], ['write', 3.2, 0.8]],
  at(k) {
    const [x, z] = TH.sick;
    if (k === 'bag') return st(-0.72, 0.66, PI);
    if (k === 'write') return st(-0.3, 0.68, PI + 0.3);
    return st(x + 0.06, z + 0.62);
  },
  key(k, u, c): Key {
    const [x, z] = TH.sick;
    const n: Record<string, number> = { hole: c.p('drill', 0.3, 0.9), ribbon: c.p('ribbon', 0.3, 0.8), bagged: c.p('bag', 0.5, 0.9) };
    const bark: V = [x + 0.05, 1.0, z + 0.14];
    switch (k) {
      case 'needle': {
        // A hanging twig pulled down, the brown needles rolled in the fingers; they snap.
        const tw: V = [x + 0.26, 1.46 - 0.12 * sm(u, 0.1, 0.5), z + 0.2];
        return { r: tw, gr: 0.75, l: add(tw, 0.1, -0.1, 0.03), gl: 0.5, nod: -0.24, n: { ...n, twig: sm(u, 0.1, 0.5) } };
      }
      case 'drill': {
        const d = 0.012 * Math.sin(c.t * 16);
        const dr: V = add(bark, d, 0, 0.14);
        return { r: add(dr, 0, -0.04, 0.12), gr: 0.95, l: add(dr, 0.06, 0.04, 0.04), gl: 0.8, nod: 0.12, lean: 0.08, props: { drill: dr }, n: { ...n, dust: u > 0.2 ? 1 : 0 } };
      }
      case 'chip': {
        const tube: V = c.bd(0.1, 0.8 * c.H, 0.3);
        const f = lerpV(add(bark, 0, -0.01, 0.03), add(tube, 0, 0.04, 0), sm(u, 0.2, 0.7));
        return { l: tube, gl: 0.85, r: f, gr: 0.6, nod: 0.26, props: { tube }, n };
      }
      case 'bag': {
        const tube = lerpV(c.bd(0.1, 0.72 * c.H, 0.3), TH.bag, sm(u, 0.1, 0.8));
        return { l: tube, gl: 0.85, r: lowR(c), crouch: 0.46 * sm(u, 0.2, 0.8), nod: 0.42, props: { tube }, n };
      }
      case 'ribbon': {
        const a = c.t * 7;
        const at: V = [x, 1.16, z + 0.16];
        return { l: add(at, 0.09 * Math.cos(a), 0.012 * Math.sin(a), 0.03), gl: 0.8, r: add(at, -0.09 * Math.cos(a), -0.012 * Math.sin(a), 0.03), gr: 0.8, nod: 0.02, n };
      }
      default: {
        const K = onCard(c, u);
        return { ...K, n };
      }
    }
  },
};

// =============================================================================================
// 산불 감시탑 (fireWatchTower, 1 × 1): steel legs, a ladder up its front, a deck with its fire finder, a little roof.

export const TW = {
  deck: 2.2,
  ladderZ: 0.62,
  /** The fire finder on its stand at the back of the deck. */
  finder: [0, 3.28, -0.3] as V,
  /** The bearing it comes to rest on, and the thread of smoke far off on the ridges in that direction. */
  bearing: -0.72,
  smoke: [-3.6, 2.0, -7.0] as V,
  /** The drill's table beside the tower, set out only for that. */
  table: [-1.02, 0.74, 0.74] as V,
  crew: [-1.72, 0.92] as [number, number],
};
/** Hand over hand up the rungs, facing the piece: the left hand on −x. */
const rungHands = (y: number, z: number, u: number): { l: V; r: V } => {
  const a = (u * 8) % 2 < 1 ? 1 : 0;
  return { l: [-0.14, y + 1.0 + a * 0.18, z - 0.14], r: [0.14, y + 1.18 - a * 0.18, z - 0.14] };
};
const WATCH: Script = {
  seq: [['foot', 0.5, 0.6], ['climb', 4.2, 0.2], ['over', 0.3, 0.9], ['bino', 5.4, 0.6], ['find', 3.8, 0.7], ['radio', 3.4, 0.9], ['edge', 0.3, 0.2], ['down', 3.6, 0.5], ['ground', 0.5, 0.5]],
  at(k, u) {
    const d = TW.deck;
    if (k === 'foot' || k === 'ground') return st(0, 0.74);
    if (k === 'climb') return st(0, TW.ladderZ, PI, d * u);
    if (k === 'edge') return st(0, TW.ladderZ, PI, d);
    if (k === 'down') return st(0, TW.ladderZ, PI, d * (1 - u));
    // On the deck: looks out over the camera's side, the ridges either way.
    if (k === 'bino') return st(0, 0.12, u < 0.8 ? 0.7 * Math.sin(u * 1.25 * PI * 2) : TW.bearing * sm(u, 0.8, 1), d);
    if (k === 'find') return st(0, -0.02, PI, d);
    if (k === 'radio') return st(0, 0.12, 0.25, d);
    return st(0, 0.14, PI, d);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { smoke: k === 'bino' ? sm(u, 0.55, 0.75) : c.p('bino') * (1 - c.p('radio', 0.8, 1)), sight: c.p('find', 0.25, 0.8) * TW.bearing, logged: c.p('radio', 0.1, 0.8), talk: 0 };
    switch (k) {
      case 'foot':
      case 'ground':
        return { l: c.bd(0.12, 0.8 * c.H, 0.2), gl: 0.5, r: c.bd(-0.12, 0.8 * c.H, 0.2), gr: 0.5, nod: -0.2, n };
      case 'climb':
      case 'down': {
        const y = c.st.y;
        const h = rungHands(y, TW.ladderZ, u);
        return { ...h, gl: 0.9, gr: 0.9, nod: -0.05, lean: 0.03, n };
      }
      case 'edge':
      case 'over':
        return { l: [-0.2, TW.deck + 0.96, 0.32], gl: 0.8, r: [0.2, TW.deck + 0.96, 0.32], gr: 0.8, nod: 0.05, n };
      case 'bino': {
        const b = c.bd(0, 0.92 * c.H, 0.15);
        return { l: add(b, 0.05, -0.02, 0), gl: 0.85, r: add(b, -0.05, -0.02, 0), gr: 0.85, nod: -0.03, palms: 0.5, props: { bino: b }, n };
      }
      case 'find': {
        // Both hands on the sight ring, turned till the wire crosses the smoke; an eye down it.
        const b = TW.finder;
        return { l: add(b, 0.12 * Math.cos(n.sight), 0.03, 0.12 * Math.sin(n.sight)), gl: 0.8, r: add(b, -0.12 * Math.cos(n.sight), 0.03, -0.12 * Math.sin(n.sight)), gr: 0.8, nod: 0.26, lean: 0.14, n };
      }
      default: {
        // The radio up by the mouth; the other hand points where it is.
        const ra = c.bd(-0.1, 0.9 * c.H, 0.12);
        return { r: ra, gr: 0.9, l: c.bd(0.24, 1.0 * c.H, 0.34), gl: 0.15, palms: 0.8, nod: -0.04, props: { radio: ra }, n: { ...n, talk: 1 } };
      }
    }
  },
};
const DRILL: Script = {
  seq: [['spread', 2.8, 0.6], ['line', 4.0, 0.5], ['point', 3.2, 0.6], ['radio', 2.8, 0.6], ['nod', 2.0, 0.8]],
  at: (k) => (k === 'radio' ? st(-0.52, 1.02, -PI / 2 + 0.4) : st(-0.46, 0.86, -PI / 2 - 0.2)),
  key(k, u, c): Key {
    const t = TW.table;
    const n: Record<string, number> = { table: 1, map: k === 'spread' ? sm(u, 0.1, 0.9) : 1, lines: c.p('line', 0.1, 0.95), crew: 1, ptr: 0, crewNod: 0 };
    switch (k) {
      case 'spread': {
        const x = 0.26 * n.map;
        return { l: add(t, -0.02, 0.05, -x), gl: 0.9, r: add(t, -0.02, 0.05, x), gr: 0.9, nod: 0.42, lean: 0.14, n };
      }
      case 'line': {
        const pen: V = add(t, 0.05 - 0.16 * u, 0.04 + 0.006 * Math.sin(c.t * 20), 0.12 * Math.sin(u * 7));
        return { l: add(t, 0.12, 0.03, 0.18), gl: 0.4, r: pen, gr: 0.8, nod: 0.46, lean: 0.2, props: { pen: add(pen, 0, 0.04, 0) }, n };
      }
      case 'point': {
        const f = 0.06 * Math.sin(c.t * 3);
        return { r: add(t, -0.1 + f, 0.06, -0.06), gr: 0.2, palms: 0.8, l: lowL(c), nod: 0.14, n: { ...n, ptr: 1, crewNod: 1 } };
      }
      case 'radio': {
        const ra = c.bd(-0.1, 0.9 * c.H, 0.12);
        return { r: ra, gr: 0.9, l: lowL(c), nod: -0.04, props: { radio: ra }, n };
      }
      default:
        return { l: lowL(c), r: c.bd(-0.2, 0.74 * c.H, 0.24), gr: 0.3, nod: 0.3 * Math.sin(u * PI * 2), n: { ...n, crewNod: 1 } };
    }
  },
};

// =============================================================================================
// 숲길 안내판 (trailSign, 1 × 1): a low framed trail map under a shingle, a fingerpost beside it.

export const TS = {
  stand: 0.62,
  board: [0, 0.98, 0.1] as V,
  /** Worn arrow on the finger; the post's foot. */
  arrow: [0.44, 1.26, 0.08] as V,
  foot: [0.44, 0.1, 0.2] as V,
  kit: [-0.6, 0.12, 0.56] as V,
  weeds: [-0.26, 0.05, 0.34] as V,
  v1: [-0.62, 1.34] as [number, number],
  v2: [0.72, 1.4] as [number, number],
};
const TRAIL: Script = {
  seq: [['brush', 3.2, 0.7], ['arrow', 3.6, 0.7], ['post', 3.0, 0.8], ['weed', 3.0, 0.7], ['tick', 2.8, 0.9]],
  at: (k) => (k === 'arrow' || k === 'post' ? st(0.34, TS.stand + 0.04) : k === 'weed' ? st(-0.2, TS.stand + 0.14) : k === 'tick' ? st(0, TS.stand + 0.1, PI + 0.2) : st(0, TS.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { clean: c.p('brush', 0.1, 0.9), paint: c.p('arrow', 0.2, 0.9), weeds: 1 - c.p('weed', 0.1, 0.9), dust: 0, shake: 0 };
    switch (k) {
      case 'brush': {
        const a = c.t * 9;
        const p: V = [-0.28 + 0.56 * ((u * 2) % 1), TS.board[1] + 0.2 * Math.sin(a * 0.2), TS.board[2] + 0.08];
        return { r: p, gr: 0.9, l: c.bd(0.2, 0.66 * c.H, 0.2), gl: 0.3, nod: -0.02, props: { brush: p }, n: { ...n, dust: 1 } };
      }
      case 'arrow': {
        const p: V = [TS.arrow[0] - 0.1 + 0.26 * ((u * 2) % 1), TS.arrow[1], TS.arrow[2] + 0.06];
        return { r: p, gr: 0.85, l: add(TS.arrow, -0.14, -0.06, 0.1), gl: 0.5, nod: -0.04, props: { pbrush: p, tin: c.bd(0.22, 0.68 * c.H, 0.2) }, n };
      }
      case 'post': {
        const w = Math.abs(Math.sin(c.t * 5));
        const p: V = [TS.foot[0] - 0.02, 0.56 + 0.2 * w, TS.foot[2] + 0.18];
        return { r: p, gr: 0.95, l: [TS.foot[0] + 0.05, 0.92, 0.2], gl: 0.85, crouch: 0.32, nod: 0.4, lean: 0.12, props: { mallet: p }, n: { ...n, shake: w < 0.1 ? 1 : 0 } };
      }
      case 'weed': {
        const y = 0.06 + 0.3 * Math.abs(Math.sin(u * PI * 3));
        const p: V = [TS.weeds[0] + 0.14 * Math.sin(Math.floor(u * 3) * 2), y, TS.weeds[2]];
        return { r: p, gr: 0.9, l: c.bd(0.16, 0.34, 0.3), gl: 0.2, crouch: 0.86, nod: 0.5, lean: 0.2, n };
      }
      default: {
        const K = onCard(c, u);
        return { ...K, n };
      }
    }
  },
};
const GUIDE: Script = {
  seq: [['show', 3.6, 0.8], ['turn', 0.8, 0.4], ['rise', 3.6, 0.3], ['fall', 3.0, 0.3], ['rise2', 3.6, 0.3], ['fall2', 3.0, 0.6], ['smell', 3.6, 0.8]],
  at: (k) => (k === 'show' ? st(-0.08, TS.stand + 0.14, PI - 0.4) : k === 'smell' ? st(0.06, TS.stand + 0.24, 0.4) : st(0.04, TS.stand + 0.2, 0)),
  key(k, u, c): Key {
    const n: Record<string, number> = { vis: 1, breathe: 0, show: 0, sprig: 0 };
    if (k === 'show') {
      const p: V = [0.18 * Math.sin(c.t * 0.9), TS.board[1] + 0.06 * Math.sin(c.t * 1.3), TS.board[2] + 0.1];
      return { r: p, gr: 0.2, palms: 0.8, l: lowL(c), nod: 0, n: { ...n, show: 1 } };
    }
    if (k === 'turn') return { l: lowL(c), r: lowR(c), nod: 0.12, n };
    if (k === 'smell') {
      const s = c.bd(-0.02, 0.84 * c.H, 0.24);
      return { r: s, gr: 0.7, l: lowL(c), nod: -0.05, props: { sprig: s }, n: { ...n, sprig: 1 } };
    }
    const rise = k.startsWith('rise');
    const e = rise ? sm(u, 0, 1) : 1 - sm(u, 0, 1);
    const up = 0.5 + 0.56 * e;
    return { l: c.bd(0.34 + 0.12 * e, up * c.H, 0.14), gl: 0.1, r: c.bd(-0.34 - 0.12 * e, up * c.H, 0.14), gr: 0.1, palms: 1, nod: -0.16 * e, n: { ...n, breathe: e } };
  },
};

// =============================================================================================
// 산림 진화 차량 (forestTruck, 2 × 1): a red pick-up, cab to the right, tank and reel on the bed.

export const FT = {
  stand: 0.86,
  gauge: [-0.46, 0.9, 0.46] as V,
  reel: [-0.1, 1.0, 0.46] as V,
  nozzleHome: [-0.08, 0.92, 0.48] as V,
  tyre: [0.62, 0.22, 0.46] as V,
  clip: [0.26, 0.82, 0.44] as V,
};
const TRUCK: Script = {
  seq: [['gauge', 3.0, 0.6], ['pay', 2.0, 0.7], ['spray', 3.2, 0.7], ['reel', 2.4, 0.8], ['tyre', 2.4, 0.8], ['tick', 2.8, 0.9]],
  at(k) {
    if (k === 'pay') return st(-0.14, FT.stand);
    if (k === 'spray') return st(-0.14, FT.stand + 0.36, 0.5);
    if (k === 'reel') return st(-0.14, FT.stand);
    if (k === 'tyre') return st(0.62, FT.stand + 0.06);
    if (k === 'tick') return st(0.3, FT.stand + 0.04, PI + 0.3);
    return st(-0.46, FT.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { spray: 0, hose: 0, nod: 0 };
    switch (k) {
      case 'gauge': {
        const p: V = add(FT.gauge, 0.02, 0, 0.02);
        return { r: p, gr: 0.3, palms: 0.5, l: add(FT.gauge, -0.2, 0.08, 0.03), gl: 0.6, nod: 0.2, tap: u > 0.5, n };
      }
      case 'pay': {
        const p = lerpV(FT.nozzleHome, c.bd(-0.14, 0.68 * c.H, 0.26), sm(u, 0.2, 0.9));
        return { r: p, gr: 0.9, l: lowL(c), nod: 0.2, props: { nozzle: p }, n: { ...n, hose: sm(u, 0.2, 0.9) } };
      }
      case 'spray': {
        const p = c.bd(-0.1, 0.72 * c.H, 0.34);
        return { r: p, gr: 0.95, l: add(p, 0.1, 0.0, -0.14), gl: 0.9, nod: 0.1, props: { nozzle: p }, n: { ...n, hose: 1, spray: u > 0.1 && u < 0.92 ? 1 : 0 } };
      }
      case 'reel': {
        const a = c.t * 8;
        const h: V = add(FT.reel, 0.1 * Math.cos(a), 0.1 * Math.sin(a), 0.06);
        return { r: h, gr: 0.9, l: FT.nozzleHome, gl: 0.8, nod: 0.2, props: { nozzle: FT.nozzleHome }, n: { ...n, hose: 1 - u, turn: u } };
      }
      case 'tyre':
        return { l: add(FT.tyre, -0.1, 0.1, 0.1), gl: 0.7, r: add(FT.tyre, 0.08, 0.14 + 0.02 * Math.sin(c.t * 7), 0.1), gr: 0.6, crouch: 0.7, nod: 0.46, lean: 0.14, n };
      default: {
        const K = onCard(c, u);
        return { ...K, n };
      }
    }
  },
};

// =============================================================================================
// 표준지 측정목 (fgMeasure, 2 × 1): a numbered pine in its roped plot, a low table of tools.

export const MS = {
  tree: [0.46, -0.28] as [number, number],
  r: 0.12,
  dbh: 1.2,
  table: [-0.5, 0.48, 0.1] as V,
  tape: [-0.68, 0.52, 0.12] as V,
  scope: [-0.34, 0.52, 0.08] as V,
};
const MEASURE: Script = {
  seq: [['tape', 2.2, 1.0], ['round', 3.2, 0.3], ['read', 2.8, 1.0], ['pace', 0.8, 0.9], ['sight', 4.0, 0.9], ['write', 3.6, 0.9]],
  at(k) {
    const [x, z] = MS.tree;
    if (k === 'tape') return st(-0.46, 0.66, PI);
    if (k === 'round' || k === 'read') return st(x, z + 0.46);
    if (k === 'pace') return st(x - 0.6, 0.7, PI - 0.5);
    if (k === 'sight') return st(0.1, 1.14, PI + 0.3);
    return st(-0.36, 0.66, PI);
  },
  key(k, u, c): Key {
    const [x, z] = MS.tree;
    const n: Record<string, number> = { band: k === 'round' ? sm(u, 0.2, 0.8) : k === 'read' ? 1 - sm(u, 0.75, 1) : 0, lit: c.p('sight', 0.4, 0.8), num: c.p('read', 0.1, 0.9) };
    const hg: V = [x, MS.dbh, z + MS.r + 0.03];
    switch (k) {
      case 'tape': {
        const p = lerpV(MS.tape, c.bd(-0.1, 0.72 * c.H, 0.26), sm(u, 0.2, 0.8));
        return { r: p, gr: 0.85, l: lowL(c), crouch: 0.3 * (1 - sm(u, 0.2, 0.7)), nod: 0.4, props: { tape: p }, n };
      }
      case 'round': {
        // Arms round the trunk at breast height, the tape passed behind and caught.
        const a = sm(u, 0.1, 0.7);
        const e = 0.17 - 0.02 * a;
        return { l: [x - e, MS.dbh, z + 0.03 - 0.08 * a], gl: 0.85, r: [x + e, MS.dbh, z + 0.03 - 0.08 * a], gr: 0.85, nod: 0.05, lean: 0.14, n };
      }
      case 'read': {
        return { l: add(hg, -0.03, 0.01, 0.015), gl: 0.85, r: add(hg, 0.03, 0.01, 0.015), gr: 0.85, nod: 0.3, lean: 0.14, n };
      }
      case 'pace':
        return { l: lowL(c), r: lowR(c), nod: 0, n };
      case 'sight': {
        // The clinometer to the eye: the top, then the foot, a nod for each.
        const b = c.bd(0, 0.93 * c.H, 0.14);
        return { l: add(b, 0.03, -0.02, 0), gl: 0.8, r: add(b, -0.03, -0.02, 0), gr: 0.8, nod: u < 0.55 ? -0.36 : 0.22, props: { scope: b }, n };
      }
      default: {
        const K = onCard(c, u);
        return { ...K, n };
      }
    }
  },
};

// =============================================================================================
// 재선충 트랩 (fgPineTrap, 2 × 1): black funnels hung from a pine, a cup under; a low table with a tray and a glass.

export const TP = {
  tree: [0.62, -0.36] as [number, number],
  /** The trap hangs from an arm off the trunk; the bottom of its funnels and the cup there. */
  hook: [0.28, 1.56] as [number, number],
  z: -0.14,
  cup: [0.28, 0.82, -0.14] as V,
  tray: [-0.44, 0.48, 0.14] as V,
  glass: [-0.68, 0.56, 0.08] as V,
  cooler: [-0.1, 0.16, 0.34] as V,
};
const TRAP: Script = {
  seq: [['look', 2.0, 0.4], ['unhook', 2.6, 0.8], ['tip', 2.2, 0.5], ['count', 5.0, 0.6], ['write', 3.2, 0.8], ['rehang', 2.6, 0.9]],
  at: (k) => (k === 'look' || k === 'unhook' || k === 'rehang' ? st(0.2, 0.4) : st(-0.42, 0.66)),
  key(k, u, c): Key {
    const n: Record<string, number> = { bugs: k === 'tip' ? sm(u, 0.3, 0.8) : k === 'look' || k === 'unhook' || k === 'rehang' ? 0 : 1 - c.p('write', 0.8, 1), counted: c.p('count', 0.05, 0.95), inCup: k === 'tip' ? 1 - sm(u, 0.3, 0.8) : c.p('tip') ? 0 : 1 };
    switch (k) {
      case 'look':
        return { l: add(TP.cup, -0.02, 0.5, 0.08), gl: 0.1, palms: 0.8, r: lowR(c), nod: -0.2, props: { cup: TP.cup }, n };
      case 'unhook': {
        const p = lerpV(TP.cup, c.bd(-0.1, 0.62 * c.H, 0.26), sm(u, 0.35, 0.95));
        return { r: add(p, 0, 0.04, 0.02), gr: 0.9, l: add(TP.cup, -0.05, 0.1, 0.02), gl: 0.6, nod: u < 0.4 ? -0.05 : 0.3, props: { cup: p }, n };
      }
      case 'tip': {
        const p: V = add(TP.tray, 0.04, 0.16 + 0.06 * (1 - sm(u, 0, 0.4)), 0);
        return { r: add(p, 0.02, 0.04, 0.02), gr: 0.9, l: add(TP.tray, -0.14, 0.03, 0.08), gl: 0.5, nod: 0.5, lean: 0.14, props: { cup: p }, n: { ...n, tilt: sm(u, 0.1, 0.5) } };
      }
      case 'count': {
        // The glass held over the tray, tweezers lifting one at a time.
        const hop = Math.abs(Math.sin(u * PI * 5));
        const tw: V = add(TP.tray, 0.02 + 0.1 * Math.cos(u * 15), 0.03 + 0.08 * hop, 0.03 * Math.sin(u * 15));
        const gl: V = add(TP.tray, -0.08, 0.17, 0.02);
        return { l: gl, gl: 0.85, r: add(tw, 0, 0.02, 0.04), gr: 0.85, crouch: 0.28, nod: 0.5, lean: 0.2, props: { glass: gl, tweezer: tw, cup: add(TP.tray, 0.3, 0.02, 0) }, n };
      }
      case 'write': {
        const K = onCard(c, u);
        return { ...K, props: { ...K.props, cup: add(TP.tray, 0.3, 0.02, 0) }, n };
      }
      default: {
        const p = lerpV(c.bd(-0.1, 0.62 * c.H, 0.26), TP.cup, sm(u, 0.1, 0.8));
        return { r: add(p, 0, 0.04, 0.02), gr: 0.9, l: add(TP.cup, -0.05, 0.1, 0.02), gl: 0.6, nod: -0.02, props: { cup: p }, n };
      }
    }
  },
};

// =============================================================================================
// 산불 장비 창고 (fgFireShed, 2 × 1): an open shed of rakes, flappers, shovels and backpack pumps behind two doors.

export const SD = {
  stand: 0.66,
  doorL: [-0.5, 0.9, 0.5] as V,
  doorR: [0.5, 0.9, 0.5] as V,
  pump: [-0.42, 1.0, 0.1] as V,
  rakes: [0.42, 1.1, 0.14] as V,
  list: [0.04, 1.2, 0.38] as V,
};
const GEAR: Script = {
  seq: [['open', 1.8, 0.7], ['pump', 2.4, 0.8], ['try', 3.2, 0.8], ['back', 1.8, 0.8], ['rakes', 3.2, 0.6], ['tick', 2.6, 0.7], ['shut', 1.6, 0.9]],
  at(k) {
    if (k === 'pump' || k === 'back') return st(-0.42, SD.stand);
    if (k === 'try') return st(-0.42, SD.stand + 0.46, 0.55);
    if (k === 'rakes') return st(0.42, SD.stand);
    if (k === 'tick') return st(0.04, SD.stand);
    return st(0, SD.stand);
  },
  key(k, u, c): Key {
    const open = k === 'open' ? sm(u, 0.2, 0.9) : k === 'shut' ? 1 - sm(u, 0.2, 0.9) : 1;
    const n: Record<string, number> = { open, spray: 0, onBack: 0, count: 0, tick: c.p('tick', 0.2, 0.9) };
    switch (k) {
      case 'open':
      case 'shut':
        return { l: add(SD.doorL, -0.1 * open, 0, 0.32 * open), gl: 0.9, r: add(SD.doorR, 0.1 * open, 0, 0.32 * open), gr: 0.9, nod: 0.04, n };
      case 'pump': {
        const p = lerpV(SD.pump, c.bd(0, 0.72 * c.H, -0.17), sm(u, 0.35, 0.92));
        return { r: u < 0.8 ? add(p, -0.08, 0.2, 0.08) : c.bd(-0.16, 0.8 * c.H, 0.05), gr: 0.9, l: u < 0.8 ? add(p, 0.08, 0.2, 0.08) : c.bd(0.16, 0.8 * c.H, 0.05), gl: 0.9, nod: 0.2, props: { pump: p }, n };
      }
      case 'try': {
        // The handle under one arm worked to and fro, the wand held out in the other: a fan of mist.
        const w = 0.08 * Math.sin(c.t * 7);
        const wand = c.bd(-0.2, 0.74 * c.H, 0.42);
        return { r: wand, gr: 0.9, l: c.bd(0.26, 0.56 * c.H + w, 0.26 + w), gl: 0.9, nod: 0.08, props: { pump: c.bd(0, 0.72 * c.H, -0.17), wand }, n: { ...n, spray: 1, onBack: 1 } };
      }
      case 'back': {
        const p = lerpV(c.bd(0, 0.72 * c.H, -0.17), SD.pump, sm(u, 0.2, 0.9));
        return { r: add(p, -0.08, 0.2, 0.08), gr: 0.9, l: add(p, 0.08, 0.2, 0.08), gl: 0.9, nod: 0.2, props: { pump: p }, n };
      }
      case 'rakes': {
        const i = Math.floor(u * 4);
        return { r: add(SD.rakes, -0.18 + i * 0.12, 0.06 + 0.02 * Math.sin(c.t * 8), 0), gr: 0.4, tap: true, l: lowL(c), nod: 0.04, n: { ...n, count: i + 1 } };
      }
      default: {
        const pen = writing(add(SD.list, 0, -0.04 + 0.08 * u, 0.02), c.t, u, 0.1);
        return { r: pen, gr: 0.8, l: lowL(c), nod: 0.02, props: { pen: add(pen, 0, 0.03, 0.02) }, n };
      }
    }
  },
};

// =============================================================================================
// 순찰 현황판 (fgPatrolBoard, 2 × 1): the patrol map with its magnets, the radio charger on the shelf under it.

export const PB = {
  stand: 0.62,
  magnet: [-0.44, 0.96, 0.08] as V,
  magnetTo: [0.1, 1.14, 0.08] as V,
  radio: [0.62, 0.68, 0.14] as V,
  log: [-0.36, 0.68, 0.14] as V,
};
const PATROL: Script = {
  seq: [['read', 3.0, 0.7], ['radio', 3.4, 0.8], ['magnet', 2.6, 0.8], ['sign', 3.0, 0.8], ['pocket', 1.8, 0.9]],
  at(k) {
    if (k === 'radio') return st(0.46, PB.stand);
    if (k === 'magnet') return st(-0.16, PB.stand);
    if (k === 'sign') return st(-0.3, PB.stand);
    if (k === 'pocket') return st(0.42, PB.stand);
    return st(-0.04, PB.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { moved: c.p('magnet', 0.2, 0.8), signed: c.p('sign', 0.1, 0.9), led: 0 };
    switch (k) {
      case 'read': {
        const p: V = [0.36 * Math.sin(c.t * 0.8) - 0.04, 1.02 + 0.1 * Math.sin(c.t * 1.2), 0.1];
        return { r: p, gr: 0.2, palms: 0.8, l: lowL(c), nod: 0.0, n };
      }
      case 'radio': {
        const e = sm(u, 0.1, 0.45);
        const ra = lerpV(PB.radio, c.bd(-0.1, 0.9 * c.H, 0.12), e);
        return { r: ra, gr: 0.9, l: lowL(c), nod: e > 0.5 ? -0.04 : 0.3, props: { radio: ra }, n: { ...n, led: e } };
      }
      case 'magnet': {
        const p = lerpV(PB.magnet, PB.magnetTo, sm(u, 0.2, 0.8));
        return { r: add(p, 0, -0.01, 0.02), gr: 0.75, l: lowL(c), nod: 0, props: { magnet: p, radio: c.bd(0.2, 0.56 * c.H, 0.14) }, n };
      }
      case 'sign': {
        const pen = writing(add(PB.log, 0.02, 0.02, 0.02), c.t, u, 0.14);
        return { r: pen, gr: 0.8, l: add(PB.log, -0.16, 0.0, 0.03), gl: 0.5, nod: 0.46, lean: 0.14, props: { pen: add(pen, 0, 0.03, 0.02) }, n };
      }
      default: {
        const ra = lerpV(c.bd(0.1, 0.6 * c.H, 0.14), c.bd(-0.2, 0.62 * c.H, 0.12), sm(u, 0.1, 0.8));
        return { r: ra, gr: 0.8, l: lowL(c), nod: 0.26, props: { radio: u < 0.85 ? ra : null }, n };
      }
    }
  },
};

// =============================================================================================
// 입산 신고대 (fgVisitorBoard, 2 × 1): a notice board with a lectern and its book; a hiker comes to sign.

export const VB = {
  stand: 0.66,
  book: [0.54, 0.94, 0.22] as V,
  board: [-0.34, 1.0, 0.0] as V,
  leaflet: [0.82, 0.92, 0.22] as V,
  hiker: [0.98, 0.98] as [number, number],
};
const SIGNIN: Script = {
  seq: [['wave', 2.0, 0.7], ['sign', 3.8, 0.7], ['check', 2.8, 0.8], ['map', 3.6, 0.8], ['leaf', 2.2, 0.8], ['bow', 1.6, 0.8]],
  at(k) {
    if (k === 'map') return st(-0.3, VB.stand + 0.04, PI + 0.4);
    if (k === 'check') return st(0.42, VB.stand);
    if (k === 'leaf') return st(0.34, VB.stand + 0.1, PI / 2 - 0.1);
    if (k === 'bow') return st(0.34, VB.stand + 0.1, PI / 2 - 0.1);
    return st(0.12, VB.stand, PI / 2 + 0.4);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { hiker: 1, write: k === 'sign' ? 1 : 0, lines: c.p('sign', 0.1, 0.95), checked: c.p('check', 0.4, 0.9), hArm: k === 'leaf' ? sm(u, 0.4, 0.8) : 0 };
    switch (k) {
      case 'wave':
        return { r: c.bd(-0.26, 1.0 * c.H + 0.05 * Math.sin(c.t * 8), 0.1), gr: 0.1, palms: 1, l: lowL(c), nod: 0.04, n };
      case 'sign':
        return { r: c.bd(-0.24, 0.7 * c.H, 0.24), gr: 0.2, palms: 0.8, l: lowL(c), nod: 0.2, n };
      case 'check': {
        const p: V = add(VB.book, -0.1 + 0.2 * u, 0.03, 0.04);
        return { r: p, gr: 0.25, l: add(VB.book, -0.2, 0.01, 0.02), gl: 0.5, nod: 0.42, lean: 0.12, tap: true, n };
      }
      case 'map': {
        const p: V = [VB.board[0] + 0.22 * Math.sin(c.t * 1.1), VB.board[1] + 0.1 * Math.sin(c.t * 0.8), VB.board[2] + 0.1];
        return { r: p, gr: 0.2, palms: 0.8, l: lowL(c), nod: 0, n };
      }
      case 'leaf': {
        const p = lerpV(VB.leaflet, c.bd(-0.04, 0.72 * c.H, 0.42), sm(u, 0.2, 0.8));
        return { r: p, gr: 0.7, l: lowL(c), nod: 0.14, props: { leaflet: p }, n };
      }
      default:
        return { l: lowL(c), r: lowR(c), nod: 0.42 * Math.sin(u * PI), lean: 0.14 * Math.sin(u * PI), n };
    }
  },
};

// =============================================================================================
// 관리소 책상 (fgDesk, 2 × 1): a desk with a screen of the district map, a radio base, the log and its stamp; a chair.

export const DK = {
  seat: [0, 0.46, 0.66] as V,
  keys: [0.16, 0.76, 0.18] as V,
  book: [-0.4, 0.76, 0.18] as V,
  stamp: [-0.72, 0.8, 0.12] as V,
  mic: [0.68, 0.84, 0.0] as V,
};
const seatedDk = (yaw = PI): St => ({ x: DK.seat[0], y: DK.seat[1], z: DK.seat[2], yaw, sit: true, floor: 0 });
const DESK: Script = {
  seq: [['book', 3.6, 0.6], ['keys', 4.2, 0.6], ['mic', 2.6, 0.7], ['stamp', 2.4, 0.7]],
  at: (k) => seatedDk(k === 'book' || k === 'stamp' ? PI + 0.2 : k === 'mic' ? PI - 0.3 : PI),
  key(k, u, c): Key {
    const n: Record<string, number> = { screen: 1, written: c.p('book', 0.1, 0.95), stamped: c.p('stamp', 0.6, 0.72), pan: c.t, talk: 0 };
    switch (k) {
      case 'book': {
        const pen = writing(add(DK.book, 0.02, 0.02, 0.02), c.t, u, 0.16);
        return { r: pen, gr: 0.8, l: add(DK.book, -0.15, 0, 0.04), gl: 0.5, nod: 0.42, props: { pen: add(pen, 0, 0.03, 0.02) }, n };
      }
      case 'keys': {
        const j = 0.012 * Math.sin(c.t * 14);
        return { l: add(DK.keys, -0.07, 0.02 + j, 0), gl: 0.25, r: add(DK.keys, 0.08, 0.02 - j, 0), gr: 0.25, nod: 0.12, tap: true, n };
      }
      case 'mic':
        return { r: add(DK.mic, 0, -0.02, 0.05), gr: 0.85, l: add(DK.keys, -0.07, 0.02, 0), gl: 0.3, nod: 0.06, n: { ...n, talk: 1 } };
      default: {
        const hit = sm(u, 0.5, 0.65) - sm(u, 0.72, 0.9);
        const p = lerpV(DK.stamp, add(DK.book, 0.06, 0.12 - 0.09 * hit, 0.02), sm(u, 0.05, 0.45));
        return { r: add(p, 0, 0.05, 0), gr: 0.9, l: add(DK.book, -0.15, 0, 0.04), gl: 0.5, nod: 0.4, props: { stamp: p }, n };
      }
    }
  },
};

const SCRIPTS: Record<FgMotion, Script> = {
  fgPlant: PLANT,
  fgLearn: LEARN,
  fgThin: THIN,
  fgPest: PEST,
  fgWatch: WATCH,
  fgDrill: DRILL,
  fgTrail: TRAIL,
  fgGuide: GUIDE,
  fgTruck: TRUCK,
  fgMeasure: MEASURE,
  fgTrap: TRAP,
  fgGear: GEAR,
  fgPatrol: PATROL,
  fgSignIn: SIGNIN,
  fgDesk: DESK,
};
