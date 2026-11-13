import * as THREE from 'three';
import { marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';
import { pavementSign } from './dentist';
import { frontDesk } from './frontDesk';

/**
 * The game studio drawn as itself (2026-10-27 workplace pipeline, at the user's request): a Korean
 * studio's dev floor — dual monitors with the code on one and the engine's editor on the other, a
 * QA board of bug tickets under a P0 beacon, the level designer's wall map over a greybox maquette,
 * a play-test seat with its dev kit, pad and recording camera, the archive shelf any office shares —
 * and what it was missing: the build server with its CI tower light, the QA rack of phones and
 * tablets, the concept artist's pen display, the lobby's case of figures and awards, the pantry's
 * snack bar. The studio is 스타포지 (STARFORGE); its games 별의 전설 (an RPG) and 슬라임 러시 (a
 * platformer). Each use puts the worker where it's done: sat typing at the code, sat with a pad in
 * both hands playing the build, stood at the board moving tickets, at the map drawing a route, at
 * the server's pull-out console, at the rack tapping through a tablet, sat over the pen display.
 */

const BLACK = '#25262b';
const CHROME = '#dfe4e8';
const ALU = '#c3c9ce';
const VIOLET = '#7e57c2';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const MONO = '"Consolas","D2Coding","Menlo",monospace';

/** Lit parts (LEDs, lamps): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

/** See-through parts: cabinet glass, a fridge door, a slime. */
const GLASS = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.28, depthWrite: false });
const SLIME = new THREE.MeshToonMaterial({ color: '#7ee07e', transparent: true, opacity: 0.82 });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
const cone = (r: number, h: number, seg = 12) => shape(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));

