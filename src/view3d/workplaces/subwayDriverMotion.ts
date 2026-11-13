import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * A subway driver's work at the 승무사업소 (2026-10-27 workplace pipeline, at the user's request: the
 * work should look like the work). In the simulator cab, the one-handle 마스콘 pulled back to power
 * away and pushed forward to brake into the station, the tunnel running on the screen by the same
 * clock, and the 지적확인 환호응답 — the arm thrust out at the signal and the call ("출발 진행!"), back
 * to the ear, out again; a trainee stood at the senior's shoulder with a clipboard, pointing when he
 * does; at the 관제 console typing and looking up at the line diagram, the hotline at the ear in a
 * signal fault, the PA mic and the door buttons; at roll call the salute, the 음주 측정기's wand blown
 * into, the cab key taken off its hook, the 노선도 traced station by station, and out at the train
 * crouched at the bogie tapping with the test hammer.
 *
 * The pieces (workplaces/subwayDriver.ts) move what's held (the 마스콘, the wand, the key, the
 * hammer, the handset) by the same functions, so hand and thing stay together. Kept out of
 * activity.ts (which only hands these motions over here) so it imports nothing from it at run time.
 */
export type SubwayMotion = 'sbCab' | 'sbObserve' | 'sbPointCall' | 'sbSalute' | 'sbBlow' | 'sbTrace' | 'sbInspect' | 'sbKey' | 'sbControl' | 'sbFault' | 'sbAnnounce';
export const SUBWAY_MOTIONS = new Set<string>(['sbCab', 'sbObserve', 'sbPointCall', 'sbSalute', 'sbBlow', 'sbTrace', 'sbInspect', 'sbKey', 'sbControl', 'sbFault', 'sbAnnounce']);

