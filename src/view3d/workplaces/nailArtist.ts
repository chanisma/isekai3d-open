import * as THREE from 'three';
import { vroidFigure } from './vroidFigure';
import { MANI, PEDI, manicureRound, toolPhase, type BarOffset, type Motion } from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox, toon } from '../toon';
import { nailSoakOff } from './handWorkProps';
import { BLACK, CHROME, STEEL, WATER, glass, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';
import { neighbourShop, shopFront } from './shopFront';

/**
 * The nail shop drawn as itself (2026-10-27 workplace pipeline, at the user's request: doing nails
 * should look like doing nails). The nail table with the artist sat across it from a client, the
 * client's hand on the cushion over the built-in dust collector, held by the fingers and painted
 * nail by nail with the gel brush, then slid into the LED lamp that glows violet to cure (a bride's
 * pearl-white set, a nail-art set with dots, a class on a practice hand); the pedicure chair, a
 * client up on it with one foot soaking in the glass basin and the other on the rest, the artist on
 * the low stool; the gel colour wall with a practice hand on its counter; and what the 네일숍 was
 * missing (workFurniture/nailArtist.ts): the nail-art sample wall, the tool steriliser, the parts
 * drawer, the waiting loveseat with the design book and the reception desk.
 */

const SKIN = '#f3cfb3';
const HAIR = '#3b2a20';
const WHITE = '#fbfbfb';
const IVORY = '#fffaf0';
const PINK = '#f8bbd0';
const ROSE = '#ec407a';
const ROSE_GOLD = '#d4a28c';
const GOLD = '#d4af37';
const VELVET = '#f4a7bb';
const UV = '#b388ff';
const BARE = '#f6d5cf';
const TIP = '#fbeee8';
const SILICONE = '#f1e3da';
const VEIL = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
const UNIT = cyl(1, 1, 1, 10);

/** The gel colours a round goes through, one client to the next. */
const POLISH = ['#e91e63', '#c2185b', '#ff8a80', '#b39ddb', '#a1887f', '#ef5350', '#f48fb1', '#ffab91'];
/** The colour wall's rows: reds, pinks, nudes, corals, purples, blues and greens, glitters. */
const ROWS = [
  ['#b71c1c', '#c62828', '#d32f2f', '#e53935', '#8e0000', '#ad1457', '#880e4f', '#6a1b1b'],
  ['#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#ff80ab', '#fce4ec', '#e1a1b8', '#d81b60'],
  ['#f5e1d3', '#ead2c0', '#e0bfa8', '#d7b29a', '#c9a28a', '#b88f7a', '#f3d9cc', '#e8c9b9'],
  ['#ffccbc', '#ffab91', '#ff8a65', '#ff7043', '#ffd180', '#ffe0b2', '#ffb74d', '#f4a582'],
  ['#e1bee7', '#ce93d8', '#ba68c8', '#9c27b0', '#b39ddb', '#9575cd', '#7e57c2', '#d1c4e9'],
  ['#b3e5fc', '#81d4fa', '#4fc3f7', '#90caf9', '#c8e6c9', '#a5d6a7', '#80cbc4', '#b2dfdb'],
  ['#ffd700', '#e0c068', '#c0c0c0', '#f5f5f5', '#212121', '#ffe082', '#d7ccc8', '#cfd8dc'],
];

const tmp = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
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
/** Points `o` (its +z) from `from` towards `to`, in its parent's frame. */
function aim(o: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  o.position.copy(from);
  const d = to.clone().sub(from);
  if (d.lengthSq() > 1e-8) o.quaternion.setFromUnitVectors(Z, d.normalize());
}
/** A round limb whose ends are set each frame (an arm reaching to the lamp). */
function limb(g: THREE.Object3D, r: number, color: string) {
  const m = part(g, UNIT, color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a: THREE.Vector3, b: THREE.Vector3) => {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    d.copy(b).sub(a);
    const len = d.length();
    m.scale.set(r, Math.max(len, 1e-4), r);
    if (len > 1e-6) m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len));
  };
}
/** Where an offset in the artist's frame (from `W`, the artist facing `yaw`) is, in the piece's frame. */
function framer(W: THREE.Vector3, yaw: number) {
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return (o: BarOffset, v = new THREE.Vector3()) => v.copy(W).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
}
const vec = (o: BarOffset) => new THREE.Vector3(o.side, o.up, o.ahead);

// ---------------------------------------------------------------------------------------------
// What's worked on, each built in the artist's frame (x to their left, y up, z away from them),
// round the middle of the hand (foot) — the nails where activity.ts MANI / PEDI say they are.

/** A hand palm down, the fingers towards the artist, the thumb on their right; returns its nails. */
function handOn(h: THREE.Object3D, skin: string, mannequin: boolean): THREE.Mesh[] {
  part(h, rbox(0.085, 0.024, 0.085, 0.012), skin, 0.003, 0, 0.028);
  part(h, ball(0.026), skin, 0.004, 0.004, 0.072, { outline: false }).scale.set(1.5, 0.8, 1);
  const nails: THREE.Mesh[] = [];
  MANI.nails.forEach((n, i) => {
    const thumb = i === 0;
    const r = thumb ? 0.0095 : 0.0082;
    const knuckle = thumb ? new THREE.Vector3(-0.036, 0, 0.03) : new THREE.Vector3(n.side * 0.92, 0.004, -0.012);
    const tip = new THREE.Vector3(n.side, n.up - 0.008, n.ahead + 0.003);
    rod(h, knuckle, tip, r, skin);
    part(h, ball(r), skin, tip.x, tip.y, tip.z, { outline: false });
    nails.push(part(h, rbox(0.013, 0.004, 0.016, 0.002), mannequin ? TIP : BARE, n.side, n.up - 0.002, n.ahead + 0.005, { outline: false }));
  });
  if (mannequin) {
    // The practice hand's forearm, into its clamp on a little weighted base.
    rod(h, new THREE.Vector3(0.004, 0.004, 0.07), new THREE.Vector3(0.004, -0.01, 0.2), 0.026, skin);
    part(h, cyl(0.03, 0.03, 0.03, 12), '#9e9e9e', 0.004, -0.012, 0.205, { rx: Math.PI / 2 });
    part(h, rbox(0.09, 0.02, 0.09, 0.01), BLACK, 0.004, -0.037, 0.21);
    rod(h, new THREE.Vector3(0.004, -0.027, 0.21), new THREE.Vector3(0.004, -0.012, 0.21), 0.008, CHROME);
  }
  return nails;
}
/** Five clear tips stood on a holder (a sample stick being painted), where the nails would be. */
function tipsOn(h: THREE.Object3D): THREE.Mesh[] {
  part(h, rbox(0.13, 0.016, 0.07, 0.006), '#fafafa', 0, -0.036, 0.0);
  label(h, 'SAMPLE', 0.06, 0.012, 0, -0.036, 0.0355, '#fafafa', ROSE);
  return MANI.nails.map((n) => {
    rod(h, new THREE.Vector3(n.side * 0.8, -0.028, 0.0), new THREE.Vector3(n.side, n.up - 0.005, n.ahead + 0.012), 0.0025, '#bdbdbd');
    return part(h, rbox(0.016, 0.004, 0.022, 0.003), TIP, n.side, n.up - 0.002, n.ahead + 0.004, { outline: false });
  });
}
/** A bare foot on its sole, the toes towards the artist, the big toe on their right; returns its toenails. */
function footOn(h: THREE.Object3D): THREE.Mesh[] {
  part(h, rbox(0.085, 0.045, 0.19, 0.022), SKIN, 0.002, 0.0, 0.0);
  part(h, ball(0.035), SKIN, 0, 0.002, 0.085, { outline: false });
  return PEDI.nails.map((n, i) => {
    const r = i === 0 ? 0.015 : 0.0105 - i * 0.0006;
    part(h, ball(r), SKIN, n.side, n.up - r - 0.002, n.ahead + 0.004, { outline: false }).scale.set(1, 0.85, 1.15);
    const s = i === 0 ? 0.018 : 0.011;
    return part(h, rbox(s, 0.004, s, 0.002), BARE, n.side, n.up - 0.002, n.ahead + 0.002, { outline: false });
  });
}

/** A gel brush on its cap, from the hand (+z) to the bristles' tip ~0.05 on. */
function gelBrush(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.0075, 0.0075, 0.032, 12), BLACK, 0, 0, -0.004, { rx: Math.PI / 2 });
  part(root, cyl(0.0085, 0.0085, 0.004, 12), GOLD, 0, 0, 0.013, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.0016, 0.0016, 0.026, 6), '#e0e0e0', 0, 0, 0.028, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.0008, 0.003, 0.012, 8), '#3e2723', 0, 0, 0.046, { rx: Math.PI / 2, outline: false });
  return root;
}

/**
 * An LED gel lamp on the table at `L` (the hand's place in it): a white dome, open towards the client,
 * a rose-gold band and its timer on top; returns the violet light inside, shown while it cures.
 */
function ledLamp(root: THREE.Object3D, L: BarOffset, floor: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(L.side, floor, L.ahead);
  root.add(g);
  part(g, rbox(0.2, 0.012, 0.18, 0.006), '#f0f0f0', 0, 0.006, 0);
  part(g, rbox(0.215, 0.022, 0.19, 0.01), WHITE, 0, 0.11, -0.005);
  for (const sx of [-1, 1]) part(g, rbox(0.022, 0.11, 0.19, 0.01), WHITE, sx * 0.1, 0.06, -0.005);
  part(g, rbox(0.2, 0.11, 0.022, 0.01), WHITE, 0, 0.06, -0.09);
  part(g, box(0.216, 0.008, 0.004), ROSE_GOLD, 0, 0.095, 0.091, { outline: false });
  part(g, rbox(0.07, 0.006, 0.04, 0.003), '#212121', 0, 0.123, 0.03, { outline: false });
  const light = new THREE.Group();
  g.add(light);
  glowing(light, box(0.17, 0.004, 0.15), UV, 0, 0.097, -0.005);
  glowing(light, box(0.17, 0.003, 0.15), '#ede7f6', 0, 0.013, -0.005);
  glowing(light, box(0.05, 0.003, 0.025), '#d1b3ff', 0, 0.127, 0.03);
  light.visible = false;
  return light;
}

