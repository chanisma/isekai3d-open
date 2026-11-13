import * as THREE from 'three';
import type { BarOffset, Motion } from '../activity';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, gradient, part, rbox, textured } from '../toon';
import { CHALLENGE_BEAT, challengeRound, eyesAt, phoneRound, selfieRound, smPhase, unboxRound, vlogRound } from './socialMediaMotion';

/**
 * The creator studio drawn as itself (2026-10-27 workplace pipeline, at the user's request): 모먼트랩
 * (MOMENT LAB), a Korean short-form · Instagram creator agency in pastels — kept apart from the
 * streaming house's gaming room (workplaces/streamer.ts), whose edit desk it shares. The content desk
 * with its pastel all-in-one showing the month's content calendar, a phone on a gimbal in a little
 * ring light and the storyboard notebook of 9:16 frames; the trend board of the week's viral shorts,
 * the hashtags on sticky notes, the rising sounds and the numbers on its TV; the live desk where the
 * phone films from a stand in a ring light and the comments run up the laptop while hearts float off
 * the phone; the photo wall of roses with its neon and balloon garland, a selfie taken at arm's length
 * and thumbnails pulled to the tripod's phone; and what it was missing (workFurniture/socialMedia.ts):
 * the shorts set where a dance challenge is danced on the mark and an info short told to the phone,
 * the captions popping where the hand points; the sponsor's unboxing table; the reaction wall; the
 * shelf of PR packages. The phone is drawn in the hand by the motions' own clock (socialMediaMotion.ts).
 */

const WHITE = '#fbf8f4';
const CREAM = '#fff4e6';
const LILAC = '#c9b6ff';
const LILAC_D = '#9d86e8';
const PINK = '#ffc1dc';
const HOT = '#ff5fa2';
const PEACH = '#ffd3bd';
const MINT = '#bdeedc';
const SKY = '#bfe3ff';
const GOLD = '#e2bd72';
const BLACK = '#2a2830';
const CHROME = '#e3e7ea';
const INK = '#3a3046';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const frac = (x: number) => ((x % 1) + 1) % 1;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);

/** Lit parts (LEDs, ring lights, neon): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
const ACRYLIC = new THREE.MeshToonMaterial({ color: '#f3fbff', transparent: true, opacity: 0.35, depthWrite: false });
const GLASS = new THREE.MeshToonMaterial({ color: '#ffe4ef', transparent: true, opacity: 0.55, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`smRing${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 32, arc));

/** Pictures painted once a key (screens, boards, labels); `ry` repeats it down (a column that scrolls). */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void, ry = 1): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint, 1, ry)));
  return t;
}
/** Lit-by-the-room painted faces (the rose wall, the paper sweep), one material a key. */
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
  const tex = painted(`smTag|${text}|${bg}|${fg}|${cw}`, cw, ch, (c) => {
    if (bg !== 'none') rounded(c, 0, 0, cw, ch, 10, bg);
    write(c, text, cw / 2, ch * 0.54, Math.round(ch * 0.58), fg, 'center', true, cw * 0.92);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A screen the lot lights while it's used (handed out as `out.screen`). */
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
function inUse(g: THREE.Object3D, out: Built): THREE.Group {
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  return use;
}
/** A spot sat at (x, z) facing `yaw` (π: back to the piece's front, at its desk), and what's done there. */
function satAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, seat = 0.48, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', x, seat, z, yaw, seat);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot stood at (x, z) facing `yaw` (π: at the piece, from its front), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work?: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
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
const phaseOf = (m: THREE.Object3D) => smPhase(m.getWorldPosition(tmp));
/** A holder in the in-use group that stands where a spot is (so what's in the hand goes when the use does). */
function holder(use: THREE.Object3D, s: Spot): THREE.Group {
  const h = new THREE.Group();
  use.add(h);
  h.position.copy(s.at.position);
  h.rotation.copy(s.at.rotation);
  return h;
}

// ---- Small things ----

interface Phone {
  root: THREE.Group;
  screen: THREE.Mesh;
}
/**
 * A phone in its pastel case, upright, its screen to +z (a painted app on it, or dark), the triple
 * camera on its back; its middle at the origin of its own group in `g`.
 */
function phone(g: THREE.Object3D, tex: THREE.Texture | null, caseColor = LILAC): Phone {
  const root = new THREE.Group();
  g.add(root);
  part(root, rbox(0.074, 0.152, 0.009, 0.008), caseColor, 0, 0, 0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial(tex ? { map: tex } : { color: '#30303a' }));
  screen.userData.ownGeometry = screen.userData.ownMaterial = true;
  screen.position.z = 0.0048;
  root.add(screen);
  part(root, rbox(0.032, 0.034, 0.004, 0.006), '#3a3840', 0.015, 0.048, -0.006, { outline: false });
  for (const [cx, cy] of [[0.008, 0.056], [0.008, 0.04], [0.022, 0.048]]) part(root, cyl(0.0055, 0.0055, 0.003, 10), '#15151a', cx, cy, -0.0085, { rx: Math.PI / 2, outline: false });
  return { root, screen };
}
/** Puts a phone held in a creator's hand (`o` in their frame, from the holder) and turns its screen to their eyes. */
function placePhone(p: THREE.Object3D, o: BarOffset, hold: THREE.Object3D, H: number, sitting: boolean) {
  p.position.set(o.side, o.up, o.ahead);
  const eye = eyesAt(H, sitting);
  hold.updateWorldMatrix(true, false);
  p.lookAt(hold.localToWorld(tmp.set(eye.side, eye.up, eye.ahead)));
}

/** A light stand (three legs, a pole) up to `h` at (x, z). */
function lightStand(g: THREE.Object3D, x: number, z: number, h: number, spread = 0.2, color = BLACK) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, V(x, 0.3, z), V(x + Math.sin(a) * spread, 0.01, z + Math.cos(a) * spread), 0.01, color);
  }
  part(g, cyl(0.013, 0.013, h - 0.28, 8), color, x, 0.28 + (h - 0.28) / 2, z, { outline: false });
  part(g, cyl(0.02, 0.02, 0.05, 8), '#4a4852', x, 0.31, z, { outline: false });
}
/** A ring light facing +z in its own group (its middle at the origin): the white ring, lit while used. */
function ringLight(g: THREE.Object3D, use: THREE.Object3D, r: number) {
  part(g, ring(r, r * 0.09), '#efeae2', 0, 0, 0, { outline: false });
  part(g, ring(r, r * 0.04), '#cfc8bc', 0, 0, -r * 0.06, { outline: false });
  part(use, ring(r, r * 0.08), '#fffaf0', 0, 0, r * 0.012, { outline: false, material: glow('#fffbf2') });
}
/** A pastel swivel chair facing +z in its own group, its seat `h` up: a round cushion, a shell back. */
function pastelChair(c: THREE.Object3D, h: number, seat: string, back: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, V(0, 0.08, 0), V(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, WHITE);
    part(c, ball(0.024), '#d9d4cc', Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.022, 0.022, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, cyl(0.235, 0.225, 0.07, 24), seat, 0, h + 0.015, 0);
  part(c, rbox(0.46, 0.36, 0.06, 0.03), back, 0, h + 0.26, -0.2, { rx: -0.12 });
  part(c, cyl(0.032, 0.032, 0.46, 12), back, 0, h + 0.44, -0.22, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) part(c, rbox(0.05, 0.03, 0.24, 0.014), back, sx * 0.24, h + 0.17, -0.04);
}
/** A plastic iced latte with its straw at (x, y, z). */
function icedLatte(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.027, 0.023, 0.07, 14), '#c89f7a', x, y + 0.036, z, { outline: false });
  part(g, cyl(0.027, 0.027, 0.025, 14), '#f3e3cf', x, y + 0.083, z, { outline: false });
  const cup = new THREE.Mesh(cyl(0.034, 0.028, 0.12, 16), ACRYLIC);
  cup.position.set(x, y + 0.06, z);
  g.add(cup);
  part(g, cyl(0.036, 0.036, 0.008, 16), '#f5f5f5', x, y + 0.124, z, { outline: false });
  rod(g, V(x + 0.005, y + 0.03, z), V(x + 0.016, y + 0.19, z - 0.01), 0.005, '#8bd3a8');
}
/** A heart picture (for the hearts that float up off a phone). */
const heartTex = (col: string) =>
  painted(`smHeart|${col}`, 64, 64, (c) => {
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(32, 56);
    c.bezierCurveTo(4, 36, 6, 8, 32, 20);
    c.bezierCurveTo(58, 8, 60, 36, 32, 56);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath();
    c.ellipse(20, 22, 6, 4, -0.6, 0, Math.PI * 2);
    c.fill();
  });
/** Hearts floating up from (x, y, z) in `use` while it's watched: returns what moves them at `t`, `rate` how fast. */
function hearts(use: THREE.Object3D, n: number, x: number, y: number, z: number, rise: number, size = 0.07) {
  const cols = [HOT, '#ff8fb8', '#ff6f91', '#ffb3d1', '#ff4f8b'];
  const list = Array.from({ length: n }, (_, i) => sheet(use, heartTex(cols[i % cols.length]), size, size, x, y, z));
  return (t: number, rate: number) => {
    list.forEach((m, i) => {
      const u = frac(t * rate * 0.35 + i / n);
      m.position.set(x + 0.06 * Math.sin(u * 6 + i * 1.7) + (i % 2 ? 0.03 : -0.03), y + u * rise, z + 0.01 * i);
      m.scale.setScalar(0.6 + 0.6 * Math.min(1, u * 4));
      (m.material as THREE.MeshBasicMaterial).opacity = 1 - THREE.MathUtils.smoothstep(u, 0.6, 1);
    });
  };
}

// ---- Pictures ----

