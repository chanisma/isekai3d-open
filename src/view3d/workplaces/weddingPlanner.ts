import * as THREE from 'three';
import { FLORAL, albumRound, floralRound, toolPhase, type Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, toon } from '../toon';
import { BLACK, CHROME, STEEL, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';
import { shopFront } from './shopFront';

/**
 * The wedding consultancy drawn as itself (2026-10-27 workplace pipeline, at the user's request): the
 * consultation table the planner sits at across from the couple — the album of the halls turned round
 * to them and its pages turned over, the tablet with the 스드메 quote, the couple drawn on the loveseat
 * for a consultation — the budget desk with the spreadsheet on the laptop, the decor sample table
 * with its model of the hall, the florist's table where stems are cut and set into a bouquet or a vase
 * and bouquets are wrapped, and the arch outside dressed in flowers; and what the 웨딩 컨설팅 was missing
 * (workFurniture/weddingPlanner.ts): the couple's loveseat, the 스드메 package board, the week's
 * ceremony schedule, the hall album and invitation cabinet, the dress-fitting podium with its
 * three-way mirror and a guest table laid as a sample.
 */

const IVORY = '#fffaf0';
const LINEN = '#fbf7f1';
const MARBLE = '#f4f1ec';
const BLUSH = '#f8bbd0';
const ROSE = '#ec407a';
const DEEP = '#ad1457';
const GOLD = '#d4af37';
const SAGE = '#a5c49a';
const LEAF = '#6d9b5e';
const STEM = '#6f9a4f';
const KRAFT = '#c8a27a';
const OAK = '#b08968';
const VELVET = '#e8c4cc';
const SKIN = '#f3cfb3';
const MIRROR = toon('#dceff7', '#5c7c8a');
const VEIL = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
const FLOWERS = ['#ffffff', '#f8bbd0', '#fce4ec', '#f48fb1', '#fff3e0', '#ffe0b2', '#f3e5f5'];

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const phaseAt = (s: Spot) => toolPhase(s.at.getWorldPosition(tmp));
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
/** A standing spot at (x, z) turned to face a point. */
function facing(g: THREE.Object3D, x: number, z: number, to: THREE.Vector3): Spot {
  return spot(g, 'stand', x, 0, z, Math.atan2(to.x - x, to.z - z));
}
/** A sat spot (the seat's top at `y`) facing `yaw`. */
const sat = (g: THREE.Object3D, x: number, y: number, z: number, yaw: number) => spot(g, 'sit', x, y, z, yaw, y);

type Off = { side: number; up: number; ahead: number };
/** Offsets (to a dweller's left, up, ahead of them) from a point, for a dweller facing `yaw` (activity.ts BarOffset). */
function offsetter(P: THREE.Vector3, yaw: number) {
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return (o: Off, v = new THREE.Vector3()) => v.copy(P).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
}

// ---------------------------------------------------------------------------------------------
// Flowers.

/** A flower's head: a rose or a peony, its heart a shade deeper. */
function bloom(g: THREE.Object3D, x: number, y: number, z: number, color: string, r = 0.03) {
  const m = part(g, ball(r), color, x, y, z, { outline: false });
  m.scale.set(1, 0.78, 1);
  part(g, ball(r * 0.5), shade(color, 0.88), x, y + r * 0.42, z, { outline: false });
  return m;
}
/** A leaf (eucalyptus, greenery), lying along `ry`. */
function leaf(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, color = LEAF, s = 1) {
  const m = part(g, ball(0.024 * s), color, x, y, z, { outline: false, ry, rz: 0.3 });
  m.scale.set(1.7, 0.35, 0.8);
  return m;
}
/** A dome of flowers and greenery round a point (its middle's base), `r` across. */
function posy(g: THREE.Object3D, x: number, y: number, z: number, r: number, colors: string[], seed: number, n = 9) {
  const rnd = seeded(seed);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r;
    const lift = Math.cos((d / r) * 1.2) * r * 0.55;
    bloom(g, x + Math.cos(a) * d, y + lift, z + Math.sin(a) * d, colors[i % colors.length], r * (0.32 + rnd() * 0.12));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rnd();
    leaf(g, x + Math.cos(a) * r * 1.05, y + r * 0.1, z + Math.sin(a) * r * 1.05, -a, i % 2 ? LEAF : SAGE, r / 0.07);
  }
}

/**
 * A florist's hands' things (activity.ts floralRound) for someone at `yaw` working at `P` (the
 * bouquet's binding point in their left hand, or a vase's mouth): the stems laid on the table, the
 * stem in the right hand, the snips, and — hand-tied — the bouquet in the left with its stem ends cut
 * level; the three stems that go in appear where they were set.
 */
function floralKit(g: THREE.Object3D, P: THREE.Vector3, yaw: number, vase: boolean, colors: string[]) {
  const root = new THREE.Group();
  g.add(root);
  const off = offsetter(P, yaw);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  // The pile: five stems laid heads away, a few leaves stripped off beside it.
  const pile = off(FLORAL.pile);
  pile.y -= 0.012;
  for (let i = 0; i < 5; i++) {
    const s = pile.clone().addScaledVector(left, -0.06 + i * 0.03);
    const a = s.clone().addScaledVector(fwd, -0.15);
    const b = s.clone().addScaledVector(fwd, 0.12);
    rod(root, a, b, 0.004, STEM);
    bloom(root, b.x, b.y + 0.01, b.z, colors[(i + 1) % colors.length], 0.026);
  }
  for (let i = 0; i < 4; i++) {
    const s = pile.clone().addScaledVector(left, -0.13 - i * 0.02).addScaledVector(fwd, -0.05 + i * 0.03);
    leaf(root, s.x, s.y - 0.005, s.z, yaw + i, LEAF, 0.8);
  }
  // A stem each for the three that go in (in the hand: the head up over the hand, the stem down).
  const held = [0, 1, 2].map((i) => {
    const h = new THREE.Group();
    root.add(h);
    rod(h, new THREE.Vector3(0, -0.24, 0), new THREE.Vector3(0, 0.07, 0), 0.004, STEM);
    leaf(h, 0.02, -0.04, 0, 0.4, LEAF, 0.8);
    bloom(h, 0, 0.09, 0, colors[i % colors.length], 0.032);
    h.visible = false;
    return h;
  });
  const added = [0, 1, 2].map((i) => {
    const h = new THREE.Group();
    root.add(h);
    const k = vase ? { side: -0.05 + i * 0.05, up: 0.06 + (i % 2) * 0.03, ahead: 0.02 * (i - 1) } : { side: -0.03 + i * 0.03, up: 0.04, ahead: 0.02 - i * 0.02 };
    h.position.copy(off(k));
    bloom(h, 0, 0.09, 0, colors[i % colors.length], 0.032);
    rod(h, new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0, 0.07, 0), 0.004, STEM);
    return h;
  });
  // The snips: steel blades to +z from the pivot in the hand, red grips behind.
  const snips = new THREE.Group();
  root.add(snips);
  const blades = [-1, 1].map((sx) => {
    const b = new THREE.Group();
    snips.add(b);
    part(b, box(0.008, 0.004, 0.06), STEEL, sx * 0.003, 0, 0.032, { outline: false });
    part(b, box(0.016, 0.012, 0.05), '#d32f2f', sx * 0.012, 0, -0.03, { outline: false, ry: sx * 0.15 });
    return { b, sx };
  });
  part(snips, cyl(0.006, 0.006, 0.01, 8), CHROME, 0, 0, 0, { outline: false });
  const rest = off(FLORAL.snips);
  // The bouquet held in the left hand: its dome, the ribbon at the binding, the stems below (cut level later).
  const bouquet = new THREE.Group();
  root.add(bouquet);
  let long: THREE.Object3D | undefined;
  let short: THREE.Object3D | undefined;
  if (!vase) {
    bouquet.position.copy(off({ side: 0, up: -0.01, ahead: -0.02 }));
    posy(bouquet, 0, 0.05, 0, 0.075, colors, 7, 8);
    part(bouquet, cyl(0.03, 0.026, 0.05, 12), '#fffaf0', 0, 0.0, 0, { outline: false });
    long = part(bouquet, cyl(0.026, 0.02, 0.26, 10), STEM, 0, -0.15, 0);
    short = part(bouquet, cyl(0.026, 0.022, 0.17, 10), STEM, 0, -0.105, 0);
    // The cut ends on the table.
    for (let i = 0; i < 4; i++) rod(root, rest.clone().addScaledVector(left, 0.06 + i * 0.015), rest.clone().addScaledVector(left, 0.06 + i * 0.015).addScaledVector(fwd, 0.05), 0.004, STEM);
  }
  const hand = new THREE.Vector3();
  return {
    root,
    show(t: number, ph: number) {
      const k = floralRound(t, ph, vase);
      off(k.r, hand);
      held.forEach((h, i) => {
        h.visible = k.stem === i;
        if (h.visible) h.position.copy(hand);
      });
      added.forEach((h, i) => (h.visible = k.added > i));
      if (k.snips) {
        snips.position.copy(hand);
        snips.rotation.set(0, yaw, 0);
      } else {
        snips.position.copy(rest);
        snips.rotation.set(0, yaw + 0.5, 0);
      }
      for (const { b, sx } of blades) b.rotation.y = sx * 0.35 * k.open;
      if (long && short) {
        long.visible = k.u < 0.79;
        short.visible = !long.visible;
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// People drawn sat or stood (the couple at the table, the bride on the fitting podium).

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin: string;
  long: boolean;
  skirt: boolean;
  shoes: string;
}
const BRIDE_TO_BE: Look = { top: '#fff3e0', bottom: '#f4b6c2', hair: '#3b2a20', skin: SKIN, long: true, skirt: true, shoes: '#d7a49a' };
const GROOM_TO_BE: Look = { top: '#3d5a80', bottom: '#d7ccc8', hair: '#1f1a17', skin: '#e8bf9f', long: false, skirt: false, shoes: '#5d4037' };

/** A head, the face to +z, eyes open: hair short or long down the back. */
function headOf(g: THREE.Object3D, look: Look): THREE.Group {
  const h = new THREE.Group();
  h.rotation.order = 'YXZ';
  g.add(h);
  part(h, ball(0.09), look.skin, 0, 0, 0).scale.set(0.92, 1.06, 1);
  part(h, ball(0.096), look.hair, 0, 0.026, -0.018).scale.set(1, 0.92, 1);
  part(h, box(0.15, 0.04, 0.04), look.hair, 0, 0.07, 0.05, { rx: 0.4, outline: false });
  for (const sx of [-1, 1]) {
    part(h, ball(0.016), look.skin, sx * 0.083, -0.005, 0);
    part(h, ball(0.011), '#2b1d16', sx * 0.032, 0.004, 0.08, { outline: false });
    part(h, box(0.026, 0.005, 0.004), look.hair, sx * 0.033, 0.032, 0.08, { rz: -sx * 0.12, outline: false });
    if (look.long) part(h, ball(0.014), '#f4a6b4', sx * 0.048, -0.028, 0.07, { outline: false }).scale.set(1, 0.6, 0.4);
  }
  part(h, box(0.03, 0.006, 0.004), look.long ? '#c2185b' : '#a1665e', 0, -0.046, 0.084, { outline: false });
  if (look.long) part(h, rbox(0.19, 0.3, 0.07, 0.03), look.hair, 0, -0.11, -0.07);
  return h;
}

/** Someone sat, their seat's top at `sy`, facing +z from the origin. */
function sitter(g: THREE.Object3D, sy: number, look: Look): { root: THREE.Group; head: THREE.Group } {
  const root = new THREE.Group();
  g.add(root);
  part(root, rbox(0.32, 0.13, 0.3, 0.06), look.bottom, 0, sy + 0.06, -0.02);
  for (const sx of [-1, 1]) {
    if (look.skirt) {
      rod(root, new THREE.Vector3(sx * 0.07, sy + 0.04, 0.34), new THREE.Vector3(sx * 0.075, 0.09, 0.42), 0.035, look.skin);
    } else {
      rod(root, new THREE.Vector3(sx * 0.09, sy + 0.07, 0.02), new THREE.Vector3(sx * 0.09, sy + 0.07, 0.4), 0.058, look.bottom);
      rod(root, new THREE.Vector3(sx * 0.09, sy + 0.06, 0.41), new THREE.Vector3(sx * 0.1, 0.09, 0.45), 0.048, look.bottom);
    }
    part(root, rbox(0.085, 0.06, 0.16, 0.025), look.shoes, sx * (look.skirt ? 0.075 : 0.1), 0.03, 0.48);
  }
  if (look.skirt) part(root, rbox(0.34, 0.1, 0.4, 0.04), look.bottom, 0, sy + 0.06, 0.15);
  part(root, rbox(0.3, 0.42, 0.19, 0.08), look.top, 0, sy + 0.33, -0.04);
  if (!look.long) part(root, box(0.1, 0.06, 0.02), '#ffffff', 0, sy + 0.52, 0.05, { rx: -0.2, outline: false });
  for (const sx of [-1, 1]) {
    rod(root, new THREE.Vector3(sx * 0.17, sy + 0.5, -0.04), new THREE.Vector3(sx * 0.19, sy + 0.29, 0.06), 0.036, look.top);
    rod(root, new THREE.Vector3(sx * 0.19, sy + 0.29, 0.06), new THREE.Vector3(sx * 0.08, sy + 0.2, 0.24), 0.03, look.long ? look.skin : look.top);
    part(root, ball(0.032), look.skin, sx * 0.07, sy + 0.2, 0.26);
  }
  part(root, cyl(0.042, 0.045, 0.1, 12), look.skin, 0, sy + 0.6, -0.03);
  const head = headOf(root, look);
  head.position.set(0, sy + 0.72, -0.02);
  return { root, head };
}

/** A bride stood in her gown, facing +z, her feet at the origin: the bouquet at her waist, the veil down her back. */
function standingBride(g: THREE.Object3D): { root: THREE.Group; skirt: THREE.Mesh; head: THREE.Group } {
  const root = new THREE.Group();
  g.add(root);
  const geom = new THREE.LatheGeometry([new THREE.Vector2(0.001, 1.02), new THREE.Vector2(0.14, 1.02), new THREE.Vector2(0.2, 0.92), new THREE.Vector2(0.32, 0.62), new THREE.Vector2(0.44, 0.3), new THREE.Vector2(0.52, 0.05), new THREE.Vector2(0.53, 0.0)], 32);
  const skirt = part(root, geom, IVORY, 0, 0, 0);
  skirt.userData.ownGeometry = true;
  // Tulle tiers and lace sprigs on the skirt, the train behind.
  for (const [r, y] of [[0.45, 0.28], [0.36, 0.55]] as const) part(root, ring(r, 0.012), '#fff3e6', 0, y, 0, { rx: Math.PI / 2, outline: false });
  part(root, rbox(0.7, 0.03, 0.55, 0.015), IVORY, 0, 0.015, -0.6);
  // The bodice, its lace, the sash.
  part(root, rbox(0.27, 0.3, 0.17, 0.08), IVORY, 0, 1.16, 0);
  for (let i = 0; i < 9; i++) part(root, ball(0.011), '#ffffff', -0.08 + (i % 3) * 0.08, 1.08 + Math.floor(i / 3) * 0.08, 0.085, { outline: false, material: glow('#ffffff') });
  part(root, ring(0.14, 0.014), BLUSH, 0, 1.03, 0, { rx: Math.PI / 2, outline: false });
  // Bare shoulders, the arms down to the bouquet at the waist.
  for (const sx of [-1, 1]) {
    part(root, ball(0.05), SKIN, sx * 0.15, 1.33, 0);
    rod(root, new THREE.Vector3(sx * 0.17, 1.32, 0), new THREE.Vector3(sx * 0.2, 1.1, 0.05), 0.033, SKIN);
    rod(root, new THREE.Vector3(sx * 0.2, 1.1, 0.05), new THREE.Vector3(sx * 0.05, 1.0, 0.2), 0.028, SKIN);
    part(root, ball(0.03), SKIN, sx * 0.04, 1.0, 0.21);
  }
  part(root, rbox(0.22, 0.1, 0.12, 0.05), SKIN, 0, 1.34, 0);
  part(root, ring(0.11, 0.008), '#f5f5f5', 0, 1.3, 0.01, { rx: Math.PI / 2 - 0.2, outline: false });
  posy(root, 0, 1.0, 0.27, 0.08, ['#ffffff', '#f8bbd0', '#fff3e0'], 11, 9);
  part(root, cyl(0.016, 0.012, 0.14, 8), STEM, 0, 0.92, 0.25, { rx: 0.3 });
  part(root, cyl(0.04, 0.045, 0.1, 12), SKIN, 0, 1.42, 0);
  const head = headOf(root, { ...BRIDE_TO_BE, long: false });
  head.position.set(0, 1.54, 0.0);
  // The up-do, the tiara, the veil from the comb down the back.
  part(head, ball(0.055), BRIDE_TO_BE.hair, 0, 0.05, -0.085);
  part(head, ring(0.075, 0.006, Math.PI), '#e0c068', 0, 0.06, 0.02, { rx: -0.5, outline: false });
  for (let i = 0; i < 5; i++) part(head, ball(0.009), '#ffffff', -0.05 + i * 0.025, 0.1 + (i === 2 ? 0.015 : 0), 0.03, { outline: false, material: glow('#ffffff') });
  const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.42, 1.25, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9), VEIL);
  veil.userData.ownGeometry = true;
  veil.position.set(0, -0.56, -0.13);
  veil.rotation.x = 0.1;
  veil.renderOrder = 3;
  head.add(veil);
  return { root, skirt, head };
}

