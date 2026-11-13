import * as THREE from 'three';
import { ball, box, cyl, part, rbox } from './toon';

/**
 * A baby (2026-11-01, at the user's request; was a cylinder and a ball): swaddled in a blanket with its
 * fold across the chest, a knit cap, a round face with ears, cheeks, a nose and a mouth, the feet a bump
 * at the end and one small hand out at the fold. Lying on its back with the head to -z and the face up
 * (+y), as the bassinet and the arms that lift it expect. Asleep the eyes are shut; awake it looks about;
 * crying the mouth opens and the head shakes a little. It breathes all the time.
 */
export interface Baby {
  root: THREE.Group;
  /** `feeding`: at the bottle, the head still, the mouth where the teat is, not crying. */
  update(t: number, mood: { asleep: boolean; crying: boolean; feeding?: boolean }): void;
}

/** Where the head is and how big, in the baby's own frame. */
const HEAD_AT = [0, 0.098, -0.175] as const;
const HEAD_SCALE = 1.18;
const MOUTH_ON_HEAD = [0, 0.064, 0.056] as const;
/** The mouth, in the baby's own frame, and the way out of it (for a bottle coming to it). */
export const BABY_MOUTH: [number, number, number] = [HEAD_AT[0] + HEAD_SCALE * MOUTH_ON_HEAD[0], HEAD_AT[1] + HEAD_SCALE * MOUTH_ON_HEAD[1], HEAD_AT[2] + HEAD_SCALE * MOUTH_ON_HEAD[2]];
export const BABY_MOUTH_OUT: [number, number, number] = [0, 0.753, 0.658];
/** The eyes, likewise (what a bottle must keep off). */
export const BABY_EYES: Array<[number, number, number]> = [-1, 1].map((s) => [HEAD_AT[0] + HEAD_SCALE * s * 0.03, HEAD_AT[1] + HEAD_SCALE * 0.074, HEAD_AT[2] + HEAD_SCALE * 0.012]);

export function makeBaby(skin: string, hair: string, blanket: string): Baby {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.set(0, 0.085, 0.03);
  root.add(body);
  // The swaddle: a long egg, narrowing to the feet, the wrap's edge lying across it.
  const wrap = part(body, ball(0.1), blanket, 0, 0, 0, { outline: false });
  wrap.scale.set(0.95, 0.82, 1.42);
  const feet = part(body, ball(0.06), blanket, 0, -0.005, 0.11, { outline: false });
  feet.scale.set(1, 0.85, 1.1);
  const fold = part(body, rbox(0.15, 0.008, 0.032, 0.004), new THREE.Color(blanket).lerp(new THREE.Color('#ffffff'), 0.45).getStyle(), 0.006, 0.076, -0.055, { outline: false, rz: -0.1, ry: 0.28 });
  fold.rotation.x = 0.1;
  part(body, box(0.13, 0.006, 0.012), new THREE.Color(blanket).lerp(new THREE.Color('#000000'), 0.14).getStyle(), -0.01, 0.073, 0.04, { outline: false, ry: -0.5 });
  const hand = part(body, ball(0.019), skin, 0.05, 0.078, -0.03, { outline: false });
  // The head: big for the body, as a baby's is.
  const head = new THREE.Group();
  head.position.set(HEAD_AT[0], HEAD_AT[1], HEAD_AT[2]);
  head.scale.setScalar(HEAD_SCALE);
  root.add(head);
  const skull = part(head, ball(0.082), skin, 0, 0, 0);
  skull.scale.set(1, 0.96, 1);
  for (const s of [-1, 1]) {
    part(head, ball(0.018), skin, s * 0.08, -0.005, 0.005, { outline: false });
    part(head, ball(0.017), '#f4a9a0', s * 0.046, 0.058, 0.03, { outline: false }).scale.set(1, 0.3, 0.8);
  }
  part(head, ball(0.008), skin, 0, 0.081, 0.018, { outline: false });
  // The cap, with a small knot on top, and a little hair showing under it at the brow.
  const capColor = new THREE.Color(blanket).lerp(new THREE.Color('#ffffff'), 0.25).getStyle();
  const cap = part(head, ball(0.087), capColor, 0, -0.012, -0.03);
  cap.scale.set(1, 0.92, 0.82);
  part(head, cyl(0.086, 0.087, 0.018, 16), new THREE.Color(capColor).lerp(new THREE.Color('#ffffff'), 0.4).getStyle(), 0, 0.012, -0.018, { outline: false, rx: Math.PI / 2 - 0.25 });
  part(head, ball(0.018), capColor, 0, -0.012, -0.118, { outline: false });
  part(head, box(0.05, 0.004, 0.012), hair, 0, 0.074, -0.018, { outline: false });
  // What the face does, drawn on it.
  const INK = '#3a2a24';
  const open = [-1, 1].map((s) => part(head, ball(0.0105), INK, s * 0.03, 0.074, 0.012, { outline: false }));
  const shut = [-1, 1].map((s) => part(head, box(0.02, 0.003, 0.004), INK, s * 0.03, 0.077, 0.012, { outline: false, ry: s * 0.25 }));
  const smile = part(head, box(0.02, 0.003, 0.004), '#c9786e', MOUTH_ON_HEAD[0], MOUTH_ON_HEAD[1], MOUTH_ON_HEAD[2], { outline: false });
  const wail = part(head, ball(0.015), '#a33d3d', 0, 0.062, 0.06, { outline: false });
  return {
    root,
    update(t, { asleep, crying: wailing, feeding }) {
      const crying = wailing && !feeding;
      const breath = 1 + (crying ? 0.04 : 0.022) * Math.sin(t * (crying ? 6 : 2.4));
      body.scale.set(breath, breath, 1);
      head.rotation.y = feeding ? 0 : crying ? 0.12 * Math.sin(t * 7) : asleep ? 0.12 : 0.28 * Math.sin(t * 0.5);
      hand.position.y = 0.078 + (asleep ? 0 : 0.008 * Math.sin(t * 2.2));
      const closed = asleep || crying || Math.sin(t * 1.3) > 0.985;
      for (const m of open) m.visible = !closed;
      for (const m of shut) m.visible = closed;
      smile.visible = !crying;
      wail.visible = crying;
      wail.scale.setScalar(0.85 + 0.2 * Math.abs(Math.sin(t * 5)));
    },
  };
}