/** A short's thumbnail (9:16) at (x, y), `w` wide, scene `i` of ten, the views under it. */
function shortThumb(c: CanvasRenderingContext2D, x: number, y: number, w: number, i: number, views: string, cap: string) {
  const h = w * (16 / 9);
  const bgs: Array<[string, string]> = [
    ['#ffb3d1', '#ffd9c2'], ['#bfe3ff', '#e8dcff'], ['#ffe08a', '#ffb98a'], ['#bdeedc', '#bfe3ff'], ['#d9c7ff', '#ffc1dc'],
    ['#ffcfb8', '#ffe8a3'], ['#c7f0ff', '#d5ffd9'], ['#ffd1e8', '#ffe9f2'], ['#e0d4ff', '#c8e7ff'], ['#ffe2c6', '#ffc7c7'],
  ];
  const [a, b] = bgs[i % bgs.length];
  const gr = c.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, a);
  gr.addColorStop(1, b);
  c.save();
  c.beginPath();
  c.roundRect(x, y, w, h, 8);
  c.clip();
  c.fillStyle = gr;
  c.fillRect(x, y, w, h);
  const cx = x + w / 2;
  const fy = y + h * 0.55;
  const skin = ['#f8d9c0', '#eac09a', '#f3cfb3'][i % 3];
  const hair = ['#2b1b10', '#5b3a1e', '#1a1a1a', '#a0522d'][i % 4];
  const kind = i % 5;
  if (kind === 1) {
    // Food: a bowl of 마라탕 steaming.
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(cx, fy + 10, w * 0.36, w * 0.14, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e64a19';
    c.beginPath();
    c.ellipse(cx, fy + 6, w * 0.3, w * 0.09, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 2;
    for (const dx of [-8, 0, 8]) {
      c.beginPath();
      c.moveTo(cx + dx, fy - 6);
      c.quadraticCurveTo(cx + dx + 6, fy - 20, cx + dx, fy - 32);
      c.stroke();
    }
  } else if (kind === 3) {
    // A cat in a box.
    c.fillStyle = '#c69c6d';
    c.fillRect(cx - w * 0.3, fy, w * 0.6, w * 0.4);
    c.fillStyle = '#f5a623';
    c.beginPath();
    c.arc(cx, fy - 4, w * 0.18, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(cx - w * 0.16, fy - 10);
    c.lineTo(cx - w * 0.12, fy - w * 0.3);
    c.lineTo(cx - w * 0.03, fy - w * 0.16);
    c.moveTo(cx + w * 0.16, fy - 10);
    c.lineTo(cx + w * 0.12, fy - w * 0.3);
    c.lineTo(cx + w * 0.03, fy - w * 0.16);
    c.fill();
    c.fillStyle = '#2b1b10';
    c.fillRect(cx - 7, fy - 7, 3, 3);
    c.fillRect(cx + 4, fy - 7, 3, 3);
  } else {
    // Someone: dancing (arms up), an outfit, a workout, a make-up close-up.
    c.fillStyle = ['#ffffff', '', '#7e57c2', '', '#ff5fa2'][kind] || '#ffffff';
    c.fillRect(cx - w * 0.15, fy - w * 0.12, w * 0.3, w * 0.48);
    c.fillStyle = skin;
    c.beginPath();
    c.arc(cx, fy - w * 0.25, w * 0.13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = hair;
    c.beginPath();
    c.arc(cx, fy - w * 0.29, w * 0.14, Math.PI, Math.PI * 2);
    c.fill();
    c.strokeStyle = skin;
    c.lineWidth = w * 0.06;
    c.lineCap = 'round';
    c.beginPath();
    if (kind === 0) {
      c.moveTo(cx - w * 0.14, fy - w * 0.08);
      c.lineTo(cx - w * 0.32, fy - w * 0.42);
      c.moveTo(cx + w * 0.14, fy - w * 0.08);
      c.lineTo(cx + w * 0.34, fy - w * 0.2);
    } else {
      c.moveTo(cx - w * 0.14, fy - w * 0.08);
      c.lineTo(cx - w * 0.2, fy + w * 0.2);
      c.moveTo(cx + w * 0.14, fy - w * 0.08);
      c.lineTo(cx + w * 0.22, fy + w * 0.18);
    }
    c.stroke();
    c.fillStyle = '#5c6bc0';
    c.fillRect(cx - w * 0.14, fy + w * 0.36, w * 0.11, w * 0.3);
    c.fillRect(cx + w * 0.03, fy + w * 0.36, w * 0.11, w * 0.3);
  }
  // The hook caption on top, the views at the bottom.
  rounded(c, x + 4, y + h * 0.12, w - 8, 18, 4, 'rgba(255,255,255,0.92)');
  write(c, cap, cx, y + h * 0.12 + 9.5, 11, INK, 'center', true, w - 12);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(x, y + h - 20, w, 20);
  write(c, `▶ ${views}`, x + 6, y + h - 10, 11, '#ffffff', 'left');
  c.restore();
}

/** The content calendar on the desk's all-in-one: the month's posts by kind, today ringed. */
const calendarTex = () =>
  painted('smCalendar', 384, 216, (c) => {
    c.fillStyle = '#fffaf6';
    c.fillRect(0, 0, 384, 216);
    c.fillStyle = LILAC_D;
    c.fillRect(0, 0, 384, 24);
    write(c, '📅 11월 콘텐츠 캘린더', 8, 12, 12, '#ffffff');
    write(c, 'MOMENT LAB', 376, 12, 10, '#ffffff', 'right');
    const kinds: Array<[string, string]> = [['릴스', '#ff8fb8'], ['피드', '#7fd6b0'], ['스토리', '#7cc0f5'], ['라이브', '#ffad7a']];
    kinds.forEach(([k, col], i) => {
      rounded(c, 8 + i * 58, 29, 52, 12, 6, col);
      write(c, k, 34 + i * 58, 35.5, 8, '#ffffff', 'center');
    });
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    days.forEach((d, i) => write(c, d, 26 + i * 53, 50, 9, i > 4 ? '#e53935' : '#6d6475', 'center'));
    const posts = ['챌린지', 'OOTD', '협찬', '라이브', 'Q&A', '브이로그', '먹방', '꿀팁', '언박싱', '리뷰'];
    for (let w = 0; w < 4; w++)
      for (let d = 0; d < 7; d++) {
        const x = 3 + d * 53;
        const y = 58 + w * 39;
        const n = w * 7 + d + 1;
        rounded(c, x, y, 50, 36, 4, n === 13 ? '#f1ebff' : '#ffffff');
        c.strokeStyle = n === 13 ? LILAC_D : '#eee6f0';
        c.lineWidth = n === 13 ? 2 : 1;
        c.strokeRect(x + 0.5, y + 0.5, 49, 35);
        write(c, String(n), x + 4, y + 7, 8, '#8a8293', 'left', false);
        const k = (n * 7) % 5;
        if (k < 4) {
          rounded(c, x + 3, y + 14, 44, 9, 4, kinds[k][1]);
          write(c, posts[n % posts.length], x + 25, y + 18.8, 7, '#ffffff', 'center', true, 42);
        }
        if (n % 3 === 0) {
          rounded(c, x + 3, y + 25, 44, 9, 4, kinds[(k + 1) % 4][1]);
          write(c, posts[(n + 3) % posts.length], x + 25, y + 29.8, 7, '#ffffff', 'center', true, 42);
        }
      }
  });
/** A press release being written on the desk's screen. */
const pressTex = () =>
  painted('smPress', 384, 216, (c) => {
    c.fillStyle = '#eceaf0';
    c.fillRect(0, 0, 384, 216);
    c.fillStyle = '#ffffff';
    c.fillRect(70, 8, 244, 208);
    write(c, '[보도자료]', 84, 24, 10, '#e53935');
    write(c, '모먼트랩, 숏폼 챌린지', 84, 44, 15, INK);
    write(c, '누적 조회수 1,000만 돌파', 84, 64, 15, INK);
    write(c, '2026. 11. 13 · 배포 즉시 보도 가능', 84, 82, 8, '#8a8293', 'left', false);
    for (let i = 0; i < 9; i++) {
      c.fillStyle = '#d9d4df';
      c.fillRect(84, 96 + i * 11, i === 8 ? 120 : 214 - (i % 3) * 14, 4);
    }
    c.fillStyle = LILAC_D;
    c.fillRect(84 + 120, 184, 2, 10);
    write(c, 'MOMENT LAB', 300, 205, 8, LILAC_D, 'right');
  });
/** The upload slots for the week across the platforms. */
const scheduleTex = () =>
  painted('smSchedule', 384, 216, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 384, 216);
    c.fillStyle = '#ff8fb8';
    c.fillRect(0, 0, 384, 24);
    write(c, '🗓 채널 업로드 일정 · 이번 주', 8, 12, 12, '#ffffff');
    const plats: Array<[string, string]> = [['릴스', '#ff5fa2'], ['쇼츠', '#e53935'], ['틱톡', '#212121'], ['스토리', '#7cc0f5']];
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    days.forEach((d, i) => write(c, d, 86 + i * 42, 36, 9, '#6d6475', 'center'));
    plats.forEach(([p, col], r) => {
      const y = 48 + r * 40;
      rounded(c, 6, y, 54, 30, 6, col);
      write(c, p, 33, y + 15, 10, '#ffffff', 'center');
      for (let d = 0; d < 7; d++) {
        if ((d + r * 2) % 3 === 2) continue;
        rounded(c, 66 + d * 42, y + 4, 38, 22, 5, '#f6f1ff');
        write(c, ['19:00', '21:00', '12:30', '18:00'][(d + r) % 4], 85 + d * 42, y + 15, 8, INK, 'center');
      }
    });
    write(c, '✔ 썸네일 3일 전 확정 · 해시태그 5개 이하', 8, 208, 9, LILAC_D);
  });
/** The comments inbox open on the desk's screen while replying. */
const inboxTex = () =>
  painted('smInbox', 384, 216, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 384, 216);
    c.fillStyle = '#f6f1ff';
    c.fillRect(0, 0, 120, 216);
    write(c, '💬 댓글 관리', 10, 16, 12, INK);
    ['전체 1,284', '답글 필요 36', '고정 댓글', '숨김 처리'].forEach((s, i) => {
      if (i === 1) rounded(c, 6, 30 + i * 24, 108, 20, 6, PINK);
      write(c, s, 14, 40 + i * 24, 10, INK, 'left', i === 1);
    });
    COMMENTS.slice(0, 7).forEach(([n, col, m], i) => {
      const y = 14 + i * 28;
      c.fillStyle = col;
      c.beginPath();
      c.arc(140, y + 6, 9, 0, Math.PI * 2);
      c.fill();
      write(c, n, 156, y + 1, 9, INK);
      write(c, m, 156, y + 13, 9, '#555', 'left', false, 200);
      write(c, '♡', 370, y + 6, 11, '#ff5fa2', 'right');
    });
  });

type Comment = [string, string, string];
const COMMENTS: Comment[] = [
  ['daily_yuna', '#ffb3d1', '언니 이거 어디꺼예요?? 😍'],
  ['mintchoco', '#bdeedc', 'ㅋㅋㅋ 마지막 표정 미쳤다'],
  ['seoul_cat', '#bfe3ff', '저장각 📌 따라해볼게요'],
  ['hoya.0712', '#ffd3bd', '챌린지 2탄 해주세요!!'],
  ['jjin_vlog', '#c9b6ff', '노래 제목 알려주세요 🎵'],
  ['bori_mom', '#ffe08a', '오늘도 힐링하고 가요 💕'],
  ['run_dami', '#b2ebf2', '첫 댓글!! 🏆'],
  ['studywith_j', '#e1bee7', '꿀팁 진짜 유용해요 👏'],
  ['ootd_hana', '#ffccbc', '코디 정보 부탁드려요 🙏'],
  ['peach_peach', '#ffc1dc', '알고리즘이 저를 여기로…'],
];
const COMMENT_LINES = 24;
/** A column of comments (it wraps round, so it scrolls for ever): a 40% window shown. */
const commentsTex = () =>
  painted(
    'smComments',
    128,
    24 * COMMENT_LINES,
    (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 128, 24 * COMMENT_LINES);
      for (let i = 0; i < COMMENT_LINES; i++) {
        const [n, col, m] = COMMENTS[(i * 3) % COMMENTS.length];
        const y = i * 24;
        c.fillStyle = col;
        c.beginPath();
        c.arc(9, y + 12, 6, 0, Math.PI * 2);
        c.fill();
        write(c, n, 19, y + 7, 7, INK);
        write(c, m, 19, y + 17, 7, '#555', 'left', false, 104);
      }
    },
    0.4,
  );
const commentScroll = (t: number) => {
  const s = t * 0.9;
  const n = Math.floor(s);
  return (n + THREE.MathUtils.smoothstep(s - n, 0.7, 1)) / COMMENT_LINES;
};

/** A phone's comments open (replying): the post's comments, the reply box. */
const feedTex = () =>
  painted('smFeed', 90, 192, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 90, 192);
    write(c, '댓글 1,284', 45, 10, 8, INK, 'center');
    c.fillStyle = '#eee';
    c.fillRect(0, 18, 90, 1);
    COMMENTS.slice(0, 6).forEach(([n, col, m], i) => {
      const y = 24 + i * 25;
      c.fillStyle = col;
      c.beginPath();
      c.arc(9, y + 7, 6, 0, Math.PI * 2);
      c.fill();
      write(c, n, 18, y + 3, 6, INK);
      write(c, m, 18, y + 12, 6, '#555', 'left', false, 66);
      write(c, '♡', 86, y + 7, 7, HOT, 'right');
    });
    rounded(c, 4, 172, 82, 14, 7, '#f3eef8');
    write(c, '답글 달기...', 10, 179, 6, '#999', 'left', false);
  });
/** A phone's camera in selfie mode: a pastel blur, a face in the frame, the shutter. */
const selfieCamTex = () =>
  painted('smSelfieCam', 90, 192, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 192);
    gr.addColorStop(0, '#ffd1e3');
    gr.addColorStop(1, '#e3d4ff');
    c.fillStyle = gr;
    c.fillRect(0, 0, 90, 192);
    c.fillStyle = '#f8d9c0';
    c.beginPath();
    c.arc(45, 84, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3a2a22';
    c.beginPath();
    c.arc(45, 78, 22, Math.PI, Math.PI * 2);
    c.fill();
    c.fillRect(23, 78, 6, 30);
    c.fillRect(61, 78, 6, 30);
    c.fillStyle = '#ff8fb8';
    c.fillRect(25, 104, 40, 40);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.strokeRect(22, 58, 46, 52);
    write(c, '인물 · 1x', 45, 154, 7, '#ffffff', 'center');
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(45, 174, 10, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(45, 174, 13, 0, Math.PI * 2);
    c.stroke();
  });
/** A phone recording a short: the frame, the red ring, the timer, the side tools. */
const recTex = (key: string, bgA: string, bgB: string) =>
  painted(`smRec|${key}`, 90, 192, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 192);
    gr.addColorStop(0, bgA);
    gr.addColorStop(1, bgB);
    c.fillStyle = gr;
    c.fillRect(0, 0, 90, 192);
    // Someone on the mark, arms up.
    c.fillStyle = '#f8d9c0';
    c.beginPath();
    c.arc(45, 70, 11, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2b1b10';
    c.beginPath();
    c.arc(45, 67, 12, Math.PI, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.fillRect(36, 82, 18, 30);
    c.fillStyle = '#7986cb';
    c.fillRect(37, 112, 7, 28);
    c.fillRect(46, 112, 7, 28);
    c.strokeStyle = '#f8d9c0';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(37, 86);
    c.lineTo(24, 64);
    c.moveTo(53, 86);
    c.lineTo(66, 70);
    c.stroke();
    rounded(c, 30, 8, 30, 12, 6, 'rgba(0,0,0,0.35)');
    write(c, '0:12', 45, 14.5, 7, '#ffffff', 'center');
    ['♪', '⏱', '✨'].forEach((s, i) => write(c, s, 82, 40 + i * 18, 9, '#ffffff', 'center'));
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(45, 172, 12, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#ff3b5c';
    c.beginPath();
    c.arc(45, 172, 8, 0, Math.PI * 2);
    c.fill();
  });
/** A rival channel's profile scrolled through on the phone (benchmarking). */
const rivalTex = () =>
  painted('smRival', 90, 192, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 90, 192);
    c.fillStyle = '#ffd3bd';
    c.beginPath();
    c.arc(18, 22, 12, 0, Math.PI * 2);
    c.fill();
    write(c, '@daily.moment', 35, 15, 7, INK);
    write(c, '팔로워 52.1만', 35, 27, 7, '#555', 'left', false);
    rounded(c, 4, 40, 82, 12, 4, '#f1ebff');
    write(c, '팔로우', 45, 46.5, 7, LILAC_D, 'center');
    for (let i = 0; i < 9; i++) {
      const x = 2 + (i % 3) * 29.5;
      const y = 58 + Math.floor(i / 3) * 44;
      c.fillStyle = ['#ffb3d1', '#bfe3ff', '#ffe08a', '#bdeedc', '#d9c7ff', '#ffcfb8', '#c7f0ff', '#ffd1e8', '#e0d4ff'][i];
      c.fillRect(x, y, 28, 42);
      write(c, `▶${[48, 12, 210, 33, 7, 95, 18, 61, 140][i]}만`, x + 2, y + 36, 6, '#ffffff');
    }
  });
