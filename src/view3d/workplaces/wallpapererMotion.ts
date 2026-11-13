import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day on an apartment refit by the made-up firm 두레벽 인테리어 (2026-11-01). Each motion is a round of beats: where the dweller is,
 * where the hands go, what's held and how far the work has got. The piece reads the same script by the same clock
 * (wallpaperer.ts), so the strip really goes up under the smoother, the paint follows the roller and the tile stays where it's set.
 *
 * - 도배 풀칠대 (wallpaperTable): wlPaste a strip pulled off the roll, cut, pasted with the wide brush, booked and stacked. wlMeasureRoom the
 *   wall's sizes taped on the plan with the senior across the table. wlPickPaper the sample book shown to the owner.
 * - 타일 절단기 (tileSaw): wlCutTile marked, pushed through the wet blade, the two parts lifted off. wlTilePlan the layout drawn on the clipboard.
 * - 시공 연습 벽 (mockWall): wlHang up the bench with a booked strip, opened down the wall, smoothed, trimmed top and bottom. wlWallTile adhesive
 *   combed on and tiles pressed in a row. wlDeadline the strip again, against the clock. wlQuote the wall gone over for the estimate.
 * - 페인트 벽 (wlPaintWall): wlRoll the roller loaded in the tray and run up and down a column. wlCutIn the edge cut in with a small brush.
 * - 바닥 시공 구역 (wlFloorBay): wlPlank boards set and tapped home with the mallet. wlFloorTile adhesive, tiles set and tapped. From a low
 *   rolling stool, the deck raised because no arm gets to a real floor from a crouch.
 * - 천장 모서리 (wlCeilingCorner): wlCeiling up the stepladder, a bead along the moulding, smoothed.
 * - 실측 벽 (wlMeasureBay): wlLaser the line laser levelled and its height marked. wlTape the window's width taped and written down.
 * - 현장 도면판 (wlSitePlan): wlPlan the day's rooms inked on the pinned plan. 자재 더미 (wlMaterials): wlStock rolls counted, one shifted.
 * - 완성 방 (wlFinishRoom): wlWalk the owner shown round the finished room, the light switched on and the sheet signed.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the dweller's right
 * hand is on +x. `tool` names what's in the hand this beat (handTool.ts), its place in `props`.
 */
export type WlMotion = 'wlPaste' | 'wlMeasureRoom' | 'wlPickPaper' | 'wlCutTile' | 'wlTilePlan' | 'wlHang' | 'wlWallTile' | 'wlDeadline' | 'wlQuote' | 'wlRoll' | 'wlCutIn' | 'wlPlank' | 'wlFloorTile' | 'wlCeiling' | 'wlLaser' | 'wlTape' | 'wlPlan' | 'wlStock' | 'wlWalk';
export const WL_MOTIONS = new Set<string>(['wlPaste', 'wlMeasureRoom', 'wlPickPaper', 'wlCutTile', 'wlTilePlan', 'wlHang', 'wlWallTile', 'wlDeadline', 'wlQuote', 'wlRoll', 'wlCutIn', 'wlPlank', 'wlFloorTile', 'wlCeiling', 'wlLaser', 'wlTape', 'wlPlan', 'wlStock', 'wlWalk']);
export type WlTool = 'brush' | 'knife' | 'smoother' | 'pencil' | 'tape' | 'clip' | 'trowel' | 'tile' | 'roller' | 'rollerWall' | 'cutBrush' | 'mallet' | 'plank' | 'caulk' | 'book' | 'bundle' | 'roll';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const wlPhase = (p: THREE.Vector3) => frac(p.x * 0.413 + p.z * 0.587);
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
export const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;
const norm = (a: V): V => {
  const L = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / L, a[1] / L, a[2] / L];
};
const from = (tip: V, dir: V, up: number): V => {
  const d = norm(dir);
  return [tip[0] - d[0] * up, tip[1] - d[1] * up, tip[2] - d[2] * up];
};

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
const sat = (x: number, y: number, z: number, yaw = PI): St => ({ x, y, z, yaw, sit: true });
interface Key {
  l?: V;
  r?: V;
  lean?: number;
  nod?: number;
  palms?: number;
  gl?: number;
  gr?: number;
  tap?: boolean;
  crouch?: number;
  tool?: WlTool;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
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
export interface WlNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: WlTool | null;
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
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function wlNow(m: WlMotion, t: number, ph: number, H = 1.6): WlNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  // Easing round the end of the list, the next beat belongs to the next round.
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.i === s.seq.length - 1 ? b.n + 1 : b.n) : A;
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
  // A round's numbers don't blend back to its start: what's done stays done until the beat has gone over.
  const n: Record<string, number> = {};
  const wraps = b.i === s.seq.length - 1 && e > 0;
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) {
    const x = A.key.n?.[k] ?? 0;
    const y = B.key.n?.[k] ?? 0;
    n[k] = wraps ? (e < 0.5 ? x : y) : mixN(x, y, e);
  }
  let tool = (e < 0.5 ? A.key.tool : B.key.tool) ?? null;
  // On and off the wall the head swings out past the other arm: the one hand brings it, both take it for the strokes.
  if (tool === 'rollerWall' && e > 0 && (b.from === 'to' || b.to === 'back')) tool = 'roller';
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function wlPose(m: WlMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = wlNow(m, t, wlPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const crouch = k.crouch ?? 0;
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch };
  return {
    pose,
    doing: {
      crouch,
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
    },
  };
}
const easy = (c: Ctx): Key => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });

// What the tools are and how they lie, shared with the builders.
export const BRUSH_UP = 0.2;
export const BRUSH_DIR: V = [0, -0.8, -0.6];
export const KNIFE_UP = 0.09;
export const KNIFE_TABLE: V = [0.05, -0.85, -0.5];
export const KNIFE_WALL: V = [0, -0.25, -1];
export const SMOOTH_UP = 0.1;
export const SMOOTH_DIR: V = [0, -0.2, -1];
export const PEN_UP = 0.075;
export const PEN_DIR: V = [-0.13, -0.92, -0.37];
export const PEN_WALL: V = [-0.1, -0.3, -0.95];
export const MALLET_UP = 0.2;
export const MALLET_DIR: V = [-0.2, -0.45, -0.87];
export const CUT_UP = 0.12;
export const CUT_DIR: V = [0.1, -0.1, -1];
export const CAULK_DIR: V = [0, 0.55, -0.84];
export const CAULK_UP = 0.32;
export const POLE = 0.8;

/** A long-poled roller: from the head on the wall back along the pole to the upper hand, and which way it runs. */
export function pole(head: V, hand: V): { grip: V; dir: V } {
  const dir = norm([head[0] - hand[0], head[1] - hand[1], head[2] - hand[2]]);
  return { grip: from(head, dir, POLE), dir };
}

