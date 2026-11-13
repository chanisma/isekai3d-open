import * as THREE from 'three';
import { marker, rod, shade, spot, tint, type Builder, type Built } from '../parts';
import { box, cyl, gradient, part, rbox, toon } from '../toon';
import { SK, TB, WC, btLive, btNow, btToiletBeat } from './bathMotion';

/*
 * The bathroom, redone (2026-11-01, at the user's request; docs/workplaces/PIPELINE.md, 집 가구).
 * Everyone sits and stands where lot3d.ts always put them. What's new is what's round them, and all of it is told by
 * Built.seated, which hears each frame who's on the piece (and so never runs for someone only cleaning or repairing
 * it): a toilet's lid lifts and shuts and it flushes, a curtain draws across a shower and the water and steam come on,
 * a bath fills, foams and drains. Nobody is shown other than as they were: the curtain, the water and the foam cover.
 */

/** A small round thing, in few triangles: shared by size, never disposed. */
const dots = new Map<number, THREE.SphereGeometry>();
function dot(r: number): THREE.SphereGeometry {
  let g = dots.get(r);
  if (!g) dots.set(r, (g = new THREE.SphereGeometry(r, 8, 6)));
  return g;
}

const OAK = '#b98a5a';
const OAK_DARK = '#8f6841';
const CHROME = '#c3ccd2';
const PORCELAIN = '#fbfaf6';
const TOWEL = '#e8cfa8';
const WATER = '#8fd3ea';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const fract = (x: number) => x - Math.floor(x);

/** A plan's outline with its corners rounded (x across, y its depth). */
function roundRect(w: number, d: number, r: number, into: THREE.Shape | THREE.Path = new THREE.Shape(), cz = 0): THREE.Shape | THREE.Path {
  const R = Math.max(0.001, Math.min(r, w / 2 - 0.001, d / 2 - 0.001));
  const x = w / 2;
  const y = d / 2;
  into.moveTo(-x + R, -y + cz);
  into.lineTo(x - R, -y + cz);
  into.absarc(x - R, -y + R + cz, R, -Math.PI / 2, 0, false);
  into.lineTo(x, y - R + cz);
  into.absarc(x - R, y - R + cz, R, 0, Math.PI / 2, false);
  into.lineTo(-x + R, y + cz);
  into.absarc(-x + R, y - R + cz, R, Math.PI / 2, Math.PI, false);
  into.lineTo(-x, -y + R + cz);
  into.absarc(-x + R, -y + R + cz, R, Math.PI, Math.PI * 1.5, false);
  return into;
}

/** Marks a mesh as owning what it was built with, to be disposed with it. */
function own<T extends THREE.Mesh>(m: T, geometry = true, material = false): T {
  if (geometry) m.userData.ownGeometry = true;
  if (material) m.userData.ownMaterial = true;
  return m;
}

/** A see-through material of a piece's own, so its opacity can change. */
const glassy = (color: string, opacity: number, side: THREE.Side = THREE.FrontSide) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side });

/** Sets up how a piece hears who's on it, with a time step that can't jump. */
function onSeated(out: Built, each: (on: boolean, ids: string[], t: number, dt: number) => void) {
  let last = 0;
  out.seated = (xs, _lying, t, ids) => {
    const dt = Math.min(0.2, Math.max(0, t - last));
    last = t;
    each(xs.length > 0, ids ?? [], t, dt);
  };
}

/** Puffs of steam rising through a box, wide at the top; `amount` 0 hides them. */
class Steam {
  readonly group = new THREE.Group();
  private readonly mat = glassy('#ffffff', 0);
  private readonly puffs: Array<{ m: THREE.Mesh; x: number; z: number; ph: number; sp: number }> = [];
  constructor(parent: THREE.Object3D, n: number, private readonly y0: number, private readonly y1: number, sx: number, sz: number, cx = 0, cz = 0) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(dot(0.1), this.mat);
      m.castShadow = false;
      this.group.add(m);
      this.puffs.push({ m, x: cx + sx * Math.sin(i * 2.4), z: cz + sz * Math.cos(i * 3.7), ph: i / n, sp: 0.16 + 0.05 * (i % 3) });
    }
    this.puffs[0].m.userData.ownMaterial = true;
    this.group.visible = false;
    this.group.name = 'steam';
    parent.add(this.group);
  }
  update(t: number, amount: number) {
    this.group.visible = amount > 0.01;
    if (!this.group.visible) return;
    this.mat.opacity = 0.42 * Math.min(1, amount);
    for (const p of this.puffs) {
      const u = fract(t * p.sp + p.ph);
      p.m.position.set(p.x + 0.04 * Math.sin(t * 0.7 + p.ph * 9), this.y0 + (this.y1 - this.y0) * u, p.z + 0.04 * Math.cos(t * 0.6 + p.ph * 7));
      p.m.scale.setScalar(Math.max(0.001, (0.8 + 2.2 * u) * Math.sin(Math.PI * u)));
    }
  }
}

// -------------------------------------------------------------------------------------------------
// The toilet.

