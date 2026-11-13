import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { legs, marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { glowing, label, painted, picture, ring, text } from './doctor';
import * as F from './farmerMotion';
import { XE_MOTIONS } from './workExtraMotion';
import { sprayKit } from './workExtraKits';

/** A Korean family farm. 해솔밭 is a fictional mark on the crates and awning.
 * Farm name, crops and prices are set dressing; the workplace name remains 농장.
 * Black mulch has real planting holes and drip tubes, brass valves have handles,
 * crates have slats, and every moving tool shares its grip with farmerMotion.ts. */
const FARM = '해솔밭 가족농원';
const GREEN = '#50764a', DARK = '#304f3c', LEAF = '#639447', LIGHT = '#9bbb59';
const WOOD = '#ae8454', END = '#d4b27b', SOIL = '#6c5038', MULCH = '#343c37';
const CREAM = '#f4ecd6', PAPER = '#fff9e9', STEEL = '#a5b4b2', INK = '#303d39';
const RED = '#c74c37', BLUE = '#6b9ea9', SKIN = '#ecc39e';
const UP = new THREE.Vector3(0, 1, 0);
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; parent.add(g); return g;
}
function place(o: THREE.Object3D, p: F.V) { o.position.set(...p); }
/** Nine beds repeat hundreds of leaves and veins. Bake each rigid plant into one
 * draw per material while preserving its movable root, outlines and shadows. */
function bakePlant(root: THREE.Group) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, { material: THREE.Material; shadow: boolean; geometries: THREE.BufferGeometry[] }>();
  const originals: THREE.Mesh[] = [];
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const key = `${o.material.uuid}:${o.castShadow}`;
    let batch = batches.get(key);
    if (!batch) { batch = { material: o.material, shadow: o.castShadow, geometries: [] }; batches.set(key, batch); }
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    batch.geometries.push(geo); originals.push(o);
  });
  root.clear();
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach(g => g.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.castShadow = batch.shadow; mesh.receiveShadow = true;
    mesh.userData.ownGeometry = true; root.add(mesh);
  }
  originals.forEach(o => { if (o.userData.ownGeometry) o.geometry.dispose(); });
  return root;
}
function flat(g: THREE.Object3D, s: string, w: number, d: number, p: F.V, bg = PAPER, fg = DARK) {
  const m = label(g, s, w, d, ...p, bg, fg); m.rotation.x = -Math.PI / 2; return m;
}
function tube(g: THREE.Object3D, pts: F.V[], r: number, color: string) {
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(F.v)), pts.length * 6, r, 7, false);
  const mesh = part(g, geo, color, 0, 0, 0, { outline: false }); mesh.userData.ownGeometry = true; return mesh;
}
function dynamicRod(g: THREE.Object3D, r: number, color: string) {
  const mesh = part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false });
  return (a: F.V, b: F.V, visible = true) => {
    mesh.visible = visible;
    const start = F.v(a), d = F.v(b).sub(start);
    mesh.position.copy(start).addScaledVector(d, 0.5); mesh.scale.y = Math.max(0.001, d.length());
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
function bench(g: THREE.Object3D, width = 1.88, top = 0.91, depth = 0.80) {
  const frame = group(g);
  legs(frame, width, depth, top - 0.05, GREEN, 0.07, 0.027);
  part(frame, rbox(width, 0.055, depth, 0.015), END, 0, top - 0.0275, 0);
  part(frame, box(width - 0.12, 0.035, depth - 0.10), WOOD, 0, 0.28, 0);
  for (const z of [-depth / 2 + 0.05, depth / 2 - 0.05]) {
    part(frame, box(width - 0.09, 0.11, 0.025), WOOD, 0, top - 0.12, z);
  }
  for (let i = 0; i < 6; i++) part(frame, box(width - 0.04, 0.001, 0.002), WOOD, 0, top + 0.001, -depth / 2 + 0.07 + i * depth / 7, { outline: false });
  return frame;
}
function crate(g: THREE.Object3D, p: F.V, title = '해솔밭', color = GREEN, w = 0.48, d = 0.36) {
  const root = group(g, ...p);
  part(root, box(w, 0.025, d), color, 0, 0.0125, 0);
  for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) for (const z of [-d / 2 + 0.02, d / 2 - 0.02]) {
    part(root, box(0.035, 0.24, 0.035), color, x, 0.12, z);
  }
  for (let i = 0; i < 3; i++) {
    for (const z of [-d / 2, d / 2]) part(root, box(w, 0.05, 0.02), color, 0, 0.05 + i * 0.075, z);
    for (const x of [-w / 2, w / 2]) part(root, box(0.02, 0.05, d), color, x, 0.05 + i * 0.075, 0);
  }
  if (title) label(root, title, w * 0.74, 0.065, 0, 0.12, d / 2 + 0.013, CREAM, DARK);
  return root;
}
function basket(g: THREE.Object3D, p: F.V = [0, 0, 0]) {
  const root = group(g, ...p);
  part(root, cyl(0.19, 0.15, 0.15, 20), '#ba9259', 0, -0.065, 0);
  part(root, cyl(0.175, 0.175, 0.006, 20), '#695239', 0, 0.012, 0, { outline: false });
  for (let i = 0; i < 6; i++) part(root, ring(0.153 + i * 0.006, 0.006), END, 0, -0.13 + i * 0.027, 0, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    rod(root, v(Math.cos(a) * 0.151, -0.13, Math.sin(a) * 0.151), v(Math.cos(a) * 0.185, 0.005, Math.sin(a) * 0.185), 0.004, WOOD);
  }
  part(root, ring(0.19, 0.009, Math.PI), WOOD, 0, 0.012, 0);
  return root;
}
function cabbage(g: THREE.Object3D, p: F.V, scale = 1, lettuce = false) {
  const root = group(g, ...p); root.scale.setScalar(scale);
  for (let j = 0; j < 7; j++) {
    const a = j * Math.PI * 2 / 7;
    const leaf = part(root, ball(0.105), j % 2 ? LEAF : LIGHT, Math.sin(a) * 0.075, 0.055, Math.cos(a) * 0.075, { outline: false });
    leaf.scale.set(0.72, lettuce ? 0.5 : 0.85, 1.10); leaf.rotation.y = a; leaf.rotation.x = 0.24;
    rod(root, v(Math.sin(a) * 0.025, 0.065, Math.cos(a) * 0.025), v(Math.sin(a) * 0.13, 0.08, Math.cos(a) * 0.13), 0.0035, '#c7d88a');
  }
  if (!lettuce) {
    const heart = part(root, ball(0.105), '#c4d38b', 0, 0.13, 0); heart.scale.set(0.78, 1.35, 0.75);
    for (const x of [-0.044, 0, 0.044]) tube(root, [[x, 0.07, 0.073], [x, 0.15, 0.078], [x * 0.6, 0.23, 0.038]], 0.003, '#e1e5b5');
  } else {
    for (let j = 0; j < 4; j++) part(root, ball(0.065), j % 2 ? '#88ad56' : '#a2c060', Math.sin(j * 1.7) * 0.03, 0.095, Math.cos(j * 1.7) * 0.03, { outline: false }).scale.set(0.9, 0.6, 1.2);
  }
  return bakePlant(root);
}
function pepper(g: THREE.Object3D, p: F.V, scale = 1, green = false) {
  const root = group(g, ...p); root.scale.setScalar(scale);
  tube(root, [[0, 0.06, 0], [0.012, 0.025, 0], [0.016, -0.04, 0], [0.035, -0.095, 0]], 0.019, green ? '#548843' : RED);
  part(root, cyl(0.022, 0.008, 0.027, 9), DARK, 0, 0.064, 0);
  rod(root, v(0, 0.07, 0), v(-0.02, 0.11, 0.003), 0.005, GREEN);
  return bakePlant(root);
}
function tomato(g: THREE.Object3D, p: F.V, scale = 1) {
  const root = group(g, ...p); root.scale.setScalar(scale);
  part(root, ball(0.059), RED, 0, 0, 0).scale.y = 0.85;
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    rod(root, v(0, 0.05, 0), v(Math.sin(a) * 0.035, 0.045, Math.cos(a) * 0.035), 0.004, DARK);
  }
  rod(root, v(0, 0.05, 0), v(0.004, 0.073, 0), 0.004, GREEN);
  return bakePlant(root);
}
function seedling(g: THREE.Object3D, p: F.V, scale = 1) {
  const root = group(g, ...p); root.scale.setScalar(scale);
  rod(root, v(0, 0, 0), v(0, 0.17, 0), 0.006, GREEN);
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    const leaf = part(root, ball(0.048), i % 2 ? LEAF : LIGHT, side * 0.04, 0.06 + i * 0.025, 0, { outline: false });
    leaf.scale.set(1.25, 0.14, 0.5); leaf.rotation.z = side * 0.25;
  }
  return bakePlant(root);
}
function vine(g: THREE.Object3D, p: F.V, tomatoes = false, scale = 1) {
  const root = group(g, ...p);
  rod(root, v(0.035, 0, 0), v(0.035, 0.92, 0), 0.013, '#ac9061');
  rod(root, v(0, 0, 0), v(-0.015, 0.78 * scale, 0), 0.008, GREEN);
  for (let i = 0; i < 5; i++) {
    const s = i % 2 ? 1 : -1, y = (0.18 + i * 0.11) * scale;
    rod(root, v(0, y - 0.025, 0), v(s * 0.12, y + 0.02, 0), 0.005, GREEN);
    part(root, ball(0.067), i % 2 ? LEAF : DARK, s * 0.11, y + 0.02, 0, { outline: false }).scale.set(1.4, 0.17, 0.55);
    if (i > 0 && i < 4) {
      if (tomatoes) tomato(root, [s * 0.09, y - 0.06, 0.05], scale);
      else pepper(root, [s * 0.085, y - 0.06, 0.02], scale, i === 3);
    }
  }
  for (const y of [0.31, 0.62]) part(root, ring(0.033, 0.003), CREAM, 0.015, y, 0, { rx: Math.PI / 2, outline: false });
  return bakePlant(root);
}
function hoe(g: THREE.Object3D) {
  const root = group(g);
  part(root, cyl(0.017, 0.021, 0.20, 10), WOOD, 0, 0, 0);
  tube(root, [[0, -0.1, 0], [0, -0.15, -0.015], [0, -0.18, -0.09]], 0.008, STEEL);
  const shape = new THREE.Shape(); shape.moveTo(-0.045, 0); shape.lineTo(0.045, 0); shape.lineTo(0.018, -0.11); shape.closePath();
  const blade = part(root, new THREE.ExtrudeGeometry(shape, { depth: 0.005, bevelEnabled: false }), '#80948f', 0, -0.15, -0.075, { rx: -0.65, outline: false });
  blade.userData.ownGeometry = true;
  return root;
}
function wateringCan(g: THREE.Object3D) {
  const root = group(g);
  part(root, cyl(0.12, 0.10, 0.21, 18), BLUE, -0.06, -0.11, 0);
  part(root, ring(0.085, 0.012), DARK, 0.055, -0.055, 0);
  rod(root, v(-0.14, -0.16, 0), v(-0.32, -0.035, 0), 0.025, BLUE);
  part(root, cyl(0.051, 0.022, 0.045, 14), STEEL, -0.34, -0.02, 0, { rz: 0.94 });
  part(root, cyl(0.055, 0.055, 0.008, 14), DARK, -0.06, 0.001, 0, { outline: false });
  label(root, '물', 0.09, 0.065, -0.06, -0.10, 0.122, BLUE, CREAM);
  return root;
}
function pen(g: THREE.Object3D) {
  const root = group(g);
  part(root, cyl(0.006, 0.006, 0.14, 7), '#d6ac53', 0, 0.01, 0, { rz: -0.2, outline: false });
  part(root, cyl(0, 0.006, 0.027, 7), INK, -0.017, -0.071, 0, { rz: Math.PI - 0.2, outline: false });
  return root;
}
function clipboard(g: THREE.Object3D, p: F.V, title: string, w = 0.31, d = 0.24) {
  const root = group(g, ...p);
  part(root, rbox(w, 0.014, d, 0.007), WOOD, 0, 0, 0);
  part(root, box(w - 0.025, 0.002, d - 0.025), PAPER, 0, 0.009, 0, { outline: false });
  flat(root, title, w - 0.04, 0.041, [0, 0.012, -d / 2 + 0.04]);
  part(root, box(0.09, 0.015, 0.023), STEEL, 0, 0.018, -d / 2 + 0.02);
  for (let i = 0; i < 4; i++) part(root, box(w - 0.05, 0.002, 0.002), '#b8c6a1', 0, 0.012, -0.02 + i * 0.03, { outline: false });
  return root;
}
function marks(g: THREE.Object3D, p: F.V, n = 5) {
  return Array.from({ length: n }, (_, i) => part(g, box(0.06 + i % 2 * 0.025, 0.002, 0.005), BLUE,
    p[0] + i % 2 * 0.08, p[1], p[2] + Math.floor(i / 2) * 0.03, { ry: 0.04, outline: false }));
}
function display(g: THREE.Object3D, lines: string[], p: F.V, w = 0.4, h = 0.11) {
  const tex = lines.map((s, i) => painted(`fm-${s}-${i}`, 512, 128, c => {
    c.fillStyle = '#203d37'; c.fillRect(0, 0, 512, 128); text(c, s, 256, 67, 43, '#d2efb5', 'center');
  }));
  const mesh = picture(g, tex[0], w, h, ...p), mat = mesh.material as THREE.MeshBasicMaterial;
  return { mesh, set(i: number) {
    const t = tex[Math.max(0, Math.min(tex.length - 1, i))];
    if (mat.map !== t) { mat.map = t; mat.needsUpdate = true; }
  } };
}
function useLight(g: THREE.Object3D, out: Built, p: F.V) {
  const on = group(g); out.inUse = on;
  glowing(on, ball(0.016), '#ccf1a6', ...p); return on;
}
interface Frame { m: F.FarmMotion; b: F.Beat; h: F.Hands; t: number; s: Spot }
function animate(g: THREE.Group, out: Built, mapping: Record<string, F.FarmMotion>, update: (f: Frame | null) => void) {
  const origin = marker(g, 0, 0, 0);
  out.spots = Object.fromEntries(Object.entries(mapping).map(([id, m]) => {
    const p = F.spotOf(m), s = spot(g, 'stand', ...p, Math.PI);
    s.work = origin; s.motion = m; return [id, s];
  }));
  out.work = origin;
  let lastStamp = -Infinity, previous: Spot | undefined;
  out.away = (_away, t) => {
    // A fresh posed stamp means the dweller was drawn at this station in the preceding
    // frame. This also works during slow software rendering, unlike a 0.6s timeout.
    const latest = Object.values(out.spots!).sort((a, b) => Number(b.at.userData.posedAt ?? -Infinity) - Number(a.at.userData.posedAt ?? -Infinity))[0];
    const stamp = Number(latest?.at.userData.posedAt ?? -Infinity);
    const s = stamp !== lastStamp && Number.isFinite(stamp) ? latest : undefined;
    lastStamp = stamp;
    if (previous && previous !== s) F.farmStop(previous.motion as F.FarmMotion, origin.getWorldPosition(new THREE.Vector3()));
    previous = s;
    // A use with a script of its own (xwPestControl: workExtraKits.ts) leaves the farm's clock alone.
    if (!s || XE_MOTIONS.has(s.motion as string)) { previous = undefined; update(null); return; }
    const m = s.motion as F.FarmMotion, elapsed = F.farmTime(m, t, origin.getWorldPosition(new THREE.Vector3()));
    if (m !== 'fmDrive') s.at.position.x = F.spotOf(m)[0] + F.farmStep(m, elapsed);
    update({ m, b: F.farmBeat(m, elapsed), h: F.farmHands(m, elapsed, Number(s.at.userData.height ?? 1.6)), t: elapsed, s });
  };
}
function parked(g: THREE.Object3D, held: THREE.Object3D, p: F.V, rz = Math.PI / 2) {
  const rest = held.clone(); g.add(rest); place(rest, p); rest.rotation.z = rz;
  return (visible = true) => { rest.visible = visible && !held.visible; };
}
function hold(o: THREE.Object3D, f: Frame | null, keys: string[], hand: 'l' | 'r' = 'r') {
  o.visible = !!f && keys.includes(f.b.key); if (o.visible) place(o, f!.h[hand]);
}
const middle = (f: Frame) => F.between(f.h.l, f.h.r, 0.5);

