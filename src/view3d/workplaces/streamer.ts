import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { streamBeat, toolPhase, type Motion, type StreamShow } from '../activity';
import { ball, box, canvasTexture, cyl, gradient, part, rbox } from '../toon';

/**
 * The streaming house drawn as itself (2026-10-27 workplace pipeline, at the user's request):
 * 꿀잼하우스 (KKULJAM HOUSE), a Korean streamers' house with a bee for a mascot (꿀벌이). The streaming
 * room's desks — the game on the main monitor in the stream's own layout (the facecam, the viewer
 * count), the chat scrolling on a portrait monitor beside it, a webcam in a ring light, a podcast mic
 * on a boom arm, a stream deck, hex lights on the panel behind and an ON AIR sign lit while live; the
 * edit desk with its ultrawide timeline and jog wheel; the green screen with its tracking marks, the
 * camera, the skit's plan; and what it was missing: the live dashboard on the wall, the channel's neon,
 * the ASMR booth with its dummy-head mic, the merch shelf, the collab camera facing the lounge sofa,
 * the skit costume rack. Streaming looks like streaming (activity.ts streamBeat): played with WASD and
 * the mouse, talked to the camera, reacted to, the chair turned to the chat to read and type in it; a
 * big donation pops up on screen and is thanked with a bow, a heart and both fists up.
 */

const BLACK = '#25262b';
const CHROME = '#dfe4e8';
const HONEY = '#ffc928';
const PINK = '#ff4fa3';
const CYAN = '#3de0ff';
const VIOLET = '#7e57c2';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
/** How far the chair turns to the chat monitor, radians. */
const TURN = 0.42;

/** Lit parts (LEDs, lamps, neon): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
const GLASS = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.3, depthWrite: false });
const WING = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
const ACRYLIC = new THREE.MeshToonMaterial({ color: '#f3fbff', transparent: true, opacity: 0.35, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 28, arc));
const cone = (r: number, h: number, seg = 12) => shape(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
/** A flat hexagon `r` across the corners, `t` thick, lying in xy (facing +z). */
const hex = (r: number, t: number) => shape(`hex${r},${t}`, () => new THREE.CylinderGeometry(r, r, t, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6));

/** Pictures painted once a key (screens, the boards, labels). */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void, ry = 1): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint, 1, ry)));
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
/** A group placed and turned in `g`. */
function frame(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Group {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.set(rx, ry, 0, 'YXZ');
  g.add(f);
  return f;
}
/** A group in `g` shown only while the piece is used. */
function inUse(g: THREE.Object3D, out: { inUse?: THREE.Object3D }): THREE.Group {
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  return use;
}

/** A spot sat at (x, z) facing `yaw` (π: back to the object's front, at its desk), and what's done there. */
function satAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, seat = 0.48, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', x, seat, z, yaw, seat);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot stood at (x, z) facing `yaw` (π: at the object, from its front), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work?: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** Of a piece's spots (all at one place, one an interaction), the one last stood or sat at. */
function lastPosed(list: Spot[]): Spot {
  let best = list[0];
  let when = -Infinity;
  for (const s of list) {
    const p = s.at.userData.posedAt as number | undefined;
    if (p !== undefined && p > when) [when, best] = [p, s];
  }
  return best;
}

// ---- Small things ----

/**
 * A gaming chair facing +z in its own group, its seat `h` up: a five-star base on casters, a bucket
 * seat with bolsters, a tall winged back with the accent stripes, a headrest and a lumbar cushion.
 */
function gamingChair(c: THREE.Object3D, h: number, accent: string, body = BLACK) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.27, 0.045, Math.cos(a) * 0.27), 0.017, BLACK);
    part(c, ball(0.026), BLACK, Math.sin(a) * 0.27, 0.026, Math.cos(a) * 0.27, { outline: false });
  }
  part(c, cyl(0.026, 0.026, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.48, 0.09, 0.46, 0.04), body, 0, h + 0.02, 0);
  for (const sx of [-1, 1]) part(c, rbox(0.06, 0.06, 0.44, 0.025), accent, sx * 0.22, h + 0.07, 0, { outline: false });
  const back = frame(c, 0, h + 0.05, -0.22, 0, -0.12);
  part(back, rbox(0.5, 0.82, 0.09, 0.05), body, 0, 0.41, 0);
  for (const sx of [-1, 1]) {
    part(back, rbox(0.07, 0.6, 0.12, 0.03), body, sx * 0.23, 0.32, 0.03);
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
  part(c, box(0.38, 0.46, 0.01), shade(color, 1.25), 0, h + 0.36, -0.2, { rx: -0.1, outline: false });
  for (const sx of [-1, 1]) part(c, rbox(0.05, 0.03, 0.22, 0.012), BLACK, sx * 0.25, h + 0.2, -0.01);
}

/** A mechanical keyboard (pastel keycaps) at (x, z) on a top at `y`; its RGB underglow goes in `use`. */
function keyboard(g: THREE.Object3D, use: THREE.Object3D, x: number, y: number, z: number, caps = '#f3e9ff', accent = PINK) {
  part(g, rbox(0.36, 0.028, 0.13, 0.008), '#1d1e22', x, y + 0.014, z);
  for (let r = 0; r < 4; r++) part(g, box(0.33, 0.012, 0.022), r === 0 ? '#3a3c44' : caps, x, y + 0.032, z - 0.045 + r * 0.03, { outline: false });
  part(g, box(0.04, 0.013, 0.022), accent, x + 0.14, y + 0.033, z + 0.045, { outline: false });
  // WASD picked out in the accent.
  for (const [dx, dz] of [[-0.11, -0.015], [-0.125, 0.015], [-0.11, 0.015], [-0.095, 0.015]]) part(g, box(0.016, 0.014, 0.016), accent, x + dx, y + 0.034, z + dz, { outline: false });
  part(use, box(0.37, 0.004, 0.14), CYAN, x, y + 0.002, z, { outline: false, material: glow('#80f0ff') });
}

/** A gaming mouse on its pad at (x, z), top at `y`. */
function mouse(g: THREE.Object3D, use: THREE.Object3D, x: number, y: number, z: number) {
  part(g, rbox(0.06, 0.03, 0.1, 0.02), '#1d1e22', x, y + 0.015, z);
  part(g, box(0.004, 0.004, 0.03), '#3a3c44', x, y + 0.031, z - 0.03, { outline: false });
  part(use, box(0.03, 0.004, 0.012), PINK, x, y + 0.026, z + 0.045, { outline: false, material: glow('#ff80c0') });
}

/** 꿀벌이, the house's bee, `s` long, sat at (x, y, z) facing `ry` (a plush, a figure, a sticker). */
function bee(g: THREE.Object3D, x: number, y: number, z: number, s: number, ry = 0) {
  const b = frame(g, x, y, z, ry);
  b.scale.setScalar(s / 0.16);
  part(b, ball(0.05), HONEY, 0, 0.05, -0.01).scale.set(1, 0.92, 1.25);
  for (const dz of [-0.03, 0.0]) part(b, ring(0.05, 0.009), '#2b2118', 0, 0.05, dz - 0.005, { outline: false }).scale.set(1, 0.92, 1);
  part(b, cone(0.012, 0.03, 8), '#2b2118', 0, 0.05, -0.078, { rx: -Math.PI / 2, outline: false });
  part(b, ball(0.042), HONEY, 0, 0.085, 0.05);
  for (const sx of [-1, 1]) {
    part(b, ball(0.008), '#1b1b1b', sx * 0.016, 0.092, 0.087, { outline: false });
    part(b, ball(0.007), '#ff8a80', sx * 0.027, 0.078, 0.082, { outline: false });
    rod(b, new THREE.Vector3(sx * 0.012, 0.12, 0.05), new THREE.Vector3(sx * 0.03, 0.16, 0.06), 0.003, '#2b2118');
    part(b, ball(0.008), '#2b2118', sx * 0.03, 0.162, 0.06, { outline: false });
    const w = new THREE.Mesh(ball(0.035), WING);
    w.position.set(sx * 0.04, 0.105, -0.01);
    w.scale.set(0.9, 0.3, 0.6);
    w.rotation.z = sx * -0.5;
    b.add(w);
  }
  part(b, box(0.016, 0.003, 0.004), '#1b1b1b', 0, 0.072, 0.09, { outline: false });
}

/** An energy drink can, stood at (x, y, z). */
function can(g: THREE.Object3D, x: number, y: number, z: number, col = '#ff6d00') {
  part(g, cyl(0.03, 0.03, 0.12, 12), col, x, y + 0.06, z);
  part(g, cyl(0.0305, 0.0305, 0.04, 12), '#212121', x, y + 0.06, z, { outline: false });
  part(g, cyl(0.026, 0.03, 0.008, 12), CHROME, x, y + 0.124, z, { outline: false });
}

/** An over-ear headset lying on its side (the band arched up), at (x, y, z). */
function headset(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, color = BLACK, pads = PINK) {
  const h = frame(g, x, y, z, ry);
  part(h, ring(0.075, 0.009, Math.PI), color, 0, 0.0, 0, { outline: false });
  for (const sx of [-1, 1]) {
    part(h, cyl(0.04, 0.04, 0.035, 14), color, sx * 0.075, -0.015, 0, { rz: Math.PI / 2 });
    part(h, cyl(0.032, 0.032, 0.006, 14), pads, sx * 0.095, -0.015, 0, { rz: Math.PI / 2, outline: false });
  }
}

/** A light stand (three legs, a pole) up to `h` at (x, z). */
function lightStand(g: THREE.Object3D, x: number, z: number, h: number, spread = 0.22) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, new THREE.Vector3(x, 0.32, z), new THREE.Vector3(x + Math.sin(a) * spread, 0.01, z + Math.cos(a) * spread), 0.01, BLACK);
  }
  part(g, cyl(0.014, 0.014, h - 0.3, 8), BLACK, x, 0.3 + (h - 0.3) / 2, z, { outline: false });
  part(g, cyl(0.02, 0.02, 0.06, 8), '#3a3c44', x, 0.33, z, { outline: false });
}

/** A mirrorless camera facing +z in its own group (its middle at the origin); its red tally in `use`. */
function camera(g: THREE.Object3D, use?: THREE.Object3D) {
  part(g, rbox(0.13, 0.085, 0.06, 0.012), '#202125', 0, 0, 0);
  part(g, rbox(0.035, 0.09, 0.07, 0.012), '#2b2c31', -0.05, -0.002, 0.008);
  part(g, cyl(0.034, 0.037, 0.07, 18), '#2b2c31', 0.01, -0.005, 0.06, { rx: Math.PI / 2 });
  part(g, cyl(0.026, 0.026, 0.004, 18), '#4f6d7a', 0.01, -0.005, 0.096, { rx: Math.PI / 2, outline: false });
  part(g, box(0.03, 0.006, 0.02), '#4a4c55', 0.03, 0.046, 0.0, { outline: false });
  part(g, box(0.06, 0.04, 0.004), '#111', 0.0, 0.0, -0.032, { outline: false });
  if (use) part(use, ball(0.008), '#ff1744', 0.05, 0.03, 0.031, { outline: false, material: glow('#ff1744') });
}

// ---- Pictures ----

type ChatLine = [string, string, string];
const CHAT: ChatLine[] = [
  ['꿀벌러버', '#ffd54f', 'ㅋㅋㅋㅋㅋㅋ 미쳤다'],
  ['도토리묵', '#80deea', '방장 에임 무엇?'],
  ['새벽세시', '#ce93d8', 'ㄹㅇ 레전드 각'],
  ['감자칩', '#a5d6a7', '하이하이 👋'],
  ['고양이집사', '#ffab91', '오늘 몇 시까지 함?'],
  ['민트초코', '#90caf9', '와 방금 그거 봄?'],
  ['라면한그릇', '#fff59d', 'ㅊㅊㅊㅊㅊ'],
  ['별빛', '#f48fb1', '구독 눌렀어요!'],
  ['초보유저', '#b0bec5', '이거 무슨 게임임?'],
  ['꿀벌러버', '#ffd54f', '💛 1,000원 후원'],
  ['야근중', '#bcaaa4', '회사에서 몰래 봄ㅋㅋ'],
  ['딸기우유', '#f8bbd0', '목소리 좋다'],
  ['도토리묵', '#80deea', '아니 왜 거기서ㅋㅋ'],
  ['치킨러버', '#ffcc80', '먹방 언제 해요?'],
  ['새벽세시', '#ce93d8', 'GG'],
  ['감자칩', '#a5d6a7', '클립 각이다 ✂'],
];
/** Lines down the chat texture (it wraps round, so it scrolls for ever). */
const CHAT_LINES = 32;
/** The chat column: nicknames in their colours and what they said, 32 lines tall, a window of 40% shown. */
const chatTex = () =>
  painted(
    'stChat',
    128,
    512,
    (x) => {
      x.fillStyle = '#18141f';
      x.fillRect(0, 0, 128, 512);
      for (let i = 0; i < CHAT_LINES; i++) {
        const [nick, col, msg] = CHAT[(i * 5) % CHAT.length];
        const y = i * 16 + 11;
        if (msg.includes('후원')) {
          x.fillStyle = '#3d2f00';
          x.fillRect(0, i * 16 + 1, 128, 15);
        }
        x.font = `bold 8px ${FONT}`;
        x.fillStyle = col;
        x.fillText(nick, 3, y);
        const w = x.measureText(nick).width;
        x.font = `8px ${FONT}`;
        x.fillStyle = '#eeeeee';
        x.fillText(msg, 6 + w, y, 128 - 8 - w);
      }
    },
    0.4,
  );
/** How far the chat has scrolled at `t` (a new line pops in a little over once a second), in texture heights. */
const chatScroll = (t: number) => {
  const s = t * 1.3;
  const n = Math.floor(s);
  return (n + THREE.MathUtils.smoothstep(s - n, 0.7, 1)) / CHAT_LINES;
};

