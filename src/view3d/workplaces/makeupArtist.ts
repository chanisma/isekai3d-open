import { frontDesk } from './frontDesk';
import { neighbourShop, shopFront } from './shopFront';
import * as THREE from 'three';
import { makeupRound, toolPhase, type BarOffset, type Motion } from '../activity';
import { SHOP_DETAIL } from '../furnitureShop';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox, toon } from '../toon';
import { BLACK, CHROME, STEEL, caster, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';

/**
 * The make-up shop drawn as itself (2026-10-27 workplace pipeline, at the user's request): the vanity
 * (furnitureShop.ts) given its work — a client drawn in its chair, turned to the artist, made up with
 * sponge and brushes from the palette in the artist's other hand; the bride in her gown and veil for
 * the bride's make-up — the artist's trolley where brushes are washed, the special-effects table with
 * a prosthetic sculpted and painted on a head form, the rack of outfits, and what the 메이크업 숍 was
 * missing (workFurniture/makeupArtist.ts): the tall make-up chair a client is seen to in, the
 * ring-light consultation table it faces, the UV brush steriliser, the shop's cosmetics cabinet and
 * the bridal corner with the gown and veil.
 */

const ROSE_GOLD = '#d4a28c';
const SKIN = '#f3cfb3';
const HAIR = '#2e211b';
const WHITE = '#fbfbfb';
const IVORY = '#fffaf0';
const LEATHER = '#26262b';
const MIRROR = toon('#d9eef7', '#5c7c8a');
const VEIL = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
const UV = '#b388ff';

const EYESHADOW = ['#e8b9a5', '#c98b73', '#a0614f', '#f4d7c6', '#8e5b8a', '#d4a373', '#5d4037', '#f1c1c8'];
const FOUNDATION = ['#f7e0cc', '#f2d2b6', '#ecc6a4', '#e3b892', '#d9a97f', '#c99670', '#f5d9c4', '#e8c0a0'];
const FX_PAINT = ['#8b0000', '#b71c1c', '#4a148c', '#6d8b3a', '#d4b483', '#3e2723', '#c2185b', '#1b1b1b'];

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
/** A standing spot at (x, z) turned to face a point. */
function facing(g: THREE.Object3D, x: number, z: number, to: THREE.Vector3): Spot {
  return spot(g, 'stand', x, 0, z, Math.atan2(to.x - x, to.z - z));
}

// ---------------------------------------------------------------------------------------------
// What's in an artist's hands, each with its +z the way it points (the hand at the origin).

/** A make-up brush: the handle from the hand, the ferrule, the head at ~0.13 m. */
function brush(g: THREE.Object3D, kind: 'eye' | 'blush' | 'fine', handle = BLACK): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.0045, 0.0035, 0.1, 8), handle, 0, 0, 0.04, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.0055, 0.0045, 0.025, 8), ROSE_GOLD, 0, 0, 0.1, { rx: Math.PI / 2, outline: false });
  if (kind === 'blush') {
    part(root, ball(0.019), '#f3d9c9', 0, 0, 0.125, { outline: false }).scale.set(1, 1, 1.35);
    part(root, ball(0.012), '#e88fa5', 0, 0, 0.142, { outline: false });
  } else if (kind === 'eye') {
    part(root, cyl(0.002, 0.006, 0.024, 8), '#5d4037', 0, 0, 0.124, { rx: Math.PI / 2, outline: false });
  } else part(root, cyl(0.0008, 0.003, 0.02, 6), '#8b0000', 0, 0, 0.122, { rx: Math.PI / 2, outline: false });
  return root;
}
/** A beauty-blender sponge, held at its back. */
function sponge(g: THREE.Object3D, color = '#f06292'): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, ball(0.022), color, 0, 0, 0.025, { outline: false }).scale.set(0.9, 0.9, 1.35);
  return root;
}
/** A sculpting spatula (FX). */
function spatula(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.004, 0.004, 0.09, 8), '#8d6e63', 0, 0, 0.035, { rx: Math.PI / 2, outline: false });
  part(root, box(0.012, 0.002, 0.045), STEEL, 0, 0, 0.1, { outline: false });
  return root;
}
/** A stipple sponge, black and torn-edged (FX: texture and blood). */
function stipple(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, rbox(0.03, 0.025, 0.035, 0.008), '#212121', 0, 0, 0.022, { outline: false });
  part(root, box(0.026, 0.02, 0.004), '#8b0000', 0, 0, 0.04, { outline: false });
  return root;
}
/** An open palette: the pans in two rows, the mirror in the lid hinged up at the far edge. */
function palette(g: THREE.Object3D, colors: string[], body = BLACK): THREE.Group {
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  g.add(root);
  part(root, rbox(0.17, 0.012, 0.1, 0.006), body, 0, 0, 0);
  colors.forEach((k, i) => part(root, box(0.034, 0.004, 0.034), k, -0.06 + (i % 4) * 0.04, 0.007, -0.02 + Math.floor(i / 4) * 0.04, { outline: false }));
  const lid = new THREE.Group();
  lid.position.set(0, 0.006, 0.05);
  lid.rotation.x = -1.9;
  root.add(lid);
  part(lid, rbox(0.17, 0.008, 0.1, 0.006), body, 0, 0, -0.05);
  const m = new THREE.Mesh(box(0.15, 0.002, 0.08), MIRROR);
  m.position.set(0, -0.005, -0.05);
  lid.add(m);
  return root;
}

/**
 * The tools of a make-up round (activity.ts makeupRound) for an artist at `yaw` working on a face at
 * `F` (both in `g`'s frame): the palette in the left hand, the sponge or a brush in the right where
 * the hand is. The FX version is the spatula, the fine brush and the stipple sponge.
 */
