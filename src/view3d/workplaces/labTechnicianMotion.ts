import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 진단검사센터 (2026-11-01, workplace pipeline). Each motion is a round of beats: where the dweller is, where the hands
 * go, and what moves. The piece reads the same script by the same clock (labTechnician.ts), so the rack on the belt is the one just
 * set down, and the red row on the verification desk appears when the analyser has just run an urgent sample (LT_LIVE).
 *
 * - 자동 분석기 (analyzerMachine): ltRun a rack carried to the belt, started on the screen, tube by tube under the probe, the results
 *   coming up, the rack taken off. ltStat a red-capped tube from its pouch into the urgent port, the red button, a countdown.
 *   ltQc a control vial and a chart of dots. ltSpecial a test cartridge into its drawer, and a curve.
 * - 원심분리기 (centrifugeUnit): ltSpin the lid up, two tubes set opposite each other, lid down, start, the rotor really turns,
 *   stops where it started, lid up, a tube out with its layers parted.
 * - 현미경 검사대 (microscopeBench): ltSlides a slide on the stage, eyes to the eyepieces, a hand on the focus, cells counted on the
 *   counter. ltPractice the same with a senior beside.
 * - 검체 냉장고 (sampleFridge): ltFridge door, a rack from the top shelf, its labels read, to its shelf, door. ltAssign with a tablet,
 *   sharing out the day's work.
 * - 검체 접수창 (ltReception): ltReceive a courier at the hatch, the cool box in, three tubes shown to the scanner and racked.
 *   ltLabelCheck a label that doesn't match held up and read, set aside, the courier told.
 * - 분주대 (ltPipetteBench): ltPipette a tip on, a sample drawn, a well filled, the tip off, three times; the plate turns colour.
 * - 혈액 배양기 (ltIncubator): ltCulture the map's red cell, shutter up, the bottle out and looked at, a new one in.
 * - 시약 보관고 (ltReagentStore): ltReagent the door slid, a pack scanned, moved to the use-first tray.
 * - 결과 확인 책상 (ltVerifyDesk): ltVerify rows checked and approved. ltCritical a flagged value, the phone, the log.
 * - 감염성 폐기물함 (ltBioBin): ltDispose a used tube over the bin, the pedal, in, shut.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type LtMotion = 'ltRun' | 'ltStat' | 'ltQc' | 'ltSpecial' | 'ltSpin' | 'ltSlides' | 'ltPractice' | 'ltFridge' | 'ltAssign' | 'ltReceive' | 'ltLabelCheck' | 'ltPipette' | 'ltCulture' | 'ltReagent' | 'ltVerify' | 'ltCritical' | 'ltDispose';
export const LT_MOTIONS = new Set<string>(['ltRun', 'ltStat', 'ltQc', 'ltSpecial', 'ltSpin', 'ltSlides', 'ltPractice', 'ltFridge', 'ltAssign', 'ltReceive', 'ltLabelCheck', 'ltPipette', 'ltCulture', 'ltReagent', 'ltVerify', 'ltCritical', 'ltDispose']);
export type LtTool = 'rack' | 'tube' | 'tube2' | 'bottle2' | 'cart' | 'slide' | 'tablet' | 'pipette' | 'bottle' | 'pack' | 'phone' | 'pen';

/** What the lab is doing now, for the verification desk: set by the analyser on an urgent run, read by the desk. */
export const LT_LIVE = { statAt: -1e9, runs: 412 };

export const frac = (x: number) => ((x % 1) + 1) % 1;
export const ltPhase = (p: THREE.Vector3) => frac(p.x * 0.317 + p.z * 0.571);
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
  tool?: LtTool;
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
export interface LtNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: LtTool | null;
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
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function ltNow(m: LtMotion, t: number, ph: number, H = 1.6): LtNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const sitNow = e < 0.5 ? A.st.sit : B.st.sit;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: sitNow };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  const tool = (e < 0.5 ? A.key.tool : B.key.tool) ?? null;
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function ltPose(m: LtMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = ltNow(m, t, ltPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Hands easy at the waist. */
const easy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const leftEasy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.08), gl: 0.3 });
const rightEasy = (c: Ctx) => ({ r: c.bd(-0.2, 0.55 * c.H, 0.08), gr: 0.3 });
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
const press = (p: V, u: number, a = 0.3, b = 0.5): Pick<Key, 'r' | 'gr' | 'palms'> => ({ r: add(p, 0, 0, 0.05 - 0.03 * sm(u, a, b)), gr: 0.15, palms: 0.05 });
/** Along a line of points, evenly, easing at each. */
function along(pts: readonly V[], u: number): V {
  const n = pts.length - 1;
  const f = THREE.MathUtils.clamp(u, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(f));
  return lerpV(pts[i], pts[i + 1], sm(f - i, 0.1, 0.9));
}

// =============================================================================================
// 자동 분석기 (analyzerMachine, 2 × 1): a deck under a canopy, a belt along the front, a probe on a rail, a wheel of cuvettes.

