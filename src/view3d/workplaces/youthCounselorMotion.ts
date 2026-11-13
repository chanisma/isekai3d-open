import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';
import { beatOf, frameAt, sm, wave, type Beat, type V } from './busDriverMotion';

/**
 * 청소년수련관. The hands, loose props, participants and displays share these scores.
 * All points are in the furniture's frame, with the fixed work marker at its origin.
 * A transition interpolates the actual hand targets, so a pen never jumps to its
 * resting copy while the hand is still carrying it back. No runtime activity import.
 */
export type YouthMotion =
  | 'ycStretch' | 'ycLeadership' | 'ycRally' | 'ycListen' | 'ycCircle'
  | 'ycPlan' | 'ycStudyPrograms' | 'ycPartner' | 'ycRun'
  | 'ycBandBeat' | 'ycPost' | 'ycStudy' | 'ycRegister' | 'ycCamp';
export const YOUTH_MOTIONS = new Set<string>([
  'ycStretch', 'ycLeadership', 'ycRally', 'ycListen', 'ycCircle',
  'ycPlan', 'ycStudyPrograms', 'ycPartner', 'ycRun',
  'ycBandBeat', 'ycPost', 'ycStudy', 'ycRegister', 'ycCamp',
]);
type Score = Array<[string, number, number?]>;
export const SCORES: Record<YouthMotion, Score> = {
  ycStretch: [['whistle', 1], ['warm', 2.1], ['ready', 1], ['relay', 3.2], ['clap', 1.2], ['stretch', 2.2]],
  ycLeadership: [['brief', 1.8], ['offer', 1.4], ['team', 2.1], ['relay', 3.2], ['reflect', 2.2], ['cheer', 1.4]],
  ycRally: [['ready', 1.1], ['serve', 1.5], ['rally', 4.8], ['miss', 1], ['fetch', 1.4], ['reset', 1.2]],
  ycListen: [['welcome', 1.6], ['listen', 3], ['tissue', 1.5], ['receive', 2], ['reflect', 2], ['note', 2], ['close', 1.3]],
  ycCircle: [['rules', 1.5], ['offer', 1.6], ['first', 2.3], ['pass', 1.4], ['second', 2.3], ['reflect', 2], ['close', 1.2]],
  ycPlan: [['read', 1.8], ['write', 2.2], ['calendar', 1.7], ['type', 1.8], ['print', 2.3], ['collect', 1.6]],
  ycStudyPrograms: [['open', 1.1], ['read', 2.5], ['turn', 1.4], ['compare', 2.1], ['highlight', 2], ['note', 2]],
  ycPartner: [['greet', 1.2], ['show', 1.8], ['listen', 2.5], ['calendar', 1.7], ['agree', 1.6], ['note', 2]],
  ycRun: [['roll', 1.5], ['check', 2], ['phone', 2.4], ['type', 2], ['print', 2], ['file', 1.6]],
  ycBandBeat: [['count', 1.6], ['conduct', 3.2], ['stop', 1.2], ['rhythm', 2.4], ['retry', 3.2], ['clap', 1.5]],
  ycPost: [['remove', 1.3], ['take', 1.2], ['place', 1.6], ['pin', 1.5], ['write', 2], ['show', 1.7]],
  ycStudy: [['ask', 1.7], ['read', 2], ['point', 2], ['solve', 2.7], ['check', 1.8], ['goal', 2]],
  ycRegister: [['greet', 1.4], ['show', 1.8], ['form', 1.8], ['sign', 2.6], ['type', 1.7], ['stamp', 1.5], ['give', 1.6]],
  ycCamp: [['roll', 1.6], ['bag', 1.6], ['load', 1.6], ['board', 2.4], ['count', 1.5], ['wave', 1.3]],
};
const fract = (n: number) => n - Math.floor(n);
export const youthPhase = (p: THREE.Vector3) => fract(p.x * 0.373 + p.z * 0.619);
export const mix = (a: number, b: number, e: number) => a + (b - a) * e;
export const lerp = (a: V, b: V, e: number): V => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
export const add = (a: V, x = 0, y = 0, z = 0): V => [a[0] + x, a[1] + y, a[2] + z];
export const youthBeat = (m: YouthMotion, t: number, ph: number) => beatOf(SCORES[m], t, ph);
export const isBeat = (b: Beat, k: string) => b.e < 0.5 ? b.from === k : b.to === k;
export const keyOf = (b: Beat) => b.e < 0.5 ? b.from : b.to;
export const uOf = (b: Beat) => b.e < 0.5 ? b.u : 0;
export const weightOf = (b: Beat, keys: string[]) => mix(keys.includes(b.from) ? 1 : 0, keys.includes(b.to) ? 1 : 0, b.e);

