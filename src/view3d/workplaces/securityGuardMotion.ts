import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * Building security work (2026-10-27, the 빌딩 보안실, at the user's request: the work should look like
 * the work). Each motion is a round of beats, each held a while and eased into the next, by the same
 * clock (sgPhase of the piece's work point) as the piece it's done at, so what's in the hands and what
 * the piece shows are drawn there in step (workplaces/securityGuard.ts):
 *
 * - sgCctv: sat at the CCTV console under the video wall, the right hand on the PTZ joystick and the
 *   left on the camera keypad; a camera called up on the keypad (the big monitor switches to it),
 *   zoomed in with a twist of the stick and panned across, a line jotted in the log, eyes up on the wall.
 * - sgKeys: at the key cabinet, a finger run along the numbered hooks, a key lifted off, its tag
 *   read, handed out to the one asking for it (turned to them), and the 열쇠 수불대장 signed.
 * - sgAlarm: at an alarm or fire panel, the lit zone traced on the mimic map, the buzzer acknowledged
 *   (확인), the radio up to the mouth to send someone, listened to, the panel reset (복구).
 * - sgRadio: a radio lifted off its charger, its battery and channel checked, a call sent with it at
 *   the mouth, the answer listened to, put back.
 * - sgTag: a patrol wand touched to the checkpoint's reader (it beeps green), its screen read, the
 *   torch shone down the corridor one way and the other.
 * - sgGate: a card tapped on the speed gate's reader, the flaps open, a visitor waved through.
 * - sgBadge: at the visitor desk, the ID card taken across the counter, the visit typed in, the 방문증
 *   taken out of the printer and clipped to its lanyard, handed over with the ID, the gate pointed out.
 *
 * Kept out of activity.ts (which only hands these motions over here) so it imports nothing from it at
 * run time. A pose is worked out against a Frame: `o` places a point by its offset from the piece's
 * work point in the piece's own axes (x across, y up, z out of its front), `bd` by the body's (to their
 * left, up from the feet or the seat, ahead). The builder works the same poses out in the piece's frame.
 */
export type SecurityMotion = 'sgCctv' | 'sgKeys' | 'sgAlarm' | 'sgRadio' | 'sgTag' | 'sgGate' | 'sgBadge';
export const SECURITY_MOTIONS = new Set<string>(['sgCctv', 'sgKeys', 'sgAlarm', 'sgRadio', 'sgTag', 'sgGate', 'sgBadge']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The clock offset: from where the piece's work point is, so two pieces aren't in step. */
export const sgPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const sm = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

// ---------------------------------------------------------------------------------------------
// Rounds of beats.

/** A round: each beat's key, how long it's held, and how long it takes to ease into the next. */
type Seq = Array<[string, number, number?]>;
export interface Beat {
  /** Which round this is (counts up), the beat's place in it, its key and the next one's. */
  n: number;
  i: number;
  from: string;
  to: string;
  /** How far through the hold (0–1; 1 while easing on). */
  u: number;
  /** How far eased into the next (0 while held). */
  e: number;
}
const MOVE = 0.7;
function beatOf(seq: Seq, t: number, phase: number): Beat {
  const T = seq.reduce((n, [, h, m = MOVE]) => n + h + m, 0);
  const c = t / T + phase;
  const n = Math.floor(c);
  let x = (c - n) * T;
  for (let i = 0; i < seq.length; i++) {
    const [key, hold, move = MOVE] = seq[i];
    const next = seq[(i + 1) % seq.length][0];
    if (x < hold) return { n, i, from: key, to: key, u: hold > 0 ? x / hold : 1, e: 0 };
    x -= hold;
    if (x < move || i === seq.length - 1) return { n, i, from: key, to: next, u: 1, e: sm(Math.min(1, x / move), 0, 1) };
    x -= move;
  }
  return { n, i: 0, from: seq[0][0], to: seq[0][0], u: 0, e: 0 };
}

/** Where things are worked out: the piece's work point and axes, the body's place and axes, how tall they are. */
export interface Frame {
  /** A point at an offset from the work point, in the piece's own axes (x across, y up, z out of its front). */
  o(dx: number, dy: number, dz: number): THREE.Vector3;
  /** A point from the body: to their left, up from the feet (or the seat), ahead of them. */
  bd(side: number, up: number, ahead: number): THREE.Vector3;
  H: number;
  k: number;
  sitting: boolean;
}
/** A frame: the work point and the piece's turn, the feet (or the seat's top) and the body's turn. */
export function frameAt(work: THREE.Vector3, pieceYaw: number, feet: THREE.Vector3, yaw: number, H: number, sitting = false): Frame {
  const c = Math.cos(pieceYaw);
  const s = Math.sin(pieceYaw);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return {
    o: (dx, dy, dz) => new THREE.Vector3(work.x + dx * c + dz * s, work.y + dy, work.z - dx * s + dz * c),
    bd: (side, up, ahead) => feet.clone().addScaledVector(left, side).addScaledVector(fwd, ahead).setY(feet.y + up),
    H,
    k: H / 1.6,
    sitting,
  };
}

/** Where the hands are and how the body goes with them. */
export interface Hands {
  l?: THREE.Vector3;
  r?: THREE.Vector3;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  tap?: boolean;
}
const hands = (h: Partial<Hands>): Hands => ({ lean: 0, nod: 0, palms: 0.4, gl: 0.3, gr: 0.3, ...h });
function mix(a: Hands, b: Hands, e: number): Hands {
  if (e <= 0) return a;
  const n = (p: number, q: number) => p + (q - p) * e;
  const v = (p?: THREE.Vector3, q?: THREE.Vector3) => (p && q ? p.clone().lerp(q, e) : e < 0.5 ? p : q);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean), nod: n(a.nod, b.nod), palms: n(a.palms, b.palms), gl: n(a.gl, b.gl), gr: n(a.gr, b.gr), tap: e < 0.5 ? a.tap : b.tap };
}
/** A hand hanging easy at the side (+1 the left). */
const atSide = (f: Frame, side: number) => f.bd(side * 0.2 * f.k, 0.5 * f.H, 0.06 * f.k);
const chestY = (f: Frame) => (f.sitting ? 0.3 : 0.7) * f.H;
const mouthY = (f: Frame) => (f.sitting ? 0.46 : 0.86) * f.H;

