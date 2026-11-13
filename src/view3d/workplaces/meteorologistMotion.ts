import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, wave, type Beat, type V } from './busDriverMotion';

/*
 * A 예보관's work at the 기상청 예보실 (2026-10-31, the workplace pipeline, at the user's request: the
 * work should look like the work). Every motion is a script: a round of beats, each with where the dweller
 * is, where the hands are and where what moves is (the marker, the red handset, the balloon and its
 * sonde, the rain gauge's jar). The piece reads the same script by the same clock (meteorologist.ts), so
 * the chart gains its fronts as they are drawn and the balloon is on its stand until it's let go.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front),
 * and the whole body is posed from here (activity.ts spotPose only hands over).
 */
export type MtMotion =
  | 'mtChart' | 'mtSevere'
  | 'mtRun' | 'mtVerify'
  | 'mtBalloon'
  | 'mtRadar' | 'mtLog'
  | 'mtPresent' | 'mtScript'
  | 'mtBrief' | 'mtLead'
  | 'mtTyphoon'
  | 'mtScreen' | 'mtGauge'
  | 'mtPhone';
export const MT_MOTIONS = new Set<string>(['mtChart', 'mtSevere', 'mtRun', 'mtVerify', 'mtBalloon', 'mtRadar', 'mtLog', 'mtPresent', 'mtScript', 'mtBrief', 'mtLead', 'mtTyphoon', 'mtScreen', 'mtGauge', 'mtPhone']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const mtPhase = (p: THREE.Vector3) => frac(p.x * 0.317 + p.z * 0.559);
type Seq = Array<[string, number, number?]>;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;

// ---------------------------------------------------------------------------------------------
// The script engine.

export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
  floor?: number;
}
const st = (x: number, y: number, z: number, yaw: number, more: Partial<St> = {}): St => ({ x, y, z, yaw, ...more });
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
  p(name: string, a?: number, b?: number): number;
  after(name: string): boolean;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface MtNow {
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
  const f = new THREE.Vector3(Math.sin(here.yaw), 0, Math.cos(here.yaw));
  const lf = new THREE.Vector3(Math.cos(here.yaw), 0, -Math.sin(here.yaw));
  const c: Ctx = {
    t,
    H,
    st: here,
    bd: (side, up, ahead) => [here.x + lf.x * side + f.x * ahead, here.y + up, here.z + lf.z * side + f.z * ahead],
    p: (name, a = 0, b = 1) => {
      const i = s.seq.findIndex(([q]) => q === name);
      return idx > i ? 1 : idx < i ? 0 : sm(u, a, b);
    },
    after: (name) => idx > s.seq.findIndex(([q]) => q === name),
  };
  return { st: here, key: s.key(k, u, c) };
}
function blendKey(a: Key, b: Key, e: number): Key {
  if (e <= 0) return a;
  const v = (x: V | undefined, y: V | undefined) => (x && y ? lerpV(x, y, e) : e < 0.5 ? x : y);
  const n = (x: number | undefined, y: number | undefined, d: number) => mixN(x ?? d, y ?? d, e);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.1), nod: n(a.nod, b.nod, 0.2), palms: n(a.palms, b.palms, 0.5), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap };
}
const angle = (a: number, b: number, e: number) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * e;
};
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function mtNow(m: MtMotion, t: number, ph: number, H = 1.6): MtNow {
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
export function mtPose(m: MtMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = mtNow(m, t, mtPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const k = N.key;
  const pose: BodyPose = s.sit
    ? { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y }
    : N.walking
      ? { kind: 'walk', at, yaw }
      : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.1, nod: k.nod ?? 0.2, palms: k.palms ?? 0.5, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch || undefined,
    },
  };
}
const idle = (c: Ctx, side: number): V => c.bd(side * 0.23, 0.55 * c.H, 0.08);
const ear = (c: Ctx): V => c.bd(-0.11, 0.9 * c.H, 0.03);
const openTo = (c: Ctx, side: number, far = 0.34, up = 0.64): V => c.bd(side * 0.2, (up + 0.02 * wave(c.t, 0.6)) * c.H, far);
const chin = (c: Ctx): V => c.bd(-0.03, 0.83 * c.H, 0.14);
/** A clipboard held at the chest, the paper tilted up to be read. */
const atChest = (c: Ctx): V => c.bd(0.08, 0.62 * c.H, 0.28);
const writeOn = (a: V, u: number, lines = 4, w = 0.1): V => {
  const lap = frac(u * lines);
  const row = Math.floor(u * lines);
  return add(a, -w / 2 + w * lap, 0.03, -0.03 + row * 0.012);
};

// =============================================================================================
// 예보 상황판 (forecastWall, 2 × 1): the plotted chart at the left, radar over satellite at the right, a
// ledge of pens and the red phone below, the warning sign and its beacon on top.

export const FW = {
  z: -0.35,
  chart: { x: -0.4, y: 1.45, w: 1.14, h: 1.0 },
  radar: { x: 0.57, y: 1.74, w: 0.72, h: 0.5 },
  sat: { x: 0.57, y: 1.2, w: 0.72, h: 0.46 },
  ledge: 0.86,
  pens: [-0.72, 0.9, -0.22] as V,
  phone: [0.72, 0.93, -0.24] as V,
  btn: [0.22, 0.91, -0.2] as V,
  step: [0.57, 0.92, -0.2] as V,
};
const cp = (a: number, b: number): V => [FW.chart.x + (a * FW.chart.w) / 2, FW.chart.y + (b * FW.chart.h) / 2, FW.z + 0.03];
const CH_AT = st(-0.4, 0, 0.16, Math.PI);
const CHART: Script = {
  seq: [['read', 2.2, 0.7], ['iso', 3.4], ['hl', 1.8], ['front', 3.0], ['warm', 2.0, 0.8], ['radar', 2.8, 0.8], ['back', 2.0, 0.8], ['rain', 2.4], ['cap', 1.4]],
  at: (k) => (k === 'read' ? st(-0.62, 0, 0.18, Math.PI) : k === 'radar' ? st(0.5, 0, 0.2, Math.PI) : k === 'back' ? st(-0.15, 0, 0.74, Math.PI + 0.25) : CH_AT),
  key(k, u, c) {
    const stage = k === 'read' ? 0 : k === 'iso' ? (u < 0.5 ? 1 : 2) : k === 'hl' ? 3 : k === 'front' ? (u < 0.6 ? 3 : 4) : k === 'warm' ? (u < 0.6 ? 4 : 5) : k === 'radar' || k === 'back' ? 5 : 6;
    const n: Record<string, number> = { chart: stage, step: k === 'radar' ? Math.floor(u * 5) : -1, pen: k === 'front' ? 1 : k === 'warm' || k === 'hl' ? 2 : k === 'rain' ? 3 : 0, tick: k === 'radar' && frac(u * 5) < 0.25 ? 1 : 0 };
    const tipL = c.bd(0.2, 0.62 * c.H, 0.14);
    const draw = (a: number, b: number): Key => {
      const tip = cp(a, b);
      return { l: tipL, r: add(tip, 0.02, -0.03, 0.1), lean: 0.1, nod: -0.05 + (tip[1] < 1.5 ? 0.15 : 0), palms: 0.2, gr: 0.9, gl: 0.3, props: { pen: tip }, n };
    };
    switch (k) {
      case 'read': {
        // A finger along the plotted stations, row by row.
        const row = Math.floor(u * 3);
        const f = cp(-0.8 + 1.1 * frac(u * 3), 0.5 - row * 0.42);
        return { l: f, r: idle(c, -1), lean: 0.1, nod: row * 0.08, palms: 0, gl: 0.1, props: { pen: null }, n };
      }
      case 'iso':
        return draw(-0.85 + 1.7 * frac(u * 2), (u < 0.5 ? 0.45 : -0.15) + 0.26 * Math.sin(frac(u * 2) * 5));
      case 'hl': {
        // 고 and 저: a small circle at each centre.
        const lap = u * Math.PI * 4;
        const [a, b] = u < 0.5 ? [-0.48, 0.34] : [0.42, -0.28];
        return draw(a + 0.06 * Math.cos(lap), b + 0.08 * Math.sin(lap));
      }
      case 'front': {
        const s = sm(u, 0.05, 0.95);
        return draw(0.42 - 0.72 * s, -0.28 - 0.5 * s + 0.05 * Math.sin(s * 22));
      }
      case 'warm': {
        const s = sm(u, 0.05, 0.95);
        return draw(0.42 + 0.42 * s, -0.28 - 0.26 * s);
      }
      case 'radar': {
        // The loop stepped frame by frame, a press for each; the other hand holds the capped marker.
        const press = frac(u * 5) < 0.25 ? -0.015 : 0.012;
        return { l: add(FW.step, 0, press + 0.03, 0.05), r: add(c.bd(-0.2, 0.62 * c.H, 0.14), 0, 0, 0), lean: 0.2, nod: u < 0.5 ? -0.28 : 0.32, palms: 0.05, gl: 0.15, gr: 0.9, props: { pen: add(c.bd(-0.2, 0.62 * c.H, 0.14), 0, 0.03, 0.02) }, n };
      }
      case 'back':
        // A step back, the marker to the chin, the whole chart looked at.
        return { l: c.bd(0.1, 0.6 * c.H, 0.14), r: chin(c), lean: -0.02, nod: -0.08 + 0.05 * wave(c.t, 0.4), palms: 0.2, gr: 0.9, props: { pen: add(chin(c), 0, 0.06, 0.02) }, n };
      case 'rain': {
        // Green shading over the rain band.
        const s = frac(u * 3);
        return draw(-0.4 + 0.5 * s + 0.25 * u, -0.36 - 0.14 * Math.sin(s * Math.PI * 2) + u * 0.08);
      }
      default: {
        // Back in the tray.
        const p = lerpV(cp(0, -0.4), FW.pens, sm(u, 0.1, 0.8));
        return { l: tipL, r: add(p, 0.02, -0.02, 0.08), lean: 0.14, nod: 0.3, gr: 0.9, palms: 0.2, props: { pen: u < 0.82 ? p : null }, n };
      }
    }
  },
};

