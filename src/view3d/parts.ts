import * as THREE from 'three';
import type { ObjectDef } from '../game/types';
import type { Motion } from './activity';
import type { HeldTool } from './handTool';
import { box, cyl, gradient, iconTexture, part, rbox } from './toon';

/**
 * What every piece of furniture is built from (furniture3d.ts, furnitureWork.ts): what a built
 * piece hands the lot view (its screen, its seat, where the hands go…), and the small parts and
 * colours the families share.
 */
export interface Built {
  root: THREE.Group;
  /** A screen to light when the object's in use. */
  screen?: THREE.Mesh;
  /** Glows at night (lamps). */
  glow?: THREE.Mesh;
  /** The covers, shaped over whoever's asleep under them. */
  cover?: Pick<Cover, 'mesh' | 'shape'>;
  /** Told every frame who's sat on it (their offsets across its x), whether they're lying along it, for cushions that give, and what each is doing there (the interactions' ids; a bath's foam, a shower's steam). */
  seated?: (xs: number[], lying: boolean, t: number, ids?: string[]) => void;
  /** What a dweller sat on it does, by interaction, where it isn't the family's own (a stretch on a sofa). */
  seatMotion?: Record<string, Motion>;
  /** Where a baby in this bassinet is drawn, its +z towards their feet: on its mattress, or in someone's arms. */
  babyAt?: THREE.Object3D;
  /** Grows with the plant. */
  growth?: THREE.Object3D;
  /** Told every frame how the plant in it is, or that there's none (a planter's stages, its dry soil, its weeds). */
  plant?: (p: { growth: number; water: number; weeds: number } | undefined, t: number) => void;
  /** Where a dweller sits to use it (the middle of the seat's top): a desk's chair, a piano's bench. */
  seat?: THREE.Object3D;
  /** Where a dweller stands on it to use it (a concert stage's deck, behind the mic), facing its front. */
  stand?: THREE.Object3D;
  /** Places drawn on it for visitors to sit while they wait or watch (a talk show's guest sofa), each the middle of its seat's top, facing its +z. */
  guests?: THREE.Object3D[];
  /** Where the hands go to use it: a keyboard, the keys, the paper on a desk. */
  work?: THREE.Object3D;
  /** Doors that swing open while it's used (a fridge's): each a hinge whose userData.swing is the side it's hung on (-1 left, +1 right, seen from the front). */
  doors?: THREE.Object3D[];
  /** Shown only while it's used: a pan on the stove. */
  inUse?: THREE.Object3D;
  /** Shown only while it isn't used: a guitar on its stand, picked up to play. */
  idle?: THREE.Object3D;
  /** Moves while it's used (a treadmill's belt), given the time in seconds. */
  animate?: (t: number) => void;
  /**
   * Told every frame whether someone's gone off the lot with it (2026-10-26: a fire engine out on a
   * call drives off and backs in again, but stays put while it's only checked over or sat in).
   */
  away?: (out: boolean, t: number) => void;
  /** Each frame: where the camera is (world), for a tall part that gets out of the way with its back to it (a sink's panel). */
  seenFrom?: (camera: THREE.Vector3) => void;
  /** Each frame: where the dwellers on the lot are from its first tile, in tiles (a booth that runs when walked through). */
  passing?: (near: Array<{ dx: number; dy: number }>, t: number) => void;
  /** A place of its own for an interaction (by id, '*' for the rest) where a seat or a stand won't do. */
  spots?: Record<string, Spot>;
  /** The solid part in its own frame (not the chair that goes with a desk), for standing up to it. */
  body: THREE.Box3;
}

/**
 * Where a dweller goes for one use of something (2026-10-26): a marker whose own +z is the way they face,
 * maybe on a part that moves (a centrifuge's gondola) — sat on it (its seat's top, the feet `drop`
 * below), stood on it (the feet), or flying over it (the middle of the body, face down, the head along
 * +z; `drop` down to the floor under them) — and where the hands go.
 */
export interface Spot {
  at: THREE.Object3D;
  how: 'sit' | 'stand' | 'fly';
  drop?: number;
  work?: THREE.Object3D;
  /** Sat cross-legged (on a meditation cushion) rather than on a chair's seat. */
  legs?: 'cross';
  /** What they do there, whatever the interaction (a talk show's host at the desk); else the interaction's own motion. */
  motion?: Motion;
  /** What's in their hands this moment, set by the piece as its work goes on (handTool.ts). */
  held?: HeldTool | null;
}

/** A spot facing `yaw` (0 is the object's front, +z) in an object's frame. */
export function spot(g: THREE.Object3D, how: Spot['how'], x: number, y: number, z: number, yaw = 0, drop?: number): Spot {
  const at = marker(g, x, y, z);
  at.rotation.y = yaw;
  return { at, how, drop };
}