type KeyFn = (key: string, f: Frame, u: number, t: number, s: number) => Hands;
interface Round {
  seq: Seq;
  key: KeyFn;
  /** How far the spot turns from facing the piece square on (to their left +), by the beat. */
  turn: (b: Beat) => number;
}
/** A turn eased from one beat's to the next's. */
const turning = (by: Record<string, number>) => (b: Beat) => (by[b.from] ?? 0) + ((by[b.to] ?? 0) - (by[b.from] ?? 0)) * b.e;

// ---------------------------------------------------------------------------------------------
// The CCTV console.

/**
 * The CCTV controller on the console (its middle is the work point; piece axes, the operator sat at
 * +z facing -z, so their left is the piece's -x): the camera keypad to their left, the PTZ joystick
 * to their right, the log sheet beyond it. Offsets in the piece's axes.
 */
export const CCTV = {
  pad: [-0.09, 0.016, 0.0] as const,
  /** The joystick's pivot (top of the controller's housing) and its stick's length to the knob. */
  joy: [0.1, 0.03, 0.0] as const,
  stick: 0.075,
  log: [0.36, 0.0, 0.02] as const,
};
const CCTV_ROUND: Round = {
  seq: [['watch', 4], ['select', 2.2, 0.5], ['zoom', 4.2], ['watch', 2.6], ['pan', 3.4], ['note', 3], ['scan', 2.6]],
  turn: turning({ watch: 0, scan: 0.14, pan: -0.06 }),
  key(key, f, u, t, s) {
    const pad = (dx = 0, dy = 0, dz = 0) => f.o(CCTV.pad[0] + dx, CCTV.pad[1] + 0.012 + dy, CCTV.pad[2] + 0.03 + dz);
    const knob = joyKnob(f, joyTilt(key, u, t, s));
    switch (key) {
      case 'select':
        return hands({ l: pad(0.025 * wave(t, 0.9, s), 0.012 * Math.max(0, wave(t, 3.2, s)), 0.01 * wave(t, 0.7, s)), r: knob, lean: 0.2, nod: 0.32, palms: 1.2, gl: 0.4, gr: 0.85, tap: true });
      case 'zoom':
        return hands({ l: pad(), r: knob, lean: 0.17, nod: -0.2, palms: 1.0, gl: 0.3, gr: 0.9 });
      case 'pan':
        return hands({ l: pad(), r: knob, lean: 0.1, nod: -0.16, palms: 1.0, gl: 0.3, gr: 0.9 });
      case 'note':
        return hands({ l: pad(), r: f.o(CCTV.log[0] - 0.02 + 0.025 * wave(t, 2.2, s), 0.012 + 0.006 * wave(t, 4.4, s), CCTV.log[2] + 0.02 * wave(t, 1.1, s)), lean: 0.3, nod: 0.45, palms: 1.25, gl: 0.3, gr: 0.85 });
      default:
        return hands({ l: pad(), r: knob, lean: 0.05, nod: -0.17 + 0.03 * wave(t, 0.13, s), palms: 1.0, gl: 0.3, gr: 0.8 });
    }
  },
};
/** The joystick's lean (along the piece's -z: pushed away, and across: to the piece's +x) and twist, by the beat. */
function joyTilt(key: string, u: number, t: number, s: number): { push: number; across: number; twist: number } {
  switch (key) {
    case 'zoom':
      return { push: 0.12 * sm(u, 0, 0.2), across: 0, twist: 0.55 * sm(u, 0.05, 0.9) };
    case 'pan':
      return { push: 0.05, across: 0.32 * Math.sin(u * Math.PI * 2), twist: 0 };
    case 'note':
    case 'select':
      return { push: 0, across: 0, twist: 0 };
    default:
      return { push: 0.03 * wave(t, 0.11, s), across: 0.03 * wave(t, 0.07, s + 0.3), twist: 0 };
  }
}
/** The knob's top, where the hand holds it, for a lean of the stick. */
function joyKnob(f: Frame, j: { push: number; across: number }): THREE.Vector3 {
  const L = CCTV.stick;
  return f.o(CCTV.joy[0] + L * Math.sin(j.across), CCTV.joy[1] + L * Math.cos(j.push) * Math.cos(j.across) + 0.01, CCTV.joy[2] - L * Math.sin(j.push));
}
/** What the console shows: the camera called up on the big monitor (counting up), how far it's zoomed (1 up) and panned (-1–1); the stick's lean. */
export function cctvAt(t: number, ph: number): { cam: number; zoom: number; pan: number; push: number; across: number; twist: number; key: string } {
  const b = beatOf(CCTV_ROUND.seq, t, ph);
  const s = ph * 7.1;
  const j = joyTilt(b.from, b.e > 0 ? 1 : b.u, t, s);
  const jt = b.e > 0 ? joyTilt(b.to, 0, t, s) : j;
  const lerp = (p: number, q: number) => p + (q - p) * b.e;
  const switched = b.i > 1 || (b.i === 1 && b.u > 0.45);
  const cam = b.n * 2 + (switched ? 1 : 0);
  const zoom = b.i === 0 || (b.i === 1 && !switched) ? 2.3 : b.i === 1 ? 1 : b.i === 2 ? 1 + 1.3 * sm(b.e > 0 ? 1 : b.u, 0.05, 0.9) : 2.3;
  const pan = b.i === 4 ? 0.8 * Math.sin((b.e > 0 ? 1 : b.u) * Math.PI * 2) : 0;
  return { cam, zoom, pan, push: lerp(j.push, jt.push), across: lerp(j.across, jt.across), twist: lerp(j.twist, jt.twist), key: b.from };
}