/** The chair/feet positions also used by the builder. */
export const BASE: Record<YouthMotion, V> = {
  ycStretch: [0, 0.04, 1.06], ycLeadership: [0, 0.04, 1.06],
  ycRally: [1.48, 0, 0.04], ycListen: [0, 0.48, 0.46], ycCircle: [0, 0.48, 0.78],
  ycPlan: [0, 0.48, 0.43], ycStudyPrograms: [0, 0.48, 0.43],
  ycPartner: [0, 0.48, 0.43], ycRun: [0, 0.48, 0.43],
  ycBandBeat: [0.15, 0.04, 1.32], ycPost: [-0.03, 0, 0.4],
  ycStudy: [-0.43, 0.48, 0.46], ycRegister: [-0.27, 0.48, 0.48], ycCamp: [-0.65, 0, 1.3],
};
export const yawOf = (m: YouthMotion) => m === 'ycRally' ? -Math.PI / 2 : Math.PI;
export const PD = {
  paper: [-0.12, 0.79, 0.12] as V, keys: [0.12, 0.8, 0.05] as V,
  pen: [-0.35, 0.8, 0.23] as V, calendar: [0.22, 1.2, 0.24] as V,
  printer: [0.33, 0.9, 0.08] as V, phone: [-0.35, 0.83, -0.16] as V,
};
export const CD = {
  journal: [-0.17, 0.79, 0.16] as V, tissue: [0.29, 0.94, -0.04] as V,
  offer: [0.08, 0.87, 0.13] as V, cards: [0.08, 0.8, 0.04] as V,
};
export const REG = {
  form: [-0.25, 0.81, 0.13] as V, across: [-0.25, 0.81, -0.12] as V,
  stamp: [0.06, 0.83, 0.22] as V, keys: [0.12, 0.82, 0.03] as V,
};

export interface Hands {
  l: V; r: V;
  lean: number; nod: number; palms: number; gl: number; gr: number; crouch: number;
}
const hands = (l: V, r: V, h: Partial<Hands> = {}): Hands => ({ l, r, lean: 0.08, nod: 0.15, palms: 0.5, gl: 0.2, gr: 0.2, crouch: 0, ...h });
/** Body-relative hand target expressed in the piece frame (heights scale, desks do not). */
function body(m: YouthMotion, side: number, up: number, ahead: number, H: number): V {
  const b = BASE[m], a = yawOf(m), k = H / 1.6;
  return [b[0] + side * k * Math.cos(a) + ahead * k * Math.sin(a), b[1] + up * k, b[2] - side * k * Math.sin(a) + ahead * k * Math.cos(a)];
}
const writeAt = (p: V, t: number): V => add(p, 0.025 * wave(t, 1.3), 0.012 + 0.004 * wave(t, 6), 0.012 * wave(t, 2.1));

