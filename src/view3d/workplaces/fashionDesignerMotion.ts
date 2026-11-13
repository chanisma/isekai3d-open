import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 패션 아틀리에, under the made-up label 결 (2026-11-01). Each motion is a round of beats: where the dweller is, where the
 * hands go, what moves. The piece reads the same script by the same clock (fashionDesigner.ts), so the seam runs under the needle,
 * the chalk line follows the chalk, the pins stay where they went in and the sketch develops under the pencil.
 *
 * - 재봉틀 (sewingMachine): fdSew pieces fed under the needle, pivoted at the corner, the thread snipped, held up. fdAlter an old seam picked out and sewn again.
 * - 재단대 (fabricTable): fdCut paper pattern laid, chalked round, lifted, cut with the shears, the piece taken off. fdPattern a pattern drafted with a square.
 * - 드로잉 테이블 (fdDrawingTable): fdSketch a design from first lines to colour. fdOwnLine the same, the swatch pinned on and signed. fdSales the season's chart gone through.
 * - 드레이핑 폼 (fdDressForm): fdDrape cloth over the form, pinned, chalked, the hem trimmed. fdCouture the same in silk.
 * - 스팀 프레스 (fdSteamPress): fdPress the head down on a garment, steam, vacuum, turned, again. fdIron a seam on the sleeve board with the hand iron.
 * - 원단 랙 (fdFabricRack): fdPick a bolt pulled, unrolled on the ledge, a swatch to the light, the bolt back.
 * - 가봉 코너 (fdFittingCorner): fdFitMeasure shoulder and sleeve with the tape. fdFitPin the basted sleeve pinned, the cuff chalked, a look in the mirror.
 *   Only the shoulders and arms are ever touched, and the client is a grown-up.
 * - 쇼 레일 (fdShowRail): fdLook a look slid out, its tag read, lint rolled off, a card written.
 * - 런웨이 (runway): fdWalk the walk tried for oneself. fdShow the alarm's rehearsal, cueing two models. fdCollection the season's direction talked through.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type FdMotion = 'fdSew' | 'fdAlter' | 'fdCut' | 'fdPattern' | 'fdSketch' | 'fdOwnLine' | 'fdSales' | 'fdDrape' | 'fdCouture' | 'fdPress' | 'fdIron' | 'fdPick' | 'fdFitMeasure' | 'fdFitPin' | 'fdLook' | 'fdWalk' | 'fdShow' | 'fdCollection';
export const FD_MOTIONS = new Set<string>(['fdSew', 'fdAlter', 'fdCut', 'fdPattern', 'fdSketch', 'fdOwnLine', 'fdSales', 'fdDrape', 'fdCouture', 'fdPress', 'fdIron', 'fdPick', 'fdFitMeasure', 'fdFitPin', 'fdLook', 'fdWalk', 'fdShow', 'fdCollection']);
export type FdTool = 'pencil' | 'shears' | 'chalk' | 'pin' | 'tape' | 'tapeArm' | 'snips' | 'ripper' | 'iron' | 'bolt' | 'swatch' | 'roller' | 'clip';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const fdPhase = (p: THREE.Vector3) => frac(p.x * 0.413 + p.z * 0.587);
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
export const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;
/** Along a broken line, 0 to 1, each stretch getting its share by length. */
export function along(path: readonly V[], u: number): V {
  const k = Math.max(0, Math.min(1, u));
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
  let left = k * total;
  for (let i = 1; i < path.length; i++) {
    const L = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
    if (left <= L && L > 0) return lerpV(path[i - 1], path[i], left / L);
    left -= L;
  }
  return path[path.length - 1];
}

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
const st = (x: number, z: number, yaw = PI, y = 0): St => ({ x, y, z, yaw });
const sat = (s: V, yaw = PI): St => ({ x: s[0], y: s[1], z: s[2], yaw, sit: true });
interface Key {
  l?: V;
  r?: V;
  lean?: number;
  nod?: number;
  palms?: number;
  gl?: number;
  gr?: number;
  tap?: boolean;
  tool?: FdTool;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  /** Which round this is, for what changes round to round. */
  round: number;
  bd(side: number, up: number, ahead: number): V;
  /** How far on a beat is: 0 before it, 1 after it. */
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface FdNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: FdTool | null;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number, round: number): { st: St; key: Key } {
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), tap: e < 0.5 ? a.tap : b.tap };
}
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function fdNow(m: FdMotion, t: number, ph: number, H = 1.6): FdNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.n) : A;
  const e = b.e;
  const nearer = e < 0.5 ? A.st : B.st;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: nearer.sit };
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
export function fdPose(m: FdMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = fdNow(m, t, fdPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
    },
  };
}
const easy = (c: Ctx): Key => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const chin = (c: Ctx): V => c.bd(-0.04, 0.84 * c.H + (c.st.sit ? -0.72 : 0), 0.15);

/** How far a pencil's or ripper's grip stands from its point. */
export const PEN_UP = 0.075;
/** The way a pen's point goes from the hand, on a flat table (the dweller facing -z). */
export const PEN_DIR: V = [-0.13, -0.92, -0.37];
/** The same on the tilted drawing board. */
export const PEN_DIR_TILT: V = [-0.13, -0.82, -0.56];
const penGrip = (tip: V, dir: V = PEN_DIR): V => [tip[0] - dir[0] * PEN_UP, tip[1] - dir[1] * PEN_UP, tip[2] - dir[2] * PEN_UP];
/** Shears: from the bows to the pivot, and how high the bows ride above what's being cut. */
export const SHEAR_REACH = 0.1;
export const SHEAR_UP = 0.03;
/** The tool's turn about y for a cut going (dx, dz): its blades point along -z when it's 0. */
const yawOf = (a: V, b: V) => Math.atan2(-(b[0] - a[0]), -(b[2] - a[2]));

// =============================================================================================
// 재봉틀 (sewingMachine, 1 × 1): an industrial head let into a table, seated close. The cloth is fed away under the needle.