// ---------------------------------------------------------------------------------------------
// The key cabinet.

/** The hooks a key's taken from in turn (offsets from the work point, the 수불대장 on the ledge, in the piece's axes). */
export const KEY_HOOKS: Array<readonly [number, number, number]> = [
  [-0.135, 0.46, -0.07],
  [0.045, 0.34, -0.07],
  [0.135, 0.58, -0.07],
  [-0.045, 0.58, -0.07],
  [0.135, 0.22, -0.07],
];
const KEYS_ROUND: Round = {
  seq: [['scan', 3.2], ['take', 1.2, 0.5], ['look', 1.6], ['hand', 3, 0.9], ['sign', 4.2, 0.9], ['wait', 1.6]],
  turn: turning({ hand: -0.6 }),
  key(key, f, u, t, s) {
    const ledgeL = f.o(-0.17, 0.012, 0.03);
    switch (key) {
      case 'scan': {
        const h = KEY_HOOKS[0];
        return hands({ l: ledgeL, r: f.o(-0.18 + 0.36 * (0.5 + 0.5 * Math.sin(u * Math.PI * 1.5 - 0.6)), h[1] + 0.05 * wave(t, 0.4, s), h[2] + 0.05), lean: 0.06, nod: -0.06, palms: 0.4, gl: 0.3, gr: 0.2 });
      }
      case 'take':
        return hands({ l: ledgeL, r: f.o(0, 0, 0), lean: 0.08, nod: -0.05, palms: 0.4, gl: 0.3, gr: 0.75 });
      case 'look':
        return hands({ l: ledgeL, r: f.bd(-0.06 * f.k, chestY(f) + 0.04 * f.k, 0.3 * f.k), lean: 0.03, nod: 0.18, palms: 0.2, gl: 0.3, gr: 0.75 });
      case 'hand':
        return hands({ l: atSide(f, 1), r: f.bd(-0.1 * f.k, chestY(f) - 0.06 * f.k, 0.45 * f.k), lean: 0.06, nod: 0.06, palms: 0.1, gl: 0.3, gr: 0.6 });
      case 'sign':
        return hands({ l: f.o(-0.13, 0.008, 0.02), r: f.o(0.02 + 0.025 * wave(t, 2.2, s), 0.012 + 0.006 * wave(t, 4.4, s), 0.03 + 0.02 * wave(t, 1.1, s)), lean: 0.32, nod: 0.5, palms: 1.25, gl: 0.3, gr: 0.85 });
      default:
        return hands({ l: f.o(-0.13, 0.008, 0.02), r: f.o(0.15, 0.01, 0.04), lean: 0.12, nod: 0.2, palms: 1.2, gl: 0.3, gr: 0.4 });
    }
  },
};
/** Where the key being signed out is: on its hook (which one), in the hand (where), or out with whoever took it. */
export function keyAt(f: Frame, t: number, ph: number): { hook: number; where: 'hook' | 'hand' | 'out'; at?: THREE.Vector3 } {
  const b = beatOf(KEYS_ROUND.seq, t, ph);
  const hook = ((b.n % KEY_HOOKS.length) + KEY_HOOKS.length) % KEY_HOOKS.length;
  const inHand = (b.i === 1 && (b.u > 0.55 || b.e > 0)) || b.i === 2 || (b.i === 3 && b.e < 0.3);
  if (b.i >= 3 && !inHand) return { hook, where: 'out' };
  if (!inHand) return { hook, where: 'hook' };
  return { hook, where: 'hand', at: poseOf(KEYS_ROUND, f, t, ph, hook).r!.clone().add(new THREE.Vector3(0, -0.05, 0)) };
}

