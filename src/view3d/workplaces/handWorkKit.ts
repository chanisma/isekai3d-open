import * as THREE from 'three';
import type { Doing } from '../activity';
import type { BodyPose } from '../avatar';
import { handleGrips, upTo } from '../cleaningTools';
import type { Grip, HeldTool } from '../handTool';
import type { Spot } from '../parts';
import { box, cyl, part, rbox } from '../toon';
import { painted, picture, text } from './doctor';

/*
 * What the five hand-work extras share (2026-11-02, at the user's request: closing a kitchen and a bakery, sweeping a salon's floor, sanding,
 * soaking off gel): beats on one clock, in the piece's frame (x across, y up, z to its front), and the small things that go in a hand.
 *
 * The clock starts as the dweller arrives, not from where the piece stands, so a shot at N seconds is the same beat on every piece of a lot.
 */
export type P = [number, number, number];
export interface SpotAt {
  x: number;
  z: number;
  yaw: number;
}
export const frac = (x: number) => ((x % 1) + 1) % 1;
export const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
export const mix = (a: number, b: number, e: number) => a + (b - a) * e;
export const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const wave = (t: number, hz: number, s = 0) => Math.sin((t * hz + s) * Math.PI * 2);
export const mixAt = (a: SpotAt, b: SpotAt, e: number): SpotAt => ({ x: mix(a.x, b.x, e), z: mix(a.z, b.z, e), yaw: mix(a.yaw, b.yaw, e) });
export const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** A point in a spot's own frame (`side` to the dweller's left, `up` from the floor, `ahead`), in the piece's. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, up, s.z - side * n + ahead * c];
}

export type Step<K extends string> = { key: K; hold: number; move: number };
export const st = <K extends string>(key: K, hold: number, move = 0.3): Step<K> => ({ key, hold, move });
export const roundOf = <K extends string>(steps: Array<Step<K>>) => steps.reduce((n, k) => n + k.hold + k.move, 0);
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
}
/** The beat at `t` seconds since the dweller arrived. */
export function beatOf<K extends string>(steps: Array<Step<K>>, t: number): Beat<K> {
  const T = roundOf(steps);
  let u = frac(t / T) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: ss(Math.min(1, u / k.move)), p: 1 };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0 };
}
/** Seconds into a round where each beat starts (for the lead's shots). */
export function timesOf<K extends string>(steps: Array<Step<K>>): Array<[K, number]> {
  let u = 0;
  return steps.map((k) => {
    const at: [K, number] = [k.key, Number(u.toFixed(2))];
    u += k.hold + k.move;
    return at;
  });
}

export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
}
export const key = (l: P, r: P, lean: number, nod: number, palms = 0.6, gl = 0.3, gr = 0.3, crouch = 0): Key => ({ l, r, lean, nod, palms, gl, gr, crouch });
export function mixKey(a: Key, b: Key, e: number): Key {
  return { l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e), gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), crouch: mix(a.crouch, b.crouch, e) };
}
export function blended<K extends string>(b: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(b.from, b.e > 0 ? 1 : b.p);
  return b.e > 0 ? mixKey(a, pose(b.to, 0), b.e) : a;
}

/** A moment of a round: all the body needs (the rest of what's in a Now is for the piece to draw). */
export interface Now {
  beat: string;
  key: Key;
  at: SpotAt;
  walking?: boolean;
  /** Sat: the seat's top. */
  seat?: number;
}

/** How the dweller's shoulders stand for a key (avatar.ts), for checking reach. */
export function shoulderOf(n: Pick<Now, 'at' | 'key' | 'seat'>, sx: number): P {
  const { lean, crouch } = n.key;
  const up = n.seat !== undefined ? n.seat + 0.52 - 0.2 * (1 - Math.cos(lean)) : 1.3 - 0.45 * (1 - Math.cos(lean)) - 0.37 * crouch;
  return sp(n.at, sx * 0.18, up, (n.seat !== undefined ? 0.35 : 0.45) * Math.sin(lean));
}
/** How far the further hand is from its shoulder. */
export const worstReach = (n: Now) => Math.max(dist(n.key.l, shoulderOf(n, 1)), dist(n.key.r, shoulderOf(n, -1)));

/** Seconds since this spot was arrived at; it starts over when the dweller's been away. */
export function clockOf(at: THREE.Object3D, t: number): number {
  const u = at.userData as { hwStart?: number; hwLast?: number };
  if (u.hwLast === undefined || Math.abs(t - u.hwLast) > 0.6) u.hwStart = t;
  u.hwLast = t;
  return t - u.hwStart!;
}
/** Whether a dweller's at this spot this moment. */
export const using = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;