export const SM = {
  seat: [0, 0.47, 0.62] as V,
  top: 0.74,
  /** Where the needle meets the plate. */
  needle: [-0.1, 0.752, 0.04] as V,
  pile: [0.34, 0.76, 0.27] as V,
  done: [-0.36, 0.76, 0.27] as V,
  lever: [0.1, 0.87, 0.06] as V,
  rest: [0.27, 0.76, 0.24] as V,
  /** The seam's two legs in the cloth's own frame (u across, v towards the sewer), and where it starts. */
  u0: -0.12,
  v0: -0.16,
  leg1: 0.24,
  leg2: 0.22,
};
const onCloth = (c: Ctx, wob = 0.008): { l: V; r: V } => ({
  l: [SM.needle[0] - 0.14 + wob * Math.sin(c.t * 1.9), SM.top + 0.045, 0.23],
  r: [SM.needle[0] + 0.14, SM.top + 0.045, 0.23 + wob * Math.cos(c.t * 2.3)],
});
const holdUp = (c: Ctx): { l: V; r: V; at: V } => ({ l: c.bd(0.17, 0.47 + 0.52, 0.3), r: c.bd(-0.17, 0.47 + 0.52, 0.3), at: c.bd(0, 0.47 + 0.42, 0.3) });
const SEW: Script = {
  seq: [['take', 1.4], ['align', 1.5], ['run', 5], ['pivot', 1.6], ['run2', 4.4], ['snip', 1.6], ['up', 2.4], ['stack', 1.2]],
  at: () => sat(SM.seat),
  key(k, u, c) {
    const up = c.p('up', 0, 0.35) * (1 - c.p('stack', 0, 0.5));
    const n = {
      cloth: c.p('take', 0.4, 0.5) * (1 - c.p('stack', 0.55, 0.65)),
      run: k === 'run' || k === 'run2' ? 1 : 0,
      leg1: c.p('run'),
      leg2: c.p('run2'),
      pivot: c.p('pivot', 0.2, 0.85),
      foot: k === 'take' || k === 'align' || k === 'pivot' || k === 'snip' || k === 'up' || k === 'stack' ? 1 : 0,
      up,
      fromPile: 1 - c.p('take', 0.4, 0.9),
      toPile: c.p('stack', 0.2, 0.7),
    };
    const hold = holdUp(c);
    const props: Record<string, V> = { snips: SM.rest, clothUp: hold.at };
    const G = onCloth(c);
    switch (k) {
      case 'take':
        return { l: G.l, r: lerpV(SM.pile, G.r, sm(u, 0.4, 1)), gl: 0.2, gr: 0.5, lean: 0.14, nod: 0.3, n, props };
      case 'align':
        return { l: G.l, r: u < 0.45 ? lerpV(G.r, SM.lever, sm(u, 0, 0.3)) : G.r, gl: 0.1, gr: 0.3, palms: 0.05, lean: 0.16, nod: 0.34, n, props };
      case 'run':
      case 'run2':
        return { ...G, gl: 0.1, gr: 0.1, palms: 0.03, lean: 0.17, nod: 0.36 + 0.02 * Math.sin(c.t * 2), n, props };
      case 'pivot':
        return { l: G.l, r: u < 0.3 ? lerpV(G.r, SM.lever, sm(u, 0, 0.2)) : [SM.needle[0] + 0.14 - 0.12 * u, SM.top + 0.045, 0.2 - 0.04 * u], gl: 0.1, gr: 0.2, palms: 0.05, lean: 0.17, nod: 0.36, n, props };
      case 'snip': {
        const near = sm(u, 0.05, 0.3) * (1 - sm(u, 0.75, 1));
        props.snips = lerpV(SM.rest, add(SM.needle, 0.05, 0.05, 0.1), near);
        return { l: G.l, gl: 0.1, palms: 0.05, tool: 'snips', lean: 0.17, nod: 0.4, n: { ...n, snip: u > 0.4 && u < 0.6 ? 1 : 0 }, props };
      }
      case 'up':
        return { l: hold.l, r: hold.r, gl: 0.75, gr: 0.75, lean: 0.03, nod: 0.02 + 0.03 * Math.sin(c.t * 1.2), n, props };
      default:
        return { l: lerpV(hold.l, SM.done, sm(u, 0, 0.6)), r: lerpV(hold.r, add(SM.done, 0.16, 0, 0), sm(u, 0, 0.6)), gl: 0.55, gr: 0.55, lean: 0.12, nod: 0.24, n, props };
    }
  },
};
const ripAt = (u: number): V => [SM.needle[0], SM.top + 0.012, 0.32 - 0.22 * u];
const ALTER: Script = {
  seq: [['take', 1.2], ['look', 1.8], ['rip', 4.4], ['align', 1.2], ['run', 4.2], ['snip', 1.4], ['up', 2]],
  at: () => sat(SM.seat),
  key(k, u, c) {
    const up = c.p('up', 0, 0.3);
    const n = { cloth: c.p('take', 0.4, 0.5), alter: 1, ripped: c.p('rip', 0.05, 0.95), run: k === 'run' ? 1 : 0, leg1: c.p('run'), foot: k === 'run' ? 0 : 1, up, fromPile: 1 - c.p('take', 0.4, 0.9) };
    const hold = holdUp(c);
    const G = onCloth(c);
    const ripGrip = (x: number) => penGrip(ripAt(x));
    const props: Record<string, V> = { ripper: add(SM.rest, -0.03, 0.05, -0.1), snips: SM.rest, clothUp: hold.at };
    switch (k) {
      case 'take':
        return { l: G.l, r: lerpV(SM.pile, G.r, sm(u, 0.4, 1)), gl: 0.2, gr: 0.5, lean: 0.14, nod: 0.3, n, props };
      case 'look':
        return { l: G.l, r: [SM.needle[0] + 0.05, SM.top + 0.04, 0.3 - 0.2 * u], gl: 0.1, gr: 0.2, palms: 0.05, lean: 0.2, nod: 0.42, n, props };
      case 'rip':
        props.ripper = lerpV(props.ripper, ripGrip(frac(u * 1.0)), sm(u, 0, 0.1));
        return { l: [SM.needle[0] - 0.13, SM.top + 0.045, 0.24 - 0.06 * u], gl: 0.1, palms: 0.05, tool: 'ripper', lean: 0.2, nod: 0.44, n, props };
      case 'align':
        return { l: G.l, r: G.r, gl: 0.1, gr: 0.3, palms: 0.05, lean: 0.16, nod: 0.34, n, props };
      case 'run':
        return { ...G, gl: 0.1, gr: 0.1, palms: 0.03, lean: 0.17, nod: 0.36, n, props };
      case 'snip':
        props.snips = lerpV(SM.rest, add(SM.needle, 0.05, 0.05, 0.1), sm(u, 0.05, 0.3) * (1 - sm(u, 0.75, 1)));
        return { l: G.l, gl: 0.1, palms: 0.05, tool: 'snips', lean: 0.17, nod: 0.4, n: { ...n, snip: u > 0.4 && u < 0.6 ? 1 : 0 }, props };
      default:
        return { l: hold.l, r: hold.r, gl: 0.75, gr: 0.75, lean: 0.03, nod: 0.03, n, props };
    }
  },
};

// =============================================================================================
// 재단대 (fabricTable, 2 × 1): cutting height, cloth laid along it, paper patterns on a rail behind.