/** Adult visitor or family member. Separate upper/lower arms solve a two-bone reach;
 * hands accepting produce are the same targets the offered bag is moved towards. */
function person(g: THREE.Object3D, p: F.V, shirt: string, hat = false) {
  const root = group(g, ...p);
  for (const s of [-1, 1]) {
    part(root, cyl(0.055, 0.048, 0.73, 10), '#47594e', s * 0.09, 0.44, 0);
    part(root, rbox(0.12, 0.1, 0.23, 0.026), '#463e32', s * 0.09, 0.06, 0.045);
  }
  part(root, rbox(0.32, 0.18, 0.23, 0.05), '#47594e', 0, 0.86, 0);
  part(root, rbox(0.36, 0.45, 0.23, 0.07), shirt, 0, 1.10, 0);
  part(root, box(0.075, 0.09, 0.006), CREAM, -0.09, 1.17, 0.119, { outline: false });
  for (let i = 0; i < 4; i++) part(root, ball(0.007), CREAM, 0, 0.98 + i * 0.09, 0.121, { outline: false });
  part(root, cyl(0.045, 0.048, 0.08, 10), SKIN, 0, 1.36, 0);
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.116), SKIN, 0, 0, 0);
  part(head, ball(0.122), '#45362d', 0, 0.04, -0.03);
  part(head, rbox(0.20, 0.045, 0.05, 0.014), '#45362d', 0, 0.069, 0.08);
  for (const s of [-1, 1]) part(head, ball(0.009), INK, s * 0.042, 0, 0.109, { outline: false });
  part(head, box(0.034, 0.007, 0.004), '#aa695a', 0, -0.045, 0.111, { outline: false });
  if (hat) {
    part(head, cyl(0.19, 0.20, 0.025, 24), END, 0, 0.07, 0);
    part(head, cyl(0.105, 0.13, 0.09, 18), '#d2b47c', 0, 0.12, 0);
    part(head, cyl(0.13, 0.13, 0.023, 18), DARK, 0, 0.085, 0);
  }
  const arms = [-1, 1].map(s => {
    const upper = dynamicRod(root, 0.043, shirt), lower = dynamicRod(root, 0.033, SKIN);
    const hand = part(root, ball(0.035), SKIN, 0, 0, 0, { outline: false });
    return (target: F.V) => {
      const shoulder = v(s * 0.20, 1.29, 0), to = F.v(target), d = to.clone().sub(shoulder);
      const len = Math.min(0.515, Math.max(0.03, d.length())); d.normalize(); to.copy(shoulder).addScaledVector(d, len);
      const a = 0.27, b = 0.25, c = THREE.MathUtils.clamp((a * a + len * len - b * b) / (2 * a * len), -1, 1);
      const bend = v(s * 0.5, -1, -0.2); bend.addScaledVector(d, -bend.dot(d)).normalize();
      const elbow = shoulder.clone().addScaledVector(d, a * c).addScaledVector(bend, a * Math.sqrt(1 - c * c));
      upper(shoulder.toArray() as [number, number, number], elbow.toArray() as [number, number, number]);
      lower(elbow.toArray() as [number, number, number], to.toArray() as [number, number, number]); hand.position.copy(to);
    };
  });
  return { root, head, pose(t: number, key: string, receive = false) {
    const talking = ['reply', 'listen', 'pay'].includes(key);
    head.rotation.x = talking ? 0.07 * F.wave(t, 0.8) : 0.06;
    head.rotation.y = key === 'point' ? -0.20 : 0;
    arms[0](receive ? [-0.10, 1.12, 0.40] : [-0.22, talking ? 1.06 : 0.86, talking ? 0.25 : 0.08]);
    arms[1](receive ? [0.10, 1.12, 0.40] : talking ? [0.18, 1.15 + 0.05 * F.wave(t), 0.29] : [0.22, 0.86, 0.08]);
  } };
}

/** Two planted rows per bed. Leaves sit in visible soil holes in black mulch, with
 * irrigation running beside the stems. The foreground station is an accessible furrow. */