export const AN = {
  stand: 0.74,
  deck: 0.9,
  /** A rack's handle (its origin) on the belt. */
  rackY: 1.07,
  beltZ: 0.36,
  tray: [-0.8, 1.07, 0.36] as V,
  beltStart: -0.48,
  beltEnd: 0.14,
  probeX: -0.05,
  wheel: [-0.05, 0.94, 0.02] as V,
  /** The urgent port, its button, and the pouch or kit box on the shelf at the right. */
  port: [0.38, 1.0, 0.39] as V,
  button: [0.54, 0.97, 0.42] as V,
  pouch: [0.78, 1.0, 0.38] as V,
  screen: [0.6, 1.16, 0.235] as V,
  /** The drawer for a test cartridge. */
  drawer: [-0.33, 1.01, 0.09] as V,
  drawerOut: 0.18,
};
/** Where the rack and the probe are, `f` tubes through a run of five. */
export function runAt(f: number) {
  const offs = (i: number) => -0.09 + 0.045 * i;
  const tgt = (i: number) => AN.probeX - offs(i);
  if (f >= 5) return { x: AN.beltEnd, dip: 0, over: 0 };
  const i = Math.max(0, Math.floor(f));
  const w = Math.max(0, f - i);
  let x = mixN(i === 0 ? AN.beltStart : tgt(i - 1), tgt(i), sm(w, 0, 0.16));
  if (i === 4) x = mixN(x, AN.beltEnd, sm(w, 0.88, 1));
  const dip = sm(w, 0.18, 0.28) * (1 - sm(w, 0.32, 0.4)) + sm(w, 0.56, 0.64) * (1 - sm(w, 0.68, 0.74));
  const over = sm(w, 0.42, 0.54) * (1 - sm(w, 0.76, 0.88));
  return { x, dip, over };
}
const RUN: Script = {
  seq: [['fetch', 1.3, 0.7], ['load', 1.2, 0.9], ['touch', 1.5, 0.8], ['watch', 10, 0.8], ['read', 2.4, 0.9], ['back', 1.3, 1.0], ['stow', 1.1, 1.0]],
  at: (k) => (k === 'fetch' || k === 'load' || k === 'stow' ? st(-0.62, AN.stand) : k === 'touch' ? st(0.36, 0.7) : k === 'read' ? st(0.46, 0.7) : k === 'back' ? st(0.02, AN.stand) : st(0.0, 0.84)),
  key(k, u, c) {
    const start: V = [AN.beltStart, AN.rackY, AN.beltZ];
    const end: V = [AN.beltEnd, AN.rackY, AN.beltZ];
    const carry: V = c.bd(-0.14, 1.04, 0.34);
    const f = k === 'watch' ? u * 5 : c.p('watch') * 5;
    const R = runAt(f);
    const rack: V = k === 'fetch' ? add(AN.tray, 0, 0.03 * sm(u, 0.5, 1), 0) : k === 'load' ? lerpV(add(AN.tray, 0, 0.03, 0), start, sm(u, 0.05, 0.85)) : k === 'back' ? lerpV(end, carry, sm(u, 0.35, 1)) : k === 'stow' ? lerpV(carry, AN.tray, sm(u, 0.1, 0.8)) : [R.x, AN.rackY, AN.beltZ];
    const n = { f, run: k === 'watch' ? 1 : 0, dip: R.dip, over: R.over, res: f, belt: k === 'watch' ? 1 : 0, done: k === 'read' || k === 'back' ? 1 : 0 };
    const props = { rack };
    switch (k) {
      case 'fetch':
      case 'load':
      case 'back':
      case 'stow':
        return { ...leftEasy(c), tool: 'rack', nod: 0.28, lean: 0.08, n, props };
      case 'touch':
        return { ...press(add(AN.screen, -0.08, -0.08, 0), u), ...leftEasy(c), nod: 0.08, lean: 0.06, n, props };
      case 'watch':
        return { ...easy(c), nod: 0.06 + 0.08 * Math.sin(u * PI * 5), n, props };
      default:
        return { ...press(add(AN.screen, 0.02 + 0.08 * Math.sin(c.t * 0.6), -0.02, 0), u, 0.1, 0.25), ...leftEasy(c), nod: 0.04, lean: 0.06, n, props };
    }
  },
};
/** A tube from the pouch, into the urgent port, the button, then the wait. Shared by the urgent sample and the control. */
function portScript(wait: number): Script {
  return {
    seq: [['grab', 1.1, 0.7], ['carry', 0.3, 0.6], ['in', 1.0, 0.5], ['start', 1.1, 0.9], ['wait', wait, 0.8], ['read', 2.6, 0.8], ['out', 1.2, 0.9], ['pouch', 1.0, 0.9]],
    at: (k) => (k === 'wait' ? st(0.3, 0.86) : st(0.54, 0.7)),
    key(k, u, c) {
      const over: V = add(AN.port, 0, 0.12, 0);
      const tube: V = k === 'grab' ? lerpV(AN.pouch, add(AN.pouch, -0.04, 0.1, 0.02), sm(u, 0.45, 1)) : k === 'carry' ? add(AN.pouch, -0.04, 0.1, 0.02) : k === 'in' ? lerpV(over, AN.port, sm(u, 0.25, 0.85)) : k === 'out' ? lerpV(AN.port, over, sm(u, 0.1, 0.7)) : k === 'pouch' ? lerpV(over, AN.pouch, sm(u, 0.1, 0.85)) : AN.port;
      const n = { prog: k === 'wait' ? u : c.p('wait'), run: k === 'wait' ? 1 : 0, read: k === 'read' ? 1 : 0, beacon: k === 'read' || k === 'out' || k === 'pouch' ? 0 : 1 };
      const props = { tube };
      switch (k) {
        case 'grab':
        case 'carry':
        case 'in':
        case 'out':
        case 'pouch':
          return { ...leftEasy(c), tool: 'tube', nod: 0.28, lean: 0.08, n, props };
        case 'start':
          return { ...press(AN.button, u), ...leftEasy(c), nod: 0.26, lean: 0.06, n, props };
        case 'wait':
          // Weight from foot to foot, a look at the watch: it's the emergency room's clock.
          return { l: c.bd(0.1, 0.66 * c.H, 0.2), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3, nod: 0.02 + 0.1 * Math.sin(c.t * 1.3), n, props };
        default:
          return { ...press(add(AN.screen, 0, -0.03, 0), u, 0.1, 0.25), ...leftEasy(c), nod: 0.05, lean: 0.06, n, props };
      }
    },
  };
}
const STAT = portScript(7.5);
const QC = portScript(6);
const SPECIAL: Script = {
  seq: [['fetch', 1.0, 1.1], ['open', 1.0, 0.5], ['set', 1.2, 0.5], ['shut', 1.0, 0.9], ['start', 1.1, 0.9], ['wait', 7, 0.8], ['read', 2.6, 1.1]],
  at: (k) => (k === 'fetch' ? st(0.56, 0.7) : k === 'start' || k === 'read' ? st(0.5, 0.7) : k === 'wait' ? st(0.1, 0.86) : st(-0.24, 0.7)),
  key(k, u, c) {
    const box: V = add(AN.pouch, 0, 0, 0);
    const out = add(AN.drawer, 0, 0.02, AN.drawerOut);
    const carried: V = c.bd(-0.12, 1.06, 0.3);
    const cart: V = k === 'fetch' ? lerpV(box, carried, sm(u, 0.5, 1)) : k === 'open' ? carried : k === 'set' ? lerpV(carried, out, sm(u, 0.1, 0.8)) : k === 'shut' ? add(AN.drawer, 0, 0.02, AN.drawerOut * (1 - sm(u, 0.2, 0.85))) : add(AN.drawer, 0, 0.02, 0);
    const n = { drawer: k === 'open' ? sm(u, 0.25, 0.8) : k === 'set' ? 1 : k === 'shut' ? 1 - sm(u, 0.2, 0.85) : 0, prog: k === 'wait' ? u : c.p('wait'), run: k === 'wait' ? 1 : 0, read: k === 'read' ? 1 : 0 };
    const props = { cart: k === 'read' ? null : cart };
    switch (k) {
      case 'fetch':
        return { ...leftEasy(c), tool: 'cart', nod: 0.26, lean: 0.06, n, props };
      case 'open':
        return { l: add(AN.drawer, 0.02, 0, 0.14 + AN.drawerOut * n.drawer), gl: 0.55, nod: 0.26, lean: 0.08, tool: 'cart', n, props };
      case 'set':
        return { ...leftEasy(c), tool: 'cart', nod: 0.3, lean: 0.1, n, props };
      case 'shut':
        return { ...leftEasy(c), r: add(AN.drawer, 0, 0.0, 0.16 + AN.drawerOut * (1 - sm(u, 0.2, 0.85))), gr: 0.2, palms: 0.05, nod: 0.3, lean: 0.08, n, props };
      case 'start':
        return { ...press(add(AN.screen, -0.08, -0.08, 0), u), ...leftEasy(c), nod: 0.06, lean: 0.06, n, props };
      case 'wait':
        return { ...easy(c), nod: 0.08, n, props };
      default:
        return { ...press(add(AN.screen, 0.06, 0, 0), u, 0.1, 0.25), ...leftEasy(c), nod: 0.04, lean: 0.06, n, props };
    }
  },
};

