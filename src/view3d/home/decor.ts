import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { marker, type Builder } from '../parts';
import { FLOOR_H } from '../house3d';
import { canvasTexture, gradient, part, textured } from '../toon';

/*
 * The things that stand everywhere, redone (2026-11-01, at the user's request; docs/workplaces/PIPELINE.md, 집 가구):
 * lamp, paintings and poster, plant, tree, bush, alarms, mailbox, urn, stairs. Workplaces and homes place these by the
 * hundred, so each is a mesh or two at a few hundred triangles: its parts are merged once into one geometry with its
 * colours in the vertices, shared by every copy and never disposed, and each picture is painted once. Nothing here runs
 * per frame: the lamp's shade is lot3d.ts's glow, what shows in use goes by Built.inUse. Rounded boxes are avoided (one
 * costs nearly 600 triangles). Paintings hang on the plane they always did and stairs climb as they always did, so dwellers
 * look at and walk on these just as before (kept by decor.test.ts).
 */

const VCOL = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient });

interface Opts {
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  /** Lower down it's this colour, blending up to its own (a canopy's shaded side). */
  under?: string;
}

const noise = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Parts gathered into one geometry, coloured by vertex. */
class Kit {
  private list: THREE.BufferGeometry[] = [];
  put(geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: Opts = {}) {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)), new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1)));
    const p = g.attributes.position;
    const top = new THREE.Color(color);
    const low = new THREE.Color(o.under ?? color);
    g.computeBoundingBox();
    const y0 = g.boundingBox!.min.y;
    const span = Math.max(1e-4, g.boundingBox!.max.y - y0);
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.copy(low).lerp(top, (p.getY(i) - y0) / span);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.list.push(g);
    return this;
  }
  box(w: number, h: number, d: number, color: string, x: number, y: number, z: number, o?: Opts) {
    return this.put(new THREE.BoxGeometry(w, h, d), color, x, y, z, o);
  }
  cyl(rt: number, rb: number, h: number, seg: number, color: string, x: number, y: number, z: number, o?: Opts) {
    return this.put(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, o);
  }
  /** A round thing in few triangles; `lumpy` pushes its surface about, so foliage doesn't read as a ball. */
  ball(r: number, w: number, h: number, color: string, x: number, y: number, z: number, o: Opts = {}, lumpy = 0) {
    const s = new THREE.SphereGeometry(r, w, h);
    if (lumpy) {
      const p = s.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const k = 1 + lumpy * (noise(Math.round(p.getX(i) * 500) + x, Math.round(p.getY(i) * 500) + y, Math.round(p.getZ(i) * 500) + z) - 0.5);
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
      }
      s.computeVertexNormals();
    }
    return this.put(s, color, x, y, z, o);
  }
  /** A round bar from one point to another. */
  rod(a: readonly [number, number, number], b: readonly [number, number, number], r: number, color: string, seg = 5, r2 = r) {
    const from = new THREE.Vector3(...a);
    const d = new THREE.Vector3(...b).sub(from);
    const g = new THREE.CylinderGeometry(r2, r, d.length(), seg);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    return this.put(g, color, from.x + d.x / 2, from.y + d.y / 2, from.z + d.z / 2);
  }
  /** Turned on a lathe: [radius, height] up from the foot. */
  lathe(profile: Array<[number, number]>, seg: number, color: string, x: number, y: number, z: number, under?: string) {
    return this.put(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg), color, x, y, z, { under });
  }
  done(): Made {
    const geom = mergeGeometries(this.list)!;
    this.list = [];
    geom.computeBoundingBox();
    const centre = geom.boundingBox!.getCenter(new THREE.Vector3());
    // About its own middle: an outline is the same shape scaled up about its origin.
    geom.translate(-centre.x, -centre.y, -centre.z);
    return { geom, centre };
  }
}

interface Made {
  geom: THREE.BufferGeometry;
  centre: THREE.Vector3;
}
const made = new Map<string, Made>();

/** One merged shape, made the first time it's asked for, drawn at (x, y, z) in `g`. */
function solid(g: THREE.Object3D, key: string, make: (k: Kit) => void, o: { outline?: boolean; x?: number; y?: number; z?: number } = {}): THREE.Mesh {
  let m = made.get(key);
  if (!m) {
    const kit = new Kit();
    make(kit);
    made.set(key, (m = kit.done()));
  }
  return part(g, m.geom, '#ffffff', m.centre.x + (o.x ?? 0), m.centre.y + (o.y ?? 0), m.centre.z + (o.z ?? 0), { material: VCOL, outline: o.outline ?? true });
}

/** The next of `n` looks: garden plants aren't told where they stand, and a row of one tree looks planted by a machine. */
const turns = new Map<string, number>();
function nextLook(id: string, n: number): number {
  const i = turns.get(id) ?? 0;
  turns.set(id, (i + 1) % n);
  return i;
}

// -------------------------------------------------------------------------------------------------
// Pictures: painted once, one material each.

type Rng = () => number;
const seeded = (seed: number): Rng => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
/** Short strokes of a brush over a shape's area, the colour varying a little: what makes a fill look painted. */
function dabs(c: CanvasRenderingContext2D, rng: Rng, n: number, x: number, y: number, w: number, h: number, colors: string[], len = 14, wide = 3, angle = 0, alpha = 0.5) {
  c.lineCap = 'round';
  c.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const px = x + rng() * w;
    const py = y + rng() * h;
    const a = angle + (rng() - 0.5) * 0.7;
    const l = len * (0.5 + rng());
    c.strokeStyle = colors[Math.floor(rng() * colors.length)];
    c.lineWidth = wide * (0.6 + rng() * 0.8);
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
    c.stroke();
  }
  c.globalAlpha = 1;
}
function hillPath(c: CanvasRenderingContext2D, W: number, H: number, y: number, amp: number, freq: number, phase: number) {
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase * 2) * amp * 0.3);
  c.lineTo(W, H);
  c.closePath();
}

