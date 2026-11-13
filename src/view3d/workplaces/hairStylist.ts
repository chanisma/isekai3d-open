import { neighbourShop, shopFront } from './shopFront';
import * as THREE from 'three';
import { SHAMPOO_HOLDER, TINT_BOWL, blowDryRound, hairColorRound, haircutRound, shampooRound, toolPhase, type BarOffset, type Motion } from '../activity';
import { SHOP_DETAIL } from '../furnitureShop';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { salonSweep } from './handWorkProps';
import { BLACK, CHROME, STEEL, WATER, caster, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';

/** The barber's pole's glass drum. */
const GLASS_DRUM = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.3, depthWrite: false });

/**
 * The hair salon drawn as itself (2026-10-27 workplace pipeline, at the user's request): the styling
 * chair (furnitureShop.ts) given its work — the client's hair cut with comb and scissors, coloured from
 * the tint bowl, blow-dried over a round brush, stood at their side, a cape over them; a VIP or a
 * concept client drawn in it, or a practice head clamped on it — the full-flat shampoo bed with its
 * basin at the stylist's end, the reception counter, the home-care wall, and what the 미용실 was
 * missing (workFurniture/hairStylist.ts): the colour bar, the processor, the stylist's trolley, the
 * towel steamer and the tea table by the waiting chairs.
 */

const ROSE_GOLD = '#d4a28c';
const LEATHER = '#4a3550';
const MARBLE = '#f4f1ee';
const SKIN = '#f1c9a5';
const HAIR = '#3b2a20';
const CAPE = '#2b2b33';
const TINT = '#7b3f2a';
const TOWEL = '#fafafa';

const tmp = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
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
/** A unit-long rod along +y, stretched from one point to another each frame (a hose, a stream of water). */
function stretchy(g: THREE.Object3D, r: number, color: string, material?: THREE.Material): THREE.Mesh {
  const m = part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false, material });
  return m;
}
const UP = new THREE.Vector3(0, 1, 0);
function stretch(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, Math.max(d.length(), 1e-4), 1);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
}

// ---------------------------------------------------------------------------------------------
// The tools in a stylist's hands, each with its own +z the way it points.

function scissors(g: THREE.Object3D) {
  const root = new THREE.Group();
  g.add(root);
  const blades: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const b = new THREE.Group();
    root.add(b);
    part(b, box(0.007, 0.003, 0.08), CHROME, 0, 0, 0.042, { outline: false });
    part(b, box(0.004, 0.0035, 0.03), STEEL, 0, 0, -0.012, { outline: false });
    part(b, ring(0.011, 0.003), sx < 0 ? BLACK : '#455a64', sx * 0.012, 0, -0.033, { rx: Math.PI / 2, outline: false });
    blades.push(b);
  }
  part(root, cyl(0.004, 0.004, 0.008, 8), BLACK, 0, 0, 0, { outline: false });
  return {
    root,
    open(k: number) {
      blades[0].rotation.y = 0.2 * k;
      blades[1].rotation.y = -0.2 * k;
    },
  };
}
function comb(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, box(0.004, 0.022, 0.17), '#263238', 0, 0, 0.07, { outline: false });
  part(root, box(0.0042, 0.008, 0.17), '#37474f', 0, 0.011, 0.07, { outline: false });
  return root;
}
function tintBowl(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.065, 0.045, 0.05, 18), '#1c1c1f', 0, 0.025, 0);
  part(root, cyl(0.058, 0.058, 0.004, 18), TINT, 0, 0.042, 0, { outline: false });
  part(root, box(0.03, 0.01, 0.04), '#1c1c1f', 0.075, 0.04, 0, { outline: false });
  return root;
}
function tintBrush(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.006, 0.004, 0.13, 8), '#1c1c1f', 0, 0, 0.065, { rx: Math.PI / 2, outline: false });
  part(root, box(0.03, 0.008, 0.03), TINT, 0, 0, 0.14, { outline: false });
  return root;
}
function dryer(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.042, 0.04, 0.17, 16), '#3a3a42', 0, 0, 0, { rx: Math.PI / 2 });
  part(root, cyl(0.026, 0.034, 0.06, 14), BLACK, 0, 0, 0.11, { rx: Math.PI / 2 });
  part(root, cyl(0.036, 0.036, 0.01, 14), '#78909c', 0, 0, -0.088, { rx: Math.PI / 2, outline: false });
  part(root, rbox(0.035, 0.13, 0.04, 0.015), '#3a3a42', 0, -0.08, -0.03, { rx: 0.25 });
  part(root, box(0.012, 0.02, 0.006), ROSE_GOLD, 0, -0.04, -0.008, { outline: false });
  return root;
}
/** A round brush, its barrel along +x (the handle off to -x), the bristles round it turning. */
function roundBrush(g: THREE.Object3D) {
  const root = new THREE.Group();
  g.add(root);
  const barrel = new THREE.Group();
  root.add(barrel);
  part(barrel, cyl(0.022, 0.022, 0.11, 12), '#b0bec5', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(barrel, box(0.1, 0.012, 0.012), i % 2 ? '#5d4037' : '#8d6e63', 0, Math.sin(a) * 0.026, Math.cos(a) * 0.026, { rx: a, outline: false });
  }
  part(root, cyl(0.012, 0.01, 0.13, 10), BLACK, -0.12, 0, 0, { rz: Math.PI / 2, outline: false });
  return { root, barrel };
}

/** The cape over someone sat in a styling chair: a profile turned round, from the collar out over the shoulders and the lap. */
let capeGeom: THREE.LatheGeometry | null = null;
function cape(g: THREE.Object3D, x: number, z: number): THREE.Mesh {
  capeGeom ??= new THREE.LatheGeometry(
    [new THREE.Vector2(0.33, 0.55), new THREE.Vector2(0.3, 0.72), new THREE.Vector2(0.26, 0.92), new THREE.Vector2(0.21, 1.06), new THREE.Vector2(0.12, 1.13), new THREE.Vector2(0.065, 1.16), new THREE.Vector2(0.06, 1.19)],
    20,
  );
  const m = part(g, capeGeom, CAPE, x, 0, z);
  m.scale.set(1, 1, 1.12);
  return m;
}
/** A head (the face to +z) with its hair: at `y` its middle. */
function head(g: THREE.Object3D, x: number, y: number, z: number, skin: string, hair: string, long = true, face = true): THREE.Group {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  g.add(h);
  part(h, ball(0.092), skin, 0, 0, 0).scale.set(0.92, 1.05, 1);
  part(h, ball(0.097), hair, 0, 0.022, -0.012).scale.set(1, 0.92, 1.02);
  if (long) part(h, rbox(0.18, 0.22, 0.06, 0.03), hair, 0, -0.1, -0.06);
  for (const sx of [-1, 1]) part(h, ball(0.018), skin, sx * 0.085, -0.005, 0);
  if (face) {
    for (const sx of [-1, 1]) part(h, ball(0.011), '#2b2b30', sx * 0.032, 0.0, 0.083, { outline: false });
    part(h, box(0.03, 0.005, 0.004), '#c2185b', 0, -0.045, 0.085, { outline: false });
  }
  return h;
}

// ---------------------------------------------------------------------------------------------
// What's painted.

