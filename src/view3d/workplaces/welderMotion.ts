import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 조선소 용접장 (2026-11-01, the workplace pipeline, at the user's request), the made-up 푸른돛조선. Each
 * motion is a round of beats: where the dweller is, where the hands go, what moves. The piece reads the same script by
 * the same clock (welder.ts), so the bead grows behind the torch that's laying it and the arc only ever strikes
 * with the mask down.
 *
 * - wdWeld (용접 부스): the seam brushed, the mask off its hook and on, the torch, a nod and the visor's down, the
 *   arc along the seam with sparks and the curtains lit, visor up, the slag chipped, the bead looked at, mask back.
 * - wdBead (용접 부스): a junior's practice coupon, a row at a time, with the foreman pointing at what to fix.
 * - wdUrgent (용접 부스): the repair order from the site supervisor, the red beacon on, the crack ground out, welded
 *   up against the clock, his thumbs up.
 * - wdCut / wdPlan (강판 더미): a line chalked along the straightedge and burned off with the gas torch, the strip
 *   dropping away; or the block's drawing unrolled on the plates, read, measured.
 * - wdGrind (그라인더 작업대): the clear shield down, the disc run along the clamped seam, the rough bead going smooth.
 * - wdInspect / wdDye (비파괴 검사기): gel and the probe along the weld with the echo on the screen, a chalk mark;
 *   or red dye, wiped, white developer, and the crack's red line coming up under the loupe.
 * - wdTack / wdSeam (선체 블록): a stiffener carried over, wedged up and tacked at three points; or crouched at the
 *   block's long butt seam with the fire watcher beside.
 * - wdGas (용접기·가스): the valve opened, the gauge read, soap on the joint, the amps set, ticked off.
 * - wdPlasma (플라즈마 절단기): the program picked, started, watched, the cut part lifted out to the bin.
 * - wdLift (천장 크레인): a plate slung, lifted by the pendant, walked across and landed, there one round and back the next.
 * - wdPpe (보호구 보관함): the locker opened, apron, gloves and the mask's lens checked, door shut.
 * - wdTbm / wdPermit (안전 게시판): the morning's talk with the crew and their shout; or the hot-work permit written
 *   with the gas detector's reading.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the
 * piece the dweller's right hand is on +x.
 */
export type WdMotion = 'wdWeld' | 'wdBead' | 'wdUrgent' | 'wdCut' | 'wdPlan' | 'wdGrind' | 'wdInspect' | 'wdDye' | 'wdTack' | 'wdSeam' | 'wdGas' | 'wdPlasma' | 'wdLift' | 'wdPpe' | 'wdTbm' | 'wdPermit';
export const WD_MOTIONS = new Set<string>(['wdWeld', 'wdBead', 'wdUrgent', 'wdCut', 'wdPlan', 'wdGrind', 'wdInspect', 'wdDye', 'wdTack', 'wdSeam', 'wdGas', 'wdPlasma', 'wdLift', 'wdPpe', 'wdTbm', 'wdPermit']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const wdPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.587);
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
  /** Which round this is, for what goes there and back on alternate rounds. */
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
export interface WdNow {
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
export function wdNow(m: WdMotion, t: number, ph: number, H = 1.6): WdNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.i === s.seq.length - 1 ? b.n + 1 : b.n) : A;
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
export function wdPose(m: WdMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = wdNow(m, t, wdPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
const scrub = (a: V, t: number, w = 0.05, h = 0.03): V => [a[0] + w * Math.sin(t * 7), a[1] + h * Math.cos(t * 7), a[2]];
const rest = (c: Ctx, side: number): V => c.bd(side * 0.22, 0.56 * c.H, 0.1);
/** The welding torch is held behind its tip: a little up and back towards whoever's holding it. */
const torchGrip = (tip: V): V => add(tip, 0.02, 0.12, 0.17);

// ---------------------------------------------------------------------------------------------
// The mask. It isn't on the body: it follows the script to where the head is, so it's on the head only as near as
// the head's height and the bend say. `visor` 0 up, 1 down.

const HEAD = 0.905;
function headAt(c: Ctx, lean: number, crouch = 0): V {
  // The avatar's crouch drops the hips by half the legs at 1, about 0.24 H; a lean tips the spine over from the hips.
  return c.bd(0, HEAD * c.H - crouch * 0.24 * c.H - lean * lean * 0.2 * c.H, 0.03 + lean * 0.5 * c.H * 0.92);
}
/** What the mask is doing, given how far it's come off the hook (`on`). */
function maskOf(c: Ctx, hook: V, on: number, visor: number, lean: number, nod: number, crouch = 0): { prop: V; n: Record<string, number> } {
  return {
    prop: lerpV(hook, headAt(c, lean, crouch), on),
    n: { visor, maskOn: on, maskYaw: c.st.yaw, maskTilt: nod * on },
  };
}

// =============================================================================================
// 용접 부스 (weldingBooth, 2 × 1): a steel table, the work clamped at its middle, the mask on the post at the left,
// the torch in its holder at the right, a chipping hammer and wire brush by the left hand.

export const BT = {
  stand: 0.54,
  top: 0.86,
  y: 0.96,
  z: 0.12,
  x0: -0.3,
  x1: 0.32,
  hook: [-0.72, 1.46, 0.3] as V,
  torch: [0.62, 1.03, 0.2] as V,
  brush: [-0.62, 0.92, 0.14] as V,
  hammer: [-0.62, 0.92, -0.04] as V,
  /** The foreman or the supervisor, to one side outside the curtain. */
  by: [-1.32, 0.98] as [number, number],
  sheet: [0.48, 0.91, -0.06] as V,
  rows: [0.075, 0.015, -0.045],
};
const LEAN = 0.16;
const NOD = 0.42;
const boothAt = () => st(0, BT.stand);
function maskIn(c: Ctx) {
  const on = c.p('mask', 0.15, 0.8) * (1 - c.p('off', 0.1, 0.8));
  const visor = c.p('down', 0.15, 0.7) * (1 - c.p('up', 0.1, 0.8));
  return maskOf(c, BT.hook, on, visor, LEAN, NOD);
}
/** Shared by the three uses: the mask on, the torch taken, the visor down with a nod of the head. */
function boothCommon(k: string, u: number, c: Ctx, props: Record<string, V | null>, n: Record<string, number>, from: V): Key | null {
  const lt = add(BT.torch, -0.02, 0.12, 0.12);
  switch (k) {
    case 'mask':
      // Carried up in the left hand.
      return { l: lerpV(add(BT.hook, 0.02, -0.04, 0.02), add(props.mask as V, -0.12, -0.04, 0.05), sm(u, 0.15, 0.8)), gl: 0.85, r: rest(c, -1), nod: 0.15, lean: 0.03, props, n };
    case 'torch':
      return { r: lerpV(lt, torchGrip(from), sm(u, 0.25, 0.9)), gr: 0.95, l: add(BT.brush, 0.36, 0.1, 0.06), gl: 0.6, nod: 0.3, lean: 0.1, props: { ...props, torch: lerpV(BT.torch, from, sm(u, 0.25, 0.9)) }, n };
    case 'down':
      // The head's flicked down: the visor drops on its own.
      return { r: torchGrip(from), gr: 0.95, l: add(BT.brush, 0.36, 0.1, 0.06), gl: 0.6, nod: NOD + 0.22 * Math.sin(u * PI), lean: LEAN, props: { ...props, torch: from }, n };
    case 'off':
      return { l: lerpV(add(props.mask as V, -0.12, -0.04, 0.05), add(BT.hook, 0.02, -0.04, 0.02), sm(u, 0.1, 0.8)), gl: 0.85, r: rest(c, -1), nod: 0.15, lean: 0.03, props, n };
    default:
      return null;
  }
}
/** The arc laying a run from x `a` to `b`: the tip, its weave, and the hands with it. */
function arcKey(c: Ctx, u: number, z: number, a: number, b: number, props: Record<string, V | null>, n: Record<string, number>): Key {
  const e = sm(u, 0.04, 0.96);
  const tip: V = [mixN(a, b, e) + 0.008 * Math.sin(c.t * 22), BT.y + 0.015, z + 0.012 * Math.sin(c.t * 9)];
  return { r: torchGrip(tip), gr: 0.95, l: add(tip, -0.2, 0.03, 0.14), gl: 0.5, nod: NOD, lean: LEAN, props: { ...props, torch: tip, tip }, n: { ...n, arc: 1 } };
}
const WELD: Script = {
  seq: [['brush', 2.2, 0.5], ['mask', 1.5], ['torch', 1.2], ['down', 0.7, 0.3], ['arc', 8, 0.3], ['up', 0.8], ['chip', 2.6], ['look', 1.8], ['off', 1.3, 0.6]],
  at: boothAt,
  key(k, u, c): Key {
    const m = maskIn(c);
    const n = { ...m.n, bead: c.p('arc', 0.04, 0.96), slag: c.p('arc', 0.04, 0.96) * (1 - c.p('chip', 0.1, 0.9)) };
    const props: Record<string, V | null> = { mask: m.prop };
    const shared = boothCommon(k, u, c, props, n, [BT.x0, BT.y + 0.015, BT.z]);
    if (shared) return shared;
    switch (k) {
      case 'brush': {
        const b = scrub([0.02, BT.y + 0.03, BT.z], c.t, 0.26, 0.004);
        return { r: add(b, 0.02, 0.05, 0.03), gr: 0.9, l: add(BT.hammer, 0.3, 0.06, 0.14), gl: 0.6, nod: 0.42, lean: LEAN, props: { ...props, brush: b }, n };
      }
      case 'arc':
        return arcKey(c, u, BT.z, BT.x0, BT.x1, props, n);
      case 'up': {
        const tip: V = [BT.x1 + 0.04 * u, BT.y + 0.015 + 0.2 * sm(u, 0, 0.8), BT.z + 0.04 * u];
        return { r: torchGrip(tip), gr: 0.95, l: add(BT.brush, 0.36, 0.1, 0.06), nod: NOD - 0.2 * Math.sin(u * PI), lean: LEAN, props: { ...props, torch: lerpV(tip, BT.torch, sm(u, 0.4, 1)) }, n };
      }
      case 'chip': {
        // The hammer's pick along the bead, the slag coming off in flakes.
        const x = mixN(BT.x0, BT.x1, u);
        const h = 0.05 * Math.abs(Math.sin(c.t * 9));
        const b: V = [x, BT.y + 0.05 + h, BT.z + 0.01];
        return { r: add(b, 0.02, 0.06, 0.1), gr: 0.95, l: add(BT.hammer, 0.3, 0.06, 0.14), gl: 0.5, nod: 0.5, lean: LEAN, props: { ...props, hammer: b }, n: { ...n, chips: 1, chipX: x } };
      }
      case 'look':
        return { l: [0.14, BT.y + 0.04, BT.z + 0.1], r: [-0.04 + 0.2 * Math.sin(u * PI), BT.y + 0.03, BT.z + 0.04], gr: 0.2, gl: 0.4, nod: 0.62, lean: LEAN + 0.05, props, n };
      default:
        return { props, n };
    }
  },
};
const BEAD: Script = {
  seq: [['talk', 2.4, 0.5], ['mask', 1.5], ['torch', 1.2], ['down', 0.7, 0.3], ['arc', 4.2, 0.3], ['up', 0.8], ['show', 2.8], ['down2', 0.7, 0.3], ['arc2', 4.2, 0.3], ['up2', 0.8], ['nodded', 2.2], ['off', 1.3, 0.6]],
  at: boothAt,
  key(k, u, c): Key {
    const on = c.p('mask', 0.15, 0.8) * (1 - c.p('off', 0.1, 0.8));
    const visor = Math.max(c.p('down', 0.15, 0.7) * (1 - c.p('up', 0.1, 0.8)), c.p('down2', 0.15, 0.7) * (1 - c.p('up2', 0.1, 0.8)));
    const m = maskOf(c, BT.hook, on, visor, LEAN, NOD);
    const n = { ...m.n, b0: 1, b1: c.p('arc', 0.04, 0.96), b2: c.p('arc2', 0.04, 0.96), point: 0, nodB: 0 };
    const props: Record<string, V | null> = { mask: m.prop };
    const shared = boothCommon(k, u, c, props, n, [BT.x0, BT.y + 0.015, BT.z + BT.rows[1]]);
    if (shared) return shared;
    const held: V = add(BT.torch, -0.3, 0.1, 0);
    switch (k) {
      case 'talk':
        return { l: rest(c, 1), r: [0.1, BT.y + 0.04, BT.z + BT.rows[0] + 0.06], gr: 0.2, nod: 0.5, lean: 0.1, props, n: { ...n, point: 1 } };
      case 'arc':
        return arcKey(c, u, BT.z + BT.rows[1], BT.x0, BT.x1, props, n);
      case 'arc2':
        return arcKey(c, u, BT.z + BT.rows[2], BT.x0, BT.x1, props, n);
      case 'down2':
        return { r: torchGrip([BT.x0, BT.y + 0.015, BT.z + BT.rows[2]]), gr: 0.95, l: add(BT.brush, 0.36, 0.1, 0.06), gl: 0.6, nod: NOD + 0.22 * Math.sin(u * PI), lean: LEAN, props: { ...props, torch: [BT.x0, BT.y + 0.015, BT.z + BT.rows[2]] }, n };
      case 'up':
      case 'up2': {
        const z = BT.z + (k === 'up' ? BT.rows[1] : BT.rows[2]);
        const tip = lerpV([BT.x1, BT.y + 0.015, z], held, sm(u, 0, 0.9));
        return { r: torchGrip(tip), gr: 0.95, l: add(BT.brush, 0.36, 0.1, 0.06), nod: 0.4, lean: 0.1, props: { ...props, torch: tip }, n };
      }
      case 'show':
        // Held off to one side, listening to what he says about the row just run.
        return { r: torchGrip(lerpV(held, [BT.x0, BT.y + 0.015, BT.z + BT.rows[2]], sm(u, 0.85, 1))), gr: 0.95, l: [-0.02 + 0.1 * Math.sin(c.t * 2), BT.y + 0.04, BT.z + BT.rows[1] + 0.06], gl: 0.2, nod: 0.5, lean: 0.1, props: { ...props, torch: lerpV(held, [BT.x0, BT.y + 0.015, BT.z + BT.rows[2]], sm(u, 0.85, 1)) }, n: { ...n, point: 1 } };
      case 'nodded':
        return { r: torchGrip(lerpV(held, BT.torch, sm(u, 0, 0.35))), gr: u < 0.4 ? 0.95 : 0.3, l: rest(c, 1), nod: 0.2 + 0.2 * Math.abs(Math.sin(c.t * 2.4)), lean: 0.05, props: { ...props, torch: lerpV(held, BT.torch, sm(u, 0, 0.35)) }, n: { ...n, nodB: 1 } };
      default:
        return { props, n };
    }
  },
};
const URGENT: Script = {
  seq: [['order', 2.2, 0.5], ['mask', 1.1], ['gouge', 3.4], ['torch', 0.9], ['down', 0.6, 0.3], ['arc', 7, 0.3], ['up', 0.7], ['look', 1.5], ['thumbs', 1.6], ['off', 1.1, 0.5]],
  at: boothAt,
  key(k, u, c): Key {
    const m = maskIn(c);
    const n = { ...m.n, alarm: 1, gouged: c.p('gouge', 0.1, 0.9), bead: c.p('arc', 0.04, 0.96), thumbs: k === 'thumbs' ? 1 : 0, order: k === 'order' ? 1 : 0 };
    const props: Record<string, V | null> = { mask: m.prop };
    const shared = boothCommon(k, u, c, props, n, [BT.x0, BT.y + 0.015, BT.z]);
    if (shared) return shared;
    switch (k) {
      case 'order': {
        // The order sheet taken from the supervisor at the curtain and read in a turn of the head.
        const paper: V = [-0.34, 1.16, BT.stand - 0.26];
        return { l: add(paper, -0.09, -0.08, 0.02), r: add(paper, 0.09, -0.08, 0.02), gl: 0.8, gr: 0.8, nod: 0.4, lean: 0.04, props: { ...props, order: paper }, n };
      }
      case 'gouge': {
        // The small grinder along the crack, sparks off to the side.
        const x = mixN(BT.x0, BT.x1, 0.5 + 0.5 * Math.sin(c.t * 2.2 - PI / 2));
        const g: V = [x, BT.y + 0.06, BT.z + 0.01];
        return { r: add(g, 0.14, 0.02, 0.1), gr: 0.95, l: add(g, -0.12, 0.05, 0.06), gl: 0.9, nod: NOD, lean: LEAN, props: { ...props, grinder: g }, n: { ...n, grind: 1, grindX: x } };
      }
      case 'arc':
        return arcKey(c, u, BT.z, BT.x0, BT.x1, props, n);
      case 'up': {
        const tip: V = lerpV([BT.x1, BT.y + 0.015, BT.z], BT.torch, sm(u, 0.1, 1));
        return { r: torchGrip(tip), gr: 0.95, l: add(BT.brush, 0.36, 0.1, 0.06), nod: 0.4, lean: 0.1, props: { ...props, torch: tip }, n };
      }
      case 'look':
        return { l: [0.14, BT.y + 0.04, BT.z + 0.1], r: [-0.02 + 0.22 * Math.sin(u * PI), BT.y + 0.03, BT.z + 0.04], gr: 0.2, gl: 0.4, nod: 0.6, lean: LEAN, props, n };
      case 'thumbs':
        return { l: rest(c, 1), r: c.bd(-0.2, 0.68 * c.H, 0.26), gr: 0.75, nod: 0.05, props, n };
      default:
        return { props, n };
    }
  },
};

// =============================================================================================
// 강판 더미 (steelPlates, 2 × 1): plates on bearers at table height; the top one marked and burned along z = line.

export const SP = {
  stand: 0.66,
  top: 0.8,
  line: 0.26,
  x0: -0.72,
  x1: 0.68,
  hook: [0.86, 1.08, 0.3] as V,
  torch: [0.7, 0.86, 0.34] as V,
  chalk: [-0.84, 0.82, 0.3] as V,
  edge: [0, 0.82, 0.21] as V,
  roll: [-0.5, 0.9, -0.16] as V,
  sheet: [0.02, 0.81, 0.02] as V,
};
const CUT: Script = {
  seq: [['chalk', 3.2, 0.5], ['mask', 1.4], ['torch', 1.1], ['light', 1, 0.3], ['burn', 4.2, 0.5], ['burn2', 4.2, 0.3], ['stop', 0.9], ['off', 1.3, 0.5], ['clear', 2.4, 0.7]],
  at: (k) => (k === 'clear' ? st(0.1, SP.stand + 0.02) : k === 'mask' || k === 'off' || k === 'stop' || k === 'burn2' || k === 'torch' ? st(0.42, SP.stand - 0.03) : k === 'chalk' ? st(0, SP.stand) : st(-0.36, SP.stand - 0.03)),
  key(k, u, c): Key {
    const on = c.p('mask', 0.15, 0.8) * (1 - c.p('off', 0.1, 0.8));
    const visor = c.p('light', 0.1, 0.5) * (1 - c.p('stop', 0.3, 0.9));
    const lean = 0.24;
    const m = maskOf(c, SP.hook, on, visor, lean, 0.45, 0.14);
    const n: Record<string, number> = { ...m.n, marked: c.p('chalk', 0.2, 0.9), cut: c.p('burn', 0.04, 1) * 0.5 + c.p('burn2', 0, 0.96) * 0.5, dropped: c.p('stop', 0, 0.6) * (1 - c.p('clear', 0.2, 0.75)), flame: 0, gone: c.p('clear', 0.75, 0.8) };
    const props: Record<string, V | null> = { mask: m.prop };
    const start: V = [SP.x0, SP.top + 0.04, SP.line];
    switch (k) {
      case 'chalk': {
        const x = mixN(-0.5, 0.5, sm(u, 0.15, 0.95));
        const ch: V = [x, SP.top + 0.03, SP.line - 0.018];
        return { r: add(ch, 0.01, 0.04, 0.04), gr: 0.85, l: [-0.2, SP.top + 0.05, SP.edge[2]], gl: 0.5, nod: 0.5, crouch: 0.14, lean, props: { ...props, chalk: ch, edge: SP.edge }, n };
      }
      case 'mask':
        return { r: lerpV(add(SP.hook, -0.02, -0.04, 0.02), add(m.prop, 0.12, -0.04, 0.05), sm(u, 0.15, 0.8)), gr: 0.85, l: rest(c, 1), nod: 0.15, lean: 0.03, props, n };
      case 'torch': {
        const tip = lerpV(SP.torch, [0.3, SP.top + 0.2, SP.line], sm(u, 0.2, 0.9));
        return { r: add(tip, 0.02, 0.12, 0.17), gr: 0.95, l: add(tip, -0.08, 0.12, 0.2), gl: 0.8, nod: 0.45, crouch: 0.14, lean, props: { ...props, torch: tip }, n };
      }
      case 'light':
        return { r: add(start, 0.02, 0.12, 0.17), gr: 0.95, l: add(start, -0.08, 0.12, 0.2), gl: 0.8, nod: 0.45, crouch: 0.14, lean, props: { ...props, torch: start }, n: { ...n, flame: sm(u, 0.4, 0.8) } };
      case 'burn':
      case 'burn2': {
        const x = k === 'burn' ? mixN(SP.x0, (SP.x0 + SP.x1) / 2, sm(u, 0.04, 1)) : mixN((SP.x0 + SP.x1) / 2, SP.x1, sm(u, 0, 0.96));
        const tip: V = [x, SP.top + 0.04, SP.line];
        return { r: add(tip, 0.02, 0.12, 0.17), gr: 0.95, l: add(tip, -0.08, 0.12, 0.2), gl: 0.8, nod: 0.45, crouch: 0.14, lean, props: { ...props, torch: tip, tip }, n: { ...n, flame: 1, arc: 1 } };
      }
      case 'stop': {
        const tip = lerpV([SP.x1, SP.top + 0.04, SP.line], SP.torch, sm(u, 0.1, 1));
        return { r: add(tip, 0.02, 0.12, 0.17), gr: 0.95, l: add(tip, -0.08, 0.12, 0.2), gl: 0.5, nod: 0.3, lean: 0.12, props: { ...props, torch: tip }, n };
      }
      case 'off':
        return { r: lerpV(add(m.prop, 0.12, -0.04, 0.05), add(SP.hook, -0.02, -0.04, 0.02), sm(u, 0.1, 0.8)), gr: 0.85, l: rest(c, 1), nod: 0.15, lean: 0.03, props, n };
      case 'clear': {
        // The strip lifted off with both hands and stood on the offcuts.
        const y = 0.18 + 0.3 * Math.sin(u * PI);
        return { l: [-0.3, y + 0.34, SP.line + 0.2], r: [0.34, y + 0.34, SP.line + 0.2], gl: 0.9, gr: 0.9, crouch: 0.3 * (1 - u), nod: 0.35, lean: 0.14, props: { ...props, strip: [0.02, y + 0.33, SP.line + 0.16] }, n };
      }
      default:
        return { props, n };
    }
  },
};
const PLAN: Script = {
  seq: [['unroll', 2.4], ['read', 4.2], ['measure', 4.2], ['mark', 2.4], ['roll', 2.2, 0.6]],
  at: () => st(0, SP.stand),
  key(k, u, c): Key {
    const lay = c.p('unroll', 0.1, 0.9) * (1 - c.p('roll', 0.1, 0.8));
    const n: Record<string, number> = { lay, blade: 0, inked: c.p('mark', 0.2, 0.9) };
    const props: Record<string, V | null> = {};
    switch (k) {
      case 'unroll':
        return { l: [-0.55, SP.top + 0.05, 0.08], r: [mixN(-0.2, 0.5, sm(u, 0.1, 0.9)), SP.top + 0.05, 0.12], gl: 0.5, gr: 0.7, nod: 0.45, lean: 0.2, props, n };
      case 'read': {
        const x = -0.06 + 0.46 * ((u * 3) % 1);
        const y = 0.08 * Math.floor(u * 3);
        return { l: [-0.55, SP.top + 0.04, 0.1], r: [x, SP.top + 0.03, SP.sheet[2] + 0.26 - y], gr: 0.15, tap: true, nod: 0.55, lean: 0.22, props, n };
      }
      case 'measure': {
        // A steel rule between two points, one read off the other.
        const b = sm(u, 0.1, 0.7);
        return { l: [-0.3, SP.top + 0.05, 0.2], r: [-0.26 + 0.52 * b, SP.top + 0.05, 0.2], gl: 0.75, gr: 0.75, nod: 0.58, lean: 0.24, props: { ...props, tape: [-0.3, SP.top + 0.045, 0.2] }, n: { ...n, blade: 0.04 + 0.52 * b } };
      }
      case 'mark': {
        const p = scrub([0.14, SP.top + 0.03, 0.1], c.t, 0.08, 0.002);
        return { l: [-0.55, SP.top + 0.04, 0.1], r: add(p, 0.01, 0.02, 0.03), gr: 0.85, nod: 0.58, lean: 0.24, props: { ...props, pen: p }, n };
      }
      case 'roll':
        return { l: [-0.55, SP.top + 0.05, 0.08], r: [mixN(0.5, -0.2, sm(u, 0.1, 0.9)), SP.top + 0.05, 0.12], gl: 0.5, gr: 0.7, nod: 0.42, lean: 0.2, props, n };
      default:
        return { props, n };
    }
  },
};

// =============================================================================================
// 그라인더 작업대 (grinderStation, 1 × 1): a steel stand, a vise holding a welded sample along x, the angle grinder
// hung at the left and a clear face shield on the post at the right.

export const GR = {
  stand: 0.62,
  y: 1.0,
  z: 0.12,
  x0: -0.2,
  x1: 0.2,
  hook: [0.4, 1.36, 0.22] as V,
  tool: [-0.38, 1.02, 0.22] as V,
  gauge: [0.34, 0.92, 0.3] as V,
};
const GRIND: Script = {
  seq: [['shield', 1.5], ['take', 1.1], ['down', 0.6, 0.3], ['run', 7.5, 0.3], ['stop', 1], ['wipe', 1.8], ['gauge', 2.2], ['off', 1.2, 0.6]],
  at: () => st(0, GR.stand),
  key(k, u, c): Key {
    const on = c.p('shield', 0.15, 0.8) * (1 - c.p('off', 0.1, 0.8));
    const visor = c.p('down', 0.1, 0.7) * (1 - c.p('stop', 0.3, 1));
    const lean = 0.14;
    const m = maskOf(c, GR.hook, on, visor, lean, 0.4);
    const n: Record<string, number> = { ...m.n, smooth: c.p('run', 0.04, 0.96), spin: 0, grind: 0 };
    const props: Record<string, V | null> = { mask: m.prop };
    const start: V = [GR.x0, GR.y + 0.07, GR.z];
    const hands = (g: V): Partial<Key> => ({ r: add(g, 0.15, 0.03, 0.08), gr: 0.95, l: add(g, -0.11, 0.07, 0.07), gl: 0.9 });
    switch (k) {
      case 'shield':
        return { r: lerpV(add(GR.hook, 0.01, -0.04, 0.02), add(m.prop, 0.12, -0.05, 0.05), sm(u, 0.15, 0.8)), gr: 0.85, l: rest(c, 1), nod: 0.15, props, n };
      case 'take': {
        const g = lerpV(GR.tool, start, sm(u, 0.25, 0.95));
        return { ...hands(g), nod: 0.35, lean: 0.1, props: { ...props, tool: g }, n };
      }
      case 'down':
        return { ...hands(start), nod: 0.4 + 0.2 * Math.sin(u * PI), lean, props: { ...props, tool: start }, n: { ...n, spin: sm(u, 0.5, 1) } };
      case 'run': {
        // Along and back and along, a little rocking, the sparks going out to the guard.
        const x = mixN(GR.x0, GR.x1, 0.5 - 0.5 * Math.cos(u * PI * 3));
        const g: V = [x, GR.y + 0.07 + 0.006 * Math.sin(c.t * 18), GR.z];
        return { ...hands(g), nod: 0.42, lean, props: { ...props, tool: g }, n: { ...n, spin: 1, grind: 1, grindX: x } };
      }
      case 'stop': {
        const g = lerpV([GR.x1, GR.y + 0.07, GR.z], GR.tool, sm(u, 0.15, 1));
        return { ...hands(g), nod: 0.25, lean: 0.08, props: { ...props, tool: g }, n: { ...n, spin: 1 - sm(u, 0, 0.5) } };
      }
      case 'wipe': {
        const p = scrub([0, GR.y + 0.045, GR.z + 0.02], c.t, 0.18, 0.004);
        return { l: add(p, 0, 0.02, 0.02), gl: 0.5, r: [0.26, GR.y - 0.04, GR.z + 0.14], nod: 0.5, lean, props: { ...props, rag: p }, n };
      }
      case 'gauge': {
        const p = lerpV(GR.gauge, [0.02, GR.y + 0.07, GR.z + 0.03], sm(u, 0.1, 0.45));
        return { r: add(p, 0.02, 0.02, 0.05), gr: 0.75, l: [-0.2, GR.y - 0.02, GR.z + 0.14], gl: 0.5, nod: 0.6, lean: lean + 0.05, props: { ...props, gauge: p }, n };
      }
      case 'off':
        return { r: lerpV(add(m.prop, 0.12, -0.05, 0.05), add(GR.hook, 0.01, -0.04, 0.02), sm(u, 0.1, 0.8)), gr: 0.85, l: rest(c, 1), nod: 0.15, props, n };
      default:
        return { props, n };
    }
  },
};

// =============================================================================================
// 비파괴 검사기 (inspectionRig, 1 × 1): a cart; on its low shelf at the front a welded plate along x, behind it the
// flaw detector with its screen, the probe on its clip, the three spray cans in a tray at the right.

export const IN = {
  stand: 0.66,
  y: 0.88,
  z: 0.16,
  x0: -0.3,
  x1: 0.3,
  probe: [-0.3, 0.97, 0.38] as V,
  bottle: [0.28, 0.98, 0.4] as V,
  cans: [[0.32, 1.0, -0.08], [0.39, 1.0, -0.08], [0.46, 1.0, -0.08]] as V[],
  chalk: [0.42, 0.92, 0.3] as V,
  flaw: 0.08,
  clip: [0.36, 0.98, 0.26] as V,
};
const INSPECT: Script = {
  seq: [['gel', 2.6], ['probe', 1], ['scan', 6.5], ['echo', 2.2], ['mark', 1.8], ['note', 2.6], ['back', 1.1, 0.6]],
  at: () => st(0, IN.stand),
  key(k, u, c): Key {
    const n: Record<string, number> = { gel: c.p('gel', 0.1, 0.9) * (1 - c.p('back', 0.5, 1)), scan: c.p('scan'), mark: c.p('mark', 0.3, 0.9) * (1 - c.p('back', 0.5, 1)), found: 0 };
    const props: Record<string, V | null> = {};
    const lean = 0.16;
    switch (k) {
      case 'gel': {
        const b: V = [mixN(IN.x0, IN.x1, u), IN.y + 0.1, IN.z + 0.03];
        return { r: add(b, 0.01, 0.05, 0.03), gr: 0.85, l: [-0.34, IN.y + 0.02, IN.z + 0.17], gl: 0.5, nod: 0.45, lean, props: { ...props, bottle: b }, n };
      }
      case 'probe': {
        const p = lerpV(IN.probe, [IN.x0, IN.y + 0.025, IN.z + 0.03], sm(u, 0.2, 0.95));
        return { r: add(p, 0.01, 0.04, 0.02), gr: 0.85, l: [-0.34, IN.y + 0.02, IN.z + 0.17], gl: 0.5, nod: 0.42, lean, props: { ...props, probe: p }, n };
      }
      case 'scan': {
        const x = mixN(IN.x0, IN.flaw, sm(u, 0.05, 0.95)) + 0.01 * Math.sin(c.t * 6);
        const p: V = [x, IN.y + 0.025, IN.z + 0.03 + 0.03 * Math.sin(c.t * 3)];
        return { r: add(p, 0.01, 0.04, 0.02), gr: 0.85, l: [-0.2, IN.y + 0.25, 0.04], gl: 0.2, nod: 0.3 + 0.2 * Math.sin(c.t * 1.2), lean, props: { ...props, probe: p }, n: { ...n, probeX: x, found: sm(u, 0.82, 1) } };
      }
      case 'echo': {
        const p: V = [IN.flaw, IN.y + 0.025, IN.z + 0.03];
        return { r: add(p, 0.01, 0.04, 0.02), gr: 0.85, l: [0.04, IN.y + 0.26, 0.04], gl: 0.15, tap: true, nod: 0.22, lean: lean - 0.04, props: { ...props, probe: p }, n: { ...n, probeX: IN.flaw, found: 1 } };
      }
      case 'mark': {
        const p: V = [IN.flaw, IN.y + 0.04, IN.z + 0.04];
        return { r: add(p, 0.01, 0.04, 0.03), gr: 0.85, l: [-0.3, IN.y + 0.02, IN.z + 0.17], gl: 0.5, nod: 0.5, lean, props: { ...props, chalk: scrub(p, c.t, 0.02, 0.002) }, n: { ...n, found: 1, probeX: IN.flaw } };
      }
      case 'note': {
        const cb: V = c.bd(0.06, 0.66 * c.H, 0.28);
        return { l: add(cb, -0.03, -0.05, 0.01), gl: 0.8, r: scrub(add(cb, 0.05, 0.03, 0.01), c.t, 0.04, 0.012), gr: 0.85, nod: 0.45, props: { ...props, clip: cb }, n: { ...n, found: 1, probeX: IN.flaw } };
      }
      case 'back':
        return { l: rest(c, 1), r: lerpV([IN.flaw, IN.y + 0.06, IN.z + 0.05], add(IN.probe, 0.01, 0.04, 0.02), u), gr: 0.7, nod: 0.3, props, n };
      default:
        return { props, n };
    }
  },
};
const DYE: Script = {
  seq: [['clean', 2.4], ['red', 2.4], ['wait', 1.8], ['wipe', 2.6], ['white', 2.4], ['show', 3.6], ['write', 2.4], ['clear', 1.3, 0.6]],
  at: () => st(0, IN.stand),
  key(k, u, c): Key {
    const n: Record<string, number> = {
      dye: c.p('red', 0.15, 0.85) * (1 - c.p('wipe', 0.1, 0.9)),
      white: c.p('white', 0.15, 0.85) * (1 - c.p('clear', 0.3, 0.9)),
      crack: c.p('show', 0.1, 0.8) * (1 - c.p('clear', 0.3, 0.9)),
      spray: 0,
    };
    const props: Record<string, V | null> = {};
    const lean = 0.16;
    const can = (i: number, sprayColor: number): Key => {
      const x = mixN(IN.x0, IN.x1, 0.5 - 0.5 * Math.cos(u * PI * 2));
      const p: V = [x, IN.y + 0.2, IN.z + 0.06];
      return { r: add(p, 0.01, 0, 0.03), gr: 0.9, l: [-0.34, IN.y + 0.02, IN.z + 0.17], gl: 0.5, nod: 0.42, lean, props: { ...props, [`can${i}`]: p }, n: { ...n, spray: sprayColor, sprayX: x } };
    };
    const rag = (color: number): Key => {
      const p = scrub([0, IN.y + 0.025, IN.z + 0.03], c.t, 0.26, 0.002);
      return { r: add(p, 0.01, 0.03, 0.02), gr: 0.5, l: [-0.34, IN.y + 0.02, IN.z + 0.17], gl: 0.5, nod: 0.46, lean, props: { ...props, rag: p }, n: { ...n, ragTint: color } };
    };
    switch (k) {
      case 'clean':
        return rag(0);
      case 'red':
        return can(0, 1);
      case 'wait':
        return { l: rest(c, 1), r: rest(c, -1), nod: 0.35, props, n };
      case 'wipe':
        return rag(1);
      case 'white':
        return can(1, 2);
      case 'show': {
        // The loupe to the seam, moving along until the line's found.
        const p: V = [mixN(-0.1, IN.flaw, sm(u, 0.1, 0.6)), IN.y + 0.1, IN.z + 0.05];
        return { r: add(p, 0.02, 0.0, 0.06), gr: 0.85, l: [-0.3, IN.y + 0.02, IN.z + 0.17], gl: 0.5, nod: 0.65, lean: lean + 0.07, props: { ...props, loupe: p }, n };
      }
      case 'write': {
        const cb: V = c.bd(0.06, 0.66 * c.H, 0.28);
        return { l: add(cb, -0.03, -0.05, 0.01), gl: 0.8, r: scrub(add(cb, 0.05, 0.03, 0.01), c.t, 0.04, 0.012), gr: 0.85, nod: 0.45, props: { ...props, clip: cb }, n };
      }
      case 'clear':
        return rag(0);
      default:
        return { props, n };
    }
  },
};

// =============================================================================================
// 선체 블록 (wdHullBlock, 5 × 3): the block's plating facing the dweller at z = face, a stiffener going on at the height
// of the chest, the long butt seam low down, the mask hung on the staging post at the left.

export const HB = {
  stand: 1.66,
  face: 1.14,
  barY: 1.26,
  seamY: 0.62,
  x0: -0.42,
  x1: 0.42,
  hook: [-0.72, 1.44, 1.34] as V,
  torch: [-0.56, 1.06, 1.34] as V,
  bars: [0.86, 0.28, 1.42] as V,
  tacks: [-0.4, 0, 0.4],
  fire: [0.98, 2.02] as [number, number],
};
const TACK_POS = (i: number): V => [HB.tacks[i], HB.barY - 0.04, HB.face + 0.03];
const TACK: Script = {
  seq: [['fetch', 1.8, 0.8], ['carry', 1.4, 0.7], ['wedge', 3.2], ['mask', 1.4], ['take', 1], ['arc0', 1.7, 0.2], ['arc1', 1.7, 0.2], ['arc2', 1.7, 0.3], ['raise', 0.9], ['square', 2.4], ['off', 1.2, 0.6]],
  at: (k) => (k === 'fetch' ? st(HB.bars[0], HB.stand - 0.04) : k === 'arc1' ? st(-0.04, HB.stand) : k === 'arc2' ? st(0.14, HB.stand) : k === 'carry' || k === 'wedge' ? st(0, HB.stand) : st(-0.3, HB.stand)),
  key(k, u, c): Key {
    const on = c.p('mask', 0.15, 0.8) * (1 - c.p('off', 0.1, 0.8));
    const inArc = k === 'arc0' || k === 'arc1' || k === 'arc2';
    const visor = c.p('arc0', 0, 0.08) * (1 - c.p('raise', 0.1, 0.8));
    const m = maskOf(c, HB.hook, on, visor, 0.08, 0.22);
    const placed = c.p('carry', 0.2, 0.95);
    const n: Record<string, number> = { ...m.n, t0: c.p('arc0', 0.15, 0.9), t1: c.p('arc1', 0.15, 0.9), t2: c.p('arc2', 0.15, 0.9), wedged: c.p('wedge', 0.1, 0.9), gone: 0 };
    const up: V = [0, HB.barY, HB.face + 0.03];
    const barAt: V | null = k === 'fetch' ? lerpV(HB.bars, add(HB.bars, 0, 0.72, 0), sm(u, 0.25, 0.85)) : lerpV(add(HB.bars, -0.3, 0.8, 0), up, placed);
    const props: Record<string, V | null> = { mask: m.prop, bar: barAt };
    const hold: Partial<Key> = { l: [-0.18, HB.barY - 0.06, HB.face + 0.08], gl: 0.8 };
    if (inArc) {
      const tp = TACK_POS(Number(k.slice(3)));
      return { r: torchGrip(tp), gr: 0.95, ...hold, nod: 0.22, lean: 0.08, props: { ...props, torch: tp, tip: u > 0.15 && u < 0.9 ? tp : null }, n: { ...n, arc: u > 0.15 && u < 0.9 ? 1 : 0 } };
    }
    switch (k) {
      case 'fetch': {
        const y = (barAt as V)[1];
        return { l: [HB.bars[0] - 0.24, y + 0.02, HB.bars[2]], r: [HB.bars[0] + 0.24, y + 0.02, HB.bars[2]], gl: 0.9, gr: 0.9, crouch: 0.95 * (1 - sm(u, 0.25, 0.85)), nod: 0.4, lean: 0.15, props, n };
      }
      case 'carry':
        return { l: add(barAt as V, -0.26, 0, 0.05), r: add(barAt as V, 0.26, 0, 0.05), gl: 0.9, gr: 0.9, nod: 0.15, lean: 0.03, props, n };
      case 'wedge': {
        // A dog on the plate and the wedge knocked under it with the hammer.
        const h = 0.07 * Math.abs(Math.sin(c.t * 7));
        const b: V = [0.3, HB.barY + 0.1 + h, HB.face + 0.09];
        return { r: add(b, 0.01, 0.04, 0.1), gr: 0.95, l: [-0.2, HB.barY - 0.06, HB.face + 0.08], gl: 0.8, nod: 0.18, lean: 0.06, props: { ...props, hammer: b }, n };
      }
      case 'mask':
        return { l: lerpV(add(HB.hook, 0.02, -0.04, 0.02), add(m.prop, -0.12, -0.04, 0.05), sm(u, 0.15, 0.8)), gl: 0.85, r: [0.3, HB.barY - 0.08, HB.face + 0.08], gr: 0.6, nod: 0.12, props, n };
      case 'take': {
        const tp = lerpV(HB.torch, TACK_POS(0), sm(u, 0.25, 0.95));
        return { r: torchGrip(tp), gr: 0.95, ...hold, nod: 0.18, lean: 0.06, props: { ...props, torch: tp }, n };
      }
      case 'raise': {
        const tp = lerpV(TACK_POS(2), HB.torch, sm(u, 0.1, 1));
        return { r: torchGrip(tp), gr: 0.95, ...hold, nod: 0.18, lean: 0.06, props: { ...props, torch: tp }, n };
      }
      case 'square': {
        const p: V = [0.08, HB.barY + 0.08, HB.face + 0.04];
        return { l: add(p, -0.11, 0, 0.03), r: add(p, 0.11, 0, 0.03), gl: 0.6, gr: 0.6, nod: 0.05, lean: 0.06, props: { ...props, square: p }, n };
      }
      case 'off':
        return { l: lerpV(add(m.prop, -0.12, -0.04, 0.05), add(HB.hook, 0.02, -0.04, 0.02), sm(u, 0.1, 0.8)), gl: 0.85, r: rest(c, -1), nod: 0.12, props, n: { ...n, gone: sm(u, 0.6, 1) } };
      default:
        return { props, n };
    }
  },
};
const SEAM: Script = {
  seq: [['brief', 2.2], ['mask', 1.5], ['take', 1.4], ['arc', 10, 0.4], ['stand', 1], ['chip', 2.6], ['off', 1.3, 0.6]],
  at: (k) => (k === 'brief' ? st(0, HB.stand) : k === 'mask' || k === 'off' || k === 'take' ? st(-0.26, HB.stand - 0.06) : st(0, HB.stand - 0.1)),
  key(k, u, c): Key {
    const crouch = k === 'arc' || k === 'chip' ? 0.62 : k === 'take' ? 0.62 * sm(u, 0.2, 0.9) : k === 'stand' ? 0.62 : 0;
    const on = c.p('mask', 0.15, 0.8) * (1 - c.p('off', 0.1, 0.8));
    const visor = c.p('take', 0.75, 1) * (1 - c.p('stand', 0.2, 0.9));
    const m = maskOf(c, HB.hook, on, visor, 0.14, 0.34, crouch);
    const n: Record<string, number> = { ...m.n, bead: c.p('arc', 0.04, 0.96), slag: c.p('arc', 0.04, 0.96) * (1 - c.p('chip', 0.1, 0.9)), watch: 1 };
    const props: Record<string, V | null> = { mask: m.prop };
    const start: V = [HB.x0, HB.seamY, HB.face + 0.03];
    switch (k) {
      case 'brief':
        // A word with the fire watcher: his extinguisher's there, the blanket's down.
        return { l: rest(c, 1), r: [0.46, 1.0, HB.stand - 0.34], gr: 0.2, nod: 0.12, props, n };
      case 'mask':
        return { l: lerpV(add(HB.hook, 0.02, -0.04, 0.02), add(m.prop, -0.12, -0.04, 0.05), sm(u, 0.15, 0.8)), gl: 0.85, r: rest(c, -1), nod: 0.12, props, n };
      case 'take': {
        const tp = lerpV(HB.torch, start, sm(u, 0.25, 0.95));
        return { r: torchGrip(tp), gr: 0.95, l: [-0.2, HB.seamY + 0.14, HB.face + 0.08], gl: 0.6, crouch, nod: 0.3, lean: 0.14, props: { ...props, torch: tp }, n };
      }
      case 'arc': {
        const e = sm(u, 0.04, 0.96);
        const tp: V = [mixN(HB.x0, HB.x1, e) + 0.008 * Math.sin(c.t * 22), HB.seamY + 0.012 * Math.sin(c.t * 9), HB.face + 0.03];
        return { r: torchGrip(tp), gr: 0.95, l: add(tp, -0.18, 0.12, 0.08), gl: 0.5, crouch, nod: 0.34, lean: 0.14, props: { ...props, torch: tp, tip: tp }, n: { ...n, arc: 1 } };
      }
      case 'stand': {
        const tp = lerpV([HB.x1, HB.seamY, HB.face + 0.03], HB.torch, sm(u, 0.1, 1));
        return { r: torchGrip(tp), gr: 0.95, l: rest(c, 1), crouch, nod: 0.3, lean: 0.12, props: { ...props, torch: tp }, n };
      }
      case 'chip': {
        const x = mixN(HB.x0, HB.x1, u);
        const b: V = [x, HB.seamY + 0.08 + 0.05 * Math.abs(Math.sin(c.t * 9)), HB.face + 0.06];
        return { r: add(b, 0.02, 0.05, 0.1), gr: 0.95, l: [-0.16, HB.seamY + 0.14, HB.face + 0.08], gl: 0.5, crouch, nod: 0.36, lean: 0.14, props: { ...props, hammer: b }, n: { ...n, chips: 1, chipX: x } };
      }
      case 'off':
        return { l: lerpV(add(m.prop, -0.12, -0.04, 0.05), add(HB.hook, 0.02, -0.04, 0.02), sm(u, 0.1, 0.8)), gl: 0.85, r: rest(c, -1), nod: 0.12, props, n };
      default:
        return { props, n };
    }
  },
};

// =============================================================================================
// 용접기·가스 (wdGasCart, 2 × 1): the welding machine at the left, cylinders chained in their rack at the right.

export const GS = {
  stand: 0.62,
  panel: [-0.52, 1.14, 0.3] as V,
  dial: [-0.42, 1.08, 0.31] as V,
  valve: [0.42, 1.5, 0.22] as V,
  gauge: [0.42, 1.34, 0.28] as V,
  joint: [0.42, 1.18, 0.28] as V,
  soap: [0.92, 0.72, 0.3] as V,
  clip: [-0.05, 0.92, 0.32] as V,
};
const GAS: Script = {
  seq: [['chain', 1.8], ['valve', 2.8], ['read', 2.2], ['soap', 3.2], ['walk', 0.3, 0.7], ['amps', 3], ['tick', 2.2, 0.7]],
  at: (k) => (k === 'walk' || k === 'amps' ? st(-0.42, GS.stand) : k === 'tick' ? st(-0.05, GS.stand) : st(0.42, GS.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { open: c.p('valve', 0.2, 0.9), bubble: 0, amps: c.p('amps', 0.2, 0.9), ticked: c.p('tick', 0.3, 0.9), valveA: 0 };
    const props: Record<string, V | null> = {};
    switch (k) {
      case 'chain':
        return { l: [0.3, 1.1, 0.27], r: [0.55, 1.1, 0.27], gl: 0.8, gr: 0.8, nod: 0.25, props, n };
      case 'valve': {
        const a = u * PI * 3;
        return { r: add(GS.valve, 0.035 * Math.cos(a), 0.015 + 0.012 * Math.sin(a), 0.03), gr: 0.9, l: add(GS.valve, -0.12, -0.22, 0.04), gl: 0.6, nod: -0.08, props, n: { ...n, valveA: a } };
      }
      case 'read':
        return { l: add(GS.gauge, -0.08, -0.03, 0.03), gl: 0.3, r: rest(c, -1), nod: 0.0, props, n: { ...n, open: 1 } };
      case 'soap': {
        const b = add(GS.joint, 0.02 * Math.sin(c.t * 5), 0.03, 0.05);
        return { r: add(b, 0.02, 0, 0.03), gr: 0.9, l: add(GS.joint, -0.13, 0.03, 0.03), gl: 0.5, nod: 0.3, props: { ...props, soap: b }, n: { ...n, bubble: sm(u, 0.3, 0.7) * (1 - sm(u, 0.9, 1)) } };
      }
      case 'amps': {
        const a = -0.8 + u * 1.6;
        return { r: add(GS.dial, 0.008 * Math.cos(a * 4), 0, 0.03), gr: 0.75, l: add(GS.panel, -0.22, -0.08, 0.02), gl: 0.5, nod: 0.3, props, n };
      }
      case 'tick': {
        const cb: V = c.bd(0.05, 0.66 * c.H, 0.28);
        return { l: add(cb, -0.03, -0.05, 0.01), gl: 0.8, r: scrub(add(cb, 0.05, 0.03, 0.01), c.t, 0.04, 0.012), gr: 0.85, nod: 0.45, props: { ...props, clip: cb }, n };
      }
      default:
        return { l: rest(c, 1), r: rest(c, -1), props, n };
    }
  },
};

// =============================================================================================
// 플라즈마 절단기 (wdPlasmaTable, 3 × 2): a slatted bed, a bridge over it carrying the head, the console on an arm
// at the front right, a bin for parts at the front left.

export const PL = {
  top: 0.82,
  front: 1.14,
  console: [1.02, 1.12, 0.74] as V,
  y: 0.86,
  /** The bed's cut: a rectangle with one end rounded, in the plate's own coordinates. */
  cx: -0.5,
  cz: 0.12,
  rw: 0.62,
  rd: 0.34,
  bin: [-1.18, 0.56, 0.86] as V,
};
/** The head along the outline of the part, `u` round it from start to start. */
export function plasmaPath(u: number): [number, number] {
  const { cx, cz, rw, rd } = PL;
  const a = u * 4;
  const f = a % 1;
  if (a < 1) return [cx - rw / 2 + rw * f, cz - rd / 2];
  if (a < 2) return [cx + rw / 2, cz - rd / 2 + rd * f];
  if (a < 3) return [cx + rw / 2 - rw * f, cz + rd / 2];
  return [cx - rw / 2, cz + rd / 2 - rd * f];
}
const PLASMA: Script = {
  seq: [['nest', 3, 0.5], ['start', 1.2, 1.1], ['watch', 8, 0.9], ['lift', 2, 0.6], ['bin', 1.8, 1]],
  at: (k) => (k === 'nest' || k === 'start' ? st(PL.console[0], PL.front + 0.06) : k === 'watch' ? st(0.1, PL.front + 0.1) : k === 'lift' ? st(PL.cx, 1.06) : st(-1.06, 1.3, PI * 0.92)),
  key(k, u, c): Key {
    const prog = c.p('watch', 0.04, 0.96);
    const out = c.p('lift', 0.1, 0.9);
    const n: Record<string, number> = { cut: prog * (1 - c.p('bin', 0.7, 1)), run: 0, hx: -1.05, hz: -0.4, program: c.p('nest', 0.2, 0.95), out: out * (1 - c.p('bin', 0.75, 0.8)), inBin: c.p('bin', 0.75, 0.8) };
    const props: Record<string, V | null> = {};
    const partAt: V = [PL.cx, PL.y + 0.012, PL.cz];
    switch (k) {
      case 'nest': {
        const tap = Math.floor(u * 4) % 2;
        return { r: add(PL.console, 0.05 - tap * 0.08, 0.02, 0.04), gr: 0.15, tap: true, l: add(PL.console, -0.16, -0.08, 0.02), gl: 0.5, nod: 0.38, lean: 0.05, props, n };
      }
      case 'start':
        return { r: add(PL.console, 0.15, -0.06, 0.04), gr: 0.15, tap: true, l: rest(c, 1), nod: 0.35, props, n: { ...n, run: sm(u, 0.5, 1) } };
      case 'watch': {
        const [hx, hz] = plasmaPath(prog);
        return { l: rest(c, 1), r: rest(c, -1), nod: 0.22 + 0.06 * Math.sin(c.t), props, n: { ...n, run: 1, hx, hz, arc: u > 0.04 && u < 0.96 ? 1 : 0 } };
      }
      case 'lift': {
        // Gloves on the part, up off the slats.
        const p = lerpV(partAt, [PL.cx, 1.02, 0.72], sm(u, 0.3, 1));
        return { l: add(p, -PL.rw / 2 + 0.03, 0.02, PL.rd / 2 - 0.02), r: add(p, PL.rw / 2 - 0.03, 0.02, PL.rd / 2 - 0.02), gl: 0.9, gr: 0.9, nod: 0.5, lean: 0.34, props: { ...props, part: p }, n };
      }
      case 'bin': {
        const p = lerpV([-1.06, 1.02, 0.96], PL.bin, sm(u, 0.05, 0.8));
        const carried = u < 0.8;
        return { l: carried ? add(p, -PL.rw / 2 + 0.03, 0.02, 0.06) : rest(c, 1), r: carried ? add(p, PL.rw / 2 - 0.03, 0.02, 0.06) : rest(c, -1), gl: carried ? 0.9 : 0.3, gr: carried ? 0.9 : 0.3, nod: 0.35, lean: 0.14 * sm(u, 0.3, 0.8), crouch: 0.3 * sm(u, 0.3, 0.8) * (1 - sm(u, 0.85, 1)), props: { ...props, part: carried ? p : null }, n };
      }
      default:
        return { props, n };
    }
  },
};

// =============================================================================================
// 천장 크레인 (wdGantry, 5 × 2): two low trestles, the plate on one or the other, the trolley on the beam overhead and
// the pendant on its cable. One round left to right, the next right to left.

export const GT = {
  beam: 3.3,
  x: 1.3,
  /** The plate's underside on a trestle, and the height it travels at. */
  low: 0.52,
  high: 1.12,
  stand: 0.82,
  back: 1.4,
};
const LIFT: Script = {
  seq: [['sling', 3, 0.6], ['pend', 1, 0.3], ['up', 2.2, 0.8], ['travel', 5.4, 0.8], ['down', 2.2, 0.6], ['unsling', 2.6, 0.5], ['note', 1.3, 0.9]],
  at: (k, round) => {
    const dir = round % 2 ? -1 : 1;
    const a = -dir * GT.x;
    const b = dir * GT.x;
    switch (k) {
      case 'sling':
        return st(a, GT.stand);
      case 'pend':
      case 'up':
        return st(a, GT.back);
      case 'travel':
        return st(0, GT.back);
      case 'down':
        return st(b, GT.back);
      default:
        return st(b, GT.stand);
    }
  },
  key(k, u, c): Key {
    const dir = c.round % 2 ? -1 : 1;
    const a = -dir * GT.x;
    const b = dir * GT.x;
    const rise = c.p('up', 0.1, 0.95) * (1 - c.p('down', 0.1, 0.95));
    const across = c.p('travel', 0.05, 0.95);
    const px = mixN(a, b, across);
    const py = mixN(GT.low, GT.high, rise);
    const hooked = c.p('sling', 0.3, 0.95) * (1 - c.p('unsling', 0.3, 0.95));
    const n: Record<string, number> = { px, py, hooked, beacon: k === 'up' || k === 'travel' || k === 'down' ? 1 : 0 };
    const props: Record<string, V | null> = {};
    const pendant = (side: number): V => c.bd(side * 0.08, 0.66 * c.H, 0.26);
    switch (k) {
      case 'sling':
      case 'unsling': {
        // Each shackle on the plate's near edge, one hand after the other.
        const sx = u < 0.5 ? -0.42 : 0.42;
        const h: V = [px + sx, py + 0.06, 0.34];
        const free: V = [px - sx, py + 0.09, 0.42];
        const hand = sx < 0 ? { l: h, r: free } : { l: free, r: h };
        return { ...hand, gl: 0.85, gr: 0.85, crouch: 0.8, nod: 0.42, lean: 0.2, props, n: { ...n, trolley: k === 'sling' ? a : b } };
      }
      case 'note': {
        const cb: V = c.bd(0.05, 0.66 * c.H, 0.28);
        return { l: add(cb, -0.03, -0.05, 0.01), gl: 0.8, r: scrub(add(cb, 0.05, 0.03, 0.01), c.t, 0.04, 0.012), gr: 0.85, nod: 0.45, props: { ...props, clip: cb }, n: { ...n, trolley: b } };
      }
      case 'pend': {
        const p = pendant(0);
        return { r: add(p, 0, 0.0, 0.0), gr: 0.9, l: rest(c, 1), nod: 0.1, props: { ...props, pend: lerpV([a, 1.22, 0.56], p, sm(u, 0.1, 0.8)) }, n: { ...n, trolley: a, cableX: a } };
      }
      default: {
        const p = pendant(0);
        // Watching the load: the head up, the thumb on the button.
        return { r: add(p, 0, 0, 0), gr: 0.9, l: add(p, -0.08, 0.04, 0), gl: 0.2, nod: -0.25, props: { ...props, pend: p }, n: { ...n, trolley: px, cableX: px } };
      }
    }
  },
};

// =============================================================================================
// 보호구 보관함 (wdPpeLocker, 2 × 1): lockers along the back, the second door opening on what's hung in it.

export const PP = {
  stand: 0.48,
  door: [0.1, 1.08, 0.1] as V,
  doorOpen: [-0.24, 1.08, 0.38] as V,
  apron: [-0.04, 1.2, -0.04] as V,
  gloves: [-0.04, 0.88, -0.04] as V,
  mask: [-0.04, 1.58, -0.12] as V,
  shelf: [0.62, 0.94, 0.3] as V,
};
const PPE: Script = {
  seq: [['open', 1.3], ['apron', 3.4], ['hang', 1.2], ['gloves', 2.6], ['lens', 3.4], ['stow', 1.2], ['tick', 1.8], ['shut', 1.1, 0.5]],
  at: () => st(0, PP.stand),
  key(k, u, c): Key {
    const n: Record<string, number> = { door: c.p('open', 0.1, 0.9) * (1 - c.p('shut', 0.1, 0.9)), ticked: c.p('tick', 0.3, 0.9) * (1 - c.p('shut', 0.5, 1)), lens: 0 };
    const props: Record<string, V | null> = {};
    const held = c.bd(0, 0.66 * c.H, 0.3);
    switch (k) {
      case 'open':
        return { l: lerpV(PP.door, PP.doorOpen, u), gl: 0.85, r: rest(c, -1), nod: 0.1, props, n };
      case 'apron': {
        // Held up by its shoulders, turned over for burn holes.
        const p = lerpV(PP.apron, held, sm(u, 0, 0.2));
        return { l: add(p, -0.14, 0.14, 0.02), r: add(p, 0.14, 0.14, 0.02), gl: 0.85, gr: 0.85, nod: 0.3, props: { ...props, apron: p }, n: { ...n, turn: sm(u, 0.45, 0.65) * PI } };
      }
      case 'hang': {
        const p = lerpV(held, PP.apron, sm(u, 0.1, 0.9));
        return { l: add(p, -0.14, 0.14, 0.02), r: add(p, 0.14, 0.14, 0.02), gl: 0.85, gr: 0.85, nod: 0.2, props: { ...props, apron: p }, n };
      }
      case 'gloves': {
        const p = lerpV(PP.gloves, held, sm(u, 0, 0.3));
        const bend = 0.04 * Math.sin(c.t * 4);
        return { l: add(p, -0.07, bend, 0), r: add(p, 0.07, -bend, 0), gl: 0.8, gr: 0.8, nod: 0.42, props: { ...props, gloves: p }, n };
      }
      case 'lens': {
        // The mask from the shelf: its window wiped and its lens held to the light.
        const p = lerpV(PP.mask, add(held, 0, 0.1, 0), sm(u, 0, 0.25));
        const wipe = u > 0.35 && u < 0.7;
        return { l: add(p, -0.13, -0.03, 0), gl: 0.85, r: wipe ? scrub(add(p, 0.02, 0, 0.14), c.t, 0.05, 0.03) : add(p, 0.13, -0.03, 0), gr: wipe ? 0.5 : 0.85, nod: 0.25, props: { ...props, mask: p }, n: { ...n, lens: 1 } };
      }
      case 'stow': {
        const p = lerpV(add(held, 0, 0.1, 0), PP.mask, sm(u, 0.1, 0.9));
        return { l: add(p, -0.13, -0.03, 0), gl: 0.85, r: add(p, 0.13, -0.03, 0), gr: 0.85, nod: 0.05, props: { ...props, mask: p }, n };
      }
      case 'tick': {
        const p = add(PP.shelf, 0, 0.1 * sm(u, 0, 0.2), 0);
        return { r: scrub(p, c.t, 0.03, 0.008), gr: 0.85, l: rest(c, 1), nod: 0.45, lean: 0.1, props, n };
      }
      case 'shut':
        return { l: lerpV(PP.doorOpen, PP.door, u), gl: 0.85, r: rest(c, -1), nod: 0.1, props, n };
      default:
        return { props, n };
    }
  },
};

// =============================================================================================
// 안전 게시판 (wdSafetyBoard, 2 × 1).

export const SB = {
  stand: 0.86,
  board: [0, 1.5, -0.32] as V,
  detector: [0.62, 1.06, 0.42] as V,
  clip: [-0.82, 1.06, 0.06] as V,
  boss: [-0.86, 0.86] as [number, number],
  crew: [[0.9, 1.2], [0.28, 1.6]] as Array<[number, number]>,
};
const TBM: Script = {
  seq: [['fall', 2.2], ['point0', 2.8], ['point1', 2.8], ['point2', 2.8], ['check', 2], ['shout', 2.2, 0.6]],
  at: () => st(-0.22, SB.stand + 0.05),
  key(k, u, c): Key {
    const n: Record<string, number> = { speak: k === 'fall' ? 0 : 1, line: k === 'point0' ? 1 : k === 'point1' ? 2 : k === 'point2' ? 3 : 0, shout: 0 };
    const props: Record<string, V | null> = {};
    switch (k) {
      case 'shout': {
        // A fist up with everybody: 안전 제일!
        const up = sm(u, 0.1, 0.35) * (1 - sm(u, 0.85, 1));
        return { r: lerpV(rest(c, -1), c.bd(-0.2, 1.1 * c.H, 0.12), up), gr: 0.95, l: rest(c, 1), nod: -0.12 * up, props, n: { ...n, shout: up } };
      }
      case 'check':
        // Each other's kit: a hand to the strap of the mask, a tug at a glove.
        return { l: c.bd(0.05, 0.86 * c.H, 0.14), gl: 0.7, r: c.bd(-0.12, 0.6 * c.H, 0.2), gr: 0.6, nod: 0.28, props, n };
      case 'fall':
        return { l: rest(c, 1), r: rest(c, -1), nod: 0.05, props, n };
      default:
        // Listening: hands behind nothing, the chin following his finger on the board.
        return { l: rest(c, 1), r: rest(c, -1), nod: -0.08, props, n };
    }
  },
};
const PERMIT: Script = {
  seq: [['take', 1.4], ['detect', 4.2], ['read', 1.8], ['write', 3.4], ['pin', 2.2], ['back', 1.1, 0.5]],
  at: (k) => (k === 'pin' ? st(0.46, 0.12) : st(0.2, SB.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { reading: k === 'detect' ? sm(u, 0.2, 0.8) : c.p('detect'), pinned: c.p('pin', 0.5, 0.8) * (1 - c.p('back', 0.5, 1)) };
    const props: Record<string, V | null> = {};
    const held: V = c.bd(-0.04, 0.68 * c.H, 0.28);
    switch (k) {
      case 'take': {
        const p = lerpV(SB.detector, held, sm(u, 0.1, 0.9));
        return { r: add(p, 0.02, -0.02, 0.02), gr: 0.9, l: rest(c, 1), nod: 0.2, props: { ...props, det: p }, n };
      }
      case 'detect': {
        // Held out low and high round the place: the numbers settle.
        const p: V = add(held, 0.12 * Math.sin(c.t * 1.3), 0.14 * Math.sin(c.t * 0.9), 0.03);
        return { r: add(p, 0.02, -0.02, 0.02), gr: 0.9, l: rest(c, 1), nod: 0.3, props: { ...props, det: p }, n };
      }
      case 'read':
        return { r: add(held, 0.02, -0.02, 0.02), gr: 0.9, l: add(held, -0.09, 0, 0.02), gl: 0.3, tap: true, nod: 0.48, props: { ...props, det: held }, n };
      case 'write': {
        const cb: V = c.bd(0.05, 0.66 * c.H, 0.28);
        return { l: add(cb, -0.03, -0.05, 0.01), gl: 0.8, r: scrub(add(cb, 0.05, 0.03, 0.01), c.t, 0.04, 0.012), gr: 0.85, nod: 0.45, props: { ...props, clip: cb }, n };
      }
      case 'pin': {
        const on: V = [0.46, 1.34, -0.33];
        return { r: add(on, 0.02, -0.06, 0.05), gr: 0.8, l: add(on, -0.1, -0.06, 0.05), gl: 0.6, nod: -0.05, props: { ...props, sheet: u > 0.5 ? on : null }, n };
      }
      case 'back':
        return { l: rest(c, 1), r: rest(c, -1), nod: 0.05, props, n };
      default:
        return { props, n };
    }
  },
};

const SCRIPTS: Record<WdMotion, Script> = {
  wdWeld: WELD,
  wdBead: BEAD,
  wdUrgent: URGENT,
  wdCut: CUT,
  wdPlan: PLAN,
  wdGrind: GRIND,
  wdInspect: INSPECT,
  wdDye: DYE,
  wdTack: TACK,
  wdSeam: SEAM,
  wdGas: GAS,
  wdPlasma: PLASMA,
  wdLift: LIFT,
  wdPpe: PPE,
  wdTbm: TBM,
  wdPermit: PERMIT,
};
