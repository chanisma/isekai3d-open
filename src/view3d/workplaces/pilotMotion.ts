import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, wave, type Beat, type V } from './busDriverMotion';

/*
 * A 조종사's work at the 항공사 운항 센터 (2026-10-31, the workplace pipeline, at the user's request: the
 * work should look like the work). Every motion is a script, as at the 승무원 브리핑 센터: a round of
 * beats, each with where the dweller is, where the hands are and where what moves is. The piece reads the same
 * script by the same clock (pilot.ts), so the load sheet lies with the first officer until the beat it's
 * passed across, and the simulator's legs, its picture out of the window and the warning lights all follow
 * the throttle and the stick in the hands.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). A
 * simulator's cab moves on its legs: its scripts are written as if it stood still, and `cab` says how it's
 * tilted now, which carries whoever is inside and their hands along.
 */
export type PlMotion =
  | 'plSimFly' | 'plSimFire' | 'plSimLand' | 'plSimUpset'
  | 'plBrief' | 'plDebrief'
  | 'plFile' | 'plChecklist' | 'plFuel'
  | 'plWalkRound'
  | 'plFlow' | 'plWx' | 'plSuit' | 'plFit';
export const PL_MOTIONS = new Set<string>(['plSimFly', 'plSimFire', 'plSimLand', 'plSimUpset', 'plBrief', 'plDebrief', 'plFile', 'plChecklist', 'plFuel', 'plWalkRound', 'plFlow', 'plWx', 'plSuit', 'plFit']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const plPhase = (p: THREE.Vector3) => frac(p.x * 0.317 + p.z * 0.591);
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
  /** Sat with the feet on `floor` (else stood). */
  sit?: boolean;
  floor?: number;
  /** Inside a simulator's cab: carried along as it tilts. */
  inCab?: boolean;
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
  /** Where what moves is now (null: at rest, or put away). */
  props?: Record<string, V | null | undefined>;
  /** Levers, lamps, counts: eased between beats. */
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
/** How a simulator's cab is tilted, about SM.pivot. */
export interface Cab {
  rx: number;
  rz: number;
  hv: number;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  cab?(k: string, u: number, t: number): Cab;
  key(k: string, u: number, c: Ctx): Key;
}
export interface PlNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
const E = new THREE.Euler();
const VV = new THREE.Vector3();
export function cabPt(v: V, m: Cab): V {
  VV.set(v[0] - SM.pivot[0], v[1] - SM.pivot[1], v[2] - SM.pivot[2]).applyEuler(E.set(m.rx, 0, m.rz));
  return [VV.x + SM.pivot[0], VV.y + SM.pivot[1] + m.hv, VV.z + SM.pivot[2]];
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
    after: (name) => idx > s.seq.findIndex(([q]) => q === name),
  };
  const key = s.key(k, u, c);
  if (!s.cab) return { st: here, key };
  const m = s.cab(k, u, t);
  key.n = { ...key.n, rx: m.rx, rz: m.rz, hv: m.hv };
  if (!here.inCab) return { st: here, key };
  const [x, y, z] = cabPt([here.x, here.y, here.z], m);
  return { st: { ...here, x, y, z, floor: (here.floor ?? 0) + (y - here.y) }, key: { ...key, l: key.l && cabPt(key.l, m), r: key.r && cabPt(key.r, m) } };
}
function blendKey(a: Key, b: Key, e: number): Key {
  if (e <= 0) return a;
  const v = (x: V | undefined, y: V | undefined) => (x && y ? lerpV(x, y, e) : e < 0.5 ? x : y);
  const n = (x: number | undefined, y: number | undefined, d: number) => mixN(x ?? d, y ?? d, e);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.1), nod: n(a.nod, b.nod, 0.2), palms: n(a.palms, b.palms, 0.5), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap };
}
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function plNow(m: PlMotion, t: number, ph: number, H = 1.6): PlNow {
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
  if (A.st.floor !== undefined && B.st.floor !== undefined) here.floor = mixN(A.st.floor, B.st.floor, e);
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z) + Math.abs(A.st.y - B.st.y);
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
export function plPose(m: PlMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = plNow(m, t, plPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Keys or a touch screen, one finger and then the other. */
const tapAt = (a: V, t: number, hz = 3): V => [a[0], a[1] + 0.012 * Math.max(0, wave(t, hz)), a[2]];
const scribble = (a: V, u: number, w = 0.1, laps = 4): V => [a[0] + w * (frac(u * laps) - 0.5), a[1] + 0.008, a[2] + 0.005 * Math.sin(u * 60)];
// A sat body's points are measured from the seat, a stood one's from the feet.
const atMouth = (c: Ctx, side = 0): V => c.bd(side, (c.st.sit ? 0.43 : 0.86) * c.H, 0.1);
const atEar = (c: Ctx, side: number): V => c.bd(side * 0.1, (c.st.sit ? 0.46 : 0.9) * c.H, 0.03);

// =============================================================================================
// 비행 시뮬레이터 (flightSimulator, 4 × 4): a cab on six legs, cut away at the back so the seats, the panels
// and the picture out of the window are seen from behind. Stairs and a gangway on the left (-x); the bridge
// lifts away before the motion comes on. In the cab you face -z: the captain's seat is at -x.

const DK = 1.25;
export const SM = {
  deck: DK,
  pivot: [0, DK, -0.25] as V,
  seatY: DK + 0.5,
  capt: [-0.42, DK + 0.5, 0.08] as V,
  fo: [0.42, DK + 0.5, 0.08] as V,
  inst: [0, DK + 0.5, 0.76] as V,
  stick: [-0.8, DK + 0.62, -0.18] as V,
  foStick: [0.8, DK + 0.62, -0.18] as V,
  thrPivot: [0, DK + 0.6, -0.44] as V,
  gear: [0.24, DK + 0.84, -0.71] as V,
  flap: [0.15, DK + 0.72, -0.26] as V,
  master: [-0.16, DK + 1.12, -0.76] as V,
  engMaster: [0.04, DK + 0.68, -0.14] as V,
  fire: [-0.12, DK + 1.6, -0.34] as V,
  agent: [-0.12, DK + 1.6, -0.2] as V,
  mic: [-0.08, DK + 0.68, -0.1] as V,
  card: [-0.12, DK + 0.68, -0.32] as V,
  mcp: [-0.3, DK + 1.08, -0.72] as V,
  door: [-0.75, DK, 0.5] as V,
};
export const stickAt = (sx: number, sy: number): V => [SM.stick[0] + 0.05 * sx, SM.stick[1] + 0.14, SM.stick[2] + 0.05 * sy];
export const thrAt = (thr: number): V => [-0.02, SM.thrPivot[1] + 0.2 * Math.cos(0.5 - thr), SM.thrPivot[2] + 0.2 * Math.sin(0.5 - thr)];
const SEAT = st(SM.capt[0], SM.capt[1], SM.capt[2], Math.PI, { sit: true, floor: DK, inCab: true });
const still: Cab = { rx: 0, rz: 0, hv: 0 };
const rumble = (t: number, a: number) => a * (Math.sin(t * 31) + Math.sin(t * 47)) * 0.5;

const SIMFLY: Script = {
  seq: [['foot', 0.3, 1.3], ['top', 0.02, 0.7], ['plat', 0.02, 0.9], ['door', 0.1, 0.9], ['belt', 1.6], ['check', 2.0], ['power', 1.6], ['roll', 2.6, 0.3], ['rotate', 2.0, 0.3], ['gear', 1.6], ['climb', 2.6], ['level', 1.6], ['off', 0.8, 0.9], ['out', 0.1, 0.9], ['down', 0.02, 1.2]],
  at(k) {
    if (k === 'foot') return st(-1.6, 0, 1.92, Math.PI);
    if (k === 'top' || k === 'down') return st(-1.6, DK, 0.92, Math.PI);
    if (k === 'plat' || k === 'out') return st(-1.6, DK, 0.5, Math.PI / 2);
    if (k === 'door' || k === 'off') return st(SM.door[0], DK, SM.door[2], k === 'off' ? -Math.PI / 2 : Math.PI / 2);
    return SEAT;
  },
  cab(k, u, t) {
    if (k === 'roll') return { rx: 0.015 * sm(u, 0, 0.2), rz: rumble(t, 0.003), hv: rumble(t + 1, 0.006) };
    if (k === 'power') return { rx: 0.01 * sm(u, 0.3, 1), rz: 0, hv: 0.04 * sm(u, 0, 0.6) };
    if (k === 'rotate') return { rx: 0.015 + 0.155 * sm(u, 0.1, 0.9), rz: 0, hv: 0.04 + 0.06 * sm(u, 0.1, 0.9) };
    if (k === 'gear') return { rx: 0.17, rz: 0.01 * Math.sin(t), hv: 0.1 };
    if (k === 'climb') return { rx: 0.17 - 0.04 * sm(u, 0, 1), rz: 0.07 * Math.sin(u * Math.PI), hv: 0.1 };
    if (k === 'level') return { rx: 0.13 * (1 - sm(u, 0, 0.9)), rz: 0, hv: 0.1 * (1 - sm(u, 0.1, 1)) };
    if (k === 'check' || k === 'belt') return { rx: 0, rz: 0, hv: k === 'check' ? 0 : 0 };
    return still;
  },
  key(k, u, c) {
    const v: Record<string, Record<string, number>> = {
      belt: { bridge: sm(u, 0.3, 1) },
      check: {},
      power: { thr: sm(u, 0.1, 0.8), rwy: 1, prog: 0, spd: 40 * sm(u, 0.5, 1) },
      roll: { thr: 1, rwy: 1, prog: u, spd: 40 + 110 * u },
      rotate: { thr: 1, rwy: 1, prog: 1 + u, pitch: 0.3 * sm(u, 0.1, 0.8), spd: 150 + 20 * u, alt: 300 * u },
      gear: { thr: 1, pitch: 0.3, spd: 175, alt: 300 + 500 * u, gear: 1 - sm(u, 0.3, 0.6) },
      climb: { thr: 1, pitch: 0.28, roll: 0.45 * Math.sin(u * Math.PI), spd: 190, alt: 800 + 3000 * u, gear: 0, cloud: 1 },
      level: { thr: 1 - 0.4 * sm(u, 0.1, 0.5), pitch: 0.28 * (1 - sm(u, 0, 0.8)), spd: 210, alt: 4000, gear: 0, cloud: 1, done: sm(u, 0.5, 0.7) },
    };
    const inCab = v[k] !== undefined;
    const n: Record<string, number> = { thr: 0, rwy: 0, prog: 0, pitch: 0, roll: 0, spd: 0, alt: 0, gear: 1, cloud: 0, bridge: inCab ? 1 : k === 'off' ? 1 - sm(u, 0, 1) : 0, beacon: inCab && k !== 'belt' ? 1 : 0, rest: inCab ? 0 : 1, inst: k === 'level' ? 2 : k === 'check' ? 1 : 0, foAct: k === 'rotate' ? 1 : k === 'gear' ? 2 : 0, lit: k === 'belt' ? sm(u, 0, 0.3) : inCab ? 1 : 0, ...v[k] };
    const off: Key = { nod: 0.1, lean: 0.05, n };
    const thr = n.thr;
    const r = thrAt(thr);
    const sy = k === 'rotate' ? sm(u, 0.05, 0.6) : k === 'gear' || k === 'climb' ? 0.4 : k === 'level' ? 0.4 * (1 - u) : 0;
    const sx = k === 'climb' ? 0.6 * Math.cos(u * Math.PI) : 0;
    const l = stickAt(sx, sy);
    const base = { l, r, lean: 0.08, nod: 0.05, gl: 0.9, gr: 0.9, palms: 0.4, n: { ...n, sx, sy } };
    switch (k) {
      case 'belt': {
        // The shoulder straps over and the buckle clicked at the lap.
        const up = u < 0.45;
        const y = up ? 0.5 : 0.28;
        return { l: c.bd(0.14, y * c.H, 0.14), r: c.bd(-0.14, y * c.H, 0.14), nod: 0.45, lean: 0.05, gl: 0.8, gr: 0.8, palms: 0.5, n };
      }
      case 'check': {
        // The card up off the pedestal; a finger down it, a look up at each item.
        const card = c.bd(0.08, 0.3 * c.H, 0.28);
        return { l: add(card, 0.04, -0.01, 0), r: u < 0.72 ? add(card, -0.02, 0.05 - 0.1 * frac(u * 2.5), 0.01) : add(SM.mcp, 0.02, 0, 0.03), nod: u < 0.72 ? 0.42 : -0.02, lean: 0.08, gl: 0.85, gr: 0.15, palms: 0.6, props: { card }, n };
      }
      case 'power':
      case 'roll':
      case 'rotate':
      case 'climb':
      case 'level':
        return { ...base, nod: k === 'level' ? 0.1 : -0.03 };
      case 'gear': {
        // The right hand across to the gear lever and up; back.
        const on = u < 0.72;
        const gearP = add(SM.gear, 0, -0.04 + 0.1 * sm(u, 0.25, 0.6), 0.02);
        return { ...base, r: on ? gearP : r, nod: 0.1 };
      }
      case 'off':
        return off;
      default:
        return off;
    }
  },
};

// 엔진 화재 절차: the bell; silenced; the thrust lever back, the master off, the fire button, the agent; 메이데이.
const SIMFIRE: Script = {
  seq: [['cruise', 1.8], ['bell', 1.4, 0.3], ['silence', 1.1, 0.4], ['idle', 1.6, 0.4], ['cut', 1.5, 0.4], ['fire', 1.8, 0.4], ['agent', 1.8, 0.4], ['mayday', 2.6, 0.4], ['descend', 2.4], ['reset', 1.4]],
  at: () => SEAT,
  cab(k, u, t) {
    const shudder = k === 'bell' || k === 'silence' ? rumble(t, 0.012) : k === 'idle' ? rumble(t, 0.006) : 0;
    if (k === 'descend') return { rx: -0.09 * Math.sin(u * Math.PI), rz: 0.05 * Math.sin(u * Math.PI), hv: -0.02 };
    if (k === 'cruise') return { rx: 0.01 * Math.sin(t * 0.8), rz: 0.01 * Math.sin(t * 0.6), hv: 0.04 };
    return { rx: shudder, rz: (k === 'bell' ? 0.03 : k === 'silence' ? 0.03 : k === 'idle' ? 0.02 : 0.01) + shudder, hv: 0.04 };
  },
  key(k, u, c) {
    const after = (q: string) => c.after(q);
    const firing = k !== 'cruise' && k !== 'reset' && !after('agent') && !(k === 'agent' && u > 0.5);
    const flash = firing ? (Math.sin(c.t * 9) > 0 ? 1 : 0.35) : 0;
    const thr1 = k === 'idle' ? 0.55 * (1 - sm(u, 0.2, 0.8)) : after('idle') && k !== 'reset' ? 0 : 0.55;
    const n: Record<string, number> = {
      thr: 0.55, thr1, rwy: 0, pitch: k === 'descend' ? -0.2 * Math.sin(u * Math.PI) : 0, roll: k === 'bell' ? 0.1 : k === 'descend' ? 0.3 * Math.sin(u * Math.PI) : 0, spd: 250, alt: k === 'descend' ? 9000 - 2000 * u : 11000, gear: 0, cloud: 1, bridge: 1, beacon: 1, lit: 1,
      fire: flash, warn: !c.after('silence') && k !== 'silence' && firing ? 1 : k === 'silence' ? 1 - sm(u, 0.3, 0.6) : 0,
      eng: k === 'cut' ? 1 - sm(u, 0.3, 0.6) : c.after('cut') && k !== 'reset' ? 0 : 1,
      btn: k === 'fire' ? sm(u, 0.35, 0.55) : c.after('fire') && k !== 'reset' ? 1 : 0,
      agent: k === 'agent' ? sm(u, 0.45, 0.6) : c.after('agent') && k !== 'reset' ? 1 : 0,
      inst: k === 'cruise' ? 3 : k === 'reset' ? 2 : 0,
      foAct: k === 'bell' || k === 'silence' || k === 'idle' || k === 'cut' ? 3 : k === 'mayday' ? 1 : 0,
      done: k === 'reset' ? 1 : 0,
    };
    const l = stickAt(k === 'descend' ? 0.3 : 0, k === 'descend' ? -0.3 : 0);
    const base = { l, gl: 0.9, gr: 0.9, palms: 0.3, lean: 0.08, nod: 0, n: { ...n, sx: k === 'descend' ? 0.3 : 0, sy: k === 'descend' ? -0.3 : 0 } };
    switch (k) {
      case 'cruise':
      case 'reset':
        return { ...base, r: c.bd(-0.2, 0.28 * c.H, 0.26), gr: 0.3, nod: k === 'reset' ? 0.2 : 0.02 };
      case 'bell':
        return { ...base, r: thrAt(0.55), nod: -0.1, lean: 0.14 };
      case 'silence':
        return { ...base, r: add(SM.master, 0, 0, 0.03), gr: 0.15, lean: 0.18, nod: -0.05 };
      case 'idle':
        return { ...base, r: add(thrAt(thr1), 0.06, 0, 0), nod: 0.3 };
      case 'cut':
        return { ...base, r: add(SM.engMaster, 0, 0.03 - 0.04 * sm(u, 0.3, 0.6), 0), gr: 0.8, nod: 0.45, lean: 0.14 };
      case 'fire':
        return { ...base, r: add(SM.fire, 0, -0.03 + 0.02 * sm(u, 0.35, 0.55), 0), gr: 0.2, nod: -0.5, lean: 0.03 };
      case 'agent':
        return { ...base, r: add(SM.agent, 0, -0.03 + 0.02 * sm(u, 0.45, 0.6), 0), gr: 0.2, nod: -0.5, lean: 0.03 };
      case 'mayday': {
        const mic = atMouth(c, -0.03);
        const h = lerpV(SM.mic, mic, sm(u, 0, 0.25) * (1 - sm(u, 0.85, 1)));
        return { ...base, r: add(h, 0, -0.03, 0.01), nod: 0.08 + 0.04 * wave(c.t, 0.9), props: { mic: h } };
      }
      default:
        return { ...base, r: thrAt(0.55), nod: 0.05 };
    }
  },
};

// 부기장으로 이착륙: the approach, gear and flaps, the flare, the touchdown's jolt, reversers, the brakes.
const SIMLAND: Script = {
  seq: [['appr', 2.0], ['gear', 1.3], ['flap', 1.3], ['short', 2.0], ['flare', 1.8, 0.2], ['touch', 0.8, 0.2], ['rev', 2.2], ['brake', 1.5], ['taxi', 1.6], ['after', 1.6]],
  at: () => SEAT,
  cab(k, u, t) {
    if (k === 'appr' || k === 'gear' || k === 'flap') return { rx: -0.03 + 0.01 * Math.sin(t * 0.7), rz: 0.015 * Math.sin(t * 0.9), hv: 0.1 };
    if (k === 'short') return { rx: -0.03, rz: 0.03 * Math.sin(t * 1.3), hv: 0.1 - 0.02 * u };
    if (k === 'flare') return { rx: -0.03 + 0.1 * sm(u, 0.1, 0.9), rz: 0, hv: 0.08 - 0.04 * u };
    if (k === 'touch') return { rx: 0.07 - 0.03 * u, rz: 0, hv: 0.04 - 0.075 * Math.sin(u * Math.PI) };
    if (k === 'rev') return { rx: 0.04 - 0.1 * sm(u, 0, 0.5), rz: rumble(t, 0.005), hv: rumble(t + 2, 0.008) };
    if (k === 'brake') return { rx: -0.06 * (1 - sm(u, 0.4, 1)), rz: 0, hv: 0 };
    if (k === 'taxi') return { rx: rumble(t, 0.002), rz: 0.015 * Math.sin(u * Math.PI), hv: 0 };
    return still;
  },
  key(k, u, c) {
    const prog: Record<string, number> = { appr: 0.1 + 0.15 * u, gear: 0.25 + 0.1 * u, flap: 0.35 + 0.1 * u, short: 0.45 + 0.4 * u, flare: 0.85 + 0.13 * u, touch: 1, rev: 1 + 0.5 * u, brake: 1.5 + 0.25 * u, taxi: 1.75, after: 1.75 };
    const thr = k === 'flare' ? 0.4 * (1 - sm(u, 0.1, 0.7)) : k === 'touch' || k === 'brake' || k === 'taxi' || k === 'after' ? 0 : k === 'rev' ? 0 : 0.4;
    const sy = k === 'flare' ? sm(u, 0.1, 0.8) : k === 'touch' ? 0.5 * (1 - u) : k === 'short' ? 0.15 * Math.sin(c.t * 2) : 0;
    const sx = k === 'short' ? 0.3 * Math.sin(c.t * 1.3) : 0;
    const n: Record<string, number> = { thr, sx, sy, rwy: 1, near: 1, prog: prog[k], pitch: k === 'flare' ? 0.18 * sm(u, 0.1, 0.9) : k === 'touch' ? 0.1 : -0.03, roll: k === 'short' ? 0.12 * Math.sin(c.t * 1.3) : 0, spd: k === 'rev' ? 130 - 70 * u : k === 'brake' ? 60 - 40 * u : k === 'taxi' || k === 'after' ? 15 : 145, alt: { appr: 1500, gear: 1100, flap: 800, short: 500 - 400 * u, flare: 50 * (1 - u) }[k] ?? 0, gear: k === 'appr' ? 0 : k === 'gear' ? sm(u, 0.3, 0.6) : 1, flap: k === 'flap' ? sm(u, 0.25, 0.65) : c.after('flap') ? 1 : 0, rev: k === 'rev' ? sm(u, 0.05, 0.3) * (1 - sm(u, 0.8, 1)) : 0, bridge: 1, beacon: k === 'after' ? 0.5 : 1, lit: 1, inst: k === 'after' ? 2 : k === 'short' ? 1 : 0, foAct: k === 'flap' ? 2 : k === 'short' || k === 'flare' ? 1 : k === 'after' ? 4 : 0, done: k === 'after' ? 1 : 0 };
    const l = stickAt(sx, sy);
    const base = { l, gl: 0.9, gr: 0.9, palms: 0.3, lean: 0.08, nod: 0, n };
    switch (k) {
      case 'gear':
        return { ...base, r: add(SM.gear, 0, 0.06 - 0.1 * sm(u, 0.3, 0.6), 0.02), nod: 0.08 };
      case 'flap':
        return { ...base, r: add(SM.flap, 0, 0.05, 0.02 + 0.08 * sm(u, 0.25, 0.65)), nod: 0.4 };
      case 'rev':
        return { ...base, r: add(thrAt(0), 0, 0.07 * n.rev, 0.03), nod: -0.05, lean: 0.02 };
      case 'brake':
        return { ...base, r: thrAt(0), lean: 0.2, nod: 0.05 };
      case 'taxi':
        // The tiller by the left knee, the turn off the runway.
        return { ...base, l: [SM.stick[0] + 0.04, SM.stick[1] + 0.06, SM.stick[2] + 0.2 + 0.03 * Math.sin(u * Math.PI)], r: thrAt(0), nod: 0.05 };
      case 'after':
        // A look across to the first officer, and a nod.
        return { ...base, l: c.bd(0.22, 0.24 * c.H, 0.24), gl: 0.3, r: c.bd(-0.22, 0.44 * c.H, 0.3), gr: 0.15, palms: 0, nod: 0.2 + 0.15 * Math.max(0, wave(c.t, 0.8)) };
      default:
        return { ...base, r: thrAt(thr) };
    }
  },
};

// 고난도 기동: an upset thrown in by the instructor: the nose pushed down, the wings rolled level, thrust, the pull out.
const SIMUPSET: Script = {
  seq: [['level', 1.2], ['upset', 1.5, 0.3], ['push', 2.0, 0.3], ['rollout', 2.2, 0.3], ['pull', 2.4, 0.4], ['steady', 1.2], ['upset2', 1.2, 0.3], ['rec2', 2.4, 0.3], ['done', 1.4]],
  at: () => SEAT,
  cab(k, u, t) {
    const jit = rumble(t, 0.004);
    if (k === 'upset') return { rx: 0.2 * sm(u, 0, 0.6), rz: 0.3 * sm(u, 0, 0.8), hv: 0.14 };
    if (k === 'push') return { rx: 0.2 - 0.32 * sm(u, 0, 0.8), rz: 0.3, hv: 0.14 + jit };
    if (k === 'rollout') return { rx: -0.12, rz: 0.3 * (1 - sm(u, 0, 0.9)), hv: 0.12 + jit };
    if (k === 'pull') return { rx: -0.12 + 0.26 * sm(u, 0.05, 0.75), rz: jit, hv: 0.12 - 0.12 * Math.sin(u * Math.PI) };
    if (k === 'steady') return { rx: 0.14 * (1 - u), rz: 0, hv: 0.08 };
    if (k === 'upset2') return { rx: -0.16 * sm(u, 0, 0.7), rz: -0.28 * sm(u, 0, 0.8), hv: 0.1 };
    if (k === 'rec2') return { rx: -0.16 + 0.16 * sm(u, 0.3, 1), rz: -0.28 * (1 - sm(u, 0, 0.7)), hv: 0.1 + jit };
    return { rx: 0, rz: 0, hv: 0.05 };
  },
  key(k, u) {
    const vis: Record<string, [number, number, number]> = {
      // Nose, bank, g.
      level: [0, 0, 1],
      upset: [0.5 * sm(u, 0, 0.6), 1.3 * sm(u, 0, 0.8), 1],
      push: [0.5 - 0.65 * sm(u, 0, 0.8), 1.3, 0.3],
      rollout: [-0.15, 1.3 * (1 - sm(u, 0, 0.9)), 0.8],
      pull: [-0.15 + 0.3 * sm(u, 0.05, 0.75), 0, 1 + 2.4 * Math.sin(u * Math.PI)],
      steady: [0.15 * (1 - u), 0, 1],
      upset2: [-0.45 * sm(u, 0, 0.7), -1.1 * sm(u, 0, 0.8), 1.2],
      rec2: [-0.45 + 0.45 * sm(u, 0.3, 1), -1.1 * (1 - sm(u, 0, 0.7)), 1 + 1.4 * Math.sin(u * Math.PI)],
      done: [0, 0, 1],
    };
    const [pitch, roll, g] = vis[k];
    const sx = k === 'rollout' ? -1 : k === 'rec2' ? (u < 0.7 ? 1 : 0) : 0;
    const sy = k === 'push' ? -1 : k === 'pull' ? 1 : k === 'rec2' ? (u > 0.3 ? 0.6 : 0) : 0;
    const thr = k === 'push' ? 0.2 : k === 'pull' || k === 'rec2' ? 0.95 : 0.6;
    const n: Record<string, number> = { thr, sx, sy, pitch, roll, g, gMeter: 1, rwy: 0, spd: 240 - pitch * 100, alt: 9000 + pitch * 2000, gear: 0, cloud: 1, bridge: 1, beacon: 1, lit: 1, warn: k === 'upset' || k === 'upset2' ? 1 : 0, inst: k === 'level' || k === 'steady' ? 3 : k === 'done' ? 2 : 0, foAct: 0, done: k === 'done' ? 1 : 0 };
    const pressed = k === 'pull' ? 0.12 * Math.sin(u * Math.PI) : 0;
    // Under the pull the head goes down; the arms tense on the controls.
    return { l: stickAt(sx, sy), r: thrAt(thr), gl: 0.95, gr: 0.95, palms: 0.3, lean: k === 'push' ? 0.16 : 0.08 - pressed, nod: k === 'done' ? 0.2 : k === 'upset' ? -0.15 : 0.1 + pressed * 2.5, n };
  },
};

// =============================================================================================
// 브리핑 테이블 (briefingTable, 4 × 3): the long table across the middle, the route chart spread on it.
// The dweller's place at the near side, the first officer's opposite, the fuel and load papers between them;
// the route screen on its post at the +x end.

const TY = 0.75;
export const TB = {
  top: TY,
  me: [-0.7, 0.47, 0.84] as V,
  fo: [-0.7, 0.47, -0.88] as V,
  purser: [0.65, 0.47, -0.88] as V,
  fo2: [0.65, 0.47, 0.84] as V,
  wx: [-1.25, TY + 0.012, 0.18] as V,
  wxOut: [-0.72, TY + 0.012, -0.12] as V,
  notam: [-0.98, TY + 0.012, 0.22] as V,
  fuel: [-0.34, TY + 0.012, 0.2] as V,
  calc: [-0.14, TY + 0.012, 0.22] as V,
  load: [-0.72, TY + 0.012, -0.28] as V,
  loadHere: [-0.68, TY + 0.012, 0.22] as V,
  pen: [-0.46, TY + 0.012, 0.28] as V,
  chartFrom: [-0.3, TY + 0.012, -0.08] as V,
  chartTo: [0.88, TY + 0.012, -0.12] as V,
  sheets: [1.2, TY + 0.012, 0.2] as V,
  place: [0.64, TY + 0.012, 0.22] as V,
  screen: [1.72, 1.32, -0.4] as V,
};
const TB_SEAT = st(TB.me[0], TB.me[1], TB.me[2], Math.PI, { sit: true, floor: 0 });
const BRIEF: Script = {
  seq: [['wx', 3.0], ['notam', 2.8], ['route', 3.4], ['fuel', 2.8], ['load', 1.6, 0.3], ['sign', 2.2], ['shake', 1.8]],
  at: () => TB_SEAT,
  key(k, u, c) {
    const n: Record<string, number> = { screen: k === 'wx' ? 1 : k === 'notam' ? 2 : k === 'route' ? 3 : k === 'fuel' || k === 'load' || k === 'sign' ? 4 : 5, routeU: k === 'route' ? sm(u, 0.15, 0.85) : c.after('route') ? 1 : 0, flip: k === 'notam' ? Math.floor(u * 3) : c.after('notam') ? 3 : 0, calc: k === 'fuel' ? Math.floor(u * 4) : 0, signed: k === 'sign' ? sm(u, 0.35, 0.8) : k === 'shake' ? 1 : 0, foA: k === 'wx' && u > 0.6 ? 1 : k === 'notam' ? 2 : k === 'route' && u > 0.55 ? 3 : k === 'fuel' && u > 0.6 ? 4 : k === 'load' ? 5 : k === 'shake' ? 6 : 0 };
    const hL = c.bd(0.2, 0.3 * c.H, 0.3);
    const hR = c.bd(-0.2, 0.3 * c.H, 0.3);
    const papers: Record<string, V | null> = { wx: c.after('wx') ? TB.wxOut : null, load: c.after('sign') ? TB.loadHere : null };
    switch (k) {
      case 'wx': {
        // The weather sheet up off the table to read, then across to the first officer.
        const read = c.bd(0.05, 0.42 * c.H, 0.3);
        const s = u < 0.2 ? lerpV(TB.wx, read, sm(u, 0.02, 0.2)) : u < 0.65 ? read : lerpV(read, TB.wxOut, sm(u, 0.65, 0.92));
        return { l: u < 0.95 ? add(s, 0.05, 0.015, 0.06) : hL, r: u < 0.6 ? add(read, -0.09, 0.01, 0) : hR, nod: u < 0.65 ? 0.4 : 0.32, lean: 0.14 + 0.28 * sm(u, 0.65, 0.9) * (1 - sm(u, 0.92, 1)), gl: 0.75, gr: 0.5, palms: 0.5, props: { ...papers, wx: s }, n };
      }
      case 'notam': {
        // Through the 항공고시보 page by page, a highlighter across the runway closure.
        const lap = frac(u * 3);
        return { l: add(TB.notam, 0.05, 0.01 + 0.07 * sm(lap, 0.05, 0.5) * (1 - sm(lap, 0.5, 0.95)), 0.08), r: add(TB.notam, -0.03 + 0.1 * lap, 0.015, -0.02), nod: 0.55, lean: 0.22, gl: 0.6, gr: 0.8, palms: 0.9, props: { ...papers, hi: add(TB.notam, -0.03 + 0.1 * lap, 0.02, -0.02) }, n };
      }
      case 'route': {
        // A finger along the route on the chart, the first officer's coming back along it.
        const e = sm(u, 0.1, 0.55);
        const at = lerpV(TB.chartFrom, [0.32, TB.chartTo[1], -0.08], e);
        return { l: hL, r: add(at, 0, 0.01, 0.03), nod: 0.5, lean: 0.34, gr: 0.15, gl: 0.3, palms: 0.9, props: papers, n: { ...n, finger: u > 0.55 ? sm(u, 0.55, 0.95) : 0 } };
      }
      case 'fuel': {
        // The fuel sheet held down; the calculator pressed; the figure said across.
        return { l: add(TB.fuel, 0, 0.012, 0.02), r: tapAt(add(TB.calc, 0, 0.02, 0), c.t, 2.5), nod: 0.5, lean: 0.22, gl: 0.2, gr: 0.15, palms: 0.9, props: papers, n };
      }
      case 'load': {
        // The first officer slides the load sheet over; the pen taken up.
        const s = lerpV(TB.load, TB.loadHere, sm(u, 0.1, 0.75));
        return { l: add(s, 0.14, 0.012, 0.06), r: lerpV(hR, add(TB.pen, 0, 0.02, 0), sm(u, 0.5, 0.9)), nod: 0.48, lean: 0.22, gl: 0.3, gr: 0.6, palms: 0.9, props: { ...papers, load: s, foSlide: s }, n };
      }
      case 'sign': {
        const line = add(TB.loadHere, -0.04, 0.015, 0.08);
        const pen = u < 0.3 || u > 0.85 ? add(line, 0, 0.03, 0) : scribble(line, u, 0.12, 3);
        return { l: add(TB.loadHere, 0.14, 0.012, 0.06), r: pen, nod: 0.55, lean: 0.26, gl: 0.3, gr: 0.85, palms: 0.9, props: { ...papers, load: TB.loadHere, pen: add(pen, 0, 0.01, 0) }, n };
      }
      default: {
        // Across the table, hand to hand.
        const mid: V = [-0.7, TY + 0.28, -0.02 + 0.012 * wave(c.t, 2)];
        return { l: hL, r: mid, nod: 0.05, lean: 0.46, gl: 0.3, gr: 0.75, palms: 0, props: { ...papers, load: TB.loadHere }, n };
      }
    }
  },
};
const DB_BOARD = st(1.45, 0, 0.72, -2.55);
const DB_SIDE = st(0.3, 0, 1.28, Math.PI);
const DEBRIEF: Script = {
  seq: [['replay', 3.0, 0.5], ['ask', 2.4, 0.9], ['hand', 2.2, 0.5], ['listen', 2.8, 0.9], ['point', 2.6, 0.5], ['good', 2.2]],
  at(k) {
    return k === 'hand' || k === 'listen' ? DB_SIDE : DB_BOARD;
  },
  key(k, u, c) {
    const n: Record<string, number> = { screen: k === 'replay' ? 6 : k === 'ask' ? 7 : k === 'hand' || k === 'listen' ? 7 : k === 'point' ? 8 : 9, foA: k === 'ask' ? 2 : k === 'good' ? 6 : 0, purA: k === 'listen' ? 2 : k === 'hand' ? 1 : k === 'good' ? 6 : 0, fo2A: k === 'listen' ? 1 : k === 'point' ? 1 : 0, crew: 1, dealt: c.p('hand', 0.5, 0.75), written: k === 'listen' ? sm(u, 0.2, 0.9) : 0 };
    const hL = c.bd(0.2, 0.56 * c.H, 0.08);
    const clip = c.bd(0.12, 0.62 * c.H, 0.26);
    const screen: V = [TB.screen[0] - 0.1, TB.screen[1] + 0.05, TB.screen[2] + 0.1];
    switch (k) {
      case 'replay': {
        // A hand to the screen: the approach played back, the moment it went high marked.
        const w = 0.14 * Math.sin(u * Math.PI * 2);
        return { l: clip, r: add(screen, w, -0.1 + 0.2 * u, 0), gl: 0.8, gr: 0.15, palms: 0, nod: -0.06, lean: 0.12, props: { clip }, n: { ...n, playU: u } };
      }
      case 'ask':
        // Turned to the table, an open hand to the first officer: 어땠나요?
        return { l: clip, r: c.bd(-0.2, (0.66 + 0.02 * wave(c.t, 0.7)) * c.H, 0.38), gl: 0.8, gr: 0.05, palms: -0.2, nod: 0.08, lean: 0.1, props: { clip }, n };
      case 'hand': {
        // A sheet off the stack and down at the place in front of them.
        const s = u < 0.5 ? lerpV(add(clip, 0, 0.02, 0), c.bd(-0.12, 0.58 * c.H, 0.34), sm(u, 0, 0.3)) : lerpV(c.bd(-0.12, 0.58 * c.H, 0.34), TB.place, sm(u, 0.5, 0.8));
        return { l: clip, r: add(s, 0, 0.012, 0.04), gl: 0.8, gr: 0.6, nod: 0.36, lean: 0.3 * sm(u, 0.45, 0.8), palms: 0.8, props: { clip, sheet: s }, n };
      }
      case 'listen': {
        // The purser's talking; written down on the clipboard.
        return { l: clip, r: scribble(add(clip, -0.01, 0.015, 0), u, 0.1, 4), gl: 0.85, gr: 0.85, nod: 0.3 + 0.1 * Math.max(0, wave(c.t, 0.6)), palms: 0.9, lean: 0.06, props: { clip }, n };
      }
      case 'point':
        // Back at the board: the two things to keep, tapped.
        return { l: clip, r: add(screen, u < 0.5 ? -0.1 : 0.1, (u < 0.5 ? 0.1 : -0.08) + 0.012 * Math.max(0, wave(c.t, 2)), 0), gl: 0.8, gr: 0.15, palms: 0, nod: -0.04, lean: 0.12, props: { clip }, n };
      default:
        // Thumbs up round the table.
        return { l: hL, r: c.bd(-0.16, (0.78 + 0.02 * wave(c.t, 1.2)) * c.H, 0.3), gr: 0.75, palms: -0.2, nod: 0.25, lean: 0.03, props: {}, n };
    }
  },
};

// =============================================================================================
// 운항 관리 데스크 (opsDesk, 3 × 2): three dispatch screens over a long desk, the crew schedule on the back
// panel, a colleague at the +x end. The dweller's chair at -x.

const OY = 0.74;
export const OD = {
  top: OY,
  seat: [-0.55, 0.47, 0.42] as V,
  keys: [-0.55, OY + 0.025, -0.12] as V,
  mouse: [-0.2, OY + 0.015, -0.1] as V,
  phone: [-1.2, OY + 0.05, -0.2] as V,
  printer: [0.3, OY + 0.2, -0.38] as V,
  printOut: [0.3, OY + 0.14, -0.14] as V,
  page: [-0.55, OY + 0.012, 0.0] as V,
  tray: [-1.1, OY + 0.05, 0.02] as V,
  binder: [-0.1, OY + 0.012, 0.02] as V,
  calc: [-0.06, OY + 0.012, -0.05] as V,
  chart: [-0.75, OY + 0.012, 0.0] as V,
  screenL: [-0.6, 1.14, -0.68] as V,
};
const OD_SEAT = st(OD.seat[0], OD.seat[1], OD.seat[2], Math.PI, { sit: true, floor: 0 });
const handsOnKeys = (c: Ctx): { l: V; r: V } => ({ l: tapAt(add(OD.keys, 0.1, 0, 0), c.t, 3), r: tapAt(add(OD.keys, -0.1, 0, 0), c.t + 0.17, 3) });
const FILE: Script = {
  seq: [['type', 3.2], ['check', 1.8], ['phone', 2.8], ['send', 1.2], ['print', 2.2], ['sign', 2.4], ['tray', 1.8]],
  at: () => OD_SEAT,
  key(k, u, c) {
    const n: Record<string, number> = { scr: k === 'type' ? Math.floor(u * 4) : 3, sent: k === 'send' ? sm(u, 0.5, 0.7) : c.after('send') ? 1 : 0, feed: k === 'print' ? sm(u, 0, 0.7) : 0, signed: k === 'sign' ? sm(u, 0.3, 0.85) : k === 'tray' ? 1 : 0, mate: k === 'phone' ? 1 : k === 'tray' ? 2 : 0, ringing: k === 'phone' && u < 0.15 ? 1 : 0 };
    const hL = c.bd(0.2, 0.3 * c.H, 0.26);
    const hR = c.bd(-0.2, 0.3 * c.H, 0.26);
    switch (k) {
      case 'type':
        return { ...handsOnKeys(c), nod: 0.15, lean: 0.14, gl: 0.2, gr: 0.2, palms: 1, tap: true, n };
      case 'check': {
        // A finger along the route on the middle screen.
        return { l: hL, r: add(OD.screenL, -0.15 + 0.3 * u, 0.04 - 0.05 * Math.floor(u * 3), 0.03), nod: -0.04, lean: 0.26, gl: 0.3, gr: 0.15, palms: 0, n };
      }
      case 'phone': {
        // The handset up: the route read to the tower's 관제 desk.
        const h = lerpV(OD.phone, atEar(c, 1), sm(u, 0.05, 0.25) * (1 - sm(u, 0.85, 1)));
        return { l: add(h, 0, -0.01, 0), r: add(OD.page, 0.04 - 0.08 * frac(u * 2), 0.012, 0.05), gl: 0.9, gr: 0.15, nod: 0.25 + 0.05 * wave(c.t, 0.8), lean: 0.08, palms: 1, props: { phone: h }, n };
      }
      case 'send':
        return { l: hL, r: tapAt(add(OD.keys, -0.18, 0.005, 0), c.t, 1.5), gr: 0.15, gl: 0.3, nod: 0.12, lean: 0.14, palms: 1, n };
      case 'print': {
        // The plan comes out of the printer; turned and taken.
        const s = lerpV(OD.printOut, OD.page, sm(u, 0.65, 0.95));
        return { l: hL, r: lerpV(hR, add(s, 0, 0.015, 0.05), sm(u, 0.4, 0.68)), gr: 0.7, gl: 0.3, nod: 0.25, lean: 0.24, palms: 0.9, props: { plan: u > 0.05 ? s : null }, n };
      }
      case 'sign': {
        const line = add(OD.page, -0.03, 0.012, 0.05);
        const pen = u < 0.25 || u > 0.9 ? add(line, 0, 0.03, 0) : scribble(line, u, 0.12, 3);
        return { l: add(OD.page, 0.14, 0.01, 0.06), r: pen, gl: 0.25, gr: 0.85, nod: 0.5, lean: 0.2, palms: 0.9, props: { plan: OD.page, pen: add(pen, 0, 0.01, 0) }, n };
      }
      default: {
        const s = lerpV(OD.page, OD.tray, sm(u, 0.15, 0.8));
        return { l: add(s, 0.02, 0.015, 0.05), r: hR, gl: 0.7, gr: 0.3, nod: 0.25, lean: 0.2, palms: 0.9, props: { plan: u < 0.85 ? s : null, planIn: u >= 0.85 ? OD.tray : null }, n };
      }
    }
  },
};
const CHECKLIST: Script = {
  seq: [['open', 1.6], ['read', 3.2], ['cover', 3.0], ['flip', 1.4], ['card', 2.8], ['answer', 2.2], ['tick', 1.8]],
  at: () => OD_SEAT,
  key(k, u, c) {
    const n: Record<string, number> = { open: k === 'open' ? sm(u, 0.3, 0.9) : k === 'tick' ? 1 - sm(u, 0.6, 1) * 0 : 1, page: k === 'flip' ? sm(u, 0.2, 0.8) : c.after('flip') ? 1 : 0, ticks: k === 'tick' ? sm(u, 0.1, 0.8) : 0, shut: k === 'cover' ? sm(u, 0.05, 0.2) * (1 - sm(u, 0.85, 1)) : 0, scr: 4, mate: k === 'card' || k === 'answer' ? 3 : 0 };
    const b = TB_BOOK;
    const hL = c.bd(0.2, 0.3 * c.H, 0.26);
    switch (k) {
      case 'open': {
        // The 체크리스트 binder pulled over and opened.
        return { l: add(b, -0.12, 0.012, 0.06), r: add(b, 0.05, 0.02 + 0.08 * Math.sin(Math.PI * sm(u, 0.3, 0.9)), 0.05), gl: 0.5, gr: 0.6, nod: 0.5, lean: 0.2, palms: 0.9, n };
      }
      case 'read': {
        // A finger down the items, line by line.
        return { l: add(b, -0.14, 0.012, 0.06), r: add(b, 0.08, 0.014, -0.09 + 0.18 * frac(u * 2)), gl: 0.3, gr: 0.15, nod: 0.56, lean: 0.24, palms: 0.9, n };
      }
      case 'cover': {
        // The page covered with a hand, eyes up: said from memory, a finger counting.
        return { l: add(b, 0.06, 0.03, 0), r: c.bd(-0.14, (0.5 + 0.015 * wave(c.t, 1.5)) * c.H, 0.28), gl: 0.1, gr: 0.5, palms: 0.1, nod: -0.1 + 0.05 * wave(c.t, 0.7), lean: 0.05, n };
      }
      case 'flip':
        return { l: add(b, -0.14, 0.012, 0.06), r: add(b, 0.12 - 0.24 * sm(u, 0.2, 0.8), 0.015 + 0.1 * Math.sin(Math.PI * sm(u, 0.2, 0.8)), 0), gl: 0.3, gr: 0.6, nod: 0.5, lean: 0.2, palms: 0.9, n };
      case 'card': {
        // The colleague holds up a flash card; the answer's thought over, chin on hand.
        return { l: hL, r: c.bd(-0.04, 0.4 * c.H, 0.13), gl: 0.3, gr: 0.4, nod: -0.02, lean: 0.03, palms: 0.5, n: { ...n } };
      }
      case 'answer':
        return { l: hL, r: c.bd(-0.2, (0.5 + 0.03 * wave(c.t, 0.9)) * c.H, 0.34), gl: 0.3, gr: 0.05, palms: -0.2, nod: 0.08 + 0.05 * wave(c.t, 0.8), lean: 0.03, n };
      default: {
        const pen = add(b, 0.08, 0.02, -0.06 + 0.1 * u);
        return { l: add(b, -0.14, 0.012, 0.06), r: pen, gl: 0.3, gr: 0.85, nod: 0.55, lean: 0.24, palms: 0.9, props: { pen: add(pen, 0, 0.01, 0) }, n };
      }
    }
  },
};
const TB_BOOK: V = [-0.55, OY + 0.022, 0.0];
const FUEL: Script = {
  seq: [['chart', 3.0], ['calc', 3.0], ['bars', 2.2], ['phone', 2.6], ['write', 2.4], ['show', 1.8]],
  at: () => OD_SEAT,
  key(k, u, c) {
    const n: Record<string, number> = { scr: 5, bars: k === 'chart' ? 0.1 : k === 'calc' ? 0.1 + 0.3 * u : k === 'bars' ? 0.4 + 0.6 * sm(u, 0, 0.8) : 1, digit: k === 'calc' ? Math.floor(u * 5) : 5, chartOn: 1, mate: k === 'show' ? 2 : 0, written: k === 'write' ? sm(u, 0.15, 0.85) : k === 'show' ? 1 : 0 };
    const hL = c.bd(0.2, 0.3 * c.H, 0.26);
    switch (k) {
      case 'chart': {
        // The scale rule walked along the chart's route, leg by leg.
        const lap = frac(u * 2);
        const a = add(OD.chart, -0.22 + 0.2 * Math.floor(u * 2) + 0.2 * lap, 0.012, 0);
        return { l: add(a, 0.1, 0.008, 0.04), r: add(a, -0.1, 0.008, 0.04), gl: 0.7, gr: 0.7, nod: 0.54, lean: 0.28, palms: 0.9, props: { rule: a }, n };
      }
      case 'calc':
        return { l: add(OD.chart, 0, 0.012, 0.04), r: tapAt(add(OD.calc, 0, 0.02, 0), c.t, 2.4), gl: 0.2, gr: 0.15, nod: 0.5, lean: 0.2, palms: 0.9, n };
      case 'bars':
        return { l: hL, r: add(OD.screenL, 0.58, 0.06 - 0.12 * u, 0.03), gl: 0.3, gr: 0.15, nod: -0.02, lean: 0.3, palms: 0, n };
      case 'phone': {
        // The fuel figure rung through to the ramp.
        const h = lerpV(OD.phone, atEar(c, 1), sm(u, 0.05, 0.25) * (1 - sm(u, 0.85, 1)));
        return { l: add(h, 0, -0.01, 0), r: c.bd(-0.2, (0.4 + 0.02 * wave(c.t, 0.8)) * c.H, 0.3), gl: 0.9, gr: 0.15, palms: 0, nod: 0.12 + 0.05 * wave(c.t, 0.8), lean: 0.06, props: { phone: h }, n };
      }
      case 'write': {
        const line = add(OD.page, 0, 0.012, 0.03);
        const pen = scribble(line, u, 0.12, 3);
        return { l: add(OD.page, 0.14, 0.01, 0.06), r: pen, gl: 0.25, gr: 0.85, nod: 0.52, lean: 0.2, palms: 0.9, props: { pen: add(pen, 0, 0.01, 0), fuelSheet: OD.page }, n };
      }
      default: {
        // The sheet held across for the colleague to check.
        const s = c.bd(-0.3, 0.42 * c.H, 0.3);
        return { l: hL, r: add(s, 0, 0.012, 0), gl: 0.3, gr: 0.7, nod: 0.08, lean: 0.06, palms: 0.5, props: { fuelSheet: s }, n };
      }
    }
  },
};

// =============================================================================================
// 탑승구 (boardingGate, 9 × 2): the aeroplane on the ramp, side on, nose at -x. Its airstairs at the front
// door, the near wing and its engine reaching towards the front of the piece, its main gear behind. A pilot's
// walk-around, torch and tablet in hand, clockwise: nose, pitot, engine, gear, tail, then the tech log signed.

export const GT = {
  body: -0.15,
  belly: 0.62,
  r: 0.72,
  noseX: -4.3,
  noseGear: [-3.3, 0.18, -0.08] as V,
  pitot: [-3.68, 1.22, 0.52] as V,
  inlet: [-0.62, 0.55, 0.98] as V,
  blade: [-0.64, 0.62, 1.06] as V,
  mainGear: [1.05, 0.2, 0.46] as V,
  flap: [1.05, 0.92, 1.05] as V,
  tail: [4.1, 1.5, 0.05] as V,
  log: [-2.2, 0.95, 1.52] as V,
  mech: [-1.72, 1.55] as const,
};
const WALK: Script = {
  seq: [['nose', 2.4, 0.9], ['pitot', 2.2, 2.0], ['engine', 2.6, 1.8], ['gear', 2.4, 0.9], ['flap', 1.6, 1.5], ['tail', 1.8, 3.0], ['log', 2.8, 1.5]],
  at(k) {
    if (k === 'nose') return st(-3.3, 0, 0.92, Math.PI);
    if (k === 'pitot') return st(-3.72, 0, 1.15, Math.PI);
    if (k === 'engine') return st(-1.3, 0, 1.0, Math.PI / 2);
    if (k === 'gear') return st(1.45, 0, 1.2, -2.5);
    if (k === 'flap') return st(1.1, 0, 1.55, Math.PI);
    if (k === 'tail') return st(3.7, 0, 1.3, 2.9);
    return st(-2.5, 0, 1.55, Math.PI / 2);
  },
  key(k, u, c) {
    const H = c.H;
    const tablet = c.bd(0.14, 0.62 * H, 0.22);
    const torch = c.bd(-0.2, 0.62 * H, 0.26);
    const n: Record<string, number> = { cover: k === 'pitot' ? 1 - sm(u, 0.35, 0.55) : k === 'nose' ? 1 : 0, spin: k === 'engine' ? sm(u, 0.25, 0.6) : 0, torch: k === 'nose' || k === 'engine' || k === 'gear' ? 1 : 0, tick: k === 'log' ? sm(u, 0.3, 0.85) : 0, mech: k === 'log' ? 1 : 0, marks: { nose: 1, pitot: 2, engine: 3, gear: 4, flap: 5, tail: 6, log: 7 }[k] ?? 0, flapDown: k === 'flap' ? sm(u, 0.2, 0.7) : 0 };
    const base = { gl: 0.8, gr: 0.85, palms: 0.5, props: { tablet, torchAt: torch } as Record<string, V | null> };
    switch (k) {
      case 'nose': {
        // Crouched at the nose wheel: the torch on the tyre, the strut's chrome, a tap with the knuckles.
        const tyre = add(GT.noseGear, 0, 0.02 * Math.max(0, wave(c.t, 1.6)), 0.14);
        return { ...base, l: tablet, r: tyre, crouch: 0.78, lean: 0.34, nod: 0.45, gr: 0.5, props: { tablet, torchAt: add(tyre, 0.05, 0.05, 0.05) }, n };
      }
      case 'pitot': {
        // Up to the pitot tube: its red cover off, streamer and all, into the pocket.
        const here = add(GT.pitot, 0, -0.02, 0.05);
        const off = c.bd(-0.2, 0.55 * H, 0.1);
        const cv = u < 0.45 ? here : lerpV(here, off, sm(u, 0.45, 0.8));
        return { ...base, l: tablet, r: add(cv, 0, -0.03, 0), nod: -0.35, lean: 0.14, gr: 0.8, props: { tablet, coverOff: u > 0.35 && u < 0.85 ? cv : null, torchAt: null }, n };
      }
      case 'engine': {
        // At the mouth of the engine: a hand in to turn a fan blade, the torch round the inlet.
        const h = add(GT.blade, 0.02 + 0.03 * Math.sin(u * 8), 0.03 * Math.sin(u * 8), 0);
        return { ...base, l: tablet, r: h, nod: 0.18, lean: 0.36, crouch: 0.2, gr: 0.6, props: { tablet, torchAt: add(GT.inlet, -0.2, 0.15, 0.2) }, n };
      }
      case 'gear': {
        // Under the wing's trailing edge: the main wheel's tyre and brake wear pin.
        const tyre = add(GT.mainGear, 0.12, 0.02 + 0.03 * Math.max(0, wave(c.t, 1.4)), 0.15);
        return { ...base, l: tablet, r: tyre, crouch: 0.8, lean: 0.42, nod: 0.5, gr: 0.45, props: { tablet, torchAt: add(tyre, 0.1, 0.05, 0.12) }, n };
      }
      case 'flap': {
        // A hand up to the flap's edge, looked along.
        return { ...base, l: tablet, r: add(GT.flap, 0, -0.04, 0.03), nod: -0.35, lean: 0.1, gr: 0.5, n };
      }
      case 'tail': {
        // A long look up at the fin and the elevators; ticked off.
        const pen = add(tablet, -0.03 + 0.06 * frac(u * 2), 0.03, 0);
        return { ...base, l: tablet, r: u < 0.5 ? c.bd(-0.2, 0.96 * H, 0.2) : pen, nod: u < 0.5 ? -0.5 : 0.45, lean: 0, gr: 0.2, n };
      }
      default: {
        // The mechanic's tech log, signed on his clipboard; a nod, the tablet under the arm.
        const pen = u > 0.3 && u < 0.85 ? scribble(add(GT.log, 0, 0.02, 0), u, 0.1, 3) : add(GT.log, 0.05, 0.04, 0);
        return { ...base, l: c.bd(0.22, 0.6 * H, 0.1), r: pen, gr: 0.85, nod: 0.42, lean: 0.14, props: { tablet: c.bd(0.25, 0.6 * H, 0.08), torchAt: null, pen: add(pen, 0, 0.01, 0) }, n };
      }
    }
  },
};

// =============================================================================================
// 절차 훈련기 (plCpt, 3 × 2): plywood and printed panels on a frame; two stools, the dweller's at -x; flows
// touched in order, the instructor at the side with a pointer. Lamps are lit as each stop is touched.

export const CP = {
  seat: [-0.42, 0.5, 0.42] as V,
  card: [-0.14, 0.72, -0.05] as V,
  over: [[-0.46, 1.62, -0.16], [-0.24, 1.62, -0.16], [-0.02, 1.62, -0.16], [0.2, 1.62, -0.16]] as V[],
  mcp: [[-0.5, 1.12, -0.57], [-0.1, 1.12, -0.57], [0.3, 1.12, -0.57]] as V[],
  pfd: [-0.46, 0.92, -0.59] as V,
  ped: [[-0.1, 0.72, -0.22], [0.1, 0.72, -0.22]] as V[],
  yoke: [-0.42, 0.78, -0.2] as V,
};
const CP_SEAT = st(CP.seat[0], CP.seat[1], CP.seat[2], Math.PI, { sit: true, floor: 0 });
const FLOW: Script = {
  seq: [['card', 2.0], ['over', 3.4], ['mcp', 2.6], ['pfd', 1.8], ['ped', 2.2], ['controls', 2.0], ['call', 2.0]],
  at: () => CP_SEAT,
  key(k, u, c) {
    const stage = { card: 0, over: Math.floor(u * 4), mcp: 4 + Math.floor(u * 3), pfd: 7, ped: 8 + Math.floor(u * 2), controls: 10, call: 10 }[k] ?? 0;
    const n: Record<string, number> = { stage, sx: k === 'controls' ? Math.sin(u * Math.PI * 2) : 0, sy: k === 'controls' ? Math.cos(u * Math.PI * 2) * sm(u, 0, 0.1) : 0, teach: k === 'over' ? 1 : k === 'call' ? 2 : k === 'pfd' ? 3 : 0, flip: k === 'over' ? frac(u * 4) : 0 };
    const hL = c.bd(0.2, 0.28 * c.H, 0.28);
    const hR = c.bd(-0.2, 0.28 * c.H, 0.28);
    const card = c.bd(0.05, 0.4 * c.H, 0.3);
    switch (k) {
      case 'card': {
        const s = lerpV(CP.card, card, sm(u, 0.05, 0.3));
        return { l: add(s, 0.06, 0.02, 0), r: add(s, -0.04, 0.03 - 0.06 * frac(u * 2), 0.015), gl: 0.85, gr: 0.15, nod: 0.42, lean: 0.06, palms: 0.6, props: { card: s }, n };
      }
      case 'over': {
        // The overhead, right along: left to right, each switch pressed.
        const i = Math.min(3, Math.floor(u * 4));
        const lap = frac(u * 4);
        return { l: hL, r: add(CP.over[i], 0, -0.02 + 0.015 * Math.sin(lap * Math.PI), 0.02), gl: 0.3, gr: 0.15, nod: -0.5, lean: 0.02, palms: 0, n };
      }
      case 'mcp': {
        const i = Math.min(2, Math.floor(u * 3));
        return { l: hL, r: add(CP.mcp[i], 0.012 * Math.sin(c.t * 8), 0.0, 0.02), gl: 0.3, gr: 0.5, nod: 0.02, lean: 0.14, palms: 0, n };
      }
      case 'pfd':
        return { l: add(CP.pfd, 0.04 * Math.sin(u * 6), 0.02, 0.02), r: hR, gl: 0.15, gr: 0.3, nod: 0.12, lean: 0.14, palms: 0, n };
      case 'ped': {
        const i = u < 0.5 ? 0 : 1;
        return { l: hL, r: add(CP.ped[i], 0, 0.02, 0.01), gl: 0.3, gr: 0.5, nod: 0.45, lean: 0.14, palms: 0.5, n };
      }
      case 'controls':
        // Full and free: the yoke round the box.
        return { l: add(CP.yoke, 0.11 + 0.05 * n.sx, 0.02, 0.04 * n.sy), r: add(CP.yoke, -0.11 + 0.05 * n.sx, 0.02, 0.04 * n.sy), gl: 0.9, gr: 0.9, nod: 0.05, lean: 0.1, palms: 0.3, n };
      default:
        // The check called to the instructor.
        return { l: card, r: c.bd(-0.3, (0.48 + 0.02 * wave(c.t, 0.9)) * c.H, 0.32), gl: 0.85, gr: 0.05, palms: -0.2, nod: 0.12 + 0.05 * wave(c.t, 0.8), lean: 0.03, props: { card }, n };
    }
  },
};

// =============================================================================================
// 운항 기상 브리핑 (plWxWall, 3 × 1): a big screen and a touch console, a printer at +x.

export const WX = {
  screen: [-0.28, 1.5, -0.3] as V,
  panel: [-0.32, 1.02, -0.05] as V,
  printer: [1.12, 0.98, -0.1] as V,
  shelf: [1.12, 0.84, 0.0] as V,
  routeA: [-0.9, 1.72, -0.28] as V,
  routeB: [0.4, 1.3, -0.28] as V,
};
const WX_AT = st(-0.3, 0, 0.56, Math.PI);
const WX_PR = st(1.05, 0, 0.6, Math.PI);
const WXBRIEF: Script = {
  seq: [['metar', 3.0], ['radar', 2.8], ['route', 3.2], ['cb', 2.0, 0.9], ['print', 2.6, 0.9], ['note', 2.4]],
  at(k) {
    return k === 'print' ? WX_PR : WX_AT;
  },
  key(k, u, c) {
    const n: Record<string, number> = { scr: k === 'metar' ? 0 : k === 'radar' ? 1 : k === 'route' || k === 'cb' ? 2 : 3, routeU: k === 'route' ? sm(u, 0.1, 0.9) : k === 'cb' || k === 'print' || k === 'note' ? 1 : 0, sweep: k === 'radar' ? 1 : 0, cb: k === 'cb' ? 1 : 0, feed: k === 'print' ? sm(u, 0.05, 0.6) : 0, ping: k === 'cb' ? 1 : 0 };
    const hL = c.bd(0.22, 0.56 * c.H, 0.08);
    const held = c.bd(0.04, 0.68 * c.H, 0.28);
    switch (k) {
      case 'metar': {
        // The airfield's code tapped in; a finger along the 시정, the wind.
        const ty = u < 0.45;
        return { l: ty ? add(WX.panel, 0.1, 0.015 + 0.012 * Math.max(0, wave(c.t, 2.5)), 0) : hL, r: ty ? tapAt(add(WX.panel, -0.1, 0.015, 0), c.t, 3) : add(WX.screen, -0.1 + 0.26 * frac(u * 2), 0.3 - 0.5 * sm(u, 0.45, 1), 0.04), gl: 0.15, gr: 0.15, nod: ty ? 0.45 : -0.1, lean: 0.14, palms: ty ? 1 : 0, n };
      }
      case 'radar': {
        // The radar frame swiped on, then a two-finger zoom on the echo.
        return { l: add(WX.screen, -0.1 - 0.12 * sm(u, 0.3, 0.9), 0.05, 0.04), r: add(WX.screen, 0.1 + 0.12 * sm(u, 0.3, 0.9), 0.0, 0.04), gl: 0.15, gr: 0.15, palms: 0, nod: -0.08, lean: 0.12, n };
      }
      case 'route':
        return { l: hL, r: add(lerpV(WX.routeA, WX.routeB, sm(u, 0.1, 0.9)), 0, 0, 0.03), gl: 0.3, gr: 0.15, palms: 0, nod: -0.08, lean: 0.1, n };
      case 'cb':
        // There's the cell on the route: a tap on it, and a thoughtful hand to the chin.
        return { l: c.bd(0.06, 0.8 * c.H, 0.14), r: add(lerpV(WX.routeA, WX.routeB, 0.62), 0.012 * wave(c.t, 3), 0, 0.03), gl: 0.45, gr: 0.15, palms: 0, nod: -0.06, lean: 0.08, n };
      case 'print': {
        const s = lerpV(add(WX.shelf, 0, 0.05, 0), held, sm(u, 0.62, 0.95));
        return { l: u > 0.75 ? add(s, 0.09, 0.01, 0.04) : hL, r: add(s, -0.05, 0.015, 0.05), gl: 0.7, gr: 0.7, nod: 0.35, lean: 0.2 * (1 - sm(u, 0.7, 1)), palms: 0.8, props: { sheet: u > 0.1 ? s : null }, n };
      }
      default: {
        const s = c.bd(0.1, 0.64 * c.H, 0.26);
        const pen = scribble(add(s, -0.02, 0.012, 0), u, 0.12, 3);
        return { l: add(s, 0.09, -0.01, 0.0), r: pen, gl: 0.85, gr: 0.85, nod: 0.45, palms: 0.9, lean: 0.03, props: { sheet: s, pen: add(pen, 0, 0.012, 0) }, n };
      }
    }
  },
};

// =============================================================================================
// 운항 승무원 준비실 (plCrewRoom, 3 × 1): lockers at -x, the bench and the flight bag in the middle, the mirror and
// cap shelf at +x. Captain's bars onto the shoulders, cap on, licence and medical into the bag.

export const CR = {
  door: [-1.0, 1.12, 0.05] as V,
  inside: [-0.98, 1.05, -0.2] as V,
  bench: [0.05, 0.5, 0.26] as V,
  items: [[-0.2, 0.5, 0.28], [-0.1, 0.5, 0.34]] as V[],
  cap: [0.96, 1.62, -0.28] as V,
  mirror: [0.98, 1.2, -0.42] as V,
};
const CR_L = st(-0.95, 0, 0.55, Math.PI);
const CR_B = st(0.05, 0, 0.78, Math.PI);
const CR_M = st(0.92, 0, 0.42, Math.PI);
const SUIT: Script = {
  seq: [['open', 1.4], ['jacket', 2.0, 1.0], ['bars', 3.0, 0.9], ['cap', 1.8, 1.0], ['docs', 3.0], ['zip', 1.4], ['pull', 1.2, 1.1], ['shut', 1.4]],
  at(k) {
    if (k === 'open' || k === 'jacket' || k === 'shut') return CR_L;
    if (k === 'bars' || k === 'cap') return CR_M;
    return CR_B;
  },
  key(k, u, c) {
    const H = c.H;
    const hL = c.bd(0.22, 0.56 * H, 0.08);
    const hR = c.bd(-0.22, 0.56 * H, 0.08);
    const shL = c.bd(0.18, 0.8 * H, 0.0);
    const shR = c.bd(-0.18, 0.8 * H, 0.0);
    const worn = (c.after('jacket') || (k === 'jacket' && u > 0.62)) && k !== 'shut';
    const barsL = k === 'bars' ? u > 0.4 : c.after('bars') && k !== 'shut';
    const barsR = k === 'bars' ? u > 0.78 : c.after('bars') && k !== 'shut';
    const capOn = k === 'cap' ? u > 0.7 : c.after('cap') && k !== 'shut';
    const head = c.bd(0, 0.985 * H, 0);
    const n: Record<string, number> = { door: k === 'open' ? sm(u, 0.2, 0.8) : k === 'shut' ? 1 - sm(u, 0.2, 0.85) : 1, coat: k === 'jacket' ? 1 - sm(u, 0.2, 0.5) : worn ? 0 : 1, packed: k === 'docs' ? Math.floor(u * 2.5) : c.after('docs') ? 2 : 0, lid: k === 'docs' ? 1 : k === 'zip' ? 1 - sm(u, 0.1, 0.9) : 0, capGone: k === 'cap' ? (u > 0.1 ? 1 : 0) : capOn ? 1 : 0, lit: k === 'bars' || k === 'cap' ? 1 : 0 };
    const props: Record<string, V | null> = { jacket: worn ? c.bd(0, 0.68 * H, 0.0) : null, barL: barsL ? add(shL, 0, 0.02, 0.0) : null, barR: barsR ? add(shR, 0, 0.02, 0.0) : null, capOn: capOn ? head : null, bag: k === 'pull' || k === 'shut' ? c.bd(0.26, 0, -0.12) : null };
    switch (k) {
      case 'open':
        return { l: hL, r: add(CR.door, 0, 0, 0), lean: 0.2, nod: 0, gr: 0.85, palms: 0.1, props: { ...props, bag: null }, n };
      case 'jacket': {
        // Off its hanger, one shoulder and the other, tugged straight.
        const held = lerpV(CR.inside, c.bd(0, 0.7 * H, 0.2), sm(u, 0.15, 0.5));
        return { l: u < 0.55 ? add(held, 0.15, 0.08, 0) : add(shL, 0.04, -0.14, 0.13), r: u < 0.55 ? add(held, -0.15, 0.08, 0) : add(shR, -0.04, -0.14, 0.13), gl: 0.8, gr: 0.8, nod: 0.15, lean: 0.14 * (1 - sm(u, 0.5, 0.8)), palms: 0.3, props: { ...props, jacketH: u < 0.65 ? held : null, bag: null }, n };
      }
      case 'bars': {
        // In the mirror: each shoulder's 견장 slid on, four gold bars.
        const left = u < 0.45;
        const a = sm(frac(u * 2.2), 0.1, 0.8);
        const to = left ? shL : shR;
        const from = c.bd(left ? 0.05 : -0.05, 0.62 * H, 0.26);
        const pt = lerpV(from, add(to, 0, 0.03, 0.02), a);
        return { l: left ? hL : pt, r: left ? pt : hR, gl: 0.3, gr: 0.3, nod: left ? 0.15 : 0.15, lean: 0, palms: 0.3, props: { ...props, barHeld: pt, bag: null }, n };
      }
      case 'cap': {
        const p = lerpV(CR.cap, head, sm(u, 0.1, 0.72));
        return { l: add(p, 0.09, 0.01, 0), r: add(p, -0.09, 0.01, 0), gl: 0.7, gr: 0.7, nod: -0.05, lean: 0, palms: 0.1, props: { ...props, capH: u <= 0.7 ? p : null, bag: null }, n };
      }
      case 'docs': {
        // 면장, 신체검사 증명, the headset: each off the bench into the open flight bag.
        const i = Math.min(1, Math.floor(u * 2));
        const lap = frac(u * 2);
        const it = lerpV(CR.items[i], add(CR.bench, 0.05, 0.14, 0), sm(lap, 0.15, 0.7));
        return { l: add(CR.bench, 0.16, 0.2, 0.06), r: add(it, 0, 0.02, 0), gl: 0.3, gr: 0.8, nod: 0.55, lean: 0.34, crouch: 0.2, palms: 0.5, props: { ...props, itemA: i === 0 && lap < 0.8 ? it : null, itemB: i === 1 && lap < 0.8 ? it : null, bag: null }, n };
      }
      case 'zip':
        return { l: add(CR.bench, 0.16, 0.26, 0.06), r: add(CR.bench, 0.14 - 0.3 * sm(u, 0.1, 0.9), 0.3, 0.14), gl: 0.3, gr: 0.85, nod: 0.5, lean: 0.3, crouch: 0.15, palms: 0.5, props: { ...props, bag: null }, n };
      case 'pull': {
        const b = lerpV(CR.bench, c.bd(0.26, 0, -0.12), sm(u, 0.1, 0.7));
        return { l: add(b, 0, 0.42, 0), r: hR, gl: 0.9, gr: 0.3, nod: 0.25, lean: 0.14, props: { ...props, bag: b }, n };
      }
      default:
        return { l: add(c.bd(0.26, 0, -0.12), 0, 0.42, 0), r: add(CR.door, 0, 0, 0), gl: 0.9, gr: 0.85, lean: 0.14, nod: 0, palms: 0.1, props, n };
    }
  },
};

// =============================================================================================
// 건강·피로 점검대 (plFitKiosk, 2 × 1): a pillar with the touch screen, the breath tester on its cradle, a
// cuff at the side; ID in, blown into, the arm in the cuff, three questions, the green slip.

export const KS = {
  reader: [-0.42, 1.05, -0.02] as V,
  wand: [0.0, 1.08, -0.05] as V,
  cuff: [0.54, 0.98, -0.02] as V,
  screen: [-0.28, 1.38, -0.2] as V,
  slip: [-0.04, 0.9, 0.05] as V,
};
const KS_AT = st(-0.14, 0, 0.56, Math.PI);
const KS_C = st(0.3, 0, 0.6, Math.PI);
const FIT: Script = {
  seq: [['id', 1.6], ['blow', 3.0, 0.5], ['cuff', 3.4, 0.5], ['ask', 3.0], ['slip', 2.2]],
  at(k) {
    return k === 'cuff' ? KS_C : KS_AT;
  },
  key(k, u, c) {
    const H = c.H;
    const hL = c.bd(0.22, 0.56 * H, 0.08);
    const hR = c.bd(-0.22, 0.56 * H, 0.08);
    const n: Record<string, number> = { scr: k === 'id' ? 0 : k === 'blow' ? 1 : k === 'cuff' ? 2 : k === 'ask' ? 3 + Math.min(2, Math.floor(u * 3)) : 6, read: k === 'blow' ? sm(u, 0.25, 0.8) : 0, squeeze: k === 'cuff' ? Math.sin(Math.PI * sm(u, 0.1, 0.9)) : 0, slip: k === 'slip' ? sm(u, 0, 0.55) : 0, led: k === 'blow' && u > 0.8 ? 1 : k === 'slip' ? 1 : 0 };
    const mouth = atMouth(c);
    switch (k) {
      case 'id': {
        const card = lerpV(c.bd(-0.1, 0.62 * H, 0.26), add(KS.reader, 0, 0, 0.03), sm(u, 0.2, 0.7));
        return { l: hL, r: add(card, 0, -0.015, 0.01), gl: 0.3, gr: 0.75, nod: 0.08, lean: 0.14, palms: 0.5, props: { card }, n };
      }
      case 'blow': {
        const w = u < 0.22 ? lerpV(KS.wand, mouth, sm(u, 0.02, 0.22)) : u < 0.78 ? mouth : lerpV(mouth, KS.wand, sm(u, 0.78, 0.98));
        return { l: hL, r: add(w, 0, -0.04, 0), gl: 0.3, gr: 0.9, nod: u < 0.78 ? 0.02 : 0.12, lean: 0.05, palms: 0.3, props: { wand: w }, n };
      }
      case 'cuff': {
        // The arm in the cuff, still; the cuff tightens and lets go; a look at the figures.
        return { l: add(KS.cuff, 0, 0.0, 0.0), r: hR, gl: 0.3, gr: 0.3, nod: 0.3 - 0.35 * sm(u, 0.7, 1), lean: 0.15, palms: 0.1, n };
      }
      case 'ask': {
        const i = Math.min(2, Math.floor(u * 3));
        return { l: hL, r: tapAt(add(KS.screen, 0.08, 0.05 - i * 0.05, 0.04), c.t, 1.2), gl: 0.3, gr: 0.15, nod: 0.02, lean: 0.14, palms: 0, n };
      }
      default: {
        const s = u < 0.55 ? KS.slip : lerpV(KS.slip, c.bd(0.02, 0.66 * H, 0.26), sm(u, 0.55, 0.85));
        return { l: u > 0.7 ? add(s, 0.06, 0.005, 0.01) : hL, r: add(s, -0.04, 0.01, 0.02), gl: 0.6, gr: 0.75, nod: u > 0.8 ? 0.42 : 0.3, lean: 0.18 * (1 - sm(u, 0.6, 1)), palms: 0.6, props: { slip: s }, n };
      }
    }
  },
};

const SCRIPTS: Record<PlMotion, Script> = {
  plSimFly: SIMFLY,
  plSimFire: SIMFIRE,
  plSimLand: SIMLAND,
  plSimUpset: SIMUPSET,
  plBrief: BRIEF,
  plDebrief: DEBRIEF,
  plFile: FILE,
  plChecklist: CHECKLIST,
  plFuel: FUEL,
  plWalkRound: WALK,
  plFlow: FLOW,
  plWx: WXBRIEF,
  plSuit: SUIT,
  plFit: FIT,
};