const paintBooking: Paint = (c) => {
  c.fillStyle = '#fbf7f5';
  c.fillRect(0, 0, 384, 240);
  c.fillStyle = '#8e6b7d';
  c.fillRect(0, 0, 384, 28);
  text(c, '오늘의 예약 · 미란 헤어', 10, 15, 14, '#ffffff');
  const cols = ['원장', '하나', '태민'];
  cols.forEach((s, i) => text(c, s, 70 + i * 104, 42, 12, '#5d4037', 'center'));
  const rows = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  rows.forEach((r, j) => {
    text(c, r, 8, 64 + j * 25, 11, '#8d6e63', 'left', false);
    c.fillStyle = '#efe5e9';
    c.fillRect(30, 54 + j * 25, 346, 1);
  });
  const slots: Array<[number, number, number, string, string]> = [
    [0, 0, 2, '#f8bbd0', '김○○ 염색'],
    [1, 1, 1, '#c5e1a5', '이○○ 커트'],
    [2, 0, 3, '#b3e5fc', '박○○ 펌'],
    [0, 3, 1, '#ffe0b2', 'VIP 드라이'],
    [1, 3, 2, '#d1c4e9', '최○○ 클리닉'],
    [2, 4, 1, '#c5e1a5', '정○○ 커트'],
    [0, 5, 1, '#f8bbd0', '한○○ 뿌리염색'],
  ];
  for (const [col, row, n, k, s] of slots) {
    c.fillStyle = k;
    c.fillRect(24 + col * 104, 56 + row * 25, 96, n * 25 - 3);
    text(c, s, 30 + col * 104, 66 + row * 25, 11, '#3e2723', 'left', false);
  }
};
const paintScale: Paint = (c) => {
  c.fillStyle = '#0b1a12';
  c.fillRect(0, 0, 128, 48);
  text(c, '45.0 g', 120, 26, 26, '#76ff03', 'right');
};
const paintTimer: Paint = (c) => {
  c.fillStyle = '#1a0d05';
  c.fillRect(0, 0, 128, 64);
  text(c, '15:00', 64, 26, 26, '#ffab40', 'center');
  text(c, '열처리 · 중', 64, 52, 13, '#ffcc80', 'center', false);
};
const paintWasher: Paint = (c) => {
  c.fillStyle = '#0d1b24';
  c.fillRect(0, 0, 128, 40);
  text(c, '타월 0:28', 64, 21, 18, '#4fc3f7', 'center');
};
function paintMagazine(title: string, bg: string, hair: string): Paint {
  return (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 128, 168);
    c.fillStyle = '#f1c9a5';
    c.beginPath();
    c.ellipse(64, 92, 26, 32, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = hair;
    c.beginPath();
    c.ellipse(64, 78, 32, 30, 0, Math.PI, Math.PI * 2);
    c.fill();
    c.fillRect(32, 76, 12, 60);
    c.fillRect(84, 76, 12, 60);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 140, 128, 28);
    text(c, title, 64, 22, 22, '#ffffff', 'center');
    text(c, '2026 가을 헤어 트렌드', 64, 154, 11, '#333333', 'center', false);
  };
}
/** The wall of tint tubes at the colour bar: rows of boxes by level and tone, each with its number. */
const paintTubes: Paint = (c) => {
  c.fillStyle = '#efe7e1';
  c.fillRect(0, 0, 512, 256);
  const tones = ['N', 'B', 'A', 'R', 'V', 'G'];
  const tone: Record<string, string> = { N: '#6d4c41', B: '#8d6e63', A: '#78909c', R: '#c62828', V: '#7b1fa2', G: '#c9a227' };
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const x = 8 + col * 50;
      const y = 8 + row * 41;
      c.fillStyle = '#ffffff';
      c.fillRect(x, y, 46, 36);
      const k = tones[row];
      const lv = col + 1;
      const base = new THREE.Color(tone[k]).lerp(new THREE.Color('#fff3e0'), (lv - 1) / 12);
      c.fillStyle = '#' + base.getHexString();
      c.fillRect(x + 3, y + 3, 40, 18);
      text(c, `${lv}${k}`, x + 23, y + 29, 11, '#3e2723', 'center');
    }
};

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /**
   * The styling chair (as furnitureShop.ts draws it) at work. The client sits in it facing the room;
   * the stylist stands at their right side, square on to the head: cutting (the comb drawing a section
   * down, held out between the fingers, the scissors snipping under them, clippings on the floor),
   * colouring (the bowl at the chest, the brush along the partings) and blow-drying (the round brush
   * rolled down a section under the dryer), a black cape over the client. Its own uses: a VIP blown
   * out, a broadcast look talked over with a client drawn in the chair, a practice head clamped on a
   * pole in it for cutting practice and teaching, the shelf wiped down, the scissors honed on a stone.
   */
  salonStation(g, W, D, c, def, ctx, out) {
    SHOP_DETAIL.salonStation(g, W, D, c, def, ctx, out);
    const bz = -D / 2 + 0.04;
    const H = new THREE.Vector3(0, 1.28, 0.04);
    const headAt = marker(g, H.x, H.y, H.z);
    out.work = headAt;
    // At the client's right (the chair's -x), facing the head.
    const side = () => spot(g, 'stand', -0.48, 0, H.z, Math.PI / 2);
    const shelf = marker(g, -0.2, 0.88, bz + 0.12);
    const spots: Record<string, Spot> = {
      'social:cutHair': at(side(), headAt, 'haircut'),
      'social:dyeHair': at(side(), headAt, 'hairColor'),
      'social:styleHair': at(side(), headAt, 'blowDry'),
      '*': at(side(), headAt, 'blowDry'),
      hairStylist_mannequinCut: at(side(), headAt, 'haircut'),
      hairStylist_staffEducation: at(side(), headAt, 'haircut'),
      hairStylist_conceptConsult: at(spot(g, 'stand', -0.4, 0, 0.66, Math.atan2(0.4, H.z - 0.66)), headAt, 'talk'),
      cleanStation: at(spot(g, 'stand', -0.56, 0, -0.02, Math.atan2(0.36, bz + 0.14)), shelf, 'scrub'),
      sharpenScissors: at(spot(g, 'stand', -0.56, 0, -0.02, Math.atan2(0.36, bz + 0.14)), shelf, 'tinker'),
      xwSweepHair: salonSweep(g, out),
    };
    out.spots = spots;
    // Where a point in the stylist's frame (BarOffset from the head) is, for the stylist at the side.
    const off = (o: BarOffset, v = new THREE.Vector3()) => v.set(H.x + o.ahead, H.y + o.up, H.z - o.side);

    /** A set of tools in a group: one for the chair's own uses (shown only while it's used), one for a client seen to in it. */
    const kit = (grp: THREE.Group) => {
      const sc = scissors(grp);
      const cb = comb(grp);
      const bowl = tintBowl(grp);
      const brush = tintBrush(grp);
      const dr = dryer(grp);
      const rb = roundBrush(grp);
      // Hair clippings on the floor round the chair.
      const clip = new THREE.Group();
      grp.add(clip);
      const rnd = seeded(41);
      for (let i = 0; i < 22; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 0.25 + rnd() * 0.3;
        part(clip, box(0.03 + rnd() * 0.03, 0.003, 0.004), i % 3 ? HAIR : '#5d4037', Math.sin(a) * r, 0.003, 0.1 + Math.cos(a) * r, { ry: rnd() * 3, outline: false });
      }
      const all = [sc.root, cb, bowl, brush, dr, rb.root, clip];
      const show = (m: Motion | null, t: number, ph: number) => {
        for (const o of all) o.visible = false;
        if (m === 'haircut') {
          const k = haircutRound(t, ph);
          sc.root.visible = cb.visible = clip.visible = true;
          // The comb's teeth down through the hair, the scissors pointing in under the fingers.
          const l = off(k.l);
          aim(cb, l, off({ side: k.l.side, up: k.l.up - 0.12, ahead: k.l.ahead + 0.05 }));
          const r = off(k.r);
          aim(sc.root, r, off({ side: k.r.side + 0.06, up: k.r.up + 0.02, ahead: k.r.ahead + 0.12 }));
          sc.open(k.open);
        } else if (m === 'hairColor') {
          const k = hairColorRound(t, ph);
          bowl.visible = brush.visible = true;
          bowl.position.copy(off(TINT_BOWL)).add(new THREE.Vector3(0, -0.035, 0));
          aim(brush, off(k.r), off(k.tip));
        } else if (m === 'blowDry') {
          const k = blowDryRound(t, ph);
          dr.visible = rb.root.visible = true;
          const b = off(k.brush);
          rb.root.position.copy(b);
          rb.barrel.rotation.x = k.roll;
          aim(dr, off(k.nozzle).sub(off(k.brush).sub(off(k.nozzle)).normalize().multiplyScalar(0.14)), b);
        }
      };
      return show;
    };

    // In use: a client under the cape (a VIP, a concept talked over), the practice head on its pole,
    // the stone and the spray on the shelf.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const client = new THREE.Group();
    use.add(client);
    cape(client, 0, 0.1);
    head(client, H.x, H.y, H.z + 0.01, SKIN, HAIR, true);
    for (const sx of [-1, 1]) {
      rod(client, new THREE.Vector3(sx * 0.09, 0.56, 0.45), new THREE.Vector3(sx * 0.09, 0.2, 0.5), 0.045, '#455a64');
      part(client, rbox(0.09, 0.07, 0.17, 0.03), '#3e2723', sx * 0.09, 0.2, 0.55);
    }
    const vipFlower = part(client, ball(0.025), '#ec407a', 0.07, H.y + 0.08, H.z - 0.02);
    const doll = new THREE.Group();
    use.add(doll);
    part(doll, cyl(0.1, 0.12, 0.04, 16), BLACK, 0, 0.56, 0.08);
    part(doll, cyl(0.014, 0.014, 0.6, 8), CHROME, 0, 0.88, 0.06, { outline: false });
    part(doll, rbox(0.06, 0.06, 0.06, 0.02), BLACK, 0, 1.13, 0.05);
    head(doll, H.x, H.y, H.z, '#f3e0cf', '#5d4037', true, false);
    const stone = new THREE.Group();
    use.add(stone);
    part(stone, rbox(0.16, 0.025, 0.05, 0.008), '#8d6e63', -0.18, 0.88, bz + 0.15);
    part(stone, box(0.12, 0.004, 0.035), '#bcaaa4', -0.18, 0.894, bz + 0.15, { outline: false });
    const cloth = new THREE.Group();
    use.add(cloth);
    part(cloth, rbox(0.12, 0.012, 0.09, 0.005), '#80deea', -0.24, 0.875, bz + 0.16, { ry: 0.4 });
    const useKit = kit(use);

    // Seeing to a client sat in it (not "in use": workplace socials): the cape over them and the tools.
    const serve = new THREE.Group();
    serve.visible = false;
    g.add(serve);
    cape(serve, 0, 0.1);
    const serveKit = kit(serve);

    out.animate = (t) => {
      const now = nowAt(spots, t);
      const sp = now ? spots[now] : null;
      const m = sp?.motion ?? null;
      const ph = sp ? phaseAt(sp) : 0;
      const social = !!now?.startsWith('social:');
      serve.visible = social;
      if (social) serveKit(m, t, ph);
      client.visible = now === '*' || now === 'hairStylist_conceptConsult';
      vipFlower.visible = now === '*';
      doll.visible = now === 'hairStylist_mannequinCut' || now === 'hairStylist_staffEducation';
      stone.visible = now === 'sharpenScissors';
      cloth.visible = now === 'cleanStation';
      useKit(social || now === 'hairStylist_conceptConsult' ? null : m, t, ph);
    };
  },

  /**
   * A full-flat shampoo bed (풀플랫 샴푸대): a long padded bed in plum leather on its plinth, the feet to
   * the wall, the basin at the room end — white, on its pedestal, a rubber neck rest in its notch, the
   * tap and the shower head in its holder on the rim, the shampoo and the treatment in pump bottles —
   * a rolled towel on the pillow end. In use a client lies with the head back in the basin, a towel
   * round the neck, and the stylist stands at the head working the lather in, then rinses it through
   * with the shower head; the scalp spa is the same, slower.
   */
  shampooSink(g, _W, D, _c, _def, _ctx, out) {
    const hz = D / 2 - 0.38;
    const H = new THREE.Vector3(0, 0.8, hz);
    // The bed.
    part(g, rbox(0.5, 0.36, 1.25, 0.04), '#e9e1dc', 0, 0.18, -0.33);
    part(g, box(0.52, 0.04, 1.27), '#8d6e63', 0, 0.02, -0.33, { outline: false });
    part(g, rbox(0.6, 0.12, 1.42, 0.05), '#d9cfc8', 0, 0.42, -0.3);
    part(g, rbox(0.62, 0.13, 1.4, 0.06), LEATHER, 0, 0.55, -0.31);
    for (let i = 0; i < 5; i++) part(g, box(0.5, 0.004, 0.006), shade(LEATHER, 0.75), 0, 0.617, -0.9 + i * 0.28, { outline: false });
    // A raised shoulder pad towards the basin.
    part(g, rbox(0.56, 0.08, 0.3, 0.04), LEATHER, 0, 0.64, 0.25, { rx: 0.1 });
    // The basin's pedestal and the bowl.
    const bz = hz + 0.02;
    part(g, rbox(0.56, 0.62, 0.42, 0.04), '#f3eee9', 0, 0.31, bz + 0.05);
    part(g, box(0.5, 0.03, 0.36), ROSE_GOLD, 0, 0.6, bz + 0.05, { outline: false });
    part(g, cyl(0.25, 0.17, 0.16, 26), '#ffffff', 0, 0.71, bz);
    part(g, cyl(0.22, 0.15, 0.01, 26), '#e3eef2', 0, 0.785, bz, { outline: false });
    part(g, cyl(0.06, 0.06, 0.006, 12), '#b0bec5', 0, 0.69, bz, { outline: false });
    // The neck rest in the notch on the bed's side.
    part(g, ring(0.07, 0.022, Math.PI), '#37474f', 0, 0.79, bz - 0.2, { rx: Math.PI / 2, rz: Math.PI });
    // The tap at the far side and the holder on the rim at the stylist's right (+x).
    const tapBase = new THREE.Vector3(-0.1, 0.8, bz + 0.22);
    rod(g, tapBase, new THREE.Vector3(-0.1, 0.98, bz + 0.22), 0.016, CHROME);
    rod(g, new THREE.Vector3(-0.1, 0.98, bz + 0.22), new THREE.Vector3(-0.1, 0.95, bz + 0.1), 0.014, CHROME);
    part(g, cyl(0.02, 0.02, 0.04, 10), CHROME, 0.05, 0.82, bz + 0.22);
    // The stylist at the head faces -z: their left is -x, ahead is -z.
    const off = (o: BarOffset, v = new THREE.Vector3()) => v.set(H.x - o.side, H.y + o.up, H.z - o.ahead);
    const holderAt = off(SHAMPOO_HOLDER);
    part(g, rbox(0.05, 0.05, 0.06, 0.015), CHROME, holderAt.x + 0.02, 0.8, holderAt.z);
    const hoseFrom = new THREE.Vector3(0.12, 0.79, bz + 0.2);
    // The pump bottles on the pedestal's corner, the towel rolled on the bed.
    for (const [i, k] of ['#f8bbd0', '#ce93d8', '#ffffff'].entries()) {
      part(g, cyl(0.03, 0.032, 0.16, 12), k, -0.2 + i * 0.07, 0.86, bz + 0.2);
      part(g, cyl(0.009, 0.009, 0.04, 8), BLACK, -0.2 + i * 0.07, 0.96, bz + 0.2, { outline: false });
      part(g, box(0.03, 0.008, 0.008), BLACK, -0.19 + i * 0.07, 0.98, bz + 0.2, { outline: false });
    }
    const idle = new THREE.Group();
    g.add(idle);
    part(idle, cyl(0.06, 0.06, 0.32, 14), TOWEL, 0, 0.68, 0.1, { rz: Math.PI / 2 });
    out.idle = idle;
    // The shower head: in its holder, or in the hand (drawn every frame), its hose from under the rim.
    const head0 = new THREE.Group();
    g.add(head0);
    part(head0, cyl(0.022, 0.016, 0.12, 12), '#eceff1', 0, 0, -0.04, { rx: Math.PI / 2 });
    part(head0, cyl(0.032, 0.026, 0.03, 14), '#cfd8dc', 0, 0, 0.03, { rx: Math.PI / 2 });
    part(head0, cyl(0.026, 0.026, 0.003, 14), '#90a4ae', 0, 0, 0.046, { rx: Math.PI / 2, outline: false });
    const hose = stretchy(g, 0.008, '#b0bec5');
    const restAim = holderAt.clone().add(new THREE.Vector3(0.02, -0.1, -0.05));
    aim(head0, holderAt.clone().add(new THREE.Vector3(0, 0.03, 0)), restAim);
    stretch(hose, hoseFrom, head0.position);
    // In use: the client lying back, the hair in the basin, the lather, the water.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const shirt = '#90caf9';
    part(use, rbox(0.38, 0.16, 0.56, 0.07), shirt, 0, 0.7, 0.0);
    part(use, rbox(0.36, 0.15, 0.3, 0.07), '#5d4037', 0, 0.69, -0.42);
    for (const sx of [-1, 1]) {
      rod(use, new THREE.Vector3(sx * 0.09, 0.68, -0.55), new THREE.Vector3(sx * 0.09, 0.67, -1.0), 0.06, '#5d4037');
      part(use, rbox(0.09, 0.12, 0.07, 0.03), '#212121', sx * 0.09, 0.72, -1.04);
      rod(use, new THREE.Vector3(sx * 0.2, 0.72, 0.2), new THREE.Vector3(sx * 0.21, 0.72, -0.08), 0.04, shirt);
      rod(use, new THREE.Vector3(sx * 0.21, 0.72, -0.08), new THREE.Vector3(sx * 0.07, 0.78, -0.2), 0.035, shirt);
      part(use, ball(0.035), SKIN, sx * 0.06, 0.79, -0.22);
    }
    // The towel round the neck, the neck, the head tipped back into the basin, face up.
    part(use, cyl(0.075, 0.08, 0.1, 16), TOWEL, 0, 0.78, H.z - 0.25, { rx: Math.PI / 2 });
    rod(use, new THREE.Vector3(0, 0.77, H.z - 0.27), new THREE.Vector3(0, 0.79, H.z - 0.1), 0.045, SKIN);
    const hd = new THREE.Group();
    hd.position.copy(H);
    hd.rotation.x = -Math.PI / 2 - 0.25;
    use.add(hd);
    part(hd, ball(0.09), SKIN, 0, 0, 0).scale.set(0.92, 1.05, 1);
    part(hd, ball(0.095), '#2a1d16', 0, 0.025, -0.02).scale.set(1, 0.95, 1.05);
    for (const sx of [-1, 1]) part(hd, ball(0.011), '#2b2b30', sx * 0.032, 0.0, 0.08, { outline: false });
    // The wet hair fanned out in the bowl.
    part(use, rbox(0.24, 0.02, 0.2, 0.08), '#2a1d16', 0, 0.72, H.z + 0.09);
    const foam = new THREE.Group();
    foam.position.copy(H);
    use.add(foam);
    const rnd = seeded(7);
    for (let i = 0; i < 9; i++) part(foam, ball(0.03 + rnd() * 0.02), '#ffffff', (rnd() - 0.5) * 0.17, 0.04 + rnd() * 0.04, 0.02 + rnd() * 0.1, { outline: false });
    const stream = stretchy(use, 0.012, '#b3e5fc', WATER);
    const spots: Record<string, Spot> = {
      '*': at(spot(g, 'stand', 0, 0, D / 2 + 0.12, Math.PI), marker(g, H.x, H.y, H.z), 'shampoo'),
    };
    out.spots = spots;
    out.work = spots['*'].work;
    out.animate = (t) => {
      const sp = spots['*'];
      const k = shampooRound(t, phaseAt(sp));
      foam.visible = k.foam > 0.05;
      foam.scale.setScalar(0.4 + 0.6 * k.foam);
      if (k.held) {
        const p = off(k.sprayer);
        aim(head0, p.clone().add(new THREE.Vector3(0, 0.02, 0)), off({ side: k.sprayer.side * 0.5, up: 0, ahead: k.sprayer.ahead }));
      } else aim(head0, holderAt.clone().add(new THREE.Vector3(0, 0.03, 0)), restAim);
      stretch(hose, hoseFrom, head0.position);
      stream.visible = k.spray;
      if (k.spray) {
        head0.updateMatrix();
        const tip = new THREE.Vector3(0, 0, 0.05).applyMatrix4(head0.matrix);
        stretch(stream, tip, new THREE.Vector3(tip.x * 0.6, H.y + 0.06, H.z + 0.03));
      }
    };
  },

  /**
   * The salon's reception counter: a white front with a rose-gold band and the salon's name, a marble
   * ledge with flowers, cards and a 예약 sign; behind it, at desk height, the screen of the day's
   * bookings by stylist, the keyboard, the card reader and the appointment book. The receptionist
   * stands behind it facing the door: bookings typed in, the day's sales written up.
   */
  salonCounter(g, _W, D, _c, _def, _ctx, out) {
    const fz = 0.18;
    const fd = 0.34;
    part(g, rbox(0.94, 1.0, fd, 0.04), '#fbf8f6', 0, 0.5, fz);
    part(g, box(0.95, 0.04, fd + 0.01), ROSE_GOLD, 0, 0.82, fz, { outline: false });
    label(g, 'MIRAN HAIR · 미란 헤어', 0.7, 0.12, 0, 0.6, fz + fd / 2 + 0.006, '#fbf8f6', '#8e6b7d');
    part(g, rbox(1.0, 0.04, fd + 0.12, 0.015), MARBLE, 0, 1.02, fz + 0.02);
    for (let i = 0; i < 4; i++) part(g, box(0.004, 0.002, 0.3), '#d7ccc8', -0.35 + i * 0.22, 1.041, fz + 0.02, { ry: 0.4 + i * 0.2, outline: false });
    // The desk behind.
    part(g, rbox(0.9, 0.04, 0.3, 0.015), '#efe7e1', 0, 0.76, fz - fd / 2 - 0.12);
    part(g, box(0.86, 0.72, 0.02), '#e8ddd6', 0, 0.38, fz - fd / 2 - 0.01, { outline: false });
    // The monitor turned to whoever stands behind.
    const mon = new THREE.Group();
    mon.position.set(-0.15, 0.98, fz - fd / 2 - 0.1);
    mon.rotation.y = Math.PI;
    g.add(mon);
    part(mon, rbox(0.42, 0.28, 0.025, 0.01), BLACK, 0, 0, 0);
    part(mon, box(0.04, 0.2, 0.03), '#78909c', 0, -0.14, -0.03, { outline: false });
    out.screen = litScreen(mon, painted('hs-booking', 384, 240, paintBooking), 0.39, 0.25, 0, 0, 0.014);
    part(g, rbox(0.3, 0.015, 0.1, 0.005), '#eceff1', -0.12, 0.785, -0.02);
    const keys = marker(g, -0.12, 0.8, -0.02);
    // The card reader and the open appointment book.
    part(g, rbox(0.08, 0.03, 0.14, 0.01), '#37474f', 0.28, 0.795, -0.04, { rx: -0.2 });
    glowing(g, box(0.05, 0.004, 0.04), '#4fc3f7', 0.28, 0.82, -0.02);
    part(g, box(0.26, 0.012, 0.18), '#fffdf7', 0.2, 0.785, fz - fd / 2 - 0.14);
    part(g, box(0.004, 0.014, 0.18), '#8e6b7d', 0.2, 0.786, fz - fd / 2 - 0.14, { outline: false });
    const book = marker(g, 0.2, 0.8, fz - fd / 2 - 0.14);
    // On the ledge: flowers in a vase, the card holder, the 예약 sign.
    part(g, cyl(0.04, 0.03, 0.14, 12), '#e1f5fe', -0.36, 1.11, fz + 0.04);
    for (let i = 0; i < 5; i++) part(g, ball(0.028), ['#f48fb1', '#fff59d', '#f8bbd0', '#ffffff', '#ce93d8'][i], -0.36 + Math.cos(i * 1.3) * 0.04, 1.23 + (i % 2) * 0.03, fz + 0.04 + Math.sin(i * 1.3) * 0.04);
    part(g, rbox(0.08, 0.05, 0.05, 0.01), ROSE_GOLD, 0.06, 1.065, fz + 0.1);
    part(g, box(0.07, 0.04, 0.005), '#ffffff', 0.06, 1.08, fz + 0.1, { outline: false });
    label(g, '예약 · 접수', 0.18, 0.07, 0.32, 1.09, fz + 0.06, '#8e6b7d', '#ffffff');
    out.work = keys;
    out.spots = {
      '*': at(spot(g, 'stand', -0.08, 0, -D / 2 + 0.23, 0), keys, 'type'),
      hairStylist_salonSales: at(spot(g, 'stand', 0.16, 0, -D / 2 + 0.23, 0), book, 'write'),
    };
  },

  /**
   * The home-care wall: a tall white unit with rose-gold edges, four lit glass shelves of what the
   * salon sells (shampoos, treatments, hair oils, wax and sprays) with price tags and a BEST tag,
   * the sign over it, boxed stock in the cupboard under. Restocked from a carton on the floor.
   */
  productShelf(g, _W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.2;
    const w = 0.9;
    part(g, rbox(w, 1.95, 0.36, 0.02), '#fbf8f6', 0, 0.975, z);
    for (const sx of [-1, 1]) part(g, box(0.02, 1.95, 0.37), ROSE_GOLD, sx * (w / 2 - 0.01), 0.975, z, { outline: false });
    part(g, box(w - 0.06, 1.6, 0.01), '#efe2dc', 0, 1.05, z - 0.16, { outline: false });
    label(g, '홈케어 헤어 제품', 0.6, 0.11, 0, 1.86, z + 0.185, '#8e6b7d', '#ffffff');
    // The cupboard below.
    part(g, rbox(w - 0.04, 0.4, 0.02, 0.01), '#f3ece8', 0, 0.22, z + 0.18);
    for (const sx of [-1, 1]) part(g, box(0.1, 0.012, 0.02), ROSE_GOLD, sx * 0.08, 0.32, z + 0.195, { outline: false });
    const rnd = seeded(23);
    const kinds = [
      ['#f8bbd0', '#ffffff', '#ce93d8', '#b2dfdb'],
      ['#ffe0b2', '#d7ccc8', '#ffffff', '#f48fb1'],
      ['#c5e1a5', '#fff59d', '#b3e5fc', '#e1bee7'],
      ['#212121', '#90a4ae', '#ffab91', '#80cbc4'],
    ];
    for (let s = 0; s < 4; s++) {
      const y = 0.5 + s * 0.33;
      glass(g, box(w - 0.06, 0.012, 0.3), 0, y, z);
      glowing(g, box(w - 0.08, 0.006, 0.01), '#fff8e1', 0, y + 0.3, z + 0.13);
      for (let i = 0; i < 7; i++) {
        const x = -0.36 + i * 0.12;
        const k = kinds[s][i % 4];
        const kind = (s + i) % 3;
        if (s === 3 && i % 2 === 0) {
          // Wax and clay tins.
          part(g, cyl(0.04, 0.04, 0.04, 14), k, x, y + 0.026, z + 0.04);
          part(g, cyl(0.041, 0.041, 0.01, 14), ROSE_GOLD, x, y + 0.05, z + 0.04, { outline: false });
        } else if (kind === 0) {
          part(g, cyl(0.03, 0.033, 0.2, 12), k, x, y + 0.106, z + 0.02);
          part(g, cyl(0.01, 0.01, 0.04, 8), BLACK, x, y + 0.226, z + 0.02, { outline: false });
          part(g, box(0.035, 0.01, 0.01), BLACK, x + 0.012, y + 0.244, z + 0.02, { outline: false });
        } else if (kind === 1) {
          part(g, rbox(0.06, 0.15, 0.035, 0.015), k, x, y + 0.081, z + 0.03);
          part(g, cyl(0.015, 0.015, 0.02, 8), '#ffffff', x, y + 0.012, z + 0.03, { outline: false });
        } else {
          part(g, cyl(0.022, 0.026, 0.12, 12), k, x, y + 0.066, z + 0.04);
          part(g, cyl(0.012, 0.016, 0.03, 8), ROSE_GOLD, x, y + 0.14, z + 0.04, { outline: false });
        }
        part(g, box(0.06, 0.02, 0.003), rnd() > 0.85 ? '#e53935' : '#ffffff', x, y - 0.002, z + 0.153, { outline: false });
      }
    }
    label(g, 'BEST', 0.08, 0.035, -0.36, 1.06, z + 0.16, '#e53935', '#ffffff');
    // In use: a carton of stock on the floor in front, bottles in it.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, rbox(0.34, 0.24, 0.26, 0.01), '#c8a27a', 0.2, 0.12, z + 0.45);
    for (let i = 0; i < 4; i++) part(use, cyl(0.028, 0.03, 0.12, 10), kinds[0][i], 0.12 + (i % 2) * 0.12, 0.27, z + 0.4 + Math.floor(i / 2) * 0.1);
    const shelf = marker(g, -0.05, 1.2, z + 0.06);
    out.work = shelf;
    out.spots = { '*': at(spot(g, 'stand', -0.05, 0, z + 0.55, Math.PI), shelf, 'rummage') };
  },

  /**
   * The colour bar: under a wall of tint tubes by level and tone, a white counter with drawers — the
   * digital scale (its reading lit while it's used) with a tint bowl on it, a stand of bowls and
   * brushes, the developers (6 %, 9 %) and a bottle of treatment, the swatch chart fanned out on its
   * stand, a box of gloves and the foil roll. The dye is weighed and stirred at the scale; colours are
   * picked off the swatches.
   */
  hsColorBar(g, W, D, _c, _def, _ctx, out) {
    const d = 0.55;
    const z = -D / 2 + d / 2 + 0.02;
    const zf = z + d / 2;
    const top = 0.9;
    part(g, rbox(W - 0.08, top - 0.04, d - 0.04, 0.02), '#f8f4f0', 0, (top - 0.04) / 2, z - 0.01);
    for (let i = 0; i < 4; i++) {
      const x = -W / 2 + 0.3 + i * 0.47;
      part(g, rbox(0.42, 0.24, 0.015, 0.008), '#efe7e1', x, 0.62, zf - 0.03);
      part(g, rbox(0.42, 0.42, 0.015, 0.008), '#efe7e1', x, 0.27, zf - 0.03);
      part(g, box(0.12, 0.012, 0.02), ROSE_GOLD, x, 0.66, zf - 0.015, { outline: false });
    }
    part(g, rbox(W - 0.02, 0.04, d + 0.02, 0.012), MARBLE, 0, top - 0.02, z);
    // The tube wall.
    part(g, box(W - 0.1, 0.9, 0.04), '#e8ddd6', 0, top + 0.6, -D / 2 + 0.03);
    picture(g, painted('hs-tubes', 512, 256, paintTubes), W - 0.16, 0.66, 0, top + 0.56, -D / 2 + 0.052);
    label(g, '컬러 조제실', 0.42, 0.08, 0, top + 0.98, -D / 2 + 0.052, '#8e6b7d', '#ffffff');
    // The scale and its bowl.
    const sx = -0.25;
    const sz = z + 0.08;
    part(g, rbox(0.2, 0.03, 0.2, 0.01), '#eceff1', sx, top + 0.015, sz);
    part(g, box(0.09, 0.025, 0.012), '#263238', sx, top + 0.02, sz + 0.1, { outline: false });
    const disp = litScreen(g, painted('hs-scale', 128, 48, paintScale), 0.08, 0.02, sx, top + 0.022, sz + 0.107);
    out.screen = disp;
    const bowl = tintBowl(g);
    bowl.position.set(sx, top + 0.03, sz);
    const bowlAt = marker(g, sx, top + 0.1, sz);
    // A stand of bowls and brushes.
    for (let i = 0; i < 3; i++) part(g, cyl(0.065, 0.045, 0.05, 16), '#1c1c1f', 0.02, top + 0.025 + i * 0.03, z - 0.1);
    for (let i = 0; i < 4; i++) part(g, cyl(0.005, 0.004, 0.16, 6), '#1c1c1f', 0.15 + i * 0.02, top + 0.09, z - 0.12, { rz: (i - 1.5) * 0.12, outline: false });
    part(g, cyl(0.035, 0.03, 0.08, 12), ROSE_GOLD, 0.18, top + 0.04, z - 0.12);
    // The developers and the treatment.
    for (const [i, s] of ['6%', '9%'].entries()) {
      part(g, rbox(0.08, 0.2, 0.06, 0.02), '#ffffff', -0.66 + i * 0.1, top + 0.1, z - 0.12);
      part(g, cyl(0.014, 0.014, 0.03, 8), i ? '#e53935' : '#1e88e5', -0.66 + i * 0.1, top + 0.215, z - 0.12, { outline: false });
      label(g, s, 0.05, 0.03, -0.66 + i * 0.1, top + 0.1, z - 0.089, '#ffffff', i ? '#e53935' : '#1e88e5');
    }
    // The swatch chart, its strips fanned out, on its little stand.
    const fan = new THREE.Group();
    fan.position.set(0.5, top + 0.02, z + 0.02);
    fan.rotation.x = -0.35;
    g.add(fan);
    part(fan, box(0.04, 0.03, 0.04), BLACK, 0, 0.015, 0);
    for (let i = 0; i < 9; i++) {
      const a = -0.8 + i * 0.2;
      const col = new THREE.Color(['#3e2723', '#5d4037', '#8d6e63', '#c9a27a', '#e6c79c', '#c62828', '#7b1fa2', '#78909c', '#c9a227'][i]);
      part(fan, box(0.03, 0.2, 0.004), '#' + col.getHexString(), Math.sin(a) * 0.1, 0.1 + Math.cos(a) * 0.1 - 0.1 + 0.05, i * 0.003, { rz: -a, outline: false });
    }
    const chart = marker(g, 0.5, top + 0.12, z + 0.04);
    // Gloves and foil.
    part(g, rbox(0.2, 0.07, 0.1, 0.01), '#e3f2fd', 0.78, top + 0.035, z - 0.12);
    part(g, box(0.08, 0.004, 0.03), '#263238', 0.78, top + 0.071, z - 0.12, { outline: false });
    part(g, rbox(0.34, 0.08, 0.08, 0.02), '#ffffff', 0.8, top + 0.04, z + 0.12);
    part(g, cyl(0.03, 0.03, 0.3, 12), STEEL, 0.8, top + 0.04, z + 0.12, { rz: Math.PI / 2 });
    // In use: the tube being squeezed lying by the bowl, the colour in it deeper.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, cyl(0.016, 0.02, 0.14, 10), '#ffffff', sx + 0.15, top + 0.02, sz + 0.03, { rz: Math.PI / 2 });
    part(use, cyl(0.02, 0.02, 0.03, 10), '#7b3f2a', sx + 0.15 - 0.08, top + 0.02, sz + 0.03, { rz: Math.PI / 2, outline: false });
    part(use, cyl(0.05, 0.05, 0.03, 16), '#5a2a1c', sx, top + 0.07, sz, { outline: false });
    out.work = bowlAt;
    out.spots = {
      '*': at(spot(g, 'stand', sx, 0, zf + 0.33, Math.PI), bowlAt, 'stir'),
      hsColorChart: at(spot(g, 'stand', 0.5, 0, zf + 0.33, Math.PI), chart, 'tinker'),
    };
  },

  /**
   * A processor (열처리기, roller-ball heater) on its rolling stand: a five-star base, the column, the
   * control box with its timer, and up on its arm the halo of heat lamps that goes round a head,
   * turned out to the chair beside it. While it's set the lamps glow and the halo swings to and fro.
   */
  hsProcessor(g, _W, _D, _c, _def, _ctx, out) {
    starBase(g, 0.05, 0, 0.28, '#b0bec5');
    part(g, cyl(0.022, 0.022, 1.25, 10), CHROME, 0.05, 0.72, 0, { outline: false });
    part(g, rbox(0.16, 0.2, 0.1, 0.02), '#f5f5f5', 0.05, 1.02, 0.03);
    const timer = litScreen(g, painted('hs-timer', 128, 64, paintTimer), 0.11, 0.055, 0.05, 1.06, 0.081);
    out.screen = timer;
    for (let i = 0; i < 2; i++) part(g, cyl(0.012, 0.012, 0.012, 10), ['#ff7043', '#90a4ae'][i], 0.02 + i * 0.06, 0.97, 0.082, { rx: Math.PI / 2, outline: false });
    const panel = marker(g, 0.05, 1.02, 0.1);
    rod(g, new THREE.Vector3(0.05, 1.33, 0), new THREE.Vector3(-0.22, 1.66, 0.02), 0.016, CHROME);
    const halo = new THREE.Group();
    halo.position.set(-0.22, 1.38, 0.02);
    g.add(halo);
    const swing = new THREE.Group();
    halo.add(swing);
    part(swing, ring(0.24, 0.025), '#eceff1', 0, 0, 0, { rx: Math.PI / 2 });
    part(swing, cyl(0.06, 0.06, 0.06, 14), '#eceff1', 0, 0.26, 0);
    const lamps = new THREE.Group();
    swing.add(lamps);
    const dark = new THREE.Group();
    swing.add(dark);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const px = Math.cos(a) * 0.2;
      const pz = Math.sin(a) * 0.2;
      part(swing, rbox(0.08, 0.12, 0.05, 0.02), '#f5f5f5', px, 0, pz, { ry: -a + Math.PI / 2 });
      part(dark, cyl(0.028, 0.028, 0.01, 12), '#8d6e63', px * 0.85, 0, pz * 0.85, { rz: Math.PI / 2, ry: -a, outline: false });
      part(lamps, cyl(0.03, 0.03, 0.01, 12), '#ff8a3d', px * 0.84, 0, pz * 0.84, { rz: Math.PI / 2, ry: -a, outline: false, shadow: false, material: glow('#ff8a3d') });
    }
    lamps.visible = false;
    out.inUse = lamps;
    out.animate = (t) => {
      swing.rotation.y = 0.5 * Math.sin(t * 0.8);
    };
    out.work = panel;
    out.spots = { '*': at(spot(g, 'stand', 0.05, 0, 0.5, Math.PI), panel, 'type') };
  },

  /**
   * The stylist's trolley (웨건): three black tiers on castors, the top tray of perm rods by size in
   * their colours, end papers and duckbill clips, a tail comb, rubber bands and a spray bottle; foil
   * sheets and a neck duster in the tier below, towels at the bottom. Rods are sorted out on it for a
   * perm.
   */
  hsTrolley(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.42;
    const d = 0.38;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * (w / 2 - 0.04), sz * (d / 2 - 0.04), 0.03);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.012, 0.012, 0.78, 8), '#2b2b30', sx * (w / 2 - 0.02), 0.47, sz * (d / 2 - 0.02), { outline: false });
    const tiers = [0.15, 0.48, 0.83];
    for (const y of tiers) {
      part(g, rbox(w, 0.03, d, 0.012), '#1f1f24', 0, y, 0);
      part(g, box(w - 0.03, 0.04, 0.012), '#2b2b30', 0, y + 0.03, d / 2 - 0.01, { outline: false });
    }
    // Drawers in the middle tier's front.
    for (let i = 0; i < 2; i++) {
      part(g, rbox(0.36, 0.1, 0.02, 0.008), '#26262c', 0, 0.3 + i * 0.12, d / 2 - 0.02);
      part(g, box(0.08, 0.012, 0.012), ROSE_GOLD, 0, 0.3 + i * 0.12, d / 2 - 0.006, { outline: false });
    }
    // The rods tray: rows of rods by size and colour.
    const rodsY = tiers[2] + 0.02;
    const rodCols = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#ff7043'];
    for (let row = 0; row < 6; row++)
      for (let i = 0; i < 6; i++) {
        const r = 0.008 + row * 0.0022;
        part(g, cyl(r, r, 0.07, 8), rodCols[row], -0.16 + i * 0.03, rodsY + r, -0.15 + row * (0.024 + row * 0.002), { rz: Math.PI / 2, outline: false });
      }
    const tray = marker(g, -0.08, rodsY + 0.02, -0.05);
    part(g, box(0.08, 0.025, 0.06), '#ffffff', 0.12, rodsY + 0.012, -0.12, { outline: false });
    for (let i = 0; i < 4; i++) part(g, box(0.012, 0.012, 0.06), ['#212121', '#f48fb1'][i % 2], 0.08 + i * 0.025, rodsY + 0.006, 0.02, { ry: 0.3, outline: false });
    part(g, box(0.006, 0.006, 0.22), BLACK, 0.12, rodsY + 0.004, 0.1, { ry: 0.2, outline: false });
    part(g, cyl(0.025, 0.028, 0.12, 12), '#b3e5fc', 0.17, rodsY + 0.06, -0.02);
    part(g, rbox(0.03, 0.04, 0.05, 0.01), BLACK, 0.17, rodsY + 0.14, -0.02);
    for (let i = 0; i < 3; i++) part(g, ring(0.012, 0.003), '#795548', 0.06 + i * 0.02, rodsY + 0.004, 0.13, { rx: Math.PI / 2, outline: false });
    // The tier below: foil sheets and the neck duster; towels at the bottom.
    part(g, box(0.22, 0.03, 0.16), '#cfd8dc', -0.05, tiers[1] + 0.03, -0.03, { outline: false });
    part(g, cyl(0.03, 0.04, 0.06, 12), '#f5f5f5', 0.13, tiers[1] + 0.05, 0.02);
    part(g, cyl(0.012, 0.012, 0.12, 8), BLACK, 0.13, tiers[1] + 0.11, 0.02, { outline: false });
    for (let i = 0; i < 3; i++) part(g, rbox(0.3, 0.05, 0.22, 0.02), [TOWEL, '#f8bbd0', TOWEL][i], 0, tiers[0] + 0.04 + i * 0.05, 0);
    // In use: a rod wound with its paper, out on the top.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, cyl(0.016, 0.016, 0.07, 8), '#42a5f5', -0.06, rodsY + 0.03, 0.12, { rz: Math.PI / 2 });
    part(use, cyl(0.02, 0.02, 0.04, 8), '#ffffff', -0.06, rodsY + 0.03, 0.12, { rz: Math.PI / 2, outline: false });
    out.work = tray;
    out.spots = { '*': at(spot(g, 'stand', 0, 0, 0.5, Math.PI), tray, 'tinker') };
  },

  /**
   * The towel corner: a little front-loading washer at the bottom (its drum turning and its display lit
   * while it's run), on it the hot-towel steamer — rolled white towels in rows behind its glass door,
   * the UV light purple and steam puffing while it's on — and the clean towels folded on the shelf at
   * the side over a basket of used ones.
   */
  hsTowelSteamer(g, _W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.3;
    const zf = z + 0.27;
    // The washer.
    part(g, rbox(0.6, 0.62, 0.54, 0.03), '#f5f5f5', -0.12, 0.31, z);
    part(g, cyl(0.17, 0.17, 0.02, 24), '#cfd8dc', -0.12, 0.3, zf + 0.005, { rx: Math.PI / 2 });
    part(g, ring(0.17, 0.018), '#b0bec5', -0.12, 0.3, zf + 0.012, { outline: false });
    const drum = new THREE.Group();
    drum.position.set(-0.12, 0.3, zf + 0.012);
    g.add(drum);
    part(drum, cyl(0.14, 0.14, 0.004, 20), '#455a64', 0, 0, 0, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 3; i++) part(drum, box(0.08, 0.06, 0.006), [TOWEL, '#f8bbd0', TOWEL][i], Math.cos(i * 2.1) * 0.06, Math.sin(i * 2.1) * 0.06, 0.003, { rz: i * 2.1, outline: false });
    part(g, box(0.5, 0.06, 0.012), '#eceff1', -0.12, 0.56, zf + 0.004, { outline: false });
    out.screen = litScreen(g, painted('hs-washer', 128, 40, paintWasher), 0.12, 0.04, -0.2, 0.56, zf + 0.012);
    // The steamer on top.
    const sy = 0.62;
    part(g, rbox(0.52, 0.42, 0.42, 0.03), '#fafafa', -0.12, sy + 0.21, z - 0.04);
    part(g, rbox(0.46, 0.32, 0.02, 0.01), '#cfd8dc', -0.12, sy + 0.2, z + 0.17);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) part(g, cyl(0.035, 0.035, 0.3, 10), TOWEL, -0.3 + i * 0.09, sy + 0.08 + row * 0.08, z - 0.04, { rx: Math.PI / 2 });
    glass(g, box(0.4, 0.27, 0.006), -0.12, sy + 0.2, z + 0.185);
    part(g, box(0.02, 0.1, 0.02), CHROME, 0.08, sy + 0.2, z + 0.2, { outline: false });
    label(g, '스팀 타월', 0.2, 0.05, -0.12, sy + 0.38, z + 0.186, '#8e6b7d', '#ffffff');
    const door = marker(g, -0.12, sy + 0.2, z + 0.2);
    // The shelf at the side: folded towels over the basket of used ones.
    part(g, rbox(0.26, 0.03, 0.36, 0.01), '#d7ccc8', 0.33, 0.7, z);
    for (let i = 0; i < 4; i++) part(g, rbox(0.22, 0.045, 0.3, 0.02), [TOWEL, '#f8bbd0', TOWEL, '#d1c4e9'][i], 0.33, 0.74 + i * 0.047, z);
    part(g, cyl(0.13, 0.11, 0.32, 16), '#c8a27a', 0.33, 0.16, z + 0.04);
    for (let i = 0; i < 4; i++) part(g, ball(0.06), [TOWEL, '#f8bbd0', '#e1bee7', TOWEL][i], 0.28 + (i % 2) * 0.09, 0.32, z + Math.floor(i / 2) * 0.08, { outline: false });
    // On: the UV light, steam.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    glowing(use, box(0.4, 0.012, 0.012), '#b388ff', -0.12, sy + 0.36, z + 0.16);
    const puffs: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) puffs.push(part(use, ball(0.04), '#ffffff', -0.2 + i * 0.08, sy + 0.46, z, { outline: false }));
    out.animate = (t) => {
      drum.rotation.z = t * 4;
      puffs.forEach((p, i) => {
        const u = (t * 0.5 + i / 3) % 1;
        p.position.y = sy + 0.44 + u * 0.3;
        p.scale.setScalar(0.5 + u);
      });
    };
    out.work = door;
    out.spots = { '*': at(spot(g, 'stand', -0.12, 0, zf + 0.33, Math.PI), door, 'tinker') };
  },

  /**
   * The tea table between the waiting chairs: a little round walnut table with a stack of fashion
   * magazines and one open, a tray with the teapot and cups and a small vase. A cup is poured for
   * whoever's waiting (steam rising from it).
   */
  hsTeaTable(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.52;
    part(g, cyl(0.06, 0.16, 0.03, 18), '#5d4037', 0, 0.015, 0);
    part(g, cyl(0.03, 0.03, top - 0.04, 10), '#5d4037', 0, top / 2, 0, { outline: false });
    part(g, cyl(0.3, 0.3, 0.035, 28), '#8d6e63', 0, top, 0);
    // The magazines.
    const covers: Array<[string, string, string]> = [['VOGUE HAIR', '#ad1457', '#3e2723'], ['헤어 & 뷰티', '#00796b', '#c9a227'], ['STYLE', '#37474f', '#8d6e63']];
    covers.forEach(([s, bg, hair], i) => {
      const m = picture(g, painted(`hs-mag-${i}`, 128, 168, paintMagazine(s, bg, hair)), 0.16, 0.21, -0.12 + i * 0.012, top + 0.022 + i * 0.008, 0.06 - i * 0.01, '#ffffff', 0.25 * i - 0.2, -Math.PI / 2);
      m.rotation.order = 'YXZ';
      part(g, box(0.16, 0.006, 0.21), '#fafafa', -0.12 + i * 0.012, top + 0.018 + i * 0.008, 0.06 - i * 0.01, { ry: 0.25 * i - 0.2, outline: false });
    });
    // The tray, the teapot and the cups.
    part(g, rbox(0.26, 0.015, 0.18, 0.008), '#d7ccc8', 0.12, top + 0.025, -0.08);
    part(g, ball(0.055), '#eceff1', 0.07, top + 0.08, -0.1).scale.set(1, 0.85, 1);
    part(g, cyl(0.012, 0.016, 0.06, 8), '#eceff1', 0.13, top + 0.09, -0.1, { rz: -0.9 });
    part(g, ring(0.03, 0.007), '#eceff1', 0.01, top + 0.09, -0.1, { outline: false });
    part(g, cyl(0.022, 0.022, 0.012, 10), '#eceff1', 0.07, top + 0.13, -0.1);
    for (let i = 0; i < 2; i++) part(g, cyl(0.028, 0.022, 0.05, 12), '#fffaf3', 0.17 + i * 0.06, top + 0.058, -0.04);
    part(g, cyl(0.02, 0.024, 0.08, 10), '#e1f5fe', -0.18, top + 0.058, -0.15);
    part(g, ball(0.025), '#f48fb1', -0.18, top + 0.12, -0.15);
    part(g, ball(0.02), '#fff59d', -0.16, top + 0.13, -0.13);
    const pot = marker(g, 0.1, top + 0.1, -0.08);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, cyl(0.022, 0.022, 0.004, 10), '#a1887f', 0.17, top + 0.082, -0.04, { outline: false });
    const steam: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) steam.push(part(use, ball(0.018), '#ffffff', 0.17, top + 0.12, -0.04, { outline: false }));
    out.animate = (t) => {
      steam.forEach((p, i) => {
        const u = (t * 0.6 + i / 2) % 1;
        p.position.y = top + 0.1 + u * 0.15;
        p.position.x = 0.17 + 0.01 * Math.sin(t * 3 + i);
        p.scale.setScalar(0.6 + u);
      });
    };
    out.work = pot;
    out.spots = { '*': at(spot(g, 'stand', 0.05, 0, 0.5, Math.PI), pot, 'tinker') };
  },
  /**
   * The street front (2026-11-05, the layout audit; shopFront.ts): the glass and the sign, and the 사인볼 by the door, red, white
   * and blue bands turning slowly in its glass drum between chrome caps, on its post on the pavement; the unit next door.
   */
  hsShopFront(g, _W, _D, _c, _def, _ctx, out) {
    shopFront(g, { ax: 1, x0: 2, x1: 17, door: 12, name: '헤어 미란', sub: 'HAIR · CUT · COLOR · PERM', bg: '#4a148c', fg: '#ffffff', awning: '#7b1fa2', frame: '#212121', posters: [['커트 18,000', '#ffffff', '#4a148c', 4.5], ['뿌리 염색', '#f3e5f5', '#6a1b9a', 8.5], ['남성 다운펌', '#ede7f6', '#311b92', 13.5]], solid: [[15, 16]] });
    const px = 13.3 - 1.5;
    const pz = 14 - 15.5 + 0.4;
    part(g, cyl(0.18, 0.2, 0.05, 20), '#37474f', px, 0.025, pz);
    part(g, cyl(0.035, 0.035, 1.0, 10), CHROME, px, 0.52, pz, { outline: false });
    part(g, cyl(0.11, 0.11, 0.06, 16), CHROME, px, 1.95, pz);
    part(g, ball(0.06), CHROME, px, 2.02, pz);
    part(g, cyl(0.11, 0.11, 0.06, 16), CHROME, px, 1.05, pz);
    const drum = new THREE.Group();
    drum.position.set(px, 1.5, pz);
    g.add(drum);
    const colors = ['#d32f2f', '#ffffff', '#1565c0', '#ffffff'];
    for (let i = 0; i < 12; i++) part(drum, cyl(0.085, 0.085, 0.07, 14), colors[i % 4], 0, -0.39 + i * 0.07, 0, { rz: 0.35, outline: false });
    part(g, cyl(0.1, 0.1, 0.84, 16), '', px, 1.5, pz, { material: GLASS_DRUM, outline: false, shadow: false });
    out.animate = (t) => {
      drum.rotation.y = t * 1.6;
    };
  },
  hsNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '엄마손 분식', color: '#e65100', wall: '#f0e2cc' });
  },
};

