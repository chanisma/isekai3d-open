import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { legs, marker, rod, shade, spot, tint, type Builder, type Built, type Spot } from '../parts';
import { box, cyl, gradient, part, rbox, toon } from '../toon';
import { CR, FP, rsLive, rsNow, type RsMotion, type V } from './restMotion';

/*
 * The bedroom and the living room, redone (2026-11-01, at the user's request; docs/workplaces/PIPELINE.md, 집 가구).
 * Everyone lies and sits where lot3d.ts says, at the old heights (SEATS, kept equal to furniture3d.ts's by rest.test.ts): what's new is what they lie and sit
 * on. A bed's covers go over them and its pillow takes their head; a cushion gives under whoever's on it
 * (Built.seated); a fire is flames on logs, lit by hand; a baby is lifted out of its bassinet (Built.babyAt).
 */

/** A small round thing, in few triangles (a home has many of these): shared by size, like the rest. */
const dots = new Map<number, THREE.SphereGeometry>();
function dot(r: number): THREE.SphereGeometry {
  let g = dots.get(r);
  if (!g) dots.set(r, (g = new THREE.SphereGeometry(r, 8, 6)));
  return g;
}

const PINE = '#c99c68';
const PINE_DARK = '#a97d4c';
const WALNUT = '#6b4630';
const BRASS = '#c9a24b';
const LINEN = '#f3ecdf';

/** How high dwellers sit and lie on these (furniture3d.ts SEAT_Y and an armchair's and a dining chair's own; not imported, that would be a cycle). */
export const SEATS = { bed: 0.49, toddlerBed: 0.3, sofa: 0.42, armchair: 0.45, chair: 0.46 };

// -------------------------------------------------------------------------------------------------
// Soft things: pillows and cushions that keep a dent.

interface Press {
  x: number;
  z: number;
  depth: number;
  r: number;
}