export const FT = {
  top: 0.88,
  stand: 0.58,
  /** Where each job goes on the table. */
  cutX: -0.25,
  draftX: 0.5,
  /** The gore laid out to be cut: near-left, far-left, far-right, near-right. */
  gore: [[-0.47, 0.893, 0.33], [-0.33, 0.893, 0.13], [-0.17, 0.893, 0.13], [-0.03, 0.893, 0.33]] as V[],
  /** Where the tools lie on the tray at the table's right. */
  shearsRest: [0.1, 0.91, 0.32] as V,
  chalkRest: [0.02, 0.91, 0.36] as V,
  pencilRest: [0.78, 0.96, 0.16] as V,
  stack: [0.62, 0.9, -0.14] as V,
};
const GORE = FT.gore;
const CUT_A: V[] = [GORE[0], GORE[1], GORE[2]];
const CUT_B: V[] = [GORE[3], GORE[2]];
const CHALK_PATH: V[] = [GORE[0], GORE[1], GORE[2], GORE[3], GORE[0]];
const holdCloth = (p: V): V => [p[0] - 0.13, FT.top + 0.04, Math.min(0.32, p[2] + 0.06)];
const CUT: Script = {
  seq: [['smooth', 1.8], ['lay', 1.8], ['weigh', 1.2], ['chalk', 5.2], ['lift', 1.2], ['cut', 4.2], ['cut2', 2.8], ['free', 1.8], ['stack', 1.2]],
  at: () => st(FT.cutX, FT.stand),
  key(k, u, c) {
    const n = {
      paper: c.p('lay', 0.3, 0.8) * (1 - c.p('lift', 0.4, 0.9)),
      weights: c.p('weigh', 0.3, 0.7) * (1 - c.p('lift', 0.1, 0.4)),
      chalk: c.p('chalk', 0.03, 0.97),
      cut: c.p('cut', 0.04, 0.97),
      cut2: c.p('cut2', 0.05, 0.97),
      cloth: 1,
      freed: c.p('free', 0.2, 1),
      stacked: c.p('stack', 0.5, 0.9),
    };
    const props: Record<string, V> = { shears: FT.shearsRest, chalk: FT.chalkRest };
    const ctr: V = [FT.cutX, FT.top + 0.04, 0.24];
    switch (k) {
      case 'smooth': {
        const s = 0.14 + 0.12 * frac(u * 2);
        return { l: [FT.cutX - s, FT.top + 0.04, 0.26], r: [FT.cutX + s, FT.top + 0.04, 0.26], gl: 0.05, gr: 0.05, palms: 0.02, lean: 0.24, nod: 0.4, n, props };
      }
      case 'lay':
        return { l: lerpV(c.bd(0.2, 1.0, 0.25), add(ctr, -0.14, 0, 0), sm(u, 0, 0.9)), r: lerpV(c.bd(-0.2, 1.0, 0.25), add(ctr, 0.14, 0, 0), sm(u, 0, 0.9)), gl: 0.5, gr: 0.5, palms: 0.1, lean: 0.2, nod: 0.34, n, props };
      case 'weigh':
        return { l: add(ctr, -0.08, 0.02, 0.0), r: add(ctr, 0.1, 0.03, -0.02), gl: 0.5, gr: 0.5, palms: 0.05, lean: 0.24, nod: 0.38, n, props };
      case 'chalk': {
        const p = along(CHALK_PATH, u);
        const up = 0.022;
        const stroke = 0.002 * Math.sin(c.t * 22);
        props.chalk = lerpV(FT.chalkRest, [p[0], p[1] + up + stroke, p[2]], sm(u, 0, 0.03) * (1 - sm(u, 0.98, 1)));
        return { l: add(ctr, -0.14, 0, 0.08), gl: 0.08, palms: 0.03, tool: 'chalk', lean: 0.27, nod: 0.46, n, props };
      }
      case 'lift':
        return { l: add(ctr, -0.14, 0.03 + 0.22 * sm(u, 0.4, 1), 0), r: add(ctr, 0.14, 0.03 + 0.22 * sm(u, 0.4, 1), 0), gl: 0.5, gr: 0.5, palms: 0.1, lean: 0.2, nod: 0.38, n, props };
      case 'cut': {
        const p = along(CUT_A, sm(u, 0.04, 0.97));
        const yaw = p[2] > GORE[1][2] + 0.002 ? yawOf(GORE[0], GORE[1]) : -1.35;
        props.shears = [p[0] - Math.sin(yaw) * SHEAR_REACH, p[1] + SHEAR_UP, p[2] - Math.cos(yaw) * SHEAR_REACH];
        return { l: holdCloth(p), gl: 0.1, palms: 0.03, tool: 'shears', lean: 0.27, nod: 0.46, n: { ...n, shearYaw: yaw, snip: Math.abs(Math.sin(c.t * 7)) }, props };
      }
      case 'cut2': {
        const p = along(CUT_B, sm(u, 0.05, 0.97));
        const yaw = yawOf(GORE[3], GORE[2]);
        props.shears = [p[0] - Math.sin(yaw) * SHEAR_REACH, p[1] + SHEAR_UP, p[2] - Math.cos(yaw) * SHEAR_REACH];
        return { l: [p[0] - 0.2, FT.top + 0.04, Math.min(0.32, p[2] + 0.05)], gl: 0.1, palms: 0.03, tool: 'shears', lean: 0.27, nod: 0.46, n: { ...n, shearYaw: yaw, snip: Math.abs(Math.sin(c.t * 7)) }, props };
      }
      case 'free':
        return { l: add(ctr, -0.1, 0.03 + 0.12 * sm(u, 0.2, 0.8), 0), r: add(ctr, 0.1, 0.03 + 0.12 * sm(u, 0.2, 0.8), 0), gl: 0.7, gr: 0.7, palms: 0.2, lean: 0.14, nod: 0.3, n, props };
      default:
        return { l: lerpV(add(ctr, -0.1, 0.15, 0), add(ctr, 0.1, 0.05, 0), u), r: lerpV(add(ctr, 0.1, 0.15, 0), add(ctr, 0.3, 0.03, -0.02), u), gl: 0.5, gr: 0.5, lean: 0.14, nod: 0.3, n, props };
    }
  },
};
/** The draft's lines, in the piece's frame on the paper. */
const DRAFT: V[] = [[0.34, 0.895, 0.32], [0.34, 0.895, 0.12], [0.66, 0.895, 0.12], [0.66, 0.895, 0.32]];
const PATTERN: Script = {
  seq: [['read', 2.4], ['rule', 4], ['measure', 2.6], ['rule2', 4], ['curve', 3.4], ['notch', 2.2], ['hang', 1.6]],
  at: () => st(FT.draftX, FT.stand),
  key(k, u, c) {
    const n = { draftPaper: 1 - c.p('hang', 0.4, 0.8), lines1: c.p('rule', 0.03, 0.97), lines2: c.p('rule2', 0.03, 0.97), curve: c.p('curve', 0.03, 0.97), notch: c.p('notch', 0.1, 0.9), squareOn: k === 'rule' || k === 'rule2' ? 1 : 0 };
    const props: Record<string, V> = { pencil: FT.pencilRest };
    const left: V = [FT.draftX - 0.18, FT.top + 0.04, 0.24];
    const draw = (p: V) => penGrip(p);
    switch (k) {
      case 'read':
        return { l: left, r: [FT.draftX + 0.2, FT.top + 0.04, 0.3], gl: 0.1, gr: 0.2, palms: 0.05, lean: 0.17, nod: 0.36, n, props };
      case 'rule':
        props.pencil = lerpV(FT.pencilRest, draw(along([DRAFT[0], DRAFT[1], DRAFT[2]], u)), sm(u, 0, 0.08));
        return { l: add(left, 0.02, 0, -0.04), gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.26, nod: 0.44, n, props };
      case 'measure':
        return { l: left, r: [FT.draftX + 0.12 - 0.2 * u, FT.top + 0.04, 0.2], gl: 0.1, gr: 0.5, palms: 0.05, lean: 0.24, nod: 0.42, n, props };
      case 'rule2':
        props.pencil = lerpV(FT.pencilRest, draw(along([DRAFT[2], DRAFT[3], DRAFT[0]], u)), sm(u, 0, 0.08));
        return { l: add(left, 0.04, 0, -0.02), gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.26, nod: 0.44, n, props };
      case 'curve': {
        const a = u * PI;
        props.pencil = draw([FT.draftX + 0.13 * Math.cos(a), FT.top + 0.015, 0.25 - 0.08 * Math.sin(a)]);
        return { l: add(left, 0.06, 0, 0), gl: 0.2, palms: 0.05, tool: 'pencil', lean: 0.26, nod: 0.46, n, props };
      }
      case 'notch':
        props.pencil = draw([FT.draftX - 0.14 + 0.28 * u, FT.top + 0.015 + 0.012 * Math.abs(Math.sin(c.t * 8)), 0.32]);
        return { l: add(left, 0.02, 0, 0.05), gl: 0.2, palms: 0.05, tool: 'pencil', lean: 0.22, nod: 0.44, n, props };
      default:
        return { l: lerpV(add(left, 0, 0, 0), c.bd(0.2, 1.08, 0.3), sm(u, 0, 0.8)), r: lerpV([FT.draftX + 0.18, FT.top + 0.04, 0.24], c.bd(-0.2, 1.08, 0.3), sm(u, 0, 0.8)), gl: 0.5, gr: 0.5, lean: 0.1, nod: 0.2, n, props };
    }
  },
};

// =============================================================================================
// 드로잉 테이블 (fdDrawingTable, 2 × 1): a tilted board in front of a tall stool, the swatch book and pencils within reach.

