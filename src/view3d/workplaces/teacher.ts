import * as THREE from 'three';
import { marker, rod, screenMesh, shade, spot, tint, type Builder, type Spot } from '../parts';
import { LESSON_LINE, lessonBeat, type Motion } from '../activity';
import type { HeldTool } from '../handTool';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';
import * as TC from './teacherMotion';

/**
 * The elementary classroom drawn as itself (2026-10-27 workplace pipeline, at the user's request):
 * the green chalkboard under the 태극기, the clock and the class motto, today's lesson on it and a
 * problem written up line by line while it's taught; the teacher's grey steel desk with its glass
 * top, the 학급 관리 screen and a stack of tests marked in red; the pupils' small desks with their
 * steel-framed chairs, a bag on the hook and a notebook open; and what the room was missing
 * (workFurniture/teacher.ts): the 교탁, the class TV, the notice board with the timetable and the
 * praise-sticker chart, the 사물함 and the cleaning cupboard with the recycling bins.
 *
 * Teaching is done at the board, to the class: written up facing it, turned round to explain,
 * half turned back pointing at the line, a hand up asking who knows (activity.ts lessonBeat — the
 * board turns its spot and writes its chalk by the same clock as the hand).
 */

const STEEL = '#b9c0c6';
const ALU = '#cfd5da';
const BOARD = '#2f5544';
const CHALK = '#f3f5ef';
const PLY = '#dcc196';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

