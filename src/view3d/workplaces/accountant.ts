import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glow, glowing, label, litScreen, painted, picture, seeded, starBase, text, type Paint } from './doctor';

/**
 * The accounting firm drawn as itself in 결산·세무 season (2026-10-27 workplace pipeline, at the
 * user's request). An accountant's desk behind its fabric partition: two monitors on one arm — the
 * 합계잔액시산표 in the spreadsheet on the left, the 전자신고 on the right lit while it's worked
 * at — the printing calculator with its paper roll and the tape run out of it, the green
 * 총계정원장, the clipped stacks of 전표, the 결재 tray, the sticky notes of the month's deadlines.
 * The shredder (shared with the intelligence office) taped 대외비. And what the firm was missing
 * (workFurniture/accountant.ts): the 세무 신고 마감 board whose clients' magnets are moved along
 * from 대기 to 진행 to 완료, the document scanner the receipts brought in a shopping bag are fed
 * through, the table the 전표 and 증빙 are sorted by account and bound at, the corner where a
 * client is taken through their year-end on the big screen, and the front counter under the firm's
 * name.
 */

const LAMINATE = '#e9e5dc';
const FRAME = '#9ea7ad';
const FABRIC = '#8c9eab';
const PAPER = '#fbfaf5';
const SLIP = '#fff8e1';
const LEDGER = '#2e5e3e';
const WOOD = '#c8a27a';
const NAVY = '#1f3556';
const RED = '#c62828';
const MESH = '#2f3438';

const FIRM = '바른셈 회계법인';
const CLIENT = '㈜다온식품';

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
/** A group at (x, y, z) turned `ry`. */
function at(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}
/** A pen lying on a top. */
const pen = (g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#1a237e') => part(g, cyl(0.0045, 0.0045, 0.14, 6), color, x, y + 0.005, z, { rz: Math.PI / 2, ry, outline: false });

/** A mesh office chair built facing +z: five-star base, gas lift, the seat's top at 0.48, a tall mesh back with a headrest, arms. */
function meshChair(g: THREE.Object3D, x: number, z: number, ry: number): THREE.Group {
  const c = at(g, x, 0, z, ry);
  starBase(c, 0, 0, 0.26, BLACK);
  part(c, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.48, 0.08, 0.46, 0.04), MESH, 0, 0.44, 0);
  part(c, rbox(0.46, 0.56, 0.05, 0.04), MESH, 0, 0.8, -0.23, { rx: -0.1 });
  part(c, rbox(0.38, 0.46, 0.012, 0.03), '#4a5359', 0, 0.8, -0.2, { rx: -0.1, outline: false });
  part(c, rbox(0.28, 0.1, 0.05, 0.03), MESH, 0, 1.13, -0.27, { rx: -0.1 });
  part(c, rbox(0.06, 0.3, 0.04, 0.01), BLACK, 0, 0.5, -0.25, { outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.03, 0.24, 0.012), BLACK, sx * 0.26, 0.66, -0.02);
    part(c, rbox(0.03, 0.18, 0.03, 0.008), BLACK, sx * 0.26, 0.56, -0.06, { outline: false });
  }
  return c;
}
/** A guest chair on a sled base in fabric, built facing +z; the seat's top at 0.47. */
function guestChair(g: THREE.Object3D, x: number, z: number, ry: number, fabric: string): THREE.Group {
  const c = at(g, x, 0, z, ry);
  for (const sx of [-1, 1]) {
    rod(c, new THREE.Vector3(sx * 0.21, 0.01, 0.2), new THREE.Vector3(sx * 0.21, 0.01, -0.2), 0.012, CHROME);
    rod(c, new THREE.Vector3(sx * 0.21, 0.01, 0.2), new THREE.Vector3(sx * 0.21, 0.43, 0.18), 0.012, CHROME);
    rod(c, new THREE.Vector3(sx * 0.21, 0.01, -0.2), new THREE.Vector3(sx * 0.21, 0.43, -0.18), 0.012, CHROME);
  }
  part(c, rbox(0.46, 0.06, 0.44, 0.03), fabric, 0, 0.44, 0);
  part(c, rbox(0.44, 0.34, 0.05, 0.03), fabric, 0, 0.7, -0.22, { rx: -0.08 });
  return c;
}
/** A monitor on an arm's head, facing +z: the bezel, the dark glass (the face is drawn over it). */
function monitor(g: THREE.Object3D, x: number, y: number, z: number, ry: number, w: number, h: number): THREE.Group {
  const m = at(g, x, y, z, ry);
  part(m, rbox(w, h, 0.025, 0.008), BLACK, 0, 0, 0);
  part(m, box(w - 0.03, h - 0.03, 0.004), '#1d232b', 0, 0.006, 0.0115, { outline: false });
  part(m, rbox(0.08, 0.08, 0.02, 0.006), '#3a3f45', 0, 0, -0.02, { outline: false });
  return m;
}
/** A sticky note on something upright facing +z, with a word or two on it. */
function sticky(g: THREE.Object3D, s: string, x: number, y: number, z: number, color: string, rz = 0) {
  const n = label(g, s, 0.07, 0.07, x, y, z, color, '#37474f');
  n.rotation.z = rz;
}
/** A stack of 전표 slips clipped with a black binder clip, `n` thick. */
function slipStack(g: THREE.Object3D, x: number, y: number, z: number, ry: number, n: number, color = SLIP) {
  const s = at(g, x, y, z, ry);
  const r = seeded(Math.round(n * 97 + x * 1000));
  for (let i = 0; i < n; i++) part(s, box(0.1, 0.006, 0.15), i % 3 === 2 ? '#ffffff' : color, (r() - 0.5) * 0.008, 0.003 + i * 0.006, (r() - 0.5) * 0.008, { ry: (r() - 0.5) * 0.08, outline: false });
  const top = 0.006 * n;
  part(s, box(0.035, 0.012, 0.02), BLACK, 0, top / 2 + 0.002, -0.07, { outline: false });
  part(s, box(0.035, top + 0.006, 0.004), BLACK, 0, top / 2, -0.078, { outline: false });
  rod(s, new THREE.Vector3(-0.012, top + 0.006, -0.075), new THREE.Vector3(-0.012, top + 0.03, -0.095), 0.002, CHROME);
  rod(s, new THREE.Vector3(0.012, top + 0.006, -0.075), new THREE.Vector3(0.012, top + 0.03, -0.095), 0.002, CHROME);
}
/** A ledger lying shut: green cloth over its boards, a red spine label. */
function ledgerShut(g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = LEDGER, title = '총계정원장') {
  const l = at(g, x, y, z, ry);
  part(l, rbox(0.2, 0.045, 0.28, 0.006), color, 0, 0.0225, 0);
  part(l, box(0.188, 0.033, 0.27), PAPER, 0.008, 0.0225, 0, { outline: false });
  label(l, title, 0.12, 0.03, 0, 0.046, 0.0, '#f3e5ab', '#3e2723').rotation.set(-Math.PI / 2, 0, 0);
}
/** A rubber stamp and its red ink pad. */
function stampSet(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, rbox(0.09, 0.02, 0.06, 0.006), BLACK, x, y + 0.01, z);
  part(g, box(0.08, 0.004, 0.05), '#d32f2f', x, y + 0.021, z, { outline: false });
  part(g, rbox(0.04, 0.012, 0.025, 0.004), '#5d4037', x + 0.09, y + 0.006, z);
  part(g, cyl(0.012, 0.014, 0.06, 10), '#8d6e63', x + 0.09, y + 0.042, z);
  part(g, ball(0.018), '#6d4c41', x + 0.09, y + 0.08, z);
}

// ---------------------------------------------------------------------------------------------
// What's printed on the papers, the screens and the boards.