/** The chat panel's header over the column. */
const chatHeadTex = () =>
  painted('stChatHead', 128, 24, (x) => {
    x.fillStyle = '#2a2236';
    x.fillRect(0, 0, 128, 24);
    x.fillStyle = '#e53935';
    x.fillRect(4, 6, 26, 12);
    x.font = `bold 8px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('LIVE', 7, 15);
    x.fillStyle = '#e0e0e0';
    x.fillText('채팅  👁 1,284', 36, 15);
  });

/** The stream as the viewers see it: a battle royale from behind the gun, the HUD, the facecam, the count. */
const gameTex = () =>
  painted('stGame', 256, 144, (x) => {
    const sky = x.createLinearGradient(0, 0, 0, 80);
    sky.addColorStop(0, '#5aa9e6');
    sky.addColorStop(1, '#cfe8f7');
    x.fillStyle = sky;
    x.fillRect(0, 0, 256, 144);
    // Hills, a field, a ruined house, trees.
    x.fillStyle = '#7fae6a';
    x.beginPath();
    x.moveTo(0, 70);
    x.quadraticCurveTo(60, 50, 120, 68);
    x.quadraticCurveTo(190, 52, 256, 66);
    x.lineTo(256, 144);
    x.lineTo(0, 144);
    x.fill();
    x.fillStyle = '#9cc47a';
    x.fillRect(0, 86, 256, 58);
    x.fillStyle = '#b08968';
    x.fillRect(150, 52, 40, 30);
    x.fillStyle = '#7f5539';
    x.beginPath();
    x.moveTo(146, 52);
    x.lineTo(170, 38);
    x.lineTo(194, 52);
    x.fill();
    x.fillStyle = '#3b2f2f';
    x.fillRect(165, 64, 10, 18);
    for (const tx of [30, 48, 220]) {
      x.fillStyle = '#5d4037';
      x.fillRect(tx, 58, 3, 14);
      x.fillStyle = '#386641';
      x.beginPath();
      x.arc(tx + 1.5, 54, 9, 0, Math.PI * 2);
      x.fill();
    }
    // An enemy by the house, the crosshair on him.
    x.fillStyle = '#c62828';
    x.fillRect(140, 70, 5, 10);
    x.beginPath();
    x.arc(142.5, 67, 3, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#ffffff';
    x.lineWidth = 1.2;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      x.beginPath();
      x.moveTo(128 + dx * 3, 72 + dy * 3);
      x.lineTo(128 + dx * 8, 72 + dy * 8);
      x.stroke();
    }
    // The gun, bottom right.
    x.fillStyle = '#37474f';
    x.beginPath();
    x.moveTo(170, 144);
    x.lineTo(196, 104);
    x.lineTo(214, 106);
    x.lineTo(206, 144);
    x.fill();
    x.fillStyle = '#263238';
    x.fillRect(193, 96, 22, 10);
    x.fillStyle = '#212121';
    x.fillRect(200, 92, 6, 5);
    // HUD: health, ammo, the minimap, the survivors, the kill feed.
    x.fillStyle = 'rgba(0,0,0,0.45)';
    x.fillRect(88, 128, 80, 9);
    x.fillStyle = '#e8f5e9';
    x.fillRect(90, 130, 58, 5);
    x.fillStyle = 'rgba(0,0,0,0.45)';
    x.fillRect(212, 4, 40, 40);
    x.fillStyle = '#a5d6a7';
    x.fillRect(214, 6, 36, 36);
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(232, 24, 14, 0, Math.PI * 2);
    x.strokeStyle = '#1e88e5';
    x.stroke();
    x.fillStyle = '#ffeb3b';
    x.fillRect(229, 22, 4, 4);
    x.font = `bold 8px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('생존 12', 214, 54);
    x.font = `7px ${FONT}`;
    x.fillText('꿀잼탁준 ▶ 상대팀_03', 168, 64);
    x.fillText('30 / 120', 222, 138);
    // The facecam, bottom left, and the live chip with the count.
    x.fillStyle = '#ffc928';
    x.fillRect(4, 92, 58, 46);
    x.fillStyle = '#4a3a6b';
    x.fillRect(6, 94, 54, 42);
    x.fillStyle = '#f8d9c0';
    x.beginPath();
    x.arc(33, 116, 10, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#1a1a1a';
    x.beginPath();
    x.arc(33, 112, 11, Math.PI, Math.PI * 2);
    x.fill();
    x.fillStyle = '#25262b';
    x.fillRect(21, 110, 3, 9);
    x.fillRect(42, 110, 3, 9);
    x.fillRect(20, 105, 26, 3);
    x.fillStyle = '#ff4fa3';
    x.fillRect(19, 128, 28, 8);
    x.fillStyle = '#e53935';
    x.fillRect(4, 4, 24, 11);
    x.fillStyle = '#ffffff';
    x.font = `bold 8px ${FONT}`;
    x.fillText('LIVE', 7, 12.5);
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(30, 4, 40, 11);
    x.fillStyle = '#ffffff';
    x.fillText('👁 1,284', 33, 12.5);
  });

/** The donation alert that pops over the stream: 꿀벌이, the name, the amount, the message. */
const donationTex = () =>
  painted('stDonation', 256, 112, (x) => {
    x.fillStyle = 'rgba(40,16,70,0.92)';
    x.beginPath();
    x.roundRect(8, 8, 240, 96, 14);
    x.fill();
    x.strokeStyle = '#ffc928';
    x.lineWidth = 3;
    x.stroke();
    // 꿀벌이.
    x.fillStyle = '#ffc928';
    x.beginPath();
    x.ellipse(46, 56, 22, 18, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#2b2118';
    x.fillRect(38, 39, 6, 34);
    x.fillRect(52, 39, 6, 34);
    x.fillStyle = 'rgba(255,255,255,0.8)';
    x.beginPath();
    x.ellipse(36, 34, 10, 6, -0.5, 0, Math.PI * 2);
    x.ellipse(56, 34, 10, 6, 0.5, 0, Math.PI * 2);
    x.fill();
    x.textAlign = 'center';
    x.font = `bold 17px ${FONT}`;
    x.fillStyle = '#ffc928';
    x.fillText('꿀벌러버님 50,000원 후원!', 156, 44, 170);
    x.font = `12px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('오늘 방송 레전드 ㅋㅋㅋ 사랑해요 💛', 156, 70, 170);
    x.font = `bold 10px ${FONT}`;
    x.fillStyle = '#ff80c0';
    x.fillText('💛 감사합니다 💛', 156, 92);
  });

/** An e-sports match being called: the arena from above, the score, the caster's lower third. */
const castTex = () =>
  painted('stCast', 256, 144, (x) => {
    x.fillStyle = '#2e4d2e';
    x.fillRect(0, 0, 256, 144);
    // The arena: three lanes, the river, the two bases.
    x.strokeStyle = '#c8b68a';
    x.lineWidth = 7;
    x.beginPath();
    x.moveTo(30, 130);
    x.lineTo(30, 30);
    x.lineTo(226, 30);
    x.moveTo(30, 130);
    x.lineTo(226, 130);
    x.lineTo(226, 30);
    x.moveTo(30, 130);
    x.lineTo(226, 30);
    x.stroke();
    x.strokeStyle = '#4fa3d9';
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(30, 30);
    x.quadraticCurveTo(128, 90, 226, 130);
    x.stroke();
    x.fillStyle = '#1e88e5';
    x.beginPath();
    x.arc(30, 130, 12, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#e53935';
    x.beginPath();
    x.arc(226, 30, 12, 0, Math.PI * 2);
    x.fill();
    // A team fight in the middle.
    for (const [fx, fy, c] of [[118, 78, '#64b5f6'], [126, 70, '#64b5f6'], [134, 84, '#ef9a9a'], [142, 74, '#ef9a9a'], [130, 62, '#ef9a9a']] as Array<[number, number, string]>) {
      x.fillStyle = c;
      x.beginPath();
      x.arc(fx, fy, 4, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = '#fff59d';
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(130, 75, 18, 0, Math.PI * 2);
    x.stroke();
    // The score bar.
    x.fillStyle = 'rgba(0,0,0,0.75)';
    x.fillRect(48, 0, 160, 18);
    x.fillStyle = '#1e88e5';
    x.fillRect(48, 0, 50, 18);
    x.fillStyle = '#e53935';
    x.fillRect(158, 0, 50, 18);
    x.textAlign = 'center';
    x.font = `bold 8px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('블루 드래곤', 73, 12);
    x.fillText('레드 피닉스', 183, 12);
    x.font = `bold 11px ${FONT}`;
    x.fillText('12 : 9', 128, 13);
    // The caster's lower third.
    x.fillStyle = 'rgba(40,16,70,0.9)';
    x.fillRect(0, 118, 150, 22);
    x.fillStyle = '#ffc928';
    x.fillRect(0, 118, 5, 22);
    x.textAlign = 'left';
    x.font = `bold 9px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('🎙 결승전 해설 LIVE', 10, 132);
  });

/** The editor: the preview up top, the bins, the timeline of a vlog's tracks below (the playhead moves on it). */
const editTex = () =>
  painted('stEdit', 320, 128, (x) => {
    x.fillStyle = '#1f1f24';
    x.fillRect(0, 0, 320, 128);
    // The bins.
    x.fillStyle = '#2a2a31';
    x.fillRect(2, 2, 70, 62);
    for (let i = 0; i < 6; i++) {
      x.fillStyle = ['#5c6bc0', '#26a69a', '#ef5350', '#ffca28', '#ab47bc', '#29b6f6'][i];
      x.fillRect(6 + (i % 3) * 22, 6 + Math.floor(i / 3) * 22, 18, 14);
    }
    x.font = `6px ${FONT}`;
    x.fillStyle = '#9e9e9e';
    x.fillText('클립 · 브이로그 EP.12', 6, 58);
    // The program monitor: the vlog with its subtitle.
    x.fillStyle = '#000';
    x.fillRect(110, 2, 110, 62);
    const g2 = x.createLinearGradient(0, 4, 0, 60);
    g2.addColorStop(0, '#ffcc80');
    g2.addColorStop(1, '#f48fb1');
    x.fillStyle = g2;
    x.fillRect(112, 4, 106, 58);
    x.fillStyle = '#6d4c41';
    x.beginPath();
    x.arc(165, 40, 13, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#f8d9c0';
    x.beginPath();
    x.arc(165, 36, 8, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = 'rgba(0,0,0,0.6)';
    x.fillRect(122, 50, 86, 9);
    x.font = `bold 7px ${FONT}`;
    x.textAlign = 'center';
    x.fillStyle = '#ffffff';
    x.fillText('오늘은 꿀잼 브이로그!', 165, 57);
    x.textAlign = 'left';
    // Effects panel.
    x.fillStyle = '#2a2a31';
    x.fillRect(248, 2, 70, 62);
    x.fillStyle = '#9e9e9e';
    x.fillText('효과 · 자막 · 색보정', 252, 12);
    for (let i = 0; i < 4; i++) {
      x.fillStyle = '#3c3c46';
      x.fillRect(252, 18 + i * 11, 62, 7);
      x.fillStyle = '#7e57c2';
      x.fillRect(252, 18 + i * 11, 20 + i * 9, 7);
    }
    // The timeline: the time ruler, video tracks, subtitles, music with its waveform.
    x.fillStyle = '#26262d';
    x.fillRect(0, 68, 320, 60);
    x.fillStyle = '#3a3a44';
    x.fillRect(0, 68, 320, 6);
    for (let i = 0; i < 32; i++) {
      x.fillStyle = '#6b6b78';
      x.fillRect(10 * i, 68, 1, i % 5 ? 3 : 6);
    }
    const clips: Array<[number, number, number, string]> = [
      [0, 76, 60, '#5c6bc0'], [62, 76, 90, '#26a69a'], [154, 76, 50, '#5c6bc0'], [206, 76, 110, '#26a69a'],
      [20, 88, 40, '#ab47bc'], [120, 88, 60, '#ab47bc'], [240, 88, 50, '#ab47bc'],
      [10, 100, 30, '#ffca28'], [70, 100, 44, '#ffca28'], [160, 100, 36, '#ffca28'], [230, 100, 50, '#ffca28'],
    ];
    for (const [cx, cy, cw, c] of clips) {
      x.fillStyle = c;
      x.fillRect(cx, cy, cw - 1, 10);
    }
    x.fillStyle = '#2e7d32';
    x.fillRect(0, 112, 320, 14);
    x.strokeStyle = '#a5d6a7';
    x.lineWidth = 1;
    x.beginPath();
    for (let i = 0; i < 320; i += 2) {
      const a = 5 * Math.abs(Math.sin(i * 0.21) * Math.cos(i * 0.047));
      x.moveTo(i, 119 - a);
      x.lineTo(i, 119 + a);
    }
    x.stroke();
  });

/** The channel's analytics: views over the week, watch time, the new subscribers. */
const analyticsTex = () =>
  painted('stAnalytics', 320, 128, (x) => {
    x.fillStyle = '#fafafa';
    x.fillRect(0, 0, 320, 128);
    x.fillStyle = '#ffc928';
    x.fillRect(0, 0, 320, 16);
    x.font = `bold 9px ${FONT}`;
    x.fillStyle = '#2b2118';
    x.fillText('채널 분석 · 최근 7일', 8, 12);
    const tiles: Array<[string, string]> = [['조회수', '48.2만'], ['시청 시간', '1.9만 시간'], ['구독자', '+1,204'], ['평균 시청 지속', '7:42']];
    tiles.forEach(([k, v], i) => {
      x.fillStyle = '#ffffff';
      x.fillRect(8 + i * 78, 22, 72, 30);
      x.strokeStyle = '#e0e0e0';
      x.strokeRect(8 + i * 78, 22, 72, 30);
      x.font = `7px ${FONT}`;
      x.fillStyle = '#757575';
      x.fillText(k, 12 + i * 78, 32);
      x.font = `bold 11px ${FONT}`;
      x.fillStyle = i === 2 ? '#2e7d32' : '#212121';
      x.fillText(v, 12 + i * 78, 47);
    });
    // The views line.
    x.strokeStyle = '#7e57c2';
    x.lineWidth = 2;
    x.beginPath();
    const pts = [30, 34, 28, 46, 52, 70, 88];
    pts.forEach((p, i) => (i ? x.lineTo(20 + i * 46, 120 - p) : x.moveTo(20, 120 - p)));
    x.stroke();
    x.fillStyle = 'rgba(126,87,194,0.15)';
    x.lineTo(296, 120);
    x.lineTo(20, 120);
    x.fill();
    x.font = `7px ${FONT}`;
    x.fillStyle = '#9e9e9e';
    ['월', '화', '수', '목', '금', '토', '일'].forEach((d, i) => x.fillText(d, 18 + i * 46, 126));
  });

/** The editors' week: who's cutting what, the upload slots. */
const scheduleTex = () =>
  painted('stSchedule', 320, 128, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 320, 128);
    x.fillStyle = '#5e35b1';
    x.fillRect(0, 0, 320, 16);
    x.font = `bold 9px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('편집 팀 일정 · 이번 주', 8, 12);
    const days = ['월', '화', '수', '목', '금'];
    days.forEach((d, i) => {
      x.fillStyle = '#ede7f6';
      x.fillRect(60 + i * 52, 20, 50, 10);
      x.fillStyle = '#4527a0';
      x.font = `bold 7px ${FONT}`;
      x.fillText(d, 80 + i * 52, 28);
    });
    const rows: Array<[string, Array<[number, number, string, string]>]> = [
      ['편집자 A', [[0, 2, '#ffca28', '게임 하이라이트'], [3, 2, '#ef5350', '쇼츠 x5']]],
      ['편집자 B', [[0, 1, '#26a69a', '먹방 컷'], [1, 3, '#5c6bc0', '브이로그 EP.12']]],
      ['편집자 C', [[1, 2, '#ab47bc', '콩트 #7'], [4, 1, '#ff7043', '썸네일']]],
    ];
    rows.forEach(([who, blocks], r) => {
      const y = 36 + r * 28;
      x.font = `7px ${FONT}`;
      x.fillStyle = '#424242';
      x.fillText(who, 8, y + 12);
      for (const [d, n, c, t] of blocks) {
        x.fillStyle = c;
        x.fillRect(60 + d * 52, y, n * 52 - 2, 18);
        x.fillStyle = '#ffffff';
        x.font = `bold 7px ${FONT}`;
        x.fillText(t, 64 + d * 52, y + 12, n * 52 - 8);
      }
    });
    x.fillStyle = '#e53935';
    x.font = `bold 7px ${FONT}`;
    x.fillText('▲ 업로드: 수 18:00 · 토 12:00', 60, 124);
  });

/** The skit's plan on the board: four panels in marker and the title. */
const skitPlanTex = () =>
  painted('stSkitPlan', 192, 152, (x) => {
    x.fillStyle = '#fbfbf8';
    x.fillRect(0, 0, 192, 152);
    x.font = `bold 12px ${FONT}`;
    x.fillStyle = '#c62828';
    x.fillText('콩트 #7 기획', 8, 16);
    x.font = `9px ${FONT}`;
    x.fillStyle = '#1a3c9e';
    x.fillText('외계인이 편의점 알바를 한다면?', 8, 30);
    for (let i = 0; i < 4; i++) {
      const px = 8 + (i % 2) * 92;
      const py = 38 + Math.floor(i / 2) * 56;
      x.strokeStyle = '#424242';
      x.lineWidth = 1.5;
      x.strokeRect(px, py, 84, 48);
      // A stick figure in each, an alien's antennae in two.
      x.beginPath();
      x.arc(px + 24, py + 16, 6, 0, Math.PI * 2);
      x.moveTo(px + 24, py + 22);
      x.lineTo(px + 24, py + 36);
      x.moveTo(px + 16, py + 28);
      x.lineTo(px + 32, py + 26 - (i % 2) * 6);
      x.moveTo(px + 24, py + 36);
      x.lineTo(px + 18, py + 45);
      x.moveTo(px + 24, py + 36);
      x.lineTo(px + 30, py + 45);
      x.stroke();
      if (i !== 1) {
        x.strokeStyle = '#2e7d32';
        x.beginPath();
        x.moveTo(px + 21, py + 10);
        x.lineTo(px + 17, py + 3);
        x.moveTo(px + 27, py + 10);
        x.lineTo(px + 31, py + 3);
        x.stroke();
      }
      x.font = `8px ${FONT}`;
      x.fillStyle = '#c62828';
      x.fillText(['어서오세요~', '봉투 필요하세요?', '삐빅! 지구 화폐?', '1+1 행사 중!'][i], px + 36, py + 20, 46);
    }
  });

/** The camera's field monitor: the skit keyed over the shop it's set in (a convenience store in space). */
const compTex = () =>
  painted('stComp', 128, 80, (x) => {
    x.fillStyle = '#0d1033';
    x.fillRect(0, 0, 128, 80);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = '#ffffff';
      x.fillRect((i * 37) % 128, (i * 23) % 50, 1, 1);
    }
    x.fillStyle = '#eceff1';
    x.fillRect(10, 36, 108, 40);
    x.fillStyle = '#1e88e5';
    x.fillRect(10, 32, 108, 6);
    x.font = `bold 6px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('우주 편의점 24', 40, 37);
    for (let i = 0; i < 6; i++) {
      x.fillStyle = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043'][i];
      x.fillRect(16 + i * 17, 46, 12, 8);
    }
    x.fillStyle = '#4a3a6b';
    x.fillRect(58, 42, 14, 26);
    x.fillStyle = '#f8d9c0';
    x.beginPath();
    x.arc(65, 38, 6, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#e53935';
    x.font = `bold 7px ${FONT}`;
    x.fillText('● REC', 4, 10);
  });

/** The live dashboard on the wall: the house's rooms on air, the viewers, the donation goal, the top fans. */
const dashTex = () =>
  painted('stDash', 512, 288, (x) => {
    x.fillStyle = '#140d26';
    x.fillRect(0, 0, 512, 288);
    x.fillStyle = '#ffc928';
    x.fillRect(0, 0, 512, 30);
    x.font = `bold 18px ${FONT}`;
    x.fillStyle = '#2b2118';
    x.fillText('🌟 꿀잼하우스 방송 상황판', 12, 22);
    x.font = `bold 12px ${FONT}`;
    x.fillText('구독자 102,340  (+1,204)', 330, 21);
    // The rooms.
    const rooms: Array<[string, string, boolean]> = [['탁준 · 게임 방송', '🔴 LIVE 1,284', true], ['봄이 · 먹방', '⏸ 준비 중', false], ['그린 스크린 · 콩트 #7', '🎬 촬영 중', true], ['ASMR 부스', '🌙 22:00 예정', false]];
    rooms.forEach(([name, st2, on], i) => {
      const y = 40 + i * 56;
      x.fillStyle = on ? '#2d1b4e' : '#1f1a2e';
      x.fillRect(10, y, 170, 50);
      x.fillStyle = on ? '#ff4fa3' : '#555';
      x.fillRect(10, y, 4, 50);
      x.font = `bold 12px ${FONT}`;
      x.fillStyle = '#ffffff';
      x.fillText(name, 20, y + 20);
      x.font = `11px ${FONT}`;
      x.fillStyle = on ? '#ff8a80' : '#9e9e9e';
      x.fillText(st2, 20, y + 40);
    });
    // The viewers over the evening.
    x.fillStyle = '#1f1a2e';
    x.fillRect(190, 40, 190, 130);
    x.font = `bold 11px ${FONT}`;
    x.fillStyle = '#b39ddb';
    x.fillText('실시간 시청자', 200, 58);
    x.font = `bold 26px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('1,284', 200, 90);
    x.strokeStyle = '#3de0ff';
    x.lineWidth = 2.5;
    x.beginPath();
    [20, 26, 24, 38, 44, 40, 58, 66, 62, 74].forEach((v, i) => (i ? x.lineTo(200 + i * 19, 165 - v) : x.moveTo(200, 165 - v)));
    x.stroke();
    // The donation goal: the bar itself is lit over this while it's watched.
    x.fillStyle = '#1f1a2e';
    x.fillRect(190, 178, 190, 98);
    x.font = `bold 11px ${FONT}`;
    x.fillStyle = '#ffc928';
    x.fillText('오늘의 후원 목표', 200, 196);
    x.fillStyle = '#3a3150';
    x.fillRect(200, 206, 170, 16);
    x.fillStyle = '#ffc928';
    x.fillRect(200, 206, 122, 16);
    x.font = `bold 11px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('720,000 / 1,000,000원', 200, 242);
    x.font = `10px ${FONT}`;
    x.fillStyle = '#b39ddb';
    x.fillText('달성 시: 매운 라면 10봉 먹방!', 200, 262);
    // Top fans.
    x.fillStyle = '#1f1a2e';
    x.fillRect(390, 40, 112, 236);
    x.font = `bold 11px ${FONT}`;
    x.fillStyle = '#ff80c0';
    x.fillText('💛 TOP 후원', 398, 58);
    [['꿀벌러버', '150,000'], ['치킨러버', '82,000'], ['새벽세시', '50,000'], ['도토리묵', '31,000'], ['딸기우유', '20,000']].forEach(([n, v], i) => {
      x.font = `bold 10px ${FONT}`;
      x.fillStyle = i === 0 ? '#ffc928' : '#ffffff';
      x.fillText(`${i + 1}. ${n}`, 398, 84 + i * 36);
      x.font = `9px ${FONT}`;
      x.fillStyle = '#9e9e9e';
      x.fillText(`${v}원`, 412, 98 + i * 36);
    });
  });

/** The neon on its board: 꿀잼 HOUSE in pink and blue tubes round 꿀벌이, glowing. */
const neonTex = () =>
  painted('stNeon', 512, 200, (x) => {
    x.clearRect(0, 0, 512, 200);
    const tube = (draw: () => void, col: string, w: number) => {
      x.save();
      x.shadowColor = col;
      x.strokeStyle = col;
      x.fillStyle = col;
      for (const [blur, lw, a] of [[24, w + 4, 0.35], [10, w + 1, 0.7], [0, w * 0.55, 1]] as Array<[number, number, number]>) {
        x.shadowBlur = blur;
        x.lineWidth = lw;
        x.globalAlpha = a;
        draw();
      }
      x.restore();
      x.save();
      x.strokeStyle = '#ffffff';
      x.fillStyle = '#ffffff';
      x.lineWidth = w * 0.25;
      x.globalAlpha = 0.85;
      draw();
      x.restore();
    };
    x.lineCap = x.lineJoin = 'round';
    x.textBaseline = 'middle';
    x.font = `bold 96px ${FONT}`;
    tube(() => x.strokeText('꿀잼', 150, 92), '#ff4fa3', 5);
    x.font = `bold 52px "Arial Rounded MT Bold",${FONT}`;
    tube(() => x.strokeText('HOUSE', 330, 98), '#3de0ff', 4);
    // 꿀벌이 in yellow lines on the left.
    tube(() => {
      x.beginPath();
      x.ellipse(80, 104, 40, 32, 0, 0, Math.PI * 2);
      x.stroke();
      x.beginPath();
      x.moveTo(66, 74);
      x.lineTo(66, 134);
      x.moveTo(90, 74);
      x.lineTo(90, 134);
      x.stroke();
      x.beginPath();
      x.ellipse(58, 62, 18, 11, -0.6, 0, Math.PI * 2);
      x.ellipse(100, 62, 18, 11, 0.6, 0, Math.PI * 2);
      x.stroke();
    }, '#ffc928', 4);
    tube(() => {
      x.beginPath();
      x.moveTo(150, 168);
      x.lineTo(470, 168);
      x.stroke();
    }, '#b388ff', 3);
    x.font = `bold 20px ${FONT}`;
    tube(() => x.strokeText('ON AIR · 24H STREAMING', 200, 168), '#ffffff', 1.4);
  });

/** A row of merch: the hoodie's chest print. */
const logoTex = () =>
  painted('stLogo', 128, 64, (x) => {
    x.clearRect(0, 0, 128, 64);
    x.fillStyle = '#ffc928';
    x.beginPath();
    x.ellipse(28, 32, 18, 14, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#2b2118';
    x.fillRect(22, 18, 4, 28);
    x.fillRect(32, 18, 4, 28);
    x.font = `bold 20px ${FONT}`;
    x.fillStyle = '#ff4fa3';
    x.fillText('꿀잼', 52, 30);
    x.font = `bold 11px ${FONT}`;
    x.fillStyle = '#3de0ff';
    x.fillText('HOUSE', 56, 46);
  });

/** An acrylic stand's print: one of the house's streamers as a chibi. */
const acrylicTex = (hair: string, shirt: string) =>
  painted(`stAcrylic|${hair}|${shirt}`, 48, 96, (x) => {
    x.clearRect(0, 0, 48, 96);
    x.fillStyle = shirt;
    x.beginPath();
    x.roundRect(12, 50, 24, 34, 6);
    x.fill();
    x.fillStyle = '#f8d9c0';
    x.beginPath();
    x.arc(24, 36, 15, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = hair;
    x.beginPath();
    x.arc(24, 31, 16, Math.PI, Math.PI * 2);
    x.fill();
    x.fillStyle = '#1b1b1b';
    x.fillRect(17, 37, 3, 4);
    x.fillRect(28, 37, 3, 4);
    x.fillStyle = '#ff8a80';
    x.fillRect(20, 44, 8, 2);
  });

/** The plaque: 100,000 subscribers. */
const plaqueTex = () =>
  painted('stPlaque', 96, 128, (x) => {
    const g2 = x.createLinearGradient(0, 0, 96, 128);
    g2.addColorStop(0, '#f5f5f5');
    g2.addColorStop(0.5, '#bdbdbd');
    g2.addColorStop(1, '#eeeeee');
    x.fillStyle = g2;
    x.fillRect(0, 0, 96, 128);
    x.fillStyle = '#e53935';
    x.beginPath();
    x.roundRect(28, 30, 40, 28, 7);
    x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.moveTo(43, 37);
    x.lineTo(43, 51);
    x.lineTo(55, 44);
    x.fill();
    x.textAlign = 'center';
    x.font = `bold 11px ${FONT}`;
    x.fillStyle = '#424242';
    x.fillText('꿀잼하우스', 48, 80);
    x.font = `9px ${FONT}`;
    x.fillText('구독자 10만 달성', 48, 96);
  });

/** The collab cart's laptop: two on the sofa, live. */
const collabTex = () =>
  painted('stCollab', 160, 100, (x) => {
    x.fillStyle = '#4a3a6b';
    x.fillRect(0, 0, 160, 100);
    x.fillStyle = '#8d6e63';
    x.fillRect(10, 62, 140, 30);
    for (const [cx, hair, shirt] of [[55, '#1a1a1a', '#00b8d4'], [105, '#a0522d', '#f48fb1']] as Array<[number, string, string]>) {
      x.fillStyle = shirt;
      x.fillRect(cx - 14, 48, 28, 30);
      x.fillStyle = '#f8d9c0';
      x.beginPath();
      x.arc(cx, 38, 11, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = hair;
      x.beginPath();
      x.arc(cx, 34, 12, Math.PI, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = '#e53935';
    x.fillRect(4, 4, 56, 13);
    x.font = `bold 9px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('합방 LIVE', 8, 14);
  });

// ---- The pieces ----

export const BUILDERS: Record<string, Builder> = {
  /**
   * A streamer's desk (방송용 게이밍 PC): a black top with a pink edge and a big desk mat; behind it a
   * panel of hex lights and an ON AIR sign that light up when the stream goes live. The main monitor
   * shows the stream as viewers see it (the battle royale, the HUD, the facecam, LIVE 👁 1,284); a
   * portrait monitor to the right scrolls the chat; a webcam sits in a ring light over the screen, a
   * podcast mic with its pop filter hangs out on a boom arm in front of the face; a pastel keyboard
   * with WASD picked out, a mouse on the mat, a stream deck of lit buttons, 꿀벌이 the house's bee
   * plush, an energy drink, a headset on its hook; the PC under the desk with its fans lit; a pink
   * gaming chair. Sat in it streaming (activity.ts streamBeat): playing, talking to the camera,
   * reacting, the chair turned to the chat to type in it; reading the chat aloud, scrolled and laughed
   * at; a big donation pops up on screen and is thanked with a bow, a heart and both fists up; casting
   * a match, leant in watching it, pointing the play out.
   */
  gamingRig(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.04, 0.98);
    const h = 0.74;
    const d = 0.6;
    const z = -D / 2 + d / 2 + 0.06;
    const front = z + d / 2;
    const ty = h + 0.015;
    const use = inUse(g, out);
    // The panel behind: hex lights, the ON AIR sign.
    const pz = -D / 2 + 0.025;
    part(g, rbox(w, 1.72, 0.04, 0.012), '#2a2238', 0, 0.86, pz);
    const hexes: Array<[number, number, string]> = [[-0.3, 1.32, PINK], [-0.16, 1.4, VIOLET], [-0.16, 1.24, CYAN], [-0.02, 1.32, PINK], [0.26, 1.46, CYAN], [0.4, 1.38, VIOLET], [0.26, 1.3, PINK]];
    for (const [hx, hy, col] of hexes) {
      part(g, hex(0.075, 0.015), shade(col, 0.45), hx, hy, pz + 0.025, { outline: false });
      part(use, hex(0.068, 0.004), col, hx, hy, pz + 0.034, { outline: false, material: glow(col) });
    }
    part(g, rbox(0.3, 0.09, 0.03, 0.01), '#1b1320', 0.1, 1.62, pz + 0.035);
    label(g, 'ON AIR', 0.26, 0.07, 0.1, 1.62, pz + 0.052, '#3a1218', '#6e2a30');
    label(use, 'ON AIR', 0.26, 0.07, 0.1, 1.62, pz + 0.054, '#e53935', '#ffffff');
    // The top, its legs, the pink edge, the mat.
    part(g, rbox(w, 0.03, d, 0.01), '#202027', 0, h, z);
    part(g, box(w, 0.008, 0.006), PINK, 0, h - 0.008, front + 0.002, { outline: false });
    part(use, box(w - 0.02, 0.006, 0.004), PINK, 0, h - 0.008, front + 0.006, { outline: false, material: glow('#ff80c0') });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, h - 0.03, 0.06, 0.01), '#18181d', sx * (w / 2 - 0.06), (h - 0.03) / 2, z);
      part(g, rbox(0.07, 0.03, d - 0.06, 0.012), '#18181d', sx * (w / 2 - 0.06), 0.015, z);
    }
    part(g, rbox(w - 0.06, 0.004, 0.32, 0.004), '#3b2a5b', 0, ty + 0.002, front - 0.18, { outline: false });
    label(g, 'KKULJAM', 0.14, 0.026, -w / 2 + 0.13, ty + 0.0045, front - 0.05, 'none', '#ffc928', 0, -Math.PI / 2);
    // The main monitor and what's on it.
    const mw = 0.56;
    const mh = 0.32;
    const mx = -0.06;
    const mz = z - 0.13;
    const my = ty + 0.14 + mh / 2;
    part(g, rbox(0.24, 0.012, 0.14, 0.004), BLACK, mx, ty + 0.006, mz - 0.02);
    part(g, rbox(0.04, 0.16, 0.03, 0.008), BLACK, mx, ty + 0.08, mz - 0.03);
    part(g, rbox(mw + 0.02, mh + 0.02, 0.03, 0.008), BLACK, mx, my, mz);
    out.screen = screenOf(g, gameTex(), mw, mh, mx, my, mz + 0.016);
    const alert = sheet(use, donationTex(), 0.34, 0.15, mx, my + 0.05, mz + 0.019);
    const cast = sheet(use, castTex(), mw, mh, mx, my, mz + 0.0175);
    // The ring light behind the monitor, the webcam in it.
    const ry = my + mh / 2 + 0.07;
    const rz = mz - 0.08;
    rod(g, new THREE.Vector3(mx, ty, rz), new THREE.Vector3(mx, ry - 0.17, rz), 0.009, BLACK);
    part(g, ring(0.17, 0.018), '#e9e4d8', mx, ry, rz, { outline: false });
    part(use, ring(0.17, 0.016), '#fffdf0', mx, ry, rz + 0.006, { outline: false, material: glow('#fffdf0') });
    part(g, rbox(0.09, 0.035, 0.035, 0.012), '#202125', mx, my + mh / 2 + 0.03, mz);
    part(g, cyl(0.013, 0.013, 0.006, 14), '#4f6d7a', mx, my + mh / 2 + 0.03, mz + 0.019, { rx: Math.PI / 2, outline: false });
    part(use, ball(0.005), '#ff1744', mx + 0.032, my + mh / 2 + 0.036, mz + 0.018, { outline: false, material: glow('#ff1744') });
    // The portrait monitor with the chat, turned in.
    const chat = frame(g, w / 2 - 0.13, ty + 0.3, z - 0.06, -0.5);
    part(chat, rbox(0.21, 0.37, 0.025, 0.008), BLACK, 0, 0, 0);
    part(chat, box(0.19, 0.35, 0.002), '#16131c', 0, 0, 0.0135, { outline: false });
    part(g, rbox(0.12, 0.012, 0.1, 0.004), BLACK, w / 2 - 0.13, ty + 0.006, z - 0.07);
    part(g, rbox(0.03, 0.12, 0.025, 0.006), BLACK, w / 2 - 0.13, ty + 0.06, z - 0.08);
    const chatOn = frame(use, w / 2 - 0.13, ty + 0.3, z - 0.06, -0.5);
    sheet(chatOn, chatHeadTex(), 0.19, 0.036, 0, 0.157, 0.0145);
    const column = chatTex();
    sheet(chatOn, column, 0.19, 0.31, 0, -0.018, 0.0145);
    // The mic on its boom arm, from the back left corner out in front of the face, its pop filter.
    const clamp = new THREE.Vector3(-w / 2 + 0.05, ty + 0.04, z - d / 2 + 0.06);
    const j1 = new THREE.Vector3(-w / 2 + 0.07, ty + 0.5, z - 0.12);
    const j2 = new THREE.Vector3(-0.2, ty + 0.34, front - 0.06);
    part(g, rbox(0.05, 0.08, 0.06, 0.01), BLACK, clamp.x, ty + 0.03, clamp.z);
    rod(g, clamp, j1, 0.011, BLACK);
    rod(g, j1, j2, 0.011, BLACK);
    part(g, ball(0.02), BLACK, j1.x, j1.y, j1.z, { outline: false });
    const mic = frame(g, j2.x, j2.y - 0.06, j2.z, 0.75, -0.3);
    part(mic, cyl(0.03, 0.03, 0.15, 14), '#2b2c31', 0, 0, 0, { rx: Math.PI / 2 });
    part(mic, cyl(0.032, 0.032, 0.05, 14), '#1d1e22', 0, 0, 0.06, { rx: Math.PI / 2, outline: false });
    part(mic, ring(0.035, 0.005), BLACK, 0, 0.04, -0.02, { rx: Math.PI / 2, outline: false });
    part(mic, ring(0.055, 0.005), BLACK, 0, 0, 0.11, { outline: false });
    const pop = new THREE.Mesh(new THREE.CircleGeometry(0.053, 20), GLASS);
    pop.userData.ownGeometry = true;
    pop.position.set(0, 0, 0.11);
    mic.add(pop);
    part(use, ball(0.006), '#76ff03', j2.x - 0.03, j2.y - 0.1, j2.z - 0.02, { outline: false, material: glow('#b2ff59') });
    // The keyboard, the mouse; where the hands go.
    const kx = -0.08;
    const kz = front - 0.13;
    keyboard(g, use, kx, ty, kz);
    mouse(g, use, kx + 0.3, ty, kz + 0.01);
    const kb = marker(g, kx, ty + 0.035, kz);
    // The stream deck: fifteen buttons lit while live.
    const deck = frame(g, -w / 2 + 0.11, ty + 0.03, kz - 0.06, 0.25, -0.5);
    const deckOn = frame(use, -w / 2 + 0.11, ty + 0.03, kz - 0.06, 0.25, -0.5);
    part(deck, rbox(0.12, 0.075, 0.04, 0.01), '#1d1e22', 0, 0, 0);
    for (let i = 0; i < 15; i++) {
      const bx = -0.044 + (i % 5) * 0.022;
      const by = -0.022 + Math.floor(i / 5) * 0.022;
      part(deck, box(0.017, 0.017, 0.006), '#3a3c44', bx, by, 0.021, { outline: false });
      part(deckOn, box(0.015, 0.015, 0.004), [PINK, CYAN, HONEY, '#76ff03', VIOLET][i % 5], bx, by, 0.025, { outline: false, material: glow([PINK, CYAN, HONEY, '#b2ff59', '#b388ff'][i % 5]) });
    }
    // 꿀벌이, the can, a sticky note.
    bee(g, -w / 2 + 0.12, ty, z - 0.08, 0.15, 0.4);
    can(g, w / 2 - 0.25, ty, front - 0.08, '#ff4fa3');
    part(g, box(0.05, 0.05, 0.003), '#fff176', mx - mw / 2 + 0.03, my - mh / 2 + 0.03, mz + 0.017, { rz: 0.1, outline: false });
    // The headset on its hook at the right edge.
    part(g, rbox(0.03, 0.08, 0.03, 0.006), BLACK, w / 2 + 0.005, h - 0.06, front - 0.15);
    headset(g, w / 2 + 0.03, h - 0.1, front - 0.15, Math.PI / 2);
    // The PC under the right end: glass to the chair's side, its fans.
    const px = w / 2 - 0.18;
    const pcz = z - 0.04;
    part(g, rbox(0.22, 0.46, 0.44, 0.012), '#f2f2f5', px, 0.24, pcz);
    part(g, box(0.004, 0.4, 0.38), '#9fa4b0', px - 0.112, 0.25, pcz, { outline: false });
    for (let k = 0; k < 3; k++) {
      part(g, ring(0.05, 0.008), '#c5c8d0', px - 0.114, 0.13 + k * 0.11, pcz + 0.08, { ry: Math.PI / 2, outline: false });
      part(use, ring(0.05, 0.009), PINK, px - 0.115, 0.13 + k * 0.11, pcz + 0.08, { ry: Math.PI / 2, outline: false, material: glow(k === 1 ? '#80f0ff' : '#ff80c0') });
    }
    // The chair, which turns with the streamer to the chat.
    const sitZ = front + 0.27;
    const chair = frame(g, 0, 0, sitZ, Math.PI);
    gamingChair(chair, 0.43, PINK, '#f4f0f6');
    // One spot an interaction (all in the chair), so the desk can tell which show is on.
    const play = satAt(g, 0, sitZ, 'stream', kb);
    const read = satAt(g, 0, sitZ, 'streamChat', kb);
    const don = satAt(g, 0, sitZ, 'donation', kb);
    const call = satAt(g, 0, sitZ, 'streamCast', kb);
    const shows = new Map<Spot, StreamShow>([[play, 'stream'], [read, 'streamChat'], [don, 'donation'], [call, 'streamCast']]);
    const all = [...shows.keys()];
    const tmp = new THREE.Vector3();
    out.work = kb;
    out.animate = (t) => {
      const sp = lastPosed(all);
      const beat = streamBeat(shows.get(sp)!, t, toolPhase(sp.at.getWorldPosition(tmp)));
      const yaw = Math.PI - beat.turn * TURN;
      for (const s of all) s.at.rotation.y = yaw;
      chair.rotation.y = yaw;
      alert.visible = sp === don;
      alert.scale.setScalar(1 + 0.05 * Math.max(0, Math.sin(t * 7)));
      cast.visible = sp === call;
      column.offset.y = -chatScroll(t);
    };
    out.spots = { '*': play, streamGame: play, readChat: read, donationEvent: don, streamer_castMatch: call };
  },

  /**
   * An editing desk (영상 편집 컴퓨터), the streaming house's and any media office's: a pale oak top
   * on black legs, an ultrawide monitor with the editor open (the bins, the vlog in the program
   * monitor with its subtitle, the effects, the timeline of video, subtitle and music tracks) and
   * the playhead running along it in use; studio monitor speakers on pads either side, a jog wheel
   * that turns, a shortcut keyboard with its coloured keys, closed-back headphones on a stand, a
   * stack of external drives blinking, a coffee, a '자막 확인!' sticky note; a mesh chair. Sat at it
   * cutting (typing); studying the channel's numbers (the analytics up on the screen, notes taken);
   * planning the editors' week (the schedule up, sat back with the notebook).
   */
  videoEditStation(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.04, 0.98);
    const h = 0.74;
    const d = 0.62;
    const z = -D / 2 + d / 2 + 0.04;
    const front = z + d / 2;
    const ty = h + 0.015;
    const use = inUse(g, out);
    part(g, rbox(w, 0.035, d, 0.012), '#d9c3a5', 0, h, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.02, h - 0.02, 10), BLACK, sx * (w / 2 - 0.05), (h - 0.02) / 2, z + sz * (d / 2 - 0.05), { outline: false });
    part(g, rbox(w - 0.12, 0.05, 0.03, 0.01), BLACK, 0, h - 0.06, z - d / 2 + 0.05);
    // The ultrawide on its stand, and the playhead.
    const mw = 0.72;
    const mh = 0.29;
    const mz = z - 0.14;
    const my = ty + 0.13 + mh / 2;
    part(g, rbox(0.3, 0.012, 0.14, 0.004), BLACK, 0, ty + 0.006, mz - 0.02);
    part(g, rbox(0.04, 0.14, 0.03, 0.008), BLACK, 0, ty + 0.07, mz - 0.03);
    const mon = frame(g, 0, my, mz);
    part(mon, rbox(mw + 0.02, mh + 0.02, 0.03, 0.008), BLACK, 0, 0, 0);
    out.screen = screenOf(mon, editTex(), mw, mh, 0, 0, 0.016);
    const monOn = frame(use, 0, my, mz);
    const lineY = -mh / 2 + mh * (60 / 128) / 2;
    const playhead = part(monOn, box(0.003, mh * (60 / 128), 0.002), '#ff5252', 0, lineY, 0.018, { outline: false, material: glow('#ff5252') });
    const stats = sheet(monOn, analyticsTex(), mw, mh, 0, 0, 0.0175);
    const plan = sheet(monOn, scheduleTex(), mw, mh, 0, 0, 0.0175);
    part(mon, box(0.045, 0.045, 0.003), '#fff176', mw / 2 - 0.03, mh / 2 - 0.02, 0.017, { rz: -0.1, outline: false });
    label(mon, '자막 확인!', 0.045, 0.012, mw / 2 - 0.03, mh / 2 - 0.02, 0.019, 'none', '#c62828');
    // The speakers on their pads, either side.
    for (const sx of [-1, 1]) {
      const sp = frame(g, sx * (w / 2 - 0.08), ty, mz + 0.04, sx * -0.25);
      part(sp, rbox(0.11, 0.03, 0.14, 0.01), '#4a4c55', 0, 0.015, 0);
      part(sp, rbox(0.1, 0.17, 0.12, 0.012), '#1d1e22', 0, 0.12, 0);
      part(sp, cyl(0.035, 0.035, 0.006, 16), '#9e9e9e', 0, 0.1, 0.062, { rx: Math.PI / 2, outline: false });
      part(sp, cyl(0.014, 0.014, 0.006, 12), '#9e9e9e', 0, 0.175, 0.062, { rx: Math.PI / 2, outline: false });
      part(use, ball(0.004), '#40c4ff', sx * (w / 2 - 0.08) + sx * 0.03, ty + 0.03, mz + 0.115, { outline: false, material: glow('#40c4ff') });
    }
    // The shortcut keyboard; the jog wheel on the right that turns while cutting.
    const kz = front - 0.15;
    const kx = -0.06;
    part(g, rbox(0.36, 0.024, 0.13, 0.008), '#2b2c31', kx, ty + 0.012, kz);
    for (let r = 0; r < 4; r++) part(g, box(0.33, 0.01, 0.022), '#e8e8ec', kx, ty + 0.028, kz - 0.045 + r * 0.03, { outline: false });
    const keys: Array<[number, number, string]> = [[-0.12, -0.045, '#e53935'], [-0.09, -0.045, '#1e88e5'], [-0.06, -0.045, '#43a047'], [-0.11, -0.015, '#fdd835'], [0.08, 0.015, '#ab47bc']];
    for (const [dx, dz, col] of keys) part(g, box(0.02, 0.012, 0.02), col, kx + dx, ty + 0.03, kz + dz, { outline: false });
    const jx = kx + 0.3;
    part(g, rbox(0.15, 0.03, 0.12, 0.012), '#2b2c31', jx, ty + 0.015, kz);
    const jog = frame(use, jx, ty + 0.035, kz + 0.005);
    part(g, cyl(0.045, 0.045, 0.012, 22), '#3a3c44', jx, ty + 0.034, kz + 0.005, { outline: false });
    part(jog, box(0.008, 0.004, 0.03), '#9e9e9e', 0, 0.006, 0.02, { outline: false });
    for (let i = 0; i < 4; i++) part(g, box(0.016, 0.008, 0.012), '#4a4c55', jx - 0.05 + i * 0.033, ty + 0.034, kz - 0.048, { outline: false });
    const kb = marker(g, kx, ty + 0.03, kz);
    // The notebook for notes, on the left.
    const nb = frame(g, -w / 2 + 0.14, ty + 0.004, front - 0.14, 0.2);
    part(nb, box(0.15, 0.008, 0.2), '#5e35b1', 0, 0, 0);
    part(nb, box(0.135, 0.004, 0.185), '#fafafa', 0.004, 0.006, 0, { outline: false });
    for (let i = 0; i < 5; i++) part(nb, box(0.1, 0.002, 0.004), '#9e9e9e', 0.01, 0.009, -0.06 + i * 0.03, { outline: false });
    const notes = marker(g, -w / 2 + 0.14, ty + 0.01, front - 0.14);
    // The headphones on their stand, the drives, the coffee.
    const hx = -w / 2 + 0.1;
    part(g, cyl(0.04, 0.045, 0.012, 14), BLACK, hx, ty + 0.006, mz + 0.06, { outline: false });
    part(g, cyl(0.007, 0.007, 0.24, 8), '#3a3c44', hx, ty + 0.12, mz + 0.06, { outline: false });
    headset(g, hx, ty + 0.25, mz + 0.06, Math.PI / 2, '#3a3c44', '#212121');
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.08, 0.02, 0.11, 0.006), ['#37474f', '#c62828', '#37474f'][i], w / 2 - 0.12, ty + 0.01 + i * 0.022, front - 0.26);
      part(use, box(0.004, 0.004, 0.004), '#40c4ff', w / 2 - 0.085, ty + 0.012 + i * 0.022, front - 0.204, { outline: false, material: glow(i === 1 ? '#69f0ae' : '#40c4ff') });
    }
    part(g, cyl(0.035, 0.03, 0.09, 14), '#fafafa', w / 2 - 0.1, ty + 0.045, front - 0.08);
    part(g, cyl(0.03, 0.03, 0.004, 14), '#4e342e', w / 2 - 0.1, ty + 0.087, front - 0.08, { outline: false });
    // The chair.
    const sitZ = front + 0.25;
    meshChair(frame(g, 0, 0, sitZ, Math.PI), 0.44, '#5e35b1');
    const cut = satAt(g, 0, sitZ, 'type', kb);
    const study = satAt(g, 0, sitZ, 'write', notes);
    const lead = satAt(g, 0, sitZ, 'meeting', kb);
    const all = [cut, study, lead];
    out.work = kb;
    out.animate = (t) => {
      const sp = lastPosed(all);
      stats.visible = sp === study;
      plan.visible = sp === lead;
      playhead.visible = sp === cut;
      playhead.position.x = -mw / 2 + ((t / 14) % 1) * mw;
      jog.rotation.y = Math.sin(t * 0.9) * 2.4;
    };
    out.spots = { '*': cut, streamer_studyAnalytics: study, streamer_guideEditors: lead };
  },

  /**
   * A green screen (그린 스크린): green cloth hung from a crossbar between two stands, sweeping down
   * on to the floor in a curve with no corner, tracking crosses taped on it; LED panels on the stands
   * that light it while shooting; the camera on its tripod at the front corner, a field monitor on it
   * showing the skit keyed into a convenience store in space, its REC tally; the skit's plan on a
   * little board at the other corner (콩트 #7: 외계인이 편의점 알바를 한다면?); a prop crate with a
   * rubber chicken and a party hat, the clapperboard on it. Stood on the green acting the skit out to
   * the lens (a shrug, the shock, a finger at the camera, hands on hips, a wave goodbye); planning a
   * sketch, stood at the board drawing the panels in.
   */
  greenScreen(g, W, D, _c, _def, _ctx, out) {
    const green = '#3bb54a';
    const bw = Math.min(W - 0.46, 1.6);
    const bz = -D / 2 + 0.06;
    const top = 2.05;
    const use = inUse(g, out);
    // The stands and the crossbar.
    for (const sx of [-1, 1]) lightStand(g, sx * (bw / 2 + 0.02), bz + 0.02, top + 0.03, 0.2);
    part(g, cyl(0.014, 0.014, bw + 0.08, 10), BLACK, 0, top, bz + 0.02, { rz: Math.PI / 2, outline: false });
    // The cloth: hung, the curve and the floor run.
    const curveR = 0.24;
    part(g, box(bw - 0.04, top - 0.04 - curveR, 0.012), green, 0, curveR + (top - 0.04 - curveR) / 2, bz, { outline: false });
    const sweep = new THREE.Mesh(
      shape(`stSweep${bw}`, () => new THREE.CylinderGeometry(curveR, curveR, bw - 0.04, 16, 1, true, Math.PI, Math.PI / 2).rotateZ(Math.PI / 2)),
      new THREE.MeshToonMaterial({ color: green, side: THREE.DoubleSide, gradientMap: gradient }),
    );
    sweep.userData.ownMaterial = true;
    sweep.position.set(0, curveR, bz + curveR);
    g.add(sweep);
    const runD = 0.62;
    part(g, box(bw - 0.04, 0.006, runD), green, 0, 0.003, bz + curveR + runD / 2, { outline: false });
    // Tracking crosses on the cloth.
    for (const [tx, ty2] of [[-0.6, 1.6], [0, 1.75], [0.6, 1.6], [-0.6, 0.9], [0.6, 0.9]]) {
      for (const r of [Math.PI / 4, -Math.PI / 4]) part(g, box(0.07, 0.012, 0.002), '#f8bbd0', tx, ty2, bz + 0.008, { rz: r, outline: false });
    }
    part(g, box(0.18, 0.008, 0.004), '#f8bbd0', 0, 0.007, bz + curveR + 0.3, { outline: false });
    part(g, box(0.008, 0.008, 0.18), '#f8bbd0', 0, 0.007, bz + curveR + 0.3, { outline: false });
    // LED panels on the stands, tipped in towards the middle.
    for (const sx of [-1, 1]) {
      const p = frame(g, sx * (bw / 2 + 0.02), 1.7, bz + 0.14, sx * -0.6, 0.25);
      part(p, rbox(0.26, 0.18, 0.04, 0.01), '#2b2c31', 0, 0, 0);
      part(p, box(0.24, 0.16, 0.004), '#cfcfcf', 0, 0, 0.022, { outline: false });
      const on = frame(use, sx * (bw / 2 + 0.02), 1.7, bz + 0.14, sx * -0.6, 0.25);
      part(on, box(0.24, 0.16, 0.004), '#fffdf0', 0, 0, 0.024, { outline: false, material: glow('#fffdf0') });
    }
    // The camera on its tripod at the front right corner, turned in, its field monitor.
    const cx = bw / 2 - 0.12;
    const cz = D / 2 - 0.14;
    lightStand(g, cx, cz, 1.3, 0.16);
    const act = stoodAt(g, -0.1, bz + curveR + 0.3, 'skit', undefined, 0.45);
    const aim = Math.atan2(-0.1 - cx, bz + curveR + 0.3 - cz);
    const cam = frame(g, cx, 1.36, cz, aim);
    camera(cam);
    const tally = frame(use, cx, 1.36, cz, aim);
    part(tally, ball(0.009), '#ff1744', 0.05, 0.03, 0.031, { outline: false, material: glow('#ff1744') });
    const fm = frame(cam, 0, 0.1, -0.02, 0, -0.2);
    part(fm, rbox(0.15, 0.1, 0.02, 0.006), BLACK, 0, 0, 0);
    part(fm, box(0.13, 0.08, 0.002), '#1b1d22', 0, 0, -0.011, { outline: false });
    const fmOn = frame(tally, 0, 0.1, -0.02, 0, -0.2);
    sheet(fmOn, compTex(), 0.13, 0.08, 0, 0, -0.012, Math.PI);
    // The plan on its board at the front left corner.
    const px = -bw / 2 + 0.22;
    const pz = D / 2 - 0.2;
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(px + sx * 0.2, 0, pz + 0.06), new THREE.Vector3(px + sx * 0.18, 1.5, pz - 0.02), 0.012, '#8d6e63');
    rod(g, new THREE.Vector3(px, 0, pz - 0.18), new THREE.Vector3(px, 1.3, pz - 0.03), 0.012, '#8d6e63');
    const board = frame(g, px, 1.18, pz - 0.0, 0, -0.08);
    part(board, rbox(0.46, 0.37, 0.02, 0.008), '#eceff1', 0, 0, 0);
    sheet(board, skitPlanTex(), 0.43, 0.34, 0, 0, 0.011);
    part(g, rbox(0.42, 0.02, 0.05, 0.006), '#8d6e63', px, 0.98, pz + 0.03);
    for (const [i, col] of ['#c62828', '#1a3c9e', '#2e7d32'].entries()) part(g, cyl(0.008, 0.008, 0.1, 8), col, px - 0.08 + i * 0.05, 1.0, pz + 0.03, { rz: Math.PI / 2, outline: false });
    const planAt = marker(board, -0.05, 0.02, 0.01);
    // The prop crate by the left stand: a rubber chicken, a party hat, the clapperboard.
    const kx = -bw / 2 + 0.18;
    const kz2 = bz + 0.36;
    part(g, rbox(0.34, 0.28, 0.26, 0.01), '#c19a6b', kx, 0.14, kz2);
    label(g, '콩트 소품', 0.2, 0.05, kx, 0.17, kz2 + 0.131, 'none', '#4e342e');
    const ch = frame(g, kx + 0.06, 0.3, kz2 - 0.04, 0.6, -0.5);
    part(ch, cyl(0.03, 0.035, 0.16, 10), '#ffee58', 0, 0.06, 0);
    part(ch, ball(0.035), '#ffee58', 0, 0.16, 0.0);
    part(ch, cone(0.014, 0.03, 6), '#ff7043', 0, 0.16, 0.04, { rx: Math.PI / 2, outline: false });
    part(ch, box(0.01, 0.03, 0.03), '#e53935', 0, 0.2, 0, { outline: false });
    part(g, cone(0.05, 0.13, 12), '#ab47bc', kx - 0.1, 0.345, kz2 + 0.04);
    part(g, ball(0.015), '#ffee58', kx - 0.1, 0.415, kz2 + 0.04, { outline: false });
    const cb = frame(g, kx + 0.02, 0.285, kz2 + 0.05, 0.3);
    part(cb, box(0.18, 0.006, 0.13), '#212121', 0, 0, 0);
    label(cb, '콩트 #7 · TAKE 3', 0.16, 0.035, 0, 0.004, 0.02, 'none', '#ffffff', 0, -Math.PI / 2);
    for (let i = 0; i < 5; i++) part(cb, box(0.03, 0.008, 0.02), i % 2 ? '#ffffff' : '#212121', -0.07 + i * 0.035, 0.012, -0.055, { outline: false });
    // The actor stands on the green, turned a little to the lens.
    out.work = planAt;
    out.spots = { '*': act, streamer_planSketch: stoodAt(g, px + 0.04, pz + 0.48, 'board', planAt) };
  },

  /**
   * The live dashboard (방송 상황판): a big TV on the wall (on a rolling stand in the middle of a
   * room) with the house's board — who's on air in each room, the live viewer count and its line, the
   * day's donation goal (720,000 of 1,000,000원: a spicy ramyeon mukbang if it's reached), the top
   * fans — and the chat scrolling down its edge while it's watched, the goal bar glowing and a 'NEW
   * 구독!' toast popping; under it a low console with the router, a trophy and an LED strip. Stood in
   * front of it with a notebook, pointing out the numbers.
   */
  stDashboard(g, W, D, _c, _def, ctx, out) {
    const tw = Math.min(W - 0.16, 1.72);
    const th = tw * (288 / 512);
    const wall = ctx.againstWall;
    const tz = wall ? -D / 2 + 0.05 : -0.1;
    const ty = wall ? 1.5 : 1.35;
    const use = inUse(g, out);
    if (!wall) {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.06, ty, 0.06, 0.012), '#3a3c44', sx * 0.4, ty / 2, tz - 0.05);
        part(g, rbox(0.08, 0.04, 0.6, 0.012), '#3a3c44', sx * 0.4, 0.04, tz);
      }
    } else part(g, rbox(0.4, 0.3, 0.04, 0.01), '#3a3c44', 0, ty, tz - 0.03);
    part(g, rbox(tw + 0.04, th + 0.04, 0.05, 0.012), '#111214', 0, ty, tz);
    out.screen = screenOf(g, dashTex(), tw, th, 0, ty, tz + 0.026);
    // The goal bar lit over the picture (200..370 of 512 across, 206..222 of 288 down), filling.
    const gx0 = -tw / 2 + tw * (200 / 512);
    const gLen = tw * (170 / 512);
    const gy = ty + th / 2 - th * (214 / 288);
    const fill = frame(use, gx0, gy, tz + 0.028);
    const bar = part(fill, box(1, th * (16 / 288), 0.002), HONEY, 0.5, 0, 0, { outline: false, material: glow('#ffd54f') });
    const toast = label(use, '🎉 NEW 구독! 별빛님', 0.42, 0.07, -tw / 2 + 0.3, ty - th / 2 + 0.09, tz + 0.03, '#ff4fa3', '#ffffff');
    // The chat down the right edge while it's watched.
    const column = chatTex();
    sheet(use, column, 0.2, th - 0.12, tw / 2 - 0.11, ty - 0.03, tz + 0.029);
    // The console under it.
    const cz = -D / 2 + 0.22;
    part(g, rbox(Math.min(tw, 1.4), 0.36, 0.36, 0.015), '#f4f1ea', 0, 0.2, cz);
    for (const sx of [-1, 1]) part(g, cyl(0.015, 0.015, 0.02, 8), '#c0a080', sx * 0.6, 0.01, cz, { outline: false });
    part(g, box(Math.min(tw, 1.4) - 0.04, 0.006, 0.006), PINK, 0, 0.06, cz + 0.181, { outline: false, material: glow('#ff80c0') });
    part(g, rbox(0.2, 0.04, 0.12, 0.01), '#fafafa', -0.4, 0.4, cz);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(-0.47 + i * 0.07, 0.42, cz - 0.04), new THREE.Vector3(-0.47 + i * 0.07, 0.56, cz - 0.05), 0.005, '#fafafa');
    for (let i = 0; i < 4; i++) part(g, ball(0.004), '#69f0ae', -0.46 + i * 0.03, 0.41, cz + 0.061, { outline: false, material: glow('#69f0ae') });
    part(g, cyl(0.04, 0.05, 0.03, 12), '#212121', 0.35, 0.395, cz);
    part(g, cyl(0.012, 0.02, 0.08, 10), '#ffd54f', 0.35, 0.45, cz);
    part(g, cyl(0.05, 0.02, 0.07, 14), '#ffd54f', 0.35, 0.52, cz);
    bee(g, 0.1, 0.38, cz, 0.18, 0.3);
    const work = marker(g, -tw * 0.15, ty - 0.1, tz + 0.03);
    out.work = work;
    out.animate = (t) => {
      const u = (t / 9) % 1;
      bar.scale.x = gLen * (0.72 + 0.08 * THREE.MathUtils.smoothstep(u, 0.2, 0.6));
      bar.position.x = bar.scale.x / 2;
      toast.visible = u > 0.6 && u < 0.85;
      column.offset.y = -chatScroll(t);
    };
    out.spots = { '*': stoodAt(g, -0.2, -D / 2 + 0.85, 'meeting', work) };
  },

  /**
   * The channel's neon (채널 네온 사인): 꿀잼 HOUSE in pink and blue tubes round 꿀벌이 in yellow, ON
   * AIR · 24H STREAMING under it, on a black acrylic board held off the wall on chrome studs; a
   * floating shelf under it with the house's acrylic stands, 꿀벌이 and the 100,000-subscriber plaque.
   */
  stNeonBoard(g, W, D, _c, _def, ctx) {
    const bw = Math.min(W - 0.12, 1.8);
    const bh = bw * (200 / 512);
    const wall = ctx.againstWall;
    const z = wall ? -D / 2 + 0.04 : -0.1;
    const y = 1.72;
    if (!wall) {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.05, y + bh / 2, 0.05, 0.01), '#2b2c31', sx * (bw / 2 - 0.1), (y + bh / 2) / 2, z - 0.04);
        part(g, rbox(0.08, 0.04, 0.5, 0.012), '#2b2c31', sx * (bw / 2 - 0.1), 0.02, z);
      }
    }
    const board = new THREE.Mesh(box(bw + 0.06, bh + 0.06, 0.012), new THREE.MeshToonMaterial({ color: '#141018', transparent: true, opacity: 0.85 }));
    board.userData.ownMaterial = true;
    board.position.set(0, y, z + 0.02);
    g.add(board);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) part(g, cyl(0.014, 0.014, 0.04, 10), CHROME, sx * (bw / 2 - 0.02), y + sy * (bh / 2 - 0.02), z + 0.01, { rx: Math.PI / 2, outline: false });
    sheet(g, neonTex(), bw, bh, 0, y, z + 0.03);
    // The floating shelf and what's on it.
    const sy = 1.12;
    part(g, rbox(bw * 0.8, 0.03, 0.2, 0.008), '#f4f1ea', 0, sy, z + 0.1);
    part(g, box(bw * 0.8 - 0.04, 0.006, 0.006), '#b388ff', 0, sy - 0.018, z + 0.199, { outline: false, material: glow('#b388ff') });
    const ay = sy + 0.015;
    const stands: Array<[number, string, string]> = [[-0.55, '#1a1a1a', '#00b8d4'], [-0.4, '#a0522d', '#f48fb1'], [-0.25, '#5b3a1e', '#ff6f00']];
    for (const [ax, hair, shirt] of stands) {
      part(g, rbox(0.08, 0.012, 0.05, 0.004), '#e0f7fa', ax, ay + 0.006, z + 0.1);
      const s = new THREE.Mesh(box(0.07, 0.15, 0.004), ACRYLIC);
      s.position.set(ax, ay + 0.087, z + 0.1);
      g.add(s);
      sheet(g, acrylicTex(hair, shirt), 0.065, 0.13, ax, ay + 0.087, z + 0.103);
    }
    bee(g, 0.05, ay, z + 0.1, 0.2, 0.2);
    const pf = frame(g, 0.45, ay + 0.15, z + 0.06, -0.1, -0.12);
    part(pf, rbox(0.22, 0.29, 0.02, 0.008), '#1d1e22', 0, 0, 0);
    sheet(pf, plaqueTex(), 0.19, 0.25, 0, 0, 0.011);
    part(g, rbox(0.1, 0.02, 0.06, 0.006), '#1d1e22', 0.45, ay + 0.01, z + 0.11);
  },

  /**
   * The ASMR talk booth (ASMR 토크 부스): a nook lined with grey foam wedges, a string of warm fairy
   * lights across the top and a 'ASMR · 쉿! 녹음 중' sign that light up on air; a fluffy rug, a low
   * table with the dummy-head binaural mic (a pale head with two ears on a stand), the triggers laid
   * out on a tray (a wooden comb, a soft brush, a jar of slime, a square of bubble wrap, a bar of soap,
   * a wooden block), a salt lamp glowing, a tablet with the chat; a round velvet chair. Sat leant in to
   * the head, a soft brush going slowly round one ear and then the other, whispering.
   */
  stAsmrBooth(g, W, D, _c, _def, _ctx, out) {
    const iw = Math.min(W - 0.1, 1.86);
    const bz = -D / 2 + 0.03;
    const ph = 1.75;
    const sd = 0.7;
    const use = inUse(g, out);
    const shell = '#6d5a73';
    // The shell and the foam.
    part(g, rbox(iw, ph, 0.05, 0.02), shell, 0, ph / 2, bz + 0.025);
    for (const sx of [-1, 1]) part(g, rbox(0.05, ph, sd, 0.02), shell, sx * (iw / 2 - 0.025), ph / 2, bz + sd / 2);
    part(g, rbox(iw, 0.05, sd, 0.02), shade(shell, 0.85), 0, ph, bz + sd / 2);
    for (let r = 0; r < 5; r++) {
      for (let k = 0; k < 9; k++) {
        const fx = -iw / 2 + 0.12 + k * ((iw - 0.24) / 8);
        part(g, cone(0.07, 0.06, 4), r % 2 === k % 2 ? '#8e8a93' : '#7c7882', fx, 0.55 + r * 0.22, bz + 0.08, { rx: Math.PI / 2, ry: Math.PI / 4, outline: false });
      }
    }
    // The fairy lights, sagging across the top.
    for (let i = 0; i < 13; i++) {
      const u = i / 12;
      const fx = -iw / 2 + 0.08 + u * (iw - 0.16);
      const fy = ph - 0.1 - 0.12 * Math.sin(u * Math.PI);
      part(g, ball(0.012), '#d9c9a0', fx, fy, bz + 0.12, { outline: false });
      part(use, ball(0.014), '#ffe082', fx, fy, bz + 0.121, { outline: false, material: glow(i % 3 ? '#ffe9a8' : '#ffd180') });
    }
    label(g, 'ASMR · 쉿! 녹음 중', 0.44, 0.08, 0, ph - 0.3, bz + 0.12, '#3b3140', '#6b5f70');
    label(use, 'ASMR · 쉿! 녹음 중', 0.44, 0.08, 0, ph - 0.3, bz + 0.122, '#3b3140', '#ffd180');
    // The rug.
    part(g, cyl(0.62, 0.62, 0.015, 28), '#efe6dc', 0, 0.008, 0.02, { outline: false }).scale.set(1.2, 1, 0.75);
    // The low table and the dummy head on its stand.
    const tz = bz + 0.32;
    const th = 0.68;
    part(g, rbox(0.62, 0.035, 0.36, 0.015), '#c19a6b', 0, th, tz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.012, th - 0.02, 8), '#8d6e63', sx * 0.27, (th - 0.02) / 2, tz + sz * 0.14, { outline: false });
    const ty = th + 0.018;
    const hy = ty + 0.38;
    part(g, cyl(0.06, 0.07, 0.015, 16), BLACK, 0, ty + 0.008, tz - 0.04, { outline: false });
    part(g, cyl(0.01, 0.01, 0.24, 8), '#3a3c44', 0, ty + 0.12, tz - 0.04, { outline: false });
    part(g, cyl(0.035, 0.05, 0.08, 14), '#e8dcd2', 0, hy - 0.15, tz - 0.04);
    const head = part(g, ball(0.1), '#f1e4d8', 0, hy, tz - 0.04);
    head.scale.set(0.85, 1.1, 1);
    for (const sx of [-1, 1]) {
      part(g, ball(0.03), '#ead8c8', sx * 0.09, hy - 0.005, tz - 0.04).scale.set(0.5, 1, 0.75);
      part(g, cyl(0.008, 0.008, 0.01, 10), '#3a3c44', sx * 0.105, hy - 0.005, tz - 0.04, { rz: Math.PI / 2, outline: false });
    }
    part(g, box(0.03, 0.006, 0.006), '#d7c0ad', 0, hy - 0.02, tz + 0.055, { outline: false });
    rod(g, new THREE.Vector3(0, hy - 0.15, tz - 0.08), new THREE.Vector3(0.2, ty, tz - 0.14), 0.005, BLACK);
    part(use, ball(0.006), '#ff1744', 0.03, ty + 0.012, tz + 0.02, { outline: false, material: glow('#ff1744') });
    // The triggers on a tray.
    const trx = -0.2;
    const trz = tz + 0.06;
    part(g, rbox(0.2, 0.015, 0.18, 0.006), '#d7ccc8', trx, ty + 0.008, trz);
    part(g, box(0.1, 0.006, 0.025), '#a1887f', trx - 0.03, ty + 0.02, trz - 0.05, { ry: 0.2 });
    for (let i = 0; i < 8; i++) part(g, box(0.004, 0.006, 0.015), '#a1887f', trx - 0.07 + i * 0.011, ty + 0.02, trz - 0.035, { ry: 0.2, outline: false });
    part(g, cyl(0.004, 0.004, 0.1, 6), '#212121', trx + 0.05, ty + 0.02, trz - 0.02, { rz: Math.PI / 2, ry: 0.5, outline: false });
    part(g, ball(0.015), '#f8bbd0', trx + 0.095, ty + 0.02, trz - 0.045, { outline: false }).scale.set(1.4, 0.7, 1);
    part(g, cyl(0.025, 0.025, 0.04, 14), '#b3e5fc', trx - 0.05, ty + 0.035, trz + 0.04);
    part(g, cyl(0.022, 0.022, 0.006, 14), '#80deea', trx - 0.05, ty + 0.055, trz + 0.04, { outline: false });
    part(g, box(0.05, 0.004, 0.05), '#e1f5fe', trx + 0.03, ty + 0.018, trz + 0.05, { ry: 0.3, outline: false });
    part(g, rbox(0.04, 0.02, 0.03, 0.008), '#fff9c4', trx + 0.07, ty + 0.025, trz + 0.03);
    part(g, rbox(0.035, 0.035, 0.035, 0.004), '#d7a86e', 0.22, ty + 0.0175, tz + 0.1);
    // The salt lamp and the tablet with the chat.
    part(g, cyl(0.04, 0.045, 0.02, 12), '#5d4037', 0.22, ty + 0.01, tz - 0.08);
    const lamp = part(g, ball(0.055), '#ffab91', 0.22, ty + 0.07, tz - 0.08);
    lamp.scale.set(1, 1.2, 0.9);
    part(use, ball(0.056), '#ffab91', 0.22, ty + 0.07, tz - 0.08, { outline: false, material: glow('#ffccbc') }).scale.set(1, 1.2, 0.9);
    const tab = frame(g, -0.33, ty + 0.1, tz - 0.06, 0.4, -0.25);
    part(tab, rbox(0.14, 0.2, 0.012, 0.01), BLACK, 0, 0, 0);
    part(tab, box(0.125, 0.18, 0.002), '#16131c', 0, 0, 0.0065, { outline: false });
    const tabOn = frame(use, -0.33, ty + 0.1, tz - 0.06, 0.4, -0.25);
    const column = chatTex();
    sheet(tabOn, column, 0.125, 0.18, 0, 0, 0.008);
    part(g, rbox(0.06, 0.1, 0.05, 0.01), BLACK, -0.33, ty + 0.04, tz - 0.1);
    // The round velvet chair, facing the head.
    const sitZ = tz + 0.48;
    const c = frame(g, 0, 0, sitZ);
    part(c, cyl(0.2, 0.18, 0.03, 18), '#c9a227', 0, 0.015, 0, { outline: false });
    part(c, cyl(0.03, 0.03, 0.3, 10), '#c9a227', 0, 0.17, 0, { outline: false });
    part(c, cyl(0.27, 0.25, 0.12, 24), '#a1887f', 0, 0.38, 0);
    part(c, cyl(0.26, 0.26, 0.03, 24), '#bcaaa4', 0, 0.45, 0, { outline: false });
    part(c, ring(0.25, 0.07, Math.PI * 1.1), '#a1887f', 0, 0.55, 0, { rx: Math.PI / 2, rz: -0.05 * Math.PI });
    const work = marker(g, 0, hy, tz - 0.04);
    out.work = work;
    out.animate = (t) => {
      column.offset.y = -chatScroll(t);
    };
    out.spots = { '*': satAt(g, 0, sitZ, 'asmr', work, 0.47) };
  },

  /**
   * The merch shelf (굿즈 진열장): pastel shelving with the house's goods — 꿀벌이 plushes big and
   * small, acrylic stands of the three streamers, mugs and hoodies with the logo, keyrings on hooks,
   * a stack of photo cards — the 100,000-subscriber plaque on top, a lit strip under each shelf; a
   * packing counter at the front with a kraft box open on tissue, the order slip, the tape gun, flat
   * boxes and a thank-you postcard. Stood at the counter packing an order: a plush goes into the box
   * and the flaps fold in.
   */
  stMerchShelf(g, W, D, _c, _def, _ctx, out) {
    const sw = Math.min(W - 0.12, 1.8);
    const sd = 0.34;
    const sz = -D / 2 + sd / 2 + 0.03;
    const frameCol = '#fff3c4';
    const use = inUse(g, out);
    // The shelving: posts, the back, four shelves with strips.
    for (const sx of [-1, 1]) part(g, rbox(0.04, 1.95, sd, 0.01), frameCol, sx * (sw / 2 - 0.02), 0.975, sz);
    part(g, box(sw - 0.04, 1.1, 0.012), '#ffe0ec', 0, 1.4, sz - sd / 2 + 0.01, { outline: false });
    const shelves = [0.96, 1.3, 1.62, 1.94];
    for (const y of shelves) part(g, rbox(sw, 0.03, sd, 0.008), frameCol, 0, y, sz);
    for (const y of shelves.slice(1)) part(g, box(sw - 0.1, 0.005, 0.006), '#ffffff', 0, y - 0.02, sz + sd / 2 - 0.03, { outline: false, material: glow('#fff8e1') });
    // The counter in front of the lower part.
    const ch = 0.92;
    const cd = 0.5;
    const cz = sz + sd / 2 + cd / 2 - 0.16;
    part(g, rbox(sw, ch - 0.03, cd, 0.015), '#fafafa', 0, (ch - 0.03) / 2, cz);
    part(g, rbox(sw + 0.02, 0.035, cd + 0.02, 0.01), '#ffc928', 0, ch, cz);
    sheet(g, logoTex(), 0.5, 0.25, 0, 0.5, cz + cd / 2 + 0.002);
    const ty = ch + 0.018;
    // Shelf 1 (lowest above the counter): mugs and hoodies.
    const y1 = shelves[0] + 0.015;
    for (let i = 0; i < 4; i++) {
      const mx = -sw / 2 + 0.14 + i * 0.13;
      part(g, cyl(0.04, 0.04, 0.1, 14), i % 2 ? '#ffffff' : '#2b2118', mx, y1 + 0.05, sz + 0.02);
      part(g, ring(0.025, 0.007, Math.PI), i % 2 ? '#ffffff' : '#2b2118', mx + 0.045, y1 + 0.05, sz + 0.02, { rz: -Math.PI / 2, outline: false });
      part(g, ball(0.015), HONEY, mx, y1 + 0.06, sz + 0.061, { outline: false }).scale.set(1, 0.8, 0.3);
    }
    for (let i = 0; i < 3; i++) {
      const hx = 0.2 + i * 0.24;
      for (let k = 0; k < 3; k++) part(g, rbox(0.2, 0.05, 0.22, 0.02), ['#ffc928', '#f8bbd0', '#2b2118'][i], hx, y1 + 0.025 + k * 0.05, sz + 0.02);
      sheet(g, logoTex(), 0.12, 0.06, hx, y1 + 0.125, sz + 0.132);
    }
    // Shelf 2: plushes of 꿀벌이, big and small.
    const y2 = shelves[1] + 0.015;
    bee(g, -sw / 2 + 0.22, y2, sz, 0.26, 0.2);
    bee(g, -sw / 2 + 0.5, y2, sz + 0.03, 0.18, -0.1);
    bee(g, -sw / 2 + 0.7, y2, sz + 0.05, 0.13, 0.3);
    bee(g, 0.1, y2, sz, 0.22, -0.2);
    bee(g, 0.35, y2, sz + 0.04, 0.14, 0.1);
    bee(g, 0.55, y2, sz + 0.02, 0.2, -0.3);
    label(g, '꿀벌이 인형 · 25,000원', 0.34, 0.05, -sw / 2 + 0.4, y2 - 0.03, sz + sd / 2 + 0.002, '#ffffff', '#ad1457');
    // Shelf 3: acrylic stands, keyrings on hooks, photo cards.
    const y3 = shelves[2] + 0.015;
    const stands: Array<[string, string]> = [['#1a1a1a', '#00b8d4'], ['#a0522d', '#f48fb1'], ['#5b3a1e', '#ff6f00'], ['#1a1a1a', '#00b8d4'], ['#a0522d', '#f48fb1']];
    stands.forEach(([hair, shirt], i) => {
      const ax = -sw / 2 + 0.14 + i * 0.12;
      part(g, rbox(0.08, 0.012, 0.05, 0.004), '#e0f7fa', ax, y3 + 0.006, sz + 0.05);
      const s = new THREE.Mesh(box(0.07, 0.15, 0.004), ACRYLIC);
      s.position.set(ax, y3 + 0.087, sz + 0.05);
      g.add(s);
      sheet(g, acrylicTex(hair, shirt), 0.065, 0.13, ax, y3 + 0.087, sz + 0.053);
    });
    part(g, rbox(0.5, 0.012, 0.012, 0.004), CHROME, 0.4, y3 + 0.24, sz + 0.06);
    for (let i = 0; i < 6; i++) {
      const kx = 0.18 + i * 0.085;
      rod(g, new THREE.Vector3(kx, y3 + 0.24, sz + 0.06), new THREE.Vector3(kx, y3 + 0.17, sz + 0.07), 0.003, CHROME);
      if (i % 2) bee(g, kx, y3 + 0.1, sz + 0.07, 0.07, 0);
      else part(g, rbox(0.045, 0.06, 0.006, 0.004), [PINK, CYAN, HONEY][i / 2], kx, y3 + 0.14, sz + 0.07);
    }
    // The plaque and the shop sign on top.
    const pf = frame(g, 0, shelves[3] + 0.17, sz - 0.04, 0, -0.08);
    part(pf, rbox(0.24, 0.32, 0.02, 0.008), '#1d1e22', 0, 0, 0);
    sheet(pf, plaqueTex(), 0.21, 0.28, 0, 0, 0.011);
    label(g, '꿀잼 굿즈샵', 0.4, 0.09, -sw / 2 + 0.32, shelves[3] + 0.07, sz + 0.05, '#ff4fa3', '#ffffff');
    // On the counter: flat boxes, the tape gun, the order slip, the postcard, and the box being packed.
    for (let i = 0; i < 4; i++) part(g, box(0.34, 0.008, 0.26), '#c8a27a', sw / 2 - 0.25, ty + 0.004 + i * 0.009, cz - 0.04, { ry: i * 0.03 });
    const tg = frame(g, sw / 2 - 0.22, ty + 0.06, cz + 0.12, -0.4);
    part(tg, cyl(0.05, 0.05, 0.04, 16), '#8d6e63', 0, 0, 0, { rx: Math.PI / 2 });
    part(tg, rbox(0.03, 0.12, 0.03, 0.01), '#e53935', -0.03, -0.04, 0, { rz: 0.4 });
    part(g, box(0.1, 0.002, 0.14), '#ffffff', -sw / 2 + 0.25, ty + 0.002, cz + 0.05, { ry: 0.15, outline: false });
    label(g, '주문 #1042 · 꿀벌이 인형', 0.09, 0.016, -sw / 2 + 0.25, ty + 0.004, cz, 'none', '#424242', 0.15, -Math.PI / 2);
    part(g, box(0.12, 0.003, 0.08), '#fff59d', -sw / 2 + 0.42, ty + 0.002, cz + 0.12, { ry: -0.2, outline: false });
    label(g, '항상 고마워요 💛', 0.1, 0.02, -sw / 2 + 0.42, ty + 0.0045, cz + 0.12, 'none', '#ad1457', -0.2, -Math.PI / 2);
    const bx = -0.05;
    const bz2 = cz + 0.02;
    const bW = 0.3;
    const bD = 0.22;
    const bH = 0.14;
    part(g, box(bW, 0.006, bD), '#c8a27a', bx, ty + 0.003, bz2);
    for (const sx of [-1, 1]) part(g, box(0.006, bH, bD), '#c8a27a', bx + sx * (bW / 2), ty + bH / 2, bz2);
    for (const s2 of [-1, 1]) part(g, box(bW, bH, 0.006), '#c8a27a', bx, ty + bH / 2, bz2 + s2 * (bD / 2));
    part(g, box(bW - 0.02, 0.02, bD - 0.02), '#f8bbd0', bx, ty + bH - 0.03, bz2, { outline: false });
    // The flaps fold in while packing; a plush in the box.
    // Each flap hinged on its top edge, lying out over the side when open, folded flat over the box shut.
    const FLAP_OPEN = 1.2;
    const flaps: THREE.Object3D[] = [];
    for (const s2 of [-1, 1]) {
      const hinge = frame(g, bx, ty + bH, bz2 + s2 * (bD / 2), s2 > 0 ? 0 : Math.PI);
      part(hinge, box(bW, 0.004, bD / 2), '#c8a27a', 0, 0, bD / 4);
      flaps.push(hinge);
    }
    const inBox = frame(use, bx, ty + 0.02, bz2);
    bee(inBox, 0, 0, 0, 0.14, 0.5);
    const work = marker(g, bx, ty + bH, bz2);
    out.work = work;
    out.animate = (t) => {
      const u = (t / 6) % 1;
      const k = THREE.MathUtils.smoothstep(u, 0.45, 0.75) * (1 - THREE.MathUtils.smoothstep(u, 0.92, 1));
      for (const f of flaps) f.rotation.x = -FLAP_OPEN - k * (Math.PI - FLAP_OPEN - 0.03);
    };
    for (const f of flaps) f.rotation.x = -FLAP_OPEN;
    out.spots = { '*': stoodAt(g, bx, cz + cd / 2 + 0.28, 'tinker', work) };
  },

  /**
   * The collab camera set (합방 촬영 세트), facing the lounge sofa: a big ring light on its stand
   * with a camera in the middle, a phone clamped above it on the chat, a rolling cart beside with a
   * laptop on the collab's live picture, a second mic and a coiled cable taped down. Set up from
   * behind the camera: stood looking through it, framing the sofa.
   */
  stCollabCam(g, _W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const cz = 0.05;
    const h = 1.35;
    lightStand(g, 0, cz, h - 0.05, 0.22);
    part(g, ring(0.3, 0.035), '#e9e4d8', 0, h + 0.05, cz, { outline: false });
    part(use, ring(0.3, 0.03), '#fffdf0', 0, h + 0.05, cz + 0.01, { outline: false, material: glow('#fffdf0') });
    part(g, rbox(0.04, 0.3, 0.03, 0.006), BLACK, 0, h - 0.1, cz - 0.01);
    for (const a of [Math.PI / 2, -Math.PI / 2 + 0.6, -Math.PI / 2 - 0.6]) rod(g, new THREE.Vector3(0, h + 0.05, cz - 0.01), new THREE.Vector3(Math.cos(a) * 0.29, h + 0.05 + Math.sin(a) * 0.29, cz - 0.01), 0.006, BLACK);
    const cam = frame(g, 0, h + 0.03, cz + 0.03);
    camera(cam, frame(use, 0, h + 0.03, cz + 0.03));
    const ph = frame(g, 0, h + 0.2, cz + 0.02);
    part(ph, rbox(0.075, 0.15, 0.012, 0.008), BLACK, 0, 0, 0);
    part(ph, box(0.064, 0.13, 0.002), '#16131c', 0, 0, 0.007, { outline: false });
    const phOn = frame(use, 0, h + 0.2, cz + 0.02);
    sheet(phOn, chatHeadTex(), 0.064, 0.02, 0, 0.055, 0.0085);
    const column = chatTex();
    sheet(phOn, column, 0.064, 0.105, 0, -0.01, 0.0085);
    // The rolling cart on the right with the laptop, a mic, the cable.
    const kx = 0.34;
    const kz = -D / 2 + 0.24;
    for (const y of [0.15, 0.62]) part(g, rbox(0.34, 0.025, 0.3, 0.008), '#eceff1', kx, y, kz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      part(g, cyl(0.01, 0.01, 0.62, 8), '#9e9e9e', kx + sx * 0.15, 0.33, kz + sz * 0.13, { outline: false });
      part(g, ball(0.02), BLACK, kx + sx * 0.15, 0.02, kz + sz * 0.13, { outline: false });
    }
    part(g, rbox(0.28, 0.012, 0.19, 0.004), '#cfd8dc', kx, 0.64, kz + 0.03);
    const lid = frame(g, kx, 0.645, kz - 0.06, 0, -0.3);
    part(lid, rbox(0.28, 0.18, 0.01, 0.004), '#cfd8dc', 0, 0.09, 0);
    out.screen = screenOf(lid, collabTex(), 0.25, 0.155, 0, 0.09, 0.006);
    part(g, cyl(0.02, 0.022, 0.15, 12), '#37474f', kx - 0.1, 0.24, kz + 0.06, { rz: Math.PI / 2 });
    part(g, ring(0.05, 0.006), BLACK, kx + 0.06, 0.17, kz, { rx: Math.PI / 2, outline: false });
    part(g, box(0.008, 0.002, 0.5), BLACK, 0.12, 0.002, -0.1, { ry: 0.6, outline: false });
    part(g, box(0.05, 0.003, 0.08), '#ffc928', 0.12, 0.003, -0.1, { ry: 0.6, outline: false });
    const work = marker(g, 0, h + 0.03, cz - 0.03);
    out.work = work;
    out.animate = (t) => {
      column.offset.y = -chatScroll(t);
    };
    out.spots = { '*': stoodAt(g, -0.05, cz - 0.42, 'peer', work, 0) };
  },

  /**
   * The skit costume rack (콩트 의상 행거): a chrome garment rail on casters hung with the house's
   * costumes — a banana suit, a dinosaur onesie with its spikes, a superhero's red cape, a chef's
   * whites, a sparkly gold jacket — hats on the shelf above (a pirate's tricorn, a party cone, a
   * chef's toque), and at the end a little table with two wigs on foam heads (a rainbow afro, a
   * blonde bob), giant glasses and a moustache on a stick. Stood at the rail picking one out: the
   * hangers slide along under the hand.
   */
  stCostumeRack(g, W, D, _c, _def, _ctx, out) {
    const rw = Math.min(W - 0.6, 1.36);
    const rx = -0.22;
    const rz = -D / 2 + 0.3;
    const top = 1.62;
    for (const sx of [-1, 1]) {
      const x = rx + sx * rw / 2;
      part(g, cyl(0.016, 0.016, top, 10), CHROME, x, top / 2 + 0.06, rz, { outline: false });
      part(g, rbox(0.05, 0.03, 0.46, 0.01), CHROME, x, 0.07, rz);
      for (const sz of [-1, 1]) part(g, ball(0.03), BLACK, x, 0.03, rz + sz * 0.21, { outline: false });
    }
    part(g, cyl(0.014, 0.014, rw, 10), CHROME, rx, top, rz, { rz: Math.PI / 2, outline: false });
    part(g, rbox(rw, 0.02, 0.36, 0.006), '#cfd8dc', rx, top + 0.18, rz);
    for (const sx of [-1, 1]) part(g, cyl(0.01, 0.01, 0.18, 8), CHROME, rx + sx * (rw / 2 - 0.02), top + 0.09, rz, { outline: false });
    // The costumes on hangers, each its own group (they slide along in use).
    const hangers: THREE.Group[] = [];
    const hang = (x: number, make: (h: THREE.Group) => void) => {
      const h = frame(g, rx + x, top, rz);
      part(h, ring(0.012, 0.003, Math.PI * 1.4), CHROME, 0, 0.012, 0, { ry: Math.PI / 2, outline: false });
      part(h, box(0.006, 0.006, 0.3), '#8d6e63', 0, -0.04, 0, { ry: Math.PI / 2, outline: false });
      rod(h, new THREE.Vector3(0, -0.005, 0), new THREE.Vector3(0.15, -0.04, 0), 0.003, '#8d6e63');
      rod(h, new THREE.Vector3(0, -0.005, 0), new THREE.Vector3(-0.15, -0.04, 0), 0.003, '#8d6e63');
      make(h);
      hangers.push(h);
    };
    // A banana suit.
    hang(-0.5, (h) => {
      const b = part(h, cyl(0.1, 0.07, 0.9, 14), '#ffe14d', 0, -0.52, 0, { rz: 0.12 });
      b.scale.set(1, 1, 0.75);
      part(h, cone(0.05, 0.12, 10), '#6d4c41', 0.06, -0.02, 0, { rz: -0.4, outline: false });
      part(h, ball(0.03), '#795548', -0.05, -0.98, 0, { outline: false });
    });
    // A dinosaur onesie with its spikes.
    hang(-0.26, (h) => {
      part(h, rbox(0.3, 0.75, 0.12, 0.05), '#66bb6a', 0, -0.45, 0);
      part(h, rbox(0.26, 0.3, 0.004, 0.04), '#c5e1a5', 0, -0.45, 0.062, { outline: false });
      for (let i = 0; i < 5; i++) part(h, cone(0.03, 0.06, 4), '#2e7d32', 0, -0.12 - i * 0.14, -0.07, { rx: -Math.PI / 2, outline: false });
      part(h, rbox(0.06, 0.4, 0.1, 0.03), '#66bb6a', 0.17, -0.4, 0, { rz: 0.15 });
    });
    // A superhero's red cape (and the blue suit under it).
    hang(-0.02, (h) => {
      part(h, rbox(0.28, 0.62, 0.08, 0.04), '#1e88e5', 0, -0.36, 0);
      part(h, box(0.32, 0.8, 0.012), '#e53935', 0, -0.45, -0.05);
      part(h, ball(0.04), '#ffd600', 0, -0.2, 0.042, { outline: false }).scale.set(1.2, 1, 0.3);
    });
    // A chef's whites.
    hang(0.22, (h) => {
      part(h, rbox(0.28, 0.6, 0.08, 0.04), '#fafafa', 0, -0.35, 0);
      for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) part(h, ball(0.01), '#424242', sx * 0.05, -0.15 - i * 0.1, 0.042, { outline: false });
    });
    // A sparkly gold jacket.
    hang(0.46, (h) => {
      part(h, rbox(0.28, 0.55, 0.08, 0.04), '#ffca28', 0, -0.32, 0);
      for (let i = 0; i < 8; i++) part(h, box(0.02, 0.02, 0.004), '#fff8e1', -0.1 + (i % 4) * 0.065, -0.15 - Math.floor(i / 4) * 0.25, 0.042, { outline: false, material: glow('#fff8e1') });
    });
    // The hats on the shelf.
    const sy = top + 0.19;
    part(g, cone(0.11, 0.08, 3), '#212121', rx - 0.4, sy + 0.04, rz, { ry: 0.2 });
    part(g, cone(0.06, 0.18, 12), '#ec407a', rx - 0.05, sy + 0.09, rz);
    part(g, ball(0.02), '#ffee58', rx - 0.05, sy + 0.185, rz, { outline: false });
    part(g, cyl(0.07, 0.06, 0.06, 14), '#fafafa', rx + 0.35, sy + 0.03, rz);
    part(g, ball(0.09), '#fafafa', rx + 0.35, sy + 0.11, rz).scale.set(1, 0.7, 1);
    // The little table at the right end with the wigs, the glasses, the moustache.
    const tx = W / 2 - 0.3;
    const tz = rz + 0.05;
    part(g, rbox(0.42, 0.03, 0.4, 0.01), '#f4f1ea', tx, 0.78, tz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.014, 0.77, 8), '#bdbdbd', tx + sx * 0.18, 0.385, tz + sz * 0.17, { outline: false });
    for (const [wx, col] of [[-0.1, 'rainbow'], [0.1, '#ffe082']] as Array<[number, string]>) {
      part(g, cyl(0.025, 0.035, 0.1, 10), '#eeeeee', tx + wx, 0.84, tz - 0.05);
      part(g, ball(0.07), '#eeeeee', tx + wx, 0.95, tz - 0.05);
      if (col === 'rainbow') {
        ['#e53935', '#ffb300', '#43a047', '#1e88e5', '#8e24aa'].forEach((c, i) => {
          const a = (i / 5) * Math.PI * 2;
          part(g, ball(0.06), c, tx + wx + Math.sin(a) * 0.05, 1.0 + (i % 2) * 0.02, tz - 0.05 + Math.cos(a) * 0.05);
        });
      } else {
        part(g, ball(0.08), col, tx + wx, 0.97, tz - 0.06).scale.set(1, 0.95, 1);
        part(g, box(0.16, 0.12, 0.03), col, tx + wx, 0.9, tz - 0.11);
      }
    }
    const gl = frame(g, tx - 0.05, 0.81, tz + 0.12, 0.3);
    for (const sx of [-1, 1]) part(gl, ring(0.04, 0.006), '#212121', sx * 0.045, 0, 0, { rx: -Math.PI / 2 + 0.3, outline: false });
    part(gl, box(0.02, 0.006, 0.006), '#212121', 0, 0.01, 0, { outline: false });
    part(g, cyl(0.004, 0.004, 0.16, 6), '#8d6e63', tx + 0.12, 0.8, tz + 0.12, { rz: Math.PI / 2, ry: -0.4, outline: false });
    part(g, ball(0.03), '#3e2723', tx + 0.05, 0.8, tz + 0.15, { outline: false }).scale.set(1.6, 0.5, 0.6);
    const base = hangers.map((h) => h.position.x);
    const work = marker(g, rx, 1.25, rz + 0.12);
    out.work = work;
    out.animate = (t) => {
      const u = (t / 5) % 1;
      const k = THREE.MathUtils.smoothstep(u, 0.1, 0.4) * (1 - THREE.MathUtils.smoothstep(u, 0.7, 0.95));
      hangers.forEach((h, i) => {
        h.position.x = base[i] + (i < 2 ? -0.08 : 0.08) * k;
        h.rotation.y = i === 2 ? 0.5 * k : 0;
      });
    };
    out.spots = { '*': stoodAt(g, rx, rz + 0.62, 'rummage', work) };
  },
};
