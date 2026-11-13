import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';
import { beatOf, type Beat } from './busDriverMotion';
import type { Key, Loc } from './childcareMotion';

/*
 * A day at the small home-style 어린이집 (2026-11-01, the workplace pipeline, at the user's request), the made-up
 * 포근둥지. Each motion is a round of beats, each held and eased into the next; the piece reads the same clock
 * (bsPhase of the spot, workplaces/babysitter.ts), so the plate in the hand is the plate set down. Every place is in
 * the spot's own frame: [to the dweller's left, up from the feet (stood) or the seat (sat), ahead].
 *
 * - bsNappy (기저귀 교환대): no child on it. The empty pad sprayed and wiped down, a nappy lifted from the carton into
 *   the caddy, the record ticked, the hands sanitised and rubbed. The child's own care stays off screen on purpose.
 * - bsServe (간식 상): sat on the low stool, a plate from the tray set before each of four children; hands together,
 *   잘 먹겠습니다; the oilcloth wiped, then watching them eat.
 * - bsPretend (소꿉놀이 코너): sat cross-legged on the mat. A toddler stirs a toy pot, carries the plate over; it's taken,
 *   a pretend spoonful, 냠냠 with a pat of the tummy, a clap, and the toddler goes back to cook another.
 * - bsNote (알림장 책상): a notebook off the stack, opened, today's lines written, a sticker pressed on, closed, filed.
 * - bsGreet (현관): a bow to the parent, the bag taken, a crouch to the child's height, the thermometer at the forehead,
 *   36.5, a high five, a wave to the parent.
 */
export type BsMotion = 'bsNappy' | 'bsServe' | 'bsPretend' | 'bsNote' | 'bsGreet';
export const BS_MOTIONS = new Set<string>(['bsNappy', 'bsServe', 'bsPretend', 'bsNote', 'bsGreet']);
export type { Beat };

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The same clock offset for the piece and the dweller: from where they're placed, so two pieces aren't in step. */
export const bsPhase = (p: THREE.Vector3) => frac(p.x * 0.347 + p.z * 0.631);
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
const pulse = (t: number, hz: number, ph = 0, sharp = 3) => Math.max(0, wave(t, hz, ph)) ** sharp;
const mixLoc = (a: Loc, b: Loc, e: number): Loc => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
function mixKey(a: Key, b: Key, e: number): Key {
  const m = (q: number, r: number) => q + (r - q) * e;
  return { l: mixLoc(a.l, b.l, e), r: mixLoc(a.r, b.r, e), lean: m(a.lean, b.lean), nod: m(a.nod, b.nod), palms: m(a.palms, b.palms), gl: m(a.gl, b.gl), gr: m(a.gr, b.gr), crouch: m(a.crouch ?? 0, b.crouch ?? 0) };
}

type Seq = Array<[string, number, number?]>;
const SEQ: Record<BsMotion, Seq> = {
  bsNappy: [['spray', 1.5, 0.5], ['wipe', 3.6, 0.6], ['carton', 1.2, 0.7], ['stack', 1.1, 0.6], ['chart', 2.2, 0.6], ['pump', 0.9, 0.4], ['rub', 1.8, 0.7]],
  bsServe: [['give0', 1.7, 0.4], ['give1', 1.7, 0.4], ['give2', 1.7, 0.4], ['give3', 1.7, 0.6], ['grace', 2.4, 0.6], ['wipe', 2.4, 0.6], ['watch', 3.4, 0.7]],
  bsPretend: [['cook', 4.5, 0.3], ['carry', 1.2, 0.3], ['take', 1.2, 0.5], ['eat', 2.4, 0.5], ['yum', 1.6, 0.5], ['clap', 1.6, 0.3], ['back', 1.2, 0.3]],
  bsNote: [['take', 1, 0.5], ['open', 0.8, 0.4], ['write', 5.4, 0.5], ['stick', 1.3, 0.5], ['close', 0.8, 0.4], ['file', 0.9, 0.6]],
  bsGreet: [['bow', 1.7, 0.6], ['bag', 1.5, 0.6], ['pick', 0.9, 0.7], ['scan', 2.2, 0.3], ['read', 1.2, 0.5], ['five', 1.4, 0.8], ['wave', 2.2, 0.8]],
};
export const bsBeat = (m: BsMotion, t: number, phase: number): Beat => beatOf(SEQ[m], t, phase);
/** In beat `k`, held or most of the way into it. */
export const inBeat = (b: Beat, k: string) => (b.from === k && b.e < 0.5) || (b.to === k && b.e >= 0.5);

// ---------------------------------------------------------------------------------------------
// 기저귀 교환대: stood at the counter.

