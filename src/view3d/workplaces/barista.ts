import * as THREE from 'three';
import { PITCHER, PORTAFILTER, TILL_REACH, espressoRound, latteRound, tillRound, toolPhase, type BarOffset, type Motion } from '../activity';
import { WHITE, marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, gradient, part, rbox } from '../toon';
import { beansKit, machineKit } from './workExtraKits';
import { neighbourShop, shopFront } from './shopFront';

/**
 * The café drawn as itself (2026-10-27 workplace pipeline, at the user's request): the espresso bar
 * — a two-group machine with its grinder, knock box, tamping mat and milk pitcher, a shot pulled the
 * way a barista pulls one (knocked out, ground, tamped, locked in, run into the cup) and a rosetta
 * poured from steamed milk, the tools always in the hands that hold them (activity.ts espressoRound,
 * latteRound); the till with its POS and the pagers handed across; the roastery's drum roaster and
 * bulk grinder, with the cupping bowls — and what the café was missing: the back bar under the lit
 * menu board (아메리카노 4,500), the pickup counter and its bell, the cake showcase, the self bar
 * with the tray return, and the A-board out front.
 */

const STEEL = '#c3cad0';
const STEEL_L = '#d6dce0';
const STEEL_D = '#9aa3ab';
const CHROME = '#e3e7ea';
const BLACK = '#2b2b30';
const WALNUT = '#5d4037';
const OAK = '#b08a62';
const QUARTZ = '#ece8e1';
const IVORY = '#efe6d2';
const BRASS = '#c9a227';
const COFFEE = '#4a2a17';
const GROUNDS = '#3b2314';
const KRAFT = '#c8a27a';
const MILK = '#fbf7ef';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

/** Lit parts (a display, an LED strip): one unlit material a colour, shared. */
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
const DISC = shape('disc', () => new THREE.CircleGeometry(1, 28));
const UNIT = shape('unit', () => new THREE.CylinderGeometry(1, 1, 1, 8));
const PITCHER_WALL = shape('pitcherWall', () => new THREE.CylinderGeometry(0.038, 0.046, 0.115, 22, 1, true));
const GLASS = new THREE.MeshToonMaterial({ color: '#d8eef5', gradientMap: gradient, transparent: true, opacity: 0.28, depthWrite: false });
const STEEL_IN = new THREE.MeshToonMaterial({ color: STEEL_L, gradientMap: gradient, side: THREE.DoubleSide });

function glassPart(g: THREE.Object3D, geom: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(geom, GLASS);
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

/** Steam rising off something hot: puffs going up, growing and fading (`on` false hides them). */
function steam(g: THREE.Object3D, n = 4, spread = 0.04): (t: number, at: THREE.Vector3 | null) => void {
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(ball(0.04), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false }));
    m.userData.ownMaterial = true;
    m.visible = false;
    g.add(m);
    puffs.push(m);
  }
  return (t, at) =>
    puffs.forEach((m, i) => {
      m.visible = !!at;
      if (!at) return;
      const k = (t * 0.6 + i / n) % 1;
      m.position.set(at.x + Math.sin(i * 2.3 + t * 0.8) * spread * (0.4 + k), at.y + k * 0.35, at.z + Math.cos(i * 1.7) * spread * 0.6);
      m.scale.setScalar(0.4 + 1.2 * k);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.32 * Math.sin(Math.PI * k);
    });
}

/** A thin stream poured from one point to another (coffee from the spouts, milk off the pitcher's lip). */
function stream(g: THREE.Object3D, color: string, r: number): (from: THREE.Vector3 | null, to?: THREE.Vector3) => void {
  const m = part(g, UNIT, color, 0, 0, 0, { outline: false, shadow: false });
  m.visible = false;
  const d = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  return (from, to) => {
    m.visible = !!from && !!to && from.distanceTo(to) > 0.004;
    if (!m.visible || !from || !to) return;
    d.subVectors(to, from);
    m.position.copy(from).addScaledVector(d, 0.5);
    m.scale.set(r, d.length(), r);
    m.quaternion.setFromUnitVectors(Y, d.normalize());
  };
}

/** Latte art on the cup's surface, as far as it's been poured (0 plain crema, 8 a finished rosetta pulled through). */
const ART_STEPS = 8;
function artTex(i: number): THREE.Texture {
  return painted(`art${i}`, 96, 96, (c) => {
    const p = i / ART_STEPS;
    const crema = c.createRadialGradient(48, 48, 6, 48, 48, 48);
    crema.addColorStop(0, '#c99257');
    crema.addColorStop(0.75, '#a8692f');
    crema.addColorStop(1, '#6b3c1a');
    c.fillStyle = crema;
    c.fillRect(0, 0, 96, 96);
    if (p <= 0) return;
    // The leaves stacked from the far side towards the pourer, the heart on top, the stem pulled through.
    const leaves = Math.max(1, Math.round(p * 8));
    for (let k = 0; k < leaves; k++) {
      const y = 28 + k * 5.6;
      const w = 27 - Math.abs(k - 2.5) * 2.4;
      c.fillStyle = '#fbf5ea';
      c.beginPath();
      c.ellipse(48, y, w, 5.2, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#b5773c';
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(48, y + 2.6, w * 0.88, 3.4, 0, 0.15, Math.PI - 0.15);
      c.stroke();
    }
    c.fillStyle = '#fbf5ea';
    c.beginPath();
    c.ellipse(48, 22, 9 * Math.min(1, p * 2), 7 * Math.min(1, p * 2), 0, 0, Math.PI * 2);
    c.fill();
    if (p >= 1) {
      c.strokeStyle = '#a8692f';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(48, 16);
      c.lineTo(48, 82);
      c.stroke();
    }
  });
}

/** A latte cup on its saucer, from the saucer's foot; its surface rises with `fill` and shows the art. */
interface Cup {
  root: THREE.Group;
  set(fill: number, art: number): void;
}
function latteCup(parent: THREE.Object3D, color = WHITE): Cup {
  const root = new THREE.Group();
  parent.add(root);
  part(root, cyl(0.062, 0.058, 0.008, 22), color, 0, 0.004, 0);
  // The bowl, hollow so the coffee shows in it.
  const wall = new THREE.Mesh(shape('cupWall', () => new THREE.CylinderGeometry(0.048, 0.032, 0.072, 22, 1, true)), new THREE.MeshToonMaterial({ color, gradientMap: gradient, side: THREE.DoubleSide }));
  wall.userData.ownMaterial = true;
  wall.position.y = 0.044;
  wall.castShadow = true;
  root.add(wall);
  part(root, cyl(0.032, 0.032, 0.004, 20), color, 0, 0.01, 0, { outline: false });
  part(root, ring(0.018, 0.005), color, 0.055, 0.048, 0, { outline: false });
  const surf = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({ map: artTex(0) }));
  surf.userData.ownMaterial = true;
  surf.rotation.x = -Math.PI / 2;
  root.add(surf);
  let shown = -1;
  const set = (fill: number, art: number) => {
    surf.visible = fill > 0.02;
    const f = Math.min(1, Math.max(0, fill));
    surf.position.y = 0.012 + 0.066 * f;
    const r = 0.033 + 0.0135 * f;
    surf.scale.set(r, r, 1);
    const i = Math.round(Math.min(1, Math.max(0, art)) * ART_STEPS);
    if (i !== shown) {
      shown = i;
      (surf.material as THREE.MeshBasicMaterial).map = artTex(i);
    }
  };
  set(0, 0);
  return { root, set };
}

/** A take-out cup: paper with its kraft sleeve and lid, or clear plastic with iced coffee and a straw. */
function takeout(g: THREE.Object3D, x: number, y: number, z: number, kind: 'hot' | 'iced' | 'latte' | 'ade' = 'hot', s = 1) {
  if (kind === 'hot') {
    part(g, cyl(0.042 * s, 0.032 * s, 0.12 * s, 16), WHITE, x, y + 0.06 * s, z);
    part(g, cyl(0.041 * s, 0.037 * s, 0.045 * s, 16), KRAFT, x, y + 0.06 * s, z, { outline: false });
    part(g, cyl(0.043 * s, 0.044 * s, 0.015 * s, 16), BLACK, x, y + 0.125 * s, z, { outline: false });
    return;
  }
  // Clear: the drink inside, ice at the top, the domed lid and a straw.
  glassPart(g, cyl(0.045 * s, 0.033 * s, 0.13 * s, 16), x, y + 0.065 * s, z);
  const c = kind === 'iced' ? '#3e2212' : kind === 'latte' ? '#c9a27a' : '#f4c430';
  part(g, cyl(0.04 * s, 0.031 * s, 0.1 * s, 14), c, x, y + 0.052 * s, z, { outline: false });
  if (kind === 'latte') part(g, cyl(0.041 * s, 0.038 * s, 0.03 * s, 14), MILK, x, y + 0.09 * s, z, { outline: false });
  for (let i = 0; i < 3; i++) part(g, box(0.02 * s, 0.02 * s, 0.02 * s), '#e6f6fb', x + (i - 1) * 0.017 * s, y + 0.112 * s, z + ((i % 2) - 0.5) * 0.015 * s, { ry: i, outline: false });
  glassPart(g, ball(0.045 * s), x, y + 0.13 * s, z).scale.set(1, 0.35, 1);
  rod(g, new THREE.Vector3(x + 0.01 * s, y + 0.04 * s, z), new THREE.Vector3(x + 0.02 * s, y + 0.2 * s, z - 0.01 * s), 0.004 * s, kind === 'ade' ? '#e53935' : '#2e7d32');
}

/** The portafilter, from the middle of its basket's rim: the spent puck or the fresh grounds in it. */
function portafilter(g: THREE.Object3D): { root: THREE.Group; mound: THREE.Mesh; puck: THREE.Mesh } {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.042, 0.036, 0.03, 20), STEEL, 0, -0.015, 0);
  part(root, ring(0.042, 0.004), CHROME, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  for (const s of [-1, 1]) part(root, box(0.018, 0.008, 0.014), STEEL_D, s * 0.048, -0.004, 0, { outline: false });
  part(root, rbox(0.032, 0.022, 0.022, 0.006), STEEL_D, 0, -0.04, 0);
  for (const s of [-1, 1]) part(root, cyl(0.005, 0.004, 0.016, 8), STEEL_D, s * 0.012, -0.056, 0, { outline: false });
  rod(root, new THREE.Vector3(0, -0.012, 0.035), new THREE.Vector3(0, -0.02, 0.08), 0.008, STEEL);
  rod(root, new THREE.Vector3(0, -0.02, 0.08), new THREE.Vector3(0, -PORTAFILTER.droop - 0.006, PORTAFILTER.handle + 0.008), 0.012, WALNUT);
  const mound = part(root, ball(0.036), GROUNDS, 0, -0.004, 0, { outline: false });
  mound.scale.set(1, 0.35, 1);
  const puck = part(root, cyl(0.037, 0.037, 0.004, 18), shade(GROUNDS, 1.25), 0, -0.007, 0, { outline: false });
  return { root, mound, puck };
}

/** The tamper, from the middle of its base. */
function tamper(g: THREE.Object3D): THREE.Group {
  const t = new THREE.Group();
  g.add(t);
  part(t, cyl(0.029, 0.029, 0.016, 20), CHROME, 0, 0.008, 0);
  part(t, cyl(0.012, 0.017, 0.035, 12), CHROME, 0, 0.033, 0, { outline: false });
  part(t, ball(0.024), WALNUT, 0, 0.073, 0).scale.set(1, 1.15, 1);
  return t;
}