const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
const sstep = THREE.MathUtils.smoothstep;
const frac = (x: number) => ((x % 1) + 1) % 1;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
const num = (a: number, b: number, e: number) => a + (b - a) * e;
/** Eased along keys [u, value]: held before the first and after the last. */
function keyed<T>(keys: Array<[number, T]>, u: number, mix: (a: T, b: T, e: number) => T): T {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}
/** Linear along keys (for speeds, where easing each key would stutter). */
function lin(keys: Array<[number, number]>, u: number): number {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return num(keys[i - 1][1], keys[i][1], (u - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
  return keys[keys.length - 1][1];
}
/** The clock offset of a fixed mark, so two pieces aren't in step. */
export const sbPhase = (p: THREE.Vector3) => frac(p.x * 0.413 + p.z * 0.587);

// ---------------------------------------------------------------------------------------------
// The simulator cab (simDrive): one run from a station to the next.

/** One run, seconds: called away, powered, coasting, braked in, stopped with the doors worked. */
export const CAB_LEN = 28;
/**
 * The cab's controls from the top middle of the driver's seat, in the driver's frame (to their
 * left, up, ahead): the 마스콘's knob at neutral, how long its lever is, and the door buttons on the
 * right-hand desk.
 */
export const CAB = { knob: bo(0.27, 0.36, 0.42), lever: 0.17, btn: bo(-0.3, 0.27, 0.43) };
/** The 마스콘's tilt, radians (toward the driver is power): neutral, P4, B5. */
const N = 0;
const P = 0.5;
const B = -0.42;
const SPEED: Array<[number, number]> = [[3.6, 0], [5, 0.12], [11, 1], [12, 0.98], [16.2, 0.9], [21.6, 0], [28, 0]];
/** Distance run by `s` (seconds into the run), the speed integrated once into a table. */
const DIST = (() => {
  const step = 0.05;
  const out = [0];
  for (let s = step; s <= CAB_LEN + 1e-6; s += step) out.push(out[out.length - 1] + ((lin(SPEED, s - step) + lin(SPEED, s)) / 2) * step);
  return out;
})();
export const RUN_DIST = DIST[DIST.length - 1];
/**
 * Where the run is at `t` (every cab by the same clock): `handle` the 마스콘's tilt; `point` how far
 * the arm is out at a signal (0–1; the 출발 signal at the start, the next one on the way); `speed`
 * 0–1 and `dist` how far it's gone (the tunnel on the screen runs by it); the signal ahead; the
 * 출발 lamp; the right hand at the door buttons (`press`) and the doors opened at the station.
 */
export function cabRound(t: number) {
  const s = frac(t / CAB_LEN) * CAB_LEN;
  const handle = keyed<number>([[0, B], [0.6, N], [3.6, N], [4.6, P], [11, P], [11.8, N], [16.2, N], [17, B], [27.4, B]], s, num);
  const point = sstep(s, 0.6, 1.3) * (1 - sstep(s, 3.1, 3.6)) + sstep(s, 13.2, 13.9) * (1 - sstep(s, 15.4, 15.9));
  // The arm out, back to the ear for the call, out again: `ear` 0–1 within a point.
  const ear = sstep(s, 1.6, 1.9) * (1 - sstep(s, 2.1, 2.4)) + sstep(s, 14.4, 14.7) * (1 - sstep(s, 14.9, 15.2));
  const i = Math.min(DIST.length - 2, Math.floor(s / 0.05));
  const dist = num(DIST[i], DIST[i + 1], s / 0.05 - i);
  const speed = lin(SPEED, s);
  const signal: 'red' | 'green' | 'yellow' = s < 0.4 || s >= 22 ? 'red' : s < 16.2 ? 'green' : 'yellow';
  const press = sstep(s, 22.4, 22.9) * (1 - sstep(s, 23.4, 23.9)) + sstep(s, 25.6, 26.1) * (1 - sstep(s, 26.6, 27.1));
  const doorsOpen = s >= 23 && s < 26.4;
  return { s, handle, point, ear, speed, dist, signal, depart: s >= 0.4 && s < 3.6, press, doorsOpen };
}
/** The 마스콘's knob for a tilt, from its neutral place (driver's frame): forward and down as it's pushed. */
export const knobAt = (handle: number): BarOffset => bo(CAB.knob.side, CAB.knob.up - CAB.lever * (1 - Math.cos(handle)), CAB.knob.ahead - CAB.lever * Math.sin(handle));

// ---------------------------------------------------------------------------------------------
// The 음주 측정기 (sbBreathTest): the wand taken off its holder, blown into, put back, the reading.

/** One test, seconds. */
const BLOW_LEN = 12;
export function blowRound(t: number, ph: number) {
  const s = frac(t / BLOW_LEN + ph) * BLOW_LEN;
  // The wand from its holder (0) to the mouth (1).
  const e = sstep(s, 1.2, 2.2) * (1 - sstep(s, 6, 7));
  const reach = sstep(s, 0.2, 1.1) * (1 - sstep(s, 7, 7.6));
  const blowing = s >= 2.3 && s < 5.8;
  const reading: 'idle' | 'busy' | 'pass' = s < 2.3 ? 'idle' : s < 5.8 ? 'busy' : 'pass';
  return { s, e, reach, blowing, reading, look: sstep(s, 7.4, 8) * (1 - sstep(s, 10.6, 11.2)) };
}
/**
 * The wand's mouthpiece for `e` (0 at its holder, 1 at the mouth of someone `H` tall stood at `base`
 * facing `fwd`), lifted in an arc between: the same in the piece's frame and in the world.
 */
export function wandTop(holder: THREE.Vector3, base: THREE.Vector3, fwd: THREE.Vector3, H: number, e: number, out = new THREE.Vector3()): THREE.Vector3 {
  const mouth = base.clone().addScaledVector(fwd, 0.13 * (H / 1.6)).setY(base.y + 0.855 * H);
  return out.copy(holder).lerp(mouth, e).setY(num(holder.y, mouth.y, e) + 0.1 * Math.sin(e * Math.PI));
}
/** From the mouthpiece down to where the hand holds the wand. */
export const WAND_GRIP = 0.09;

// ---------------------------------------------------------------------------------------------
// The cab key (sbTakeKey): off its hook, its tag read, signed out on the clipboard.

const KEY_LEN = 12;
/** The 키 수불부 from the key's hook (the dweller's frame: to their left, down, nearer). */
export const KEY_CLIP = bo(0.45, -0.28, 0.04);
export function keyRound(t: number, ph: number) {
  const s = frac(t / KEY_LEN + ph) * KEY_LEN;
  const reach = sstep(s, 0.1, 1.1) * (1 - sstep(s, 9.6, 10.4));
  const e = sstep(s, 1.3, 2.1) * (1 - sstep(s, 8.8, 9.6));
  const sign = sstep(s, 4.6, 5.2) * (1 - sstep(s, 7.8, 8.4));
  return { s, reach, e, sign, read: sstep(s, 2.1, 2.6) * (1 - sstep(s, 4.4, 4.8)) };
}
/** The key's place for `e` (0 on its hook, 1 held up at the chest of someone `H` tall stood at `base` facing `fwd`). */
export function keyAt(hook: THREE.Vector3, base: THREE.Vector3, fwd: THREE.Vector3, left: THREE.Vector3, H: number, e: number, out = new THREE.Vector3()): THREE.Vector3 {
  const chest = base.clone().addScaledVector(fwd, 0.3 * (H / 1.6)).addScaledVector(left, -0.06).setY(base.y + 0.72 * H);
  return out.copy(hook).lerp(chest, e).setY(num(hook.y, chest.y, e) + 0.05 * Math.sin(e * Math.PI));
}

// ---------------------------------------------------------------------------------------------
// The train's bogie (checkTrain): crouched with the test hammer and a torch.

const INSPECT_LEN = 11;
export function inspectRound(t: number, ph: number) {
  const s = frac(t / INSPECT_LEN + ph) * INSPECT_LEN;
  const crouch = 0.75 * sstep(s, 0.2, 1.2) * (1 - sstep(s, 6.4, 7.3));
  // Where the hammer's head is from the work mark (the axle box), in the dweller's frame: a bolt, the
  // spring, the wheel's rim, tapped (`tap` its bounce).
  const at = keyed<BarOffset>([[1.2, bo(0.05, 0.02, 0)], [2.8, bo(0.05, 0.02, 0)], [3.2, bo(-0.18, 0.12, 0)], [4.6, bo(-0.18, 0.12, 0)], [5, bo(0.28, -0.12, 0.02)], [6.4, bo(0.28, -0.12, 0.02)], [7, bo(0, 0.25, 0.15)]], s, (a, b, e) => bo(num(a.side, b.side, e), num(a.up, b.up, e), num(a.ahead, b.ahead, e)));
  const tapping = s >= 1.2 && s < 6.4 && !(s > 2.8 && s < 3.2) && !(s > 4.6 && s < 5);
  const tap = tapping ? 0.05 * Math.max(0, Math.sin(s * Math.PI * 2 * 2.2)) ** 3 : 0;
  const point = sstep(s, 7.6, 8.1) * (1 - sstep(s, 9.6, 10.1));
  return { s, crouch, at, tap, point, down: crouch > 0.2 };
}

// ---------------------------------------------------------------------------------------------
// The 관제 console: the hotline's handset (signalFault).

/** The handset held to the ear, from the top middle of the seat (the dweller's frame), `up` as a part of their height. */
export const EAR = { side: 0.13, up: 0.5, ahead: 0.06 };
/** The 출입문 panel from the PA mic's key (dweller's frame): to the right. */
export const ANN_DOOR = bo(-0.9, -0.01, 0);

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a subway driver's motion (activity.ts doing hands these over). */
export function subwayDoing(m: SubwayMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const UP = new THREE.Vector3(0, 1, 0);
  const H = b.height;
  const k = H / 1.6;
  const y0 = b.base.y;
  const chest = y0 + (b.sitting ? 0.3 : 0.7) * H;
  const waist = y0 + (b.sitting ? 0.12 : 0.56) * H;
  const eye = y0 + (b.sitting ? 0.5 : 0.9) * H;
  const front = (ahead: number, side: number, y: number) => b.base.clone().addScaledVector(fwd, ahead).addScaledVector(left, side).setY(y);
  const off = (p: THREE.Vector3, o: BarOffset) => p.clone().addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
  const reachTo = (from: THREE.Vector3, p: THREE.Vector3, most: number) => from.clone().addScaledVector(p.clone().sub(from).normalize(), Math.min(most, p.distanceTo(from)));
  const shoulderR = front(0, -0.17 * k, chest + 0.12 * k);
  const restR = front(0.08, -0.23 * k, waist - 0.06 * k);
  const restL = front(0.08, 0.23 * k, waist - 0.06 * k);
  const earR = front(0.06 * k, -0.13 * k, eye + 0.02 * k);
  /** How far the head tips to look at `p` (down is +). */
  const lookAt = (p: THREE.Vector3) => THREE.MathUtils.clamp(-Math.atan2(p.y - eye, Math.max(0.2, p.clone().sub(b.base).setY(0).length())) * 0.8, -0.35, 0.5);
  /** The pointing hand at `target` (the arm straight at it), or back by the ear for the call. */
  const pointAt = (target: THREE.Vector3, ear: number) => reachTo(shoulderR, target, 0.6 * k).lerp(earR, ear);
  switch (m) {
    case 'sbCab': {
      // Sat at the cab's desk: the left hand on the 마스콘 (moved with it), the right at the door
      // buttons or out at the signal ahead.
      const run = cabRound(t);
      const knob = off(b.base, knobAt(run.handle));
      const btn = off(b.base, CAB.btn);
      const signal = front(1.6, -0.05, eye + 0.25);
      const rest = off(btn, bo(0.05, 0.0, -0.08));
      let r = rest.clone().lerp(off(btn, bo(0, 0.005 - 0.012 * run.press, 0)), sstep(run.press, 0, 0.3));
      r = r.lerp(pointAt(signal, run.ear), run.point);
      return {
        reach: {
          l: off(knob, bo(0, 0.03, 0)),
          r,
          lean: 0.12 - 0.08 * run.point + 0.04 * run.press,
          nod: num(0.05 + 0.03 * wave(t, 0.13), -0.08, run.point) + 0.18 * run.press,
          palms: num(1.1, 0.15, run.point),
          grip: { l: 0.9, r: num(0.35, 0.75, run.point) },
        },
      };
    }
    case 'sbObserve': {
      // Stood at the senior's shoulder: clipboard and pen, and the arm out at the signal with him.
      const run = cabRound(t);
      const clip = front(0.24 * k, 0.08 * k, waist + 0.18 * k);
      const pen = off(clip, bo(-0.06 + 0.03 * wave(t, 1.9), 0.02 + 0.008 * wave(t, 3.8), 0.01 * wave(t, 1.1)));
      const signal = front(2.2, 0.1, eye + 0.2);
      const r = pen.lerp(pointAt(signal, run.ear), run.point);
      return { reach: { l: clip, r, lean: num(0.12, 0, run.point), nod: num(0.42, -0.05, run.point), palms: num(1.0, 0.15, run.point), grip: { l: 0.8, r: num(0.85, 0.75, run.point) } } };
    }
    case 'sbPointCall': {
      // 지적확인 환호응답: looked at, the arm thrust out at it with the call, back to the ear, out
      // again; an 8 s round, the target to one side then the other.
      const p = work?.point ?? front(1, 0, eye);
      const c = t / 8 + sbPhase(p);
      const n = Math.floor(c);
      const u = (c - n) * 8;
      const target = off(p, bo(n % 2 ? 0.12 : -0.12, 0, 0));
      const out = sstep(u, 0.5, 1.2) * (1 - sstep(u, 4.6, 5.4));
      const ear = sstep(u, 0.0, 0.5) * (1 - sstep(u, 0.6, 1.0)) + sstep(u, 2.4, 2.8) * (1 - sstep(u, 3.0, 3.4));
      const raise = Math.max(out, sstep(u, 0, 0.5) * (1 - sstep(u, 4.6, 5.4)));
      const r = restR.clone().lerp(pointAt(target, ear), raise);
      return { reach: { l: restL, r, lean: 0.02, nod: num(0.05, lookAt(target), raise), palms: 0.1, grip: { l: 0.7, r: 0.75 } } };
    }
    case 'sbSalute': {
      // At the roll-call counter: the 거수경례, the 운행표 read in both hands, signed for in the book.
      const p = work?.point ?? front(0.45, 0, waist + 0.4);
      const u = frac(t / 14 + sbPhase(p)) * 14;
      const salute = sstep(u, 0, 0.6) * (1 - sstep(u, 2.2, 2.8));
      const read = sstep(u, 2.8, 3.4) * (1 - sstep(u, 8.6, 9.2));
      const sign = sstep(u, 9.2, 9.8) * (1 - sstep(u, 11.8, 12.4));
      const brow = front(0.09 * k, -0.07 * k, eye + 0.07 * k);
      const card = front(0.27 * k, 0, chest - 0.06 * k);
      const pen = off(p, bo(-0.03 + 0.025 * wave(t, 2.1), 0.01 + 0.006 * wave(t, 4.2), 0.02 * wave(t, 1.1)));
      const r = restR.clone().lerp(brow, salute).lerp(off(card, bo(-0.09, 0, 0)), read).lerp(pen, sign);
      const l = restL.clone().lerp(off(card, bo(0.09, 0, 0)), read).lerp(off(p, bo(0.16, 0, -0.02)), sign);
      return { reach: { l, r, lean: 0.3 * sign + 0.05 * read, nod: 0.38 * read + 0.42 * sign - 0.04 * salute, palms: num(num(0.3, -0.9, salute), 1.2, sign), grip: { l: num(0.3, 0.8, read), r: salute > 0.5 ? 0 : num(0.3, 0.85, Math.max(read, sign)) } } };
    }
    case 'sbBlow': {
      // The wand off its holder (`work`) to the mouth, blown into, put back; the reading looked at.
      const holder = work?.point ?? front(0.45, -0.1, waist + 0.4);
      const bl = blowRound(t, sbPhase(holder));
      const top = wandTop(holder, b.base, fwd, H, bl.e);
      const grip = top.clone().setY(top.y - WAND_GRIP);
      const r = restR.clone().lerp(grip, bl.reach);
      const l = restL.clone().lerp(off(holder, bo(0.3, 0.02, -0.04)), bl.look * 0.7);
      return { reach: { l, r, lean: 0.06 + 0.22 * bl.look + 0.1 * bl.reach * (1 - bl.e), nod: bl.blowing ? 0.05 : num(0.25 * bl.reach * (1 - bl.e), 0.45, bl.look), palms: 0.5, grip: { l: 0.3, r: bl.reach > 0.8 ? 0.85 : 0.4 } } };
    }
    case 'sbTrace': {
      // The 노선도 (`work` its middle): a finger along the line, station by station, a notebook in the
      // other hand.
      const p = work?.point ?? front(0.6, 0, eye);
      const u = frac(t / 16 + sbPhase(p));
      // Seven stops across, a pause at each.
      const stops = 7;
      const st = u * stops;
      const i = Math.floor(st);
      const e = sstep(st - i, 0.55, 1);
      const x = num(0.62, -0.62, (i + e) / stops);
      const y = 0.18 * Math.sin((i + e) * 0.9);
      const tip = off(p, bo(x, y, -0.03 + 0.012 * Math.max(0, Math.sin((st - i) * Math.PI * 2)) ** 8));
      const note = front(0.22 * k, 0.12 * k, waist + 0.14 * k);
      return { reach: { l: note, r: reachTo(shoulderR, tip, 0.62 * k), lean: 0.05, nod: lookAt(tip), palms: 0.15, grip: { l: 0.8, r: 0.7 } } };
    }
    case 'sbInspect': {
      // Crouched at the bogie (`work` the axle box): the test hammer tapped round it, the torch on
      // it; up again and the arm out down the car: 이상 없음.
      const p = work?.point ?? front(0.4, 0, y0 + 0.45);
      const ins = inspectRound(t, sbPhase(p));
      const head = off(p, ins.at).addScaledVector(UP, ins.tap);
      // The hand's behind the hammer's head, up its short handle.
      const hand = head.clone().addScaledVector(fwd, -0.2).addScaledVector(UP, 0.06);
      const torch = off(p, bo(0.32, 0.22, -0.3));
      const along = front(1.2, 1.4, eye - 0.1);
      const crouching = sstep(ins.crouch, 0.05, 0.4);
      const r = restR.clone().lerp(hand, crouching).lerp(pointAt(along, 0), ins.point);
      const l = restL.clone().lerp(torch, crouching);
      return { reach: { l, r, lean: 0.1 + 0.35 * ins.crouch, nod: 0.2 + 0.3 * ins.crouch - 0.2 * ins.point, palms: 0.6, grip: { l: 0.9, r: 0.9 } }, crouch: ins.crouch };
    }
    case 'sbKey': {
      // The 키 보관함 (`work` the key's hook): the key lifted off, its tag read, signed out.
      const hook = work?.point ?? front(0.45, 0, eye);
      const kr = keyRound(t, sbPhase(hook));
      const key = keyAt(hook, b.base, fwd, left, H, kr.e);
      const r = restR.clone().lerp(key.clone().addScaledVector(fwd, -0.03), kr.reach);
      const clip = off(hook, KEY_CLIP);
      const pen = off(clip, bo(0.02 * wave(t, 2.2), 0.006 * wave(t, 4.4), -0.02));
      const l = restL.clone().lerp(pen, kr.sign);
      return { reach: { l, r, lean: 0.06 + 0.1 * kr.sign, nod: num(lookAt(hook), 0.42, Math.max(kr.read, kr.sign)), palms: 0.5, grip: { l: 0.85, r: 0.8 } } };
    }
    case 'sbControl': {
      // At the 관제 console (`work` the keyboard): typing, the mouse, and a look up at the line
      // diagram with a finger at a train on it.
      const p = work?.point ?? front(0.4, 0, waist + 0.2);
      const u = frac(t / 14 + sbPhase(p)) * 14;
      const up = sstep(u, 7, 7.6) * (1 - sstep(u, 9.6, 10.2));
      const type = 0.012 * Math.max(0, wave(t, 6.5));
      const l = off(p, bo(0.12, type, 0));
      const mouse = off(p, bo(-0.3 + 0.02 * wave(t, 0.4), 0.01, 0.03 * wave(t, 0.3, 0.2)));
      const board = front(1.0, 0.05, eye + 0.5);
      const r = mouse.lerp(reachTo(shoulderR, board, 0.6 * k), up);
      return { reach: { l, r, lean: num(0.2, 0.02, up), nod: num(0.18, -0.3, up), palms: num(1.4, 0.2, up), grip: { l: 0.35, r: num(0.5, 0.75, up) }, tap: up < 0.2 } };
    }
    case 'sbFault': {
      // A signal fault: the 관제 hotline's handset at the ear, the other hand hammering the keys,
      // a look up at the red on the line diagram now and then.
      const p = work?.point ?? front(0.4, 0, waist + 0.2);
      const ear = off(b.base, bo(EAR.side * k, EAR.up * H, EAR.ahead));
      const r = off(p, bo(-0.08 + 0.05 * wave(t, 0.7), 0.014 * Math.max(0, wave(t, 8)), 0));
      const look = Math.max(0, wave(t, 0.12, sbPhase(p))) ** 3;
      return { reach: { l: ear, r, lean: 0.24 - 0.15 * look, nod: num(0.2, -0.28, look), palms: 1.3, grip: { l: 0.85, r: 0.35 }, tap: true } };
    }
    case 'sbAnnounce': {
      // 출입문 취급·안내 방송: leaned in to the PA mic with its key held (`work`), the 닫힘 button
      // pressed and held, a look at the platform camera.
      const p = work?.point ?? front(0.4, 0.2, waist + 0.2);
      const u = frac(t / 10 + sbPhase(p)) * 10;
      const talk = sstep(u, 0, 0.5) * (1 - sstep(u, 4.2, 4.7));
      const door = sstep(u, 4.5, 5.0) * (1 - sstep(u, 6.6, 7.1));
      const press = door > 0.9 ? 0.012 : 0;
      const deskL = off(p, bo(0.04, 0, 0.06));
      const deskR = off(p, bo(-0.36, 0, 0.08));
      const l = deskL.lerp(off(p, bo(0, 0.012, 0)), talk);
      const r = deskR.lerp(off(p, bo(ANN_DOOR.side, ANN_DOOR.up - press, ANN_DOOR.ahead)), door);
      const cam = sstep(u, 7.1, 7.5) * (1 - sstep(u, 9.3, 9.8));
      return { reach: { l, r, lean: 0.12 + 0.18 * talk, nod: 0.12 + 0.1 * talk + 0.1 * door - 0.22 * cam, palms: 1.2, grip: { l: num(0.3, 0.8, talk), r: 0.4 } } };
    }
  }
}