const SEVERE: Script = {
  seq: [['alert', 1.6, 0.7], ['zoom', 2.6, 0.7], ['mark', 3.0, 0.7], ['phone', 3.6], ['sign', 2.4, 0.7], ['issue', 2.0, 0.7], ['call', 2.4]],
  at: (k) => (k === 'alert' ? st(0.45, 0, 0.72, Math.PI) : k === 'zoom' ? st(0.5, 0, 0.2, Math.PI) : k === 'mark' ? CH_AT : k === 'issue' ? st(0.24, 0, 0.2, Math.PI) : k === 'call' ? st(0.1, 0, 0.56, 0.55) : st(0.56, 0, 0.26, 2.55)),
  key(k, u, c) {
    const n: Record<string, number> = { red: 1, flash: k === 'call' ? 0 : 1, zoom: k === 'alert' ? 0 : k === 'zoom' ? sm(u, 0.3, 0.7) : 1, warn: k === 'alert' || k === 'zoom' ? 0 : k === 'mark' ? sm(u, 0.4, 0.5) : 1, sign: c.p('issue', 0.45, 0.55), senior: c.p('phone', 0.5, 0.8) * (k === 'call' ? 0.5 : 1), paper: k === 'sign' ? 1 : 0, ring: k === 'alert' ? 1 : 0, pen: 2 };
    const paperAt = c.bd(0.1, 0.62 * c.H, 0.3);
    const phoneP: Record<string, V | null> = { handset: null };
    switch (k) {
      case 'alert':
        return { l: idle(c, 1), r: idle(c, -1), lean: 0.14, nod: -0.25, palms: 0.4, props: { ...phoneP, pen: null }, n };
      case 'zoom':
        return { l: add(FW.step, 0, 0.03 + (frac(u * 3) < 0.3 ? -0.015 : 0.01), 0.05), r: add([FW.radar.x + 0.1 - 0.2 * u, FW.radar.y - 0.06, FW.z], 0, 0, 0.05), lean: 0.2, nod: -0.25, gl: 0.15, gr: 0.1, palms: 0, props: { ...phoneP, pen: null }, n };
      case 'mark': {
        // The red marker round the affected coast.
        const a = u * Math.PI * 2.2;
        const tip = cp(0.26 + 0.28 * Math.cos(a), -0.1 + 0.26 * Math.sin(a));
        return { l: c.bd(0.2, 0.62 * c.H, 0.14), r: add(tip, 0.02, -0.03, 0.1), lean: 0.14, nod: 0, gr: 0.9, palms: 0.2, props: { ...phoneP, pen: tip }, n };
      }
      case 'phone': {
        const h = u < 0.15 ? lerpV(FW.phone, ear(c), sm(u, 0, 0.15)) : u < 0.88 ? ear(c) : lerpV(ear(c), FW.phone, sm(u, 0.88, 1));
        return { r: add(h, 0, -0.03, 0), l: u > 0.2 && u < 0.85 ? openTo(c, 1, 0.3, 0.62) : idle(c, 1), lean: 0.04, nod: 0.1 + 0.08 * wave(c.t, 0.8), gr: 0.95, palms: -0.1, gl: 0.1, props: { handset: h, pen: null }, n };
      }
      case 'sign': {
        // The bulletin handed across by the senior forecaster, read and signed.
        const w = writeOn(paperAt, u, 2);
        return { l: add(paperAt, 0.05, -0.02, 0), r: u > 0.5 ? w : add(paperAt, -0.08, 0.06, 0.02), lean: 0.06, nod: 0.45, gl: 0.8, gr: 0.8, palms: 0.5, props: { handset: null, paper: paperAt, signPen: u > 0.5 ? w : null }, n };
      }
      case 'issue':
        // The 발표 button, pressed hard.
        return { r: add(FW.btn, 0, u > 0.4 && u < 0.6 ? 0.015 : 0.06, 0.03), l: idle(c, 1), lean: 0.22, nod: 0.42, gr: 0.15, palms: 0, props: { handset: null }, n };
      default:
        // Called across the room: 호우경보 나갔습니다.
        return { l: openTo(c, 1, 0.4, 0.8), r: c.bd(-0.26, (0.8 + 0.06 * wave(c.t, 1.2)) * c.H, 0.34), lean: 0.02, nod: -0.05, gl: 0.05, gr: 0.05, palms: -0.2, props: { handset: null }, n };
    }
  },
};

// =============================================================================================
// 수치 예보 단말 (modelTerminal, 1 × 1): two monitors on a desk, the node chassis under it, chair out front.

