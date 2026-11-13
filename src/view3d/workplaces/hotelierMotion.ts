import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * Hotel work (2026-10-27, the 호텔, at the user's request: hotel work should look like hotel work).
 * Each motion is a round of beats, each held a while and eased into the next, by the same clock
 * (hotelPhase of the piece's work point) as the piece it's done at, so what the hands hold is drawn
 * there in step (workplaces/hotelier.ts): the key card taken off the stack, held in the encoder till
 * its light goes green and handed across the counter in both hands to the guest, who reaches for it;
 * the route traced on the city map with a finger, the destination ringed; the luggage cart loaded and
 * wheeled out, turned and wheeled back; the bed's sheet snapped out, smoothed and tucked, the pillow
 * plumped and set, a chocolate on it and the towel swan at the foot; the minibar's door opened and its
 * drinks put in one by one; a towel shaken out and folded in four; a chafing dish's lid rolled back;
 * the elevator called and a guest shown into it with an open hand; a welcome tea served.
 *
 * Kept out of activity.ts (which only hands these motions over here) so it imports nothing from it at
 * run time. A pose is worked out against a Frame: `o` places a point by its offset from the piece's
 * work point in the piece's own axes, `bd` by the body's (to their left, up from the floor, ahead).
 * The builder works the same poses out in the piece's frame to put what's held in the hands.
 */
export type HotelMotion = 'checkIn' | 'frontPhone' | 'concierge' | 'tagBag' | 'wheelCart' | 'makeBed' | 'restock' | 'foldLinen' | 'foldCart' | 'buffet' | 'escort' | 'welcomeTea';
export const HOTEL_MOTIONS = new Set<string>(['checkIn', 'frontPhone', 'concierge', 'tagBag', 'wheelCart', 'makeBed', 'restock', 'foldLinen', 'foldCart', 'buffet', 'escort', 'welcomeTea']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The clock offset (as activity.ts toolPhase): from where the piece's work point is, so two pieces aren't in step. */
export const hotelPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const sm = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

// ---------------------------------------------------------------------------------------------
// Rounds of beats.

/** A round: each beat's key, how long it's held, and how long it takes to ease into the next. */
type Seq = Array<[string, number, number?]>;
export interface Beat {
  /** The beat's place in the round, its key, the next one's. */
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
  let x = frac(t / T + phase) * T;
  for (let i = 0; i < seq.length; i++) {
    const [key, hold, move = MOVE] = seq[i];
    const next = seq[(i + 1) % seq.length][0];
    if (x < hold) return { i, from: key, to: key, u: hold > 0 ? x / hold : 1, e: 0 };
    x -= hold;
    if (x < move || i === seq.length - 1) return { i, from: key, to: next, u: 1, e: sm(Math.min(1, x / move), 0, 1) };
    x -= move;
  }
  return { i: 0, from: seq[0][0], to: seq[0][0], u: 0, e: 0 };
}

/** Where things are worked out: the piece's work point and axes, the body's place and axes, how tall they are. */
export interface Frame {
  /** A point at an offset from the work point, in the piece's own axes (x across, y up, z out of its front). */
  o(dx: number, dy: number, dz: number): THREE.Vector3;
  /** A point from the feet: to their left, up from the floor, ahead of them. */
  bd(side: number, up: number, ahead: number): THREE.Vector3;
  /** Standing height, and that over 1.6 m. */
  H: number;
  k: number;
}
/** A frame in some space: the work point and the piece's turn, the feet and the body's turn. */
export function frameAt(work: THREE.Vector3, pieceYaw: number, feet: THREE.Vector3, yaw: number, H: number): Frame {
  const c = Math.cos(pieceYaw);
  const s = Math.sin(pieceYaw);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return {
    o: (dx, dy, dz) => new THREE.Vector3(work.x + dx * c + dz * s, work.y + dy, work.z - dx * s + dz * c),
    bd: (side, up, ahead) => feet.clone().addScaledVector(left, side).addScaledVector(fwd, ahead).setY(feet.y + up),
    H,
    k: H / 1.6,
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
  crouch: number;
  tap?: boolean;
}
const hands = (h: Partial<Hands>): Hands => ({ lean: 0, nod: 0, palms: 0.4, gl: 0.3, gr: 0.3, crouch: 0, ...h });
function mix(a: Hands, b: Hands, e: number): Hands {
  if (e <= 0) return a;
  const n = (p: number, q: number) => p + (q - p) * e;
  const v = (p?: THREE.Vector3, q?: THREE.Vector3) => (p && q ? p.clone().lerp(q, e) : e < 0.5 ? p : q);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean), nod: n(a.nod, b.nod), palms: n(a.palms, b.palms), gl: n(a.gl, b.gl), gr: n(a.gr, b.gr), crouch: n(a.crouch, b.crouch), tap: e < 0.5 ? a.tap : b.tap };
}
/** Hands folded over the belly (공수), as staff stand waiting or bow. */
const gongsu = (f: Frame, lean = 0.05, nod = 0.08): Hands =>
  hands({ l: f.bd(0.035 * f.k, 0.53 * f.H, 0.16 * f.k), r: f.bd(-0.035 * f.k, 0.535 * f.H, 0.165 * f.k), lean, nod, palms: 0.6, gl: 0.45, gr: 0.45 });
/** A bow from the waist, hands folded, over a beat. */
const bow = (f: Frame, u: number, deep = 0.38) => gongsu(f, 0.08 + deep * Math.sin(Math.PI * u), 0.15 + 0.2 * Math.sin(Math.PI * u));

type KeyFn = (key: string, f: Frame, u: number, t: number, s: number) => Hands;
interface Round {
  seq: Seq;
  key: KeyFn;
  /** The spot's turn in the piece's own frame (0 faces its front), by the beat. */
  yaw: (b: Beat) => number;
}
const fixed = (y: number) => () => y;

// ---------------------------------------------------------------------------------------------
// The front desk: checking a guest in, on the phone.

/** The front desk (2 × 1): the clerk's place behind the counter, the keyboard (its work point), what's on the work top round it. */
export const FD = {
  clerk: { x: -0.45, z: -0.24 },
  kbd: new THREE.Vector3(-0.45, 0.935, 0.0),
  /** Offsets from the keyboard: the blank cards, the encoder's slot (a card stood in it, its middle), the memo pad, the phone's cradle. */
  stack: [-0.25, 0.0, 0.1] as const,
  slot: [-0.36, 0.075, 0.1] as const,
  pad: [-0.17, 0.0, -0.06] as const,
  cradle: [0.34, 0.03, 0.08] as const,
  /** Where the card's handed over, in both hands, over the guest ledge. */
  hand: [0, 0.26, 0.43] as const,
};
const CHECK_IN: Round = {
  seq: [['type', 4.4], ['take', 0.7, 0.6], ['encode', 2.2, 0.6], ['present', 2.6, 0.8], ['point', 2.2, 0.8], ['bow', 1.5, 0.8]],
  yaw: fixed(0),
  key(key, f, u, t, s) {
    const kb = (side: number, ph: number) => f.o(side, 0.012 + 0.012 * Math.max(0, wave(t, 6.5, s + ph)), 0);
    switch (key) {
      case 'type':
        return hands({ l: kb(0.12, 0), r: kb(-0.12, 0.5), lean: 0.2, nod: 0.32, palms: 1.45, gl: 0.35, gr: 0.35, tap: true });
      case 'take':
        return hands({ l: f.o(0.12, 0.012, 0), r: f.o(FD.stack[0], 0.015, FD.stack[2]), lean: 0.22, nod: 0.45, palms: 1.3, gl: 0.35, gr: 0.65 });
      case 'encode': {
        const lift = 0.035 * (1 - sm(u, 0, 0.18)) + 0.035 * sm(u, 0.82, 1);
        return hands({ l: f.o(0.1, 0.01, 0.02), r: f.o(FD.slot[0], FD.slot[1] + 0.045 + lift, FD.slot[2]), lean: 0.2, nod: 0.45, palms: 1.0, gl: 0.3, gr: 0.75 });
      }
      case 'present':
        return hands({ l: f.o(0.055, FD.hand[1], FD.hand[2]), r: f.o(-0.055, FD.hand[1], FD.hand[2]), lean: 0.24, nod: 0.12, palms: 0.9, gl: 0.6, gr: 0.6 });
      case 'point':
        return hands({ l: f.o(0.5, 0.3 + 0.02 * wave(t, 0.5, s), 0.32), r: f.o(-0.12, 0.012, 0), lean: 0.04, nod: -0.05, palms: -0.9, gl: 0.1, gr: 0.3 });
      default:
        return bow(f, u);
    }
  },
};
/** Where a guest's key card is now: not out, in the clerk's hand (or stood in the encoder), held out to the guest, or the guest's. */
export interface CardAt {
  show: 'none' | 'hand' | 'guest';
  /** Its middle (in the frame the hands were worked out in), when it's in a hand. */
  at?: THREE.Vector3;
  /** The encoder's light: writing (red), done (green). */
  led: 'off' | 'red' | 'green';
  /** How far the guest's hand is out for it (0–1). */
  reach: number;
}
export function cardAt(f: Frame, t: number, ph: number): CardAt {
  const b = beatOf(CHECK_IN.seq, t, ph);
  const h = poseOf(CHECK_IN, f, t, ph);
  const inR = h.r!.clone().add(new THREE.Vector3(0, -0.045, 0));
  const mid = h.l!.clone().lerp(h.r!, 0.5).add(new THREE.Vector3(0, -0.035, 0.015));
  switch (b.from) {
    case 'take':
      return { show: 'hand', at: inR, led: 'off', reach: 0 };
    case 'encode':
      return b.e > 0 ? { show: 'hand', at: inR.lerp(mid, b.e), led: 'green', reach: 0 } : { show: 'hand', at: inR, led: b.u > 0.5 ? 'green' : 'red', reach: 0 };
    case 'present':
      if (b.e > 0 || b.u > 0.74) return { show: 'guest', led: 'off', reach: b.e > 0 ? 0 : 1 - sm(b.u, 0.78, 1) };
      return { show: 'hand', at: mid, led: 'off', reach: sm(b.u, 0.3, 0.72) };
    case 'point':
    case 'bow':
      return { show: 'guest', led: 'off', reach: 0 };
    default:
      return { show: 'none', led: 'off', reach: 0 };
  }
}

/** Where the handset's held to the left ear of someone stood (by the body). */
const ear = (f: Frame) => f.bd(0.1 * f.k, 0.885 * f.H, 0.05 * f.k);
const FRONT_PHONE: Round = {
  seq: [['lift', 0.4, 0.7], ['listen', 3], ['type', 3.4], ['listen', 2], ['note', 3], ['listen', 2.4], ['hang', 0.4, 0.6], ['rest', 2]],
  yaw: fixed(0),
  key(key, f, _u, t, s) {
    const cradle = f.o(...FD.cradle);
    switch (key) {
      case 'lift':
      case 'hang':
        return hands({ l: cradle, r: f.o(-0.12, 0.012, 0), lean: 0.18, nod: 0.35, palms: 1.2, gl: 0.75, gr: 0.35 });
      case 'listen':
        return hands({ l: ear(f), r: f.o(-0.1, 0.01, -0.02), lean: 0.06, nod: 0.1 + 0.07 * Math.max(0, wave(t, 0.45, s)) ** 4, palms: 1.2, gl: 0.8, gr: 0.35 });
      case 'type':
        return hands({ l: ear(f), r: f.o(-0.08 + 0.04 * wave(t, 0.7, s), 0.012 + 0.01 * Math.max(0, wave(t, 6, s)), 0), lean: 0.16, nod: 0.3, palms: 1.4, gl: 0.8, gr: 0.35, tap: true });
      case 'note':
        return hands({ l: ear(f), r: f.o(FD.pad[0] + 0.025 * wave(t, 2.2, s), 0.012 + 0.006 * wave(t, 4.4, s), FD.pad[2] + 0.02 * wave(t, 1.1, s)), lean: 0.22, nod: 0.45, palms: 1.2, gl: 0.8, gr: 0.85 });
      default:
        return hands({ l: f.o(0.12, 0.012, 0), r: f.o(-0.12, 0.012, 0), lean: 0.18, nod: 0.3, palms: 1.45, gl: 0.35, gr: 0.35 });
    }
  },
};
/** Whether the handset's out of its cradle (in the left hand) now. */
export function handsetUp(t: number, ph: number): boolean {
  const b = beatOf(FRONT_PHONE.seq, t, ph);
  return !((b.from === 'lift' && b.e === 0) || b.from === 'hang' || b.from === 'rest');
}

// ---------------------------------------------------------------------------------------------
// The concierge desk: a route traced on the city map.

/** The concierge desk (1 × 1): the concierge's place behind it; the map's middle (its work point), the route on it, the brochure rack. */
export const CON = {
  stand: { x: 0, z: -0.24 },
  map: new THREE.Vector3(0, 1.005, 0.17),
  /** The route from the hotel (first) to where they're going (last), offsets from the map's middle. */
  route: [[-0.15, 0.1], [-0.07, 0.05], [-0.03, -0.03], [0.07, -0.06], [0.14, -0.12]] as Array<[number, number]>,
  rack: [0.36, 0.13, -0.03] as const,
  give: [0.12, 0.2, 0.42] as const,
};
function along(pts: Array<[number, number]>, u: number): [number, number] {
  const len: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += len[i - 1] = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let d = THREE.MathUtils.clamp(u, 0, 1) * total;
  for (let i = 1; i < pts.length; i++) {
    if (d <= len[i - 1] || i === pts.length - 1) {
      const k = Math.min(1, d / len[i - 1]);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    }
    d -= len[i - 1];
  }
  return pts[pts.length - 1];
}
/** The route's length so far for each leg, to draw it as far as it's traced. */
export const routeAt = (u: number) => along(CON.route, u);
const CONCIERGE: Round = {
  seq: [['look', 1.8], ['pointH', 1.6], ['trace', 3.6, 0.5], ['circle', 1.8], ['explain', 2.8], ['brochure', 2.6], ['look', 1.5]],
  yaw: fixed(0),
  key(key, f, u, t, s) {
    const edge = { l: f.o(0.2, 0.0, -0.14), r: f.o(-0.2, 0.0, -0.14) };
    const finger = (x: number, z: number) => hands({ l: edge.l, r: f.o(x, 0.012, z), lean: 0.32, nod: 0.5, palms: 1.15, gl: 0.4, gr: 0.55 });
    switch (key) {
      case 'pointH':
        return finger(...CON.route[0]);
      case 'trace':
        return finger(...routeAt(u));
      case 'circle': {
        const [x, z] = CON.route[CON.route.length - 1];
        const a = u * Math.PI * 4;
        return { ...finger(x + 0.028 * Math.cos(a), z + 0.028 * Math.sin(a)), gr: 0.85 };
      }
      case 'explain':
        return hands({ l: edge.l, r: f.o(-0.12, 0.26 + 0.025 * wave(t, 0.6, s), 0.24), lean: 0.06, nod: -0.05, palms: -0.7, gl: 0.4, gr: 0.15 });
      case 'brochure': {
        const k = sm(u, 0.25, 0.75);
        const l = f.o(...CON.rack).lerp(f.o(...CON.give), k);
        return hands({ l, r: f.o(-0.08, 0.01, 0.0), lean: 0.12 + 0.12 * k, nod: 0.3 - 0.2 * k, palms: 0.6, gl: 0.6, gr: 0.3 });
      }
      default:
        return hands({ ...edge, lean: 0.06, nod: 0.08 + 0.06 * Math.max(0, wave(t, 0.4, s)) ** 4, palms: 1.3, gl: 0.4, gr: 0.4 });
    }
  },
};
/** How far along the route's been traced, whether the destination's ringed, and where the brochure is. */
export function conciergeAt(t: number, ph: number): { traced: number; ringed: number; brochure: 'rack' | 'hand' | 'guest'; reach: number } {
  const b = beatOf(CONCIERGE.seq, t, ph);
  const traced = b.i < 2 ? 0 : b.i === 2 ? (b.e > 0 ? 1 : b.u) : 1;
  const ringed = b.i < 3 ? 0 : b.i === 3 ? (b.e > 0 ? 1 : b.u) : 1;
  if (b.i === 5) return { traced, ringed, brochure: b.u < 0.8 || b.e > 0 ? (b.e > 0 ? 'guest' : 'hand') : 'guest', reach: b.e > 0 ? 0 : sm(b.u, 0.5, 0.78) * (1 - sm(b.u, 0.85, 1)) };
  return { traced, ringed, brochure: b.i === 6 ? 'guest' : 'rack', reach: 0 };
}

// ---------------------------------------------------------------------------------------------
// The bell desk: a claim tag written, torn, looped on a case's handle; the stub handed over.

/** The bell desk (1 × 1): the bell captain behind it, the tag pad (its work point), the bell, the case beside them. */
export const BELL = {
  stand: { x: 0, z: -0.3 },
  pad: new THREE.Vector3(0.05, 1.055, 0.1),
  bell: [-0.25, 0.005, 0.15] as const,
  /** The case's handle (offset from the pad), stood on the captain's right. */
  handle: [-0.47, -0.39, -0.4] as const,
  give: [-0.02, 0.17, 0.37] as const,
};
const TAG: Round = {
  seq: [['write', 2.8], ['tear', 0.9, 0.6], ['loop', 2.4, 0.9], ['offer', 2.2, 0.7], ['bell', 1.0, 0.5], ['bow', 1.3, 0.8]],
  // Turned to the case on their right to loop the tag on, and back.
  yaw: (b) => (b.from === 'tear' && b.to === 'loop' ? -b.e : b.from === 'loop' ? (b.e > 0 ? -(1 - b.e) : -1) : 0) * (Math.PI / 2),
  key(key, f, u, t, s) {
    switch (key) {
      case 'write':
        return hands({ l: f.o(0.12, 0.004, -0.02), r: f.o(-0.02 + 0.025 * wave(t, 2.2, s), 0.012 + 0.006 * wave(t, 4.4, s), 0.02 * wave(t, 1.1, s)), lean: 0.25, nod: 0.45, palms: 1.25, gl: 0.25, gr: 0.85 });
      case 'tear':
        return hands({ l: f.o(0.06, 0.01, 0.0), r: f.o(-0.04 - 0.08 * sm(u, 0.3, 0.7), 0.02 + 0.05 * sm(u, 0.3, 0.7), 0.02), lean: 0.22, nod: 0.42, palms: 1.0, gl: 0.6, gr: 0.7 });
      case 'loop': {
        const [x, y, z] = BELL.handle;
        const w = 0.02 * wave(t, 1.4, s);
        return hands({ l: f.o(x + 0.02, y + 0.01, z + 0.05), r: f.o(x - 0.01 + w, y + 0.02 + w, z - 0.05), crouch: 0.55, lean: 0.35, nod: 0.55, palms: 0.8, gl: 0.6, gr: 0.6 });
      }
      case 'offer':
        return hands({ l: f.o(BELL.give[0] + 0.05, BELL.give[1], BELL.give[2]), r: f.o(BELL.give[0] - 0.05, BELL.give[1], BELL.give[2]), lean: 0.22, nod: 0.12, palms: 0.9, gl: 0.6, gr: 0.6 });
      case 'bell': {
        const hit = Math.max(0, wave(t, 1.6, s)) ** 3;
        return hands({ l: f.o(0.12, 0.004, -0.04), r: f.o(BELL.bell[0], BELL.bell[1] + 0.075 - 0.035 * hit, BELL.bell[2]), lean: 0.12, nod: 0.3, palms: 1.4, gl: 0.3, gr: 0.2 });
      }
      default:
        return bow(f, u);
    }
  },
};
/** Where the claim tag (the half looped on the case) and the stub (handed to the guest) are. */
export function tagAt(f: Frame, t: number, ph: number): { tag: 'pad' | 'hand' | 'case'; stub: 'pad' | 'hand' | 'guest'; r?: THREE.Vector3; mid?: THREE.Vector3; reach: number; ding: boolean } {
  const b = beatOf(TAG.seq, t, ph);
  const h = poseOf(TAG, f, t, ph);
  const mid = h.l!.clone().lerp(h.r!, 0.5).add(new THREE.Vector3(0, -0.02, 0.02));
  const r = h.r!.clone().add(new THREE.Vector3(0, -0.02, 0));
  switch (b.from) {
    case 'write':
      return { tag: 'pad', stub: 'pad', reach: 0, ding: false };
    case 'tear':
      return { tag: b.u > 0.45 || b.e > 0 ? 'hand' : 'pad', stub: 'pad', r, reach: 0, ding: false };
    case 'loop':
      if (b.e > 0) return { tag: 'case', stub: 'hand', mid, reach: 0, ding: false };
      return { tag: b.u > 0.55 ? 'case' : 'hand', stub: 'pad', r, reach: 0, ding: false };
    case 'offer':
      if (b.e > 0 || b.u > 0.74) return { tag: 'case', stub: 'guest', reach: b.e > 0 ? 0 : 1 - sm(b.u, 0.78, 1), ding: false };
      return { tag: 'case', stub: 'hand', mid, reach: sm(b.u, 0.3, 0.72), ding: false };
    case 'bell':
      return { tag: 'case', stub: 'guest', reach: 0, ding: b.e === 0 && Math.max(0, wave(t, 1.6, ph * 7.1)) ** 3 > 0.6 };
    default:
      return { tag: 'case', stub: 'guest', reach: 0, ding: false };
  }
}

// ---------------------------------------------------------------------------------------------
// The luggage cart: a case loaded, the cart wheeled out, turned, wheeled back, the case set down.

/**
 * The cart in its own frame (it runs along x, its push bar at -x): the bellhop's place behind the bar,
 * facing along it; where they push it to and back.
 */
export const CART = { stand: { x: -0.85, z: 0 }, out: 1.6 };
const BAR = new Set(['out', 'turn', 'back', 'turn2']);
const WHEEL: Round = {
  seq: [['rest', 1.2], ['reach', 1.0, 0.6], ['lift', 0.3, 0.6], ['deck', 0.5, 0.6], ['out', 4.2, 0.4], ['turn', 2.6, 0.2], ['back', 4.2, 0.2], ['turn2', 2.6, 0.5], ['deck2', 0.4, 0.6], ['lift2', 0.3, 0.6], ['reach2', 0.6, 0.6]],
  yaw: fixed(Math.PI / 2),
  key(key, f) {
    const at = (side: number, up: number, ahead: number, more: Partial<Hands>) => hands({ l: f.bd(side + 0.05, up, ahead), r: f.bd(side - 0.05, up, ahead), gl: 0.85, gr: 0.85, palms: 0.6, ...more });
    if (BAR.has(key)) return hands({ l: f.bd(0.2, 0.98, 0.33), r: f.bd(-0.2, 0.98, 0.33), lean: 0.14, nod: 0.05, palms: 1.2, gl: 0.85, gr: 0.85 });
    switch (key.replace(/2$/, '')) {
      case 'reach':
        return at(...CASE_FLOOR, { crouch: 0.55, lean: 0.3, nod: 0.5 });
      case 'lift':
        return at(...CASE_LIFT, { crouch: 0.1, lean: 0.1, nod: 0.3 });
      case 'deck':
        return at(...CASE_DECK, { crouch: 0.15, lean: 0.4, nod: 0.45 });
      default:
        return gongsu(f);
    }
  },
};
/** The case's handle, from the bellhop's feet (their left, up, ahead): on the floor by them, lifted, on the cart's deck. */
const CASE_FLOOR = [-0.32, 0.58, 0.3] as const;
const CASE_LIFT = [-0.1, 0.98, 0.36] as const;
const CASE_DECK = [0, 0.81, 0.62] as const;
/** Where the cart is (along its own x from where it's parked, and turned about its middle) and the case's handle (in the frame given). */
export function cartAt(f: Frame, t: number, ph: number): { x: number; turn: number; handle: THREE.Vector3 } {
  const b = beatOf(WHEEL.seq, t, ph);
  let x = 0;
  let turn = 0;
  if (b.i === 4) x = CART.out * (b.e > 0 ? 1 : sm(b.u, 0, 1));
  else if (b.i === 5) [x, turn] = [CART.out, Math.PI * (b.e > 0 ? 1 : sm(b.u, 0, 1))];
  else if (b.i === 6) [x, turn] = [CART.out * (b.e > 0 ? 0 : 1 - sm(b.u, 0, 1)), Math.PI];
  else if (b.i === 7) turn = Math.PI * (b.e > 0 ? 0 : 1 - sm(b.u, 0, 1));
  const held = (b.from === 'reach' && b.e > 0) || b.from === 'lift' || (b.from === 'deck2' && b.e > 0) || b.from === 'lift2';
  const onDeck = b.from === 'deck' || BAR.has(b.from) || (b.from === 'deck2' && b.e === 0);
  const h = poseOf(WHEEL, f, t, ph);
  const handle = held ? h.l!.clone().lerp(h.r!, 0.5) : onDeck ? f.bd(...CASE_DECK) : f.bd(...CASE_FLOOR);
  return { x, turn, handle };
}

// ---------------------------------------------------------------------------------------------
// Making up the hotel bed.

/** The bed (2 × 2, its head to the wall): the mattress's top, where they stand at its foot and at its side by the pillows. */
export const BED = { top: 0.6, foot: { x: 0, z: 1.3, yaw: Math.PI }, side: { x: 1.3, z: -0.55, yaw: Math.PI * 1.5 }, corner: { x: 1.3, z: 1.3 } };
const MAKE_BED: Round = {
  seq: [['grab', 0.8, 0.5], ['snapUp', 0.35, 0.35], ['snapDown', 0.9, 0.6], ['smooth', 2.6, 0.6], ['tuck', 2.2, 0.6], ['walk', 3.6, 0.4], ['pillowLift', 0.7, 0.6], ['plump', 1.6, 0.6], ['pillowSet', 0.8, 0.5], ['choco', 1.4, 0.5], ['walk2', 3.6, 0.4], ['swan', 1.6, 0.6], ['look', 1.8, 0.8]],
  yaw: () => 0,
  key(key, f, u, t, s) {
    const pair = (side: number, up: number, ahead: number, more: Partial<Hands>) => hands({ l: f.bd(side + 0.15, up, ahead), r: f.bd(side - 0.15, up, ahead), ...more });
    switch (key) {
      case 'grab':
        return hands({ l: f.bd(0.42, 0.66, 0.4), r: f.bd(-0.42, 0.66, 0.4), crouch: 0.15, lean: 0.45, nod: 0.5, gl: 0.8, gr: 0.8, palms: 0.6 });
      case 'snapUp':
        return hands({ l: f.bd(0.45, 1.5 * f.k, 0.35), r: f.bd(-0.45, 1.5 * f.k, 0.35), lean: -0.05, nod: -0.15, palms: 0.2, gl: 0.85, gr: 0.85 });
      case 'snapDown':
        return hands({ l: f.bd(0.45, 0.8, 0.62), r: f.bd(-0.45, 0.8, 0.62), lean: 0.35, nod: 0.3, palms: 0.4, gl: 0.8, gr: 0.8 });
      case 'smooth':
        return hands({ l: f.bd(0.32 + 0.12 * wave(t, 0.6, s), 0.665, 0.7 + 0.12 * wave(t, 0.6, s + 0.25)), r: f.bd(-0.32 + 0.12 * wave(t, 0.6, s + 0.5), 0.665, 0.7 + 0.12 * wave(t, 0.6, s + 0.75)), lean: 0.6, nod: 0.55, palms: 1.4, gl: 0.1, gr: 0.1 });
      case 'tuck':
        return hands({ l: f.bd(-0.12, 0.5, 0.42), r: f.bd(-0.42, 0.5 + 0.02 * wave(t, 1.5, s), 0.44), crouch: 0.6, lean: 0.35, nod: 0.5, palms: 1.5, gl: 0.2, gr: 0.2 });
      case 'pillowLift':
        return pair(-0.17, 0.74, 0.82, { lean: 0.55, nod: 0.5, gl: 0.7, gr: 0.7, palms: 0.5 });
      case 'plump': {
        const sq = 0.05 * Math.max(0, wave(t, 1.6, s));
        return hands({ l: f.bd(-0.05 + 0.2 - sq, 1.1 * f.k, 0.38), r: f.bd(-0.05 - 0.2 + sq, 1.1 * f.k, 0.38), lean: 0.05, nod: 0.2, palms: 0, gl: 0.8, gr: 0.8 });
      }
      case 'pillowSet':
        return pair(-0.17, 0.82, 0.82, { lean: 0.55, nod: 0.5, gl: 0.7, gr: 0.7, palms: 0.5 });
      case 'choco':
        return hands({ l: f.bd(0.2, 0.64, 0.45), r: f.bd(0.1, 0.71 - 0.035 * sm(u, 0.4, 0.6), 0.8), lean: 0.5, nod: 0.55, palms: 1.2, gl: 0.2, gr: 0.6 });
      case 'swan': {
        const k = sm(u, 0.35, 0.8);
        return hands({ l: f.bd(0.1, 1.0 - 0.3 * k, 0.3 + 0.32 * k), r: f.bd(-0.1, 1.0 - 0.3 * k, 0.3 + 0.32 * k), lean: 0.1 + 0.35 * k, nod: 0.3 + 0.2 * k, palms: 0.2, gl: 0.5, gr: 0.5 });
      }
      case 'look':
        return gongsu(f, 0.08, 0.25);
      default:
        return hands({});
    }
  },
};
const WALKING = new Set(['walk', 'walk2']);
/** Along a path (a few points) by `u`, the last leg's direction too. */
function onPath(pts: Array<{ x: number; z: number }>, u: number): { x: number; z: number; dir: number } {
  const total = pts.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - pts[i].x, p.z - pts[i].z), 0);
  let d = THREE.MathUtils.clamp(u, 0, 1) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (d <= len || i === pts.length - 1) {
      const k = Math.min(1, d / len);
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dir: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    d -= len;
  }
  return { ...pts[pts.length - 1], dir: 0 };
}
const turnTo = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
/** Where the one making the bed is (in the bed's frame) and which way they face: at the foot, walking round, at the side. */
function walkRound(from: { x: number; z: number; yaw: number }, to: { x: number; z: number; yaw: number }, u: number) {
  const pts = [from, BED.corner, to];
  const p = onPath(pts, sm(u, 0.12, 0.88));
  const first = Math.atan2(BED.corner.x - from.x, BED.corner.z - from.z);
  const last = Math.atan2(to.x - BED.corner.x, to.z - BED.corner.z);
  let yaw: number;
  if (u < 0.12) yaw = turnTo(from.yaw, first, sm(u, 0, 0.12));
  else if (u > 0.88) yaw = turnTo(last, to.yaw, sm(u, 0.88, 1));
  else yaw = p.dir;
  return { x: p.x, z: p.z, yaw };
}
/** What the bed's like now: the duvet (bunched 0 – spread 1, its foot edge lifted, a billow through it, tucked), the pillow, the chocolate, the swan; where they stand. */
export interface BedAt {
  spot: { x: number; z: number; yaw: number };
  spread: number;
  lift: number;
  billow: number;
  creased: number;
  tucked: number;
  pillow: 'askew' | 'hand' | 'set';
  choco: 'none' | 'hand' | 'set';
  swan: 'none' | 'hand' | 'set';
}
export function bedAt(t: number, ph: number): BedAt {
  const b = beatOf(MAKE_BED.seq, t, ph);
  const i = b.i;
  const spot = b.from === 'walk' ? walkRound(BED.foot, BED.side, b.e > 0 ? 1 : b.u) : b.from === 'walk2' ? walkRound(BED.side, BED.foot, b.e > 0 ? 1 : b.u) : i >= 6 && i <= 9 ? BED.side : BED.foot;
  const spread = i === 0 ? 0.1 * b.e : i === 1 ? 0.1 + 0.4 * (b.e > 0 ? 1 : b.u) : i === 2 && b.e === 0 ? 0.5 + 0.5 * sm(b.u, 0, 0.7) : 1;
  const lift = i === 0 ? 0.3 * b.e : i === 1 ? 0.3 + 0.55 * (b.e > 0 ? 1 - b.e : sm(b.u, 0, 1)) : 0;
  const billow = i === 2 && b.e === 0 ? 0.18 * (1 - b.u) : i === 1 ? 0.12 : 0;
  const creased = i < 3 ? 1 : i === 3 && b.e === 0 ? 1 - b.u : 0;
  const tucked = i < 4 ? 0 : i === 4 && b.e === 0 ? sm(b.u, 0.2, 0.9) : 1;
  const pillow = i < 6 || (i === 6 && b.e === 0) ? 'askew' : i < 8 ? 'hand' : 'set';
  const choco = i < 9 ? 'none' : i === 9 && b.e === 0 ? (b.u < 0.55 ? 'hand' : 'set') : 'set';
  const swan = i < 11 ? 'none' : i === 11 && b.e === 0 && b.u < 0.8 ? 'hand' : 'set';
  return { spot, spread, lift, billow, creased, tucked, pillow, choco, swan };
}
/** The hands now (in the frame given) for what's carried: the pillow, the chocolate, the swan. */
export const bedHands = (f: Frame, t: number, ph: number) => poseOf(MAKE_BED, f, t, ph);