// =============================================================================================
// 도배 풀칠대 (wallpaperTable, 2 × 1): trestles, the roll on a spindle at the left, the tub at the right. The strip runs along x.

export const WT = {
  top: 0.8,
  tz: -0.1,
  stand: 0.38,
  stripZ: -0.02,
  stripW: 0.38,
  x0: -0.82,
  x1: 0.46,
  tub: [0.72, 0.87, -0.2] as V,
  stack: [0.72, 0.84, 0.1] as V,
  brushHome: [0.72, 1.08, -0.2] as V,
  knifeHome: [0.62, 0.815, 0.14] as V,
  sheet: [-0.1, 0.803, -0.02] as V,
  mate: [0.55, 0, -0.98] as V,
  owner: [-0.1, 0, -0.98] as V,
};
const PASTE: Script = {
  seq: [['pull', 1.3], ['pullB', 1.3], ['cut', 2], ['dip', 1.1], ['pasteL', 3.2], ['dip2', 1], ['pasteR', 2.8], ['fold', 1.8], ['stack', 1.4]],
  at: (k) => (k === 'pull' ? st(-0.42, WT.stand) : k === 'pasteL' ? st(-0.6, WT.stand) : k === 'pasteR' ? st(0, WT.stand) : k === 'pullB' ? st(0.06, WT.stand) : k === 'cut' ? st(0.16, WT.stand) : st(0.28, WT.stand)),
  key(k, u, c) {
    const n = { len: c.p('pull') * 0.5 + c.p('pullB') * 0.5, cut: c.p('cut', 0.2, 0.9), paste: c.p('pasteL', 0, 1) * 0.55 + c.p('pasteR', 0, 1) * 0.45, fold: c.p('fold'), gone: c.p('stack', 0.1, 0.25), stacked: c.p('stack', 0.8, 0.95) };
    const end = k === 'pull' ? mixN(-0.6, -0.1, sm(u, 0, 1)) : mixN(-0.1, WT.x1, sm(u, 0, 1));
    const tipY = WT.top + 0.012;
    const props: Record<string, V> = { brush: WT.brushHome, knife: WT.knifeHome };
    switch (k) {
      case 'pull':
      case 'pullB':
        return { l: [k === 'pull' ? -0.6 : -0.1, tipY + 0.04, WT.stripZ + 0.05], r: [end, tipY + 0.04, WT.stripZ + 0.05], gl: 0.2, gr: 0.75, lean: 0.24, nod: 0.3, n, props };
      case 'cut': {
        const knife = from([WT.x1, tipY, WT.stripZ + WT.stripW / 2 - WT.stripW * sm(u, 0.1, 0.9)], KNIFE_TABLE, KNIFE_UP);
        props.knife = knife;
        return { l: [WT.x1 - 0.25, tipY + 0.03, WT.stripZ], gl: 0.05, palms: 0.05, tool: 'knife', lean: 0.28, nod: 0.36, n, props };
      }
      case 'dip':
      case 'dip2': {
        props.brush = from(add(WT.tub, 0, -0.02 + 0.05 * Math.sin(u * PI * 2), 0.03), BRUSH_DIR, BRUSH_UP);
        return { l: k === 'dip' ? [0.3, tipY + 0.03, WT.stripZ] : [0.2, tipY + 0.03, WT.stripZ], gl: 0.05, palms: 0.05, tool: 'brush', lean: 0.26, nod: 0.3, n, props };
      }
      case 'pasteL':
      case 'pasteR': {
        const x = k === 'pasteL' ? mixN(-0.72, -0.1, u) : mixN(-0.1, 0.46, u);
        props.brush = from([x, tipY + 0.01, WT.stripZ + 0.14 * Math.sin(u * PI * 9)], BRUSH_DIR, BRUSH_UP);
        return { ...(k === 'pasteL' ? { l: [-0.72, tipY + 0.05, WT.tz + 0.24] as V } : { l: [0.08, tipY + 0.03, WT.tz + 0.27] as V }), gl: 0.05, palms: 0.1, tool: 'brush', lean: 0.26, nod: 0.34, n, props };
      }
      case 'fold':
        return { l: [mixN(WT.x1, 0.15, sm(u, 0, 1)), tipY + 0.05 + 0.12 * Math.sin(u * PI), WT.stripZ + 0.1], r: [mixN(WT.x1 + 0.02, 0.2, sm(u, 0, 1)), tipY + 0.05 + 0.12 * Math.sin(u * PI), WT.stripZ - 0.08], gl: 0.6, gr: 0.6, lean: 0.24, nod: 0.3, n, props };
      default:
        props.bundle = add(lerpV([0.1, WT.top + 0.06, WT.stripZ], WT.stack, sm(u, 0.1, 0.9)), 0, 0.05 * Math.sin(u * PI), 0);
        return { tool: 'bundle', lean: 0.2, nod: 0.26, n, props };
    }
  },
};
const clipAt = (c: Ctx): V => c.bd(0.02, 0.66 * c.H, 0.26);
const MEASURE_ROOM: Script = {
  seq: [['sheet', 1.5], ['tape1', 2.8], ['read', 1.6], ['tape2', 2.8], ['write', 3], ['nod', 1.4]],
  at: () => st(-0.1, WT.stand),
  key(k, u, c) {
    const n = { sheet: 1, marks: c.p('tape1', 0.7, 1) + c.p('tape2', 0.7, 1), ticks: c.p('write', 0, 1) * 4, tapeSpin: k === 'tape1' ? 0 : 1, mateNod: k === 'read' || k === 'nod' ? 1 : 0, mate: 1 };
    const y = WT.top + 0.02;
    switch (k) {
      case 'tape1':
        return { tool: 'tape', lean: 0.26, nod: 0.36, n, props: { tape: [-0.1, y, WT.stripZ + 0.02 * Math.sin(u * PI)] } };
      case 'tape2':
        return { tool: 'tape', lean: 0.26, nod: 0.36, n, props: { tape: [-0.1, y, WT.stripZ - 0.08] } };
      case 'read':
        return { l: [-0.3, y + 0.03, 0.04], r: [0.1, y + 0.03, 0.04], gl: 0.05, gr: 0.05, palms: 0.05, lean: 0.24, nod: 0.38, n };
      case 'write':
        return { tool: 'clip', lean: 0.06, nod: 0.3, n, props: { clip: clipAt(c) } };
      case 'nod':
        return { ...easy(c), lean: 0.03, nod: 0.04 + 0.12 * Math.abs(Math.sin(c.t * 2.4)), n };
      default:
        return { l: [-0.28, y + 0.02, 0.02], r: [0.1, y + 0.02, 0.02], gl: 0.05, gr: 0.05, palms: 0.05, lean: 0.22, nod: 0.34, n };
    }
  },
};
const PICK: Script = {
  seq: [['open', 1.6], ['show1', 2.6], ['flip', 1], ['show2', 2.6], ['lay', 1.8], ['agree', 2]],
  at: () => st(-0.1, WT.stand),
  key(k, u, c) {
    const book = c.bd(0, 1.02, 0.3);
    const n = { owner: 1, page: k === 'flip' ? u + 1 : c.p('flip', 0, 1) * 1 + wrap(c.round, 3) * 2, ownerNod: k === 'agree' ? 1 : 0, sample: c.p('lay', 0.6, 0.9) };
    switch (k) {
      case 'lay':
        return { l: [-0.34, WT.top + 0.03, WT.stripZ], r: [0.14, WT.top + 0.03, WT.stripZ], gl: 0.05, gr: 0.05, palms: 0.04, lean: 0.25, nod: 0.3, n };
      case 'agree':
        return { ...easy(c), l: c.bd(0.05, 1.1, 0.2), r: [0.05, WT.top + 0.03, WT.stripZ], gl: 0.3, gr: 0.05, lean: 0.16, nod: 0.1, palms: 0.5, n };
      default:
        return { tool: 'book', lean: 0.08, nod: 0.26, n, props: { book } };
    }
  },
};

