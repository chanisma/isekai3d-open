import * as THREE from 'three';
import { marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';

/**
 * The publishing house's editorial floor (출판사 편집국) drawn as itself (2026-10-27 workplace
 * pipeline, at the user's request): the writers' desks with the manuscript up in the word processor,
 * a stack of 원고지 and an arm lamp, the long proof table spread with galleys marked up in red, the
 * story desk under its cork board of index cards strung together act by act — and what the floor was
 * missing: the deadline board with each title's magnet moved along from 원고 to 인쇄, a trolley of
 * proofs bundled for their next read, the layout designer's desk with a book's spread on the big
 * screen and the lobby's 평대 of new releases piled cover-up under the 이달의 신간 card. Each use puts
 * the worker where it's done: sat typing up the chapter or the article, going over a notepad with a
 * pen to check the facts, red pen on the galleys, chin in hand over a plot, stood over the spread
 * proofs running the editorial meeting, at the board checking where every book has got to,
 * squaring the piles of new books.
 */

const BLACK = '#26282d';
const CHROME = '#dfe4e8';
const ALU = '#c3c9ce';
const OAK = '#b9895a';
const PAPER = '#fbf8f1';
const RED = '#d32f2f';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const SERIF = '"Batang","AppleMyungjo","Noto Serif KR",serif';
/** The publisher, made up. */
const HOUSE = '글섬출판';

/** Lit parts (lamps, LEDs): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
/** A lamp's pool of light, and the acrylic of a book stand. */
const BEAM = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
const ACRYLIC = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.4, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
const cone = (r: number, h: number) => shape(`cone${r},${h}`, () => new THREE.ConeGeometry(r, h, 20, 1, true));

/** Pictures painted once a key (screens, the boards, labels, covers). */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
/** A flat picture facing +z (turned by `ry`, tipped by `rx`), always seen in its own colours. */
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}
/** A picture lying face up on a top at `y` (its top edge to -z), turned `ry` about the vertical. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, d: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  g.add(m);
  return m;
}
/** Words on a plate, `bg` behind them (or nothing for 'none'). */
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0, font = FONT): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}|${font}`, cw, ch, (x2) => {
    if (bg !== 'none') {
      x2.fillStyle = bg;
      x2.fillRect(0, 0, cw, ch);
    }
    x2.fillStyle = fg;
    x2.font = `bold ${Math.round(ch * 0.62)}px ${font}`;
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

/** An office chair on a five-star base, its seat `h` up, facing +z in its own group. */
function officeChair(c: THREE.Object3D, h: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, BLACK);
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.024, 0.024, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, h + 0.02, 0);
  part(c, rbox(0.44, 0.5, 0.06, 0.04), color, 0, h + 0.35, -0.21, { rx: -0.08 });
  part(c, rbox(0.04, 0.2, 0.04, 0.01), BLACK, 0, h + 0.1, -0.22, { outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.05, 0.03, 0.22, 0.012), BLACK, sx * 0.25, h + 0.2, -0.01);
    part(c, rbox(0.03, 0.18, 0.03, 0.008), BLACK, sx * 0.25, h + 0.1, -0.06, { outline: false });
  }
}
/** The chair pulled up to a desk's front, `cz` out, `x` across; returns where its seat is. */
function chairAt(g: THREE.Group, x: number, cz: number, color: string): THREE.Object3D {
  const ch = new THREE.Group();
  ch.position.set(x, 0, cz);
  ch.rotation.y = Math.PI;
  g.add(ch);
  officeChair(ch, 0.44, color);
  return marker(g, x, 0.48, cz);
}

/** A spot sat in a chair at (x, z) facing -z (at its desk), and what's done there. */
function satAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, seat = 0.48): Spot {
  const s = spot(g, 'sit', x, seat, z, Math.PI, seat);
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

/** A desk monitor on its stand, facing +z. */
function monitor(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, color = BLACK): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  g.add(m);
  part(m, rbox(0.2, 0.012, 0.13, 0.004), color, 0, 0.006, 0);
  part(m, rbox(0.035, h * 0.55, 0.025, 0.008), color, 0, h * 0.3, -0.02);
  part(m, rbox(w, h, 0.025, 0.008), color, 0, h * 0.5 + 0.1, 0);
  return m;
}
/** A keyboard and mouse at (x, z) on a top at `y`. */
function keyboard(g: THREE.Object3D, x: number, y: number, z: number, w = 0.34, color = '#e4e6e8') {
  part(g, rbox(w, 0.018, 0.12, 0.006), color, x, y + 0.009, z);
  part(g, box(w - 0.03, 0.004, 0.095), shade(color, 0.78), x, y + 0.02, z, { outline: false });
  part(g, rbox(0.055, 0.022, 0.09, 0.012), color, x + w / 2 + 0.09, y + 0.011, z);
}
/** A mug, `band` round it. */
function mug(g: THREE.Object3D, x: number, y: number, z: number, color = '#ffffff', band = '#2e7d32') {
  part(g, cyl(0.035, 0.03, 0.09, 12), color, x, y + 0.045, z);
  part(g, cyl(0.0355, 0.0355, 0.02, 12), band, x, y + 0.06, z, { outline: false });
  part(g, ring(0.025, 0.007, Math.PI), color, x + 0.04, y + 0.05, z, { rz: -Math.PI / 2, outline: false });
  part(g, cyl(0.03, 0.03, 0.004, 12), '#4e342e', x, y + 0.087, z, { outline: false });
}
/** A pen (or pencil) lying on a top. */
function pen(g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = RED, len = 0.14) {
  part(g, cyl(0.0055, 0.0055, len, 6), color, x, y + 0.006, z, { rz: Math.PI / 2, ry, outline: false });
}
/** A pot of pens and pencils. */
function penPot(g: THREE.Object3D, x: number, y: number, z: number, color = '#37474f') {
  part(g, cyl(0.035, 0.035, 0.1, 12), color, x, y + 0.05, z);
  for (const [dx, dz, col] of [[-0.012, 0, RED], [0.012, 0.008, '#1a237e'], [0, -0.012, '#f9a825'], [0.006, 0.012, '#212121']] as Array<[number, number, string]>) {
    part(g, cyl(0.005, 0.005, 0.16, 6), col, x + dx, y + 0.12, z + dz, { rz: dx * 7, rx: dz * 7, outline: false });
  }
}
/** Books standing in a row from `x0` along +x, spines to +z, between `x0` and `x1`; how far they got. */
function bookRow(g: THREE.Object3D, x0: number, x1: number, y: number, z: number, seed = 0, depth = 0.17): number {
  const cols = ['#8e2b2b', '#2b4a7a', '#d8c9a8', '#3b6b4a', '#6a4c93', '#c0812f', '#f2efe6', '#455a64', '#a33b5c'];
  let x = x0;
  let i = seed;
  while (true) {
    const t = 0.025 + ((i * 37) % 5) * 0.007;
    if (x + t > x1) break;
    const hgt = 0.17 + ((i * 53) % 4) * 0.025;
    const col = cols[(i * 7) % cols.length];
    part(g, box(t, hgt, depth), col, x + t / 2, y + hgt / 2, z, { outline: (i & 1) === 0 });
    part(g, box(t + 0.001, 0.012, 0.004), tint(col, 0.55), x + t / 2, y + hgt * 0.8, z + depth / 2, { outline: false });
    x += t + 0.003;
    i++;
  }
  return x;
}
/** A stack of paper `n` sheets thick (as a block), its print on top. */
function paperStack(g: THREE.Object3D, x: number, y: number, z: number, hgt: number, ry = 0, top?: THREE.Texture, w = 0.21, d = 0.29) {
  part(g, box(w, hgt, d), PAPER, x, y + hgt / 2, z, { ry });
  for (let k = 1; k < 4; k++) part(g, box(w + 0.004, 0.0015, d + 0.004), '#e5dfd2', x, y + (hgt * k) / 4, z, { ry, outline: false });
  if (top) flat(g, top, w, d, x, y + hgt + 0.0015, z, ry);
}
/** A sheet of A4 (a galley, a page) lying on a top at `y`. */
function page(g: THREE.Object3D, tex: THREE.Texture, x: number, y: number, z: number, ry = 0) {
  part(g, box(0.21, 0.002, 0.29), PAPER, x, y + 0.001, z, { ry, outline: false });
  flat(g, tex, 0.21, 0.29, x, y + 0.0025, z, ry);
}
/** An arm lamp: its foot at (x, z) on a top at `y`, its shade over (hx, hz); the bulb and its pool of light go in `use`. */
function armLamp(g: THREE.Object3D, use: THREE.Object3D, x: number, y: number, z: number, hx: number, hz: number, color = '#263238', reach = 0.44) {
  part(g, cyl(0.07, 0.075, 0.025, 16), color, x, y + 0.012, z);
  const elbow = new THREE.Vector3(x + (hx - x) * 0.25, y + reach, z + (hz - z) * 0.2 - 0.04);
  const head = new THREE.Vector3(hx, y + reach - 0.02, hz);
  rod(g, new THREE.Vector3(x, y + 0.02, z), elbow, 0.011, color);
  rod(g, elbow, head, 0.011, color);
  part(g, ball(0.02), color, elbow.x, elbow.y, elbow.z, { outline: false });
  part(g, cyl(0.025, 0.075, 0.1, 16), color, head.x, head.y - 0.05, head.z);
  part(use, ball(0.03), '#fff8e1', head.x, head.y - 0.09, head.z, { outline: false, material: glow('#fff6d5') });
  const pool = new THREE.Mesh(cone(0.2, head.y - 0.1 - y), BEAM);
  pool.position.set(head.x, (head.y - 0.1 + y) / 2, head.z);
  use.add(pool);
}

/* ---------------------------------------------------------------- pictures */

/** The word processor on a writer's screen: the chapter coming along, the cursor at its end. */
const hwpTex = () =>
  painted('wrtHwp', 192, 120, (x2) => {
    x2.fillStyle = '#d9dee6';
    x2.fillRect(0, 0, 192, 120);
    x2.fillStyle = '#2f5597';
    x2.fillRect(0, 0, 192, 12);
    x2.fillStyle = '#fff';
    x2.font = `bold 8px ${FONT}`;
    x2.fillText('원고_7장.hwp', 5, 9);
    x2.fillStyle = '#eef1f5';
    x2.fillRect(0, 12, 192, 10);
    for (let i = 0; i < 12; i++) {
      x2.fillStyle = i % 4 === 0 ? '#5b7bb5' : '#9aa6b8';
      x2.fillRect(5 + i * 9, 14, 6, 6);
    }
    // The page: the chapter's heading and its lines, the last one half done.
    x2.fillStyle = '#ffffff';
    x2.fillRect(36, 26, 120, 94);
    x2.fillStyle = '#1f2933';
    x2.font = `bold 10px ${SERIF}`;
    x2.fillText('7. 겨울의 끝에서', 46, 42);
    x2.fillStyle = '#7b8794';
    for (let r = 0; r < 9; r++) {
      const w = r === 8 ? 46 : r % 4 === 3 ? 70 : 98;
      x2.fillRect(r % 4 === 0 ? 50 : 46, 52 + r * 7, w, 2.2);
    }
    x2.fillStyle = '#1f2933';
    x2.fillRect(96, 106, 1.2, 6);
    x2.fillStyle = '#b8c1cc';
    x2.fillRect(0, 112, 192, 8);
    x2.fillStyle = '#37474f';
    x2.font = `6px ${FONT}`;
    x2.fillText('3/12쪽  ·  4,812자', 5, 118);
  });

/** A galley proof marked up in red: the running head, set lines, the marks and the margin notes. */
const proofTex = (n: number) =>
  painted(`wrtProof${n}`, 128, 176, (x2) => {
    x2.fillStyle = PAPER;
    x2.fillRect(0, 0, 128, 176);
    x2.fillStyle = '#9e9e9e';
    x2.font = `6px ${FONT}`;
    x2.fillText(`달빛 서점 · ${140 + n}`, 14, 12);
    x2.fillText(n % 2 ? '2교' : '1교', 104, 12);
    x2.fillStyle = '#5f5f5f';
    for (let r = 0; r < 20; r++) {
      const w = r % 7 === 6 ? 50 : 92;
      x2.fillRect(r % 7 === 0 ? 20 : 14, 22 + r * 7.4, w, 2.2);
    }
    x2.strokeStyle = RED;
    x2.fillStyle = RED;
    x2.lineWidth = 1.2;
    const k = n % 3;
    // A word struck out and looped for deleting, with its mark in the margin.
    x2.beginPath();
    x2.moveTo(40 + k * 8, 37);
    x2.lineTo(66 + k * 8, 37);
    x2.stroke();
    x2.beginPath();
    x2.arc(116, 36, 4, 0, Math.PI * 1.6);
    x2.stroke();
    // A space wanted: the ∨ and the margin's #.
    x2.beginPath();
    x2.moveTo(52, 70);
    x2.lineTo(55, 75);
    x2.lineTo(58, 70);
    x2.stroke();
    x2.font = `bold 7px ${FONT}`;
    x2.fillText('#', 114, 75);
    // Two letters swapped round.
    x2.beginPath();
    x2.moveTo(30, 98);
    x2.bezierCurveTo(34, 92, 40, 92, 42, 97);
    x2.bezierCurveTo(44, 102, 50, 102, 54, 96);
    x2.stroke();
    // A line ringed with a note out to the side.
    x2.beginPath();
    x2.ellipse(62, 128 - k * 6, 26, 5, 0, 0, Math.PI * 2);
    x2.stroke();
    x2.beginPath();
    x2.moveTo(88, 128 - k * 6);
    x2.lineTo(104, 120 - k * 6);
    x2.stroke();
    x2.font = `6px ${FONT}`;
    x2.fillText(['띄어쓰기', '삭제', '확인 요'][k], 98, 116 - k * 6);
    x2.fillText('✓', 114, 160);
  });

/** The proof marks card (교정 부호표). */
const marksTex = () =>
  painted('wrtMarks', 96, 128, (x2) => {
    x2.fillStyle = '#ffffff';
    x2.fillRect(0, 0, 96, 128);
    x2.fillStyle = '#263238';
    x2.fillRect(0, 0, 96, 18);
    x2.fillStyle = '#fff';
    x2.font = `bold 10px ${FONT}`;
    x2.fillText('교정 부호표', 18, 13);
    const rows = ['띄우기', '붙이기', '삭제', '넣기', '바꾸기', '줄 바꾸기', '되살리기'];
    x2.font = `8px ${FONT}`;
    rows.forEach((t, i) => {
      const y = 31 + i * 14;
      x2.fillStyle = '#37474f';
      x2.fillText(t, 40, y + 3);
      x2.strokeStyle = RED;
      x2.lineWidth = 1.3;
      x2.beginPath();
      if (i === 0) (x2.moveTo(10, y - 3), x2.lineTo(14, y + 3), x2.lineTo(18, y - 3));
      else if (i === 1) (x2.moveTo(10, y - 3), x2.quadraticCurveTo(14, y + 5, 18, y - 3));
      else if (i === 2) (x2.moveTo(8, y), x2.lineTo(22, y), x2.arc(26, y, 3, Math.PI, Math.PI * 2.7));
      else if (i === 3) (x2.moveTo(10, y + 3), x2.lineTo(14, y - 4), x2.lineTo(18, y + 3));
      else if (i === 4) (x2.moveTo(8, y + 3), x2.bezierCurveTo(12, y - 5, 18, y - 5, 18, y), x2.bezierCurveTo(18, y + 5, 26, y + 5, 28, y - 3));
      else if (i === 5) (x2.moveTo(10, y - 4), x2.lineTo(10, y + 3), x2.lineTo(22, y + 3));
      else (x2.moveTo(8, y + 2), x2.lineTo(26, y + 2), x2.moveTo(8, y - 1), x2.lineTo(26, y - 1));
      x2.stroke();
    });
  });

/** The story desk's cork board: the three acts' index cards, pinned and strung together in red. */
const corkTex = () =>
  painted('wrtCork', 320, 192, (x2) => {
    x2.fillStyle = '#c49a68';
    x2.fillRect(0, 0, 320, 192);
    for (let i = 0; i < 900; i++) {
      x2.fillStyle = i % 3 ? 'rgba(120,80,40,0.25)' : 'rgba(240,210,160,0.3)';
      x2.fillRect((i * 97) % 320, (i * 61) % 192, 2, 2);
    }
    const acts = ['1막 · 발단', '2막 · 전개', '3막 · 결말'];
    const cards = [
      ['만남', '서점의 비밀'],
      ['편지', '배신', '추격'],
      ['고백', '재회'],
    ];
    const cols = ['#fffde7', '#fff59d', '#f8bbd0', '#b3e5fc'];
    const pins: Array<[number, number]> = [];
    acts.forEach((a, c) => {
      const cx = 14 + c * 104;
      x2.fillStyle = '#ffffff';
      x2.fillRect(cx, 8, 92, 18);
      x2.fillStyle = '#263238';
      x2.font = `bold 11px ${FONT}`;
      x2.fillText(a, cx + 14, 21);
      cards[c].forEach((t, r) => {
        const y = 36 + r * 50;
        const x = cx + (r % 2) * 10;
        x2.save();
        x2.translate(x + 40, y + 20);
        x2.rotate(((c * 3 + r) % 5 - 2) * 0.03);
        x2.fillStyle = 'rgba(0,0,0,0.18)';
        x2.fillRect(-38, -17, 80, 40);
        x2.fillStyle = cols[(c + r) % cols.length];
        x2.fillRect(-40, -20, 80, 40);
        x2.fillStyle = '#c62828';
        x2.fillRect(-40, -12, 80, 1);
        x2.fillStyle = '#212121';
        x2.font = `bold 10px ${FONT}`;
        x2.fillText(t, -34, -2);
        x2.fillStyle = '#78909c';
        x2.fillRect(-34, 5, 60, 1.6);
        x2.fillRect(-34, 11, 44, 1.6);
        x2.restore();
        pins.push([x + 40, y + 2]);
      });
    });
    // A photo for the bookshop, pinned on the side.
    x2.fillStyle = '#ffffff';
    x2.fillRect(250, 140, 50, 46);
    x2.fillStyle = '#3e5a7a';
    x2.fillRect(254, 144, 42, 32);
    x2.fillStyle = '#ffd54f';
    x2.beginPath();
    x2.arc(286, 152, 5, 0, Math.PI * 2);
    x2.fill();
    // The red string, card to card through the plot.
    x2.strokeStyle = '#c62828';
    x2.lineWidth = 1.6;
    x2.beginPath();
    pins.forEach(([px, py], i) => (i ? x2.lineTo(px, py) : x2.moveTo(px, py)));
    x2.stroke();
    x2.beginPath();
    x2.moveTo(pins[1][0], pins[1][1]);
    x2.quadraticCurveTo(200, 180, pins[6][0], pins[6][1]);
    x2.stroke();
    for (const [px, py] of pins) {
      x2.fillStyle = '#b71c1c';
      x2.beginPath();
      x2.arc(px, py, 3.2, 0, Math.PI * 2);
      x2.fill();
    }
  });

/** The plot notebook's open pages: the story's arc drawn out, the beats along it. */
const arcTex = () =>
  painted('wrtArc', 192, 128, (x2) => {
    x2.fillStyle = '#fffdf6';
    x2.fillRect(0, 0, 192, 128);
    x2.strokeStyle = '#cfd8dc';
    x2.lineWidth = 1;
    for (let r = 0; r < 11; r++) {
      x2.beginPath();
      x2.moveTo(4, 12 + r * 11);
      x2.lineTo(188, 12 + r * 11);
      x2.stroke();
    }
    x2.fillStyle = '#d7ccc8';
    x2.fillRect(95, 0, 2, 128);
    x2.strokeStyle = '#1a237e';
    x2.lineWidth = 2;
    x2.beginPath();
    x2.moveTo(10, 104);
    x2.bezierCurveTo(60, 96, 100, 70, 140, 24);
    x2.quadraticCurveTo(160, 54, 184, 92);
    x2.stroke();
    x2.fillStyle = '#1a237e';
    x2.font = `bold 10px ${FONT}`;
    [['기', 12, 120], ['승', 64, 92], ['전', 134, 18], ['결', 172, 112]].forEach(([t, x, y]) => x2.fillText(t as string, x as number, y as number));
    x2.strokeStyle = RED;
    x2.lineWidth = 1.5;
    x2.beginPath();
    x2.arc(140, 26, 9, 0, Math.PI * 2);
    x2.stroke();
    x2.fillStyle = RED;
    x2.font = `8px ${FONT}`;
    x2.fillText('반전!', 152, 44);
  });

/** The outline on the story desk's laptop. */
const outlineTex = () =>
  painted('wrtOutline', 128, 80, (x2) => {
    x2.fillStyle = '#ffffff';
    x2.fillRect(0, 0, 128, 80);
    x2.fillStyle = '#5d4037';
    x2.fillRect(0, 0, 128, 11);
    x2.fillStyle = '#fff';
    x2.font = `bold 7px ${FONT}`;
    x2.fillText('장편 구성표', 4, 8);
    x2.strokeStyle = '#bcaaa4';
    for (let r = 0; r < 6; r++) x2.strokeRect(4, 16 + r * 10, 120, 10);
    x2.beginPath();
    x2.moveTo(28, 16);
    x2.lineTo(28, 76);
    x2.stroke();
    x2.font = `6px ${FONT}`;
    x2.fillStyle = '#3e2723';
    ['1장', '2장', '3장', '4장', '5장', '6장'].forEach((t, i) => {
      x2.fillText(t, 8, 23 + i * 10);
      x2.fillStyle = '#9e9e9e';
      x2.fillRect(32, 20 + i * 10, 40 + ((i * 29) % 50), 2);
      x2.fillStyle = '#3e2723';
    });
  });

/** The deadline board's grid: each title, its stages, the dates. Its cells, in the texture's pixels. */
const DL = { cw: 512, ch: 288, x0: 18, nameW: 168, cell: 56, y0: 72, row: 38, stages: ['원고', '1교', '2교', '3교', '인쇄'] };
const DL_ROWS: Array<{ title: string; kind: string; at: number; due: string; late?: boolean }> = [
  { title: '『달빛 서점』 12화', kind: '연재', at: 2, due: '10/30' },
  { title: '『바람의 계보』', kind: '장편', at: 1, due: '11/04' },
  { title: '11월호 특집 기사', kind: '잡지', at: 0, due: '10/28', late: true },
  { title: '『오늘의 문장』', kind: '에세이', at: 4, due: '10/27' },
  { title: '시집 『첫눈』', kind: '시', at: 3, due: '11/10' },
];
const MAGNET = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa'];
const deadlineTex = () =>
  painted('wrtDeadline', DL.cw, DL.ch, (x2) => {
    x2.fillStyle = '#fbfcfd';
    x2.fillRect(0, 0, DL.cw, DL.ch);
    x2.fillStyle = '#2e4a3a';
    x2.fillRect(0, 0, DL.cw, 40);
    x2.fillStyle = '#fff';
    x2.font = `bold 24px ${FONT}`;
    x2.fillText('10월 원고 마감 현황', 18, 29);
    x2.font = `bold 13px ${FONT}`;
    x2.fillStyle = '#ffe082';
    x2.fillText(`${HOUSE} 편집국`, 392, 27);
    // The header and the grid, in printed tape lines.
    x2.fillStyle = '#37474f';
    x2.font = `bold 14px ${FONT}`;
    x2.fillText('작품', DL.x0 + 8, DL.y0 - 12);
    DL.stages.forEach((s, i) => x2.fillText(s, DL.x0 + DL.nameW + i * DL.cell + 14, DL.y0 - 12));
    x2.fillText('마감', DL.x0 + DL.nameW + 5 * DL.cell + 12, DL.y0 - 12);
    x2.strokeStyle = '#263238';
    x2.lineWidth = 2;
    const right = DL.x0 + DL.nameW + 6 * DL.cell;
    for (let r = 0; r <= DL_ROWS.length; r++) {
      x2.beginPath();
      x2.moveTo(DL.x0, DL.y0 + r * DL.row - 4);
      x2.lineTo(right, DL.y0 + r * DL.row - 4);
      x2.stroke();
    }
    x2.lineWidth = 1;
    for (let c = 0; c <= 6; c++) {
      x2.beginPath();
      x2.moveTo(DL.x0 + DL.nameW + c * DL.cell, DL.y0 - 26);
      x2.lineTo(DL.x0 + DL.nameW + c * DL.cell, DL.y0 + DL_ROWS.length * DL.row - 4);
      x2.stroke();
    }
    // Each title, its kind, the stages done crossed off in marker, the due date.
    DL_ROWS.forEach((r, i) => {
      const y = DL.y0 + i * DL.row + 20;
      x2.fillStyle = '#1a237e';
      x2.font = `bold 15px ${FONT}`;
      x2.fillText(r.title, DL.x0 + 6, y);
      x2.fillStyle = '#78909c';
      x2.font = `10px ${FONT}`;
      x2.fillText(r.kind, DL.x0 + 6, y + 12);
      for (let s = 0; s < r.at; s++) {
        const cx = DL.x0 + DL.nameW + s * DL.cell + DL.cell / 2;
        x2.strokeStyle = '#43a047';
        x2.lineWidth = 3;
        x2.beginPath();
        x2.moveTo(cx - 9, y - 4);
        x2.lineTo(cx - 2, y + 3);
        x2.lineTo(cx + 11, y - 11);
        x2.stroke();
      }
      x2.fillStyle = r.late ? '#c62828' : '#263238';
      x2.font = `bold 14px ${FONT}`;
      x2.fillText(r.due, DL.x0 + DL.nameW + 5 * DL.cell + 6, y + 2);
    });
    // Out to the right: the print date ringed, and what's not to forget.
    x2.strokeStyle = '#c62828';
    x2.lineWidth = 3;
    x2.beginPath();
    x2.ellipse(470, 92, 30, 22, -0.1, 0, Math.PI * 2);
    x2.stroke();
    x2.fillStyle = '#c62828';
    x2.font = `bold 18px ${FONT}`;
    x2.fillText('D-3', 452, 90);
    x2.font = `bold 11px ${FONT}`;
    x2.fillText('인쇄 입고', 446, 106);
    x2.fillStyle = '#1a3c9e';
    x2.font = `12px ${FONT}`;
    x2.fillText('표지 시안 확정!', 432, 150);
    x2.fillText('저자 미팅 목 2시', 430, 170);
    x2.fillText('ISBN 신청', 432, 190);
  });

/** The layout app on the designer's big screen: a book's spread set on the pasteboard. */
const layoutTex = () =>
  painted('wrtLayout', 288, 160, (x2) => {
    x2.fillStyle = '#323232';
    x2.fillRect(0, 0, 288, 160);
    x2.fillStyle = '#4a4a4a';
    x2.fillRect(0, 0, 288, 10);
    x2.fillStyle = '#ff6fa8';
    x2.fillRect(4, 2, 12, 6);
    x2.fillStyle = '#bdbdbd';
    x2.font = `6px ${FONT}`;
    x2.fillText('달빛서점_본문_v7.indd @ 75%', 22, 8);
    // The tools down the left, the panels down the right.
    x2.fillStyle = '#2a2a2a';
    x2.fillRect(0, 10, 12, 150);
    for (let i = 0; i < 12; i++) {
      x2.fillStyle = '#8a8a8a';
      x2.fillRect(3, 14 + i * 10, 6, 6);
    }
    x2.fillStyle = '#2a2a2a';
    x2.fillRect(240, 10, 48, 150);
    for (let i = 0; i < 6; i++) {
      x2.fillStyle = '#5a5a5a';
      x2.fillRect(244, 16 + i * 22, 40, 16);
      x2.fillStyle = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#bdbdbd'][i];
      x2.fillRect(246, 18 + i * 22, 6, 6);
    }
    // The spread: the chapter's opening on the right, the text on the left, the guides in magenta.
    x2.fillStyle = '#9e9e9e';
    x2.fillRect(12, 10, 228, 150);
    x2.fillStyle = 'rgba(0,0,0,0.3)';
    x2.fillRect(30, 26, 196, 124);
    x2.fillStyle = '#ffffff';
    x2.fillRect(26, 22, 98, 124);
    x2.fillRect(124, 22, 98, 124);
    x2.strokeStyle = '#e040fb';
    x2.lineWidth = 0.8;
    x2.strokeRect(36, 32, 78, 104);
    x2.strokeRect(134, 32, 78, 104);
    x2.fillStyle = '#555';
    for (let r = 0; r < 15; r++) x2.fillRect(38, 35 + r * 6.6, r === 14 ? 40 : 74, 2);
    x2.fillStyle = '#222';
    x2.font = `bold 13px ${SERIF}`;
    x2.fillText('제3장', 150, 62);
    x2.font = `9px ${SERIF}`;
    x2.fillText('새벽의 편지', 150, 76);
    x2.fillStyle = '#e040fb';
    x2.fillRect(150, 82, 40, 0.8);
    x2.fillStyle = '#555';
    for (let r = 0; r < 7; r++) x2.fillRect(136, 94 + r * 6.6, r === 0 ? 66 : 74, 2);
    x2.fillStyle = '#888';
    x2.font = `5px ${FONT}`;
    x2.fillText('86', 72, 142);
    x2.fillText('87', 170, 142);
    // The text frame picked, its handles.
    x2.strokeStyle = '#29b6f6';
    x2.lineWidth = 1;
    x2.strokeRect(134, 90, 78, 46);
    for (const [hx, hy] of [[134, 90], [212, 90], [134, 136], [212, 136]]) {
      x2.fillStyle = '#fff';
      x2.fillRect(hx - 2, hy - 2, 4, 4);
      x2.strokeRect(hx - 2, hy - 2, 4, 4);
    }
  });

/** A colour proof of the cover, pinned up by the designer's screen. */
const coverProofTex = () =>
  painted('wrtCoverProof', 96, 128, (x2) => {
    x2.fillStyle = '#ffffff';
    x2.fillRect(0, 0, 96, 128);
    x2.drawImage(coverCanvas(0), 12, 10, 72, 104);
    // Crop marks and the colour bar along the foot.
    x2.strokeStyle = '#000';
    x2.lineWidth = 0.6;
    for (const [cx, cy] of [[12, 10], [84, 10], [12, 114], [84, 114]]) {
      x2.beginPath();
      x2.moveTo(cx - 6 * Math.sign(48 - cx), cy);
      x2.lineTo(cx - 2 * Math.sign(48 - cx), cy);
      x2.moveTo(cx, cy - 6 * Math.sign(64 - cy));
      x2.lineTo(cx, cy - 2 * Math.sign(64 - cy));
      x2.stroke();
    }
    ['#00bcd4', '#e91e63', '#ffeb3b', '#000'].forEach((c, i) => {
      x2.fillStyle = c;
      x2.fillRect(20 + i * 14, 118, 12, 6);
    });
  });

/** The new books (made up): title, author, the cover's colours and its picture. */
const BOOKS: Array<{ title: string; author: string; bg: string; fg: string; art: 'moon' | 'hills' | 'leaf' | 'snow' | 'window' | 'waves' }> = [
  { title: '달빛 서점', author: '김서윤 장편소설', bg: '#1d2b53', fg: '#ffe9a8', art: 'moon' },
  { title: '바람의 계보', author: '이도현 장편소설', bg: '#c98b3c', fg: '#2b1d0e', art: 'hills' },
  { title: '오늘의 문장', author: '박하린 에세이', bg: '#efe6d2', fg: '#2e4a3a', art: 'leaf' },
  { title: '첫눈', author: '정우진 시집', bg: '#dbe9f4', fg: '#24476b', art: 'snow' },
  { title: '밤의 도서관', author: '윤수아 소설', bg: '#7d1f2b', fg: '#fbe3c8', art: 'window' },
  { title: '여름 바다로', author: '한지오 산문', bg: '#2f8f9d', fg: '#ffffff', art: 'waves' },
];
/** A book's cover on a canvas (made once a book: the covers on the table and the cover proof share it). */
const coverCanvases = new Map<number, HTMLCanvasElement>();
function coverCanvas(i: number): HTMLCanvasElement {
  let c = coverCanvases.get(i);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 96;
  c.height = 140;
  coverCanvases.set(i, c);
  const x2 = c.getContext('2d')!;
  const b = BOOKS[i % BOOKS.length];
  x2.fillStyle = b.bg;
  x2.fillRect(0, 0, 96, 140);
  x2.fillStyle = b.fg;
  x2.strokeStyle = b.fg;
  x2.lineWidth = 2;
  if (b.art === 'moon') {
    x2.beginPath();
    x2.arc(60, 46, 18, 0, Math.PI * 2);
    x2.fill();
    x2.fillStyle = b.bg;
    x2.beginPath();
    x2.arc(68, 40, 16, 0, Math.PI * 2);
    x2.fill();
    x2.fillStyle = '#f6c667';
    x2.fillRect(18, 74, 26, 20);
    x2.fillStyle = b.bg;
    x2.fillRect(22, 78, 8, 12);
  } else if (b.art === 'hills') {
    x2.beginPath();
    x2.moveTo(0, 90);
    x2.quadraticCurveTo(30, 60, 50, 80);
    x2.quadraticCurveTo(72, 52, 96, 76);
    x2.lineTo(96, 140);
    x2.lineTo(0, 140);
    x2.fill();
    x2.beginPath();
    for (let k = 0; k < 3; k++) {
      x2.moveTo(14, 30 + k * 10);
      x2.quadraticCurveTo(48, 20 + k * 10, 82, 32 + k * 10);
    }
    x2.stroke();
  } else if (b.art === 'leaf') {
    x2.beginPath();
    x2.ellipse(48, 60, 12, 26, 0.5, 0, Math.PI * 2);
    x2.fill();
    x2.strokeStyle = b.bg;
    x2.beginPath();
    x2.moveTo(36, 82);
    x2.lineTo(60, 38);
    x2.stroke();
  } else if (b.art === 'snow') {
    for (let k = 0; k < 26; k++) {
      x2.beginPath();
      x2.arc((k * 37) % 92 + 2, (k * 53) % 86 + 8, 1.5 + (k % 3), 0, Math.PI * 2);
      x2.fill();
    }
  } else if (b.art === 'window') {
    x2.strokeRect(30, 26, 36, 52);
    x2.beginPath();
    x2.moveTo(48, 26);
    x2.lineTo(48, 78);
    x2.moveTo(30, 52);
    x2.lineTo(66, 52);
    x2.stroke();
    x2.fillStyle = '#ffd36b';
    x2.fillRect(32, 28, 15, 23);
  } else {
    for (let k = 0; k < 5; k++) {
      x2.beginPath();
      x2.moveTo(0, 40 + k * 12);
      for (let xx = 0; xx <= 96; xx += 12) x2.quadraticCurveTo(xx + 6, 34 + k * 12, xx + 12, 40 + k * 12);
      x2.stroke();
    }
  }
  x2.fillStyle = b.fg;
  x2.textAlign = 'center';
  x2.font = `bold 15px ${SERIF}`;
  x2.fillText(b.title, 48, 112, 88);
  x2.font = `7px ${FONT}`;
  x2.fillText(b.author, 48, 124, 88);
  x2.font = `bold 6px ${FONT}`;
  x2.fillText(HOUSE, 48, 135);
  return c;
}
const coverTex = (i: number) => painted(`wrtCover${i % BOOKS.length}`, 96, 140, (x2) => x2.drawImage(coverCanvas(i), 0, 0));

/** The bestseller list up over the new books. */
const rankTex = () =>
  painted('wrtRank', 256, 160, (x2) => {
    x2.fillStyle = '#fffaf0';
    x2.fillRect(0, 0, 256, 160);
    x2.fillStyle = '#7d1f2b';
    x2.fillRect(0, 0, 256, 30);
    x2.fillStyle = '#fff';
    x2.font = `bold 17px ${FONT}`;
    x2.fillText('이번 주 베스트셀러', 14, 21);
    x2.font = `bold 9px ${FONT}`;
    x2.fillStyle = '#ffd54f';
    x2.fillText(HOUSE, 200, 20);
    BOOKS.slice(0, 5).forEach((b, i) => {
      const y = 50 + i * 22;
      x2.fillStyle = i === 0 ? '#c62828' : '#37474f';
      x2.font = `bold 15px ${FONT}`;
      x2.fillText(String(i + 1), 16, y);
      x2.fillStyle = '#212121';
      x2.font = `bold 12px ${SERIF}`;
      x2.fillText(b.title, 40, y);
      x2.fillStyle = '#78909c';
      x2.font = `9px ${FONT}`;
      x2.fillText(b.author, 140, y);
      x2.fillStyle = i % 2 ? '#1e88e5' : '#e53935';
      x2.fillText(i % 2 ? '▼' : '▲', 236, y);
    });
  });

/* ---------------------------------------------------------------- the pieces */

/** Uses at a writer's desk done with the pen on a notepad, not at the keyboard: checking facts, notes. */
const PEN = /interviewSource|factCheck|notes/i;
/** Uses at the proof table led stood over the spread proofs: the editorial meeting. */
const MEETS = /deskMeeting|meeting/i;
/** Uses at the story desk done at the laptop (a webtoon's readers' comments), or talked through (mentoring). */
const LAPTOP = /readComments|type|upload/i;
const TALKS = /mentor|coach|feedback/i;

export const BUILDERS: Record<string, Builder> = {
  /**
   * A writer's desk (집필 책상): an oak top on a black steel frame with a drawer under it; the monitor
   * with the chapter up in the word processor (lit in use, the cursor at the end of the line), the
   * keyboard, an arm lamp at the back left that comes on over a stack of 원고지 with a red pen, a
   * reporter's spiral notepad open on the right, reference books between bookends, a green-banded mug,
   * sticky notes on the screen's edge and a wastebasket under it of screwed-up drafts; an office chair
   * pulled up. Sat in it typing the manuscript, the article, the column or the scoop; the facts are
   * checked with the pen on the notepad.
   */
  writingDesk(g, W, D, c, def, _ctx, out) {
    const w = Math.min(W - 0.06, 0.94);
    const h = 0.74;
    const d = Math.min(D - 0.36, 0.62);
    const z = -D / 2 + d / 2 + 0.03;
    const front = z + d / 2;
    const top = def.id === 'writingDesk' ? OAK : c;
    part(g, rbox(w, 0.035, d, 0.012), top, 0, h, z);
    part(g, box(w, 0.012, 0.012), shade(top, 0.75), 0, h - 0.012, front, { outline: false });
    // The steel frame: a post at each corner, a foot and a rail along each side, a bar across the back.
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.04);
      for (const sz of [-1, 1]) part(g, rbox(0.035, h - 0.02, 0.035, 0.008), BLACK, x, (h - 0.02) / 2, z + sz * (d / 2 - 0.05));
      part(g, rbox(0.04, 0.025, d - 0.06, 0.008), BLACK, x, 0.0125, z);
      part(g, rbox(0.03, 0.03, d - 0.1, 0.008), BLACK, x, h - 0.035, z, { outline: false });
    }
    part(g, rbox(w - 0.1, 0.03, 0.03, 0.008), BLACK, 0, h - 0.06, z - d / 2 + 0.05, { outline: false });
    // The drawer under the right of the top.
    part(g, rbox(0.36, 0.1, d - 0.12, 0.01), shade(top, 0.9), w / 2 - 0.24, h - 0.07, z);
    part(g, rbox(0.12, 0.014, 0.016, 0.006), '#3e2723', w / 2 - 0.24, h - 0.07, z + (d - 0.12) / 2 + 0.006, { outline: false });
    const ty = h + 0.0175;
    // The monitor with the chapter, sticky notes on its edge.
    const mx = 0;
    const mon = monitor(g, mx, ty, z - 0.17, 0.48, 0.29);
    out.screen = screenOf(mon, hwpTex(), 0.455, 0.265, 0, 0.245, 0.014);
    part(mon, box(0.06, 0.06, 0.004), '#fff176', 0.21, 0.36, 0.015, { rz: 0.1, outline: false });
    part(mon, box(0.06, 0.06, 0.004), '#f8bbd0', 0.2, 0.29, 0.015, { rz: -0.06, outline: false });
    const kb = marker(g, mx - 0.03, ty + 0.03, z + 0.14);
    keyboard(g, mx - 0.03, ty, z + 0.14, 0.32);
    // The lamp at the back left, over a stack of 원고지 with the red pen on it.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const gx = -w / 2 + 0.15;
    const gz = z + 0.06;
    armLamp(g, use, -w / 2 + 0.08, ty, z - d / 2 + 0.1, gx + 0.02, gz - 0.02, '#2e4a3a', 0.42);
    const gridTex = painted('wrtGenkou', 96, 128, (x2) => {
      x2.fillStyle = '#fffdf7';
      x2.fillRect(0, 0, 96, 128);
      x2.strokeStyle = '#e57373';
      x2.lineWidth = 0.7;
      for (let cx = 0; cx < 10; cx++) for (let cy = 0; cy < 12; cy++) x2.strokeRect(6 + cx * 8.4, 8 + cy * 9.6, 7.6, 7.6);
      x2.fillStyle = '#263238';
      x2.font = `6px ${SERIF}`;
      const text = '그날밤서점의불은꺼지지않았다편지는';
      for (let k = 0; k < text.length; k++) x2.fillText(text[k], 7.5 + (9 - Math.floor(k / 12)) * 8.4, 14.5 + (k % 12) * 9.6);
    });
    paperStack(g, gx, ty, gz, 0.03, 0.08, gridTex, 0.2, 0.27);
    pen(g, gx + 0.05, ty + 0.03, gz + 0.06, 0.6, RED);
    // The notepad open on the right, its pen; the books in their bookends; the mug.
    const nx = w / 2 - 0.12;
    const nz = z + 0.15;
    part(g, rbox(0.15, 0.012, 0.22, 0.004), '#5d4037', nx, ty + 0.006, nz, { ry: -0.15 });
    const pad = painted('wrtPad', 64, 96, (x2) => {
      x2.fillStyle = '#fffbe8';
      x2.fillRect(0, 0, 64, 96);
      x2.strokeStyle = '#90caf9';
      for (let r = 0; r < 11; r++) {
        x2.beginPath();
        x2.moveTo(2, 16 + r * 7.5);
        x2.lineTo(62, 16 + r * 7.5);
        x2.stroke();
      }
      x2.fillStyle = '#1a237e';
      x2.font = `bold 7px ${FONT}`;
      x2.fillText('취재 메모', 6, 11);
      for (let r = 0; r < 8; r++) x2.fillRect(6 + (r % 3) * 2, 19 + r * 7.5, 30 + ((r * 17) % 22), 1.4);
      x2.strokeStyle = RED;
      x2.beginPath();
      x2.arc(30, 50, 9, 0, Math.PI * 2);
      x2.stroke();
    });
    flat(g, pad, 0.13, 0.2, nx, ty + 0.013, nz, -0.15);
    for (let k = 0; k < 6; k++) part(g, ring(0.008, 0.002), '#9e9e9e', nx - 0.05 + k * 0.02, ty + 0.014, nz - 0.1, { ry: -0.15, outline: false });
    pen(g, nx + 0.08, ty + 0.012, nz + 0.02, 1.3, '#1a237e');
    const note = marker(g, nx, ty + 0.015, nz);
    const bx = w / 2 - 0.2;
    part(g, rbox(0.012, 0.13, 0.12, 0.004), '#455a64', bx, ty + 0.065, z - d / 2 + 0.1);
    const bend = bookRow(g, bx + 0.008, w / 2 - 0.03, ty, z - d / 2 + 0.1, 2, 0.14);
    part(g, rbox(0.012, 0.13, 0.12, 0.004), '#455a64', bend + 0.006, ty + 0.065, z - d / 2 + 0.1);
    mug(g, w / 2 - 0.08, ty, z - 0.07);
    // A wastebasket of screwed-up drafts.
    part(g, cyl(0.11, 0.09, 0.26, 16), '#9e9e9e', w / 2 - 0.16, 0.13, z - 0.02);
    part(g, cyl(0.1, 0.1, 0.01, 16), '#616161', w / 2 - 0.16, 0.25, z - 0.02, { outline: false });
    for (const [dx, dz] of [[-0.03, 0.01], [0.03, -0.02], [0, 0.03], [0.04, 0.04]]) part(g, ball(0.035), PAPER, w / 2 - 0.16 + dx, 0.27 + (dx > 0 ? 0.01 : 0), z - 0.02 + dz);
    part(g, ball(0.033), PAPER, w / 2 - 0.02, 0.033, z + 0.14);
    // The chair, pulled up.
    const cz = front + 0.26;
    out.seat = chairAt(g, 0, cz, '#37474f');
    out.work = kb;
    const spots: Record<string, Spot> = { '*': satAt(g, 0, cz, 'type', kb) };
    for (const i of def.interactions) if (PEN.test(i.id)) spots[i.id] = satAt(g, 0, cz, 'write', note);
    out.spots = spots;
  },

  /**
   * The proof table (교정 테이블): a long oak table on square walnut legs, spread with galleys marked
   * up in red (struck words, the ∨ for a space, the swap loop, notes in the margin), more galleys in
   * clipped stacks banded 1교 and 2교, the proof-marks card on an acrylic stand, an arm lamp coming on
   * over the reader's pages, the red pens, a ruler, the 교정 완료 stamp on its pad and the bound
   * dummies of the next book; a chair at the left end. Proofs (and the editor's notes) are read sat
   * at the left with the red pen; the editorial meeting is led stood at the right over the spread
   * pages, notebook in hand, pointing out what goes in.
   */
  proofTable(g, W, D, c, def, _ctx, out) {
    const w = Math.min(W - 0.1, 1.9);
    const h = 0.74;
    const d = Math.min(D - 0.34, 0.66);
    const z = -D / 2 + d / 2 + 0.03;
    const front = z + d / 2;
    const top = def.id === 'proofTable' ? '#c79a6b' : c;
    const leg = '#5d4037';
    part(g, rbox(w, 0.045, d, 0.012), top, 0, h, z);
    part(g, rbox(w - 0.1, 0.07, d - 0.1, 0.01), shade(leg, 1.1), 0, h - 0.06, z, { outline: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.06, h - 0.02, 0.06, 0.012), leg, sx * (w / 2 - 0.06), (h - 0.02) / 2, z + sz * (d / 2 - 0.06));
    part(g, rbox(w - 0.16, 0.03, 0.03, 0.01), leg, 0, 0.12, z, { outline: false });
    const ty = h + 0.0225;
    const lx = -w / 2 + 0.5;
    // The reader's pages in front of the chair, the red pen across them.
    page(g, proofTex(1), lx - 0.12, ty, front - 0.19, 0.04);
    page(g, proofTex(2), lx + 0.12, ty, front - 0.19, -0.03);
    pen(g, lx + 0.06, ty + 0.003, front - 0.12, 0.5, RED);
    part(g, rbox(0.3, 0.004, 0.03, 0.002), '#cfd8dc', lx - 0.02, ty + 0.004, front - 0.05, { ry: 0.05, outline: false });
    const read = marker(g, lx, ty + 0.01, front - 0.17);
    // Clipped stacks at the back, banded with where they've got to.
    for (const [sx, hgt, band, ry] of [[-w / 2 + 0.16, 0.1, '1교', 0.06], [-w / 2 + 0.42, 0.06, '2교', -0.08]] as Array<[number, number, string, number]>) {
      const sz = z - d / 2 + 0.18;
      paperStack(g, sx, ty, sz, hgt, ry, proofTex(hgt > 0.08 ? 3 : 4));
      part(g, box(0.215, 0.03, 0.296), band === '1교' ? '#ffb74d' : '#81c784', sx, ty + hgt * 0.5, sz, { ry, outline: false });
      label(g, band, 0.06, 0.028, sx, ty + hgt * 0.5, sz + 0.149, '#ffffff', '#263238', ry);
      part(g, rbox(0.05, 0.025, 0.02, 0.004), BLACK, sx, ty + hgt + 0.008, sz - 0.13, { ry, outline: false });
    }
    // The lamp, back of centre, over the reader's pages.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    armLamp(g, use, -0.05, ty, z - d / 2 + 0.08, lx + 0.02, front - 0.24, '#37474f', 0.46);
    // The marks card on its stand.
    const mcz = z - d / 2 + 0.1;
    part(g, box(0.12, 0.16, 0.006), '#e3f2fd', 0.14, ty + 0.08, mcz, { rx: -0.25, material: ACRYLIC, outline: false });
    part(g, box(0.12, 0.012, 0.06), '#e3f2fd', 0.14, ty + 0.006, mcz + 0.02, { material: ACRYLIC, outline: false });
    sheet(g, marksTex(), 0.11, 0.15, 0.14, ty + 0.08, mcz + 0.005, 0, -0.25);
    // The meeting's spread on the right: four galleys laid out in two rows.
    const rx = w / 2 - 0.5;
    for (let k = 0; k < 4; k++) page(g, proofTex(5 + k), rx - 0.12 + (k % 2) * 0.24, ty, front - 0.18 - Math.floor(k / 2) * 0.31, ((k * 3) % 5 - 2) * 0.03);
    const spread = marker(g, rx, ty + 0.01, front - 0.25);
    // The stamp on its pad, the dummies, a pot of pens and a mug.
    const sx = 0.16;
    const sz = front - 0.12;
    part(g, rbox(0.1, 0.018, 0.07, 0.008), '#263238', sx, ty + 0.009, sz);
    part(g, box(0.085, 0.004, 0.055), '#b71c1c', sx, ty + 0.019, sz, { outline: false });
    part(g, cyl(0.022, 0.026, 0.05, 12), '#8d6e63', sx + 0.1, ty + 0.025, sz);
    part(g, ball(0.024), '#6d4c41', sx + 0.1, ty + 0.06, sz, { outline: false });
    label(g, '교정 완료', 0.08, 0.025, sx + 0.1, ty + 0.0035, sz + 0.07, 'none', '#c62828', 0, -Math.PI / 2);
    for (let k = 0; k < 3; k++) part(g, rbox(0.15, 0.03, 0.21, 0.006), ['#f5f5f5', '#efebe9', '#eceff1'][k], w / 2 - 0.13, ty + 0.015 + k * 0.031, z - d / 2 + 0.16, { ry: (k - 1) * 0.08 });
    flat(g, coverTex(0), 0.15, 0.21, w / 2 - 0.13, ty + 0.094, z - d / 2 + 0.16, 0.08);
    penPot(g, -0.1, ty, front - 0.13, '#5d4037');
    mug(g, w / 2 - 0.1, ty, front - 0.08, '#ffffff', RED);
    // The chair at the left.
    const cz = front + 0.24;
    out.seat = chairAt(g, lx, cz, '#5d4037');
    out.work = read;
    const spots: Record<string, Spot> = { '*': satAt(g, lx, cz, 'write', read) };
    for (const i of def.interactions) if (MEETS.test(i.id)) spots[i.id] = stoodAt(g, rx, front + 0.34, 'meeting', spread);
    out.spots = spots;
  },

  /**
   * The story desk (스토리 책상), any storyteller's (the publisher's novelists, the webtoon studio's
   * writers): a walnut desk with a cork board stood up along its back — the three acts' index cards
   * pinned in their columns and strung together in red, a photo of the place — a few cards stuck on
   * proud of it; on the desk a notebook open on the story's arc (기승전결, the twist ringed), packs of
   * coloured cards, the laptop with the outline (lit in use), a pot of pencils and a mug; a chair
   * pulled up. Sat with the pen over the notebook working the plot out; at the laptop reading the
   * readers' comments; leant back, chin in hand, talking a new writer through their draft.
   */
  plotDesk(g, W, D, c, def, _ctx, out) {
    const w = Math.min(W - 0.06, 0.94);
    const h = 0.74;
    const d = Math.min(D - 0.36, 0.62);
    const z = -D / 2 + d / 2 + 0.03;
    const front = z + d / 2;
    const wood = def.id === 'plotDesk' ? '#7b5a48' : c;
    part(g, rbox(w, 0.04, d, 0.012), wood, 0, h, z);
    for (const sx of [-1, 1]) {
      // Panel ends, a modesty board between them.
      part(g, rbox(0.04, h - 0.02, d - 0.04, 0.01), shade(wood, 0.85), sx * (w / 2 - 0.03), (h - 0.02) / 2, z);
    }
    part(g, rbox(w - 0.1, 0.36, 0.02, 0.008), shade(wood, 0.8), 0, h - 0.22, z - d / 2 + 0.06);
    const ty = h + 0.02;
    // The cork board on two posts along the back.
    const bw = w - 0.04;
    const bh = 0.56;
    const bz = z - d / 2 + 0.035;
    const by = ty + 0.1 + bh / 2;
    for (const sx of [-1, 1]) part(g, rbox(0.03, by + bh / 2 - ty, 0.03, 0.006), shade(wood, 0.7), sx * (bw / 2 - 0.06), ty + (by + bh / 2 - ty) / 2, bz - 0.02);
    part(g, rbox(bw + 0.04, bh + 0.04, 0.03, 0.01), '#6d4c41', 0, by, bz);
    sheet(g, corkTex(), bw - 0.02, bh - 0.02, 0, by, bz + 0.017);
    // Cards stuck on proud of it, their pins.
    for (const [x, y, col, rz] of [[bw / 2 - 0.13, by + 0.16, '#fff59d', 0.08], [-bw / 2 + 0.12, by - 0.2, '#b3e5fc', -0.1], [0.05, by - 0.22, '#f8bbd0', 0.05]] as Array<[number, number, string, number]>) {
      part(g, box(0.12, 0.07, 0.003), col, x, y, bz + 0.024, { rz, outline: false });
      part(g, box(0.08, 0.004, 0.002), '#78909c', x, y - 0.01, bz + 0.026, { rz, outline: false });
      part(g, ball(0.011), '#c62828', x, y + 0.025, bz + 0.03, { outline: false });
    }
    // The notebook open on the arc, the pencil on it.
    const nz = front - 0.17;
    part(g, rbox(0.4, 0.012, 0.27, 0.004), '#3e2723', 0, ty + 0.006, nz);
    flat(g, arcTex(), 0.38, 0.25, 0, ty + 0.013, nz);
    pen(g, 0.1, ty + 0.014, nz + 0.05, 0.5, '#f9a825', 0.16);
    const note = marker(g, 0, ty + 0.015, nz);
    // Packs of cards and a pot of pencils on the left.
    for (const [k, col] of ['#fff59d', '#f8bbd0', '#b3e5fc'].entries()) part(g, box(0.12, 0.025, 0.08), col, -w / 2 + 0.11, ty + 0.013 + k * 0.026, z - 0.12, { ry: (k - 1) * 0.12 });
    penPot(g, -w / 2 + 0.09, ty, nz + 0.02, '#455a64');
    // The laptop on the right, the outline up on it.
    const lp = new THREE.Group();
    lp.position.set(w / 2 - 0.19, ty, z - 0.1);
    lp.rotation.y = -0.35;
    g.add(lp);
    part(lp, rbox(0.3, 0.014, 0.21, 0.006), '#b0bec5', 0, 0.007, 0);
    part(lp, box(0.26, 0.002, 0.11), '#78909c', 0, 0.015, -0.02, { outline: false });
    const lid = new THREE.Group();
    lid.position.set(0, 0.014, -0.105);
    lid.rotation.x = -0.25;
    lp.add(lid);
    part(lid, rbox(0.3, 0.2, 0.01, 0.006), '#b0bec5', 0, 0.1, 0);
    out.screen = screenOf(lid, outlineTex(), 0.27, 0.17, 0, 0.1, 0.006);
    const keys = marker(lp, 0, 0.02, 0.03);
    mug(g, w / 2 - 0.08, ty, front - 0.07, '#fff8e1', '#5d4037');
    // The chair.
    const cz = front + 0.26;
    out.seat = chairAt(g, 0, cz, '#4e342e');
    out.work = note;
    const spots: Record<string, Spot> = { '*': satAt(g, 0, cz, 'write', note) };
    for (const i of def.interactions) {
      if (LAPTOP.test(i.id)) spots[i.id] = satAt(g, 0, cz, 'type', keys);
      else if (TALKS.test(i.id)) spots[i.id] = satAt(g, 0, cz, 'meeting', note);
    }
    out.spots = spots;
  },

  /**
   * The deadline board (원고 마감 보드): a magnetic board in an aluminium frame — on the wall where
   * there's one, else on a mobile stand — headed 10월 원고 마감 현황 in the house's green, a row for
   * each title (the serial's twelfth episode, a novel, the magazine's special, an essay collection, a
   * book of poems) across 원고 · 1교 · 2교 · 3교 · 인쇄, the stages done ticked off and a coloured
   * magnet on the stage each has got to, the due dates (the late one in red), the print date ringed
   * D-3 and what's not to forget; markers and the eraser on its tray. Checked stood a step back with
   * a notebook, jotting down and pointing out where each book has got to.
   */
  wrtDeadlineBoard(g, W, D, _c, _def, ctx, out) {
    const bw = Math.min(W - 0.12, 1.84);
    const bh = (bw * DL.ch) / DL.cw;
    const wall = ctx.againstWall;
    const bz = wall ? -D / 2 + 0.03 : -0.05;
    const by = wall ? 1.45 : 1.3;
    if (!wall) {
      for (const sx of [-1, 1]) {
        const x = sx * (bw / 2 + 0.04);
        part(g, rbox(0.04, by + bh / 2 - 0.02, 0.04, 0.01), ALU, x, (by + bh / 2 + 0.02) / 2 + 0.03, bz);
        part(g, rbox(0.06, 0.04, 0.62, 0.012), ALU, x, 0.07, bz);
        for (const sz of [-1, 1]) part(g, ball(0.03), BLACK, x, 0.03, bz + sz * 0.28, { outline: false });
      }
      part(g, rbox(bw + 0.04, 0.035, 0.03, 0.01), ALU, 0, 0.35, bz);
    }
    part(g, rbox(bw + 0.05, bh + 0.05, 0.03, 0.012), ALU, 0, by, bz);
    sheet(g, deadlineTex(), bw - 0.02, bh - 0.02, 0, by, bz + 0.017);
    // A magnet on the stage each title has got to.
    const px = (u: number) => (u / DL.cw - 0.5) * (bw - 0.02);
    const py = (v: number) => by + (0.5 - v / DL.ch) * (bh - 0.02);
    DL_ROWS.forEach((r, i) => {
      const u = DL.x0 + DL.nameW + r.at * DL.cell + DL.cell / 2;
      const v = DL.y0 + i * DL.row + 14;
      part(g, cyl(0.03, 0.03, 0.018, 16), MAGNET[i % MAGNET.length], px(u), py(v), bz + 0.027, { rx: Math.PI / 2 });
    });
    // Sticky notes by the reminders, and a spare magnet holding a printout at the corner.
    for (const [u, v, col, rz] of [[470, 220, '#fff176', 0.06], [420, 236, '#f8bbd0', -0.08]] as Array<[number, number, string, number]>) part(g, box(0.09, 0.09, 0.004), col, px(u), py(v), bz + 0.02, { rz, outline: false });
    // The tray with markers and the eraser.
    const trayY = by - bh / 2 - 0.035;
    part(g, rbox(bw * 0.6, 0.025, 0.075, 0.01), ALU, -bw * 0.12, trayY, bz + 0.045);
    for (const [i, col] of ['#212121', '#c62828', '#1a3c9e', '#2e7d32'].entries()) {
      part(g, cyl(0.011, 0.011, 0.13, 8), col, -bw * 0.32 + i * 0.05, trayY + 0.024, bz + 0.05, { rz: Math.PI / 2 });
    }
    part(g, rbox(0.14, 0.04, 0.055, 0.012), '#37474f', bw * 0.05, trayY + 0.03, bz + 0.05);
    // Where a hand points: the stages of the middle rows.
    const point = marker(g, px(DL.x0 + DL.nameW + 2 * DL.cell), py(DL.y0 + 2 * DL.row), bz + 0.02);
    out.work = point;
    out.body.expandByPoint(new THREE.Vector3(0, 0, bz + 0.3));
    out.spots = { '*': stoodAt(g, -bw * 0.08, bz + 0.72, 'meeting', point) };
  },

  /**
   * A proof trolley (교정지 수레): a two-tier steel book trolley on casters with a push handle at one
   * end — on top, bundles of galleys banded and tagged for their next read (1교, 2교, 3교) with a
   * clipboard of the checklist; below, manila manuscript envelopes stamped 원고 재중 and a carton of
   * author's copies.
   */
  wrtProofCart(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.76;
    const d = 0.46;
    const steel = '#90a4ae';
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      part(g, cyl(0.014, 0.014, 0.82, 8), steel, sx * (w / 2 - 0.02), 0.47, sz * (d / 2 - 0.02), { outline: false });
      part(g, cyl(0.03, 0.03, 0.022, 12), BLACK, sx * (w / 2 - 0.02), 0.035, sz * (d / 2 - 0.02), { rz: Math.PI / 2 });
      part(g, box(0.03, 0.04, 0.03), steel, sx * (w / 2 - 0.02), 0.06, sz * (d / 2 - 0.02), { outline: false });
    }
    for (const y of [0.22, 0.62]) {
      part(g, rbox(w, 0.025, d, 0.006), '#b0bec5', 0, y, 0);
      part(g, rbox(w, 0.04, 0.012, 0.004), steel, 0, y + 0.03, d / 2 - 0.01, { outline: false });
      part(g, rbox(w, 0.04, 0.012, 0.004), steel, 0, y + 0.03, -d / 2 + 0.01, { outline: false });
    }
    // The push handle at the right end.
    rod(g, new THREE.Vector3(w / 2 - 0.02, 0.88, -d / 2 + 0.04), new THREE.Vector3(w / 2 - 0.02, 0.88, d / 2 - 0.04), 0.016, BLACK);
    // The bundles on top, banded and tagged.
    const ty = 0.6325;
    ['1교', '2교', '3교'].forEach((t, k) => {
      const x = -w / 2 + 0.14 + k * 0.24;
      const hgt = [0.12, 0.08, 0.1][k];
      paperStack(g, x, ty, 0, hgt, (k - 1) * 0.05, proofTex(10 + k));
      part(g, box(0.215, 0.012, 0.296), '#d7b98e', x, ty + hgt * 0.5, 0, { ry: (k - 1) * 0.05, outline: false });
      part(g, box(0.013, hgt + 0.004, 0.296), '#d7b98e', x, ty + hgt / 2, 0, { ry: (k - 1) * 0.05, outline: false });
      label(g, t, 0.07, 0.035, x + 0.02, ty + hgt * 0.5, 0.155, ['#ffb74d', '#81c784', '#64b5f6'][k], '#263238', (k - 1) * 0.05);
    });
    // The clipboard leant on the last bundle.
    part(g, rbox(0.17, 0.24, 0.01, 0.006), '#8d6e63', w / 2 - 0.12, ty + 0.2, -d / 2 + 0.05, { rx: -0.25 });
    part(g, box(0.15, 0.2, 0.002), PAPER, w / 2 - 0.12, ty + 0.19, -d / 2 + 0.057, { rx: -0.25, outline: false });
    part(g, rbox(0.06, 0.02, 0.02, 0.005), CHROME, w / 2 - 0.12, ty + 0.31, -d / 2 + 0.035, { rx: -0.25, outline: false });
    // Below: the envelopes and the carton.
    const by = 0.2325;
    for (let k = 0; k < 3; k++) part(g, box(0.25, 0.015, 0.34), '#d4b483', -0.18, by + 0.008 + k * 0.016, 0, { ry: (k - 1) * 0.07 });
    label(g, '원고 재중', 0.14, 0.04, -0.18, by + 0.049, 0.05, 'none', '#b71c1c', 0, -Math.PI / 2);
    part(g, rbox(0.32, 0.22, 0.34, 0.006), '#c19a6b', 0.18, by + 0.11, 0);
    part(g, box(0.322, 0.03, 0.06), '#d7c19a', 0.18, by + 0.21, 0, { outline: false });
    label(g, `${HOUSE} · 저자 증정본`, 0.24, 0.035, 0.18, by + 0.12, 0.172, 'none', '#4e342e');
    out.work = marker(g, 0, ty + 0.1, 0.1);
  },

  /**
   * The layout desk (조판 데스크): a white desk with a big wide screen showing the next book in the
   * layout app — the spread on the pasteboard, the chapter's opening page with its magenta guides,
   * the text frame picked (lit in use) — a pen tablet with its stylus, the keyboard, the printed
   * spread laid beside it to check against, the cover's colour proof with its crop marks pinned on a
   * little easel, a Pantone fan and a steel ruler. Sat at it going over the setting.
   */
  wrtLayoutDesk(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.06, 0.94);
    const h = 0.74;
    const d = Math.min(D - 0.36, 0.62);
    const z = -D / 2 + d / 2 + 0.03;
    const front = z + d / 2;
    const white = '#f2f2ef';
    part(g, rbox(w, 0.03, d, 0.01), white, 0, h, z);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.04, h - 0.01, d - 0.04, 0.01), '#d6d6d2', sx * (w / 2 - 0.03), (h - 0.01) / 2, z);
    }
    part(g, rbox(w - 0.1, 0.3, 0.015, 0.006), '#d6d6d2', 0, h - 0.2, z - d / 2 + 0.05);
    const ty = h + 0.015;
    // The big screen with the spread.
    const mon = monitor(g, -0.02, ty, z - d / 2 + 0.14, 0.66, 0.37, '#c9ccd0');
    out.screen = screenOf(mon, layoutTex(), 0.63, 0.35, 0, 0.285, 0.014);
    // The tablet and stylus, the keyboard to the left of it.
    const tz = z + 0.13;
    part(g, rbox(0.28, 0.012, 0.19, 0.01), BLACK, 0.18, ty + 0.006, tz);
    part(g, box(0.2, 0.002, 0.13), '#3a3d42', 0.2, ty + 0.013, tz, { outline: false });
    part(g, cyl(0.006, 0.004, 0.15, 8), '#424242', 0.24, ty + 0.02, tz + 0.03, { rz: Math.PI / 2, ry: 0.7, outline: false });
    keyboard(g, -0.24, ty, tz, 0.24, '#f5f5f5');
    const pad = marker(g, -0.04, ty + 0.03, tz);
    // The printed spread to the left, the ruler; the colour proof on its easel and the fan, right.
    page(g, proofTex(20), -w / 2 + 0.13, ty, z - 0.08, 0.12);
    part(g, box(0.03, 0.003, 0.22), '#b0bec5', -w / 2 + 0.26, ty + 0.002, z - 0.1, { ry: 0.12 });
    const ex = w / 2 - 0.09;
    const ez = z - d / 2 + 0.1;
    part(g, rbox(0.13, 0.17, 0.008, 0.004), '#455a64', ex, ty + 0.1, ez, { rx: -0.2 });
    sheet(g, coverProofTex(), 0.11, 0.146, ex, ty + 0.1, ez + 0.01, 0, -0.2);
    rod(g, new THREE.Vector3(ex, ty + 0.02, ez - 0.06), new THREE.Vector3(ex, ty + 0.16, ez - 0.01), 0.005, '#455a64');
    for (let k = 0; k < 5; k++) part(g, box(0.035, 0.002, 0.16), ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5'][k], w / 2 - 0.1, ty + 0.002 + k * 0.002, z - 0.12, { ry: 0.5 + k * 0.18, outline: false });
    // The chair.
    const cz = front + 0.26;
    out.seat = chairAt(g, 0, cz, '#263238');
    out.work = pad;
    out.spots = { '*': satAt(g, 0, cz, 'type', pad) };
  },

  /**
   * The lobby's new release table (신간 진열대): a low oak 평대 with a riser along the back, the
   * month's new books piled cover-up on it a title a pile, the lead titles stood up on acrylic
   * stands on the riser, a 베스트셀러 1위 band round the top copy of the first, the 이달의 신간
   * card standing in the middle — and, where there's a wall behind it, this week's bestseller list
   * up over it. Stood at its front straightening the piles and setting copies out.
   */
  wrtNewReleaseTable(g, W, D, _c, _def, ctx, out) {
    const w = Math.min(W - 0.16, 1.8);
    const h = 0.68;
    const d = Math.min(D - 0.2, 0.78);
    const z = -D / 2 + d / 2 + 0.04;
    const front = z + d / 2;
    const wood = '#a87a50';
    part(g, rbox(w, 0.05, d, 0.015), wood, 0, h, z);
    part(g, rbox(w - 0.04, h - 0.1, d - 0.04, 0.015), shade(wood, 0.82), 0, (h - 0.1) / 2 + 0.05, z);
    part(g, rbox(w - 0.02, 0.05, d - 0.02, 0.01), '#4e342e', 0, 0.025, z, { outline: false });
    // The riser at the back.
    const rd = 0.24;
    const rz = z - d / 2 + rd / 2 + 0.02;
    const rh = 0.16;
    part(g, rbox(w - 0.06, rh, rd, 0.012), wood, 0, h + 0.025 + rh / 2, rz);
    const ty = h + 0.025;
    // The piles: a title a pile, its cover on top.
    const piles = 5;
    const pw = (w - 0.12) / piles;
    for (let k = 0; k < piles; k++) {
      const x = -w / 2 + 0.06 + pw * (k + 0.5);
      const n = 3 + ((k * 5) % 4);
      const ry = ((k * 7) % 5 - 2) * 0.025;
      const b = BOOKS[(k + 1) % BOOKS.length];
      for (let j = 0; j < n; j++) {
        // A copy: the pages, the boards over and under them, the spine down its left.
        const y = ty + 0.011 + j * 0.023;
        const xj = x + (j % 2) * 0.004;
        part(g, box(0.144, 0.016, 0.204), PAPER, xj + 0.002, y, front - 0.2, { ry, outline: j === n - 1 });
        part(g, box(0.15, 0.003, 0.21), b.bg, xj, y + 0.0095, front - 0.2, { ry, outline: false });
        part(g, box(0.15, 0.003, 0.21), b.bg, xj, y - 0.0095, front - 0.2, { ry, outline: false });
      }
      flat(g, coverTex(k + 1), 0.15, 0.21, x, ty + 0.023 * n + 0.001, front - 0.2, ry);
      if (k === 0) {
        part(g, box(0.153, 0.024, 0.06), '#ffd54f', x, ty + 0.023 * n - 0.01, front - 0.2 + 0.07, { ry, outline: false });
        label(g, '베스트셀러 1위', 0.12, 0.022, x, ty + 0.023 * n + 0.004, front - 0.2 + 0.07, 'none', '#b71c1c', 0, -Math.PI / 2);
      }
    }
    // The lead titles stood up on the riser, the card in the middle.
    const ry0 = ty + rh;
    for (const [k, x] of [[0, -w / 2 + 0.2], [4, -w / 2 + 0.46], [2, w / 2 - 0.46], [5, w / 2 - 0.2]] as Array<[number, number]>) {
      part(g, box(0.16, 0.01, 0.1), '#e3f2fd', x, ry0 + 0.005, rz + 0.03, { material: ACRYLIC, outline: false });
      part(g, box(0.16, 0.12, 0.006), '#e3f2fd', x, ry0 + 0.07, rz - 0.03, { rx: -0.2, material: ACRYLIC, outline: false });
      part(g, box(0.15, 0.21, 0.022), BOOKS[k].bg, x, ry0 + 0.115, rz + 0.0, { rx: -0.2 });
      sheet(g, coverTex(k), 0.148, 0.208, x, ry0 + 0.117, rz + 0.012, 0, -0.2);
    }
    part(g, rbox(0.3, 0.2, 0.012, 0.006), '#ffffff', 0, ry0 + 0.12, rz);
    label(g, '이달의 신간', 0.28, 0.07, 0, ry0 + 0.16, rz + 0.008, '#7d1f2b', '#ffffff');
    label(g, '10월에 나온 책', 0.24, 0.045, 0, ry0 + 0.08, rz + 0.008, 'none', '#4e342e');
    part(g, box(0.1, 0.012, 0.08), '#ffffff', 0, ry0 + 0.006, rz + 0.03, { outline: false });
    if (ctx.againstWall) {
      // This week's bestsellers on the wall over it.
      const py = 1.55;
      part(g, rbox(0.86, 0.56, 0.025, 0.008), '#4e342e', 0, py, -D / 2 + 0.02);
      sheet(g, rankTex(), 0.82, 0.52, 0, py, -D / 2 + 0.035);
    }
    const piles0 = marker(g, -pw * 0.5, ty + 0.1, front - 0.16);
    out.work = piles0;
    out.spots = { '*': stoodAt(g, -pw * 0.5, front + 0.36, 'tinker', piles0) };
  },
};
