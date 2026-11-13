import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';

/*
 * The kitchen at home (2026-11-01, at the user's request). Stood at a spot, in the piece's own frame (x across as you
 * face its front, y up, z out of its front; facing the piece the dweller's right hand is on +x), each timed from when they
 * began. What's in the hand goes through handTool.ts: `hold` names it and kitchen.ts sets Spot.held from that.
 * - ktSnack, ktMeal, ktPantry: taken from a shelf and eaten standing (a packet; a sandwich in both hands; a rice ball).
 * - ktBake: the bowl of batter out of the fridge, on the left hand, whisked, and put back to rest.
 * - ktSaute (요리하기): the knob, the pan's handle in the left hand, the turner in the right, a toss, the knob off.
 * - ktStew (가족 식사): the lid off to the next burner, the ladle round the big pot, a taste, a pinch of salt, the lid back.
 * - ktGourmet (고급 요리): a steak turned in the pan, a crouch to look in at the oven, a flambé.
 * - ktCoffee: the button, the drip, the jug poured into a mug, the mug to the mouth.
 * - ktMix (음료): a bottle poured into the shaker, the shaker shaken in both hands, poured out into the glass.
 * - ktCocktail (칵테일): a bottle into the mixing glass, stirred with the long spoon, poured, a slice of lime.
 * - ktDishes: a plate on the left hand, a sponge round it in the right, rinsed under the tap, put back.
 * - ktHands: both hands rubbed under the tap.
 * - ktGrill, ktGrillMany: the lid lifted, the tongs off the shelf, the sausages turned, then carried to the tray.
 * - ktServe: the toddler's bowl set down on the high chair's tray.
 */
export type KtMotion = 'ktSnack' | 'ktMeal' | 'ktPantry' | 'ktBake' | 'ktSaute' | 'ktStew' | 'ktGourmet' | 'ktCoffee' | 'ktMix' | 'ktCocktail' | 'ktDishes' | 'ktHands' | 'ktGrill' | 'ktGrillMany' | 'ktServe';
export const KT_MOTIONS = new Set<string>(['ktSnack', 'ktMeal', 'ktPantry', 'ktBake', 'ktSaute', 'ktStew', 'ktGourmet', 'ktCoffee', 'ktMix', 'ktCocktail', 'ktDishes', 'ktHands', 'ktGrill', 'ktGrillMany', 'ktServe']);

/** A round of each, seconds at normal speed (SPEEDS[1] is 2 game minutes a second): about its interaction's duration. */
export const KT_SECONDS: Record<KtMotion, number> = { ktSnack: 6, ktMeal: 15, ktPantry: 10, ktBake: 20, ktSaute: 15, ktStew: 22.5, ktGourmet: 30, ktCoffee: 7.5, ktMix: 12.5, ktCocktail: 10, ktDishes: 6, ktHands: 2, ktGrill: 12.5, ktGrillMany: 20, ktServe: 2.5 };

export type V = [number, number, number];
export type KtTool = 'snack' | 'sandwich' | 'riceBall' | 'bowl' | 'pan' | 'lid' | 'ladle' | 'carafe' | 'mug' | 'bottle' | 'shaker' | 'mixGlass' | 'barSpoon' | 'plate' | 'tongs' | 'babyBowl';