export const MT = {
  top: 0.74,
  seat: st(0, 0.47, 0.46, Math.PI, { sit: true, floor: 0 }),
  keys: [-0.02, 0.775, 0.0] as V,
  mouse: [0.2, 0.765, 0.0] as V,
  mug: [-0.38, 0.79, -0.02] as V,
  pad: [0.33, 0.75, -0.02] as V,
  printer: [0.34, 0.8, -0.28] as V,
  scrL: [-0.24, 1.08, -0.3] as V,
  scrR: [0.24, 1.08, -0.3] as V,
};
const typing = (c: Ctx, k: number = 1): { l: V; r: V } => ({
  l: add(MT.keys, -0.1, 0.012 * Math.max(0, wave(c.t, 3)) * k, 0),
  r: add(MT.keys, 0.1, 0.012 * Math.max(0, -wave(c.t, 3)) * k, 0),
});
const RUN: Script = {
  seq: [['set', 2.6], ['launch', 1.4], ['sip', 3.2], ['field', 3.2], ['compare', 3.0], ['note', 2.2], ['issue', 2.0]],
  at: () => MT.seat,
  key(k, u, c) {
    const prog = k === 'set' ? 0 : k === 'launch' ? 0.05 : k === 'sip' ? 0.05 + 0.95 * sm(u, 0, 1) : 1;
    const n: Record<string, number> = { left: k === 'set' ? 0 : prog < 1 ? 1 : 2, prog, right: k === 'field' ? 1 + Math.floor(u * 3) : k === 'compare' ? 4 + (frac(u * 3) > 0.5 ? 1 : 0) : k === 'note' ? 5 : k === 'issue' ? 6 : 0, busy: k === 'sip' || k === 'launch' ? 1 : 0 };
    const pad: Record<string, V | null> = { pen: null };
    switch (k) {
      case 'set':
        return { ...typing(c), lean: 0.14, nod: 0.05, palms: 1, gl: 0.1, gr: 0.1, tap: true, props: { ...pad, mug: MT.mug }, n };
      case 'launch': {
        // Enter, with a finger, and the hand off it.
        const e = add(MT.keys, 0.18, u > 0.35 && u < 0.5 ? 0.0 : 0.07, 0);
        return { l: add(MT.keys, -0.1, 0, 0), r: e, lean: 0.12, nod: 0.1, palms: 1, gr: 0.2, props: { ...pad, mug: MT.mug }, n };
      }
      case 'sip': {
        // The run going, the mug lifted while it goes.
        const up = sm(u, 0.1, 0.35) * (1 - sm(u, 0.75, 0.95));
        const mug = lerpV(MT.mug, c.bd(0.03, 0.57, 0.15), up);
        return { l: add(mug, 0, 0.02, 0), r: MT.mouse, lean: 0.02, nod: -0.05 + 0.1 * up, gl: 0.85, gr: 0.3, palms: 1, props: { ...pad, mug }, n };
      }
      case 'field': {
        // Leaning to the right screen, a finger following the low through +12, +24, +48.
        const f = add(MT.scrR, -0.12 + 0.24 * u, -0.02 + 0.05 * Math.sin(u * 6), 0.1);
        return { l: add(MT.keys, -0.1, 0, 0), r: f, lean: 0.22, nod: 0, gr: 0.1, palms: 0, props: { ...pad, mug: MT.mug }, n };
      }
      case 'compare':
        // Two models flipped on one key.
        return { l: add(MT.keys, -0.1, frac(u * 3) < 0.15 || (frac(u * 3) > 0.5 && frac(u * 3) < 0.65) ? 0 : 0.03, 0), r: chin(c), lean: 0.1, nod: 0.02, palms: 1, gr: 0.2, props: { ...pad, mug: MT.mug }, n };
      case 'note': {
        const w = writeOn(MT.pad, u, 3);
        return { l: add(MT.pad, -0.12, 0.01, 0.02), r: w, lean: 0.14, nod: 0.5, gr: 0.85, palms: 1, props: { pen: w, mug: MT.mug }, n };
      }
      default: {
        const click = u > 0.42 && u < 0.54;
        return { l: add(MT.keys, -0.1, 0, 0), r: add(MT.mouse, 0, click ? 0 : 0.015, 0), lean: 0.1, nod: 0.02 + 0.2 * sm(u, 0.6, 0.9), palms: 1, gr: 0.4, props: { ...pad, mug: MT.mug }, n };
      }
    }
  },
};
const VERIFY: Script = {
  seq: [['pull', 2.2], ['plot', 3.0], ['mark', 3.0], ['graph', 2.6], ['fix', 3.0], ['stamp', 1.8], ['stack', 1.4]],
  at: () => MT.seat,
  key(k, u, c) {
    const n: Record<string, number> = { left: 3, right: k === 'pull' ? 0 : k === 'plot' ? 7 : k === 'mark' ? 7 : k === 'graph' ? 8 : k === 'fix' ? (u < 0.6 ? 8 : 9) : 9, stamped: c.p('stamp', 0.45, 0.5) * (k === 'stack' ? 1 : 1), busy: k === 'fix' ? 1 : 0, marks: k === 'mark' ? Math.floor(u * 3) + 1 : c.after('mark') ? 3 : 0 };
    const sheet = lerpV(MT.printer, MT.pad, 1);
    switch (k) {
      case 'pull': {
        const p = lerpV(MT.printer, sheet, sm(u, 0.25, 0.85));
        return { l: add(MT.keys, -0.1, 0, 0), r: add(p, 0, 0.03, 0.04), lean: 0.2, nod: 0.3, gr: 0.75, palms: 1, props: { sheet: p, pen: null }, n };
      }
      case 'plot':
        return { ...typing(c), lean: 0.14, nod: -0.02, palms: 1, gl: 0.1, gr: 0.1, tap: true, props: { sheet, pen: null }, n };
      case 'mark': {
        // Pen on the print: three cases circled, a look up to the scatter for each.
        const a = u * Math.PI * 6;
        const row = Math.floor(u * 3);
        const pen = add(MT.pad, -0.03 + row * 0.03 + 0.015 * Math.cos(a), 0.03, -0.05 + row * 0.04 + 0.012 * Math.sin(a));
        return { l: add(MT.pad, -0.13, 0.01, 0.02), r: pen, lean: 0.16, nod: frac(u * 3) < 0.2 ? 0 : 0.5, gr: 0.85, palms: 1, props: { sheet, pen }, n };
      }
      case 'graph': {
        const f = add(MT.scrR, -0.14 + 0.28 * u, -0.05 + 0.09 * u, 0.1);
        return { l: add(MT.keys, -0.1, 0, 0), r: f, lean: 0.24, nod: 0, gr: 0.1, palms: 0, props: { sheet, pen: null }, n };
      }
      case 'fix':
        return { ...typing(c), lean: 0.12, nod: 0.08, palms: 1, gl: 0.1, gr: 0.1, tap: true, props: { sheet, pen: null }, n };
      case 'stamp': {
        const s = add(MT.pad, 0, 0.1 - 0.08 * Math.sin(Math.min(1, u * 1.6) * Math.PI), 0);
        return { l: add(MT.pad, -0.13, 0.01, 0.02), r: add(s, 0, 0.05, 0), lean: 0.18, nod: 0.5, gr: 0.9, palms: 1, props: { sheet, stamp: s, pen: null }, n };
      }
      default:
        return { l: add(MT.keys, -0.1, 0, 0), r: add(sheet, 0, 0.04, 0.03), lean: 0.14, nod: 0.4, gr: 0.6, palms: 1, props: { sheet: lerpV(sheet, add(MT.printer, 0, -0.01, 0), sm(u, 0.1, 0.9)), pen: null }, n };
    }
  },
};

// =============================================================================================
// 고층 관측 장비 (balloonLauncher, 1 × 1): helium cylinders at the back, the filling stand, the sonde on
// its cradle, the receiver on a folding table, the antenna mast.

export const BL = {
  nozzle: [0.02, 1.02, -0.04] as V,
  valve: [-0.34, 1.26, -0.28] as V,
  cradle: [0.3, 0.74, 0.04] as V,
  laptop: [0.38, 0.75, -0.3] as V,
  maxR: 0.36,
};
const BAL_AT = st(0.02, 0, 0.7, Math.PI);
const onNozzle = (r: number): V => [BL.nozzle[0], BL.nozzle[1] + r, BL.nozzle[2]];
const BALLOON: Script = {
  seq: [['hose', 2.2], ['fill', 3.6], ['tie', 2.0], ['sonde', 2.4, 1.3], ['ready', 1.2], ['release', 1.3], ['up', 4.4, 1.0], ['data', 3.6]],
  at: (k) => (k === 'hose' ? st(-0.15, 0, 0.42, Math.PI - 0.3) : k === 'ready' || k === 'release' || k === 'up' ? st(0.2, 0, 1.25, 0.12) : k === 'data' ? st(0.38, 0, 0.32, Math.PI) : BAL_AT),
  key(k, u, c) {
    const r = k === 'hose' ? 0.07 : k === 'fill' ? 0.07 + (BL.maxR - 0.07) * sm(u, 0.05, 1) : BL.maxR;
    const n: Record<string, number> = { r, valve: k === 'fill' ? 1 : k === 'hose' ? sm(u, 0.6, 0.9) : 0, hiss: k === 'fill' ? 1 : 0, tied: c.p('tie', 0.4, 0.9), led: c.after('sonde') || (k === 'sonde' && u > 0.5) ? 1 : 0, hose: k === 'hose' || k === 'fill' ? 1 : k === 'tie' ? 1 - sm(u, 0.1, 0.3) : 0, profile: k === 'data' ? Math.min(4, Math.floor(u * 5)) : k === 'up' ? (u > 0.5 ? 1 : 0) : 0, laptop: k === 'up' || k === 'data' ? 1 : 0, string: k === 'sonde' ? sm(u, 0.3, 0.7) : k === 'hose' || k === 'fill' || k === 'tie' ? 0 : 1 };
    const stood = onNozzle(r);
    const held = c.bd(0.12, 0.72 * c.H, 0.34);
    const sondeHome = BL.cradle;
    switch (k) {
      case 'hose':
        // Hose to the nozzle, the cylinder's valve opened with a crouch.
        return { l: add(BL.nozzle, 0.03, -0.1, 0.04), r: add(BL.valve, 0.02, 0, 0.06), crouch: 0.15, lean: 0.25, nod: 0.3, gl: 0.8, gr: 0.8, palms: 0.2, props: { bal: stood, sonde: sondeHome }, n };
      case 'fill':
        // A hand steadying the neck, an eye on it swelling.
        return { l: add(BL.nozzle, 0.05, 0.02, 0.06), r: c.bd(-0.2, 0.68 * c.H, 0.3), lean: 0.08, nod: -0.2 - 0.25 * u, gl: 0.7, gr: 0.2, palms: 0.1, props: { bal: stood, sonde: sondeHome }, n };
      case 'tie': {
        // The neck wound off and knotted, the valve shut first.
        const a = u * Math.PI * 6;
        return { l: add(BL.nozzle, 0.05 + 0.02 * Math.cos(a), 0.03, 0.06), r: u < 0.28 ? add(BL.valve, 0.02, 0, 0.06) : add(BL.nozzle, -0.05 - 0.02 * Math.cos(a), 0.03 + 0.02 * Math.sin(a), 0.06), lean: 0.2, nod: 0.25, gl: 0.8, gr: 0.8, palms: 0.4, props: { bal: stood, sonde: sondeHome }, n };
      }
      case 'sonde': {
        // Off the cradle, switched on, clipped to the line.
        const s = lerpV(sondeHome, c.bd(0.05, 0.6 * c.H, 0.3), sm(u, 0.05, 0.4));
        return { l: add(BL.nozzle, 0.04, 0.02, 0.05), r: add(s, 0, 0.07, 0.02), lean: 0.14, nod: 0.4, gl: 0.8, gr: 0.8, palms: 0.5, props: { bal: stood, sonde: s }, n };
      }
      case 'ready': {
        // Out in the open: the sonde in one hand, the line in the other, the balloon pulling up.
        const bob = 0.02 * wave(c.t, 0.7);
        return { l: held, r: add(held, -0.16, 0.12, 0), lean: -0.02, nod: -0.3, gl: 0.9, gr: 0.9, palms: 0.4, props: { bal: add(held, 0.02 + bob, 1.18, 0), sonde: add(held, 0, -0.09, 0) }, n };
      }
      case 'release': {
        // Arms up and let go at the top.
        const up = sm(u, 0, 0.6);
        const h = add(held, 0, 0.5 * up, 0);
        const free = sm(u, 0.6, 1);
        const b = add(h, 0.02, 1.18 + 0.9 * free, 0);
        return { l: u < 0.62 ? h : add(h, 0.05, 0.05, 0), r: u < 0.62 ? add(h, -0.14, 0.14, 0) : add(h, -0.2, 0.05, 0), lean: -0.05, nod: -0.5, gl: u < 0.6 ? 0.9 : 0.05, gr: u < 0.6 ? 0.9 : 0.05, palms: 0.4, props: { bal: b, sonde: add(b, 0, -1.3, 0) }, n };
      }
      case 'up': {
        // Up and away on the wind, a hand shading the eyes.
        const start = add(held, 0.02, 0.5 + 2.08, 0);
        const b: V = [start[0] + 1.6 * u * u, start[1] + 13 * Math.pow(u, 1.25), start[2] - 1.2 * u * u];
        return { l: c.bd(0.05, 0.96 * c.H, 0.12), r: idle(c, -1), lean: -0.05, nod: -0.6 - 0.1 * u, palms: 0, gl: 0.1, props: { bal: b, sonde: add(b, 0, -1.3, 0) }, n };
      }
      default: {
        // Back at the receiver: the first levels coming in; a note made.
        const w = add(BL.laptop, 0.14 - 0.01, 0.03, 0.16);
        return { l: add(BL.laptop, -0.06, 0.012 + 0.012 * Math.max(0, wave(c.t, 3)), 0.14), r: u > 0.6 ? w : add(BL.laptop, 0.06, 0.012, 0.14), lean: 0.34, nod: 0.5, palms: 1, gr: 0.3, tap: true, props: { bal: null, sonde: null }, n };
      }
    }
  },
};