/** A plump box, pressed in from its top (its +y) wherever someone's on it. */
class Soft {
  readonly mesh: THREE.Mesh;
  private base: Float32Array;
  private key = '';
  constructor(parent: THREE.Object3D, readonly w: number, readonly h: number, readonly d: number, color: string, x: number, y: number, z: number, o: { thin?: number; rx?: number; ry?: number; rz?: number; step?: number } = {}) {
    const step = o.step ?? 0.07;
    const n = (v: number) => Math.max(2, Math.min(12, Math.round(v / step)));
    const raw = new THREE.BoxGeometry(w, h, d, n(w), 2, n(d));
    raw.deleteAttribute('uv');
    raw.deleteAttribute('normal');
    const geom = mergeVertices(raw, 1e-4);
    raw.dispose();
    const pos = geom.attributes.position;
    const thin = o.thin ?? 0.35;
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i) / (w / 2);
      const ny = pos.getY(i) / (h / 2);
      const nz = pos.getZ(i) / (d / 2);
      // Thinner to its edges, its corners drawn in, its sides bellied out at the middle.
      const edge = Math.max(Math.abs(nx), Math.abs(nz));
      const corner = 1 - 0.1 * (Math.abs(nx) * Math.abs(nz)) ** 2;
      const belly = 1 - 0.05 * ny * ny;
      pos.setXYZ(i, pos.getX(i) * corner * belly, pos.getY(i) * (1 - thin * edge ** 4), pos.getZ(i) * corner * belly);
    }
    this.base = (pos.array as Float32Array).slice();
    geom.computeVertexNormals();
    this.mesh = part(parent, geom, color, x, y, z, { rx: o.rx, ry: o.ry, rz: o.rz });
    this.mesh.userData.ownGeometry = true;
  }
  press(list: Press[]) {
    const key = list.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)},${p.depth.toFixed(3)}`).join('|');
    if (key === this.key) return;
    this.key = key;
    const pos = this.mesh.geometry.attributes.position;
    const hh = this.h / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = this.base[i * 3];
      const y = this.base[i * 3 + 1];
      const z = this.base[i * 3 + 2];
      let sink = 0;
      for (const p of list) sink += p.depth * Math.exp(-((x - p.x) ** 2 + (z - p.z) ** 2) / Math.max(1e-4, p.r * p.r));
      // Only the top gives; the underside stays where it is.
      pos.setY(i, y - sink * Math.max(0, Math.min(1, (y + hh) / (2 * hh))));
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}

// -------------------------------------------------------------------------------------------------
// Covers.

interface DuvetLook {
  /** The top's width and length (a mattress's), how far it hangs over the sides and the foot. */
  w: number;
  len: number;
  hang: number;
  color: string;
  /** How big the sleepers are (a toddler's covers rise less, over a narrower body). */
  k?: number;
  /** The sheet turned back over it at the chest. */
  sheet?: string;
  fold?: number;
  /** Lines stitched in diamonds; a throw across the foot; the small rumples of a bed that's been slept in. */
  quilt?: boolean;
  throwOver?: string;
  rumple?: number;
  /** Bands across the width of a plain cotton. */
  stripe?: string;
  /** Finer mesh for a quilt to show on. */
  step?: number;
}

/**
 * A duvet: one sheet of mesh, the top lying over the mattress from the chest to the foot, rounding over its edges and
 * hanging, raised over each sleeper's body, the head end turned back to show the sheet. Its top is at y = 0 when
 * nobody's under it, whatever else it does.
 */
export class Duvet {
  readonly mesh: THREE.Mesh;
  private rest: Float32Array;
  private tx: Float32Array;
  private u: Float32Array;
  private over: Float32Array;
  private foot: Float32Array;
  private key = '\0';
  private asleep = false;
  private readonly k: number;
  /** Told who's under it (their x), to dent the pillows. */
  onShape?: (sleepers: number[]) => void;
  constructor(look: DuvetLook) {
    const { w, len, hang } = look;
    this.k = look.k ?? 1;
    const step = look.step ?? 0.07;
    const sx = Math.max(6, Math.round((w + 2 * hang) / step));
    const sz = Math.max(6, Math.round((len + hang) / step));
    const geom = new THREE.PlaneGeometry(w + 2 * hang, len + hang, sx, sz).rotateX(-Math.PI / 2);
    geom.deleteAttribute('uv');
    const pos = geom.attributes.position;
    const n = pos.count;
    this.rest = new Float32Array(n);
    this.tx = new Float32Array(n);
    this.u = new Float32Array(n);
    this.over = new Float32Array(n);
    this.foot = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    const body = new THREE.Color(look.color);
    const band = look.stripe ? new THREE.Color(look.stripe) : body;
    const sheet = new THREE.Color(look.sheet ?? LINEN);
    const thrown = look.throwOver ? new THREE.Color(look.throwOver) : body;
    const hem = new THREE.Color(look.color).multiplyScalar(0.82);
    const fold = look.fold ?? 0.17;
    const R = 0.04;
    const col = new THREE.Color();
    /** Off an edge by `s`: how far out it has come, and how far down, rounding over and then hanging. */
    const bend = (s: number): [number, number] => {
      if (s <= 0) return [0, 0];
      const arc = (R * Math.PI) / 2;
      if (s < arc) return [R * Math.sin(s / R), R * (1 - Math.cos(s / R))];
      return [R, R + (s - arc)];
    };
    for (let i = 0; i < n; i++) {
      const a = pos.getX(i);
      const b = pos.getZ(i) + (len + hang) / 2;
      const sideOver = Math.abs(a) - w / 2;
      const footOver = b - len;
      const [dx, dropX] = bend(sideOver);
      const [dz, dropZ] = bend(footOver);
      const x = Math.sign(a) * (Math.min(Math.abs(a), w / 2) + dx);
      const z = Math.min(b, len) + dz;
      pos.setX(i, x);
      pos.setZ(i, z);
      this.tx[i] = a;
      this.u[i] = Math.min(1, Math.max(0, b / len));
      this.over[i] = Math.max(sideOver, 0);
      this.foot[i] = Math.max(footOver, 0);
      // How it lies: the turned-back sheet at the top, the rest a little lower.
      let y = -0.016 * sm01(b, 0.02 + fold * 0.8, fold + 0.03);
      if (look.quilt) {
        const q = 0.2;
        const d1 = Math.abs(fract((a + b) / q) - 0.5);
        const d2 = Math.abs(fract((a - b) / q) - 0.5);
        if (b > fold) y -= 0.011 * Math.max(0, 1 - Math.min(d1, d2) / 0.16);
      }
      if (look.rumple && b > fold * 0.7) y -= look.rumple * (0.5 + 0.5 * Math.sin(3.1 * a + 2.1 * b + 1.3) * Math.sin(5.3 * b - 1.7 * a));
      const u = b / len;
      const thrownHere = !!look.throwOver && u > 0.62 && u < 0.88;
      if (thrownHere) y += 0.006;
      this.rest[i] = Math.min(0, y) - Math.max(dropX, dropZ);
      // Its colours.
      if (b < fold) col.copy(sheet);
      else if (thrownHere) col.copy(thrown);
      else if (look.stripe && fract(a / 0.26) < 0.42) col.copy(band);
      else col.copy(body);
      if (Math.max(sideOver, footOver) > hang - 0.04) col.lerp(hem, 0.7);
      colors.set([col.r, col.g, col.b], i * 3);
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.mesh = new THREE.Mesh(geom, new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: gradient, side: THREE.DoubleSide }));
    this.mesh.userData.ownGeometry = this.mesh.userData.ownMaterial = true;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.shape([]);
  }
  /** Shapes it over sleepers lying at these offsets across the bed (its local x). */
  shape(sleepers: number[]) {
    const key = sleepers.map((x) => x.toFixed(2)).join(',');
    if (key === this.key) return;
    this.key = key;
    this.asleep = sleepers.length > 0;
    const pos = this.mesh.geometry.attributes.position;
    const width = 0.3 * Math.sqrt(this.k);
    for (let i = 0; i < pos.count; i++) {
      let up = 0;
      for (const sx of sleepers) up = Math.max(up, bodyHeight(this.u[i]) * this.k * Math.exp(-(((this.tx[i] - sx) / width) ** 2)));
      // Off the sides it falls away quickly; over the foot it stays up a while, over the toes.
      pos.setY(i, this.rest[i] + up * (1 - Math.min(1, this.over[i] / 0.12)) * (1 - Math.min(1, this.foot[i] / 0.3)));
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingSphere();
    this.mesh.scale.y = 1;
    this.onShape?.(sleepers);
  }
  /** The slow rise and fall of a sleeper's breath. */
  breathe(t: number) {
    if (this.asleep) this.mesh.scale.y = 1 + 0.018 * Math.sin(t * 1.3);
  }
}

const fract = (x: number) => x - Math.floor(x);
const sm01 = (x: number, a: number, b: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / Math.max(1e-4, b - a)));
  return k * k * (3 - 2 * k);
};
/** How high a sleeper lifts the covers along the bed: 0 at the chest end, 1 at the foot (shoulders, hips, shins, toes). */
// Tall enough for a VRoid body lying on its back, shoes and all (2026-11-05: the feet and the chest showed through).
const BODY: Array<[number, number]> = [[0, 0.22], [0.14, 0.29], [0.4, 0.27], [0.58, 0.25], [0.68, 0.36], [0.8, 0.42], [0.9, 0.34], [1, 0.26]];
function bodyHeight(u: number): number {
  for (let i = 1; i < BODY.length; i++) if (u <= BODY[i][0]) return BODY[i - 1][1] + (BODY[i][1] - BODY[i - 1][1]) * sm01(u, BODY[i - 1][0], BODY[i][0]);
  return BODY[BODY.length - 1][1];
}

// -------------------------------------------------------------------------------------------------
// Beds (their frames at the sizes of the catalogue's footprints: 1 × 2 and 2 × 2, the head at -z).

const MATTRESS_TOP = SEATS.bed + 0.01;

function bedsideThings(g: THREE.Object3D, x: number, y: number, z: number, lamp: boolean, lux: boolean) {
  if (lamp) {
    part(g, cyl(0.035, 0.05, 0.03, 12), lux ? BRASS : '#8d7760', x, y + 0.015, z);
    part(g, cyl(0.012, 0.012, 0.18, 8), lux ? BRASS : '#8d7760', x, y + 0.12, z, { outline: false });
    part(g, cyl(0.055, 0.085, 0.11, 14), lux ? '#ffe9bd' : '#f5e6c8', x, y + 0.25, z);
  }
}

function clock(g: THREE.Object3D, x: number, y: number, z: number, color: string) {
  part(g, rbox(0.09, 0.07, 0.05, 0.015), color, x, y + 0.035, z);
  part(g, box(0.062, 0.042, 0.004), '#2b2b30', x, y + 0.038, z + 0.026, { outline: false });
  part(g, box(0.03, 0.01, 0.002), '#ff8a65', x, y + 0.04, z + 0.029, { outline: false });
}

function slippers(g: THREE.Object3D, x: number, z: number, color: string) {
  for (const s of [-1, 1]) {
    part(g, rbox(0.08, 0.035, 0.22, 0.016), shade(color, 0.85), x + s * 0.06, 0.018, z + (s > 0 ? 0.02 : 0), { ry: s * 0.12 });
    part(g, rbox(0.082, 0.045, 0.1, 0.02), color, x + s * 0.06, 0.05, z + 0.04 + (s > 0 ? 0.02 : 0), { ry: s * 0.12 });
  }
}

function bed(g: THREE.Group, W: number, D: number, c: string, out: Built, lux: boolean) {
  const pair = W > 1.5;
  const mw = pair ? 1.44 : W - 0.14;
  const back = -D / 2;
  const zHead = back + 0.1;
  const zFoot = D / 2 - 0.09;
  const mz = (zHead + zFoot) / 2;
  const ml = zFoot - zHead;
  if (lux) {
    // A divan on brass feet with its upholstered valance, a thick mattress with a pillow top.
    const up = shade(c, 0.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.03, 0.022, 0.08, 10), BRASS, sx * (mw / 2 - 0.05), 0.04, mz + sz * (ml / 2 - 0.05), { outline: false });
    part(g, rbox(mw + 0.08, 0.2, ml + 0.04, 0.03), up, 0, 0.18, mz);
    part(g, box(mw + 0.09, 0.012, ml + 0.05), BRASS, 0, 0.09, mz, { outline: false });
    part(g, rbox(mw, 0.16, ml, 0.05), LINEN, 0, MATTRESS_TOP - 0.13, mz);
    part(g, box(mw + 0.008, 0.008, ml + 0.008), shade(c, 0.8), 0, MATTRESS_TOP - 0.05, mz, { outline: false });
    part(g, rbox(mw - 0.02, 0.06, ml - 0.02, 0.03), '#fffaf0', 0, MATTRESS_TOP - 0.03, mz);
  } else {
    // A pine frame on turned legs, its slats under a plain mattress.
    legs(g, mw + 0.06, ml + 0.1, 0.18, PINE_DARK, 0.03, 0.03);
    for (const sx of [-1, 1]) part(g, rbox(0.04, 0.13, ml + 0.06, 0.012), PINE, sx * (mw / 2 + 0.01), 0.24, mz);
    part(g, rbox(mw - 0.02, 0.19, ml, 0.05), LINEN, 0, MATTRESS_TOP - 0.095, mz);
    part(g, box(mw - 0.01, 0.006, ml + 0.008), shade(c, 0.9), 0, MATTRESS_TOP - 0.045, mz, { outline: false });
    // The foot: a low board.
    part(g, rbox(mw + 0.06, 0.26, 0.035, 0.012), PINE, 0, 0.24, D / 2 - 0.03);
  }

  // The headboard, up against the wall.
  if (lux) {
    const pad = shade(c, 0.62);
    const hbH = 1.28;
    part(g, rbox(W - 0.03, hbH - 0.02, 0.09, 0.05), shade(c, 0.45), 0, hbH / 2, back + 0.05);
    part(g, rbox(W - 0.1, hbH - 0.14, 0.05, 0.06), pad, 0, hbH / 2 + 0.03, back + 0.09);
    // Buttons in a diamond, and wings to either side at the top.
    const nx = pair ? 7 : 4;
    for (let r = 0; r < 4; r++)
      for (let i = 0; i < nx - (r % 2); i++) {
        const x = (i - (nx - 1 - r % 2) / 2) * ((W - 0.22) / (nx - 1));
        part(g, cyl(0.013, 0.013, 0.008, 7), shade(c, 0.42), x, 0.68 + r * 0.14, back + 0.118, { rx: Math.PI / 2, outline: false });
      }
    part(g, box(W - 0.05, 0.012, 0.1), BRASS, 0, hbH - 0.005, back + 0.055, { outline: false });
    for (const sx of [-1, 1]) part(g, dot(0.03), BRASS, sx * (W / 2 - 0.05), hbH + 0.01, back + 0.05);
  } else {
    // Two posts, two rails, slats between; on the top rail a narrow ledge.
    const top = 1.0;
    for (const sx of [-1, 1]) part(g, rbox(0.065, top, 0.065, 0.02), PINE_DARK, sx * (W / 2 - 0.06), top / 2, back + 0.05);
    part(g, rbox(W - 0.12, 0.08, 0.05, 0.015), PINE, 0, top - 0.06, back + 0.05);
    part(g, rbox(W - 0.12, 0.06, 0.05, 0.015), PINE, 0, 0.56, back + 0.05);
    const nS = pair ? 11 : 5;
    for (let i = 0; i < nS; i++) part(g, box(0.05, 0.3, 0.018), PINE, ((i - (nS - 1) / 2) * (W - 0.24)) / (nS - 1 || 1), 0.75, back + 0.05, { outline: false });
    part(g, rbox(W - 0.04, 0.03, 0.15, 0.01), PINE_DARK, 0, top + 0.015, back + 0.075);
  }

  // By the bed: a side table each on a double, a ledge and its clock on a single.
  if (pair) {
    const tx = W / 2 - 0.105;
    for (const s of [-1, 1]) {
      const wood = lux ? WALNUT : PINE;
      part(g, rbox(0.2, 0.44, 0.3, 0.015), wood, s * tx, 0.27, back + 0.26);
      part(g, box(0.16, 0.012, 0.004), lux ? BRASS : PINE_DARK, s * tx, 0.34, back + 0.413, { outline: false });
      part(g, dot(0.012), lux ? BRASS : PINE_DARK, s * tx, 0.28, back + 0.418, { outline: false });
      if (!lux) for (const sx of [-1, 1]) part(g, cyl(0.014, 0.012, 0.05, 6), PINE_DARK, s * tx + sx * 0.08, 0.025, back + 0.26, { outline: false });
      else part(g, box(0.2, 0.05, 0.3), shade(WALNUT, 0.7), s * tx, 0.025, back + 0.26, { outline: false });
      bedsideThings(g, s * tx, 0.49, back + 0.25, s < 0 || lux, lux);
    }
    clock(g, W / 2 - 0.1, 0.49, back + 0.3, lux ? '#3d3b45' : '#eadfca');
    part(g, rbox(0.14, 0.02, 0.1, 0.004), '#7c95b5', W / 2 - 0.1, 0.5, back + 0.2);
    part(g, cyl(0.025, 0.022, 0.08, 8), '#dbe8ee', -W / 2 + 0.14, 0.53, back + 0.34);
  } else if (lux) {
    // A sconce on the headboard, its small shelf.
    rod(g, new THREE.Vector3(0.36, 1.14, back + 0.11), new THREE.Vector3(0.36, 1.1, back + 0.2), 0.009, BRASS);
    part(g, cyl(0.05, 0.08, 0.1, 14), '#ffe9bd', 0.36, 1.07, back + 0.21);
    part(g, rbox(0.17, 0.018, 0.12, 0.006), WALNUT, -0.38, 1.0, back + 0.17);
    clock(g, -0.38, 1.01, back + 0.17, '#3d3b45');
  } else {
    clock(g, -0.24, 1.03, back + 0.08, '#eadfca');
    part(g, rbox(0.15, 0.03, 0.11, 0.005), '#8fa6c0', 0.2, 1.045, back + 0.08);
    part(g, cyl(0.025, 0.022, 0.08, 8), '#dbe8ee', 0.02, 1.07, back + 0.09);
  }

  // Pillows: where the head goes (lot3d.ts lays it at the head end, the top of the head 0.2 from the end).
  const zPillow = -D / 2 + 0.33;
  const xs = pair ? [-0.48, 0.48] : [0];
  const pillowW = pair ? 0.46 : Math.min(0.62, W - 0.28);
  const pillows = xs.map((x) => ({ x, soft: new Soft(g, pillowW, 0.14, 0.34, lux ? '#fffdf6' : '#fbf7ee', x, MATTRESS_TOP + 0.05, zPillow, { thin: 0.6, rx: -0.06 }) }));
  const idle = new THREE.Group();
  if (lux) {
    // Behind them, the large square shams on end; in front when it's made, a little cushion and a bolster.
    for (const x of xs) new Soft(g, pillowW + 0.02, 0.1, 0.44, shade(c, 0.78), x, MATTRESS_TOP + 0.27, back + 0.15, { rx: Math.PI / 2 - 0.22, thin: 0.5 });
    if (pair) new Soft(idle, 0.34, 0.1, 0.26, BRASS, 0, MATTRESS_TOP + 0.16, zPillow + 0.15, { rx: Math.PI / 2 - 0.6, thin: 0.5 });
    const bolsterX = 0;
    part(idle, cyl(0.06, 0.06, pair ? 0.7 : 0.5, 14), shade(c, 0.72), bolsterX, MATTRESS_TOP + 0.08, zPillow + 0.3, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) part(idle, cyl(0.062, 0.062, 0.01, 14), BRASS, bolsterX + (s * (pair ? 0.7 : 0.5)) / 2, MATTRESS_TOP + 0.08, zPillow + 0.3, { rz: Math.PI / 2, outline: false });
  } else {
    // A spare blanket folded on the foot, for the cold nights.
    part(idle, rbox(mw - 0.3, 0.05, 0.3, 0.02), tint(c, 0.55), 0, MATTRESS_TOP + 0.05, zFoot - 0.28, { outline: false });
    part(idle, box(mw - 0.29, 0.008, 0.06), shade(c, 0.75), 0, MATTRESS_TOP + 0.055, zFoot - 0.28, { outline: false });
  }
  g.add(idle);
  out.idle = idle;

  // The covers, from the chest (below the sleeper's chin) to the foot and down over the sides.
  const start = -D / 2 + 0.52;
  const duvet = new Duvet({
    w: mw + 0.02,
    len: zFoot - start,
    hang: lux ? 0.25 : 0.2,
    color: lux ? tint(c, 0.12) : c,
    sheet: lux ? '#fffaf0' : LINEN,
    quilt: lux,
    throwOver: lux ? shade(c, 0.62) : undefined,
    rumple: lux ? 0.004 : 0.016,
    stripe: lux ? undefined : tint(c, 0.45),
    step: lux ? 0.065 : 0.08,
  });
  duvet.mesh.position.set(0, MATTRESS_TOP + 0.022, start);
  duvet.onShape = (sleepers) => {
    for (const p of pillows) {
      const on = sleepers.filter((x) => Math.abs(x - p.x) < 0.3);
      p.soft.press(on.map((x) => ({ x: x - p.x, z: -0.02, depth: 0.075, r: 0.13 })));
    }
  };
  g.add(duvet.mesh);
  out.cover = duvet;
  out.animate = (t) => duvet.breathe(t);

  // In the night: the slippers kicked off at the foot.
  const night = new THREE.Group();
  slippers(night, pair ? 0.3 : 0.05, D / 2 + 0.12, lux ? shade(c, 0.7) : '#9bb0c9');
  if (pair) slippers(night, -0.42, D / 2 + 0.14, lux ? '#d8c7a8' : '#b5a489');
  g.add(night);
  out.inUse = night;
}

// -------------------------------------------------------------------------------------------------
// Seats that give.

/**
 * What a cushioned seat does with who's on it: at each place (`slots`, across the piece) the cushions sink by a
 * damped amount, so it takes the time a body takes to come down.
 */
function seatGive(out: Built, slots: number[], apply: (amounts: number[], lying: boolean) => void) {
  const amounts = slots.map(() => 0);
  let last = 0;
  let was = false;
  const fall = (x: number) => slots.reduce((best, s, i) => (Math.abs(s - x) < Math.abs(slots[best] - x) ? i : best), 0);
  out.seated = (xs, lying, t) => {
    const dt = Math.min(0.2, Math.max(0, t - last));
    last = t;
    const want = slots.map(() => 0);
    if (lying) want.fill(0.7);
    else for (const x of xs) want[fall(x)] = 1;
    let moved = lying !== was;
    was = lying;
    for (let i = 0; i < slots.length; i++) {
      const next = THREE.MathUtils.damp(amounts[i], want[i], 7, dt);
      const settled = Math.abs(next - want[i]) < 0.004 ? want[i] : next;
      if (settled !== amounts[i]) {
        amounts[i] = settled;
        moved = true;
      }
    }
    if (moved) apply(amounts, lying);
  };
}

export const sofa: Builder = (g, W, D, c, _def, _ctx, out) => {
  // A seat about as deep as a sitter's thighs are long, so their knees come to its front edge; the seat stays where
  // dwellers have always sat (SEATS.sofa), a little under the plump top of its cushions.
  const d = Math.min(D, 0.8);
  const z = -D / 2 + d / 2;
  const arm = shade(c, 0.86);
  legs(g, W - 0.1, d - 0.02, 0.1, WALNUT, 0.07, 0.024);
  part(g, rbox(W - 0.08, 0.24, d, 0.04), shade(c, 0.8), 0, 0.2, z);
  part(g, rbox(W - 0.08, 0.66, 0.2, 0.08), shade(c, 0.88), 0, 0.62, z - d / 2 + 0.1);
  // Rolled arms, their fronts piped.
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.12);
    part(g, rbox(0.15, 0.32, d, 0.05), arm, x, 0.42, z);
    part(g, cyl(0.095, 0.095, d, 14), arm, x, 0.6, z, { rx: Math.PI / 2 });
    part(g, cyl(0.075, 0.075, 0.012, 14), tint(c, 0.25), x, 0.6, z + d / 2 + 0.002, { rx: Math.PI / 2, outline: false });
  }
  // The cushions: two to sit on, two to lean on, each pressed in where someone is.
  const cw = (W - 0.44) / 2;
  const seatTop = SEATS.sofa + 0.05;
  const seats = [-1, 1].map((s) => new Soft(g, cw - 0.015, 0.14, d - 0.2, tint(c, 0.1), (s * cw) / 2, seatTop - 0.07, z + 0.09, { thin: 0.22 }));
  const backs = [-1, 1].map((s) => new Soft(g, cw - 0.02, 0.15, 0.42, tint(c, 0.06), (s * cw) / 2, 0.67, z - d / 2 + 0.26, { rx: Math.PI / 2 - 0.16, thin: 0.3 }));
  // A cushion in each corner; a throw folded over the left arm, spread over whoever naps.
  const accent = [
    new Soft(g, 0.3, 0.1, 0.3, '#d9a441', -cw + 0.1, seatTop + 0.14, z - 0.04, { rx: Math.PI / 2 - 0.42, rz: 0.1, thin: 0.5 }),
    new Soft(g, 0.28, 0.1, 0.28, tint(c, 0.55), cw - 0.1, seatTop + 0.13, z - 0.04, { rx: Math.PI / 2 - 0.42, rz: -0.12, thin: 0.5 }),
  ];
  const THROW = shade(tint(c, 0.25), 0.72);
  const folded = new THREE.Group();
  part(folded, rbox(0.21, 0.02, 0.36, 0.008), THROW, -(W / 2 - 0.12), 0.7, z + 0.08);
  for (const s of [-1, 1]) part(folded, box(0.012, 0.22, 0.36), THROW, -(W / 2 - 0.12) + s * 0.105, 0.59, z + 0.08, { outline: false });
  g.add(folded);
  const blanket = new Duvet({ w: 0.68, len: 1.08, hang: 0.08, color: THROW, sheet: tint(THROW, 0.4), fold: 0.06, rumple: 0.01, k: 0.92, step: 0.07 });
  blanket.mesh.rotation.y = Math.PI / 2;
  blanket.mesh.position.set(-0.46, SEATS.sofa + 0.03, 0);
  blanket.mesh.visible = false;
  blanket.shape([0]);
  g.add(blanket.mesh);

  // Where the body rests against them: the seats a little under the top, the backs about the shoulders.
  const SLOT = W / 4;
  seatGive(out, [-SLOT, SLOT], (a, lying) => {
    seats.forEach((s, i) => s.press(a[i] > 0.01 ? [{ x: (i ? -1 : 1) * (SLOT - cw / 2) * -1, z: -0.08, depth: 0.055 * a[i], r: 0.28 }] : []));
    backs.forEach((s, i) => s.press(a[i] > 0.01 && !lying ? [{ x: (i ? -1 : 1) * (SLOT - cw / 2) * -1, z: -0.08, depth: 0.05 * a[i], r: 0.22 }] : []));
    // A nap: the left cushion comes down flat under the head, the throw off the arm and over them.
    blanket.mesh.visible = lying;
    folded.visible = !lying;
    const m = accent[0].mesh;
    if (lying) {
      m.position.set(-W / 2 + 0.31, SEATS.sofa + 0.1, 0);
      m.rotation.set(0.05, 0, 0.08);
    } else {
      // Someone sat by it pushes it into the corner.
      const shove = a[0] * 0.07;
      m.position.set(-cw + 0.1 - shove, seatTop + 0.14, z - 0.04 - shove * 0.3);
      m.rotation.set(Math.PI / 2 - 0.42 - shove * 2.5, 0, 0.1);
    }
    const n = accent[1].mesh;
    const shove = a[1] * 0.07;
    n.position.set(cw - 0.1 + shove, seatTop + 0.13, z - 0.04 - shove * 0.3);
    n.rotation.set(Math.PI / 2 - 0.42 - shove * 2.5, 0, -0.12);
  });
  out.seatMotion = { relax: 'rsRelax', watchTv: 'rsTv' };
};

export const armchair: Builder = (g, W, D, c, _def, _ctx, out) => {
  const w = Math.min(W, 0.85);
  const d = Math.min(D, 0.8);
  out.seat = marker(g, 0, SEATS.armchair, 0.04);
  const dark = shade(c, 0.82);
  // On splayed wooden legs, the wings coming round the head, a loose seat cushion and a little pillow at the back.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.026, 0.016, 0.16, 8), WALNUT, sx * (w / 2 - 0.08), 0.08, sz * (d / 2 - 0.08), { rz: -sx * 0.1, rx: sz * 0.1, outline: false });
  part(g, rbox(w - 0.04, 0.22, d - 0.02, 0.05), dark, 0, 0.26, 0);
  part(g, rbox(w - 0.04, 0.82, 0.16, 0.06), shade(c, 0.9), 0, 0.59, -d / 2 + 0.1, { rx: -0.08 });
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.08);
    part(g, rbox(0.13, 0.28, d - 0.06, 0.05), dark, x, 0.46, 0.02);
    part(g, cyl(0.075, 0.075, d - 0.04, 14), c, x, 0.6, 0.02, { rx: Math.PI / 2 });
    part(g, cyl(0.055, 0.055, 0.012, 14), tint(c, 0.3), x, 0.6, d / 2 - 0.018, { rx: Math.PI / 2, outline: false });
    // The wing.
    part(g, rbox(0.06, 0.34, 0.26, 0.05), shade(c, 0.86), sx * (w / 2 - 0.05), 0.87, -d / 2 + 0.18, { ry: -sx * 0.2, rx: -0.08 });
  }
  const seat = new Soft(g, w - 0.3, 0.13, d - 0.22, tint(c, 0.15), 0, SEATS.armchair - 0.025, 0.08, { thin: 0.22 });
  const back = new Soft(g, w - 0.3, 0.1, 0.44, tint(c, 0.08), 0, 0.72, -d / 2 + 0.24, { rx: Math.PI / 2 - 0.16, thin: 0.3 });
  for (const sx of [-1, 1]) for (const y of [0.66, 0.84]) part(g, cyl(0.014, 0.014, 0.008, 7), shade(c, 0.6), sx * 0.11, y, -d / 2 + 0.3, { rx: Math.PI / 2 - 0.16, outline: false });
  new Soft(g, 0.32, 0.09, 0.2, '#d9a441', 0, 0.6, -d / 2 + 0.33, { rx: Math.PI / 2 - 0.3, thin: 0.5 });
  seatGive(out, [0], ([a]) => {
    seat.press(a > 0.01 ? [{ x: 0, z: -0.04, depth: 0.05 * a, r: 0.24 }] : []);
    back.press(a > 0.01 ? [{ x: 0, z: -0.08, depth: 0.04 * a, r: 0.2 }] : []);
  });
  out.seatMotion = { relax: 'rsRelax', watchTv: 'rsTv' };
};

export const diningChair: Builder = (g, _W, _D, c, _def, _ctx, out) => {
  // A ladder-back in solid wood with a tied-on linen pad. Pulled in to a table by lot3d.ts, as a 'chair' is.
  const w = 0.48;
  const d = 0.46;
  const seatY = 0.46;
  out.seat = marker(g, 0, SEATS.chair + 0.01, 0.02);
  const wood = c;
  const dark = shade(c, 0.72);
  for (const sx of [-1, 1]) {
    part(g, cyl(0.022, 0.016, seatY - 0.03, 8), dark, sx * (w / 2 - 0.04), (seatY - 0.03) / 2, d / 2 - 0.04, { outline: false });
    // The back legs carry on up as the uprights.
    part(g, rbox(0.04, 0.96, 0.035, 0.012), wood, sx * (w / 2 - 0.04), 0.48, -d / 2 + 0.03, { rx: -0.04 });
    // The stretchers.
    part(g, box(0.02, 0.02, d - 0.08), dark, sx * (w / 2 - 0.04), 0.2, 0, { outline: false });
    part(g, cyl(0.022, 0.022, 0.012, 8), dark, sx * (w / 2 - 0.04), 0.96, -d / 2 + 0.012, { outline: false });
  }
  part(g, box(w - 0.08, 0.02, 0.02), dark, 0, 0.26, d / 2 - 0.05, { outline: false });
  part(g, rbox(w, 0.03, d, 0.012), wood, 0, seatY - 0.015, 0);
  // The ladder: slats wider as they go up.
  [0.62, 0.74, 0.86].forEach((y, i) => part(g, rbox(w - 0.08, 0.05 + i * 0.012, 0.018, 0.007), i === 2 ? tint(wood, 0.08) : wood, 0, y, -d / 2 + 0.028 - (y - 0.5) * 0.04));
  // The pad, its corners tied round the uprights.
  const pad = new Soft(g, w - 0.06, 0.042, d - 0.04, LINEN, 0, seatY + 0.021, 0, { thin: 0.2, step: 0.08 });
  for (const sx of [-1, 1]) part(g, rbox(0.03, 0.02, 0.03, 0.008), '#c9a97c', sx * (w / 2 - 0.05), seatY + 0.03, -d / 2 + 0.05, { outline: false });
  seatGive(out, [0], ([a]) => pad.press(a > 0.01 ? [{ x: 0, z: 0, depth: 0.024 * a, r: 0.17 }] : []));
};

// -------------------------------------------------------------------------------------------------
// A toddler's bed: low, and hard to fall out of.

export const toddlerBed: Builder = (g, W, D, c, _def, _ctx, out) => {
  const [w, d] = [Math.min(W, 0.8), Math.min(D, 1.5)];
  const z = -D / 2 + d / 2 + 0.05;
  const top = SEATS.toddlerBed;
  legs(g, w - 0.06, d - 0.06, 0.08, PINE_DARK, 0.08, 0.026);
  part(g, rbox(w, 0.1, d, 0.03), PINE, 0, 0.13, z);
  part(g, rbox(w - 0.06, 0.12, d - 0.08, 0.05), LINEN, 0, top - 0.06, z);
  // The head and foot: painted boards with a rounded top and a star cut in.
  const head = z - d / 2 + 0.03;
  const foot = z + d / 2 - 0.03;
  part(g, rbox(w, 0.5, 0.05, 0.03), c, 0, 0.25, head);
  part(g, cyl(w / 2 - 0.02, w / 2 - 0.02, 0.05, 28), c, 0, 0.5, head, { rx: Math.PI / 2 }).scale.z = 0.5;
  part(g, rbox(w, 0.34, 0.05, 0.03), c, 0, 0.17, foot);
  part(g, cyl(w / 2 - 0.05, w / 2 - 0.05, 0.05, 28), c, 0, 0.34, foot, { rx: Math.PI / 2 }).scale.z = 0.45;
  part(g, dot(0.06), '#fff3c4', 0, 0.58, head + 0.025, { outline: false }).scale.set(1, 1, 0.2);
  for (const s of [-1, 1]) part(g, dot(0.025), '#fff3c4', s * 0.16, 0.54, head + 0.025, { outline: false }).scale.set(1, 1, 0.2);
  part(g, dot(0.05), tint(c, 0.6), 0, 0.38, foot + 0.025, { outline: false }).scale.set(1, 1, 0.2);
  // Guard rails along the head half of both sides, spindles under them.
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.02);
    part(g, rbox(0.04, 0.045, d * 0.54, 0.02), shade(c, 0.9), x, top + 0.2, z - d * 0.2);
    for (let i = 0; i < 6; i++) part(g, cyl(0.011, 0.011, 0.2, 6), tint(c, 0.25), x, top + 0.1, z - d * 0.45 + i * (d * 0.1), { outline: false });
  }
  const pillow = new Soft(g, w * 0.62, 0.09, 0.26, '#fff8ee', 0, top + 0.035, z - d / 2 + 0.2, { thin: 0.6 });
  // A bear on the pillow when it's empty, tucked in beside them when they're down.
  const idle = new THREE.Group();
  teddy(idle, 0.17, top + 0.06, z - d / 2 + 0.34, 0.3);
  g.add(idle);
  out.idle = idle;
  const tucked = new THREE.Group();
  teddy(tucked, 0.26, top + 0.05, z - d / 2 + 0.3, -0.4);
  g.add(tucked);
  out.inUse = tucked;
  // From below the chin (a toddler's face is near the pillow) to the foot.
  const len = d - 0.53;
  const duvet = new Duvet({ w: w - 0.1, len, hang: 0.1, color: tint(c, 0.35), sheet: '#fffdf6', fold: 0.12, rumple: 0.014, stripe: tint(c, 0.7), k: 0.8, step: 0.06 });
  duvet.mesh.position.set(0, top + 0.03, z + d / 2 - 1.05);
  duvet.onShape = (sl) => pillow.press(sl.length ? [{ x: sl[0], z: -0.01, depth: 0.05, r: 0.09 }] : []);
  g.add(duvet.mesh);
  out.cover = duvet;
  out.animate = (t) => duvet.breathe(t);
};

function teddy(g: THREE.Object3D, x: number, y: number, z: number, ry: number) {
  const b = new THREE.Group();
  b.position.set(x, y, z);
  b.rotation.y = ry;
  part(b, dot(0.06), '#c79a6b', 0, 0.05, 0);
  part(b, dot(0.05), '#d3a878', 0, 0.14, 0.01);
  for (const s of [-1, 1]) {
    part(b, dot(0.02), '#a97f53', s * 0.04, 0.18, 0, { outline: false });
    part(b, dot(0.025), '#a97f53', s * 0.065, 0.06, 0.02, { outline: false });
  }
  part(b, dot(0.014), '#2b2017', 0, 0.135, 0.058, { outline: false });
  g.add(b);
}

// -------------------------------------------------------------------------------------------------
// The bassinet: a wicker basket on a stand, with a hood; lifted from for feeds, changes and cuddles.

export const bassinet: Builder = (g, W, D, c, _def, _ctx, out) => {
  const [w, d] = [Math.min(W, 0.6), Math.min(D, 0.85)];
  const bed = CR.bed;
  const wicker = tint(c, 0.15);
  const rim = shade(c, 0.78);
  // A stand of two crossed frames on a low stretcher.
  for (const sz of [-1, 1]) {
    const zz = sz * (d / 2 - 0.12);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * (w / 2 - 0.02), 0.02, zz), new THREE.Vector3(-sx * (w / 2 - 0.14), 0.5, zz), 0.014, PINE_DARK);
    part(g, cyl(0.016, 0.016, w - 0.02, 8), PINE_DARK, 0, 0.27, zz, { rz: Math.PI / 2, outline: false });
  }
  part(g, cyl(0.014, 0.014, d - 0.2, 8), PINE_DARK, 0, 0.27, 0, { rx: Math.PI / 2, outline: false });
  // The basket, swinging a little on the stand: an open oval shell (so the baby lies down inside it).
  const basket = new THREE.Group();
  basket.position.y = 0.72;
  g.add(basket);
  const ox = w / d;
  const shell = (rt: number, rb: number, h: number, y: number, color: string, o: { open?: boolean; dbl?: boolean; outline?: boolean } = {}) => {
    const m = part(basket, new THREE.CylinderGeometry(rt, rb, h, 26, 1, !!o.open), color, 0, y - 0.72, 0, { outline: o.outline ?? false, material: o.dbl ? new THREE.MeshToonMaterial({ color, gradientMap: gradient, side: THREE.DoubleSide }) : undefined });
    m.scale.set(ox, 1, 1);
    m.userData.ownGeometry = true;
    if (o.dbl) m.userData.ownMaterial = true;
    return m;
  };
  const R = d / 2;
  shell(R, R - 0.06, 0.34, 0.68, wicker, { open: true, dbl: true });
  shell(R - 0.06, R - 0.06, 0.025, 0.52, wicker);
  // The weave's bands round the outside.
  for (let i = 0; i < 6; i++) {
    const y = 0.53 + i * 0.05;
    const r = R - 0.06 + (0.06 * (y - 0.51)) / 0.34 + 0.003;
    shell(r, r - 0.004, 0.022, y, i % 2 ? shade(wicker, 0.9) : tint(wicker, 0.2), { open: true, dbl: true });
  }
  // The rim, and the lining and mattress within (the baby lies on it at BASSINET_BED).
  const rimM = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 8, 34), toon(rim));
  rimM.userData.ownGeometry = true;
  rimM.rotation.x = Math.PI / 2;
  rimM.scale.set(ox, 1, 1);
  rimM.position.y = 0.85 - 0.72;
  rimM.castShadow = true;
  basket.add(rimM);
  shell(R - 0.012, R - 0.07, 0.3, 0.69, '#fff7ea', { open: true, dbl: true });
  shell(R - 0.05, R - 0.06, 0.05, bed - 0.025, '#fbf4e8');
  // The hood over the head end, its scalloped edge.
  const hood = new THREE.Mesh(new THREE.SphereGeometry(R - 0.03, 18, 8, 0, Math.PI, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: tint(c, 0.5), gradientMap: gradient, side: THREE.DoubleSide }));
  hood.userData.ownGeometry = hood.userData.ownMaterial = true;
  hood.scale.set(ox * 1.04, 0.72, 0.7);
  hood.position.set(0, 0.85 - 0.72, -d * 0.2);
  // The half-dome's open side faces the foot.
  hood.rotation.y = Math.PI;
  hood.castShadow = true;
  basket.add(hood);
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    part(basket, dot(0.018), '#fff7ea', Math.cos(a) * w * 0.47, 0.85 - 0.72 + Math.sin(a) * (R - 0.03) * 0.72, -d * 0.2 + 0.002, { outline: false });
  }
  // A bow.
  for (const s of [-1, 1]) part(basket, rbox(0.05, 0.022, 0.016, 0.006), '#e9a0b0', s * 0.035, 0.85 - 0.72, d / 2 + 0.012, { rz: s * 0.25, outline: false });
  part(basket, dot(0.014), '#e9a0b0', 0, 0.85 - 0.72, d / 2 + 0.016, { outline: false });

  // A side tray for the bottle; a mobile on an arm, turning while someone's there.
  part(g, rbox(0.15, 0.015, 0.14, 0.006), PINE, CR.tray[0] - 0.02, CR.tray[1] - 0.06, CR.tray[2] - 0.02);
  rod(g, new THREE.Vector3(CR.tray[0] - 0.02, CR.tray[1] - 0.06, CR.tray[2] - 0.02), new THREE.Vector3(w / 2 - 0.06, 0.62, 0.24), 0.01, PINE_DARK);
  const mast = new THREE.Vector3(-w / 2 + 0.02, 0.84, -d * 0.04);
  rod(g, mast, new THREE.Vector3(-w / 2 + 0.02, 1.26, -d * 0.04), 0.009, '#efe6d6');
  rod(g, new THREE.Vector3(-w / 2 + 0.02, 1.26, -d * 0.04), new THREE.Vector3(0, 1.3, 0.04), 0.008, '#efe6d6');
  const mobile = new THREE.Group();
  mobile.position.set(0, 1.28, 0.04);
  g.add(mobile);
  const charms: Array<[string, boolean]> = [['#ffd98a', true], ['#a9d3e9', false], ['#f4b6c2', true], ['#b7deb5', false]];
  charms.forEach(([col, star], i) => {
    const a = (i / charms.length) * Math.PI * 2;
    const x = Math.cos(a) * 0.1;
    const z = Math.sin(a) * 0.1;
    part(mobile, box(0.002, 0.08, 0.002), '#d7cdbb', x, -0.04, z, { outline: false });
    part(mobile, star ? new THREE.OctahedronGeometry(0.026) : dot(0.022), col, x, -0.1, z, { outline: false }).userData.ownGeometry = star;
  });

  // The changing pad across the rim; the bottle and the clean nappy, out only for what they're for.
  const pad = new THREE.Group();
  part(pad, rbox(w - 0.04, 0.03, d - 0.08, 0.012), '#e9f2ee', 0, CR.pad - 0.015, 0);
  for (const s of [-1, 1]) part(pad, rbox(0.03, 0.02, d - 0.1, 0.008), '#d4e4dd', s * (w / 2 - 0.045), CR.pad + 0.01, 0, { outline: false });
  pad.visible = false;
  g.add(pad);
  const bottle = new THREE.Group();
  bottle.name = 'bottle';
  part(bottle, cyl(0.029, 0.029, 0.11, 12), '#f7f7f2', 0, 0, 0, { outline: false });
  part(bottle, cyl(0.03, 0.03, 0.05, 12), '#fdf5e6', 0, -0.03, 0, { outline: false });
  part(bottle, cyl(0.022, 0.03, 0.022, 12), '#8ec7e6', 0, 0.066, 0, { outline: false });
  part(bottle, cyl(0.007, 0.016, 0.03, 8), '#e8c9a0', 0, 0.092, 0, { outline: false });
  bottle.visible = false;
  g.add(bottle);
  const nappy = new THREE.Group();
  nappy.name = 'nappy';
  part(nappy, rbox(0.18, 0.018, 0.14, 0.008), '#ffffff', 0, -0.009, 0, { outline: false });
  part(nappy, box(0.2, 0.004, 0.03), '#a9d3e9', 0, 0.002, 0.04, { outline: false });
  nappy.visible = false;
  g.add(nappy);

  // Where the baby is (lot3d.ts draws them here): down on the mattress, its head to the back, unless someone has them.
  const baby = marker(g, 0, bed, 0);
  baby.rotation.order = 'YXZ';
  out.babyAt = baby;

  const uses: Array<[string, RsMotion]> = [['feedBaby', 'rsFeed'], ['changeBaby', 'rsChange'], ['cuddleBaby', 'rsCuddle']];
  const spots: Record<string, Spot> = {};
  for (const [id, m] of uses) {
    const s = spot(g, 'stand', 0, 0, CR.stand, Math.PI);
    s.motion = m;
    spots[id] = s;
  }
  out.spots = spots;
  const place = (m: THREE.Object3D, p: V) => m.position.set(p[0], p[1], p[2]);
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  out.away = (_a, t) => {
    let live: { m: RsMotion; s: Spot; u: number } | null = null;
    for (const [id, m] of uses) {
      const u = rsLive(m, spots[id], t);
      if (u !== null) live = { m, s: spots[id], u };
    }
    pad.visible = false;
    bottle.visible = false;
    nappy.visible = false;
    basket.rotation.z = 0;
    if (!live) {
      baby.userData.feeding = false;
      baby.position.set(0, bed, 0);
      baby.rotation.set(0, 0, 0);
      for (const [id] of uses) spots[id].held = null;
      return;
    }
    const n = rsNow(live.m, live.u, (live.s.at.userData.height as number | undefined) ?? 1.6, t);
    if (n.baby) {
      place(baby, n.baby.p);
      baby.rotation.set(n.baby.rx, n.baby.ry, 0);
    }
    pad.visible = !!n.padOut;
    // Rocked a little once it's empty, as a basket goes when it's lifted from.
    basket.rotation.z = n.baby && n.baby.p[1] > bed + 0.05 && !n.padOut ? 0.03 * Math.sin(t * 1.6) : 0;
    live.s.held = null;
    // At the bottle, the baby holds still (lot3d.ts passes this on to the model).
    baby.userData.feeding = live.m === 'rsFeed' && (n.tip ?? 0) > 0.5;
    if (live.m === 'rsFeed') {
      bottle.visible = true;
      if (n.hold === 'bottle') {
        // Tipped to the mouth: its teat there (restMotion.ts works out where from how the baby lies), the base up and away from the face.
        place(bottle, n.r);
        const w = n.bottleWay!;
        bottle.quaternion.setFromUnitVectors(v(0, 1, 0), v(-w[0], -w[1], -w[2]));
        bottle.quaternion.slerp(new THREE.Quaternion(), 1 - (n.tip ?? 0));
        live.s.held = { tool: bottle, lead: 'right', grips: { right: { at: v(0, -0.01, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.03 } }, free: { left: g.localToWorld(v(n.l[0], n.l[1], n.l[2])) }, freeShape: 'cradle', lean: 0.05, nod: 0.45 };
      } else {
        place(bottle, [CR.tray[0] - 0.02, CR.tray[1] + 0.0, CR.tray[2] - 0.02]);
        bottle.rotation.set(0, 0, 0);
      }
    }
    if (live.m === 'rsChange') {
      if (n.hold === 'diaper') {
        nappy.visible = true;
        place(nappy, [n.r[0], n.r[1] - 0.03, n.r[2]]);
        live.s.held = { tool: nappy, lead: 'right', grips: { right: { at: v(0, 0.02, 0), axis: v(1, 0, 0), palm: v(0, -1, 0), shape: 'flat', radius: 0.005 } }, free: { left: g.localToWorld(v(n.l[0], n.l[1], n.l[2])) }, freeShape: 'cradle', lean: 0.5, nod: 0.45 };
      } else if (live.u < 0.4) {
        nappy.visible = true;
        place(nappy, [0.26, CR.pad + 0.02, 0.26]);
      }
    }
  };
  out.animate = (t) => {
    mobile.rotation.y = t * 0.5;
  };
};

// -------------------------------------------------------------------------------------------------
// The fireplace: a real recess, logs on firedogs, flames that lick.

/** A tongue of fire, one unit tall and one across at its widest (shared by every fire). */
const flameGeom = new THREE.LatheGeometry([[0, 0], [0.62, 0.1], [1, 0.3], [0.82, 0.55], [0.42, 0.8], [0.1, 0.96], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 9);

function flameMat(color: string, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
}

export const fireplace: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const back = -D / 2;
  const d = 0.55;
  const zf = FP.zf;
  const stone = '#d0c5b2';
  const stoneDark = '#b8ab96';
  const brick = '#a95e45';
  const mouthW = W - 0.75;
  const mouthH = 0.72;
  const side = (W - 0.1 - mouthW) / 2;
  // The chimney breast to the ceiling, its courses of brick.
  part(g, rbox(W - 0.5, 1.8, d - 0.15, 0.01), shade(brick, 0.95), 0, 2.05, back + (d - 0.15) / 2);
  for (let y = 1.4; y < 2.95; y += 0.11) part(g, box(W - 0.52, 0.01, 0.01), shade(brick, 0.72), 0, y, back + d - 0.145, { outline: false });
  // The surround: its two sides and the lintel round a real opening.
  for (const sx of [-1, 1]) {
    const x = sx * (mouthW / 2 + side / 2);
    part(g, rbox(side, 1.15, d, 0.02), stone, x, 0.575, back + d / 2);
    part(g, rbox(side - 0.05, 1.03, 0.03, 0.01), stoneDark, x, 0.56, zf + 0.008);
    for (const y of [0.3, 0.6, 0.9]) part(g, box(side - 0.05, 0.008, 0.01), shade(stoneDark, 0.85), x, y, zf + 0.024, { outline: false });
  }
  part(g, rbox(mouthW + 0.02, 1.15 - mouthH, d, 0.02), stone, 0, mouthH + (1.15 - mouthH) / 2, back + d / 2);
  part(g, rbox(0.14, 0.2, 0.05, 0.01), stoneDark, 0, mouthH + 0.1, zf + 0.012);
  // The firebox: firebrick back and sides, its floor and soot.
  const inner = zf - d + 0.05;
  part(g, box(mouthW, mouthH, 0.03), '#3a2620', 0, mouthH / 2, inner, { outline: false });
  for (const y of [0.12, 0.24, 0.36, 0.48, 0.6]) part(g, box(mouthW - 0.02, 0.006, 0.006), '#57362b', 0, y, inner + 0.018, { outline: false });
  part(g, box(mouthW - 0.1, 0.18, 0.004), '#191210', 0, mouthH - 0.09, inner + 0.02, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.02, mouthH, d - 0.03), '#2f1f1a', sx * (mouthW / 2 - 0.01), mouthH / 2, zf - d / 2 + 0.02, { outline: false });
  part(g, box(mouthW, 0.02, d - 0.03), '#1f1714', 0, mouthH - 0.01, zf - d / 2 + 0.02, { outline: false });
  part(g, box(mouthW, 0.03, d), '#2a2320', 0, 0.015, zf - d / 2 + 0.02, { outline: false });
  // The mantel; the hearth stone out in front.
  part(g, rbox(W + 0.02, 0.05, d + 0.12, 0.016), WALNUT, 0, 1.18, back + d / 2 + 0.04);
  part(g, rbox(W - 0.06, 0.04, d + 0.04, 0.012), shade(WALNUT, 0.8), 0, 1.135, back + d / 2 + 0.01);
  part(g, rbox(W - 0.04, 0.05, 0.3, 0.012), '#8d8a84', 0, 0.025, zf + 0.14);
  // Firedogs and the logs on them, the bark dark and the cut ends pale, the kindling under.
  const zFire = zf - 0.17;
  for (const sx of [-0.28, 0.28]) {
    part(g, rbox(0.03, 0.05, 0.3, 0.008), '#1d1a18', sx, 0.06, zFire);
    part(g, cyl(0.016, 0.016, 0.15, 8), '#1d1a18', sx, 0.12, zFire + 0.16, { outline: false });
    part(g, dot(0.024), BRASS, sx, 0.2, zFire + 0.16, { outline: false });
  }
  const log = (x: number, y: number, z: number, len: number, r: number, ry: number, rz: number) => {
    const l = new THREE.Group();
    l.position.set(x, y, z);
    l.rotation.set(0, ry, rz);
    part(l, cyl(r, r * 1.05, len, 10), '#4a3225', 0, 0, 0, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) part(l, cyl(r * 0.88, r * 0.88, 0.006, 10), '#d3a877', (s * len) / 2 + s * 0.002, 0, 0, { rz: Math.PI / 2, outline: false });
    for (let i = 0; i < 3; i++) part(l, box(len * 0.75, 0.006, 0.012), '#2c1c14', (i - 1) * 0.04, r * 0.98, 0, { rx: (i - 1) * 0.5, outline: false });
    g.add(l);
  };
  log(-0.02, 0.135, zFire - 0.08, 0.72, 0.056, 0.05, 0);
  log(0.05, 0.135, zFire + 0.06, 0.7, 0.05, -0.09, 0.01);
  log(-0.02, 0.215, zFire - 0.01, 0.56, 0.046, 0.18, -0.03);
  for (let i = 0; i < 5; i++) part(g, box(0.28, 0.012, 0.012), '#8c6b4b', -0.12 + i * 0.05, 0.078, zFire + 0.08 - i * 0.03, { ry: 0.5 + i * 0.32, outline: false });
  // The bed of embers, dull until it's lit (lot3d.ts lights it, as it does a glow).
  const ember = new THREE.Mesh(new THREE.BoxGeometry(mouthW - 0.32, 0.03, 0.26), new THREE.MeshBasicMaterial({ color: '#3a2a20' }));
  ember.userData.ownGeometry = ember.userData.ownMaterial = true;
  ember.position.set(0, 0.05, zFire);
  g.add(ember);
  out.glow = ember;

  // On the mantel: a clock, candles, a photograph, a sprig in a jug. By the hearth: the log basket and the fire irons.
  const zM = back + d / 2 + 0.04;
  part(g, rbox(0.2, 0.22, 0.08, 0.04), WALNUT, 0, 1.315, zM);
  part(g, cyl(0.07, 0.07, 0.01, 18), '#f6efe0', 0, 1.33, zM + 0.043, { rx: Math.PI / 2, outline: false });
  part(g, box(0.004, 0.05, 0.004), '#2c2c2c', 0, 1.35, zM + 0.05, { outline: false });
  part(g, box(0.034, 0.004, 0.004), '#2c2c2c', 0.016, 1.33, zM + 0.05, { outline: false });
  for (const x of [-W / 2 + 0.25, -W / 2 + 0.4]) {
    const h = x < -0.7 ? 0.2 : 0.14;
    part(g, cyl(0.05, 0.05, 0.012, 12), BRASS, x, 1.211, zM, { outline: false });
    part(g, cyl(0.022, 0.022, h, 10), '#fbf4df', x, 1.212 + h / 2, zM);
    part(g, dot(0.012), '#ffb74d', x, 1.218 + h, zM, { outline: false });
  }
  part(g, rbox(0.16, 0.2, 0.015, 0.005), BRASS, -0.42, 1.3, zM - 0.07, { rx: -0.15 });
  part(g, box(0.12, 0.15, 0.004), '#e8d5b3', -0.42, 1.3, zM - 0.06, { rx: -0.15, outline: false });
  part(g, cyl(0.04, 0.05, 0.1, 10), '#9cb4a3', 0.3, 1.255, zM);
  for (const [dx, dz] of [[-0.02, 0], [0.025, 0.01], [0, -0.015]]) part(g, dot(0.028), '#7da06e', 0.3 + dx, 1.33 + Math.abs(dx) * 2, zM + dz, { outline: false });
  // The log basket, on the hearth's left; the stand of irons on its right.
  const bx = -W / 2 + 0.17;
  part(g, cyl(0.15, 0.12, 0.22, 16), '#9a7a4f', bx, 0.16, zf + 0.15);
  for (let i = 0; i < 5; i++) part(g, cyl(0.032, 0.032, 0.24, 8), '#6b4a31', bx - 0.07 + (i % 3) * 0.07, 0.29 + (i > 2 ? 0.055 : 0), zf + 0.1 + ((i * 7) % 3) * 0.05, { rz: Math.PI / 2 + 0.05 * i });
  const standX = FP.poker[0];
  part(g, cyl(0.07, 0.08, 0.025, 12), '#1d1a18', standX, 0.062, zf + 0.12);
  part(g, cyl(0.009, 0.009, 0.66, 8), '#1d1a18', standX, 0.4, zf + 0.12, { outline: false });
  part(g, dot(0.02), BRASS, standX, 0.74, zf + 0.12, { outline: false });
  // The rest of the irons; the poker's handled on its own.
  part(g, cyl(0.007, 0.007, 0.58, 6), '#26211d', standX - 0.05, 0.38, zf + 0.09, { rz: 0.04, outline: false });
  part(g, rbox(0.05, 0.08, 0.012, 0.004), '#26211d', standX - 0.06, 0.1, zf + 0.09, { outline: false });

  // The poker and the lighter, each with a real handle.
  const poker = new THREE.Group();
  poker.name = 'poker';
  part(poker, cyl(0.014, 0.014, 0.11, 8), BRASS, 0, 0, 0, { outline: false });
  part(poker, cyl(0.007, 0.007, 0.56, 6), '#26211d', 0, 0.33, 0, { outline: false });
  part(poker, cyl(0.004, 0.009, 0.06, 6), '#1b1715', 0.012, 0.62, 0, { rz: -0.7, outline: false });
  g.add(poker);
  const lighter = new THREE.Group();
  lighter.name = 'lighter';
  part(lighter, rbox(0.024, 0.13, 0.018, 0.006), '#c0392b', 0, 0, 0, { outline: false });
  part(lighter, cyl(0.004, 0.004, 0.3, 6), '#b8bec2', 0, 0.21, 0, { outline: false });
  const lit = new THREE.Mesh(flameGeom, new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, depthWrite: false }));
  lit.userData.ownMaterial = true;
  lit.scale.set(0.009, 0.03, 0.009);
  lit.position.y = 0.36;
  lit.visible = false;
  lighter.add(lit);
  g.add(lighter);

  // The screen on the hearth: two leaves of brass frame and fine dark mesh, folded back from the middle to get at the fire.
  const sw = (mouthW + 0.02) / 2;
  const sh = mouthH - 0.1;
  const paneMat = new THREE.MeshBasicMaterial({ color: '#17120f', transparent: true, opacity: 0.32, depthWrite: false });
  const leaves = [-1, 1].map((sx) => {
    const hinge = new THREE.Group();
    hinge.position.set(sx * sw, 0.05, zf + 0.06);
    const frame = new THREE.Group();
    frame.position.x = -sx * (sw / 2);
    hinge.add(frame);
    const pane = new THREE.Mesh(box(sw - 0.03, sh - 0.03, 0.004), paneMat);
    pane.userData.ownMaterial = true;
    pane.position.y = sh / 2;
    frame.add(pane);
    for (const y of [0, sh]) part(frame, box(sw, 0.022, 0.018), BRASS, 0, y, 0, { outline: false });
    for (const x of [-sw / 2, sw / 2]) part(frame, box(0.022, sh, 0.018), BRASS, x, sh / 2, 0, { outline: false });
    for (let i = 1; i < 6; i++) part(frame, box(0.003, sh - 0.03, 0.003), '#24201c', -sw / 2 + (i * sw) / 6, sh / 2, 0.003, { outline: false });
    for (let i = 1; i < 6; i++) part(frame, box(sw - 0.03, 0.003, 0.003), '#24201c', 0, (i * sh) / 6, 0.003, { outline: false });
    part(frame, dot(0.018), BRASS, -sx * (sw / 2 - 0.04), sh * 0.6, 0.02, { outline: false });
    g.add(hinge);
    return { hinge, sx };
  });
  const openScreen = (e: number) => {
    for (const l of leaves) l.hinge.rotation.y = l.sx * 2.0 * e;
  };

  // The fire: tongues in three colours, a pool of light on the back and the hearth, sparks going up.
  const fire = new THREE.Group();
  const flames: Array<{ m: THREE.Mesh; x: number; z: number; h: number; r: number; hz: number; phase: number }> = [];
  const lay = (color: string, opacity: number, list: Array<[number, number, number, number]>, y: number) => {
    const mat = flameMat(color, opacity);
    list.forEach(([x, z, h, r], i) => {
      const m = new THREE.Mesh(flameGeom, mat);
      m.userData.ownMaterial = true;
      m.position.set(x, y, zFire + z);
      fire.add(m);
      flames.push({ m, x, z: zFire + z, h, r, hz: 2.6 + (i * 1.37) % 2.2, phase: i * 1.9 + x * 7 });
    });
  };
  lay('#e8481a', 0.6, [[-0.26, 0.02, 0.36, 0.1], [-0.11, -0.03, 0.5, 0.13], [0.06, 0.02, 0.56, 0.14], [0.22, -0.02, 0.42, 0.11]], 0.08);
  lay('#ff8a1f', 0.8, [[-0.18, 0.04, 0.3, 0.075], [-0.03, 0.03, 0.42, 0.09], [0.13, 0.05, 0.34, 0.08]], 0.09);
  lay('#ffd65c', 0.92, [[-0.09, 0.07, 0.2, 0.05], [0.05, 0.08, 0.26, 0.055], [0.17, 0.07, 0.15, 0.04]], 0.1);
  const glowBack = new THREE.Mesh(box(mouthW - 0.08, mouthH - 0.14, 0.002), flameMat('#ff7a2a', 0.3));
  glowBack.userData.ownMaterial = true;
  glowBack.position.set(0, mouthH / 2 - 0.04, inner + 0.024);
  fire.add(glowBack);
  const glowFloor = new THREE.Mesh(box(mouthW + 0.1, 0.002, 0.3), flameMat('#ff8c3a', 0.22));
  glowFloor.userData.ownMaterial = true;
  glowFloor.position.set(0, 0.053, zf + 0.14);
  fire.add(glowFloor);
  const sparks: THREE.Mesh[] = [];
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffc26a' });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(box(0.008, 0.008, 0.008), sparkMat);
    m.userData.ownMaterial = true;
    fire.add(m);
    sparks.push(m);
  }
  g.add(fire);
  out.inUse = fire;
  // Smoke, when it's being put out.
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#8a8580', transparent: true, opacity: 0.35, depthWrite: false });
  const smoke: THREE.Mesh[] = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(dot(0.05), smokeMat);
    m.userData.ownMaterial = true;
    m.visible = false;
    fire.add(m);
    return m;
  });

  // How big the fire is: full unless someone's lighting or dousing it, when it follows what their hands do.
  let k = 1;
  let shown = 0;
  let lastT = 0;
  const lightSpot = spot(g, 'stand', 0.1, 0, 0.46, Math.PI);
  lightSpot.motion = 'rsLight';
  const douseSpot = spot(g, 'stand', 0.4, 0, 0.46, Math.PI);
  douseSpot.motion = 'rsDouse';
  // warmSelf is shared and has its own range: no spot, or everyone warming would stand on the same point.
  out.spots = { lightFire: lightSpot, putOutFire: douseSpot };
  out.work = marker(g, 0, 0.5, zf + 0.15);
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const aim = (o: THREE.Object3D, dy: number, dz: number) => o.rotation.set(Math.atan2(dz, dy), 0, 0);
  out.away = (_a, t) => {
    const dt = Math.min(0.2, Math.max(0, t - lastT));
    lastT = t;
    // Out: the next time it's lit, it starts from nothing.
    if (!fire.visible) k = shown = 0;
    const uL = rsLive('rsLight', lightSpot, t);
    const uD = rsLive('rsDouse', douseSpot, t);
    const H = ((uL !== null ? lightSpot : douseSpot).at.userData.height as number | undefined) ?? 1.6;
    // At rest: the lighter on the mantel, the poker on its stand.
    lighter.position.set(FP.lighter[0], 1.215, FP.lighter[2]);
    lighter.rotation.set(0, 0, -Math.PI / 2);
    lit.visible = false;
    poker.position.set(FP.poker[0], FP.poker[1], FP.poker[2]);
    poker.rotation.set(Math.PI, 0, 0);
    lightSpot.held = null;
    douseSpot.held = null;
    for (const m of smoke) m.visible = false;
    if (uL !== null) {
      const n = rsNow('rsLight', uL, H, t);
      k = n.flame ?? 1;
      openScreen(n.screen ?? 0);
      if (n.hold === 'lighter') {
        lighter.position.set(n.r[0], n.r[1], n.r[2]);
        // Pointed in at the kindling: the nozzle (+y) down and forward.
        lighter.rotation.set(Math.atan2(-0.78, -0.6), 0, -0.1);
        lit.visible = uL > 0.34 && uL < 0.72;
        lightSpot.held = { tool: lighter, lead: 'right', grips: { right: { at: v(0, -0.01, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.012 } }, free: { left: g.localToWorld(v(n.l[0], n.l[1], n.l[2])) }, lean: n.lean, nod: n.nod };
      }
    } else if (uD !== null) {
      const n = rsNow('rsDouse', uD, H, t);
      k = n.flame ?? 1;
      openScreen(n.screen ?? 0);
      if (n.hold === 'poker') {
        poker.position.set(n.r[0], n.r[1], n.r[2]);
        aim(poker, -0.72, -0.7);
        douseSpot.held = { tool: poker, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power' } }, free: { left: g.localToWorld(v(n.l[0], n.l[1], n.l[2])) }, lean: n.lean, nod: n.nod };
      }
      if (uD > 0.55)
        smoke.forEach((m, i) => {
          const p = (t * 0.45 + i / 3) % 1;
          m.visible = true;
          m.position.set(Math.sin(t + i * 2) * 0.06, 0.25 + p * 0.42, zFire + 0.05);
          m.scale.setScalar(0.7 + p * 1.5);
        });
    } else {
      openScreen(0);
      k = THREE.MathUtils.damp(k, 1, 2, dt);
    }
    shown = THREE.MathUtils.damp(shown, k, 6, dt);
  };
  out.animate = (t) => {
    const K = Math.max(0.001, shown);
    for (const f of flames) {
      const lick = 0.82 + 0.2 * Math.sin(t * f.hz + f.phase) + 0.1 * Math.sin(t * f.hz * 2.3 + f.phase * 1.7);
      f.m.scale.set(Math.max(0.001, f.r * (0.92 + 0.1 * Math.sin(t * f.hz * 1.3 + f.phase)) * (0.5 + 0.5 * K)), Math.max(0.001, f.h * lick * K), Math.max(0.001, f.r * 0.8 * (0.5 + 0.5 * K)));
      f.m.rotation.z = 0.12 * Math.sin(t * f.hz * 0.7 + f.phase * 0.5);
      f.m.position.x = f.x + 0.012 * Math.sin(t * f.hz * 0.9 + f.phase);
    }
    const flick = 0.75 + 0.25 * Math.sin(t * 8.7) * Math.sin(t * 3.1);
    (glowBack.material as THREE.MeshBasicMaterial).opacity = 0.32 * flick * K;
    (glowFloor.material as THREE.MeshBasicMaterial).opacity = 0.24 * flick * K;
    sparks.forEach((m, i) => {
      const p = (t * (0.22 + i * 0.041) + i * 0.37) % 1;
      m.visible = K > 0.3 && p < 0.92;
      m.position.set(((i * 0.29) % 0.5) - 0.25 + 0.03 * Math.sin(t * 3 + i), 0.18 + p * 0.5, zFire + 0.02 + 0.03 * Math.cos(t * 2 + i));
    });
  };
};

// -------------------------------------------------------------------------------------------------

const bedOf = (lux: boolean): Builder => (g, W, D, c, _def, _ctx, out) => bed(g, W, D, c, out, lux);

export const BUILDERS: Record<string, Builder> = {
  bed: bedOf(false),
  doubleBed: bedOf(false),
  deluxeBed: bedOf(true),
  deluxeDoubleBed: bedOf(true),
  sofa,
  armchair,
  diningChair,
  toddlerBed,
  bassinet,
  fireplace,
};