// =============================================================================================
// 원심분리기 (centrifugeUnit, 1 × 1): a bench with the machine well to the front; the lid hinged at the back.

export const CF = {
  stand: 0.66,
  top: 1.04,
  cz: 0.16,
  size: 0.54,
  /** The hinge, and how far the lid's handle is from it. */
  hy: 1.04,
  hz: -0.11,
  lidL: 0.52,
  lidOpen: 1.1,
  /** A tube's middle in its bucket, either side of the rotor. */
  slotA: [-0.14, 1.0, 0.16] as V,
  slotB: [0.14, 1.0, 0.16] as V,
  /** Where tubes stand beside the machine. */
  restA: [-0.36, 0.88, 0.26] as V,
  restB: [0.36, 0.88, 0.26] as V,
  button: [0.14, 0.92, 0.435] as V,
};
export const lidHandle = (open: number): V => {
  const a = CF.lidOpen * open;
  return [0, CF.hy + 0.09 * Math.cos(a) + CF.lidL * Math.sin(a), CF.hz + CF.lidL * Math.cos(a) - 0.09 * Math.sin(a)];
};
const SPIN: Script = {
  seq: [['come', 0.5, 0.6], ['lid', 1.2, 0.3], ['a', 1.5, 0.3], ['b', 1.5, 0.3], ['down', 1.0, 0.3], ['set', 1.2, 0.7], ['spin', 7.5, 0.7], ['up', 1.2, 0.3], ['outA', 1.4, 0.3], ['look', 1.8, 0.3], ['backA', 1.1, 0.4], ['outB', 1.3, 0.3], ['downAgain', 0.9, 0.8]],
  at: (k) => (k === 'spin' ? st(-0.06, 0.8) : st(0, CF.stand)),
  key(k, u, c) {
    const upA = add(CF.slotA, 0, 0.14, 0);
    const upB = add(CF.slotB, 0, 0.14, 0);
    const before = k === 'come' || k === 'lid';
    const eye: V = c.bd(-0.1, 1.28, 0.3);
    // Tube A: the right hand, resting on the left of the machine (crossing over it would hide it), then in the rotor, later read.
    const tubeA: V = before ? CF.restA : k === 'a' ? along([CF.restA, add(CF.restA, 0.02, 0.2, 0), upA, CF.slotA], u) : k === 'outA' ? lerpV(CF.slotA, eye, sm(u, 0.2, 1)) : k === 'look' ? add(eye, 0.01 * Math.sin(c.t * 2), 0, 0) : k === 'backA' ? along([eye, add(CF.restA, 0.02, 0.2, 0), CF.restA], u) : k === 'outB' || k === 'downAgain' ? CF.restA : CF.slotA;
    const tubeB: V = before || k === 'a' ? CF.restB : k === 'b' ? along([CF.restB, add(CF.restB, 0, 0.2, 0), upB, CF.slotB], u) : k === 'outB' ? along([CF.slotB, upB, add(CF.restB, 0, 0.2, 0), CF.restB], u) : k === 'downAgain' ? CF.restB : CF.slotB;
    const lid = k === 'come' ? 0 : k === 'lid' ? sm(u, 0.2, 0.9) : k === 'down' || k === 'downAgain' ? 1 - sm(u, 0.1, 0.8) : k === 'set' || k === 'spin' ? 0 : k === 'up' ? sm(u, 0.2, 0.9) : 1;
    const turns = 34;
    const e = k === 'spin' ? u * u * (3 - 2 * u) : 0;
    const speed = k === 'spin' ? Math.sin(u * PI) : 0;
    const n = { lid, ang: e * turns * PI * 2, speed, parted: c.p('spin', 0.45, 0.8), running: k === 'spin' ? 1 : 0, prog: k === 'spin' ? u : c.p('spin') };
    const props = { tubeA, tubeB };
    const onLid = (): Pick<Key, 'l' | 'gl' | 'palms'> => ({ l: add(lidHandle(lid), -0.02, 0, 0.02), gl: 0.6, palms: 0.2 });
    switch (k) {
      case 'come':
        return { ...easy(c), nod: 0.26, n, props };
      case 'lid':
      case 'down':
      case 'up':
      case 'downAgain':
        return { ...onLid(), ...rightEasy(c), nod: 0.2, lean: 0.12, n, props };
      case 'a':
      case 'outA':
      case 'backA':
        return { ...leftEasy(c), tool: 'tube', nod: 0.3, lean: 0.18, n, props };
      case 'b':
      case 'outB':
        return { ...leftEasy(c), tool: 'tube2', nod: 0.3, lean: 0.18, n, props };
      case 'look':
        return { ...leftEasy(c), tool: 'tube', nod: -0.06, lean: 0.02, n, props };
      case 'set':
        return { ...press(CF.button, u), ...leftEasy(c), nod: 0.38, lean: 0.16, n, props };
      default:
        return { ...easy(c), nod: 0.2, n, props };
    }
  },
};