// ---------------------------------------------------------------------------------------------
// The alarm and fire panels.

/** The panel's controls from its work point (the middle of its control strip), in the piece's axes: the lit zone on the map, 확인, 복구. */
export const PANEL = {
  zone: [-0.12, 0.3, -0.07] as const,
  ack: [0.14, 0.0, 0.0] as const,
  reset: [0.26, 0.0, 0.0] as const,
};
const ALARM_ROUND: Round = {
  seq: [['look', 2.4], ['trace', 3.2], ['ack', 1.4, 0.5], ['radio', 4.4, 0.8], ['listen', 2.8], ['reset', 1.4, 0.5], ['check', 2.2]],
  turn: turning({ radio: 0.12, listen: 0.12 }),
  key(key, f, u, t, s) {
    const edgeL = f.o(-0.32, -0.05, 0.03);
    const edgeR = f.o(0.34, -0.05, 0.03);
    const press = (c: readonly [number, number, number]) => f.o(c[0], c[1] + 0.012, c[2] + 0.025 - 0.012 * sm(u, 0.3, 0.5) * (1 - sm(u, 0.7, 0.9)));
    const radioUp = f.bd(0.07 * f.k, mouthY(f) - 0.05 * f.k, 0.15 * f.k);
    switch (key) {
      case 'trace':
        return hands({ l: edgeL, r: f.o(PANEL.zone[0] + 0.05 * wave(t, 0.35, s), PANEL.zone[1] + 0.03 * wave(t, 0.5, s), PANEL.zone[2] + 0.03), lean: 0.06, nod: -0.1, palms: 0.3, gl: 0.5, gr: 0.2 });
      case 'ack':
        return hands({ l: edgeL, r: press(PANEL.ack), lean: 0.08, nod: 0.1, palms: 0.6, gl: 0.5, gr: 0.25 });
      case 'reset':
        return hands({ l: edgeL, r: press(PANEL.reset), lean: 0.08, nod: 0.1, palms: 0.6, gl: 0.5, gr: 0.25 });
      case 'radio':
        return hands({ l: radioUp.clone().add(new THREE.Vector3(0, 0.006 * wave(t, 1.3, s), 0)), r: edgeR, lean: 0.02, nod: 0.02 + 0.04 * Math.max(0, wave(t, 0.9, s)), palms: 0.1, gl: 0.85, gr: 0.5 });
      case 'listen':
        return hands({ l: f.bd(0.1 * f.k, chestY(f) + 0.1 * f.k, 0.2 * f.k), r: edgeR, lean: 0.03, nod: 0.12, palms: 0.1, gl: 0.85, gr: 0.5 });
      case 'check':
        return hands({ l: edgeL, r: f.o(0.0 + 0.08 * wave(t, 0.3, s), 0.16, -0.04), lean: 0.06, nod: -0.04, palms: 0.3, gl: 0.5, gr: 0.2 });
      default:
        return hands({ l: edgeL, r: edgeR, lean: 0.07, nod: -0.06 + 0.04 * wave(t, 0.2, s), palms: 1.0, gl: 0.55, gr: 0.55 });
    }
  },
};
/** The panel's state: acknowledged (the buzzer stopped) since 확인 till 복구, and the guard's radio up in the left hand. */
export function panelAt(f: Frame, t: number, ph: number): { acked: boolean; reset: boolean; radio?: THREE.Vector3; key: string; u: number } {
  const b = beatOf(ALARM_ROUND.seq, t, ph);
  const acked = (b.i === 2 && b.u > 0.45) || (b.i > 2 && b.i < 5) || (b.i === 5 && b.u < 0.45);
  const reset = (b.i === 5 && b.u >= 0.45) || b.i === 6;
  const up = (b.i === 2 && b.e > 0.4) || b.i === 3 || (b.i === 4 && b.e < 0.5);
  const h = up ? poseOf(ALARM_ROUND, f, t, ph) : null;
  return { acked, reset, radio: h?.l?.clone().add(new THREE.Vector3(0, 0.02, 0)), key: b.from, u: b.e > 0 ? 1 : b.u };
}