export const DT = {
  seat: [-0.2, 0.62, 0.6] as V,
  board: [-0.2, 0.98, 0.12] as V,
  tilt: 0.5,
  w: 0.78,
  h: 0.56,
  pencilRest: [0.24, 0.94, 0.24] as V,
  /** The swatch book at the left, and the cut swatch ready at the right. */
  bookAt: [-0.68, 0.87, 0.27] as V,
  swatchRest: [0.3, 0.87, 0.14] as V,
  calc: [0.34, 0.865, 0.33] as V,
};
/** A place on the board, u and v from its middle (v up the slope), `off` out of it. */
export function boardAt(u: number, v: number, off = 0.004): V {
  const s = Math.sin(DT.tilt);
  const k = Math.cos(DT.tilt);
  return [DT.board[0] + u, DT.board[1] + v * s + off * k, DT.board[2] - v * k + off * s];
}
const sketchTip = (u: number, v: number): V => penGrip(boardAt(u, v), PEN_DIR_TILT);
const restL = (): V => boardAt(-0.26, -0.2, 0.03);
/** A pencil going back and forth over a patch of the board. */
const scribble = (t: number, cx: number, cy: number, w: number, h: number): V => sketchTip(cx + w * Math.sin(t * 5.3), cy + h * Math.sin(t * 2.1));
const makeSketch = (own: boolean): Script => ({
  seq: own
    ? [['think', 1.8], ['line', 3.4], ['shape', 3.8], ['swatch', 1.8], ['colour', 3.8], ['detail', 2.8], ['clip', 2.2], ['sign', 1.8], ['back', 1.8]]
    : [['think', 2.2], ['line', 3.6], ['shape', 4], ['swatch', 1.8], ['colour', 4.2], ['detail', 3], ['back', 2]],
  at: () => sat(DT.seat),
  key(k, u, c) {
    const n = {
      own: own ? 1 : 0,
      lines: c.p('line', 0.05, 0.95),
      shape: c.p('shape', 0.05, 0.95),
      colour: c.p('colour', 0.05, 0.95),
      detail: c.p('detail', 0.05, 0.95),
      book: k === 'swatch' ? 1 : 0,
      clipped: own ? c.p('clip', 0.7, 0.95) : 0,
      signed: own ? c.p('sign', 0.2, 0.9) : 0,
    };
    const props: Record<string, V> = { pencil: DT.pencilRest, swatch: DT.swatchRest };
    const l = restL();
    switch (k) {
      case 'think':
        return { l, r: chin(c), gl: 0.15, gr: 0.5, palms: 0.5, lean: 0.03, nod: 0.08 + 0.03 * Math.sin(c.t * 0.9), n, props };
      case 'line':
        props.pencil = lerpV(DT.pencilRest, scribble(c.t, -0.02, -0.02, 0.05, 0.15), sm(u, 0, 0.1));
        return { l, gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.13, nod: 0.3, n, props };
      case 'shape':
        props.pencil = scribble(c.t * 0.8, 0.0, 0.0, 0.1, 0.13);
        return { l, gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.13, nod: 0.3, n, props };
      case 'swatch':
        return { l: DT.bookAt, r: boardAt(0.24, -0.18, 0.03), gl: 0.2, gr: 0.3, palms: 0.1, lean: 0.14, nod: 0.3, n, props };
      case 'colour':
        props.pencil = scribble(c.t * 1.3, 0.0, -0.04, 0.09, 0.09);
        return { l, gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.13, nod: 0.32, n, props };
      case 'detail':
        props.pencil = sketchTip(-0.15 + 0.18 * frac(u * 2), 0.14 - 0.26 * u);
        return { l, gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.15, nod: 0.34, n, props };
      case 'clip': {
        const on = boardAt(0.26, 0.12, 0.012);
        props.swatch = lerpV(DT.swatchRest, on, sm(u, 0.15, 0.8));
        return { r: boardAt(0.24, -0.2, 0.03), gr: 0.3, palms: 0.05, tool: 'swatch', lean: 0.13, nod: 0.26, n, props };
      }
      case 'sign':
        props.pencil = sketchTip(0.14 + 0.1 * u, -0.22 + 0.006 * Math.sin(c.t * 14));
        return { l, gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.13, nod: 0.32, n, props };
      default:
        return { l, r: boardAt(0.26, -0.2, 0.03), gl: 0.15, gr: 0.3, palms: 0.05, lean: -0.02, nod: 0.08, n, props };
    }
  },
});
const SALES: Script = {
  seq: [['read', 2.8], ['tick', 3.4], ['calc', 2.8], ['tick2', 3.4], ['plan', 3.6]],
  at: () => sat(DT.seat),
  key(k, u, c) {
    const n = { report: 1, ticks: 2 * c.p('tick', 0.1, 0.9) + 2 * c.p('tick2', 0.1, 0.9), calc: k === 'calc' ? 1 : 0, circled: c.p('plan', 0.2, 0.8) };
    const props: Record<string, V> = { pencil: DT.pencilRest };
    const l = restL();
    switch (k) {
      case 'read':
        return { l, r: boardAt(0.0 + 0.2 * Math.sin(c.t * 0.7), 0.0, 0.03), gl: 0.15, gr: 0.25, palms: 0.05, lean: 0.1, nod: 0.26, n, props };
      case 'tick':
        props.pencil = lerpV(DT.pencilRest, sketchTip(-0.2 + 0.2 * u, -0.05 + 0.02 * Math.sin(c.t * 12)), sm(u, 0, 0.12));
        return { l, gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.13, nod: 0.3, n, props };
      case 'calc':
        return { l, r: add(DT.calc, 0.012 * Math.sin(c.t * 7), 0.03, 0.012 * Math.cos(c.t * 5)), gl: 0.15, gr: 0.4, palms: 0.03, tap: true, lean: 0.14, nod: 0.3, n, props };
      case 'tick2':
        props.pencil = sketchTip(0.02 + 0.2 * u, -0.05 + 0.02 * Math.sin(c.t * 12));
        return { l, gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.13, nod: 0.3, n, props };
      default: {
        const a = u * PI * 2;
        props.pencil = sketchTip(0.12 + 0.07 * Math.cos(a), 0.1 + 0.05 * Math.sin(a));
        return { l, gl: 0.15, palms: 0.05, tool: 'pencil', lean: 0.13, nod: 0.3, n, props };
      }
    }
  },
};

// =============================================================================================
// 드레이핑 폼 (fdDressForm, 1 × 1): cloth over a padded form on an iron stand, worked at chest height.