// =============================================================================================
// 현미경 검사대 (microscopeBench, 1 × 1): a seat at the front, the head of the microscope leaning out to meet the eyes.

export const MB = {
  seat: [0, 0.5, 0.72] as V,
  top: 0.74,
  stage: [0, 0.885, 0.13] as V,
  tray: [-0.33, 0.77, 0.28] as V,
  focus: [0.115, 0.83, 0.12] as V,
  knob: [-0.115, 0.83, 0.14] as V,
  counter: [0.32, 0.79, 0.3] as V,
  screen: [0.27, 1.02, -0.2] as V,
};
function slidesKey(k: string, u: number, c: Ctx, extra: Record<string, number>): Key {
  const lift: V = add(MB.tray, 0.08, 0.14, 0.04);
  const slide: V = k === 'take' ? lerpV(MB.tray, lift, sm(u, 0.4, 1)) : k === 'set' ? along([lift, add(MB.stage, 0, 0.05, 0.08), MB.stage], u) : k === 'off' ? along([MB.stage, add(MB.stage, 0, 0.05, 0.08), lift, MB.tray], u) : MB.stage;
  const focus = k === 'look' ? u : c.p('look');
  const n = { ...extra, focus, on: k === 'take' || k === 'off' ? 0 : 1, count: k === 'count' ? u : c.p('count'), drift: k === 'count' ? u : 0 };
  const props = { slide };
  const eyes = { nod: 0.42, lean: 0.24 };
  switch (k) {
    case 'take':
    case 'off':
      return { ...leftEasy(c), tool: 'slide', nod: 0.34, lean: 0.14, n, props };
    case 'set':
      return { l: add(MB.knob, 0, 0, 0.03), gl: 0.5, tool: 'slide', nod: 0.34, lean: 0.14, n, props };
    case 'look':
      return { ...eyes, l: add(MB.knob, 0, 0, 0.02), gl: 0.5, r: add(MB.focus, 0, 0.004 * Math.sin(c.t * 2.2), 0.02), gr: 0.6, palms: 0.3, n, props };
    case 'count':
      return { ...eyes, l: add(MB.knob, 0.006 * Math.sin(c.t * 0.9), 0, 0.02), gl: 0.5, r: add(MB.counter, 0.02 * Math.sin(c.t * 0.7), 0.05, 0), gr: 0.3, palms: 0.05, tap: true, n, props };
    default:
      return { l: add(MB.knob, 0, 0, 0.02), gl: 0.5, r: add(MB.focus, 0, 0, 0.02), gr: 0.5, nod: -0.04, lean: 0.06, n, props };
  }
}
const SLIDES: Script = {
  seq: [['take', 1.1, 0.5], ['set', 1.3, 0.6], ['look', 3.6, 0.5], ['count', 5.2, 0.6], ['sit', 1.4, 0.6], ['off', 1.5, 0.6]],
  at: () => sat(MB.seat),
  key: (k, u, c) => slidesKey(k, u, c, {}),
};
const PRACTICE: Script = {
  seq: [['take', 1.1, 0.5], ['set', 1.3, 0.6], ['look', 3.2, 0.5], ['sit', 2.6, 0.6], ['count', 3.8, 0.6], ['ask', 2.2, 0.5], ['off', 1.5, 0.6]],
  at: () => sat(MB.seat),
  key(k, u, c) {
    const says = k === 'sit' || k === 'ask' ? 1 : 0;
    const K = k === 'ask' ? slidesKey('sit', u, c, {}) : slidesKey(k, u, c, {});
    return { ...K, n: { ...K.n, senior: 1, says, nods: k === 'ask' ? 1 : 0, point: k === 'sit' ? 1 : 0 } };
  },
};

// =============================================================================================
// 검체 냉장고 (sampleFridge, 1 × 1): a tall glass door hinged on the left; step back while it swings.

