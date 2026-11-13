import * as THREE from 'three';
import { marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';

/**
 * The big company's office drawn as itself (2026-10-26 workplace pipeline, at the user's request):
 * the open-plan desks behind their low partitions, the multifunction copier, the whiteboard and the
 * meeting room's projector redone — pieces most offices in the game share, so they stay any office's
 * — and what the floor was missing: a conference table with its mesh chairs, a supply cabinet with
 * the shredder, the water purifier and the lobby's reception desk under the company's name. Each use
 * puts the worker where it's done: sat typing at the desk, tapping the copier's panel, stood beside
 * the board or the screen turned out to the room presenting, round the board or the table with a
 * notebook at a meeting, feeding the shredder.
 */

const BLACK = '#26282d';
const CHROME = '#dfe4e8';
const ALU = '#c3c9ce';
const NAVY = '#1f3556';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

/** Lit parts (LEDs, lamps): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

/** See-through parts: cabinet glass, the purifier's cup tube, the projector's beam. */
const GLASS = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.32, depthWrite: false });
const CLEAR = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.5, depthWrite: false });
const BEAM = new THREE.MeshBasicMaterial({ color: '#fff8e1', transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));

/** Pictures painted once a key (screens, the board, labels). */
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

/** An office chair on a five-star base, its seat `h` up, facing +z in its own group; `mesh` gives it a mesh back. */
function officeChair(c: THREE.Object3D, h: number, color: string, mesh = false) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, BLACK);
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.024, 0.024, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, h + 0.02, 0);
  if (mesh) {
    // A frame round a lighter mesh, curved a little to the back, a lumbar bar across it.
    part(c, rbox(0.44, 0.52, 0.035, 0.03), BLACK, 0, h + 0.36, -0.22, { rx: -0.1 });
    part(c, box(0.38, 0.46, 0.01), tint(color, 0.25), 0, h + 0.36, -0.2, { rx: -0.1, outline: false });
    part(c, rbox(0.36, 0.05, 0.025, 0.012), BLACK, 0, h + 0.22, -0.19, { outline: false });
    part(c, rbox(0.04, 0.2, 0.04, 0.01), BLACK, 0, h + 0.1, -0.22, { outline: false });
  } else {
    part(c, rbox(0.42, 0.46, 0.06, 0.04), color, 0, h + 0.33, -0.21, { rx: -0.08 });
  }
  for (const sx of [-1, 1]) {
    part(c, rbox(0.05, 0.03, 0.22, 0.012), BLACK, sx * 0.25, h + 0.2, -0.01);
    part(c, rbox(0.03, 0.18, 0.03, 0.008), BLACK, sx * 0.25, h + 0.1, -0.06, { outline: false });
  }
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

/** A desk monitor on its stand, facing +z. */
function monitor(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  part(m, rbox(0.18, 0.012, 0.12, 0.004), BLACK, 0, 0.006, 0);
  part(m, rbox(0.035, h * 0.55, 0.025, 0.008), BLACK, 0, h * 0.3, -0.02);
  part(m, rbox(w, h, 0.025, 0.008), BLACK, 0, h * 0.5 + 0.1, 0);
  return m;
}

/** A keyboard and mouse at (x, z) on a top at `y`. */
function keyboard(g: THREE.Object3D, x: number, y: number, z: number, w = 0.34) {
  part(g, rbox(w, 0.018, 0.12, 0.006), '#e4e6e8', x, y + 0.009, z);
  part(g, box(w - 0.03, 0.004, 0.095), '#b7bcc2', x, y + 0.02, z, { outline: false });
  part(g, rbox(0.055, 0.022, 0.09, 0.012), '#e4e6e8', x + w / 2 + 0.09, y + 0.011, z);
}

/** A sheet of A4 (with lines of print) lying on a top at `y`. */
function paperOn(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, lines = 6) {
  part(g, box(0.21, 0.003, 0.29), '#ffffff', x, y + 0.002, z, { ry, outline: false });
  const p = new THREE.Group();
  p.position.set(x, y + 0.004, z);
  p.rotation.y = ry;
  g.add(p);
  for (let i = 0; i < lines; i++) part(p, box(i === 0 ? 0.1 : 0.16, 0.002, 0.006), i === 0 ? '#37474f' : '#9e9e9e', i === 0 ? -0.03 : 0, 0, -0.11 + i * 0.035, { outline: false });
}

/** A white mug with the company's navy band. */
function mug(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.035, 0.03, 0.09, 12), '#ffffff', x, y + 0.045, z);
  part(g, cyl(0.0355, 0.0355, 0.02, 12), NAVY, x, y + 0.06, z, { outline: false });
  part(g, ring(0.025, 0.007, Math.PI), '#ffffff', x + 0.04, y + 0.05, z, { rz: -Math.PI / 2, outline: false });
  part(g, cyl(0.03, 0.03, 0.004, 12), '#5d4037', x, y + 0.087, z, { outline: false });
}

/** A ballpoint pen lying on a top. */
function pen(g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#1a237e') {
  part(g, cyl(0.005, 0.005, 0.13, 6), color, x, y + 0.006, z, { rz: Math.PI / 2, ry, outline: false });
}

/** The open-plan desk's spreadsheet: a quarter's figures, a selected cell and a chart. */
const sheetTex = () =>
  painted('officeSheet', 192, 112, (x2) => {
    x2.fillStyle = '#ffffff';
    x2.fillRect(0, 0, 192, 112);
    x2.fillStyle = '#217346';
    x2.fillRect(0, 0, 192, 14);
    x2.fillStyle = '#fff';
    x2.font = `bold 9px ${FONT}`;
    x2.fillText('3분기_업무보고.xlsx', 5, 10);
    x2.strokeStyle = '#d0d7de';
    x2.lineWidth = 1;
    for (let r = 0; r <= 8; r++) {
      x2.beginPath();
      x2.moveTo(0, 18 + r * 10);
      x2.lineTo(110, 18 + r * 10);
      x2.stroke();
    }
    for (const c of [0, 30, 55, 80, 110]) {
      x2.beginPath();
      x2.moveTo(c, 18);
      x2.lineTo(c, 98);
      x2.stroke();
    }
    x2.fillStyle = '#e8f1ea';
    x2.fillRect(1, 19, 109, 9);
    x2.font = `8px ${FONT}`;
    x2.fillStyle = '#263238';
    const heads = ['항목', '7월', '8월', '9월'];
    heads.forEach((h, i) => x2.fillText(h, [3, 33, 58, 83][i], 26));
    const rows = ['매출', '원가', '인건비', '마케팅', '기타', '합계', '전년비'];
    rows.forEach((r, i) => {
      x2.fillText(r, 3, 36 + i * 10);
      for (let c = 0; c < 3; c++) x2.fillText(String(((i + 2) * 37 + c * 13) % 90 + 10), [33, 58, 83][c], 36 + i * 10);
    });
    x2.strokeStyle = '#217346';
    x2.lineWidth = 2;
    x2.strokeRect(55, 68, 25, 10);
    // The chart beside it.
    x2.fillStyle = '#f5f7f9';
    x2.fillRect(116, 20, 72, 78);
    const bars = [24, 34, 30, 46, 52];
    bars.forEach((h, i) => {
      x2.fillStyle = i === 4 ? '#ef6c00' : '#42a5f5';
      x2.fillRect(122 + i * 13, 92 - h, 9, h);
    });
    x2.strokeStyle = '#c62828';
    x2.lineWidth = 1.5;
    x2.beginPath();
    x2.moveTo(124, 64);
    x2.lineTo(150, 56);
    x2.lineTo(178, 36);
    x2.stroke();
    x2.fillStyle = '#90a4ae';
    x2.fillRect(0, 102, 192, 10);
  });