/** Pictures painted once a key (screens, the boards, labels). */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
/** A flat picture facing +z (turned by `ry`, tipped by `rx`), always seen in its own colours. */
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  g.add(m);
  return m;
}
/** Words on a plate, `bg` behind them (or nothing for 'none'). */
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0, bold = true): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}|${bold}`, cw, ch, (x2) => {
    if (bg !== 'none') {
      x2.fillStyle = bg;
      x2.fillRect(0, 0, cw, ch);
    }
    x2.fillStyle = fg;
    x2.font = `${bold ? 'bold ' : ''}${Math.round(ch * 0.62)}px ${FONT}`;
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A screen with a picture on it that the lot lights while it's used: handed out as `out.screen`. */
function screenOf(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: '#2a3140' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A group placed and turned in `g` (a monitor's panel, a tilted pad). */
function frame(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Group {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.set(rx, ry, 0, 'YXZ');
  g.add(f);
  return f;
}

/** A spot sat in a chair facing -z (back to the object's front, at its desk), and what's done there. */
function satAt(g: THREE.Object3D, z: number, motion: Motion, work: THREE.Object3D, seat = 0.48): Spot {
  const s = spot(g, 'sit', 0, seat, z, Math.PI, seat);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot stood at (x, z) facing `yaw` (π: at the object, from its front), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}

/**
 * A gaming chair facing +z in its own group, its seat `h` up: a five-star base on casters, a bucket
 * seat with bolsters, a tall winged back with the accent stripes, a headrest and a lumbar cushion.
 */
function gamingChair(c: THREE.Object3D, h: number, accent: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.27, 0.045, Math.cos(a) * 0.27), 0.017, BLACK);
    part(c, ball(0.026), BLACK, Math.sin(a) * 0.27, 0.026, Math.cos(a) * 0.27, { outline: false });
  }
  part(c, cyl(0.026, 0.026, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.48, 0.09, 0.46, 0.04), BLACK, 0, h + 0.02, 0);
  for (const sx of [-1, 1]) part(c, rbox(0.06, 0.06, 0.44, 0.025), accent, sx * 0.22, h + 0.07, 0, { outline: false });
  // The back, tipped back a little, its wings and stripes, the headrest pillow and the lumbar one.
  const back = frame(c, 0, h + 0.05, -0.22, 0, -0.12);
  part(back, rbox(0.5, 0.82, 0.09, 0.05), BLACK, 0, 0.41, 0);
  for (const sx of [-1, 1]) {
    part(back, rbox(0.07, 0.6, 0.12, 0.03), BLACK, sx * 0.23, 0.32, 0.03);
    part(back, box(0.035, 0.7, 0.004), accent, sx * 0.13, 0.42, 0.047, { outline: false });
  }
  part(back, rbox(0.26, 0.11, 0.07, 0.04), accent, 0, 0.7, 0.07);
  part(back, rbox(0.3, 0.1, 0.06, 0.04), shade(accent, 0.8), 0, 0.15, 0.07);
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.03, 0.24, 0.012), BLACK, sx * 0.29, h + 0.22, -0.02);
    part(c, rbox(0.035, 0.18, 0.035, 0.008), BLACK, sx * 0.29, h + 0.12, -0.06, { outline: false });
  }
}

/** A mesh-backed office chair facing +z in its own group, its seat `h` up. */
function meshChair(c: THREE.Object3D, h: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, BLACK);
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.024, 0.024, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, h + 0.02, 0);
  part(c, rbox(0.44, 0.52, 0.035, 0.03), BLACK, 0, h + 0.36, -0.22, { rx: -0.1 });
  part(c, box(0.38, 0.46, 0.01), tint(color, 0.25), 0, h + 0.36, -0.2, { rx: -0.1, outline: false });
  for (const sx of [-1, 1]) part(c, rbox(0.05, 0.03, 0.22, 0.012), BLACK, sx * 0.25, h + 0.2, -0.01);
}

/** A mechanical keyboard and a gaming mouse at (x, z) on a top at `y`; the keys' underglow goes in `use`. */
function mechKeyboard(g: THREE.Object3D, use: THREE.Object3D, x: number, y: number, z: number) {
  part(g, rbox(0.36, 0.028, 0.13, 0.008), '#1d1e22', x, y + 0.014, z);
  for (let r = 0; r < 4; r++) part(g, box(0.33, 0.012, 0.022), r === 0 ? '#3a3c44' : '#e8e8ec', x, y + 0.032, z - 0.045 + r * 0.03, { outline: false });
  part(g, box(0.04, 0.013, 0.022), '#7e57c2', x + 0.14, y + 0.033, z + 0.045, { outline: false });
  part(use, box(0.37, 0.004, 0.14), '#b388ff', x, y + 0.002, z, { outline: false, material: glow('#b388ff') });
  part(g, rbox(0.06, 0.03, 0.1, 0.02), '#1d1e22', x + 0.27, y + 0.015, z + 0.01);
  part(use, box(0.012, 0.004, 0.03), '#40c4ff', x + 0.27, y + 0.032, z + 0.04, { outline: false, material: glow('#40c4ff') });
}

/** A chibi figure of one of the studio's heroes, `s` high, stood on a little round base at (x, y, z). */
function chibi(g: THREE.Object3D, x: number, y: number, z: number, s: number, look: { body: string; hair: string; extra?: 'sword' | 'staff' | 'cape' | 'hat' }) {
  const f = frame(g, x, y, z);
  f.scale.setScalar(s / 0.2);
  part(f, cyl(0.045, 0.05, 0.012, 16), '#263238', 0, 0.006, 0, { outline: false });
  part(f, cyl(0.022, 0.03, 0.06, 10), look.body, 0, 0.042, 0);
  part(f, ball(0.045), '#ffe0c4', 0, 0.11, 0);
  part(f, ball(0.048), look.hair, 0, 0.122, -0.008, { outline: false }).scale.set(1, 0.8, 1);
  for (const sx of [-1, 1]) part(f, ball(0.006), '#263238', sx * 0.016, 0.11, 0.041, { outline: false });
  if (look.extra === 'sword') {
    part(f, box(0.008, 0.09, 0.004), '#eceff1', 0.04, 0.07, 0.01, { rz: -0.3, outline: false });
    part(f, box(0.03, 0.006, 0.008), '#ffb300', 0.03, 0.035, 0.01, { rz: -0.3, outline: false });
  } else if (look.extra === 'staff') {
    part(f, cyl(0.004, 0.004, 0.13, 6), '#8d6e63', -0.04, 0.06, 0.01, { outline: false });
    part(f, ball(0.012), '#e040fb', -0.04, 0.13, 0.01, { outline: false, material: glow('#ea80fc') });
  } else if (look.extra === 'hat') {
    part(f, cone(0.04, 0.07), look.body, 0, 0.18, -0.005, { rx: -0.2 });
  }
  if (look.extra === 'cape' || look.extra === 'sword') part(f, box(0.05, 0.06, 0.004), '#c62828', 0, 0.045, -0.028, { rx: 0.15, outline: false });
}

/** A green slime with eyes, `r` round, sat at (x, y, z). */
function slime(g: THREE.Object3D, x: number, y: number, z: number, r: number) {
  const b = new THREE.Mesh(ball(r), SLIME);
  b.position.set(x, y + r * 0.6, z);
  b.scale.set(1, 0.65, 1);
  g.add(b);
  for (const sx of [-1, 1]) part(g, ball(r * 0.14), '#1b1b1b', x + sx * r * 0.32, y + r * 0.75, z + r * 0.86, { outline: false });
  part(g, ball(r * 0.1), '#ffffff', x - r * 0.3, y + r * 0.95, z + r * 0.6, { outline: false });
}

/** A game pad facing up (its face to +y, the grips to +z), centred at the origin of `g`. */
function gamepad(g: THREE.Object3D, use?: THREE.Object3D) {
  part(g, rbox(0.15, 0.03, 0.065, 0.014), '#30323a', 0, 0, 0);
  for (const sx of [-1, 1]) part(g, rbox(0.045, 0.03, 0.08, 0.02), '#30323a', sx * 0.055, -0.004, 0.035, { ry: sx * 0.35 });
  for (const sx of [-1, 1]) {
    part(g, cyl(0.011, 0.011, 0.012, 10), '#16171b', sx * 0.03, 0.02, 0.012, { outline: false });
    part(g, cyl(0.014, 0.014, 0.004, 10), '#4a4c55', sx * 0.03, 0.027, 0.012, { outline: false });
  }
  for (const [dx, dz, col] of [[0.045, -0.012, '#43a047'], [0.06, 0.003, '#e53935'], [0.03, 0.003, '#1e88e5'], [0.045, 0.018, '#fdd835']] as Array<[number, number, string]>) part(g, ball(0.006), col, dx, 0.017, dz - 0.012, { outline: false });
  part(g, box(0.022, 0.006, 0.006), '#4a4c55', -0.048, 0.017, -0.012, { outline: false });
  part(g, box(0.006, 0.006, 0.022), '#4a4c55', -0.048, 0.017, -0.012, { outline: false });
  if (use) part(use, box(0.05, 0.004, 0.006), '#b388ff', 0, 0.006, -0.033, { outline: false, material: glow('#b388ff') });
}

/** An over-ear headset lying on its side (the band arched up), at (x, y, z). */
function headset(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, color = BLACK) {
  const h = frame(g, x, y, z, ry);
  part(h, ring(0.075, 0.009, Math.PI), color, 0, 0.0, 0, { outline: false });
  for (const sx of [-1, 1]) {
    part(h, cyl(0.04, 0.04, 0.035, 14), color, sx * 0.075, -0.015, 0, { rz: Math.PI / 2 });
    part(h, cyl(0.032, 0.032, 0.006, 14), VIOLET, sx * 0.095, -0.015, 0, { rz: Math.PI / 2, outline: false });
  }
  part(h, cyl(0.003, 0.003, 0.09, 6), color, -0.06, -0.05, 0.04, { rx: 1.1, outline: false });
}

/** An energy drink can (a 핫식스-ish orange and black), stood at (x, y, z). */
function can(g: THREE.Object3D, x: number, y: number, z: number, col = '#ff6d00') {
  part(g, cyl(0.03, 0.03, 0.12, 12), col, x, y + 0.06, z);
  part(g, cyl(0.0305, 0.0305, 0.04, 12), '#212121', x, y + 0.06, z, { outline: false });
  part(g, cyl(0.026, 0.03, 0.008, 12), CHROME, x, y + 0.124, z, { outline: false });
}

/** A rubber duck for debugging out loud to, at (x, y, z) facing `ry`. */
function duck(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const d = frame(g, x, y, z, ry);
  part(d, ball(0.035), '#ffd600', 0, 0.03, 0).scale.set(1.15, 0.85, 1);
  part(d, ball(0.024), '#ffd600', 0, 0.075, 0.018);
  part(d, box(0.02, 0.008, 0.02), '#ff6f00', 0, 0.072, 0.045, { outline: false });
  for (const sx of [-1, 1]) part(d, ball(0.004), '#212121', sx * 0.012, 0.083, 0.038, { outline: false });
}

// ---- Pictures ----

/** The code editor: a dark theme, line numbers, the player controller with a fix being written. */
const codeTex = () =>
  painted('gdCode', 224, 128, (x) => {
    x.fillStyle = '#1e1e24';
    x.fillRect(0, 0, 224, 128);
    x.fillStyle = '#2d2d36';
    x.fillRect(0, 0, 224, 12);
    x.fillStyle = '#1e1e24';
    x.fillRect(4, 2, 78, 10);
    x.font = `8px ${MONO}`;
    x.fillStyle = '#e0e0e0';
    x.fillText('PlayerController.cs', 8, 10);
    x.fillStyle = '#9e9e9e';
    x.fillText('SlimeAI.cs', 90, 10);
    // The file tree down the left.
    x.fillStyle = '#25252d';
    x.fillRect(0, 12, 40, 116);
    x.font = `6px ${MONO}`;
    ['▾ Scripts', '  Player', '  Enemy', '  UI', '▾ Scenes', '  Stage1-3', '  Boss'].forEach((t, i) => {
      x.fillStyle = i === 1 ? '#ffffff' : '#8e8e99';
      x.fillText(t, 3, 22 + i * 9);
    });
    const lines: Array<Array<[string, string]>> = [
      [['using', '#c586c0'], [' UnityEngine;', '#d4d4d4']],
      [],
      [['public class ', '#569cd6'], ['PlayerController', '#4ec9b0']],
      [['{', '#d4d4d4']],
      [['  // 점프 버그 수정 - 오버그', '#6a9955']],
      [['  float ', '#569cd6'], ['jumpForce = ', '#9cdcfe'], ['12.5f', '#b5cea8'], [';', '#d4d4d4']],
      [['  void ', '#569cd6'], ['Update', '#dcdcaa'], ['() {', '#d4d4d4']],
      [['    if ', '#c586c0'], ['(isGrounded && ', '#9cdcfe'], ['Input', '#4ec9b0'], ['.Jump)', '#d4d4d4']],
      [['      rb.', '#9cdcfe'], ['AddForce', '#dcdcaa'], ['(up * jumpForce);', '#d4d4d4']],
      [['    Log', '#4ec9b0'], ['(', '#d4d4d4'], ['"점프!"', '#ce9178'], [');', '#d4d4d4']],
      [['  }', '#d4d4d4']],
      [['}', '#d4d4d4']],
    ];
    x.font = `7px ${MONO}`;
    lines.forEach((parts, i) => {
      const y = 22 + i * 8.6;
      x.fillStyle = '#5a5a66';
      x.fillText(String(i + 1).padStart(2), 43, y);
      let cx = 56;
      for (const [t, col] of parts) {
        x.fillStyle = col;
        x.fillText(t, cx, y);
        cx += x.measureText(t).width;
      }
    });
    // The line being typed, highlighted; the status bar.
    x.fillStyle = 'rgba(255,255,255,0.06)';
    x.fillRect(40, 85, 184, 9);
    x.fillStyle = '#7e57c2';
    x.fillRect(0, 120, 224, 8);
    x.fillStyle = '#ffffff';
    x.font = `6px ${MONO}`;
    x.fillText('main  ✔ 빌드 성공  Ln 10, Col 24', 4, 126);
  });

/** The engine's editor: the hierarchy, the scene view of a stage with its gizmo, the inspector, the assets. */
const engineTex = () =>
  painted('gdEngine', 224, 128, (x) => {
    x.fillStyle = '#383838';
    x.fillRect(0, 0, 224, 128);
    x.fillStyle = '#2a2a2a';
    x.fillRect(0, 0, 224, 10);
    // Play, pause, step.
    x.fillStyle = '#4fc3f7';
    x.beginPath();
    x.moveTo(104, 2);
    x.lineTo(104, 8);
    x.lineTo(110, 5);
    x.fill();
    x.fillStyle = '#bdbdbd';
    x.fillRect(114, 2, 2, 6);
    x.fillRect(118, 2, 2, 6);
    // The hierarchy.
    x.font = `6px ${FONT}`;
    ['Stage1-3', ' Main Camera', ' Player', ' Slime (12)', ' Coins', ' Platforms', ' Boss Gate'].forEach((t, i) => {
      x.fillStyle = i === 2 ? '#3d6fb6' : 'transparent';
      x.fillRect(1, 13 + i * 8, 44, 8);
      x.fillStyle = '#e0e0e0';
      x.fillText(t, 3, 19 + i * 8);
    });
    // The scene view: sky, hills, platforms, the hero with the move gizmo, the camera's frustum.
    const sx = 48;
    const sw = 128;
    const sky = x.createLinearGradient(0, 12, 0, 90);
    sky.addColorStop(0, '#7ec8ff');
    sky.addColorStop(1, '#d9f2ff');
    x.fillStyle = sky;
    x.fillRect(sx, 12, sw, 78);
    x.fillStyle = '#9ccc65';
    x.beginPath();
    x.ellipse(sx + 30, 92, 50, 24, 0, Math.PI, 0);
    x.ellipse(sx + 100, 94, 46, 20, 0, Math.PI, 0);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 8; i++) {
      x.beginPath();
      x.moveTo(sx + i * 18, 90);
      x.lineTo(sx + 64 + (i - 4) * 30, 70);
      x.stroke();
    }
    x.fillStyle = '#8d6e63';
    for (const [px, py, pw] of [[sx + 10, 70, 30], [sx + 50, 58, 26], [sx + 88, 46, 30]]) {
      x.fillRect(px, py, pw, 6);
      x.fillStyle = '#66bb6a';
      x.fillRect(px, py - 2, pw, 3);
      x.fillStyle = '#8d6e63';
    }
    x.fillStyle = '#ffca28';
    for (const [cx, cy] of [[sx + 58, 50], [sx + 66, 50], [sx + 96, 38]]) {
      x.beginPath();
      x.arc(cx, cy, 2.2, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = '#5c6bc0';
    x.fillRect(sx + 20, 58, 7, 12);
    x.fillStyle = '#ffe0c4';
    x.fillRect(sx + 20, 52, 7, 6);
    // The move gizmo on the hero.
    x.lineWidth = 1.5;
    x.strokeStyle = '#e53935';
    x.beginPath();
    x.moveTo(sx + 24, 62);
    x.lineTo(sx + 40, 62);
    x.stroke();
    x.strokeStyle = '#43a047';
    x.beginPath();
    x.moveTo(sx + 24, 62);
    x.lineTo(sx + 24, 44);
    x.stroke();
    x.strokeStyle = '#1e88e5';
    x.beginPath();
    x.moveTo(sx + 24, 62);
    x.lineTo(sx + 16, 70);
    x.stroke();
    x.fillStyle = '#7ee07e';
    x.beginPath();
    x.ellipse(sx + 66, 55, 5, 3.5, 0, Math.PI, 0);
    x.fill();
    // The inspector.
    x.fillStyle = '#e0e0e0';
    x.font = `6px ${FONT}`;
    ['Player', 'Transform', ' X 3.2  Y 1.0', 'Rigidbody', ' Mass 1', 'Jump Force', ' 12.5'].forEach((t, i) => {
      x.fillStyle = i === 0 || i === 1 || i === 3 || i === 5 ? '#ffffff' : '#a5a5a5';
      x.fillText(t, 180, 19 + i * 9);
    });
    x.fillStyle = '#555';
    x.fillRect(206, 72, 14, 5);
    // The assets along the bottom.
    x.fillStyle = '#2f2f2f';
    x.fillRect(0, 92, 224, 36);
    const tiles = ['#7ee07e', '#5c6bc0', '#ffca28', '#8d6e63', '#ef5350', '#4fc3f7', '#ab47bc', '#ffffff'];
    tiles.forEach((col, i) => {
      x.fillStyle = col;
      x.fillRect(6 + i * 27, 98, 18, 16);
      x.fillStyle = '#bdbdbd';
      x.fillRect(6 + i * 27, 117, 18, 3);
    });
  });

/** The QA board: four columns of tickets under the patch's name. */
const bugTex = () =>
  painted('gdBugs', 176, 192, (x) => {
    x.fillStyle = '#fafafa';
    x.fillRect(0, 0, 176, 192);
    x.fillStyle = '#263238';
    x.fillRect(0, 0, 176, 18);
    x.fillStyle = '#ffffff';
    x.font = `bold 10px ${FONT}`;
    x.fillText('🐞 버그 관리 · 1.4.2 패치', 6, 13);
    const cols = [['신규', '#e53935'], ['진행 중', '#fb8c00'], ['해결', '#43a047'], ['검증', '#1e88e5']] as const;
    cols.forEach(([t, col], i) => {
      const cx = 2 + i * 43.5;
      x.fillStyle = col;
      x.fillRect(cx, 22, 41, 11);
      x.fillStyle = '#ffffff';
      x.font = `bold 8px ${FONT}`;
      x.fillText(t, cx + 4, 31);
      x.strokeStyle = '#cfd8dc';
      x.beginPath();
      x.moveTo(cx + 42.5, 22);
      x.lineTo(cx + 42.5, 190);
      x.stroke();
    });
    const tickets: Array<[number, number, string, string, string]> = [
      [0, 0, '#ffcdd2', '#1042', '튕김 (보스전)'],
      [0, 1, '#fff9c4', '#1047', '자막 겹침'],
      [0, 2, '#fff9c4', '#1051', '점프 판정'],
      [0, 3, '#e1f5fe', '#1053', '사운드 끊김'],
      [1, 0, '#ffcdd2', '#1038', '결제 오류'],
      [1, 1, '#fff9c4', '#1044', '슬라임 AI'],
      [2, 0, '#c8e6c9', '#1024', '로딩 멈춤'],
      [2, 1, '#c8e6c9', '#1031', '코인 중복'],
      [2, 2, '#fff9c4', '#1035', 'UI 깨짐'],
      [3, 0, '#c8e6c9', '#1019', '저장 실패'],
      [3, 1, '#e1f5fe', '#1022', '튜토리얼'],
    ];
    for (const [c, r, bg, id, t] of tickets) {
      const tx = 4 + c * 43.5;
      const ty = 38 + r * 30;
      x.fillStyle = 'rgba(0,0,0,0.12)';
      x.fillRect(tx + 1.5, ty + 1.5, 37, 26);
      x.fillStyle = bg;
      x.fillRect(tx, ty, 37, 26);
      x.fillStyle = bg === '#ffcdd2' ? '#c62828' : '#455a64';
      x.font = `bold 7px ${MONO}`;
      x.fillText(id, tx + 3, ty + 9);
      x.fillStyle = '#263238';
      x.font = `6px ${FONT}`;
      x.fillText(t, tx + 3, ty + 19, 33);
      if (bg === '#ffcdd2') {
        x.fillStyle = '#c62828';
        x.fillRect(tx + 26, ty + 3, 9, 6);
        x.fillStyle = '#fff';
        x.font = `bold 5px ${FONT}`;
        x.fillText('P0', tx + 27, ty + 8);
      }
    }
    // The crash-free rate chart in the corner.
    x.fillStyle = '#eceff1';
    x.fillRect(90, 152, 82, 36);
    x.fillStyle = '#37474f';
    x.font = `bold 6px ${FONT}`;
    x.fillText('크래시 없는 세션 99.2%', 93, 160);
    x.strokeStyle = '#43a047';
    x.lineWidth = 1.5;
    x.beginPath();
    [[94, 182], [108, 178], [122, 180], [136, 172], [150, 170], [168, 164]].forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.stroke();
  });

/** The level map: a dungeon drawn in marker, from the start flag to the boss room. */
const levelTex = () =>
  painted('gdLevel', 288, 168, (x) => {
    x.fillStyle = '#fbfbf8';
    x.fillRect(0, 0, 288, 168);
    // A faint grid.
    x.strokeStyle = '#e3eaf0';
    x.lineWidth = 1;
    for (let i = 0; i < 288; i += 12) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 168);
      x.stroke();
    }
    for (let j = 0; j < 168; j += 12) {
      x.beginPath();
      x.moveTo(0, j);
      x.lineTo(288, j);
      x.stroke();
    }
    x.fillStyle = '#1a3c9e';
    x.font = `bold 13px ${FONT}`;
    x.fillText('3-2 고대 신전 (레벨 설계안 v3)', 8, 16);
    // Rooms and corridors in blue marker.
    x.strokeStyle = '#1a3c9e';
    x.lineWidth = 2.5;
    const rooms: Array<[number, number, number, number]> = [[14, 110, 46, 40], [84, 96, 54, 56], [92, 30, 44, 40], [164, 104, 44, 44], [214, 28, 64, 64]];
    for (const [rx, ry, rw, rh] of rooms) x.strokeRect(rx, ry, rw, rh);
    x.beginPath();
    x.moveTo(60, 130);
    x.lineTo(84, 130);
    x.moveTo(111, 96);
    x.lineTo(111, 70);
    x.moveTo(138, 124);
    x.lineTo(164, 124);
    x.moveTo(186, 104);
    x.lineTo(186, 60);
    x.lineTo(214, 60);
    x.stroke();
    // The route in red dashes, enemies as red Xs, chests, the start flag, the boss room ringed.
    x.setLineDash([5, 4]);
    x.strokeStyle = '#e53935';
    x.lineWidth = 1.8;
    x.beginPath();
    x.moveTo(30, 132);
    x.lineTo(110, 128);
    x.lineTo(112, 52);
    x.lineTo(112, 110);
    x.lineTo(186, 126);
    x.lineTo(186, 62);
    x.lineTo(240, 60);
    x.stroke();
    x.setLineDash([]);
    x.lineWidth = 2;
    for (const [ex, ey] of [[100, 112], [124, 140], [104, 44], [176, 118], [196, 130]]) {
      x.beginPath();
      x.moveTo(ex - 4, ey - 4);
      x.lineTo(ex + 4, ey + 4);
      x.moveTo(ex + 4, ey - 4);
      x.lineTo(ex - 4, ey + 4);
      x.stroke();
    }
    x.fillStyle = '#ffb300';
    for (const [cx, cy] of [[126, 40], [198, 112]]) {
      x.fillRect(cx - 5, cy - 3, 10, 7);
      x.strokeStyle = '#6d4c41';
      x.strokeRect(cx - 5, cy - 3, 10, 7);
    }
    x.strokeStyle = '#2e7d32';
    x.beginPath();
    x.moveTo(24, 140);
    x.lineTo(24, 120);
    x.stroke();
    x.fillStyle = '#43a047';
    x.fillRect(24, 120, 10, 6);
    x.strokeStyle = '#e53935';
    x.lineWidth = 2;
    x.beginPath();
    x.ellipse(246, 60, 40, 40, 0, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = '#e53935';
    x.font = `bold 11px ${FONT}`;
    x.fillText('보스방!', 228, 64);
    x.fillStyle = '#263238';
    x.font = `9px ${FONT}`;
    x.fillText('시작', 14, 104);
    x.fillText('퍼즐: 발판 3개', 86, 90);
    x.fillText('세이브 포인트', 160, 100);
    x.fillStyle = '#6a1b9a';
    x.fillText('← 점프 거리 3칸 이하로!', 150, 160);
  });

/** A page of concept art pinned up: the temple's gate in colour. */
const envTex = () =>
  painted('gdEnvArt', 96, 72, (x) => {
    const sky = x.createLinearGradient(0, 0, 0, 72);
    sky.addColorStop(0, '#ffb74d');
    sky.addColorStop(1, '#7e57c2');
    x.fillStyle = sky;
    x.fillRect(0, 0, 96, 72);
    x.fillStyle = '#4527a0';
    x.fillRect(30, 20, 36, 46);
    x.fillStyle = '#ffd54f';
    x.beginPath();
    x.arc(48, 40, 9, Math.PI, 0);
    x.fillRect(39, 40, 18, 26);
    x.fill();
    x.fillStyle = '#311b92';
    x.fillRect(24, 16, 48, 6);
    x.fillStyle = '#2e7d32';
    x.fillRect(0, 60, 96, 12);
    x.fillStyle = '#ffffff';
    x.font = `bold 7px ${FONT}`;
    x.fillText('신전 입구 컨셉', 4, 9);
  });

/** The build under test: 슬라임 러시 stage 1-3, its HUD, coins and the hero mid-jump. */
const gameTex = () =>
  painted('gdGame', 192, 112, (x) => {
    const sky = x.createLinearGradient(0, 0, 0, 112);
    sky.addColorStop(0, '#4fc3f7');
    sky.addColorStop(1, '#e1f5fe');
    x.fillStyle = sky;
    x.fillRect(0, 0, 192, 112);
    x.fillStyle = '#ffffff';
    for (const [cx, cy] of [[40, 24], [130, 18], [168, 34]]) {
      x.beginPath();
      x.ellipse(cx, cy, 14, 5, 0, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = '#81c784';
    x.beginPath();
    x.ellipse(50, 112, 80, 34, 0, Math.PI, 0);
    x.ellipse(160, 112, 60, 28, 0, Math.PI, 0);
    x.fill();
    x.fillStyle = '#6d4c41';
    x.fillRect(0, 96, 192, 16);
    x.fillStyle = '#43a047';
    x.fillRect(0, 94, 192, 4);
    for (const [px, py, pw] of [[60, 70, 34], [110, 54, 30], [150, 76, 30]]) {
      x.fillStyle = '#8d6e63';
      x.fillRect(px, py, pw, 7);
      x.fillStyle = '#66bb6a';
      x.fillRect(px, py - 2, pw, 3);
    }
    x.fillStyle = '#ffca28';
    for (const [cx, cy] of [[70, 60], [80, 60], [118, 44], [128, 44], [158, 66]]) {
      x.beginPath();
      x.arc(cx, cy, 3, 0, Math.PI * 2);
      x.fill();
    }
    // The hero mid-jump, a slime bouncing.
    x.fillStyle = '#5c6bc0';
    x.fillRect(84, 46, 9, 12);
    x.fillStyle = '#ffe0c4';
    x.fillRect(84, 39, 9, 8);
    x.fillStyle = '#c62828';
    x.fillRect(80, 48, 4, 9);
    x.fillStyle = '#7ee07e';
    x.beginPath();
    x.ellipse(160, 92, 8, 6, 0, Math.PI, 0);
    x.fill();
    x.fillStyle = '#000';
    x.fillRect(156, 88, 2, 2);
    x.fillRect(162, 88, 2, 2);
    // The HUD: hearts, the coin count, the stage, the minimap.
    x.fillStyle = '#e53935';
    for (let i = 0; i < 3; i++) {
      x.beginPath();
      x.arc(9 + i * 11, 9, 3, 0, Math.PI * 2);
      x.arc(13 + i * 11, 9, 3, 0, Math.PI * 2);
      x.moveTo(6 + i * 11, 10);
      x.lineTo(11 + i * 11, 16);
      x.lineTo(16 + i * 11, 10);
      x.fill();
    }
    x.fillStyle = '#ffffff';
    x.font = `bold 9px ${FONT}`;
    x.fillText('● 128', 46, 14);
    x.fillText('STAGE 1-3', 76, 14);
    x.fillStyle = 'rgba(0,0,0,0.4)';
    x.fillRect(150, 4, 38, 24);
    x.fillStyle = '#ffeb3b';
    x.fillRect(158, 18, 3, 3);
    x.fillStyle = '#e53935';
    x.fillRect(180, 8, 3, 3);
    x.fillStyle = '#ffffff';
    x.font = `6px ${MONO}`;
    x.fillText('DEV BUILD #2041', 4, 108);
  });

/** The splash on a phone being booted for a test. */
const splashTex = () =>
  painted('gdSplash', 48, 96, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, '#311b92');
    g.addColorStop(1, '#7e57c2');
    x.fillStyle = g;
    x.fillRect(0, 0, 48, 96);
    x.fillStyle = '#ffd54f';
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 6 : 13;
      x.lineTo(24 + Math.cos(a) * r, 36 + Math.sin(a) * r);
    }
    x.fill();
    x.fillStyle = '#ffffff';
    x.font = `bold 8px ${FONT}`;
    x.textAlign = 'center';
    x.fillText('별의 전설', 24, 62);
    x.fillStyle = 'rgba(255,255,255,0.3)';
    x.fillRect(8, 80, 32, 3);
    x.fillStyle = '#ffffff';
    x.fillRect(8, 80, 20, 3);
  });
/** A phone that's passed (or failed) its automated run. */
const resultTex = (pass: boolean) =>
  painted(`gdResult${pass}`, 48, 96, (x) => {
    x.fillStyle = '#263238';
    x.fillRect(0, 0, 48, 96);
    x.fillStyle = pass ? '#43a047' : '#e53935';
    x.beginPath();
    x.arc(24, 36, 13, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffffff';
    x.font = `bold 16px ${FONT}`;
    x.textAlign = 'center';
    x.fillText(pass ? '✔' : 'X', 24, 42);
    x.font = `bold 8px ${FONT}`;
    x.fillText(pass ? 'PASS' : 'FAIL', 24, 64);
    x.font = `6px ${MONO}`;
    x.fillStyle = '#b0bec5';
    x.fillText(pass ? '42/42' : '39/42', 24, 76);
  });
/** A phone's screen in landscape: the RPG's battle. */
const battleTex = () =>
  painted('gdBattle', 96, 48, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 48);
    g.addColorStop(0, '#4a148c');
    g.addColorStop(1, '#ff8a65');
    x.fillStyle = g;
    x.fillRect(0, 0, 96, 48);
    x.fillStyle = '#3e2723';
    x.fillRect(0, 38, 96, 10);
    x.fillStyle = '#5c6bc0';
    x.fillRect(18, 22, 8, 14);
    x.fillStyle = '#ffe0c4';
    x.fillRect(18, 16, 8, 7);
    x.fillStyle = '#d32f2f';
    x.beginPath();
    x.ellipse(70, 26, 14, 11, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffeb3b';
    x.font = `bold 9px ${FONT}`;
    x.fillText('CRITICAL!', 40, 12);
    x.fillStyle = '#e53935';
    x.fillRect(56, 4, 30, 3);
    x.fillStyle = '#43a047';
    x.fillRect(4, 4, 24, 3);
  });

/** The build server's console: the Android build going through and passing. */
const terminalTex = () =>
  painted('gdTerminal', 160, 96, (x) => {
    x.fillStyle = '#0d1117';
    x.fillRect(0, 0, 160, 96);
    x.font = `7px ${MONO}`;
    const lines: Array<[string, string]> = [
      ['$ ./build.sh --target android', '#e6edf3'],
      ['[1/4] 에셋 번들 생성...  ok', '#8b949e'],
      ['[2/4] 스크립트 컴파일... ok', '#8b949e'],
      ['[3/4] IL2CPP 변환...     ok', '#8b949e'],
      ['[4/4] APK 서명...        ok', '#8b949e'],
      ['BUILD #2041  SUCCESS ✔', '#3fb950'],
      ['$ ./deploy.sh qa', '#e6edf3'],
      ['QA 서버 업로드 87% ████▌', '#d29922'],
      ['$ _', '#e6edf3'],
    ];
    lines.forEach(([t, col], i) => {
      x.fillStyle = col;
      x.fillText(t, 4, 10 + i * 10);
    });
  });

/** A character concept sheet: the hero front and side, the colours, the notes in red. */
const conceptTex = () =>
  painted('gdConcept', 192, 120, (x) => {
    x.fillStyle = '#f5f1e8';
    x.fillRect(0, 0, 192, 120);
    x.fillStyle = '#3a3a3a';
    x.font = `bold 9px ${FONT}`;
    x.fillText('별의 전설 · 주인공 "하린" 최종안', 6, 12);
    const hero = (cx: number, side: boolean) => {
      // Cape, legs, body, head and hair, the sword.
      x.fillStyle = '#c62828';
      x.beginPath();
      x.moveTo(cx - (side ? 4 : 13), 44);
      x.lineTo(cx + (side ? 14 : 13), 44);
      x.lineTo(cx + (side ? 20 : 17), 92);
      x.lineTo(cx - (side ? 2 : 17), 92);
      x.fill();
      x.fillStyle = '#37474f';
      x.fillRect(cx - 7, 78, 5, 26);
      x.fillRect(cx + 2, 78, 5, 26);
      x.fillStyle = '#3949ab';
      x.fillRect(cx - (side ? 6 : 10), 44, side ? 12 : 20, 36);
      x.fillStyle = '#ffd54f';
      x.fillRect(cx - (side ? 6 : 10), 62, side ? 12 : 20, 4);
      x.fillStyle = '#ffe0c4';
      x.beginPath();
      x.arc(cx, 34, 10, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#4e342e';
      x.beginPath();
      x.arc(cx + (side ? -2 : 0), 30, 11, Math.PI, 0);
      x.fill();
      if (!side) {
        x.fillStyle = '#cfd8dc';
        x.fillRect(cx + 14, 30, 3, 44);
        x.fillStyle = '#ffb300';
        x.fillRect(cx + 10, 68, 11, 3);
      }
    };
    hero(40, false);
    hero(92, true);
    x.fillStyle = '#9e9e9e';
    x.font = `6px ${FONT}`;
    x.fillText('정면', 34, 114);
    x.fillText('측면', 86, 114);
    // The palette.
    ['#3949ab', '#c62828', '#ffd54f', '#4e342e', '#ffe0c4', '#37474f'].forEach((col, i) => {
      x.fillStyle = col;
      x.fillRect(128 + (i % 2) * 28, 22 + Math.floor(i / 2) * 18, 24, 14);
    });
    // The red-pen notes.
    x.strokeStyle = '#e53935';
    x.fillStyle = '#e53935';
    x.lineWidth = 1.5;
    x.beginPath();
    x.ellipse(40, 86, 20, 9, 0, 0, Math.PI * 2);
    x.stroke();
    x.font = `bold 7px ${FONT}`;
    x.fillText('망토 길이 ↓', 128, 88);
    x.fillText('검 더 크게!', 128, 100);
    x.fillText('OK - 장레벨', 128, 112);
  });

/** The studio's mark: a star in a forge's spark, and its name. */
const logoTex = () =>
  painted('gdLogo', 256, 64, (x) => {
    x.fillStyle = '#ffd54f';
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 10 : 24;
      x.lineTo(34 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    x.fill();
    x.fillStyle = '#ffffff';
    x.font = `bold 30px ${FONT}`;
    x.fillText('STARFORGE', 66, 38);
    x.font = `bold 12px ${FONT}`;
    x.fillStyle = '#b39ddb';
    x.fillText('스타포지 게임즈', 68, 56);
  });

/** A game's box art: the RPG's limited edition. */
const boxArtTex = () =>
  painted('gdBoxArt', 72, 96, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, '#1a237e');
    g.addColorStop(1, '#6a1b9a');
    x.fillStyle = g;
    x.fillRect(0, 0, 72, 96);
    x.fillStyle = '#ffd54f';
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 7 : 16;
      x.lineTo(36 + Math.cos(a) * r, 40 + Math.sin(a) * r);
    }
    x.fill();
    x.fillStyle = '#ffffff';
    x.font = `bold 12px ${FONT}`;
    x.textAlign = 'center';
    x.fillText('별의 전설', 36, 76);
    x.font = `bold 6px ${FONT}`;
    x.fillStyle = '#ffd54f';
    x.fillText('한정판', 36, 88);
    x.fillText('LIMITED', 36, 14);
  });

/** The award plaque: ten million downloads. */
const plaqueTex = () =>
  painted('gdPlaque', 64, 80, (x) => {
    x.fillStyle = '#3e2723';
    x.fillRect(0, 0, 64, 80);
    x.fillStyle = '#d4af37';
    x.fillRect(5, 5, 54, 70);
    x.fillStyle = '#3e2723';
    x.font = `bold 7px ${FONT}`;
    x.textAlign = 'center';
    x.fillText('슬라임 러시', 32, 22);
    x.font = `bold 11px ${FONT}`;
    x.fillText('1,000만', 32, 42);
    x.font = `bold 7px ${FONT}`;
    x.fillText('다운로드 달성', 32, 56);
    x.font = `5px ${FONT}`;
    x.fillText('2025 · 스타포지', 32, 68);
  });

// ---- The pieces ----

export const BUILDERS: Record<string, Builder> = {
  /**
   * A developer's desk (개발용 PC): a black top on a steel T-frame, a purple desk mat with the studio's
   * name; two monitors on a dual arm turned in a little — the code on the left (the jump fix being
   * typed, lit in use, the cursor blinking), the engine's editor with the stage open on the right
   * (comes on in use) — a mechanical keyboard glowing violet underneath and a gaming mouse, a rubber
   * duck to explain the bug to, an energy drink, the hero's figure under the screens, '출시 D-14' on
   * a desk card, sticky notes on the bezel; the PC under the desk with its fans lit, a headset on the
   * desk hook; a gaming chair pulled up. Sat in it typing the feature, the optimisation, the hotfix;
   * for a code review, sat back with a notebook, listening, noting it down, making a point.
   */
  devStation(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.04, 0.98);
    const h = 0.74;
    const d = Math.min(D - 0.34, 0.64);
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const ty = h + 0.015;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    // The top, its T-legs and the cable tray under the back.
    part(g, rbox(w, 0.03, d, 0.01), '#2b2d33', 0, h, z);
    part(g, box(w, 0.006, 0.006), VIOLET, 0, h - 0.012, front + 0.001, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, h - 0.03, 0.06, 0.01), '#1c1d21', sx * (w / 2 - 0.08), (h - 0.03) / 2, z);
      part(g, rbox(0.07, 0.03, d - 0.04, 0.012), '#1c1d21', sx * (w / 2 - 0.08), 0.015, z);
    }
    part(g, rbox(w - 0.2, 0.06, 0.12, 0.01), '#1c1d21', 0, h - 0.06, z - d / 2 + 0.1);
    // The mat with the studio's name.
    part(g, rbox(w - 0.08, 0.004, 0.3, 0.004), '#3b2a6b', 0, ty + 0.002, z + 0.15, { outline: false });
    label(g, 'STARFORGE', 0.16, 0.03, w / 2 - 0.15, ty + 0.0045, z + 0.27, 'none', '#b39ddb', 0, -Math.PI / 2);
    // The dual arm: a post at the back, an arm out to each monitor.
    const my = ty + 0.42;
    part(g, rbox(0.12, 0.012, 0.1, 0.004), BLACK, 0, ty + 0.006, z - 0.2);
    part(g, cyl(0.018, 0.018, 0.42, 10), '#3a3c44', 0, ty + 0.21, z - 0.2, { outline: false });
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(0, my - 0.06, z - 0.2), new THREE.Vector3(sx * 0.22, my - 0.06, z - 0.12), 0.014, '#3a3c44');
    const mw = 0.44;
    const mh = 0.26;
    const left = frame(g, -0.235, my, z - 0.09, 0.2);
    const right = frame(g, 0.235, my, z - 0.09, -0.2);
    for (const m of [left, right]) {
      part(m, rbox(mw + 0.02, mh + 0.02, 0.025, 0.008), BLACK, 0, 0, 0);
      part(m, box(0.05, 0.012, 0.004), '#3a3c44', 0, -mh / 2 - 0.003, 0.013, { outline: false });
    }
    out.screen = screenOf(left, codeTex(), mw, mh, 0, 0, 0.014);
    part(right, box(mw, mh, 0.002), '#2a3140', 0, 0, 0.013, { outline: false });
    sheet(frame(use, 0.235, my, z - 0.09, -0.2), engineTex(), mw, mh, 0, 0, 0.0145);
    // The cursor blinking at the end of the line being typed.
    const cursor = part(frame(use, -0.235, my, z - 0.09, 0.2), box(0.006, 0.012, 0.002), '#ffffff', 0.02, -0.035, 0.016, { outline: false, material: glow('#ffffff') });
    // Sticky notes on the bezels.
    part(left, box(0.05, 0.05, 0.003), '#fff176', -mw / 2 + 0.01, mh / 2 - 0.01, 0.014, { rz: 0.15, outline: false });
    part(right, box(0.05, 0.05, 0.003), '#f8bbd0', mw / 2 - 0.02, mh / 2 - 0.005, 0.014, { rz: -0.1, outline: false });
    label(right, '빌드 #2041', 0.05, 0.014, mw / 2 - 0.02, mh / 2 - 0.005, 0.016, 'none', '#ad1457', 0, 0, true);
    // The keyboard, the mouse; where the hands go.
    const kz = front - 0.15;
    mechKeyboard(g, use, -0.04, ty, kz);
    const kb = marker(g, -0.04, ty + 0.035, kz);
    // The duck, the can, the hero's figure under the screens, the D-day card.
    duck(g, -w / 2 + 0.08, ty, front - 0.12, 0.5);
    can(g, w / 2 - 0.08, ty, front - 0.2);
    chibi(g, 0.02, ty, z - 0.06, 0.13, { body: '#3949ab', hair: '#4e342e', extra: 'sword' });
    const card = frame(g, -w / 2 + 0.1, ty + 0.035, z - 0.12, 0.3, -0.2);
    part(card, rbox(0.11, 0.07, 0.012, 0.004), '#ffffff', 0, 0, 0);
    label(card, '출시 D-14', 0.1, 0.035, 0, 0, 0.0065, 'none', '#c62828');
    // The headset stood at the back corner.
    headset(g, w / 2 - 0.13, ty + 0.1, z - 0.2, -0.3);
    // The PC under the right end: glass to the knees' side, its fans.
    const px = w / 2 - 0.17;
    const pz = z - 0.02;
    part(g, rbox(0.22, 0.46, 0.44, 0.012), '#1d1e22', px, 0.24, pz);
    part(g, box(0.004, 0.4, 0.38), '#4a4c55', px - 0.112, 0.25, pz, { outline: false });
    for (let k = 0; k < 3; k++) {
      part(g, ring(0.05, 0.008), '#5e35b1', px - 0.114, 0.13 + k * 0.11, pz + 0.08, { ry: Math.PI / 2, outline: false });
      part(use, ring(0.05, 0.009), '#b388ff', px - 0.115, 0.13 + k * 0.11, pz + 0.08, { ry: Math.PI / 2, outline: false, material: glow(k === 1 ? '#40c4ff' : '#b388ff') });
    }
    part(g, cyl(0.008, 0.008, 0.004, 10), '#40c4ff', px + 0.05, 0.44, pz + 0.222, { rx: Math.PI / 2, outline: false, material: glow('#40c4ff') });
    // The chair.
    const c = frame(g, 0, 0, front + 0.24, Math.PI);
    gamingChair(c, 0.43, VIOLET);
    out.work = kb;
    out.animate = (t) => {
      cursor.visible = Math.sin(t * 6) > 0;
    };
    out.spots = {
      '*': satAt(g, front + 0.24, 'type', kb),
      gameDeveloper_codeReview: satAt(g, front + 0.24, 'meeting', kb),
    };
  },

  /**
   * The QA board (버그 관리판): on the wall, or on a rolling stand, the patch's tickets in four
   * columns — 신규, 진행 중, 해결, 검증 — the P0s flagged red, the crash-free rate in the corner; a
   * red P0 beacon on top that turns and flashes while it's worked, a ladybug plush on the tray with
   * the markers and a stack of blank cards. Stood at it moving tickets along: in use a card goes
   * from 신규 over to 진행 중 under the hand.
   */
  bugBoard(g, W, D, _c, _def, ctx, out) {
    const bw = Math.min(W - 0.08, 0.92);
    const bh = 1.0;
    const wall = ctx.againstWall;
    const bz = wall ? -D / 2 + 0.03 : -0.1;
    const by = wall ? 1.42 : 1.3;
    if (!wall) {
      for (const sx of [-1, 1]) {
        const x = sx * (bw / 2 + 0.03);
        part(g, rbox(0.04, by + bh / 2, 0.04, 0.01), ALU, x, (by + bh / 2) / 2 + 0.03, bz);
        part(g, rbox(0.06, 0.04, 0.56, 0.012), ALU, x, 0.07, bz);
        for (const sz of [-1, 1]) part(g, ball(0.03), BLACK, x, 0.03, bz + sz * 0.25, { outline: false });
      }
      part(g, rbox(bw, 0.035, 0.03, 0.01), ALU, 0, 0.35, bz);
    }
    part(g, rbox(bw + 0.05, bh + 0.05, 0.03, 0.012), ALU, 0, by, bz);
    sheet(g, bugTex(), bw - 0.02, bh - 0.02, 0, by, bz + 0.017);
    // Magnets pinning the P0s, the tray, markers, blank cards and the ladybug.
    for (const [mx, my] of [[-bw * 0.4, by + 0.27], [-bw * 0.15, by + 0.27], [-bw * 0.4, by - 0.06]] as Array<[number, number]>) part(g, cyl(0.014, 0.014, 0.014, 12), '#c62828', mx, my, bz + 0.024, { rx: Math.PI / 2, outline: false });
    const trayY = by - bh / 2 - 0.035;
    part(g, rbox(bw * 0.8, 0.025, 0.075, 0.01), ALU, 0, trayY, bz + 0.045);
    for (const [i, col] of ['#212121', '#c62828', '#1a3c9e'].entries()) part(g, cyl(0.011, 0.011, 0.12, 8), col, -bw * 0.32 + i * 0.045, trayY + 0.024, bz + 0.05, { rz: Math.PI / 2 });
    for (let k = 0; k < 4; k++) part(g, box(0.09, 0.004, 0.06), ['#fff9c4', '#ffcdd2', '#c8e6c9', '#e1f5fe'][k], -0.02, trayY + 0.016 + k * 0.004, bz + 0.05, { ry: k * 0.08, outline: false });
    // The ladybug plush.
    const lx = bw * 0.3;
    part(g, ball(0.05), '#e53935', lx, trayY + 0.05, bz + 0.05).scale.set(1, 0.7, 1.15);
    part(g, ball(0.028), '#212121', lx, trayY + 0.045, bz + 0.1);
    for (const [dx, dz] of [[-0.022, 0], [0.022, -0.01], [0, -0.035]]) part(g, ball(0.011), '#212121', lx + dx, trayY + 0.083, bz + 0.05 + dz, { outline: false });
    for (const sx of [-1, 1]) part(g, ball(0.007), '#ffffff', lx + sx * 0.011, trayY + 0.055, bz + 0.125, { outline: false });
    // The P0 beacon on top: dim when idle, turning red while worked.
    const bx = bw / 2 - 0.08;
    const top = by + bh / 2 + 0.025;
    part(g, cyl(0.04, 0.045, 0.03, 14), BLACK, bx, top + 0.015, bz + 0.01);
    part(g, cyl(0.032, 0.035, 0.07, 14), '#b71c1c', bx, top + 0.065, bz + 0.01);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const beacon = new THREE.Group();
    beacon.position.set(bx, top + 0.065, bz + 0.01);
    use.add(beacon);
    part(beacon, cyl(0.034, 0.037, 0.072, 14), '#ff5252', 0, 0, 0, { outline: false, material: glow('#ff1744') });
    part(beacon, box(0.12, 0.05, 0.004), '#ff8a80', 0.06, 0, 0, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#ff5252', transparent: true, opacity: 0.35, depthWrite: false }) });
    // The card being moved, from the first column across to the second.
    const card = part(use, box(0.075, 0.055, 0.004), '#fff9c4', 0, 0, bz + 0.03, { outline: false });
    const c0 = new THREE.Vector3(-bw * 0.37, by + 0.08, bz + 0.03);
    const c1 = new THREE.Vector3(-bw * 0.12, by + 0.02, bz + 0.03);
    out.animate = (t) => {
      beacon.rotation.y = t * 5;
      const u = (t / 6) % 1;
      const e = THREE.MathUtils.smoothstep(u, 0.25, 0.65);
      card.position.lerpVectors(c0, c1, e);
      card.position.y += Math.sin(Math.PI * e) * 0.05;
      card.position.z = bz + 0.03 + Math.sin(Math.PI * e) * 0.02;
    };
    const work = marker(g, -bw * 0.22, by + 0.04, bz + 0.03);
    out.work = work;
    out.spots = { '*': stoodAt(g, -0.08, bz + 0.55, 'board', work) };
  },

  /**
   * The level designer's wall (레벨 설계 보드): a wide whiteboard with the next stage drawn on it in
   * marker — rooms and corridors in blue, the route in red dashes, enemies as Xs, the chests, the
   * start flag and the boss room ringed — the temple's concept art and sticky notes pinned along its
   * right; under that end a low cabinet with the greybox maquette of the stage (grey blocks, a ramp, a
   * red pawn for the player, a flag) and the system design document with a pen. Stood at the map
   * drawing the route on (the board motion); writing the design document, stood at the cabinet with
   * the pen on the page.
   */
  levelBoard(g, W, D, _c, _def, ctx, out) {
    const bw = Math.min(W - 0.2, 1.8);
    const bh = 1.05;
    const wall = ctx.againstWall;
    const bz = wall ? -D / 2 + 0.03 : -D / 2 + 0.12;
    const by = wall ? 1.45 : 1.35;
    if (!wall) {
      for (const sx of [-1, 1]) {
        const x = sx * (bw / 2 + 0.04);
        part(g, rbox(0.04, by + bh / 2, 0.04, 0.01), ALU, x, (by + bh / 2) / 2 + 0.03, bz);
        part(g, rbox(0.06, 0.04, 0.24, 0.012), ALU, x, 0.07, bz + 0.08);
      }
    }
    part(g, rbox(bw + 0.05, bh + 0.05, 0.03, 0.012), ALU, 0, by, bz);
    sheet(g, levelTex(), bw - 0.02, bh - 0.02, 0, by, bz + 0.017);
    // Pinned along the right: the concept art, sticky notes.
    sheet(g, envTex(), 0.3, 0.225, bw / 2 - 0.2, by + 0.31, bz + 0.02, 0, 0);
    part(g, cyl(0.01, 0.01, 0.01, 8), '#e53935', bw / 2 - 0.2, by + 0.41, bz + 0.026, { rx: Math.PI / 2, outline: false });
    const notes: Array<[number, number, string, string]> = [[-bw / 2 + 0.12, by - 0.38, '#fff176', '함정 추가?'], [-bw / 2 + 0.26, by - 0.4, '#b3e5fc', '보상 상자'], [bw / 2 - 0.42, by - 0.42, '#f8bbd0', '난이도 ↓']];
    for (const [nx, ny, col, t] of notes) {
      part(g, box(0.1, 0.08, 0.004), col, nx, ny, bz + 0.02, { outline: false });
      label(g, t, 0.09, 0.03, nx, ny, bz + 0.023, 'none', '#37474f');
    }
    // The marker tray.
    const trayY = by - bh / 2 - 0.035;
    part(g, rbox(bw * 0.5, 0.025, 0.075, 0.01), ALU, -bw * 0.18, trayY, bz + 0.045);
    for (const [i, col] of ['#1a3c9e', '#c62828', '#2e7d32', '#212121'].entries()) part(g, cyl(0.011, 0.011, 0.12, 8), col, -bw * 0.36 + i * 0.05, trayY + 0.024, bz + 0.05, { rz: Math.PI / 2 });
    // The low cabinet under the right end.
    const cw = 0.72;
    const cd = 0.42;
    const cx = bw / 2 - cw / 2 + 0.02;
    const cz = bz + 0.03 + cd / 2;
    const ch = 0.86;
    const czf = cz + cd / 2;
    part(g, rbox(cw, ch, cd, 0.015), '#eceff1', cx, ch / 2, cz);
    for (const sx of [-1, 1]) {
      part(g, rbox(cw / 2 - 0.03, ch - 0.12, 0.012, 0.005), '#f7f8f9', cx + sx * (cw / 4), ch / 2, czf + 0.004);
      part(g, rbox(0.012, 0.1, 0.02, 0.004), '#78838c', cx + sx * 0.04, ch / 2 + 0.15, czf + 0.012, { outline: false });
    }
    part(g, rbox(cw + 0.02, 0.03, cd + 0.02, 0.01), '#5c6bc0', cx, ch + 0.015, cz);
    const ty = ch + 0.03;
    // The greybox maquette: a base, blocks, a ramp, the pawn, the flag.
    const mx = cx - 0.13;
    part(g, rbox(0.38, 0.02, 0.28, 0.006), '#9e9e9e', mx, ty + 0.01, cz);
    const blocks: Array<[number, number, number, number, number]> = [[-0.13, -0.08, 0.08, 0.06, 0.08], [-0.02, -0.07, 0.06, 0.12, 0.06], [0.1, -0.06, 0.1, 0.18, 0.1], [0.12, 0.08, 0.06, 0.04, 0.06], [-0.12, 0.07, 0.08, 0.03, 0.08]];
    for (const [bx, bz2, w2, h2, d2] of blocks) part(g, box(w2, h2, d2), '#bdbdbd', mx + bx, ty + 0.02 + h2 / 2, cz + bz2);
    part(g, box(0.12, 0.012, 0.06), '#bdbdbd', mx + 0.03, ty + 0.06, cz + 0.04, { rz: 0.45 });
    part(g, cyl(0.012, 0.016, 0.04, 10), '#e53935', mx - 0.13, ty + 0.11, cz - 0.08, { outline: false });
    part(g, ball(0.013), '#e53935', mx - 0.13, ty + 0.14, cz - 0.08, { outline: false });
    part(g, cyl(0.003, 0.003, 0.08, 6), '#424242', mx + 0.1, ty + 0.24, cz - 0.06, { outline: false });
    part(g, box(0.035, 0.022, 0.003), '#43a047', mx + 0.118, ty + 0.265, cz - 0.06, { outline: false });
    // The design document with its title, the pen; a stack of printed specs.
    const dx = cx + 0.2;
    const dz = cz + 0.06;
    part(g, box(0.21, 0.004, 0.29), '#ffffff', dx, ty + 0.002, dz, { ry: -0.1, outline: false });
    label(g, '전투 시스템 기획서', 0.17, 0.025, dx, ty + 0.0045, dz - 0.1, 'none', '#283593', -0.1, -Math.PI / 2);
    for (let i = 0; i < 6; i++) part(g, box(0.15, 0.002, 0.006), '#9e9e9e', dx + 0.005, ty + 0.0045, dz - 0.06 + i * 0.03, { ry: -0.1, outline: false });
    part(g, cyl(0.005, 0.005, 0.13, 6), '#1a237e', dx + 0.07, ty + 0.008, dz + 0.1, { rz: Math.PI / 2, ry: 0.6, outline: false });
    const map = marker(g, -bw * 0.2, by - 0.02, bz + 0.02);
    const page = marker(g, dx, ty + 0.01, dz + 0.02);
    out.work = map;
    out.spots = {
      '*': stoodAt(g, -bw * 0.2, bz + 0.52, 'board', map),
      gameDeveloper_writeDesign: stoodAt(g, dx - 0.04, czf + 0.26, 'write', page),
    };
  },

  /**
   * The play-test seat (플레이 테스트석): a booth of purple felt panels round a desk, the studio's
   * poster inside; a big monitor with the build on it (슬라임 러시 stage 1-3, the HUD, 'DEV BUILD
   * #2041'), a webcam on top whose red light comes on recording the session, the black dev kit with
   * its blue strip, a headset on its stand, the survey on a clipboard; a gaming chair. Sat in it with
   * the pad in both hands playing the build — in use the pad's off the desk and in the hands, its
   * light bar lit, the 'REC 녹화 중' sign on over the booth.
   */
  playtestBooth(g, W, D, _c, _def, _ctx, out) {
    const felt = '#4a3780';
    const iw = Math.min(W - 0.12, 0.88);
    const bz = -D / 2 + 0.03;
    const ph = 1.45;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    // The panels: the back and two sides, foam tiles on the back.
    part(g, rbox(iw + 0.1, ph, 0.05, 0.02), felt, 0, ph / 2, bz + 0.025);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) part(g, box(iw / 4 - 0.03, 0.2, 0.02), shade(felt, k % 2 === r % 2 ? 0.85 : 1.08), -iw / 2 + iw / 8 + k * (iw / 4), 0.95 + r * 0.16, bz + 0.055, { outline: false });
    const sd = 0.62;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.05, ph, sd, 0.02), felt, sx * (iw / 2 + 0.025), ph / 2, bz + sd / 2);
      part(g, rbox(0.06, 0.03, sd + 0.01, 0.01), '#2c2240', sx * (iw / 2 + 0.025), ph + 0.01, bz + sd / 2);
    }
    part(g, rbox(iw + 0.12, 0.03, 0.06, 0.01), '#2c2240', 0, ph + 0.01, bz + 0.025);
    // The sign over it, lit while a session's recorded.
    label(g, 'PLAY TEST', 0.32, 0.07, -0.12, ph - 0.07, bz + 0.058, '#2c2240', '#b39ddb');
    part(g, rbox(0.24, 0.07, 0.02, 0.01), '#2c2240', 0.2, ph - 0.07, bz + 0.06);
    label(use, '● REC 녹화 중', 0.22, 0.055, 0.2, ph - 0.07, bz + 0.072, '#2c2240', '#ff5252');
    // The desk.
    const h = 0.72;
    const d = 0.46;
    const z = bz + 0.06 + d / 2;
    const front = z + d / 2;
    const ty = h + 0.015;
    part(g, rbox(iw - 0.02, 0.03, d, 0.01), '#2b2d33', 0, h, z);
    part(g, rbox(iw - 0.06, 0.4, 0.02, 0.008), '#1c1d21', 0, h - 0.22, z - d / 2 + 0.03);
    // The monitor, the webcam on top.
    const mw = 0.62;
    const mh = 0.36;
    part(g, rbox(0.22, 0.012, 0.14, 0.004), BLACK, 0, ty + 0.006, z - 0.1);
    part(g, rbox(0.04, 0.16, 0.03, 0.008), BLACK, 0, ty + 0.08, z - 0.12);
    const my = ty + 0.11 + mh / 2;
    part(g, rbox(mw + 0.02, mh + 0.02, 0.03, 0.008), BLACK, 0, my, z - 0.1);
    out.screen = screenOf(g, gameTex(), mw, mh, 0, my, z - 0.084);
    part(g, rbox(0.08, 0.035, 0.035, 0.012), '#212121', 0, my + mh / 2 + 0.03, z - 0.1);
    part(g, cyl(0.012, 0.012, 0.006, 12), '#455a64', 0, my + mh / 2 + 0.03, z - 0.08, { rx: Math.PI / 2, outline: false });
    part(use, ball(0.005), '#ff1744', 0.03, my + mh / 2 + 0.035, z - 0.082, { outline: false, material: glow('#ff1744') });
    // The dev kit on the left with its strip; a poster of the RPG on the left panel inside.
    const kx = -iw / 2 + 0.11;
    part(g, rbox(0.12, 0.26, 0.24, 0.015), '#111214', kx, ty + 0.13, z - 0.08);
    part(g, box(0.004, 0.2, 0.008), '#40c4ff', kx + 0.035, ty + 0.13, z + 0.042, { outline: false, material: glow('#40c4ff') });
    label(g, 'DEV KIT', 0.09, 0.02, kx - 0.01, ty + 0.22, z + 0.041, 'none', '#90a4ae');
    sheet(g, boxArtTex(), 0.22, 0.29, -iw / 2 + 0.002, 1.12, bz + 0.33, Math.PI / 2);
    // The headset on its stand on the right; the survey on its clipboard.
    const hx = iw / 2 - 0.1;
    part(g, cyl(0.045, 0.05, 0.012, 14), BLACK, hx, ty + 0.006, z - 0.1, { outline: false });
    part(g, cyl(0.008, 0.008, 0.26, 8), '#3a3c44', hx, ty + 0.13, z - 0.1, { outline: false });
    part(g, rbox(0.06, 0.012, 0.03, 0.006), '#3a3c44', hx, ty + 0.265, z - 0.1, { outline: false });
    headset(g, hx, ty + 0.27, z - 0.1, 0);
    const clip = frame(g, iw / 2 - 0.16, ty + 0.006, front - 0.13, -0.25);
    part(clip, rbox(0.17, 0.008, 0.23, 0.004), '#a1887f', 0, 0, 0);
    part(clip, box(0.15, 0.003, 0.2), '#ffffff', 0, 0.006, 0.01, { outline: false });
    part(clip, rbox(0.06, 0.012, 0.02, 0.004), ALU, 0, 0.01, -0.105, { outline: false });
    label(clip, '플레이 테스트 설문', 0.13, 0.022, 0, 0.009, -0.07, 'none', '#4527a0', 0, -Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      part(clip, box(0.012, 0.002, 0.012), '#7e57c2', -0.06, 0.009, -0.035 + i * 0.03, { outline: false });
      part(clip, box(0.09, 0.002, 0.005), '#9e9e9e', 0.0, 0.009, -0.035 + i * 0.03, { outline: false });
    }
    // The pad: on the desk when nobody's playing, in the hands when someone is.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    gamepad(frame(idle, -0.1, ty + 0.018, front - 0.14, 0.3));
    const sitZ = front + 0.26;
    const held = frame(use, 0, 0.8, sitZ - 0.28, 0, 0.55);
    gamepad(held, held);
    const pad = marker(g, 0, 0.8, sitZ - 0.28);
    // The chair.
    const c = frame(g, 0, 0, sitZ, Math.PI);
    gamingChair(c, 0.43, '#9575cd');
    out.work = pad;
    out.spots = { '*': satAt(g, sitZ, 'gamepad', pad) };
  },

  /**
   * An office's archive shelf (자료 서가), any office's: grey steel shelving with its uprights and
   * cross braces, rows of binders with year labels on their spines, kraft archive boxes marked
   * '보존 문서', magazine files of reports, a stack of printouts under a bulldog clip, a section plate
   * on top; a blue step stool by it. Stood at it with a binder out, reading through it (its gap left
   * on the shelf); leading a training session, stood beside it turned out to the room.
   */
  archiveShelf(g, W, D, _c, _def, _ctx, out) {
    const steel = '#9aa3ab';
    const w = Math.min(W - 0.08, 0.92);
    const d = 0.4;
    const z = -D / 2 + d / 2 + 0.03;
    const zf = z + d / 2;
    const sh = 1.95;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.035, sh, 0.035, 0.006), steel, sx * (w / 2 - 0.018), sh / 2, z + sz * (d / 2 - 0.018));
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * (w / 2 - 0.018), 0.15, z - d / 2 + 0.02), new THREE.Vector3(sx * (w / 2 - 0.018), sh - 0.1, z + d / 2 - 0.02), 0.006, steel);
    const shelves = [0.06, 0.45, 0.84, 1.23, 1.62];
    for (const y of shelves) {
      part(g, rbox(w, 0.025, d, 0.004), '#b7bec5', 0, y, z);
      part(g, box(w - 0.04, 0.035, 0.008), steel, 0, y - 0.005, zf - 0.004, { outline: false });
    }
    part(g, rbox(w, 0.02, d, 0.004), '#b7bec5', 0, sh, z);
    // Row 1 (top shelf, 1.62): binders by year.
    const yearCols = ['#1565c0', '#1565c0', '#2e7d32', '#2e7d32', '#c62828', '#6a1b9a', '#455a64', '#ef6c00', '#1565c0', '#00838f'];
    const binder = (x: number, y: number, col: string, tall = 0.3) => {
      part(g, rbox(0.065, tall, 0.28, 0.006), col, x, y + tall / 2, z + 0.02);
      part(g, box(0.045, 0.08, 0.004), '#ffffff', x, y + tall * 0.62, z + 0.162, { outline: false });
      part(g, cyl(0.012, 0.012, 0.004, 10), '#eceff1', x, y + tall * 0.25, z + 0.162, { rx: Math.PI / 2, outline: false });
    };
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    yearCols.forEach((col, i) => {
      const x = -w / 2 + 0.06 + i * 0.075;
      if (i === 3) {
        // The one taken down to read: only on the shelf while nobody has it.
        part(idle, rbox(0.065, 0.3, 0.28, 0.006), col, x, 1.635 + 0.15, z + 0.02);
        part(idle, box(0.045, 0.08, 0.004), '#ffffff', x, 1.635 + 0.186, z + 0.162, { outline: false });
      } else binder(x, 1.635, col);
    });
    for (const [i, t] of ['2021', '2022', '2023', '2024', '2025'].entries()) label(g, t, 0.045, 0.02, -w / 2 + 0.06 + i * 0.15, 1.635 + 0.19, z + 0.165, 'none', '#37474f');
    // Row 2 (1.23): archive boxes.
    for (let k = 0; k < 3; k++) {
      const x = -w / 2 + 0.15 + k * 0.3;
      part(g, rbox(0.27, 0.27, 0.34, 0.008), '#c8a165', x, 1.245 + 0.135, z);
      part(g, box(0.16, 0.07, 0.004), '#ffffff', x, 1.245 + 0.16, zf - 0.028, { outline: false });
      label(g, '보존 문서', 0.15, 0.03, x, 1.245 + 0.17, zf - 0.025, 'none', '#3e2723');
      part(g, box(0.06, 0.025, 0.004), shade('#c8a165', 0.6), x, 1.245 + 0.07, zf - 0.028, { outline: false });
    }
    // Row 3 (0.84): magazine files and more binders.
    for (let k = 0; k < 4; k++) {
      const x = -w / 2 + 0.07 + k * 0.1;
      part(g, rbox(0.085, 0.3, 0.27, 0.006), k % 2 ? '#eceff1' : '#cfd8dc', x, 0.855 + 0.15, z + 0.03);
      for (let p = 0; p < 3; p++) part(g, box(0.07, 0.003, 0.24), '#ffffff', x, 0.855 + 0.31 + p * 0.004, z + 0.02, { outline: false });
    }
    for (let k = 0; k < 4; k++) binder(0.06 + k * 0.08, 0.855, ['#37474f', '#5d4037', '#37474f', '#1565c0'][k], 0.28);
    // Row 4 (0.45): stacked printouts with a bulldog clip, a file box.
    for (let p = 0; p < 4; p++) part(g, box(0.29, 0.02, 0.21), p % 2 ? '#fafafa' : '#f1f1f1', -w / 2 + 0.2, 0.47 + p * 0.022, z + 0.02, { ry: (p % 3) * 0.04 - 0.03 });
    part(g, rbox(0.06, 0.03, 0.02, 0.004), '#212121', -w / 2 + 0.2, 0.56, z + 0.12, { outline: false });
    part(g, rbox(0.38, 0.28, 0.32, 0.008), '#455a64', w / 2 - 0.23, 0.465 + 0.14, z);
    part(g, box(0.12, 0.05, 0.004), '#ffffff', w / 2 - 0.23, 0.465 + 0.17, zf - 0.039, { outline: false });
    // Row 5 (floor shelf): two archive boxes.
    for (const sx of [-1, 1]) part(g, rbox(0.4, 0.3, 0.34, 0.008), '#c8a165', sx * 0.22, 0.075 + 0.15, z);
    // The plate on top.
    label(g, '자료실 A-3', 0.26, 0.06, 0, sh + 0.05, zf - 0.02, '#37474f', '#ffffff');
    part(g, box(0.27, 0.07, 0.01), '#37474f', 0, sh + 0.05, zf - 0.03, { outline: false });
    // The step stool.
    const st = frame(g, -w / 2 + 0.17, 0, zf + 0.14, 0.2);
    part(st, rbox(0.3, 0.025, 0.24, 0.01), '#1e88e5', 0, 0.22, 0);
    part(st, rbox(0.28, 0.02, 0.1, 0.008), '#1e88e5', 0, 0.11, 0.06);
    for (const sx of [-1, 1]) part(st, rbox(0.025, 0.22, 0.24, 0.006), '#1565c0', sx * 0.13, 0.11, 0);
    const shelf = marker(g, -w / 2 + 0.285, 1.75, zf);
    out.work = shelf;
    out.spots = {
      '*': stoodAt(g, 0.05, zf + 0.42, 'read', shelf),
      correctionsOfficer_staffTraining: stoodAt(g, w / 2 + 0.1, zf + 0.55, 'present', shelf, -0.5),
    };
  },

  // ---- New pieces (2026-10-27) ----

  /**
   * The build server (빌드 서버 랙): a black rack with its servers stacked, their drive bays and
   * LEDs blinking, a UPS at the foot, cables bundled up its side into the tray on top, the CI tower
   * light on top (green: the build's good; amber, flashing, while one goes through); the console
   * drawer pulled out at chest height with its keyboard and screen (the Android build passing and the
   * QA upload going), a note taped on — '전원 끄지 마세요!!'. Stood at the drawer typing the deploy.
   */
  gdBuildServer(g, _W, D, _c, _def, _ctx, out) {
    const w = 0.62;
    const d = 0.72;
    const h = 1.95;
    const z = -D / 2 + d / 2 + 0.02;
    const zf = z + d / 2;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    // The frame: posts, top and foot, sides.
    part(g, rbox(w, 0.06, d, 0.01), BLACK, 0, 0.03, z);
    part(g, rbox(w, 0.05, d, 0.01), BLACK, 0, h - 0.025, z);
    for (const sx of [-1, 1]) {
      part(g, box(0.02, h - 0.1, d - 0.04), '#2f3036', sx * (w / 2 - 0.01), h / 2, z);
      for (const sz of [-1, 1]) part(g, rbox(0.04, h - 0.1, 0.04, 0.006), '#1b1c20', sx * (w / 2 - 0.03), h / 2, z + sz * (d / 2 - 0.03));
    }
    part(g, box(w - 0.04, h - 0.1, 0.01), '#1b1c20', 0, h / 2, z - d / 2 + 0.01, { outline: false });
    // The servers: 1U and 2U fronts with drive bays and LEDs.
    const leds: THREE.Mesh[] = [];
    const units: Array<[number, number]> = [[0.16, 0.09], [0.27, 0.09], [0.4, 0.13], [0.55, 0.13], [0.7, 0.09], [1.25, 0.09], [1.36, 0.13], [1.5, 0.09], [1.61, 0.09], [1.74, 0.13]];
    for (const [i, [y, uh]] of units.entries()) {
      part(g, rbox(w - 0.08, uh - 0.008, d - 0.08, 0.004), '#3a3c44', 0, y, z - 0.01);
      part(g, box(w - 0.1, uh - 0.02, 0.004), i % 3 === 0 ? '#cfd8dc' : '#4a4c55', 0, y, zf - 0.049, { outline: false });
      const bays = uh > 0.1 ? 8 : 4;
      for (let k = 0; k < bays; k++) part(g, box(0.05, uh > 0.1 ? 0.035 : 0.02, 0.004), '#26272c', -w / 2 + 0.1 + (k % 4) * 0.06, y + (uh > 0.1 ? (k < 4 ? 0.022 : -0.022) : 0), zf - 0.046, { outline: false });
      for (let k = 0; k < 3; k++) {
        const col = k === 2 && i % 4 === 1 ? '#ffab00' : k === 0 ? '#40c4ff' : '#76ff03';
        leds.push(part(g, box(0.008, 0.008, 0.003), col, w / 2 - 0.1 + k * 0.018, y + 0.012, zf - 0.044, { outline: false, material: glow(col) }));
      }
    }
    // The UPS at the foot.
    part(g, rbox(w - 0.08, 0.16, d - 0.08, 0.006), '#212121', 0, 0.06 + 0.08 + 0.005, z);
    part(g, box(0.1, 0.035, 0.004), '#0d1117', w / 2 - 0.16, 0.15, zf - 0.039, { outline: false });
    part(g, box(0.05, 0.01, 0.003), '#76ff03', w / 2 - 0.16, 0.15, zf - 0.036, { outline: false, material: glow('#76ff03') });
    label(g, 'UPS', 0.06, 0.025, -w / 2 + 0.1, 0.15, zf - 0.039, 'none', '#90a4ae');
    // Cables bundled up the right side into the tray on top.
    for (const [k, col] of ['#1e88e5', '#fdd835', '#e53935', '#1e88e5'].entries()) rod(g, new THREE.Vector3(w / 2 - 0.06 - k * 0.012, 0.3, zf - 0.06), new THREE.Vector3(w / 2 - 0.06 - k * 0.012, h - 0.05, zf - 0.08), 0.006, col);
    part(g, box(w - 0.1, 0.05, 0.16), '#757575', 0, h + 0.03, z - 0.1);
    // The label plate, the note.
    label(g, 'BUILD-01', 0.14, 0.03, -w / 2 + 0.11, h - 0.08, zf - 0.03, '#1b1c20', '#b39ddb');
    part(g, box(0.11, 0.09, 0.003), '#fff176', w / 2 - 0.08, 1.15, zf - 0.02, { rz: 0.08, outline: false });
    label(g, '전원 끄지 마세요!!', 0.1, 0.03, w / 2 - 0.08, 1.15, zf - 0.017, 'none', '#c62828', 0, 0);
    // The CI tower light.
    const tx = -w / 2 + 0.08;
    part(g, cyl(0.025, 0.03, 0.03, 12), BLACK, tx, h + 0.015, zf - 0.08, { outline: false });
    part(g, cyl(0.008, 0.008, 0.08, 8), CHROME, tx, h + 0.07, zf - 0.08, { outline: false });
    const segs: Array<[string, string]> = [['#2e7d32', '#69f0ae'], ['#b26a00', '#ffd740'], ['#8e0000', '#ff5252']];
    segs.forEach(([dim], k) => part(g, cyl(0.026, 0.026, 0.05, 14), dim, tx, h + 0.135 + k * 0.052, zf - 0.08, { outline: false }));
    part(g, cyl(0.0265, 0.0265, 0.05, 14), '#69f0ae', tx, h + 0.135, zf - 0.08, { outline: false, material: glow('#69f0ae') });
    part(g, cyl(0.02, 0.026, 0.02, 14), BLACK, tx, h + 0.3, zf - 0.08, { outline: false });
    const amber = part(use, cyl(0.0268, 0.0268, 0.05, 14), '#ffd740', tx, h + 0.187, zf - 0.08, { outline: false, material: glow('#ffd740') });
    // The console drawer pulled out: the tray, the keyboard, the screen flipped up.
    const dy = 1.0;
    const dd = 0.4;
    const dz = zf - 0.12 + dd / 2;
    part(g, rbox(w - 0.1, 0.03, dd, 0.006), '#2f3036', 0, dy, dz);
    for (const sx of [-1, 1]) part(g, box(0.012, 0.012, dd + 0.15), ALU, sx * (w / 2 - 0.06), dy - 0.02, dz - 0.07, { outline: false });
    part(g, rbox(0.36, 0.018, 0.12, 0.005), '#16171b', 0, dy + 0.024, dz + 0.1);
    for (let r = 0; r < 4; r++) part(g, box(0.33, 0.006, 0.02), '#3a3c44', 0, dy + 0.035, dz + 0.06 + r * 0.026, { outline: false });
    const lid = frame(g, 0, dy + 0.015, dz - 0.01, 0, -0.18);
    part(lid, rbox(w - 0.1, 0.3, 0.018, 0.006), '#2f3036', 0, 0.15, 0);
    out.screen = screenOf(lid, terminalTex(), w - 0.16, 0.26, 0, 0.155, 0.01);
    const kb = marker(g, 0, dy + 0.04, dz + 0.1);
    out.work = kb;
    out.animate = (t) => {
      amber.visible = Math.sin(t * 5) > 0;
      leds.forEach((l, i) => (l.visible = Math.sin(t * (7 + (i % 5) * 3.1) + i * 1.7) > -0.4));
    };
    out.spots = { '*': stoodAt(g, 0, dz + dd / 2 + 0.26, 'type', kb) };
  },

  /**
   * The QA device rack (디바이스 테스트 랙): a standing bench on a blue ESD mat, a pegboard behind it
   * of phones and tablets in clear holders — booting the RPG's splash, running its battle, passing
   * (one failing) their automated runs, each tagged with its model — a USB hub tower with the cables
   * up to them, '호환성 체크리스트' on a clipboard, a spare phone face down; the tablet on its stand at
   * the front. Stood at the bench tapping through the build on the tablet (lit in use).
   */
  gdDeviceRig(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.16, 1.76);
    const d = 0.58;
    const h = 0.9;
    const z = -D / 2 + d / 2 + 0.04;
    const zf = z + d / 2;
    const ty = h + 0.015;
    // The bench: a white top, grey legs and a shelf low down, the mat.
    part(g, rbox(w, 0.03, d, 0.01), '#f5f5f5', 0, h, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.04, h - 0.03, 0.04, 0.008), '#78838c', sx * (w / 2 - 0.05), (h - 0.03) / 2, z + sz * (d / 2 - 0.05));
    part(g, rbox(w - 0.08, 0.02, d - 0.08, 0.006), '#cfd8dc', 0, 0.2, z);
    for (let k = 0; k < 3; k++) part(g, rbox(0.3, 0.12, 0.25, 0.008), '#c8a165', -w / 2 + 0.3 + k * 0.4, 0.27, z - 0.04);
    part(g, rbox(w - 0.1, 0.004, d - 0.1, 0.004), '#1e6fb8', 0, ty + 0.002, z, { outline: false });
    // The pegboard.
    const pz = -D / 2 + 0.04;
    const py0 = h + 0.1;
    const ph = 0.88;
    part(g, rbox(w, ph, 0.025, 0.008), '#eceff1', 0, py0 + ph / 2, pz);
    for (let r = 0; r < 9; r++) for (let k = 0; k < 18; k++) part(g, box(0.008, 0.008, 0.002), '#b0bec5', -w / 2 + 0.06 + k * ((w - 0.12) / 17), py0 + 0.05 + r * 0.095, pz + 0.014, { outline: false });
    label(g, 'QA 디바이스 테스트', 0.5, 0.07, 0, py0 + ph - 0.06, pz + 0.016, '#263238', '#ffffff');
    // The phones and tablets in their holders, their screens and tags.
    const models = ['갤럭시 S24', '아이폰 15', '갤럭시 A15', '픽셀 8', '아이폰 SE', '갤럭시 Z플립'];
    const shots = [splashTex(), resultTex(true), battleTex(), resultTex(true), resultTex(false), splashTex()];
    for (let k = 0; k < 6; k++) {
      const x = -w / 2 + 0.14 + k * ((w - 0.28) / 5);
      const y = py0 + 0.48;
      const landscape = k === 2;
      const pw = landscape ? 0.16 : 0.08;
      const phh = landscape ? 0.08 : 0.16;
      part(g, rbox(pw + 0.01, phh + 0.01, 0.012, 0.008), '#16171b', x, y, pz + 0.03);
      sheet(g, shots[k], pw - 0.008, phh - 0.012, x, y, pz + 0.037);
      part(g, rbox(pw + 0.03, 0.02, 0.04, 0.004), '#cfe8f7', x, y - phh / 2 - 0.01, pz + 0.035, { outline: false });
      label(g, models[k], 0.1, 0.022, x, y - phh / 2 - 0.045, pz + 0.016, '#ffffff', '#37474f', 0, 0, false);
      rod(g, new THREE.Vector3(x, y - phh / 2 - 0.01, pz + 0.035), new THREE.Vector3(-w / 2 + 0.15, ty + 0.15, pz + 0.12), 0.004, '#fafafa');
    }
    // Two tablets on the lower row.
    for (const [i, x] of [-0.3, 0.3].entries()) {
      const y = py0 + 0.2;
      part(g, rbox(0.25, 0.18, 0.012, 0.01), '#16171b', x, y, pz + 0.03);
      sheet(g, i ? battleTex() : gameTex(), 0.23, 0.155, x, y, pz + 0.037);
      part(g, rbox(0.27, 0.02, 0.04, 0.004), '#cfe8f7', x, y - 0.1, pz + 0.035, { outline: false });
    }
    // The USB hub tower, the clipboard, a spare phone.
    const hx = -w / 2 + 0.15;
    part(g, rbox(0.1, 0.24, 0.1, 0.012), '#37474f', hx, ty + 0.12, pz + 0.12);
    for (let k = 0; k < 6; k++) part(g, box(0.006, 0.006, 0.003), '#40c4ff', hx - 0.03 + (k % 3) * 0.03, ty + 0.06 + Math.floor(k / 3) * 0.05, pz + 0.172, { outline: false, material: glow('#40c4ff') });
    const clip = frame(g, w / 2 - 0.22, ty + 0.006, z + 0.06, -0.2);
    part(clip, rbox(0.17, 0.008, 0.23, 0.004), '#90a4ae', 0, 0, 0);
    part(clip, box(0.15, 0.003, 0.2), '#ffffff', 0, 0.006, 0.01, { outline: false });
    label(clip, '호환성 체크리스트', 0.13, 0.022, 0, 0.009, -0.07, 'none', '#1565c0', 0, -Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      part(clip, box(0.012, 0.002, 0.012), i < 3 ? '#43a047' : '#bdbdbd', -0.06, 0.009, -0.035 + i * 0.03, { outline: false });
      part(clip, box(0.09, 0.002, 0.005), '#9e9e9e', 0, 0.009, -0.035 + i * 0.03, { outline: false });
    }
    part(g, rbox(0.08, 0.01, 0.16, 0.008), '#16171b', -0.45, ty + 0.007, z + 0.12, { ry: 0.4 });
    // The tablet on its stand at the front: where the hands go, lit in use.
    const tab = frame(g, 0, ty + 0.01, zf - 0.17, 0, -1.05);
    part(tab, rbox(0.3, 0.21, 0.012, 0.01), '#16171b', 0, 0.1, 0);
    out.screen = screenOf(tab, gameTex(), 0.27, 0.175, 0, 0.1, 0.007);
    part(g, rbox(0.14, 0.012, 0.12, 0.004), '#9e9e9e', 0, ty + 0.006, zf - 0.2);
    const touch = marker(g, 0, ty + 0.065, zf - 0.25);
    out.work = touch;
    out.spots = { '*': stoodAt(g, 0, zf + 0.36, 'type', touch) };
  },

  /**
   * The concept artist's desk (원화 작업대): a light oak top on white legs, a pen display propped up on
   * its stand with the hero's final concept on it (front and side, the palette, the red-pen notes),
   * the stylus; a reference monitor behind with the same sheet, an arm lamp, a grey clay bust on a
   * turntable, a cup of markers, a stack of art books, a slime figure; a mesh chair. Sat at it with
   * the pen on the display, drawing over the concept with the notes.
   */
  gdArtStation(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.04, 0.96);
    const h = 0.74;
    const d = Math.min(D - 0.34, 0.64);
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const ty = h + 0.015;
    part(g, rbox(w, 0.03, d, 0.01), '#d7b98e', 0, h, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.04, h - 0.03, 0.04, 0.008), '#f5f5f5', sx * (w / 2 - 0.05), (h - 0.03) / 2, z + sz * (d / 2 - 0.05));
    part(g, rbox(w - 0.1, 0.06, 0.02, 0.006), '#f5f5f5', 0, h - 0.05, z - d / 2 + 0.05);
    // The reference monitor at the back.
    const my = ty + 0.38;
    part(g, rbox(0.16, 0.012, 0.1, 0.004), BLACK, 0.12, ty + 0.006, z - 0.27);
    part(g, rbox(0.035, 0.26, 0.025, 0.008), BLACK, 0.12, ty + 0.14, z - 0.29);
    part(g, rbox(0.46, 0.28, 0.025, 0.008), BLACK, 0.12, my, z - 0.26);
    sheet(g, conceptTex(), 0.44, 0.26, 0.12, my, z - 0.246);
    // The pen display on its stand, the hero on it.
    const pd = frame(g, 0, ty + 0.05, front - 0.12, 0, -1.12);
    part(pd, rbox(0.52, 0.34, 0.02, 0.012), '#1d1e22', 0, 0.17, 0);
    out.screen = screenOf(pd, conceptTex(), 0.48, 0.3, 0, 0.17, 0.011);
    for (const sx of [-1, 1]) part(g, rbox(0.03, 0.09, 0.2, 0.008), '#3a3c44', sx * 0.22, ty + 0.045, front - 0.21, { rx: 0.3 });
    // The stylus in its holder.
    part(g, cyl(0.02, 0.022, 0.035, 12), '#3a3c44', w / 2 - 0.1, ty + 0.018, front - 0.06);
    part(g, cyl(0.005, 0.004, 0.15, 8), '#212121', w / 2 - 0.1, ty + 0.07, front - 0.06, { rz: 0.25, outline: false });
    // The lamp on its arm, the clay bust, the markers, the books, the slime.
    const lx = -w / 2 + 0.1;
    part(g, cyl(0.06, 0.07, 0.025, 14), '#eceff1', lx, ty + 0.012, z - 0.2);
    rod(g, new THREE.Vector3(lx, ty + 0.02, z - 0.2), new THREE.Vector3(lx + 0.05, ty + 0.4, z - 0.16), 0.01, '#eceff1');
    rod(g, new THREE.Vector3(lx + 0.05, ty + 0.4, z - 0.16), new THREE.Vector3(lx + 0.2, ty + 0.36, z - 0.04), 0.01, '#eceff1');
    part(g, cone(0.06, 0.08, 14), '#eceff1', lx + 0.21, ty + 0.33, z - 0.03, { rx: 0.3 });
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, cyl(0.045, 0.045, 0.005, 14), '#fffde7', lx + 0.21, ty + 0.293, z - 0.02, { outline: false, material: glow('#fffde7') });
    const bx = -w / 2 + 0.1;
    part(g, cyl(0.06, 0.06, 0.02, 16), '#5d4037', bx, ty + 0.01, front - 0.14);
    part(g, cyl(0.025, 0.035, 0.05, 10), '#9e9e9e', bx, ty + 0.045, front - 0.14);
    part(g, ball(0.045), '#9e9e9e', bx, ty + 0.11, front - 0.14).scale.set(0.9, 1.1, 1);
    part(g, ball(0.012), '#9e9e9e', bx, ty + 0.105, front - 0.1, { outline: false });
    part(g, cyl(0.032, 0.03, 0.09, 12), '#7e57c2', w / 2 - 0.1, ty + 0.045, z - 0.2);
    for (const [k, col] of ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#212121'].entries()) part(g, cyl(0.006, 0.006, 0.13, 6), col, w / 2 - 0.1 + Math.cos(k * 1.3) * 0.015, ty + 0.1, z - 0.2 + Math.sin(k * 1.3) * 0.015, { rz: Math.cos(k * 1.3) * 0.12, rx: Math.sin(k * 1.3) * 0.12, outline: false });
    for (const [k, col] of ['#283593', '#ad1457', '#00695c'].entries()) part(g, rbox(0.17, 0.03, 0.23, 0.004), col, w / 2 - 0.12, ty + 0.015 + k * 0.03, z - 0.06, { ry: k * 0.08 });
    slime(g, w / 2 - 0.12, ty + 0.09, z - 0.06, 0.035);
    // The chair.
    const c = frame(g, 0, 0, front + 0.22, Math.PI);
    meshChair(c, 0.44, '#4b5560');
    const pen = marker(g, 0.04, ty + 0.1, front - 0.21);
    out.work = pen;
    out.spots = { '*': satAt(g, front + 0.22, 'write', pen) };
  },

  /**
   * The lobby's display case (게임 피규어 진열장): a navy-framed glass cabinet lit by LED strips over
   * three glass shelves — the studio's heroes as figures (the knight with sword and cape, the mage
   * with her glowing staff, the witch, slimes, a red dragon), the 대한민국 게임대상 cup, the RPG's
   * limited edition box, the plaque for ten million downloads, a slime plush — on a closed base with
   * the studio's mark on it in white and gold.
   */
  gdFigureCase(g, W, D) {
    const w = Math.min(W - 0.3, 1.6);
    const d = 0.46;
    const z = -D / 2 + d / 2 + 0.03;
    const zf = z + d / 2;
    const navy = '#1a237e';
    const h = 1.9;
    // The base.
    part(g, rbox(w, 0.62, d, 0.015), navy, 0, 0.31, z);
    part(g, box(w - 0.06, 0.012, 0.004), '#ffd54f', 0, 0.58, zf + 0.002, { outline: false, material: glow('#ffd54f') });
    sheet(g, logoTex(), 0.86, 0.215, 0, 0.32, zf + 0.004);
    // The case above: posts, the back, the top, the shelves, the LED strips.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.03, h - 0.62, 0.03, 0.006), navy, sx * (w / 2 - 0.015), 0.62 + (h - 0.62) / 2, z + sz * (d / 2 - 0.015));
    part(g, box(w - 0.04, h - 0.64, 0.012), '#283593', 0, 0.62 + (h - 0.64) / 2, z - d / 2 + 0.01, { outline: false });
    part(g, rbox(w, 0.05, d, 0.012), navy, 0, h, z);
    const shelfY = [0.64, 1.06, 1.48];
    for (const y of shelfY) {
      const s = new THREE.Mesh(box(w - 0.06, 0.012, d - 0.06), GLASS);
      s.position.set(0, y, z);
      g.add(s);
      part(g, box(w - 0.08, 0.006, 0.01), '#ffffff', 0, y + 0.4, z + d / 2 - 0.04, { outline: false, material: glow('#e3f2fd') });
    }
    part(g, box(w - 0.08, 0.006, 0.01), '#ffffff', 0, h - 0.035, z + d / 2 - 0.04, { outline: false, material: glow('#e3f2fd') });
    // Shelf 1: the heroes and a dragon.
    const y1 = shelfY[0] + 0.006;
    chibi(g, -w / 2 + 0.18, y1, z, 0.24, { body: '#3949ab', hair: '#4e342e', extra: 'sword' });
    chibi(g, -w / 2 + 0.42, y1, z + 0.02, 0.22, { body: '#6a1b9a', hair: '#f8bbd0', extra: 'staff' });
    chibi(g, -w / 2 + 0.64, y1, z, 0.22, { body: '#212121', hair: '#ffeb3b', extra: 'hat' });
    slime(g, w / 2 - 0.62, y1, z + 0.06, 0.06);
    slime(g, w / 2 - 0.5, y1, z + 0.09, 0.035);
    // The dragon: a body, a neck and head, wings, a tail.
    const dg = frame(g, w / 2 - 0.25, y1, z, -0.4);
    part(dg, cyl(0.07, 0.08, 0.015, 16), '#263238', 0, 0.008, 0, { outline: false });
    part(dg, ball(0.07), '#c62828', 0, 0.08, 0).scale.set(1.2, 0.9, 1);
    part(dg, cyl(0.025, 0.035, 0.1, 10), '#c62828', 0.06, 0.15, 0, { rz: -0.5 });
    part(dg, ball(0.04), '#c62828', 0.1, 0.21, 0).scale.set(1.3, 0.9, 0.9);
    for (const sz of [-1, 1]) part(dg, cone(0.008, 0.035, 6), '#fff3e0', 0.08, 0.255, sz * 0.02, { rz: 0.3, outline: false });
    for (const sz of [-1, 1]) part(dg, box(0.12, 0.004, 0.1), '#8e0000', -0.02, 0.15, sz * 0.09, { rx: sz * 0.7, outline: false });
    part(dg, cone(0.03, 0.14, 8), '#c62828', -0.12, 0.05, 0, { rz: 1.4 });
    for (const sz of [-1, 1]) part(dg, ball(0.007), '#ffeb3b', 0.13, 0.22, sz * 0.022, { outline: false });
    // Shelf 2: the award cup, the limited edition box.
    const y2 = shelfY[1] + 0.006;
    const cx = -w / 2 + 0.3;
    part(g, rbox(0.14, 0.06, 0.12, 0.008), '#3e2723', cx, y2 + 0.03, z);
    part(g, cyl(0.018, 0.03, 0.08, 12), '#d4af37', cx, y2 + 0.1, z);
    part(g, cyl(0.07, 0.035, 0.12, 16), '#d4af37', cx, y2 + 0.2, z);
    for (const sx of [-1, 1]) part(g, ring(0.03, 0.006, Math.PI), '#d4af37', cx + sx * 0.07, y2 + 0.21, z, { rz: sx * Math.PI / 2, outline: false });
    label(g, '대한민국 게임대상', 0.13, 0.022, cx, y2 + 0.03, z + 0.062, 'none', '#ffd54f');
    part(g, rbox(0.2, 0.27, 0.07, 0.006), '#1a237e', 0.05, y2 + 0.135, z - 0.02, { ry: 0.15 });
    sheet(g, boxArtTex(), 0.19, 0.255, 0.05 + Math.sin(0.15) * 0.036, y2 + 0.135, z - 0.02 + Math.cos(0.15) * 0.036, 0.15);
    chibi(g, w / 2 - 0.3, y2, z + 0.03, 0.2, { body: '#00897b', hair: '#212121', extra: 'cape' });
    chibi(g, w / 2 - 0.13, y2, z, 0.18, { body: '#ef6c00', hair: '#8d6e63' });
    // Shelf 3: the plaque on its stand, a slime plush, acrylic stands.
    const y3 = shelfY[2] + 0.006;
    part(g, rbox(0.17, 0.21, 0.02, 0.006), '#3e2723', -w / 2 + 0.25, y3 + 0.11, z - 0.05, { rx: -0.12 });
    sheet(g, plaqueTex(), 0.16, 0.2, -w / 2 + 0.25, y3 + 0.11, z - 0.038, 0, -0.12);
    const plush = new THREE.Mesh(ball(0.1), new THREE.MeshToonMaterial({ color: '#81c784' }));
    plush.position.set(0, y3 + 0.07, z + 0.02);
    plush.scale.set(1, 0.7, 0.9);
    g.add(plush);
    for (const sx of [-1, 1]) part(g, ball(0.012), '#1b1b1b', sx * 0.035, y3 + 0.09, z + 0.105, { outline: false });
    for (const [k, col] of ['#e1bee7', '#b3e5fc', '#ffe0b2'].entries()) {
      const x = w / 2 - 0.4 + k * 0.13;
      part(g, box(0.09, 0.012, 0.05), '#eceff1', x, y3 + 0.006, z + 0.04, { outline: false });
      part(g, box(0.08, 0.15, 0.004), col, x, y3 + 0.09, z + 0.04, { outline: false });
      chibi(g, x, y3 + 0.03, z + 0.043, 0.1, { body: ['#6a1b9a', '#0277bd', '#ef6c00'][k], hair: ['#f8bbd0', '#212121', '#8d6e63'][k] });
    }
    // The glass doors.
    for (const sx of [-1, 1]) {
      const door = new THREE.Mesh(box(w / 2 - 0.02, h - 0.66, 0.008), GLASS);
      door.position.set(sx * (w / 4), 0.62 + (h - 0.64) / 2, zf - 0.004);
      g.add(door);
      part(g, rbox(0.012, 0.16, 0.02, 0.004), CHROME, sx * 0.03, 1.2, zf + 0.008, { outline: false });
    }
  },

  /**
   * The pantry's snack bar (탕비실 간식바): a white counter with a wood top, a glass-door drink fridge
   * under its left end lit inside on cans of soda and energy drinks; on top a hot-water dispenser for
   * cup ramen, wire baskets of snack packets, a sleeve of paper cups; open shelves on the wall over it
   * stacked with boxes of choco-pies and crisps and towers of cup ramen, '간식은 개발의 원동력!' over it
   * all. Stood at the counter with something to drink, chatting.
   */
  gdSnackBar(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.16, 1.76);
    const d = 0.56;
    const h = 0.9;
    const z = -D / 2 + d / 2 + 0.03;
    const zf = z + d / 2;
    const ty = h + 0.02;
    part(g, rbox(w, h - 0.04, d - 0.02, 0.01), '#fafafa', 0, (h - 0.04) / 2, z - 0.01);
    part(g, rbox(w + 0.02, 0.04, d + 0.02, 0.01), '#b98a5e', 0, h, z);
    part(g, box(w - 0.04, 0.06, 0.004), '#e0e0e0', 0, 0.04, zf - 0.018, { outline: false });
    // The drink fridge under the left end: its glass door, the cans in rows, the light.
    const fw = 0.56;
    const fx = -w / 2 + fw / 2 + 0.04;
    part(g, rbox(fw, h - 0.1, 0.02, 0.008), '#37474f', fx, (h - 0.1) / 2 + 0.04, zf - 0.01);
    part(g, box(fw - 0.06, h - 0.2, 0.01), '#cfeefa', fx, (h - 0.1) / 2 + 0.04, zf, { outline: false, material: GLASS });
    const canCols = ['#e53935', '#ff6d00', '#1e88e5', '#43a047', '#212121', '#fdd835', '#ff6d00'];
    for (let r = 0; r < 3; r++) {
      part(g, box(fw - 0.08, 0.008, d - 0.12), '#b0bec5', fx, 0.14 + r * 0.24, z - 0.01, { outline: false });
      for (let k = 0; k < 7; k++) part(g, cyl(0.028, 0.028, 0.11, 10), canCols[(k + r * 2) % canCols.length], fx - fw / 2 + 0.07 + k * 0.069, 0.2 + r * 0.24, zf - 0.08, { outline: false });
    }
    part(g, box(fw - 0.08, 0.008, 0.01), '#ffffff', fx, h - 0.1, zf - 0.04, { outline: false, material: glow('#e3f2fd') });
    label(g, '음료', 0.1, 0.035, fx + fw / 2 - 0.08, h - 0.12, zf + 0.006, '#37474f', '#ffffff');
    // Doors on the right of the counter.
    const r0 = fx + fw / 2 + 0.03;
    const rw = w / 2 - 0.03 - r0;
    for (let k = 0; k < 2; k++) {
      const x = r0 + (k + 0.5) * (rw / 2);
      part(g, rbox(rw / 2 - 0.02, h - 0.14, 0.012, 0.005), '#f5f5f5', x, (h - 0.04) / 2, zf - 0.01);
      part(g, rbox(0.1, 0.012, 0.02, 0.004), '#9e9e9e', x, h - 0.12, zf, { outline: false });
    }
    // On top: the hot-water dispenser, the baskets of snacks, the cups.
    const hx = w / 2 - 0.2;
    part(g, rbox(0.24, 0.36, 0.28, 0.03), '#eceff1', hx, ty + 0.18, z - 0.06);
    part(g, rbox(0.16, 0.08, 0.04, 0.01), '#455a64', hx, ty + 0.2, z + 0.08);
    part(g, rbox(0.04, 0.03, 0.03, 0.008), '#e53935', hx, ty + 0.24, z + 0.11, { outline: false });
    label(g, '온수', 0.08, 0.025, hx, ty + 0.3, z + 0.081, 'none', '#c62828');
    part(g, rbox(0.18, 0.012, 0.1, 0.004), '#9e9e9e', hx, ty + 0.006, z + 0.1);
    const packs = ['#e53935', '#fdd835', '#8d6e63', '#1e88e5', '#ff8a65', '#43a047', '#ab47bc'];
    for (const [b, bx] of [-0.15, 0.2].entries()) {
      part(g, rbox(0.3, 0.1, 0.22, 0.01), '#c8a165', bx, ty + 0.05, z + 0.02);
      part(g, box(0.28, 0.004, 0.2), '#a1887f', bx, ty + 0.1, z + 0.02, { outline: false });
      for (let k = 0; k < 6; k++) part(g, rbox(0.08, 0.025, 0.06, 0.008), packs[(k + b * 3) % packs.length], bx - 0.09 + (k % 3) * 0.09, ty + 0.105 + Math.floor(k / 3) * 0.015, z - 0.03 + Math.floor(k / 3) * 0.08, { ry: k * 0.4 });
    }
    for (let k = 0; k < 6; k++) part(g, cyl(0.035, 0.026, 0.02, 12), '#fafafa', -w / 2 + 0.12, ty + 0.01 + k * 0.016, z - 0.15, { outline: false });
    // The shelves on the wall over it.
    const sz = -D / 2 + 0.14;
    const shelfYs = [1.38, 1.72];
    for (const y of shelfYs) {
      part(g, rbox(w - 0.1, 0.03, 0.24, 0.008), '#b98a5e', 0, y, sz);
      for (const sx of [-1, 1]) part(g, box(0.02, 0.1, 0.18), '#455a64', sx * (w / 2 - 0.2), y - 0.06, sz - 0.02, { outline: false });
    }
    // Cup ramen towers, snack boxes.
    for (let t = 0; t < 3; t++) for (let k = 0; k < 4; k++) {
      const x = -w / 2 + 0.16 + t * 0.14;
      part(g, cyl(0.055, 0.045, 0.075, 14), k % 2 ? '#ffffff' : '#fafafa', x, 1.395 + 0.04 + k * 0.077, sz, { outline: false });
      part(g, cyl(0.056, 0.056, 0.02, 14), t === 1 ? '#ff6f00' : '#d32f2f', x, 1.395 + 0.06 + k * 0.077, sz, { outline: false });
    }
    label(g, '컵라면', 0.14, 0.04, -w / 2 + 0.3, 1.32, sz + 0.125, '#d32f2f', '#ffffff');
    const boxes: Array<[string, string, number]> = [['#c62828', '초코파이', 0.18], ['#fdd835', '감자칩', 0.2], ['#6d4c41', '쿠키', 0.14], ['#1e88e5', '젤리', 0.12]];
    let bx = 0.05;
    for (const [col, name, bw] of boxes) {
      part(g, rbox(bw, 0.2, 0.18, 0.006), col, bx + bw / 2, 1.395 + 0.1, sz);
      label(g, name, bw - 0.02, 0.035, bx + bw / 2, 1.395 + 0.12, sz + 0.092, 'none', col === '#fdd835' ? '#3e2723' : '#ffffff');
      bx += bw + 0.03;
    }
    for (let k = 0; k < 5; k++) part(g, rbox(0.13, 0.22, 0.17, 0.006), ['#ff8a65', '#43a047', '#ab47bc', '#e53935', '#fdd835'][k], -w / 2 + 0.2 + k * 0.17, 1.735 + 0.11, sz);
    label(g, '간식은 개발의 원동력!', 0.6, 0.075, 0.1, 2.08, sz - 0.06, '#ffb74d', '#3e2723');
    const counter = marker(g, -0.1, ty + 0.05, zf - 0.1);
    out.work = counter;
    out.spots = { '*': stoodAt(g, -0.1, zf + 0.36, 'drink', counter) };
  },
  /** The reception counter inside the glass door (2026-11-05, the layout audit; frontDesk.ts). */
  gdReception(g, W, D) {
    frontDesk(g, W, D, { name: 'STARFORGE', body: '#311b92', top: '#ede7f6', fg: '#ffd54f', bg: '#311b92', flowers: '#ffffff' });
  },
  /** The building's sign on the pavement, the studio on its floors (2026-11-05, the layout audit). */
  gdTowerSign: pavementSign('gdTowerSign', '🏢', '누리|스퀘어', ['9층 스타포지', '1층 로비 · 출입 게이트', '택배는 1층 보관함'], '#4527a0', 2.2),
};