const toilet: Builder = (g, _W, D, c, _def, _ctx, out) => {
  const back = -D / 2;
  const seatCol = c === '#fafafa' || c === '#ffffff' ? '#f1ece2' : c;
  // The pan, wider at the top, on a foot; a darker rim of glaze, water in it.
  part(g, cyl(0.14, 0.15, 0.03, 20), PORCELAIN, 0, 0.015, -0.1).scale.z = 1.25;
  part(g, cyl(0.195, 0.125, 0.4, 24), PORCELAIN, 0, 0.22, -0.03).scale.z = 1.22;
  part(g, cyl(0.2, 0.2, 0.006, 24), '#d9dcd9', 0, 0.423, -0.03, { outline: false }).scale.z = 1.22;
  const pool = part(g, cyl(0.14, 0.14, 0.003, 22), WATER, 0, 0.427, -0.02, { outline: false });
  pool.scale.z = 1.22;
  // What the water does when it's flushed: a swirl going round, down the middle.
  const swirl = new THREE.Group();
  swirl.position.set(0, 0.43, -0.02);
  g.add(swirl);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    part(swirl, box(0.09, 0.002, 0.012), '#d9f2fb', Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07, { ry: -a + 0.7, outline: false });
  }
  swirl.visible = false;
  // The ring, then the lid on its hinge at the back.
  const ring = own(part(g, new THREE.TorusGeometry(0.155, 0.032, 8, 26).rotateX(Math.PI / 2), seatCol, 0, WC.seat - 0.018, -0.02));
  ring.scale.set(1, 0.55, 1.22);
  const hinge = new THREE.Group();
  hinge.name = 'lid';
  hinge.position.set(0, WC.seat + 0.002, -0.235);
  g.add(hinge);
  part(hinge, cyl(0.19, 0.19, 0.022, 26), seatCol, 0, 0.012, 0.215).scale.z = 1.17;
  part(hinge, box(0.14, 0.012, 0.03), shade(seatCol, 0.9), 0, 0.006, 0.01, { outline: false });
  // The cistern, behind, with its lid and its two buttons.
  const cz = back + 0.125;
  part(g, rbox(0.42, 0.42, 0.19, 0.035), PORCELAIN, 0, 0.59, cz);
  part(g, rbox(0.44, 0.03, 0.21, 0.012), PORCELAIN, 0, 0.815, cz);
  part(g, box(0.1, 0.14, 0.08), PORCELAIN, 0, 0.4, cz + 0.11, { outline: false });
  part(g, cyl(0.04, 0.04, 0.006, 16), CHROME, 0, 0.832, cz, { outline: false });
  const button = part(g, cyl(0.026, 0.026, 0.01, 12), '#eef2f4', 0.012, 0.838, cz, { outline: false });
  part(g, cyl(0.012, 0.012, 0.012, 10), '#eef2f4', -0.026, 0.838, cz, { outline: false });
  // On it: a folded hand towel and a little plant, for a home.
  part(g, rbox(0.12, 0.035, 0.1, 0.012), TOWEL, -0.13, 0.848, cz);
  part(g, cyl(0.03, 0.024, 0.05, 10), '#c98a64', 0.14, 0.855, cz);
  for (const [x, z, r] of [[0.14, cz, 0.032], [0.12, cz + 0.015, 0.024], [0.16, cz - 0.012, 0.024]]) part(g, dot(r), '#79a66b', x, 0.895, z, { outline: false });
  // The roll on a stand beside it, on the sitter's right: a spare on the foot of it.
  const [rx, ry, rz] = WC.roll;
  part(g, cyl(0.075, 0.09, 0.02, 14), OAK_DARK, rx - 0.03, 0.01, rz);
  part(g, cyl(0.011, 0.011, ry + 0.02, 8), OAK, rx - 0.075, (ry + 0.02) / 2, rz, { outline: false });
  part(g, cyl(0.009, 0.009, 0.15, 8), CHROME, rx, ry, rz, { rz: Math.PI / 2, outline: false });
  const roll = new THREE.Group();
  roll.name = 'roll';
  roll.position.set(rx + 0.02, ry, rz);
  g.add(roll);
  part(roll, cyl(0.052, 0.052, 0.1, 14), '#fbf8f0', 0, 0, 0, { rz: Math.PI / 2 });
  part(roll, box(0.102, 0.006, 0.006), '#d7d1c3', 0, 0.05, 0, { outline: false });
  // The sheet hanging off the front: longer as it's drawn; the origin at its top.
  const tail = new THREE.Group();
  tail.position.set(rx + 0.02, ry, rz + 0.054);
  g.add(tail);
  part(tail, box(0.098, 1, 0.002), '#fbf8f0', 0, -0.5, 0, { outline: false });
  tail.scale.y = 0.05;
  part(g, cyl(0.05, 0.05, 0.1, 14), '#fbf8f0', rx - 0.015, 0.075, rz, { outline: true });
  // A brush in its pot on the other side.
  part(g, cyl(0.05, 0.04, 0.13, 14), '#e9e3d6', 0.34, 0.065, 0.05);
  part(g, cyl(0.009, 0.009, 0.34, 8), CHROME, 0.34, 0.26, 0.05, { rz: -0.06, outline: false });
  part(g, cyl(0.016, 0.016, 0.05, 8), OAK, 0.33, 0.45, 0.05, { rz: -0.06, outline: false });

  out.seat = marker(g, 0, WC.seat, WC.seatZ);
  out.work = marker(g, 0, 0.5, 0.1);
  out.seatMotion = { use: 'btToilet' };

  let open = 0;
  let flush = -1;
  let was = false;
  onSeated(out, (on, _ids, t, dt) => {
    open = THREE.MathUtils.damp(open, on ? 1 : 0, 5, dt);
    if (Math.abs(open - (on ? 1 : 0)) < 0.002) open = on ? 1 : 0;
    hinge.rotation.x = -1.68 * open;
    // Got up: the water goes round for a couple of seconds and the button comes back up.
    if (was && !on) flush = 0;
    was = on;
    if (flush >= 0) flush += dt;
    if (flush > 2.4) flush = -1;
    const flushing = flush >= 0;
    swirl.visible = flushing;
    if (flushing) {
      swirl.rotation.y = -t * 7;
      swirl.scale.setScalar(Math.max(0.2, 1 - flush / 2.4));
    }
    pool.position.y = 0.427 - (flushing ? 0.01 * Math.sin((Math.PI * flush) / 2.4) : 0);
    button.position.y = 0.838 - (flushing && flush < 0.4 ? 0.004 : 0);
    if (on) {
      const b = btToiletBeat(t);
      tail.scale.y = 0.05 + 0.3 * b.drawn;
      roll.rotation.x = 6 * b.drawn;
    } else tail.scale.y = 0.05;
  });
};

