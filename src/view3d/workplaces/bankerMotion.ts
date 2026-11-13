import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';
import { beatOf, frameAt, sm, wave, type Beat, type Frame, type V } from './busDriverMotion';

/*
 * A 은행원's work at the 은행 지점 (2026-10-27, the workplace pipeline, at the user's request: the work
 * should look like the work). Each motion is a round of beats, held a while and eased into the next,
 * by the same clock (bkPhase of the spot's work mark) as the piece it's done at, so what the piece
 * shows — the passbook in the printer, the bills running through the counter, the stamp coming down,
 * the vault door swinging out — is drawn there in step (workplaces/banker.ts):
 *
 * - bkTeller (the 창구, sat behind the window): the next number called (the display over the window
 *   goes up, 딩동), the customer's passbook and slip taken from the tray, the passbook fed through the
 *   통장 프린터, the keys, the slip stamped (inked first), the cash drawer pulled, the bills counted in
 *   the fingers, passbook and cash put back in the tray with an open hand to the customer.
 * - bkOpen (the 창구, a new account for the customer sat at it): the 신분증 and 신청서 taken from the
 *   tray, the keys, the signature pad turned to them (they sign), a new passbook printed, stamped, given.
 * - bkCount (the 창구, 시재 맞추기): a brick of notes from the drawer into the 지폐 계수기's hopper, the
 *   machine run (the count climbing to 100), the stack taken out of its pocket and banded with a 띠지,
 *   put on the pile, the 시재표 written up.
 * - bkConsult (a customer across the counter or the desk): the rate sheet turned round and pushed to
 *   them, a pen down its lines, the calculator, an open hand as it's explained, the line to sign shown.
 * - bkReview (the 여신 심사 desk): the application leafed through, a finger down a page, the calculator,
 *   the 도장 pressed into the 인주 and onto 승인, the paper turned round to the applicant, notes written.
 * - bkVault (the 금고): the spoked wheel spun, a step aside and the round door pulled (it swings out on
 *   its hinge by its own weight), the cash shelves counted off on a clipboard, a 대여금고 box drawn out
 *   and pushed home, signed for, the door swung shut and the wheel spun back.
 * - bkTrade (the 금융 단말기): the mouse across the charts, the keys, a hand up to the top screen, the
 *   handset to the ear (the other hand jotting), and back.
 *
 * Kept out of activity.ts (which only hands these motions over) so it imports nothing from it at run
 * time. Points are given in the piece's own frame (x across as you face its front, y up, z out of its
 * front), placed by `o` against the spot's work mark.
 */