/** An invented valley: a lake under two moons, terraced hills, a red-roofed house on stilts over the water, poplars. */
function paintLandscape(c: CanvasRenderingContext2D, W: number, H: number) {
  const rng = seeded(4711);
  const sky = c.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, '#5fa3b8');
  sky.addColorStop(0.6, '#f2c9a0');
  sky.addColorStop(1, '#f7e3b6');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  dabs(c, rng, 90, 0, 0, W, H * 0.42, ['#ffffff', '#ffe2c4', '#8fc0c9'], 30, 5, 0.05, 0.28);
  c.fillStyle = '#fff6dc';
  c.beginPath();
  c.arc(W * 0.72, H * 0.17, 21, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f0d7e2';
  c.beginPath();
  c.arc(W * 0.81, H * 0.11, 8, 0, Math.PI * 2);
  c.fill();
  // Three ranges, far to near.
  for (const [y, amp, freq, ph, col, dark] of [[0.42, 16, 0.016, 1, '#8ea9b8', '#7890a6'], [0.5, 13, 0.021, 2.6, '#6f9c78', '#55805f'], [0.58, 10, 0.013, 4.1, '#92ac55', '#6f8b3f']] as const) {
    hillPath(c, W, H, H * y, amp, freq, ph);
    c.fillStyle = col;
    c.fill();
    c.save();
    c.clip();
    dabs(c, rng, 90, 0, H * (y - 0.05), W, H * 0.22, [dark, col, '#d7cf8a'], 12, 3, -0.15, 0.55);
    c.restore();
  }
  // The lake with the sky in it.
  const lake = c.createLinearGradient(0, H * 0.64, 0, H);
  lake.addColorStop(0, '#d9dcc0');
  lake.addColorStop(1, '#3f7d90');
  c.fillStyle = lake;
  c.fillRect(0, H * 0.64, W, H * 0.36);
  dabs(c, rng, 110, 0, H * 0.65, W, H * 0.35, ['#ffffff', '#8fc0c9', '#2f6a7c', '#f2c9a0'], 22, 2, 0, 0.45);
  // Poplars on the near shore.
  for (const [x, h] of [[0.1, 76], [0.15, 60], [0.88, 70]] as const) {
    c.fillStyle = '#2f5d3f';
    c.beginPath();
    c.ellipse(W * x, H * 0.65 - h / 2, 10, h / 2, 0, 0, Math.PI * 2);
    c.fill();
    dabs(c, rng, 22, W * x - 8, H * 0.65 - h, 16, h, ['#4f8a55', '#1f4630'], 7, 2, -1.4, 0.7);
  }
  // The house on its stilts.
  const hx = W * 0.42;
  const hy = H * 0.57;
  c.strokeStyle = '#4a3324';
  c.lineWidth = 2.5;
  for (const dx of [6, 24, 42]) {
    c.beginPath();
    c.moveTo(hx + dx, hy + 22);
    c.lineTo(hx + dx, hy + 42);
    c.stroke();
  }
  c.fillStyle = '#f3e8cf';
  c.fillRect(hx, hy, 48, 24);
  c.fillStyle = '#b5432e';
  c.beginPath();
  c.moveTo(hx - 7, hy + 1);
  c.lineTo(hx + 24, hy - 21);
  c.lineTo(hx + 55, hy + 1);
  c.closePath();
  c.fill();
  c.fillStyle = '#54697a';
  c.fillRect(hx + 8, hy + 7, 10, 10);
  c.fillRect(hx + 30, hy + 7, 10, 10);
  // Its colours trembling on the water.
  dabs(c, rng, 18, hx - 4, hy + 44, 56, 30, ['#f3e8cf', '#b5432e'], 12, 2, 0, 0.5);
}

