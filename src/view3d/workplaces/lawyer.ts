import * as THREE from 'three';
import { argueBeat, toolPhase, type Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glowing, label, litScreen, painted, picture, seeded, starBase, text, type Paint } from './doctor';

/**
 * The law firm and the courtroom drawn as themselves (2026-10-27 workplace pipeline, at the user's
 * request). The firm: the associates' walnut desks with the brief on screen, the record and the
 * 인주 for the seal; the law library's cases of 판례집, 법령집 and 주해서 with a reading ledge; and
 * what it was missing (workFurniture/lawyer.ts) — the managing partner's desk under the scales of
 * justice, the case-file shelving and the table clients are consulted at. The courtroom, laid out as
 * a Korean one: the bench (furnitureShop.ts) with the 참여관's desk under it where papers are filed,
 * the 원고 and 피고 counsel tables facing each other across the well with their nameplates and
 * exhibits (갑호증, 을호증), the witness stand in the middle facing the bench with the oath on it,
 * the podium argued at, and the gallery's seats behind the bar rail.
 *
 * Arguing (activity.ts argueBeat) is done to the bench from the podium or beside the witness: a hand
 * on the papers reading the point, the other making it, a finger up, turned round to the gallery,
 * then hearing the court out with both hands on the lectern — the piece turns its spot by the same
 * clock as the hands.
 */

const WALNUT = '#5d4037';
const OAK = '#a47551';
const PANEL = '#7b5a43';
const BRASS = '#c9a227';
const GOLD = '#d4af37';
const PAPER = '#fbfaf5';
const LEATHER = '#2f2a2a';
const NAVY = '#2c3e66';
const INLAY = '#2e5e3e';
const SKIN = '#f1c9a5';
const STEEL = '#c5ccd2';
/** How far round to the gallery an advocate turns (radians, to their left): at the podium, beside the witness. */
const TURN = 2.4;
const TURN_WITNESS = 1.9;

// ---------------------------------------------------------------------------------------------
// Small parts.

/** A group in `parent` standing where `like` stands (for the parts of something shown only in use). */
function alongside(parent: THREE.Object3D, like: THREE.Object3D): THREE.Group {
  const m = new THREE.Group();
  m.position.copy(like.position);
  m.rotation.copy(like.rotation);
  parent.add(m);
  return m;
}
/** A spot sat at (the seat's top `y`), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work: THREE.Object3D): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, y);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot stood at, facing `yaw` (π: at the piece, from its front), and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** The same place, done another way. */
const also = (s: Spot, motion: Motion, work = s.work): Spot => ({ ...s, motion, work });
/** A sheet lying flat on a top, its head away from +z, turned `ry` about the vertical. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** Vertical words, a character under the last (a spine's title). */
function vtext(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, bold = true) {
  [...s].forEach((ch, i) => text(c, ch, x, y + i * size * 1.08, size, color, 'center', bold));
}

/** A swivel chair in leather, built facing +z: five-star base, gas lift, the seat's top at 0.48, a back `back` high, arms. */
function swivel(g: THREE.Object3D, x: number, z: number, ry: number, color: string, back = 0.55): THREE.Group {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = ry;
  g.add(c);
  starBase(c, 0, 0, 0.26, BLACK);
  part(c, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.5, 0.09, 0.48, 0.04), color, 0, 0.435, 0);
  part(c, rbox(0.5, back, 0.1, 0.05), color, 0, 0.5 + back / 2, -0.24, { rx: -0.08 });
  part(c, rbox(0.42, back - 0.16, 0.02, 0.04), shade(color, 1.25), 0, 0.5 + back / 2, -0.185, { rx: -0.08, outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.04, 0.3, 0.015), color, sx * 0.27, 0.67, 0.0);
    part(c, rbox(0.03, 0.18, 0.03, 0.01), CHROME, sx * 0.27, 0.57, 0.04, { outline: false });
  }
  return c;
}
/** An upholstered side chair on four wooden legs, built facing +z; the seat's top at 0.48. */
function sideChair(g: THREE.Object3D, x: number, z: number, ry: number, fabric: string, wood = WALNUT): THREE.Group {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = ry;
  g.add(c);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.02, 0.016, 0.44, 8), wood, sx * 0.19, 0.22, sz * 0.17, { outline: false });
  part(c, rbox(0.46, 0.06, 0.44, 0.03), wood, 0, 0.43, 0);
  part(c, rbox(0.44, 0.05, 0.42, 0.03), fabric, 0, 0.465, 0.005);
  for (const sx of [-1, 1]) part(c, rbox(0.035, 0.46, 0.035, 0.01), wood, sx * 0.2, 0.68, -0.2, { rx: -0.1 });
  part(c, rbox(0.4, 0.3, 0.05, 0.03), fabric, 0, 0.74, -0.215, { rx: -0.1 });
  return c;
}
/**
 * A gooseneck microphone on its base, bending out over +z; the tally ring at its head (lit by the
 * same ring drawn again, glowing, in `lit` while it's used). Returns its group.
 */