// =============================================================================================
// 타일 절단기 (tileSaw, 1 × 1): a wet saw at the right of a steel stand, a stack of tiles on the shelf at the left.

export const TS = {
  top: 0.84,
  blade: [0.14, 0.86, -0.02] as V,
  stand: 0.48,
  x: -0.04,
  pile: [-0.34, 0.87, 0.02] as V,
  slideFrom: 0.3,
  slideTo: 0.0,
  done: [-0.34, 0.87, -0.14] as V,
  pencil: [-0.3, 0.85, 0.3] as V,
};
const CUT_TILE: Script = {
  seq: [['take', 1.4], ['load', 1], ['mark', 2], ['set', 1], ['push', 4], ['off', 1.6], ['stack', 1.2]],
  at: (k) => (k === 'take' || k === 'stack' ? st(-0.24, 0.36) : st(TS.x, TS.stand)),
  key(k, u, c) {
    const slide = c.p('set') * mixN(0, 1, c.p('push', 0, 1));
    const z = mixN(TS.slideFrom, TS.slideTo, slide);
    const n = { onTable: c.p('load', 0.7, 0.95) * (1 - c.p('off', 0.3, 0.5)), cut: c.p('push', 0.1, 0.92), slide, run: k === 'set' || k === 'push' ? 1 : 0, split: c.p('off', 0, 0.3), fromPile: c.p('take', 0.4, 0.7), stacked: c.p('stack', 0.7, 0.95) };
    const hy = TS.top + 0.07;
    const palm = (p: V): V => add(p, 0, 0.018, 0);
    switch (k) {
      case 'take':
        return { tool: 'tile', lean: 0.24, nod: 0.26, n, props: { tile: palm(lerpV(TS.pile, [TS.blade[0], TS.top + 0.05, TS.slideFrom], sm(u, 0.5, 1) * 0.4)) } };
      case 'load':
        return { tool: 'tile', lean: 0.22, nod: 0.3, n, props: { tile: palm(lerpV(lerpV(TS.pile, [TS.blade[0], TS.top + 0.05, TS.slideFrom], 0.4), [TS.blade[0], TS.top + 0.05, TS.slideFrom], sm(u, 0, 0.9))) } };
      case 'mark':
        return { l: [TS.blade[0] - 0.14, TS.top + 0.08, TS.slideFrom + 0.04], gl: 0.05, palms: 0.05, tool: 'pencil', lean: 0.2, nod: 0.38, n, props: { pencil: from([TS.blade[0], TS.top + 0.075, TS.slideFrom + 0.1 - 0.2 * sm(u, 0.1, 0.9)], PEN_DIR, PEN_UP) } };
      case 'set':
      case 'push':
        return { l: [TS.blade[0] - 0.15, hy, z + 0.03], r: [TS.blade[0] + 0.15, hy, z + 0.03], gl: 0.25, gr: 0.25, palms: 0.05, lean: 0.24, nod: 0.36, n };
      case 'off': {
        const lift = sm(u, 0, 0.6);
        return { l: [TS.blade[0] - 0.11, hy + lift * 0.1, TS.slideTo + 0.03], r: [TS.blade[0] + 0.11, hy + lift * 0.1, TS.slideTo + 0.03], gl: 0.5, gr: 0.5, lean: 0.24, nod: 0.3, n };
      }
      default: {
        const e = sm(u, 0, 0.8);
        return { l: lerpV([TS.blade[0] - 0.11, hy + 0.1, 0.03], add(TS.done, -0.04, 0.05, 0), e), r: lerpV([TS.blade[0] + 0.11, hy + 0.1, 0.03], add(TS.done, 0.05, 0.05, 0), e), gl: 0.5, gr: 0.5, lean: 0.26, nod: 0.26, n };
      }
    }
  },
};
const TILE_PLAN: Script = {
  seq: [['look', 1.8], ['draw', 5], ['count', 1.8]],
  at: () => st(TS.x, TS.stand),
  key(k, _u, c) {
    const n = { ticks: c.p('draw', 0, 1) * 16 };
    if (k === 'look') return { l: [TS.pile[0] + 0.02, TS.pile[1] + 0.05, TS.pile[2]], r: [TS.pile[0] + 0.24, TS.pile[1] + 0.03, TS.pile[2]], gl: 0.05, gr: 0.05, palms: 0.05, lean: 0.2, nod: 0.3, n };
    return { tool: 'clip', lean: 0.06, nod: 0.3, n, props: { clip: clipAt(c) } };
  },
};

// =============================================================================================
// 시공 연습 벽 (mockWall, 2 × 1): the wall on a plinth (so its bottom edge is within reach), a bench scaffold, tile at its right.

