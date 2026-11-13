import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A night at the 데이터센터 (2026-11-01, a new career at the user's request). Each motion is a round of beats: where the dweller is,
 * where the hands go, and what moves. The piece reads the same script by the same clock (dataCenter.ts), so the amber lamp that
 * goes green is on the very disk just pushed in, and the wall of graphs in the control room follows what's being done (DC_LIVE).
 *
 * - 서버 랙 줄 (dcServerRack): dcPatrol down the aisle with a tablet, a hand in the cold air. dcRackServer a server off its trolley,
 *   onto the rails, screwed in, powered up.
 * - 디스크 랙 (dcDiskRack): dcSwapDisk the amber lamp found, its latch, the old caddy to the basket, the new one in, the rebuild.
 * - 패치 프레임 (dcPatchFrame): dcPatch a cable off its hook into two ports, the link lit, a label printed and stuck. dcTidy a loose
 *   bundle pulled straight and strapped at three heights.
 * - 이중 바닥 (dcFloorTile): dcLift a tile raised on the suction lifter, laid aside, a torch under the floor, the leak sensor, put back.
 * - 크래시 카트 (dcCrashCart): dcCart its lid up, plugged in, typed at, a server that comes back.
 * - 항온항습기 (dcCrac): dcFilter the door, the old filter out, a clean one in. dcCracSet the set point brought down and the air watched.
 * - 냉각기 (dcChiller): dcChillerCheck gauges read, a pipe felt. dcCoolAlarm the beacon, the wheel, the standby pump, the temperature falling.
 * - 무정전 전원 (dcUps): dcUpsTest over to battery and back. dcDrill a key turned and the generator taking the load.
 * - 축전지 선반 (dcBatteryRack): dcBatt a probe jar by jar, the last one low.
 * - 관제 데스크 (dcNocDesk): dcWatch, dcTicket seated; dcLearn with a senior beside.
 * - 관제 벽 (dcNocWall): dcHandover to the morning shift; dcLeadReview chairing it, a laser on the graph.
 * - 출입 통제문 (dcBadgeDoor): dcBadge a card on the reader, through the door and back.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type DcMotion = 'dcPatrol' | 'dcRackServer' | 'dcSwapDisk' | 'dcPatch' | 'dcTidy' | 'dcLift' | 'dcCart' | 'dcFilter' | 'dcCracSet' | 'dcChillerCheck' | 'dcCoolAlarm' | 'dcUpsTest' | 'dcDrill' | 'dcBatt' | 'dcWatch' | 'dcTicket' | 'dcLearn' | 'dcHandover' | 'dcLeadReview' | 'dcBadge';
export const DC_MOTIONS = new Set<string>(['dcPatrol', 'dcRackServer', 'dcSwapDisk', 'dcPatch', 'dcTidy', 'dcLift', 'dcCart', 'dcFilter', 'dcCracSet', 'dcChillerCheck', 'dcCoolAlarm', 'dcUpsTest', 'dcDrill', 'dcBatt', 'dcWatch', 'dcTicket', 'dcLearn', 'dcHandover', 'dcLeadReview', 'dcBadge']);
export type DcTool = 'tablet' | 'driver' | 'oldDisk' | 'newDisk' | 'plugA' | 'plugB' | 'labeller' | 'lifter' | 'torch' | 'probe' | 'phone' | 'laser' | 'badge';

/** What the hall is doing now, for the control room's wall: set by whichever piece is at work, read by the wall. */
export const DC_LIVE = { temp: 21.5, tempAt: -1e9, alarmAt: -1e9, rebuild: -1, rebuildAt: -1e9, link: 0, linkAt: -1e9, load: 0.62, loadAt: -1e9, mode: 0, modeAt: -1e9 };

export const frac = (x: number) => ((x % 1) + 1) % 1;
export const dcPhase = (p: THREE.Vector3) => frac(p.x * 0.283 + p.z * 0.619);
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
  tool?: DcTool;
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
export interface DcNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: DcTool | null;
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
export function dcNow(m: DcMotion, t: number, ph: number, H = 1.6): DcNow {
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
export function dcPose(m: DcMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = dcNow(m, t, dcPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
const leftEasy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.08), gl: 0.3 });
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
const press = (p: V, u: number, a = 0.3, b = 0.5): Pick<Key, 'r' | 'gr' | 'palms'> => ({ r: add(p, 0, 0, 0.05 - 0.03 * sm(u, a, b)), gr: 0.15, palms: 0.05 });
/** A tablet held in the left arm; the right free to tap on it. */
const tabletAt = (c: Ctx): V => c.bd(0.14, 0.66 * c.H, 0.28);
const tapTablet = (tab: V, c: Ctx): V => add(tab, 0.08 + 0.018 * Math.sin(c.t * 13), 0.05, 0.03);

// =============================================================================================
// 서버 랙 줄 (dcServerRack, 3 × 1): three tall cabinets; the top slot of the right-hand one's left empty for a new server.

export const RK = {
  face: 0.425,
  stand: 0.86,
  cabs: [-0.97, 0, 0.97],
  slot: [0.97, 1.3, 0.14] as V,
  trolley: [-0.66, 0.66, 0.98] as V,
};
const PATROL: Script = {
  seq: [['a', 2.4, 1.1], ['b', 2.6, 1.1], ['air', 2.2], ['tick', 1.6, 1.6]],
  at: (k) => (k === 'a' ? st(-1.0, RK.stand) : k === 'b' ? st(0, RK.stand) : st(0.95, RK.stand)),
  key(k, u, c) {
    const tablet = tabletAt(c);
    const n = { checked: c.p('air', 0.5, 0.7), note: c.p('tick', 0.2, 0.8) };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'a':
        return { ...base, r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3, nod: -0.12 + 0.2 * Math.sin(u * PI) };
      case 'b':
        // Stooped to the lower servers, reading their lamps.
        return { ...base, r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3, nod: 0.34, lean: 0.14 };
      case 'air':
        // A palm in the cold air coming through the front.
        return { ...base, r: [c.st.x + 0.04 + 0.05 * Math.sin(c.t * 2), 1.05, RK.face + 0.1], gr: 0.05, palms: 1.0, nod: 0.12 };
      default:
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.3 };
    }
  },
};
const RACKSRV: Script = {
  seq: [['come', 0.5, 0.6], ['lift', 1.5], ['carry', 0.2, 1.3], ['slide', 2.0], ['screw1', 2.2, 0.4], ['screw2', 2.2], ['power', 1.5], ['ok', 1.8, 1.2]],
  at: (k) => (k === 'come' || k === 'lift' ? st(-0.12, 0.98, -PI / 2) : st(RK.slot[0], RK.stand)),
  key(k, u, c) {
    const trolley = RK.trolley;
    const carried: V = c.bd(0, 1.06, 0.36);
    const inFront: V = [RK.slot[0], RK.slot[1], 0.76];
    const srv: V = k === 'come' ? trolley : k === 'lift' ? lerpV(trolley, carried, sm(u, 0.35, 1)) : k === 'carry' ? inFront : k === 'slide' ? lerpV(inFront, RK.slot, sm(u, 0.1, 0.9)) : RK.slot;
    const screw = (sx: number): V => [RK.slot[0] + sx * 0.24, RK.slot[1], RK.face + 0.13];
    const driver: V = k === 'screw1' ? screw(-1) : k === 'screw2' ? screw(1) : [RK.cabs[2] - 0.32, 0.72, 0.98];
    const n = { spin: k === 'screw1' || k === 'screw2' ? c.t * 11 : 0, on: c.p('power', 0.35, 0.5), trolley: 1 };
    const props = { srv, driver };
    switch (k) {
      case 'come':
        return { ...easy(c), nod: 0.2, n, props };
      case 'lift':
        // Facing the trolley (-x): the hands on the server's near and far sides.
        return { r: add(srv, 0, 0.02, -0.26), l: add(srv, 0, 0.02, 0.26), gr: 0.75, gl: 0.75, crouch: 0.3 * (1 - sm(u, 0.35, 1)), nod: 0.3, lean: 0.1, n, props };
      case 'carry':
        return { ...both(srv, 0.24, 0, 0.26), nod: 0.1, n, props };
      case 'slide': {
        const hand: V = [srv[0], srv[1], Math.max(srv[2] + 0.28, RK.face + 0.05)];
        return { ...both(hand, 0.25, 0, 0), nod: 0.04, lean: 0.08, n, props };
      }
      case 'screw1':
      case 'screw2':
        return { l: add(screw(k === 'screw1' ? 1 : -1), 0, 0, 0.02), gl: 0.2, palms: 0.1, nod: 0.05, lean: 0.06, tool: 'driver', n, props };
      case 'power':
        return { ...press([RK.slot[0] + 0.14, RK.slot[1], RK.face + 0.06], u), ...leftEasy(c), nod: 0.04, n, props };
      default:
        return { ...easy(c), nod: -0.04 + 0.12 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 디스크 랙 (dcDiskRack, 3 × 1): bays of disks, one lit amber; a basket hung on the left-hand door with the spares.

export const DK = {
  stand: 0.84,
  /** The handle of the failed disk, with it home in its bay. */
  bay: [0.34, 1.26, RK.face + 0.035] as V,
  out: 0.22,
  /** Where the old one's left, and where the new one's taken from. */
  drop: [-0.92, 0.98, 0.62] as V,
  spare: [-0.66, 0.98, 0.62] as V,
};
const SWAP: Script = {
  seq: [['find', 2.0, 1.2], ['see', 1.4], ['latch', 1.1], ['pull', 1.5], ['toBasket', 0.1, 0.8], ['drop', 1.1], ['take', 1.2], ['toBay', 0.1, 0.8], ['push', 1.5], ['shut', 0.9], ['wait', 3.4], ['ok', 1.2, 1.2]],
  at: (k) => (k === 'find' ? st(-1.05, DK.stand) : k === 'toBasket' || k === 'drop' || k === 'take' ? st(-0.68, DK.stand) : st(DK.bay[0] - 0.02, DK.stand)),
  key(k, u, c) {
    const carry: V = c.bd(-0.16, 0.62 * c.H, 0.34);
    const pulled: V = add(DK.bay, 0, 0, DK.out);
    const oldDisk: V = k === 'pull' ? lerpV(DK.bay, pulled, sm(u, 0.05, 0.9)) : k === 'toBasket' ? carry : k === 'drop' ? lerpV(carry, DK.drop, sm(u, 0.1, 0.9)) : k === 'take' || k === 'toBay' || k === 'push' || k === 'shut' || k === 'wait' || k === 'ok' ? DK.drop : DK.bay;
    const newDisk: V = k === 'take' ? lerpV(DK.spare, carry, sm(u, 0.25, 1)) : k === 'toBay' ? carry : k === 'push' ? lerpV(pulled, DK.bay, sm(u, 0.1, 0.9)) : k === 'shut' || k === 'wait' || k === 'ok' ? DK.bay : DK.spare;
    const n = {
      amber: k === 'push' || k === 'shut' || k === 'wait' || k === 'ok' ? 0 : 1,
      latch: k === 'latch' ? sm(u, 0.3, 0.8) : k === 'pull' ? 1 : k === 'shut' ? 1 - sm(u, 0.2, 0.7) : k === 'push' ? 1 : 0,
      rebuild: k === 'wait' ? u : k === 'ok' ? 1 : -1,
      green: k === 'ok' ? 1 : 0,
      working: k === 'wait' ? 1 : 0,
    };
    const props = { oldDisk, newDisk };
    switch (k) {
      case 'find':
        return { ...easy(c), nod: -0.05 + 0.18 * Math.sin(u * PI * 2), n, props };
      case 'see':
        return { ...leftEasy(c), r: add(DK.bay, -0.01, 0.02, 0.16), gr: 0.15, palms: 0.1, nod: 0.1, lean: 0.1, n, props };
      case 'latch':
        return { ...leftEasy(c), r: add(DK.bay, 0, 0, 0.02), gr: 0.5, nod: 0.12, lean: 0.08, n, props };
      case 'pull':
      case 'toBasket':
      case 'drop':
        return { ...leftEasy(c), nod: 0.14, lean: 0.05, tool: 'oldDisk', n, props };
      case 'take':
      case 'toBay':
      case 'push':
        return { ...leftEasy(c), nod: 0.14, lean: 0.05, tool: 'newDisk', n, props };
      case 'shut':
        return { ...leftEasy(c), r: add(DK.bay, 0, 0, 0.02), gr: 0.5, nod: 0.12, n, props };
      case 'wait':
        return { ...easy(c), nod: 0.06, n, props };
      default:
        return { ...easy(c), nod: 0.14 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 패치 프레임 (dcPatchFrame, 3 × 1): patch panels on the left, a cable manager on the right, the tray overhead.

export const PF = {
  stand: 0.76,
  face: 0.3,
  /** The two ports being joined (grip of a plug home in them). */
  a: [-0.92, 1.42, 0.36] as V,
  b: [-0.34, 1.14, 0.36] as V,
  hook: [0.92, 1.1, 0.36] as V,
  holster: [0.72, 1.14, 0.38] as V,
  bundleX: 0.42,
  ys: [1.72, 1.36, 1.0],
};
const PATCH: Script = {
  seq: [['read', 1.8], ['take', 1.2, 0.8], ['plugA', 1.8, 0.7], ['route', 1.2, 0.5], ['plugB', 1.8], ['test', 1.6], ['print', 2.0], ['stick', 1.6], ['back', 0.8, 0.9]],
  at: (k) => (k === 'read' || k === 'take' || k === 'back' ? st(0.56, PF.stand) : k === 'plugA' ? st(-0.78, PF.stand) : st(-0.34, PF.stand)),
  key(k, u, c) {
    const hand: V = c.bd(-0.18, 0.72 * c.H, 0.32);
    const plugA: V = k === 'take' ? lerpV(PF.hook, hand, sm(u, 0.35, 1)) : k === 'plugA' ? lerpV(add(PF.a, 0, 0, 0.16), PF.a, sm(u, 0.2, 0.8)) : k === 'read' ? PF.hook : PF.a;
    const plugB: V = k === 'read' || k === 'take' || k === 'plugA' ? add(PF.hook, 0.04, -0.03, 0) : k === 'route' ? lerpV(add(PF.a, 0.2, -0.3, 0.16), add(PF.b, 0, 0, 0.16), sm(u, 0.1, 1)) : k === 'plugB' ? lerpV(add(PF.b, 0, 0, 0.16), PF.b, sm(u, 0.2, 0.8)) : PF.b;
    const labeller: V = k === 'print' ? hand : k === 'stick' ? add(PF.b, 0.12, -0.16, 0.2) : PF.holster;
    const n = { linked: k === 'test' ? sm(u, 0.2, 0.3) : k === 'print' || k === 'stick' || k === 'back' ? 1 : 0, tape: k === 'print' ? sm(u, 0.2, 0.9) : k === 'stick' ? 1 - sm(u, 0.2, 0.6) : 0, tag: k === 'stick' ? sm(u, 0.5, 0.65) : k === 'back' ? 1 : 0, cable: k === 'read' ? 0 : 1 };
    const props = { plugA, plugB, labeller };
    switch (k) {
      case 'read':
        return { ...leftEasy(c), r: add(PF.hook, -0.22, 0.42, 0.04), gr: 0.15, palms: 0.1, nod: -0.05, n, props };
      case 'take':
      case 'plugA':
        return { ...leftEasy(c), nod: 0.04, lean: 0.06, tool: 'plugA', n, props };
      case 'route':
      case 'plugB':
        return { ...leftEasy(c), nod: 0.12, lean: 0.06, tool: 'plugB', n, props };
      case 'test':
        return { ...leftEasy(c), r: add(PF.b, 0.03, 0.03, 0.14), gr: 0.15, palms: 0.1, nod: 0.1, n, props };
      case 'print':
        return { ...leftEasy(c), nod: 0.3, tool: 'labeller', n, props };
      case 'stick':
        // The left thumb presses the strip round the cable by the port.
        return { l: add(PF.b, 0.0, -0.09, 0.09), gl: 0.5, nod: 0.16, lean: 0.06, tool: 'labeller', n, props };
      default:
        return { ...easy(c), nod: 0.04, n, props };
    }
  },
};
const TIDY: Script = {
  seq: [['look', 1.4], ['pull', 2.4], ['strap0', 2.0], ['strap1', 2.0], ['strap2', 2.0], ['step', 1.2]],
  at: () => st(PF.bundleX, PF.stand),
  key(k, u, c) {
    const tidy = k === 'look' ? 0 : k === 'pull' ? sm(u, 0.1, 0.9) * 0.4 : k === 'strap0' ? 0.4 + 0.2 * u : k === 'strap1' ? 0.6 + 0.2 * u : k === 'strap2' ? 0.8 + 0.2 * u : 1;
    const n = { tidy, straps: c.p('strap0', 0.5, 0.8) + c.p('strap1', 0.5, 0.8) + c.p('strap2', 0.5, 0.8) };
    const hands = (i: number, g = 0.75): Key => {
      const wrap = 0.02 * Math.sin(c.t * 9);
      return { r: [PF.bundleX + 0.05 + wrap, PF.ys[i], PF.face + 0.06], l: [PF.bundleX - 0.05 - wrap, PF.ys[i] + 0.01, PF.face + 0.06], gr: g, gl: g };
    };
    switch (k) {
      case 'look':
        return { ...easy(c), nod: -0.1, n };
      case 'pull':
        return { ...both([PF.bundleX, 1.4 + 0.2 * Math.sin(u * PI * 3), PF.face + 0.1], 0.06, 0, 0.02, 0.9), nod: 0.02, lean: 0.03, n };
      case 'strap0':
        return { ...hands(0), nod: -0.2, n };
      case 'strap1':
        return { ...hands(1), nod: 0, n };
      case 'strap2':
        return { ...hands(2), nod: 0.26, lean: 0.06, n };
      default:
        return { ...easy(c), nod: 0.04, n };
    }
  },
};

// =============================================================================================
// 이중 바닥 (dcFloorTile, 2 × 2): a raised floor with one tile that comes up; pipes, cables and a leak sensor under it.

export const FT = {
  stand: 1.02,
  tile: [0, 0.07, 0.34] as V,
  rest: [-0.68, 0.07, 0.42] as V,
  /** The lifter's handle over the tile it's holding. */
  over: 0.17,
  holster: [0.72, 0.17, 0.62] as V,
  sensor: [0.14, 0.03, 0.42] as V,
  torchHome: [0.56, 0.14, 0.72] as V,
};
const LIFT: Script = {
  seq: [['take', 1.0], ['press', 1.2], ['up', 1.4], ['carry', 0.1, 0.9], ['lay', 1.2], ['off', 0.6], ['back', 0.1, 0.9], ['torch', 3.6], ['sensor', 2.0], ['stow', 0.8], ['fetch', 0.1, 0.9], ['grab', 1.0], ['up2', 1.2], ['home', 0.1, 0.9], ['down', 1.4], ['stowL', 0.9]],
  at: (k) => (k === 'carry' || k === 'lay' || k === 'off' || k === 'fetch' || k === 'grab' || k === 'up2' ? st(-0.38, 0.98, PI - 0.3) : st(0, FT.stand)),
  key(k, u, c) {
    const atHome: V = add(FT.tile, 0, FT.over, 0);
    const atRest: V = add(FT.rest, 0, FT.over, 0);
    const held: V = c.bd(0, 0.5 * c.H, 0.34);
    const lifter: V = k === 'take' ? lerpV(FT.holster, atHome, sm(u, 0.1, 0.9)) : k === 'press' ? atHome : k === 'up' ? lerpV(atHome, held, sm(u, 0.05, 0.9)) : k === 'carry' ? held : k === 'lay' ? lerpV(held, atRest, sm(u, 0.05, 0.9)) : k === 'off' ? atRest : k === 'grab' ? atRest : k === 'up2' ? lerpV(atRest, held, sm(u, 0.05, 0.9)) : k === 'home' ? held : k === 'down' ? lerpV(held, atHome, sm(u, 0.05, 0.9)) : k === 'stowL' ? lerpV(atHome, FT.holster, sm(u, 0.1, 0.9)) : k === 'fetch' ? atRest : atRest;
    const onCups = k === 'up' || k === 'carry' || k === 'lay' || k === 'up2' || k === 'home' || k === 'down';
    const tile: V = onCups ? add(lifter, 0, -FT.over, 0) : k === 'take' || k === 'press' || k === 'stowL' ? FT.tile : FT.rest;
    const torch: V = k === 'torch' ? [0.1 + 0.1 * Math.sin(c.t * 1.3), 0.42, 0.78] : k === 'sensor' ? [0.26, 0.42, 0.78] : FT.torchHome;
    const n = { beam: k === 'torch' || k === 'sensor' ? 1 : 0, sensor: k === 'sensor' ? sm(u, 0.3, 0.5) : k === 'stow' ? 1 : 0, cup: k === 'press' ? sm(u, 0.3, 0.7) : onCups ? 1 : k === 'grab' ? sm(u, 0.4, 0.8) : k === 'off' ? 1 - u : 0, open: k === 'take' || k === 'press' || k === 'stowL' ? 0 : 1 };
    const props = { lifter, tile, torch };
    const crouched = (v: number) => ({ crouch: v, nod: 0.4, lean: 0.12 });
    switch (k) {
      case 'take':
        return { ...crouched(sm(u, 0.1, 0.7) * 0.75), tool: 'lifter', n, props };
      case 'press':
      case 'grab':
        return { ...crouched(0.75), tool: 'lifter', n, props };
      case 'up':
      case 'up2':
        return { crouch: 0.75 * (1 - sm(u, 0.05, 0.9)), nod: 0.2, lean: 0.06, tool: 'lifter', n, props };
      case 'carry':
      case 'home':
        return { nod: 0.2, lean: 0.03, tool: 'lifter', n, props };
      case 'lay':
        return { crouch: 0.75 * sm(u, 0.05, 0.9), nod: 0.36, lean: 0.1, tool: 'lifter', n, props };
      case 'down':
        return { crouch: 0.75 * sm(u, 0.05, 0.9), nod: 0.4, lean: 0.12, tool: 'lifter', n, props };
      case 'off':
        return { crouch: 0.75, nod: 0.36, lean: 0.1, tool: 'lifter', n, props };
      case 'stowL':
        return { crouch: 0.75 * (1 - sm(u, 0.3, 1)), nod: 0.3, lean: 0.06, tool: 'lifter', n, props };
      case 'torch':
        // Down on the haunches, a torch into the void and the other hand on the frame.
        return { crouch: 0.95, nod: 0.5, lean: 0.24, l: [-0.14, 0.09, 0.66], gl: 0.5, tool: 'torch', n, props };
      case 'sensor':
        return { crouch: 0.95, nod: 0.5, lean: 0.28, l: add(FT.sensor, -0.02, 0.05, 0.03), gl: 0.15, palms: 0.05, tool: 'torch', n, props };
      case 'stow':
        return { crouch: 0.7, nod: 0.3, ...easy(c), n, props };
      default:
        return { ...easy(c), nod: 0.1, n, props };
    }
  },
};

// =============================================================================================
// 크래시 카트 (dcCrashCart, 1 × 1): a screen and keyboard on wheels, its lid hinged up.

export const CC = { stand: 0.78, keys: [0, 0.92, 0.12] as V, lidY: 0.94, port: [0.36, 0.86, 0.08] as V };
const CART: Script = {
  seq: [['open', 1.3], ['plug', 1.6], ['type', 3.2], ['boot', 3.6], ['read', 1.8], ['ok', 1.2], ['close', 1.2]],
  at: () => st(0, CC.stand),
  key(k, u, c) {
    const n = { lid: k === 'open' ? sm(u, 0.2, 0.9) : k === 'close' ? 1 - sm(u, 0.1, 0.9) : 1, plug: c.p('plug', 0.5, 0.7) * (k === 'close' ? 0 : 1), log: c.p('type', 0, 1), boot: k === 'boot' ? u : k === 'read' || k === 'ok' ? 1 : 0, fine: k === 'ok' || (k === 'read' && u > 0.3) ? 1 : 0, on: k === 'open' ? sm(u, 0.5, 1) : k === 'close' ? 1 - u : 1 };
    switch (k) {
      case 'open':
      case 'close':
        return { ...leftEasy(c), r: [0.06, CC.lidY + 0.32 * n.lid, 0.3 - 0.32 * n.lid], gr: 0.5, nod: 0.12, n };
      case 'plug':
        return { ...leftEasy(c), r: add(CC.port, 0, 0.02, 0.03), gr: 0.6, nod: 0.2, lean: 0.06, n };
      case 'type':
        return { ...typing(CC.keys, c.t), nod: 0.24, lean: 0.08, n };
      case 'boot':
      case 'read':
        return { r: add(CC.keys, 0.09, 0.03, 0), l: add(CC.keys, -0.09, 0.03, 0), gr: 0.25, gl: 0.25, palms: 0.05, nod: 0.1, lean: 0.08, n };
      default:
        return { ...easy(c), nod: 0.05, n };
    }
  },
};

// =============================================================================================
// 항온항습기 (dcCrac, 2 × 1): a cooling cabinet, a door on its left over the filters, a panel on its right.

export const CR = {
  stand: 0.92,
  filter: [-0.42, 1.12, 0.14] as V,
  doorHinge: -0.96,
  face: 0.42,
  panel: [0.56, 1.42, 0.44] as V,
  upBtn: [0.74, 1.2, 0.44] as V,
  oldRest: [-0.88, 0.32, 0.74] as V,
  newRest: [0.0, 0.32, 0.74] as V,
};
const FILTER: Script = {
  seq: [['open', 1.4], ['oldOut', 1.7], ['setOld', 1.2], ['takeNew', 1.2], ['newIn', 1.7], ['shut', 1.2], ['walk', 0.1, 0.9], ['press', 1.4], ['ok', 1.0, 0.9]],
  at: (k) => (k === 'walk' || k === 'press' || k === 'ok' ? st(CR.panel[0], CR.stand - 0.1) : st(CR.filter[0], CR.stand)),
  key(k, u, c) {
    const front: V = add(CR.filter, 0, -0.02, 0.44);
    const oldF: V = k === 'oldOut' ? lerpV(CR.filter, front, sm(u, 0.1, 0.9)) : k === 'setOld' ? lerpV(front, CR.oldRest, sm(u, 0.1, 0.9)) : k === 'open' ? CR.filter : CR.oldRest;
    const newF: V = k === 'takeNew' ? lerpV(CR.newRest, front, sm(u, 0.1, 0.9)) : k === 'newIn' ? lerpV(front, CR.filter, sm(u, 0.1, 0.9)) : k === 'shut' || k === 'walk' || k === 'press' || k === 'ok' ? CR.filter : CR.newRest;
    const n = { door: k === 'open' ? sm(u, 0.2, 0.9) : k === 'shut' ? 1 - sm(u, 0.1, 0.9) : k === 'walk' || k === 'press' || k === 'ok' ? 0 : 1, flow: k === 'press' ? sm(u, 0.4, 0.9) : k === 'ok' ? 1 : 0.3, filter: 1, ok: k === 'ok' ? 1 : 0 };
    const props = { oldF, newF };
    const onIt = (p: V, g = 0.8) => both(p, 0.31, 0, 0.03, g);
    switch (k) {
      case 'open':
        return { ...leftEasy(c), r: [CR.doorHinge + 1.0 * Math.cos(n.door * 1.5), 1.0, CR.face + 0.05 + 1.0 * Math.sin(n.door * 1.5)], gr: 0.75, nod: 0.05, n, props };
      case 'oldOut':
        return { ...onIt(oldF), nod: 0.12, lean: 0.06, n, props };
      case 'setOld':
        return { ...onIt(oldF), crouch: 0.6 * sm(u, 0.2, 0.9), nod: 0.3, n, props };
      case 'takeNew':
        return { ...onIt(newF), crouch: 0.6 * (1 - sm(u, 0.1, 0.8)), nod: 0.3, n, props };
      case 'newIn':
        return { ...onIt(newF), nod: 0.12, lean: 0.06, n, props };
      case 'shut':
        return { ...leftEasy(c), r: [CR.doorHinge + 1.0 * Math.cos(n.door * 1.5), 1.0, CR.face + 0.05 + 1.0 * Math.sin(n.door * 1.5)], gr: 0.75, nod: 0.05, n, props };
      case 'press':
        return { ...leftEasy(c), ...press(CR.upBtn, u), nod: 0.1, n, props };
      default:
        return { ...easy(c), nod: 0.05, n, props };
    }
  },
};
const CRACSET: Script = {
  seq: [['read', 1.6], ['down', 2.4], ['watch', 4.0], ['ok', 1.4]],
  at: () => st(CR.panel[0], CR.stand - 0.1),
  key(k, u, c) {
    const set = k === 'read' ? 24 : k === 'down' ? 24 - Math.floor(u * 3) : 21;
    const air = k === 'read' || k === 'down' ? 24.5 : k === 'watch' ? 24.5 - 3 * sm(u, 0.05, 0.95) : 21.5;
    const n = { set, air, flow: k === 'read' ? 0.3 : k === 'down' ? 0.3 + 0.5 * u : 0.9, ok: k === 'ok' ? 1 : 0 };
    switch (k) {
      case 'read':
        return { ...leftEasy(c), r: add(CR.panel, 0.05, -0.1, 0.1), gr: 0.15, palms: 0.1, nod: -0.05, n };
      case 'down':
        return { ...leftEasy(c), r: add(CR.upBtn, 0, -0.04, 0.05 - 0.02 * Math.max(0, Math.sin(u * PI * 6))), gr: 0.15, palms: 0.05, nod: 0.05, n };
      case 'watch':
        return { ...leftEasy(c), r: [CR.panel[0] - 0.42, 0.42 * (c.H / 1.6) + 0.5, CR.face + 0.12], gr: 0.05, palms: 1.0, nod: 0.3, lean: 0.06, n };
      default:
        return { ...easy(c), nod: 0.05, n };
    }
  },
};

// =============================================================================================
// 냉각기 (dcChiller, 3 × 1): low, so it hides nobody: pipes, a wheel valve on the left, gauges in the middle, the panel on the right.

export const CH = { stand: 0.84, face: 0.34, wheel: [-0.95, 0.98, 0.4] as V, wheelR: 0.13, gauges: [0.05, 1.12, 0.36] as V, pipe: [-0.3, 0.9, 0.38] as V, panel: [0.92, 1.14, 0.38] as V, start: [0.72, 0.94, 0.38] as V };
const CHECK: Script = {
  seq: [['g1', 2.0], ['tick1', 1.1], ['pipe', 2.2, 0.9], ['g2', 2.0, 1.0], ['tick2', 1.1, 1.2]],
  at: (k) => (k === 'pipe' ? st(CH.pipe[0], CH.stand) : k === 'g2' || k === 'tick2' ? st(CH.panel[0], CH.stand) : st(CH.gauges[0], CH.stand)),
  key(k, _u, c) {
    const tablet = tabletAt(c);
    const n = { ticks: c.p('tick1', 0.3, 0.6) + c.p('tick2', 0.3, 0.6) };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'g1':
        return { ...base, r: add(CH.gauges, 0.03, -0.05, 0.1), gr: 0.15, palms: 0.1, nod: 0.18 };
      case 'g2':
        return { ...base, r: add(CH.panel, -0.02, -0.08, 0.1), gr: 0.15, palms: 0.1, nod: 0.18 };
      case 'pipe':
        // The back of the hand to the pipe: is it as cold as the gauge says?
        return { ...base, r: add(CH.pipe, 0.03 * Math.sin(c.t * 1.4), 0, 0.03), gr: 0.1, palms: 0.9, nod: 0.3, lean: 0.1 };
      default:
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.3 };
    }
  },
};
const ALARM: Script = {
  seq: [['see', 1.4, 0.9], ['ack', 1.4, 1.1], ['read', 1.2, 1.1], ['wheel', 5.0, 1.1], ['start', 1.6], ['fall', 6.0], ['ok', 1.4]],
  at: (k) => (k === 'see' ? st(0, CH.stand) : k === 'wheel' ? st(CH.wheel[0], CH.stand) : st(CH.panel[0] - 0.08, CH.stand)),
  key(k, u, c) {
    const turn = k === 'wheel' ? u * PI * 4 : c.p('wheel', 0, 1) * PI * 4;
    const temp = k === 'fall' ? 31 - 9 * sm(u, 0.05, 0.95) : k === 'ok' ? 22 : 29 + 2 * c.p('see', 0, 1) * (k === 'see' ? u : 1);
    const n = { alarm: k === 'ok' ? 0 : 1, silent: c.p('ack', 0.3, 0.5), turn, standby: c.p('start', 0.3, 0.5), temp, flow: c.p('wheel', 0, 1), ok: k === 'ok' ? 1 : 0 };
    switch (k) {
      case 'see':
        return { ...easy(c), nod: -0.2, lean: 0.02, n };
      case 'ack':
        return { ...leftEasy(c), ...press(add(CH.panel, -0.16, -0.16, 0), u), nod: 0.2, n };
      case 'read':
        return { ...leftEasy(c), r: add(CH.panel, 0.02, -0.08, 0.1), gr: 0.15, palms: 0.1, nod: 0.22, n };
      case 'wheel': {
        // Hand over hand round the rim: the wheel opens the bypass.
        const R = CH.wheelR;
        return { r: add(CH.wheel, R * Math.cos(turn), R * Math.sin(turn), 0.03), l: add(CH.wheel, -R * Math.cos(turn), -R * Math.sin(turn), 0.03), gr: 0.85, gl: 0.85, nod: 0.3, lean: 0.14, n };
      }
      case 'start':
        return { ...leftEasy(c), ...press(CH.start, u), nod: 0.26, lean: 0.08, n };
      case 'fall':
        return { ...leftEasy(c), r: add(CH.panel, 0.02, -0.08, 0.1), gr: 0.15, palms: 0.1, nod: 0.2, n };
      default:
        return { ...easy(c), nod: 0.14 * Math.sin(u * PI), n };
    }
  },
};

// =============================================================================================
// 무정전 전원 (dcUps, 3 × 1): three cabinets, its screen, a test button and a key switch.

export const UP = { stand: 0.84, face: 0.36, screen: [0, 1.46, 0.38] as V, btn: [0.34, 1.12, 0.38] as V, key: [-0.34, 1.12, 0.38] as V };
const UPSTEST: Script = {
  seq: [['read', 1.8], ['press', 1.3], ['batt', 4.2], ['tick', 1.4], ['back', 1.3], ['read2', 1.8]],
  at: () => st(0.1, UP.stand),
  key(k, u, c) {
    const tablet = tabletAt(c);
    const n = { mode: k === 'press' ? sm(u, 0.3, 0.4) : k === 'batt' || k === 'tick' ? 1 : k === 'back' ? 1 - sm(u, 0.3, 0.4) : 0, charge: k === 'batt' ? 1 - 0.06 * u : k === 'tick' || k === 'back' ? 0.94 : k === 'read2' ? 0.94 + 0.02 * u : 1, ticks: c.p('tick', 0.3, 0.6), load: 0.62 + 0.03 * Math.sin(c.t * 0.7) };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'read':
      case 'read2':
        return { ...base, r: add(UP.screen, 0.02, -0.14, 0.1), gr: 0.15, palms: 0.1, nod: -0.06 };
      case 'press':
      case 'back':
        return { ...base, ...press(UP.btn, u), nod: 0.12 };
      case 'tick':
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.3 };
      default:
        return { ...base, r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3, nod: -0.04 };
    }
  },
};
const DRILL: Script = {
  seq: [['brief', 1.6], ['key', 1.8], ['cut', 1.2], ['gen', 4.4], ['load', 2.2], ['back', 1.6], ['ok', 1.4]],
  at: () => st(-0.06, UP.stand),
  key(k, u, c) {
    const n = { keyTurn: k === 'key' ? sm(u, 0.3, 0.7) : k === 'back' ? 1 - sm(u, 0.3, 0.7) : k === 'brief' || k === 'ok' ? 0 : 1, mode: k === 'cut' ? 1 : k === 'gen' ? (u < 0.4 ? 1 : 2) : k === 'load' ? 2 : 0, gen: k === 'gen' ? sm(u, 0.1, 0.5) : k === 'load' ? 1 : k === 'back' ? 1 - u : 0, charge: k === 'cut' ? 1 - 0.03 * u : k === 'gen' ? 0.97 : 1, load: 0.62 + (k === 'load' ? 0.1 * Math.sin(u * PI) : 0), ok: k === 'ok' ? 1 : 0 };
    switch (k) {
      case 'brief':
        return { ...leftEasy(c), r: add(UP.screen, 0.02, -0.14, 0.1), gr: 0.15, palms: 0.1, nod: -0.06, n };
      case 'key':
      case 'back':
        return { ...leftEasy(c), r: add(UP.key, 0, 0, 0.04), gr: 0.55, nod: 0.12, lean: 0.05, n };
      case 'cut':
        return { ...easy(c), nod: -0.2, n };
      case 'gen':
      case 'load':
        return { ...leftEasy(c), r: add(UP.screen, 0.02, -0.14, 0.1), gr: 0.15, palms: 0.1, nod: -0.04, n };
      default:
        return { ...easy(c), nod: 0.1 * Math.sin(u * PI), n };
    }
  },
};

// =============================================================================================
// 축전지 선반 (dcBatteryRack, 3 × 1): rows of jars, each terminal in reach; a meter on the left of the shelf.

export const BT = { stand: 0.8, jars: [-0.9, -0.3, 0.3, 0.9], y: 1.14, z: 0.3, home: [-1.22, 1.4, 0.3] as V, reach: 0.14, meter: [-1.22, 1.5, 0.3] as V, volts: [13.52, 13.49, 13.54, 12.91] };
const BATT: Script = {
  seq: [['take', 1.0, 0.8], ['j0', 2.2, 0.9], ['j1', 2.2, 0.9], ['j2', 2.2, 0.9], ['j3', 2.4], ['mark', 1.6], ['stow', 0.9, 1.2]],
  at: (k) => (k === 'take' || k === 'stow' ? st(-0.98, BT.stand) : k === 'j0' ? st(BT.jars[0], BT.stand) : k === 'j1' ? st(BT.jars[1], BT.stand) : k === 'j2' ? st(BT.jars[2], BT.stand) : st(BT.jars[3], BT.stand)),
  key(k, u, c) {
    const onJar = (i: number): V => [BT.jars[i] + 0.05, BT.y, BT.z + BT.reach];
    const i = k === 'j0' ? 0 : k === 'j1' ? 1 : k === 'j2' ? 2 : k === 'j3' || k === 'mark' ? 3 : -1;
    const probe: V = k === 'take' ? lerpV(BT.home, onJar(0), sm(u, 0.2, 1)) : k === 'stow' ? lerpV(onJar(3), BT.home, sm(u, 0, 0.9)) : i >= 0 ? add(onJar(i), 0, 0.006 * Math.sin(c.t * 5), 0) : BT.home;
    const n = { jar: i, read: (k === 'j0' || k === 'j1' || k === 'j2' || k === 'j3') && u > 0.2 ? 1 : k === 'mark' ? 1 : 0, warn: k === 'j3' ? sm(u, 0.4, 0.6) : k === 'mark' ? 1 : 0, tag: k === 'mark' ? sm(u, 0.4, 0.6) : k === 'stow' ? 1 : 0 };
    const props = { probe };
    if (k === 'mark') return { l: [BT.jars[3] - 0.08, BT.y - 0.14, BT.z + 0.06], gl: 0.5, nod: 0.2, tool: 'probe', n, props };
    return { ...leftEasy(c), nod: 0.2, lean: 0.06, tool: 'probe', n, props };
  },
};

// =============================================================================================
// 관제 데스크 (dcNocDesk, 3 × 1): low, three screens, a phone; seats face the wall of graphs beyond.

export const ND = { seat: [0, 0.47, 0.82] as V, seat2: [0.82, 0.47, 0.82] as V, top: 0.76, keys: [0, 0.79, 0.3] as V, mouse: [0.28, 0.79, 0.3] as V, phone: [-0.48, 0.82, 0.22] as V };
const sitHands = (): Key => ({ l: add(ND.keys, -0.1, 0.03, 0), r: add(ND.mouse, 0, 0.03, 0), gl: 0.25, gr: 0.45, palms: 0.05 });
const rolling = (c: Ctx): V => add(ND.mouse, 0.02 * Math.sin(c.t * 2.2), 0.03, 0.012 * Math.cos(c.t * 1.7));
const WATCH: Script = {
  seq: [['scan', 3.0], ['zoom', 2.8], ['lift', 0.7], ['call', 3.0], ['down', 0.7], ['note', 2.2]],
  at: () => sat(ND.seat),
  key(k, u, c) {
    const ear: V = c.bd(0.14, 0.72, 0.03);
    const phone: V = k === 'lift' ? lerpV(ND.phone, ear, sm(u, 0.1, 1)) : k === 'call' ? ear : k === 'down' ? lerpV(ear, ND.phone, sm(u, 0, 0.9)) : ND.phone;
    const n = { focus: k === 'zoom' ? 1 : 0, talk: k === 'call' ? 1 : 0, note: c.p('note', 0.1, 0.9) };
    const props = { phone };
    switch (k) {
      case 'scan':
        return { ...sitHands(), r: rolling(c), nod: -0.12 + 0.05 * Math.sin(c.t * 0.8), n, props };
      case 'zoom':
        return { ...sitHands(), r: rolling(c), nod: 0.04, lean: 0.1, n, props };
      case 'lift':
      case 'call':
      case 'down':
        return { r: add(ND.mouse, 0, 0.03, 0), gr: 0.45, palms: 0.05, nod: k === 'call' ? -0.06 : 0.04, tool: 'phone', n, props };
      default:
        return { ...typing(ND.keys, c.t), nod: 0.14, n, props };
    }
  },
};
const TICKET: Script = {
  seq: [['read', 2.2], ['type', 3.8], ['send', 1.2], ['next', 1.4]],
  at: () => sat(ND.seat),
  key(k, u, c) {
    const n = { typed: k === 'type' ? u : k === 'send' || k === 'next' ? 1 : 0, sent: k === 'send' ? sm(u, 0.4, 0.5) : k === 'next' ? 1 : 0 };
    switch (k) {
      case 'read':
        return { ...sitHands(), r: rolling(c), nod: 0.02, lean: 0.06, n };
      case 'type':
        return { ...typing(ND.keys, c.t), nod: 0.12, n };
      case 'send':
        return { ...sitHands(), tap: u > 0.3 && u < 0.5, nod: 0.08, n };
      default:
        return { ...sitHands(), nod: -0.1, n };
    }
  },
};
const LEARN: Script = {
  seq: [['watch', 2.6], ['point', 3.0], ['try', 3.2], ['ask', 2.0], ['praise', 1.6]],
  at: () => sat(ND.seat),
  key(k, u, c) {
    const n = { senior: 1, point: k === 'point' || k === 'ask' ? 1 : 0, typed: k === 'try' ? u : k === 'ask' || k === 'praise' ? 1 : 0, nods: k === 'praise' ? 1 : 0 };
    switch (k) {
      case 'try':
        return { ...typing(ND.keys, c.t), nod: 0.12, n };
      case 'ask':
        return { ...sitHands(), nod: 0.02, n };
      case 'praise':
        return { ...sitHands(), nod: 0.14 * Math.sin(u * PI), n };
      default:
        return { ...sitHands(), r: rolling(c), nod: -0.06, n };
    }
  },
};

// =============================================================================================
// 관제 벽 (dcNocWall, 5 × 1): the wall of graphs; colleagues beside it.

export const WL = { z: -0.36, y0: 0.72, y1: 2.32, x0: -2.4, x1: 2.4, stand: 0.84, trail: [1.6, 0.84, 0.9] as V };
/** A point on the wall: u across, v up. */
export const onWall = (u: number, v: number, z = WL.z + 0.01): V => [WL.x0 + (WL.x1 - WL.x0) * u, WL.y0 + (WL.y1 - WL.y0) * v, z];
const HANDOVER: Script = {
  seq: [['read', 2.6, 0.9], ['point', 2.6, 0.7], ['turn', 3.0, 0.7], ['sign', 1.6]],
  at: (k) => (k === 'read' ? st(0.1, WL.stand) : k === 'point' ? st(-0.6, WL.stand - 0.04) : st(-0.6, WL.stand + 0.06, -1.25)),
  key(k, u, c) {
    const tablet = tabletAt(c);
    const n = { says: k === 'turn' ? 1 : 0, nods: k === 'sign' ? 1 : 0, ptr: k === 'point' ? 0.3 + 0.08 * u : 0, signed: k === 'sign' ? sm(u, 0.3, 0.6) : 0, mate: 1 };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'read':
        return { ...base, r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3, nod: -0.2 };
      case 'point': {
        const q: V = onWall(0.3 + 0.08 * u, 0.56 + 0.04 * Math.sin(c.t), WL.z + 0.44);
        return { ...base, r: q, gr: 0.2, palms: 0.1, nod: -0.22 };
      }
      case 'turn':
        return { ...base, r: c.bd(-0.26, 0.72 * c.H + 0.04 * Math.sin(c.t * 3), 0.26), gr: 0.15, palms: 0.5, nod: 0 };
      default:
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.28 };
    }
  },
};
const LEAD: Script = {
  seq: [['open', 2.2, 0.8], ['take', 0.8], ['aim', 3.8], ['stow', 0.8, 0.8], ['ask', 2.6], ['decide', 2.4], ['close', 1.2, 0.8]],
  at: (k) => (k === 'open' || k === 'ask' || k === 'decide' || k === 'close' ? st(0, WL.stand + 0.06, 0) : st(0, WL.stand)),
  key(k, u, c) {
    const pocket: V = c.bd(-0.2, 0.56 * c.H, 0.08);
    const hold: V = c.bd(-0.2, 0.72 * c.H, 0.32);
    const laser: V = k === 'take' ? lerpV(pocket, hold, sm(u, 0.1, 1)) : k === 'aim' ? add(hold, 0.015 * Math.sin(c.t * 1.2), 0.012 * Math.sin(c.t * 1.7), 0) : k === 'stow' ? lerpV(hold, pocket, sm(u, 0, 0.9)) : pocket;
    const dot = k === 'aim' ? 0.2 + 0.3 * sm(u, 0.05, 0.95) : -1;
    const n = { dot, dotV: 0.56 + 0.04 * Math.sin(c.t * 1.7), says: k === 'ask' ? 1 : 0, nods: k === 'decide' || k === 'close' ? 1 : 0, mate: 2 };
    const props = { laser };
    switch (k) {
      case 'open':
        return { l: c.bd(0.3, 0.72 * c.H, 0.24), r: c.bd(-0.3, 0.72 * c.H + 0.04 * Math.sin(c.t * 3), 0.24), gl: 0.12, gr: 0.12, palms: 0.5, nod: 0, n, props };
      case 'take':
      case 'aim':
      case 'stow':
        return { ...leftEasy(c), nod: -0.24, tool: 'laser', n, props };
      case 'ask':
        return { ...leftEasy(c), r: c.bd(-0.26, 0.82 * c.H, 0.28), gr: 0.15, palms: 0.5, nod: 0, n, props };
      case 'decide':
        return { ...both(c.bd(0, 0.74 * c.H, 0.26), 0.14, 0.03 * Math.sin(c.t * 5), 0, 0.2), palms: 0.6, nod: 0.05, n, props };
      default:
        return { ...easy(c), nod: 0.16 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 출입 통제문 (dcBadgeDoor, 2 × 1): a glass door that slides, a reader on the post at its right.

export const BD = { reader: [0.62, 1.14, 0.18] as V, stand: 0.74, doorX: -0.25 };
const BADGE: Script = {
  seq: [['lift', 0.9], ['tap', 1.2, 0.6], ['open', 0.7, 1.2], ['inside', 1.8, 1.2], ['back', 0.9, 0.5], ['shut', 1.4]],
  at: (k) => (k === 'lift' || k === 'tap' ? st(BD.reader[0] - 0.22, BD.stand) : k === 'inside' ? st(BD.doorX, -0.3, PI) : st(BD.doorX, BD.stand, k === 'back' ? 0 : PI)),
  key(k, u, c) {
    const chest: V = c.bd(-0.04, 0.68 * c.H, 0.14);
    const onReader: V = add(BD.reader, 0, -0.01, 0.1);
    const badge: V | null = k === 'lift' ? lerpV(chest, onReader, sm(u, 0.1, 0.9)) : k === 'tap' ? onReader : null;
    const n = { ok: k === 'tap' ? sm(u, 0.45, 0.55) : k === 'open' || k === 'inside' ? 1 : k === 'back' ? 1 - u * 0.4 : 0, door: k === 'open' ? sm(u, 0.1, 0.9) : k === 'inside' || k === 'back' ? 1 : k === 'shut' ? 1 - sm(u, 0, 0.8) : 0 };
    const props = { badge };
    if (k === 'lift' || k === 'tap') return { ...leftEasy(c), nod: 0.1, tool: 'badge', n, props };
    return { ...easy(c), nod: k === 'inside' ? -0.1 : 0.05, n, props };
  },
};

const SCRIPTS: Record<DcMotion, Script> = {
  dcPatrol: PATROL,
  dcRackServer: RACKSRV,
  dcSwapDisk: SWAP,
  dcPatch: PATCH,
  dcTidy: TIDY,
  dcLift: LIFT,
  dcCart: CART,
  dcFilter: FILTER,
  dcCracSet: CRACSET,
  dcChillerCheck: CHECK,
  dcCoolAlarm: ALARM,
  dcUpsTest: UPSTEST,
  dcDrill: DRILL,
  dcBatt: BATT,
  dcWatch: WATCH,
  dcTicket: TICKET,
  dcLearn: LEARN,
  dcHandover: HANDOVER,
  dcLeadReview: LEAD,
  dcBadge: BADGE,
};