// ---------------------------------------------------------------------------------------------
// The minibar restocked.

/** The minibar (1 × 1): stood at its front facing it; the fridge's top shelf (the work point), its door's hinge, the restock caddy, the slots filled. */
export const MINI = {
  stand: { x: 0, z: 0.54 },
  shelf: new THREE.Vector3(-0.23, 0.42, -0.08),
  hinge: { x: -0.43, z: 0.03 },
  door: 0.38,
  handleY: 0.48,
  caddy: [0.65, -0.12, 0.53] as const,
  slots: [[-0.12, 0.02, -0.04], [0.0, 0.02, -0.04], [0.12, 0.02, -0.04]] as const,
  card: [0.45, 0.415, 0.02] as const,
  tray: [0.41, 0.425, -0.16] as const,
};
const RESTOCK: Round = {
  seq: [['open', 1.2, 0.5], ['take', 0.5, 0.6], ['place0', 0.6, 0.6], ['take', 0.5, 0.6], ['place1', 0.6, 0.6], ['take', 0.5, 0.6], ['place2', 0.6, 0.6], ['close', 1.0, 0.6], ['check', 2.6, 0.6], ['tray', 2.0, 0.8]],
  yaw: fixed(Math.PI),
  key(key, f, u, t, s) {
    const handle = (a: number) => {
      const x = MINI.hinge.x + (MINI.door - 0.02) * Math.cos(a) - MINI.shelf.x;
      const z = MINI.hinge.z + 0.04 + (MINI.door - 0.02) * Math.sin(a) - MINI.shelf.z;
      return f.o(x, MINI.handleY - MINI.shelf.y, z);
    };
    const rest = f.bd(-0.16, 0.6, 0.18);
    switch (key) {
      case 'open':
        return hands({ l: handle(doorAngle('open', u, 0)), r: rest, crouch: 0.6, lean: 0.3, nod: 0.4, gl: 0.8, gr: 0.3, palms: 0.3 });
      case 'close':
        return hands({ l: handle(doorAngle('close', u, 0)), r: rest, crouch: 0.6, lean: 0.3, nod: 0.4, gl: 0.8, gr: 0.3, palms: 0.3 });
      case 'take':
        return hands({ l: handle(DOOR_OPEN), r: f.o(...MINI.caddy), crouch: 0.62, lean: 0.3, nod: 0.5, gl: 0.6, gr: 0.75, palms: 0.4 });
      case 'place0':
      case 'place1':
      case 'place2': {
        const [x, y, z] = MINI.slots[Number(key[5])];
        return hands({ l: handle(DOOR_OPEN), r: f.o(x, y + 0.05 - 0.04 * sm(u, 0.2, 0.6), z), crouch: 0.62, lean: 0.4, nod: 0.5, gl: 0.6, gr: 0.75, palms: 0.4 });
      }
      case 'check':
        return hands({ l: f.o(MINI.card[0] + 0.06, MINI.card[1], MINI.card[2] - 0.02), r: f.o(MINI.card[0] - 0.02 + 0.025 * wave(t, 2.2, s), MINI.card[1] + 0.012 + 0.006 * wave(t, 4.4, s), MINI.card[2] + 0.02 * wave(t, 1.1, s)), lean: 0.3, nod: 0.55, palms: 1.25, gl: 0.25, gr: 0.85 });
      default: {
        const w = 0.03 * wave(t, 0.5, s);
        return hands({ l: f.o(MINI.tray[0] - 0.12 + w, MINI.tray[1], MINI.tray[2]), r: f.o(MINI.tray[0] + 0.12 + w, MINI.tray[1], MINI.tray[2]), lean: 0.3, nod: 0.5, palms: 1.0, gl: 0.5, gr: 0.5 });
      }
    }
  },
};
const DOOR_OPEN = 1.7;
function doorAngle(key: string, u: number, e: number): number {
  if (key === 'open') return e > 0 ? DOOR_OPEN : DOOR_OPEN * sm(u, 0.2, 0.9);
  if (key === 'close') return e > 0 ? 0 : DOOR_OPEN * (1 - sm(u, 0.1, 0.8));
  return /^(take|place)/.test(key) ? DOOR_OPEN : 0;
}
/** The fridge door's swing now, how many drinks are in, and whether one's in the hand. */
export function minibarAt(t: number, ph: number): { door: number; placed: number; held: number | null } {
  const b = beatOf(RESTOCK.seq, t, ph);
  const door = doorAngle(b.from, b.u, b.e);
  let placed = 0;
  for (const [n, i] of [[1, 2], [2, 4], [3, 6]] as const) if (b.i > i || (b.i === i && (b.e > 0 || b.u > 0.55))) placed = n;
  const held = b.from === 'take' && b.e > 0 ? placed : /^place/.test(b.from) && b.e === 0 && b.u <= 0.55 ? placed : null;
  return { door, placed, held };
}
export const minibarHands = (f: Frame, t: number, ph: number) => poseOf(RESTOCK, f, t, ph);

