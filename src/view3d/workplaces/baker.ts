import * as THREE from 'three';
import { CAKE, CROISSANT_TRAY, PEEL, ROSETTES, TILL_REACH, kneadRound, peelRound, pipeRound, rollRound, scoreRound, scoreSlash, tillRound, toolPhase, type BarOffset } from '../activity';
import { WHITE, marker, rod, screenMesh, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, gradient, part, rbox } from '../toon';
import { bakeryClose } from './handWorkProps';
import { glassWall, neighbourShop, shopFront } from './shopFront';

/**
 * The bakery drawn as itself (2026-10-27 workplace pipeline, at the user's request: baking should
 * look like baking): a two-deck oven with its stone decks and the control column (상화·하화), the
 * top deck opened and glowing while loaves are slid in on a peel; the bench of maple, floured,
 * where dough is kneaded under the heel of the hand, croissants are rolled up and set on the tray,
 * loaves are scored with a lame on the couche, flour weighed out and a new menu talked over; the
 * cake table with its turntable, a cake iced round with the palette knife and piped with rosettes
 * one by one — and what the bakery was missing: the planetary mixer, the proofer, the rack trolley
 * of cooling trays, the bread slicer, the 평대 of loaves with trays and tongs, and the packing
 * counter with the till (계산대). The dough, the peel, the knife and the bag move in step with the
 * hands on them (activity.ts kneadRound, rollRound, scoreRound, peelRound, pipeRound).
 */

const STEEL = '#c3cad0';
const STEEL_L = '#d6dce0';
const STEEL_D = '#9aa3ab';
const CHROME = '#e3e7ea';
const BLACK = '#2b2b30';
const MAPLE = '#e2c38f';
const OAK = '#b98d5c';
const WALNUT = '#6d4c41';
const KRAFT = '#c8a27a';
const FLOUR = '#f7f3ea';
const DOUGH = '#f0dcb6';
const CRUST = '#c98a3e';
const CRUST_D = '#a86b2d';
const CREAM = '#fff6ee';
const LINEN = '#efe6d2';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

/** Lit parts (a display, a lamp): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

/** Shapes made once (never disposed). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
/** A half ball, flat on the bottom (a bun, a loaf's crust): scaled to the bread. */
const DOME = shape('dome', () => new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2));
const UNIT = shape('unit', () => new THREE.CylinderGeometry(1, 1, 1, 10));
const CUBE = shape('cube', () => new THREE.BoxGeometry(1, 1, 1));
const GLASS = new THREE.MeshToonMaterial({ color: '#d8eef5', gradientMap: gradient, transparent: true, opacity: 0.25, depthWrite: false });
const SMOKED = new THREE.MeshToonMaterial({ color: '#4a3a30', gradientMap: gradient, transparent: true, opacity: 0.4, depthWrite: false });
const BAG = new THREE.MeshToonMaterial({ color: '#f4f8fb', gradientMap: gradient, transparent: true, opacity: 0.55, depthWrite: false });

function see(g: THREE.Object3D, geom: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}

