import * as THREE from 'three';
import type { Motion } from '../activity';
import { boardGrip, type HeldTool } from '../handTool';
import { marker, rod, screenMesh, shade, spot, tint, type Builder, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';
import * as DR from './doctorMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The general hospital drawn as itself (2026-10-26 workplace pipeline, at the user's request): the
 * consulting desk with the chart on its screen, the light box of films, a hospital bed with its rails
 * and drip, the medicine cabinet, the operating table under its light, and what the hospital was
 * missing (workFurniture/doctor.ts). The nurse's ward, the vet, the dentist and the pharmacy share
 * some of these pieces, so nothing on them is only a doctor's.
 */

export const BLACK = '#2b2b30';
export const STEEL = '#c3cad0';
export const CHROME = '#e3e7ea';
export const ENAMEL = '#f1f3f4';
export const TEAL = '#00897b';
const DRAPE = '#3d8b7a';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

/** Lit parts (LEDs, a lamp's face, water): one unlit material a colour, shared like toon()'s. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
export function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
export const glowing = (g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rx = 0) =>
  part(g, geom, color, x, y, z, { outline: false, shadow: false, material: glow(color), rx });

const GLASS = new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.3, depthWrite: false });
const PANE = new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
/** A drip bag's soft plastic, the fluid showing through. */
export const BAG = new THREE.MeshToonMaterial({ color: '#e3f4fb', transparent: true, opacity: 0.6, depthWrite: false });
export const WATER = new THREE.MeshBasicMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.6, depthWrite: false });
/** A see-through part (no outline: the frame round it draws the edge). */
export function glass(g: THREE.Object3D, geom: THREE.BufferGeometry, x: number, y: number, z: number, mat: THREE.Material = GLASS, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.renderOrder = 2;
  g.add(m);
  return m;
}

const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
export const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the films and the signs (once each; blank outside a browser).

export type Paint = (c: CanvasRenderingContext2D) => void;
const paints = new Map<string, THREE.Texture>();
export function painted(key: string, w: number, h: number, paint: Paint): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(w, h, paint)));
  return t;
}
export function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', bold = true) {
  c.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
}
/** The same scatter every time it's painted. */
export function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** A flat picture lit by itself (a film, a screen's face, a sign); `color` dims it. */
export function picture(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, color = '#ffffff', ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  g.add(m);
  return m;
}
/** Words on a plate (a sign, a drawer's label). */
export function label(g: THREE.Object3D, s: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.round((ch * w) / h / 16) * 16 || 64;
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
export function litScreen(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const s = screenMesh(w, h);
  (s.material as THREE.MeshBasicMaterial).map = tex;
  s.position.set(x, y, z);
  g.add(s);
  return s;
}

/** The consulting room's chart: the patient, the findings and the prescription. */
const paintChart: Paint = (c) => {
  c.fillStyle = '#eef3f6';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 512, 30);
  text(c, '전자의무기록 EMR', 12, 16, 16, '#ffffff');
  text(c, '진료실 · 내과', 500, 16, 13, '#e0f2f1', 'right');
  c.fillStyle = '#ffffff';
  c.fillRect(8, 38, 162, 274);
  c.fillRect(178, 38, 326, 130);
  c.fillRect(178, 176, 326, 112);
  c.fillStyle = '#b2dfdb';
  c.fillRect(8, 38, 162, 22);
  c.fillRect(178, 38, 326, 22);
  c.fillRect(178, 176, 326, 22);
  text(c, '환자 정보', 16, 50, 13, '#004d40');
  text(c, '진단 · 소견', 186, 50, 13, '#004d40');
  text(c, '처방', 186, 188, 13, '#004d40');
  const rows = ['김○○ (남/54세)', '등록 1023-4471', '혈압 128/82', '맥박 76회/분', '체온 36.8℃', '체중 72kg'];
  rows.forEach((r, i) => text(c, r, 16, 78 + i * 24, 12, '#37474f', 'left', i === 0));
  text(c, '알레르기: 페니실린', 16, 78 + rows.length * 24, 12, '#d32f2f');
  text(c, 'I10 본태성 고혈압', 186, 76, 13, '#263238');
  text(c, 'E11 제2형 당뇨병', 186, 98, 13, '#263238');
  c.fillStyle = '#cfd8dc';
  for (const [y, w] of [[118, 270], [134, 300], [150, 210]]) c.fillRect(186, y, w, 7);
  const rx = ['암로디핀 5mg', '메트포르민 500mg', '아스피린 100mg'];
  rx.forEach((r, i) => {
    text(c, r, 186, 214 + i * 24, 12, '#263238');
    text(c, '1정 · 1일 1회 · 30일', 494, 214 + i * 24, 11, '#546e7a', 'right', false);
  });
  for (const [x, w, s] of [[322, 70, '저장'], [400, 104, '처방전 출력']] as const) {
    c.fillStyle = '#1e88e5';
    c.fillRect(x, 294, w, 20);
    text(c, s, x + w / 2, 304, 12, '#ffffff', 'center');
  }
};
/** Blood results with the highs flagged. */
const paintLabs: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 384, 288);
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 384, 30);
  text(c, '검사 결과 · 혈액', 12, 16, 15, '#ffffff');
  c.fillStyle = '#e3f2fd';
  c.fillRect(0, 30, 384, 24);
  text(c, '항목', 12, 42, 12, '#0d47a1');
  text(c, '결과', 190, 42, 12, '#0d47a1', 'center');
  text(c, '참고치', 372, 42, 12, '#0d47a1', 'right');
  const rows: Array<[string, string, string, string?]> = [
    ['WBC', '7.2', '4.0–10.0'], ['Hb', '13.8', '13–17'], ['PLT', '245', '150–400'], ['Glucose', '142 H', '70–110', '#d32f2f'],
    ['HbA1c', '6.8 H', '4.0–6.0', '#d32f2f'], ['AST', '28', '0–40'], ['ALT', '35', '0–40'], ['Cr', '0.9', '0.7–1.3'],
  ];
  rows.forEach(([k, v, r, hi], i) => {
    const y = 68 + i * 27;
    if (i % 2) {
      c.fillStyle = '#f5f7f9';
      c.fillRect(0, y - 13, 384, 27);
    }
    text(c, k, 12, y, 13, '#263238');
    text(c, v, 190, y, 13, hi ?? '#263238', 'center');
    text(c, r, 372, y, 12, '#78909c', 'right', false);
  });
};

const bone = (a: number) => `rgba(235,235,230,${a})`;
/** A chest film, front to back: the lungs dark, the ribs, spine, collarbones and the heart's shadow. */
const paintChest: Paint = (c) => {
  c.fillStyle = '#050505';
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = '#3a3a3a';
  c.beginPath();
  c.ellipse(128, 200, 118, 160, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#121212';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.ellipse(128 + sx * 50, 165, 42, 100, sx * -0.08, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = bone(0.5);
  c.beginPath();
  c.ellipse(146, 222, 48, 44, -0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = bone(0.55);
  c.fillRect(119, 30, 18, 290);
  c.strokeStyle = bone(0.45);
  c.lineWidth = 5;
  for (let i = 0; i < 9; i++) {
    for (const [a0, a1] of [[0.04, 0.45], [0.55, 0.96]]) {
      c.beginPath();
      c.ellipse(128, 62 + i * 24, 100, 30, 0, Math.PI * a0, Math.PI * a1);
      c.stroke();
    }
  }
  c.lineWidth = 8;
  c.strokeStyle = bone(0.75);
  for (const [x0, x1] of [[52, 120], [136, 204]]) {
    c.beginPath();
    c.moveTo(x0, x0 < 128 ? 66 : 52);
    c.lineTo(x1, x0 < 128 ? 52 : 66);
    c.stroke();
  }
  text(c, 'R', 14, 18, 18, '#ffffff');
  text(c, 'CHEST PA', 244, 306, 12, '#bdbdbd', 'right');
};
/** A skull from the side: the vault, the jaw and teeth, the neck's vertebrae. */
const paintSkull: Paint = (c) => {
  c.fillStyle = '#050505';
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = '#2e2e2e';
  c.beginPath();
  c.ellipse(124, 128, 98, 90, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = bone(0.8);
  c.lineWidth = 9;
  c.beginPath();
  c.ellipse(124, 128, 92, 84, 0, Math.PI * 0.85, Math.PI * 2.15);
  c.stroke();
  c.fillStyle = bone(0.5);
  c.beginPath();
  c.moveTo(60, 170);
  c.lineTo(84, 232);
  c.lineTo(168, 250);
  c.lineTo(196, 226);
  c.lineTo(190, 196);
  c.lineTo(150, 214);
  c.lineTo(96, 196);
  c.closePath();
  c.fill();
  c.fillStyle = bone(0.85);
  for (let i = 0; i < 7; i++) c.fillRect(140 + i * 8, 200 + (i % 2), 6, 12);
  c.fillStyle = bone(0.35);
  c.beginPath();
  c.ellipse(178, 130, 22, 18, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = bone(0.65);
  for (let i = 0; i < 4; i++) c.fillRect(56, 232 + i * 22, 30, 17);
  text(c, 'SKULL LAT', 244, 306, 12, '#bdbdbd', 'right');
};
/** A hand: its soft outline and the bones of the palm and fingers. */
const paintHand: Paint = (c) => {
  c.fillStyle = '#050505';
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = '#2f2f2f';
  c.beginPath();
  c.ellipse(128, 222, 66, 74, 0, 0, Math.PI * 2);
  c.fill();
  const fingers: Array<[number, number, number]> = [[78, -0.2, 0.8], [106, -0.06, 1], [134, 0.04, 1.05], [160, 0.16, 0.95]];
  c.fillStyle = bone(0.7);
  for (const [x, a, k] of fingers) {
    c.save();
    c.translate(x, 196);
    c.rotate(a);
    c.fillStyle = '#2f2f2f';
    c.fillRect(-11, -150 * k, 22, 150 * k);
    c.fillStyle = bone(0.75);
    c.fillRect(-5, -18, 10, 58);
    for (const [y, h] of [[-58, 36], [-92, 28], [-118, 20]]) c.fillRect(-5, y * k, 10, h * k);
    c.restore();
  }
  c.save();
  c.translate(186, 246);
  c.rotate(0.85);
  c.fillStyle = '#2f2f2f';
  c.fillRect(-12, -96, 24, 96);
  c.fillStyle = bone(0.75);
  for (const [y, h] of [[-30, 32], [-62, 26], [-88, 20]]) c.fillRect(-6, y, 12, h);
  c.restore();
  c.fillStyle = bone(0.6);
  for (let i = 0; i < 6; i++) c.fillRect(92 + (i % 3) * 22, 252 + Math.floor(i / 3) * 16, 18, 13);
  c.fillRect(100, 286, 20, 34);
  c.fillRect(134, 286, 22, 34);
  text(c, 'L', 14, 18, 18, '#ffffff');
  text(c, 'HAND PA', 244, 306, 12, '#bdbdbd', 'right');
};
/** A knee from the front: the thigh bone's end, the shin bones, the kneecap over the joint. */
const paintKnee: Paint = (c) => {
  c.fillStyle = '#050505';
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = '#2d2d2d';
  c.fillRect(46, 0, 164, 320);
  c.fillStyle = bone(0.7);
  c.fillRect(96, 0, 64, 110);
  c.beginPath();
  c.ellipse(104, 136, 34, 30, 0, 0, Math.PI * 2);
  c.ellipse(152, 136, 34, 30, 0, 0, Math.PI * 2);
  c.fill();
  c.fillRect(82, 178, 92, 26);
  c.fillRect(100, 200, 56, 120);
  c.fillStyle = bone(0.55);
  c.fillRect(178, 196, 18, 124);
  c.fillStyle = bone(0.4);
  c.beginPath();
  c.ellipse(128, 128, 26, 30, 0, 0, Math.PI * 2);
  c.fill();
  text(c, 'R', 14, 18, 18, '#ffffff');
  text(c, 'KNEE AP', 244, 306, 12, '#bdbdbd', 'right');
};
/** An ultrasound scan: the grey speckled fan, a kidney in it, a measurement across it. */
const paintScan: Paint = (c) => {
  c.fillStyle = '#000000';
  c.fillRect(0, 0, 320, 240);
  c.save();
  c.beginPath();
  c.moveTo(160, 22);
  c.arc(160, 22, 205, Math.PI * 0.3, Math.PI * 0.7);
  c.closePath();
  c.clip();
  c.fillStyle = '#2a2a2a';
  c.fillRect(0, 0, 320, 240);
  const r = seeded(11);
  for (let i = 0; i < 2400; i++) {
    const v = Math.floor(60 + r() * 150);
    c.fillStyle = `rgb(${v},${v},${v})`;
    c.fillRect(r() * 320, 22 + r() * 220, 2, 1.5);
  }
  c.fillStyle = 'rgba(0,0,0,0.75)';
  c.beginPath();
  c.ellipse(166, 132, 62, 34, -0.2, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(230,230,230,0.8)';
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = 'rgba(200,200,200,0.5)';
  c.beginPath();
  c.ellipse(170, 134, 24, 11, -0.2, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.strokeStyle = '#ffeb3b';
  c.setLineDash([4, 4]);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(108, 146);
  c.lineTo(224, 118);
  c.stroke();
  c.setLineDash([]);
  text(c, '+', 108, 146, 16, '#ffeb3b', 'center');
  text(c, '+', 224, 118, 16, '#ffeb3b', 'center');
  text(c, 'D1 10.2cm', 8, 226, 12, '#ffeb3b');
  text(c, 'ABD 3.5MHz', 8, 12, 12, '#4dd0e1');
  text(c, 'GAIN 52', 312, 12, 11, '#4dd0e1', 'right', false);
  c.fillStyle = '#9e9e9e';
  for (let i = 0; i < 9; i++) c.fillRect(306, 34 + i * 22, i % 2 ? 4 : 8, 2);
};
/** A patient monitor's numbers down its right side (the waves go on a strip of their own). */
export const paintVitals: Paint = (c) => {
  c.fillStyle = '#05080a';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#102027';
  c.fillRect(0, 0, 320, 20);
  text(c, '환자 감시', 8, 11, 11, '#b0bec5');
  text(c, '10:24', 312, 11, 11, '#b0bec5', 'right', false);
  const rows: Array<[string, string, string]> = [['HR', '78', '#00e676'], ['SpO₂', '98', '#18ffff'], ['RR', '16', '#ffee58']];
  rows.forEach(([k, v, col], i) => {
    const y = 24 + i * 46;
    text(c, k, 212, y + 8, 11, col);
    text(c, v, 314, y + 26, 34, col, 'right');
  });
  text(c, 'NIBP', 212, 168, 11, '#eceff1');
  text(c, '118/76', 314, 186, 18, '#eceff1', 'right');
};
/** Three traces that repeat every 64 px (ECG, the pulse, breathing every 128), so they scroll round seamlessly. */
const paintWaves: Paint = (c) => {
  c.fillStyle = '#05080a';
  c.fillRect(0, 0, 256, 192);
  c.lineWidth = 2.5;
  c.lineJoin = 'round';
  const trace = (color: string, f: (x: number) => number) => {
    c.strokeStyle = color;
    c.beginPath();
    for (let x = 0; x <= 256; x += 1) (x ? c.lineTo : c.moveTo).call(c, x, f(x));
    c.stroke();
  };
  trace('#00e676', (x) => {
    const p = x % 64;
    const base = 40;
    if (p > 8 && p < 16) return base - 5 * Math.sin(((p - 8) / 8) * Math.PI);
    if (p >= 22 && p < 25) return base + (p - 22) * 3;
    if (p >= 25 && p < 28) return base + 9 - (p - 25) * 15;
    if (p >= 28 && p < 31) return base - 36 + (p - 28) * 16;
    if (p >= 31 && p < 33) return base + 12 - (p - 31) * 6;
    if (p > 40 && p < 54) return base - 8 * Math.sin(((p - 40) / 14) * Math.PI);
    return base;
  });
  trace('#18ffff', (x) => {
    const p = (x % 64) / 64;
    return 122 - 22 * Math.exp(-(((p - 0.3) / 0.12) ** 2)) - 7 * Math.exp(-(((p - 0.6) / 0.08) ** 2));
  });
  trace('#ffee58', (x) => 170 - 10 * Math.sin((x / 128) * Math.PI * 2));
};
/** The waves on a strip of their own texture (a copy a piece, so each scrolls by itself). */
export function waves(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number): THREE.Texture {
  const tex = painted('waves', 256, 192, paintWaves).clone();
  if (tex.image) tex.needsUpdate = true;
  picture(g, tex, w, h, x, y, z);
  return tex;
}
/** A group in `parent` standing where `like` stands (for the parts of something shown only in use). */
function alongside(parent: THREE.Object3D, like: THREE.Object3D): THREE.Group {
  const m = new THREE.Group();
  m.position.copy(like.position);
  m.rotation.copy(like.rotation);
  parent.add(m);
  return m;
}
/** The lobby's screen: who's being seen in each room and who's next. */
const paintQueue: Paint = (c) => {
  c.fillStyle = '#0d3b4f';
  c.fillRect(0, 0, 640, 320);
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 640, 54);
  text(c, '진료 대기 현황', 20, 28, 30, '#ffffff');
  text(c, '10:24', 620, 28, 22, '#e0f2f1', 'right');
  const rooms: Array<[string, string, string[]]> = [
    ['진료실 1 · 내과', '김○○ 님', ['이○○ 님', '박○○ 님', '최○○ 님']],
    ['진료실 2 · 외과', '정○○ 님', ['강○○ 님', '윤○○ 님']],
  ];
  rooms.forEach(([room, now, next], i) => {
    const x = 20 + i * 312;
    c.fillStyle = '#12506a';
    c.fillRect(x, 66, 296, 214);
    text(c, room, x + 12, 86, 20, '#ffd54f');
    text(c, '진료 중', x + 12, 120, 16, '#80cbc4');
    text(c, now, x + 284, 120, 24, '#ffffff', 'right');
    c.fillStyle = '#2c6f8a';
    c.fillRect(x + 10, 138, 276, 2);
    next.forEach((n, j) => {
      text(c, `대기 ${j + 1}`, x + 12, 164 + j * 34, 15, '#b0bec5', 'left', false);
      text(c, n, x + 284, 164 + j * 34, 20, '#eceff1', 'right');
    });
  });
  c.fillStyle = '#004d40';
  c.fillRect(0, 290, 640, 30);
  text(c, '번호표를 뽑고 잠시만 기다려 주세요 · 호명 시 진료실로 들어오세요', 320, 305, 15, '#a7ffeb', 'center', false);
};
/** The surgeons' hand-scrub steps, pinned up over the sink. */
const paintScrubSteps: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 256, 44);
  text(c, '외과적 손 소독', 128, 23, 22, '#ffffff', 'center');
  const steps = ['손톱 밑 브러시', '손가락 사이', '손바닥 · 손등', '엄지 돌려 닦기', '손목에서 팔꿈치', '5분 이상, 손은 위로'];
  steps.forEach((s, i) => {
    const y = 72 + i * 42;
    c.fillStyle = '#b2dfdb';
    c.beginPath();
    c.arc(28, y, 15, 0, Math.PI * 2);
    c.fill();
    text(c, String(i + 1), 28, y + 1, 16, '#004d40', 'center');
    text(c, s, 54, y, 17, '#263238');
  });
};

// ---------------------------------------------------------------------------------------------
// Small parts.

/** A caster: its fork and wheel. */
export function caster(g: THREE.Object3D, x: number, z: number, r = 0.04) {
  part(g, box(0.03, 0.05, 0.05), '#90a4ae', x, r * 2 + 0.01, z, { outline: false });
  part(g, cyl(r, r, 0.03, 12), BLACK, x, r, z, { rz: Math.PI / 2 });
}
/** A five-legged rolling base round a post (an IV pole's, a chair's), `r` out to the wheels. */
export function starBase(g: THREE.Object3D, x: number, z: number, r: number, color = '#90a4ae') {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(g, new THREE.Vector3(x, 0.1, z), new THREE.Vector3(x + Math.sin(a) * r, 0.06, z + Math.cos(a) * r), 0.016, color);
    part(g, ball(0.026), BLACK, x + Math.sin(a) * r, 0.026, z + Math.cos(a) * r, { outline: false });
  }
  part(g, cyl(0.045, 0.05, 0.08, 12), color, x, 0.1, z, { outline: false });
}
/** A drip bag on a hook: the bag, its label, the drip chamber and the line hanging from it to `to`. */
export function dripBag(g: THREE.Object3D, x: number, y: number, z: number, to: THREE.Vector3, fluid = '#e3f4fb') {
  part(g, ring(0.012, 0.003), STEEL, x, y + 0.13, z, { outline: false });
  glass(g, rbox(0.11, 0.2, 0.03, 0.015), x, y, z, BAG);
  part(g, box(0.09, 0.12, 0.028), fluid, x, y - 0.03, z, { outline: false });
  part(g, box(0.06, 0.04, 0.032), '#ffffff', x, y + 0.03, z, { outline: false });
  part(g, cyl(0.008, 0.008, 0.03, 8), '#1e88e5', x, y - 0.115, z, { outline: false });
  glass(g, cyl(0.012, 0.012, 0.06, 10), x, y - 0.16, z);
  rod(g, new THREE.Vector3(x, y - 0.19, z), to, 0.004, '#eceff1');
}
/** The doctor's chair: a high mesh back with a headrest, arms, on a five-star base; returns its seat. */
function doctorChair(g: THREE.Group, x: number, z: number): THREE.Object3D {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = Math.PI;
  g.add(c);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.09, 0), new THREE.Vector3(Math.sin(a) * 0.25, 0.05, Math.cos(a) * 0.25), 0.016, BLACK);
    part(c, ball(0.026), BLACK, Math.sin(a) * 0.25, 0.026, Math.cos(a) * 0.25, { outline: false });
  }
  part(c, cyl(0.045, 0.05, 0.1, 12), BLACK, 0, 0.1, 0, { outline: false });
  part(c, cyl(0.026, 0.026, 0.3, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.5, 0.09, 0.48, 0.04), '#37474f', 0, 0.44, 0);
  rod(c, new THREE.Vector3(0, 0.42, -0.12), new THREE.Vector3(0, 0.6, -0.25), 0.02, BLACK);
  const back = new THREE.Group();
  back.position.set(0, 0.5, -0.24);
  back.rotation.x = -0.12;
  c.add(back);
  part(back, rbox(0.46, 0.56, 0.05, 0.04), '#263238', 0, 0.34, 0);
  part(back, rbox(0.4, 0.48, 0.02, 0.03), '#455a64', 0, 0.34, 0.026, { outline: false });
  part(back, rbox(0.36, 0.1, 0.04, 0.03), '#37474f', 0, 0.2, 0.04);
  part(back, rbox(0.3, 0.13, 0.05, 0.04), '#263238', 0, 0.72, 0.01);
  for (const sx of [-1, 1]) {
    part(c, rbox(0.04, 0.2, 0.04, 0.01), BLACK, sx * 0.26, 0.56, -0.02);
    part(c, rbox(0.07, 0.03, 0.26, 0.012), '#37474f', sx * 0.26, 0.67, 0);
  }
  return marker(g, x, 0.48, z);
}