// ---------------------------------------------------------------------------------------------
// The radio charging rack.

const RADIO_ROUND: Round = {
  seq: [['reach', 1.0, 0.6], ['check', 2.4, 0.6], ['talk', 3.6, 0.6], ['listen', 3.0, 0.6], ['back', 1.0, 0.6], ['tidy', 1.8]],
  turn: turning({ talk: 0.25, listen: 0.25 }),
  key(key, f, _u, t, s) {
    switch (key) {
      case 'reach':
      case 'back':
        return hands({ l: f.o(-0.22, -0.2, 0.08), r: f.o(0, 0.02, 0.01), lean: 0.06, nod: 0.12, palms: 0.3, gl: 0.3, gr: 0.75 });
      case 'check': {
        const r = f.bd(-0.03 * f.k, chestY(f) + 0.02 * f.k, 0.27 * f.k);
        return hands({ l: r.clone().add(new THREE.Vector3(0, 0.02 + 0.008 * Math.max(0, wave(t, 2.5, s)), 0)).add(f.bd(0.03 * f.k, 0, 0).sub(f.bd(0, 0, 0))), r, lean: 0.04, nod: 0.38, palms: 0.4, gl: 0.4, gr: 0.8 });
      }
      case 'talk':
        return hands({ l: atSide(f, 1), r: f.bd(-0.05 * f.k, mouthY(f) - 0.05 * f.k, 0.14 * f.k), lean: 0.02, nod: 0.04 + 0.04 * Math.max(0, wave(t, 0.9, s)), palms: 0.1, gl: 0.3, gr: 0.85 });
      case 'listen':
        return hands({ l: atSide(f, 1), r: f.bd(-0.1 * f.k, chestY(f) + 0.12 * f.k, 0.2 * f.k), lean: 0.02, nod: 0.12, palms: 0.1, gl: 0.3, gr: 0.85 });
      default:
        return hands({ l: f.o(-0.2, 0.05, 0.08), r: f.o(0.15, -0.25, 0.1), lean: 0.05, nod: 0.15, palms: 0.4, gl: 0.3, gr: 0.4 });
    }
  },
};
/** The radio taken off the rack: in the right hand (where) or in its slot. */
export function radioAt(f: Frame, t: number, ph: number): { held: boolean; at?: THREE.Vector3; key: string } {
  const b = beatOf(RADIO_ROUND.seq, t, ph);
  const held = (b.i === 0 && b.e > 0) || (b.i >= 1 && b.i <= 3) || (b.i === 4 && b.e === 0 && b.u < 0.4);
  if (!held) return { held: false, key: b.from };
  return { held, at: poseOf(RADIO_ROUND, f, t, ph).r!.clone(), key: b.from };
}