export const MW = {
  face: -0.22,
  top: 2.02,
  bottom: 0.45,
  strips: [-0.72, -0.28, 0.16] as readonly number[],
  stripW: 0.44,
  bench: 0.32,
  benchZ: 0.12,
  floorZ: 0.06,
  trolley: [-0.86, 0.66, 0.42] as V,
  tileCols: [0.54, 0.7, 0.86] as readonly number[],
  tileY: 0.6,
  tileH: 0.16,
  tileRows: 6,
  bucket: [0.92, 0.6, 0.42] as V,
  tilePile: [0.66, 0.58, 0.38] as V,
  knifeHome: [-0.8, 0.72, 0.5] as V,
  smootherHome: [-0.92, 0.75, 0.38] as V,
  trowelHome: [0.92, 0.72, 0.42] as V,
};
const hang = (speed: number, rush: number): Script => ({
  seq: [['take', 1.2 * speed], ['climb', 0.9 * speed], ['set', 1.6 * speed], ['open', 2 * speed], ['smoothTop', 2.4 * speed], ['trimTop', 1.6 * speed], ['down', 0.9 * speed], ['smoothLow', 2.4 * speed], ['trimLow', 1.8 * speed], ['look', 1.2 * speed]],
  at(k, round) {
    const x = MW.strips[wrap(round, 3)];
    if (k === 'take') return st(mixN(MW.trolley[0], x, 0.2) + 0.15, 0.36);
    if (k === 'climb' || k === 'set' || k === 'open' || k === 'smoothTop' || k === 'trimTop') return st(x, MW.benchZ, PI, MW.bench);
    if (k === 'look') return st(x, 0.42);
    return st(x, MW.floorZ);
  },
  key(k, u, c) {
    const i = wrap(c.round, 3);
    const x = MW.strips[i];
    const W = MW.stripW;
    const f = MW.face + 0.006;
    const n: Record<string, number> = {
      idx: i,
      rush,
      carried: k === 'take' || k === 'climb' || k === 'set' ? 1 : 0,
      top: c.p('set', 0.5, 0.95),
      open: c.p('open', 0, 0.95),
      smooth: c.p('smoothTop') * 0.45 + c.p('smoothLow') * 0.55,
      trim: c.p('trimTop') * 0.5 + c.p('trimLow') * 0.5,
      bench: c.p('down', 0, 0.9) * (1 - c.p('look', 0.7, 1)),
    };
    const props: Record<string, V> = {};
    const palmOn = (y: number, side: number): V => [x + side * 0.15, y, f + 0.03];
    switch (k) {
      case 'take':
        props.bundle = lerpV(add(MW.trolley, 0, 0.04, 0), c.bd(0, 1.05, 0.26), sm(u, 0.35, 1));
        return { tool: 'bundle', lean: 0.16, nod: 0.24, crouch: 0.3 * (1 - sm(u, 0.4, 1)), n, props };
      case 'climb':
        props.bundle = c.bd(0, 1.05, 0.26);
        return { tool: 'bundle', lean: 0.04, nod: 0.05, n, props };
      case 'set':
        props.bundle = lerpV(c.bd(0, 1.05, 0.26), [x, MW.top - 0.02, f + 0.06], sm(u, 0, 0.7));
        return { tool: 'bundle', lean: 0.04, nod: -0.25, n, props };
      case 'open': {
        const y = mixN(MW.top - 0.04, 1.2, sm(u, 0, 1));
        return { l: palmOn(y + 0.02, -0.5), r: palmOn(y, 0.5), gl: 0.15, gr: 0.15, palms: 0.05, lean: 0.12 + 0.12 * u, nod: mixN(-0.25, 0.3, u), n };
      }
      case 'smoothTop': {
        const y = mixN(MW.top - 0.05, 1.25, u);
        const dx = 0.14 * Math.sin(u * PI * 7);
        props.smoother = from([x + dx, y, f + 0.008], SMOOTH_DIR, SMOOTH_UP);
        return { l: [x - 0.18, Math.min(MW.top - 0.04, y + 0.12), f + 0.03], gl: 0.05, palms: 0.04, tool: 'smoother', lean: 0.14, nod: mixN(-0.25, 0.25, u), n, props };
      }
      case 'trimTop':
        props.knife = from([x + W / 2 - W * sm(u, 0.05, 0.95), MW.top, f + 0.005], KNIFE_WALL, KNIFE_UP);
        return { l: [x - 0.1, MW.top - 0.12, f + 0.03], gl: 0.05, palms: 0.04, tool: 'knife', lean: 0.1, nod: -0.25, n, props };
      case 'down':
        return { l: c.bd(0.2, 0.9, 0.1), r: c.bd(-0.2, 0.9, 0.1), gl: 0.3, gr: 0.3, lean: 0.1, nod: 0.3, n };
      case 'smoothLow': {
        const y = mixN(1.25, 0.56, u);
        const dx = 0.14 * Math.sin(u * PI * 7);
        props.smoother = from([x + dx, y, f + 0.008], SMOOTH_DIR, SMOOTH_UP);
        return { l: [x - 0.18, y + 0.14, f + 0.03], gl: 0.05, palms: 0.04, tool: 'smoother', lean: 0.12 + 0.16 * u, nod: 0.2 + 0.2 * u, crouch: sm(u, 0.3, 1) * 0.75, n, props };
      }
      case 'trimLow':
        props.knife = from([x - W / 2 + W * sm(u, 0.05, 0.95), MW.bottom + 0.02, f + 0.005], KNIFE_WALL, KNIFE_UP);
        return { l: [x, MW.bottom + 0.16, f + 0.03], gl: 0.05, palms: 0.04, tool: 'knife', lean: 0.28, nod: 0.45, crouch: 1, n, props };
      default:
        return { ...easy(c), l: c.bd(0.18, 0.62 * c.H, 0.08), r: [x + 0.12, 1.15, f + 0.3], gl: 0.3, gr: 0.3, lean: 0.02, nod: -0.03, n };
    }
  },
});
const rowY = (round: number) => MW.tileY + wrap(round, MW.tileRows) * MW.tileH;
const TROWEL_OFF = 0.045;
/** How far down they go for a row at this height. */
const rowCrouch = (y: number) => THREE.MathUtils.clamp((1.15 - y) / 0.5, 0, 1);
const WALL_TILE: Script = {
  seq: [['scoop', 1.4], ['comb', 2.4], ['take0', 1], ['set0', 1.2], ['take1', 1], ['set1', 1.2], ['take2', 1], ['set2', 1.2], ['check', 1.4]],
  at: (k) => (k === 'scoop' ? st(0.78, 0.1) : k.startsWith('take') ? st(0.72, 0.1) : st(0.7, 0.04)),
  key(k, u, c) {
    const row = wrap(c.round, MW.tileRows);
    const y = rowY(c.round);
    const f = MW.face + 0.012;
    const n: Record<string, number> = { row, comb: c.p('comb', 0.05, 0.95), set: c.p('set0', 0.5, 0.8) + c.p('set1', 0.5, 0.8) + c.p('set2', 0.5, 0.8), wet: k === 'comb' ? 1 : 0 };
    const props: Record<string, V> = {};
    if (k === 'scoop') {
      props.trowel = add(MW.bucket, 0, 0.05 + 0.04 * Math.sin(u * PI * 2), 0);
      return { l: c.bd(0.22, 0.84, 0.12), gl: 0.3, tool: 'trowel', lean: 0.26, nod: 0.36, crouch: 0.75, n, props };
    }
    if (k === 'comb') {
      props.trowel = [mixN(0.48, 0.92, Math.abs(Math.sin(u * PI * 1.5))), y, f + TROWEL_OFF];
      return { l: [0.5, y + 0.1, f + 0.04], gl: 0.05, palms: 0.05, tool: 'trowel', lean: 0.1, nod: 0.12, crouch: rowCrouch(y), n, props };
    }
    if (k === 'check') return { ...easy(c), l: [0.54, y, f + 0.05], r: [0.86, y, f + 0.05], gl: 0.05, gr: 0.05, palms: 0.05, lean: 0.08, nod: 0.1, crouch: rowCrouch(y), n };
    const i = Number(k[k.length - 1]);
    const slot: V = [MW.tileCols[i], y, f + 0.03];
    const pile = add(MW.tilePile, 0, 0.03, 0);
    if (k.startsWith('take')) {
      props.tile = lerpV(pile, add(slot, 0, 0, 0.1), sm(u, 0.35, 1));
      return { tool: 'tile', l: c.bd(0.22, 0.8, 0.12), gl: 0.3, lean: 0.2, nod: 0.3, crouch: Math.max(rowCrouch(y), 0.95 * (1 - sm(u, 0.4, 1))), n, props };
    }
    props.tile = lerpV(add(slot, 0, 0, 0.1), slot, sm(u, 0, 0.5));
    return { tool: 'tile', l: [0.5, y + 0.06, f + 0.04], gl: 0.05, palms: 0.05, lean: 0.1, nod: 0.14, crouch: rowCrouch(y), n, props };
  },
};
const QUOTE: Script = {
  seq: [['look', 1.5], ['writeA', 2.6], ['knock', 1.6], ['move', 0.6], ['writeB', 2.6], ['think', 1.4]],
  at: (k) => (k === 'look' || k === 'writeA' ? st(-0.4, 0.42) : st(0.3, 0.42)),
  key(k, _u, c) {
    const n = { ticks: (c.p('writeA') + c.p('writeB')) * 3, quote: 1 };
    if (k === 'look') return { l: c.bd(0.2, 0.62 * c.H, 0.1), r: [-0.2, 1.4, MW.face + 0.32], gl: 0.3, gr: 0.4, lean: 0.03, nod: -0.1, n };
    if (k === 'knock') return { l: c.bd(0.2, 0.62 * c.H, 0.1), r: [0.32, 1.25 + 0.02 * Math.sin(c.t * 12), MW.face + 0.03], gl: 0.3, gr: 0.8, lean: 0.14, nod: 0, n };
    if (k === 'move' || k === 'think') return { ...easy(c), n };
    return { tool: 'clip', lean: 0.05, nod: 0.3, n, props: { clip: clipAt(c) } };
  },
};

