import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the e스포츠 게임단 연습실 (2026-11-01, the workplace pipeline, at the user's request), the made-up team 은하수 게이밍
 * and its made-up game 별무리 아레나. Each motion is a round of beats: where the dweller is, where the hands go, and what moves.
 * The piece reads the same script by the same clock (proGamer.ts), so a fight on the screen is when the mouse hand flicks, a
 * magnet on the board is the one the hand carried there, and a win is when the arms go up.
 *
 * - 연습용 게이밍 PC (scrimStation): egScrim a team game, called out on the headset. egSolo a ranked game alone, the points
 *   going up or down at its end. egReflex coloured targets flicked at. egPick the draft talked through on foot with a
 *   tablet. egPosition the map's routes studied and noted down.
 * - 경기 분석 스크린 (replayScreen): egReview on foot with a remote and a laser, a replay stopped and drawn on for two sat
 *   players. egStudy a pro game watched at the desk and written up. egScout an opponent's numbers at the laptop.
 * - 밴픽 보드 (egDraftBoard): egDraft five bans and five picks carried up one magnet at a time. egDebate the same with a coach,
 *   one pick taken off again.
 * - 팬 방송 세트 (egStreamDesk): egStream the light on, a wave, the chat read, a game, a thank you.
 * - 트로피·후원사 벽 (egTrophyWall): egSponsor a can held up to the tripod's camera. egPolish a cup taken down and wiped.
 * - 손목 관리 코너 (egPhysio): egWrist the hand given to the physio over the pad. egWarm the team's hand drill on foot.
 * - 장비 점검대 (egGearBench): egTune a key switch pulled, tried and swapped. egSens the mouse dragged along a rule.
 * - 경기 무대 부스 (egStageBooth): egShow onto the stage, a wave, sat with two teammates, the final fight, arms up.
 *   egCheck the kit checked before the doors open.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). All names are made up.
 */
