import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { CATALOG } from '../game/catalog';
import { buildFurniture } from './furniture3d';
import { PICTURE_ALLOWED } from './picturesAllowed';

/*
 * A picture hidden behind its own piece (2026-11-02): home mirrors had their frame's face in front of the glass, a data centre's rack faces sat
 * 1 mm behind their cabinets, and every test passed. Each picture is looked at from just in front of it: what's solid in the same piece in
 * the way is the bug. Keep ALLOWED short, a reason for each.
 */
/** From this far off: what's nearer than this is what the picture is laid on, not a thing standing in front of it (a pen on a page, a monitor on a desk). */
// Builders skip what paints without a page (a mirror's glass among them): a canvas that draws nothing lets them all make their pictures.
const CONTEXT: unknown = new Proxy(function () {}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern' ? () => CONTEXT : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => CONTEXT), set: () => true });
(globalThis as { document?: unknown }).document ??= { createElement: () => ({ width: 1, height: 1, style: {}, getContext: () => CONTEXT, toDataURL: () => '' }) };
const SHOWN_AT = 0.015;
const POINTS: Array<[number, number]> = [[0, 0], [0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]];


function shown(o: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let n: THREE.Object3D | null = o; n; n = n === root ? null : n.parent) if (!n.visible) return false;
  return true;
}
const solid = (m: THREE.Mesh) => {
  if (m.userData.ink) return false;
  const mats = Array.isArray(m.material) ? m.material : [m.material];
  return mats.some((x) => !x.transparent && x.opacity >= 1 && x.colorWrite !== false && x.visible);
};
const nameOf = (m: THREE.Object3D) => {
  const names: string[] = [];
  for (let n: THREE.Object3D | null = m; n && names.length < 3; n = n.parent) if (n.name) names.push(n.name);
  const g = (m as THREE.Mesh).geometry as THREE.BufferGeometry & { parameters?: Record<string, number> };
  const p = g?.parameters;
  return `${names.join('<') || '?'}:${g?.type?.replace('Geometry', '')}${p ? `[${Object.values(p).slice(0, 3).map((v) => (typeof v === 'number' ? +v.toFixed(3) : v)).join(',')}]` : ''}`;
};

/** The nearest back face ahead of `at` along `n`, with no front face before it: `at` is inside a closed solid. Sides are put back. */
function insideOf(at: THREE.Vector3, n: THREE.Vector3, solids: THREE.Mesh[], ray: THREE.Raycaster) {
  ray.set(at.clone().addScaledVector(n, 0.0002), n);
  ray.far = 0.6;
  const was = new Map<THREE.Material, THREE.Side>();
  for (const m of solids) for (const x of [m.material].flat()) if (!was.has(x)) was.set(x, x.side);
  for (const x of was.keys()) x.side = THREE.DoubleSide;
  const hit = ray.intersectObjects(solids, false)[0];
  for (const [x, side] of was) x.side = side;
  return hit?.face && hit.face.normal.clone().transformDirection(hit.object.matrixWorld).dot(n) > 0.2 ? hit : null;
}

/** Every picture in a piece that has solid geometry of the same piece in front of it. */
function hidden(id: string, againstWall = false) {
  const def = CATALOG.find((d) => d.id === id)!;
  const b = buildFurniture(def, { againstWall });
  // What a piece puts in its place each frame (what's kept out of the way until used, a tool on its rest).
  b.away?.(false, 0);
  // A screen, and what shows while in use, as they are while it's on.
  for (const o of [b.screen, b.inUse]) if (o) o.visible = true;
  if (b.idle) b.idle.visible = false;
  b.root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  b.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  const out: Array<{ key: string; what: string }> = [];
  const pictures = meshes.filter((m) => {
    const inScreen = !!b.screen && (m === b.screen || b.screen.getObjectById(m.id));
    const mat = m.material as THREE.MeshBasicMaterial;
    return (m.geometry as THREE.BufferGeometry).type === 'PlaneGeometry' && !Array.isArray(m.material) && (mat.map || inScreen) && !m.userData.ink && shown(m, b.root) && !(mat.transparent && mat.opacity < 1);
  });
  // One picture over another is a sheet on a board, or films that swap: only what's solid hides.
  const blockers = meshes.filter((m) => shown(m, b.root) && solid(m) && (m.geometry as THREE.BufferGeometry).type !== 'PlaneGeometry');
  const others = (pic: THREE.Mesh) => blockers.filter((m) => m !== pic);
  const ray = new THREE.Raycaster();
  for (const pic of pictures) {
    const g = pic.geometry as THREE.PlaneGeometry;
    const { width, height } = g.parameters;
    const nm = new THREE.Matrix3().getNormalMatrix(pic.matrixWorld);
    const front = new THREE.Vector3(0, 0, 1).applyMatrix3(nm).normalize();
    const faces = (pic.material as THREE.Material).side === THREE.DoubleSide ? [front, front.clone().negate()] : [front];
    const looks = faces.map((n) => {
      const by: Array<{ o: THREE.Object3D; depth: number; buried?: boolean }> = [];
      for (const [u, v] of POINTS) {
        const at = new THREE.Vector3(u * width, v * height, 0).applyMatrix4(pic.matrixWorld);
        ray.set(at.clone().addScaledVector(n, SHOWN_AT), n.clone().negate());
        ray.far = SHOWN_AT - 0.0002;
        const hit = ray.intersectObjects(others(pic), false)[0];
        if (hit) by.push({ o: hit.object, depth: SHOWN_AT - hit.distance });
        else {
          // Further in than that: inside something closed, the way out of it lying ahead through its back faces.
          const inside = insideOf(at, n, others(pic), ray);
          if (inside) by.push({ o: inside.object, depth: inside.distance, buried: true });
        }
      }
      return by;
    });
    const best = looks.reduce((a, c) => (c.length < a.length ? c : a));
    if (best.length >= 3) out.push({ key: `${id}|${width.toFixed(2)}x${height.toFixed(2)}`, what: `${nameOf(best[0].o)} over ${nameOf(pic)} ${best.some((x) => x.buried) ? 'buried' : 'behind'} ${Math.round(best[0].depth * 1000)}mm (${best.length}/5)` });
  }
  return { out, count: pictures.length };
}

describe('a picture is in front of its own piece', () => {
  test('every builder, but for what picturesAllowed.ts says', () => {
    const bad: string[] = [];
    let n = 0;
    for (const d of CATALOG) {
      const r = hidden(d.id);
      n += r.count;
      for (const { key, what } of r.out) if (!PICTURE_ALLOWED[key]) bad.push(`${key}: ${what}`);
    }
    expect(n).toBeGreaterThan(5000);
    expect(bad).toEqual([]);
  }, 280000);

  test('the home mirror, the 코미디 클럽 one too: its glass in front of its frame, on a stand and against a wall', () => {
    for (const againstWall of [false, true]) {
      const r = hidden('mirror', againstWall);
      expect(r.count).toBeGreaterThan(0);
      expect(r.out).toEqual([]);
    }
  });
});