// ---------------------------------------------------------------------------------------------
// A patrol checkpoint and the speed gate.

const TAG_ROUND: Round = {
  seq: [['ready', 1.4], ['tag', 2.0, 0.5], ['read', 1.8], ['lookL', 2.6, 0.9], ['lookR', 2.6, 0.9], ['done', 1.2]],
  turn: turning({ lookL: 0.75, lookR: -0.75 }),
  key(key, f, u, t, s) {
    const torchDown = f.bd(0.2 * f.k, 0.52 * f.H, 0.1 * f.k);
    switch (key) {
      case 'tag':
        return hands({ l: torchDown, r: f.o(0, 0, 0.05 - 0.02 * sm(u, 0.1, 0.3)), lean: 0.05, nod: 0.02, palms: 0.2, gl: 0.8, gr: 0.85 });
      case 'read':
        return hands({ l: torchDown, r: f.bd(-0.04 * f.k, chestY(f) - 0.02 * f.k, 0.28 * f.k), lean: 0.03, nod: 0.36, palms: 0.5, gl: 0.8, gr: 0.85 });
      case 'lookL':
      case 'lookR':
        return hands({ l: f.bd(0.12 * f.k, chestY(f) + 0.03 * f.k + 0.01 * wave(t, 0.6, s), 0.36 * f.k), r: f.bd(-0.2 * f.k, 0.52 * f.H, 0.08 * f.k), lean: 0.04, nod: 0.05, palms: 0.2, gl: 0.85, gr: 0.85 });
      default:
        return hands({ l: torchDown, r: f.bd(-0.14 * f.k, 0.6 * f.H, 0.22 * f.k), lean: 0.02, nod: 0.08, palms: 0.4, gl: 0.8, gr: 0.85 });
    }
  },
};
const GATE_ROUND: Round = {
  seq: [['tap', 1.8, 0.5], ['open', 1.4], ['wave', 3.0, 0.8], ['watch', 2.6, 0.8]],
  turn: turning({ wave: -0.35, watch: -0.2 }),
  key(key, f, u, t, s) {
    const cardIn = f.bd(-0.14 * f.k, 0.6 * f.H, 0.22 * f.k);
    switch (key) {
      case 'tap':
        return hands({ l: atSide(f, 1), r: f.o(0, 0.06 - 0.03 * sm(u, 0.1, 0.35), 0), lean: 0.12, nod: 0.3, palms: 1.2, gl: 0.3, gr: 0.85 });
      case 'open':
        return hands({ l: atSide(f, 1), r: cardIn, lean: 0.05, nod: 0.3, palms: 0.4, gl: 0.3, gr: 0.85 });
      case 'wave':
        return hands({ l: f.bd((0.32 + 0.07 * wave(t, 0.8, s)) * f.k, chestY(f) + 0.02 * f.k, 0.38 * f.k), r: cardIn, lean: 0.03, nod: -0.03, palms: -0.9, gl: 0.05, gr: 0.85 });
      default:
        return hands({ l: f.bd(0.035 * f.k, 0.53 * f.H, 0.16 * f.k), r: f.bd(-0.035 * f.k, 0.535 * f.H, 0.165 * f.k), lean: 0.03, nod: 0.06, palms: 0.6, gl: 0.45, gr: 0.85 });
    }
  },
};
/** A checkpoint's tag: the reader's light (green and beeping just after the wand's touched), the wand in the right hand, the torch in the left (shining while it's up). */
export function tagAt(f: Frame, t: number, ph: number): { beep: boolean; wand: THREE.Vector3; torch: THREE.Vector3; shine: boolean; yaw: number } {
  const b = beatOf(TAG_ROUND.seq, t, ph);
  const h = poseOf(TAG_ROUND, f, t, ph);
  const beep = (b.i === 1 && b.u > 0.32) || (b.i === 2 && b.u < 0.3);
  const shine = b.i === 3 || b.i === 4 || (b.i === 2 && b.e > 0.5);
  return { beep, wand: h.r!.clone(), torch: h.l!.clone(), shine, yaw: TAG_ROUND.turn(b) };
}
/** The speed gate: its flaps (0 shut, 1 open), its reader's light, the card in the right hand. */
export function gateAt(f: Frame, t: number, ph: number): { open: number; ok: boolean; card: THREE.Vector3 } {
  const b = beatOf(GATE_ROUND.seq, t, ph);
  const h = poseOf(GATE_ROUND, f, t, ph);
  const v = b.i + (b.e > 0 ? 0.6 + 0.4 * b.e : b.u * 0.6);
  const open = sm(v, 0.35, 0.75) * (1 - sm(v, 2.9, 3.3));
  return { open, ok: v > 0.3 && v < 3.2, card: h.r!.clone() };
}