// A ball crossing the table has a bounce on the receiving half, then rises to the paddle.
const flight = (u: number, fromRight: boolean): V => {
  const bounce = 0.74;
  const q = u < bounce ? u / bounce : (u - bounce) / (1 - bounce);
  const y = u < bounce ? mix(1.04, 0.828, q) + 0.25 * Math.sin(q * Math.PI) : mix(0.828, 1.04, q) + 0.07 * Math.sin(q * Math.PI);
  return [mix(fromRight ? 1.15 : -1.15, fromRight ? -1.15 : 1.15, u), y, 0.04];
};
export function rallyNow(t: number, ph: number) {
  const b = youthBeat('ycRally', t, ph), key = keyOf(b), u = uOf(b);
  let ball: V = [1.15, 1.04, 0.04];
  let right: V = [1.16, 0.91, 0.04];
  let left: V = [-1.16, 0.91, 0.04];
  if (key === 'serve') {
    ball = u < 0.45 ? [1.13, 1.04 + 0.36 * Math.sin(u / 0.45 * Math.PI), 0.04] : flight((u - 0.45) / 0.55, true);
    right = [1.16 + 0.15 * Math.sin(Math.min(1, u / 0.45) * Math.PI), 0.91, 0.04];
  } else if (key === 'rally') {
    const n = Math.min(5, Math.floor(u * 6)), q = fract(u * 6);
    ball = flight(q, n % 2 === 1);
    right = [1.16 + 0.12 * Math.sin(q * Math.PI) * (n % 2 ? 1 : 0), 0.91, 0.04];
    left = [-1.16 - 0.12 * Math.sin(q * Math.PI) * (n % 2 ? 0 : 1), 0.91, 0.04];
  } else if (key === 'miss') {
    ball = lerp([-1.15, 1.04, 0.04], [1.4, 0.05, 0.27], u);
    ball = add(ball, 0, 0.38 * Math.sin(u * Math.PI), 0);
    right = [1.2, 0.96, -0.15];
  } else if (key === 'fetch') {
    // Catch the first low bounce: a wrist need not pass through the floor.
    ball = u < 0.25 ? [1.4, 0.05 + 0.27 * Math.sin(u / 0.25 * Math.PI / 2), 0.27]
      : lerp([1.4, 0.32, 0.27], [1.36, 0.68, 0.24], sm(u, 0.25, 1));
    right = [1.64, 0.62, -0.12];
  } else if (key === 'reset') {
    ball = lerp([1.36, 0.68, 0.24], [1.15, 1.04, 0.04], sm(u, 0, 0.7));
  }
  const step = key === 'miss' ? 0.28 * sm(u, 0.7, 1) : key === 'fetch' ? 0.28 * (1 - sm(u, 0.65, 1)) : 0;
  return { b, key, u, ball, right, left, step, score: 3 + ((b.n % 8) + 8) % 8 };
}