type KitKind = 'hand' | 'mannequin' | 'tips' | 'foot';
type Deco = 'art' | 'pearl' | undefined;
/**
 * What a nail job needs round the hand (foot) at `W` for an artist facing `yaw`: the hand (or the
 * practice hand, the sample tips, the foot) that moves into the lamp, the gel bottle, the brush and
 * the lamp. `show` puts them where activity.ts manicureRound has them at `t`; `finished` shows the
 * nails done and the brush capped.
 */
function nailKit(g: THREE.Object3D, W: THREE.Vector3, yaw: number, kinds: KitKind[], opts: { lamp?: boolean; cushion?: boolean } = {}) {
  const root = new THREE.Group();
  root.position.copy(W);
  root.rotation.y = yaw;
  g.add(root);
  const foot = kinds[0] === 'foot';
  const K = foot ? PEDI : MANI;
  const holder = new THREE.Group();
  root.add(holder);
  const forms = new Map<KitKind, { grp: THREE.Group; nails: THREE.Mesh[]; deco: THREE.Mesh[] }>();
  for (const kind of kinds) {
    const grp = new THREE.Group();
    holder.add(grp);
    const nails = kind === 'foot' ? footOn(grp) : kind === 'tips' ? tipsOn(grp) : handOn(grp, kind === 'mannequin' ? SILICONE : SKIN, kind === 'mannequin');
    const deco = nails.map((m) => part(grp, ball(0.0032), '#ffffff', m.position.x, m.position.y + 0.0025, m.position.z - 0.002, { outline: false }));
    forms.set(kind, { grp, nails, deco });
  }
  const table = K.bottle.up;
  if (opts.cushion) {
    // The hand cushion (a rolled pad in a towel) under the palm and wrist.
    part(root, rbox(0.12, 0.036, 0.15, 0.016), '#fafafa', 0, -0.031, 0.07);
    part(root, rbox(0.17, 0.006, 0.24, 0.003), PINK, 0, table + 0.003, 0.05);
  }
  const B = K.bottle;
  const bottle = new THREE.Group();
  bottle.position.set(B.side, B.up, B.ahead);
  root.add(bottle);
  const gelMat = new THREE.MeshToonMaterial({ color: POLISH[0], gradientMap: gradient });
  const body = part(bottle, rbox(0.032, 0.04, 0.032, 0.008), POLISH[0], 0, 0.02, 0, { material: gelMat });
  body.userData.ownMaterial = true;
  part(bottle, box(0.022, 0.008, 0.001), '#ffffff', 0, 0.022, 0.0165, { outline: false });
  part(bottle, cyl(0.007, 0.007, 0.01, 10), '#eeeeee', 0, 0.045, 0, { outline: false });
  const brush = gelBrush(root);
  const capped = () => aim(brush, new THREE.Vector3(B.side, B.up + 0.062, B.ahead), new THREE.Vector3(B.side, B.up + 0.01, B.ahead));
  capped();
  const light = opts.lamp ? ledLamp(root, K.lamp, table) : null;
  const paint = (kind: KitKind, color: string, deco: Deco, on: (i: number) => boolean) => {
    for (const [k, f] of forms) {
      f.grp.visible = k === kind;
      if (k !== kind) continue;
      f.nails.forEach((m, i) => {
        m.material = toon(on(i) ? color : k === 'tips' || k === 'mannequin' ? TIP : BARE);
        const d = f.deco[i];
        d.visible = !!deco && on(i);
        if (d.visible) {
          d.material = toon(deco === 'pearl' ? '#fff3e0' : i % 2 ? GOLD : '#ffffff');
          d.scale.setScalar(deco === 'pearl' ? 1.25 : i % 2 ? 0.8 : 1);
        }
      });
    }
    gelMat.color.set(color);
  };
  return {
    root,
    holder,
    /** Where the hand (foot) is now, in `g`'s frame. */
    handAt: (v = new THREE.Vector3()) => v.copy(holder.position).applyMatrix4(root.matrix),
    show(kind: KitKind, t: number, ph: number, color: string, deco?: Deco) {
      const k = manicureRound(t, ph, foot);
      root.updateMatrix();
      holder.position.copy(vec(k.hand));
      paint(kind, color, deco, (i) => i < k.done || (i === k.nail && k.painting));
      if (k.held) aim(brush, vec(k.r), vec(k.tip));
      else capped();
      if (light) light.visible = k.lamp;
      return k;
    },
    finished(kind: KitKind, color: string, deco?: Deco) {
      root.updateMatrix();
      holder.position.set(0, 0, 0);
      paint(kind, color, deco, () => true);
      capped();
      if (light) light.visible = false;
    },
    bare(kind: KitKind) {
      holder.position.set(0, 0, 0);
      paint(kind, POLISH[0], undefined, () => false);
      capped();
      if (light) light.visible = false;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Someone sat, drawn (the client across the nail table, a bride, a pupil; a client on the pedicure
// chair): facing +z from the middle of the seat, its top at `y`.

interface Look {
  top: string;
  bottom: string;
  hair?: string;
  bride?: boolean;
  apron?: string;
}
/** A head (the face to +z), the eyes down on the hands, long hair tied back; a bride's up-do and veil. */
function headOn(g: THREE.Object3D, look: Look): THREE.Group {
  const h = new THREE.Group();
  g.add(h);
  const hair = look.hair ?? HAIR;
  part(h, ball(0.09), SKIN, 0, 0, 0).scale.set(0.92, 1.06, 1);
  part(h, ball(0.096), hair, 0, 0.026, -0.018).scale.set(1, 0.92, 1);
  part(h, rbox(0.15, 0.06, 0.05, 0.02), hair, 0, 0.065, 0.055, { rx: 0.4 });
  for (const sx of [-1, 1]) {
    part(h, ball(0.017), SKIN, sx * 0.083, -0.005, 0);
    part(h, box(0.022, 0.004, 0.004), '#3e2723', sx * 0.032, -0.002, 0.083, { rz: sx * 0.12, outline: false });
    part(h, ball(0.014), '#f8a9b6', sx * 0.046, -0.03, 0.07, { outline: false }).scale.set(1, 0.6, 0.4);
  }
  part(h, box(0.026, 0.007, 0.004), '#d81b60', 0, -0.048, 0.083, { outline: false });
  if (look.bride) {
    part(h, ball(0.052), hair, 0, 0.06, -0.085);
    part(h, ring(0.075, 0.006, Math.PI), '#e0c068', 0, 0.06, 0.02, { rx: -0.5, outline: false });
    const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.32, 0.9, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9), VEIL);
    veil.userData.ownGeometry = true;
    veil.position.set(0, -0.36, -0.12);
    veil.rotation.x = 0.12;
    veil.renderOrder = 3;
    h.add(veil);
  } else {
    // A ponytail.
    part(h, ball(0.04), hair, 0, 0.0, -0.1);
    rod(h, new THREE.Vector3(0, -0.01, -0.11), new THREE.Vector3(0, -0.16, -0.12), 0.03, hair);
    part(h, ring(0.02, 0.006), '#f48fb1', 0, -0.005, -0.108, { outline: false });
  }
  return h;
}
/**
 * A body sat in a chair: the legs to the floor (a bride's gown over them), the torso leant a little
 * forward to the table, the head bowed to the hands. The left arm rests in the lap unless `arms` says
 * both go to the table (a pupil holding her practice stick); the right arm is the piece's to draw.
 * Returns where each shoulder is in its own frame.
 */
function seatedFigure(g: THREE.Object3D, y: number, look: Look, opts: { legs?: boolean; lean?: number; arms?: 'lap' | 'table' } = {}) {
  const root = new THREE.Group();
  g.add(root);
  if (opts.legs ?? true) {
    if (look.bride) {
      const skirt = new THREE.LatheGeometry([new THREE.Vector2(0.17, y + 0.14), new THREE.Vector2(0.24, y + 0.06), new THREE.Vector2(0.33, y - 0.15), new THREE.Vector2(0.34, 0.12), new THREE.Vector2(0.36, 0.01)], 24);
      part(root, skirt, IVORY, 0, 0, 0.06).userData.ownGeometry = true;
      part(root, rbox(0.38, 0.12, 0.42, 0.05), IVORY, 0, y + 0.08, 0.16);
    } else {
      for (const sx of [-1, 1]) {
        // Knees together, the feet drawn in under them (clear of the artist's across the table).
        rod(root, new THREE.Vector3(sx * 0.09, y + 0.07, 0.05), new THREE.Vector3(sx * 0.09, y + 0.07, 0.34), 0.062, look.bottom);
        rod(root, new THREE.Vector3(sx * 0.09, y + 0.06, 0.35), new THREE.Vector3(sx * 0.1, 0.09, 0.3), 0.048, look.bottom);
        part(root, rbox(0.085, 0.06, 0.17, 0.03), '#5d4037', sx * 0.1, 0.03, 0.35);
      }
    }
  }
  part(root, rbox(0.32, 0.15, 0.3, 0.06), look.bride ? IVORY : look.bottom, 0, y + 0.07, 0.02);
  const torso = new THREE.Group();
  torso.position.set(0, y + 0.1, -0.02);
  torso.rotation.x = opts.lean ?? 0.18;
  root.add(torso);
  part(torso, rbox(0.3, 0.42, 0.19, 0.08), look.top, 0, 0.23, 0);
  if (look.bride) {
    for (const sx of [-1, 1]) part(torso, ball(0.055), SKIN, sx * 0.15, 0.42, 0);
    part(torso, rbox(0.24, 0.12, 0.12, 0.05), SKIN, 0, 0.43, 0);
    for (let i = 0; i < 9; i++) part(torso, ball(0.008), '#fffdf5', -0.05 + (i * 0.1) / 8, 0.4 - Math.sin((i / 8) * Math.PI) * 0.03, 0.06, { outline: false });
  } else {
    part(torso, rbox(0.12, 0.05, 0.12, 0.02), look.top, 0, 0.44, 0);
  }
  if (look.apron) {
    part(torso, rbox(0.27, 0.34, 0.02, 0.01), look.apron, 0, 0.18, 0.1);
    label(torso, 'NAIL DAISY', 0.12, 0.025, 0, 0.27, 0.112, look.apron, '#ffffff');
  }
  part(torso, cyl(0.042, 0.045, 0.1, 12), SKIN, 0, 0.5, 0.01);
  const head = headOn(torso, look);
  head.position.set(0, 0.62, 0.03);
  head.rotation.x = 0.38;
  root.updateMatrix();
  torso.updateMatrix();
  const shoulder = (sx: number) => new THREE.Vector3(sx * 0.16, 0.4, 0).applyMatrix4(torso.matrix);
  const sleeve = look.bride ? SKIN : look.top;
  const lap = (sx: number) => {
    const s = shoulder(sx);
    const e = new THREE.Vector3(sx * 0.2, y + 0.26, 0.1);
    const w = new THREE.Vector3(sx * 0.06, y + 0.18, 0.27);
    rod(root, s, e, 0.035, sleeve);
    rod(root, e, w, 0.03, look.bride ? SKIN : sleeve);
    part(root, ball(0.032), SKIN, w.x, w.y, w.z + 0.02, { outline: false });
  };
  if ((opts.arms ?? 'lap') === 'lap') lap(1);
  return { root, shoulder };
}

/** Puts a figure (built facing +z) at (x, z) facing `yaw`, and turns a point of its frame into the piece's. */
function seat(fig: { root: THREE.Group }, x: number, z: number, yaw: number) {
  fig.root.position.set(x, 0, z);
  fig.root.rotation.y = yaw;
  fig.root.updateMatrix();
  return (v: THREE.Vector3) => v.clone().applyMatrix4(fig.root.matrix);
}

/** A round wheel of sample tips (a 네일 팁 컬러 차트) facing +z, `r` to the tips. */
function tipWheel(g: THREE.Object3D, r: number, colors: string[], seed = 1): THREE.Group {
  const w = new THREE.Group();
  g.add(w);
  part(w, cyl(r * 0.62, r * 0.62, 0.008, 28), '#ffffff', 0, 0, 0, { rx: Math.PI / 2 });
  part(w, cyl(r * 0.14, r * 0.14, 0.014, 16), ROSE_GOLD, 0, 0, 0.004, { rx: Math.PI / 2, outline: false });
  const rnd = seeded(seed);
  const n = colors.length;
  colors.forEach((k, i) => {
    const a = (i / n) * Math.PI * 2;
    const tip = part(w, rbox(r * 0.24, r * 0.42, 0.006, r * 0.08), k, Math.sin(a) * r * 0.78, Math.cos(a) * r * 0.78, 0.004, { outline: false });
    tip.rotation.z = -a;
    if (rnd() > 0.55) part(w, ball(r * 0.035), rnd() > 0.5 ? '#ffffff' : GOLD, Math.sin(a) * r * 0.86, Math.cos(a) * r * 0.86, 0.009, { outline: false });
  });
  return w;
}

// ---------------------------------------------------------------------------------------------
// What's painted.

const paintRef: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 96, 176);
  c.fillStyle = '#fce4ec';
  c.fillRect(0, 0, 96, 120);
  // A hand with the nails a celebrity wore: pink with white dots and a stone.
  c.fillStyle = '#f1c9a5';
  c.beginPath();
  c.ellipse(48, 90, 26, 30, 0, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 4; i++) {
    c.fillStyle = '#f1c9a5';
    c.fillRect(24 + i * 14, 30, 11, 50);
    c.fillStyle = '#ec407a';
    c.fillRect(25 + i * 14, 30, 9, 13);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(29.5 + i * 14, 36, 2, 0, Math.PI * 2);
    c.fill();
  }
  text(c, '♡ 1.2만', 8, 136, 12, '#ad1457');
  text(c, '#봄네일 #도트', 8, 156, 11, '#757575', 'left', false);
};
const paintBooking: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = ROSE;
  c.fillRect(0, 0, 256, 26);
  text(c, '오늘의 예약 · 네일 데이지', 10, 14, 13, '#ffffff');
  const rows: Array<[string, string, string]> = [
    ['10:30', '김○○ 젤 원컬러', '#f8bbd0'],
    ['11:30', '박○○ 페디큐어', '#e1bee7'],
    ['13:00', '이○○ 웨딩 네일', '#fff3e0'],
    ['14:30', '최○○ 아트 + 파츠', '#ffccbc'],
    ['16:00', '정○○ 젤 제거·케어', '#c8e6c9'],
  ];
  rows.forEach(([h, s, k], i) => {
    c.fillStyle = k;
    c.fillRect(8, 34 + i * 27, 240, 23);
    text(c, h, 14, 46 + i * 27, 12, '#5d4037');
    text(c, s, 62, 46 + i * 27, 12, '#424242', 'left', false);
  });
};
const paintStock: Paint = (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = '#7e57c2';
  c.fillRect(0, 0, 256, 26);
  text(c, '재고 · 발주', 10, 14, 13, '#ffffff');
  const rows: Array<[string, number]> = [
    ['베이스 젤', 0.2],
    ['탑 젤', 0.35],
    ['#12 체리 레드', 0.6],
    ['큐티클 오일', 0.8],
    ['리무버 패드', 0.15],
  ];
  rows.forEach(([s, v], i) => {
    text(c, s, 10, 44 + i * 27, 12, '#424242', 'left', false);
    c.fillStyle = '#eeeeee';
    c.fillRect(120, 38 + i * 27, 120, 12);
    c.fillStyle = v < 0.3 ? '#e53935' : '#66bb6a';
    c.fillRect(120, 38 + i * 27, 120 * v, 12);
  });
};
const paintGallery: Paint = (c) => {
  c.fillStyle = '#fff8f9';
  c.fillRect(0, 0, 192, 256);
  text(c, '웨딩 컬렉션', 96, 18, 15, '#ad1457', 'center');
  // Two hands of bridal nails: pearl white with a little gold.
  for (let h = 0; h < 2; h++) {
    const x0 = 22 + h * 84;
    c.fillStyle = '#f1c9a5';
    c.beginPath();
    c.ellipse(x0 + 30, 190, 30, 34, 0, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#f1c9a5';
      c.fillRect(x0 + 4 + i * 14, 92, 11, 80);
      c.fillStyle = h ? '#fbe9e7' : '#fffaf0';
      c.fillRect(x0 + 5 + i * 14, 92, 9, 16);
      c.fillStyle = '#d4af37';
      c.fillRect(x0 + 5 + i * 14, 92, 9, 2);
    }
  }
  text(c, '프렌치 · 진주 파츠 +15,000', 96, 240, 11, '#5d4037', 'center', false);
};
const paintSteri: Paint = (c) => {
  c.fillStyle = '#120a24';
  c.fillRect(0, 0, 128, 48);
  text(c, 'UV 20:00', 64, 25, 22, '#d1b3ff', 'center');
};