export type BkMotion = 'bkTeller' | 'bkOpen' | 'bkCount' | 'bkConsult' | 'bkReview' | 'bkVault' | 'bkTrade';
export const BK_MOTIONS = new Set<string>(['bkTeller', 'bkOpen', 'bkCount', 'bkConsult', 'bkReview', 'bkVault', 'bkTrade']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The clock offset: from where the spot's work mark is (across the floor only), so two windows aren't in step. */
export const bkPhase = (p: THREE.Vector3) => frac(p.x * 0.417 + p.z * 0.583);
type Seq = Array<[string, number, number?]>;

/** In beat `k` (held, or easing on into the next while still mostly in it). */
export const inBeat = (b: Beat, k: string) => (b.from === k && b.e < 0.5) || (b.to === k && b.e >= 0.5);
/** Done with beat `k` this round. */
const pastBeat = (seq: Seq, b: Beat, k: string) => {
  const i = seq.findIndex(([key]) => key === k);
  return b.i > i || (b.i === i && b.e > 0);
};
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
/** A thing's place blended across a beat change: lerped where it's somewhere in both, else where it is in the nearer. */
function blend(a: V | null, b: V | null, e: number): V | null {
  if (a && b) return lerpV(a, b, e);
  return e < 0.5 ? a : b;
}

// ---------------------------------------------------------------------------------------------
// Hands.

interface Hands {
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
const hands = (h: Partial<Hands>): Hands => ({ lean: 0.15, nod: 0.3, palms: 0.8, gl: 0.3, gr: 0.3, crouch: 0, ...h });
function mixV(a: THREE.Vector3 | undefined, b: THREE.Vector3 | undefined, e: number): THREE.Vector3 | undefined {
  if (a && b) return a.clone().lerp(b, e);
  return e < 0.5 ? a : b;
}
function mix(a: Hands, b: Hands, e: number): Hands {
  if (e <= 0) return a;
  return {
    l: mixV(a.l, b.l, e),
    r: mixV(a.r, b.r, e),
    lean: mixN(a.lean, b.lean, e),
    nod: mixN(a.nod, b.nod, e),
    palms: mixN(a.palms, b.palms, e),
    gl: mixN(a.gl, b.gl, e),
    gr: mixN(a.gr, b.gr, e),
    crouch: mixN(a.crouch, b.crouch, e),
    tap: e < 0.5 ? a.tap : b.tap,
  };
}
type KeyFn = (key: string, f: Frame, u: number, t: number, n: number) => Hands;
/** The hands through a round: each beat's pose, eased from one into the next. */
function round(seq: Seq, key: KeyFn, f: Frame, t: number, ph: number): Hands {
  const b = beatOf(seq, t, ph);
  const a = key(b.from, f, b.u, t, b.n);
  if (b.e <= 0) return a;
  return mix(a, key(b.to, f, 0, t, b.n), b.e);
}
const o = (f: Frame, p: V) => f.o(p[0], p[1], p[2]);

// =============================================================================================
// The 창구 (tellerWindow, 1 × 1, turned so its front faces the staff side): the counter runs across
// the tile, the customer's side (their ledge, the acrylic screen, the tray through under it) at -z,
// the teller's desk at +z and their chair out over the front edge. The teller's left is -x.

export const TW = {
  top: 0.76,
  /** The teller's seat (its top's middle), facing in (-z). */
  seat: [0, 0.48, 0.55] as V,
  /** The acrylic screen's plane, and the customer's ledge's front edge. */
  screenZ: -0.2,
  front: -0.45,
  keys: [-0.1, 0.79, 0.08] as V,
  /** The 통장 프린터's slot (its mouth, on the printer's front). */
  slot: [0.32, 0.85, 0.07] as V,
  hopper: [-0.4, 1.0, -0.05] as V,
  pocket: [-0.4, 0.85, 0.1] as V,
  /** The cash drawer's handle shut, and how far it comes out. */
  drawer: [0.25, 0.69, 0.27] as V,
  drawerOut: 0.2,
  /** The tray through under the screen. */
  tray: [0.02, 0.79, -0.17] as V,
  call: [0.0, 0.8, 0.2] as V,
  /** Where the passbook lies open while it's dealt with, the slip that's stamped, the 인주. */
  book: [0.17, 0.795, 0.15] as V,
  slip: [0.33, 0.79, 0.17] as V,
  ink: [0.44, 0.8, 0.1] as V,
  /** Bills held up and counted in the fingers. */
  count: [0.0, 0.94, 0.25] as V,
  band: [-0.12, 0.9, 0.24] as V,
  stack: [-0.18, 0.8, 0.17] as V,
  ledger: [-0.32, 0.79, 0.18] as V,
  /** The signature pad, on the customer's ledge. */
  pad: [0.3, 0.8, -0.33] as V,
};

const TELLER_SEQ: Seq = [['call', 1.0], ['take', 1.6], ['print', 2.4], ['type', 2.4], ['stamp', 1.6], ['drawer', 1.4], ['count', 2.0], ['give', 1.8]];
const OPEN_SEQ: Seq = [['take', 1.6], ['type', 2.6], ['pad', 2.6], ['print', 2.6], ['stamp', 1.6], ['give', 1.8]];

/** What's on the counter at a teller's beat (each place in the window's frame), and how the machines stand. */
export interface TellerNow {
  b: Beat;
  /** The passbook (open on the desk or shut), the bills, the 신분증 (a new account). */
  book: V | null;
  bookOpen: boolean;
  bills: V | null;
  card: V | null;
  /** The stamp in the hand (else on its pad), and whether the slip's been stamped this round. */
  stamp: V | null;
  stamped: boolean;
  /** The slip on the desk (from when it's taken till it's given back). */
  slip: boolean;
  drawer: number;
  printing: boolean;
  /** The number called (counts up each round), and whether it's just been. */
  called: number;
  calling: boolean;
  /** How far the customer's signature is written on the pad (0–1). */
  sign: number;
}
const stampAt = (u: number): V => {
  // Pressed into the 인주 first, then down twice on the slip.
  if (u < 0.3) return add(TW.ink, 0, 0.012 + 0.05 * (1 - Math.abs(wave(u, 3.3))), 0);
  const k = (u - 0.3) / 0.7;
  return add(TW.slip, 0, 0.012 + 0.07 * Math.abs(Math.sin(k * Math.PI * 2)), 0);
};
const ioPrint = (u: number) => sm(u, 0.05, 0.25) * (1 - sm(u, 0.78, 0.95));
function tellerKey(open: boolean, key: string, u: number): Omit<TellerNow, 'b' | 'stamped' | 'called' | 'calling' | 'slip'> {
  const none = { book: null, bookOpen: false, bills: null, card: null, stamp: null, drawer: 0, printing: false, sign: 0 };
  const onDesk = add(TW.book, 0, 0, 0);
  switch (key) {
    case 'call':
      return { ...none };
    case 'take':
      return open ? { ...none, card: add(TW.tray, 0.08, 0.004, 0.01) } : { ...none, book: TW.tray };
    case 'print': {
      const io = ioPrint(u);
      return { ...none, card: open ? add(TW.keys, -0.25, 0.0, 0.1) : null, book: add(TW.slot, 0, 0, 0.06 - 0.13 * io), printing: io > 0.6 };
    }
    case 'type':
      return { ...none, book: open ? null : onDesk, bookOpen: true, card: open ? add(TW.keys, -0.25, 0.0, 0.1) : null };
    case 'pad':
      return { ...none, card: add(TW.keys, -0.25, 0.0, 0.1), sign: sm(u, 0.35, 0.9) };
    case 'stamp':
      return { ...none, book: onDesk, bookOpen: true, stamp: stampAt(u), card: open ? add(TW.keys, -0.25, 0.0, 0.1) : null };
    case 'drawer':
      return { ...none, book: onDesk, bookOpen: true, drawer: sm(u, 0.0, 0.45), bills: u > 0.55 ? add(TW.drawer, 0, 0.03, TW.drawerOut) : null };
    case 'count':
      return { ...none, book: onDesk, bookOpen: true, drawer: 1, bills: TW.count };
    case 'give': {
      const there = sm(u, 0, 0.45);
      return { ...none, book: lerpV(onDesk, TW.tray, there), drawer: 1 - sm(u, 0.4, 0.8), bills: open ? null : lerpV(TW.count, add(TW.tray, -0.06, 0.012, 0), there), card: open ? add(TW.tray, 0.1, 0.004, 0.01) : null };
    }
  }
  return none;
}
export function tellerAt(m: 'bkTeller' | 'bkOpen', t: number, ph: number): TellerNow {
  const open = m === 'bkOpen';
  const seq = open ? OPEN_SEQ : TELLER_SEQ;
  const b = beatOf(seq, t, ph);
  const a = tellerKey(open, b.from, b.u);
  const c = b.e > 0 ? tellerKey(open, b.to, 0) : a;
  const e = b.e;
  return {
    b,
    book: blend(a.book, c.book, e),
    bookOpen: e < 0.5 ? a.bookOpen : c.bookOpen,
    bills: blend(a.bills, c.bills, e),
    card: blend(a.card, c.card, e),
    stamp: e < 0.5 ? a.stamp : c.stamp,
    stamped: pastBeat(seq, b, 'stamp'),
    slip: !inBeat(b, 'call') && !(inBeat(b, 'take') && b.u < 0.5),
    drawer: mixN(a.drawer, c.drawer, e),
    printing: a.printing,
    called: b.n,
    calling: inBeat(b, 'call'),
    sign: open ? Math.max(a.sign, inBeat(b, 'print') || inBeat(b, 'stamp') || inBeat(b, 'give') ? 1 : 0) : 0,
  };
}
const tellerKeyFn =
  (open: boolean): KeyFn =>
  (key, f, u, t) => {
    const s = tellerKey(open, key, u);
    const keyL = o(f, add(TW.keys, -0.12, 0, 0));
    const keyR = o(f, add(TW.keys, 0.12, 0, 0));
    switch (key) {
      case 'call': {
        const press = Math.max(0, Math.sin(Math.min(1, u * 1.4) * Math.PI));
        return hands({ l: keyL, r: o(f, add(TW.call, 0, 0.03 * (1 - press), 0)), palms: 1.3, gr: 0.2, nod: 0.35, lean: 0.2 });
      }
      case 'take': {
        const p = s.card ?? s.book ?? TW.tray;
        return hands({ l: o(f, add(p, -0.06, 0.02, 0)), r: o(f, add(p, 0.06, 0.02, 0)), palms: 0.9, gl: 0.6, gr: 0.6, lean: 0.45, nod: 0.4 });
      }
      case 'print': {
        const p = s.book ?? TW.slot;
        return hands({ l: o(f, add(p, -0.07, 0.0, 0.04)), r: o(f, add(p, 0.05, 0.0, 0.05)), palms: 1.0, gl: 0.55, gr: 0.55, lean: 0.3, nod: 0.35 });
      }
      case 'type':
        return hands({ l: keyL.setY(keyL.y + 0.015 * Math.max(0, wave(t, 6.5))), r: keyR.setY(keyR.y + 0.015 * Math.max(0, wave(t, 6.5, 0.5))), palms: 1.45, lean: 0.22, nod: 0.05, tap: true });
      case 'pad': {
        // The pad turned round to the customer and a finger to the line; back to the keys while they sign.
        const show = u < 0.4;
        return hands({ l: keyL, r: show ? o(f, add(TW.pad, 0, 0.03, 0.06)) : keyR, palms: show ? 0.4 : 1.45, gr: show ? 0.15 : 0.35, lean: show ? 0.42 : 0.2, nod: show ? 0.3 : 0.05, tap: !show });
      }
      case 'stamp': {
        const st = s.stamp!;
        return hands({ l: o(f, add(TW.slip, -0.12, 0.01, 0)), r: o(f, add(st, 0, 0.06, 0)), palms: 0.3, gl: 0.1, gr: 0.95, lean: 0.25, nod: 0.45 });
      }
      case 'drawer': {
        const h = o(f, add(TW.drawer, 0, 0, TW.drawerOut * s.drawer));
        return hands({ l: keyL, r: h, palms: 0.2, gr: 0.85, lean: 0.25, nod: 0.55 });
      }
      case 'count': {
        // Fanned in the left hand, flicked off by the right thumb.
        const flick = wave(t, 3.2);
        return hands({ l: o(f, add(TW.count, -0.05, 0, 0)), r: o(f, add(TW.count, 0.05 + 0.02 * flick, 0.012 * flick, 0.01)), palms: 0.6, gl: 0.75, gr: 0.5, lean: 0.12, nod: 0.5 });
      }
      case 'give': {
        // Put in the tray, then an open hand towards the customer.
        if (u < 0.55) {
          const p = s.book ?? TW.tray;
          return hands({ l: o(f, add(p, -0.06, 0.02, 0)), r: o(f, add(p, 0.08, 0.02, 0)), palms: 0.8, gl: 0.6, gr: 0.6, lean: 0.45, nod: 0.35 });
        }
        return hands({ l: keyL, r: o(f, add(TW.tray, 0.12, 0.12, 0.08)), palms: -0.3, gr: 0.05, lean: 0.25, nod: 0.0 });
      }
    }
    return hands({ l: keyL, r: keyR });
  };

// =============================================================================================
// The 지폐 계수기 on the same counter (시재 맞추기).

const COUNT_SEQ: Seq = [['drawer', 1.4], ['load', 1.2], ['run', 2.8], ['out', 1.2], ['band', 1.8], ['stack', 1.0], ['note', 2.2]];
export interface CountNow {
  b: Beat;
  /** The brick of notes (where it's held or lies), what's left of it in the hopper and what's come through to the pocket (0–1). */
  brick: V | null;
  hopper: number;
  pocket: number;
  /** The count on the machine's LED, the band round the stack, the drawer, how many bundles on the pile. */
  count: number;
  banded: boolean;
  drawer: number;
  pile: number;
  running: boolean;
}
export function countAt(t: number, ph: number): CountNow {
  const b = beatOf(COUNT_SEQ, t, ph);
  const k = b.e < 0.5 ? b.from : b.to;
  const u = b.e < 0.5 ? b.u : 0;
  const drawerOpen = (key: string, uu: number) => (key === 'drawer' ? sm(uu, 0, 0.45) : key === 'load' ? 1 - sm(uu, 0.5, 1) : 0);
  const brickAt = (key: string, uu: number): V | null => {
    switch (key) {
      case 'drawer':
        return uu > 0.5 ? add(TW.drawer, 0, 0.03, TW.drawerOut) : null;
      case 'load':
        return lerpV(add(TW.drawer, 0, 0.1, TW.drawerOut), TW.hopper, sm(uu, 0, 0.6));
      case 'out':
        return lerpV(TW.pocket, add(TW.pocket, 0.08, 0.06, 0.08), sm(uu, 0.3, 1));
      case 'band':
        return TW.band;
      case 'stack':
        return lerpV(TW.band, TW.stack, sm(uu, 0, 0.7));
    }
    return null;
  };
  const run = k === 'run' ? sm(u, 0.05, 0.95) : pastBeat(COUNT_SEQ, b, 'run') && k !== 'drawer' && k !== 'load' ? 1 : 0;
  const stacked = pastBeat(COUNT_SEQ, b, 'stack');
  return {
    b,
    brick: blend(brickAt(b.from, b.u), b.e > 0 ? brickAt(b.to, 0) : null, b.e),
    hopper: k === 'load' ? (u > 0.6 ? 1 : 0) : k === 'run' ? 1 - run : 0,
    pocket: k === 'run' ? run : k === 'out' && u < 0.3 ? 1 : 0,
    count: Math.round(run * 100),
    banded: (k === 'band' && u > 0.6) || k === 'stack',
    drawer: mixN(drawerOpen(b.from, b.u), drawerOpen(b.to, 0), b.e),
    pile: 1 + (b.n % 4) + (stacked ? 1 : 0),
    running: k === 'run',
  };
}
const countKey: KeyFn = (key, f, u, t) => {
  const keyL = o(f, add(TW.keys, -0.12, 0, 0));
  switch (key) {
    case 'drawer':
      return hands({ l: keyL, r: o(f, add(TW.drawer, 0, 0, TW.drawerOut * sm(u, 0, 0.45))), palms: 0.2, gr: 0.85, lean: 0.25, nod: 0.55 });
    case 'load': {
      const p = lerpV(add(TW.drawer, 0, 0.1, TW.drawerOut), TW.hopper, sm(u, 0, 0.6));
      return hands({ l: o(f, add(p, -0.06, 0.02, 0)), r: o(f, add(p, 0.06, 0.02, 0)), palms: 0.8, gl: 0.65, gr: 0.65, lean: 0.3, nod: 0.35 });
    }
    case 'run':
      // Hands resting by the machine, watching the count.
      return hands({ l: o(f, add(TW.pocket, -0.12, -0.04, 0.04)), r: o(f, add(TW.pocket, 0.14, -0.05, 0.06)), palms: 1.2, lean: 0.2, nod: 0.45 + 0.05 * wave(t, 0.7) });
    case 'out': {
      const p = lerpV(TW.pocket, add(TW.pocket, 0.08, 0.06, 0.08), sm(u, 0.3, 1));
      return hands({ l: o(f, add(p, -0.05, 0.02, 0)), r: o(f, add(p, 0.05, 0.02, 0)), palms: 0.9, gl: 0.6, gr: 0.6, lean: 0.3, nod: 0.4 });
    }
    case 'band': {
      // The 띠지 wound round: the right hand circling the stack held in the left.
      const a = u * Math.PI * 4;
      return hands({ l: o(f, add(TW.band, -0.05, 0, 0)), r: o(f, add(TW.band, 0.04 + 0.03 * Math.cos(a), 0.03 * Math.sin(a), 0.01)), palms: 0.5, gl: 0.75, gr: 0.5, lean: 0.15, nod: 0.5 });
    }
    case 'stack': {
      const p = lerpV(TW.band, TW.stack, sm(u, 0, 0.7));
      return hands({ l: o(f, add(p, -0.05, 0.02, 0)), r: o(f, add(p, 0.05, 0.02, 0)), palms: 0.9, gl: 0.6, gr: 0.6, lean: 0.25, nod: 0.45 });
    }
    case 'note': {
      const p = o(f, TW.ledger);
      return hands({ l: o(f, add(TW.ledger, -0.1, 0, 0.0)), r: p.add(new THREE.Vector3(0.03 * wave(t, 0.8), 0.006 * wave(t, 6), 0.012 * wave(t, 1.9))), palms: 1.25, gl: 0.2, gr: 0.85, lean: 0.3, nod: 0.5 });
    }
  }
  return hands({ l: keyL });
};

// =============================================================================================
// A word across the counter or the desk (loanConsult, vipBanking): what's shown is at the work mark,
// the calculator to the right of it (+x), the line to sign at the customer's edge (-z).

const CONSULT_SEQ: Seq = [['show', 2.4], ['point', 2.6], ['calc', 2.0], ['talk', 2.8], ['sign', 2.2]];
export const CONSULT = { calc: [0.3, 0.0, 0.12] as V, sign: [0.0, 0.0, -0.13] as V };
export interface ConsultNow {
  b: Beat;
  /** How far the sheet's turned round to them (0–1), the calculator's keys being pressed. */
  turned: number;
  calc: boolean;
}
export function consultAt(t: number, ph: number): ConsultNow {
  const b = beatOf(CONSULT_SEQ, t, ph);
  // Turned round to them as it's shown, and back again once they've signed.
  const turned = b.from === 'show' && b.e === 0 ? sm(b.u, 0.1, 0.5) : b.from === 'sign' ? 1 - sm(b.u, 0.75, 1) : 1;
  return { b, turned, calc: inBeat(b, 'calc') };
}
const consultKey: KeyFn = (key, f, u, t) => {
  const p = f.o(0, 0, 0);
  const rest = hands({ l: f.o(-0.14, 0, 0.12), r: f.o(0.14, 0, 0.12), palms: 1.2, lean: 0.18, nod: 0.25 });
  switch (key) {
    case 'show': {
      // Turned round and slid across to them.
      const push = sm(u, 0.1, 0.6);
      return hands({ l: f.o(-0.08, 0.01, 0.06 - 0.12 * push), r: f.o(0.08, 0.01, 0.06 - 0.12 * push), palms: 1.0, gl: 0.3, gr: 0.3, lean: 0.35, nod: 0.4 });
    }
    case 'point': {
      // A pen down the lines, the left hand flat on the sheet.
      const line = Math.floor(u * 4) / 4;
      return hands({ l: f.o(-0.1, 0.005, -0.04), r: f.o(0.04 - 0.08 * frac(u * 4), 0.02 + 0.01 * Math.max(0, wave(t, 1.6)), -0.02 - 0.1 * line), palms: 1.0, gl: 0.1, gr: 0.9, lean: 0.4, nod: 0.5 });
    }
    case 'calc': {
      const c = CONSULT.calc;
      return hands({ l: f.o(-0.1, 0.005, -0.04), r: f.o(c[0] + 0.02 * wave(t, 2.1), c[1] + 0.02 + 0.012 * Math.max(0, wave(t, 5)), c[2]), palms: 1.4, gr: 0.3, lean: 0.25, nod: 0.45, tap: true });
    }
    case 'talk': {
      // An open hand to them as it's explained, the other on the desk.
      const g = 0.5 + 0.5 * wave(t, 0.45);
      return hands({ l: f.o(-0.16, 0.005, 0.1), r: f.bd(-0.16 * f.k, 0.0, 0).lerp(p.clone().setY(p.y + 0.18), 0.6).addScaledVector(f.fwd, 0.04 * g), palms: -0.3 * g, gr: 0.05, lean: 0.1, nod: 0.05 + 0.06 * wave(t, 0.9) });
    }
    case 'sign': {
      const s = CONSULT.sign;
      return hands({ l: f.o(-0.1, 0.005, 0.0), r: f.o(s[0] + 0.03, s[1] + 0.02, s[2]), palms: 0.6, gr: 0.4, lean: 0.45, nod: 0.45 });
    }
  }
  return rest;
};

// =============================================================================================
// The 여신 심사 desk (loanDesk, 1 × 1): the officer sat at its front facing in, the applicant's chair
// across at the back; the application file open in the middle, the calculator at the officer's
// right (+x), the 인주 and 도장 beyond it, the keyboard to the left.

export const LD = {
  top: 0.74,
  seat: [0, 0.48, 0.56] as V,
  file: [0.0, 0.765, 0.06] as V,
  calc: [0.3, 0.77, 0.12] as V,
  ink: [0.34, 0.77, -0.08] as V,
  /** The 승인 box on the page that's stamped. */
  approve: [0.16, 0.775, 0.16] as V,
  /** The application turned round and slid to the applicant. */
  across: [0.0, 0.765, -0.2] as V,
  keys: [-0.24, 0.765, 0.12] as V,
};
const REVIEW_SEQ: Seq = [['leaf', 3.0], ['read', 2.4], ['calc', 1.8], ['stamp', 1.8], ['turn', 2.2], ['write', 2.4]];
export interface ReviewNow {
  b: Beat;
  /** The page being turned (0 flat on the right, 1 over on the left), how many have gone over. */
  flip: number;
  leaves: number;
  stamp: V | null;
  stamped: boolean;
  /** The application slid round to the applicant (0–1). */
  turned: number;
}
const lstampAt = (u: number): V => {
  if (u < 0.35) return add(LD.ink, 0, 0.012 + 0.05 * (1 - Math.abs(wave(u, 2.9))), 0);
  const k = (u - 0.35) / 0.65;
  return add(LD.approve, 0, 0.012 + 0.07 * Math.abs(Math.sin(k * Math.PI)), 0);
};
export function reviewAt(t: number, ph: number): ReviewNow {
  const b = beatOf(REVIEW_SEQ, t, ph);
  const k = b.e < 0.5 ? b.from : b.to;
  const u = b.e < 0.5 ? b.u : 0;
  const pages = 3;
  const leafU = k === 'leaf' ? u * pages : 0;
  const turnOf = (key: string, uu: number) => (key === 'turn' ? sm(uu, 0.05, 0.4) : key === 'write' ? 1 - sm(uu, 0, 0.3) : 0);
  return {
    b,
    flip: k === 'leaf' ? sm(frac(leafU), 0.15, 0.85) : 0,
    leaves: k === 'leaf' ? Math.floor(leafU) : 0,
    stamp: k === 'stamp' ? lstampAt(u) : null,
    stamped: pastBeat(REVIEW_SEQ, b, 'stamp') || (k === 'stamp' && u > 0.55),
    turned: mixN(turnOf(b.from, b.u), turnOf(b.to, 0), b.e),
  };
}
const reviewKey: KeyFn = (key, f, u, t) => {
  switch (key) {
    case 'leaf': {
      // The right hand lifts each page's corner and lays it over to the left.
      const k = frac(u * 3);
      const a = sm(k, 0.15, 0.85) * Math.PI;
      const r = o(f, add(LD.file, 0.13 * Math.cos(a), 0.02 + 0.09 * Math.sin(a), 0.04));
      return hands({ l: o(f, add(LD.file, -0.16, 0.005, 0.03)), r, palms: 0.6, gl: 0.15, gr: 0.45, lean: 0.35, nod: 0.5 });
    }
    case 'read': {
      const down = u * 0.14;
      return hands({ l: o(f, add(LD.file, -0.15, 0.005, 0.03)), r: o(f, add(LD.file, 0.08 + 0.02 * wave(t, 0.5), 0.012, -0.06 + down)), palms: 1.0, gr: 0.5, lean: 0.4, nod: 0.6 });
    }
    case 'calc':
      return hands({ l: o(f, add(LD.file, -0.12, 0.005, 0.03)), r: o(f, add(LD.calc, 0.015 * wave(t, 2.3), 0.015 + 0.012 * Math.max(0, wave(t, 5)), 0)), palms: 1.4, gr: 0.3, lean: 0.3, nod: 0.5, tap: true });
    case 'stamp':
      return hands({ l: o(f, add(LD.approve, -0.13, 0.0, 0.02)), r: o(f, add(lstampAt(u), 0, 0.06, 0)), palms: 0.3, gl: 0.1, gr: 0.95, lean: 0.35, nod: 0.5 });
    case 'turn': {
      // Turned round and slid across; a pen to the line for their 서명.
      const s = sm(u, 0.05, 0.4);
      const p = lerpV(LD.file, LD.across, s);
      if (u < 0.45) return hands({ l: o(f, add(p, -0.08, 0.01, 0.04)), r: o(f, add(p, 0.08, 0.01, 0.04)), palms: 1.0, lean: 0.45, nod: 0.45 });
      return hands({ l: o(f, add(LD.file, -0.14, 0.005, 0.05)), r: o(f, add(LD.across, 0.04, 0.02, -0.04)), palms: 0.6, gr: 0.6, lean: 0.48, nod: 0.3 });
    }
    case 'write': {
      const p = o(f, add(LD.file, 0.05, 0.005, 0.06));
      return hands({ l: o(f, add(LD.file, -0.14, 0.005, 0.03)), r: p.add(new THREE.Vector3(0.025 * wave(t, 0.8), 0.006 * wave(t, 6), 0.012 * wave(t, 1.9))), palms: 1.25, gl: 0.2, gr: 0.85, lean: 0.33, nod: 0.5 });
    }
  }
  return hands({});
};

// =============================================================================================
// The 금융 단말기 (tradingTerminal, 1 × 1): four screens on their arm at the back, the keys in front,
// the mouse to the right (+x), the dealing phone to the left with its handset on the cradle.

export const TT = {
  seat: [0, 0.48, 0.58] as V,
  keys: [0.0, 0.765, 0.1] as V,
  mouse: [0.3, 0.77, 0.12] as V,
  cradle: [-0.36, 0.8, -0.02] as V,
  pad: [0.2, 0.765, 0.22] as V,
  /** The top screens' middle (pointed at). */
  top: [0.0, 1.42, -0.25] as V,
};
const TRADE_SEQ: Seq = [['mouse', 2.6], ['type', 2.0], ['point', 1.6], ['phone', 3.6], ['mouse', 2.0], ['type', 1.6]];
export interface TradeNow {
  b: Beat;
  /** The handset off its cradle at the ear (0–1). */
  phone: number;
}
export function tradeAt(t: number, ph: number): TradeNow {
  const b = beatOf(TRADE_SEQ, t, ph);
  const phone = b.from === 'phone' ? (b.e > 0 ? 1 - b.e : sm(b.u, 0, 0.12)) : 0;
  return { b, phone };
}
/** The ear the handset goes to, from the seat (the trader's left is -x), for someone `H` tall. */
export const earAt = (H: number): V => [TT.seat[0] - 0.09 * (H / 1.6), TT.seat[1] + 0.5 * H, TT.seat[2] - 0.02];
const tradeKey: KeyFn = (key, f, u, t) => {
  const keyL = o(f, add(TT.keys, -0.12, 0, 0));
  const keyR = o(f, add(TT.keys, 0.12, 0, 0));
  const mouse = o(f, add(TT.mouse, 0.025 * wave(t, 0.37), 0.012, 0.02 * wave(t, 0.53)));
  switch (key) {
    case 'mouse':
      return hands({ l: keyL, r: mouse, palms: 1.4, gr: 0.4, lean: 0.12, nod: -0.12 + 0.06 * wave(t, 0.2) });
    case 'type':
      return hands({ l: keyL.setY(keyL.y + 0.015 * Math.max(0, wave(t, 6.5))), r: keyR.setY(keyR.y + 0.015 * Math.max(0, wave(t, 6.5, 0.5))), palms: 1.45, lean: 0.2, nod: 0.0, tap: true });
    case 'point':
      return hands({ l: keyL, r: o(f, add(TT.top, 0.1, -0.06, 0.32)), palms: 0.3, gr: 0.15, lean: -0.02, nod: -0.35 });
    case 'phone': {
      const lift = sm(u, 0, 0.12);
      const ear = f.bd(0.09 * f.k, 0.5 * f.H, 0.04 * f.k);
      const p = o(f, TT.cradle).lerp(ear, lift);
      const jot = o(f, TT.pad).add(new THREE.Vector3(0.02 * wave(t, 0.9), 0.012 + 0.005 * wave(t, 6), 0.01 * wave(t, 1.7)));
      return hands({ l: p, r: u > 0.2 && u < 0.85 ? jot : mouse, palms: 0.4, gl: 0.8, gr: 0.85, lean: 0.12, nod: 0.25 });
    }
  }
  return hands({ l: keyL, r: keyR });
};

// =============================================================================================
// The 금고 (vaultDoor, 2 × 1): a steel frame against the wall with a round door hung at its right
// (+x), swinging out to the front; the spoked wheel in the door's middle, its pull handle near its
// left edge; inside the cash shelves, the 대여금고 boxes on the left, gold on the right. The spot
// walks: before the door to spin the wheel, a step aside (out of its swing) to pull it, in at the
// opening to check, aside again to swing it shut.

export const VT = {
  /** The hinge's line (x, z), the door's radius and thickness, the middle of the opening. */
  hinge: [0.74, 0.06] as const,
  r: 0.62,
  thick: 0.24,
  mid: [0.12, 1.08] as const,
  /** Where the handle is on the door, from the hinge (along the door, up, out of its face). */
  handle: [-1.0, 1.0, 0.2] as const,
  open: 1.85,
  /** The 대여금고 box that's drawn out (its front), the shelves' middle, the clipboard's hook. */
  box: [-0.25, 1.0, -0.22] as V,
  shelf: [0.32, 1.1, -0.2] as V,
};
/** The wheel's middle on the closed door's face. */
export const VT_WHEEL: V = [VT.mid[0], VT.mid[1], VT.hinge[1] + VT.thick / 2 + 0.06];
const VAULT_SEQ: Seq = [['wheel', 2.2, 0.9], ['pull', 2.4, 0.9], ['count', 4.6], ['boxes', 4.0], ['write', 3.0, 0.9], ['shut', 2.4, 0.9], ['lock', 2.0, 0.9]];
const STAND: Record<string, [number, number, number]> = {
  wheel: [0.12, 0.66, Math.PI],
  pull: [-0.8, 0.58, Math.PI - 0.4],
  count: [0.02, 0.36, Math.PI],
  boxes: [-0.22, 0.36, Math.PI],
  write: [0.0, 0.52, Math.PI],
  shut: [-0.8, 0.58, Math.PI - 0.4],
  lock: [0.12, 0.66, Math.PI],
};
export interface VaultNow {
  b: Beat;
  /** The door's swing (radians out), the wheel's turn, where the spot stands (x, z) and faces. */
  door: number;
  wheel: number;
  x: number;
  z: number;
  yaw: number;
  /** The 대여금고 box drawn out (0–1); the clipboard in the hand. */
  box: number;
  clip: boolean;
}
const doorOf = (k: string, u: number) => (k === 'wheel' || k === 'lock' ? 0 : k === 'pull' ? VT.open * sm(u, 0.12, 0.95) : k === 'shut' ? VT.open * (1 - sm(u, 0.05, 0.9)) : VT.open);
const wheelOf = (k: string, u: number) => (k === 'wheel' ? 2.6 * sm(u, 0.05, 0.9) : k === 'lock' ? 2.6 * (1 - sm(u, 0.05, 0.9)) : 2.6);
export function vaultAt(t: number, ph: number): VaultNow {
  const b = beatOf(VAULT_SEQ, t, ph);
  const A = STAND[b.from];
  const B = STAND[b.to];
  const e = b.e;
  const k = e < 0.5 ? b.from : b.to;
  const u = e < 0.5 ? b.u : 0;
  return {
    b,
    door: mixN(doorOf(b.from, b.u), doorOf(b.to, 0), e),
    wheel: mixN(wheelOf(b.from, b.u), wheelOf(b.to, 0), e),
    x: mixN(A[0], B[0], e),
    z: mixN(A[1], B[1], e),
    yaw: mixN(A[2], B[2], e),
    box: k === 'boxes' ? sm(u, 0.15, 0.35) * (1 - sm(u, 0.75, 0.95)) : 0,
    clip: k === 'count' || k === 'boxes' || k === 'write',
  };
}
/** A point on the door (from the hinge: along it, up, out of its face) with the door swung `a`. */
export function onDoor(along: number, up: number, out: number, a: number): V {
  const [hx, hz] = VT.hinge;
  return [hx + along * Math.cos(a) + out * Math.sin(a), up, hz - along * Math.sin(a) + out * Math.cos(a)];
}
/** The clipboard held at the chest, stood at (x, z) facing in. */
export const clipAt = (x: number, z: number, H: number): V => [x - 0.08, 0.64 * H, z - 0.3];
const vaultKey: KeyFn = (key, f, u, t) => {
  const s = (k: string) => STAND[k];
  const clip = (k: string) => {
    const [x, z] = s(k);
    return o(f, clipAt(x, z, f.H));
  };
  switch (key) {
    case 'wheel':
    case 'lock': {
      // Both hands on the spokes, turning it hand over hand.
      const a = wheelOf(key, u);
      const w = VT_WHEEL;
      const spoke = (off: number) => o(f, [w[0] + 0.2 * Math.cos(a + off), w[1] + 0.2 * Math.sin(a + off), w[2] + 0.05]);
      return hands({ l: spoke(Math.PI * 0.85), r: spoke(Math.PI * 0.15), palms: 0.2, gl: 0.9, gr: 0.9, lean: 0.12, nod: 0.05 });
    }
    case 'pull':
    case 'shut': {
      // The handle in the right hand while it's in reach; it swings on by its own weight.
      const a = doorOf(key, u);
      const h = o(f, onDoor(VT.handle[0], VT.handle[1], VT.handle[2] + 0.04, a));
      const reach = a < 0.38;
      return hands({ l: f.bd(0.22 * f.k, 0.48 * f.H, 0.08 * f.k), r: reach ? h : f.bd(-0.22 * f.k, 0.5 * f.H, 0.15 * f.k), palms: 0.1, gl: 0.3, gr: reach ? 0.9 : 0.3, lean: reach ? 0.12 : 0.02, nod: 0.1 });
    }
    case 'count': {
      // The clipboard in the left hand; the right counts off the shelves' bricks, row by row.
      const row = Math.floor(u * 3);
      const p = o(f, add(VT.shelf, -0.18 + 0.36 * frac(u * 3), 0.22 - row * 0.2, 0.05));
      return hands({ l: clip('count'), r: p, palms: 0.4, gl: 0.8, gr: 0.2, lean: 0.18, nod: 0.1 + row * 0.12, crouch: row === 2 ? 0.25 : 0 });
    }
    case 'boxes': {
      const out = sm(u, 0.15, 0.35) * (1 - sm(u, 0.75, 0.95));
      return hands({ l: clip('boxes'), r: o(f, add(VT.box, 0, 0, 0.04 + 0.25 * out)), palms: 0.3, gl: 0.8, gr: 0.85, lean: 0.2, nod: 0.25 });
    }
    case 'write': {
      const c = clip('write');
      return hands({ l: c, r: c.clone().add(new THREE.Vector3(0.03 * wave(t, 0.8), 0.04 + 0.006 * wave(t, 6), 0.01 * wave(t, 1.9))), palms: 1.0, gl: 0.8, gr: 0.85, lean: 0.06, nod: 0.6 });
    }
  }
  return hands({});
};
/** Which way the spot faces in the vault's frame now. */
export const vaultYaw = (t: number, ph: number) => vaultAt(t, ph).yaw;

// =============================================================================================

/** Where each motion's work mark is in its piece, and which way its spot faces there. */
function workOf(m: BkMotion): V {
  switch (m) {
    case 'bkTeller':
    case 'bkOpen':
    case 'bkCount':
      return TW.keys;
    case 'bkReview':
      return LD.file;
    case 'bkTrade':
      return TT.keys;
    case 'bkVault':
      return VT_WHEEL;
    case 'bkConsult':
      return [0, 0, 0];
  }
}
export function bkDoing(m: BkMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.4).setY(b.base.y + 0.3);
  const ph = bkPhase(p);
  const rel = m === 'bkVault' ? vaultYaw(t, ph) : Math.PI;
  const f = frameAt(p, workOf(m), b.yaw - rel, b.base, b.yaw, b.height);
  let h: Hands;
  switch (m) {
    case 'bkTeller':
      h = round(TELLER_SEQ, tellerKeyFn(false), f, t, ph);
      break;
    case 'bkOpen':
      h = round(OPEN_SEQ, tellerKeyFn(true), f, t, ph);
      break;
    case 'bkCount':
      h = round(COUNT_SEQ, countKey, f, t, ph);
      break;
    case 'bkConsult':
      h = round(CONSULT_SEQ, consultKey, f, t, ph);
      break;
    case 'bkReview':
      h = round(REVIEW_SEQ, reviewKey, f, t, ph);
      break;
    case 'bkTrade':
      h = round(TRADE_SEQ, tradeKey, f, t, ph);
      break;
    case 'bkVault':
      h = round(VAULT_SEQ, vaultKey, f, t, ph);
      break;
  }
  return {
    reach: { l: h.l, r: h.r, lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap },
    crouch: h.crouch || undefined,
  };
}
