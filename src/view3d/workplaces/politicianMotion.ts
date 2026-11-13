import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 시의원's office and the council chamber (2026-10-27, the 시청 의원 사무실, at the user's
 * request: giving a speech should look like giving a speech). Each is a round of beats, each held a
 * while and eased into the next, by the same clock (polPhase of the spot) as the piece it's done at,
 * so a podium turns its speaker to one side of the room and the other as the hands sweep out to it,
 * a council desk lights its microphone's ring while the member's speaking into it and a desk phone's
 * handset is at the ear while it's held there (workplaces/politician.ts). Kept out of activity.ts
 * (which only hands these motions over here) so it imports nothing from it at run time.
 */
export type PoliticianMotion = 'orate' | 'pressBrief' | 'council' | 'phoneCall';
export const POLITICIAN_MOTIONS = new Set<string>(['orate', 'pressBrief', 'council', 'phoneCall']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The same clock offset as activity.ts toolPhase: from where they're placed, so two desks aren't in step. */
export const polPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);

type Step<K extends string> = { key: K; hold: number; turn: number; move: number };
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): { from: K; to: K; e: number; turn: number } {
  const T = steps.reduce((n, k) => n + k.hold + k.move, 0);
  let u = frac(t / T + phase) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, turn: k.turn };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) {
      const e = THREE.MathUtils.smoothstep(Math.min(1, u / k.move), 0, 1);
      return { from: k.key, to: next.key, e, turn: k.turn + (next.turn - k.turn) * e };
    }
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, turn: 0 };
}
const st = <K extends string>(key: K, hold: number, turn = 0, move = 0.9): Step<K> => ({ key, hold, turn, move });

/**
 * A speech from the podium, ~34 s round: reading the line off the script, a hand flat on it; both
 * hands opened out to the room; turned to the left of the room, the left hand swept out to them;
 * a fist beating the point home; turned to the right, the right hand out to them; a hand on the
 * heart; both hands on the lectern's edges, leant in. `turn` is to the speaker's left (1) or right
 * (-1) of straight out; the podium turns its spot by SPEECH_SCAN times it.
 */
export type OrateKey = 'read' | 'open' | 'scanL' | 'emph' | 'scanR' | 'heart' | 'grip';
const ORATE: Array<Step<OrateKey>> = [st('read', 3.5), st('open', 4), st('scanL', 3.5, 1, 1.2), st('emph', 3), st('scanR', 3.5, -1, 1.4), st('heart', 2.5), st('grip', 3), st('open', 3)];
export const SPEECH_SCAN = 0.5;
export const orateBeat = (t: number, phase: number) => beatOf(ORATE, t, phase);

/**
 * A press briefing at the podium, ~36 s round: the statement read out held in both hands, a look up
 * at the cameras mid-sentence; then questions — a hand out to a reporter to the right of the room,
 * hearing them out with the hands on the lectern, nodding, answering with a hand making the point;
 * and the same to the left.
 */
export type PressKey = 'statement' | 'lookUp' | 'callR' | 'callL' | 'listen' | 'answer';
const PRESS: Array<Step<PressKey>> = [
  st('statement', 5),
  st('lookUp', 2, 0, 0.6),
  st('statement', 3.5),
  st('callR', 2.2, -0.7, 1.2),
  st('listen', 3.5, -0.7),
  st('answer', 4.5, -0.35),
  st('callL', 2.2, 0.7, 1.4),
  st('listen', 3, 0.7),
  st('answer', 4, 0.35),
];
export const pressBeat = (t: number, phase: number) => beatOf(PRESS, t, phase);

/**
 * Sat at a council desk in session, ~27 s round: listening, the hands on the papers, a slow nod;
 * a note jotted down; the microphone's button pressed and leant in to it, speaking with the right
 * hand making the case, a finger up on the point that matters; the button again, sat back.
 * `work` is the papers at the member's place; the button's at COUNCIL_MIC from it.
 */