export const SF = {
  stand: 0.72,
  back: 1.02,
  hx: -0.45,
  hz: 0.44,
  L: 0.84,
  hy: 1.16,
  top: [0.04, 1.34, 0.24] as V,
  low: [-0.1, 0.99, 0.24] as V,
  openA: 1.75,
};
export const fridgeHandle = (a: number): V => [SF.hx + SF.L * Math.cos(a), SF.hy, SF.hz + SF.L * Math.sin(a) + 0.03];
const FRIDGE: Script = {
  seq: [['open', 1.3, 0.7], ['take', 1.3, 0.3], ['read', 2.6, 0.3], ['put', 1.5, 0.7], ['shut', 1.3, 0.7], ['log', 2.0, 0.7]],
  at: (k) => (k === 'open' || k === 'shut' ? st(0.46, SF.back) : k === 'log' ? st(0.1, 0.82) : st(0.08, SF.stand)),
  key(k, u, c) {
    const eye: V = c.bd(-0.1, 1.22, 0.32);
    const rack: V | null = k === 'log' ? null : k === 'take' ? lerpV(SF.top, eye, sm(u, 0.35, 1)) : k === 'read' ? add(eye, 0.015 * Math.sin(c.t * 1.4), 0, 0) : k === 'put' ? along([eye, add(SF.low, 0, 0.06, 0.16), SF.low], u) : k === 'open' ? SF.top : SF.low;
    const a = k === 'open' ? SF.openA * sm(u, 0.05, 0.95) : k === 'shut' ? SF.openA * (1 - sm(u, 0.05, 0.95)) : k === 'log' ? 0 : SF.openA;
    const n = { door: a, cold: k === 'log' ? 1 - u : a > 0.1 ? 1 : 0 };
    const hand = (x: number) => fridgeHandle(Math.min(0.62, x));
    const props = { rack };
    switch (k) {
      case 'open':
      case 'shut':
        return { ...leftEasy(c), r: hand(a), gr: 0.7, palms: 0.3, nod: 0.05, n, props };
      case 'take':
      case 'put':
        return { ...leftEasy(c), tool: 'rack', nod: k === 'put' ? 0.2 : -0.08, lean: 0.14, n, props };
      case 'read':
        return { ...leftEasy(c), tool: 'rack', nod: 0.1, n, props };
      default:
        return { ...press([0.3, 1.78, 0.46], u, 0.2, 0.4), ...leftEasy(c), nod: -0.2, n, props };
    }
  },
};
const ASSIGN: Script = {
  seq: [['read', 2.4, 0.9], ['turn', 3.0, 0.5], ['point', 2.4, 0.5], ['sign', 2.0, 0.9]],
  at: (k) => (k === 'read' ? st(0.05, 0.82) : st(0.05, 0.92, 0.1)),
  key(k, u, c) {
    const tablet: V = c.bd(0.14, 0.66 * c.H, 0.28);
    const n = { mate: 1, says: k === 'turn' ? 1 : 0, nods: k === 'sign' || k === 'point' ? 1 : 0, signed: k === 'sign' ? sm(u, 0.3, 0.6) : 0, checked: c.p('turn', 0.4, 0.6) };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'read':
        return { ...base, ...rightEasy(c), nod: 0.25 };
      case 'turn':
        return { ...base, r: c.bd(-0.26, 0.76 * c.H + 0.04 * Math.sin(c.t * 3), 0.26), gr: 0.15, palms: 0.5, nod: 0 };
      case 'point':
        return { ...base, r: c.bd(-0.34, 0.8 * c.H, 0.34), gr: 0.2, palms: 0.2, nod: -0.04 };
      default:
        return { ...base, r: add(tablet, 0.08 + 0.018 * Math.sin(c.t * 13), 0.05, 0.03), gr: 0.7, nod: 0.26 };
    }
  },
};

// =============================================================================================
// 검체 접수창 (ltReception, 2 × 1): a hatch in a partition, a corridor behind it, a counter through it.

export const RC = {
  stand: 0.66,
  counter: 0.95,
  dweller: 0.12,
  boxX: 0.0,
  boxIn: 0.2,
  boxOut: -0.2,
  tube: [0.0, 1.06, 0.2] as V,
  scan: [0.3, 1.13, 0.3] as V,
  slot: (i: number): V => [0.5 + i * 0.05, 1.03, 0.3],
  hold: [-0.42, 1.03, 0.32] as V,
  screen: [-0.75, 1.32, 0.05] as V,
};
const RECEIVE: Script = {
  seq: [['wait', 1.5, 0.3], ['slide', 1.6, 0.4], ['lid', 1.0, 0.4], ['g0', 0.9, 0.3], ['s0', 1.1, 0.3], ['p0', 0.9, 0.4], ['g1', 0.9, 0.3], ['s1', 1.1, 0.3], ['p1', 0.9, 0.4], ['g2', 0.9, 0.3], ['s2', 1.1, 0.3], ['p2', 0.9, 0.4], ['done', 2.0, 0.6]],
  at: () => st(RC.dweller, RC.stand),
  key(k, u, c) {
    const i = /^[gsp][0-9]$/.test(k) ? Number(k[1]) : -1;
    const over = (j: number): V => add(RC.slot(j), 0, 0.13, 0);
    const tube: V | null = i < 0 ? null : k[0] === 'g' ? lerpV(RC.tube, add(RC.tube, 0.02, 0.1, 0.02), sm(u, 0.45, 1)) : k[0] === 's' ? lerpV(add(RC.tube, 0.02, 0.1, 0.02), RC.scan, sm(u, 0, 0.55)) : along([RC.scan, over(i), RC.slot(i)], u);
    const filled = c.p('p0', 0.85, 0.9) + c.p('p1', 0.85, 0.9) + c.p('p2', 0.85, 0.9);
    const n = { sash: k === 'wait' ? sm(u, 0.1, 0.9) : k === 'done' ? 1 - sm(u, 0.4, 0.95) : 1, box: k === 'wait' ? 0 : k === 'slide' ? sm(u, 0.1, 0.9) : k === 'done' ? 1 - sm(u, 0.25, 0.8) : 1, lid: k === 'lid' ? sm(u, 0.2, 0.9) : k === 'wait' || k === 'slide' || k === 'done' ? 0 : 1, courier: 1, nods: k === 'done' ? 1 : 0, filled, cap: Math.max(0, i), beep: i >= 0 && k[0] === 's' && u > 0.5 ? 1 : 0 };
    const props = { tube };
    if (i >= 0) return { ...leftEasy(c), tool: 'tube', nod: 0.3, lean: 0.14, n, props };
    switch (k) {
      case 'lid':
        return { ...rightEasy(c), l: [RC.boxX - 0.1, 1.09 + 0.1 * n.lid, RC.boxIn + 0.09 - 0.08 * n.lid], gl: 0.6, nod: 0.26, lean: 0.12, n, props };
      case 'slide':
        return { ...easy(c), nod: 0.15, n, props };
      case 'done':
        return { ...rightEasy(c), l: c.bd(0.22, 0.86 * c.H, 0.26), gl: 0.12, palms: 0.5, nod: -0.04, n, props };
      default:
        return { ...easy(c), nod: -0.02, n, props };
    }
  },
};
const LABELCHECK: Script = {
  seq: [['wait', 1.2, 0.3], ['slide', 1.2, 0.4], ['grab', 1.0, 0.3], ['read', 2.6, 0.4], ['screen', 2.0, 0.5], ['aside', 1.2, 0.5], ['tell', 2.6, 0.5], ['back', 1.2, 0.6]],
  at: (k) => (k === 'screen' || k === 'aside' ? st(-0.3, RC.stand) : st(RC.dweller, RC.stand)),
  key(k, u, c) {
    const eye: V = c.bd(-0.08, 1.24, 0.28);
    const tube: V | null = k === 'grab' ? lerpV(RC.tube, eye, sm(u, 0.3, 1)) : k === 'read' ? add(eye, 0, 0, 0.01 * Math.sin(c.t * 2)) : k === 'screen' ? eye : k === 'aside' ? along([eye, add(RC.hold, 0, 0.12, 0), RC.hold], u) : k === 'tell' || k === 'back' ? RC.hold : null;
    const n = { sash: k === 'wait' ? sm(u, 0.1, 0.9) : k === 'back' ? 1 - sm(u, 0.4, 0.95) : 1, box: k === 'wait' ? 0 : k === 'slide' ? sm(u, 0.1, 0.9) : k === 'back' ? 1 - sm(u, 0, 0.5) : 1, lid: k === 'wait' || k === 'slide' || k === 'back' ? 0 : 1, courier: 1, wrong: k === 'screen' || k === 'aside' || k === 'tell' ? 1 : 0, says: k === 'tell' ? 1 : 0, nods: k === 'back' ? 1 : 0, cap: 2, hold: k === 'tell' || k === 'back' ? 1 : 0, filled: 0 };
    const props = { tube };
    switch (k) {
      case 'grab':
      case 'read':
      case 'aside':
        return { ...leftEasy(c), tool: 'tube', nod: k === 'read' ? 0.06 : 0.22, n, props };
      case 'screen':
        return { ...leftEasy(c), tool: 'tube', nod: -0.04, n, props };
      case 'tell':
        return { ...rightEasy(c), l: c.bd(0.1, 0.9 * c.H, 0.3), gl: 0.15, palms: 0.5, nod: -0.04, n, props };
      default:
        return { ...easy(c), nod: 0.06, n, props };
    }
  },
};