const cropField: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(2.94, 0.12, 0.90, 0.07), SOIL, 0, 0.06, 0);
  const plants: THREE.Group[] = [];
  for (const z of [-0.22, 0.21]) {
    part(g, rbox(2.82, 0.10, 0.31, 0.06), '#70543b', 0, 0.15, z);
    part(g, rbox(2.84, 0.012, 0.32, 0.025), MULCH, 0, 0.204, z);
    for (let i = 0; i < 8; i++) {
      const x = -1.23 + i * 0.35;
      part(g, cyl(0.067, 0.067, 0.004, 14), '#916b45', x, 0.213, z, { outline: false });
      // Empty central front hole is filled by the seedling during tending.
      if (z > 0 && (i === 3 || i === 4)) continue;
      if (z < 0 && i > 3) plants.push(vine(g, [x, 0.215, z], i > 5, 0.85));
      else plants.push(cabbage(g, [x, 0.215, z], 0.74 + (i % 3) * 0.07, i < 3));
    }
    tube(g, [[-1.42, 0.219, z + 0.09], [-0.4, 0.222, z + 0.09], [0.5, 0.218, z + 0.09], [1.42, 0.22, z + 0.09]], 0.009, '#1b2926');
    for (let i = 0; i < 8; i++) part(g, cyl(0.012, 0.012, 0.012, 8), BLUE, -1.23 + i * 0.35, 0.23, z + 0.09, { outline: false });
  }
  tube(g, [[-1.43, 0.22, -0.32], [-1.43, 0.22, 0.30], [-1.37, 0.1, 0.42]], 0.014, INK);
  for (let i = 0; i < 24; i++) part(g, ball(0.016 + i % 3 * 0.004), i % 2 ? '#a58c62' : '#826340', -1.40 + i * 0.12, 0.08, 0.44, { outline: false }).scale.y = 0.55;
  for (const [x, title] of [[-1.13, '상추'], [-0.53, '배추'], [0.63, '고추'], [1.17, '토마토']] as const) {
    rod(g, v(x, 0.1, -0.39), v(x, 0.58, -0.39), 0.012, END);
    label(g, title, 0.29, 0.10, x, 0.58, -0.375, CREAM, DARK);
  }
  const activeCrop = cabbage(g, [0, 0.215, 0.16], 1.0);
  const plug = seedling(g, F.FIELD.tray, 0.65);
  part(plug, cyl(0.035, 0.025, 0.06, 10), SOIL, 0, -0.03, 0);
  const weed = seedling(g, [0.15, 0.22, 0.27], 0.7);
  const removed = group(g, -0.40, 0.11, 0.5);
  for (let i = 0; i < 3; i++) seedling(removed, [i * 0.025, 0, 0], 0.35).rotation.z = Math.PI / 2 + i * 0.2;
  const tool = hoe(g), parkHoe = parked(g, tool, [-0.67, 0.16, 0.43]);
  const can = wateringCan(g); place(can, F.FIELD.can);
  const tray = group(g, -0.42, 0.11, 0.49);
  part(tray, box(0.30, 0.035, 0.18), DARK, 0, 0.0175, 0);
  for (let i = 0; i < 6; i++) {
    part(tray, cyl(0.035, 0.026, 0.065, 10), SOIL, -0.1 + i % 3 * 0.1, 0.05, -0.045 + Math.floor(i / 3) * 0.09);
    if (i !== 4) seedling(tray, [-0.1 + i % 3 * 0.1, 0.083, -0.045 + Math.floor(i / 3) * 0.09], 0.35);
  }
  const picked = cabbage(g, [0, 0, 0], 0.72); picked.visible = false;
  const basketRoot = basket(g, F.FIELD.basket);
  const contents = Array.from({ length: 5 }, (_, i) => cabbage(basketRoot, [Math.sin(i * 2.4) * 0.09, 0.018, Math.cos(i * 2.4) * 0.08], 0.45, i % 2 === 0));
  const snips = group(g);
  for (const s of [-1, 1]) {
    part(snips, ring(0.025, 0.007), RED, s * 0.027, 0, 0.01, { rx: Math.PI / 2 });
    part(snips, box(0.01, 0.007, 0.12), STEEL, s * 0.016, -0.01, -0.06, { ry: s * 0.2 });
  }
  const parkSnips = parked(g, snips, [0.72, 0.16, 0.42], 0);
  const drops = Array.from({ length: 14 }, () => glowing(g, ball(0.011), '#a5d9e3', 0, 0, 0));
  const damp = part(g, cyl(0.12, 0.12, 0.003, 18), '#403a2c', 0, 0.217, 0.16, { outline: false });
  // Tall hail-net hoops clear the tomato stakes as well as the low leafy row.
  const hoop = group(g);
  for (const x of [-1.05, 0, 1.05]) tube(hoop, [[x, 0.20, 0.39], [x, 1.17, 0.25], [x, 1.31, 0], [x, 1.17, -0.25], [x, 0.20, -0.39]], 0.008, STEEL);
  const meshGeo = new THREE.PlaneGeometry(2.75, 1, 18, 12);
  const a = meshGeo.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const z = a.getY(i) * 0.78;
    a.setXYZ(i, a.getX(i), 0.23 + 1.08 * Math.pow(Math.max(0, Math.cos(z / 0.78 * Math.PI)), 0.25), z);
  }
  meshGeo.computeVertexNormals();
  const coverMat = new THREE.MeshBasicMaterial({ color: '#dce7cb', transparent: true, opacity: 0.40, side: THREE.DoubleSide, depthWrite: false });
  const cover = new THREE.Mesh(meshGeo, coverMat); cover.userData.ownGeometry = cover.userData.ownMaterial = true; g.add(cover);
  const roll = part(g, cyl(0.06, 0.06, 2.70, 16), '#d9dfc7', 0, 0.23, -0.39, { rz: Math.PI / 2 });
  const pegs = [-0.85, 0.85].map(x => part(g, cyl(0.009, 0.009, 0.15, 8), '#afac8a', x, 0.21, 0.30));
  // Portable soil kit on a low folding stand, only opened for the science task.
  const kit = group(g, -0.33, 0, 0.55);
  part(kit, box(0.40, 0.025, 0.27), GREEN, 0, 0.65, 0);
  for (const x of [-0.16, 0.16]) rod(kit, v(x, 0.1, -0.1), v(-x, 0.64, 0.1), 0.012, STEEL);
  clipboard(kit, [0, 0.674, 0], '토양 / pH');
  const writing = marks(kit, [-0.09, 0.690, 0.0], 4);
  const pencil = pen(g), vial = group(g);
  part(vial, cyl(0.024, 0.024, 0.12, 12), '#e8e2bf', 0, -0.025, 0);
  const solution = part(vial, cyl(0.025, 0.025, 0.045, 12), '#9da762', 0, -0.055, 0, { outline: false });
  const bottle = group(g);
  part(bottle, cyl(0.027, 0.027, 0.10, 12), CREAM, 0, -0.04, 0);
  part(bottle, cyl(0.011, 0.011, 0.035, 10), RED, 0, 0.024, 0);
  const chart = group(g);
  part(chart, box(0.18, 0.005, 0.15), PAPER, 0, 0, 0);
  for (let i = 0; i < 4; i++) part(chart, box(0.031, 0.003, 0.08), ['#bd8c59', '#c2b966', '#88a660', '#729e99'][i], -0.06 + i * 0.04, 0.005, 0, { outline: false });
  const result = display(kit, ['토양 검사', 'pH 6.5 양호'], [0, 0.85, -0.08], 0.35, 0.085);
  animate(g, out, { tendCrops: 'fmTend', harvestCrops: 'fmHarvest', coverCrops: 'fmCover', farmer_soilTest: 'fmSoil' }, f => {
    const key = f?.b.key ?? '', tend = f?.m === 'fmTend', harvest = f?.m === 'fmHarvest', soil = f?.m === 'fmSoil', covering = f?.m === 'fmCover';
    hold(tool, tend ? f : soil ? f : null, ['hoe', 'hole', 'scoop', 'vial']); parkHoe(!covering);
    // Clear the furrow before walking sideways to the hail-net pegs.
    can.visible = basketRoot.visible = tray.visible = !covering;
    hold(snips, harvest ? f : null, ['cut']); parkSnips(!covering);
    snips.rotation.y = key === 'cut' ? 0.15 * F.wave(f!.t, 2) : 0;
    activeCrop.visible = !tend && (!harvest || f!.b.i < 2);
    plug.visible = !!tend;
    if (tend && f) place(plug, key === 'plug' ? f.h.r : f.b.i > 3 ? F.add(F.FIELD.plant, 0, 0.02) : F.FIELD.tray);
    weed.visible = !!tend && f!.b.i <= 1;
    if (tend && key === 'pull') place(weed, f!.h.r); else place(weed, [0.15, 0.22, 0.27]);
    removed.visible = !!tend && f!.b.i >= 2;
    damp.visible = !!tend && f!.b.i >= 6;
    place(can, tend && ['liftCan', 'water', 'return'].includes(key) ? f!.h.r : F.FIELD.can);
    can.rotation.z = tend && key === 'water' ? 0.24 : 0;
    drops.forEach((d, i) => {
      d.visible = !!tend && key === 'water';
      const u = ((f?.t ?? 0) * 1.8 + i / drops.length) % 1;
      const nozzle = v(-0.34, -0.02, 0).applyEuler(can.rotation).add(can.position);
      d.position.set(F.mix(nozzle.x, Math.sin(i * 2.4) * 0.08, u), F.mix(nozzle.y, 0.23, u * u), F.mix(nozzle.z, 0.16 + Math.cos(i * 2.4) * 0.06, u));
    });
    picked.visible = !!harvest && ['lift', 'basket', 'next'].includes(key);
    if (picked.visible) place(picked, F.add(key === 'next' ? f!.h.r : middle(f!), 0, -0.07));
    place(basketRoot, harvest && key === 'carry' ? F.add(middle(f!), 0, -0.16) : F.FIELD.basket);
    contents.forEach((m, i) => m.visible = !!harvest && i < (f!.b.i >= 5 ? 4 : f!.b.i >= 4 ? 2 : 0));
    hoop.visible = cover.visible = !!covering;
    cover.scale.x = covering ? key === 'unroll' ? Math.max(0.05, f!.b.u) : 1 : 1;
    cover.scale.z = covering && key === 'spread' ? 0.2 + 0.8 * f!.b.u : 1;
    roll.position.z = covering ? key === 'spread' ? F.mix(0.3, -0.39, f!.b.u) : -0.39 : -0.39;
    pegs.forEach((p, i) => { p.visible = !!covering && f!.b.i >= 2 + i; p.position.y = key === (i ? 'pegRight' : 'pegLeft') ? 0.25 - 0.08 * F.sm(f!.b.u) : 0.17; });
    kit.visible = vial.visible = chart.visible = bottle.visible = !!soil;
    place(vial, soil && ['shake', 'compare'].includes(key) ? f!.h.r : soil && ['vial', 'dose'].includes(key) ? f!.h.l : [-0.10, 0.70, 0.45]);
    place(chart, soil && key === 'compare' ? f!.h.l : [-0.33, 0.71, 0.55]);
    place(bottle, soil && key === 'dose' ? f!.h.r : [-0.54, 0.75, 0.48]);
    bottle.rotation.z = key === 'dose' ? Math.PI : 0; vial.rotation.z = key === 'shake' ? 0.2 * F.wave(f!.t, 3) : 0;
    solution.visible = !!soil && f!.b.i >= 2;
    hold(pencil, soil ? f : null, ['write']); writing.forEach((m, i) => m.visible = key === 'write' && f!.b.u > i / 4);
    result.set(key === 'compare' || key === 'write' ? 1 : 0);
    // Stable variation across all nine patches; no random rebuilding every frame.
    const wp = g.getWorldPosition(new THREE.Vector3());
    const stage = 0.78 + ((Math.round(wp.x) + Math.round(wp.z)) % 3) * 0.08;
    plants.forEach((p, i) => { p.scale.setScalar(stage); p.rotation.z = 0.012 * Math.sin((f?.t ?? 0) + i * 0.6); });
  });
  // Spraying (xwPestControl): down the furrow, so what stands in it is put away.
  const spraying = sprayKit(g, out.work!);
  out.spots!.xwPestControl = spraying.spot;
  const fieldAway = out.away!;
  out.away = (o, t) => {
    fieldAway(o, t);
    if (spraying.update(t)) {
      tool.visible = snips.visible = can.visible = basketRoot.visible = tray.visible = false;
      parkHoe(false);
      parkSnips(false);
    }
  };
};

/** Compact diesel tractor: the complete assembly, driver marker and controls travel
 * together. The empty service lane beside the fields is reserved for this journey. */
