import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 디자인 스튜디오 (2026-11-01, the workplace pipeline, at the user's request). Each motion is a round of
 * beats: where the dweller is, where the hands go, and what moves. The piece reads the same script by the same clock
 * (graphicDesigner.ts), so the pen on the tablet is what moves the cursor on the monitor, and the proof that comes out
 * of the printer is the design that was on the screen. Each new round is the next invented design.
 *
 * - 디자인 PC (designDesk), sat: dgLayout builds a poster on the grid: guides, a picture dragged in, shapes drawn with
 *   the pen, the title typed, sat back to look, saved. dgRetouch: a product shot zoomed, marks brushed out, before and
 *   after. dgRush: the client on the phone, the logo resized at a run, exported and sent. dgKeys: shortcuts drilled off
 *   a card. dgFlow: a user flow drawn box by box. dgBrief: the brief read, thumbnails pencilled, the best one made up.
 * - 대형 프린터 (largePrinter): dgPrint: the job sent, the carriage runs and the sheet comes out, trimmed, held up, read
 *   through a loupe and clipped on the rail.
 * - 크리틱 벽 (dgCritWall): dgCrit: a roll from the bin, pinned up by its corners, stepped back from; the director comes
 *   and points, the note is written and stuck on it.
 * - 글꼴 견본 벽 (dgTypeWall): dgType: a finger along the big letters, a block of wood type from the drawer, a title
 *   strip tried against the wall, the chosen one tagged.
 * - 색 견본·종이 선반 (dgSwatchShelf): dgSwatch: the fan deck down and fanned, a paper from the low shelf felt between the
 *   fingers, the chip held on it.
 * - 목업 작업대 (dgMockTable): dgMock: a printed net on the mat, ruler and knife along it, scored, folded up, glued,
 *   turned in the hands and set with the others.
 * - 클라이언트 화면 (dgClientScreen): dgPresent: beside the screen, the clicker in hand, slide by slide; the client nods.
 * - 표준광 부스 (dgViewBooth): dgBooth: the lamp on, proof beside approved sheet, the loupe, the shift marked and the
 *   proof corrected.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece
 * the dweller's right hand is on +x. All names and designs are made up.
 */
export type DgMotion = 'dgLayout' | 'dgRetouch' | 'dgRush' | 'dgKeys' | 'dgFlow' | 'dgBrief' | 'dgPrint' | 'dgCrit' | 'dgType' | 'dgSwatch' | 'dgMock' | 'dgPresent' | 'dgBooth';
export const DG_MOTIONS = new Set<string>(['dgLayout', 'dgRetouch', 'dgRush', 'dgKeys', 'dgFlow', 'dgBrief', 'dgPrint', 'dgCrit', 'dgType', 'dgSwatch', 'dgMock', 'dgPresent', 'dgBooth']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const dgPhase = (p: THREE.Vector3) => frac(p.x * 0.293 + p.z * 0.611);
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
export interface DgNow {
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
export function dgNow(m: DgMotion, t: number, ph: number, H = 1.6): DgNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: A.st.y, z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: A.st.sit };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function dgPose(m: DgMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = dgNow(m, t, dgPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Hands down at the sides of a body stood. */
const rest = (c: Ctx): Pick<Key, 'l' | 'r'> => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1) });

// =============================================================================================
// 디자인 PC (designDesk, 1 × 1): sat on the chair on the front tile, the monitor at the back of the top.

export const DK = {
  top: 0.74,
  seat: [0, 0.47, 0.8] as V,
  tablet: [0.22, 0.765, 0.2] as V,
  keys: [-0.15, 0.77, 0.22] as V,
  phone: [-0.39, 0.755, 0.12] as V,
  card: [-0.15, 0.752, 0.08] as V,
  sheet: [-0.36, 0.752, 0.26] as V,
  pad: [0.2, 0.79, 0.2] as V,
};
const SAT: St = { x: DK.seat[0], y: DK.seat[1], z: DK.seat[2], yaw: PI, sit: true };
/** The pen's point on the tablet for a place on the screen (0–1 across and down). */
const penOn = (cx: number, cy: number): V => add(DK.tablet, (cx - 0.5) * 0.26, 0.012, (cy - 0.5) * 0.15);
const penHand = (p: V): V => add(p, 0.015, 0.045, 0.04);
const keysHand = (t: number, side = -0.05): V => add(DK.keys, side + 0.02 * Math.sin(t * 7), 0.02 + 0.006 * Math.sin(t * 19), 0.02);
/** A key for the pen on the tablet, the other hand on the keys. */
function penKey(c: Ctx, cx: number, cy: number, n: Record<string, number>, press = 1): Key {
  const p = add(penOn(cx, cy), 0, 0.012 * (1 - press), 0);
  return { r: penHand(p), gr: 0.88, l: keysHand(c.t * 0.25), lean: 0.1, nod: 0.08, props: { pen: p }, n: { ...n, cx, cy, down: press } };
}
const lapKey = (c: Ctx, n: Record<string, number>): Key => ({ l: c.bd(0.15, 0.22, 0.3), r: c.bd(-0.15, 0.22, 0.3), gl: 0.4, gr: 0.4, lean: -0.05, nod: 0.02 + 0.02 * Math.sin(c.t * 0.9), n: { ...n, cx: 0.86, cy: 0.9 } });
const typeKey = (c: Ctx, n: Record<string, number>): Key => ({ l: keysHand(c.t), r: add(DK.keys, 0.09 - 0.02 * Math.sin(c.t * 6.3), 0.02 + 0.006 * Math.sin(c.t * 23), 0.02), tap: true, gl: 0.25, gr: 0.25, lean: 0.1, nod: 0.12, n: { ...n, cx: 0.5, cy: 0.5 } });

const LAYOUT: Script = {
  seq: [['grid', 2.2], ['place', 3], ['draw', 3.8], ['type', 2.8], ['back', 2.2], ['save', 1.3]],
  at: () => SAT,
  key(k, u, c) {
    const n: Record<string, number> = { grid: c.p('grid', 0.1, 0.9), img: c.p('place', 0.15, 0.85), draw: c.p('draw', 0.05, 0.95), head: c.p('type', 0.1, 0.9), saved: c.p('save', 0.4, 0.8) };
    if (k === 'grid') return penKey(c, 0.15 + 0.7 * u, 0.12 + 0.76 * frac(u * 2), n);
    if (k === 'place') return penKey(c, mixN(0.12, 0.5, sm(u, 0.1, 0.85)), mixN(0.15, 0.42, sm(u, 0.1, 0.85)), n);
    if (k === 'draw') return penKey(c, 0.22 + 0.56 * frac(u * 3), 0.46 + 0.14 * Math.sin(u * 19), n);
    if (k === 'type') return typeKey(c, n);
    if (k === 'back') return lapKey(c, n);
    return { ...typeKey(c, n), tap: false, n: { ...n, cx: 0.9, cy: 0.06 } };
  },
};
const RETOUCH: Script = {
  seq: [['open', 1.8], ['zoom', 2], ['brush', 4.4], ['compare', 2.6], ['apply', 1.4]],
  at: () => SAT,
  key(k, u, c) {
    const n: Record<string, number> = { zoom: c.p('zoom', 0.1, 0.9) * (1 - c.p('compare', 0, 0.3)), healed: c.p('brush', 0.05, 0.95), split: k === 'compare' ? 0.5 + 0.4 * Math.sin(u * PI * 3) : 0, applied: c.p('apply', 0.3, 0.8) };
    if (k === 'open') return penKey(c, 0.2, 0.15 + 0.1 * u, n);
    if (k === 'zoom') return { ...penKey(c, 0.5, 0.5, n), l: add(DK.keys, -0.1, 0.02, 0.02), gl: 0.4 };
    if (k === 'brush') {
      const i = Math.floor(u * 4);
      const v = frac(u * 4);
      return penKey(c, 0.3 + i * 0.13 + 0.05 * Math.sin(v * 12), 0.34 + (i % 2) * 0.22 + 0.04 * Math.cos(v * 9), n, sm(v, 0, 0.1) * (1 - sm(v, 0.85, 1)));
    }
    if (k === 'compare') return { ...penKey(c, 0.5 + 0.4 * Math.sin(u * PI * 3) * 0.5, 0.5, n), lean: 0.02, nod: 0.03 };
    return { ...typeKey(c, n), tap: false, n: { ...n, cx: 0.9, cy: 0.06 } };
  },
};
const RUSH: Script = {
  seq: [['phone', 2.6], ['fix', 2.6], ['fix2', 2.2], ['export', 1.4], ['send', 1.1]],
  at: () => SAT,
  key(k, u, c) {
    const n: Record<string, number> = { rush: 1, size: k === 'fix' ? 1 + 0.5 * sm(u, 0.1, 0.9) : k === 'fix2' ? 1.5 - 0.72 * sm(u, 0.1, 0.9) : k === 'phone' ? 1 : 0.78, bar: k === 'export' ? u : c.p('export'), sent: c.p('send', 0.3, 0.8), said: k === 'phone' ? sm(u, 0.25, 0.4) : 0 };
    if (k === 'phone') {
      const e = sm(u, 0, 0.14) - sm(u, 0.88, 1);
      const ph = lerpV(DK.phone, c.bd(0.13, 0.6 * (c.H / 1.6), 0.06), e);
      return { l: add(ph, 0, 0, 0.01), gl: 0.95, r: penHand(penOn(0.5, 0.5)), gr: 0.88, nod: 0.03 + 0.08 * Math.sin(c.t * 3), lean: 0.03, props: { phone: ph, pen: penOn(0.5, 0.5) }, n: { ...n, cx: 0.5, cy: 0.5 } };
    }
    if (k === 'fix' || k === 'fix2') return { ...penKey(c, 0.5 + (k === 'fix' ? 0.2 : 0.28 * (1 - u)) * sm(u, 0.05, 0.9), 0.5 + 0.14 * sm(u, 0.05, 0.9) * (k === 'fix' ? 1 : 1 - u), n), lean: 0.16, nod: 0.06, props: { pen: penOn(0.6, 0.55), phone: DK.phone } };
    return { ...typeKey(c, n), tap: k === 'export', props: { phone: DK.phone }, n: { ...n, cx: 0.8, cy: 0.1 } };
  },
};
const KEYS: Script = {
  seq: [['card', 2.2], ['drill', 3.2], ['drill2', 3.2], ['check', 1.8]],
  at: () => SAT,
  key(k, u, c) {
    const done = Math.floor(c.p('drill') * 3 + c.p('drill2') * 3);
    const n: Record<string, number> = { drills: done, cue: frac(c.t * 0.9) };
    if (k === 'card') {
      const lift = sm(u, 0.1, 0.35) - sm(u, 0.8, 1);
      const card = lerpV(DK.card, c.bd(0.05, 0.42, 0.34), lift);
      return { l: add(card, 0, 0.01, 0.02), gl: 0.85, r: c.bd(-0.15, 0.22, 0.3), nod: 0.2, props: { card }, n };
    }
    if (k === 'check') return { ...lapKey(c, n), props: { card: DK.card }, nod: 0.05 };
    return { ...typeKey(c, n), nod: 0.2 + 0.08 * Math.sin(c.t * 1.4), props: { card: DK.card } };
  },
};
const FLOW: Script = {
  seq: [['box1', 2.4], ['arrow', 2.2], ['box2', 2.4], ['branch', 2.8], ['look', 1.9]],
  at: () => SAT,
  key(k, u, c) {
    const n: Record<string, number> = { nodes: c.p('box1') + c.p('arrow') + c.p('box2') * 2 + c.p('branch') * 2 };
    if (k === 'look') return lapKey(c, n);
    const col = { box1: 0.2, arrow: 0.38, box2: 0.55, branch: 0.78 }[k] ?? 0.5;
    return penKey(c, col + 0.08 * Math.sin(u * 13), 0.32 + (k === 'branch' ? u * 0.36 : 0.05 * Math.cos(u * 11)), n);
  },
};
const BRIEF: Script = {
  seq: [['read', 2.8], ['thumb', 3.6], ['pick', 1.7], ['make', 3.6], ['look', 1.8]],
  at: () => SAT,
  key(k, u, c) {
    const n: Record<string, number> = { thumbs: k === 'thumb' ? u * 3 : c.p('thumb') * 3, picked: c.p('pick', 0.2, 0.7), made: c.p('make', 0.05, 0.95) };
    const pencilHome = add(DK.pad, 0.14, 0.008, -0.02);
    if (k === 'read') {
      const e = sm(u, 0.05, 0.25) - sm(u, 0.85, 1);
      const s = lerpV(DK.sheet, c.bd(0.04, 0.42, 0.34), e);
      return { l: add(s, 0.0, 0.01, 0.02), gl: 0.85, r: c.bd(-0.15, 0.24, 0.3), nod: 0.26, props: { sheet: s, pencil: pencilHome }, n: { ...n, cx: 0.5, cy: 0.5 } };
    }
    if (k === 'thumb') {
      const i = Math.floor(u * 3) % 3;
      const v = frac(u * 3);
      const p = add(DK.pad, -0.09 + i * 0.09 + 0.03 * Math.sin(v * 16), 0.012, -0.03 + 0.03 * Math.cos(v * 13));
      return { r: penHand(p), gr: 0.9, l: add(DK.sheet, 0.03, 0.02, 0.03), lean: 0.14, nod: 0.36, props: { pencil: p, sheet: DK.sheet }, n: { ...n, cx: 0.5, cy: 0.5 } };
    }
    if (k === 'pick') {
      const p = add(DK.pad, 0, 0.014, -0.03);
      return { r: penHand(p), gr: 0.9, l: add(DK.sheet, 0.03, 0.02, 0.03), lean: 0.1, nod: 0.3, props: { pencil: p, sheet: DK.sheet }, n: { ...n, cx: 0.5, cy: 0.5 } };
    }
    if (k === 'make') return { ...penKey(c, 0.24 + 0.52 * frac(u * 2), 0.3 + 0.4 * u, n), props: { pen: penOn(0.24 + 0.52 * frac(u * 2), 0.3 + 0.4 * u), pencil: pencilHome, sheet: DK.sheet } };
    return { ...lapKey(c, n), props: { pencil: pencilHome, sheet: DK.sheet } };
  },
};

// =============================================================================================
// 대형 프린터 (largePrinter, 2 × 1): the sheet comes out of the slot and down into the basket.

export const PR = {
  stand: 0.68,
  panel: [0.72, 1.17, 0.14] as V,
  slot: [0, 0.98, 0.2] as V,
  sheetH: 0.72,
  rail: [0.28, 1.9, -0.24] as V,
};
const PRINT: Script = {
  seq: [['send', 1.9], ['wait', 4.6], ['cut', 1.7], ['look', 1.9], ['loupe', 3], ['clip', 1.9]],
  at: (k) => (k === 'send' ? st(0.5, PR.stand) : k === 'wait' ? st(0.34, PR.stand + 0.14) : k === 'clip' ? st(0.28, 0.46) : st(0, PR.stand)),
  key(k, u, c) {
    const n: Record<string, number> = { out: k === 'wait' ? u : c.p('wait'), printing: k === 'wait' ? 1 : 0, cut: c.p('cut', 0.2, 0.85), hung: c.p('clip', 0.6, 0.95) };
    const hold = c.bd(0, 0.72 * c.H, 0.34);
    switch (k) {
      case 'send':
        return { r: add(PR.panel, 0.03 * Math.sin(c.t * 5), 0.02, 0.05), gr: 0.25, tap: true, l: rest(c).l, nod: 0.26, n };
      case 'wait':
        return { ...rest(c), nod: 0.2 + 0.05 * Math.sin(c.t), n };
      case 'cut': {
        // The cutter's slide across the slot.
        const x = mixN(-0.3, 0.3, sm(u, 0.2, 0.85));
        return { r: add(PR.slot, x, 0.02, 0.05), gr: 0.85, l: add(PR.slot, -0.2, -0.2, 0.07), gl: 0.7, nod: 0.3, props: { slider: add(PR.slot, x, 0.02, 0.02) }, n };
      }
      case 'look': {
        const e = sm(u, 0.1, 0.7);
        const p = lerpV(add(PR.slot, 0, -PR.sheetH / 2, 0.02), hold, e);
        return { l: add(p, -0.26, 0.26 * (1 - e), 0.03), r: add(p, 0.26, 0.26 * (1 - e), 0.03), gl: 0.85, gr: 0.85, nod: 0.12 + 0.2 * (1 - e), props: { proof: p }, n };
      }
      case 'loupe': {
        const p = add(hold, 0, -0.06, -0.04);
        const lp = add(p, 0.1 * Math.sin(u * 7), 0.12 * Math.cos(u * 5), 0.07);
        return { l: add(p, -0.26, 0, 0.03), gl: 0.85, r: add(lp, 0.01, -0.02, 0.05), gr: 0.9, nod: 0.3, lean: 0.14, props: { proof: p, loupe: lp }, n };
      }
      default: {
        const p = lerpV(hold, add(PR.rail, 0, -0.36, 0.02), sm(u, 0.05, 0.65));
        return u > 0.72 ? { ...rest(c), nod: 0.04, n } : { l: add(p, -0.24, 0.1, 0.04), r: add(p, 0.24, 0.1, 0.04), gl: 0.85, gr: 0.85, nod: -0.02, props: { proof: p }, n };
      }
    }
  },
};

// =============================================================================================
// 크리틱 벽 (dgCritWall, 3 × 1): a wall of pinned work with a bare place in the middle.

export const CW = {
  stand: 0.36,
  slot: [0, 1.2, -0.26] as V,
  w: 0.6,
  h: 0.84,
  bin: [1.24, 0, 0.18] as V,
  boss: [1.0, 1.28] as [number, number],
};
const CRIT: Script = {
  seq: [['fetch', 1.9], ['unroll', 1.6], ['pin', 2.4], ['back', 2.2], ['talk', 3.8], ['note', 2.2], ['stick', 1.5], ['out', 1.3]],
  at: (k) => (k === 'fetch' ? st(0.86, 0.62) : k === 'back' || k === 'talk' || k === 'note' ? st(-0.08, 1.3) : st(0, CW.stand)),
  key(k, u, c) {
    const n: Record<string, number> = { sheet: k === 'unroll' ? sm(u, 0.2, 0.9) : c.p('unroll'), pins: k === 'pin' ? u * 4 : c.p('pin') * 4, boss: k === 'talk' ? sm(u, 0, 0.25) : k === 'note' ? 1 - sm(u, 0.6, 1) : 0, ring: c.p('talk', 0.45, 0.65), sticky: c.p('stick', 0.55, 0.85), talking: k === 'talk' ? 1 : 0 };
    const S = CW.slot;
    const pad = c.bd(0.05, 0.62 * c.H, 0.28);
    switch (k) {
      case 'fetch': {
        const down = sm(u, 0.05, 0.4);
        const roll = lerpV(add(CW.bin, -0.03, 0.74, 0), c.bd(0, 0.62 * c.H, 0.26), sm(u, 0.55, 0.95));
        return { r: add(roll, 0, 0, 0.03), gr: 0.9, l: rest(c).l, crouch: 0.3 * down * (1 - sm(u, 0.55, 0.95)), nod: 0.3, props: { roll }, n };
      }
      case 'unroll': {
        const roll = lerpV(add(S, 0, CW.h / 2, 0.04), add(S, 0, -CW.h / 2 * sm(u, 0.2, 0.9) + CW.h / 2, 0.04), 1);
        return { l: add(S, -CW.w / 2, CW.h / 2, 0.06), r: add(roll, CW.w / 2, -0.01, 0.05), gl: 0.8, gr: 0.8, nod: -0.02, props: { rollX: roll }, n };
      }
      case 'pin': {
        const corners: V[] = [add(S, -CW.w / 2, CW.h / 2, 0.05), add(S, CW.w / 2, CW.h / 2, 0.05), add(S, -CW.w / 2, -CW.h / 2, 0.05), add(S, CW.w / 2, -CW.h / 2, 0.05)];
        const i = Math.min(3, Math.floor(u * 4));
        const v = frac(u * 4);
        const push = 0.03 * (1 - Math.sin(v * PI));
        const hand = add(corners[i], 0, 0, push);
        const low = i > 1 ? { crouch: 0.42, lean: 0.12 } : {};
        return i % 2 === 0 ? { l: hand, gl: 0.75, r: rest(c).r, nod: i > 1 ? 0.2 : -0.02, ...low, n } : { r: hand, gr: 0.75, l: rest(c).l, nod: i > 1 ? 0.2 : -0.02, ...low, n };
      }
      case 'back':
        return { l: c.bd(0.22, 0.56 * c.H, 0.03), r: c.bd(-0.22, 0.56 * c.H, 0.03), palms: 0.1, gl: 0.5, gr: 0.5, lean: -0.03, nod: -0.02 + 0.02 * Math.sin(c.t), n };
      case 'talk':
        return { l: pad, gl: 0.8, r: c.bd(-0.17, 0.55 * c.H, 0.14), nod: 0.0 + (u > 0.3 ? 0.07 * Math.sin(c.t * 3) : 0), props: { pad }, n };
      case 'note': {
        const w = add(pad, -0.04 + 0.08 * frac(u * 4), 0.012, 0.03 * Math.sin(u * 8));
        return { l: pad, gl: 0.8, r: add(w, -0.01, 0.03, 0.05), gr: 0.9, nod: 0.36, props: { pad, pen: w }, n };
      }
      case 'stick': {
        const s = lerpV(c.bd(-0.1, 0.8 * c.H, 0.3), add(S, 0.2, 0.26, 0.05), sm(u, 0.05, 0.6));
        return { r: add(s, 0, 0, 0.03), gr: 0.7, l: rest(c).l, nod: -0.02, props: { note: u < 0.8 ? s : null }, n };
      }
      default:
        return { ...rest(c), nod: 0.02, n };
    }
  },
};
// =============================================================================================
// 글꼴 견본 벽 (dgTypeWall, 2 × 1): four big specimen boards above a drawer of wood type.

export const TW = {
  stand: 0.4,
  boards: [-0.72, -0.24, 0.24, 0.72],
  y: 1.42,
  z: -0.28,
  drawer: [0.3, 0.86, -0.08] as V,
};
const TYPE: Script = {
  seq: [['look', 2.2], ['trace', 3], ['drawer', 1.8], ['block', 2.6], ['strip', 2.8], ['tag', 1.7]],
  at: (k) => (k === 'look' ? st(-0.24, 0.78) : k === 'trace' ? st(-0.24, TW.stand) : k === 'drawer' || k === 'block' ? st(0.3, 0.68) : st(0.24, TW.stand)),
  key(k, u, c) {
    const n: Record<string, number> = { open: k === 'drawer' ? sm(u, 0.2, 0.8) : k === 'block' ? 1 - sm(u, 0.85, 1) : 0, chosen: c.p('tag', 0.4, 0.8), lit: k === 'trace' ? 1 : k === 'strip' ? 2 : k === 'tag' ? 2 : 0 };
    const B = (i: number): V => [TW.boards[i], TW.y, TW.z];
    switch (k) {
      case 'look':
        return { ...rest(c), l: c.bd(0.18, 0.62 * c.H, 0.16), gl: 0.7, nod: -0.04, n };
      case 'trace': {
        const a = u * PI * 5;
        return { r: add(B(1), 0.14 * Math.sin(a), 0.1 * Math.cos(a * 0.7), 0.05), gr: 0.15, l: rest(c).l, nod: -0.02, n };
      }
      case 'drawer': {
        const h = add(TW.drawer, 0, 0.0, 0.1 + 0.26 * sm(u, 0.2, 0.8));
        return { r: h, gr: 0.8, l: rest(c).l, nod: 0.38, lean: 0.14, crouch: 0.3, n };
      }
      case 'block': {
        const e = sm(u, 0.1, 0.4) - sm(u, 0.82, 1);
        const b = lerpV(add(TW.drawer, 0.02, 0.03, 0.22), c.bd(-0.02, 0.68 * c.H, 0.28), e);
        return { r: add(b, 0.01, 0, 0.02), gr: 0.9, l: u > 0.4 && u < 0.82 ? add(b, -0.04, -0.02, 0.02) : add(TW.drawer, -0.18, 0.01, 0.34), gl: 0.5, nod: 0.3, props: { block: u < 0.95 ? b : null }, n };
      }
      case 'strip': {
        const s = lerpV(c.bd(0, 0.7 * c.H, 0.25), add(B(2), 0, -0.1 + 0.08 * Math.sin(u * 5), 0.03), sm(u, 0.05, 0.4));
        return { l: add(s, -0.2, 0, 0.04), r: add(s, 0.2, 0, 0.04), gl: 0.8, gr: 0.8, nod: -0.02, props: { strip: s }, n };
      }
      default: {
        const s = lerpV(c.bd(-0.1, 0.72 * c.H, 0.28), add(B(2), 0.14, 0.38, 0.04), sm(u, 0.05, 0.55));
        return { r: add(s, 0, 0, 0.03), gr: 0.7, l: rest(c).l, nod: -0.02, props: { tag: u < 0.7 ? s : null }, n };
      }
    }
  },
};

// =============================================================================================
// 색 견본·종이 선반 (dgSwatchShelf, 2 × 1): chips up top, deck on the middle shelf, papers low down.

export const SW = {
  stand: 0.5,
  deck: [-0.5, 1.09, 0.02] as V,
  paper: [0.46, 0.42, 0.0] as V,
  ledge: 0.92,
};
const SWATCH: Script = {
  seq: [['scan', 2], ['deck', 1.7], ['fan', 2.6], ['pick', 2], ['paper', 2.2], ['feel', 2.2], ['match', 2.6], ['back', 1.7]],
  at: (k) => (k === 'scan' ? st(0, SW.stand + 0.12) : k === 'paper' ? st(0.42, SW.stand) : k === 'deck' || k === 'back' ? st(-0.42, SW.stand) : st(0, SW.stand)),
  key(k, u, c) {
    const hold = c.bd(0.08, 0.68 * c.H, 0.3);
    const sheetAt = c.bd(-0.1, 0.62 * c.H, 0.28);
    const n: Record<string, number> = { fan: k === 'fan' ? sm(u, 0.1, 0.9) : ['pick', 'paper', 'feel', 'match'].includes(k) ? 1 : k === 'back' ? 1 - sm(u, 0, 0.35) : 0, chip: k === 'pick' ? sm(u, 0.2, 0.7) : k === 'match' || k === 'paper' || k === 'feel' ? 1 : 0, picked: c.p('match', 0.5, 0.9) };
    switch (k) {
      case 'scan':
        return { ...rest(c), r: c.bd(-0.16, 0.62 * c.H, 0.16), gr: 0.7, nod: 0.02 + 0.05 * Math.sin(c.t), n };
      case 'deck': {
        const d = lerpV(SW.deck, hold, sm(u, 0.25, 0.95));
        return { l: add(d, 0, 0.01, 0.03), gl: 0.9, r: rest(c).r, nod: 0.12, props: { deck: d }, n };
      }
      case 'fan':
        return { l: add(hold, 0, 0.01, 0.03), gl: 0.9, r: add(hold, -0.12 * sm(u, 0.1, 0.9), 0.1 * sm(u, 0.1, 0.9), 0.04), gr: 0.75, nod: 0.3, props: { deck: hold }, n };
      case 'pick':
        return { l: add(hold, 0, 0.01, 0.03), gl: 0.9, r: add(hold, -0.08, 0.12, 0.04), gr: 0.8, nod: 0.36, props: { deck: hold }, n };
      case 'paper': {
        const d = c.bd(0.08, 0.68 * c.H, 0.3);
        const low = lerpV(sheetAt, add(SW.paper, 0, 0.03, 0.06), sm(u, 0.05, 0.4) * (1 - sm(u, 0.62, 1)));
        return { l: add(d, 0, 0.01, 0.03), gl: 0.9, r: add(low, 0.02, 0.01, 0.03), gr: 0.85, crouch: 0.78 * sm(u, 0.05, 0.35) * (1 - sm(u, 0.6, 0.95)), nod: 0.38, props: { deck: d, sheet: u > 0.3 ? low : null }, n };
      }
      case 'feel':
        return { l: add(hold, 0, 0.01, 0.03), gl: 0.9, r: add(sheetAt, 0.02 + 0.016 * Math.sin(c.t * 8), 0.01, 0.03), gr: 0.9, nod: 0.3, props: { deck: hold, sheet: sheetAt }, n };
      case 'match':
        return { l: add(sheetAt, 0.14, 0.03, 0.03), gl: 0.85, r: add(sheetAt, -0.03, 0.01, 0.03), gr: 0.75, nod: 0.34, lean: 0.08, props: { deck: add(sheetAt, 0.13, 0.04, 0.02), sheet: sheetAt }, n };
      default: {
        const d = lerpV(hold, SW.deck, sm(u, 0.1, 0.8));
        return { l: add(d, 0, 0.01, 0.03), gl: 0.9, r: rest(c).r, nod: 0.12, props: { deck: d }, n };
      }
    }
  },
};

// =============================================================================================
// 목업 작업대 (dgMockTable, 3 × 1): a printed net on the mat is cut, folded and glued into a box.

export const MK = {
  stand: 0.62,
  top: 0.88,
  net: [-0.1, 0.884, 0.16] as V,
  ruler: [0.62, 0.895, 0.2] as V,
  knife: [0.38, 0.893, 0.2] as V,
  glue: [-0.82, 0.88, 0.1] as V,
  shelf: [0.94, 0.88, -0.02] as V,
};
const MOCK: Script = {
  seq: [['lay', 1.6], ['rule', 1.3], ['cut', 3.2], ['score', 2], ['fold', 3.2], ['glue', 2.3], ['show', 2.3], ['set', 1.8]],
  at: (k) => (k === 'set' ? st(0.72, MK.stand) : k === 'rule' ? st(0.22, MK.stand) : k === 'glue' ? st(-0.42, MK.stand) : st(-0.1, MK.stand)),
  key(k, u, c) {
    const N = MK.net;
    const n: Record<string, number> = { cuts: k === 'cut' ? u : c.p('cut'), trim: c.p('cut', 0.9, 1), scored: c.p('score', 0.1, 0.9), fold: k === 'fold' ? sm(u, 0.05, 0.95) : c.p('fold'), glued: c.p('glue', 0.3, 0.85), lid: k === 'glue' ? sm(u, 0.5, 0.95) : c.p('glue'), placed: 0 };
    const props: Record<string, V | null> = { box: N, ruler: MK.ruler, knife: MK.knife, tube: MK.glue };
    switch (k) {
      case 'lay': {
        const b = lerpV(add(N, -0.2, 0.3, 0.1), N, sm(u, 0.05, 0.85));
        return { l: add(b, -0.25, 0.02, 0.05), r: add(b, 0.25, 0.02, 0.05), gl: 0.75, gr: 0.75, nod: 0.36, props: { ...props, box: b }, n };
      }
      case 'rule': {
        const r = lerpV(MK.ruler, add(N, 0, 0.012, -0.2), sm(u, 0.1, 0.85));
        return { l: add(r, -0.2, 0.02, 0.02), gl: 0.8, r: add(MK.knife, 0, 0.02, 0.02), gr: 0.7, nod: 0.44, lean: 0.14, props: { ...props, ruler: r }, n };
      }
      case 'cut': {
        const v = frac(u * 3);
        const i = Math.floor(u * 3) % 3;
        const z = [-0.16, 0.0, 0.16][i];
        const kn = add(N, -0.3 + 0.6 * sm(v, 0.05, 0.9), 0.012, z);
        const ru = add(N, 0, 0.012, z - 0.02);
        return { l: add(ru, -0.2, 0.02, 0.02), gl: 0.8, r: add(kn, 0.015, 0.05, 0.04), gr: 0.92, nod: 0.5, lean: 0.2, props: { ...props, ruler: ru, knife: kn }, n };
      }
      case 'score': {
        const v = frac(u * 2);
        const kn = add(N, -0.28 + 0.56 * v, 0.008, u < 0.5 ? -0.08 : 0.08);
        return { l: add(N, -0.32, 0.02, 0.1), gl: 0.7, r: add(kn, 0.015, 0.05, 0.04), gr: 0.92, nod: 0.46, lean: 0.16, props: { ...props, knife: add(MK.knife, 0, 0, 0), ruler: MK.ruler, bone: kn }, n };
      }
      case 'fold': {
        const y = 0.08 * sm(u, 0.05, 0.9);
        return { l: add(N, -0.11, y + 0.02, 0.05), r: add(N, 0.11, y + 0.02, 0.05), gl: 0.75, gr: 0.75, nod: 0.44, lean: 0.12, props, n };
      }
      case 'glue': {
        const g = lerpV(MK.glue, add(N, -0.13, 0.13, 0.06), sm(u, 0.05, 0.35) - sm(u, 0.72, 0.95));
        return { l: add(g, 0, 0.02, 0.03), gl: 0.9, r: add(N, 0.1, 0.12, 0.05), gr: 0.75, nod: 0.42, lean: 0.1, props: { ...props, tube: g }, n };
      }
      case 'show': {
        const a = c.bd(0, 0.68 * c.H, 0.28);
        const b = lerpV(N, a, sm(u, 0.05, 0.45));
        return { l: add(b, 0.09, 0, 0.02), r: add(b, -0.09, 0, 0.02), gl: 0.85, gr: 0.85, nod: 0.24, props: { ...props, box: b }, n: { ...n, spin: sm(u, 0.4, 1) * PI * 2 } };
      }
      default: {
        const a = lerpV(c.bd(0, 0.68 * c.H, 0.28), MK.shelf, sm(u, 0.1, 0.8));
        return { l: add(a, 0.09, 0.04, 0.03), r: add(a, -0.09, 0.04, 0.03), gl: 0.85, gr: 0.85, lean: 0.2, nod: 0.24, props: { ...props, box: a }, n: { ...n, placed: sm(u, 0.75, 0.95) } };
      }
    }
  },
};

// =============================================================================================
// 클라이언트 화면 (dgClientScreen, 3 × 1): stood beside it, turned out to the room.

export const CS = {
  stand: [-1.24, 0.72] as [number, number],
  screenY: 1.42,
  z: -0.26,
  client: [0.96, 1.32] as [number, number],
};
const PRESENT: Script = {
  seq: [['open', 2], ['s1', 2.8], ['s2', 2.8], ['point', 2.6], ['s3', 2.8], ['ask', 3], ['note', 1.8]],
  at: () => st(CS.stand[0], CS.stand[1], 0.42),
  key(k, u, c) {
    const slide = k === 'open' ? 0 : k === 's1' ? 1 : k === 's2' || k === 'point' ? 2 : 3;
    const n: Record<string, number> = { slide, on: k === 'open' ? sm(u, 0.2, 0.7) : 1, there: k === 'open' ? sm(u, 0, 0.6) : 1, circled: k === 'point' ? sm(u, 0.3, 0.8) : 0, talk: k === 'ask' ? 1 : 0, nodClient: k === 's2' || k === 's3' || k === 'ask' ? 1 : 0 };
    const clicker = c.bd(-0.12, 0.62 * c.H, 0.26);
    const push = 0.012 * Math.max(0, Math.sin(u * PI * 2));
    const props = { clicker: add(clicker, 0, push, 0) };
    if (k === 'point') return { l: [-0.86 + 0.03 * Math.sin(c.t * 2), CS.screenY + 0.04, 0.42] as V, gl: 0.2, r: add(clicker, 0, 0, 0.02), gr: 0.9, nod: 0.02, props, n };
    if (k === 'ask') return { l: c.bd(0.18, 0.62 * c.H, 0.26), gl: 0.3, palms: 0.8, r: add(clicker, 0, 0, 0.02), gr: 0.9, nod: 0.05 + 0.04 * Math.sin(c.t * 3), props, n };
    if (k === 'note') return { ...rest(c), r: add(clicker, 0, -0.1, -0.05), gr: 0.9, nod: 0.08, props: { clicker: add(clicker, 0, -0.1, -0.05) }, n };
    return { l: c.bd(0.22, 0.62 * c.H, 0.2 + 0.06 * Math.sin(c.t * 2)), gl: 0.3, palms: 0.6, r: add(clicker, 0, 0, 0.02), gr: 0.9, nod: 0.03 + 0.03 * Math.sin(c.t * 2.4), props, n };
  },
};

// =============================================================================================
// 표준광 부스 (dgViewBooth, 2 × 1): a grey hood with its daylight lamp over a sloping board.

export const VB = {
  stand: 0.52,
  deck: 0.9,
  switch: [0.82, 1.02, 0.14] as V,
  ok: [-0.26, 1.05, -0.12] as V,
  proof: [0.22, 1.05, -0.12] as V,
  tray: [0.74, 0.91, 0.14] as V,
};
const BOOTH: Script = {
  seq: [['lamp', 1.5], ['lay', 2], ['compare', 3], ['loupe', 2.8], ['mark', 2.3], ['fixed', 2.2], ['off', 1.4]],
  at: (k) => (k === 'lamp' || k === 'off' || k === 'lay' ? st(0.5, VB.stand) : st(0, VB.stand)),
  key(k, u, c) {
    const n: Record<string, number> = { lamp: k === 'off' ? 1 - sm(u, 0.4, 0.7) : k === 'lamp' ? sm(u, 0.4, 0.7) : 1, ring: k === 'mark' ? sm(u, 0.15, 0.75) : k === 'fixed' || k === 'off' ? 1 : 0, ok: k === 'fixed' ? sm(u, 0.1, 0.8) : k === 'off' ? 1 : 0 };
    const props: Record<string, V | null> = { proof: VB.proof, loupe: VB.tray, pen: null };
    switch (k) {
      case 'lamp':
      case 'off':
        return { r: add(VB.switch, 0, 0.01, 0.05), gr: 0.25, l: rest(c).l, nod: 0.22, props: k === 'off' ? props : { ...props, proof: VB.tray }, n };
      case 'lay': {
        const p = lerpV(VB.tray, VB.proof, sm(u, 0.05, 0.85));
        return { r: add(p, 0.1, 0.02, 0.05), l: add(p, -0.1, 0.02, 0.05), gl: 0.8, gr: 0.8, nod: 0.26, props: { ...props, proof: p }, n };
      }
      case 'compare': {
        const i = Math.floor(u * 3) % 2;
        return { l: add(VB.ok, 0, 0.06 * Math.sin(u * 7), 0.09), gl: 0.15, r: rest(c).r, lean: 0.14, nod: 0.26 + (i ? 0.04 : -0.04), props, n: { ...n, look: i } };
      }
      case 'loupe': {
        const lp = add(VB.proof, 0.06 * Math.sin(u * 7), 0.03 * Math.cos(u * 5), 0.06);
        return { r: add(lp, 0.01, 0.02, 0.05), gr: 0.9, l: add(VB.proof, -0.16, -0.08, 0.05), gl: 0.5, lean: 0.2, nod: 0.36, props: { ...props, loupe: lp }, n };
      }
      case 'mark': {
        const a = u * PI * 4;
        const pen = add(VB.proof, 0.03 + 0.05 * Math.cos(a), 0.04 + 0.05 * Math.sin(a), 0.04);
        return { r: add(pen, 0.01, 0, 0.05), gr: 0.9, l: add(VB.proof, -0.16, -0.08, 0.05), gl: 0.5, lean: 0.18, nod: 0.34, props: { ...props, pen }, n };
      }
      default:
        return { l: c.bd(0.16, 0.6 * c.H, 0.2), r: c.bd(-0.16, 0.6 * c.H, 0.2), gl: 0.3, gr: 0.3, lean: 0.06, nod: 0.2 + 0.08 * Math.sin(c.t * 2.2), props, n };
    }
  },
};

const SCRIPTS: Record<DgMotion, Script> = { dgLayout: LAYOUT, dgRetouch: RETOUCH, dgRush: RUSH, dgKeys: KEYS, dgFlow: FLOW, dgBrief: BRIEF, dgPrint: PRINT, dgCrit: CRIT, dgType: TYPE, dgSwatch: SWATCH, dgMock: MOCK, dgPresent: PRESENT, dgBooth: BOOTH };