// =============================================================================================
// 분주대 (ltPipetteBench, 2 × 1): a bench, a tip box, a rack of samples, a plate of wells, a waste tub.

export const PB = {
  stand: 0.72,
  top: 0.88,
  dweller: 0.06,
  /** Where the pipette's grip is at each place (its tip 0.17 under the grip). */
  home: [-0.4, 1.17, 0.3] as V,
  tipBox: [-0.17, 1.11, 0.3] as V,
  tube: [-0.02, 1.13, 0.32] as V,
  well: (i: number): V => [0.2 - 0.03 + i * 0.03, 1.08, 0.3],
  waste: [0.46, 1.16, 0.3] as V,
  plate: [0.2, 0.9, 0.3] as V,
  hold: [-0.16, 1.0, 0.42] as V,
};
const pipetteCycle = (i: number) => {
  const P = PB;
  const up = (a: V) => add(a, 0, 0.09, 0);
  return [up(P.tipBox), P.tipBox, up(P.tipBox), up(P.tube), P.tube, up(P.tube), up(P.well(i)), P.well(i), up(P.well(i)), up(P.waste), P.waste, up(P.tipBox)] as V[];
};
const PIPETTE: Script = {
  seq: [['take', 1.2, 0.5], ['c0', 7.2, 0.3], ['c1', 7.2, 0.3], ['c2', 7.2, 0.5], ['mix', 2.8, 0.5], ['stow', 1.2, 0.7]],
  at: (k) => (k === 'take' || k === 'stow' ? st(-0.12, PB.stand) : st(PB.dweller, PB.stand)),
  key(k, u, c) {
    const i = k === 'c0' ? 0 : k === 'c1' ? 1 : k === 'c2' ? 2 : -1;
    const seg = u * 11;
    const tip = i >= 0 && seg > 1 && seg < 9.8 ? 1 : 0;
    const liq = i >= 0 && seg > 4 && seg < 7.5 ? 1 : 0;
    const plunger = i >= 0 ? (seg > 3.4 && seg < 4 ? 1 : seg > 6.6 && seg < 7.5 ? 1 : 0) : 0;
    const home = add(PB.home, 0, 0, 0);
    const startUp = add(PB.tipBox, 0, 0.09, 0);
    const pipette: V = k === 'take' ? lerpV(home, startUp, sm(u, 0.4, 1)) : k === 'stow' ? lerpV(startUp, home, sm(u, 0, 0.7)) : i >= 0 ? along(pipetteCycle(i), u) : startUp;
        const n = { tip, liq, plunger, wells: i >= 0 ? i + (seg > 7.2 ? 1 : 0) : k === 'take' ? 0 : 3, mix: k === 'mix' ? sm(u, 0.3, 0.9) : k === 'stow' ? 1 : 0 };
    const props = { pipette };
    if (k === 'mix') return { l: add(PB.plate, -0.1, 0.03, 0.03), gl: 0.55, r: add(PB.plate, 0.1, 0.03 + 0.008 * Math.sin(c.t * 18), 0.03), gr: 0.55, palms: 0.1, nod: 0.3, lean: 0.14, n, props };
    return { l: PB.hold, gl: 0.45, palms: 0.1, tool: 'pipette', nod: 0.3, lean: 0.12, n, props };
  },
};

// =============================================================================================
// 혈액 배양기 (ltIncubator, 2 × 1): on the left a shutter over racks of bottles; on the right a map on a screen and a shelf.