function makeupKit(g: THREE.Object3D, F: THREE.Vector3, yaw: number, colors: string[], fx = false) {
  const root = new THREE.Group();
  g.add(root);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const off = (o: BarOffset, v = new THREE.Vector3()) => v.copy(F).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
  const pal = palette(root, colors, fx ? '#37474f' : BLACK);
  pal.rotation.y = yaw;
  pal.rotation.x = 0.45;
  const tools = fx ? [spatula(root), brush(root, 'fine', '#8d6e63'), stipple(root)] : [sponge(root), brush(root, 'eye'), brush(root, 'blush', ROSE_GOLD)];
  const hand = new THREE.Vector3();
  const tip = new THREE.Vector3();
  return {
    root,
    show(t: number, ph: number) {
      const k = makeupRound(t, ph);
      off(k.palette, pal.position).y -= 0.01;
      tools.forEach((o, i) => (o.visible = i === k.stage));
      aim(tools[k.stage], off(k.r, hand), off(k.tip, tip));
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Someone sat in a chair, drawn (the client at the vanity, the bride): facing +z from their seat.

/** A head (the face to +z), the hair back off the face: a band over it for make-up, or a bride's up-do. */
function head(g: THREE.Object3D, bride: boolean): THREE.Group {
  const h = new THREE.Group();
  h.rotation.order = 'YXZ';
  g.add(h);
  part(h, ball(0.09), SKIN, 0, 0, 0).scale.set(0.92, 1.06, 1);
  part(h, ball(0.095), HAIR, 0, 0.026, -0.016).scale.set(1, 0.9, 1.0);
  for (const sx of [-1, 1]) part(h, ball(0.017), SKIN, sx * 0.083, -0.005, 0);
  // The face: the eyes shut (being made up), the brows, the blush, the lips.
  for (const sx of [-1, 1]) {
    part(h, box(0.022, 0.004, 0.004), '#3e2723', sx * 0.032, 0.002, 0.082, { rz: sx * 0.15, outline: false });
    part(h, box(0.026, 0.004, 0.004), '#4e342e', sx * 0.033, 0.03, 0.08, { rz: -sx * 0.12, outline: false });
    part(h, ball(0.016), '#f4a6b4', sx * 0.048, -0.028, 0.068, { outline: false }).scale.set(1, 0.6, 0.4);
  }
  part(h, box(0.028, 0.008, 0.004), '#c2185b', 0, -0.048, 0.083, { outline: false });
  if (bride) {
    // The up-do, the tiara over it, and the veil from the comb at the back.
    part(h, ball(0.052), HAIR, 0, 0.06, -0.08);
    part(h, ring(0.075, 0.006, Math.PI), '#e0c068', 0, 0.06, 0.02, { rx: -0.5, outline: false });
    for (let i = 0; i < 5; i++) part(h, ball(0.009), '#ffffff', -0.05 + i * 0.025, 0.1 + (i === 2 ? 0.015 : 0), 0.03, { outline: false, material: glow('#ffffff') });
    const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.34, 0.95, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9), VEIL);
    veil.userData.ownGeometry = true;
    veil.position.set(0, -0.38, -0.12);
    veil.rotation.x = 0.12;
    veil.renderOrder = 3;
    h.add(veil);
  } else {
    // A hair band holding it off the face, the ends tied back.
    part(h, ring(0.094, 0.012, Math.PI), '#f48fb1', 0, 0.015, 0.035, { rx: -0.3, outline: false });
    part(h, ball(0.04), HAIR, 0, 0.0, -0.1);
  }
  return h;
}
/** Where the face's middle is, from the head's own frame. */
const FACE = new THREE.Vector3(0, -0.01, 0.092);

/**
 * A client sat at `seatY`, facing +z: the cape over a client in for make-up, a white gown for the bride
 * (its skirt over the knees to the floor, a bouquet in the lap). The head is turned `turn` to their left
 * and tipped `tilt` up. Returns the group and where the face is in its frame.
 */
function seatedClient(g: THREE.Object3D, seatY: number, turn: number, tilt: number, bride: boolean): { root: THREE.Group; face: THREE.Vector3 } {
  const root = new THREE.Group();
  g.add(root);
  const top = bride ? IVORY : '#90a4ae';
  const legs = bride ? IVORY : '#37474f';
  const y = seatY;
  if (bride) {
    // The skirt: a bell over the lap falling to the floor in front.
    const skirt = new THREE.LatheGeometry([new THREE.Vector2(0.17, y + 0.14), new THREE.Vector2(0.24, y + 0.06), new THREE.Vector2(0.33, y - 0.15), new THREE.Vector2(0.42, 0.12), new THREE.Vector2(0.46, 0.01)], 24);
    part(root, skirt, IVORY, 0, 0, 0.12).userData.ownGeometry = true;
    part(root, rbox(0.38, 0.12, 0.42, 0.05), IVORY, 0, y + 0.08, 0.16);
  } else {
    part(root, rbox(0.32, 0.14, 0.3, 0.06), legs, 0, y + 0.06, 0.02);
    for (const sx of [-1, 1]) {
      rod(root, new THREE.Vector3(sx * 0.09, y + 0.07, 0.05), new THREE.Vector3(sx * 0.09, y + 0.07, 0.42), 0.06, legs);
      rod(root, new THREE.Vector3(sx * 0.09, y + 0.06, 0.43), new THREE.Vector3(sx * 0.1, 0.09, 0.47), 0.05, legs);
      part(root, rbox(0.09, 0.07, 0.17, 0.03), '#4e342e', sx * 0.1, 0.04, 0.52);
    }
  }
  // The body: a bodice with bare shoulders for the bride, a cape for a client.
  part(root, rbox(0.3, 0.42, 0.19, 0.08), top, 0, y + 0.33, -0.03);
  if (bride) {
    for (const sx of [-1, 1]) part(root, ball(0.055), SKIN, sx * 0.15, y + 0.55, -0.03);
    part(root, rbox(0.24, 0.12, 0.12, 0.05), SKIN, 0, y + 0.56, -0.03);
    part(root, ring(0.12, 0.012), '#f8f1e4', 0, y + 0.45, -0.03, { rx: Math.PI / 2, outline: false });
  } else {
    const cape = new THREE.LatheGeometry([new THREE.Vector2(0.27, y + 0.2), new THREE.Vector2(0.27, y + 0.36), new THREE.Vector2(0.24, y + 0.5), new THREE.Vector2(0.17, y + 0.58), new THREE.Vector2(0.07, y + 0.62), new THREE.Vector2(0.055, y + 0.64)], 20);
    const m = part(root, cape, '#fafafa', 0, 0, -0.03);
    m.userData.ownGeometry = true;
    m.scale.set(1, 1, 0.85);
    part(root, ring(0.058, 0.012), '#f48fb1', 0, y + 0.635, -0.03, { rx: Math.PI / 2, outline: false });
  }
  // Arms in the lap.
  for (const sx of [-1, 1]) {
    const arm = bride ? SKIN : '#fafafa';
    rod(root, new THREE.Vector3(sx * 0.18, y + 0.5, -0.03), new THREE.Vector3(sx * 0.2, y + 0.28, 0.06), 0.035, arm);
    rod(root, new THREE.Vector3(sx * 0.2, y + 0.28, 0.06), new THREE.Vector3(sx * 0.07, y + 0.2, 0.24), 0.03, bride ? SKIN : '#90a4ae');
    part(root, ball(0.032), SKIN, sx * 0.06, y + 0.2, 0.26);
  }
  if (bride) {
    // The bouquet.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      part(root, ball(0.03), i % 2 ? '#ffffff' : '#f8bbd0', Math.cos(a) * 0.045, y + 0.27 + (i % 3) * 0.01, 0.28 + Math.sin(a) * 0.045);
    }
    part(root, ball(0.03), '#fff8e1', 0, y + 0.3, 0.28);
    part(root, cyl(0.016, 0.012, 0.12, 8), '#7cb342', 0, y + 0.2, 0.26, { rx: 0.4 });
  }
  part(root, cyl(0.042, 0.045, 0.1, 12), SKIN, 0, y + 0.64, -0.02);
  const h = head(root, bride);
  h.position.set(0, y + 0.74, -0.02);
  h.rotation.set(-tilt, turn, 0);
  h.updateMatrix();
  return { root, face: FACE.clone().applyMatrix4(h.matrix) };
}

/** The cape over a dweller sat in the make-up chair while she's seen to: white with a pink collar. */
function capeOver(g: THREE.Object3D, seatY: number, z: number): THREE.Mesh {
  const y = seatY;
  const geom = new THREE.LatheGeometry([new THREE.Vector2(0.31, y + 0.12), new THREE.Vector2(0.3, y + 0.3), new THREE.Vector2(0.27, y + 0.46), new THREE.Vector2(0.2, y + 0.56), new THREE.Vector2(0.09, y + 0.62), new THREE.Vector2(0.065, y + 0.66)], 20);
  const m = part(g, geom, '#fafafa', 0, 0, z);
  m.userData.ownGeometry = true;
  m.scale.set(1, 1, 1.1);
  part(g, ring(0.07, 0.014), '#f48fb1', 0, y + 0.655, z, { rx: Math.PI / 2, outline: false });
  return m;
}

// ---------------------------------------------------------------------------------------------
// What's painted.