// -------------------------------------------------------------------------------------------------
// A toddler's potty chair.

const pottyChair: Builder = (g, _W, _D, c, _def, _ctx, out) => {
  const seatY = 0.27;
  const pale = tint(c, 0.45);
  // A broad plastic body on a wide foot that can't tip, the white pot let into it.
  part(g, cyl(0.2, 0.22, 0.03, 22), shade(c, 0.85), 0, 0.015, -0.02).scale.z = 1.1;
  part(g, cyl(0.17, 0.19, 0.2, 22), c, 0, 0.13, -0.02).scale.z = 1.08;
  const ring = own(part(g, new THREE.TorusGeometry(0.115, 0.032, 8, 22).rotateX(Math.PI / 2), pale, 0, seatY - 0.03, -0.02));
  ring.scale.z = 1.05;
  part(g, cyl(0.1, 0.1, 0.012, 18), PORCELAIN, 0, seatY - 0.04, -0.02, { outline: false });
  // A low guard at the front, side grips to hold, and a back with a duck on it.
  part(g, rbox(0.11, 0.07, 0.03, 0.014), pale, 0, seatY + 0.005, 0.135);
  for (const s of [-1, 1]) {
    part(g, cyl(0.016, 0.016, 0.12, 8), shade(c, 0.85), s * 0.19, 0.27, -0.04, { outline: false });
    part(g, rbox(0.04, 0.03, 0.16, 0.014), pale, s * 0.19, 0.335, -0.02);
  }
  part(g, rbox(0.3, 0.3, 0.05, 0.05), c, 0, 0.4, -0.2, { rx: -0.08 });
  const duck = new THREE.Group();
  duck.name = 'duck';
  duck.position.set(0, 0.55, -0.205);
  g.add(duck);
  part(duck, dot(0.075), '#ffd54f', 0, 0, 0);
  part(duck, rbox(0.06, 0.02, 0.05, 0.008), '#ff9f43', 0, -0.012, 0.075);
  for (const s of [-1, 1]) part(duck, dot(0.012), '#3b2b2b', s * 0.03, 0.022, 0.066, { outline: false });
  // A sticker or two on the body, a little soft book left by it.
  for (const [a, col] of [[0.5, '#ffd54f'], [-0.6, '#ef9a9a'], [1.3, '#a5d6a7']] as Array<[number, string]>) {
    part(g, dot(0.022), col, Math.sin(a) * 0.178, 0.13, -0.02 + Math.cos(a) * 0.19, { outline: false });
  }
  part(g, rbox(0.15, 0.03, 0.12, 0.01), '#f6c9a8', 0.3, 0.015, 0.2, { ry: 0.5 });
  part(g, box(0.1, 0.004, 0.08), '#fff3df', 0.3, 0.032, 0.2, { ry: 0.5, outline: false });

  out.seat = marker(g, 0, seatY, -0.02);
  out.seatMotion = { usePotty: 'btPotty' };
  onSeated(out, (on, _ids, t) => {
    // The duck nods along while someone's on it.
    duck.rotation.z = on ? 0.12 * Math.sin(t * 2.2) : 0;
    duck.rotation.x = on ? 0.05 * Math.sin(t * 3.1) : 0;
  });
};

// -------------------------------------------------------------------------------------------------
// The basin, with its mirror.