function gooseMic(g: THREE.Object3D, x: number, y: number, z: number, ry: number, lit?: THREE.Object3D): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  part(m, rbox(0.1, 0.03, 0.13, 0.012), BLACK, 0, 0.015, 0);
  part(m, cyl(0.012, 0.012, 0.008, 10), '#9e9e9e', 0.025, 0.034, 0.04, { outline: false });
  rod(m, new THREE.Vector3(0, 0.03, -0.03), new THREE.Vector3(0, 0.22, -0.01), 0.006, BLACK);
  rod(m, new THREE.Vector3(0, 0.22, -0.01), new THREE.Vector3(0, 0.3, 0.08), 0.006, BLACK);
  part(m, cyl(0.014, 0.011, 0.075, 10), '#424242', 0, 0.31, 0.12, { rx: Math.PI / 2 - 0.45 });
  part(m, cyl(0.0155, 0.0155, 0.008, 12), '#5a1a1a', 0, 0.297, 0.093, { rx: Math.PI / 2 - 0.45, outline: false });
  if (lit) {
    const on = alongside(lit, m);
    glowing(on, cyl(0.016, 0.016, 0.009, 12), '#ff1744', 0, 0.297, 0.093, Math.PI / 2 - 0.45);
  }
  return m;
}
/** A desk nameplate block (words on a dark plate in gold), facing +z turned `ry`. */
function nameplate(g: THREE.Object3D, s: string, w: number, x: number, y: number, z: number, ry = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.rotation.y = ry;
  g.add(p);
  part(p, rbox(w, 0.09, 0.05, 0.01), '#3e2723', 0, 0.045, 0);
  part(p, rbox(w + 0.02, 0.012, 0.06, 0.004), GOLD, 0, 0.006, 0, { outline: false });
  label(p, s, w - 0.03, 0.06, 0, 0.05, 0.026, '#3e2723', '#f5d76e');
}
/** A ring binder lying flat, its spine to +x, turned `ry`; `tab` coloured index tabs out of its front. */
function binderFlat(g: THREE.Object3D, x: number, y: number, z: number, color: string, ry = 0, thick = 0.05, tabs = 0): THREE.Group {
  const b = new THREE.Group();
  b.position.set(x, y, z);
  b.rotation.y = ry;
  g.add(b);
  part(b, rbox(0.25, thick, 0.32, 0.008), color, 0, thick / 2, 0);
  part(b, box(0.23, thick - 0.012, 0.3), PAPER, -0.012, thick / 2, 0, { outline: false });
  const k = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc'];
  for (let i = 0; i < tabs; i++) part(b, box(0.018, 0.004, 0.035), k[i % k.length], -0.13, thick * (0.2 + (0.6 * i) / Math.max(1, tabs - 1)), -0.12 + i * 0.06, { outline: false });
  return b;
}
/** A banker's lamp: brass foot and stem, the green glass shade (lit underneath while it's used). */
function bankersLamp(g: THREE.Object3D, x: number, y: number, z: number, ry: number, lit: THREE.Object3D, k = 1) {
  const l = new THREE.Group();
  l.position.set(x, y, z);
  l.rotation.y = ry;
  l.scale.setScalar(k);
  g.add(l);
  part(l, rbox(0.2, 0.025, 0.12, 0.02), BRASS, 0, 0.012, 0);
  for (const sx of [-1, 1]) part(l, cyl(0.008, 0.008, 0.28, 8), BRASS, sx * 0.06, 0.16, -0.02, { outline: false });
  part(l, cyl(0.06, 0.06, 0.32, 18), '#1b5e20', 0, 0.33, 0.0, { rz: Math.PI / 2 }).scale.set(1, 1, 0.75);
  part(l, cyl(0.006, 0.006, 0.08, 6), BRASS, 0.07, 0.24, 0.05, { outline: false });
  const on = alongside(lit, l);
  glowing(on, box(0.28, 0.01, 0.07), '#fff3c4', 0, 0.282, 0.0);
}
/** A round red 인주 pad and a seal on its end beside it. */
function sealSet(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.035, 0.035, 0.02, 16), '#b71c1c', x, y + 0.01, z);
  part(g, cyl(0.03, 0.03, 0.004, 16), '#d32f2f', x, y + 0.021, z, { outline: false });
  part(g, cyl(0.011, 0.012, 0.06, 10), '#efe3c8', x + 0.06, y + 0.03, z + 0.01);
}
/** A pen lying on a top. */
const pen = (g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#1a237e') => part(g, cyl(0.0045, 0.0045, 0.14, 6), color, x, y + 0.005, z, { rz: Math.PI / 2, ry, outline: false });

// ---------------------------------------------------------------------------------------------
// What's printed on the papers and the screens.

const CASE = '2026가합10482';

/** A 준비서면 (the brief): the case, the parties, the heads of argument. */
const paintBrief: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  text(c, '준 비 서 면', 128, 30, 22, '#111111', 'center');
  const row = (k: string, v: string, y: number) => {
    text(c, k, 22, y, 11, '#222222', 'left');
    text(c, v, 72, y, 11, '#222222', 'left', false);
  };
  row('사    건', `${CASE} 손해배상(기)`, 62);
  row('원    고', '주식회사 한빛물산', 80);
  row('피    고', '김민호', 98);
  text(c, '위 사건에 관하여 원고 소송대리인은 다음과 같이', 22, 124, 10, '#333333', 'left', false);
  text(c, '변론을 준비합니다.', 22, 138, 10, '#333333', 'left', false);
  text(c, '다      음', 128, 162, 13, '#111111', 'center');
  const r = seeded(4);
  const lines = (y0: number, n: number) => {
    c.fillStyle = '#b0b0b0';
    for (let i = 0; i < n; i++) c.fillRect(i === 0 ? 34 : 22, y0 + i * 12, (i === n - 1 ? 0.5 : 0.85 + r() * 0.1) * 200, 3);
  };
  text(c, '1. 사실관계', 22, 184, 12, '#111111');
  lines(196, 5);
  c.fillStyle = 'rgba(229,57,53,0.85)';
  c.fillRect(34, 226, 150, 2);
  text(c, '2. 피고 주장에 대한 반박', 22, 266, 12, '#111111');
  lines(278, 5);
  text(c, '원고 소송대리인 변호사  진 소 연', 234, 346, 10, '#222222', 'right');
};
/** The brief on screen, open in the word processor. */
const paintBriefScreen: Paint = (c) => {
  c.fillStyle = '#dfe4ea';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#1e5aa8';
  c.fillRect(0, 0, 384, 22);
  text(c, `준비서면_${CASE}.hwp`, 8, 12, 12, '#ffffff', 'left');
  c.fillStyle = '#f5f6f8';
  c.fillRect(0, 22, 384, 18);
  for (let i = 0; i < 12; i++) {
    c.fillStyle = i % 4 === 0 ? '#90a4ae' : '#b0bec5';
    c.fillRect(8 + i * 22, 26, 14, 10);
  }
  c.fillStyle = '#ffffff';
  c.fillRect(70, 46, 244, 210);
  text(c, '준 비 서 면', 192, 64, 15, '#111111', 'center');
  text(c, `사  건  ${CASE}`, 84, 86, 9, '#333333', 'left', false);
  text(c, '원  고  주식회사 한빛물산', 84, 98, 9, '#333333', 'left', false);
  text(c, '1. 사실관계', 84, 120, 10, '#111111');
  const r = seeded(9);
  c.fillStyle = '#9e9e9e';
  for (let i = 0; i < 9; i++) c.fillRect(i === 0 ? 96 : 84, 132 + i * 11, 160 + r() * 50, 3);
  c.fillStyle = '#111111';
  c.fillRect(84 + 120, 220, 2, 10);
};
/** A party's 증거목록 on the counsel table's laptop: the exhibits by number. */
const paintExhibits = (who: '갑' | '을'): Paint => (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = who === '갑' ? '#1565c0' : '#2e7d32';
  c.fillRect(0, 0, 256, 24);
  text(c, `증거목록 (${who === '갑' ? '원고' : '피고'})`, 10, 13, 13, '#ffffff', 'left');
  const items = who === '갑' ? ['물품공급계약서', '내용증명', '거래명세서', '현장 사진', '감정서'] : ['합의서', '입금 내역', '문자 메시지', '사실확인서', '진단서'];
  items.forEach((s, i) => {
    const y = 38 + i * 24;
    c.fillStyle = i % 2 ? '#f5f5f5' : '#ffffff';
    c.fillRect(0, y - 11, 256, 22);
    text(c, `${who} 제${i + 1}호증`, 10, y, 11, '#37474f', 'left');
    text(c, s, 96, y, 11, '#37474f', 'left', false);
    if (i === 2) {
      c.strokeStyle = '#e53935';
      c.lineWidth = 2;
      c.strokeRect(4, y - 10, 248, 20);
    }
  });
};
/** The courtroom's case display on the clerk's ledge: the court, the case being heard, the parties. */
const paintDocket: Paint = (c) => {
  c.fillStyle = '#0d1b3e';
  c.fillRect(0, 0, 384, 216);
  c.fillStyle = '#16306b';
  c.fillRect(0, 0, 384, 40);
  text(c, '제302호 법정 · 민사 제11부', 192, 21, 18, '#ffffff', 'center');
  text(c, '10:30', 18, 70, 18, '#ffd54f', 'left');
  text(c, CASE, 90, 70, 18, '#ffffff', 'left');
  text(c, '손해배상(기)', 90, 98, 15, '#bbdefb', 'left', false);
  text(c, '원고  주식회사 한빛물산', 90, 128, 14, '#e3f2fd', 'left', false);
  text(c, '피고  김민호', 90, 150, 14, '#e3f2fd', 'left', false);
  c.fillStyle = '#e53935';
  c.beginPath();
  c.arc(26, 190, 7, 0, Math.PI * 2);
  c.fill();
  text(c, '개정 중 · 녹음 중', 40, 191, 14, '#ff8a80', 'left');
  text(c, '다음 11:00 2026가단5531', 370, 191, 12, '#90a4ae', 'right', false);
};
/** The clerk's own screen: the trial record being taken, the recording's level. */
const paintRecordScreen: Paint = (c) => {
  c.fillStyle = '#eef2f5';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#37474f';
  c.fillRect(0, 0, 256, 20);
  text(c, '변론조서 작성', 8, 11, 11, '#ffffff', 'left');
  text(c, '● REC 01:12:44', 248, 11, 11, '#ff5252', 'right');
  const r = seeded(21);
  c.fillStyle = '#90a4ae';
  for (let i = 0; i < 8; i++) c.fillRect(10, 32 + i * 14, 120 + r() * 110, 4);
  for (let i = 0; i < 24; i++) {
    const h = 4 + r() * 22;
    c.fillStyle = '#26a69a';
    c.fillRect(10 + i * 10, 152 - h, 6, h);
  }
};
/** The 선서문 on the witness stand. */
const paintOath: Paint = (c) => {
  c.fillStyle = '#fffdf5';
  c.fillRect(0, 0, 256, 180);
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 4;
  c.strokeRect(6, 6, 244, 168);
  text(c, '선      서', 128, 34, 22, '#3e2723', 'center');
  text(c, '양심에 따라 숨김과 보탬이 없이', 128, 72, 13, '#3e2723', 'center', false);
  text(c, '사실 그대로 말하고 만일 거짓말이', 128, 94, 13, '#3e2723', 'center', false);
  text(c, '있으면 위증의 벌을 받기로', 128, 116, 13, '#3e2723', 'center', false);
  text(c, '맹세합니다.', 128, 138, 13, '#3e2723', 'center', false);
  text(c, '증인 ____________ (서명)', 236, 162, 11, '#5d4037', 'right', false);
};
/** The 소송위임계약서 laid out to be signed, the firm's seal already on it. */
const paintRetainer: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  text(c, '소송위임계약서', 128, 30, 20, '#111111', 'center');
  text(c, '위임인(갑)  ____________', 24, 66, 11, '#222222', 'left', false);
  text(c, '수임인(을)  법무법인 정의', 24, 84, 11, '#222222', 'left', false);
  const r = seeded(13);
  const art = (title: string, y: number, n: number) => {
    text(c, title, 24, y, 11, '#111111');
    c.fillStyle = '#b5b5b5';
    for (let i = 0; i < n; i++) c.fillRect(24, y + 12 + i * 11, 160 + r() * 46, 3);
  };
  art('제1조 (위임사무)', 112, 3);
  art('제2조 (착수금)', 166, 2);
  text(c, '금 오백오십만 원정 (₩5,500,000)', 24, 210, 11, '#1a237e', 'left');
  art('제3조 (성공보수)', 236, 2);
  text(c, '2026년 10월 27일', 128, 296, 11, '#222222', 'center', false);
  text(c, '갑:              (인)', 24, 326, 11, '#222222', 'left', false);
  text(c, '을: 법무법인 정의  (인)', 132, 326, 11, '#222222', 'left', false);
  c.strokeStyle = '#d32f2f';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(228, 324, 14, 0, Math.PI * 2);
  c.stroke();
  text(c, '정의', 228, 325, 10, '#d32f2f', 'center');
};
/** A row of the law library's books, spine to spine: the 판례집, the 법령집 binders, the 주해서. */
const paintSpines = (set: 'reports' | 'statutes' | 'commentary' | 'journals'): Paint => (c) => {
  const W = 512;
  const H = 160;
  c.fillStyle = '#1b120e';
  c.fillRect(0, 0, W, H);
  const r = seeded(set.length * 7 + 3);
  let x = 2;
  let n = 1;
  while (x < W - 10) {
    const w = set === 'statutes' ? 44 : set === 'journals' ? 22 + r() * 8 : 28 + r() * 6;
    const top = set === 'journals' ? 18 + r() * 24 : set === 'commentary' ? 10 + r() * 6 : 6;
    const col =
      set === 'reports' ? (n % 9 === 0 ? '#1b3a2a' : '#1f4d36') : set === 'statutes' ? '#1e4f8f' : set === 'commentary' ? ['#6d1b1b', '#7b2a20', '#5b1616'][n % 3] : ['#263238', '#4e342e', '#37474f', '#1a237e'][Math.floor(r() * 4)];
    c.fillStyle = col;
    c.fillRect(x, top, w - 2, H - top);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(x + 2, top, 3, H - top);
    if (set === 'reports' || set === 'commentary') {
      c.fillStyle = '#c9a227';
      for (const y of [top + 10, H - 22]) c.fillRect(x + 2, y, w - 6, 3);
      vtext(c, set === 'reports' ? '판례집' : ['민법주해', '형법각칙', '상법강의'][n % 3], x + w / 2 - 1, top + 28, 12, '#e8c766');
      text(c, set === 'reports' ? `${2010 + n}` : ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][n % 4], x + w / 2 - 1, H - 34, 9, '#e8c766', 'center');
    } else if (set === 'statutes') {
      c.fillStyle = '#ffffff';
      c.fillRect(x + 8, top + 16, w - 18, 70);
      vtext(c, '법령집', x + w / 2 - 1, top + 30, 13, '#0d47a1');
      text(c, String(n), x + w / 2 - 1, top + 104, 14, '#ffffff', 'center');
      c.fillStyle = '#b0bec5';
      c.beginPath();
      c.arc(x + w / 2 - 1, H - 24, 6, 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.fillRect(x + 4, top + 12, w - 10, 3);
    }
    x += w;
    n++;
  }
};
/** A case-record binder's spine label: the year, the kind of case and its number, the client. */
const paintFileSpine = (i: number): Paint => (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 64, 256);
  c.fillStyle = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b'][i % 6];
  c.fillRect(0, 0, 64, 30);
  text(c, String(2023 + (i % 4)), 32, 16, 15, '#ffffff', 'center');
  vtext(c, ['가합', '가단', '나', '고합', '구합', '드합'][i % 6], 32, 54, 18, '#212121');
  text(c, String(10000 + ((i * 7919) % 89999)), 32, 132, 12, '#212121', 'center', false);
  vtext(c, ['한빛물산', '김민호', '서준건설', '이수진', '대성식품', '박영철'][i % 6], 32, 160, 13, '#455a64', false);
};