// =============================================================================================
// 페인트 벽 (wlPaintWall, 2 × 1): a primed wall going a new colour column by column, the tray on a stool, the roller on a short pole.

export const PW = {
  face: -0.22,
  left: -0.95,
  w: 1.9,
  bottom: 0.1,
  top: 2.25,
  cols: 4,
  tray: [0.9, 0.64, 0.42] as V,
  head0: 0.42,
  head1: 2.02,
  /** Back far enough that the rear hand on an 0.8 m pole is in front of the body when the head's at chest height. */
  stand: 0.7,
  home: [0.78, 0.86, 0.38] as V,
  pot: [0.78, 0.66, 0.42] as V,
};
export const colX = (i: number) => PW.left + ((i + 0.5) / PW.cols) * PW.w;
/** The rear hand on the pole: rises and falls with the head a little, and no lower than the left arm can come down to join it from a crouch. */
const handFor = (dwellerX: number, headY: number, H = 1.6): V => [dwellerX + 0.08, Math.max(0.96, 1.02 + (headY - 1.2) * 0.32) * (H / 1.6), 0.45];
const rollerProps = (head: V, dwellerX: number, up = false, hand = handFor(dwellerX, head[1])): Record<string, V> => {
  const p = pole(head, hand);
  return up ? { rollerWall: p.grip, roller: p.grip, rollerDir: p.dir } : { roller: p.grip, rollerDir: p.dir };
};
const ROLL: Script = {
  seq: [['load', 2, 0.9], ['to', 0.8], ['up1', 1.5], ['dn1', 1.5], ['up2', 1.5], ['dn2', 1.5, 0.9], ['back', 0.8]],
  at: (k, round) => (k === 'load' || k === 'back' ? st(0.08, PW.stand) : st(THREE.MathUtils.clamp(colX(wrap(round, PW.cols)), -0.7, 0.7), PW.stand)),
  key(k, u, c) {
    const i = wrap(c.round, PW.cols);
    const x = colX(i);
    const sx = c.st.x;
    const z = PW.face + 0.04;
    const span = PW.w / PW.cols;
    const cov = (c.p('up1') + c.p('dn1') + c.p('up2') + c.p('dn2')) / 4;
    const n: Record<string, number> = { col: i, cov, wet: k === 'load' ? 0 : 1, coat: Math.floor(c.round / PW.cols) };
    if (k === 'load' || k === 'to' || k === 'back') {
      const head: V = k === 'load' ? add(PW.tray, -0.06 + 0.1 * Math.sin(u * PI * 3), 0.03, 0) : k === 'to' ? [x, PW.head0, z + 0.1] : add(PW.tray, 0, 0.1, 0);
      return { tool: 'roller', lean: 0.1, nod: 0.26, n, props: k === 'to' ? rollerProps(head, sx, false, handFor(sx, head[1], c.H)) : rollerProps(head, sx, false, [sx + 0.16, 1.05, 0.5]) };
    }
    const off = k === 'up1' || k === 'dn1' ? -span * 0.22 : span * 0.22;
    const y = k === 'up1' || k === 'up2' ? mixN(PW.head0, PW.head1, sm(u, 0, 1)) : mixN(PW.head1, PW.head0, sm(u, 0, 1));
    // Bent at the knees for the bottom of the wall, where the pole comes up high across the body.
    return { tool: 'rollerWall', lean: 0.06 + Math.max(0.16 * sm(y, 1.4, 2), 0.36 * (1 - sm(y, PW.head0, 0.9))), crouch: 0.42 * (1 - sm(y, PW.head0, PW.head0 + 0.75)), nod: mixN(0.2, -0.28, (y - PW.head0) / (PW.head1 - PW.head0)), n, props: rollerProps([x + off, y, z], sx, true, handFor(sx, y, c.H)) };
  },
};
const CUT_IN: Script = {
  seq: [['dip', 1.4], ['edge', 4], ['dip2', 1.2], ['low', 3.4], ['look', 1]],
  at: () => st(0.55, 0.14),
  key(k, u, c) {
    const f = PW.face + 0.004;
    const n: Record<string, number> = { edge: c.p('edge') * 0.6 + c.p('low') * 0.4, coat: Math.floor(c.round / PW.cols) };
    if (k === 'dip' || k === 'dip2') {
      return { tool: 'cutBrush', lean: 0.2, nod: 0.36, crouch: 0.6, l: c.bd(0.2, 0.84, 0.15), gl: 0.3, n, props: { cutBrush: add(PW.pot, 0, 0.16 + 0.03 * Math.sin(u * PI * 2), 0) } };
    }
    if (k === 'look') return { ...easy(c), lean: 0.03, nod: -0.05, n };
    const tipY = k === 'edge' ? mixN(1.72, 1.08, u) : mixN(1.08, 0.72, u);
    return { tool: 'cutBrush', lean: 0.12, nod: k === 'edge' ? -0.12 : 0.2, crouch: k === 'low' ? 0.3 * u : 0, l: [0.5, tipY + 0.12, f + 0.04], gl: 0.05, palms: 0.05, n, props: { cutBrush: from([0.89, tipY, f + 0.002], CUT_DIR, CUT_UP) } };
  },
};