const tractor: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const car = group(g), wheels: THREE.Group[] = [];
  part(car, box(0.64, 0.15, 1.38), '#444b47', 0, 0.38, -0.03);
  part(car, rbox(0.56, 0.43, 0.76, 0.09), RED, 0, 0.77, -0.47);
  part(car, rbox(0.53, 0.07, 0.77, 0.025), '#db6550', 0, 1.01, -0.47);
  part(car, box(0.44, 0.25, 0.016), DARK, 0, 0.77, -0.861);
  for (let i = 0; i < 9; i++) part(car, box(0.025, 0.23, 0.018), STEEL, -0.18 + i * 0.045, 0.77, -0.874);
  part(car, rbox(0.80, 0.1, 0.12, 0.025), INK, 0, 0.43, -0.94);
  for (const x of [-0.22, 0.22]) part(car, cyl(0.07, 0.07, 0.026, 16), CREAM, x, 0.94, -0.865, { rx: Math.PI / 2 });
  for (const rear of [false, true]) for (const side of [-1, 1]) {
    const radius = rear ? 0.36 : 0.235, z = rear ? 0.43 : -0.66;
    const wheel = group(car, side * (rear ? 0.53 : 0.46), radius, z); wheels.push(wheel);
    part(wheel, cyl(radius, radius, rear ? 0.23 : 0.16, 24), '#30362f', 0, 0, 0, { rz: Math.PI / 2 });
    part(wheel, cyl(radius * 0.52, radius * 0.52, rear ? 0.243 : 0.173, 18), CREAM, 0, 0, 0, { rz: Math.PI / 2 });
    part(wheel, cyl(0.07, 0.07, rear ? 0.255 : 0.185, 12), RED, 0, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      const tread = group(wheel, 0, Math.cos(a) * radius, Math.sin(a) * radius); tread.rotation.x = a;
      for (const s of [-1, 1]) part(tread, box(rear ? 0.14 : 0.10, 0.033, 0.045), '#252e27', s * 0.05, 0, 0, { ry: s * 0.45 });
    }
    if (rear) part(car, rbox(0.29, 0.045, 0.79, 0.025), RED, side * 0.52, 0.81, 0.41);
  }
  part(car, box(0.46, 0.04, 0.62), '#6b7771', 0, 0.47, 0.27);
  for (const side of [-1, 1]) {
    part(car, box(0.23, 0.045, 0.24), STEEL, side * 0.43, 0.28, 0.22);
    for (let i = 0; i < 4; i++) part(car, box(0.19, 0.008, 0.009), INK, side * 0.43, 0.307, 0.14 + i * 0.045);
    rod(car, v(side * 0.31, 0.5, 0.07), v(side * 0.31, 1.1, 0.01), 0.022, INK);
    part(car, box(0.09, 0.03, 0.13), DARK, side * 0.15, 0.51, -0.14, { rx: -0.3 });
  }
  part(car, cyl(0.07, 0.07, 0.27, 12), INK, 0, 0.63, 0.28);
  part(car, rbox(0.39, 0.10, 0.35, 0.045), '#323d35', 0, 0.77, 0.28);
  part(car, rbox(0.40, 0.35, 0.065, 0.04), '#323d35', 0, 0.98, 0.55, { rx: 0.08 });
  rod(car, v(0, 0.62, -0.23), v(0, 1.17, -0.06), 0.025, INK);
  const wheel = group(car, 0, 1.17, -0.06); wheel.rotation.x = -0.5;
  part(wheel, ring(0.15, 0.018), INK, 0, 0, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 3; i++) rod(wheel, v(0, 0, 0), v(Math.sin(i * 2.094) * 0.14, 0, Math.cos(i * 2.094) * 0.14), 0.009, STEEL);
  const dash = group(car, 0, 1.03, -0.24);
  part(dash, box(0.34, 0.16, 0.06), DARK, 0, 0, 0);
  for (const x of [-0.09, 0.07]) {
    part(dash, cyl(0.048, 0.048, 0.007, 16), CREAM, x, 0, 0.034, { rx: Math.PI / 2 });
    rod(dash, v(x, 0, 0.04), v(x + 0.025, 0.02, 0.04), 0.003, RED);
  }
  const lever = group(car, 0.26, 0.63, 0.11);
  rod(lever, v(0, 0, 0), v(0.02, 0.28, 0.01), 0.012, STEEL);
  part(lever, ball(0.032), INK, 0.02, 0.28, 0.01);
  for (const x of [-0.37, 0.37]) rod(car, v(x, 0.7, 0.61), v(x, 1.92, 0.61), 0.031, DARK);
  rod(car, v(-0.37, 1.92, 0.61), v(0.37, 1.92, 0.61), 0.031, DARK);
  part(car, rbox(1.03, 0.06, 1.08, 0.06), RED, 0, 1.98, 0.23);
  label(car, '해솔밭 26', 0.46, 0.12, 0, 0.65, 0.74, CREAM, DARK);
  label(car, '저속 작업', 0.42, 0.10, 0, 1.95, 0.79, CREAM, DARK);
  rod(car, v(0.23, 1, -0.56), v(0.23, 1.62, -0.56), 0.026, INK);
  part(car, cyl(0.04, 0.04, 0.18, 12), '#59645d', 0.23, 1.35, -0.56);
  const hitch = group(car, 0, 0.3, 0.87);
  for (const x of [-0.25, 0.25]) rod(hitch, v(x, 0, -0.1), v(x, 0, 0.30), 0.025, STEEL);
  part(hitch, box(1.05, 0.07, 0.11), RED, 0, 0.04, 0.32);
  for (let i = 0; i < 5; i++) tube(hitch, [[-0.44 + i * 0.22, 0.04, 0.32], [-0.44 + i * 0.22, -0.12, 0.38], [-0.44 + i * 0.22, -0.22, 0.49]], 0.018, STEEL);
  const lamps = group(car); out.inUse = lamps;
  for (const x of [-0.22, 0.22]) glowing(lamps, ball(0.046), '#ffe8a1', x, 0.94, -0.884);
  const smoke = Array.from({ length: 5 }, () => part(car, ball(0.035), '#b5beb1', 0, 0, 0, { outline: false }));
  const tracks = group(g);
  for (const x of [-0.53, 0.53]) for (let i = 0; i < 25; i++) part(tracks, box(0.19, 0.003, 0.035), '#817557', x, 0.012, -i * 0.24, { ry: i % 2 ? 0.3 : -0.3, outline: false });
  animate(g, out, { plowField: 'fmDrive' }, f => {
    const d = F.tractorAt(f?.t ?? 0); car.position.z = f ? d.z : 0;
    if (f) { place(f.s.at, d.at); f.s.how = d.seated ? 'sit' : 'stand'; f.s.drop = d.seated ? 0.35 : 0; }
    wheels.forEach(w => w.rotation.x = car.position.z / (w.position.y || 0.3));
    wheel.rotation.y = f && ['out', 'back'].includes(f.b.key) ? 0.06 * F.wave(f.t, 0.4) : 0;
    hitch.rotation.x = -0.28 * (1 - (f ? d.plow : 0));
    lever.rotation.x = f && ['lower', 'park'].includes(f.b.key) ? 0.3 * F.sm(f.b.u) : 0;
    lamps.visible = !!f && d.engine; tracks.visible = !!f && f.b.i >= 3;
    tracks.children.forEach(p => p.visible = !f || f.b.key !== 'out' || p.position.z >= d.z);
    smoke.forEach((p, i) => { const u = ((f?.t ?? 0) * 0.6 + i / 5) % 1; p.visible = !!f && d.engine; p.position.set(0.23 + u * 0.12, 1.65 + u * 0.35, -0.56); p.scale.setScalar(0.4 + u); });
  });
};

/** Folding carton with independent flaps. Contents, tape and local-food label are
 * installed in order; the packed carton leaves the table in both hands. */
function carton(g: THREE.Object3D, p: F.V) {
  const root = group(g, ...p), cardboard = '#c49b65';
  part(root, box(0.43, 0.018, 0.32), cardboard, 0, 0, 0);
  for (const s of [-1, 1]) {
    part(root, box(0.43, 0.19, 0.012), cardboard, 0, 0.10, s * 0.16);
    part(root, box(0.012, 0.19, 0.32), cardboard, s * 0.215, 0.10, 0);
  }
  const flaps = [-1, 1].map(s => {
    const hinge = group(root, 0, 0.20, s * 0.16);
    part(hinge, box(0.43, 0.012, 0.16), cardboard, 0, 0, s * 0.08); return hinge;
  });
  const tape = part(root, box(0.055, 0.003, 0.33), '#ddbc7c', 0, 0.211, 0);
  const sticker = flat(root, '로컬푸드 · 해솔밭', 0.28, 0.09, [0, 0.215, 0.07]);
  label(root, '오늘 수확  ↑', 0.30, 0.07, 0, 0.10, 0.168, CREAM, DARK);
  return { root, tape, sticker, flaps };
}
const packingTable: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  packingSupplies(g);
  bench(g); label(g, '선별 · 포장 / 로컬푸드', 1.12, 0.13, 0, 0.77, 0.415, CREAM, DARK);
  const supply = crate(g, [-0.61, 0.93, -0.04], '당일 수확', GREEN, 0.42, 0.40);
  const stock = Array.from({ length: 4 }, (_, i) => cabbage(supply, [-0.10 + i % 2 * 0.2, 0.10, -0.10 + Math.floor(i / 2) * 0.17], 0.52, i % 2 === 0));
  const c = carton(g, [0, 0.93, 0.10]);
  const fill = Array.from({ length: 4 }, (_, i) => cabbage(c.root, [-0.10 + i % 2 * 0.19, 0.05, -0.07 + Math.floor(i / 2) * 0.14], 0.43, true));
  const held = cabbage(g, [0, 0, 0], 0.56, true);
  const gun = group(g);
  part(gun, ring(0.055, 0.022), '#dfbf84', 0, 0.03, 0, { rx: Math.PI / 2 });
  part(gun, box(0.035, 0.12, 0.045), RED, 0.03, -0.04, 0);
  part(gun, box(0.10, 0.015, 0.07), STEEL, -0.03, 0.01, -0.05);
  const parkGun = parked(g, gun, [0.58, 0.95, 0.20], 0);
  const peel = flat(g, '로컬푸드', 0.17, 0.07, [0.52, 0.96, -0.13]);
  part(g, cyl(0.055, 0.055, 0.16, 16), PAPER, 0.61, 0.99, -0.19, { rz: Math.PI / 2 });
  const stack = carton(g, [0.62, 0.31, 0]); stack.flaps.forEach((m, i) => m.rotation.x = i ? Math.PI : -Math.PI);
  flat(g, '생산자  황보람 / 해솔밭', 0.4, 0.11, [-0.45, 0.314, 0.05]);
  const sheet = clipboard(g, [0, 0.925, 0.15], '공동 출하 회의', 0.48, 0.30);
  const ink = marks(sheet, [-0.15, 0.016, -0.025], 6), pencil = pen(g);
  const chart = group(g, 0.40, 0.93, -0.16);
  part(chart, box(0.42, 0.27, 0.018), PAPER, 0, 0.135, 0);
  label(chart, '출하량 / 주간', 0.35, 0.055, 0, 0.24, 0.012, PAPER, DARK);
  for (let i = 0; i < 4; i++) part(chart, box(0.04, 0.05 + i * 0.035, 0.005), i === 3 ? RED : GREEN, -0.12 + i * 0.08, 0.04 + (0.05 + i * 0.035) / 2, 0.013);
  const partner = person(g, [0, 0, -0.73], '#a77c56', true);
  const ledger = display(g, ['선별 대기', '포장 중', '출하 준비'], [-0.50, 1.30, -0.20], 0.41, 0.09);
  rod(g, v(-0.50, 0.95, -0.21), v(-0.50, 1.30, -0.21), 0.012, STEEL);
  out.screen = ledger.mesh; useLight(g, out, [-0.28, 1.30, -0.20]);
  animate(g, out, { packProduce: 'fmPack', farmer_coopMeeting: 'fmMeeting' }, f => {
    const meeting = f?.m === 'fmMeeting', key = f?.b.key ?? '', u = f?.b.u ?? 0;
    partner.root.visible = sheet.visible = chart.visible = !!meeting;
    partner.pose(f?.t ?? 0, key); c.root.visible = !meeting; supply.visible = !meeting;
    hold(pencil, meeting ? f : null, ['write']);
    ink.forEach((m, i) => m.visible = !!meeting && (key === 'write' ? u > i / 6 : f!.b.n > 0));
    c.flaps.forEach((m, i) => m.rotation.x = (i ? 1 : -1) * Math.PI * (f?.m === 'fmPack' && f.b.i >= 3 ? key === 'fold' ? F.sm(u) : 1 : 0));
    c.tape.visible = !!f && !meeting && (f.b.i > 4 || key === 'tape' && u > 0.3);
    c.tape.scale.z = key === 'tape' ? Math.max(0.01, u) : 1;
    c.sticker.visible = !!f && !meeting && (f.b.i > 5 || key === 'label' && u > 0.7);
    fill.forEach((m, i) => m.visible = !!f && !meeting && (f.b.i > 2 || key === 'fill' && u > i / 4));
    stock.forEach((m, i) => m.visible = !f || meeting || f.b.i < 2 || key === 'fill' && u < (3 - i) / 4);
    held.visible = !!f && !meeting && ['grade', 'fill'].includes(key);
    if (held.visible) place(held, F.add(key === 'fill' ? f!.h.r : middle(f!), 0, -0.04));
    hold(gun, meeting ? null : f, ['tape']); parkGun();
    place(peel, f && key === 'label' ? F.add(f.h.r, 0, -0.015) : [0.52, 0.96, -0.13]);
    peel.visible = !meeting && !c.sticker.visible;
    place(c.root, f && key === 'stack' ? F.add(middle(f), 0, -0.15) : [0, 0.93, 0.10]);
    ledger.set(!f || meeting ? 0 : f.b.i >= 5 ? 2 : 1);
  });
};