// =============================================================================================
// 기상 레이더 (weatherStation, 1 × 1): the console with a round scope, range dial, strip printer,
// the log on its hook, a radome model on top. Also the 항공사 운항 센터's: nothing here says who's using it.

export const WS = {
  scope: [0, 1.24, -0.1] as V,
  dial: [0.26, 0.98, 0.0] as V,
  mode: [-0.26, 0.98, 0.0] as V,
  strip: [-0.26, 1.16, 0.02] as V,
  clip: [0.31, 0.72, 0.1] as V,
  keys: [0, 0.96, 0.06] as V,
};
const WS_AT = st(0, 0, 0.5, Math.PI);
const RADAR: Script = {
  seq: [['wake', 1.4], ['sweep', 2.8], ['zoom', 2.4], ['cell', 2.6], ['sat', 2.4], ['print', 2.2], ['read', 2.2]],
  at: () => WS_AT,
  key(k, u, c) {
    const n: Record<string, number> = { on: k === 'wake' ? sm(u, 0.3, 0.7) : 1, mode: k === 'sat' || k === 'print' || k === 'read' ? (k === 'sat' && u < 0.3 ? 0 : 1) : 0, range: k === 'zoom' ? Math.floor(u * 2.99) : k === 'cell' ? 2 : 0, cell: k === 'cell' ? 1 : 0, strip: k === 'print' ? sm(u, 0.1, 0.7) : k === 'read' ? 0 : 0 };
    const held = c.bd(-0.04, 0.62 * c.H, 0.28);
    switch (k) {
      case 'wake':
        return { l: idle(c, 1), r: add(WS.keys, 0.08, u > 0.3 && u < 0.5 ? 0 : 0.03, 0), lean: 0.2, nod: 0.3, gr: 0.2, palms: 0.9, props: { paper: null }, n };
      case 'sweep': {
        // A finger round the scope, after the sweep.
        const a = c.t * 2.2;
        return { l: idle(c, 1), r: add(WS.scope, 0.1 * Math.sin(a), 0.1 * Math.cos(a), 0.09), lean: 0.2, nod: 0.25, gr: 0.1, palms: 0, props: { paper: null }, n };
      }
      case 'zoom':
        return { l: idle(c, 1), r: add(WS.dial, 0.006 * Math.sin(u * 16), 0.03, 0.02), lean: 0.2, nod: 0.35, gr: 0.75, palms: 0.5, props: { paper: null }, n };
      case 'cell':
        return { l: c.bd(0.14, 0.72 * c.H, 0.3), r: add(WS.scope, 0.06, 0.05, 0.09), lean: 0.3, nod: 0.2, gl: 0.2, gr: 0.1, palms: 0, props: { paper: null }, n };
      case 'sat':
        return { l: add(WS.mode, 0, 0.03 + (frac(u * 2) < 0.2 ? -0.01 : 0.012), 0.02), r: idle(c, -1), lean: 0.22, nod: 0.25, gl: 0.3, palms: 0.5, props: { paper: null }, n };
      case 'print':
        return { l: idle(c, 1), r: u > 0.72 ? add(WS.strip, 0.0, -0.1, 0.06) : c.bd(-0.2, 0.68 * c.H, 0.28), lean: 0.2, nod: 0.3, gr: 0.8, palms: 0.5, props: { paper: u > 0.8 ? add(WS.strip, 0, -0.1, 0.06) : null }, n };
      default:
        return { l: add(held, 0.1, 0, 0), r: add(held, -0.1, 0.02, 0), lean: 0.02, nod: 0.5, gl: 0.8, gr: 0.8, palms: 0.4, props: { paper: held }, n };
    }
  },
};
const LOG: Script = {
  seq: [['take', 1.6], ['read', 2.6], ['write', 3.2], ['strip', 2.2], ['clip2', 1.6], ['key', 2.8], ['hang', 1.6]],
  at: () => WS_AT,
  key(k, u, c) {
    const board = atChest(c);
    const n: Record<string, number> = { on: 1, mode: 2, lines: k === 'take' || k === 'read' ? 0 : k === 'write' ? Math.min(5, Math.floor(u * 6)) : 5, table: k === 'key' ? Math.min(5, Math.floor(u * 6)) : k === 'hang' ? 5 : 0, strip: k === 'strip' ? sm(u, 0, 0.6) : 0, range: 0, clipped: c.after('strip') && k !== 'take' ? 1 : 0 };
    switch (k) {
      case 'take': {
        const b = lerpV(WS.clip, board, sm(u, 0.2, 0.9));
        return { l: add(b, 0.06, -0.02, 0), r: idle(c, -1), lean: 0.2, nod: 0.3, gl: 0.8, palms: 0.5, props: { board: b, pen: null }, n };
      }
      case 'read':
        // Off the console's readings, up and down.
        return { l: add(board, 0.06, -0.02, 0), r: add(WS.scope, -0.08 + 0.16 * frac(u * 2), -0.18 + 0.1 * Math.floor(u * 2), 0.14), lean: 0.2, nod: Math.floor(u * 4) % 2 ? 0.45 : 0.18, gl: 0.8, gr: 0.15, palms: 0, props: { board, pen: null }, n };
      case 'write': {
        const w = add(writeOn(board, u, 5, 0.12), 0, 0, 0.02);
        return { l: add(board, 0.06, -0.02, 0), r: w, lean: 0.06, nod: 0.5, gl: 0.8, gr: 0.85, palms: 0.5, props: { board, pen: w }, n };
      }
      case 'strip':
        // The hour's strip off the printer.
        return { l: add(board, 0.06, -0.02, 0), r: u < 0.7 ? add(WS.strip, 0, -0.05 * u, 0.06) : add(board, -0.02, 0.05, 0.02), lean: 0.2, nod: 0.3, gl: 0.8, gr: 0.8, palms: 0.5, props: { board, pen: null, paper: u > 0.5 ? add(WS.strip, (board[0] - WS.strip[0]) * sm(u, 0.6, 0.95), (board[1] - WS.strip[1]) * sm(u, 0.6, 0.95), (board[2] - WS.strip[2]) * sm(u, 0.6, 0.95)) : null }, n };
      case 'clip2':
        // Clipped under the spring.
        return { l: add(board, 0.06, -0.02, 0), r: add(board, 0, 0.1 + 0.015 * wave(c.t, 2), 0.01), lean: 0.06, nod: 0.5, gl: 0.8, gr: 0.7, palms: 0.5, props: { board, pen: null }, n };
      case 'key':
        return { l: add(board, 0.04, -0.06, 0.02), r: add(WS.keys, 0.05 + 0.03 * Math.sin(c.t * 9), 0.012 + 0.012 * Math.max(0, wave(c.t, 3.4)), 0), lean: 0.18, nod: Math.floor(u * 5) % 2 ? 0.48 : 0.2, gl: 0.8, gr: 0.15, palms: 0.9, tap: true, props: { board, pen: null }, n };
      default: {
        const b = lerpV(board, WS.clip, sm(u, 0.1, 0.8));
        return { l: add(b, 0.06, -0.02, 0), r: idle(c, -1), lean: 0.2, nod: 0.3, gl: 0.8, palms: 0.5, props: { board: b, pen: null }, n };
      }
    }
  },
};

// =============================================================================================
// 날씨 방송 세트 (weatherSet, 2 × 1): the green wall, the mark on the floor, a return monitor at the side,
// the writing desk at the left; the camera, prompter and operator out front while it's used.