/** The body at a moment, for activity.ts. */
export function posed(n: Now, spot: Spot): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const W = (v: P) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = n.at;
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const k = n.key;
  const pose: BodyPose =
    n.seat !== undefined
      ? { kind: 'sit', at: W([s.x, n.seat, s.z]), yaw, floor: W([s.x, 0, s.z]).y }
      : n.walking
        ? { kind: 'walk', at: W([s.x, 0, s.z]), yaw }
        : { kind: 'stand', at: W([s.x, 0, s.z]), yaw, crouch: k.crouch };
  return {
    pose,
    doing: { reach: { l: W(k.l), r: W(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) },
  };
}

// =============================================================================================
// A long tool: where the hands are for a head on the floor, and how it stands.

const HANDS_UP = 0.7;
/** The hands on a long handle, for someone `H` tall: the right on top. */
export const longHands = (at: SpotAt, H: number) => ({ r: sp(at, -0.03, HANDS_UP * H, 0.26), l: sp(at, -0.02, HANDS_UP * H - 0.2, 0.3) });

export interface Stroke {
  side: number;
  ahead: number;
  lift: number;
  spin: number;
}
const Q_UP = new THREE.Vector3(0, 1, 0);
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
/** Stands `tool` (a child of the piece) with its head `tip` where the stroke says, its handle up through the hands. Returns the grips for both hands. */
export function placeLong(tool: THREE.Object3D, tip: THREE.Vector3, tipY: number, at: SpotAt, k: Stroke, H: number) {
  const inDweller = new THREE.Vector3(k.side, k.lift, k.ahead);
  const up = upTo(inDweller, H).normalize();
  qa.setFromAxisAngle(Q_UP, at.yaw);
  tool.quaternion.copy(qa).multiply(qb.setFromUnitVectors(Q_UP, up)).multiply(new THREE.Quaternion().setFromAxisAngle(Q_UP, k.spin));
  const p = sp(at, k.side, k.lift, k.ahead);
  tool.position.set(p[0], p[1], p[2]).sub(tip.clone().applyQuaternion(tool.quaternion));
  return handleGrips(tipY, 0.2)(H, { tip: inDweller, up, spin: k.spin, step: 0 });
}
/** Moves a long tool part of the way from where it's kept to where `placeLong` just put it. */
export function fromRest(tool: THREE.Object3D, restP: THREE.Vector3, restQ: THREE.Quaternion, e: number) {
  tool.position.lerpVectors(restP, tool.position.clone(), e);
  tool.quaternion.slerpQuaternions(restQ, tool.quaternion.clone(), e);
}

// =============================================================================================
// Small things in a hand. Origins and axes are made for the grips below. No ink line on any.

const NO = { outline: false };

/** A folded cloth lying flat. */
export function clothTool(g: THREE.Object3D, name: string, c = '#e1f5fe', c2 = '#b3e5fc'): THREE.Group {
  const o = new THREE.Group();
  o.name = name;
  g.add(o);
  part(o, rbox(0.14, 0.022, 0.11, 0.008), c, 0, 0.011, 0, NO);
  part(o, box(0.142, 0.003, 0.112), c2, 0, 0.012, 0, NO);
  return o;
}
/** Flat on a cloth, a right hand from a dweller facing -z. */
export const CLOTH_GRIP: Grip = { at: new THREE.Vector3(0, 0.012, 0), axis: new THREE.Vector3(-1, 0, 0), palm: new THREE.Vector3(0, -1, 0), shape: 'flat', radius: 0.012 };

/** A plain trigger spray, unlabelled but for a blank sticker: its nozzle towards -z, the origin in its neck. The mist is `.userData.mist`. */
export function sprayTool(g: THREE.Object3D, name: string, c = '#ffa726'): THREE.Group {
  const o = new THREE.Group();
  o.name = name;
  g.add(o);
  part(o, cyl(0.026, 0.036, 0.16, 10), c, 0, -0.09, 0, NO);
  part(o, box(0.05, 0.07, 0.002), '#fbf6ea', 0, -0.1, 0.033, NO);
  part(o, cyl(0.012, 0.02, 0.03, 8), '#fafafa', 0, 0, 0, NO);
  part(o, rbox(0.04, 0.04, 0.11, 0.01), '#fafafa', 0, 0.03, -0.02, NO);
  part(o, rbox(0.012, 0.05, 0.016, 0.005), '#ef5350', 0, -0.005, -0.03, { rx: 0.25, outline: false });
  const mat = new THREE.MeshBasicMaterial({ color: '#f1f8e9', transparent: true, opacity: 0.55, depthWrite: false });
  const mist = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.07, 0.2, 10), mat);
  mist.userData.ownGeometry = mist.userData.ownMaterial = true;
  mist.position.set(0, 0.03, -0.18);
  mist.rotation.x = -Math.PI / 2;
  mist.visible = false;
  o.add(mist);
  o.userData.mist = mist;
  return o;
}
export const SPRAY_GRIP: Grip = { at: new THREE.Vector3(0, -0.03, 0), axis: new THREE.Vector3(0, 1, 0), shape: 'trigger', radius: 0.03 };

