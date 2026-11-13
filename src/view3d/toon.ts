import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * The look the whole lot shares with the VRoid dwellers (after the walk test's lot.ts): flat bands of
 * toon shade and a dark line round every shape, in soft colours.
 */
export const INK_COLOR = '#3b2b2b';
const INK = new THREE.MeshBasicMaterial({ color: INK_COLOR, side: THREE.BackSide });
/** Outline thickness, metres. */
export const LINE = 0.014;

export const gradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([120, 200, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const materials = new Map<string, THREE.MeshToonMaterial>();
/** Three bands of light like MToon's, one material per colour (shared: never change one in place). */
export function toon(color: string, emissive?: string): THREE.MeshToonMaterial {
  const key = emissive ? `${color}|${emissive}` : color;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradient });
    if (emissive) m.emissive = new THREE.Color(emissive);
    materials.set(key, m);
  }
  return m;
}

export const textured = (map: THREE.Texture) => new THREE.MeshToonMaterial({ map, gradientMap: gradient });

export interface PartOpts {
  rx?: number;
  ry?: number;
  rz?: number;
  outline?: boolean;
  shadow?: boolean;
  material?: THREE.Material;
}

/** A shape in toon colour with an outline: the same shape drawn again, inside out, a line's width bigger. */
export function part(parent: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: PartOpts = {}): THREE.Mesh {
  const m = new THREE.Mesh(geom, o.material ?? toon(color));
  m.position.set(x, y, z);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  m.castShadow = o.shadow ?? true;
  m.receiveShadow = true;
  if (o.outline ?? true) {
    geom.computeBoundingBox();
    const size = geom.boundingBox!.getSize(new THREE.Vector3());
    const hull = new THREE.Mesh(geom, INK);
    hull.userData.ink = true;
    hull.scale.set(...(size.toArray().map((s) => (s > 0 ? (s + 2 * LINE) / s : 1)) as [number, number, number]));
    m.add(hull);
  }
  parent.add(m);
  return m;
}

const geoms = new Map<string, THREE.BufferGeometry>();
/** Geometry is shared between pieces of the same size (never disposed: the set of sizes is small). */
function shared<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoms.get(key);
  if (!g) geoms.set(key, (g = make()));
  return g as T;
}
const r3 = (n: number) => Math.round(n * 1000) / 1000;
export const rbox = (w: number, h: number, d: number, r = 0.05) =>
  shared(`rb${r3(w)},${r3(h)},${r3(d)},${r3(r)}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.99));
export const box = (w: number, h: number, d: number) => shared(`b${r3(w)},${r3(h)},${r3(d)}`, () => new THREE.BoxGeometry(w, h, d));
export const cyl = (rt: number, rb: number, h: number, seg = 20) => shared(`c${r3(rt)},${r3(rb)},${r3(h)},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
export const ball = (r: number) => shared(`s${r3(r)}`, () => new THREE.SphereGeometry(r, 18, 12));

/** A canvas painted once and used as a texture (nothing outside a browser: then a blank one). */
export function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, rx = 1, ry = rx): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const labels = new Map<string, THREE.Texture>();
/** An emoji on a transparent square, for faces of things we have no model for. */
export function iconTexture(icon: string): THREE.Texture {
  let t = labels.get(icon);
  if (!t) {
    t = canvasTexture(128, 128, (g) => {
      g.font = '96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(icon, 64, 70);
    });
    labels.set(icon, t);
  }
  return t;
}

/** Disposes what a group made for itself (shared geometry and materials are kept). */
export function disposeOwn(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.userData.ownGeometry) m.geometry?.dispose();
    if (m.userData.ownMaterial) (m.material as THREE.Material)?.dispose();
  });
}