export const WV = {
  mark: st(0.05, 0, 0.1, 0.1),
  desk: { x: -0.7, top: 0.74, z: 0.05 },
  stool: st(-0.7, 0.5, 0.42, Math.PI, { sit: true, floor: 0 }),
  mon: [0.72, 1.28, 0.28] as V,
  camZ: 1.95,
};
const scr = (a: number, b: number, c: Ctx): V => c.bd(a, b * c.H, 0.3);
const PRESENT: Script = {
  seq: [['cue', 2.2], ['hello', 2.2], ['map', 3.4], ['click', 1.2], ['rain', 3.0], ['click2', 1.2], ['temp', 3.0], ['close', 2.2], ['off', 1.6]],
  at(k) {
    if (k === 'map' || k === 'rain') return st(0.05, 0, 0.1, 0.5);
    if (k === 'temp') return st(0.0, 0, 0.1, -0.35);
    return WV.mark;
  },
  key(k, u, c) {
    const live = k !== 'cue' && k !== 'off';
    const n: Record<string, number> = { onair: k === 'cue' ? (u > 0.9 ? 1 : 0) : k === 'off' ? (u < 0.2 ? 1 : 0) : 1, count: k === 'cue' ? 3 - Math.floor(u * 3.4) : -1, map: k === 'cue' || k === 'hello' ? 0 : k === 'map' ? 0 : k === 'click' ? (u < 0.4 ? 0 : 1) : k === 'rain' ? 1 : k === 'click2' ? (u < 0.4 ? 1 : 2) : k === 'temp' ? 2 : 3, live: live ? 1 : 0, thumb: k === 'off' ? sm(u, 0.2, 0.5) : 0, pan: k === 'map' ? 0.12 : k === 'temp' ? -0.08 : 0 };
    const clicker = (r: V): Record<string, V | null> => ({ clicker: add(r, 0, -0.02, 0.02) });
    const hip = c.bd(-0.2, 0.6 * c.H, 0.16);
    switch (k) {
      case 'cue':
        // Straightening up, the mic pack checked, eyes on the operator's fingers.
        return { l: c.bd(0.05, 0.74 * c.H, 0.12), r: hip, lean: 0, nod: -0.05, gr: 0.75, gl: 0.3, palms: 0.5, props: clicker(hip), n };
      case 'hello': {
        const nod = u < 0.4 ? 0.3 * Math.sin(u * 7.8) : 0;
        return { l: openTo(c, 1, 0.3, 0.66), r: hip, lean: 0.06 + nod * 0.3, nod: nod - 0.03, gl: 0.05, gr: 0.75, palms: -0.2, props: clicker(hip), n };
      }
      case 'map': {
        // The arm drawn across the wall behind them: west to east.
        const s = sm(u, 0.05, 0.95);
        return { l: scr(0.56 - 0.05 * s, 0.86 - 0.14 * s, c), r: hip, lean: 0, nod: -0.05, gl: 0.05, gr: 0.75, palms: -0.1, props: clicker(hip), n };
      }
      case 'click':
      case 'click2': {
        const r = c.bd(-0.14, 0.64 * c.H, 0.2);
        return { l: openTo(c, 1, 0.26, 0.6), r: add(r, 0, u > 0.25 && u < 0.45 ? 0.02 : 0, 0), lean: 0.03, nod: 0.05, gl: 0.05, gr: 0.8, palms: -0.2, props: clicker(r), n };
      }
      case 'rain': {
        // The band shown with the flat of a hand, swept up the map.
        const s = frac(u * 2);
        return { l: scr(0.5 - 0.12 * s, 0.68 + 0.26 * s, c), r: hip, lean: 0.02, nod: -0.05, gl: 0.03, gr: 0.75, palms: -0.2, props: clicker(hip), n };
      }
      case 'temp': {
        // The other way now: pointing out the towns, one, two, three.
        const i = Math.floor(u * 3);
        const r = scr(-0.46 + 0.05 * i, 0.82 - 0.1 * i, c);
        return { l: c.bd(0.18, 0.6 * c.H, 0.18), r, lean: 0.01, nod: -0.04, gl: 0.3, gr: 0.8, palms: 0, props: clicker(r), n };
      }
      case 'close':
        // To the lens, both hands open: 우산 챙기세요.
        return { l: openTo(c, 1, 0.3, 0.66), r: add(openTo(c, -1, 0.3, 0.66), 0, 0, 0), lean: 0.06 + 0.04 * sm(u, 0.7, 0.95), nod: -0.03 + 0.2 * sm(u, 0.7, 0.95), gl: 0.05, gr: 0.75, palms: -0.2, props: clicker(openTo(c, -1, 0.3, 0.66)), n };
      default:
        // Off air: shoulders down, a thumb back to the operator.
        return { l: idle(c, 1), r: c.bd(-0.22, 0.72 * c.H, 0.26), lean: -0.02, nod: 0.08, gr: 0.5, palms: 0.5, props: clicker(c.bd(-0.22, 0.72 * c.H, 0.26)), n };
    }
  },
};
const WSD: V = [WV.desk.x, WV.desk.top, WV.desk.z];
const WSLAP: V = add(WSD, 0, 0.02, -0.02);
const SCRIPT: Script = {
  seq: [['open', 1.6], ['type', 3.2], ['read', 3.0], ['time', 1.8], ['cut', 2.4], ['rehearse', 3.4, 1.0], ['print', 1.6]],
  at: (k) => (k === 'rehearse' ? st(0.08, 0, 0.1, 0.1) : WV.stool),
  key(k, u, c) {
    const paper = add(WSD, 0.2, 0.012, 0.12);
    const n: Record<string, number> = { script: k === 'open' ? 0 : k === 'type' ? 1 + Math.floor(u * 2.99) : k === 'cut' ? 4 : 3, lid: k === 'open' ? sm(u, 0.2, 0.7) : 1, watch: k === 'time' ? u * 1 : k === 'read' ? u * 0.8 : 0, cuts: k === 'cut' ? Math.floor(u * 2.99) : c.after('cut') ? 2 : 0, on: k === 'open' ? sm(u, 0.5, 0.8) : 1, onair: 0, map: 0, count: -1, live: 0 };
    const held = c.bd(0.04, 0.62 * c.H, 0.28);
    const kb = (s: number) => add(WSLAP, s * 0.08, 0.01 + 0.012 * Math.max(0, wave(c.t + s * 0.2, 3.2)), 0.08);
    switch (k) {
      case 'open':
        return { l: add(WSLAP, -0.08, 0.05 + 0.1 * sm(u, 0.2, 0.7), -0.04), r: add(WSLAP, 0.08, 0.05 + 0.1 * sm(u, 0.2, 0.7), -0.04), lean: 0.14, nod: 0.3, palms: 0.9, props: { paper: null, pen: null }, n };
      case 'type':
        return { l: kb(-1), r: kb(1), lean: 0.14, nod: 0.25, palms: 1, gl: 0.1, gr: 0.1, tap: true, props: { paper: null, pen: null }, n };
      case 'read':
        // Aloud, off the screen, one hand beating the phrases.
        return { l: kb(-1), r: c.bd(-0.2, (0.4 + 0.03 * wave(c.t, 1)) * c.H, 0.3), lean: 0.05, nod: 0.05 + 0.05 * wave(c.t, 0.7), palms: 0, gr: 0.15, props: { paper: null, pen: null }, n };
      case 'time': {
        // The stopwatch looked at: 40 seconds is too long.
        const w = c.bd(0.05, 0.38 * c.H, 0.3);
        return { l: add(w, 0, -0.01, 0), r: kb(1), lean: 0.08, nod: 0.5, gl: 0.8, palms: 0.9, props: { watch: w, paper: null, pen: null }, n };
      }
      case 'cut': {
        const row = Math.floor(u * 2.99);
        const p = add(paper, -0.06 + 0.12 * frac(u * 3), 0.02, -0.04 + row * 0.04);
        return { l: add(paper, -0.12, 0.01, 0), r: p, lean: 0.2, nod: 0.5, gr: 0.85, palms: 0.8, props: { paper, pen: p }, n };
      }
      case 'rehearse':
        // Up at the mark with the page: the gestures tried.
        return { l: add(held, 0.04, 0, 0), r: c.bd(-0.34, (0.72 + 0.1 * wave(c.t, 0.5)) * c.H, 0.24), lean: 0.04, nod: 0.25 * (frac(u * 2) < 0.5 ? 1 : 0) - 0.03, gl: 0.8, gr: 0.05, palms: -0.1, props: { paper: held, pen: null }, n };
      default:
        return { l: kb(-1), r: add(WSLAP, 0.14, 0.02, 0.1), lean: 0.12, nod: 0.25, palms: 0.9, gr: 0.4, props: { paper, pen: null }, n };
    }
  },
};

// =============================================================================================
// 예보 토의 테이블 (metBriefTable, 3 × 2): the table across, the wall screen at its left end, the hour's
// clock on it; the dweller sat at the far side, or stood at the screen and running it.