/** The phone filming the live desk: the creator in frame, LIVE and the count, comments over it. */
const liveTex = () =>
  painted('smLive', 90, 192, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 192);
    gr.addColorStop(0, '#ffe0ec');
    gr.addColorStop(1, '#ffd3bd');
    c.fillStyle = gr;
    c.fillRect(0, 0, 90, 192);
    c.fillStyle = '#f8d9c0';
    c.beginPath();
    c.arc(45, 78, 18, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#4a2c20';
    c.beginPath();
    c.arc(45, 73, 20, Math.PI, Math.PI * 2);
    c.fill();
    c.fillStyle = '#bdeedc';
    c.fillRect(22, 96, 46, 40);
    rounded(c, 4, 4, 24, 11, 3, '#ff3b5c');
    write(c, 'LIVE', 16, 10, 7, '#ffffff', 'center');
    rounded(c, 30, 4, 32, 11, 3, 'rgba(0,0,0,0.35)');
    write(c, '👁 2,481', 46, 10, 6, '#ffffff', 'center');
    COMMENTS.slice(2, 6).forEach(([n, , m], i) => {
      write(c, n, 4, 142 + i * 12, 5, '#ffffff');
      write(c, m, 36, 142 + i * 12, 5, '#ffffff', 'left', false, 50);
    });
    write(c, '💗', 82, 184, 9, '#ff3b5c', 'center');
  });

// ---- The pieces ----