const sink: Builder = (g, _W, D, c, _def, _ctx, out) => {
  const back = -D / 2;
  // A pedestal and an oval bowl that's really hollow.
  part(g, cyl(0.06, 0.1, 0.74, 16), PORCELAIN, 0, 0.37, -0.1);
  const bowlPts = [[0.07, -0.15], [0.2, -0.125], [0.27, -0.05], [0.285, -0.005], [0.27, 0.012], [0.25, -0.012], [0.19, -0.075], [0.07, -0.1], [0, -0.102]].map(([x, y]) => new THREE.Vector2(x, y));
  const cz = -0.06;
  const bowl = own(part(g, new THREE.LatheGeometry(bowlPts, 24), PORCELAIN, 0, 0.87, cz, { material: new THREE.MeshToonMaterial({ color: PORCELAIN, gradientMap: gradient, side: THREE.DoubleSide }) }), true, true);
  bowl.scale.z = 0.82;
  part(g, cyl(0.022, 0.022, 0.004, 12), CHROME, 0, 0.77, cz, { outline: false });
  const pooled = part(g, cyl(0.1, 0.1, 0.004, 18), WATER, 0, 0.785, cz, { outline: false });
  pooled.scale.z = 0.82;
  pooled.visible = false;
  // A shelf of it at the back for the tap and the soap.
  part(g, rbox(0.56, 0.05, 0.13, 0.02), PORCELAIN, 0, 0.865, back + 0.17);
  // The tap: a pillar, a swan neck over the bowl, the lever on top.
  const [, ly, lz] = SK.lever;
  part(g, cyl(0.022, 0.026, 0.14, 10), CHROME, 0, 0.955, lz);
  rod(g, v(0, 1.02, lz), v(0, 1.03, SK.under[2] - 0.08), 0.013, CHROME);
  rod(g, v(0, 1.03, SK.under[2] - 0.08), v(0, 0.99, SK.under[2]), 0.013, CHROME);
  const lever = new THREE.Group();
  lever.name = 'lever';
  lever.position.set(0, ly - 0.02, lz);
  g.add(lever);
  part(lever, cyl(0.009, 0.009, 0.09, 8), CHROME, 0, 0.012, 0.045, { rx: Math.PI / 2 - 0.15, outline: false });
  part(lever, dot(0.016), '#f4f6f7', 0, 0.018, 0.09, { outline: false });
  const stream = own(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.2, 8), glassy('#bde8f6', 0.8)), true, true);
  stream.position.set(0, 0.885, SK.under[2]);
  stream.visible = false;
  g.add(stream);
  // The soap in its dish, by the tap.
  part(g, cyl(0.05, 0.04, 0.012, 12), '#dbe7ea', -0.19, 0.896, back + 0.17);
  part(g, rbox(0.075, 0.022, 0.05, 0.01), '#f6d9a6', -0.19, 0.912, back + 0.17);
  // The panel behind: tile to the shelf, warm wood above, holding it all up against no wall as well as one. Only the low part
  // stays when the sink's back is to the camera: 1.9 m of wood there would hide whoever's washing (out.seenFrom, below).
  part(g, rbox(0.66, 0.29, 0.03, 0.01), OAK, 0, 0.97, back + 0.04);
  const upper = new THREE.Group();
  upper.name = 'sinkUpper';
  g.add(upper);
  part(upper, rbox(0.66, 0.79, 0.03, 0.01), OAK, 0, 1.5, back + 0.04);
  part(g, box(0.64, 0.2, 0.006), tint(c, 0.3), 0, 0.98, back + 0.058, { outline: false });
  for (let i = -3; i <= 3; i++) part(g, box(0.004, 0.2, 0.002), '#f2f2ec', i * 0.09, 0.98, back + 0.062, { outline: false });
  // A glass shelf with the cup of toothbrushes and a tube of toothpaste.
  part(upper, box(0.5, 0.012, 0.1), '#dcebef', 0, 1.13, back + 0.095);
  for (const s of [-1, 1]) part(upper, box(0.014, 0.03, 0.08), CHROME, s * 0.22, 1.115, back + 0.095, { outline: false });
  part(upper, cyl(0.036, 0.03, 0.095, 12), tint(c, 0.15), 0.17, 1.185, back + 0.095);
  for (const [x, col, rz, rx] of [[0.155, '#ef8a80', 0.2, 0.12], [0.185, '#7ec4e0', -0.22, -0.1]] as Array<[number, string, number, number]>) {
    part(upper, cyl(0.006, 0.006, 0.17, 6), col, x, 1.25, back + 0.095, { rz, rx, outline: false });
    part(upper, rbox(0.012, 0.03, 0.014, 0.004), '#fafafa', x - rz * 0.08, 1.335, back + 0.095 + rx * 0.08, { outline: false });
  }
  part(upper, rbox(0.14, 0.03, 0.035, 0.012), '#f5f5f0', -0.15, 1.153, back + 0.1, { ry: 0.12 });
  part(upper, cyl(0.012, 0.012, 0.02, 8), '#e57373', -0.228, 1.153, back + 0.09, { rz: Math.PI / 2, outline: false });
  // The mirror, framed: a lit strip above it, a shine across it.
  part(upper, rbox(0.56, 0.5, 0.025, 0.02), OAK_DARK, 0, 1.53, back + 0.06);
  part(upper, box(0.5, 0.44, 0.004), '#cfe6ee', 0, 1.53, back + 0.075, { outline: false });
  for (const [x, w] of [[-0.1, 0.05], [-0.02, 0.018]]) part(upper, box(w, 0.5, 0.002), '#ecf7fb', x, 1.53, back + 0.0785, { rz: -0.5, outline: false }).scale.y = 0.72;
  const bulb = new THREE.Mesh(rbox(0.42, 0.035, 0.03, 0.012), new THREE.MeshBasicMaterial({ color: '#e7dcc3' }));
  bulb.userData.ownMaterial = true;
  bulb.position.set(0, 1.84, back + 0.065);
  upper.add(bulb);
  const front = new THREE.Vector3();
  const here = new THREE.Vector3();
  out.seenFrom = (camera) => {
    g.getWorldDirection(front);
    g.getWorldPosition(here);
    // Well round behind it, not just past square on: a side view keeps its mirror.
    upper.visible = front.dot(here.subVectors(camera, here).setY(0).normalize()) > -0.25;
  };
  // A towel on a ring at the side.
  part(g, cyl(0.009, 0.009, 0.1, 6), CHROME, 0.37, 1.1, back + 0.09, { rx: Math.PI / 2, outline: false });
  const towelRing = own(part(g, new THREE.TorusGeometry(0.07, 0.008, 6, 18), CHROME, 0.37, 1.04, back + 0.135, { outline: false }));
  towelRing.rotation.y = 0.1;
  part(g, rbox(0.11, 0.34, 0.03, 0.012), TOWEL, 0.37, 0.87, back + 0.135);

  out.work = marker(g, 0, 0.9, -0.02);
  const s = spot(g, 'stand', 0, 0, SK.st, Math.PI);
  s.motion = 'btWash';
  out.spots = { wash: s };
  // Runs each frame whoever's there; only a wash lights this, not a cleaner or a plumber at it.
  out.away = (_a, t) => {
    const u = btLive('btWash', s, t);
    const n = u === null ? null : btNow('btWash', u, 1.6, t);
    lever.rotation.x = n ? -0.45 * n.lever : 0;
    stream.visible = pooled.visible = !!n?.water;
    if (n?.water) stream.scale.x = stream.scale.z = 1 + 0.12 * Math.sin(t * 23);
    (bulb.material as THREE.MeshBasicMaterial).color.set(n ? '#fff3cf' : '#e7dcc3');
  };
};