/** A milk pitcher, from the middle of its foot: the spout to -x, the handle to +x; its milk's surface. */
function pitcher(g: THREE.Object3D): { root: THREE.Group; milk: THREE.Mesh } {
  const p = new THREE.Group();
  g.add(p);
  const wall = new THREE.Mesh(PITCHER_WALL, STEEL_IN);
  wall.position.y = 0.0575;
  wall.castShadow = true;
  p.add(wall);
  part(p, cyl(0.046, 0.046, 0.004, 22), STEEL_D, 0, 0.002, 0, { outline: false });
  part(p, ring(0.038, 0.003), CHROME, 0, 0.115, 0, { rx: Math.PI / 2, outline: false });
  part(p, box(0.034, 0.006, 0.03), STEEL_L, -0.046, 0.114, 0, { rz: -0.45, outline: false });
  part(p, ring(0.028, 0.006, Math.PI), STEEL, 0.047, 0.066, 0, { rz: -Math.PI / 2, outline: false });
  const milk = part(p, DISC, MILK, 0, 0.06, 0, { rx: -Math.PI / 2, outline: false });
  milk.scale.setScalar(0.04);
  return { root: p, milk };
}

/** A spot stood at (x, z) facing the piece (-z), what's done there and where the hands go. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.work = work;
  s.motion = motion;
  return s;
}
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
const tmp = new THREE.Vector3();
const phaseAt = (s: Spot) => toolPhase(s.at.getWorldPosition(tmp));
/** A point at an offset (activity.ts BarOffset) from `ref`, for a barista facing -z. */
const offAt = (ref: THREE.Vector3, o: BarOffset, v = new THREE.Vector3()) => v.set(ref.x - o.side, ref.y + o.up, ref.z - o.ahead);

/** A sign painted from lines (menu boards, the A-board): title lines bigger, `|` splits name and price. */
function menuTex(key: string, cw: number, ch: number, bg: string, cols: string[][], accent: string, ink = '#fdf6e3'): THREE.Texture {
  return painted(key, cw, ch, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, cw, ch);
    const colW = cw / cols.length;
    cols.forEach((lines, ci) => {
      const x0 = ci * colW + colW * 0.08;
      const x1 = (ci + 1) * colW - colW * 0.08;
      let y = ch * 0.14;
      const step = (ch * 0.84) / Math.max(7, lines.length);
      for (const line of lines) {
        if (line.startsWith('#')) {
          c.fillStyle = accent;
          c.font = `bold ${Math.round(step * 0.8)}px ${FONT}`;
          c.textAlign = 'left';
          c.textBaseline = 'middle';
          c.fillText(line.slice(1), x0, y);
          c.fillRect(x0, y + step * 0.45, x1 - x0, 2);
        } else if (line) {
          const [name, price] = line.split('|');
          c.fillStyle = ink;
          c.font = `${Math.round(step * 0.58)}px ${FONT}`;
          c.textAlign = 'left';
          c.textBaseline = 'middle';
          c.fillText(name, x0, y, (x1 - x0) * 0.68);
          if (price) {
            c.textAlign = 'right';
            c.font = `bold ${Math.round(step * 0.58)}px ${FONT}`;
            c.fillText(price, x1, y);
          }
        }
        y += step;
      }
    });
  });
}

/** 원두·컵 선반 (baristaStockShelf, 2 × 1): the store's shelving: bags of beans, sleeves of cups and lids, syrup bottles, milk crates. */
function stockShelf(g: THREE.Group, W: number, D: number) {
  const zb = -D / 2 + 0.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.035, 1.8, 0.035), '#9aa3ab', sx * (W / 2 - 0.08), 0.9, zb + sz * 0.2, { outline: false });
  [0.12, 0.62, 1.12, 1.62].forEach((y) => part(g, box(W - 0.12, 0.03, 0.46), '#c3cad0', 0, y, zb));
  for (let i = 0; i < 3; i++) part(g, box(0.5, 0.36, 0.36), '#4e7fb8', -W / 2 + 0.38 + i * 0.6, 0.31, zb);
  for (let i = 0; i < 6; i++) part(g, rbox(0.2, 0.32, 0.14, 0.04), i % 2 ? '#6d4c41' : '#3e2723', -W / 2 + 0.25 + i * 0.3, 0.8, zb);
  for (let i = 0; i < 7; i++) part(g, cyl(0.05, 0.04, 0.38, 10), '#fafafa', -W / 2 + 0.22 + i * 0.26, 1.33, zb);
  for (let i = 0; i < 8; i++) part(g, cyl(0.035, 0.035, 0.28, 8), ['#8d6e63', '#ffb74d', '#e57373', '#aed581'][i % 4], -W / 2 + 0.2 + i * 0.22, 1.78, zb);
}

