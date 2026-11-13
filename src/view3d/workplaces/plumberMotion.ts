import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 설비 업체 (2026-11-01, the workplace pipeline, at the user's request), the made-up 물길설비. Each
 * motion is a round of beats, as at the 패스트푸드점: where the dweller is, where the hands go, what moves. The piece
 * reads the same script by the same clock (plumber.ts), so the joint under the wrench is the joint that stops
 * dripping and the needle climbs with each stroke of the pump.
 *
 * - pbCut (배관 작업대): a length off the back of the bench, clamped, measured, cut round with the tube cutter,
 *   the offcut in the bin, reamed, taped, an elbow wrenched on, the level laid along it, and into the crate.
 * - pbLearn (배관 작업대): the fittings off the tray one by one held up to the board, the foreman naming them;
 *   a union tried on a stub, and his nod.
 * - pbThread (나사 절삭기): the pipe through the chuck, the die down, the switch, fed along the rails with oil
 *   running and chips curling, die up, wiped, the thread gauge on it.
 * - pbPick (파이프 랙): the job sheet read, along the rack, a length lifted out, measured, tagged, put back ready.
 * - pbListen (누수 탐지기): the earpiece up, the listening pole set on the floor at one mark after another, the
 *   wave climbing on the screen, and a chalk cross where it's loudest.
 * - pbExplain (누수 탐지기): a client shown the plan on a tablet, the place pointed out, the cause, a bow.
 * - pbBoil (보일러 수리대): the code read, the gas shut, the cover off, the igniter metered, swapped, the cover
 *   on, the gas open, and the flame lights in its window.
 * - pbDesign (보일러 수리대): the gauges read and a heating plan drawn on the clipboard, loop by loop.
 * - pbFind (누수 실습 벽): the pressure falling, the main shut, joints felt along the wall, the wet one wiped
 *   and wrenched up, the main opened, the drip gone.
 * - pbPressure (누수 실습 벽): the hand pump coupled, pumped up to ten bar, watched, ticked off, bled down.
 * - pbSnake / pbCamera (배수 실습대): the cap off and the spring fed down to the clog, spun, drawn out with the
 *   muck on it, water through; or the camera fed in with the crack coming up on the monitor.
 * - pbToilet / pbFaucet (위생기구 실습대): the training toilet's tank valve changed and flushed; the basin
 *   tap's cartridge changed from under the basin, the water run.
 * - pbServe (부품 카운터): a customer's broken part looked at, the catalogue, a drawer, the two compared, bagged,
 *   paid for.
 * - pbLoad (출장 차량): the job sheet, the sliding door, the tool box and a pipe in, strapped, checked, shut.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x.
 */
export type PbMotion = 'pbCut' | 'pbLearn' | 'pbThread' | 'pbPick' | 'pbListen' | 'pbExplain' | 'pbBoil' | 'pbDesign' | 'pbFind' | 'pbPressure' | 'pbSnake' | 'pbCamera' | 'pbToilet' | 'pbFaucet' | 'pbServe' | 'pbLoad';
export const PB_MOTIONS = new Set<string>(['pbCut', 'pbLearn', 'pbThread', 'pbPick', 'pbListen', 'pbExplain', 'pbBoil', 'pbDesign', 'pbFind', 'pbPressure', 'pbSnake', 'pbCamera', 'pbToilet', 'pbFaucet', 'pbServe', 'pbLoad']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const pbPhase = (p: THREE.Vector3) => frac(p.x * 0.417 + p.z * 0.631);
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
export interface PbNow {
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
export function pbNow(m: PbMotion, t: number, ph: number, H = 1.6): PbNow {
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
export function pbPose(m: PbMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = pbNow(m, t, pbPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
const scrub = (a: V, t: number, w = 0.05, h = 0.04): V => [a[0] + w * Math.sin(t * 7), a[1] + h * Math.cos(t * 7), a[2]];
/** A hand on a wheel or a valve turning: round a centre, in the x–y plane facing the dweller. */
const round = (o: V, r: number, a: number): V => [o[0] + r * Math.cos(a), o[1] + r * Math.sin(a), o[2] + 0.02];
/** The end of a wrench hung from `o` at turn `a` (about x; negative swings it out to the dweller). */
const wrenchEnd = (o: V, L: number, a: number): V => [o[0], o[1] - L * Math.cos(a), o[2] - L * Math.sin(a)];

// =============================================================================================
// 배관 작업대 (pipeBench, 2 × 1): a steel bench, a chain vise left of centre, spare lengths along the back, a
// pegboard of fittings with their names.

export const BN = {
  stand: 0.62,
  top: 0.88,
  vise: [-0.42, 1.02, 0.12] as V,
  handle: [-0.42, 1.22, 0.12] as V,
  pipe: [0, 1.02, 0.12] as V,
  rest: [0, 0.94, -0.02] as V,
  cutX: 0.28,
  bin: [0.74, 0.5, 0.18] as V,
  /** The shelf under the bench, where what's done goes. */
  crate: [0, 0.4, 0.14] as V,
  tray: [[-0.33, 0.92, 0.27], [-0.11, 0.92, 0.27], [0.11, 0.92, 0.27], [0.33, 0.92, 0.27]] as V[],
  stub: [0.6, 1.0, 0.1] as V,
  held: [0.02, 1.2, 0.28] as V,
  /** The foreman, and where his pointing hand goes on the board. */
  boss: [0.92, 1.02] as [number, number],
  board: [[-0.42, 1.5, -0.38], [-0.14, 1.5, -0.38], [0.14, 1.5, -0.38], [0.42, 1.5, -0.38]] as V[],
};
const CUT_SEQ: Seq = [['fetch', 1.6, 0.4], ['clamp', 1.6], ['mark', 2.0], ['cutter', 4.2], ['drop', 1.3], ['ream', 2.2], ['tape', 2.6], ['fit', 3.4], ['level', 1.8], ['crate', 1.8, 0.7]];
const CUT: Script = {
  seq: CUT_SEQ,
  at: (k) => (k === 'fetch' ? st(0.02, BN.stand - 0.12) : st(0.02, BN.stand)),
  key(k, u, c): Key {
    const cx = BN.cutX;
    const pipeAt: V = c.p('crate') > 0 ? lerpV(BN.pipe, BN.crate, sm(u, 0.1, 0.85)) : lerpV(BN.rest, BN.pipe, c.p('fetch', 0.15, 0.85));
    const elbow: V = [cx + 0.03, BN.pipe[1], BN.pipe[2]];
    const n = {
      cut: c.p('cutter', 0.1, 0.95),
      off: c.p('drop', 0.15, 0.8),
      ring: c.p('mark', 0.6, 0.8),
      wrap: c.p('tape', 0.1, 0.9),
      elbow: c.p('fit'),
      vise: c.p('clamp'),
      cutA: 0,
      blade: 0,
      wrA: -0.7,
      bubble: 0,
      twist: 0,
      chips: 0,
      crateIn: c.p('crate', 0.82, 0.86),
    };
    const props: Record<string, V | null> = { pipe: c.p('crate', 0.82, 0.86) < 1 ? pipeAt : null };
    if (n.elbow > 0 && n.crateIn < 1) props.elbow = c.p('crate') > 0 ? add(pipeAt, cx + 0.03, 0, 0) : elbow;
    switch (k) {
      case 'fetch':
        return { l: add(pipeAt, -0.24, 0.03, 0.03), r: add(pipeAt, 0.24, 0.03, 0.03), gl: 0.85, gr: 0.85, nod: 0.35, lean: 0.08, props, n };
      case 'clamp': {
        const a = c.t * 6;
        return { l: add(BN.handle, 0.07 * Math.cos(a), 0, 0.03 + 0.05 * Math.sin(a)), gl: 0.9, r: add(BN.pipe, 0.26, 0.03, 0.03), gr: 0.8, nod: 0.3, props, n: { ...n, viseA: c.t * 4 } };
      }
      case 'mark': {
        // The tape's hook on the pipe's end, drawn back to the mark, a pencil round it.
        const body: V = [cx - 0.42 * sm(u, 0, 0.4), BN.pipe[1] + 0.05, BN.pipe[2] + 0.06];
        return { l: add(body, -0.03, 0, 0.02), gl: 0.85, r: u > 0.45 ? add(scrub([cx, BN.pipe[1] + 0.06, BN.pipe[2] + 0.04], c.t, 0.006, 0.01), 0, 0, 0) : add(BN.pipe, 0.55, 0.03, 0.03), gr: 0.8, nod: 0.42, props: { ...props, tape: body, pencil: u > 0.45 ? [cx, BN.pipe[1] + 0.08, BN.pipe[2] + 0.04] : null }, n: { ...n, blade: 0.08 + 0.42 * sm(u, 0, 0.4) } };
      }
      case 'cutter': {
        // Round and round the pipe, the knob tightened between turns.
        const a = c.t * 5;
        const stop = u > 0.45 && u < 0.55;
        const h: V = stop ? [cx + 0.02, BN.pipe[1] - 0.16, BN.pipe[2] + 0.02] : [cx + 0.02, BN.pipe[1] + 0.14 * Math.cos(a), BN.pipe[2] + 0.14 * Math.sin(a) + 0.03];
        return { r: h, gr: 0.9, l: add(BN.pipe, -0.1, 0.04, 0.04), gl: 0.8, nod: 0.42, lean: 0.1, props: { ...props, cutter: [cx, BN.pipe[1], BN.pipe[2]] }, n: { ...n, cutA: stop ? 0 : a, chips: 1 } };
      }
      case 'drop': {
        // The offcut caught and let go in the bin.
        const off = lerpV([cx + 0.13, BN.pipe[1], BN.pipe[2]], BN.bin, sm(u, 0.25, 0.85));
        return { r: u < 0.5 ? add(off, 0.02, 0.03, 0.03) : c.bd(-0.22, 0.56 * c.H, 0.12), gr: u < 0.5 ? 0.85 : 0.3, nod: 0.35, props: { ...props, offcut: u < 0.85 ? off : null }, n };
      }
      case 'ream': {
        const h: V = [cx + 0.1, BN.pipe[1], BN.pipe[2] + 0.02];
        return { r: h, gr: 0.9, l: add(BN.pipe, 0.02, 0.04, 0.04), gl: 0.8, nod: 0.4, props: { ...props, reamer: [cx + 0.04, BN.pipe[1], BN.pipe[2]] }, n: { ...n, twist: c.t * 7 } };
      }
      case 'tape': {
        // The white tape wound round the end, the roll going over and under.
        const a = c.t * 7;
        const roll: V = [cx - 0.03, BN.pipe[1] + 0.07 * Math.cos(a), BN.pipe[2] + 0.07 * Math.sin(a)];
        return { r: add(roll, 0.02, 0, 0.03), gr: 0.85, l: add(BN.pipe, 0.02, 0.04, 0.04), gl: 0.8, nod: 0.42, props: { ...props, roll }, n };
      }
      case 'fit': {
        // Spun on by hand, then the wrench, two pulls.
        if (u < 0.25) return { r: add(elbow, 0.03 + 0.012 * Math.sin(c.t * 16), 0.04, 0.03), gr: 0.75, l: add(BN.pipe, 0.02, 0.04, 0.04), gl: 0.8, nod: 0.4, props, n };
        const a = -0.45 - 0.75 * Math.abs(Math.sin((u - 0.25) * PI * 2.67));
        return { r: wrenchEnd(elbow, 0.26, a), gr: 0.95, l: add(BN.pipe, -0.02, 0.04, 0.04), gl: 0.85, nod: 0.38, lean: 0.1, props: { ...props, wrench: elbow }, n: { ...n, wrA: a } };
      }
      case 'level': {
        const lv = add(BN.pipe, -0.05, 0.055, 0);
        return { l: add(lv, -0.11, 0.03, 0.02), r: add(lv, 0.11, 0.03, 0.02), gl: 0.5, gr: 0.5, nod: 0.45, lean: 0.12, props: { ...props, level: lv }, n: { ...n, bubble: Math.sin(c.t * 2) * (1 - u) } };
      }
      case 'crate':
        return { l: add(pipeAt, -0.2, 0.03, 0.03), r: add(pipeAt, 0.2, 0.03, 0.03), gl: 0.85, gr: 0.85, nod: 0.38, crouch: sm(u, 0.2, 0.8) * 0.65, props, n };
      default:
        return { props, n };
    }
  },
};
const LEARN_SEQ: Seq = [['f0', 2.8], ['f1', 2.8], ['f2', 2.8], ['f3', 2.8], ['try', 3.6, 0.6], ['ok', 1.8, 0.7]];
const LEARN: Script = {
  seq: LEARN_SEQ,
  at: (k) => st(k === 'try' || k === 'ok' ? 0.26 : -0.04, BN.stand),
  key(k, u, c): Key {
    const n = { boss: 1, lit: 0, point: 0, nodB: 0 };
    const m = /^f(\d)$/.exec(k);
    if (m) {
      // Off the tray, up where it can be seen, turned over, then back; his hand on the name meanwhile.
      const i = +m[1];
      const e = sm(u, 0.05, 0.28) * (1 - sm(u, 0.8, 0.98));
      const h = lerpV(add(BN.tray[i], 0.02, 0.05, 0.05), BN.held, e);
      return { r: h, gr: 0.8, l: e > 0.6 ? add(BN.held, -0.08, 0.02, 0) : c.bd(0.22, 0.56 * c.H, 0.1), gl: 0.5, nod: e > 0.5 ? -0.03 + 0.1 * Math.sin(u * PI * 3) : 0.35, props: { [`f${i}`]: add(h, -0.02, 0.05, -0.03) }, n: { ...n, lit: i + 1, point: e, turn: c.t * 1.6 } };
    }
    if (k === 'try') {
      // The union on the stub, screwed up by hand and undone.
      const onIt = add(BN.stub, 0, 0, 0.02);
      return { r: add(onIt, 0.02 * Math.sin(c.t * 14), 0.04, 0.03), gr: 0.8, l: add(BN.stub, -0.18, 0.02, 0.03), gl: 0.8, nod: 0.38, lean: 0.08, props: { f2: add(BN.stub, 0.09 - 0.05 * sm(u, 0, 0.7), 0, 0) }, n: { ...n, turn: u * 9, nodB: u > 0.6 ? 1 : 0 } };
    }
    return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: c.bd(-0.2, 0.56 * c.H, 0.1), nod: 0.3 * Math.sin(u * PI), n: { ...n, nodB: 1 } };
  },
};

// =============================================================================================
// 나사 절삭기 (pbThreader, 2 × 1): a chuck on the left, rails, the die carriage and its wheel, an oil pan.

export const TH = {
  stand: 0.62,
  y: 1.02,
  z: 0.02,
  chuck: -0.62,
  /** Where the die starts, and how far along the pipe it runs. */
  dieX: 0.34,
  feed: 0.2,
  /** The carriage's wheel, relative to the die. */
  wheel: [0, -0.12, 0.3] as V,
  sw: [0.82, 1.08, 0.2] as V,
  rest: [0.1, 0.72, 0.42] as V,
  rag: [0.72, 0.9, 0.32] as V,
  gauge: [-0.3, 0.9, 0.34] as V,
};
const THREAD_SEQ: Seq = [['load', 1.9], ['chuck', 1.5], ['down', 1.2], ['start', 0.9], ['feed', 5.0], ['up', 1.2], ['stop', 0.8], ['back', 1.2], ['wipe', 2.0], ['gauge', 2.4], ['out', 1.6, 0.7]];
const THREAD: Script = {
  seq: THREAD_SEQ,
  at: (k) => (k === 'start' || k === 'stop' ? st(0.45, TH.stand) : k === 'chuck' ? st(-0.24, TH.stand) : k === 'load' || k === 'out' ? st(0.34, TH.stand) : st(0.08, TH.stand)),
  key(k, u, c): Key {
    const run = c.p('start', 0.3, 0.8) - c.p('stop', 0.1, 0.7);
    const f = c.p('feed', 0, 0.95) - c.p('back', 0.1, 0.9);
    const pipeAt: V = [mixN(0.55, 0, c.p('load', 0.15, 0.9)) + mixN(0, 0.55, c.p('out', 0.1, 0.9)), TH.y, TH.z];
    const dieX = TH.dieX - TH.feed * f;
    const wheel = add([dieX, TH.y, TH.z], TH.wheel[0], TH.wheel[1], TH.wheel[2]);
    const n = { run, f, thread: c.p('feed', 0.05, 0.95), die: c.p('down', 0.1, 0.8) - c.p('up', 0.1, 0.8), jaws: c.p('chuck', 0.2, 0.9) - c.p('out', 0, 0.15), oil: c.p('feed') > 0 && c.p('up') === 0 ? 1 : 0, wiped: c.p('wipe', 0.1, 0.9), pipeOn: c.p('load', 0, 0.1) - c.p('out', 0.9, 1) };
    const props: Record<string, V | null> = { pipe: pipeAt };
    const rest = c.bd(-0.22, 0.56 * c.H, 0.12);
    switch (k) {
      case 'load':
        return { l: add(pipeAt, -0.1, 0.04, 0.05), r: add(pipeAt, 0.2, 0.04, 0.05), gl: 0.85, gr: 0.85, nod: 0.3, props, n };
      case 'chuck': {
        const o: V = [TH.chuck + 0.1, TH.y, TH.z + 0.22];
        return { l: round(o, 0.08, c.t * 5), gl: 0.9, r: add(pipeAt, 0.18, 0.04, 0.05), gr: 0.75, nod: 0.3, lean: 0.08, props, n };
      }
      case 'down':
        return { r: add([TH.dieX, TH.y + 0.18 - 0.1 * u, TH.z + 0.1], 0, 0, 0), gr: 0.9, l: rest, nod: 0.32, props, n };
      case 'start':
      case 'stop':
        return { r: add(TH.sw, 0, 0.01, 0.02), tap: true, nod: 0.25, props, n };
      case 'feed':
        // The wheel brought round, a little at a time, eyes on the die.
        return { l: round(wheel, 0.07, -c.t * 2.2), gl: 0.9, r: add(wheel, 0.2, 0.12, -0.02), gr: 0.4, nod: 0.36, lean: 0.1, props, n };
      case 'up':
        return { r: add([dieX, TH.y + 0.1 + 0.08 * u, TH.z + 0.1], 0, 0, 0), gr: 0.9, l: add(wheel, 0, 0, 0), gl: 0.8, nod: 0.32, props, n };
      case 'back':
        return { l: round(wheel, 0.07, c.t * 5), gl: 0.9, nod: 0.2, props, n };
      case 'wipe': {
        // The rag round the new thread.
        const h = scrub([TH.dieX - 0.06, TH.y + 0.02, TH.z + 0.08], c.t, 0.05, 0.03);
        return { r: h, gr: 0.7, nod: 0.42, lean: 0.08, props: { ...props, rag: add(h, 0, -0.02, -0.02) }, n };
      }
      case 'gauge': {
        const on: V = [TH.dieX - 0.03, TH.y, TH.z];
        const h = lerpV(TH.gauge, add(on, 0, 0.02, 0.05), sm(u, 0, 0.35));
        return { l: add(h, -0.02, 0, 0.03), gl: 0.85, nod: 0.42, lean: 0.1, props: { ...props, gauge: u < 0.35 ? add(h, 0, 0, -0.04) : on }, n: { ...n, spin: c.t * 3 } };
      }
      case 'out':
        return { l: add(pipeAt, -0.1, 0.04, 0.05), r: add(pipeAt, 0.2, 0.04, 0.05), gl: 0.85, gr: 0.85, nod: 0.25, props, n };
      default:
        return { props, n };
    }
  },
};

// =============================================================================================
// 파이프 랙 (pbPipeRack, 2 × 1): three tiers of lengths, a coil on the end.

export const RK = {
  stand: 0.68,
  tiers: [0.42, 0.86, 1.3] as const,
  z: -0.08,
  sheet: [0.86, 1.02, 0.34] as V,
  held: [0, 1.04, 0.26] as V,
};
const PICK_SEQ: Seq = [['sheet', 2.2, 0.7], ['low', 1.4, 0.7], ['high', 1.4, 0.7], ['lift', 1.8], ['tape', 3.0], ['tag', 1.8], ['put', 1.8, 0.6]];
const PICK: Script = {
  seq: PICK_SEQ,
  at: (k) => (k === 'sheet' ? st(0.5, RK.stand) : k === 'low' ? st(-0.42, RK.stand - 0.16) : k === 'high' ? st(0.34, RK.stand) : st(0.02, RK.stand)),
  key(k, u, c): Key {
    const home: V = [0, RK.tiers[1] + 0.05, RK.z + 0.14];
    const sheet = lerpV(RK.sheet, c.bd(0.14, 0.64 * c.H, 0.24), sm(u, 0, 0.3));
    const n = { tagged: c.p('tag', 0.6, 0.8), blade: 0 };
    const hands = (p: V): Partial<Key> => ({ l: add(p, -0.3, 0.03, 0.03), r: add(p, 0.3, 0.03, 0.03), gl: 0.85, gr: 0.85 });
    switch (k) {
      case 'sheet':
        return { l: add(sheet, 0, -0.03, 0.03), gl: 0.8, nod: 0.3, props: { sheet }, n };
      case 'low':
        // Along the rack, a hand on the tier it might be, looking down the labels.
        return { l: c.bd(0.14, 0.64 * c.H, 0.24), gl: 0.8, r: [-0.3, RK.tiers[0] + 0.18, 0.18], crouch: 0.55, nod: 0.3, props: { sheet: c.bd(0.14, 0.64 * c.H, 0.27) }, n };
      case 'high':
        return { l: c.bd(0.14, 0.64 * c.H, 0.24), gl: 0.8, r: [0.42, RK.tiers[2] + 0.08, 0.14], gr: 0.6, nod: -0.1, props: { sheet: c.bd(0.14, 0.64 * c.H, 0.27) }, n };
      case 'lift': {
        const p = lerpV(home, RK.held, sm(u, 0.1, 0.9));
        return { ...hands(p), nod: 0.3, lean: 0.06, props: { pipe: p }, n };
      }
      case 'tape': {
        // The left hand holds the tape's hook on the end, the right draws it along.
        const body: V = [0.42 - 0.68 * sm(u, 0, 0.6), RK.held[1] + 0.05, RK.held[2] + 0.04];
        return { r: [0.42, RK.held[1] + 0.03, RK.held[2] + 0.03], gr: 0.8, l: add(body, -0.03, 0, 0.02), gl: 0.85, nod: 0.42, props: { pipe: RK.held, tape: body }, n: { ...n, blade: 0.68 * sm(u, 0, 0.6) } };
      }
      case 'tag':
        return { r: add(RK.held, 0.12 + 0.02 * Math.sin(c.t * 9), 0.03, 0.04), gr: 0.75, l: add(RK.held, -0.1, 0.03, 0.03), gl: 0.75, nod: 0.42, props: { pipe: RK.held }, n };
      case 'put': {
        const p = lerpV(RK.held, home, sm(u, 0.1, 0.9));
        return { ...hands(p), nod: 0.3, props: { pipe: p }, n };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 누수 탐지기 (leakDetector, 1 × 1): a cart with the instrument and its pole, and a mock-up floor in front.

export const LD = {
  stand: 0.86,
  pad: 0.98,
  screen: [0, 1.14, 0.1] as V,
  ear: [-0.2, 1.04, 0.26] as V,
  pole: [0.3, 0.2, 0.24] as V,
  /** The marks on the floor; the last is where it leaks. */
  marks: [[-0.3, 0.86], [0.26, 1.22], [-0.02, 1.02]] as Array<[number, number]>,
  client: [1.02, 0.9] as [number, number],
  tablet: [-0.3, 1.0, 0.22] as V,
};
const LISTEN_SEQ: Seq = [['ear', 1.5], ['pole', 1.5], ['p0', 2.6, 0.8], ['p1', 2.6, 0.8], ['p2', 3.2], ['chalk', 1.8], ['read', 2.0, 0.7], ['stow', 1.6, 0.6]];
const LISTEN: Script = {
  seq: LISTEN_SEQ,
  at(k) {
    const m = /^p(\d)$/.exec(k);
    if (m) {
      const p = LD.marks[+m[1]];
      return st(p[0] - 0.14, p[1] + 0.36);
    }
    if (k === 'chalk') return st(LD.marks[2][0] - 0.1, LD.marks[2][1] + 0.34);
    return st(0.04, LD.stand - 0.2);
  },
  key(k, u, c): Key {
    const ear = c.bd(0.13, 0.92 * c.H, 0.03);
    const m = /^p(\d)$/.exec(k);
    const n = { level: 0, cross: c.p('chalk', 0.2, 0.9), wave: 0, cord: 1 };
    if (m) {
      // The pole set on the mark, and still: the level comes up as it's listened to.
      const p = LD.marks[+m[1]];
      const foot: V = [p[0], 0.02, p[1]];
      const top = add(foot, 0, 0.88, 0);
      return { l: ear, gl: 0.8, r: add(top, 0.02, 0, 0.02), gr: 0.9, nod: 0.3, lean: 0.06, props: { ear: add(ear, -0.01, -0.02, 0.01), pole: foot }, n: { ...n, level: [0.22, 0.48, 0.92][+m[1]] * sm(u, 0.1, 0.5), wave: +m[1] === 2 ? 1 : 0 } };
    }
    switch (k) {
      case 'ear': {
        const h = lerpV(LD.ear, ear, sm(u, 0.1, 0.8));
        return { l: h, gl: 0.8, nod: 0.05, props: { ear: add(h, -0.01, -0.02, 0.01) }, n };
      }
      case 'pole': {
        const foot = lerpV(LD.pole, [LD.marks[0][0], 0.02, LD.marks[0][1]], sm(u, 0.3, 1));
        return { l: ear, gl: 0.8, r: add(foot, 0.02, 0.88 - 0.28 * (1 - sm(u, 0.3, 1)), 0.02), gr: 0.9, nod: 0.3, props: { ear: add(ear, -0.01, -0.02, 0.01), pole: foot }, n };
      }
      case 'chalk': {
        const x: V = [LD.marks[2][0], 0.26, LD.marks[2][1]];
        return { r: add(x, 0.08 * Math.sin(c.t * 8), 0.02, 0.08 * Math.cos(c.t * 8)), gr: 0.75, crouch: 1, nod: 0.5, lean: 0.3, props: { pole: [LD.marks[2][0] + 0.25, 0.02, LD.marks[2][1]] }, n: { ...n, wave: 1 } };
      }
      case 'read':
        return { r: add(LD.screen, 0.1, -0.08, 0.06), tap: true, nod: 0.2, n: { ...n, level: 0.92, wave: 1 } };
      case 'stow':
        return { l: lerpV(ear, LD.ear, sm(u, 0.2, 0.9)), gl: 0.5, r: add(LD.pole, 0, 0.74, 0.02), gr: 0.75, nod: 0.25, n };
      default:
        return { n };
    }
  },
};
const EXPLAIN_SEQ: Seq = [['greet', 1.7], ['take', 1.2], ['plan', 3.2], ['point', 3.2], ['cross', 2.4], ['cost', 2.8], ['bow', 1.6]];
const EXPLAIN: Script = {
  seq: EXPLAIN_SEQ,
  // Between the client (to their +x) and the floor they're talking about (turned to it for the place itself).
  at: (k) => (k === 'take' ? st(0.0, LD.stand - 0.2) : k === 'point' ? st(0.46, 0.98, -PI / 2) : st(0.46, 0.98, PI / 2)),
  key(k, u, c): Key {
    const tab = c.bd(0.12, 0.66 * c.H, 0.28);
    const n = { client: 1, page: 0, cNod: 0, cPoint: 0, level: 0.6 };
    const holding: Partial<Key> = { l: add(tab, -0.06, -0.03, 0), gl: 0.8 };
    switch (k) {
      case 'greet':
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.14 * Math.sin(u * PI), n: { ...n, cNod: Math.sin(u * PI) } };
      case 'take': {
        const h = lerpV(LD.tablet, c.bd(0.12, 0.66 * c.H, 0.28), sm(u, 0.2, 0.9));
        return { l: add(h, -0.06, -0.03, 0), gl: 0.8, nod: 0.25, props: { tablet: h }, n };
      }
      case 'plan':
        // Turned so the client sees it, a finger going along the pipes on the plan.
        return { ...holding, r: add(tab, 0.05 + 0.08 * Math.sin(c.t * 1.6), 0.04, 0.03), gr: 0.25, tap: true, nod: 0.3, props: { tablet: tab }, n: { ...n, page: 1 } };
      case 'point':
        // At the floor: the place itself.
        return { ...holding, r: c.bd(0, 0.45 * c.H, 0.55), gr: 0.2, nod: 0.38, props: { tablet: tab }, n: { ...n, page: 1, cNod: Math.abs(Math.sin(c.t * 1.8)) * 0.5 } };
      case 'cross':
        return { ...holding, r: add(tab, 0.08 * Math.sin(c.t * 8), 0.04, 0.03), gr: 0.25, tap: true, nod: 0.3, props: { tablet: tab }, n: { ...n, page: 2, cPoint: 1 } };
      case 'cost':
        // What it'll take: hands opened to them.
        return { l: add(tab, -0.06, -0.03, 0), gl: 0.8, r: c.bd(-0.26, 0.62 * c.H, 0.26 + 0.04 * Math.sin(c.t * 3)), palms: 0.9, nod: 0.08, props: { tablet: tab }, n: { ...n, page: 3, cNod: Math.abs(Math.sin(c.t * 1.2)) * 0.6 } };
      case 'bow':
        return { ...holding, nod: 0.32 * Math.sin(u * PI), lean: 0.16 * Math.sin(u * PI), props: { tablet: tab }, n: { ...n, cNod: Math.sin(u * PI) } };
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 보일러 수리대 (boilerUnit, 1 × 1): a wall boiler on its service frame, the pipes under it.

export const BO = {
  stand: 0.6,
  front: 0.1,
  panel: [0, 1.04, 0.13] as V,
  gas: [-0.2, 0.78, 0.1] as V,
  cover: [0, 1.36, 0.1] as V,
  /** Where its cover stands while it's off, against the frame's leg. */
  coverDown: [0.4, 0.58, 0.22] as V,
  igniter: [0.08, 1.2, 0.0] as V,
  tray: [-0.36, 0.92, 0.3] as V,
  gauge: [0.2, 1.0, 0.12] as V,
  clip: [0.38, 1.04, 0.26] as V,
};
const BOIL_SEQ: Seq = [['read', 2.2], ['gas', 1.5], ['off', 2.2], ['meter', 3.0], ['pull', 2.0], ['swap', 2.4], ['on', 2.2], ['open', 1.3], ['fire', 3.0], ['note', 1.6]];
const BOIL: Script = {
  seq: BOIL_SEQ,
  at: (k) => (k === 'off' || k === 'on' ? st(0.14, BO.stand) : st(0, BO.stand)),
  key(k, u, c): Key {
    const coverAt: V = c.p('on') > 0 ? lerpV(BO.coverDown, BO.cover, c.p('on', 0.1, 0.85)) : lerpV(BO.cover, BO.coverDown, c.p('off', 0.15, 0.85));
    const n = { code: 1 - c.p('fire', 0.1, 0.3), gasOn: 1 - c.p('gas', 0.2, 0.8) + c.p('open', 0.2, 0.8), flame: c.p('fire', 0.25, 0.4), newPart: c.p('swap', 0.3, 0.6), oldGone: c.p('pull', 0.4, 0.7), spark: 0, volts: 0, readout: 0 };
    const props: Record<string, V | null> = { cover: coverAt };
    switch (k) {
      case 'read':
        return { r: add(BO.panel, 0.06 * Math.sin(u * 8), 0.02, 0.02), tap: true, nod: 0.05, props, n };
      case 'gas':
        return { l: add(BO.gas, 0.02, 0.02, 0.02), gl: 0.9, crouch: 0.4, nod: 0.35, props, n };
      case 'off':
      case 'on': {
        const low = sm(k === 'off' ? u : 1 - u, 0.5, 0.95);
        return { l: add(coverAt, -0.17, -0.04, 0.03), r: add(coverAt, 0.17, -0.04, 0.03), gl: 0.85, gr: 0.85, crouch: low * 0.6, nod: 0.2, props, n };
      }
      case 'meter': {
        // The two probes on the igniter's leads, the reading wrong.
        const m = c.bd(0.16, 0.6 * c.H, 0.26);
        return { l: add(m, 0, -0.02, 0.01), gl: 0.8, r: add(BO.igniter, 0.02 * Math.sin(c.t * 2), -0.02, 0.04), gr: 0.75, nod: 0.25, lean: 0.14, props: { ...props, meter: m, probe: add(BO.igniter, 0.02 * Math.sin(c.t * 2), 0, 0.02) }, n: { ...n, volts: 0.2 + 0.05 * Math.sin(c.t * 9), readout: 1 } };
      }
      case 'pull': {
        const h = lerpV(BO.igniter, BO.tray, sm(u, 0.4, 0.95));
        return { r: add(h, 0.02, -0.01, 0.04), gr: 0.85, nod: 0.25, lean: 0.14, props: { ...props, oldPart: u < 0.95 ? h : null }, n };
      }
      case 'swap': {
        const h = lerpV(BO.tray, BO.igniter, sm(u, 0.05, 0.5));
        const wig = u > 0.5 ? 0.012 * Math.sin(c.t * 18) : 0;
        return { r: add(h, 0.02 + wig, -0.01, 0.04), gr: 0.85, l: add(BO.igniter, -0.14, 0.02, 0.06), gl: 0.5, nod: 0.28, lean: 0.14, props: { ...props, newPart: u < 0.5 ? h : null }, n };
      }
      case 'open':
        return { l: add(BO.gas, 0.02, 0.02, 0.02), gl: 0.9, crouch: 0.4, nod: 0.35, props, n };
      case 'fire':
        // A press, a click or two, and the flame's there; a look through its window.
        return { r: add(BO.panel, 0, 0.01, 0.02), tap: u < 0.4, nod: 0.05, lean: 0.04, props, n: { ...n, spark: u < 0.28 ? Math.floor(c.t * 10) % 2 : 0 } };
      case 'note': {
        const clip = c.bd(0.14, 0.64 * c.H, 0.26);
        return { l: add(clip, -0.02, -0.04, 0.02), gl: 0.8, r: add(clip, 0.03 * Math.sin(c.t * 11), 0.03, 0.02), gr: 0.75, nod: 0.32, props: { ...props, clip }, n };
      }
      default:
        return { props, n };
    }
  },
};
const DESIGN_SEQ: Seq = [['gauge', 2.4], ['take', 1.0], ['loop0', 3.2], ['look', 2.0], ['loop1', 3.2], ['sum', 2.6], ['hang', 1.0]];
const DESIGN: Script = {
  seq: DESIGN_SEQ,
  at: () => st(0.1, BO.stand + 0.04),
  key(k, u, c): Key {
    const clip = c.bd(0.14, 0.64 * c.H, 0.28);
    const n = { lines: c.p('loop0', 0, 0.9) + c.p('loop1', 0, 0.9) + c.p('sum', 0.3, 0.9), code: 0, gasOn: 1, flame: 1 };
    const writing = (dx: number): Key => ({ l: add(clip, -0.02, -0.04, 0.02), gl: 0.8, r: add(clip, dx + 0.04 * Math.sin(c.t * 7), 0.03, 0.03 * Math.cos(c.t * 5)), gr: 0.75, nod: 0.34, props: { clip, pen: add(clip, dx + 0.04 * Math.sin(c.t * 7), 0.05, 0.03) }, n });
    switch (k) {
      case 'gauge':
        // The pressure and the flow temperature read off, a finger under each.
        return { r: add(BO.gauge, 0.06 * Math.sin(u * PI * 2) - 0.03, 0.02, 0.03), gr: 0.3, tap: true, nod: 0.12, n };
      case 'take': {
        const h = lerpV(BO.clip, clip, sm(u, 0.1, 0.9));
        return { l: add(h, -0.02, -0.04, 0.02), gl: 0.8, nod: 0.2, props: { clip: h }, n };
      }
      case 'loop0':
        return writing(-0.02);
      case 'loop1':
        return writing(0.03);
      case 'look':
        // Up from the page, along the supply pipes under the boiler.
        return { l: add(clip, -0.02, -0.04, 0.02), gl: 0.8, r: [-0.14, 0.82, 0.24], gr: 0.2, nod: 0.28, props: { clip, pen: null }, n };
      case 'sum':
        return { ...writing(0.06), nod: 0.36 };
      case 'hang': {
        const h = lerpV(clip, BO.clip, sm(u, 0.1, 0.9));
        return { l: add(h, -0.02, -0.04, 0.02), gl: 0.8, nod: 0.2, props: { clip: h }, n };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 누수 실습 벽 (pbLeakWall, 3 × 1): hot and cold mains along a board, branches, valves, gauges and a pump.

export const LW = {
  stand: 0.34,
  z: -0.28,
  hot: 1.66,
  cold: 1.38,
  main: [-1.04, 1.38, -0.2] as V,
  gauge: [-0.68, 1.62, -0.33] as V,
  joints: [[-0.26, 1.02], [0.22, 1.2], [0.78, 1.02]] as Array<[number, number]>,
  bucket: [0.78, 0.0, -0.12] as V,
  /** The stub the test pump couples to. */
  test: [0.8, 0.72, -0.1] as V,
  rag: [1.32, 0.9, 0.08] as V,
  wrench: [1.0, 1.12, -0.38] as V,
  pump: [1.04, 0.0, 0.2] as V,
  bigGauge: [1.04, 1.58, -0.33] as V,
};
const joint = (i: number): V => [LW.joints[i][0], LW.joints[i][1], LW.z + 0.04];
const FIND_SEQ: Seq = [['gauge', 2.0, 0.8], ['shut', 2.2, 1.0], ['j0', 1.8, 0.7], ['j1', 1.8, 0.7], ['j2', 2.2], ['wipe', 1.8], ['tool', 1.0], ['tight', 3.2], ['dry', 1.6, 1.0], ['open', 2.0, 0.8], ['read', 2.2, 0.8]];
const FIND: Script = {
  seq: FIND_SEQ,
  at(k) {
    if (k === 'gauge' || k === 'read') return st(-0.66, LW.stand);
    if (k === 'shut' || k === 'open') return st(-0.92, LW.stand);
    const m = /^j(\d)$/.exec(k);
    if (m) return st(LW.joints[+m[1]][0] - 0.06, LW.stand);
    return st(LW.joints[2][0] - 0.06, LW.stand);
  },
  key(k, u, c): Key {
    const w = joint(2);
    const fixed = c.p('tight', 0.2, 0.95);
    const n = { fixed, shut: c.p('shut', 0.1, 0.9) - c.p('open', 0.1, 0.9), drip: (1 - fixed) * (1 - 0.5 * c.p('shut', 0.1, 0.9)), bar: mixN(mixN(3.4, 0.6, c.p('shut', 0, 0.9)), 3.2, c.p('open', 0.2, 1)), wrA: -0.5, valveA: 0, wet: 1 - c.p('wipe', 0.1, 0.9) * 0.6 - c.p('dry', 0, 0.8) * 0.4 };
    switch (k) {
      case 'gauge':
        return { r: add(LW.gauge, 0.02, -0.06, 0.09), gr: 0.25, tap: true, nod: -0.12, n };
      case 'shut':
      case 'open': {
        // A quarter of a turn... of a wheel valve, hand over hand.
        const o = add(LW.main, 0, 0, 0.1);
        const a = (k === 'shut' ? u : 1 - u) * 5;
        return { r: round(o, 0.06, a), l: round(o, 0.06, a + PI), gl: 0.9, gr: 0.9, nod: 0.08, n: { ...n, valveA: a } };
      }
      case 'j0':
      case 'j1':
      case 'j2': {
        // A hand round the joint, feeling for wet; the head bent in close.
        const j = joint(+k[1]);
        return { r: add(j, 0.05 * Math.sin(c.t * 4), -0.03, 0.09), gr: 0.55, l: add(j, -0.12, 0.05, 0.08), gl: 0.5, nod: 0.18, lean: 0.14, n };
      }
      case 'wipe': {
        const h = scrub(add(w, 0, -0.01, 0.09), c.t, 0.05, 0.04);
        return { r: h, gr: 0.7, l: add(w, -0.16, 0.04, 0.08), gl: 0.7, nod: 0.2, lean: 0.14, props: { rag: add(h, 0, -0.02, -0.02) }, n };
      }
      case 'tool': {
        const e = sm(u, 0, 0.9);
        const toolAt = lerpV(LW.wrench, add(w, 0, 0, 0.06), e);
        return { r: add(toolAt, 0, -0.14, 0.04), gr: 0.9, nod: 0.15, props: { wrench: toolAt }, n };
      }
      case 'tight': {
        const a = -0.2 - 0.7 * Math.abs(Math.sin(u * PI * 3));
        const o = add(w, 0, 0, 0.06);
        return { r: wrenchEnd(o, 0.24, a), gr: 0.95, l: add(w, -0.16, 0.05, 0.08), gl: 0.8, nod: 0.16, lean: 0.14, props: { wrench: o }, n: { ...n, wrA: a } };
      }
      case 'dry': {
        const h = scrub(add(w, 0, -0.04, 0.09), c.t, 0.04, 0.05);
        return { r: h, gr: 0.7, nod: 0.25, lean: 0.14, props: { rag: add(h, 0, -0.02, -0.02) }, n };
      }
      case 'read':
        return { r: add(LW.gauge, 0.02, -0.06, 0.09), gr: 0.25, tap: true, nod: -0.12, l: c.bd(0.2, 0.56 * c.H, 0.1), n };
      default:
        return { n };
    }
  },
};
const PRESSURE_SEQ: Seq = [['hook', 2.4], ['pump', 5.0], ['watch', 3.0], ['tick', 2.2], ['bleed', 2.4], ['unhook', 1.6]];
const PRESSURE: Script = {
  seq: PRESSURE_SEQ,
  at: () => st(LW.pump[0] - 0.08, LW.stand + 0.1),
  key(k, u, c): Key {
    const lever = add(LW.pump, 0.02, 0.86, 0.02);
    const bar = mixN(0, 10, c.p('pump', 0, 0.95)) * (1 - c.p('bleed', 0.1, 0.9));
    const n = { bar, hose: c.p('hook', 0.4, 0.8) - c.p('unhook', 0.3, 0.8), lev: 0, ok: c.p('tick', 0.3, 0.6) - c.p('bleed', 0, 0.2) };
    switch (k) {
      case 'hook': {
        // The coupling pushed on the test point, a low crouch.
        const h = lerpV(add(LW.pump, -0.12, 0.5, 0.02), LW.test, sm(u, 0.1, 0.8));
        return { l: add(h, 0, 0, 0.03), gl: 0.9, crouch: 0.4, nod: 0.3, n };
      }
      case 'pump': {
        // Two hands on the lever, down from the shoulders.
        const d = Math.abs(Math.sin(c.t * 2.6));
        return { l: add(lever, -0.06, -0.26 * d, 0), r: add(lever, 0.06, -0.26 * d, 0), gl: 0.95, gr: 0.95, crouch: 0.25 * d, nod: 0.25, lean: 0.2 * d, n: { ...n, lev: d } };
      }
      case 'watch':
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: add(LW.bigGauge, -0.05, -0.08, 0.1), gr: 0.25, tap: true, nod: -0.1, n };
      case 'tick': {
        const clip = c.bd(0.14, 0.64 * c.H, 0.26);
        return { l: add(clip, -0.02, -0.04, 0.02), gl: 0.8, r: add(clip, 0.03 * Math.sin(c.t * 11), 0.03, 0.02), gr: 0.75, nod: 0.32, props: { clip }, n };
      }
      case 'bleed':
        return { r: add(LW.pump, 0.14, 0.42, 0.04), gr: 0.9, crouch: 0.65, nod: 0.35, n: { ...n, hiss: 1 } };
      case 'unhook':
        return { l: add(LW.test, 0, 0, 0.03), gl: 0.9, crouch: 0.4, nod: 0.3, n };
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 배수 실습대 (pbDrainRig, 2 × 1): a clear drain run with a clog in it, a spring machine, a camera and monitor.

export const DR = {
  stand: 0.64,
  y: 0.54,
  z: 0.02,
  mouth: 0.6,
  clog: -0.26,
  /** How far the spring or the camera gets. */
  end: -0.72,
  cap: [0.62, 0.54, 0.02] as V,
  capOff: [0.46, 0.27, 0.3] as V,
  drum: [0.78, 0.3, 0.26] as V,
  feed: [0.5, 0.62, 0.3] as V,
  bin: [0.24, 0.2, 0.32] as V,
  tap: [-0.8, 1.26, 0.04] as V,
  monitor: [-0.08, 1.14, -0.14] as V,
};
const headAt = (x: number): V => [x, DR.y, DR.z];
const SNAKE_SEQ: Seq = [['cap', 1.9], ['feed', 3.4], ['spin', 3.6], ['pull', 3.0], ['muck', 1.5], ['flush', 3.0, 0.9], ['capon', 1.8, 0.8]];
const SNAKE: Script = {
  seq: SNAKE_SEQ,
  at: (k) => (k === 'flush' ? st(-0.66, DR.stand - 0.14) : st(0.42, DR.stand)),
  key(k, u, c): Key {
    const x = mixN(DR.mouth, DR.clog + 0.04, c.p('feed', 0, 0.95)) + mixN(0, DR.mouth - DR.clog - 0.04, c.p('pull', 0, 0.95)) + (k === 'spin' ? -0.05 * sm(u, 0, 0.7) : 0);
    const capOn = c.p('cap', 0.1, 0.5) - c.p('capon', 0.4, 0.9);
    const n = { head: x, capOff: capOn, spin: k === 'spin' ? 1 : 0, clog: 1 - c.p('spin', 0.5, 1), muck: c.p('spin', 0.5, 1) - c.p('muck', 0.3, 0.9), water: k === 'flush' ? sm(u, 0.1, 0.3) * (1 - sm(u, 0.8, 1)) : 0, cable: c.p('cap', 0.8, 1) - c.p('muck', 0.8, 1), full: 1 - c.p('flush', 0.2, 0.9), binUse: c.p('muck', 0.4, 0.8) };
    const feedHand = (dy: number): V => add(DR.feed, 0.04 * Math.sin(c.t * 5), dy, 0);
    const capAt = lerpV(DR.cap, DR.capOff, c.p('cap', 0.1, 0.5));
    switch (k) {
      case 'cap':
        return { r: add(lerpV(DR.cap, DR.capOff, sm(u, 0.1, 0.55)), 0.03, 0.02, 0.05), gr: 0.9, l: add(DR.cap, -0.12, 0.03, 0.03), gl: 0.7, crouch: 0.75, nod: 0.4, props: { cap: capAt }, n };
      case 'feed':
        // Hand over hand into the mouth.
        return { r: feedHand(0), l: add(DR.feed, -0.14 + 0.1 * Math.abs(Math.sin(c.t * 2.5)), -0.02, 0), gl: 0.85, gr: 0.85, crouch: 0.6, nod: 0.36, props: { cap: DR.capOff }, n };
      case 'spin':
        // The machine on, leaned into, a hard shake when it bites.
        return { r: feedHand(0.015 * Math.sin(c.t * 34)), l: add(DR.feed, -0.14, -0.02 + 0.015 * Math.sin(c.t * 31), 0), gl: 0.95, gr: 0.95, crouch: 0.55, nod: 0.34, lean: 0.14, props: { cap: DR.capOff }, n };
      case 'pull':
        return { r: add(DR.feed, 0.1 * Math.abs(Math.sin(c.t * 2.5)), 0.06, 0.02), l: add(DR.feed, -0.14, 0.02, 0), gl: 0.85, gr: 0.85, crouch: 0.5, nod: 0.32, props: { cap: DR.capOff }, n };
      case 'muck': {
        // What came out, wiped into the bin.
        const h = lerpV(add(headAt(DR.mouth), -0.02, 0.02, 0.04), add(DR.bin, 0, 0.16, 0), sm(u, 0.1, 0.8));
        return { r: h, gr: 0.75, crouch: 0.75, nod: 0.42, props: { cap: DR.capOff, gunk: u < 0.75 ? add(h, -0.01, -0.03, -0.02) : null }, n };
      }
      case 'flush': {
        // The tap at the top of the stack; water down the clear pipe, and away.
        const a = sm(u, 0, 0.2) - sm(u, 0.82, 1);
        return { l: add(DR.tap, 0.02, 0.01 + 0.03 * a, 0.03), gl: 0.8, nod: 0.26, r: c.bd(-0.24, 0.56 * c.H, 0.1), props: { cap: DR.capOff }, n };
      }
      case 'capon': {
        const h = lerpV(DR.capOff, DR.cap, sm(u, 0.1, 0.7));
        return { r: add(h, 0.03 + 0.01 * Math.sin(c.t * 15) * sm(u, 0.7, 0.8), 0.02, 0.05), gr: 0.9, crouch: 0.75, nod: 0.4, props: { cap: h }, n };
      }
      default:
        return { n };
    }
  },
};
const CAMERA_SEQ: Seq = [['screen', 1.8, 0.7], ['cap', 1.5], ['push', 4.2, 0.7], ['look', 3.0], ['mark', 2.0], ['pull', 3.0, 0.7], ['capon', 1.5]];
const CAMERA: Script = {
  seq: CAMERA_SEQ,
  at: (k) => (k === 'screen' || k === 'look' || k === 'mark' ? st(-0.08, DR.stand - 0.14) : st(0.42, DR.stand)),
  key(k, u, c): Key {
    const x = mixN(DR.mouth, DR.end + 0.08, c.p('push', 0, 0.95) ) + mixN(0, DR.mouth - DR.end - 0.08, c.p('pull', 0, 0.95));
    const depth = c.p('push', 0, 0.95) - c.p('pull', 0, 0.95);
    const n = { cam: x, camOn: c.p('screen', 0.2, 0.4), depth, capOff: c.p('cap', 0.1, 0.5) - c.p('capon', 0.4, 0.9), crack: c.p('push', 0.72, 0.9) - c.p('pull', 0, 0.1), found: c.p('mark', 0.1, 0.5), cable: c.p('cap', 0.9, 1) - c.p('capon', 0, 0.1), clog: 0, full: 0 };
    const capAt = lerpV(DR.cap, DR.capOff, c.p('cap', 0.1, 0.5));
    switch (k) {
      case 'screen':
        return { r: add(DR.monitor, 0.2, -0.13, 0.08), tap: true, nod: 0.05, props: { cap: DR.cap }, n };
      case 'cap':
        return { r: add(lerpV(DR.cap, DR.capOff, sm(u, 0.1, 0.55)), 0.03, 0.02, 0.05), gr: 0.9, crouch: 0.75, nod: 0.4, props: { cap: capAt }, n };
      case 'push':
        return { r: add(DR.feed, 0.04 * Math.sin(c.t * 4), 0, 0), l: add(DR.feed, -0.14 + 0.1 * Math.abs(Math.sin(c.t * 2)), -0.02, 0), gl: 0.85, gr: 0.85, crouch: 0.6, nod: 0.3, props: { cap: DR.capOff }, n };
      case 'look':
        // Hands on knees, reading the picture.
        return { l: c.bd(0.14, 0.4 * c.H, 0.16), r: add(DR.monitor, 0.12 * Math.sin(u * PI * 2), 0.0, 0.1), gr: 0.25, gl: 0.5, tap: true, nod: 0.08, lean: 0.14, props: { cap: DR.capOff }, n };
      case 'mark':
        return { r: add(DR.monitor, 0.2, -0.13, 0.08), tap: true, nod: 0.08, props: { cap: DR.capOff }, n };
      case 'pull':
        return { r: add(DR.feed, 0.1 * Math.abs(Math.sin(c.t * 2.5)), 0.06, 0.02), l: add(DR.feed, -0.14, 0.02, 0), gl: 0.85, gr: 0.85, crouch: 0.5, nod: 0.3, props: { cap: DR.capOff }, n };
      case 'capon': {
        const h = lerpV(DR.capOff, DR.cap, sm(u, 0.1, 0.7));
        return { r: add(h, 0.03, 0.02, 0.05), gr: 0.9, crouch: 0.75, nod: 0.4, props: { cap: h }, n };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 위생기구 실습대 (pbFixtureRig, 2 × 1): a tiled corner with this workplace's own training toilet (right) and
// wall basin (left). Nothing here is the house's toilet or sink.

export const FX = {
  /** The basin's side. */
  basin: [-0.48, 0.84, -0.17] as V,
  tapHead: [-0.48, 1.0, -0.24] as V,
  stand: 0.3,
  valve: [-0.62, 0.46, -0.26] as V,
  trap: [-0.48, 0.42, -0.2] as V,
  under: [-0.42, 0.66, -0.18] as V,
  /** The toilet's. */
  tank: [0.46, 0.8, -0.3] as V,
  lidOff: [0.46, 0.46, 0.0] as V,
  float: [0.5, 0.8, -0.3] as V,
  shut: [0.24, 0.3, -0.36] as V,
  lever: [0.27, 0.78, -0.18] as V,
  bowl: [0.46, 0.44, 0.02] as V,
  box: [0.84, 0.2, 0.3] as V,
};
const TOILET_SEQ: Seq = [['lid', 1.8, 0.6], ['shut', 1.6, 0.6], ['in', 2.8], ['out', 1.8], ['new', 2.8], ['open', 1.5, 0.6], ['fill', 2.8], ['flush', 3.2], ['lidon', 1.7]];
const TOILET: Script = {
  seq: TOILET_SEQ,
  // Up to the bowl and over it for the tank; round its side and down for the valve in the wall.
  at: (k) => (k === 'shut' || k === 'open' ? st(0.06, 0.1, PI - 0.3) : st(FX.tank[0], 0.36)),
  key(k, u, c): Key {
    const lidAt = c.p('lidon') > 0 ? lerpV(FX.lidOff, add(FX.tank, 0, 0.1, 0), c.p('lidon', 0.1, 0.85)) : lerpV(add(FX.tank, 0, 0.1, 0), FX.lidOff, c.p('lid', 0.1, 0.85));
        const n = { water: k === 'fill' ? u : k === 'flush' ? 1 - sm(u, 0.1, 0.4) + sm(u, 0.55, 1) : k === 'lidon' ? 1 : 1 - c.p('in', 0, 0.2), newV: c.p('new', 0.4, 0.7), swirl: k === 'flush' ? Math.sin(u * PI) : 0, valveOpen: 1 - c.p('shut', 0.2, 0.8) + c.p('open', 0.2, 0.8), fl: k === 'flush' ? 1 : 0 };
    const props: Record<string, V | null> = { lid: lidAt };
    switch (k) {
      case 'lid':
        return { l: add(lidAt, -0.15, 0.02, 0.02), r: add(lidAt, 0.15, 0.02, 0.02), gl: 0.85, gr: 0.85, nod: 0.3, lean: 0.24, props, n };
      case 'shut':
      case 'open':
        return { r: add(FX.shut, 0.02, 0.02, 0.04), gr: 0.9, crouch: 0.85, nod: 0.45, props, n };
      case 'in':
        // Hands in the tank, unscrewing.
        return { r: add(FX.float, 0.02 * Math.sin(c.t * 9), 0.06, 0.02), gr: 0.85, l: add(FX.tank, -0.14, 0.08, 0.02), gl: 0.6, nod: 0.38, lean: 0.26, props, n };
      case 'out': {
        const h = lerpV(FX.float, FX.box, sm(u, 0.2, 0.9));
        return { r: add(h, 0.02, 0.05, 0.02), gr: 0.85, crouch: sm(u, 0.4, 0.9) * 0.75, nod: 0.38, lean: 0.14, props: { ...props, old: u < 0.9 ? h : null }, n };
      }
      case 'new': {
        const h = lerpV(FX.box, FX.float, sm(u, 0.05, 0.45));
        const wig = u > 0.45 ? 0.016 * Math.sin(c.t * 12) : 0;
        return { r: add(h, 0.02 + wig, 0.05, 0.02), gr: 0.85, l: add(FX.tank, -0.14, 0.08, 0.02), gl: 0.6, crouch: (1 - sm(u, 0, 0.35)) * 0.75, nod: 0.36, lean: 0.18, props: { ...props, nv: u < 0.45 ? h : null }, n };
      }
      case 'fill':
        return { r: add(FX.tank, 0.1, 0.12, 0.05), gr: 0.25, nod: 0.36, lean: 0.14, props, n };
      case 'flush':
        return { r: add(FX.lever, 0, -0.03 * Math.sin(u * PI) * (u < 0.3 ? 1 : 0), 0.04), gr: 0.8, nod: 0.3, lean: 0.12, props, n };
      case 'lidon':
        return { l: add(lidAt, -0.15, 0.02, 0.02), r: add(lidAt, 0.15, 0.02, 0.02), gl: 0.85, gr: 0.85, nod: 0.3, lean: 0.14, props, n };
      default:
        return { props, n };
    }
  },
};
const FAUCET_SEQ: Seq = [['drip', 2.0], ['shut', 1.7], ['nut', 2.8], ['up', 0.8, 0.7], ['pull', 2.2], ['seat', 2.4], ['open', 1.4, 0.7], ['run', 3.2], ['trap', 2.6, 0.7]];
const FAUCET: Script = {
  seq: FAUCET_SEQ,
  at: (k) => (k === 'shut' || k === 'nut' || k === 'open' || k === 'trap' ? st(-0.42, FX.stand) : st(-0.48, FX.stand)),
  key(k, u, c): Key {
    const lever: V = add(FX.tapHead, 0, 0.12, 0.02);
    const n = { dripping: 1 - c.p('shut', 0.3, 0.8), on: k === 'run' ? sm(u, 0.05, 0.15) - sm(u, 0.88, 0.98) : 0, leverUp: k === 'run' ? sm(u, 0, 0.12) - sm(u, 0.85, 0.98) : 0, leverSwing: k === 'run' ? Math.sin(u * PI * 2) * sm(u, 0.25, 0.4) * (1 - sm(u, 0.75, 0.85)) : 0, off: c.p('pull', 0.1, 0.5) - c.p('seat', 0.5, 0.9), newCart: c.p('seat', 0.4, 0.6), wrA: -0.6 };
    switch (k) {
      case 'drip': {
        // A finger under the spout; the lever tried.
        return { r: add(lever, 0, 0, 0.02), gr: 0.8, l: add(FX.tapHead, 0, -0.08, 0.14), gl: 0.25, nod: 0.3, lean: 0.1, n };
      }
      case 'shut':
      case 'open':
        return { l: add(FX.valve, 0.02, 0.02, 0.05), gl: 0.9, crouch: 0.85, nod: 0.45, n };
      case 'nut': {
        // Under the basin with the wrench.
        const a = -0.3 - 0.6 * Math.abs(Math.sin(u * PI * 3));
        const o: V = [FX.under[0], FX.under[1], FX.under[2]];
        return { r: wrenchEnd(o, 0.2, a), gr: 0.95, crouch: 0.85, nod: 0.5, lean: 0.25, props: { wrench: o }, n: { ...n, wrA: a } };
      }
      case 'up':
        return { nod: 0.2, n };
      case 'pull': {
        const h = add(FX.tapHead, 0, 0.1 + 0.16 * sm(u, 0.3, 0.8), 0.04);
        return { r: h, gr: 0.85, l: add(FX.tapHead, -0.06, 0.02, 0.06), gl: 0.8, nod: 0.3, lean: 0.12, props: { oldC: u > 0.25 ? add(h, 0, -0.02, -0.02) : null }, n };
      }
      case 'seat': {
        const h = lerpV(add(FX.tapHead, 0.26, 0.2, 0.08), add(FX.tapHead, 0, 0.1, 0.04), sm(u, 0.05, 0.5));
        return { r: add(h, 0.012 * Math.sin(c.t * 16), 0, 0), gr: 0.85, l: add(FX.tapHead, -0.06, 0.02, 0.06), gl: 0.8, nod: 0.3, lean: 0.12, props: { newC: u < 0.55 ? add(h, 0, -0.02, -0.02) : null }, n };
      }
      case 'run': {
        // Up, full on, hot and cold, a palm under it.
        return { r: add(lever, 0.05 * n.leverSwing, 0.05 * n.leverUp, 0.02), gr: 0.8, l: add(FX.tapHead, 0, -0.12, 0.16), gl: 0.2, palms: 0.9, nod: 0.3, lean: 0.1, n };
      }
      case 'trap': {
        // A dry hand round the trap: no leak.
        return { r: add(scrub(FX.trap, c.t, 0.03, 0.03), 0.02, 0.03, 0.08), gr: 0.55, crouch: 0.9, nod: 0.5, lean: 0.25, n };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 부품 카운터 (pbCounter, 3 × 1, set with its front to the staff side): the customer on the far side (−z).

export const PC = {
  stand: 0.6,
  top: 0.96,
  drawer: [-0.86, 0.56, 0.36] as V,
  book: [-0.28, 0.98, 0.14] as V,
  pos: [0.6, 1.0, 0.1] as V,
  mid: [0.05, 1.0, 0.0] as V,
  terminal: [0.72, 1.02, -0.2] as V,
  cust: [0.1, -0.88] as [number, number],
  bags: [1.12, 0.98, 0.16] as V,
};
const SERVE_SEQ: Seq = [['wait', 1.0], ['greet', 1.6], ['show', 2.2], ['look', 2.4], ['book', 2.8, 0.8], ['drawer', 2.6, 0.8], ['compare', 2.6], ['bag', 2.0, 0.7], ['pay', 2.6], ['hand', 1.6, 0.6], ['thanks', 1.7], ['gone', 1.0]];
const SERVE: Script = {
  seq: SERVE_SEQ,
  at(k) {
    if (k === 'book') return st(-0.28, PC.stand);
    if (k === 'drawer') return st(-0.76, PC.stand + 0.08);
    if (k === 'pay' || k === 'bag') return st(0.62, PC.stand);
    return st(0.06, PC.stand);
  },
  key(k, u, c): Key {
    const midL = add(PC.mid, -0.1, 0, 0);
    const n = { cust: c.p('greet', 0, 0.5) - c.p('gone', 0, 1), pages: 0, drawer: 0, paid: c.p('pay', 0.6, 0.75), cTap: 0, cBow: 0, cGive: c.p('show', 0, 0.5), cTake: c.p('hand', 0.4, 0.8) };
    // The worn-out part: from the customer's hand onto the counter, and thereafter the mid-counter's.
    const broke = lerpV([PC.mid[0] - 0.1, 1.08, -0.42], midL, c.p('show', 0.1, 0.8));
    const props: Record<string, V | null> = { broke: c.p('bag', 0.4, 0.5) < 1 && c.p('show', 0, 0.1) > 0 ? broke : null };
    switch (k) {
      case 'wait':
        return { l: c.bd(0.22, 0.56 * c.H, 0.08), r: c.bd(-0.22, 0.56 * c.H, 0.08), nod: 0.1, n };
      case 'greet':
        return { nod: u < 0.5 ? 0.3 : 0.05, lean: u < 0.5 ? 0.13 : 0.03, n };
      case 'show':
        return { nod: 0.25, l: c.bd(0.22, 0.56 * c.H, 0.08), props, n };
      case 'look': {
        // Picked up, turned over under the light.
        const h = lerpV(midL, c.bd(0.04, 0.68 * c.H, 0.3), sm(u, 0.05, 0.3) * (1 - sm(u, 0.82, 1)));
        return { l: add(h, -0.03, -0.02, 0.03), gl: 0.8, r: add(h, 0.05, 0.03, 0.03), gr: 0.4, nod: 0.2, props: { ...props, broke: h }, n: { ...n, turn: c.t * 2 } };
      }
      case 'book':
        return { l: add(PC.book, -0.1, 0.03, 0.05), gl: 0.5, r: add(PC.book, 0.1 - 0.2 * frac(u * 3), 0.05 * Math.sin(frac(u * 3) * PI) + 0.02, 0.05), gr: 0.5, nod: 0.42, lean: 0.12, props, n: { ...n, pages: 1 + Math.floor(u * 3) } };
      case 'drawer': {
        // Down to the numbered drawer; a part out of it.
        const open = sm(u, 0.1, 0.35) * (1 - sm(u, 0.75, 0.95));
        const inIt = add(PC.drawer, 0, 0.04, 0.12 * open);
        const h = lerpV(inIt, c.bd(-0.14, 0.62 * c.H, 0.26), sm(u, 0.55, 1));
        return { r: u < 0.55 ? add(inIt, 0.02, 0.02, 0.04) : h, gr: 0.75, crouch: u < 0.6 ? 0.8 : 0, nod: 0.45, props: { ...props, fresh: u > 0.5 ? h : null }, n: { ...n, drawer: open } };
      }
      case 'compare': {
        // The new one beside the old, thread to thread, on show to the customer.
        const a: V = [PC.mid[0] - 0.05, 1.18, -0.04];
        const b: V = [PC.mid[0] + 0.07, 1.18, -0.04];
        return { l: add(a, -0.03, -0.03, 0.04), r: add(b, 0.03, -0.03, 0.04), gl: 0.8, gr: 0.8, nod: 0.12, props: { ...props, broke: a, fresh: b }, n: { ...n, cBow: 0.3 } };
      }
      case 'bag': {
        // A little paper bag from the pile, the part in, folded.
        const bag: V = add(PC.pos, -0.3, -0.02, 0.0);
        return { l: add(bag, -0.07, 0.1, 0.03), gl: 0.75, r: add(bag, 0.02, 0.14 - 0.06 * Math.sin(u * PI * 2), 0.03), gr: 0.75, nod: 0.38, lean: 0.1, props: { ...props, bag, fresh: u < 0.45 ? add(bag, 0.01, 0.14, 0) : null }, n };
      }
      case 'pay':
        return { r: add(PC.pos, 0.06 * Math.sin(u * 20), -0.02, 0.05), tap: true, nod: 0.3, l: add(PC.pos, -0.3, 0.06, 0.03), gl: 0.5, props: { bag: add(PC.pos, -0.3, -0.02, 0) }, n: { ...n, cTap: Math.sin(u * PI) } };
      case 'hand': {
        const bag = lerpV(add(PC.pos, -0.3, -0.02, 0), [PC.mid[0] + 0.02, 1.0, -0.14], sm(u, 0.05, 0.6));
        return { r: add(bag, 0.04, 0.1, 0.04), gr: 0.8, nod: 0.2, lean: 0.14, props: { bag: u < 0.8 ? bag : null }, n };
      }
      case 'thanks':
        return { nod: 0.32 * Math.sin(u * PI), lean: 0.2 * Math.sin(u * PI), n: { ...n, cBow: Math.sin(u * PI) } };
      default:
        return { nod: 0.05, n };
    }
  },
};

// =============================================================================================
// 출장 차량 (plumbingVan, 2 × 1): cab to the right, a sliding door on its near side.

export const VN = {
  stand: 0.86,
  floor: 0.68,
  /** The sliding door's middle, shut and run back along the body; its handle, shut. */
  doorShut: -0.02,
  doorOpen: -0.66,
  handle: [0.26, 1.02, 0.47] as V,
  sheet: [0.5, 0.88, 0.62] as V,
  box: [-0.72, 0.26, 0.74] as V,
  boxIn: [-0.06, 0.78, 0.16] as V,
  pipe: [-0.2, 0.14, 0.96] as V,
  pipeIn: [-0.3, 1.14, 0.1] as V,
};
const LOAD_SEQ: Seq = [['sheet', 2.0], ['door', 1.5, 0.7], ['box', 1.6, 0.7], ['in', 1.4, 0.7], ['pipe', 1.8, 0.7], ['slide', 1.6, 0.6], ['strap', 2.2], ['tick', 2.0], ['shut', 1.5]];
const LOAD: Script = {
  seq: LOAD_SEQ,
  at: (k) => (k === 'box' ? st(-0.6, VN.stand + 0.12) : k === 'pipe' ? st(-0.2, VN.stand + 0.38) : st(-0.06, VN.stand - 0.1)),
  key(k, u, c): Key {
    const n = { open: c.p('door', 0.1, 0.9) - c.p('shut', 0.1, 0.9), boxIn: c.p('in', 0.9, 0.95), pipeIn: c.p('slide', 0.9, 0.95), strap: c.p('strap', 0.3, 0.9), ticks: Math.round(c.p('in') + c.p('slide') + c.p('tick')) };
    const clip = c.bd(0.14, 0.64 * c.H, 0.26);
    const holding: Partial<Key> = { l: add(clip, -0.02, -0.04, 0.02), gl: 0.8 };
    switch (k) {
      case 'sheet':
        return { ...holding, r: add(clip, 0.03 * Math.sin(c.t * 8), 0.03, 0.02), gr: 0.75, nod: 0.32, props: { clip }, n };
      case 'door':
      case 'shut': {
        const e = k === 'door' ? sm(u, 0.1, 0.9) : 1 - sm(u, 0.1, 0.9);
        return { r: add(VN.handle, (VN.doorOpen - VN.doorShut) * e, 0, 0), gr: 0.85, nod: 0.1, n };
      }
      case 'box': {
        // Up off the stool by its handle.
        const b = lerpV(VN.box, add(VN.box, 0.14, 0.34, -0.06), sm(u, 0.25, 0.95));
        return { r: add(b, 0.03, 0.2, 0.01), gr: 0.9, l: add(b, -0.14, 0.12, 0.08), gl: 0.5, crouch: 0.75 * (1 - sm(u, 0.4, 0.95)), nod: 0.35, props: { box: b }, n };
      }
      case 'in': {
        const b = lerpV(add(VN.box, 0.14, 0.34, -0.06), VN.boxIn, sm(u, 0.05, 0.9));
        return { r: add(b, 0.03, 0.2, 0.01), gr: 0.9, l: add(b, -0.14, 0.12, 0.08), gl: 0.5, nod: 0.3, lean: 0.14, props: { box: u < 0.93 ? b : null }, n };
      }
      case 'pipe': {
        // A length off the ground.
        const p = lerpV(VN.pipe, add(VN.pipe, 0.1, 0.92, 0), sm(u, 0.25, 0.95));
        return { l: add(p, -0.24, 0.03, 0.03), r: add(p, 0.24, 0.03, 0.03), gl: 0.85, gr: 0.85, crouch: 0.85 * (1 - sm(u, 0.3, 0.95)), nod: 0.35, props: { pipe: p }, n };
      }
      case 'slide': {
        // Onto the rack inside.
        const p = lerpV(add(VN.pipe, 0.1, 0.92, 0), VN.pipeIn, sm(u, 0.05, 0.9));
        return { l: add(p, -0.24, 0.03, 0.03), r: add(p, 0.24, 0.03, 0.03), gl: 0.85, gr: 0.85, nod: 0.2, lean: 0.14, props: { pipe: u < 0.93 ? p : null }, n };
      }
      case 'strap': {
        // A strap pulled across the load and ratcheted.
        const h: V = [0.02, 1.08 - 0.12 * sm(u, 0.1, 0.6), 0.26];
        return { r: add(h, 0, 0.02 * Math.sin(c.t * 12), 0), gr: 0.9, l: add(h, -0.26, 0.14, 0), gl: 0.85, nod: 0.2, lean: 0.14, n };
      }
      case 'tick':
        return { ...holding, r: add(clip, 0.03 * Math.sin(c.t * 8), 0.03, 0.02), gr: 0.75, nod: 0.32, props: { clip }, n };
      default:
        return { n };
    }
  },
};

const SCRIPTS: Record<PbMotion, Script> = {
  pbCut: CUT, pbLearn: LEARN, pbThread: THREAD, pbPick: PICK, pbListen: LISTEN, pbExplain: EXPLAIN, pbBoil: BOIL, pbDesign: DESIGN, pbFind: FIND, pbPressure: PRESSURE, pbSnake: SNAKE, pbCamera: CAMERA, pbToilet: TOILET, pbFaucet: FAUCET, pbServe: SERVE, pbLoad: LOAD,
};