export type CouncilKey = 'listen' | 'note' | 'press' | 'speak' | 'point';
const COUNCIL: Array<Step<CouncilKey>> = [st('listen', 4), st('note', 3), st('press', 1.1, 0, 0.6), st('speak', 5), st('point', 2.5), st('speak', 4), st('press', 1, 0, 0.6), st('listen', 3)];
export const councilBeat = (t: number, phase: number) => beatOf(COUNCIL, t, phase);
/** Whether the microphone's on at this beat (from the press before speaking to the press after). */
export function councilMicOn(t: number, phase: number): boolean {
  const T = COUNCIL.reduce((n, k) => n + k.hold + k.move, 0);
  const u = frac(t / T + phase) * T;
  // On from the first press's end to the second press's middle.
  let at = 0;
  const ends: number[] = [];
  for (const k of COUNCIL) {
    at += k.hold + k.move;
    ends.push(at);
  }
  return u > ends[2] - 0.4 && u < ends[5] + 0.5;
}
/** The mic's button from the papers (to the member's left, up, away from them). */
export const COUNCIL_MIC = { side: -0.2, up: 0.03, ahead: 0.17 };

/**
 * On the desk phone, sat, ~17 s round: the handset at the left ear all through; the right hand dials
 * on the keypad, then talks (an open hand, a nod), ticks the name off the call list, talks again.
 * `work` is the call list; the keypad's at PHONE_KEYPAD from it. The desk draws the handset at
 * phoneEar of the spot (by the dweller's height), where the left hand goes.
 */
export type PhoneKey = 'dial' | 'talk' | 'tick';
const PHONE: Array<Step<PhoneKey>> = [st('dial', 2.5, 0, 0.7), st('talk', 5), st('tick', 2.5, 0, 0.7), st('talk', 4), st('tick', 2, 0, 0.7)];
export const phoneBeat = (t: number, phase: number) => beatOf(PHONE, t, phase);
export const PHONE_KEYPAD = { side: 0.2, up: 0.04, ahead: 0.06 };
/** Where the handset is held to the left ear of someone `height` tall sat at a spot (in the spot's frame: x to their left, y up from the seat, z ahead). */
export function phoneEar(height: number): THREE.Vector3 {
  const k = height / 1.6;
  return new THREE.Vector3(0.1 * k, 0.46 * height + 0.05 * k, 0.04 * k);
}

type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gl: number; gr: number };
function blend(a: Key, z: Key, e: number): Doing {
  const mix = (q: number, r: number) => q + (r - q) * e;
  return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: mix(a.gl, z.gl), r: mix(a.gr, z.gr) } } };
}