/** A month's calendar pinned to the partition. */
const calendarTex = () =>
  painted('deskCalendar', 64, 72, (x2) => {
    x2.fillStyle = '#ffffff';
    x2.fillRect(0, 0, 64, 72);
    x2.fillStyle = '#c62828';
    x2.fillRect(0, 0, 64, 16);
    x2.fillStyle = '#fff';
    x2.font = `bold 11px ${FONT}`;
    x2.textAlign = 'center';
    x2.fillText('10월', 32, 12);
    for (let i = 0; i < 30; i++) {
      x2.fillStyle = i % 7 === 0 ? '#e57373' : '#90a4ae';
      x2.fillRect(4 + (i % 7) * 8.3, 22 + Math.floor(i / 7) * 10, 5, 5);
    }
    x2.strokeStyle = '#c62828';
    x2.lineWidth = 1.5;
    x2.beginPath();
    x2.arc(4 + 4 * 8.3 + 2.5, 22 + 3 * 10 + 2.5, 5, 0, Math.PI * 2);
    x2.stroke();
  });

/** The copier's touch panel: the copy screen with its count and the green start. */
const copierTex = () =>
  painted('copierPanel', 128, 72, (x2) => {
    x2.fillStyle = '#e3eef8';
    x2.fillRect(0, 0, 128, 72);
    x2.fillStyle = '#1565c0';
    x2.fillRect(0, 0, 128, 14);
    x2.fillStyle = '#fff';
    x2.font = `bold 10px ${FONT}`;
    x2.fillText('복사', 6, 11);
    x2.fillText('준비 완료', 76, 11);
    x2.fillStyle = '#263238';
    x2.font = `bold 20px ${FONT}`;
    x2.fillText('100 매', 8, 40);
    x2.font = `9px ${FONT}`;
    for (const [i, t] of ['흑백', '양면', 'A4'].entries()) {
      x2.fillStyle = '#ffffff';
      x2.fillRect(6 + i * 30, 50, 26, 15);
      x2.fillStyle = '#37474f';
      x2.fillText(t, 10 + i * 30, 61);
    }
    x2.fillStyle = '#43a047';
    x2.fillRect(98, 46, 26, 22);
    x2.fillStyle = '#fff';
    x2.font = `bold 9px ${FONT}`;
    x2.fillText('시작', 102, 60);
  });

/**
 * The whiteboard after a meeting: the week's goals ticked off, a flow from plan to review, a rough
 * chart going up and the four weeks' timeline, in blue, black and red marker — any office's.
 */
const boardTex = () =>
  painted('meetingBoard', 512, 300, (x2) => {
    x2.fillStyle = '#fbfcfd';
    x2.fillRect(0, 0, 512, 300);
    // Old marker not quite wiped.
    x2.fillStyle = 'rgba(120,140,170,0.07)';
    x2.fillRect(300, 190, 160, 60);
    x2.lineCap = 'round';
    x2.lineJoin = 'round';
    const blue = '#1a3c9e';
    const red = '#c62828';
    const ink = '#212121';
    x2.fillStyle = blue;
    x2.font = `bold 34px ${FONT}`;
    x2.fillText('주간 회의', 22, 46);
    x2.strokeStyle = blue;
    x2.lineWidth = 3;
    x2.beginPath();
    x2.moveTo(20, 56);
    x2.quadraticCurveTo(110, 62, 190, 54);
    x2.stroke();
    x2.font = `22px ${FONT}`;
    x2.fillStyle = ink;
    x2.fillText('이번 주 목표', 24, 92);
    const goals = ['① 일정 확정', '② 자료 정리', '③ 역할 분담'];
    goals.forEach((t, i) => {
      x2.fillStyle = ink;
      x2.fillText(t, 34, 124 + i * 30);
      if (i < 2) {
        x2.strokeStyle = red;
        x2.lineWidth = 3.5;
        x2.beginPath();
        x2.moveTo(170, 116 + i * 30);
        x2.lineTo(178, 124 + i * 30);
        x2.lineTo(194, 104 + i * 30);
        x2.stroke();
      }
    });
    // A flow: three boxes and arrows.
    x2.strokeStyle = ink;
    x2.lineWidth = 2.5;
    x2.font = `bold 19px ${FONT}`;
    ['기획', '실행', '점검'].forEach((t, i) => {
      const bx = 240 + i * 90;
      x2.strokeRect(bx, 30, 64, 38);
      x2.fillStyle = ink;
      x2.fillText(t, bx + 13, 56);
      if (i < 2) {
        x2.beginPath();
        x2.moveTo(bx + 68, 49);
        x2.lineTo(bx + 86, 49);
        x2.moveTo(bx + 79, 43);
        x2.lineTo(bx + 86, 49);
        x2.lineTo(bx + 79, 55);
        x2.stroke();
      }
    });
    // A rough chart going up.
    x2.strokeStyle = ink;
    x2.beginPath();
    x2.moveTo(250, 100);
    x2.lineTo(250, 190);
    x2.lineTo(420, 190);
    x2.stroke();
    x2.strokeStyle = blue;
    x2.lineWidth = 3;
    [38, 52, 46, 70].forEach((h, i) => x2.strokeRect(266 + i * 36, 190 - h, 20, h));
    x2.strokeStyle = red;
    x2.lineWidth = 3.5;
    x2.beginPath();
    x2.moveTo(262, 160);
    x2.lineTo(330, 140);
    x2.lineTo(410, 106);
    x2.moveTo(396, 104);
    x2.lineTo(410, 106);
    x2.lineTo(404, 119);
    x2.stroke();
    x2.fillStyle = red;
    x2.font = `bold 20px ${FONT}`;
    x2.fillText('+15%', 430, 116);
    // The four weeks.
    x2.strokeStyle = ink;
    x2.lineWidth = 2.5;
    x2.beginPath();
    x2.moveTo(30, 250);
    x2.lineTo(480, 250);
    x2.stroke();
    x2.font = `17px ${FONT}`;
    for (let i = 0; i < 4; i++) {
      const tx = 50 + i * 115;
      x2.beginPath();
      x2.moveTo(tx, 243);
      x2.lineTo(tx, 257);
      x2.stroke();
      x2.fillStyle = ink;
      x2.fillText(`${i + 1}주`, tx - 10, 280);
    }
    x2.strokeStyle = red;
    x2.lineWidth = 3;
    x2.beginPath();
    x2.arc(395, 250, 13, 0, Math.PI * 2);
    x2.stroke();
    x2.fillStyle = red;
    x2.font = `bold 16px ${FONT}`;
    x2.fillText('마감!', 412, 238);
  });

/** The strategy slide on the meeting room's screen. */
const slideTex = () =>
  painted('strategySlide', 320, 200, (x2) => {
    x2.fillStyle = '#ffffff';
    x2.fillRect(0, 0, 320, 200);
    x2.fillStyle = NAVY;
    x2.fillRect(0, 0, 320, 34);
    x2.fillStyle = '#ffb300';
    x2.fillRect(0, 34, 320, 3);
    x2.fillStyle = '#fff';
    x2.font = `bold 17px ${FONT}`;
    x2.fillText('2026 하반기 사업 전략', 14, 23);
    // Bars growing, the last one picked out, and the trend.
    x2.strokeStyle = '#90a4ae';
    x2.lineWidth = 1;
    x2.beginPath();
    x2.moveTo(20, 60);
    x2.lineTo(20, 168);
    x2.lineTo(160, 168);
    x2.stroke();
    [34, 48, 58, 76, 98].forEach((h, i) => {
      x2.fillStyle = i === 4 ? '#ef6c00' : '#5c8fd6';
      x2.fillRect(30 + i * 26, 168 - h, 18, h);
    });
    x2.strokeStyle = '#c62828';
    x2.lineWidth = 2.5;
    x2.beginPath();
    x2.moveTo(36, 126);
    x2.lineTo(92, 104);
    x2.lineTo(146, 64);
    x2.stroke();
    x2.font = `9px ${FONT}`;
    x2.fillStyle = '#607d8b';
    ['22', '23', '24', '25', '26'].forEach((y, i) => x2.fillText(`'${y}`, 32 + i * 26, 180));
    // The points.
    x2.fillStyle = '#263238';
    x2.font = `bold 12px ${FONT}`;
    const pts = ['시장 점유율 15% 확대', '신규 거래처 20곳', '원가 8% 절감', '해외 법인 설립'];
    pts.forEach((t, i) => {
      x2.fillStyle = '#ffb300';
      x2.fillRect(178, 62 + i * 28, 6, 6);
      x2.fillStyle = '#263238';
      x2.fillText(t, 190, 69 + i * 28);
    });
    x2.fillStyle = '#eceff1';
    x2.fillRect(0, 186, 320, 14);
    x2.fillStyle = '#78909c';
    x2.font = `9px ${FONT}`;
    x2.fillText('한결그룹 전략기획팀', 10, 196);
    x2.fillText('3 / 12', 284, 196);
  });

