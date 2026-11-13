import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';
import { pavementSign } from './dentist';
import { frontDesk } from './frontDesk';

/**
 * The tech company drawn as itself (2026-10-27 workplace pipeline, at the user's request): a Korean
 * IT company's floor in 판교, 네오바이트 (NEOBYTE) — white sit-stand desks in rows with a felt
 * divider at the back, one wide monitor with the code and a laptop on a stand with the team's
 * messenger, the company tumbler and an ID badge on its lanyard; and what it was missing: a desk
 * raised to stand at, the server room's corner (two racks behind smoked doors, LEDs going, a KVM
 * console pulled out to check the pods, a drive swapped), the team's scrum board of sticky notes
 * with the sprint's burndown, a felt phone-booth pod for video calls, the hackathon table of
 * stickered laptops and pizza with its countdown, and the lounge's beanbags. Teal and navy, the
 * company's colours — not the office's suits and paper or the game studio's purple. Each use puts the
 * worker where it's done: sat typing at the code, sat back hearing a code review with a notebook,
 * writing the design doc on paper, stood typing at the raised desk, stood at the console, crouched
 * at the drive bays, round the board for the stand-up or moving a ticket along it, sat in the pod
 * talking, sat at the hackathon table typing or eating a slice, sunk in a beanbag.
 */

const NAVY = '#1f2a44';
const TEAL = '#00a99d';
const MINT = '#64ffda';
const BLACK = '#24262b';
const ALU = '#c3c9ce';
const CHROME = '#dfe4e8';
const DESK = '#f4f5f6';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const MONO = '"Consolas","D2Coding","Menlo",monospace';

/** Lit parts (LEDs, screens, signs): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
/** See-through parts: the booth's door, the racks' smoked doors, the booth's roof light. */
const GLASS = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.22, depthWrite: false });
const SMOKE = new THREE.MeshToonMaterial({ color: '#1b2430', transparent: true, opacity: 0.45, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
/** A pie of `r` with `of` of its slices left (a pizza with some eaten), lying flat. */
const pie = (r: number, h: number, left: number, of: number) => shape(`pie${r},${h},${left},${of}`, () => new THREE.CylinderGeometry(r, r, h, 24, 1, false, 0, (Math.PI * 2 * left) / of));

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
  m.rotation.set(rx, ry, 0, 'YXZ');
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
/** A group placed and turned in `g` (a monitor's panel, a laptop's lid). */
function frame(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Group {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.set(rx, ry, 0, 'YXZ');
  g.add(f);
  return f;
}
/** A spot sat at (x, z) on a seat `seat` high, facing `yaw` (π: in at the object from its front), and what's done there. */
function satAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, seat = 0.48, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', x, seat, z, yaw, seat);
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

// ---- Small things ----

/**
 * An ergonomic mesh chair facing +z in its own group, its seat `h` up: a five-star base on casters,
 * the gas lift, a seat with a waterfall edge, the mesh back in its frame with the lumbar pad, a
 * headrest on its stalk and the arms on their posts.
 */
function ergoChair(c: THREE.Object3D, h: number, accent: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.26, 0.045, Math.cos(a) * 0.26), 0.016, '#3a3d44');
    part(c, ball(0.025), BLACK, Math.sin(a) * 0.26, 0.025, Math.cos(a) * 0.26, { outline: false });
  }
  part(c, cyl(0.025, 0.025, h - 0.12, 10), CHROME, 0, 0.08 + (h - 0.12) / 2, 0, { outline: false });
  part(c, rbox(0.16, 0.05, 0.16, 0.015), '#3a3d44', 0, h - 0.04, 0, { outline: false });
  part(c, rbox(0.48, 0.07, 0.46, 0.035), '#3f444c', 0, h + 0.01, 0.01);
  part(c, rbox(0.46, 0.04, 0.12, 0.02), '#3f444c', 0, h - 0.005, 0.22, { rx: 0.35 });
  // The back: a frame tipped back a little, the mesh in it, the lumbar pad, the headrest.
  const back = frame(c, 0, h + 0.07, -0.23, 0, -0.14);
  part(back, rbox(0.46, 0.6, 0.04, 0.05), '#2c3036', 0, 0.32, 0);
  part(back, box(0.4, 0.52, 0.006), shade(accent, 0.55), 0, 0.33, 0.022, { outline: false });
  for (let k = 0; k < 7; k++) part(back, box(0.4, 0.004, 0.004), shade(accent, 0.4), 0, 0.1 + k * 0.075, 0.026, { outline: false });
  part(back, rbox(0.3, 0.07, 0.04, 0.02), accent, 0, 0.17, 0.035);
  part(back, cyl(0.012, 0.012, 0.12, 8), '#3a3d44', 0, 0.66, -0.01, { outline: false });
  part(back, rbox(0.26, 0.09, 0.05, 0.03), '#2c3036', 0, 0.75, 0.01, { rx: 0.1 });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.035, 0.2, 0.035, 0.008), '#2c3036', sx * 0.25, h + 0.11, -0.04, { outline: false });
    part(c, rbox(0.07, 0.025, 0.22, 0.012), '#2c3036', sx * 0.25, h + 0.22, -0.02);
  }
}

/** A thin laptop open on the top at (x, y, z), turned `ry`, its lid tipped back; the lid's inside is `screen` (lit in `use` if given). */
function laptop(g: THREE.Object3D, x: number, y: number, z: number, ry: number, tex: THREE.Texture | null, opts: { color?: string; stickers?: string[]; use?: THREE.Object3D; w?: number; lid?: number } = {}) {
  const w = opts.w ?? 0.32;
  const d = w * 0.68;
  const col = opts.color ?? '#b8bec4';
  const f = frame(g, x, y, z, ry);
  part(f, rbox(w, 0.014, d, 0.006), col, 0, 0.007, 0);
  part(f, box(w * 0.86, 0.002, d * 0.42), '#2a2d33', 0, 0.0145, -d * 0.12, { outline: false });
  part(f, box(w * 0.3, 0.002, d * 0.26), shade(col, 0.88), 0, 0.0145, d * 0.3, { outline: false });
  // The lid, hinged at the back edge, tipped back 105°.
  const tip = opts.lid ?? -0.26;
  const lid = frame(f, 0, 0.014, -d / 2, 0, tip);
  part(lid, rbox(w, d, 0.01, 0.006), col, 0, d / 2, -0.004);
  part(lid, box(w * 0.93, d * 0.88, 0.001), '#15171b', 0, d / 2, 0.0015, { outline: false });
  if (tex) {
    const s = sheet(lid, tex, w * 0.9, d * 0.84, 0, d / 2, 0.0025);
    if (!opts.use) (s.material as THREE.MeshBasicMaterial).color.set('#8a93a3');
    else {
      (s.material as THREE.MeshBasicMaterial).color.set('#5d6573');
      const on = frame(opts.use, x, y, z, ry);
      const lid2 = frame(on, 0, 0.014, -d / 2, 0, tip);
      sheet(lid2, tex, w * 0.9, d * 0.84, 0, d / 2, 0.003);
    }
  }
  // Stickers on the back of the lid.
  (opts.stickers ?? []).forEach((c, i) => {
    const a = (i * 2.4) % (Math.PI * 2);
    part(lid, cyl(0.026 + (i % 2) * 0.008, 0.026 + (i % 2) * 0.008, 0.002, 14), c, Math.cos(a) * w * 0.28, d / 2 + Math.sin(a) * d * 0.25, -0.0095, { rx: Math.PI / 2, outline: false });
  });
}

/** The company's insulated tumbler (teal, the logo on it) at (x, y, z). */
function tumbler(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  part(g, cyl(0.036, 0.03, 0.17, 14), TEAL, x, y + 0.085, z);
  part(g, cyl(0.038, 0.038, 0.025, 14), '#eceff1', x, y + 0.18, z, { outline: false });
  part(g, ring(0.03, 0.008, Math.PI), '#eceff1', x + Math.cos(ry) * 0.04, y + 0.13, z - Math.sin(ry) * 0.04, { rz: Math.PI / 2, ry, outline: false });
  label(g, 'N', 0.03, 0.03, x + Math.sin(ry) * 0.035, y + 0.1, z + Math.cos(ry) * 0.035, 'none', '#ffffff', ry);
}

/** A little succulent in a white pot at (x, y, z). */
function succulent(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.04, 0.032, 0.06, 12), '#fafafa', x, y + 0.03, z);
  part(g, cyl(0.036, 0.036, 0.006, 12), '#6d4c41', x, y + 0.058, z, { outline: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(g, ball(0.018), i % 2 ? '#81c784' : '#66bb6a', x + Math.cos(a) * 0.018, y + 0.072, z + Math.sin(a) * 0.018, { outline: false }).scale.set(0.7, 1.3, 0.7);
  }
  part(g, ball(0.016), '#a5d6a7', x, y + 0.085, z, { outline: false });
}

/** An employee ID card on its teal lanyard, lying on the top at (x, y, z). */
function idBadge(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const f = frame(g, x, y, z, ry);
  part(f, ring(0.09, 0.006), TEAL, 0, 0.004, -0.1, { rx: Math.PI / 2, outline: false }).scale.set(0.7, 1.3, 1);
  part(f, rbox(0.055, 0.004, 0.085, 0.004), '#ffffff', 0, 0.004, 0.02);
  part(f, box(0.055, 0.0045, 0.02), NAVY, 0, 0.005, -0.012, { outline: false });
  part(f, box(0.022, 0.0045, 0.026), '#ffcc80', 0, 0.005, 0.02, { outline: false });
}

/** Over-ear noise-cancelling headphones hung on a hook at (x, y, z), facing +z. */
function headphones(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, ring(0.075, 0.01, Math.PI), '#e0e0e0', x, y, z, { outline: false });
  for (const sx of [-1, 1]) part(g, rbox(0.03, 0.08, 0.06, 0.02), '#eeeeee', x + sx * 0.075, y - 0.025, z);
}

/** An energy drink or cola can at (x, y, z). */
function can(g: THREE.Object3D, x: number, y: number, z: number, col: string, band = '#212121') {
  part(g, cyl(0.03, 0.03, 0.12, 12), col, x, y + 0.06, z);
  part(g, cyl(0.0305, 0.0305, 0.035, 12), band, x, y + 0.06, z, { outline: false });
  part(g, cyl(0.026, 0.03, 0.008, 12), CHROME, x, y + 0.124, z, { outline: false });
}