export const BR = {
  top: 0.74,
  tx: 0.32,
  seat: st(-0.15, 0.47, -0.76, 0, { sit: true, floor: 0 }),
  folder: [-0.15, 0.76, -0.28] as V,
  screen: [-1.32, 1.42, 0] as V,
  podium: st(-0.9, 0, 0.08, -1.3),
  turn: st(-0.86, 0, 0.1, 1.5),
  side: [-1.31, 0.74, 0.46] as V,
};
/** A point on the screen as the piece sees it (it faces +x at x = screen[0]). */
const onScr = (a: number, b: number): V => [BR.screen[0] + 0.03, BR.screen[1] + b * 0.45, a * 0.68];
const BRIEF: Script = {
  seq: [['sit', 1.6], ['listen', 3.2], ['note', 2.6], ['raise', 1.8], ['speak', 3.2], ['vote', 2.4], ['close', 1.6]],
  at: () => BR.seat,
  key(k, u, c) {
    const F = BR.folder;
    const n: Record<string, number> = { slide: k === 'listen' ? Math.floor(u * 2.99) : k === 'note' ? 2 : k === 'raise' || k === 'speak' ? 3 : 4, open: k === 'sit' ? sm(u, 0.2, 0.8) : k === 'close' ? 1 - sm(u, 0.2, 0.8) : 1, notes: k === 'note' ? 1 + Math.floor(u * 2.99) : k === 'sit' || k === 'listen' ? 0 : 3, boss: k === 'listen' || k === 'note' ? 1 : k === 'raise' || k === 'speak' ? 2 : 3, heads: k === 'speak' || k === 'raise' ? 1 : 0, cards: k === 'vote' ? sm(u, 0.2, 0.5) : 0, pct: k === 'vote' && u > 0.65 ? 1 : k === 'close' ? 1 : 0 };
    const pen = add(F, 0.15, 0.02, 0.02);
    switch (k) {
      case 'sit':
        return { l: add(F, -0.18, 0.02 + 0.05 * sm(u, 0.2, 0.7), 0.05), r: add(F, 0.15, 0.02, 0.04), lean: 0.12, nod: 0.4, palms: 0.9, gl: 0.5, props: { pen: null, card: null }, n };
      case 'listen':
        // Turned to the screen; a nod now and then.
        return { l: add(F, -0.15, 0.01, 0.04), r: chin(c), lean: 0.02, nod: 0.05 + 0.05 * wave(c.t, 0.35), palms: 0.9, gr: 0.2, props: { pen: null, card: null }, n };
      case 'note': {
        const w = add(writeOn(F, u, 3, 0.14), 0.05, 0, 0.03);
        return { l: add(F, -0.15, 0.01, 0.04), r: w, lean: 0.2, nod: 0.45, palms: 0.9, gr: 0.85, props: { pen: w, card: null }, n };
      }
      case 'raise':
        return { l: add(F, -0.15, 0.01, 0.04), r: c.bd(-0.16, 0.72 + 0.28 * sm(u, 0.1, 0.5), 0.1), lean: 0, nod: -0.05, palms: 0.1, gr: 0.05, props: { pen: pen, card: null }, n };
      case 'speak':
        // Two models apart; the difference shown between the hands.
        return { l: c.bd(0.2, 0.42 + 0.04 * wave(c.t, 0.9), 0.32), r: c.bd(-0.2, 0.42 - 0.04 * wave(c.t, 0.9), 0.32), lean: 0.12, nod: 0.02, palms: -0.1, gl: 0.1, gr: 0.1, props: { pen, card: null }, n };
      case 'vote': {
        // Everyone's rain chance held up on a card.
        const up = c.bd(-0.12, 0.34 + 0.32 * sm(u, 0.1, 0.45), 0.28);
        return { l: add(F, -0.15, 0.01, 0.04), r: add(up, 0, -0.06, 0), lean: 0.03, nod: -0.05, palms: 0.4, gr: 0.85, props: { pen, card: up }, n };
      }
      default:
        return { l: add(F, -0.18, 0.02 + 0.05 * (1 - sm(u, 0.2, 0.7)), 0.05), r: add(F, 0.15, 0.02, 0.04), lean: 0.1, nod: 0.3, palms: 0.9, gl: 0.5, props: { pen: null, card: null }, n };
    }
  },
};
const LEAD: Script = {
  seq: [['open', 2.0, 0.6], ['radar', 3.0, 0.6], ['ask', 3.0, 0.6], ['overlay', 2.6, 0.6], ['decide', 2.8, 0.6], ['assign', 3.2], ['close', 1.6]],
  at: (k) => (k === 'open' || k === 'radar' || k === 'overlay' || k === 'decide' ? BR.podium : BR.turn),
  key(k, u, c) {
    const n: Record<string, number> = { slide: k === 'open' ? 0 : k === 'radar' ? 1 : k === 'ask' ? 2 : k === 'overlay' ? 3 : 4, open: 0, notes: 0, boss: 0, heads: k === 'ask' ? 2 : 1, cards: 0, pct: k === 'assign' || k === 'close' ? 1 : 0, lead: 1, seated: 1, writes: k === 'decide' ? sm(u, 0.2, 0.8) : 0, nodAll: k === 'close' ? 1 : 0, assign: k === 'assign' ? Math.floor(u * 2.99) : -1 };
    const remote = c.bd(-0.2, 0.62 * c.H, 0.2);
    const clicker: Record<string, V | null> = { remote };
    switch (k) {
      case 'open':
        // A glance at the clock: 정시, and the slides up.
        return { l: idle(c, 1), r: add(remote, 0, u > 0.5 && u < 0.6 ? -0.01 : 0, 0), lean: 0.02, nod: -0.1, gr: 0.85, props: clicker, n };
      case 'radar': {
        const f = onScr(0.25 - 0.45 * sm(u, 0.1, 0.9), 0.1 + 0.25 * Math.sin(u * 6));
        return { l: add(f, 0.08, -0.04, 0), r: remote, lean: 0.05, nod: -0.1, gl: 0.1, gr: 0.85, palms: 0, props: clicker, n };
      }
      case 'ask':
        return { l: openTo(c, 1, 0.34, 0.7), r: remote, lean: 0.05, nod: 0.05, gl: 0.05, gr: 0.85, palms: -0.2, props: clicker, n };
      case 'overlay':
        return { l: add(onScr(-0.1 + 0.2 * Math.sin(u * 5), -0.05), 0.08, -0.04, 0), r: add(remote, 0, u < 0.2 ? -0.01 : 0, 0), lean: 0.05, nod: -0.05, gl: 0.1, gr: 0.85, palms: 0, props: clicker, n };
      case 'decide': {
        // 강수확률 60%, written on the side board.
        const tip = add(BR.side, 0.03, 0.1 * Math.sin(u * 14), -0.1 + 0.2 * u);
        return { l: add(tip, 0.06, -0.03, 0), r: remote, lean: 0.08, nod: 0, gl: 0.85, gr: 0.85, palms: 0.1, props: { ...clicker, marker: tip }, n };
      }
      case 'assign': {
        // Each in turn: you've the warning, you the broadcast, you the night shift.
        const i = Math.floor(u * 3);
        return { l: c.bd(0.1 + (i - 1) * 0.28, (0.72 + 0.04 * wave(c.t, 1.4)) * c.H, 0.44), r: remote, lean: 0.06, nod: 0.08, gl: 0.1, gr: 0.85, palms: 0, props: clicker, n };
      }
      default:
        return { l: idle(c, 1), r: add(remote, 0, 0, 0), lean: 0.18 * Math.sin(u * Math.PI), nod: 0.25 * Math.sin(u * Math.PI), gr: 0.85, props: clicker, n };
    }
  },
};

// =============================================================================================
// 태풍 진로 테이블 (metTyphoonTable, 2 × 2): a lit map table, the pins, the fan of tracks.