// ---------------------------------------------------------------------------------------------
// Towels folded at the linen shelf and on the housekeeping cart.

/** The linen shelf (1 × 1): stood at its front; the folding ledge's middle (the work point); the clean-towel bin; the stack it's put on. */
export const LINEN = { stand: { x: 0, z: 0.62 }, ledge: new THREE.Vector3(0, 0.95, 0.2), bin: [0.6, -0.3, 0.2] as const, stack: [-0.25, 0.29, -0.25] as const };
/** The housekeeping cart (2 × 1): stood at its front; its top's middle front (the work point); the towel bag at its end; the stack on its top. */
export const HKC = { stand: { x: 0.2, z: 0.6 }, top: new THREE.Vector3(0.15, 0.93, 0.02), bin: [0.45, -0.1, 0.0] as const, stack: [-0.5, 0.0, -0.08] as const };
type FoldPlace = { bin: readonly [number, number, number]; stack: readonly [number, number, number] };
const foldRound = (at: FoldPlace): Round => ({
  seq: [['grab', 0.6, 0.6], ['shake', 1.4, 0.6], ['half', 1.1, 0.4], ['quarter', 1.0, 0.5], ['stack', 1.3, 0.5], ['pat', 0.9, 0.7]],
  yaw: fixed(Math.PI),
  key(key, f, u, t, s) {
    switch (key) {
      case 'grab':
        return hands({ l: f.o(-0.1, 0.02, 0.12), r: f.o(at.bin[0], at.bin[1], at.bin[2]), crouch: at.bin[1] < -0.2 ? 0.35 : 0.1, lean: 0.35, nod: 0.5, palms: 0.6, gl: 0.3, gr: 0.8 });
      case 'shake': {
        const flick = 0.05 * Math.max(0, wave(t, 1.6, s));
        return hands({ l: f.o(-0.26, 0.33 + flick, 0.16), r: f.o(0.26, 0.33 + flick, 0.16), lean: 0, nod: 0.1, palms: 0.3, gl: 0.85, gr: 0.85 });
      }
      case 'half': {
        const k = sm(u, 0.1, 0.9);
        const z = 0.17 - 0.17 * k;
        const y = 0.02 + 0.1 * Math.sin(Math.PI * k);
        return hands({ l: f.o(-0.22, y, z), r: f.o(0.22, y, z), lean: 0.35, nod: 0.55, palms: 1.2, gl: 0.7, gr: 0.7 });
      }
      case 'quarter': {
        const k = sm(u, 0.1, 0.9);
        return hands({ l: f.o(-0.12, 0.06, 0.05), r: f.o(0.2 - 0.22 * k, 0.06 + 0.1 * Math.sin(Math.PI * k), 0.05), lean: 0.35, nod: 0.55, palms: 1.2, gl: 0.4, gr: 0.7 });
      }
      case 'stack': {
        const k = sm(u, 0.2, 0.85);
        const [x, y, z] = at.stack;
        const p = (side: number) => f.o(side * 0.12 + x * k, 0.07 + (y + 0.05) * k + 0.1 * Math.sin(Math.PI * k), 0.05 + (z - 0.05) * k);
        return hands({ l: p(-1), r: p(1), lean: 0.25, nod: 0.35, palms: 0.8, gl: 0.7, gr: 0.7 });
      }
      default: {
        const [x, y, z] = at.stack;
        const pat = 0.02 * Math.max(0, wave(t, 2, s));
        return hands({ l: f.o(x - 0.08, y + 0.06 + pat, z), r: f.o(x + 0.08, y + 0.06 + pat, z), lean: 0.15, nod: 0.25, palms: 1.4, gl: 0.1, gr: 0.1 });
      }
    }
  },
});
const FOLD_LINEN = foldRound(LINEN);
const FOLD_CART = foldRound(HKC);
/** The towel now: in the bin, balled up in the hand, held up open, laid flat and folded (in half, in four), carried, on the stack. */
export interface TowelAt {
  show: 'bin' | 'ball' | 'open' | 'flat' | 'block' | 'stacked';
  half: number;
  quarter: number;
  hands: Hands;
}
export function towelAt(cart: boolean, f: Frame, t: number, ph: number): TowelAt {
  const R = cart ? FOLD_CART : FOLD_LINEN;
  const b = beatOf(R.seq, t, ph);
  const h = poseOf(R, f, t, ph);
  const at = (show: TowelAt['show'], half = 0, quarter = 0): TowelAt => ({ show, half, quarter, hands: h });
  switch (b.from) {
    case 'grab':
      return b.e > 0 ? at('ball') : at('bin');
    case 'shake':
      return b.e > 0.5 ? at('flat') : at('open');
    case 'half':
      return at('flat', b.e > 0 ? 1 : sm(b.u, 0.1, 0.9));
    case 'quarter':
      return at('flat', 1, b.e > 0 ? 1 : sm(b.u, 0.1, 0.9));
    case 'stack':
      return b.e > 0 || b.u > 0.85 ? at('stacked', 1, 1) : at('block', 1, 1);
    default:
      return at('stacked', 1, 1);
  }
}