// ---------------------------------------------------------------------------------------------
// The chairs.

/** The planner's chair at a consultation table: ivory velvet on a slim gold frame, facing `yaw`. Returns where the seat is. */
function velvetChair(g: THREE.Object3D, x: number, z: number, yaw: number, color = '#f1e4dc') {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = yaw;
  g.add(c);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.014, 0.011, 0.42, 8), GOLD, sx * 0.19, 0.21, sz * 0.18, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.04), color, 0, 0.44, 0);
  part(c, box(0.44, 0.012, 0.42), GOLD, 0, 0.395, 0, { outline: false });
  part(c, rbox(0.42, 0.46, 0.07, 0.05), color, 0, 0.74, -0.2, { rx: -0.08 });
  part(c, ring(0.2, 0.01, Math.PI), GOLD, 0, 0.86, -0.235, { rx: -0.08, outline: false });
  for (const sx of [-1, 1]) rod(c, new THREE.Vector3(sx * 0.19, 0.42, -0.18), new THREE.Vector3(sx * 0.2, 0.9, -0.24), 0.011, GOLD);
  return c;
}

// ---------------------------------------------------------------------------------------------
// The album of the halls, lying open.

const HALLS = ['그랜드볼룸', '가든홀', '채플홀', '한옥 별채'];
const paintPhoto = (i: number): Paint => (c) => {
  c.fillStyle = '#fffdf8';
  c.fillRect(0, 0, 128, 160);
  const x0 = 10;
  const y0 = 12;
  const w = 108;
  const h = 104;
  const sky = ['#1f2a48', '#cfe8c9', '#f5f1ea', '#5d4037'][i];
  c.fillStyle = sky;
  c.fillRect(x0, y0, w, h);
  // The aisle running away to the altar.
  c.fillStyle = i === 3 ? '#d7ccc8' : '#ffffff';
  c.beginPath();
  c.moveTo(x0 + w / 2 - 10, y0 + 40);
  c.lineTo(x0 + w / 2 + 10, y0 + 40);
  c.lineTo(x0 + w / 2 + 34, y0 + h);
  c.lineTo(x0 + w / 2 - 34, y0 + h);
  c.fill();
  if (i === 0) {
    // Chandeliers, flower stands along the aisle.
    for (const cx of [x0 + 26, x0 + 54, x0 + 82]) {
      c.fillStyle = '#ffe082';
      c.beginPath();
      c.arc(cx, y0 + 18, 7, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,224,130,0.35)';
      c.beginPath();
      c.arc(cx, y0 + 18, 13, 0, Math.PI * 2);
      c.fill();
    }
    for (let k = 0; k < 4; k++)
      for (const s of [-1, 1]) {
        c.fillStyle = '#f8bbd0';
        c.beginPath();
        c.arc(x0 + w / 2 + s * (14 + k * 7), y0 + 50 + k * 14, 3 + k, 0, Math.PI * 2);
        c.fill();
      }
  } else if (i === 1) {
    // A white arch on the lawn, chairs either side.
    c.fillStyle = '#7cb342';
    c.fillRect(x0, y0 + 58, w, h - 58);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(x0 + w / 2, y0 + 44, 18, Math.PI, 0);
    c.stroke();
    c.fillStyle = '#f48fb1';
    c.beginPath();
    c.arc(x0 + w / 2 - 14, y0 + 30, 6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++)
      for (const s of [-1, 1]) for (let j = 0; j < 3; j++) c.fillRect(x0 + w / 2 + s * (22 + j * 9 + k * 4) - 3, y0 + 66 + k * 12, 6, 6);
  } else if (i === 2) {
    // A tall arched window of light over the altar, the pews.
    c.fillStyle = '#b3e5fc';
    c.beginPath();
    c.moveTo(x0 + w / 2 - 12, y0 + 40);
    c.lineTo(x0 + w / 2 - 12, y0 + 18);
    c.arc(x0 + w / 2, y0 + 18, 12, Math.PI, 0);
    c.lineTo(x0 + w / 2 + 12, y0 + 40);
    c.fill();
    c.fillStyle = '#8d6e63';
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) c.fillRect(x0 + w / 2 + s * (20 + k * 4) - (s < 0 ? 26 : 0), y0 + 52 + k * 13, 26, 5);
  } else {
    // A hanok's eaves, red lanterns, the courtyard.
    c.fillStyle = '#3e2723';
    c.beginPath();
    c.moveTo(x0, y0 + 30);
    c.quadraticCurveTo(x0 + w / 2, y0 + 10, x0 + w, y0 + 30);
    c.lineTo(x0 + w, y0 + 38);
    c.lineTo(x0, y0 + 38);
    c.fill();
    c.fillStyle = '#a1887f';
    c.fillRect(x0 + 10, y0 + 38, w - 20, 22);
    for (const cx of [x0 + 22, x0 + w - 22]) {
      c.fillStyle = '#e53935';
      c.beginPath();
      c.ellipse(cx, y0 + 50, 6, 8, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.strokeStyle = '#d4af37';
  c.lineWidth = 2;
  c.strokeRect(x0 - 2, y0 - 2, w + 4, h + 4);
  text(c, HALLS[i], 64, 136, 15, '#5d4037', 'center');
};
const paintInfo = (i: number): Paint => (c) => {
  c.fillStyle = '#fffdf8';
  c.fillRect(0, 0, 128, 160);
  text(c, HALLS[i], 64, 22, 16, DEEP, 'center');
  c.fillStyle = '#d4af37';
  c.fillRect(34, 36, 60, 2);
  const rows: Array<[string, string]> = [
    ['보증 인원', ['250명', '150명', '180명', '120명'][i]],
    ['식대', ['66,000원', '58,000원', '62,000원', '72,000원'][i]],
    ['대관료', ['550만', '300만', '400만', '480만'][i]],
    ['예식 간격', ['90분', '단독', '80분', '단독'][i]],
  ];
  rows.forEach(([k, v], j) => {
    text(c, k, 14, 56 + j * 20, 11, '#8d6e63', 'left', false);
    text(c, v, 114, 56 + j * 20, 11, '#3e2723', 'right');
  });
  text(c, '이번 달 계약 시 꽃장식 업그레이드', 64, 144, 9, ROSE, 'center', false);
};
const albumPage = (side: 'L' | 'R', n: number) => {
  const i = ((n % 4) + 4) % 4;
  return side === 'L' ? painted(`wp-album-photo-${i}`, 128, 160, paintPhoto(i)) : painted(`wp-album-info-${i}`, 128, 160, paintInfo(i));
};

/**
 * An album of the halls lying open at (x, y, z), turned `yaw` (its reader at its own +z): a linen
 * cover, the spread, and a leaf turned over the spine by albumRound's clock — the photos of one hall
 * on the left, its prices on the right, a new hall each time round.
 */
function hallAlbum(g: THREE.Object3D, x: number, y: number, z: number, yaw: number) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  g.add(root);
  part(root, rbox(0.55, 0.02, 0.35, 0.008), '#ece3d6', 0, 0.01, 0);
  part(root, box(0.02, 0.022, 0.35), GOLD, 0, 0.012, 0, { outline: false });
  for (const sx of [-1, 1]) part(root, box(0.25, 0.014, 0.32), '#fffdf8', sx * 0.128, 0.027, 0, { outline: false });
  const flat = (tex: THREE.Texture, px: number, parent: THREE.Object3D, y2: number) => picture(parent, tex, 0.23, 0.29, px, y2, 0, '#ffffff', 0, -Math.PI / 2);
  const leftP = flat(albumPage('L', 0), -0.128, root, 0.0345);
  const rightP = flat(albumPage('R', 1), 0.128, root, 0.0345);
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.0355, 0);
  root.add(pivot);
  part(pivot, box(0.245, 0.0015, 0.31), '#fffdf8', 0.125, 0, 0, { outline: false });
  const front = flat(albumPage('R', 0), 0.125, pivot, 0.0012);
  const back = flat(albumPage('L', 1), 0.125, pivot, -0.0012);
  back.rotation.set(Math.PI / 2, 0, Math.PI);
  const map = (m: THREE.Mesh, tex: THREE.Texture) => ((m.material as THREE.MeshBasicMaterial).map = tex);
  let shown = 0;
  return {
    root,
    show(k: { n: number; flip: number }) {
      pivot.rotation.z = k.flip * Math.PI;
      if (k.n === shown) return;
      shown = k.n;
      map(leftP, albumPage('L', k.n));
      map(rightP, albumPage('R', k.n + 1));
      map(front, albumPage('R', k.n));
      map(back, albumPage('L', k.n + 1));
    },
  };
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens and boards.

const COUPLE = '김민준 & 이서연';
const paintBudget: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#1d6f42';
  c.fillRect(0, 0, 256, 18);
  text(c, `결혼 예산표 · ${COUPLE}`, 6, 10, 10, '#ffffff');
  const rows: Array<[string, string, string]> = [
    ['웨딩홀', '1,650', '1,600'],
    ['스튜디오', '220', '210'],
    ['드레스', '300', '320'],
    ['메이크업', '90', '90'],
    ['예물·예단', '500', '450'],
    ['신혼여행', '520', '480'],
  ];
  c.fillStyle = '#e8f5e9';
  c.fillRect(0, 20, 256, 14);
  text(c, '항목', 8, 27, 9, '#2e7d32');
  text(c, '예산(만원)', 150, 27, 9, '#2e7d32', 'right');
  text(c, '견적', 230, 27, 9, '#2e7d32', 'right');
  rows.forEach(([k, a, b], i) => {
    const y = 42 + i * 14;
    c.fillStyle = i % 2 ? '#fafafa' : '#ffffff';
    c.fillRect(0, y - 7, 256, 14);
    text(c, k, 8, y, 9, '#424242', 'left', false);
    text(c, a, 150, y, 9, '#424242', 'right', false);
    text(c, b, 230, y, 9, Number(b.replace(',', '')) > Number(a.replace(',', '')) ? '#c62828' : '#424242', 'right', false);
  });
  c.fillStyle = '#c8e6c9';
  c.fillRect(0, 128, 256, 14);
  text(c, '합계  3,280 / 3,150', 8, 135, 10, '#1b5e20');
  c.fillStyle = '#e0e0e0';
  c.fillRect(8, 148, 240, 6);
  c.fillStyle = '#43a047';
  c.fillRect(8, 148, 230, 6);
};
const paintProfit: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 160);
  text(c, '2026 3분기 수익 점검', 8, 12, 12, '#37474f');
  const bars: Array<[string, number, string]> = [
    ['7월', 62, '#90caf9'],
    ['8월', 48, '#90caf9'],
    ['9월', 88, '#1e88e5'],
  ];
  c.strokeStyle = '#cfd8dc';
  c.beginPath();
  c.moveTo(20, 128);
  c.lineTo(160, 128);
  c.stroke();
  bars.forEach(([m, v, k], i) => {
    c.fillStyle = k;
    c.fillRect(30 + i * 44, 128 - v, 28, v);
    text(c, m, 44 + i * 44, 140, 9, '#546e7a', 'center', false);
  });
  text(c, '계약 42건', 210, 46, 12, '#37474f', 'center');
  text(c, '순이익 +18%', 210, 74, 13, '#2e7d32', 'center');
  text(c, '가을 성수기 ▲', 210, 102, 10, ROSE, 'center', false);
};
const paintVendors: Paint = (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = ROSE;
  c.fillRect(0, 0, 256, 20);
  text(c, '협력 업체 일정 · 11월', 8, 11, 11, '#ffffff');
  const rows: Array<[string, string, boolean]> = [
    ['스튜디오 루미 · 리허설 촬영', '11/02', true],
    ['드레스 라벨르 · 가봉', '11/05', true],
    ['메이크업 · 본식 신부', '11/22', false],
    ['플라워 · 버진로드 장식 입고', '11/22 07:00', false],
    ['스냅 · 본식 2인', '11/22', false],
  ];
  rows.forEach(([k, d, ok], i) => {
    const y = 36 + i * 24;
    c.fillStyle = ok ? '#c8e6c9' : '#fff3e0';
    c.fillRect(6, y - 10, 244, 20);
    text(c, ok ? '✔' : '☐', 14, y, 11, ok ? '#2e7d32' : '#ef6c00');
    text(c, k, 28, y, 10, '#37474f', 'left', false);
    text(c, d, 244, y, 9, '#78909c', 'right', false);
  });
};
const paintQuote: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 160, 112);
  c.fillStyle = BLUSH;
  c.fillRect(0, 0, 160, 18);
  text(c, '스드메 견적서', 80, 10, 11, DEEP, 'center');
  const rows: Array<[string, string]> = [
    ['스튜디오 (앨범 30p)', '210만'],
    ['드레스 (본식+촬영)', '320만'],
    ['메이크업 (본식)', '90만'],
  ];
  rows.forEach(([k, v], i) => {
    text(c, k, 8, 32 + i * 16, 9, '#5d4037', 'left', false);
    text(c, v, 152, 32 + i * 16, 9, '#3e2723', 'right');
  });
  c.fillStyle = '#f5f5f5';
  c.fillRect(6, 82, 148, 20);
  text(c, '패키지가  549만 원', 80, 92, 11, ROSE, 'center');
};
const paintPackages: Paint = (c) => {
  c.fillStyle = '#fff7f9';
  c.fillRect(0, 0, 512, 288);
  c.fillStyle = ROSE;
  c.fillRect(0, 0, 512, 40);
  text(c, '스드메 패키지', 18, 21, 22, '#ffffff');
  text(c, 'STUDIO · DRESS · MAKE-UP', 494, 22, 13, '#ffe4ec', 'right');
  const cols: Array<[string, string]> = [
    ['스튜디오', '#e3f2fd'],
    ['드레스', '#fffaf0'],
    ['메이크업', '#fce4ec'],
  ];
  cols.forEach(([name, bg], i) => {
    const x = 16 + i * 166;
    c.fillStyle = '#ffffff';
    c.fillRect(x, 52, 150, 150);
    c.fillStyle = bg;
    c.fillRect(x + 8, 60, 134, 110);
    // A sample photo: the couple, the gown, a face made up.
    if (i === 0) {
      c.fillStyle = '#263238';
      c.beginPath();
      c.ellipse(x + 58, 108, 13, 16, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x + 44, 122, 28, 48);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(x + 92, 110, 12, 15, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(x + 82, 124);
      c.lineTo(x + 102, 124);
      c.lineTo(x + 116, 170);
      c.lineTo(x + 68, 170);
      c.fill();
    } else if (i === 1) {
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#e0c068';
      c.beginPath();
      c.moveTo(x + 66, 76);
      c.lineTo(x + 84, 76);
      c.lineTo(x + 88, 108);
      c.lineTo(x + 118, 168);
      c.lineTo(x + 32, 168);
      c.lineTo(x + 62, 108);
      c.closePath();
      c.fill();
      c.stroke();
    } else {
      c.fillStyle = '#f3cfb3';
      c.beginPath();
      c.ellipse(x + 75, 116, 30, 38, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3b2a20';
      c.beginPath();
      c.ellipse(x + 75, 92, 34, 22, 0, Math.PI, Math.PI * 2);
      c.fill();
      c.fillStyle = '#c2185b';
      c.fillRect(x + 66, 136, 18, 5);
      c.fillStyle = '#f4a6b4';
      c.beginPath();
      c.arc(x + 58, 124, 6, 0, Math.PI * 2);
      c.arc(x + 92, 124, 6, 0, Math.PI * 2);
      c.fill();
    }
    text(c, name, x + 75, 188, 15, '#5d4037', 'center');
  });
  const tiers: Array<[string, string, string]> = [
    ['베이직', '219만 원', '#f8bbd0'],
    ['프리미엄', '349만 원', '#f48fb1'],
    ['시그니처', '499만 원', '#ad1457'],
  ];
  tiers.forEach(([k, v, bg], i) => {
    const x = 16 + i * 166;
    c.fillStyle = bg;
    c.fillRect(x, 212, 150, 40);
    text(c, k, x + 10, 232, 14, i === 2 ? '#ffffff' : '#5d4037');
    text(c, v, x + 142, 232, 14, i === 2 ? '#ffffff' : '#3e2723', 'right');
  });
  c.fillStyle = '#fff59d';
  c.fillRect(16, 260, 480, 20);
  text(c, '★ 11월 계약 시 본식 스냅 무료 · 원본 전체 제공', 256, 270, 12, '#6d4c41', 'center');
};
const paintSchedule: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 512, 288);
  text(c, '이번 주 예식 일정 · 11월 1주 (토)', 14, 18, 17, '#37474f');
  const halls = ['그랜드볼룸', '가든홀', '채플홀'];
  const times = ['11:00', '12:30', '14:00', '15:30', '17:00'];
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 1.5;
  for (let r = 0; r <= times.length + 1; r++) {
    c.beginPath();
    c.moveTo(10, 36 + r * 40);
    c.lineTo(502, 36 + r * 40);
    c.stroke();
  }
  for (const x of [10, 82, 222, 362, 502]) {
    c.beginPath();
    c.moveTo(x, 36);
    c.lineTo(x, 276);
    c.stroke();
  }
  halls.forEach((h, i) => text(c, h, 152 + i * 140, 56, 14, '#455a64', 'center'));
  times.forEach((t, i) => text(c, t, 46, 96 + i * 40, 14, '#455a64', 'center'));
  const names = [
    ['박지훈 & 윤수아', '', '정우성 & 한소희'],
    ['', '오아린 & 임이안', ''],
    ['김민준 & 이서연', '', '오세훈 & 윤아름'],
    ['', '', ''],
    ['최현우 & 강다인', '송민호 & 백지수', ''],
  ];
  const tag = ['#f8bbd0', '#c8e6c9', '#bbdefb'];
  names.forEach((row, r) =>
    row.forEach((n, i) => {
      if (!n) return;
      c.fillStyle = tag[i];
      c.fillRect(88 + i * 140, 80 + r * 40, 128, 32);
      text(c, n, 152 + i * 140, 96 + r * 40, 13, '#37474f', 'center');
    }),
  );
  // The magnets for the planner on each.
  c.fillStyle = '#e53935';
  for (const [r, i] of [[0, 0], [2, 0], [4, 1]]) {
    c.beginPath();
    c.arc(208 + i * 140, 84 + r * 40, 5, 0, Math.PI * 2);
    c.fill();
  }
};