/** No school but its own: discs and arcs of thin colour on warm paper, a sweep of black, a spatter. */
function paintAbstract(c: CanvasRenderingContext2D, W: number, H: number, main: string) {
  const rng = seeded(90210);
  c.fillStyle = '#efe6d3';
  c.fillRect(0, 0, W, H);
  dabs(c, rng, 90, 0, 0, W, H, ['#e4d8c0', '#f7f0e0'], 30, 8, 0.4, 0.5);
  c.globalCompositeOperation = 'multiply';
  for (const [x, y, r, col] of [[0.34, 0.38, 0.3, main], [0.66, 0.56, 0.27, '#ef8a5f'], [0.5, 0.78, 0.17, '#e9c13f'], [0.8, 0.2, 0.12, '#7fb08a']] as const) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(W * x, H * y, W * r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  dabs(c, rng, 80, W * 0.1, H * 0.1, W * 0.5, H * 0.55, [main, '#ffffff', '#3e6f98'], 30, 5, 2.2, 0.28);
  c.lineCap = 'round';
  c.strokeStyle = '#201c1c';
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(W * 0.1, H * 0.82);
  c.bezierCurveTo(W * 0.35, H * 0.3, W * 0.55, H * 1.02, W * 0.9, H * 0.28);
  c.stroke();
  c.lineWidth = 3;
  c.beginPath();
  c.arc(W * 0.66, H * 0.56, W * 0.3, 3.5, 5.4);
  c.stroke();
  c.fillStyle = '#201c1c';
  for (let i = 0; i < 40; i++) {
    c.beginPath();
    c.arc(W * (0.55 + rng() * 0.4), H * (0.62 + rng() * 0.32), rng() * 2.4 + 0.4, 0, Math.PI * 2);
    c.fill();
  }
}

/** A cheeky peach in sunglasses and halftone, shouting: a made-up comic, no one's product. */
function paintPop(c: CanvasRenderingContext2D, W: number, H: number, main: string) {
  c.fillStyle = main;
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffd400';
  const step = 14;
  for (let y = 0; y < H + step; y += step)
    for (let x = (Math.round(y / step) % 2) * (step / 2); x < W + step; x += step) {
      c.beginPath();
      c.arc(x, y, 2 + (3.6 * y) / H, 0, Math.PI * 2);
      c.fill();
    }
  const [cx, cy] = [W * 0.5, H * 0.58];
  // A burst behind it.
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#111';
  c.lineWidth = 5;
  c.beginPath();
  for (let i = 0; i < 28; i++) {
    const r = (i % 2 ? 0.34 : 0.46) * W;
    const a = (i / 28) * Math.PI * 2;
    c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
  c.stroke();
  // The peach.
  const pr = W * 0.27;
  c.fillStyle = '#ff9a6b';
  c.beginPath();
  c.arc(cx, cy, pr, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#ff5f6f';
  c.beginPath();
  c.arc(cx + pr * 0.4, cy + pr * 0.35, pr * 0.55, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(cx, cy - pr);
  c.quadraticCurveTo(cx - pr * 0.35, cy - pr * 0.1, cx - pr * 0.05, cy + pr * 0.15);
  c.stroke();
  c.fillStyle = '#3fae57';
  c.beginPath();
  c.ellipse(cx + pr * 0.36, cy - pr * 1.08, pr * 0.42, pr * 0.2, -0.4, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // Its sunglasses and its grin.
  c.fillStyle = '#111';
  for (const dx of [-0.42, 0.42]) {
    c.beginPath();
    c.ellipse(cx + pr * dx, cy - pr * 0.1, pr * 0.34, pr * 0.24, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillRect(cx - pr * 0.2, cy - pr * 0.16, pr * 0.4, 5);
  c.fillStyle = '#fff';
  c.fillRect(cx - pr * 0.58, cy - pr * 0.2, pr * 0.2, 4);
  c.fillRect(cx + pr * 0.26, cy - pr * 0.2, pr * 0.2, 4);
  c.strokeStyle = '#111';
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(cx, cy + pr * 0.28, pr * 0.34, 0.2, Math.PI - 0.2);
  c.stroke();
  // The balloon.
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(W * 0.5, H * 0.14, W * 0.38, H * 0.1, 0, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 4;
  c.stroke();
  c.beginPath();
  c.moveTo(W * 0.42, H * 0.22);
  c.lineTo(W * 0.5, H * 0.32);
  c.lineTo(W * 0.56, H * 0.22);
  c.fill();
  c.fillStyle = '#e8235f';
  c.font = `900 ${Math.round(H * 0.11)}px "Malgun Gothic","Noto Sans KR",sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('뿅!', W * 0.5, H * 0.145);
  c.fillStyle = '#111';
  c.fillRect(0, H * 0.92, W, H * 0.08);
  c.fillStyle = '#ffd400';
  c.font = `800 ${Math.round(H * 0.045)}px "Malgun Gothic","Noto Sans KR",sans-serif`;
  c.fillText('말랑 복숭아 대소동', W * 0.5, H * 0.96);
}

/** An invented old master: a lady who never lived, in a teal coat with a white bird on her hand, the varnish gone golden. */
function paintMaster(c: CanvasRenderingContext2D, W: number, H: number) {
  const rng = seeded(1623);
  const bg = c.createRadialGradient(W * 0.42, H * 0.32, 20, W * 0.5, H * 0.5, H * 0.75);
  bg.addColorStop(0, '#6b5636');
  bg.addColorStop(0.55, '#33261a');
  bg.addColorStop(1, '#120c08');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  dabs(c, rng, 120, 0, 0, W, H, ['#4a3a24', '#22180f', '#5f4b2e'], 26, 6, 1, 0.26);
  // A heavy curtain at one side.
  c.fillStyle = '#5c1f22';
  c.beginPath();
  c.moveTo(W, 0);
  c.lineTo(W * 0.72, 0);
  c.bezierCurveTo(W * 0.84, H * 0.25, W * 0.76, H * 0.42, W, H * 0.56);
  c.fill();
  dabs(c, rng, 26, W * 0.76, 0, W * 0.24, H * 0.45, ['#7f2f30', '#3a1012'], 34, 5, 1.2, 0.6);
  const cx = W * 0.47;
  // The coat: shoulders down to the frame.
  c.fillStyle = '#12484f';
  c.beginPath();
  c.moveTo(W * 0.07, H);
  c.bezierCurveTo(W * 0.12, H * 0.62, W * 0.26, H * 0.5, cx - 26, H * 0.47);
  c.lineTo(cx + 26, H * 0.47);
  c.bezierCurveTo(W * 0.72, H * 0.5, W * 0.84, H * 0.64, W * 0.9, H);
  c.closePath();
  c.fill();
  c.save();
  c.clip();
  dabs(c, rng, 140, 0, H * 0.45, W, H * 0.55, ['#1b6a72', '#0b3238', '#2c8089'], 22, 4, 1.2, 0.5);
  // Gold down the front.
  c.strokeStyle = '#c79a43';
  c.lineWidth = 3;
  for (const dx of [-16, 16]) {
    c.beginPath();
    c.moveTo(cx + dx * 0.7, H * 0.55);
    c.lineTo(cx + dx * 1.5, H);
    c.stroke();
  }
  for (let i = 0; i < 10; i++) {
    c.fillStyle = '#e0bb68';
    c.beginPath();
    c.arc(cx + (i % 2 ? -13 : 13) * (1 + i * 0.09), H * (0.58 + i * 0.04), 2.2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  // The neck and a pale lace collar.
  c.fillStyle = '#d7ac84';
  c.fillRect(cx - 15, H * 0.36, 30, H * 0.12);
  c.fillStyle = '#ece3cf';
  for (let i = -5; i <= 5; i++) {
    c.beginPath();
    c.arc(cx + i * 11, H * 0.49 - Math.abs(i) * -1.4, 9, 0, Math.PI * 2);
    c.fill();
  }
  // The hair, then the face, turned a little: lit from the left.
  c.fillStyle = '#2e1b12';
  c.beginPath();
  c.ellipse(cx + 4, H * 0.24, 50, 60, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(cx + 8, H * 0.11, 25, 0, Math.PI * 2);
  c.fill();
  const face = c.createRadialGradient(cx - 14, H * 0.26, 4, cx, H * 0.29, 48);
  face.addColorStop(0, '#f6dcbc');
  face.addColorStop(0.65, '#dcaf85');
  face.addColorStop(1, '#9a6a48');
  c.fillStyle = face;
  c.beginPath();
  c.ellipse(cx - 2, H * 0.29, 33, 44, 0, 0, Math.PI * 2);
  c.fill();
  // Brows, eyes, nose, lips; the faintest smile.
  c.strokeStyle = '#4a2c1a';
  c.lineWidth = 2;
  c.lineCap = 'round';
  for (const dx of [-16, 12]) {
    c.beginPath();
    c.moveTo(cx + dx - 8, H * 0.256);
    c.quadraticCurveTo(cx + dx, H * 0.243, cx + dx + 8, H * 0.256);
    c.stroke();
    c.fillStyle = '#f1e8d6';
    c.beginPath();
    c.ellipse(cx + dx, H * 0.275, 6.5, 3.2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#35241a';
    c.beginPath();
    c.arc(cx + dx + 1, H * 0.275, 2.8, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#a06b48';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(cx - 2, H * 0.285);
  c.quadraticCurveTo(cx + 5, H * 0.32, cx - 4, H * 0.326);
  c.stroke();
  c.strokeStyle = '#94453c';
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(cx - 12, H * 0.352);
  c.quadraticCurveTo(cx - 2, H * 0.361, cx + 9, H * 0.349);
  c.stroke();
  // A pearl at the ear.
  c.fillStyle = '#f8f3e4';
  c.beginPath();
  c.arc(cx + 31, H * 0.325, 3.6, 0, Math.PI * 2);
  c.fill();
  // The raised hand and the bird on it.
  const [hx, hy] = [W * 0.27, H * 0.77];
  c.fillStyle = '#d7ac84';
  c.beginPath();
  c.ellipse(hx, hy, 23, 14, -0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#efece1';
  c.beginPath();
  c.ellipse(hx + 2, hy - 23, 15, 22, 0.3, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(hx - 5, hy - 46, 9.5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#d98a2f';
  c.beginPath();
  c.moveTo(hx - 14, hy - 48);
  c.lineTo(hx - 22, hy - 44);
  c.lineTo(hx - 13, hy - 43);
  c.fill();
  c.fillStyle = '#17110c';
  c.beginPath();
  c.arc(hx - 8, hy - 47, 1.5, 0, Math.PI * 2);
  c.fill();
  // The varnish, gone golden and crazed.
  c.globalCompositeOperation = 'overlay';
  c.fillStyle = '#b08a3e';
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = '#000';
  c.globalAlpha = 0.09;
  c.lineWidth = 0.6;
  for (let i = 0; i < 180; i++) {
    const x = rng() * W;
    const y = rng() * H;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (rng() - 0.5) * 22, y + (rng() - 0.5) * 22);
    c.stroke();
  }
  c.globalAlpha = 1;
}

/** A burglar alarm's face: its little green display and twelve keys. */
function paintKeypad(c: CanvasRenderingContext2D, W: number, H: number) {
  c.fillStyle = '#ebe6da';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#23372a';
  c.fillRect(W * 0.1, H * 0.07, W * 0.8, H * 0.18);
  c.fillStyle = '#9ff0b4';
  c.font = `700 ${Math.round(H * 0.095)}px "Malgun Gothic","Noto Sans KR",sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('경비 중', W * 0.5, H * 0.165);
  for (let i = 0; i < 12; i++) {
    const x = W * (0.13 + (i % 3) * 0.27);
    const y = H * (0.33 + Math.floor(i / 3) * 0.15);
    c.fillStyle = '#b9b2a3';
    c.fillRect(x, y + 3, W * 0.2, H * 0.11);
    c.fillStyle = '#fbf8f0';
    c.fillRect(x, y, W * 0.2, H * 0.11);
    c.fillStyle = '#3b3b40';
    c.font = `600 ${Math.round(H * 0.07)}px sans-serif`;
    c.fillText('123456789*0#'[i], x + W * 0.1, y + H * 0.058);
  }
  c.fillStyle = '#4ed06f';
  c.beginPath();
  c.arc(W * 0.86, H * 0.95, W * 0.035, 0, Math.PI * 2);
  c.fill();
}

const canvases = new Map<string, THREE.Material>();
const planes = new Map<string, THREE.PlaneGeometry>();
/** A picture on a plane, painted the first time and shared by every copy. */
function picture(g: THREE.Object3D, key: string, w: number, h: number, px: number, paint: (c: CanvasRenderingContext2D, W: number, H: number) => void, x: number, y: number, z: number): THREE.Mesh {
  let mat = canvases.get(key);
  const [W, H] = [Math.round(w * px), Math.round(h * px)];
  if (!mat) canvases.set(key, (mat = textured(canvasTexture(W, H, (c) => paint(c, W, H)))));
  const pk = `${w},${h}`;
  let geom = planes.get(pk);
  if (!geom) planes.set(pk, (geom = new THREE.PlaneGeometry(w, h)));
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  g.add(m);
  return m;
}

// -------------------------------------------------------------------------------------------------
// The paintings.

interface Hanging {
  /** Where the middle of the picture is, its back on the wall (or on its stand), and the plane of the picture itself. */
  y: number;
  z: number;
}

/** The back plane is where paintings have always hung; off a wall it's on an easel-backed stand of its own. */
function hang(g: THREE.Object3D, D: number, wall: boolean, frameH: number, frameW: number): Hanging {
  const z = -D / 2 + (wall ? 0.025 : 0.12);
  const y = wall ? 1.55 : frameH / 2 + 0.6;
  if (!wall)
    solid(g, `artStand${frameW},${frameH}`, (k) => {
      const top = y + frameH * 0.32;
      k.rod([-frameW * 0.34, 0, z - 0.03], [-frameW * 0.1, top, z - 0.03], 0.016, '#8a6242');
      k.rod([frameW * 0.34, 0, z - 0.03], [frameW * 0.1, top, z - 0.03], 0.016, '#8a6242');
      k.rod([0, 0, z - 0.3], [0, top, z - 0.03], 0.016, '#7a5536');
      k.box(frameW * 0.82, 0.022, 0.06, '#8a6242', 0, y - frameH / 2 - 0.012, z + 0.015);
    });
  return { y, z };
}

/** Four bars round a picture of w × h, `b` wide, `d` deep, with the backing behind it; `z` the bars' back. */
function bars(k: Kit, w: number, h: number, b: number, d: number, color: string, z: number, under?: string) {
  const o = { under };
  k.box(w + 2 * b, b, d, color, 0, h / 2 + b / 2, z + d / 2, o);
  k.box(w + 2 * b, b, d, color, 0, -h / 2 - b / 2, z + d / 2, o);
  k.box(b, h, d, color, -w / 2 - b / 2, 0, z + d / 2, o);
  k.box(b, h, d, color, w / 2 + b / 2, 0, z + d / 2, o);
}

const paintingLandscape: Builder = (g, _W, D, _c, _def, ctx) => {
  // Oak with a dark inner edge and a cream slip, landscape-wise.
  const [pw, ph] = [0.72, 0.5];
  const fw = pw + 0.13;
  const fh = ph + 0.13;
  const { y, z } = hang(g, D, ctx.againstWall, fh, fw);
  solid(
    g,
    'frameOak',
    (k) => {
      bars(k, pw + 0.03, ph + 0.03, 0.05, 0.04, '#b4895a', -0.02, '#8e6840');
      bars(k, pw, ph, 0.015, 0.024, '#efe6cf', -0.02);
      k.box(pw + 0.05, ph + 0.05, 0.012, '#4b3524', 0, 0, -0.016);
    },
    { y, z },
  );
  picture(g, 'landscape', pw, ph, 560, paintLandscape, 0, y, z - 0.006);
};

const paintingAbstract: Builder = (g, _W, D, c, _def, ctx) => {
  // A square canvas floating in a slim black frame, a shadow gap all round.
  const s = 0.62;
  const f = s + 0.075;
  const { y, z } = hang(g, D, ctx.againstWall, f, f);
  solid(
    g,
    'frameFloat',
    (k) => {
      bars(k, s + 0.03, s + 0.03, 0.022, 0.05, '#23222a', -0.02);
      k.box(s + 0.03, s + 0.03, 0.006, '#17161b', 0, 0, -0.02);
      k.box(s, s, 0.026, '#e8ddc8', 0, 0, -0.005);
    },
    { y, z },
  );
  picture(g, 'abstract', s, s, 512, (cc, W, H) => paintAbstract(cc, W, H, c), 0, y, z + 0.011);
};

const posterPop: Builder = (g, _W, D, c, _def, ctx) => {
  // A printed sheet in a thin black snap frame.
  const [pw, ph] = [0.58, 0.82];
  const { y, z } = hang(g, D, ctx.againstWall, ph + 0.03, pw + 0.03);
  solid(
    g,
    'framePoster',
    (k) => {
      bars(k, pw, ph, 0.014, 0.018, '#17171c', -0.016);
      k.box(pw, ph, 0.004, '#f5f5f5', 0, 0, -0.014);
    },
    { y, z },
  );
  picture(g, 'pop', pw, ph, 460, (cc, W, H) => paintPop(cc, W, H, c), 0, y, z - 0.008);
};

const paintingMaster: Builder = (g, _W, D, _c, _def, ctx) => {
  // A heavy stepped gilt frame with a dark sight edge, corner bosses, a crest and a brass picture light over it, lit.
  const [pw, ph] = [0.64, 0.8];
  const b = 0.1;
  const { y, z } = hang(g, D, ctx.againstWall, ph + 2 * b + 0.04, pw + 2 * b + 0.02);
  solid(
    g,
    'frameGilt',
    (k) => {
      bars(k, pw + 0.05, ph + 0.05, 0.07, 0.07, '#c9a24c', -0.02, '#8f6c28');
      bars(k, pw + 0.015, ph + 0.015, 0.0175, 0.045, '#e8c978', -0.02, '#b68f3e');
      bars(k, pw, ph, 0.0075, 0.03, '#2a1c10', -0.02);
      k.box(pw + 0.05, ph + 0.05, 0.012, '#2a1c10', 0, 0, -0.018);
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          k.ball(0.028, 6, 4, '#f0d68f', sx * (pw / 2 + 0.06), sy * (ph / 2 + 0.06), 0.05, { sz: 0.6, under: '#a57f33' });
        }
      // The crest and the two scrolls beside it.
      k.ball(0.045, 6, 4, '#f0d68f', 0, ph / 2 + 0.105, 0.03, { sz: 0.5, under: '#a57f33' });
      for (const sx of [-1, 1]) k.ball(0.026, 5, 3, '#e0bd68', sx * 0.08, ph / 2 + 0.098, 0.03, { sx: 1.7, sz: 0.5 });
      // The picture light's stem and hood.
      k.box(0.02, 0.05, 0.02, '#a6843d', 0, ph / 2 + 0.17, -0.005);
      k.rod([0, ph / 2 + 0.18, -0.005], [0, ph / 2 + 0.2, 0.07], 0.008, '#a6843d');
      k.cyl(0.024, 0.024, 0.42, 6, '#b6934a', 0, ph / 2 + 0.2, 0.075, { rz: Math.PI / 2 });
    },
    { y, z },
  );
  part(g, LIGHT_BAR, '#fff0c0', 0, y + ph / 2 + 0.176, z + 0.075, { outline: false, shadow: false, material: GLOW_WARM });
  picture(g, 'master', pw, ph, 560, paintMaster, 0, y, z - 0.008);
};

/** A warm bulb that's always on: a master's picture light, the urn's candle flames. */
const GLOW_WARM = new THREE.MeshBasicMaterial({ color: '#fff0c0' });
const LIGHT_BAR = new THREE.BoxGeometry(0.38, 0.006, 0.028);
const FLAME = new THREE.SphereGeometry(0.009, 6, 4);
const LAMP_SHADE = new THREE.CylinderGeometry(0.165, 0.24, 0.3, 12);

// -------------------------------------------------------------------------------------------------
// The lamp: a turned wooden stem, a drum of pale linen. The shade is the glow lot3d.ts lights at night.

const lamp: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  solid(g, 'lampStem', (k) => {
    const wood = '#a06e45';
    const brass = '#c7a256';
    k.cyl(0.15, 0.17, 0.035, 10, '#6f4a2d', 0, 0.018, 0);
    k.cyl(0.115, 0.14, 0.03, 10, wood, 0, 0.05, 0);
    k.cyl(0.03, 0.065, 0.12, 6, wood, 0, 0.125, 0);
    k.cyl(0.02, 0.03, 0.72, 6, wood, 0, 0.545, 0);
    k.cyl(0.042, 0.02, 0.09, 6, brass, 0, 0.95, 0);
    k.cyl(0.02, 0.042, 0.09, 6, brass, 0, 1.04, 0);
    k.cyl(0.015, 0.02, 0.26, 6, wood, 0, 1.215, 0);
    k.cyl(0.03, 0.022, 0.03, 6, brass, 0, 1.36, 0);
    // The shade's bindings, a finial, and the chain to pull.
    k.cyl(0.24, 0.245, 0.016, 12, brass, 0, 1.358, 0);
    k.cyl(0.165, 0.17, 0.014, 12, brass, 0, 1.655, 0);
    k.cyl(0.009, 0.017, 0.04, 6, brass, 0, 1.685, 0);
    k.cyl(0.003, 0.003, 0.12, 4, brass, 0.05, 1.29, 0.045);
    k.ball(0.009, 6, 4, brass, 0.05, 1.225, 0.045);
  });
  const mat = new THREE.MeshBasicMaterial({ color: '#d8cfb5' });
  const shade = part(g, LAMP_SHADE, '#d8cfb5', 0, 1.505, 0, { material: mat, shadow: false });
  shade.userData.ownMaterial = true;
  out.glow = shade;
};

// -------------------------------------------------------------------------------------------------
// The garden and the pot plant: foliage in lumps, darker underneath.

const plant: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const look = nextLook('plant', 2);
  solid(g, `pot${look}`, (k) => {
    const pot = look ? '#e6dfd0' : '#c46b4c';
    k.cyl(0.19, 0.17, 0.018, 12, look ? '#b8ad98' : '#a4553b', 0, 0.01, 0);
    k.cyl(0.165, 0.115, 0.26, 12, pot, 0, 0.15, 0, { under: look ? '#c9bfa9' : '#a4553b' });
    k.cyl(0.18, 0.17, 0.05, 12, pot, 0, 0.3, 0);
    k.cyl(0.155, 0.155, 0.006, 12, '#4a3626', 0, 0.322, 0);
  });
  const leaves = new THREE.Group();
  leaves.position.y = 0.3;
  solid(leaves, `leaves${look}`, (k) => {
    const [dark, mid, lite] = look ? ['#2f6d46', '#3f8a58', '#5aa873'] : ['#2f7a3e', '#4b9e50', '#71bb61'];
    if (look === 0) {
      // A rubber plant: a stem and broad glossy leaves climbing it, turning round.
      k.rod([0, 0, 0], [0.015, 0.62, -0.01], 0.014, '#6d5a3a', 5, 0.009);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        const y = 0.13 + i * 0.058;
        const out0 = 0.17 - i * 0.008;
        k.ball(0.11, 6, 3, i % 3 === 0 ? lite : i % 3 === 1 ? mid : dark, Math.cos(a) * out0, y, Math.sin(a) * out0, { sx: 1.25, sy: 0.14, sz: 0.68, ry: -a, rz: 0.55 - i * 0.05, under: dark });
      }
      k.ball(0.07, 6, 4, lite, 0.02, 0.68, -0.01, { sx: 0.45, sz: 0.45, sy: 1.05 });
    } else {
      // A snake-plant's clump: tall blades with a pale edge, some bent.
      for (let i = 0; i < 10; i++) {
        const a = i * 2.05;
        const r = 0.03 + (i % 3) * 0.035;
        const h = 0.34 + ((i * 7) % 5) * 0.07;
        const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
        k.cyl(0.006, 0.032, h, 4, i % 2 ? mid : lite, x, h / 2, z, { sz: 0.35, ry: a, rx: Math.sin(a) * 0.08, rz: -Math.cos(a) * 0.08, under: dark });
      }
    }
  });
  g.add(leaves);
  out.growth = leaves;
};

const tree: Builder = (g) => {
  const look = nextLook('tree', 3);
  if (look === 2) {
    // A garden pine: a leaning, rough trunk, its branches out to flat clouds of needles.
    solid(g, 'pineTrunk', (k) => {
      const bark = '#6b4a36';
      k.rod([0, 0, 0], [0.12, 1.1, 0.03], 0.15, bark, 7, 0.1);
      k.rod([0.12, 1.1, 0.03], [-0.08, 2.15, -0.02], 0.1, bark, 6, 0.06);
      k.rod([0.09, 1.3, 0.02], [0.72, 1.8, 0.15], 0.05, bark, 5, 0.022);
      k.rod([0.01, 1.7, 0], [-0.66, 2.1, -0.18], 0.045, bark, 5, 0.02);
      k.ball(0.2, 7, 3, '#5d4a33', 0, 0.015, 0, { sy: 0.1, sx: 1.4, sz: 1.4 });
    });
    solid(g, 'pineLeaves', (k) => {
      const dark = '#2a5f43';
      for (const [x, y, z, r, c] of [[0.76, 1.86, 0.15, 0.62, '#3f8559'], [-0.68, 2.2, -0.18, 0.55, '#468f60'], [-0.06, 2.42, 0, 0.74, '#4f9a68'], [0.1, 2.86, 0.05, 0.42, '#5aa570']] as const) k.ball(r, 9, 5, c, x, y, z, { sy: 0.38, under: dark }, 0.22);
    });
    return;
  }
  // A broad-leaved tree: a flared trunk and two boughs under a heap of lumps; every other one bears fruit.
  solid(g, 'treeTrunk', (k) => {
    const bark = '#83593a';
    k.cyl(0.095, 0.17, 1.5, 8, bark, 0, 0.75, 0, { under: '#6a4730' });
    k.rod([0.03, 1.3, 0], [0.42, 1.95, 0.1], 0.06, bark, 5, 0.03);
    k.rod([-0.03, 1.38, 0], [-0.4, 2.0, -0.1], 0.055, bark, 5, 0.03);
    k.cyl(0.24, 0.3, 0.03, 8, '#5d4a33', 0, 0.015, 0);
  });
  solid(g, `treeLeaves${look}`, (k) => {
    const dark = look ? '#458f43' : '#3d8a44';
    for (const [x, y, z, r, c] of [[0, 2.15, 0, 0.72, '#68b257'], [0.44, 2.28, 0.18, 0.5, '#72bc5e'], [-0.46, 2.32, -0.1, 0.52, '#62a952'], [0.08, 2.72, -0.1, 0.48, '#82c966'], [-0.04, 1.96, 0.46, 0.36, '#70b75c']] as const) k.ball(r, 8, 5, c, x, y, z, { sy: 0.88, under: dark }, 0.2);
    if (look)
      for (const [x, y, z] of [[0.3, 2.3, 0.62], [-0.28, 2.05, 0.62], [0.62, 2.1, 0.42], [-0.68, 2.3, 0.28], [0.1, 2.65, 0.45], [-0.3, 2.58, 0.4], [0.68, 2.42, 0.25]] as const) k.ball(0.042, 5, 3, '#e0523f', x, y, z, { under: '#b43a2d' });
  });
};

const bush: Builder = (g) => {
  const look = nextLook('bush', 3);
  solid(g, `bush${look}`, (k) => {
    const dark = look === 1 ? '#2d6e43' : '#3f8a44';
    const leaf = look === 1 ? ['#3d8a57', '#4a9a62', '#357f4e'] : ['#62ad56', '#74bd62', '#559e4c'];
    k.ball(0.38, 8, 5, leaf[0], 0, 0.3, 0, { sy: 0.86, under: dark }, 0.2);
    k.ball(0.28, 8, 5, leaf[1], 0.23, 0.32, 0.1, { sy: 0.92, under: dark }, 0.2);
    k.ball(0.27, 8, 5, leaf[2], -0.22, 0.28, -0.08, { sy: 0.9, under: dark }, 0.2);
    if (look !== 1) {
      // In bloom: azalea pink or forsythia yellow.
      const [petal, deep] = look ? ['#f6dc5a', '#dcb838'] : ['#f28bb0', '#d9628f'];
      for (const [x, y, z] of [[0.1, 0.56, 0.2], [-0.15, 0.52, 0.2], [0.33, 0.48, 0.24], [-0.34, 0.42, 0.14], [0.02, 0.36, 0.37], [0.3, 0.3, 0.33], [-0.2, 0.28, 0.3], [0.15, 0.62, -0.08], [-0.2, 0.55, -0.15], [0.36, 0.42, -0.1]] as const) k.ball(0.036, 5, 3, petal, x, y, z, { under: deep });
    }
  });
};

// -------------------------------------------------------------------------------------------------
// The alarms. Nothing tells a piece an alarm is going off (the game knows, lot3d.ts doesn't pass it on), so their small
// lights are the steady ones of a thing that's on.

const smokeAlarm: Builder = (g, _W, D, _c, _def, ctx) => {
  const wall = ctx.againstWall;
  // Built face up; on a wall the face comes round to the room.
  const h = new THREE.Group();
  h.position.set(0, wall ? 2.6 : 2.85, wall ? -D / 2 + 0.008 : 0);
  if (wall) h.rotation.x = Math.PI / 2;
  g.add(h);
  solid(h, 'smokeAlarm', (k) => {
    k.cyl(0.098, 0.1, 0.014, 16, '#dfdbd1', 0, 0.007, 0);
    k.cyl(0.082, 0.094, 0.032, 16, '#f7f5ef', 0, 0.03, 0);
    k.cyl(0.05, 0.078, 0.014, 16, '#efece4', 0, 0.053, 0);
    k.cyl(0.024, 0.026, 0.006, 10, '#ded9cd', 0, 0.063, 0);
    // The slots the smoke goes in by, round its side.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      k.box(0.024, 0.012, 0.004, '#8b8a84', Math.sin(a) * 0.089, 0.03, Math.cos(a) * 0.089, { ry: a });
    }
    k.box(0.012, 0.004, 0.012, '#e0392f', 0.034, 0.0585, 0.026);
  });
};

const burglarAlarm: Builder = (g, _W, D, _c, _def, ctx) => {
  const wall = ctx.againstWall;
  const z = -D / 2 + (wall ? 0.008 : 0.34);
  const py = wall ? 1.42 : 1.18;
  solid(
    g,
    wall ? 'burglarWall' : 'burglarPost',
    (k) => {
      // The keypad's case.
      k.box(0.2, 0.29, 0.026, '#ded8ca', 0, py, z + 0.013);
      k.box(0.17, 0.018, 0.012, '#c5beae', 0, py - 0.137, z + 0.03);
      if (wall) {
        // The siren up the wall, a run of conduit down to the keypad, its red lens.
        k.box(0.18, 0.22, 0.04, '#f0ece2', 0, 2.3, z + 0.02);
        k.box(0.12, 0.05, 0.012, '#c5beae', 0, 2.185, z + 0.03);
        k.ball(0.058, 10, 5, '#d8352a', 0, 2.33, z + 0.04, { sz: 0.75, under: '#a01f19' });
        k.box(0.016, 0.61, 0.012, '#e3ded2', 0, 1.875, z + 0.006);
      } else {
        // Off a wall it stands on a post.
        k.box(0.05, py - 0.14, 0.04, '#b8b2a4', 0, (py - 0.14) / 2, z - 0.005);
        k.cyl(0.14, 0.16, 0.025, 12, '#8f8a7d', 0, 0.012, z - 0.005);
      }
    },
  );
  picture(g, 'keypad', 0.17, 0.25, 300, paintKeypad, 0, py + 0.012, z + 0.028);
};

// -------------------------------------------------------------------------------------------------
// The mailbox: an arched steel box on a post, its flag up, its door dropping open when it's used.

const MB = { top: 1.2, base: 0.97, z: 0.21, hinge: 0.975 };

const mailbox: Builder = (g, _W, _D, c, _def, _ctx, out) => {
  const deep = '#' + new THREE.Color(c).multiplyScalar(0.72).getHexString();
  solid(g, `mailbox${c}`, (k) => {
    const wood = '#a07a50';
    k.box(0.085, 0.97, 0.085, wood, 0, 0.485, 0, { under: '#7d5d3b' });
    k.box(0.11, 0.022, 0.11, '#8e8a80', 0, 0.011, 0);
    k.rod([0, 0.7, -0.03], [0, 0.95, -0.17], 0.016, wood);
    k.box(0.25, 0.012, 0.36, '#8a6a46', 0, 0.963, 0);
    // The box: a floor, its sides, a half-round roof.
    k.box(0.26, 0.12, 0.42, c, 0, 1.03, 0, { under: deep });
    k.put(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 10, 1, false, 0, Math.PI), c, 0, 1.09, 0, { rx: Math.PI / 2, ry: Math.PI / 2, sx: 0.85 });
    k.box(0.27, 0.012, 0.012, deep, 0, 1.09, -0.2);
    // The flag, on the side, up.
    k.box(0.008, 0.2, 0.018, '#c7c2b6', 0.136, 1.1, 0.08);
    k.box(0.006, 0.055, 0.08, '#e53935', 0.136, 1.18, 0.11);
    // A round of flowers at its foot.
    for (const [x, z, col] of [[0.14, 0.14, '#f4b740'], [-0.15, 0.1, '#f26f5a'], [0.03, 0.2, '#f4b740']] as const) {
      k.ball(0.075, 6, 4, '#5ea651', x, 0.06, z, { sy: 0.8, under: '#3f7f3e' });
      k.ball(0.022, 5, 3, col, x, 0.12, z);
    }
  });
  const door = (key: string, parent: THREE.Object3D, open: boolean) =>
    solid(parent, key, (k) => {
      // A square foot and an arched head, the shape of the box's end.
      const face = MB.z + 0.004;
      if (open) {
        k.box(0.25, 0.115, 0.008, deep, 0, MB.hinge, face + 0.0575, { rx: Math.PI / 2 });
        k.put(new THREE.CylinderGeometry(0.125, 0.125, 0.008, 10, 1, false, -Math.PI / 2, Math.PI), deep, 0, MB.hinge, face + 0.115, { sz: 0.85 });
      } else {
        k.box(0.25, 0.115, 0.008, deep, 0, MB.hinge + 0.0575, face);
        k.put(new THREE.CylinderGeometry(0.125, 0.125, 0.008, 10, 1, false, 0, Math.PI), deep, 0, MB.hinge + 0.115, face, { rx: Math.PI / 2, ry: Math.PI / 2, sx: 0.85 });
      }
      // A little brass knob, and a slot of a label.
      const out0 = open ? { y: MB.hinge + 0.012, z: MB.z + 0.17 } : { y: MB.hinge + 0.17, z: MB.z + 0.012 };
      k.ball(0.012, 6, 4, '#e0be6a', 0, out0.y, out0.z);
      const lab = open ? { y: MB.hinge + 0.006, z: MB.z + 0.07, rx: Math.PI / 2 } : { y: MB.hinge + 0.07, z: MB.z + 0.009, rx: 0 };
      k.box(0.09, 0.03, 0.003, '#f3ecd9', 0, lab.y, lab.z, { rx: lab.rx });
      if (open) {
        // Inside, dark; the post just come sticking out.
        k.box(0.23, 0.115, 0.002, '#26262c', 0, MB.hinge + 0.0575, MB.z + 0.002);
        k.box(0.15, 0.09, 0.006, '#f7f1e3', -0.015, MB.hinge + 0.035, MB.z + 0.02, { rx: -0.2, rz: 0.04 });
        k.box(0.13, 0.06, 0.006, '#d7e5ee', 0.02, MB.hinge + 0.025, MB.z + 0.03, { rx: -0.25, rz: -0.08 });
      }
    });
  const closed = new THREE.Group();
  door(`mailDoor${c}`, closed, false);
  g.add(closed);
  out.idle = closed;
  const opened = new THREE.Group();
  door(`mailOpen${c}`, opened, true);
  g.add(opened);
  out.inUse = opened;
  // Hands to the door.
  out.work = marker(g, 0, 1.08, MB.z + 0.05);
};

// -------------------------------------------------------------------------------------------------
// The urn: a lidded celadon jar on a low wooden stand, white flowers either side; an incense bowl before it, its
// candles lit for whoever's come to mourn.

const urn: Builder = (g, _W, D, c, _def, _ctx, out) => {
  const top = 0.74;
  solid(g, `urnStand`, (k) => {
    const wood = '#6b4a33';
    const deep = '#4e3524';
    k.box(0.5, 0.036, 0.42, wood, 0, top - 0.018, 0);
    k.box(0.46, 0.05, 0.38, deep, 0, top - 0.06, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.04, top - 0.07, 0.04, deep, sx * 0.21, (top - 0.07) / 2, sz * 0.165);
    k.box(0.44, 0.022, 0.34, wood, 0, 0.2, 0);
    // On the shelf underneath, a folded white cloth.
    k.box(0.28, 0.03, 0.2, '#efe9db', 0, 0.226, 0);
  });
  solid(g, `urnJar${c}`, (k) => {
    const celadon = '#a9c3ae';
    const low = '#7f9f8a';
    k.lathe(
      [
        [0.001, 0],
        [0.066, 0],
        [0.07, 0.012],
        [0.086, 0.07],
        [0.112, 0.15],
        [0.11, 0.2],
        [0.082, 0.255],
        [0.066, 0.272],
      ],
      10,
      celadon,
      0,
      top,
      0,
      low,
    );
    // Its lid, with a knob, and a band of the piece's own colour.
    k.lathe(
      [
        [0.074, 0],
        [0.072, 0.016],
        [0.042, 0.05],
        [0.016, 0.058],
        [0.02, 0.08],
        [0.001, 0.09],
      ],
      10,
      celadon,
      0,
      top + 0.272,
      0,
      low,
    );
    k.cyl(0.113, 0.113, 0.014, 10, c, 0, top + 0.17, 0);
    // The flowers: two little jars of white chrysanthemum on the stand's far corners.
    for (const sx of [-1, 1]) {
      k.cyl(0.03, 0.022, 0.1, 6, '#ece8dd', sx * 0.19, top + 0.05, -0.1);
      k.rod([sx * 0.19, top + 0.08, -0.1], [sx * 0.2, top + 0.22, -0.1], 0.004, '#5f8a54', 3);
      k.ball(0.042, 6, 4, '#faf7ec', sx * 0.2, top + 0.24, -0.1, { under: '#e4dcae' });
    }
    // The incense bowl of sand with its sticks, and two candles.
    k.cyl(0.042, 0.03, 0.03, 6, '#38363a', 0, top + 0.015, 0.155);
    k.cyl(0.036, 0.036, 0.003, 6, '#b5a78e', 0, top + 0.03, 0.155);
    for (const sx of [-1, 1]) {
      k.rod([sx * 0.008, top + 0.03, 0.155], [sx * 0.017, top + 0.14, 0.155], 0.0016, '#7e5b3c', 3);
      k.cyl(0.011, 0.014, 0.09, 5, '#f8f4e8', sx * 0.11, top + 0.045, 0.155);
    }
  });
  const flames = new THREE.Group();
  for (const sx of [-1, 1]) {
    const f = part(flames, FLAME, '#fff0c0', sx * 0.11, top + 0.106, 0.155, { outline: false, shadow: false, material: GLOW_WARM });
    f.scale.y = 1.9;
  }
  g.add(flames);
  out.inUse = flames;
  out.work = marker(g, 0, 0.4, D / 2 - 0.1);
};

// -------------------------------------------------------------------------------------------------
// The stairs: the same flight dwellers are lifted up (lot3d.ts stairHeight) and the same solid steps, now with oak treads
// flush with each step's top, cream sides, a skirting up the slope, and a handrail on balusters with newel posts.

const stairs: Builder = (g, W, D, c) => {
  const steps = Math.round(FLOOR_H / 0.18);
  const runAll = D - 0.5;
  const run = runAll / steps;
  const rise = FLOOR_H / steps;
  const slope = Math.atan2(FLOOR_H, runAll);
  const footZ = D / 2;
  const railY = (z: number) => ((footZ - z) / runAll) * FLOOR_H + 0.9;
  solid(
    g,
    `stairs${W},${D},${c}`,
    (k) => {
      const oak = '#b98a5a';
      const oakDark = '#976e45';
      const riser = '#efe6d3';
      const walnut = '#6a4630';
      for (let i = 0; i < steps; i++) {
        const top = rise * (i + 1);
        const z = footZ - run * (i + 0.5);
        k.box(W - 0.1, top, run, riser, 0, top / 2, z, { under: c });
        // The tread: its top is the step's top, its nose a little over the riser.
        k.box(W - 0.1, 0.024, run + 0.018, i % 2 ? oak : '#b48554', 0, top - 0.012, z + 0.009);
      }
      k.box(W - 0.1, FLOOR_H, 0.5, riser, 0, FLOOR_H / 2, -D / 2 + 0.25, { under: c });
      k.box(W - 0.1, 0.024, 0.5, oakDark, 0, FLOOR_H - 0.012, -D / 2 + 0.25);
      // Skirting along each side, up the slope.
      const skirt = Math.hypot(FLOOR_H, runAll) - 0.22;
      for (const sx of [-1, 1]) k.box(0.022, 0.2, skirt, oakDark, sx * (W / 2 - 0.038), FLOOR_H / 2 + 0.03, footZ - runAll / 2, { rx: slope });
      // Rails, on the line they've always followed, with balusters and newels.
      for (const sx of [-1, 1]) {
        const x = sx * (W / 2 - 0.04);
        k.box(0.05, 0.05, Math.hypot(FLOOR_H, runAll), walnut, x, FLOOR_H / 2 + 0.9, footZ - runAll / 2, { rx: slope });
        for (let i = 2; i < steps - 1; i += 3) {
          const z = footZ - run * (i + 0.5);
          const from = rise * (i + 1);
          const h = railY(z) - from;
          k.box(0.024, h, 0.024, riser, x, from + h / 2, z);
        }
        k.box(0.075, 1.02, 0.075, walnut, x, 0.51, footZ - 0.05);
        k.box(0.095, 0.03, 0.095, oakDark, x, 1.03, footZ - 0.05);
        k.box(0.07, 0.96, 0.07, walnut, x, FLOOR_H + 0.48, footZ - runAll);
      }
    },
    { outline: false },
  );
};

export const BUILDERS: Record<string, Builder> = { lamp, paintingLandscape, paintingAbstract, posterPop, paintingMaster, plant, tree, bush, smokeAlarm, burglarAlarm, mailbox, urn, stairs };