/** A sticky note on the board at (x, y, z) with its words, tipped a touch. */
function sticky(g: THREE.Object3D, x: number, y: number, z: number, col: string, text: string, tilt = 0) {
  part(g, box(0.12, 0.09, 0.003), col, x, y, z, { rz: tilt, outline: false });
  label(g, text, 0.11, 0.032, x, y + 0.008, z + 0.002, 'none', '#37474f');
}

/** A face on a round magnet (the team on the board), at (x, y, z). */
function faceMagnet(g: THREE.Object3D, x: number, y: number, z: number, skin: string, hair: string) {
  part(g, cyl(0.028, 0.028, 0.012, 16), '#ffffff', x, y, z, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.022, 0.022, 0.004, 16), skin, x, y, z + 0.007, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.022, 0.022, 0.004, 16), hair, x, y + 0.012, z + 0.0075, { rx: Math.PI / 2, outline: false }).scale.set(1, 1, 0.45);
}

// ---- Pictures ----

/** Lines of coloured code from (x, y) down, `lh` apart; numbered when `nx` is given. */
function codeLines(x: CanvasRenderingContext2D, lines: Array<Array<[string, string]>>, cx0: number, y0: number, lh: number, nx?: number) {
  lines.forEach((parts, i) => {
    const y = y0 + i * lh;
    if (nx !== undefined) {
      x.fillStyle = '#5a6070';
      x.fillText(String(i + 1).padStart(2), nx, y);
    }
    let cx = cx0;
    for (const [t, col] of parts) {
      x.fillStyle = col;
      x.fillText(t, cx, y);
      cx += x.measureText(t).width;
    }
  });
}

/** The IDE: a Kotlin service with the retry being written, the file tree, the branch and the tests in the status bar. */
const ideTex = () =>
  painted('techIde', 256, 144, (x) => {
    x.fillStyle = '#1f2430';
    x.fillRect(0, 0, 256, 144);
    x.fillStyle = '#171b24';
    x.fillRect(0, 0, 256, 12);
    x.fillStyle = '#1f2430';
    x.fillRect(46, 1, 74, 11);
    x.font = `7px ${MONO}`;
    x.fillStyle = '#e6e6e6';
    x.fillText('PaymentRetry.kt', 50, 9);
    x.fillStyle = '#7d8590';
    x.fillText('OrderApi.kt', 126, 9);
    // The file tree.
    x.fillStyle = '#191d26';
    x.fillRect(0, 12, 44, 124);
    x.font = `6px ${MONO}`;
    ['▾ pay-api', '  ▾ retry', '    Payment…', '  ▸ order', '  ▸ pg', '▾ test', '  RetryTest', 'build.gradle'].forEach((t, i) => {
      x.fillStyle = i === 2 ? '#ffffff' : '#8b93a1';
      if (i === 2) {
        x.fillStyle = '#2b3445';
        x.fillRect(0, 15 + i * 9, 44, 9);
        x.fillStyle = '#ffffff';
      }
      x.fillText(t, 2, 22 + i * 9);
    });
    x.font = `7px ${MONO}`;
    codeLines(
      x,
      [
        [['package ', '#ff7b72'], ['com.neobyte.pay', '#e6e6e6']],
        [],
        [['class ', '#ff7b72'], ['PaymentRetry', '#ffa657'], ['(', '#e6e6e6']],
        [['  private val ', '#ff7b72'], ['pg: ', '#79c0ff'], ['PgClient', '#ffa657']],
        [[') {', '#e6e6e6']],
        [['  // 결제 실패 시 3번까지 다시 시도', '#8b949e']],
        [['  suspend fun ', '#ff7b72'], ['pay', '#d2a8ff'], ['(o: ', '#e6e6e6'], ['Order', '#ffa657'], [') {', '#e6e6e6']],
        [['    repeat', '#d2a8ff'], ['(3) { n ->', '#e6e6e6']],
        [['      val ', '#ff7b72'], ['r = pg.', '#e6e6e6'], ['charge', '#d2a8ff'], ['(o)', '#e6e6e6']],
        [['      if ', '#ff7b72'], ['(r.ok) ', '#e6e6e6'], ['return ', '#ff7b72'], ['r', '#e6e6e6']],
        [['      delay', '#d2a8ff'], ['(200L * (n + 1))', '#79c0ff']],
        [['    }', '#e6e6e6']],
        [['    throw ', '#ff7b72'], ['PayFail', '#ffa657'], ['("결제 실패")', '#a5d6ff']],
        [['  }', '#e6e6e6']],
      ],
      62,
      22,
      8.4,
      47,
    );
    x.fillStyle = 'rgba(255,255,255,0.06)';
    x.fillRect(44, 92, 212, 9);
    // The status bar: the branch, the tests.
    x.fillStyle = TEAL;
    x.fillRect(0, 136, 256, 8);
    x.fillStyle = '#ffffff';
    x.font = `6px ${MONO}`;
    x.fillText('⎇ feature/pay-retry   ✔ 테스트 42개 통과   Kotlin  UTF-8', 4, 142);
  });

/** The team messenger: channels down the side, the backend channel's messages. */
const msgTex = () =>
  painted('techMsg', 192, 128, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 192, 128);
    x.fillStyle = NAVY;
    x.fillRect(0, 0, 54, 128);
    x.font = `bold 8px ${FONT}`;
    x.fillStyle = '#ffffff';
    x.fillText('NEOBYTE', 5, 12);
    x.font = `7px ${FONT}`;
    ['# 공지', '# dev-backend', '# 배포', '# 코드리뷰', '# 점심메뉴', '# random'].forEach((t, i) => {
      if (i === 1) {
        x.fillStyle = TEAL;
        x.fillRect(0, 20 + i * 12, 54, 11);
      }
      x.fillStyle = i === 1 ? '#ffffff' : '#aeb7c6';
      x.fillText(t, 5, 28 + i * 12);
    });
    x.fillStyle = '#ff5252';
    x.beginPath();
    x.arc(47, 60, 3.5, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#263238';
    x.font = `bold 8px ${FONT}`;
    x.fillText('# dev-backend', 60, 12);
    x.fillStyle = '#e0e0e0';
    x.fillRect(54, 16, 138, 1);
    const msgs: Array<[string, string, string]> = [
      ['#7e57c2', '박서윤', 'PR #482 리뷰 부탁드려요 🙏'],
      ['#37474f', '김지훈 팀장', '오늘 3시 스프린트 리뷰!'],
      ['#26a69a', '이도현', 'stage 배포 완료 ✅'],
      ['#e53935', '모니터링봇', '🔴 결제 API 응답 지연 320ms'],
    ];
    msgs.forEach(([c, who, t], i) => {
      const y = 26 + i * 24;
      x.fillStyle = c;
      x.fillRect(58, y - 6, 12, 12);
      x.fillStyle = '#263238';
      x.font = `bold 7px ${FONT}`;
      x.fillText(who, 74, y);
      x.font = `7px ${FONT}`;
      x.fillStyle = '#455a64';
      x.fillText(t, 74, y + 9);
    });
    x.strokeStyle = '#cfd8dc';
    x.strokeRect(58, 116, 128, 9);
    x.fillStyle = '#90a4ae';
    x.font = `6px ${FONT}`;
    x.fillText('메시지 보내기…', 62, 122);
  });

/** A pull request: its title, the diff in red and green, the approve button. */
const prTex = () =>
  painted('techPr', 256, 144, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 256, 144);
    x.fillStyle = '#f6f8fa';
    x.fillRect(0, 0, 256, 30);
    x.fillStyle = '#24292f';
    x.font = `bold 9px ${FONT}`;
    x.fillText('결제 재시도 로직 추가 #482', 6, 13);
    x.fillStyle = '#1f883d';
    x.fillRect(6, 18, 34, 9);
    x.fillStyle = '#ffffff';
    x.font = `bold 6px ${FONT}`;
    x.fillText('Open', 13, 25);
    x.fillStyle = '#57606a';
    x.font = `6px ${FONT}`;
    x.fillText('seoyun → main · 파일 3개 변경 · +48 −12', 46, 25);
    x.font = `6.5px ${MONO}`;
    const rows: Array<[string, string]> = [
      [' ', '  suspend fun pay(o: Order) {'],
      ['-', '    return pg.charge(o)'],
      ['+', '    repeat(3) { n ->'],
      ['+', '      val r = pg.charge(o)'],
      ['+', '      if (r.ok) return r'],
      ['+', '      delay(200L * (n + 1))'],
      ['+', '    }'],
      [' ', '  }'],
    ];
    rows.forEach(([k, t], i) => {
      const y = 36 + i * 10;
      x.fillStyle = k === '+' ? '#dafbe1' : k === '-' ? '#ffebe9' : '#ffffff';
      x.fillRect(0, y, 256, 10);
      x.fillStyle = k === '+' ? '#1a7f37' : k === '-' ? '#cf222e' : '#57606a';
      x.fillText(`${k} ${t}`, 6, y + 7.5);
    });
    // A review comment and the button.
    x.fillStyle = '#fff8c5';
    x.fillRect(20, 118, 150, 18);
    x.fillStyle = '#6e5600';
    x.font = `6.5px ${FONT}`;
    x.fillText('💬 지수 백오프면 더 좋겠어요!', 26, 130);
    x.fillStyle = '#1f883d';
    x.fillRect(184, 118, 66, 18);
    x.fillStyle = '#ffffff';
    x.font = `bold 7px ${FONT}`;
    x.fillText('✔ Approve', 192, 130);
  });

/** The KVM console: a terminal on the cluster, the pods, one in trouble, a CPU graph. */
const termTex = () =>
  painted('techTerm', 192, 112, (x) => {
    x.fillStyle = '#0d1117';
    x.fillRect(0, 0, 192, 112);
    x.font = `6.5px ${MONO}`;
    const rows: Array<[string, string]> = [
      ['#7ee787', 'admin@neo-k8s:~$ kubectl get pods -n pay'],
      ['#8b949e', 'NAME              READY  STATUS'],
      ['#c9d1d9', 'pay-api-7d9f      2/2    Running'],
      ['#c9d1d9', 'order-api-5c2b    2/2    Running'],
      ['#ff7b72', 'batch-sync-1a0e   0/1    CrashLoop'],
      ['#c9d1d9', 'gateway-88f1      1/1    Running'],
      ['#7ee787', 'admin@neo-k8s:~$ df -h /data'],
      ['#ffa657', '/dev/sdc  디스크 오류 감지 ⚠'],
    ];
    rows.forEach(([c, t], i) => {
      x.fillStyle = c;
      x.fillText(t, 4, 10 + i * 8.5);
    });
    // CPU graph along the foot.
    x.strokeStyle = '#30363d';
    x.strokeRect(4, 80, 184, 28);
    x.strokeStyle = MINT;
    x.beginPath();
    for (let i = 0; i <= 46; i++) {
      const v = 0.45 + 0.25 * Math.sin(i * 0.5) + 0.15 * Math.sin(i * 1.7) + (i > 38 ? 0.25 : 0);
      x.lineTo(4 + i * 4, 106 - v * 22);
    }
    x.stroke();
    x.fillStyle = '#8b949e';
    x.fillText('CPU  72%', 150, 88);
  });