export const BUILDERS: Record<string, Builder> = {
  /**
   * A content desk (콘텐츠 책상): a white top on gold hairpin legs with a lilac rolling drawer unit;
   * a pastel all-in-one with the month's content calendar (릴스·피드·스토리·라이브 chips on the days,
   * today ringed) and sticky notes on its bezel; a phone on a three-axis gimbal on its mini tripod,
   * in a little ring light that comes on in use; the storyboard notebook open at its 9:16 frames with
   * a pen; a pastel keyboard, an iced latte, a desk calendar counting down to the upload; a swivel
   * chair with a round cushion. Sat at it planning (writing in the storyboard); replying to comments
   * (the phone taken off the gimbal and thumbed in both hands, the comments inbox up on the screen);
   * typing a press release, or the week's upload slots.
   */
  contentDesk(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.06, 0.96);
    const d = 0.6;
    const h = 0.74;
    const z = -D / 2 + d / 2 + 0.04;
    const front = z + d / 2;
    const ty = h + 0.015;
    const use = inUse(g, out);
    part(g, rbox(w, 0.03, d, 0.014), WHITE, 0, h, z);
    part(g, box(w - 0.02, 0.01, 0.004), LILAC, 0, h - 0.019, front - 0.004, { outline: false });
    // Hairpin legs.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const fx = sx * (w / 2 - 0.06);
        const fz = z + sz * (d / 2 - 0.09);
        rod(g, V(fx, h - 0.02, fz - 0.05), V(fx, 0.01, fz), 0.007, GOLD);
        rod(g, V(fx, h - 0.02, fz + 0.05), V(fx, 0.01, fz), 0.007, GOLD);
      }
    // The rolling drawer unit under the left.
    const dx = -w / 2 + 0.19;
    const dd = d - 0.14;
    const dz = z - 0.02;
    part(g, rbox(0.3, 0.52, dd, 0.025), '#ddd2ff', dx, 0.3, dz);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.27, 0.145, 0.004), i === 1 ? '#ffd6e6' : '#ece6ff', dx, 0.46 - i * 0.16, dz + dd / 2 + 0.002, { outline: false });
      part(g, ball(0.011), GOLD, dx, 0.5 - i * 0.16, dz + dd / 2 + 0.01, { outline: false });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, ball(0.018), '#bdb4c8', dx + sx * 0.12, 0.02, dz + sz * (dd / 2 - 0.04), { outline: false });
    // The all-in-one.
    const mw = 0.52;
    const mh = 0.29;
    const mx = -0.02;
    const mz = z - 0.14;
    const my = ty + 0.15 + mh / 2;
    part(g, rbox(0.17, 0.012, 0.13, 0.005), '#e9e3f7', mx, ty + 0.006, mz);
    part(g, rbox(0.11, 0.2, 0.012, 0.005), '#e9e3f7', mx, ty + 0.1, mz - 0.03, { rx: -0.14 });
    part(g, rbox(mw + 0.03, mh + 0.075, 0.022, 0.012), '#d4c6fa', mx, my - 0.02, mz);
    part(g, box(mw + 0.024, mh + 0.068, 0.002), '#fdfcff', mx, my - 0.02, mz + 0.0115, { outline: false });
    part(g, box(mw + 0.024, 0.044, 0.003), '#c6b5f5', mx, my - mh / 2 - 0.034, mz + 0.012, { outline: false });
    out.screen = screenOf(g, calendarTex(), mw, mh, mx, my, mz + 0.0135);
    const onMon = frame(use, mx, my, mz + 0.0148);
    const press = sheet(onMon, pressTex(), mw, mh, 0, 0, 0);
    const sched = sheet(onMon, scheduleTex(), mw, mh, 0, 0, 0);
    const inbox = sheet(onMon, inboxTex(), mw, mh, 0, 0, 0);
    tag(g, '릴스 3개!', 0.07, 0.035, mx - mw / 2 + 0.02, my + mh / 2 + 0.012, mz + 0.016, '#fff59d', '#c62828');
    tag(g, '#챌린지', 0.065, 0.032, mx + mw / 2 - 0.03, my - mh / 2 - 0.034, mz + 0.016, '#ffc1dc', '#ad1457');
    // The gimbal on its mini tripod, its phone, the little ring light behind.
    const gx = -w / 2 + 0.11;
    const gz = z + 0.06;
    const py = ty + 0.3;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      rod(g, V(gx, ty + 0.05, gz), V(gx + Math.sin(a) * 0.07, ty + 0.004, gz + Math.cos(a) * 0.07), 0.005, BLACK);
    }
    part(g, cyl(0.017, 0.019, 0.13, 12), '#3a3840', gx, ty + 0.115, gz);
    part(g, rbox(0.012, 0.02, 0.006, 0.003), '#ff8fb8', gx, ty + 0.15, gz + 0.017, { outline: false });
    part(g, cyl(0.021, 0.021, 0.03, 12), BLACK, gx, ty + 0.195, gz);
    rod(g, V(gx, ty + 0.205, gz), V(gx + 0.055, ty + 0.25, gz - 0.012), 0.008, BLACK);
    part(g, cyl(0.018, 0.018, 0.026, 12), BLACK, gx + 0.055, ty + 0.25, gz - 0.012, { rz: Math.PI / 2 });
    rod(g, V(gx + 0.055, ty + 0.25, gz - 0.012), V(gx + 0.01, py, gz - 0.016), 0.007, BLACK);
    part(g, rbox(0.03, 0.022, 0.012, 0.004), BLACK, gx, py, gz - 0.011);
    const parkedIdle = new THREE.Group();
    g.add(parkedIdle);
    out.idle = parkedIdle;
    const p1 = phone(parkedIdle, null, PINK);
    p1.root.position.set(gx, py, gz);
    const p2 = phone(use, selfieCamTex(), PINK);
    p2.root.position.set(gx, py, gz);
    const gimbal = marker(g, gx, py, gz);
    rod(g, V(gx, ty, gz - 0.1), V(gx, py - 0.11, gz - 0.1), 0.006, '#d6d0c8');
    part(g, cyl(0.035, 0.04, 0.01, 14), '#efeae2', gx, ty + 0.005, gz - 0.1, { outline: false });
    ringLight(frame(g, gx, py, gz - 0.1), frame(use, gx, py, gz - 0.1), 0.11);
    // The keyboard, the storyboard notebook and its pen.
    const kx = 0;
    const kz = front - 0.13;
    part(g, rbox(0.3, 0.022, 0.11, 0.01), '#f4eefc', kx, ty + 0.011, kz);
    for (let r = 0; r < 4; r++) part(g, box(0.27, 0.01, 0.018), '#ffffff', kx, ty + 0.026, kz - 0.04 + r * 0.026, { outline: false });
    for (const [ox, oz] of [[0.12, -0.04], [-0.12, 0.038], [0.11, 0.038]]) part(g, box(0.022, 0.012, 0.018), '#ff8fb8', kx + ox, ty + 0.027, kz + oz, { outline: false });
    const kb = marker(g, kx, ty + 0.03, kz);
    const nx = w / 2 - 0.15;
    const nz = front - 0.16;
    const nb = frame(g, nx, ty + 0.004, nz, -0.12);
    part(nb, box(0.27, 0.008, 0.19), LILAC_D, 0, 0, 0);
    face(nb, litMat('smStoryboard', 256, 180, paintStoryboard), 0.255, 0.175, 0, 0.0055, 0, 0, -Math.PI / 2);
    for (let i = 0; i < 7; i++) part(nb, ring(0.006, 0.0016), '#9e9e9e', 0, 0.006, -0.075 + i * 0.025, { ry: Math.PI / 2, outline: false });
    rod(nb, V(0.03, 0.012, 0.05), V(0.11, 0.014, -0.03), 0.005, HOT);
    const notes = marker(g, nx, ty + 0.012, nz);
    // An iced latte, the desk calendar.
    icedLatte(g, w / 2 - 0.08, ty, z - 0.18);
    const cal = frame(g, w / 2 - 0.22, ty, z - 0.17, -0.25);
    part(cal, box(0.11, 0.08, 0.004), '#ffffff', 0, 0.04, 0.012, { rx: -0.3 });
    part(cal, box(0.11, 0.08, 0.004), '#efe8ff', 0, 0.04, -0.012, { rx: 0.3 });
    tag(cal, '업로드 D-3', 0.095, 0.03, 0, 0.055, 0.026, 'none', HOT, 0, -0.3);
    tag(cal, '11', 0.05, 0.03, 0, 0.026, 0.03, 'none', INK, 0, -0.3);
    // The chair.
    const sitZ = front + 0.26;
    pastelChair(frame(g, 0, 0, sitZ, Math.PI), 0.44, '#e9dcff', CREAM);
    const plan = satAt(g, 0, sitZ, 'write', notes);
    const reply = satAt(g, 0, sitZ, 'smPhone', gimbal);
    const pr = satAt(g, 0, sitZ, 'type', kb);
    const up = satAt(g, 0, sitZ, 'type', kb);
    const hold = holder(use, reply);
    const inHand = phone(hold, feedTex(), PINK);
    out.work = kb;
    out.animate = (t) => {
      const now = nowAt([plan, reply, pr, up], t) ?? plan;
      press.visible = now === pr;
      sched.visible = now === up;
      inbox.visible = now === reply;
      inHand.root.visible = now === reply;
      p2.root.visible = now !== reply;
      if (now === reply) {
        const H = heightOf(reply);
        const k = phoneRound(t, phaseOf(gimbal), H, true);
        placePhone(inHand.root, k.phone, hold, H, true);
      }
    };
    out.spots = { '*': plan, planContent: plan, replyComments: reply, socialMedia_pressRelease: pr, styleInfluencer_uploadSchedule: up };
  },

  /**
   * The trend board (트렌드 보드): a mobile whiteboard on castered feet (hung on the wall where there
   * is one) — the week's top ten shorts pinned up as 9:16 thumbnails with their hooks and views and a
   * magnet on each, the hashtags on pastel sticky notes, the rising sounds listed under a TV that
   * shows the channel's numbers (views by day, reach, saves, shares); a marker tray. Stood in front
   * with a notebook going through the numbers and pointing at the graph; scrolling a rival channel on
   * the phone while its numbers are up beside ours; writing the campaign's budget split on the board
   * in blue marker, line by line, the budget table up on the TV.
   */
  trendBoard(g, W, D, _c, _def, ctx, out) {
    const bw = Math.min(W - 0.16, 1.84);
    const bh = bw * (568 / 1024);
    const by = 1.32;
    const wall = ctx.againstWall;
    const bz = wall ? -D / 2 + 0.05 : -0.12;
    const use = inUse(g, out);
    if (!wall) {
      for (const sx of [-1, 1]) {
        const x = sx * (bw / 2 + 0.035);
        part(g, rbox(0.045, by + bh / 2 + 0.06, 0.045, 0.012), CHROME, x, (by + bh / 2 + 0.06) / 2, bz);
        part(g, rbox(0.06, 0.04, 0.52, 0.015), '#cfd4d8', x, 0.06, bz);
        for (const sz of [-1, 1]) part(g, ball(0.03), '#4a4852', x, 0.03, bz + sz * 0.23, { outline: false });
      }
    }
    part(g, rbox(bw + 0.04, bh + 0.04, 0.03, 0.012), CHROME, 0, by, bz);
    sheet(g, painted('smTrendBoard', 1024, 568, paintTrendBoard), bw, bh, 0, by, bz + 0.016);
    // A magnet on each short.
    const toX = (px: number) => -bw / 2 + (px / 1024) * bw;
    const toY = (py: number) => by + bh / 2 - (py / 568) * bh;
    for (let i = 0; i < 10; i++) {
      const px = 22 + (i % 5) * 114 + 48;
      const py = 64 + Math.floor(i / 5) * 186;
      part(g, cyl(0.014, 0.014, 0.012, 12), ['#ff5fa2', '#7cc0f5', '#ffd54f', '#7fd6b0', '#b388ff'][i % 5], toX(px), toY(py), bz + 0.022, { rx: Math.PI / 2 });
    }
    // The hashtags on sticky notes, bottom left.
    const tags = ['#챌린지', '#오운완', '#갓생루틴', '#먹방ASMR', '#출근룩', '#브이로그'];
    const noteCols = ['#fff59d', '#ffc1dc', '#bdeedc', '#c9b6ff', '#bfe3ff', '#ffd3bd'];
    tags.forEach((s, i) => {
      const x = toX(40 + (i % 3) * 102) + 0.04;
      const y = toY(470 + Math.floor(i / 3) * 52);
      const rz = ((i * 37) % 7) * 0.02 - 0.06;
      const n = frame(g, x, y, bz + 0.02);
      n.rotation.z = rz;
      part(n, box(0.16, 0.08, 0.004), noteCols[i], 0, 0, 0, { outline: false });
      tag(n, s, 0.14, 0.045, 0, -0.002, 0.003, 'none', INK);
    });
    // The TV on the right with the numbers.
    const tvW = 0.64;
    const tvH = 0.36;
    const tvX = toX(820);
    const tvY = toY(140);
    part(g, rbox(tvW + 0.03, tvH + 0.03, 0.035, 0.01), '#18161d', tvX, tvY, bz + 0.035);
    out.screen = screenOf(g, painted('smTrendStats', 384, 216, paintTrendStats), tvW, tvH, tvX, tvY, bz + 0.0535);
    const bench = sheet(use, painted('smBenchmark', 384, 216, paintBenchmark), tvW, tvH, tvX, tvY, bz + 0.055);
    const budgetS = sheet(use, painted('smBudget', 384, 216, paintBudget), tvW, tvH, tvX, tvY, bz + 0.055);
    const live = part(use, ball(0.008), '#ff3b5c', tvX + tvW / 2 - 0.03, tvY + tvH / 2 - 0.03, bz + 0.056, { outline: false, material: glow('#ff3b5c') });
    // The budget written up line by line in the blank, bottom middle.
    const wx = toX(470);
    const wy = toY(500);
    const lines = [
      tag(use, '캠페인 예산 2,400만', 0.4, 0.055, wx, wy + 0.06, bz + 0.019, 'none', '#1a4fb5'),
      tag(use, '릴스 60% · 라이브 25%', 0.4, 0.05, wx, wy, bz + 0.019, 'none', '#1a4fb5'),
      tag(use, '이벤트 15% → OK!', 0.36, 0.05, wx - 0.02, wy - 0.06, bz + 0.019, 'none', '#d81b60'),
    ];
    const writeAt = marker(g, wx - 0.05, wy, bz + 0.03);
    // The marker tray.
    part(g, rbox(0.8, 0.022, 0.07, 0.008), CHROME, -0.3, by - bh / 2 - 0.035, bz + 0.04);
    ['#1a4fb5', '#e53935', '#2e7d32', '#212121'].forEach((col, i) => part(g, cyl(0.011, 0.011, 0.13, 10), col, -0.58 + i * 0.15, by - bh / 2 - 0.015, bz + 0.045, { rz: Math.PI / 2 }));
    part(g, rbox(0.12, 0.035, 0.05, 0.01), '#3a3840', 0.02, by - bh / 2 - 0.01, bz + 0.045);
    const tvAt = marker(g, tvX - 0.08, tvY - 0.04, bz + 0.06);
    const sz = bz + 0.56;
    const metrics = stoodAt(g, tvX - 0.42, sz, 'meeting', tvAt);
    const scroll = stoodAt(g, tvX - 0.3, sz, 'smPhone', tvAt);
    const budget = stoodAt(g, wx - 0.2, bz + 0.42, 'board', writeAt);
    const hold = holder(use, scroll);
    const inHand = phone(hold, rivalTex(), MINT);
    out.work = tvAt;
    out.animate = (t) => {
      const now = nowAt([metrics, scroll, budget], t) ?? metrics;
      bench.visible = now === scroll;
      budgetS.visible = now === budget;
      const u = frac(t / 15);
      lines.forEach((l, i) => (l.visible = now === budget && u > i * 0.3));
      live.visible = wave(t, 1) > 0;
      inHand.root.visible = now === scroll;
      if (now === scroll) {
        const H = heightOf(scroll);
        placePhone(inHand.root, phoneRound(t, phaseOf(tvAt), H, false).phone, hold, H, false);
      }
    };
    out.spots = { '*': metrics, analyzeMetrics: metrics, socialMedia_benchmarkChannels: scroll, socialMedia_campaignBudget: budget };
  },

  /**
   * The live desk (방송 장비): a mint desk against an arched blush panel with LIVE 💗 in neon and a
   * string of fairy lights (both lit while on air), a little shelf of products for the live sale; the
   * phone upright on a desk stand in a ring light at face height, its screen the live as viewers see
   * it, hearts floating up off it; a laptop with the comments running up it, a pastel mouse, a cream
   * USB mic, the lip tints and the cushion compact on a riser; a velvet stool. Sat on air: reading
   * the comments, laughing along, talking to the phone, typing a reply (activity.ts streamBeat); when
   * a post blows up, the surprise, a bow of thanks, a heart over the head and both fists up — the
   * hearts pour off the phone and 🔥 실시간 인기 1위 comes up on the laptop.
   */
  streamingSetup(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.08, 0.9);
    const d = 0.5;
    const h = 0.74;
    const z = -D / 2 + d / 2 + 0.06;
    const front = z + d / 2;
    const ty = h + 0.015;
    const use = inUse(g, out);
    // The arched panel, its neon, the fairy lights, the little shelf.
    const pz = -D / 2 + 0.03;
    const pw = w + 0.04;
    part(g, rbox(pw, 1.6, 0.035, 0.015), '#ffd6e6', 0, 0.8, pz);
    part(g, cyl(pw / 2, pw / 2, 0.035, 32), '#ffd6e6', 0, 1.6, pz, { rx: Math.PI / 2 });
    const neon = painted('smNeonLive', 256, 128, paintNeonLive);
    sheet(g, neon, 0.5, 0.25, 0, 1.68, pz + 0.025, 0, 0, '#d9a9bf');
    sheet(use, neon, 0.5, 0.25, 0, 1.68, pz + 0.027);
    for (let i = 0; i < 13; i++) {
      const u = i / 12;
      const x = -pw / 2 + 0.05 + u * (pw - 0.1);
      const y = 1.42 - 0.12 * Math.sin(u * Math.PI);
      part(g, ball(0.012), '#fff3c4', x, y, pz + 0.03, { outline: false });
      part(use, ball(0.013), '#fff3c4', x, y, pz + 0.031, { outline: false, material: glow(i % 3 ? '#fff6d0' : '#ffd0e4') });
    }
    rod(g, V(-pw / 2 + 0.03, 1.42, pz + 0.028), V(pw / 2 - 0.03, 1.42, pz + 0.028), 0.002, '#9e9e9e');
    part(g, rbox(0.3, 0.02, 0.1, 0.006), WHITE, 0.26, 1.12, pz + 0.06);
    [['#ff8fb8', 0.17], ['#c9b6ff', 0.22], ['#7fd6b0', 0.27], ['#ffd54f', 0.33]].forEach(([col, x]) => {
      part(g, cyl(0.016, 0.016, 0.07, 10), col as string, x as number, 1.165, pz + 0.06);
      part(g, cyl(0.01, 0.01, 0.02, 8), GOLD, x as number, 1.21, pz + 0.06, { outline: false });
    });
    // The desk.
    part(g, rbox(w, 0.03, d, 0.012), MINT, 0, h, z);
    part(g, rbox(w - 0.06, 0.08, 0.02, 0.008), '#a8e2cc', 0, h - 0.055, front - 0.03);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.01, h - 0.02, 10), GOLD, sx * (w / 2 - 0.05), (h - 0.02) / 2, z + sz * (d / 2 - 0.05), { outline: false });
    // The phone on its stand in the ring light, at face height.
    const sy = ty + 0.44;
    const sz = z - 0.1;
    part(g, cyl(0.06, 0.07, 0.016, 18), '#efeae2', 0, ty + 0.008, sz - 0.02);
    part(g, cyl(0.012, 0.012, sy - ty - 0.05, 10), '#d6d0c8', 0, ty + (sy - ty) / 2, sz - 0.02, { outline: false });
    ringLight(frame(g, 0, sy, sz - 0.03), frame(use, 0, sy, sz - 0.03), 0.19);
    part(g, rbox(0.03, 0.17, 0.014, 0.005), BLACK, 0, sy, sz - 0.008);
    const ph = phone(g, liveTex(), '#ffffff');
    ph.root.position.set(0, sy, sz);
    const float = hearts(use, 7, 0.02, sy + 0.04, sz + 0.03, 0.55, 0.06);
    // The laptop with the comments.
    const lz = front - 0.16;
    part(g, rbox(0.32, 0.014, 0.22, 0.006), '#ece3ea', 0, ty + 0.007, lz);
    part(g, box(0.28, 0.004, 0.1, ), '#fbf7fa', 0, ty + 0.016, lz - 0.03, { outline: false });
    part(g, box(0.1, 0.002, 0.06), '#f2e9ef', 0, ty + 0.015, lz + 0.065, { outline: false });
    const lid = frame(g, 0, ty + 0.014, lz - 0.11, 0, -0.3);
    part(lid, rbox(0.32, 0.21, 0.01, 0.006), '#ece3ea', 0, 0.105, 0);
    part(lid, box(0.29, 0.18, 0.002), '#1f1d24', 0, 0.11, 0.0055, { outline: false });
    const lidOn = frame(use, 0, ty + 0.014, lz - 0.11, 0, -0.3);
    const column = commentsTex();
    sheet(lidOn, painted('smLiveHead', 128, 16, (c) => {
      c.fillStyle = '#ff3b5c';
      c.fillRect(0, 0, 128, 16);
      write(c, 'LIVE 댓글 · 👁 2,481', 64, 8.5, 8, '#ffffff', 'center');
    }), 0.29, 0.032, 0, 0.184, 0.0068);
    sheet(lidOn, column, 0.29, 0.148, 0, 0.094, 0.0068);
    const toast = tag(lidOn, '🔥 실시간 인기 LIVE 1위!', 0.27, 0.045, 0, 0.12, 0.008, '#ff5fa2', '#ffffff');
    const kb = marker(g, 0, ty + 0.02, lz - 0.02);
    part(g, rbox(0.055, 0.025, 0.09, 0.02), '#ffc1dc', 0.29, ty + 0.012, front - 0.1);
    // The mic, the products on their riser.
    const mx = -w / 2 + 0.12;
    const mz = lz - 0.02;
    part(g, cyl(0.04, 0.045, 0.012, 16), CREAM, mx, ty + 0.006, mz);
    part(g, cyl(0.008, 0.008, 0.1, 8), '#d6d0c8', mx, ty + 0.06, mz, { outline: false });
    part(g, cyl(0.03, 0.03, 0.11, 16), CREAM, mx, ty + 0.17, mz, { rx: 0.25 });
    part(g, ball(0.031), '#f7c9da', mx, ty + 0.23, mz + 0.012);
    const rx = w / 2 - 0.12;
    part(g, rbox(0.16, 0.04, 0.1, 0.008), '#ffffff', rx, ty + 0.02, z - 0.1, { material: ACRYLIC });
    ['#e53935', '#ff7a8a', '#c2185b'].forEach((col, i) => {
      part(g, cyl(0.011, 0.011, 0.065, 10), '#fafafa', rx - 0.05 + i * 0.03, ty + 0.072, z - 0.12);
      part(g, cyl(0.012, 0.012, 0.03, 10), col, rx - 0.05 + i * 0.03, ty + 0.115, z - 0.12);
    });
    part(g, cyl(0.035, 0.035, 0.02, 18), '#ffffff', rx + 0.045, ty + 0.05, z - 0.08);
    part(g, cyl(0.033, 0.033, 0.004, 18), '#ffb3cf', rx + 0.045, ty + 0.061, z - 0.08, { outline: false });
    tag(g, 'LIVE 20:00 💗', 0.12, 0.035, rx, ty + 0.03, front - 0.04, '#ffffff', HOT, 0, -0.4);
    // The stool.
    const sitZ = front + 0.3;
    part(g, cyl(0.19, 0.18, 0.08, 24), '#f7b6d0', 0, 0.43, sitZ);
    part(g, cyl(0.17, 0.17, 0.02, 24), GOLD, 0, 0.385, sitZ, { outline: false });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      rod(g, V(Math.sin(a) * 0.12, 0.38, sitZ + Math.cos(a) * 0.12), V(Math.sin(a) * 0.17, 0.0, sitZ + Math.cos(a) * 0.17), 0.011, GOLD);
    }
    part(g, ring(0.15, 0.008), GOLD, 0, 0.16, sitZ, { rx: Math.PI / 2, outline: false });
    const onAir = satAt(g, 0, sitZ, 'streamChat', kb);
    const viral = satAt(g, 0, sitZ, 'donation', kb);
    out.work = kb;
    out.animate = (t) => {
      const now = nowAt([onAir, viral], t) ?? onAir;
      const hot = now === viral;
      float(t, hot ? 2.2 : 0.8);
      toast.visible = hot && frac(t / 6) < 0.7;
      toast.scale.setScalar(1 + 0.05 * Math.max(0, Math.sin(t * 7)));
      column.offset.y = -commentScroll(t * (hot ? 2.4 : 1));
    };
    out.spots = { '*': onAir, liveStream: onAir, trendingLive: viral };
  },

  /**
   * The photo wall (포토월): a wall of pastel roses (painted, with fuller blooms standing off it), a
   * neon 오늘도 반짝 ✨ held off it on clear acrylic, a balloon garland up the left side and over the
   * top, a round lilac rug; a ring light on its stand at the front corner and a phone on a tall
   * tripod at the other. Stood on the rug with the back to the roses, a selfie taken at arm's length
   * (a V by the cheek, a finger heart, the chin on the hand, then the shots checked), the phone's
   * screen flashing with each; thumbnails pulled to the tripod's phone (the shock, a finger at the
   * lens, hands on hips…), its flash going.
   */
  selfieWall(g, W, D, _c, _def, _ctx, out) {
    const pw = Math.min(W - 0.12, 1.84);
    const ph = 2.1;
    const pz = -D / 2 + 0.06;
    const use = inUse(g, out);
    part(g, rbox(pw, ph, 0.06, 0.02), '#ffe3ee', 0, ph / 2, pz);
    face(g, litMat('smRoses', 512, 576, paintRoses), pw - 0.04, ph - 0.04, 0, ph / 2, pz + 0.031);
    // Fuller roses standing off the wall, in one draw.
    const n = 70;
    const rose = new THREE.InstancedMesh(shape('smRose', () => new THREE.SphereGeometry(0.05, 10, 8)), new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: gradient }), n);
    rose.userData.ownMaterial = true;
    const rnd = seeded(7);
    const m4 = new THREE.Matrix4();
    const cols = ['#ffb3cf', '#ffd1e1', '#fff0f5', '#e8d6ff', '#ff9fc0', '#ffe4d6'].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * (pw - 0.16);
      const y = 0.12 + rnd() * (ph - 0.24);
      const s = 0.7 + rnd() * 0.6;
      m4.compose(V(x, y, pz + 0.045), new THREE.Quaternion(), V(s, s, s * 0.55));
      rose.setMatrixAt(i, m4);
      rose.setColorAt(i, cols[i % cols.length]);
    }
    rose.castShadow = true;
    g.add(rose);
    // The neon on clear acrylic.
    const nt = painted('smNeonShine', 512, 160, paintNeonShine);
    const ny = 1.5;
    const acr = new THREE.Mesh(box(0.98, 0.34, 0.01), ACRYLIC);
    acr.position.set(0, ny, pz + 0.12);
    g.add(acr);
    for (const sx of [-1, 1]) part(g, cyl(0.008, 0.008, 0.08, 8), CHROME, sx * 0.44, ny + 0.13, pz + 0.08, { rx: Math.PI / 2, outline: false });
    sheet(g, nt, 0.94, 0.3, 0, ny, pz + 0.127, 0, 0, '#e8c7d8');
    sheet(use, nt, 0.94, 0.3, 0, ny, pz + 0.129);
    // The balloon garland up the left and over the top.
    const bal = ['#ffc1dc', '#c9b6ff', '#fff4e6', '#bdeedc', '#ffd3bd', '#f8a5c2'];
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 26; i++) {
      const u = i / 25;
      const x = u < 0.45 ? -pw / 2 + 0.08 + Math.sin(u * 20) * 0.03 : -pw / 2 + 0.08 + ((u - 0.45) / 0.55) * (pw - 0.5);
      const y = u < 0.45 ? 0.25 + (u / 0.45) * 1.8 : 2.06 + Math.sin(u * 17) * 0.04;
      pts.push(V(x, y, pz + 0.14 + (i % 2) * 0.04));
    }
    pts.forEach((p, i) => {
      const r = 0.07 + ((i * 7) % 5) * 0.012;
      part(g, ball(r), bal[i % bal.length], p.x + ((i * 13) % 3) * 0.02 - 0.02, p.y, p.z).scale.set(1, 1.12, 1);
      if (i % 4 === 1) part(g, ball(0.035), bal[(i + 2) % bal.length], p.x + 0.07, p.y + 0.05, p.z + 0.05, { outline: false });
    });
    // The rug.
    part(g, cyl(0.6, 0.6, 0.012, 40), '#efe4ff', 0, 0.006, -0.02, { outline: false });
    part(g, ring(0.6, 0.012), WHITE, 0, 0.012, -0.02, { rx: Math.PI / 2, outline: false });
    // The ring light at the front left, the phone on its tripod at the front right.
    const lx = -pw / 2 + 0.14;
    const lz = D / 2 - 0.1;
    lightStand(g, lx, lz, 1.4, 0.16, WHITE);
    const aimL = Math.atan2(-0.05 - lx, -0.06 - lz);
    ringLight(frame(g, lx, 1.48, lz, aimL), frame(use, lx, 1.48, lz, aimL), 0.2);
    const tx = pw / 2 - 0.16;
    const tz = D / 2 - 0.1;
    lightStand(g, tx, tz, 1.3, 0.14);
    const aimT = Math.atan2(-0.1 - tx, -0.04 - tz);
    const cam = frame(g, tx, 1.36, tz, aimT + Math.PI);
    part(cam, rbox(0.03, 0.17, 0.014, 0.005), BLACK, 0, 0, 0.008);
    const tp = phone(cam, recTex('thumb', '#ffe3ee', '#e8d6ff'), SKY);
    tp.root.position.z = -0.004;
    const flashT = part(frame(use, tx, 1.36, tz, aimT + Math.PI), ball(0.012), '#ffffff', 0.015, 0.035, -0.015, { outline: false, material: glow('#ffffff') });
    const camAt = marker(g, tx, 1.36, tz);
    const wallAt = marker(g, 0, 1.2, pz + 0.05);
    const selfie = stoodAt(g, -0.05, -0.06, 'smSelfie', wallAt, 0);
    const thumb = stoodAt(g, -0.1, -0.04, 'skit', camAt, Math.atan2(tx + 0.1, tz + 0.04));
    const hold = holder(use, selfie);
    const inHand = phone(hold, selfieCamTex(), LILAC);
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }));
    flash.userData.ownGeometry = flash.userData.ownMaterial = true;
    flash.position.z = 0.0052;
    inHand.root.add(flash);
    out.work = wallAt;
    out.animate = (t) => {
      const now = nowAt([selfie, thumb], t) ?? selfie;
      inHand.root.visible = now === selfie;
      flashT.visible = now === thumb && frac(t / 2.6) < 0.06;
      if (now === selfie) {
        const H = heightOf(selfie);
        const k = selfieRound(t, phaseOf(wallAt), H);
        placePhone(inHand.root, k.phone, hold, H, false);
        (flash.material as THREE.MeshBasicMaterial).opacity = k.flash * 0.9;
      }
    };
    out.spots = { '*': selfie, selfieShoot: selfie, socialMedia_thumbnailShoot: thumb };
  },

  /**
   * The shorts set (숏폼 촬영 세트): a paper sweep in lilac fading to peach hung from its roll between
   * two stands and run out over the floor with no corner, a pink X taped on the mark, pastel LED
   * tubes either side; at the front the phone upright on its tripod in a big ring light (SHORTS 9:16
   * on the tripod), its screen recording; a speaker on a mint cube playing the challenge's song. On
   * the mark a dance challenge danced to the lens (pointing, rolling, clapping, waving, finger guns, a
   * shimmy, a heart over the head, the finger heart to finish), stepping and turning with the moves,
   * the notes coming off the speaker and the tubes pulsing on the beat; an info short told to the
   * phone held out at arm's length, the free hand counting and pointing up beside the head where the
   * captions pop up.
   */
  smShortsSet(g, W, D, _c, _def, _ctx, out) {
    const bw = Math.min(W - 0.3, 1.7);
    const bz = -D / 2 + 0.08;
    const top = 2.15;
    const use = inUse(g, out);
    for (const sx of [-1, 1]) lightStand(g, sx * (bw / 2 + 0.05), bz + 0.02, top + 0.04, 0.2);
    part(g, cyl(0.013, 0.013, bw + 0.1, 10), BLACK, 0, top, bz + 0.02, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.055, 0.055, bw + 0.02, 20), '#e7dcff', 0, top - 0.06, bz + 0.03, { rz: Math.PI / 2 });
    const curveR = 0.3;
    const hang = top - 0.1 - curveR;
    face(g, litMat('smSweep', 64, 256, paintSweep), bw, hang, 0, curveR + hang / 2, bz + 0.02);
    const sweep = new THREE.Mesh(
      shape(`smSweep${bw}`, () => new THREE.CylinderGeometry(curveR, curveR, bw, 16, 1, true, Math.PI, Math.PI / 2).rotateZ(Math.PI / 2)),
      new THREE.MeshToonMaterial({ color: '#ffd9c7', side: THREE.DoubleSide, gradientMap: gradient }),
    );
    sweep.userData.ownMaterial = true;
    sweep.position.set(0, curveR, bz + curveR + 0.02);
    g.add(sweep);
    const runD = 1.0;
    part(g, box(bw, 0.006, runD), '#ffd9c7', 0, 0.003, bz + curveR + 0.02 + runD / 2, { outline: false });
    // The mark.
    const markZ = -0.1;
    for (const r of [Math.PI / 4, -Math.PI / 4]) part(g, box(0.26, 0.004, 0.035), HOT, 0, 0.008, markZ, { ry: r, outline: false });
    const mark = marker(g, 0, 0.01, markZ);
    // The LED tubes.
    const tubes: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      const x = sx * (bw / 2 - 0.08);
      const tz2 = bz + 0.5;
      part(g, cyl(0.07, 0.08, 0.02, 14), BLACK, x, 0.01, tz2, { outline: false });
      part(g, cyl(0.03, 0.03, 1.2, 12), '#e9e4ee', x, 0.68, tz2);
      tubes.push(part(use, cyl(0.032, 0.032, 1.16, 12), sx < 0 ? '#ff8fd0' : '#8fe3ff', x, 0.68, tz2, { outline: false, material: glow(sx < 0 ? '#ff9ad6' : '#9eeaff') }));
    }
    // The tripod, the ring light, the phone recording.
    const tz = D / 2 - 0.28;
    const py = 1.3;
    lightStand(g, 0, tz, py - 0.08, 0.2);
    ringLight(frame(g, 0, py, tz + 0.03, Math.PI), frame(use, 0, py, tz + 0.03, Math.PI), 0.26);
    part(g, rbox(0.03, 0.17, 0.014, 0.005), BLACK, 0, py, tz + 0.012);
    const cam = phone(g, recTex('shorts', '#e8dcff', '#ffd9c7'), '#ffffff');
    cam.root.position.set(0, py, tz);
    const recDot = part(use, ball(0.008), '#ff3b5c', 0.03, py + 0.06, tz + 0.01, { outline: false, material: glow('#ff3b5c') });
    tag(g, 'SHORTS 9:16', 0.12, 0.03, 0, 0.75, tz + 0.03, '#2a2830', '#ffffff');
    // The speaker on its cube, notes off it.
    const kx = -bw / 2 + 0.12;
    const kz = D / 2 - 0.3;
    part(g, rbox(0.3, 0.42, 0.3, 0.02), MINT, kx, 0.21, kz);
    const spk = frame(g, kx, 0.42, kz, 0.4);
    part(spk, rbox(0.22, 0.12, 0.09, 0.03), '#f4eefc', 0, 0.06, 0);
    for (const sx of [-1, 1]) part(spk, cyl(0.035, 0.035, 0.005, 16), '#b9a9e8', sx * 0.055, 0.06, 0.046, { rx: Math.PI / 2, outline: false });
    tag(g, 'TAKE 12', 0.12, 0.035, kx, 0.3, kz + 0.152, 'none', INK);
    const notes = ['♪', '♫', '♪'].map((s, i) => tag(use, s, 0.07, 0.07, kx, 0.6, kz, 'none', ['#ff5fa2', '#7c4dff', '#00b8d4'][i]));
    // The captions where the hand points (beside the head, to the creator's left: +x here).
    const caps = [
      tag(use, '✔ 3초 만에 배우는 꿀팁', 0.5, 0.09, 0.58, 1.62, markZ - 0.2, '#ffffff', INK),
      tag(use, '👉 저장 필수!', 0.36, 0.09, 0.6, 1.24, markZ - 0.18, '#ff5fa2', '#ffffff'),
    ];
    const dance = stoodAt(g, 0, markZ, 'smChallenge', mark, 0);
    const info = stoodAt(g, 0, markZ, 'smVlog', mark, 0);
    const hold = holder(use, info);
    const inHand = phone(hold, recTex('vlog', '#bfe3ff', '#e8dcff'), PINK);
    const capAge = [-1e9, -1e9];
    out.work = mark;
    out.animate = (t) => {
      const now = nowAt([dance, info], t) ?? dance;
      const ph = phaseOf(mark);
      inHand.root.visible = now === info;
      recDot.visible = wave(t, 1) > 0;
      if (now === dance) {
        const k = challengeRound(t, ph, heightOf(dance));
        dance.at.position.x = k.step;
        dance.at.rotation.y = k.twist;
        tubes.forEach((m) => m.scale.set(1, 0.85 + 0.15 * k.beat, 1));
        notes.forEach((m, i) => {
          const u = frac(t / (CHALLENGE_BEAT * 4) + i / 3);
          m.visible = k.rec;
          m.position.set(kx + 0.12 * Math.sin(u * 5 + i), 0.58 + u * 0.5, kz + 0.02 * i);
          (m.material as THREE.MeshBasicMaterial).opacity = 1 - u;
        });
        caps.forEach((c) => (c.visible = false));
      } else {
        dance.at.position.x = 0;
        dance.at.rotation.y = 0;
        tubes.forEach((m) => m.scale.set(1, 1, 1));
        notes.forEach((m) => (m.visible = false));
        const H = heightOf(info);
        const k = vlogRound(t, ph, H);
        placePhone(inHand.root, k.phone, hold, H, false);
        caps.forEach((c, i) => {
          if (k.caption === i + 1 && t - capAge[i] > 3) capAge[i] = t;
          const age = t - capAge[i];
          c.visible = age < 2.6;
          c.scale.setScalar(Math.min(1, 0.4 + age * 4) * (1 + 0.08 * Math.max(0, 1 - age * 3)));
        });
      }
    };
    out.spots = { '*': dance, smShootChallenge: dance, smShootInfo: info };
  },

  /**
   * The unboxing table (협찬 언박싱 테이블): a white top on blush legs with a GLOWY × 모먼트랩 runner
   * hung over its front; the brand's pink box tied with a white ribbon; the line-up either side (a
   * cushion compact, lip tints, a toner, a sneaker box, an earbuds case, a perfume), a 유료광고 포함
   * sign, the brand's brief on a tablet; behind it the phone on its tripod in a ring light and an LED
   * panel, aimed across the table. Stood behind it unboxing to the camera: the lid lifted off and set
   * down, the tissue parted, the serum lifted out, shown to the lens and turned, presented and its
   * label pointed at, held up by the cheek with a V, put back and the lid on again.
   */
  smUnboxTable(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.2, 1.6);
    const d = 0.62;
    const h = 0.76;
    const z = 0.0;
    const front = z + d / 2;
    const ty = h + 0.02;
    const use = inUse(g, out);
    part(g, rbox(w, 0.04, d, 0.015), '#f7f3ef', 0, h, z);
    part(g, box(w - 0.02, 0.008, 0.004), GOLD, 0, h - 0.016, front - 0.004, { outline: false });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, cyl(0.026, 0.016, h - 0.04, 12), '#f4b6cc', sx * (w / 2 - 0.08), (h - 0.04) / 2 + 0.02, z + sz * (d / 2 - 0.08));
        part(g, cyl(0.017, 0.017, 0.03, 10), GOLD, sx * (w / 2 - 0.08), 0.015, z + sz * (d / 2 - 0.08), { outline: false });
      }
    // The runner over the front with the collab's name.
    part(g, box(0.7, 0.004, d + 0.01), '#ffd6e6', 0, h + 0.022, z, { outline: false });
    part(g, box(0.7, 0.24, 0.004), '#ffd6e6', 0, h - 0.1, front + 0.006, { outline: false });
    tag(g, 'GLOWY × 모먼트랩', 0.5, 0.07, 0, h - 0.09, front + 0.009, 'none', '#c2185b');
    // The box (its lid drawn on it when nobody's at it; in use it comes off).
    const bx = 0;
    const bzz = z + 0.14;
    part(g, rbox(0.3, 0.11, 0.22, 0.01), '#ffb7d1', bx, ty + 0.055, bzz);
    const lidH = 0.035;
    const lidY = ty + 0.11 + lidH / 2;
    const makeLid = (parent: THREE.Object3D) => {
      const l = new THREE.Group();
      parent.add(l);
      part(l, rbox(0.31, lidH, 0.23, 0.01), '#ff9fc4', 0, 0, 0);
      part(l, box(0.312, lidH + 0.002, 0.03), '#ffffff', 0, 0, 0, { outline: false });
      part(l, box(0.03, lidH + 0.002, 0.232), '#ffffff', 0, 0, 0, { outline: false });
      for (const sx of [-1, 1]) part(l, ball(0.03), '#ffffff', sx * 0.03, lidH / 2 + 0.01, 0, { outline: false }).scale.set(1.2, 0.5, 0.8);
      tag(l, 'GLOWY', 0.1, 0.03, 0.08, lidH / 2 + 0.002, 0.07, 'none', '#ad1457', 0, -Math.PI / 2);
      return l;
    };
    const idleLid = new THREE.Group();
    g.add(idleLid);
    out.idle = idleLid;
    makeLid(idleLid).position.set(bx, lidY, bzz);
    const lid = makeLid(use);
    const tissue = new THREE.Group();
    use.add(tissue);
    for (let i = 0; i < 6; i++) part(tissue, ball(0.05), i % 2 ? '#ffffff' : '#ffe4ef', bx - 0.09 + (i % 3) * 0.09, ty + 0.105, bzz - 0.04 + Math.floor(i / 3) * 0.08, { outline: false }).scale.set(1, 0.35, 0.9);
    // The serum.
    const serum = new THREE.Group();
    use.add(serum);
    const bottle = new THREE.Mesh(cyl(0.024, 0.024, 0.08, 16), GLASS);
    serum.add(bottle);
    part(serum, cyl(0.02, 0.02, 0.05, 14), '#ff9fc4', 0, -0.012, 0, { outline: false });
    part(serum, cyl(0.025, 0.025, 0.022, 14), '#ffffff', 0, 0.0, 0, { outline: false });
    part(serum, cyl(0.014, 0.016, 0.02, 12), GOLD, 0, 0.05, 0);
    part(serum, ball(0.016), '#ffffff', 0, 0.072, 0).scale.set(1, 1.3, 1);
    const p = V(bx, ty + 0.11 + lidH, bzz);
    const lidAt = marker(g, p.x, p.y, p.z);
    // The line-up: left, a compact, three lip tints, a toner; right, the sneaker box, earbuds, perfume.
    part(g, cyl(0.045, 0.045, 0.022, 20), '#ffffff', -0.52, ty + 0.011, z - 0.05);
    part(g, cyl(0.043, 0.043, 0.004, 20), '#ffb3cf', -0.52, ty + 0.024, z - 0.05, { outline: false });
    ['#e53935', '#ff7a8a', '#c2185b'].forEach((col, i) => {
      part(g, cyl(0.012, 0.012, 0.07, 10), '#fafafa', -0.36 + i * 0.035, ty + 0.035, z + 0.12);
      part(g, cyl(0.013, 0.013, 0.035, 10), col, -0.36 + i * 0.035, ty + 0.087, z + 0.12);
    });
    part(g, cyl(0.03, 0.034, 0.16, 16), '#e8f6ff', -0.36, ty + 0.08, z - 0.15);
    part(g, cyl(0.02, 0.02, 0.03, 12), '#ffffff', -0.36, ty + 0.175, z - 0.15);
    const shoe = frame(g, 0.45, ty, z - 0.08, -0.2);
    part(shoe, rbox(0.3, 0.11, 0.18, 0.006), '#ffffff', 0, 0.055, 0);
    part(shoe, box(0.302, 0.02, 0.182), '#ff8fb8', 0, 0.09, 0, { outline: false });
    tag(shoe, 'MOCHI', 0.12, 0.035, 0, 0.055, 0.092, 'none', '#ad1457');
    part(g, rbox(0.06, 0.035, 0.045, 0.015), MINT, 0.32, ty + 0.018, z + 0.15);
    part(g, rbox(0.06, 0.08, 0.035, 0.008), '#fff3d6', 0.42, ty + 0.04, z + 0.12, { material: GLASS });
    part(g, rbox(0.04, 0.03, 0.03, 0.006), GOLD, 0.42, ty + 0.095, z + 0.12);
    // The 유료광고 sign, the brief on its tablet.
    const sign = frame(g, -0.6, ty, front - 0.08, 0.15);
    part(sign, box(0.16, 0.08, 0.006), '#ffffff', 0, 0.045, 0, { rx: -0.25, material: ACRYLIC });
    tag(sign, '유료광고 포함', 0.15, 0.04, 0, 0.05, 0.012, '#6d6475', '#ffffff', 0, -0.25);
    const tab = frame(g, 0.6, ty + 0.02, front - 0.1, -0.15, -0.6);
    part(tab, rbox(0.2, 0.14, 0.01, 0.008), '#e0dbe6', 0, 0.07, 0);
    sheet(tab, painted('smBrief', 192, 128, paintBrief), 0.18, 0.12, 0, 0.07, 0.006);
    part(g, rbox(0.08, 0.04, 0.06, 0.01), '#e0dbe6', 0.6, ty + 0.02, front - 0.06);
    // The tripod, its phone, its ring light; an LED panel.
    const cz = -D / 2 + 0.1;
    const cy = 1.28;
    lightStand(g, 0, cz, cy - 0.08, 0.16);
    ringLight(frame(g, 0, cy, cz - 0.02), frame(use, 0, cy, cz - 0.02), 0.17);
    const cam = frame(g, 0, cy, cz, Math.PI);
    part(cam, rbox(0.03, 0.17, 0.014, 0.005), BLACK, 0, 0, 0.012);
    phone(cam, recTex('unbox', '#ffe3ee', '#fff4e6'), PINK);
    part(use, ball(0.008), '#ff3b5c', 0.03, cy + 0.07, cz + 0.01, { outline: false, material: glow('#ff3b5c') });
    lightStand(g, -0.62, cz + 0.05, 1.1, 0.14, WHITE);
    const led = frame(g, -0.62, 1.16, cz + 0.05, 0.5, 0.2);
    part(led, rbox(0.24, 0.16, 0.035, 0.01), WHITE, 0, 0, 0);
    part(led, box(0.22, 0.14, 0.003), '#ece8e0', 0, 0, 0.019, { outline: false });
    part(frame(use, -0.62, 1.16, cz + 0.05, 0.5, 0.2), box(0.22, 0.14, 0.003), '#fffaf0', 0, 0, 0.021, { outline: false, material: glow('#fff8ec') });
    const unbox = stoodAt(g, 0, front + 0.3, 'smUnbox', lidAt);
    // From the creator's frame (they face -z here: their left is -x) to the table's.
    const at = (o: BarOffset, v: THREE.Vector3) => v.set(p.x - o.side, p.y + o.up, p.z - o.ahead);
    out.work = lidAt;
    out.animate = (t) => {
      const k = unboxRound(t, phaseOf(lidAt));
      at(k.lid, lid.position).y -= lidH / 2;
      lid.rotation.z = THREE.MathUtils.clamp(-k.lid.side * 0.4, -0.25, 0.25);
      at(k.product, serum.position);
      serum.rotation.y = k.spin;
      serum.visible = !k.lidOn;
      tissue.visible = !k.lidOn;
    };
    out.spots = { '*': unbox, smUnboxing: unbox };
  },

  /**
   * The reaction wall (실시간 반응 모니터): a big TV on the wall (on a rolling stand in the middle of a
   * room) with the latest reel playing on the left, its views, likes, saves and shares counting up
   * in the middle with the views by hour, 🔥 인기 급상승 3위, and the comments coming in down the
   * right; hearts float off the reel and +1,024 pops by the counters while it's watched. Under it a
   * white console with pastel drawers, the 100만 뷰 acrylic award, a mini cloud lamp and a plant.
   * Stood in front with a notebook, going through the reactions and pointing at the numbers.
   */
  smReactionWall(g, W, D, _c, _def, ctx, out) {
    const tw = Math.min(W - 0.14, 1.76);
    const th = tw * (9 / 16);
    const wall = ctx.againstWall;
    const tz = wall ? -D / 2 + 0.05 : -0.1;
    const ty = wall ? 1.55 : 1.4;
    const use = inUse(g, out);
    if (!wall) {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.06, ty, 0.06, 0.012), '#ece7f2', sx * 0.4, ty / 2, tz - 0.05);
        part(g, rbox(0.08, 0.04, 0.6, 0.012), '#ece7f2', sx * 0.4, 0.04, tz);
      }
    } else part(g, rbox(0.4, 0.3, 0.04, 0.01), '#3a3840', 0, ty, tz - 0.03);
    part(g, rbox(tw + 0.04, th + 0.04, 0.05, 0.012), '#18161d', 0, ty, tz);
    out.screen = screenOf(g, painted('smReaction', 512, 288, paintReaction), tw, th, 0, ty, tz + 0.026);
    const toX = (px: number) => -tw / 2 + (px / 512) * tw;
    const toY = (py: number) => ty + th / 2 - (py / 288) * th;
    const column = commentsTex();
    sheet(use, column, tw * (120 / 512), th * (226 / 288), toX(442), toY(158), tz + 0.028);
    const float = hearts(use, 6, toX(130), toY(200), tz + 0.03, th * 0.45, 0.07);
    const pops = [tag(use, '+1,024 ▲', 0.2, 0.05, toX(300), toY(70), tz + 0.03, 'none', '#7cf0c8'), tag(use, '💗 +312', 0.16, 0.05, toX(300), toY(120), tz + 0.03, 'none', '#ff8fc0')];
    // The console.
    const cz = -D / 2 + 0.22;
    const cw = Math.min(tw, 1.3);
    part(g, rbox(cw, 0.38, 0.34, 0.015), WHITE, 0, 0.26, cz);
    [PINK, LILAC, MINT].forEach((col, i) => part(g, box(cw / 3 - 0.03, 0.3, 0.004), col, -cw / 3 + i * (cw / 3), 0.26, cz + 0.171, { outline: false }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.012, 0.008, 0.07, 8), GOLD, sx * (cw / 2 - 0.05), 0.035, cz + sz * 0.13, { outline: false });
    const award = frame(g, -cw / 2 + 0.2, 0.45, cz);
    part(award, rbox(0.12, 0.03, 0.08, 0.008), '#ffffff', 0, 0.015, 0);
    const pane = new THREE.Mesh(box(0.11, 0.17, 0.02), ACRYLIC);
    pane.position.set(0, 0.115, 0);
    award.add(pane);
    tag(award, '100만 뷰', 0.09, 0.03, 0, 0.14, 0.012, 'none', LILAC_D);
    tag(award, 'MOMENT LAB', 0.09, 0.02, 0, 0.1, 0.012, 'none', '#9e9e9e');
    const cloud = frame(g, 0.05, 0.45, cz);
    for (const [x, y, r] of [[-0.06, 0.05, 0.05], [0, 0.07, 0.065], [0.065, 0.05, 0.05]]) part(cloud, ball(r), '#ffffff', x, y, 0, { outline: false });
    part(cloud, ball(0.04), '#fff8e1', 0, 0.04, 0.03, { outline: false, material: glow('#fff6dc') });
    part(g, cyl(0.06, 0.05, 0.1, 14), '#ffd3bd', cw / 2 - 0.2, 0.5, cz);
    for (let i = 0; i < 5; i++) part(g, ball(0.045), '#8bcf9b', cw / 2 - 0.2 + Math.sin(i * 1.3) * 0.04, 0.6 + (i % 2) * 0.04, cz + Math.cos(i * 1.3) * 0.03);
    const work = marker(g, toX(250), toY(90), tz + 0.03);
    out.work = work;
    out.animate = (t) => {
      float(t, 1.2);
      column.offset.y = -commentScroll(t * 1.3);
      pops.forEach((m, i) => {
        const u = frac(t / 3.2 + i * 0.5);
        m.position.y = toY(70 + i * 50) + u * 0.08;
        (m.material as THREE.MeshBasicMaterial).opacity = 1 - THREE.MathUtils.smoothstep(u, 0.5, 1);
      });
    };
    out.spots = { '*': stoodAt(g, -0.25, -D / 2 + 0.85, 'meeting', work) };
  },

  /**
   * The PR shelf (협찬 선물 선반): a white open shelf with a lilac back, four shelves of what the
   * brands send — pastel gift boxes tied with ribbons, gift bags with tissue puffing out, a kraft PR
   * PACKAGE box, sneaker boxes, bottles and jars, a bunny plush, a bouquet in a vase, a THANK YOU
   * card — and a stack of boxes on top.
   */
  smPrShelf(g, W, D, _c, _def, _ctx) {
    const w = Math.min(W - 0.12, 1.8);
    const d = 0.38;
    const sh = 1.7;
    const z = -D / 2 + d / 2 + 0.02;
    part(g, box(w, sh, 0.012), '#e7defc', 0, sh / 2, z - d / 2 + 0.006);
    for (const sx of [-1, 1]) part(g, rbox(0.03, sh, d, 0.008), WHITE, sx * (w / 2 - 0.015), sh / 2, z);
    const ys = [0.04, 0.46, 0.88, 1.3, sh];
    for (const y of ys) part(g, rbox(w, 0.03, d, 0.008), WHITE, 0, y, z);
    const rnd = seeded(11);
    const pastel = [PINK, LILAC, MINT, SKY, PEACH, '#fff59d'];
    const giftBox = (x: number, y: number, bw2: number, bh2: number, col: string, rib: string) => {
      part(g, rbox(bw2, bh2, 0.22, 0.008), col, x, y + bh2 / 2, z + 0.02);
      part(g, box(bw2 + 0.002, bh2 + 0.002, 0.025), rib, x, y + bh2 / 2, z + 0.02, { outline: false });
      part(g, box(0.025, bh2 + 0.002, 0.222), rib, x, y + bh2 / 2, z + 0.02, { outline: false });
      for (const sx of [-1, 1]) part(g, ball(0.022), rib, x + sx * 0.022, y + bh2 + 0.008, z + 0.02, { outline: false }).scale.set(1.2, 0.5, 0.8);
    };
    const bag = (x: number, y: number, col: string) => {
      part(g, rbox(0.18, 0.22, 0.1, 0.006), col, x, y + 0.11, z + 0.04);
      part(g, ring(0.04, 0.005, Math.PI), '#ffffff', x, y + 0.22, z + 0.04, { outline: false });
      for (let i = 0; i < 3; i++) part(g, ball(0.035), '#ffffff', x - 0.035 + i * 0.035, y + 0.235, z + 0.04, { outline: false }).scale.set(1, 0.7, 0.6);
      tag(g, 'GLOWY', 0.1, 0.03, x, y + 0.12, z + 0.091, 'none', '#ad1457');
    };
    // Bottom shelf: a kraft PR box, a sneaker box, a gift bag.
    const y0 = ys[0] + 0.015;
    part(g, rbox(0.42, 0.24, 0.3, 0.008), '#d7b98e', -w / 2 + 0.3, y0 + 0.12, z);
    tag(g, 'PR PACKAGE 💗', 0.3, 0.06, -w / 2 + 0.3, y0 + 0.13, z + 0.152, 'none', '#6d4c41');
    part(g, rbox(0.34, 0.12, 0.2, 0.006), '#ffffff', 0.05, y0 + 0.06, z);
    part(g, box(0.342, 0.02, 0.202), '#7fd6b0', 0.05, y0 + 0.1, z, { outline: false });
    bag(w / 2 - 0.25, y0, '#ffd6e6');
    // Second: gift boxes in a row, a bunny plush.
    const y1 = ys[1] + 0.015;
    for (let i = 0; i < 4; i++) giftBox(-w / 2 + 0.2 + i * 0.26, y1, 0.2, 0.12 + rnd() * 0.12, pastel[i], i % 2 ? '#ffffff' : HOT);
    const bun = frame(g, w / 2 - 0.25, y1, z + 0.02);
    part(bun, ball(0.09), '#fff4f8', 0, 0.09, 0).scale.set(1, 0.95, 0.9);
    part(bun, ball(0.07), '#fff4f8', 0, 0.22, 0.01);
    for (const sx of [-1, 1]) {
      part(bun, ball(0.025), '#fff4f8', sx * 0.03, 0.32, 0).scale.set(0.8, 2.4, 0.7);
      part(bun, ball(0.01), '#2b1b10', sx * 0.025, 0.23, 0.07, { outline: false });
      part(bun, ball(0.012), '#ffb3cf', sx * 0.045, 0.21, 0.06, { outline: false });
    }
    // Third: bottles and jars, a bouquet.
    const y2 = ys[2] + 0.015;
    for (let i = 0; i < 6; i++) {
      const x = -w / 2 + 0.16 + i * 0.13;
      const tall = 0.08 + ((i * 5) % 3) * 0.04;
      part(g, cyl(0.03, 0.032, tall, 14), pastel[(i + 2) % pastel.length], x, y2 + tall / 2, z + 0.04);
      part(g, cyl(0.02, 0.02, 0.025, 12), i % 2 ? GOLD : '#ffffff', x, y2 + tall + 0.012, z + 0.04);
    }
    const vx = w / 2 - 0.25;
    part(g, cyl(0.06, 0.05, 0.16, 16), '#ffffff', vx, y2 + 0.08, z + 0.02, { material: GLASS });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      rod(g, V(vx, y2 + 0.12, z + 0.02), V(vx + Math.sin(a) * 0.07, y2 + 0.28, z + 0.02 + Math.cos(a) * 0.05), 0.004, '#7cb342');
      part(g, ball(0.035), ['#ffb3cf', '#ffffff', '#ffd3bd', '#e8d6ff'][i % 4], vx + Math.sin(a) * 0.07, y2 + 0.29, z + 0.02 + Math.cos(a) * 0.05);
    }
    // Top shelf: two gift bags, a THANK YOU card.
    const y3 = ys[3] + 0.015;
    bag(-w / 2 + 0.25, y3, '#e8dcff');
    bag(-w / 2 + 0.5, y3, '#d6f5ea');
    const card = frame(g, 0.25, y3, z + 0.06, 0.15);
    part(card, box(0.2, 0.14, 0.006), '#ffffff', 0, 0.07, 0, { rx: -0.15 });
    tag(card, 'THANK YOU 💗', 0.18, 0.05, 0, 0.075, 0.006, 'none', HOT, 0, -0.15);
    giftBox(w / 2 - 0.3, y3, 0.24, 0.18, PEACH, '#ffffff');
    // The stack on top.
    giftBox(-0.3, sh + 0.015, 0.3, 0.16, LILAC, '#ffffff');
    giftBox(-0.3, sh + 0.19, 0.2, 0.12, PINK, '#ffffff');
    giftBox(0.3, sh + 0.015, 0.26, 0.2, MINT, HOT);
  },
};