/** A pen or anything held like one: the tip at the origin, the shaft up +y. The hand's at 5 cm, leaned back to it (handTool.ts `writes`). */
export function penGrip(writes = true): Grip {
  return { at: new THREE.Vector3(0, 0.05, 0), axis: new THREE.Vector3(0, -1, 0), shape: 'pen', radius: 0.008, ...(writes ? { writes: 0.05 } : {}) };
}
export function penTool(g: THREE.Object3D, name: string): THREE.Group {
  const o = new THREE.Group();
  o.name = name;
  g.add(o);
  part(o, cyl(0.002, 0.005, 0.02, 8), '#37474f', 0, 0.01, 0, NO);
  part(o, cyl(0.006, 0.006, 0.12, 8), '#1e88e5', 0, 0.08, 0, NO);
  return o;
}

/**
 * A closing checklist on a board lying flat (the dweller at +z reads it): four rows, a green tick each that comes as it's made.
 * `at` the board's centre on the top; returns the ticks and where a tick's pen goes.
 */
export function checklist(g: THREE.Object3D, at: P, key: string, title: string, rows: readonly string[]) {
  const o = new THREE.Group();
  o.position.set(at[0], at[1], at[2]);
  g.add(o);
  part(o, rbox(0.18, 0.012, 0.25, 0.006), '#8d6e63', 0, 0.006, 0);
  part(o, rbox(0.07, 0.012, 0.03, 0.004), '#90a4ae', 0, 0.018, -0.115, NO);
  const tex = painted(`hw-list-${key}`, 192, 256, (c) => {
    c.fillStyle = '#fffdf5';
    c.fillRect(0, 0, 192, 256);
    text(c, title, 96, 26, 19, '#37474f', 'center');
    rows.forEach((r, i) => {
      c.strokeStyle = '#546e7a';
      c.lineWidth = 2;
      c.strokeRect(12, 62 + i * 46, 20, 20);
      text(c, r, 42, 74 + i * 46, 16, '#37474f', 'left', false);
    });
  });
  picture(o, tex, 0.16, 0.21, 0, 0.0135, 0.012).rotation.set(-Math.PI / 2, 0, 0);
  // The paper's box for row i, in the board's frame.
  const boxAt = (i: number): P => [-0.08 + (22 / 192) * 0.16, 0.016, 0.012 - 0.105 + ((72 + i * 46) / 256) * 0.21];
  const ticks = rows.map((_, i) => {
    const b = boxAt(i);
    const m = new THREE.Group();
    m.position.set(b[0], b[1], b[2]);
    o.add(m);
    part(m, box(0.012, 0.0015, 0.003), '#2e7d32', -0.003, 0, 0.002, { ry: -0.8, outline: false });
    part(m, box(0.02, 0.0015, 0.003), '#2e7d32', 0.005, 0, -0.002, { ry: 0.8, outline: false });
    m.visible = false;
    return m;
  });
  return { root: o, ticks, tip: (i: number): P => add(at, boxAt(i)) };
}
/** Where a tick's pen is `p` through a row, from the board's centre at `board` (the same sums as `checklist`, for a script with no piece). */
export const tickTip = (board: P, i: number, p: number): P => [board[0] - 0.08 + (22 / 192) * 0.16 - 0.006 + 0.016 * ss(p, 0.2, 0.75), board[1] + 0.018, board[2] + 0.012 - 0.105 + ((72 + i * 46) / 256) * 0.21 + 0.004 * Math.cos(p * Math.PI)];
/** A pen's hand stands this far off its tip, for the reach. */
export const PEN_HAND: P = [0.02, 0.07, 0.03];

/** Held by one grip, leaning as the key says. */
export function holding(tool: THREE.Object3D, grips: HeldTool['grips'], k: Key, extra: Partial<HeldTool> = {}): HeldTool {
  return { tool, grips, lead: grips.right ? 'right' : 'left', lean: k.lean, nod: k.nod, ...extra };
}