export const IC = {
  stand: 0.72,
  /** The shutter's handle, down and up. */
  shutter: [-0.46, 0.96, 0.48] as V,
  shutterUp: 0.5,
  bottle: [-0.46, 1.14, 0.3] as V,
  slotNew: [-0.46, 1.14, 0.3] as V,
  tray: [0.5, 1.0, 0.38] as V,
  spare: [0.78, 1.0, 0.38] as V,
  screen: [0.5, 1.29, 0.45] as V,
};
const CULTURE: Script = {
  seq: [['alert', 2.2, 1.0], ['raise', 1.2, 0.4], ['pull', 1.2, 0.4], ['look', 2.4, 0.9], ['set', 1.0, 0.5], ['take', 1.0, 0.9], ['load', 1.2, 0.4], ['lower', 1.2, 0.8]],
  at: (k) => (k === 'alert' || k === 'set' || k === 'take' ? st(0.56, IC.stand) : st(-0.36, IC.stand)),
  key(k, u, c) {
    const eye: V = c.bd(-0.08, 1.2, 0.3);
    const carry: V = c.bd(-0.12, 1.04, 0.32);
    const old: V | null = k === 'lower' ? null : k === 'alert' || k === 'raise' ? IC.bottle : k === 'pull' ? lerpV(IC.bottle, eye, sm(u, 0.2, 1)) : k === 'look' ? add(eye, 0, 0.012 * Math.sin(c.t * 1.6), 0) : k === 'set' ? lerpV(carry, IC.tray, sm(u, 0.1, 0.8)) : IC.tray;
    const fresh: V | null = k === 'alert' ? null : k === 'take' ? lerpV(IC.spare, carry, sm(u, 0.4, 1)) : k === 'load' ? along([carry, add(IC.slotNew, 0, 0, 0.16), IC.slotNew], u) : k === 'lower' ? IC.slotNew : IC.spare;
    const shutter = k === 'raise' ? sm(u, 0.15, 0.9) : k === 'lower' ? 1 - sm(u, 0.15, 0.9) : k === 'pull' || k === 'look' || k === 'set' || k === 'take' || k === 'load' ? 1 : 0;
    const n = { shutter, flag: k === 'alert' || k === 'raise' || k === 'pull' ? 1 : 0, rock: shutter > 0.02 ? 0 : 1, cleared: c.p('set', 0.2, 0.5) };
    const props = { old, fresh };
    const handle: V = add(IC.shutter, 0, IC.shutterUp * shutter, 0);
    switch (k) {
      case 'alert':
        return { ...press(add(IC.screen, 0, -0.08, 0), u, 0.3, 0.5), ...leftEasy(c), nod: -0.1, lean: 0.06, n, props };
      case 'raise':
      case 'lower':
        return { ...leftEasy(c), r: add(handle, 0, -0.01, 0.02), gr: 0.65, palms: 0.5, nod: -0.04, n, props };
      case 'pull':
      case 'set':
        return { ...leftEasy(c), tool: 'bottle', nod: 0.1, lean: 0.1, n, props };
      case 'look':
        return { ...leftEasy(c), tool: 'bottle', nod: 0.05, n, props };
      default:
        return { ...leftEasy(c), tool: 'bottle2', nod: 0.1, lean: 0.1, n, props };
    }
  },
};

// =============================================================================================
// 시약 보관고 (ltReagentStore, 2 × 1): a tall cold store with a door that slides across; a reader on the post; a use-first tray.

export const RS = {
  stand: 0.72,
  /** The door's handle shut; it slides left by `travel`. */
  handle: [0.14, 1.16, 0.48] as V,
  travel: 0.74,
  pack: [0.62, 1.42, 0.3] as V,
  front: [0.32, 1.04, 0.32] as V,
  reader: [0.9, 1.22, 0.47] as V,
};
const REAGENT: Script = {
  seq: [['slide', 1.3, 0.7], ['take', 1.1, 0.4], ['scan', 1.6, 0.3], ['expiry', 2.0, 0.4], ['tray', 1.4, 0.7], ['shut', 1.3, 0.6], ['tick', 1.5, 0.7]],
  at: (k) => (k === 'slide' || k === 'shut' ? st(-0.14, RS.stand) : st(0.5, RS.stand)),
  key(k, u, c) {
    const eye: V = c.bd(-0.08, 1.25, 0.3);
    const scanAt: V = add(RS.reader, -0.02, 0, 0.1);
    const pack: V | null = k === 'tick' ? null : k === 'take' ? lerpV(RS.pack, eye, sm(u, 0.3, 1)) : k === 'scan' ? lerpV(eye, scanAt, sm(u, 0, 0.55)) : k === 'expiry' ? lerpV(scanAt, eye, sm(u, 0, 0.4)) : k === 'tray' ? along([eye, add(RS.front, 0, 0.05, 0.1), RS.front], u) : k === 'slide' ? RS.pack : RS.front;
    const door = k === 'slide' ? sm(u, 0.1, 0.9) : k === 'shut' ? 1 - sm(u, 0.1, 0.9) : k === 'tick' ? 0 : 1;
    const n = { door, beep: k === 'scan' && u > 0.55 ? 1 : k === 'expiry' ? 1 : 0, moved: c.p('tray', 0.8, 0.9), checked: k === 'tick' ? sm(u, 0.4, 0.6) : 0 };
    const props = { pack };
    const handle: V = add(RS.handle, -RS.travel * door, 0, 0.0);
    switch (k) {
      case 'slide':
      case 'shut':
        return { ...leftEasy(c), r: handle, gr: 0.65, palms: 0.4, nod: 0.02, n, props };
      case 'take':
      case 'tray':
        return { ...leftEasy(c), tool: 'pack', nod: k === 'take' ? -0.12 : 0.16, lean: 0.08, n, props };
      case 'scan':
      case 'expiry':
        return { ...leftEasy(c), tool: 'pack', nod: 0.02, n, props };
      default:
        return { ...press([0.64, 1.8, 0.42], u, 0.3, 0.5), ...leftEasy(c), nod: -0.24, n, props };
    }
  },
};

// =============================================================================================
// 결과 확인 책상 (ltVerifyDesk, 3 × 1): two screens, a phone, a logbook; a red lamp for a critical value.