const farmStand: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g, 1.88, 0.91, 0.78);
  for (const x of [-0.89, 0.89]) {
    part(g, box(0.065, 2.05, 0.065), WOOD, x, 1.025, -0.26);
    rod(g, v(x, 1.6, -0.26), v(x, 1.94, 0.34), 0.02, DARK);
  }
  for (let i = 0; i < 8; i++) part(g, box(0.25, 0.035, 1.0), i % 2 ? CREAM : GREEN, -0.875 + i * 0.25, 2.03, 0, { rx: -0.08 });
  part(g, box(2.0, 0.16, 0.025), GREEN, 0, 1.92, 0.49);
  label(g, FARM, 1.64, 0.13, 0, 1.92, 0.51, GREEN, CREAM);
  label(g, '오늘 딴 채소 · 제철의 맛', 1.2, 0.12, 0, 0.72, 0.409, CREAM, DARK);
  const vegetables = crate(g, [-0.57, 0.92, -0.09], '배추 · 상추', GREEN, 0.51, 0.40);
  for (let i = 0; i < 4; i++) cabbage(vegetables, [-0.12 + i % 2 * 0.24, 0.10, -0.10 + Math.floor(i / 2) * 0.19], 0.6, i < 2);
  const reds = crate(g, [0.59, 0.30, 0.02], '토마토', RED, 0.48, 0.36);
  for (let i = 0; i < 8; i++) tomato(reds, [-0.14 + i % 3 * 0.14, 0.12, -0.1 + Math.floor(i / 3) * 0.10]);
  const movable = crate(g, [-0.52, 0.30, 0.04], '고추', GREEN, 0.40, 0.31);
  for (let i = 0; i < 6; i++) pepper(movable, [-0.12 + i % 3 * 0.12, 0.15, -0.07 + Math.floor(i / 3) * 0.12]).rotation.z = 1.2;
  const scale = group(g, 0.16, 0.92, 0.08);
  part(scale, rbox(0.33, 0.07, 0.30, 0.025), BLUE, 0, 0.035, 0);
  part(scale, box(0.29, 0.018, 0.26), STEEL, 0, 0.09, 0);
  const weight = display(scale, ['0.00 kg', '0.62 kg', '1.20 kg'], [0, 0.05, 0.157], 0.24, 0.045); out.screen = weight.mesh;
  useLight(g, out, [0.29, 0.96, 0.24]);
  const till = group(g, 0.61, 0.93, 0.12);
  part(till, rbox(0.25, 0.05, 0.22, 0.015), '#7d8b7b', 0, 0, 0);
  for (let i = 0; i < 9; i++) part(till, box(0.04, 0.012, 0.032), CREAM, -0.065 + i % 3 * 0.065, 0.03, -0.06 + Math.floor(i / 3) * 0.05);
  const total = display(g, ['직거래', '6,000 원', '출하 12상자', '거래 완료'], [0.59, 1.16, -0.14], 0.41, 0.09);
  rod(g, v(0.59, 0.92, -0.15), v(0.59, 1.16, -0.15), 0.013, DARK);
  const board = group(g, -0.63, 1.45, -0.25);
  part(board, box(0.58, 0.37, 0.03), WOOD, 0, 0, 0);
  label(board, '배추 3,000 / 상추 2,000', 0.54, 0.11, 0, 0.08, 0.021, DARK, CREAM);
  label(board, '고추 1봉  4,000원', 0.54, 0.11, 0, -0.07, 0.021, DARK, CREAM);
  const price = flat(g, '오늘 수확', 0.29, 0.10, [0.44, 0.93, -0.10]);
  const cloth = part(g, rbox(0.15, 0.012, 0.12, 0.01), '#c8dca7', 0.72, 0.94, 0.16);
  const produce = cabbage(g, F.STAND.produce, 0.64, true);
  const bag = group(g, 0.1, 0.98, 0.19);
  part(bag, rbox(0.26, 0.25, 0.15, 0.015), '#dcc499', 0, -0.04, 0);
  for (const z of [-0.05, 0.05]) part(bag, ring(0.07, 0.005, Math.PI), WOOD, 0, 0.085, z);
  label(bag, '해솔밭', 0.18, 0.07, 0, -0.03, 0.079, CREAM, DARK);
  cabbage(bag, [0, 0.055, 0], 0.48, true);
  const visitor = person(g, [0, 0, -0.66], '#8199b0');
  const money = flat(g, '5,000', 0.12, 0.055, [0, 1.13, -0.23], '#c6cf9b');
  const document = clipboard(g, F.STAND.page, '로컬푸드 출하 약정', 0.38, 0.28);
  const writing = marks(document, [-0.11, 0.015, 0], 4), pencil = pen(g);
  const map = clipboard(g, F.STAND.page, '밭 → 육묘 → 수확', 0.38, 0.28);
  for (let i = 0; i < 3; i++) part(map, box(0.075, 0.003, 0.09), [LEAF, BLUE, RED][i], -0.12 + i * 0.12, 0.014, 0.035);
  const leaf = seedling(g, [0, 0, 0], 0.8);
  const leaflet = flat(g, '해솔밭 / 제철 달력', 0.22, 0.14, [0, 1, 0]);
  animate(g, out, { arrangeStand: 'fmArrange', fmSellProduce: 'fmSell', fmGuideTour: 'fmTour', farmer_exportDeal: 'fmDeal' }, f => {
    const m = f?.m, key = f?.b.key ?? '', u = f?.b.u ?? 0;
    visitor.root.visible = !!f && m !== 'fmArrange';
    visitor.pose(f?.t ?? 0, key, key === 'give');
    document.visible = m === 'fmDeal'; map.visible = m === 'fmTour';
    leaf.visible = m === 'fmTour' && ['leaf', 'explain'].includes(key);
    if (leaf.visible) place(leaf, F.add(f!.h.l, 0.04, -0.05));
    leaflet.visible = m === 'fmTour' && key === 'give';
    if (leaflet.visible) place(leaflet, f!.h.r);
    hold(pencil, m === 'fmDeal' ? f : null, ['sign']);
    writing.forEach((p, i) => p.visible = key === 'give' || key === 'sign' && u > i / 4);
    place(document, f && m === 'fmDeal' && key === 'give' ? F.add(middle(f), 0, -0.02) : F.STAND.page);
    produce.visible = m !== 'fmTour' && !(m === 'fmSell' && f!.b.i >= 3);
    place(produce, f && ['choose', 'sample', 'lift', 'face'].includes(key) ? F.add(middle(f), 0, -0.06) : m === 'fmSell' && key === 'weigh' ? F.add(F.STAND.scale, 0, 0.02) : F.STAND.produce);
    place(movable, f && m === 'fmArrange' && key === 'crate' ? F.add(middle(f), 0, -0.15) : [-0.52, 0.30, 0.04]);
    bag.visible = m === 'fmSell' && f!.b.i >= 3;
    place(bag, f && key === 'give' ? F.add(middle(f), 0, -0.10) : [0.13, 1.12, 0.19]);
    money.visible = m === 'fmSell' && key === 'pay';
    place(money, f && key === 'pay' ? f.h.r : [0, 1.13, -0.23]);
    place(price, f && key === 'price' ? F.add(f.h.r, 0, -0.01) : [0.44, 0.93, -0.10]);
    place(cloth, f && key === 'wipe' ? F.add(f.h.r, 0, -0.02) : [0.72, 0.94, 0.16]);
    weight.set(m === 'fmSell' && f!.b.i >= 2 ? key === 'weigh' && u < 0.45 ? 1 : 2 : 0);
    total.set(m === 'fmDeal' && f!.b.i >= 2 ? key === 'give' ? 3 : 2 : m === 'fmSell' && f!.b.i >= 2 ? key === 'give' ? 3 : 1 : 0);
  });
};

function packet(g: THREE.Object3D, p: F.V, name: string, color = GREEN) {
  const root = group(g, ...p);
  part(root, box(0.13, 0.19, 0.015), CREAM, 0, 0, 0);
  label(root, name, 0.115, 0.055, 0, 0.055, 0.009, color, PAPER);
  part(root, ball(0.034), color, 0, -0.025, 0.012, { outline: false }).scale.set(1.3, 1, 0.15);
  label(root, '해솔 종자', 0.11, 0.035, 0, -0.068, 0.010, CREAM, DARK);
  return root;
}

/** A readable planting calendar, with row dividers and crop-coloured months.
 * The transparent indicator moves separately from the printed board. */
function calendar(g: THREE.Object3D, p: F.V) {
  const root = group(g, ...p);
  part(root, box(0.76, 0.48, 0.025), WOOD, 0, 0, 0);
  part(root, box(0.71, 0.43, 0.005), PAPER, 0, 0, 0.016);
  label(root, '해솔밭  파종 · 수확 달력', 0.67, 0.055, 0, 0.175, 0.021, PAPER, DARK);
  const months = ['3월', '5월', '7월', '9월'];
  const names = ['상추', '배추', '고추'];
  for (let col = 0; col < 4; col++) {
    label(root, months[col], 0.105, 0.045, -0.13 + col * 0.125, 0.10, 0.022, PAPER, DARK);
  }
  for (let row = 0; row < 3; row++) {
    const y = 0.02 - row * 0.085;
    label(root, names[row], 0.13, 0.05, -0.265, y, 0.022, PAPER, DARK);
    part(root, box(0.66, 0.002, 0.002), '#c8c8ae', 0, y - 0.04, 0.022);
    for (let col = 0; col < 4; col++) {
      if ((row + col) % 3 === 0) continue;
      part(root, box(0.08, 0.028, 0.003), col < 2 ? GREEN : RED, -0.13 + col * 0.125, y, 0.024);
    }
  }
  return root;
}

/** Hanging weather instruments are intentionally physical dials, with a small
 * ventilation fan which answers the active nursery's irrigation cycle. */
function nurseryClimate(g: THREE.Object3D) {
  const root = group(g, -1.07, 1.22, -0.60);
  part(root, rbox(0.22, 0.40, 0.035, 0.018), CREAM, 0, 0, 0);
  label(root, '육묘 온도', 0.18, 0.05, 0, 0.15, 0.022, CREAM, DARK);
  part(root, box(0.018, 0.21, 0.008), '#b9d3c6', -0.035, -0.01, 0.025);
  part(root, box(0.009, 0.14, 0.009), RED, -0.035, -0.045, 0.031);
  part(root, ball(0.024), RED, -0.035, -0.13, 0.031, { outline: false });
  for (let i = 0; i < 7; i++) {
    part(root, box(i % 2 ? 0.025 : 0.04, 0.002, 0.002), DARK, 0.02, -0.10 + i * 0.03, 0.023);
  }
  label(root, '24°C', 0.085, 0.045, 0.052, -0.15, 0.024, CREAM, DARK);
  const housing = group(g, 1.05, 1.47, -0.78);
  part(housing, rbox(0.34, 0.34, 0.08, 0.035), CREAM, 0, 0, 0);
  part(housing, cyl(0.14, 0.14, 0.025, 20), DARK, 0, 0, 0.052, { rx: Math.PI / 2 });
  const rotor = group(housing, 0, 0, 0.073);
  part(rotor, ball(0.027), STEEL, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const blade = group(rotor, 0, 0, 0, 0); blade.rotation.z = i * Math.PI / 2;
    part(blade, rbox(0.055, 0.12, 0.009, 0.015), '#9bada4', 0.026, 0.064, 0, { rz: -0.30 });
  }
  for (const r of [0.06, 0.105, 0.145]) part(housing, ring(r, 0.003), STEEL, 0, 0, 0.085);
  label(housing, '통풍', 0.19, 0.05, 0, -0.23, 0.05, CREAM, DARK);
  return rotor;
}