// ---------------------------------------------------------------------------------------------
// The breakfast buffet: a chafing dish's lid rolled back, the food set straight with tongs.

/** The buffet (2 × 1): stood at its front by the first chafing dish; the dish's lid handle closed (the work point), its pivot. */
export const BUF = { stand: { x: -0.35, z: 0.68 }, handle: new THREE.Vector3(-0.55, 1.08, 0.12), pivot: { y: 0.98, z: -0.17 }, open: 1.9, card: [0, -0.15, 0.12] as const };
/** The lid's handle at a lid's swing `a`, offset from the closed handle. */
function lidHandle(a: number): [number, number, number] {
  const ry = BUF.handle.y - BUF.pivot.y;
  const rz = BUF.handle.z - BUF.pivot.z;
  const y = ry * Math.cos(-a) - rz * Math.sin(-a);
  const z = ry * Math.sin(-a) + rz * Math.cos(-a);
  return [0, y - ry, z - rz];
}
function lidAngle(key: string, u: number, e: number): number {
  if (key === 'lid') return e > 0 ? BUF.open : BUF.open * sm(u, 0.15, 0.85);
  if (key === 'tongs') return BUF.open;
  if (key === 'close') return e > 0 ? 0 : BUF.open * (1 - sm(u, 0.1, 0.85));
  return 0;
}
const BUFFET: Round = {
  seq: [['lid', 1.4, 0.5], ['tongs', 3.0, 0.5], ['close', 1.0, 0.6], ['card', 1.4, 0.6], ['wipe', 3.0, 0.8]],
  yaw: fixed(Math.PI),
  key(key, f, u, t, s) {
    const rest = f.bd(-0.18, 0.86, 0.22);
    switch (key) {
      case 'lid':
      case 'close': {
        // Pushed back as far as it goes with the hand on its handle; past that it rolls on by itself.
        const a = lidAngle(key, u, 0);
        const held = f.o(...lidHandle(Math.min(a, 1.0)));
        const k = sm(a, 1.0, 1.4);
        return hands({ l: held.lerp(f.o(-0.12, -0.17, 0.08), k), r: rest, lean: 0.25 + 0.1 * (1 - k), nod: 0.45, palms: 0.8, gl: 0.75 * (1 - k) + 0.3 * k, gr: 0.3 });
      }
      case 'tongs':
        return hands({ l: f.o(-0.12, -0.17, 0.08), r: f.o(0.05 + 0.04 * wave(t, 0.8, s), -0.1 + 0.015 * Math.max(0, wave(t, 1.6, s)), -0.12 + 0.03 * wave(t, 0.5, s)), lean: 0.4, nod: 0.55, palms: 0.9, gl: 0.75, gr: 0.85 });
      case 'card':
        return hands({ l: f.o(BUF.card[0] - 0.04, BUF.card[1], BUF.card[2]), r: f.o(BUF.card[0] + 0.04, BUF.card[1], BUF.card[2]), lean: 0.3, nod: 0.5, palms: 0.8, gl: 0.5, gr: 0.5 });
      default: {
        const x = 0.2 - 0.42 * (0.5 + 0.5 * wave(t, 0.5, s));
        return hands({ l: f.o(-0.22, -0.18, 0.1), r: f.o(x, -0.185, 0.1), lean: 0.35, nod: 0.5, palms: 1.5, gl: 0.3, gr: 0.4 });
      }
    }
  },
};
export function buffetAt(t: number, ph: number): { lid: number; tongs: boolean; cloth: boolean } {
  const b = beatOf(BUFFET.seq, t, ph);
  return { lid: lidAngle(b.from, b.u, b.e), tongs: b.from === 'tongs' || (b.from === 'lid' && b.e > 0.5), cloth: b.from === 'wipe' || (b.from === 'card' && b.e > 0.5) };
}
export const buffetHands = (f: Frame, t: number, ph: number) => poseOf(BUFFET, f, t, ph);