// ---------------------------------------------------------------------------------------------
// The visitor desk.

/** From the keyboard (the work point), in the desk's axes: the badge printer's slot, where the ID lies while it's typed in, where things are passed over the counter. */
export const DESK = {
  printer: [0.42, 0.13, -0.04] as const,
  id: [-0.28, 0.003, -0.02] as const,
  over: [0, 0.27, -0.36] as const,
};
const BADGE_ROUND: Round = {
  seq: [['take', 2.4, 0.8], ['type', 4.2, 0.6], ['print', 1.8, 0.6], ['clip', 2.0, 0.7], ['give', 2.6, 0.8], ['point', 2.4, 0.8], ['wait', 1.6]],
  turn: turning({ point: 0.3 }),
  key(key, f, u, t, s) {
    const kb = (side: number, p: number) => f.o(side, 0.012 + 0.012 * Math.max(0, wave(t, 6.5, s + p)), 0.02);
    switch (key) {
      case 'take':
        return hands({ l: f.o(DESK.over[0] - 0.08, DESK.over[1], DESK.over[2] + 0.06 * sm(u, 0.4, 1)), r: f.o(0.18, 0.01, 0.05), lean: 0.22, nod: 0.12, palms: 0.9, gl: 0.6, gr: 0.3 });
      case 'type':
        return hands({ l: kb(-0.12, 0), r: kb(0.12, 0.5), lean: 0.2, nod: 0.36, palms: 1.45, gl: 0.35, gr: 0.35, tap: true });
      case 'print':
        return hands({ l: kb(-0.12, 0), r: f.o(DESK.printer[0], DESK.printer[1], DESK.printer[2] + 0.05), lean: 0.18, nod: 0.36, palms: 0.9, gl: 0.35, gr: 0.75 });
      case 'clip':
        return hands({ l: f.bd(0.06 * f.k, chestY(f) - 0.08 * f.k, 0.3 * f.k), r: f.bd(-0.06 * f.k, chestY(f) - 0.06 * f.k, 0.3 * f.k), lean: 0.06, nod: 0.38, palms: 0.6, gl: 0.7, gr: 0.7 });
      case 'give':
        return hands({ l: f.o(DESK.over[0] + 0.06, DESK.over[1], DESK.over[2] + 0.04), r: f.o(DESK.over[0] - 0.06, DESK.over[1], DESK.over[2] + 0.04), lean: 0.26, nod: 0.1, palms: 0.9, gl: 0.6, gr: 0.6 });
      case 'point':
        return hands({ l: f.bd(0.45 * f.k, chestY(f) + 0.08 * f.k + 0.02 * wave(t, 0.5, s), 0.4 * f.k), r: f.o(0.18, 0.01, 0.05), lean: 0.04, nod: -0.05, palms: -0.9, gl: 0.1, gr: 0.3 });
      default:
        return hands({ l: f.o(-0.15, 0.01, 0.06), r: f.o(0.15, 0.01, 0.06), lean: 0.1, nod: 0.1, palms: 1.2, gl: 0.35, gr: 0.35 });
    }
  },
};
/** The visit: the ID card (in the left hand, on the desk, held out with the badge, or gone back), the 방문증 (in the printer, in the hands, out). */
export function badgeAt(f: Frame, t: number, ph: number): { id: 'hand' | 'desk' | 'out' | 'none'; badge: 'printer' | 'hand' | 'none'; l: THREE.Vector3; r: THREE.Vector3; mid: THREE.Vector3; printing: boolean } {
  const b = beatOf(BADGE_ROUND.seq, t, ph);
  const h = poseOf(BADGE_ROUND, f, t, ph);
  const id = b.i === 0 ? (b.u > 0.45 || b.e > 0 ? 'hand' : 'none') : b.i <= 3 ? 'desk' : b.i === 4 ? (b.e > 0.5 ? 'none' : 'out') : 'none';
  const badge = b.i === 2 ? (b.u > 0.5 || b.e > 0 ? 'hand' : 'printer') : b.i === 3 || (b.i === 4 && b.e < 0.5) ? 'hand' : b.i === 1 && b.u > 0.7 ? 'printer' : 'none';
  return { id, badge, l: h.l!.clone(), r: h.r!.clone(), mid: h.l!.clone().lerp(h.r!, 0.5), printing: b.i === 1 && b.u > 0.7 };
}