export const TY = {
  top: 0.9,
  telex: [-0.72, 0.92, 0.46] as V,
  /** A point on the map: a -1..1 across, b -1..1 far to near. */
  map: (a: number, b: number): V => [a * 0.74, 0.93, b * 0.56],
  pin: [0.34, -0.1] as const,
  tablet: [0.68, 0.93, 0.52] as V,
  stamp: [0.38, 0.93, 0.56] as V,
};
const TY_AT = st(0.0, 0, 0.96, Math.PI);
const TY_L = st(-0.6, 0, 0.96, Math.PI);
const TY_R = st(0.62, 0, 0.96, Math.PI);
const TYPHOON: Script = {
  seq: [['read', 2.2, 0.7], ['plot', 2.6], ['ruler', 3.0, 0.7], ['ens', 2.6, 0.7], ['cone', 3.2], ['talk', 2.8], ['stamp', 2.0]],
  at: (k) => (k === 'read' ? TY_L : k === 'ens' || k === 'stamp' ? TY_R : k === 'talk' ? st(0.2, 0, 1.0, Math.PI - 0.5) : TY_AT),
  key(k, u, c) {
    const pinTo = TY.map(TY.pin[0], TY.pin[1]);
    const n: Record<string, number> = { stage: k === 'read' ? 0 : k === 'plot' ? 0 : k === 'ruler' ? (u < 0.6 ? 1 : 2) : k === 'ens' ? 3 : k === 'cone' ? (u < 0.5 ? 3 : 4) : k === 'talk' ? 4 : 5, pinIn: c.p('plot', 0.5, 0.75), buddy: k === 'talk' ? 1 : 0, tablet: k === 'ens' ? 1 : 0, stamped: k === 'stamp' && u > 0.5 ? 1 : 0, warnLamp: k === 'cone' || k === 'talk' || k === 'stamp' ? 1 : 0 };
    const paper = c.bd(0.08, 0.64 * c.H, 0.3);
    switch (k) {
      case 'read': {
        // The latest position off the telex: the sheet lifted.
        const p = lerpV(TY.telex, paper, sm(u, 0.1, 0.5));
        return { l: add(p, 0.05, -0.02, 0), r: add(p, -0.08, 0.03 - 0.04 * frac(u * 2), 0.03), lean: 0.1, nod: 0.45, gl: 0.8, gr: 0.2, palms: 0.5, props: { telex: p, pin: null, ruler: null, stick: null }, n };
      }
      case 'plot': {
        // A red pin into the map at the new centre.
        const p = lerpV(add(pinTo, -0.3, 0.2, 0.3), add(pinTo, 0, 0.09, 0), sm(u, 0.15, 0.7));
        return { l: add(TY.map(-0.12, 0.46), 0, 0, 0), r: add(p, 0, 0.03, 0.03), lean: 0.42, nod: 0.65, gl: 0.25, gr: 0.85, palms: 0.8, props: { pin: u < 0.72 ? p : null, ruler: null, stick: null }, n };
      }
      case 'ruler': {
        // The ruler laid along the last six fixes, the speed walked off with the dividers.
        const a = -0.2 + 0.5 * sm(u, 0, 0.5);
        const ruler = TY.map(a, 0.1);
        return { l: add(ruler, -0.2, 0.02, 0.04), r: add(ruler, 0.15 + 0.1 * Math.sin(u * 10), 0.04, -0.03), lean: 0.45, nod: 0.65, gl: 0.7, gr: 0.75, palms: 0.8, props: { ruler, stick: null }, n };
      }
      case 'ens': {
        // Tablet picked up: every member's track thrown on the table.
        const tab = lerpV(TY.tablet, c.bd(0, 0.62 * c.H, 0.3), sm(u, 0.05, 0.35));
        return { l: add(tab, 0.1, 0, 0), r: add(tab, -0.03 + 0.04 * Math.sin(u * 14), 0.02, 0.01), lean: 0.1, nod: 0.45, gl: 0.8, gr: 0.2, palms: 0.5, props: { tab, ruler: null, stick: null }, n };
      }
      case 'cone': {
        // The cone traced with the grease pencil: up one side, across, back the other.
        const s = sm(u, 0, 1);
        const side = s < 0.5 ? 1 : -1;
        const q = s < 0.5 ? s * 2 : (1 - s) * 2;
        const tip = TY.map(TY.pin[0] - 0.75 * q + side * 0.22 * q, TY.pin[1] - 0.55 * q);
        return { l: add(TY.map(0.05, 0.5), 0, 0, 0), r: add(tip, 0.02, 0.05, 0.05), lean: 0.5, nod: 0.7, gl: 0.2, gr: 0.85, palms: 0.8, props: { stick: tip, ruler: null }, n };
      }
      case 'talk':
        // The senior disagrees: east of that? a hand held flat over the map.
        return { l: openTo(c, 1, 0.34, 0.64), r: add(TY.map(0.2, 0.3), 0, 0.15, 0), lean: 0.2, nod: 0.05, gl: 0.05, gr: 0.05, palms: 0.5, props: { ruler: null, stick: null }, n };
      default: {
        const s = add(TY.stamp, 0, 0.1 - 0.08 * Math.sin(Math.min(1, u * 1.6) * Math.PI), 0);
        return { l: c.bd(0.22, 0.63 * c.H, 0.32), r: add(s, 0, 0.05, 0), lean: 0.3, nod: 0.6, gr: 0.9, palms: 0.8, props: { stamp: s, ruler: null, stick: null }, n };
      }
    }
  },
};

// =============================================================================================
// 관측 노장 (metObsGarden, 3 × 2): grass behind a low fence; the 백엽상 at the left, the rain gauge in the
// middle, the wind mast at the right; a gate in the near side of the fence.

export const OG = {
  screen: { x: -0.8, top: 1.46, door: 1.2, z: -0.28 },
  gauge: [0.2, 0, 0.1] as V,
  mast: [1.02, 0, -0.42] as V,
  thermo: [-0.8, 1.2, -0.05] as V,
  door: [-0.8, 1.2, 0.03] as V,
};
const OG_S = st(-0.8, 0, 0.52, Math.PI);
const OG_G = st(0.2, 0, 0.62, Math.PI);
const OG_M = st(0.72, 0, 0.2, 2.6);
const SCREEN: Script = {
  seq: [['come', 1.0, 1.1], ['open', 1.8], ['read', 3.0], ['note', 2.4], ['reset', 2.2], ['close', 1.6, 1.3], ['wind', 3.0], ['note2', 2.0, 1.2]],
  at: (k) => (k === 'come' ? st(-0.1, 0, 1.15, -2.6) : k === 'wind' || k === 'note2' ? OG_M : OG_S),
  key(k, u, c) {
    const board = atChest(c);
    const n: Record<string, number> = { door: k === 'open' ? sm(u, 0.2, 0.9) : k === 'read' || k === 'note' || k === 'reset' ? 1 : k === 'close' ? 1 - sm(u, 0.2, 0.9) : 0, lines: k === 'note' ? 1 + Math.floor(u * 2.99) : k === 'note2' ? 4 + Math.floor(u * 1.99) : k === 'come' || k === 'open' || k === 'read' ? 0 : k === 'wind' ? 3 : 3, reset: k === 'reset' ? sm(u, 0.3, 0.7) : 0 };
    switch (k) {
      case 'come':
        return { l: add(board, 0.06, -0.02, 0), r: idle(c, -1), nod: 0.1, gl: 0.8, palms: 0.5, props: { board, pen: null }, n };
      case 'open':
        return { l: add(board, 0.06, -0.02, 0), r: add(OG.door, 0.22, -0.12, 0.24 * sm(u, 0.2, 0.9) * 0.9), lean: 0.1, nod: 0.05, gl: 0.8, gr: 0.75, palms: 0.5, props: { board, pen: null }, n };
      case 'read':
        // Eye to the mercury, a finger under the reading: dry bulb, wet bulb.
        return { l: add(board, 0.06, -0.02, 0), r: add(OG.thermo, -0.1 + 0.2 * Math.floor(u * 2), 0.0, 0.12), lean: 0.34, nod: 0.05, gl: 0.8, gr: 0.1, palms: 0, props: { board, pen: null }, n };
      case 'note':
      case 'note2': {
        const w = add(writeOn(board, u, 3, 0.12), 0, 0, 0.02);
        return { l: add(board, 0.06, -0.02, 0), r: w, lean: 0.04, nod: 0.5, gl: 0.8, gr: 0.85, palms: 0.5, props: { board, pen: w }, n };
      }
      case 'reset':
        // The max/min thermometers spun to reset.
        return { l: add(board, 0.06, -0.02, 0), r: add(OG.thermo, 0.0, -0.12 + 0.03 * Math.sin(u * 12), 0.12), lean: 0.3, nod: 0.25, gl: 0.8, gr: 0.7, palms: 0.3, props: { board, pen: null }, n };
      case 'close':
        return { l: add(board, 0.06, -0.02, 0), r: add(OG.door, 0.22, -0.12, 0.22 * (1 - sm(u, 0.2, 0.9))), lean: 0.1, nod: 0.05, gl: 0.8, gr: 0.75, palms: 0.5, props: { board, pen: null }, n };
      default:
        // Up at the cups and the vane, an arm following them round.
        return { l: add(board, 0.06, -0.02, 0), r: c.bd(-0.14, (0.98 + 0.03 * wave(c.t, 0.5)) * c.H, 0.26), lean: -0.05, nod: -0.65, gl: 0.8, gr: 0.05, palms: 0, props: { board, pen: null }, n };
    }
  },
};
const G = OG.gauge;
const GAUGE: Script = {
  seq: [['come', 0.8, 1.0], ['funnel', 2.2], ['pull', 2.0], ['pour', 2.8], ['read', 2.6], ['empty', 2.2], ['back', 2.4], ['note', 2.0]],
  at: (k) => (k === 'come' ? st(0.75, 0, 1.15, -2.4) : k === 'read' || k === 'note' ? st(0.2, 0, 0.72, Math.PI) : k === 'empty' ? st(0.55, 0, 0.6, Math.PI / 2) : OG_G),
  key(k, u, c) {
    const crouchy = k === 'funnel' || k === 'pull' || k === 'pour' || k === 'back' ? 0.8 : 0;
    const funnelOn: V = [G[0], G[1] + 0.34, G[2]];
    const funnelOff: V = [G[0] + 0.32, 0.06, G[2] + 0.12];
    const cupIn: V = [G[0], 0.05, G[2]];
    const cupOut = [G[0] - 0.04, 0.42, G[2] + 0.14] as V;
    const jarGround: V = [G[0] - 0.32, 0.0, G[2] + 0.14];
    const jarHeld = c.bd(0.0, 0.84 * c.H, 0.3);
    const n: Record<string, number> = { level: k === 'come' || k === 'funnel' ? 0 : k === 'pull' ? 0 : k === 'pour' ? sm(u, 0.25, 0.85) : k === 'read' ? 1 : k === 'empty' ? 1 - sm(u, 0.25, 0.85) : 0, cupLevel: k === 'come' || k === 'funnel' || k === 'pull' ? 1 : k === 'pour' ? 1 - sm(u, 0.25, 0.85) : 0, stream: (k === 'pour' && u > 0.2 && u < 0.85) || (k === 'empty' && u > 0.2 && u < 0.85) ? 1 : 0, tip: 0, lines: k === 'note' ? 1 + Math.floor(u * 1.99) : 0 };
    switch (k) {
      case 'come':
        return { l: idle(c, 1), r: idle(c, -1), nod: 0.2, props: { funnel: funnelOn, cup: cupIn, jar: jarGround, board: null, pen: null }, n };
      case 'funnel': {
        // The funnel lifted off and set by.
        const f = lerpV(funnelOn, funnelOff, sm(u, 0.2, 0.85));
        return { l: add(f, 0.14, 0.06, 0), r: add(f, -0.14, 0.06, 0), crouch: crouchy, lean: 0.34, nod: 0.45, gl: 0.75, gr: 0.75, palms: 0.3, props: { funnel: f, cup: cupIn, jar: jarGround, board: null, pen: null }, n };
      }
      case 'pull': {
        // The collecting bottle drawn up out of the cylinder.
        const b = lerpV(cupIn, cupOut, sm(u, 0.2, 0.9));
        return { l: add(jarGround, 0, 0.18, 0), r: add(b, 0, 0.14, 0), crouch: crouchy, lean: 0.3, nod: 0.4, gl: 0.8, gr: 0.85, palms: 0.3, props: { funnel: funnelOff, cup: b, jar: jarGround, board: null, pen: null }, n };
      }
      case 'pour': {
        // Poured over into the measuring jar, not a drop lost.
        const j: V = [G[0] - 0.14, 0.34, G[2] + 0.2];
        const b = add(j, 0.13, 0.22, 0);
        return { l: add(j, 0, 0.1, 0), r: add(b, 0.02, 0.1, 0), crouch: crouchy, lean: 0.25, nod: 0.3, gl: 0.8, gr: 0.85, palms: 0.3, props: { funnel: funnelOff, cup: b, jar: j, board: null, pen: null }, n: { ...n, tip: 1 } };
      }
      case 'read':
        // Up to eye height, the meniscus read against the scale.
        return { l: add(jarHeld, 0, 0.1, 0), r: c.bd(-0.12, 0.84 * c.H, 0.32), lean: 0.02, nod: -0.02, gl: 0.8, gr: 0.1, palms: 0, props: { funnel: funnelOff, cup: cupIn, jar: jarHeld, board: null, pen: null }, n };
      case 'empty': {
        const j = c.bd(0.0, 0.6 * c.H, 0.36);
        return { l: add(j, 0, 0.1, 0), r: idle(c, -1), lean: 0.14, nod: 0.3, gl: 0.8, palms: 0.5, props: { funnel: funnelOff, cup: cupIn, jar: j, board: null, pen: null }, n: { ...n, jarTip: 1 } };
      }
      case 'back': {
        // Everything back together.
        const f = lerpV(funnelOff, funnelOn, sm(u, 0.2, 0.85));
        return { l: add(f, 0.14, 0.06, 0), r: add(f, -0.14, 0.06, 0), crouch: crouchy, lean: 0.34, nod: 0.45, gl: 0.75, gr: 0.75, palms: 0.3, props: { funnel: f, cup: cupIn, jar: jarGround, board: null, pen: null }, n };
      }
      default: {
        const board = atChest(c);
        const w = add(writeOn(board, u, 2, 0.12), 0, 0, 0.02);
        return { l: add(board, 0.06, -0.02, 0), r: w, lean: 0.04, nod: 0.5, gl: 0.8, gr: 0.85, palms: 0.5, props: { funnel: funnelOn, cup: cupIn, jar: jarGround, board, pen: w }, n };
      }
    }
  },
};