// ---------------------------------------------------------------------------------------------
// The elevator hall: the lift called, the guest shown in.

/** The elevator bank (2 × 1): stood by the call buttons, turned to the left-hand car; the up button (the work point). */
export const LIFT = { stand: { x: 0.08, z: 0.14, yaw: -Math.PI / 2 }, button: new THREE.Vector3(0, 1.1, -0.34) };
const ESCORT: Round = {
  seq: [['press', 1.2, 0.6], ['wait', 3.2, 0.6], ['invite', 3.6, 0.6], ['bow', 1.8, 0.8], ['wait', 1.5]],
  yaw: fixed(LIFT.stand.yaw),
  key(key, f, u, t, s) {
    switch (key) {
      case 'press': {
        const poke = 0.015 * Math.max(0, wave(t, 1.2, s)) ** 2;
        return hands({ ...gongsu(f), r: f.o(0, 0, 0.035 - poke), lean: 0.06, nod: 0.05, palms: 0.2, gr: 0.6 });
      }
      case 'invite':
        return hands({ ...gongsu(f), r: f.o(-0.38, -0.1 + 0.02 * wave(t, 0.5, s), 0.22), lean: 0.12, nod: 0.05, palms: -0.9, gr: 0.1 });
      case 'bow':
        return bow(f, u);
      default:
        return gongsu(f);
    }
  },
};
/** The doors (0 shut – 1 open), the floor the car's at, the guest (where, from the doors' line out, and whether they're there). */
export function liftAt(t: number, ph: number): { open: number; floor: number; guest: number | null } {
  const b = beatOf(ESCORT.seq, t, ph);
  const open = b.i === 2 ? (b.e > 0 ? 1 : sm(b.u, 0, 0.22)) : b.i === 3 ? (b.e > 0 ? 0 : 1 - sm(b.u, 0.15, 0.9)) : 0;
  const floor = b.i === 0 ? 7 : b.i === 1 ? Math.max(1, 7 - Math.floor((b.e > 0 ? 1 : b.u) * 7)) : b.i === 4 ? 1 + Math.min(4, Math.floor(b.u * 4)) : b.i === 3 && b.e > 0 ? 1 : 1;
  const guest = b.i === 1 ? 0.7 : b.i === 2 && b.e === 0 && b.u < 0.82 ? 0.7 - 0.95 * sm(b.u, 0.4, 0.82) : null;
  return { open, floor, guest };
}