/** Lit parts (the TV's power light, a sticker's shine): one unlit material a colour. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

// ---------------------------------------------------------------------------------------------
// What's painted on the board, the screens and the papers (once each; blank outside a browser).

type Paint = (c: CanvasRenderingContext2D) => void;
const paints = new Map<string, THREE.Texture>();
function painted(key: string, w: number, h: number, paint: Paint): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(w, h, paint)));
  return t;
}
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', bold = true) {
  c.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
}
/** The same scatter every time it's painted. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
/** A flat picture (a sign, a sheet); `color` dims it. */
function picture(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, color = '#ffffff', ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(rx, ry, 0);
  g.add(m);
  return m;
}
/** A sheet lying flat on a top, turned `ry` about the vertical. */
const flat = (g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0) => picture(g, tex, w, h, x, y, z, '#ffffff', ry, -Math.PI / 2);
/** Words on a plate (a name tag, a bin's label). */
function label(g: THREE.Object3D, s: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${s}|${bg}|${fg}|${cw}`, cw, ch, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, cw, ch);
    c.font = `bold ${Math.round(ch * 0.6)}px ${FONT}`;
    c.fillStyle = fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(s, cw / 2, ch * 0.54, cw * 0.92);
  });
  return picture(g, tex, w, h, x, y, z, '#ffffff', ry);
}
/** A screen that lights while it's used (Built.screen), showing a painted face. */
function litScreen(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const s = screenMesh(w, h);
  (s.material as THREE.MeshBasicMaterial).map = tex;
  s.position.set(x, y, z);
  g.add(s);
  return s;
}
/** Hand-drawn wobble for chalk and crayon strokes. */
function wobbly(c: CanvasRenderingContext2D, pts: Array<[number, number]>, r: () => number, j = 1.5) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo : c.moveTo).call(c, x + (r() - 0.5) * j, y + (r() - 0.5) * j));
  c.stroke();
}
/** A pie cut in `n`, `k` of it shaded (the fractions lesson). */
function pie(c: CanvasRenderingContext2D, x: number, y: number, rad: number, n: number, k: number, fill: string, line: string) {
  for (let i = 0; i < k; i++) {
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, rad, -Math.PI / 2 + (i / n) * Math.PI * 2, -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = line;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, y, rad, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    c.stroke();
  }
}

/** The chalkboard's canvas, and the clear patch the problem is written up in (in metres on the board). */
const BOARD_W = 1.9;
const BOARD_H = 1.05;
const BOARD_Y = 1.35;
/** Where the teacher stands to write, and where the first line starts (x on the board, y up). */
const WRITE_X = -0.08;
const LINE_X = -0.33;
const LINE_Y = 1.56;
const bx = (x: number) => ((x + BOARD_W / 2) / BOARD_W) * 1024;
const by = (y: number) => ((BOARD_Y + BOARD_H / 2 - y) / BOARD_H) * 566;

/** Today on the board: the lesson and its goal, fractions in pies, the date, who's on duty, homework, who talked. */
const paintBoard: Paint = (c) => {
  c.fillStyle = BOARD;
  c.fillRect(0, 0, 1024, 566);
  // Yesterday rubbed out, a haze of chalk.
  const r = seeded(11);
  for (let i = 0; i < 30; i++) {
    c.fillStyle = `rgba(230,240,230,${0.025 + r() * 0.04})`;
    c.beginPath();
    c.ellipse(r() * 1024, r() * 566, 60 + r() * 140, 12 + r() * 24, r() * 0.4 - 0.2, 0, Math.PI * 2);
    c.fill();
  }
  const ch = CHALK;
  const yel = '#ffe98a';
  const pink = '#f8a8b8';
  const blue = '#9fd3f5';
  c.lineCap = 'round';
  // The lesson and its goal, top left.
  text(c, '3교시  수학', 26, 38, 34, ch);
  c.strokeStyle = ch;
  c.lineWidth = 3;
  wobbly(c, [[24, 62], [210, 60]], r);
  c.strokeStyle = yel;
  c.lineWidth = 3;
  c.strokeRect(22, 84, 270, 92);
  text(c, '학습 목표', 34, 104, 22, yel);
  text(c, '분모가 같은 분수의', 34, 134, 24, ch, 'left', false);
  text(c, '덧셈을 할 수 있다.', 34, 162, 24, ch, 'left', false);
  // Fractions as pies: 1/4 + 2/4 = 3/4.
  pie(c, 72, 252, 44, 4, 1, 'rgba(248,168,184,0.55)', ch);
  text(c, '+', 140, 252, 40, ch, 'center', false);
  pie(c, 208, 252, 44, 4, 2, 'rgba(159,211,245,0.55)', ch);
  text(c, '1/4', 72, 322, 26, pink, 'center');
  text(c, '2/4', 208, 322, 26, blue, 'center');
  text(c, '=', 72, 400, 40, ch, 'center', false);
  pie(c, 160, 400, 44, 4, 3, 'rgba(255,233,138,0.5)', ch);
  text(c, '3/4', 236, 400, 28, yel, 'left');
  text(c, '분모는 그대로!', 26, 480, 24, pink);
  text(c, '분자끼리 더해요 ★', 26, 514, 24, pink);
  // The problem's heading over the clear patch the lines are written up in.
  const px = bx(LINE_X) + 4;
  text(c, '오늘의 문제', px, by(LINE_Y + 0.1), 26, yel);
  c.strokeStyle = yel;
  wobbly(c, [[px, by(LINE_Y + 0.065)], [px + 150, by(LINE_Y + 0.067)]], r);
  text(c, '익힘책 54~55쪽', px, 470, 24, ch, 'left', false);
  text(c, '모둠별로 풀어 보기', px, 506, 22, blue, 'left', false);
  // Top right: the date, today's monitors; homework; who talked.
  text(c, '10월 27일', 1000, 36, 30, ch, 'right');
  text(c, '화요일', 1000, 74, 26, ch, 'right', false);
  text(c, '주번: 김민준 · 이서연', 1000, 116, 22, blue, 'right', false);
  c.strokeStyle = ch;
  c.lineWidth = 2;
  wobbly(c, [[790, 140], [1000, 140]], r);
  text(c, '알림장', 690, 176, 24, yel);
  text(c, '1. 받아쓰기 3급 연습', 690, 210, 21, ch, 'left', false);
  text(c, '2. 수학 익힘책 55쪽', 690, 240, 21, ch, 'left', false);
  text(c, '3. 우유갑 씻어 오기', 690, 270, 21, ch, 'left', false);
  text(c, '떠든 사람', 1000, 470, 22, ch, 'right');
  text(c, '박지호 正', 1000, 502, 22, pink, 'right', false);
  text(c, '윤수아 丁', 1000, 532, 22, pink, 'right', false);
};

/** The problem written up, a line at a time: chalk on nothing, shown as far as it's been written. */
const LINES = ['① 1/4 + 2/4 = 3/4', '② 2/5 + 1/5 = 3/5', '③ 3/7 + 2/7 = 5/7'];
function paintLine(s: string): Paint {
  return (c) => {
    c.clearRect(0, 0, 512, 96);
    c.font = `bold 58px ${FONT}`;
    c.fillStyle = CHALK;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillText(s, 6, 52, 500);
  };
}

/** The 태극기: the red and blue 태극 turned on its axis, the four trigrams at the corners. */
const paintFlag: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 300, 200);
  const R = 50;
  c.save();
  c.translate(150, 100);
  c.rotate(Math.atan2(2, 3));
  c.fillStyle = '#cd2e3a';
  c.beginPath();
  c.arc(0, 0, R, Math.PI, Math.PI * 2);
  c.fill();
  c.fillStyle = '#0047a0';
  c.beginPath();
  c.arc(0, 0, R, 0, Math.PI);
  c.fill();
  c.beginPath();
  c.arc(-R / 2, 0, R / 2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#cd2e3a';
  c.beginPath();
  c.arc(R / 2, 0, R / 2, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // 건 ☰ (upper left), 곤 ☷ (lower right), 감 ☵ (upper right), 리 ☲ (lower left): true = a whole bar.
  const corners: Array<[number, number, boolean[]]> = [
    [-3, -2, [true, true, true]],
    [3, 2, [false, false, false]],
    [3, -2, [false, true, false]],
    [-3, 2, [true, false, true]],
  ];
  c.fillStyle = '#000000';
  for (const [dx, dy, bars] of corners) {
    const len = Math.hypot(dx, dy);
    c.save();
    c.translate(150 + (dx / len) * 88, 100 + (dy / len) * 88);
    c.rotate(Math.atan2(dy, dx));
    bars.forEach((whole, i) => {
      const o = (i - 1) * 11;
      if (whole) c.fillRect(o - 3.5, -24, 7, 48);
      else {
        c.fillRect(o - 3.5, -24, 7, 21);
        c.fillRect(o - 3.5, 3, 7, 21);
      }
    });
    c.restore();
  }
};

/** The classroom clock's face (twenty to three). */
const paintClock: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(64, 64, 62, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = i % 5 ? 56 : 50;
    c.strokeStyle = '#37474f';
    c.lineWidth = i % 5 ? 1 : 3;
    c.beginPath();
    c.moveTo(64 + Math.sin(a) * r0, 64 - Math.cos(a) * r0);
    c.lineTo(64 + Math.sin(a) * 60, 64 - Math.cos(a) * 60);
    c.stroke();
  }
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    text(c, String(h), 64 + Math.sin(a) * 40, 65 - Math.cos(a) * 40, 14, '#263238', 'center');
  }
  const hand = (a: number, len: number, w: number, col: string) => {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(64, 64);
    c.lineTo(64 + Math.sin(a) * len, 64 - Math.cos(a) * len);
    c.stroke();
  };
  hand(((2 + 40 / 60) / 12) * Math.PI * 2, 28, 5, '#263238');
  hand((40 / 60) * Math.PI * 2, 44, 3, '#263238');
  hand((12 / 60) * Math.PI * 2, 48, 1.5, '#d32f2f');
};

/** The class motto in its frame. */
const paintMotto: Paint = (c) => {
  c.fillStyle = '#fffaf0';
  c.fillRect(0, 0, 256, 160);
  text(c, '급  훈', 128, 34, 26, '#8d6e63', 'center');
  text(c, '서로 돕고', 128, 82, 34, '#263238', 'center');
  text(c, '함께 웃자', 128, 126, 34, '#263238', 'center');
};

/** The 학급 관리 screen on the teacher's desk: today's attendance and the marks being entered. */
const paintClassAdmin: Paint = (c) => {
  c.fillStyle = '#f5f7fa';
  c.fillRect(0, 0, 320, 192);
  c.fillStyle = '#1e5aa8';
  c.fillRect(0, 0, 320, 24);
  text(c, '학급 관리 · 3학년 2반', 8, 12, 13, '#ffffff');
  text(c, '출결 26/27', 312, 12, 11, '#bbdefb', 'right', false);
  const cols = ['번호', '이름', '출결', '단원평가'];
  const xs = [10, 50, 140, 210];
  cols.forEach((s, i) => text(c, s, xs[i], 38, 11, '#455a64'));
  const names = ['김민준', '이서연', '박지호', '윤수아', '권시우', '강도윤', '윤서아', '윤하린'];
  const marks = ['95', '100', '80', '90', '85', '100', '', ''];
  names.forEach((n, i) => {
    const y = 56 + i * 17;
    if (i % 2) {
      c.fillStyle = '#e8eef6';
      c.fillRect(4, y - 8, 312, 17);
    }
    text(c, String(i + 1), xs[0], y, 11, '#37474f', 'left', false);
    text(c, n, xs[1], y, 11, '#263238', 'left', false);
    text(c, i === 3 ? '지각' : '출석', xs[2], y, 11, i === 3 ? '#e65100' : '#2e7d32', 'left', false);
    text(c, marks[i], xs[3], y, 11, '#263238', 'left', false);
  });
  c.strokeStyle = '#1e88e5';
  c.lineWidth = 2;
  c.strokeRect(206, 56 + 6 * 17 - 8, 60, 17);
};

/** A marked test: 2학기 수학 단원평가, red circles and a score. */
const paintTest: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 160, 224);
  text(c, '2학기 수학 단원평가', 80, 16, 12, '#263238', 'center');
  text(c, '3학년 2반 이름: 권시우', 80, 34, 9, '#455a64', 'center', false);
  for (let i = 0; i < 6; i++) {
    const y = 58 + i * 26;
    text(c, `${i + 1}. □/5 + □/5 = ____`, 10, y, 10, '#37474f', 'left', false);
    c.strokeStyle = '#e53935';
    c.lineWidth = 2;
    c.beginPath();
    if (i === 4) {
      c.moveTo(14, y - 6);
      c.lineTo(26, y + 8);
      c.moveTo(26, y - 6);
      c.lineTo(14, y + 8);
    } else c.arc(18, y, 10, 0, Math.PI * 2);
    c.stroke();
  }
  text(c, '85', 128, 200, 28, '#e53935', 'center');
  c.strokeStyle = '#e53935';
  c.beginPath();
  c.moveTo(104, 212);
  c.lineTo(152, 208);
  c.moveTo(106, 217);
  c.lineTo(150, 213);
  c.stroke();
};

/** A pupil's notebook open: 받아쓰기 lines on the left, sums on the right. */
const paintNotebook: Paint = (c) => {
  c.fillStyle = '#fffdf6';
  c.fillRect(0, 0, 256, 160);
  c.strokeStyle = '#b3d4ee';
  c.lineWidth = 1;
  for (let y = 22; y < 160; y += 18) {
    c.beginPath();
    c.moveTo(6, y);
    c.lineTo(250, y);
    c.stroke();
  }
  c.strokeStyle = '#d7ccc8';
  c.beginPath();
  c.moveTo(128, 0);
  c.lineTo(128, 160);
  c.stroke();
  text(c, '받아쓰기 3급', 10, 12, 12, '#5d4037');
  ['1. 무지개', '2. 바닷가', '3. 꽃밭에서', '4. 놀이터', '5. 맑은 하늘'].forEach((s, i) => text(c, s, 12, 31 + i * 18, 12, '#37474f', 'left', false));
  ['1/4+2/4=3/4', '2/5+1/5=3/5', '3/7+2/7=5/7'].forEach((s, i) => text(c, s, 136, 31 + i * 18, 12, '#37474f', 'left', false));
};

/** The 참 잘했어요 stamp pressed on a page (shown while homework is checked). */
const paintStamp: Paint = (c) => {
  c.clearRect(0, 0, 128, 128);
  c.strokeStyle = '#e53935';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(64, 64, 56, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  c.arc(64, 64, 46, 0, Math.PI * 2);
  c.stroke();
  text(c, '참', 64, 40, 26, '#e53935', 'center');
  text(c, '잘했어요', 64, 80, 24, '#e53935', 'center');
};

/** The class TV's lesson video: an animated maths show (a pie being shared out), the subtitle under it. */
const paintVideo: Paint = (c) => {
  const sky = c.createLinearGradient(0, 0, 0, 216);
  sky.addColorStop(0, '#bfe9ff');
  sky.addColorStop(1, '#e8f8ff');
  c.fillStyle = sky;
  c.fillRect(0, 0, 384, 216);
  c.fillStyle = '#9ccc65';
  c.fillRect(0, 160, 384, 56);
  text(c, '초등 수학 3-2  ·  분수의 덧셈', 12, 18, 16, '#1a237e');
  text(c, '교육 방송', 372, 18, 12, '#5c6bc0', 'right');
  pie(c, 250, 104, 52, 4, 3, '#ffb74d', '#6d4c41');
  // A cartoon guide with a pointer.
  c.fillStyle = '#ffe0b2';
  c.beginPath();
  c.arc(96, 98, 30, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#3e2723';
  c.beginPath();
  c.arc(96, 86, 31, Math.PI, Math.PI * 2);
  c.fill();
  c.fillStyle = '#263238';
  for (const dx of [-10, 10]) {
    c.beginPath();
    c.arc(96 + dx, 100, 3.5, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#d84315';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(96, 108, 9, 0.2, Math.PI - 0.2);
  c.stroke();
  c.fillStyle = '#42a5f5';
  c.fillRect(70, 128, 52, 38);
  c.strokeStyle = '#5d4037';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(118, 136);
  c.lineTo(190, 104);
  c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.fillRect(40, 182, 304, 28);
  text(c, '"네 조각 중에 세 조각을 먹었어요!"', 192, 196, 15, '#ffffff', 'center');
};

/** The class notice board: the timetable, the praise chart, the rules, the lunch menu, the pupils' dreams. */
const NB_W = 1.86;
const NB_H = 1.0;
const NB_Y = 1.42;
/** The praise chart's grid (canvas px): names down the side, a sticker a cell. */
const PR = { x0: 470, y0: 150, cw: 34, rh: 40, rows: 6, cols: 7 };
const PRAISE = [7, 5, 6, 3, 6, 4];
const PRAISE_ROW = 3;
const paintNotices: Paint = (c) => {
  // Cork.
  c.fillStyle = '#c8a26b';
  c.fillRect(0, 0, 1024, 552);
  const r = seeded(5);
  for (let i = 0; i < 2600; i++) {
    c.fillStyle = r() > 0.5 ? 'rgba(120,80,40,0.18)' : 'rgba(255,240,210,0.16)';
    c.fillRect(r() * 1024, r() * 552, 2 + r() * 3, 2 + r() * 2);
  }
  // The banner of cut-out letters.
  const title = '우리 반 이야기';
  const tcols = ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#ab47bc', '#ec407a'];
  [...title].forEach((ch, i) => {
    if (ch === ' ') return;
    const x = 330 + i * 52;
    c.fillStyle = tcols[i % tcols.length];
    c.beginPath();
    c.arc(x, 44, 24, 0, Math.PI * 2);
    c.fill();
    text(c, ch, x, 46, 28, '#ffffff', 'center');
  });
  text(c, '3학년 2반', 760, 46, 26, '#5d4037');
  // The timetable.
  const tx = 24;
  const ty = 92;
  c.fillStyle = '#ffffff';
  c.fillRect(tx, ty, 400, 300);
  text(c, '시 간 표', tx + 200, ty + 20, 22, '#1565c0', 'center');
  const days = ['', '월', '화', '수', '목', '금'];
  const subj = [
    ['국어', '수학', '국어', '사회', '과학'],
    ['수학', '국어', '영어', '수학', '국어'],
    ['과학', '체육', '수학', '국어', '음악'],
    ['사회', '음악', '창체', '체육', '미술'],
    ['체육', '미술', '', '도덕', '미술'],
    ['창체', '', '', '영어', ''],
  ];
  const tint2: Record<string, string> = { 국어: '#ffcdd2', 수학: '#bbdefb', 사회: '#ffe0b2', 과학: '#c8e6c9', 영어: '#e1bee7', 체육: '#b2ebf2', 음악: '#fff9c4', 미술: '#f8bbd0', 도덕: '#d7ccc8', 창체: '#dcedc8' };
  const cw = 64;
  const rh = 36;
  days.forEach((d, i) => text(c, d, tx + 30 + i * cw + (i ? 8 : 0), ty + 50, 18, '#37474f', 'center'));
  subj.forEach((row, j) => {
    const y = ty + 70 + j * rh;
    text(c, `${j + 1}`, tx + 30, y + rh / 2, 16, '#546e7a', 'center');
    row.forEach((s, i) => {
      if (!s) return;
      const x = tx + 54 + i * cw;
      c.fillStyle = tint2[s] ?? '#eeeeee';
      c.fillRect(x, y + 3, cw - 4, rh - 6);
      text(c, s, x + (cw - 4) / 2, y + rh / 2, 16, '#263238', 'center', false);
    });
  });
  // The praise chart.
  c.fillStyle = '#fff8e1';
  c.fillRect(PR.x0 - 104, PR.y0 - 58, 104 + PR.cols * PR.cw + 18, PR.rows * PR.rh + 76);
  text(c, '칭찬 스티커', PR.x0 + (PR.cols * PR.cw) / 2 - 40, PR.y0 - 32, 24, '#e65100', 'center');
  const names = ['김민준', '이서연', '박지호', '윤수아', '권시우', '강도윤'];
  names.forEach((n, j) => {
    const y = PR.y0 + j * PR.rh + PR.rh / 2;
    text(c, n, PR.x0 - 10, y, 17, '#4e342e', 'right', false);
    for (let i = 0; i < PR.cols; i++) {
      const x = PR.x0 + i * PR.cw + PR.cw / 2;
      c.strokeStyle = '#ffcc80';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, 13, 0, Math.PI * 2);
      c.stroke();
      if (i < PRAISE[j]) star(c, x, y, 13, ['#fdd835', '#ff7043', '#66bb6a', '#29b6f6', '#ec407a'][(i + j) % 5]);
    }
  });
  // The class promises.
  const rx = 770;
  c.fillStyle = '#e3f2fd';
  c.fillRect(rx, 92, 232, 170);
  text(c, '우리 반 약속', rx + 116, 114, 20, '#0d47a1', 'center');
  ['1. 고운 말 쓰기', '2. 복도에서는 걷기', '3. 내 자리 깨끗이', '4. 먼저 인사하기'].forEach((s, i) => text(c, s, rx + 14, 146 + i * 28, 16, '#263238', 'left', false));
  // This week's lunches.
  c.fillStyle = '#ffffff';
  c.fillRect(rx, 276, 232, 120);
  text(c, '이번 주 급식', rx + 116, 294, 18, '#2e7d32', 'center');
  ['월 카레라이스', '화 비빔밥 · 미역국', '수 짜장면 · 탕수육', '목 김치볶음밥'].forEach((s, i) => text(c, s, rx + 12, 318 + i * 21, 14, '#37474f', 'left', false));
  // The pupils' drawings: 나의 꿈.
  text(c, '나의 꿈', 120, 420, 22, '#4e342e', 'center');
  const dreams: Array<[string, string]> = [['소방관', '#ef5350'], ['우주인', '#5c6bc0'], ['선생님', '#66bb6a'], ['요리사', '#ffa726']];
  dreams.forEach(([s, col], i) => {
    const x = 24 + i * 150 + (i > 1 ? 330 : 0);
    const y = 440;
    c.fillStyle = '#ffffff';
    c.fillRect(x, y, 128, 96);
    c.strokeStyle = col;
    c.lineWidth = 4;
    c.lineCap = 'round';
    // A crayon figure under a sun.
    c.beginPath();
    c.arc(x + 64, y + 36, 12, 0, Math.PI * 2);
    c.moveTo(x + 64, y + 48);
    c.lineTo(x + 64, y + 72);
    c.moveTo(x + 48, y + 58);
    c.lineTo(x + 80, y + 58);
    c.moveTo(x + 64, y + 72);
    c.lineTo(x + 52, y + 88);
    c.moveTo(x + 64, y + 72);
    c.lineTo(x + 76, y + 88);
    c.stroke();
    c.fillStyle = '#ffd54f';
    c.beginPath();
    c.arc(x + 110, y + 16, 9, 0, Math.PI * 2);
    c.fill();
    text(c, s, x + 30, y + 14, 14, '#37474f', 'center');
  });
  // The 당번표: duties down the side, two slots a row, the spare slot tags pass through (the tags themselves are drawn over it).
  const D = TC.CHART;
  c.fillStyle = '#fffdf2';
  c.fillRect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0);
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 2;
  c.strokeRect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0);
  text(c, '이번 주 당번표', (D.x0 + D.x1) / 2, D.y0 + 14, 18, '#bf360c', 'center');
  TC.DUTIES.forEach((s, j) => {
    const y = D.rowY + j * D.rowH;
    text(c, s, D.x0 + 8, y, 15, '#37474f');
    for (const x of D.colX) {
      c.strokeStyle = '#bcaaa4';
      c.lineWidth = 1;
      c.strokeRect(x - 34, y - 11, 68, 22);
    }
  });
  const spareY = D.rowY + D.rowH;
  text(c, '바꾸는 칸', D.spareX, spareY - 22, 13, '#6d4c41', 'center', false);
  c.setLineDash([4, 3]);
  c.strokeStyle = '#8d6e63';
  c.strokeRect(D.spareX - 34, spareY - 11, 68, 22);
  c.setLineDash([]);
};

/** The record's words: observed behaviour, with nothing of the family in it (made up, as the pupil is). */
const RECORD_TEXT = '모둠 활동에서 친구의 말을 끝까지 듣고 자기 생각을 덧붙여 말함. 학급 도서 정리를 스스로 맡아 책을 갈래별로 나누어 꽂고, 빌려 간 기록을 꼼꼼히 챙김. 과학 실험에서 관찰한 내용을 그림과 글로 자세히 기록하며, 궁금한 점을 끝까지 찾아보려는 태도가 돋보임.';
/** How finely the typing shows (a canvas each, painted when first wanted). */
const RECORD_STEPS = 12;
/** A form of our own for the school record: the sections are the record's, the look isn't any real system's. */
function paintRecord(step: number, saved: boolean): Paint {
  return (c) => {
    c.fillStyle = '#f4f6f8';
    c.fillRect(0, 0, 640, 384);
    c.fillStyle = '#37617f';
    c.fillRect(0, 0, 640, 40);
    text(c, '학교생활기록부 입력', 16, 21, 21, '#ffffff');
    text(c, '담임교사', 624, 21, 16, '#dcebf5', 'right', false);
    text(c, '햇살초등학교 · 3학년 2반 · 4번 윤수아', 16, 60, 18, '#263238');
    const tabs: Array<[string, number]> = [['출결상황', 86], ['창의적 체험활동상황', 170], ['교과학습발달상황', 150], ['행동특성 및 종합의견', 186]];
    let x = 12;
    tabs.forEach(([s, w], i) => {
      const on = i === 3;
      c.fillStyle = on ? '#ffffff' : '#d5dde3';
      c.fillRect(x, 80, w, 32);
      text(c, s, x + w / 2, 97, 14, on ? '#1b4f72' : '#546e7a', 'center', on);
      x += w + 6;
    });
    c.fillStyle = '#ffffff';
    c.fillRect(12, 112, 616, 214);
    c.strokeStyle = '#b0bec5';
    c.lineWidth = 1;
    c.strokeRect(12.5, 112.5, 615, 214);
    const n = Math.round((step / RECORD_STEPS) * RECORD_TEXT.length);
    const shown = RECORD_TEXT.slice(0, n);
    const perLine = 29;
    let last = '';
    let ly = 136;
    for (let i = 0; i < shown.length || i === 0; i += perLine) {
      last = shown.slice(i, i + perLine);
      text(c, last, 24, ly, 18, '#212121', 'left', false);
      if (i + perLine < shown.length) ly += 30;
    }
    // The caret at the end of what's typed.
    if (!saved && step < RECORD_STEPS) {
      c.font = `18px ${FONT}`;
      c.fillStyle = '#1565c0';
      c.fillRect(24 + c.measureText(last).width + 2, ly - 11, 2, 22);
    }
    text(c, `입력 글자 수 ${n}자`, 24, 350, 15, '#546e7a', 'left', false);
    if (saved) text(c, '저장했습니다', 310, 350, 16, '#2e7d32', 'center');
    const buttons: Array<[string, number, string]> = [['임시 저장', 430, '#78909c'], ['저장', 536, '#37617f']];
    for (const [s, bx, col] of buttons) {
      c.fillStyle = col;
      c.fillRect(bx, 334, 92, 32);
      text(c, s, bx + 46, 351, 15, '#ffffff', 'center');
    }
  };
}
/** Handwriting on a notebook's page. */
function pageLines(c: CanvasRenderingContext2D, lines: string[], y0: number, step: number, size: number, color = '#28407a') {
  lines.forEach((s, i) => text(c, s, 12, y0 + i * step, size, color, 'left', false));
}
function ruledPage(c: CanvasRenderingContext2D, step: number) {
  c.fillStyle = '#fbf8ee';
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = '#c9d6e4';
  c.lineWidth = 1;
  for (let y = step; y < 256; y += step) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(256, y);
    c.stroke();
  }
}
/** The notes through the year the record is written from (the left page). */
const paintObservations: Paint = (c) => {
  ruledPage(c, 36);
  text(c, '관찰 기록 · 윤수아', 12, 18, 21, '#1a237e');
  pageLines(c, ['9/12 모둠 발표: 친구 말', '끝까지 듣고 덧붙임', '10/2 도서 정리 스스로 맡음', '10/15 실험 관찰 그림 자세함', '궁금한 점 더 찾아봄'], 54, 36, 19);
};
/** The call's notes, the heading on the page from the start; the lines drawn over it one by one. */
const paintCallHead: Paint = (c) => {
  ruledPage(c, 36);
  text(c, '학부모 상담 · 윤수아', 12, 18, 21, '#1a237e');
};
const CALL_NOTES = ['집에서 책 읽기 좋아함', '친구 관계 물으심 → 모둠 활동 잘함', '다음 달 다시 연락드리기'];
const paintCallNote = (s: string): Paint => (c) => {
  c.clearRect(0, 0, 256, 36);
  text(c, s, 8, 18, 17, '#28407a', 'left', false);
};
function star(c: CanvasRenderingContext2D, x: number, y: number, rad: number, col: string) {
  c.fillStyle = col;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? rad * 0.45 : rad;
    (i ? c.lineTo : c.moveTo).call(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

/** A gold sticker, for the one being put on. */
const paintSticker: Paint = (c) => {
  c.clearRect(0, 0, 64, 64);
  star(c, 32, 33, 30, '#fbc02d');
  star(c, 32, 33, 18, '#fff176');
};

// ---------------------------------------------------------------------------------------------
// Small parts.

/** A spot sat in a chair facing -z (back to the object's front, at its desk), and what's done there. */
function satAt(g: THREE.Object3D, z: number, motion: Motion, work: THREE.Object3D, seat = 0.48): Spot {
  const s = spot(g, 'sit', 0, seat, z, Math.PI, seat);
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
/** A teacher's swivel chair: five-star base, gas lift, a padded seat and back (built facing +z). */
function swivelChair(c: THREE.Object3D, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, '#2b2b30');
    part(c, ball(0.024), '#2b2b30', Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.024, 0.024, 0.34, 10), '#d6dbdf', 0, 0.25, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, 0.45, 0);
  part(c, rbox(0.42, 0.46, 0.06, 0.04), color, 0, 0.8, -0.21, { rx: -0.08 });
  part(c, rbox(0.04, 0.28, 0.04, 0.01), '#2b2b30', 0, 0.55, -0.22, { outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.05, 0.03, 0.22, 0.012), '#2b2b30', sx * 0.25, 0.66, -0.01);
    part(c, rbox(0.03, 0.18, 0.03, 0.008), '#2b2b30', sx * 0.25, 0.56, -0.06, { outline: false });
  }
}
/** A pupil's chair: a plywood seat and back on a grey steel tube frame, seat `h` high (built facing +z). */
function pupilChair(c: THREE.Object3D, h: number) {
  const r = 0.012;
  for (const sx of [-1, 1]) {
    // Each side: front leg, back leg running on up into the back's upright, a runner across the bottom.
    rod(c, new THREE.Vector3(sx * 0.17, 0, 0.15), new THREE.Vector3(sx * 0.17, h - 0.03, 0.15), r, STEEL);
    rod(c, new THREE.Vector3(sx * 0.17, 0, -0.16), new THREE.Vector3(sx * 0.17, h + 0.38, -0.19), r, STEEL);
    rod(c, new THREE.Vector3(sx * 0.17, h - 0.03, 0.15), new THREE.Vector3(sx * 0.17, h - 0.03, -0.16), r, STEEL);
    for (const z of [0.15, -0.16]) part(c, cyl(0.016, 0.016, 0.02, 8), '#37474f', sx * 0.17, 0.01, z, { outline: false });
  }
  rod(c, new THREE.Vector3(-0.17, 0.12, 0.15), new THREE.Vector3(0.17, 0.12, 0.15), r, STEEL);
  rod(c, new THREE.Vector3(-0.17, 0.12, -0.16), new THREE.Vector3(0.17, 0.12, -0.16), r, STEEL);
  part(c, rbox(0.38, 0.025, 0.36, 0.012), PLY, 0, h, 0);
  part(c, rbox(0.38, 0.16, 0.022, 0.012), PLY, 0, h + 0.3, -0.18, { rx: -0.08 });
  // The hand hole in the back.
  part(c, rbox(0.1, 0.03, 0.024, 0.012), shade(PLY, 0.55), 0, h + 0.33, -0.181, { rx: -0.08, outline: false });
}
/** A pen pot with a few pens. */
function penPot(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.035, 0.032, 0.1, 12), '#5c6bc0', x, y + 0.05, z);
  for (const [dx, dz, col] of [[-0.012, 0, '#e53935'], [0.012, 0.008, '#1e88e5'], [0, -0.012, '#212121'], [0.008, -0.004, '#fdd835']] as Array<[number, number, string]>) part(g, cyl(0.005, 0.005, 0.15, 6), col, x + dx, y + 0.11, z + dz, { rz: dx * 6, rx: dz * 6, outline: false });
}
/** A ring binder lying flat, its spine label. */
function binder(g: THREE.Object3D, x: number, y: number, z: number, col: string, s: string, ry = 0) {
  part(g, rbox(0.23, 0.035, 0.31, 0.008), col, x, y + 0.0175, z, { ry });
  part(g, box(0.21, 0.028, 0.29), '#fafafa', x + 0.006, y + 0.0175, z, { ry, outline: false });
  label(g, s, 0.12, 0.04, x, y + 0.036, z, '#ffffff', shade(col, 0.8), ry).rotation.x = -Math.PI / 2;
}

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const NO_LINE = { outline: false };
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
const isOn = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;

/**
 * What the two desk uses add, kept off every other: the phone (always on the desk, its handset in the cradle), and shown only in
 * their use the notebook, the pen and the record on the screen. Reads the script in teacherMotion.ts each frame.
 */
function deskWork(g: THREE.Object3D, spots: { record: Spot; call: Spot }, mark: THREE.Object3D, out: { away?: (o: boolean, t: number) => void }, screen: THREE.Mesh, monitor: { x: number; y: number; z: number }) {
  const P = TC.PHONE;
  // The phone: a sloped grey body, keys, a little display and a lamp.
  part(g, rbox(0.15, 0.05, 0.18, 0.014), '#4a5157', P.base[0], P.base[1] + 0.025, P.base[2]);
  part(g, box(0.055, 0.012, 0.16), '#3a4045', P.cradle[0], P.base[1] + 0.056, P.cradle[2], NO_LINE);
  part(g, box(0.056, 0.004, 0.03), '#a8c7a0', P.keys[0], P.base[1] + 0.052, P.keys[2] - 0.055, NO_LINE);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) part(g, box(0.014, 0.005, 0.012), '#d7dadd', P.keys[0] - 0.018 + q * 0.018, P.base[1] + 0.052, P.keys[2] - 0.024 + r * 0.02, NO_LINE);
  const lampMat = new THREE.MeshBasicMaterial({ color: '#3a4a3a' });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), lampMat);
  lamp.userData.ownGeometry = lamp.userData.ownMaterial = true;
  lamp.position.set(P.keys[0] + 0.03, P.base[1] + 0.054, P.keys[2] - 0.055);
  g.add(lamp);
  // The handset: +y to the earpiece; lying in the cradle, or at the ear's slant.
  const handset = new THREE.Group();
  handset.name = 'tcHandset';
  g.add(handset);
  part(handset, cyl(0.016, 0.016, 0.13, 10), '#2f3438', 0, 0, 0, NO_LINE);
  part(handset, rbox(0.044, 0.05, 0.05, 0.012), '#2f3438', 0, 0.085, 0.008, NO_LINE);
  part(handset, rbox(0.044, 0.05, 0.05, 0.012), '#2f3438', 0, -0.085, 0.008, NO_LINE);
  const rest = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3(0, 0, -1));
  const ear = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3(0, 0.93, 0.36).normalize());
  handset.quaternion.copy(rest);
  handset.position.fromArray(P.cradle);
  // The coiled cord, a sagging chain from the body to the mouthpiece.
  const LINKS = 8;
  const links = Array.from({ length: LINKS }, () => part(g, cyl(0.0045, 0.0045, 1, 6), '#2b2f33', 0, 0, 0, NO_LINE));
  const cordFrom = V3(P.cradle[0] - 0.02, P.base[1] + 0.03, P.cradle[2] + 0.09);
  const a = V3(0, 0, 0);
  const b = V3(0, 0, 0);
  const lowEnd = V3(0, 0, 0);
  const UP = V3(0, 1, 0);
  const way = V3(0, 0, 0);
  const placeCord = () => {
    lowEnd.set(0, -0.11, 0.008).applyQuaternion(handset.quaternion).add(handset.position);
    const sag = 0.05 + 0.5 * cordFrom.distanceTo(lowEnd) * 0.25;
    const at = (i: number, o: THREE.Vector3) => {
      const u = i / LINKS;
      o.lerpVectors(cordFrom, lowEnd, u);
      o.y = Math.max(TC.TOP + 0.006, o.y - sag * 4 * u * (1 - u));
    };
    for (let i = 0; i < LINKS; i++) {
      at(i, a);
      at(i + 1, b);
      way.subVectors(b, a);
      const L = way.length();
      links[i].position.addVectors(a, b).multiplyScalar(0.5);
      links[i].scale.set(1, Math.max(L, 0.001), 1);
      links[i].quaternion.setFromUnitVectors(UP, way.divideScalar(Math.max(L, 1e-5)));
    }
  };
  placeCord();
  const handsetHeld: HeldTool = { tool: handset, lead: 'left', grips: { left: { at: V3(0, 0, 0), axis: V3(0, 1, 0), palm: V3(1, 0, 0), shape: 'power', radius: 0.018 } } };

  // What's only there in these uses.
  const use = new THREE.Group();
  use.visible = false;
  g.add(use);
  const B = TC.BOOK;
  part(use, box(B.w + 0.012, 0.012, B.d + 0.008), '#37617f', B.x, B.y - 0.012, B.z, NO_LINE);
  part(use, box(B.w, 0.008, B.d), '#f6f2e4', B.x, B.y - 0.005, B.z, NO_LINE);
  const pageW = B.w / 2 - 0.004;
  const leftAt = B.x - B.w / 4;
  const rightAt = B.x + B.w / 4;
  const leftPage = flat(use, painted('clsObservations', 256, 256, paintObservations), pageW, B.d - 0.006, leftAt, B.y + 0.0005, B.z);
  const rightPage = flat(use, painted('clsCallHead', 256, 256, paintCallHead), pageW, B.d - 0.006, rightAt, B.y + 0.0005, B.z);
  const rightBlank = flat(use, painted('clsBlankPage', 64, 64, (c) => ruledPage(c, 12)), pageW, B.d - 0.006, rightAt, B.y + 0.0005, B.z);
  const noteLines = CALL_NOTES.map((s, i) => flat(use, painted(`clsCallNote${i}`, 256, 36, paintCallNote(s)), pageW - 0.008, 0.018, rightAt, B.y + 0.001, B.z - 0.035 + i * 0.035));
  const callNotes = flat(use, painted('clsCallLeft', 256, 256, (c) => { ruledPage(c, 36); text(c, '오늘 상담 전화', 12, 18, 21, '#1a237e'); pageLines(c, ['윤수아 보호자', '10월 생활 안내'], 54, 36, 19); }), pageW, B.d - 0.006, leftAt, B.y + 0.0006, B.z);
  // The pen: +y up the barrel, the origin at the grip, the tip PEN_TIP below it.
  const pen = new THREE.Group();
  pen.name = 'tcDeskPen';
  use.add(pen);
  part(pen, cyl(0.0055, 0.0055, 0.11, 8), '#1e3a8a', 0, 0.015, 0, NO_LINE);
  part(pen, cyl(0.0055, 0.0015, 0.03, 8), '#cfd8dc', 0, -TC.PEN_TIP + 0.015, 0, NO_LINE);
  const lying = new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), Math.PI / 2 - 0.2);
  const stood = new THREE.Quaternion();
  const penHeld: HeldTool = { tool: pen, lead: 'right', grips: { right: { at: V3(0, 0, 0), axis: V3(0, -1, 0), shape: 'pen', radius: 0.011, writes: TC.PEN_TIP } } };

  // The record on the screen, in front of the screen's box.
  const form = picture(g, painted('clsRecord|0|0', 640, 384, paintRecord(0, false)), 0.45, 0.27, monitor.x, monitor.y, monitor.z);
  form.visible = false;
  let shownForm = '';
  const scratch = V3(0, 0, 0);

  out.away = (_o, t) => {
    const record = isOn(spots.record, t);
    const call = !record && isOn(spots.call, t);
    const ph = TC.tcPhase(mark.getWorldPosition(scratch));
    const H = (spots.call.at.userData.height as number | undefined) ?? 1.6;
    const R = record ? TC.recordNowAt(t, ph) : null;
    const C = call ? TC.callNowAt(t, ph, H) : null;
    use.visible = record || call;
    form.visible = record;
    screen.visible = !record;
    rightBlank.visible = record;
    rightPage.visible = call;
    leftPage.visible = record;
    callNotes.visible = call;
    noteLines.forEach((m, i) => (m.visible = !!C && i < C.lines));
    if (R) {
      const step = Math.round(R.typed * RECORD_STEPS);
      const key = `clsRecord|${step}|${R.saved ? 1 : 0}`;
      if (key !== shownForm) {
        shownForm = key;
        (form.material as THREE.MeshBasicMaterial).map = painted(key, 640, 384, paintRecord(step, R.saved));
        (form.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
    }
    // The phone.
    handset.position.fromArray(C ? C.handsetAt : P.cradle);
    handset.quaternion.slerpQuaternions(rest, ear, C ? C.lift : 0);
    placeCord();
    lampMat.color.set(C?.onCall ? '#7bff8a' : '#3a4a3a');
    // The pen, in the hand or laid across the page.
    const n = C ?? R;
    pen.position.fromArray(n ? n.penAt : TC.PEN_HOME);
    pen.quaternion.slerpQuaternions(lying, stood, n ? n.penUp : 0);
    spots.record.held = null;
    spots.call.held = C?.tool === 'handset' ? { ...handsetHeld, resting: C.resting } : C?.tool === 'pen' ? { ...penHeld, resting: C.resting } : null;
  };
}

/** The 당번표's tags: one per child, each a small card on the board, moved through the script's beats. */
function dutyTags(frame: THREE.Object3D, spot: Spot, mark: THREE.Object3D, out: { away?: (o: boolean, t: number) => void }, sticker: THREE.Object3D) {
  const tags = TC.CHILDREN.map((name, i) => {
    const tag = new THREE.Group();
    tag.name = 'tcDutyTag';
    frame.add(tag);
    part(tag, rbox(0.116, 0.036, 0.006, 0.002), ['#ffe082', '#c5e1a5', '#b3e5fc', '#f8bbd0'][i % 4], 0, 0, 0, NO_LINE);
    label(tag, name, 0.1, 0.03, 0, 0, 0.0036, '#ffffff', '#3e2723');
    return tag;
  });
  const grips: HeldTool['grips'] = { right: { at: V3(0, -0.012, 0.004), axis: V3(0, 1, 0), palm: V3(0, 0, -1), shape: 'pinch', radius: 0.006 } };
  const scratch = V3(0, 0, 0);
  const home = TC.slotsAtRound(0);
  home.forEach((child, slot) => tags[child].position.fromArray(TC.slotAt(slot)));
  out.away = (_o, t) => {
    const on = isOn(spot, t);
    if (on) sticker.visible = false;
    if (!on) {
      spot.held = null;
      return;
    }
    const N = TC.dutyNowAt(t, TC.tcPhase(mark.getWorldPosition(scratch)));
    N.tags.forEach((p, i) => tags[i].position.fromArray(p));
    spot.held = N.held !== null ? { tool: tags[N.held], lead: 'right', grips, resting: N.resting } : null;
  };
}

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  /**
   * The chalkboard: a wide green board in an aluminium frame, today on it — 3교시 수학 and its
   * learning goal, fractions shown as pies, the date and the day's monitors, the 알림장 and who
   * talked — the chalk tray with sticks in four colours, the chalk box and two felt erasers, a
   * 가정통신문 held up by magnets. Over it, on a wall: the classroom clock, the 태극기 framed in the
   * middle, the class motto. While a lesson's taught, the problem is written up a line at a time in
   * the clear patch under 오늘의 문제 and the teacher turns between the board and the class (the spot
   * turned by lessonBeat). A trainee watching a lesson stands off to the side with a notebook.
   */
  chalkboard(g, W, D, _c, _def, ctx, out) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.03 : 0.2);
    const Wb = Math.min(W - 0.1, BOARD_W);
    const H = BOARD_H;
    const y = BOARD_Y;
    if (!wall) {
      // A rolling stand: two posts on feet with casters, the back plain.
      for (const sx of [-1, 1]) {
        const x = sx * (Wb / 2 + 0.05);
        part(g, rbox(0.05, y + H / 2 + 0.1, 0.05, 0.01), STEEL, x, (y + H / 2 + 0.1) / 2, zb);
        part(g, rbox(0.07, 0.04, 0.6, 0.01), STEEL, x, 0.07, zb);
        for (const dz of [-0.26, 0.26]) part(g, cyl(0.03, 0.03, 0.025, 10), '#2b2b30', x, 0.03, zb + dz, { rz: Math.PI / 2, outline: false });
      }
      part(g, box(Wb, H, 0.01), shade(BOARD, 0.8), 0, y, zb - 0.025, { outline: false });
    }
    part(g, rbox(Wb + 0.07, H + 0.07, 0.04, 0.01), ALU, 0, y, zb);
    part(g, box(Wb, H, 0.006), BOARD, 0, y, zb + 0.021, { outline: false });
    picture(g, painted('clsBoard', 1024, 566, paintBoard), Wb, H, 0, y, zb + 0.025, '#e6eee6');
    // The 가정통신문 under two magnets at the bottom right.
    const notice = painted('clsNotice', 128, 176, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 128, 176);
      text(c, '가정통신문', 64, 18, 15, '#1565c0', 'center');
      text(c, '현장체험학습 안내', 64, 40, 11, '#263238', 'center');
      c.fillStyle = '#cfd8dc';
      for (let i = 0; i < 8; i++) c.fillRect(12, 58 + i * 13, i % 3 === 2 ? 70 : 104, 4);
      text(c, '○○초등학교장', 64, 162, 10, '#455a64', 'center', false);
    });
    const nx = Wb / 2 - 0.36;
    picture(g, notice, 0.17, 0.235, nx, y - H / 2 + 0.2, zb + 0.028);
    for (const [dx, col] of [[-0.06, '#e53935'], [0.06, '#1e88e5']] as Array<[number, string]>) part(g, cyl(0.016, 0.016, 0.012, 12), col, nx + dx, y - H / 2 + 0.3, zb + 0.034, { rx: Math.PI / 2 });
    // The tray: chalk sticks in four colours, the chalk box, the erasers.
    const ty = y - H / 2 - 0.035;
    part(g, rbox(Wb + 0.04, 0.018, 0.09, 0.006), ALU, 0, ty, zb + 0.06);
    part(g, box(Wb + 0.04, 0.03, 0.008), ALU, 0, ty + 0.015, zb + 0.102, { outline: false });
    for (const [x, col] of [[-0.42, '#ffffff'], [-0.36, '#fff176'], [-0.31, '#ffffff'], [-0.2, '#f48fb1'], [-0.14, '#81d4fa'], [0.12, '#ffffff']] as Array<[number, string]>) part(g, cyl(0.006, 0.006, 0.075, 6), col, x, ty + 0.016, zb + 0.06, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.12, 0.05, 0.07, 0.006), '#ffffff', -0.65, ty + 0.034, zb + 0.06);
    label(g, '분필', 0.1, 0.03, -0.65, ty + 0.036, zb + 0.096, '#ffffff', '#1565c0');
    for (let i = 0; i < 5; i++) part(g, cyl(0.006, 0.006, 0.03, 6), i % 2 ? '#fff176' : '#ffffff', -0.69 + i * 0.02, ty + 0.07, zb + 0.06, { outline: false });
    for (const x of [0.5, 0.66]) {
      part(g, rbox(0.14, 0.035, 0.055, 0.008), '#283593', x, ty + 0.035, zb + 0.06);
      part(g, box(0.13, 0.014, 0.05), '#cfd8dc', x, ty + 0.012, zb + 0.06, { outline: false });
    }
    if (wall) {
      // Over the board: the clock, the 태극기 in its frame, the class motto.
      const top = y + H / 2 + 0.36;
      part(g, rbox(0.62, 0.44, 0.03, 0.01), '#a1887f', 0, top, zb);
      part(g, box(0.56, 0.38, 0.006), '#ffffff', 0, top, zb + 0.016, { outline: false });
      picture(g, painted('clsFlag', 300, 200, paintFlag), 0.54, 0.36, 0, top, zb + 0.02);
      part(g, cyl(0.17, 0.17, 0.04, 28), '#eceff1', -0.72, top, zb + 0.005, { rx: Math.PI / 2 });
      picture(g, painted('clsClock', 128, 128, paintClock), 0.3, 0.3, -0.72, top, zb + 0.027);
      part(g, rbox(0.46, 0.3, 0.025, 0.008), '#8d6e63', 0.72, top, zb);
      picture(g, painted('clsMotto', 256, 160, paintMotto), 0.42, 0.26, 0.72, top, zb + 0.014);
      // The PA speaker up in the corner.
      part(g, rbox(0.22, 0.16, 0.12, 0.02), '#eceff1', Wb / 2 - 0.05, top + 0.36, zb + 0.06);
      part(g, box(0.18, 0.12, 0.006), '#90a4ae', Wb / 2 - 0.05, top + 0.36, zb + 0.122, { outline: false });
    }
    // The problem written up while the lesson's on: a line at a time, as far as it's been written.
    const zl = zb + 0.029;
    const lines = new THREE.Group();
    g.add(lines);
    out.inUse = lines;
    const rows = LINES.map((s, i) => {
      const tex = painted(`clsLine${i}`, 512, 96, paintLine(s)).clone();
      tex.needsUpdate = true;
      const geom = new THREE.PlaneGeometry(LESSON_LINE.len, 0.08).translate(LESSON_LINE.len / 2, 0, 0);
      const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: '#eef3ee' }));
      m.userData.ownGeometry = m.userData.ownMaterial = true;
      m.position.set(LINE_X, LINE_Y - i * LESSON_LINE.gap, zl);
      lines.add(m);
      return { m, tex };
    });
    // Turned about by the lesson: written at facing the board, round to the class, pointing back.
    const zs = zb + 0.5;
    const teach = stoodAt(g, WRITE_X, zs, 'teach', marker(g, LINE_X, LINE_Y, zb + 0.03));
    out.work = teach.work;
    out.animate = (t) => {
      const beat = lessonBeat(t);
      teach.at.rotation.y = beat.yaw;
      rows.forEach(({ m, tex }, i) => {
        const k = i < beat.row ? 1 : i === beat.row ? Math.max(0.001, beat.line) : 0;
        m.visible = k > 0;
        m.scale.x = Math.max(0.001, k);
        tex.repeat.x = Math.max(0.001, k);
      });
    };
    out.spots = {
      '*': teach,
      // At the side of the room's front, a notebook in hand, watching the class and the teacher.
      teacher_observeClass: stoodAt(g, Wb / 2 - 0.1, zs + 0.35, 'meeting', undefined, -0.55),
    };
  },

  /**
   * The teacher's desk: grey steel with a woodgrain top under a sheet of glass, the timetable
   * slipped under it, a pedestal of drawers; the 학급 관리 screen (lit in use) and its keyboard, a
   * stack of tests marked in red with the red pen, the register and the class log, a pen pot, a desk
   * calendar and a mug from the class; the swivel chair pulled up. Marked at sat writing on the
   * tests; plans and reports typed; counselling, meetings and supervision sat with a notebook.
   */
  teacherDesk(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.04, 1.0);
    const d = 0.64;
    const z = -D / 2 + d / 2 + 0.04;
    const front = z + d / 2;
    const h = 0.72;
    // The steel body: the modesty panel, the left side, the pedestal of drawers on the right.
    part(g, rbox(w - 0.08, 0.42, 0.02, 0.008), STEEL, 0, h - 0.27, z - d / 2 + 0.04);
    part(g, rbox(0.03, h - 0.02, d - 0.06, 0.008), STEEL, -w / 2 + 0.03, (h - 0.02) / 2, z);
    const px = w / 2 - 0.2;
    part(g, rbox(0.38, h - 0.04, d - 0.06, 0.01), STEEL, px, (h - 0.04) / 2 + 0.01, z);
    for (let i = 0; i < 3; i++) {
      const dy = 0.13 + i * 0.2;
      part(g, rbox(0.34, 0.17, 0.012, 0.006), tint(STEEL, 0.2), px, dy, front - 0.026);
      part(g, rbox(0.1, 0.014, 0.016, 0.006), '#78838c', px, dy + 0.05, front - 0.018, { outline: false });
      label(g, ['', '학습지', '상담 기록'][i] || '서류', 0.07, 0.025, px + 0.11, dy + 0.05, front - 0.019, '#ffffff', '#455a64');
    }
    // The top: woodgrain under glass, the timetable under the glass at the front left.
    part(g, rbox(w, 0.035, d, 0.01), '#cdb38f', 0, h, z);
    const glassMat = new THREE.MeshToonMaterial({ color: '#e0f2f1', transparent: true, opacity: 0.28, depthWrite: false });
    const sheet = new THREE.Mesh(box(w - 0.02, 0.006, d - 0.02), glassMat);
    sheet.userData.ownMaterial = true;
    sheet.position.set(0, h + 0.021, z);
    sheet.renderOrder = 2;
    g.add(sheet);
    const ty = h + 0.025;
    flat(g, painted('clsDeskTimetable', 192, 128, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 192, 128);
      text(c, '3-2 시간표', 96, 12, 12, '#1565c0', 'center');
      c.strokeStyle = '#90a4ae';
      for (let i = 0; i <= 6; i++) {
        c.beginPath();
        c.moveTo(6, 24 + i * 17);
        c.lineTo(186, 24 + i * 17);
        c.stroke();
      }
      for (let i = 0; i <= 5; i++) {
        c.beginPath();
        c.moveTo(6 + i * 36, 24);
        c.lineTo(6 + i * 36, 126);
        c.stroke();
      }
    }), 0.2, 0.13, -w / 2 + 0.16, h + 0.019, front - 0.1);
    // The screen and keyboard.
    const mx = -0.12;
    const mz = z - 0.17;
    part(g, rbox(0.18, 0.012, 0.13, 0.006), '#37474f', mx, ty + 0.006, mz);
    part(g, rbox(0.04, 0.17, 0.025, 0.008), '#37474f', mx, ty + 0.09, mz - 0.02);
    part(g, rbox(0.48, 0.3, 0.03, 0.012), '#263238', mx, ty + 0.3, mz);
    const adminScreen = litScreen(g, painted('clsAdmin', 320, 192, paintClassAdmin), 0.45, 0.27, mx, ty + 0.3, mz + 0.012);
    out.screen = adminScreen;
    part(g, rbox(0.38, 0.018, 0.13, 0.006), '#eceff1', mx - 0.02, ty + 0.009, z + 0.12);
    for (let r = 0; r < 4; r++) part(g, box(0.34, 0.006, 0.022), '#cfd8dc', mx - 0.02, ty + 0.02, z + 0.08 + r * 0.027, { outline: false });
    const kb = marker(g, mx - 0.02, ty + 0.03, z + 0.12);
    part(g, rbox(0.06, 0.02, 0.1, 0.01), '#eceff1', mx + 0.24, ty + 0.01, z + 0.13);
    // The tests: a stack, the top one marked, the red pen on it.
    const sx = Math.min(w / 2 - 0.15, 0.32);
    const sz = z + 0.1;
    for (let i = 0; i < 6; i++) part(g, box(0.17, 0.004, 0.235), i % 2 ? '#fafafa' : '#f1f1f1', sx + (i % 3) * 0.004, ty + 0.003 + i * 0.004, sz - (i % 2) * 0.004, { ry: -0.1 + i * 0.01, outline: false });
    flat(g, painted('clsTest', 160, 224, paintTest), 0.17, 0.235, sx, ty + 0.03, sz, -0.04);
    part(g, cyl(0.006, 0.006, 0.14, 8), '#e53935', sx - 0.02, ty + 0.035, sz + 0.07, { rz: Math.PI / 2, ry: 0.5, outline: false });
    const paper = marker(g, sx, ty + 0.03, sz);
    // The register and the class log at the back, the pen pot, the calendar, the mug.
    binder(g, sx + 0.02, ty, z - 0.17, '#1a3e72', '출석부', 0.05);
    binder(g, sx + 0.03, ty + 0.035, z - 0.18, '#2e7d32', '학급일지', -0.06);
    penPot(g, -w / 2 + 0.07, ty, z - 0.22);
    const cal = new THREE.Group();
    // Back behind the monitor's right, the phone having the desk's left.
    cal.position.set(0.16, ty, z - 0.24);
    cal.rotation.y = -0.2;
    g.add(cal);
    for (const s of [-1, 1]) part(cal, box(0.13, 0.11, 0.004), '#ffffff', 0, 0.05, s * 0.025, { rx: s * 0.45 });
    label(cal, '10월 학사일정', 0.11, 0.035, 0, 0.08, 0.05, '#ffffff', '#c62828').rotation.x = -0.45;
    part(g, cyl(0.04, 0.036, 0.09, 14), '#ffffff', -w / 2 + 0.1, ty + 0.045, z + 0.17);
    part(g, ring3(), '#ffffff', -w / 2 + 0.145, ty + 0.05, z + 0.17, { rz: Math.PI / 2, ry: Math.PI / 2, outline: false });
    label(g, '선생님 최고!', 0.07, 0.03, -w / 2 + 0.1, ty + 0.05, z + 0.211, '#ffffff', '#e91e63');
    // The swivel chair, pulled up to the front.
    const cz = front + 0.24;
    const ch = new THREE.Group();
    ch.position.set(0, 0, cz);
    ch.rotation.y = Math.PI;
    g.add(ch);
    swivelChair(ch, '#455a64');
    out.seat = marker(g, 0, 0.48, cz);
    out.work = paper;
    const typing = satAt(g, cz, 'type', kb);
    const talking = satAt(g, cz, 'meeting', paper);
    // Their own beats (teacherMotion.ts), on the same chair, with what they use shown only then.
    const mark = marker(g, 0, 0, 0);
    const record = satAt(g, cz, 'tcRecord', mark);
    const call = satAt(g, cz, 'tcCall', mark);
    // In front of the screen's box (its centre + half its 2 cm).
    deskWork(g, { record, call }, mark, out, adminScreen, { x: mx, y: ty + 0.3, z: mz + 0.012 + 0.0115 });
    out.spots = {
      '*': satAt(g, cz, 'write', paper),
      xwSchoolRecord: record,
      xwCallParent: call,
      planLesson: typing,
      teacher_schoolPlan: typing,
      teacher_reviewSchools: typing,
      teacher_officialDoc: typing,
      teacher_homeroom: talking,
      teacher_facultyMeeting: talking,
      teacher_districtPlan: talking,
      teacher_coachTeachers: talking,
    };
  },

  /**
   * A pupil's desk: a pale laminate top with a green edge on a grey steel frame, the book box under
   * it with textbooks in, a bag hung on the hook at the side, a notebook open (받아쓰기 and sums), a
   * pencil case and a name tag; its plywood chair on steel tubes in front, sat at by the pupil who
   * comes in. Homework's checked stood beside it, bent to the notebook, a 참 잘했어요 stamp left on it.
   */
  studentDesk(g, _W, D, _c, _def, _ctx, out) {
    const w = 0.64;
    const d = 0.44;
    const z = -0.1;
    const h = 0.64;
    const front = z + d / 2;
    const rand = Math.random;
    // The frame: four legs, side runners, the book box.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        part(g, rbox(0.03, h - 0.02, 0.03, 0.008), STEEL, sx * (w / 2 - 0.04), (h - 0.02) / 2, z + sz * (d / 2 - 0.04));
        part(g, cyl(0.018, 0.018, 0.015, 8), '#37474f', sx * (w / 2 - 0.04), 0.008, z + sz * (d / 2 - 0.04), { outline: false });
      }
      part(g, rbox(0.022, 0.022, d - 0.08, 0.006), STEEL, sx * (w / 2 - 0.04), 0.14, z);
    }
    part(g, rbox(w - 0.1, 0.012, d - 0.06, 0.004), STEEL, 0, h - 0.14, z);
    part(g, rbox(w - 0.1, 0.11, 0.012, 0.004), STEEL, 0, h - 0.085, z - d / 2 + 0.035);
    for (const sx of [-1, 1]) part(g, rbox(0.012, 0.11, d - 0.06, 0.004), STEEL, sx * (w / 2 - 0.055), h - 0.085, z);
    const bookCols = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc'];
    for (let i = 0; i < 4; i++) part(g, box(0.035, 0.09, 0.25), bookCols[(i + Math.floor(rand() * 5)) % 5], -0.18 + i * 0.045, h - 0.088, z - 0.02, { rz: (rand() - 0.5) * 0.15, outline: false });
    part(g, box(0.2, 0.03, 0.26), '#fff3e0', 0.1, h - 0.118, z - 0.02, { outline: false });
    // The top: laminate with its green PVC edge.
    part(g, rbox(w, 0.026, d, 0.006), '#66a982', 0, h, z);
    part(g, box(w - 0.016, 0.006, d - 0.016), '#efe2c8', 0, h + 0.012, z, { outline: false });
    const ty = h + 0.015;
    // The bag on the hook.
    const bagCol = ['#e57373', '#64b5f6', '#ffb74d', '#9575cd', '#4db6ac', '#f06292'][Math.floor(rand() * 6)];
    part(g, box(0.02, 0.02, 0.04), '#78909c', w / 2 + 0.01, h - 0.06, z + 0.05, { outline: false });
    const bag = new THREE.Group();
    bag.position.set(w / 2 + 0.07, h - 0.08, z + 0.05);
    bag.rotation.z = 0.05;
    g.add(bag);
    rod(bag, new THREE.Vector3(-0.06, -0.02, 0), new THREE.Vector3(-0.005, 0.03, 0), 0.006, shade(bagCol, 0.7));
    rod(bag, new THREE.Vector3(-0.005, 0.03, 0), new THREE.Vector3(0.03, -0.03, 0), 0.006, shade(bagCol, 0.7));
    part(bag, rbox(0.12, 0.26, 0.22, 0.05), bagCol, 0, -0.17, 0, { rz: Math.PI / 2 - 0.05, ry: Math.PI / 2 });
    part(bag, rbox(0.06, 0.12, 0.16, 0.03), tint(bagCol, 0.3), 0.06, -0.21, 0);
    part(bag, box(0.008, 0.008, 0.12), '#fafafa', 0.092, -0.17, 0, { outline: false });
    // On the top: the notebook open, the pencil case, a pencil, the name tag at the far edge.
    const nb = painted('clsNotebook', 256, 160, paintNotebook);
    part(g, box(0.3, 0.006, 0.19), ['#4fc3f7', '#aed581', '#ffb74d', '#f48fb1'][Math.floor(rand() * 4)], 0.04, ty + 0.003, z + 0.04, { ry: 0.08, outline: false });
    flat(g, nb, 0.29, 0.18, 0.04, ty + 0.0075, z + 0.04, 0.08);
    const pc = ['#ce93d8', '#80cbc4', '#ffcc80', '#90caf9'][Math.floor(rand() * 4)];
    part(g, rbox(0.2, 0.035, 0.065, 0.015), pc, -0.18, ty + 0.018, z - 0.13, { ry: 0.1 });
    part(g, box(0.18, 0.004, 0.006), shade(pc, 0.7), -0.18, ty + 0.036, z - 0.125, { ry: 0.1, outline: false });
    part(g, cyl(0.004, 0.004, 0.16, 6), '#fdd835', 0.22, ty + 0.005, z + 0.1, { rz: Math.PI / 2, ry: -0.6, outline: false });
    part(g, rbox(0.035, 0.012, 0.02, 0.004), '#f5f5f5', 0.24, ty + 0.006, z - 0.08, { outline: false });
    const names = ['김하늘', '오아린', '박서준', '최지아', '정예린', '한시우', '오하람', '서지민'];
    const tag = label(g, names[Math.floor(rand() * names.length)], 0.14, 0.035, 0.12, ty + 0.002, z - d / 2 + 0.04, '#fffde7', '#3e2723');
    tag.rotation.x = -Math.PI / 2;
    // The stamp pressed on the notebook while it's checked.
    const stamp = new THREE.Group();
    g.add(stamp);
    out.inUse = stamp;
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), new THREE.MeshBasicMaterial({ map: painted('clsStamp', 128, 128, paintStamp), transparent: true, depthWrite: false }));
    st.userData.ownGeometry = st.userData.ownMaterial = true;
    st.position.set(0.12, ty + 0.009, z + 0.06);
    st.rotation.set(-Math.PI / 2, 0, 0.3);
    stamp.add(st);
    const book = marker(g, 0.08, ty + 0.01, z + 0.04);
    out.work = book;
    // The chair, pulled up to the front, the pupil's seat.
    const cz = front + 0.12;
    const seatH = 0.4;
    const chair = new THREE.Group();
    chair.position.set(0, 0, Math.max(cz, D / 2 - 0.18));
    chair.rotation.y = Math.PI;
    g.add(chair);
    pupilChair(chair, seatH);
    out.seat = marker(g, 0, seatH + 0.015, chair.position.z);
    // Checking homework: stood at the side away from the bag, bent to the notebook.
    out.spots = { '*': stoodAt(g, -w / 2 - 0.2, z + 0.06, 'write', book, Math.PI / 2) };
  },

  /**
   * The 교탁: a wooden lectern at the front, its sloped top with the register (출석부) and an open
   * textbook on it, the pointer laid across and the little desk bell; the class plate on its front,
   * an open shelf on the teacher's side with the chalk box and books. The register's called stood
   * behind it, the book picked up off it and held open.
   */
  clsLectern(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.66;
    const d = 0.42;
    const z = 0.08;
    const wood = '#a1775a';
    const H = 0.98;
    // The carcass: two sides, the front panel, a plinth; open at the back with a shelf.
    for (const sx of [-1, 1]) part(g, rbox(0.03, H - 0.04, d, 0.01), wood, sx * (w / 2 - 0.015), (H - 0.04) / 2, z);
    part(g, rbox(w, 0.06, d + 0.02, 0.01), shade(wood, 0.7), 0, 0.03, z);
    part(g, rbox(w - 0.03, H - 0.1, 0.025, 0.01), wood, 0, (H - 0.1) / 2 + 0.05, z + d / 2 - 0.0125);
    part(g, rbox(w - 0.06, 0.02, d - 0.04, 0.006), shade(wood, 0.9), 0, 0.45, z);
    part(g, rbox(w - 0.03, 0.03, 0.025, 0.006), shade(wood, 0.85), 0, 0.2, z + d / 2 + 0.001);
    // On the shelf: books and the chalk box.
    for (let i = 0; i < 5; i++) part(g, box(0.035, 0.22, 0.17), ['#1565c0', '#ef6c00', '#2e7d32', '#6a1b9a', '#c62828'][i], -0.24 + i * 0.04, 0.57, z - 0.05, { outline: false });
    part(g, rbox(0.14, 0.06, 0.08, 0.008), '#ffffff', 0.15, 0.49, z - 0.06);
    // The class plate and a sticker of the school's emblem on the front.
    label(g, '3학년 2반', 0.26, 0.07, 0, 0.78, z + d / 2 + 0.002, '#fffde7', '#4e342e');
    part(g, cyl(0.06, 0.06, 0.006, 20), '#1565c0', 0, 0.58, z + d / 2 + 0.002, { rx: Math.PI / 2, outline: false });
    star3(g, 0, 0.58, z + d / 2 + 0.006);
    // The top: sloped down to the teacher's side, a lip to stop things sliding off.
    const top = new THREE.Group();
    top.position.set(0, H, z);
    top.rotation.x = -0.12;
    g.add(top);
    part(top, rbox(w + 0.04, 0.03, d + 0.06, 0.01), shade(wood, 1.1), 0, 0, 0);
    part(top, box(w + 0.02, 0.02, 0.015), shade(wood, 0.8), 0, 0.02, -(d + 0.06) / 2 + 0.01, { outline: false });
    // The textbook open, the pointer, the bell; the register (idle: picked up to call the names).
    const tb = painted('clsTextbook', 192, 128, (c) => {
      c.fillStyle = '#fffdf7';
      c.fillRect(0, 0, 192, 128);
      c.fillStyle = '#e0e0e0';
      c.fillRect(95, 0, 2, 128);
      text(c, '수학 3-2', 46, 14, 12, '#1565c0', 'center');
      text(c, '4. 분수', 46, 32, 11, '#37474f', 'center');
      pie(c, 46, 76, 24, 4, 3, '#ffcc80', '#5d4037');
      text(c, '익혀 봅시다', 144, 14, 11, '#2e7d32', 'center');
      c.fillStyle = '#cfd8dc';
      for (let i = 0; i < 7; i++) c.fillRect(104, 30 + i * 13, i % 3 === 2 ? 50 : 80, 4);
    });
    part(top, box(0.3, 0.012, 0.2), '#1565c0', 0.12, 0.021, 0.04, { outline: false });
    flat(top, tb, 0.29, 0.19, 0.12, 0.028, 0.04);
    part(top, cyl(0.006, 0.004, 0.6, 8), '#8d6e63', -0.02, 0.025, -0.13, { rz: Math.PI / 2, ry: 0.06, outline: false });
    part(top, ball(0.01), '#e53935', 0.28, 0.025, -0.12, { outline: false });
    part(top, cyl(0.035, 0.04, 0.012, 16), '#9e9e9e', -0.24, 0.022, 0.14, { outline: false });
    part(top, ball(0.03), '#cfd8dc', -0.24, 0.03, 0.14, { outline: false }).scale.set(1, 0.7, 1);
    part(top, ball(0.008), '#616161', -0.24, 0.056, 0.14, { outline: false });
    const register = new THREE.Group();
    top.add(register);
    out.idle = register;
    binder(register, -0.17, 0.015, -0.03, '#1a3e72', '출석부', 0.12);
    // Stood behind it facing the class, the register held open.
    out.work = marker(g, 0, H + 0.05, z);
    out.spots = { '*': stoodAt(g, 0, z - d / 2 - 0.2, 'read', out.work, 0) };
  },

  /**
   * The class TV: a big black screen on its wall bracket (on a rolling stand off a wall), the sound
   * bar under it, the power light; in use the lesson video's on — a maths show with a cartoon guide
   * and a pie shared out, the subtitle under it. Put on stood at its side turned out to the class,
   * pointing back at the screen.
   */
  clsClassTv(g, _W, D, _c, _def, ctx, out) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.03 : 0.25);
    const tw = 1.28;
    const th = 0.74;
    const y = wall ? 1.78 : 1.35;
    const tz = zb + (wall ? 0.1 : 0.03);
    if (wall) {
      part(g, rbox(0.4, 0.3, 0.02, 0.006), '#37474f', 0, y, zb + 0.01);
      for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.12, y + 0.08, zb + 0.02), new THREE.Vector3(sx * 0.12, y + 0.05, tz - 0.03), 0.012, '#455a64');
      // The cable run down the wall to the outlet.
      part(g, rbox(0.04, y - th / 2 - 0.3, 0.02, 0.006), '#eceff1', 0.4, (y - th / 2 - 0.3) / 2 + 0.3, zb + 0.01);
      part(g, rbox(0.09, 0.12, 0.02, 0.008), '#fafafa', 0.4, 0.3, zb + 0.012);
    } else {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.05, y, 0.05, 0.01), '#37474f', sx * 0.3, y / 2, zb);
        part(g, rbox(0.07, 0.04, 0.6, 0.01), '#37474f', sx * 0.3, 0.06, zb + 0.1);
        for (const dz of [-0.18, 0.38]) part(g, cyl(0.03, 0.03, 0.025, 10), '#2b2b30', sx * 0.3, 0.03, zb + dz, { rz: Math.PI / 2, outline: false });
      }
      part(g, rbox(0.66, 0.03, 0.3, 0.01), '#37474f', 0, 0.55, zb + 0.08);
    }
    const tilt = new THREE.Group();
    tilt.position.set(0, y, tz);
    tilt.rotation.x = wall ? 0.08 : 0;
    g.add(tilt);
    part(tilt, rbox(tw, th, 0.05, 0.012), '#1c1f24', 0, 0, 0);
    out.screen = litScreen(tilt, painted('clsVideo', 384, 216, paintVideo), tw - 0.05, th - 0.05, 0, 0.005, 0.017);
    part(tilt, ball(0.006), '#000000', 0, -th / 2 + 0.012, 0.027, { outline: false, material: glow('#ff5252') });
    // The sound bar under it.
    part(tilt, rbox(0.9, 0.07, 0.08, 0.02), '#2b2b30', 0, -th / 2 - 0.07, 0.01);
    part(tilt, box(0.86, 0.05, 0.004), '#455a64', 0, -th / 2 - 0.07, 0.052, { outline: false });
    // Put on stood off its right edge, turned out to the class, pointing back at the picture.
    const point = marker(tilt, -0.15, 0.05, 0.03);
    out.work = point;
    out.spots = { '*': stoodAt(g, tw / 2 + 0.18, zb + 0.6, 'present', point, -0.25) };
  },

  /**
   * The class notice board: cork in a wooden frame, a banner of cut-out letters (우리 반 이야기); the
   * week's timetable in subject colours, the praise-sticker chart, the class promises and the week's
   * lunches, the pupils' crayon drawings of what they want to be, push pins in it. A sticker's put on
   * stood at the chart, a gold star going on to a name.
   */
  clsNoticeBoard(g, W, D, _c, _def, ctx, out) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.03 : 0.2);
    const Wb = Math.min(W - 0.12, NB_W);
    const Hb = NB_H;
    const y = NB_Y;
    if (!wall) {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.05, y + Hb / 2 + 0.05, 0.05, 0.01), '#8d6e63', sx * (Wb / 2 + 0.05), (y + Hb / 2 + 0.05) / 2, zb);
        part(g, rbox(0.07, 0.04, 0.5, 0.01), '#8d6e63', sx * (Wb / 2 + 0.05), 0.02, zb);
      }
    }
    part(g, rbox(Wb + 0.08, Hb + 0.08, 0.04, 0.012), '#8d6e63', 0, y, zb);
    picture(g, painted('clsNotices', 1024, 552, paintNotices), Wb, Hb, 0, y, zb + 0.022, '#f2f2f2');
    // Push pins at the corners of what's pinned up.
    const X = (px: number) => -Wb / 2 + (px / 1024) * Wb;
    const Y = (py: number) => y + Hb / 2 - (py / 552) * Hb;
    const pins: Array<[number, number, string]> = [[30, 98, '#e53935'], [418, 98, '#1e88e5'], [372, 98, '#fdd835'], [870, 98, '#43a047'], [996, 98, '#e53935'], [776, 282, '#8e24aa'], [996, 282, '#fdd835'], [30, 446, '#1e88e5'], [176, 446, '#e53935'], [656, 446, '#43a047'], [806, 446, '#fdd835']];
    for (const [px, py, col] of pins) {
      part(g, cyl(0.012, 0.012, 0.012, 10), col, X(px), Y(py), zb + 0.03, { rx: Math.PI / 2, outline: false });
      part(g, cyl(0.006, 0.006, 0.014, 8), col, X(px), Y(py), zb + 0.042, { rx: Math.PI / 2, outline: false });
    }
    // The sticker going on: the next cell of the chart's row, a gold star.
    const cx = PR.x0 + PRAISE[PRAISE_ROW] * PR.cw + PR.cw / 2;
    const cy = PR.y0 + PRAISE_ROW * PR.rh + PR.rh / 2;
    const sticker = new THREE.Group();
    g.add(sticker);
    out.inUse = sticker;
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshBasicMaterial({ map: painted('clsSticker', 64, 64, paintSticker), transparent: true, depthWrite: false }));
    st.userData.ownGeometry = st.userData.ownMaterial = true;
    st.position.set(X(cx), Y(cy), zb + 0.028);
    sticker.add(st);
    out.animate = (t) => {
      // Pressed on and smoothed down: it grows in, then sits.
      const k = Math.min(1, ((t % 10) + 10) % 10 / 1.2);
      st.scale.setScalar(0.4 + 0.6 * k);
    };
    const slot = marker(g, X(cx), Y(cy), zb + 0.04);
    out.work = slot;
    // The 당번표's tags and the stance at them (teacherMotion.ts, in a frame at the board's wall side).
    const frame = new THREE.Group();
    frame.position.z = zb;
    g.add(frame);
    const mark = marker(frame, 0, 0, 0);
    const duty = stoodAt(frame, TC.DUTY_AT.x, TC.DUTY_AT.z, 'tcDuty', mark);
    dutyTags(frame, duty, mark, out, sticker);
    out.spots = { '*': stoodAt(g, X(cx) + 0.18, zb + 0.48, 'board', slot), xwClassDuty: duty };
  },

  /**
   * The pupils' lockers: a low steel unit of cubbies with doors in pastel colours, a name tag and a
   * key on each, two left open on a recorder, a 실내화 bag and books; on top a globe, the bean plants
   * the class is growing in their cups (강낭콩 관찰) and a box of skipping ropes.
   */
  clsLockers(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.08, 1.9);
    const d = 0.42;
    const zb = -D / 2 + 0.04;
    const z = zb + d / 2;
    const H = 0.98;
    const cols = 5;
    const rows = 3;
    part(g, rbox(w, 0.06, d, 0.01), '#78909c', 0, 0.03, z);
    part(g, rbox(w, H - 0.06, 0.02, 0.006), '#eceff1', 0, 0.06 + (H - 0.06) / 2, zb + 0.01);
    for (const sx of [-1, 1]) part(g, rbox(0.025, H - 0.06, d, 0.006), '#eceff1', sx * (w / 2 - 0.0125), 0.06 + (H - 0.06) / 2, z);
    part(g, rbox(w + 0.02, 0.025, d + 0.02, 0.008), '#cfd8dc', 0, H, z);
    const cw = (w - 0.025) / cols;
    const rh = (H - 0.08) / rows;
    for (let j = 1; j < rows; j++) part(g, box(w - 0.04, 0.012, d - 0.02), '#eceff1', 0, 0.06 + j * rh, z, { outline: false });
    for (let i = 1; i < cols; i++) part(g, box(0.012, H - 0.08, d - 0.02), '#eceff1', -w / 2 + 0.0125 + i * cw, 0.06 + (H - 0.08) / 2, z, { outline: false });
    const doorCols = ['#90caf9', '#a5d6a7', '#fff59d', '#f8bbd0', '#ce93d8'];
    const names = ['김민준', '이서연', '박지호', '윤수아', '권시우', '강도윤', '윤서아', '윤하린', '임하준', '한지유', '오시윤', '서예린', '신우진', '권나연', '황도현'];
    const open = new Set([6, 12]);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const n = j * cols + i;
        const x = -w / 2 + 0.0125 + (i + 0.5) * cw;
        const yy = 0.06 + (j + 0.5) * rh;
        const zf = zb + d;
        if (open.has(n)) {
          // Swung open on its left hinge, what's inside showing.
          const hinge = new THREE.Group();
          hinge.position.set(x - cw / 2 + 0.01, yy, zf);
          hinge.rotation.y = -1.9;
          g.add(hinge);
          part(hinge, rbox(cw - 0.02, rh - 0.02, 0.015, 0.006), doorCols[n % 5], (cw - 0.02) / 2, 0, 0);
          part(g, box(0.03, 0.03, d - 0.08), '#fafafa', x - 0.06, yy - rh / 2 + 0.03, z, { outline: false });
          if (n === 6) {
            part(g, cyl(0.012, 0.014, 0.3, 10), '#fff8e1', x + 0.04, yy - rh / 2 + 0.03, z + 0.02, { rx: Math.PI / 2, outline: false });
            part(g, rbox(0.12, 0.16, 0.05, 0.02), '#ffb74d', x - 0.02, yy - 0.04, z - 0.06);
          } else {
            for (let k = 0; k < 4; k++) part(g, box(0.03, 0.2, 0.24), bookCols[k], x - 0.1 + k * 0.035, yy - rh / 2 + 0.11, z - 0.02, { outline: false });
            part(g, rbox(0.1, 0.13, 0.04, 0.015), '#4db6ac', x + 0.08, yy - rh / 2 + 0.08, z + 0.06);
          }
          continue;
        }
        part(g, rbox(cw - 0.02, rh - 0.02, 0.015, 0.006), doorCols[(n + j) % 5], x, yy, zf);
        part(g, rbox(0.025, 0.035, 0.012, 0.004), '#9e9e9e', x + cw / 2 - 0.05, yy, zf + 0.012, { outline: false });
        part(g, ball(0.004), '#616161', x + cw / 2 - 0.05, yy - 0.01, zf + 0.019, { outline: false });
        label(g, names[n % names.length], cw - 0.1, 0.035, x - 0.02, yy + rh / 2 - 0.05, zf + 0.009, '#ffffff', '#37474f');
      }
    // On top: the globe, the bean plants in their cups, the skipping ropes.
    const ty = H + 0.013;
    part(g, cyl(0.06, 0.07, 0.02, 14), '#5d4037', -w / 2 + 0.2, ty + 0.01, z);
    rod(g, new THREE.Vector3(-w / 2 + 0.2, ty + 0.02, z), new THREE.Vector3(-w / 2 + 0.2, ty + 0.12, z), 0.008, '#5d4037');
    part(g, ball(0.12), '#42a5f5', -w / 2 + 0.2, ty + 0.25, z, { rz: 0.4 });
    for (const [dx, dy, dz] of [[0.04, 0.05, 0.1], [-0.07, -0.02, 0.09], [0.08, -0.05, 0.07], [-0.02, 0.08, 0.09]]) part(g, ball(0.045), '#7cb342', -w / 2 + 0.2 + dx, ty + 0.25 + dy, z + dz, { outline: false }).scale.set(1, 0.6, 0.35);
    part(g, rod3(), '#bdbdbd', -w / 2 + 0.2, ty + 0.25, z, { rz: 0.4, outline: false });
    for (let i = 0; i < 5; i++) {
      const x = -0.3 + i * 0.13;
      part(g, cyl(0.035, 0.028, 0.08, 12), '#fafafa', x, ty + 0.04, z + 0.05);
      part(g, cyl(0.032, 0.032, 0.006, 12), '#6d4c41', x, ty + 0.078, z + 0.05, { outline: false });
      const tall = 0.06 + i * 0.03;
      part(g, cyl(0.004, 0.004, tall, 6), '#7cb342', x, ty + 0.08 + tall / 2, z + 0.05, { outline: false });
      for (const s of [-1, 1]) part(g, ball(0.022), '#8bc34a', x + s * 0.02, ty + 0.08 + tall, z + 0.05, { outline: false }).scale.set(1, 0.3, 0.6);
      label(g, `${i + 1}모둠`, 0.06, 0.022, x, ty + 0.04, z + 0.086, '#ffffff', '#33691e');
    }
    label(g, '강낭콩 관찰', 0.2, 0.05, 0, ty + 0.025, zb + 0.035, '#fff9c4', '#33691e');
    part(g, rbox(0.3, 0.12, 0.22, 0.01), '#ef6c00', w / 2 - 0.26, ty + 0.06, z);
    for (let i = 0; i < 4; i++) {
      const col = ['#e53935', '#1e88e5', '#43a047', '#fdd835'][i];
      part(g, cyl(0.02, 0.02, 0.05, 8), col, w / 2 - 0.36 + i * 0.065, ty + 0.14, z + (i % 2 ? 0.04 : -0.04), { outline: false });
      part(g, ring3(), col, w / 2 - 0.36 + i * 0.065, ty + 0.12, z + 0.1, { rx: 0.4, outline: false });
    }
    label(g, '줄넘기', 0.14, 0.04, w / 2 - 0.26, ty + 0.06, z + 0.112, '#ffffff', '#e65100');
    out.work = marker(g, 0, 0.6, zb + d + 0.02);
  },

  /**
   * The cleaning corner: a grey steel 청소 도구함 with louvres, its door open on the brooms, the
   * mop, the dustpan and a bucket; beside it the recycling bins (일반 쓰레기, 종이, 플라스틱, 캔·병)
   * each in its colour with its label, the milk cartons rinsed and drying on a tray on top.
   */
  clsCleaningCorner(g, W, D, _c, _def, _ctx, out) {
    const zb = -D / 2 + 0.04;
    // The cupboard on the left.
    const cw = 0.7;
    const cd = 0.45;
    const ch = 1.75;
    const cx = -W / 2 + 0.06 + cw / 2;
    const cz = zb + cd / 2;
    const grey = '#b0bec5';
    part(g, rbox(cw, ch, 0.02, 0.006), grey, cx, ch / 2, zb + 0.01);
    for (const sx of [-1, 1]) part(g, rbox(0.02, ch, cd, 0.006), grey, cx + sx * (cw / 2 - 0.01), ch / 2, cz);
    part(g, rbox(cw, 0.03, cd, 0.006), grey, cx, ch, cz);
    part(g, rbox(cw, 0.06, cd, 0.006), shade(grey, 0.7), cx, 0.03, cz);
    part(g, box(cw - 0.04, 0.01, cd - 0.04), '#eceff1', cx, ch - 0.25, cz, { outline: false });
    // The closed right door with louvres, the open left one.
    const zf = zb + cd;
    part(g, rbox(cw / 2 - 0.01, ch - 0.1, 0.02, 0.006), grey, cx + cw / 4, ch / 2, zf);
    for (let i = 0; i < 6; i++) part(g, box(cw / 2 - 0.12, 0.012, 0.012), shade(grey, 0.7), cx + cw / 4, ch - 0.22 - i * 0.03, zf + 0.012, { outline: false });
    part(g, rbox(0.02, 0.12, 0.02, 0.006), '#607d8b', cx + 0.04, ch / 2, zf + 0.02);
    const hinge = new THREE.Group();
    hinge.position.set(cx - cw / 2 + 0.01, ch / 2, zf);
    hinge.rotation.y = -1.6;
    g.add(hinge);
    part(hinge, rbox(cw / 2 - 0.01, ch - 0.1, 0.02, 0.006), grey, cw / 4, 0, 0);
    for (let i = 0; i < 6; i++) part(hinge, box(cw / 2 - 0.12, 0.012, 0.012), shade(grey, 0.7), cw / 4, ch / 2 - 0.22 - i * 0.03, 0.012, { outline: false });
    label(g, '청소 도구함', 0.26, 0.06, cx + cw / 4, ch - 0.1, zf + 0.013, '#ffffff', '#37474f');
    // Inside: two brooms, the mop, the dustpan, the bucket.
    for (const [x, col] of [[-0.2, '#ef5350'], [-0.1, '#42a5f5']] as Array<[number, string]>) {
      rod(g, new THREE.Vector3(cx + x, 0.3, cz), new THREE.Vector3(cx + x + 0.03, 1.45, cz - 0.08), 0.012, col);
      part(g, rbox(0.2, 0.06, 0.05, 0.01), col, cx + x, 0.3, cz + 0.01);
      part(g, box(0.19, 0.18, 0.03), '#d7ccc8', cx + x, 0.18, cz + 0.01, { outline: false });
    }
    rod(g, new THREE.Vector3(cx + 0.06, 0.2, cz), new THREE.Vector3(cx + 0.09, 1.5, cz - 0.09), 0.013, '#9e9e9e');
    part(g, cyl(0.08, 0.04, 0.22, 10), '#eceff1', cx + 0.06, 0.17, cz, { outline: false });
    part(g, rbox(0.22, 0.04, 0.18, 0.01), '#fdd835', cx + 0.2, 0.62, cz + 0.03, { rx: -1.2 });
    rod(g, new THREE.Vector3(cx + 0.2, 0.72, cz - 0.05), new THREE.Vector3(cx + 0.2, 1.05, cz - 0.12), 0.01, '#fdd835');
    part(g, cyl(0.12, 0.1, 0.24, 16), '#42a5f5', cx + 0.15, 0.18, cz + 0.02);
    // The bins: what goes in each, in its colour.
    const bins: Array<[string, string]> = [['일반', '#78909c'], ['종이', '#1e88e5'], ['플라스틱', '#fdd835'], ['캔·병', '#43a047']];
    const bx0 = cx + cw / 2 + 0.06;
    const bw = (W / 2 - 0.05 - bx0) / bins.length;
    bins.forEach(([s, col], i) => {
      const x = bx0 + (i + 0.5) * bw;
      const bz = zb + 0.2;
      part(g, rbox(bw - 0.03, 0.56, 0.34, 0.03), col, x, 0.28, bz);
      part(g, rbox(bw - 0.02, 0.04, 0.36, 0.015), shade(col, 0.8), x, 0.58, bz);
      part(g, box(bw - 0.1, 0.01, 0.1), '#263238', x, 0.6, bz + 0.05, { outline: false });
      label(g, s, bw - 0.07, 0.07, x, 0.42, bz + 0.172, '#ffffff', shade(col, 0.7));
    });
    // The rinsed milk cartons drying on their tray on the paper bin.
    const mx = bx0 + 1.5 * bw;
    part(g, rbox(0.3, 0.02, 0.22, 0.006), '#eceff1', mx, 0.61, zb + 0.2);
    for (let i = 0; i < 6; i++) {
      const x = mx - 0.11 + (i % 3) * 0.11;
      const z = zb + 0.15 + Math.floor(i / 3) * 0.1;
      part(g, box(0.055, 0.1, 0.055), '#ffffff', x, 0.67, z, { outline: false, rz: i % 2 ? 0.05 : -0.04 });
      part(g, box(0.056, 0.03, 0.056), '#29b6f6', x, 0.66, z, { outline: false, rz: i % 2 ? 0.05 : -0.04 });
    }
    label(g, '우유갑은 씻어서!', 0.36, 0.06, mx, 0.95, zb + 0.005, '#fff9c4', '#e65100');
    out.work = marker(g, 0, 0.6, zb + 0.5);
  },

  /**
   * The 교육지원청's board of the district's schools (2026-11-04, the branch lots): a white magnetic board in an aluminium frame, the
   * schools down it with the 장학사 who has each, the next 컨설팅 visit and the 사안 open, a coloured magnet for where each stands;
   * the week's visits on a strip along the foot, a marker tray. In use a red magnet goes on a school's row, an urgent card beside it.
   * Stood at to one side, a hand out to the row.
   */
  edSchoolBoard(g, W, D, _c, _def, ctx, out) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.03 : 0.2);
    const Wb = Math.min(W - 0.14, 1.84);
    const Hb = 1.0;
    const y = 1.42;
    if (!wall) {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.05, y + Hb / 2 + 0.05, 0.05, 0.01), ALU, sx * (Wb / 2 + 0.05), (y + Hb / 2 + 0.05) / 2, zb);
        part(g, rbox(0.07, 0.04, 0.5, 0.01), ALU, sx * (Wb / 2 + 0.05), 0.02, zb);
      }
    }
    part(g, rbox(Wb + 0.06, Hb + 0.06, 0.035, 0.01), ALU, 0, y, zb);
    picture(g, painted('edSchools', 1024, 556, paintSchools), Wb, Hb, 0, y, zb + 0.02);
    // The marker tray along the foot, two markers and an eraser on it.
    part(g, rbox(Wb * 0.6, 0.025, 0.07, 0.008), ALU, 0, y - Hb / 2 - 0.03, zb + 0.04);
    part(g, cyl(0.009, 0.009, 0.13, 8), '#1e88e5', -0.2, y - Hb / 2 - 0.008, zb + 0.045, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.009, 0.009, 0.13, 8), '#e53935', -0.03, y - Hb / 2 - 0.008, zb + 0.05, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.12, 0.035, 0.05, 0.008), '#455a64', 0.2, y - Hb / 2, zb + 0.045);
    // Where each school stands: a magnet on its row in the 상태 column.
    const X = (px: number) => -Wb / 2 + (px / 1024) * Wb;
    const Y = (py: number) => y + Hb / 2 - (py / 556) * Hb;
    SCHOOLS.forEach(([, , , , col], i) => part(g, cyl(0.02, 0.02, 0.014, 12), col, X(948), Y(SCH_Y0 + i * SCH_ROW), zb + 0.028, { rx: Math.PI / 2, outline: false }));
    // In use: a red magnet on the row the report came from, an urgent card stuck beside it.
    const row = Y(SCH_Y0 + 2 * SCH_ROW);
    const use = new THREE.Group();
    g.add(use);
    part(use, cyl(0.024, 0.024, 0.016, 12), '#d32f2f', X(870), row, zb + 0.03, { rx: Math.PI / 2, outline: false });
    label(use, '긴급 · 사안 보고', 0.2, 0.05, X(870) - 0.17, row + 0.005, zb + 0.026, '#ffcdd2', '#b71c1c');
    out.inUse = use;
    const slot = marker(g, X(870), row, zb + 0.04);
    out.work = slot;
    out.spots = { '*': stoodAt(g, Wb / 2 - 0.15, zb + 0.5, 'board', slot, Math.PI - 0.35) };
  },
  /**
   * The school's fence and 정문 (2026-11-05, the layout audit; flat, walked over), drawn from the lot's south-west corner tile
   * (0, 14): a green mesh fence round the 운동장 on its two sides and along the street, the gateway open at x 11–13 between two
   * brick pillars, the school's name on the west one and the 어린이 보호구역 notice on the east, the sliding gate rolled back.
   */
  clsSchoolGate(g) {
    const at = (x: number, y: number) => new THREE.Vector3(x - 0.5, 0, y - 14.5);
    const H = 1.4;
    const run = (a: THREE.Vector3, b: THREE.Vector3) => {
      const len = a.distanceTo(b);
      const ry = Math.atan2(b.z - a.z, b.x - a.x);
      const mid = a.clone().lerp(b, 0.5);
      // The rails top and bottom, the mesh wires between, a post every 2 m.
      for (const y of [0.05, H]) part(g, box(len, 0.04, 0.04), '#2e7d32', mid.x, y, mid.z, { ry: -ry });
      for (let k = 1; k < 7; k++) part(g, box(len, 0.012, 0.012), '#66bb6a', mid.x, 0.05 + (k * (H - 0.05)) / 7, mid.z, { ry: -ry, outline: false });
      const n = Math.max(1, Math.round(len / 2));
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(b, i / n);
        part(g, box(0.06, H + 0.06, 0.06), '#1b5e20', p.x, (H + 0.06) / 2, p.z);
      }
    };
    run(at(0.05, 1.0), at(0.05, 14.95));
    run(at(0.05, 14.95), at(10.8, 14.95));
    run(at(14.2, 14.95), at(25.95, 14.95));
    run(at(25.95, 14.95), at(25.95, 1.0));
    // The pillars either side of the gateway, their caps.
    for (const x of [10.8, 14.2]) {
      const p = at(x, 14.95);
      part(g, rbox(0.42, 1.9, 0.42, 0.02), '#a1543c', p.x, 0.95, p.z);
      part(g, rbox(0.5, 0.08, 0.5, 0.02), '#d7ccc8', p.x, 1.94, p.z);
    }
    // The school's name, and the notice on the other pillar.
    const w = at(10.8, 14.95);
    part(g, rbox(0.34, 1.1, 0.03, 0.01), '#fafafa', w.x, 1.1, w.z + 0.225);
    label(g, '새솔초등학교', 0.3, 1.0, w.x, 1.1, w.z + 0.242, '#fafafa', '#1b3a5c');
    const e = at(14.2, 14.95);
    label(g, '어린이 보호구역', 0.36, 0.2, e.x, 1.35, e.z + 0.215, '#ffeb3b', '#c62828');
    label(g, '외부인 출입 시 지킴이실에 들러 주세요', 0.36, 0.16, e.x, 1.05, e.z + 0.215, '#ffffff', '#37474f');
    // The sliding gate rolled back along the fence east of the gateway, on its little wheels.
    const s = at(15.4, 14.8);
    part(g, box(2.0, 1.1, 0.03), '#9e9e9e', s.x, 0.65, s.z, { outline: false });
    for (let i = 0; i < 11; i++) part(g, box(0.025, 1.1, 0.035), '#757575', s.x - 0.95 + i * 0.19, 0.65, s.z);
    for (const dx of [-0.8, 0.8]) part(g, cyl(0.06, 0.06, 0.04, 10), '#424242', s.x + dx, 0.06, s.z, { rx: Math.PI / 2 });
  },
  /** The 배움터지킴이실 (2026-11-05, the layout audit): a small white cabin by the gate, its window on the gateway, the visitors' book on the sill. */
  clsGuardBooth(g) {
    const W = 0.9;
    const H = 2.2;
    part(g, rbox(W, H, W, 0.03), '#eceff1', 0, H / 2, 0);
    part(g, rbox(W + 0.12, 0.08, W + 0.12, 0.02), '#546e7a', 0, H + 0.04, 0);
    // The windows on the gateway side and the front, the door at the back.
    part(g, box(0.012, 0.6, 0.6), '#b3e5fc', -W / 2 - 0.006, 1.35, 0, { outline: false });
    part(g, box(0.6, 0.6, 0.012), '#b3e5fc', 0, 1.35, W / 2 + 0.006, { outline: false });
    part(g, box(0.4, 1.7, 0.012), '#90a4ae', 0.1, 0.85, -W / 2 - 0.006, { outline: false });
    // The sill with the visitors' book, the sign.
    part(g, box(0.16, 0.03, 0.7), '#b0bec5', -W / 2 - 0.08, 1.02, 0);
    part(g, box(0.12, 0.02, 0.18), '#1565c0', -W / 2 - 0.08, 1.045, 0.1, { outline: false });
    label(g, '배움터지킴이실', 0.7, 0.14, 0, H - 0.18, W / 2 + 0.014, '#1b3a5c', '#ffffff');
  },
  /** The 조회대 (2026-11-05, the layout audit): the low concrete platform at the head of the 운동장, its steps at the front, the microphone stand and the flag holders. */
  clsMorningStand(g, W) {
    const D = 0.9;
    const H = 0.6;
    part(g, rbox(W - 0.1, H, D, 0.02), '#bdbdbd', 0, H / 2, -0.04);
    part(g, box(W - 0.1, 0.03, D), '#9e9e9e', 0, H + 0.015, -0.04);
    for (let i = 0; i < 2; i++) part(g, box(0.8, H / 3, 0.18), '#cfcfcf', 0, (H / 3) * (i + 0.5), D / 2 - 0.04 + 0.09 + (1 - i) * 0.18);
    // The lectern with its microphone, the flag holders either side.
    part(g, rbox(0.4, 0.95, 0.3, 0.02), '#8d6e63', 0, H + 0.475, -0.2);
    part(g, cyl(0.008, 0.008, 0.3, 6), '#424242', 0, H + 1.1, -0.15, { rx: 0.4 });
    part(g, ball(0.025), '#212121', 0, H + 1.24, -0.09);
    for (const sx of [-1, 1]) part(g, cyl(0.03, 0.03, 0.3, 8), '#9e9e9e', sx * (W / 2 - 0.25), H + 0.15, -0.3);
    label(g, '조회대', 0.5, 0.12, 0, H * 0.85, D / 2 - 0.035, '#9e9e9e', '#ffffff');
  },
};

/** The district's schools on the 현황판: school, 장학사, next visit, 사안, the magnet's colour (all made up). */
const SCHOOLS: Array<[string, string, string, string, string]> = [
  ['새솔초등학교', '김장학', '11.6 컨설팅', '-', '#43a047'],
  ['한빛초등학교', '김장학', '11.12 수업 나눔', '-', '#43a047'],
  ['솔내중학교', '이장학', '11.8 컨설팅', '학폭 1건 처리 중', '#fb8c00'],
  ['푸른숲중학교', '이장학', '11.14 학교 평가', '-', '#43a047'],
  ['새솔고등학교', '박장학', '11.7 교육과정', '시설 안전 점검', '#fdd835'],
  ['가람초등학교', '박장학', '11.19 컨설팅', '-', '#43a047'],
];
const SCH_Y0 = 150;
const SCH_ROW = 56;
const paintSchools: Paint = (c) => {
  c.fillStyle = '#fbfcfd';
  c.fillRect(0, 0, 1024, 556);
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 1024, 70);
  text(c, '새솔교육지원청 관내 학교 현황', 512, 37, 36, '#ffffff', 'center');
  const cols: Array<[string, number]> = [['학교', 40], ['담당', 330], ['다음 방문', 470], ['사안', 690], ['상태', 920]];
  for (const [s, x] of cols) text(c, s, x, 104, 24, '#455a64');
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(24, 124);
  c.lineTo(1000, 124);
  c.stroke();
  SCHOOLS.forEach(([school, who, visit, issue], i) => {
    const ry = SCH_Y0 + i * SCH_ROW;
    if (i % 2) {
      c.fillStyle = '#eef3f7';
      c.fillRect(24, ry - SCH_ROW / 2, 976, SCH_ROW);
    }
    text(c, school, 40, ry, 26, '#263238');
    text(c, who, 330, ry, 24, '#37474f', 'left', false);
    text(c, visit, 470, ry, 24, '#1565c0', 'left', false);
    text(c, issue, 690, ry, 22, issue === '-' ? '#90a4ae' : '#c62828', 'left', issue !== '-');
  });
  c.fillStyle = '#fff8e1';
  c.fillRect(24, 498, 976, 46);
  text(c, '이번 주 찾아가는 컨설팅: 월 새솔초 · 수 솔내중 · 목 새솔고   |   교장·교감 협의회 금 14:00', 40, 521, 22, '#6d4c41', 'left', false);
};

const bookCols = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28'];
/** A mug's handle; a jump rope's loop. */
function ring3(): THREE.BufferGeometry {
  return ringGeom ?? (ringGeom = new THREE.TorusGeometry(0.03, 0.008, 6, 14));
}
let ringGeom: THREE.BufferGeometry | undefined;
/** The globe's axis. */
function rod3(): THREE.BufferGeometry {
  return cyl(0.004, 0.004, 0.3, 6);
}
/** A little white star on the school's emblem. */
function star3(g: THREE.Object3D, x: number, y: number, z: number) {
  for (let i = 0; i < 5; i++) part(g, box(0.012, 0.05, 0.004), '#ffffff', x, y, z, { rz: (i / 5) * Math.PI, outline: false });
}