/** Paper twine spool with its free end. It belongs beside cartons, never in the
 * same hand as the tape dispenser. Additional empty cartons fit below the bench. */
function packingSupplies(g: THREE.Object3D) {
  const spool = group(g, 0.79, 0.98, -0.22);
  part(spool, cyl(0.055, 0.055, 0.12, 14), '#c7b88e', 0, 0, 0);
  for (let i = 0; i < 8; i++) part(spool, ring(0.055, 0.003), '#a49670', 0, -0.05 + i * 0.014, 0, { rx: Math.PI / 2, outline: false });
  tube(g, [[0.79, 0.94, -0.22], [0.74, 0.925, -0.12], [0.80, 0.925, 0]], 0.003, '#c7b88e');
  for (let i = 0; i < 5; i++) {
    part(g, box(0.45, 0.014, 0.38), i % 2 ? '#c8a16a' : '#b58e5d', -0.15, 0.31 + i * 0.016, -0.02);
    part(g, box(0.003, 0.001, 0.37), '#917549', -0.15, 0.318 + i * 0.016, -0.02);
  }
  label(g, '종이 상자 / 재사용', 0.48, 0.065, -0.18, 0.26, 0.36, CREAM, DARK);
}

/** A little notebook shelf and rain hat make the family work stations lived in. */
function fieldAccessories(g: THREE.Object3D) {
  const peg = group(g, 0.77, 1.32, -0.22);
  rod(peg, v(0, 0, -0.08), v(0, 0, 0.06), 0.01, STEEL);
  const hat = group(peg, 0, -0.09, 0.09); hat.rotation.x = 1.15;
  part(hat, cyl(0.12, 0.125, 0.015, 20), '#d8bf8c', 0, 0, 0);
  part(hat, cyl(0.065, 0.083, 0.07, 16), END, 0, 0.036, 0);
  part(hat, ring(0.083, 0.006), DARK, 0, 0.015, 0, { rx: Math.PI / 2 });
  tube(peg, [[-0.06, -0.13, 0.05], [-0.05, -0.28, 0.06], [0.06, -0.13, 0.05]], 0.003, DARK);
}
const seedShelf: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-0.43, 0.43]) part(g, box(0.045, 1.75, 0.52), GREEN, x, 0.875, -0.17);
  part(g, box(0.88, 1.75, 0.025), '#bba47b', 0, 0.875, -0.43);
  for (const y of [0.12, 0.48, 0.92, 1.30, 1.68]) part(g, box(0.91, 0.035, y === 0.92 ? 0.87 : 0.54), WOOD, 0, y, y === 0.92 ? -0.02 : -0.17);
  label(g, '씨앗 도서관', 0.72, 0.13, 0, 1.78, -0.37, CREAM, DARK);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
    const name = ['상추', '배추', '고추', '토마토', '들깨'][col];
    packet(g, [-0.33 + col * 0.165, 1.08 + row * 0.38, -0.22], name, col < 2 ? GREEN : col < 4 ? RED : '#a48b56');
    part(g, box(0.014, 0.19, 0.28), WOOD, -0.41 + col * 0.165, 1.05 + row * 0.38, -0.17);
  }
  for (let i = 0; i < 3; i++) {
    part(g, cyl(0.08, 0.08, 0.18, 14), '#c7d1b8', -0.26 + i * 0.26, 0.60, -0.12);
    part(g, cyl(0.084, 0.084, 0.02, 14), DARK, -0.26 + i * 0.26, 0.70, -0.12);
    label(g, ['콩', '옥수수', '완두'][i], 0.11, 0.06, -0.26 + i * 0.26, 0.60, -0.033, PAPER, DARK);
  }
  const active = packet(g, F.SEED.packet, '상추');
  const dish = group(g, ...F.SEED.dish);
  part(dish, cyl(0.10, 0.075, 0.025, 18), CREAM, 0, -0.01, 0);
  const seeds = Array.from({ length: 12 }, (_, i) => part(dish, ball(0.007), '#887044', Math.sin(i * 2.4) * 0.065, 0.009, Math.cos(i * 2.4) * 0.065, { outline: false }));
  const grains = Array.from({ length: 6 }, () => part(g, ball(0.006), '#887044', 0, 0, 0, { outline: false }));
  const sorted = packet(g, F.SEED.sorted, '분류 완료'); sorted.rotation.x = -Math.PI / 2;
  const book = clipboard(g, F.SEED.page, '봄 · 여름 · 가을', 0.42, 0.30);
  const seasons = ['봄 파종', '여름 관리', '가을 수확'].map((s, i) => flat(book, s, 0.11, 0.12, [-0.135 + i * 0.135, 0.014, 0.015], [LIGHT, '#e9d083', '#daaa72'][i]));
  const cursor = part(book, box(0.11, 0.003, 0.012), RED, -0.135, 0.018, 0.08);
  const pencil = pen(g), notes = marks(book, [-0.14, 0.018, 0.10], 3);
  animate(g, out, { sortSeeds: 'fmSeeds', farmer_learnSeasons: 'fmSeasons' }, f => {
    const seasonal = f?.m === 'fmSeasons', key = f?.b.key ?? '', u = f?.b.u ?? 0;
    book.visible = !!seasonal; dish.visible = !seasonal; active.visible = !seasonal;
    place(active, f && !seasonal && ['packet', 'read', 'pour', 'seal', 'shelf'].includes(key) ? f.h.l : F.SEED.packet);
    active.rotation.z = key === 'pour' ? -1.8 : 0;
    active.rotation.x = key === 'read' ? -0.3 : 0;
    sorted.visible = !seasonal && (!f || f.b.i >= 3);
    seeds.forEach((s, i) => s.visible = !f || f.b.i >= 3 || key === 'pour' && u > i / 12);
    grains.forEach((s, i) => { s.visible = key === 'pour'; if (f) { const p = F.between(f.h.l, F.SEED.dish, (u * 3 + i / 6) % 1); place(s, p); } });
    cursor.position.x = key === 'summer' ? 0 : key === 'autumn' || key === 'write' ? 0.135 : -0.135;
    seasons.forEach(s => s.visible = !!seasonal);
    hold(pencil, seasonal ? f : null, ['write']); notes.forEach((s, i) => s.visible = key === 'write' && u > i / 3 || key === 'close');
  });
};

/** Open-front vinyl house: translucent side/rear skins keep the seedlings readable. */
const fmGreenhouse: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const fan = nurseryClimate(g);
  calendar(g, [0, 1.38, -0.83]);
  part(g, box(2.90, 0.035, 1.85), '#b6aa7f', 0, 0.018, 0);
  const clear = new THREE.MeshBasicMaterial({ color: '#c9e1d2', transparent: true, opacity: 0.19, side: THREE.DoubleSide, depthWrite: false });
  for (const z of [-0.86, -0.20, 0.45]) {
    tube(g, [[-1.4, 0, z], [-1.39, 1.2, z], [-0.98, 1.92, z], [0, 2.22, z], [0.98, 1.92, z], [1.39, 1.2, z], [1.4, 0, z]], 0.017, STEEL);
  }
  for (const x of [-1.4, 1.4]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.2), clear); mesh.position.set(x, 0.61, -0.05); mesh.rotation.y = Math.PI / 2; mesh.userData.ownGeometry = true; g.add(mesh);
    rod(g, v(x, 0.5, -0.88), v(x, 0.5, 0.85), 0.013, STEEL);
  }
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(2.78, 1.3), clear); rear.position.set(0, 0.67, -0.88); rear.userData.ownGeometry = true; g.add(rear);
  for (const x of [-0.97, 0, 0.97]) rod(g, v(x, x ? 1.94 : 2.22, -0.9), v(x, x ? 1.94 : 2.22, 0.48), 0.011, STEEL);
  part(g, cyl(0.055, 0.055, 2.78, 18), '#c5d9c5', 0, 1.92, 0.47, { rz: Math.PI / 2 });
  label(g, '해솔밭 육묘장', 1.10, 0.17, 0, 2.04, 0.50, GREEN, CREAM);
  const back = group(g, 0, 0, -0.49); bench(back, 2.55, 0.65, 0.47);
  for (let i = 0; i < 12; i++) {
    const x = -1.14 + i * 0.205;
    part(g, cyl(0.075, 0.055, 0.12, 12), '#685b42', x, 0.72, -0.49);
    seedling(g, [x, 0.79, -0.49], 0.6 + i % 3 * 0.2);
  }
  const front = group(g, 0, 0, 0.58); bench(front, 2.12, 0.91, 0.49);
  const tray = group(g, ...F.SOW.tray);
  part(tray, box(0.53, 0.045, 0.30), DARK, 0, -0.03, 0);
  const cells: THREE.Mesh[] = [], sprouts: THREE.Group[] = [], seeds: THREE.Mesh[] = [];
  for (let i = 0; i < 15; i++) {
    const x = -0.20 + i % 5 * 0.1, z = -0.1 + Math.floor(i / 5) * 0.10;
    part(tray, cyl(0.044, 0.034, 0.047, 10), '#263c31', x, -0.012, z);
    cells.push(part(tray, cyl(0.037, 0.037, 0.006, 10), SOIL, x, 0.013, z));
    sprouts.push(seedling(tray, [x, 0.015, z], 0.2));
    seeds.push(part(tray, ball(0.011), '#efe2b4', x, 0.019, z, { outline: false }));
  }
  const scoop = group(g);
  part(scoop, cyl(0.018, 0.018, 0.13, 8), WOOD, 0, 0, 0);
  part(scoop, rbox(0.09, 0.02, 0.13, 0.025), STEEL, 0, -0.07, -0.04);
  const restScoop = parked(g, scoop, [-0.63, 0.98, 0.70]);
  const soilbag = group(g, -0.64, 0.96, 0.56);
  part(soilbag, rbox(0.30, 0.21, 0.24, 0.04), CREAM, 0, 0.07, 0);
  label(soilbag, '육묘 상토', 0.24, 0.07, 0, 0.07, 0.125, GREEN, PAPER);
  part(soilbag, cyl(0.10, 0.10, 0.008, 14), SOIL, 0, 0.18, 0);
  const dibber = group(g); part(dibber, cyl(0.005, 0.014, 0.20, 8), WOOD, 0, -0.07, 0);
  const restDibber = parked(g, dibber, [0.47, 0.94, 0.48]);
  const seedPacket = packet(g, [-0.24, 1.14, 0.7], '상추');
  const spray = group(g, ...F.SOW.spray);
  part(spray, cyl(0.055, 0.05, 0.17, 12), BLUE, 0, -0.09, 0);
  part(spray, box(0.10, 0.04, 0.04), CREAM, -0.025, 0.015, 0);
  part(spray, box(0.018, 0.045, 0.025), RED, -0.04, -0.02, 0);
  const mist = Array.from({ length: 15 }, () => glowing(g, ball(0.006), '#c2eff0', 0, 0, 0));
  const tag = group(g, 0.42, 1.07, 0.70);
  part(tag, box(0.018, 0.17, 0.006), CREAM, 0, -0.06, 0);
  label(tag, '상추 10/28', 0.15, 0.055, 0, 0.035, 0.007, PAPER, DARK);
  const temp = display(g, ['육묘 24°C', '관수 중', '파종 완료'], [0.96, 1.24, 0.60], 0.40, 0.10);
  rod(g, v(0.96, 0.93, 0.58), v(0.96, 1.24, 0.58), 0.012, STEEL);
  out.screen = temp.mesh; useLight(g, out, [1.18, 1.24, 0.60]);
  animate(g, out, { fmSowTray: 'fmSow' }, f => {
    const key = f?.b.key ?? '', u = f?.b.u ?? 0;
    hold(scoop, f, ['soil', 'cover']); restScoop(); hold(dibber, f, ['dibble']); restDibber();
    seedPacket.visible = key === 'seed'; if (f) place(seedPacket, f.h.l);
    place(spray, f && key === 'mist' ? f.h.r : F.SOW.spray);
    spray.rotation.z = key === 'mist' ? 0.3 : 0;
    cells.forEach((c, i) => c.visible = !f || f.b.i > 0 || u > i / 15);
    sprouts.forEach(s => s.visible = false);
    // Dropped one to a cell, then covered with a pinch of soil.
    seeds.forEach((s, i) => s.visible = key === 'seed' ? u > i / 15 : key === 'cover' && u < 1 - i / 15);
    place(tag, f && key === 'tag' ? f.h.r : [0.42, 1.07, 0.70]);
    mist.forEach((p, i) => { const q = (u * 3 + i / 15) % 1; p.visible = key === 'mist'; if (f) place(p, F.add(f.h.r, -0.06 - q * 0.28, -q * 0.23, (i % 3 - 1) * q * 0.06)); });
    temp.set(key === 'mist' ? 1 : key === 'tag' ? 2 : 0);
    fan.rotation.z = f ? f.t * 7 : 0;
  });
};