// -------------------------------------------------------------------------------------------------
// The shower.

const SHOWER_STEAM: Record<string, number> = { shower: 0.6, showerSteamy: 1, showerThoughtful: 0.55, showerBrisk: 0.3, showerCold: 0 };

/** A curtain on a rod across the front: folds in a sheet, a hem and bands, drawn out from the left (seen from the front). */
function curtain(g: THREE.Object3D, width: number, top: number, bottom: number, z: number, color: string) {
  const seg = 28;
  const geom = new THREE.PlaneGeometry(1, top - bottom, seg, 3);
  geom.translate(0.5, (top + bottom) / 2, 0);
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const main = new THREE.Color(tint(color, 0.5));
  const band = new THREE.Color(color);
  const hem = new THREE.Color(shade(color, 0.72));
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const n = Math.round(pos.getX(i) * seg);
    pos.setZ(i, n % 2 ? 0.024 : -0.024);
    const low = pos.getY(i) < bottom + 0.01;
    col.copy(low ? hem : n % 8 < 2 ? band : main);
    colors.set([col.r, col.g, col.b], i * 3);
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  const mat = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: gradient, side: THREE.DoubleSide });
  const cloth = own(new THREE.Mesh(geom, mat), true, true);
  cloth.castShadow = true;
  cloth.position.set(-width / 2, 0, z);
  g.add(cloth);
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) rings.push(part(g, dot(0.016), CHROME, 0, top + 0.01, z, { outline: false }));
  return (open: number) => {
    const w = THREE.MathUtils.lerp(width, 0.13, open);
    cloth.scale.x = w;
    rings.forEach((r, i) => (r.position.x = -width / 2 + (w * i) / (rings.length - 1)));
  };
}