// =============================================================================================
// 날씨 문의 데스크 (metPublicDesk, 2 × 1): a phone, a screen, a headset on its hook, the leaflets.

export const PD = {
  seat: st(-0.15, 0.47, 0.52, Math.PI, { sit: true, floor: 0 }),
  phoneBtn: [0.28, 0.77, -0.08] as V,
  headset: [0.56, 0.98, -0.32] as V,
  keys: [-0.15, 0.775, -0.02] as V,
  screen: [-0.15, 1.1, -0.32] as V,
  log: [0.28, 0.76, 0.06] as V,
};
const PHONE: Script = {
  seq: [['ring', 1.4], ['answer', 1.8], ['listen', 3.0], ['look', 3.0], ['explain', 3.2], ['sorry', 2.2], ['log', 2.6]],
  at: () => PD.seat,
  key(k, u, c) {
    const head = c.bd(0, 0.72, 0.02);
    const set = k === 'ring' ? PD.headset : k === 'answer' ? lerpV(PD.headset, head, sm(u, 0.1, 0.8)) : k === 'log' && u > 0.7 ? lerpV(head, PD.headset, sm(u, 0.7, 1)) : head;
    const worn = k !== 'ring' && !(k === 'answer' && u < 0.82) && !(k === 'log' && u > 0.72);
    const n: Record<string, number> = { ring: k === 'ring' ? 1 : 0, line: k === 'ring' || (k === 'log' && u > 0.7) ? 0 : 1, screen: k === 'look' ? 1 + Math.floor(u * 2.99) : k === 'explain' || k === 'sorry' ? 3 : k === 'log' ? 4 : 0, worn: worn ? 1 : 0, lines: k === 'log' ? Math.min(3, Math.floor(u * 4)) : 0 };
    const kb = (s: number) => add(PD.keys, s * 0.08, 0.012 * Math.max(0, wave(c.t + s * 0.2, 3.2)), 0.02);
    switch (k) {
      case 'ring':
        return { l: kb(-1), r: add(PD.phoneBtn, 0, u > 0.7 ? 0.0 : 0.05, 0), lean: 0.12, nod: 0.25, palms: 1, gr: 0.2, props: { set }, n };
      case 'answer':
        return { l: kb(-1), r: add(set, 0.02, -0.02, 0.02), lean: 0.08, nod: 0.1, palms: 1, gr: 0.85, props: { set }, n };
      case 'listen':
        // Pen tapped; a nod to no one.
        return { l: kb(-1), r: chin(c), lean: 0.04, nod: 0.08 + 0.08 * wave(c.t, 0.8), palms: 1, gr: 0.3, props: { set }, n };
      case 'look':
        return { l: kb(-1), r: kb(1), lean: 0.16, nod: -0.02, palms: 1, gl: 0.1, gr: 0.1, tap: true, props: { set }, n };
      case 'explain':
        // To someone who can't see it, the hands still go: the shower moved east.
        return { l: kb(-1), r: c.bd(-0.2 + 0.15 * wave(c.t, 0.5), (0.45 + 0.03 * wave(c.t, 1)), 0.34), lean: 0.05, nod: 0.05, palms: 0, gr: 0.1, props: { set }, n };
      case 'sorry': {
        // 죄송합니다, a small bow to the phone.
        const b = Math.max(0, Math.sin(u * Math.PI * 2));
        return { l: kb(-1), r: kb(1), lean: 0.05 + 0.22 * b, nod: 0.1 + 0.3 * b, palms: 1, props: { set }, n };
      }
      default: {
        // Logged, the headset back.
        const w = writeOn(PD.log, Math.min(1, u / 0.7), 3, 0.12);
        return { l: u > 0.7 ? kb(-1) : add(PD.log, -0.12, 0.01, 0), r: u > 0.7 ? add(set, 0.02, -0.02, 0.02) : w, lean: 0.12, nod: 0.4, palms: 1, gr: 0.85, props: { set, pen: u > 0.7 ? null : w }, n };
      }
    }
  },
};

const SCRIPTS: Record<MtMotion, Script> = {
  mtChart: CHART,
  mtSevere: SEVERE,
  mtRun: RUN,
  mtVerify: VERIFY,
  mtBalloon: BALLOON,
  mtRadar: RADAR,
  mtLog: LOG,
  mtPresent: PRESENT,
  mtScript: SCRIPT,
  mtBrief: BRIEF,
  mtLead: LEAD,
  mtTyphoon: TYPHOON,
  mtScreen: SCREEN,
  mtGauge: GAUGE,
  mtPhone: PHONE,
};