// ---------------------------------------------------------------------------------------------
// The lobby lounge: a welcome tea brought on a tray.

/** The lounge sofa (2 × 1): stood before its right arm, the arm's tray the cup's set on. */
export const LOUNGE = { tea: { x: 0.55, z: 0.62 }, armTray: [-0.31, 0.68, 0.57] as const };
const WELCOME_TEA: Round = {
  seq: [['carry', 1.2, 0.6], ['offer', 1.6, 0.6], ['set', 1.4, 0.6], ['talk', 4.0, 0.6], ['bow', 1.4, 0.8]],
  yaw: fixed(Math.PI),
  key(key, f, u, t, s) {
    switch (key) {
      case 'carry':
        return hands({ l: f.bd(0.12, 0.95, 0.32), r: f.bd(-0.12, 0.95, 0.32), lean: 0.05, nod: 0.2, palms: -1.1, gl: 0.3, gr: 0.3 });
      case 'offer':
        return hands({ l: f.bd(0.12, 0.9, 0.45), r: f.bd(-0.12, 0.9, 0.45), lean: 0.25, nod: 0.3, palms: -1.1, gl: 0.3, gr: 0.3 });
      case 'set':
        return hands({ l: f.bd(0.18, 0.92, 0.3), r: f.bd(...LOUNGE.armTray), crouch: 0.2, lean: 0.35, nod: 0.5, palms: 0.4, gl: 0.3, gr: 0.7 });
      case 'talk':
        return hands({ l: f.bd(0.16, 0.9, 0.25), r: f.bd(-0.15, 1.05 + 0.03 * wave(t, 0.6, s), 0.32), lean: 0.06, nod: 0.02, palms: -0.6, gl: 0.3, gr: 0.15 });
      default:
        return { ...bow(f, u, 0.3), l: f.bd(0.16, 0.9, 0.22), palms: -0.6 };
    }
  },
};
/** Where the welcome tea's cup is: on the tray, in the hand, on the arm. */
export function teaAt(f: Frame, t: number, ph: number): { cup: 'tray' | 'hand' | 'arm'; hands: Hands } {
  const b = beatOf(WELCOME_TEA.seq, t, ph);
  const h = poseOf(WELCOME_TEA, f, t, ph);
  const cup = b.from === 'offer' && b.e > 0 ? 'hand' : b.from === 'set' ? (b.e > 0 || b.u > 0.65 ? 'arm' : 'hand') : b.from === 'talk' || b.from === 'bow' ? 'arm' : 'tray';
  return { cup, hands: h };
}
export const lobbyHands = (m: 'checkIn' | 'concierge' | 'tagBag', f: Frame, t: number, ph: number) => poseOf(ROUNDS[m], f, t, ph);