/** A marker in an object's frame. */
export function marker(g: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/**
 * A bed's covers: a sheet over the mattress from the pillows to the foot, hanging over its sides,
 * raised over each sleeper's body (chest, hips, legs and the feet under the end) and flat when
 * nobody's in it.
 */
export class Cover {
  readonly mesh: THREE.Mesh;
  private base: Float32Array;
  private key = '';
  /** `k`: how big the sleepers are (a toddler's covers rise less, over a narrower body). */
  constructor(readonly w: number, readonly len: number, color: string, readonly k = 1) {
    const geom = new THREE.PlaneGeometry(w, len, 16, 20).rotateX(-Math.PI / 2);
    this.base = (geom.attributes.position.array as Float32Array).slice();
    this.mesh = new THREE.Mesh(geom, new THREE.MeshToonMaterial({ color, gradientMap: gradient, side: THREE.DoubleSide }));
    this.mesh.userData.ownGeometry = this.mesh.userData.ownMaterial = true;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.shape([]);
  }
  /** Shapes it over sleepers lying at these offsets across the bed (its local x). */
  shape(sleepers: number[]) {
    const key = sleepers.map((x) => x.toFixed(2)).join(',');
    if (key === this.key) return;
    this.key = key;
    const pos = this.mesh.geometry.attributes.position;
    const hw = this.w / 2;
    const hl = this.len / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = this.base[i * 3];
      const z = this.base[i * 3 + 2];
      // 0 at the pillow end, 1 at the foot.
      const u = (z + hl) / this.len;
      let y = 0;
      for (const sx of sleepers) {
        const across = Math.exp(-(((x - sx) / (0.27 * Math.sqrt(this.k))) ** 2));
        const body = u < 0.4 ? 0.23 : u < 0.62 ? 0.2 : u < 0.84 ? 0.18 : 0.3;
        y = Math.max(y, body * this.k * across);
      }
      // Over the edges it hangs down the sides of the mattress.
      const edge = Math.max(Math.abs(x) - (hw - 0.07), z - (hl - 0.07), 0) / 0.07;
      y -= Math.min(1, edge) * 0.13 * this.k;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}

export interface BuildCtx {
  /** A wall right behind it, to hang it on. */
  againstWall: boolean;
}

export const shade = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
export const tint = (hex: string, k: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();
export const WOOD = '#a8774f';
export const METAL = '#9aa3ab';
export const DARK = '#3d3b45';
export const WHITE = '#f4f1ea';

export function screenMesh(w: number, h: number): THREE.Mesh {
  const m = new THREE.Mesh(box(w, h, 0.02), new THREE.MeshBasicMaterial({ color: '#2a3140' }));
  m.userData.ownMaterial = true;
  return m;
}

/** A label on the front of something we have only a box for: its icon. */
export function iconOn(g: THREE.Object3D, def: ObjectDef, y: number, z: number, size = 0.42): THREE.Mesh | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: iconTexture(def.icon), transparent: true, depthWrite: false }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(0, y, z);
  g.add(m);
  return m;
}

/**
 * The chair that goes with a desk, pulled up to its front edge `front` (where its user sits, their
 * knees under the top); returns the middle of its seat.
 */
export function deskChair(g: THREE.Group, front: number): THREE.Object3D {
  const c = new THREE.Group();
  c.position.set(0, 0, front + 0.2);
  c.rotation.y = Math.PI;
  part(c, cyl(0.04, 0.04, 0.4, 8), DARK, 0, 0.2, 0, { outline: false });
  part(c, cyl(0.22, 0.22, 0.03, 5), DARK, 0, 0.03, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.04), '#5c6bc0', 0, 0.44, 0);
  part(c, rbox(0.44, 0.42, 0.06, 0.04), '#5c6bc0', 0, 0.72, -0.21);
  g.add(c);
  return marker(g, 0, 0.48, front + 0.2);
}

/** A desk's top, drawers and side, against the back of its tile, with its chair; returns where the top is. */
export function deskBase(g: THREE.Group, W: number, D: number, c: string, out: Built) {
  const d = Math.min(D, 0.7);
  const z = -D / 2 + d / 2;
  part(g, rbox(W - 0.06, 0.05, d, 0.02), c, 0, 0.74, z);
  part(g, rbox(0.42, 0.7, d - 0.04, 0.02), shade(c, 0.85), W / 2 - 0.25, 0.36, z);
  part(g, rbox(0.05, 0.7, d - 0.04, 0.02), shade(c, 0.85), -(W / 2 - 0.06), 0.36, z);
  out.seat = deskChair(g, z + d / 2);
  return { z, d };
}

export type Builder = (g: THREE.Group, W: number, D: number, c: string, def: ObjectDef, ctx: BuildCtx, out: Built) => void;

export const legs = (g: THREE.Group, W: number, D: number, h: number, color: string, inset = 0.08, r = 0.03) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(r, r * 0.8, h, 8), color, sx * (W / 2 - inset), h / 2, sz * (D / 2 - inset), { outline: false });
};


/** A round rod from one point to another (a tripod's leg, a strut), in the parent's frame. */
export function rod(g: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, r: number, color: string): THREE.Mesh {
  const d = to.clone().sub(from);
  const m = part(g, cyl(r, r, d.length(), 8), color, (from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2, { outline: false });
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
