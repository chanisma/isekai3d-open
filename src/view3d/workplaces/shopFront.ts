import * as THREE from 'three';
import { box, part } from '../toon';
import { label } from './doctor';

/**
 * A shop on the street (2026-11-05, the layout audit: shops stood on lawns with a brick wall to the street, no window, no sign).
 * What makes a 상가 1층 unit read as one from the pavement: the glass front from floor to lintel with its door, the fascia sign over
 * it with the shop's made-up name, an awning, the posters stuck inside the glass; and the units beside it in the row. Drawn by thin
 * pieces in each career's file: the front from a 1 × 1 anchor on the pavement, the neighbours as blocks, a glass partition indoors.
 */

const NOL = { outline: false };
const glassMat = new THREE.MeshToonMaterial({ color: '#a9cfdf', transparent: true, opacity: 0.42, depthWrite: false });
const innerGlass = new THREE.MeshToonMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.28, depthWrite: false });

export interface FrontSpec {
  /** The anchor tile's x (the piece stands on the pavement row just in front of the wall). */
  ax: number;
  /** The front wall's span, world x from the left wall's inner edge to the right one's. */
  x0: number;
  x1: number;
  /** The street door's tile column. */
  door: number;
  name: string;
  /** A line under the name (what it sells), smaller. */
  sub?: string;
  /** The fascia's colour and its lettering's. */
  bg: string;
  fg: string;
  /** The awning's colour; striped white when `stripes`. None when left out. */
  awning?: string;
  stripes?: boolean;
  /** The frame of the glass. */
  frame?: string;
  /** Posters inside the glass: [text, background, lettering, at world x]. */
  posters?: Array<[string, string, string, number]>;
  /** Tile columns [from, to] where the front is a solid wall, not glass: a restroom against the front wall (2026-11-06). */
  solid?: Array<[number, number]>;
  /** The solid stretch's colour. */
  solidColor?: string;
}

/** The glass front, its door, the fascia sign and the awning, along the front wall seen from the street. */
export function shopFront(g: THREE.Group, s: FrontSpec) {
  const ox = s.ax + 0.5;
  const zf = 14 - 15.5 + 0.09;
  const frame = s.frame ?? '#37474f';
  const rx = (X: number) => X - ox;
  const W = s.x1 - s.x0;
  // The glass, a pane a metre, the mullions between, a kick plate under; the door's leaf where the door is.
  for (let X = s.x0; X < s.x1; X++) {
    const cx = rx(X + 0.5);
    if (X === s.door) {
      part(g, box(0.86, 2.15, 0.03), '', cx, 1.1, zf + 0.03, { material: glassMat, outline: false, shadow: false });
      part(g, box(0.05, 2.2, 0.05), frame, cx - 0.44, 1.1, zf + 0.04, NOL);
      part(g, box(0.05, 2.2, 0.05), frame, cx + 0.44, 1.1, zf + 0.04, NOL);
      part(g, box(0.04, 0.5, 0.04), '#cfd8dc', cx + 0.3, 1.05, zf + 0.08, NOL);
      label(g, 'OPEN', 0.34, 0.12, cx, 1.62, zf + 0.06, '#ffffff', s.bg);
      continue;
    }
    if (s.solid?.some(([a, b]) => X >= a && X <= b)) {
      part(g, box(1.0, 2.26, 0.08), s.solidColor ?? '#e7e2db', cx, 1.13, zf + 0.03);
      continue;
    }
    part(g, box(0.94, 0.22, 0.05), frame, cx, 0.11, zf + 0.03, NOL);
    part(g, box(0.94, 2.0, 0.03), '', cx, 1.22, zf + 0.03, { material: glassMat, outline: false, shadow: false });
  }
  for (let X = s.x0; X <= s.x1; X++) part(g, box(0.06, 2.3, 0.06), frame, rx(X), 1.15, zf + 0.04, NOL);
  part(g, box(W, 0.08, 0.07), frame, rx(s.x0 + W / 2), 2.26, zf + 0.04, NOL);
  // The fascia sign over the glass, its name lit on it.
  part(g, box(W, 0.56, 0.1), s.bg, rx(s.x0 + W / 2), 2.66, zf + 0.06);
  const nw = Math.min(W - 0.6, 0.55 * s.name.length + 0.6);
  label(g, s.name, nw, 0.36, rx(s.x0 + W / 2) - (s.sub ? 1.2 : 0), 2.68, zf + 0.115, s.bg, s.fg);
  if (s.sub) label(g, s.sub, Math.min(3.0, 0.3 * s.sub.length + 0.4), 0.2, rx(s.x0 + W / 2) + nw / 2 + 0.4, 2.62, zf + 0.115, s.bg, s.fg);
  // The awning, sloping out over the pavement.
  if (s.awning) {
    part(g, box(W - 0.1, 0.05, 0.85), s.awning, rx(s.x0 + W / 2), 2.2, zf + 0.44, { rx: 0.32 });
    if (s.stripes) for (let X = s.x0 + 0.25; X < s.x1 - 0.2; X += 1) part(g, box(0.5, 0.052, 0.85), '#ffffff', rx(X + 0.25), 2.2, zf + 0.44, { rx: 0.32, outline: false });
  }
  // Posters in the window, facing the street.
  for (const [t, bg, fg, X] of s.posters ?? []) label(g, t, 0.9, 0.3, rx(X), 1.45, zf + 0.06, bg, fg);
}

export interface NeighbourSpec {
  name: string;
  /** The awning's and sign's colour, the wall's. */
  color: string;
  wall: string;
}

/** The next unit along the row, a one-storey block whose front faces the street (+z): its glass, door, awning and sign. */
export function neighbourShop(g: THREE.Group, W: number, D: number, s: NeighbourSpec) {
  const H = 3.4;
  part(g, box(W - 0.05, H, D - 0.05), s.wall, 0, H / 2, 0);
  const zf = D / 2 + 0.01;
  const glass = new THREE.Mesh(box(W - 1.0, 2.0, 0.04), glassMat);
  glass.position.set(-0.3, 1.25, zf);
  g.add(glass);
  part(g, box(W - 0.9, 0.08, 0.06), '#455a64', -0.3, 2.28, zf, NOL);
  part(g, box(0.9, 2.1, 0.06), '#455a64', W / 2 - 0.75, 1.05, zf, NOL);
  part(g, box(W - 0.2, 0.08, 0.9), s.color, 0, 2.5, zf + 0.42, { rx: 0.25 });
  part(g, box(W - 0.3, 0.5, 0.08), s.color, 0, 3.05, zf + 0.04);
  label(g, s.name, Math.min(W - 0.8, 0.5 * s.name.length + 0.5), 0.36, 0, 3.05, zf + 0.09, s.color, '#ffffff');
  part(g, box(W, 0.15, D), '#9e9e9e', 0, H + 0.07, 0, NOL);
}

/** A glass partition indoors (a kitchen or a lab seen from the shop): a low base, glass to above head height, a top rail. */
export function glassWall(g: THREE.Group, W: number, D: number, frame = '#78909c') {
  part(g, box(W, 0.9, 0.1), '#eceff1', 0, 0.45, 0);
  part(g, box(W, 1.3, 0.03), '', 0, 1.55, 0, { material: innerGlass, outline: false, shadow: false });
  part(g, box(W, 0.05, 0.12), frame, 0, 2.22, 0, NOL);
  for (let i = 0; i <= W; i++) part(g, box(0.05, 1.35, 0.06), frame, -W / 2 + i, 1.55, 0, NOL);
  void D;
}