export const NP = { stand: 0.2, pad: [0, 0.93, 0.42] as Loc, bottle: [0.36, 0.95, 0.5] as Loc, clip: [0.33, 0.93, 0.28] as Loc, pump: [-0.33, 1.04, 0.56] as Loc, caddy: [-0.33, 1.01, 0.34] as Loc, carton: [-0.42, 0.3, 0.1] as Loc };
function nappyKey(k: string, t: number, s: number, u: number): Key {
  const P = NP.pad;
  const rest: Loc = [0.2, 0.92, 0.2];
  switch (k) {
    case 'spray':
      return { l: [P[0] + 0.2, P[1] + 0.01, P[2] - 0.12], r: [P[0] + 0.02, P[1] + 0.2 + 0.015 * pulse(t, 2.4, s), P[2] - 0.1], lean: 0.15, nod: 0.45, palms: 0.5, gl: 0.3, gr: 0.75 };
    case 'wipe': {
      // Long strokes from one end of the pad to the other, working back.
      const a = wave(u, 2.5);
      return { l: [P[0] + 0.25, P[1] + 0.005, P[2] - 0.16], r: [P[0] + 0.14 * a, P[1] + 0.012, P[2] - 0.08 + 0.17 * u], lean: 0.28, nod: 0.52, palms: 1.5, gl: 0.3, gr: 0.45 };
    }
    case 'carton': {
      const c = NP.carton;
      return { l: [c[0] + 0.1, c[1] + 0.06, c[2] + 0.02], r: [c[0] - 0.05, c[1] + 0.03, c[2] + 0.02], lean: 0.3, nod: 0.55, palms: 1, gl: 0.5, gr: 0.75, crouch: 0.85 };
    }
    case 'stack': {
      const c = NP.caddy;
      return { l: rest, r: [c[0], c[1] + 0.06, c[2] - 0.02], lean: 0.14, nod: 0.42, palms: 0.9, gl: 0.3, gr: 0.75 };
    }
    case 'chart': {
      const c = NP.clip;
      return { l: [c[0] + 0.1, c[1] + 0.02, c[2]], r: [c[0] - 0.04 + 0.05 * wave(t, 0.7, s), c[1] + 0.03 + 0.006 * wave(t, 3, s), c[2] + 0.02], lean: 0.2, nod: 0.56, palms: 1.3, gl: 0.3, gr: 0.85 };
    }
    case 'pump': {
      const c = NP.pump;
      return { l: [-0.06, 1.0, 0.3], r: [c[0], c[1] + 0.08 - 0.03 * pulse(t, 1.4, s), c[2] - 0.04], lean: 0.2, nod: 0.3, palms: 1.5, gl: 0.1, gr: 0.2 };
    }
    default: {
      // Sanitiser rubbed over both hands.
      const a = t * Math.PI * 2 * 1.4 + s;
      return { l: [0.05 + 0.025 * Math.cos(a), 1.04 + 0.015 * Math.sin(a), 0.26], r: [-0.05 - 0.025 * Math.cos(a), 1.04 - 0.015 * Math.sin(a), 0.26], lean: 0, nod: 0.25, palms: 0.2, gl: 0.3, gr: 0.3 };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 간식 상: sat on the low stool at the front of the table.

export const SV = {
  /** The tray and each child's place (frame of the stool's top). */
  tray: [0, 0.14, 0.32] as Loc,
  places: [[0.28, 0.14, 0.58], [-0.28, 0.14, 0.58], [0.52, 0.14, 0.4], [-0.52, 0.14, 0.4]] as Loc[],
};
function serveKey(k: string, t: number, s: number, u: number): Key {
  const knee = (d: number): Loc => [d * 0.16, 0.14, 0.24];
  if (k.startsWith('give')) {
    const p = SV.places[Number(k[4])];
    const left = p[0] > 0;
    const at = mixLoc([SV.tray[0] + (left ? 0.08 : -0.08), SV.tray[1] + 0.04, SV.tray[2]], [p[0], p[1] + 0.03, p[2] - 0.02], THREE.MathUtils.smoothstep(u, 0.25, 0.75));
    return left ? { l: at, r: knee(-1), lean: 0.3, nod: 0.42, palms: 1, gl: 0.75, gr: 0.3 } : { l: knee(1), r: at, lean: 0.3, nod: 0.42, palms: 1, gl: 0.3, gr: 0.75 };
  }
  switch (k) {
    case 'grace':
      return { l: [0.012, 0.4, 0.24], r: [-0.012, 0.4, 0.24], lean: 0.12, nod: 0.25 + 0.18 * pulse(t, 0.8, s, 2), palms: 0.1, gl: 0.05, gr: 0.05 };
    case 'wipe':
      return { l: knee(1), r: [-0.3 + 0.6 * (0.5 + 0.5 * wave(u, 1.5)), SV.tray[1] + 0.012, 0.25], lean: 0.26, nod: 0.46, palms: 1.5, gl: 0.3, gr: 0.45 };
    default:
      return { l: knee(1), r: knee(-1), lean: 0.08, nod: 0.12 + 0.05 * wave(t, 0.3, s), palms: 1.3, gl: 0.3, gr: 0.3 };
  }
}
/** Which plates are set down this round, and which is in hand (or -1). */
export function serveOf(b: Beat): { set: number; inHand: number; left: boolean; eating: boolean; grace: boolean } {
  const give = b.i <= 3 ? b.i : -1;
  const placed = give >= 0 && (b.e > 0 || b.u > 0.72);
  const inHand = give >= 0 && !placed && b.u > 0.2 ? give : -1;
  return { set: give < 0 ? 4 : give + (placed ? 1 : 0), inHand, left: inHand >= 0 && SV.places[inHand][0] > 0, eating: b.i >= 5, grace: b.i === 4 };
}

// ---------------------------------------------------------------------------------------------
// 소꿉놀이: sat cross-legged on the mat, the toddler comes and goes.

export const PR = { take: [0, 0.34, 0.33] as Loc, mouth: [0.0, 0.64, 0.14] as Loc };
function pretendKey(k: string, t: number, s: number): Key {
  const knee = (d: number): Loc => [d * 0.2, 0.08, 0.22];
  switch (k) {
    case 'take':
      return { l: [PR.take[0] + 0.07, PR.take[1], PR.take[2]], r: [PR.take[0] - 0.07, PR.take[1], PR.take[2]], lean: 0.25, nod: 0.3, palms: 1.2, gl: 0.6, gr: 0.6 };
    case 'eat': {
      const up = pulse(t, 0.8, s, 2);
      const r = mixLoc([-0.08, 0.34, 0.3], PR.mouth, up);
      return { l: [PR.take[0] + 0.06, PR.take[1] - 0.04, PR.take[2] - 0.06], r, lean: 0.1, nod: 0.2 - 0.1 * up, palms: 0.9, gl: 0.6, gr: 0.8 };
    }
    case 'yum':
      return { l: [PR.take[0] + 0.1, PR.take[1], PR.take[2] - 0.02], r: [-0.03, 0.34 + 0.02 * pulse(t, 2, s, 2), 0.14], lean: -0.04, nod: -0.05 + 0.1 * wave(t, 1.2, s), palms: 0.4, gl: 0.6, gr: 0.1 };
    case 'clap': {
      const c = 0.04 * Math.abs(wave(t, 2.2, s));
      return { l: [0.03 + c, 0.42, 0.26], r: [-0.03 - c, 0.42, 0.26], lean: 0.05, nod: -0.05, palms: 0.05, gl: 0.05, gr: 0.05 };
    }
    default:
      return { l: knee(1), r: knee(-1), lean: 0.14, nod: 0.12 + 0.05 * wave(t, 0.3, s), palms: 1.3, gl: 0.3, gr: 0.3 };
  }
}

// ---------------------------------------------------------------------------------------------
// 알림장 책상: sat at the desk.

export const NT = { pad: [0, 0.29, 0.44] as Loc, stack: [0.32, 0.31, 0.42] as Loc, done: [-0.32, 0.31, 0.42] as Loc, stickers: [-0.14, 0.29, 0.58] as Loc };
function noteKey(k: string, t: number, s: number, u: number): Key {
  const P = NT.pad;
  const hold: Loc = [P[0] + 0.14, P[1] + 0.01, P[2] - 0.02];
  switch (k) {
    case 'take':
      return { l: [NT.stack[0], NT.stack[1] + 0.03, NT.stack[2]], r: [-0.12, P[1] + 0.02, 0.36], lean: 0.2, nod: 0.3, palms: 1.1, gl: 0.75, gr: 0.3 };
    case 'open':
      return { l: hold, r: [P[0] - 0.05 - 0.08 * u, P[1] + 0.02 + 0.06 * Math.sin(u * Math.PI), P[2]], lean: 0.2, nod: 0.45, palms: 1.2, gl: 0.3, gr: 0.6 };
    case 'stick': {
      const a = THREE.MathUtils.smoothstep(u, 0.25, 0.6);
      const r = mixLoc([NT.stickers[0], NT.stickers[1] + 0.02, NT.stickers[2]], [P[0] - 0.14, P[1] + 0.012 + 0.012 * pulse(t, 2.4, s), P[2] + 0.075], a);
      return { l: hold, r, lean: 0.26, nod: 0.5, palms: 1.5, gl: 0.3, gr: 0.6 };
    }
    case 'close':
      return { l: [P[0] + 0.1, P[1] + 0.02, P[2]], r: [P[0] - 0.12 + 0.2 * u, P[1] + 0.02 + 0.07 * Math.sin(u * Math.PI), P[2]], lean: 0.2, nod: 0.42, palms: 1.2, gl: 0.3, gr: 0.6 };
    case 'file':
      return { l: [0.12, P[1] + 0.01, 0.34], r: [NT.done[0], NT.done[1] + 0.03, NT.done[2]], lean: 0.2, nod: 0.28, palms: 1.1, gl: 0.3, gr: 0.75 };
    default: {
      // Writing line by line, down the right-hand page.
      const line = Math.floor(u * 4);
      const across = frac(u * 4);
      return { l: hold, r: [P[0] + 0.0 - 0.14 * across, P[1] + 0.012 + 0.004 * wave(t, 4, s), P[2] + 0.06 - line * 0.035], lean: 0.3, nod: 0.56, palms: 1.35, gl: 0.3, gr: 0.85 };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 현관: stood facing the child, the parent beyond.

export const GR = { stand: [0, 0, 0] as Loc, child: 0.48, parent: 1.14, cradle: [0.46, 0.92, 0.12] as Loc, head: [0.0, 0.8, 0.42] as Loc, bag: [0.05, 0.96, 0.58] as Loc };
function greetKey(k: string, t: number, s: number): Key {
  const hip = (d: number): Loc => [d * 0.2, 0.9, 0.1];
  switch (k) {
    case 'bow':
      return { l: [0.06, 0.88, 0.2], r: [-0.06, 0.88, 0.2], lean: 0.3 * pulse(t, 0.5, 0, 1) + 0.08, nod: 0.3, palms: 0.4, gl: 0.3, gr: 0.3 };
    case 'bag':
      return { l: [GR.bag[0] + 0.08, GR.bag[1], GR.bag[2]], r: [GR.bag[0] - 0.08, GR.bag[1], GR.bag[2]], lean: 0.1, nod: 0.05, palms: 0.5, gl: 0.75, gr: 0.75 };
    case 'pick':
      return { l: hip(-0.5), r: [GR.cradle[0] - 0.02, GR.cradle[1] + 0.04, GR.cradle[2]], lean: 0.1, nod: 0.3, palms: 0.8, gl: 0.3, gr: 0.75 };
    case 'scan':
      return { l: [0.14, 0.62, 0.3], r: [GR.head[0] - 0.02, GR.head[1] + 0.02 * wave(t, 0.5, s), GR.head[2] - 0.08], lean: 0.2, nod: 0.3, palms: 0.5, gl: 0.3, gr: 0.75, crouch: 0.75 };
    case 'read':
      return { l: [0.14, 0.62, 0.3], r: [-0.08, 0.78, 0.26], lean: 0.2, nod: 0.45, palms: 0.5, gl: 0.3, gr: 0.75, crouch: 0.75 };
    case 'five':
      return { l: [0.2, 0.6, 0.18], r: [-0.04, 0.9 - 0.04 * pulse(t, 1.8, s, 2), 0.36], lean: 0.14, nod: 0.1, palms: 0, gl: 0.3, gr: 0.05, crouch: 0.6 };
    default:
      return { l: hip(1), r: [-0.22 + 0.07 * wave(t, 1.5, s), 1.42, 0.2], lean: -0.02, nod: -0.05, palms: -0.2, gl: 0.3, gr: 0.05 };
  }
}

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a motion, in the spot's frame (the piece puts what's held at these). */
export function bsKey(m: BsMotion, t: number, phase: number): Key {
  const s = phase * 6.7;
  const of = (k: string, u: number): Key => {
    switch (m) {
      case 'bsNappy':
        return nappyKey(k, t, s, u);
      case 'bsServe':
        return serveKey(k, t, s, u);
      case 'bsPretend':
        return pretendKey(k, t, s);
      case 'bsNote':
        return noteKey(k, t, s, u);
      default:
        return greetKey(k, t, s);
    }
  };
  const b = bsBeat(m, t, phase);
  const a = of(b.from, b.u);
  return b.e > 0 ? mixKey(a, of(b.to, 0), b.e) : a;
}

export function bsDoing(m: BsMotion, b: BodyAt, _work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const k = bsKey(m, t, bsPhase(b.base));
  const w = (p: Loc) => b.base.clone().addScaledVector(left, p[0]).addScaledVector(fwd, p[2]).setY(b.base.y + p[1]);
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