// =============================================================================================
// 바닥 시공 구역 (wlFloorBay, 3 × 2): a deck raised to arm's reach of a low rolling stool. Boards at the left, tile at the right; the last rows go in here.

export const FB = {
  top: 0.3,
  front: 0.95,
  back: -0.98,
  seatY: 0.36,
  seatZ: 1.22,
  boardRow: 0.85,
  boardL: 0.44,
  boards: [-1.22, -0.76, -0.3] as readonly number[],
  tileS: 0.2,
  tileRow: 0.85,
  tiles: [0.3, 0.52, 0.74, 0.96, 1.18] as readonly number[],
  cartY: 0.4,
  cartX: 0.42,
  cartZ: 1.28,
};
const cartAt = (x: number): V => [x + FB.cartX, FB.cartY + 0.05, FB.cartZ];
const PLANK: Script = {
  seq: [['take0', 1.1], ['set0', 1.1], ['tap0', 1.4], ['take1', 1.1], ['set1', 1.1], ['tap1', 1.4], ['take2', 1.1], ['set2', 1.1], ['tap2', 1.4]],
  at: (k) => sat(FB.boards[Number(k[k.length - 1])], FB.seatY, FB.seatZ),
  key(k, u, c) {
    const i = Number(k[k.length - 1]);
    const x = FB.boards[i];
    const n: Record<string, number> = { laid: c.p('set0', 0.75, 0.95) + c.p('set1', 0.75, 0.95) + c.p('set2', 0.75, 0.95), seatX: x, swing: 0, gap: 0, row: wrap(c.round, 2), hasCart: 1 };
    const slot: V = [x, FB.top + 0.02, FB.boardRow];
    const props: Record<string, V> = {};
    if (k.startsWith('take')) {
      props.plank = lerpV(cartAt(x), add(slot, 0, 0.06, 0.08), sm(u, 0.3, 1));
      return { tool: 'plank', lean: 0.2, nod: 0.3, n, props };
    }
    if (k.startsWith('set')) {
      props.plank = lerpV(add(slot, 0, 0.06, 0.08), slot, sm(u, 0.1, 0.8));
      return { tool: 'plank', lean: 0.32, nod: 0.42, n, props };
    }
    const beat = Math.sin(u * PI * 5);
    n.swing = Math.max(0, beat);
    props.mallet = from([x + 0.16, FB.top + 0.05, FB.boardRow], MALLET_DIR, MALLET_UP);
    return { tool: 'mallet', l: [x - 0.1, FB.top + 0.07, FB.boardRow + 0.03], gl: 0.05, palms: 0.04, lean: 0.32, nod: 0.44, n, props };
  },
};
const FLOOR_TILE: Script = {
  seq: [['comb', 2.6], ['take0', 1], ['set0', 1], ['tap0', 1.2], ['take1', 1], ['set1', 1], ['tap1', 1.2], ['take2', 1], ['set2', 1], ['tap2', 1.2]],
  at: (k) => {
    const i = k === 'comb' ? 1 : Number(k[k.length - 1]);
    return sat(FB.tiles[i + 1] - 0.05, FB.seatY, FB.seatZ);
  },
  key(k, u, c) {
    const i = k === 'comb' ? 0 : Number(k[k.length - 1]);
    const x = FB.tiles[i + 1];
    const n: Record<string, number> = { comb: c.p('comb', 0.05, 0.95), set: c.p('set0', 0.6, 0.9) + c.p('set1', 0.6, 0.9) + c.p('set2', 0.6, 0.9), swing: 0, seatX: c.st.x, hasCart: 1 };
    const y = FB.top + 0.02;
    const props: Record<string, V> = {};
    if (k === 'comb') {
      props.trowel = [mixN(c.st.x - 0.04, c.st.x + 0.34, Math.abs(Math.sin(u * PI * 1.5))), y + 0.05, FB.tileRow];
      return { tool: 'trowel', l: [c.st.x - 0.25, y + 0.07, FB.tileRow + 0.04], gl: 0.05, palms: 0.05, lean: 0.32, nod: 0.42, n, props };
    }
    const slot: V = [x, y + 0.004, FB.tileRow];
    if (k.startsWith('take')) {
      props.tile = lerpV(cartAt(c.st.x), add(slot, 0, 0.05, 0.06), sm(u, 0.3, 1));
      return { tool: 'tile', l: [c.st.x - 0.2, y + 0.1, FB.tileRow + 0.1], gl: 0.05, palms: 0.05, lean: 0.24, nod: 0.3, n, props };
    }
    if (k.startsWith('set')) {
      props.tile = lerpV(add(slot, 0, 0.05, 0.06), slot, sm(u, 0, 0.7));
      return { tool: 'tile', l: [c.st.x - 0.2, y + 0.06, FB.tileRow + 0.05], gl: 0.05, palms: 0.05, lean: 0.32, nod: 0.42, n, props };
    }
    n.swing = Math.max(0, Math.sin(u * PI * 5));
    props.mallet = from([x, FB.top + 0.05, FB.tileRow + 0.01], MALLET_DIR, MALLET_UP);
    return { tool: 'mallet', l: [x - 0.18, y + 0.06, FB.tileRow + 0.05], gl: 0.05, palms: 0.05, lean: 0.32, nod: 0.44, n, props };
  },
};

// =============================================================================================
// 천장 모서리 (wlCeilingCorner, 2 × 1): a corner with a piece of ceiling over it, a stepladder standing under the seam.

