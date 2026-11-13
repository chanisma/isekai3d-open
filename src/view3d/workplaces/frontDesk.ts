import * as THREE from 'three';
import { ball, box, cyl, part, rbox } from '../toon';
import { label } from './doctor';

/**
 * A shop's or an office's front desk (2026-11-05, the layout audit: the beauty shops and the model agency had no desk to be met at).
 * Placed facing the staff (its front, +z, is where the receptionist stands), so the visitor comes to its back: a counter to chest
 * height with the place's name on the visitor's side and a ledge on top where the card is signed and the flowers stand; behind
 * it, at desk height, the booking screen, the keyboard and the card reader.
 */
export interface DeskSpec {
  name: string;
  body: string;
  top: string;
  /** The name's lettering and its panel. */
  fg: string;
  bg: string;
  flowers?: string;
}

export function frontDesk(g: THREE.Object3D, W: number, D: number, s: DeskSpec) {
  const bz = -D / 2 + 0.2;
  // The counter and its ledge, the name on the visitor's side.
  part(g, rbox(W - 0.08, 1.04, 0.3, 0.03), s.body, 0, 0.52, bz);
  part(g, box(W - 0.02, 0.04, 0.38), s.top, 0, 1.06, bz - 0.03);
  label(g, s.name, Math.min(W - 0.3, 0.2 * s.name.length + 0.3), 0.18, 0, 0.72, bz - 0.156, s.bg, s.fg, Math.PI);
  // The desk behind at sitting height, the screen and the keyboard on it, the card reader.
  part(g, box(W - 0.12, 0.04, 0.4), s.top, 0, 0.74, bz + 0.34);
  part(g, box(0.06, 0.72, 0.36), s.body, -W / 2 + 0.1, 0.36, bz + 0.34);
  part(g, box(0.06, 0.72, 0.36), s.body, W / 2 - 0.1, 0.36, bz + 0.34);
  part(g, box(0.46, 0.3, 0.025), '#26292e', -0.2, 1.0, bz + 0.24);
  part(g, box(0.42, 0.25, 0.005), '#9fc3d9', -0.2, 1.0, bz + 0.255, { outline: false });
  part(g, box(0.05, 0.12, 0.05), '#26292e', -0.2, 0.82, bz + 0.24, { outline: false });
  part(g, box(0.36, 0.015, 0.12), '#eceff1', -0.2, 0.77, bz + 0.4, { outline: false });
  part(g, box(0.08, 0.03, 0.14), '#37474f', 0.32, 0.775, bz + 0.38, { outline: false });
  // Flowers in a vase on the ledge.
  if (s.flowers) {
    const fx = W / 2 - 0.3;
    part(g, cyl(0.05, 0.04, 0.16, 12), '#eceff1', fx, 1.16, bz - 0.03);
    for (let i = 0; i < 5; i++) part(g, ball(0.035), s.flowers, fx + Math.sin(i * 1.3) * 0.06, 1.3 + (i % 2) * 0.04, bz - 0.03 + Math.cos(i * 1.3) * 0.05, { outline: false });
  }
}