const fmCompost: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-0.88, 0.23, 0.88]) for (const z of [-0.36, 0.36]) part(g, box(0.055, 0.93, 0.055), DARK, x, 0.465, z);
  for (let i = 0; i < 7; i++) for (const z of [-0.36, 0.36]) part(g, box(1.79, 0.09, 0.025), i % 2 ? WOOD : END, 0, 0.10 + i * 0.115, z);
  for (const x of [-0.88, 0.23, 0.88]) for (let i = 0; i < 7; i++) part(g, box(0.025, 0.09, 0.72), WOOD, x, 0.10 + i * 0.115, 0);
  label(g, '퇴비 / 낙엽 + 채소', 0.95, 0.13, -0.25, 0.59, 0.38, CREAM, DARK);
  label(g, '숙성', 0.38, 0.12, 0.56, 0.59, 0.38, GREEN, CREAM);
  part(g, box(1.03, 0.30, 0.65), SOIL, -0.31, 0.65, 0);
  part(g, box(0.57, 0.40, 0.65), '#514b33', 0.56, 0.62, 0);
  const scraps = group(g);
  for (let i = 0; i < 25; i++) {
    const p = part(scraps, ball(0.035), i % 3 ? '#a78945' : LEAF, -0.8 + i % 7 * 0.15, 0.82 + i % 2 * 0.02, -0.25 + Math.floor(i / 7) * 0.15, { outline: false }); p.scale.set(1.3, 0.2, 0.7); p.rotation.y = i * 1.3;
  }
  const lid = group(g, -0.31, 0.92, -0.36);
  for (let i = 0; i < 6; i++) part(lid, box(1.10, 0.025, 0.125), WOOD, 0, 0, 0.06 + i * 0.12);
  rod(lid, v(-0.15, 0.025, 0.61), v(0.15, 0.025, 0.61), 0.018, DARK);
  const fork = group(g);
  rod(fork, v(0, 0.14, 0), v(0, -0.37, -0.07), 0.014, WOOD);
  rod(fork, v(-0.10, -0.37, -0.07), v(0.10, -0.37, -0.07), 0.012, STEEL);
  for (const x of [-0.09, -0.03, 0.03, 0.09]) rod(fork, v(x, -0.37, -0.07), v(x, -0.52, -0.11), 0.009, STEEL);
  const restFork = parked(g, fork, [0.85, 1.04, 0.28], -0.15);
  const brown = basket(g, [-0.58, 0.24, 0.5]);
  for (let i = 0; i < 8; i++) part(brown, ball(0.045), '#a28143', Math.sin(i) * 0.1, 0.02, Math.cos(i) * 0.1, { outline: false }).scale.y = 0.2;
  const leaf = cabbage(g, [0, 0, 0], 0.5, true);
  const probe = group(g); rod(probe, v(0, 0.03, 0), v(0, -0.30, 0), 0.005, STEEL);
  part(probe, cyl(0.043, 0.043, 0.022, 16), CREAM, 0, 0.02, 0, { rx: Math.PI / 2 });
  label(probe, '55°', 0.06, 0.035, 0, 0.02, 0.014, PAPER, RED);
  const notebook = clipboard(g, [0.57, 0.84, 0], '온도 55°C / 뒤집기', 0.38, 0.25);
  const pencil = pen(g), written = marks(notebook, [-0.11, 0.015, 0], 4);
  const steam = Array.from({ length: 4 }, () => part(g, ball(0.026), '#d1d1b8', 0, 0, 0, { outline: false }));
  animate(g, out, { fmTurnCompost: 'fmCompost' }, f => {
    const key = f?.b.key ?? '', u = f?.b.u ?? 0;
    lid.rotation.x = !f ? 0 : key === 'lid' ? -1.4 * F.sm(u) : key === 'close' ? -1.4 * (1 - F.sm(u)) : -1.4;
    hold(fork, f, ['turn']); restFork();
    if (fork.visible) { place(fork, F.between(f!.h.l, f!.h.r, 0.6)); fork.rotation.z = 0.16 * F.wave(f!.t, 0.7); }
    place(brown, f && key === 'brown' ? F.add(middle(f), 0, -0.10) : [-0.58, 0.24, 0.50]); brown.rotation.z = key === 'brown' ? u * 0.7 : 0;
    leaf.visible = key === 'green'; if (leaf.visible) place(leaf, f!.h.r);
    hold(probe, f, ['probe']);
    place(notebook, f && key === 'record' ? F.add(f.h.l, 0.12, -0.025) : [0.57, 0.84, 0]);
    hold(pencil, f, ['record']); written.forEach((p, i) => p.visible = key === 'record' && u > i / 4 || key === 'close');
    scraps.rotation.y = key === 'turn' ? 0.06 * F.wave(f!.t, 0.7) : 0;
    steam.forEach((p, i) => { const q = ((f?.t ?? 0) * 0.3 + i / 4) % 1; p.visible = !!f && f.b.i > 0 && f.b.i < 6; p.position.set(-0.3 + Math.sin(i * 2) * 0.2, 0.85 + q * 0.5, 0); p.scale.setScalar(0.4 + q); });
  });
};

const fmWaterTank: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, box(1.85, 0.08, 0.82), '#b2b0a0', 0, 0.04, 0);
  const tank = group(g, 0.47, 0, -0.05);
  part(tank, cyl(0.34, 0.34, 1.30, 24), BLUE, 0, 0.74, 0);
  for (const y of [0.18, 0.45, 0.74, 1.03, 1.32]) part(tank, ring(0.343, 0.014), '#507e89', 0, y, 0, { rx: Math.PI / 2 });
  part(tank, cyl(0.15, 0.15, 0.045, 20), DARK, 0, 1.415, 0);
  label(tank, '해솔밭 / 관수용', 0.47, 0.13, 0, 1.02, 0.347, CREAM, DARK);
  label(tank, '500 L', 0.26, 0.11, 0, 0.78, 0.347, BLUE, PAPER);
  tube(g, [[0.2, 0.30, 0.1], [-0.25, 0.30, 0.1], [-0.32, 0.60, 0.1], [-0.32, 1.05, 0.1]], 0.035, STEEL);
  part(g, cyl(0.12, 0.12, 0.32, 16), GREEN, -0.57, 0.38, 0.05, { rz: Math.PI / 2 });
  part(g, box(0.36, 0.09, 0.30), DARK, -0.57, 0.19, 0.05);
  for (let i = 0; i < 7; i++) part(g, ring(0.123, 0.006), DARK, -0.68 + i * 0.035, 0.38, 0.05, { ry: Math.PI / 2 });
  rod(g, v(-0.65, 0.3, -0.2), v(-0.65, 1.25, -0.2), 0.02, STEEL);
  const controls = group(g, -0.60, 0.9, 0.13);
  part(controls, rbox(0.28, 0.26, 0.14, 0.025), CREAM, 0, 0, 0);
  part(controls, cyl(0.026, 0.026, 0.015, 12), GREEN, 0.02, -0.03, 0.08, { rx: Math.PI / 2 });
  label(controls, '펌프', 0.18, 0.06, 0, 0.075, 0.075, CREAM, DARK);
  const valve = group(g, ...F.WATER.valve);
  part(valve, ring(0.072, 0.009), RED, 0, 0, 0);
  for (let i = 0; i < 3; i++) rod(valve, v(0, 0, 0), v(Math.sin(i * 2.094) * 0.07, Math.cos(i * 2.094) * 0.07, 0), 0.006, RED);
  const gauge = group(g, -0.16, 1.21, 0.21);
  part(gauge, cyl(0.085, 0.085, 0.028, 20), STEEL, 0, 0, 0, { rx: Math.PI / 2 });
  part(gauge, cyl(0.073, 0.073, 0.005, 20), PAPER, 0, 0, 0.018, { rx: Math.PI / 2 });
  const needle = group(gauge, 0, 0, 0.024); rod(needle, v(0, 0, 0), v(-0.04, 0.035, 0), 0.003, RED);
  label(gauge, 'bar', 0.05, 0.025, 0, -0.035, 0.025, PAPER, DARK);
  const filter = group(g, ...F.WATER.filter);
  part(filter, cyl(0.055, 0.055, 0.18, 14), '#b4d5cd', 0, -0.06, 0);
  part(filter, cyl(0.065, 0.065, 0.025, 14), DARK, 0, 0.04, 0);
  tube(g, [[-0.32, 1.05, 0.12], [-0.05, 1.05, 0.12], [0.12, 0.82, 0.12], [0.12, 0.78, 0.27]], 0.025, STEEL);
  tube(g, [[0.12, 0.65, 0.27], [0.15, 0.20, 0.34], [-0.45, 0.09, 0.4], [-0.9, 0.06, 0.39]], 0.018, DARK);
  const coil = group(g, 0.48, 0.50, 0.33);
  for (let i = 0; i < 4; i++) part(coil, ring(0.18 + i * 0.013, 0.012), '#647c42', 0, 0, i * 0.02);
  const loose = dynamicRod(g, 0.013, '#647c42');
  const flow = Array.from({ length: 7 }, () => glowing(g, ball(0.013), '#c8eeee', 0, 0, 0));
  const lcd = display(g, ['대기 0.0 bar', '가동 1.8 bar', '필터 점검', '관수 완료'], [-0.57, 1.11, 0.21], 0.40, 0.08);
  out.screen = lcd.mesh; const lamp = useLight(g, out, [-0.49, 0.88, 0.215]);
  animate(g, out, { fmIrrigate: 'fmWater' }, f => {
    const key = f?.b.key ?? '', u = f?.b.u ?? 0, on = !!f && f.b.i >= 2 && f.b.i < 5;
    valve.rotation.z = f ? f.b.i > 1 ? Math.PI * 3 : key === 'valve' ? u * Math.PI * 3 : 0 : 0;
    needle.rotation.z = on ? -1.4 + 0.04 * F.wave(f!.t, 4) : 0; lamp.visible = on;
    filter.rotation.y = key === 'filter' ? 0.8 * F.wave(f!.t, 1.6) : 0;
    loose([0.48, 0.5, 0.38], f && key === 'coil' ? f.h.r : [0.38, 0.60, 0.32], key === 'coil');
    coil.rotation.z = key === 'coil' ? u * Math.PI * 4 : 0;
    flow.forEach((p, i) => { p.visible = on; const q = ((f?.t ?? 0) + i / 7) % 1; p.position.set(0.12, 0.67 + q * 0.14, 0.326); });
    lcd.set(key === 'filter' ? 2 : key === 'stop' || key === 'coil' ? 3 : on ? 1 : 0);
  });
};