// ---------------------------------------------------------------------------------------------
// The pieces.

// ---------------------------------------------------------------------------------------------
// The patient in a hospital bed and what's done at it (2026-11-02; the clock's in doctorMotion.ts).

const UP_Y = new THREE.Vector3(0, 1, 0);
const DR_V = new THREE.Vector3();
const STRETCH = new THREE.Vector3();
/** A cylinder stretched between two points. */
function stretch(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  STRETCH.subVectors(b, a);
  m.position.copy(a).addScaledVector(STRETCH, 0.5);
  m.scale.set(1, Math.max(0.001, STRETCH.length()), 1);
  m.quaternion.setFromUnitVectors(UP_Y, STRETCH.normalize());
}
function bedLimb(g: THREE.Object3D, r: number, color: string) {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  return (a: THREE.Vector3, b: THREE.Vector3) => stretch(m, a, b);
}
/** A ring round a limb at `at`, the limb's way `way`. */
function band(m: THREE.Object3D, at: THREE.Vector3, way: THREE.Vector3) {
  m.position.copy(at);
  m.quaternion.setFromUnitVectors(UP_Y, way);
}

interface PatientLook {
  name: string;
  hair: string;
  hairdo: 'short' | 'grey' | 'long';
  asleep: boolean;
}
/** Made-up people. */
const PATIENTS: PatientLook[] = [
  { name: '정이안', hair: '#3b2a20', hairdo: 'short', asleep: false },
  { name: '서윤정', hair: '#4a3328', hairdo: 'long', asleep: true },
  { name: '문기태', hair: '#b9b6b0', hairdo: 'grey', asleep: false },
  { name: '남보라', hair: '#2f2622', hairdo: 'long', asleep: false },
];
let hospitalBeds = 0;
const GOWN = '#bcd7e8';
const GOWN_D = '#93b9d1';
const PT_SKIN = '#ecc6a3';

type ArmPts = { shoulder: DR.P; elbow: DR.P; hand: DR.P };
/**
 * Someone lying in a bed, in a gown: built stood with the feet at the origin, facing +z, and tipped back with the
 * root (`upper` turns at the hips for the backrest). Their arms aren't theirs but the deck's, from doctorMotion's sums,
 * so what's done to an arm is done just where the dweller's hands go.
 */
function patientFigure(deck: THREE.Object3D, who: PatientLook) {
  const root = new THREE.Group();
  root.rotation.order = 'XYZ';
  root.rotation.x = -Math.PI / 2;
  deck.add(root);
  for (const sx of [-1, 1]) {
    rod(root, new THREE.Vector3(sx * 0.09, 0.84, 0), new THREE.Vector3(sx * 0.09, 0.1, 0.01), 0.056, GOWN);
    part(root, rbox(0.08, 0.06, 0.1, 0.03), PT_SKIN, sx * 0.09, 0.04, 0.02, { outline: false });
  }
  part(root, rbox(0.31, 0.16, 0.24, 0.06), GOWN, 0, 0.85, 0);
  const upper = new THREE.Group();
  upper.position.set(0, 0.84, 0);
  root.add(upper);
  part(upper, rbox(0.34, 0.46, 0.21, 0.08), GOWN, 0, 0.27, 0);
  for (let i = 0; i < 4; i++) part(upper, box(0.346, 0.012, 0.216), GOWN_D, 0, 0.1 + i * 0.1, 0, { outline: false });
  // The gown's crossed neck.
  for (const sx of [-1, 1]) part(upper, box(0.018, 0.14, 0.006), '#ffffff', sx * 0.04, 0.44, 0.108, { rz: sx * 0.5, outline: false });
  part(upper, cyl(0.045, 0.05, 0.08, 10), PT_SKIN, 0, 0.53, 0, { outline: false });
  const head = new THREE.Group();
  head.position.set(0, 0.67, 0);
  upper.add(head);
  part(head, ball(0.112), PT_SKIN, 0, 0, 0);
  const eyesM = [1, -1].map((sx) => part(head, box(0.022, 0.016, 0.006), BLACK, sx * 0.04, 0, 0.106, { outline: false }));
  for (const sx of [-1, 1]) part(head, ball(0.018), '#f2a7a0', sx * 0.065, -0.03, 0.088, { outline: false }).scale.set(1, 0.6, 0.4);
  const mouthM = part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
  part(head, ball(0.118), who.hair, 0, 0.03, -0.03);
  if (who.hairdo === 'long') for (const sx of [-1, 1]) part(head, rbox(0.05, 0.2, 0.09, 0.025), who.hair, sx * 0.1, -0.06, -0.03);
  else if (who.hairdo === 'short') part(head, rbox(0.2, 0.05, 0.05, 0.02), who.hair, 0, 0.075, 0.075, { rx: -0.25 });
  // The arms.
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const w = new THREE.Vector3();
  const arm = () => {
    const up = bedLimb(deck, 0.044, GOWN);
    const fore = bedLimb(deck, 0.036, PT_SKIN);
    const sleeve = part(deck, cyl(0.042, 0.04, 1, 8), GOWN, 0, 0, 0, { outline: false });
    const hand = part(deck, ball(0.038), PT_SKIN, 0, 0, 0, { outline: false });
    return { up, fore, sleeve, hand };
  };
  const nearArm = arm();
  const farArm = arm();
  const place = (s: ReturnType<typeof arm>, p: ArmPts, dy: number, up: boolean) => {
    const sh = new THREE.Vector3(p.shoulder[0], p.shoulder[1] + dy, p.shoulder[2]);
    a.set(p.elbow[0], p.elbow[1] + dy, p.elbow[2]);
    b.set(p.hand[0], p.hand[1] + dy, p.hand[2]);
    s.up(sh, a);
    s.fore(a, b);
    s.hand.position.copy(b);
    s.sleeve.visible = !up;
    if (!up) stretch(s.sleeve, a, w.copy(a).lerp(b, 0.62));
    return sh;
  };
  // The name bracelet, the pushed-up cuff and the tourniquet on the near arm; the cannula's tape on the far one.
  const bracelet = part(deck, cyl(0.04, 0.04, 0.018, 10), '#ffffff', 0, 0, 0, { outline: false });
  const cuff = part(deck, cyl(0.05, 0.05, 0.05, 10), GOWN_D, 0, 0, 0, { outline: false });
  const tq = new THREE.Group();
  deck.add(tq);
  part(tq, cyl(0.05, 0.05, 0.028, 12), '#1e88e5', 0, 0, 0, { outline: false });
  part(tq, box(0.016, 0.024, 0.09), '#1565c0', 0.05, 0, 0.03, { outline: false });
  const tape = part(deck, box(0.05, 0.012, 0.05), '#ffffff', 0, 0, 0, { outline: false });
  const hub = part(deck, cyl(0.008, 0.008, 0.03, 8), '#ffb74d', 0, 0, 0, { outline: false });
  const dir = new THREE.Vector3();
  return {
    root,
    upper,
    head,
    eyes: (shut: boolean) => eyesM.forEach((e) => e.scale.set(1, shut ? 0.22 : 1, 1)),
    mouth: (open: number) => mouthM.scale.set(1 - 0.3 * open, 1 + 3.2 * open, 1),
    near(p: ArmPts, dy: number, up: boolean, tied: boolean) {
      const sh = place(nearArm, p, dy, up);
      band(bracelet, w.copy(b).lerp(a, 0.14), dir.subVectors(b, a).normalize());
      cuff.visible = up;
      tq.visible = tied;
      dir.subVectors(sh, a).normalize();
      if (up) band(cuff, w.copy(a).addScaledVector(dir, 0.03), dir);
      if (tied) band(tq, w.copy(a).addScaledVector(dir, 0.08), dir);
    },
    far(p: ArmPts, dy: number) {
      place(farArm, p, dy, true);
      w.copy(a).lerp(b, 0.7);
      tape.position.set(w.x, w.y + 0.036, w.z);
      hub.position.set(w.x, w.y + 0.05, w.z);
    },
  };
}

/** The family: a body from the character pack if there is one, stood at the bed's corner. */
function guardianFigure(parent: THREE.Object3D, n: number) {
  const root = new THREE.Group();
  root.position.set(DR.GUARDIAN.x, 0, DR.GUARDIAN.z);
  root.rotation.y = DR.GUARDIAN.yaw;
  parent.add(root);
  const top = n % 2 ? '#8d9db6' : '#b08f7a';
  for (const sx of [-1, 1]) {
    rod(root, new THREE.Vector3(sx * 0.085, 0.84, 0), new THREE.Vector3(sx * 0.09, 0.08, 0.01), 0.056, '#4a4f5c');
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), '#4a4f5c', 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), PT_SKIN, 0, 1.37, 0, { outline: false });
  const head = new THREE.Group();
  head.position.set(0, 1.51, 0);
  root.add(head);
  part(head, ball(0.112), PT_SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), BLACK, sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), '#3a2d25', 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = new THREE.Vector3(sx * 0.2, 1.31, 0);
    const rest = new THREE.Vector3(sx * 0.06, 1.0, 0.18);
    const upper = bedLimb(root, 0.042, top);
    const lower = bedLimb(root, 0.035, top);
    const hand = part(root, ball(0.036), PT_SKIN, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP_Y, -root.rotation.y);
      else loc.copy(rest);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.05, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const cosA = THREE.MathUtils.clamp((0.27 * 0.27 + L * L - 0.25 * 0.25) / (2 * 0.27 * L), -1, 1);
      bend.set(sx * 0.6, -1, -0.25).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, 0.27 * cosA).addScaledVector(bend, 0.27 * Math.sqrt(1 - cosA * cosA));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  const opts: FigureOptions = { seed: 40 + n, nod: 0.2 };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  return { ...f, opts };
}