// ---- Paintings ----

/** The storyboard notebook open: six 9:16 frames sketched, the beats under them. */
function paintStoryboard(c: CanvasRenderingContext2D) {
  c.fillStyle = '#fffdf7';
  c.fillRect(0, 0, 256, 180);
  c.fillStyle = '#e8e0d0';
  c.fillRect(127, 0, 2, 180);
  const beats = ['#1 훅 3초', '#2 문제', '#3 꿀팁①', '#4 꿀팁②', '#5 반전', '#6 저장!'];
  beats.forEach((b, i) => {
    const px = (i < 3 ? 10 : 138) + (i % 3) * 39;
    const y = 18;
    c.strokeStyle = '#5c6bc0';
    c.lineWidth = 1.5;
    c.strokeRect(px, y, 32, 57);
    // A stick figure, the phone frame's caption bar.
    c.beginPath();
    c.arc(px + 16, y + 20, 5, 0, Math.PI * 2);
    c.moveTo(px + 16, y + 25);
    c.lineTo(px + 16, y + 40);
    c.moveTo(px + 8, y + 30 - (i % 2) * 8);
    c.lineTo(px + 24, y + 30 - ((i + 1) % 2) * 8);
    c.moveTo(px + 16, y + 40);
    c.lineTo(px + 11, y + 52);
    c.moveTo(px + 16, y + 40);
    c.lineTo(px + 21, y + 52);
    c.stroke();
    c.fillStyle = '#ff8fb8';
    c.fillRect(px + 3, y + 5, 26, 5);
    write(c, b, px + 16, y + 68, 8, '#c2185b', 'center', true, 36);
  });
  write(c, '오늘의 릴스: 출근 전 5분 루틴', 10, 112, 9, '#1a4fb5', 'left', true, 110);
  write(c, 'BGM: 사르르 (sped up)', 10, 128, 8, '#555', 'left', false, 110);
  write(c, '✔ 자막 크게!  ✔ 3초 안에 훅', 138, 112, 8, '#2e7d32', 'left', true, 110);
  write(c, '협찬: GLOWY 세럼 노출 2회', 138, 128, 8, '#555', 'left', false, 110);
  c.strokeStyle = '#f48fb1';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(186, 150, 50, 12, 0, 0, Math.PI * 2);
  c.stroke();
  write(c, '조회수 100만 가자!', 186, 150, 9, '#d81b60', 'center');
}