export function politicianDoing(m: PoliticianMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const UP = new THREE.Vector3(0, 1, 0);
  const H = b.height;
  const k = H / 1.6;
  const y0 = b.base.y;
  const chest = y0 + (b.sitting ? 0.3 : 0.7) * H;
  const mouth = y0 + (b.sitting ? 0.46 : 0.86) * H;
  const waist = y0 + (b.sitting ? 0.12 : 0.56) * H;
  const front = (ahead: number, side: number, y: number) => b.base.clone().addScaledVector(fwd, ahead).addScaledVector(left, side).setY(y);
  const at = (p: THREE.Vector3, side: number, up = 0, ahead = 0) => p.clone().addScaledVector(left, side).addScaledVector(UP, up).addScaledVector(fwd, ahead);
  const ph = polPhase(b.base);
  const s = ph * 7.1;
  switch (m) {
    case 'orate': {
      // `work` is the middle of the lectern's near edge, under the script.
      const p = work?.point ?? front(0.35 * k, 0, waist + 0.3 * k);
      const beat = orateBeat(t, ph);
      const sway = 0.03 * k * wave(t, 0.35, s);
      const edgeL = at(p, 0.23, 0, -0.03);
      const edgeR = at(p, -0.23, 0, -0.03);
      const pose = (key: OrateKey): Key => {
        switch (key) {
          case 'read':
            return { l: at(p, 0.11, 0.012, 0.02), r: at(p, -0.07 + 0.04 * Math.max(0, wave(t, 0.2, s)) ** 6, 0.015, 0.05), lean: 0.12, nod: 0.38, palms: 1.3, gl: 0.2, gr: 0.35 };
          case 'open':
            return { l: front(0.36 * k, 0.3 * k + sway, chest - 0.02 * k + 0.02 * k * wave(t, 0.6, s)), r: front(0.36 * k, -0.3 * k - sway, chest - 0.02 * k + 0.02 * k * wave(t, 0.6, s + 0.3)), lean: 0.02, nod: -0.07, palms: -0.95, gl: 0.08, gr: 0.08 };
          case 'scanL':
            return { l: front(0.42 * k, (0.42 + 0.05 * wave(t, 0.3, s)) * k, chest + 0.03 * k), r: edgeR, lean: 0.03, nod: -0.06, palms: -0.8, gl: 0.08, gr: 0.6 };
          case 'emph': {
            const hit = Math.max(0, wave(t, 1.4, s)) ** 2;
            return { l: edgeL, r: front(0.3 * k, -0.15 * k, chest + 0.03 * k - 0.06 * k * hit), lean: 0.08 + 0.03 * hit, nod: 0.02 + 0.07 * hit, palms: 0.1, gl: 0.6, gr: 0.95 };
          }
          case 'scanR':
            return { l: edgeL, r: front(0.42 * k, -(0.42 + 0.05 * wave(t, 0.3, s)) * k, chest + 0.03 * k), lean: 0.03, nod: -0.06, palms: -0.8, gl: 0.6, gr: 0.08 };
          case 'heart':
            return { l: edgeL, r: front(0.13 * k, 0.07 * k, chest + 0.02 * k), lean: 0.03, nod: 0.12, palms: 0.5, gl: 0.6, gr: 0.15 };
          default:
            return { l: edgeL, r: edgeR, lean: 0.1, nod: 0.04 + 0.07 * Math.max(0, wave(t, 0.5, s)) ** 4, palms: 1.3, gl: 0.65, gr: 0.65 };
        }
      };
      return blend(pose(beat.from), beat.e > 0 ? pose(beat.to) : pose(beat.from), beat.e);
    }
    case 'pressBrief': {
      const p = work?.point ?? front(0.35 * k, 0, waist + 0.3 * k);
      const beat = pressBeat(t, ph);
      const bob = 0.03 * k * wave(t, 1.2, s);
      const paperL = at(p, 0.1, 0.03, 0.03);
      const paperR = at(p, -0.1, 0.03, 0.03);
      const pose = (key: PressKey): Key => {
        switch (key) {
          case 'statement':
            return { l: paperL, r: paperR, lean: 0.1, nod: 0.4 + 0.04 * wave(t, 0.3, s), palms: 1.15, gl: 0.5, gr: 0.5 };
          case 'lookUp':
            return { l: paperL, r: paperR, lean: 0.04, nod: -0.03, palms: 1.15, gl: 0.5, gr: 0.5 };
          case 'callR':
            return { l: paperL, r: front(0.5 * k, -0.14 * k, chest + 0.08 * k), lean: 0.03, nod: -0.05, palms: -0.3, gl: 0.45, gr: 0.08 };
          case 'callL':
            return { l: front(0.5 * k, 0.14 * k, chest + 0.08 * k), r: paperR, lean: 0.03, nod: -0.05, palms: -0.3, gl: 0.08, gr: 0.45 };
          case 'listen':
            return { l: at(p, 0.23, 0, -0.03), r: at(p, -0.23, 0, -0.03), lean: 0.07, nod: 0.06 + 0.08 * Math.max(0, wave(t, 0.45, s)) ** 4, palms: 1.3, gl: 0.6, gr: 0.6 };
          default:
            return { l: at(p, 0.22, 0, -0.03), r: front(0.33 * k, -0.2 * k, chest - 0.03 * k + bob), lean: 0.05, nod: -0.03 + 0.05 * Math.max(0, wave(t, 1.2, s)), palms: -0.6, gl: 0.6, gr: 0.15 };
        }
      };
      return blend(pose(beat.from), beat.e > 0 ? pose(beat.to) : pose(beat.from), beat.e);
    }
    case 'council': {
      const p = work?.point ?? front(0.34 * k, 0, waist + 0.14 * k);
      const beat = councilBeat(t, ph);
      const papers = (gr = 0.3): Pick<Key, 'l' | 'gl'> & { r: THREE.Vector3; gr: number } => ({ l: at(p, 0.11, 0.01, 0), gl: 0.3, r: at(p, -0.1, 0.01, 0), gr });
      const pose = (key: CouncilKey): Key => {
        switch (key) {
          case 'listen':
            return { ...papers(), lean: 0.02, nod: 0.1 + 0.08 * Math.max(0, wave(t, 0.4, s)) ** 4, palms: 1.3 };
          case 'note':
            return { l: at(p, 0.14, 0.005, -0.02), gl: 0.25, r: at(p, -0.03 + 0.025 * wave(t, 2.2, s), 0.012 + 0.006 * wave(t, 4.4, s), 0.02 * wave(t, 1.1, s)), gr: 0.85, lean: 0.28, nod: 0.45, palms: 1.25 };
          case 'press':
            return { l: at(p, 0.11, 0.01, 0), gl: 0.3, r: at(p, COUNCIL_MIC.side, COUNCIL_MIC.up, COUNCIL_MIC.ahead), gr: 0.35, lean: 0.24, nod: 0.3, palms: 1.3 };
          case 'speak':
            return { l: at(p, 0.11, 0.01, 0), gl: 0.3, r: front(0.36 * k, -0.17 * k, chest + 0.03 * k + 0.035 * k * wave(t, 0.8, s)), gr: 0.15, lean: 0.3, nod: -0.05 + 0.05 * Math.max(0, wave(t, 1.2, s)), palms: -0.6 };
          default:
            return { l: at(p, 0.11, 0.01, 0), gl: 0.3, r: front(0.32 * k, -0.14 * k, mouth + 0.06 * k + 0.03 * k * Math.max(0, wave(t, 1.5, s)) ** 2), gr: 0.75, lean: 0.3, nod: -0.08, palms: 0.2 };
        }
      };
      return blend(pose(beat.from), beat.e > 0 ? pose(beat.to) : pose(beat.from), beat.e);
    }
    default: {
      // phoneCall: the left hand at the ear the handset is drawn at (phoneEar).
      const p = work?.point ?? front(0.34 * k, 0, waist + 0.14 * k);
      const beat = phoneBeat(t, ph);
      const e0 = phoneEar(H);
      const ear = b.base.clone().addScaledVector(left, e0.x).addScaledVector(fwd, e0.z).setY(y0 + e0.y);
      const pose = (key: PhoneKey): Key => {
        switch (key) {
          case 'dial': {
            const tap = 0.012 * Math.max(0, wave(t, 3.2, s));
            const pad = at(p, PHONE_KEYPAD.side + 0.015 * wave(t, 0.9, s), PHONE_KEYPAD.up + tap, PHONE_KEYPAD.ahead + 0.01 * wave(t, 0.7, s));
            return { l: ear, r: pad, lean: 0.2, nod: 0.38, palms: 1.2, gl: 0.8, gr: 0.4 };
          }
          case 'tick':
            return { l: ear, r: at(p, -0.02 + 0.03 * wave(t, 1.6, s), 0.012 + 0.008 * Math.max(0, wave(t, 3.2, s)), 0.02 * wave(t, 0.8, s)), lean: 0.22, nod: 0.42, palms: 1.25, gl: 0.8, gr: 0.85 };
          default:
            return { l: ear, r: front(0.3 * k, -0.14 * k, chest + 0.02 * k + 0.03 * k * wave(t, 0.7, s)), lean: 0.06, nod: 0.02 + 0.07 * Math.max(0, wave(t, 0.5, s)) ** 3, palms: -0.5, gl: 0.8, gr: 0.15 };
        }
      };
      return blend(pose(beat.from), beat.e > 0 ? pose(beat.to) : pose(beat.from), beat.e);
    }
  }
}
