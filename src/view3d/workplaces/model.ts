import { frontDesk } from './frontDesk';
import { label } from './doctor';
import * as THREE from 'three';
import type { BarOffset, Motion } from '../activity';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, gradient, part, rbox, textured } from '../toon';
import {
  BOOK_OUT, COMP, COMPACT_AT, DRESS_HOLD, GOSEE, RUNWAY, compAt, goSeeAt, makeupAt, mdPhase, measureAt, poseAt, poseFlash, quickChangeAt, walkAt,
} from './modelMotion';

/**
 * The 모델 에이전시 drawn as itself (2026-10-27 workplace pipeline, at the user's request): 스텔라 모델스
 * (STELLA MODELS, made up), in black, white, greige and brushed gold with a blush accent. The walking
 * lane — a taped line on grey vinyl along the walking room's mirror wall (a show runway until the
 * 2026-11-05 layout audit) — walked
 * for real (workplaces/modelMotion.ts: the spot goes down the line and back, a pose at the end);
 * the posing spot's paper sweep under a beauty dish, the camera on its tripod and a wind machine,
 * the strobes going off with each pose; the vanity's bulb-lit mirror, made up at with a compact and
 * the tools drawn in the hands. And what it was missing (workFurniture/model.ts): the casting table,
 * the fitting podium with its three-way mirror and tape, the backstage rack of looks in running
 * order, the comp card printer and the lobby's wall of comp cards.
 */

const BLACK = '#1f1e22';
const INK = '#2b2a30';
const WHITE = '#f7f5f1';
const GREIGE = '#cfc6bb';
const GREIGE_D = '#a99e91';
const GOLD = '#c9a96a';
const BLUSH = '#f2c4c9';
const CHROME = '#dfe3e6';
const WOODL = '#c8a77e';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);