export const DF = {
  stand: 0.44,
  /** Where each pin goes, in the form's frame at its face. */
  pins: [[0.1, 1.33, 0.1], [-0.1, 1.33, 0.1], [0.09, 1.06, 0.1], [-0.09, 1.06, 0.1], [0, 1.2, 0.135], [0.14, 0.94, 0.1]] as V[],
  hemCut: 0.88,
  cushion: [0.3, 1.0, 0.24] as V,
  shearsRest: [-0.24, 0.93, 0.22] as V,
  chalkRest: [-0.2, 0.93, 0.36] as V,
};
/** A pin's head just off the cloth, its point in. */
const pinAt = (p: V, out: number): V => [p[0], p[1] + 0.012, p[2] + 0.05 + out];
const leftAtWrist = (c: Ctx): V => c.bd(0.08, 1.04, 0.3);
const makeDrape = (silk: boolean): Script => ({
  seq: [['fling', 1.8], ['smooth', 2.2], ['pin0', 1.9], ['pin1', 1.9], ['skirt', 1.8], ['pin2', 1.8], ['pin3', 1.8], ['turn', 1.8], ['pin4', 1.8], ['chalk', 2.8], ['trim', 3.4], ['back', 2.4], ['off', 1.6]],
  at: (k) => (k === 'back' ? st(0.05, 0.86) : st(0, DF.stand)),
  key(k, u, c) {
    const pinning = k.startsWith('pin');
    const i = pinning ? +k.slice(3) : 0;
    const count = c.p('pin0', 0.55, 0.65) + c.p('pin1', 0.55, 0.65) + c.p('pin2', 0.55, 0.65) + c.p('pin3', 0.55, 0.65) + c.p('pin4', 0.55, 0.65);
    const n = { silk: silk ? 1 : 0, drape: c.p('fling', 0.25, 0.85) * (1 - c.p('off', 0.1, 0.8)), skirt: c.p('skirt', 0.1, 0.8) * (1 - c.p('off', 0.1, 0.8)), pins: count * (1 - c.p('off', 0.3, 0.4)), turn: k === 'turn' ? Math.sin(u * PI) : 0, chalk: c.p('chalk', 0.05, 0.95) * (1 - c.p('off', 0.3, 0.4)), trim: c.p('trim', 0.05, 0.95) * (1 - c.p('off', 0.3, 0.4)), shearYaw: PI / 2 };
    const props: Record<string, V> = { shears: DF.shearsRest, chalk: DF.chalkRest };
    const wrist = leftAtWrist(c);
    props.pin = add(wrist, -0.02, 0.05, 0.02);
    const cus = add(wrist, 0, 0.03, 0);
    props.cushion = cus;
    switch (k) {
      case 'fling': {
        const a = sm(u, 0, 0.8);
        return { l: lerpV(c.bd(0.3, 1.45, 0.3), [-0.17, 1.4, 0.03], a), r: lerpV(c.bd(-0.3, 1.45, 0.3), [0.17, 1.4, 0.03], a), gl: 0.6, gr: 0.6, palms: 0.1, nod: -0.05, lean: 0.03, n, props };
      }
      case 'smooth': {
        const y = 1.34 - 0.26 * frac(u * 1.5);
        return { l: [-0.12, y, 0.15], r: [0.12, y, 0.15], gl: 0.05, gr: 0.05, palms: 0.5, lean: 0.06, nod: 0.08, n, props };
      }
      case 'skirt':
        return { l: lerpV([-0.14, 1.06, 0.14], [-0.2, 0.96, 0.16], u), r: lerpV([0.14, 1.06, 0.14], [0.2, 0.96, 0.16], u), gl: 0.4, gr: 0.4, palms: 0.4, lean: 0.13, nod: 0.24, n, props };
      case 'turn':
        return { l: [-0.17, 1.25, 0.05 + 0.08 * Math.sin(u * PI)], r: [0.17, 1.25, 0.05 - 0.08 * Math.sin(u * PI)], gl: 0.5, gr: 0.5, palms: 0.5, lean: 0.05, nod: 0.08, n, props };
      case 'chalk':
        props.chalk = lerpV(DF.chalkRest, [-0.13 + 0.26 * sm(u, 0.1, 0.9), 1.05, 0.16], sm(u, 0, 0.12) * (1 - sm(u, 0.92, 1)));
        return { l: [-0.15, 1.08, 0.14], gl: 0.1, palms: 0.4, tool: 'chalk', lean: 0.1, nod: 0.22, n, props };
      case 'trim': {
        // Round the front of the hem, the blades level; raised so a standing cutter really reaches it.
        const a = -0.25 + 1.1 * sm(u, 0.05, 0.95);
        const yaw = PI / 2 - a * 0.6;
        const p: V = [Math.sin(a) * 0.2, DF.hemCut, Math.cos(a) * 0.17];
        const go = sm(u, 0, 0.05) * (1 - sm(u, 0.96, 1));
        props.shears = lerpV(DF.shearsRest, [p[0] - Math.sin(yaw) * SHEAR_REACH, p[1] + SHEAR_UP, p[2] - Math.cos(yaw) * SHEAR_REACH], go);
        return { l: [p[0] - 0.2, DF.hemCut + 0.03, p[2] + 0.03], gl: 0.5, palms: 0.5, tool: 'shears', lean: 0.26, nod: 0.5, n: { ...n, shearYaw: yaw, snip: Math.abs(Math.sin(c.t * 6)) }, props };
      }
      case 'back':
        return { l: c.bd(0.2, 1.04, 0.1), r: chin(c), gl: 0.6, gr: 0.5, palms: 0.5, lean: 0, nod: 0.02 + 0.03 * Math.sin(c.t * 1.1), n, props };
      case 'off':
        return { l: lerpV([-0.15, 1.35, 0.08], c.bd(0.2, 1.4, 0.32), sm(u, 0.1, 0.9)), r: lerpV([0.15, 1.35, 0.08], c.bd(-0.2, 1.4, 0.32), sm(u, 0.1, 0.9)), gl: 0.6, gr: 0.6, palms: 0.1, lean: 0.03, n, props };
      default: {
        const p = DF.pins[wrap(i, DF.pins.length)];
        const reach = u < 0.25 ? sm(u, 0, 0.25) : 1;
        const inGo = sm(u, 0.3, 0.6);
        const out = 0.05 * (1 - inGo);
        props.pin = lerpV(add(cus, 0.01, 0.015, 0), pinAt(p, out), reach * sm(u, 0.1, 0.32));
        return { l: wrist, gl: 0.35, palms: 0.5, tool: 'pin', lean: 0.09, nod: p[1] < 1.15 ? 0.22 : 0.05, n, props };
      }
    }
  },
});

// =============================================================================================
// 스팀 프레스 (fdSteamPress, 2 × 1): a padded buck, a hinged head, a boiler at the left; a sleeve board and hand iron on the right.