/** Per-beat hand choreography. Props use these exact endpoints in youthCounselor.ts. */
function keyHands(m: YouthMotion, key: string, u: number, t: number, H: number, ph: number): Hands {
  const B = (side: number, up: number, ahead: number) => body(m, side, up, ahead, H);
  const seated = BASE[m][1] > 0.4;
  const l0 = B(0.2, seated ? 0.2 : 0.83, 0.15);
  const r0 = B(-0.2, seated ? 0.2 : 0.83, 0.15);
  const rest = () => hands(l0, r0);
  const explain = () => hands(l0, B(-0.18, seated ? 0.42 : 1.18, 0.37), { palms: -0.25, nod: 0.05 + wave(t, 0.8) * 0.04 });
  const clap = () => {
    const w = 0.035 + 0.065 * Math.abs(wave(t, 2));
    return hands(B(w, 1.1, 0.3), B(-w, 1.1, 0.3), { palms: 0, nod: 0.02 });
  };
  if (m === 'ycStretch' || m === 'ycLeadership') {
    switch (key) {
      case 'whistle': return hands(l0, B(-0.03, 1.4, 0.12), { gr: 0.75, nod: -0.1 });
      case 'warm': {
        const lift = 0.5 + 0.5 * wave(t, 0.45);
        return hands(B(0.34, 1.05 + lift * 0.53, 0.08), B(-0.34, 1.05 + lift * 0.53, 0.08), { palms: 1.1, nod: -lift * 0.12 });
      }
      case 'stretch': return hands(B(0.09, 1.69, 0.05), B(-0.09, 1.69, 0.05), { lean: -0.04, palms: 1.3, nod: -0.12 });
      case 'ready': return hands(B(0.2, 1, 0.2), B(-0.2, 1, 0.2), { crouch: 0.22, lean: 0.2 });
      case 'relay': return hands(l0, B(-0.34, 1.17, 0.39), { gr: 0.05, nod: 0.06 });
      case 'offer': return hands(l0, lerp(B(-0.12, 1, 0.25), [-0.25, 1.03, 0.53], sm(u, 0.05, 0.8)), { gl: 0.2, gr: 0.6, lean: 0.18 });
      case 'clap': return clap();
      case 'cheer': return hands(B(0.2, 1.5, 0.13), B(-0.2, 1.5, 0.13), { gl: 1, gr: 1, nod: -0.12 });
      default: return explain();
    }
  }
  if (m === 'ycRally') {
    const r = rallyNow(t, ph);
    const holding = key === 'ready' || key === 'fetch' && u >= 0.25 || key === 'reset' || key === 'serve' && u < 0.12;
    const waiting: V = key === 'fetch' ? [1.4, 0.32, 0.27] : B(0.21, 1.03, 0.18);
    return hands(holding ? r.ball : waiting, r.right,
      { gr: 0.95, gl: key === 'fetch' ? 0.7 : 0.15, lean: key === 'fetch' ? mix(1.1, 0.2, sm(u, 0.5, 1)) : 0.15,
        crouch: key === 'fetch' ? 1 - sm(u, 0.5, 1) : 0.08, nod: key === 'fetch' ? 0.3 : 0.1 });
  }
  if (m === 'ycListen') {
    switch (key) {
      case 'welcome': return explain();
      case 'listen': return hands(B(0.13, 0.18, 0.2), B(-0.13, 0.18, 0.2), { lean: 0.18, nod: 0.1 + 0.08 * Math.max(0, wave(t, 0.7)) });
      case 'tissue': return hands(l0, lerp(CD.tissue, CD.offer, sm(u, 0.15, 0.85)), { lean: 0.3, gr: 0.55 });
      case 'receive': return hands(l0, u < 0.3 ? CD.offer : r0, { lean: 0.1, nod: 0.08 });
      case 'note': return hands(add(CD.journal, -0.09, 0, 0), writeAt(CD.journal, t), { lean: 0.23, nod: 0.45, gr: 0.85, palms: 1.1 });
      case 'close': return hands(l0, CD.cards, { gr: 0.2, lean: 0.2 });
      default: return explain();
    }
  }
  if (m === 'ycCircle') {
    switch (key) {
      case 'rules': return hands(B(0.22, 0.35, 0.25), B(-0.22, 0.35, 0.25), { palms: -0.2 });
      case 'offer': return hands(l0, lerp(B(-0.1, 0.32, 0.2), [0.4, 0.81, 0.36], sm(u, 0.05, 0.8)), { gr: 0.65, lean: 0.2 });
      case 'first': case 'second': return hands(l0, r0, { lean: 0.18, nod: 0.08 + 0.07 * Math.max(0, wave(t, 0.75)) });
      case 'pass': return hands(l0, B(-0.26, 0.36, 0.35), { gr: 0.1 });
      case 'close': return hands(B(0.045, 0.4, 0.28), B(-0.045, 0.4, 0.28), { palms: 0 });
      default: return explain();
    }
  }
  if (m === 'ycPlan' || m === 'ycStudyPrograms' || m === 'ycPartner' || m === 'ycRun') {
    const p = PD.paper;
    switch (key) {
      case 'read': case 'roll': return hands(add(p, -0.08, 0.02), add(p, 0.06, 0.01, -0.06 + u * 0.12), { nod: 0.4, lean: 0.22 });
      case 'write': case 'highlight': case 'note': case 'check': return hands(add(p, -0.1, 0.01), writeAt(p, t), { nod: 0.45, lean: 0.25, palms: 1.1, gr: 0.85 });
      case 'calendar': return hands(l0, add(PD.calendar, 0.07 * u - 0.035, 0, 0.03), { lean: 0.25, gr: 0.7, nod: -0.15 });
      case 'type': return hands(add(PD.keys, -0.09, 0.015 + 0.008 * wave(t, 5)), add(PD.keys, 0.09, 0.015 - 0.008 * wave(t, 5)), { palms: 1.3, lean: 0.2, nod: 0.05 });
      case 'print': return hands(l0, r0, { nod: 0.18 });
      case 'collect': case 'file': return hands(add(p, -0.1, 0.03), lerp(PD.printer, add(p, 0, 0.08, 0), sm(u, 0, 0.8)), { gr: 0.65, lean: 0.25 });
      case 'turn': case 'open': {
        const a = Math.PI * sm(u, 0.1, 0.85);
        return hands(add(p, -0.13, 0.01), add(p, 0.13 * Math.cos(a), 0.03 + 0.09 * Math.sin(a), 0.05), { gr: 0.55, nod: 0.4, lean: 0.2 });
      }
      case 'compare': return hands(add(p, -0.1, 0.01), B(-0.05, 0.65, 0.13), { nod: 0.28, gr: 0.45 });
      case 'phone': return hands(B(0.1, 0.73, 0.02), writeAt(p, t), { gl: 0.8, gr: 0.85, nod: 0.25 });
      case 'show': return hands(add(p, -0.08, 0.01, -0.1 * u), add(p, 0.08, 0.01, -0.1 * u), { lean: 0.35, palms: 1 });
      case 'listen': return hands(l0, r0, { nod: 0.06 + 0.07 * wave(t, 0.7) });
      default: return explain();
    }
  }
  if (m === 'ycBandBeat') {
    switch (key) {
      case 'count': return hands(l0, B(-0.18, 1.3, 0.3), { gr: 0.2 + 0.2 * Math.floor(u * 4), nod: 0.05 });
      case 'conduct': case 'retry': {
        const w = wave(t, key === 'retry' ? 1.5 : 2);
        return hands(B(0.24, 1.08 - 0.08 * w, 0.23), B(-0.22, 1.12 + 0.18 * w, 0.34), { palms: 0.8, nod: 0.08 + 0.05 * w });
      }
      case 'stop': return hands(B(0.2, 1.34, 0.4), B(-0.2, 1.34, 0.4), { palms: 0, nod: 0 });
      case 'rhythm': return hands(B(0.06, 1.06, 0.3), B(-0.06, 1.06 + 0.1 * Math.abs(wave(t, 1.5)), 0.3), { palms: 0.1 });
      default: return clap();
    }
  }
  if (m === 'ycPost') {
    const sheet: V = [0, 1.13, -0.12];
    switch (key) {
      case 'remove': return hands(l0, lerp(sheet, [0.29, 0.84, 0.09], sm(u, 0.1, 0.9)), { gr: 0.7, nod: 0.15 });
      case 'take': return hands([-0.09, 0.88, 0.04], [0.11, 0.88, 0.04], { gl: 0.65, gr: 0.65, nod: 0.4 });
      case 'place': return hands(lerp([-0.09, 0.88, 0.04], add(sheet, -0.1, 0.04, 0.02), sm(u, 0, 0.8)), lerp([0.11, 0.88, 0.04], add(sheet, 0.1, 0.04, 0.02), sm(u, 0, 0.8)), { gl: 0.6, gr: 0.6 });
      case 'pin': return hands(add(sheet, -0.1, 0, 0.02), [u < 0.5 ? -0.11 : 0.11, 1.29, -0.09 + 0.02 * Math.abs(wave(t, 2))], { gr: 0.8, palms: 1.2 });
      case 'write': return hands(l0, [-0.11 + u * 0.2, 0.94 + 0.01 * wave(t, 5), -0.1], { gr: 0.9, nod: 0.3 });
      default: return hands(l0, [-0.01, 1.08, 0.02], { gr: 0.1 });
    }
  }
  if (m === 'ycStudy') {
    const p: V = [-0.16, 0.8, 0.13];
    switch (key) {
      case 'read': return hands([-0.62, 0.81, 0.1], [-0.38, 0.81, 0.1], { lean: 0.2, nod: 0.4 });
      case 'point': return hands(l0, add(p, u * 0.13, 0.02, -0.08 + u * 0.08), { lean: 0.3, nod: 0.35, gr: 0.8 });
      case 'solve': return hands(l0, r0, { lean: 0.14, nod: 0.15 + 0.06 * wave(t, 0.7) });
      case 'check': return hands(l0, add(p, 0.11, 0.03, 0.05), { lean: 0.25, gr: 0.5 });
      case 'goal': return hands([-0.58, 0.81, 0.1], writeAt([-0.43, 0.8, 0.13], t), { lean: 0.24, gr: 0.85, nod: 0.4 });
      default: return explain();
    }
  }
  if (m === 'ycRegister') {
    switch (key) {
      case 'show': return hands(l0, [-0.38, 0.85, -0.08], { palms: 1, lean: 0.18 });
      case 'form': return hands(add(lerp(REG.form, REG.across, sm(u, 0.1, 0.8)), -0.08, 0.02), add(lerp(REG.form, REG.across, sm(u, 0.1, 0.8)), 0.08, 0.02), { palms: 1.2, lean: 0.35 });
      case 'sign': return hands(l0, r0, { nod: 0.3 });
      case 'type': return hands(add(REG.keys, -0.09, 0.02), add(REG.keys, 0.09, 0.02 + 0.01 * wave(t, 5)), { lean: 0.25, palms: 1.2 });
      case 'stamp': return hands(add(REG.form, -0.08, 0.02), lerp(REG.stamp, add(REG.form, 0.04, 0.06 + 0.07 * Math.abs(Math.sin(u * Math.PI * 2))), sm(u, 0, 0.3)), { gr: 0.95, lean: 0.28, nod: 0.4 });
      case 'give': return hands(l0, lerp(REG.form, REG.across, sm(u, 0.1, 0.7)), { gr: 0.65, lean: 0.3 });
      default: return explain();
    }
  }
  if (m === 'ycCamp') {
    if (key === 'bag') return hands([-0.77, 0.45, 1.14], [-0.53, 0.45, 1.14], { crouch: 0.5, lean: 0.35, gl: 0.8, gr: 0.8 });
    if (key === 'load') return hands([-0.77, 0.8, 0.92], [-0.53, 0.8, 0.92], { lean: 0.3, gl: 0.8, gr: 0.8 });
    if (key === 'wave') return hands(l0, B(-0.2, 1.6, 0.1), { nod: -0.1 });
    return explain();
  }
  return rest();
}