export const BUILDERS: Record<string, Builder> = {
  // The street front, the store behind the bar, the next unit (2026-11-05, the layout audit; shopFront.ts).
  baristaShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 18, door: 12, name: '카페 하은', sub: 'COFFEE · DESSERT', bg: '#3e2723', fg: '#ffcc80', awning: '#5d4037', frame: '#212121', posters: [['아메리카노 4,500', '#fff8e1', '#4e342e', 6.5], ['오늘의 케이크', '#fce4ec', '#880e4f', 15.5]] });
  },
  baristaStockShelf(g, W, D) {
    stockShelf(g, W, D);
  },
  baristaNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '꽃담 플라워', color: '#2e7d32', wall: '#e6d8c3' });
  },
  /**
   * A two-group espresso machine on the back counter: an ivory body with a steel face, two pressure
   * gauges, a shot timer and a button pad over each group, cups upside down on the warmer; the steam
   * wand off its right side, the drip tray under. On its left the grinder (beans in its hopper, the
   * dose lit on it), the knock box with spent pucks, the tamping mat with the tamper; saucers stacked,
   * the milk pitcher by the wand; under the counter a drawer and a glass-doored fridge of milk, coffee
   * bags on a shelf over it. A shot is pulled at the left group (knocked out, ground, tamped, locked in,
   * the espresso running into the cup, slid along to the pass); a latte poured stood by the wand
   * (steamed, then the rosetta coming up on the cup); a group order run on both groups with the
   * tickets clipped up; a recipe read stood at the counter.
   */
  espressoMachine(g, W, _D, _c, _def, ctx, out) {
    const TOP = 0.9;
    const zf = 0.22;
    const zb = -0.48;
    const zc = (zf + zb) / 2;
    const d = zf - zb;
    // The counter: a walnut cabinet, a drawer and a fridge of milk under a quartz top.
    part(g, box(W - 0.04, 0.08, d - 0.06), BLACK, 0, 0.04, zc - 0.02);
    part(g, rbox(0.5, TOP - 0.11, d, 0.01), WALNUT, -0.24, 0.08 + (TOP - 0.11) / 2, zc);
    part(g, rbox(0.48, 0.2, 0.014, 0.006), shade(WALNUT, 1.18), -0.24, 0.7, zf + 0.007);
    part(g, rbox(0.48, 0.44, 0.014, 0.006), shade(WALNUT, 1.18), -0.24, 0.33, zf + 0.007);
    for (const y of [0.74, 0.5]) part(g, box(0.2, 0.014, 0.02), BRASS, -0.24, y, zf + 0.02, { outline: false });
    label(g, '넉박스', 0.1, 0.03, -0.24, 0.66, zf + 0.016, '#3e2723', '#d7ccc8');
    // The fridge: steel walls round a lit inside, cartons of milk on two shelves behind the glass.
    const fx = 0.245;
    const fw = 0.47;
    part(g, box(fw, TOP - 0.11, d - 0.14), STEEL, fx, 0.08 + (TOP - 0.11) / 2, zb + (d - 0.14) / 2);
    for (const s of [-1, 1]) part(g, box(0.02, TOP - 0.11, 0.14), STEEL, fx + s * (fw / 2 - 0.01), 0.08 + (TOP - 0.11) / 2, zf - 0.07);
    part(g, box(fw, 0.02, 0.14), STEEL, fx, 0.09, zf - 0.07);
    part(g, box(fw - 0.04, 0.6, 0.004), '#eef3f5', fx, 0.43, zf - 0.138, { outline: false, material: glow('#eef3f5') });
    part(g, box(fw - 0.04, 0.012, 0.13), STEEL_L, fx, 0.45, zf - 0.07, { outline: false });
    const carton = (x: number, y: number, kind: 'milk' | 'oat' | 'soy') => {
      const col = kind === 'milk' ? '#ffffff' : kind === 'oat' ? '#e7d7b5' : '#e8f1d0';
      part(g, box(0.07, 0.15, 0.07), col, x, y + 0.075, zf - 0.08);
      part(g, box(0.05, 0.03, 0.05), col, x, y + 0.165, zf - 0.08, { rz: Math.PI / 4, outline: false }).scale.set(0.7, 1, 1);
      label(g, kind === 'milk' ? '우유' : kind === 'oat' ? '오트' : '두유', 0.06, 0.03, x, y + 0.08, zf - 0.044, kind === 'milk' ? '#1565c0' : kind === 'oat' ? '#8d6e63' : '#558b2f', '#ffffff');
    };
    for (let i = 0; i < 5; i++) carton(fx - 0.18 + i * 0.09, 0.1, 'milk');
    carton(fx - 0.14, 0.46, 'oat');
    carton(fx - 0.05, 0.46, 'oat');
    carton(fx + 0.04, 0.46, 'soy');
    carton(fx + 0.13, 0.46, 'milk');
    glassPart(g, box(fw - 0.02, TOP - 0.15, 0.008), fx, 0.08 + (TOP - 0.11) / 2, zf);
    part(g, box(0.016, 0.5, 0.02), CHROME, fx - fw / 2 + 0.05, 0.45, zf + 0.02, { outline: false });
    label(g, '4°C', 0.07, 0.028, fx + 0.16, 0.83, zf + 0.006, '#102018', '#69f0ae');
    part(g, rbox(W, 0.03, d + 0.02, 0.008), QUARTZ, 0, TOP - 0.015, zc);
    // A bar towel over the front edge.
    part(g, box(0.16, 0.004, 0.08), WHITE, 0.0, TOP + 0.002, zf - 0.02, { outline: false });
    part(g, box(0.16, 0.12, 0.004), WHITE, 0.0, TOP - 0.06, zf + 0.022);
    part(g, box(0.161, 0.012, 0.005), '#1e88e5', 0.0, TOP - 0.09, zf + 0.023, { outline: false });

    // The machine.
    const MX = 0.12;
    const MW = 0.64;
    const MZ = -0.23;
    const MD = 0.38;
    const MY = TOP + 0.03;
    const MH = 0.43;
    const face = MZ + MD / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.018, 0.022, 0.03, 10), BLACK, MX + sx * (MW / 2 - 0.05), TOP + 0.015, MZ + sz * (MD / 2 - 0.05), { outline: false });
    part(g, rbox(MW, MH, MD, 0.035), IVORY, MX, MY + MH / 2, MZ);
    part(g, box(MW - 0.05, MH - 0.1, 0.012), STEEL_L, MX, MY + MH / 2 + 0.02, face + 0.006);
    part(g, box(MW - 0.02, 0.02, MD - 0.02), STEEL, MX, MY + MH + 0.01, MZ);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(MX + sx * (MW / 2 - 0.02), MY + MH + 0.06, face - 0.02), new THREE.Vector3(MX + sx * (MW / 2 - 0.02), MY + MH + 0.06, MZ - MD / 2 + 0.02), 0.006, CHROME);
    rod(g, new THREE.Vector3(MX - MW / 2 + 0.02, MY + MH + 0.06, face - 0.02), new THREE.Vector3(MX + MW / 2 - 0.02, MY + MH + 0.06, face - 0.02), 0.006, CHROME);
    for (let i = 0; i < 8; i++) {
      const x = MX - 0.22 + (i % 4) * 0.145;
      const z = MZ + (i < 4 ? 0.07 : -0.08);
      part(g, cyl(0.034, 0.046, 0.06, 16), i % 3 === 2 ? '#5d4037' : WHITE, x, MY + MH + 0.05, z);
    }
    label(g, 'ESPRESSO', 0.16, 0.035, MX, MY + MH - 0.03, face + 0.014, '#3e2723', BRASS);
    // Two gauges, each its needle.
    for (const s of [-1, 1]) {
      const x = MX + s * 0.05;
      part(g, cyl(0.03, 0.03, 0.014, 20), CHROME, x, MY + MH - 0.095, face + 0.018, { rx: Math.PI / 2 });
      part(g, DISC, '#fbfbf7', x, MY + MH - 0.095, face + 0.026, { outline: false }).scale.setScalar(0.025);
      part(g, box(0.003, 0.02, 0.002), '#c62828', x, MY + MH - 0.09, face + 0.028, { rz: -0.6 * s, outline: false });
    }
    // The groups: the neck, the head, the button pad and the shot timer over each.
    const G = new THREE.Vector3(-0.04, 1.14, 0.0);
    const G2 = new THREE.Vector3(0.26, 1.14, 0.0);
    for (const q of [G, G2]) {
      part(g, rbox(0.08, 0.07, 0.07, 0.01), CHROME, q.x, 1.205, face + 0.02);
      part(g, cyl(0.05, 0.046, 0.05, 22), CHROME, q.x, 1.165, q.z);
      part(g, box(0.08, 0.035, 0.006), BLACK, q.x, 1.27, face + 0.015, { outline: false });
      for (let i = 0; i < 4; i++) part(g, cyl(0.006, 0.006, 0.004, 10), '#eceff1', q.x - 0.027 + i * 0.018, 1.27, face + 0.019, { rx: Math.PI / 2, outline: false, material: glow(i === 1 ? '#ffd54f' : '#eceff1') });
    }
    const timer = new THREE.Mesh(box(0.06, 0.026, 0.004), new THREE.MeshBasicMaterial({ color: '#2a3140' }));
    timer.userData.ownMaterial = true;
    timer.position.set(G.x, 1.31, face + 0.014);
    g.add(timer);
    out.screen = timer;
    part(g, box(0.06, 0.026, 0.004), '#2a3140', G2.x, 1.31, face + 0.014, { outline: false });
    // The hot water tap between the groups; the steam wand and its knob on the right.
    rod(g, new THREE.Vector3(0.11, 1.2, face + 0.01), new THREE.Vector3(0.11, 1.09, 0.02), 0.006, CHROME);
    const WT = new THREE.Vector3(0.47, 1.0, 0.08);
    const pivot = new THREE.Vector3(0.43, 1.2, -0.02);
    part(g, ball(0.018), CHROME, pivot.x, pivot.y, pivot.z, { outline: false });
    rod(g, pivot, new THREE.Vector3(0.452, 1.13, 0.03), 0.011, BLACK);
    rod(g, new THREE.Vector3(0.452, 1.13, 0.03), WT, 0.006, CHROME);
    for (const x of [-0.17, 0.4]) {
      part(g, cyl(0.022, 0.022, 0.02, 14), BLACK, x, 1.25, face + 0.018, { rx: Math.PI / 2 });
      part(g, box(0.008, 0.03, 0.008), BLACK, x, 1.25, face + 0.032, { outline: false });
    }
    // The drip tray and its grill.
    const dripTray = new THREE.Group();
    dripTray.position.set(MX - 0.01, 0.9425, 0.025);
    g.add(dripTray);
    part(dripTray, rbox(0.6, 0.025, 0.13, 0.008), STEEL_D, 0, 0, 0);
    for (let i = 0; i < 9; i++) part(dripTray, box(0.004, 0.003, 0.11), '#5f6670', -0.26 + i * 0.065, 0.014, 0, { outline: false });
    // The second group's portafilter, locked in.
    const pf2 = portafilter(g);
    pf2.root.position.set(G2.x, G2.y - 0.03, G2.z);
    pf2.root.rotation.y = 0.35;
    pf2.puck.visible = false;
    pf2.mound.visible = false;

    // The grinder: its body, the dose lit on it, the fork, the chute, the hopper of beans.
    const GX = -0.37;
    part(g, rbox(0.17, 0.05, 0.24, 0.01), BLACK, GX, TOP + 0.025, -0.22);
    part(g, rbox(0.15, 0.3, 0.18, 0.03), '#37373d', GX, TOP + 0.2, -0.2);
    part(g, box(0.07, 0.03, 0.004), '#102018', GX, TOP + 0.32, -0.108, { outline: false });
    const dose = label(g, '18.5g', 0.06, 0.024, GX, TOP + 0.32, -0.105, '#102018', '#69f0ae');
    part(g, cyl(0.012, 0.012, 0.012, 12), '#e53935', GX, TOP + 0.255, -0.106, { rx: Math.PI / 2, outline: false });
    part(g, box(0.04, 0.04, 0.07), '#37373d', GX, TOP + 0.235, -0.08, { rx: 0.5 });
    for (const s of [-1, 1]) part(g, box(0.012, 0.012, 0.11), STEEL_D, GX + s * 0.045, TOP + 0.135, -0.07, { outline: false });
    glassPart(g, cyl(0.085, 0.04, 0.2, 18), GX, TOP + 0.45, -0.2);
    part(g, cyl(0.072, 0.04, 0.12, 16), COFFEE, GX, TOP + 0.41, -0.2, { outline: false });
    part(g, cyl(0.088, 0.088, 0.02, 18), BLACK, GX, TOP + 0.56, -0.2);
    // The knock box with its bar and spent pucks; the tamping mat.
    part(g, rbox(0.13, 0.1, 0.12, 0.015), BLACK, GX, TOP + 0.05, 0.12);
    part(g, box(0.11, 0.004, 0.1), '#151517', GX, TOP + 0.101, 0.12, { outline: false });
    rod(g, new THREE.Vector3(GX - 0.065, TOP + 0.09, 0.12), new THREE.Vector3(GX + 0.065, TOP + 0.09, 0.12), 0.01, '#4a4a50');
    for (let i = 0; i < 3; i++) part(g, cyl(0.035, 0.035, 0.016, 14), shade(GROUNDS, 1.25), GX - 0.02 + i * 0.02, TOP + 0.098, 0.1 + (i % 2) * 0.03, { rx: 0.3 * i, outline: false });
    part(g, rbox(0.18, 0.015, 0.11, 0.006), BLACK, -0.2, TOP + 0.0075, 0.155);
    // Saucers stacked by the tray; shot glasses; a jug of water for the wand's cloth.
    for (let i = 0; i < 3; i++) part(g, cyl(0.062, 0.058, 0.006, 22), WHITE, -0.06, TOP + 0.003 + i * 0.0055, 0.16, { outline: i === 2 });
    for (const x of [0.02, 0.06]) glassPart(g, cyl(0.018, 0.015, 0.05, 12), x, TOP + 0.025, 0.2);

    // Coffee bags and a jar on a shelf over it, against the wall.
    if (ctx.againstWall) {
      part(g, rbox(W - 0.06, 0.03, 0.2, 0.008), OAK, 0, 1.64, zb + 0.1);
      for (const s of [-1, 1]) part(g, box(0.02, 0.08, 0.14), BLACK, s * 0.4, 1.6, zb + 0.08, { outline: false });
      const bag = (x: number, name: string, col: string) => {
        part(g, rbox(0.12, 0.2, 0.07, 0.02), col, x, 1.755, zb + 0.1);
        label(g, name, 0.1, 0.04, x, 1.77, zb + 0.137, '#fff8e1', '#4e342e');
      };
      bag(-0.36, '하우스', KRAFT);
      bag(-0.21, '에티오피아', '#263238');
      bag(-0.06, '디카페인', '#6d4c41');
      glassPart(g, cyl(0.05, 0.05, 0.16, 16), 0.12, 1.735, zb + 0.1);
      part(g, cyl(0.045, 0.045, 0.1, 14), COFFEE, 0.12, 1.705, zb + 0.1, { outline: false });
      for (let i = 0; i < 3; i++) part(g, cyl(0.03, 0.025, 0.08, 12), ['#ffffff', '#e0c9a6', '#90a4ae'][i], 0.26 + i * 0.07, 1.695, zb + 0.1);
    }

    // What sits still when nobody's at it: the portafilter locked in, the tamper on the mat, a cup on the saucers, the pitcher by the wand.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const pfRest = portafilter(idle);
    pfRest.root.position.set(G.x, G.y - 0.03, G.z);
    pfRest.root.rotation.y = 0.35;
    pfRest.mound.visible = false;
    tamper(idle).position.set(-0.27, TOP + 0.015, 0.17);
    latteCup(idle).root.position.set(-0.06, TOP + 0.016, 0.16);
    pitcher(idle).root.position.set(0.38, TOP, 0.16);

    // In use: the same, moved by the round.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const pf = portafilter(use);
    const tp = tamper(use);
    const cup = latteCup(use);
    const pt = pitcher(use);
    const shots = [stream(use, '#6b3a1a', 0.0035), stream(use, '#6b3a1a', 0.0035)];
    const fall = stream(use, GROUNDS, 0.006);
    const pour = stream(use, MILK, 0.005);
    const puffs = steam(use, 5, 0.03);
    const cupPuff = steam(use, 3, 0.02);
    // A group order: tickets clipped up, a take-out cup filling under the other group, a carrier of them done.
    const rush = new THREE.Group();
    use.add(rush);
    rod(rush, new THREE.Vector3(MX - 0.25, MY + MH + 0.1, face - 0.01), new THREE.Vector3(MX + 0.25, MY + MH + 0.1, face - 0.01), 0.004, CHROME);
    const tickets: Array<[string, string]> = [['단체 20잔', 'ICE 아메 12'], ['단체 20잔', 'HOT 라떼 5'], ['단체 20잔', '바닐라 3']];
    tickets.forEach(([a, b2], i) => {
      const tex = painted(`ticket|${a}|${b2}`, 96, 128, (c) => {
        c.fillStyle = '#fffdf6';
        c.fillRect(0, 0, 96, 128);
        c.fillStyle = '#c62828';
        c.fillRect(0, 0, 96, 10);
        c.fillStyle = '#222';
        c.font = `bold 20px ${FONT}`;
        c.fillText(a, 8, 40);
        c.font = `bold 17px ${FONT}`;
        c.fillText(b2, 8, 72, 82);
        c.fillText(`#${31 + i}`, 8, 104);
      });
      sheet(rush, tex, 0.07, 0.093, MX - 0.18 + i * 0.12, MY + MH + 0.05, face + 0.002, 0, 0).rotation.z = (i - 1) * 0.06;
    });
    glassPart(rush, cyl(0.028, 0.022, 0.065, 14), G2.x, 0.955 + 0.0325, G2.z);
    part(rush, cyl(0.024, 0.022, 0.03, 14), '#3e2212', G2.x, 0.955 + 0.017, G2.z, { outline: false });
    const carrier = new THREE.Group();
    carrier.position.set(0.38, TOP, 0.16);
    rush.add(carrier);
    part(carrier, rbox(0.17, 0.03, 0.17, 0.01), KRAFT, 0, 0.015, 0);
    for (let i = 0; i < 4; i++) takeout(carrier, ((i % 2) - 0.5) * 0.08, 0.01, (Math.floor(i / 2) - 0.5) * 0.08, i % 2 ? 'iced' : 'hot', 0.75);
    const shots2 = stream(rush, '#6b3a1a', 0.0035);

    // Where the barista stands: at the left group for a shot (and a rush), by the wand to pour, at the counter to read.
    const GW = marker(g, G.x, G.y, G.z);
    const WW = marker(g, WT.x, WT.y, WT.z);
    const pull = stoodAt(g, -0.1, 0.45, 'espresso', GW);
    const order = stoodAt(g, -0.1, 0.45, 'espresso', GW);
    const art = stoodAt(g, 0.22, 0.45, 'latteArt', WW);
    const study = stoodAt(g, -0.05, 0.55, 'read');
    // The machine's cleaning (xwCleanMachine): its own round and props (workExtraMotion.ts, workExtraKits.ts).
    const clean = machineKit(g, use, GW, { pf: pf.root, mound: pf.mound, puck: pf.puck, tray: dripTray });
    out.spots = { '*': pull, pullEspresso: pull, groupOrder: order, latteArt: art, learnRecipe: study, xwCleanMachine: clean.spot };
    out.work = GW;

    const v = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const toolsAtRest = () => {
      pf.root.position.set(G.x, G.y - 0.03, G.z);
      pf.root.rotation.set(0, 0.35, 0);
      pf.mound.visible = false;
      pf.puck.visible = true;
      tp.position.set(-0.27, TOP + 0.015, 0.17);
      cup.root.position.set(-0.06, TOP + 0.016, 0.16);
      cup.root.rotation.z = 0;
      cup.root.visible = true;
      cup.set(0, 0);
      pt.root.position.set(0.38, TOP, 0.16);
      pt.root.rotation.z = 0;
      pt.root.visible = true;
      pt.milk.position.y = 0.06;
      shots.forEach((s) => s(null));
      fall(null);
      pour(null);
      shots2(null);
    };
    // Put back if the cleaning's left part way (the tray out of its place).
    out.away = () => {
      if (!use.visible) clean.off();
    };
    out.animate = (t) => {
      // Which use is going on: the spot most lately stood at.
      let now: Spot | null = null;
      for (const s of [pull, order, art, study]) if (posed(s, t) && (!now || (s.at.userData.posedAt as number) > (now.at.userData.posedAt as number))) now = s;
      toolsAtRest();
      rush.visible = now === order;
      // Being cleaned: the script has the portafilter and the drip tray; the pitcher and the cup are put away.
      const C = clean.update(t);
      if (C) {
        pt.root.visible = cup.root.visible = false;
        puffs(t, C.n.steam > 0.1 ? v.set(WT.x, WT.y, WT.z) : null);
        cupPuff(t, null);
        return;
      }
      (dose.material as THREE.MeshBasicMaterial).color.set('#ffffff');
      if (now === pull || now === order) {
        const k = espressoRound(t, phaseAt(now));
        offAt(G, k.pf, pf.root.position);
        pf.root.rotation.set(0, k.twist, 0);
        pf.mound.visible = !k.tamped && k.grounds > 0.03;
        pf.mound.scale.set(Math.max(0.3, k.grounds), 0.35 * k.grounds, Math.max(0.3, k.grounds));
        pf.puck.visible = k.tamped && k.grounds > 0.5;
        offAt(G, k.tamper, tp.position);
        offAt(G, k.cup, cup.root.position);
        cup.root.visible = k.cupOn;
        cup.set(k.fill * 0.55, 0);
        // The grinder's spout pouring into the basket.
        if (k.grinding) fall(v.set(GX, TOP + 0.21, -0.05), v2.copy(pf.root.position).setY(pf.root.position.y + 0.01 + 0.012 * k.grounds));
        (dose.material as THREE.MeshBasicMaterial).color.set(k.grinding ? '#ffffff' : '#7a8a80');
        // The shot running from both spouts into the cup.
        const surf = cup.root.position.y + 0.012 + 0.066 * k.fill * 0.55;
        for (const [i, s] of shots.entries()) s(k.flow ? v.set(pf.root.position.x + (i - 0.5) * 0.024, pf.root.position.y - 0.064, pf.root.position.z) : null, v2.set(pf.root.position.x + (i - 0.5) * 0.02, surf, pf.root.position.z));
        cupPuff(t, k.flow || k.u < 0.1 ? v.copy(cup.root.position).setY(cup.root.position.y + 0.08) : null);
        puffs(t, null);
        if (now === order) {
          // The other group runs too; the pitcher's put away for the carrier.
          pt.root.visible = false;
          shots2(k.flow ? v.set(G2.x, G2.y - 0.094, G2.z) : null, v2.set(G2.x, 0.955 + 0.035, G2.z));
        }
        return;
      }
      if (now === art) {
        const k = latteRound(t, phaseAt(art));
        offAt(WT, k.pitcher, pt.root.position);
        pt.root.rotation.z = k.tilt;
        pt.milk.position.y = k.level;
        offAt(WT, k.cup, cup.root.position);
        cup.root.rotation.z = k.cupTilt;
        cup.set(k.fill, k.art);
        puffs(t, k.steaming ? v.set(WT.x, WT.y + 0.04, WT.z) : null);
        cupPuff(t, k.u < 0.46 || k.u > 0.95 ? v.copy(cup.root.position).setY(cup.root.position.y + 0.08) : null);
        if (k.flow) {
          const c = Math.cos(k.tilt);
          const s = Math.sin(k.tilt);
          const sp = v.set(pt.root.position.x + PITCHER.spout.x * c - PITCHER.spout.y * s, pt.root.position.y + PITCHER.spout.x * s + PITCHER.spout.y * c, pt.root.position.z);
          pour(sp, v2.set(cup.root.position.x, cup.root.position.y + 0.012 + 0.066 * k.fill, cup.root.position.z));
        }
        return;
      }
      puffs(t, null);
      cupPuff(t, null);
    };
  },

  /**
   * The till: a counter with a slatted oak front and a lit "ORDER" sign to the customers, a quartz
   * top; the POS screen tipped up to the barista (lit while used), the card reader and its little
   * screen turned to the customer, the receipt printer; the pager tower (진동벨, each numbered, one
   * blinking), an acrylic menu, a basket of madeleines and a succulent; on the staff side a cash
   * drawer, cups and the shift rota on a clipboard. An order's tapped in and the pager handed across;
   * the rota is written stood at the clipboard.
   */
  cafeCounter(g, W, _D, _c, _def, _ctx, out) {
    const TOP = 1.02;
    const zb = -0.42;
    const zf = 0.18;
    const zc = (zb + zf) / 2;
    const w = W - 0.04;
    // The body: the customers' side slatted, the staff side open shelves.
    part(g, box(w - 0.04, 0.06, zf - zb - 0.04), BLACK, 0, 0.03, zc);
    part(g, box(w, TOP - 0.1, 0.03), OAK, 0, 0.06 + (TOP - 0.1) / 2, zb + 0.015);
    for (let x = -w / 2 + 0.05; x < w / 2; x += 0.07) part(g, box(0.04, TOP - 0.14, 0.012), shade(OAK, x % 0.14 > 0.07 ? 0.92 : 1.06), x, 0.06 + (TOP - 0.1) / 2, zb - 0.006, { outline: false });
    for (const s of [-1, 1]) part(g, box(0.03, TOP - 0.1, zf - zb), WALNUT, s * (w / 2 - 0.015), 0.06 + (TOP - 0.1) / 2, zc);
    part(g, box(w - 0.06, 0.02, zf - zb - 0.04), WALNUT, 0, 0.42, zc);
    part(g, box(0.02, TOP - 0.1, zf - zb - 0.04), WALNUT, 0, 0.06 + (TOP - 0.1) / 2, zc);
    // The sign to the customers.
    part(g, rbox(0.62, 0.16, 0.02, 0.01), '#2f2a26', -0.45, 0.72, zb - 0.02);
    const signTex = painted('orderSign', 256, 64, (c) => {
      c.fillStyle = '#2f2a26';
      c.fillRect(0, 0, 256, 64);
      c.fillStyle = '#ffe9b0';
      c.font = `bold 30px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('ORDER · 주문하는 곳', 128, 34, 240);
    });
    sheet(g, signTex, 0.58, 0.14, -0.45, 0.72, zb - 0.032, Math.PI);
    part(g, rbox(w + 0.04, 0.035, zf - zb + 0.1, 0.01), QUARTZ, 0, TOP - 0.0175, zc);
    const ty = TOP;
    // The POS, tipped up to the barista, its menu of buttons on it.
    const px = -0.45;
    part(g, rbox(0.12, 0.02, 0.12, 0.01), BLACK, px, ty + 0.01, 0.0);
    part(g, box(0.03, 0.12, 0.03), BLACK, px, ty + 0.07, -0.01, { rx: -0.3 });
    part(g, rbox(0.34, 0.24, 0.025, 0.01), BLACK, px, ty + 0.2, 0.0, { rx: -0.45 });
    const posTex = painted('pos', 256, 176, (c) => {
      c.fillStyle = '#f5f2ec';
      c.fillRect(0, 0, 256, 176);
      c.fillStyle = '#4e342e';
      c.fillRect(0, 0, 256, 20);
      c.fillStyle = '#ffffff';
      c.font = `bold 13px ${FONT}`;
      c.fillText('카페 하은  POS   주문 #031', 8, 15);
      const items = ['아메리카노', '카페라떼', '바닐라라떼', '카푸치노', '콜드브루', '녹차라떼', '아이스티', '레몬에이드', '케이크'];
      items.forEach((it, i) => {
        const x = 6 + (i % 3) * 56;
        const y = 26 + Math.floor(i / 3) * 46;
        c.fillStyle = i < 5 ? '#d7ccc8' : '#c8e6c9';
        c.fillRect(x, y, 52, 40);
        c.fillStyle = '#3e2723';
        c.font = `bold 11px ${FONT}`;
        c.fillText(it, x + 3, y + 17, 48);
        c.font = `10px ${FONT}`;
        c.fillText(['4,500', '5,000', '5,500', '5,000', '5,000', '5,500', '4,500', '5,500', '6,500'][i], x + 3, y + 33);
      });
      c.fillStyle = '#fff';
      c.fillRect(176, 26, 74, 108);
      c.fillStyle = '#333';
      c.font = `11px ${FONT}`;
      ['ICE 아메 x2', '라떼 x1', '치즈케이크'].forEach((l, i) => c.fillText(l, 180, 44 + i * 18, 66));
      c.font = `bold 12px ${FONT}`;
      c.fillText('20,500원', 180, 124);
      c.fillStyle = '#1e88e5';
      c.fillRect(176, 140, 74, 30);
      c.fillStyle = '#fff';
      c.font = `bold 14px ${FONT}`;
      c.fillText('결제', 198, 160);
    });
    const pos = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.21), new THREE.MeshBasicMaterial({ map: posTex, color: '#2a3140' }));
    pos.userData.ownGeometry = pos.userData.ownMaterial = true;
    pos.position.set(px, ty + 0.2 + 0.006, 0.013);
    pos.rotation.x = -0.45;
    g.add(pos);
    out.screen = pos;
    const posWork = marker(g, px, ty + 0.16, 0.05);
    // The card reader turned to the customer, the receipt printer.
    part(g, rbox(0.08, 0.05, 0.12, 0.012), BLACK, -0.15, ty + 0.025, -0.3, { rx: 0.25 });
    label(g, '카드 IC', 0.05, 0.025, -0.15, ty + 0.06, -0.36, '#102030', '#80d8ff', Math.PI, 0.6);
    part(g, rbox(0.12, 0.1, 0.14, 0.02), '#eceff1', -0.78, ty + 0.05, -0.02);
    part(g, box(0.06, 0.07, 0.002), '#ffffff', -0.78, ty + 0.12, -0.08, { rx: -0.4, outline: false });
    // The pager tower: round pagers stacked on their charging base, numbered, one blinking.
    const tower = new THREE.Group();
    tower.position.set(0.12, ty, -0.25);
    g.add(tower);
    part(tower, rbox(0.14, 0.04, 0.14, 0.02), BLACK, 0, 0.02, 0);
    const pagers: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      part(tower, cyl(0.06, 0.06, 0.022, 20), i % 2 ? '#37474f' : '#455a64', 0, 0.05 + i * 0.025, 0);
      const led = part(tower, box(0.016, 0.008, 0.004), '#ff1744', 0, 0.05 + i * 0.025, -0.061, { outline: false });
      led.material = new THREE.MeshBasicMaterial({ color: '#5a1010' });
      led.userData.ownMaterial = true;
      pagers.push(led);
    }
    label(g, '진동벨', 0.09, 0.03, 0.12, ty + 0.03, -0.322, '#212121', '#ffeb3b', Math.PI);
    // The pager going across, held out over the counter.
    const handed = new THREE.Group();
    g.add(handed);
    part(handed, cyl(0.06, 0.06, 0.022, 20), '#37474f', 0, 0.011, 0);
    part(handed, box(0.016, 0.008, 0.004), '#ff1744', 0, 0.011, -0.061, { outline: false, material: glow('#ff1744') });
    // The acrylic menu to the customers.
    const menu = menuTex('counterMenu', 192, 256, '#fffaf0', [['#COFFEE', '아메리카노|4.5', '카페라떼|5.0', '바닐라라떼|5.5', '콜드브루|5.0', '#DESSERT', '치즈케이크|6.5', '티라미수|7.0']], '#6d4c41', '#3e2723');
    part(g, box(0.16, 0.012, 0.06), '#e0f2f1', 0.45, ty + 0.006, -0.33);
    sheet(g, menu, 0.15, 0.2, 0.45, ty + 0.11, -0.33, Math.PI, 0.15);
    glassPart(g, box(0.16, 0.21, 0.004), 0.45, ty + 0.11, -0.336, 0.15);
    // Madeleines in a basket, a succulent.
    part(g, rbox(0.2, 0.06, 0.14, 0.02), '#c49a6c', 0.78, ty + 0.03, -0.26);
    for (let i = 0; i < 6; i++) part(g, ball(0.028), '#e3a857', 0.71 + (i % 3) * 0.07, ty + 0.07, -0.29 + Math.floor(i / 3) * 0.06, { outline: false }).scale.set(1.3, 0.55, 0.9);
    label(g, '마들렌 2,500', 0.12, 0.03, 0.78, ty + 0.03, -0.333, '#ffffff', '#c62828', Math.PI);
    part(g, cyl(0.04, 0.032, 0.06, 12), '#d7ccc8', -0.7, ty + 0.03, -0.3);
    for (let i = 0; i < 5; i++) part(g, ball(0.022), '#7cb342', -0.7 + Math.cos(i * 1.3) * 0.018, ty + 0.075, -0.3 + Math.sin(i * 1.3) * 0.018, { outline: false }).scale.set(0.6, 1.2, 0.6);
    // The staff side: the cash drawer, cups on the shelf, the rota on its clipboard.
    part(g, rbox(0.36, 0.1, 0.4, 0.01), '#37373d', px, TOP - 0.1, -0.08);
    part(g, box(0.2, 0.012, 0.012), CHROME, px, TOP - 0.1, 0.125, { outline: false });
    for (let i = 0; i < 4; i++) takeout(g, -0.1 + i * 0.1, 0.43, 0.02, 'hot', 0.8);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) part(g, cyl(0.04, 0.03, 0.03, 12), WHITE, 0.28 + j * 0.12, 0.445 + i * 0.03, 0.0, { outline: false });
    const clip = new THREE.Group();
    clip.position.set(0.55, ty + 0.005, 0.03);
    clip.rotation.y = 0.15;
    g.add(clip);
    part(clip, rbox(0.23, 0.008, 0.31, 0.006), '#8d6e63', 0, 0.004, 0);
    part(clip, box(0.08, 0.012, 0.03), CHROME, 0, 0.012, -0.14);
    const rota = painted('rota', 128, 160, (c) => {
      c.fillStyle = '#fffdf6';
      c.fillRect(0, 0, 128, 160);
      c.fillStyle = '#3e2723';
      c.font = `bold 15px ${FONT}`;
      c.fillText('근무표 11월', 8, 20);
      const days = ['월', '화', '수', '목', '금', '토', '일'];
      days.forEach((d, i) => c.fillText(d, 30 + i * 13, 40));
      ['하은', '예린', '도윤', '알바'].forEach((n, r) => {
        c.font = `12px ${FONT}`;
        c.fillText(n, 4, 60 + r * 22);
        for (let i = 0; i < 7; i++) {
          c.fillStyle = (i + r) % 3 === 0 ? '#ffcc80' : (i + r) % 3 === 1 ? '#a5d6a7' : '#eeeeee';
          c.fillRect(28 + i * 13, 50 + r * 22, 11, 14);
          c.fillStyle = '#3e2723';
        }
      });
    });
    sheet(clip, rota, 0.2, 0.26, 0, 0.0095, 0.01, 0, -Math.PI / 2);
    part(clip, cyl(0.004, 0.004, 0.13, 6), '#1565c0', 0.06, 0.014, 0.05, { rz: Math.PI / 2, ry: 0.5, outline: false });
    const write = marker(clip, 0.0, 0.01, 0.03);
    const till = stoodAt(g, px, 0.48, 'register', posWork);
    const rotaSpot = stoodAt(g, 0.52, 0.48, 'write', write);
    // The stock order (xwOrderBeans): its own round and props (workExtraMotion.ts, workExtraKits.ts).
    const beans = beansKit(g, posWork);
    out.spots = { '*': till, takeOrders: till, shiftSchedule: rotaSpot, xwOrderBeans: beans.spot };
    out.away = (_o, t) => {
      beans.update(t);
    };
    out.work = posWork;
    out.inUse = handed;
    // In the hand as it goes out across the counter (activity.ts tillRound), left there for the customer.
    const start = new THREE.Vector3(px + 0.02, ty + 0.06, 0.1);
    const reach = new THREE.Vector3(px + 0.06, ty + 0.012, 0.48 - TILL_REACH.ahead);
    out.animate = (t) => {
      pagers.forEach((m, i) => (m.material as THREE.MeshBasicMaterial).color.set(i === 3 && Math.sin(t * 8) > 0 ? '#ff1744' : '#5a1010'));
      const k = tillRound(t, phaseAt(till));
      handed.visible = posed(till, t) && k.u >= 0.55;
      handed.position.copy(start).lerp(reach, k.out);
      handed.position.y += 0.05 * Math.sin(Math.PI * k.out);
    };
  },

  /**
   * A shop roaster in the back room: a black drum roaster on its stand, green beans in the hopper,
   * the drum's door with its sight glass glowing, the temperature lit on its panel, its chimney up
   * and into the wall, the cooling tray out front with its arms turning the beans; beside it a bench
   * with a tall bulk grinder over a kraft bag, a row of cupping bowls with their spoons and a
   * gooseneck kettle, a burlap sack of green coffee under it. Beans are ground into the bag (held
   * under the spout); a cupping is slurped from the spoon at the bowls.
   */
  beanRoaster(g, _W, _D, _c, _def, ctx, out) {
    // The roaster on its stand.
    const RX = -0.24;
    const RZ = -0.18;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, 0.36, 0.04), BLACK, RX + sx * 0.15, 0.18, RZ + sz * 0.15, { outline: false });
    part(g, rbox(0.38, 0.03, 0.38, 0.01), BLACK, RX, 0.36, RZ);
    part(g, rbox(0.36, 0.52, 0.36, 0.04), '#2f2f35', RX, 0.64, RZ);
    part(g, rbox(0.37, 0.05, 0.37, 0.02), '#8d1c1c', RX, 0.88, RZ);
    // The drum's face: a brass ring, the door, the sight glass.
    part(g, cyl(0.15, 0.15, 0.03, 26), BRASS, RX, 0.66, RZ + 0.19, { rx: Math.PI / 2 });
    part(g, cyl(0.13, 0.13, 0.03, 26), '#3a3a40', RX, 0.66, RZ + 0.2, { rx: Math.PI / 2 });
    const sight = new THREE.Mesh(cyl(0.045, 0.045, 0.012, 18), new THREE.MeshBasicMaterial({ color: '#5a2a10' }));
    sight.userData.ownMaterial = true;
    sight.position.set(RX + 0.04, 0.7, RZ + 0.218);
    sight.rotation.x = Math.PI / 2;
    g.add(sight);
    rod(g, new THREE.Vector3(RX - 0.08, 0.6, RZ + 0.22), new THREE.Vector3(RX - 0.08, 0.6, RZ + 0.3), 0.008, BRASS);
    part(g, cyl(0.012, 0.012, 0.1, 8), WALNUT, RX - 0.08, 0.6, RZ + 0.32, { rz: Math.PI / 2, outline: false });
    // The panel: the bean temperature, a dial.
    part(g, rbox(0.03, 0.18, 0.2, 0.01), '#212121', RX + 0.195, 0.7, RZ);
    label(g, '204℃', 0.1, 0.04, RX + 0.212, 0.74, RZ, '#101010', '#ff6e40', Math.PI / 2);
    part(g, cyl(0.025, 0.025, 0.02, 14), CHROME, RX + 0.215, 0.66, RZ, { rz: Math.PI / 2 });
    // The hopper of green beans, the chimney.
    part(g, cyl(0.13, 0.045, 0.2, 20), STEEL, RX, 1.02, RZ - 0.02);
    part(g, cyl(0.12, 0.12, 0.01, 20), '#a9b27a', RX, 1.115, RZ - 0.02, { outline: false });
    for (let i = 0; i < 8; i++) part(g, ball(0.012), '#9ba76a', RX + Math.cos(i * 2.1) * 0.07, 1.123, RZ - 0.02 + Math.sin(i * 2.1) * 0.07, { outline: false }).scale.set(1.3, 0.6, 1);
    rod(g, new THREE.Vector3(RX + 0.1, 0.9, RZ - 0.12), new THREE.Vector3(RX + 0.1, 1.7, RZ - 0.12), 0.05, STEEL_D);
    rod(g, new THREE.Vector3(RX + 0.1, 1.7, RZ - 0.12), new THREE.Vector3(RX + 0.1, 1.85, ctx.againstWall ? -0.5 : RZ - 0.3), 0.05, STEEL_D);
    // The cooling tray out front: its basin, its beans, its turning arms; the chute down to it from the door.
    const TZ = 0.22;
    const TY = 0.62;
    for (const a of [0.6, 2.5, 4.4]) part(g, box(0.025, TY, 0.025), BLACK, RX + Math.cos(a) * 0.15, TY / 2, TZ + Math.sin(a) * 0.15, { outline: false });
    part(g, cyl(0.2, 0.17, 0.08, 28), STEEL, RX, TY + 0.04, TZ);
    part(g, cyl(0.19, 0.19, 0.01, 28), '#6b3e22', RX, TY + 0.07, TZ, { outline: false });
    part(g, box(0.08, 0.02, 0.14), STEEL_D, RX, 0.58, RZ + 0.27, { rx: 0.5 });
    const arms = new THREE.Group();
    arms.position.set(RX, TY + 0.075, TZ);
    g.add(arms);
    part(arms, cyl(0.02, 0.02, 0.05, 10), STEEL_D, 0, 0.02, 0);
    for (let i = 0; i < 4; i++) part(arms, box(0.17, 0.02, 0.012), STEEL_D, Math.cos((i * Math.PI) / 2) * 0.09, 0.012, Math.sin((i * Math.PI) / 2) * 0.09, { ry: -(i * Math.PI) / 2, outline: false });
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4;
      const r = 0.03 + ((i * 37) % 15) / 100;
      part(arms, ball(0.011), i % 3 ? '#4e2a14' : '#6d3d1e', Math.cos(a) * r, 0.003, Math.sin(a) * r, { outline: false }).scale.set(1.3, 0.6, 1);
    }

    // The bench: a wooden top on steel legs, a sack of green coffee under it.
    const BX = 0.25;
    const BW = 0.46;
    const BZ = -0.12;
    const BD = 0.62;
    const top = 0.85;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.035, top - 0.03, 0.035), BLACK, BX + sx * (BW / 2 - 0.03), (top - 0.03) / 2, BZ + sz * (BD / 2 - 0.03), { outline: false });
    part(g, box(BW - 0.04, 0.02, BD - 0.04), BLACK, BX, 0.18, BZ);
    part(g, rbox(BW, 0.04, BD, 0.01), OAK, BX, top - 0.02, BZ);
    part(g, ball(0.17), '#b89b6e', BX, 0.31, BZ - 0.05).scale.set(1.1, 0.75, 0.9);
    label(g, 'BRAZIL', 0.12, 0.04, BX, 0.33, BZ + 0.1, '#b89b6e', '#5d4037');
    // The bulk grinder: its tall body, the burr's dial, the hopper of roasted beans, the spout over the bag.
    const KX = 0.32;
    part(g, rbox(0.16, 0.38, 0.24, 0.03), '#cfd2d4', KX, top + 0.19, -0.26);
    part(g, cyl(0.05, 0.05, 0.03, 20), '#37474f', KX - 0.085, top + 0.24, -0.26, { rz: Math.PI / 2 });
    part(g, box(0.004, 0.04, 0.008), '#e53935', KX - 0.102, top + 0.255, -0.26, { outline: false });
    part(g, rbox(0.06, 0.05, 0.12, 0.01), '#b0b4b6', KX, top + 0.24, -0.12, { rx: 0.35 });
    glassPart(g, cyl(0.09, 0.05, 0.2, 18), KX, top + 0.48, -0.26);
    part(g, cyl(0.075, 0.05, 0.13, 16), COFFEE, KX, top + 0.44, -0.26, { outline: false });
    part(g, cyl(0.092, 0.092, 0.02, 18), '#37474f', KX, top + 0.59, -0.26);
    // The kraft bag under the spout, filling as it's ground into.
    const BAGZ = -0.03;
    part(g, rbox(0.11, 0.14, 0.07, 0.01), KRAFT, KX, top + 0.07, BAGZ);
    label(g, '하우스 블렌드 1kg', 0.09, 0.03, KX, top + 0.06, BAGZ + 0.036, KRAFT, '#3e2723');
    const fillBag = part(g, box(0.1, 0.004, 0.06), GROUNDS, KX, top + 0.1, BAGZ, { outline: false });
    const fall = stream(g, GROUNDS, 0.007);
    const bagTop = marker(g, KX, top + 0.14, BAGZ);
    // The cupping bowls, their crusts, a glass of spoons, a gooseneck kettle.
    for (let i = 0; i < 3; i++) {
      const x = 0.1 + i * 0.12;
      part(g, cyl(0.045, 0.035, 0.05, 18), WHITE, x, top + 0.025, 0.12);
      part(g, cyl(0.042, 0.042, 0.004, 18), i === 1 ? '#7a4a24' : '#5b3518', x, top + 0.046, 0.12, { outline: false });
      label(g, ['A', 'B', 'C'][i], 0.03, 0.02, x, top + 0.02, 0.166, '#ffffff', '#3e2723');
    }
    glassPart(g, cyl(0.03, 0.026, 0.09, 14), 0.44, top + 0.045, 0.1);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(0.44, top + 0.02, 0.1), new THREE.Vector3(0.43 + i * 0.01, top + 0.15, 0.09 + i * 0.008), 0.004, CHROME);
    part(g, cyl(0.05, 0.06, 0.12, 18), CHROME, 0.1, top + 0.06, -0.18);
    rod(g, new THREE.Vector3(0.14, top + 0.04, -0.18), new THREE.Vector3(0.2, top + 0.18, -0.16), 0.006, CHROME);
    part(g, ring(0.035, 0.006, Math.PI), BLACK, 0.06, top + 0.08, -0.18, { rz: Math.PI / 2, outline: false });
    const cupWork = marker(g, 0.22, top + 0.05, 0.12);
    const grind = stoodAt(g, KX, 0.45, 'grind', bagTop);
    const cup = stoodAt(g, 0.2, 0.45, 'taste', cupWork);
    out.spots = { '*': grind, grindBeans: grind, cupping: cup };
    out.work = bagTop;
    out.animate = (t) => {
      arms.rotation.y = -t * 1.4;
      (sight.material as THREE.MeshBasicMaterial).color.set(Math.sin(t * 5) > -0.3 ? '#ff8a3d' : '#e8642a');
      const grinding = posed(grind, t);
      const k = grinding ? (t * 0.08) % 1 : 0.4;
      fillBag.position.y = top + 0.02 + 0.1 * k;
      fall(grinding ? new THREE.Vector3(KX, top + 0.21, -0.07) : null, new THREE.Vector3(KX, top + 0.03 + 0.1 * k, BAGZ));
    };
  },

  /**
   * The back bar under the menu: a quartz counter on a walnut cabinet with an ice machine under its
   * left half, the ice well cut in the top with its scoop, the syrup pumps (바닐라, 헤이즐넛, 카라멜,
   * 시럽) along the back, a blender spinning a smoothie while used, towers of take-out cups and lids,
   * a cold brew tower dripping into its carafe; and over it, on the wall, the café's menu board, lit:
   * coffee, non-coffee and desserts in won. Iced drinks are shaken up stood at it.
   */
  baristaBackBar(g, W, _D, _c, _def, _ctx, out) {
    const TOP = 0.9;
    const zf = 0.18;
    const zb = -0.48;
    const zc = (zf + zb) / 2;
    const d = zf - zb;
    const w = W - 0.04;
    part(g, box(w - 0.04, 0.08, d - 0.06), BLACK, 0, 0.04, zc - 0.02);
    part(g, rbox(w, TOP - 0.11, d, 0.01), WALNUT, 0, 0.08 + (TOP - 0.11) / 2, zc);
    // The ice machine under the left half: its steel door and vent.
    part(g, rbox(0.62, 0.66, 0.02, 0.01), STEEL, -0.5, 0.43, zf + 0.008);
    for (let i = 0; i < 6; i++) part(g, box(0.4, 0.012, 0.006), STEEL_D, -0.5, 0.18 + i * 0.025, zf + 0.02, { outline: false });
    part(g, box(0.3, 0.02, 0.02), CHROME, -0.5, 0.68, zf + 0.025, { outline: false });
    label(g, 'ICE', 0.08, 0.035, -0.5, 0.58, zf + 0.02, '#cfd8dc', '#1565c0');
    // Doors under the right half.
    for (const x of [0.25, 0.65]) {
      part(g, rbox(0.36, 0.66, 0.014, 0.006), shade(WALNUT, 1.18), x, 0.43, zf + 0.007);
      part(g, box(0.012, 0.16, 0.02), BRASS, x + (x < 0.4 ? 0.15 : -0.15), 0.55, zf + 0.02, { outline: false });
    }
    part(g, rbox(w + 0.02, 0.03, d + 0.02, 0.008), QUARTZ, 0, TOP - 0.015, zc);
    // The ice well and its scoop.
    part(g, box(0.4, 0.012, 0.26), STEEL_D, -0.5, TOP + 0.002, -0.05, { outline: false });
    for (let i = 0; i < 22; i++) part(g, box(0.035, 0.03, 0.035), '#e6f6fb', -0.66 + (i % 8) * 0.045, TOP + 0.012, -0.14 + Math.floor(i / 8) * 0.07, { ry: i * 0.7, outline: false });
    part(g, rbox(0.08, 0.05, 0.12, 0.01), STEEL_L, -0.38, TOP + 0.04, -0.03, { rx: 0.2 });
    rod(g, new THREE.Vector3(-0.38, TOP + 0.05, 0.03), new THREE.Vector3(-0.38, TOP + 0.07, 0.1), 0.008, BLACK);
    // The syrup pumps along the back.
    const syrups: Array<[string, string]> = [['바닐라', '#f3e5ab'], ['헤이즐넛', '#8d5a2b'], ['카라멜', '#c77d2a'], ['시럽', '#f5f5f5']];
    syrups.forEach(([name, col], i) => {
      const x = -0.75 + i * 0.13;
      glassPart(g, cyl(0.035, 0.035, 0.24, 14), x, TOP + 0.12, -0.36);
      part(g, cyl(0.032, 0.032, 0.19, 14), col, x, TOP + 0.095, -0.36, { outline: false });
      part(g, cyl(0.02, 0.026, 0.04, 12), BLACK, x, TOP + 0.26, -0.36);
      part(g, cyl(0.006, 0.006, 0.06, 6), BLACK, x, TOP + 0.31, -0.36, { outline: false });
      part(g, box(0.06, 0.012, 0.016), BLACK, x, TOP + 0.34, -0.33, { outline: false });
      label(g, name, 0.07, 0.03, x, TOP + 0.12, -0.322, '#ffffff', '#4e342e');
    });
    // The blender: its base, the jar, the smoothie in it spinning.
    const bx = 0.05;
    part(g, rbox(0.15, 0.12, 0.16, 0.03), BLACK, bx, TOP + 0.06, -0.25);
    part(g, box(0.06, 0.02, 0.004), '#69f0ae', bx, TOP + 0.08, -0.169, { outline: false, material: glow('#69f0ae') });
    glassPart(g, cyl(0.07, 0.05, 0.22, 16), bx, TOP + 0.23, -0.25);
    const smoothie = new THREE.Group();
    smoothie.position.set(bx, TOP + 0.18, -0.25);
    g.add(smoothie);
    part(smoothie, cyl(0.055, 0.048, 0.1, 16), '#f48fb1', 0, 0, 0, { outline: false });
    part(smoothie, box(0.03, 0.03, 0.03), '#e91e63', 0.02, 0.04, 0, { outline: false });
    part(g, cyl(0.072, 0.072, 0.03, 16), BLACK, bx, TOP + 0.355, -0.25);
    // Towers of take-out cups and lids; a cold brew tower.
    for (let i = 0; i < 3; i++) {
      const x = 0.27 + i * 0.1;
      const n = 6 + i;
      for (let j = 0; j < n; j++) part(g, cyl(0.04, 0.03, 0.03, 14), i === 2 ? '#e6f6fb' : WHITE, x, TOP + 0.015 + j * 0.022, -0.32, { outline: j === n - 1 });
    }
    part(g, rbox(0.12, 0.12, 0.12, 0.01), '#cfd8dc', 0.38, TOP + 0.06, -0.12);
    for (let j = 0; j < 4; j++) part(g, cyl(0.045, 0.045, 0.012, 14), BLACK, 0.38, TOP + 0.126 + j * 0.013, -0.12, { outline: false });
    const cbx = 0.75;
    const cbz = -0.3;
    for (const sx of [-1, 1]) part(g, box(0.03, 0.85, 0.03), WALNUT, cbx + sx * 0.1, TOP + 0.425, cbz);
    part(g, box(0.23, 0.03, 0.12), WALNUT, cbx, TOP + 0.83, cbz);
    part(g, box(0.23, 0.03, 0.12), WALNUT, cbx, TOP + 0.45, cbz);
    glassPart(g, ball(0.075), cbx, TOP + 0.76, cbz);
    part(g, ball(0.06), '#e1f5fe', cbx, TOP + 0.75, cbz, { outline: false });
    glassPart(g, cyl(0.04, 0.04, 0.14, 14), cbx, TOP + 0.55, cbz);
    part(g, cyl(0.035, 0.035, 0.05, 14), COFFEE, cbx, TOP + 0.52, cbz, { outline: false });
    rod(g, new THREE.Vector3(cbx, TOP + 0.48, cbz), new THREE.Vector3(cbx, TOP + 0.24, cbz), 0.004, '#cfd8dc');
    for (let i = 0; i < 4; i++) part(g, ring(0.02, 0.003), '#cfd8dc', cbx, TOP + 0.28 + i * 0.03, cbz, { rx: Math.PI / 2, outline: false });
    glassPart(g, cyl(0.06, 0.07, 0.16, 16), cbx, TOP + 0.08, cbz);
    part(g, cyl(0.06, 0.065, 0.09, 16), '#2b160a', cbx, TOP + 0.045, cbz, { outline: false });
    label(g, '콜드브루', 0.12, 0.035, cbx, TOP + 0.6, cbz + 0.07, '#3e2723', '#ffe0b2');
    // The menu board on the wall over it, lit.
    const board = menuTex('backMenu', 1024, 360, '#1f1b18', [
      ['#COFFEE', '아메리카노|4,500', '카페라떼|5,000', '바닐라라떼|5,500', '카푸치노|5,000', '카라멜 마키아토|5,800', '콜드브루|5,000'],
      ['#NON-COFFEE', '녹차라떼|5,500', '딸기라떼|6,000', '아이스티|4,500', '레몬에이드|5,500', '자몽에이드|5,500', '핫초코|5,000'],
      ['#DESSERT', '치즈케이크|6,500', '티라미수|7,000', '딸기 생크림|6,800', '크루아상|3,800', '마카롱|2,800', 'HOT/ICE 동일'],
    ], '#ffcc80');
    part(g, rbox(w - 0.1, 0.62, 0.04, 0.01), WALNUT, 0, 2.05, zb + 0.02);
    sheet(g, board, w - 0.16, 0.56, 0, 2.05, zb + 0.042);
    part(g, box(w - 0.1, 0.012, 0.02), '#fff3d6', 0, 2.37, zb + 0.06, { outline: false, material: glow('#fff3d6') });
    // Shaken up stood at the counter, a cup at the hands.
    const at = marker(g, -0.3, TOP + 0.1, 0.0);
    const mix = stoodAt(g, -0.3, 0.55, 'shake', at);
    out.spots = { '*': mix };
    out.work = at;
    out.animate = (t) => {
      smoothie.rotation.y = t * 25;
      smoothie.position.y = TOP + 0.18 + 0.006 * Math.sin(t * 40);
    };
  },

  /**
   * The pickup counter: a slatted oak counter with "PICK UP" lit over it on two posts, the screen
   * calling the order number to the room, a chrome bell, a carrier of take-out cups and a latte
   * waiting on a tray, straws, lids and napkins; on the staff side the call pad. The number's called
   * and the drink set across to the customer.
   */
  baristaPickup(g, W, _D, _c, _def, _ctx, out) {
    const TOP = 1.02;
    const zb = -0.42;
    const zf = 0.18;
    const zc = (zb + zf) / 2;
    const w = W - 0.04;
    part(g, box(w - 0.04, 0.06, zf - zb - 0.04), BLACK, 0, 0.03, zc);
    part(g, box(w, TOP - 0.1, 0.03), OAK, 0, 0.06 + (TOP - 0.1) / 2, zb + 0.015);
    for (let x = -w / 2 + 0.05; x < w / 2; x += 0.07) part(g, box(0.04, TOP - 0.14, 0.012), shade(OAK, Math.round(x * 100) % 2 ? 0.92 : 1.06), x, 0.06 + (TOP - 0.1) / 2, zb - 0.006, { outline: false });
    for (const s of [-1, 1]) part(g, box(0.03, TOP - 0.1, zf - zb), WALNUT, s * (w / 2 - 0.015), 0.06 + (TOP - 0.1) / 2, zc);
    part(g, box(w - 0.06, 0.02, zf - zb - 0.04), WALNUT, 0, 0.45, zc);
    for (let i = 0; i < 4; i++) part(g, rbox(0.18, 0.02, 0.14, 0.005), '#6d4c41', 0, 0.47 + i * 0.022, -0.1);
    part(g, rbox(w + 0.04, 0.035, zf - zb + 0.1, 0.01), QUARTZ, 0, TOP - 0.0175, zc);
    const ty = TOP;
    // The PICK UP sign on its posts, lit.
    for (const s of [-1, 1]) part(g, cyl(0.012, 0.012, 0.55, 8), BLACK, s * 0.38, ty + 0.275, -0.36, { outline: false });
    part(g, rbox(0.8, 0.14, 0.04, 0.01), '#2f2a26', 0, ty + 0.55, -0.36);
    label(g, 'PICK UP · 픽업', 0.7, 0.1, 0, ty + 0.55, -0.382, '#2f2a26', '#ffe9b0', Math.PI);
    label(g, 'PICK UP · 픽업', 0.7, 0.1, 0, ty + 0.55, -0.338, '#2f2a26', '#ffe9b0');
    // The number board to the room.
    part(g, rbox(0.3, 0.16, 0.03, 0.01), BLACK, -0.25, ty + 0.2, -0.32, { rx: 0.1 });
    part(g, box(0.03, 0.12, 0.03), BLACK, -0.25, ty + 0.06, -0.3);
    const numTex = (n: number) =>
      painted(`call${n}`, 192, 96, (c) => {
        c.fillStyle = '#0d1a12';
        c.fillRect(0, 0, 192, 96);
        c.fillStyle = '#9ccc65';
        c.font = `bold 18px ${FONT}`;
        c.textAlign = 'center';
        c.fillText('주문하신 음료 나왔습니다', 96, 26, 180);
        c.fillStyle = '#ffeb3b';
        c.font = `bold 52px ${FONT}`;
        c.fillText(String(n).padStart(3, '0'), 96, 82);
      });
    const call = sheet(g, numTex(27), 0.27, 0.135, -0.25, ty + 0.2, -0.337, Math.PI, 0.1);
    // A chrome bell at the customers' edge; straws, lids, napkins.
    part(g, cyl(0.035, 0.04, 0.008, 18), BLACK, 0.12, ty + 0.004, -0.33);
    part(g, ball(0.035), CHROME, 0.12, ty + 0.008, -0.33).scale.set(1, 0.75, 1);
    part(g, cyl(0.006, 0.006, 0.02, 6), CHROME, 0.12, ty + 0.045, -0.33, { outline: false });
    part(g, rbox(0.1, 0.1, 0.08, 0.01), '#eceff1', 0.35, ty + 0.05, -0.2);
    for (let i = 0; i < 9; i++) rod(g, new THREE.Vector3(0.32 + (i % 3) * 0.03, ty + 0.1, -0.22 + Math.floor(i / 3) * 0.02), new THREE.Vector3(0.32 + (i % 3) * 0.03 + 0.005, ty + 0.2, -0.22 + Math.floor(i / 3) * 0.02), 0.003, ['#e53935', '#2e7d32', '#fafafa'][i % 3]);
    part(g, rbox(0.1, 0.06, 0.08, 0.01), WHITE, 0.35, ty + 0.03, 0.0);
    // Drinks waiting on a tray: a carrier of take-outs, a latte.
    part(g, rbox(0.3, 0.015, 0.22, 0.006), '#6d4c41', -0.05, ty + 0.0075, -0.12);
    const carrier = new THREE.Group();
    carrier.position.set(-0.12, ty + 0.015, -0.12);
    g.add(carrier);
    part(carrier, rbox(0.17, 0.03, 0.17, 0.01), KRAFT, 0, 0.015, 0);
    takeout(carrier, -0.04, 0.01, -0.04, 'iced', 0.75);
    takeout(carrier, 0.04, 0.01, -0.04, 'hot', 0.75);
    takeout(carrier, 0.04, 0.01, 0.04, 'latte', 0.75);
    const waiting = latteCup(g);
    waiting.set(1, 1);
    waiting.root.position.set(0.08, ty + 0.015, -0.1);
    // The call pad on the staff side.
    part(g, rbox(0.14, 0.03, 0.1, 0.01), BLACK, -0.25, ty + 0.015, 0.06, { rx: -0.2 });
    for (let i = 0; i < 6; i++) part(g, box(0.025, 0.006, 0.02), '#cfd8dc', -0.29 + (i % 3) * 0.04, ty + 0.034, 0.045 + Math.floor(i / 3) * 0.03, { rx: -0.2, outline: false });
    const pad = marker(g, -0.25, ty + 0.04, 0.06);
    // The drink going across with the hand.
    const handed = new THREE.Group();
    g.add(handed);
    out.inUse = handed;
    takeout(handed, 0, 0, 0, 'iced', 0.85);
    const desk = stoodAt(g, -0.2, 0.48, 'register', pad);
    out.spots = { '*': desk };
    out.work = pad;
    out.animate = (t) => {
      const k = tillRound(t, phaseAt(desk));
      const n = 27 + (Math.floor(t / 8 + phaseAt(desk)) % 40);
      (call.material as THREE.MeshBasicMaterial).map = numTex(n);
      // From the staff side, out across the counter with the hand, and left for the customer.
      const reach = new THREE.Vector3(-0.14, ty, 0.48 - TILL_REACH.ahead);
      const start = new THREE.Vector3(-0.1, ty, 0.08);
      handed.position.copy(start).lerp(reach, k.out);
      handed.position.y = ty + 0.04 * Math.sin(Math.PI * k.out);
      handed.visible = k.u > 0.12;
    };
  },

  /**
   * A cake showcase: a cream refrigerated base, a curved glass front to the customers and sliding
   * doors on the staff side, two lit tiers — a strawberry shortcake, a chocolate cake, a cheesecake
   * whole and in slices, tiramisu squares, a row of macarons — every one priced in won; "CAKE"
   * on its base. Restocked through its door (slid open while used).
   */
  baristaCakeCase(g, W, _D, c, _def, _ctx, out) {
    const w = W - 0.06;
    const zb = -0.38;
    const zf = 0.2;
    const zc = (zb + zf) / 2;
    const base = 0.82;
    const top = 1.36;
    part(g, box(w - 0.04, 0.06, zf - zb - 0.04), BLACK, 0, 0.03, zc);
    part(g, rbox(w, base - 0.06, zf - zb, 0.02), c === '#f5efe6' ? '#f5efe6' : c, 0, 0.06 + (base - 0.06) / 2, zc);
    for (let i = 0; i < 8; i++) part(g, box(0.06, 0.006, 0.005), '#9e9e9e', -w / 2 + 0.2 + i * 0.08, 0.15, zb - 0.002, { outline: false });
    const cakeSign = painted('cakeSign', 256, 64, (cx) => {
      cx.fillStyle = '#f5efe6';
      cx.fillRect(0, 0, 256, 64);
      cx.fillStyle = '#8d4a5a';
      cx.font = `italic bold 30px ${FONT}`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText('CAKE & DESSERT', 128, 34, 240);
    });
    sheet(g, cakeSign, 0.6, 0.15, 0, 0.55, zb - 0.004, Math.PI);
    // The deck, the glass: curved down to the customers, sides, the top; the light under it.
    part(g, box(w - 0.02, 0.02, zf - zb - 0.02), '#fafafa', 0, base + 0.01, zc);
    // A quarter round from the deck at the front up to the top (the cylinder's axis turned along x).
    const R = top - base - 0.02;
    const curve = new THREE.Mesh(shape('cakeGlass', () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, true, Math.PI / 2, Math.PI / 2)), GLASS);
    curve.scale.set(R, w - 0.02, R);
    curve.rotation.z = Math.PI / 2;
    curve.position.set(0, base + 0.02, zb + R);
    g.add(curve);
    glassPart(g, box(w - 0.02, 0.008, zf - zb - R), 0, top, (zb + R + zf) / 2);
    for (const s of [-1, 1]) glassPart(g, box(0.008, top - base, zf - zb - 0.02), s * (w / 2 - 0.01), (base + top) / 2, zc);
    part(g, box(w, 0.02, zf - zb), '#c8b8a6', 0, top + 0.01, zc).scale.set(1, 1, 0.5);
    part(g, box(w - 0.06, 0.01, 0.03), '#fff3d6', 0, top - 0.008, zc, { outline: false, material: glow('#fff3d6') });
    // A glass shelf.
    const sy = base + 0.25;
    glassPart(g, box(w - 0.04, 0.012, 0.3), 0, sy, zc + 0.06);
    for (const s of [-1, 1]) part(g, box(0.015, 0.25, 0.015), CHROME, s * (w / 2 - 0.04), base + 0.13, zc + 0.18, { outline: false });
    // The cakes.
    const cake = (x: number, y: number, z: number, body: string, cream: string, topping: 'berry' | 'choco' | 'cheese') => {
      part(g, cyl(0.09, 0.09, 0.008, 22), '#d4af37', x, y + 0.004, z, { outline: false });
      part(g, cyl(0.075, 0.075, 0.09, 22), cream, x, y + 0.053, z);
      part(g, cyl(0.076, 0.076, 0.015, 22), body, x, y + 0.03, z, { outline: false });
      if (topping === 'berry') for (let i = 0; i < 7; i++) part(g, ball(0.013), '#e53935', x + Math.cos(i * 0.9) * 0.055, y + 0.105, z + Math.sin(i * 0.9) * 0.055, { outline: false });
      if (topping === 'choco') for (let i = 0; i < 6; i++) part(g, box(0.025, 0.012, 0.012), '#2b160a', x + Math.cos(i) * 0.05, y + 0.102, z + Math.sin(i) * 0.05, { ry: i, outline: false });
      if (topping === 'cheese') part(g, cyl(0.075, 0.075, 0.006, 22), '#b5651d', x, y + 0.1, z, { outline: false });
    };
    const slice = (x: number, y: number, z: number, cream: string, layer: string, berry: boolean) => {
      part(g, cyl(0.05, 0.05, 0.006, 16), WHITE, x, y + 0.003, z, { outline: false });
      const wedge = shape('wedge', () => new THREE.CylinderGeometry(0.06, 0.06, 0.07, 10, 1, false, 0, Math.PI / 4));
      part(g, wedge, cream, x - 0.02, y + 0.041, z + 0.02, { ry: Math.PI * 0.62 });
      part(g, box(0.004, 0.012, 0.05), layer, x + 0.005, y + 0.04, z - 0.005, { ry: Math.PI * 0.12, outline: false });
      if (berry) part(g, ball(0.012), '#e53935', x - 0.01, y + 0.085, z, { outline: false });
    };
    const tag = (text: string, x: number, y: number, z: number) => {
      part(g, cyl(0.002, 0.002, 0.05, 4), STEEL_D, x, y + 0.025, z, { outline: false });
      label(g, text, 0.07, 0.03, x, y + 0.05, z - 0.002, '#ffffff', '#8d4a5a', Math.PI, 0.3);
    };
    const lo = base + 0.02;
    cake(-0.62, lo, zc + 0.02, '#fff8e1', '#ffffff', 'berry');
    tag('32,000', -0.62, lo, zb + 0.18);
    cake(-0.3, lo, zc + 0.02, '#3e2723', '#5d4037', 'choco');
    tag('34,000', -0.3, lo, zb + 0.18);
    cake(0.02, lo, zc + 0.02, '#ffe082', '#fff3c4', 'cheese');
    tag('30,000', 0.02, lo, zb + 0.18);
    for (let i = 0; i < 4; i++) {
      const x = 0.28 + (i % 2) * 0.1;
      const z = zc - 0.02 + Math.floor(i / 2) * 0.1;
      part(g, rbox(0.08, 0.06, 0.08, 0.005), '#d7ccc8', x, lo + 0.03, z);
      part(g, box(0.081, 0.008, 0.081), '#4e342e', x, lo + 0.04, z, { outline: false });
      part(g, box(0.081, 0.004, 0.081), '#6d4c41', x, lo + 0.062, z, { outline: false });
    }
    tag('7,000', 0.33, lo, zb + 0.18);
    for (let i = 0; i < 6; i++) {
      const x = 0.56 + (i % 3) * 0.08;
      const z = zc + Math.floor(i / 3) * 0.08;
      const col = ['#f8bbd0', '#c5e1a5', '#d1c4e9', '#ffe082', '#b3e5fc', '#ffccbc'][i];
      part(g, ball(0.024), col, x, lo + 0.018, z, { outline: false }).scale.set(1, 0.4, 1);
      part(g, cyl(0.02, 0.02, 0.008, 12), '#fff8e1', x, lo + 0.028, z, { outline: false });
      part(g, ball(0.024), col, x, lo + 0.038, z, { outline: false }).scale.set(1, 0.4, 1);
    }
    tag('2,800', 0.64, lo, zb + 0.18);
    // The slices on the shelf.
    const su = sy + 0.006;
    const slices: Array<[string, string, boolean, string]> = [['#ffffff', '#e57373', true, '6,800'], ['#5d4037', '#2b160a', false, '6,500'], ['#fff3c4', '#b5651d', false, '6,500'], ['#ffffff', '#e57373', true, '6,800'], ['#d7ccc8', '#4e342e', false, '7,000']];
    slices.forEach(([cr, ly, b, price], i) => {
      const x = -0.7 + i * 0.32;
      slice(x, su, zc + 0.08, cr, ly, b);
      if (i % 2 === 0) slice(x + 0.12, su, zc + 0.1, cr, ly, b);
      tag(price, x + 0.05, su, zc - 0.08);
    });
    // The staff side: sliding doors, one slid open while it's restocked.
    const door = new THREE.Group();
    g.add(door);
    glassPart(door, box(w / 2 - 0.02, top - base - 0.04, 0.008), -w / 4, (base + top) / 2, zf - 0.01);
    part(door, box(0.012, 0.18, 0.02), CHROME, -0.08, (base + top) / 2, zf, { outline: false });
    glassPart(g, box(w / 2 - 0.02, top - base - 0.04, 0.008), w / 4, (base + top) / 2, zf - 0.025);
    part(g, box(0.012, 0.18, 0.02), CHROME, 0.08, (base + top) / 2, zf - 0.015, { outline: false });
    // A slice on its plate going in, with tongs, while it's stocked.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, cyl(0.05, 0.05, 0.006, 16), WHITE, -0.42, base + 0.03, zf - 0.08, { outline: false });
    part(use, shape('wedge', () => new THREE.CylinderGeometry(0.06, 0.06, 0.07, 10, 1, false, 0, Math.PI / 4)), '#ffffff', -0.44, base + 0.068, zf - 0.06, { ry: Math.PI * 0.62 });
    part(use, ball(0.012), '#e53935', -0.43, base + 0.112, zf - 0.08, { outline: false });
    const reach = marker(g, -0.42, base + 0.12, zf - 0.08);
    const stock = stoodAt(g, -0.42, 0.48, 'rummage', reach);
    out.spots = { '*': stock };
    out.work = reach;
    out.animate = (t) => {
      door.position.x = posed(stock, t) ? 0.42 : 0;
    };
  },

  /**
   * The self bar: a walnut cabinet with the tray return (퇴식구) let into its front — trays and cups
   * left in it — and the bins under ("얼음·음료는 여기에"); on the top a water dispenser with its paper
   * cups, the straws, the napkins, sugar and syrup sticks, the lids, a "SELF BAR" sign. Wiped down
   * and tidied.
   */
  baristaSelfBar(g, W, _D, _c, _def, _ctx, out) {
    const TOP = 0.92;
    const zb = -0.4;
    const zf = 0.22;
    const zc = (zb + zf) / 2;
    const w = W - 0.08;
    part(g, rbox(w, TOP - 0.03, zf - zb, 0.01), WALNUT, 0, (TOP - 0.03) / 2, zc);
    part(g, rbox(w + 0.02, 0.03, zf - zb + 0.02, 0.008), QUARTZ, 0, TOP - 0.015, zc);
    // The tray return: a dark opening with a tray and cups in it.
    part(g, box(0.6, 0.24, 0.01), '#1a1412', 0, 0.68, zf + 0.002, { outline: false });
    part(g, box(0.56, 0.012, 0.3), '#6d4c41', 0, 0.58, zf - 0.13, { outline: false });
    takeout(g, -0.1, 0.586, zf - 0.08, 'iced', 0.7);
    part(g, cyl(0.04, 0.03, 0.06, 14), WHITE, 0.12, 0.616, zf - 0.08);
    label(g, '퇴식구', 0.14, 0.04, 0, 0.83, zf + 0.006, '#3e2723', '#ffe0b2');
    // The bins below: ice and drinks, cups, rubbish.
    const bins: Array<[string, string]> = [['얼음·음료', '#4fc3f7'], ['컵', '#81c784'], ['일반', '#bdbdbd']];
    bins.forEach(([name, col], i) => {
      const x = -0.27 + i * 0.27;
      part(g, rbox(0.24, 0.4, 0.012, 0.006), shade(WALNUT, 1.15), x, 0.26, zf + 0.007);
      part(g, box(0.14, 0.03, 0.006), '#151010', x, 0.4, zf + 0.015, { outline: false });
      label(g, name, 0.14, 0.035, x, 0.33, zf + 0.016, col, '#1a1a1a');
    });
    // On top: the water dispenser and its cups, straws, napkins, sticks, lids.
    const ty = TOP;
    glassPart(g, cyl(0.08, 0.08, 0.26, 18), -0.28, ty + 0.18, -0.18);
    part(g, cyl(0.075, 0.075, 0.16, 18), '#e1f5fe', -0.28, ty + 0.14, -0.18, { outline: false });
    for (let i = 0; i < 5; i++) part(g, DISC, '#fff59d', -0.28 + Math.cos(i * 1.4) * 0.04, ty + 0.21, -0.18 + Math.sin(i * 1.4) * 0.04, { rx: -Math.PI / 2, outline: false }).scale.setScalar(0.018);
    part(g, rbox(0.18, 0.05, 0.18, 0.01), STEEL, -0.28, ty + 0.025, -0.18);
    part(g, box(0.02, 0.02, 0.05), CHROME, -0.28, ty + 0.07, -0.08, { outline: false });
    for (let j = 0; j < 8; j++) part(g, cyl(0.03, 0.022, 0.03, 12), WHITE, -0.1, ty + 0.015 + j * 0.016, -0.25, { outline: j === 7 });
    part(g, rbox(0.12, 0.08, 0.06, 0.01), '#eceff1', 0.08, ty + 0.04, -0.22);
    for (let i = 0; i < 8; i++) rod(g, new THREE.Vector3(0.05 + (i % 4) * 0.02, ty + 0.08, -0.23 + Math.floor(i / 4) * 0.02), new THREE.Vector3(0.05 + (i % 4) * 0.02 + 0.004, ty + 0.2, -0.23 + Math.floor(i / 4) * 0.02), 0.003, ['#2e7d32', '#e53935', '#fafafa', '#212121'][i % 4]);
    part(g, rbox(0.14, 0.09, 0.09, 0.01), BLACK, 0.27, ty + 0.045, -0.2);
    part(g, box(0.12, 0.05, 0.004), WHITE, 0.27, ty + 0.1, -0.2, { outline: false });
    part(g, cyl(0.04, 0.035, 0.08, 12), '#d7ccc8', 0.08, ty + 0.04, -0.05);
    for (let i = 0; i < 6; i++) part(g, box(0.008, 0.1, 0.012), i % 2 ? '#fff8e1' : '#a1887f', 0.065 + (i % 3) * 0.015, ty + 0.1, -0.06 + Math.floor(i / 3) * 0.02, { outline: false });
    for (let j = 0; j < 5; j++) part(g, cyl(0.045, 0.045, 0.012, 14), j % 2 ? BLACK : WHITE, 0.27, ty + 0.006 + j * 0.013, 0.02, { outline: false });
    part(g, rbox(0.3, 0.1, 0.02, 0.01), '#2f2a26', -0.02, ty + 0.38, -0.36);
    label(g, 'SELF BAR · 셀프바', 0.28, 0.07, -0.02, ty + 0.38, -0.348, '#2f2a26', '#ffe9b0');
    for (const s of [-1, 1]) part(g, cyl(0.006, 0.006, 0.34, 6), BLACK, -0.02 + s * 0.12, ty + 0.17, -0.37, { outline: false });
    // Wiped down in front of the bins.
    const at = marker(g, 0.05, ty + 0.01, 0.05);
    const wipe = stoodAt(g, 0.05, 0.55, 'scrub', at);
    out.spots = { '*': wipe };
    out.work = at;
  },

  /** An A-board (입간판): a chalkboard both ways on a wooden frame — today's coffee, the prices, a set offer. */
  baristaSign(g, _W, _D, _c, _def, _ctx, _out) {
    const h = 1.05;
    const tex = menuTex('aBoard', 256, 384, '#263238', [['#오늘의 커피', '에티오피아|', '아메리카노|4,500', '카페라떼|5,000', '', '#디저트 세트', '케이크+음료|-1,000', '☕ 어서 오세요']], '#ffcc80', '#f5f5f5');
    // Two leaves hinged at the top, their feet spread.
    const lean = 0.2;
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.position.set(0, h * Math.cos(lean), 0);
      leaf.rotation.x = -s * lean;
      g.add(leaf);
      part(leaf, box(0.56, h, 0.03), OAK, 0, -h / 2, s * 0.016);
      part(leaf, box(0.48, h - 0.1, 0.008), '#263238', 0, -h / 2 - 0.01, s * 0.034, { outline: false });
      sheet(leaf, tex, 0.46, 0.69, 0, -h / 2 - 0.01, s * 0.039, s > 0 ? 0 : Math.PI);
    }
    part(g, box(0.5, 0.012, 0.012), BLACK, 0, 0.35, 0, { outline: false });
  },
};