export const SP = {
  x: -0.2,
  stand: 0.5,
  top: 0.84,
  buckY: 0.885,
  /** The head's hinge and how long it is to its handle. */
  pivot: [-0.2, 0.97, -0.25] as V,
  arm: 0.46,
  openAngle: 0.7,
  basket: [-0.82, 0.86, 0.14] as V,
  boardX: 0.62,
  boardTop: 0.95,
  boardZ: 0.04,
  ironRest: [0.86, 0.985, 0.12] as V,
};
/** The handle's place with the head `open` of the way up (0 shut, 1 up). */
export function pressHandle(open: number): V {
  const a = SP.openAngle * open;
  const s = Math.sin(a);
  const k = Math.cos(a);
  return [SP.x, SP.pivot[1] + 0.1 * k + SP.arm * s, SP.pivot[2] + SP.arm * k - 0.1 * s];
}
const PRESS: Script = {
  seq: [['take', 1.4], ['lay', 1.8], ['close', 1], ['steam', 3], ['vac', 1.4], ['open', 1], ['turn', 1.7], ['close2', 0.9], ['steam2', 2.6], ['open2', 1], ['lift', 1.6]],
  at: (k) => (k === 'take' ? st(SP.x - 0.42, SP.stand) : st(SP.x, SP.stand)),
  key(k, u, c) {
    const headUp = k === 'close' ? 1 - sm(u, 0.1, 0.95) : k === 'open' ? sm(u, 0.1, 0.95) : k === 'close2' ? 1 - sm(u, 0.1, 0.95) : k === 'open2' ? sm(u, 0.1, 0.95) : k === 'steam' || k === 'vac' || k === 'steam2' ? 0 : 1;
    const n = { head: headUp, steam: k === 'steam' || k === 'steam2' ? 1 : 0, vac: k === 'vac' ? 1 : 0, cloth: c.p('take', 0.5, 0.6) * (1 - c.p('lift', 0.6, 0.7)), flat: 0.5 * c.p('steam') + 0.5 * c.p('steam2'), flipped: c.p('turn', 0.3, 0.7) };
    const handle = pressHandle(headUp);
    const onHandle = { l: add(handle, -0.14, 0, 0.012), r: add(handle, 0.14, 0, 0.012), gl: 0.8, gr: 0.8, palms: 0.05, lean: 0.14 + 0.14 * headUp, nod: 0.26 };
    const buck = (x: number): V => [SP.x + x, SP.buckY + 0.03, 0.14];
    const props: Record<string, V> = {};
    switch (k) {
      case 'take':
        return { l: lerpV(c.bd(0.2, 1.02, 0.25), SP.basket, sm(u, 0, 0.5) * (1 - sm(u, 0.6, 1))), r: c.bd(-0.2, 1.02, 0.25), gl: 0.5, gr: 0.2, lean: 0.17, nod: 0.3, n, props };
      case 'lay':
      case 'turn': {
        const s = 0.08 + 0.18 * frac(u * 2);
        return { l: buck(-s), r: buck(s), gl: 0.1, gr: 0.1, palms: 0.03, lean: 0.25, nod: 0.42, n, props };
      }
      case 'lift':
        return { l: lerpV(buck(-0.2), c.bd(0.2, 1.15, 0.28), sm(u, 0.1, 0.7)), r: lerpV(buck(0.2), c.bd(-0.2, 1.15, 0.28), sm(u, 0.1, 0.7)), gl: 0.6, gr: 0.6, lean: 0.1, nod: 0.2, n, props };
      default:
        return { ...onHandle, n, props };
    }
  },
};
const ironOn = (z: number, up = 0): V => [SP.boardX, SP.boardTop + 0.012 + IRON_UP + up, z];
/** How high an iron's handle stands off its sole. */
export const IRON_UP = 0.085;
const IRON: Script = {
  seq: [['lay', 1.5], ['open', 1.9], ['press', 3.8], ['puff', 1.7], ['press2', 2.8], ['rest', 1.3]],
  at: () => st(SP.boardX, SP.stand),
  key(k, u, c) {
    const n = { sleeve: 1, opened: c.p('open', 0.1, 0.9), flat: 0.6 * c.p('press') + 0.4 * c.p('press2'), puff: k === 'puff' ? 1 : 0 };
    const l: V = [SP.boardX - 0.13, SP.boardTop + 0.03, 0.2];
    const props: Record<string, V> = { iron: SP.ironRest };
    switch (k) {
      case 'lay':
        return { l, r: [SP.boardX + 0.1, SP.boardTop + 0.03, 0.2 - 0.25 * u], gl: 0.1, gr: 0.1, palms: 0.03, lean: 0.2, nod: 0.4, n, props };
      case 'open':
        return { l: [SP.boardX - 0.03, SP.boardTop + 0.03, 0.22 - 0.2 * u], r: [SP.boardX + 0.03, SP.boardTop + 0.03, 0.22 - 0.2 * u], gl: 0.4, gr: 0.4, palms: 0.03, lean: 0.22, nod: 0.44, n, props };
      case 'press':
      case 'press2': {
        const z = 0.12 + 0.11 * Math.sin(c.t * 1.7);
        const on = ironOn(z);
        props.iron = lerpV(SP.ironRest, on, sm(u, 0, 0.14));
        return { l, gl: 0.1, palms: 0.03, tool: 'iron', lean: 0.2, nod: 0.42, n, props };
      }
      case 'puff':
        props.iron = ironOn(0.1, 0.1);
        return { l, gl: 0.1, palms: 0.03, tool: 'iron', lean: 0.16, nod: 0.36, n, props };
      default:
        props.iron = lerpV(ironOn(0.1), SP.ironRest, sm(u, 0.1, 0.9));
        return { l, gl: 0.1, palms: 0.03, tool: 'iron', lean: 0.12, nod: 0.3, n, props };
    }
  },
};

// =============================================================================================
// 원단 랙 (fdFabricRack, 2 × 1): bolts lying across shelves; a ledge at waist height to unroll on.

export const FR = {
  stand: 0.56,
  /** The bolt that comes out, its slot, and where it sits on the ledge. */
  slot: [0, 1.17, 0.02] as V,
  ledge: [0, 0.97, 0.24] as V,
  ledgeTop: 0.92,
  held: [0, 1.08, 0.2] as V,
  pencil: [0.62, 0.935, 0.28] as V,
  swatchRest: [0.32, 0.935, 0.3] as V,
};
const PICK: Script = {
  seq: [['scan', 2], ['feel', 1.6], ['pull', 1.4], ['set', 1.2], ['unroll', 2.2], ['snip', 1.8], ['light', 2.2], ['roll', 1.6], ['take', 1.1], ['back', 1.6]],
  at: () => st(0, FR.stand),
  key(k, u, c) {
    const n = {
      out: k === 'scan' || k === 'feel' ? 0 : 1,
      unroll: c.p('unroll', 0.1, 0.9) * (1 - c.p('roll', 0.1, 0.9)),
      swatched: c.p('snip', 0.4, 0.6),
      inHand: c.p('snip', 0.5, 0.6) * (1 - c.p('roll', 0, 0.1)),
    };
    const hold = FR.held;
    let bolt: V = FR.slot;
    if (k === 'pull') bolt = lerpV(FR.slot, hold, sm(u, 0.1, 0.9));
    else if (k === 'set') bolt = lerpV(hold, FR.ledge, sm(u, 0.1, 0.9));
    else if (k === 'unroll' || k === 'snip' || k === 'light' || k === 'roll') bolt = FR.ledge;
    else if (k === 'take') bolt = lerpV(FR.ledge, hold, sm(u, 0.1, 0.9));
    else if (k === 'back') bolt = lerpV(hold, FR.slot, sm(u, 0.1, 0.9));
    const props: Record<string, V> = { bolt, swatch: FR.swatchRest };
    switch (k) {
      case 'scan': {
        const x = -0.08 + 0.55 * sm(u, 0, 1);
        return { l: easy(c).l, gl: 0.3, r: [x, 1.17 + 0.04 * Math.sin(c.t * 1.8), 0.08], gr: 0.15, palms: 0.4, nod: -0.03, lean: 0.08, n, props };
      }
      case 'feel':
        return { l: [-0.06, 1.2, 0.08], r: [0.1, 1.2, 0.09 + 0.012 * Math.sin(c.t * 7)], gl: 0.4, gr: 0.5, palms: 0.5, nod: 0, lean: 0.1, n, props };
      case 'pull':
      case 'set':
      case 'take':
      case 'back':
        return { tool: 'bolt', lean: 0.1, nod: 0.08, n, props };
      case 'unroll':
        return { l: [-0.15, FR.ledgeTop + 0.11, 0.3], r: [0.15, FR.ledgeTop + 0.08 - 0.1 * u, 0.36], gl: 0.5, gr: 0.5, palms: 0.05, lean: 0.14, nod: 0.3, n, props };
      case 'snip':
        props.swatch = lerpV(FR.swatchRest, add(FR.ledge, 0.18, -0.02, 0.1), sm(u, 0.05, 0.4));
        return { l: [-0.1, FR.ledgeTop + 0.06, 0.34], gl: 0.5, palms: 0.05, tool: 'swatch', lean: 0.15, nod: 0.34, n, props };
      case 'light': {
        props.swatch = lerpV(add(FR.ledge, 0.18, -0.02, 0.1), c.bd(-0.1, 1.32, 0.3), sm(u, 0, 0.4));
        return { l: [-0.1, FR.ledgeTop + 0.06, 0.34], gl: 0.5, palms: 0.05, tool: 'swatch', lean: 0.03, nod: -0.12, n, props };
      }
      default:
        return { l: [-0.15, FR.ledgeTop + 0.1, 0.32], r: [0.15, FR.ledgeTop + 0.1 - 0.08 * (1 - u), 0.34], gl: 0.5, gr: 0.5, palms: 0.05, lean: 0.14, nod: 0.28, n, props };
    }
  },
};

// =============================================================================================
// 가봉 코너 (fdFittingCorner, 2 × 2): a low round stand with an adult client on it in a basted jacket, a tall mirror of its own behind.