/** Lit parts (bulbs, LEDs, a flash): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
const GLASS = new THREE.MeshToonMaterial({ color: '#dbe9ef', transparent: true, opacity: 0.85 });
const MIRROR = new THREE.MeshToonMaterial({ color: '#d3e4ea', emissive: '#55707a', emissiveIntensity: 0.25 });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`mdRing${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 36, arc));

/** Pictures painted once a key. */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
const litMats = new Map<string, THREE.Material>();
function litMat(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Material {
  let m = litMats.get(key);
  if (!m) litMats.set(key, (m = textured(painted(key, cw, ch, paint))));
  return m;
}
/** A flat picture facing +z (turned by `ry`, tipped by `rx`), always seen in its own colours. */
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0, color = '#ffffff'): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
/** A face lit like the rest of the room. */
function face(g: THREE.Object3D, mat: THREE.Material, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.ownGeometry = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  m.receiveShadow = true;
  g.add(m);
  return m;
}
/** A see-through flat (a flash on the paper, a gel's wash) whose opacity is set as it's used. */
function wash(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, color: string, tex?: THREE.Texture, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, map: tex ?? null, transparent: true, opacity: 0, depthWrite: false }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
const setOpacity = (m: THREE.Mesh, o: number) => {
  (m.material as THREE.MeshBasicMaterial).opacity = o;
  m.visible = o > 0.01;
};
function write(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', bold = true, max?: number) {
  c.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(s, x, y, max);
}
function rounded(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
/** Words on a plate (`bg` 'none' for none), facing +z. */
function tag(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`mdTag|${text}|${bg}|${fg}|${cw}`, cw, ch, (c) => {
    if (bg !== 'none') rounded(c, 0, 0, cw, ch, 8, bg);
    write(c, text, cw / 2, ch * 0.54, Math.round(ch * 0.56), fg, 'center', true, cw * 0.92);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A group placed and turned in `g`. */
function frame(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Group {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.set(rx, ry, 0, 'YXZ');
  g.add(f);
  return f;
}
/** Turned to look from (x, y, z) at `to` along its +z. */
function aimed(g: THREE.Object3D, x: number, y: number, z: number, to: THREE.Vector3): THREE.Group {
  const dx = to.x - x;
  const dy = to.y - y;
  const dz = to.z - z;
  return frame(g, x, y, z, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
}
/** A group in `g` shown only while the piece is used. */
function inUse(g: THREE.Object3D, out: Built): THREE.Group {
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  return use;
}
/** A spot stood at (x, y, z) facing `yaw` (π: at the piece, from its front), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, y: number, z: number, motion: Motion, work?: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, y, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot sat at (x, z) on a seat `seat` up, facing `yaw`. */
function satAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, seat: number, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', x, seat, z, yaw, seat);
  s.work = work;
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of a piece's spots, the one stood or sat at just now (the most lately), else null. */
function nowAt(list: Spot[], t: number): Spot | null {
  let best: Spot | null = null;
  for (const s of list) if (Math.abs(t - posedAt(s)) < 0.6 && (!best || posedAt(s) > posedAt(best))) best = s;
  return best;
}
const heightOf = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const phaseOf = (m: THREE.Object3D) => mdPhase(m.getWorldPosition(tmp));
/** A holder in the in-use group that goes where a spot is (so what's in the hand goes when the use does). */
function holder(use: THREE.Object3D): THREE.Group {
  const h = new THREE.Group();
  use.add(h);
  return h;
}
function follow(h: THREE.Object3D, s: Spot) {
  h.position.copy(s.at.position);
  h.rotation.copy(s.at.rotation);
}
/** Puts something at a body-frame offset (scaled for height) in a holder. */
const put = (o: THREE.Object3D, off: BarOffset, k: number, d: BarOffset = { side: 0, up: 0, ahead: 0 }) => o.position.set((off.side + d.side) * k, (off.up + d.up) * k, (off.ahead + d.ahead) * k);

// ---- Small things ----

/** A light stand (three legs, a pole) up to `h` at (x, z). */
function lightStand(g: THREE.Object3D, x: number, z: number, h: number, spread = 0.2, color = BLACK) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, V(x, 0.3, z), V(x + Math.sin(a) * spread, 0.01, z + Math.cos(a) * spread), 0.01, color);
  }
  part(g, cyl(0.013, 0.013, h - 0.28, 8), color, x, 0.28 + (h - 0.28) / 2, z, { outline: false });
  part(g, cyl(0.02, 0.02, 0.05, 8), '#4a4852', x, 0.31, z, { outline: false });
}
/** A camera facing +z in its own group (its middle at the origin): body, grip, lens, a flash on the hot shoe; returns the flash's face. */
function camera(c: THREE.Object3D, use: THREE.Object3D | null, flashColor = '#ffffff'): THREE.Mesh | null {
  part(c, rbox(0.14, 0.095, 0.075, 0.015), BLACK, 0, 0, 0);
  part(c, rbox(0.04, 0.085, 0.08, 0.012), '#2b2b30', -0.055, -0.004, 0.012);
  part(c, cyl(0.036, 0.036, 0.12, 18), '#2d2d33', 0.012, -0.004, 0.09, { rx: Math.PI / 2 });
  part(c, cyl(0.04, 0.04, 0.02, 18), '#141418', 0.012, -0.004, 0.15, { rx: Math.PI / 2, outline: false });
  part(c, cyl(0.028, 0.028, 0.004, 18), '#3d5a80', 0.012, -0.004, 0.161, { rx: Math.PI / 2, outline: false });
  part(c, rbox(0.06, 0.05, 0.05, 0.01), '#2b2b30', 0.012, 0.075, 0.005);
  part(c, rbox(0.07, 0.04, 0.03, 0.006), '#e8e8e8', 0.012, 0.118, 0.012, { outline: false });
  if (!use) return null;
  return part(use, box(0.062, 0.032, 0.004), flashColor, 0.012, 0.118, 0.029, { outline: false, material: glow(flashColor) });
}
/** A pair of shoes side by side at (x, y, z), toes to +z: heels, boots or sneakers. */
function shoes(g: THREE.Object3D, kind: 'heel' | 'boot' | 'sneaker' | 'loafer', color: string, x: number, y: number, z: number) {
  for (const sx of [-1, 1]) {
    const px = x + sx * 0.045;
    if (kind === 'heel') {
      part(g, rbox(0.06, 0.02, 0.17, 0.01), color, px, y + 0.045, z + 0.01, { rx: 0.35, outline: false });
      part(g, cyl(0.007, 0.005, 0.07, 6), color, px, y + 0.035, z - 0.07, { outline: false });
      part(g, rbox(0.062, 0.03, 0.06, 0.015), color, px, y + 0.015, z + 0.07, { outline: false });
    } else if (kind === 'boot') {
      part(g, rbox(0.065, 0.24, 0.07, 0.02), color, px, y + 0.12, z - 0.04);
      part(g, rbox(0.065, 0.05, 0.16, 0.02), color, px, y + 0.025, z + 0.01);
    } else {
      part(g, rbox(0.065, 0.055, 0.17, 0.025), color, px, y + 0.028, z, { outline: false });
      part(g, box(0.067, 0.012, 0.17), kind === 'sneaker' ? '#fafafa' : '#3e2723', px, y + 0.006, z, { outline: false });
    }
  }
}
/** A hanger with a look on it under the rail at (x, y) (its hook's top), facing +z. */
function look(g: THREE.Object3D, kind: 'dress' | 'coat' | 'suit' | 'gown' | 'top', color: string, x: number, y: number, z: number) {
  part(g, ring(0.018, 0.0035, Math.PI * 1.3), CHROME, x, y - 0.01, z, { outline: false });
  rod(g, V(x - 0.17, y - 0.08, z), V(x, y - 0.03, z), 0.006, '#3a2b20');
  rod(g, V(x + 0.17, y - 0.08, z), V(x, y - 0.03, z), 0.006, '#3a2b20');
  if (kind === 'dress' || kind === 'gown') {
    const len = kind === 'gown' ? 1.15 : 0.82;
    part(g, rbox(0.3, 0.26, 0.09, 0.04), color, x, y - 0.21, z);
    part(g, cyl(0.1, kind === 'gown' ? 0.24 : 0.2, len - 0.26, 14), color, x, y - 0.34 - (len - 0.26) / 2, z).scale.set(1, 1, 0.45);
  } else if (kind === 'coat' || kind === 'suit') {
    const len = kind === 'coat' ? 0.95 : 0.66;
    part(g, rbox(0.38, len, 0.1, 0.05), color, x, y - 0.08 - len / 2, z);
    part(g, box(0.006, len - 0.1, 0.104), '#1a1a1a', x, y - 0.1 - len / 2, z, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.07, len * 0.85, 0.08, 0.035), color, x + sx * 0.2, y - 0.1 - (len * 0.85) / 2, z);
    if (kind === 'suit') {
      part(g, rbox(0.3, 0.6, 0.06, 0.03), color, x, y - 1.05, z - 0.01);
    }
  } else {
    part(g, rbox(0.34, 0.5, 0.08, 0.04), color, x, y - 0.33, z);
  }
}

// ---- Painted faces ----

/** The walking room's roll-up banner: the agency's name, the class, a star. */
function paintEntrance(c: CanvasRenderingContext2D) {
  const W = 192;
  const H = 512;
  c.fillStyle = '#17161a';
  c.fillRect(0, 0, W, H);
  c.strokeStyle = '#c9a96a';
  c.lineWidth = 3;
  c.strokeRect(10, 10, W - 20, H - 20);
  write(c, '★', W / 2, 52, 34, '#e7cf9a', 'center');
  write(c, 'STELLA', W / 2, 98, 34, '#ffffff', 'center');
  write(c, 'MODELS', W / 2, 132, 24, '#e7cf9a', 'center');
  write(c, 'WALKING', W / 2, H - 70, 26, '#ffffff', 'center');
  write(c, 'CLASS', W / 2, H - 40, 16, '#bdb3a6', 'center', false);
}
/** A comp card's face: the model's head and shoulders, the name, the numbers. */
const MODELS: Array<[string, string, string, string, string]> = [
  ['윤서아', '176 · 32-24-35', '#f1d2bd', '#2b1b14', '#e9e2f5'],
  ['강도윤', '187 · 신발 280', '#e4bc98', '#1a1a1a', '#dfeef0'],
  ['한지유', '174 · 31-23-34', '#f6dcc8', '#7b4a2a', '#fbe9e7'],
  ['박하준', '185 · 신발 275', '#d9ab84', '#2a2a2a', '#eceff1'],
  ['이채린', '178 · 32-24-34', '#f3d4c0', '#d7b16a', '#fff3e0'],
  ['최민재', '189 · 신발 285', '#e9c4a4', '#4e342e', '#e8f5e9'],
  ['서나린', '172 · 31-23-35', '#f0cdb4', '#111111', '#fce4ec'],
  ['정우진', '184 · 신발 270', '#dcb08c', '#5d4037', '#e3f2fd'],
  ['오하은', '177 · 32-24-35', '#f5d9c6', '#3b2a20', '#f3e5f5'],
  ['임태오', '186 · 신발 280', '#e0b896', '#9e9e9e', '#f1f8e9'],
];
function paintCard(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, i: number, big = false) {
  const [name, nums, skin, hair, bg] = MODELS[i % MODELS.length];
  rounded(c, x, y, w, h, 3, '#ffffff');
  const pw = w - 8;
  const ph = h * 0.68;
  c.fillStyle = bg;
  c.fillRect(x + 4, y + 4, pw, ph);
  const cx = x + 4 + pw / 2;
  const fy = y + 4 + ph * 0.42;
  const r = pw * 0.2;
  // Shoulders, neck, hair behind, the face, hair over.
  c.fillStyle = i % 2 ? '#37474f' : '#efebe9';
  c.beginPath();
  c.ellipse(cx, y + 4 + ph, pw * 0.42, ph * 0.26, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = skin;
  c.fillRect(cx - r * 0.35, fy + r * 0.7, r * 0.7, r * 0.9);
  c.fillStyle = hair;
  if (i % 2 === 0) {
    c.beginPath();
    c.ellipse(cx, fy + r * 0.5, r * 1.25, r * 1.6, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = skin;
  c.beginPath();
  c.ellipse(cx, fy, r * 0.85, r * 1.05, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = hair;
  c.beginPath();
  c.ellipse(cx, fy - r * 0.55, r * 0.95, r * 0.6, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = '#3a2a24';
  c.fillRect(cx - r * 0.42, fy - r * 0.05, r * 0.22, r * 0.08);
  c.fillRect(cx + r * 0.2, fy - r * 0.05, r * 0.22, r * 0.08);
  c.fillStyle = '#c4747a';
  c.fillRect(cx - r * 0.2, fy + r * 0.5, r * 0.4, r * 0.08);
  write(c, name, cx, y + 4 + ph + (h - ph) * 0.33, Math.round(h * (big ? 0.1 : 0.11)), '#1f1e22', 'center', true, pw);
  write(c, nums, cx, y + 4 + ph + (h - ph) * 0.68, Math.round(h * 0.07), '#7a6f64', 'center', false, pw);
}
/** The paper sweep's grey, a little lighter where it's lit. */
function paintSweep(c: CanvasRenderingContext2D) {
  const gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#d9d7d3');
  gr.addColorStop(0.6, '#efeeeb');
  gr.addColorStop(1, '#f6f5f2');
  c.fillStyle = gr;
  c.fillRect(0, 0, 64, 256);
}
/** A concept shoot's gel wash: magenta to teal. */
function paintGel(c: CanvasRenderingContext2D) {
  const gr = c.createLinearGradient(0, 0, 256, 128);
  gr.addColorStop(0, '#ff3fa4');
  gr.addColorStop(0.55, '#a35cff');
  gr.addColorStop(1, '#22d3c5');
  c.fillStyle = gr;
  c.fillRect(0, 0, 256, 128);
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * The walking lane (워킹 연습 라인, 2026-11-05, the layout audit: the agency had a show runway between two rows of seats; an agency
   * has a practice room, the show is somewhere else): a strip of grey dance vinyl on the floor with white tape down both edges and a
   * blush line down the middle to walk on, the start mark and the T at the end in gold tape; the room's mirror wall behind it, frames
   * and all, so the walk is watched from the side; the agency's roll-up banner at the start and a speaker on its stand at the end
   * (its light on and the music going for a rehearsal). Walked for real (mdWalk): down the line at a model's pace, a turn to the room
   * and a pose with a hand on the hip, a three-quarter turn and a second pose, turned round and walked back.
   */
  catwalk(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const deckH = 0;
    const x0 = -W / 2 + 0.1;
    const x1 = W / 2 - 0.1;
    const len = x1 - x0;
    const xc = (x0 + x1) / 2;
    const dw = Math.min(D, 1) - 0.3;
    const zc = 0.08;
    // The vinyl, its edge tapes and the line down the middle.
    part(g, box(len, 0.006, dw), '#b9b6b1', xc, 0.003, zc, { outline: false });
    for (const sz of [-1, 1]) part(g, box(len, 0.002, 0.03), '#ffffff', xc, 0.008, zc + sz * (dw / 2 - 0.02), { outline: false });
    part(g, box(RUNWAY.x1 - RUNWAY.x0 + 0.24, 0.002, 0.025), BLUSH, (RUNWAY.x0 + RUNWAY.x1) / 2, 0.009, 0, { outline: false });
    // The marks: where the walk starts, and the T at the end.
    part(g, box(0.02, 0.002, 0.3), GOLD, RUNWAY.x0 - 0.12, 0.01, 0, { outline: false });
    part(g, box(0.2, 0.002, 0.024), GOLD, RUNWAY.x1 + 0.12, 0.01, 0, { outline: false });
    part(g, box(0.024, 0.002, 0.2), GOLD, RUNWAY.x1 + 0.12, 0.01, 0, { outline: false });
    // The mirror wall behind: panels a metre wide in thin black frames, a skirting under them.
    const mz = -D / 2 + 0.03;
    part(g, box(W - 0.04, 0.12, 0.04), BLACK, 0, 0.06, mz);
    for (let i = 0; i < Math.round(W); i++) {
      const px = -W / 2 + 0.5 + i;
      const pane = new THREE.Mesh(box(0.96, 2.0, 0.02), MIRROR);
      pane.position.set(px, 1.14, mz + 0.01);
      g.add(pane);
      part(g, box(0.02, 2.04, 0.03), BLACK, px - 0.49, 1.14, mz + 0.015, { outline: false });
    }
    part(g, box(0.02, 2.04, 0.03), BLACK, W / 2 - 0.01, 1.14, mz + 0.015, { outline: false });
    part(g, box(W - 0.04, 0.03, 0.04), BLACK, 0, 2.16, mz + 0.01, { outline: false });
    // The roll-up banner at the start, beside the line.
    const bx = -W / 2 + 0.16;
    const bz = -D / 2 + 0.22;
    part(g, rbox(0.1, 0.06, 0.5, 0.02), '#9e9e9e', bx, 0.03, bz);
    face(g, litMat('mdEntrance', 192, 512, paintEntrance), 0.46, 1.25, bx + 0.01, 0.72, bz, Math.PI / 2);
    // The speaker at the end on its stand, lit while a rehearsal plays.
    const sx = W / 2 - 0.2;
    const sz = -D / 2 + 0.2;
    part(g, cyl(0.015, 0.015, 0.9, 8), INK, sx, 0.45, sz, { outline: false });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, V(sx, 0.25, sz), V(sx + Math.sin(a) * 0.16, 0.01, sz + Math.cos(a) * 0.16), 0.006, INK);
    }
    part(g, rbox(0.22, 0.34, 0.2, 0.02), BLACK, sx, 1.07, sz, { ry: -Math.PI / 2 });
    part(g, cyl(0.07, 0.07, 0.01, 16), '#3a3940', sx - 0.1, 1.03, sz, { rz: Math.PI / 2, outline: false });
    part(use, ball(0.012), '#7dff9a', sx - 0.11, 1.19, sz, { outline: false, material: glow('#7dff9a') });
    // Where the walk goes (moved along by the round) and the fixed mark its clock goes by.
    const mark = marker(g, 0, 1.0, 0);
    const practice = stoodAt(g, RUNWAY.x0, deckH + 0.012, 0, 'mdWalk', mark, Math.PI / 2);
    const show = stoodAt(g, RUNWAY.x0, deckH + 0.012, 0, 'mdWalk', mark, Math.PI / 2);
    out.work = mark;
    out.animate = (t) => {
      const w = walkAt(t, phaseOf(mark));
      for (const s of [practice, show]) {
        s.at.position.set(w.x, deckH + 0.012, w.z);
        s.at.rotation.y = w.yaw;
      }
    };
    out.spots = { '*': practice, catwalkPractice: practice, walkFashionShow: show, model_walkCoaching: practice, model_showRehearsal: practice, model_mentorRookies: practice };
  },

  /**
   * The posing spot (포즈 스팟): a seamless paper sweep hung from its roll between two stands and run
   * out over the floor, a pink T taped on the mark, an apple box to one side; a beauty dish on a boom
   * over the front, the camera on its tripod at the front right (its tally red while shooting) and a
   * wind machine at the front left. Posing (mdPose): one pose after another — a hand on the hip, the
   * chin on the hand, the hands in the hair, the arms folded, the pockets, the collar, the profile —
   * turned a little each time, the dish and the paper flashing twice a pose. A concept shoot
   * (mdConcept): the wind machine roaring, its ribbons streaming, a magenta-to-teal gel washed over
   * the paper, and wilder poses in the wind.
   */
  posingSpot(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const bw = Math.min(W - 0.24, 1.76);
    const bz = -D / 2 + 0.06;
    const top = 2.3;
    for (const sx of [-1, 1]) lightStand(g, sx * (bw / 2 + 0.04), bz + 0.02, top + 0.02, 0.18);
    part(g, cyl(0.012, 0.012, bw + 0.12, 10), BLACK, 0, top, bz + 0.02, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.06, 0.06, bw + 0.02, 20), '#e4e2de', 0, top - 0.07, bz + 0.03, { rz: Math.PI / 2 });
    const curveR = 0.3;
    const hang = top - 0.12 - curveR;
    const sweepMat = litMat('mdSweep', 64, 256, paintSweep);
    face(g, sweepMat, bw, hang, 0, curveR + hang / 2, bz + 0.02);
    const sweep = new THREE.Mesh(
      shape(`mdSweep${bw}`, () => new THREE.CylinderGeometry(curveR, curveR, bw, 16, 1, true, Math.PI, Math.PI / 2).rotateZ(Math.PI / 2)),
      new THREE.MeshToonMaterial({ color: '#f3f2ef', side: THREE.DoubleSide, gradientMap: gradient }),
    );
    sweep.userData.ownMaterial = true;
    sweep.position.set(0, curveR, bz + curveR + 0.02);
    g.add(sweep);
    const runD = D / 2 - (bz + curveR + 0.02) - 0.04;
    part(g, box(bw, 0.005, runD), '#f6f5f2', 0, 0.003, bz + curveR + 0.02 + runD / 2, { outline: false });
    // The mark.
    const markZ = -0.02;
    part(g, box(0.22, 0.003, 0.03), '#f48fb1', 0, 0.007, markZ + 0.08, { outline: false });
    part(g, box(0.03, 0.003, 0.16), '#f48fb1', 0, 0.007, markZ, { outline: false });
    // The apple box.
    const ab = frame(g, -0.66, 0, 0.06, 0.25);
    part(ab, rbox(0.46, 0.2, 0.3, 0.01), WOODL, 0, 0.1, 0);
    part(ab, rbox(0.12, 0.04, 0.005, 0.02), '#6d4c41', 0, 0.13, 0.151, { outline: false });
    // The flash on the paper, and a concept's gel washed over it.
    const flashWash = wash(use, bw, hang, 0, curveR + hang / 2, bz + 0.03, '#ffffff');
    const gel = wash(use, bw, hang, 0, curveR + hang / 2, bz + 0.032, '#ffffff', painted('mdGel', 256, 128, paintGel));
    // The beauty dish on a boom from behind the right, over the front.
    const dishAt = V(0.18, 2.02, 0.32);
    lightStand(g, W / 2 - 0.1, bz + 0.2, 1.9, 0.18);
    rod(g, V(W / 2 - 0.1, 1.9, bz + 0.2), dishAt, 0.012, BLACK);
    const dish = aimed(g, dishAt.x, dishAt.y, dishAt.z, V(0, 1.35, markZ));
    part(dish, cyl(0.2, 0.08, 0.1, 24, ), '#e9e9ea', 0, 0, 0, { rx: Math.PI / 2 });
    part(dish, cyl(0.06, 0.06, 0.04, 12), '#bdbdbd', 0, 0, 0.06, { rx: Math.PI / 2, outline: false });
    part(dish, cyl(0.08, 0.08, 0.12, 12), BLACK, 0, 0, -0.1, { rx: Math.PI / 2 });
    const dishUse = aimed(use, dishAt.x, dishAt.y, dishAt.z, V(0, 1.35, markZ));
    const dishFace = part(dishUse, cyl(0.19, 0.19, 0.005, 24), '#ffffff', 0, 0, 0.052, { rx: Math.PI / 2, outline: false, material: new THREE.MeshBasicMaterial({ color: '#fffaf0' }) });
    dishFace.userData.ownMaterial = true;
    // The camera on its tripod at the front right, aimed at the mark.
    const cx = W / 2 - 0.2;
    const cz = D / 2 - 0.08;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      rod(g, V(cx, 1.02, cz), V(cx + Math.sin(a) * 0.2, 0.01, cz + Math.cos(a) * 0.2), 0.009, INK);
    }
    part(g, cyl(0.014, 0.014, 0.2, 8), INK, cx, 1.1, cz, { outline: false });
    const camAt = aimed(g, cx, 1.24, cz, V(0, 1.15, markZ));
    camera(camAt, null);
    const tally = part(aimed(use, cx, 1.24, cz, V(0, 1.15, markZ)), ball(0.008), '#ff3b3b', 0.055, 0.04, 0.03, { outline: false, material: glow('#ff3b3b') });
    // The wind machine at the front left: a caged fan on its low stand, ribbons on the cage.
    const fx = -W / 2 + 0.24;
    const fz = D / 2 - 0.16;
    part(g, rbox(0.34, 0.06, 0.28, 0.02), INK, fx, 0.05, fz);
    for (const sx of [-1, 1]) part(g, cyl(0.012, 0.012, 0.4, 8), INK, fx + sx * 0.2, 0.3, fz, { outline: false });
    const fan = aimed(g, fx, 0.52, fz, V(0, 1.25, markZ));
    part(fan, cyl(0.24, 0.24, 0.16, 28, ), '#3a3940', 0, 0, 0, { rx: Math.PI / 2 });
    part(fan, ring(0.24, 0.012), '#9e9e9e', 0, 0, 0.082, { outline: false });
    for (let i = 0; i < 4; i++) part(fan, ring(0.05 + i * 0.05, 0.004), '#bdbdbd', 0, 0, 0.083, { outline: false });
    for (let i = 0; i < 6; i++) part(fan, box(0.48, 0.006, 0.004), '#bdbdbd', 0, 0, 0.084, { rz: (i / 6) * Math.PI, outline: false });
    const blades = new THREE.Group();
    blades.position.z = 0.03;
    fan.add(blades);
    for (let i = 0; i < 3; i++) {
      const bl = part(blades, rbox(0.09, 0.2, 0.01, 0.02), '#cfd8dc', 0, 0.1, 0, { outline: false });
      bl.position.set(Math.sin((i / 3) * Math.PI * 2) * 0.1, Math.cos((i / 3) * Math.PI * 2) * 0.1, 0);
      bl.rotation.set(0, 0.35, -(i / 3) * Math.PI * 2);
    }
    part(blades, cyl(0.035, 0.035, 0.05, 12), '#90a4ae', 0, 0, 0, { rx: Math.PI / 2, outline: false });
    const ribbons: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const rb = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.22).translate(0, -0.11, 0), new THREE.MeshBasicMaterial({ color: ['#f48fb1', '#ffffff', '#b39ddb', '#80deea'][i], side: THREE.DoubleSide }));
      rb.userData.ownGeometry = rb.userData.ownMaterial = true;
      rb.position.set(-0.15 + i * 0.1, 0.2, 0.09);
      fan.add(rb);
      ribbons.push(rb);
    }
    tag(g, 'WIND', 0.12, 0.035, fx, 0.06, fz + 0.142, 'none', '#e7cf9a');
    // Where they pose, and the fixed mark the clock goes by.
    const mark = marker(g, 0, 1.2, markZ);
    const pose = stoodAt(g, 0, 0, markZ, 'mdPose', mark, 0);
    const concept = stoodAt(g, 0, 0, markZ, 'mdConcept', mark, 0);
    out.work = mark;
    out.animate = (t) => {
      const now = nowAt([pose, concept], t) ?? pose;
      const isConcept = now === concept;
      const at = poseAt(isConcept, t, phaseOf(mark));
      now.at.rotation.y = at.twist;
      const f = poseFlash(at.v);
      setOpacity(flashWash, f * 0.7);
      dishFace.visible = f > 0.05;
      tally.visible = wave(t, 1) > -0.2;
      setOpacity(gel, isConcept ? 0.42 + 0.06 * wave(t, 0.4) : 0);
      blades.rotation.z = isConcept ? -t * 26 : blades.rotation.z;
      ribbons.forEach((r, i) => {
        r.rotation.x = isConcept ? -1.25 + 0.25 * wave(t, 3.1 + i * 0.4, i * 0.3) : 0;
        r.rotation.z = isConcept ? 0.2 * wave(t, 2.3, i * 0.17) : 0;
      });
    };
    out.spots = { '*': pose, practicePoses: pose, portfolioShoot: pose, model_conceptShoot: concept };
  },

  /**
   * The vanity (분장 거울): a blush-white dressing table with a drawer pedestal, a mirror framed in
   * Hollywood bulbs (lit while it's used), polaroids and the day's call sheet tucked in its frame, a
   * cup of brushes, a palette, lipsticks, a perfume bottle and a tissue box on the top, and a round
   * stool before it. Making up (mdMakeup), sat on the stool: the compact in the left hand and a sponge
   * dabbed on each cheek, the powder brush swept over them, the mascara with the chin up, the lipstick
   * along the lips, then leant in to look it over — each tool drawn in the right hand. Practising
   * expressions (mdExpress): the face framed in the palms, the chin on the fist, a smile pushed up,
   * the brows, leant in close, a look over the shoulder. A musical number is sung stood behind the
   * stool to the mirror.
   */
  makeupMirror(g, W, _D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const D = 1;
    const tw = Math.min(W, 1) - 0.08;
    const tz = -D / 2 + 0.2;
    const topY = 0.76;
    part(g, rbox(tw, 0.04, 0.36, 0.015), WHITE, 0, topY - 0.02, tz);
    part(g, rbox(0.26, topY - 0.04, 0.34, 0.015), '#f3ece6', tw / 2 - 0.14, (topY - 0.04) / 2, tz);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.22, 0.005, 0.005), '#d9cfc5', tw / 2 - 0.14, 0.18 + i * 0.22, tz + 0.172, { outline: false });
      part(g, cyl(0.008, 0.008, 0.05, 8), GOLD, tw / 2 - 0.14, 0.26 + i * 0.22, tz + 0.18, { rz: Math.PI / 2, outline: false });
    }
    for (const sz of [-1, 1]) part(g, cyl(0.016, 0.012, topY - 0.04, 8), GOLD, -tw / 2 + 0.05, (topY - 0.04) / 2, tz + sz * 0.14, { outline: false });
    // The mirror and its bulbs.
    const mz = -D / 2 + 0.03;
    const mw = tw - 0.1;
    const mh = 0.86;
    const my = topY + 0.08 + mh / 2;
    part(g, rbox(mw + 0.12, mh + 0.12, 0.04, 0.02), '#f6efe9', 0, my, mz);
    const glass = new THREE.Mesh(box(mw - 0.04, mh - 0.04, 0.008), MIRROR);
    glass.position.set(0, my, mz + 0.022);
    g.add(glass);
    const bulbs: Array<[number, number]> = [];
    for (let i = 0; i < 5; i++) bulbs.push([-mw / 2 + (i * mw) / 4, my + mh / 2 + 0.03]);
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) bulbs.push([sx * (mw / 2 + 0.03), my - mh / 2 + 0.08 + (i * (mh - 0.12)) / 3]);
    for (const [bx, by] of bulbs) {
      part(g, ball(0.026), '#efe6d2', bx, by, mz + 0.035, { outline: false });
      part(use, ball(0.028), '#fff4cf', bx, by, mz + 0.036, { outline: false, material: glow('#fff2c6') });
    }
    // Polaroids and the call sheet tucked in the frame.
    const pol = painted('mdPolaroids', 128, 64, (c) => {
      for (let i = 0; i < 2; i++) {
        rounded(c, 4 + i * 64, 2, 56, 60, 2, '#ffffff');
        c.fillStyle = ['#e9e2f5', '#fbe9e7'][i];
        c.fillRect(9 + i * 64, 7, 46, 40);
        c.fillStyle = ['#f1d2bd', '#f3d4c0'][i];
        c.beginPath();
        c.ellipse(32 + i * 64, 27, 9, 11, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = ['#2b1b14', '#d7b16a'][i];
        c.fillRect(22 + i * 64, 14, 20, 7);
      }
    });
    sheet(g, pol, 0.2, 0.1, -mw / 2 + 0.12, my + mh / 2 - 0.1, mz + 0.028, 0, 0);
    tag(g, '콜타임 14:00 · 룩 3', 0.2, 0.045, mw / 2 - 0.14, my - mh / 2 + 0.1, mz + 0.028, '#fff59d', '#3e2723');
    // On the top: the brush cup, the palette, lipsticks, perfume, tissues.
    part(g, cyl(0.035, 0.03, 0.1, 14), '#f0d7cf', -tw / 2 + 0.12, topY + 0.05, tz - 0.06);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      const bx = -tw / 2 + 0.12 + Math.sin(a) * 0.015;
      const bzz = tz - 0.06 + Math.cos(a) * 0.015;
      rod(g, V(bx, topY + 0.05, bzz), V(bx + Math.sin(a) * 0.03, topY + 0.2, bzz + Math.cos(a) * 0.02), 0.005, ['#1f1e22', GOLD, '#8d6e63', '#1f1e22', BLUSH][i]);
      part(g, cyl(0.009, 0.004, 0.03, 8), ['#d7ccc8', '#3e2723', '#f8bbd0', '#efebe9', '#5d4037'][i], bx + Math.sin(a) * 0.034, topY + 0.215, bzz + Math.cos(a) * 0.022, { outline: false });
    }
    part(g, rbox(0.2, 0.015, 0.1, 0.006), BLACK, 0.0, topY + 0.008, tz + 0.04);
    ['#e8b4a0', '#d48a7c', '#b5651d', '#f3d2c1', '#8e5d4b', '#c97b84'].forEach((col, i) => part(g, cyl(0.014, 0.014, 0.004, 12), col, -0.07 + (i % 3) * 0.07, topY + 0.017, tz + 0.02 + Math.floor(i / 3) * 0.045, { outline: false }));
    for (let i = 0; i < 3; i++) {
      part(g, cyl(0.009, 0.009, 0.06, 10), GOLD, 0.13 + i * 0.03, topY + 0.03, tz - 0.08, { outline: false });
      part(g, cyl(0.007, 0.007, 0.018, 10), ['#c2185b', '#e57373', '#ad1457'][i], 0.13 + i * 0.03, topY + 0.069, tz - 0.08, { outline: false });
    }
    part(g, rbox(0.06, 0.08, 0.04, 0.012), '#f8e1e7', tw / 2 - 0.12, topY + 0.04, tz - 0.1, { material: GLASS });
    part(g, cyl(0.012, 0.012, 0.03, 10), GOLD, tw / 2 - 0.12, topY + 0.095, tz - 0.1, { outline: false });
    part(g, rbox(0.14, 0.07, 0.08, 0.01), '#ffffff', tw / 2 - 0.13, topY + 0.035, tz + 0.06);
    part(g, box(0.05, 0.03, 0.03), '#ffffff', tw / 2 - 0.13, topY + 0.08, tz + 0.06, { outline: false });
    // The stool.
    const sz0 = 0.2;
    const seat = 0.5;
    part(g, cyl(0.17, 0.17, 0.08, 20), BLUSH, 0, seat - 0.04, sz0);
    part(g, cyl(0.025, 0.025, seat - 0.08, 10), CHROME, 0, (seat - 0.08) / 2, sz0, { outline: false });
    part(g, ring(0.13, 0.01), CHROME, 0, 0.2, sz0, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.17, 0.19, 0.03, 20), CHROME, 0, 0.015, sz0, { outline: false });
    // Where it's used; the tools in the hands.
    const work = marker(g, 0, topY + 0.3, tz);
    const makeup = satAt(g, 0, sz0, 'mdMakeup', work, seat);
    const express = satAt(g, 0, sz0, 'mdExpress', work, seat);
    const sing = stoodAt(g, 0, 0, 0.52, 'sing', work);
    const hold = holder(use);
    const compact = new THREE.Group();
    hold.add(compact);
    part(compact, cyl(0.04, 0.04, 0.014, 18), GOLD, 0, 0, 0, { outline: false });
    part(compact, cyl(0.032, 0.032, 0.004, 18), '#e8b4a0', 0, 0.008, 0, { outline: false });
    part(compact, cyl(0.04, 0.04, 0.006, 18), GOLD, 0, 0.035, -0.035, { rx: -1.3, outline: false });
    const tools: Record<string, THREE.Group> = {};
    const tool = (key: string, build: (p: THREE.Group) => void) => {
      const p = new THREE.Group();
      hold.add(p);
      build(p);
      tools[key] = p;
    };
    tool('sponge', (p) => part(p, ball(0.024), '#f6b8a8', 0, 0.01, 0.015, { outline: false }).scale.set(1, 1.3, 1));
    tool('brush', (p) => {
      part(p, cyl(0.005, 0.005, 0.14, 8), BLACK, 0, -0.03, 0, { outline: false });
      part(p, cyl(0.014, 0.007, 0.04, 10), '#d7b98c', 0, 0.055, 0.0, { outline: false });
    });
    tool('mascara', (p) => {
      part(p, cyl(0.007, 0.007, 0.09, 8), '#1f1e22', 0, -0.03, 0, { outline: false });
      part(p, cyl(0.003, 0.003, 0.04, 6), '#111111', 0, 0.035, 0, { outline: false });
    });
    tool('lipstick', (p) => {
      part(p, cyl(0.009, 0.009, 0.06, 10), GOLD, 0, -0.02, 0, { outline: false });
      part(p, cyl(0.007, 0.007, 0.02, 10), '#c2185b', 0, 0.02, 0.0, { outline: false });
    });
    out.work = work;
    out.animate = (t) => {
      const now = nowAt([makeup, express, sing], t);
      const making = now === makeup;
      hold.visible = making;
      if (!making) return;
      follow(hold, makeup);
      const k = heightOf(makeup) / 1.6;
      const at = makeupAt(t, phaseOf(work));
      const h = at.h;
      compact.visible = !!h.l && Math.abs(h.l.side - COMPACT_AT.side) < 0.03;
      if (h.l) put(compact, h.l, k, { side: -0.02, up: 0.02, ahead: 0.01 });
      for (const [key, p] of Object.entries(tools)) {
        p.visible = key === at.tag && !!h.r;
        if (p.visible && h.r) {
          put(p, h.r, k, { side: 0.0, up: 0.0, ahead: -0.01 });
          // Pointed at the face (tipped in towards it).
          p.rotation.set(key === 'lipstick' ? -1.2 : -0.6, 0, key === 'mascara' ? 1.3 : 0.3);
        }
      }
    };
    out.spots = { '*': express, getMakeup: makeup, practiceExpressions: express, actor_musicalNumber: sing };
  },

  /**
   * The casting table (캐스팅 테이블): a long white table on brushed-gold trestles, its front panel
   * saying STELLA MODELS · 2026 F/W CASTING to the model, name tents for the casting director, the
   * brand's MD and the photographer, a laptop open on a profile, a clipboard with the casting sheet,
   * polaroids laid out, a retro instant camera and water bottles; the casting directors sit behind it
   * in the chairs. A go-see (mdGoSee) on the taped X before it: the book handed over in both hands,
   * stood to the front, turned for each profile and the back, the polaroid going off each time, a
   * hand on the hip, a walk along the table and back, then talking it through.
   */
  mdCastingTable(g, W, _D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const tw = W - 0.2;
    const tz = -0.12;
    const td = 0.62;
    const topY = 0.74;
    part(g, rbox(tw, 0.04, td, 0.015), WHITE, 0, topY - 0.02, tz);
    for (const sx of [-1, 1]) {
      const lx = sx * (tw / 2 - 0.12);
      for (const sz of [-1, 1]) rod(g, V(lx, topY - 0.04, tz + sz * 0.22), V(lx, 0.02, tz + sz * 0.26), 0.014, GOLD);
      rod(g, V(lx, 0.25, tz - 0.25), V(lx, 0.25, tz + 0.25), 0.01, GOLD);
    }
    // The front panel to the model.
    const panel = painted('mdCastingPanel', 768, 96, (c) => {
      c.fillStyle = '#1f1e22';
      c.fillRect(0, 0, 768, 96);
      write(c, '★ STELLA MODELS', 34, 48, 34, '#e7cf9a');
      write(c, '2026 F/W CASTING · 캐스팅', 734, 48, 30, '#ffffff', 'right');
    });
    part(g, box(tw - 0.1, 0.42, 0.02), BLACK, 0, topY - 0.25, tz + td / 2 - 0.02);
    sheet(g, panel, tw - 0.14, 0.17, 0, topY - 0.17, tz + td / 2 - 0.008);
    // Name tents facing the model, one before each chair.
    const names = ['캐스팅 디렉터', '브랜드 MD', '포토그래퍼'];
    names.forEach((n, i) => {
      const x = (i - 1) * 0.95;
      const tent = frame(g, x + 0.22, topY + 0.03, tz + 0.2);
      part(tent, box(0.16, 0.06, 0.004), WHITE, 0, 0, 0.012, { rx: -0.35, outline: false });
      part(tent, box(0.16, 0.06, 0.004), WHITE, 0, 0, -0.012, { rx: 0.35, outline: false });
      tag(tent, n, 0.15, 0.04, 0, 0.002, 0.024, 'none', INK, 0, -0.35);
    });
    // The laptop (screen to the casting director), the clipboard, the polaroids, the camera, water.
    const lap = frame(g, -0.95, topY, tz - 0.05, Math.PI);
    part(lap, rbox(0.32, 0.015, 0.22, 0.008), '#cfd2d6', 0, 0.008, 0);
    const scr = frame(lap, 0, 0.012, -0.11, 0, -0.25);
    part(scr, rbox(0.32, 0.21, 0.01, 0.008), '#cfd2d6', 0, 0.105, 0);
    const prof = painted('mdLaptopProfile', 160, 104, (c) => {
      c.fillStyle = '#f7f5f1';
      c.fillRect(0, 0, 160, 104);
      paintCard(c, 8, 8, 56, 88, 2);
      write(c, '한지유', 74, 20, 14, '#1f1e22');
      write(c, '174 · 31-23-34', 74, 40, 10, '#7a6f64', 'left', false);
      write(c, '신발 240 · 갈색 눈', 74, 56, 10, '#7a6f64', 'left', false);
      rounded(c, 74, 72, 70, 18, 4, '#c9a96a');
      write(c, '콜백 ✓', 109, 81, 11, '#ffffff', 'center');
    });
    sheet(scr, prof, 0.3, 0.19, 0, 0.105, 0.006);
    const cb = frame(g, -0.42, topY + 0.004, tz - 0.06, 0.15);
    part(cb, rbox(0.22, 0.008, 0.3, 0.005), '#8d6e63', 0, 0, 0);
    const sheetTex = painted('mdCastSheet', 96, 128, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 96, 128);
      write(c, '캐스팅 시트', 48, 12, 11, '#1f1e22', 'center');
      for (let i = 0; i < 8; i++) {
        c.fillStyle = '#d7ccc8';
        c.fillRect(8, 26 + i * 12, 60, 3);
        write(c, i % 3 === 0 ? '✓' : i % 3 === 1 ? '△' : '', 82, 28 + i * 12, 10, i % 3 === 0 ? '#2e7d32' : '#f57c00', 'center');
      }
    });
    sheet(cb, sheetTex, 0.2, 0.27, 0, 0.006, 0.01, 0, -Math.PI / 2);
    part(cb, rbox(0.08, 0.02, 0.025, 0.006), CHROME, 0, 0.012, -0.14, { outline: false });
    const polaroids = painted('mdPolaroidRow', 256, 64, (c) => {
      for (let i = 0; i < 4; i++) {
        rounded(c, 4 + i * 64, 2, 56, 60, 2, '#ffffff');
        c.save();
        c.beginPath();
        c.rect(8 + i * 64, 6, 48, 42);
        c.clip();
        paintCard(c, 6 + i * 64, 4, 52, 70, i + 4);
        c.restore();
      }
    });
    sheet(g, polaroids, 0.44, 0.11, 0.3, topY + 0.003, tz + 0.05, 0.05, -Math.PI / 2);
    // The instant camera.
    const ic = frame(g, 0.95, topY, tz - 0.02, Math.PI + 0.3);
    part(ic, rbox(0.14, 0.11, 0.08, 0.025), '#90caf9', 0, 0.055, 0);
    part(ic, cyl(0.032, 0.032, 0.03, 18), '#263238', 0, 0.05, 0.05, { rx: Math.PI / 2 });
    part(ic, box(0.04, 0.025, 0.004), '#fafafa', 0.045, 0.09, 0.041, { outline: false });
    const icFlash = part(frame(use, 0.95, topY, tz - 0.02, Math.PI + 0.3), box(0.042, 0.027, 0.004), '#ffffff', 0.045, 0.09, 0.043, { outline: false, material: glow('#ffffff') });
    for (let i = 0; i < 3; i++) {
      const bx = -0.7 + i * 0.95;
      part(g, cyl(0.03, 0.03, 0.2, 12), '#b3e5fc', bx, topY + 0.1, tz - 0.22, { material: GLASS });
      part(g, cyl(0.018, 0.018, 0.03, 10), '#1976d2', bx, topY + 0.215, tz - 0.22, { outline: false });
    }
    // The book: on the table before the casting director, or held out in the hands.
    const bookModel = (p: THREE.Object3D) => {
      part(p, rbox(0.3, 0.025, 0.38, 0.006), '#1f1e22', 0, 0, 0);
      part(p, box(0.28, 0.004, 0.36), '#f7f5f1', 0, 0.014, 0, { outline: false });
      tag(p, 'STELLA', 0.12, 0.03, 0, 0.0145, -0.12, 'none', '#c9a96a', 0, -Math.PI / 2);
    };
    const onTable = frame(g, 0, topY + 0.013, tz - 0.02);
    bookModel(onTable);
    const hold = holder(use);
    const inHand = new THREE.Group();
    hold.add(inHand);
    bookModel(inHand);
    // The X before it (taped on the floor where the model stands; drawn while in use so it's out of the table's body).
    for (const r of [Math.PI / 4, -Math.PI / 4]) part(use, box(0.26, 0.003, 0.035), GOLD, 0, 0.006, GOSEE.z, { ry: r, outline: false });
    const mark = marker(g, 0, 0.9, 0);
    const gosee = stoodAt(g, 0, 0, GOSEE.z, 'mdGoSee', mark);
    out.work = mark;
    out.animate = (t) => {
      const at = goSeeAt(t, phaseOf(mark));
      gosee.at.position.set(at.x, 0, at.z);
      gosee.at.rotation.y = at.yaw;
      follow(hold, gosee);
      const k = heightOf(gosee) / 1.6;
      const held = at.beat === 'book' && at.v > 0.35 && at.v < at.len - 0.3;
      inHand.visible = held;
      onTable.visible = !held;
      put(inHand, BOOK_OUT, k, { side: 0, up: 0.01, ahead: 0 });
      const shot = at.beat === 'front' || at.beat === 'profile' || at.beat === 'back' || at.beat === 'hip';
      icFlash.visible = shot && Math.abs(at.v - 0.9) < 0.07;
    };
    out.spots = { '*': gosee, mdGoSee: gosee };
  },

  /**
   * The fitting podium (피팅 포디움): a round podium carpeted in greige with a gold rim before a
   * three-way mirror in gold frames, a stadiometer up the middle panel with its head bar, a little
   * round table of the fitter's things (a pin cushion bristling with pins, the tape's coil, tailor's
   * chalk, the size card on a clipboard). Measured (mdMeasure), stood on it and turned a quarter at a
   * time: the arms out while the yellow tape goes round the bust, side on for the waist, to the
   * mirror with the hands on the hips for the hips, side on again while the head bar comes down for
   * the height, and to the front.
   */
  mdFittingPodium(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const px = -0.25;
    const pz = 0.04;
    const ph = 0.18;
    part(g, cyl(0.42, 0.44, ph, 32), '#e9e4dc', px, ph / 2, pz);
    part(g, cyl(0.4, 0.4, 0.008, 32), GREIGE, px, ph + 0.004, pz, { outline: false });
    part(g, ring(0.43, 0.012), GOLD, px, ph - 0.01, pz, { rx: Math.PI / 2, outline: false });
    // The three-way mirror.
    const mz = -D / 2 + 0.08;
    const mh = 1.9;
    const panel = (p: THREE.Object3D, w: number) => {
      part(p, rbox(w + 0.06, mh + 0.06, 0.04, 0.015), GOLD, 0, mh / 2 + 0.12, 0);
      const gl = new THREE.Mesh(box(w - 0.02, mh - 0.02, 0.006), MIRROR);
      gl.position.set(0, mh / 2 + 0.12, 0.022);
      p.add(gl);
      for (const sx of [-1, 1]) part(p, rbox(0.05, 0.12, 0.05, 0.01), GOLD, sx * (w / 2 - 0.02), 0.06, 0.0);
    };
    const cw = 0.66;
    panel(frame(g, px, 0, mz), cw);
    for (const sx of [-1, 1]) {
      const sw = 0.42;
      const hinge = frame(g, px + sx * (cw / 2 + 0.03), 0, mz, sx * -0.6);
      panel(frame(hinge, sx * (sw / 2 + 0.03), 0, 0), sw);
    }
    // The stadiometer up the middle panel, and its head bar.
    const sx0 = px;
    const sz0 = mz + 0.06;
    part(g, rbox(0.06, 2.0, 0.025, 0.006), WHITE, sx0, 1.0 + 0.12, sz0);
    const ruler = painted('mdRuler', 32, 512, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 32, 512);
      for (let i = 0; i <= 100; i++) {
        c.fillStyle = '#5d4037';
        c.fillRect(0, 512 - i * 5.12, i % 10 === 0 ? 20 : i % 5 === 0 ? 14 : 8, 1.4);
        if (i % 10 === 0 && i > 0) write(c, String(100 + i), 26, 512 - i * 5.12 - 6, 8, '#3e2723', 'center', false);
      }
    });
    sheet(g, ruler, 0.05, 1.0, sx0, 1.5 + 0.12, sz0 + 0.014);
    const headBar = (p: THREE.Object3D) => {
      const b = new THREE.Group();
      p.add(b);
      part(b, rbox(0.09, 0.03, 0.06, 0.008), GOLD, sx0, 0, sz0 + 0.03);
      part(b, box(0.03, 0.012, 0.36), GOLD, sx0, -0.004, sz0 + 0.2, { outline: false });
      b.position.y = 2.05;
      return b;
    };
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    headBar(idle);
    const bar = headBar(use);
    // The fitter's table.
    const fx = W / 2 - 0.26;
    const fz = 0.0;
    part(g, cyl(0.2, 0.2, 0.025, 24), WHITE, fx, 0.66, fz);
    part(g, cyl(0.018, 0.018, 0.64, 10), GOLD, fx, 0.33, fz, { outline: false });
    part(g, cyl(0.14, 0.16, 0.02, 20), GOLD, fx, 0.01, fz, { outline: false });
    part(g, ball(0.045), '#c62828', fx - 0.08, 0.705, fz + 0.04).scale.set(1, 0.7, 1);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      rod(g, V(fx - 0.08 + Math.sin(a) * 0.02, 0.72, fz + 0.04 + Math.cos(a) * 0.02), V(fx - 0.08 + Math.sin(a) * 0.045, 0.76, fz + 0.04 + Math.cos(a) * 0.045), 0.0018, CHROME);
      part(g, ball(0.005), ['#ffeb3b', '#2196f3', '#ffffff'][i % 3], fx - 0.08 + Math.sin(a) * 0.045, 0.762, fz + 0.04 + Math.cos(a) * 0.045, { outline: false });
    }
    part(g, cyl(0.035, 0.035, 0.02, 18), '#ffd54f', fx + 0.07, 0.684, fz + 0.06, { outline: false });
    part(g, box(0.05, 0.008, 0.03), '#eceff1', fx + 0.02, 0.677, fz - 0.1, { outline: false });
    const card = painted('mdSizeCard', 96, 128, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 96, 128);
      write(c, '사이즈 카드', 48, 12, 11, '#1f1e22', 'center');
      const rows = [['키', '176'], ['가슴', '84'], ['허리', '62'], ['힙', '90'], ['신발', '245']];
      rows.forEach(([a, b], i) => {
        write(c, a, 10, 34 + i * 19, 11, '#5d4037', 'left', false);
        write(c, b, 86, 34 + i * 19, 12, '#1f1e22', 'right');
        c.fillStyle = '#e0e0e0';
        c.fillRect(8, 42 + i * 19, 80, 1);
      });
    });
    const clip = frame(g, fx + 0.02, 0.682, fz - 0.02, -0.4);
    part(clip, rbox(0.13, 0.006, 0.17, 0.004), '#8d6e63', 0, 0, 0);
    sheet(clip, card, 0.12, 0.155, 0, 0.004, 0.005, 0, -Math.PI / 2);
    // The tape going round, drawn while it's used.
    const tape = new THREE.Group();
    use.add(tape);
    const loop = part(tape, ring(0.16, 0.007), '#ffd54f', 0, 0, 0, { rx: Math.PI / 2, outline: false, material: glow('#ffd54f') });
    const tail = part(tape, box(0.012, 0.18, 0.004), '#ffd54f', 0, -0.09, 0.16, { outline: false, material: glow('#ffd54f') });
    const mark = marker(g, px, 1.0, pz);
    const measure = stoodAt(g, px, ph + 0.008, pz, 'mdMeasure', mark, 0);
    out.work = mark;
    out.animate = (t) => {
      const at = measureAt(t, phaseOf(mark));
      measure.at.rotation.y = at.twist;
      const H = heightOf(measure);
      const k = H / 1.6;
      const v = at.v < 0 ? 0 : at.v;
      const pull = THREE.MathUtils.smoothstep(v, 0.1, 0.8);
      const ring0 = at.tag === 'bust' ? { y: 0.75, r: 0.16 } : at.tag === 'waist' ? { y: 0.63, r: 0.13 } : at.tag === 'hip' ? { y: 0.54, r: 0.17 } : null;
      tape.visible = !!ring0 && at.v >= 0;
      if (ring0) {
        tape.position.set(px, ph + ring0.y * H, pz);
        tape.rotation.y = at.twist;
        const r = ring0.r * k * (1.35 - 0.35 * pull);
        loop.scale.set(r / 0.16, r / 0.16 * 0.78, 1);
        tail.position.set(0, -0.09, r * 0.78);
      }
      // The head bar down to the head for the height, up out of the way else.
      const down = at.tag === 'height' && at.v >= 0 ? THREE.MathUtils.smoothstep(at.v, 0.1, 0.7) * (1 - THREE.MathUtils.smoothstep(at.v, 2.0, 2.4)) : 0;
      bar.position.y = 2.05 + (ph + H + 0.02 - 2.05) * down;
    };
    out.spots = { '*': measure, mdMeasure: measure };
  },

  /**
   * The backstage rack (백스테이지 룩 랙): a black rolling rail of the show's looks in running order —
   * dresses, a coat, a suit, a gown — each with its LOOK number and its polaroid clipped on, the
   * running order's board of polaroids over it, and under it a two-tier shelf of each look's shoes
   * (heels, boots, loafers, sneakers). A quick change (mdQuickChange): the next look's hanger taken
   * off the rail and held up against the body, hung back, crouched to the shoe shelf, a finger on
   * the running order.
   */
  mdBackstageRack(g, W, _D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const rz = -0.18;
    const rw = W - 0.16;
    const railY = 1.74;
    for (const sx of [-1, 1]) {
      part(g, cyl(0.016, 0.016, railY, 8), BLACK, sx * (rw / 2), railY / 2 + 0.03, rz, { outline: false });
      part(g, rbox(0.06, 0.03, 0.46, 0.01), BLACK, sx * (rw / 2), 0.06, rz + 0.04);
      for (const sz of [-1, 1]) part(g, cyl(0.025, 0.025, 0.03, 10), '#424242', sx * (rw / 2), 0.025, rz + 0.04 + sz * 0.2, { rz: Math.PI / 2, outline: false });
    }
    part(g, cyl(0.014, 0.014, rw + 0.04, 10), CHROME, 0, railY, rz, { rz: Math.PI / 2, outline: false });
    const looks: Array<['dress' | 'coat' | 'suit' | 'gown' | 'top', string, 'heel' | 'boot' | 'sneaker' | 'loafer', string]> = [
      ['dress', '#1f1e22', 'heel', '#1f1e22'],
      ['coat', '#c19a6b', 'boot', '#4e342e'],
      ['dress', '#b71c1c', 'heel', '#b71c1c'],
      ['suit', '#263238', 'loafer', '#1f1e22'],
      ['top', '#eceff1', 'sneaker', '#fafafa'],
      ['gown', '#e6dccf', 'heel', GOLD],
    ];
    const n = looks.length;
    const step = (rw - 0.2) / (n - 1);
    looks.forEach(([kind, col, sk, scol], i) => {
      const x = -rw / 2 + 0.1 + i * step;
      look(g, kind, col, x, railY, rz);
      tag(g, `LOOK ${i + 1}`, 0.1, 0.03, x, railY - 0.15, rz + 0.06, '#ffffff', INK);
      shoes(g, sk, scol, x, i % 2 ? 0.08 : 0.32, rz + 0.18);
    });
    // The shoe shelf.
    for (const y of [0.07, 0.31]) part(g, rbox(rw - 0.04, 0.02, 0.32, 0.006), '#3a3940', 0, y, rz + 0.17);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.32, 0.32), '#3a3940', sx * (rw / 2 - 0.03), 0.2, rz + 0.17);
    // The running order over it.
    const order = painted('mdRunningOrder', 512, 128, (c) => {
      c.fillStyle = '#1f1e22';
      c.fillRect(0, 0, 512, 128);
      write(c, 'RUNNING ORDER · 런웨이 순서', 256, 16, 15, '#e7cf9a', 'center');
      for (let i = 0; i < 6; i++) {
        const x = 12 + i * 83;
        rounded(c, x, 30, 74, 92, 2, '#ffffff');
        c.save();
        c.beginPath();
        c.rect(x + 4, 34, 66, 62);
        c.clip();
        paintCard(c, x + 2, 32, 70, 96, i);
        c.restore();
        write(c, `${i + 1}`, x + 37, 110, 14, '#1f1e22', 'center');
      }
    });
    part(g, rbox(rw - 0.1, 0.42, 0.02, 0.01), '#2b2a30', 0, 2.03, rz - 0.04);
    sheet(g, order, rw - 0.16, 0.38, 0, 2.03, rz - 0.028);
    for (const sx of [-1, 1]) rod(g, V(sx * (rw / 2 - 0.1), railY, rz - 0.04), V(sx * (rw / 2 - 0.1), 1.82, rz - 0.04), 0.008, BLACK);
    // The look in the hands.
    const hold = holder(use);
    const dress = new THREE.Group();
    hold.add(dress);
    look(dress, 'dress', '#b71c1c', 0, 0, 0);
    const mark = marker(g, 0, 1.2, rz);
    const change = stoodAt(g, 0, 0, 0.42, 'mdQuickChange', mark);
    out.work = mark;
    out.animate = (t) => {
      const at = quickChangeAt(t, phaseOf(mark));
      follow(hold, change);
      const k = heightOf(change) / 1.6;
      dress.visible = at.tag === 'dress';
      put(dress, DRESS_HOLD, k);
    };
    out.spots = { '*': change, mdQuickChange: change };
  },

  /**
   * The comp card printer (컴프 카드 프린터): a white desk with a big photo printer on the left — its
   * green light on, a card feeding out onto its tray — the monitor on the right showing the comp card
   * being laid out (윤서아 · 176 · 32-24-35), the keyboard and mouse, the printed cards stacked between,
   * a guillotine cutter and a box of card stock. Printing (mdCompCheck): the layout sent from the
   * keyboard, the card watched out of the printer, taken off the tray, held up and looked over, and
   * laid on the stack.
   */
  mdCompPrinter(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const topY = 0.76;
    const dz = -0.15;
    const dd = 0.6;
    part(g, rbox(W - 0.08, 0.04, dd, 0.015), WHITE, 0, topY - 0.02, dz);
    for (const sx of [-1, 1]) part(g, rbox(0.04, topY - 0.04, dd - 0.06, 0.01), '#d6d1ca', sx * (W / 2 - 0.08), (topY - 0.04) / 2, dz);
    // Where the one printing stands, and the desk's points from there (COMP, facing the desk).
    const sx = -0.1;
    const sz = D / 2;
    const deskAt = (o: BarOffset) => V(sx - o.side, o.up, sz - o.ahead);
    const keysAt = deskAt(COMP.keys);
    const trayAt = deskAt(COMP.tray);
    const stackAt = deskAt(COMP.stack);
    // The printer.
    const prx = trayAt.x - 0.02;
    part(g, rbox(0.6, 0.24, 0.42, 0.03), '#eceff1', prx, topY + 0.12, dz - 0.04);
    part(g, rbox(0.5, 0.05, 0.36, 0.02), '#cfd8dc', prx, topY + 0.265, dz - 0.05);
    part(g, box(0.4, 0.012, 0.01), '#37474f', prx, topY + 0.14, dz + 0.172, { outline: false });
    part(g, box(0.36, 0.006, 0.14), '#b0bec5', prx, topY + 0.1, dz + 0.24, { rx: -0.15, outline: false });
    part(g, rbox(0.08, 0.04, 0.012, 0.006), '#263238', prx + 0.2, topY + 0.2, dz + 0.172, { outline: false });
    tag(g, 'PHOTO PRO', 0.12, 0.025, prx - 0.15, topY + 0.21, dz + 0.173, 'none', '#607d8b');
    const ready = part(use, ball(0.008), '#69f0ae', prx + 0.24, topY + 0.2, dz + 0.175, { outline: false, material: glow('#69f0ae') });
    // The card: feeding out, in the hands, on the stack.
    const cardTex = painted('mdCompCard', 64, 96, (c) => paintCard(c, 0, 0, 64, 96, 0, true));
    const cardModel = (p: THREE.Object3D) => {
      part(p, box(0.1, 0.002, 0.15), '#ffffff', 0, 0, 0, { outline: false });
      sheet(p, cardTex, 0.1, 0.15, 0, 0.0015, 0, 0, -Math.PI / 2);
    };
    const feeding = new THREE.Group();
    use.add(feeding);
    cardModel(feeding);
    const hold = holder(use);
    const held = new THREE.Group();
    hold.add(held);
    const heldCard = new THREE.Group();
    heldCard.rotation.x = Math.PI / 2 - 0.25;
    held.add(heldCard);
    cardModel(heldCard);
    // The stack (one more on it once it's laid down).
    for (let i = 0; i < 6; i++) {
      const c = frame(g, stackAt.x + (i % 2) * 0.003, topY + 0.002 + i * 0.003, stackAt.z - 0.02, i * 0.03);
      cardModel(c);
    }
    const laid = frame(use, stackAt.x, topY + 0.022, stackAt.z - 0.02, 0.1);
    cardModel(laid);
    // The monitor, keyboard and mouse.
    const mx = keysAt.x + 0.08;
    part(g, rbox(0.2, 0.015, 0.14, 0.006), '#cfd2d6', mx, topY + 0.008, dz - 0.16);
    part(g, rbox(0.03, 0.22, 0.03, 0.01), '#cfd2d6', mx, topY + 0.12, dz - 0.18);
    part(g, rbox(0.56, 0.36, 0.03, 0.012), '#2b2a30', mx, topY + 0.38, dz - 0.18);
    const layout = painted('mdCompLayout', 256, 160, (c) => {
      c.fillStyle = '#e9e7e3';
      c.fillRect(0, 0, 256, 160);
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 256, 16);
      write(c, '컴프카드_윤서아_2026.psd', 8, 8, 9, '#455a64', 'left', false);
      paintCard(c, 16, 24, 80, 124, 0, true);
      for (let i = 0; i < 4; i++) paintCard(c, 108 + (i % 2) * 70, 24 + Math.floor(i / 2) * 64, 62, 58, [0, 2, 4, 6][i]);
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.32), new THREE.MeshBasicMaterial({ map: layout }));
    scr.userData.ownGeometry = scr.userData.ownMaterial = true;
    scr.position.set(mx, topY + 0.38, dz - 0.164);
    g.add(scr);
    part(g, rbox(0.4, 0.02, 0.13, 0.008), '#eceff1', keysAt.x, topY + 0.01, keysAt.z - 0.02);
    for (let r = 0; r < 4; r++) part(g, box(0.36, 0.004, 0.022), '#cfd8dc', keysAt.x, topY + 0.021, keysAt.z - 0.065 + r * 0.03, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#eceff1', keysAt.x + 0.27, topY + 0.01, keysAt.z - 0.02);
    // The guillotine and the card stock.
    const gx = W / 2 - 0.2;
    part(g, rbox(0.26, 0.02, 0.3, 0.006), '#90a4ae', gx, topY + 0.01, dz - 0.0);
    rod(g, V(gx - 0.12, topY + 0.03, dz + 0.13), V(gx + 0.1, topY + 0.13, dz - 0.12), 0.008, CHROME);
    part(g, ball(0.02), '#212121', gx + 0.1, topY + 0.13, dz - 0.12, { outline: false });
    part(g, rbox(0.3, 0.12, 0.22, 0.01), GREIGE_D, -W / 2 + 0.2, 0.06, dz + 0.05);
    tag(g, 'CARD STOCK', 0.18, 0.035, -W / 2 + 0.2, 0.08, dz + 0.162, 'none', '#ffffff');
    const mark = marker(g, 0, topY + 0.2, dz);
    const print = stoodAt(g, sx, 0, sz, 'mdCompCheck', mark);
    out.work = mark;
    out.animate = (t) => {
      const at = compAt(t, phaseOf(mark));
      follow(hold, print);
      const k = heightOf(print) / 1.6;
      // Steps: 0 typing, 1 the card feeding, 2 taken off the tray, 3 looked over, 4 laid on the stack.
      const { i, v } = at;
      ready.visible = i !== 1 || wave(t, 3) > 0;
      // Out of the slot onto the tray while it feeds, waiting there to be taken.
      const feed = i === 1 ? THREE.MathUtils.clamp(v < 0 ? 1 : v / 1.8, 0, 1) : 1;
      feeding.visible = i === 1 || (i === 2 && v >= 0 && v < 0.5);
      feeding.position.set(prx, topY + 0.13 - 0.03 * feed, dz + 0.17 + 0.09 * feed);
      feeding.rotation.x = -0.15;
      held.visible = (i === 2 && (v < 0 || v >= 0.5)) || i === 3 || (i === 4 && v >= 0 && v < 0.6);
      const h = at.h;
      if (h.l && h.r) held.position.set(((h.l.side + h.r.side) / 2) * k, ((h.l.up + h.r.up) / 2) * k + 0.02, ((h.l.ahead + h.r.ahead) / 2) * k);
      laid.visible = i === 4 && (v < 0 || v >= 0.6);
    };
    out.spots = { '*': print, mdPrintComps: print };
  },

  /**
   * The comp card wall (소속 모델 컴프 카드 월), in the lobby: a black board in a gold frame headed
   * STELLA MODELS · 소속 모델 · NEW FACES 2026, two rows of the agency's models' comp cards (the face,
   * the name, the height and sizes), two little picture lights over it. Set dressing.
   */
  mdCompBoard(g, W, D, _c, _def, ctx, out) {
    const bw = W - 0.2;
    const bh = 1.15;
    const by = ctx.againstWall ? 1.5 : 1.35;
    const z = -D / 2 + (ctx.againstWall ? 0.03 : 0.15);
    if (!ctx.againstWall) for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, by + bh / 2, 8), GOLD, sx * (bw / 2 - 0.1), (by + bh / 2) / 2, z - 0.02, { outline: false });
    part(g, rbox(bw + 0.06, bh + 0.06, 0.04, 0.01), GOLD, 0, by, z);
    const tex = painted('mdCompWall', 768, 448, (c) => {
      c.fillStyle = '#1f1e22';
      c.fillRect(0, 0, 768, 448);
      write(c, '★ STELLA MODELS', 24, 30, 30, '#e7cf9a');
      write(c, '소속 모델 · NEW FACES 2026', 744, 30, 22, '#ffffff', 'right');
      c.fillStyle = '#c9a96a';
      c.fillRect(24, 54, 720, 2);
      for (let i = 0; i < 10; i++) paintCard(c, 24 + (i % 5) * 146, 70 + Math.floor(i / 5) * 186, 132, 176, i, true);
    });
    sheet(g, tex, bw, bh, 0, by, z + 0.022);
    for (const sx of [-1, 1]) {
      const lx = sx * bw * 0.25;
      rod(g, V(lx, by + bh / 2 + 0.02, z + 0.02), V(lx, by + bh / 2 + 0.1, z + 0.14), 0.008, GOLD);
      part(g, cyl(0.025, 0.03, 0.16, 12), GOLD, lx, by + bh / 2 + 0.1, z + 0.15, { rz: Math.PI / 2 });
      part(g, box(0.14, 0.004, 0.03), '#fff3d6', lx, by + bh / 2 + 0.078, z + 0.15, { outline: false, material: glow('#fff3d6') });
    }
    out.work = marker(g, 0, by, z + 0.1);
  },
  // The front desk and the building's entrance on the pavement (2026-11-05, the layout audit; frontDesk.ts).
  mdReception(g, W, D) {
    frontDesk(g, W, D, { name: 'STELLA MODELS', body: BLACK, top: GOLD, fg: '#e7cf9a', bg: BLACK, flowers: '#ffffff' });
  },
  /**
   * The agency's entrance on the street: the canopy over the glass door with the name along its edge, and beside the path the
   * building's pylon with the floors on it — the agency on all of them, the walking room, the studio, the casting room.
   */
  mdStreetSign(g) {
    const zf = 14 - 15.5 + 0.09;
    const cx = 12.5 - 10.5;
    part(g, box(2.4, 0.1, 0.9), BLACK, cx, 2.55, zf + 0.45);
    label(g, 'STELLA MODELS', 1.8, 0.09, cx, 2.55, zf + 0.905, BLACK, '#e7cf9a');
    for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, 0.9, 8), CHROME, cx + sx * 1.1, 2.62, zf + 0.45, { rx: 0.9, outline: false });
    part(g, rbox(0.5, 2.3, 0.16, 0.03), BLACK, 0, 1.15, 0);
    part(g, box(0.52, 0.04, 0.18), GOLD, 0, 2.3, 0, { outline: false });
    label(g, 'STELLA', 0.4, 0.12, 0, 2.05, 0.085, BLACK, '#ffffff');
    label(g, 'MODELS', 0.4, 0.1, 0, 1.9, 0.085, BLACK, '#e7cf9a');
    const floors = ['모델 에이전시', '워킹 연습실', '프로필 스튜디오', '캐스팅룸'];
    floors.forEach((f, i) => label(g, f, 0.42, 0.08, 0, 1.6 - i * 0.16, 0.085, '#2b2a30', '#e0d7ca'));
  },
};