/** Words and pictures painted once a key. */
const texts = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, draw: (c: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = texts.get(key);
  if (!t) texts.set(key, (t = canvasTexture(cw, ch, draw)));
  return t;
}
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  g.add(m);
  return m;
}
/** A line of words on a plate. */
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`l|${text}|${bg}|${fg}|${cw}`, cw, ch, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = fg;
    c.font = `bold ${Math.round(ch * 0.6)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch * 0.54, cw * 0.92);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A price card on a wire pick, hand-lettered: the name over the price. */
function priceCard(g: THREE.Object3D, name: string, price: string, x: number, y: number, z: number, ry = 0) {
  part(g, cyl(0.002, 0.002, 0.07, 4), BLACK, x, y + 0.035, z, { outline: false });
  const tex = painted(`card|${name}|${price}`, 128, 80, (c) => {
    c.fillStyle = '#fffdf6';
    c.fillRect(0, 0, 128, 80);
    c.strokeStyle = '#8d6e63';
    c.lineWidth = 4;
    c.strokeRect(3, 3, 122, 74);
    c.fillStyle = '#4e342e';
    c.textAlign = 'center';
    c.font = `bold 28px ${FONT}`;
    c.fillText(name, 64, 34, 116);
    c.fillStyle = '#c62828';
    c.font = `bold 24px ${FONT}`;
    c.fillText(price, 64, 66, 116);
  });
  const m = sheet(g, tex, 0.09, 0.056, x, y + 0.095, z, ry, -0.2);
  (m.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
}

/** Steam rising off something hot while it's used: puffs going up, growing and fading. */
function steam(g: THREE.Object3D, x: number, y: number, z: number, n = 4, spread = 0.05, rise = 0.45): (t: number) => void {
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(ball(0.05), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false }));
    m.userData.ownMaterial = true;
    g.add(m);
    puffs.push(m);
  }
  return (t) =>
    puffs.forEach((m, i) => {
      const k = (t * 0.45 + i / n) % 1;
      m.position.set(x + Math.sin(i * 2.3 + t * 0.7) * spread * (0.4 + k), y + k * rise, z + Math.cos(i * 1.7) * spread * 0.6);
      m.scale.setScalar(0.5 + 1.3 * k);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.3 * Math.sin(Math.PI * k);
    });
}

/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it), and the latest of several. */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
function busy(spots: Spot[], t: number): Spot | null {
  let now: Spot | null = null;
  for (const s of spots) if (posed(s, t) && (!now || (s.at.userData.posedAt as number) > (now.at.userData.posedAt as number))) now = s;
  return now;
}
const tmp = new THREE.Vector3();
const phaseAt = (s: Spot) => toolPhase(s.at.getWorldPosition(tmp));
/** A point at an offset (activity.ts BarOffset) from `ref`, for a baker facing -z. */
const offAt = (ref: THREE.Vector3, o: BarOffset, v = new THREE.Vector3()) => v.set(ref.x - o.side, ref.y + o.up, ref.z - o.ahead);
const Y = new THREE.Vector3(0, 1, 0);
/** A stand spot facing the piece (-z), its hands at `work`, doing `motion`. */
function at(g: THREE.Object3D, x: number, z: number, work: THREE.Object3D, motion: Spot['motion']): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.work = work;
  s.motion = motion;
  return s;
}

type Bread = 'croissant' | 'rawCroissant' | 'salt' | 'bun' | 'soboro' | 'batard' | 'rawLoaf' | 'baguette' | 'pullman' | 'twist' | 'roll' | 'doughBall' | 'madeleine';
/** A bread, from the middle of its bottom, its length along z. */
function bread(g: THREE.Object3D, kind: Bread, x: number, y: number, z: number, ry = 0, s = 1, line = false): THREE.Group {
  const b = new THREE.Group();
  b.position.set(x, y, z);
  b.rotation.y = ry;
  b.scale.setScalar(s);
  g.add(b);
  const o = { outline: line };
  const dome = (c: string, rx: number, h: number, rz: number, px = 0, py = 0, pz = 0, ol = line) => part(b, DOME, c, px, py, pz, { outline: ol }).scale.set(rx, h, rz);
  switch (kind) {
    case 'croissant':
    case 'rawCroissant': {
      const col = kind === 'croissant' ? CRUST : DOUGH;
      part(b, ring(0.05, 0.024, Math.PI * 1.25), col, 0, 0.02, 0, { rx: Math.PI / 2, rz: Math.PI * 0.12, ...o }).scale.set(1, 1, 0.8);
      part(b, ball(0.03), shade(col, 1.05), 0, 0.022, -0.045, { outline: false }).scale.set(1.4, 0.8, 0.9);
      break;
    }
    case 'salt':
      // 소금빵: a rolled log, the butter browned shiny underneath, salt flakes on top.
      dome('#d9a35a', 0.04, 0.034, 0.068);
      part(b, ring(0.032, 0.004, Math.PI), shade('#d9a35a', 0.85), 0, 0.006, 0, { ry: Math.PI / 2, outline: false });
      for (let i = 0; i < 2; i++) part(b, box(0.01, 0.004, 0.007), '#ffffff', -0.008 + i * 0.016, 0.034, -0.015 + i * 0.03, { ry: i, outline: false });
      break;
    case 'bun':
      // 단팥빵: glossy, a pinch of black sesame on the top.
      dome('#a8642a', 0.05, 0.036, 0.05);
      part(b, ball(0.008), '#2a1c14', 0, 0.036, 0, { outline: false }).scale.set(1, 0.4, 1);
      break;
    case 'soboro':
      dome('#d8a050', 0.05, 0.034, 0.05);
      for (let i = 0; i < 4; i++) part(b, ball(0.014), '#ecc277', 0.022 * Math.cos(i * 1.6), 0.026, 0.022 * Math.sin(i * 1.6), { outline: false });
      break;
    case 'batard':
    case 'rawLoaf': {
      const raw = kind === 'rawLoaf';
      part(b, rbox(0.08, 0.07, 0.3, 0.034), raw ? DOUGH : CRUST_D, 0, 0.035, 0, o);
      if (!raw) for (let i = 0; i < 3; i++) part(b, box(0.01, 0.004, 0.06), '#e8cf9a', 0, 0.07, 0.075 - i * 0.065, { ry: 0.5, outline: false });
      else part(b, box(0.06, 0.002, 0.24), FLOUR, 0, 0.07, 0, { outline: false });
      break;
    }
    case 'baguette':
      part(b, rbox(0.06, 0.05, 0.5, 0.025), '#c88a40', 0, 0.025, 0, o);
      for (let i = 0; i < 5; i++) part(b, box(0.008, 0.004, 0.07), '#ecd09a', 0, 0.05, 0.18 - i * 0.09, { ry: 0.45, outline: false });
      break;
    case 'pullman':
      // 우유식빵: square sides, three domes on top.
      part(b, rbox(0.12, 0.1, 0.22, 0.02), '#c98a3e', 0, 0.05, 0, o);
      for (let i = 0; i < 3; i++) dome('#b8732e', 0.058, 0.035, 0.04, 0, 0.095, -0.07 + i * 0.07, false);
      break;
    case 'twist':
      // 꽈배기, rolled in sugar.
      for (const s of [-1, 1]) part(b, cyl(0.016, 0.016, 0.16, 10), '#d9a05a', 0, 0.02, 0, { rx: Math.PI / 2, ry: s * 0.22, outline: line });
      for (let i = 0; i < 5; i++) part(b, box(0.006, 0.004, 0.006), '#ffffff', ((i % 2) - 0.5) * 0.02, 0.037, -0.06 + i * 0.03, { outline: false });
      break;
    case 'roll':
      dome('#c8803a', 0.036, 0.032, 0.036);
      break;
    case 'doughBall':
      dome(DOUGH, 0.045, 0.035, 0.045);
      break;
    case 'madeleine':
      dome('#e0a85a', 0.03, 0.016, 0.042);
      break;
  }
  return b;
}

/** A sheet pan: aluminium with a rolled rim, from the middle of its bottom. */
function sheetPan(g: THREE.Object3D, w: number, d: number, x: number, y: number, z: number, paper = true, line = true) {
  part(g, box(w, 0.012, d), '#b8bec4', x, y + 0.006, z, { outline: line });
  for (const s of [-1, 1]) {
    part(g, box(w, 0.016, 0.01), '#a9b0b6', x, y + 0.01, z + s * (d / 2 - 0.005), { outline: false });
    part(g, box(0.01, 0.016, d), '#a9b0b6', x + s * (w / 2 - 0.005), y + 0.01, z, { outline: false });
  }
  if (paper) part(g, box(w - 0.03, 0.002, d - 0.03), '#fbf3e3', x, y + 0.013, z, { outline: false });
}

/** A peel in its own frame: the blade's middle at the origin, flat, the handle out along +z. */
function peel(g: THREE.Object3D): THREE.Group {
  const p = new THREE.Group();
  g.add(p);
  const b = PEEL.blade;
  part(p, box(b, 0.008, b), '#d8b98c', 0, 0, 0);
  part(p, box(b - 0.02, 0.009, 0.03), '#e8d2a8', 0, 0, -b / 2 + 0.02, { outline: false });
  part(p, rbox(0.07, 0.02, 0.06, 0.008), STEEL_D, 0, 0.008, b / 2 + 0.01);
  part(p, cyl(0.014, 0.014, PEEL.handle, 10), '#b08a5a', 0, 0.012, b / 2 + PEEL.handle / 2, { rx: Math.PI / 2 });
  part(p, cyl(0.017, 0.017, 0.03, 10), '#7a5a3a', 0, 0.012, b / 2 + PEEL.handle - 0.01, { rx: Math.PI / 2, outline: false });
  return p;
}

/** A deck oven's door, from the middle of its bottom edge: a steel frame round a smoked window, the bar along its top. */
function ovenDoor(g: THREE.Object3D, w: number, h: number): void {
  const t = 0.035;
  part(g, box(w, 0.07, t), STEEL_L, 0, h - 0.035, 0);
  part(g, box(w, 0.06, t), STEEL_L, 0, 0.03, 0);
  for (const s of [-1, 1]) part(g, box(0.07, h - 0.13, t), STEEL_L, s * (w / 2 - 0.035), h / 2 - 0.005, 0);
  see(g, box(w - 0.14, h - 0.13, 0.006), SMOKED, 0, h / 2 - 0.005, 0.004);
  part(g, box(w - 0.12, 0.008, 0.004), STEEL_D, 0, h - 0.072, t / 2 + 0.002, { outline: false });
  for (const s of [-1, 1]) part(g, box(0.02, 0.02, 0.05), BLACK, s * (w / 2 - 0.08), h - 0.03, t / 2 + 0.025, { outline: false });
  rod(g, new THREE.Vector3(-(w / 2 - 0.06), h - 0.03, t / 2 + 0.05), new THREE.Vector3(w / 2 - 0.06, h - 0.03, t / 2 + 0.05), 0.012, BLACK);
}

/** A rosette of piped cream, from the middle of its foot. */
function rosette(g: THREE.Object3D, color: string): THREE.Group {
  const r = new THREE.Group();
  g.add(r);
  part(r, ring(0.011, 0.006), color, 0, 0.005, 0, { rx: Math.PI / 2, outline: false });
  part(r, cyl(0.002, 0.012, 0.022, 8), color, 0, 0.014, 0, { outline: false });
  for (let i = 0; i < 4; i++) part(r, box(0.003, 0.018, 0.003), shade(color, 0.92), 0.008 * Math.cos(i * 1.57), 0.012, 0.008 * Math.sin(i * 1.57), { rz: 0.3 * Math.cos(i * 1.57), rx: -0.3 * Math.sin(i * 1.57), outline: false });
  return r;
}

/** A wicker basket lined with a cloth, from the middle of its bottom. */
function basket(g: THREE.Object3D, w: number, d: number, h: number, x: number, y: number, z: number, cloth = '#e8d9c0') {
  part(g, rbox(w, h, d, 0.02), '#b07d48', x, y + h / 2, z);
  for (let i = 1; i < 4; i++) part(g, box(w + 0.004, 0.006, d + 0.004), '#8e5f33', x, y + (h * i) / 4, z, { outline: false });
  part(g, box(w - 0.03, 0.006, d - 0.03), cloth, x, y + h - 0.008, z, { outline: false });
  for (const s of [-1, 1]) part(g, box(0.05, 0.004, d * 0.6), cloth, x + s * (w / 2 + 0.01), y + h - 0.02, z, { rz: s * 1.2, outline: false });
}

/** 밀가루·재료 선반 (bkFlourStore, 2 × 1): the dry store's steel shelving: 20 kg sacks of flour on the bottom, sugar and butter boxes above, the egg trays. */
function flourStore(g: THREE.Group, W: number, D: number) {
  const zb = -D / 2 + 0.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.035, 1.8, 0.035), STEEL_D, sx * (W / 2 - 0.08), 0.9, zb + sz * 0.2, { outline: false });
  [0.12, 0.62, 1.12, 1.62].forEach((y) => part(g, box(W - 0.12, 0.03, 0.46), STEEL, 0, y, zb));
  // Flour sacks on the bottom shelf, sugar and butter boxes, eggs.
  for (let i = 0; i < 4; i++) part(g, rbox(0.38, 0.4, 0.34, 0.08), FLOUR, -W / 2 + 0.32 + i * 0.44, 0.34, zb);
  for (let i = 0; i < 5; i++) part(g, box(0.3, 0.26, 0.32), i % 2 ? KRAFT : '#fff59d', -W / 2 + 0.28 + i * 0.36, 0.77, zb);
  for (let i = 0; i < 3; i++) part(g, box(0.5, 0.06, 0.32), '#d7ccc8', -W / 2 + 0.4 + i * 0.58, 1.17 + 0.0, zb);
  for (let i = 0; i < 6; i++) part(g, cyl(0.07, 0.07, 0.24, 10), i % 2 ? '#fafafa' : '#ffe0b2', -W / 2 + 0.3 + i * 0.28, 1.76, zb);
}

export const BUILDERS: Record<string, Builder> = {
  // The street front, the bakehouse glass, the dry store, the next unit (2026-11-05, the layout audit; shopFront.ts).
  bkShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 19, door: 12, name: '방미소 베이커리', sub: '매일 아침 직접 굽는 빵', bg: '#6d4c41', fg: '#fff3e0', awning: '#a1887f', stripes: true, frame: '#4e342e', posters: [['갓 구운 빵', '#fff3e0', '#6d4c41', 4.5], ['케이크 예약', '#fce4ec', '#ad1457', 9.5], ['소금빵 3,200', '#fffde7', '#5d4037', 15.5]], solid: [[17, 18]] });
  },
  bkGlassWall(g, W, D) {
    glassWall(g, W, D, '#8d6e63');
  },
  bkFlourStore(g, W, D) {
    flourStore(g, W, D);
  },
  bkNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '연필나라 문구', color: '#1565c0', wall: '#e0d6c8' });
  },
  /**
   * A two-deck oven: stainless, on a stand with a shelf of sheet pans and a tub of dusting flour;
   * each deck a stone floor behind a smoked-glass door with its bar, the control column at the right
   * (상화·하화 in red figures, the steam button, the timer), a hood and its flue on top, a spare peel
   * hung on its side. The bottom deck's always baking — loaves in the glow behind the glass. Used, the
   * top deck's door is let down, its elements glow, steam comes off the flue and the baker slides
   * loaves in on the peel, jerks it back to leave them on the stone and draws it out.
   */
  bakeryOven(g, W, _D, _c, _def, _ctx, out) {
    const zf = 0.36;
    const zb = -0.46;
    const zc = (zf + zb) / 2;
    const d = zf - zb;
    const dx = -0.1;
    const dw = 0.64;
    const STAND = 0.42;
    // The stand: square legs, a shelf of sheet pans and the tub of dusting flour.
    for (const sx of [-1, 1]) for (const z of [zf - 0.05, zb + 0.05]) part(g, box(0.05, STAND, 0.05), STEEL_D, sx * (W / 2 - 0.06), STAND / 2, z, { outline: false });
    part(g, box(W - 0.1, 0.02, d - 0.08), STEEL, 0, 0.12, zc);
    for (let i = 0; i < 5; i++) part(g, box(0.6, 0.012, 0.44), i % 2 ? '#9aa0a6' : '#b0b6bb', -0.13, 0.137 + i * 0.015, zc, { outline: i === 4 });
    part(g, cyl(0.12, 0.11, 0.2, 18), '#eceff1', 0.3, 0.23, zc + 0.05);
    part(g, cyl(0.1, 0.1, 0.004, 18), FLOUR, 0.3, 0.33, zc + 0.05, { outline: false });
    label(g, '덧가루', 0.1, 0.035, 0.3, 0.24, zc + 0.05 + 0.116, '#ffffff', '#5d4037');
    // The body: back, sides, the control column, the slab under, between and over the decks.
    const top = 1.3;
    part(g, box(W - 0.04, top - STAND, 0.04), STEEL_D, 0, (top + STAND) / 2, zb + 0.02);
    part(g, box(0.04, top - STAND, d), STEEL, -(W / 2 - 0.04), (top + STAND) / 2, zc);
    const cx = 0.35;
    part(g, box(0.25, top - STAND, d), STEEL, cx, (top + STAND) / 2, zc);
    const decks = [STAND, 0.86];
    for (const yb of decks) {
      part(g, box(0.72, 0.08, d), STEEL, dx - 0.01, yb + 0.04, zc);
      part(g, box(0.72, 0.06, d), STEEL, dx - 0.01, yb + 0.39, zc);
      part(g, box(0.06, 0.28, 0.04), STEEL, -(W / 2 - 0.05), yb + 0.22, zf - 0.02, { outline: false });
      // Inside: the stone floor, dark walls.
      part(g, box(dw, 0.004, d - 0.1), '#8a7663', dx, yb + 0.082, zc + 0.03, { outline: false });
      part(g, box(dw, 0.28, 0.01), '#2e2722', dx, yb + 0.22, zb + 0.05, { outline: false });
    }
    // The bottom deck baking: its back lit, three loaves on the stone, its door shut.
    part(g, box(dw - 0.04, 0.24, 0.006), '#e09a52', dx, STAND + 0.22, zb + 0.058, { outline: false, material: glow('#e09a52') });
    part(g, box(dw - 0.04, 0.01, d - 0.14), '#e9a861', dx, STAND + 0.35, zc, { outline: false, material: glow('#f4b36a') });
    for (let i = 0; i < 3; i++) bread(g, 'batard', dx - 0.21 + i * 0.21, STAND + 0.084, -0.05);
    const lower = new THREE.Group();
    lower.position.set(dx, STAND + 0.06, zf + 0.018);
    g.add(lower);
    ovenDoor(lower, dw + 0.02, 0.3);
    // The top deck: loaves baking at the back, the elements that glow while it's used.
    const yb = decks[1];
    const floor = yb + 0.084;
    for (let i = 0; i < 3; i++) bread(g, 'batard', dx - 0.21 + i * 0.21, floor, -0.25);
    const el = new THREE.Mesh(box(dw - 0.06, 0.012, d - 0.16), new THREE.MeshBasicMaterial({ color: '#3a2a20' }));
    el.userData.ownMaterial = true;
    el.position.set(dx, yb + 0.35, zc);
    g.add(el);
    out.glow = el;
    // Its door: shut, or let down flat while it's loaded.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const shut = new THREE.Group();
    shut.position.set(dx, yb + 0.06, zf + 0.018);
    idle.add(shut);
    ovenDoor(shut, dw + 0.02, 0.3);
    // The spare peel hung on the oven's left side.
    const hung = peel(idle);
    hung.position.set(-W / 2 - 0.005, 1.28, zc);
    hung.rotation.set(Math.PI / 2, Math.PI / 2, 0, 'YXZ');
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const flap = new THREE.Group();
    flap.position.set(dx, yb + 0.06, zf + 0.018);
    flap.rotation.x = Math.PI / 2;
    use.add(flap);
    ovenDoor(flap, dw + 0.02, 0.3);
    part(use, box(dw - 0.04, 0.24, 0.006), '#ffb060', dx, yb + 0.22, zb + 0.058, { outline: false, material: glow('#ffb060') });
    part(use, box(dw - 0.02, 0.003, d - 0.14), '#d4936a', dx, floor + 0.0, zc + 0.03, { outline: false, material: glow('#c98a5a') });
    const held = peel(use);
    const onPeel = new THREE.Group();
    held.add(onPeel);
    for (const s of [-1, 1]) bread(onPeel, 'rawLoaf', s * 0.068, 0.004, 0, 0, 0.75);
    const onDeck = new THREE.Group();
    use.add(onDeck);
    for (const s of [-1, 1]) bread(onDeck, 'rawLoaf', dx - PEEL.side + s * 0.068, floor, zf - 0.27, 0, 0.75);
    // The control column: the deck's top and bottom heat, the steam, the timer; the power switch.
    part(g, box(0.21, 0.84, 0.01), '#1d1f24', cx, 0.86, zf + 0.006);
    decks.forEach((y, i) => {
      const zy = y + 0.3;
      label(g, '상화', 0.06, 0.025, cx - 0.05, zy + 0.03, zf + 0.012, '#1d1f24', '#e0e0e0');
      label(g, '하화', 0.06, 0.025, cx + 0.05, zy + 0.03, zf + 0.012, '#1d1f24', '#e0e0e0');
      label(g, i ? '220' : '200', 0.07, 0.035, cx - 0.05, zy - 0.005, zf + 0.012, '#120808', '#ff3b30');
      label(g, i ? '200' : '190', 0.07, 0.035, cx + 0.05, zy - 0.005, zf + 0.012, '#120808', '#ff3b30');
      for (const s of [-1, 1]) part(g, cyl(0.018, 0.02, 0.025, 14), '#3a3d44', cx + s * 0.05, zy - 0.07, zf + 0.022, { rx: Math.PI / 2 });
      part(g, cyl(0.014, 0.014, 0.02, 12), '#1e88e5', cx - 0.05, zy - 0.14, zf + 0.018, { rx: Math.PI / 2, outline: false, material: glow('#42a5f5') });
      label(g, '스팀', 0.05, 0.02, cx - 0.05, zy - 0.175, zf + 0.012, '#1d1f24', '#90caf9');
      label(g, i ? '18:00' : '25:00', 0.075, 0.032, cx + 0.05, zy - 0.14, zf + 0.012, '#08120a', '#69f0ae');
    });
    part(g, box(0.04, 0.025, 0.012), '#e53935', cx, STAND + 0.06, zf + 0.012, { outline: false });
    // The hood, its plate and the flue.
    part(g, rbox(W - 0.02, 0.12, d + 0.04, 0.02), STEEL_L, 0, top + 0.06, zc + 0.02);
    label(g, '데크 오븐 · 2단', 0.36, 0.06, -0.1, top + 0.06, zf + 0.042, '#37474f', '#ffffff');
    part(g, cyl(0.06, 0.06, 0.45, 14), STEEL_D, 0.3, top + 0.34, zb + 0.14);
    part(g, cyl(0.09, 0.07, 0.04, 14), STEEL, 0.3, top + 0.58, zb + 0.14);
    const flue = steam(use, 0.3, top + 0.62, zb + 0.14, 4, 0.04, 0.4);
    const mouthSteam = steam(use, dx, yb + 0.4, zf + 0.04, 3, 0.12, 0.3);
    // The baker at the deck's mouth, the peel at their right.
    const mouth = marker(g, dx, floor, zf);
    out.work = mouth;
    // Stood back far enough for the hands on the long handle to be in front of them, turned a little to
    // it (at their right) so the left hand gets there too; a step in as the peel goes in.
    const bake = at(g, dx + 0.02, zf + 0.7, mouth, 'peel');
    bake.at.rotation.y = Math.PI - 0.4;
    out.spots = { '*': bake };
    // Both hands on the peel's handle (handTool.ts): the back one drives it, the front one finds it.
    held.name = 'peel';
    const along = new THREE.Vector3(0, 0, -1);
    bake.held = {
      tool: held,
      lead: 'right',
      grips: {
        left: { at: new THREE.Vector3(0, 0.012, 0.25), axis: along, shape: 'power', slide: true },
        right: { at: new THREE.Vector3(0, 0.012, 0.49), axis: along, shape: 'power' },
      },
    };
    const m = new THREE.Vector3();
    out.animate = (t) => {
      const k = peelRound(t, phaseAt(bake));
      m.copy(mouth.position);
      bake.at.position.z = zf + 0.7 - 0.2 * k.push;
      held.position.set(m.x - PEEL.side, m.y + PEEL.up + k.lift, m.z - k.centre);
      onPeel.visible = k.onPeel;
      onDeck.visible = k.onDeck;
      flue(t);
      mouthSteam(t * 0.8);
    };
  },

  /**
   * The baker's bench: a thick maple top dusted with flour on a stainless frame, flour sacks and
   * tubs on the shelf under it, the rail at the back with rolling pins, a dredger, the recipe binder
   * and a timer. Left, the dough kneaded under the heel of the hand — pushed out, folded back,
   * turned a quarter — with the bench scraper beside it, and the scale with its bowl and the tub of
   * strong flour for weighing out; in the middle a sheet of croissant dough cut in triangles, one
   * rolled up from its base and set on the tray of shaped croissants; right, loaves proving on a
   * pleated couche, scored three times each with a lame; at the back a board of the new menu.
   */
  doughTable(g, W, _D, _c, _def, _ctx, out) {
    const zf = 0.33;
    const zb = -0.45;
    const zc = (zf + zb) / 2;
    const d = zf - zb;
    const ty = 0.88;
    // The frame and the shelf of sacks, tubs and bowls.
    for (const sx of [-1, 0, 1]) for (const z of [zf - 0.05, zb + 0.05]) part(g, box(0.045, ty - 0.06, 0.045), STEEL_D, sx * (W / 2 - 0.08), (ty - 0.06) / 2, z, { outline: false });
    part(g, box(W - 0.12, 0.025, d - 0.06), STEEL, 0, 0.16, zc);
    part(g, box(W - 0.12, 0.04, 0.03), STEEL, 0, ty - 0.08, zf - 0.03, { outline: false });
    for (let i = 0; i < 2; i++) {
      part(g, rbox(0.42, 0.2, 0.3, 0.06), '#efe4cf', -0.68 + i * 0.46, 0.272, zc + 0.02, { rz: i ? 0.05 : -0.04 });
      label(g, i ? '중력분 20kg' : '강력분 20kg', 0.26, 0.07, -0.68 + i * 0.46, 0.28, zc + 0.172, '#efe4cf', i ? '#1565c0' : '#c62828');
    }
    part(g, rbox(0.26, 0.24, 0.3, 0.03), '#eceff1', 0.38, 0.29, zc);
    part(g, rbox(0.27, 0.03, 0.31, 0.012), '#90a4ae', 0.38, 0.42, zc);
    label(g, '설탕', 0.1, 0.04, 0.38, 0.3, zc + 0.152, '#ffffff', '#455a64');
    for (let i = 0; i < 3; i++) part(g, cyl(0.15, 0.1, 0.09, 20), STEEL_L, 0.76, 0.22 + i * 0.03, zc, { outline: i === 2 });
    // The top: thick maple, flour dusted on it where the work's done.
    part(g, rbox(W - 0.04, 0.06, d, 0.012), MAPLE, 0, ty - 0.03, zc);
    for (let i = 0; i < 8; i++) part(g, box(W - 0.06, 0.001, 0.002), shade(MAPLE, 0.9), 0, ty + 0.0005, zb + 0.05 + i * 0.1, { outline: false });
    for (const [x, z, w, dd] of [[-0.35, 0.05, 0.36, 0.4], [0.05, 0.06, 0.42, 0.38], [-0.8, -0.05, 0.26, 0.26]] as const) part(g, box(w, 0.002, dd), FLOUR, x, ty + 0.001, z, { outline: false });
    // The rail at the back: rolling pins, a dredger, the binder, a timer.
    part(g, box(W - 0.06, 0.16, 0.02), STEEL, 0, ty + 0.08, zb + 0.01);
    part(g, box(W - 0.06, 0.02, 0.1), STEEL, 0, ty + 0.17, zb + 0.06);
    for (let i = 0; i < 2; i++) part(g, cyl(0.025, 0.025, 0.42, 12), '#d9b98a', -0.6 + i * 0.05, ty + 0.205 + i * 0.002, zb + 0.06, { rz: Math.PI / 2 });
    part(g, cyl(0.03, 0.03, 0.11, 14), STEEL_L, -0.2, ty + 0.235, zb + 0.06);
    part(g, cyl(0.032, 0.03, 0.012, 14), STEEL_D, -0.2, ty + 0.296, zb + 0.06, { outline: false });
    part(g, rbox(0.06, 0.24, 0.2, 0.01), '#c62828', 0.0, ty + 0.3, zb + 0.06, { rz: 0.08 });
    label(g, '레시피', 0.12, 0.04, 0.034, ty + 0.32, zb + 0.06, '#c62828', '#ffffff', Math.PI / 2);
    part(g, rbox(0.08, 0.08, 0.04, 0.015), '#fafafa', 0.25, ty + 0.22, zb + 0.06);
    label(g, '05:00', 0.06, 0.025, 0.25, ty + 0.225, zb + 0.081, '#102018', '#69f0ae');
    for (let i = 0; i < 4; i++) part(g, cyl(0.022, 0.022, 0.08, 10), ['#8d6e63', '#f5f5f5', '#ffcc80', '#6d4c41'][i], 0.48 + i * 0.07, ty + 0.22, zb + 0.06);
    // Left: the dough for kneading, the bench scraper, the scale with its bowl and the tub of strong flour.
    const kx = -0.35;
    const kz = 0.07;
    // The day's dough and loaves, put away for closing.
    const dressing = new THREE.Group();
    g.add(dressing);
    const dough = new THREE.Group();
    dough.position.set(kx, ty, kz);
    dressing.add(dough);
    const turn = new THREE.Group();
    dough.add(turn);
    part(turn, DOME, DOUGH, 0, 0, 0).scale.set(0.085, 0.042, 0.085);
    part(turn, box(0.1, 0.004, 0.005), shade(DOUGH, 0.86), 0, 0.04, 0.01, { ry: 0.4, outline: false });
    const flapM = part(dough, DOME, shade(DOUGH, 1.02), 0, 0, -0.08);
    flapM.scale.set(0.06, 0.022, 0.045);
    flapM.visible = false;
    part(g, box(0.12, 0.004, 0.09), STEEL_L, -0.17, ty + 0.002, 0.14, { ry: -0.3 });
    part(g, rbox(0.12, 0.02, 0.025, 0.008), '#5d4037', -0.17 - 0.012, ty + 0.012, 0.14 - 0.04, { ry: -0.3 });
    const scaleX = -0.8;
    const scaleZ = -0.05;
    part(g, rbox(0.2, 0.035, 0.2, 0.012), '#fafafa', scaleX, ty + 0.0175, scaleZ);
    part(g, box(0.17, 0.006, 0.17), STEEL_L, scaleX, ty + 0.038, scaleZ, { outline: false });
    label(g, '500g', 0.07, 0.022, scaleX, ty + 0.018, scaleZ + 0.102, '#102018', '#69f0ae');
    part(g, cyl(0.1, 0.06, 0.08, 20), STEEL, scaleX, ty + 0.081, scaleZ);
    part(g, cyl(0.085, 0.085, 0.004, 20), FLOUR, scaleX, ty + 0.1, scaleZ, { outline: false });
    const bowl = marker(g, scaleX, ty + 0.12, scaleZ);
    const binX = scaleX + 0.27;
    const binZ = scaleZ - 0.07;
    part(g, rbox(0.17, 0.16, 0.2, 0.02), '#e3f2fd', binX, ty + 0.08, binZ);
    part(g, box(0.15, 0.004, 0.18), FLOUR, binX, ty + 0.15, binZ, { outline: false });
    rod(g, new THREE.Vector3(binX + 0.03, ty + 0.15, binZ), new THREE.Vector3(binX + 0.07, ty + 0.21, binZ - 0.05), 0.008, STEEL_D);
    label(g, '강력분', 0.1, 0.035, binX, ty + 0.08, binZ + 0.102, '#e3f2fd', '#1565c0');
    // Middle: the sheet of croissant dough, the triangle being rolled, the tray of shaped croissants.
    const rx = 0.05;
    const rz = 0.08;
    part(dressing, box(0.36, 0.006, 0.16), DOUGH, rx - 0.02, ty + 0.003, -0.2, { outline: false });
    for (let i = 0; i < 4; i++) part(dressing, box(0.002, 0.007, 0.18), shade(DOUGH, 0.85), rx - 0.17 + i * 0.1, ty + 0.0035, -0.2, { ry: i % 2 ? 0.45 : -0.45, outline: false });
    // The pastry wheel the triangles were cut with, lying on the sheet.
    part(g, cyl(0.03, 0.03, 0.006, 16), STEEL_L, rx + 0.1, ty + 0.036, -0.22, { rz: Math.PI / 2 });
    rod(g, new THREE.Vector3(rx + 0.1, ty + 0.036, -0.22), new THREE.Vector3(rx + 0.11, ty + 0.03, -0.1), 0.008, BLACK);
    const tipZ = rz + 0.06;
    const tri = new THREE.Group();
    tri.position.set(rx, ty + 0.003, tipZ);
    dressing.add(tri);
    part(tri, cyl(0.1, 0.1, 0.005, 3), DOUGH, 0, 0, -0.1, { outline: false });
    const log = part(g, UNIT, DOUGH, 0, 0, 0, { outline: false });
    log.rotation.z = Math.PI / 2;
    log.visible = false;
    const carried = bread(g, 'rawCroissant', 0, 0, 0, 0, 0.85);
    carried.visible = false;
    const trayX = rx - CROISSANT_TRAY.side + 0.05;
    sheetPan(g, 0.22, 0.36, trayX, ty, rz);
    const slots: Array<[number, number]> = [[-0.05, -0.11], [-0.05, 0.11], [0.05, -0.11], [0.05, 0], [0.05, 0.11]];
    for (const [sx, sz] of slots) bread(dressing, 'rawCroissant', trayX + sx, ty + 0.013, rz + sz, Math.PI / 2, 0.85);
    // Right: the couche of proving loaves, scored with the lame.
    const sx0 = 0.72;
    const sz = 0.07;
    part(g, box(0.44, 0.008, 0.38), LINEN, sx0 + 0.0, ty + 0.004, sz);
    for (const x of [-0.08, 0.08]) part(g, box(0.012, 0.03, 0.36), LINEN, sx0 + x, ty + 0.015, sz, { outline: false });
    const couche = ty + 0.008;
    bread(dressing, 'rawLoaf', sx0 - 0.16, couche, sz);
    bread(dressing, 'rawLoaf', sx0 + 0.16, couche, sz);
    bread(dressing, 'rawLoaf', sx0, couche, sz);
    const scoreAt = marker(g, sx0, couche, sz);
    const done = new THREE.Vector3(sx0 - 0.16, couche, sz);
    const cuts: THREE.Mesh[] = [];
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    for (let i = 0; i < 3; i++) {
      // The scored loaf at the left, and the cuts on the one being scored (grown as the blade goes).
      const s = scoreSlash(i);
      offAt(done, s.from, A);
      offAt(done, s.to, B);
      const c = part(dressing, CUBE, '#e8cf9a', (A.x + B.x) / 2, A.y + 0.003, (A.z + B.z) / 2, { outline: false });
      c.scale.set(0.008, 0.004, A.distanceTo(B));
      c.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
      const m = part(g, CUBE, '#f3e1b8', 0, 0, 0, { outline: false });
      m.visible = false;
      cuts.push(m);
    }
    const lame = new THREE.Group();
    dressing.add(lame);
    part(lame, box(0.002, 0.004, 0.032), CHROME, 0, 0, 0, { outline: false });
    part(lame, rbox(0.012, 0.095, 0.012, 0.004), BLACK, 0, 0.05, 0);
    const lameRest = new THREE.Vector3(sx0 + 0.15, couche + 0.08, sz + 0.22);
    const lameUp = new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(0.01, 0.035, 0.025).normalize());
    const lameFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0.4, 0));
    lame.position.copy(lameRest).setY(ty + 0.006);
    lame.quaternion.copy(lameFlat);
    // At the back, the new menu on a board, its card propped against it.
    const nx = 0.3;
    const nz = -0.32;
    part(g, rbox(0.34, 0.02, 0.14, 0.01), OAK, nx, ty + 0.01, nz);
    bread(g, 'bun', nx - 0.1, ty + 0.02, nz, 0, 0.9);
    bread(g, 'salt', nx, ty + 0.02, nz, 0.4, 0.9);
    bread(g, 'madeleine', nx + 0.1, ty + 0.02, nz, 0.2);
    part(g, ball(0.012), '#7cb342', nx - 0.1, ty + 0.055, nz, { outline: false });
    label(g, '신메뉴: 쑥크림빵', 0.2, 0.05, nx + 0.03, ty + 0.06, nz + 0.075, '#fffde7', '#33691e', 0, -0.4);
    const menu = marker(g, nx, ty + 0.05, nz);
    // Who works where along it.
    const front = zf + 0.24;
    const knead = at(g, kx, front, marker(g, kx, ty, kz), 'knead');
    const weigh = at(g, scaleX, front, bowl, 'plate');
    const roll = at(g, rx, front, marker(g, rx, ty, rz), 'roll');
    const score = at(g, sx0, front, scoreAt, 'score');
    const meet = at(g, 0.05, front + 0.05, menu, 'meeting');
    out.spots = { '*': knead, kneadDough: knead, shapePastry: roll, bkScoreLoaves: score, baker_weighFlour: weigh, baker_newMenuPlan: meet, xwCloseBakery: bakeryClose(g, out, [dressing]) };
    out.work = knead.work;
    const kneadAt = new THREE.Vector3(kx, ty, kz);
    const rollAt = new THREE.Vector3(rx, ty, rz);
    const p = new THREE.Vector3();
    out.animate = (t) => {
      const now = busy([knead, roll, score], t);
      // Kneading: the dough stretched out under the heel, the far end folded back over, turned.
      if (now === knead) {
        const k = kneadRound(t, phaseAt(knead));
        dough.scale.set(1 - 0.15 * k.stretch, 1 - 0.35 * k.stretch, 1 + 0.75 * k.stretch);
        dough.position.set(kneadAt.x, kneadAt.y, kneadAt.z - 0.05 * k.stretch);
        turn.rotation.y = (k.turns * Math.PI) / 2;
        flapM.visible = k.fold > 0.02;
        flapM.position.set(0, 0.03 + 0.045 * Math.sin(Math.PI * k.fold), -0.08 + 0.07 * k.fold);
      } else {
        dough.scale.set(1, 1, 1);
        dough.position.copy(kneadAt);
        flapM.visible = false;
      }
      // Rolling: the triangle shrinking to its tip as the roll grows, lifted across to the tray.
      if (now === roll) {
        const k = rollRound(t, phaseAt(roll));
        const gone = k.prog >= 0.999 && !k.fresh;
        tri.visible = !gone;
        tri.scale.set(k.fresh ? 1 : 1 - 0.85 * k.prog, 1, k.fresh ? 1 : 1 - 0.85 * k.prog);
        const r = 0.006 + 0.02 * k.prog;
        log.visible = !k.fresh && k.prog > 0.02 && k.carry < 0.01;
        log.scale.set(r, 0.17 * (1 - 0.35 * k.prog), r);
        log.position.set(rollAt.x, rollAt.y + r, rollAt.z - k.roll);
        carried.visible = !k.fresh && k.carry >= 0.01;
        offAt(rollAt, k.cp, carried.position).y -= 0.012;
        carried.rotation.y = Math.PI / 2;
      } else {
        tri.visible = true;
        tri.scale.set(1, 1, 1);
        log.visible = carried.visible = false;
      }
      // Scoring: the lame in the hand, the cuts opening behind its blade.
      if (now === score) {
        const k = scoreRound(t, phaseAt(score));
        offAt(scoreAt.position, k.blade, lame.position);
        lame.quaternion.copy(lameUp);
        for (let i = 0; i < 3; i++) {
          const f = THREE.MathUtils.clamp(k.cut - i, 0, 1);
          const c = cuts[i];
          c.visible = f > 0.02;
          if (!c.visible) continue;
          const s = scoreSlash(i);
          offAt(scoreAt.position, s.from, A);
          offAt(scoreAt.position, s.to, B);
          p.copy(A).lerp(B, f / 2);
          c.position.set(p.x, A.y + 0.004, p.z);
          c.scale.set(0.008, 0.005, A.distanceTo(B) * f);
          c.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
        }
      } else {
        lame.position.copy(lameRest).setY(ty + 0.006);
        lame.quaternion.copy(lameFlat);
        for (const c of cuts) c.visible = false;
      }
    };
  },

  /**
   * The cake table: a white marble top on a pink cabinet with brass knobs, the shelf at the back of
   * piping tips, sprinkles and colours, cake boxes with their ribbon. A cake on the turntable —
   * iced smooth with the palette knife held to its side while the turntable's spun, then piped with
   * rosettes round its top edge from the bag, one at a time at the near side, a notch round between
   * each; bowls of tinted cream, bags standing in a jug. At the right a finished cake on its stand,
   * strawberries and a chocolate plaque on it, sugar flowers set on from a little tiered stand.
   * A rush order's ticket clipped up while it's being finished.
   */
  decorTable(g, W, _D, c, _def, _ctx, out) {
    const zf = 0.3;
    const zb = -0.45;
    const zc = (zf + zb) / 2;
    const d = zf - zb;
    const ty = 0.86;
    // The cabinet: doors and drawers, brass knobs.
    part(g, rbox(W - 0.08, ty - 0.06, d - 0.04, 0.02), c, 0, (ty - 0.06) / 2 + 0.02, zc);
    part(g, box(W - 0.12, 0.04, d - 0.08), shade(c, 0.8), 0, 0.02, zc, { outline: false });
    for (let i = 0; i < 4; i++) {
      const x = -W / 2 + 0.25 + i * 0.5;
      part(g, rbox(0.44, 0.16, 0.02, 0.01), shade(c, 1.04), x, ty - 0.14, zf - 0.01);
      part(g, rbox(0.44, 0.48, 0.02, 0.01), shade(c, 1.04), x, 0.36, zf - 0.01);
      part(g, ball(0.014), '#c9a227', x, ty - 0.14, zf + 0.008, { outline: false });
      part(g, ball(0.014), '#c9a227', x + (i % 2 ? -0.17 : 0.17), 0.45, zf + 0.008, { outline: false });
    }
    // The marble top, veined.
    part(g, rbox(W - 0.02, 0.04, d + 0.02, 0.01), '#f5f2ee', 0, ty - 0.02, zc);
    for (let i = 0; i < 5; i++) part(g, box(0.5, 0.001, 0.004), '#cfc8c0', -0.7 + i * 0.36, ty + 0.0005, zc - 0.2 + (i % 3) * 0.17, { ry: 0.5 - (i % 2) * 0.9, outline: false });
    // The shelf at the back: tips, sprinkles, colours, the cake boxes.
    part(g, box(W - 0.06, 0.32, 0.02), '#fbe9ee', 0, ty + 0.16, zb + 0.01);
    part(g, box(W - 0.06, 0.02, 0.12), '#f8f4f0', 0, ty + 0.25, zb + 0.07);
    part(g, rbox(0.22, 0.04, 0.1, 0.01), '#90caf9', -0.7, ty + 0.28, zb + 0.07);
    for (let i = 0; i < 8; i++) part(g, cyl(0.004, 0.009, 0.02, 8), CHROME, -0.79 + (i % 4) * 0.06, ty + 0.31, zb + 0.05 + Math.floor(i / 4) * 0.04, { outline: false });
    ['#e91e63', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'].forEach((col, i) => {
      part(g, cyl(0.022, 0.022, 0.08, 12), WHITE, -0.38 + i * 0.07, ty + 0.3, zb + 0.07);
      part(g, cyl(0.02, 0.02, 0.05, 12), col, -0.38 + i * 0.07, ty + 0.29, zb + 0.07, { outline: false });
      part(g, cyl(0.012, 0.012, 0.06, 10), col, -0.36 + i * 0.07, ty + 0.03, zb + 0.06);
    });
    label(g, '스프링클', 0.2, 0.04, -0.24, ty + 0.36, zb + 0.13, '#fce4ec', '#ad1457');
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.26, 0.14, 0.24, 0.006), WHITE, 0.72, ty + 0.07 + 0.14 * i, zb + 0.16);
      part(g, box(0.262, 0.02, 0.03), '#f48fb1', 0.72, ty + 0.07 + 0.14 * i, zb + 0.16, { outline: false });
    }
    // Bowls of tinted cream, bags standing in a jug.
    for (const [x, z, col] of [[-0.82, -0.05, '#f8bbd0'], [-0.75, 0.13, '#fff3c4'], [-0.62, -0.2, CREAM]] as const) {
      part(g, cyl(0.075, 0.05, 0.06, 18), WHITE, x, ty + 0.03, z);
      part(g, DOME, col, x, ty + 0.055, z, { outline: false }).scale.set(0.065, 0.025, 0.065);
    }
    part(g, cyl(0.045, 0.04, 0.12, 14), '#e1f5fe', 0.05, ty + 0.06, -0.24);
    ['#f8bbd0', CREAM, '#c5e1a5'].forEach((col, i) => {
      const x = 0.05 + (i - 1) * 0.025;
      see(g, cyl(0.035, 0.006, 0.22, 10), BAG, x, ty + 0.18, -0.24 + (i % 2) * 0.02, 0, 0, (i - 1) * 0.25);
      part(g, cyl(0.026, 0.005, 0.17, 10), col, x, ty + 0.17, -0.24 + (i % 2) * 0.02, { rz: (i - 1) * 0.25, outline: false });
    });
    // The turntable and the cake on it (it all spins with the plate).
    const tx = -0.35;
    const tz = 0.0;
    part(g, cyl(0.07, 0.09, 0.03, 20), '#eeeeee', tx, ty + 0.015, tz);
    part(g, cyl(0.025, 0.035, 0.05, 14), '#bdbdbd', tx, ty + 0.055, tz, { outline: false });
    const spinner = new THREE.Group();
    spinner.position.set(tx, ty + 0.08, tz);
    g.add(spinner);
    part(spinner, cyl(0.15, 0.15, 0.012, 32), '#e0e0e0', 0, 0.006, 0);
    part(spinner, cyl(0.125, 0.125, 0.004, 28), '#c9a227', 0, 0.014, 0, { outline: false });
    const cakeBase = 0.016;
    part(spinner, cyl(CAKE.r, CAKE.r, CAKE.h - 0.004, 32), CREAM, 0, cakeBase + (CAKE.h - 0.004) / 2, 0);
    part(spinner, cyl(CAKE.r - 0.004, CAKE.r - 0.004, 0.004, 32), '#fffaf5', 0, cakeBase + CAKE.h - 0.002, 0, { outline: false });
    const roses: THREE.Group[] = [];
    for (let i = 0; i < ROSETTES; i++) {
      const r = rosette(spinner, i % 2 ? '#f8bbd0' : CREAM);
      const s = Math.PI * 3 + (i * Math.PI * 2) / ROSETTES;
      const v = new THREE.Vector3(0, 0, CAKE.r - 0.025).applyAxisAngle(Y, -s);
      r.position.set(v.x, cakeBase + CAKE.h, v.z);
      roses.push(r);
    }
    const cakeTop = marker(g, tx, ty + 0.08 + cakeBase + CAKE.h, tz);
    // The palette knife and the piping bag: in the hand, or lying on the marble.
    const knife = new THREE.Group();
    g.add(knife);
    part(knife, box(0.032, 0.11, 0.003), CHROME, 0, -0.055, 0);
    part(knife, rbox(0.022, 0.1, 0.022, 0.008), '#5d4037', 0, 0.05, 0);
    const bag = new THREE.Group();
    g.add(bag);
    see(bag, cyl(0.045, 0.006, 0.17, 12), BAG, 0, 0.085, 0);
    part(bag, cyl(0.036, 0.006, 0.15, 12), '#f8bbd0', 0, 0.08, 0, { outline: false });
    part(bag, cyl(0.004, 0.009, 0.016, 8), CHROME, 0, 0.004, 0, { outline: false });
    part(bag, cyl(0.012, 0.03, 0.04, 10), '#f4f8fb', 0, 0.185, 0, { outline: false });
    const toolY = ty + 0.012;
    const knifeRest = { p: new THREE.Vector3(tx + 0.26, toolY, 0.12), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3, Math.PI / 2)) };
    const bagRest = { p: new THREE.Vector3(tx + 0.3, ty + 0.045, -0.05), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.4, Math.PI / 2)) };
    const knifeHeld = new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(0.03, 0.1, 0.07).normalize());
    const bagHeld = new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(0.03, 0.15, 0.06).normalize());
    const restTools = () => {
      knife.position.copy(knifeRest.p);
      knife.quaternion.copy(knifeRest.q);
      bag.position.copy(bagRest.p);
      bag.quaternion.copy(bagRest.q);
    };
    restTools();
    // The finished cake on its stand, and the sugar flowers waiting on their little tiers.
    const fx = 0.45;
    part(g, cyl(0.05, 0.08, 0.012, 20), '#fafafa', fx, ty + 0.006, 0);
    part(g, cyl(0.025, 0.03, 0.1, 14), '#fafafa', fx, ty + 0.06, 0);
    part(g, cyl(0.16, 0.15, 0.015, 32), '#fafafa', fx, ty + 0.115, 0);
    const fTop = ty + 0.123 + 0.13;
    part(g, cyl(0.12, 0.12, 0.13, 32), '#fce4ec', fx, ty + 0.123 + 0.065, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rosette(g, CREAM).position.set(fx + Math.cos(a) * 0.1, fTop, Math.sin(a) * 0.1);
      if (i % 2) part(g, ball(0.016), '#e53935', fx + Math.cos(a) * 0.1, fTop + 0.03, Math.sin(a) * 0.1).scale.set(1, 1.2, 1);
    }
    part(g, box(0.1, 0.005, 0.045), '#4e342e', fx, fTop + 0.004, 0.0);
    label(g, '생일 축하해요', 0.09, 0.03, fx, fTop + 0.0075, 0, '#4e342e', '#fff8e1', 0, -Math.PI / 2);
    for (let i = 0; i < 3; i++) part(g, ball(0.018), ['#f48fb1', '#fff59d', '#ce93d8'][i], fx - 0.04 + i * 0.04, fTop + 0.015, -0.05, { outline: false }).scale.set(1, 0.7, 1);
    const fCake = marker(g, fx, fTop, 0);
    const sfx = fx + 0.27;
    part(g, cyl(0.012, 0.012, 0.3, 10), '#c9a227', sfx, ty + 0.15, 0.05);
    for (const [y, r] of [[ty + 0.08, 0.09], [ty + 0.28, 0.07]] as const) {
      part(g, cyl(r, r - 0.01, 0.01, 22), WHITE, sfx, y, 0.05);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(g, ball(0.015), ['#f48fb1', '#fff59d', '#ce93d8', '#ffffff'][i % 4], sfx + Math.cos(a) * (r - 0.03), y + 0.02, 0.05 + Math.sin(a) * (r - 0.03), { outline: false });
        part(g, box(0.02, 0.003, 0.01), '#81c784', sfx + Math.cos(a) * (r - 0.012), y + 0.008, 0.05 + Math.sin(a) * (r - 0.012), { ry: -a, outline: false });
      }
    }
    // The rush order's ticket, clipped to the shelf.
    const ticket = new THREE.Group();
    g.add(ticket);
    part(ticket, box(0.03, 0.02, 0.01), '#c9a227', -0.35, ty + 0.31, zb + 0.03, { outline: false });
    const tt = painted('rushTicket', 96, 144, (cx) => {
      cx.fillStyle = '#fffdf6';
      cx.fillRect(0, 0, 96, 144);
      cx.fillStyle = '#c62828';
      cx.fillRect(0, 0, 96, 30);
      cx.fillStyle = '#ffffff';
      cx.font = `bold 20px ${FONT}`;
      cx.textAlign = 'center';
      cx.fillText('긴급 주문', 48, 22);
      cx.fillStyle = '#333';
      cx.font = `bold 17px ${FONT}`;
      ['생일 케이크', '딸기 생크림', '2호 · 초 5개', '17:00 픽업'].forEach((l, i) => cx.fillText(l, 48, 56 + i * 24, 90));
    });
    sheet(ticket, tt, 0.09, 0.135, -0.35, ty + 0.24, zb + 0.025);
    ticket.visible = false;
    // The decorator at the turntable, or at the finished cake setting sugar flowers on.
    const front = zf + 0.26;
    const pipe = at(g, tx, front, cakeTop, 'pipe');
    const rush = at(g, tx, front, cakeTop, 'pipe');
    const sugar = at(g, fx, front, fCake, 'plate');
    out.spots = { '*': pipe, decorateCake: pipe, customCakeRush: rush, baker_sugarCraft: sugar };
    out.work = cakeTop;
    const topAt = new THREE.Vector3();
    out.animate = (t) => {
      const now = busy([pipe, rush], t);
      ticket.visible = now === rush;
      if (!now) {
        spinner.rotation.y = 0;
        for (const r of roses) r.visible = true;
        restTools();
        return;
      }
      const k = pipeRound(t, phaseAt(now));
      spinner.rotation.y = k.spin;
      roses.forEach((r, i) => {
        const f = THREE.MathUtils.clamp(k.roses - i, 0, 1);
        r.visible = f > 0.05;
        r.scale.setScalar(Math.max(0.05, f));
      });
      topAt.copy(cakeTop.position);
      restTools();
      if (k.ice && k.u > 0.03 && k.u < 0.39) {
        offAt(topAt, k.r, knife.position);
        knife.quaternion.copy(knifeHeld);
      }
      if (!k.ice && k.u > 0.445 && k.u < 0.975) {
        offAt(topAt, k.tip, bag.position);
        bag.quaternion.copy(bagHeld);
      }
    };
  },

  /**
   * A planetary mixer stood on the floor: a heavy pedestal, the column, the head with its speed
   * lever and buttons, the 30-litre bowl on its yoke with the lift crank at its left, the wire guard
   * over it, a dough hook in the dough; a sack of flour leant against it. Running, the hook goes
   * round the bowl and round itself, the dough turning with it, while the baker scrapes the side
   * down with a spatula, the other hand on the crank.
   */
  bkMixer(g, _W, _D, _c, _def, _ctx, out) {
    const GREY = '#dfe3e6';
    const GREY_D = '#b8bec4';
    part(g, rbox(0.56, 0.12, 0.6, 0.04), GREY_D, 0, 0.06, -0.1);
    part(g, rbox(0.3, 1.3, 0.28, 0.05), GREY, 0, 0.75, -0.3);
    part(g, rbox(0.36, 0.26, 0.66, 0.08), GREY, 0, 1.52, -0.1);
    part(g, cyl(0.07, 0.08, 0.08, 18), GREY_D, 0, 1.36, 0.08);
    label(g, '반죽기 30L', 0.22, 0.05, 0, 1.53, 0.232, GREY, '#37474f');
    for (const [x, col] of [[-0.12, '#43a047'], [0.12, '#e53935']] as const) part(g, cyl(0.022, 0.022, 0.02, 12), col, x, 1.46, 0.235, { rx: Math.PI / 2 });
    // The speed lever on the head's side, its gate marked 1 2 3.
    part(g, box(0.01, 0.1, 0.16), '#78909c', 0.185, 1.52, -0.05, { outline: false });
    label(g, '1  2  3', 0.13, 0.03, 0.191, 1.56, -0.05, '#78909c', '#ffffff', Math.PI / 2);
    rod(g, new THREE.Vector3(0.19, 1.5, -0.05), new THREE.Vector3(0.25, 1.62, -0.02), 0.01, CHROME);
    part(g, ball(0.022), BLACK, 0.25, 1.63, -0.02, { outline: false });
    label(g, '04:00', 0.08, 0.03, -0.1, 1.42, 0.234, '#102018', '#69f0ae');
    // The yoke round the bowl, the crank at its left.
    for (const s of [-1, 1]) part(g, box(0.04, 0.06, 0.48), GREY_D, s * 0.27, 0.82, -0.04);
    part(g, box(0.58, 0.06, 0.06), GREY_D, 0, 0.82, -0.26);
    part(g, cyl(0.05, 0.05, 0.03, 16), GREY_D, -0.3, 0.88, 0.18, { rz: Math.PI / 2 });
    rod(g, new THREE.Vector3(-0.32, 0.88, 0.18), new THREE.Vector3(-0.32, 0.99, 0.28), 0.01, CHROME);
    part(g, cyl(0.015, 0.015, 0.05, 10), BLACK, -0.34, 0.99, 0.28, { rz: Math.PI / 2 });
    // The bowl: stainless, hollow, the dough in it.
    const bz = 0.08;
    const wall = new THREE.Mesh(shape('mixBowl', () => new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.14, 0), new THREE.Vector2(0.2, 0.08), new THREE.Vector2(0.235, 0.3), new THREE.Vector2(0.245, 0.4), new THREE.Vector2(0.235, 0.4), new THREE.Vector2(0.225, 0.3), new THREE.Vector2(0.19, 0.09), new THREE.Vector2(0.13, 0.012), new THREE.Vector2(0, 0.012)], 32)), new THREE.MeshToonMaterial({ color: STEEL_L, gradientMap: gradient, side: THREE.DoubleSide }));
    wall.userData.ownMaterial = true;
    wall.position.set(0, 0.6, bz);
    wall.castShadow = true;
    g.add(wall);
    part(g, ring(0.24, 0.008), STEEL_D, 0, 1.0, bz, { rx: Math.PI / 2, outline: false });
    const dough = new THREE.Group();
    dough.position.set(0, 0.68, bz);
    g.add(dough);
    part(dough, DOME, DOUGH, 0, 0, 0).scale.set(0.18, 0.13, 0.18);
    for (let i = 0; i < 3; i++) part(dough, ring(0.12 - i * 0.03, 0.008, Math.PI), shade(DOUGH, 0.9), 0, 0.07 + i * 0.025, 0, { rx: Math.PI / 2, rz: i, outline: false });
    // The guard: a wire hoop over the bowl and its bars.
    part(g, ring(0.25, 0.006), CHROME, 0, 1.06, bz, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      rod(g, new THREE.Vector3(-0.25 * Math.cos(a), 1.06, bz - 0.25 * Math.sin(a)), new THREE.Vector3(0.25 * Math.cos(a), 1.06, bz + 0.25 * Math.sin(a)), 0.004, CHROME);
    }
    // The hook, hung from the hub: a shaft and its spiral.
    const hook = new THREE.Group();
    hook.position.set(0, 1.32, bz);
    g.add(hook);
    rod(hook, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.35, 0), 0.014, CHROME);
    for (let i = 0; i < 6; i++) {
      const a0 = i * 0.9;
      const a1 = (i + 1) * 0.9;
      rod(hook, new THREE.Vector3(0.05 * Math.cos(a0), -0.35 - i * 0.045, 0.05 * Math.sin(a0)), new THREE.Vector3(0.05 * Math.cos(a1), -0.35 - (i + 1) * 0.045, 0.05 * Math.sin(a1)), 0.013, CHROME);
    }
    // A sack of flour against its side.
    part(g, rbox(0.3, 0.42, 0.18, 0.06), '#efe4cf', 0.36, 0.21, -0.25, { rz: -0.12 });
    label(g, '강력분', 0.14, 0.06, 0.36, 0.25, -0.155, '#efe4cf', '#c62828');
    // The spatula the bowl's scraped down with.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const spat = new THREE.Group();
    use.add(spat);
    part(spat, rbox(0.022, 0.2, 0.022, 0.008), '#e53935', 0, -0.06, 0);
    part(spat, rbox(0.06, 0.08, 0.008, 0.02), '#fafafa', 0, -0.19, 0);
    const work = marker(g, 0, 1.0, bz + 0.2);
    const s = at(g, 0, 0.75, work, 'stir');
    out.spots = { '*': s };
    out.work = work;
    const wp = new THREE.Vector3();
    out.animate = (t) => {
      // Planetary: round the bowl, and round itself the other way.
      const a = t * 2.4;
      hook.position.set(0.07 * Math.cos(a), 1.32, bz + 0.07 * Math.sin(a));
      hook.rotation.y = -t * 7;
      dough.rotation.y = t * 1.3;
      dough.position.y = 0.68 + 0.006 * Math.sin(t * 9);
      // In step with the hand (activity.ts 'stir').
      const sa = t * Math.PI * 2 * 1.2;
      wp.copy(work.position);
      spat.position.set(wp.x + 0.02 - Math.cos(sa) * 0.06, wp.y + 0.1, wp.z - Math.sin(sa) * 0.05);
      spat.rotation.set(-0.35, 0, 0.2 * Math.cos(sa));
    };
  },

  /**
   * A proofer: a tall stainless cabinet on castors, its glass door hung at the left; inside, a warm
   * light, the water tray misting, racks of sheet pans with rolls and loaves rising; the panel over
   * the door showing 32℃ and 85%. Checked, the door swings open and a pan is pulled out to press a
   * finger into the dough.
   */
  bkProofer(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.14;
    const d = D - 0.2;
    const zf = d / 2 - 0.05;
    const zc = zf - d / 2;
    const h = 1.95;
    for (const sx of [-1, 1]) for (const z of [zf - 0.06, zc - d / 2 + 0.06]) {
      part(g, cyl(0.035, 0.035, 0.025, 12), BLACK, sx * (w / 2 - 0.06), 0.04, z, { rz: Math.PI / 2 });
      part(g, box(0.05, 0.04, 0.05), STEEL_D, sx * (w / 2 - 0.06), 0.075, z, { outline: false });
    }
    // The shell: back, sides, bottom, top, the panel over the door.
    part(g, box(w, h - 0.1, 0.03), STEEL, 0, 0.1 + (h - 0.1) / 2, zc - d / 2 + 0.015);
    for (const s of [-1, 1]) part(g, box(0.03, h - 0.1, d), STEEL, s * (w / 2 - 0.015), 0.1 + (h - 0.1) / 2, zc);
    part(g, box(w, 0.06, d), STEEL_D, 0, 0.13, zc);
    part(g, box(w, 0.22, d), STEEL, 0, h - 0.11, zc);
    part(g, box(w - 0.06, 0.14, 0.01), '#1d1f24', 0, h - 0.11, zf + 0.006);
    label(g, '32℃', 0.12, 0.05, -0.12, h - 0.09, zf + 0.012, '#120808', '#ff7043');
    label(g, '85%', 0.12, 0.05, 0.08, h - 0.09, zf + 0.012, '#08100a', '#4fc3f7');
    label(g, '온도', 0.07, 0.025, -0.12, h - 0.145, zf + 0.012, '#1d1f24', '#bdbdbd');
    label(g, '습도', 0.07, 0.025, 0.08, h - 0.145, zf + 0.012, '#1d1f24', '#bdbdbd');
    part(g, cyl(0.02, 0.02, 0.02, 12), '#43a047', 0.26, h - 0.11, zf + 0.012, { rx: Math.PI / 2, outline: false, material: glow('#66bb6a') });
    part(g, box(0.24, 0.08, 0.02), '#37474f', 0, h + 0.04, zf - 0.04);
    label(g, '발효기', 0.2, 0.06, 0, h + 0.04, zf - 0.029, '#37474f', '#ffffff');
    // Inside: the light, the water tray and its mist, the runners and the pans of dough rising.
    part(g, box(w - 0.08, 0.02, 0.02), '#fff3d6', 0, h - 0.24, zf - 0.04, { outline: false, material: glow('#ffe7b0') });
    part(g, box(w - 0.08, h - 0.4, 0.004), '#eadbc3', 0, 0.16 + (h - 0.4) / 2, zc - d / 2 + 0.035, { outline: false });
    part(g, box(w - 0.1, 0.04, d - 0.1), '#90caf9', 0, 0.18, zc, { outline: false });
    for (let i = 0; i < 3; i++) see(g, ball(0.16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false }), -0.15 + i * 0.15, 0.32 + i * 0.05, zc).scale.set(1.2, 0.5, 1);
    const pans = [0.38, 0.6, 0.82, 1.04, 1.26, 1.48];
    pans.forEach((y, i) => {
      for (const s of [-1, 1]) part(g, box(0.02, 0.01, d - 0.08), STEEL_D, s * (w / 2 - 0.04), y - 0.005, zc, { outline: false });
      if (i === 3) return;
      sheetPan(g, w - 0.1, d - 0.12, 0, y, zc, true, false);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) bread(g, i % 2 ? 'doughBall' : 'rawLoaf', -0.21 + c * 0.14, y + 0.014, zc - 0.17 + r * 0.17, i % 2 ? 0 : Math.PI / 2, i % 2 ? 0.9 : 0.42);
    });
    // The pan that's checked: in its place, or pulled out.
    const checkY = pans[3];
    const pan = (g2: THREE.Object3D, z: number) => {
      sheetPan(g2, w - 0.1, d - 0.12, 0, checkY, z, true);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) bread(g2, 'doughBall', -0.21 + c * 0.14, checkY + 0.014, z - 0.17 + r * 0.17, 0, 1.05);
    };
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    pan(idle, zc);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    pan(use, zc + 0.3);
    part(use, box(w - 0.1, 0.012, 0.012), '#ffe7b0', 0, h - 0.27, zf - 0.06, { outline: false, material: glow('#fff1c9') });
    // The door: a steel frame round the glass, its gasket and its handle, hung at the left.
    const hinge = new THREE.Group();
    hinge.position.set(-w / 2, 0, zf + 0.02);
    hinge.userData.swing = -1;
    g.add(hinge);
    const leaf = new THREE.Group();
    leaf.position.x = w / 2;
    hinge.add(leaf);
    const dh = h - 0.38;
    const dy = 0.17 + dh / 2;
    part(leaf, box(w, 0.06, 0.03), STEEL_L, 0, dy + dh / 2 - 0.03, 0);
    part(leaf, box(w, 0.06, 0.03), STEEL_L, 0, dy - dh / 2 + 0.03, 0);
    for (const s of [-1, 1]) part(leaf, box(0.06, dh - 0.12, 0.03), STEEL_L, s * (w / 2 - 0.03), dy, 0);
    see(leaf, box(w - 0.12, dh - 0.12, 0.006), GLASS, 0, dy, 0);
    part(leaf, box(0.03, 0.5, 0.03), BLACK, w / 2 - 0.07, dy + 0.1, 0.04);
    for (const y of [-0.15, 0.35]) part(leaf, box(0.03, 0.02, 0.03), CHROME, w / 2 - 0.07, dy + y, 0.02, { outline: false });
    out.doors = [hinge];
    const work = marker(g, 0, checkY + 0.03, zc + 0.3 + (d - 0.12) / 2 - 0.08);
    const s = at(g, 0, zf + 0.46, work, 'rummage');
    out.spots = { '*': s };
    out.work = work;
  },

  /**
   * A rack trolley of cooling trays: an aluminium frame on castors, runners down both sides and a
   * sheet pan on most of them — 우유식빵 loaves, baguettes, croissants, 소금빵, 단팥빵, soboro,
   * morning rolls, 꽈배기 — a handle at the side, a card clipped on. Used, a pan is pulled half out
   * and the fresh bread laid on it.
   */
  bkCoolingRack(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.58;
    const d = 0.72;
    const h = 1.75;
    const ALU = '#cfd5da';
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      part(g, box(0.03, h - 0.08, 0.03), ALU, sx * (w / 2), 0.08 + (h - 0.08) / 2, sz * (d / 2));
      part(g, cyl(0.03, 0.03, 0.025, 12), BLACK, sx * (w / 2), 0.035, sz * (d / 2), { rz: Math.PI / 2 });
      part(g, box(0.04, 0.03, 0.04), STEEL_D, sx * (w / 2), 0.065, sz * (d / 2), { outline: false });
    }
    for (const sx of [-1, 1]) for (const y of [0.1, h]) part(g, box(0.03, 0.03, d), ALU, sx * (w / 2), y, 0, { outline: false });
    for (const sz of [-1, 1]) part(g, box(w, 0.03, 0.03), ALU, 0, h, sz * (d / 2), { outline: false });
    // The handle and the card.
    rod(g, new THREE.Vector3(w / 2 + 0.02, 0.9, -0.2), new THREE.Vector3(w / 2 + 0.02, 1.3, -0.2), 0.012, ALU);
    for (const y of [0.9, 1.3]) rod(g, new THREE.Vector3(w / 2, y, -0.2), new THREE.Vector3(w / 2 + 0.02, y, -0.2), 0.008, ALU);
    label(g, '식힘 중 · 30분', 0.16, 0.05, 0, h - 0.06, d / 2 + 0.018, '#fffde7', '#5d4037');
    const levels = Array.from({ length: 12 }, (_, i) => 0.2 + i * 0.125);
    const kinds: Array<Bread | null> = ['pullman', 'baguette', 'croissant', null, 'salt', 'bun', 'soboro', 'roll', 'twist', null, 'croissant', 'roll'];
    const pullY = levels[7];
    levels.forEach((y, i) => {
      for (const sx of [-1, 1]) part(g, box(0.02, 0.008, d - 0.02), ALU, sx * (w / 2 - 0.02), y - 0.004, 0, { outline: false });
      const k = kinds[i];
      if (!k || i === 7) return;
      sheetPan(g, w - 0.06, d - 0.04, 0, y, 0, false, false);
      layBreads(g, k, y + 0.012, 0);
    });
    function layBreads(g2: THREE.Object3D, k: Bread, y: number, z: number) {
      if (k === 'pullman') for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) bread(g2, k, -0.17 + i * 0.17, y, z - 0.15 + j * 0.3, 0, 0.9);
      else if (k === 'baguette') for (let i = 0; i < 5; i++) bread(g2, k, -0.2 + i * 0.1, y, z, 0, 1.1);
      else for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) bread(g2, k, -0.16 + i * 0.16, y, z - 0.24 + j * 0.16, k === 'croissant' ? Math.PI / 2 : 0, 0.9);
    }
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    sheetPan(idle, w - 0.06, d - 0.04, 0, pullY, 0, false);
    layBreads(idle, 'roll', pullY + 0.012, 0);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    sheetPan(use, w - 0.06, d - 0.04, 0, pullY, 0.28, false);
    layBreads(use, 'roll', pullY + 0.012, 0.28);
    const work = marker(g, 0, pullY + 0.04, d / 2 + 0.2);
    const s = at(g, 0, d / 2 + 0.55, work, 'rummage');
    out.spots = { '*': s };
    out.work = work;
  },

  /**
   * A bread slicer on its cabinet: the machine's enamel housing over a window onto its frame of
   * blades, the infeed chute at the back with a loaf on it, the lever on top, the out-tray at the
   * front with a sliced loaf; plastic bread bags on a wicket at its side, twist ties, more bags on
   * the shelf under. Used, a loaf goes through the humming blades and comes out in slices, the
   * bag held open under the tray while the other hand works the lever.
   */
  bkSlicer(g, _W, _D, _c, _def, _ctx, out) {
    const ENAMEL = '#cfd8dc';
    const zf = 0.25;
    // The cabinet and its shelf of bags.
    part(g, rbox(0.66, 0.74, 0.52, 0.02), '#eceff1', 0, 0.37, 0);
    part(g, box(0.6, 0.5, 0.01), '#cfd8dc', 0, 0.36, zf + 0.012, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.4, 0.008, 0.25), '#f4f8fb', 0, 0.16 + i * 0.012, zf - 0.13, { outline: false, material: BAG });
    label(g, '식빵 봉투', 0.18, 0.05, 0, 0.6, zf + 0.018, '#cfd8dc', '#37474f');
    // The housing and the window onto the blades.
    part(g, rbox(0.56, 0.42, 0.42, 0.03), ENAMEL, 0, 0.74 + 0.21, -0.05);
    part(g, box(0.3, 0.2, 0.01), '#263238', 0, 0.96, 0.165);
    const blades = new THREE.Group();
    g.add(blades);
    for (let i = 0; i < 14; i++) part(blades, box(0.004, 0.18, 0.006), CHROME, -0.13 + i * 0.02, 0.96, 0.168, { outline: false });
    label(g, '식빵 슬라이서 · 12mm', 0.3, 0.045, 0, 1.11, 0.165, ENAMEL, '#37474f');
    // The infeed chute at the back, a loaf on it; the out-tray at the front, a sliced loaf.
    part(g, box(0.34, 0.012, 0.3), STEEL, 0, 1.22, -0.2, { rx: -0.35 });
    bread(g, 'pullman', 0, 1.23, -0.2, Math.PI / 2, 0.95).rotation.set(-0.35, Math.PI / 2, 0, 'YXZ');
    part(g, box(0.34, 0.012, 0.16), STEEL, 0, 0.84, 0.25);
    for (const s of [-1, 1]) part(g, box(0.01, 0.05, 0.16), STEEL, s * 0.17, 0.865, 0.25, { outline: false });
    const slices = new THREE.Group();
    g.add(slices);
    for (let i = 0; i < 10; i++) {
      part(slices, box(0.11, 0.1, 0.011), '#fff3dc', 0, 0.9, 0.2 + i * 0.012, { outline: false });
      part(slices, box(0.115, 0.012, 0.012), CRUST, 0, 0.955, 0.2 + i * 0.012, { outline: false });
    }
    // The lever on top.
    part(g, cyl(0.03, 0.03, 0.04, 12), STEEL_D, 0.2, 1.17, 0.1, { rz: Math.PI / 2 });
    rod(g, new THREE.Vector3(0.2, 1.17, 0.1), new THREE.Vector3(0.05, 1.31, 0.3), 0.012, CHROME);
    part(g, rbox(0.12, 0.04, 0.04, 0.015), BLACK, 0.03, 1.32, 0.3);
    // The wicket of bags on its side, twist ties.
    part(g, box(0.02, 0.3, 0.25), STEEL_D, 0.3, 0.92, 0.02, { outline: false });
    for (let i = 0; i < 4; i++) see(g, box(0.01, 0.34, 0.22), BAG, 0.32 + i * 0.008, 0.9, 0.02);
    part(g, cyl(0.04, 0.04, 0.03, 14), '#c9a227', -0.24, 0.755, 0.18);
    // Used: the loaf going through, the slices coming out into an open bag.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const going = bread(use, 'pullman', 0, 0.85, 0, Math.PI / 2, 0.95);
    const open = new THREE.Group();
    open.position.set(0, 0.86, 0.38);
    use.add(open);
    see(open, cyl(0.075, 0.07, 0.3, 14), BAG, 0, -0.1, 0);
    const inBag = part(open, box(0.11, 0.1, 0.12), '#fff3dc', 0, -0.17, 0, { outline: false });
    const work = marker(g, 0, 0.88, zf + 0.13);
    const s = at(g, 0, zf + 0.5, work, 'grind');
    out.spots = { '*': s };
    out.work = work;
    out.animate = (t) => {
      blades.position.y = 0.006 * Math.sin(t * 60);
      const u = (t / 6) % 1;
      going.position.z = -0.2 + 0.4 * u;
      going.visible = u < 0.85;
      slices.position.z = -0.05 * (1 - u);
      inBag.scale.set(1, Math.max(0.05, u), 1);
      inBag.position.y = -0.22 + 0.05 * u;
    };
  },

  /**
   * The 평대: an oak display table with a step up along its middle, wicker baskets and boards of
   * the day's bread — 소금빵, croissants, 단팥빵 and soboro, 우유식빵 in their bags, 꽈배기, a tall
   * basket of baguettes — each with its price card; a stack of round trays lined with paper and the
   * tongs at the end; a chalkboard: 오늘 갓 구운 빵. Filled, a pan of fresh 소금빵 is set down and
   * the basket topped up from it.
   */
  bkBreadIsland(g, W, D, _c, _def, _ctx, out) {
    const ty = 0.78;
    const w = W - 0.08;
    const d = D - 0.18;
    // The table: oak, a skirt, legs, a shelf of spare baskets.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.06, ty - 0.04, 0.06), WALNUT, sx * (w / 2 - 0.06), (ty - 0.04) / 2, sz * (d / 2 - 0.06));
    part(g, box(w - 0.06, 0.1, d - 0.06), shade(OAK, 0.85), 0, ty - 0.09, 0);
    part(g, box(w - 0.14, 0.02, d - 0.14), shade(OAK, 0.9), 0, 0.15, 0);
    for (let i = 0; i < 3; i++) basket(g, 0.3, 0.22, 0.1, -0.5 + i * 0.5, 0.16, 0);
    part(g, rbox(w, 0.04, d, 0.012), OAK, 0, ty - 0.02, 0);
    // The step up along the middle-back.
    const rz = -0.14;
    const ry = ty + 0.12;
    part(g, rbox(w - 0.2, 0.12, 0.26, 0.012), shade(OAK, 0.95), 0, ty + 0.06, rz);
    // Front row: trays and tongs, 소금빵, (the space a pan's set in), croissants, 단팥빵 and soboro.
    const fz = 0.15;
    for (let i = 0; i < 6; i++) part(g, cyl(0.15, 0.14, 0.012, 24), '#8d5a3c', -0.8, ty + 0.006 + i * 0.013, fz - 0.02, { outline: i === 5 });
    part(g, cyl(0.12, 0.12, 0.002, 24), '#fffaf0', -0.8, ty + 0.085, fz - 0.02, { outline: false });
    part(g, cyl(0.035, 0.03, 0.12, 12), STEEL_L, -0.62, ty + 0.06, fz + 0.12);
    for (const s of [-1, 1]) rod(g, new THREE.Vector3(-0.62 + s * 0.008, ty + 0.06, fz + 0.12), new THREE.Vector3(-0.62 + s * 0.02, ty + 0.25, fz + 0.12), 0.006, CHROME);
    const sb = -0.45;
    basket(g, 0.26, 0.2, 0.07, sb, ty, fz);
    for (let i = 0; i < 6; i++) bread(g, 'salt', sb - 0.08 + (i % 3) * 0.08, ty + 0.07, fz - 0.045 + Math.floor(i / 3) * 0.09, Math.PI / 2 + (i % 2) * 0.2, 0.9);
    priceCard(g, '소금빵', '3,200', sb, ty + 0.07, fz + 0.12);
    const basketTop = marker(g, sb, ty + 0.1, fz);
    part(g, rbox(0.3, 0.025, 0.24, 0.01), WALNUT, 0.12, ty + 0.0125, fz);
    for (let i = 0; i < 5; i++) bread(g, 'croissant', 0.02 + (i % 3) * 0.1, ty + 0.025, fz - 0.05 + Math.floor(i / 3) * 0.1, i, 0.9);
    priceCard(g, '크루아상', '3,800', 0.12, ty + 0.025, fz + 0.13);
    basket(g, 0.28, 0.2, 0.07, 0.5, ty, fz);
    for (let i = 0; i < 6; i++) bread(g, i < 3 ? 'bun' : 'soboro', 0.42 + (i % 3) * 0.08, ty + 0.07, fz - 0.045 + Math.floor(i / 3) * 0.09, 0, 0.8);
    priceCard(g, '단팥빵', '2,500', 0.44, ty + 0.07, fz + 0.12);
    priceCard(g, '소보로', '2,300', 0.56, ty + 0.07, fz + 0.12);
    // Up on the step: 우유식빵 in bags, 꽈배기, the chalkboard, the tall basket of baguettes.
    for (let i = 0; i < 2; i++) {
      bread(g, 'pullman', -0.62 + i * 0.18, ry, rz, 0, 0.9);
      see(g, box(0.13, 0.14, 0.23), BAG, -0.62 + i * 0.18, ry + 0.07, rz);
    }
    priceCard(g, '우유식빵', '5,500', -0.53, ry, rz + 0.13);
    part(g, rbox(0.3, 0.02, 0.18, 0.01), WALNUT, -0.18, ry + 0.01, rz);
    for (let i = 0; i < 4; i++) bread(g, 'twist', -0.27 + i * 0.06, ry + 0.02, rz, 0, 0.85);
    priceCard(g, '꽈배기', '1,800', -0.18, ry + 0.02, rz + 0.1);
    part(g, box(0.28, 0.2, 0.02), WALNUT, 0.22, ry + 0.12, rz - 0.06, { rx: -0.15 });
    const board = painted('todayBoard', 192, 136, (c) => {
      c.fillStyle = '#2f3e36';
      c.fillRect(0, 0, 192, 136);
      c.fillStyle = '#fff8e1';
      c.textAlign = 'center';
      c.font = `bold 28px ${FONT}`;
      c.fillText('오늘', 96, 40);
      c.fillText('갓 구운 빵', 96, 78);
      c.fillStyle = '#ffcc80';
      c.font = `bold 20px ${FONT}`;
      c.fillText('오전 7시 · 오후 3시', 96, 116);
    });
    sheet(g, board, 0.25, 0.17, 0.22, ry + 0.12, rz - 0.045, 0, -0.15);
    part(g, cyl(0.1, 0.08, 0.26, 16), '#b07d48', 0.66, ry + 0.13, rz);
    for (let i = 0; i < 5; i++) {
      const b = bread(g, 'baguette', 0.66 + 0.03 * Math.cos(i * 1.3), ry + 0.28, rz + 0.03 * Math.sin(i * 1.3), 0, 1);
      b.rotation.set(Math.PI / 2 - 0.12 * Math.cos(i * 1.3), 0, 0.12 * Math.sin(i * 1.3));
    }
    priceCard(g, '바게트', '4,000', 0.66, ry, rz + 0.13);
    // Filled: a pan of fresh 소금빵 beside the basket.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const px = sb + 0.27;
    sheetPan(use, 0.18, 0.26, px, ty + 0.04, fz + 0.02, true);
    for (let i = 0; i < 4; i++) bread(use, 'salt', px - 0.04 + (i % 2) * 0.08, ty + 0.053, fz - 0.04 + Math.floor(i / 2) * 0.12, Math.PI / 2, 0.85);
    const s = at(g, sb, d / 2 + 0.26, basketTop, 'plate');
    out.spots = { '*': s };
    out.work = basketTop;
  },

  /**
   * The packing counter and till (계산대): a walnut-fronted counter with the bakery's name and a
   * white top; at the staff's left the POS with its screen to them and the customer's display turned
   * the other way, the card reader, the receipt printer and the cash drawer; at their right the
   * packing — kraft bags with the logo flat in a pile and one open with bread in it, the roll of
   * bread bags, stickers, cake boxes tied with ribbon, a bell; on the customer's side a tray of
   * bread with its tongs set down to be paid for, and a basket of rusks and madeleines. Used, the
   * order's rung up, a look up at the customer, the bag handed across and set down on their side.
   */
  bkCheckout(g, W, _D, _c, _def, _ctx, out) {
    const zc = -0.02;
    const d = 0.6;
    const ty = 0.95;
    const zs = zc + d / 2;
    const zq = zc - d / 2;
    // The counter: the customer's side panelled in walnut with the name on it, open shelves at the staff's.
    part(g, box(W - 0.06, ty - 0.03, 0.04), WALNUT, 0, (ty - 0.03) / 2, zq + 0.02);
    for (let i = 0; i < 9; i++) part(g, box(0.006, ty - 0.12, 0.004), shade(WALNUT, 0.8), -0.8 + i * 0.2, (ty - 0.03) / 2, zq - 0.001, { outline: false });
    const name = painted('bakeryName', 320, 80, (c) => {
      c.fillStyle = '#4e342e';
      c.fillRect(0, 0, 320, 80);
      c.fillStyle = '#ffe0b2';
      c.textAlign = 'center';
      c.font = `bold 34px ${FONT}`;
      c.fillText('방미소 베이커리', 160, 40);
      c.font = `bold 18px ${FONT}`;
      c.fillText('BAKERY · since 2009', 160, 66);
    });
    sheet(g, name, 0.6, 0.15, -0.35, 0.62, zq - 0.003, Math.PI);
    label(g, '계산대', 0.28, 0.09, 0.45, 0.62, zq - 0.003, '#ffe0b2', '#4e342e', Math.PI);
    for (const sx of [-1, 1]) part(g, box(0.04, ty - 0.03, d), WALNUT, sx * (W / 2 - 0.05), (ty - 0.03) / 2, zc);
    part(g, box(W - 0.1, 0.025, d - 0.06), shade(OAK, 0.9), 0, 0.15, zc);
    part(g, box(W - 0.1, 0.025, d - 0.06), shade(OAK, 0.9), 0, 0.5, zc);
    for (let i = 0; i < 8; i++) part(g, box(0.34, 0.006, 0.24), KRAFT, 0.45, 0.17 + i * 0.008, zc, { outline: i === 7 });
    for (let i = 0; i < 3; i++) part(g, rbox(0.24, 0.12, 0.24, 0.006), WHITE, -0.5 + i * 0.27, 0.58, zc);
    part(g, rbox(W, 0.04, d + 0.04, 0.01), '#f6f3ee', 0, ty - 0.02, zc);
    // The POS, its screen to the staff, the customer's display back to back with it.
    const px = -0.4;
    part(g, rbox(0.4, 0.1, 0.36, 0.01), BLACK, px, 0.83, zs - 0.05);
    part(g, box(0.3, 0.012, 0.004), '#5d5d66', px, 0.83, zs + 0.13, { outline: false });
    part(g, cyl(0.04, 0.06, 0.06, 14), '#3a3d44', px, ty + 0.03, zc + 0.08);
    const head = new THREE.Group();
    head.position.set(px, ty + 0.2, zc + 0.08);
    head.rotation.x = -0.35;
    g.add(head);
    part(head, rbox(0.34, 0.24, 0.04, 0.012), '#3a3d44', 0, 0, 0);
    const scr = screenMesh(0.3, 0.2);
    scr.position.set(0, 0, 0.022);
    head.add(scr);
    out.screen = scr;
    rod(g, new THREE.Vector3(px, ty + 0.06, zc + 0.08), new THREE.Vector3(px, ty + 0.12, zc + 0.08), 0.015, '#3a3d44');
    part(g, rbox(0.18, 0.12, 0.03, 0.01), '#3a3d44', px, ty + 0.14, zc - 0.03);
    label(g, '합계 12,300원', 0.15, 0.04, px, ty + 0.14, zc - 0.046, '#0d2a3a', '#80deea', Math.PI);
    part(g, rbox(0.09, 0.04, 0.15, 0.015), '#3a3d44', -0.1, ty + 0.02, zq + 0.12, { rx: 0.2 });
    part(g, box(0.06, 0.004, 0.04), '#80deea', -0.1, ty + 0.042, zq + 0.11, { outline: false, material: glow('#80deea') });
    part(g, rbox(0.14, 0.12, 0.16, 0.02), '#eceff1', -0.72, ty + 0.06, zc + 0.08);
    part(g, box(0.06, 0.08, 0.002), WHITE, -0.72, ty + 0.15, zc + 0.08, { rx: -0.3, outline: false });
    // The packing: the pile of kraft bags with the logo, the open bag, the roll of bread bags, stickers, the cake boxes, the bell.
    for (let i = 0; i < 5; i++) part(g, box(0.24, 0.006, 0.32), KRAFT, 0.72, ty + 0.003 + i * 0.006, zc + 0.06, { outline: i === 4 });
    label(g, '방미소', 0.1, 0.05, 0.72, ty + 0.034, zc + 0.06, KRAFT, '#4e342e', 0, -Math.PI / 2);
    const bagAt = new THREE.Vector3(0.32, ty, zs - 0.12);
    const kraftBag = new THREE.Group();
    g.add(kraftBag);
    part(kraftBag, box(0.16, 0.22, 0.1), KRAFT, 0, 0.11, 0);
    part(kraftBag, box(0.164, 0.02, 0.104), shade(KRAFT, 0.88), 0, 0.21, 0, { outline: false });
    label(kraftBag, '방미소', 0.1, 0.04, 0, 0.12, 0.052, KRAFT, '#4e342e');
    bread(kraftBag, 'baguette', 0.02, 0.1, 0, 0, 0.6).rotation.set(Math.PI / 2 - 0.2, 0, 0.1);
    bread(kraftBag, 'pullman', -0.02, 0.15, 0, Math.PI / 2, 0.55);
    kraftBag.position.copy(bagAt);
    part(g, cyl(0.04, 0.04, 0.26, 14), '#f4f8fb', 0.62, ty + 0.06, zq + 0.1, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) part(g, box(0.01, 0.1, 0.06), STEEL_D, 0.62 + s * 0.14, ty + 0.05, zq + 0.1, { outline: false });
    part(g, cyl(0.035, 0.035, 0.03, 16), '#f48fb1', 0.36, ty + 0.015, zq + 0.12);
    part(g, ball(0.035), '#c9a227', 0.5, ty + 0.02, zq + 0.12).scale.set(1, 0.7, 1);
    part(g, cyl(0.006, 0.006, 0.03, 8), '#c9a227', 0.5, ty + 0.055, zq + 0.12, { outline: false });
    // The customer's side: a tray of bread with its tongs, a basket of rusks and madeleines.
    const cx = 0.05;
    part(g, cyl(0.15, 0.14, 0.014, 24), '#8d5a3c', cx, ty + 0.007, zq + 0.14);
    part(g, cyl(0.12, 0.12, 0.002, 24), '#fffaf0', cx, ty + 0.015, zq + 0.14, { outline: false });
    bread(g, 'croissant', cx - 0.05, ty + 0.016, zq + 0.12, 0.4, 0.85);
    bread(g, 'salt', cx + 0.05, ty + 0.016, zq + 0.16, 1.2, 0.85);
    bread(g, 'bun', cx, ty + 0.016, zq + 0.2, 0, 0.8);
    rod(g, new THREE.Vector3(cx - 0.12, ty + 0.02, zq + 0.05), new THREE.Vector3(cx + 0.08, ty + 0.025, zq + 0.07), 0.006, CHROME);
    basket(g, 0.2, 0.14, 0.06, 0.82, ty, zq + 0.1);
    for (let i = 0; i < 4; i++) bread(g, i % 2 ? 'madeleine' : 'roll', 0.76 + (i % 2) * 0.1, ty + 0.06, zq + 0.07 + Math.floor(i / 2) * 0.06, 0, 0.8);
    // The staff behind it at the till; the bag they hand across.
    const work = marker(g, px, ty + 0.2, zc + 0.1);
    const s = at(g, px, zs + 0.34, work, 'register');
    out.spots = { '*': s };
    out.work = work;
    const handAt = new THREE.Vector3(px + 0.06, TILL_REACH.up - 0.24, zs + 0.34 - TILL_REACH.ahead);
    const outAt = new THREE.Vector3(px + 0.15, ty, zq + 0.15);
    out.animate = (t) => {
      const k = tillRound(t, phaseAt(s));
      kraftBag.position.copy(k.u < 0.64 ? bagAt : outAt).lerp(handAt, k.give);
    };
  },
};