export type EgMotion = 'egScrim' | 'egSolo' | 'egReflex' | 'egPick' | 'egPosition' | 'egReview' | 'egStudy' | 'egScout' | 'egDraft' | 'egDebate' | 'egStream' | 'egSponsor' | 'egPolish' | 'egWrist' | 'egWarm' | 'egTune' | 'egSens' | 'egShow' | 'egCheck';
export const EG_MOTIONS = new Set<string>(['egScrim', 'egSolo', 'egReflex', 'egPick', 'egPosition', 'egReview', 'egStudy', 'egScout', 'egDraft', 'egDebate', 'egStream', 'egSponsor', 'egPolish', 'egWrist', 'egWarm', 'egTune', 'egSens', 'egShow', 'egCheck']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const egPhase = (p: THREE.Vector3) => frac(p.x * 0.283 + p.z * 0.619);
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
const st = (x: number, z: number, yaw = PI, y = 0): St => ({ x, y, z, yaw });
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
export interface EgNow {
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
export function egNow(m: EgMotion, t: number, ph: number, H = 1.6): EgNow {
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
export function egPose(m: EgMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = egNow(m, t, egPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
const rest = (c: Ctx): Pick<Key, 'l' | 'r'> => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1) });
const easy = (c: Ctx): Key => ({ l: c.bd(0.14, 0.24, 0.28), r: c.bd(-0.14, 0.24, 0.28), gl: 0.3, gr: 0.3, lean: 0, nod: 0.14 });
/** Left on the keys, right on the mouse: `heat` how hard it's going. */
function playing(kb: V, mouse: V, t: number, heat: number, n: Record<string, number>, flick = 0): Key {
  const fx = Math.sin(t * (3 + heat * 6)) * (0.012 + 0.03 * heat) + flick;
  const fz = Math.cos(t * (2.3 + heat * 5)) * (0.008 + 0.018 * heat);
  const pr = 0.004 * Math.sin(t * (9 + heat * 12));
  return { l: add(kb, 0.012 * Math.sin(t * 7), 0.022 + pr, 0.012), r: add(mouse, fx, 0.04, fz), gl: 0.45, gr: 0.72, palms: 0.05, lean: 0.1 + 0.05 * heat, nod: 0.2 + 0.08 * heat, tap: true, n: { ...n, heat } };
}

// =============================================================================================
// 연습용 게이밍 PC (scrimStation, 1 × 1): monitor on the desk's far side, the chair in the tile in front.

export const SS = {
  top: 0.72,
  deskZ: -0.11,
  seat: [0, 0.47, 0.6] as V,
  kb: [-0.1, 0.735, 0.09] as V,
  mouse: [0.26, 0.735, 0.09] as V,
  note: [-0.27, 0.735, 0.03] as V,
  tablet: [0, 0.98, 0.32] as V,
};
const SAT_SS = sat(SS.seat);
const SCRIM: Script = {
  seq: [['ready', 1.8], ['lane', 4.2], ['call', 2.4], ['fight', 3.8], ['push', 3], ['end', 2.2], ['note', 2]],
  at: () => SAT_SS,
  key(k, u, c) {
    const n: Record<string, number> = { hs: 1, g: k === 'ready' ? 0 : k === 'lane' ? 0.05 + 0.3 * u : k === 'call' ? 0.35 + 0.1 * u : k === 'fight' ? 0.45 + 0.25 * u : k === 'push' ? 0.7 + 0.3 * u : 1, fight: k === 'fight' ? 1 : 0, ended: k === 'end' || k === 'note' ? 1 : 0, cheer: k === 'end' ? 1 : 0 };
    switch (k) {
      case 'ready':
        return { l: add(c.bd(0.15, 0.71, 0.04), 0, 0.02 * sm(u, 0.3, 0.8), 0), gl: 0.5, r: add(SS.mouse, 0, 0.04, 0), gr: 0.7, lean: 0.02, nod: 0.1, n };
      case 'lane':
        return playing(SS.kb, SS.mouse, c.t, 0.25, n);
      case 'call':
        return { ...playing(SS.kb, SS.mouse, c.t, 0.25, n), l: c.bd(0.1, 0.7, 0.1), gl: 0.65, nod: 0.08 + 0.06 * Math.sin(c.t * 5), lean: 0.04 };
      case 'fight':
        return playing(SS.kb, SS.mouse, c.t, 1, n, 0.05 * Math.sin(c.t * 4.7));
      case 'push':
        return playing(SS.kb, SS.mouse, c.t, 0.6, n);
      case 'end': {
        const up = Math.abs(Math.sin(u * PI * 3));
        return { l: add(SS.kb, 0, 0.03, 0.02), gl: 0.4, r: c.bd(-0.2, 0.54 + 0.2 * up, 0.2), gr: 1, lean: -0.04, nod: -0.02, n };
      }
      default:
        return { l: add(SS.note, 0.02, 0.02, 0.02), gl: 0.5, r: add(SS.note, 0.07 + 0.05 * Math.sin(c.t * 7), 0.04, 0.02), gr: 0.9, lean: 0.14, nod: 0.36, props: { pen: add(SS.note, 0.07 + 0.05 * Math.sin(c.t * 7), 0.005, 0.0) }, n };
    }
  },
};
const SOLO: Script = {
  seq: [['queue', 2.6], ['pick', 2.2], ['early', 4], ['clutch', 3.6], ['late', 2.8], ['result', 2.4], ['stretch', 1.6]],
  at: () => SAT_SS,
  key(k, u, c) {
    const n: Record<string, number> = { hs: 1, queue: k === 'queue' ? 1 : 0, pick: k === 'pick' ? u : 0, g: k === 'early' ? 0.05 + 0.35 * u : k === 'clutch' ? 0.4 + 0.3 * u : k === 'late' ? 0.7 + 0.3 * u : k === 'result' || k === 'stretch' ? 1 : 0, fight: k === 'clutch' ? 1 : 0, ended: k === 'result' || k === 'stretch' ? 1 : 0, gain: c.p('result', 0, 0.7) };
    switch (k) {
      case 'queue':
        return { ...easy(c), r: add(SS.mouse, 0, 0.04, 0), gr: 0.6, l: add(c.bd(0.16, 0.42 + 0.02 * Math.sin(c.t * 2), 0.26), 0, 0, 0), nod: 0.12 + 0.03 * Math.sin(c.t * 1.5), n };
      case 'pick':
        return playing(SS.kb, SS.mouse, c.t, 0.1, n);
      case 'early':
        return playing(SS.kb, SS.mouse, c.t, 0.35, n);
      case 'clutch':
        return { ...playing(SS.kb, SS.mouse, c.t, 1, n, 0.06 * Math.sin(c.t * 5.3)), lean: 0.2, nod: 0.32 };
      case 'late':
        return playing(SS.kb, SS.mouse, c.t, 0.5, n);
      case 'result':
        return { l: add(SS.kb, 0, 0.04, 0.02), r: add(SS.mouse, 0, 0.04, 0), gr: 0.5, lean: 0.02, nod: 0.16 + 0.04 * Math.sin(u * PI), n };
      default: {
        const up = Math.sin(u * PI);
        return { l: c.bd(0.28, 0.5 + 0.3 * up, 0.12), r: c.bd(-0.28, 0.5 + 0.3 * up, 0.12), gl: 0.2, gr: 0.2, lean: -0.08, nod: -0.03, n };
      }
    }
  },
};
const REFLEX: Script = {
  seq: [['set', 1.6], ['drill', 6.4], ['faster', 5.2], ['score', 2.2]],
  at: () => SAT_SS,
  key(k, u, c) {
    const hits = k === 'drill' ? u * 12 : k === 'faster' ? 12 + u * 24 : k === 'score' ? 36 : 0;
    const n: Record<string, number> = { hs: 1, drill: k === 'drill' || k === 'faster' ? 1 : 0, hits, score: k === 'score' ? 1 : 0, speed: k === 'faster' ? 1 : 0 };
    if (k === 'set') return { l: add(SS.kb, 0, 0.03, 0.02), r: add(SS.mouse, 0.05 * Math.sin(u * 6), 0.04, 0), gr: 0.7, lean: 0.08, nod: 0.2, n };
    if (k === 'score') return { l: add(SS.kb, 0, 0.03, 0.02), r: add(SS.mouse, 0, 0.04, 0), gr: 0.5, lean: -0.02, nod: 0.16, n };
    const v = frac(hits);
    const jump = Math.sin(Math.floor(hits) * 2.4);
    const flick = jump * 0.07 * sm(v, 0, 0.3);
    return { ...playing(SS.kb, SS.mouse, c.t, 0.25, n, flick), lean: 0.18, nod: 0.26 };
  },
};
const PICK: Script = {
  seq: [['look', 2.2], ['ban', 3], ['ask', 2.6], ['point', 3], ['pick', 2.8], ['ok', 1.6]],
  at: () => st(0.28, 0.82, PI - 0.25),
  key(k, u, c) {
    const n: Record<string, number> = { draftShown: 1, picks: k === 'look' ? 0 : k === 'ban' ? u * 3 : k === 'ask' ? 3 : k === 'point' ? 3 + u * 2 : 5 + (k === 'pick' ? u * 3 : 3) };
    const tab = c.bd(0.05, 0.58 * c.H, 0.26);
    const hold = { l: add(tab, 0.09, -0.03, 0.0), gl: 0.8, props: { tablet: tab } };
    switch (k) {
      case 'ban':
      case 'pick':
        return { ...hold, r: add(tab, -0.05 + 0.06 * Math.sin(u * 13), 0.04, 0.03), gr: 0.75, nod: 0.36, lean: 0.06, n };
      case 'ask':
        return { ...hold, r: c.bd(-0.2, 0.58 * c.H, 0.25), palms: 0.8, gr: 0.2, nod: 0.08 + 0.05 * Math.sin(c.t * 3), n };
      case 'point':
        return { ...hold, r: [0.02 + 0.08 * Math.sin(u * 5), 0.98 + 0.06 * Math.cos(u * 4), -0.08], gr: 0.85, palms: 0.1, nod: 0.18, lean: 0.14, n };
      case 'ok':
        return { ...hold, r: c.bd(-0.2, 0.62 * c.H, 0.2), gr: 0.95, nod: 0.1 + 0.08 * Math.sin(u * 6), n };
      default:
        return { ...hold, r: rest(c).r, nod: 0.34, n };
    }
  },
};
const POSITION: Script = {
  seq: [['map', 2.6], ['route', 4], ['write', 3.2], ['ward', 3], ['write2', 2.6]],
  at: () => SAT_SS,
  key(k, u, c) {
    const n: Record<string, number> = { hs: 0, routes: k === 'map' ? 0 : k === 'route' ? u : 1, wards: k === 'ward' ? u * 4 : c.p('ward') * 4, written: (c.p('write') + c.p('write2')) / 2, map: 1 };
    const wr = (a: number): Key => {
      const p = add(SS.note, 0.1 * frac(a * 5) - 0.04, 0.005, 0.03 * Math.sin(a * 4));
      return { r: add(p, 0.03, 0.04, 0.03), gr: 0.92, l: add(SS.note, -0.11, 0.02, 0.03), gl: 0.5, lean: 0.2, nod: 0.46, props: { pen: p }, n };
    };
    if (k === 'write' || k === 'write2') return wr(u);
    if (k === 'map') return { l: add(SS.kb, 0, 0.03, 0.02), r: add(SS.mouse, 0.02 * Math.sin(c.t), 0.04, 0), gr: 0.65, lean: 0.14, nod: 0.24, n };
    return { l: add(SS.kb, 0, 0.03, 0.02), r: add(SS.mouse, 0.04 * Math.sin(u * 9), 0.04, 0.02 * Math.cos(u * 7)), gr: 0.75, lean: 0.16, nod: 0.26, n };
  },
};

// =============================================================================================
// 경기 분석 스크린 (replayScreen, 2 × 1): a wall screen over a low desk; two stools in the tiles in front.

export const RS = {
  top: 0.72,
  screenZ: -0.37,
  screenY: 1.55,
  screenW: 1.8,
  screenH: 1.02,
  seat: [0.05, 0.47, 0.72] as V,
  laptop: [0.05, 0.735, 0.15] as V,
  note: [-0.4, 0.735, 0.2] as V,
  remote: [0.56, 0.735, 0.14] as V,
  /** The two players watching, on stools set out when the coach goes through a replay. */
  stoolL: [-0.25, 0.47, 1.25] as V,
  stoolR: [0.45, 0.47, 1.25] as V,
};
/** A point on the screen, `x`,`y` from -1 to 1. */
export const onScreen = (x: number, y: number): V => [x * RS.screenW * 0.48, RS.screenY + y * RS.screenH * 0.48, RS.screenZ + 0.03];
const REVIEW_ST = st(-1.15, 0.72, PI - 0.55);
const REVIEW: Script = {
  seq: [['open', 2], ['play', 2.6], ['stop', 1.6], ['point', 3.6], ['draw', 3.4], ['ask', 3], ['play2', 2]],
  at: () => REVIEW_ST,
  key(k, u, c) {
    const lx = k === 'point' ? -0.4 + 0.7 * Math.sin(u * 5) : k === 'draw' ? -0.5 + u : k === 'ask' ? 0.5 : -0.2;
    const ly = k === 'point' ? 0.1 + 0.32 * Math.cos(u * 7) : k === 'draw' ? -0.3 + 0.55 * Math.sin(u * PI) : k === 'ask' ? 0.25 : 0;
    const on = k === 'point' || k === 'draw';
    const n: Record<string, number> = { review: 1, playing: k === 'play' || k === 'play2' ? 1 : 0, stopped: k === 'stop' || k === 'point' || k === 'draw' || k === 'ask' ? 1 : 0, laser: on ? 1 : 0, lx, ly, drawn: k === 'draw' ? u : k === 'ask' ? 1 : 0, g: k === 'open' ? 0 : k === 'play' ? 0.3 + 0.15 * u : k === 'play2' ? 0.45 + 0.2 * u : 0.45, fight: 1, nodders: k === 'ask' ? 1 : 0, players: 1 };
    const remote = c.bd(0.14, 0.56 * c.H, 0.24);
    const aim = c.bd(-0.2, 0.68 * c.H, 0.36);
    const hand = { l: remote, gl: 0.86, props: { remote } };
    if (on) return { ...hand, r: aim, gr: 0.92, palms: 0.1, nod: 0.02, lean: 0.03, props: { ...hand.props, pointer: aim }, n };
    if (k === 'ask') return { ...hand, r: c.bd(-0.24, 0.58 * c.H, 0.26), gr: 0.2, palms: 0.8, nod: 0.12 + 0.05 * Math.sin(c.t * 3), n };
    return { ...hand, r: rest(c).r, nod: 0.02, n };
  },
};
const STUDY: Script = {
  seq: [['watch', 3.6], ['back', 1.8], ['again', 2.8], ['write', 3.4], ['watch2', 3]],
  at: () => sat(RS.seat),
  key(k, u, c) {
    const n: Record<string, number> = { study: 1, g: k === 'watch' ? 0.2 + 0.2 * u : k === 'back' ? 0.4 - 0.12 * u : k === 'again' ? 0.28 + 0.14 * u : k === 'write' ? 0.42 : 0.42 + 0.3 * u, fight: k === 'back' || k === 'again' ? 1 : 0, rewind: k === 'back' ? 1 : 0, playing: k === 'write' ? 0 : 1, written: k === 'write' ? u : c.p('write') };
    if (k === 'write') {
      const p = add(RS.note, 0.13 * frac(u * 4) - 0.06, 0.006, 0.03 * Math.sin(u * 4));
      return { r: add(p, 0.03, 0.04, 0.03), gr: 0.92, l: add(RS.note, -0.15, 0.02, 0.03), gl: 0.5, lean: 0.22, nod: 0.42, props: { pen: p }, n };
    }
    if (k === 'back') return { r: add(RS.remote, -0.02, 0.03, 0.02), gr: 0.8, l: c.bd(0.16, 0.26, 0.3), lean: 0.24, nod: 0.14, n };
    return { l: c.bd(0.16, 0.25, 0.3), r: c.bd(-0.16, 0.25, 0.3), gl: 0.3, gr: 0.3, lean: 0.02, nod: -0.08, n };
  },
};
const SCOUT: Script = {
  seq: [['open', 2], ['read', 3.6], ['type', 3.6], ['compare', 3], ['mark', 2.8]],
  at: () => sat(RS.seat),
  key(k, u, c) {
    const n: Record<string, number> = { scout: 1, line: k === 'open' ? 0 : k === 'read' ? u : 1, compare: k === 'compare' ? u : c.p('compare'), typed: k === 'type' ? u : c.p('type'), mark: k === 'mark' ? u : 0 };
    const keys = add(RS.laptop, 0, 0, 0.09);
    const type: Key = { l: add(keys, -0.09, 0.02 + 0.006 * Math.sin(c.t * 15), 0), r: add(keys, 0.09, 0.02 + 0.006 * Math.cos(c.t * 13), 0), gl: 0.25, gr: 0.25, tap: true, lean: 0.2, nod: 0.3, n };
    if (k === 'type' || k === 'open') return type;
    if (k === 'read') return { l: add(keys, -0.09, 0.03, 0.02), r: add(keys, 0.09, 0.03, 0.02), gl: 0.3, gr: 0.3, lean: 0.14, nod: 0.08 + 0.1 * Math.sin(u * 7), n };
    if (k === 'compare') return { l: c.bd(0.16, 0.25, 0.3), r: c.bd(-0.14, 0.72, 0.2), gr: 0.4, lean: 0.06, nod: 0.02, n };
    const p = add(RS.note, 0.1 * frac(u * 3) - 0.05, 0.006, 0);
    return { r: add(p, 0.03, 0.04, 0.03), gr: 0.92, l: add(RS.note, -0.15, 0.02, 0.03), gl: 0.5, lean: 0.22, nod: 0.42, props: { pen: p }, n };
  },
};

// =============================================================================================
// 밴픽 보드 (egDraftBoard, 2 × 1).

export const DB = {
  z: -0.33,
  tray: [0, 0.96, -0.25] as V,
  /** Slots: `side` 0 ours, 1 theirs; `i` 0–4 bans, 5–9 picks. */
  slot(side: number, i: number): V {
    const x = (side ? 1 : -1) * 0.44;
    const col = i < 5 ? i : i - 5;
    return i < 5 ? [x + (col - 2) * 0.16, 1.98, DB.z + 0.03] : [x, 1.76 - col * 0.17, DB.z + 0.03];
  },
};
function magnetKey(u: number, c: Ctx, step: number, n: Record<string, number>, count: number): Key {
  const v = frac(u * count);
  const i = Math.min(count - 1, Math.floor(u * count)) + step;
  const side = i % 2;
  const to = DB.slot(side, i < 5 ? i : i);
  const from = add(DB.tray, -0.3 + ((i * 3) % 7) * 0.1, 0.01, 0.03);
  const p = v < 0.5 ? lerpV(c.bd(-0.16, 0.6 * c.H, 0.26), from, sm(v, 0, 0.3)) : lerpV(from, to, sm(v, 0.5, 0.92));
  return { r: add(p, 0.012, -0.03, 0.05), gr: 0.82, l: rest(c).l, lean: 0.08, nod: i >= 5 ? 0 : -0.05, props: { magnet: v >= 0.22 ? p : null }, n };
}
const DRAFT: Script = {
  seq: [['think', 2], ['bans', 6], ['step', 1.8], ['picks', 7], ['rule', 2.8]],
  at: (k) => (k === 'rule' ? st(0.45, 0.7, PI) : st(0, 0.62, PI)),
  key(k, u, c) {
    const placed = k === 'think' ? 0 : k === 'bans' ? u * 5 : k === 'step' ? 5 : k === 'picks' ? 5 + u * 5 : 10;
    const n: Record<string, number> = { placed, strike: k === 'rule' ? u : 0 };
    switch (k) {
      case 'bans':
        return magnetKey(u, c, 0, n, 5);
      case 'picks':
        return magnetKey(u, c, 5, n, 5);
      case 'rule':
        return { l: rest(c).l, r: [-0.02 + 0.2 * Math.sin(u * 4), 1.55, DB.z + 0.05], gr: 0.86, palms: 0.1, lean: 0.06, nod: -0.04, n };
      default:
        return { l: c.bd(0.1, 0.84 * c.H - 0.2, 0.2), r: rest(c).r, gl: 0.5, nod: 0, n };
    }
  },
};
const DEBATE: Script = {
  seq: [['listen', 2.6], ['object', 2.6], ['take', 2.8], ['think', 2], ['put', 2.8], ['agree', 1.8]],
  at: () => st(-0.35, 0.68, PI + 0.2),
  key(k, u, c) {
    const slot = DB.slot(0, 7);
    const home = add(DB.tray, 0.2, 0.01, 0.03);
    const n: Record<string, number> = { placed: 10, swap: k === 'take' ? sm(u, 0.4, 0.5) : k === 'think' ? 1 : k === 'put' ? 1 : 0, coach: 1, coachPoint: k === 'listen' || k === 'agree' ? 1 : 0, nod: k === 'agree' ? 1 : 0, changed: k === 'agree' ? 1 : k === 'put' ? sm(u, 0.7, 0.9) : 0 };
    switch (k) {
      case 'object':
        return { l: rest(c).l, r: add(slot, 0.03, -0.04, 0.06), gr: 0.86, palms: 0.1, lean: 0.06, nod: 0.05 + 0.04 * Math.sin(c.t * 4), n };
      case 'take': {
        const p = lerpV(slot, home, sm(u, 0.4, 0.95));
        return { r: add(p, 0.012, -0.03, 0.05), gr: 0.82, l: rest(c).l, lean: 0.06, nod: 0.1, props: { magnet: u > 0.4 ? p : null }, n };
      }
      case 'put': {
        const p = lerpV(home, slot, sm(u, 0.1, 0.72));
        return { r: add(p, 0.012, -0.03, 0.05), gr: 0.82, l: rest(c).l, lean: 0.06, nod: 0.02, props: { magnet: u < 0.72 ? p : null }, n };
      }
      case 'think':
        return { l: c.bd(0.1, 0.84 * c.H - 0.2, 0.2), gl: 0.5, r: rest(c).r, nod: 0.05, n };
      default:
        return { l: rest(c).l, r: rest(c).r, nod: 0.1, n };
    }
  },
};

// =============================================================================================
// 팬 방송 세트 (egStreamDesk, 2 × 1).

export const SD = {
  top: 0.74,
  seat: [0, 0.47, 0.6] as V,
  kb: [-0.1, 0.755, 0.1] as V,
  mouse: [0.26, 0.755, 0.1] as V,
  can: [-0.52, 0.76, 0.1] as V,
};
const STREAM: Script = {
  seq: [['live', 2], ['wave', 2], ['chat', 3.4], ['game', 4.2], ['alert', 2.6], ['drink', 2.2], ['bye', 2]],
  at: () => sat(SD.seat),
  key(k, u, c) {
    const live = k === 'live' ? sm(u, 0.1, 0.5) : 1;
    const viewers = 200 + (k === 'live' ? 40 * u : 40 + 900 * (k === 'wave' ? 0.04 * u : k === 'chat' ? 0.05 + 0.15 * u : k === 'game' ? 0.2 + 0.4 * u : k === 'alert' ? 0.6 + 0.2 * u : k === 'drink' ? 0.8 + 0.1 * u : 0.9 + 0.1 * u));
    const n: Record<string, number> = { hs: 1, live, viewers, chatting: k === 'chat' ? 1 : 0, g: k === 'game' ? 0.2 + 0.6 * u : 0.2, fight: k === 'game' && u > 0.5 ? 1 : 0, gameOn: k === 'game' ? 1 : 0, alert: k === 'alert' ? sm(u, 0.02, 0.18) * (1 - sm(u, 0.85, 1)) : 0 };
    switch (k) {
      case 'live':
        return { r: add(SD.mouse, 0, 0.04, 0), gr: 0.75, l: add(SD.kb, 0, 0.03, 0.02), lean: 0.1, nod: 0.2, n };
      case 'wave':
        return { r: add(SD.mouse, 0, 0.04, 0), gr: 0.5, l: c.bd(0.22 + 0.06 * Math.sin(c.t * 8), 0.72, 0.18), gl: 0.1, palms: 0.9, lean: -0.02, nod: 0.02, n };
      case 'chat':
        return { l: add(SD.kb, 0, 0.03, 0.02), r: c.bd(-0.2, 0.42 + 0.05 * Math.sin(c.t * 3), 0.24), gr: 0.2, palms: 0.8, lean: 0.06, nod: 0.08 + 0.05 * Math.sin(c.t * 4), n };
      case 'game':
        return playing(SD.kb, SD.mouse, c.t, u > 0.5 ? 0.9 : 0.4, n);
      case 'alert': {
        // Both hands up, joined: thank you.
        const a = c.bd(0, 0.52 + 0.02 * Math.sin(c.t * 8), 0.24);
        return { l: add(a, -0.015, 0, 0), r: add(a, 0.015, 0, 0), gl: 0.15, gr: 0.15, palms: 0.5, lean: 0.14 * Math.abs(Math.sin(u * PI * 2)), nod: 0.26, n };
      }
      case 'drink': {
        const lift = Math.sin(u * PI);
        const can = lerpV(SD.can, c.bd(0.05, 0.62, 0.1), sm(lift, 0.1, 0.8));
        return { l: add(can, 0, 0.03, 0.02), gl: 0.9, r: add(SD.mouse, 0, 0.04, 0), gr: 0.5, lean: -0.02, nod: lift > 0.7 ? -0.08 : 0.1, props: { can }, n };
      }
      default:
        return { r: add(SD.mouse, 0, 0.04, 0), gr: 0.5, l: c.bd(0.22 + 0.08 * Math.sin(c.t * 9), 0.74, 0.18), gl: 0.1, palms: 0.9, lean: -0.02, nod: 0.02, n };
    }
  },
};

// =============================================================================================
// 트로피·후원사 벽 (egTrophyWall, 3 × 1).

export const TW = {
  cupHome: [0, 1.22, -0.2] as V,
  cloth: [0.86, 0.9, -0.16] as V,
  can: [-1.02, 0.9, -0.14] as V,
  tripod: [1.1, 1.3, 0.62] as V,
  table: [0.72, 0.92, -0.02] as V,
};
const SPONSOR: Script = {
  seq: [['take', 1.8], ['smile', 2.8], ['flash', 1.2], ['turn', 2.4], ['flash2', 1.2], ['back', 1.6]],
  at: (k) => (k === 'turn' || k === 'flash2' ? st(-0.1, 0.72, 1.0) : k === 'take' || k === 'back' ? st(-0.8, 0.6, PI) : st(-0.1, 0.72, 0.8)),
  key(k, u, c) {
    const n: Record<string, number> = { shot: k === 'flash' ? 1 - u : k === 'flash2' ? 1 - u : 0, taken: k === 'flash' ? 1 : k === 'turn' ? 1 : k === 'flash2' ? 2 : k === 'back' ? 2 : 0 };
    if (k === 'take' || k === 'back') {
      const v = k === 'take' ? sm(u, 0.1, 0.8) : 1 - sm(u, 0.1, 0.8);
      const can = lerpV(TW.can, c.bd(-0.14, 0.6 * c.H, 0.24), v);
      return { r: add(can, 0.0, 0.03, 0.03), gr: 0.9, l: rest(c).l, nod: 0.26, lean: 0.06, props: { can }, n };
    }
    const lift = k === 'turn' || k === 'flash2' ? 0.68 : 0.62 + 0.01 * Math.sin(c.t * 2);
    const can = c.bd(-0.2, lift * c.H, 0.26);
    return { r: add(can, 0, 0.03, 0.03), gr: 0.9, l: k === 'flash2' ? c.bd(0.24, 0.72 * c.H, 0.2) : rest(c).l, gl: k === 'flash2' ? 0.1 : 0.3, palms: k === 'flash2' ? 0.9 : 0.4, nod: 0, lean: 0, props: { can }, n };
  },
};
const POLISH: Script = {
  seq: [['reach', 1.8], ['down', 1.6], ['breathe', 1.6], ['wipe', 5], ['admire', 1.8], ['up', 1.8]],
  at: (k) => (k === 'wipe' || k === 'breathe' || k === 'admire' ? st(0.5, 0.65, PI) : st(0, 0.6, PI)),
  key(k, u, c) {
    const onTable = TW.table;
    const n: Record<string, number> = { shine: k === 'wipe' ? u : k === 'admire' || k === 'up' ? 1 : 0, off: k === 'reach' ? 0 : 1, sparkle: k === 'admire' ? 1 : 0 };
    const hold = (p: V): Key => ({ l: add(p, 0.09, 0.14, 0.02), r: add(p, -0.09, 0.14, 0.02), gl: 0.8, gr: 0.8, lean: 0.06, nod: 0.24, props: { cup: p }, n });
    switch (k) {
      case 'reach':
        return { l: add(TW.cupHome, 0.09, 0.15, 0.02), r: add(TW.cupHome, -0.09, 0.15, 0.02), gl: 0.3 + 0.5 * u, gr: 0.3 + 0.5 * u, lean: 0.05, nod: 0.1, n: { ...n, off: 0 } };
      case 'down':
        return hold(lerpV(TW.cupHome, onTable, sm(u, 0.05, 0.95)));
      case 'up':
        return hold(lerpV(onTable, TW.cupHome, sm(u, 0.05, 0.95)));
      case 'breathe':
        return { l: add(onTable, 0.09, 0.16, 0.02), r: add(TW.cloth, 0, 0.03, 0.02), gl: 0.8, gr: 0.8, lean: 0.2, nod: 0.4, props: { cup: onTable }, n };
      case 'wipe': {
        const a = u * PI * 10;
        const cloth = add(onTable, -0.07 + 0.02 * Math.sin(a), 0.14 + 0.1 * Math.cos(a), 0.06);
        return { l: add(onTable, 0.09, 0.16, 0.02), gl: 0.8, r: add(cloth, -0.02, 0.02, 0.02), gr: 0.75, lean: 0.2, nod: 0.42, props: { cup: onTable, cloth }, n };
      }
      default:
        return { l: add(onTable, 0.09, 0.16, 0.02), r: rest(c).r, gl: 0.8, nod: 0.3, props: { cup: onTable }, n };
    }
  },
};

// =============================================================================================
// 손목 관리 코너 (egPhysio, 2 × 2): a table, the player's stool on the near side, the physio on the far side.

export const PC = {
  top: 0.74,
  seat: [-0.2, 0.47, 0.6] as V,
  pad: [-0.2, 0.79, 0.16] as V,
  physio: [-0.2, -0.56] as const,
  warm: [0.46, 0.76, 0.1] as V,
  ball: [0.2, 0.78, 0.26] as V,
  stand: [0.56, 0.62] as const,
};
const WRIST: Script = {
  seq: [['sit', 1.8], ['warm', 3], ['press', 4], ['fingers', 3.6], ['ball', 3], ['thanks', 1.6]],
  at: () => sat(PC.seat),
  key(k, u, c) {
    const pad = add(PC.pad, 0.06, 0.02, 0.02);
    const n: Record<string, number> = { care: 1, warmer: k === 'warm' ? 1 : 0, press: k === 'press' ? 1 : 0, fingers: k === 'fingers' ? 1 : 0, ball: k === 'ball' ? 1 : 0, squeeze: k === 'ball' ? Math.abs(Math.sin(u * PI * 5)) : 0, nod: k === 'thanks' ? 1 : 0 };
    const free: V = c.bd(0.16, 0.24, 0.28);
    switch (k) {
      case 'sit':
        return { r: lerpV(c.bd(-0.14, 0.24, 0.28), pad, sm(u, 0.2, 0.9)), gr: 0.3, l: free, palms: 0.1, lean: 0.14, nod: 0.3, n };
      case 'warm':
      case 'press':
        return { r: pad, gr: 0.2, palms: 0.1, l: free, lean: 0.16, nod: 0.26, n };
      case 'fingers': {
        const curl = 0.5 + 0.5 * Math.sin(c.t * 4);
        return { r: add(pad, 0, 0.01 * curl, 0), gr: curl, palms: 0.1, l: free, lean: 0.16, nod: 0.3, n };
      }
      case 'ball':
        return { r: add(PC.ball, 0, 0.03, 0.02), gr: 0.4 + 0.6 * n.squeeze, l: free, lean: 0.14, nod: 0.3, props: { ballAt: PC.ball }, n };
      default:
        return { l: free, r: c.bd(-0.14, 0.24, 0.28), lean: 0.1 * Math.sin(u * PI), nod: 0.26, n };
    }
  },
};
const WARM: Script = {
  seq: [['shake', 2.4], ['prayer', 2.8], ['pull', 3.4], ['circles', 3.2], ['fan', 2.6]],
  at: () => st(PC.stand[0], PC.stand[1], PI),
  key(k, u, c) {
    const n: Record<string, number> = { drill: k === 'shake' ? 0 : k === 'prayer' ? 1 : k === 'pull' ? 2 : k === 'circles' ? 3 : 4 };
    const h = 0.68 * c.H;
    switch (k) {
      case 'shake': {
        const w = 0.02 * Math.sin(c.t * 22);
        return { l: c.bd(0.22, 0.56 * c.H + w, 0.24), r: c.bd(-0.22, 0.56 * c.H - w, 0.24), gl: 0.1, gr: 0.1, palms: 0.6, nod: 0.26, n };
      }
      case 'prayer': {
        const a = c.bd(0, h + 0.03 * Math.sin(u * PI * 3), 0.24);
        return { l: add(a, -0.015, 0, 0), r: add(a, 0.015, 0, 0), gl: 0.1, gr: 0.1, palms: 0.5, nod: 0.3, n };
      }
      case 'pull': {
        const side = u < 0.5;
        const out: V = c.bd(side ? -0.14 : 0.14, h, 0.42);
        const pull: V = add(out, side ? 0.08 : -0.08, 0.05, -0.04);
        return side ? { r: out, gr: 0.1, palms: 0.1, l: pull, gl: 0.7, nod: 0.26, n } : { l: out, gl: 0.1, palms: 0.1, r: pull, gr: 0.7, nod: 0.26, n };
      }
      case 'circles': {
        const a = c.t * 5;
        return { l: c.bd(0.2 + 0.03 * Math.cos(a), h + 0.03 * Math.sin(a), 0.3), r: c.bd(-0.2 - 0.03 * Math.cos(a), h + 0.03 * Math.sin(a), 0.3), gl: 0.85, gr: 0.85, palms: 0.2, nod: 0.26, n };
      }
      default: {
        const w = Math.sin(c.t * 7);
        return { l: c.bd(0.2, h + 0.02 * w, 0.32), r: c.bd(-0.2, h - 0.02 * w, 0.32), gl: 0.5 + 0.5 * w, gr: 0.5 - 0.5 * w, palms: 0.9, nod: 0.26, n };
      }
    }
  },
};

// =============================================================================================
// 장비 점검대 (egGearBench, 2 × 1).

export const GB = {
  top: 0.74,
  seat: [0, 0.47, 0.6] as V,
  board: [-0.16, 0.77, 0.08] as V,
  puller: [0.22, 0.77, 0.14] as V,
  tester: [0.42, 0.76, -0.12] as V,
  rule: [0.2, 0.76, 0.12] as V,
};
const TUNE: Script = {
  seq: [['take', 2], ['pull', 3.2], ['try', 3], ['swap', 2.8], ['type', 3]],
  at: () => sat(GB.seat),
  key(k, u, c) {
    const key = add(GB.board, 0.06, 0.02, -0.02);
    const n: Record<string, number> = { capOff: k === 'pull' ? sm(u, 0.4, 0.6) : k === 'try' ? 1 : k === 'swap' ? 1 - sm(u, 0.5, 0.8) : 0, pressed: k === 'try' ? Math.abs(Math.sin(c.t * 7)) : 0, typed: k === 'type' ? 1 : 0, reading: k === 'try' ? 1 : 0 };
    const hold = add(GB.board, -0.2, 0.01, 0.02);
    switch (k) {
      case 'take': {
        const p = lerpV(GB.puller, key, sm(u, 0.2, 0.95));
        return { r: add(p, 0.01, 0.05, 0.03), gr: 0.86, l: hold, gl: 0.6, lean: 0.14, nod: 0.36, props: { puller: p }, n };
      }
      case 'pull': {
        const p = add(key, 0, 0.05 * sm(u, 0.4, 0.8), 0);
        return { r: add(p, 0.01, 0.05, 0.03), gr: 0.9, l: hold, gl: 0.6, lean: 0.2, nod: 0.44, props: { puller: p, cap: u > 0.5 ? add(p, 0, 0.012, 0) : null }, n };
      }
      case 'try':
        return { r: add(GB.tester, -0.02, 0.05 + 0.012 * n.pressed, 0.02), gr: 0.6, l: hold, gl: 0.6, lean: 0.14, nod: 0.3, n };
      case 'swap': {
        const p = lerpV(add(GB.tester, 0, 0.03, 0.04), key, sm(u, 0.1, 0.75));
        return { r: add(p, 0.01, 0.03, 0.03), gr: 0.84, l: hold, gl: 0.6, lean: 0.2, nod: 0.44, props: { cap: u < 0.8 ? p : null }, n };
      }
      default:
        return { l: add(GB.board, -0.08, 0.03 + 0.006 * Math.sin(c.t * 14), 0.03), r: add(GB.board, 0.08, 0.03 + 0.006 * Math.cos(c.t * 12), 0.03), gl: 0.2, gr: 0.2, tap: true, lean: 0.14, nod: 0.32, n };
    }
  },
};
const SENS: Script = {
  seq: [['set', 1.8], ['drag', 3.6], ['read', 2.2], ['set2', 1.6], ['drag2', 3.6], ['note', 2.2]],
  at: () => sat(GB.seat),
  key(k, u) {
    const run = k === 'drag' || k === 'drag2' ? u : k === 'read' || k === 'set2' || k === 'note' ? 1 : 0;
    const off = Math.abs(Math.sin(run * PI * (k === 'drag2' ? 3 : 2)));
    const mouse = add(GB.rule, -0.2 + 0.34 * off, 0, 0);
    const n: Record<string, number> = { sens: 1, cm: k === 'drag' ? 34 + u * 6 : k === 'drag2' ? 40 - u * 3 : k === 'read' || k === 'set2' ? 40 : k === 'note' ? 37 : 34, trace: run };
    const left = add(GB.board, -0.08, 0.03, 0.03);
    if (k === 'note') {
      const p = add(GB.board, 0.02 + 0.1 * frac(u * 3), 0.006, 0.12);
      return { r: add(p, 0.03, 0.04, 0.03), gr: 0.92, l: left, gl: 0.4, lean: 0.2, nod: 0.44, props: { mouse, pen: p }, n };
    }
    return { r: add(mouse, 0, 0.04, 0), gr: 0.72, palms: 0.05, l: left, gl: 0.4, lean: 0.14, nod: k === 'read' ? 0.14 : 0.3, props: { mouse }, n };
  },
};

// =============================================================================================
// 경기 무대 부스 (egStageBooth, 5 × 3): LED wall, raised deck with desk and five chairs, a low bench of fans at the front.

export const SB = {
  deck: 0.3,
  seat: [0, 0.77, 0.14] as V,
  kb: [-0.1, 1.035, -0.36] as V,
  mouse: [0.26, 1.035, -0.36] as V,
  mates: [-0.9, 0.9] as const,
  bench: 0.42,
  benchZ: 1.2,
  fans: [-1.95, -1.15, 1.15, 1.95] as const,
  cable: [0.44, 0.6, -0.58] as V,
};
const SHOW: Script = {
  seq: [['enter', 1.8], ['wave', 2.2], ['sit', 1.6], ['set', 2.4], ['play', 4.4], ['final', 4.6], ['won', 2.8]],
  at: (k) => (k === 'enter' ? st(-1.7, 0.55, 1.2, SB.deck) : k === 'wave' ? st(-0.3, 0.6, 0.15, SB.deck) : sat(SB.seat)),
  key(k, u, c) {
    const n: Record<string, number> = { hs: k === 'enter' || k === 'wave' ? 0 : 1, live: 1, mates: k === 'enter' ? 0 : 1, g: k === 'play' ? 0.1 + 0.4 * u : k === 'final' ? 0.5 + 0.5 * u : k === 'won' ? 1 : 0, fight: k === 'final' ? 1 : 0, ended: k === 'won' ? 1 : 0, cheer: k === 'wave' || k === 'won' ? 1 : k === 'final' ? 0.6 : 0.2, spot: k === 'wave' || k === 'won' ? 1 : 0, playing: k === 'play' || k === 'final' ? 1 : 0 };
    switch (k) {
      case 'enter':
        return { ...rest(c), nod: 0.04, n };
      case 'wave':
        return { l: c.bd(0.24 + 0.08 * Math.sin(c.t * 9), 0.86 * c.H, 0.12), gl: 0.1, palms: 0.9, r: rest(c).r, nod: -0.02, n };
      case 'sit':
        return { l: add(SB.kb, 0, 0.04, 0.04), r: add(SB.mouse, 0, 0.04, 0.04), gr: 0.4, lean: 0.06, nod: 0.2, n };
      case 'set':
        return { l: add(c.bd(0.15, 0.71, 0.04), 0, 0.01, 0), gl: 0.5, r: add(SB.mouse, 0.03 * Math.sin(u * 8), 0.04, 0), gr: 0.7, lean: 0.06, nod: 0.18, n };
      case 'play':
        return playing(SB.kb, SB.mouse, c.t, 0.45, n);
      case 'final':
        return { ...playing(SB.kb, SB.mouse, c.t, 1, n, 0.05 * Math.sin(c.t * 5.1)), lean: 0.22, nod: 0.3 };
      default: {
        const up = sm(u, 0, 0.25);
        const b = 0.05 * Math.sin(c.t * 10);
        return { l: lerpV(add(SB.kb, 0, 0.04, 0), c.bd(0.24, 0.9 + b, 0.1), up), r: lerpV(add(SB.mouse, 0, 0.04, 0), c.bd(-0.24, 0.9 - b, 0.1), up), gl: 1, gr: 1, lean: -0.08, nod: -0.08, n };
      }
    }
  },
};
const CHECK: Script = {
  seq: [['walk', 1.8], ['plug', 3.2], ['ping', 3], ['mic', 2.8], ['thumb', 1.6]],
  at: (k) => (k === 'walk' ? st(-0.4, 0.62, PI, SB.deck) : st(0.44, 0.1, PI, SB.deck)),
  key(k, u, c) {
    const n: Record<string, number> = { mates: 0, check: k === 'walk' ? 0 : 1, plugged: k === 'plug' ? sm(u, 0.5, 0.8) : k === 'walk' ? 0 : 1, ping: k === 'ping' ? u : k === 'mic' || k === 'thumb' ? 1 : 0, mic: k === 'mic' ? 1 : 0, tick: k === 'thumb' ? 1 : 0 };
    switch (k) {
      case 'plug': {
        const p = add(SB.cable, 0, -0.04 * sm(u, 0.5, 0.8), 0.02);
        return { r: p, gr: 0.9, l: rest(c).l, lean: 0.4, nod: 0.5, crouch: 0.2, props: { plug: p }, n };
      }
      case 'ping':
        return { r: add(SB.mouse, 0.44, 0.04, 0), gr: 0.7, l: add(SB.kb, 0.44, 0.03, 0.02), lean: 0.28, nod: 0.3, tap: true, n };
      case 'mic': {
        const m = c.bd(-0.03, 0.8 * c.H, 0.14);
        return { r: add(m, 0, -0.06, 0.02), gr: 0.9, l: rest(c).l, nod: 0.06, props: { mic: m }, n };
      }
      case 'thumb':
        return { r: c.bd(-0.2, 0.68 * c.H, 0.26), gr: 0.95, l: rest(c).l, nod: 0.05, n };
      default:
        return { ...rest(c), nod: 0.1, n };
    }
  },
};

const SCRIPTS: Record<EgMotion, Script> = { egScrim: SCRIM, egSolo: SOLO, egReflex: REFLEX, egPick: PICK, egPosition: POSITION, egReview: REVIEW, egStudy: STUDY, egScout: SCOUT, egDraft: DRAFT, egDebate: DEBATE, egStream: STREAM, egSponsor: SPONSOR, egPolish: POLISH, egWrist: WRIST, egWarm: WARM, egTune: TUNE, egSens: SENS, egShow: SHOW, egCheck: CHECK };