/** A blood tube: cap up (+y), its middle at the origin; `fill` scales the dark blood in it. */
function bloodTube(g: THREE.Object3D, cap: string, name: string) {
  const root = new THREE.Group();
  root.name = name;
  g.add(root);
  part(root, cyl(0.0085, 0.0085, 0.09, 10), '#e8f2f6', 0, 0, 0, { outline: false });
  part(root, cyl(0.0095, 0.0095, 0.022, 10), cap, 0, 0.052, 0, { outline: false });
  const blood = new THREE.Group();
  blood.position.y = -0.045;
  root.add(blood);
  part(blood, cyl(0.0088, 0.0088, 0.08, 10), '#5b1420', 0, 0.04, 0, { outline: false });
  const sticker = part(root, box(0.019, 0.05, 0.0204), '#ffffff', 0, -0.006, 0, { outline: false });
  for (let i = 0; i < 5; i++) part(sticker, box(0.0208, 0.0016, 0.021), '#37474f', 0, 0.018 - i * 0.008, 0, { outline: false });
  return {
    root,
    set(fill: number, labelled: boolean) {
      blood.visible = fill > 0.01;
      blood.scale.y = Math.max(0.01, fill);
      sticker.visible = labelled;
    },
  };
}
/** The tubes' two caps in the order of draw: serum (yellow), then EDTA (purple). */
const CAPS = ['#fdd835', '#8e24aa'];

function pinchedPad(g: THREE.Object3D, name: string, w: number, d: number, color: string) {
  const root = new THREE.Group();
  root.name = name;
  g.add(root);
  part(root, rbox(w, 0.006, d, 0.002), color, 0, 0, 0, { outline: false });
  return root;
}

/** The kit on the over-bed table: what the cart holds (drTreatCart), brought to the bed. */
function procedureTable(use: THREE.Object3D) {
  const root = new THREE.Group();
  use.add(root);
  const T = DR.TABLE;
  // The over-bed table: a top on a post, a low base on castors running in under the bed.
  part(root, rbox(0.38, 0.025, 0.28, 0.01), '#d7ccc8', T.x, T.y, T.z);
  part(root, box(0.035, T.y - 0.1, 0.05), STEEL, T.x + 0.21, (T.y + 0.1) / 2, T.z + 0.1);
  part(root, box(0.05, 0.03, 0.5), STEEL, T.x + 0.21, 0.08, T.z + 0.1);
  for (const sz of [-1, 1]) caster(root, T.x + 0.21, T.z + 0.1 + sz * 0.22, 0.03);
  // Gloves, swabs, gauze, tape, the rack for the tubes, the waste bag and the sharps bin.
  const H = DR.HOME;
  part(root, rbox(0.13, 0.05, 0.08, 0.004), '#eceff1', H.gloves[0], T.y + 0.04, H.gloves[2]);
  part(root, box(0.06, 0.002, 0.03), '#1e88e5', H.gloves[0], T.y + 0.066, H.gloves[2], { outline: false });
  part(root, rbox(0.06, 0.012, 0.06, 0.003), '#b3e5fc', H.swab[0], T.y + 0.018, H.swab[2], { outline: false });
  part(root, rbox(0.07, 0.012, 0.07, 0.003), '#ffffff', H.gauze[0], T.y + 0.018, H.gauze[2]);
  part(root, cyl(0.022, 0.022, 0.02, 12), '#fafafa', H.tape[0], T.y + 0.022, H.tape[2], { outline: false });
  part(root, box(0.1, 0.012, 0.03), '#90a4ae', (H.slot[0][0] + H.slot[1][0]) / 2, T.y + 0.03, H.slot[0][2]);
  const rack = H.slot.map((s, i) => {
    const tube = bloodTube(root, CAPS[i], `rackTube${i}`);
    tube.root.position.set(s[0], s[1], s[2]);
    return tube;
  });
  part(root, rbox(0.07, 0.06, 0.07, 0.01), '#ffcc80', H.bag[0], T.y + 0.04, H.bag[2]);
  part(root, rbox(0.08, 0.1, 0.07, 0.008), '#fbc02d', H.bin[0], T.y + 0.06, H.bin[2]);
  part(root, box(0.05, 0.004, 0.03), BLACK, H.bin[0], T.y + 0.112, H.bin[2], { outline: false });
  const holderHome = new THREE.Group();
  root.add(holderHome);
  part(holderHome, cyl(0.014, 0.014, 0.07, 10), '#eceff1', H.holder[0], H.holder[1] - 0.01, H.holder[2], { rz: Math.PI / 2 - 0.1 });
  return {
    root,
    show(now: DR.DrNow | null) {
      if (!now) return;
      const early = ['greet', 'band', 'rub', 'gloves', 'tie', 'feel', 'swab', 'dry'].includes(now.beat);
      holderHome.visible = early && now.tool !== 'holder';
      rack.forEach((tube, i) => {
        const away = now.tube?.which === i || (i === 1 && now.tool === 'labelTube');
        tube.root.visible = !away;
        tube.set(now.filled[i] ? 1 : 0, i === 1 && now.labelled);
      });
    },
  };
}

/** What the hands take up, each drawn to be held and with a name for the probe; `place` poses this moment's and says how it's held. */
function bedTools(use: THREE.Object3D) {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // The vacuum-tube holder: its +y the way the needle goes, the grip at the origin, a tube running on its -y.
  const holder = new THREE.Group();
  holder.name = 'bloodHolder';
  use.add(holder);
  part(holder, cyl(0.014, 0.014, 0.07, 12), '#eceff1', 0, -0.022, 0, { outline: false });
  part(holder, cyl(0.021, 0.021, 0.005, 12), '#cfd8dc', 0, -0.057, 0, { outline: false });
  part(holder, cyl(0.007, 0.007, 0.014, 10), '#43a047', 0, 0.02, 0, { outline: false });
  part(holder, cyl(0.0012, 0.0012, 0.048, 6), '#cfd8dc', 0, 0.05, 0, { outline: false });
  const tubes = CAPS.map((k, i) => bloodTube(holder, k, `heldTube${i}`));
  // Small things, pinched.
  const swab = pinchedPad(use, 'alcoholSwab', 0.045, 0.045, '#e1f5fe');
  const gauze = pinchedPad(use, 'gauzePad', 0.07, 0.07, '#ffffff');
  const old = pinchedPad(use, 'oldDressing', 0.08, 0.1, '#f3ecd8');
  const tape = pinchedPad(use, 'tapeStrip', 0.09, 0.02, '#fafafa');
  const glove = pinchedPad(use, 'gloveHeld', 0.045, 0.08, '#90caf9');
  // The label on a tube in the left hand.
  const label2 = bloodTube(use, CAPS[1], 'labelTube');
  // The pillow for behind the back: a long wedge, held in its middle; one for when it's in place.
  const wedge = (name: string) => {
    const r = new THREE.Group();
    r.name = name;
    use.add(r);
    part(r, cyl(0.15, 0.15, 0.5, 3), '#80cbc4', 0, 0, 0, { rz: Math.PI / 2 });
    return r;
  };
  const pillowTool = wedge('backPillow');
  const pillowBack = wedge('backPillowIn');
  const pillowHome = wedge('backPillowHome');
  pillowHome.position.set(DR.PILLOW_HOME[0], DR.PILLOW_HOME[1], DR.PILLOW_HOME[2]);
  // The patient's chart, on a clipboard held to be read.
  const clip = new THREE.Group();
  clip.name = 'bedChart';
  use.add(clip);
  const tilted = new THREE.Group();
  tilted.rotation.x = -0.55;
  clip.add(tilted);
  part(tilted, box(0.22, 0.3, 0.008), '#8d6e63', 0, 0, 0, { outline: false });
  part(tilted, box(0.19, 0.25, 0.002), '#ffffff', 0, -0.015, 0.006, { outline: false });
  for (let i = 0; i < 6; i++) part(tilted, box(i % 3 === 0 ? 0.15 : 0.11, 0.005, 0.001), '#90a4ae', -0.01, 0.08 - i * 0.035, 0.0075, { outline: false });
  part(tilted, box(0.08, 0.022, 0.012), CHROME, 0, 0.135, 0.008, { outline: false });
  const all: Record<DR.DrTool, THREE.Object3D> = { holder, swab, gauze, tape, glove, oldDressing: old, labelTube: label2.root, pillow: pillowTool, chart: clip };
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3();
  const local = new THREE.Vector3();
  const place = (now: DR.DrNow | null): HeldTool | null => {
    for (const o of Object.values(all)) o.visible = false;
    tubes.forEach((x) => (x.root.visible = false));
    if (!now?.tool) return null;
    const tool = all[now.tool];
    tool.visible = true;
    tool.position.fromArray(now.toolAt);
    if (now.tool === 'chart') {
      tool.rotation.set(0, now.at.yaw + Math.PI, 0);
      return { tool, lead: 'left', grips: { left: boardGrip(0.55) } };
    }
    q.setFromUnitVectors(UP_Y, up.fromArray(now.toolUp).normalize());
    tool.quaternion.copy(q);
    switch (now.tool) {
      case 'holder': {
        const grips: HeldTool['grips'] = { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.014 } };
        if (now.tube) {
          const x = tubes[now.tube.which];
          x.root.visible = true;
          x.set(now.tube.fill, false);
          local.fromArray(now.tube.at).sub(tool.position).applyQuaternion(q.clone().invert());
          x.root.position.copy(local);
          x.root.rotation.x = now.tube.rock;
          grips.left = { at: local.clone(), axis: v(0, Math.cos(now.tube.rock), Math.sin(now.tube.rock)), shape: 'pinch', radius: 0.009 };
        }
        return { tool, lead: 'right', grips };
      }
      case 'labelTube':
        label2.set(1, now.labelled);
        return { tool, lead: 'left', grips: { left: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.009 } } };
      case 'pillow':
        return { tool, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(1, 0, 0), shape: 'cradle', radius: 0.09 } } };
      default:
        return { tool, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(1, 0, 0), shape: 'pinch', radius: 0.006 } } };
    }
  };
  return { place, pillow: { back: pillowBack, home: pillowHome } };
}

