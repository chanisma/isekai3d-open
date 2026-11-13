import * as THREE from 'three';
import { diceKnife, ladleStir, panToss, toolPhase } from '../activity';
import { WHITE, marker, rod, screenMesh, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, gradient, part, rbox } from '../toon';
import { kitchenClose } from './handWorkProps';

/**
 * The restaurant kitchen drawn as itself (2026-10-26 workplace pipeline, at the user's request): the
 * line's ranges under one stainless hood, a pan shaken and tossed on the flame; the prep table with
 * its board, the mise en place rail and the sauce to taste; the pass with its heat lamps, tickets on
 * the rail and plates going out — and what the kitchen was missing: the stock pot on its low range,
 * the dish pit, the dry store's shelving and the host's stand in the dining room. The pan, the knife
 * and the stock ladle move in step with the hand on them (activity.ts toolPhase).
 */

const STEEL = '#c3cad0';
const STEEL_L = '#d6dce0';
const STEEL_D = '#9aa3ab';
const CHROME = '#e3e7ea';
const BLACK = '#2b2b30';
const IRON = '#3a3a40';
const GOLD = '#c9a227';

/** Lit parts (a hood's lamp, a display): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

/** A flame or heat lamp the lot lights while it's used (out.glow): its own material, so one burner lights alone. */
function ownGlow(g: THREE.Object3D, geom: THREE.BufferGeometry, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: '#3a2a20', side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
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
/** A sauté pan's body, hollow: the bottom, the flared wall and its inside. */
const panGeom = shape('pan', () =>
  new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.105, 0), new THREE.Vector2(0.135, 0.05), new THREE.Vector2(0.128, 0.05), new THREE.Vector2(0.1, 0.007), new THREE.Vector2(0, 0.007)], 28),
);
const PAN = new THREE.MeshToonMaterial({ color: '#3f3f46', gradientMap: gradient, side: THREE.DoubleSide });
const WATER = new THREE.MeshToonMaterial({ color: '#b3e5fc', gradientMap: gradient, transparent: true, opacity: 0.55, depthWrite: false });

