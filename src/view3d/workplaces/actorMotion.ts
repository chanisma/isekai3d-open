import * as THREE from 'three';
import type { AsanaKey } from '../asana';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, wave, type Beat, type V } from './busDriverMotion';

/*
 * An actor's day at the 영화 촬영장 (2026-10-31, the workplace pipeline, at the user's request: the work
 * should look like the work). Every motion is a script: a round of beats, each with where the dweller is,
 * where the hands are, where the things that move are, and where the people drawn in are and what they
 * say. The piece reads the same script by the same clock (actor.ts), so the slate claps when the dweller is
 * on their mark, the rain starts on 액션 and stops on 컷, and the page gains its yellow lines as the
 * highlighter goes over it.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front), and
 * the whole body is posed from here (activity.ts spotPose only hands over).
 */
export type AcMotion =
  | 'acRehearse' | 'acFilm' | 'acAdlib'
  | 'acStunt'
  | 'acRead' | 'acVoice' | 'acCoach' | 'acTableRead'
  | 'acVillage' | 'acWait' | 'acFit' | 'acTouchUp' | 'acGreen';
export const AC_MOTIONS = new Set<string>(['acRehearse', 'acFilm', 'acAdlib', 'acStunt', 'acRead', 'acVoice', 'acCoach', 'acTableRead', 'acVillage', 'acWait', 'acFit', 'acTouchUp', 'acGreen']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const acPhase = (p: THREE.Vector3) => frac(p.x * 0.271 + p.z * 0.613);
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
  /** The whole body in a yoga-kit pose (a fall, a roll, flat on the crash pad), at the state's place, resting on `floor`. */
  asana?: { k: AsanaKey; floor?: number; turn?: number };
  props?: Record<string, V | null | undefined>;
  /** Numbers the piece reads. Those starting `_` step (a page, a bubble) rather than ease. */
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
export interface AcNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
  /** The asana pair and how far between them, when the body's in one. */
  asana: { from: AsanaKey; to: AsanaKey; e: number; floor: number; turnFrom: number; turnTo: number } | null;
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
export function acNow(m: AcMotion, t: number, ph: number, H = 1.6): AcNow {
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
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) {
    const x = A.key.n?.[k] ?? 0;
    const y = B.key.n?.[k] ?? 0;
    n[k] = k[0] === '_' ? (e < 0.5 ? x : y) : mixN(x, y, e);
  }
  const asA = A.key.asana;
  const asB = B.key.asana;
  const asana = asA || asB
    ? { from: asA?.k ?? ('mountain' as AsanaKey), to: asB?.k ?? ('mountain' as AsanaKey), e, floor: mixN(asA?.floor ?? A.st.y, asB?.floor ?? B.st.y, e), turnFrom: asA?.turn ?? 0, turnTo: asB?.turn ?? 0 }
    : null;
  return { b, st: here, walking: !asana && e > 0 && e < 1 && dist > 0.12 && !here.sit, key: blendKey(A.key, B.key, e), props, n, asana };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function acPose(m: AcMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = acNow(m, t, acPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const k = N.key;
  const reach = { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.1, nod: k.nod ?? 0.2, palms: k.palms ?? 0.5, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap };
  if (N.asana) {
    const a = N.asana;
    const pose: BodyPose = { kind: 'asana', at: W([s.x, 0, s.z]), yaw, floor: W([s.x, a.floor, s.z]).y, from: { key: a.from, turn: a.turnFrom }, to: { key: a.to, turn: a.turnTo }, e: a.e };
    return { pose, doing: { reach: { l: reach.l, r: reach.r, grip: reach.grip, nod: reach.nod, palms: reach.palms } } };
  }
  const pose: BodyPose = s.sit
    ? { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y }
    : N.walking
      ? { kind: 'walk', at, yaw }
      : { kind: 'stand', at, yaw, crouch: k.crouch };
  return { pose, doing: { reach, crouch: k.crouch || undefined } };
}

// ---------------------------------------------------------------------------------------------
// Shared pieces of business.

const idle = (c: Ctx, side: number): V => c.bd(side * 0.23, 0.55 * c.H, 0.08);
const seatedIdle = (c: Ctx, side: number): V => c.bd(side * 0.14, 0.14 * c.H, 0.26);
const ear = (c: Ctx): V => c.bd(-0.12, 0.89 * c.H, 0.03);
const mouth = (c: Ctx, seated = false): V => c.bd(0, (seated ? 0.46 : 0.86) * c.H, 0.14);
const openTo = (c: Ctx, side: number, far = 0.34, up = 0.64): V => c.bd(side * 0.22, (up + 0.02 * wave(c.t, 0.6)) * c.H, far);
const scriptAt = (c: Ctx, seated = false): V => c.bd(0.03, (seated ? 0.3 : 0.63) * c.H, seated ? 0.26 : 0.28);
/** Both hands round the script held up to read. */
const holdScript = (c: Ctx, seated = false): { l: V; r: V } => {
  const up = (seated ? 0.3 : 0.63) * c.H - 0.02;
  return { l: c.bd(0.13, up, 0.28), r: c.bd(-0.07, up, 0.28) };
};

/** Words spoken, each a number the piece turns back into a bubble. */
export const SAYS: string[] = [''];
const said = new Map<string, number>();
const sayId = (s: string) => {
  let i = said.get(s);
  if (i === undefined) {
    i = SAYS.length;
    SAYS.push(s);
    said.set(s, i);
  }
  return i;
};

/** Someone drawn in: where they stand, which way they face, where their hands are, the head's turn and bow, a laugh's bounce. */
interface Fig {
  at?: V;
  yaw?: number;
  l?: V | null;
  r?: V | null;
  head?: number;
  nod?: number;
  bob?: number;
}
type Bits = { props: Record<string, V | null | undefined>; n: Record<string, number> };
function fig(name: string, f: Fig): Bits {
  const props: Bits['props'] = { [`${name}L`]: f.l ?? null, [`${name}R`]: f.r ?? null };
  if (f.at) props[name] = f.at;
  return { props, n: { [`${name}Y`]: f.yaw ?? 0, [`${name}H`]: f.head ?? 0, [`${name}N`]: f.nod ?? 0, [`${name}B`]: f.bob ?? 0 } };
}
/** A key with its figures and its numbers merged in. */
function K(base: Key, ...more: Array<Bits | Partial<Bits>>): Key {
  const props = { ...(base.props ?? {}) };
  const n = { ...(base.n ?? {}) };
  for (const m of more) {
    Object.assign(props, m.props ?? {});
    Object.assign(n, m.n ?? {});
  }
  return { ...base, props, n };
}
/** Someone says something: who is the name of a figure, or `dweller`. */
const say = (s: string, who: number): Bits => ({ props: {}, n: { _say: sayId(s), _who: who } });
export const WHO = { none: 0, dweller: 1, a: 2, b: 3, c: 4 };
const laugh = (t: number) => 0.02 + 0.02 * Math.abs(wave(t, 3.2));
const clapHands = (t: number, x: number, y: number, z: number): { l: V; r: V } => {
  const k = 0.05 + 0.04 * Math.abs(wave(t, 2.6));
  return { l: [x + k, y, z], r: [x - k, y, z] };
};

// =============================================================================================
// 촬영 세트 (filmSet, 3 × 2): an alley flat with a 다방's front, a street lamp, a bench, a rain bar over it.
// Tape marks on the floor: A where the dweller starts, B where the two meet, C the scene partner's.

export const SET = {
  A: [-0.85, 0, 0.72] as V,
  B: [0.02, 0, 0.3] as V,
  C: [0.74, 0, 0.26] as V,
  box: [-1.22, 0.33, 0.68] as V,
  bench: st(0.62, 0.44, -0.46, 0, { sit: true, floor: 0 }),
  banana: [1.02, 0.47, -0.5] as V,
  dir: [-2.15, 0, 1.55] as V,
  boom: [1.9, 0, 0.62] as V,
  ad: [-1.85, 0, 0.5] as V,
  micHome: [0.35, 2.12, 0.32] as V,
};
const toMate = Math.PI / 2;
const atA = st(SET.A[0], 0, SET.A[2], toMate - 0.25);
const atB = st(SET.B[0], 0, SET.B[2], toMate);
const atB2 = st(0.36, 0, 0.26, toMate);
/** The director in the canvas chair (`who` a) and the partner on their mark (`who` b), left at rest. */
const dirRest = (over: Fig = {}): Bits => fig('dir', { yaw: 2.1, head: -0.05, ...over });
const mateAt = (over: Fig = {}): Bits => fig('mate', { at: SET.C, yaw: -Math.PI / 2, ...over });
const boomAt = (over: Fig = {}): Bits => fig('boom', { at: SET.boom, yaw: -1.6, ...over });
const adAt = (over: Fig = {}): Bits => fig('ad', { at: SET.ad, yaw: 1.7, ...over });
/** A script open on a reader's hands, hands given. */
const mateScript = (s: V = SET.C): Partial<Bits> => ({ props: { mateScript: add(s, -0.28, 1.02, 0) } });
const mateHoldsScript = (): Fig => ({ l: add(SET.C, -0.28, 1.0, -0.1), r: add(SET.C, -0.28, 1.0, 0.1), nod: 0.35 });

const REHEARSE: Script = {
  seq: [['take', 1.8, 0.8], ['mark', 2.4, 1.2], ['line', 3.4], ['turn', 2.6], ['note', 3.2], ['pencil', 2.4, 0.9], ['again', 2.8, 1.2]],
  at: (k) => (k === 'take' ? st(-1.0, 0, 0.72, -2.2) : k === 'mark' || k === 'again' ? atA : k === 'pencil' ? st(-0.18, 0, 0.3, toMate) : k === 'turn' ? st(SET.B[0], 0, SET.B[2], -1.3) : atB),
  key(k, u, c) {
    const scr = scriptAt(c);
    const base: Bits = { props: { mic: null, slate: null }, n: { rain: 0, lit: 0 } };
    const cast = [boomAt({ l: null, r: null }), adAt()];
    const ready = mateScript();
    switch (k) {
      case 'take': {
        // Off the apple box where the script's left, up to the chest.
        const s = lerpV(SET.box, scr, sm(u, 0.2, 0.75));
        return K({ l: add(s, 0.06, 0.02, 0), r: add(s, -0.06, 0.02, 0), crouch: 0.28 * (1 - sm(u, 0.2, 0.7)), lean: 0.2, nod: 0.45, gl: 0.7, gr: 0.7 }, base, ...cast, dirRest(), mateAt(mateHoldsScript()), ready, { props: { script: s } });
      }
      case 'mark':
        // Down to find the tape with a finger, script held out of the way.
        return K({ l: add(SET.A, 0.08, 0.05, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.14), crouch: 0.62, lean: 0.35, nod: 0.5, gl: 0.1, gr: 0.75, palms: 0.1 }, base, ...cast, dirRest({ r: add(SET.dir, 0.36, 1.1, -0.2) }), mateAt(mateHoldsScript()), ready, say('네 마크는 저 테이프!', WHO.a), { props: { script: c.bd(-0.2, 0.57 * c.H, 0.16) } });
      case 'line':
        // The line, walked through: script low in one hand, the other telling it. The partner reads back at the middle.
        return K({ l: openTo(c, 1, 0.32, 0.68 + 0.04 * wave(c.t, 0.9)), r: add(scr, -0.12, -0.04, 0), nod: u < 0.5 ? 0.02 : 0.32, lean: 0.06, gl: 0.08, gr: 0.75, palms: -0.15 }, base, ...cast, dirRest(), mateAt(u < 0.55 ? { nod: 0.05, l: add(SET.C, -0.3, 1.0, -0.1), r: add(SET.C, -0.28, 1.0, 0.1) } : mateHoldsScript()), ready, u < 0.55 ? say('…여기서 뭐 해요?', WHO.dweller) : say('기다렸어.', WHO.b), { props: { script: add(scr, -0.12, -0.03, 0) } });
      case 'turn':
        // The turn away the scene needs: back to them, head down, a hand to the chest.
        return K({ l: c.bd(0.05, 0.68 * c.H, 0.14), r: add(scr, -0.12, -0.08, 0), nod: 0.42, lean: 0.1, gl: 0.3, gr: 0.75 }, base, ...cast, dirRest({ nod: 0.1 }), mateAt(mateHoldsScript()), ready, { props: { script: add(scr, -0.12, -0.08, 0) } });
      case 'note': {
        // The director's up and across, showing it with both hands. The dweller listens, reading along.
        const d = lerpV(SET.dir, [-0.55, 0, 1.1], sm(u, 0, 0.35));
        return K({ ...holdScript(c), nod: 0.1 + 0.1 * wave(c.t, 0.9), lean: 0.04, gl: 0.7, gr: 0.7 }, base, ...cast, fig('dir', { at: d, yaw: -2.6, l: add(d, 0.3, 1.18, 0.1), r: add(d, 0.14, 1.2, -0.28), head: -0.1 }), mateAt(mateHoldsScript()), ready, say('한 발 왼쪽, 거기서 돌아!', WHO.a), { props: { script: scr }, n: { dirUp: 1 } });
      }
      case 'pencil': {
        // Written in the margin: the pencil from behind the ear.
        const p = add(scr, -0.02 + 0.08 * frac(u * 3), 0.02, -0.02);
        const d: V = [-0.55, 0, 1.1];
        return K({ l: add(scr, 0.1, -0.03, 0), r: p, nod: 0.5, lean: 0.08, gl: 0.75, gr: 0.9 }, base, ...cast, fig('dir', { at: d, yaw: -2.6, l: null, r: null, nod: 0.05 }), mateAt(mateHoldsScript()), ready, { props: { script: scr, pencil: p }, n: { dirUp: 1 } });
      }
      default: {
        // Back on A for another go, the director sat again.
        const d = lerpV([-0.55, 0, 1.1], SET.dir, sm(u, 0, 0.5));
        return K({ ...holdScript(c), nod: 0.15, lean: 0.02, gl: 0.7, gr: 0.7 }, base, ...cast, fig('dir', { at: d, yaw: 2.1, l: null, r: null }), mateAt(mateHoldsScript()), ready, say('좋아요, 처음부터 다시!', WHO.a), { props: { script: scr }, n: { dirUp: sm(u, 0.45, 0.5) < 1 ? 1 : 0 } });
      }
    }
  },
};

/** The clapper: in front of the lens, then out of the way. */
const slateBeat = (u: number, c: Ctx, take: number): Bits[] => {
  // Stood between the lens and the actors, facing the lens, the board held out to it.
  const hold: V = [-0.1, 1.28, 1.42];
  const d = 1.05 * (1 - sm(u, 0.75, 1));
  const a = lerpV(lerpV(SET.ad, [-0.1, 0, 1.1], sm(u, 0, 0.2)), SET.ad, sm(u, 0.72, 1));
  void c;
  return [
    fig('ad', { at: a, yaw: u < 0.72 ? 0 : 1.7, l: add(hold, 0.08, 0.02, 0), r: add(hold, -0.08, 0.14, 0) }),
    { props: { slate: d > 0.02 ? hold : null }, n: { clap: u < 0.55 ? 1 : 0, _take: take } },
  ];
};
const umbrellaIn = (c: Ctx): { r: V; prop: V } => {
  const r = c.bd(-0.14, 0.72 * c.H, 0.18);
  return { r, prop: r };
};
const FILM: Script = {
  seq: [
    ['ready', 2.2], ['slate1', 2.0], ['act1', 2.6, 1.3], ['flub', 2.2], ['cut1', 2.2], ['back1', 1.2, 1.3],
    ['slate2', 2.0], ['act2', 2.4, 1.3], ['dip', 2.0], ['cut2', 2.4], ['back2', 1.2, 1.3],
    ['slate3', 2.0], ['act3', 2.2, 1.3], ['drop', 2.2, 0.9], ['touch', 3.4], ['tear', 3.0], ['hold', 2.4], ['ok', 3.2], ['towel', 2.6, 1.0],
  ],
  at: (k) => (k === 'ready' || k.startsWith('slate') || k.startsWith('back') ? atA : k === 'touch' || k === 'tear' || k === 'hold' || k === 'ok' || k === 'towel' ? atB2 : atB),
  key(k, u, c) {
    const take = k === 'ready' || k === 'slate1' || k === 'act1' || k === 'flub' || k === 'cut1' || k === 'back1' ? 1 : k === 'slate2' || k === 'act2' || k === 'dip' || k === 'cut2' || k === 'back2' ? 2 : 3;
    const rain = k.startsWith('slate') ? sm(u, 0.75, 1) : k === 'act1' || k === 'act2' || k === 'act3' || k === 'flub' || k === 'dip' || k === 'drop' || k === 'touch' || k === 'tear' || k === 'hold' ? 1 : k === 'ok' ? 1 - sm(u, 0, 0.25) : 0;
    const roll = k === 'ready' || k === 'cut1' || k === 'back1' || k === 'cut2' || k === 'back2' || k === 'ok' || k === 'towel' ? 0 : 1;
    const base: Bits = { props: {}, n: { rain, lit: 1, roll, _take: take } };
    const um = umbrellaIn(c);
    const idleL = idle(c, 1);
    const mate = mateAt({ head: 0.02 });
    const boom = boomAt({ l: [1.62, 1.62, 0.56], r: [1.85, 1.5, 0.6] });
    const mic: Bits = { props: { mic: SET.micHome }, n: {} };
    const out = (over: Partial<Key>, ...more: Array<Bits | Partial<Bits>>) => K({ l: idleL, r: um.r, nod: 0.05, lean: 0.03, gr: 0.95, gl: 0.3, ...over }, base, mate, boom, mic, dirRest(), adAt(), { props: { umb: um.prop }, n: { umbOpen: 1 } }, ...more);
    switch (k) {
      case 'ready': {
        // The umbrella back from the AD, breath in, shoulders shaken out, eyes down.
        const take0 = sm(u, 0, 0.35);
        const adHand: V = add(SET.A, 0.2, 1.02, 0.3);
        const r = lerpV(adHand, um.r, take0);
        return out({ r, l: add(idleL, 0, 0.06 * wave(c.t, 0.8), 0), nod: 0.32 }, fig('ad', { at: lerpV([-0.45, 0, 1.15], SET.ad, sm(u, 0.35, 0.95)), yaw: -2.4, r: u < 0.35 ? adHand : null }), { props: { umb: r }, n: { umbOpen: sm(u, 0.4, 0.7) } });
      }
      case 'slate1':
      case 'slate2':
      case 'slate3':
        return out({ nod: 0.25 }, ...slateBeat(u, c, take), u > 0.78 ? say('액션!', WHO.a) : {}, dirRest({ r: u > 0.75 ? add(SET.dir, 0.3, 1.28, -0.18) : null }));
      case 'act1':
      case 'act2':
      case 'act3':
        // Up to the partner, under the umbrella, the first line.
        return out({ l: openTo(c, 1, 0.3, 0.66), gl: 0.08, nod: 0 }, mateAt({ head: 0.03, l: add(SET.C, -0.22, 0.98, 0.14) }), say('…왜 왔어요?', WHO.dweller));
      case 'flub':
        // Take 1: the line's gone. A hand to the forehead, a bow to the set.
        return out({ l: add(c.bd(0.02, 0.92 * c.H, 0.14), 0, 0.01 * wave(c.t, 1), 0), gl: 0.25, nod: 0.3, lean: 0.14 }, say('아, 죄송합니다!', WHO.dweller), mateAt({ head: 0.25, bob: laugh(c.t) * 0.5 }));
      case 'cut1':
        return out({ l: idleL, nod: 0.22 + 0.2 * wave(c.t, 1.6), lean: 0.2 }, say('컷! 다시 갈게요.', WHO.a), dirRest({ r: add(SET.dir, 0.32, 1.18, -0.2) }), mateAt({ head: 0.1 }));
      case 'back1':
      case 'back2':
        return out({ nod: 0.2 }, fig('ad', { at: SET.ad, yaw: -0.3 }));
      case 'dip':
        // Take 2 going well, until the mic sinks into the top of the shot.
        return out({ l: openTo(c, 1, 0.32, 0.7), gl: 0.08, nod: 0 }, boomAt({ l: [1.62, 1.52, 0.56], r: [1.85, 1.62, 0.6] }), { props: { mic: lerpV(SET.micHome, add(SET.B, 0.15, 1.82, 0.08), sm(u, 0.2, 0.9)) } }, say('기다렸다니요…', WHO.dweller));
      case 'cut2':
        // The director up on the word, the boom snatched back; the dweller looks up at it.
        return out({ nod: -0.28, l: idleL, lean: 0 }, say('컷! 붐 들어왔어!', WHO.a), dirRest({ r: add(SET.dir, 0.36, 1.22, -0.24), nod: -0.02 }), boomAt({ l: [1.62, 1.72, 0.56], r: [1.85, 1.45, 0.6], nod: 0.3 }), { props: { mic: lerpV(add(SET.B, 0.15, 1.82, 0.08), SET.micHome, sm(u, 0, 0.3)) } });
      case 'drop': {
        // Take 3: the umbrella let go. It's on the wet floor; they walk into the rain.
        const fall = lerpV(um.prop, [-0.1, 0.04, 0.72], sm(u, 0.15, 0.55));
        return out({ r: add(um.r, 0, -0.1 * sm(u, 0, 0.2), 0), gr: 0.15 + 0.8 * (1 - sm(u, 0.1, 0.2)), l: idleL, nod: 0.2 }, { props: { umb: fall }, n: { umbOpen: 1 - 0.2 * sm(u, 0.15, 0.55), umbFall: sm(u, 0.2, 0.55) } });
      }
      case 'touch':
      case 'tear':
      case 'hold': {
        // A hand on their arm. The partner's hand comes to the shoulder. A wipe under the eye; the long look.
        const shoulder = c.bd(-0.18, 0.8 * c.H, 0.0);
        const arm: V = add(SET.C, -0.2, 1.08, 0.1);
        const wiping = k === 'tear' && u > 0.3 && u < 0.8;
        return out({ r: arm, l: wiping ? add(c.bd(0.05, 0.9 * c.H, 0.11), 0, 0.012 * wave(c.t, 1.2), 0) : c.bd(0.08, 0.66 * c.H, 0.16), gr: 0.55, gl: 0.3, nod: k === 'tear' ? 0.25 : 0.02, lean: k === 'hold' ? 0.1 : 0.04 }, mateAt({ l: shoulder, nod: 0.1, head: 0 }), dirRest({ nod: 0.08 }), { props: { umb: [-0.1, 0.04, 0.72] }, n: { umbOpen: 0.8, umbFall: 1 } }, k === 'touch' ? say('가지 마요.', WHO.dweller) : {});
      }
      case 'ok': {
        // 컷. Silence, then the set claps.
        const after = u > 0.2;
        return out({ r: c.bd(-0.16, 0.6 * c.H, 0.18), l: idleL, gr: 0.2, nod: 0.05, lean: 0.03 }, say(after ? '컷! 오케이!' : '…', WHO.a), dirRest(after ? { ...clapHands(c.t, -1.86, 1.04, 1.36) } : {}), mateAt(after ? { ...clapHands(c.t, 0.5, 1.12, 0.3), bob: 0.01 } : {}), adAt(after ? { ...clapHands(c.t, -1.6, 1.2, 0.5) } : {}), { props: { umb: [-0.1, 0.04, 0.72] }, n: { umbOpen: 0.8, umbFall: 1 } });
      }
      default: {
        // A towel over the head from the AD, who's got the umbrella now.
        const tw = c.bd(0, 0.97 * c.H + 0.01 * wave(c.t, 2.4), 0.02);
        const a: V = [-0.45, 0, 1.15];
        const closed = add(a, -0.18, 0.92, -0.06);
        return out({ l: add(tw, 0.12, -0.04, 0.03), r: add(tw, -0.12, -0.04, 0.03), gl: 0.7, gr: 0.7, nod: 0.3, lean: 0.1 }, fig('ad', { at: lerpV(SET.ad, a, sm(u, 0, 0.4)), yaw: -2.4, r: closed }), { props: { umb: closed, towel: tw }, n: { umbOpen: 0 } }, mateAt({ yaw: -1.2, head: 0.3 }));
      }
    }
  },
};

const ADLIB: Script = {
  seq: [['sit', 2.4, 0.9], ['grab', 1.8], ['phone', 3.0, 1.2], ['pace', 2.6], ['bow', 2.2], ['peel', 2.6], ['eat', 2.6], ['shrug', 2.6, 1.2]],
  at: (k) => (k === 'sit' || k === 'grab' ? SET.bench : k === 'phone' ? st(0.2, 0, 0.0, toMate) : k === 'pace' ? st(-0.28, 0, 0.42, toMate + 0.4) : st(0.1, 0, 0.26, toMate)),
  key(k, u, c) {
    const base: Bits = { props: { mic: add(SET.micHome, 0, -0.1, 0) }, n: { lit: 1, rain: 0 } };
    const boom = boomAt({ l: [1.62, 1.62, 0.56], r: [1.85, 1.5, 0.6] });
    const earAt = ear(c);
    const m = (over: Fig) => mateAt({ at: [0.98, 0, 0.32], ...over });
    const dl = (over: Fig = {}) => dirRest({ ...over });
    const held = (r: V) => ({ props: { banana: r }, n: { peel: 0 } });
    switch (k) {
      case 'sit': {
        // Sat on the bench, the partner's line just said; a blank look round for something.
        return K({ l: seatedIdle(c, 1), r: seatedIdle(c, -1), nod: 0.1 * wave(c.t, 0.25) - 0.04, lean: 0.03 }, base, boom, m({ yaw: -1.2 }), dl(), adAt(), say('내 전화는 왜 안 받아?', WHO.b), { props: { banana: SET.banana }, n: { peel: 0 } });
      }
      case 'grab': {
        const r = lerpV(SET.banana, ear(c), sm(u, 0.25, 0.95));
        return K({ l: seatedIdle(c, 1), r: add(r, 0, 0.0, 0), nod: 0.2 - 0.3 * sm(u, 0.4, 0.9), lean: 0.1, gr: 0.9 }, base, boom, m({ yaw: -1.2, head: 0.1 }), dl(), adAt(), held(r));
      }
      case 'phone':
        // Not a pause: a banana answered as a phone, up and walking.
        return K({ l: openTo(c, 1, 0.3, 0.66 + 0.03 * wave(c.t, 1.1)), r: earAt, gr: 0.9, gl: 0.08, nod: 0.0 + 0.05 * wave(c.t, 1.3), lean: 0.05 }, base, boom, m({ yaw: -1.5, bob: laugh(c.t) * 0.5, r: [0.82, 1.3, 0.42] }), dl({ head: 0.1 }), adAt(), held(earAt), say('네, 사장님!', WHO.dweller));
      case 'pace':
        return K({ l: openTo(c, 1, 0.34, 0.7), r: earAt, gr: 0.9, gl: 0.08, nod: -0.05, lean: -0.02 }, base, boom, m({ yaw: -1.6, bob: laugh(c.t), l: [1.02, 1.0, 0.45], r: [0.92, 1.0, 0.45] }), dl({ r: [-1.88, 1.2, 1.34], bob: laugh(c.t) * 0.3 }), adAt(), held(earAt), say('지금은 곤란합니다, 사장님.', WHO.dweller));
      case 'bow':
        return K({ l: c.bd(0.16, 0.55 * c.H, 0.06), r: earAt, gr: 0.9, lean: 0.25 + 0.35 * Math.abs(wave(c.t, 0.9)), nod: 0.4 }, base, boom, m({ yaw: -1.6, bob: laugh(c.t) * 1.4, l: [1.02, 1.0, 0.45], r: [0.94, 1.02, 0.42], nod: 0.25 }), dl({ r: [-1.88, 1.28, 1.34], bob: laugh(c.t) * 0.6 }), adAt({ ...clapHands(c.t, -1.6, 1.18, 0.5), bob: laugh(c.t) }), held(earAt), say('네, 네, 네!', WHO.dweller));
      case 'peel': {
        // Hung up. Looked at. Peeled, one strip at a time, in silence.
        const b = c.bd(-0.08, 0.72 * c.H, 0.26);
        return K({ l: add(b, 0.05 + 0.03 * sm(frac(u * 3), 0, 1), 0.1 - 0.12 * frac(u * 3), 0.0), r: b, gl: 0.8, gr: 0.9, nod: 0.3 }, base, boom, m({ yaw: -1.5, bob: laugh(c.t) * 0.3, r: [0.8, 1.26, 0.42] }), dl({ bob: laugh(c.t) * 0.3 }), adAt(), { props: { banana: b }, n: { peel: sm(u, 0.05, 0.9) } });
      }
      case 'eat': {
        const b = lerpV(c.bd(-0.08, 0.72 * c.H, 0.26), mouth(c), Math.abs(wave(c.t, 0.55)));
        return K({ l: openTo(c, 1, 0.26, 0.56), r: b, gr: 0.9, gl: 0.1, nod: 0.02 }, base, boom, m({ yaw: -1.6, bob: laugh(c.t) * 1.6, l: [1.02, 1.02, 0.45], r: [0.94, 1.0, 0.42], nod: 0.35 }), dl({ r: [-1.88, 1.28, 1.34], l: [-1.95, 1.25, 1.22], bob: laugh(c.t) }), adAt({ ...clapHands(c.t, -1.6, 1.18, 0.5), bob: laugh(c.t) }), { props: { banana: b }, n: { peel: 1 } }, say('ㅋㅋㅋ 그거 살리자!', WHO.a));
      }
      default:
        // A shrug to the partner and back to the bench, the skin left in hand.
        return K({ l: c.bd(0.38, 0.7 * c.H, 0.18), r: c.bd(-0.38, 0.7 * c.H, 0.18), gl: 0.05, gr: 0.6, palms: -0.5, lean: -0.02, nod: -0.05 + 0.1 * sm(u, 0.2, 0.8) }, base, boom, m({ yaw: -1.5, bob: laugh(c.t) * 0.5 }), dl({ bob: laugh(c.t) * 0.3 }), adAt(), { props: { banana: c.bd(-0.38, 0.72 * c.H, 0.18) }, n: { peel: 1 } }, say('…다음 대사가 뭐였죠?', WHO.dweller));
    }
  },
};

// =============================================================================================
// 액션 매트 (stuntMat, 2 × 1): the gym mat, a jump box at the left, the crash pad at the right, the rig over it.

export const ST = {
  box: 0.42,
  pad: 0.34,
  boxX: -0.72,
  padX: 0.45,
  hook: [-0.72, 2.32, 0] as V,
  pulley: [0.05, 2.46, 0] as V,
  rope: [0.95, 2.46, 0] as V,
  coach: [-0.1, 0, 1.15] as V,
};
const stAt = (x: number, z: number, yaw: number, y = 0) => st(x, y, z, yaw);
const coachF = (over: Fig = {}) => fig('coach', { at: ST.coach, yaw: Math.PI * 0.95, ...over });
const STUNT: Script = {
  seq: [['brief', 3.0, 1.0], ['warm', 2.6], ['belt', 2.0, 1.0], ['box', 1.8, 0.8], ['punch', 2.0], ['fall', 0.4, 0.55], ['flat', 2.2, 1.0], ['sit', 1.4, 1.0], ['up', 1.8, 0.9], ['wire', 1.8, 1.8], ['air', 2.2], ['land', 1.2, 0.5], ['rollIn', 0.7, 0.45], ['roll', 0.6, 0.5], ['rollUp', 0.8, 0.55], ['ok', 2.4, 1.0]],
  at: (k) => {
    if (k === 'brief' || k === 'warm') return stAt(-0.3, 0.72, Math.PI * 0.05);
    if (k === 'belt') return stAt(-0.72, 0.52, Math.PI);
    if (k === 'box' || k === 'punch') return stAt(ST.boxX, 0.02, -0.95, ST.box);
    if (k === 'fall' || k === 'flat') return stAt(ST.padX - 0.1, 0.0, Math.PI / 2 + Math.PI);
    if (k === 'sit') return stAt(ST.padX - 0.05, 0.0, -Math.PI / 2, ST.pad);
    if (k === 'up') return stAt(0.0, 0.55, Math.PI / 2 - 0.1);
    if (k === 'wire' || k === 'air') return stAt(-0.05, 0, Math.PI / 2, k === 'air' ? 0.72 : 0);
    if (k === 'land' || k === 'rollIn') return stAt(0.28, 0.0, Math.PI / 2, ST.pad);
    if (k === 'roll' || k === 'rollUp') return stAt(0.6, 0.0, Math.PI / 2);
    return stAt(0.25, 0.75, 0.15);
  },
  key(k, u, c) {
    const pad = ST.pad;
    const belt = k === 'belt' ? u > 0.4 : k === 'box' || k === 'punch' || k === 'fall' || k === 'flat' || k === 'sit' || k === 'up' || k === 'wire' || k === 'air' || k === 'land' || k === 'rollIn';
    const wire = k === 'wire' || k === 'air';
    const hip = c.bd(0, 0.54 * c.H, 0);
    const worn = belt && k !== 'fall' && k !== 'flat' && k !== 'sit' && k !== 'rollIn';
    const home: Bits = { props: { belt: worn ? hip : null, line: wire ? add(hip, 0, 0.12, 0) : null }, n: { taut: wire ? 1 : 0 } };
    switch (k) {
      case 'brief':
        // Coordinator shows it first: the hit, the head, the fall. The dweller watches, nodding.
        return K({ l: idle(c, 1), r: idle(c, -1), nod: 0.04 + 0.08 * wave(c.t, 1), lean: 0.03 }, home, coachF({ at: [-1.3, 0, 0.7], yaw: 1.57, l: [-1.08, 1.25 + 0.08 * wave(c.t, 1), 0.86], r: [-1.08, 1.2, 0.5] }), say('맞는 척만, 천천히!', WHO.a));
      case 'warm': {
        // Shoulders round, wrists out.
        const a = c.t * 4;
        return K({ l: c.bd(0.28, (0.8 + 0.2 * Math.sin(a)) * c.H, 0.08 + 0.1 * Math.cos(a)), r: c.bd(-0.28, (0.8 + 0.2 * Math.sin(a + 1.3)) * c.H, 0.08 + 0.1 * Math.cos(a + 1.3)), lean: 0.02, nod: -0.05, gl: 0.3, gr: 0.3 }, home, coachF({ at: [-1.3, 0, 0.7], yaw: 1.57, l: null, r: [-1.1, 1.05, 0.62], nod: 0.15 }));
      }
      case 'belt': {
        // The harness off the post and round the waist; the buckle done up with both hands.
        const from: V = [-0.95, 1.05, -0.32];
        const b = u < 0.4 ? lerpV(from, hip, sm(u, 0, 0.4)) : hip;
        return K({ l: add(b, 0.06, 0.02, 0.16), r: add(b, -0.06, 0.02, 0.16), lean: 0.2, nod: 0.45, gl: 0.8, gr: 0.8, palms: 0.8 }, home, coachF({ at: [-1.3, 0, 0.7], yaw: 1.8, nod: 0.1 }), { props: { belt: b } });
      }
      case 'box':
        return K({ l: openTo(c, 1, 0.2, 0.62), r: openTo(c, -1, 0.2, 0.62), nod: 0.15, lean: 0.03, gl: 0.3, gr: 0.3 }, home, coachF({ at: [-1.35, 0, 0.55], yaw: 2.27, l: [-1.05, 1.15, 0.32], nod: -0.1 }), say('셋에 넘어가요!', WHO.a));
      case 'punch': {
        // The swing, a foot short, slow; the head goes with it, a beat too late.
        const swing = sm(u, 0.2, 0.68);
        const fist: V = lerpV([-1.28, 1.42, 0.1], [-0.92, 1.72, 0.2], swing);
        return K({ l: openTo(c, 1, 0.18, 0.6), r: openTo(c, -1, 0.18, 0.6), lean: -0.12 * sm(u, 0.55, 0.9), nod: -0.18 * sm(u, 0.55, 0.9), gl: 0.6, gr: 0.6 }, home, coachF({ at: [-1.35, 0, 0.55], yaw: 2.27, l: fist, nod: -0.12 }), { props: { fist } });
      }
      case 'fall':
        // Backwards off the box onto the pad, flat, arms out: the hold ends in the air.
        return K({ asana: { k: 'supine', floor: pad } }, home, coachF({ at: [-1.35, 0, 0.55], yaw: 2.0, nod: 0.15 }));
      case 'flat':
        return K({ asana: { k: 'supine', floor: pad } }, home, coachF({ at: [1.3, 0, 0.42], yaw: -1.8, nod: 0.45, r: [1.08, 1.0, 0.3] }), say('괜찮아요?', WHO.a));
      case 'sit':
        return K({ asana: { k: 'crossed', floor: pad }, r: c.bd(-0.24, 0.42 * c.H, 0.16), l: c.bd(0.22, 0.22 * c.H, 0.12), gr: 0.9 }, home, coachF({ at: [1.3, 0, 0.42], yaw: -1.8, nod: 0.3, r: [1.08, 1.2, 0.3] }), say('오케이, 잘 떨어졌어!', WHO.a));
      case 'up':
        // Off the pad, the coordinator clips the wire on and walks to the rope.
        return K({ l: add(hip, 0.1, 0.05, 0.14), r: add(hip, -0.1, 0.05, 0.14), lean: 0.18, nod: 0.42, gl: 0.8, gr: 0.8 }, home, coachF({ at: lerpV([1.3, 0, 0.42], [1.3, 0, 0.1], sm(u, 0.3, 0.9)), yaw: -1.57, l: [1.1, 1.3, 0.1] }));
      case 'wire':
        // Hauled up: the rope comes down hand over hand. A kick in the air, a look down.
        return K({ l: c.bd(0.3, 0.66 * c.H, 0.14), r: c.bd(-0.3, 0.66 * c.H, 0.14), lean: 0.02, nod: 0.1, gl: 0.5, gr: 0.5 }, home, coachF({ at: [1.3, 0, 0.1], yaw: -1.57, l: [1.12, 1.5 - 0.3 * frac(u * 3), 0.06], r: [1.12, 1.2 + 0.3 * frac(u * 3), 0.1], nod: -0.4 }), { props: { hand: [1.12, 1.35, 0.08] } }, u < 0.35 ? say('당겨요! 힘 빼고!', WHO.a) : {});
      case 'air': {
        const a = c.t * 2.2;
        return K({ l: c.bd(0.42, 0.74 * c.H + 0.08 * Math.sin(a), 0.14), r: c.bd(-0.42, 0.74 * c.H - 0.08 * Math.sin(a), 0.14), lean: 0.08 + 0.05 * Math.sin(a * 0.5), nod: 0.35, gl: 0.2, gr: 0.2 }, home, coachF({ at: [1.3, 0, 0.1], yaw: -1.57, l: [1.12, 1.3, 0.06], r: [1.12, 1.05, 0.1], nod: -0.4 }), say('좋아, 내려갑니다!', WHO.a));
      }
      case 'land':
        // Down onto the pad with bent knees.
        return K({ l: openTo(c, 1, 0.22, 0.44), r: openTo(c, -1, 0.22, 0.44), crouch: 0.5 * (1 - sm(u, 0.2, 0.9)), lean: 0.2, nod: 0.2 }, home, coachF({ at: [1.3, 0, 0.1], yaw: -1.57, l: [1.12, 1.45, 0.06], nod: -0.1 }));
      case 'rollIn':
        return K({ asana: { k: 'child', floor: pad } }, home, coachF({ at: [1.3, 0, 0.5], yaw: -1.57 }));
      case 'roll':
        return K({ asana: { k: 'supine', floor: pad } }, home, coachF({ at: [1.3, 0, 0.5], yaw: -1.57 }));
      case 'rollUp':
        return K({ asana: { k: 'crossed', floor: pad } }, home, coachF({ at: [1.3, 0, 0.5], yaw: -1.57, ...clapHands(c.t, 1.1, 1.15, 0.5) }));
      default: {
        // Down and thumbs up; the coordinator holds up a hand for a slap.
        const slap = sm(u, 0.25, 0.5) * (1 - sm(u, 0.72, 0.95));
        return K({ r: lerpV(c.bd(-0.22, 0.56 * c.H, 0.1), [0.62, 1.4, 0.82], slap), l: idle(c, 1), gr: 0.05 + 0.5 * (1 - slap), palms: -0.4, nod: -0.05, lean: 0.05 }, home, coachF({ at: [0.98, 0, 0.92], yaw: -1.8, r: [0.64, 1.4, 0.84], nod: -0.05 }), say('한 번에 됐네요!', WHO.a));
      }
    }
  },
};

// =============================================================================================
// 대본 테이블 (scriptTable, 2 × 1): a long table, its chair out front, the stack and the highlighters.

export const TB = {
  top: 0.74,
  seat: st(0, 0.47, 0.54, Math.PI, { sit: true, floor: 0 }),
  page: [0, 0.752, 0.03] as V,
  pen: [0.42, 0.79, -0.02] as V,
  glass: [-0.46, 0.8, 0.0] as V,
  chart: [0.0, 1.36, -0.72] as V,
  stack: [0.72, 0.8, -0.12] as V,
};
/** The left hand flat on the page's edge and the right on its way; a seated reader's nod. */
const READ: Script = {
  seq: [['open', 1.8], ['skim', 2.6], ['hi1', 3.2], ['mouth', 3.2], ['sip', 2.8], ['hi2', 3.0], ['turn', 1.4], ['hi3', 2.6], ['tab', 1.8], ['aloud', 3.0]],
  at: () => TB.seat,
  key(k, u, c) {
    const pageEdge: V = add(TB.page, 0.14, 0.012, 0.08);
    const pg = k === 'hi3' || k === 'tab' || k === 'aloud' || (k === 'turn' && u > 0.5) ? 1 : 0;
    const lines = k === 'open' || k === 'skim' ? 0 : k === 'hi1' ? u * 1.99 : k === 'mouth' || k === 'sip' ? 2 : k === 'hi2' ? 2 + u * 1.99 : k === 'turn' ? (u > 0.5 ? 0 : 4) : k === 'hi3' ? u * 2.99 : 3;
    const base: Bits = { props: { glass: TB.glass, pen: null, tab: null }, n: { _page: pg, _lines: Math.floor(lines), tabbed: k === 'aloud' || (k === 'tab' && u > 0.6) ? 1 : 0 } };
    const hi = (row: number, s: number): V => add(TB.page, -0.11 + 0.2 * s, 0.022, -0.1 + row * 0.042);
    const stroke = (row: number, uu: number) => {
      const p = hi(row, frac(uu));
      return K({ l: pageEdge, r: add(p, 0, 0.012, 0.01), nod: 0.5, lean: 0.14, gr: 0.9, gl: 0.2, palms: 1 }, base, { props: { pen: p } });
    };
    switch (k) {
      case 'open':
        // The stack's top copy brought over and opened.
        return K({ l: add(TB.page, 0.15, 0.02 + 0.04 * (1 - sm(u, 0.3, 0.8)), 0.06), r: add(TB.page, -0.15, 0.02 + 0.08 * (1 - sm(u, 0.3, 0.8)), 0.06), nod: 0.42, lean: 0.12, gl: 0.3, gr: 0.3, palms: 1 }, base, { n: { open: sm(u, 0.2, 0.8) } });
      case 'skim':
        // A finger down the page.
        return K({ l: pageEdge, r: add(TB.page, -0.08, 0.016, -0.11 + 0.2 * u), nod: 0.5, lean: 0.12, gr: 0.1, gl: 0.2, palms: 1 }, base);
      case 'hi1':
        return stroke(Math.floor(u * 2), u * 2);
      case 'mouth': {
        // Head up, eyes off the page, the lines said silently; the hand beating them out on the table.
        const b = 0.012 * Math.max(0, wave(c.t, 1.6));
        return K({ l: pageEdge, r: add(TB.page, -0.25, 0.015 + b, 0.1), nod: -0.04 + 0.04 * wave(c.t, 0.5), lean: 0.02, gr: 0.5, gl: 0.2, palms: 1 }, base);
      }
      case 'sip': {
        const up = sm(u, 0.15, 0.4) * (1 - sm(u, 0.7, 0.92));
        const g = lerpV(TB.glass, c.bd(0.04, 0.45 * c.H, 0.16), up);
        return K({ l: add(g, 0, 0.01, 0), r: add(TB.page, -0.1, 0.012, 0.1), gl: 0.85, gr: 0.3, nod: 0.25 - 0.3 * up, lean: 0.06, palms: 1 }, base, { props: { glass: g } });
      }
      case 'hi2':
        return stroke(2 + Math.floor(u * 2), u * 2);
      case 'turn':
        // A page over, right to left, a finger under it.
        return K({ l: pageEdge, r: add(TB.page, -0.1 + 0.2 * sm(u, 0, 1), 0.02 + 0.09 * Math.sin(u * Math.PI), 0.02), nod: 0.45, lean: 0.12, gl: 0.2, gr: 0.3, palms: 0.9 }, base, { n: { flip: u } });
      case 'hi3':
        return stroke(Math.floor(u * 3), u * 3);
      case 'tab':
        // A sticky tab on the edge, to find it again.
        return K({ l: pageEdge, r: add(TB.page, 0.15, 0.02, -0.06 + 0.02 * sm(u, 0, 0.6)), nod: 0.45, lean: 0.14, gr: 0.75, gl: 0.2, palms: 1 }, base, { props: { tab: u < 0.6 ? add(TB.page, 0.15, 0.025, -0.06) : null } });
      default:
        // Read out low, the hands telling it for no one.
        return K({ l: pageEdge, r: c.bd(-0.26, (0.3 + 0.06 * wave(c.t, 0.9)), 0.34), nod: 0.15 + 0.2 * Math.abs(wave(c.t, 0.25)), lean: 0.05, gr: 0.1, gl: 0.2, palms: 0.2 }, base, say('…그때 왜 말 안 했어요?', WHO.dweller));
    }
  },
};

const VC_AT = st(0, 0, 0.72, Math.PI);
const voiceCoach = (over: Fig = {}) => fig('coach', { at: [1.25, 0, 0.72], yaw: -Math.PI / 2, ...over });
const VOICE: Script = {
  seq: [['belly', 3.6], ['out', 2.8], ['hum', 2.8], ['pen', 1.6], ['twist', 3.6], ['penOut', 1.2], ['far', 3.0], ['nod', 2.2]],
  at: () => VC_AT,
  key(k, u, c) {
    const breath = wave(c.t, 0.3);
    const belly = c.bd(0.02, (0.56 + 0.01 * breath) * c.H, 0.14 + 0.018 * breath);
    const chest = c.bd(0.02, (0.7 + 0.008 * breath) * c.H, 0.12);
    const base: Bits = { props: { pen: null, chartLine: null }, n: { _chart: k === 'twist' ? 1 + Math.floor(u * 3) : k === 'far' || k === 'nod' ? 3 : 0, chart: 1 } };
    const stem = c.bd(0, 0.87 * c.H, 0.135);
    switch (k) {
      case 'belly':
        // A hand on the belly, a hand on the chest: the chest stays still.
        return K({ l: chest, r: belly, gl: 0.2, gr: 0.2, palms: 0.2, nod: 0.05 - 0.05 * breath, lean: 0 }, base, voiceCoach({ r: [1.05, 1.24 + 0.05 * breath, 0.72], l: [1.3, 1.0, 0.86] }), say('가슴 말고 배로!', WHO.a));
      case 'out': {
        // Arms up on the breath in, down slowly on a long 'ㅅ—'.
        const a = sm(u, 0, 0.25) * (1 - sm(u, 0.3, 1));
        return K({ l: c.bd(0.36, (0.6 + 0.5 * a) * c.H, 0.08), r: c.bd(-0.36, (0.6 + 0.5 * a) * c.H, 0.08), gl: 0.1, gr: 0.1, palms: 0, nod: -0.2 * a, lean: -0.03 * a }, base, voiceCoach({ l: [1.12, 1.22 + 0.2 * a, 0.72], r: [1.12, 1.22 + 0.2 * a, 0.6] }));
      }
      case 'hum':
        // A hum, fingers on the bridge of the nose, feeling it ring.
        return K({ l: c.bd(0.01, 0.9 * c.H, 0.13), r: c.bd(-0.1, 0.72 * c.H, 0.15), gl: 0.2, gr: 0.2, palms: 0.1, nod: 0.02 + 0.03 * wave(c.t, 1.4) }, base, voiceCoach({ nod: 0.1, l: [1.1, 1.3, 0.72], r: null }), say('음— 음—', WHO.dweller));
      case 'pen': {
        const p = lerpV(TB.pen, stem, sm(u, 0.1, 0.8));
        return K({ r: add(p, -0.03, -0.01, 0.02), l: idle(c, 1), gr: 0.9, nod: 0.3 - 0.3 * sm(u, 0.2, 0.8), lean: 0.2 - 0.2 * sm(u, 0.3, 0.9) }, base, voiceCoach(), { props: { pen: p } });
      }
      case 'twist':
        // The pen between the teeth, the tongue twister on the chart read out, a finger going along it.
        return K({ r: idle(c, -1), l: add(TB.chart, -0.28 + 0.56 * frac(u * 3), 0.13 - 0.13 * Math.floor(u * 3), 0.1), gl: 0.15, palms: 0.05, nod: -0.08, lean: 0.12 }, base, voiceCoach({ r: [1.05, 1.24, 0.72], nod: 0.04 }), { props: { pen: stem } }, say(['간장 공장 공장장은…', '강 공장장이고…', '된장 공장 공장장은…'][Math.min(2, Math.floor(u * 3))], WHO.dweller));
      case 'penOut': {
        const p = lerpV(stem, TB.pen, sm(u, 0.2, 0.95));
        return K({ r: add(p, -0.03, -0.01, 0.02), l: idle(c, 1), gr: 0.9, nod: 0.3 * sm(u, 0.3, 0.9), lean: 0.2 * sm(u, 0.3, 0.9) }, base, voiceCoach(), { props: { pen: p } });
      }
      case 'far':
        // To the back of the room, without shouting: a hand at the corner of the mouth, then open.
        return K({ l: c.bd(0.2, 0.86 * c.H, 0.14), r: openTo(c, -1, 0.4, 0.82), gl: 0.15, gr: 0.05, palms: -0.2, nod: -0.1, lean: -0.02 }, base, voiceCoach({ at: [1.35, 0, 1.45], yaw: -1.0, r: [1.15, 1.45, 1.3] }), say('저— 뒤까지 들리게!', WHO.a));
      default:
        return K({ l: idle(c, 1), r: idle(c, -1), nod: 0.15 + 0.12 * wave(c.t, 0.9), lean: 0.1 }, base, voiceCoach({ ...clapHands(c.t, 1.05, 1.15, 0.72) }), say('좋아졌어요!', WHO.a));
    }
  },
};

const JUNIOR: V = [-0.5, 0, 0.82];
const juniorF = (over: Fig = {}) => fig('junior', { at: JUNIOR, yaw: 0.8, ...over });
const juniorScript = (): Fig => ({ l: add(JUNIOR, 0.26, 1.0, 0.1), r: add(JUNIOR, 0.1, 1.0, 0.22), nod: 0.32 });
const COACH: Script = {
  seq: [['listen', 3.2], ['stop', 1.6], ['show', 3.4, 0.8], ['mark', 2.6, 0.8], ['try', 3.2], ['clap', 2.4]],
  at: (k) => (k === 'show' ? st(0.1, 0, 1.05, -1.2) : k === 'mark' ? st(-0.12, 0, 0.92, -1.25) : st(0.32, 0, 1.0, -1.2)),
  key(k, u, c) {
    const pageAt: V = add(JUNIOR, 0.2, 1.0, 0.16);
    const base: Bits = { props: { junScript: pageAt, pen: null }, n: { chart: 0, _note: k === 'try' || k === 'clap' || (k === 'mark' && u > 0.5) ? 1 : 0 } };
    switch (k) {
      case 'listen':
        // Arms folded, weight on one leg, hearing the junior read it.
        return K({ l: c.bd(-0.1, 0.65 * c.H, 0.16), r: c.bd(0.1, 0.63 * c.H, 0.16), gl: 0.6, gr: 0.6, palms: 0.8, nod: 0.1 + 0.05 * wave(c.t, 0.5), lean: 0.02 }, base, juniorF(juniorScript()), say('그, 그럼 다시는 안 볼 거예요!', WHO.a));
      case 'stop':
        return K({ l: openTo(c, 1, 0.34, 0.75), r: idle(c, -1), gl: 0.05, palms: -0.2, nod: 0.05 }, base, juniorF({ ...juniorScript(), nod: 0.05 }), say('잠깐만요.', WHO.dweller));
      case 'show':
        // It shown: a line said to the air, a hand drawn back to the chest, and then quiet.
        return K({ l: lerpV(openTo(c, 1, 0.4, 0.78), c.bd(0.04, 0.68 * c.H, 0.15), sm(u, 0.4, 0.75)), r: idle(c, -1), gl: 0.15, palms: 0, nod: 0.25 * sm(u, 0.5, 0.9) }, base, juniorF({ ...juniorScript(), nod: 0.05 }), say('소리치지 말고, 삼키듯이.', WHO.dweller));
      case 'mark': {
        // A pencil mark on the junior's page: the breath, there.
        const p = add(pageAt, -0.04 + 0.08 * frac(u * 2), 0.03, 0);
        return K({ l: add(pageAt, 0.11, 0.0, 0.02), r: p, gl: 0.3, gr: 0.9, nod: 0.45, lean: 0.25, palms: 0.7 }, base, juniorF({ ...juniorScript(), nod: 0.35 }), { props: { pen: p } }, say('여기서 숨.', WHO.dweller));
      }
      case 'try':
        return K({ l: c.bd(0.0, 0.84 * c.H, 0.14), r: c.bd(-0.2, 0.6 * c.H, 0.18), gl: 0.5, gr: 0.5, palms: 0.5, nod: 0.05 + 0.1 * Math.abs(wave(c.t, 0.5)) }, base, juniorF({ l: add(JUNIOR, 0.26, 1.0, 0.1), r: add(JUNIOR, 0.16, 1.16, 0.2), nod: 0.2 }), say('…다시는, 안 볼 거예요.', WHO.a));
      default: {
        const h = clapHands(c.t, 0, 0, 0);
        const ch = c.bd(0, 0.68 * c.H, 0.24);
        return K({ l: add(ch, h.l[0], 0, 0), r: add(ch, h.r[0], 0, 0), gl: 0.1, gr: 0.1, palms: 0, nod: 0.03 }, base, juniorF({ ...juniorScript(), nod: -0.05, bob: laugh(c.t) * 0.5 }), say('그거예요!', WHO.dweller));
      }
    }
  },
};

const TABLE_READ: Script = {
  seq: [['turn', 1.6], ['hers', 3.0], ['mine', 3.2], ['his', 2.8], ['laugh', 2.4], ['note', 2.8], ['mine2', 3.0], ['close', 2.2]],
  at: () => TB.seat,
  key(k, u, c) {
    const pageEdge: V = add(TB.page, 0.14, 0.012, 0.08);
    const p: V = add(TB.page, -0.12, 0.016, 0.1);
    const pg = k === 'turn' ? (u > 0.5 ? 1 : 0) : k === 'hers' || k === 'mine' || k === 'his' || k === 'laugh' ? 1 : 2;
    const base: Bits = { props: { pen: null, glass: TB.glass }, n: { _page: pg, _lines: k === 'mine2' || k === 'close' ? 2 : 1, flip: k === 'turn' ? u : 0, open: 1 } };
    const readingF = (name: string, speak: boolean, over: Fig = {}) => fig(name, { nod: speak ? 0.12 + 0.1 * Math.abs(wave(c.t, 0.8)) : 0.38, head: 0, ...over });
    const cast = (a: boolean, b: boolean, d: Fig = {}, e: Fig = {}): Bits[] => [
      readingF('her', a, e),
      readingF('him', b, e),
      fig('director', { yaw: Math.PI / 2, nod: 0.1, head: 0, ...d }),
    ];
    switch (k) {
      case 'turn':
        return K({ l: pageEdge, r: add(TB.page, -0.1 + 0.2 * u, 0.02 + 0.09 * Math.sin(u * Math.PI), 0.02), nod: 0.45, lean: 0.12, palms: 0.9 }, base, ...cast(false, false));
      case 'hers':
        return K({ l: pageEdge, r: p, nod: 0.42, lean: 0.08, palms: 1 }, base, ...cast(true, false), say('S#37. 비, 골목.', WHO.a));
      case 'mine':
        return K({ l: pageEdge, r: c.bd(-0.26, 0.32 + 0.05 * wave(c.t, 0.9), 0.34), nod: 0.18 + 0.1 * Math.abs(wave(c.t, 0.7)), lean: 0.06, gr: 0.1, palms: 0.2 }, base, ...cast(false, false, { head: 0.3 }), say('왜 이제 왔어요?', WHO.dweller));
      case 'his':
        return K({ l: pageEdge, r: p, nod: 0.42, lean: 0.08, palms: 1 }, base, ...cast(false, true), say('기다렸어. 삼 년을.', WHO.b));
      case 'laugh':
        // Someone's fluffed it; the whole table goes.
        return K({ l: pageEdge, r: c.bd(-0.16, 0.34, 0.2), nod: -0.05 + 0.1 * Math.abs(wave(c.t, 3)), lean: -0.03 + 0.03 * Math.abs(wave(c.t, 3)), gr: 0.5, palms: 0.2 }, base, ...cast(false, false, { bob: laugh(c.t) }, { bob: laugh(c.t) * 1.3, nod: -0.05 }), say('삼 년이요? 삼 일 아니고?', WHO.c));
      case 'note': {
        // The director changes a line. Everyone writes it in.
        const pen = add(TB.page, -0.08 + 0.15 * frac(u * 2), 0.024, 0.0);
        return K({ l: pageEdge, r: pen, gr: 0.9, nod: 0.5, lean: 0.14, palms: 1 }, base, ...cast(false, false, { r: [-0.96, 0.98, -0.08], nod: 0.2 }), { props: { pen } }, say('그 대사는 빼고 갑시다.', WHO.c));
      }
      case 'mine2':
        return K({ l: pageEdge, r: c.bd(-0.2, 0.36, 0.3), nod: 0.2 + 0.08 * wave(c.t, 0.7), gr: 0.15, lean: 0.06, palms: 0.2 }, base, ...cast(false, false, { head: 0.3 }), say('…가지 마요.', WHO.dweller));
      default:
        return K({ l: add(TB.page, 0.15, 0.03, 0.06), r: add(TB.page, -0.15, 0.03, 0.06), nod: 0.25, lean: 0.03, palms: 1 }, base, ...cast(false, false, {}, { nod: 0.05 }), say('좋아요, 오늘은 여기까지.', WHO.c));
    }
  },
};

// =============================================================================================
// 비디오 빌리지 (acVillage, 2 × 1): a black tent, two monitors on a cart, canvas chairs in front of them.

export const VV = {
  monL: [-0.32, 1.24, -0.26] as V,
  monR: [0.32, 1.24, -0.26] as V,
  chairD: [-0.42, 0, 0.26] as V,
  chairS: [0.46, 0, 0.26] as V,
  phones: [0.05, 0.86, -0.2] as V,
};
const VV_AT = st(0.02, 0, 1.0, Math.PI);
const VILLAGE: Script = {
  seq: [['come', 2.4], ['play', 4.0], ['pause', 2.4, 0.7], ['point', 3.2, 0.7], ['talk', 3.0], ['alt', 3.4], ['circle', 2.8]],
  at: (k) => (k === 'come' || k === 'talk' ? VV_AT : k === 'alt' ? st(0.12, 0, 0.82, Math.PI) : k === 'circle' ? VV_AT : k === 'point' || k === 'pause' ? st(-0.02, 0, 0.6, Math.PI) : st(0, 0, 0.92, Math.PI)),
  key(k, u, c) {
    const earSet = c.bd(0, 0.97 * c.H, 0.0);
    const cans = k === 'come' ? lerpV(VV.phones, earSet, sm(u, 0.2, 0.7)) : earSet;
    const off = k === 'circle' && u > 0.5;
    const base: Bits = { props: { cans: off ? lerpV(earSet, VV.phones, sm(u, 0.5, 0.9)) : cans, pencil: null }, n: { _L: k === 'alt' ? 2 : k === 'circle' ? 3 : k === 'come' ? 0 : 1, _R: k === 'alt' ? 4 : k === 'circle' ? 3 : 5, play: k === 'play' ? u : k === 'pause' || k === 'point' || k === 'talk' ? 0.55 : k === 'alt' ? 0.1 + 0.9 * u : k === 'circle' ? 1 : 0, _note: k === 'circle' && u > 0.35 ? 1 : 0 } };
    const dirF = (over: Fig = {}) => fig('director', { yaw: Math.PI, head: 0, nod: 0.02, ...over });
    const supF = (over: Fig = {}) => fig('super', { yaw: Math.PI, nod: 0.42, head: 0, l: [0.54, 0.76, -0.02], r: [0.4, 0.76, -0.02], ...over });
    switch (k) {
      case 'come':
        // Up behind the chairs, the headphones on, one hand on the back of the director's chair.
        return K({ l: add(cans, 0.14, 0, 0), r: [-0.25, 1.0, 0.24], gl: 0.8, gr: 0.5, nod: 0.05, lean: 0.03 }, base, dirF(), supF(), say('네 테이크 3, 한번 보자.', WHO.a));
      case 'play':
        return K({ l: c.bd(-0.1, 0.65 * c.H, 0.16), r: c.bd(0.1, 0.63 * c.H, 0.16), gl: 0.6, gr: 0.6, palms: 0.8, nod: 0.02, lean: 0.06 }, base, dirF({ l: [-0.32, 0.9, 0.0], nod: -0.03 }), supF());
      case 'pause':
        return K({ l: c.bd(-0.1, 0.65 * c.H, 0.16), r: c.bd(0.1, 0.63 * c.H, 0.16), gl: 0.6, gr: 0.6, palms: 0.8, nod: 0.05, lean: 0.14 }, base, dirF({ r: [-0.2, 1.0, -0.08], nod: 0 }), supF(), say('여기.', WHO.a));
      case 'point': {
        // Leaning between the chairs, a finger to the monitor.
        const f = add(VV.monL, -0.03 + 0.02 * wave(c.t, 0.9), 0.02, 0.1);
        return K({ r: f, l: c.bd(0.14, 0.58 * c.H, 0.2), gr: 0.1, gl: 0.3, palms: 0, nod: 0.05, lean: 0.34 }, base, dirF({ head: -0.1 }), supF(), say('눈이 먼저 움직였네요.', WHO.dweller));
      }
      case 'talk':
        // Back up. The director's turned in the chair, explaining with a hand; the dweller nods along.
        return K({ l: c.bd(-0.1, 0.65 * c.H, 0.16), r: c.bd(0.1, 0.63 * c.H, 0.16), gl: 0.6, gr: 0.6, palms: 0.8, nod: 0.02 + 0.14 * Math.abs(wave(c.t, 0.8)), lean: 0.05 }, base, dirF({ head: -1.0, r: [-0.2, 1.08 + 0.04 * wave(c.t, 1.1), 0.5] }), supF(), say('그 눈, 살린다. 근데 호흡만 반 박자.', WHO.a));
      case 'alt': {
        // The two takes side by side, the dweller looking from one to the other.
        const look = wave(c.t, 0.35);
        return K({ l: c.bd(0.12, 0.58 * c.H, 0.2), r: add(c.bd(0, 0.84 * c.H, 0.14), 0, 0, 0), gl: 0.3, gr: 0.5, palms: 0.5, nod: 0.03, lean: 0.14 + 0.05 * look }, base, dirF({ head: 0.1 * look }), supF());
      }
      default: {
        // The supervisor rings the take in the book. Done; the headphones back on the cart.
        const off2 = u > 0.5;
        const h = off2 ? lerpV(earSet, VV.phones, sm(u, 0.5, 0.9)) : earSet;
        const p: V = [0.46 + 0.03 * Math.cos(c.t * 8), 0.77, 0.0 + 0.03 * Math.sin(c.t * 8)];
        return K({ r: idle(c, -1), l: add(h, 0.14, 0, 0), gl: 0.8, nod: 0.08, lean: 0.03 }, base, dirF({ ...clapHands(c.t, -0.42, 0.95, -0.05) }), supF({ r: p }), { props: { pencil: p } }, say('3번으로 갑니다. 오케이!', WHO.b));
      }
    }
  },
};

// =============================================================================================
// 배우 대기 의자 (acCastChairs, 3 × 1): three canvas chairs with names on their backs, side tables between.

export const CC = {
  seat: st(0, 0.5, 0.02, 0, { sit: true, floor: 0 }),
  script: [0.5, 0.56, 0.0] as V,
  cup: [-0.5, 0.6, 0.02] as V,
  hi: [0.5, 0.59, -0.1] as V,
  her: [-1.0, 0, 0.0] as V,
};
const seatedScript = (c: Ctx): V => c.bd(0, 0.33, 0.28);
const WAIT: Script = {
  seq: [['take', 1.6], ['read', 3.0], ['mark', 2.6], ['cover', 3.6], ['peek', 1.8], ['sip', 2.8], ['run', 3.4], ['call', 2.6, 0.9], ['stretch', 2.4, 1.0]],
  at: (k) => (k === 'stretch' ? st(0, 0, 0.55, 0) : CC.seat),
  key(k, u, c) {
    const s = seatedScript(c);
    const herF = (over: Fig = {}) => fig('her', { nod: 0.35, ...over });
    const adF = (over: Fig = {}) => fig('ad', { at: [1.05, 0, 1.15], yaw: -1.0, ...over });
    const base: Bits = { props: { script: s, hi: null, cup: CC.cup }, n: { _lines: c.after('mark') || (k === 'mark' && u > 0.5) ? 2 : 1, _cover: k === 'cover' ? 1 : 0, _adOn: k === 'call' || k === 'stretch' ? 1 : 0 } };
    const L = add(s, 0.1, -0.02, 0);
    const R = add(s, -0.1, -0.02, 0);
    switch (k) {
      case 'take': {
        const p = lerpV(CC.script, s, sm(u, 0.2, 0.85));
        return K({ r: add(p, -0.06, 0, 0), l: seatedIdle(c, 1), gr: 0.75, nod: 0.3, lean: 0.14 }, base, herF(), adF({ at: [1.9, 0, 1.3] }), { props: { script: p } });
      }
      case 'read':
        return K({ l: L, r: R, gl: 0.7, gr: 0.7, nod: 0.42, lean: 0.03, palms: 0.5 }, base, herF(), adF({ at: [1.9, 0, 1.3] }));
      case 'mark': {
        const hi = add(s, -0.06 + 0.12 * frac(u * 2), 0.03, -0.03);
        return K({ l: L, r: hi, gl: 0.7, gr: 0.9, nod: 0.5, lean: 0.08, palms: 0.8 }, base, herF(), adF({ at: [1.9, 0, 1.3] }), { props: { hi } });
      }
      case 'cover':
        // Page against the chest, eyes up, lips going: is it in there?
        return K({ l: c.bd(0.06, 0.36, 0.17), r: c.bd(-0.1, 0.36, 0.17), gl: 0.7, gr: 0.7, nod: -0.06 + 0.04 * wave(c.t, 0.6), lean: -0.02 }, base, herF(), adF({ at: [1.9, 0, 1.3] }), { props: { script: c.bd(-0.02, 0.36, 0.2) } });
      case 'peek':
        // A corner lifted to check it.
        return K({ l: L, r: R, gl: 0.7, gr: 0.7, nod: 0.48, lean: 0.03 }, base, herF(), adF({ at: [1.9, 0, 1.3] }));
      case 'sip': {
        const up = sm(u, 0.1, 0.35) * (1 - sm(u, 0.72, 0.95));
        const cup = lerpV(CC.cup, c.bd(0.03, 0.46 * c.H, 0.15), up);
        return K({ l: add(cup, 0, 0.0, 0), r: R, gl: 0.85, gr: 0.7, nod: 0.2 - 0.26 * up, lean: 0.03 }, base, herF({ nod: 0.2 }), adF({ at: [1.9, 0, 1.3] }), { props: { cup } });
      }
      case 'run':
        // Lines run with her in the next chair: both heads turned, she reads, the dweller answers from memory.
        return K({ l: L, r: c.bd(-0.2, 0.42 + 0.05 * wave(c.t, 0.9), 0.32), gl: 0.7, gr: 0.1, palms: 0.1, nod: 0.02, lean: 0.03 }, base, herF({ head: 0.8, nod: 0.08, l: [-1.02, 0.84, 0.3], r: [-1.12, 0.84, 0.28] }), adF({ at: [1.9, 0, 1.3] }), u < 0.5 ? say('…그래서, 언제 갈 건데?', WHO.a) : say('비 그치면요.', WHO.dweller));
      case 'call':
        // The AD with a walkie, on the way past.
        return K({ l: L, r: R, gl: 0.7, gr: 0.7, nod: -0.06, lean: 0.03 }, base, herF({ nod: -0.04, head: 0.5 }), adF({ at: lerpV([1.9, 0, 1.3], [0.8, 0, 1.05], sm(u, 0, 0.4)), yaw: -2.48, r: [0.85, 1.42, 1.0], head: -0.2 }), { props: { walkie: [0.85, 1.42, 1.0] } }, say('5분 뒤 슛 들어갑니다!', WHO.b));
      default:
        // Up, script under the arm, neck and shoulders loosened.
        return K({ l: c.bd(0.3, 1.05 * c.H, 0.03 + 0.03 * wave(c.t, 0.8)), r: c.bd(-0.18, 0.66 * c.H, 0.1), gl: 0.3, gr: 0.75, nod: -0.2 + 0.1 * wave(c.t, 0.8), lean: -0.04 }, base, herF(), adF({ at: [0.8, 0, 1.05], yaw: -2.48 }), { props: { script: c.bd(-0.18, 0.66 * c.H, 0.12) } });
    }
  },
};

// =============================================================================================
// 의상 피팅 코너 (acCostume, 2 × 1): a rail of costumes by scene number, a low round box, a tall mirror.

export const CF = {
  box: 0.1,
  stand: st(-0.15, 0.1, 0.58, 0.12),
  coat: [-0.55, 1.45, -0.28] as V,
  mirror: [0.82, 1.1, -0.1] as V,
  board: [0.58, 1.34, -0.42] as V,
};
const FIT: Script = {
  seq: [['up', 1.8, 0.8], ['coat', 2.6], ['shoulder', 3.4], ['arm', 2.8], ['hem', 3.2], ['mirror', 2.8, 0.8], ['photo', 2.6], ['pin', 2.4, 0.8]],
  at: (k) => (k === 'mirror' ? st(0.3, 0, 0.56, 1.05) : CF.stand),
  key(k, u, c) {
    const H = c.H;
    const fitter = (over: Fig) => fig('fitter', { at: [-0.86, 0, 0.88], yaw: 1.97, ...over });
    const base: Bits = { props: {}, n: { _coat: 0, _photo: 0, tape: 0, flash: 0 } };
    const coatOn: Bits = { props: {}, n: { _coat: 1 } };
    const sh = (s: number) => c.bd(s * 0.19, 0.82 * H, 0.03);
    switch (k) {
      case 'up':
        // On the box, arms just off the sides, looking at the rail.
        return K({ l: idle(c, 1), r: idle(c, -1), nod: 0.0, lean: 0 }, base, fitter({ at: [-0.65, 0, 0.42], yaw: Math.PI + 0.4, r: lerpV([-0.65, 1.1, 0.32], CF.coat, sm(u, 0.2, 0.9)), head: 0.1 }), say('S#37 코트 나왔어요.', WHO.a));
      case 'coat': {
        // The coat off the rail and on, the fitter easing it up the arms.
        const p = sm(u, 0.2, 0.75);
        const a: V = lerpV([-0.65, 0, 0.42], [-0.6, 0, 0.82], sm(u, 0, 0.4));
        return K({ l: c.bd(0.34, 0.6 * H + 0.1 * p, 0.05), r: c.bd(-0.34, 0.6 * H + 0.1 * p, 0.05), gl: 0.3, gr: 0.3, palms: 0, nod: 0.1, lean: 0 }, base, { n: { _coat: u > 0.5 ? 1 : 0, coatY: 1 - p } }, fitter({ at: a, yaw: 1.9, l: add(c.bd(0.2, 0.72 * H, 0), 0, 0, 0), r: add(c.bd(-0.2, 0.72 * H, 0), 0, 0, 0), head: 0.1, nod: 0.05 }), { props: { coatH: lerpV(CF.coat, c.bd(0, 0.6 * H, 0), p) } });
      }
      case 'shoulder': {
        // A tape across the shoulders, the fitter behind them, reading it off.
        const L = sh(1);
        const R = sh(-1);
        return K({ l: c.bd(0.28, 0.56 * H, 0.05), r: c.bd(-0.28, 0.56 * H, 0.05), gl: 0.2, gr: 0.2, nod: 0.03, lean: 0 }, base, coatOn, fitter({ at: [-0.55, 0, 0.72], yaw: 1.9, l: L, r: R, head: 0.1, nod: 0.25 }), { props: { tapeA: L, tapeB: R } }, say('어깨 한 치 줄일게요.', WHO.a));
      }
      case 'arm': {
        // An arm held straight out, the sleeve pinched and pinned.
        const w = c.bd(-0.55, 0.78 * H, 0.1);
        const pin = lerpV(c.bd(-0.3, 0.8 * H, 0.04), w, 0.9);
        return K({ r: w, l: c.bd(0.25, 0.56 * H, 0.05), gr: 0.05, palms: 0, nod: 0.02 }, base, coatOn, fitter({ at: [-0.38, 0, 1.0], yaw: Math.PI * 0.95, l: add(pin, 0.02, 0, 0.04), r: add(pin, -0.05, -0.01, 0.04), nod: 0.25 }), { props: { pinA: pin } });
      }
      case 'hem': {
        // Down on one knee at the hem, pins from the wrist, the dweller looking down.
        const h = c.bd(-0.08 + 0.2 * frac(u * 2), 0.32 * H, 0.14);
        return K({ l: c.bd(0.25, 0.56 * H, 0.05), r: c.bd(-0.25, 0.56 * H, 0.05), gl: 0.2, gr: 0.2, nod: 0.5, lean: 0.08 }, base, coatOn, fitter({ at: [-0.1, -0.5, 1.02], yaw: Math.PI, l: h, r: add(h, 0.05, -0.02, 0), nod: 0.4 }), { props: { pinA: h } }, u > 0.5 ? say('움직여 보세요.', WHO.a) : {});
      }
      case 'mirror':
        // Across to the tall mirror: a turn left, a turn right, a tug at the lapel.
        return K({ l: c.bd(0.1, 0.72 * H, 0.14), r: c.bd(-0.26, 0.56 * H, 0.05), gl: 0.8, nod: 0.08, lean: 0.03 }, base, coatOn, fitter({ at: [-0.2, 0, 1.0], yaw: 2.2, l: null, r: null, head: -0.2 }));
      case 'photo': {
        // A polaroid for the continuity board, the flash once.
        const cam: V = [-0.1, 1.38, 1.0];
        const fl = u > 0.45 && u < 0.56 ? 1 : 0;
        return K({ l: idle(c, 1), r: idle(c, -1), nod: -0.03, lean: -0.01 }, base, coatOn, { n: { flash: fl, _photo: u > 0.56 ? 1 : 0 } }, fitter({ at: [-0.1, 0, 1.28], yaw: Math.PI, l: add(cam, 0.08, -0.03, 0.05), r: add(cam, -0.08, -0.03, 0.05), nod: 0.04 }), { props: { cam } }, u < 0.4 ? say('이쪽 보세요.', WHO.a) : {});
      }
      default: {
        // Clipped to the board with the others, a look at it together.
        const pic = lerpV([-0.1, 1.2, 0.95], CF.board, sm(u, 0.1, 0.8));
        return K({ l: idle(c, 1), r: c.bd(-0.12, 0.84 * H, 0.14), gr: 0.5, nod: 0.02, lean: 0.03 }, base, coatOn, { n: { _photo: u > 0.8 ? 2 : 1 } }, fitter({ at: lerpV([-0.1, 0, 1.2], [0.42, 0, 0.42], sm(u, 0, 0.6)), yaw: Math.PI - 0.1, r: add(pic, -0.02, -0.05, 0.08), l: null }), { props: { pic: u < 0.8 ? pic : null } }, u > 0.5 ? say('좋아요, 이대로 갑니다.', WHO.a) : {});
      }
    }
  },
};

// =============================================================================================
// 현장 분장 의자 (acTouchUp, 1 × 1): a tall folding chair on the floor of the stage, the kit open on its stand.

export const MC = {
  seat: st(0, 0.62, 0.02, 0, { sit: true, floor: 0 }),
  kit: [-0.34, 0.78, -0.3] as V,
  artist: [-0.46, 0, 0.3] as V,
};
const TOUCH: Script = {
  seq: [['tissue', 2.4], ['powder', 3.2], ['blot', 2.8], ['lip', 2.6], ['comb', 3.0], ['spray', 2.2], ['mirror', 3.0], ['call', 2.0]],
  at: () => MC.seat,
  key(k, u, c) {
    const H = c.H;
    const headY = c.st.y + 0.47 * H;
    const face = (side: number, up: number, out0 = 0.13): V => [side, headY + up, c.st.z + out0 - 0.06];
    const artist = (over: Fig) => fig('artist', { at: MC.artist, yaw: 2.2, ...over });
    const held = (s: string, p: V) => ({ props: { [s]: p } });
    const rest: Partial<Key> = { l: seatedIdle(c, 1), r: seatedIdle(c, -1), nod: -0.12, lean: -0.02, gl: 0.3, gr: 0.3 };
    const base: Bits = { props: { puff: null, sponge: null, brush: null, comb: null, can: null, mirror: null }, n: { mist: 0, tissue: 0 } };
    switch (k) {
      case 'tissue': {
        // A tissue tucked round the collar, so nothing gets on the costume.
        const p = face(0.02, -0.2, 0.09);
        return K(rest, base, artist({ l: add(p, 0.1, 0, 0), r: add(p, -0.08, 0, 0), nod: 0.25 }), { n: { tissue: 1 } }, say('5분 안에 끝낼게요.', WHO.a));
      }
      case 'powder': {
        // The puff on the forehead, the nose, each cheek.
        const a = c.t * 5;
        const row = Math.floor(u * 3);
        const p = add(face(row === 1 ? 0.0 : row === 0 ? 0.03 : -0.04, row === 0 ? 0.09 : 0, 0.13), 0.012 * Math.cos(a), 0.012 * Math.sin(a), 0);
        return K({ ...rest, nod: -0.16 }, base, artist({ r: add(p, 0, -0.02, 0.04), l: [-0.2, 0.92, 0.52], nod: 0.28, head: 0.1 }), held('puff', p), { n: { tissue: 1 } });
      }
      case 'blot': {
        // The sweat blotted under the eyes, a corner of sponge.
        const p = face(u < 0.5 ? 0.04 : -0.05, 0.01, 0.13);
        return K({ ...rest, nod: -0.2 }, base, artist({ r: add(p, 0, -0.02, 0.04), l: [-0.14, headY + 0.1, 0.1], nod: 0.28, head: 0.1 }), held('sponge', p), { n: { tissue: 1 } });
      }
      case 'lip': {
        const p = face(-0.03 + 0.06 * frac(u * 2), -0.07, 0.14);
        return K({ ...rest, nod: -0.1 }, base, artist({ r: add(p, 0, -0.03, 0.05), nod: 0.25 }), held('brush', p), { n: { tissue: 1 } }, say('입술 다물어 보세요.', WHO.a));
      }
      case 'comb': {
        // A stray lock combed back and tucked.
        const p = face(0.09 - 0.14 * frac(u * 2), 0.14, 0.04);
        return K({ ...rest, nod: -0.03 }, base, artist({ at: [-0.38, 0, 0.24], yaw: 2.0, r: add(p, -0.02, 0, 0.03), l: face(-0.13, 0.05, -0.02), nod: 0.2 }), held('comb', p), { n: { tissue: 0 } });
      }
      case 'spray': {
        // A hand over the eyes, a mist of spray.
        const can: V = [-0.1, headY + 0.38, 0.36];
        return K({ l: face(0.03, 0.03, 0.14), r: seatedIdle(c, -1), gl: 0.1, nod: 0.08 }, base, artist({ at: [-0.42, 0, 0.4], yaw: 2.0, r: can, l: null }), held('can', can), { n: { mist: u > 0.15 && u < 0.85 ? 1 : 0 } });
      }
      case 'mirror': {
        // A hand mirror, the dweller turning their chin one way and then the other.
        const m = c.bd(0.05, 0.42 * H + 0.03, 0.34);
        return K({ l: add(m, 0.0, -0.08, 0.0), r: seatedIdle(c, -1), gl: 0.9, nod: 0.02 + 0.03 * wave(c.t, 0.6), lean: 0.02 }, base, artist({ r: null, l: null, head: 0.1 }), held('mirror', m), u > 0.6 ? say('좋네요, 고마워요.', WHO.dweller) : {});
      }
      default:
        // The artist calls it in on the walkie.
        return K({ ...rest, nod: -0.03 }, base, artist({ r: [-0.56, 1.4, 0.36], l: null, head: 0.5 }), { props: { walkie: [-0.56, 1.4, 0.36] } }, say('분장 오케이입니다!', WHO.a));
    }
  },
};

// =============================================================================================
// 그린 스크린 (acGreen, 3 × 2): a green cove with tracking crosses, a monitor cart that shows what the
// CG will be, a tennis ball on a pole for an eyeline, and a foam sword.

export const GS = {
  sword: [-1.25, 0.56, 0.46] as V,
  mon: [1.2, 1.34, 0.68] as V,
  hold: [0.92, 0, -0.42] as V,
  mark: [-0.1, 0, 0.3] as V,
};
const ballHigh: V = [0.55, 2.3, -0.3];
const ballLow: V = [0.2, 1.72, 0.08];
const GREEN: Script = {
  seq: [['eye', 3.2, 0.9], ['take', 1.8, 0.9], ['gasp', 2.6, 0.7], ['dodge', 1.6, 0.5], ['back', 1.0, 0.5], ['swing', 3.0], ['hit', 0.5, 0.5], ['down', 1.8, 0.9], ['knee', 1.4, 0.8], ['hero', 3.2], ['cut', 2.4]],
  at: (k) => {
    const yaw = 0.95;
    if (k === 'eye') return st(GS.mark[0], 0, GS.mark[2], yaw);
    if (k === 'take') return st(-0.98, 0, 0.5, -1.4);
    if (k === 'gasp') return st(-0.4, 0, 0.45, yaw);
    if (k === 'dodge') return st(-0.8, 0, 0.1, yaw);
    if (k === 'back' || k === 'swing') return st(-0.3, 0, 0.3, yaw);
    if (k === 'hit' || k === 'down') return st(-0.72, 0, 0.42, yaw);
    if (k === 'knee') return st(-0.72, 0, 0.42, yaw);
    return st(-0.4, 0, 0.3, yaw);
  },
  key(k, u, c) {
    const base: Bits = { props: {}, n: { _mon: k === 'eye' ? 0 : k === 'take' ? 0 : k === 'cut' ? 2 : 1, roar: k === 'gasp' || k === 'swing' || k === 'hit' ? 1 : 0, tally: k === 'cut' ? 0 : 1 } };
    const crew = (ball: V, over: Fig = {}) => {
      const h: V = lerpV(GS.hold, ball, 0.44);
      return [fig('crew', { at: GS.hold, yaw: -1.2, l: add(h, 0.02, 0.16, 0), r: add(h, -0.02, -0.02, 0), nod: -0.2, ...over }), { props: { ball } }];
    };
    const swordBoth = (a: V, tip: V): Partial<Key> & { props: Record<string, V> } => ({ l: add(a, 0.02, 0.0, 0), r: add(a, -0.03, -0.05, 0), gl: 0.95, gr: 0.95, palms: 0.2, props: { sword: a, tip } });
    switch (k) {
      case 'eye': {
        // Where's it looking? At a tennis ball. Fixed on it, a finger up to check.
        return K({ r: c.bd(-0.2, 0.8 * c.H, 0.28), l: idle(c, 1), gr: 0.15, nod: -0.42, lean: -0.02 }, base, ...crew(ballHigh), say('괴수 눈은 저 공이에요!', WHO.b));
      }
      case 'take': {
        // The foam sword from its stand.
        const s = lerpV(GS.sword, c.bd(-0.15, 0.56 * c.H, 0.26), sm(u, 0.2, 0.8));
        return K({ r: add(s, 0, -0.02, 0), l: idle(c, 1), gr: 0.9, crouch: 0.2 * (1 - sm(u, 0.2, 0.8)), lean: 0.2, nod: 0.35 }, base, ...crew(ballHigh), { props: { sword: s, tip: add(s, -0.1, 0.7, 0.05) } });
      }
      case 'gasp': {
        // Up at nothing; stepping back, the sword rising.
        const a = c.bd(0.0, 0.62 * c.H, 0.3);
        return K({ ...swordBoth(a, add(a, 0.1, 0.75, 0.14)), nod: -0.55, lean: -0.12 }, base, ...crew(lerpV(ballHigh, ballLow, 0.3 + 0.1 * wave(c.t, 0.8))), say('으아악!', WHO.dweller));
      }
      case 'dodge':
        // The tail comes round: down in a lunge under it. The ball swept across.
        return K({ asana: { k: 'lunge' } }, base, ...crew(lerpV(ballLow, [-0.5, 1.25, 0.1], sm(u, 0, 1))), { props: { sword: c.bd(-0.2, 0.3 * c.H, 0.2), tip: c.bd(-0.3, 0.26 * c.H, 0.9) } });
      case 'back':
        return K({ ...swordBoth(c.bd(0.0, 0.62 * c.H, 0.3), c.bd(0.05, 1.12 * c.H, 0.56)), nod: -0.35, lean: 0.02 }, base, ...crew(ballLow));
      case 'swing': {
        // Two great swings at the air: over the shoulder and down, the ball jerking as if struck.
        const f = frac(u * 2);
        const raise = sm(f, 0, 0.45) * (1 - sm(f, 0.55, 0.85));
        const a = lerpV(c.bd(0, 0.58 * c.H, 0.36), c.bd(-0.02, 0.95 * c.H, 0.14), raise);
        const tip = lerpV(c.bd(0.05, 0.62 * c.H, 1.1), c.bd(-0.15, 1.5 * c.H, -0.32), raise);
        const hit = sm(f, 0.68, 0.74) * (1 - sm(f, 0.74, 0.95));
        return K({ ...swordBoth(a, tip), nod: -0.28 + 0.2 * (1 - raise), lean: 0.12 - 0.28 * raise }, base, ...crew(add(ballLow, 0.14 * hit, -0.08 * hit, 0)), say(f < 0.4 ? '이얏!' : '하아!', WHO.dweller));
      }
      case 'hit':
        // Blown back off the feet as the thing strikes.
        return K({ asana: { k: 'supine' } }, base, ...crew([-0.2, 1.3, 0.1]));
      case 'down':
        return K({ asana: { k: 'supine' } }, base, ...crew(ballLow), { props: { sword: [-0.3, 0.04, 0.82], tip: [-0.3, 0.04, 1.3] } }, say('좋아요, 그대로 일어나요!', WHO.b));
      case 'knee':
        return K({ asana: { k: 'lunge' } }, base, ...crew(ballLow), { props: { sword: c.bd(-0.2, 0.3 * c.H, 0.2), tip: c.bd(-0.3, 0.3 * c.H, 0.9) } });
      case 'hero': {
        // On the feet, sword raised straight at the eye of it; the wind machine's on.
        const a = c.bd(-0.03, 0.8 * c.H, 0.32);
        return K({ ...swordBoth(a, add(a, 0.3, 0.62, 0.42)), nod: -0.4, lean: -0.08 }, base, ...crew(ballHigh));
      }
      default: {
        // 컷. Everyone looks at the monitor; there's a monster on it now.
        const a = c.bd(-0.2, 0.42 * c.H, 0.14);
        return K({ r: a, l: idle(c, 1), gr: 0.9, nod: -0.02, lean: 0.02 }, base, ...crew(add(GS.hold, -0.2, 0.05, 0.2), { l: add(GS.hold, 0.02, 1.0, 0.1), r: null, nod: 0 }), { props: { ball: null, sword: a, tip: add(a, -0.28, -0.3, 0.45) } }, say('CG 팀이 좋아하겠어요!', WHO.b));
      }
    }
  },
};

const SCRIPTS: Record<AcMotion, Script> = {
  acRehearse: REHEARSE,
  acFilm: FILM,
  acAdlib: ADLIB,
  acStunt: STUNT,
  acRead: READ,
  acVoice: VOICE,
  acCoach: COACH,
  acTableRead: TABLE_READ,
  acVillage: VILLAGE,
  acWait: WAIT,
  acFit: FIT,
  acTouchUp: TOUCH,
  acGreen: GREEN,
};