export function youthHands(m: YouthMotion, t: number, ph: number, H = 1.6): Hands {
  const b = youthBeat(m, t, ph);
  const a = keyHands(m, b.from, b.u, t, H, ph);
  if (!b.e || m === 'ycRally') return a;
  const c = keyHands(m, b.to, 0, t, H, ph), e = b.e;
  return {
    l: lerp(a.l, c.l, e), r: lerp(a.r, c.r, e), lean: mix(a.lean, c.lean, e),
    nod: mix(a.nod, c.nod, e), palms: mix(a.palms, c.palms, e),
    gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e), crouch: mix(a.crouch, c.crouch, e),
  };
}

/** The bus loads before departure; returning is driven by the real away flag. */
export function departureAt(seconds: number) {
  const s = Math.max(0, seconds);
  return {
    bag: sm(s, 0.8, 2.6), loaded: s >= 2.6,
    boarding: sm(s, 2.8, 6.5), boarded: s >= 6.5,
    door: 1 - sm(s, 9.3, 10.2), bay: 1 - sm(s, 2.6, 3.3),
    x: 14 * sm(s, 10.6, 17.3) ** 2,
    gone: s > 17.3,
  };
}

export function youthDoing(m: YouthMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const origin = work?.point ?? b.base;
  const f = frameAt(origin, [0, 0, 0], b.yaw - yawOf(m), b.base, b.yaw, b.height);
  const h = youthHands(m, t, youthPhase(origin), b.height);
  const W = (p: V) => f.o(p[0], p[1], p[2]);
  return {
    reach: { l: W(h.l), r: W(h.r), lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr } },
    crouch: h.crouch || undefined,
  };
}