const shower: Builder = (g, W, D, c, _def, _ctx, out) => {
  const back = -D / 2;
  const tile = tint(c, 0.62);
  const grout = tint(c, 0.85);
  // The tray: a raised lip, a dished floor and a drain.
  part(g, rbox(W - 0.04, 0.08, D - 0.04, 0.03), PORCELAIN, 0, 0.04, 0);
  part(g, box(W - 0.14, 0.004, D - 0.14), '#dfe9ee', 0, 0.082, 0, { outline: false });
  part(g, cyl(0.05, 0.05, 0.005, 16), CHROME, 0, 0.085, 0, { outline: false });
  // A tiled back and right wall.
  part(g, box(W - 0.04, 2.05, 0.04), tile, 0, 1.08, back + 0.04);
  part(g, box(0.04, 2.05, D - 0.08), tile, W / 2 - 0.04, 1.08, 0);
  for (let i = 1; i <= 7; i++) {
    const y = 0.08 + i * 0.25;
    part(g, box(W - 0.05, 0.006, 0.002), grout, 0, y, back + 0.061, { outline: false });
    part(g, box(0.002, 0.006, D - 0.09), grout, W / 2 - 0.061, y, 0, { outline: false });
  }
  for (let i = -1; i <= 1; i++) part(g, box(0.006, 2.0, 0.002), grout, i * 0.25, 1.08, back + 0.061, { outline: false });
  // A frosted glass side, in its frame.
  const glass = new THREE.Mesh(box(0.012, 1.9, D - 0.14), new THREE.MeshToonMaterial({ color: '#dff2f7', gradientMap: gradient, transparent: true, opacity: 0.6, depthWrite: false }));
  glass.userData.ownMaterial = true;
  glass.position.set(-W / 2 + 0.04, 1.04, 0);
  g.add(glass);
  part(g, box(0.03, 2.0, 0.03), CHROME, -W / 2 + 0.04, 1.08, D / 2 - 0.05, { outline: false });
  part(g, box(0.03, 0.03, D - 0.08), CHROME, -W / 2 + 0.04, 2.02, 0, { outline: false });
  // The curtain's rod, across the front.
  const rodZ = D / 2 - 0.05;
  part(g, cyl(0.012, 0.012, W - 0.06, 10), CHROME, 0, 2.03, rodZ, { rz: Math.PI / 2, outline: false });
  const draw = curtain(g, W - 0.1, 2.02, 0.2, rodZ, c);
  draw(1);
  // A rain head on an arm, a hand shower on its rail with a hose, the mixer's dial.
  const headZ = -0.12;
  rod(g, v(0, 2.1, back + 0.06), v(0, 2.12, headZ), 0.012, CHROME);
  part(g, cyl(0.012, 0.012, 0.05, 8), CHROME, 0, 2.1, headZ, { outline: false });
  part(g, cyl(0.1, 0.11, 0.022, 20), CHROME, 0, 2.07, headZ);
  part(g, cyl(0.085, 0.085, 0.003, 20), '#6f7b82', 0, 2.057, headZ, { outline: false });
  part(g, cyl(0.009, 0.009, 0.75, 6), CHROME, -0.27, 1.25, back + 0.08, { outline: false });
  rod(g, v(-0.27, 1.5, back + 0.095), v(-0.27, 1.56, back + 0.17), 0.012, CHROME);
  part(g, cyl(0.03, 0.022, 0.018, 12), CHROME, -0.27, 1.56, back + 0.18, { rx: -0.6, outline: false });
  rod(g, v(-0.27, 1.48, back + 0.1), v(-0.24, 1.05, back + 0.08), 0.005, '#8d979d');
  part(g, cyl(0.055, 0.055, 0.012, 16), CHROME, 0.02, 1.12, back + 0.066, { rx: Math.PI / 2, outline: false });
  const dial = new THREE.Group();
  dial.position.set(0.02, 1.12, back + 0.078);
  g.add(dial);
  part(dial, rbox(0.022, 0.08, 0.02, 0.006), '#eef2f4', 0, 0.015, 0, { outline: false });
  // A corner shelf of bottles and soap, a loofah on a hook, a towel on a rail outside it.
  part(g, rbox(0.22, 0.014, 0.16, 0.006), '#dcebef', W / 2 - 0.17, 1.2, back + 0.14);
  for (const [i, col] of ['#e0a96d', '#7fb7a6', '#f2e3c6'].entries()) {
    part(g, cyl(0.022, 0.026, 0.13, 10), col, W / 2 - 0.25 + i * 0.065, 1.272, back + 0.12 + (i % 2) * 0.04);
    part(g, cyl(0.009, 0.009, 0.022, 6), '#fafafa', W / 2 - 0.25 + i * 0.065, 1.348, back + 0.12 + (i % 2) * 0.04, { outline: false });
  }
  part(g, dot(0.045), '#f2c6a0', W / 2 - 0.1, 0.92, 0.1);
  rod(g, v(W / 2 - 0.1, 0.96, 0.1), v(W / 2 - 0.06, 1.1, 0.1), 0.004, '#cfb79b');
  for (const z of [-0.2, 0.25]) part(g, cyl(0.007, 0.007, 0.06, 6), CHROME, -W / 2 + 0.005, 1.5, z, { rz: Math.PI / 2, outline: false });
  part(g, cyl(0.008, 0.008, 0.6, 6), CHROME, -W / 2 - 0.022, 1.5, 0.02, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.018, 0.56, 0.3, 0.008), TOWEL, -W / 2 - 0.024, 1.23, 0.02);

  // The water: streaks falling from the head, splashes on the tray.
  const water = new THREE.Group();
  water.name = 'water';
  water.visible = false;
  g.add(water);
  const waterMat = glassy('#c6edf9', 0.65);
  const streaks = Array.from({ length: 16 }, (_, i) => {
    const m = new THREE.Mesh(box(0.006, 0.24, 0.006), waterMat);
    m.castShadow = false;
    water.add(m);
    return { m, a: i * 2.4, r: 0.015 + (i % 4) * 0.022, ph: (i * 0.37) % 1 };
  });
  streaks[0].m.userData.ownMaterial = true;
  const splash = new THREE.Group();
  water.add(splash);
  const drops = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(dot(0.012), waterMat);
    m.castShadow = false;
    splash.add(m);
    return { m, a: (i * Math.PI) / 3 };
  });
  const steam = new Steam(g, 12, 0.5, 2.5, 0.28, 0.26);
  out.work = marker(g, 0, 0.95, D / 2 - 0.12);
  out.seatMotion = { shower: 'btShower', showerSteamy: 'btShowerHot', showerThoughtful: 'btShowerThink', showerBrisk: 'btShowerBrisk', showerCold: 'btShowerCold' };

  let open = 1;
  let run = 0;
  let hot = 0;
  let want = 0;
  const cold = new THREE.Color('#a9dcf6');
  const warm = new THREE.Color('#d0effa');
  onSeated(out, (on, ids, t, dt) => {
    if (ids.length) want = SHOWER_STEAM[ids[0]] ?? 0.6;
    open = THREE.MathUtils.damp(open, on ? 0 : 1, 3.5, dt);
    draw(open);
    // The water comes on once it's nearly drawn, and off before it opens; steam builds and clears slowly.
    run = THREE.MathUtils.damp(run, on && open < 0.25 ? 1 : 0, 6, dt);
    hot = THREE.MathUtils.damp(hot, on ? want : 0, on ? 0.7 : 0.45, dt);
    dial.rotation.z = -1.3 * run;
    water.visible = run > 0.04;
    if (water.visible) {
      waterMat.opacity = 0.65 * run;
      waterMat.color.copy(want === 0 ? cold : warm);
      for (const st of streaks) {
        const u = fract(t * 2.1 + st.ph);
        const r = st.r * (1 + 2.4 * u);
        st.m.position.set(Math.cos(st.a) * r, 2.04 - 1.92 * u, -0.12 + Math.sin(st.a) * r);
      }
      for (const d of drops) {
        const u = fract(t * 3 + d.a);
        d.m.position.set(Math.cos(d.a) * 0.12 * (1 + u), 0.09 + 0.12 * Math.sin(Math.PI * u), -0.12 + Math.sin(d.a) * 0.12 * (1 + u));
      }
    }
    steam.update(t, hot);
    (glass.material as THREE.MeshToonMaterial).opacity = 0.6 + 0.3 * Math.min(1, hot);
  });
};