/** The 합계잔액시산표 in the spreadsheet: the accounts down the side, 차변 and 대변 agreeing at the foot. */
const paintTrialBalance: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#1d6f42';
  c.fillRect(0, 0, 384, 20);
  text(c, `2026결산_${CLIENT}_시산표.xlsx`, 8, 11, 11, '#ffffff', 'left');
  c.fillStyle = '#f3f3f3';
  c.fillRect(0, 20, 384, 16);
  text(c, 'fx  =SUM(C4:C15)', 8, 28, 9, '#555555', 'left', false);
  c.fillStyle = '#e8f0e8';
  c.fillRect(0, 36, 384, 14);
  ['', 'A', 'B', 'C', 'D'].forEach((s, i) => text(c, s, [10, 70, 170, 260, 340][i], 43, 9, '#555555', 'center', false));
  text(c, '합계잔액시산표 (2026.10.31)', 192, 60, 12, '#111111', 'center');
  const rows: Array<[string, string, string]> = [
    ['계정과목', '차    변', '대    변'],
    ['보통예금', '184,520,000', ''],
    ['외상매출금', '96,300,000', ''],
    ['재고자산', '58,740,000', ''],
    ['비품', '12,400,000', ''],
    ['외상매입금', '', '61,250,000'],
    ['미지급금', '', '8,930,000'],
    ['부가세예수금', '', '14,280,000'],
    ['자본금', '', '100,000,000'],
    ['매출', '', '412,600,000'],
    ['매출원가', '231,880,000', ''],
    ['급여', '92,400,000', ''],
    ['복리후생비', '18,620,000', ''],
  ];
  rows.forEach(([a, d, k], i) => {
    const y = 76 + i * 12.5;
    c.fillStyle = i === 0 ? '#d9ead3' : i % 2 ? '#ffffff' : '#f7f9f7';
    c.fillRect(20, y - 6, 344, 12.5);
    text(c, String(i + 3), 10, y, 8, '#888888', 'center', false);
    text(c, a, 26, y, 9, '#222222', 'left', i === 0);
    text(c, d, 250, y, 9, '#222222', 'right', i === 0);
    text(c, k, 356, y, 9, '#222222', 'right', i === 0);
  });
  const ty = 76 + rows.length * 12.5;
  c.fillStyle = '#fff2cc';
  c.fillRect(20, ty - 6, 344, 13);
  text(c, '합    계', 26, ty, 9, '#111111', 'left');
  text(c, '694,860,000', 250, ty, 9, '#111111', 'right');
  text(c, '694,860,000', 356, ty, 9, '#111111', 'right');
  c.strokeStyle = '#1d6f42';
  c.lineWidth = 2;
  c.strokeRect(268, ty - 7, 94, 14);
  c.strokeStyle = '#d0d7d0';
  c.lineWidth = 1;
  for (const x of [20, 160, 268, 364]) {
    c.beginPath();
    c.moveTo(x, 70);
    c.lineTo(x, ty + 7);
    c.stroke();
  }
  text(c, '차이  ₩0', 356, ty + 18, 10, '#1d6f42', 'right');
  c.fillStyle = '#f3f3f3';
  c.fillRect(0, 240, 384, 16);
  ['시산표', '손익계산서', '재무상태표', '조정분개'].forEach((s, i) => {
    c.fillStyle = i === 0 ? '#ffffff' : '#e3e3e3';
    c.fillRect(6 + i * 74, 241, 70, 14);
    text(c, s, 41 + i * 74, 248, 9, i === 0 ? '#1d6f42' : '#555555', 'center', i === 0);
  });
};
/** The 부가가치세 신고 on the right screen: the steps, the figures filled in, the button to send it. */
const paintFiling: Paint = (c) => {
  c.fillStyle = '#f4f7fb';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#123f8c';
  c.fillRect(0, 0, 384, 26);
  text(c, '국세 전자신고 · 부가가치세 예정신고', 10, 13, 12, '#ffffff', 'left');
  text(c, '마감 오늘 24:00', 374, 13, 10, '#ffd54f', 'right');
  ['기본정보', '매출·매입', '세액계산', '제출'].forEach((s, i) => {
    const x = 50 + i * 95;
    c.fillStyle = i <= 2 ? '#1e63c6' : '#b0bec5';
    c.beginPath();
    c.arc(x, 44, 9, 0, Math.PI * 2);
    c.fill();
    text(c, String(i + 1), x, 44, 10, '#ffffff', 'center');
    text(c, s, x, 62, 9, i === 2 ? '#123f8c' : '#607d8b', 'center', i === 2);
  });
  const row = (k: string, v: string, y: number, hot = false) => {
    c.fillStyle = '#ffffff';
    c.fillRect(20, y - 9, 344, 18);
    c.strokeStyle = '#d5dde6';
    c.strokeRect(20, y - 9, 344, 18);
    text(c, k, 28, y, 10, '#37474f', 'left', false);
    text(c, v, 356, y, 10, hot ? '#c62828' : '#111111', 'right');
  };
  text(c, `상호  ${CLIENT}   사업자번호  214-81-*****`, 20, 84, 9, '#455a64', 'left', false);
  row('과세표준 (매출)', '412,600,000', 104);
  row('매출세액', '41,260,000', 124);
  row('매입세액 (공제)', '27,180,000', 144);
  row('경감·공제세액', '10,000', 164);
  row('납부할 세액', '14,070,000', 186, true);
  c.fillStyle = '#1e63c6';
  c.fillRect(250, 212, 114, 28);
  text(c, '신고서 제출하기', 307, 226, 12, '#ffffff', 'center');
  c.fillStyle = '#ffffff';
  c.fillRect(132, 212, 108, 28);
  c.strokeStyle = '#1e63c6';
  c.strokeRect(132, 212, 108, 28);
  text(c, '오류 검증', 186, 226, 11, '#1e63c6', 'center');
};
/** An open page of the 총계정원장: the account, ruled columns, figures written in by hand. */
const paintLedgerPage = (side: 0 | 1): Paint => (c) => {
  c.fillStyle = '#fbf7e9';
  c.fillRect(0, 0, 180, 256);
  c.strokeStyle = '#9fc5a8';
  c.lineWidth = 1;
  for (let y = 40; y < 250; y += 14) {
    c.beginPath();
    c.moveTo(6, y);
    c.lineTo(174, y);
    c.stroke();
  }
  c.strokeStyle = '#d98c8c';
  for (const x of side ? [40, 90, 132] : [30, 80, 128]) {
    c.beginPath();
    c.moveTo(x, 26);
    c.lineTo(x, 250);
    c.stroke();
  }
  text(c, side ? '외상매출금' : '보통예금', 90, 14, 12, '#1b5e20', 'center');
  text(c, side ? '차변 · 대변 · 잔액' : '일자 · 적요 · 금액', 90, 32, 8, '#2e7d32', 'center', false);
  const r = seeded(side ? 17 : 5);
  for (let i = 0; i < 13; i++) {
    const y = 48 + i * 14;
    text(c, `10/${String(1 + i * 2).padStart(2, '0')}`, 8, y, 8, '#1a237e', 'left', false);
    c.fillStyle = '#3949ab';
    c.fillRect(side ? 46 : 36, y - 1, 20 + r() * 20, 2);
    text(c, `${Math.floor(r() * 900 + 100)},${Math.floor(r() * 900 + 100)}`, 170, y, 8, '#1a237e', 'right', false);
    if (i === 7 && side) {
      c.strokeStyle = '#e53935';
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(150, y, 24, 6, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (i < 6) text(c, '✓', 176, y, 8, '#e53935', 'right');
  }
};
/** A 대체전표: the date, 차변 and 대변 in their grid, the approval boxes along the top. */
const paintVoucher: Paint = (c) => {
  c.fillStyle = SLIP;
  c.fillRect(0, 0, 256, 180);
  c.strokeStyle = '#c62828';
  c.lineWidth = 2;
  c.strokeRect(4, 4, 248, 172);
  text(c, '대 체 전 표', 70, 24, 16, '#b71c1c', 'center');
  ['담당', '검토', '승인'].forEach((s, i) => {
    c.strokeRect(150 + i * 33, 8, 33, 34);
    text(c, s, 166 + i * 33, 16, 8, '#b71c1c', 'center', false);
  });
  c.strokeStyle = '#e53935';
  c.beginPath();
  c.arc(166, 31, 8, 0, Math.PI * 2);
  c.stroke();
  text(c, '2026년 10월 27일  No. 0418', 12, 52, 9, '#5d4037', 'left', false);
  c.lineWidth = 1;
  c.strokeRect(10, 62, 236, 106);
  c.beginPath();
  c.moveTo(128, 62);
  c.lineTo(128, 168);
  c.moveTo(10, 78);
  c.lineTo(246, 78);
  c.stroke();
  text(c, '차  변', 69, 70, 9, '#b71c1c', 'center');
  text(c, '대  변', 187, 70, 9, '#b71c1c', 'center');
  text(c, '복리후생비', 16, 94, 10, '#1a237e', 'left', false);
  text(c, '384,000', 122, 112, 10, '#1a237e', 'right', false);
  text(c, '보통예금', 134, 94, 10, '#1a237e', 'left', false);
  text(c, '384,000', 240, 112, 10, '#1a237e', 'right', false);
  text(c, '적요: 직원 회식비 (법인카드)', 16, 150, 9, '#37474f', 'left', false);
};
/** The paper tape run out of the printing calculator: a column of figures, the total starred. */
const paintTape: Paint = (c) => {
  c.fillStyle = '#fdfdf8';
  c.fillRect(0, 0, 64, 512);
  const r = seeded(29);
  for (let i = 0; i < 30; i++) {
    const y = 12 + i * 16.5;
    const total = i % 8 === 7;
    if (total) {
      c.fillStyle = '#888888';
      c.fillRect(6, y - 9, 52, 1);
    }
    text(c, total ? `${Math.floor(r() * 90 + 10)},${Math.floor(r() * 900 + 100)},000 *` : `${Math.floor(r() * 900 + 100)},${Math.floor(r() * 900 + 100)} +`, 60, y, 8, total ? '#c62828' : '#333333', 'right', total);
  }
};
/** The 세무 신고 마감 board's grid: the taxes, their deadlines and D-days, the status columns. */
const BOARD = { cols: [0, 0.25, 0.37, 0.47, 0.645, 0.82, 1], head: 0.17, sub: 0.25, rows: 5 };
const TAXES: Array<[string, string, string, string]> = [
  ['부가세 2기 예정', '10/27', 'D-DAY', '#c62828'],
  ['원천세 (10월분)', '11/10', 'D-14', '#ef6c00'],
  ['종소세 중간예납', '11/30', 'D-34', '#2e7d32'],
  ['부가세 2기 확정', '1/26', 'D-91', '#455a64'],
  ['법인세 (12월 결산)', '3/31', 'D-155', '#455a64'],
];
const paintDeadlineBoard: Paint = (c) => {
  const W = 512;
  const H = 300;
  c.fillStyle = '#fbfcfd';
  c.fillRect(0, 0, W, H);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, W, H * BOARD.head);
  text(c, '2026 세무 신고 마감 현황', 14, (H * BOARD.head) / 2, 22, '#ffffff', 'left');
  text(c, '결산·세무 시즌', W - 12, (H * BOARD.head) / 2, 13, '#ffd54f', 'right');
  const xs = BOARD.cols.map((k) => k * W);
  c.fillStyle = '#e3e8ee';
  c.fillRect(0, H * BOARD.head, W, H * (BOARD.sub - BOARD.head));
  ['세목', '마감', 'D-day', '대기', '진행', '완료'].forEach((s, i) => text(c, s, (xs[i] + xs[i + 1]) / 2, H * ((BOARD.head + BOARD.sub) / 2), 13, i === 5 ? '#2e7d32' : i === 4 ? '#1565c0' : '#37474f', 'center'));
  const rh = (H * (1 - BOARD.sub)) / BOARD.rows;
  TAXES.forEach(([tax, due, d, col], i) => {
    const y = H * BOARD.sub + i * rh;
    if (i === 0) {
      c.fillStyle = 'rgba(229,57,53,0.1)';
      c.fillRect(0, y, W, rh);
    }
    text(c, tax, 8, y + rh / 2, 13, '#263238', 'left');
    text(c, due, (xs[1] + xs[2]) / 2, y + rh / 2, 13, '#263238', 'center', false);
    text(c, d, (xs[2] + xs[3]) / 2, y + rh / 2, 13, col, 'center');
  });
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 1.5;
  for (let i = 0; i <= BOARD.rows; i++) {
    const y = H * BOARD.sub + i * rh;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
  for (const x of xs.slice(1, -1)) {
    c.beginPath();
    c.moveTo(x, H * BOARD.head);
    c.lineTo(x, H);
    c.stroke();
  }
  // A marker's scrawl beside today's row.
  c.strokeStyle = '#e53935';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse((xs[2] + xs[3]) / 2, H * BOARD.sub + rh / 2, 30, rh / 2 - 4, 0, 0, Math.PI * 2);
  c.stroke();
};
/** The year-end on the client corner's screen: revenue and operating profit by year, the net up. */
const paintResults: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 512, 296);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 512, 40);
  text(c, `${CLIENT}  2026 결산 보고`, 16, 21, 18, '#ffffff', 'left');
  text(c, FIRM, 496, 21, 12, '#bbdefb', 'right', false);
  text(c, '매출액 · 영업이익 (억 원)', 24, 62, 13, '#37474f', 'left');
  const bars: Array<[string, number, number]> = [
    ['2024', 31.2, 2.1],
    ['2025', 36.8, 2.9],
    ['2026', 41.3, 3.6],
  ];
  const base = 262;
  bars.forEach(([y, rev, op], i) => {
    const x = 50 + i * 90;
    c.fillStyle = i === 2 ? '#1e63c6' : '#90caf9';
    c.fillRect(x, base - rev * 4.4, 34, rev * 4.4);
    c.fillStyle = i === 2 ? '#ef6c00' : '#ffcc80';
    c.fillRect(x + 38, base - op * 18, 24, op * 18);
    text(c, y, x + 31, base + 14, 12, '#455a64', 'center', false);
    text(c, String(rev), x + 17, base - rev * 4.4 - 9, 11, '#1e3a6e', 'center');
  });
  c.fillStyle = '#b0bec5';
  c.fillRect(40, base, 270, 2);
  c.fillStyle = '#f1f6fd';
  c.fillRect(330, 70, 166, 196);
  text(c, '당기순이익', 413, 96, 14, '#37474f', 'center');
  text(c, '2.8억', 413, 134, 30, '#1e63c6', 'center');
  text(c, '▲ 12.4%', 413, 172, 18, '#c62828', 'center');
  text(c, '부채비율 84% → 71%', 413, 210, 12, '#455a64', 'center', false);
  text(c, '법인세 추정 3,140만 원', 413, 236, 12, '#455a64', 'center', false);
};
/** The scanner's own little screen: how far through the bag it is. */
const paintScanLcd: Paint = (c) => {
  c.fillStyle = '#0d2238';
  c.fillRect(0, 0, 128, 64);
  text(c, '스캔 중  23/48', 8, 18, 13, '#80d8ff', 'left');
  c.fillStyle = '#1e3a5a';
  c.fillRect(8, 36, 112, 10);
  c.fillStyle = '#29b6f6';
  c.fillRect(8, 36, 54, 10);
  text(c, '양면 · 300dpi', 8, 56, 10, '#b3e5fc', 'left', false);
};
/** The receipts scanned in, on the screen by the scanner: thumbnails, each tagged with its account. */
const paintScanned: Paint = (c) => {
  c.fillStyle = '#eceff1';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#00695c';
  c.fillRect(0, 0, 256, 20);
  text(c, '전자증빙 · 10월 · 23건', 8, 11, 11, '#ffffff', 'left');
  const tags = ['식대', '교통', '소모품', '접대', '식대', '통신', '교통', '식대'];
  const r = seeded(41);
  tags.forEach((t, i) => {
    const x = 10 + (i % 4) * 61;
    const y = 28 + Math.floor(i / 4) * 66;
    c.fillStyle = '#ffffff';
    c.fillRect(x, y, 52, 50);
    c.fillStyle = '#b0bec5';
    for (let k = 0; k < 5; k++) c.fillRect(x + 6, y + 8 + k * 7, 20 + r() * 20, 2);
    c.fillStyle = '#e0f2f1';
    c.fillRect(x, y + 50, 52, 12);
    text(c, t, x + 26, y + 56, 9, '#00695c', 'center');
  });
};
/** The firm's name on the wall behind the counter. */
const paintFirmSign: Paint = (c) => {
  c.fillStyle = '#f5f2ec';
  c.fillRect(0, 0, 512, 160);
  c.fillStyle = NAVY;
  c.beginPath();
  c.arc(62, 70, 38, 0, Math.PI * 2);
  c.fill();
  text(c, '₩', 62, 72, 40, '#ffd54f', 'center');
  text(c, FIRM, 118, 62, 42, NAVY, 'left');
  text(c, 'BAREUNSEM ACCOUNTING CORP.', 120, 106, 16, '#8d6e63', 'left');
  c.fillStyle = '#c9a227';
  c.fillRect(118, 124, 360, 3);
  text(c, '세무 · 회계감사 · 경영자문 · 기장대리', 298, 144, 14, '#455a64', 'center', false);
};

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  /**
   * An accountant's desk in 결산 season: a pale laminate top on grey panel legs, a fabric partition
   * behind with the month's calendar and a red note for today's deadline, a pedestal of drawers. Two
   * monitors on one arm — the 시산표 in the spreadsheet on the left, the 부가세 신고 on the right
   * lit while it's worked at — sticky notes round the bezel; the keyboard and mouse; the printing
   * calculator on the right with its paper roll and the tape run out over the edge; the green
   * 총계정원장 shut on the left, the clipped stacks of 전표 under the screens, the 결재 tray, a mug
   * and an energy drink. In use the ledger's open with a 전표 being ticked against it and the tape
   * runs out. Returns are typed; the books are reconciled at the calculator (turned to it); the
   * standards are read in the chair; the 감사 조서 is written up against the ledger.
   */
  accountingDesk(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.06;
    const d = 0.66;
    const h = 0.73;
    const zc = -D / 2 + d / 2 + 0.03;
    const zb = zc - d / 2;
    const zf = zc + d / 2;
    part(g, rbox(w, 0.03, d, 0.01), LAMINATE, 0, h, zc);
    part(g, box(w, 0.012, 0.004), shade(LAMINATE, 0.8), 0, h, zf + 0.001, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.04, h - 0.02, d - 0.1, 0.01), FRAME, sx * (w / 2 - 0.04), (h - 0.02) / 2, zc);
      part(g, rbox(0.06, 0.03, d - 0.04, 0.01), shade(FRAME, 0.8), sx * (w / 2 - 0.04), 0.015, zc);
    }
    part(g, rbox(w - 0.12, 0.34, 0.015, 0.006), shade(FRAME, 0.95), 0, h - 0.22, zb + 0.06);
    // The pedestal of drawers under the left, a key in its lock.
    const px = -w / 2 + 0.26;
    part(g, rbox(0.38, 0.6, 0.5, 0.012), '#c9ced2', px, 0.33, zc + 0.02);
    for (let i = 0; i < 3; i++) {
      const y = 0.15 + i * 0.18 + (i === 2 ? 0.02 : 0);
      part(g, box(0.36, 0.004, 0.004), '#8e979e', px, y + 0.085, zc + 0.272, { outline: false });
      part(g, rbox(0.12, 0.016, 0.02, 0.006), '#7d868d', px, y + 0.04, zc + 0.28, { outline: false });
    }
    part(g, cyl(0.01, 0.01, 0.01, 10), CHROME, px + 0.14, 0.6, zc + 0.275, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.03, 0.03, 0.02, 10), '#5c6bc0', px + 0.14, 0.62, zc + 0.27, { outline: false });
    // The fabric partition behind, its aluminium cap; the month's calendar and the deadline note on it.
    const ph = 0.42;
    part(g, rbox(w + 0.02, ph, 0.035, 0.01), FABRIC, 0, h + ph / 2, zb - 0.02);
    part(g, rbox(w + 0.04, 0.025, 0.045, 0.008), CHROME, 0, h + ph + 0.01, zb - 0.02);
    const cal = painted('accCalendar', 128, 128, (cx) => {
      cx.fillStyle = '#ffffff';
      cx.fillRect(0, 0, 128, 128);
      cx.fillStyle = RED;
      cx.fillRect(0, 0, 128, 26);
      text(cx, '2026  10월', 64, 14, 14, '#ffffff', 'center');
      for (let i = 0; i < 31; i++) {
        const k = i + 4;
        const x = 10 + (k % 7) * 17.5;
        const y = 38 + Math.floor(k / 7) * 17;
        if (i + 1 === 27 || i + 1 === 10) {
          cx.strokeStyle = RED;
          cx.lineWidth = 2;
          cx.beginPath();
          cx.arc(x, y, 7, 0, Math.PI * 2);
          cx.stroke();
        }
        text(cx, String(i + 1), x, y, 9, k % 7 === 0 ? RED : '#37474f', 'center', false);
      }
    });
    picture(g, cal, 0.15, 0.15, -w / 2 + 0.12, h + ph - 0.11, zb + 0.0);
    sticky(g, '부가세 오늘마감!', w / 2 - 0.1, h + ph - 0.09, zb + 0.0, '#ffcdd2', 0.08);
    // Two monitors on one arm, clamped at the back.
    const top = h + 0.015;
    part(g, rbox(0.06, 0.04, 0.06, 0.01), BLACK, 0, top + 0.02, zb + 0.07);
    part(g, cyl(0.016, 0.016, 0.42, 10), '#4b5056', 0, top + 0.25, zb + 0.07, { outline: false });
    rod(g, new THREE.Vector3(0, top + 0.37, zb + 0.07), new THREE.Vector3(-0.2, top + 0.37, zb + 0.15), 0.012, '#4b5056');
    rod(g, new THREE.Vector3(0, top + 0.37, zb + 0.07), new THREE.Vector3(0.2, top + 0.37, zb + 0.15), 0.012, '#4b5056');
    const mw = 0.43;
    const mh = 0.27;
    const left = monitor(g, -0.215, top + 0.37, zb + 0.18, 0.12, mw, mh);
    const right = monitor(g, 0.215, top + 0.37, zb + 0.18, -0.12, mw, mh);
    out.screen = litScreen(left, painted('accTrialBalance', 384, 256, paintTrialBalance), mw - 0.03, mh - 0.03, 0, 0.006, 0.0135);
    sticky(left, '원천세 11/10', -mw / 2 + 0.03, mh / 2 - 0.02, 0.014, '#fff176', -0.12);
    sticky(right, '신고 전 검증!', mw / 2 - 0.03, mh / 2 - 0.02, 0.014, '#b2ebf2', 0.1);
    sticky(right, '가산세 주의', mw / 2 - 0.02, -mh / 2 + 0.05, 0.014, '#f8bbd0', -0.06);
    // The keyboard and mouse.
    const kx = 0.05;
    const kz = zf - 0.15;
    part(g, rbox(0.3, 0.016, 0.12, 0.006), '#e0e3e6', kx, top + 0.008, kz);
    part(g, box(0.28, 0.004, 0.1), '#f7f8f9', kx, top + 0.018, kz, { outline: false });
    for (let i = 0; i < 4; i++) part(g, box(0.26, 0.002, 0.004), '#c5cacf', kx, top + 0.021, kz - 0.035 + i * 0.023, { outline: false });
    part(g, rbox(0.045, 0.02, 0.075, 0.02), '#e0e3e6', 0.237, top + 0.01, kz + 0.01);
    // The printing calculator on the right: its keys, the display, the paper roll and the tape out.
    const cx = w / 2 - 0.11;
    const cz = zf - 0.17;
    const calc = at(g, cx, top, cz, -0.12);
    part(calc, rbox(0.17, 0.045, 0.25, 0.012), '#eceae4', 0, 0.022, 0);
    part(calc, box(0.15, 0.004, 0.15), '#d6d3cb', 0, 0.046, 0.04, { outline: false });
    const keyCol = ['#fafafa', '#fafafa', '#fafafa', '#ffb74d'];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) part(calc, box(0.026, 0.008, 0.022), r === 4 && k === 3 ? RED : keyCol[k], -0.054 + k * 0.036, 0.05, -0.02 + r * 0.03, { outline: false });
    part(calc, box(0.13, 0.022, 0.004), '#3a3f45', 0, 0.058, -0.052, { rx: -0.5, outline: false });
    label(calc, '1,284,500', 0.11, 0.016, 0, 0.059, -0.0495, '#b8c4a8', '#263238').rotation.x = -0.5;
    part(calc, rbox(0.17, 0.06, 0.06, 0.012), '#d6d3cb', 0, 0.05, -0.1);
    part(calc, cyl(0.035, 0.035, 0.11, 16), '#fdfdf8', 0, 0.105, -0.1, { rz: Math.PI / 2 });
    part(calc, cyl(0.012, 0.012, 0.115, 8), '#9e9e9e', 0, 0.105, -0.1, { rz: Math.PI / 2, outline: false });
    // The ledger shut on the left; 전표 clipped in stacks under the screens; the 결재 tray; a mug and a can.
    const idle = new THREE.Group();
    g.add(idle);
    const tapeTex = painted('accTape', 64, 512, paintTape);
    const tape = picture(alongside(idle, calc), tapeTex, 0.055, 0.12, 0, 0.12, -0.075, '#ffffff', 0, -0.25);
    tape.geometry.translate(0, 0.06, 0);
    ledgerShut(idle, -w / 2 + 0.16, top, zf - 0.17, 0.1);
    slipStack(g, -0.32, top, zb + 0.18, 0.2, 9);
    slipStack(g, -0.17, top, zb + 0.15, -0.1, 6, '#e3f2fd');
    ledgerShut(g, 0.05, top, zb + 0.14, Math.PI / 2 - 0.04, '#5d4037', '2025 원장');
    part(g, rbox(0.24, 0.05, 0.3, 0.008), '#37474f', 0.29, top + 0.025, zb + 0.18, { ry: -0.1 });
    part(g, box(0.21, 0.02, 0.27), PAPER, 0.29, top + 0.045, zb + 0.18, { ry: -0.1, outline: false });
    label(g, '결재', 0.08, 0.03, 0.29, top + 0.03, zb + 0.335, '#37474f', '#ffffff', -0.1);
    part(g, cyl(0.035, 0.03, 0.09, 14), '#ffffff', -w / 2 + 0.07, top + 0.045, zc - 0.05);
    part(g, cyl(0.03, 0.03, 0.004, 14), '#4e342e', -w / 2 + 0.07, top + 0.088, zc - 0.05, { outline: false });
    part(g, cyl(0.026, 0.026, 0.12, 14), '#1e88e5', w / 2 - 0.06, top + 0.06, zc - 0.02);
    part(g, cyl(0.02, 0.026, 0.01, 14), CHROME, w / 2 - 0.06, top + 0.125, zc - 0.02, { outline: false });
    part(g, cyl(0.03, 0.026, 0.1, 12), '#546e7a', -w / 2 + 0.06, top + 0.05, zc + 0.08);
    for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.14, 6), ['#1a237e', RED, '#212121'][i], -w / 2 + 0.05 + i * 0.012, top + 0.12, zc + 0.08 + (i - 1) * 0.01, { outline: false });
    // In use: the ledger open with a 전표 ticked against it, the 신고 lit on the right, the tape running out.
    const use = new THREE.Group();
    g.add(use);
    const lx = -w / 2 + 0.17;
    const lz = zf - 0.17;
    const open = at(use, lx, top, lz, 0.12);
    part(open, rbox(0.3, 0.012, 0.23, 0.004), LEDGER, 0, 0.006, 0);
    flat(open, painted('accLedger0', 180, 256, paintLedgerPage(0)), 0.14, 0.21, -0.073, 0.016, 0);
    flat(open, painted('accLedger1', 180, 256, paintLedgerPage(1)), 0.14, 0.21, 0.073, 0.016, 0);
    part(open, box(0.006, 0.006, 0.21), '#c9c3ae', 0, 0.015, 0, { outline: false });
    flat(use, painted('accVoucher', 256, 180, paintVoucher), 0.15, 0.105, lx + 0.12, top + 0.03, lz + 0.06, -0.2);
    pen(use, lx + 0.14, top + 0.025, lz + 0.1, 0.5, RED);
    const lit = alongside(use, right);
    picture(lit, painted('accFiling', 384, 256, paintFiling), mw - 0.03, mh - 0.03, 0, 0.006, 0.0145);
    const longTape = picture(alongside(use, calc), tapeTex, 0.055, 0.3, 0, 0.12, -0.075, '#ffffff', 0, -0.9);
    longTape.geometry.translate(0, 0.15, 0);
    out.inUse = use;
    out.idle = idle;
    out.animate = (t) => {
      const u = (t / 9) % 1;
      longTape.scale.y = 0.35 + 0.65 * u;
    };
    // The chair, and how it's sat in.
    meshChair(g, 0, zf + 0.25, Math.PI);
    const keys = marker(g, kx, top + 0.02, kz);
    const pad = marker(g, lx + 0.1, top + 0.03, lz + 0.03);
    const calcKeys = marker(g, cx, top + 0.06, cz + 0.03);
    out.work = keys;
    const type = sitAt(g, 0, 0.48, zf + 0.25, Math.PI, 'type', keys);
    out.seat = type.at;
    out.spots = {
      '*': type,
      reconcileBooks: sitAt(g, 0.06, 0.48, zf + 0.25, Math.PI - 0.32, 'type', calcKeys),
      accountant_learnStandards: also(type, 'read'),
      accountant_fieldAudit: sitAt(g, -0.05, 0.48, zf + 0.25, Math.PI + 0.25, 'write', pad),
    };
  },

  /**
   * An office shredder (the firm's, and the intelligence office's): a tall grey bin on casters with a
   * window full of shreds, the black cutting head on top with its slot, the 자동 and 역회전 buttons,
   * taped 대외비 문서 파쇄 and a notice to take the staples out first; beside it a carton of papers
   * waiting, 파쇄 예정. Fed sheet by sheet stood at its slot: a page goes down while it runs, the
   * green light on.
   */
  shredder(g, W, D, _c, _def, _ctx, out) {
    const sx0 = -W / 2 + 0.3;
    const sd = 0.38;
    const sz = -D / 2 + sd / 2 + 0.06;
    const szf = sz + sd / 2;
    const body = '#5b6068';
    part(g, rbox(0.44, 0.6, sd, 0.02), body, sx0, 0.33, sz);
    for (const kx of [-1, 1]) for (const kz of [-1, 1]) part(g, cyl(0.022, 0.022, 0.03, 10), BLACK, sx0 + kx * 0.17, 0.02, sz + kz * 0.14, { rx: Math.PI / 2 });
    part(g, box(0.24, 0.28, 0.006), '#3a3d44', sx0, 0.3, szf + 0.002, { outline: false });
    for (let k = 0; k < 18; k++) part(g, box(0.011, 0.05, 0.004), k % 3 ? '#fafafa' : '#e3f2fd', sx0 - 0.1 + k * 0.0118, 0.2 + ((k * 7) % 5) * 0.025, szf + 0.006, { rz: (k % 5) * 0.4 - 0.8, outline: false });
    part(g, rbox(0.2, 0.025, 0.01, 0.008), '#3a3d44', sx0, 0.53, szf + 0.004, { outline: false });
    // The head: the slot, the panel, the buttons.
    part(g, rbox(0.46, 0.17, sd + 0.02, 0.025), '#26282d', sx0, 0.71, sz);
    part(g, box(0.3, 0.006, 0.014), '#000000', sx0, 0.797, sz - 0.02, { outline: false });
    part(g, rbox(0.34, 0.012, 0.08, 0.006), '#3a3d44', sx0, 0.796, sz + 0.06, { outline: false });
    part(g, cyl(0.014, 0.014, 0.01, 12), '#43a047', sx0 + 0.1, 0.805, sz + 0.13, { outline: false });
    part(g, cyl(0.014, 0.014, 0.01, 12), RED, sx0 + 0.15, 0.805, sz + 0.13, { outline: false });
    label(g, '대외비 문서 파쇄', 0.28, 0.055, sx0, 0.72, szf + 0.012, RED, '#ffffff');
    label(g, '스테이플러 심 제거 후 투입', 0.22, 0.03, sx0, 0.46, szf + 0.006, '#fff59d', '#37474f');
    const slot = marker(g, sx0, 0.82, sz + 0.02);
    // The carton of papers waiting beside it.
    const bx = W / 2 - 0.24;
    const bz = -D / 2 + 0.26;
    part(g, rbox(0.34, 0.3, 0.4, 0.01), '#c8a165', bx, 0.15, bz, { ry: 0.08 });
    part(g, box(0.3, 0.02, 0.36), '#a5834f', bx, 0.29, bz, { ry: 0.08, outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.21, 0.012, 0.29), i % 2 ? '#ffffff' : '#eceff1', bx + (i % 3) * 0.006, 0.3 + i * 0.012, bz, { ry: 0.08 + (i % 3) * 0.05 - 0.05, outline: false });
    label(g, '파쇄 예정', 0.16, 0.05, bx + 0.016, 0.17, bz + 0.2, '#c8a165', '#4e342e', 0.08);
    // In use: a page going down the slot, the run light on.
    const use = new THREE.Group();
    g.add(use);
    glowing(use, cyl(0.016, 0.016, 0.006, 12), '#76ff03', sx0 - 0.14, 0.806, sz + 0.13);
    part(use, box(0.06, 0.012, 0.004), '#76ff03', sx0 - 0.08, 0.55, szf + 0.012, { outline: false, material: glow('#76ff03') });
    const page = part(use, box(0.21, 0.29, 0.003), '#ffffff', sx0, 0.95, sz - 0.02, { outline: false });
    out.inUse = use;
    out.animate = (t) => {
      const u = (t * 0.45) % 1;
      page.position.y = 0.95 - 0.15 * u;
      page.scale.y = 1 - 0.6 * u;
    };
    out.work = slot;
    out.spots = { '*': standAt(g, sx0, szf + 0.36, Math.PI, 'tinker', slot) };
  },

  /**
   * The 세무 신고 마감 board on the wall (on a mobile stand where there's no wall): a white board in
   * an aluminium frame, the taxes down the side with their deadlines and D-days — today's ringed in
   * red — and the clients' magnets in 대기, 진행 and 완료; a D-DAY counter on top lit red while it's
   * seen to, the marker tray along the foot. Stood at, a client's magnet is moved along from 진행 to
   * 완료 by hand.
   */
  accDeadlineBoard(g, W, D, _c, _def, ctx, out) {
    const bw = Math.min(W - 0.24, 1.72);
    const bh = 1.0;
    const by = 1.32;
    const bz = -D / 2 + 0.05;
    if (!ctx.againstWall) {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.04, by + bh / 2, 0.04, 0.01), CHROME, sx * (bw / 2 + 0.04), (by + bh / 2) / 2, bz - 0.02);
        part(g, rbox(0.06, 0.04, 0.5, 0.01), CHROME, sx * (bw / 2 + 0.04), 0.06, bz + 0.05);
        for (const kz of [-1, 1]) part(g, cyl(0.025, 0.025, 0.03, 10), BLACK, sx * (bw / 2 + 0.04), 0.025, bz + 0.05 + kz * 0.22, { rz: Math.PI / 2 });
      }
    }
    part(g, rbox(bw + 0.05, bh + 0.05, 0.03, 0.01), CHROME, 0, by, bz);
    picture(g, painted('accDeadlineBoard', 512, 300, paintDeadlineBoard), bw, bh, 0, by, bz + 0.017);
    part(g, rbox(bw * 0.6, 0.03, 0.08, 0.01), CHROME, 0, by - bh / 2 - 0.03, bz + 0.04);
    for (let i = 0; i < 3; i++) part(g, cyl(0.009, 0.009, 0.12, 8), ['#212121', RED, '#1565c0'][i], -0.2 + i * 0.05, by - bh / 2 - 0.005, bz + 0.04, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.12, 0.035, 0.05, 0.01), '#37474f', 0.25, by - bh / 2 - 0.0, bz + 0.04);
    // Where a cell of the grid is on the board.
    const cellX = (col: number) => -bw / 2 + ((BOARD.cols[col] + BOARD.cols[col + 1]) / 2) * bw;
    const rowY = (row: number) => by + bh / 2 - (BOARD.sub + ((row + 0.5) * (1 - BOARD.sub)) / BOARD.rows) * bh;
    const mz = bz + 0.026;
    const magnet = (p: THREE.Object3D, name: string, col: number, row: number, k: number, color: string) => {
      const m = at(p, cellX(col) + (k - 0.5) * 0.15, rowY(row), mz);
      part(m, rbox(0.13, 0.05, 0.016, 0.006), color, 0, 0, 0);
      label(m, name, 0.12, 0.04, 0, 0, 0.009, color, '#ffffff');
      return m;
    };
    const clients: Array<[string, number, number, number, string]> = [
      ['한빛물산', 5, 0, 0, '#2e7d32'],
      ['미래치과', 4, 0, 1, '#1565c0'],
      ['대성식품', 4, 1, 0, '#1565c0'],
      ['온누리약국', 3, 1, 1, '#757575'],
      ['한결학원', 3, 2, 0, '#757575'],
      ['푸른정밀', 4, 2, 1, '#1565c0'],
      ['다온카페', 3, 3, 0, '#757575'],
      ['서준건설', 3, 3, 1, '#757575'],
      [CLIENT.replace('㈜', ''), 5, 1, 1, '#2e7d32'],
    ];
    for (const [n, col, row, k, color] of clients) magnet(g, n, col, row, k, color);
    // The D-DAY counter on top of the frame.
    const top = by + bh / 2 + 0.07;
    part(g, rbox(0.42, 0.11, 0.05, 0.01), '#212121', bw / 2 - 0.26, top, bz);
    label(g, '부가세 D-DAY', 0.38, 0.08, bw / 2 - 0.26, top, bz + 0.027, '#3a0d0d', '#7f3a3a');
    // The magnet moved along (shown where it waits until then), today's counter lit.
    const idle = new THREE.Group();
    g.add(idle);
    magnet(idle, '다온식품', 4, 0, 0, '#1565c0');
    const use = new THREE.Group();
    g.add(use);
    label(use, '부가세 D-DAY', 0.38, 0.08, bw / 2 - 0.26, top, bz + 0.03, '#3a0d0d', '#ff5252');
    const moving = magnet(use, '다온식품', 4, 0, 0, '#1565c0');
    const from = cellX(4) - 0.075;
    const to = cellX(5) + 0.075;
    out.inUse = use;
    out.idle = idle;
    out.animate = (t) => {
      const u = (t / 7) % 1;
      const e = THREE.MathUtils.smoothstep(u, 0.3, 0.75);
      moving.position.x = from + (to - from) * e;
      moving.position.z = mz + 0.01 * Math.sin(Math.PI * e);
    };
    const hand = marker(g, (from + to) / 2, rowY(0), bz + 0.06);
    out.work = hand;
    out.spots = { '*': standAt(g, (from + to) / 2, bz + 0.5, Math.PI, 'tinker', hand) };
  },

  /**
   * The receipts scanner: a grey stand with a shelf of boxes (스캔 전, 스캔 완료) and the label 전자증빙
   * 스캔; on it a document scanner with its chute of receipts and slips tilted up at the back, the
   * output tray out at the front, its little screen; a monitor beside showing what's come in, each
   * receipt tagged with its account. On the floor the client's shopping bag of receipts. Stood at,
   * the receipts are fed in a few at a time: they run through and drop to the tray, the screen lit.
   */
  accScanner(g, W, D, _c, _def, _ctx, out) {
    const sw = Math.min(W - 0.12, 0.8);
    const sd = 0.48;
    const sh = 0.74;
    const sz = -D / 2 + sd / 2 + 0.05;
    const szf = sz + sd / 2;
    const steel = '#cfd8dc';
    part(g, rbox(sw, 0.03, sd, 0.008), steel, 0, sh, sz);
    for (const sx of [-1, 1]) part(g, rbox(0.03, sh, sd - 0.02, 0.006), shade(steel, 0.85), sx * (sw / 2 - 0.015), sh / 2, sz);
    part(g, rbox(sw - 0.04, 0.02, sd - 0.04, 0.006), shade(steel, 0.9), 0, 0.3, sz);
    part(g, rbox(sw - 0.04, 0.02, sd - 0.04, 0.006), shade(steel, 0.9), 0, 0.04, sz);
    part(g, rbox(sw - 0.04, 0.1, 0.02, 0.006), steel, 0, sh - 0.06, szf - 0.012);
    label(g, '전자증빙 스캔', 0.3, 0.06, 0, sh - 0.06, szf + 0.0, NAVY, '#ffffff');
    for (const [i, s] of ['스캔 전', '스캔 완료'].entries()) {
      const x = -sw / 4 + i * (sw / 2);
      part(g, rbox(sw / 2 - 0.07, 0.2, sd - 0.12, 0.01), '#bfa27a', x, 0.15, sz);
      label(g, s, 0.16, 0.05, x, 0.17, sz + (sd - 0.12) / 2 + 0.003, '#ffffff', '#4e342e');
      part(g, rbox(sw / 2 - 0.07, 0.2, sd - 0.12, 0.01), '#a1887f', x, 0.42, sz);
    }
    const top = sh + 0.015;
    // The scanner: the body, the chute of receipts behind, the output tray, the little screen.
    const kx = -0.12;
    const sc = at(g, kx, top, szf - 0.17);
    part(sc, rbox(0.34, 0.16, 0.24, 0.03), '#3c4148', 0, 0.08, 0);
    part(sc, box(0.3, 0.004, 0.02), '#111111', 0, 0.12, 0.08, { outline: false });
    const chute = at(sc, 0, 0.14, -0.1);
    chute.rotation.x = 0.75;
    part(chute, rbox(0.26, 0.01, 0.22, 0.005), '#5a6068', 0, 0, -0.1);
    for (const sx of [-1, 1]) part(chute, box(0.008, 0.03, 0.2), '#8e959c', sx * 0.11, 0.015, -0.1, { outline: false });
    const r = seeded(7);
    for (let i = 0; i < 9; i++) part(chute, box(0.07 + r() * 0.08, 0.004, 0.1 + r() * 0.08), i % 3 ? '#ffffff' : SLIP, (r() - 0.5) * 0.08, 0.01 + i * 0.004, -0.08 - r() * 0.04, { ry: (r() - 0.5) * 0.3, outline: false });
    part(sc, rbox(0.26, 0.008, 0.1, 0.004), '#5a6068', 0, 0.02, 0.16, { rx: 0.1 });
    for (let i = 0; i < 4; i++) part(sc, box(0.07, 0.003, 0.09), i % 2 ? '#ffffff' : SLIP, (i - 1.5) * 0.02, 0.03 + i * 0.004, 0.16, { ry: (i - 1.5) * 0.15, outline: false });
    part(sc, rbox(0.1, 0.05, 0.012, 0.004), '#111111', 0.1, 0.13, 0.115, { rx: -0.6 });
    picture(sc, painted('accScanLcd', 128, 64, paintScanLcd), 0.088, 0.044, 0.1, 0.13, 0.122, '#5a6878', 0, -0.6);
    // The monitor beside it.
    const mon = at(g, sw / 2 - 0.16, top, sz - 0.06, -0.25);
    part(mon, rbox(0.14, 0.012, 0.1, 0.004), BLACK, 0, 0.006, 0);
    part(mon, rbox(0.03, 0.12, 0.02, 0.006), BLACK, 0, 0.07, -0.02);
    part(mon, rbox(0.27, 0.18, 0.02, 0.008), BLACK, 0, 0.2, 0);
    out.screen = litScreen(mon, painted('accScanned', 256, 160, paintScanned), 0.25, 0.16, 0, 0.2, 0.012);
    // The client's shopping bag of receipts on the floor.
    const bag = at(g, W / 2 - 0.18, 0, szf + 0.16, 0.3);
    part(bag, rbox(0.26, 0.3, 0.14, 0.01), '#d7b98e', 0, 0.15, 0);
    label(bag, 'SHOP', 0.12, 0.05, 0, 0.18, 0.071, '#d7b98e', '#6d4c41');
    for (const sx of [-1, 1]) rod(bag, new THREE.Vector3(sx * 0.06, 0.3, 0), new THREE.Vector3(sx * 0.02, 0.38, 0), 0.006, '#6d4c41');
    for (let i = 0; i < 6; i++) part(bag, box(0.06 + r() * 0.04, 0.1, 0.004), i % 2 ? '#ffffff' : SLIP, (r() - 0.5) * 0.18, 0.31, (r() - 0.5) * 0.08, { ry: r() * 1.4, rz: (r() - 0.5) * 0.4, outline: false });
    // In use: a receipt running through, the scanner's screen lit.
    const use = new THREE.Group();
    g.add(use);
    const lit = alongside(use, sc);
    picture(lit, painted('accScanLcd', 128, 64, paintScanLcd), 0.088, 0.044, 0.1, 0.13, 0.124, '#ffffff', 0, -0.6);
    glowing(lit, box(0.012, 0.006, 0.012), '#29b6f6', -0.14, 0.162, 0.1);
    const sheet = part(lit, box(0.08, 0.003, 0.12), '#ffffff', 0, 0.13, 0.06, { outline: false });
    out.inUse = use;
    out.animate = (t) => {
      const u = (t * 0.8) % 1;
      sheet.position.z = 0.04 + 0.12 * u;
      sheet.position.y = 0.12 - 0.08 * u;
    };
    const feed = marker(g, kx, top + 0.17, szf - 0.27);
    out.work = feed;
    out.spots = { '*': standAt(g, kx, szf + 0.22, Math.PI, 'tinker', feed) };
  },

  /**
   * The table the 전표 and 증빙 are sorted and bound at: a standing-height wooden top on steel legs,
   * the shelf below stacked with the clients' 증빙 boxes by year; on top the trays by account
   * (복리후생비, 여비교통비, 접대비, 소모품비) with their receipts, the pile still to sort, a 전표철
   * open on its two rings, the two-hole punch, the stapler, binder clips, the 검토필 stamp and its pad,
   * a client's box with its lid off. Stood at, the 전표 are sorted and written up and filed in.
   */
  accSortingTable(g, W, D, _c, _def, _ctx, out) {
    const tw = W - 0.1;
    const td = 0.7;
    const h = 0.9;
    const zc = -D / 2 + td / 2 + 0.04;
    const zf = zc + td / 2;
    part(g, rbox(tw, 0.04, td, 0.01), WOOD, 0, h, zc);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.04, h - 0.02, 0.04, 0.008), '#78909c', sx * (tw / 2 - 0.05), (h - 0.02) / 2, zc + sz * (td / 2 - 0.05));
    part(g, rbox(tw - 0.06, 0.025, td - 0.06, 0.006), '#90a4ae', 0, 0.2, zc);
    // The clients' 증빙 boxes on the shelf.
    const boxes = ['다온식품 2026 상', '다온식품 2026 하', '한빛물산 2026', '서준건설 2026'];
    boxes.forEach((s, i) => {
      const x = -0.66 + i * 0.44;
      part(g, rbox(0.36, 0.26, 0.4, 0.01), '#bfa27a', x, 0.345, zc - 0.05);
      part(g, box(0.28, 0.08, 0.004), '#ffffff', x, 0.37, zc + 0.152, { outline: false });
      label(g, s, 0.26, 0.05, x, 0.37, zc + 0.155, '#ffffff', '#4e342e');
      part(g, cyl(0.018, 0.018, 0.004, 10), '#5d4037', x, 0.3, zc + 0.152, { rx: Math.PI / 2, outline: false });
    });
    const top = h + 0.02;
    // The trays by account, each with its receipts.
    const accounts: Array<[string, string]> = [
      ['복리후생비', '#ef9a9a'],
      ['여비교통비', '#90caf9'],
      ['접대비', '#ffcc80'],
      ['소모품비', '#a5d6a7'],
    ];
    const r = seeded(19);
    accounts.forEach(([s, col], i) => {
      const x = -tw / 2 + 0.17 + i * 0.25;
      const z = zc - td / 2 + 0.16;
      part(g, rbox(0.22, 0.05, 0.26, 0.006), col, x, top + 0.025, z);
      part(g, box(0.2, 0.01, 0.24), shade(col, 1.1), x, top + 0.01, z, { outline: false });
      for (let k = 0; k < 4 + i; k++) part(g, box(0.07 + r() * 0.05, 0.003, 0.1 + r() * 0.06), k % 3 ? '#ffffff' : SLIP, x + (r() - 0.5) * 0.06, top + 0.02 + k * 0.004, z + (r() - 0.5) * 0.06, { ry: (r() - 0.5) * 0.6, outline: false });
      label(g, s, 0.2, 0.04, x, top + 0.035, z + 0.133, col, '#263238');
    });
    // The pile still to sort, a client's box with its lid off.
    for (let k = 0; k < 14; k++) part(g, box(0.06 + r() * 0.06, 0.003, 0.08 + r() * 0.08), k % 4 ? '#ffffff' : SLIP, -tw / 2 + 0.2 + (r() - 0.5) * 0.18, top + 0.002 + k * 0.003, zf - 0.17 + (r() - 0.5) * 0.12, { ry: r() * Math.PI, outline: false });
    const ob = at(g, tw / 2 - 0.2, top, zc - 0.06, -0.1);
    part(ob, rbox(0.3, 0.2, 0.36, 0.008), '#bfa27a', 0, 0.1, 0);
    part(ob, box(0.27, 0.01, 0.33), '#8d6e63', 0, 0.16, 0, { outline: false });
    for (let k = 0; k < 5; k++) part(ob, box(0.24, 0.12, 0.004), k % 2 ? '#ffffff' : SLIP, 0, 0.13, -0.12 + k * 0.05, { rx: 0.15, outline: false });
    label(ob, `${CLIENT} 10월`, 0.24, 0.05, 0, 0.12, 0.183, '#ffffff', '#4e342e');
    // The 전표철 open on its rings, the 전표 on it; the punch, the stapler, the stamp, the clips.
    const bx = 0.02;
    const bz = zf - 0.2;
    part(g, rbox(0.46, 0.012, 0.32, 0.004), '#1565c0', bx, top + 0.006, bz);
    part(g, box(0.2, 0.01, 0.29), PAPER, bx + 0.11, top + 0.016, bz, { outline: false });
    for (const kz of [-0.06, 0.06]) part(g, cyl(0.022, 0.022, 0.008, 12), CHROME, bx, top + 0.03, bz + kz, { rz: Math.PI / 2, outline: false });
    flat(g, painted('accVoucher', 256, 180, paintVoucher), 0.19, 0.135, bx + 0.11, top + 0.023, bz, 0);
    label(g, '2026 대체전표철', 0.18, 0.04, bx - 0.12, top + 0.014, bz, '#1565c0', '#ffffff').rotation.set(-Math.PI / 2, 0, 0);
    part(g, rbox(0.16, 0.05, 0.08, 0.01), '#455a64', bx - 0.38, top + 0.025, bz + 0.08);
    part(g, rbox(0.14, 0.02, 0.06, 0.008), '#263238', bx - 0.38, top + 0.06, bz + 0.07, { rx: -0.15 });
    part(g, rbox(0.04, 0.04, 0.16, 0.01), RED, bx + 0.38, top + 0.02, bz + 0.06, { ry: 0.3 });
    stampSet(g, bx + 0.32, top, bz - 0.1);
    label(g, '검토필', 0.06, 0.025, bx + 0.32, top + 0.025, bz - 0.067, '#212121', '#ffffff');
    for (let i = 0; i < 4; i++) part(g, box(0.025, 0.012, 0.02), ['#212121', '#e53935', '#1e88e5', '#212121'][i], bx - 0.3 + i * 0.035, top + 0.006, bz - 0.12, { ry: i * 0.5, outline: false });
    // In use: a 전표 being written up, the pen on it, a red tick's check list beside.
    const use = new THREE.Group();
    g.add(use);
    flat(use, painted('accVoucher', 256, 180, paintVoucher), 0.19, 0.135, bx - 0.1, top + 0.03, bz + 0.06, 0.15);
    pen(use, bx - 0.05, top + 0.03, bz + 0.08, 0.6);
    out.inUse = use;
    const paper = marker(g, bx - 0.1, top + 0.04, bz + 0.06);
    out.work = paper;
    out.spots = { '*': standAt(g, bx - 0.05, zf + 0.28, Math.PI, 'write', paper) };
  },

  /**
   * The client corner: a pale table set long from the screen, the big screen on its stand at the
   * far end with the client's year-end — revenue and profit by year, the net up 12.4% — four fabric
   * chairs along its sides; on the table the bound 결산 보고서 at the client's place, the
   * accountant's laptop and pad, cups of coffee on saucers, a card holder. The accountant takes
   * them through it sat at the laptop with a notebook, turned to the client; the screen and the
   * laptop light, the report's open at its figures.
   */
  accClientTable(g, _W, D, _c, _def, _ctx, out) {
    const tx = 0.84;
    const tz = Math.min(D - 0.75, 1.2);
    const h = 0.73;
    const zc = 0.25;
    const wood = '#d9c3a5';
    part(g, rbox(tx, 0.04, tz, 0.04), wood, 0, h, zc);
    part(g, rbox(tx - 0.06, 0.008, tz - 0.06, 0.004), shade(wood, 1.08), 0, h + 0.021, zc, { outline: false });
    for (const sz of [-1, 1]) {
      part(g, rbox(0.1, h - 0.04, 0.1, 0.02), '#5f6b73', 0, (h - 0.04) / 2, zc + sz * (tz / 2 - 0.24));
      part(g, rbox(0.5, 0.03, 0.12, 0.012), '#5f6b73', 0, 0.015, zc + sz * (tz / 2 - 0.24));
    }
    const top = h + 0.025;
    // The screen on its stand at the far end.
    const sz0 = -D / 2 + 0.22;
    for (const sx of [-1, 1]) part(g, rbox(0.06, 0.04, 0.42, 0.01), '#37474f', sx * 0.3, 0.02, sz0);
    part(g, rbox(0.66, 0.03, 0.06, 0.01), '#37474f', 0, 0.05, sz0);
    part(g, rbox(0.08, 1.2, 0.05, 0.01), '#37474f', 0, 0.62, sz0 - 0.03);
    part(g, rbox(1.24, 0.72, 0.05, 0.012), BLACK, 0, 1.36, sz0);
    out.screen = litScreen(g, painted('accResults', 512, 296, paintResults), 1.18, 0.68, 0, 1.36, sz0 + 0.027);
    part(g, rbox(0.2, 0.025, 0.08, 0.008), '#455a64', 0, 0.995, sz0 + 0.03);
    // Four chairs along the sides, turned in.
    const cz = [zc - 0.25, zc + 0.3];
    for (const z of cz) {
      guestChair(g, tx / 2 + 0.3, z, -Math.PI / 2, '#5c6f80');
      guestChair(g, -tx / 2 - 0.3, z, Math.PI / 2, '#5c6f80');
    }
    // The client's place (-x): the bound report, a cup; the accountant's (+x): the laptop, the pad, a cup.
    const ax = tx / 2 - 0.2;
    const az = cz[1];
    part(g, rbox(0.22, 0.025, 0.3, 0.006), NAVY, -tx / 2 + 0.18, top + 0.012, az - 0.02, { ry: 0.08 });
    label(g, '2026 결산 보고서', 0.17, 0.04, -tx / 2 + 0.18, top + 0.026, az - 0.06, NAVY, '#ffd54f').rotation.set(-Math.PI / 2, 0, Math.PI / 2 + 0.08);
    const cup = (x: number, z: number) => {
      part(g, cyl(0.06, 0.055, 0.01, 16), '#ffffff', x, top + 0.005, z);
      part(g, cyl(0.035, 0.03, 0.06, 14), '#ffffff', x, top + 0.04, z);
      part(g, cyl(0.032, 0.032, 0.004, 14), '#4e342e', x, top + 0.068, z, { outline: false });
    };
    cup(-tx / 2 + 0.16, cz[0] + 0.05);
    cup(ax + 0.02, az - 0.27);
    part(g, rbox(0.08, 0.035, 0.05, 0.008), '#b0bec5', -0.05, top + 0.017, zc - 0.05);
    part(g, box(0.07, 0.002, 0.04), '#ffffff', -0.05, top + 0.036, zc - 0.05, { outline: false });
    const lap = at(g, ax - 0.04, top, az, Math.PI / 2);
    part(lap, rbox(0.3, 0.014, 0.21, 0.008), '#b0bec5', 0, 0.007, 0.03);
    const lid = at(lap, 0, 0.014, -0.075);
    lid.rotation.x = -0.25;
    part(lid, rbox(0.3, 0.2, 0.01, 0.008), '#90a4ae', 0, 0.1, 0);
    part(lid, box(0.27, 0.17, 0.004), '#1d232b', 0, 0.1, 0.006, { outline: false });
    part(g, box(0.15, 0.005, 0.21), '#fff59d', ax - 0.02, top + 0.003, az + 0.24, { ry: 0.1, outline: false });
    pen(g, ax - 0.02, top, az + 0.24, 0.9);
    // In use: the report open at its figures, the laptop lit.
    const use = new THREE.Group();
    g.add(use);
    const res = painted('accResults', 512, 296, paintResults);
    flat(use, res, 0.26, 0.15, -tx / 2 + 0.24, top + 0.03, zc + 0.02, Math.PI / 2);
    const litLid = alongside(alongside(use, lap), lid);
    picture(litLid, res, 0.27, 0.16, 0, 0.1, 0.0085);
    out.inUse = use;
    const pad = marker(g, ax - 0.02, top + 0.01, az + 0.12);
    out.work = pad;
    out.spots = { '*': sitAt(g, tx / 2 + 0.3, 0.47, az, -Math.PI / 2, 'meeting', pad) };
  },

  /**
   * The front counter under the firm's name: a wall of pale wood slats behind with 바른셈 회계법인
   * on its plate, a strip of light under it; a white counter with a wooden top in front — the call
   * bell, the visitors' sign-in sheet on a clipboard, a stand of leaflets (2026 연말정산 안내, 법인
   * 결산 체크리스트, 기장 대리 상담), a white orchid, the receptionist's monitor and phone behind.
   */
  accReception(g, W, D, _c, _def, _ctx, _out) {
    const ww = W - 0.08;
    const wz = -D / 2 + 0.04;
    // The slatted wall and its sign.
    part(g, rbox(ww, 2.2, 0.04, 0.01), '#e8dccb', 0, 1.1, wz);
    for (let i = 0; i < 22; i++) part(g, box(0.035, 2.18, 0.02), WOOD, -ww / 2 + 0.05 + i * ((ww - 0.1) / 21), 1.1, wz + 0.03, { outline: false });
    part(g, rbox(1.5, 0.48, 0.03, 0.01), '#f5f2ec', 0, 1.72, wz + 0.05);
    picture(g, painted('accFirmSign', 512, 160, paintFirmSign), 1.46, 0.45, 0, 1.72, wz + 0.067);
    glowing(g, box(1.5, 0.012, 0.012), '#fff3c4', 0, 1.46, wz + 0.06);
    // The counter.
    const cz = wz + 0.62;
    const cw = Math.min(ww - 0.1, 1.7);
    part(g, rbox(cw, 1.0, 0.04, 0.01), '#f4f4f2', 0, 0.5, cz + 0.16);
    for (const sx of [-1, 1]) part(g, rbox(0.04, 1.0, 0.36, 0.01), '#f4f4f2', sx * (cw / 2 - 0.02), 0.5, cz);
    part(g, rbox(cw + 0.06, 0.04, 0.24, 0.012), WOOD, 0, 1.02, cz + 0.08);
    part(g, rbox(cw - 0.1, 0.03, 0.3, 0.006), '#e0e0dc', 0, 0.74, cz - 0.03);
    part(g, box(cw - 0.06, 0.02, 0.005), '#c9a227', 0, 0.82, cz + 0.182, { outline: false });
    label(g, FIRM, 0.62, 0.09, 0, 0.6, cz + 0.184, '#f4f4f2', NAVY);
    const top = 1.04;
    // The bell, the sign-in sheet, the leaflets, the orchid.
    part(g, cyl(0.04, 0.045, 0.012, 16), BLACK, -0.55, top + 0.006, cz + 0.08);
    part(g, ball(0.035), '#c9a227', -0.55, top + 0.022, cz + 0.08).scale.set(1, 0.7, 1);
    part(g, cyl(0.006, 0.006, 0.02, 8), '#c9a227', -0.55, top + 0.055, cz + 0.08, { outline: false });
    part(g, rbox(0.17, 0.008, 0.24, 0.004), '#8d6e63', -0.25, top + 0.004, cz + 0.06, { ry: 0.1 });
    part(g, box(0.15, 0.003, 0.2), PAPER, -0.25, top + 0.01, cz + 0.07, { ry: 0.1, outline: false });
    part(g, box(0.06, 0.012, 0.02), CHROME, -0.25, top + 0.014, cz - 0.04, { ry: 0.1, outline: false });
    label(g, '방문객 명부', 0.1, 0.025, -0.25, top + 0.012, cz + 0.0, PAPER, '#37474f').rotation.set(-Math.PI / 2, 0, 0.1);
    const stand = at(g, 0.25, top, cz + 0.06, -0.15);
    part(stand, rbox(0.36, 0.2, 0.08, 0.008), '#d7ccc8', 0, 0.1, 0, { rx: -0.2 });
    ['연말정산 안내', '결산 체크리스트', '기장 대리 상담'].forEach((s, i) => {
      const x = -0.12 + i * 0.12;
      part(stand, box(0.1, 0.16, 0.004), ['#bbdefb', '#c8e6c9', '#ffe0b2'][i], x, 0.13, 0.03, { rx: -0.2, outline: false });
      label(stand, s, 0.09, 0.03, x, 0.17, 0.035, ['#bbdefb', '#c8e6c9', '#ffe0b2'][i], '#263238').rotation.x = -0.2;
    });
    part(g, rbox(0.12, 0.1, 0.12, 0.02), '#fafafa', 0.62, top + 0.05, cz + 0.02);
    for (let i = 0; i < 3; i++) {
      rod(g, new THREE.Vector3(0.62, top + 0.1, cz + 0.02), new THREE.Vector3(0.6 + i * 0.02, top + 0.38, cz + 0.02 + (i - 1) * 0.02), 0.004, '#558b2f');
      for (let k = 0; k < 3; k++) part(g, ball(0.024), '#fafafa', 0.6 + i * 0.02 + (k - 1) * 0.04, top + 0.32 - k * 0.05, cz + 0.06 + (i - 1) * 0.02, { outline: false }).scale.set(1, 0.6, 1);
    }
    for (const sx of [-1, 1]) part(g, rbox(0.04, 0.16, 0.12, 0.012), '#43a047', 0.62 + sx * 0.05, top + 0.14, cz + 0.02, { rz: sx * 0.6 });
    // Behind the counter: the receptionist's monitor and phone.
    const mon = at(g, -0.15, 0.76, cz - 0.1, 0);
    part(mon, rbox(0.38, 0.24, 0.025, 0.008), BLACK, 0, 0.18, -0.02);
    part(mon, rbox(0.03, 0.1, 0.02, 0.006), BLACK, 0, 0.05, -0.04);
    part(g, rbox(0.16, 0.04, 0.12, 0.012), '#37474f', 0.3, 0.77, cz - 0.08);
    part(g, rbox(0.04, 0.03, 0.16, 0.012), '#263238', 0.24, 0.8, cz - 0.08);
  },
};