/** The trend board's face: the week's top ten shorts, the space for notes, the sounds. */
function paintTrendBoard(c: CanvasRenderingContext2D) {
  c.fillStyle = '#fbfbf8';
  c.fillRect(0, 0, 1024, 568);
  write(c, '🔥 이번 주 떡상 숏폼 TOP 10', 22, 30, 26, INK);
  write(c, '11월 2주차 · 모먼트랩 트렌드 회의', 604, 30, 15, '#8a8293', 'right', false);
  const caps = ['이 춤 뭐야ㅋㅋ', '마라탕 먹방', '출근룩 3가지', '고양이 상자', '1분 메이크업', '챌린지 2탄', '혼밥 브이로그', '갓생 루틴', '집사 일상', '립 발색'];
  const views = ['482만', '310만', '128만', '96만', '87만', '72만', '61만', '55만', '48만', '41만'];
  for (let i = 0; i < 10; i++) {
    const x = 22 + (i % 5) * 114;
    const y = 58 + Math.floor(i / 5) * 186;
    shortThumb(c, x, y, 96, i, views[i], caps[i]);
    rounded(c, x - 6, y - 6, 24, 24, 12, i < 3 ? '#ff5fa2' : '#9d86e8');
    write(c, String(i + 1), x + 6, y + 6.5, 14, '#ffffff', 'center');
  }
  // Notes: hashtags (stuck on), and the blank for writing.
  write(c, '#해시태그', 22, 444, 15, '#8a8293');
  write(c, '메모 ✍', 360, 444, 15, '#8a8293');
  c.strokeStyle = '#ece6f0';
  c.lineWidth = 2;
  c.strokeRect(356, 456, 248, 100);
  // The right: the TV's place, and the rising sounds.
  c.fillStyle = '#f1eef6';
  c.fillRect(620, 18, 392, 250);
  write(c, '🎵 급상승 음원 TOP 5', 630, 300, 20, INK);
  const songs: Array<[string, string]> = [['사르르 (sped up)', '▲ 12'], ['월요일 출근송', '▲ 8'], ['냥냥 펀치', 'NEW'], ['반짝반짝 챌린지', '▲ 3'], ['새벽 감성 lo-fi', '▼ 2']];
  songs.forEach(([s, m], i) => {
    const y = 334 + i * 44;
    rounded(c, 630, y - 16, 372, 34, 8, i === 0 ? '#ffe3ee' : '#f7f4fa');
    write(c, `${i + 1}`, 648, y + 1, 16, i === 0 ? HOT : LILAC_D, 'center');
    write(c, s, 670, y + 1, 15, INK);
    write(c, m, 990, y + 1, 13, m.startsWith('▼') ? '#1e88e5' : '#e53935', 'right');
  });
}
/** The channel's numbers on the board's TV: views by day, reach, saves, shares. */
function paintTrendStats(c: CanvasRenderingContext2D) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 384, 216);
  c.fillStyle = LILAC_D;
  c.fillRect(0, 0, 384, 22);
  write(c, '📊 모먼트랩 채널 성과 · 최근 7일', 8, 11, 11, '#ffffff');
  const tiles: Array<[string, string, string]> = [['조회수', '1,284만', '+18%'], ['도달', '642만', '+9%'], ['저장', '8.2만', '+31%'], ['공유', '3.6만', '+12%']];
  tiles.forEach(([k, v, d], i) => {
    const x = 6 + i * 94;
    rounded(c, x, 28, 88, 46, 6, '#f7f4fd');
    write(c, k, x + 6, 39, 9, '#8a8293', 'left', false);
    write(c, v, x + 6, 56, 14, INK);
    write(c, d, x + 82, 66, 9, '#2e7d32', 'right');
  });
  c.strokeStyle = '#ff5fa2';
  c.lineWidth = 3;
  c.beginPath();
  const pts = [30, 38, 34, 52, 60, 88, 112];
  pts.forEach((p, i) => (i ? c.lineTo(24 + i * 56, 200 - p) : c.moveTo(24, 200 - p)));
  c.stroke();
  c.fillStyle = 'rgba(255,95,162,0.15)';
  c.lineTo(360, 200);
  c.lineTo(24, 200);
  c.fill();
  ['월', '화', '수', '목', '금', '토', '일'].forEach((d, i) => write(c, d, 24 + i * 56, 209, 8, '#9e9e9e', 'center', false));
}
/** Our channel against two others: followers, average views, posting rate. */
function paintBenchmark(c: CanvasRenderingContext2D) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 384, 216);
  c.fillStyle = '#7cc0f5';
  c.fillRect(0, 0, 384, 22);
  write(c, '🔎 인기 채널 벤치마킹', 8, 11, 11, '#ffffff');
  const rows: Array<[string, string, string, string, string]> = [
    ['@daily.moment', '52.1만', '38만', '주 5회', '#ffd3bd'],
    ['@ootd.hana', '31.4만', '22만', '주 3회', '#ffb3d1'],
    ['모먼트랩 (우리)', '18.7만', '14만', '주 4회', '#c9b6ff'],
  ];
  ['채널', '팔로워', '평균 조회', '업로드'].forEach((h, i) => write(c, h, [12, 170, 240, 310][i], 36, 9, '#8a8293', 'left', false));
  rows.forEach(([n, f, v, u, col], i) => {
    const y = 52 + i * 46;
    rounded(c, 6, y, 372, 40, 6, i === 2 ? '#f1ebff' : '#fafafa');
    c.fillStyle = col;
    c.beginPath();
    c.arc(24, y + 20, 12, 0, Math.PI * 2);
    c.fill();
    write(c, n, 42, y + 20, 10, INK, 'left', true, 120);
    write(c, f, 170, y + 20, 11, INK);
    write(c, v, 240, y + 20, 11, INK);
    write(c, u, 310, y + 20, 11, INK);
  });
  write(c, '💡 훅은 1초 안에 · 자막은 화면 중앙', 8, 202, 10, '#d81b60');
}
/** The campaign's budget table. */
function paintBudget(c: CanvasRenderingContext2D) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 384, 216);
  c.fillStyle = '#7fd6b0';
  c.fillRect(0, 0, 384, 22);
  write(c, '💰 GLOWY 캠페인 예산안', 8, 11, 11, '#ffffff');
  const rows: Array<[string, string, number]> = [['크리에이터 섭외', '960만', 40], ['광고 집행 (릴스)', '720만', 30], ['라이브 커머스', '360만', 15], ['촬영·편집', '240만', 10], ['이벤트·굿즈', '120만', 5]];
  rows.forEach(([k, v, pc], i) => {
    const y = 34 + i * 30;
    write(c, k, 10, y + 10, 10, INK);
    c.fillStyle = '#eef8f3';
    c.fillRect(140, y + 2, 160, 16);
    c.fillStyle = ['#ff8fb8', '#9d86e8', '#7cc0f5', '#7fd6b0', '#ffad7a'][i];
    c.fillRect(140, y + 2, 160 * (pc / 40), 16);
    write(c, v, 374, y + 10, 10, INK, 'right');
  });
  c.fillStyle = '#eee';
  c.fillRect(8, 186, 368, 1);
  write(c, '총 예산', 10, 202, 11, INK);
  write(c, '2,400만 원', 374, 202, 13, '#d81b60', 'right');
}
/** LIVE 💗 in neon tubes, for the live desk's panel. */
function paintNeonLive(c: CanvasRenderingContext2D) {
  c.clearRect(0, 0, 256, 128);
  neonText(c, 'LIVE', 112, 64, 64, '#ff5fa2');
  neonText(c, '💗', 210, 66, 54, '#ff9ad6');
}
/** 오늘도 반짝 ✨ in neon, for the photo wall. */
function paintNeonShine(c: CanvasRenderingContext2D) {
  c.clearRect(0, 0, 512, 160);
  neonText(c, '오늘도 반짝', 230, 82, 74, '#ffffff', '#ff7ab8');
  neonText(c, '✨', 450, 76, 60, '#fff59d', '#ffd54f');
}
function neonText(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, core: string, halo = core) {
  c.font = `bold ${size}px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = c.lineCap = 'round';
  c.save();
  c.shadowColor = halo;
  for (const [blur, lw, a] of [[22, 10, 0.35], [10, 6, 0.7]] as Array<[number, number, number]>) {
    c.shadowBlur = blur;
    c.lineWidth = lw;
    c.globalAlpha = a;
    c.strokeStyle = halo;
    c.strokeText(s, x, y);
  }
  c.restore();
  c.lineWidth = 3;
  c.strokeStyle = core;
  c.strokeText(s, x, y);
  c.fillStyle = core;
  c.globalAlpha = 0.25;
  c.fillText(s, x, y);
  c.globalAlpha = 1;
}
/** A wall of pastel roses, tight together. */
function paintRoses(c: CanvasRenderingContext2D) {
  c.fillStyle = '#f7c9d9';
  c.fillRect(0, 0, 512, 576);
  const rnd = seeded(3);
  const cols = ['#ffd1e1', '#ffb3cf', '#fff0f5', '#e8d6ff', '#ffc4d6', '#ffe4d6', '#f8a5c2'];
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 512;
    const y = rnd() * 576;
    const r = 16 + rnd() * 14;
    const col = cols[Math.floor(rnd() * cols.length)];
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(190,90,130,0.35)';
    c.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(x + (k - 1) * 2, y + (k - 1), r * (0.75 - k * 0.22), rnd() * 6, rnd() * 6 + 4);
      c.stroke();
    }
  }
  for (let i = 0; i < 40; i++) {
    c.fillStyle = '#9ccc9c';
    c.beginPath();
    c.ellipse(rnd() * 512, rnd() * 576, 8, 4, rnd() * 3, 0, Math.PI * 2);
    c.fill();
  }
}
/** The paper sweep: lilac at the top fading to peach where it meets the floor. */
function paintSweep(c: CanvasRenderingContext2D) {
  const gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#d9c9ff');
  gr.addColorStop(0.55, '#f3d3ee');
  gr.addColorStop(1, '#ffd9c7');
  c.fillStyle = gr;
  c.fillRect(0, 0, 64, 256);
}
/** The brand's brief on the tablet: what the video must do. */
function paintBrief(c: CanvasRenderingContext2D) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 128);
  c.fillStyle = '#ff9fc4';
  c.fillRect(0, 0, 192, 20);
  write(c, 'GLOWY 협찬 가이드', 8, 10, 10, '#ffffff');
  ['✔ 제품명 2회 언급', '✔ #광고 #유료광고 표기', '✔ 사용감 클로즈업 3초', '✔ 업로드 11/15 19:00'].forEach((s, i) => write(c, s, 8, 36 + i * 22, 10, i === 1 ? '#d81b60' : INK, 'left', i === 1, 176));
}
/** The reaction wall's screen: the reel, the counters and the views by hour, the comments' panel. */
function paintReaction(c: CanvasRenderingContext2D) {
  c.fillStyle = '#1c1826';
  c.fillRect(0, 0, 512, 288);
  // The reel, 9:16, playing.
  shortThumb(c, 14, 14, 146, 5, '128만', '챌린지 2탄 💃');
  write(c, '💗 12.4만', 150, 210, 10, '#ffffff', 'right');
  write(c, '💬 1,203', 150, 228, 10, '#ffffff', 'right');
  // The counters.
  rounded(c, 174, 14, 196, 26, 6, '#ff5fa2');
  write(c, '🔥 인기 급상승 3위', 272, 27.5, 13, '#ffffff', 'center');
  const rows: Array<[string, string]> = [['조회수', '1,284,302'], ['좋아요', '124,118'], ['저장', '8,240'], ['공유', '3,612']];
  rows.forEach(([k, v], i) => {
    const y = 52 + i * 30;
    write(c, k, 180, y + 10, 11, '#b8aecb', 'left', false);
    write(c, v, 364, y + 10, i === 0 ? 17 : 14, '#ffffff', 'right');
  });
  // Views by hour.
  c.strokeStyle = '#7cf0c8';
  c.lineWidth = 3;
  c.beginPath();
  [8, 14, 22, 40, 58, 66, 84, 98].forEach((v, i) => (i ? c.lineTo(180 + i * 26, 276 - v) : c.moveTo(180, 276 - v)));
  c.stroke();
  write(c, '시간대별 조회수', 180, 176, 10, '#b8aecb', 'left', false);
  // The comments' panel (its column runs over it while watched).
  rounded(c, 380, 14, 124, 260, 8, '#ffffff');
  write(c, '실시간 댓글', 442, 30, 11, INK, 'center');
}

/** The same scatter every time it's painted. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