export const VD = { seat: [0, 0.47, 0.82] as V, top: 0.76, keys: [0, 0.79, 0.3] as V, mouse: [0.28, 0.79, 0.3] as V, phone: [-0.5, 0.82, 0.24] as V, log: [0.34, 0.785, 0.3] as V, penRest: [0.56, 0.85, 0.28] as V };
const sitHands = (): Key => ({ l: add(VD.keys, -0.1, 0.03, 0), r: add(VD.mouse, 0, 0.03, 0), gl: 0.25, gr: 0.45, palms: 0.05 });
const rolling = (c: Ctx): V => add(VD.mouse, 0.02 * Math.sin(c.t * 2.2), 0.03, 0.012 * Math.cos(c.t * 1.7));
const VERIFY: Script = {
  seq: [['scan', 3.2, 0.5], ['check', 3.0, 0.5], ['approve', 1.8, 0.5], ['next', 3.6, 0.5], ['sign', 1.8, 0.5]],
  at: () => sat(VD.seat),
  key(k, u, c) {
    const n = { rows: k === 'scan' ? 0 : k === 'check' ? u * 2 : k === 'approve' ? 2 + u : k === 'next' ? 3 + u * 2 : 5, cursor: k === 'scan' ? u : frac(c.t * 0.1), tap: k === 'approve' && u > 0.3 && u < 0.55 ? 1 : 0, done: k === 'sign' ? 1 : 0 };
    switch (k) {
      case 'scan':
        return { ...sitHands(), r: rolling(c), nod: -0.04 + 0.04 * Math.sin(c.t * 0.8), lean: 0.06, n };
      case 'check':
        return { ...sitHands(), r: rolling(c), nod: 0.0, lean: 0.14, n };
      case 'approve':
        return { ...sitHands(), tap: u > 0.3 && u < 0.5, nod: 0.08, n };
      case 'next':
        return { ...typing(VD.keys, c.t), nod: 0.1, n };
      default:
        return { ...sitHands(), nod: -0.02, n };
    }
  },
};
const CRITICAL: Script = {
  seq: [['see', 2.2, 0.5], ['zoom', 2.0, 0.5], ['lift', 0.8, 0.3], ['call', 3.8, 0.3], ['down', 0.8, 0.5], ['pen', 0.8, 0.3], ['write', 2.6, 0.3], ['penDown', 0.7, 0.5], ['ok', 1.8, 0.5]],
  at: () => sat(VD.seat),
  key(k, u, c) {
    const ear: V = c.bd(0.14, 0.72, 0.03);
    const phone: V = k === 'lift' ? lerpV(VD.phone, ear, sm(u, 0.1, 1)) : k === 'call' ? ear : k === 'down' ? lerpV(ear, VD.phone, sm(u, 0, 0.9)) : VD.phone;
    const writing: V = add(VD.log, 0.07 * frac(u * 4) - 0.03, 0.09 + 0.004 * Math.sin(c.t * 16), 0.02 - 0.03 * Math.floor(u * 4) * 0.25);
    const pen: V = k === 'pen' ? lerpV(VD.penRest, add(VD.log, -0.03, 0.09, 0.02), sm(u, 0.2, 1)) : k === 'write' ? writing : k === 'penDown' ? lerpV(add(VD.log, 0.02, 0.09, 0.0), VD.penRest, sm(u, 0, 0.8)) : VD.penRest;
    const n = { flag: k === 'ok' ? 0 : 1, zoom: k === 'zoom' ? sm(u, 0, 0.3) : c.p('zoom') * (k === 'ok' ? 0 : 1), talk: k === 'call' ? 1 : 0, called: c.p('call', 0.7, 0.8), log: k === 'write' ? u : c.p('write'), done: k === 'ok' ? 1 : 0, lamp: k === 'ok' ? 0 : 1 };
    const props = { phone, pen };
    switch (k) {
      case 'see':
        return { ...sitHands(), r: rolling(c), nod: -0.02, lean: 0.1, n, props };
      case 'zoom':
        return { ...sitHands(), nod: 0.0, lean: 0.2, n, props };
      case 'lift':
      case 'call':
      case 'down':
        return { r: add(VD.mouse, 0, 0.03, 0), gr: 0.45, palms: 0.05, nod: k === 'call' ? -0.04 : 0.04, tool: 'phone', n, props };
      case 'pen':
      case 'write':
      case 'penDown':
        return { l: add(VD.log, -0.13, 0.03, 0), gl: 0.3, palms: 0.05, nod: 0.3, lean: 0.14, tool: 'pen', n, props };
      default:
        return { ...sitHands(), nod: 0.1 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 감염성 폐기물함 (ltBioBin, 1 × 1): a pedal bin with a hinged lid, a small table of used tubes beside it.

export const BB = {
  stand: 0.7,
  binX: 0.14,
  top: 0.74,
  tray: [-0.33, 0.93, 0.22] as V,
  over: [0.14, 1.08, 0.12] as V,
};
const DISPOSE: Script = {
  seq: [['take', 1.1, 0.5], ['lift', 0.5, 0.4], ['pedal', 1.0, 0.3], ['drop', 1.2, 0.5], ['shut', 1.0, 0.6], ['take2', 1.1, 0.5], ['pedal2', 0.9, 0.3], ['drop2', 1.2, 0.5], ['shut2', 1.2, 0.8]],
  at: (k) => (k === 'take' || k === 'take2' ? st(-0.1, BB.stand) : st(0.02, BB.stand)),
  key(k, u, c) {
    const tray = BB.tray;
    const carry: V = c.bd(-0.12, 1.1, 0.34);
    const over = BB.over;
    const fall: V = [over[0], over[1] - 0.6 * sm(u, 0.2, 0.75), over[2]];
    const tube: V | null = k === 'take' || k === 'take2' ? lerpV(tray, carry, sm(u, 0.4, 1)) : k === 'lift' ? carry : k === 'pedal' || k === 'pedal2' ? lerpV(carry, over, sm(u, 0.1, 0.8)) : k === 'drop' || k === 'drop2' ? (u < 0.2 ? over : u < 0.75 ? fall : null) : null;
    const lid = k === 'pedal' || k === 'pedal2' ? sm(u, 0, 0.5) : k === 'drop' || k === 'drop2' ? 1 : k === 'shut' || k === 'shut2' ? 1 - sm(u, 0.1, 0.8) : 0;
    const n = { lid, pedal: lid, gone: c.p('drop', 0.5, 0.6) + c.p('drop2', 0.5, 0.6) };
    const props = { tube };
    const inHand = k === 'take' || k === 'take2' || k === 'lift' || k === 'pedal' || k === 'pedal2' || ((k === 'drop' || k === 'drop2') && u < 0.2);
    if (inHand) return { ...leftEasy(c), tool: 'tube', nod: 0.34, lean: 0.12, n, props };
    return { ...easy(c), nod: 0.26, n, props };
  },
};

const SCRIPTS: Record<LtMotion, Script> = {
  ltRun: RUN,
  ltStat: STAT,
  ltQc: QC,
  ltSpecial: SPECIAL,
  ltSpin: SPIN,
  ltSlides: SLIDES,
  ltPractice: PRACTICE,
  ltFridge: FRIDGE,
  ltAssign: ASSIGN,
  ltReceive: RECEIVE,
  ltLabelCheck: LABELCHECK,
  ltPipette: PIPETTE,
  ltCulture: CULTURE,
  ltReagent: REAGENT,
  ltVerify: VERIFY,
  ltCritical: CRITICAL,
  ltDispose: DISPOSE,
};