export const CC = {
  face: -0.2,
  ceil: 2.32,
  seam: 2.2,
  ladderX: 0.1,
  ladderZ: 0.3,
  steps: [0.26, 0.52, 0.78] as readonly number[],
  x0: -0.08,
  x1: 0.48,
  caulkHome: [0.48, 1.0, 0.08] as V,
};
const railHand = (side: number, y: number): V => [CC.ladderX + side * 0.2, y, CC.ladderZ - 0.04];
const CEILING: Script = {
  seq: [['up1', 0.7], ['up2', 0.7], ['up3', 0.7], ['bead', 3.6], ['smooth', 3], ['look', 1], ['dn3', 0.6], ['dn2', 0.6], ['dn1', 0.6], ['floor', 1.2]],
  at(k) {
    const zAt = (i: number) => mixN(0.72, CC.ladderZ, (i + 1) / 3);
    switch (k) {
      case 'up1':
      case 'dn1':
        return st(CC.ladderX, zAt(0), PI, CC.steps[0]);
      case 'up2':
      case 'dn2':
        return st(CC.ladderX, zAt(1), PI, CC.steps[1]);
      case 'floor':
        return st(CC.ladderX, 0.72);
      default:
        return st(CC.ladderX, zAt(2), PI, CC.steps[2]);
    }
  },
  key(k, u, c) {
    const n: Record<string, number> = { seg: wrap(c.round, 3), bead: c.p('bead', 0.03, 0.97), smooth: c.p('smooth', 0.03, 0.97) };
    const y = c.st.y;
    const t = c.t * 3;
    if (k === 'floor') return { l: railHand(-1, 1.1), r: railHand(1, 1.1), gl: 0.8, gr: 0.8, lean: 0.03, nod: -0.25, n };
    if (k === 'bead') {
      const tip: V = [mixN(CC.x0, CC.x1, u), CC.seam - 0.015, CC.face + 0.025];
      return { tool: 'caulk', l: [CC.ladderX - 0.25, CC.seam - 0.2, CC.face + 0.1], gl: 0.1, palms: 0.05, lean: 0.14, nod: -0.4, n, props: { caulk: from(tip, CAULK_DIR, CAULK_UP) } };
    }
    if (k === 'smooth') {
      const tip: V = [mixN(CC.x1, CC.x0, u), CC.seam - 0.03, CC.face + 0.012];
      return { tool: 'smoother', l: [CC.ladderX - 0.25, CC.seam - 0.2, CC.face + 0.1], gl: 0.1, palms: 0.05, lean: 0.14, nod: -0.4, n, props: { smoother: from(tip, SMOOTH_DIR, SMOOTH_UP) } };
    }
    if (k === 'look') return { l: railHand(-1, y + 1), r: railHand(1, y + 1), gl: 0.8, gr: 0.8, lean: 0.02, nod: -0.25, n };
    const up = Math.sin(t) > 0 ? 0.08 : 0;
    return { l: railHand(-1, y + 1 + up), r: railHand(1, y + 1 + 0.08 - up), gl: 0.8, gr: 0.8, lean: 0.04, nod: 0.1, palms: 0.05, n };
  },
};

// =============================================================================================
// 실측 벽 (wlMeasureBay, 2 × 1): a bare wall with a window hole, a tripod with a line laser; the line and the marks are on the wall.

export const MB = {
  face: -0.15,
  windowX: 0.42,
  winY0: 0.92,
  winY1: 1.72,
  tripod: [-0.74, 1.14, 0.34] as V,
  lineY: 0.86,
  marks: [-0.3, 0.08, 0.46] as readonly number[],
  stand: 0.34,
};
const LASER: Script = {
  seq: [['to', 0.4], ['turn', 2.6], ['level', 1.4], ['mark0', 1.3], ['mark1', 1.3], ['mark2', 1.3], ['look', 1]],
  at: (k) => (k === 'to' || k === 'turn' || k === 'level' ? st(-0.48, 0.72, PI + 0.5) : st(k === 'mark0' ? -0.2 : k === 'mark1' ? 0.1 : k === 'mark2' ? 0.36 : 0.1, MB.stand)),
  key(k, u, c) {
    const n: Record<string, number> = { on: c.p('to', 0.5, 1), level: c.p('turn', 0, 0.95), marks: c.p('mark0', 0.4, 0.8) + c.p('mark1', 0.4, 0.8) + c.p('mark2', 0.4, 0.8), knob: k === 'turn' ? u * 6 : 0 };
    const knob = add(MB.tripod, 0.05, 0.015, 0.05);
    if (k === 'to' || k === 'turn' || k === 'level') {
      const w = k === 'turn' ? 0.012 * Math.sin(u * PI * 8) : 0;
      return { l: c.bd(0.2, 0.62 * c.H, 0.1), r: add(knob, w, 0, w), gl: 0.3, gr: 0.7, lean: 0.1, nod: 0.22, n };
    }
    if (k === 'look') return { ...easy(c), lean: 0.02, nod: -0.04, n };
    const i = Number(k[k.length - 1]);
    return { tool: 'pencil', l: [MB.marks[i] - 0.16, MB.lineY + 0.1, MB.face + 0.03], gl: 0.05, palms: 0.05, lean: 0.1, nod: 0.14, n, props: { pencil: from([MB.marks[i], MB.lineY, MB.face + 0.005], PEN_WALL, PEN_UP) } };
  },
};
const TAPE: Script = {
  seq: [['wide', 3], ['tall', 0.8], ['read', 1.3], ['write', 3]],
  at: () => st(0, MB.stand),
  key(k, u, c) {
    const n: Record<string, number> = { ticks: c.p('write') * 3, on: 0 };
    if (k === 'wide') return { tool: 'tape', lean: 0.12, nod: 0.02, n, props: { tape: [0, MB.winY0 + 0.02 + 0.008 * Math.sin(u * PI * 2), MB.face + 0.03] } };
    if (k === 'tall') return { ...easy(c), n };
    if (k === 'read') return { l: [-0.26, MB.winY0 + 0.04, MB.face + 0.05], r: [0.26, MB.winY0 + 0.04, MB.face + 0.05], gl: 0.2, gr: 0.2, palms: 0.05, lean: 0.14, nod: 0.05, n };
    return { tool: 'clip', lean: 0.05, nod: 0.3, n, props: { clip: clipAt(c) } };
  },
};

// =============================================================================================
// 현장 도면판 (wlSitePlan, 2 × 1): a floor plan and a schedule pinned to a board; rooms are inked done.

export const SP = { face: -0.34, cy: 1.32, stand: 0.14, penHome: [0.84, 0.82, -0.28] as V };
export const PLAN_ROOMS: readonly [string, number, number, number, number][] = [
  ['거실', 0.52, 0.42, 0.3, 0.4],
  ['안방', 0.08, 0.06, 0.34, 0.34],
  ['작은방', 0.48, 0.06, 0.3, 0.3],
  ['주방', 0.08, 0.46, 0.34, 0.26],
  ['욕실', 0.84, 0.1, 0.12, 0.28],
];
const roomTip = (i: number, u: number): V => {
  const [, x, y, w, h] = PLAN_ROOMS[wrap(i, PLAN_ROOMS.length)];
  // The plan covers x -0.75 to 0.15, y 0.92 to 1.72.
  return [-0.75 + (x + w * (0.2 + 0.6 * u)) * 0.9, 1.72 - (y + h * (0.5 + 0.28 * Math.sin(u * PI * 5))) * 0.8, SP.face + 0.01];
};
const PLAN: Script = {
  seq: [['read', 1.8], ['ink', 3], ['schedule', 2.2], ['back', 1.2]],
  at(k, round) {
    if (k === 'schedule') return st(0.4, SP.stand);
    const [, x, , w] = PLAN_ROOMS[wrap(round, PLAN_ROOMS.length)];
    return st(-0.75 + (x + w / 2) * 0.9 - 0.15, SP.stand);
  },
  key(k, u, c) {
    const r = wrap(c.round, PLAN_ROOMS.length);
    const n: Record<string, number> = { room: r, ink: c.p('ink', 0, 0.98), line: c.p('schedule', 0, 0.98) };
    if (k === 'read') return { l: c.bd(0.2, 0.62 * c.H, 0.1), r: [c.st.x + mixN(-0.1, 0.3, u), 1.4, SP.face + 0.04], gl: 0.3, gr: 0.6, lean: 0.06, nod: -0.05, n };
    if (k === 'back') return { ...easy(c), lean: 0.02, nod: 0.02, n };
    const tip = k === 'ink' ? roomTip(r, u) : ([0.27 + 0.42 * u, 1.62 - wrap(c.round, 4) * 0.15, SP.face + 0.01] as V);
    return { tool: 'pencil', l: c.bd(0.2, 0.62 * c.H, 0.1), gl: 0.3, lean: 0.08, nod: -0.03, n, props: { pencil: from(tip, PEN_WALL, PEN_UP) } };
  },
};