/** The scrum board's face: the sprint, its columns, the burndown taped on the right. */
const scrumTex = () =>
  painted('techScrum', 512, 288, (x) => {
    x.fillStyle = '#fbfcfc';
    x.fillRect(0, 0, 512, 288);
    // The header.
    x.fillStyle = NAVY;
    x.fillRect(0, 0, 512, 30);
    x.fillStyle = '#ffffff';
    x.font = `bold 16px ${FONT}`;
    x.fillText('스프린트 24', 10, 21);
    x.fillStyle = MINT;
    x.font = `12px ${FONT}`;
    x.fillText('10.21 – 11.01 · 목표: 간편결제 v2 출시', 106, 20);
    // Four columns in tape, their heads.
    const cols = ['할 일', '진행 중', '코드 리뷰', '완료 ✔'];
    const cw = 92;
    cols.forEach((c, i) => {
      const cx = 6 + i * cw;
      x.fillStyle = ['#eceff1', '#e0f2f1', '#fff3e0', '#e8f5e9'][i];
      x.fillRect(cx, 36, cw - 6, 22);
      x.fillStyle = '#263238';
      x.font = `bold 13px ${FONT}`;
      x.fillText(c, cx + 8, 52);
      x.fillStyle = '#90a4ae';
      x.fillRect(cx + cw - 4, 36, 2, 246);
    });
    // The burndown, a printout taped up on the right.
    const bx = 380;
    x.fillStyle = '#ffffff';
    x.fillRect(bx, 40, 124, 110);
    x.strokeStyle = '#b0bec5';
    x.strokeRect(bx, 40, 124, 110);
    x.fillStyle = '#263238';
    x.font = `bold 11px ${FONT}`;
    x.fillText('번다운 차트', bx + 8, 56);
    x.strokeStyle = '#90a4ae';
    x.beginPath();
    x.moveTo(bx + 12, 64);
    x.lineTo(bx + 12, 140);
    x.lineTo(bx + 116, 140);
    x.stroke();
    x.setLineDash([4, 3]);
    x.beginPath();
    x.moveTo(bx + 12, 68);
    x.lineTo(bx + 116, 140);
    x.stroke();
    x.setLineDash([]);
    x.strokeStyle = '#e53935';
    x.lineWidth = 2.5;
    x.beginPath();
    [[12, 68], [24, 70], [36, 82], [48, 84], [60, 98], [72, 104], [84, 112]].forEach(([px, py]) => x.lineTo(bx + px, py));
    x.stroke();
    x.lineWidth = 1;
    // The team's rules under it.
    x.fillStyle = '#fffde7';
    x.fillRect(bx, 160, 124, 116);
    x.fillStyle = '#5d4037';
    x.font = `bold 11px ${FONT}`;
    x.fillText('스크럼 약속', bx + 8, 177);
    x.font = `10px ${FONT}`;
    ['① 어제 한 일', '② 오늘 할 일', '③ 막힌 부분', '⏱ 15분 안에!', '⚠ 금요일 배포 금지'].forEach((t, i) => x.fillText(t, bx + 8, 196 + i * 17));
  });

/** A video call: four faces in a grid, the meeting's name and time, the mute and leave buttons. */
const callTex = () =>
  painted('techCall', 192, 128, (x) => {
    x.fillStyle = '#1c1f26';
    x.fillRect(0, 0, 192, 128);
    x.fillStyle = '#ffffff';
    x.font = `bold 7px ${FONT}`;
    x.fillText('주간 싱크 (서울 · 샌프란시스코)  00:12:31', 6, 10);
    const people: Array<[string, string, string, string]> = [
      ['김지훈 팀장', '#eac09a', '#1a1a1a', '#37474f'],
      ['Alex (SF)', '#f1c7a8', '#c48a3a', '#5c6bc0'],
      ['박서윤', '#f8d9c0', '#5b3a1e', '#7e57c2'],
      ['나', '#c99a6e', '#2b1b10', TEAL],
    ];
    people.forEach(([n, skin, hair, shirt], i) => {
      const cx = 6 + (i % 2) * 92;
      const cy = 15 + Math.floor(i / 2) * 50;
      x.fillStyle = ['#2f3a4a', '#3c3550', '#2c4440', '#3a3a3a'][i];
      x.fillRect(cx, cy, 88, 46);
      if (i === 2) {
        x.strokeStyle = '#69f0ae';
        x.lineWidth = 2;
        x.strokeRect(cx + 1, cy + 1, 86, 44);
        x.lineWidth = 1;
      }
      x.fillStyle = shirt;
      x.beginPath();
      x.ellipse(cx + 44, cy + 46, 20, 14, 0, Math.PI, 0);
      x.fill();
      x.fillStyle = skin;
      x.beginPath();
      x.arc(cx + 44, cy + 22, 10, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = hair;
      x.beginPath();
      x.arc(cx + 44, cy + 19, 10.5, Math.PI, 0);
      x.fill();
      x.fillStyle = 'rgba(0,0,0,0.5)';
      x.fillRect(cx + 2, cy + 36, x.measureText(n).width + 8, 9);
      x.fillStyle = '#ffffff';
      x.font = `6px ${FONT}`;
      x.fillText(n, cx + 5, cy + 43);
    });
    x.fillStyle = '#2b2f38';
    x.fillRect(0, 116, 192, 12);
    ['🎤', '📷', '🖥️'].forEach((t, i) => {
      x.font = `7px ${FONT}`;
      x.fillText(t, 62 + i * 18, 125);
    });
    x.fillStyle = '#e53935';
    x.fillRect(122, 118, 26, 8);
    x.fillStyle = '#ffffff';
    x.font = `bold 5px ${FONT}`;
    x.fillText('나가기', 126, 124);
  });

/** The hackathon prototype: code on the left, the app in a phone frame on the right. */
const hackTex = () =>
  painted('techHack', 192, 128, (x) => {
    x.fillStyle = '#1f2430';
    x.fillRect(0, 0, 192, 128);
    x.font = `6px ${MONO}`;
    codeLines(
      x,
      [
        [['const ', '#ff7b72'], ['menu', '#79c0ff'], [' = await', '#e6e6e6']],
        [['  ai.', '#e6e6e6'], ['recommend', '#d2a8ff'], ['({', '#e6e6e6']],
        [['    weather: ', '#79c0ff'], ['"비"', '#a5d6ff'], [',', '#e6e6e6']],
        [['    budget: ', '#79c0ff'], ['9000', '#79c0ff']],
        [['  });', '#e6e6e6']],
        [['render', '#d2a8ff'], ['(<', '#e6e6e6'], ['Card', '#7ee787'], [' />)', '#e6e6e6']],
        [['// TODO 데모 전에 고치기', '#8b949e']],
      ],
      6,
      14,
      9,
    );
    // The phone.
    x.fillStyle = '#0b0b0b';
    x.fillRect(118, 8, 64, 112);
    x.fillStyle = '#ffffff';
    x.fillRect(121, 14, 58, 102);
    x.fillStyle = TEAL;
    x.fillRect(121, 14, 58, 16);
    x.fillStyle = '#ffffff';
    x.font = `bold 7px ${FONT}`;
    x.fillText('오늘 뭐 먹지?', 126, 25);
    x.fillStyle = '#ffe0b2';
    x.fillRect(125, 34, 50, 34);
    x.fillStyle = '#e65100';
    x.font = `16px ${FONT}`;
    x.fillText('🍜', 140, 57);
    x.fillStyle = '#263238';
    x.font = `bold 7px ${FONT}`;
    x.fillText('비 오는 날 칼국수', 124, 79);
    x.fillStyle = '#78909c';
    x.font = `6px ${FONT}`;
    x.fillText('8,500원 · 도보 4분', 124, 89);
    x.fillStyle = TEAL;
    x.fillRect(127, 98, 46, 12);
    x.fillStyle = '#ffffff';
    x.font = `bold 6px ${FONT}`;
    x.fillText('여기로 결정!', 134, 106);
  });

/** The hackathon's banner: the company's mark, the event. */
const bannerTex = () =>
  painted('techBanner', 384, 96, (x) => {
    const gr = x.createLinearGradient(0, 0, 384, 0);
    gr.addColorStop(0, NAVY);
    gr.addColorStop(1, '#0b3d4a');
    x.fillStyle = gr;
    x.fillRect(0, 0, 384, 96);
    x.strokeStyle = MINT;
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(22, 70);
    x.lineTo(22, 26);
    x.lineTo(52, 70);
    x.lineTo(52, 26);
    x.stroke();
    x.fillStyle = '#ffffff';
    x.font = `bold 30px ${FONT}`;
    x.fillText('HACK DAY 2026', 70, 50);
    x.fillStyle = MINT;
    x.font = `bold 17px ${FONT}`;
    x.fillText('네오바이트 24시간 해커톤 · 밤새 만들고 아침에 데모!', 70, 78);
  });

// ---- The pieces ----

/**
 * A sit-stand desk's frame (모션 데스크): two telescoping columns on T-feet, the motor box between,
 * a white top `h` up, the up/down keypad with its height read-out at the right front corner.
 * Returns the top's z (its middle) and its front edge.
 */
function motionDesk(g: THREE.Object3D, w: number, d: number, z: number, h: number, use: THREE.Object3D) {
  const front = z + d / 2;
  part(g, rbox(w, 0.028, d, 0.012), DESK, 0, h, z);
  part(g, box(w, 0.006, 0.004), '#cfd8dc', 0, h - 0.008, front + 0.001, { outline: false });
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.12);
    part(g, rbox(0.075, 0.42, 0.05, 0.006), '#e0e3e6', x, 0.24, z);
    part(g, rbox(0.06, h - 0.44, 0.04, 0.006), '#eceff1', x, 0.42 + (h - 0.44) / 2, z, { outline: false });
    part(g, rbox(0.07, 0.035, d - 0.06, 0.012), '#e0e3e6', x, 0.02, z);
    for (const sz of [-1, 1]) part(g, cyl(0.016, 0.016, 0.01, 10), '#9e9e9e', x, 0.005, z + sz * (d / 2 - 0.06), { outline: false });
    part(g, rbox(0.06, 0.04, d - 0.12, 0.01), '#e0e3e6', x, h - 0.035, z);
  }
  part(g, rbox(w - 0.3, 0.035, 0.05, 0.01), '#e0e3e6', 0, h - 0.035, z);
  part(g, rbox(0.12, 0.05, 0.06, 0.012), '#cfd4d8', -0.05, h - 0.05, z);
  // The keypad: two arrows and a read-out of the height, lit while it's used.
  const kx = w / 2 - 0.13;
  part(g, rbox(0.13, 0.025, 0.05, 0.008), '#37474f', kx, h - 0.03, front - 0.01);
  for (const [i, t] of ['▲', '▼'].entries()) label(g, t, 0.02, 0.016, kx + 0.03 + i * 0.03, h - 0.03, front + 0.016, 'none', '#cfd8dc');
  label(g, (h * 100).toFixed(0), 0.035, 0.016, kx - 0.035, h - 0.03, front + 0.016, '#102027', '#455a64');
  label(use, (h * 100).toFixed(0), 0.035, 0.016, kx - 0.035, h - 0.03, front + 0.017, '#102027', MINT);
  // The cable tray under the back, a power strip in it.
  part(g, rbox(w - 0.36, 0.05, 0.1, 0.008), '#d5d9dd', 0, h - 0.07, z - d / 2 + 0.08);
  return { front };
}