const fmPepperRack: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g, 1.88, 0.79, 0.79);
  part(g, box(1.73, 0.01, 0.67), '#d9c18b', 0, 0.80, 0);
  for (let i = 0; i < 29; i++) part(g, box(0.003, 0.003, 0.66), '#b39b62', -0.84 + i * 0.06, 0.807, 0, { outline: false });
  for (let i = 0; i < 11; i++) part(g, box(1.72, 0.003, 0.003), '#af9359', 0, 0.807, -0.30 + i * 0.06, { outline: false });
  label(g, '햇볕에 천천히 · 고추 말리기', 1.38, 0.13, 0, 0.64, 0.41, CREAM, DARK);
  const pods = Array.from({ length: 24 }, (_, i) => {
    const p = pepper(g, [-0.65 + i % 8 * 0.18, 0.84, -0.24 + Math.floor(i / 8) * 0.17], 0.80);
    p.rotation.x = Math.PI / 2; p.rotation.z = i % 3 * 0.2; return p;
  });
  const basketRoot = basket(g, [-0.57, 0.96, 0.06]);
  for (let i = 0; i < 5; i++) pepper(basketRoot, [Math.sin(i * 2) * 0.1, 0.02, Math.cos(i * 2) * 0.1], 0.7).rotation.z = 1.1;
  const picked = pepper(g, [0, 0, 0], 0.9);
  const sack = group(g, 0.53, 0.93, 0.12);
  part(sack, rbox(0.25, 0.25, 0.20, 0.04), '#d3b98c', 0, -0.02, 0);
  const tie = part(sack, ring(0.04, 0.006), CREAM, 0, 0.12, 0, { rx: Math.PI / 2 });
  label(sack, '건고추', 0.17, 0.07, 0, -0.02, 0.105, CREAM, RED);
  const date = clipboard(g, [0.36, 0.82, 0.21], '건조일 10/28', 0.26, 0.17);
  const pencil = pen(g), lines = marks(date, [-0.08, 0.017, 0], 3);
  const timer = display(g, ['뒤집기 전', '통풍 · 건조', '선별 완료'], [0.64, 1.16, -0.23], 0.43, 0.09);
  rod(g, v(0.64, 0.79, -0.24), v(0.64, 1.16, -0.24), 0.013, WOOD);
  animate(g, out, { fmDryPeppers: 'fmDry' }, f => {
    const key = f?.b.key ?? '', u = f?.b.u ?? 0;
    place(basketRoot, f && key === 'basket' ? F.add(middle(f), 0, -0.08) : [-0.57, 0.96, 0.06]);
    pods.forEach((p, i) => { p.visible = !f || f.b.i > 1 || i < 10 || key === 'spread' && u > (i - 10) / 14; p.rotation.z = key === 'turn' && i < u * 24 ? 0.9 : i % 3 * 0.2; });
    picked.visible = !!f && ['spread', 'turn', 'check', 'pick'].includes(key);
    if (picked.visible) place(picked, key === 'check' ? middle(f!) : f!.h.r);
    picked.rotation.z = key === 'check' ? 1.3 : key === 'turn' ? u * Math.PI : 0.4;
    place(sack, f && key === 'bag' ? F.add(middle(f), 0, -0.10) : [0.53, 0.93, 0.12]);
    tie.visible = !!f && (key === 'date' || key === 'bag' && u > 0.5);
    hold(pencil, f, ['date']); lines.forEach((p, i) => p.visible = key === 'date' && u > i / 3);
    timer.set(!f ? 0 : f.b.i >= 4 ? 2 : 1);
  });
};

/** Hooks carry actual differently shaped farm tools, not a single generic tool mesh. */
const fmToolShed: Builder = (g, _W, _D, _c, _def, _ctx, _out) => {
  fieldAccessories(g);
  part(g, box(1.88, 0.08, 0.85), '#898675', 0, 0.04, 0);
  for (const x of [-0.87, 0.87]) part(g, box(0.07, 1.75, 0.07), DARK, x, 0.91, -0.27);
  for (let i = 0; i < 12; i++) part(g, box(0.15, 1.65, 0.045), i % 2 ? WOOD : END, -0.825 + i * 0.15, 0.90, -0.32);
  part(g, box(2, 0.055, 1.02), GREEN, 0, 1.82, 0, { rx: -0.11 });
  label(g, '해솔밭 농기구 / 쓰고 제자리', 1.56, 0.14, 0, 1.63, -0.28, CREAM, DARK);
  for (const x of [-0.62, -0.20, 0.22, 0.62]) {
    tube(g, [[x, 1.38, -0.29], [x, 1.38, -0.19], [x, 1.43, -0.18]], 0.009, STEEL);
    flat(g, '정리', 0.13, 0.06, [x, 0.105, 0.1]);
  }
  const shovel = group(g, -0.62, 1.25, -0.15);
  rod(shovel, v(0, 0.05, 0), v(0, -0.77, 0), 0.018, WOOD);
  part(shovel, ring(0.055, 0.012), DARK, 0, 0.10, 0);
  part(shovel, rbox(0.19, 0.25, 0.025, 0.06), STEEL, 0, -0.85, 0);
  const rake = group(g, -0.20, 1.35, -0.15);
  rod(rake, v(0, 0, 0), v(0, -0.9, 0), 0.016, WOOD);
  rod(rake, v(-0.16, -0.90, 0), v(0.16, -0.90, 0), 0.014, STEEL);
  for (let i = 0; i < 7; i++) rod(rake, v(-0.15 + i * 0.05, -0.90, 0), v(-0.15 + i * 0.05, -1.00, 0.04), 0.008, STEEL);
  const mattock = group(g, 0.22, 1.35, -0.15);
  rod(mattock, v(0, 0, 0), v(0, -0.85, 0), 0.018, WOOD);
  part(mattock, box(0.29, 0.04, 0.11), STEEL, 0.06, -0.86, 0, { rz: 0.08 });
  const smallHoe = hoe(g); place(smallHoe, [0.64, 1.25, -0.16]);
  for (const x of [0.48, 0.68]) {
    part(g, cyl(0.063, 0.07, 0.26, 12), DARK, x, 0.22, 0.20);
    part(g, rbox(0.13, 0.10, 0.25, 0.03), DARK, x, 0.12, 0.26);
    part(g, cyl(0.05, 0.05, 0.008, 12), INK, x, 0.354, 0.20);
  }
  const can = wateringCan(g); place(can, [-0.55, 0.34, 0.20]);
  const gloves = group(g, 0.02, 0.10, 0.25);
  for (const s of [-1, 1]) {
    part(gloves, rbox(0.085, 0.018, 0.12, 0.02), CREAM, s * 0.055, 0, 0);
    for (let i = 0; i < 4; i++) part(gloves, box(0.014, 0.014, 0.06), CREAM, s * 0.055 - 0.029 + i * 0.019, 0, -0.075);
  }
};

// 비닐하우스 (2026-11-05, the layout audit): a 단동 하우스 the size of the real ones, walked into, held by its footprint's middle.
const FILM = new THREE.MeshBasicMaterial({ color: '#eef6f0', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
const FILM_END = new THREE.MeshBasicMaterial({ color: '#eef6f0', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
const SHADE_NET = new THREE.MeshBasicMaterial({ color: '#30383a', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });

/**
 * A single-span plastic house along the footprint's long side: galvanised hoops every metre or so with purlins along the
 * ridge and the shoulders, the film over the top, the sides rolled up to the shoulder bar for air (as they are on a warm
 * day, so it is walked under and seen into), the film ends with a door gap in each, a black shade net half drawn over the
 * roof, the roll-up handles, and a name board at the front end. `sign` is what the board says.
 */
export function polyHouse(g: THREE.Group, W: number, D: number, sign = `${FARM} 1동`) {
  const a = group(g, 0, 0, 0, W > D ? Math.PI / 2 : 0);
  const half = Math.min(W, D) / 2 - 0.08;
  const L = Math.max(W, D) - 0.1;
  const H = Math.min(3.1, 1.6 + half * 0.55);
  const roll = Math.min(1.25, H * 0.42);
  const k = H / half;
  // The film: an arch over the top, open below the rolled sides.
  const A = Math.acos(roll / H);
  const film = new THREE.CylinderGeometry(half, half, L, 28, 1, true, -A, 2 * A).rotateX(-Math.PI / 2);
  film.scale(1, k, 1);
  const f = part(a, film, '#eef6f0', 0, 0, 0, { material: FILM, outline: false, shadow: false });
  f.userData.ownGeometry = true;
  // The shade net over the back half of the roof.
  const net = new THREE.CylinderGeometry(half + 0.03, half + 0.03, L * 0.48, 20, 1, true, -A * 0.75, A * 1.5).rotateX(-Math.PI / 2);
  net.scale(1, (H + 0.03) / (half + 0.03), 1);
  const n = part(a, net, '#30383a', 0, 0, -L * 0.24, { material: SHADE_NET, outline: false, shadow: false });
  n.userData.ownGeometry = true;
  // The hoops, each a chain of short pipes round the arch, driven into the ground.
  const at = (th: number, z: number) => v(half * Math.sin(th), k * half * Math.cos(th), z);
  const hoops = Math.max(2, Math.round(L / 1.1));
  for (let i = 0; i <= hoops; i++) {
    const z = -L / 2 + (i * L) / hoops;
    const segs = 10;
    for (let s = 0; s < segs; s++) {
      const t0 = -Math.PI / 2 + (s * Math.PI) / segs;
      const t1 = -Math.PI / 2 + ((s + 1) * Math.PI) / segs;
      rod(a, at(t0, z), at(t1, z), 0.022, '#c9d0d0');
    }
  }
  // The purlins: the ridge, either shoulder at the roll bar; the roll tubes with their cranks at the front.
  for (const th of [0, -A * 0.55, A * 0.55]) rod(a, at(th, -L / 2), at(th, L / 2), 0.02, '#b8c0c0');
  for (const s of [-1, 1]) {
    const p0 = v(s * half * Math.sin(A), roll, -L / 2), p1 = v(s * half * Math.sin(A), roll, L / 2);
    rod(a, p0, p1, 0.05, '#e3ece6');
    rod(a, v(p1.x, roll, L / 2), v(p1.x, 0.95, L / 2 + 0.05), 0.012, '#7b8585');
    part(a, box(0.16, 0.03, 0.03), '#c74c37', p1.x, 0.95, L / 2 + 0.06, { outline: false });
  }
  // The film ends: a sheet over the arch above the door frame each end, the door gap in the middle.
  for (const s of [-1, 1]) {
    const z = (s * L) / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    for (let j = 0; j <= 16; j++) {
      const th = -Math.PI / 2 + (j * Math.PI) / 16;
      shape.lineTo(half * Math.sin(th), k * half * Math.cos(th));
    }
    shape.lineTo(half, 0);
    shape.lineTo(0.6, 0);
    shape.lineTo(0.6, 2.0);
    shape.lineTo(-0.6, 2.0);
    shape.lineTo(-0.6, 0);
    shape.lineTo(-half, 0);
    const end = new THREE.ShapeGeometry(shape);
    const e = part(a, end, '#eef6f0', 0, 0, z, { material: FILM_END, outline: false, shadow: false });
    e.userData.ownGeometry = true;
    for (const x of [-0.6, 0.6]) part(a, box(0.05, 2.0, 0.05), '#b8c0c0', x, 1.0, z, { outline: false });
    part(a, box(1.25, 0.05, 0.05), '#b8c0c0', 0, 2.0, z, { outline: false });
  }
  // The name board on the front door frame, facing out.
  label(a, sign, 1.3, 0.24, 0, 2.25, L / 2 + 0.03, CREAM, DARK);
}

export const BUILDERS: Record<string, Builder> = {
  cropField, tractor, packingTable, farmStand, seedShelf,
  fmGreenhouse, fmCompost, fmWaterTank, fmPepperRack, fmToolShed,
  fmPolyHouse: (g, W, D) => polyHouse(g, W, D),
};