// ---------------------------------------------------------------------------------------------
// The pieces.

/** A counsel table (원고석, 피고석): built facing +z, the advocates sat on the +z side looking over it. */
function counselTable(side: '원고' | '피고'): Builder {
  return (g, W, D, _c, _def, _ctx, out) => {
    const w = W - 0.1;
    const d = 0.52;
    const h = 0.74;
    const zc = -D / 2 + d / 2 + 0.02;
    const zb = zc - d / 2;
    const zf = zc + d / 2;
    const tab = side === '원고' ? '#1e88e5' : '#43a047';
    // The panelled front the court sees, its ends, the top.
    part(g, rbox(w, 0.7, 0.035, 0.01), OAK, 0, 0.36, zb + 0.02);
    for (const sx of [-1, 1]) {
      part(g, rbox(w / 2 - 0.18, 0.42, 0.012, 0.008), PANEL, sx * (w / 4 + 0.02), 0.34, zb - 0.0, { outline: false });
      part(g, rbox(0.04, 0.72, d - 0.04, 0.01), OAK, sx * (w / 2 - 0.02), 0.36, zc);
    }
    part(g, rbox(w + 0.04, 0.04, d + 0.04, 0.012), shade(OAK, 1.1), 0, h, zc);
    part(g, rbox(w - 0.1, 0.02, d - 0.1, 0.006), shade(OAK, 0.85), 0, 0.12, zc);
    // The nameplate on the front, and a tent card on the top that reads from both sides.
    part(g, rbox(0.56, 0.16, 0.02, 0.008), '#3e2723', 0, 0.56, zb - 0.012);
    label(g, side === '원고' ? '원      고' : '피      고', 0.5, 0.12, 0, 0.56, zb - 0.024, '#3e2723', '#f5d76e', Math.PI);
    const tent = new THREE.Group();
    tent.position.set(0, h + 0.02, zb + 0.08);
    g.add(tent);
    for (const sz of [-1, 1]) {
      part(tent, box(0.4, 0.12, 0.006), '#fafafa', 0, 0.055, sz * 0.022, { rx: -sz * 0.35 });
      label(tent, `${side} 소송대리인`, 0.36, 0.08, 0, 0.055, sz * 0.026, '#fafafa', '#263238', sz > 0 ? 0 : Math.PI).rotation.x = -sz * 0.35;
    }
    // A microphone at each place, bending out to whoever sits there.
    const lit = new THREE.Group();
    g.add(lit);
    const top = h + 0.02;
    for (const sx of [-1, 1]) gooseMic(g, sx * 0.45, top, zb + 0.1, 0, sx > 0 ? lit : undefined);
    // The exhibits: the binder of 호증 with its index tabs, a stack of the record, the laptop with the 증거목록.
    const bx = 0.12;
    const bz = zc + 0.04;
    binderFlat(g, bx, top, bz, tab, 0.08, 0.07, 6);
    label(g, `${side === '원고' ? '갑' : '을'} 제1~15호증`, 0.16, 0.035, bx, top + 0.071, bz, '#ffffff', '#263238').rotation.set(-Math.PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) binderFlat(g, -0.75, top + i * 0.045, zc - 0.04, ['#5d4037', '#455a64', '#6d4c41'][i], 0.1 - i * 0.07, 0.04);
    const lx = -0.42;
    part(g, rbox(0.32, 0.015, 0.22, 0.008), '#b0bec5', lx, top + 0.008, zc + 0.04);
    const lid = new THREE.Group();
    lid.position.set(lx, top + 0.015, zc - 0.07);
    lid.rotation.x = -0.25;
    g.add(lid);
    part(lid, rbox(0.32, 0.21, 0.012, 0.008), '#90a4ae', 0, 0.105, 0);
    out.screen = litScreen(lid, painted(`lwExhibits${side}`, 256, 160, paintExhibits(side === '원고' ? '갑' : '을')), 0.29, 0.18, 0, 0.105, 0.008);
    // The legal pad and pen in front of the right-hand place, a bottle of water.
    const px = 0.45;
    part(g, box(0.22, 0.006, 0.3), '#fff59d', px, top + 0.003, zf - 0.2, { outline: false });
    part(g, box(0.22, 0.008, 0.03), '#f9a825', px, top + 0.005, zf - 0.33, { outline: false });
    pen(g, px + 0.13, top, zf - 0.2, 0.3);
    part(g, cyl(0.03, 0.03, 0.2, 12), '#b3e5fc', 0.86, top + 0.1, zb + 0.08, { outline: false });
    part(g, cyl(0.016, 0.016, 0.025, 10), '#1565c0', 0.86, top + 0.21, zb + 0.08, { outline: false });
    // In use: the exhibits pulled out and laid along the top, tabs flagged, the pen in hand.
    const use = new THREE.Group();
    g.add(use);
    use.add(lit);
    for (let i = 0; i < 3; i++) flat(use, painted('lwBrief', 256, 362, paintBrief), 0.15, 0.21, 0.7 + i * 0.07, top + 0.004 + i * 0.002, zf - 0.17 - i * 0.03, -0.3 + i * 0.25);
    part(use, box(0.02, 0.004, 0.04), '#ff7043', 0.76, top + 0.012, zf - 0.28, { outline: false });
    out.inUse = use;
    // Chairs: two to a table, pulled up to it.
    for (const sx of [-1, 1]) swivel(g, sx * 0.45, zf + 0.25, Math.PI, NAVY, 0.5);
    const work = marker(g, px, top + 0.01, zf - 0.18);
    out.work = work;
    out.spots = { '*': sitAt(g, px, 0.48, zf + 0.25, Math.PI, 'write', work) };
  };
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * An associate's desk: walnut on a pedestal of drawers, the brief open on the screen, the keyboard,
   * the case records stacked at the back with their tabs, the red 법전, the 인주 and the seal, a
   * banker's lamp lit while it's worked at, a black leather chair. Briefs and opinions are typed;
   * the record's read, held up in the chair; a pitch or a strategy meeting is talked through with a
   * notebook.
   */
  lawDesk(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.04;
    const d = 0.62;
    const h = 0.74;
    const zc = -D / 2 + d / 2 + 0.03;
    const zf = zc + d / 2;
    part(g, rbox(w, 0.04, d, 0.012), WALNUT, 0, h, zc);
    part(g, rbox(w - 0.02, 0.012, d - 0.02, 0.004), shade(WALNUT, 1.25), 0, h + 0.021, zc, { outline: false });
    // The pedestal on the left: three drawers with brass pulls; a side panel on the right; the modesty panel.
    const px = -w / 2 + 0.2;
    part(g, rbox(0.36, h - 0.04, d - 0.06, 0.01), shade(WALNUT, 0.9), px, (h - 0.04) / 2, zc);
    for (let i = 0; i < 3; i++) {
      const y = 0.13 + i * 0.2;
      part(g, rbox(0.32, 0.17, 0.015, 0.006), WALNUT, px, y, zf - 0.025);
      part(g, rbox(0.08, 0.014, 0.015, 0.005), BRASS, px, y + 0.03, zf - 0.012, { outline: false });
    }
    part(g, rbox(0.035, h - 0.02, d - 0.06, 0.008), shade(WALNUT, 0.9), w / 2 - 0.03, (h - 0.02) / 2, zc);
    part(g, rbox(w - 0.1, 0.42, 0.02, 0.008), shade(WALNUT, 0.85), 0, h - 0.25, zc - d / 2 + 0.04);
    const top = h + 0.025;
    // The monitor with the brief, the keyboard and mouse.
    const mx = 0.08;
    const mz = zc - 0.15;
    part(g, rbox(0.18, 0.012, 0.13, 0.006), BLACK, mx, top + 0.006, mz);
    part(g, rbox(0.035, 0.2, 0.025, 0.008), BLACK, mx, top + 0.1, mz - 0.03);
    part(g, rbox(0.46, 0.29, 0.03, 0.01), BLACK, mx, top + 0.32, mz);
    out.screen = litScreen(g, painted('lwBriefScreen', 384, 256, paintBriefScreen), 0.43, 0.26, mx, top + 0.32, mz + 0.017);
    part(g, rbox(0.34, 0.014, 0.12, 0.006), '#37474f', mx - 0.02, top + 0.007, zf - 0.16);
    part(g, box(0.32, 0.004, 0.1), '#eceff1', mx - 0.02, top + 0.016, zf - 0.16, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#37474f', mx + 0.24, top + 0.01, zf - 0.15);
    // The case records at the back left, the red 법전 on them, the seal and 인주, pens in a pot.
    for (let i = 0; i < 3; i++) binderFlat(g, -0.32, top + i * 0.05, zc - 0.12, ['#455a64', '#1565c0', '#6d4c41'][i], 0.12 - i * 0.1, 0.045, i === 1 ? 4 : 0);
    part(g, rbox(0.17, 0.06, 0.24, 0.01), '#b71c1c', -0.3, top + 0.165, zc - 0.13, { ry: -0.15 });
    label(g, '법 전', 0.08, 0.04, -0.3, top + 0.196, zc - 0.13, '#b71c1c', '#ffd54f').rotation.set(-Math.PI / 2, 0, 0.15);
    sealSet(g, 0.34, top, zc + 0.02);
    // The lamp at the back right, turned along the side, lit while it's worked at.
    const lit = new THREE.Group();
    bankersLamp(g, 0.4, top, zc - 0.2, -1.3, lit, 0.75);
    // In use: the record open on the desk to the left, a page flagged.
    const use = new THREE.Group();
    g.add(use);
    use.add(lit);
    flat(use, painted('lwBrief', 256, 362, paintBrief), 0.16, 0.22, -0.34, top + 0.004, zf - 0.17, 0.1);
    flat(use, painted('lwBrief', 256, 362, paintBrief), 0.16, 0.22, -0.19, top + 0.006, zf - 0.17, -0.05);
    part(use, box(0.012, 0.003, 0.04), '#ffca28', -0.12, top + 0.01, zf - 0.25, { outline: false });
    out.inUse = use;
    // The chair, and how it's sat in.
    swivel(g, 0, zf + 0.24, Math.PI, LEATHER, 0.62);
    const keys = marker(g, mx - 0.02, top + 0.02, zf - 0.16);
    const notes = marker(g, -0.27, top + 0.01, zf - 0.17);
    out.work = keys;
    const type = sitAt(g, 0, 0.48, zf + 0.24, Math.PI, 'type', keys);
    out.seat = type.at;
    out.spots = {
      '*': type,
      reviewCase: also(type, 'read', notes),
      lawyer_clientPitch: also(type, 'meeting', notes),
      lawyer_caseStrategy: also(type, 'meeting', notes),
    };
  },

  /**
   * The law library's case: tall dark wood, the cornice plated 판례 · 법령, rows of the 대법원
   * 판례집 in green and gold, the blue 법령집 binders, the maroon 주해서, the journals and the archive
   * boxes on top; a reading ledge slides out at chest height. A volume's taken down and read standing
   * (its place left empty); a summary is written up at the ledge with the volume open on it.
   */
  lawLibrary(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.04;
    const d = 0.4;
    const H = 2.1;
    const zc = -D / 2 + d / 2 + 0.02;
    const zf = zc + d / 2;
    const wood = '#4e342e';
    part(g, rbox(w, H, 0.02, 0.006), shade(wood, 0.7), 0, H / 2, zc - d / 2 + 0.01);
    for (const sx of [-1, 1]) part(g, rbox(0.04, H, d, 0.01), wood, sx * (w / 2 - 0.02), H / 2, zc);
    part(g, rbox(w + 0.06, 0.08, d + 0.05, 0.015), shade(wood, 1.15), 0, H + 0.04, zc + 0.01);
    part(g, rbox(w - 0.02, 0.1, d, 0.01), shade(wood, 0.85), 0, 0.05, zc);
    part(g, rbox(0.4, 0.07, 0.01, 0.005), BRASS, 0, H + 0.04, zf + 0.04);
    label(g, '판례 · 법령', 0.36, 0.05, 0, H + 0.04, zf + 0.046, '#c9a227', '#3e2723');
    // The shelves and their rows.
    const rows: Array<{ y: number; h: number; set: Parameters<typeof paintSpines>[0] }> = [
      { y: 0.1, h: 0.32, set: 'reports' },
      { y: 0.46, h: 0.32, set: 'reports' },
      { y: 0.82, h: 0.3, set: 'statutes' },
      { y: 1.24, h: 0.28, set: 'commentary' },
      { y: 1.56, h: 0.26, set: 'journals' },
    ];
    const iw = w - 0.08;
    for (const r of rows) {
      part(g, rbox(iw, 0.025, d - 0.02, 0.006), shade(wood, 1.1), 0, r.y, zc);
      part(g, box(iw - 0.02, r.h - 0.01, d - 0.12), '#2a1d17', 0, r.y + 0.0125 + (r.h - 0.01) / 2, zc - 0.03, { outline: false });
      picture(g, painted(`lwSpines${r.set}`, 512, 160, paintSpines(r.set)), iw - 0.02, r.h - 0.01, 0, r.y + 0.0125 + (r.h - 0.01) / 2, zf - 0.088);
    }
    part(g, rbox(iw, 0.025, d - 0.02, 0.006), shade(wood, 1.1), 0, 1.88, zc);
    // Archive boxes on the top shelf.
    for (let i = 0; i < 3; i++) {
      const x = -0.28 + i * 0.29;
      part(g, rbox(0.26, 0.17, 0.3, 0.01), '#bfa27a', x, 1.98, zc - 0.02);
      part(g, box(0.12, 0.05, 0.004), '#ffffff', x, 1.99, zc + 0.131, { outline: false });
      part(g, cyl(0.016, 0.016, 0.004, 10), '#5d4037', x, 1.94, zc + 0.131, { rx: Math.PI / 2, outline: false });
    }
    // The ledge, out at chest height while it's used, the volume open on it and a pad beside;
    // a gap in the second row where it came from.
    const use = new THREE.Group();
    g.add(use);
    const ly = 1.17;
    part(use, rbox(iw - 0.1, 0.025, 0.36, 0.008), shade(wood, 1.2), 0, ly, zf + 0.06);
    for (const sx of [-1, 1]) part(use, rbox(0.03, 0.03, 0.34, 0.006), STEEL, sx * (iw / 2 - 0.08), ly - 0.025, zf + 0.04, { outline: false });
    const page = painted('lwReport', 256, 362, (c) => {
      c.fillStyle = '#f8f3e6';
      c.fillRect(0, 0, 256, 362);
      text(c, '대법원 2024. 5. 30. 선고', 128, 28, 13, '#3e2723', 'center');
      text(c, '2023다29871 판결', 128, 48, 13, '#3e2723', 'center');
      text(c, '【판시사항】', 18, 82, 12, '#1b5e20', 'left');
      const r = seeded(31);
      c.fillStyle = '#9e9486';
      for (let i = 0; i < 18; i++) c.fillRect(18, 100 + i * 13, 180 + r() * 40, 3);
    });
    flat(use, page, 0.17, 0.24, -0.1, ly + 0.016, zf + 0.06, 0.12);
    flat(use, page, 0.17, 0.24, 0.07, ly + 0.016, zf + 0.06, -0.12);
    part(use, box(0.13, 0.006, 0.19), '#fff59d', 0.3, ly + 0.016, zf + 0.07, { outline: false });
    pen(use, 0.3, ly + 0.016, zf + 0.07, 0.6);
    part(use, box(0.06, 0.29, 0.004), '#0f0a08', -0.2, 0.46 + 0.0125 + 0.155, zf - 0.085, { outline: false });
    out.inUse = use;
    const pad = marker(g, 0.22, ly + 0.03, zf + 0.06);
    out.work = pad;
    out.spots = {
      // Taken down and read standing, half turned from the shelf.
      '*': standAt(g, 0.05, 0.45, Math.PI - 0.55, 'read'),
      lawyer_caseBrief: standAt(g, 0.15, 0.42, Math.PI, 'write', pad),
    };
  },

  /**
   * The podium argued at, in the middle of the well facing the bench: an oak lectern on its plinth,
   * panelled, its top sloped to whoever stands at it with a lip for the papers — the 변론요지서 and
   * the binder of exhibits — a gooseneck microphone whose red ring lights while it's spoken into, a
   * little reading light. Argued at to the bench (activity.ts argueBeat): the spot turned round to
   * the gallery and back by the same clock as the hands.
   */
  courtPodium(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.66, 0.05, 0.52, 0.015), shade(OAK, 0.8), 0, 0.025, -0.05);
    part(g, rbox(0.54, 0.95, 0.34, 0.015), OAK, 0, 0.525, -0.1);
    for (const sx of [-1, 1]) part(g, rbox(0.035, 0.98, 0.4, 0.01), shade(OAK, 0.85), sx * 0.29, 0.53, -0.08);
    // The bench's side (-z): a panel and the scales in brass; the speaker's side: a shelf for a bag.
    part(g, rbox(0.4, 0.58, 0.015, 0.008), PANEL, 0, 0.55, -0.275);
    part(g, cyl(0.07, 0.07, 0.012, 22), BRASS, 0, 0.62, -0.285, { rx: Math.PI / 2 });
    label(g, '⚖', 0.09, 0.09, 0, 0.62, -0.292, '#c9a227', '#3e2723', Math.PI);
    part(g, box(0.44, 0.36, 0.02), shade(OAK, 0.55), 0, 0.42, 0.075, { outline: false });
    part(g, rbox(0.46, 0.02, 0.2, 0.006), shade(OAK, 0.9), 0, 0.3, -0.02);
    binderFlat(g, -0.06, 0.31, -0.02, '#37474f', Math.PI / 2, 0.05);
    part(g, rbox(0.3, 0.06, 0.02, 0.008), BRASS, 0, 0.9, 0.08);
    label(g, '변 론 대', 0.27, 0.045, 0, 0.9, 0.091, '#c9a227', '#3e2723');
    // The sloped top and what's on it.
    const top = new THREE.Group();
    top.position.set(0, 1.05, -0.07);
    top.rotation.x = 0.2;
    g.add(top);
    part(top, rbox(0.7, 0.04, 0.48, 0.012), shade(OAK, 1.1), 0, 0, 0);
    part(top, rbox(0.7, 0.04, 0.025, 0.008), OAK, 0, 0.03, 0.23);
    flat(top, painted('lwBrief', 256, 362, paintBrief), 0.21, 0.297, 0.06, 0.022, 0.04, 0.04);
    flat(top, painted('lwBrief', 256, 362, paintBrief), 0.21, 0.297, 0.03, 0.021, 0.02, -0.1);
    binderFlat(top, -0.2, 0.02, 0.02, '#1e88e5', 0.1, 0.035, 5);
    const mic = gooseMic(top, -0.25, 0.02, -0.17, 0.15);
    mic.rotation.x = -0.2;
    const lamp = new THREE.Group();
    lamp.position.set(0.3, 0.02, -0.18);
    lamp.rotation.x = -0.2;
    top.add(lamp);
    part(lamp, cyl(0.03, 0.035, 0.02, 12), BRASS, 0, 0.01, 0);
    rod(lamp, new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, 0.2, 0.05), 0.005, BRASS);
    rod(lamp, new THREE.Vector3(0, 0.2, 0.05), new THREE.Vector3(-0.08, 0.22, 0.15), 0.005, BRASS);
    part(lamp, cyl(0.02, 0.035, 0.05, 12), BRASS, -0.09, 0.2, 0.16);
    // In use: the mic's ring and the light on, the pen out, a water glass.
    const use = new THREE.Group();
    g.add(use);
    const on = alongside(use, top);
    const onMic = alongside(on, mic);
    glowing(onMic, cyl(0.016, 0.016, 0.009, 12), '#ff1744', 0, 0.297, 0.093, Math.PI / 2 - 0.45);
    const onLamp = alongside(on, lamp);
    glowing(onLamp, cyl(0.03, 0.03, 0.004, 12), '#fff8e1', -0.09, 0.174, 0.16);
    pen(on, 0.2, 0.025, 0.1, -0.5);
    out.inUse = use;
    const papers = marker(top, 0.05, 0.03, 0.06);
    out.work = papers;
    const argue = standAt(g, 0, 0.44, Math.PI, 'argue', papers);
    const tmp = new THREE.Vector3();
    out.animate = (t) => {
      argue.at.rotation.y = Math.PI + argueBeat(t, toolPhase(argue.at.getWorldPosition(tmp))).turn * TURN;
    };
    out.spots = { '*': argue };
  },

  lwPlaintiffTable: counselTable('원고'),
  lwDefenseTable: counselTable('피고'),

  /**
   * The witness stand in the middle of the well, facing the bench: an oak desk walled in on three
   * sides, 증인 on the front the court sees, a microphone, the 선서문 on a stand, a padded chair.
   * In use the witness sits in it, hands on the desk, and the advocate stands at its side with an
   * exhibit laid in front of them — put to the witness, turned to the gallery, back to the bench.
   */
  lwWitnessStand(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.2, 0.72);
    const h = 0.76;
    const zb = -D / 2 + 0.06;
    const zf = -0.06;
    const zc = (zb + zf) / 2;
    part(g, rbox(w, 0.9, 0.035, 0.01), OAK, 0, 0.45, zb);
    part(g, rbox(w - 0.14, 0.5, 0.012, 0.006), PANEL, 0, 0.42, zb - 0.02, { outline: false });
    part(g, rbox(0.34, 0.11, 0.015, 0.006), '#3e2723', 0, 0.72, zb - 0.022);
    label(g, '증      인', 0.3, 0.08, 0, 0.72, zb - 0.031, '#3e2723', '#f5d76e', Math.PI);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.035, 0.9, 0.62, 0.01), OAK, sx * (w / 2), 0.45, zb + 0.29);
      part(g, rbox(0.012, 0.42, 0.42, 0.006), PANEL, sx * (w / 2 + 0.02), 0.42, zb + 0.29, { outline: false });
    }
    part(g, rbox(w + 0.04, 0.035, zf - zb + 0.04, 0.01), shade(OAK, 1.1), 0, h, zc);
    part(g, rbox(w + 0.06, 0.03, 0.06, 0.01), shade(OAK, 1.1), 0, 0.92, zb);
    const top = h + 0.018;
    gooseMic(g, -0.18, top, zb + 0.08, 0.3);
    // The oath on its little stand, a glass of water.
    const os = new THREE.Group();
    os.position.set(0.12, top, zb + 0.08);
    os.rotation.x = -0.35;
    g.add(os);
    part(os, rbox(0.22, 0.16, 0.012, 0.005), '#5d4037', 0, 0.08, 0);
    picture(os, painted('lwOath', 256, 180, paintOath), 0.2, 0.14, 0, 0.08, 0.007);
    part(g, cyl(0.028, 0.024, 0.09, 12), '#e1f5fe', -0.02, top + 0.045, zb + 0.12, { outline: false });
    // The chair.
    const seatZ = 0.22;
    sideChair(g, 0, seatZ + 0.04, Math.PI, '#5d4037', shade(OAK, 0.8));
    // In use: the witness sat facing the bench, the hands on the desk; the exhibit laid before them.
    const use = new THREE.Group();
    g.add(use);
    const sat = new THREE.Group();
    sat.position.set(0, 0, seatZ + 0.04);
    sat.rotation.y = Math.PI;
    use.add(sat);
    const coat = '#6d7f5e';
    const trousers = '#3e4a5a';
    part(sat, rbox(0.36, 0.14, 0.34, 0.06), trousers, 0, 0.55, 0.06);
    for (const sx of [-1, 1]) {
      rod(sat, new THREE.Vector3(sx * 0.09, 0.53, 0.2), new THREE.Vector3(sx * 0.1, 0.1, 0.27), 0.055, trousers);
      part(sat, rbox(0.1, 0.08, 0.22, 0.03), '#3e2723', sx * 0.1, 0.04, 0.32);
    }
    part(sat, rbox(0.38, 0.5, 0.22, 0.09), coat, 0, 0.86, -0.04);
    part(sat, box(0.12, 0.2, 0.01), '#eeeeee', 0, 0.98, 0.07, { outline: false });
    for (const sx of [-1, 1]) {
      rod(sat, new THREE.Vector3(sx * 0.21, 1.04, -0.04), new THREE.Vector3(sx * 0.23, 0.82, 0.1), 0.045, coat);
      rod(sat, new THREE.Vector3(sx * 0.23, 0.82, 0.1), new THREE.Vector3(sx * 0.12, 0.8, 0.36), 0.04, coat);
      part(sat, ball(0.042), SKIN, sx * 0.1, 0.8, 0.4).scale.set(1, 0.6, 1.2);
    }
    rod(sat, new THREE.Vector3(0, 1.08, -0.04), new THREE.Vector3(0, 1.18, -0.03), 0.05, SKIN);
    part(sat, ball(0.115), SKIN, 0, 1.28, -0.02).scale.set(0.92, 1.05, 1);
    part(sat, ball(0.12), '#6b6b6b', 0, 1.32, -0.05).scale.set(1, 0.85, 1);
    for (const sx of [-1, 1]) part(sat, ball(0.022), SKIN, sx * 0.105, 1.27, -0.02);
    part(sat, box(0.16, 0.025, 0.01), '#212121', 0, 1.29, 0.1, { outline: false });
    flat(use, painted('lwBrief', 256, 362, paintBrief), 0.15, 0.21, 0.24, top + 0.003, zf - 0.12, -0.6);
    out.inUse = use;
    // The advocate at the side, facing the witness: turned to the room and back by the same clock.
    const exhibit = marker(g, 0.24, top + 0.01, zf - 0.12);
    out.work = exhibit;
    const face = Math.atan2(-0.6, 0.18);
    const ask = standAt(g, 0.6, 0.02, face, 'argue', exhibit);
    const tmp = new THREE.Vector3();
    out.animate = (t) => {
      ask.at.rotation.y = face + argueBeat(t, toolPhase(ask.at.getWorldPosition(tmp))).turn * TURN_WITNESS;
    };
    out.spots = { '*': ask };
  },

  /**
   * The 참여관's desk at the foot of the bench, facing the room: a panelled counter with a ledge
   * along its top, 참여관 and 실무관 on its front, the courtroom's display (the case being heard, the
   * parties, 개정 중) on the ledge, the in-tray of filed papers and the receipt stamp; behind it the
   * clerks' desk with the record on screen and the recorder's red light, their two chairs. Papers
   * are filed standing at the ledge, signed for there.
   */
  lwClerkDesk(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.08;
    const zf = D / 2 - 0.22;
    const ch = 1.0;
    // The counter's front: panels, nameplates, the ledge.
    part(g, rbox(w, ch, 0.04, 0.012), OAK, 0, ch / 2, zf);
    for (const sx of [-1, 1]) {
      part(g, rbox(w / 2 - 0.14, 0.52, 0.012, 0.006), PANEL, sx * (w / 4), 0.4, zf + 0.022, { outline: false });
      part(g, rbox(0.3, 0.09, 0.015, 0.006), '#3e2723', sx * (w / 4), 0.78, zf + 0.026);
      label(g, sx < 0 ? '참 여 관' : '실 무 관', 0.26, 0.065, sx * (w / 4), 0.78, zf + 0.035, '#3e2723', '#f5d76e');
    }
    part(g, rbox(w + 0.06, 0.035, 0.24, 0.01), shade(OAK, 1.12), 0, ch + 0.017, zf - 0.04);
    for (const sx of [-1, 1]) part(g, rbox(0.04, ch, 0.7, 0.01), OAK, sx * (w / 2 - 0.02), ch / 2, zf - 0.33);
    // The clerks' desk behind it.
    const dz = zf - 0.3;
    part(g, rbox(w - 0.1, 0.035, 0.4, 0.01), shade(OAK, 1.05), 0, 0.74, dz);
    const top = 0.76;
    for (const sx of [-1, 1]) {
      const x = sx * 0.45;
      part(g, rbox(0.16, 0.012, 0.12, 0.006), BLACK, x, top + 0.006, dz + 0.12);
      part(g, rbox(0.03, 0.16, 0.025, 0.008), BLACK, x, top + 0.08, dz + 0.13);
      const mon = new THREE.Group();
      mon.position.set(x, top + 0.26, dz + 0.12);
      mon.rotation.y = Math.PI;
      g.add(mon);
      part(mon, rbox(0.44, 0.28, 0.03, 0.01), BLACK, 0, 0, 0);
      picture(mon, painted('lwRecordScreen', 256, 160, paintRecordScreen), 0.41, 0.25, 0, 0, 0.017);
      part(g, rbox(0.34, 0.014, 0.12, 0.006), '#37474f', x, top + 0.007, dz - 0.06);
      swivel(g, x, dz - 0.24, 0, '#37474f', 0.48);
    }
    part(g, rbox(0.2, 0.06, 0.14, 0.01), '#263238', 0, top + 0.03, dz + 0.08);
    glowing(g, ball(0.012), '#ff1744', 0.06, top + 0.062, dz + 0.15);
    // On the ledge: the display facing the room, the in-tray, the stamp and 인주.
    const ly = ch + 0.035;
    const disp = new THREE.Group();
    disp.position.set(-0.55, ly, zf - 0.06);
    g.add(disp);
    part(disp, rbox(0.14, 0.012, 0.1, 0.006), BLACK, 0, 0.006, 0);
    part(disp, rbox(0.03, 0.12, 0.02, 0.006), BLACK, 0, 0.07, -0.02);
    part(disp, rbox(0.5, 0.3, 0.03, 0.01), BLACK, 0, 0.27, 0);
    picture(disp, painted('lwDocket', 384, 216, paintDocket), 0.47, 0.265, 0, 0.27, 0.017);
    part(g, rbox(0.3, 0.05, 0.22, 0.008), '#455a64', 0.2, ly + 0.025, zf - 0.06);
    for (let i = 0; i < 4; i++) part(g, box(0.21, 0.004, 0.29), PAPER, 0.2 + (i % 2) * 0.008, ly + 0.035 + i * 0.006, zf - 0.06, { ry: 0.04 * i, outline: false });
    label(g, '접 수', 0.12, 0.035, 0.2, ly + 0.03, zf + 0.052, '#455a64', '#ffffff');
    sealSet(g, 0.55, ly, zf - 0.04);
    // In use: the brief handed across, signed for on the ledge; the receipt stamp's red mark on it.
    const use = new THREE.Group();
    g.add(use);
    flat(use, painted('lwBrief', 256, 362, paintBrief), 0.17, 0.24, 0.48, ly + 0.003, zf - 0.02, Math.PI - 0.15);
    part(use, cyl(0.022, 0.022, 0.002, 14), '#e53935', 0.43, ly + 0.006, zf + 0.04, { outline: false });
    pen(use, 0.52, ly + 0.002, zf + 0.02, -0.4);
    out.inUse = use;
    const sign = marker(g, 0.48, ly + 0.01, zf + 0.0);
    out.work = sign;
    out.spots = { '*': standAt(g, 0.44, D / 2 + 0.2, Math.PI, 'write', sign) };
  },

  /**
   * A row of the gallery's seats behind the bar rail: three padded seats on a shared frame facing the
   * bench, and in front of them the rail that closes off the well — an oak handrail on turned
   * balusters between posts with brass caps, a small 방청석 plate and the notice about recording.
   */
  lwGalleryBench(g, W, D, _c, _def, _ctx, _out) {
    const w = W - 0.06;
    const n = Math.max(1, Math.round(w / 0.62));
    const sw = w / n;
    const sz = -0.18;
    const fabric = '#33506b';
    part(g, rbox(w, 0.05, 0.08, 0.01), BLACK, 0, 0.32, sz - 0.05);
    for (let i = 0; i <= n; i++) {
      const x = -w / 2 + i * sw;
      part(g, rbox(0.05, 0.62, 0.46, 0.012), shade(OAK, 0.8), x, 0.31, sz);
      part(g, rbox(0.06, 0.04, 0.4, 0.012), OAK, x, 0.64, sz + 0.02);
    }
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * sw;
      part(g, rbox(sw - 0.1, 0.08, 0.42, 0.035), fabric, x, 0.43, sz + 0.02);
      part(g, rbox(sw - 0.1, 0.5, 0.08, 0.04), fabric, x, 0.76, sz - 0.2, { rx: -0.12 });
      part(g, rbox(sw - 0.06, 0.56, 0.03, 0.012), shade(OAK, 0.8), x, 0.76, sz - 0.25, { rx: -0.12 });
    }
    // The bar rail in front.
    const rz = D / 2 - 0.06;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.07, 0.9, 0.07, 0.012), OAK, sx * (W / 2 - 0.04), 0.45, rz);
      part(g, ball(0.04), BRASS, sx * (W / 2 - 0.04), 0.93, rz);
    }
    part(g, rbox(W - 0.06, 0.05, 0.08, 0.02), shade(OAK, 1.1), 0, 0.88, rz);
    part(g, rbox(W - 0.06, 0.04, 0.05, 0.01), OAK, 0, 0.1, rz);
    const nb = Math.round((W - 0.2) / 0.14);
    for (let i = 0; i < nb; i++) {
      const x = -(W - 0.2) / 2 + (i + 0.5) * ((W - 0.2) / nb);
      part(g, cyl(0.016, 0.02, 0.74, 8), shade(OAK, 0.9), x, 0.49, rz);
      part(g, ball(0.025), shade(OAK, 0.9), x, 0.5, rz, { outline: false });
    }
    part(g, rbox(0.3, 0.07, 0.01, 0.004), BRASS, 0, 0.72, rz + 0.04);
    label(g, '방 청 석', 0.26, 0.05, 0, 0.72, rz + 0.046, '#c9a227', '#3e2723');
    part(g, rbox(0.26, 0.17, 0.01, 0.004), '#ffffff', W / 2 - 0.3, 0.7, rz + 0.04);
    label(g, '촬영·녹음 금지', 0.24, 0.05, W / 2 - 0.3, 0.73, rz + 0.046, '#ffffff', '#c62828');
    label(g, '휴대전화 OFF', 0.2, 0.04, W / 2 - 0.3, 0.66, rz + 0.046, '#ffffff', '#455a64');
  },

  /**
   * The managing partner's desk: a broad mahogany desk on two pedestals with a green leather inlay,
   * the 대표변호사 nameplate facing whoever's brought in, the scales of justice in gold on the corner,
   * a slim monitor, the banker's lamp, a fountain pen on its stand, the contract to be gone through
   * with the seal beside it, a tall black leather chair. Gone through sat, pen in hand.
   */
  lwPartnerDesk(g, W, D, _c, _def, _ctx, out) {
    const wood = '#4a2a20';
    const w = W - 0.16;
    const d = 0.74;
    const h = 0.76;
    const zc = -D / 2 + d / 2 + 0.03;
    const zf = zc + d / 2;
    part(g, rbox(w, 0.05, d, 0.015), wood, 0, h, zc);
    part(g, rbox(w - 0.5, 0.006, d - 0.24, 0.004), INLAY, 0, h + 0.026, zc + 0.02, { outline: false });
    for (const sx of [-1, 1]) {
      const px = sx * (w / 2 - 0.24);
      part(g, rbox(0.44, h - 0.04, d - 0.06, 0.012), shade(wood, 0.92), px, (h - 0.04) / 2, zc);
      for (let i = 0; i < 3; i++) {
        part(g, rbox(0.4, 0.18, 0.015, 0.006), wood, px, 0.13 + i * 0.21, zf - 0.025);
        part(g, rbox(0.1, 0.016, 0.016, 0.006), GOLD, px, 0.16 + i * 0.21, zf - 0.012, { outline: false });
      }
      part(g, rbox(0.4, 0.5, 0.012, 0.006), shade(wood, 1.15), px, 0.38, zc - d / 2 + 0.024, { outline: false });
    }
    part(g, rbox(w - 0.9, 0.5, 0.025, 0.008), shade(wood, 0.85), 0, h - 0.28, zc - d / 2 + 0.04);
    const top = h + 0.027;
    nameplate(g, '대표변호사 한승철', 0.42, 0, top, zc - d / 2 + 0.08, Math.PI);
    // Lady Justice in gold on the left: blindfolded, the scales up in one hand, the sword in the other.
    const lj = new THREE.Group();
    lj.position.set(-w / 2 + 0.16, top, zc - 0.2);
    lj.rotation.y = 0.5;
    g.add(lj);
    part(lj, rbox(0.14, 0.04, 0.14, 0.01), '#212121', 0, 0.02, 0);
    part(lj, cyl(0.03, 0.065, 0.24, 14), GOLD, 0, 0.16, 0);
    part(lj, cyl(0.035, 0.03, 0.08, 12), GOLD, 0, 0.31, 0);
    part(lj, ball(0.03), GOLD, 0, 0.375, 0);
    part(lj, box(0.062, 0.012, 0.03), '#f5f5f5', 0, 0.38, 0.012, { outline: false });
    rod(lj, new THREE.Vector3(-0.03, 0.33, 0), new THREE.Vector3(-0.08, 0.44, 0.01), 0.008, GOLD);
    rod(lj, new THREE.Vector3(-0.08, 0.44, 0.01), new THREE.Vector3(-0.08, 0.46, 0.01), 0.004, GOLD);
    part(lj, box(0.16, 0.004, 0.004), GOLD, -0.08, 0.46, 0.01, { outline: false });
    for (const sx of [-1, 1]) {
      rod(lj, new THREE.Vector3(-0.08 + sx * 0.075, 0.46, 0.01), new THREE.Vector3(-0.08 + sx * 0.075, 0.4, 0.01), 0.0015, GOLD);
      part(lj, cyl(0.03, 0.02, 0.008, 12), GOLD, -0.08 + sx * 0.075, 0.396, 0.01);
    }
    rod(lj, new THREE.Vector3(0.03, 0.33, 0), new THREE.Vector3(0.05, 0.26, 0.03), 0.008, GOLD);
    rod(lj, new THREE.Vector3(0.05, 0.27, 0.03), new THREE.Vector3(0.06, 0.08, 0.05), 0.005, '#e0e0e0');
    // The monitor, the lamp, the pen stand, a framed photo, the leather portfolio.
    const mx = 0.5;
    part(g, rbox(0.16, 0.01, 0.12, 0.005), '#9e9e9e', mx, top + 0.005, zc - 0.18);
    part(g, rbox(0.025, 0.2, 0.02, 0.006), '#9e9e9e', mx, top + 0.1, zc - 0.2);
    const mon = new THREE.Group();
    mon.position.set(mx, top + 0.33, zc - 0.18);
    mon.rotation.y = -0.25;
    g.add(mon);
    part(mon, rbox(0.5, 0.3, 0.02, 0.008), BLACK, 0, 0, 0);
    out.screen = litScreen(mon, painted('lwBriefScreen', 384, 256, paintBriefScreen), 0.47, 0.27, 0, 0, 0.012);
    const lit = new THREE.Group();
    bankersLamp(g, -0.3, top, zc - 0.23, 0, lit);
    part(g, rbox(0.12, 0.03, 0.08, 0.01), '#212121', -0.36, top + 0.015, zf - 0.12);
    rod(g, new THREE.Vector3(-0.36, top + 0.03, zf - 0.12), new THREE.Vector3(-0.33, top + 0.14, zf - 0.16), 0.006, '#111111');
    part(g, rbox(0.12, 0.15, 0.015, 0.006), GOLD, -0.6, top + 0.08, zc - 0.25, { rx: -0.2, ry: 0.4 });
    part(g, box(0.1, 0.12, 0.004), '#90a4ae', -0.6 + 0.003, top + 0.08, zc - 0.242, { rx: -0.2, ry: 0.4, outline: false });
    part(g, rbox(0.34, 0.025, 0.26, 0.01), '#3e2723', -0.42, top + 0.012, zc - 0.02, { ry: 0.12 });
    sealSet(g, 0.45, top, zf - 0.15);
    flat(g, painted('lwRetainer', 256, 362, paintRetainer), 0.2, 0.28, 0, top + 0.002, zf - 0.2);
    // In use: the lamp lit, the fountain pen out of its stand in the hand.
    const use = new THREE.Group();
    g.add(use);
    use.add(lit);
    flat(use, painted('lwBrief', 256, 362, paintBrief), 0.2, 0.28, 0.2, top + 0.004, zf - 0.22, -0.25);
    out.inUse = use;
    swivel(g, 0, zf + 0.22, Math.PI, LEATHER, 0.78);
    const contract = marker(g, 0, top + 0.01, zf - 0.2);
    out.work = contract;
    const write = sitAt(g, 0, 0.48, zf + 0.22, Math.PI, 'write', contract);
    out.seat = write.at;
    out.spots = { '*': write };
  },

  /**
   * The case-file shelving: grey steel compact shelving on its floor rails, the hand wheel on its
   * end, five shelves of the firm's case records in thick binders, their spines labelled with the
   * year, the kind of case, its number and the client, a year card on each shelf, archive boxes on
   * top. A record's looked out and pulled half out of its row.
   */
  lwCaseFiles(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.08;
    const d = 0.46;
    const H = 2.0;
    const zc = -D / 2 + d / 2 + 0.03;
    const zf = zc + d / 2;
    const steel = '#b0bec5';
    for (const sx of [-1, 1]) part(g, rbox(0.04, 0.02, D - 0.1, 0.005), '#78909c', sx * (w / 2 - 0.25), 0.01, 0, { outline: false });
    part(g, rbox(w, 0.08, d + 0.04, 0.01), shade(steel, 0.8), 0, 0.06, zc);
    for (const sx of [-1, 1]) part(g, rbox(0.035, H, d, 0.008), steel, sx * (w / 2 - 0.018), H / 2, zc);
    part(g, rbox(0.03, H, d - 0.02, 0.008), steel, 0, H / 2, zc);
    part(g, rbox(w, 0.012, d, 0.004), shade(steel, 0.7), 0, H / 2, zc - d / 2 + 0.006, { outline: false });
    part(g, rbox(w + 0.02, 0.04, d + 0.02, 0.01), steel, 0, H, zc);
    // The hand wheel on the right end.
    const hx = w / 2 + 0.01;
    part(g, rbox(0.03, 1.4, d - 0.06, 0.01), '#90a4ae', hx, 0.9, zc);
    part(g, cyl(0.025, 0.025, 0.05, 10), CHROME, hx + 0.03, 1.1, zc, { rz: Math.PI / 2 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, new THREE.Vector3(hx + 0.06, 1.1, zc), new THREE.Vector3(hx + 0.06, 1.1 + Math.sin(a) * 0.13, zc + Math.cos(a) * 0.13), 0.01, CHROME);
      part(g, cyl(0.014, 0.014, 0.07, 8), BLACK, hx + 0.09, 1.1 + Math.sin(a) * 0.13, zc + Math.cos(a) * 0.13, { rz: Math.PI / 2 });
    }
    // Shelves of binders.
    const shelves = [0.12, 0.48, 0.84, 1.2, 1.56];
    let k = 0;
    let pulled: { x: number; y: number } | undefined;
    for (let s = 0; s < shelves.length; s++) {
      const y = shelves[s];
      part(g, rbox(w - 0.06, 0.02, d - 0.02, 0.004), steel, 0, y, zc);
      part(g, box(0.1, 0.03, 0.003), '#ffffff', -w / 2 + 0.12, y + 0.005, zf + 0.002, { outline: false });
      label(g, `${2022 + s}`, 0.09, 0.025, -w / 2 + 0.12, y + 0.005, zf + 0.005, '#ffffff', '#37474f');
      for (const half of [-1, 1]) {
        const x0 = half < 0 ? -w / 2 + 0.05 : 0.03;
        const span = w / 2 - 0.08;
        const nb = Math.floor(span / 0.075);
        for (let i = 0; i < nb; i++) {
          const x = x0 + (i + 0.5) * (span / nb);
          if (s === 2 && half > 0 && i === 3) {
            pulled = { x, y };
            continue;
          }
          const hgt = 0.3;
          const col = ['#37474f', '#455a64', '#5d4037', '#1565c0', '#2e7d32', '#6d4c41'][(k * 5 + s) % 6];
          part(g, rbox(0.065, hgt, d - 0.1, 0.006), col, x, y + 0.01 + hgt / 2, zc - 0.02);
          picture(g, painted(`lwFile${k % 6}`, 64, 256, paintFileSpine(k % 6)), 0.045, 0.2, x, y + 0.01 + hgt / 2 + 0.02, zf - 0.068);
          k++;
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = -w / 2 + 0.25 + i * (w - 0.3) / 4;
      part(g, rbox(0.38, 0.24, 0.36, 0.01), '#bfa27a', x, H + 0.14, zc - 0.02);
      part(g, box(0.16, 0.06, 0.004), '#ffffff', x, H + 0.16, zc + 0.161, { outline: false });
    }
    // The binder pulled out while it's looked out: its gap, and the binder half out.
    const p = pulled ?? { x: 0.3, y: 0.84 };
    const use = new THREE.Group();
    g.add(use);
    part(use, rbox(0.065, 0.3, d - 0.1, 0.006), '#c62828', p.x, p.y + 0.16, zc + 0.18);
    picture(use, painted('lwFile2', 64, 256, paintFileSpine(2)), 0.045, 0.2, p.x, p.y + 0.18, zc + 0.18 + (d - 0.1) / 2 + 0.002);
    const idle = new THREE.Group();
    g.add(idle);
    part(idle, rbox(0.065, 0.3, d - 0.1, 0.006), '#c62828', p.x, p.y + 0.16, zc - 0.02);
    picture(idle, painted('lwFile2', 64, 256, paintFileSpine(2)), 0.045, 0.2, p.x, p.y + 0.18, zf - 0.068);
    out.inUse = use;
    out.idle = idle;
    const hand = marker(g, p.x, p.y + 0.22, zf + 0.12);
    out.work = hand;
    out.spots = { '*': standAt(g, p.x - 0.05, D / 2 + 0.05, Math.PI, 'rummage', hand) };
  },

  /**
   * The table clients are consulted at: a pale wood table on two pedestals with two fabric chairs to
   * a side — the lawyer's and the client's — a box of tissues in the middle, a carafe and glasses,
   * the client's folder, a pad and pen at the lawyer's place, a little vase. In use the 소송위임계약서
   * is turned round for the client to read, the seal and 인주 by it, a cup of tea at their place;
   * the lawyer talks it through sat with a notebook.
   */
  lwConsultTable(g, W, D, _c, _def, _ctx, out) {
    const wood = '#c8a27a';
    const tw = Math.min(W - 0.4, 1.5);
    const td = Math.min(D - 1.1, 0.86);
    const h = 0.73;
    part(g, rbox(tw, 0.045, td, 0.12), wood, 0, h, 0);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.08, h - 0.06, 0.08, 0.02), shade(wood, 0.75), sx * (tw / 2 - 0.25), (h - 0.06) / 2 + 0.03, 0);
      part(g, rbox(0.12, 0.04, td - 0.2, 0.015), shade(wood, 0.75), sx * (tw / 2 - 0.25), 0.02, 0);
    }
    const top = h + 0.023;
    // The middle: tissues, a carafe and glasses, a vase.
    part(g, rbox(0.22, 0.09, 0.12, 0.012), '#eceff1', -0.2, top + 0.045, 0.12);
    part(g, box(0.07, 0.04, 0.03), '#ffffff', -0.2, top + 0.1, 0.12, { outline: false });
    part(g, cyl(0.045, 0.06, 0.2, 14), '#d7f1fb', 0.34, top + 0.1, -0.04, { outline: false });
    part(g, cyl(0.025, 0.03, 0.05, 12), '#d7f1fb', 0.34, top + 0.22, -0.04, { outline: false });
    for (const [x, z] of [[0.48, 0.12], [0.48, -0.18]]) part(g, cyl(0.03, 0.026, 0.09, 12), '#e1f5fe', x, top + 0.045, z, { outline: false });
    part(g, cyl(0.03, 0.04, 0.14, 12), '#eceff1', -0.36, top + 0.07, 0);
    for (let i = 0; i < 3; i++) part(g, ball(0.03), ['#f48fb1', '#fff176', '#ce93d8'][i], -0.36 + (i - 1) * 0.03, top + 0.17 + (i % 2) * 0.02, (i - 1) * 0.02, { outline: false });
    // The lawyer's place (+z): pad and pen; the client's (-z): a folder.
    const lx = 0.32;
    const lz = td / 2 - 0.17;
    part(g, box(0.22, 0.006, 0.3), '#fff59d', lx, top + 0.003, lz, { outline: false });
    pen(g, lx + 0.14, top, lz, 0.4);
    part(g, rbox(0.25, 0.012, 0.32, 0.005), '#1565c0', -0.3, top + 0.006, -lz, { ry: 0.15 });
    // Chairs: two to a side.
    for (const sx of [-1, 1]) {
      sideChair(g, sx * 0.35, td / 2 + 0.3, Math.PI, '#8d9db0', '#6d4c41');
      sideChair(g, sx * 0.35, -td / 2 - 0.3, 0, '#8d9db0', '#6d4c41');
    }
    // In use: the retainer turned to the client with its seal, a cup of tea at their place.
    const use = new THREE.Group();
    g.add(use);
    flat(use, painted('lwRetainer', 256, 362, paintRetainer), 0.2, 0.28, 0, top + 0.004, -0.12, Math.PI);
    pen(use, 0.13, top + 0.004, -0.14, 0.3);
    sealSet(use, 0.14, top, 0.02);
    part(use, cyl(0.04, 0.032, 0.06, 14), '#ffffff', 0.2, top + 0.03, -0.3);
    part(use, cyl(0.036, 0.036, 0.004, 14), '#c8a26a', 0.2, top + 0.058, -0.3, { outline: false });
    out.inUse = use;
    const padAt = marker(g, lx, top + 0.01, lz);
    out.work = padAt;
    out.spots = { '*': sitAt(g, lx, 0.48, td / 2 + 0.3, Math.PI, 'meeting', padAt) };
  },

  /**
   * The firm's reception desk (2026-11-05, the layout audit), 2 × 1 inside the glass door: a walnut front with the firm's name in
   * brass, a raised ledge for visitors to sign in at, the receptionist's monitor and phone behind, the visitors' book, a vase.
   */
  lwReception(g, W, D) {
    const w = W - 0.2;
    const zc = 0.2;
    part(g, rbox(w, 1.05, 0.5, 0.02), WALNUT, 0, 0.525, zc);
    part(g, rbox(w + 0.04, 0.04, 0.3, 0.012), shade(OAK, 1.15), 0, 1.07, zc + 0.12);
    part(g, rbox(w - 0.1, 0.04, 0.46, 0.012), shade(WALNUT, 1.2), 0, 0.74, zc - 0.02);
    part(g, rbox(0.9, 0.12, 0.012, 0.004), BRASS, 0, 0.62, zc + 0.256);
    label(g, '법무법인 새솔', 0.82, 0.09, 0, 0.62, zc + 0.264, '#c9a227', '#3e2723');
    // The visitors' book on the ledge, a vase.
    part(g, box(0.3, 0.02, 0.22), '#1a237e', -0.35, 1.1, zc + 0.12, { outline: false });
    part(g, box(0.28, 0.004, 0.2), PAPER, -0.35, 1.112, zc + 0.12, { outline: false });
    part(g, cyl(0.05, 0.04, 0.2, 12), '#eceff1', 0.6, 1.19, zc + 0.12);
    for (const [x, z] of [[0.58, 0.1], [0.63, 0.14], [0.6, 0.16]]) part(g, ball(0.035), '#f8bbd0', x, 1.32, zc + z, { outline: false });
    // Behind: the monitor, the phone, the chair.
    part(g, rbox(0.46, 0.28, 0.02, 0.008), BLACK, 0.1, 0.98, zc - 0.12);
    part(g, rbox(0.04, 0.12, 0.03, 0.006), BLACK, 0.1, 0.8, zc - 0.13);
    part(g, rbox(0.18, 0.05, 0.14, 0.01), '#37474f', -0.4, 0.785, zc - 0.1);
    const ch = new THREE.Group();
    ch.position.set(0, 0, -D / 2 + 0.24);
    g.add(ch);
    starBase(ch, 0, 0, 0.24, BLACK);
    part(ch, cyl(0.022, 0.022, 0.24, 10), CHROME, 0, 0.26, 0, { outline: false });
    part(ch, rbox(0.46, 0.08, 0.44, 0.04), LEATHER, 0, 0.42, 0);
    part(ch, rbox(0.46, 0.5, 0.08, 0.04), LEATHER, 0, 0.72, -0.22);
  },

  /** The logo wall behind the reception (2026-11-05, the layout audit): the firm's name and mark lit on a dark panel, its fields under it. */
  lwFirmSign(g, W, D) {
    const z = -D / 2 + 0.04;
    const w = W - 0.2;
    part(g, box(w, 1.5, 0.05), '#263238', 0, 1.45, z);
    picture(g, painted('lwFirmLogo', 512, 384, (c) => {
      c.fillStyle = '#263238';
      c.fillRect(0, 0, 512, 384);
      c.strokeStyle = '#c9a227';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(256, 110, 56, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(256, 70);
      c.lineTo(256, 150);
      c.moveTo(216, 96);
      c.lineTo(296, 96);
      c.stroke();
      text(c, '법무법인 새솔', 256, 222, 52, '#f5e6b8', 'center');
      text(c, 'SAESOL LAW', 256, 270, 26, '#c9a227', 'center');
      text(c, '민사 · 형사 · 기업 자문 · 가사', 256, 330, 24, '#b0bec5', 'center', false);
    }), w - 0.1, 1.38, 0, 1.45, z + 0.03);
  },

  /** The court's walk-through security arch (2026-11-05, the layout audit), 1 × 1 inside its door: the arch walked under, its lamp. */
  lwSecurityGate(g) {
    for (const sx of [-1, 1]) {
      part(g, rbox(0.12, 2.1, 0.5, 0.02), '#cfd8dc', sx * 0.44, 1.05, 0);
      part(g, rbox(0.06, 1.8, 0.4, 0.01), '#b0bec5', sx * 0.38, 1.0, 0, { outline: false });
    }
    part(g, rbox(1.0, 0.24, 0.52, 0.03), '#cfd8dc', 0, 2.2, 0);
    glowing(g, box(0.16, 0.05, 0.02), '#66bb6a', 0, 2.24, 0.27);
    label(g, '보안 검색', 0.4, 0.08, 0, 2.18, 0.265, '#cfd8dc', '#37474f');
    // The tray table beside it and the basket.
    part(g, rbox(0.3, 0.8, 0.4, 0.01), '#90a4ae', 0.75, 0.4, 0.1);
    part(g, rbox(0.26, 0.06, 0.34, 0.01), '#455a64', 0.75, 0.83, 0.1);
  },

  /**
   * The board outside the courtroom (2026-11-05, the layout audit), 2 × 1 on the hall's wall: the courtroom's number and the day's
   * hearings on a screen in a walnut frame, as a Korean court shows its 개정표.
   */
  lwDocketBoard(g, W, D) {
    const z = -D / 2 + 0.05;
    const w = W - 0.4;
    part(g, rbox(w + 0.08, 1.0, 0.06, 0.01), WALNUT, 0, 1.55, z);
    picture(g, painted('lwDocket', 512, 320, (c) => {
      c.fillStyle = '#0d2238';
      c.fillRect(0, 0, 512, 320);
      c.fillStyle = '#1e3a5f';
      c.fillRect(0, 0, 512, 60);
      text(c, '새솔지방법원 제301호 법정', 256, 32, 30, '#ffffff', 'center');
      const rows = [['10:00', '2026가합1043', '손해배상(기)'], ['10:30', '2026가단5521', '대여금'], ['11:00', '2026고단882', '사기'], ['14:00', '2026가합1187', '계약금 반환']];
      rows.forEach(([t, n, s], i) => {
        text(c, t, 24, 98 + i * 54, 24, '#ffd54f', 'left');
        text(c, n, 120, 98 + i * 54, 24, '#e3f2fd', 'left', false);
        text(c, s, 330, 98 + i * 54, 24, '#e3f2fd', 'left', false);
      });
    }), w, 0.9, 0, 1.55, z + 0.035);
  },
};