/** The company's name on the lobby wall: the mark and the name. */
const logoTex = () =>
  painted('hangyeolLogo', 512, 192, (x2) => {
    x2.clearRect(0, 0, 512, 192);
    // The mark: a ring with a sweep through it.
    x2.strokeStyle = '#ffb300';
    x2.lineWidth = 14;
    x2.beginPath();
    x2.arc(96, 96, 56, 0.3, Math.PI * 2 - 0.3);
    x2.stroke();
    x2.strokeStyle = '#ffffff';
    x2.lineWidth = 12;
    x2.beginPath();
    x2.moveTo(52, 118);
    x2.quadraticCurveTo(96, 54, 160, 84);
    x2.stroke();
    x2.fillStyle = '#ffffff';
    x2.font = `bold 72px ${FONT}`;
    x2.textBaseline = 'middle';
    x2.fillText('한결그룹', 184, 84);
    x2.font = `bold 24px ${FONT}`;
    x2.fillStyle = '#cfd8dc';
    x2.fillText('H A N G Y E O L   G R O U P', 188, 146);
  });

/** The visitor sign-in tablet on the reception counter. */
const visitorTex = () =>
  painted('visitorPad', 72, 96, (x2) => {
    x2.fillStyle = '#ffffff';
    x2.fillRect(0, 0, 72, 96);
    x2.fillStyle = NAVY;
    x2.fillRect(0, 0, 72, 18);
    x2.fillStyle = '#fff';
    x2.font = `bold 10px ${FONT}`;
    x2.fillText('방문객 등록', 8, 13);
    x2.font = `8px ${FONT}`;
    for (const [i, t] of ['성함', '소속', '방문 부서'].entries()) {
      x2.fillStyle = '#607d8b';
      x2.fillText(t, 6, 32 + i * 18);
      x2.strokeStyle = '#b0bec5';
      x2.strokeRect(6, 35 + i * 18, 60, 8);
    }
    x2.fillStyle = '#ffb300';
    x2.fillRect(14, 82, 44, 10);
  });

/** A frustum of light from a lens (w0 × h0 at z0) to a picture (w1 × h1 at z1, centred `dy` lower), as one shape. */
function beamGeom(w0: number, h0: number, z0: number, w1: number, h1: number, z1: number, dy: number): THREE.BufferGeometry {
  return shape(`beam${w0},${h0},${z0},${w1},${h1},${z1},${dy}`, () => {
    const a = [
      [-w0 / 2, -h0 / 2, z0],
      [w0 / 2, -h0 / 2, z0],
      [w0 / 2, h0 / 2, z0],
      [-w0 / 2, h0 / 2, z0],
    ];
    const b = [
      [-w1 / 2, -h1 / 2 - dy, z1],
      [w1 / 2, -h1 / 2 - dy, z1],
      [w1 / 2, h1 / 2 - dy, z1],
      [-w1 / 2, h1 / 2 - dy, z1],
    ];
    const pos: number[] = [];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      pos.push(...a[i], ...b[i], ...b[j], ...a[i], ...b[j], ...a[j]);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return geom;
  });
}

/** Whether a use at a desk is reading (a manual, the law) or going over papers with a pen, rather than typing. */
const READS = /onboarding|manual|study|learn|read/i;
const PAPERS = /check|audit|securityPlan|ownDuty|review|inspect/i;