// =============================================================================================
// 자재 더미 (wlMaterials, 2 × 1): rolls on a low rack, buckets. Counted, one roll moved across.

export const MT = { top: 0.5, stand: 0.6, rollFrom: [-0.42, 0.94, 0.05] as V, rollTo: [0.5, 0.9, 0.05] as V };
const STOCK: Script = {
  seq: [['count', 3.4], ['reach', 1.2], ['carry', 1.4], ['down', 1.2], ['tick', 1.8]],
  at: (k) => (k === 'count' || k === 'tick' ? st(0, MT.stand) : k === 'reach' ? st(-0.42, MT.stand) : st(0.42, MT.stand)),
  key(k, u, c) {
    const n: Record<string, number> = { ticks: c.p('count') * 3 + c.p('tick') * 2, moved: c.p('reach', 0.3, 0.5) * (1 - c.p('down', 0.8, 1)), landed: wrap(c.round, 3) };
    if (k === 'count' || k === 'tick') return { tool: 'clip', lean: 0.05, nod: 0.25, n, props: { clip: clipAt(c) } };
    const carry: V = [0, 0.96, MT.stand - 0.32];
    if (k === 'reach') return { tool: 'roll', lean: 0.2, nod: 0.25, n, props: { roll: lerpV(MT.rollFrom, [MT.rollFrom[0], 0.98, MT.stand - 0.32], sm(u, 0.3, 1)) } };
    if (k === 'carry') return { tool: 'roll', lean: 0.04, nod: 0.08, n, props: { roll: add(c.bd(0, 0.96, 0.3), 0, 0, 0) } };
    return { tool: 'roll', lean: 0.2, nod: 0.25, n, props: { roll: lerpV(add(carry, MT.rollTo[0], 0, 0), MT.rollTo, sm(u, 0, 0.8)) } };
  },
};

// =============================================================================================
// 완성 방 (wlFinishRoom, 3 × 1): new paper, a window with its curtain, a lamp; the owner stands in the room and follows round.

export const FR = {
  face: -0.28,
  owner: [1.12, 0, 0.98] as V,
  switchAt: [-1.32, 1.2, -0.25] as V,
  seam: 0.34,
  sill: [-0.2, 0.92, -0.22] as V,
};
const WALK: Script = {
  seq: [['greet', 1.8], ['seam', 2.6], ['walk1', 0.5], ['sill', 2], ['walk2', 0.5], ['lamp', 2], ['sign', 2.8], ['thanks', 1.6]],
  at(k) {
    if (k === 'greet') return st(0.5, 0.82, PI / 2);
    if (k === 'seam' || k === 'walk1') return st(0.34, 0.3);
    if (k === 'sill' || k === 'walk2') return st(-0.2, 0.26);
    if (k === 'lamp') return st(-1.1, 0.14, PI - 0.5);
    return st(0.56, 0.86, PI / 2);
  },
  key(k, u, c) {
    const n: Record<string, number> = { owner: 1, lit: c.p('lamp', 0.45, 0.55), ticks: c.p('sign') * 5, nod: k === 'seam' || k === 'lamp' || k === 'thanks' ? 1 : 0, ownerLook: k === 'greet' || k === 'sign' || k === 'thanks' ? 1 : k === 'seam' ? 0.45 : 0.1, signed: c.p('sign', 0.5, 0.9) };
    switch (k) {
      case 'greet':
        return { ...easy(c), r: c.bd(-0.25, 1.15, 0.25), gr: 0.1, palms: 0.5, lean: 0.03, nod: 0.02, n };
      case 'seam':
        return { l: c.bd(0.22, 0.62 * c.H, 0.1), r: [FR.seam, mixN(1.6, 1.1, sm(u, 0, 1)), FR.face + 0.02], gl: 0.3, gr: 0.1, palms: 0.05, lean: 0.1, nod: 0.05, n };
      case 'sill':
        return { l: [FR.sill[0] - 0.26, FR.sill[1] + 0.1, FR.sill[2] + 0.08], r: [FR.sill[0] + mixN(-0.2, 0.25, u), FR.sill[1] + 0.05, FR.sill[2] + 0.08], gl: 0.1, gr: 0.1, palms: 0.05, lean: 0.14, nod: 0.3, n };
      case 'lamp':
        return { l: c.bd(0.22, 0.62 * c.H, 0.1), r: u < 0.7 ? FR.switchAt : c.bd(-0.2, 0.62 * c.H, 0.1), gl: 0.3, gr: 0.6, lean: 0.06, nod: 0, tap: u > 0.4 && u < 0.6, n };
      case 'sign':
        return { tool: 'clip', lean: 0.05, nod: 0.25, n, props: { clip: clipAt(c) } };
      case 'thanks':
        return { ...easy(c), lean: 0.2 * Math.sin(u * PI), nod: 0.25 * Math.sin(u * PI), n };
      default:
        return { ...easy(c), n };
    }
  },
};

const SCRIPTS: Record<WlMotion, Script> = {
  wlPaste: PASTE,
  wlMeasureRoom: MEASURE_ROOM,
  wlPickPaper: PICK,
  wlCutTile: CUT_TILE,
  wlTilePlan: TILE_PLAN,
  wlHang: hang(1, 0),
  wlWallTile: WALL_TILE,
  wlDeadline: hang(0.72, 1),
  wlQuote: QUOTE,
  wlRoll: ROLL,
  wlCutIn: CUT_IN,
  wlPlank: PLANK,
  wlFloorTile: FLOOR_TILE,
  wlCeiling: CEILING,
  wlLaser: LASER,
  wlTape: TAPE,
  wlPlan: PLAN,
  wlStock: STOCK,
  wlWalk: WALK,
};