/** Words on a plate (a tag, a sign, a label on a tub), painted once a text. */
const labels = new Map<string, THREE.Texture>();
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const key = `${text}|${bg}|${fg}|${(w / h).toFixed(1)}`;
  let t = labels.get(key);
  if (!t) {
    const ch = 64;
    const cw = Math.round((ch * w) / h / 16) * 16 || 64;
    t = canvasTexture(cw, ch, (c) => {
      c.fillStyle = bg;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = fg;
      c.font = `bold ${Math.round(ch * 0.6)}px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, cw / 2, ch * 0.54, cw * 0.92);
    });
    labels.set(key, t);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}

/** An order ticket: the table, the time and the dishes, hand-ticked, on a strip of till paper. */
function ticket(g: THREE.Object3D, lines: string[], x: number, y: number, z: number, rz: number, rx = 0) {
  const key = `ticket|${lines.join('/')}`;
  let t = labels.get(key);
  if (!t) {
    t = canvasTexture(96, 144, (c) => {
      c.fillStyle = '#fffdf6';
      c.fillRect(0, 0, 96, 144);
      c.fillStyle = '#222';
      c.font = 'bold 26px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
      c.textAlign = 'left';
      c.fillText(lines[0], 8, 30);
      c.fillRect(8, 40, 80, 2);
      c.font = 'bold 19px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
      lines.slice(1).forEach((l, i) => c.fillText(l, 8, 66 + i * 24, 82));
      c.fillStyle = '#c62828';
      c.fillRect(64, 8, 24, 6);
    });
    labels.set(key, t);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.135), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  g.add(m);
}

/** Bullet feet under a stainless piece. */
function feet(g: THREE.Object3D, xs: number[], zs: number[], h = 0.1) {
  for (const x of xs) for (const z of zs) part(g, cyl(0.022, 0.03, h, 10), CHROME, x, h / 2, z, { outline: false });
}

/** Steam rising off something hot while it's used: puffs going up, growing and fading. */
function steam(g: THREE.Object3D, x: number, y: number, z: number, n = 4, spread = 0.06): (t: number) => void {
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
      m.position.set(x + Math.sin(i * 2.3 + t * 0.7) * spread * (0.4 + k), y + k * 0.5, z + Math.cos(i * 1.7) * spread * 0.6);
      m.scale.setScalar(0.5 + 1.3 * k);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.32 * Math.sin(Math.PI * k);
    });
}

/**
 * The line's hood and the stainless wall behind it, the same on every unit so a row of ranges
 * shares one long hood: the backsplash up to it, its baffle filters and the lamp along its lip.
 */
function lineWall(g: THREE.Group, W: number, zb: number, from: number) {
  part(g, box(W, 1.95 - from, 0.02), STEEL_L, 0, (1.95 + from) / 2, zb + 0.01);
  part(g, box(W, 0.45, 0.6), STEEL, 0, 2.175, zb + 0.3);
  part(g, box(W, 0.05, 0.03), STEEL_D, 0, 1.97, zb + 0.6);
  part(g, box(W - 0.04, 0.01, 0.46), '#5f6670', 0, 1.948, zb + 0.27, { outline: false });
  for (let i = 0; i < 6; i++) part(g, box((W - 0.12) / 6 - 0.02, 0.012, 0.4), '#80888f', -W / 2 + 0.06 + ((W - 0.12) / 6) * (i + 0.5), 1.94, zb + 0.27, { outline: false });
  part(g, box(W - 0.1, 0.012, 0.035), '#fff3d6', 0, 1.942, zb + 0.54, { outline: false, material: glow('#fff3d6') });
}

/** A squeeze bottle: its body, its nozzle. */
function squeeze(g: THREE.Object3D, x: number, y: number, z: number, color: string, h = 0.14) {
  part(g, cyl(0.026, 0.028, h, 12), color, x, y + h / 2, z);
  part(g, cyl(0.004, 0.014, 0.045, 8), shade(color, 0.8), x, y + h + 0.022, z, { outline: false });
}

/** A side towel, folded or hung: white with the blue stripe. */
function towel(g: THREE.Object3D, w: number, d: number, x: number, y: number, z: number, ry = 0) {
  part(g, rbox(w, 0.018, d, 0.008), WHITE, x, y + 0.009, z, { ry });
  part(g, box(w + 0.002, 0.004, 0.014), '#1e88e5', x, y + 0.016, z + (d / 2 - 0.025) * Math.cos(ry), { ry, outline: false });
}

/** A sauté pan in its own frame: the handle's grip at the origin, the pan out along -z. Returns the food's group. */
function sautePan(g: THREE.Object3D, food: boolean): THREE.Group {
  const body = new THREE.Group();
  body.position.set(0, -0.08, -0.3);
  g.add(body);
  const pan = new THREE.Mesh(panGeom, PAN);
  pan.castShadow = pan.receiveShadow = true;
  body.add(pan);
  part(body, ring(0.131, 0.006), '#26262b', 0, 0.05, 0, { rx: Math.PI / 2, outline: false });
  rod(g, new THREE.Vector3(0, -0.04, -0.17), new THREE.Vector3(0, -0.012, -0.06), 0.009, STEEL_D);
  rod(g, new THREE.Vector3(0, -0.014, -0.07), new THREE.Vector3(0, 0.008, 0.04), 0.014, BLACK);
  const bits = new THREE.Group();
  bits.position.y = 0.012;
  body.add(bits);
  if (food) {
    // A stir-fry: shrimp, broccoli, red pepper, onion, a glaze of sauce under it.
    part(bits, cyl(0.098, 0.098, 0.004, 22), '#a0521d', 0, 0, 0, { outline: false });
    const at: Array<[number, number]> = [[-0.05, -0.03], [0.04, 0.05], [0.06, -0.04], [-0.02, 0.06], [0.0, 0.0], [-0.07, 0.03], [0.03, -0.07], [0.08, 0.01], [-0.04, -0.07]];
    at.forEach(([x, z], i) => {
      const k = i % 4;
      if (k === 0) part(bits, ring(0.022, 0.009, Math.PI * 1.3), '#ff8a65', x, 0.012, z, { rx: Math.PI / 2, rz: i, outline: false });
      else if (k === 1) part(bits, ball(0.02), '#558b2f', x, 0.016, z, { outline: false });
      else if (k === 2) part(bits, box(0.035, 0.008, 0.014), '#e53935', x, 0.008, z, { ry: i, outline: false });
      else part(bits, box(0.04, 0.006, 0.01), '#f3ecd2', x, 0.008, z, { ry: i * 0.8, outline: false });
    });
  } else part(bits, cyl(0.09, 0.09, 0.002, 20), '#6b5b3e', 0, -0.004, 0, { outline: false });
  return bits;
}

/** A dweller's mark in the world (for the beat a tool keeps with the hand). */
const tmp = new THREE.Vector3();
const phaseAt = (s: Spot) => toolPhase(s.at.getWorldPosition(tmp));

/** A plate of food: a shallow white plate and what's on it, `kind` the dish. */
function dish(g: THREE.Object3D, x: number, y: number, z: number, kind: 'pasta' | 'steak' | 'bowl') {
  if (kind === 'bowl') {
    // A hot stone bowl of bibimbap on its wooden tray.
    part(g, rbox(0.24, 0.02, 0.24, 0.01), '#8d6e63', x, y + 0.01, z);
    part(g, cyl(0.1, 0.075, 0.08, 20), '#37373d', x, y + 0.06, z);
    const t = y + 0.101;
    const parts: Array<[string, number]> = [['#f9a825', 0], ['#2e7d32', 1], ['#d84315', 2], ['#6d4c41', 3], ['#fff8e1', 4], ['#7cb342', 5]];
    for (const [c, i] of parts) {
      const a = (i / 6) * Math.PI * 2;
      part(g, cyl(0.04, 0.04, 0.008, 6), c, x + Math.cos(a) * 0.05, t, z + Math.sin(a) * 0.05, { ry: a, outline: false }).scale.set(1, 1, 0.7);
    }
    part(g, ball(0.03), '#ffffff', x, t + 0.006, z, { outline: false }).scale.set(1, 0.35, 1);
    part(g, ball(0.014), '#ffa000', x, t + 0.014, z, { outline: false });
    return;
  }
  part(g, cyl(0.14, 0.12, 0.018, 28), WHITE, x, y + 0.009, z);
  part(g, cyl(0.095, 0.095, 0.002, 24), '#f1eee6', x, y + 0.019, z, { outline: false });
  const t = y + 0.02;
  if (kind === 'pasta') {
    part(g, ring(0.07, 0.006, Math.PI * 1.1), '#b23a1d', x, t + 0.001, z, { rx: Math.PI / 2, rz: 0.6, outline: false }).scale.set(1, 1, 0.4);
    for (let i = 0; i < 3; i++) part(g, ring(0.034 - i * 0.009, 0.011), '#f2d27a', x, t + 0.012 + i * 0.012, z, { rx: Math.PI / 2, outline: false });
    part(g, ring(0.02, 0.008, Math.PI * 1.3), '#ff8a65', x + 0.04, t + 0.03, z - 0.01, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 3; i++) part(g, box(0.02, 0.003, 0.012), '#43a047', x - 0.02 + i * 0.02, t + 0.05, z + 0.01 - i * 0.01, { ry: i, outline: false });
  } else {
    part(g, rbox(0.11, 0.035, 0.07, 0.012), '#6d3b1f', x - 0.02, t + 0.018, z, { ry: 0.3 });
    for (let i = 0; i < 4; i++) part(g, box(0.004, 0.002, 0.07), '#3e2010', x - 0.05 + i * 0.022, t + 0.036, z, { ry: 0.3, outline: false });
    for (let i = 0; i < 3; i++) part(g, ball(0.02), '#e8b84a', x + 0.06, t + 0.016, z - 0.04 + i * 0.035, { outline: false });
    part(g, ring(0.045, 0.006, Math.PI), '#4e2a12', x, t + 0.002, z + 0.04, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 4; i++) part(g, ball(0.012), '#66bb6a', x + 0.02 + (i % 2) * 0.02, t + 0.01, z + 0.06 - Math.floor(i / 2) * 0.02, { outline: false });
  }
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * A commercial range on the line: stainless, on bullet feet, the oven under it with its window and
   * a side towel over the bar, red-ticked knobs on the front rail; two burners under cast-iron
   * grates — a sauté pan on the front one, a pot of sauce simmering at the back — the stainless
   * wall behind with a shelf of squeeze bottles, salt and oil, the ladle, tongs and spider on the
   * rail under it, and the hood over the line. Cooking, the flame comes up and the cook shakes the
   * pan and tosses it, the food jumping in it, steam off it.
   */
  lineStove(g, W, _D, _c, _def, _ctx, out) {
    const zf = 0.33;
    const zb = -0.47;
    const zc = (zf + zb) / 2;
    const d = zf - zb;
    feet(g, [-(W / 2 - 0.08), W / 2 - 0.08], [zf - 0.08, zb + 0.08]);
    part(g, box(W - 0.04, 0.7, d), STEEL, 0, 0.45, zc);
    part(g, box(W - 0.06, 0.06, 0.01), BLACK, 0, 0.13, zf + 0.005, { outline: false });
    // The oven: door, window, the bar with a towel over it.
    part(g, rbox(W - 0.12, 0.52, 0.03, 0.01), STEEL_L, 0, 0.44, zf + 0.015);
    part(g, box(0.5, 0.16, 0.006), '#262b33', 0, 0.45, zf + 0.032, { outline: false });
    part(g, box(0.46, 0.02, 0.007), '#4a5260', 0, 0.5, zf + 0.034, { outline: false });
    rod(g, new THREE.Vector3(-0.36, 0.66, zf + 0.075), new THREE.Vector3(0.36, 0.66, zf + 0.075), 0.012, CHROME);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.34, 0.66, zf + 0.03), new THREE.Vector3(sx * 0.34, 0.66, zf + 0.075), 0.008, CHROME);
    part(g, box(0.17, 0.012, 0.05), WHITE, 0.18, 0.672, zf + 0.075);
    part(g, box(0.17, 0.27, 0.012), WHITE, 0.18, 0.535, zf + 0.098);
    for (const y of [0.47, 0.5]) part(g, box(0.171, 0.012, 0.004), '#1e88e5', 0.18, y, zf + 0.105, { outline: false });
    // The front rail and its knobs.
    part(g, box(W - 0.04, 0.09, 0.08), STEEL_D, 0, 0.84, zf);
    for (const x of [-0.33, -0.11, 0.11, 0.33]) {
      part(g, cyl(0.026, 0.029, 0.035, 14), BLACK, x, 0.84, zf + 0.056, { rx: Math.PI / 2 });
      part(g, box(0.006, 0.02, 0.004), '#e53935', x, 0.852, zf + 0.075, { outline: false });
    }
    // The top and its two burners under their grates.
    part(g, box(W - 0.04, 0.02, d), '#8a939b', 0, 0.89, zc);
    const burner = (x: number, z: number) => {
      part(g, cyl(0.06, 0.07, 0.02, 16), IRON, x, 0.905, z, { outline: false });
      for (const s of [-1, 1]) {
        part(g, box(0.36, 0.02, 0.02), IRON, x, 0.92, z + s * 0.17);
        part(g, box(0.02, 0.02, 0.36), IRON, x + s * 0.17, 0.92, z);
        part(g, box(0.11, 0.018, 0.018), IRON, x + s * 0.115, 0.92, z, { outline: false });
        part(g, box(0.018, 0.018, 0.11), IRON, x, 0.92, z + s * 0.115, { outline: false });
      }
    };
    const px = -0.22;
    const pz = 0.06;
    burner(px, pz);
    burner(0.22, -0.2);
    out.glow = ownGlow(g, new THREE.CylinderGeometry(0.1, 0.065, 0.05, 20, 1, true), px, 0.935, pz);
    // The back pot: sauce simmering, a ladle in it, a blue flame under.
    part(g, ring(0.075, 0.008), '#64b5f6', 0.22, 0.918, -0.2, { rx: Math.PI / 2, outline: false, material: glow('#64b5f6') });
    part(g, cyl(0.11, 0.105, 0.15, 22), STEEL, 0.22, 1.005, -0.2);
    part(g, cyl(0.1, 0.1, 0.004, 22), '#b23a1d', 0.22, 1.082, -0.2, { outline: false });
    part(g, ring(0.108, 0.008), STEEL_D, 0.22, 1.08, -0.2, { rx: Math.PI / 2, outline: false });
    part(g, rbox(0.1, 0.018, 0.03, 0.008), STEEL_D, 0.37, 1.05, -0.2);
    rod(g, new THREE.Vector3(0.24, 1.06, -0.2), new THREE.Vector3(0.34, 1.27, -0.1), 0.007, CHROME);
    // The wall, the shelf and the rail of tools, the hood.
    lineWall(g, W, zb, 0.9);
    part(g, box(W - 0.02, 0.025, 0.22), STEEL, 0, 1.45, zb + 0.13);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.12, 0.18), STEEL_D, sx * 0.4, 1.38, zb + 0.11, { outline: false });
    const sy = 1.4625;
    squeeze(g, -0.4, sy, zb + 0.14, '#d32f2f');
    squeeze(g, -0.33, sy, zb + 0.14, '#fbc02d');
    squeeze(g, -0.26, sy, zb + 0.14, '#fafafa');
    part(g, cyl(0.05, 0.05, 0.07, 16), WHITE, -0.1, sy + 0.035, zb + 0.13);
    label(g, '소금', 0.07, 0.03, -0.1, sy + 0.035, zb + 0.181, '#ffffff', '#1565c0');
    part(g, cyl(0.03, 0.03, 0.2, 12), '#827717', 0.06, sy + 0.1, zb + 0.13);
    part(g, cyl(0.012, 0.016, 0.06, 10), '#827717', 0.06, sy + 0.23, zb + 0.13);
    part(g, cyl(0.018, 0.022, 0.12, 10), '#4e342e', 0.15, sy + 0.06, zb + 0.13);
    for (let i = 0; i < 3; i++) part(g, cyl(0.07, 0.05, 0.03, 16), STEEL_L, 0.32, sy + 0.015 + i * 0.022, zb + 0.13, { outline: i === 2 });
    rod(g, new THREE.Vector3(-0.44, 1.32, zb + 0.05), new THREE.Vector3(0.44, 1.32, zb + 0.05), 0.008, CHROME);
    // A ladle, tongs and a spider hung from the rail.
    rod(g, new THREE.Vector3(-0.3, 1.32, zb + 0.055), new THREE.Vector3(-0.3, 1.1, zb + 0.055), 0.006, CHROME);
    part(g, ball(0.04), STEEL, -0.3, 1.08, zb + 0.06).scale.set(1, 0.6, 1);
    for (const s of [-1, 1]) part(g, box(0.012, 0.22, 0.004), STEEL_D, s * 0.012, 1.2, zb + 0.06, { rz: s * 0.06 });
    rod(g, new THREE.Vector3(0.3, 1.32, zb + 0.055), new THREE.Vector3(0.3, 1.16, zb + 0.055), 0.006, '#8d6e63');
    part(g, ring(0.055, 0.004), '#c9a227', 0.3, 1.1, zb + 0.06, { outline: false });
    part(g, cyl(0.053, 0.053, 0.002, 16), '#d7b65a', 0.3, 1.1, zb + 0.06, { rx: Math.PI / 2, outline: false });
    // The pan: resting on the burner, or on the flame being cooked in.
    const grip = new THREE.Vector3(px, 0.935 + 0.08, pz + 0.3);
    const idle = new THREE.Group();
    idle.position.copy(grip);
    sautePan(idle, false);
    g.add(idle);
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const pivot = new THREE.Group();
    pivot.position.copy(grip);
    use.add(pivot);
    const bits = sautePan(pivot, true);
    const puff = steam(use, px, 1.05, pz, 4, 0.05);
    // The cook a step back from the rail, the pan's handle in the left hand.
    const cook = spot(g, 'stand', -0.06, 0, 0.64, Math.PI);
    cook.work = marker(pivot, 0, 0, 0);
    cook.motion = 'saute';
    out.spots = { '*': cook };
    out.work = marker(g, px, 0.97, pz);
    out.animate = (t) => {
      const k = panToss(t, phaseAt(cook));
      pivot.position.set(grip.x, grip.y + k.lift, grip.z - k.push);
      pivot.rotation.x = k.tilt;
      bits.position.set(0, 0.012 + k.hop, 0.05 * (k.hop / 0.17));
      bits.rotation.x = -k.hop * 7;
      puff(t);
    };
  },

  /**
   * A prep table: a stainless top over a refrigerated base (two drawers, the temperature lit on it)
   * and an open shelf of bowls, hotel pans and onions; on it a green board with a carrot half diced
   * and the knife, the mise en place rail of little pans along the back (spring onion, onion, chilli,
   * garlic, carrot, mushroom, ginger, each taped with its name), a bowl of sauce with the tasting
   * spoons in a cup, the scale, a folded towel and a ticket pinned up. Prepping, the knife rocks
   * down the carrot in the cook's hand; tasting is done at the sauce.
   */
  prepCounter(g, W, _D, _c, _def, _ctx, out) {
    const zf = 0.26;
    const zb = -0.46;
    const zc = (zf + zb) / 2;
    const d = zf - zb;
    const ty = 0.9;
    part(g, rbox(W - 0.06, 0.035, d, 0.01), STEEL, 0, ty - 0.0175, zc);
    part(g, box(W - 0.06, 0.08, 0.02), STEEL, 0, ty + 0.04, zb + 0.01);
    for (const sx of [-1, 1]) for (const z of [zf - 0.05, zb + 0.05]) part(g, box(0.04, ty - 0.1, 0.04), STEEL_D, sx * (W / 2 - 0.07), (ty - 0.1) / 2 + 0.06, z, { outline: false });
    feet(g, [-(W / 2 - 0.07), W / 2 - 0.07], [zf - 0.05, zb + 0.05], 0.06);
    // The refrigerated base under the left half.
    const fx = -W / 4;
    part(g, box(W / 2 - 0.06, 0.68, d - 0.06), STEEL, fx, 0.48, zc);
    for (const s of [-1, 1]) {
      part(g, rbox(W / 4 - 0.06, 0.56, 0.02, 0.008), STEEL_L, fx + s * (W / 8), 0.44, zf - 0.02);
      part(g, rbox(W / 4 - 0.2, 0.024, 0.03, 0.01), CHROME, fx + s * (W / 8), 0.68, zf + 0.0);
    }
    part(g, box(0.12, 0.045, 0.006), '#102018', fx, 0.79, zf - 0.025, { outline: false });
    label(g, '3°C', 0.09, 0.035, fx, 0.79, zf - 0.021, '#102018', '#69f0ae');
    // The open shelf under the right half: bowls, hotel pans, a net of onions.
    part(g, box(W / 2 - 0.06, 0.025, d - 0.06), STEEL, W / 4, 0.22, zc);
    for (let i = 0; i < 4; i++) part(g, cyl(0.13, 0.09, 0.07, 18), STEEL_L, 0.3, 0.27 + i * 0.025, zc, { outline: i === 3 });
    for (let i = 0; i < 4; i++) part(g, box(0.32, 0.018, 0.26), STEEL, 0.72, 0.245 + i * 0.022, zc);
    // The board, the carrot being diced, the dice, the pile swept aside.
    const bx = -0.3;
    const bz = 0.0;
    part(g, rbox(0.52, 0.025, 0.34, 0.01), '#43a047', bx, ty + 0.0125, bz);
    const by = ty + 0.025;
    part(g, cyl(0.019, 0.012, 0.16, 12), '#fb8c00', bx - 0.1, by + 0.019, bz + 0.02, { rz: Math.PI / 2 });
    for (let i = 0; i < 4; i++) part(g, box(0.008, 0.035, 0.004), '#7cb342', bx - 0.19 - i * 0.008, by + 0.03, bz + 0.02 + (i - 1.5) * 0.008, { rz: 1.2, outline: false });
    for (let i = 0; i < 12; i++) part(g, box(0.015, 0.015, 0.015), '#ff9800', bx + 0.1 + (i % 3) * 0.018, by + 0.0075 + (i > 8 ? 0.015 : 0), bz - 0.03 + Math.floor(i / 3) * 0.02, { ry: i, outline: false });
    for (let i = 0; i < 10; i++) part(g, box(0.015, 0.015, 0.015), '#ff9800', bx + 0.2 + (i % 2) * 0.02, by + 0.0075, bz - 0.06 + Math.floor(i / 2) * 0.028, { ry: i * 0.7, outline: false });
    // The knife: on the board, or in the cook's hand.
    const knife = (k: THREE.Object3D) => {
      part(k, rbox(0.024, 0.03, 0.11, 0.008), BLACK, 0, 0, 0.03);
      for (const z of [0.01, 0.05]) part(k, cyl(0.005, 0.005, 0.026, 6), CHROME, 0, 0, z, { rz: Math.PI / 2, outline: false });
      part(k, box(0.004, 0.048, 0.21), CHROME, 0, -0.008, -0.12);
      part(k, box(0.0045, 0.012, 0.21), '#f5f7f8', 0, -0.026, -0.12, { outline: false });
    };
    const rest = new THREE.Group();
    rest.position.set(bx + 0.02, by + 0.004, bz - 0.12);
    rest.rotation.set(0, Math.PI / 2, Math.PI / 2);
    knife(rest);
    g.add(rest);
    out.idle = rest;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const held = new THREE.Group();
    knife(held);
    use.add(held);
    // The mise en place rail along the back.
    part(g, box(W - 0.12, 0.05, 0.2), STEEL, 0, ty + 0.025, zb + 0.13);
    const mise: Array<[string, string]> = [['#7cb342', '파'], ['#f3ecd2', '양파'], ['#e53935', '고추'], ['#fff3c4', '마늘'], ['#fb8c00', '당근'], ['#a1887f', '버섯'], ['#e0c080', '생강']];
    mise.forEach(([c, name], i) => {
      const x = -0.75 + i * 0.25;
      part(g, rbox(0.17, 0.014, 0.17, 0.004), STEEL_L, x, ty + 0.057, zb + 0.13);
      part(g, box(0.15, 0.012, 0.15), c, x, ty + 0.062, zb + 0.13, { outline: false });
      for (let j = 0; j < 5; j++) part(g, box(0.018, 0.008, 0.018), shade(c, 0.82), x - 0.05 + (j % 3) * 0.05, ty + 0.07, zb + 0.09 + Math.floor(j / 3) * 0.07, { ry: j, outline: false });
      label(g, name, 0.09, 0.03, x, ty + 0.025, zb + 0.231, '#fff59d', '#333333');
    });
    // The sauce and the tasting spoons.
    const sx = 0.52;
    const sz = 0.0;
    part(g, cyl(0.1, 0.07, 0.07, 22), STEEL_L, sx, ty + 0.035, sz);
    part(g, cyl(0.093, 0.093, 0.004, 22), '#8d3b1a', sx, ty + 0.066, sz, { outline: false });
    part(g, ring(0.098, 0.006), STEEL_D, sx, ty + 0.069, sz, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.035, 0.03, 0.09, 14), '#cfe8f3', sx + 0.2, ty + 0.045, sz - 0.1);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(sx + 0.2, ty + 0.03, sz - 0.1), new THREE.Vector3(sx + 0.2 + (i - 1) * 0.03, ty + 0.16, sz - 0.1 + (i % 2) * 0.02), 0.004, CHROME);
    // The scale, the towel, the tongs in a deli tub, a ticket pinned up.
    part(g, rbox(0.18, 0.03, 0.18, 0.01), '#fafafa', 0.84, ty + 0.015, 0.12);
    part(g, box(0.07, 0.022, 0.004), '#102018', 0.84, ty + 0.02, 0.212, { outline: false });
    label(g, '0.25kg', 0.06, 0.016, 0.84, ty + 0.02, 0.215, '#102018', '#69f0ae');
    towel(g, 0.18, 0.11, 0.08, ty, 0.17);
    part(g, cyl(0.055, 0.05, 0.11, 16), '#e1f5fe', -0.82, ty + 0.055, -0.15);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(-0.82, ty + 0.03, -0.15), new THREE.Vector3(-0.84 + i * 0.02, ty + 0.22, -0.16 + i * 0.01), 0.006, i === 1 ? BLACK : CHROME);
    ticket(g, ['T4  19:42', '김치볶음밥 2', '해물파전 1', '✓ 맵게'], 0.25, ty + 0.13, zb + 0.022, 0.05);
    // Dicing at the board; tasting at the sauce; a hygiene course read from the binder.
    const work = marker(g, bx, by, bz + 0.02);
    const dice = spot(g, 'stand', bx + 0.02, 0, 0.5, Math.PI);
    dice.work = work;
    dice.motion = 'dice';
    const taste = spot(g, 'stand', sx - 0.02, 0, 0.5, Math.PI);
    taste.work = marker(g, sx, ty + 0.07, sz);
    taste.motion = 'taste';
    const reading = spot(g, 'stand', 0.1, 0, 0.55, Math.PI);
    reading.motion = 'read';
    out.spots = { '*': dice, tasteDish: taste, fastFood_foodSafety: reading };
    out.work = work;
    // The knife in the right hand, on its handle (handTool.ts): the thumb along towards the blade, the palm in and down.
    held.name = 'knife';
    dice.held = {
      tool: held,
      lead: 'right',
      grips: { right: { at: new THREE.Vector3(0, 0, 0.035), axis: new THREE.Vector3(0, 0, -1), palm: new THREE.Vector3(-0.75, -0.65, 0).normalize(), shape: 'power' } },
    };
    out.animate = (t) => {
      const k = diceKnife(t, phaseAt(dice));
      const p = work.position;
      held.position.set(p.x - k.side, p.y + k.up + 0.012, p.z - k.ahead);
      held.rotation.set(-k.up / 0.21, 0, 0.55 * Math.sin(Math.PI * k.sweep));
    };
  },

  /**
   * The pass, from the head of it: a long stainless table, plates stacked under it and a plate
   * warmer, the heat-lamp gantry over the far end with the night's tickets clipped to its rail and
   * the order screen on its post, two dishes waiting under the lamps for the floor (픽업 on the far
   * side), and at the near end the plate being finished: the garnish tray of micro herbs and flowers
   * with tweezers, squeeze bottles, a cloth for the rim, the service bell, the chef's notepad. The
   * lamps glow while it's worked. Plating at the plate; briefing turned round to the kitchen; the
   * course written on the pad.
   */
  servingPass(g, W, D, _c, _def, _ctx, out) {
    const ty = 0.9;
    const hw = W / 2 - 0.04;
    const hd = D / 2 - 0.04;
    part(g, rbox(W - 0.08, 0.035, D - 0.08, 0.01), STEEL, 0, ty - 0.0175, 0);
    for (const sx of [-1, 1]) for (const z of [hd - 0.04, -(hd - 0.04), 0]) part(g, box(0.04, ty - 0.08, 0.04), STEEL_D, sx * (hw - 0.04), (ty - 0.08) / 2 + 0.05, z, { outline: false });
    feet(g, [-(hw - 0.04), hw - 0.04], [hd - 0.04, -(hd - 0.04)], 0.05);
    // Under it: stacks of clean plates at the near end, the plate warmer at the far.
    part(g, box(W - 0.12, 0.02, hd), STEEL, 0, 0.2, hd / 2);
    for (const [x, z] of [[-0.2, 0.3], [0.15, 0.3], [-0.2, 0.7], [0.15, 0.68]] as const) {
      for (let i = 0; i < 6; i++) part(g, cyl(0.13, 0.11, 0.016, 22), WHITE, x, 0.218 + i * 0.019, z, { outline: i === 5 });
    }
    part(g, box(W - 0.14, 0.62, hd - 0.04), STEEL_L, 0, 0.52, -hd / 2);
    part(g, cyl(0.025, 0.025, 0.02, 14), BLACK, 0.3, 0.72, -0.01, { rx: Math.PI / 2 });
    label(g, '보온', 0.12, 0.05, 0, 0.72, -0.015, '#37474f', '#ffcc80');
    for (let i = 0; i < 4; i++) part(g, box(0.4, 0.012, 0.004), STEEL_D, 0, 0.4 + i * 0.05, -0.016, { outline: false });
    // The gantry over the far end: posts, the lamp housing, its glow, the ticket rail, the screen.
    const gz0 = -0.06;
    const gz1 = -(hd - 0.02);
    for (const sx of [-1, 1]) for (const z of [gz0, gz1]) part(g, cyl(0.018, 0.018, 0.66, 10), CHROME, sx * (hw - 0.03), ty + 0.33, z);
    const gl = (gz0 + gz1) / 2;
    const gd = gz0 - gz1 + 0.06;
    part(g, rbox(W - 0.06, 0.08, gd, 0.015), STEEL_D, 0, ty + 0.68, gl);
    out.glow = ownGlow(g, box(W - 0.16, 0.012, gd - 0.1), 0, ty + 0.635, gl);
    rod(g, new THREE.Vector3(-hw + 0.02, ty + 0.58, gz0 + 0.03), new THREE.Vector3(hw - 0.02, ty + 0.58, gz0 + 0.03), 0.012, CHROME);
    const tickets = [['T3  19:38', '봉골레 2', '스테이크 1'], ['T7  19:40', '비빔밥 1', '파스타 1'], ['T2  19:41', '샐러드 2'], ['T5  19:44', '스테이크 2', '✓ 미디엄']];
    tickets.forEach((l, i) => ticket(g, l, -0.3 + i * 0.2, ty + 0.515, gz0 + 0.045, (i % 2 ? -1 : 1) * 0.05));
    label(g, '픽업', 0.3, 0.07, 0, ty + 0.68, gz1 - 0.02 - 0.031, '#c62828', '#ffffff', 0, Math.PI);
    const kds = new THREE.Group();
    kds.position.set(hw - 0.03, ty + 0.86, gz0);
    kds.rotation.y = -0.35;
    g.add(kds);
    part(g, cyl(0.012, 0.012, 0.2, 8), CHROME, hw - 0.03, ty + 0.76, gz0, { outline: false });
    part(kds, rbox(0.34, 0.22, 0.03, 0.01), BLACK, 0, 0, 0);
    const scr = screenMesh(0.3, 0.18);
    scr.position.set(0, 0, 0.016);
    kds.add(scr);
    out.screen = scr;
    // Two dishes under the lamps for the floor.
    dish(g, -0.17, ty, -0.32, 'steak');
    dish(g, 0.17, ty, -0.68, 'bowl');
    dish(g, -0.15, ty, -0.78, 'pasta');
    // The near end: the plate being finished and what finishes it.
    const plz = 0.55;
    dish(g, 0, ty, plz, 'pasta');
    part(g, rbox(0.17, 0.03, 0.3, 0.008), STEEL_L, 0.3, ty + 0.015, plz + 0.05);
    const greens: Array<[string, number]> = [['#7cb342', -0.09], ['#f48fb1', 0], ['#558b2f', 0.09]];
    for (const [c, dz] of greens) {
      for (let i = 0; i < 6; i++) part(g, c === '#f48fb1' ? ball(0.011) : box(0.016, 0.01, 0.016), i % 3 === 2 && c === '#f48fb1' ? '#ffd54f' : c, 0.27 + (i % 3) * 0.03, ty + 0.035, plz + 0.05 + dz - 0.02 + Math.floor(i / 3) * 0.04, { ry: i, outline: false });
      part(g, box(0.15, 0.01, 0.004), STEEL_D, 0.3, ty + 0.03, plz + 0.05 + dz + 0.045, { outline: false });
    }
    for (const s of [-1, 1]) part(g, box(0.006, 0.004, 0.15), CHROME, 0.4 + s * 0.006, ty + 0.034, plz + 0.04, { ry: s * 0.04, outline: false });
    squeeze(g, 0.34, ty, 0.28, '#3e2723', 0.13);
    squeeze(g, 0.4, ty, 0.3, '#c0ca33', 0.13);
    towel(g, 0.16, 0.1, -0.32, ty, 0.78, 0.2);
    part(g, cyl(0.035, 0.04, 0.012, 16), BLACK, -0.33, ty + 0.006, 0.42);
    part(g, ball(0.032), GOLD, -0.33, ty + 0.012, 0.42).scale.set(1, 0.65, 1);
    part(g, cyl(0.006, 0.006, 0.02, 8), GOLD, -0.33, ty + 0.042, 0.42, { outline: false });
    part(g, box(0.14, 0.004, 0.19), WHITE, -0.28, ty + 0.002, 0.58, { ry: 0.12 });
    label(g, '코스 구성', 0.11, 0.025, -0.28, ty + 0.005, 0.51, '#ffffff', '#333333', -Math.PI / 2, 0, 0.12);
    for (let i = 0; i < 5; i++) part(g, box(0.1, 0.001, 0.004), '#90a4ae', -0.28 + i * 0.002, ty + 0.005, 0.54 + i * 0.03, { ry: 0.12, outline: false });
    part(g, cyl(0.005, 0.005, 0.13, 8), '#1565c0', -0.21, ty + 0.008, 0.6, { rx: Math.PI / 2, rz: 0.3, outline: false });
    // At the head of the pass: plating, briefing the line (turned round to it), writing the course.
    const plate = spot(g, 'stand', 0, 0, D / 2 + 0.17, Math.PI);
    plate.work = marker(g, 0, ty + 0.03, plz);
    plate.motion = 'plate';
    const brief = spot(g, 'stand', 0, 0, D / 2 + 0.22, 0);
    brief.motion = 'talk';
    const pad = spot(g, 'stand', -0.2, 0, D / 2 + 0.17, Math.PI);
    pad.work = marker(g, -0.26, ty + 0.01, 0.6);
    pad.motion = 'write';
    out.spots = { '*': plate, culinary_kitchenBrief: brief, culinary_courseDesign: pad };
    out.work = plate.work;
  },

  /**
   * A stock range: a low cast-iron ring burner with a stockpot as big as a drum on it — bones,
   * onion and spring onion in a golden broth, a tape label (육수), its handles — a long ladle, the
   * stainless wall and the line's hood over it. Making stock, the flame's up, the broth bubbles and
   * steams, and the ladle goes slowly round in the cook's hand, now and then a scoop lifted to look.
   */
  culinaryStockRange(g, W, _D, _c, _def, _ctx, out) {
    const zb = -0.47;
    const pz = -0.06;
    feet(g, [-(W / 2 - 0.1), W / 2 - 0.1], [0.28, zb + 0.08]);
    part(g, box(W - 0.08, 0.32, 0.78), STEEL, 0, 0.26, -0.08);
    part(g, box(W - 0.1, 0.06, 0.06), STEEL_D, 0, 0.36, 0.3);
    part(g, cyl(0.03, 0.032, 0.04, 14), BLACK, 0.3, 0.36, 0.34, { rx: Math.PI / 2 });
    part(g, box(0.006, 0.02, 0.004), '#e53935', 0.3, 0.37, 0.36, { outline: false });
    for (const s of [-1, 1]) {
      part(g, box(0.62, 0.04, 0.04), IRON, 0, 0.44, pz + s * 0.29);
      part(g, box(0.04, 0.04, 0.62), IRON, s * 0.29, 0.44, pz);
    }
    part(g, ring(0.14, 0.012), IRON, 0, 0.43, pz, { rx: Math.PI / 2, outline: false });
    out.glow = ownGlow(g, new THREE.CylinderGeometry(0.2, 0.14, 0.05, 22, 1, true), 0, 0.445, pz);
    // The pot and the broth.
    const top = 0.88;
    part(g, cyl(0.27, 0.26, top - 0.46, 32), STEEL, 0, (top + 0.46) / 2, pz);
    part(g, ring(0.268, 0.012), STEEL_D, 0, top, pz, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.258, 0.258, 0.004, 30), '#c8963e', 0, top - 0.004, pz, { outline: false });
    for (const s of [-1, 1]) part(g, ring(0.05, 0.012, Math.PI), STEEL_D, s * 0.285, top - 0.06, pz, { rz: s * Math.PI / 2, ry: Math.PI / 2 });
    for (const [x, z, r] of [[-0.12, -0.08, 0.4], [0.08, 0.1, -0.6], [0.14, -0.05, 1.2]] as const) {
      part(g, cyl(0.022, 0.022, 0.12, 10), '#efe6d2', x, top, pz + z, { rz: Math.PI / 2, ry: r });
      for (const e of [-1, 1]) part(g, ball(0.03), '#efe6d2', x + Math.cos(r) * e * 0.06, top, pz + z - Math.sin(r) * e * 0.06, { outline: false });
    }
    part(g, ball(0.06), '#d9a85c', -0.05, top - 0.01, pz + 0.12, { outline: false }).scale.set(1, 0.4, 1);
    for (let i = 0; i < 5; i++) part(g, cyl(0.009, 0.009, 0.08, 6), '#7cb342', 0.02 + i * 0.03, top + 0.004, pz - 0.15 + (i % 2) * 0.03, { rz: Math.PI / 2, ry: i * 0.6, outline: false });
    label(g, '육수 · 10/26', 0.16, 0.05, 0, 0.7, pz + 0.268, '#fffde7', '#1a237e');
    // The wall and the hood, as on the rest of the line.
    lineWall(g, W, zb, 0.44);
    // The ladle: hooked on the rim, or going round in the cook's hand.
    const ladle = (k: THREE.Object3D, len: number) => {
      part(k, ball(0.045), STEEL, 0, 0, 0).scale.set(1, 0.6, 1);
      part(k, cyl(0.007, 0.007, len, 8), CHROME, 0, len / 2 + 0.02, 0, { outline: false });
      part(k, cyl(0.011, 0.011, 0.12, 8), BLACK, 0, len - 0.04, 0, { outline: false });
    };
    const rest = new THREE.Group();
    rest.position.set(0.15, top - 0.03, pz - 0.12);
    rest.rotation.set(-0.35, 0, -0.45);
    ladle(rest, 0.5);
    g.add(rest);
    out.idle = rest;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const held = new THREE.Group();
    ladle(held, 0.42);
    use.add(held);
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) bubbles.push(part(use, ball(0.016), '#e8c070', Math.cos(i * 2.4) * 0.16 * ((i % 3) / 3 + 0.4), top + 0.002, pz + Math.sin(i * 2.4) * 0.16 * ((i % 3) / 3 + 0.4), { outline: false }));
    const puff = steam(use, 0, top + 0.05, pz, 5, 0.12);
    const broth = marker(g, 0, top - 0.03, pz);
    const cook = spot(g, 'stand', 0, 0, 0.62, Math.PI);
    cook.work = broth;
    cook.motion = 'ladle';
    out.spots = { '*': cook };
    out.work = broth;
    const up = new THREE.Vector3(0, 1, 0);
    held.quaternion.setFromUnitVectors(up, new THREE.Vector3(0.04, 0.3, 0.2).normalize());
    out.animate = (t) => {
      const k = ladleStir(t, phaseAt(cook));
      const p = broth.position;
      held.position.set(p.x - k.x, p.y + k.lift - 0.02, p.z - k.z);
      bubbles.forEach((b, i) => b.scale.setScalar(0.3 + Math.abs(Math.sin(t * (1.3 + i * 0.37) + i))));
      puff(t);
    };
  },

  /**
   * The dish pit: a stainless sink table with a deep basin, the pre-rinse sprayer on its spring
   * over it and a stack of dirty plates waiting, a rack of rinsed plates ready to go in, and the
   * hood-type dishwasher beside it with its handle bar and a panel (lit, with the rinse heat, while
   * it's working). Washing up, the sprayer runs into the basin.
   */
  culinaryDishPit(g, W, _D, _c, _def, _ctx, out) {
    const zf = 0.25;
    const zb = -0.45;
    const zc = (zf + zb) / 2;
    const d = zf - zb;
    const ty = 0.9;
    // The sink table on the left.
    const lx = -W / 4;
    const lw = W / 2 - 0.04;
    part(g, rbox(lw, 0.035, d, 0.01), STEEL, lx, ty - 0.0175, zc);
    part(g, box(lw, 0.3, 0.02), STEEL, lx, ty + 0.15, zb + 0.01);
    for (const x of [lx - lw / 2 + 0.04, lx + lw / 2 - 0.04]) for (const z of [zf - 0.05, zb + 0.05]) part(g, box(0.04, ty - 0.06, 0.04), STEEL_D, x, (ty - 0.06) / 2 + 0.04, z, { outline: false });
    feet(g, [lx - lw / 2 + 0.04, lx + lw / 2 - 0.04], [zf - 0.05, zb + 0.05], 0.05);
    const sx = -0.55;
    const sz = -0.08;
    part(g, box(0.42, 0.32, 0.4), STEEL_L, sx, ty - 0.18, sz);
    part(g, box(0.4, 0.004, 0.38), '#55606a', sx, ty + 0.001, sz, { outline: false });
    part(g, box(0.34, 0.004, 0.3), '#7fa9c0', sx, ty + 0.002, sz, { outline: false });
    for (const [x, r] of [[-0.07, 0.5], [0.06, -0.4]] as const) part(g, cyl(0.11, 0.1, 0.014, 20), WHITE, sx + x, ty + 0.02, sz, { rz: r });
    // The pre-rinse unit: the riser, its bracket, the spring and the sprayer hanging over the basin.
    const rx = sx;
    const rz = zb + 0.05;
    rod(g, new THREE.Vector3(rx, ty, rz), new THREE.Vector3(rx, 1.6, rz), 0.014, CHROME);
    rod(g, new THREE.Vector3(rx, 1.35, rz), new THREE.Vector3(rx, 1.35, zb), 0.01, CHROME);
    rod(g, new THREE.Vector3(rx, 1.0, rz), new THREE.Vector3(rx, 1.0, rz + 0.16), 0.012, CHROME);
    for (let i = 0; i < 12; i++) part(g, ring(0.024, 0.004), CHROME, rx, 1.4 + i * 0.02, rz, { rx: Math.PI / 2, outline: false });
    const head = new THREE.Vector3(rx, 1.16, sz - 0.02);
    rod(g, new THREE.Vector3(rx, 1.62, rz), new THREE.Vector3(rx, 1.66, rz + 0.12), 0.01, '#455a64');
    rod(g, new THREE.Vector3(rx, 1.66, rz + 0.12), head.clone().setY(head.y + 0.06), 0.01, '#455a64');
    part(g, cyl(0.022, 0.028, 0.1, 12), '#37474f', head.x, head.y, head.z);
    part(g, box(0.012, 0.06, 0.03), STEEL_D, head.x, head.y + 0.02, head.z + 0.03, { rx: 0.3 });
    // Dirty plates waiting, a rack of rinsed ones.
    const dirty = new THREE.Group();
    g.add(dirty);
    for (let i = 0; i < 5; i++) part(dirty, cyl(0.12, 0.1, 0.016, 20), WHITE, -0.86, ty + 0.008 + i * 0.018, 0.0, { outline: i === 4 });
    for (let i = 0; i < 6; i++) part(dirty, ball(0.01), ['#b23a1d', '#f2d27a', '#558b2f'][i % 3], -0.9 + (i % 3) * 0.04, ty + 0.1, -0.02 + Math.floor(i / 3) * 0.05, { outline: false });
    part(dirty, cyl(0.035, 0.03, 0.1, 12), '#cfe8f3', -0.88, ty + 0.05, -0.28);
    part(g, rbox(0.3, 0.1, 0.42, 0.01), '#607d8b', -0.17, ty + 0.05, -0.08);
    for (let i = 0; i < 5; i++) part(g, cyl(0.11, 0.11, 0.012, 20), WHITE, -0.17, ty + 0.12, -0.24 + i * 0.075, { rx: Math.PI / 2 - 0.15 });
    // The dishwasher on the right.
    const mx = W / 4 + 0.01;
    const mw = W / 2 - 0.08;
    feet(g, [mx - mw / 2 + 0.05, mx + mw / 2 - 0.05], [0.15, zb + 0.08], 0.05);
    part(g, box(mw - 0.02, 0.83, 0.64), STEEL, mx, 0.465, zc);
    part(g, rbox(mw, 0.56, 0.7, 0.015), STEEL_L, mx, ty + 0.28, zc);
    for (let i = 0; i < 3; i++) part(g, box(mw - 0.1, 0.006, 0.004), STEEL_D, mx, ty + 0.12 + i * 0.12, zf + 0.003, { outline: false });
    rod(g, new THREE.Vector3(mx - mw / 2 + 0.06, ty + 0.2, zf + 0.04), new THREE.Vector3(mx + mw / 2 - 0.06, ty + 0.2, zf + 0.04), 0.013, CHROME);
    for (const s of [-1, 1]) rod(g, new THREE.Vector3(mx + s * (mw / 2 - 0.08), ty + 0.2, zf), new THREE.Vector3(mx + s * (mw / 2 - 0.08), ty + 0.2, zf + 0.04), 0.008, CHROME);
    part(g, box(mw, 0.3, 0.5), STEEL, mx, ty + 0.71, zb + 0.26);
    part(g, box(0.5, 0.17, 0.012), '#263238', mx, ty + 0.72, zb + 0.516);
    const scr = screenMesh(0.16, 0.07);
    scr.position.set(mx - 0.1, ty + 0.73, zb + 0.524);
    g.add(scr);
    out.screen = scr;
    label(g, '헹굼 82°C', 0.14, 0.035, mx - 0.1, ty + 0.78, zb + 0.524, '#263238', '#ffcc80');
    for (const [i, c] of ['#43a047', '#fdd835', '#e53935'].entries()) part(g, cyl(0.016, 0.016, 0.012, 12), c, mx + 0.08 + i * 0.05, ty + 0.72, zb + 0.525, { rx: Math.PI / 2, outline: false });
    // Washing up: water from the sprayer into the basin, a splash.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const fall = head.y - 0.05 - ty;
    const stream = new THREE.Mesh(cyl(0.008, 0.03, fall, 10), WATER);
    stream.position.set(head.x, ty + fall / 2, head.z);
    stream.renderOrder = 2;
    use.add(stream);
    const drops: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(ball(0.012), WATER);
      use.add(m);
      drops.push(m);
    }
    const cook = spot(g, 'stand', sx, 0, 0.5, Math.PI);
    cook.work = marker(g, sx, ty + 0.0, sz + 0.04);
    cook.motion = 'scrub';
    // Closing: the plates are done, the sprayer's off (handWorkProps.ts).
    out.spots = { '*': cook, xwCloseKitchen: kitchenClose(g, out, [dirty, stream, ...drops]) };
    out.work = cook.work;
    out.animate = (t) =>
      drops.forEach((m, i) => {
        const k = (t * 1.6 + i / drops.length) % 1;
        const a = i * 1.26;
        m.position.set(head.x + Math.cos(a) * 0.12 * k, ty + 0.02 + 0.08 * Math.sin(Math.PI * k), head.z + Math.sin(a) * 0.1 * k);
      });
  },

  /**
   * The dry store: chrome wire shelving, four shelves — sacks of rice and a net of onions and a
   * crate of potatoes on the bottom, the flour, sugar, salt and starch bins and tins of oil above,
   * cans of tomatoes, tubs of gochujang and jugs of soy sauce, then hotel pans and boxes of dried
   * noodles and laver at the top — with the stock sheet on its clipboard hung on the end post.
   */
  culinaryDryRack(g, W, _D, _c, _def, _ctx, out) {
    const zc = -0.24;
    const dd = 0.42;
    const hw = W / 2 - 0.05;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.014, 1.86, 8), CHROME, sx * hw, 0.93, zc + sz * (dd / 2), { outline: false });
    const levels = [0.14, 0.6, 1.06, 1.52, 1.84];
    for (const y of levels) {
      for (const sz of [-1, 1]) part(g, box(W - 0.1, 0.022, 0.022), CHROME, 0, y, zc + sz * (dd / 2));
      for (const sx of [-1, 1]) part(g, box(0.022, 0.022, dd), CHROME, sx * hw, y, zc, { outline: false });
      for (let i = 1; i < 16; i++) part(g, box(0.006, 0.006, dd), '#cfd6db', -hw + ((2 * hw) / 16) * i, y + 0.006, zc, { outline: false });
    }
    // Bottom: rice, onions, potatoes.
    const b = levels[0] + 0.011;
    part(g, rbox(0.46, 0.18, 0.34, 0.06), '#f5f5f0', -0.62, b + 0.09, zc);
    part(g, rbox(0.46, 0.18, 0.34, 0.06), '#f5f5f0', -0.6, b + 0.27, zc, { ry: 0.08 });
    for (const [y, ry] of [[b + 0.09, 0], [b + 0.27, 0.08]] as const) label(g, '쌀 20kg', 0.22, 0.07, -0.62, y, zc + 0.172, '#ffffff', '#2e7d32', 0, ry);
    part(g, rbox(0.3, 0.3, 0.28, 0.12), '#e67e22', -0.12, b + 0.15, zc);
    for (let i = 0; i < 4; i++) part(g, box(0.302, 0.006, 0.282), '#a04000', -0.12, b + 0.06 + i * 0.06, zc, { outline: false });
    part(g, box(0.52, 0.22, 0.36), '#a1887f', 0.55, b + 0.11, zc);
    for (let i = 0; i < 3; i++) part(g, box(0.522, 0.03, 0.004), '#6d4c41', 0.55, b + 0.05 + i * 0.07, zc + 0.181, { outline: false });
    for (let i = 0; i < 8; i++) part(g, ball(0.045), '#c8a165', 0.38 + (i % 4) * 0.11, b + 0.24, zc - 0.07 + Math.floor(i / 4) * 0.13).scale.set(1.2, 0.8, 1);
    // Bins and oil.
    const m = levels[1] + 0.011;
    const bins: Array<[string, string]> = [['#1e88e5', '밀가루'], ['#e53935', '설탕'], ['#43a047', '소금'], ['#fdd835', '전분']];
    bins.forEach(([lid, name], i) => {
      const x = -0.78 + i * 0.27;
      part(g, rbox(0.24, 0.28, 0.32, 0.02), '#f7f7f4', x, m + 0.14, zc);
      part(g, rbox(0.25, 0.03, 0.33, 0.01), lid, x, m + 0.29, zc);
      label(g, name, 0.16, 0.06, x, m + 0.15, zc + 0.161, '#ffffff', '#263238');
    });
    for (const x of [0.4, 0.7]) {
      part(g, box(0.24, 0.34, 0.24), '#d4a017', x, m + 0.17, zc);
      part(g, cyl(0.025, 0.025, 0.04, 10), '#c62828', x + 0.07, m + 0.36, zc + 0.05, { outline: false });
      label(g, '식용유 18L', 0.2, 0.06, x, m + 0.18, zc + 0.121, '#fff8e1', '#bf360c');
    }
    // Cans, gochujang, soy sauce.
    const c = levels[2] + 0.011;
    for (let i = 0; i < 4; i++) {
      const x = -0.82 + i * 0.16;
      part(g, cyl(0.075, 0.075, 0.18, 18), STEEL_L, x, c + 0.09, zc + 0.04);
      part(g, cyl(0.076, 0.076, 0.11, 18), '#c62828', x, c + 0.09, zc + 0.04, { outline: false });
      label(g, '토마토', 0.09, 0.03, x, c + 0.09, zc + 0.04 + 0.077, '#c62828', '#ffffff');
    }
    for (const [x, y] of [[0.0, 0], [0.24, 0], [0.12, 0.15]] as const) {
      part(g, rbox(0.2, 0.14, 0.2, 0.02), '#b71c1c', x, c + y + 0.07, zc + 0.02);
      part(g, rbox(0.21, 0.025, 0.21, 0.01), '#e53935', x, c + y + 0.145, zc + 0.02);
    }
    label(g, '고추장', 0.14, 0.045, 0.0, c + 0.07, zc + 0.121, '#fff3e0', '#b71c1c');
    for (const x of [0.56, 0.76]) {
      part(g, cyl(0.07, 0.07, 0.26, 16), '#4e342e', x, c + 0.13, zc);
      part(g, cyl(0.025, 0.025, 0.05, 10), '#fdd835', x, c + 0.285, zc, { outline: false });
      label(g, '간장', 0.08, 0.04, x, c + 0.12, zc + 0.071, '#fff8e1', '#4e342e');
    }
    // Hotel pans, boxes of noodles and laver.
    const u = levels[3] + 0.011;
    for (let i = 0; i < 5; i++) part(g, box(0.53, 0.02, 0.33), STEEL_L, -0.6, u + 0.01 + i * 0.022, zc, { outline: i === 4 });
    for (const [x, name] of [[0.05, '건면'], [0.55, '김']] as const) {
      part(g, rbox(0.4, 0.24, 0.34, 0.01), '#c8a165', x, u + 0.12, zc);
      part(g, box(0.402, 0.03, 0.06), '#a1887f', x, u + 0.24, zc, { outline: false });
      label(g, name, 0.14, 0.06, x, u + 0.12, zc + 0.171, '#c8a165', '#3e2723');
    }
    // Date tags along the shelf edges, the stock sheet on its clipboard.
    for (const y of levels.slice(0, 4)) for (const x of [-0.6, 0.3]) label(g, '입고 10/24', 0.1, 0.022, x, y - 0.01, zc + dd / 2 + 0.013, '#ffffff', '#455a64');
    part(g, rbox(0.22, 0.3, 0.012, 0.01), '#8d6e63', hw - 0.12, 1.32, zc + dd / 2 + 0.03);
    part(g, box(0.19, 0.25, 0.003), WHITE, hw - 0.12, 1.31, zc + dd / 2 + 0.037, { outline: false });
    label(g, '재고 점검표', 0.17, 0.03, hw - 0.12, 1.41, zc + dd / 2 + 0.04, '#ffffff', '#263238');
    for (let i = 0; i < 6; i++) part(g, box(0.15, 0.003, 0.002), '#90a4ae', hw - 0.12, 1.37 - i * 0.03, zc + dd / 2 + 0.04, { outline: false });
    part(g, box(0.07, 0.02, 0.02), CHROME, hw - 0.12, 1.465, zc + dd / 2 + 0.04);
    const look = spot(g, 'stand', 0.05, 0, 0.42, Math.PI);
    look.work = marker(g, 0.12, 1.15, zc + 0.12);
    look.motion = 'rummage';
    out.spots = { '*': look };
    out.work = look.work;
  },

  /**
   * The host's stand by the dining room's door: a dark wood lectern on its plinth with a brass plate
   * (어서 오세요), the reservations book open on its sloped top with a pen, a little brass lamp
   * lit over it, menus in their pocket on the side and a single flower.
   */
  culinaryHostStand(g, _W, _D, c, _def, _ctx, out) {
    part(g, rbox(0.56, 0.06, 0.44, 0.015), shade(c, 0.8), 0, 0.03, -0.02);
    part(g, rbox(0.48, 0.96, 0.36, 0.02), c, 0, 0.54, -0.02);
    part(g, rbox(0.38, 0.6, 0.012, 0.01), shade(c, 1.2), 0, 0.52, 0.166, { outline: false });
    part(g, rbox(0.28, 0.08, 0.012, 0.008), GOLD, 0, 0.78, 0.17);
    label(g, '어서 오세요', 0.25, 0.06, 0, 0.78, 0.177, '#d4af37', '#3e2723');
    // The menus in their pocket on the side.
    part(g, box(0.03, 0.34, 0.26), shade(c, 0.7), 0.255, 0.62, -0.02);
    for (let i = 0; i < 3; i++) part(g, box(0.012, 0.32, 0.22), i === 1 ? '#3e2723' : '#7b1f2b', 0.28 + i * 0.012, 0.67, -0.02, { outline: i === 2 });
    label(g, '메뉴', 0.1, 0.04, 0.318, 0.74, -0.02, '#7b1f2b', '#f5d76e', 0, Math.PI / 2);
    // The sloped top, sloping down to the host behind it, and what's on it.
    const top = new THREE.Group();
    top.position.set(0, 1.04, -0.02);
    top.rotation.x = 0.22;
    g.add(top);
    part(top, rbox(0.58, 0.04, 0.44, 0.015), shade(c, 0.85), 0, 0, 0);
    part(top, box(0.54, 0.02, 0.02), shade(c, 0.7), 0, 0.02, -0.21);
    for (const s of [-1, 1]) {
      part(top, box(0.19, 0.012, 0.27), '#fffaf0', s * 0.1, 0.028, 0.02, { rz: s * -0.04 });
      for (let i = 0; i < 7; i++) part(top, box(0.15, 0.002, 0.004), i % 3 === 0 ? '#c62828' : '#90a4ae', s * 0.1, 0.036, -0.09 + i * 0.034, { outline: false });
    }
    part(top, box(0.006, 0.014, 0.27), '#7b1f2b', 0, 0.03, 0.02, { outline: false });
    part(top, cyl(0.005, 0.005, 0.14, 8), BLACK, 0.12, 0.04, 0.06, { rz: Math.PI / 2, ry: 0.5 });
    // A brass desk lamp, lit, and a flower.
    part(g, cyl(0.04, 0.045, 0.02, 16), GOLD, -0.22, 1.08, -0.15);
    rod(g, new THREE.Vector3(-0.22, 1.09, -0.15), new THREE.Vector3(-0.22, 1.3, -0.12), 0.007, GOLD);
    rod(g, new THREE.Vector3(-0.22, 1.3, -0.12), new THREE.Vector3(-0.12, 1.3, -0.04), 0.007, GOLD);
    part(g, cyl(0.03, 0.06, 0.06, 16), '#2e5d3a', -0.1, 1.27, -0.02);
    part(g, cyl(0.055, 0.055, 0.004, 16), '#fff3c4', -0.1, 1.24, -0.02, { outline: false, material: glow('#fff3c4') });
    part(g, cyl(0.02, 0.025, 0.1, 12), '#cfe8f3', 0.22, 1.1, -0.17);
    rod(g, new THREE.Vector3(0.22, 1.12, -0.17), new THREE.Vector3(0.24, 1.3, -0.16), 0.004, '#558b2f');
    part(g, ball(0.03), '#e53935', 0.24, 1.32, -0.16);
    out.work = marker(g, 0, 1.08, 0);
  },
};