// ---------------------------------------------------------------------------------------------

/** The artist's stool at a nail table: a round white seat, a low back, a chrome base on castors. */
function artistStool(g: THREE.Object3D, x: number, y: number, z: number, backX: number) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  g.add(s);
  starBase(s, 0, 0, 0.2, CHROME);
  part(s, cyl(0.022, 0.022, y - 0.14, 10), CHROME, 0, (y + 0.1) / 2, 0, { outline: false });
  part(s, cyl(0.2, 0.19, 0.07, 24), WHITE, 0, y - 0.035, 0);
  part(s, ring(0.195, 0.008), ROSE_GOLD, 0, y - 0.005, 0, { rx: Math.PI / 2, outline: false });
  if (backX) {
    rod(s, new THREE.Vector3(backX * 0.14, y - 0.06, 0), new THREE.Vector3(backX * 0.2, y + 0.22, 0), 0.012, CHROME);
    part(s, rbox(0.06, 0.16, 0.32, 0.03), WHITE, backX * 0.21, y + 0.27, 0, { rz: backX * 0.15 });
  }
  return s;
}

export const BUILDERS: Record<string, Builder> = {
  // The street front and the units either side (2026-11-05, the layout audit; shopFront.ts).
  naShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 13, door: 12, name: '네일 데이지', sub: 'NAIL · PEDI', bg: '#f8bbd0', fg: '#ad1457', awning: '#ec407a', stripes: true, frame: '#ffffff', posters: [['이달의 아트', '#fce4ec', '#ad1457', 3.5], ['젤 39,000', '#ffffff', '#ad1457', 5.5], ['웨딩 네일', '#f3e5f5', '#6a1b9a', 9.5]] });
  },
  naNeighborA(g, W, D) {
    neighbourShop(g, W, D, { name: '엄마손 반찬', color: '#6d4c41', wall: '#efe3cf' });
  },
  naNeighborB(g, W, D) {
    neighbourShop(g, W, D, { name: '헤어 라온', color: '#4527a0', wall: '#e3dde8' });
  },
  /**
   * The nail table (a 2-tile station): a white top across which the artist and the client sit facing
   * each other — the artist on a rolling stool at the left end, the client in a pink velvet tub chair
   * at the right — the hand cushion in its towel in the middle over the built-in dust collector's
   * grille (its hose to the collector on the floor), the LED lamp at the client's right, a desk lamp
   * arched over the hand, a rack of gel bottles, the file, the buffer and the cuticle oil, an acetone
   * pump and a pot of cotton. Gel nails (and the art, and the bride's, and the class on a practice
   * hand): the artist sat at the hand, holding each finger in the left hand while the right paints the
   * nail in three strokes with the gel brush off its bottle, then the hand slid into the lamp, glowing
   * violet; the client drawn in her chair, her right arm reaching to the cushion (to the lamp), her
   * eyes on her nails. A staff member's work is looked over stood beside the table.
   */
  nailTable(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.72;
    const surf = top + 0.018;
    const tw = 0.5;
    const td = 0.86;
    part(g, rbox(tw, 0.036, td, 0.015), WHITE, 0, top, 0);
    part(g, box(tw + 0.004, 0.012, 0.006), ROSE_GOLD, 0, top - 0.004, td / 2, { outline: false });
    part(g, box(tw + 0.004, 0.012, 0.006), ROSE_GOLD, 0, top - 0.004, -td / 2, { outline: false });
    // End panels (the knees go under the middle from both sides) and a drawer box at the back end.
    for (const sz of [-1, 1]) part(g, rbox(tw - 0.04, top - 0.02, 0.03, 0.01), '#f3eeee', 0, (top - 0.02) / 2, sz * (td / 2 - 0.03));
    part(g, rbox(tw - 0.06, 0.12, 0.22, 0.01), '#f3eeee', 0, top - 0.08, -td / 2 + 0.15);
    for (const sx of [-1, 1]) part(g, box(0.08, 0.01, 0.01), ROSE_GOLD, sx * (tw / 2 - 0.035), top - 0.08, -td / 2 + 0.15, { ry: Math.PI / 2, outline: false });
    // The dust collector's grille under the fingers, its switch and light, the collector on the floor.
    const W = new THREE.Vector3(-0.03, surf + 0.052, 0);
    part(g, rbox(0.13, 0.004, 0.17, 0.004), '#cfd8dc', -0.115, surf + 0.001, 0, { outline: false });
    for (let i = 0; i < 7; i++) part(g, box(0.008, 0.003, 0.15), '#78909c', -0.17 + i * 0.019, surf + 0.003, 0, { outline: false });
    part(g, cyl(0.012, 0.012, 0.01, 10), '#90a4ae', -0.2, surf + 0.005, 0.11, { outline: false });
    const fanLed = glowing(g, ball(0.005), '#69f0ae', -0.2, surf + 0.008, 0.135);
    part(g, rbox(0.3, 0.26, 0.24, 0.03), WHITE, 0, 0.13, -td / 2 + 0.17);
    for (let i = 0; i < 5; i++) part(g, box(0.22, 0.008, 0.004), '#b0bec5', 0, 0.06 + i * 0.035, -td / 2 + 0.291, { outline: false });
    label(g, '집진기', 0.1, 0.03, 0, 0.23, -td / 2 + 0.292, WHITE, '#78909c');
    rod(g, new THREE.Vector3(-0.08, 0.26, -td / 2 + 0.17), new THREE.Vector3(-0.115, top - 0.02, -0.09), 0.022, '#cfd8dc');
    // A rack of gel bottles along the back end, the colours in a row.
    part(g, rbox(0.38, 0.05, 0.08, 0.01), '#fafafa', 0.02, surf + 0.025, -0.38);
    POLISH.forEach((k, i) => {
      const x = -0.15 + i * 0.048;
      part(g, rbox(0.03, 0.04, 0.03, 0.008), k, x, surf + 0.07, -0.38);
      part(g, cyl(0.0075, 0.0075, 0.03, 10), BLACK, x, surf + 0.105, -0.38, { outline: false });
    });
    // The file, the buffer, the pusher and the cuticle oil laid on a towel by the artist's hand; the
    // acetone pump, a pot of cotton pads and a tissue box at the front end.
    part(g, box(0.16, 0.003, 0.11), '#fce4ec', -0.16, surf + 0.002, 0.3, { outline: false });
    const towelTools = new THREE.Group();
    g.add(towelTools);
    part(towelTools, rbox(0.018, 0.005, 0.15, 0.003), '#e0e0e0', -0.2, surf + 0.006, 0.3);
    part(towelTools, rbox(0.025, 0.018, 0.1, 0.006), '#f48fb1', -0.16, surf + 0.012, 0.3);
    rod(towelTools, new THREE.Vector3(-0.12, surf + 0.008, 0.25), new THREE.Vector3(-0.12, surf + 0.008, 0.37), 0.004, STEEL);
    part(towelTools, cyl(0.009, 0.009, 0.07, 10), '#ffe082', -0.09, surf + 0.008, 0.3, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.035, 0.04, 0.09, 14), '#e3f2fd', 0.12, surf + 0.045, 0.33);
    part(g, cyl(0.012, 0.012, 0.03, 8), WHITE, 0.12, surf + 0.105, 0.33, { outline: false });
    part(g, box(0.05, 0.008, 0.012), WHITE, 0.15, surf + 0.12, 0.33, { outline: false });
    glass(g, cyl(0.035, 0.035, 0.07, 14), 0.12, surf + 0.035, 0.22);
    part(g, cyl(0.03, 0.03, 0.05, 14), '#ffffff', 0.12, surf + 0.025, 0.22, { outline: false });
    part(g, rbox(0.12, 0.07, 0.07, 0.01), '#fff0f5', 0.02, surf + 0.035, 0.36);
    part(g, ball(0.025), '#ffffff', 0.02, surf + 0.08, 0.36, { outline: false }).scale.set(1, 0.8, 0.6);
    // The desk lamp: clamped at the back end, its arm arched over the hand.
    part(g, rbox(0.07, 0.03, 0.07, 0.01), '#fafafa', -0.17, surf + 0.015, -0.36);
    rod(g, new THREE.Vector3(-0.17, surf + 0.02, -0.36), new THREE.Vector3(-0.17, surf + 0.36, -0.3), 0.009, '#fafafa');
    rod(g, new THREE.Vector3(-0.17, surf + 0.36, -0.3), new THREE.Vector3(-0.1, surf + 0.4, -0.06), 0.009, '#fafafa');
    part(g, rbox(0.16, 0.025, 0.07, 0.012), '#fafafa', -0.08, surf + 0.39, 0.0, { ry: 0.1 });
    const deskLight = glowing(g, box(0.14, 0.004, 0.05), '#fffde7', -0.08, surf + 0.376, 0.0);
    // The artist's stool (the left end) and the client's tub chair (the right end).
    const ax = -0.5;
    const seatA = 0.48;
    artistStool(g, ax, seatA, 0, -1);
    const cx = 0.5;
    const seatC = 0.46;
    const chair = new THREE.Group();
    chair.position.set(cx, 0, 0);
    g.add(chair);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(chair, cyl(0.014, 0.01, 0.2, 8), GOLD, sx * 0.17, 0.1, sz * 0.18, { outline: false });
    part(chair, rbox(0.46, 0.12, 0.46, 0.05), VELVET, 0.02, seatC - 0.06, 0);
    part(chair, rbox(0.1, 0.5, 0.56, 0.05), VELVET, 0.25, seatC + 0.13, 0);
    for (const sz of [-1, 1]) part(chair, rbox(0.42, 0.3, 0.08, 0.04), VELVET, 0.06, seatC + 0.06, sz * 0.27);
    for (let i = 0; i < 3; i++) part(chair, ball(0.01), '#e57399', 0.199, seatC + 0.1 + i * 0.12, -0.12 + ((i % 2) * 2 - 1) * 0.04 + i * 0.08, { outline: false });

    // The work: the kit round the hand, and who's in the client's chair.
    const yaw = Math.PI / 2;
    const kit = nailKit(g, W, yaw, ['hand', 'mannequin'], { lamp: true, cushion: true });
    // Nobody at the table yet: no hand on the cushion.
    kit.holder.visible = false;
    const handAt = marker(g, W.x, W.y, W.z);
    out.work = handAt;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    deskLight.removeFromParent();
    use.add(deskLight);
    fanLed.removeFromParent();
    use.add(fanLed);
    const lean = 0.22;
    const client = seatedFigure(use, seatC, { top: '#ce93d8', bottom: '#5c6bc0' }, { lean });
    const toG = seat(client, cx + 0.02, 0, -Math.PI / 2);
    const bride = seatedFigure(use, seatC, { top: IVORY, bottom: IVORY, bride: true }, { lean });
    seat(bride, cx + 0.02, 0, -Math.PI / 2);
    const pupil = seatedFigure(use, seatC, { top: '#fafafa', bottom: '#455a64', apron: ROSE, hair: '#5d4037' }, { lean, arms: 'table' });
    const toP = seat(pupil, cx + 0.02, 0, -Math.PI / 2);
    // The client's right arm out to the hand on the cushion (to the lamp): drawn in the piece's frame.
    const shoulder = toG(client.shoulder(-1));
    const armOf = (sleeve: string, r: number) => {
      const grp = new THREE.Group();
      use.add(grp);
      return { grp, up: limb(grp, r, sleeve), fore: limb(grp, r * 0.84, SKIN), elbow: part(grp, ball(r * 0.95), sleeve, 0, 0, 0, { outline: false }) };
    };
    const armClient = armOf('#ce93d8', 0.036);
    const armBride = armOf(SKIN, 0.032);
    const wrist = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const reach = (arm: ReturnType<typeof armOf>, show: boolean) => {
      arm.grp.visible = show;
      if (!show) return;
      kit.handAt(wrist);
      wrist.x += 0.085;
      wrist.y += 0.006;
      elbow.lerpVectors(shoulder, wrist, 0.5);
      elbow.y = Math.max(surf + 0.03, elbow.y - 0.09);
      elbow.z = wrist.z * 0.6 - 0.12;
      arm.up(shoulder, elbow);
      arm.fore(elbow, wrist);
      arm.elbow.position.copy(elbow);
    };
    // The bride's and the pupil's things: her bouquet on the table end; the pupil's practice stick and notebook.
    const bouquet = new THREE.Group();
    use.add(bouquet);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      part(bouquet, ball(0.03), i % 2 ? '#ffffff' : PINK, 0.15 + Math.cos(a) * 0.04, surf + 0.04 + (i % 3) * 0.01, 0.3 + Math.sin(a) * 0.04);
    }
    part(bouquet, cyl(0.014, 0.01, 0.13, 8), '#7cb342', 0.15, surf + 0.012, 0.22, { rx: Math.PI / 2 });
    const notes = new THREE.Group();
    use.add(notes);
    part(notes, box(0.15, 0.006, 0.2), '#fffde7', 0.12, surf + 0.004, 0.24, { ry: 0.2 });
    for (let i = 0; i < 5; i++) part(notes, box(0.1, 0.002, 0.005), '#9e9e9e', 0.12, surf + 0.008, 0.18 + i * 0.03, { ry: 0.2, outline: false });
    const stick = new THREE.Group();
    use.add(stick);
    const ph = toP(new THREE.Vector3(0, 0, 0.32)).setY(surf + 0.03);
    part(stick, cyl(0.006, 0.006, 0.16, 8), '#bdbdbd', ph.x, ph.y, ph.z, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 5; i++) part(stick, rbox(0.014, 0.004, 0.02, 0.003), POLISH[i], ph.x, ph.y + 0.008, ph.z - 0.06 + i * 0.03, { outline: false });
    for (const sz of [-1, 1]) {
      const s = toP(pupil.shoulder(sz));
      const hnd = new THREE.Vector3(ph.x + 0.05, surf + 0.03, ph.z + sz * 0.07);
      const e = s.clone().lerp(hnd, 0.5).setY(surf + 0.06);
      rod(stick, s, e, 0.034, '#fafafa');
      rod(stick, e, hnd, 0.029, SKIN);
      part(stick, ball(0.03), SKIN, hnd.x, hnd.y, hnd.z, { outline: false });
    }
    // A reference photo on her phone, for the art.
    const phone = new THREE.Group();
    use.add(phone);
    part(phone, rbox(0.075, 0.008, 0.15, 0.008), '#1c1c1f', 0.13, surf + 0.004, -0.12, { ry: -0.3 });
    picture(phone, painted('na-ref', 96, 176, paintRef), 0.065, 0.13, 0.13, surf + 0.0095, -0.12, '#ffffff', -0.3, -Math.PI / 2).rotation.order = 'YXZ';

    const art = () => spot(g, 'sit', ax, seatA, 0, yaw, seatA);
    const reviewAt = new THREE.Vector3(-0.32, 0, 0.62);
    const spots: Record<string, Spot> = {
      doManicure: at(art(), handAt, 'manicure'),
      nailArt: at(art(), handAt, 'manicure'),
      weddingNails: at(art(), handAt, 'manicure'),
      nailArtist_teachClass: at(art(), handAt, 'manicure'),
      nailArtist_reviewWork: at(spot(g, 'stand', reviewAt.x, 0, reviewAt.z, Math.atan2(W.x - reviewAt.x, W.z - reviewAt.z)), handAt, 'admire'),
      '*': at(art(), handAt, 'manicure'),
    };
    out.spots = spots;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const who = now === 'weddingNails' ? 'bride' : now === 'nailArtist_teachClass' ? 'pupil' : now ? 'client' : null;
      client.root.visible = who === 'client';
      bride.root.visible = bouquet.visible = who === 'bride';
      pupil.root.visible = notes.visible = stick.visible = who === 'pupil';
      phone.visible = now === 'nailArt';
      const sp = now ? spots[now] : null;
      // Nobody at the table: the cushion and the capped bottle, no hand.
      kit.holder.visible = !!sp;
      if (!sp) kit.bare('hand');
      else if (now === 'nailArtist_reviewWork') kit.finished('hand', '#f48fb1', 'art');
      else if (now === 'xwSoakOff') kit.bare('hand');
      else {
        const p = phaseAt(sp);
        const n = Math.floor(t / 16 + p);
        if (now === 'weddingNails') kit.show('hand', t, p, '#fff5ee', 'pearl');
        else if (now === 'nailArt') kit.show('hand', t, p, ['#f48fb1', '#b39ddb', '#ffab91'][((n % 3) + 3) % 3], 'art');
        else if (now === 'nailArtist_teachClass') kit.show('mannequin', t, p, '#ef5350');
        else kit.show('hand', t, p, POLISH[((n % POLISH.length) + POLISH.length) % POLISH.length]);
      }
      reach(armClient, who === 'client');
      reach(armBride, who === 'bride');
    };
    // `animate` runs only while the table is in use, and the hand isn't in `use`: it was left on the
    // cushion whenever a treatment ended or was cut off (2026-11-01). Put away the moment no one's on it.
    out.away = () => {
      if (use.visible || !kit.holder.visible) return;
      kit.holder.visible = false;
      kit.bare('hand');
    };
    // After the line above, which replaces `away` (handWorkProps.ts chains on to it).
    spots.xwSoakOff = nailSoakOff(g, out, kit.holder, [towelTools], { at: (s) => at(s, handAt), make: art });
  },

  /**
   * The gel colour wall (컬러 진열장): a white cabinet with a counter top, and over it seven tiers of gel
   * pots in their rows of colour — reds, pinks, nudes, corals, purples, blues and greens, the glitters —
   * a painted swatch tip on the lip in front of each, a lit sign; on the counter a silicone practice
   * hand on its clamp with its own LED lamp and gel bottle. The colours are put back in order with a
   * hand along the tiers; tips are practised on the practice hand (painted nail by nail, cured); stock
   * is counted on the tablet, a carton of new gels on the floor.
   */
  polishShelf(g, W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.21;
    const w = Math.min(W - 0.1, 0.9);
    const top = 0.77;
    part(g, rbox(w, top, 0.42, 0.02), WHITE, 0, top / 2, z);
    for (const sx of [-1, 1]) {
      part(g, rbox(w / 2 - 0.03, top - 0.12, 0.015, 0.008), '#f3eeee', sx * (w / 4), top / 2, z + 0.21);
      part(g, box(0.012, 0.1, 0.012), ROSE_GOLD, sx * 0.04, top / 2 + 0.05, z + 0.222, { outline: false });
    }
    part(g, rbox(w + 0.02, 0.025, 0.46, 0.008), '#f8f1f1', 0, top + 0.005, z + 0.02);
    // The tiers.
    const back = -D / 2 + 0.03;
    part(g, box(w, 1.1, 0.03), '#fdf1f4', 0, top + 0.6, back);
    for (const sx of [-1, 1]) part(g, rbox(0.03, 1.12, 0.2, 0.01), WHITE, sx * (w / 2 - 0.015), top + 0.6, back + 0.09);
    ROWS.forEach((row, r) => {
      const y = top + 0.2 + r * 0.13;
      const zz = back + 0.1;
      part(g, rbox(w - 0.04, 0.012, 0.15, 0.004), WHITE, 0, y, zz);
      part(g, box(w - 0.04, 0.02, 0.006), '#f5f5f5', 0, y + 0.012, zz + 0.075, { outline: false });
      row.forEach((k, i) => {
        const x = -w / 2 + 0.07 + i * ((w - 0.14) / 7);
        part(g, cyl(0.02, 0.02, 0.04, 12), '#fafafa', x, y + 0.026, zz - 0.02, { outline: false });
        part(g, cyl(0.021, 0.021, 0.014, 12), k, x, y + 0.053, zz - 0.02, { outline: false });
        part(g, rbox(0.018, 0.026, 0.004, 0.003), k, x, y + 0.03, zz + 0.079, { outline: false });
      });
    });
    part(g, rbox(w + 0.02, 0.1, 0.22, 0.02), WHITE, 0, top + 1.2, back + 0.1);
    label(g, 'GEL COLOR · 컬러 300+', w * 0.8, 0.06, 0, top + 1.2, back + 0.212, '#ffffff', ROSE);
    glowing(g, box(w - 0.08, 0.008, 0.01), '#fff8e1', 0, top + 1.145, back + 0.17);
    // The practice hand on the counter, with its lamp and bottle; the stock tablet.
    const yaw = Math.PI;
    const Wp = new THREE.Vector3(-0.17, top + 0.018 + 0.052, z + 0.03);
    const kit = nailKit(g, Wp, yaw, ['mannequin'], { lamp: true });
    kit.finished('mannequin', '#ef5350');
    const handAt = marker(g, Wp.x, Wp.y, Wp.z);
    const tab = new THREE.Group();
    tab.position.set(0.24, top + 0.06, z - 0.02);
    tab.rotation.x = -0.6;
    g.add(tab);
    part(tab, rbox(0.25, 0.17, 0.012, 0.012), '#1c1c1f', 0, 0, 0);
    out.screen = litScreen(tab, painted('na-stock', 256, 176, paintStock), 0.23, 0.15, 0, 0, 0.007);
    const tabAt = marker(g, 0.24, top + 0.08, z + 0.02);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, rbox(0.36, 0.24, 0.28, 0.01), '#e0c3a5', 0.25, 0.12, z + 0.52);
    label(use, '입고 · 젤 컬러', 0.2, 0.04, 0.25, 0.18, z + 0.661, '#e0c3a5', '#5d4037');
    for (let i = 0; i < 6; i++) part(use, cyl(0.02, 0.02, 0.04, 10), ROWS[1][i], 0.17 + (i % 3) * 0.08, 0.26, z + 0.47 + Math.floor(i / 3) * 0.09, { outline: false });
    const rack = marker(g, 0.05, top + 0.55, back + 0.12);
    const spots: Record<string, Spot> = {
      arrangePolish: at(spot(g, 'stand', 0.05, 0, z + 0.62, Math.PI), rack, 'rummage'),
      nailArtist_practiceTips: at(spot(g, 'stand', Wp.x, 0, z + 0.5, Math.PI), handAt, 'manicure'),
      nailArtist_orderStock: at(spot(g, 'stand', 0.24, 0, z + 0.58, Math.PI), tabAt, 'type'),
      '*': at(spot(g, 'stand', 0.05, 0, z + 0.62, Math.PI), rack, 'rummage'),
    };
    out.spots = spots;
    out.work = rack;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      if (now === 'nailArtist_practiceTips') kit.show('mannequin', t, phaseAt(spots[now]), ROWS[Math.floor(t / 16) % 7][3]);
      else kit.finished('mannequin', '#ef5350');
      use.visible = now === 'nailArtist_orderStock';
    };
  },

  /**
   * The pedicure chair (페디큐어 의자): a cream leather spa throne up on a white plinth lit underneath,
   * its padded arms and reclined back; in front of it a glass foot basin with water and rose petals on
   * a step, and a padded footrest on its post with a tool tray on an arm (the gel bottle, a foot file,
   * lotion). A pedicure: a client drawn up in the chair, one foot soaking in the basin, the other on the
   * rest, the artist on the low stool facing her painting each toenail, then working lotion in. A client
   * sat waiting in it is seen to from the stool: the sample wheel held up for her to pick a design, or
   * her feet washed in the basin while they chat.
   */
  pedicureChair(g, _W, _D, _c, _def, _ctx, out) {
    const LEATHER = '#efe3d3';
    const seatY = 0.66;
    const sz = -0.17;
    // The plinth, lit underneath.
    part(g, rbox(0.9, 0.24, 0.62, 0.03), WHITE, 0, 0.12, -0.19);
    glowing(g, box(0.86, 0.01, 0.01), '#f8bbd0', 0, 0.02, 0.125);
    part(g, box(0.9, 0.012, 0.004), ROSE_GOLD, 0, 0.22, 0.121, { outline: false });
    // The throne.
    part(g, rbox(0.56, 0.14, 0.5, 0.05), LEATHER, 0, seatY - 0.07, sz);
    part(g, rbox(0.62, 0.2, 0.52, 0.04), '#d7c7b2', 0, 0.34, sz - 0.02);
    const backG = new THREE.Group();
    backG.position.set(0, seatY, -0.42);
    backG.rotation.x = -0.25;
    g.add(backG);
    part(backG, rbox(0.6, 0.8, 0.14, 0.06), LEATHER, 0, 0.4, 0);
    for (let i = 0; i < 3; i++) part(backG, rbox(0.5, 0.2, 0.03, 0.03), '#e8d9c5', 0, 0.16 + i * 0.22, 0.07);
    part(backG, rbox(0.32, 0.12, 0.1, 0.05), LEATHER, 0, 0.86, 0.04);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.12, 0.14, 0.54, 0.05), LEATHER, sx * 0.34, seatY + 0.13, sz);
      part(g, rbox(0.1, 0.02, 0.4, 0.01), '#4e342e', sx * 0.34, seatY + 0.205, sz, { outline: false });
    }
    // The remote on the right arm.
    part(g, rbox(0.04, 0.015, 0.1, 0.008), '#424242', -0.34, seatY + 0.215, sz + 0.12);
    out.seat = marker(g, 0, seatY, sz);
    // The basin on its step.
    const bz = 0.29;
    part(g, cyl(0.25, 0.26, 0.04, 28), '#d7ccc8', 0.02, 0.02, bz);
    const bowl = new THREE.LatheGeometry([new THREE.Vector2(0.15, 0.04), new THREE.Vector2(0.2, 0.08), new THREE.Vector2(0.22, 0.16), new THREE.Vector2(0.225, 0.24)], 28);
    const bm = glass(g, bowl, 0.02, 0, bz);
    bm.userData.ownGeometry = true;
    part(g, ring(0.225, 0.008), CHROME, 0.02, 0.24, bz, { rx: Math.PI / 2, outline: false });
    glass(g, cyl(0.21, 0.17, 0.13, 28), 0.02, 0.105, bz, WATER);
    const rnd = seeded(77);
    for (let i = 0; i < 9; i++) part(g, cyl(0.015, 0.015, 0.002, 8), i % 3 ? '#f06292' : '#ffffff', 0.02 + (rnd() - 0.5) * 0.3, 0.172, bz + (rnd() - 0.5) * 0.3, { outline: false });
    // The footrest on its post with the tool tray on an arm.
    const W = new THREE.Vector3(-0.1, 0.37, 0.46);
    part(g, rbox(0.14, 0.05, 0.26, 0.02), LEATHER, W.x, 0.32, W.z);
    part(g, rbox(0.15, 0.006, 0.27, 0.003), '#fce4ec', W.x, 0.348, W.z, { outline: false });
    rod(g, new THREE.Vector3(W.x, 0.3, W.z + 0.1), new THREE.Vector3(W.x, 0.0, W.z + 0.1), 0.018, CHROME);
    part(g, cyl(0.09, 0.1, 0.02, 16), CHROME, W.x, 0.01, W.z + 0.1);
    const yaw = Math.PI;
    const off = framer(W, yaw);
    const tray = off(PEDI.bottle);
    rod(g, new THREE.Vector3(W.x, 0.27, W.z + 0.1), new THREE.Vector3(tray.x, tray.y - 0.01, tray.z), 0.01, CHROME);
    part(g, rbox(0.16, 0.012, 0.14, 0.004), '#fafafa', tray.x, tray.y - 0.006, tray.z);
    part(g, rbox(0.016, 0.006, 0.12, 0.003), '#bcaaa4', tray.x + 0.05, tray.y + 0.003, tray.z + 0.0);
    part(g, cyl(0.016, 0.016, 0.06, 10), '#ffffff', tray.x - 0.05, tray.y + 0.03, tray.z - 0.035);
    part(g, cyl(0.006, 0.006, 0.02, 6), ROSE, tray.x - 0.05, tray.y + 0.07, tray.z - 0.035, { outline: false });
    const kit = nailKit(g, W, yaw, ['foot']);
    const footAt = marker(g, W.x, W.y, W.z);
    // The artist's low stool, its place moved in for a soak.
    const stoolY = 0.4;
    const stool = artistStool(g, W.x, stoolY, 0.86, 0);
    const wheelAt = marker(g, W.x, 0.9, 0.56);
    const soakAt = marker(g, 0.0, 0.14, bz + 0.03);
    const spots: Record<string, Spot> = {
      doPedicure: at(spot(g, 'sit', W.x, stoolY, 0.86, yaw, stoolY), footAt, 'pedicure'),
      'social:pickDesign': at(spot(g, 'sit', W.x, stoolY, 0.86, yaw, stoolY), wheelAt, 'nailShow'),
      'social:nailChat': at(spot(g, 'sit', 0.0, stoolY, 0.74, yaw, stoolY), soakAt, 'footSoak'),
      '*': at(spot(g, 'sit', W.x, stoolY, 0.86, yaw, stoolY), footAt, 'pedicure'),
    };
    out.spots = spots;
    out.work = footAt;

    // In use: a client drawn up in the chair, trousers rolled, a towel over her lap.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const client = seatedFigure(use, seatY, { top: '#80cbc4', bottom: '#8d6e63', hair: '#4e342e' }, { legs: false, lean: -0.12 });
    seat(client, 0, sz, 0);
    const hipY = seatY + 0.07;
    const legR = { hip: new THREE.Vector3(-0.1, hipY, sz + 0.05), knee: new THREE.Vector3(-0.1, hipY + 0.06, 0.16), ankle: off({ side: 0, up: 0.05, ahead: 0.08 }) };
    rod(use, legR.hip, legR.knee, 0.062, '#8d6e63');
    part(use, ball(0.058), '#8d6e63', legR.knee.x, legR.knee.y, legR.knee.z, { outline: false });
    rod(use, legR.knee, legR.ankle, 0.045, SKIN);
    const legL = { hip: new THREE.Vector3(0.1, hipY, sz + 0.05), knee: new THREE.Vector3(0.1, hipY + 0.03, 0.15), ankle: new THREE.Vector3(0.1, 0.12, 0.3) };
    rod(use, legL.hip, legL.knee, 0.062, '#8d6e63');
    part(use, ball(0.058), '#8d6e63', legL.knee.x, legL.knee.y, legL.knee.z, { outline: false });
    rod(use, legL.knee, legL.ankle, 0.045, SKIN);
    part(use, rbox(0.085, 0.045, 0.19, 0.022), SKIN, 0.1, 0.07, 0.37);
    part(use, rbox(0.4, 0.03, 0.36, 0.015), WHITE, 0, hipY + 0.06, sz + 0.12, { rx: 0.1 });
    // Her phone in her hand on the arm, the bubbles in the water.
    part(use, rbox(0.07, 0.008, 0.14, 0.008), '#1c1c1f', 0.3, seatY + 0.23, sz + 0.12, { rx: -0.6 });
    const drawnClient = use.children.slice(0, -1);
    const heel = legR.ankle.clone().sub(W);
    const clientRoot = new THREE.Group();
    clientRoot.position.set(0, 0, sz);
    use.add(clientRoot);
    const clientHead = new THREE.Group();
    clientRoot.add(clientHead);
    const noArm = () => undefined;
    const vroidClient = vroidFigure({ root: clientRoot, head: clientHead, armL: noArm, armR: noArm }, {
      gender: 'female',
      seat: seatY,
      pieces: ['tops', 'bottoms'],
      hide: drawnClient,
      noFoot: ['right'],
      legs: () => ({ r: kit.handAt().add(heel), l: legL.ankle }),
    });
    vroidClient.armL(new THREE.Vector3(0.3, seatY + 0.23, sz + 0.1));
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) bubbles.push(part(g, ball(0.008 + (i % 3) * 0.003), '#e1f5fe', 0, 0, 0, { outline: false }));
    // Seeing to a client sat in it: the sample wheel, the towel over the rest.
    const wheel = tipWheel(g, 0.1, [...ROWS[1].slice(0, 6), ...ROWS[3].slice(0, 4), ...ROWS[4].slice(0, 4)], 5);
    wheel.position.copy(wheelAt.position);
    wheel.rotation.y = Math.PI;
    const towel = part(g, rbox(0.3, 0.012, 0.2, 0.006), WHITE, 0.0, 0.25, 0.48, { rx: 0.15 });
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const working = now === 'doPedicure' || now === '*';
      const social = !!now?.startsWith('social:');
      wheel.visible = now === 'social:pickDesign';
      towel.visible = now === 'social:nailChat';
      stool.position.z = now === 'social:nailChat' ? 0.74 : 0.86;
      stool.position.x = now === 'social:nailChat' ? 0.0 : W.x;
      if (working) kit.show('foot', t, phaseAt(spots[now!]), POLISH[(Math.floor(t / 16) % 4) + 1]);
      else kit.bare('foot');
      kit.root.visible = working;
      // Bubbles up through the water while someone's feet are in it.
      const on = working || social;
      bubbles.forEach((b, i) => {
        b.visible = on;
        if (!on) return;
        const u = (t * 0.6 + i * 0.137) % 1;
        const a = i * 2.4;
        b.position.set(0.02 + Math.cos(a) * (0.05 + (i % 4) * 0.035), 0.05 + u * 0.12, bz + Math.sin(a) * (0.05 + (i % 4) * 0.035));
      });
    };
    kit.root.visible = false;
    out.away = (_out, t) => {
      if (!use.visible && !nowAt(spots, t)) kit.root.visible = false;
    };
  },

  /**
   * The nail-art sample wall (네일 아트 샘플 월): a white wall unit with a lit pink header, a grid of
   * sample cards each with five painted tips and its price, two colour wheels of the season, a framed
   * bridal collection, and a ledge at waist height with a sample stick of clear tips on its holder, a
   * gel bottle and a mini lamp; the storage under it. This month's art is made on the stick, nail by
   * nail, and cured under the lamp.
   */
  naArtWall(g, W, D, _c, _def, _ctx, out) {
    const back = -D / 2 + 0.04;
    const w = W - 0.14;
    part(g, rbox(w, 1.95, 0.06, 0.02), WHITE, 0, 0.975, back);
    part(g, rbox(w + 0.04, 0.16, 0.12, 0.03), PINK, 0, 2.0, back + 0.04);
    label(g, 'NAIL ART · 이달의 아트', 0.9, 0.08, 0, 2.0, back + 0.101, PINK, '#ad1457');
    glowing(g, box(w - 0.1, 0.008, 0.01), '#fff8e1', 0, 1.91, back + 0.08);
    // The storage under the ledge.
    const ledge = 0.93;
    part(g, rbox(w, ledge, 0.36, 0.02), '#f7f2f2', 0, ledge / 2, back + 0.2);
    for (let i = 0; i < 4; i++) {
      part(g, rbox(w / 4 - 0.03, ledge - 0.12, 0.015, 0.008), WHITE, -w / 2 + w / 8 + (i * w) / 4, ledge / 2, back + 0.38);
      part(g, box(0.01, 0.1, 0.012), ROSE_GOLD, -w / 2 + w / 8 + (i * w) / 4 + (i % 2 ? -0.08 : 0.08), ledge / 2 + 0.05, back + 0.39, { outline: false });
    }
    part(g, rbox(w + 0.02, 0.025, 0.4, 0.008), '#fdf6f7', 0, ledge + 0.005, back + 0.2);
    // The sample cards: four rows of four, five painted tips each, the price under.
    const rnd = seeded(13);
    const prices = ['원컬러 45,000', '그라데이션 55,000', '프렌치 55,000', '아트 +10,000', '자석젤 60,000', '글리터 50,000', '마블 +15,000', '파츠 +5,000'];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const x = -0.82 + c * 0.2;
        const y = 1.2 + r * 0.17;
        part(g, rbox(0.17, 0.15, 0.012, 0.01), '#ffffff', x, y, back + 0.04);
        const row = ROWS[(r * 4 + c) % ROWS.length];
        for (let i = 0; i < 5; i++) {
          part(g, rbox(0.022, 0.05, 0.005, 0.006), row[(i + c) % 8], x - 0.056 + i * 0.028, y + 0.02, back + 0.049, { outline: false });
          if (rnd() > 0.6) part(g, ball(0.004), rnd() > 0.5 ? '#ffffff' : GOLD, x - 0.056 + i * 0.028, y + 0.03, back + 0.053, { outline: false });
        }
        label(g, prices[(r * 4 + c) % prices.length], 0.15, 0.025, x, y - 0.045, back + 0.047, '#ffffff', '#ad1457');
      }
    // The season's wheels and the bridal collection.
    const w1 = tipWheel(g, 0.14, [...ROWS[0], ...ROWS[1].slice(0, 6)], 3);
    w1.position.set(0.3, 1.65, back + 0.05);
    const w2 = tipWheel(g, 0.14, [...ROWS[3], ...ROWS[5].slice(0, 6)], 9);
    w2.position.set(0.68, 1.65, back + 0.05);
    label(g, '봄 신상 컬러', 0.3, 0.04, 0.49, 1.45, back + 0.04, WHITE, '#ad1457');
    part(g, rbox(0.3, 0.38, 0.02, 0.01), GOLD, 0.49, 1.15, back + 0.04);
    picture(g, painted('na-gallery', 192, 256, paintGallery), 0.26, 0.34, 0.49, 1.15, back + 0.052);
    // On the ledge: the sample stick on its holder, a bottle and the lamp; a box of clear tips.
    const yaw = Math.PI;
    const Wt = new THREE.Vector3(-0.35, ledge + 0.018 + 0.052, back + 0.22);
    const kit = nailKit(g, Wt, yaw, ['tips'], { lamp: true });
    kit.finished('tips', '#f48fb1', 'art');
    const tipsAt = marker(g, Wt.x, Wt.y, Wt.z);
    part(g, rbox(0.14, 0.04, 0.09, 0.008), '#e1f5fe', 0.2, ledge + 0.04, back + 0.25);
    for (let i = 0; i < 6; i++) part(g, rbox(0.016, 0.004, 0.022, 0.003), TIP, 0.15 + i * 0.02, ledge + 0.062, back + 0.25, { outline: false });
    const spots: Record<string, Spot> = { '*': at(spot(g, 'stand', Wt.x, 0, back + 0.72, yaw), tipsAt, 'manicure') };
    out.spots = spots;
    out.work = tipsAt;
    out.animate = (t) => {
      if (nowAt(spots, t)) kit.show('tips', t, phaseAt(spots['*']), ROWS[1][(Math.floor(t / 16) % 5) + 1], 'art');
      else kit.finished('tips', '#f48fb1', 'art');
    };
  },

  /**
   * The tool steriliser (도구 소독기): a white cabinet with drawers labelled for the files, buffers and
   * nippers, and on it the UV steriliser — nippers and pushers stood in its rack behind a smoked door,
   * glowing violet while it runs, its timer — a tall jar of blue disinfectant with tools in it, a tray of
   * sealed sterilisation pouches and the hand sanitiser; the shop's sign: one set a client, sterilised
   * every time.
   */
  naSterilizer(g, _W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.23;
    part(g, rbox(0.72, 0.74, 0.42, 0.02), WHITE, 0, 0.37, z);
    ['파일·버퍼', '니퍼', '푸셔·큐렛'].forEach((s, i) => {
      part(g, rbox(0.66, 0.2, 0.015, 0.008), '#f3eeee', 0, 0.14 + i * 0.22, z + 0.21);
      part(g, box(0.14, 0.012, 0.015), ROSE_GOLD, 0, 0.2 + i * 0.22, z + 0.222, { outline: false });
      label(g, s, 0.16, 0.035, 0, 0.12 + i * 0.22, z + 0.219, '#f3eeee', '#757575');
    });
    const top = 0.75;
    part(g, rbox(0.76, 0.03, 0.44, 0.01), '#f5f0f0', 0, top, z);
    // The UV steriliser.
    const sx = -0.12;
    const t0 = top + 0.015;
    part(g, rbox(0.4, 0.34, 0.27, 0.02), '#fafafa', sx, t0 + 0.17, z - 0.03);
    part(g, rbox(0.3, 0.24, 0.01, 0.01), '#3a3346', sx - 0.02, t0 + 0.17, z + 0.105);
    for (let i = 0; i < 7; i++) {
      const x = sx - 0.12 + i * 0.033;
      part(g, cyl(0.004, 0.004, 0.13, 6), STEEL, x, t0 + 0.12, z + 0.06, { outline: false });
      if (i % 2) for (const s of [-1, 1]) part(g, box(0.004, 0.035, 0.01), STEEL, x + s * 0.006, t0 + 0.2, z + 0.06, { rz: s * 0.25, outline: false });
      else part(g, box(0.012, 0.012, 0.004), STEEL, x, t0 + 0.19, z + 0.06, { outline: false });
    }
    const lamp = glowing(g, box(0.27, 0.21, 0.004), UV, sx - 0.02, t0 + 0.17, z + 0.1);
    glass(g, box(0.3, 0.24, 0.006), sx - 0.02, t0 + 0.17, z + 0.112);
    part(g, box(0.012, 0.12, 0.02), CHROME, sx + 0.16, t0 + 0.17, z + 0.12, { outline: false });
    out.screen = litScreen(g, painted('na-uv', 128, 48, paintSteri), 0.05, 0.02, sx + 0.16, t0 + 0.3, z + 0.116);
    label(g, 'UV 소독', 0.12, 0.035, sx - 0.02, t0 + 0.315, z + 0.106, '#fafafa', '#7e57c2');
    const door = marker(g, sx + 0.1, t0 + 0.18, z + 0.13);
    // The disinfectant jar, the pouches, the sanitiser.
    const jx = 0.22;
    glass(g, cyl(0.05, 0.05, 0.22, 16), jx, t0 + 0.11, z - 0.06);
    glass(g, cyl(0.045, 0.045, 0.16, 16), jx, t0 + 0.08, z - 0.06, new THREE.MeshBasicMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.55, depthWrite: false }));
    part(g, cyl(0.053, 0.053, 0.02, 16), BLACK, jx, t0 + 0.23, z - 0.06);
    for (let i = 0; i < 4; i++) rod(g, new THREE.Vector3(jx - 0.02 + i * 0.013, t0 + 0.04, z - 0.06), new THREE.Vector3(jx - 0.03 + i * 0.02, t0 + 0.28, z - 0.06 + (i % 2 ? 0.01 : -0.01)), 0.003, STEEL);
    part(g, rbox(0.2, 0.02, 0.14, 0.006), '#e0e0e0', 0.2, t0 + 0.01, z + 0.12);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.07, 0.006, 0.12), i % 2 ? '#bbdefb' : '#ffffff', 0.14 + i * 0.06, t0 + 0.024 + i * 0.006, z + 0.12, { ry: 0.1 * i, outline: false });
      part(g, box(0.008, 0.004, 0.07), STEEL, 0.14 + i * 0.06, t0 + 0.03 + i * 0.006, z + 0.12, { ry: 0.1 * i, outline: false });
    }
    part(g, cyl(0.025, 0.028, 0.12, 12), '#e0f7fa', 0.33, t0 + 0.06, z - 0.15);
    part(g, box(0.05, 0.012, 0.014), WHITE, 0.34, t0 + 0.13, z - 0.15, { outline: false });
    label(g, '1인 1도구 · 매회 소독', 0.4, 0.06, 0, 1.45, -D / 2 + 0.012, '#ffffff', '#00897b');
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    lamp.removeFromParent();
    use.add(lamp);
    out.idle = part(g, box(0.27, 0.21, 0.004), '#2a2333', sx - 0.02, t0 + 0.17, z + 0.099, { outline: false });
    out.work = door;
    out.spots = { '*': at(spot(g, 'stand', sx + 0.05, 0, z + 0.64, Math.PI), door, 'tinker') };
  },

  /**
   * The parts drawer (파츠 서랍장): a clear acrylic tower of little drawers on a white cabinet, each
   * showing what's in it — crystal stones, pearls, gold studs, glitter, hearts, stickers — with a dot of
   * its colour on the front; on top a round parts palette and the tweezers. Sorting: a drawer pulled out,
   * the stones picked over into the palette with the tweezers.
   */
  naPartsDrawer(g, _W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.22;
    part(g, rbox(0.66, 0.6, 0.4, 0.02), WHITE, 0, 0.3, z);
    for (let i = 0; i < 2; i++) {
      part(g, rbox(0.6, 0.25, 0.015, 0.008), '#f3eeee', 0, 0.16 + i * 0.28, z + 0.2);
      part(g, box(0.14, 0.012, 0.015), ROSE_GOLD, 0, 0.24 + i * 0.28, z + 0.212, { outline: false });
    }
    part(g, rbox(0.7, 0.025, 0.42, 0.008), '#fdf6f7', 0, 0.61, z);
    // The acrylic tower: 6 rows of 4 drawers.
    const t0 = 0.625;
    const cols = 4;
    const rows = 6;
    const dw = 0.14;
    const dh = 0.085;
    glass(g, box(cols * dw + 0.02, rows * dh + 0.02, 0.3), 0, t0 + (rows * dh) / 2 + 0.01, z - 0.04);
    const bits = ['#e1f5fe', '#fff8e1', GOLD, '#f48fb1', '#c0c0c0', '#b39ddb', '#ffffff', '#80deea', '#ffd54f', '#ef9a9a', '#a5d6a7', '#ce93d8'];
    const rnd = seeded(21);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = -((cols - 1) * dw) / 2 + c * dw;
        const y = t0 + 0.015 + r * dh + dh / 2;
        const k = bits[(r * cols + c) % bits.length];
        part(g, box(dw - 0.012, dh - 0.012, 0.004), '#eef7fb', x, y, z + 0.11, { outline: false });
        for (let i = 0; i < 6; i++) part(g, ball(0.006 + rnd() * 0.004), k, x - 0.04 + rnd() * 0.08, y - dh / 2 + 0.014, z + 0.03 + rnd() * 0.06, { outline: false });
        part(g, ball(0.008), k, x, y + 0.02, z + 0.114, { outline: false });
        part(g, box(0.03, 0.006, 0.006), '#b0bec5', x, y - 0.012, z + 0.115, { outline: false });
      }
    part(g, rbox(cols * dw + 0.04, 0.02, 0.32, 0.008), WHITE, 0, t0 + rows * dh + 0.03, z - 0.04);
    label(g, 'PARTS · 스톤 · 파츠', 0.4, 0.05, 0, t0 + rows * dh + 0.08, z - 0.04, '#ffffff', '#ad1457');
    // In use: a drawer out on the top, the palette, the tweezers.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const dx = -0.07;
    const dy = t0 + 0.015 + 2 * dh + dh / 2;
    glass(use, box(dw - 0.014, dh - 0.02, 0.2), dx, dy, z + 0.2);
    for (let i = 0; i < 10; i++) part(use, ball(0.007), i % 2 ? '#e1f5fe' : '#ffffff', dx - 0.04 + rnd() * 0.08, dy - dh / 2 + 0.02, z + 0.13 + rnd() * 0.14, { outline: false });
    const pal = new THREE.Group();
    pal.position.set(0.18, 0.632, z + 0.17);
    use.add(pal);
    part(pal, cyl(0.08, 0.08, 0.012, 24), '#fafafa', 0, 0, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(pal, ball(0.008), bits[i], Math.cos(a) * 0.05, 0.01, Math.sin(a) * 0.05, { outline: false });
    }
    rod(use, new THREE.Vector3(0.06, 0.64, z + 0.24), new THREE.Vector3(0.14, 0.64, z + 0.3), 0.004, STEEL);
    const drawerAt = marker(g, dx, dy, z + 0.2);
    out.work = drawerAt;
    out.spots = { '*': at(spot(g, 'stand', 0, 0, z + 0.66, Math.PI), drawerAt, 'tinker') };
  },

  /**
   * The waiting loveseat (대기 소파): pink velvet, buttoned, on gold legs, a cushion at each end; the
   * shop's design book lying on the arm and a menu card stood against the back.
   */
  naWaitSofa(g, W, D) {
    const w = W - 0.12;
    const seatY = 0.42;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.012, 0.14, 8), GOLD, sx * (w / 2 - 0.08), 0.07, sz * 0.25, { outline: false });
    part(g, rbox(w, 0.16, 0.66, 0.05), VELVET, 0, 0.21, -0.03);
    for (const sx of [-1, 1]) part(g, rbox(w / 2 - 0.12, 0.12, 0.56, 0.05), '#f7b7c8', sx * (w / 4 - 0.02), seatY - 0.06, 0.0);
    part(g, rbox(w, 0.5, 0.16, 0.07), VELVET, 0, seatY + 0.2, -D / 2 + 0.12, { rx: -0.08 });
    for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) part(g, ball(0.012), '#e57399', -w / 2 + 0.2 + i * ((w - 0.4) / 6), seatY + 0.15 + j * 0.16, -D / 2 + 0.205 - j * 0.012, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.13, 0.32, 0.66, 0.06), VELVET, sx * (w / 2 - 0.065), seatY + 0.02, -0.03);
    for (const sx of [-1, 1]) part(g, rbox(0.3, 0.28, 0.1, 0.06), sx < 0 ? '#ffffff' : '#f3e5f5', sx * (w / 2 - 0.3), seatY + 0.16, -D / 2 + 0.23, { rz: sx * 0.15 });
    // The design book on the right arm, open; a menu card stood on the left.
    const book = new THREE.Group();
    book.position.set(w / 2 - 0.065, seatY + 0.185, 0.0);
    g.add(book);
    for (const s of [-1, 1]) {
      part(book, box(0.1, 0.01, 0.15), '#ffffff', 0, 0, s * 0.075, { rx: s * -0.08 });
      for (let i = 0; i < 4; i++) part(book, box(0.02, 0.003, 0.03), ROWS[i + 1][2 + (s + 1) * 2], -0.03 + (i % 2) * 0.04, 0.008, s * 0.075 + (i < 2 ? -0.03 : 0.03), { outline: false });
    }
    label(book, '디자인 북', 0.08, 0.02, 0, 0.006, -0.12, '#ffffff', '#ad1457').rotation.x = -Math.PI / 2;
    part(g, rbox(0.12, 0.17, 0.01, 0.005), '#ffffff', -(w / 2 - 0.065), seatY + 0.26, -0.15, { rx: -0.2 });
    label(g, '시술 메뉴', 0.09, 0.025, -(w / 2 - 0.065), seatY + 0.3, -0.144, '#ffffff', '#ad1457');
  },

  /**
   * The reception desk (안내 데스크): a white desk, the staff's side at its front, behind it the raised
   * ledge the clients come up to, its pink face with the shop's name; on the desk the booking tablet
   * on its stand (today's bookings), the card terminal, the phone, the design books; on the ledge the
   * gift sets of gels, the business cards and a vase of tulips. Bookings are checked and taken on the
   * tablet.
   */
  naReception(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.12;
    const top = 0.75;
    part(g, rbox(w, top, 0.52, 0.02), WHITE, 0, top / 2, -0.12);
    part(g, rbox(w + 0.02, 0.03, 0.56, 0.01), '#f8f1f1', 0, top + 0.01, -0.1);
    // The ledge the clients come up to (at the back), its face to them.
    const lz = -D / 2 + 0.07;
    part(g, rbox(w, 1.08, 0.08, 0.02), PINK, 0, 0.54, lz);
    part(g, rbox(w + 0.04, 0.035, 0.22, 0.01), WHITE, 0, 1.095, lz + 0.03);
    label(g, 'NAIL DAISY · 네일 데이지', 0.9, 0.1, 0, 0.7, lz - 0.041, PINK, '#ffffff', Math.PI);
    for (let i = 0; i < 5; i++) part(g, ball(0.03), '#ffffff', -0.62 + i * 0.03, 0.88 + (i % 2) * 0.03, lz - 0.045, { outline: false }).scale.set(1, 1, 0.3);
    // On the ledge: the gift sets, the cards, the tulips.
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.14, 0.08, 0.08, 0.008), ['#fce4ec', '#f3e5f5', '#fff3e0'][i], -0.6 + i * 0.17, 1.15, lz + 0.03);
      for (let j = 0; j < 3; j++) part(g, cyl(0.009, 0.009, 0.04, 8), ROWS[i + 1][j * 2], -0.64 + i * 0.17 + j * 0.04, 1.2, lz + 0.03, { outline: false });
    }
    part(g, rbox(0.1, 0.03, 0.07, 0.005), '#fafafa', 0.1, 1.13, lz + 0.03);
    part(g, cyl(0.035, 0.03, 0.14, 12), '#e1f5fe', 0.55, 1.18, lz + 0.03);
    for (let i = 0; i < 4; i++) {
      rod(g, new THREE.Vector3(0.55, 1.2, lz + 0.03), new THREE.Vector3(0.53 + i * 0.015, 1.36 + (i % 2) * 0.03, lz + 0.02 + (i % 2) * 0.02), 0.004, '#7cb342');
      part(g, ball(0.022), i % 2 ? '#f06292' : '#ffcc80', 0.53 + i * 0.015, 1.38 + (i % 2) * 0.03, lz + 0.02 + (i % 2) * 0.02).scale.set(1, 1.3, 1);
    }
    // On the desk: the booking tablet on its stand, the card terminal, the phone, the books.
    const tab = new THREE.Group();
    tab.position.set(0.3, top + 0.13, -0.12);
    tab.rotation.x = -0.35;
    g.add(tab);
    part(tab, rbox(0.27, 0.19, 0.012, 0.012), '#1c1c1f', 0, 0, 0);
    out.screen = litScreen(tab, painted('na-booking', 256, 176, paintBooking), 0.25, 0.17, 0, 0, 0.007);
    part(g, box(0.05, 0.12, 0.06), '#bdbdbd', 0.3, top + 0.06, -0.17, { outline: false });
    const tabAt = marker(g, 0.3, top + 0.1, -0.03);
    part(g, rbox(0.08, 0.03, 0.14, 0.01), '#37474f', -0.15, top + 0.04, -0.05, { rx: 0.25 });
    part(g, box(0.06, 0.004, 0.05), '#90caf9', -0.15, top + 0.058, -0.06, { rx: 0.25, outline: false });
    part(g, rbox(0.16, 0.05, 0.2, 0.015), '#fafafa', -0.42, top + 0.04, -0.15);
    part(g, rbox(0.05, 0.03, 0.18, 0.01), '#fafafa', -0.48, top + 0.08, -0.15, { rz: 0.3 });
    for (let i = 0; i < 3; i++) part(g, rbox(0.2, 0.025, 0.26, 0.006), ['#f48fb1', '#ce93d8', '#ffffff'][i], -0.72, top + 0.03 + i * 0.026, -0.15, { ry: 0.05 * i });
    out.work = tabAt;
    out.spots = { '*': at(spot(g, 'stand', 0.3, 0, 0.42, Math.PI), tabAt, 'type') };
  },
};