/** A wide monitor on a desk clamp arm at (x, z) of a top at `ty`, its screen `tex` handed out as the lit one. */
function armMonitor(g: THREE.Object3D, x: number, ty: number, z: number, mw: number, mh: number, ry: number) {
  part(g, rbox(0.07, 0.05, 0.08, 0.01), '#2f3237', x, ty + 0.025, z - 0.08);
  part(g, cyl(0.016, 0.016, 0.36, 10), '#3a3d44', x, ty + 0.18, z - 0.08, { outline: false });
  rod(g, new THREE.Vector3(x, ty + 0.34, z - 0.08), new THREE.Vector3(x, ty + 0.32, z - 0.02), 0.013, '#3a3d44');
  const my = ty + 0.34;
  const m = frame(g, x, my, z, ry);
  part(m, rbox(mw + 0.016, mh + 0.016, 0.022, 0.006), BLACK, 0, 0, 0);
  part(m, box(mw * 0.4, 0.012, 0.004), '#3a3d44', 0, -mh / 2 - 0.004, 0.012, { outline: false });
  return { m, my };
}

/** A low-profile white keyboard and a mouse on a teal pad at (x, z) of a top at `ty`; returns where the hands go. */
function keysAndMouse(g: THREE.Object3D, x: number, ty: number, z: number) {
  part(g, rbox(0.62, 0.003, 0.28, 0.003), '#26404a', x + 0.06, ty + 0.0015, z + 0.01, { outline: false });
  part(g, rbox(0.36, 0.016, 0.12, 0.006), '#e8eaed', x, ty + 0.008, z);
  for (let r = 0; r < 4; r++) part(g, box(0.33, 0.006, 0.02), '#ffffff', x, ty + 0.018, z - 0.042 + r * 0.028, { outline: false });
  part(g, rbox(0.055, 0.025, 0.095, 0.022), '#eceff1', x + 0.27, ty + 0.012, z + 0.01);
  return marker(g, x, ty + 0.03, z);
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * A developer's desk (업무용 컴퓨터): a white sit-stand desk on its two columns, the height on the
   * keypad, a teal felt divider at the back with the name card, the team's OKR printout and stickers
   * pinned on it; a wide monitor on an arm with the code (the payment retry being written; lit and
   * its cursor blinking in use), a laptop on a stand turned in on the left with the team messenger
   * (lit in use), a white low keyboard and mouse on a teal desk mat, the company tumbler, the ID card
   * on its lanyard, a succulent, a notebook with a pen for the design doc, noise-cancelling headphones
   * on the divider's hook, a '금요일 배포 금지' note on the bezel; an ergonomic mesh chair pulled up.
   * Sat typing for the code, the bugs, the mail and the feature; for a code review sat back with the
   * notebook, listening and noting it down; writing the design doc, pen on the notebook's page.
   */
  workstation(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.03, 0.98);
    const d = Math.min(D - 0.36, 0.64);
    const z = -D / 2 + d / 2 + 0.02;
    const h = 0.73;
    const ty = h + 0.014;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const { front } = motionDesk(g, w, d, z, h, use);
    // The felt divider along the back edge, its aluminium cap; what's pinned on it.
    const pz = z - d / 2 + 0.015;
    const ph = 0.42;
    part(g, rbox(w, ph, 0.028, 0.01), '#4f7f7c', 0, ty + ph / 2, pz);
    part(g, rbox(w + 0.01, 0.018, 0.034, 0.006), ALU, 0, ty + ph, pz);
    label(g, 'NEOBYTE · 백엔드', 0.2, 0.038, -w / 2 + 0.16, ty + ph - 0.05, pz + 0.016, '#ffffff', NAVY);
    part(g, box(0.15, 0.2, 0.002), '#ffffff', w / 2 - 0.15, ty + ph - 0.13, pz + 0.016, { rz: 0.03, outline: false });
    label(g, '2026 4Q OKR', 0.12, 0.022, w / 2 - 0.15, ty + ph - 0.05, pz + 0.018, 'none', TEAL, 0, 0);
    for (let i = 0; i < 5; i++) part(g, box(0.11, 0.005, 0.002), '#b0bec5', w / 2 - 0.15, ty + ph - 0.09 - i * 0.025, pz + 0.018, { rz: 0.03, outline: false });
    for (const [sx, sy, col] of [[-w / 2 + 0.08, ty + 0.27, '#ff7043'], [-w / 2 + 0.15, ty + 0.25, '#42a5f5'], [-0.02, ty + 0.36, '#ffca28']] as Array<[number, number, string]>) part(g, cyl(0.022, 0.022, 0.003, 14), col, sx, sy, pz + 0.016, { rx: Math.PI / 2, outline: false });
    headphones(g, w / 2 - 0.05, ty + ph - 0.02, pz + 0.07);
    // The wide monitor on its arm, the code on it, the blinking cursor, the note on its bezel.
    const mw = 0.6;
    const mh = 0.34;
    const mx = 0.1;
    const mz = z - 0.06;
    const { m, my } = armMonitor(g, mx, ty, mz, mw, mh, -0.05);
    out.screen = screenOf(m, ideTex(), mw, mh, 0, 0, 0.012);
    const cur = part(frame(use, mx, my, mz, -0.05), box(0.006, 0.012, 0.002), '#ffffff', -0.02, -0.06, 0.014, { outline: false, material: glow('#ffffff') });
    part(m, box(0.07, 0.06, 0.003), '#fff176', mw / 2 - 0.03, mh / 2 - 0.02, 0.013, { rz: -0.12, outline: false });
    label(m, '금요일 배포 금지', 0.065, 0.016, mw / 2 - 0.03, mh / 2 - 0.02, 0.0155, 'none', '#c62828');
    // The laptop on its stand on the left, turned in; the messenger on it.
    const lx = -w / 2 + 0.2;
    const lz = z + 0.02;
    rod(g, new THREE.Vector3(lx, ty, lz + 0.08), new THREE.Vector3(lx, ty + 0.1, lz - 0.02), 0.01, ALU);
    rod(g, new THREE.Vector3(lx - 0.1, ty, lz + 0.08), new THREE.Vector3(lx - 0.1, ty + 0.1, lz - 0.02), 0.01, ALU);
    rod(g, new THREE.Vector3(lx + 0.1, ty, lz + 0.08), new THREE.Vector3(lx + 0.1, ty + 0.1, lz - 0.02), 0.01, ALU);
    const stand = frame(g, lx, ty + 0.055, lz + 0.03, 0.35, 0.45);
    laptop(stand, 0, 0, 0, 0, msgTex(), { use: frame(use, lx, ty + 0.055, lz + 0.03, 0.35, 0.45), stickers: [TEAL, '#ff7043', '#ffffff'], w: 0.3, lid: -0.62 });
    // The keyboard and mouse; where the hands go.
    const kz = front - 0.16;
    const kb = keysAndMouse(g, 0.04, ty, kz);
    // The tumbler, the ID card, the succulent; the notebook and pen for the design doc.
    tumbler(g, w / 2 - 0.08, ty, front - 0.12, -0.4);
    idBadge(g, -w / 2 + 0.12, ty, front - 0.1, 0.5);
    succulent(g, w / 2 - 0.1, ty, z - 0.18);
    const nb = frame(g, w / 2 - 0.2, ty, front - 0.17, -0.25);
    part(nb, rbox(0.15, 0.012, 0.21, 0.004), NAVY, 0, 0.006, 0);
    part(nb, box(0.135, 0.003, 0.195), '#fafafa', 0.004, 0.0135, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(nb, box(0.1, 0.0015, 0.004), '#90a4ae', 0.01, 0.0155, -0.07 + i * 0.026, { outline: false });
    part(nb, cyl(0.004, 0.004, 0.13, 6), '#263238', 0.07, 0.019, 0.02, { rx: Math.PI / 2, outline: false });
    const page = marker(nb, 0.01, 0.02, 0.02);
    // The chair.
    const c = frame(g, 0, 0, front + 0.24, Math.PI);
    ergoChair(c, 0.44, TEAL);
    out.work = kb;
    out.animate = (t) => {
      cur.visible = Math.sin(t * 6) > 0;
    };
    out.spots = {
      '*': satAt(g, 0, front + 0.24, 'type', kb),
      tech_codeReview: satAt(g, 0, front + 0.24, 'meeting', kb),
      tech_designDoc: satAt(g, 0, front + 0.24, 'write', page),
    };
  },

  /**
   * A desk raised to stand at (스탠딩 데스크): the same white sit-stand desk run up to elbow height
   * (the keypad reads 105), a monitor on its arm with a pull request open (the diff in red and green,
   * a comment, the approve button; lit in use), a closed laptop docked beside it, a keyboard and mouse
   * on the mat, a bottle of water; under it a grey anti-fatigue mat and a tall perch stool pushed to
   * one side. Stood on the mat typing.
   */
  techStandingDesk(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.03, 0.98);
    const d = Math.min(D - 0.36, 0.62);
    const z = -D / 2 + d / 2 + 0.02;
    const h = 1.05;
    const ty = h + 0.014;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const { front } = motionDesk(g, w, d, z, h, use);
    // The monitor with the PR on it.
    const mw = 0.56;
    const mh = 0.32;
    const { m } = armMonitor(g, 0.08, ty, z - 0.08, mw, mh, 0);
    out.screen = screenOf(m, prTex(), mw, mh, 0, 0, 0.012);
    part(m, box(0.06, 0.05, 0.003), '#b3e5fc', -mw / 2 + 0.04, mh / 2 - 0.02, 0.013, { rz: 0.1, outline: false });
    label(m, 'PR 리뷰!', 0.055, 0.016, -mw / 2 + 0.04, mh / 2 - 0.02, 0.0155, 'none', '#01579b');
    // The laptop shut, docked on the left; a water bottle.
    const lap = frame(g, -w / 2 + 0.17, ty, z + 0.02, 0.2);
    part(lap, rbox(0.3, 0.022, 0.21, 0.008), '#b8bec4', 0, 0.011, 0);
    for (const [i, col] of [TEAL, '#ff7043', '#7e57c2'].entries()) part(lap, cyl(0.022, 0.022, 0.002, 14), col, -0.08 + i * 0.07, 0.023, -0.02 + (i % 2) * 0.05, { outline: false });
    part(g, cyl(0.032, 0.032, 0.2, 12), '#e1f5fe', w / 2 - 0.08, ty + 0.1, front - 0.14, { material: GLASS, outline: false });
    part(g, cyl(0.03, 0.03, 0.12, 12), '#81d4fa', w / 2 - 0.08, ty + 0.06, front - 0.14, { outline: false });
    part(g, cyl(0.022, 0.026, 0.04, 12), '#455a64', w / 2 - 0.08, ty + 0.22, front - 0.14);
    const kb = keysAndMouse(g, 0.02, ty, front - 0.15);
    // The mat stood on, the perch stool to one side.
    part(g, rbox(0.62, 0.02, 0.46, 0.01), '#37474f', 0, 0.01, front + 0.32);
    part(g, box(0.58, 0.003, 0.42), '#455a64', 0, 0.021, front + 0.32, { outline: false });
    const sx = w / 2 + 0.02;
    const sz = front + 0.18;
    part(g, cyl(0.16, 0.18, 0.025, 18), '#263238', sx, 0.012, sz);
    part(g, cyl(0.02, 0.02, 0.55, 10), CHROME, sx, 0.3, sz, { rz: 0.12, outline: false });
    part(g, cyl(0.15, 0.13, 0.06, 18), TEAL, sx + 0.035, 0.6, sz);
    out.work = kb;
    out.spots = { '*': stoodAt(g, 0, front + 0.3, 'type', kb) };
  },

  /**
   * The server room's corner (서버실 랙): two 42U racks side by side behind smoked perforated doors
   * on a raised floor, the servers' LEDs going (green, blue, a red one on the failing drive), patch
   * panels with blue and yellow cables down the side, a yellow fibre raceway across the top, the rack
   * numbers, a temperature read-out, a red extinguisher and the '관계자 외 출입금지' plate; a vented
   * floor tile in front. In use the KVM console's pulled out of the right rack (the pods on its
   * screen), the activity lights flicker and the failed drive's sled slides out and back. Stood at the
   * console typing; crouched at the left rack's drive bays pulling the drive.
   */
  techServerRack(g, W, D, _c, _def, _ctx, out) {
    const rw = Math.min(W / 2 - 0.08, 0.62);
    const rd = Math.min(D - 0.16, 0.8);
    const rh = 1.95;
    const z = -D / 2 + rd / 2 + 0.03;
    const zf = z + rd / 2;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const blink: THREE.Object3D[] = [];
    const xs = [-rw / 2 - 0.03, rw / 2 + 0.03];
    // The raised floor under them and the vented tile in front.
    part(g, box(W - 0.04, 0.03, D - 0.04), '#b0bec5', 0, 0.015, 0);
    for (let i = -2; i <= 2; i++) part(g, box(0.004, 0.002, D - 0.06), '#90a4ae', i * 0.4, 0.031, 0, { outline: false });
    const vz = zf + 0.08;
    for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) part(g, box(0.05, 0.002, 0.012), '#546e7a', -0.25 + k * 0.055, 0.032, vz - 0.02 + r * 0.025, { outline: false });
    xs.forEach((x, ri) => {
      // The cabinet, its posts, the top fans.
      part(g, rbox(rw, rh, rd, 0.012), '#1c1f24', x, rh / 2 + 0.03, z);
      part(g, box(rw - 0.08, rh - 0.12, 0.01), '#0f1114', x, rh / 2 + 0.03, zf - 0.03, { outline: false });
      for (let k = 0; k < 2; k++) part(g, ring(0.07, 0.008), '#37474f', x - 0.12 + k * 0.24, rh + 0.035, z, { rx: Math.PI / 2, outline: false });
      // Servers: 1U and 2U boxes, a drive array low in the left one, their LEDs.
      let y = 0.12;
      const units = ri === 0 ? [3, 3, 1, 2, 1, 1, 2, 2, 1, 1, 2] : [1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 2];
      units.forEach((u, i) => {
        const hgt = u * 0.075 - 0.006;
        const cy = y + hgt / 2;
        const isArray = ri === 0 && i < 2;
        part(g, box(rw - 0.1, hgt, 0.02), isArray ? '#2e3440' : i % 3 === 0 ? '#3b4252' : '#2b303a', x, cy + 0.03, zf - 0.035, { outline: false });
        if (isArray) {
          for (let b = 0; b < 8; b++) {
            const bx = x - (rw - 0.1) / 2 + 0.035 + b * ((rw - 0.17) / 7);
            part(g, box(0.05, hgt - 0.02, 0.004), '#4c566a', bx, cy + 0.03, zf - 0.023, { outline: false });
            part(g, box(0.008, 0.008, 0.003), b === 5 && i === 1 ? '#ff1744' : '#00e676', bx + 0.015, cy + 0.03 + hgt / 2 - 0.02, zf - 0.02, { outline: false, material: glow(b === 5 && i === 1 ? '#ff1744' : '#00e676') });
          }
        } else {
          for (let b = 0; b < 4; b++) part(g, box(0.008, 0.008, 0.003), b === 0 ? '#448aff' : '#00e676', x - rw / 2 + 0.09 + b * 0.022, cy + 0.03, zf - 0.024, { outline: false, material: glow(b === 0 ? '#448aff' : '#00e676') });
          for (let v = 0; v < 6; v++) part(g, box(0.035, Math.max(0.01, hgt - 0.035), 0.003), '#20242c', x + 0.02 + v * 0.04, cy + 0.03, zf - 0.024, { outline: false });
          // Activity lights flickering in use.
          const a = part(use, box(0.008, 0.008, 0.003), '#ffd740', x - rw / 2 + 0.18, cy + 0.03, zf - 0.022, { outline: false, material: glow('#ffd740') });
          blink.push(a);
        }
        y += u * 0.075;
      });
      // A patch panel near the top with cables looping down its side.
      const py = 1.78;
      part(g, box(rw - 0.1, 0.05, 0.02), '#111317', x, py, zf - 0.035, { outline: false });
      for (let p = 0; p < 12; p++) part(g, box(0.014, 0.012, 0.004), p % 4 === 3 ? '#fdd835' : '#29b6f6', x - rw / 2 + 0.08 + p * 0.037, py, zf - 0.022, { outline: false });
      for (const [k, col] of [[0, '#29b6f6'], [1, '#fdd835'], [2, '#29b6f6']] as Array<[number, string]>) {
        part(g, cyl(0.006, 0.006, 1.3, 6), col, x + rw / 2 - 0.07 - k * 0.012, 1.1, zf - 0.03, { outline: false });
      }
      // The smoked, perforated door on the left rack; the right one's door hangs open to the side for the console.
      if (ri === 0) {
        part(g, box(rw - 0.04, rh - 0.06, 0.012), '#1b2430', x, rh / 2 + 0.03, zf + 0.008, { material: SMOKE, outline: false });
        for (let k = 0; k < 18; k++) part(g, box(rw - 0.06, 0.004, 0.003), '#2b3440', x, 0.15 + k * 0.1, zf + 0.016, { outline: false });
        part(g, rbox(0.02, 0.22, 0.03, 0.008), ALU, x + rw / 2 - 0.05, 1.05, zf + 0.025);
      } else {
        const door = frame(g, x + rw / 2, 0, zf, 1.9);
        part(door, box(rw - 0.04, rh - 0.06, 0.012), '#1b2430', -(rw - 0.04) / 2, rh / 2 + 0.03, 0, { material: SMOKE, outline: false });
        part(door, box(0.02, rh - 0.06, 0.02), '#2b3440', -(rw - 0.04), rh / 2 + 0.03, 0, { outline: false });
        part(door, box(0.02, rh - 0.06, 0.02), '#2b3440', 0, rh / 2 + 0.03, 0, { outline: false });
      }
      label(g, ri === 0 ? 'RACK A-01' : 'RACK A-02', 0.18, 0.035, x, rh - 0.02, zf + 0.004, '#0f1114', '#cfd8dc');
    });
    // The fibre raceway across the top.
    part(g, rbox(W - 0.1, 0.07, 0.14, 0.01), '#fdd835', 0, rh + 0.13, z - 0.05);
    for (const x of xs) part(g, cyl(0.02, 0.02, 0.1, 8), '#fbc02d', x, rh + 0.08, z - 0.05, { outline: false });
    // The read-out on the left rack's side, the plate, the extinguisher on the right.
    const sxl = xs[0] - rw / 2 - 0.002;
    part(g, rbox(0.012, 0.09, 0.14, 0.004), '#eceff1', sxl - 0.006, 1.45, zf - 0.15);
    label(g, '22.5℃ 45%', 0.12, 0.04, sxl - 0.013, 1.45, zf - 0.15, '#102027', MINT, -Math.PI / 2);
    label(g, '서버실 · 관계자 외 출입금지', 0.3, 0.05, sxl - 0.006, 1.2, zf - 0.32, '#ffd600', '#212121', -Math.PI / 2);
    const ex = xs[0] - rw / 2 - 0.2;
    part(g, cyl(0.06, 0.06, 0.38, 14), '#d32f2f', ex + 0.08, 0.23, zf + 0.12);
    part(g, rbox(0.06, 0.05, 0.05, 0.01), '#212121', ex + 0.08, 0.45, zf + 0.12);
    part(g, cyl(0.008, 0.012, 0.14, 6), '#212121', ex + 0.12, 0.38, zf + 0.15, { rz: 0.4, outline: false });
    // The KVM drawer: shut in the rack idle; pulled out, its lid up, in use.
    const kx = xs[1];
    const ky = 1.08;
    part(g, box(rw - 0.1, 0.04, 0.02), '#2e3440', kx, ky, zf - 0.03, { outline: false });
    const tray = frame(use, kx, ky, zf + 0.18);
    part(tray, rbox(rw - 0.12, 0.02, 0.42, 0.006), '#2e3440', 0, 0, 0);
    part(tray, box(rw - 0.2, 0.004, 0.16), '#1c1f24', 0, 0.012, 0.08, { outline: false });
    for (let r = 0; r < 4; r++) part(tray, box(rw - 0.24, 0.003, 0.02), '#4c566a', 0, 0.015, 0.03 + r * 0.03, { outline: false });
    for (const s of [-1, 1]) part(tray, box(0.012, 0.012, 0.4), CHROME, s * ((rw - 0.12) / 2 + 0.006), 0, 0, { outline: false });
    const lid = frame(tray, 0, 0.012, -0.01, 0, -0.18);
    part(lid, rbox(rw - 0.14, 0.27, 0.014, 0.006), '#2e3440', 0, 0.135, 0);
    sheet(lid, termTex(), rw - 0.2, 0.22, 0, 0.14, 0.008);
    const keys = marker(tray, 0, 0.03, 0.1);
    // The failing drive's sled, sliding out and back in use.
    const fx = xs[0] - (rw - 0.1) / 2 + 0.035 + 5 * ((rw - 0.17) / 7);
    const fy = 0.12 + 0.225 + 0.112 + 0.03;
    const sled = part(use, box(0.048, 0.2, 0.06), '#4c566a', fx, fy, zf - 0.02, { outline: false });
    part(sled, box(0.04, 0.02, 0.01), ALU, 0, -0.06, 0.035, { outline: false });
    const bay = marker(g, fx, fy, zf + 0.02);
    out.work = keys;
    out.animate = (t) => {
      blink.forEach((b, i) => (b.visible = Math.sin(t * (9 + (i % 5)) + i * 1.7) > 0.1));
      const u = (t / 7) % 1;
      const e = THREE.MathUtils.smoothstep(u, 0.15, 0.35) * (1 - THREE.MathUtils.smoothstep(u, 0.65, 0.85));
      sled.position.z = zf - 0.02 + e * 0.14;
    };
    out.spots = {
      '*': stoodAt(g, kx, zf + 0.62, 'type', keys),
      techSwapDisk: stoodAt(g, fx, zf + 0.42, 'tinker', bay),
    };
  },

  /**
   * The team's scrum board (스크럼 보드): a tall white board on a rolling stand (or on the wall), the
   * sprint across its head, four columns taped out — 할 일, 진행 중, 코드 리뷰, 완료 — with sticky
   * notes in them (the tasks of 간편결제 v2), the team's faces on magnets by what each is doing, the
   * burndown printed and taped up on the right with the stand-up's rules under it; a tray of markers
   * and sticky pads, a 15-minute timer clipped on top (counting down, lit, in a stand-up). The
   * stand-up is held stood round it (each on their own tile, notebook in hand, listening, chipping
   * in, pointing at it); moving a ticket, stood at it with a note going from 진행 중 to 코드 리뷰.
   */
  techScrumBoard(g, W, D, _c, _def, ctx, out) {
    const bw = Math.min(W - 0.2, 1.8);
    const bh = 1.02;
    const wall = ctx.againstWall;
    const bz = wall ? -D / 2 + 0.03 : -0.05;
    const by = wall ? 1.42 : 1.32;
    if (!wall) {
      for (const sx of [-1, 1]) {
        const x = sx * (bw / 2 + 0.04);
        part(g, rbox(0.045, by + bh / 2, 0.045, 0.01), NAVY, x, (by + bh / 2) / 2 + 0.03, bz);
        part(g, rbox(0.06, 0.04, 0.6, 0.012), NAVY, x, 0.07, bz);
        for (const sz of [-1, 1]) part(g, ball(0.03), BLACK, x, 0.03, bz + sz * 0.27, { outline: false });
      }
      part(g, rbox(bw + 0.04, 0.035, 0.03, 0.01), NAVY, 0, 0.35, bz);
    }
    part(g, rbox(bw + 0.05, bh + 0.05, 0.03, 0.012), NAVY, 0, by, bz);
    const fz = bz + 0.017;
    sheet(g, scrumTex(), bw - 0.02, bh - 0.02, 0, by, fz);
    // The sticky notes in their columns: (column, row, colour, words).
    const cw = (bw - 0.02) * (92 / 512);
    const colX = (i: number) => -bw / 2 + 0.01 + (6 + i * 92 + 43) * ((bw - 0.02) / 512);
    const rowY = (r: number) => by + bh / 2 - 0.26 - r * 0.12;
    const notes: Array<[number, number, string, string]> = [
      [0, 0, '#fff176', '푸시 알림 설정'],
      [0, 1, '#fff176', '다크 모드'],
      [0, 2, '#f8bbd0', '로그 정리'],
      [0, 3, '#fff176', '약관 페이지'],
      [1, 0, '#b3e5fc', '결제 재시도'],
      [1, 1, '#b3e5fc', '간편결제 UI'],
      [1, 2, '#ffccbc', '🐛 환불 버그'],
      [2, 0, '#c5e1a5', '로그인 API'],
      [2, 1, '#c5e1a5', '쿠폰 적용'],
      [3, 0, '#e0e0e0', '배포 자동화'],
      [3, 1, '#e0e0e0', '주문 내역'],
      [3, 2, '#e0e0e0', 'QA 체크리스트'],
      [3, 3, '#e0e0e0', '카드 등록'],
    ];
    notes.forEach(([c, r, col, t], i) => sticky(g, colX(c), rowY(r), fz + 0.004, col, t, ((i * 37) % 7) * 0.012 - 0.035));
    // Done notes get a tick.
    for (let r = 0; r < 4; r++) label(g, '✔', 0.025, 0.025, colX(3) + 0.045, rowY(r) - 0.02, fz + 0.009, 'none', '#2e7d32');
    // The team's faces on magnets beside what they're on.
    const faces: Array<[number, number, string, string]> = [
      [1, 0, '#c99a6e', '#2b1b10'],
      [1, 1, '#f8d9c0', '#5b3a1e'],
      [2, 0, '#eac09a', '#1a1a1a'],
    ];
    for (const [c, r, skin, hair] of faces) faceMagnet(g, colX(c) - cw / 2 + 0.01, rowY(r) + 0.035, fz + 0.01, skin, hair);
    // The tray: markers and sticky pads; the timer clipped on top.
    const trayY = by - bh / 2 - 0.035;
    part(g, rbox(bw * 0.5, 0.025, 0.075, 0.01), ALU, -bw * 0.2, trayY, bz + 0.045);
    for (const [i, col] of ['#212121', '#1a3c9e', '#c62828', '#00897b'].entries()) part(g, cyl(0.011, 0.011, 0.12, 8), col, -bw * 0.4 + i * 0.045, trayY + 0.024, bz + 0.05, { rz: Math.PI / 2 });
    for (const [i, col] of ['#fff176', '#b3e5fc', '#f8bbd0'].entries()) part(g, box(0.07, 0.025, 0.07), col, -bw * 0.12 + i * 0.08, trayY + 0.025, bz + 0.05);
    const tx = bw / 2 - 0.2;
    const ty = by + bh / 2 + 0.06;
    part(g, rbox(0.16, 0.08, 0.04, 0.012), '#eceff1', tx, ty, bz + 0.01);
    label(g, '15:00', 0.12, 0.05, tx, ty, bz + 0.031, '#102027', '#455a64', 0, 0, MONO);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    label(use, '14:32', 0.12, 0.05, tx, ty, bz + 0.032, '#102027', '#ff5252', 0, 0, MONO);
    // The note being moved along, from 진행 중 to 코드 리뷰.
    const card = new THREE.Group();
    use.add(card);
    part(card, box(0.12, 0.09, 0.003), '#b3e5fc', 0, 0, 0, { outline: false });
    label(card, '쿠폰 API', 0.11, 0.032, 0, 0.008, 0.002, 'none', '#37474f');
    const c0 = new THREE.Vector3(colX(1), rowY(3), fz + 0.012);
    const c1 = new THREE.Vector3(colX(2), rowY(2), fz + 0.012);
    out.animate = (t) => {
      const u = (t / 6) % 1;
      const e = THREE.MathUtils.smoothstep(u, 0.25, 0.65);
      card.position.lerpVectors(c0, c1, e);
      card.position.y += Math.sin(Math.PI * e) * 0.05;
      card.position.z += Math.sin(Math.PI * e) * 0.03;
    };
    const work = marker(g, colX(1) + 0.1, rowY(2), fz + 0.01);
    out.work = marker(g, -bw * 0.1, by, fz);
    // The stand-up stands round it a step back (each on their own tile): the solid part's taken out to there.
    out.body.expandByPoint(new THREE.Vector3(0, 0, bz + 0.72));
    out.spots = { techMoveTicket: stoodAt(g, colX(1) + 0.15, bz + 0.52, 'board', work) };
  },

  /**
   * A phone booth (폰부스): a one-person soundproof pod — a shell of dark teal felt on a plinth, a
   * full-height glass door with its long pull, a smoked roof with the light and a fan in it, grey
   * hexagonal acoustic tiles on the back wall, a little desk shelf with a laptop on it, a padded
   * perch stool, a power socket — and over the door a sign that reads '사용 가능' idle and lights red
   * '통화 중' in use, when the light inside comes on and the call's on the laptop (the weekly sync with
   * San Francisco). Sat inside on the stool, talking to the screen.
   */
  techPhoneBooth(g, W, D, _c, _def, _ctx, out) {
    const ow = Math.min(W - 0.04, 0.94);
    const od = Math.min(D - 0.04, 0.94);
    const oh = 2.15;
    const t = 0.05;
    const felt = '#2f5754';
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    // The plinth, the back and the sides.
    part(g, rbox(ow, 0.06, od, 0.02), '#263238', 0, 0.03, 0);
    part(g, box(ow - 0.1, 0.004, od - 0.1), '#455a64', 0, 0.062, 0, { outline: false });
    part(g, rbox(ow, oh - 0.06, t, 0.015), felt, 0, oh / 2 + 0.03, -od / 2 + t / 2);
    for (const sx of [-1, 1]) {
      part(g, rbox(t, oh - 0.06, od, 0.015), felt, sx * (ow / 2 - t / 2), oh / 2 + 0.03, 0);
      part(g, box(0.004, oh - 0.3, od - 0.2), shade(felt, 0.82), sx * (ow / 2 - t - 0.002), oh / 2, -0.02, { outline: false });
    }
    // The hexagon tiles on the back wall inside.
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 4; k++) {
        const hx = -0.27 + k * 0.18 + (r % 2) * 0.09;
        if (Math.abs(hx) > ow / 2 - t - 0.06) continue;
        part(g, cyl(0.08, 0.08, 0.02, 6), (r + k) % 3 === 0 ? '#90a4ae' : '#b0bec5', hx, 1.05 + r * 0.15, -od / 2 + t + 0.01, { rx: Math.PI / 2, ry: Math.PI / 6, outline: false });
      }
    // The roof: a frame round a smoked panel, the light under it and the fan's grille.
    const iw = ow - 2 * t;
    part(g, rbox(ow, 0.05, 0.06, 0.012), felt, 0, oh + 0.005, od / 2 - 0.03);
    part(g, box(iw, 0.012, od - t - 0.06), '#1b2430', 0, oh - 0.005, -0.005, { material: SMOKE, outline: false });
    part(g, rbox(0.4, 0.02, 0.12, 0.008), '#eceff1', 0, oh - 0.025, -0.1);
    part(use, box(0.38, 0.006, 0.1), '#fff8e1', 0, oh - 0.036, -0.1, { outline: false, material: glow('#fff3c4') });
    part(g, ring(0.06, 0.006), '#78909c', 0, oh - 0.02, 0.18, { rx: Math.PI / 2, outline: false });
    // The glass door across the front, its frame and pull.
    const fz = od / 2 - 0.02;
    part(g, box(0.03, oh - 0.06, 0.03), BLACK, -iw / 2 + 0.015, oh / 2 + 0.03, fz, { outline: false });
    part(g, box(0.03, oh - 0.06, 0.03), BLACK, iw / 2 - 0.015, oh / 2 + 0.03, fz, { outline: false });
    part(g, box(iw, 0.03, 0.03), BLACK, 0, oh - 0.02, fz, { outline: false });
    part(g, box(iw - 0.04, oh - 0.12, 0.01), '#d7eef7', 0, oh / 2 + 0.03, fz, { material: GLASS, outline: false });
    part(g, cyl(0.012, 0.012, 0.7, 10), CHROME, iw / 2 - 0.08, 1.05, fz + 0.04, { outline: false });
    for (const y of [0.72, 1.38]) part(g, box(0.012, 0.012, 0.04), CHROME, iw / 2 - 0.08, y, fz + 0.02, { outline: false });
    // A frosted band across the glass with the company's name.
    part(g, box(iw - 0.04, 0.12, 0.002), '#ffffff', 0, 1.6, fz + 0.007, { material: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }), outline: false });
    label(g, 'NEOBYTE · PHONE BOOTH', 0.5, 0.05, 0, 1.6, fz + 0.009, 'none', '#37474f');
    // The sign over the door: free, or on a call.
    part(g, rbox(0.3, 0.07, 0.025, 0.01), BLACK, 0, oh + 0.07, fz);
    label(idle, '사용 가능', 0.26, 0.05, 0, oh + 0.07, fz + 0.014, BLACK, '#69f0ae');
    label(use, '● 통화 중', 0.26, 0.05, 0, oh + 0.07, fz + 0.015, BLACK, '#ff5252');
    // The desk shelf with the laptop, a socket; the stool.
    const sh = 0.74;
    const sd = 0.28;
    const sz = -od / 2 + t + sd / 2;
    part(g, rbox(iw - 0.02, 0.03, sd, 0.01), '#d7ccc8', 0, sh, sz);
    part(g, rbox(0.06, 0.04, 0.012, 0.005), '#eceff1', iw / 2 - 0.08, sh + 0.06, -od / 2 + t + 0.008);
    laptop(g, -0.02, sh + 0.015, sz + 0.02, 0, callTex(), { use, stickers: [TEAL, '#ffffff'], w: 0.3 });
    const sx = 0;
    const stz = 0.12;
    part(g, cyl(0.17, 0.19, 0.025, 18), '#263238', sx, 0.075, stz);
    part(g, cyl(0.025, 0.025, 0.36, 10), CHROME, sx, 0.26, stz, { outline: false });
    part(g, cyl(0.18, 0.17, 0.07, 18), '#ff8a65', sx, 0.45, stz);
    const face = marker(g, -0.02, sh + 0.2, sz);
    out.work = face;
    const seat = spot(g, 'sit', sx, 0.49, stz, Math.PI, 0.43);
    seat.work = face;
    seat.motion = 'talk';
    out.spots = { '*': seat };
  },

  /**
   * The hackathon table (해커톤 테이블): a long plywood top on black trestles under the event's banner
   * (HACK DAY 2026, 24시간 해커톤) on its two poles, a countdown clock (남은 시간 07:42, lit in use),
   * two laptops open and covered in stickers — one with the prototype on it (the code and the app in
   * a phone frame, lit in use) — a power strip with its cables, sticky notes of ideas, a pizza box
   * open with slices gone, another shut on top of a third, cola and energy drink cans, a bag of
   * chips; two stools at the front. Sat on the left stool typing the prototype; on the right with a
   * slice on a paper plate, eating.
   */
  techHackathonTable(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.06, 1.92);
    const d = Math.min(D - 0.3, 0.7);
    const h = 0.74;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const ty = h + 0.015;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    // The top, its trestles.
    part(g, rbox(w, 0.03, d, 0.008), '#d7b98c', 0, h, z);
    part(g, box(w, 0.012, 0.004), '#c4a274', 0, h - 0.006, front + 0.001, { outline: false });
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.18);
      for (const sz of [-1, 1]) rod(g, new THREE.Vector3(x, h - 0.02, z), new THREE.Vector3(x + sx * 0.04, 0.01, z + sz * (d / 2 - 0.06)), 0.018, BLACK);
      part(g, rbox(0.05, 0.03, d - 0.1, 0.01), BLACK, x, h - 0.03, z);
      part(g, box(0.025, 0.02, d - 0.2), BLACK, x + sx * 0.02, 0.3, z, { outline: false });
    }
    // The banner on two poles clamped to the table's back edge.
    const bw = Math.min(w - 0.1, 1.6);
    const bh = 0.4;
    const bz = z - d / 2 + 0.02;
    for (const sx of [-1, 1]) {
      part(g, cyl(0.014, 0.014, 1.9 - ty, 8), '#9e9e9e', sx * (bw / 2 + 0.02), (1.9 + ty) / 2, bz, { outline: false });
      part(g, rbox(0.05, 0.07, 0.06, 0.01), '#616161', sx * (bw / 2 + 0.02), h - 0.01, bz);
    }
    part(g, box(bw + 0.06, 0.012, 0.012), '#9e9e9e', 0, 1.88, bz, { outline: false });
    sheet(g, bannerTex(), bw, bh, 0, 1.88 - bh / 2 - 0.01, bz + 0.004);
    // The countdown clock on the table's back.
    const cx = 0.05;
    part(g, rbox(0.24, 0.1, 0.06, 0.01), BLACK, cx, ty + 0.05, z - d / 2 + 0.08);
    label(g, '남은 시간 07:42', 0.21, 0.06, cx, ty + 0.055, z - d / 2 + 0.111, '#111111', '#5d1a1a');
    label(use, '남은 시간 07:42', 0.21, 0.06, cx, ty + 0.055, z - d / 2 + 0.112, '#111111', '#ff5252');
    // The laptops: the prototype on the left, a second one on the right turned in.
    const lx = -0.5;
    laptop(g, lx, ty, front - 0.25, 0, hackTex(), { use, stickers: [TEAL, '#ff7043', '#ffca28', '#7e57c2', '#ffffff'], w: 0.34 });
    const kb = marker(g, lx, ty + 0.03, front - 0.2);
    laptop(g, 0.2, ty, front - 0.33, -0.5, msgTex(), { stickers: ['#42a5f5', '#ef5350', '#66bb6a'], w: 0.3, color: '#5f6368' });
    // The power strip and its cables.
    part(g, rbox(0.3, 0.025, 0.05, 0.008), '#fafafa', -0.15, ty + 0.012, z - d / 2 + 0.12);
    for (let i = 0; i < 4; i++) part(g, box(0.02, 0.006, 0.02), i < 3 ? '#212121' : '#616161', -0.25 + i * 0.065, ty + 0.027, z - d / 2 + 0.12, { outline: false });
    rod(g, new THREE.Vector3(-0.25, ty + 0.01, z - d / 2 + 0.14), new THREE.Vector3(lx + 0.16, ty + 0.006, front - 0.3), 0.005, '#212121');
    rod(g, new THREE.Vector3(-0.18, ty + 0.01, z - d / 2 + 0.14), new THREE.Vector3(0.1, ty + 0.006, front - 0.38), 0.005, '#212121');
    // Sticky notes of ideas.
    for (const [i, [nx, nz, col]] of ([[-0.78, front - 0.1, '#fff176'], [-0.7, front - 0.07, '#f8bbd0'], [-0.82, front - 0.22, '#b3e5fc']] as Array<[number, number, string]>).entries())
      part(g, box(0.07, 0.003, 0.07), col, nx, ty + 0.002 + i * 0.001, nz, { ry: i * 0.3 - 0.2, outline: false });
    // Pizza: a box open with slices gone, on top of one still shut (its name on the side).
    const px = 0.62;
    const pz = z - 0.03;
    part(g, rbox(0.37, 0.045, 0.37, 0.006), '#e0c09a', px, ty + 0.0225, pz, { ry: 0.04 });
    label(g, '네오 피자', 0.16, 0.035, px, ty + 0.023, pz + 0.19, 'none', '#c62828');
    const pty = ty + 0.046;
    part(g, box(0.38, 0.012, 0.38), '#d7b48a', px, pty + 0.006, pz);
    for (const [sx, sz, sw, sd] of [[0, -0.185, 0.38, 0.012], [0, 0.185, 0.38, 0.012], [-0.185, 0, 0.012, 0.38], [0.185, 0, 0.012, 0.38]]) part(g, box(sw, 0.04, sd), '#c9a274', px + sx, pty + 0.02, pz + sz, { outline: false });
    const pl = frame(g, px, pty, pz - 0.19, 0, -1.75);
    part(pl, box(0.38, 0.38, 0.01), '#d7b48a', 0, 0.19, 0);
    label(pl, 'PIZZA', 0.18, 0.06, 0, 0.2, -0.006, 'none', '#c62828', Math.PI);
    part(g, pie(0.16, 0.018, 5, 8), '#e8a33d', px, pty + 0.024, pz, { outline: false });
    part(g, pie(0.145, 0.02, 5, 8), '#ffca28', px, pty + 0.027, pz, { outline: false });
    for (let i = 0; i < 9; i++) {
      const a = 0.25 + i * 0.4;
      if (a > (Math.PI * 2 * 5) / 8 - 0.2) continue;
      const r = 0.05 + (i % 3) * 0.03;
      part(g, cyl(0.018, 0.018, 0.006, 10), '#c62828', px + Math.sin(a) * r, pty + 0.039, pz + Math.cos(a) * r, { outline: false });
    }
    // Cans and a bag of chips.
    can(g, -0.1, ty, front - 0.12, '#d32f2f', '#fafafa');
    can(g, 0.05, ty, front - 0.08, '#ff6d00');
    can(g, 0.25, ty, front - 0.06, '#1565c0', '#e0e0e0');
    const chips = frame(g, -0.25, ty + 0.05, z - 0.05, 0.4, -0.3);
    part(chips, rbox(0.16, 0.2, 0.05, 0.025), '#ffb300', 0, 0.05, 0);
    label(chips, '감자칩', 0.11, 0.04, 0, 0.07, 0.027, 'none', '#b71c1c');
    // The slice on its paper plate for whoever eats, in front of the right stool.
    const ex = 0.45;
    const ez = front - 0.11;
    part(g, cyl(0.1, 0.085, 0.012, 20), '#fafafa', ex, ty + 0.006, ez);
    const slice = frame(use, ex, ty + 0.016, ez, 0.5);
    part(slice, pie(0.13, 0.016, 1, 8), '#e8a33d', -0.05, 0, -0.04, { outline: false });
    part(slice, pie(0.12, 0.018, 1, 8), '#ffca28', -0.05, 0.003, -0.04, { outline: false });
    const plate = marker(g, ex, ty + 0.02, ez);
    // The stools.
    const sz = front + 0.22;
    for (const sx of [lx, ex]) {
      part(g, cyl(0.04, 0.05, 0.02, 10), BLACK, sx, 0.01, sz);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        rod(g, new THREE.Vector3(sx + Math.cos(a) * 0.04, 0.44, sz + Math.sin(a) * 0.04), new THREE.Vector3(sx + Math.cos(a) * 0.17, 0.0, sz + Math.sin(a) * 0.17), 0.012, BLACK);
      }
      part(g, ring(0.12, 0.008), BLACK, sx, 0.2, sz, { rx: Math.PI / 2, outline: false });
      part(g, cyl(0.17, 0.16, 0.04, 20), sx === lx ? TEAL : '#ffb300', sx, 0.46, sz);
    }
    out.work = kb;
    out.spots = {
      '*': satAt(g, lx, sz, 'type', kb, 0.48),
      techPizzaSlice: satAt(g, ex, sz, 'eat', plate, 0.48),
    };
  },

  /**
   * The lounge's beanbags (빈백 라운지): a round shaggy rug, two big beanbags slumped into the shape
   * of whoever sat in them last (mustard and teal, their seams and handles), a low round side table
   * between them at the back with a closed laptop, a mug and a stack of developer books (클린 코드,
   * 리팩터링…), a floor lamp arching over, a potted monstera. Sunk into the left one, hands in the lap.
   */
  techBeanbagLounge(g, W, D, _c, _def, _ctx, out) {
    // The rug.
    part(g, cyl(Math.min(W, 2) * 0.47, Math.min(W, 2) * 0.47, 0.012, 32), '#d7d2c8', 0, 0.006, 0, { outline: false }).scale.set(1, 1, Math.min(D, 1) * 0.92);
    part(g, ring(Math.min(W, 2) * 0.42, 0.01), '#bcae9a', 0, 0.014, 0, { rx: Math.PI / 2, outline: false }).scale.set(1, Math.min(D, 1) * 0.92, 1);
    const bags: Array<[number, string]> = [[-0.5, '#f4b400'], [0.52, TEAL]];
    for (const [bx, col] of bags) {
      // The base slumped on the floor, the back heaped up behind, the dent sat in.
      part(g, ball(0.4), col, bx, 0.18, 0.02).scale.set(1, 0.48, 0.95);
      part(g, ball(0.3), shade(col, 0.95), bx, 0.38, -0.2).scale.set(1.15, 0.85, 0.6);
      part(g, ball(0.24), shade(col, 0.82), bx, 0.27, 0.04, { outline: false }).scale.set(1, 0.25, 0.9);
      part(g, ring(0.33, 0.006), shade(col, 0.7), bx, 0.2, 0.02, { rx: Math.PI / 2, outline: false }).scale.set(1, 0.95, 1);
      part(g, rbox(0.08, 0.025, 0.02, 0.01), shade(col, 0.7), bx, 0.56, -0.38);
    }
    // The side table at the back, between them: a laptop shut, a mug, the books.
    const sx = 0.0;
    const sz = -0.32;
    const th = 0.42;
    part(g, cyl(0.17, 0.17, 0.025, 24), '#a1887f', sx, th, sz);
    part(g, cyl(0.02, 0.02, th - 0.02, 10), '#5d4037', sx, (th - 0.02) / 2, sz, { outline: false });
    part(g, cyl(0.12, 0.13, 0.015, 20), '#5d4037', sx, 0.008, sz);
    const books: Array<[string, string]> = [['#1565c0', '클린 코드'], ['#ef6c00', '리팩터링'], ['#2e7d32', 'HTTP 완벽 가이드']];
    books.forEach(([col], i) => part(g, rbox(0.15, 0.025, 0.2, 0.004), col, sx - 0.03, th + 0.025 + i * 0.026, sz + 0.0, { ry: (i - 1) * 0.12 }));
    label(g, books[2][1], 0.12, 0.03, sx - 0.03, th + 0.0915, sz + 0.0, 'none', '#ffffff', 0.12, -Math.PI / 2);
    part(g, cyl(0.035, 0.03, 0.08, 14), '#fafafa', sx + 0.1, th + 0.052, sz + 0.06);
    part(g, ring(0.025, 0.007, Math.PI), '#fafafa', sx + 0.135, th + 0.055, sz + 0.06, { rz: -Math.PI / 2, outline: false });
    part(g, cyl(0.03, 0.03, 0.004, 14), '#4e342e', sx + 0.1, th + 0.09, sz + 0.06, { outline: false });
    // The floor lamp arching over from the right back corner.
    const lx = W / 2 - 0.1;
    const lz = -D / 2 + 0.12;
    part(g, cyl(0.12, 0.13, 0.03, 20), '#212121', lx, 0.015, lz);
    const tip = new THREE.Vector3(0.25, 1.6, -0.1);
    rod(g, new THREE.Vector3(lx, 0.03, lz), new THREE.Vector3(lx, 1.2, lz), 0.012, '#bdbdbd');
    rod(g, new THREE.Vector3(lx, 1.2, lz), new THREE.Vector3(lx - 0.25, 1.75, lz + 0.05), 0.012, '#bdbdbd');
    rod(g, new THREE.Vector3(lx - 0.25, 1.75, lz + 0.05), tip, 0.012, '#bdbdbd');
    part(g, cyl(0.06, 0.16, 0.12, 20), '#fafafa', tip.x, tip.y - 0.06, tip.z);
    part(g, cyl(0.15, 0.15, 0.004, 20), '#fff8e1', tip.x, tip.y - 0.12, tip.z, { outline: false, material: glow('#fff3c4') });
    // A monstera in a basket at the left back corner.
    const mx = -W / 2 + 0.12;
    const mz = -D / 2 + 0.12;
    part(g, cyl(0.11, 0.09, 0.22, 16), '#c8a97e', mx, 0.11, mz);
    part(g, cyl(0.1, 0.1, 0.01, 16), '#4e342e', mx, 0.215, mz, { outline: false });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 0.12 + (i % 2) * 0.05;
      const top = new THREE.Vector3(mx + Math.cos(a) * r, 0.55 + (i % 3) * 0.12, mz + Math.sin(a) * r);
      rod(g, new THREE.Vector3(mx, 0.22, mz), top, 0.006, '#558b2f');
      part(g, ball(0.09), i % 2 ? '#2e7d32' : '#388e3c', top.x, top.y, top.z).scale.set(1, 0.25, 0.8);
    }
    const lap = marker(g, -0.5, 0.42, 0.25);
    out.work = lap;
    out.spots = { '*': satAt(g, -0.5, 0.06, 'lap', lap, 0.3, 0) };
  },
  /** The reception desk inside the glass door (2026-11-05, the layout audit; frontDesk.ts). */
  techReception(g, W, D) {
    frontDesk(g, W, D, { name: 'NEOBYTE', body: NAVY, top: DESK, fg: MINT, bg: NAVY, flowers: '#ffffff' });
  },
  /**
   * The logo wall behind the reception (2026-11-05, the layout audit): a navy panel the width of the wall with the company's name in
   * teal over its Korean, a strip of light along its foot, the floor's card reader and the 'visitors please wait' plate beside it.
   */
  techLogoWall(g, W, D) {
    const zb = -D / 2 + 0.03;
    part(g, box(W - 0.06, 2.3, 0.04), NAVY, 0, 1.2, zb);
    part(g, box(W - 0.06, 0.03, 0.05), TEAL, 0, 0.08, zb + 0.01, { outline: false, material: glow(TEAL) });
    label(g, 'NEOBYTE', 1.3, 0.3, 0, 1.62, zb + 0.022, NAVY, MINT);
    label(g, '네오바이트', 0.8, 0.14, 0, 1.36, zb + 0.022, NAVY, '#ffffff');
    label(g, '방문하신 분은 안내 데스크에서 방문증을 받아 주세요', 1.3, 0.06, 0, 1.12, zb + 0.022, NAVY, '#b0bec5');
    part(g, rbox(0.1, 0.15, 0.025, 0.008), BLACK, W / 2 - 0.18, 1.1, zb + 0.03);
    part(g, box(0.05, 0.01, 0.004), '#00e676', W / 2 - 0.18, 1.15, zb + 0.044, { outline: false, material: glow('#00e676') });
  },
  /** The building's sign on the pavement: a made-up tower in 판교, the floors on it (2026-11-05, the layout audit). */
  techTowerSign: pavementSign('techTowerSign', '🏢', '판교 한빛|테크타워', ['12층 네오바이트', '1층 로비 · 출입 게이트', '방문객은 안내 데스크로'], NAVY, 2.2),
};