export const BUILDERS: Record<string, Builder> = {
  /**
   * The open-plan desk: a white laminate top on grey steel legs with a low navy partition at the back
   * (a month's calendar and sticky notes pinned to it), a rolling drawer pedestal; on it a monitor
   * with the quarter's spreadsheet (lit in use), keyboard and mouse, a page with a pen, an in-tray,
   * the company mug, a pen pot and a little cactus; a black office chair pulled up. Sat in it to type
   * up reports and crunch numbers (any office's work: a policy draft, a research report), to read
   * through a manual, or to go over a checklist with the pen.
   */
  officeDesk(g, W, D, _c, def, _ctx, out) {
    const w = Math.min(W - 0.04, 1.4);
    const h = 0.73;
    const d = Math.min(D - 0.36, 0.64);
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const leg = '#5f6670';
    part(g, rbox(w, 0.03, d, 0.01), '#eeece6', 0, h, z);
    part(g, box(w, 0.012, 0.012), '#9aa0a6', 0, h - 0.006, front, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.05, h - 0.03, 0.05, 0.01), leg, sx * (w / 2 - 0.05), (h - 0.03) / 2, z);
      part(g, rbox(0.06, 0.03, d - 0.04, 0.01), leg, sx * (w / 2 - 0.05), 0.015, z);
      part(g, rbox(0.04, 0.03, d - 0.08, 0.01), leg, sx * (w / 2 - 0.05), h - 0.04, z, { outline: false });
    }
    part(g, rbox(w - 0.12, 0.3, 0.012, 0.004), shade(leg, 1.25), 0, 0.5, z - d / 2 + 0.05);
    // The rolling pedestal under the right side.
    const px = w / 2 - 0.26;
    part(g, rbox(0.38, 0.52, d - 0.12, 0.012), '#d5d8dc', px, 0.31, z - 0.02);
    for (let i = 0; i < 3; i++) {
      const y = 0.17 + i * 0.165;
      part(g, rbox(0.36, 0.15, 0.012, 0.005), '#e3e6e9', px, y, z - 0.02 + (d - 0.12) / 2 + 0.004);
      part(g, rbox(0.1, 0.014, 0.018, 0.005), '#7d858c', px, y + 0.045, z - 0.02 + (d - 0.12) / 2 + 0.012, { outline: false });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, ball(0.022), BLACK, px + sx * 0.15, 0.022, z - 0.02 + sz * (d / 2 - 0.12), { outline: false });
    // The low partition at the back, its aluminium cap, what's pinned to it.
    const pz = z - d / 2 + 0.018;
    const ph = 0.4;
    part(g, rbox(w, ph, 0.03, 0.01), '#4f6079', 0, h + 0.015 + ph / 2, pz);
    part(g, rbox(w + 0.01, 0.022, 0.04, 0.008), ALU, 0, h + 0.015 + ph + 0.01, pz);
    sheet(g, calendarTex(), 0.13, 0.15, w / 2 - 0.14, h + 0.25, pz + 0.017, 0.03);
    const notes: Array<[number, number, string, number]> = [[-w / 2 + 0.1, h + 0.33, '#fff176', 0.08], [-w / 2 + 0.2, h + 0.36, '#f8bbd0', -0.06], [w / 2 - 0.31, h + 0.31, '#c5e1a5', 0.1]];
    for (const [x, y, col, rz] of notes) part(g, box(0.07, 0.07, 0.004), col, x, y, pz + 0.018, { rz, outline: false });
    const ty = h + 0.015;
    // The monitor with the spreadsheet.
    const mx = -0.08;
    const mon = monitor(g, mx, ty, z - 0.13, 0.52, 0.31);
    out.screen = screenOf(mon, sheetTex(), 0.49, 0.28, 0, 0.255, 0.014);
    const kb = marker(g, mx - 0.02, ty + 0.03, z + 0.13);
    keyboard(g, mx - 0.02, ty, z + 0.13);
    // A page and a pen on the right, the in-tray behind it.
    const ppx = Math.min(w / 2 - 0.15, 0.34);
    paperOn(g, ppx, ty, z + 0.1, -0.12);
    pen(g, ppx + 0.04, ty, z + 0.17, 0.7);
    const paper = marker(g, ppx, ty + 0.01, z + 0.1);
    const trayX = Math.min(w / 2 - 0.15, 0.33);
    for (let i = 0; i < 2; i++) {
      part(g, rbox(0.25, 0.012, 0.2, 0.004), '#455a64', trayX, ty + 0.01 + i * 0.07, z - 0.17);
      part(g, box(0.21, 0.012, 0.16), '#ffffff', trayX, ty + 0.025 + i * 0.07, z - 0.17, { outline: false });
    }
    for (const sx of [-1, 1]) part(g, rbox(0.012, 0.15, 0.012, 0.004), '#455a64', trayX + sx * 0.12, ty + 0.075, z - 0.09, { outline: false });
    // The mug, the pen pot and the cactus on the left.
    const lx = -w / 2 + 0.09;
    mug(g, lx, ty, z + 0.12);
    part(g, cyl(0.035, 0.035, 0.1, 12), '#37474f', lx, ty + 0.05, z - 0.08);
    for (const [dx, col] of [[-0.012, '#1a237e'], [0.012, '#c62828'], [0, '#212121']] as Array<[number, string]>) part(g, cyl(0.005, 0.005, 0.15, 6), col, lx + dx, ty + 0.11, z - 0.08 + dx, { rz: dx * 8, outline: false });
    part(g, cyl(0.04, 0.032, 0.06, 12), '#d7a27a', lx + 0.02, ty + 0.03, z - 0.21);
    part(g, rbox(0.04, 0.09, 0.04, 0.02), '#689f38', lx + 0.02, ty + 0.1, z - 0.21);
    // The chair, pulled up to the front.
    const ch = new THREE.Group();
    const cz = front + 0.24;
    ch.position.set(0, 0, cz);
    ch.rotation.y = Math.PI;
    g.add(ch);
    officeChair(ch, 0.44, '#2f3640', true);
    out.seat = marker(g, 0, 0.48, cz);
    out.work = kb;
    // Each use of it: reading, going over papers, or (everything else) at the keyboard.
    const spots: Record<string, Spot> = { '*': satAt(g, cz, 'type', kb) };
    for (const i of def.interactions) {
      if (READS.test(i.id)) spots[i.id] = satAt(g, cz, 'read', paper);
      else if (PAPERS.test(i.id)) spots[i.id] = satAt(g, cz, 'write', paper);
    }
    out.spots = spots;
  },

  /**
   * A floor-standing multifunction copier: two paper drawers (A4, A3) on casters, the body with its
   * front door, the copies coming out into the tray under the scanner, the document feeder on top
   * with originals in it, a tilted touch panel on the right showing the copy count (lit in use), the
   * bypass tray folded at the side. In use a page slides out on to the stack after another and the
   * ready light blinks. Stood at its front, tapping through the panel.
   */
  copier(g, _W, D, _c, _def, _ctx, out) {
    const w = 0.66;
    const d = 0.6;
    const z = -D / 2 + d / 2 + 0.08;
    const zf = z + d / 2;
    const body = '#eef0f1';
    const trim = '#c5cbd0';
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, ball(0.025), BLACK, sx * (w / 2 - 0.06), 0.025, z + sz * (d / 2 - 0.06), { outline: false });
    // The paper drawers.
    part(g, rbox(w, 0.46, d, 0.02), trim, 0, 0.28, z);
    for (const [i, size] of ['A4', 'A3'].entries()) {
      const y = 0.17 + i * 0.22;
      part(g, rbox(w - 0.04, 0.19, 0.02, 0.008), body, 0, y, zf + 0.002);
      part(g, rbox(0.24, 0.03, 0.025, 0.01), '#78838c', 0.04, y + 0.04, zf + 0.012);
      label(g, size, 0.07, 0.04, -w / 2 + 0.08, y + 0.05, zf + 0.014, '#37474f', '#ffffff');
      // How full it is: a little gauge.
      for (let k = 0; k < 4; k++) part(g, box(0.012, 0.025, 0.004), k < 3 - i ? '#66bb6a' : '#cfd8dc', w / 2 - 0.12 + k * 0.018, y - 0.05, zf + 0.014, { outline: false });
    }
    // The body with its front door.
    part(g, rbox(w, 0.44, d, 0.02), body, 0, 0.73, z);
    part(g, box(w - 0.08, 0.36, 0.006), '#f6f7f8', 0, 0.73, zf + 0.002, { outline: false });
    part(g, rbox(0.16, 0.025, 0.02, 0.008), '#78838c', 0, 0.86, zf + 0.012);
    label(g, 'MF-7500', 0.16, 0.035, -w / 2 + 0.13, 0.62, zf + 0.007, 'none', '#607d8b');
    // The output bay under the scanner: copies on the tray.
    const bayY = 0.95 + 0.06;
    part(g, rbox(w, 0.02, d, 0.008), trim, 0, 0.955, z);
    part(g, rbox(0.1, 0.12, d, 0.01), body, w / 2 - 0.05, bayY, z);
    part(g, box(w - 0.12, 0.1, 0.02), '#5b666e', -0.05, bayY, z - d / 2 + 0.04, { outline: false });
    part(g, box(0.21, 0.04, 0.29), '#ffffff', -0.07, 0.985, z + 0.02);
    // The scanner and the document feeder with originals.
    part(g, rbox(w, 0.11, d, 0.02), body, 0, 1.125, z);
    part(g, rbox(w - 0.1, 0.08, d - 0.14, 0.02), trim, -0.03, 1.22, z - 0.03);
    part(g, rbox(0.3, 0.012, 0.32, 0.006), '#9aa3ab', -0.08, 1.27, z - 0.02, { rz: 0.06 });
    part(g, box(0.21, 0.025, 0.29), '#ffffff', -0.08, 1.285, z - 0.02, { rz: 0.06 });
    // The tilted panel on the front right.
    const pan = new THREE.Group();
    pan.position.set(0.14, 1.19, zf + 0.04);
    pan.rotation.x = -0.95;
    g.add(pan);
    part(pan, rbox(0.3, 0.19, 0.03, 0.01), '#cfd5da', 0, 0, 0);
    out.screen = screenOf(pan, copierTex(), 0.19, 0.11, -0.035, 0.015, 0.017);
    for (let k = 0; k < 6; k++) part(pan, box(0.018, 0.014, 0.008), '#607d8b', 0.09 + (k % 2) * 0.026, 0.05 - Math.floor(k / 2) * 0.026, 0.017, { outline: false });
    part(pan, cyl(0.016, 0.016, 0.01, 12), '#43a047', 0.103, -0.07, 0.018, { rx: Math.PI / 2, outline: false });
    const keys = marker(pan, -0.01, 0, 0.03);
    // The bypass tray folded against the right side.
    part(g, rbox(0.02, 0.2, 0.3, 0.006), trim, w / 2 + 0.012, 0.75, z + 0.04);
    // In use: the ready light blinks, pages slide out on to the stack one after another.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const led = part(use, box(0.02, 0.012, 0.006), '#66bb6a', -0.2, 1.17, zf + 0.004, { outline: false, material: glow('#76ff03') });
    const page = part(use, box(0.21, 0.003, 0.29), '#ffffff', 0.1, 1.01, z + 0.02, { outline: false });
    out.animate = (t) => {
      const u = (t * 0.9) % 1;
      page.position.x = 0.12 - 0.19 * Math.min(1, u * 1.4);
      page.position.y = 1.012 + 0.012 * (1 - Math.min(1, u * 1.4));
      led.visible = Math.sin(t * 7) > -0.3;
    };
    out.work = keys;
    out.spots = { '*': stoodAt(g, 0.1, zf + 0.42, 'type', keys) };
  },

  /**
   * A whiteboard in an aluminium frame — on the wall where there's one behind it, else on a mobile
   * stand with H feet on casters — written up after a meeting (goals ticked off, a flow, a chart
   * going up, the weeks to the deadline), a tray of markers and the eraser along its foot, sticky
   * notes and magnets on it. A meeting is held round it: everyone stood back from it with a notebook,
   * listening, jotting things down, chipping in, pointing things out on it. Leading one, the worker
   * stands beside it turned out to the room, pointing back at it and making the case.
   */
  whiteboard(g, W, D, _c, def, ctx, out) {
    const bw = Math.min(W - 0.3, 1.8);
    const bh = 1.0;
    const wall = ctx.againstWall;
    const bz = wall ? -D / 2 + 0.03 : -0.05;
    const by = wall ? 1.45 : 1.3;
    if (!wall) {
      // The stand: two posts on H feet with casters, a bar low across.
      for (const sx of [-1, 1]) {
        const x = sx * (bw / 2 + 0.04);
        part(g, rbox(0.04, by + bh / 2 - 0.02, 0.04, 0.01), ALU, x, (by + bh / 2 + 0.02) / 2 + 0.03, bz);
        part(g, rbox(0.06, 0.04, 0.62, 0.012), ALU, x, 0.07, bz);
        for (const sz of [-1, 1]) part(g, ball(0.03), BLACK, x, 0.03, bz + sz * 0.28, { outline: false });
      }
      part(g, rbox(bw + 0.04, 0.035, 0.03, 0.01), ALU, 0, 0.35, bz);
    }
    part(g, rbox(bw + 0.05, bh + 0.05, 0.03, 0.012), ALU, 0, by, bz);
    sheet(g, boardTex(), bw - 0.02, bh - 0.02, 0, by, bz + 0.017);
    // The tray with markers and the eraser.
    const trayY = by - bh / 2 - 0.035;
    part(g, rbox(bw * 0.62, 0.025, 0.075, 0.01), ALU, -bw * 0.12, trayY, bz + 0.045);
    for (const [i, col] of ['#212121', '#c62828', '#1a3c9e'].entries()) {
      part(g, cyl(0.011, 0.011, 0.13, 8), col, -bw * 0.3 + i * 0.05, trayY + 0.024, bz + 0.05, { rz: Math.PI / 2 });
      part(g, cyl(0.012, 0.012, 0.03, 8), '#eeeeee', -bw * 0.3 + i * 0.05 - 0.07, trayY + 0.024, bz + 0.05, { rz: Math.PI / 2, outline: false });
    }
    part(g, rbox(0.14, 0.04, 0.055, 0.012), '#37474f', bw * 0.05, trayY + 0.03, bz + 0.05);
    part(g, box(0.135, 0.012, 0.05), '#9e9e9e', bw * 0.05, trayY + 0.01, bz + 0.05, { outline: false });
    // Sticky notes on the right, magnets holding a printout.
    const notes = ['#fff176', '#fff176', '#f8bbd0', '#b3e5fc'];
    notes.forEach((col, i) => part(g, box(0.09, 0.09, 0.004), col, bw / 2 - 0.16 + (i % 2) * 0.1, by + 0.3 - Math.floor(i / 2) * 0.11, bz + 0.02, { rz: (i % 3) * 0.05 - 0.04, outline: false }));
    part(g, box(0.21, 0.29, 0.003), '#ffffff', bw / 2 - 0.2, by - 0.18, bz + 0.019, { outline: false });
    for (let i = 0; i < 5; i++) part(g, box(0.15, 0.006, 0.002), '#9e9e9e', bw / 2 - 0.2, by - 0.1 - i * 0.04, bz + 0.021, { outline: false });
    for (const [mx, col] of [[bw / 2 - 0.29, '#e53935'], [bw / 2 - 0.11, '#1e88e5']] as Array<[number, string]>) part(g, cyl(0.018, 0.018, 0.015, 12), col, mx, by - 0.04, bz + 0.025, { rx: Math.PI / 2 });
    // Where the hands go on it: the middle, and the chart to the presenter's side.
    out.work = marker(g, 0, by + 0.05, bz + 0.02);
    const point = marker(g, bw * 0.12, by + 0.12, bz + 0.02);
    // The meeting stands round it a step back (each on their own tile): the solid part is taken out to there.
    out.body.expandByPoint(new THREE.Vector3(0, 0, bz + 0.72));
    // Leading or planning at it: beside its right edge, turned out to the room, the board to the right hand.
    const spots: Record<string, Spot> = {};
    for (const i of def.interactions) if (i.id !== 'attendMeeting') spots[i.id] = stoodAt(g, bw / 2 + 0.14, bz + 0.6, 'present', point, -0.5);
    out.spots = spots;
  },

  /**
   * The meeting room's screen: a pull-down screen hung on the wall (or on a tripod in the middle of a
   * room) and the projector on its ceiling mount out in front of it; in use the beam lights up and the
   * strategy slide is up on the screen (the year's figures going up, the half's goals). Rehearsed at,
   * reported at, chaired at: stood beside the screen turned out to the table, pointing back at the
   * chart and making the case, hands together for the questions.
   */
  projector(g, _W, D, _c, _def, ctx, out) {
    const sw = 1.5;
    const sh = 0.95;
    const wall = ctx.againstWall;
    const sz = wall ? -D / 2 + 0.07 : -0.1;
    const top = 2.42;
    const sy = top - 0.05 - sh / 2;
    // The case at the top, the screen hanging from it, its weighted bar and pull at the foot.
    part(g, cyl(0.05, 0.05, sw + 0.16, 14), '#eceff1', 0, top, sz, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, cyl(0.052, 0.052, 0.03, 14), '#9aa3ab', sx * (sw / 2 + 0.08), top, sz, { rz: Math.PI / 2, outline: false });
    part(g, box(sw + 0.06, sh + 0.04, 0.008), '#2b2b30', 0, sy, sz, { outline: false });
    part(g, box(sw, sh, 0.01), '#fafafa', 0, sy, sz + 0.002, { outline: false });
    part(g, rbox(sw + 0.06, 0.03, 0.03, 0.01), '#9aa3ab', 0, sy - sh / 2 - 0.035, sz);
    part(g, cyl(0.004, 0.004, 0.2, 4), BLACK, 0, sy - sh / 2 - 0.15, sz, { outline: false });
    part(g, ring(0.025, 0.006), BLACK, 0, sy - sh / 2 - 0.27, sz, { outline: false });
    if (!wall) {
      // A tripod under it, the post up to the case.
      part(g, cyl(0.02, 0.02, top, 8), '#9aa3ab', 0, top / 2, sz - 0.04, { outline: false });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        rod(g, new THREE.Vector3(0, 0.55, sz - 0.04), new THREE.Vector3(Math.sin(a) * 0.4, 0, sz - 0.04 + Math.cos(a) * 0.4), 0.014, '#9aa3ab');
      }
    }
    // The projector on its ceiling mount, out in front over the table's end.
    const pz = sz + 1.7;
    const py = 2.62;
    part(g, cyl(0.02, 0.02, 0.36, 8), '#9aa3ab', 0, 2.82, pz, { outline: false });
    part(g, rbox(0.14, 0.03, 0.14, 0.01), '#9aa3ab', 0, 2.66, pz);
    part(g, rbox(0.34, 0.11, 0.28, 0.03), '#f0f2f4', 0, py - 0.06, pz);
    part(g, cyl(0.045, 0.05, 0.04, 16), '#37474f', 0, py - 0.06, pz - 0.15, { rx: Math.PI / 2 });
    part(g, box(0.08, 0.006, 0.2), '#b0bec5', 0.11, py - 0.002, pz, { outline: false });
    // In use: the slide on the screen, the beam, the projector's lamp light.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    sheet(use, slideTex(), sw - 0.06, sh - 0.06, 0, sy, sz + 0.009);
    const lens = new THREE.Vector3(0, py - 0.06, pz - 0.17);
    const beam = new THREE.Mesh(beamGeom(0.06, 0.05, 0, sw - 0.06, sh - 0.06, lens.z - (sz + 0.012), lens.y - sy), BEAM);
    beam.position.copy(lens);
    beam.rotation.y = Math.PI;
    use.add(beam);
    part(use, cyl(0.035, 0.035, 0.005, 14), '#fffde7', 0, py - 0.06, pz - 0.172, { rx: Math.PI / 2, outline: false, material: glow('#fffde7') });
    part(use, box(0.015, 0.008, 0.004), '#42a5f5', 0.12, py - 0.06, pz - 0.142, { outline: false, material: glow('#42a5f5') });
    // The presenter: beside the screen's right edge, turned out to the room, the chart to the right hand.
    const chart = marker(g, -0.35, sy + 0.05, sz + 0.02);
    out.work = chart;
    out.spots = { '*': stoodAt(g, sw / 2 + 0.08, sz + 0.62, 'present', chart, -0.5) };
  },

  /**
   * The conference table: a long walnut top on two dark slab legs, the pop-up power box and the
   * conference speakerphone in the middle, a remote; at each place a handout with a pen, or an open
   * laptop, a bottle of water and a paper cup. Its mesh chairs are pieces of their own.
   */
  salMeetingTable(g, W, D) {
    const w = W - 0.12;
    const d = Math.min(D - 0.06, 0.96);
    const h = 0.74;
    const top = '#6b4a3a';
    part(g, rbox(w, 0.045, d, 0.03), top, 0, h, 0);
    part(g, box(w - 0.04, 0.012, d - 0.04), shade(top, 0.82), 0, h - 0.028, 0, { outline: false });
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.4);
      part(g, rbox(0.08, h - 0.04, d - 0.3, 0.02), '#3a3d44', x, (h - 0.04) / 2, 0);
      part(g, rbox(0.12, 0.03, d - 0.2, 0.01), '#3a3d44', x, 0.015, 0);
    }
    part(g, rbox(w - 0.9, 0.06, 0.12, 0.01), '#3a3d44', 0, h - 0.07, 0);
    const ty = h + 0.0225;
    // The middle: the power box, the speakerphone, the remote, a tray of water.
    part(g, rbox(0.3, 0.008, 0.11, 0.004), ALU, 0, ty + 0.004, 0);
    for (let k = 0; k < 3; k++) part(g, box(0.035, 0.002, 0.03), BLACK, -0.08 + k * 0.08, ty + 0.009, 0, { outline: false });
    part(g, cyl(0.13, 0.15, 0.03, 3), '#3a3d44', -0.55, ty + 0.015, 0, { ry: Math.PI / 6 });
    part(g, cyl(0.04, 0.04, 0.006, 12), '#5b6068', -0.55, ty + 0.032, 0, { outline: false });
    part(g, box(0.02, 0.004, 0.012), '#66bb6a', -0.47, ty + 0.032, 0, { outline: false, material: glow('#66bb6a') });
    part(g, rbox(0.045, 0.015, 0.15, 0.008), BLACK, 0.5, ty + 0.008, 0.02, { ry: 0.3 });
    part(g, rbox(0.3, 0.012, 0.16, 0.006), '#cfd8dc', 0.95, ty + 0.006, 0);
    for (let k = 0; k < 4; k++) {
      const bx = 0.86 + (k % 2) * 0.17;
      const bz = -0.04 + Math.floor(k / 2) * 0.08;
      part(g, cyl(0.025, 0.028, 0.16, 10), '#bbdefb', bx, ty + 0.09, bz, { material: CLEAR });
      part(g, cyl(0.016, 0.016, 0.025, 8), '#1e88e5', bx, ty + 0.18, bz, { outline: false });
      part(g, cyl(0.0285, 0.0285, 0.045, 10), '#1e88e5', bx, ty + 0.09, bz, { outline: false });
    }
    // Each place: a handout and pen, or a laptop; and a paper cup.
    const places = [-1, 0, 1].map((k) => k * Math.min(1, (w - 0.6) / 2));
    places.forEach((x, i) => {
      for (const side of [1, -1]) {
        const pl = new THREE.Group();
        pl.position.set(x, ty, side * (d / 2 - 0.2));
        pl.rotation.y = side > 0 ? 0 : Math.PI;
        g.add(pl);
        if ((i + (side > 0 ? 0 : 1)) % 2 === 0) {
          paperOn(pl, -0.05, 0, 0, 0.08, 7);
          part(pl, box(0.03, 0.008, 0.06), BLACK, -0.12, 0.006, -0.11, { outline: false });
          pen(pl, 0.12, 0, 0.02, 1.2);
        } else {
          // An open laptop, its screen to the one sat here.
          part(pl, rbox(0.32, 0.015, 0.22, 0.006), '#b0bec5', 0, 0.008, 0);
          part(pl, box(0.28, 0.003, 0.11), '#78909c', 0, 0.017, -0.03, { outline: false });
          const lid = new THREE.Group();
          lid.position.set(0, 0.015, -0.11);
          lid.rotation.x = -0.25;
          pl.add(lid);
          part(lid, rbox(0.32, 0.21, 0.01, 0.005), '#b0bec5', 0, 0.105, 0);
          sheet(lid, slideTex(), 0.28, 0.175, 0, 0.105, 0.006);
        }
        part(pl, cyl(0.03, 0.022, 0.08, 12), '#fafafa', 0.22, 0.04, -0.06);
      }
    });
  },

  /**
   * A conference chair: a black frame round a grey mesh back, armrests, a five-star base on casters,
   * pulled in to the table in front of it. Sat back in it to rest; at a meeting, the notebook on the
   * table, listening, jotting, chipping in, chin in hand.
   */
  salMeetingChair(g, _W, _D, _c, _def, _ctx, out) {
    const c = new THREE.Group();
    c.position.set(0, 0, 0.1);
    g.add(c);
    officeChair(c, 0.44, '#4b5560', true);
    out.seat = marker(g, 0, 0.48, 0.1);
  },

  /**
   * The supply corner: a tall steel cabinet with glass doors over the binders, the reams of A4 and the
   * toner, solid doors below, '사무용품' on its top; beside it a shredder taped '대외비 문서 파쇄' with
   * shreds behind its window, and cartons of copy paper with a stapler and a punch on top. Stood
   * feeding the shredder sheet by sheet (a page goes down its slot in use, the light on), or reaching
   * into the cabinet putting the supplies away.
   */
  salSupplyCabinet(g, W, D, _c, _def, _ctx, out) {
    const steel = '#cfd4d8';
    const cw = Math.min(0.9, W / 2 - 0.06);
    const cx = -W / 2 + cw / 2 + 0.04;
    const cd = 0.45;
    const cz = -D / 2 + cd / 2 + 0.03;
    const czf = cz + cd / 2;
    const ch = 1.85;
    part(g, rbox(cw, ch, cd, 0.015), steel, cx, ch / 2, cz);
    // The lower doors and their handles.
    for (const sx of [-1, 1]) {
      part(g, rbox(cw / 2 - 0.02, 0.78, 0.015, 0.005), tint(steel, 0.15), cx + sx * (cw / 4), 0.43, czf + 0.004);
      part(g, rbox(0.015, 0.12, 0.02, 0.005), '#78838c', cx + sx * 0.04, 0.6, czf + 0.014, { outline: false });
    }
    // Inside the upper half: three shelves of binders, reams and toner, behind glass.
    const inner = shade(steel, 0.8);
    part(g, box(cw - 0.05, 0.92, 0.01), inner, cx, 1.33, cz - cd / 2 + 0.02, { outline: false });
    const shelfY = [0.9, 1.22, 1.54];
    for (const y of shelfY) part(g, box(cw - 0.05, 0.015, cd - 0.06), steel, cx, y, cz, { outline: false });
    const binders = ['#1565c0', '#1565c0', '#c62828', '#2e7d32', '#f9a825', '#1565c0', '#6a1b9a', '#455a64'];
    binders.forEach((col, i) => part(g, rbox(0.06, 0.28, 0.26, 0.008), col, cx - cw / 2 + 0.07 + i * 0.075, shelfY[2] + 0.15, cz + 0.02));
    for (let k = 0; k < 3; k++) {
      for (let j = 0; j < 3; j++) {
        part(g, rbox(0.22, 0.055, 0.3, 0.006), '#fafafa', cx - cw / 2 + 0.15 + k * 0.28, shelfY[1] + 0.035 + j * 0.058, cz + 0.02);
        part(g, box(0.221, 0.02, 0.3), '#1e88e5', cx - cw / 2 + 0.15 + k * 0.28, shelfY[1] + 0.035 + j * 0.058, cz + 0.02, { outline: false });
      }
    }
    for (let k = 0; k < 3; k++) {
      part(g, rbox(0.22, 0.2, 0.3, 0.01), k === 1 ? '#263238' : '#eceff1', cx - cw / 2 + 0.15 + k * 0.28, shelfY[0] + 0.11, cz + 0.02);
      label(g, '토너', 0.12, 0.04, cx - cw / 2 + 0.15 + k * 0.28, shelfY[0] + 0.13, cz + 0.172, k === 1 ? '#263238' : '#eceff1', k === 1 ? '#ffffff' : '#c62828');
    }
    for (const sx of [-1, 1]) {
      const door = new THREE.Mesh(box(cw / 2 - 0.02, 0.98, 0.01), GLASS);
      door.position.set(cx + sx * (cw / 4), 1.34, czf + 0.004);
      g.add(door);
      part(g, rbox(cw / 2 - 0.02, 0.02, 0.016, 0.006), steel, cx + sx * (cw / 4), 1.84, czf + 0.004, { outline: false });
    }
    label(g, '사무용품', 0.34, 0.07, cx, ch - 0.08, czf + 0.012, NAVY, '#ffffff');
    // The shredder: a black head on a grey bin with a window of shreds, the slot on top, the sticker.
    const sx0 = cx + cw / 2 + 0.26;
    const sd = 0.34;
    const sz = -D / 2 + sd / 2 + 0.08;
    const szf = sz + sd / 2;
    part(g, rbox(0.42, 0.52, sd, 0.02), '#5b6068', sx0, 0.27, sz);
    part(g, box(0.22, 0.25, 0.006), '#3a3d44', sx0, 0.27, szf + 0.002, { outline: false });
    for (let k = 0; k < 14; k++) part(g, box(0.012, 0.05, 0.004), k % 3 ? '#fafafa' : '#e0e0e0', sx0 - 0.09 + k * 0.0137, 0.18 + ((k * 7) % 5) * 0.022, szf + 0.006, { rz: (k % 5) * 0.4 - 0.8, outline: false });
    part(g, rbox(0.44, 0.2, sd + 0.02, 0.025), '#26282d', sx0, 0.63, sz);
    part(g, box(0.28, 0.006, 0.012), '#000000', sx0, 0.732, sz, { outline: false });
    label(g, '대외비 문서 파쇄', 0.26, 0.05, sx0, 0.64, szf + 0.012, '#c62828', '#ffffff');
    const slot = marker(g, sx0, 0.76, sz + 0.04);
    // The cartons of copy paper, a stapler and a punch on top.
    const bx = W / 2 - 0.22;
    for (let k = 0; k < 2; k++) {
      part(g, rbox(0.34, 0.24, 0.44, 0.01), '#c8a165', bx, 0.12 + k * 0.245, -D / 2 + 0.3, { ry: k * 0.05 });
      label(g, '복사용지 A4', 0.24, 0.05, bx, 0.14 + k * 0.245, -D / 2 + 0.523 + 0.001, '#c8a165', '#3e2723', k * 0.05);
    }
    part(g, rbox(0.06, 0.05, 0.17, 0.015), '#c62828', bx - 0.06, 0.515, -D / 2 + 0.28, { ry: 0.3 });
    part(g, rbox(0.12, 0.06, 0.09, 0.015), '#37474f', bx + 0.08, 0.52, -D / 2 + 0.32);
    // In use: a page going down the slot, the run light on.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, box(0.03, 0.01, 0.006), '#76ff03', sx0 + 0.16, 0.72, szf + 0.002, { outline: false, material: glow('#76ff03') });
    const page = part(use, box(0.21, 0.29, 0.003), '#ffffff', sx0, 0.88, sz, { outline: false });
    out.animate = (t) => {
      const u = (t * 0.5) % 1;
      page.position.y = 0.9 - 0.16 * u;
      page.scale.y = 1 - 0.55 * u;
    };
    const shelf = marker(g, cx, 1.15, czf + 0.02);
    out.work = slot;
    out.spots = {
      salShredDocs: stoodAt(g, sx0, szf + 0.38, 'tinker', slot),
      '*': stoodAt(g, cx, czf + 0.4, 'rummage', shelf),
    };
  },

  /**
   * A Korean office's water purifier: a slim white tower, the cold and hot taps (blue, red, the hot
   * one's lock) in a lit niche over the drip tray, the little display at the top; a tube of paper
   * cups on its side and a bin for them. Stood at it with a cup, drinking.
   */
  salWaterCooler(g, _W, D, _c, _def, _ctx, out) {
    const w = 0.32;
    const d = 0.42;
    const x = -0.1;
    const z = -D / 2 + d / 2 + 0.06;
    const zf = z + d / 2;
    const h = 1.18;
    part(g, rbox(w, h, d, 0.04), '#f5f7f8', x, h / 2, z);
    part(g, rbox(w - 0.02, 0.06, d - 0.02, 0.02), '#cfd8dc', x, 0.03, z);
    // The niche with its taps and drip tray.
    part(g, rbox(w - 0.08, 0.28, 0.06, 0.02), '#4a525a', x, 0.86, zf - 0.02);
    part(g, rbox(w - 0.1, 0.02, 0.1, 0.006), '#9aa3ab', x, 0.73, zf + 0.01);
    for (let k = 0; k < 5; k++) part(g, box(0.004, 0.004, 0.08), '#6b737b', x - 0.07 + k * 0.035, 0.742, zf + 0.01, { outline: false });
    for (const [dx, col] of [[-0.055, '#1e88e5'], [0.055, '#e53935']] as Array<[number, string]>) {
      part(g, cyl(0.012, 0.012, 0.05, 8), CHROME, x + dx, 0.95, zf - 0.005, { outline: false });
      part(g, rbox(0.06, 0.035, 0.04, 0.012), col, x + dx, 1.04, zf + 0.004);
    }
    label(g, '냉수', 0.06, 0.025, x - 0.055, 1.085, zf + 0.002, 'none', '#1565c0');
    label(g, '온수', 0.06, 0.025, x + 0.055, 1.085, zf + 0.002, 'none', '#c62828');
    part(g, rbox(0.03, 0.015, 0.012, 0.005), '#ffb300', x + 0.055, 1.005, zf + 0.026, { outline: false });
    // The display, and the niche's light.
    part(g, box(0.12, 0.04, 0.004), '#263238', x, 1.13, zf + 0.002, { outline: false });
    part(g, box(0.02, 0.01, 0.002), '#4fc3f7', x - 0.03, 1.13, zf + 0.005, { outline: false, material: glow('#4fc3f7') });
    part(g, box(0.02, 0.01, 0.002), '#ff8a65', x + 0.03, 1.13, zf + 0.005, { outline: false, material: glow('#ff8a65') });
    part(g, box(w - 0.12, 0.008, 0.02), '#e1f5fe', x, 0.995, zf - 0.03, { outline: false, material: glow('#e1f5fe') });
    // The front panel lower down, its stripes.
    for (let k = 0; k < 3; k++) part(g, box(w - 0.1, 0.006, 0.003), '#b0bec5', x, 0.25 + k * 0.05, zf + 0.002, { outline: false });
    // The cup tube on the right side, the bin.
    const tx = x + w / 2 + 0.05;
    part(g, rbox(0.02, 0.1, 0.06, 0.006), '#9aa3ab', tx - 0.03, 0.95, z + 0.1, { outline: false });
    part(g, cyl(0.045, 0.045, 0.42, 14), '#e3f2fd', tx + 0.01, 0.88, z + 0.1, { material: CLEAR });
    for (let k = 0; k < 7; k++) part(g, cyl(0.036, 0.026, 0.05, 12), '#fafafa', tx + 0.01, 0.7 + k * 0.05, z + 0.1, { outline: false });
    part(g, cyl(0.12, 0.1, 0.4, 14), '#90a4ae', x + w / 2 + 0.2, 0.2, z + 0.02);
    part(g, ring(0.11, 0.012), '#78909c', x + w / 2 + 0.2, 0.4, z + 0.02, { rx: Math.PI / 2, outline: false });
    const tap = marker(g, x, 0.95, zf + 0.04);
    out.work = tap;
    out.spots = { '*': stoodAt(g, x + 0.08, zf + 0.42, 'drink', tap) };
  },

  /**
   * The lobby's reception: the company's name in white on a tall navy slatted wall behind (the gold
   * ring of its mark, a gold light along its foot, a plant either side), a white counter with a high
   * ledge and a navy band, a monitor, keyboard and phone on the low desk behind it with whoever sits
   * there's chair, a desk bell, the visitor sign-in tablet, a white orchid and the visitor passes.
   */
  /**
   * An office building's lift hall (2026-11-05, the layout audit: the office lots are a floor of a building): two brushed steel
   * lift doors set in a stone-clad wall, the frame round each, the floor display over each, the call buttons between, the floor
   * guide plate above them all.
   */
  bldLift(g, W, D) {
    const zb = -D / 2 + 0.04;
    const dw = W / 2 - 0.2;
    part(g, box(W - 0.04, 2.6, 0.04), '#d6d2cb', 0, 1.3, zb - 0.01, { outline: false });
    for (const sx of [-1, 1]) {
      const x = (sx * W) / 4;
      part(g, box(dw + 0.14, 2.2, 0.06), '#5f6a72', x, 1.1, zb + 0.01);
      for (const s of [-1, 1]) part(g, box(dw / 2 - 0.01, 2.08, 0.03), ALU, x + (s * dw) / 4, 1.04, zb + 0.05);
      part(g, box(0.006, 2.08, 0.032), '#7d868d', x, 1.04, zb + 0.056, { outline: false });
      part(g, box(0.36, 0.12, 0.02), BLACK, x, 2.32, zb + 0.04);
      label(g, sx < 0 ? '7 ▲' : '12 ▼', 0.3, 0.09, x, 2.32, zb + 0.052, BLACK, '#ff8f00');
    }
    part(g, rbox(0.1, 0.24, 0.02, 0.008), CHROME, 0, 1.1, zb + 0.04);
    for (const y of [1.15, 1.05]) part(g, cyl(0.025, 0.025, 0.012, 12), '#eceff1', 0, y, zb + 0.055, { rx: Math.PI / 2 });
    part(g, box(0.006, 0.006, 0.004), '#ffb300', 0, 1.15, zb + 0.062, { outline: false, material: glow('#ffb300') });
    label(g, '엘리베이터 · B2 ~ 15F', 0.62, 0.11, 0, 2.5, zb + 0.03, '#37474f', '#ffffff');
  },

  /** The same desk for any building's lobby, its wall saying only 안내 (2026-11-05: the 한결그룹 logo was turning up in other firms' lobbies). */
  lobbyDesk(g, W, D, c, def, ctx, out) {
    BUILDERS.salReceptionDesk(g, W, D, c, def, { ...ctx, neutral: true } as typeof ctx, out);
  },
  salReceptionDesk(g, W, D, _c, _def, ctx) {
    const neutral = !!(ctx as { neutral?: boolean } | undefined)?.neutral;
    // The name wall behind.
    const wz = -D / 2 + 0.05;
    part(g, rbox(W - 0.1, 2.3, 0.08, 0.02), NAVY, 0, 1.15, wz);
    for (let k = 0; k < 11; k++) part(g, box(0.012, 2.26, 0.004), shade(NAVY, 0.8), -W / 2 + 0.2 + k * ((W - 0.4) / 10), 1.15, wz + 0.042, { outline: false });
    const lw = Math.min(2.2, W - 0.4);
    part(g, box(lw + 0.1, lw * 0.375 + 0.06, 0.004), shade(NAVY, 0.7), 0, 1.85, wz + 0.044, { outline: false });
    if (neutral) label(g, '안내 · INFORMATION', lw * 0.8, lw * 0.11, 0, 1.85, wz + 0.047, 'none', '#ffffff');
    else sheet(g, logoTex(), lw, lw * 0.375, 0, 1.85, wz + 0.047);
    part(g, box(W - 0.2, 0.012, 0.012), '#ffb300', 0, 0.12, wz + 0.045, { outline: false, material: glow('#ffb300') });
    // The counter near the front: a low desk, the high ledge in front of it, a navy band.
    const cw = Math.min(W - 0.6, 2.2);
    const cz = D / 2 - 0.4;
    part(g, rbox(cw, 0.74, 0.5, 0.02), '#f4f4f2', 0, 0.37, cz);
    part(g, rbox(cw + 0.04, 0.035, 0.6, 0.012), '#e8e6e1', 0, 0.755, cz - 0.02);
    part(g, rbox(cw, 0.36, 0.08, 0.015), '#f4f4f2', 0, 0.94, cz + 0.21);
    part(g, rbox(cw + 0.06, 0.035, 0.24, 0.012), '#d7ccc8', 0, 1.13, cz + 0.2);
    part(g, box(cw + 0.002, 0.07, 0.502), NAVY, 0, 0.5, cz, { outline: false });
    part(g, box(cw + 0.004, 0.008, 0.504), '#ffb300', 0, 0.455, cz, { outline: false });
    if (neutral) label(g, '안내', 0.2, 0.08, cw / 2 - 0.35, 0.94, cz + 0.33, '#f4f4f2', NAVY);
    else label(g, '한결그룹', 0.4, 0.09, cw / 2 - 0.35, 0.65, cz + 0.252, 'none', NAVY);
    // On the low desk: the monitor turned to the chair, a keyboard, a phone.
    monitor(g, -0.3, 0.775, cz - 0.05, 0.44, 0.27, Math.PI);
    part(g, rbox(0.32, 0.018, 0.11, 0.006), '#e4e6e8', -0.3, 0.785, cz - 0.2);
    part(g, rbox(0.17, 0.05, 0.2, 0.02), '#3a3d44', 0.25, 0.795, cz - 0.12, { ry: -0.2 });
    // On the ledge: the bell, the tablet, the orchid, the passes.
    const ly = 1.15;
    part(g, cyl(0.035, 0.045, 0.012, 14), BLACK, 0.15, ly + 0.006, cz + 0.22);
    part(g, ball(0.035), '#d4af37', 0.15, ly + 0.025, cz + 0.22, { outline: false }).scale.set(1, 0.7, 1);
    const pad = new THREE.Group();
    pad.position.set(-0.3, ly, cz + 0.2);
    pad.rotation.x = -0.5;
    g.add(pad);
    part(pad, rbox(0.16, 0.22, 0.012, 0.01), BLACK, 0, 0.1, 0);
    sheet(pad, visitorTex(), 0.14, 0.19, 0, 0.1, 0.007);
    const ox = cw / 2 - 0.12;
    part(g, cyl(0.06, 0.05, 0.12, 14), '#fafafa', ox, ly + 0.06, cz + 0.2);
    rod(g, new THREE.Vector3(ox, ly + 0.12, cz + 0.2), new THREE.Vector3(ox + 0.05, ly + 0.5, cz + 0.18), 0.005, '#558b2f');
    for (let k = 0; k < 5; k++) part(g, ball(0.03), '#ffffff', ox + 0.02 + k * 0.025, ly + 0.5 - k * 0.06, cz + 0.2 + (k % 2) * 0.02, { outline: false }).scale.set(1, 0.6, 0.9);
    for (const sx of [-1, 1]) part(g, rbox(0.1, 0.035, 0.18, 0.015), '#33691e', ox + sx * 0.07, ly + 0.11, cz + 0.2, { rz: sx * 0.5 });
    for (let k = 0; k < 3; k++) {
      part(g, rbox(0.06, 0.09, 0.006, 0.003), '#ffffff', -cw / 2 + 0.12 + k * 0.07, ly + 0.06, cz + 0.27, { rx: -0.2 });
      part(g, box(0.06, 0.018, 0.007), '#ffb300', -cw / 2 + 0.12 + k * 0.07, ly + 0.09, cz + 0.272, { rx: -0.2, outline: false });
    }
    label(g, '방문증', 0.16, 0.035, -cw / 2 + 0.19, ly - 0.03, cz + 0.255, NAVY, '#ffffff');
    // The receptionist's chair behind it, and a plant in each corner by the wall.
    const c = new THREE.Group();
    c.position.set(-0.1, 0, cz - 0.62);
    g.add(c);
    officeChair(c, 0.44, '#2f3640', true);
    for (const sx of [-1, 1]) {
      const px = sx * (W / 2 - 0.25);
      part(g, cyl(0.15, 0.12, 0.42, 14), '#eceff1', px, 0.21, wz + 0.25);
      for (let k = 0; k < 6; k++) part(g, rbox(0.06, 0.55, 0.02, 0.01), '#2e7d32', px + Math.sin(k) * 0.05, 0.62 + (k % 3) * 0.05, wz + 0.25 + Math.cos(k) * 0.05, { ry: k * 1.05, rz: Math.sin(k * 2) * 0.25 });
    }
  },
};