// ---------------------------------------------------------------------------------------------

/** The consultation table's top, metres. */
const CONSULT_TOP = 0.77;

export const BUILDERS: Record<string, Builder> = {
  /**
   * The consultation table: a white marble top on a slim gold frame, the planner's velvet chair on
   * its front side (set facing the wall, the couple's loveseat across it behind), a vase of peonies,
   * the closed hall albums, a ring box open on its velvet, the business cards. Consulting a couple
   * (consultCouple): the couple drawn on the loveseat across — she in a blush skirt, he in a navy
   * shirt — the hall album open on the table turned round to them, the planner sat across turning
   * its pages over, pointing a photo out and opening up to them as it's talked through (activity.ts
   * albumShow), the tablet stood up with the 스드메 quote; the couple look down at it, at each other,
   * back up. A junior's notes taken on the clipboard, sat at the same place; vendors coordinated on
   * the laptop with their dates up.
   */
  weddingConsult(g, W, _D, _c, _def, _ctx, out) {
    const top = CONSULT_TOP;
    const tz = -0.19;
    const td = 0.62;
    const tw = Math.min(W - 0.24, 1.72);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.018, 0.013, top - 0.03, 8), GOLD, sx * (tw / 2 - 0.07), (top - 0.03) / 2, tz + sz * (td / 2 - 0.07), { outline: false });
    part(g, rbox(tw - 0.1, 0.05, td - 0.1, 0.01), GOLD, 0, top - 0.055, tz);
    part(g, rbox(tw, 0.035, td, 0.012), MARBLE, 0, top - 0.0175, tz);
    const veins = seeded(5);
    for (let i = 0; i < 6; i++) part(g, box(0.18 + veins() * 0.3, 0.001, 0.004), '#ddd3c8', -0.7 + veins() * 1.4, top + 0.0005, tz - 0.25 + veins() * 0.5, { ry: -0.5 + veins(), outline: false });
    // The planner's chair on the front side, turned to the table.
    velvetChair(g, 0, 0.3, Math.PI);
    // A low vase of peonies and eucalyptus at one end, the hall albums closed at the other.
    glass(g, cyl(0.07, 0.06, 0.12, 18), -0.62, top + 0.06, tz - 0.1);
    part(g, cyl(0.065, 0.065, 0.04, 18), '#e3f2fd', -0.62, top + 0.02, tz - 0.1, { outline: false });
    posy(g, -0.62, top + 0.13, tz - 0.1, 0.11, ['#f8bbd0', '#ffffff', '#f48fb1', '#fce4ec'], 3, 10);
    part(g, rbox(0.32, 0.03, 0.24, 0.006), '#ece3d6', 0.6, top + 0.015, tz + 0.02, { ry: 0.12 });
    part(g, rbox(0.3, 0.03, 0.23, 0.006), SAGE, 0.62, top + 0.045, tz + 0.01, { ry: -0.05 });
    label(g, 'WEDDING', 0.12, 0.03, 0.62, top + 0.061, tz + 0.01, SAGE, '#ffffff').rotation.set(-Math.PI / 2, 0, Math.PI - 0.05);
    // The ring box, open on the far side.
    part(g, rbox(0.07, 0.035, 0.07, 0.01), DEEP, 0.35, top + 0.018, tz - 0.2);
    part(g, rbox(0.07, 0.035, 0.012, 0.005), DEEP, 0.35, top + 0.06, tz - 0.235, { rx: -0.5 });
    part(g, ring(0.014, 0.003), GOLD, 0.35, top + 0.045, tz - 0.2, { outline: false });
    part(g, ball(0.007), '#ffffff', 0.35, top + 0.06, tz - 0.2, { outline: false, material: glow('#ffffff') });
    // The cards in their holder.
    part(g, box(0.1, 0.02, 0.05), GOLD, -0.38, top + 0.01, tz + 0.2, { outline: false });
    part(g, box(0.09, 0.05, 0.004), '#ffffff', -0.38, top + 0.035, tz + 0.2, { rx: -0.3, outline: false });
    label(g, '루체 웨딩', 0.16, 0.035, 0, top - 0.055, tz + td / 2 - 0.045, GOLD, '#ffffff');
    // What's out when it's used.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    // The couple across, on the loveseat behind the table (its seats, a tile back).
    const couple = new THREE.Group();
    use.add(couple);
    const her = sitter(couple, 0.44, BRIDE_TO_BE);
    her.root.position.set(0.47, 0, -1.08);
    const him = sitter(couple, 0.44, GROOM_TO_BE);
    him.root.position.set(-0.47, 0, -1.08);
    const albumAt = new THREE.Vector3(0, top + 0.002, tz + 0.04);
    const alb = hallAlbum(use, albumAt.x, albumAt.y, albumAt.z, Math.PI);
    // The tablet on its stand, turned to the couple.
    const tablet = new THREE.Group();
    tablet.position.set(0.6, top + 0.17, tz - 0.06);
    tablet.rotation.set(-0.3, Math.PI - 0.25, 0, 'YXZ');
    use.add(tablet);
    part(tablet, rbox(0.25, 0.18, 0.012, 0.012), '#1c1c1f', 0, 0, 0);
    picture(tablet, painted('wp-quote', 160, 112, paintQuote), 0.23, 0.16, 0, 0, 0.007);
    part(use, box(0.06, 0.09, 0.06), '#bdbdbd', 0.6, top + 0.105, tz - 0.03, { outline: false });
    // The junior's clipboard and pen.
    const clip = new THREE.Group();
    use.add(clip);
    part(clip, rbox(0.23, 0.01, 0.31, 0.006), '#8d6e63', 0.05, top + 0.005, tz + 0.12, { ry: 0.1 });
    part(clip, box(0.2, 0.004, 0.27), '#ffffff', 0.05, top + 0.012, tz + 0.13, { ry: 0.1, outline: false });
    for (let i = 0; i < 7; i++) part(clip, box(0.15, 0.002, 0.005), '#9e9e9e', 0.05, top + 0.015, tz + 0.04 + i * 0.03, { ry: 0.1, outline: false });
    label(clip, '상담 기록지', 0.1, 0.025, 0.05, top + 0.016, tz + 0.02, '#ffffff', DEEP).rotation.set(-Math.PI / 2, 0, 0.1);
    const clipAt = marker(g, 0.04, top + 0.02, tz + 0.14);
    // The laptop with the vendors' dates, the phone beside it.
    const laptop = new THREE.Group();
    use.add(laptop);
    part(laptop, rbox(0.34, 0.015, 0.23, 0.01), '#cfd8dc', 0, top + 0.008, tz + 0.12);
    part(laptop, box(0.3, 0.003, 0.13), '#37474f', 0, top + 0.016, tz + 0.14, { outline: false });
    const lid = new THREE.Group();
    lid.position.set(0, top + 0.015, tz + 0.005);
    lid.rotation.x = -0.25;
    laptop.add(lid);
    part(lid, rbox(0.34, 0.22, 0.01, 0.01), '#cfd8dc', 0, 0.11, 0);
    // Turned to the planner (the table's +z).
    picture(lid, painted('wp-vendors', 256, 160, paintVendors), 0.31, 0.19, 0, 0.11, 0.006);
    part(laptop, rbox(0.07, 0.008, 0.14, 0.01), '#212121', 0.3, top + 0.004, tz + 0.15, { ry: -0.2 });
    const keysAt = marker(g, 0, top + 0.03, tz + 0.17);
    const seat = () => sat(g, 0, 0.48, 0.3, Math.PI);
    const albumWork = marker(g, albumAt.x, albumAt.y + 0.035, albumAt.z);
    const spots: Record<string, Spot> = {
      consultCouple: at(seat(), albumWork, 'albumShow'),
      weddingPlanner_takeNotes: at(seat(), clipAt, 'write'),
      weddingPlanner_coordinateVendors: at(seat(), keysAt, 'type'),
    };
    out.spots = spots;
    out.work = albumWork;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const consult = now === 'consultCouple';
      couple.visible = consult || now === 'weddingPlanner_takeNotes';
      alb.root.visible = tablet.visible = consult;
      clip.visible = now === 'weddingPlanner_takeNotes';
      laptop.visible = now === 'weddingPlanner_coordinateVendors';
      if (consult) alb.show(albumRound(t, phaseAt(spots.consultCouple)));
      // Down at the album, round to each other now and then, back up to the planner.
      const glance = Math.max(0, Math.sin(t * 0.37)) ** 6;
      const upTo = Math.max(0, Math.sin(t * 0.23 + 1.3)) ** 4;
      her.head.rotation.set(0.38 * (1 - upTo) - 0.05 * glance, -0.45 * (1 - glance) + 0.75 * glance, 0);
      him.head.rotation.set(0.36 * (1 - upTo) + 0.04 * Math.sin(t * 1.1), 0.45 * (1 - glance) - 0.6 * glance, 0);
      her.root.rotation.x = 0.05 * (1 - upTo);
    };
  },

  /**
   * The couple's loveseat across the consultation table: blush velvet, a tufted back, rolled arms,
   * gold feet, a pillow either end. A couple waits on it and is consulted from the planner's chair
   * across the table: their wishes heard, a cup of tea in front of each, the reference photos they
   * brought spread out (activity.ts meeting: listening, noting it down); the hall album opened round
   * to them and its pages turned (albumShow).
   */
  wpCoupleSofa(g, W, _D, _c, _def, _ctx, out) {
    for (const sx of [-1, 1]) for (const z of [-0.33, 0.2]) part(g, cyl(0.022, 0.012, 0.12, 8), GOLD, sx * (W / 2 - 0.16), 0.06, z, { outline: false });
    part(g, rbox(W - 0.16, 0.16, 0.64, 0.05), VELVET, 0, 0.2, -0.07);
    for (const x of [-0.44, 0.44]) part(g, rbox(0.86, 0.12, 0.56, 0.05), shade(VELVET, 1.04), x, 0.36, -0.04);
    part(g, rbox(W - 0.18, 0.5, 0.16, 0.07), VELVET, 0, 0.64, -0.33, { rx: -0.1 });
    for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) part(g, ball(0.012), shade(VELVET, 0.78), -0.72 + i * 0.24 + (j % 2) * 0.12, 0.6 + j * 0.15, -0.255 + j * 0.015, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.14, 0.3, 0.62, 0.05), VELVET, sx * (W / 2 - 0.1), 0.34, -0.07);
      part(g, cyl(0.085, 0.085, 0.62, 16), VELVET, sx * (W / 2 - 0.1), 0.5, -0.07, { rx: Math.PI / 2 });
    }
    part(g, rbox(0.3, 0.27, 0.1, 0.05), IVORY, -0.6, 0.56, -0.2, { rx: -0.25, rz: 0.1 });
    part(g, rbox(0.3, 0.27, 0.1, 0.05), SAGE, 0.6, 0.56, -0.2, { rx: -0.25, rz: -0.1 });
    // The planner's place across the table (its chair is the table's), and what's on the table.
    const top = CONSULT_TOP;
    const hear = sat(g, 0, 0.48, 1.3, Math.PI);
    hear.motion = 'meeting';
    const albumAt = new THREE.Vector3(0, top + 0.002, 0.85);
    const show = at(sat(g, 0, 0.48, 1.3, Math.PI), marker(g, 0, top + 0.037, 0.85), 'albumShow');
    const spots: Record<string, Spot> = { 'social:hearWishes': hear, 'social:showPortfolio': show };
    out.spots = spots;
    // Tea for the two of them.
    const tea = new THREE.Group();
    tea.visible = false;
    g.add(tea);
    for (const sx of [-1, 1]) {
      part(tea, cyl(0.06, 0.05, 0.008, 18), '#ffffff', sx * 0.5, top + 0.004, 0.62, { outline: false });
      part(tea, cyl(0.035, 0.03, 0.06, 14), '#ffffff', sx * 0.5, top + 0.038, 0.62);
      part(tea, cyl(0.03, 0.03, 0.004, 14), '#c8a26a', sx * 0.5, top + 0.066, 0.62, { outline: false });
      part(tea, ring(0.016, 0.004), '#ffffff', sx * 0.54, top + 0.04, 0.62, { outline: false });
    }
    // The photos they brought of the wedding they dream of, spread out.
    const refs = new THREE.Group();
    refs.visible = false;
    g.add(refs);
    const tints = ['#c5e1a5', '#f8bbd0', '#fff3e0', '#b3e5fc'];
    tints.forEach((k, i) => {
      const ph = part(refs, box(0.1, 0.002, 0.14), '#ffffff', -0.2 + i * 0.13, top + 0.002 + i * 0.001, 0.8 + (i % 2) * 0.05, { ry: -0.25 + i * 0.17, outline: false });
      part(ph, box(0.085, 0.002, 0.1), k, 0, 0.001, -0.01, { outline: false });
    });
    label(refs, '우리가 꿈꾸는 웨딩', 0.16, 0.03, 0.15, top + 0.004, 0.96, '#fff8e1', DEEP).rotation.set(-Math.PI / 2, 0, 0);
    const alb = hallAlbum(g, albumAt.x, albumAt.y, albumAt.z, Math.PI);
    alb.root.visible = false;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      tea.visible = now !== null;
      refs.visible = now === 'social:hearWishes';
      alb.root.visible = now === 'social:showPortfolio';
      if (alb.root.visible) alb.show(albumRound(t, phaseAt(show)));
    };
  },

  /**
   * The budget desk: a white desk on rose-gold legs with its drawers, a blush office chair. On it the
   * laptop with the couple's budget spreadsheet (예산 against the quotes, an item over in red, the
   * total), the calculator, a clipped stack of quotes, the binder of vendor contracts, a desk
   * calendar counting down to the day, a pen cup and the couple's photo. Sat at, typing; the
   * quarter's profit charted up for the lead's review.
   */
  budgetDesk(g, W, D, _c, _def, _ctx, out) {
    const top = 0.74;
    const d = 0.6;
    const z = -D / 2 + d / 2 + 0.02;
    part(g, rbox(W - 0.06, 0.035, d, 0.012), '#fbfaf8', 0, top, z);
    part(g, rbox(0.34, 0.66, d - 0.06, 0.02), '#f3eeea', W / 2 - 0.21, 0.35, z);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.3, 0.005, 0.01), '#d8cfc8', W / 2 - 0.21, 0.24 + i * 0.2, z + d / 2 - 0.025, { outline: false });
      part(g, box(0.08, 0.012, 0.012), '#d4a28c', W / 2 - 0.21, 0.15 + i * 0.2, z + d / 2 - 0.02, { outline: false });
    }
    for (const sz of [-1, 1]) part(g, cyl(0.014, 0.012, top - 0.02, 8), '#d4a28c', -W / 2 + 0.07, (top - 0.02) / 2, z + sz * (d / 2 - 0.05), { outline: false });
    // The chair, turned to the desk.
    const ch = new THREE.Group();
    ch.position.set(0, 0, 0.3);
    ch.rotation.y = Math.PI;
    g.add(ch);
    starBase(ch, 0, 0, 0.24, '#d4a28c');
    part(ch, cyl(0.025, 0.025, 0.3, 10), CHROME, 0, 0.27, 0, { outline: false });
    part(ch, rbox(0.46, 0.08, 0.44, 0.04), '#f2c7cf', 0, 0.44, 0);
    part(ch, rbox(0.42, 0.44, 0.07, 0.05), '#f2c7cf', 0, 0.75, -0.21, { rx: -0.1 });
    out.seat = marker(g, 0, 0.48, 0.3);
    // The laptop.
    const lx = -0.08;
    part(g, rbox(0.34, 0.015, 0.23, 0.01), '#cfd8dc', lx, top + 0.025, z + 0.1);
    part(g, box(0.3, 0.003, 0.13), '#37474f', lx, top + 0.034, z + 0.12, { outline: false });
    const lid = new THREE.Group();
    lid.position.set(lx, top + 0.032, z - 0.015);
    lid.rotation.x = -0.25;
    g.add(lid);
    part(lid, rbox(0.34, 0.22, 0.01, 0.01), '#cfd8dc', 0, 0.11, 0);
    out.screen = litScreen(lid, painted('wp-budget', 256, 160, paintBudget), 0.31, 0.19, 0, 0.11, 0.007);
    // The quarter's profit, over the spreadsheet while it's reviewed.
    const use = new THREE.Group();
    lid.add(use);
    out.inUse = use;
    const profit = picture(use, painted('wp-profit', 256, 160, paintProfit), 0.31, 0.19, 0, 0.11, 0.0125);
    profit.visible = false;
    for (const [i, k] of ['#fff59d', '#f8bbd0'].entries()) part(lid, box(0.04, 0.04, 0.002), k, 0.15 - i * 0.05, 0.2, 0.008, { rz: 0.1 - i * 0.2, outline: false });
    const keysAt = marker(g, lx, top + 0.04, z + 0.13);
    // The calculator, the quotes, the contracts' binder, the calendar, the pens, the photo.
    part(g, rbox(0.09, 0.015, 0.14, 0.008), '#455a64', 0.24, top + 0.025, z + 0.14, { ry: -0.2 });
    part(g, box(0.07, 0.003, 0.03), '#c5e1a5', 0.247, top + 0.034, z + 0.09, { ry: -0.2, outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.06, 0.003, 0.012), '#eceff1', 0.235, top + 0.034, z + 0.125 + i * 0.013, { ry: -0.2, outline: false });
    for (let i = 0; i < 5; i++) part(g, box(0.21, 0.004, 0.29), i % 2 ? '#ffffff' : '#fafafa', 0.27, top + 0.02 + i * 0.005, z - 0.12, { ry: 0.08 + i * 0.03, outline: false });
    part(g, box(0.05, 0.02, 0.02), BLACK, 0.27, top + 0.045, z - 0.255, { outline: false });
    label(g, '견적서', 0.08, 0.025, 0.27, top + 0.046, z - 0.13, '#ffffff', '#5d4037').rotation.set(-Math.PI / 2, 0, 0.1);
    part(g, rbox(0.06, 0.3, 0.24, 0.01), ROSE, -0.36, top + 0.17, z - 0.17);
    label(g, '업체 계약서', 0.2, 0.04, -0.324, top + 0.17, z - 0.17, ROSE, '#ffffff', Math.PI / 2).rotation.z = Math.PI / 2;
    const cal = new THREE.Group();
    cal.position.set(0.15, top + 0.02, z - 0.2);
    cal.rotation.y = -0.3;
    g.add(cal);
    part(cal, box(0.14, 0.1, 0.004), '#ffffff', 0, 0.05, 0.015, { rx: -0.3 });
    part(cal, box(0.14, 0.1, 0.004), '#eeeeee', 0, 0.05, -0.015, { rx: 0.3 });
    label(cal, 'D-87', 0.1, 0.05, 0, 0.055, 0.03, '#ffffff', ROSE).rotation.x = -0.3;
    part(g, cyl(0.03, 0.03, 0.09, 12), '#f3e5f5', -0.38, top + 0.06, z + 0.12);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(-0.38, top + 0.06, z + 0.12), new THREE.Vector3(-0.38 + (i - 1) * 0.015, top + 0.17, z + 0.12 + (i % 2) * 0.01), 0.004, ['#212121', ROSE, GOLD][i]);
    const fr = new THREE.Group();
    fr.position.set(-0.26, top + 0.02, z - 0.03);
    fr.rotation.set(-0.15, 0.4, 0, 'YXZ');
    g.add(fr);
    part(fr, box(0.1, 0.13, 0.012), GOLD, 0, 0.065, 0);
    part(fr, box(0.08, 0.11, 0.004), '#fce4ec', 0, 0.065, 0.007, { outline: false });
    part(fr, ball(0.012), '#3b2a20', -0.015, 0.08, 0.01, { outline: false });
    part(fr, ball(0.012), '#1f1a17', 0.015, 0.08, 0.01, { outline: false });
    const spots: Record<string, Spot> = {
      planBudget: at(sat(g, 0, 0.48, 0.3, Math.PI), keysAt, 'type'),
      weddingPlanner_reviewProfit: at(sat(g, 0, 0.48, 0.3, Math.PI), keysAt, 'type'),
    };
    out.spots = spots;
    out.work = keysAt;
    out.animate = (t) => {
      profit.visible = nowAt(spots, t) === 'weddingPlanner_reviewProfit';
    };
  },

  /**
   * The decor sample table: a floor-length linen cloth with a blush runner. On the left, the model of
   * the hall set for the day — the aisle runner, rows of gold chairs, a little arch at the end, flower
   * stands along the aisle (put in one at a time when the ceremony's styled: stood at the model, set
   * in with the fingers); on the right a centrepiece sample — a tall glass vase under a crown of
   * flowers, votives lit — a fan of colour cards, a book of swatches, ribbon spools. A bouquet is
   * designed here too: a sample made up in the hand from the stems laid out (activity.ts floristry).
   */
  decorSample(g, W, D, _c, _def, _ctx, out) {
    const top = 0.78;
    const d = 0.62;
    const z = -D / 2 + d / 2 + 0.03;
    part(g, rbox(W - 0.08, top - 0.02, d + 0.02, 0.01), LINEN, 0, (top - 0.02) / 2 + 0.01, z);
    part(g, rbox(W - 0.06, 0.03, d + 0.04, 0.01), LINEN, 0, top - 0.015, z);
    for (let i = 0; i < 9; i++) part(g, box(0.006, top - 0.08, 0.004), '#efe8de', -W / 2 + 0.15 + i * ((W - 0.3) / 8), (top - 0.08) / 2 + 0.03, z + d / 2 + 0.013, { outline: false });
    part(g, box(0.36, 0.004, d + 0.06), BLUSH, 0.42, top + 0.002, z, { outline: false });
    part(g, box(0.36, 0.3, 0.004), BLUSH, 0.42, top - 0.15, z + d / 2 + 0.03, { outline: false });
    // The model of the hall.
    const mx = -0.45;
    part(g, rbox(0.78, 0.03, 0.5, 0.008), '#ffffff', mx, top + 0.015, z);
    part(g, box(0.12, 0.003, 0.44), IVORY, mx, top + 0.032, z, { outline: false });
    for (const sx of [-1, 1])
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 2; k++) {
          const cx = mx + sx * (0.12 + k * 0.07);
          const cz = z - 0.08 + r * 0.075;
          part(g, box(0.035, 0.03, 0.03), GOLD, cx, top + 0.047, cz, { outline: false });
          part(g, box(0.035, 0.04, 0.006), GOLD, cx, top + 0.07, cz + 0.014, { outline: false });
        }
    part(g, ring(0.1, 0.008, Math.PI), '#ffffff', mx, top + 0.035, z - 0.19);
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI;
      bloom(g, mx + Math.cos(a) * 0.1, top + 0.035 + Math.sin(a) * 0.1, z - 0.19, i % 2 ? '#ffffff' : BLUSH, 0.016);
    }
    label(g, '그랜드볼룸 연출안 B', 0.3, 0.03, mx, top + 0.015, z + 0.251, '#ffffff', DEEP);
    // The flower stands along the aisle: all four pairs out, or put in one by one while styled.
    const stand = (p: THREE.Object3D, i: number) => {
      for (const sx of [-1, 1]) {
        const sz = z + 0.17 - i * 0.09;
        part(p, cyl(0.007, 0.009, 0.07, 8), '#ffffff', mx + sx * 0.075, top + 0.068, sz, { outline: false });
        bloom(p, mx + sx * 0.075, top + 0.11, sz, i % 2 ? BLUSH : '#ffffff', 0.016);
      }
    };
    const full = new THREE.Group();
    g.add(full);
    out.idle = full;
    for (let i = 0; i < 4; i++) stand(full, i);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const styling = new THREE.Group();
    use.add(styling);
    const staged = [0, 1, 2, 3].map((i) => {
      const s = new THREE.Group();
      styling.add(s);
      stand(s, i);
      return s;
    });
    // The centrepiece sample.
    const cx = 0.62;
    const cz = z - 0.14;
    glass(g, cyl(0.06, 0.05, 0.36, 18), cx, top + 0.18, cz);
    part(g, cyl(0.05, 0.05, 0.12, 18), '#e3f2fd', cx, top + 0.06, cz, { outline: false });
    part(g, cyl(0.03, 0.03, 0.03, 12), '#fffaf0', cx, top + 0.13, cz, { outline: false });
    posy(g, cx, top + 0.37, cz, 0.13, FLOWERS, 21, 12);
    for (let i = 0; i < 3; i++) {
      const a = 0.4 + i * 0.5;
      part(g, rbox(0.012, 0.18, 0.012, 0.004), LEAF, cx + Math.cos(a) * 0.12, top + 0.3, cz + Math.sin(a) * 0.08, { rz: 0.4 - i * 0.3, outline: false });
    }
    for (const [vx, vz] of [[cx - 0.17, cz + 0.06], [cx + 0.2, cz + 0.08], [cx - 0.06, cz + 0.16]] as const) {
      glass(g, cyl(0.025, 0.025, 0.05, 12), vx, top + 0.025, vz);
      glowing(g, ball(0.008), '#ffcc80', vx, top + 0.055, vz);
    }
    // The colour cards fanned, the swatch book, the ribbon spools.
    const fan = new THREE.Group();
    fan.position.set(0.12, top + 0.004, z + 0.05);
    g.add(fan);
    ['#f8bbd0', '#a5c49a', '#fffaf0', '#d4af37', '#b3c7e6', '#e1bee7'].forEach((k, i) => part(fan, box(0.04, 0.002, 0.16), k, 0, i * 0.002, 0, { ry: -0.5 + i * 0.2, outline: false }).translateZ(-0.06));
    part(g, rbox(0.22, 0.02, 0.16, 0.006), '#8d6e63', 0.18, top + 0.012, z - 0.2, { ry: 0.15 });
    for (let i = 0; i < 5; i++) part(g, box(0.035, 0.004, 0.14), ['#ffffff', '#f8bbd0', '#ffe0b2', '#e8f5e9', '#d7ccc8'][i], 0.1 + i * 0.04, top + 0.024, z - 0.2, { ry: 0.15, outline: false });
    rod(g, new THREE.Vector3(-0.03, top + 0.07, z - 0.25), new THREE.Vector3(-0.03, top + 0.07, z - 0.05), 0.004, GOLD);
    for (let i = 0; i < 3; i++) part(g, cyl(0.035, 0.035, 0.04, 14), [BLUSH, SAGE, IVORY][i], -0.03, top + 0.07, z - 0.22 + i * 0.07, { rx: Math.PI / 2 });
    for (const sz of [-0.27, -0.03]) part(g, box(0.01, 0.07, 0.01), GOLD, -0.03, top + 0.035, z + sz, { outline: false });
    // A bouquet designed at the front of the right half.
    const bx = 0.5;
    const yaw = Math.PI;
    const P = new THREE.Vector3(bx, 1.02, 0.2);
    const kit = floralKit(use, P, yaw, false, ['#ffffff', '#f8bbd0', '#fff3e0']);
    const modelAt = marker(g, mx, top + 0.08, z + 0.05);
    const spots: Record<string, Spot> = {
      styleCeremony: at(spot(g, 'stand', mx, 0, 0.5, Math.PI), modelAt, 'tinker'),
      weddingPlanner_designBouquet: at(spot(g, 'stand', bx, 0, 0.52, yaw), marker(g, P.x, P.y, P.z), 'floristry'),
    };
    out.spots = spots;
    out.work = modelAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const bouquet = now === 'weddingPlanner_designBouquet';
      kit.root.visible = bouquet;
      if (bouquet) kit.show(t, phaseAt(spots.weddingPlanner_designBouquet));
      // Each pair set in after the last, the four in 12 s, and a moment's look at them all.
      const n = Math.floor(((t / 3) % 5) + 0.0001);
      staged.forEach((s, i) => (s.visible = bouquet || i < n));
    };
  },

  /**
   * The florist's table (the wedding consultancy's and the greenhouse's): a thick oak top on black
   * steel legs, galvanised buckets of flowers on the shelf under it, a roll of kraft paper on its
   * holder along the back, ribbon on a rod, a vase with the start of an arrangement. Arranging flowers
   * in the vase: stems taken one by one from those laid out, set into it round its mouth, the
   * arrangement trimmed with the snips (activity.ts floralArrange). A wedding bouquet hand-tied: held
   * in the left hand, a stem at a time added, the ends cut level (floristry). Wrapping a bouquet: it
   * lies on a sheet of kraft paper whose sides are folded up round it and tied with a ribbon.
   */
  flowerTable(g, W, D, _c, _def, _ctx, out) {
    const top = 0.78;
    const d = 0.62;
    const z = -D / 2 + d / 2 + 0.03;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, top - 0.05, 0.04), BLACK, sx * (W / 2 - 0.08), (top - 0.05) / 2, z + sz * (d / 2 - 0.05));
    part(g, rbox(W - 0.06, 0.06, d, 0.012), OAK, 0, top - 0.03, z);
    part(g, rbox(W - 0.16, 0.03, d - 0.1, 0.008), '#455a64', 0, 0.16, z);
    // Buckets of flowers on the shelf under.
    const rnd = seeded(13);
    for (const [i, bx] of [-0.62, 0, 0.62].entries()) {
      part(g, cyl(0.12, 0.1, 0.24, 16), '#b0bec5', bx, 0.295, z);
      part(g, ring(0.12, 0.008), '#90a4ae', bx, 0.415, z, { rx: Math.PI / 2, outline: false });
      const col = [['#ffffff', '#fff3e0'], ['#f48fb1', BLUSH], ['#e1bee7', '#ffffff']][i];
      for (let k = 0; k < 6; k++) {
        const a = rnd() * Math.PI * 2;
        const h = 0.5 + rnd() * 0.12;
        rod(g, new THREE.Vector3(bx, 0.3, z), new THREE.Vector3(bx + Math.cos(a) * 0.08, h, z + Math.sin(a) * 0.06), 0.004, STEM);
        bloom(g, bx + Math.cos(a) * 0.08, h + 0.02, z + Math.sin(a) * 0.06, col[k % 2], 0.03);
      }
    }
    // The paper roll along the back, the ribbon on its rod at the end.
    for (const x of [0.1, 0.78]) part(g, box(0.02, 0.12, 0.06), BLACK, x, top + 0.06, z - 0.24, { outline: false });
    part(g, cyl(0.055, 0.055, 0.66, 16), KRAFT, 0.44, top + 0.085, z - 0.24, { rz: Math.PI / 2 });
    part(g, box(0.6, 0.002, 0.12), KRAFT, 0.44, top + 0.002, z - 0.14, { outline: false });
    rod(g, new THREE.Vector3(-0.92, top + 0.12, z - 0.26), new THREE.Vector3(-0.92, top + 0.12, z - 0.04), 0.005, CHROME);
    for (let i = 0; i < 3; i++) part(g, cyl(0.03, 0.03, 0.035, 14), [ROSE, IVORY, SAGE][i], -0.92, top + 0.12, z - 0.22 + i * 0.07, { rx: Math.PI / 2 });
    for (const sz of [-0.27, -0.03]) part(g, box(0.01, 0.12, 0.01), CHROME, -0.92, top + 0.06, z + sz, { outline: false });
    // The vase, the start of an arrangement in it.
    const vx = -0.45;
    const vz = 0.05;
    part(g, cyl(0.075, 0.055, 0.2, 20), '#eceff1', vx, top + 0.1, vz);
    part(g, ring(0.075, 0.008), '#cfd8dc', vx, top + 0.2, vz, { rx: Math.PI / 2, outline: false });
    posy(g, vx, top + 0.22, vz, 0.09, ['#ffffff', '#f8bbd0', '#ffe0b2'], 31, 6);
    // Cut leaves and stem ends lying about; the snips resting; a sign.
    for (let i = 0; i < 6; i++) leaf(g, 0.02 + rnd() * 0.22, top + 0.004, z + 0.1 + rnd() * 0.1, rnd() * 3, i % 2 ? LEAF : SAGE, 0.7);
    label(g, '오늘의 꽃 · 작약 · 장미 · 유칼립투스', 0.7, 0.05, 0, top - 0.03, z + d / 2 + 0.002, OAK, '#ffffff');
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const yaw = Math.PI;
    const vaseAt = new THREE.Vector3(vx, top + 0.2, vz);
    const arrange = floralKit(use, vaseAt, yaw, true, ['#f48fb1', '#ffffff', '#fff3e0']);
    const bx = 0.45;
    const bindAt = new THREE.Vector3(bx, 1.02, 0.2);
    const tie = floralKit(use, bindAt, yaw, false, ['#ffffff', '#f8bbd0', '#ffe0b2']);
    // Wrapping: a bouquet lying on a sheet of kraft paper, its sides folding up round it, the ribbon.
    const wrap = new THREE.Group();
    wrap.position.set(bx, top + 0.003, -0.02);
    use.add(wrap);
    part(wrap, box(0.42, 0.002, 0.4), KRAFT, 0, 0, 0, { outline: false });
    const lying = new THREE.Group();
    lying.position.set(0, 0.05, -0.02);
    lying.rotation.x = Math.PI / 2;
    wrap.add(lying);
    posy(lying, 0, 0.06, 0, 0.08, ['#ffffff', '#f8bbd0', '#fff3e0'], 41, 8);
    part(lying, cyl(0.026, 0.02, 0.22, 10), STEM, 0, -0.1, 0);
    const wings = [-1, 1].map((sx) => {
      const h = new THREE.Group();
      h.position.set(sx * 0.1, 0.002, 0);
      wrap.add(h);
      part(h, box(0.2, 0.002, 0.38), shade(KRAFT, 0.95), sx * 0.1, 0, 0, { outline: false });
      return { h, sx };
    });
    const bow = new THREE.Group();
    bow.position.set(0, 0.06, 0.12);
    wrap.add(bow);
    for (const sx of [-1, 1]) part(bow, ball(0.025), ROSE, sx * 0.025, 0, 0, { outline: false }).scale.set(1.2, 0.5, 0.7);
    part(bow, box(0.012, 0.004, 0.08), ROSE, 0, -0.005, 0.04, { outline: false });
    const wrapAt = marker(g, bx, top + 0.08, 0.0);
    const arrangeSpot = at(spot(g, 'stand', vx, 0, 0.45, yaw), marker(g, vaseAt.x, vaseAt.y, vaseAt.z), 'floralArrange');
    const spots: Record<string, Spot> = {
      arrangeFlowers: arrangeSpot,
      gardener_weddingBouquet: at(spot(g, 'stand', bx, 0, 0.52, yaw), marker(g, bindAt.x, bindAt.y, bindAt.z), 'floristry'),
      wrapBouquet: at(spot(g, 'stand', bx, 0, 0.45, yaw), wrapAt, 'tinker'),
      '*': arrangeSpot,
    };
    out.spots = spots;
    out.work = wrapAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const arranging = now === 'arrangeFlowers' || now === '*';
      arrange.root.visible = arranging;
      if (arranging) arrange.show(t, phaseAt(arrangeSpot));
      tie.root.visible = now === 'gardener_weddingBouquet';
      if (tie.root.visible) tie.show(t, phaseAt(spots.gardener_weddingBouquet));
      wrap.visible = now === 'wrapBouquet';
      if (wrap.visible) {
        const u = (t / 10) % 1;
        const fold = THREE.MathUtils.smoothstep(u, 0.1, 0.6);
        for (const { h, sx } of wings) h.rotation.z = -sx * fold * 1.25;
        bow.visible = u > 0.7;
        bow.scale.setScalar(THREE.MathUtils.smoothstep(u, 0.7, 0.8));
      }
    };
  },

  /**
   * 본식 출장 준비대 (ceremonyArch, 2 × 1, against the office wall; 2026-11-05, the layout audit: the ceremony arch stood on the lawn out
   * front, but a ceremony is run at the 웨딩홀, not at the planner's): a photo of a partner hall's aisle framed on the wall, a white
   * model of the hall on the console under it, the week's 본식 list; the planner's go-bag — the cue sheet and the headset on their
   * stand, the emergency kit (sewing kit, safety pins, tissues) — which goes with them when they leave to run a ceremony.
   */
  ceremonyArch(g, W, D, _c, _def, _ctx, out) {
    const bz = -D / 2 + 0.04;
    // The photo: the aisle of white flowers to the arch, lit.
    part(g, box(1.3, 0.9, 0.04), GOLD, -0.2, 1.65, bz);
    picture(g, painted('wpHallPhoto', 260, 180, (c) => {
      c.fillStyle = '#3e2f3a';
      c.fillRect(0, 0, 260, 180);
      c.fillStyle = '#f5ece6';
      c.beginPath();
      c.moveTo(110, 60);
      c.lineTo(150, 60);
      c.lineTo(230, 180);
      c.lineTo(30, 180);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(130, 70, 34, Math.PI, 0);
      c.stroke();
      for (let i = 0; i < 6; i++) {
        c.fillStyle = i % 2 ? '#f8bbd0' : '#ffffff';
        c.beginPath();
        c.arc(40 + i * 8, 170 - i * 20, 9, 0, Math.PI * 2);
        c.arc(220 - i * 8, 170 - i * 20, 9, 0, Math.PI * 2);
        c.fill();
      }
      text(c, '라온 웨딩홀 · 그랜드볼룸', 130, 22, 16, '#ffe9b0', 'center');
    }), 1.22, 0.82, -0.2, 1.65, bz + 0.025);
    // The console and the model on it: a white hall with its aisle, chairs either side, the arch at the end.
    part(g, rbox(W - 0.2, 0.06, 0.5, 0.01), MARBLE, 0, 0.8, -0.18);
    for (const sx of [-1, 1]) part(g, box(0.05, 0.78, 0.4), GOLD, sx * (W / 2 - 0.2), 0.39, -0.18, { outline: false });
    const mx = -0.35;
    part(g, box(0.7, 0.03, 0.36), '#ffffff', mx, 0.845, -0.18);
    part(g, box(0.12, 0.004, 0.3), BLUSH, mx, 0.862, -0.18, { outline: false });
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) part(g, box(0.18, 0.03, 0.03), '#eceff1', mx + sx * 0.18, 0.875, -0.3 + i * 0.07, { outline: false });
    part(g, ring(0.07, 0.008, Math.PI), '#ffffff', mx, 0.87, -0.34, { outline: false });
    label(g, '예식장 모형', 0.2, 0.04, mx, 0.84, 0.0, MARBLE, DEEP);
    // The week's ceremonies pinned up beside the photo.
    part(g, box(0.36, 0.5, 0.01), '#ffffff', 0.72, 1.6, bz + 0.01);
    label(g, '이번 주 본식', 0.3, 0.06, 0.72, 1.78, bz + 0.02, '#ffffff', DEEP);
    for (let i = 0; i < 5; i++) part(g, box(0.28, 0.015, 0.004), i % 2 ? '#bdbdbd' : BLUSH, 0.72, 1.68 - i * 0.07, bz + 0.02, { outline: false });
    // The go-bag: the cue sheet and headset on their stand, the emergency kit beside.
    const kit = new THREE.Group();
    g.add(kit);
    const kx = 0.45;
    const kz = -0.12;
    part(kit, rbox(0.2, 0.28, 0.012, 0.006), '#8d6e63', kx, 0.98, kz, { rx: -0.6 });
    part(kit, box(0.17, 0.24, 0.004), '#ffffff', kx, 0.985, kz + 0.008, { rx: -0.6, outline: false });
    label(kit, '본식 큐시트', 0.14, 0.03, kx, 1.04, kz + 0.05, '#ffffff', DEEP).rotation.x = -0.6;
    part(kit, ring(0.05, 0.008, Math.PI), BLACK, kx + 0.2, 0.88, kz, { outline: false });
    part(kit, rbox(0.22, 0.12, 0.14, 0.02), ROSE, kx - 0.08, 0.89, kz - 0.12);
    label(kit, '비상 키트', 0.12, 0.035, kx - 0.08, 0.89, kz - 0.049, ROSE, '#ffffff');
    const cue = marker(g, kx, 0.98, kz + 0.04);
    out.work = cue;
    out.spots = { '*': at(facing(g, kx - 0.2, 0.55, cue.position), cue, 'read') };
    out.away = (isOut) => {
      kit.visible = !isOut;
    };
  },
  /** 안내 데스크 (2 × 1): a white counter with a gold band and the company's name, a vase of peonies, the visitors' book. */
  wpFrontDesk(g, W) {
    part(g, rbox(W - 0.1, 1.0, 0.55, 0.04), '#ffffff', 0, 0.5, -0.05);
    part(g, box(W - 0.12, 0.05, 0.56), GOLD, 0, 0.75, -0.05, { outline: false });
    part(g, rbox(W, 0.05, 0.65, 0.02), MARBLE, 0, 1.03, -0.05);
    label(g, '채움 웨딩', 0.6, 0.14, 0, 0.55, 0.23, '#ffffff', DEEP);
    posy(g, -0.6, 1.2, -0.12, 0.12, FLOWERS, 31, 9);
    part(g, cyl(0.06, 0.08, 0.16, 14), '#eceff1', -0.6, 1.11, -0.12);
    part(g, box(0.3, 0.02, 0.22), '#8d6e63', 0.35, 1.065, -0.02);
    part(g, box(0.28, 0.006, 0.2), '#ffffff', 0.35, 1.077, -0.02, { outline: false });
  },
  /** The front on the street: the glass, the sign, the posters (shopFront.ts). */
  wpFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 18, door: 12, name: '채움 웨딩', sub: '웨딩 컨설팅 · 스드메 · 웨딩홀 상담', bg: '#fce4ec', fg: DEEP, frame: '#bdbdbd', awning: '#f8bbd0', posters: [['스드메 패키지 상담', '#ffffff', DEEP, 4.5], ['가을 웨딩홀 투어', '#fff8e1', DEEP, 8.5], ['예비 부부 상담 예약', '#ffffff', ROSE, 14.5]], solid: [[16, 17]] });
  },

  // -------------------------------------------------------------------------------------------
  // What the 웨딩 컨설팅 was missing.

  /**
   * The 스드메 package board: a big board on the wall in a white and gold frame — the three columns
   * of studio, dress and make-up with a sample photo each, the three package tiers and their prices,
   * this month's offer — over a slim console with the brochures stood up, a box of sample photo
   * cards and a posy. The samples are swapped: the box open, a new photo pinned up.
   */
  wpPackageBoard(g, W, D, _c, _def, _ctx, out) {
    const bw = Math.min(W - 0.2, 1.76);
    const bz = -D / 2 + 0.04;
    part(g, rbox(bw + 0.08, 1.04, 0.04, 0.01), '#fffaf5', 0, 1.5, bz);
    part(g, box(bw + 0.09, 0.02, 0.045), GOLD, 0, 2.02, bz, { outline: false });
    part(g, box(bw + 0.09, 0.02, 0.045), GOLD, 0, 0.98, bz, { outline: false });
    picture(g, painted('wp-packages', 512, 288, paintPackages), bw, bw * (288 / 512), 0, 1.5, bz + 0.022);
    for (let i = 0; i < 3; i++) part(g, ball(0.012), ROSE, -bw / 2 + 0.12 + i * (bw / 3.05) + 0.2, 1.84, bz + 0.03, { outline: false });
    // The console.
    const cz = -D / 2 + 0.2;
    part(g, rbox(1.3, 0.035, 0.24, 0.01), '#ffffff', 0, 0.82, cz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.012, 0.01, 0.8, 8), GOLD, sx * 0.6, 0.4, cz + sz * 0.09, { outline: false });
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Group();
      s.position.set(-0.45 + i * 0.18, 0.84, cz);
      s.rotation.x = -0.3;
      g.add(s);
      part(s, box(0.13, 0.19, 0.004), ['#fce4ec', '#fffaf0', '#e8f5e9'][i], 0, 0.1, 0);
      label(s, ['스튜디오', '드레스', '메이크업'][i], 0.1, 0.025, 0, 0.16, 0.003, ['#fce4ec', '#fffaf0', '#e8f5e9'][i], DEEP);
    }
    // The box of photo cards.
    part(g, rbox(0.26, 0.07, 0.17, 0.008), '#f3e5f5', 0.32, 0.875, cz);
    for (let i = 0; i < 6; i++) part(g, box(0.008, 0.1, 0.13), ['#ffffff', '#fce4ec', '#e3f2fd'][i % 3], 0.22 + i * 0.035, 0.9, cz, { rz: 0.15, outline: false });
    part(g, cyl(0.03, 0.035, 0.1, 12), '#ffffff', 0.55, 0.89, cz);
    posy(g, 0.55, 0.96, cz, 0.05, ['#ffffff', BLUSH], 61, 5);
    // In use: the lid off, a new photo pinned up in the dress column.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, rbox(0.27, 0.02, 0.18, 0.008), '#f3e5f5', 0.32, 0.85, cz + 0.2, { ry: 0.3 });
    const card = new THREE.Group();
    card.position.set(0.12, 1.6, bz + 0.03);
    use.add(card);
    part(card, box(0.12, 0.16, 0.004), '#ffffff', 0, 0, 0);
    part(card, box(0.1, 0.12, 0.002), '#fff3e0', 0, 0.01, 0.003, { outline: false });
    part(card, ball(0.01), ROSE, 0, 0.07, 0.006, { outline: false });
    const pinAt = marker(g, 0.12, 1.55, bz + 0.04);
    out.work = pinAt;
    out.spots = { '*': at(spot(g, 'stand', 0.1, 0, cz + 0.42, Math.PI), pinAt, 'rummage') };
    out.animate = (t) => {
      card.rotation.z = 0.04 * Math.sin(t * 1.7);
    };
  },

  /**
   * The week's ceremony schedule: a whiteboard on the wall ruled into the halls and the times, the
   * couples' names on coloured tags, red magnets on the ceremonies the planner has; its marker tray
   * with the markers. A day's line is written in: stood at it, the marker drawing along the empty
   * slot (activity.ts penDraw), the line growing behind the nib, the next under it.
   */
  wpScheduleBoard(g, W, D, _c, _def, _ctx, out) {
    const bw = Math.min(W - 0.16, 1.8);
    const bh = bw * (288 / 512);
    const bz = -D / 2 + 0.04;
    const by = 1.45;
    part(g, rbox(bw + 0.06, bh + 0.06, 0.03, 0.01), '#cfd8dc', 0, by, bz);
    picture(g, painted('wp-schedule', 512, 288, paintSchedule), bw, bh, 0, by, bz + 0.017);
    part(g, rbox(bw * 0.6, 0.03, 0.07, 0.008), '#b0bec5', 0, by - bh / 2 - 0.05, bz + 0.04);
    for (let i = 0; i < 4; i++) part(g, cyl(0.009, 0.009, 0.12, 8), ['#1565c0', '#c62828', '#2e7d32', '#212121'][i], -0.2 + i * 0.06, by - bh / 2 - 0.03, bz + 0.05, { rz: Math.PI / 2 });
    // The empty slot (가든홀, 15:30) the lines go in, as the board's painted.
    const px = (u: number) => -bw / 2 + (u / 512) * bw;
    const py = (v: number) => by + bh / 2 - (v / 288) * bh;
    const x0 = px(236);
    const x1 = px(346);
    const rows = [py(204), py(214), py(224)];
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const lines = rows.map((y) => {
      const l = part(use, box(1, 0.006, 0.002), '#1565c0', x0, y, bz + 0.02, { outline: false });
      l.scale.x = 0.001;
      return l;
    });
    const nib = marker(g, x0, rows[0], bz + 0.02);
    const sp = facing(g, (x0 + x1) / 2 + 0.12, bz + 0.42, new THREE.Vector3((x0 + x1) / 2, 0, bz));
    out.spots = { '*': at(sp, nib, 'penDraw') };
    out.work = nib;
    out.animate = (t) => {
      const u = (t / 12) % 1;
      const r = Math.min(2, Math.floor(u * 3.3));
      const k = THREE.MathUtils.clamp(u * 3.3 - r, 0, 1);
      lines.forEach((l, i) => {
        const len = (x1 - x0) * (i < r ? 1 : i === r ? k : 0);
        l.scale.x = Math.max(0.001, len);
        l.position.x = x0 + len / 2;
      });
      nib.position.set(x0 + (x1 - x0) * k, rows[r], bz + 0.02);
    };
  },

  /**
   * The hall album and invitation cabinet in the lobby: white with gold trim; above, open shelves of
   * the halls' albums with their names on the spines and framed photos of the halls; on the counter
   * a stepped stand of invitation samples — ivory, blush, sage, navy and gold, some sealed with wax —
   * under a little sign; cupboards below. A sample's picked out and read through (one gone from its
   * place on the stand while it is).
   */
  wpAlbumShelf(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.16;
    const d = 0.42;
    const z = -D / 2 + d / 2 + 0.02;
    part(g, rbox(w, 0.8, d, 0.02), '#ffffff', 0, 0.4, z);
    for (const sx of [-1, 1]) {
      part(g, rbox(w / 2 - 0.04, 0.66, 0.015, 0.008), '#f7f3ee', sx * (w / 4), 0.38, z + d / 2);
      part(g, box(0.012, 0.12, 0.015), GOLD, sx * 0.06, 0.45, z + d / 2 + 0.01, { outline: false });
    }
    part(g, rbox(w + 0.03, 0.03, d + 0.03, 0.01), '#f5efe8', 0, 0.815, z);
    // The upper shelves: back panel, sides, two shelves, the top with its sign.
    const uz = -D / 2 + 0.14;
    part(g, box(w, 1.1, 0.02), '#fbf6f0', 0, 1.38, -D / 2 + 0.03, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.03, 1.12, 0.24), '#ffffff', sx * (w / 2), 1.38, uz);
    for (const y of [1.25, 1.62]) part(g, box(w, 0.025, 0.24), '#ffffff', 0, y, uz);
    part(g, box(w + 0.04, 0.04, 0.26), '#ffffff', 0, 1.95, uz);
    part(g, box(w + 0.05, 0.012, 0.012), GOLD, 0, 1.93, uz + 0.13, { outline: false });
    label(g, '웨딩홀 앨범 · 청첩장 샘플', 0.9, 0.08, 0, 2.03, uz + 0.06, '#ffffff', DEEP);
    // The albums standing, their names on the spines; framed photos of the halls beside them.
    const names = ['그랜드볼룸', '가든홀', '채플홀', '한옥 별채', '루프탑'];
    const covers = ['#ece3d6', '#a5c49a', '#ffffff', '#8d6e63', '#3d5a80'];
    names.forEach((n, i) => {
      const x = -w / 2 + 0.12 + i * 0.075;
      part(g, rbox(0.06, 0.32, 0.22, 0.008), covers[i], x, 1.43, uz, { rz: i === 4 ? 0.12 : 0 });
      if (i !== 4) label(g, n, 0.2, 0.035, x, 1.43, uz + 0.111, covers[i], i === 3 || i === 4 ? '#ffffff' : DEEP).rotation.z = Math.PI / 2;
    });
    for (let i = 0; i < 2; i++) {
      const x = 0.25 + i * 0.32;
      part(g, box(0.26, 0.2, 0.02), GOLD, x, 1.38, uz - 0.03, { rx: -0.1 });
      picture(g, painted(`wp-album-photo-${i * 2}`, 128, 160, paintPhoto(i * 2)), 0.17, 0.2, x, 1.38, uz - 0.018);
    }
    // Upper shelf: a few more albums lying, a posy, a tray of wax seals.
    for (let i = 0; i < 3; i++) part(g, rbox(0.3, 0.03, 0.22, 0.006), covers[i], -0.45, 1.65 + i * 0.03, uz, { ry: (i - 1) * 0.06 });
    part(g, cyl(0.035, 0.04, 0.12, 12), '#ffffff', 0.05, 1.7, uz);
    posy(g, 0.05, 1.79, uz, 0.06, [BLUSH, '#ffffff'], 71, 5);
    for (let i = 0; i < 6; i++) part(g, cyl(0.016, 0.016, 0.008, 12), i % 2 ? '#b71c1c' : GOLD, 0.35 + (i % 3) * 0.05, 1.643, uz - 0.03 + Math.floor(i / 3) * 0.05);
    // The stepped stand of invitations on the counter.
    const inv = ['#fffaf0', '#f8bbd0', '#a5c49a', '#2c3e66', '#ffffff', '#ead8c0'];
    const one = new THREE.Group();
    g.add(one);
    out.idle = one;
    for (let s = 0; s < 3; s++) {
      const y = 0.85 + s * 0.07;
      const sz = z + 0.12 - s * 0.1;
      part(g, box(w - 0.1, 0.07 + s * 0.07, 0.08), '#f3ece4', 0, 0.83 + (0.07 + s * 0.07) / 2, sz, { outline: false });
      for (let i = 0; i < 6; i++) {
        const x = -w / 2 + 0.2 + i * ((w - 0.4) / 5);
        const k = inv[(i + s * 2) % inv.length];
        const parent = s === 0 && i === 1 ? one : g;
        const card = part(parent, box(0.13, 0.18, 0.006), k, x, y + 0.09 + s * 0.035, sz - 0.01, { rx: -0.25 });
        if ((i + s) % 2 === 0) part(card, cyl(0.016, 0.016, 0.006, 12), (i + s) % 4 ? '#b71c1c' : GOLD, 0, -0.02, 0.005, { rx: Math.PI / 2, outline: false });
        part(card, box(0.09, 0.004, 0.002), (i + s) % 3 ? GOLD : '#8d6e63', 0, 0.05, 0.004, { outline: false });
      }
    }
    const pick = marker(g, -w / 2 + 0.2 + (w - 0.4) / 5, 0.98, z + 0.1);
    out.work = pick;
    out.spots = { '*': at(spot(g, 'stand', -w / 2 + 0.2 + (w - 0.4) / 5, 0, z + d / 2 + 0.38, Math.PI), pick, 'read') };
  },

  /**
   * The dress-fitting podium in the showroom: a three-way mirror in gilded frames behind a round
   * podium carpeted in blush with a gold edge, a tufted pouf to sit on, a pair of bridal heels, up-
   * lights at the mirror's feet. At a fitting the bride stands on it in her gown — a full skirt and
   * its train, the lace bodice, her bouquet held at the waist, the up-do, the tiara and the veil —
   * turning a little to see herself, and the planner kneels at the hem spreading it out (tinker).
   */
  wpFittingPodium(g, W, D, _c, _def, _ctx, out) {
    const mz = -D / 2 + 0.12;
    // The three-way mirror.
    const panel = (x: number, zz: number, ry: number, w: number) => {
      const p = new THREE.Group();
      p.position.set(x, 0, zz);
      p.rotation.y = ry;
      g.add(p);
      part(p, rbox(w + 0.06, 1.95, 0.04, 0.01), GOLD, 0, 1.05, 0);
      const m = new THREE.Mesh(box(w, 1.85, 0.005), MIRROR);
      m.position.set(0, 1.05, 0.022);
      p.add(m);
      part(p, box(w + 0.1, 0.06, 0.08), GOLD, 0, 0.03, 0.01, { outline: false });
      return p;
    };
    panel(0, mz, 0, 0.72);
    for (const sx of [-1, 1]) panel(sx * 0.62, mz + 0.18, -sx * 0.55, 0.5);
    label(g, 'FITTING ROOM', 0.4, 0.06, 0, 2.08, mz + 0.03, GOLD, '#ffffff');
    for (const sx of [-1, 1]) glowing(g, cyl(0.04, 0.05, 0.08, 12), '#fff3c4', sx * 0.36, 0.04, mz + 0.12);
    // The podium.
    const pz = -0.12;
    part(g, cyl(0.52, 0.55, 0.16, 36), '#ffffff', 0, 0.08, pz);
    part(g, cyl(0.5, 0.5, 0.012, 36), '#f3d1da', 0, 0.165, pz, { outline: false });
    part(g, ring(0.53, 0.012), GOLD, 0, 0.16, pz, { rx: Math.PI / 2, outline: false });
    // The pouf and the heels.
    part(g, cyl(0.22, 0.24, 0.36, 24), VELVET, -W / 2 + 0.3, 0.18, D / 2 - 0.35);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(g, ball(0.012), shade(VELVET, 0.75), -W / 2 + 0.3 + Math.cos(a) * 0.12, 0.365, D / 2 - 0.35 + Math.sin(a) * 0.12, { outline: false });
    }
    for (const sx of [-1, 1]) {
      part(g, rbox(0.07, 0.03, 0.2, 0.015), '#f5e6d3', W / 2 - 0.35 + sx * 0.05, 0.05, D / 2 - 0.4, { rx: -0.25 });
      part(g, cyl(0.008, 0.005, 0.08, 6), GOLD, W / 2 - 0.35 + sx * 0.05, 0.04, D / 2 - 0.48, { outline: false });
    }
    // At a fitting: the bride on the podium.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const bride = standingBride(use);
    bride.root.position.set(0, 0.17, pz);
    const hem = new THREE.Vector3(0.3, 0.24, pz + 0.38);
    const hemAt = marker(g, hem.x, hem.y, hem.z);
    out.work = hemAt;
    out.spots = { '*': at(facing(g, 0.5, pz + 0.85, hem), hemAt, 'tinker') };
    out.animate = (t) => {
      bride.root.rotation.y = 0.25 * Math.sin(t * 0.3);
      bride.head.rotation.y = -0.3 * Math.sin(t * 0.3 + 0.5);
      bride.skirt.scale.set(1 + 0.015 * Math.sin(t * 2.1), 1, 1 + 0.02 * Math.sin(t * 1.7 + 1));
    };
  },

  /**
   * A guest table laid as a sample: a round table in a floor-length white cloth with a blush
   * overlay, a tall gold candelabra crowned with a ball of flowers and its candles lit, six places
   * laid — gold chargers, white plates, a blush napkin folded on each, the cutlery, water and wine
   * glasses, a name card — and five gold chiavari chairs round it, the front left open. Laid by the
   * planner from the front: the plate set on the charger, the napkin, then the name card.
   */
  wpTableSetting(g, _W, _D, _c, _def, _ctx, out) {
    const tz = -0.1;
    const top = 0.76;
    part(g, cyl(0.6, 0.64, top - 0.01, 36), '#ffffff', 0, (top - 0.01) / 2, tz);
    part(g, cyl(0.61, 0.61, 0.02, 36), '#ffffff', 0, top - 0.01, tz);
    part(g, box(0.86, 0.004, 0.86), BLUSH, 0, top + 0.001, tz, { ry: Math.PI / 4, outline: false });
    // The candelabra and its flowers.
    part(g, cyl(0.08, 0.1, 0.03, 18), GOLD, 0, top + 0.015, tz);
    part(g, cyl(0.015, 0.02, 0.5, 10), GOLD, 0, top + 0.27, tz, { outline: false });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const ex = Math.cos(a) * 0.14;
      const ez = Math.sin(a) * 0.14;
      rod(g, new THREE.Vector3(0, top + 0.32, tz), new THREE.Vector3(ex, top + 0.38, tz + ez), 0.008, GOLD);
      part(g, cyl(0.012, 0.012, 0.09, 8), '#fffaf0', ex, top + 0.43, tz + ez, { outline: false });
      glowing(g, ball(0.01), '#ffb74d', ex, top + 0.485, tz + ez);
    }
    posy(g, 0, top + 0.5, tz, 0.17, FLOWERS, 91, 14);
    // The places, the front one laid while it's used.
    const place = (p: THREE.Object3D, a: number, parts: { plate: boolean; napkin: boolean; card: boolean; base: boolean }) => {
      const r = 0.43;
      const x = Math.sin(a) * r;
      const zz = tz + Math.cos(a) * r;
      const s = new THREE.Group();
      s.position.set(x, top + 0.004, zz);
      s.rotation.y = a;
      p.add(s);
      if (parts.base) {
        part(s, cyl(0.14, 0.14, 0.006, 24), GOLD, 0, 0.003, 0, { outline: false });
        for (const sx of [-1, 1]) {
          part(s, box(0.012, 0.003, 0.17), '#e0e0e0', sx * 0.17, 0.002, 0, { outline: false });
          part(s, box(0.012, 0.003, 0.15), '#e0e0e0', sx * 0.19, 0.002, 0.005, { outline: false });
        }
        glass(s, cyl(0.03, 0.025, 0.1, 12), 0.14, 0.05, -0.15);
        glass(s, cyl(0.035, 0.008, 0.07, 12), 0.2, 0.12, -0.12);
        part(s, cyl(0.004, 0.004, 0.09, 6), '#e0e0e0', 0.2, 0.045, -0.12, { outline: false });
      }
      if (parts.plate) part(s, cyl(0.11, 0.09, 0.02, 24), '#ffffff', 0, 0.016, 0);
      if (parts.napkin) {
        const n = part(s, new THREE.ConeGeometry(0.05, 0.11, 3), BLUSH, 0, 0.08, 0, { rx: 0 });
        n.scale.set(1, 1, 0.45);
      }
      if (parts.card) {
        part(s, box(0.07, 0.04, 0.003), '#ffffff', 0, 0.045, -0.08, { rx: -0.3 });
        part(s, box(0.05, 0.004, 0.001), GOLD, 0, 0.05, -0.077, { rx: -0.3, outline: false });
      }
      return s;
    };
    const all = { plate: true, napkin: true, card: true, base: true };
    for (let i = 1; i < 6; i++) place(g, (i / 6) * Math.PI * 2, all);
    place(g, 0, { plate: false, napkin: false, card: false, base: true });
    const full = new THREE.Group();
    g.add(full);
    out.idle = full;
    place(full, 0, { plate: true, napkin: true, card: true, base: false });
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const steps = [
      place(use, 0, { plate: true, napkin: false, card: false, base: false }),
      place(use, 0, { plate: false, napkin: true, card: false, base: false }),
      place(use, 0, { plate: false, napkin: false, card: true, base: false }),
    ];
    // The chairs round it, the front left open.
    for (let i = 1; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const c = new THREE.Group();
      c.position.set(Math.sin(a) * 0.86, 0, tz + Math.cos(a) * 0.86);
      c.rotation.y = a + Math.PI;
      g.add(c);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.012, 0.01, 0.45, 8), GOLD, sx * 0.17, 0.225, sz * 0.16, { outline: false });
      part(c, rbox(0.38, 0.05, 0.36, 0.02), '#fffaf0', 0, 0.46, 0);
      for (const sx of [-1, 1]) rod(c, new THREE.Vector3(sx * 0.17, 0.45, -0.16), new THREE.Vector3(sx * 0.17, 0.92, -0.19), 0.011, GOLD);
      for (let j = 0; j < 3; j++) part(c, box(0.34, 0.015, 0.015), GOLD, 0, 0.62 + j * 0.13, -0.17 - j * 0.008, { outline: false });
      part(c, rbox(0.12, 0.08, 0.03, 0.01), BLUSH, 0.1, 0.85, -0.2);
    }
    const setAt = marker(g, 0, top + 0.04, tz + 0.43);
    out.work = setAt;
    out.spots = { '*': at(spot(g, 'stand', 0, 0, tz + 0.95, Math.PI), setAt, 'tinker') };
    out.animate = (t) => {
      const u = (t / 9) % 1;
      steps[0].visible = u > 0.15;
      steps[1].visible = u > 0.45;
      steps[2].visible = u > 0.75;
    };
  },
};