/** What lies on the near arm: the pad under it, gauze and a plaster on the crease; the forearm's dressing, and under it a neat stitched line. */
function armDressings(use: THREE.Object3D) {
  const pad = part(use, rbox(0.16, 0.09, 0.36, 0.04), '#90caf9', DR.ARM_OUT.elbow[0] + 0.01, DR.TOP + 0.045, -0.36);
  const S = DR.SITE;
  const gauze = part(use, rbox(0.06, 0.008, 0.06, 0.003), '#ffffff', S[0], S[1] + 0.006, S[2], { outline: false });
  const plaster = new THREE.Group();
  plaster.position.set(S[0], S[1] + 0.006, S[2]);
  use.add(plaster);
  part(plaster, box(0.055, 0.005, 0.02), '#f0c9a0', 0, 0, 0, { outline: false });
  part(plaster, box(0.022, 0.006, 0.018), '#ffffff', 0, 0.001, 0, { outline: false });
  const W = DR.WOUND;
  const along = Math.atan2(DR.ARM_OUT.hand[0] - DR.ARM_OUT.elbow[0], DR.ARM_OUT.hand[2] - DR.ARM_OUT.elbow[2]);
  const forearm = new THREE.Group();
  forearm.position.set(W[0], W[1], W[2]);
  forearm.rotation.y = along;
  use.add(forearm);
  const line = new THREE.Group();
  forearm.add(line);
  part(line, box(0.005, 0.002, 0.07), '#c98b86', 0, 0.001, 0, { outline: false });
  for (let i = 0; i < 4; i++) part(line, box(0.018, 0.002, 0.003), '#5d6d7e', 0, 0.002, -0.027 + i * 0.018, { outline: false });
  const oldPad = part(forearm, rbox(0.075, 0.008, 0.1, 0.002), '#f3ecd8', 0, 0.004, 0, { outline: false });
  const newPad = part(forearm, rbox(0.075, 0.008, 0.1, 0.002), '#ffffff', 0, 0.004, 0, { outline: false });
  const strips = [-0.035, 0.035].map((z) => part(forearm, box(0.09, 0.003, 0.016), '#eeeeee', 0, 0.009, z, { outline: false }));
  return {
    show(now: DR.DrNow | null, m: string) {
      pad.visible = !!now?.pad;
      gauze.visible = !!now?.gauzeOn;
      plaster.visible = !!now?.plaster;
      const dressing = m === 'drDress';
      forearm.visible = dressing;
      if (dressing && now) {
        oldPad.visible = now.dressing === 'old';
        newPad.visible = now.dressing === 'new';
        line.visible = now.dressing === 'none';
        strips.forEach((s) => (s.visible = now.taped));
      }
    },
  };
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * The consulting desk: a white top on a drawer pedestal, the chart open on the big screen (lit
   * while it's worked at) and the blood results on a second one turned in beside it, keyboard and
   * mouse, a stethoscope coiled by the prescription pad, a pen cup and the hand gel; the doctor's
   * high-backed chair pulled up to it. Typed at; notes, plans and rotas are written on the pad.
   */
  medStation(g, W, D, c, _def, _ctx, out) {
    const h = 0.74;
    const d = 0.62;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    part(g, rbox(W - 0.06, 0.04, d, 0.015), '#f6f6f2', 0, h - 0.02, z);
    part(g, box(W - 0.07, 0.014, 0.012), c, 0, h - 0.03, front + 0.001, { outline: false });
    part(g, rbox(0.04, h - 0.04, d - 0.04, 0.01), '#dfe3e6', -(W / 2 - 0.06), (h - 0.04) / 2, z);
    part(g, box(W - 0.2, 0.4, 0.02), '#dfe3e6', 0, 0.46, z - d / 2 + 0.05);
    // The drawer pedestal on the right, its drawers in the desk's colour.
    const px = W / 2 - 0.2;
    part(g, rbox(0.3, h - 0.06, d - 0.06, 0.012), '#e8ecef', px, (h - 0.06) / 2, z);
    for (let i = 0; i < 3; i++) {
      const y = 0.14 + i * 0.2;
      part(g, rbox(0.26, 0.17, 0.012, 0.005), tint(c, 0.45), px, y, z + (d - 0.06) / 2 + 0.006);
      part(g, box(0.1, 0.012, 0.02), '#78909c', px, y + 0.05, z + (d - 0.06) / 2 + 0.018, { outline: false });
    }
    const top = h;
    // The chart on the main screen, on its stand.
    const mx = -0.1;
    part(g, rbox(0.2, 0.015, 0.14, 0.006), BLACK, mx, top + 0.008, z - 0.12);
    part(g, rbox(0.045, 0.2, 0.03, 0.01), BLACK, mx, top + 0.11, z - 0.16);
    part(g, rbox(0.5, 0.32, 0.03, 0.012), BLACK, mx, top + 0.34, z - 0.14);
    out.screen = litScreen(g, painted('chart', 512, 320, paintChart), 0.47, 0.29, mx, top + 0.34, z - 0.123);
    // The results on a second, smaller screen turned in at the right.
    const m2 = new THREE.Group();
    m2.position.set(0.3, top, z - 0.1);
    m2.rotation.y = -0.5;
    g.add(m2);
    part(m2, rbox(0.14, 0.012, 0.1, 0.005), BLACK, 0, 0.006, 0);
    part(m2, rbox(0.035, 0.16, 0.025, 0.008), BLACK, 0, 0.09, -0.02);
    part(m2, rbox(0.3, 0.23, 0.025, 0.01), BLACK, 0, 0.27, -0.01);
    picture(m2, painted('labs', 384, 288, paintLabs), 0.28, 0.21, 0, 0.27, 0.004, '#c9d3dc');
    // Keyboard and mouse.
    const kz = front - 0.17;
    part(g, rbox(0.38, 0.018, 0.13, 0.006), '#e9ecef', mx, top + 0.009, kz);
    for (let r = 0; r < 4; r++) part(g, box(0.34, 0.004, 0.018), '#c5cbd0', mx, top + 0.02, kz - 0.045 + r * 0.03, { outline: false });
    part(g, box(0.18, 0.004, 0.15), '#37474f', 0.24, top + 0.002, kz, { outline: false });
    part(g, rbox(0.05, 0.026, 0.08, 0.012), '#eceff1', 0.24, top + 0.016, kz);
    // The prescription pad and pen, the stethoscope coiled behind it.
    part(g, box(0.15, 0.008, 0.2), '#ffffff', -0.37, top + 0.004, front - 0.14, { ry: 0.1 });
    for (let i = 0; i < 4; i++) part(g, box(0.1, 0.002, 0.006), '#90a4ae', -0.37, top + 0.009, front - 0.2 + i * 0.03, { ry: 0.1, outline: false });
    part(g, box(0.15, 0.004, 0.04), '#1e88e5', -0.37, top + 0.009, front - 0.225, { ry: 0.1, outline: false });
    part(g, cyl(0.006, 0.006, 0.14, 6), '#263238', -0.3, top + 0.014, front - 0.12, { rz: Math.PI / 2, ry: 0.9, outline: false });
    const sx = -0.36;
    const sz = z - 0.03;
    part(g, ring(0.07, 0.007), BLACK, sx, top + 0.008, sz, { rx: Math.PI / 2, outline: false });
    part(g, ring(0.045, 0.007), BLACK, sx + 0.02, top + 0.02, sz + 0.01, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.028, 0.028, 0.014, 16), CHROME, sx + 0.08, top + 0.01, sz + 0.05);
    for (const k of [-1, 1]) rod(g, new THREE.Vector3(sx - 0.05, top + 0.01, sz - 0.04), new THREE.Vector3(sx - 0.09 + k * 0.03, top + 0.012, sz - 0.12), 0.004, CHROME);
    // A pen cup and the hand gel at the back.
    part(g, cyl(0.03, 0.027, 0.09, 12), '#455a64', -0.42, top + 0.045, z - 0.23);
    for (const [dx, k] of [[-0.01, '#1e88e5'], [0.01, '#e53935'], [0, '#263238']] as const) part(g, cyl(0.004, 0.004, 0.13, 6), k, -0.42 + dx, top + 0.1, z - 0.23 + dx, { rz: dx * 8, outline: false });
    part(g, cyl(0.03, 0.03, 0.13, 14), '#e1f5fe', -0.26, top + 0.065, z - 0.24);
    part(g, cyl(0.012, 0.012, 0.04, 8), '#ffffff', -0.26, top + 0.15, z - 0.24, { outline: false });
    part(g, box(0.05, 0.012, 0.014), '#ffffff', -0.24, top + 0.17, z - 0.24, { outline: false });
    // The chair; the keyboard is where the hands go.
    const cz = front + 0.22;
    out.seat = doctorChair(g, -0.08, cz);
    out.work = marker(g, mx, top + 0.02, kz);
    // Rounds notes, treatment plans and the rota are written by hand on the pad.
    const pad = spot(g, 'sit', -0.08, 0.48, cz, Math.PI, 0.48);
    pad.work = marker(g, -0.35, top + 0.01, front - 0.14);
    pad.motion = 'write';
    // A new nurse is taught stood at the desk's right, turned to them in the chair, pointing back at the chart.
    const teach = spot(g, 'stand', 0.55, 0, front + 0.12, Math.atan2(-0.6, 0.8));
    teach.work = marker(g, mx + 0.1, top + 0.36, z - 0.12);
    teach.motion = 'present';
    // The head vet's case meeting (and the dental clinic's team meeting) is led the same way, stood presenting on the chart.
    out.spots = { doctor_roundsNotes: pad, doctor_chronicCare: pad, drPatientList: pad, nurse_shiftRoster: pad, nurse_nurseTraining: teach, vet_clinicBudget: teach, dentist_clinicMeeting: teach };
  },

  /**
   * A light box on the wall: four panels in a white housing, each with a film clipped up — a chest,
   * a skull from the side, a hand, a knee — glowing bright while they're read; switches and a dimmer
   * along the bottom, a ledge under it with the report form and the films' envelope. (Off a wall it
   * stands on a rolling frame.) Read standing at it pointing over the films; a case conference is
   * led from its end, turned half to the room.
   */
  xrayViewer(g, W, D, _c, _def, ctx, out) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.02 : 0.2);
    const y = 1.5;
    const H = 0.58;
    const Wb = Math.min(W - 0.24, 1.76);
    if (!wall) {
      for (const sx of [-1, 1]) {
        const x = sx * (Wb / 2 - 0.08);
        part(g, rbox(0.05, y - H / 2, 0.05, 0.01), '#b0bec5', x, (y - H / 2) / 2, zb + 0.04);
        part(g, rbox(0.06, 0.04, 0.5, 0.01), '#90a4ae', x, 0.07, zb + 0.04);
        for (const dz of [-0.22, 0.22]) caster(g, x, zb + 0.04 + dz, 0.03);
      }
    }
    part(g, rbox(Wb + 0.08, H + 0.12, 0.09, 0.02), '#eceff1', 0, y, zb + 0.045);
    part(g, box(Wb, H, 0.006), '#e8f1f5', 0, y, zb + 0.092, { outline: false, material: glow('#dfeaf0') });
    const n = 4;
    const pw = Wb / n;
    for (let i = 1; i < n; i++) part(g, box(0.014, H, 0.014), '#b0bec5', -Wb / 2 + i * pw, y, zb + 0.096, { outline: false });
    const films = [['chest', paintChest], ['skull', paintSkull], ['hand', paintHand], ['knee', paintKnee]] as const;
    const bright = new THREE.Group();
    g.add(bright);
    films.forEach(([key, paint], i) => {
      const x = -Wb / 2 + pw * (i + 0.5);
      const tex = painted(`xr-${key}`, 256, 320, paint);
      picture(g, tex, pw - 0.06, H - 0.08, x, y - 0.015, zb + 0.1, '#77838c');
      picture(bright, tex, pw - 0.06, H - 0.08, x, y - 0.015, zb + 0.103);
      part(g, box(0.07, 0.025, 0.014), '#90a4ae', x, y + H / 2 - 0.035, zb + 0.108, { outline: false });
    });
    out.inUse = bright;
    // The clip rail along the top; the switches, their lights and the dimmer along the bottom.
    part(g, box(Wb, 0.03, 0.02), '#b0bec5', 0, y + H / 2 - 0.02, zb + 0.1, { outline: false });
    part(g, box(Wb + 0.08, 0.05, 0.02), '#cfd8dc', 0, y - H / 2 - 0.035, zb + 0.09);
    for (let i = 0; i < n; i++) {
      const x = -Wb / 2 + pw * (i + 0.5);
      part(g, rbox(0.04, 0.025, 0.012, 0.004), '#546e7a', x - 0.04, y - H / 2 - 0.035, zb + 0.102, { outline: false });
      glowing(g, ball(0.007), '#66bb6a', x + 0.01, y - H / 2 - 0.035, zb + 0.102);
    }
    part(g, cyl(0.018, 0.018, 0.02, 12), '#455a64', Wb / 2 - 0.02, y - H / 2 - 0.035, zb + 0.105, { rx: Math.PI / 2 });
    label(g, '영상 판독', 0.22, 0.045, -Wb / 2 + 0.16, y + H / 2 + 0.03, zb + 0.091, TEAL, '#ffffff');
    // The ledge under it: the report form and pen, the films' big brown envelope leant at the end.
    const ly = y - H / 2 - 0.2;
    part(g, rbox(1.1, 0.025, 0.16, 0.008), '#eceff1', -0.2, ly, zb + 0.08);
    for (const sx of [-0.65, 0.25]) part(g, box(0.02, 0.08, 0.12), '#b0bec5', -0.2 + sx * 0.6, ly - 0.05, zb + 0.06, { outline: false });
    part(g, box(0.2, 0.004, 0.13), '#ffffff', -0.5, ly + 0.015, zb + 0.085, { ry: 0.05 });
    for (let i = 0; i < 4; i++) part(g, box(0.14, 0.002, 0.005), '#90a4ae', -0.5, ly + 0.018, zb + 0.05 + i * 0.022, { ry: 0.05, outline: false });
    part(g, cyl(0.005, 0.005, 0.13, 6), '#1e88e5', -0.3, ly + 0.018, zb + 0.09, { rz: Math.PI / 2, ry: 0.4, outline: false });
    part(g, box(0.36, 0.44, 0.012), '#c8a165', 0.28, ly + 0.23, zb + 0.06, { rx: -0.1 });
    label(g, '영상의학과', 0.2, 0.05, 0.28, ly + 0.38, zb + 0.075, '#c8a165', '#4e342e');
    // Read standing at it, the hand going over the films; the conference is led from its right end.
    const read = spot(g, 'stand', -0.2, 0, zb + 0.6, Math.PI);
    read.work = marker(g, -0.42, y - 0.02, zb + 0.12);
    const lead = spot(g, 'stand', Wb / 2 + 0.1, 0, zb + 0.34, -1.25);
    lead.work = marker(g, Wb / 2 - pw / 2, y - 0.02, zb + 0.12);
    out.work = read.work;
    out.spots = { '*': read, doctor_caseConference: lead };
  },

  /**
   * A hospital bed with its patient in it: a steel chassis on braked casters, a deck that lifts on its
   * columns, the backrest on its hinge, a teal blanket over the legs and up over the chest, rails along the
   * head half, the near one let down for care, the chart and the name card on the footboard, the oxygen,
   * air and suction outlets on the wall behind. The patient wears a gown and a bracelet and has a drip to the far
   * arm, so the near one is free for blood (never from the arm with the drip). What's done here goes by
   * one clock with them (doctorMotion.ts); the near arm is laid on its pad, with the over-bed table and its kit
   * rolled up and the sharps bin in arm's reach, as the guideline asks.
   */
  hospitalBed(g, _W, D, c, _def, ctx, out) {
    const n = hospitalBeds++;
    const who = PATIENTS[n % PATIENTS.length];
    const len = D - 0.1;
    const hz = -len / 2;
    const B = DR.BED;
    // The chassis, lift columns and casters.
    part(g, rbox(0.66, 0.08, len - 0.4, 0.02), '#90a4ae', 0, 0.2, 0);
    for (const z of [-0.45, 0.45]) {
      part(g, cyl(0.065, 0.065, 0.3, 14), '#cfd8dc', 0, 0.36, z);
      for (let i = 0; i < 4; i++) part(g, cyl(0.07, 0.07, 0.012, 14), '#b0bec5', 0, 0.25 + i * 0.06, z, { outline: false });
    }
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        caster(g, sx * 0.3, sz * (len / 2 - 0.25), 0.05);
        part(g, box(0.05, 0.02, 0.06), sz > 0 ? '#e53935' : '#43a047', sx * 0.3, 0.15, sz * (len / 2 - 0.25) + sz * 0.06, { outline: false });
      }
    // The deck that lifts, and everything on it.
    const deck = new THREE.Group();
    g.add(deck);
    for (const z of [-0.45, 0.45]) part(deck, cyl(0.05, 0.05, 0.3, 12), STEEL, 0, 0.36, z, { outline: false });
    part(deck, rbox(0.86, 0.05, len - 0.1, 0.015), '#b0bec5', 0, 0.47, 0.02);
    // The flat part of the mattress, and the backrest on its hinge with the pillow on it.
    const flatLen = len / 2 - 0.08 - B.hinge;
    part(deck, rbox(0.84, 0.13, flatLen, 0.05), '#fbfbf9', 0, B.top - 0.065, B.hinge + flatLen / 2);
    const back = new THREE.Group();
    back.position.set(0, B.top, B.hinge);
    deck.add(back);
    part(back, rbox(0.84, 0.03, 0.66, 0.01), '#b0bec5', 0, -0.145, -0.33);
    part(back, rbox(0.84, 0.13, 0.66, 0.05), '#fbfbf9', 0, -0.065, -0.33);
    part(back, rbox(0.5, 0.065, 0.3, 0.03), '#ffffff', 0, 0.03, -0.54);
    // The blanket: over the legs, and over the chest (folded to the waist for work at the arm or a turn), the sheet turned over its edge.
    const blanket = '#80cbc4';
    const legLen = len / 2 - 0.05 - B.hinge;
    part(deck, rbox(0.86, 0.06, legLen, 0.03), blanket, 0, B.top + 0.19, B.hinge + legLen / 2);
    for (const sx of [-1, 1]) part(deck, box(0.02, 0.27, legLen), blanket, sx * 0.43, B.top + 0.07, B.hinge + legLen / 2, { outline: false });
    part(deck, box(0.86, 0.004, 0.05), '#4db6ac', 0, B.top + 0.222, B.hinge + legLen - 0.2, { outline: false });
    const chest = new THREE.Group();
    back.add(chest);
    part(chest, rbox(0.86, 0.045, 0.42, 0.02), blanket, 0, 0.24, -0.21);
    part(chest, rbox(0.86, 0.05, 0.1, 0.02), '#ffffff', 0, 0.25, -0.42);
    for (const sx of [-1, 1]) part(chest, box(0.02, 0.26, 0.42), blanket, sx * 0.43, 0.11, -0.21, { outline: false });
    const fold = part(back, cyl(0.055, 0.055, 0.86, 12), blanket, 0, 0.22, 0.02, { rz: Math.PI / 2 });
    // Head and foot boards, an accent panel in each.
    part(deck, rbox(0.94, 0.62, 0.06, 0.03), c, 0, 0.76, hz + 0.03);
    part(deck, rbox(0.72, 0.34, 0.012, 0.02), '#4db6ac', 0, 0.82, hz + 0.066, { outline: false });
    const fz = len / 2 - 0.03;
    part(deck, rbox(0.94, 0.42, 0.06, 0.03), c, 0, 0.64, fz);
    part(deck, rbox(0.72, 0.18, 0.012, 0.02), '#4db6ac', 0, 0.58, fz + 0.034, { outline: false });
    // The chart on its clipboard over the footboard, and the name card beside it (the names are made up).
    part(deck, rbox(0.24, 0.32, 0.012, 0.005), '#8d6e63', 0, 0.74, fz + 0.045);
    part(deck, box(0.21, 0.27, 0.003), '#ffffff', 0, 0.73, fz + 0.053, { outline: false });
    for (let i = 0; i < 6; i++) part(deck, box(i % 3 === 0 ? 0.16 : 0.12, 0.006, 0.002), '#90a4ae', -0.01, 0.82 - i * 0.035, fz + 0.056, { outline: false });
    part(deck, rbox(0.09, 0.03, 0.02, 0.006), CHROME, 0, 0.89, fz + 0.055);
    part(deck, box(0.2, 0.08, 0.006), '#ffffff', -0.3, 0.6, fz + 0.04, { outline: false });
    label(deck, `${who.name} 님`, 0.18, 0.06, -0.3, 0.6, fz + 0.045, '#ffffff', '#00695c');
    // Rails along the head half, their buttons outside; the foot rails folded down. The near one comes down for care.
    const railAt = (sx: number) => {
      const r = new THREE.Group();
      deck.add(r);
      const x = sx * 0.47;
      part(r, rbox(0.035, 0.26, 0.7, 0.03), '#eceff1', x, 0.8, -0.45);
      part(r, rbox(0.02, 0.14, 0.52, 0.03), '#cfd8dc', x, 0.8, -0.45, { outline: false });
      part(r, rbox(0.012, 0.08, 0.14, 0.01), '#546e7a', x + sx * 0.02, 0.84, -0.3, { outline: false });
      for (let i = 0; i < 3; i++) part(r, ball(0.008), ['#4fc3f7', '#ffffff', '#ffb74d'][i], x + sx * 0.028, 0.84, -0.34 + i * 0.04, { outline: false });
      return r;
    };
    railAt(-1);
    const nearRail = railAt(1);
    for (const sx of [-1, 1]) part(deck, rbox(0.03, 0.08, 0.62, 0.02), '#cfd8dc', sx * 0.47, 0.45, 0.48);
    // The drip on its pole at the far head corner; the call button on its cord.
    const px = -0.42;
    const pz = hz + 0.1;
    part(deck, cyl(0.013, 0.013, 1.5, 8), CHROME, px, 1.25, pz, { outline: false });
    rod(deck, new THREE.Vector3(px - 0.04, 1.98, pz), new THREE.Vector3(px + 0.1, 1.98, pz), 0.008, CHROME);
    const lineTop = new THREE.Vector3(px + 0.08, 1.55, pz);
    dripBag(deck, px + 0.08, 1.84, pz, lineTop);
    const line = bedLimb(deck, 0.004, '#eceff1');
    rod(deck, new THREE.Vector3(0.47, 0.88, -0.3), new THREE.Vector3(0.36, B.top + 0.1, -0.02), 0.005, '#cfd8dc');
    part(deck, rbox(0.045, 0.025, 0.12, 0.012), '#eceff1', 0.36, B.top + 0.09, 0.0);
    glowing(deck, cyl(0.012, 0.012, 0.006, 10), '#ef5350', 0.36, B.top + 0.105, -0.03);
    // On the wall: the gas outlets and the reading light.
    if (ctx.againstWall) {
      const wz = -D / 2 + 0.03;
      part(g, rbox(1.0, 0.16, 0.05, 0.02), '#cfd8dc', 0, 1.42, wz);
      for (const [x, k] of [[-0.32, '#43a047'], [-0.18, '#fdd835'], [-0.04, '#eceff1']] as const) {
        part(g, cyl(0.035, 0.035, 0.02, 14), k, x, 1.42, wz + 0.03, { rx: Math.PI / 2 });
        part(g, cyl(0.012, 0.012, 0.03, 8), '#78909c', x, 1.42, wz + 0.04, { rx: Math.PI / 2, outline: false });
      }
      part(g, cyl(0.03, 0.03, 0.02, 12), '#ffffff', 0.14, 1.42, wz + 0.03, { rx: Math.PI / 2 });
      glowing(g, box(0.22, 0.03, 0.01), '#fff3c4', 0.3, 1.42, wz + 0.03);
      glowing(g, cyl(0.02, 0.02, 0.01, 10), '#81c784', 0.42, 1.55, wz + 0.01, Math.PI / 2);
    }
    // The patient.
    const P = patientFigure(deck, who);
    P.root.position.set(0, B.top + B.lift, B.hinge + 0.84);
    P.head.position.z = 0.06;
    P.head.rotation.x = 0.18;

    // What's only there while work's being done.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const kit = procedureTable(use);
    const hold = bedTools(use);
    const onArm = armDressings(use);
    const pillow = hold.pillow;
    let guardian: ReturnType<typeof guardianFigure> | null = null;

    // Spots. The chart's written at the foot; an intensive-care check is made at the head, the hands at the rail's controls, clear of the patient.
    const mark = marker(g, 0, 0.6, 0);
    const at = (s: DR.SpotAt, motion: Motion) => {
      const a = spot(g, 'stand', s.x, s.y, s.z, s.yaw);
      a.work = mark;
      a.motion = motion;
      return a;
    };
    const chart = spot(g, 'stand', 0, 0, len / 2 + 0.38, Math.PI);
    chart.work = marker(g, 0, 0.75, fz + 0.06);
    chart.motion = 'write';
    const head = spot(g, 'stand', 0.68, 0, 0.02, -Math.PI / 2 - 0.7);
    head.work = marker(g, 0.46, 0.98, -0.34);
    head.motion = 'tinker';
    const make = at(DR.MAKE_AT, 'drMake');
    const spots: Record<string, Spot> = {
      '*': make,
      makeHospitalBed: make,
      drDrawBlood: at(DR.DRAW_AT, 'drBlood'),
      xwDressWound: at(DR.DRESS_AT, 'drDress'),
      xwTurnPatient: at(DR.TURN_AT, 'drTurn'),
      xwFamilyTalk: at(DR.TALK_AT, 'drTalk'),
      nurse_patientLoad: chart,
      nurse_dressingCare: head,
    };
    out.spots = spots;
    out.work = mark;

    const cur = { back: DR.IDLE_BACK, roll: 0, lift: 0, rail: 0 };
    const nearAt = new THREE.Vector3().fromArray(DR.nearRest(DR.IDLE_BACK, 0));
    const farAt = new THREE.Vector3().fromArray(DR.farRest(DR.IDLE_BACK, 0, true));
    const scratch = new THREE.Vector3();
    let last = -1;
    out.animate = (t) => {
      const dt = last < 0 ? 0.016 : Math.min(0.1, Math.max(0, t - last));
      last = t;
      // Which use is going on (the spot a dweller was posed at just now).
      let spotNow: Spot | null = null;
      let seen = -1e9;
      for (const s of Object.values(spots)) {
        const was = (s.at.userData.posedAt as number | undefined) ?? -1e9;
        if (Math.abs(t - was) < 0.6 && was > seen) {
          seen = was;
          spotNow = s;
        }
      }
      const m = (spotNow as Spot | null)?.motion;
      const now = m && DR.DR_MOTIONS.has(m as string) ? DR.drNow(m as DR.DrMotion, t, DR.drPhase(mark.getWorldPosition(scratch))) : null;
      // The bed and the patient eased into it.
      const ease = (a: number, b: number, rate: number) => a + (b - a) * (1 - Math.exp(-dt * rate));
      cur.back = ease(cur.back, now?.back ?? DR.IDLE_BACK, 3);
      cur.roll = m === 'drTurn' && now ? ease(cur.roll, now.roll, 10) : ease(cur.roll, 0, 3);
      cur.lift = ease(cur.lift, now?.raised ? 1 : 0, 2.5);
      cur.rail = ease(cur.rail, now?.raised ? 1 : 0, 4);
      deck.position.y = cur.lift * B.raise;
      back.rotation.x = cur.back;
      nearRail.position.y = -0.3 * cur.rail;
      const chestUp = now?.chest ?? true;
      chest.visible = chestUp;
      fold.visible = !chestUp;
      chest.position.y = 0.06 * Math.min(1, Math.abs(cur.roll));
      P.upper.rotation.x = cur.back;
      P.root.rotation.y = cur.roll;
      P.head.rotation.y = now?.headTurn ?? 0.12 + 0.1 * Math.sin(t * 0.13 + n);
      P.eyes(!now && who.asleep && Math.sin(t * 0.3 + n) < 0.95);
      P.mouth((now?.talk ?? 0) * 0.5 * Math.max(0, Math.sin(t * 6.5 + n)));
      // Breathing: the chest rises and falls.
      P.upper.scale.set(1, 1, 1 + 0.025 * Math.sin(t * 1.6 + n));
      // The arms, in the deck's frame.
      nearAt.lerp(scratch.fromArray(now?.nearHand ?? DR.nearRest(cur.back, cur.roll)), 1 - Math.exp(-dt * 5));
      farAt.lerp(scratch.fromArray(DR.farRest(cur.back, cur.roll, chestUp)), 1 - Math.exp(-dt * 4));
      const near = DR.patientArm(cur.back, cur.roll, 1, nearAt.toArray() as DR.P);
      const far = DR.patientArm(cur.back, cur.roll, -1, farAt.toArray() as DR.P);
      P.near(near, -B.raise, now?.sleeveUp ?? false, now?.tourniquet ?? false);
      P.far(far, -B.raise);
      // The drip's line runs to the taped cannula on the far forearm.
      scratch.set(far.elbow[0] + (far.hand[0] - far.elbow[0]) * 0.7, far.elbow[1] + (far.hand[1] - far.elbow[1]) * 0.7 - B.raise + 0.04, far.elbow[2] + (far.hand[2] - far.elbow[2]) * 0.7);
      line(lineTop, scratch);
      // What's in use.
      use.visible = !!now;
      kit.root.visible = !!now?.table;
      const held = hold.place(now);
      pillow.back.visible = !!now?.pillowIn;
      if (now?.pillowIn) {
        const w = DR.pillowAt(cur.roll);
        pillow.back.position.set(w[0] + 0.02, w[1] - 0.02, w[2]);
        pillow.back.rotation.set(0, 0, cur.roll);
      }
      pillow.home.visible = m === 'drTurn' && !now?.pillowIn && now?.tool !== 'pillow';
      onArm.show(now, m as string);
      kit.show(now);
      for (const s of Object.values(spots)) s.held = s === spotNow ? held : null;
      // The guardian comes when the first talk does (a body held for every bed would be a waste).
      if (m === 'drTalk' && !guardian) guardian = guardianFigure(use, n);
      if (guardian) {
        guardian.root.visible = m === 'drTalk';
        if (now?.guardian) {
          guardian.opts.nod = now.guardian.nod;
          guardian.head.rotation.y = -0.1;
          guardian.armR(now.guardian.hand ? DR_V.set(DR.GUARDIAN.x - 0.13, 1.14 + 0.02 * Math.sin(t * 5), DR.GUARDIAN.z - 0.3) : null);
          guardian.armL(null);
        }
      }
    };
  },

  /**
   * A medicine cabinet: white steel, glass doors over three shelves of bottles, pill pots and boxes
   * (the locked box of controlled drugs on top) that swing open while it's used, a work shelf pulled
   * out under them with the round's pill cups, a syringe and a vial on a tray by the sharps bin,
   * labelled drawers below and the sign on top. Pills are set out at the shelf, the five rights read
   * off the chart, stock put away on the shelves.
   */
  medCabinet(g, _W, D, c, _def, _ctx, out) {
    const d = 0.44;
    const z = -D / 2 + d / 2 + 0.02;
    const zf = z + d / 2;
    const H = 1.92;
    for (const sx of [-1, 1]) part(g, box(0.03, H, d), ENAMEL, sx * 0.435, H / 2, z);
    part(g, rbox(0.9, 0.05, d + 0.02, 0.01), ENAMEL, 0, H - 0.025, z);
    part(g, box(0.86, 0.08, d - 0.04), '#90a4ae', 0, 0.04, z, { outline: false });
    part(g, box(0.84, H - 0.1, 0.02), '#dce8ee', 0, H / 2, z - d / 2 + 0.01, { outline: false });
    // Drawers, labelled.
    part(g, box(0.84, 0.84, d - 0.03), ENAMEL, 0, 0.5, z - 0.01);
    const drawers = ['소독 용품', '수액 세트', '주사기', '거즈 · 붕대'];
    drawers.forEach((s, i) => {
      const y = 0.19 + i * 0.2;
      part(g, rbox(0.8, 0.17, 0.014, 0.006), tint(c, 0.3), 0, y, zf - 0.01);
      part(g, box(0.18, 0.012, 0.02), '#78909c', 0, y - 0.04, zf + 0.004, { outline: false });
      label(g, s, 0.2, 0.045, 0, y + 0.035, zf + 0.0, '#ffffff', '#37474f');
    });
    // The pulled-out work shelf: a tray of pill cups, a syringe and a vial; the sharps bin.
    const sy = 0.97;
    const sz = z + 0.14;
    part(g, rbox(0.8, 0.03, 0.46, 0.008), '#ffffff', 0, sy, sz);
    part(g, rbox(0.42, 0.03, 0.26, 0.01), '#4fc3f7', -0.12, sy + 0.03, sz + 0.06);
    const pills = ['#ffffff', '#ffb74d', '#e57373', '#ffffff', '#81c784', '#fff176'];
    for (let i = 0; i < 6; i++) {
      const x = -0.26 + (i % 3) * 0.1;
      const pz = sz + 0.02 + Math.floor(i / 3) * 0.09;
      part(g, cyl(0.024, 0.018, 0.04, 12), '#fafafa', x, sy + 0.065, pz);
      part(g, ball(0.008), pills[i], x, sy + 0.08, pz, { outline: false });
    }
    part(g, cyl(0.008, 0.008, 0.12, 8), '#ffffff', 0.02, sy + 0.055, sz + 0.12, { rz: Math.PI / 2, ry: 0.3 });
    part(g, cyl(0.002, 0.002, 0.04, 4), CHROME, 0.1, sy + 0.055, sz + 0.095, { rz: Math.PI / 2, ry: 0.3, outline: false });
    glass(g, cyl(0.014, 0.014, 0.045, 10), 0.06, sy + 0.07, sz + 0.0);
    part(g, cyl(0.015, 0.015, 0.01, 10), '#90a4ae', 0.06, sy + 0.097, sz + 0.0, { outline: false });
    part(g, rbox(0.12, 0.13, 0.1, 0.012), '#fdd835', 0.28, sy + 0.08, sz + 0.02);
    part(g, rbox(0.125, 0.025, 0.105, 0.01), '#e53935', 0.28, sy + 0.155, sz + 0.02);
    // The shelves behind the doors, stocked.
    const levels = [1.06, 1.33, 1.6];
    part(g, box(0.84, 0.02, d - 0.04), '#ffffff', 0, levels[0] - 0.01, z, { outline: false });
    const rnd = seeded(5);
    levels.forEach((ly, li) => {
      if (li) part(g, box(0.84, 0.015, d - 0.05), '#ffffff', 0, ly - 0.008, z, { outline: false });
      let x = -0.38;
      while (x < 0.36) {
        const k = Math.floor(rnd() * 4);
        if (li === 2 && x > 0.12) {
          // The controlled drugs: a little locked steel box.
          part(g, rbox(0.22, 0.13, 0.16, 0.01), '#90a4ae', 0.26, ly + 0.065, z - 0.02);
          label(g, '마약류', 0.11, 0.035, 0.26, ly + 0.075, z + 0.062, '#c62828', '#ffffff');
          part(g, box(0.03, 0.03, 0.01), '#455a64', 0.33, ly + 0.065, z + 0.064, { outline: false });
          break;
        }
        if (k === 0) {
          part(g, cyl(0.028, 0.028, 0.12, 12), '#6d4c41', x + 0.03, ly + 0.06, z + 0.04);
          part(g, cyl(0.02, 0.02, 0.025, 10), '#ffffff', x + 0.03, ly + 0.13, z + 0.04, { outline: false });
          x += 0.07;
        } else if (k === 1) {
          part(g, cyl(0.026, 0.026, 0.09, 12), '#fafafa', x + 0.028, ly + 0.045, z + 0.05);
          part(g, cyl(0.028, 0.028, 0.025, 12), ['#e53935', '#1e88e5', '#43a047'][Math.floor(rnd() * 3)], x + 0.028, ly + 0.1, z + 0.05, { outline: false });
          x += 0.065;
        } else {
          const w = 0.08 + rnd() * 0.04;
          const hh = 0.07 + rnd() * 0.08;
          part(g, box(w, hh, 0.16), '#ffffff', x + w / 2, ly + hh / 2, z + 0.0);
          part(g, box(w + 0.002, 0.018, 0.162), ['#1e88e5', '#e53935', '#fb8c00', '#8e24aa', '#00897b'][Math.floor(rnd() * 5)], x + w / 2, ly + hh * 0.7, z + 0.0, { outline: false });
          x += w + 0.012;
        }
      }
    });
    // The glass doors, hung at the sides, that open while it's used.
    out.doors = [];
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(sx * 0.42, 0, zf + 0.008);
      hinge.userData.swing = sx;
      g.add(hinge);
      const cx = -sx * 0.21;
      const y0 = 1.04;
      const y1 = 1.86;
      for (const y of [y0 + 0.02, y1 - 0.02]) part(hinge, box(0.42, 0.04, 0.02), ENAMEL, cx, y, 0);
      for (const x of [cx - 0.19, cx + 0.19]) part(hinge, box(0.04, y1 - y0, 0.02), ENAMEL, x, (y0 + y1) / 2, 0);
      glass(hinge, box(0.36, y1 - y0 - 0.06, 0.006), cx, (y0 + y1) / 2, 0, PANE);
      part(hinge, rbox(0.015, 0.12, 0.025, 0.006), '#78909c', -sx * 0.38, 1.45, 0.02);
      out.doors.push(hinge);
    }
    part(g, box(0.03, 0.04, 0.012), '#455a64', 0.03, 1.45, zf + 0.03, { outline: false });
    // The sign on top.
    part(g, rbox(0.62, 0.13, 0.03, 0.01), TEAL, 0, H + 0.065, zf - 0.05);
    label(g, '의약품 보관장', 0.56, 0.09, 0, H + 0.065, zf - 0.033, TEAL, '#ffffff');
    // Stood at it: pills set out on the tray, the chart read off, stock put up on the shelves.
    const stand = (work: THREE.Object3D, motion?: 'tinker' | 'read') => {
      const s = spot(g, 'stand', 0, 0, zf + 0.42, Math.PI);
      s.work = work;
      s.motion = motion;
      return s;
    };
    const tray = marker(g, -0.12, sy + 0.06, sz + 0.06);
    const shelves = marker(g, 0.05, 1.45, zf - 0.08);
    out.work = shelves;
    out.spots = { prepareMeds: stand(tray, 'tinker'), drPrepTheatre: stand(tray, 'tinker'), nurse_medCheck: stand(tray, 'read'), pharmacist_learnDrugs: stand(shelves, 'read'), '*': stand(shelves) };
  },

  /**
   * The operating table: a column on a base, the padded sections (headrest, back, seat, legs) with
   * steel side rails and an arm board; a surgical light on its stand with a monitor on the column; a
   * Mayo tray of instruments over the foot; a kick bucket. While it's used the patient lies under the
   * green drapes (their head behind the anaesthesia screen, so it serves a vet's patient too), the
   * field opened up, the light blazing and the vitals running. Operated on standing at its side.
   */
  surgeryTable(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.92;
    const L = Math.min(W - 0.16, 1.84);
    const Wt = 0.52;
    const zt = -0.06;
    part(g, rbox(0.9, 0.08, 0.44, 0.03), '#78909c', -0.1, 0.04, zt);
    part(g, rbox(0.8, 0.05, 0.36, 0.02), '#b0bec5', -0.1, 0.105, zt);
    part(g, rbox(0.3, top - 0.28, 0.24, 0.03), '#cfd8dc', -0.1, 0.13 + (top - 0.28) / 2, zt);
    for (let i = 0; i < 3; i++) part(g, box(0.31, 0.012, 0.25), '#b0bec5', -0.1, 0.3 + i * 0.12, zt, { outline: false });
    part(g, rbox(L, 0.06, Wt, 0.015), STEEL, 0, top - 0.1, zt);
    for (const sz of [-1, 1]) {
      part(g, box(L - 0.12, 0.03, 0.012), CHROME, 0, top - 0.1, zt + sz * (Wt / 2 + 0.025), { outline: false });
      for (const x of [-L / 2 + 0.15, 0, L / 2 - 0.15]) part(g, box(0.02, 0.03, 0.03), STEEL, x, top - 0.1, zt + sz * (Wt / 2 + 0.012), { outline: false });
    }
    // The pads, head at the right: headrest, back, seat, legs.
    const pads: Array<[number, number, number]> = [[L / 2 - 0.15, 0.26, 0.3], [L / 2 - 0.6, 0.6, Wt], [-0.12, 0.42, Wt], [-L / 2 + 0.29, 0.56, Wt]];
    for (const [x, l, w] of pads) part(g, rbox(l - 0.02, 0.07, w - 0.02, 0.03), '#37474f', x, top - 0.035, zt);
    // An arm board out at the back.
    const arm = new THREE.Group();
    arm.position.set(L / 2 - 0.55, top - 0.04, zt - Wt / 2);
    arm.rotation.y = -0.35;
    g.add(arm);
    part(arm, rbox(0.14, 0.05, 0.46, 0.02), '#37474f', 0, 0, -0.23);
    part(arm, box(0.04, 0.05, 0.08), STEEL, 0, -0.03, -0.02, { outline: false });
    // Idle: a clean sheet on it and the drapes folded at the foot.
    const idle = new THREE.Group();
    g.add(idle);
    part(idle, box(L - 0.1, 0.006, Wt - 0.04), '#ffffff', 0, top + 0.004, zt, { outline: false });
    for (let i = 0; i < 3; i++) part(idle, rbox(0.34, 0.035, 0.3, 0.01), i === 1 ? '#5fa595' : DRAPE, -L / 2 + 0.26, top + 0.03 + i * 0.035, zt);
    out.idle = idle;
    // In use: the patient under the drapes, the screen at the head, the field open.
    const use = new THREE.Group();
    g.add(use);
    part(use, rbox(1.4, 0.2, 0.44, 0.1), DRAPE, -0.12, top + 0.08, zt);
    for (const sz of [-1, 1]) part(use, box(L - 0.04, 0.3, 0.01), DRAPE, -0.02, top - 0.09, zt + sz * (Wt / 2 + 0.045), { outline: false });
    part(use, box(0.01, 0.3, Wt + 0.08), DRAPE, -L / 2 - 0.01, top - 0.09, zt, { outline: false });
    const ex = L / 2 - 0.32;
    for (const sz of [-1, 1]) rod(use, new THREE.Vector3(ex, top - 0.08, zt + sz * (Wt / 2 + 0.03)), new THREE.Vector3(ex, top + 0.5, zt + sz * (Wt / 2 + 0.03)), 0.01, CHROME);
    rod(use, new THREE.Vector3(ex, top + 0.5, zt - Wt / 2 - 0.03), new THREE.Vector3(ex, top + 0.5, zt + Wt / 2 + 0.03), 0.01, CHROME);
    part(use, box(0.012, 0.56, Wt + 0.1), '#4f9a89', ex, top + 0.22, zt);
    part(use, box(0.2, 0.006, 0.14), '#c98b5a', 0.1, top + 0.183, zt + 0.02, { outline: false });
    part(use, box(0.11, 0.004, 0.008), '#b71c1c', 0.1, top + 0.187, zt + 0.02, { outline: false });
    for (const dx of [-0.07, 0.07]) part(use, ring(0.03, 0.004, Math.PI), CHROME, 0.1 + dx, top + 0.19, zt + 0.02, { ry: Math.PI / 2, outline: false });
    for (const [x, z, r] of [[0.28, 0.1, 0.4], [0.3, 0.06, -0.2], [-0.1, 0.12, 0.9]] as const) part(use, box(0.12, 0.006, 0.012), CHROME, x, top + 0.185, zt + z, { ry: r, outline: false });
    part(use, box(0.08, 0.01, 0.08), '#ffffff', -0.1, top + 0.186, zt + 0.08, { outline: false });
    part(use, box(0.06, 0.01, 0.06), '#ef9a9a', -0.06, top + 0.192, zt + 0.1, { outline: false });
    out.inUse = use;
    // The surgical light on its stand behind, the vitals monitor on its column.
    const lx = L / 2 - 0.05;
    const lz = -0.42;
    part(g, rbox(0.5, 0.06, 0.16, 0.02), '#cfd8dc', lx - 0.1, 0.09, lz + 0.02);
    for (const dx of [-0.32, 0.12]) caster(g, lx + dx, lz + 0.02, 0.035);
    part(g, cyl(0.04, 0.045, 2.05, 12), '#eceff1', lx, 1.1, lz);
    part(g, ball(0.055), '#b0bec5', lx, 2.14, lz);
    const hx = 0.1;
    const hzz = zt + 0.04;
    rod(g, new THREE.Vector3(lx, 2.14, lz), new THREE.Vector3(hx + 0.15, 2.1, hzz - 0.05), 0.022, '#eceff1');
    part(g, ball(0.035), '#b0bec5', hx + 0.15, 2.1, hzz - 0.05);
    rod(g, new THREE.Vector3(hx + 0.15, 2.1, hzz - 0.05), new THREE.Vector3(hx, 1.84, hzz), 0.018, '#eceff1');
    const head = new THREE.Group();
    head.position.set(hx, 1.78, hzz);
    head.rotation.z = 0.12;
    g.add(head);
    part(head, cyl(0.12, 0.3, 0.12, 28), '#eceff1', 0, 0.02, 0);
    part(head, cyl(0.285, 0.285, 0.01, 28), '#b0bec5', 0, -0.045, 0, { outline: false });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(head, cyl(0.035, 0.035, 0.012, 10), '#cfd8dc', Math.cos(a) * 0.18, -0.05, Math.sin(a) * 0.18, { outline: false });
    }
    part(head, cyl(0.025, 0.03, 0.12, 10), '#78909c', 0, -0.1, 0, { outline: false });
    // Lit while operating: the light's face blazing.
    glowing(alongside(use, head), cyl(0.27, 0.27, 0.008, 28), '#fffbe6', 0, -0.053, 0);
    const mon = new THREE.Group();
    mon.position.set(lx - 0.02, 1.45, lz + 0.06);
    mon.rotation.y = -0.45;
    g.add(mon);
    part(mon, rbox(0.38, 0.27, 0.05, 0.015), BLACK, 0, 0, 0);
    part(mon, box(0.06, 0.06, 0.06), '#78909c', 0, 0, -0.05, { outline: false });
    out.screen = litScreen(mon, painted('vitals', 320, 200, paintVitals), 0.34, 0.22, 0, 0, 0.022);
    // The traces show (and run) only while the patient's on the table.
    const strip = waves(alongside(use, mon), 0.22, 0.19, -0.055, -0.005, 0.034);
    out.animate = (t) => {
      strip.offset.x = (t * 0.35) % 1;
    };
    // The Mayo tray of instruments over the foot, on its stand.
    const mx = -L / 2 + 0.3;
    part(g, rbox(0.06, 0.05, 0.5, 0.01), '#b0bec5', -W / 2 + 0.08, 0.04, zt);
    part(g, cyl(0.016, 0.016, top + 0.2, 8), CHROME, -W / 2 + 0.08, (top + 0.2) / 2, zt, { outline: false });
    rod(g, new THREE.Vector3(-W / 2 + 0.08, top + 0.2, zt), new THREE.Vector3(mx, top + 0.2, zt), 0.014, CHROME);
    part(g, rbox(0.44, 0.02, 0.32, 0.006), STEEL, mx, top + 0.22, zt);
    part(g, box(0.42, 0.004, 0.3), '#5fa595', mx, top + 0.232, zt, { outline: false });
    for (let i = 0; i < 6; i++) {
      const x = mx - 0.16 + i * 0.065;
      part(g, box(0.012, 0.006, 0.17), CHROME, x, top + 0.238, zt - 0.02, { outline: false });
      part(g, ring(0.012, 0.003), CHROME, x, top + 0.238, zt + 0.08, { rx: Math.PI / 2, outline: false });
    }
    part(g, box(0.09, 0.008, 0.07), '#ffffff', mx + 0.12, top + 0.24, zt + 0.1, { outline: false });
    // The kick bucket at the front corner.
    part(g, cyl(0.14, 0.12, 0.26, 18), STEEL, -W / 2 + 0.2, 0.2, 0.3);
    part(g, cyl(0.125, 0.125, 0.01, 18), '#78909c', -W / 2 + 0.2, 0.33, 0.3, { outline: false });
    part(g, ring(0.13, 0.012), '#90a4ae', -W / 2 + 0.2, 0.06, 0.3, { rx: Math.PI / 2, outline: false });
    // Operated on standing at its front, the hands in the field.
    const surgeon = spot(g, 'stand', 0.1, 0, zt + Wt / 2 + 0.22, Math.PI);
    surgeon.work = marker(g, 0.1, top + 0.13, zt + 0.06);
    out.work = surgeon.work;
    out.spots = { '*': surgeon };
  },

  /**
   * An ultrasound cart: a white body on casters, a tilted console of keys, a trackball and gain
   * sliders with a handle along its front, three probes in their holders with the cables looping
   * down, a bottle of gel, a thermal printer, and the scan up on its screen (lit while it's read).
   * Read standing at the console, a hand on the trackball.
   */
  drUltrasound(g, _W, _D, _c, _def, _ctx, out) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * 0.24, -0.05 + sz * 0.25, 0.045);
    part(g, rbox(0.56, 0.08, 0.6, 0.03), '#cfd8dc', 0, 0.14, -0.05);
    part(g, rbox(0.5, 0.56, 0.5, 0.05), '#f5f5f5', 0, 0.46, -0.1);
    part(g, box(0.51, 0.04, 0.51), '#4db6ac', 0, 0.3, -0.1, { outline: false });
    part(g, rbox(0.22, 0.08, 0.02, 0.01), '#37474f', 0.08, 0.6, 0.155);
    part(g, box(0.1, 0.004, 0.06), '#ffffff', 0.08, 0.565, 0.17, { rx: 0.5, outline: false });
    label(g, '초음파 진단기', 0.26, 0.05, -0.1, 0.44, 0.152, '#ffffff', TEAL);
    // The console.
    const con = new THREE.Group();
    con.position.set(0, 0.86, 0.04);
    con.rotation.x = -0.2;
    g.add(con);
    part(con, rbox(0.62, 0.06, 0.42, 0.03), '#eceff1', 0, 0, 0);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) part(con, rbox(0.04, 0.012, 0.03, 0.006), '#cfd8dc', -0.25 + k * 0.05, 0.034, -0.14 + r * 0.045, { outline: false });
    part(con, ring(0.05, 0.008), '#90a4ae', 0.12, 0.034, 0.08, { rx: Math.PI / 2, outline: false });
    part(con, ball(0.04), '#455a64', 0.12, 0.035, 0.08);
    for (const [x, k] of [[0.22, '#43a047'], [0.25, '#fdd835'], [0.22, '#1e88e5']] as const) part(con, cyl(0.014, 0.014, 0.012, 10), k, x, 0.036, k === '#1e88e5' ? 0.12 : 0.04, { outline: false });
    for (let i = 0; i < 8; i++) {
      part(con, box(0.006, 0.004, 0.08), '#78909c', -0.24 + i * 0.03, 0.033, 0.08, { outline: false });
      part(con, box(0.018, 0.014, 0.012), '#eceff1', -0.24 + i * 0.03, 0.04, 0.06 + ((i * 7) % 5) * 0.012);
    }
    rod(con, new THREE.Vector3(-0.3, 0.0, 0.25), new THREE.Vector3(0.3, 0.0, 0.25), 0.014, '#b0bec5');
    for (const sx of [-1, 1]) rod(con, new THREE.Vector3(sx * 0.28, 0.0, 0.2), new THREE.Vector3(sx * 0.3, 0.0, 0.25), 0.012, '#b0bec5');
    // Probes in their holders on the right, cables looping down; the gel on the left.
    for (let i = 0; i < 3; i++) {
      const z = -0.18 + i * 0.12;
      part(g, cyl(0.03, 0.025, 0.06, 10), '#90a4ae', 0.31, 0.84, z);
      part(g, rbox(0.04, 0.12, 0.03, 0.014), ['#eceff1', '#cfd8dc', '#eceff1'][i], 0.31, 0.9, z);
      rod(g, new THREE.Vector3(0.31, 0.8, z), new THREE.Vector3(0.36, 0.45, z + 0.04), 0.008, '#37474f');
      rod(g, new THREE.Vector3(0.36, 0.45, z + 0.04), new THREE.Vector3(0.26, 0.3, z), 0.008, '#37474f');
    }
    part(g, cyl(0.035, 0.03, 0.06, 10), '#90a4ae', -0.32, 0.84, -0.05);
    part(g, cyl(0.026, 0.026, 0.16, 12), '#81d4fa', -0.32, 0.92, -0.05);
    part(g, cyl(0.012, 0.018, 0.03, 10), '#ffffff', -0.32, 1.015, -0.05, { outline: false });
    // The screen up on its arm.
    part(g, rbox(0.06, 0.4, 0.05, 0.015), '#cfd8dc', 0, 1.08, -0.22);
    const scr = new THREE.Group();
    scr.position.set(0, 1.42, -0.18);
    scr.rotation.x = -0.08;
    g.add(scr);
    part(scr, rbox(0.52, 0.38, 0.045, 0.015), BLACK, 0, 0, 0);
    out.screen = litScreen(scr, painted('scan', 320, 240, paintScan), 0.48, 0.34, 0, 0, 0.018);
    out.work = marker(g, 0.06, 0.92, 0.1);
    const read = spot(g, 'stand', 0, 0, 0.55, Math.PI);
    read.work = out.work;
    read.motion = 'type';
    out.spots = { '*': read };
  },

  /**
   * A patient monitor on a rolling IV pole: the screen of traces and numbers (always on, the traces
   * running while it's checked), an infusion pump and a syringe driver clamped to the pole, two
   * bags hanging from its hooks with their lines away to the bed beside it, a basket of gloves.
   * Checked standing at it, a finger on the screen.
   */
  drBedsideMonitor(g, _W, _D, _c, _def, _ctx, out) {
    const pz = -0.12;
    starBase(g, 0, pz, 0.28);
    part(g, cyl(0.016, 0.016, 1.95, 10), CHROME, 0, 1.05, pz, { outline: false });
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(0, 2.0, pz), new THREE.Vector3(sx * 0.12, 2.03, pz), 0.008, CHROME);
    part(g, ball(0.02), CHROME, 0, 2.02, pz, { outline: false });
    const bed = (y: number) => new THREE.Vector3(-0.5, y, pz + 0.05);
    dripBag(g, -0.1, 1.88, pz, new THREE.Vector3(-0.06, 1.12, pz + 0.07));
    dripBag(g, 0.1, 1.88, pz, new THREE.Vector3(0.06, 1.12, pz + 0.07), '#fff9c4');
    // The pump and the syringe driver, the lines on to the bed.
    part(g, rbox(0.17, 0.22, 0.12, 0.02), '#f5f5f5', 0, 1.02, pz + 0.05);
    glowing(g, box(0.1, 0.05, 0.004), '#80deea', 0, 1.08, pz + 0.112);
    for (let i = 0; i < 3; i++) part(g, cyl(0.01, 0.01, 0.008, 8), ['#43a047', '#eceff1', '#e53935'][i], -0.04 + i * 0.04, 0.99, pz + 0.112, { rx: Math.PI / 2, outline: false });
    part(g, rbox(0.24, 0.08, 0.1, 0.015), '#eceff1', 0, 0.8, pz + 0.04);
    part(g, cyl(0.015, 0.015, 0.16, 10), '#ffffff', 0, 0.83, pz + 0.1, { rz: Math.PI / 2 });
    glowing(g, box(0.05, 0.02, 0.004), '#ffb74d', 0.08, 0.79, pz + 0.092);
    rod(g, new THREE.Vector3(-0.08, 0.95, pz + 0.07), bed(0.85), 0.004, '#eceff1');
    rod(g, new THREE.Vector3(-0.12, 0.8, pz + 0.07), bed(0.75), 0.004, '#eceff1');
    // The monitor up top, its handle and alarm light.
    const my = 1.42;
    const mz = pz + 0.09;
    part(g, box(0.06, 0.06, 0.08), '#90a4ae', 0, my, pz + 0.02, { outline: false });
    part(g, rbox(0.42, 0.32, 0.08, 0.025), '#eceff1', 0, my, mz);
    part(g, rbox(0.36, 0.24, 0.01, 0.01), BLACK, 0, my, mz + 0.04, { outline: false });
    picture(g, painted('vitals', 320, 200, paintVitals), 0.34, 0.22, 0, my, mz + 0.046);
    const strip = waves(g, 0.22, 0.19, -0.055, my - 0.005, mz + 0.048);
    part(g, rbox(0.2, 0.03, 0.03, 0.012), '#b0bec5', 0, my + 0.18, mz);
    glowing(g, box(0.08, 0.018, 0.02), '#66bb6a', 0.14, my + 0.17, mz);
    rod(g, new THREE.Vector3(-0.2, my - 0.1, mz), bed(0.9), 0.005, '#546e7a');
    // A basket of gloves on the pole.
    part(g, box(0.22, 0.1, 0.14), '#b0bec5', 0, 0.55, pz + 0.04);
    part(g, rbox(0.12, 0.06, 0.08, 0.01), '#bbdefb', -0.04, 0.62, pz + 0.04);
    part(g, rbox(0.06, 0.08, 0.06, 0.01), '#ffffff', 0.07, 0.62, pz + 0.04);
    out.animate = (t) => {
      strip.offset.x = (t * 0.35) % 1;
    };
    out.work = marker(g, 0.06, my, mz + 0.05);
    const look = spot(g, 'stand', 0, 0, 0.42, Math.PI);
    look.work = out.work;
    look.motion = 'board';
    out.spots = { '*': look };
  },

  /**
   * The theatre's scrub sink: a long steel trough on legs with a steel splashback, two gooseneck
   * taps with sensor eyes (the water running while they're used), knee pedals under, the scrub
   * soap and brush dispensers, the steps of a surgical scrub pinned up and the 5-minute timer over
   * it. Scrubbed at the left tap, hands up over the trough.
   */
  drScrubSink(g, W, D, _c, _def, _ctx, out) {
    const d = 0.6;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const w = Math.min(W - 0.2, 1.8);
    const wz = -D / 2 + 0.03;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.022, 0.022, 0.6, 8), STEEL, sx * (w / 2 - 0.08), 0.3, z + sz * (d / 2 - 0.08), { outline: false });
    part(g, rbox(w, 0.38, d, 0.03), '#cfd8dc', 0, 0.77, z);
    part(g, box(w - 0.12, 0.012, d - 0.14), '#7b8a93', 0, 0.955, z + 0.02, { outline: false });
    for (const x of [-0.45, 0.45]) part(g, cyl(0.03, 0.03, 0.004, 12), '#455a64', x, 0.962, z + 0.02, { outline: false });
    part(g, box(w, 0.02, 0.02), '#b0bec5', 0, 0.95, front, { outline: false });
    part(g, rbox(w, 0.6, 0.03, 0.01), '#cfd8dc', 0, 1.26, wz);
    // The taps, their sensor eyes and knee pedals; the water.
    const water = new THREE.Group();
    g.add(water);
    for (const x of [-0.45, 0.45]) {
      part(g, rbox(0.08, 0.06, 0.06, 0.015), '#b0bec5', x, 1.25, wz + 0.04);
      rod(g, new THREE.Vector3(x, 1.25, wz + 0.05), new THREE.Vector3(x, 1.32, wz + 0.2), 0.016, CHROME);
      rod(g, new THREE.Vector3(x, 1.32, wz + 0.2), new THREE.Vector3(x, 1.2, wz + 0.29), 0.016, CHROME);
      part(g, rbox(0.04, 0.02, 0.02, 0.006), BLACK, x, 1.2, wz + 0.04, { outline: false });
      glowing(g, ball(0.006), '#ef5350', x + 0.012, 1.2, wz + 0.052);
      part(g, rbox(0.16, 0.12, 0.03, 0.01), '#455a64', x, 0.46, front + 0.02);
      const stream = new THREE.Mesh(cyl(0.008, 0.012, 0.24, 8), WATER);
      stream.position.set(x, 1.07, wz + 0.29);
      stream.renderOrder = 2;
      water.add(stream);
    }
    out.inUse = water;
    // The scrub soap in the middle, the brush dispensers at the ends.
    part(g, rbox(0.1, 0.22, 0.08, 0.015), '#ffffff', 0, 1.3, wz + 0.055);
    part(g, box(0.05, 0.08, 0.004), '#f48fb1', 0, 1.32, wz + 0.096, { outline: false });
    part(g, rbox(0.06, 0.02, 0.05, 0.008), '#90a4ae', 0, 1.18, wz + 0.08);
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.1);
      part(g, rbox(0.14, 0.24, 0.1, 0.015), '#eceff1', x, 1.32, wz + 0.065);
      for (let i = 0; i < 3; i++) part(g, rbox(0.03, 0.05, 0.02, 0.008), ['#ff9800', '#fdd835', '#ff9800'][i], x - 0.04 + i * 0.04, 1.2, wz + 0.11);
      label(g, '브러시', 0.1, 0.035, x, 1.4, wz + 0.116, '#eceff1', '#37474f');
    }
    // The steps pinned up, the timer and the sign over it.
    picture(g, painted('scrubSteps', 256, 320, paintScrubSteps), 0.26, 0.32, -0.62, 1.78, wz + 0.01);
    part(g, rbox(0.4, 0.13, 0.05, 0.015), BLACK, 0.15, 1.72, wz + 0.025);
    label(g, '05:00', 0.3, 0.09, 0.15, 1.72, wz + 0.052, '#1a0d0d', '#ff5252');
    label(g, '수술 전 손 소독', 0.62, 0.1, 0.15, 1.88, wz + 0.01, TEAL, '#ffffff');
    // Scrubbed at the left tap, the hands up over the trough.
    const scrub = spot(g, 'stand', -0.45, 0, front + 0.25, Math.PI);
    scrub.work = marker(g, -0.45, 1.04, z + 0.12);
    out.work = scrub.work;
    out.spots = { '*': scrub };
  },

  /**
   * The treatment cart: a three-shelf steel trolley on castors, a railed top with what a blood draw and a dressing
   * want laid out on it, in reach of a bed: the gloves' box, the tubes in their rack in the colours of the order of draw,
   * the holder and needles, swabs, gauze, tape, the tourniquet looped over the rail, and the yellow sharps bin at its corner.
   */
  drTreatCart(g) {
    const w = 0.68;
    const d = 0.5;
    const z0 = -0.08;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        caster(g, sx * (w / 2 - 0.05), z0 + sz * (d / 2 - 0.05), 0.04);
        part(g, cyl(0.012, 0.012, 0.78, 8), STEEL, sx * (w / 2 - 0.03), 0.5, z0 + sz * (d / 2 - 0.03), { outline: false });
      }
    for (const y of [0.22, 0.54]) part(g, rbox(w, 0.025, d, 0.008), ENAMEL, 0, y, z0);
    const top = 0.9;
    part(g, rbox(w + 0.02, 0.03, d + 0.02, 0.01), '#eceff1', 0, top - 0.015, z0);
    for (const sx of [-1, 1]) part(g, box(0.012, 0.03, d), CHROME, sx * (w / 2 + 0.005), top + 0.012, z0, { outline: false });
    part(g, box(w, 0.03, 0.012), CHROME, 0, top + 0.012, z0 - d / 2, { outline: false });
    // A drawer with its label, boxes of stock on the lower shelf.
    part(g, rbox(w - 0.1, 0.13, 0.03, 0.008), '#cfd8dc', 0, 0.74, z0 + d / 2 - 0.01);
    part(g, box(0.14, 0.012, 0.018), '#78909c', 0, 0.71, z0 + d / 2 + 0.012, { outline: false });
    label(g, '처치 카트', 0.2, 0.05, 0, 0.77, z0 + d / 2 + 0.008, '#cfd8dc', '#37474f');
    for (const [x, k, h] of [[-0.18, '#e3f2fd', 0.14], [0.03, '#fff8e1', 0.1], [0.2, '#e8f5e9', 0.12]] as const) part(g, rbox(0.15, h, 0.26, 0.008), k, x, 0.235 + h / 2, z0);
    part(g, rbox(0.42, 0.1, 0.28, 0.01), '#f5f5f5', -0.06, 0.6, z0);
    // On top: the gloves' box.
    part(g, rbox(0.15, 0.07, 0.09, 0.005), '#eceff1', -0.22, top + 0.035, z0 - 0.14);
    part(g, box(0.09, 0.002, 0.04), '#1e88e5', -0.22, top + 0.071, z0 - 0.14, { outline: false });
    part(g, rbox(0.075, 0.03, 0.05, 0.01), '#64b5f6', -0.22, top + 0.085, z0 - 0.14, { outline: false });
    // The rack of tubes: order of draw, left to right (citrate, serum, heparin, EDTA, fluoride).
    part(g, box(0.2, 0.012, 0.05), '#90a4ae', 0.03, top + 0.012, z0 - 0.14);
    part(g, box(0.2, 0.012, 0.05), '#90a4ae', 0.03, top + 0.06, z0 - 0.14);
    for (const sx of [-1, 1]) part(g, box(0.008, 0.06, 0.05), '#78909c', 0.03 + sx * 0.1, top + 0.036, z0 - 0.14, { outline: false });
    ['#4fc3f7', '#fdd835', '#43a047', '#8e24aa', '#90a4ae'].forEach((k, i) => {
      const x = -0.05 + i * 0.04;
      part(g, cyl(0.0085, 0.0085, 0.09, 8), '#e8f2f6', x, top + 0.052, z0 - 0.14, { outline: false });
      part(g, cyl(0.0095, 0.0095, 0.022, 8), k, x, top + 0.105, z0 - 0.14, { outline: false });
    });
    // The holders and needles, in their tray.
    part(g, rbox(0.16, 0.012, 0.1, 0.004), '#eceff1', -0.2, top + 0.008, z0 + 0.07);
    for (let i = 0; i < 3; i++) {
      part(g, cyl(0.012, 0.012, 0.06, 8), '#f5f5f5', -0.24 + i * 0.04, top + 0.024, z0 + 0.07, { rx: Math.PI / 2, outline: false });
      part(g, cyl(0.007, 0.007, 0.03, 8), '#43a047', -0.24 + i * 0.04, top + 0.024, z0 + 0.115, { rx: Math.PI / 2, outline: false });
    }
    // Swabs, gauze, the roll of tape.
    part(g, rbox(0.07, 0.04, 0.07, 0.006), '#b3e5fc', -0.02, top + 0.02, z0 + 0.1);
    label(g, '알코올 솜', 0.06, 0.018, -0.02, top + 0.021, z0 + 0.137, '#b3e5fc', '#01579b');
    for (let i = 0; i < 3; i++) part(g, rbox(0.08, 0.012, 0.08, 0.002), '#ffffff', 0.09, top + 0.008 + i * 0.012, z0 + 0.09 - i * 0.003);
    part(g, cyl(0.028, 0.028, 0.024, 14), '#fafafa', 0.02, top + 0.012, z0 + 0.01);
    part(g, cyl(0.016, 0.016, 0.026, 12), '#bdbdbd', 0.02, top + 0.012, z0 + 0.01, { outline: false });
    // The tourniquet, looped over the side rail.
    part(g, box(0.026, 0.14, 0.004), '#1e88e5', -w / 2 - 0.012, top - 0.05, z0 + 0.08, { outline: false });
    part(g, box(0.026, 0.1, 0.004), '#1565c0', -w / 2 - 0.012, top - 0.03, z0 + 0.04, { outline: false });
    // The sharps bin: yellow, its lid's mouth black, at the near corner.
    const bx = w / 2 - 0.07;
    const bz = z0 + 0.1;
    part(g, rbox(0.11, 0.17, 0.11, 0.01), '#fbc02d', bx, top + 0.085, bz);
    part(g, rbox(0.12, 0.022, 0.12, 0.006), '#f57f17', bx, top + 0.18, bz);
    part(g, box(0.07, 0.004, 0.035), BLACK, bx, top + 0.192, bz, { outline: false });
    label(g, '손상성', 0.08, 0.03, bx, top + 0.1, bz + 0.057, '#fbc02d', '#b71c1c');
  },

  /**
   * The anaesthesia machine at the head of the table: a drawer cart on casters, a tower with the gas
   * flowmeters and two vaporisers, the bellows in their clear case, the breathing hoses away to
   * the table, a mask on its hook, the oxygen and nitrous cylinders behind and the monitor on top.
   */
  drAnesthesiaCart(g, _W, _D, _c, _def, _ctx) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * 0.3, -0.1 + sz * 0.22, 0.04);
    part(g, rbox(0.7, 0.8, 0.55, 0.03), '#eceff1', 0, 0.49, -0.1);
    for (let i = 0; i < 3; i++) {
      const y = 0.25 + i * 0.22;
      part(g, rbox(0.62, 0.18, 0.012, 0.006), '#cfd8dc', 0, y, 0.18);
      part(g, box(0.16, 0.012, 0.02), '#78909c', 0, y + 0.04, 0.19, { outline: false });
    }
    part(g, rbox(0.76, 0.04, 0.6, 0.012), '#cfd8dc', 0, 0.91, -0.08);
    part(g, rbox(0.6, 0.5, 0.32, 0.03), '#e0e0e0', 0.02, 1.18, -0.22);
    label(g, '마취기', 0.16, 0.05, 0.2, 1.38, -0.059, '#e0e0e0', '#37474f');
    // The flowmeters: glass tubes with their floats, the knobs under.
    for (const [i, k] of ['#43a047', '#1e88e5', '#fdd835'].entries()) {
      const x = -0.2 + i * 0.07;
      glass(g, cyl(0.014, 0.014, 0.22, 10), x, 1.2, -0.05);
      part(g, ball(0.013), k, x, 1.14 + i * 0.04, -0.05, { outline: false });
      part(g, cyl(0.02, 0.02, 0.03, 10), k, x, 1.06, -0.04, { rx: Math.PI / 2 });
    }
    for (const [i, k] of ['#ffeb3b', '#7e57c2'].entries()) {
      part(g, rbox(0.1, 0.2, 0.11, 0.02), k, 0.12 + i * 0.12, 1.2, -0.02);
      part(g, cyl(0.03, 0.03, 0.03, 12), '#eceff1', 0.12 + i * 0.12, 1.32, -0.02);
    }
    // The bellows in their case on the left of the worktop.
    glass(g, cyl(0.075, 0.075, 0.26, 16), -0.25, 1.06, 0.1);
    for (let i = 0; i < 5; i++) part(g, cyl(0.06, 0.06, 0.025, 16), '#90caf9', -0.25, 0.96 + i * 0.04, 0.1, { outline: false });
    part(g, cyl(0.08, 0.08, 0.02, 16), '#b0bec5', -0.25, 1.2, 0.1);
    // The breathing hoses out to the table's head, a mask hung up.
    const hose = (pts: Array<[number, number, number]>, k: string) => {
      for (let i = 1; i < pts.length; i++) rod(g, new THREE.Vector3(...pts[i - 1]), new THREE.Vector3(...pts[i]), 0.022, k);
    };
    hose([[-0.1, 0.96, 0.12], [-0.3, 1.0, 0.24], [-0.48, 0.98, 0.18], [-0.52, 0.95, 0.05]], '#90caf9');
    hose([[-0.05, 0.96, 0.08], [-0.28, 1.04, 0.18], [-0.46, 1.02, 0.08], [-0.52, 0.97, -0.02]], '#bbdefb');
    part(g, cyl(0.045, 0.03, 0.06, 12), '#e0f7fa', 0.34, 1.0, 0.12, { rx: Math.PI / 2 });
    part(g, ring(0.02, 0.004), STEEL, 0.34, 1.04, 0.09, { outline: false });
    // The cylinders behind.
    for (const [x, k] of [[-0.25, '#2e7d32'], [0.25, '#1565c0']] as const) {
      part(g, cyl(0.06, 0.06, 0.62, 14), k, x, 0.52, -0.42);
      part(g, ball(0.06), k, x, 0.83, -0.42, { outline: false });
      part(g, cyl(0.02, 0.02, 0.06, 8), CHROME, x, 0.9, -0.42, { outline: false });
    }
    // The monitor up top.
    part(g, rbox(0.05, 0.2, 0.05, 0.01), '#90a4ae', 0, 1.5, -0.26);
    part(g, rbox(0.42, 0.3, 0.05, 0.015), BLACK, 0, 1.72, -0.22);
    picture(g, painted('vitals', 320, 200, paintVitals), 0.38, 0.24, 0, 1.72, -0.193);
    const strip = painted('waves', 256, 192, paintWaves);
    picture(g, strip, 0.245, 0.21, -0.062, 1.715, -0.19);
  },

  /**
   * The lobby's waiting screen on the wall — who's in each room and who's next, a ticker along the
   * bottom — over a ticket machine (take a number) and a stand of hand gel.
   */
  drQueueBoard(g, W, D, _c, _def, ctx) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.02 : 0.2);
    const y = 1.8;
    const w = Math.min(W - 0.4, 1.5);
    const h = w / 2;
    if (!wall) for (const sx of [-1, 1]) part(g, rbox(0.05, y, 0.05, 0.01), '#90a4ae', sx * (w / 2 - 0.1), y / 2, zb + 0.03);
    part(g, rbox(w + 0.06, h + 0.06, 0.05, 0.015), BLACK, 0, y, zb + 0.025);
    picture(g, painted('queue', 640, 320, paintQueue), w, h, 0, y, zb + 0.052);
    // The ticket machine.
    const tx = 0.45;
    const tz = zb + 0.3;
    part(g, rbox(0.3, 0.04, 0.24, 0.015), '#78909c', tx, 0.02, tz);
    part(g, cyl(0.035, 0.04, 0.95, 12), '#b0bec5', tx, 0.5, tz);
    part(g, rbox(0.26, 0.32, 0.18, 0.03), TEAL, tx, 1.12, tz);
    part(g, rbox(0.2, 0.08, 0.02, 0.01), '#ffffff', tx, 1.2, tz + 0.09);
    label(g, '번호표', 0.18, 0.06, tx, 1.2, tz + 0.101, '#ffffff', TEAL);
    part(g, cyl(0.035, 0.035, 0.025, 16), '#e53935', tx, 1.08, tz + 0.095, { rx: Math.PI / 2 });
    part(g, box(0.12, 0.01, 0.02), BLACK, tx, 1.0, tz + 0.09, { outline: false });
    part(g, box(0.06, 0.08, 0.002), '#ffffff', tx, 0.97, tz + 0.1, { rx: 0.3, outline: false });
    // A stand of hand gel.
    const gx = -0.5;
    part(g, rbox(0.26, 0.03, 0.26, 0.015), '#78909c', gx, 0.015, tz);
    part(g, cyl(0.025, 0.025, 1.0, 10), '#b0bec5', gx, 0.52, tz);
    part(g, rbox(0.14, 0.24, 0.1, 0.02), '#ffffff', gx, 1.12, tz);
    part(g, box(0.06, 0.1, 0.004), '#80deea', gx, 1.14, tz + 0.052, { outline: false });
    part(g, rbox(0.06, 0.02, 0.06, 0.008), '#90a4ae', gx, 0.99, tz + 0.03);
    label(g, '손 소독제', 0.16, 0.05, gx, 1.3, tz + 0.052, '#00897b', '#ffffff');
  },

  /**
   * A hospital waiting seat (2026-11-04, the layout audit, in place of a dining chair): a moulded shell on a steel beam, the
   * beam's legs at its sides, as the seats are bolted in a row down a hospital corridor; at the blood-draw desk it is the
   * patient's chair.
   */
  drWaitSeat(g, _W, _D, c, _def, _ctx, out) {
    const seatY = 0.45;
    part(g, box(0.96, 0.05, 0.06), STEEL, 0, seatY - 0.12, -0.02);
    for (const sx of [-1, 1]) {
      part(g, box(0.04, seatY - 0.12, 0.04), STEEL, sx * 0.46, (seatY - 0.12) / 2, -0.02);
      part(g, box(0.06, 0.02, 0.44), STEEL, sx * 0.46, 0.01, -0.02);
    }
    part(g, rbox(0.46, 0.05, 0.44, 0.03), c, 0, seatY - 0.03, 0.01);
    part(g, rbox(0.44, 0.44, 0.05, 0.03), c, 0, seatY + 0.24, -0.22, { rx: -0.12 });
    part(g, box(0.05, 0.3, 0.04), STEEL, 0, seatY + 0.02, -0.2, { rx: -0.12 });
    out.seat = marker(g, 0, seatY, 0.03);
  },

  /** 외래 접수·수납: the counter's high front with the patients' ledge and the windows' numbers, the clerks' screens and card readers behind. */
  drReception(g, W, D, c) {
    const zf = D / 2 - 0.12;
    part(g, rbox(W - 0.06, 1.05, 0.08, 0.02), c, 0, 0.525, zf);
    part(g, rbox(W, 0.04, 0.3, 0.012), '#f6f6f2', 0, 1.07, zf - 0.04);
    part(g, rbox(W - 0.1, 0.04, D - 0.4, 0.012), '#eceff1', 0, 0.74, -0.08);
    for (const sx of [-1, 1]) part(g, rbox(0.04, 0.74, D - 0.4, 0.01), shade(c, 0.85), sx * (W / 2 - 0.06), 0.37, -0.08);
    const names = ['접수', '수납', '예약'];
    names.forEach((s, i) => {
      const x = (i - 1) * (W / 3);
      label(g, `${i + 1} ${s}`, 0.5, 0.13, x, 0.86, zf + 0.042, '#ffffff', c);
      // Behind: a screen, a keyboard, a card reader.
      part(g, rbox(0.42, 0.28, 0.03, 0.01), BLACK, x, 1.0, -0.12, { rx: -0.1 });
      part(g, box(0.38, 0.24, 0.002), '#cfe8f3', x, 1.0, -0.104, { rx: -0.1, outline: false });
      part(g, rbox(0.06, 0.12, 0.06, 0.01), '#90a4ae', x, 0.84, -0.12);
      part(g, rbox(0.34, 0.015, 0.12, 0.004), '#37474f', x, 0.77, 0.02);
      part(g, rbox(0.08, 0.03, 0.12, 0.01), '#455a64', x + 0.3, 1.11, zf - 0.06);
    });
    label(g, '외래 접수 · 수납', 1.0, 0.16, 0, 1.32, zf - 0.02, c, '#ffffff');
    part(g, box(0.03, 0.2, 0.03), STEEL, -0.45, 1.19, zf - 0.02);
    part(g, box(0.03, 0.2, 0.03), STEEL, 0.45, 1.19, zf - 0.02);
  },

  /**
   * 내시경 검사대: a narrow padded table along its length on two steel columns, rails along both sides, the pillow and the
   * mouthpiece at its head (the left end as you face it, by the tower). Scoped standing at the head, the hands at the patient's mouth.
   */
  drScopeTable(g, W, D, c, _def, _ctx, out) {
    const top = 0.68;
    const L = W - 0.24;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.4, 0.06, 0.5, 0.02), '#78909c', sx * (L / 2 - 0.3), 0.03, 0);
      part(g, cyl(0.07, 0.09, top - 0.12, 16), STEEL, sx * (L / 2 - 0.3), (top - 0.12) / 2 + 0.06, 0);
    }
    part(g, rbox(L, 0.06, D - 0.34, 0.02), '#cfd8dc', 0, top - 0.04, 0);
    part(g, rbox(L - 0.02, 0.1, D - 0.38, 0.04), c, 0, top + 0.05, 0);
    part(g, box(L - 0.5, 0.004, D - 0.42), '#ffffff', 0.18, top + 0.102, 0, { outline: false });
    // The pillow at the head, the mouthpiece and a towel by it.
    part(g, rbox(0.34, 0.08, D - 0.46, 0.04), '#eceff1', -L / 2 + 0.22, top + 0.14, 0);
    part(g, rbox(0.05, 0.04, 0.05, 0.012), '#1e88e5', -L / 2 + 0.44, top + 0.13, 0.12);
    part(g, rbox(0.16, 0.012, 0.12, 0.004), '#80cbc4', -L / 2 + 0.46, top + 0.108, -0.1, { outline: false });
    for (const sz of [-1, 1]) part(g, box(L - 0.4, 0.02, 0.02), CHROME, 0.1, top + 0.16, sz * (D / 2 - 0.2));
    out.work = marker(g, -L / 2 + 0.42, 0.98, 0.08);
    const scope = spot(g, 'stand', -L / 2 + 0.42, 0, D / 2 + 0.12, Math.PI);
    scope.work = out.work;
    scope.motion = 'tinker';
    out.spots = { '*': scope };
  },

  /**
   * 내시경 장비: the tower trolley: the light source and processor stacked, the monitor on its arm on top, the scope hung on its
   * hook with its insertion tube coiled down, the suction bottle at the side.
   */
  drEndoTower(g, _W, D, c, _def, _ctx, out) {
    const zb = -D / 2 + 0.3;
    part(g, rbox(0.56, 0.04, 0.5, 0.012), '#90a4ae', 0, 0.12, zb);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * 0.22, sz * 0.2 + zb);
    for (const sx of [-1, 1]) part(g, box(0.04, 1.2, 0.04), STEEL, sx * 0.25, 0.72, zb - 0.2);
    part(g, rbox(0.5, 0.16, 0.42, 0.02), c, 0, 0.5, zb);
    part(g, rbox(0.5, 0.14, 0.42, 0.02), c, 0, 0.72, zb);
    part(g, box(0.3, 0.04, 0.004), '#263238', -0.06, 0.5, zb + 0.212, { outline: false });
    part(g, box(0.3, 0.04, 0.004), '#263238', -0.06, 0.72, zb + 0.212, { outline: false });
    part(g, cyl(0.03, 0.03, 0.01, 12), '#43a047', 0.17, 0.72, zb + 0.212, { rx: Math.PI / 2 });
    part(g, cyl(0.035, 0.035, 0.01, 12), '#eceff1', 0.17, 0.5, zb + 0.212, { rx: Math.PI / 2 });
    label(g, '내시경', 0.16, 0.04, -0.06, 0.58, zb + 0.213, c, '#37474f');
    part(g, rbox(0.5, 0.03, 0.42, 0.012), '#eceff1', 0, 0.86, zb);
    // The monitor, its picture.
    part(g, box(0.04, 0.4, 0.04), STEEL, 0, 1.08, zb - 0.1);
    part(g, rbox(0.56, 0.36, 0.04, 0.012), BLACK, 0, 1.4, zb - 0.06);
    part(g, box(0.5, 0.3, 0.002), '#7a2f2a', 0, 1.4, zb - 0.038, { outline: false });
    part(g, cyl(0.1, 0.1, 0.003, 20), '#d9826e', 0, 1.4, zb - 0.036, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.04, 0.04, 0.004, 14), '#4e1b17', 0.02, 1.39, zb - 0.034, { rx: Math.PI / 2, outline: false });
    // The scope on its hook, the tube coiled down the side, the suction bottle.
    rod(g, new THREE.Vector3(0.28, 1.05, zb), new THREE.Vector3(0.36, 1.05, zb), 0.008, STEEL);
    part(g, rbox(0.05, 0.16, 0.06, 0.015), '#37474f', 0.36, 0.98, zb);
    rod(g, new THREE.Vector3(0.36, 0.9, zb), new THREE.Vector3(0.38, 0.4, zb + 0.08), 0.007, BLACK);
    rod(g, new THREE.Vector3(0.38, 0.4, zb + 0.08), new THREE.Vector3(0.33, 0.25, zb - 0.04), 0.007, BLACK);
    part(g, cyl(0.05, 0.05, 0.2, 14), '#e3f2fd', -0.32, 0.3, zb + 0.08);
    part(g, cyl(0.052, 0.052, 0.03, 14), '#1e88e5', -0.32, 0.41, zb + 0.08);
    // The report written at the processor's keyboard, the pictures on the screen.
    part(g, rbox(0.4, 0.018, 0.13, 0.006), '#37474f', 0, 0.885, zb + 0.13);
    part(g, box(0.36, 0.004, 0.1), '#90a4ae', 0, 0.895, zb + 0.13, { outline: false });
    out.work = marker(g, 0, 0.92, zb + 0.18);
    const write = spot(g, 'stand', 0, 0, 0.55, Math.PI);
    write.work = out.work;
    write.motion = 'type';
    out.spots = { '*': write };
  },

  /** 내시경 세척기: the automatic reprocessor, its lid up on the basin where a scope lies coiled, the panel and the chemical bottles below. */
  drScopeWasher(g, _W, D, c) {
    const zb = -D / 2 + 0.32;
    part(g, rbox(0.62, 0.86, 0.56, 0.03), c, 0, 0.43, zb);
    part(g, rbox(0.56, 0.04, 0.5, 0.012), '#eceff1', 0, 0.88, zb);
    part(g, rbox(0.46, 0.05, 0.38, 0.02), '#b0bec5', 0, 0.88, zb + 0.02);
    for (let i = 0; i < 3; i++) part(g, ring(0.06 + i * 0.045, 0.008), BLACK, 0, 0.91, zb + 0.02, { rx: -Math.PI / 2, outline: false });
    part(g, rbox(0.58, 0.42, 0.03, 0.02), '#cfe8f3', 0, 1.1, zb - 0.27, { rx: 0.25 });
    part(g, rbox(0.24, 0.1, 0.02, 0.01), BLACK, 0.12, 0.74, zb + 0.29);
    part(g, box(0.18, 0.05, 0.002), '#80cbc4', 0.12, 0.75, zb + 0.301, { outline: false });
    label(g, '세척·소독', 0.2, 0.05, -0.15, 0.74, zb + 0.292, c, '#37474f');
    for (const x of [-0.16, 0, 0.16]) part(g, cyl(0.04, 0.04, 0.16, 12), x ? '#ffffff' : '#ffe082', x, 0.2, zb + 0.24);
  },
};