const paintTone: Paint = (c) => {
  c.fillStyle = '#fff7f8';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = '#ec407a';
  c.fillRect(0, 0, 256, 26);
  text(c, '퍼스널 컬러 진단', 10, 14, 14, '#ffffff');
  text(c, '봄 웜 라이트', 128, 46, 18, '#ad1457', 'center');
  const tones = ['#ffd8c2', '#ffb3a7', '#ffcc80', '#f8bbd0', '#c5e1a5', '#fff59d'];
  tones.forEach((k, i) => {
    c.fillStyle = k;
    c.beginPath();
    c.arc(30 + i * 39, 84, 15, 0, Math.PI * 2);
    c.fill();
  });
  text(c, '베스트: 코랄 · 피치 · 아이보리', 128, 116, 12, '#5d4037', 'center', false);
  text(c, '파운데이션 21호 N · 블러셔 코랄', 128, 138, 12, '#5d4037', 'center', false);
  c.fillStyle = '#f48fb1';
  c.fillRect(20, 154, 216, 12);
  c.fillStyle = '#ad1457';
  c.fillRect(20, 154, 150, 12);
};
const paintFeed: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 160, 256);
  text(c, 'lumi_makeup', 10, 14, 12, '#212121');
  const k = ['#f8bbd0', '#ffe0b2', '#e1bee7', '#ffccbc', '#f3e5f5', '#fce4ec'];
  for (let i = 0; i < 6; i++) {
    const x = 6 + (i % 2) * 76;
    const y = 30 + Math.floor(i / 2) * 72;
    c.fillStyle = k[i];
    c.fillRect(x, y, 72, 68);
    c.fillStyle = '#f1c9a5';
    c.beginPath();
    c.ellipse(x + 36, y + 38, 16, 20, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3b2a20';
    c.beginPath();
    c.ellipse(x + 36, y + 26, 18, 12, 0, Math.PI, Math.PI * 2);
    c.fill();
    c.fillStyle = '#c2185b';
    c.fillRect(x + 31, y + 48, 10, 3);
  }
  text(c, '좋아요 1,284 #웨딩메이크업', 10, 244, 11, '#ad1457', 'left', false);
};
const paintUv: Paint = (c) => {
  c.fillStyle = '#120a24';
  c.fillRect(0, 0, 128, 48);
  text(c, 'UV 15:00', 64, 25, 22, '#d1b3ff', 'center');
};
const paintBlood: Paint = (c) => {
  c.fillStyle = '#f5f5f5';
  c.fillRect(0, 0, 96, 128);
  c.fillStyle = '#8b0000';
  c.fillRect(0, 34, 96, 60);
  text(c, 'FAKE', 48, 52, 20, '#ffffff', 'center');
  text(c, 'BLOOD', 48, 76, 20, '#ffffff', 'center');
};
const paintRefs: Paint = (c) => {
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 384, 192);
  text(c, '특수분장 레퍼런스 · 드라마 「좀비 학교」', 10, 16, 14, '#ffffff');
  const looks: Array<[string, string, string]> = [
    ['#8fa37a', '#4a148c', '좀비'],
    ['#e8c3a6', '#8d6e63', '노인'],
    ['#f3cfb3', '#8b0000', '상처'],
    ['#7e8f57', '#3e2723', '괴물'],
  ];
  looks.forEach(([skin, mark, s], i) => {
    const x = 18 + i * 92;
    c.fillStyle = '#37474f';
    c.fillRect(x, 32, 82, 150);
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(x + 41, 92, 26, 34, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = mark;
    c.fillRect(x + 26, 96, 30, 5);
    c.fillRect(x + 30, 72, 22, 3);
    text(c, s, x + 41, 162, 13, '#ffffff', 'center');
  });
};

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /**
   * The vanity (as furnitureShop.ts draws it) at work. Making up a client: a client drawn in its plush
   * chair facing the mirror, a white cape over her and a band holding her hair back, her head turned a
   * little to the artist and tipped up; the artist stands at her right, square on to the face, the
   * palette open in the left hand and the sponge, the eye brush and the big brush in turn in the right
   * (activity.ts makeupRound). The bride's make-up is the same with a bride in the chair — the up-do,
   * the tiara, the veil down her back, the gown's skirt to the floor and the bouquet in her lap. The
   * wedding package is planned sat at the vanity with the brochure; the shoot's make-up team is
   * directed stood beside it with a call sheet.
   */
  makeupStation(g, W, D, c, def, ctx, out) {
    SHOP_DETAIL.makeupStation(g, W, D, c, def, ctx, out);
    const cz = -D / 2 + 0.58 + 0.26;
    const seatY = 0.48;
    const ty = 0.78;
    // A client sat in the chair, facing the mirror (-z): her head turned to the artist at +x.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const place = (o: THREE.Group) => {
      o.position.set(0, 0, cz - 0.02);
      o.rotation.y = Math.PI;
      o.updateMatrix();
    };
    const client = seatedClient(use, seatY, -0.55, 0.12, false);
    place(client.root);
    const bride = seatedClient(use, seatY, -0.55, 0.12, true);
    place(bride.root);
    const F = client.face.clone().applyMatrix4(client.root.matrix);
    const faceAt = marker(g, F.x, F.y, F.z);
    const ax = 0.52;
    const az = cz - 0.06;
    const yaw = Math.atan2(F.x - ax, F.z - az);
    const kit = makeupKit(use, F, yaw, EYESHADOW);
    const bridalKit = makeupKit(use, F, yaw, ['#f4d7c6', '#e8b9a5', '#f1c1c8', '#d7a49a', '#fff3e0', '#c98b73', '#e6c9a8', '#b07a6a']);
    // The wedding package brochure and the price list, open on the top; the call sheet for a shoot.
    const brochure = new THREE.Group();
    use.add(brochure);
    part(brochure, box(0.3, 0.006, 0.21), '#ffffff', 0.05, ty + 0.005, -0.06, { ry: 0.1 });
    part(brochure, box(0.14, 0.007, 0.1), '#f8bbd0', -0.02, ty + 0.007, -0.08, { ry: 0.1, outline: false });
    label(brochure, '웨딩 패키지', 0.12, 0.03, 0.12, ty + 0.012, -0.03, '#ffffff', '#ad1457').rotation.x = -Math.PI / 2;
    const sheet = new THREE.Group();
    use.add(sheet);
    part(sheet, box(0.21, 0.004, 0.3), '#fffde7', 0.42, ty + 0.004, -0.05, { ry: -0.2 });
    for (let i = 0; i < 6; i++) part(sheet, box(0.15, 0.002, 0.006), '#9e9e9e', 0.42, ty + 0.007, -0.15 + i * 0.035, { ry: -0.2, outline: false });
    const spots: Record<string, Spot> = {
      applyMakeup: at(spot(g, 'stand', ax, 0, az, yaw), faceAt, 'makeup'),
      brideMakeup: at(spot(g, 'stand', ax, 0, az, yaw), faceAt, 'makeup'),
      makeupArtist_leadTeam: at(spot(g, 'stand', 0.62, 0, cz + 0.2, 0.3), marker(g, 0.5, 1.05, cz + 0.5), 'gesture'),
    };
    out.spots = spots;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      client.root.visible = now === 'applyMakeup';
      bride.root.visible = now === 'brideMakeup';
      kit.root.visible = now === 'applyMakeup';
      bridalKit.root.visible = now === 'brideMakeup';
      if (now === 'applyMakeup') kit.show(t, phaseAt(spots.applyMakeup));
      if (now === 'brideMakeup') bridalKit.show(t, phaseAt(spots.brideMakeup));
      brochure.visible = now === null;
      sheet.visible = now === 'makeupArtist_leadTeam';
    };
  },

  /**
   * The tall make-up chair a client is seen to in: a chrome five-star base and gas column, a chrome
   * foot ring, a black leather seat and a high back with a headrest on its post. Sat in, a client has
   * her skin tone matched — a white cape over her, the artist at her right with the foundation palette
   * open in one hand and the sponge and brushes in the other, trying shades on her cheek — or is calmed
   * before the wedding, the artist stood at her side.
   */
  muClientChair(g, _W, _D, _c, _def, _ctx, out) {
    const seatY = 0.54;
    starBase(g, 0, 0, 0.3, CHROME);
    part(g, cyl(0.05, 0.06, 0.16, 14), BLACK, 0, 0.14, 0);
    part(g, cyl(0.03, 0.03, 0.28, 10), CHROME, 0, 0.34, 0, { outline: false });
    // The foot ring.
    part(g, ring(0.2, 0.012), CHROME, 0, 0.26, 0.02, { rx: Math.PI / 2 });
    for (const a of [0.6, 2.5, -0.6, -2.5]) rod(g, new THREE.Vector3(0, 0.26, 0), new THREE.Vector3(Math.sin(a) * 0.2, 0.26, 0.02 + Math.cos(a) * 0.2), 0.008, CHROME);
    // Seat, back, arms.
    part(g, rbox(0.46, 0.1, 0.44, 0.04), LEATHER, 0, seatY - 0.05, 0.02);
    part(g, box(0.42, 0.01, 0.4), '#3a3a42', 0, seatY - 0.0, 0.02, { outline: false });
    part(g, rbox(0.44, 0.58, 0.09, 0.04), LEATHER, 0, seatY + 0.33, -0.2, { rx: -0.08 });
    for (let i = 0; i < 4; i++) part(g, box(0.38, 0.004, 0.004), '#3a3a42', 0, seatY + 0.14 + i * 0.12, -0.15 - i * 0.01, { outline: false });
    rod(g, new THREE.Vector3(0, seatY + 0.6, -0.25), new THREE.Vector3(0, seatY + 0.8, -0.24), 0.012, CHROME);
    part(g, rbox(0.24, 0.1, 0.07, 0.035), LEATHER, 0, seatY + 0.85, -0.2);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, 0.04, 0.34, 0.02), LEATHER, sx * 0.25, seatY + 0.2, 0.0);
      part(g, rbox(0.03, 0.18, 0.03, 0.01), CHROME, sx * 0.25, seatY + 0.09, 0.12);
      part(g, rbox(0.03, 0.18, 0.03, 0.01), CHROME, sx * 0.25, seatY + 0.09, -0.12);
    }
    out.seat = marker(g, 0, seatY, 0.02);
    // Where a sat dweller's face is (about), and the artist at her right (the chair's -x), square on to it.
    const F = new THREE.Vector3(0, seatY + 0.73, 0.08);
    const faceAt = marker(g, F.x, F.y, F.z);
    const spots: Record<string, Spot> = {
      'social:colorMatch': at(facing(g, -0.47, 0.2, F), faceAt, 'makeup'),
      'social:calmBride': at(facing(g, -0.42, 0.32, F), faceAt, 'talk'),
    };
    out.spots = spots;
    const serve = new THREE.Group();
    serve.visible = false;
    g.add(serve);
    capeOver(serve, seatY, 0.0);
    const yaw = spots['social:colorMatch'].at.rotation.y;
    const kit = makeupKit(serve, F, yaw, FOUNDATION, false);
    // A box of tissues and a cup of water held out to a nervous bride.
    const calm = new THREE.Group();
    calm.visible = false;
    g.add(calm);
    part(calm, rbox(0.12, 0.07, 0.07, 0.015), '#ffffff', -0.27, seatY + 0.25, 0.1);
    part(calm, ball(0.03), '#ffffff', -0.27, seatY + 0.3, 0.1, { outline: false }).scale.set(1, 0.8, 0.6);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      serve.visible = now === 'social:colorMatch';
      calm.visible = now === 'social:calmBride';
      if (now === 'social:colorMatch') kit.show(t, phaseAt(spots['social:colorMatch']));
    };
  },

  /**
   * The ring-light consultation table: a slim white table with gold legs against the wall, and on it,
   * in line with the make-up chair that faces it, a big ring light round a round mirror on its pole
   * (lit, a phone clipped at the top for the before-and-after shots); along the other end a tablet on
   * its stand with the client's personal-colour result, a fan of foundation shade cards, folded drapes
   * in the seasons' colours, a jar of brushes and a vase. The look goes up on the shop's feed from the
   * tablet; the drapes are sorted out for a consultation.
   */
  muRingDesk(g, W, D, _c, _def, _ctx, out) {
    const d = 0.44;
    const z = -D / 2 + d / 2 + 0.02;
    const top = 0.76;
    part(g, rbox(W - 0.08, 0.035, d, 0.012), WHITE, 0, top, z);
    part(g, rbox(W - 0.2, 0.1, d - 0.06, 0.01), '#f3eeee', 0, top - 0.07, z);
    part(g, box(0.3, 0.012, 0.01), ROSE_GOLD, -0.5, top - 0.07, z + d / 2 - 0.02, { outline: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.01, top - 0.02, 8), ROSE_GOLD, sx * (W / 2 - 0.1), (top - 0.02) / 2, z + sz * (d / 2 - 0.05), { outline: false });
    // The ring light and its mirror, in line with the chair (+x half).
    const rx = 0.5;
    const rz = z - 0.05;
    const ry = 1.32;
    part(g, cyl(0.1, 0.11, 0.025, 18), BLACK, rx, top + 0.03, rz);
    part(g, cyl(0.013, 0.013, ry - top - 0.3, 8), BLACK, rx, (top + ry - 0.3) / 2 + 0.02, rz, { outline: false });
    part(g, ring(0.3, 0.035), '#eeeeee', rx, ry, rz);
    part(g, ring(0.3, 0.022), '#fff8f0', rx, ry, rz + 0.02, { outline: false, shadow: false, material: glow('#fff8f0') });
    const mir = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), MIRROR);
    mir.userData.ownGeometry = true;
    mir.position.set(rx, ry, rz + 0.005);
    g.add(mir);
    part(g, ring(0.245, 0.008), ROSE_GOLD, rx, ry, rz + 0.006, { outline: false });
    // The phone clipped at the top.
    part(g, box(0.02, 0.06, 0.02), BLACK, rx, ry + 0.34, rz + 0.02, { outline: false });
    part(g, rbox(0.08, 0.15, 0.012, 0.01), '#1c1c1f', rx, ry + 0.42, rz + 0.03);
    // Foundation bottles and the shade-card fan by the light.
    FOUNDATION.slice(0, 5).forEach((k, i) => {
      part(g, rbox(0.04, 0.09, 0.03, 0.01), k, rx + 0.22 + (i % 3) * 0.05, top + 0.06, z + 0.06 + Math.floor(i / 3) * 0.06);
      part(g, cyl(0.012, 0.012, 0.025, 8), BLACK, rx + 0.22 + (i % 3) * 0.05, top + 0.12, z + 0.06 + Math.floor(i / 3) * 0.06, { outline: false });
    });
    const fan = new THREE.Group();
    fan.position.set(rx - 0.25, top + 0.02, z + 0.1);
    g.add(fan);
    FOUNDATION.forEach((k, i) => part(fan, box(0.03, 0.003, 0.15), k, 0, i * 0.002, 0, { ry: -0.6 + i * 0.17, outline: false }).translateZ(0.06));
    // The tablet on its stand, turned to whoever stands at the table.
    const tab = new THREE.Group();
    tab.position.set(-0.45, top + 0.13, z + 0.02);
    tab.rotation.x = -0.25;
    g.add(tab);
    part(tab, rbox(0.27, 0.19, 0.012, 0.012), '#1c1c1f', 0, 0, 0);
    out.screen = litScreen(tab, painted('mu-tone', 256, 176, paintTone), 0.25, 0.17, 0, 0, 0.007);
    part(g, box(0.06, 0.1, 0.06), '#bdbdbd', -0.45, top + 0.05, z - 0.03, { outline: false });
    const tabAt = marker(g, -0.45, top + 0.1, z + 0.08);
    // The drapes, folded in a stack: spring, summer, autumn, winter.
    const drapes = ['#ffab91', '#ffe082', '#b39ddb', '#90caf9', '#a1887f', '#6d4c41', '#c62828', '#212121'];
    drapes.forEach((k, i) => part(g, rbox(0.28, 0.018, 0.2, 0.008), k, -0.78, top + 0.03 + i * 0.019, z + 0.02, { ry: (i % 2) * 0.06 }));
    const drapeAt = marker(g, -0.78, top + 0.2, z + 0.06);
    // A jar of brushes, a vase, the shop's card.
    glass(g, cyl(0.04, 0.04, 0.12, 14), -0.15, top + 0.06, z - 0.1);
    for (let i = 0; i < 5; i++) rod(g, new THREE.Vector3(-0.15, top + 0.04, z - 0.1), new THREE.Vector3(-0.15 + (i - 2) * 0.018, top + 0.22, z - 0.1 + ((i % 2) - 0.5) * 0.02), 0.004, i % 2 ? BLACK : ROSE_GOLD);
    part(g, cyl(0.03, 0.04, 0.12, 12), '#f8bbd0', -0.08, top + 0.06, z + 0.12);
    for (let i = 0; i < 3; i++) part(g, ball(0.025), ['#ffffff', '#f48fb1', '#fff59d'][i], -0.08 + (i - 1) * 0.025, top + 0.15 + (i % 2) * 0.02, z + 0.12);
    label(g, 'LUMI MAKEUP', 0.24, 0.05, 0, top - 0.07, z + d / 2 - 0.009, '#f3eeee', '#ad1457');
    // In use: a drape shaken out over the edge; the phone's shot of the look on the tablet.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const drapeMat = new THREE.MeshToonMaterial({ color: '#ffab91', gradientMap: gradient });
    const shaken = part(use, box(0.36, 0.3, 0.008), '#ffab91', -0.78, top - 0.12, z + d / 2 + 0.01, { material: drapeMat });
    shaken.userData.ownMaterial = true;
    const feed = picture(use, painted('mu-feed', 160, 256, paintFeed), 0.085, 0.14, rx, ry + 0.42, rz + 0.037);
    const spots: Record<string, Spot> = {
      muPortfolioPost: at(spot(g, 'stand', -0.45, 0, z + d / 2 + 0.3, Math.PI), tabAt, 'type'),
      muDrapeKit: at(spot(g, 'stand', -0.75, 0, z + d / 2 + 0.3, Math.PI), drapeAt, 'rummage'),
    };
    out.spots = spots;
    out.work = tabAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      shaken.visible = now === 'muDrapeKit';
      if (shaken.visible) drapeMat.color.set(drapes[Math.floor(t / 2.5) % drapes.length]);
      feed.visible = now === 'muPortfolioPost';
    };
  },

  /**
   * The UV brush steriliser: a white cabinet with drawers of clean sponges and puffs, and on it the
   * steriliser — a white box with a smoked glass door, brushes stood in racks inside, its timer — that
   * glows violet while it runs; beside it a drying tower of brushes hung bristles down and a towel of
   * washed ones laid out.
   */
  muBrushSterilizer(g, _W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.23;
    part(g, rbox(0.7, 0.72, 0.42, 0.02), WHITE, 0, 0.36, z);
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.64, 0.2, 0.015, 0.008), '#f3eeee', 0, 0.13 + i * 0.22, z + 0.21);
      part(g, box(0.14, 0.012, 0.015), ROSE_GOLD, 0, 0.19 + i * 0.22, z + 0.222, { outline: false });
    }
    const top = 0.74;
    part(g, rbox(0.74, 0.03, 0.44, 0.01), '#f5f0f0', 0, top - 0.01, z);
    // The steriliser.
    const sx = -0.1;
    part(g, rbox(0.4, 0.36, 0.26, 0.02), '#fafafa', sx, top + 0.18, z - 0.02);
    part(g, rbox(0.3, 0.25, 0.01, 0.01), '#3a3346', sx - 0.02, top + 0.19, z + 0.11);
    const lamp = glowing(g, box(0.27, 0.22, 0.004), UV, sx - 0.02, top + 0.19, z + 0.105);
    for (let i = 0; i < 7; i++) {
      const bx = sx - 0.13 + i * 0.037;
      part(g, cyl(0.004, 0.004, 0.16, 6), i % 2 ? BLACK : ROSE_GOLD, bx, top + 0.15, z + 0.06, { outline: false });
      part(g, ball(0.012), i % 3 ? '#5d4037' : '#f3d9c9', bx, top + 0.24, z + 0.06, { outline: false }).scale.set(0.8, 1.5, 0.8);
    }
    glass(g, box(0.3, 0.25, 0.006), sx - 0.02, top + 0.19, z + 0.118);
    part(g, box(0.012, 0.12, 0.02), CHROME, sx + 0.16, top + 0.19, z + 0.125, { outline: false });
    part(g, box(0.06, 0.25, 0.01), '#eeeeee', sx + 0.16, top + 0.19, z + 0.115, { outline: false });
    out.screen = litScreen(g, painted('mu-uv', 128, 48, paintUv), 0.05, 0.02, sx + 0.16, top + 0.32, z + 0.121);
    label(g, 'UV 소독', 0.12, 0.035, sx - 0.02, top + 0.34, z + 0.111, '#fafafa', '#7e57c2');
    const door = marker(g, sx + 0.12, top + 0.2, z + 0.13);
    // The drying tower: brushes hung bristles down.
    const tx = 0.24;
    part(g, rbox(0.12, 0.02, 0.12, 0.01), '#e0e0e0', tx, top + 0.01, z);
    rod(g, new THREE.Vector3(tx, top + 0.02, z), new THREE.Vector3(tx, top + 0.38, z), 0.008, CHROME);
    for (let r = 0; r < 2; r++) {
      const y = top + 0.22 + r * 0.14;
      part(g, ring(0.05, 0.006), CHROME, tx, y, z, { rx: Math.PI / 2, outline: false });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + r * 0.6;
        const px = tx + Math.cos(a) * 0.05;
        const pz = z + Math.sin(a) * 0.05;
        part(g, cyl(0.004, 0.004, 0.12, 6), i % 2 ? BLACK : ROSE_GOLD, px, y + 0.03, pz, { outline: false });
        part(g, ball(0.011), i % 2 ? '#5d4037' : '#f3d9c9', px, y - 0.04, pz, { outline: false }).scale.set(0.8, 1.6, 0.8);
      }
    }
    // A towel of washed brushes, drying flat.
    part(g, box(0.22, 0.008, 0.14), '#f8bbd0', 0.2, top + 0.005, z + 0.13);
    for (let i = 0; i < 4; i++) part(g, cyl(0.004, 0.004, 0.15, 6), i % 2 ? BLACK : ROSE_GOLD, 0.2, top + 0.016, z + 0.09 + i * 0.027, { rz: Math.PI / 2, outline: false });
    // While it runs: the violet light on inside.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    lamp.removeFromParent();
    use.add(lamp);
    const dark = part(g, box(0.27, 0.22, 0.004), '#2a2333', sx - 0.02, top + 0.19, z + 0.104, { outline: false });
    out.idle = dark;
    out.work = door;
    out.spots = { '*': at(spot(g, 'stand', sx + 0.05, 0, z + 0.62, Math.PI), door, 'tinker') };
  },

  /**
   * The shop's cosmetics cabinet: a white case with rose-gold edges and a lit sign, three lit glass
   * shelves of what the shop sells — cushion compacts, a tower of lipsticks, eyeshadow palettes, the
   * skin care — with BEST and NEW tags, a tester ledge with a little mirror at waist height, stock
   * in the cupboard under. Tidied and restocked from a carton.
   */
  muProductDisplay(g, W, D, _c, _def, _ctx, out) {
    const d = 0.4;
    const z = -D / 2 + d / 2 + 0.02;
    const w = W - 0.16;
    part(g, rbox(w, 0.8, d, 0.02), WHITE, 0, 0.4, z);
    for (const sx of [-1, 1]) part(g, box(0.02, 1.95, d + 0.01), ROSE_GOLD, sx * (w / 2), 0.975, z, { outline: false });
    part(g, box(w, 1.12, 0.02), '#fbeef1', 0, 1.4, -D / 2 + 0.03, { outline: false });
    part(g, rbox(w + 0.04, 0.12, d + 0.02, 0.02), WHITE, 0, 1.98, z);
    label(g, 'LUMI COSMETICS · 매장 판매', 0.9, 0.08, 0, 1.98, z + d / 2 + 0.012, '#ffffff', '#ad1457');
    // The tester ledge with its mirror and testers.
    part(g, rbox(w, 0.03, d + 0.06, 0.01), '#f5f0f0', 0, 0.81, z + 0.03);
    const mir = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), MIRROR);
    mir.userData.ownGeometry = true;
    mir.position.set(0.55, 0.98, z + 0.0);
    g.add(mir);
    part(g, ring(0.1, 0.01), ROSE_GOLD, 0.55, 0.98, z + 0.0, { outline: false });
    part(g, cyl(0.012, 0.012, 0.15, 8), ROSE_GOLD, 0.55, 0.88, z - 0.01, { outline: false });
    for (let i = 0; i < 6; i++) {
      part(g, cyl(0.011, 0.011, 0.05, 8), '#c9a227', -0.6 + i * 0.07, 0.85, z + 0.1);
      part(g, cyl(0.009, 0.009, 0.02, 8), ['#c62828', '#ec407a', '#ad1457', '#ff7043', '#d81b60', '#8d6e63'][i], -0.6 + i * 0.07, 0.885, z + 0.1, { outline: false });
    }
    label(g, 'TESTER', 0.12, 0.03, -0.42, 0.84, z + d / 2 + 0.04, '#ad1457', '#ffffff');
    // The cupboard doors under.
    for (const sx of [-1, 1]) {
      part(g, rbox(w / 2 - 0.04, 0.66, 0.015, 0.008), '#f3eeee', sx * (w / 4), 0.38, z + d / 2);
      part(g, box(0.012, 0.12, 0.015), ROSE_GOLD, sx * 0.06, 0.45, z + d / 2 + 0.01, { outline: false });
    }
    // Three lit glass shelves.
    const rnd = seeded(31);
    for (let s = 0; s < 3; s++) {
      const y = 1.02 + s * 0.3;
      glass(g, box(w - 0.04, 0.012, d - 0.06), 0, y, z - 0.02);
      glowing(g, box(w - 0.06, 0.006, 0.01), '#fff8e1', 0, y + 0.27, z + 0.12);
      for (let i = 0; i < 10; i++) {
        const x = -w / 2 + 0.1 + i * ((w - 0.2) / 9);
        const kind = (s * 3 + i) % 4;
        if (s === 0 && kind < 2) {
          // Cushion compacts.
          part(g, cyl(0.04, 0.04, 0.025, 16), ['#ffffff', '#f8bbd0'][kind], x, y + 0.02, z);
          part(g, cyl(0.03, 0.03, 0.004, 16), ROSE_GOLD, x, y + 0.034, z, { outline: false });
        } else if (s === 1 && kind < 2) {
          // Lipsticks in a little stepped tower.
          for (let j = 0; j < 3; j++) {
            part(g, cyl(0.009, 0.009, 0.05, 8), '#c9a227', x - 0.02 + j * 0.02, y + 0.03 + j * 0.01, z + 0.03 - j * 0.03);
            part(g, cyl(0.008, 0.008, 0.018, 8), ['#c62828', '#ec407a', '#ad1457'][j], x - 0.02 + j * 0.02, y + 0.064 + j * 0.01, z + 0.03 - j * 0.03, { outline: false });
          }
        } else if (kind === 2) {
          // A palette stood on its edge.
          part(g, rbox(0.12, 0.08, 0.015, 0.006), BLACK, x, y + 0.045, z - 0.02, { rx: -0.2 });
          for (let j = 0; j < 4; j++) part(g, box(0.022, 0.022, 0.004), EYESHADOW[(j + s + i) % 8], x - 0.036 + j * 0.024, y + 0.05, z - 0.01, { rx: -0.2, outline: false });
        } else {
          // Skin care: a bottle, a jar.
          const k = ['#ffffff', '#fce4ec', '#e1f5fe', '#f3e5f5'][(i + s) % 4];
          if (i % 2) {
            part(g, cyl(0.022, 0.024, 0.13, 12), k, x, y + 0.07, z);
            part(g, cyl(0.012, 0.012, 0.03, 8), ROSE_GOLD, x, y + 0.15, z, { outline: false });
          } else {
            part(g, cyl(0.035, 0.035, 0.05, 14), k, x, y + 0.03, z);
            part(g, cyl(0.036, 0.036, 0.015, 14), ROSE_GOLD, x, y + 0.062, z, { outline: false });
          }
        }
        if (rnd() > 0.8) label(g, rnd() > 0.5 ? 'BEST' : 'NEW', 0.06, 0.022, x, y - 0.012, z + d / 2 - 0.02, '#ec407a', '#ffffff');
      }
    }
    // In use: a carton of stock on the floor.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, rbox(0.34, 0.22, 0.26, 0.01), '#e0c3a5', 0.3, 0.11, z + 0.48);
    label(use, '입고 · 쿠션', 0.18, 0.04, 0.3, 0.16, z + 0.611, '#e0c3a5', '#5d4037');
    for (let i = 0; i < 4; i++) part(use, cyl(0.035, 0.035, 0.022, 12), '#ffffff', 0.22 + (i % 2) * 0.12, 0.235, z + 0.43 + Math.floor(i / 2) * 0.09);
    const shelf = marker(g, -0.1, 1.2, z + 0.05);
    out.work = shelf;
    out.spots = { '*': at(spot(g, 'stand', -0.1, 0, z + 0.62, Math.PI), shelf, 'rummage') };
  },

  /**
   * The bridal corner: on a low round dais a dress form in an ivory gown — a fitted lace bodice, a full
   * skirt to the floor with its train — a cathedral veil hung from the stand behind it; a gilded
   * standing mirror; a little table with tiaras on velvet cushions under glass domes and a bouquet. The
   * veil and the tiara are tried against the form for the bride (the veil stirring as it's set).
   */
  muBridalCorner(g, _W, D, _c, _def, _ctx, out) {
    const fx = -0.4;
    const fz = -0.02;
    // The dais.
    part(g, cyl(0.46, 0.48, 0.08, 32), '#f3e5f5', fx, 0.04, fz);
    part(g, ring(0.47, 0.012), '#e0c068', fx, 0.08, fz, { rx: Math.PI / 2, outline: false });
    // The gown on its form.
    const skirt = new THREE.LatheGeometry([new THREE.Vector2(0.13, 1.02), new THREE.Vector2(0.17, 0.92), new THREE.Vector2(0.26, 0.6), new THREE.Vector2(0.36, 0.28), new THREE.Vector2(0.42, 0.09)], 28);
    part(g, skirt, IVORY, fx, 0, fz).userData.ownGeometry = true;
    // The train behind.
    part(g, rbox(0.5, 0.02, 0.4, 0.01), IVORY, fx, 0.09, fz - 0.42);
    part(g, rbox(0.25, 0.32, 0.17, 0.08), IVORY, fx, 1.17, fz);
    for (let i = 0; i < 9; i++) part(g, ball(0.012), '#ffffff', fx - 0.08 + (i % 3) * 0.08, 1.08 + Math.floor(i / 3) * 0.09, fz + 0.085, { outline: false, material: glow('#ffffff') });
    part(g, ring(0.13, 0.01), '#f8e1c8', fx, 1.03, fz, { rx: Math.PI / 2, outline: false });
    // The form's shoulders and neck, its stand's knob.
    part(g, rbox(0.3, 0.06, 0.15, 0.03), '#efe6dc', fx, 1.34, fz);
    part(g, cyl(0.04, 0.05, 0.12, 12), '#efe6dc', fx, 1.42, fz);
    part(g, ball(0.04), '#c9a227', fx, 1.5, fz);
    // The veil: a stand behind, the veil falling from its arm over the form's shoulders to the floor.
    rod(g, new THREE.Vector3(fx, 0.08, fz - 0.3), new THREE.Vector3(fx, 1.7, fz - 0.3), 0.012, '#e0c068');
    rod(g, new THREE.Vector3(fx, 1.7, fz - 0.3), new THREE.Vector3(fx, 1.7, fz - 0.1), 0.01, '#e0c068');
    const veil = new THREE.Group();
    veil.position.set(fx, 1.68, fz - 0.1);
    g.add(veil);
    const vm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.5, 1.6, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8), VEIL);
    vm.userData.ownGeometry = true;
    vm.position.set(0, -0.8, -0.08);
    vm.renderOrder = 3;
    veil.add(vm);
    part(veil, box(0.08, 0.02, 0.02), '#e0c068', 0, 0, 0, { outline: false });
    const veilAt = marker(g, fx, 1.5, fz + 0.05);
    // The standing mirror, gilded.
    const mx = 0.62;
    const mz = -D / 2 + 0.2;
    const mm = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), MIRROR);
    mm.userData.ownGeometry = true;
    mm.scale.set(1, 2.6, 1);
    mm.position.set(mx, 1.0, mz);
    mm.rotation.y = -0.35;
    g.add(mm);
    const frame = part(g, ring(0.25, 0.02), '#d4af37', mx, 1.0, mz, { ry: -0.35 });
    frame.scale.set(1, 2.6, 1);
    part(g, ball(0.04), '#d4af37', mx, 1.67, mz);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(mx + sx * 0.16, 0, mz + 0.12), new THREE.Vector3(mx + sx * 0.1, 0.38, mz), 0.012, '#d4af37');
    // The tiara table: a little round table, two domes, the bouquet.
    const tx = 0.25;
    const tz = 0.2;
    part(g, cyl(0.2, 0.2, 0.025, 24), WHITE, tx, 0.62, tz);
    part(g, cyl(0.025, 0.03, 0.6, 10), '#d4af37', tx, 0.31, tz, { outline: false });
    part(g, cyl(0.12, 0.14, 0.02, 18), '#d4af37', tx, 0.01, tz, { outline: false });
    for (const [i, dx] of [-0.09, 0.08].entries()) {
      part(g, rbox(0.11, 0.035, 0.11, 0.02), '#ad1457', tx + dx, 0.65, tz - 0.05);
      part(g, ring(0.04, 0.005, Math.PI), i ? '#e0e0e0' : '#e0c068', tx + dx, 0.67, tz - 0.05, { outline: false });
      for (let j = 0; j < 3; j++) part(g, ball(0.007), '#ffffff', tx + dx - 0.025 + j * 0.025, 0.7 + (j === 1 ? 0.012 : 0), tz - 0.05, { outline: false, material: glow('#ffffff') });
      glass(g, ball(0.075), tx + dx, 0.7, tz - 0.05);
    }
    for (let i = 0; i < 6; i++) part(g, ball(0.026), i % 2 ? '#ffffff' : '#f8bbd0', tx + 0.06 + Math.cos(i) * 0.035, 0.66, tz + 0.08 + Math.sin(i) * 0.035);
    // In use: a tiara lifted out (in the hand at the form's head).
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, ring(0.06, 0.007, Math.PI), '#e0c068', fx, 1.56, fz + 0.03, { rx: -0.3, outline: false });
    out.animate = (t) => {
      veil.rotation.z = 0.06 * Math.sin(t * 1.3);
      veil.rotation.x = 0.04 * Math.sin(t * 0.9);
    };
    out.work = veilAt;
    out.spots = { '*': at(spot(g, 'stand', fx + 0.38, 0, fz + 0.5, Math.atan2(-0.38, -0.5)), veilAt, 'tinker') };
  },

  /**
   * The artist's trolley: three black tiers on castors — on top a leather brush roll unrolled with its
   * brushes, a big palette, beauty sponges in a cup, setting spray and a lash case; an acrylic drawer
   * of lipsticks below; towels and the brush cleanser at the bottom. Brushes are washed on it: a bowl
   * of soapy water and a pink silicone mat, a brush swirled on the mat, the clean ones laid on a towel.
   * A junior helps a senior from it, the right brush picked out.
   */
  cosmeticCart(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.5;
    const d = 0.4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * (w / 2 - 0.04), sz * (d / 2 - 0.04), 0.03);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.012, 0.012, 0.78, 8), BLACK, sx * (w / 2 - 0.02), 0.46, sz * (d / 2 - 0.02), { outline: false });
    const tiers = [0.14, 0.45, 0.82];
    for (const y of tiers) {
      part(g, rbox(w, 0.025, d, 0.01), '#1c1c1f', 0, y, 0);
      part(g, box(w, 0.04, 0.01), '#1c1c1f', 0, y + 0.02, d / 2 - 0.005, { outline: false });
    }
    rod(g, new THREE.Vector3(-w / 2 + 0.02, 0.86, -d / 2 + 0.02), new THREE.Vector3(-w / 2 + 0.02, 0.95, -d / 2 + 0.02), 0.01, CHROME);
    rod(g, new THREE.Vector3(w / 2 - 0.02, 0.86, -d / 2 + 0.02), new THREE.Vector3(w / 2 - 0.02, 0.95, -d / 2 + 0.02), 0.01, CHROME);
    rod(g, new THREE.Vector3(-w / 2 + 0.02, 0.95, -d / 2 + 0.02), new THREE.Vector3(w / 2 - 0.02, 0.95, -d / 2 + 0.02), 0.01, CHROME);
    const top = 0.84;
    // The brush roll, open along the back.
    part(g, box(0.4, 0.006, 0.12), '#5d4037', 0, top, -0.11);
    for (let i = 0; i < 10; i++) {
      const x = -0.18 + i * 0.04;
      part(g, box(0.03, 0.004, 0.06), '#4e342e', x, top + 0.004, -0.11, { outline: false });
      part(g, cyl(0.005, 0.004, 0.13, 6), i % 3 ? BLACK : ROSE_GOLD, x, top + 0.01, -0.1, { rx: Math.PI / 2, outline: false });
      part(g, ball(i % 2 ? 0.01 : 0.016), i % 2 ? '#5d4037' : '#f3d9c9', x, top + 0.012, -0.02, { outline: false }).scale.set(1, 0.8, 1.6);
    }
    // A big palette, the sponge cup, the setting spray, the lash case.
    const pal = palette(g, EYESHADOW);
    pal.position.set(-0.1, top + 0.012, 0.08);
    pal.rotation.y = Math.PI;
    part(g, cyl(0.035, 0.03, 0.06, 12), '#f8bbd0', 0.16, top + 0.03, 0.06);
    for (let i = 0; i < 3; i++) part(g, ball(0.02), ['#f06292', '#ffcc80', '#ce93d8'][i], 0.15 + (i - 1) * 0.02, top + 0.075, 0.06 + (i % 2) * 0.01, { outline: false }).scale.set(0.9, 1.2, 0.9);
    part(g, cyl(0.022, 0.022, 0.13, 12), '#e1bee7', 0.21, top + 0.065, -0.02);
    part(g, cyl(0.01, 0.01, 0.025, 8), WHITE, 0.21, top + 0.14, -0.02, { outline: false });
    part(g, rbox(0.08, 0.025, 0.05, 0.01), '#f5f5f5', 0.08, top + 0.013, 0.14);
    // The lipstick drawer.
    part(g, rbox(0.4, 0.1, 0.3, 0.01), '#eceff1', 0, 0.52, 0);
    for (let i = 0; i < 12; i++) part(g, cyl(0.008, 0.008, 0.02, 8), ['#c62828', '#ec407a', '#ad1457', '#ff7043', '#d81b60', '#8d6e63'][i % 6], -0.15 + (i % 6) * 0.06, 0.58, -0.05 + Math.floor(i / 6) * 0.1, { outline: false });
    // Towels and the cleanser below.
    for (let i = 0; i < 3; i++) part(g, rbox(0.2, 0.05, 0.16, 0.02), ['#ffffff', '#f8bbd0', '#ffffff'][i], -0.1, 0.18 + i * 0.05, 0);
    part(g, cyl(0.035, 0.035, 0.16, 12), '#b2ebf2', 0.15, 0.24, 0);
    label(g, '브러시 클렌저', 0.08, 0.03, 0.15, 0.24, 0.036, '#b2ebf2', '#006064');
    // Washing: the bowl of soapy water, the silicone mat, a brush in the hand swirled on it, clean ones drying.
    const wash = new THREE.Group();
    g.add(wash);
    part(wash, cyl(0.07, 0.055, 0.05, 16), '#ffffff', -0.15, top + 0.027, 0.06);
    part(wash, cyl(0.062, 0.062, 0.004, 16), '#e1f5fe', -0.15, top + 0.047, 0.06, { outline: false });
    const rf = seeded(5);
    for (let i = 0; i < 6; i++) part(wash, ball(0.012 + rf() * 0.01), '#ffffff', -0.15 + (rf() - 0.5) * 0.08, top + 0.052, 0.06 + (rf() - 0.5) * 0.08, { outline: false });
    part(wash, rbox(0.16, 0.008, 0.12, 0.02), '#f48fb1', 0.07, top + 0.016, 0.1);
    for (let i = 0; i < 5; i++) part(wash, box(0.12, 0.004, 0.006), '#ec407a', 0.07, top + 0.022, 0.06 + i * 0.02, { outline: false });
    const matAt = marker(g, 0.07, top + 0.03, 0.1);
    const held = brush(wash, 'blush', ROSE_GOLD);
    // Helping: the brush picked out of the roll is held.
    const help = new THREE.Group();
    g.add(help);
    const rollAt = marker(g, 0, top + 0.03, -0.08);
    const spots: Record<string, Spot> = {
      washMakeupBrushes: at(spot(g, 'stand', 0.07, 0, 0.55, Math.PI), matAt, 'stir'),
      makeupArtist_assistArtist: at(spot(g, 'stand', 0, 0, 0.55, Math.PI), rollAt, 'rummage'),
    };
    out.spots = spots;
    out.work = matAt;
    const use = new THREE.Group();
    g.add(use);
    use.add(wash, help);
    out.inUse = use;
    const hand = new THREE.Vector3();
    const tipAt = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      wash.visible = now === 'washMakeupBrushes';
      if (wash.visible) {
        // The same swirl as the hand's in activity.ts 'stir' (the spot faces -z: its left is -x).
        const a = t * Math.PI * 2 * 1.2;
        hand.set(matAt.position.x + 0.02 - Math.cos(a) * 0.06, matAt.position.y + 0.1, matAt.position.z - Math.sin(a) * 0.05);
        tipAt.set(hand.x * 0.6 + matAt.position.x * 0.4, matAt.position.y - 0.01, hand.z * 0.6 + matAt.position.z * 0.4);
        held.position.copy(hand);
        const d = tipAt.clone().sub(hand);
        held.scale.setScalar(Math.min(1, d.length() / 0.13));
        aim(held, hand, tipAt);
      }
    };
  },

  /**
   * The special-effects table: a heavy work table with a lazy Susan and on it a bald head form, a
   * prosthetic in progress on it — a gash down the cheek in silicone, aged brows in clay, the edges
   * being blended — the reference sheets pinned up behind on a riser shelf with three finished heads (a
   * zombie, an old man, a horned creature); on the table the sculpting tools in their roll, the
   * alcohol-activated paint palette, bottles of fake blood, a tray of moulded pieces (a nose, ears, a
   * scar), plaster bandage and a bowl for alginate. The prosthetic is sculpted and painted on the head
   * (the make-up round with the spatula, the fine brush and the stipple sponge); a mould is cast by
   * stirring the alginate in its bowl.
   */
  specialFxTable(g, W, D, _c, _def, _ctx, out) {
    const d = 0.7;
    const z = -D / 2 + d / 2 + 0.02;
    const top = 0.86;
    part(g, rbox(W - 0.06, 0.05, d, 0.015), '#5d4a3a', 0, top - 0.025, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.06, top - 0.05, 0.06), '#37474f', sx * (W / 2 - 0.08), (top - 0.05) / 2, z + sz * (d / 2 - 0.06));
    part(g, box(W - 0.2, 0.025, d - 0.12), '#455a64', 0, 0.18, z);
    // Boxes of supplies on the shelf under.
    for (let i = 0; i < 3; i++) part(g, rbox(0.3, 0.16, 0.3, 0.01), ['#e0c3a5', '#cfd8dc', '#e0c3a5'][i], -0.55 + i * 0.5, 0.28, z);
    label(g, '실리콘 · 라텍스', 0.22, 0.04, -0.55, 0.3, z + 0.152, '#e0c3a5', '#3e2723');
    // The riser shelf at the back, the references above it.
    const bz = -D / 2 + 0.08;
    part(g, rbox(W - 0.1, 0.03, 0.18, 0.01), '#5d4a3a', 0, top + 0.42, bz + 0.04);
    for (const sx of [-1, 1]) part(g, box(0.03, 0.42, 0.16), '#37474f', sx * (W / 2 - 0.08), top + 0.21, bz + 0.04);
    part(g, box(W - 0.1, 0.5, 0.02), '#cfd8dc', 0, top + 0.82, -D / 2 + 0.02, { outline: false });
    picture(g, painted('mu-fxrefs', 384, 192, paintRefs), 1.0, 0.5, -0.2, top + 0.82, -D / 2 + 0.035);
    // Three finished heads on the shelf.
    const finished: Array<[number, string, string]> = [
      [0.42, '#8fa37a', 'zombie'],
      [0.66, '#e8c3a6', 'old'],
      [0.9, '#7e8f57', 'horned'],
    ];
    for (const [x, skin, kind] of finished) {
      const hx = x - 0.05;
      const hy = top + 0.55;
      part(g, rbox(0.14, 0.06, 0.1, 0.03), '#263238', hx, top + 0.46, bz + 0.04);
      part(g, ball(0.075), skin, hx, hy, bz + 0.04).scale.set(0.9, 1.1, 1);
      for (const sx of [-1, 1]) part(g, ball(0.01), kind === 'zombie' ? '#fff59d' : '#2b2b30', hx + sx * 0.026, hy + 0.01, bz + 0.105, { outline: false });
      if (kind === 'zombie') {
        part(g, box(0.05, 0.006, 0.004), '#4a148c', hx + 0.01, hy - 0.03, bz + 0.108, { rz: 0.4, outline: false });
        part(g, ball(0.02), '#8b0000', hx - 0.03, hy - 0.02, bz + 0.095, { outline: false });
      } else if (kind === 'old') {
        for (let i = 0; i < 3; i++) part(g, box(0.05, 0.003, 0.004), '#8d6e63', hx, hy + 0.035 + i * 0.012, bz + 0.105, { outline: false });
        part(g, ball(0.05), '#eeeeee', hx, hy + 0.04, bz + 0.03).scale.set(1.1, 0.6, 1);
      } else
        for (const sx of [-1, 1]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 10), toon('#d7ccc8'));
          horn.userData.ownGeometry = true;
          horn.position.set(hx + sx * 0.045, hy + 0.08, bz + 0.04);
          horn.rotation.z = -sx * 0.4;
          g.add(horn);
        }
    }
    // The working head on its lazy Susan, facing the artist.
    const hx = -0.25;
    const hz = z + 0.02;
    part(g, cyl(0.16, 0.16, 0.025, 24), '#263238', hx, top + 0.013, hz);
    part(g, rbox(0.3, 0.12, 0.17, 0.06), '#b0bec5', hx, top + 0.085, hz);
    part(g, cyl(0.045, 0.05, 0.1, 12), '#b0bec5', hx, top + 0.19, hz);
    const hy = top + 0.3;
    part(g, ball(0.09), '#cfd8dc', hx, hy, hz).scale.set(0.92, 1.08, 1);
    for (const sx of [-1, 1]) part(g, ball(0.018), '#cfd8dc', hx + sx * 0.083, hy - 0.005, hz);
    // The prosthetic: a flesh-toned piece over the near cheek with the gash in it, clay brows.
    part(g, ball(0.06), '#f0c8a8', hx - 0.035, hy - 0.02, hz + 0.055, { outline: false }).scale.set(0.9, 1.1, 0.5);
    part(g, box(0.008, 0.07, 0.006), '#8b0000', hx - 0.04, hy - 0.025, hz + 0.084, { rz: 0.35, outline: false });
    part(g, box(0.004, 0.06, 0.004), '#4a0000', hx - 0.04, hy - 0.025, hz + 0.088, { rz: 0.35, outline: false });
    part(g, rbox(0.1, 0.02, 0.03, 0.01), '#a1887f', hx, hy + 0.04, hz + 0.075);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.006, 0.004), '#455a64', hx + sx * 0.03, hy + 0.005, hz + 0.088, { outline: false });
    const faceAt = marker(g, hx, hy - 0.01, hz + 0.09);
    // The tools' roll, the alcohol palette, the blood, the tray of pieces.
    part(g, box(0.36, 0.006, 0.14), '#3e2723', 0.15, top + 0.003, z + 0.2);
    for (let i = 0; i < 7; i++) {
      part(g, cyl(0.004, 0.004, 0.11, 6), '#8d6e63', 0.02 + i * 0.045, top + 0.012, z + 0.2, { rx: Math.PI / 2, outline: false });
      part(g, box(0.01, 0.003, 0.03), STEEL, 0.02 + i * 0.045, top + 0.012, z + 0.27, { outline: false });
    }
    const fxPal = palette(g, FX_PAINT, '#37474f');
    fxPal.position.set(0.12, top + 0.01, z - 0.05);
    fxPal.rotation.y = Math.PI;
    for (let i = 0; i < 2; i++) {
      part(g, cyl(0.03, 0.032, 0.15, 12), '#f5f5f5', 0.4 + i * 0.08, top + 0.075, z - 0.15);
      part(g, cyl(0.012, 0.012, 0.03, 8), '#b71c1c', 0.4 + i * 0.08, top + 0.165, z - 0.15, { outline: false });
      picture(g, painted('mu-blood', 96, 128, paintBlood), 0.05, 0.066, 0.4 + i * 0.08, top + 0.075, z - 0.118);
    }
    part(g, rbox(0.26, 0.02, 0.16, 0.01), '#eceff1', 0.82, top + 0.01, z - 0.08);
    part(g, ball(0.03), '#f0c8a8', 0.75, top + 0.035, z - 0.08).scale.set(0.8, 0.7, 1.2);
    for (const sx of [-1, 1]) part(g, ball(0.028), '#f0c8a8', 0.84 + sx * 0.04, top + 0.03, z - 0.06).scale.set(0.4, 1, 0.8);
    part(g, box(0.06, 0.004, 0.02), '#d7a08a', 0.86, top + 0.022, z - 0.12, { outline: false });
    // The alginate bowl and its spatula.
    const ax = 0.55;
    const az = z + 0.12;
    part(g, cyl(0.1, 0.07, 0.08, 18), '#eceff1', ax, top + 0.04, az);
    part(g, rbox(0.14, 0.08, 0.1, 0.02), '#ffffff', ax + 0.2, top + 0.04, az - 0.04);
    label(g, '알지네이트', 0.1, 0.03, ax + 0.2, top + 0.05, az + 0.011, '#ffffff', '#00838f');
    const bowlAt = marker(g, ax, top + 0.08, az);
    // A magnifier lamp clamped at the corner, its ring over the head.
    const lx = -W / 2 + 0.12;
    part(g, rbox(0.06, 0.05, 0.06, 0.01), BLACK, lx, top + 0.025, z - 0.2);
    rod(g, new THREE.Vector3(lx, top + 0.05, z - 0.2), new THREE.Vector3(lx, top + 0.6, z - 0.18), 0.012, '#eceff1');
    rod(g, new THREE.Vector3(lx, top + 0.6, z - 0.18), new THREE.Vector3(hx - 0.02, top + 0.55, hz - 0.08), 0.012, '#eceff1');
    part(g, ring(0.09, 0.022), '#eceff1', hx - 0.02, top + 0.53, hz - 0.06, { rx: Math.PI / 2 - 0.6 });
    const lampLight = glowing(g, cyl(0.075, 0.075, 0.006, 20), '#fffde7', hx - 0.02, top + 0.53, hz - 0.06, -0.6);
    // In use: the lamp on, the bowl filled; the tools in the hands.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    lampLight.removeFromParent();
    use.add(lampLight);
    const mix = part(use, cyl(0.085, 0.085, 0.01, 18), '#f48fb1', ax, top + 0.07, az, { outline: false });
    const stick = spatula(use);
    const artist = { x: hx, z: hz + 0.62 };
    const F = faceAt.position.clone();
    const yaw = Math.atan2(F.x - artist.x, F.z - artist.z);
    const kit = makeupKit(use, F, yaw, FX_PAINT, true);
    const spots: Record<string, Spot> = {
      specialEffects: at(spot(g, 'stand', artist.x, 0, artist.z, yaw), faceAt, 'makeup'),
      makeupArtist_castMold: at(spot(g, 'stand', ax, 0, az + 0.5, Math.PI), bowlAt, 'stir'),
    };
    out.spots = spots;
    out.work = faceAt;
    const hand = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      kit.root.visible = now === 'specialEffects';
      if (kit.root.visible) kit.show(t, phaseAt(spots.specialEffects));
      mix.visible = stick.visible = now === 'makeupArtist_castMold';
      if (stick.visible) {
        const a = t * Math.PI * 2 * 1.2;
        hand.set(bowlAt.position.x + 0.02 - Math.cos(a) * 0.06, bowlAt.position.y + 0.1, bowlAt.position.z - Math.sin(a) * 0.05);
        aim(stick, hand, new THREE.Vector3(hand.x * 0.5 + bowlAt.position.x * 0.5, bowlAt.position.y - 0.01, hand.z * 0.5 + bowlAt.position.z * 0.5));
      }
    };
  },

  /**
   * A rolling garment rack: chrome uprights on castored feet, the rail at head height with a hook
   * label, a shelf under for shoes and a garment bag. Along the rail on hangers: a long dress, a
   * blazer, a blouse, a sequined dress that catches the light, a trench, a shirt… tags on them. Looked
   * through hanger by hanger, one slid along the rail and lifted out.
   */
  wardrobeRack(g, W, _D, _c, _def, _ctx, out) {
    const w = W - 0.2;
    const ry = 1.6;
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2);
      part(g, box(0.06, 0.03, 0.46), CHROME, x, 0.06, 0);
      for (const sz of [-1, 1]) caster(g, x, sz * 0.2, 0.03);
      rod(g, new THREE.Vector3(x, 0.07, 0), new THREE.Vector3(x, ry, 0), 0.015, CHROME);
    }
    rod(g, new THREE.Vector3(-w / 2, ry, 0), new THREE.Vector3(w / 2, ry, 0), 0.014, CHROME);
    part(g, box(w - 0.06, 0.02, 0.36), '#cfd8dc', 0, 0.16, 0);
    // Shoes and a garment bag on the shelf.
    const shoes = ['#212121', '#ffffff', '#c62828', '#d7ccc8'];
    shoes.forEach((k, i) => {
      for (const s of [-1, 1]) part(g, rbox(0.07, 0.06, 0.18, 0.025), k, -0.55 + i * 0.3 + s * 0.045, 0.2, 0.04);
    });
    part(g, rbox(0.3, 0.06, 0.25, 0.03), '#37474f', 0.62, 0.2, 0.0);
    // Garments on hangers: each a hanger hook, its shoulders and the shape below.
    const garments: Array<{ k: string; kind: 'dress' | 'jacket' | 'top' | 'coat' | 'sequin' }> = [
      { k: '#ad1457', kind: 'dress' },
      { k: '#263238', kind: 'jacket' },
      { k: '#fff8e1', kind: 'top' },
      { k: '#c9a227', kind: 'sequin' },
      { k: '#bcaaa4', kind: 'coat' },
      { k: '#90caf9', kind: 'top' },
      { k: '#f8bbd0', kind: 'dress' },
      { k: '#212121', kind: 'jacket' },
    ];
    // Drawn twice: still on the rail, and the set looked through while it's used.
    const idle = new THREE.Group();
    const use = new THREE.Group();
    g.add(idle, use);
    out.idle = idle;
    out.inUse = use;
    const hangers: THREE.Group[] = [];
    for (const into of [idle, use]) garments.forEach(({ k, kind }, i) => {
      const h = new THREE.Group();
      h.position.set(-w / 2 + 0.12 + i * ((w - 0.24) / (garments.length - 1)), ry, 0);
      into.add(h);
      part(h, ring(0.025, 0.004, Math.PI * 1.4), CHROME, 0, 0.0, 0, { ry: Math.PI / 2, outline: false });
      rod(h, new THREE.Vector3(0, -0.03, 0), new THREE.Vector3(0, -0.06, 0), 0.004, CHROME);
      part(h, box(0.02, 0.012, 0.36), '#8d6e63', 0, -0.075, 0, { outline: false });
      const len = kind === 'dress' || kind === 'coat' ? 1.0 : kind === 'sequin' ? 0.9 : 0.6;
      const mat = kind === 'sequin' ? { material: glow(k) } : {};
      part(h, rbox(0.06, 0.24, 0.38, 0.03), k, 0, -0.2, 0, mat);
      if (kind === 'dress' || kind === 'sequin') {
        const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.26, len - 0.3, 14), kind === 'sequin' ? glow(k) : toon(k));
        sk.userData.ownGeometry = true;
        sk.scale.set(0.35, 1, 1);
        sk.position.set(0, -0.32 - (len - 0.3) / 2, 0);
        h.add(sk);
      } else part(h, rbox(0.07, len - 0.3, 0.4, 0.03), kind === 'coat' ? shade(k, 0.95) : k, 0, -0.32 - (len - 0.3) / 2, 0);
      if (kind === 'jacket' || kind === 'coat') for (let j = 0; j < 3; j++) part(h, ball(0.008), '#c9a227', 0.04, -0.2 - j * 0.1, 0.03, { outline: false });
      part(h, box(0.004, 0.05, 0.03), '#ffffff', 0.04, -0.12, 0.17, { outline: false });
      if (into === use) hangers.push(h);
    });
    label(g, '스타일링 · 의상', 0.3, 0.06, 0, ry + 0.07, 0.02, '#ffffff', '#5d4037');
    const railAt = marker(g, 0, ry - 0.25, 0.22);
    out.work = railAt;
    out.spots = { '*': at(spot(g, 'stand', 0, 0, 0.62, Math.PI), railAt, 'rummage') };
    const base = hangers.map((h) => h.position.x);
    out.animate = (t) => {
      // Gone through hanger by hanger: each pushed along in turn, the one looked at lifted out a little.
      const n = hangers.length;
      const i = Math.floor(t / 1.8) % n;
      const u = (t / 1.8) % 1;
      hangers.forEach((h, j) => {
        const pushed = j < i ? -0.06 : 0;
        h.position.x = base[j] + pushed;
        h.position.z = 0;
        h.rotation.y = 0;
      });
      const h = hangers[i];
      const lift = Math.sin(Math.min(1, u * 1.3) * Math.PI);
      h.position.z = 0.12 * lift;
      h.rotation.y = 0.5 * lift;
    };
  },
  // The street front, the front desk and the unit next door (2026-11-05, the layout audit; shopFront.ts, frontDesk.ts).
  muShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 19, door: 12, name: '윤광 메이크업', sub: 'WEDDING · HAIR & MAKEUP', bg: '#ad1457', fg: '#ffffff', awning: '#f48fb1', stripes: true, frame: '#ffffff', posters: [['신부 메이크업', '#fce4ec', '#ad1457', 5.5], ['한복 헤어', '#fff8e1', '#6d4c41', 8.5], ['촬영 메이크업', '#ffffff', '#212121', 15.5]], solid: [[17, 18]] });
  },
  muReception(g, W, D) {
    frontDesk(g, W, D, { name: '윤광 메이크업', body: '#f8f1f4', top: '#d4a5b5', fg: '#ad1457', bg: '#f8f1f4', flowers: '#ec407a' });
  },
  muNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '라벨르 드레스', color: '#6a1b9a', wall: '#eee4ea' });
  },
};