// ---------------------------------------------------------------------------------------------

const ROUNDS: Record<SecurityMotion, Round> = {
  sgCctv: CCTV_ROUND,
  sgKeys: KEYS_ROUND,
  sgAlarm: ALARM_ROUND,
  sgRadio: RADIO_ROUND,
  sgTag: TAG_ROUND,
  sgGate: GATE_ROUND,
  sgBadge: BADGE_ROUND,
};
function poseOf(R: Round, f: Frame, t: number, ph: number, hook?: number): Hands {
  const b = beatOf(R.seq, t, ph);
  const s = ph * 7.1;
  // The key cabinet's take reaches to this round's hook.
  const keyFn: KeyFn = R === KEYS_ROUND ? (key, fr, u, tt, ss) => keyHands(key, fr, u, tt, ss, hook ?? ((b.n % KEY_HOOKS.length) + KEY_HOOKS.length) % KEY_HOOKS.length) : R.key;
  const a = keyFn(b.from, f, b.e > 0 ? 1 : b.u, t, s);
  return b.e > 0 ? mix(a, keyFn(b.to, f, 0, t, s), b.e) : a;
}
function keyHands(key: string, f: Frame, u: number, t: number, s: number, hook: number): Hands {
  const h = KEYS_ROUND.key(key, f, u, t, s);
  if (key !== 'take') return h;
  const k = KEY_HOOKS[hook];
  return { ...h, r: f.o(k[0], k[1] - 0.02, k[2] + 0.03) };
}
/** The spot's turn from square on now (the motion's own round). */
export const sgTurn = (m: SecurityMotion, t: number, ph: number) => ROUNDS[m].turn(beatOf(ROUNDS[m].seq, t, ph));
/** The hands for a motion worked out in a frame (the builder puts what's held in them). */
export const sgHands = (m: SecurityMotion, f: Frame, t: number, ph: number) => poseOf(ROUNDS[m], f, t, ph);

/**
 * A dweller doing one of these: the frame from where they are and the piece's work point. Every spot of
 * these faces its piece square on (its yaw π in the piece's frame) turned by sgTurn, so the piece's
 * own turn is the body's less that.
 */
export function securityDoing(m: SecurityMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const R = ROUNDS[m];
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.35).setY(b.base.y + (b.sitting ? 0.28 : 0.9));
  const ph = sgPhase(p);
  const f = frameAt(p, b.yaw - Math.PI - R.turn(beatOf(R.seq, t, ph)), b.base, b.yaw, b.height, b.sitting);
  const h = poseOf(R, f, t, ph);
  return { reach: { l: h.l, r: h.r, lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap } };
}