export const FC = {
  client: [0.15, 0.1, -0.2] as V,
  /** In the piece's frame, the client facing out (their left is +x). */
  shoulderL: [0.35, 1.42, -0.2] as V,
  shoulderR: [-0.05, 1.42, -0.2] as V,
  wristL: [0.48, 1.03, -0.1] as V,
  stand: [0.15, 0.27] as const,
  side: [0.76, -0.1] as const,
  aside: [0.84, 0.42] as const,
  /** The pins on the sleeve and shoulder cap. */
  pins: [[0.36, 1.42, -0.1], [0.41, 1.27, -0.08], [0.46, 1.13, -0.06]] as V[],
  tray: [0.78, 0.78, 0.62] as V,
};
const shoulderTape = (): V => [(FC.shoulderL[0] + FC.shoulderR[0]) / 2, FC.shoulderL[1] + 0.015, -0.07];
const FIT_MEASURE: Script = {
  seq: [['greet', 1.6, 0.5], ['tape', 3.4, 1.0], ['note', 1.9, 1.0], ['sleeve', 3.4, 1.0], ['note2', 1.9, 0.8], ['thanks', 1.6, 0.5]],
  at: (k) => (k === 'sleeve' ? st(FC.side[0], FC.side[1], -PI / 2) : st(FC.stand[0], FC.stand[1])),
  key(k, u, c) {
    const n = { client: 1, nodC: k === 'thanks' ? 1 : 0, wrote: c.p('note', 0.1, 0.9) + c.p('note2', 0.1, 0.9), clientYaw: 0 };
    const props: Record<string, V> = { tape: shoulderTape(), tapeArm: [(FC.shoulderL[0] + FC.wristL[0]) / 2 + 0.02, (FC.shoulderL[1] + FC.wristL[1]) / 2, -0.08], clip: c.bd(0.1, 1.1, 0.3) };
    switch (k) {
      case 'greet':
      case 'thanks':
        return { l: c.bd(0.22, 0.98, 0.14), r: c.bd(-0.24, 1.05, 0.24 + 0.03 * Math.sin(c.t * 2.8)), gl: 0.4, gr: 0.3, palms: 0.7, nod: u > 0.4 && u < 0.6 ? 0.2 : -0.04, lean: 0.04, n, props };
      case 'tape':
        return { tool: 'tape', lean: 0.1, nod: -0.05, n, props };
      case 'sleeve':
        return { tool: 'tapeArm', lean: 0.08, nod: 0.06, n, props };
      default:
        return { tool: 'clip', r: add(c.bd(-0.02, 1.13, 0.31), 0.04 * Math.sin(c.t * 5), 0, 0), gr: 0.75, lean: 0.06, nod: 0.34, n, props };
    }
  },
};
const FIT_PIN: Script = {
  seq: [['greet', 1.2, 0.8], ['settle', 2, 0.8], ['pin0', 2.2, 0.5], ['pin1', 2.2, 0.5], ['cuff', 2.6, 0.5], ['pin2', 2, 1], ['mirror', 3.8, 1], ['nod', 1.6, 0.6]],
  at: (k) => (k === 'greet' || k === 'nod' ? st(FC.stand[0], FC.stand[1]) : k === 'mirror' ? st(FC.aside[0], FC.aside[1], -2.4) : st(FC.side[0], FC.side[1], -PI / 2)),
  key(k, u, c) {
    const count = c.p('pin0', 0.5, 0.6) + c.p('pin1', 0.5, 0.6) + c.p('pin2', 0.5, 0.6);
    const n = { client: 1, pins: count, cuff: c.p('cuff', 0.05, 0.95), clientYaw: k === 'mirror' ? Math.sin(u * PI) * 2.6 : 0, nodC: k === 'nod' ? 1 : 0, mirror: k === 'mirror' ? Math.sin(u * PI) : 0 };
    // Held near the dweller's own side, clear of the client's arm.
    const cus = c.bd(0.1, 1.04, 0.2);
    const props: Record<string, V> = { pin: add(cus, -0.02, 0.05, 0.02), cushion: cus, chalk: add(cus, 0.03, 0.06, -0.02) };
    switch (k) {
      case 'greet':
      case 'nod':
        return { l: c.bd(0.22, 0.98, 0.14), r: c.bd(-0.24, 1.05, 0.24 + 0.03 * Math.sin(c.t * 2.8)), gl: 0.4, gr: 0.3, palms: 0.7, nod: 0, lean: 0.04, n, props };
      case 'settle':
        return { l: [FC.wristL[0] + 0.02, FC.wristL[1] + 0.12, FC.wristL[2] + 0.06], r: [FC.shoulderL[0] + 0.04 + 0.04 * Math.sin(u * PI), FC.shoulderL[1] + 0.02 - 0.2 * u, -0.08], gl: 0.25, gr: 0.2, palms: 0.5, lean: 0.06, nod: 0.05, n, props };
      case 'cuff': {
        const a = 0.15 - 0.2 * sm(u, 0.1, 0.9);
        props.chalk = lerpV(add(cus, 0.03, 0.06, -0.02), [FC.wristL[0] + 0.05, FC.wristL[1] + 0.04, FC.wristL[2] + a], sm(u, 0, 0.14) * (1 - sm(u, 0.92, 1)));
        return { l: cus, gl: 0.35, palms: 0.5, tool: 'chalk', lean: 0.08, nod: 0.2, n, props };
      }
      case 'mirror':
        return { l: c.bd(0.2, 1, 0.14), r: chin(c), gl: 0.5, gr: 0.5, palms: 0.5, lean: 0, nod: 0.02, n, props };
      default: {
        const i = +k.slice(3);
        const p = FC.pins[wrap(i, FC.pins.length)];
        const from = add(cus, -0.02, 0.05, 0.02);
        props.pin = lerpV(from, [p[0] + 0.06 * (1 - sm(u, 0.3, 0.6)) + 0.03, p[1] + 0.012, p[2] + 0.03], sm(u, 0.05, 0.32));
        return { l: cus, gl: 0.35, palms: 0.5, tool: 'pin', lean: 0.06, nod: p[1] > 1.3 ? -0.04 : 0.12, n, props };
      }
    }
  },
};

// =============================================================================================
// 쇼 레일 (fdShowRail, 3 × 1): the season's finished looks on a rail, a tag on each.

export const SR = {
  stand: 0.44,
  rail: 1.62,
  xs: [-1.08, -0.54, 0, 0.54, 1.08] as readonly number[],
  cardRest: [1.34, 0.95, 0.16] as V,
};
const LOOK: Script = {
  seq: [['go', 1.2, 1.1], ['out', 1.5], ['tag', 2.4], ['roll', 3.8], ['tuck', 1.8], ['card', 2.6], ['in', 1.2, 1.1]],
  at: () => st(0, SR.stand),
  key(k, u, c) {
    const n = { out: c.p('out', 0.1, 0.9) * (1 - c.p('in', 0.1, 0.9)), tag: c.p('tag', 0.2, 0.5) * (1 - c.p('tuck', 0, 0.2)), rolled: c.p('roll', 0.1, 0.9), carded: c.p('card', 0.4, 0.9) };
    const X = 0;
    const face = 0.16;
    const props: Record<string, V> = { roller: [0.26, 0.98, 0.24], swatch: [0.2, 1.0, 0.22], clip: c.bd(0.12, 1.08, 0.3) };
    switch (k) {
      case 'go':
        return { ...easy(c), n, props };
      case 'out':
        return { l: easy(c).l, r: [X + 0.02, SR.rail - 0.08, 0.1], gl: 0.3, gr: 0.75, palms: 0.5, lean: 0.03, nod: -0.05, n, props };
      case 'tag':
        return { l: [X - 0.08, 1.3, face], r: [X + 0.1, 1.38, face], gl: 0.6, gr: 0.65, palms: 0.5, nod: 0.05, lean: 0.03, n, props };
      case 'roll': {
        const y = 1.32 - 0.36 * Math.abs(Math.sin(c.t * 1.9));
        props.roller = [X + 0.04, y, face + 0.05];
        return { l: [X - 0.13, 1.42, face - 0.03], gl: 0.75, palms: 0.5, tool: 'roller', lean: 0.07, nod: y < 1.1 ? 0.28 : 0.14, n, props };
      }
      case 'tuck':
        return { l: [X - 0.1, 1.08, face], r: [X + 0.1, 1.08 + 0.1 * u, face], gl: 0.5, gr: 0.5, palms: 0.5, lean: 0.08, nod: 0.2, n, props };
      case 'card':
        return { tool: 'clip', r: add(c.bd(-0.02, 1.11, 0.31), 0.04 * Math.sin(c.t * 5), 0, 0), gr: 0.75, lean: 0.05, nod: 0.3, n, props };
      default:
        return { ...easy(c), r: [X, SR.rail - 0.08, 0.1], gr: 0.75, n, props };
    }
  },
};