// -------------------------------------------------------------------------------------------------
// The bath.

const bathtub: Builder = (g, W, D, c, _def, _ctx, out) => {
  const w = W - 0.08;
  const d = D - 0.08;
  const rimT = 0.1;
  const iw = w - 2 * rimT;
  const id = d - 2 * rimT;
  // A long rounded tub with a real hollow, its sides extruded up from the plan.
  const plan = roundRect(w, d, 0.16) as THREE.Shape;
  plan.holes.push(roundRect(iw, id, 0.13, new THREE.Path()) as THREE.Path);
  const shell = new THREE.ExtrudeGeometry(plan, { depth: TB.rim - 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2, curveSegments: 8 });
  shell.rotateX(-Math.PI / 2);
  own(part(g, shell, PORCELAIN, 0, 0.012, 0));
  own(part(g, new THREE.ExtrudeGeometry(roundRect(iw + 0.02, id + 0.02, 0.14) as THREE.Shape, { depth: TB.empty, bevelEnabled: false, curveSegments: 8 }).rotateX(-Math.PI / 2), '#e8eff3', 0, 0, 0, { outline: false }));
  // A warm wooden skirt along its base.
  for (const s of [-1, 1]) part(g, box(0.012, 0.05, d - 0.2), OAK, s * (w / 2 + 0.004), 0.05, 0, { outline: false });
  // The water, which rises and falls; moved in one piece, so it's a single sheet.
  const waterGeom = new THREE.ShapeGeometry(roundRect(iw - 0.01, id - 0.01, 0.12) as THREE.Shape, 8).rotateX(-Math.PI / 2);
  const water = own(new THREE.Mesh(waterGeom, new THREE.MeshToonMaterial({ color: WATER, gradientMap: gradient, transparent: true, opacity: 0.92 })), true, true);
  water.name = 'water';
  water.position.y = TB.empty;
  water.visible = false;
  g.add(water);
  // Foam: flat suds over the top of the water, and a heap in front of the bather, for the two sorts of bath.
  const foam = new THREE.Group();
  foam.name = 'foam';
  foam.visible = false;
  g.add(foam);
  const foamMat = toon('#fdfcfa');
  const puffs: Array<{ m: THREE.Mesh; base: THREE.Vector3; r: number; heap: number; ph: number }> = [];
  const put = (x: number, z: number, y: number, r: number, heap: number, i: number) => {
    const m = new THREE.Mesh(dot(r), foamMat);
    foam.add(m);
    puffs.push({ m, base: v(x, y, z), r, heap, ph: i * 1.3 });
  };
  // Over the water, about evenly, leaving nothing bare.
  for (let i = 0; i < 26; i++) put(((i * 0.618) % 1) * (iw - 0.2) - (iw - 0.2) / 2, -id / 2 + 0.1 + (i / 25) * (id - 0.2), 0.015, 0.075 + (i % 3) * 0.015, 0, i);
  // Round the sitter's middle and over the lap, up to about the chest in a bubble bath.
  const seatZ = -D / 2 + 0.42;
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4;
    const z = seatZ + 0.12 + (i % 6) * 0.1;
    put(Math.cos(a) * (0.1 + (i % 3) * 0.08), z, 0.06 + (i % 4) * 0.045, 0.1 + (i % 2) * 0.025, 1, i + 30);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) put(s * 0.2, seatZ - 0.04 + i * 0.09, 0.05 + i * 0.05, 0.11, 1, i + 60);
  // Bubbles going up from it.
  const bubbleMat = glassy('#eaf7ff', 0.55);
  const bubbles = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Mesh(dot(0.018 + (i % 3) * 0.008), bubbleMat);
    m.castShadow = false;
    g.add(m);
    m.visible = false;
    return { m, x: Math.sin(i * 2.1) * 0.26, z: -0.4 + i * 0.16, ph: i / 8 };
  });
  bubbles[0].m.userData.ownMaterial = true;
  // A rubber duck, floating.
  const duck = new THREE.Group();
  duck.name = 'duck';
  duck.visible = false;
  g.add(duck);
  part(duck, dot(0.04), '#ffd54f', 0, 0.022, 0);
  part(duck, dot(0.027), '#ffd54f', 0, 0.07, 0.022);
  part(duck, box(0.022, 0.008, 0.02), '#ff9f43', 0, 0.066, 0.052, { outline: false });
  // The taps at the foot, a spout over the water, the plug on its chain.
  const fz = d / 2 - rimT / 2;
  rod(g, v(0, TB.rim, fz), v(0, TB.rim + 0.12, fz), 0.018, CHROME);
  rod(g, v(0, TB.rim + 0.12, fz), v(0, TB.rim + 0.1, fz - 0.16), 0.016, CHROME);
  const handles = [-1, 1].map((s) => {
    part(g, cyl(0.016, 0.018, 0.04, 10), CHROME, s * 0.13, TB.rim + 0.02, fz, { outline: false });
    const h = new THREE.Group();
    h.position.set(s * 0.13, TB.rim + 0.05, fz);
    g.add(h);
    part(h, box(0.07, 0.012, 0.014), CHROME, 0, 0, 0, { outline: false });
    part(h, cyl(0.012, 0.012, 0.006, 10), s < 0 ? '#ef5350' : '#42a5f5', 0, 0.01, 0, { outline: false });
    return h;
  });
  const fill = own(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 1, 8), glassy('#c6edf9', 0.75)), true, true);
  fill.position.set(0, 0, fz - 0.16);
  fill.visible = false;
  g.add(fill);
  part(g, cyl(0.03, 0.03, 0.012, 12), '#58636a', 0.12, TB.empty + 0.006, fz - 0.14, { outline: false });
  // A head cushion, a towel over the side, soap and two bottles on the rim at the head end.
  part(g, rbox(0.34, 0.08, 0.13, 0.04), '#ffffff', 0, TB.rim + 0.03, -d / 2 + rimT / 2 + 0.03, { rx: -0.3 });
  part(g, rbox(0.03, 0.34, 0.32, 0.012), tint(c, 0.15), w / 2 + 0.015, TB.rim - 0.14, 0.2);
  part(g, rbox(0.1, 0.02, 0.32, 0.01), tint(c, 0.15), w / 2 - 0.035, TB.rim + 0.016, 0.2);
  for (const [s, col, h] of [[1, '#e0a96d', 0.14], [-1, '#7fb7a6', 0.11]] as Array<[number, string, number]>) {
    part(g, cyl(0.026, 0.03, h, 10), col, s * TB.rimX, TB.rim + h / 2, -d / 2 + 0.07);
    part(g, cyl(0.01, 0.01, 0.022, 6), '#fafafa', s * TB.rimX, TB.rim + h + 0.01, -d / 2 + 0.07, { outline: false });
  }
  part(g, rbox(0.075, 0.025, 0.05, 0.01), '#f6d9a6', -TB.rimX, TB.rim + 0.013, d / 2 - 0.25, { ry: 1.4 });
  const steam = new Steam(g, 10, TB.rim, 1.55, 0.26, 0.6);

  out.work = marker(g, 0, TB.rim, d / 2 - 0.1);
  out.seatMotion = { takeBath: 'btBath', bubbleBath: 'btBubbles' };

  let level = TB.empty;
  let suds = 0;
  let heap = 0;
  let want = { suds: 0.6, heap: 0.45 };
  let bubbly = false;
  let puffing = 0;
  onSeated(out, (on, ids, t, dt) => {
    if (ids.length) {
      bubbly = ids[0] === 'bubbleBath';
      want = bubbly ? { suds: 1, heap: 1 } : { suds: 0.7, heap: 0.5 };
    }
    // Filling takes about three seconds, draining a bit more once they're out.
    const rate = on ? 0.15 : 0.1;
    const target = on ? TB.full : TB.empty;
    level += THREE.MathUtils.clamp(target - level, -rate * dt, rate * dt);
    // The foam comes up with the water and goes before it.
    const full = (level - TB.empty) / (TB.full - TB.empty);
    suds = THREE.MathUtils.damp(suds, on ? want.suds * Math.min(1, full * 1.6) : 0, 1.4, dt);
    heap = THREE.MathUtils.damp(heap, on ? want.heap * Math.min(1, full * 1.4) : 0, 1.2, dt);
    puffing = THREE.MathUtils.damp(puffing, on ? 1 : 0, 0.8, dt);
    const filling = on && level < TB.full - 0.002;
    water.position.y = level;
    water.visible = level > TB.empty + 0.002;
    foam.visible = suds > 0.02 || heap > 0.02;
    if (foam.visible) {
      for (const p of puffs) {
        const k = p.heap ? heap : suds;
        const wobble = 1 + 0.04 * Math.sin(t * 1.3 + p.ph);
        p.m.scale.setScalar(Math.max(0.001, k * wobble));
        p.m.position.set(p.base.x, level + p.base.y * Math.max(0, k), p.base.z);
      }
    }
    // The duck rides whichever's on top, at the foot end.
    duck.visible = water.visible;
    duck.position.set(0.14, level + 0.002 + 0.006 * Math.sin(t * 1.5) + 0.05 * suds, 0.56 + 0.02 * Math.sin(t * 0.4));
    duck.rotation.y = 0.5 + 0.3 * Math.sin(t * 0.3);
    fill.visible = filling;
    if (filling) {
      const top = TB.rim + 0.09;
      fill.scale.y = Math.max(0.01, top - level);
      fill.position.y = (top + level) / 2;
    }
    for (const h of handles) h.rotation.y = filling ? 0.9 : 0;
    steam.update(t, puffing * (bubbly ? 0.6 : 0.8));
    for (const b of bubbles) {
      b.m.visible = on && bubbly && heap > 0.5;
      if (b.m.visible) {
        const u = fract(t * 0.22 + b.ph);
        b.m.position.set(b.x + 0.03 * Math.sin(t * 2 + b.ph * 7), level + 0.15 + 0.85 * u, b.z);
      }
    }
  });
};

export const BUILDERS: Record<string, Builder> = { toilet, pottyChair, sink, shower, bathtub };