// ---------------------------------------------------------------------------------------------

const ROUNDS: Record<HotelMotion, Round> = {
  checkIn: CHECK_IN,
  frontPhone: FRONT_PHONE,
  concierge: CONCIERGE,
  tagBag: TAG,
  wheelCart: WHEEL,
  makeBed: MAKE_BED,
  restock: RESTOCK,
  foldLinen: FOLD_LINEN,
  foldCart: FOLD_CART,
  buffet: BUFFET,
  escort: ESCORT,
  welcomeTea: WELCOME_TEA,
};
function poseOf(R: Round, f: Frame, t: number, ph: number): Hands {
  const b = beatOf(R.seq, t, ph);
  const s = ph * 7.1;
  const a = R.key(b.from, f, b.e > 0 ? 1 : b.u, t, s);
  return b.e > 0 ? mix(a, R.key(b.to, f, 0, t, s), b.e) : a;
}
/** The spot's turn in the piece's frame now (the bell captain turns to the case and back). */
export const hotelSpotYaw = (m: HotelMotion, t: number, ph: number) => ROUNDS[m].yaw(beatOf(ROUNDS[m].seq, t, ph));
/** Whether the one making the bed is walking round it now (their hands left to swing). */
export const bedWalking = (t: number, ph: number) => WALKING.has(beatOf(MAKE_BED.seq, t, ph).from);

export function hotelDoing(m: HotelMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const R = ROUNDS[m];
  const p = work?.point ?? b.base.clone().add(new THREE.Vector3(Math.sin(b.yaw) * 0.35, 0.9, Math.cos(b.yaw) * 0.35));
  const ph = hotelPhase(p);
  if (m === 'makeBed' && bedWalking(t, ph)) return {};
  const f = frameAt(p, b.yaw - R.yaw(beatOf(R.seq, t, ph)), b.base, b.yaw, b.height);
  const h = poseOf(R, f, t, ph);
  return { reach: { l: h.l, r: h.r, lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap }, crouch: h.crouch || undefined };
}
