import * as THREE from 'three';
import { marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import type { Grip, HeldTool, Side } from '../handTool';
import { box, canvasTexture, cyl, part, rbox, textured } from '../toon';
import { BR, CF, GR, HC, PAN, SN, ST, grillDog, ktLive, ktNow, type KtMotion, type KtNow, type KtPlace, type V } from './kitchenMotion';

/*
 * The kitchen, redone (2026-11-01, at the user's request; docs/workplaces/PIPELINE.md, 집 가구). What lot3d.ts does with
 * these stays as it was: a fridge's doors swing by Built.doors, what's on the stove shows by Built.inUse, the food on a
 * table lies at 0.79 m and the dishes by a sink at 0.92 m, whatever faces a chair is eaten at 0.785 m, and a toddler
 * sits at 0.7 m with their plate 0.32 m ahead (each kept by kitchen.test.ts). No '*' spot: a repair or a clean still
 * goes the family's way, to Built.work. Pieces hold their tools through handTool.ts (kitchenMotion.ts says when).
 */

const WARM_WOOD = '#b98a5a';
const WALNUT = '#6a4630';
const STEEL = '#c3c9ce';
const STEEL_D = '#8c949b';
const BRASS = '#c9a24b';
const ENAMEL = '#f4efe4';
const IRON = '#2c2c30';

const basic = (color: string, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const FLAME = basic('#5aa9ff');
const FLAME_CORE = basic('#c5e4ff');
const FIRE = basic('#ffa040');
const STEAM = basic('#ffffff', 0.32);
const SMOKE = basic('#b9b4ad', 0.34);
const WATER = basic('#bfe6fb', 0.75);
const LIGHT_COOL = basic('#f4fbff');
const LIGHT_WARM = basic('#ffe2a8');
const LED_ON = basic('#7dffb0');
const FOAM = basic('#ffffff', 0.85);
const BREW = basic('#4a2c17');

/** A small round thing in few triangles, shared by size (a kitchen has dozens). */
const dots = new Map<number, THREE.SphereGeometry>();
function dot(r: number): THREE.SphereGeometry {
  let g = dots.get(r);
  if (!g) dots.set(r, (g = new THREE.SphereGeometry(r, 8, 6)));
  return g;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vv = (a: V) => new THREE.Vector3(a[0], a[1], a[2]);
const UP = v(0, 1, 0);

/** A plain thing with no line round it, the way small pieces are drawn. */
const bit = (g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: { rx?: number; ry?: number; rz?: number } = {}) => part(g, geom, color, x, y, z, { ...o, outline: false });
const glow = (g: THREE.Object3D, geom: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, o: { rx?: number; ry?: number; rz?: number } = {}) => part(g, geom, '#ffffff', x, y, z, { ...o, outline: false, shadow: false, material: mat });

/** A picture painted once on a plane, in front of what it's on. */
function picture(g: THREE.Object3D, w: number, h: number, px: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, x: number, y: number, z: number): THREE.Mesh {
  const W = Math.max(4, Math.round(w * px));
  const H = Math.max(4, Math.round(h * px));
  const mat = textured(canvasTexture(W, H, (c) => draw(c, W, H)));
  mat.transparent = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** Sets a tool's place from a beat: a long tool's +y aimed at `head`, else its own turn. */
function placeTool(tool: THREE.Object3D, n: KtNow) {
  if (n.tool) tool.position.set(n.tool[0], n.tool[1], n.tool[2]);
  if (n.head && n.tool) tool.quaternion.setFromUnitVectors(UP, vv(n.head).sub(tool.position).normalize());
  else if (n.rot) tool.rotation.set(n.rot[0], n.rot[1], n.rot[2]);
}

/** Puts a tool in the hands for this frame; a hand that isn't on it goes where the beat says. */
function hold(s: Spot, g: THREE.Object3D, n: KtNow, tool: THREE.Object3D, lead: Side, grips: Partial<Record<Side, Grip>>) {
  const free: HeldTool['free'] = {};
  if (!grips.left) free.left = g.localToWorld(vv(n.l));
  if (!grips.right) free.right = g.localToWorld(vv(n.r));
  s.held = { tool, lead, grips, resting: !!n.resting, lean: n.lean, nod: n.nod, free, freeShape: n.shape };
}

/** A spot for a motion: stood in front, facing the piece (the beat itself says just where). */
function use(g: THREE.Object3D, m: KtMotion, x: number, z: number, place?: KtPlace): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = m;
  if (place) s.at.userData.ktPlace = place;
  return s;
}

/** Which of a piece's uses is going on now. */
function liveOf(uses: Array<[KtMotion, Spot]>, t: number): { m: KtMotion; s: Spot; u: number; H: number } | null {
  for (const [m, s] of uses) {
    const u = ktLive(m, s, t);
    if (u !== null) return { m, s, u, H: (s.at.userData.height as number | undefined) ?? 1.6 };
  }
  return null;
}

const puffs = (g: THREE.Object3D, n: number, mat: THREE.Material, r: number) => Array.from({ length: n }, () => glow(g, dot(r), mat, 0, 0, 0));
/** Puffs going up from a point and fading out by growing: `size` is how much there is. */
function rise(list: THREE.Mesh[], t: number, x: number, y: number, z: number, high: number, size: number, speed = 0.45) {
  list.forEach((m, i) => {
    const p = (t * speed + i / list.length) % 1;
    m.visible = size > 0.02;
    m.position.set(x + Math.sin(t * 1.3 + i * 2.1) * 0.05 * (0.3 + p), y + p * high, z + Math.cos(t + i) * 0.03);
    m.scale.setScalar((0.5 + p * 1.6) * Math.max(0.05, size) * (1 - p * p * 0.75));
  });
}

// -------------------------------------------------------------------------------------------------
// Food: small, in few triangles.

function milk(g: THREE.Object3D, x: number, y: number, z: number) {
  bit(g, box(0.07, 0.16, 0.07), '#fafafa', x, y + 0.08, z);
  bit(g, box(0.07, 0.04, 0.05), '#90caf9', x, y + 0.165, z, { rx: 0.3 });
  bit(g, box(0.071, 0.05, 0.071), '#64b5f6', x, y + 0.05, z);
}
function bottleOf(g: THREE.Object3D, color: string, x: number, y: number, z: number, h = 0.18, r = 0.03) {
  bit(g, cyl(r, r, h * 0.66, 8), color, x, y + h * 0.33, z);
  bit(g, cyl(r * 0.45, r, h * 0.2, 8), color, x, y + h * 0.76, z);
  bit(g, cyl(r * 0.5, r * 0.5, h * 0.12, 6), shade(color, 0.6), x, y + h * 0.92, z);
}
function eggs(g: THREE.Object3D, x: number, y: number, z: number) {
  bit(g, box(0.2, 0.03, 0.1), '#c8b89a', x, y + 0.015, z);
  for (let i = 0; i < 6; i++) bit(g, dot(0.02), '#f6e7d0', x - 0.07 + (i % 3) * 0.07, y + 0.04, z - 0.025 + Math.floor(i / 3) * 0.05);
}
function tub(g: THREE.Object3D, lid: string, inside: string, x: number, y: number, z: number, w = 0.15, h = 0.08) {
  bit(g, box(w, h, w * 0.75), inside, x, y + h / 2, z);
  bit(g, box(w + 0.01, 0.016, w * 0.75 + 0.01), lid, x, y + h + 0.006, z);
}
function apples(g: THREE.Object3D, x: number, y: number, z: number) {
  const colors = ['#d4452f', '#e2672f', '#8fbf4a', '#d4452f'];
  for (let i = 0; i < 4; i++) bit(g, dot(0.034), colors[i], x - 0.05 + (i % 2) * 0.08 + (i > 1 ? 0.02 : 0), y + 0.035 + (i > 1 ? 0.04 : 0), z + (i % 2) * 0.03);
}

// -------------------------------------------------------------------------------------------------
// The fridge: a real inside, lit, with what a household keeps in it; a door that's lived with.

/** The note, the drawing, the photo and the magnets on the plain door. */
function fridgeFront(c: CanvasRenderingContext2D, W: number, H: number) {
  const magnet = (x: number, y: number, color: string) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, Math.max(1, W * 0.022), 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath();
    c.arc(x - W * 0.006, y - W * 0.006, Math.max(0.5, W * 0.007), 0, Math.PI * 2);
    c.fill();
  };
  c.clearRect(0, 0, W, H);
  // A child's drawing: a house under a sun.
  c.save();
  c.translate(W * 0.28, H * 0.22);
  c.rotate(-0.05);
  c.fillStyle = '#fffdf6';
  c.fillRect(-W * 0.2, -H * 0.15, W * 0.4, H * 0.3);
  c.fillStyle = '#ffb300';
  c.beginPath();
  c.arc(W * 0.1, -H * 0.09, W * 0.04, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ef6c63';
  c.beginPath();
  c.moveTo(-W * 0.12, -H * 0.01);
  c.lineTo(-W * 0.03, -H * 0.08);
  c.lineTo(W * 0.06, -H * 0.01);
  c.fill();
  c.fillStyle = '#7cb4e8';
  c.fillRect(-W * 0.1, -H * 0.01, W * 0.14, H * 0.1);
  c.fillStyle = '#6fbf73';
  c.fillRect(-W * 0.2, H * 0.1, W * 0.4, H * 0.05);
  c.restore();
  magnet(W * 0.28, H * 0.09, '#e53935');
  // The shopping list.
  c.save();
  c.translate(W * 0.74, H * 0.32);
  c.rotate(0.04);
  c.fillStyle = '#fff6b8';
  c.fillRect(-W * 0.18, -H * 0.19, W * 0.36, H * 0.38);
  c.fillStyle = '#5b4a3a';
  c.font = `bold ${Math.max(6, H * 0.04)}px "Malgun Gothic",sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  ['장보기', '· 우유', '· 달걀', '· 두부', '· 대파'].forEach((s, i) => c.fillText(s, -W * 0.15, -H * 0.145 + i * H * 0.07));
  c.restore();
  magnet(W * 0.74, H * 0.145, '#1e88e5');
  // A snapshot of the family and a calendar-ish reminder.
  c.save();
  c.translate(W * 0.3, H * 0.65);
  c.rotate(0.07);
  c.fillStyle = '#ffffff';
  c.fillRect(-W * 0.15, -H * 0.11, W * 0.3, H * 0.22);
  c.fillStyle = '#9fd1e6';
  c.fillRect(-W * 0.125, -H * 0.09, W * 0.25, H * 0.15);
  c.fillStyle = '#8bc58a';
  c.fillRect(-W * 0.125, -H * 0.015, W * 0.25, H * 0.075);
  for (const [dx, col] of [[-0.07, '#e57373'], [0, '#ffb74d'], [0.07, '#64b5f6']] as const) {
    c.fillStyle = col;
    c.fillRect(W * (dx - 0.02), -H * 0.02, W * 0.04, H * 0.05);
    c.fillStyle = '#f2cfa8';
    c.beginPath();
    c.arc(W * dx, -H * 0.035, W * 0.022, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  magnet(W * 0.3, H * 0.545, '#43a047');
  magnet(W * 0.68, H * 0.68, '#fb8c00');
  magnet(W * 0.8, H * 0.76, '#8e24aa');
  magnet(W * 0.62, H * 0.82, '#ffd54f');
}

/** The inside of one compartment, from the back to the doors. */
function compartment(g: THREE.Object3D, lit: THREE.Object3D, x0: number, x1: number, y0: number, y1: number, back: number, front: number, frozen: boolean, lux: boolean) {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const depth = front - back;
  const cz = (front + back) / 2;
  bit(g, box(w, y1 - y0, 0.01), frozen ? '#e6f1f8' : '#f7fbfd', cx, (y0 + y1) / 2, back + 0.006);
  // The light it comes on with: a strip above, the back wall bright.
  glow(lit, box(w - 0.06, 0.016, 0.06), LIGHT_COOL, cx, y1 - 0.02, cz);
  const wall = glow(lit, new THREE.PlaneGeometry(w - 0.02, y1 - y0 - 0.02), LIGHT_COOL, cx, (y0 + y1) / 2, back + 0.014);
  wall.userData.ownGeometry = true;
  const shelves: number[] = [];
  for (let y = y0 + 0.32; y < y1 - 0.14; y += 0.3) shelves.push(y);
  for (const y of shelves) {
    bit(g, box(w - 0.02, 0.012, depth - 0.1), lux ? '#dbeef5' : '#d7e4ea', cx, y, cz - 0.03);
    if (lux) glow(lit, box(w - 0.04, 0.006, 0.01), LIGHT_COOL, cx, y - 0.012, cz + depth / 2 - 0.09);
  }
  // Drawers at the bottom, tinted, greens showing through.
  if (!frozen) {
    bit(g, box(w - 0.04, 0.2, depth - 0.12), '#cfe3df', cx, y0 + 0.11, cz - 0.04);
    for (let i = 0; i < 3; i++) bit(g, dot(0.05), i === 1 ? '#7fb44f' : '#5f9e3f', cx - w * 0.25 + i * w * 0.25, y0 + 0.18, cz + 0.02);
    bit(g, box(w * 0.5, 0.012, 0.012), STEEL_D, cx, y0 + 0.16, cz + depth / 2 - 0.1);
  }
  const zf = Math.min(front - 0.09, 0.18);
  shelves.forEach((y, i) => {
    if (frozen) {
      tub(g, '#90caf9', '#e3f2fd', cx - w * 0.22, y, zf - 0.08, 0.16, 0.1);
      tub(g, '#ffcc80', '#fff3e0', cx + w * 0.2, y, zf - 0.1, 0.14, 0.08);
      return;
    }
    switch (i % 3) {
      case 0:
        tub(g, '#c6392e', '#f06f4f', cx - w * 0.26, y, zf - 0.1); // the kimchi
        tub(g, '#7cb342', '#e8f2c8', cx + w * 0.02, y, zf - 0.08, 0.12, 0.06); // yesterday's side dish
        if (w > 0.5) apples(g, cx + w * 0.3, y, zf - 0.12);
        break;
      case 1:
        eggs(g, cx - w * 0.22, y, zf - 0.1);
        bit(g, rbox(0.1, 0.04, 0.08, 0.012), '#f8f5ec', cx + w * 0.26, y + 0.022, zf - 0.08); // tofu
        milk(g, cx + w * 0.05, y, zf - 0.14);
        break;
      default:
        bottleOf(g, '#f6a83a', cx - w * 0.28, y, zf - 0.12);
        bottleOf(g, '#3e7a4f', cx - w * 0.14, y, zf - 0.1, 0.22, 0.03);
        if (lux) for (let k = 0; k < 2; k++) bottleOf(g, '#5a2233', cx + w * (0.12 + k * 0.17), y, zf - 0.12, 0.24, 0.032);
        else tub(g, '#ffb74d', '#fff1d0', cx + w * 0.22, y, zf - 0.1, 0.14, 0.07);
    }
  });
}

function fridge(lux: boolean): Builder {
  return (g, W, D, c, _def, _ctx, out) => {
    const w = lux ? Math.min(W - 0.14, 1.36) : W - 0.12;
    const H = lux ? 1.98 : 1.85;
    const back = -D / 2 + 0.04;
    const front = 0.28;
    const body = lux ? '#b4bcc2' : tint(c, 0.3);
    const T = 0.035;
    const d = front - back;
    const zm = (front + back) / 2;
    part(g, box(w, H, T), shade(body, 0.92), 0, H / 2, back + T / 2);
    for (const sx of [-1, 1]) part(g, rbox(T, H, d, 0.012), body, sx * (w / 2 - T / 2), H / 2, zm);
    part(g, rbox(w, T, d, 0.012), body, 0, H - T / 2, zm);
    part(g, box(w, 0.08, d), lux ? '#3a3d42' : shade(body, 0.55), 0, 0.04, zm, { outline: false });
    const lit = new THREE.Group();
    g.add(lit);
    out.inUse = lit;

    const door = (side: number, dw: number, y0: number, y1: number, handleY: number, handleLen: number, color: string, extra?: (leaf: THREE.Group) => void) => {
      const hinge = new THREE.Group();
      hinge.position.set(side * (w / 2), 0, front);
      hinge.userData.swing = side;
      const leaf = new THREE.Group();
      leaf.position.x = -side * (dw / 2);
      hinge.add(leaf);
      part(leaf, rbox(dw - 0.008, y1 - y0 - 0.008, 0.05, 0.022), color, 0, (y0 + y1) / 2, 0.026);
      // The gasket and the shelves on the inside, with what's kept there.
      bit(leaf, box(dw - 0.04, y1 - y0 - 0.04, 0.008), '#d3d6d8', 0, (y0 + y1) / 2, -0.002);
      for (let y = y0 + 0.2, k = 0; y < y1 - 0.12; y += 0.3, k++) {
        bit(leaf, box(dw - 0.1, 0.012, 0.075), '#eaf1f4', 0, y, -0.04);
        bit(leaf, box(dw - 0.1, 0.05, 0.006), '#dcebf1', 0, y + 0.02, -0.077);
        const col = ['#f6a83a', '#7a3a1e', '#3e7a4f', '#fafafa'];
        const n = Math.max(2, Math.round((dw - 0.14) / 0.1));
        for (let i = 0; i < n; i++) if ((i + k) % 4 !== 3) bottleOf(leaf, col[(i + k) % col.length], -dw / 2 + 0.1 + i * ((dw - 0.2) / Math.max(1, n - 1)), y + 0.006, -0.04, 0.14 + ((i + k) % 2) * 0.03, 0.022);
      }
      if (lux) bit(leaf, rbox(0.024, handleLen, 0.024, 0.01), STEEL, -side * (dw / 2 - 0.05), handleY, 0.098);
      else part(leaf, rbox(0.034, handleLen, 0.036, 0.014), '#8f979e', -side * (dw / 2 - 0.05), handleY, 0.072);
      if (lux) for (const dy of [-1, 1]) bit(leaf, box(0.018, 0.018, 0.05), STEEL_D, -side * (dw / 2 - 0.05), handleY + dy * (handleLen / 2 - 0.05), 0.072);
      extra?.(leaf);
      g.add(hinge);
      (out.doors ??= []).push(hinge);
    };

    const zShelf = 0.14;
    let place: KtPlace;
    if (lux) {
      // Side by side: the freezer on the left (ice and water let into its door, a lit panel), the fresh food on the right,
      // long bars meeting in the middle. Brushed steel and hardly a magnet on it.
      const half = w / 2;
      compartment(g, lit, -half + T, -0.012, 0.08, H - T, back + T, front, true, true);
      compartment(g, lit, 0.012, half - T, 0.08, H - T, back + T, front, false, true);
      bit(g, box(0.024, H - 0.12, d - 0.02), shade(body, 0.85), 0, H / 2, zm);
      door(-1, half, 0.08, H - 0.01, 1.14, 0.86, c === '#90a4ae' ? '#c2c9ce' : tint(c, 0.4), (leaf) => {
        part(leaf, rbox(0.26, 0.4, 0.016, 0.018), '#25282c', -0.02, 1.2, 0.055);
        bit(leaf, box(0.2, 0.2, 0.012), '#16181b', -0.02, 1.15, 0.059);
        bit(leaf, box(0.06, 0.05, 0.03), STEEL, -0.02, 1.235, 0.066);
        bit(leaf, box(0.18, 0.012, 0.06), '#55595f', -0.02, 1.055, 0.075);
        picture(leaf, 0.2, 0.08, 400, (x, cw, ch) => {
          x.fillStyle = '#0d1a22';
          x.fillRect(0, 0, cw, ch);
          x.fillStyle = '#6fe0ff';
          x.font = `bold ${ch * 0.52}px sans-serif`;
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillText('3°  -18°', cw / 2, ch / 2);
        }, -0.02, 1.34, 0.0645);
        for (const y of [0.34, 0.5]) bit(leaf, box(half - 0.18, 0.006, 0.004), '#aeb6bb', 0, y, 0.053);
      });
      door(1, half, 0.08, H - 0.01, 1.14, 0.86, c === '#90a4ae' ? '#c2c9ce' : tint(c, 0.4), (leaf) => {
        for (const y of [0.34, 0.5]) bit(leaf, box(half - 0.18, 0.006, 0.004), '#aeb6bb', 0, y, 0.053);
        // One photo under one magnet.
        picture(leaf, 0.13, 0.17, 320, (x, cw, ch) => {
          x.fillStyle = '#fff';
          x.fillRect(0, 0, cw, ch);
          x.fillStyle = '#a7d3e6';
          x.fillRect(cw * 0.08, ch * 0.08, cw * 0.84, ch * 0.62);
          x.fillStyle = '#e28a68';
          x.beginPath();
          x.arc(cw * 0.5, ch * 0.42, Math.max(1, cw * 0.14), 0, Math.PI * 2);
          x.fill();
        }, 0.06, 1.42, 0.0535);
        bit(leaf, cyl(0.014, 0.014, 0.008, 10), '#c9a24b', 0.06, 1.5, 0.057, { rx: Math.PI / 2 });
      });
      // On top: the bottles and the crate of a kitchen that entertains.
      part(g, rbox(0.34, 0.12, 0.24, 0.02), WALNUT, -0.3, H + 0.06, zm - 0.05);
      out.work = marker(g, 0.18, 1.05, front + 0.05);
      place = { st: [0.33, 0.62], shelf: [0.33, 1.01, zShelf] };
    } else {
      // One door below, the freezer above: enamel gone a bit soft, a door everyone's stuck things to.
      compartment(g, lit, -w / 2 + T, w / 2 - T, 0.08, 1.2, back + T, front, false, false);
      part(g, box(w - 0.04, 0.02, d - 0.03), shade(body, 0.86), 0, 1.21, zm);
      part(g, rbox(w - 0.008, 0.6, 0.05, 0.022), body, 0, 1.53, front + 0.026);
      part(g, rbox(0.034, 0.22, 0.036, 0.014), '#8f979e', w / 2 - 0.06, 1.34, front + 0.07);
      bit(g, box(w - 0.04, 0.012, 0.012), shade(body, 0.7), 0, 1.222, front + 0.05);
      door(-1, w, 0.08, 1.21, 0.97, 0.3, body, (leaf) => {
        picture(leaf, w - 0.14, 0.86, 380, fridgeFront, -0.01, 0.62, 0.0525);
      });
      // Up on top: the cereal, a tin, a basket.
      part(g, box(0.15, 0.26, 0.07), '#f2b135', -0.2, H + 0.13, zm);
      bit(g, box(0.1, 0.1, 0.002), '#e8602c', -0.2, H + 0.15, zm + 0.036);
      part(g, cyl(0.06, 0.06, 0.13, 10), '#c75b4a', 0.02, H + 0.065, zm + 0.05);
      part(g, cyl(0.12, 0.1, 0.09, 10), WARM_WOOD, 0.22, H + 0.045, zm);
      out.work = marker(g, w / 2 - 0.12, 1.0, front + 0.05);
      place = { st: [0.05, 0.62], shelf: [0.05, 1.01, zShelf] };
    }

    // What's taken out: a packet of biscuits, a sandwich in its wrap, the bowl of batter with its whisk.
    const snack = new THREE.Group();
    snack.name = 'biscuit packet';
    part(snack, rbox(0.075, 0.13, 0.032, 0.01), '#ec6f4f', 0, 0.02, 0, { outline: false });
    bit(snack, box(0.05, 0.05, 0.002), '#ffe08a', 0, 0.03, 0.017);
    bit(snack, box(0.078, 0.014, 0.012), '#d95e40', 0, 0.09, 0);
    const sandwich = new THREE.Group();
    sandwich.name = 'sandwich';
    const bread = new THREE.Group();
    sandwich.add(bread);
    bit(bread, box(0.11, 0.022, 0.09), '#f3d9a5', 0, 0.022, 0);
    bit(bread, box(0.112, 0.014, 0.09), '#7cb342', 0, 0.002, 0);
    bit(bread, box(0.11, 0.022, 0.09), '#f3d9a5', 0, -0.018, 0);
    const bowl = new THREE.Group();
    bowl.name = 'mixing bowl';
    const shell = part(bowl, cyl(0.12, 0.07, 0.095, 16), '#e9e2d4', 0, 0.048, 0, { outline: false });
    shell.castShadow = true;
    const batter = bit(bowl, cyl(0.11, 0.11, 0.006, 14), '#f4d58b', 0, 0.078, 0);
    const whisk = new THREE.Group();
    whisk.name = 'whisk';
    const WLEN = 0.2;
    bit(whisk, cyl(0.012, 0.012, 0.11, 8), '#b77b43', 0, 0.0, 0);
    bit(whisk, cyl(0.006, 0.006, 0.06, 6), STEEL, 0, 0.08, 0);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0022, 4, 12), new THREE.MeshToonMaterial({ color: STEEL }));
      m.userData.ownGeometry = m.userData.ownMaterial = true;
      m.position.set(0, WLEN - 0.03, 0);
      m.rotation.y = (i * Math.PI) / 4;
      m.scale.y = 1.4;
      whisk.add(m);
    }
    bowl.add(whisk);
    lit.add(snack, sandwich, bowl);
    const wdir = new THREE.Vector3(0.25, 0.85, 0.35).normalize();
    const toHead = wdir.clone().negate();
    whisk.quaternion.setFromUnitVectors(UP, toHead);
    const whiskGrip: Grip = { at: v(0, 0, 0), axis: toHead.clone(), shape: 'power' };
    const bowlGrips: Partial<Record<Side, Grip>> = {
      left: { at: v(-0.02, -0.002, 0), axis: v(-1, 0, 0), palm: v(0, 1, 0), shape: 'flat', radius: 0.008 },
      right: whiskGrip,
    };
    const snackGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0.015, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.022 } };
    const sandwichGrips: Partial<Record<Side, Grip>> = {
      right: { at: v(0.062, 0, 0.008), axis: v(0, 0, -1), shape: 'cradle', radius: 0.028 },
      left: { at: v(-0.062, 0, 0.008), axis: v(0, 0, -1), shape: 'cradle', radius: 0.028 },
    };

    const sn = use(g, 'ktSnack', place.st[0], place.st[1], place);
    const ml = use(g, 'ktMeal', place.st[0], place.st[1], place);
    const bk = use(g, 'ktBake', place.st[0], place.st[1], place);
    out.spots = { snack: sn, quickMeal: ml, bakeCake: bk };
    const uses: Array<[KtMotion, Spot]> = [['ktSnack', sn], ['ktMeal', ml], ['ktBake', bk]];
    bowl.visible = sandwich.visible = snack.visible = false;
    out.animate = (t) => {
      sn.held = ml.held = bk.held = null;
      snack.visible = sandwich.visible = bowl.visible = false;
      const now = liveOf(uses, t);
      if (!now) return;
      const n = ktNow(now.m, now.u, now.H, t, place);
      if (n.hold === 'snack') {
        snack.visible = true;
        placeTool(snack, n);
        hold(now.s, g, n, snack, 'right', snackGrips);
      } else if (n.hold === 'sandwich') {
        sandwich.visible = true;
        placeTool(sandwich, n);
        bread.scale.x = 1 - 0.45 * (n.v.bite ?? 0);
        hold(now.s, g, n, sandwich, 'right', sandwichGrips);
      } else if (n.hold === 'bowl' || now.m === 'ktBake') {
        bowl.visible = true;
        placeTool(bowl, n);
        const head = vv(n.sub ?? [0, 0.04, 0]);
        whisk.position.copy(head).addScaledVector(wdir, WLEN);
        whiskGrip.at.copy(whisk.position);
        batter.scale.setScalar(0.82 + 0.18 * (n.v.batter ?? 0));
        if (n.hold === 'bowl') hold(now.s, g, n, bowl, 'left', bowlGrips);
      }
    };
  };
}

// -------------------------------------------------------------------------------------------------
// The range: a real oven with a door that opens, burners that light, a pan the hands really have.

function flameRing(g: THREE.Object3D, x: number, y: number, z: number, r: number): THREE.Group {
  const ring = new THREE.Group();
  ring.position.set(x, y, z);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const m = glow(ring, cyl(0, 0.011, 0.05, 5), i % 2 ? FLAME : FLAME_CORE, Math.cos(a) * r, 0.022, Math.sin(a) * r, { rz: -Math.cos(a) * 0.5, rx: Math.sin(a) * 0.5 });
    m.userData.flick = i;
  }
  g.add(ring);
  return ring;
}
const flicker = (ring: THREE.Group, k: number, t: number) => {
  ring.visible = k > 0.03;
  ring.children.forEach((m) => {
    const i = m.userData.flick as number;
    m.scale.y = k * (0.8 + 0.35 * Math.sin(t * 16 + i * 2.1));
  });
};

function range(lux: boolean): Builder {
  return (g, W, D, _c, _def, _ctx, out) => {
    const wd = W - 0.06;
    const face = lux ? STEEL : ENAMEL;
    const faceD = lux ? STEEL_D : shade(ENAMEL, 0.84);
    const zf = 0.45;
    const zb = -D / 2 + 0.05;
    const dep = zf - zb;
    const zm = (zf + zb) / 2;
    // The case, open at the oven: sides, floor, the band with the knobs, the top.
    for (const sx of [-1, 1]) part(g, box(0.035, 0.88, dep), faceD, sx * (wd / 2 - 0.0175), 0.44, zm);
    part(g, box(wd, 0.16, dep), lux ? '#2c2e33' : shade(ENAMEL, 0.7), 0, 0.08, zm);
    part(g, box(wd, 0.14, dep), face, 0, 0.81, zm);
    part(g, box(wd, 0.72, 0.02), '#201c1a', 0, 0.45, zb + 0.12, { outline: false });
    // The oven's inside: dark walls, a rack, and in use its light.
    for (const sx of [-1, 1]) bit(g, box(0.006, 0.56, dep - 0.14), '#2a2522', sx * (wd / 2 - 0.04), 0.45, zm + 0.06);
    for (let i = 0; i < 6; i++) bit(g, box(wd - 0.12, 0.006, 0.006), STEEL_D, 0, 0.36, zb + 0.2 + i * 0.09);
    // The hob.
    part(g, rbox(wd, 0.03, dep + 0.01, 0.006), lux ? '#26282c' : '#efe9dc', 0, 0.895, zm);
    bit(g, box(wd, 0.05, 0.03), lux ? STEEL : ENAMEL, 0, 0.93, zb + 0.015);
    const burners: Array<[number, number, number]> = lux ? [[-0.2, 0.17, 0.05], [0.2, 0.17, 0.05], [-0.2, -0.2, 0.04], [0.2, -0.2, 0.04], [0, -0.02, 0.06]] : [[-0.2, 0.17, 0.045], [0.2, 0.17, 0.045], [-0.2, -0.2, 0.04], [0.2, -0.2, 0.04]];
    for (const [x, z, r] of burners) {
      bit(g, cyl(r + 0.03, r + 0.04, 0.012, 16), lux ? '#3a3b40' : STEEL, x, 0.915, z);
      bit(g, cyl(r, r + 0.006, 0.02, 14), lux ? BRASS : '#50504f', x, 0.93, z);
      bit(g, cyl(r * 0.7, r * 0.8, 0.006, 12), IRON, x, 0.942, z);
    }
    // The grates: cast iron, the whole width on the better one.
    if (lux) {
      for (const z of [-0.33, -0.2, -0.07, 0.04, 0.17, 0.3]) part(g, box(wd - 0.08, 0.018, 0.016), IRON, 0, 0.958, z, { outline: false });
      for (const x of [-0.36, -0.2, 0, 0.2, 0.36]) part(g, box(0.016, 0.022, 0.72), IRON, x, 0.955, -0.02, { outline: false });
    } else {
      for (const [x, z] of [[-0.2, 0.17], [0.2, 0.17], [-0.2, -0.2], [0.2, -0.2]]) {
        part(g, box(0.28, 0.014, 0.014), IRON, x, 0.958, z, { outline: false });
        part(g, box(0.014, 0.014, 0.28), IRON, x, 0.958, z, { outline: false });
      }
    }
    // Knobs along the band: each burner's, turned while it's lit.
    const knobs: THREE.Object3D[] = [];
    const xs = lux ? [-0.3, -0.2, -0.1, 0.2, 0.3] : [-0.3, -0.1, 0.1, 0.3];
    xs.forEach((x) => {
      const k = part(g, cyl(0.026, 0.03, 0.03, 12), lux ? BRASS : '#3f3d3a', x, 0.83, zf + 0.015, { rx: Math.PI / 2, outline: false });
      bit(k, box(0.008, 0.012, 0.042), lux ? '#fff0c0' : '#fafafa', 0, -0.012, 0);
      knobs.push(k);
    });
    const panKnob = knobs[0];
    const potKnob = knobs[knobs.length - 1];
    if (lux) {
      // A clock, blue on black.
      picture(g, 0.14, 0.05, 500, (x, cw, ch) => {
        x.fillStyle = '#0b0f14';
        x.fillRect(0, 0, cw, ch);
        x.fillStyle = '#5fd0ff';
        x.font = `bold ${ch * 0.7}px monospace`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('18:42', cw / 2, ch / 2);
      }, 0.05, 0.83, zf + 0.0015);
    }
    // The oven door, hinged at its foot: a window, a bar, a towel over it.
    const door = new THREE.Group();
    door.position.set(0, 0.16, zf);
    const dh = 0.56;
    const dw = wd - 0.06;
    part(door, box(dw, dh, 0.03), lux ? STEEL : ENAMEL, 0, dh / 2, 0.012);
    bit(door, box(dw - 0.2, dh * 0.5, 0.004), lux ? '#1a1c1f' : '#2f2b28', 0, dh * 0.46, 0.0285);
    const pane = bit(door, box(dw - 0.22, dh * 0.47, 0.002), '#ffc96e', 0, dh * 0.46, 0.032);
    pane.visible = false;
    part(door, cyl(0.014, 0.014, dw - 0.14, 8), lux ? BRASS : STEEL, 0, dh - 0.04, 0.05, { rz: Math.PI / 2, outline: false });
    for (const sx of [-1, 1]) bit(door, box(0.012, 0.012, 0.04), lux ? BRASS : STEEL_D, sx * (dw / 2 - 0.09), dh - 0.04, 0.035);
    // A tea towel hung on the plain one's bar.
    if (!lux) {
      bit(door, box(0.15, 0.2, 0.012), '#d9594c', 0.16, dh - 0.14, 0.064);
      bit(door, box(0.15, 0.03, 0.013), '#f8f1e4', 0.16, dh - 0.16, 0.0642);
      bit(door, box(0.15, 0.03, 0.013), '#f8f1e4', 0.16, dh - 0.22, 0.0642);
    }
    g.add(door);
    // What's kept on it when nobody's cooking: the kettle, the crock of spoons, salt and oil.
    const kx = 0.2;
    const kz = -0.2;
    if (lux) {
      part(g, cyl(0.075, 0.1, 0.13, 14), '#c47a4c', kx, 1.03, kz);
      part(g, cyl(0.02, 0.075, 0.03, 10), '#a8623a', kx, 1.11, kz, { outline: false });
    } else {
      part(g, cyl(0.07, 0.095, 0.13, 12), '#d2d6d9', kx, 1.03, kz);
      part(g, cyl(0.016, 0.07, 0.03, 10), '#9aa1a6', kx, 1.11, kz, { outline: false });
    }
    rod(g, v(kx - 0.05, 1.12, kz), v(kx - 0.05, 1.18, kz), 0.006, IRON);
    rod(g, v(kx + 0.05, 1.12, kz), v(kx + 0.05, 1.18, kz), 0.006, IRON);
    rod(g, v(kx - 0.05, 1.18, kz), v(kx + 0.05, 1.18, kz), 0.008, IRON);
    rod(g, v(kx + 0.08, 1.03, kz), v(kx + 0.15, 1.08, kz), 0.009, lux ? '#a8623a' : '#9aa1a6');
    if (lux) {
      // The wall behind: tiles, a rail with what's used most, a slim hood above with its lamp.
      const tile = picture(g, wd, 0.62, 180, (x, cw, ch) => {
        x.fillStyle = '#e9e1d2';
        x.fillRect(0, 0, cw, ch);
        x.strokeStyle = '#b9ad96';
        x.lineWidth = 1.5;
        const n = 6;
        for (let r = 0; r < n; r++) {
          const y = (r * ch) / n;
          const off = r % 2 ? cw / 12 : 0;
          x.beginPath();
          x.moveTo(0, y);
          x.lineTo(cw, y);
          x.stroke();
          for (let cc = 0; cc < 7; cc++) {
            x.beginPath();
            x.moveTo(off + (cc * cw) / 6, y);
            x.lineTo(off + (cc * cw) / 6, y + ch / n);
            x.stroke();
          }
        }
      }, 0, 1.27, zb + 0.022);
      tile.castShadow = false;
      part(g, box(wd, 0.62, 0.02), '#d8cfbd', 0, 1.27, zb + 0.008, { outline: false });
      rod(g, v(-wd / 2 + 0.08, 1.38, zb + 0.05), v(wd / 2 - 0.08, 1.38, zb + 0.05), 0.007, BRASS);
      for (const [x, col, len] of [[-0.28, '#6b4630', 0.26], [-0.14, STEEL, 0.28], [0.02, STEEL, 0.24]] as const) {
        bit(g, box(0.014, len, 0.008), col, x, 1.38 - len / 2, zb + 0.05);
        bit(g, rbox(0.06, 0.08, 0.008, 0.004), col, x, 1.38 - len, zb + 0.05);
      }
      bit(g, rbox(0.14, 0.14, 0.012, 0.004), WARM_WOOD, 0.26, 1.2, zb + 0.04, { rz: 0.03 });
      part(g, rbox(wd, 0.1, 0.42, 0.02), STEEL, 0, 1.68, zb + 0.21);
      part(g, box(0.34, 0.26, 0.26), STEEL_D, 0, 1.84, zb + 0.13);
    }
    bit(g, cyl(0.03, 0.03, 0.07, 8), '#ece8db', -0.31, 0.945, zb + 0.06);
    bottleOf(g, '#d8a83b', -0.2, 0.91, zb + 0.06, 0.2, 0.028);
    if (lux) {
      bottleOf(g, '#7a2d1f', -0.1, 0.91, zb + 0.06, 0.2, 0.028);
      bit(g, cyl(0.025, 0.025, 0.06, 8), '#9a7050', -0.02, 0.94, zb + 0.06);
    }

    // In use.
    const live = new THREE.Group();
    g.add(live);
    out.inUse = live;
    const panRing = flameRing(live, ST.pan[0], 0.94, ST.pan[2], 0.112);
    const potRing = flameRing(live, ST.pot[0], 0.94, ST.pot[2], 0.13);
    const lamp = lux ? glow(live, box(wd - 0.2, 0.012, 0.3), LIGHT_WARM, 0, 1.627, zb + 0.21) : null;
    const ovenGlow = glow(live, box(wd - 0.1, 0.5, 0.004), LIGHT_WARM, 0, 0.45, zb + 0.14);
    const roast = new THREE.Group();
    live.add(roast);
    bit(roast, box(0.46, 0.014, 0.3), '#5a5f64', 0, 0.37, zm + 0.02);
    bit(roast, dot(0.075), '#b5652c', 0.02, 0.41, zm + 0.02);

    // The pan: its handle in the left hand, the turner (a part of it, so both hands stay on the one thing) in the right.
    const pan = new THREE.Group();
    pan.name = 'frying pan';
    part(pan, cyl(0.13, 0.11, 0.05, 18), lux ? '#a65f38' : '#37383d', 0, 0.025, 0, { outline: false });
    bit(pan, cyl(0.118, 0.118, 0.004, 18), lux ? '#3c3a39' : '#232327', 0, 0.044, 0);
    rod(pan, v(-0.075, 0.042, 0.1), vv(PAN.grip).add(v(-0.045, 0.012, 0.06)), HANDLE_R, lux ? BRASS : '#2c2a2a');
    const food = new THREE.Group();
    pan.add(food);
    const greens = ['#7cb342', '#e9b44c', '#d4553f', '#7cb342', '#c98b3d', '#f1d79c', '#d4553f', '#e9b44c'];
    const bits: THREE.Mesh[] = [];
    greens.forEach((col, i) => bits.push(bit(food, rbox(0.04, 0.016, 0.03, 0.006), col, Math.cos(i * 2.2) * (0.03 + 0.02 * i * 0.5), 0.056, Math.sin(i * 2.2) * (0.03 + 0.02 * i * 0.5), { ry: i })));
    const steak = new THREE.Group();
    steak.position.y = 0.06;
    pan.add(steak);
    bit(steak, rbox(0.14, 0.025, 0.1, 0.012), '#8c4a2a', 0, 0, 0);
    bit(steak, box(0.11, 0.002, 0.07), '#5a2d17', 0, 0.0135, 0);
    bit(steak, dot(0.018), '#7cb342', 0.03, 0.022, 0.01);
    const turner = new THREE.Group();
    turner.name = 'turner';
    pan.add(turner);
    bit(turner, cyl(HANDLE_R, HANDLE_R, 0.12, 8), lux ? WALNUT : '#3a3a3e', 0, 0, 0);
    bit(turner, cyl(0.005, 0.005, 0.12, 6), STEEL, 0, 0.1, 0);
    bit(turner, box(0.085, 0.09, 0.004), STEEL, 0, PAN.turnerLen - 0.03, 0);
    const toHead = vv(PAN.turner).negate();
    turner.quaternion.setFromUnitVectors(UP, toHead);
    const turnerGrip: Grip = { at: v(0, 0, 0), axis: toHead.clone(), shape: 'power' };
    const handleAxis = v(0.6, -0.08, -0.8).normalize();
    const panGrips: Partial<Record<Side, Grip>> = { left: { at: vv(PAN.grip), axis: handleAxis, shape: 'power' }, right: turnerGrip };
    live.add(pan);
    const burst = Array.from({ length: 5 }, (_, i) => glow(pan, cyl(0, 0.05, 0.2, 6), FIRE, Math.cos(i * 1.26) * 0.05, 0.12, Math.sin(i * 1.26) * 0.05));

    // The big pot, its lid, the ladle.
    const pot = new THREE.Group();
    pot.position.set(ST.pot[0], ST.pot[1], ST.pot[2]);
    part(pot, cyl(0.15, 0.14, 0.2, 18), lux ? '#b7bcc1' : '#c0432f', 0, 0.1, 0);
    bit(pot, cyl(0.138, 0.138, 0.004, 16), '#a8562e', 0, 0.17, 0);
    for (const sx of [-1, 1]) bit(pot, rbox(0.04, 0.016, 0.03, 0.006), STEEL_D, sx * 0.165, 0.17, 0);
    live.add(pot);
    const lid = new THREE.Group();
    lid.name = 'pot lid';
    part(lid, cyl(0.03, 0.15, 0.022, 16), lux ? '#c6cbcf' : '#c0432f', 0, -0.02, 0, { outline: false });
    bit(lid, cyl(0.016, 0.016, 0.028, 8), '#2f2f33', 0, 0, 0);
    live.add(lid);
    const lidGrips: Partial<Record<Side, Grip>> = { left: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.016 } };
    const ladle = new THREE.Group();
    ladle.name = 'ladle';
    bit(ladle, cyl(HANDLE_R, HANDLE_R, 0.1, 8), lux ? WALNUT : '#8a5a33', 0, 0, 0);
    bit(ladle, cyl(0.006, 0.006, 0.26, 6), STEEL, 0, 0.16, 0);
    const scoop = part(ladle, new THREE.SphereGeometry(0.038, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), STEEL, 0, 0.3, 0, { outline: false });
    scoop.userData.ownGeometry = true;
    scoop.rotation.x = Math.PI;
    scoop.material = (scoop.material as THREE.Material).clone();
    scoop.userData.ownMaterial = true;
    (scoop.material as THREE.Material).side = THREE.DoubleSide;
    live.add(ladle);
    const ladleGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power' } };
    const steam = puffs(live, 4, STEAM, 0.05);
    const salt = Array.from({ length: 4 }, () => glow(live, box(0.006, 0.006, 0.006), FLAME_CORE, 0, 0, 0));

    const cook = use(g, 'ktSaute', -0.1, ST.stand);
    const stew = use(g, 'ktStew', 0.06, ST.stand);
    const fine = use(g, 'ktGourmet', -0.07, ST.stand);
    out.spots = { cook, cookFamily: stew, cookGourmet: fine };
    const uses: Array<[KtMotion, Spot]> = [['ktSaute', cook], ['ktStew', stew], ['ktGourmet', fine]];
    out.work = marker(g, -0.1, 0.98, 0.2);

    const settle = () => {
      door.rotation.x = 0;
      pane.visible = false;
      panKnob.rotation.y = potKnob.rotation.y = 0;
    };
    out.away = (_o, t) => {
      if (!liveOf(uses, t)) settle();
    };
    out.animate = (t) => {
      cook.held = stew.held = fine.held = null;
      const now = liveOf(uses, t);
      settle();
      pan.visible = pot.visible = lid.visible = ladle.visible = roast.visible = false;
      ovenGlow.visible = false;
      flicker(panRing, 0, t);
      flicker(potRing, 0, t);
      if (lamp) lamp.visible = !!now;
      for (const m of steam) m.visible = false;
      for (const m of salt) m.visible = false;
      for (const m of burst) m.visible = false;
      if (!now) {
        // The first moment, before the pose has said which: the burner under the pan, just lit.
        pan.visible = true;
        pan.position.set(ST.pan[0], ST.pan[1], ST.pan[2]);
        pan.rotation.set(0, 0, 0);
        steak.visible = false;
        return;
      }
      const n = ktNow(now.m, now.u, now.H, t);
      const k = n.v.flame ?? 0;
      if (now.m === 'ktStew') {
        pot.visible = lid.visible = ladle.visible = true;
        flicker(potRing, k, t);
        potKnob.rotation.y = -1.2 * (n.v.knob ?? 0);
        // The lid, on the pot or set down; the ladle in the pot or in the hand.
        const lidHeld = n.hold === 'lid';
        if (lidHeld && n.tool) lid.position.set(n.tool[0], n.tool[1], n.tool[2]);
        else if (n.v.lid) lid.position.set(-0.2, 1.0, 0.17);
        else lid.position.set(ST.pot[0], ST.potTop + 0.03, ST.pot[2]);
        if (lidHeld) hold(now.s, g, n, lid, 'left', lidGrips);
        if (n.hold === 'ladle') {
          placeTool(ladle, n);
          hold(now.s, g, n, ladle, 'right', ladleGrips);
        } else {
          const rest = add3(ST.pot, [0.105, 0.275, 0.165]);
          ladle.position.set(rest[0], rest[1], rest[2]);
          ladle.quaternion.setFromUnitVectors(UP, v(-0.35, -0.55, -0.55).normalize());
        }
        const open = n.v.lid ? 1 : 0.15;
        rise(steam, t, ST.pot[0], ST.potTop + 0.04, ST.pot[2], 0.5, k * open);
        if ((n.v.salt ?? 0) > 0.5)
          salt.forEach((m, i) => {
            const p = (t * 1.6 + i / 4) % 1;
            m.visible = true;
            m.position.set(ST.pot[0] - 0.06 + i * 0.01, 1.3 - p * 0.15, ST.pot[2] + 0.04);
          });
        return;
      }
      // A pan on the front left burner, the turner in it.
      pan.visible = true;
      flicker(panRing, k, t);
      panKnob.rotation.y = -1.2 * (n.v.knob ?? 0);
      placeTool(pan, n);
      const head = vv(n.sub ?? [0, 0.03, 0]);
      turner.position.copy(head).addScaledVector(vv(PAN.turner), PAN.turnerLen);
      turnerGrip.at.copy(turner.position);
      const gourmet = !!n.v.gourmet;
      food.visible = !gourmet;
      steak.visible = gourmet;
      const toss = n.v.toss ?? 0;
      bits.forEach((b, i) => {
        b.position.y = 0.056 + toss * (0.05 + 0.03 * ((i * 7) % 3));
        b.rotation.x = toss * (i + 1);
      });
      // Turned twice, a flip's quarter-circle each.
      const flip = n.v.flip ?? 0;
      steak.rotation.z = flip * Math.PI;
      steak.position.y = 0.06 + Math.sin(flip * Math.PI) * 0.03;
      if (n.hold === 'pan') hold(now.s, g, n, pan, 'left', panGrips);
      if (gourmet) {
        door.rotation.x = (n.v.door ?? 0) * 0.85;
        pane.visible = true;
        ovenGlow.visible = roast.visible = true;
        const b = n.v.burst ?? 0;
        burst.forEach((m, i) => {
          m.visible = b > 0.05;
          m.scale.set(b, b * (0.9 + 0.4 * Math.sin(t * 22 + i)), b);
        });
      }
      rise(steam, t, ST.pan[0], ST.pan[1] + 0.08, ST.pan[2], 0.42, k * (gourmet ? 0.9 : 0.6));
    };
  };
}
const HANDLE_R = 0.014;
const add3 = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// -------------------------------------------------------------------------------------------------
// The coffee maker: a filter machine on its own small counter, a jug it really drips into.

const coffeeMaker: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const wd = Math.min(W, 0.96) - 0.04;
  const z0 = -D / 2 + 0.04;
  const z1 = 0.34;
  const dep = z1 - z0;
  const zm = (z0 + z1) / 2;
  part(g, rbox(wd - 0.03, CF.top - 0.08, dep - 0.02, 0.012), WARM_WOOD, 0, (CF.top + 0.04) / 2, zm);
  part(g, box(wd - 0.06, 0.06, dep - 0.06), shade(WARM_WOOD, 0.5), 0, 0.03, zm, { outline: false });
  for (const sx of [-1, 1]) {
    bit(g, box(wd / 2 - 0.05, 0.62, 0.01), shade(WARM_WOOD, 1.1), (sx * wd) / 4, 0.46, z1 - 0.004);
    bit(g, box(0.1, 0.012, 0.012), BRASS, (sx * wd) / 4 - sx * 0.1, 0.7, z1 + 0.006);
  }
  part(g, rbox(wd, 0.03, dep, 0.008), '#ecdfca', 0, CF.top - 0.015, zm);
  // The machine: a tank behind, a head out over the jug, a plate under it, the button at the side.
  const x = CF.carafe[0];
  const zj = CF.carafe[2];
  part(g, rbox(0.25, 0.016, 0.28, 0.006), '#34343a', x, CF.top + 0.008, zj - 0.06, { outline: false });
  bit(g, cyl(0.085, 0.085, 0.006, 16), '#191919', x, CF.top + 0.018, zj);
  part(g, rbox(0.25, 0.42, 0.14, 0.03), '#34343a', x, CF.top + 0.21, zj - 0.14);
  // Water behind a window in the tank.
  bit(g, box(0.05, 0.22, 0.006), '#a8d6ea', x + 0.09, CF.top + 0.24, zj - 0.066);
  part(g, rbox(0.25, 0.1, 0.24, 0.03), '#3e3e45', x, CF.top + 0.37, zj - 0.04);
  bit(g, cyl(0.06, 0.036, 0.055, 12), '#1e1e22', x, CF.top + 0.3, zj);
  part(g, rbox(0.09, 0.14, 0.11, 0.014), '#46464d', CF.button[0] + 0.0, CF.top + 0.07, CF.button[2] - 0.025);
  bit(g, cyl(0.016, 0.016, 0.01, 10), '#d94636', CF.button[0], CF.button[1], CF.button[2] + 0.03, { rx: Math.PI / 2 });
  // What stands round it: a canister, a jar of sugar, two more mugs on a tray, a basket of what's quick.
  part(g, cyl(0.06, 0.06, 0.15, 12), '#b0754a', 0.32, CF.top + 0.075, -0.16);
  bit(g, cyl(0.065, 0.065, 0.02, 12), WALNUT, 0.32, CF.top + 0.16, -0.16);
  bit(g, cyl(0.04, 0.04, 0.09, 10), '#f4f1e6', 0.16, CF.top + 0.045, -0.2);
  part(g, rbox(0.3, 0.012, 0.15, 0.004), WALNUT, 0.28, CF.top + 0.006, 0.0, { outline: false });
  for (const [mx, col] of [[0.2, '#6d97b3'], [0.36, '#d59a56']] as const) {
    bit(g, cyl(0.036, 0.03, 0.085, 10), col, mx, CF.top + 0.055, 0);
    bit(g, box(0.012, 0.05, 0.015), col, mx + 0.04, CF.top + 0.06, 0);
  }
  // The basket; rice balls and biscuits for a hungry moment.
  part(g, cyl(0.1, 0.08, 0.08, 10), WARM_WOOD, CF.basket[0], CF.top + 0.04, CF.basket[2]);
  for (let i = 0; i < 3; i++) {
    bit(g, cyl(0.03, 0.03, 0.03, 3), i === 2 ? '#f6f3e8' : '#26302a', CF.basket[0] - 0.045 + i * 0.045, CF.top + 0.095, CF.basket[2] + (i % 2) * 0.02, { rx: Math.PI / 2 });
  }

  // The jug, its coffee rising.
  const jug = new THREE.Group();
  jug.name = 'coffee jug';
  part(jug, cyl(0.055, 0.07, 0.11, 14), '#cfe5ec', 0, 0.056, 0, { outline: false });
  const coffee = bit(jug, cyl(0.062, 0.067, 0.07, 14), '#3c2415', 0, 0.042, 0);
  bit(jug, cyl(0.04, 0.05, 0.016, 12), '#20201f', 0, 0.116, 0);
  const handleTop = v(CF.carafeGrip[0], 0.115, 0);
  const handleBot = v(CF.carafeGrip[0], 0.03, 0);
  rod(jug, handleTop, handleBot, 0.012, '#202024');
  rod(jug, v(0.05, 0.115, 0), handleTop, 0.007, '#202024');
  rod(jug, v(0.06, 0.03, 0), handleBot, 0.007, '#202024');
  g.add(jug);
  const jugGrips: Partial<Record<Side, Grip>> = { right: { at: vv(CF.carafeGrip), axis: v(0, 1, 0), shape: 'power', radius: 0.012 } };
  // The mug.
  const mug = new THREE.Group();
  mug.name = 'mug';
  part(mug, cyl(0.04, 0.034, 0.09, 12), '#efeee6', 0, 0.045, 0, { outline: false });
  const inMug = bit(mug, cyl(0.035, 0.035, 0.05, 10), '#3c2415', 0, 0.06, 0);
  rod(mug, v(CF.mugGrip[0], 0.07, 0), v(CF.mugGrip[0], 0.02, 0), 0.008, '#efeee6');
  rod(mug, v(0.038, 0.07, 0), v(CF.mugGrip[0], 0.07, 0), 0.006, '#efeee6');
  rod(mug, v(0.033, 0.02, 0), v(CF.mugGrip[0], 0.02, 0), 0.006, '#efeee6');
  g.add(mug);
  const mugGrips: Partial<Record<Side, Grip>> = { right: { at: vv(CF.mugGrip), axis: v(0, 1, 0), shape: 'power', radius: 0.012 } };
  // In use: the light, the drip, the steam, the stream poured; a rice ball taken from the basket.
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const led = glow(live, cyl(0.016, 0.016, 0.004, 10), LED_ON, CF.button[0], CF.button[1], CF.button[2] + 0.037, { rx: Math.PI / 2 });
  const drops = Array.from({ length: 3 }, () => glow(live, dot(0.006), BREW, x, 0, zj));
  const stream = glow(live, cyl(0.006, 0.006, 1, 6), BREW, 0, 0, 0);
  const steam = puffs(live, 3, STEAM, 0.03);
  const riceBall = new THREE.Group();
  riceBall.name = 'rice ball';
  bit(riceBall, cyl(0.045, 0.045, 0.035, 3), '#f7f4ea', 0, 0, 0, { rx: Math.PI / 2 });
  bit(riceBall, box(0.05, 0.03, 0.04), '#26302a', 0, -0.022, 0);
  live.add(riceBall);
  const riceGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, -0.01, 0), axis: v(0, 0, -1), shape: 'pinch', radius: 0.02 } };

  const drink = use(g, 'ktCoffee', 0.12, CF.stand);
  const pantryPlace: KtPlace = { st: [-0.14, CF.stand], shelf: [CF.basket[0], CF.basket[1] + 0.06, CF.basket[2]] };
  const pantry = use(g, 'ktPantry', pantryPlace.st[0], pantryPlace.st[1], pantryPlace);
  out.spots = { drinkCoffee: drink, pantrySnack: pantry };
  out.work = marker(g, x, CF.top + 0.12, zj + 0.06);
  const uses: Array<[KtMotion, Spot]> = [['ktCoffee', drink], ['ktPantry', pantry]];
  const setRest = () => {
    jug.position.set(CF.carafe[0], CF.carafe[1], CF.carafe[2]);
    jug.rotation.set(0, 0, 0);
    mug.position.set(CF.mug[0], CF.mug[1], CF.mug[2]);
    mug.rotation.set(0, 0, 0);
    coffee.scale.y = 0.55;
    coffee.position.y = 0.02 + 0.022 * 0.55;
    inMug.scale.y = 0.05;
  };
  setRest();
  out.away = (_o, t) => {
    if (!liveOf(uses, t)) setRest();
  };
  out.animate = (t) => {
    drink.held = pantry.held = null;
    const now = liveOf(uses, t);
    setRest();
    led.visible = false;
    stream.visible = false;
    riceBall.visible = false;
    for (const d of drops) d.visible = false;
    for (const s of steam) s.visible = false;
    if (!now) return;
    const n = ktNow(now.m, now.u, now.H, t, now.m === 'ktPantry' ? pantryPlace : undefined);
    if (now.m === 'ktPantry') {
      if (n.hold) {
        riceBall.visible = true;
        placeTool(riceBall, n);
        hold(now.s, g, n, riceBall, 'right', riceGrips);
      }
      return;
    }
    led.visible = true;
    const level = Math.max(0.05, (n.v.drip ?? 0) * (n.v.jug ?? 1));
    coffee.scale.y = level;
    coffee.position.y = 0.012 + 0.035 * level;
    inMug.scale.y = Math.max(0.05, n.v.mug ?? 0);
    inMug.position.y = 0.035 + 0.025 * Math.max(0.05, n.v.mug ?? 0);
    // Drops from the basket into the jug, while it's brewing.
    if ((n.v.drip ?? 0) > 0.02 && (n.v.drip ?? 0) < 0.995)
      drops.forEach((d, i) => {
        const p = (t * 1.6 + i / 3) % 1;
        d.visible = true;
        d.position.set(x, CF.top + 0.27 - p * 0.14, zj);
      });
    if (n.hold === 'carafe') {
      placeTool(jug, n);
      hold(now.s, g, n, jug, 'right', jugGrips);
    } else if (n.hold === 'mug') {
      placeTool(mug, n);
      hold(now.s, g, n, mug, 'right', mugGrips);
    }
    if (n.v.pouring) {
      stream.visible = true;
      const y0 = CF.mug[1] + 0.09;
      const y1 = jug.position.y + 0.02;
      stream.scale.y = Math.max(0.01, y1 - y0);
      stream.position.set(CF.mug[0], (y0 + y1) / 2, CF.mug[2]);
    }
    rise(steam, t, x, CF.top + 0.14, zj, 0.12, (n.v.drip ?? 0) * 0.5, 0.5);
  };
};

// -------------------------------------------------------------------------------------------------
// The home bar: a counter to work on, a back bar of bottles, a shaker, a stirring glass.

const bar: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const zb = -D / 2 + 0.04;
  // The counter, panelled, brass along the foot.
  const z0 = -0.02;
  const z1 = 0.47;
  const zm = (z0 + z1) / 2;
  const depth = z1 - z0;
  part(g, rbox(W - 0.08, BR.top - 0.04, depth, 0.012), WALNUT, 0, (BR.top - 0.04) / 2, zm);
  for (let i = 0; i < 8; i++) bit(g, box(0.2, BR.top - 0.2, 0.008), shade(WALNUT, i % 2 ? 1.1 : 1.22), -W / 2 + 0.17 + i * ((W - 0.34) / 7), (BR.top - 0.04) / 2 + 0.02, z1 + 0.003);
  part(g, rbox(W - 0.03, 0.05, depth + 0.05, 0.012), '#3f2b1f', 0, BR.top - 0.025, zm + 0.01);
  bit(g, box(W - 0.05, 0.008, 0.012), BRASS, 0, BR.top - 0.05, z1 + 0.03);
  rod(g, v(-W / 2 + 0.1, 0.13, z1 + 0.03), v(W / 2 - 0.1, 0.13, z1 + 0.03), 0.012, BRASS);
  for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) bit(g, box(0.015, 0.13, 0.015), BRASS, x, 0.065, z1 + 0.02);

  // The back bar: a cabinet, a mirror, two shelves of bottles, lit from under each.
  part(g, rbox(W - 0.06, BR.top + 0.02, 0.3, 0.012), shade(WALNUT, 0.9), 0, (BR.top + 0.02) / 2, zb + 0.17);
  part(g, box(W - 0.06, 0.6, 0.02), shade(WALNUT, 0.72), 0, BR.top + 0.32, zb + 0.015);
  bit(g, box(W - 0.2, 0.46, 0.005), '#a9c4cc', 0, BR.top + 0.28, zb + 0.03);
  for (const y of [BR.top + 0.03, BR.top + 0.3]) part(g, box(W - 0.14, 0.022, 0.2), '#4e3525', 0, y, zb + 0.13, { outline: false });
  const hues = ['#7a3a1e', '#2f6a42', '#c9a24b', '#3a5a86', '#8d2e3f', '#b86f2a', '#dcd0b4', '#5a2233', '#2f6a42', '#7a3a1e'];
  let hi = 0;
  for (const y of [BR.top + 0.04, BR.top + 0.31]) {
    for (let x = -W / 2 + 0.2; x < W / 2 - 0.15; x += 0.135, hi++) bottleOf(g, hues[hi % hues.length], x + (hi % 2) * 0.012, y, zb + 0.13 + (hi % 3) * 0.015, 0.21 + (hi % 3) * 0.018, 0.03);
  }
  part(g, box(W - 0.06, 0.04, 0.24), '#3f2b1f', 0, BR.top + 0.63, zb + 0.11);
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  for (const y of [BR.top + 0.017, BR.top + 0.287]) glow(live, box(W - 0.2, 0.006, 0.01), LIGHT_WARM, 0, y, zb + 0.225);
  glow(live, box(W - 0.2, 0.01, 0.01), LIGHT_WARM, 0, BR.top + 0.604, zb + 0.2);
  // Glasses hung under the top shelf; a bowl of limes and a board; napkins.
  for (let i = 0; i < 4; i++) {
    const gx = 0.32 + i * 0.13;
    bit(g, cyl(0.035, 0.012, 0.05, 8), '#d7eaf0', gx, BR.top + 0.545, zb + 0.15);
    bit(g, cyl(0.003, 0.003, 0.04, 5), '#d7eaf0', gx, BR.top + 0.585, zb + 0.15);
  }
  part(g, rbox(0.18, 0.02, 0.12, 0.006), WARM_WOOD, BR.lime[0], BR.top + 0.01, BR.lime[2]);
  for (let i = 0; i < 3; i++) bit(g, cyl(0.022, 0.022, 0.012, 8), '#a6cf5a', BR.lime[0] - 0.05 + i * 0.04, BR.top + 0.03, BR.lime[2] + (i % 2) * 0.012, { rx: 0.15 });
  bit(g, dot(0.03), '#9ccc4e', BR.lime[0] + 0.07, BR.top + 0.05, BR.lime[2] + 0.01);
  part(g, box(0.1, 0.012, 0.1), '#efe6d5', 0.64, BR.top + 0.006, 0.31);
  bit(g, cyl(0.05, 0.045, 0.1, 10), STEEL, 0.76, BR.top + 0.05, 0.14); // the ice bucket
  for (let i = 0; i < 4; i++) bit(g, box(0.02, 0.02, 0.02), '#e8f7fc', 0.73 + (i % 2) * 0.04, BR.top + 0.105, 0.13 + (i > 1 ? 0.03 : 0));

  // The tools. The shaker: both hands, along its length. A bottle by its waist, a long spoon, a stirring glass.
  const shaker = new THREE.Group();
  shaker.name = 'shaker';
  part(shaker, cyl(0.04, 0.034, 0.11, 12), STEEL, 0, -0.04, 0, { outline: false });
  part(shaker, cyl(0.03, 0.04, 0.05, 12), '#d2d7db', 0, 0.038, 0, { outline: false });
  bit(shaker, cyl(0.016, 0.03, 0.03, 10), STEEL_D, 0, 0.078, 0);
  bit(shaker, cyl(0.014, 0.014, 0.01, 8), '#d2d7db', 0, 0.097, 0);
  g.add(shaker);
  const shakerGrips: Partial<Record<Side, Grip>> = {
    // On its axis, a hand's breadth apart: `radius` is what sets the palm out to the metal. The cap's the left hand's: it pours to the
    // dweller's left, and the other way round the arms would cross.
    right: { at: v(0, -0.05, 0), axis: v(0, 1, 0), shape: 'cradle', radius: 0.037 },
    left: { at: v(0, 0.05, 0), axis: v(0, 1, 0), shape: 'cradle', radius: 0.036 },
  };
  const bottle = new THREE.Group();
  bottle.name = 'bottle';
  part(bottle, cyl(0.034, 0.034, 0.15, 10), '#7a3a1e', 0, 0.075, 0, { outline: false });
  bit(bottle, cyl(0.012, 0.034, 0.05, 10), '#7a3a1e', 0, 0.175, 0);
  bit(bottle, cyl(0.012, 0.012, 0.05, 8), '#2c1b12', 0, 0.225, 0);
  bit(bottle, box(0.05, 0.05, 0.002), '#efe0bf', 0, 0.08, 0.035);
  g.add(bottle);
  const bottleGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0.09, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.032 } };
  const glassTool = new THREE.Group();
  glassTool.name = 'stirring glass';
  part(glassTool, cyl(0.045, 0.04, 0.13, 12), '#cfe5ec', 0, 0.065, 0, { outline: false });
  const drinkIn = bit(glassTool, cyl(0.04, 0.036, 0.06, 10), '#c9782e', 0, 0.035, 0);
  g.add(glassTool);
  const glassGrips: Partial<Record<Side, Grip>> = { left: { at: v(0, 0.06, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.04 } };
  const spoon = new THREE.Group();
  spoon.name = 'bar spoon';
  bit(spoon, cyl(0.004, 0.004, 0.32, 6), STEEL, 0, 0.06, 0);
  bit(spoon, dot(0.009), STEEL, 0, -0.1, 0);
  bit(spoon, cyl(0.013, 0.01, 0.01, 8), STEEL, 0, 0.22, 0);
  g.add(spoon);
  const spoonGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pen', radius: 0.008 } };
  // The glass it ends up in.
  const gl = BR.glass;
  bit(g, cyl(0.03, 0.035, 0.008, 12), '#d7eaf0', gl[0], gl[1] + 0.004, gl[2]);
  bit(g, cyl(0.004, 0.004, 0.08, 6), '#d7eaf0', gl[0], gl[1] + 0.045, gl[2]);
  part(g, cyl(0.05, 0.012, 0.05, 12), '#d7eaf0', gl[0], gl[1] + 0.11, gl[2], { outline: false });
  const pourIn = bit(g, cyl(0.04, 0.016, 0.03, 12), '#d97a3b', gl[0], gl[1] + 0.112, gl[2]);
  const limeSlice = bit(g, cyl(0.02, 0.02, 0.007, 8), '#b3d868', gl[0] + 0.05, gl[1] + 0.14, gl[2], { rz: 1.2 });

  const mix = use(g, 'ktMix', 0.08, BR.stand);
  const tail = use(g, 'ktCocktail', 0.08, BR.stand);
  out.spots = { mixDrink: mix, mixCocktail: tail };
  out.work = marker(g, 0, BR.top + 0.05, 0.28);
  const uses: Array<[KtMotion, Spot]> = [['ktMix', mix], ['ktCocktail', tail]];
  const setRest = () => {
    shaker.position.set(BR.shaker[0], BR.shaker[1] + 0.1, BR.shaker[2]);
    shaker.rotation.set(0, 0, 0);
    bottle.position.set(BR.bottle[0], BR.bottle[1], BR.bottle[2]);
    bottle.rotation.set(0, 0, 0);
    glassTool.position.set(BR.mixGlass[0], BR.mixGlass[1], BR.mixGlass[2]);
    glassTool.rotation.set(0, 0, 0);
    spoon.position.set(BR.spoon[0] + 0.03, BR.spoon[1], BR.spoon[2] + 0.09);
    spoon.quaternion.setFromUnitVectors(UP, v(-0.2, -0.05, -0.95).normalize());
    pourIn.visible = limeSlice.visible = false;
    drinkIn.scale.y = 0.12;
  };
  setRest();
  out.away = (_o, t) => {
    if (!liveOf(uses, t)) setRest();
  };
  out.animate = (t) => {
    mix.held = tail.held = null;
    const now = liveOf(uses, t);
    setRest();
    if (!now) return;
    const n = ktNow(now.m, now.u, now.H, t);
    drinkIn.scale.y = Math.max(0.12, (n.v.shot ?? 0) * 1.3);
    const fill = n.v.fill ?? 0;
    pourIn.visible = fill > 0.02;
    pourIn.scale.set(0.6 + 0.4 * fill, Math.max(0.1, fill), 0.6 + 0.4 * fill);
    limeSlice.visible = (n.v.lime ?? 0) > 0.5;
    switch (n.hold) {
      case 'bottle':
        placeTool(bottle, n);
        hold(now.s, g, n, bottle, 'right', bottleGrips);
        break;
      case 'shaker':
        placeTool(shaker, n);
        hold(now.s, g, n, shaker, 'right', shakerGrips);
        break;
      case 'mixGlass':
        placeTool(glassTool, n);
        hold(now.s, g, n, glassTool, 'left', glassGrips);
        break;
      case 'barSpoon':
        placeTool(spoon, n);
        hold(now.s, g, n, spoon, 'right', spoonGrips);
        break;
    }
  };
};

// -------------------------------------------------------------------------------------------------
// The kitchen sink: two bowls, the draining board between them where the dishes wait (lot3d's lie there), a swan-neck tap.

const kitchenSink: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const hw = (W - 0.04) / 2;
  const top = 0.91;
  const zb = -D / 2 + 0.04;
  const zf = 0.46;
  const bz0 = -0.2;
  const bz1 = 0.42;
  const zm = (zb + zf) / 2;
  const floorY = 0.72;
  // The cupboard under, painted, with its two doors, and a towel over one's rail.
  const paint = '#8fa89a';
  part(g, rbox(W - 0.06, 0.62, zf - zb, 0.012), paint, 0, 0.39, zm);
  part(g, box(W - 0.1, 0.08, zf - zb - 0.06), shade(paint, 0.5), 0, 0.04, zm - 0.02, { outline: false });
  for (const sx of [-1, 1]) {
    bit(g, box(hw - 0.05, 0.52, 0.008), tint(paint, 0.18), (sx * hw) / 2, 0.4, zf + 0.003);
    bit(g, box(0.012, 0.09, 0.016), BRASS, sx * 0.05, 0.54, zf + 0.012);
  }
  bit(g, box(0.2, 0.3, 0.012), '#f4ecd8', -0.26, 0.42, zf + 0.012);
  for (const y of [0.31, 0.53]) bit(g, box(0.2, 0.02, 0.013), '#d4543f', -0.26, y, zf + 0.0125);
  // The top, in strips round the bowls: real holes.
  const slab = lightSlab(g, top);
  slab(0, (zb + bz0) / 2, W - 0.02, bz0 - zb); // the back
  slab(0, (bz1 + zf) / 2, W - 0.02, zf - bz1 + 0.02); // the front
  slab(0, (bz0 + bz1) / 2, 0.38, bz1 - bz0); // the draining board
  for (const sx of [-1, 1]) slab(sx * (hw - 0.012), (bz0 + bz1) / 2, 0.024, bz1 - bz0);
  // Its ribs, draining to each side.
  for (let i = 0; i < 7; i++) bit(g, box(0.32, 0.002, 0.012), '#b8c0c4', 0, top + 0.002, bz0 + 0.06 + i * 0.08);
  // Each bowl: walls and a floor, a plug.
  for (const sx of [-1, 1]) {
    const cx = sx * ((0.19 + (hw - 0.024)) / 2);
    const bw = hw - 0.024 - 0.19;
    const wallH = top - 0.02 - floorY;
    const wy = floorY + wallH / 2;
    bit(g, box(bw, 0.006, bz1 - bz0), '#aab2b7', cx, floorY, (bz0 + bz1) / 2);
    for (const z of [bz0, bz1]) bit(g, box(bw, wallH, 0.006), '#c6cdd1', cx, wy, z);
    for (const x of [cx - bw / 2, cx + bw / 2]) bit(g, box(0.006, wallH, bz1 - bz0), '#bcc4c8', x, wy, (bz0 + bz1) / 2);
    bit(g, cyl(0.024, 0.024, 0.004, 10), '#70777c', cx, floorY + 0.005, (bz0 + bz1) / 2);
  }
  // The tap on the back strip: a swan's neck over the right bowl, a lever.
  const baseX = 0.16;
  const baseZ = -0.31;
  bit(g, cyl(0.024, 0.03, 0.03, 10), STEEL, baseX, top + 0.015, baseZ);
  const pts = [v(baseX, top + 0.02, baseZ), v(baseX, top + 0.26, baseZ + 0.02), v(baseX + 0.03, top + 0.35, baseZ + 0.14), v(baseX + 0.09, top + 0.35, baseZ + 0.3), v(SN.spout[0], SN.spout[1] + 0.03, SN.spout[2] - 0.02), vv(SN.spout)];
  for (let i = 1; i < pts.length; i++) rod(g, pts[i - 1], pts[i], 0.011, STEEL);
  rod(g, v(baseX, top + 0.08, baseZ), v(baseX + 0.07, top + 0.11, baseZ), 0.006, STEEL_D);
  // What lives round it: soap, a dish of sponge, a mug drying, a pot of herbs in the corner.
  bottleOf(g, '#7fbf6a', -0.2, top, -0.33, 0.17, 0.028);
  part(g, rbox(0.12, 0.015, 0.09, 0.005), '#cdd3d6', -0.05, top + 0.008, -0.32, { outline: false });
  bit(g, rbox(0.085, 0.028, 0.06, 0.008), '#f4c542', -0.05, top + 0.03, -0.32);
  bit(g, box(0.085, 0.009, 0.06), '#4b8b4b', -0.05, top + 0.048, -0.32);
  part(g, cyl(0.05, 0.04, 0.08, 10), '#b76a48', -0.37, top + 0.04, -0.34);
  for (let i = 0; i < 5; i++) bit(g, dot(0.028), i % 2 ? '#6ea84b' : '#85bf58', -0.37 + Math.cos(i * 1.25) * 0.025, top + 0.11 + (i % 2) * 0.02, -0.34 + Math.sin(i * 1.25) * 0.025);
  part(g, cyl(0.037, 0.032, 0.085, 10), '#d59a56', 0.34, top + 0.045, -0.36, { rx: 0.18 });

  // In use: the water, foam in the wash bowl, a plate and its sponge.
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const stream = glow(live, cyl(0.011, 0.015, 1, 8), WATER, 0, 0, 0);
  const foam = Array.from({ length: 7 }, (_, i) => glow(live, dot(0.035), FOAM, SN.spout[0] + Math.cos(i * 0.9) * (0.04 + (i % 3) * 0.03), floorY + 0.05 + (i % 2) * 0.02, 0.1 + Math.sin(i * 0.9) * (0.05 + (i % 3) * 0.04)));
  const drops = Array.from({ length: 4 }, () => glow(live, dot(0.006), WATER, 0, 0, 0));
  const plate = new THREE.Group();
  plate.name = 'plate';
  part(plate, cyl(0.105, 0.08, 0.018, 16), '#faf7ef', 0, 0, 0, { outline: false });
  bit(plate, cyl(0.075, 0.075, 0.002, 14), '#e8d9bb', 0, 0.01, 0);
  const sponge = new THREE.Group();
  sponge.name = 'sponge';
  bit(sponge, rbox(0.08, 0.024, 0.055, 0.008), '#f4c542', 0, 0.008, 0);
  bit(sponge, box(0.08, 0.008, 0.055), '#4b8b4b', 0, 0.024, 0);
  plate.add(sponge);
  live.add(plate);
  const spongeGrip: Grip = { at: v(0, 0, 0), axis: v(-1, 0, 0), palm: v(0, -1, 0), shape: 'flat', radius: 0.012 };
  const plateGrips: Partial<Record<Side, Grip>> = {
    left: { at: v(-0.09, -0.012, 0.02), axis: v(-1, 0, 0), palm: v(0, 1, 0), shape: 'flat', radius: 0.006 },
    right: spongeGrip,
  };
  const wash = use(g, 'ktDishes', SN.x, SN.stand);
  const hands = use(g, 'ktHands', SN.x + 0.12, SN.stand);
  out.spots = { washDishes: wash, wash: hands };
  out.work = marker(g, 0, 0.94, 0.2);
  const uses: Array<[KtMotion, Spot]> = [['ktDishes', wash], ['ktHands', hands]];
  out.animate = (t) => {
    wash.held = hands.held = null;
    plate.visible = false;
    const now = liveOf(uses, t);
    const n = now ? ktNow(now.m, now.u, now.H, t) : null;
    const k = n ? n.v.water ?? 0 : 1;
    // The water, down from the tap's mouth to the bowl.
    const y0 = SN.spout[1] - 0.01;
    const y1 = floorY + 0.01;
    stream.visible = k > 0.02;
    stream.scale.set(Math.max(0.05, k), y0 - y1, Math.max(0.05, k));
    stream.position.set(SN.spout[0], (y0 + y1) / 2, SN.spout[2]);
    foam.forEach((f, i) => {
      f.visible = (n?.v.foam ?? 0.3) > 0.1;
      f.scale.setScalar((n?.v.foam ?? 0.3) * (0.75 + 0.25 * Math.sin(t * 3 + i)));
    });
    drops.forEach((d, i) => {
      const p = (t * 2.2 + i / 4) % 1;
      d.position.set(SN.spout[0] + Math.cos(i * 1.6 + t) * 0.03 * p, floorY + 0.02 + Math.sin(p * Math.PI) * 0.04, SN.spout[2] + Math.sin(i * 1.6 + t) * 0.03 * p);
    });
    if (!now || !n || now.m !== 'ktDishes' || !n.hold) return;
    plate.visible = true;
    placeTool(plate, n);
    const sub = vv(n.sub ?? [0, 0.028, 0]);
    sponge.position.copy(sub);
    spongeGrip.at.set(sub.x, sub.y + 0.028, sub.z);
    hold(now.s, g, n, plate, 'left', plateGrips);
  };
};
/** The stainless top, laid in strips. */
function lightSlab(g: THREE.Object3D, top: number) {
  return (x: number, z: number, w: number, d: number) => {
    if (w > 0 && d > 0) part(g, box(w, 0.025, d), '#d6dbde', x, top - 0.0125, z, { outline: false });
  };
}

// -------------------------------------------------------------------------------------------------
// The dining table: planks on four square legs out at the corners, an apron high enough for knees, a place laid at each chair.

const diningTable: Builder = (g, W, D, _c, _def, _ctx, out) => {
  // lot3d.ts pulls a chair in 0.17 and puts the eater's plate 0.36 ahead of the seat (0.47 from the middle): a top this
  // deep has it on the table instead of half over the edge. Food for everyone lies at 0.78.
  const top = 0.78;
  const TW = W + 0.1;
  const TD = D + 0.16;
  const wood = '#b38658';
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (TW / 2 - 0.09);
      const z = sz * (TD / 2 - 0.09);
      part(g, rbox(0.075, top - 0.04, 0.075, 0.012), shade(wood, 0.82), x, (top - 0.04) / 2, z);
    }
  }
  // The apron (its underside clears a sitter's knees), a stretcher down the middle, out of their way.
  for (const sz of [-1, 1]) part(g, box(TW - 0.22, 0.07, 0.03), shade(wood, 0.72), 0, top - 0.075, sz * (TD / 2 - 0.1), { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.03, 0.07, TD - 0.22), shade(wood, 0.72), sx * (TW / 2 - 0.1), top - 0.075, 0, { outline: false });
  // Four planks, a touch different, their joints showing.
  const planks = 4;
  const pd = TD / planks;
  for (let i = 0; i < planks; i++) part(g, rbox(TW, 0.035, pd - 0.004, 0.008), shade(wood, 0.96 + (i % 3) * 0.05), 0, top - 0.0175, -TD / 2 + pd * (i + 0.5), { outline: i === 0 || i === planks - 1 });
  // A long runner down the middle, a jar of spoons and the soy at one end, tissues at the other, a little green.
  bit(g, box(TW - 0.46, 0.002, 0.3), '#e8ddc8', 0, top + 0.001, 0);
  for (const sx of [-1, 1]) bit(g, box(0.02, 0.002, 0.3), '#c9543f', sx * (TW / 2 - 0.3), top + 0.0015, 0);
  part(g, cyl(0.035, 0.03, 0.1, 10), WARM_WOOD, 0.74, top + 0.05, -0.06);
  for (let i = 0; i < 4; i++) rod(g, v(0.74, top + 0.03, -0.06), v(0.72 + i * 0.013, top + 0.17, -0.07 + (i % 2) * 0.02), 0.004, i % 2 ? STEEL : WARM_WOOD);
  bottleOf(g, '#3a2518', 0.84, top, 0.05, 0.11, 0.02);
  bit(g, cyl(0.018, 0.02, 0.05, 8), '#d8d2c0', 0.76, top + 0.025, 0.08);
  part(g, rbox(0.2, 0.06, 0.1, 0.012), '#e6ddcd', -0.76, top + 0.03, 0);
  bit(g, box(0.03, 0.02, 0.03), '#fbfaf5', -0.76, top + 0.066, 0);
  part(g, cyl(0.05, 0.04, 0.08, 10), '#6d97b3', -0.62, top + 0.04, 0.02);
  for (let i = 0; i < 5; i++) bit(g, dot(0.024), i % 2 ? '#7cb342' : '#558b2f', -0.62 + Math.cos(i * 1.25) * 0.024, top + 0.1 + (i % 2) * 0.03, 0.02 + Math.sin(i * 1.25) * 0.024);
  // At each of the four places: a mat, spoon and chopsticks, where the plate will come.
  for (const px of [-0.5, 0.5]) {
    for (const pz of [-1, 1]) {
      const z = pz * 0.4;
      bit(g, box(0.36, 0.002, 0.27), '#d5b98c', px, top + 0.001, z);
      bit(g, box(0.008, 0.004, 0.2), STEEL, px + 0.145, top + 0.004, z);
      bit(g, box(0.006, 0.004, 0.21), '#7a4a2a', px + 0.163, top + 0.004, z);
      bit(g, box(0.006, 0.004, 0.21), '#7a4a2a', px + 0.173, top + 0.004, z);
    }
  }
  out.work = marker(g, 0, top + 0.02, 0.3);
};

// -------------------------------------------------------------------------------------------------
// The grill: a kettle on three legs, a lid on a real hinge that the hands lift, coals that glow, sausages turned.

const grill: Builder = (g, _W, _D, c, _def, _ctx, out) => {
  const color = c || '#455a64';
  const h = GR.hinge[1];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const foot = v(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3);
    rod(g, v(Math.cos(a) * 0.17, h - 0.15, Math.sin(a) * 0.17), foot, 0.016, IRON);
    if (i) part(g, cyl(0.06, 0.06, 0.03, 12), '#20201f', foot.x, 0.06, foot.z, { rz: Math.PI / 2, ry: a });
  }
  // An ash catcher between the legs.
  part(g, cyl(0.13, 0.1, 0.05, 12), STEEL_D, 0, 0.28, 0);
  // The bowl.
  const bowlGeom = new THREE.SphereGeometry(0.27, 18, 9, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const bowl = part(g, bowlGeom, color, 0, h, 0, { outline: false });
  bowl.userData.ownGeometry = true;
  bowl.material = (bowl.material as THREE.Material).clone();
  bowl.userData.ownMaterial = true;
  (bowl.material as THREE.Material).side = THREE.DoubleSide;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 6, 24), (bowl.material as THREE.Material));
  rim.userData.ownGeometry = true;
  rim.position.y = h;
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  // Coals: dark lumps that glow from under.
  const coalMat = basic('#1c1a18');
  const coalGlow = basic('#3a140a');
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4;
    const r = 0.04 + (i % 5) * 0.038;
    const m = glow(g, dot(0.024), i % 3 === 0 ? coalMat : coalGlow, Math.cos(a) * r, h - 0.08 + (i % 2) * 0.012, Math.sin(a) * r);
    m.userData.ownMaterial = true;
  }
  // The grate.
  for (let x = -0.22; x <= 0.221; x += 0.044) bit(g, box(0.005, 0.005, Math.sqrt(Math.max(0, 0.25 * 0.25 - x * x)) * 2), '#3e3e42', x, GR.grate, 0);
  part(g, new THREE.TorusGeometry(0.25, 0.006, 4, 22), '#3e3e42', 0, GR.grate, 0, { rx: Math.PI / 2, outline: false }).userData.ownGeometry = true;
  // The lid on its hinge at the back, with a handle at the front rim; a vent on top.
  const lid = new THREE.Group();
  lid.position.set(GR.hinge[0], GR.hinge[1], GR.hinge[2]);
  const dome = part(lid, new THREE.SphereGeometry(0.27, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), color, 0, 0, 0.27, { outline: false });
  dome.userData.ownGeometry = true;
  dome.material = bowl.material;
  rod(lid, v(-0.05, GR.rim[1] - h, 0.54), v(0.05, GR.rim[1] - h, 0.54), 0.012, WARM_WOOD);
  for (const sx of [-1, 1]) rod(lid, v(sx * 0.045, 0.01, 0.52), v(sx * 0.045, GR.rim[1] - h, 0.54), 0.005, STEEL);
  bit(lid, cyl(0.035, 0.035, 0.012, 8), STEEL, 0, 0.27, 0.27);
  g.add(lid);
  // A side table, a tray and a bun, ketchup and mustard, a hook for the tongs.
  rod(g, v(0.26, h - 0.08, 0), v(0.34, h - 0.05, 0), 0.01, IRON);
  part(g, rbox(0.25, 0.018, 0.34, 0.006), WARM_WOOD, 0.385, GR.tray[1] - 0.012, 0.06);
  rod(g, v(0.385, GR.tray[1] - 0.02, 0.06), v(0.32, 0.1, 0.1), 0.01, IRON);
  part(g, rbox(0.17, 0.012, 0.11, 0.004), '#d7d7d2', GR.tray[0], GR.tray[1] + 0.006, GR.tray[2], { outline: false });
  bottleOf(g, '#d43a2d', 0.46, GR.tray[1] - 0.002, -0.08, 0.13, 0.018);
  bottleOf(g, '#e8c531', 0.42, GR.tray[1] - 0.002, -0.08, 0.13, 0.018);
  // Tongs: their +y runs from the hand to the tips.
  const tongs = new THREE.Group();
  tongs.name = 'tongs';
  bit(tongs, cyl(HANDLE_R, HANDLE_R, 0.1, 8), '#2c2c30', 0, -0.02, 0);
  for (const sx of [-1, 1]) {
    const m = bit(tongs, box(0.008, GR.tongTip - 0.03, 0.012), STEEL, sx * 0.008, (GR.tongTip - 0.03) / 2 + 0.015, 0);
    bit(m, box(0.022, 0.03, 0.016), STEEL_D, 0, (GR.tongTip - 0.03) / 2, 0);
  }
  g.add(tongs);
  const tongGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power' } };
  // In use: the sausages, the smoke, the coals bright.
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const dogs = Array.from({ length: 6 }, () => {
    const d = new THREE.Group();
    bit(d, cyl(0.018, 0.018, 0.13, 8), '#a44a22', 0, 0, 0, { rx: Math.PI / 2 });
    for (const z of [-0.03, 0.02]) bit(d, box(0.038, 0.004, 0.005), '#3e1a0b', 0, 0.017, z);
    live.add(d);
    return d;
  });
  const smoke = puffs(live, 5, SMOKE, 0.06);
  let shownLid = 0;
  let last = 0;
  const grilling = use(g, 'ktGrill', GR.x, GR.stand);
  const many = use(g, 'ktGrillMany', GR.x, GR.stand);
  out.spots = { grill: grilling, grillFamily: many };
  out.work = marker(g, 0, h + 0.05, 0.1);
  const uses: Array<[KtMotion, Spot]> = [['ktGrill', grilling], ['ktGrillMany', many]];
  const restTongs = () => {
    tongs.position.set(GR.tongs[0], GR.tongs[1], GR.tongs[2]);
    tongs.quaternion.setFromUnitVectors(UP, v(-0.3, -0.13, -0.95).normalize());
  };
  restTongs();
  const hot = new THREE.Color('#ff7a2a');
  const cold = new THREE.Color('#3a140a');
  out.away = (_o, t) => {
    const dt = Math.max(0, Math.min(0.2, t - last));
    last = t;
    if (!liveOf(uses, t)) {
      shownLid = THREE.MathUtils.damp(shownLid, 0, 3, dt);
      lid.rotation.x = -1.75 * shownLid;
      coalGlow.color.copy(cold);
      restTongs();
    }
  };
  out.animate = (t) => {
    grilling.held = many.held = null;
    const now = liveOf(uses, t);
    for (const m of smoke) m.visible = false;
    if (!now) {
      dogs.forEach((d) => (d.visible = false));
      return;
    }
    const n = ktNow(now.m, now.u, now.H, t);
    shownLid = n.v.lid ?? 0;
    lid.rotation.x = -1.75 * shownLid;
    const heat = n.v.coals ?? 0.5;
    coalGlow.color.copy(cold).lerp(hot, heat * (0.75 + 0.25 * Math.sin(t * 5)));
    const count = n.v.n ?? 2;
    const served = n.v.served ?? 0;
    const carry = n.v.carry ?? -1;
    const turned = n.v.turned ?? 0;
    dogs.forEach((d, i) => {
      d.visible = i < count;
      if (!d.visible) return;
      if (i === carry && n.head) {
        d.position.set(n.head[0], n.head[1] - 0.012, n.head[2]);
      } else if (i < served) {
        d.position.set(GR.tray[0] + ((i % 3) - 1) * 0.05, GR.tray[1] + 0.03 + Math.floor(i / 3) * 0.03, GR.tray[2]);
      } else {
        const p = grillDog(i, count);
        d.position.set(p[0], p[1], p[2]);
      }
      // Turned by a quarter each time the tongs came round.
      const turns = Math.floor(turned / count + (count - i) / count);
      d.rotation.z = turns * 1.57;
    });
    placeTool(tongs, n);
    if (n.hold === 'tongs') hold(now.s, g, n, tongs, 'right', tongGrips);
    rise(smoke, t, 0, GR.grate + 0.1, 0, 0.75, 0.6 + 0.4 * shownLid, 0.35);
  };
};

// -------------------------------------------------------------------------------------------------
// The high chair: wood on four splayed legs, a footrest, a soft seat, straps, a tray with a rim.

const highChair: Builder = (g, _W, _D, c, _def, _ctx, out) => {
  const wood = '#d8b07a';
  const tone = c || '#ffcc80';
  const seat = HC.seat;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) rod(g, v(sx * 0.17, seat - 0.05, sz * 0.14), v(sx * 0.29, 0.015, sz * 0.32), 0.022, wood);
    // A rail between the legs.
    rod(g, v(sx * 0.235, 0.32, -0.22), v(sx * 0.235, 0.32, 0.22), 0.012, shade(wood, 0.9));
  }
  rod(g, v(-0.18, seat * 0.5, 0.235), v(0.18, seat * 0.5, 0.235), 0.014, shade(wood, 0.9));
  // The footrest, on the front legs.
  part(g, rbox(0.3, 0.018, 0.1, 0.006), wood, 0, 0.36, 0.24);
  // The seat: wood with a cushion; its top is where the toddler sits.
  part(g, rbox(0.38, 0.03, 0.36, 0.015), wood, 0, seat - 0.05, 0);
  part(g, rbox(0.33, 0.035, 0.31, 0.015), tone, 0, seat - 0.018, 0.0);
  // The back, a rounded board, a rabbit's ears for the small person's sake.
  part(g, rbox(0.34, 0.36, 0.03, 0.05), wood, 0, seat + 0.2, -0.17);
  part(g, rbox(0.28, 0.28, 0.02, 0.04), tone, 0, seat + 0.17, -0.15);
  for (const sx of [-1, 1]) part(g, rbox(0.06, 0.14, 0.02, 0.028), wood, sx * 0.07, seat + 0.43, -0.17, { rz: -sx * 0.12 });
  // The arms and, hung off them, the tray.
  for (const sx of [-1, 1]) {
    part(g, rbox(0.03, 0.025, 0.42, 0.01), wood, sx * 0.2, seat + 0.13, 0.02);
    rod(g, v(sx * 0.2, seat - 0.03, -0.14), v(sx * 0.2, seat + 0.13, -0.14), 0.012, wood);
    rod(g, v(sx * 0.2, seat - 0.03, 0.18), v(sx * 0.2, seat + 0.13, 0.18), 0.012, wood);
  }
  // Straps coming down from the back.
  for (const sx of [-1, 1]) bit(g, box(0.03, 0.2, 0.006), '#7fa3c4', sx * 0.08, seat + 0.13, -0.138);
  // The tray: white, a raised rim; a spoon on it, a bib over the back, a rattle on a ribbon.
  const ty = HC.tray;
  part(g, rbox(0.5, 0.02, 0.28, 0.012), '#fbf8ef', 0, ty - 0.01, HC.bowl[2]);
  for (const sz of [-1, 1]) bit(g, box(0.48, 0.016, 0.012), '#e9e3d4', 0, ty + 0.005, HC.bowl[2] + sz * 0.13);
  for (const sx of [-1, 1]) bit(g, box(0.012, 0.016, 0.26), '#e9e3d4', sx * 0.24, ty + 0.005, HC.bowl[2]);
  bit(g, box(0.014, 0.006, 0.09), '#ef9a9a', 0.17, ty + 0.004, HC.bowl[2] + 0.03, { ry: 0.3 });
  bit(g, dot(0.016), '#ef9a9a', 0.15, ty + 0.008, HC.bowl[2] - 0.02);
  bit(g, rbox(0.16, 0.2, 0.012, 0.03), '#a7d7c5', 0, seat + 0.26, -0.195);
  // A rattle on a ribbon, off the arm.
  rod(g, v(-0.2, seat + 0.12, 0.2), v(-0.25, seat + 0.0, 0.25), 0.003, '#d97a7a');
  bit(g, dot(0.03), '#ffb74d', -0.25, seat - 0.03, 0.25);

  out.work = marker(g, 0, ty + 0.03, HC.bowl[2]);
  // In use: the bowl, with its small ear for carrying, set down on the tray.
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const dish = new THREE.Group();
  dish.name = 'toddler bowl';
  part(dish, cyl(0.07, 0.05, 0.05, 12), '#7ec4c9', 0, 0.025, 0, { outline: false });
  bit(dish, cyl(0.062, 0.062, 0.006, 12), '#f3c88c', 0, 0.046, 0);
  bit(dish, rbox(0.05, 0.012, 0.022, 0.005), '#7ec4c9', 0.085, 0.038, 0);
  bit(dish, dot(0.016), '#e8a06a', 0.01, 0.052, 0.01);
  live.add(dish);
  const dishGrips: Partial<Record<Side, Grip>> = { right: { at: v(0.09, 0.038, 0), axis: v(0, 0, -1), shape: 'pinch', radius: 0.01 } };
  const serve = use(g, 'ktServe', 0.08, HC.stand);
  out.spots = { serveHighChair: serve };
  dish.position.set(HC.bowl[0], HC.bowl[1], HC.bowl[2]);
  out.animate = (t) => {
    serve.held = null;
    const u = ktLive('ktServe', serve, t);
    dish.visible = u !== null;
    if (u === null) return;
    const n = ktNow('ktServe', u, (serve.at.userData.height as number | undefined) ?? 1.6, t);
    placeTool(dish, n);
    if (n.hold) hold(serve, g, n, dish, 'right', dishGrips);
  };
};

export const BUILDERS: Record<string, Builder> = {
  fridge: fridge(false),
  deluxeFridge: fridge(true),
  stove: range(false),
  deluxeStove: range(true),
  coffeeMaker,
  bar,
  kitchenSink,
  diningTable,
  grill,
  highChair,
};