const sm = (u: number, a: number, b: number) => {
  const k = Math.min(1, Math.max(0, (u - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const mix = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unit = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A range's places (kitchen.ts builds it to these). */
export const ST = {
  /** The pan's foot on the grate, over the front left burner; the big pot, over the front right. */
  pan: [-0.2, 0.97, 0.17] as V,
  pot: [0.2, 0.97, 0.17] as V,
  potTop: 1.17,
  panKnob: [-0.3, 0.83, 0.47] as V,
  potKnob: [0.3, 0.83, 0.47] as V,
  ovenHandle: [0.02, 0.69, 0.49] as V,
  stand: 0.66,
};
/** The pan, from its foot: where the left hand has the handle, and the turner's reach from its head to the right hand. */
export const PAN = { grip: [-0.15, 0.05, 0.2] as V, turner: unit([0.45, 0.72, 0.53]), turnerLen: 0.24 };
/** The coffee maker: the counter's top, the jug on its plate (its foot), the mug, the power button, where the jug's and the mug's handles are from their feet. */
export const CF = { top: 0.88, carafe: [-0.04, 0.9, 0.17] as V, mug: [0.25, 0.88, 0.16] as V, button: [0.12, 0.98, 0.25] as V, stand: 0.58, carafeGrip: [0.09, 0.07, 0] as V, mugGrip: [0.052, 0.045, 0] as V, basket: [-0.3, 0.92, 0.18] as V };
/** The bar: its counter's top, the working bottle, the shaker, the mixing glass and the glass it all goes into. */
export const BR = { top: 0.92, bottle: [0.36, 0.92, 0.3] as V, shaker: [0.14, 0.92, 0.28] as V, mixGlass: [-0.08, 0.92, 0.28] as V, glass: [-0.3, 0.92, 0.3] as V, spoon: [0.0, 0.94, 0.38] as V, lime: [-0.48, 0.95, 0.3] as V, stand: 0.68 };
/** The sink: the middle of the draining board, the plate's place under the tap, the tap's mouth. */
export const SN = { board: [-0.02, 0.96, 0.14] as V, wash: [0.2, 1.03, 0.24] as V, rinse: [0.28, 1.0, 0.2] as V, spout: [0.3, 1.2, 0.14] as V, hands: [0.3, 1.0, 0.16] as V, stand: 0.6, x: 0.12 };
/** The grill: the grate's height, the sausages along it, the tongs' rest on the shelf, the tray. */
export const GR = { grate: 0.84, tongs: [0.36, 0.85, 0.22] as V, tongTip: 0.3, tray: [0.38, 0.8, 0.0] as V, rim: [0, 0.88, 0.27] as V, hinge: [0, 0.84, -0.27] as V, stand: 0.58, x: 0.04 };
export const grillDog = (i: number, n: number): V => {
  const rows = n > 3 ? 2 : 1;
  const row = i % rows;
  const across = Math.floor(i / rows);
  const count = Math.ceil(n / rows);
  return [(across - (count - 1) / 2) * 0.09, GR.grate + 0.016, rows > 1 ? (row - 0.5) * 0.2 + 0.03 : 0.06];
};
/** The high chair: the top of its tray and where the bowl sits on it. */
export const HC = { seat: 0.7, tray: 0.85, bowl: [0, 0.85, 0.27] as V, stand: 0.74 };
/** A fridge's shelf, where things are taken from, and where to stand for it. */
export interface KtPlace {
  st: [number, number];
  shelf: V;
}

export interface KtNow {
  st: [number, number];
  crouch: number;
  lean: number;
  nod: number;
  palms: number;
  l: V;
  r: V;
  shape?: 'cradle' | 'flat' | 'pinch';
  hold: KtTool | null;
  /** Still in its place: the hands go to it. */
  resting?: boolean;
  /** Where the tool's origin goes, in the piece's frame, and how it's turned (Euler), or (a long tool) the point its +y aims at. */
  tool?: V;
  rot?: V;
  head?: V;
  /** In a tool carrying another (the turner in the pan, the whisk in the bowl, the sponge on the plate): where that is, in the tool's frame. */
  sub?: V;
  /** How far on the piece's own moving things are (0–1 each). */
  v: Record<string, number>;
}

/** How far on a use is: told each frame by its pose, it knows when it began. It goes round for as long as it takes. */
export function ktPhase(m: KtMotion, spot: Spot, t: number): number {
  const ud = spot.at.userData;
  if (t - ((ud.ktLast as number | undefined) ?? -1e9) > 0.6) ud.ktBegan = t;
  ud.ktLast = t;
  return (((t - (ud.ktBegan as number)) / KT_SECONDS[m]) % 1 + 1) % 1;
}
/** Whether the spot's being used now, and how far on (for the piece, which runs before the pose). */
export function ktLive(m: KtMotion, spot: Spot, t: number): number | null {
  const ud = spot.at.userData;
  const last = ud.ktLast as number | undefined;
  if (last === undefined || Math.abs(t - last) > 0.6) return null;
  return (((t - (ud.ktBegan as number)) / KT_SECONDS[m]) % 1 + 1) % 1;
}

/** Where the hands hang from: a little in front, at the waist. */
const restL = (st: [number, number], s: number): V => [st[0] - 0.2, 0.95 * s, st[1] - 0.2];
const restR = (st: [number, number], s: number): V => [st[0] + 0.2, 0.95 * s, st[1] - 0.2];
const mouth = (st: [number, number], s: number): V => [st[0], 1.34 * s, st[1] - 0.17];
/** Bites taken: 1 at the mouth, 0 down at the chest, `n` times between a and b. */
const bites = (u: number, a: number, b: number, n: number) => {
  if (u <= a || u >= b) return 0;
  return Math.sin(((u - a) / (b - a)) * n * Math.PI) ** 2;
};

const FOOD_SHELF: KtPlace = { st: [0, 0.62], shelf: [0, 1.05, 0.12] };

/** Where everything is at `u` of a use, for someone `H` tall at time `t`. */
export function ktNow(m: KtMotion, u: number, H: number, t: number, place: KtPlace = FOOD_SHELF): KtNow {
  const s = H / 1.6;
  switch (m) {
    case 'ktSnack':
    case 'ktMeal':
    case 'ktPantry': {
      const st = place.st;
      const hold: KtTool = m === 'ktSnack' ? 'snack' : m === 'ktMeal' ? 'sandwich' : 'riceBall';
      const out = sm(u, 0, 0.12);
      const back = sm(u, 0.14, 0.24);
      const r0 = mix(restR(st, s), place.shelf, out);
      const chest: V = [st[0] + 0.03, 1.12 * s, st[1] - 0.28];
      const k = bites(u, 0.26, 0.94, m === 'ktSnack' ? 2 : m === 'ktMeal' ? 5 : 3);
      const toMouth = mix(chest, mouth(st, s), k);
      const held = u >= 0.11 && u < 0.97;
      const tool = u < 0.24 ? mix(place.shelf, chest, back) : toMouth;
      const two = m === 'ktMeal';
      return {
        st,
        crouch: 0,
        lean: 0.26 * out * (1 - back) + 0.06 * k,
        nod: 0.14 * (1 - k) + 0.1,
        palms: 0.4,
        l: two ? tool : restL(st, s),
        r: held ? tool : u >= 0.97 ? restR(st, s) : r0,
        hold: held ? hold : null,
        tool,
        rot: [0.2 + 0.55 * k, 0, 0],
        v: { bite: sm(u, 0.26, 0.94) },
      };
    }
    case 'ktBake': {
      const st = place.st;
      const out = sm(u, 0.1, 0.2);
      const back = sm(u, 0.86, 0.96);
      const crook: V = [st[0] - 0.05, 1.04 * s, st[1] - 0.3];
      const tool = mix(mix(place.shelf, crook, out), place.shelf, back);
      const a = t * 7.5;
      const wob = 0.045 * sm(u, 0.2, 0.26) * (1 - sm(u, 0.82, 0.86));
      const inUse = u >= 0.04 && u < 0.97;
      return {
        st,
        crouch: 0,
        lean: 0.24 * (1 - out) + 0.24 * back + 0.06,
        nod: 0.32,
        palms: 0.3,
        l: mix(restL(st, s), place.shelf, sm(u, 0, 0.08) * (1 - sm(u, 0.97, 1))),
        r: mix(restR(st, s), place.shelf, sm(u, 0, 0.08) * (1 - sm(u, 0.97, 1))),
        hold: inUse ? 'bowl' : null,
        resting: u < 0.1 || u > 0.96,
        tool,
        rot: [0.1 * out * (1 - back), 0, 0],
        sub: [wob * Math.cos(a), 0.04, wob * Math.sin(a)],
        v: { batter: sm(u, 0.2, 0.8) },
      };
    }
    case 'ktSaute':
    case 'ktGourmet': {
      const gourmet = m === 'ktGourmet';
      const st: [number, number] = [gourmet ? -0.07 : -0.1, ST.stand];
      const inAt = gourmet ? 0.03 : 0.06;
      const offAt = gourmet ? 0.94 : 0.9;
      const oven = gourmet ? sm(u, 0.46, 0.52) * (1 - sm(u, 0.64, 0.7)) : 0;
      const onPan = u >= inAt && u < offAt && !(gourmet && u >= 0.42 && u < 0.72);
      const settle = u < inAt + 0.05 || u > offAt - 0.03 || (gourmet && (u < 0.42 ? false : u < 0.76));
      // A toss now and then: the pan up and forward, what's in it thrown; in the gourmet's, the steak turned twice and a flambé.
      const toss = gourmet ? 0 : Math.max(sm(u, 0.4, 0.44) * (1 - sm(u, 0.48, 0.52)), sm(u, 0.66, 0.7) * (1 - sm(u, 0.74, 0.78)));
      const baste = gourmet ? sm(u, 0.76, 0.8) * (1 - sm(u, 0.86, 0.9)) : 0;
      const stir = onPan && !settle ? 1 : 0;
      const a = t * 3.6;
      const head: V = [0.055 * stir * Math.cos(a), 0.03 + 0.08 * toss, 0.055 * stir * Math.sin(a)];
      const tool: V = add(ST.pan, [0, 0.07 * toss + 0.02 * baste, -0.03 * toss]);
      const knobHand = (at: number, off: number) => sm(u, at, at + 0.03) * (1 - sm(u, off, off + 0.03));
      const knob = Math.max(knobHand(0, inAt - 0.01), knobHand(offAt, 0.985));
      const lRest = restL(st, s);
      const lNow = mix(lRest, ST.panKnob, knob);
      return {
        st,
        crouch: 0.55 * oven,
        lean: 0.14 + 0.12 * oven,
        nod: 0.38 + 0.1 * oven,
        palms: 0.3,
        l: oven > 0 ? mix(lRest, [st[0] - 0.22, 0.85, st[1] - 0.05], oven) : lNow,
        r: oven > 0 ? mix(restR(st, s), ST.ovenHandle, oven) : restR(st, s),
        hold: onPan ? 'pan' : null,
        resting: settle,
        tool,
        rot: [-0.22 * toss - 0.2 * baste, 0, 0],
        sub: head,
        v: {
          flame: sm(u, 0.01, inAt) * (1 - sm(u, offAt + 0.03, offAt + 0.06)),
          toss,
          knob: sm(u, 0.01, inAt) * (1 - sm(u, offAt + 0.03, offAt + 0.06)),
          door: gourmet ? sm(u, 0.5, 0.55) * (1 - sm(u, 0.62, 0.66)) : 0,
          flip: gourmet ? sm(u, 0.2, 0.23) + sm(u, 0.34, 0.37) : 0,
          burst: gourmet ? sm(u, 0.78, 0.8) * (1 - sm(u, 0.85, 0.88)) : 0,
          gourmet: gourmet ? 1 : 0,
        },
      };
    }
    case 'ktStew': {
      const st: [number, number] = [0.06, ST.stand];
      const lidOn: V = [ST.pot[0], ST.potTop + 0.03, ST.pot[2]];
      const lidOff: V = [-0.2, 1.0, 0.17];
      const off = sm(u, 0.07, 0.13);
      const on = sm(u, 0.88, 0.94);
      const lidBusy = (u >= 0.05 && u < 0.14) || (u >= 0.87 && u < 0.95);
      const lid = mix(mix(lidOn, lidOff, off), lidOn, on);
      const arc = Math.sin(Math.PI * (u > 0.5 ? on : off)) * 0.1;
      const a = t * 2.4;
      const round = 0.07 * sm(u, 0.15, 0.2) * (1 - sm(u, 0.82, 0.86));
      const inPot: V = [ST.pot[0] + round * Math.cos(a), ST.pot[1] + 0.11, ST.pot[2] + round * Math.sin(a)];
      const dir = unit([0.35, 0.55, 0.55]);
      const taste = sm(u, 0.56, 0.62) * (1 - sm(u, 0.68, 0.74));
      const lips: V = [st[0] + 0.01, 1.3 * s, st[1] - 0.16];
      const gripStir = add(inPot, dir, 0.3);
      const gripTaste: V = [st[0] + 0.16, 1.14 * s, st[1] - 0.24];
      const grip = mix(gripStir, gripTaste, taste);
      const head = mix(inPot, lips, taste);
      const ladling = u >= 0.14 && u < 0.86;
      const salt = sm(u, 0.76, 0.78) * (1 - sm(u, 0.84, 0.86));
      const knobR = Math.max(sm(u, 0, 0.03) * (1 - sm(u, 0.04, 0.07)), sm(u, 0.95, 0.97) * (1 - sm(u, 0.98, 1)));
      const lHand: V = salt > 0 ? mix(restL(st, s), [ST.pot[0] - 0.06, 1.3, ST.pot[2] + 0.04], salt) : restL(st, s);
      return {
        st,
        crouch: 0,
        lean: 0.16,
        nod: 0.36 - 0.5 * taste,
        palms: 0.3,
        l: lHand,
        r: mix(restR(st, s), ST.potKnob, knobR),
        shape: salt > 0 ? 'pinch' : undefined,
        hold: lidBusy ? 'lid' : ladling ? 'ladle' : null,
        resting: lidBusy ? u < 0.07 || (u >= 0.87 && u < 0.88) : u < 0.17,
        tool: lidBusy ? add(lid, [0, Math.max(0, arc), 0]) : grip,
        head,
        v: { flame: sm(u, 0.01, 0.04) * (1 - sm(u, 0.96, 0.99)), knob: sm(u, 0.01, 0.04) * (1 - sm(u, 0.96, 0.99)), lid: u >= 0.13 && u < 0.88 ? 1 : 0, salt },
      };
    }
    case 'ktCoffee': {
      const st: [number, number] = [0.12, CF.stand];
      const press = sm(u, 0, 0.04) * (1 - sm(u, 0.06, 0.1));
      const carafeOn = u >= 0.24 && u < 0.5;
      const pour = sm(u, 0.32, 0.37) * (1 - sm(u, 0.44, 0.48));
      const over: V = [CF.mug[0] - 0.13, CF.mug[1] + 0.12, CF.mug[2]];
      const carafeAt = mix(CF.carafe, over, pour);
      const mugOn = u >= 0.52 && u < 0.99;
      const lift = sm(u, 0.58, 0.64) * (1 - sm(u, 0.94, 0.985));
      const sip = lift * (0.45 + 0.55 * bites(u, 0.62, 0.94, 2));
      const hold0: V = [st[0] + 0.02, 1.12 * s, st[1] - 0.26];
      const lipMug: V = [st[0] - 0.03, 1.28 * s, st[1] - 0.15];
      const mugAt = mix(mix(CF.mug, hold0, lift), lipMug, Math.max(0, sip - 0.45) / 0.55);
      return {
        st,
        crouch: 0,
        lean: u < 0.5 ? 0.16 : 0.04,
        nod: u < 0.5 ? 0.34 : 0.12,
        palms: 0.3,
        l: u < 0.5 ? [-0.14, CF.top + 0.03, 0.26] : restL(st, s),
        r: mix(restR(st, s), CF.button, press),
        shape: u < 0.5 ? 'flat' : undefined,
        hold: carafeOn ? 'carafe' : mugOn ? 'mug' : null,
        resting: carafeOn ? u < 0.3 || u > 0.48 : u < 0.58 || u > 0.97,
        tool: carafeOn ? carafeAt : mugAt,
        rot: carafeOn ? [0, 0, -1.25 * pour] : [0.75 * Math.max(0, sip - 0.45) / 0.55, 0, 0],
        v: { on: 1, drip: sm(u, 0.04, 0.3), jug: 1 - 0.5 * sm(u, 0.36, 0.44), mug: sm(u, 0.36, 0.44) * (1 - sm(u, 0.66, 0.92) * 0.8), pouring: pour > 0.9 ? 1 : 0 },
      };
    }
    case 'ktMix':
    case 'ktCocktail': {
      const st: [number, number] = [0.08, BR.stand];
      const bottleOn = u >= 0.02 && u < 0.3;
      const into = m === 'ktMix' ? BR.shaker : BR.mixGlass;
      const pour = sm(u, 0.09, 0.14) * (1 - sm(u, 0.22, 0.27));
      const over: V = [into[0] + 0.15, into[1] + 0.19, into[2]];
      const bottle = mix(BR.bottle, over, pour);
      const bottleRot: V = [0, 0, 1.9 * pour];
      const base: Omit<KtNow, 'hold'> = {
        st,
        crouch: 0,
        lean: 0.14,
        nod: 0.3,
        palms: 0.3,
        l: restL(st, s),
        r: restR(st, s),
        v: { led: 1, shot: sm(u, 0.12, 0.24), fill: 0 },
      };
      if (bottleOn) return { ...base, hold: 'bottle', resting: u < 0.08 || u > 0.28, tool: bottle, rot: bottleRot };
      if (m === 'ktMix') {
        // Up in front of the chest, a little to the right so both arms get to it, the cap (the left hand's) tipped to the left shoulder;
        // shaken along its length in both hands; then a step along to the glass (it's out of reach from here) and poured.
        const up = sm(u, 0.34, 0.4) * (1 - sm(u, 0.7, 0.76));
        const shake = Math.sin(t * 15) * 0.035 * sm(u, 0.4, 0.43) * (1 - sm(u, 0.67, 0.7));
        const high: V = [st[0] + 0.05 * s + shake * 0.34, 1.1 * s + shake * 0.92, st[1] - 0.28 * s + shake * 0.2];
        const pourOut = sm(u, 0.76, 0.81) * (1 - sm(u, 0.88, 0.92));
        const over2: V = [BR.glass[0] + 0.11, BR.glass[1] + 0.2, BR.glass[2]];
        const at = up > 0 ? mix(BR.shaker, high, up) : mix(BR.shaker, over2, pourOut);
        const on = u >= 0.3 && u < 0.97;
        // Near the counter it's a long way for the left arm (the worst the probe saw): a shade over to the shaker and bent to it.
        const low = sm(u, 0.29, 0.33) * (1 - up) * (1 - pourOut);
        return { ...base, st: [st[0] + 0.05 * low - 0.16 * pourOut, st[1]], lean: 0.14 + 0.16 * low, hold: on ? 'shaker' : null, resting: u < 0.34 || u > 0.94, nod: 0.1 + 0.2 * (1 - up), tool: add(at, [0, 0.1, 0]), rot: [0.2 * up, 0, 0.35 * up + 1.75 * pourOut], v: { led: 1, shot: 1, fill: sm(u, 0.8, 0.88) } };
      }
      // Stirred with the long spoon, the glass held in the left; poured; a slice of lime on the rim.
      const spooning = u >= 0.3 && u < 0.58;
      if (spooning) {
        const a = t * 7;
        const spoonHead: V = [into[0] + 0.022 * Math.cos(a), into[1] + 0.05, into[2] + 0.022 * Math.sin(a)];
        const up = sm(u, 0.3, 0.34);
        const rest: V = add(BR.spoon, [0.03, 0, 0.09]);
        const grip = add(spoonHead, unit([0.28, 0.85, 0.38]), 0.22);
        return { ...base, hold: 'barSpoon', resting: u < 0.34, l: [into[0] - 0.05, into[1] + 0.08, into[2] + 0.06], shape: 'cradle', tool: mix(rest, grip, up), head: mix(add(rest, [-0.2, -0.05, -0.95]), spoonHead, up) };
      }
      const pour3 = sm(u, 0.64, 0.68) * (1 - sm(u, 0.76, 0.8));
      if (u >= 0.58 && u < 0.84) {
        const over3: V = [BR.glass[0] + 0.1, BR.glass[1] + 0.16, BR.glass[2]];
        return { ...base, hold: 'mixGlass', resting: u < 0.62 || u > 0.82, tool: mix(BR.mixGlass, over3, pour3), rot: [0, 0, 1.6 * pour3], v: { led: 1, shot: 1, fill: sm(u, 0.67, 0.77) } };
      }
      const lime = sm(u, 0.85, 0.89) * (1 - sm(u, 0.94, 0.99));
      return { ...base, hold: null, l: mix(restL(st, s), BR.lime, lime), shape: lime > 0 ? 'pinch' : undefined, v: { led: 1, shot: 1, fill: 1, lime: sm(u, 0.91, 0.93) } };
    }
    case 'ktDishes': {
      const st: [number, number] = [SN.x, SN.stand];
      const up = sm(u, 0.06, 0.16);
      const rinse = sm(u, 0.6, 0.66) * (1 - sm(u, 0.84, 0.9));
      const down = sm(u, 0.9, 0.97);
      const at = mix(mix(mix(SN.board, SN.wash, up), SN.rinse, rinse), SN.board, down);
      const a = t * 8;
      const on = u >= 0.02 && u < 0.99;
      const scrub = sm(u, 0.16, 0.2) * (1 - rinse);
      return {
        st,
        crouch: 0,
        lean: 0.28,
        nod: 0.42,
        palms: 0.3,
        l: restL(st, s),
        r: restR(st, s),
        hold: on ? 'plate' : null,
        resting: u < 0.06 || u > 0.97,
        tool: at,
        // Tipped up to the right, face towards the dweller; under the tap, turned to shed the water.
        rot: [0.55 * up * (1 - down), 0, -0.25 * up * (1 - down) - 0.55 * rinse],
        sub: [0.055 * scrub * Math.cos(a) + 0.02, 0.028, 0.055 * scrub * Math.sin(a) + 0.02],
        v: { water: sm(u, 0, 0.04) * (1 - sm(u, 0.96, 1)), foam: 0.5 + 0.5 * scrub, sponge: rinse > 0.5 ? 0 : 1 },
      };
    }
    case 'ktHands': {
      const st: [number, number] = [SN.x + 0.12, SN.stand];
      const inW = sm(u, 0, 0.14) * (1 - sm(u, 0.88, 1));
      const rub = Math.sin(t * 11) * 0.03 * sm(u, 0.14, 0.2) * (1 - sm(u, 0.8, 0.88));
      return {
        st,
        crouch: 0,
        lean: 0.26,
        nod: 0.42,
        palms: 0.4,
        l: mix(restL(st, s), add(SN.hands, [-0.05 + rub, rub * 0.4, 0.02]), inW),
        r: mix(restR(st, s), add(SN.hands, [0.05 - rub, -rub * 0.4, 0.02]), inW),
        shape: 'flat',
        hold: null,
        v: { water: sm(u, 0, 0.06) * (1 - sm(u, 0.94, 1)), foam: 0.3, sponge: 1 },
      };
    }
    case 'ktGrill':
    case 'ktGrillMany': {
      const st: [number, number] = [GR.x, GR.stand];
      const n = m === 'ktGrill' ? 2 : 6;
      const open = sm(u, 0.02, 0.12);
      const shut = sm(u, 0.92, 0.99);
      const lid = open * (1 - shut);
      const th = 1.75 * lid;
      // The hand goes with the rim until it's past the top, then lets the lid go back on its hinge.
      const follow = Math.min(th, 0.8);
      const rel: V = [0, GR.rim[1] - GR.hinge[1], GR.rim[2] - GR.hinge[2]];
      const rimNow: V = [0, GR.hinge[1] + rel[1] * Math.cos(follow) + rel[2] * Math.sin(follow), GR.hinge[2] - rel[1] * Math.sin(follow) + rel[2] * Math.cos(follow)];
      const onRim = sm(u, 0, 0.03) * (1 - sm(u, 0.13, 0.17)) + sm(u, 0.91, 0.93) * (1 - sm(u, 0.98, 1));
      const lHand: V = mix(restL(st, s), rimNow, Math.min(1, onRim));
      const toolOn = u >= 0.12 && u < 0.92;
      const take = sm(u, 0.16, 0.2);
      const put = sm(u, 0.86, 0.91);
      const dir = unit([0.25, 0.62, 0.74]);
      const carryFrom = 0.62;
      const carryTo = 0.86;
      let tip: V;
      let carry = -1;
      let served = 0;
      let turned = 0;
      if (u >= carryTo) {
        served = n;
        const b: V = add(GR.tray, [0, 0.05, 0]);
        tip = b;
        turned = n * 2;
      } else if (u < carryFrom) {
        // Round the sausages, a turn of each.
        const w = Math.max(0, (u - 0.2) / (carryFrom - 0.2)) * n * 2;
        const i = Math.floor(w) % n;
        const k = w - Math.floor(w);
        const a = grillDog(i, n);
        const b = grillDog((i + 1) % n, n);
        const lift = Math.sin(Math.PI * Math.min(1, k * 1.5)) * 0.03;
        tip = add(mix(a, b, sm(k, 0.7, 1)), [0, 0.012 + lift, 0]);
        turned = w;
      } else {
        const w = Math.min(n - 1e-3, ((u - carryFrom) / (carryTo - carryFrom)) * n);
        const i = Math.floor(w);
        const k = w - i;
        served = i;
        carry = i;
        const a = add(grillDog(i, n), [0, 0.012, 0]);
        const b: V = add(GR.tray, [(i % 3 - 1) * 0.05, 0.04 + Math.floor(i / 3) * 0.03, 0]);
        const hop = Math.sin(Math.PI * k) * 0.09;
        tip = add(mix(a, b, sm(k, 0.12, 0.85)), [0, hop, 0]);
        turned = n * 2;
      }
      const grip = add(tip, dir, GR.tongTip);
      const rest: V = GR.tongs;
      const restHead = add(GR.tongs, [-0.3 * 0.3, -0.04, -0.3 * 0.95]);
      const k = take * (1 - put);
      return {
        st,
        crouch: 0.12 * sm(u, 0.1, 0.16) * (1 - take),
        lean: 0.26,
        nod: 0.42,
        palms: 0.3,
        l: lHand,
        r: restR(st, s),
        hold: toolOn ? 'tongs' : null,
        resting: u < 0.16 || u > 0.9,
        tool: mix(rest, grip, k),
        head: mix(restHead, tip, k),
        v: { lid, coals: sm(u, 0, 0.2) * (1 - sm(u, 0.96, 1)) * 0.6 + 0.4, turned, carry, served, n },
      };
    }
    case 'ktServe': {
      const st: [number, number] = [0.08, HC.stand];
      const set = sm(u, 0.14, 0.62);
      const carried: V = [st[0] + 0.05, 1.05 * s, st[1] - 0.3];
      const on = u >= 0.02 && u < 0.72;
      const tool = mix(carried, HC.bowl, set);
      const away = sm(u, 0.72, 0.9);
      return {
        st,
        crouch: 0.32 * set * (1 - away),
        lean: 0.14 + 0.28 * set * (1 - away),
        nod: 0.3,
        palms: 0.5,
        l: mix(restL(st, s), [-0.2, HC.tray + 0.04, 0.3], set * (1 - away)),
        r: mix([HC.bowl[0] + 0.06, HC.bowl[1] + 0.06, HC.bowl[2] + 0.04], restR(st, s), away),
        shape: 'flat',
        hold: on ? 'babyBowl' : null,
        resting: u >= 0.62,
        tool,
        rot: [0, 0, 0],
        v: { bowl: 1 },
      };
    }
  }
}

/** A dweller stood at a piece: the same frame the piece works in. */
export function ktPose(m: KtMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const u = ktPhase(m, spot, t);
  const place = spot.at.userData.ktPlace as KtPlace | undefined;
  const n = ktNow(m, u, height, t, place);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const at = W([n.st[0], 0, n.st[1]]);
  const dir = new THREE.Vector3(0, 0, -1).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const shape = n.shape ? { l: n.shape, r: n.shape } : undefined;
  return {
    pose: { kind: 'stand', at, yaw, crouch: n.crouch },
    doing: {
      reach: { l: W(n.l), r: W(n.r), lean: n.lean, nod: n.nod, palms: n.palms, grip: { l: 0.3, r: 0.3 }, shape },
      crouch: n.crouch || undefined,
    },
  };
}
