import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 공항 세관 (2026-11-01, the workplace pipeline, at the user's request). Each motion is a round of beats: where
 * the dweller is, where the hands go, and what moves. The piece reads the same script by the same clock (customsOfficer.ts), so
 * the bag on the belt is the shape on the screen and the souvenir in the hand is the one out of the suitcase.
 *
 * - 수하물 엑스레이 (baggageXray): cuScan seated at the console: a bag rolls in, is stopped, zoomed, marked or passed, rolls out.
 * - 세관 검사대 (inspectionTable): cuInspect a traveller lays their case down; opened, two things lifted out, a souvenir held up
 *   and asked about, packed, closed, a sticker. cuCargo a flagged crate prised open, a torch, far too many handbags counted.
 *   cuSweep a carton off the floor, opened and gone through, the underside of the table by torch, a tick on the sheet.
 * - 통관 서류 데스크 (customsDesk): cuDeclare a form read, typed in and stamped. cuValue an invoice worked out on the
 *   calculator and entered. cuAudit two papers ruled against each other and a figure marked.
 * - 녹색·적색 통로 (cuLaneGate): cuLane two travellers come through the doors: one waved along green, one stopped and shown to red.
 * - 탐지견 검색대 (cuDogLane): cuDog the dog worked along the bags on a lead; it sits at one, is praised, and it's an apple.
 * - 유치품 보관함 (cuSeizedCage): cuSeized unlocked, a box of fruit carried in, tagged, the shelf counted, locked and signed.
 * - 관제실 (cuMonitorDesk): cuWatch six cameras, one brought up, a word on the radio, written in the log.
 * - 수하물 수취대 (cuCarousel): cuBelt a bag nobody's taken, lifted off, its tag read, wheeled aside.
 * - 세금 납부 창구 (cuDutyCounter): cuDuty a form passed over, the duty worked out and explained, paid by card, a receipt.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. All names and goods are made up, and nothing found is worse than fruit and handbags.
 */
export type CuMotion = 'cuScan' | 'cuInspect' | 'cuCargo' | 'cuSweep' | 'cuDeclare' | 'cuValue' | 'cuAudit' | 'cuLane' | 'cuDog' | 'cuSeized' | 'cuWatch' | 'cuBelt' | 'cuDuty';
export const CU_MOTIONS = new Set<string>(['cuScan', 'cuInspect', 'cuCargo', 'cuSweep', 'cuDeclare', 'cuValue', 'cuAudit', 'cuLane', 'cuDog', 'cuSeized', 'cuWatch', 'cuBelt', 'cuDuty']);

export const frac = (x: number) => ((x % 1) + 1) % 1;
export const cuPhase = (p: THREE.Vector3) => frac(p.x * 0.417 + p.z * 0.613);
export const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
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
export interface CuNow {
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
export function cuNow(m: CuMotion, t: number, ph: number, H = 1.6): CuNow {
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
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function cuPose(m: CuMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = cuNow(m, t, cuPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Both hands either side of a point (the right on +x as you face the piece). */
const both = (p: V, dx: number, up = 0.03, ahead = 0.05, g = 0.75): Key => ({ r: add(p, dx, up, ahead), l: add(p, -dx, up, ahead), gr: g, gl: g });
/** Hands easy at the waist. */
const easy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const beat = (u: number, a: number, b: number) => sm(u, a, b);

// =============================================================================================
// 수하물 엑스레이 (baggageXray, 2 × 1): the belt runs across, from +x into the tunnel and out at -x. The console is before the tunnel.

export const XR = {
  seat: [-0.34, 0.47, 0.84] as V,
  beltY: 0.66,
  z: -0.14,
  from: 0.86,
  to: -0.86,
  /** How far along the belt the bag stops, under the beam. */
  stop: 0.5,
  keys: [-0.52, 0.76, 0.36] as V,
  stick: [-0.18, 0.78, 0.36] as V,
  red: [-0.02, 0.78, 0.36] as V,
  screen: [-0.08, 1.12, 0.17] as V,
};
const SCAN: Script = {
  seq: [['next', 1.2], ['roll', 3.0], ['halt', 1.2], ['zoom', 2.6], ['call', 2.0], ['out', 1.8]],
  at: () => sat(XR.seat),
  key(k, u, c) {
    const pos = k === 'next' ? 0 : k === 'roll' ? XR.stop * sm(u, 0.04, 0.96) : k === 'out' ? mixN(XR.stop, 1, sm(u, 0.05, 0.95)) : XR.stop;
    const n = { pos, run: k === 'roll' || k === 'out' ? 1 : 0, zoom: c.p('zoom', 0.1, 0.5) * (1 - c.p('out', 0, 0.3)), mark: c.p('call', 0, 0.2) * (1 - c.p('out', 0, 0.3)), lit: 1 };
    const bag: V = [mixN(XR.from, XR.to, pos), XR.beltY, XR.z];
    const onKeys = add(XR.keys, 0.01 * Math.sin(c.t * 9), 0.015, 0);
    const props = { bag };
    switch (k) {
      case 'next':
        return { l: onKeys, r: add(XR.stick, 0, 0.03, 0), gr: 0.7, nod: 0.02, n, props };
      case 'roll':
        return { l: onKeys, r: add(XR.stick, 0, 0.03, 0), gr: 0.7, nod: 0.04, lean: 0.05, n, props };
      case 'halt':
        // The red button, the moment it's under the beam.
        return { l: onKeys, r: add(XR.red, 0, 0.05 - 0.04 * beat(u, 0.1, 0.35) + 0.04 * beat(u, 0.65, 0.9), 0), palms: 0.1, nod: 0.08, lean: 0.1, n, props };
      case 'zoom':
        return { l: add(XR.keys, 0, 0.02, 0), r: add(XR.stick, 0.015 * Math.sin(c.t * 3), 0.03, 0.015 * Math.cos(c.t * 2.4)), gr: 0.8, lean: 0.14, nod: 0, n, props };
      case 'call':
        // A finger to the screen: there, that.
        return { l: add(XR.keys, 0, 0.02, 0), r: add(XR.screen, 0.06, -0.08 + 0.01 * Math.sin(c.t * 5), 0.08), gr: 0.15, palms: 0.1, lean: 0.14, nod: 0.02, n, props };
      default:
        return { l: onKeys, r: add(XR.stick, 0, 0.03, 0), gr: 0.7, nod: 0.05, n, props };
    }
  },
};

// =============================================================================================
// 세관 검사대 (inspectionTable, 2 × 1): an officer's side at the front; the traveller on the back (-z).

export const IN = {
  top: 0.86,
  stand: 0.6,
  case: [-0.28, 0.86, 0.04] as V,
  /** Where the things out of the case go. */
  spots: [[0.26, 0.88, 0.16], [0.54, 0.88, 0.02]] as V[],
  in: [-0.28, 0.98, 0.04] as V,
  cust: [-0.22, -0.92] as [number, number],
  crate: [-0.06, 0.86, -0.02] as V,
  lidOff: [0.74, 0.88, 0.02] as V,
  pile: [0.56, 0.88, 0.2] as V,
  carton: [0.34, 0.86, 0.06] as V,
  floor: [0.72, 0, 0.72] as V,
};
const INSPECT: Script = {
  seq: [['wait', 0.8], ['lay', 1.8], ['open', 1.5], ['one', 1.7], ['two', 1.7], ['show', 2.6], ['pack', 2.2], ['shut', 1.4], ['mark', 1.2], ['gone', 1.5]],
  at: (k) => (k === 'one' || k === 'two' || k === 'pack' ? st(0.1, IN.stand - 0.03) : st(-0.18, IN.stand - 0.03)),
  key(k, u, c) {
    const hold = add(IN.in, 0.1, 0.32, 0.18);
    const packed = c.p('pack', 0.05, 0.9);
    const lift = (i: number, e: number) => lerpV(IN.in, IN.spots[i], e);
    const n = { cust: c.p('wait', 0.2, 0.9) - c.p('gone', 0.4, 1), cLay: 1 - c.p('lay', 0.7, 1), cNod: 0, lid: c.p('open', 0.25, 0.9) - c.p('shut', 0.1, 0.8), sticker: c.p('mark', 0.35, 0.5), glove: 1, ask: 0 };
    const caseAt: V | null = c.p('wait', 0.4, 0.5) <= 0 && k === 'wait' ? null : k === 'wait' || k === 'lay' ? lerpV(add(IN.case, 0.04, 0.2, -0.58), IN.case, k === 'wait' ? 0 : sm(u, 0.1, 0.8)) : k === 'gone' ? lerpV(IN.case, add(IN.case, 0.04, -0.2, -0.72), sm(u, 0, 0.4)) : IN.case;
    const clothes: V | null = c.p('one', 0.25, 0.3) <= 0 || packed > 0.95 ? null : k === 'pack' ? lerpV(IN.spots[0], IN.in, sm(u, 0.5, 0.92)) : k === 'one' ? lift(0, sm(u, 0.2, 0.85)) : IN.spots[0];
    const duck: V | null = c.p('two', 0.25, 0.3) <= 0 || packed > 0.45 ? null : k === 'pack' ? lerpV(IN.spots[1], IN.in, sm(u, 0, 0.42)) : k === 'show' ? (u < 0.2 ? lerpV(IN.spots[1], hold, sm(u, 0, 0.2)) : u > 0.82 ? lerpV(hold, IN.spots[1], sm(u, 0.82, 1)) : hold) : k === 'two' ? lift(1, sm(u, 0.2, 0.85)) : null;
    const props = { case: k === 'gone' && u > 0.75 ? null : caseAt, clothes, duck };
    switch (k) {
      case 'wait':
        return { ...easy(c), nod: 0.04, n, props };
      case 'lay':
        return { ...easy(c), nod: 0.2, n, props };
      case 'open':
        // The clips with the thumbs, then the lid.
        return { ...both(add(IN.case, 0, 0.15 + 0.2 * sm(u, 0.3, 0.9), 0.2 - 0.3 * sm(u, 0.3, 0.9)), 0.2), nod: 0.32, lean: 0.12, n, props };
      case 'one':
        return clothes ? { ...both(clothes, 0.11, 0.05, 0.03), nod: 0.36, lean: 0.14, n, props } : { ...both(IN.in, 0.11, 0.05, 0.03), nod: 0.36, lean: 0.14, n, props };
      case 'two':
        return { r: add(duck ?? IN.in, 0.03, 0.09, 0.02), l: add(IN.spots[0], -0.05, 0.08, 0.02), gr: 0.8, palms: 0.8, nod: 0.3, lean: 0.14, n, props };
      case 'show':
        // Held up to the traveller: and what would this be? They nod and laugh: a souvenir.
        return { r: add(duck ?? hold, 0.03, 0.08, 0.04), l: add(duck ?? hold, -0.03, -0.03, 0.04), gr: 0.8, gl: 0.6, nod: -0.02, lean: 0.03, n: { ...n, cNod: u > 0.34 && u < 0.8 ? 1 : 0, ask: 1 }, props };
      case 'pack': {
        const hand = u < 0.45 ? (duck ?? IN.in) : (clothes ?? IN.in);
        return { ...both(hand, 0.09, 0.07, 0.03), nod: 0.34, lean: 0.13, n, props };
      }
      case 'shut':
        return { ...both(add(IN.case, 0, 0.42 - 0.26 * sm(u, 0.05, 0.75), -0.26 + 0.42 * sm(u, 0.05, 0.75)), 0.2), nod: 0.3, lean: 0.12, n, props };
      case 'mark':
        return { r: add(IN.case, 0.12, 0.19 - 0.02 * beat(u, 0.3, 0.45), 0.05), l: add(IN.case, -0.2, 0.17, 0.12), palms: 0.8, gr: 0.7, nod: 0.34, lean: 0.1, n, props };
      default:
        return { ...easy(c), nod: 0.06 + 0.2 * Math.sin(u * PI), n: { ...n, cNod: u < 0.4 ? 1 : 0 }, props };
    }
  },
};
const CARGO: Script = {
  seq: [['come', 1.3], ['pry', 2.4], ['off', 1.3], ['torch', 2.6], ['lift', 1.9], ['again', 1.7], ['count', 2.8], ['report', 1.5]],
  at: (k) => (k === 'count' || k === 'report' ? st(0.34, IN.stand) : k === 'off' ? st(0.26, IN.stand) : st(-0.1, IN.stand)),
  key(k, u, c) {
    const C = IN.crate;
    const lidUp = c.p('pry', 0.75, 1);
    const lidOff = c.p('off', 0.1, 0.85);
    const lid: V = lidOff > 0 ? lerpV(add(C, 0, 0.56, 0), add(IN.lidOff, 0, 0.02, 0), lidOff) : add(C, 0, 0.5 + 0.06 * lidUp, 0);
    const b1 = k === 'lift' ? lerpV(add(C, 0, 0.42, 0), IN.pile, sm(u, 0.15, 0.85)) : c.p('lift') >= 1 ? IN.pile : null;
    const b2 = k === 'again' ? lerpV(add(C, 0.1, 0.42, 0), add(IN.pile, 0.02, 0.17, 0), sm(u, 0.15, 0.85)) : c.p('again') >= 1 ? add(IN.pile, 0.02, 0.17, 0) : null;
    const clip: V = c.bd(0.14, 0.6 * c.H, 0.3);
    const tips: V = k === 'torch' ? add(C, 0.2 * Math.sin(c.t * 1.6), 0.56, 0.3) : add(C, 0.28, 0.6, 0.34);
    const n = { flash: 1 - c.p('torch', 0.3, 0.8), crate: 1, beam: k === 'torch' ? 1 : 0, tally: k === 'count' ? u : c.p('count'), full: c.p('off', 0.5, 1), found: c.p('lift', 0.7, 0.9) };
    const props: Record<string, V | null> = { lid, b1, b2 };
    switch (k) {
      case 'come':
        return { ...easy(c), nod: 0.2, n, props };
      case 'pry': {
        // Under the lid's edge, and leaned on in three goes.
        const push = Math.abs(Math.sin(u * PI * 3)) * 0.04;
        const bar = add(C, -0.28, 0.72 - push, 0.32);
        return { r: add(bar, 0.03, 0.02, 0.03), l: add(bar, -0.03, 0.14, 0.03), gr: 0.9, gl: 0.9, lean: 0.12 + push, nod: 0.3, n, props: { ...props, bar } };
      }
      case 'off':
        return { ...both(lid, 0.2, 0.03, 0.04), lean: 0.1, nod: 0.3, n, props };
      case 'torch': {
        const beam = tips;
        return { r: add(beam, 0.02, 0.02, 0.08), gr: 0.85, l: add(C, -0.32, 0.5, 0.26), gl: 0.6, lean: 0.2, nod: 0.46, n, props: { ...props, torch: add(beam, 0.02, 0.02, 0.08) } };
      }
      case 'lift':
        return { ...both(b1 ?? add(C, 0, 0.42, 0), 0.14, 0.15, 0.02), nod: 0.34, lean: 0.14, n, props };
      case 'again':
        return { ...both(b2 ?? add(C, 0.1, 0.42, 0), 0.14, 0.15, 0.02), nod: 0.34, lean: 0.14, n, props };
      case 'count':
        return { l: clip, gl: 0.8, r: add(clip, -0.1 + 0.12 * Math.sin(c.t * 4), 0.03, 0.02), gr: 0.8, nod: 0.3 + 0.05 * Math.sin(c.t * 2), n, props: { ...props, clip } };
      default:
        return { l: clip, gl: 0.8, r: c.bd(-0.14, 0.92 * c.H, 0.06), gr: 0.8, nod: 0.05, n, props: { ...props, clip } };
    }
  },
};
const SWEEP: Script = {
  seq: [['bend', 1.4], ['up', 1.5], ['cut', 1.4], ['dig', 2.6], ['shut', 1.2], ['under', 2.6], ['knock', 1.8], ['tick', 1.5]],
  at: (k) => (k === 'bend' || k === 'up' ? st(0.5, IN.stand + 0.04, PI - 0.3) : k === 'under' ? st(-0.42, IN.stand + 0.06) : k === 'tick' ? st(0.1, IN.stand) : st(0.22, IN.stand)),
  key(k, u, c) {
    const onTable = IN.carton;
    const carton: V = k === 'bend' ? IN.floor : k === 'up' ? (u < 0.5 ? lerpV(IN.floor, add(IN.floor, -0.1, 0.7, -0.1), sm(u, 0, 0.5)) : lerpV(add(IN.floor, -0.1, 0.7, -0.1), onTable, sm(u, 0.5, 0.95))) : onTable;
    const clip: V = c.bd(0.14, 0.6 * c.H, 0.3);
    const n = { flaps: c.p('cut', 0.5, 0.9) - c.p('shut', 0.1, 0.8), cartonOn: 1, tape: 1 - c.p('cut', 0.2, 0.6), beam: k === 'under' ? 1 : 0, tick: c.p('tick', 0.4, 0.7), still: 1 };
    const props: Record<string, V | null> = { carton };
    const lit: V = [-0.42 + 0.3 * Math.sin(c.t * 1.2), 0.62, 0.24];
    switch (k) {
      case 'bend':
        return { ...both(add(IN.floor, 0, 0.3, 0.02), 0.22, 0, 0, 0.85), crouch: 0.75 * sm(u, 0, 0.7), nod: 0.42, n, props };
      case 'up':
        return { ...both(add(carton, 0, 0.2, 0), 0.24, 0, 0.06, 0.9), crouch: 0.75 * (1 - sm(u, 0, 0.5)), nod: 0.25, n, props };
      case 'cut':
        return { r: add(onTable, -0.18 + 0.36 * sm(u, 0.1, 0.8), 0.37, 0.01), l: add(onTable, -0.26, 0.34, 0.12), gr: 0.85, nod: 0.38, lean: 0.12, n, props: { ...props, knife: add(onTable, -0.18 + 0.36 * sm(u, 0.1, 0.8), 0.37, 0.01) } };
      case 'dig': {
        const w = Math.sin(c.t * 3);
        return { r: add(onTable, 0.1 + 0.06 * w, 0.36 + 0.04 * Math.sin(c.t * 5), 0), l: add(onTable, -0.12 - 0.05 * w, 0.36 + 0.04 * Math.cos(c.t * 4), 0.02), gr: 0.55, gl: 0.55, nod: 0.44, lean: 0.14, n, props };
      }
      case 'shut':
        return { ...both(add(onTable, 0, 0.38, 0), 0.16), palms: 0.9, nod: 0.36, lean: 0.1, n, props };
      case 'under': {
        const torch = add(lit, 0, 0, 0.12);
        return { r: torch, gr: 0.85, l: [-0.72, 0.84, 0.36], gl: 0.6, crouch: 0.8, nod: 0.3, lean: 0.14, n, props: { ...props, torch } };
      }
      case 'knock': {
        const a = Math.abs(Math.sin(u * PI * 4));
        return { r: add(onTable, 0.28, 0.2 + 0.03 * a, 0.2), l: add(onTable, -0.26, 0.24, 0.2), palms: 0.9, gr: 0.75, nod: 0.26, n, props };
      }
      default:
        return { l: clip, gl: 0.8, r: add(clip, -0.05 + 0.1 * sm(u, 0.4, 0.7), 0.03, 0.02), gr: 0.8, nod: 0.3, n, props: { ...props, clip } };
    }
  },
};

// =============================================================================================
// 통관 서류 데스크 (customsDesk, 1 × 1): the screen at the back, papers before it, the chair in the tile in front.

export const CD = {
  seat: [0, 0.47, 0.6] as V,
  top: 0.74,
  paper: [-0.02, 0.752, 0.14] as V,
  paper2: [-0.26, 0.752, 0.13] as V,
  in: [-0.33, 0.78, -0.08] as V,
  out: [0.33, 0.78, -0.08] as V,
  stamp: [0.26, 0.75, 0.14] as V,
  calc: [0.28, 0.75, 0.15] as V,
  keys: [0, 0.752, -0.02] as V,
};
const typing = (c: Ctx, heat = 1): Key => ({ l: add(CD.keys, -0.09, 0.024 + 0.006 * Math.sin(c.t * 15 * heat), 0.02), r: add(CD.keys, 0.09, 0.024 + 0.006 * Math.cos(c.t * 13 * heat), 0.02), palms: 0.05, gl: 0.4, gr: 0.4, lean: 0.08, nod: 0.05, tap: true });
const DECLARE: Script = {
  seq: [['take', 1.3], ['read', 2.6], ['enter', 2.6], ['ink', 1.5], ['file', 1.4]],
  at: () => sat(CD.seat),
  key(k, u, c) {
    const paper: V | null = k === 'take' ? lerpV(CD.in, CD.paper, sm(u, 0.25, 0.9)) : k === 'file' ? (u > 0.85 ? null : lerpV(CD.paper, CD.out, sm(u, 0.1, 0.85))) : CD.paper;
    const n = { mode: 1, lines: k === 'enter' ? u : c.p('enter'), stamped: c.p('ink', 0.45, 0.55) * (k === 'take' ? 0 : 1), done: c.p('file', 0, 0.2) };
    const stampHand: V | null = k === 'ink' ? (u < 0.2 ? lerpV(CD.stamp, add(CD.paper, 0.05, 0.14, 0), sm(u, 0, 0.2)) : u < 0.5 ? add(CD.paper, 0.05, 0.14 - 0.12 * sm(u, 0.3, 0.48), 0) : u < 0.7 ? add(CD.paper, 0.05, 0.02 + 0.12 * sm(u, 0.52, 0.7), 0) : lerpV(add(CD.paper, 0.05, 0.14, 0), CD.stamp, sm(u, 0.7, 1))) : null;
    const props: Record<string, V | null> = { paper, stampAt: stampHand ?? CD.stamp };
    switch (k) {
      case 'take':
        return { l: add(paper ?? CD.in, -0.08, 0.03, 0.02), r: add(CD.keys, 0.14, 0.03, 0.1), gl: 0.8, nod: 0.26, n, props };
      case 'read': {
        const along = 0.04 * Math.sin(u * PI * 4);
        return { l: add(CD.paper, -0.09, 0.03, 0.03), r: add(CD.paper, 0.06 + along, 0.025, -0.04 + 0.09 * u), gr: 0.55, gl: 0.35, nod: 0.34, lean: 0.1, n, props };
      }
      case 'enter':
        return { ...typing(c), n, props };
      case 'ink':
        return { r: add(stampHand ?? CD.stamp, 0, 0.09, 0), gr: 0.9, l: add(CD.paper, -0.13, 0.025, 0.02), palms: 0.8, nod: 0.32, lean: 0.12, n, props };
      default:
        return { r: add(paper ?? CD.out, 0.04, 0.03, 0.02), gr: 0.8, l: add(CD.keys, -0.14, 0.03, 0.1), nod: 0.18, n, props };
    }
  },
};
const VALUE: Script = {
  seq: [['take', 1.2], ['work', 3.4], ['enter', 2.2], ['check', 1.8], ['file', 1.2]],
  at: () => sat(CD.seat),
  key(k, u, c) {
    const paper: V | null = k === 'take' ? lerpV(CD.in, CD.paper, sm(u, 0.25, 0.9)) : k === 'file' ? (u > 0.85 ? null : lerpV(CD.paper, CD.out, sm(u, 0.1, 0.85))) : CD.paper;
    const n = { mode: 2, sum: k === 'work' ? u : c.p('work'), lines: k === 'enter' ? u : c.p('enter'), calc: 1, done: c.p('check', 0.6, 0.9) };
    const props: Record<string, V | null> = { paper };
    switch (k) {
      case 'take':
        return { l: add(paper ?? CD.in, -0.08, 0.03, 0.02), r: add(CD.calc, -0.02, 0.05, 0), nod: 0.26, gl: 0.8, n, props };
      case 'work': {
        const pr = Math.abs(Math.sin(c.t * 7));
        return { l: add(CD.paper, -0.03 + 0.08 * Math.sin(u * PI * 3), 0.025, -0.05 + 0.1 * u), gl: 0.5, r: add(CD.calc, -0.02 + 0.03 * Math.sin(c.t * 2.3), 0.04 + 0.018 * pr, 0.015 * Math.cos(c.t * 3.1)), palms: 0.05, gr: 0.4, nod: 0.36, lean: 0.1, tap: true, n, props };
      }
      case 'enter':
        return { ...typing(c), n, props };
      case 'check':
        return { l: add(CD.paper, -0.1, 0.025, 0.02), r: add(CD.keys, 0.14, 0.03, 0.05), nod: 0.04 + 0.05 * Math.sin(c.t * 2), lean: 0.12, n, props };
      default:
        return { r: add(paper ?? CD.out, 0.04, 0.03, 0.02), gr: 0.8, l: add(CD.keys, -0.14, 0.03, 0.1), nod: 0.18, n, props };
    }
  },
};
const AUDIT: Script = {
  seq: [['lay', 1.4], ['rule', 3.2], ['spot', 1.7], ['enter', 2.2], ['flag', 1.5]],
  at: () => sat(CD.seat),
  key(k, u, c) {
    const paper: V = CD.paper;
    const other: V = CD.paper2;
    const lay = k === 'lay' ? sm(u, 0.15, 0.9) : 1;
    const ruler: V = add(paper, 0, 0.012, 0.09 - 0.17 * (k === 'rule' ? u : k === 'lay' ? 0 : 0.7));
    const n = { mode: 3, lines: k === 'enter' ? u : c.p('enter'), mark: c.p('spot', 0.3, 0.8), tab: c.p('flag', 0.45, 0.6), ruler: k === 'rule' || k === 'spot' ? 1 : 0 };
    const props: Record<string, V | null> = { paper: lerpV(CD.in, paper, lay), paper2: lerpV(CD.in, other, lay), ruler: n.ruler ? ruler : null };
    switch (k) {
      case 'lay':
        return { ...both(lerpV(CD.in, paper, lay), 0.09), nod: 0.26, n, props };
      case 'rule':
        return { r: add(ruler, 0.1, 0.022, 0.012), gr: 0.75, l: add(other, 0.03, 0.025, -0.04 + 0.1 * u), gl: 0.5, nod: 0.38, lean: 0.14, n, props };
      case 'spot': {
        const pen = add(paper, 0.06 * Math.sin(c.t * 7), 0.03, -0.02);
        return { r: pen, gr: 0.8, l: add(other, 0.03, 0.025, 0.03), nod: 0.42, lean: 0.14, n, props: { ...props, pen } };
      }
      case 'enter':
        return { ...typing(c), n, props };
      default:
        return { r: add(paper, 0.09, 0.03, -0.06 + 0.04 * sm(u, 0.2, 0.6)), gr: 0.8, l: add(other, 0.02, 0.025, 0), nod: 0.32, n, props };
    }
  },
};

// =============================================================================================
// 녹색·적색 통로 (cuLaneGate, 3 × 1): doors at the back, a gantry over two lanes, the officer on the island between them.

export const LG = {
  stand: [0, 0.74] as [number, number],
  green: -0.86,
  red: 0.86,
  /** A traveller comes from here to there down their lane; halted at `halt`. */
  from: -0.34,
  to: 1.8,
  halt: 0.72,
};
const LANE: Script = {
  seq: [['watch', 1.2], ['wave', 3.4], ['look', 0.9], ['come', 1.8], ['stop', 2.2], ['show', 2.6], ['ok', 0.9]],
  at: (k) => (k === 'wave' ? st(LG.stand[0], LG.stand[1], -PI / 2 + 0.3) : k === 'watch' ? st(LG.stand[0], LG.stand[1], -PI + 0.9) : st(LG.stand[0], LG.stand[1], PI / 2 - 0.3)),
  key(k, u, c) {
    const n = {
      t1: k === 'watch' ? 0 : k === 'wave' ? sm(u, 0, 0.98) : c.p('wave') >= 1 ? 1.2 : 0,
      t2: k === 'come' ? sm(u, 0, 1) * 0.62 : k === 'stop' ? 0.62 : k === 'show' ? 0.62 + 0.38 * sm(u, 0.35, 1) : k === 'ok' ? 1 : 0,
      green: k === 'wave' ? 1 : 0,
      red: k === 'stop' || k === 'show' ? 1 : 0,
      nod2: k === 'stop' && u > 0.6 ? 1 : 0,
    };
    switch (k) {
      case 'watch':
        return { ...easy(c), nod: 0.04, n };
      case 'wave': {
        // The open arm: go on through.
        const s = Math.sin(c.t * 4);
        return { l: c.bd(0.42, 1.16 + 0.05 * s, 0.26 + 0.06 * s), r: c.bd(-0.2, 0.55 * c.H, 0.1), palms: 0.8, gl: 0.1, nod: 0.02, n };
      }
      case 'look':
        return { ...easy(c), nod: 0.02, n };
      case 'come':
        return { ...easy(c), nod: 0.04, n };
      case 'stop':
        // A raised palm, and a smile: this way, please.
        return { r: c.bd(-0.1, 1.28 + 0.02 * Math.sin(c.t * 3), 0.42), l: c.bd(0.2, 0.55 * c.H, 0.1), palms: 1, gr: 0.05, nod: 0.02, lean: 0.03, n };
      case 'show':
        return { r: c.bd(-0.34, 1.12, 0.42), gr: 0.15, palms: 0.7, l: c.bd(0.2, 0.55 * c.H, 0.1), nod: 0.04, n };
      default:
        return { ...easy(c), nod: 0.12, n };
    }
  },
};

// =============================================================================================
// 탐지견 검색대 (cuDogLane, 2 × 1): bags on a low bench at the back, the dog working before them, the handler behind it.

export const DG = {
  stand: 0.68,
  bags: [-0.5, -0.08, 0.36, 0.78],
  /** How high the bench's top is. */
  bench: 0.14,
  benchZ: -0.2,
  dogZ: 0.22,
  home: [-0.84, 0.28] as [number, number],
  bin: [0.8, 0.28, 0.56] as V,
};
const DOG: Script = {
  seq: [['heel', 1.3], ['b0', 1.6], ['b1', 1.6], ['b2', 1.7], ['sit', 1.3], ['good', 2.2], ['open', 2.4], ['bin', 1.5], ['b3', 1.5], ['back', 1.4]],
  at: (k) => {
    const x = k === 'heel' ? -0.7 : k === 'b0' ? -0.5 : k === 'b1' ? -0.12 : k === 'b2' || k === 'sit' || k === 'good' ? 0.26 : k === 'open' ? 0.3 : k === 'bin' ? 0.56 : k === 'b3' ? 0.68 : -0.5;
    return st(x, DG.stand);
  },
  key(k, u, c) {
    const i = k === 'b0' ? 0 : k === 'b1' ? 1 : k === 'b3' ? 3 : 2;
    const toBag = DG.bags[i];
    const last = k === 'b0' ? DG.home[0] : k === 'b1' ? DG.bags[0] : k === 'b2' ? DG.bags[1] : k === 'b3' ? DG.bags[2] : DG.bags[2];
    const moving = sm(u, 0, 0.42);
    const atDog = (x: number, z: number, yaw: number, extra: Record<string, number> = {}) => ({ dx: x, dz: z, dyaw: yaw, dout: 1, dsit: 0, dsniff: 0, dwag: 0.5, ...extra });
    const pocket = c.p('open', 0.15, 0.5) - c.p('bin', 0.5, 0.8);
    const apple: V | null = k === 'open' ? (u < 0.42 ? null : lerpV(add([DG.bags[2], DG.bench, DG.benchZ], 0, 0.26, 0.14), add([DG.bags[2], DG.bench, DG.benchZ], 0.04, 0.82, 0.42), sm(u, 0.42, 0.85))) : k === 'bin' ? (u > 0.72 ? null : lerpV(add([DG.bags[2], DG.bench, DG.benchZ], 0.04, 0.82, 0.42), add(DG.bin, 0, 0.3, 0), sm(u, 0.05, 0.7))) : null;
    const lead = (hand: V): Key => ({ l: hand, gl: 0.85, r: c.bd(-0.2, 0.55 * c.H, 0.1), nod: 0.26 });
    const props: Record<string, V | null> = { apple };
    const base = { pocket, ball: 0 };
    switch (k) {
      case 'heel':
        return { ...lead(c.bd(0.2, 0.68, 0.2)), n: { ...base, ...atDog(mixN(DG.home[0], DG.bags[0] - 0.24, sm(u, 0.1, 0.9)), DG.dogZ, PI / 2, { dwag: 1 }) }, props };
      case 'b0':
      case 'b1':
      case 'b3': {
        const dx = mixN(last, toBag, moving);
        const sniff = sm(u, 0.42, 0.55);
        return { ...lead(c.bd(0.2, 0.68, 0.22)), n: { ...base, ...atDog(dx, DG.dogZ, mixN(PI / 2, PI, sniff), { dsniff: sniff, dwag: 0.7 }) }, props };
      }
      case 'b2': {
        const dx = mixN(last, toBag, moving);
        const sniff = sm(u, 0.42, 0.55);
        return { ...lead(c.bd(0.2, 0.68, 0.22)), n: { ...base, ...atDog(dx, DG.dogZ, mixN(PI / 2, PI, sniff), { dsniff: sniff, dwag: 1 + sniff }) }, props };
      }
      case 'sit':
        // That one: it sits, nose to the bag, and looks round.
        return { ...lead(c.bd(0.2, 0.7, 0.2)), nod: 0.32, n: { ...base, ...atDog(DG.bags[2], DG.dogZ, PI, { dsit: sm(u, 0.1, 0.6), dwag: 1.5 }) }, props };
      case 'good': {
        const ruffle = 0.02 * Math.sin(c.t * 8);
        const r: V = [DG.bags[2] + 0.04 + ruffle, 0.5, DG.dogZ + 0.02];
        return { r, l: c.bd(0.2, 0.62, 0.22), gl: 0.85, palms: 0.9, crouch: 0.68, nod: 0.46, n: { ...base, ...atDog(DG.bags[2], DG.dogZ, PI - 0.5 * sm(u, 0, 0.3), { dsit: 1, dwag: 2.4, dhappy: 1 }), ball: u > 0.45 ? 1 : 0 }, props };
      }
      case 'open': {
        const pk: V = apple ?? add([DG.bags[2], DG.bench, DG.benchZ], 0, 0.28, 0.16);
        return { r: add(pk, 0.02, 0.05, 0.03), gr: 0.75, l: c.bd(0.2, 0.68, 0.2), gl: 0.85, crouch: 0.5 * (1 - sm(u, 0.55, 0.9)), nod: 0.4 - 0.3 * sm(u, 0.5, 0.9), n: { ...base, ...atDog(DG.bags[2] - 0.34, DG.dogZ + 0.06, PI / 2, { dsit: 1, dwag: 1.2 }) }, props };
      }
      case 'bin':
        return { r: add(apple ?? add(DG.bin, 0, 0.32, 0), 0.02, 0.05, 0.02), gr: 0.75, l: c.bd(0.2, 0.68, 0.2), gl: 0.85, nod: 0.3, n: { ...base, ...atDog(DG.bags[2] - 0.2, DG.dogZ, PI / 2, { dwag: 1 }) }, props };
      default:
        return { ...lead(c.bd(0.2, 0.66, 0.2)), n: { ...base, ...atDog(mixN(DG.bags[3], DG.home[0], sm(u, 0.05, 0.9)), DG.dogZ + 0.06, -PI / 2, { dwag: 0.6 }) }, props };
    }
  },
};

// =============================================================================================
// 유치품 보관함 (cuSeizedCage, 2 × 1): wire walls, its door on the right half, shelves of what's been held.

export const SC = {
  stand: 0.68,
  door: [0.04, 0.46] as [number, number],
  lock: [0.1, 1.05, 0.44] as V,
  floor: [-0.26, 0, 0.8] as V,
  shelf: [0.5, 0.55, -0.02] as V,
  rail: 1.2,
};
const SEIZED: Script = {
  seq: [['ledger', 1.6], ['key', 1.4], ['open', 1.1], ['bend', 1.3], ['carry', 2.0], ['tag', 1.8], ['tally', 2.4], ['shut', 1.3], ['sign', 1.5]],
  at: (k) => (k === 'bend' ? st(0.02, SC.stand + 0.1, PI / 2 + PI / 2 + 0.6) : k === 'carry' || k === 'tag' ? st(0.42, 0.5) : k === 'tally' ? st(-0.02, SC.stand) : st(0.08, SC.stand)),
  key(k, u, c) {
    const box: V = k === 'carry' ? (u < 0.42 ? lerpV(SC.floor, add(SC.floor, 0.34, 0.72, -0.18), sm(u, 0, 0.42)) : lerpV(add(SC.floor, 0.34, 0.72, -0.18), SC.shelf, sm(u, 0.42, 0.95))) : c.p('carry') >= 1 ? SC.shelf : SC.floor;
    const clip: V = c.bd(0.14, 0.6 * c.H, 0.3);
    const n = { door: c.p('open', 0, 0.9) - c.p('shut', 0, 0.9), tagged: c.p('tag', 0.5, 0.7), box: 1, count: k === 'tally' ? u : c.p('tally') * (k === 'sign' || k === 'shut' ? 1 : 0), hasKey: k === 'key' ? 1 : 0 };
    const props: Record<string, V | null> = { box };
    switch (k) {
      case 'ledger':
        return { l: clip, gl: 0.8, r: add(clip, -0.05 + 0.1 * Math.sin(c.t * 3), 0.03, 0.02), gr: 0.8, nod: 0.3, n, props: { ...props, clip } };
      case 'key':
        return { r: add(SC.lock, 0.02 * Math.sin(u * PI * 3), 0.01, 0.03), gr: 0.85, l: c.bd(0.14, 0.6 * c.H, 0.3), gl: 0.8, lean: 0.06, nod: 0.12, n, props: { ...props, key: add(SC.lock, 0, 0.01, 0.03), clip } };
      case 'open':
        return { r: add(SC.lock, 0.12 + 0.2 * sm(u, 0, 0.9), 0, 0.14 + 0.16 * sm(u, 0, 0.9)), gr: 0.85, l: c.bd(0.14, 0.6 * c.H, 0.3), gl: 0.8, nod: 0.12, n, props: { ...props, clip } };
      case 'bend':
        return { ...both(add(SC.floor, 0, 0.32, 0), 0.22, 0, 0, 0.85), crouch: 0.75 * sm(u, 0, 0.8), nod: 0.42, n, props };
      case 'carry':
        return { ...both(add(box, 0, 0.2, 0), 0.24, 0, 0.08, 0.9), crouch: 0.7 * (1 - sm(u, 0, 0.42)), nod: 0.2, n, props };
      case 'tag':
        return { r: add(SC.shelf, 0.04, 0.22 + 0.02 * Math.sin(c.t * 7), 0.2), gr: 0.75, l: add(SC.shelf, -0.08, 0.2, 0.2), gl: 0.75, lean: 0.08, nod: 0.24, n, props };
      case 'tally': {
        const row = -0.6 + 0.9 * u;
        return { l: clip, gl: 0.8, r: [row, 1.25 + 0.2 * Math.sin(u * PI * 3), 0.38], gr: 0.25, palms: 0.1, nod: 0.02, n, props: { ...props, clip } };
      }
      case 'shut':
        return { r: add(SC.lock, 0.3 - 0.3 * sm(u, 0, 0.9), 0, 0.3 - 0.27 * sm(u, 0, 0.9)), gr: 0.85, l: c.bd(0.14, 0.6 * c.H, 0.3), gl: 0.8, nod: 0.12, n, props: { ...props, clip } };
      default:
        return { l: clip, gl: 0.8, r: add(clip, -0.08 + 0.14 * sm(u, 0.1, 0.7), 0.03, 0.02), gr: 0.8, nod: 0.32, n, props: { ...props, clip } };
    }
  },
};

// =============================================================================================
// 관제실 (cuMonitorDesk, 3 × 1): six cameras up on the wall behind a low console.

export const MD = {
  seat: [0, 0.47, 0.72] as V,
  keys: [0, 0.74, 0.26] as V,
  pick: [-0.34, 0.76, 0.24] as V,
  radio: [0.52, 0.8, 0.22] as V,
  log: [0.28, 0.75, 0.3] as V,
};
const WATCH: Script = {
  seq: [['scan', 3.2], ['pick', 1.5], ['look', 2.6], ['radio', 2.6], ['back', 1.0], ['log', 2.4]],
  at: () => sat(MD.seat),
  key(k, u, c) {
    const n = { big: c.p('pick', 0.4, 0.6) - c.p('back', 0.1, 0.5), radio: k === 'radio' ? 1 : 0, logged: k === 'log' ? u : 0, lit: 1, panel: 1 };
    const rest = add(MD.keys, 0, 0.03, 0.08);
    switch (k) {
      case 'scan':
        return { l: add(rest, -0.14, 0, 0), r: add(rest, 0.14, 0, 0), gl: 0.3, gr: 0.3, nod: -0.06, lean: 0.03, n };
      case 'pick':
        return { l: add(rest, -0.14, 0, 0), r: add(MD.pick, 0.03, 0.05 - 0.03 * beat(u, 0.3, 0.5), 0), palms: 0.05, gr: 0.25, nod: -0.02, lean: 0.1, n };
      case 'look':
        return { l: add(rest, -0.14, 0, 0), r: add(MD.pick, 0.08 * Math.sin(u * PI * 2), 0.05, 0.04), gr: 0.75, nod: -0.08, lean: 0.14, n };
      case 'radio': {
        const mic: V = c.bd(-0.12, 0.8, 0.16);
        return { r: mic, gr: 0.9, l: add(rest, -0.14, 0, 0), nod: -0.02, n, props: { radio: mic } };
      }
      case 'back':
        return { l: add(rest, -0.14, 0, 0), r: add(MD.pick, 0.03, 0.03, 0), gr: 0.25, nod: 0, n };
      default:
        return { r: add(MD.log, -0.08 + 0.14 * Math.sin(c.t * 1.8), 0.03, 0.01 * Math.sin(c.t * 9)), gr: 0.85, l: add(MD.log, -0.2, 0.025, 0.03), nod: 0.34, lean: 0.08, n };
    }
  },
};

// =============================================================================================
// 수하물 수취대 (cuCarousel, 4 × 2): a loop of belt, bags going round; the dweller on the floor before it.

export const CA = {
  half: 1.22,
  radius: 0.58,
  y: 0.34,
  stand: 1.12,
  grab: 0.34,
  down: [0.86, 0, 1.22] as V,
  aside: [1.5, 0, 1.22] as V,
  /** Bags on the belt at the same time. */
  n: 7,
};
const LEN = 2 * (2 * CA.half + Math.PI * CA.radius);
/** A point on the belt's loop, 0–1 round, going right along the front. */
export function carouselAt(u: number): { x: number; z: number; yaw: number } {
  let d = frac(u) * LEN;
  const S = 2 * CA.half;
  const A = Math.PI * CA.radius;
  if (d < S) return { x: -CA.half + d, z: CA.radius, yaw: 0 };
  d -= S;
  if (d < A) {
    const a = d / CA.radius;
    return { x: CA.half + Math.sin(a) * CA.radius, z: Math.cos(a) * CA.radius, yaw: a };
  }
  d -= A;
  if (d < S) return { x: CA.half - d, z: -CA.radius, yaw: Math.PI };
  d -= S;
  const a = d / CA.radius;
  return { x: -CA.half - Math.sin(a) * CA.radius, z: -Math.cos(a) * CA.radius, yaw: Math.PI + a };
}
const BELT: Script = {
  seq: [['wait', 2.4], ['lift', 1.6], ['down', 1.2], ['read', 2.4], ['call', 1.8], ['wheel', 2.0], ['back', 1.0]],
  at: (k) => (k === 'wheel' ? st(1.18, CA.stand, PI / 2 + 0.3) : k === 'read' || k === 'call' || k === 'down' ? st(0.56, CA.stand) : st(CA.grab, CA.stand)),
  key(k, u, c) {
    const onBelt = (e: number): V => [mixN(-CA.half + 0.2, CA.grab, e), CA.y, CA.radius];
    const up: V = [CA.grab + 0.08, 0.74, 0.92];
    const bag: V | null = k === 'wait' ? onBelt(sm(u, 0, 1) * 0.5 + u * 0.5) : k === 'lift' ? lerpV(onBelt(1), up, sm(u, 0.1, 0.85)) : k === 'down' ? lerpV(up, CA.down, sm(u, 0, 0.85)) : k === 'read' || k === 'call' ? CA.down : k === 'wheel' ? lerpV(CA.down, CA.aside, sm(u, 0.1, 0.95)) : CA.aside;
    const tag: V = add(CA.down, 0.02, 0.5, 0.08);
    const n = { tagged: c.p('read', 0.5, 0.6), read: k === 'read' ? 1 : 0, radio: k === 'call' ? 1 : 0, aside: c.p('wheel', 0.95, 1), slot: 1, cone: c.p('wheel') };
    const props: Record<string, V | null> = { bag };
    switch (k) {
      case 'wait':
        return { ...easy(c), nod: 0.2 + 0.05 * Math.sin(c.t * 1.4), n, props };
      case 'lift':
        return { ...both(add(bag ?? up, 0, 0.3, 0.02), 0.14, 0, 0.02, 0.9), lean: 0.14 * (1 - u), nod: 0.34, n, props };
      case 'down':
        return { ...both(add(bag ?? CA.down, 0, 0.5, 0.02), 0.14, 0, 0, 0.9), crouch: 0.5 * sm(u, 0.2, 0.9), nod: 0.36, n, props };
      case 'read': {
        const scan: V = add(tag, 0.1, 0.08, 0.08);
        return { l: add(tag, -0.03, 0.01, 0), gl: 0.75, r: scan, gr: 0.85, crouch: 0.5, nod: 0.42, n, props: { ...props, scan } };
      }
      case 'call': {
        const mic: V = c.bd(-0.12, 1.02, 0.14);
        return { r: mic, gr: 0.9, l: c.bd(0.2, 0.55 * c.H, 0.1), nod: 0.05, n, props: { ...props, radio: mic } };
      }
      case 'wheel': {
        const pull = add(bag ?? CA.aside, -0.08, 0.68, 0.02);
        return { r: pull, gr: 0.9, l: c.bd(0.2, 0.55 * c.H, 0.1), nod: 0.14, n, props };
      }
      default:
        return { ...easy(c), nod: 0.12, n, props };
    }
  },
};

// =============================================================================================
// 세금 납부 창구 (cuDutyCounter, 2 × 1): the officer on its front, the traveller on the back (-z).

export const DC = {
  stand: 0.54,
  top: 1.0,
  cust: [0.02, -0.92] as [number, number],
  slot: [0.02, 1.02, -0.2] as V,
  paper: [-0.1, 1.012, 0.2] as V,
  calc: [0.36, 1.012, 0.2] as V,
  print: [-0.62, 1.03, 0.18] as V,
  card: [0.1, 1.03, -0.3] as V,
  stamp: [-0.32, 1.012, 0.24] as V,
};
const DUTY: Script = {
  seq: [['call', 1.3], ['pass', 1.4], ['read', 1.8], ['work', 3.0], ['tell', 2.6], ['pay', 2.2], ['seal', 1.2], ['give', 1.6], ['gone', 1.0]],
  at: (k) => (k === 'work' ? st(0.2, DC.stand) : k === 'seal' || k === 'give' ? st(-0.2, DC.stand) : st(0, DC.stand)),
  key(k, u, c) {
    const form: V | null = k === 'call' ? null : k === 'pass' ? lerpV(add(DC.slot, 0, 0.02, -0.14), DC.paper, sm(u, 0.2, 0.9)) : k === 'give' && u > 0.1 ? null : DC.paper;
    const slip: V | null = k === 'give' ? (u > 0.8 ? null : lerpV(add(DC.print, 0.04, 0.08, -0.02), add(DC.slot, 0.02, 0.05, -0.1), sm(u, 0.1, 0.72))) : null;
    const n = { cust: c.p('call', 0.1, 0.8) - c.p('gone', 0, 0.8), sum: k === 'work' ? u : c.p('work'), lcd: c.p('work', 0, 0.1), paid: c.p('pay', 0.68, 0.8), cTap: k === 'pay' && u > 0.35 && u < 0.72 ? 1 : 0, cHand: k === 'pass' && u < 0.6 ? 1 : k === 'give' && u > 0.55 ? 1 : 0, cSigh: k === 'tell' && u > 0.55 ? 1 : 0, stamped: c.p('seal', 0.4, 0.5), printing: k === 'seal' ? 1 : 0 };
    const stampAt: V = k === 'seal' ? add(DC.paper, 0.06, 0.13 - 0.12 * Math.abs(Math.sin(u * PI * 2)), 0) : DC.stamp;
    const props: Record<string, V | null> = { form, slip, stampAt };
    switch (k) {
      case 'call':
        return { r: c.bd(-0.2, 0.55 * c.H, 0.1), l: c.bd(0.28, 1.16, 0.24), palms: 0.9, gl: 0.1, nod: 0.02, n, props };
      case 'pass':
        return { r: add(form ?? DC.paper, 0.06, 0.03, 0.02), gr: 0.8, l: c.bd(0.2, 0.55 * c.H, 0.1), lean: 0.12, nod: 0.24, n, props };
      case 'read':
        return { l: add(DC.paper, -0.12, 0.025, 0.02), r: add(DC.paper, 0.05 + 0.05 * Math.sin(u * PI * 4), 0.03, -0.05 + 0.1 * u), gr: 0.55, nod: 0.36, lean: 0.1, n, props };
      case 'work': {
        const pr = Math.abs(Math.sin(c.t * 7));
        return { r: add(DC.calc, 0.025 * Math.sin(c.t * 2.4), 0.04 + 0.018 * pr, 0), palms: 0.05, gr: 0.35, l: add(DC.paper, 0.1 * Math.sin(u * PI * 3), 0.03, -0.04 + 0.08 * u), gl: 0.5, nod: 0.36, lean: 0.1, tap: true, n, props };
      }
      case 'tell': {
        // The open hand, across the counter to the slip: this much, and why.
        const s = 0.03 * Math.sin(c.t * 2.5);
        return { r: add(DC.slot, 0.12 + s, 0.16, 0.14), palms: 0.9, gr: 0.1, l: add(DC.paper, -0.1, 0.025, 0.04), nod: 0.04 + 0.08 * Math.sin(c.t * 2), n, props };
      }
      case 'pay':
        return { r: add(DC.card, 0.02, 0.14, 0.26), gr: 0.2, palms: 0.6, l: add(DC.paper, -0.1, 0.025, 0.04), nod: 0.14, lean: 0.06, n, props };
      case 'seal':
        return { r: add(stampAt, 0, 0.09, 0), gr: 0.9, l: add(DC.paper, -0.12, 0.025, 0.04), palms: 0.8, nod: 0.34, lean: 0.12, n, props };
      case 'give':
        return { ...both(slip ?? add(DC.slot, 0.02, 0.05, -0.1), 0.06, 0.02, 0.02, 0.8), nod: 0.16 + 0.14 * Math.sin(u * PI), lean: 0.22, n, props };
      default:
        return { ...easy(c), nod: 0.1, n, props };
    }
  },
};

const SCRIPTS: Record<CuMotion, Script> = {
  cuScan: SCAN,
  cuInspect: INSPECT,
  cuCargo: CARGO,
  cuSweep: SWEEP,
  cuDeclare: DECLARE,
  cuValue: VALUE,
  cuAudit: AUDIT,
  cuLane: LANE,
  cuDog: DOG,
  cuSeized: SEIZED,
  cuWatch: WATCH,
  cuBelt: BELT,
  cuDuty: DUTY,
};