// =============================================================================================
// 런웨이 (runway, 1 × 3): a raised white walk, the label's name on the wall at its head. z = +1.45 is the foot.

export const RW = {
  deck: 0.12,
  head: -1.15,
  foot: 1.15,
  floorZ: 1.88,
  /** The two marks models stop on in a meeting. */
  marks: [-0.3, 0.55] as readonly number[],
};
const WALK: Script = {
  seq: [['door', 1, 2.6], ['mark', 1, 0.5], ['pose', 1.7, 0.6], ['turn', 0.3, 2.6], ['back', 0.7, 0.8]],
  at: (k) => {
    if (k === 'door') return st(0, RW.head, 0, RW.deck);
    if (k === 'mark' || k === 'pose') return st(0, RW.foot, 0, RW.deck);
    if (k === 'turn') return st(0, RW.foot, PI, RW.deck);
    return st(0, RW.head, PI, RW.deck);
  },
  key(k, _u, c) {
    const hips = 0.92 * (c.H / 1.6);
    if (k === 'pose') return { l: c.bd(0.25, hips + RW.deck, 0.03), r: c.bd(-0.2, 0.86 + RW.deck, 0.06), gl: 0.5, gr: 0.3, palms: 0.5, lean: -0.02, nod: -0.08, n: { lights: 1 }, props: {} };
    return { lean: 0, nod: -0.04, n: { lights: 1 }, props: {} };
  },
};
/** A model's place along the deck: how far through their turn `a` is, 0 to 1 out to the mark, back after. */
const walkOf = (a: number) => {
  const out = sm(a, 0, 0.42);
  const home = sm(a, 0.58, 1);
  return { z: RW.head + (RW.foot - RW.head) * (out - home), going: a < 0.42 || a > 0.58 ? 1 : 0, back: a > 0.5 ? 1 : 0, on: a > 0 && a < 1 ? 1 : 0 };
};
const SHOW: Script = {
  seq: [['brief', 2.2], ['cue1', 1.1], ['look1', 6], ['note1', 1.7], ['cue2', 1.1], ['look2', 6], ['note2', 1.7], ['finale', 3], ['bow', 1.8]],
  at: () => st(0, RW.floorZ),
  key(k, u, c) {
    const a = k === 'look1' ? u : 0;
    const b = k === 'look2' ? u : 0;
    const A = walkOf(a);
    const B = walkOf(b);
    const finale = k === 'finale' || k === 'bow';
    const n: Record<string, number> = {
      lights: 1,
      m1z: finale ? RW.marks[0] : A.on ? A.z : -9,
      m2z: finale ? RW.marks[1] : B.on ? B.z : -9,
      m1walk: A.on * A.going,
      m2walk: B.on * B.going,
      m1back: A.back,
      m2back: B.back,
      ticks: c.p('note1', 0.2, 0.8) + c.p('note2', 0.2, 0.8),
      clap: k === 'finale' ? 1 : 0,
      bow: k === 'bow' ? Math.sin(u * PI) : 0,
    };
    const props: Record<string, V> = { clip: c.bd(0.1, 1.1, 0.28) };
    switch (k) {
      case 'brief':
        return { tool: 'clip', r: c.bd(-0.24, 1.15, 0.26 + 0.03 * Math.sin(c.t * 3)), gr: 0.3, palms: 0.7, nod: 0.18, lean: 0.04, n, props };
      case 'cue1':
      case 'cue2':
        return { tool: 'clip', r: c.bd(-0.2, 1.3 + 0.12 * sm(u, 0.1, 0.5), 0.34), gr: 0.15, palms: 0.5, nod: -0.1, lean: 0.03, n, props };
      case 'look1':
      case 'look2':
        return { tool: 'clip', r: c.bd(-0.2, 0.95, 0.1), gr: 0.4, nod: -0.04 + 0.03 * Math.sin(c.t), lean: 0.01, n, props };
      case 'note1':
      case 'note2':
        return { tool: 'clip', r: add(c.bd(-0.02, 1.13, 0.29), 0.04 * Math.sin(c.t * 5), 0, 0), gr: 0.75, nod: 0.34, lean: 0.05, n, props };
      case 'finale': {
        const g = 0.04 * Math.abs(Math.sin(c.t * 7));
        return { l: c.bd(g, 1.22, 0.27), r: c.bd(-g, 1.22, 0.27), gl: 0.1, gr: 0.1, palms: 0.8, nod: -0.1, lean: 0, n, props };
      }
      default:
        return { ...easy(c), nod: 0.12, lean: 0.2 * Math.sin(u * PI), n, props };
    }
  },
};
const COLLECTION: Script = {
  seq: [['open', 2.6], ['look1', 3.2], ['note', 2.2], ['look2', 3.2], ['talk', 3.4], ['decide', 2]],
  at: () => st(0, RW.floorZ),
  key(k, _u, c) {
    const n = { lights: 1, m1z: RW.marks[0], m2z: RW.marks[1], meeting: 1, ticks: c.p('note', 0.2, 0.8) + c.p('decide', 0.3, 0.8) };
    const props: Record<string, V> = { clip: c.bd(0.1, 1.1, 0.28) };
    const say = c.bd(-0.24, 1.14, 0.26 + 0.04 * Math.sin(c.t * 2.9));
    switch (k) {
      case 'look1':
        return { tool: 'clip', r: c.bd(-0.14, 1.32, 0.34), gr: 0.15, palms: 0.5, nod: -0.05, lean: 0.03, n, props };
      case 'look2':
        return { tool: 'clip', r: c.bd(-0.2, 1.28, 0.34), gr: 0.15, palms: 0.5, nod: -0.03, lean: 0.03, n, props };
      case 'note':
      case 'decide':
        return { tool: 'clip', r: add(c.bd(-0.02, 1.13, 0.29), 0.04 * Math.sin(c.t * 5), 0, 0), gr: 0.75, nod: 0.34, lean: 0.05, n, props };
      default:
        return { tool: 'clip', r: say, gr: 0.3, palms: 0.7, nod: 0.05 + 0.04 * Math.sin(c.t * 1.7), lean: 0.03, n, props };
    }
  },
};

const SCRIPTS: Record<FdMotion, Script> = {
  fdSew: SEW,
  fdAlter: ALTER,
  fdCut: CUT,
  fdPattern: PATTERN,
  fdSketch: makeSketch(false),
  fdOwnLine: makeSketch(true),
  fdSales: SALES,
  fdDrape: makeDrape(false),
  fdCouture: makeDrape(true),
  fdPress: PRESS,
  fdIron: IRON,
  fdPick: PICK,
  fdFitMeasure: FIT_MEASURE,
  fdFitPin: FIT_PIN,
  fdLook: LOOK,
  fdWalk: WALK,
  fdShow: SHOW,
  fdCollection: COLLECTION,
};
