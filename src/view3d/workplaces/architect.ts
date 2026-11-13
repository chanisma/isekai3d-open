import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';

/**
 * The architecture studio drawn as itself (2026-10-27 workplace pipeline, at the user's request):
 * 정우건축 (JUNGWOO ARCHITECTS), a small Seoul practice — the CAD desks and the site van redone, and
 * what the studio was missing: an A0 plotter with a floor plan coming out of it, a materials library
 * of tiles, stone, timber and fabric, the charcoal pin-up wall of the competition's renderings with
 * the crit's sticky notes, the site model on its white plinth in the meeting room and the rack of hard
 * hats and hi-vis vests by the way out to the van. Oak, black steel and white card — the studio's
 * palette. Each use puts the architect where it's done: sat at the BIM model with the 3D mouse,
 * stood at the plotter's panel, going through the samples at the library's pull-out board, pinning a
 * sheet up, bent over the site model or presenting beside it, putting on the hard hat and vest, and
 * off in the van to the site.
 */

const OAK = '#d9bf98';
const STEEL_BLACK = '#2b2d31';
const BLACK = '#24262b';
const CHROME = '#dfe4e8';
const CARD = '#fbfaf6';
const BASSWOOD = '#e8cfa0';
const HIVIS = '#d4f53c';
const ORANGE = '#ff7a1a';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const FIRM = '정우건축';

/** Lit parts (LEDs, lamps, a beacon): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
/** See-through parts: the van's windows, the plotter's lid window, acrylic on the model. */
const GLASS = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.3, depthWrite: false });
const TINT = new THREE.MeshToonMaterial({ color: '#27323d', transparent: true, opacity: 0.82, depthWrite: false });
const SMOKE = new THREE.MeshToonMaterial({ color: '#1b2430', transparent: true, opacity: 0.5, depthWrite: false });
const BEAM = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.12, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
const cone = (r: number, h: number, seg = 16) => shape(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
/** A hard hat's dome: the top half of a sphere. */
const dome = (r: number) => shape(`dome${r}`, () => new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2));

/** Pictures painted once a key (screens, renderings, labels). */
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
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}`, cw, ch, (x2) => {
    if (bg !== 'none') {
      x2.fillStyle = bg;
      x2.fillRect(0, 0, cw, ch);
    }
    x2.fillStyle = fg;
    x2.font = `bold ${Math.round(ch * 0.62)}px ${FONT}`;
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

// ---- Pictures ----

/** A floor plan drawn into (x0, y0, w, h) of a canvas: walls, partitions, door swings, dimensions, room names. */
function paintPlan(x: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, ink: string, names = true) {
  const X = (u: number) => x0 + u * w;
  const Y = (v: number) => y0 + v * h;
  x.strokeStyle = ink;
  x.lineCap = 'square';
  // The outside walls, thick.
  x.lineWidth = Math.max(2, w * 0.018);
  x.strokeRect(X(0.08), Y(0.1), w * 0.84, h * 0.76);
  // Partitions.
  x.lineWidth = Math.max(1, w * 0.009);
  const lines: Array<[number, number, number, number]> = [[0.45, 0.1, 0.45, 0.55], [0.08, 0.55, 0.7, 0.55], [0.7, 0.4, 0.7, 0.86], [0.7, 0.4, 0.92, 0.4], [0.25, 0.55, 0.25, 0.86]];
  for (const [a, b, c, d] of lines) {
    x.beginPath();
    x.moveTo(X(a), Y(b));
    x.lineTo(X(c), Y(d));
    x.stroke();
  }
  // Door swings.
  x.lineWidth = 1;
  for (const [cx, cy, r, s0] of [[0.45, 0.42, 0.08, Math.PI / 2], [0.32, 0.55, 0.07, -Math.PI / 2], [0.7, 0.62, 0.07, Math.PI]] as Array<[number, number, number, number]>) {
    x.beginPath();
    x.arc(X(cx), Y(cy), w * r, s0, s0 + Math.PI / 2);
    x.stroke();
  }
  // Windows along the top.
  x.fillStyle = '#ffffff';
  for (const u of [0.18, 0.32, 0.58, 0.78]) x.fillRect(X(u), Y(0.1) - 2, w * 0.08, 4);
  x.strokeRect(X(0.18), Y(0.1) - 2, w * 0.08, 4);
  // Dimension lines under it.
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(X(0.08), Y(0.93));
  x.lineTo(X(0.92), Y(0.93));
  for (const u of [0.08, 0.25, 0.7, 0.92]) {
    x.moveTo(X(u), Y(0.9));
    x.lineTo(X(u), Y(0.96));
  }
  x.stroke();
  if (!names) return;
  x.fillStyle = ink;
  x.font = `bold ${Math.round(h * 0.05)}px ${FONT}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (const [t, u, v] of [['라운지', 0.27, 0.33], ['갤러리', 0.68, 0.25], ['카페', 0.47, 0.7], ['창고', 0.16, 0.7], ['코어', 0.81, 0.63]] as Array<[string, number, number]>) x.fillText(t, X(u), Y(v));
  x.font = `${Math.round(h * 0.035)}px ${FONT}`;
  x.fillText('4,200', X(0.165), Y(0.975));
  x.fillText('13,500', X(0.475), Y(0.975));
}

/** The BIM model on a CAD desk's main monitor: a dark viewport with the building in axonometric, the ribbon and the browser. */
function bimTex(): THREE.Texture {
  return painted('arch-bim', 512, 320, (x) => {
    x.fillStyle = '#20262e';
    x.fillRect(0, 0, 512, 320);
    // Ribbon and tabs.
    x.fillStyle = '#323a45';
    x.fillRect(0, 0, 512, 34);
    x.fillStyle = '#4fc3f7';
    x.fillRect(8, 26, 40, 3);
    x.fillStyle = '#b0bec5';
    x.font = `12px ${FONT}`;
    x.textBaseline = 'middle';
    ['건축', '구조', '설비', '매스', '주석', '뷰'].forEach((t, i) => x.fillText(t, 12 + i * 44, 14));
    for (let i = 0; i < 12; i++) {
      x.fillStyle = ['#81d4fa', '#ffcc80', '#a5d6a7', '#ce93d8'][i % 4];
      x.fillRect(280 + i * 18, 8, 12, 12);
    }
    // The project browser on the left.
    x.fillStyle = '#2a313b';
    x.fillRect(0, 34, 96, 286);
    x.fillStyle = '#90a4ae';
    x.font = `10px ${FONT}`;
    ['▾ 평면', '  1층 평면', '  2층 평면', '  지붕', '▾ 입면', '  남측', '  동측', '▾ 단면', '  A-A\'', '▾ 3D 뷰'].forEach((t, i) => x.fillText(t, 6, 50 + i * 15));
    x.fillStyle = '#37474f';
    x.fillRect(2, 176, 92, 13);
    x.fillStyle = '#e1f5fe';
    x.fillText('  {3D} 조감', 6, 183);
    // The ground grid.
    x.strokeStyle = '#2f3a46';
    x.lineWidth = 1;
    const o = { x: 300, y: 250 };
    const iso = (a: number, b: number, c: number) => ({ x: o.x + (a - b) * 0.87, y: o.y + (a + b) * 0.5 - c });
    for (let i = -6; i <= 6; i++) {
      const p = iso(i * 20, -120, 0);
      const q = iso(i * 20, 120, 0);
      x.beginPath();
      x.moveTo(p.x, p.y);
      x.lineTo(q.x, q.y);
      x.stroke();
      const r = iso(-120, i * 20, 0);
      const s = iso(120, i * 20, 0);
      x.beginPath();
      x.moveTo(r.x, r.y);
      x.lineTo(s.x, s.y);
      x.stroke();
    }
    // The building: boxes stacked in iso (a podium, a tower and a wing), glass faces blue.
    const block = (a: number, b: number, z: number, w: number, d: number, h: number, top: string, left: string, right: string) => {
      const P = (u: number, v: number, c: number) => iso(a + u, b + v, z + c);
      const face = (pts: Array<{ x: number; y: number }>, col: string) => {
        x.fillStyle = col;
        x.beginPath();
        pts.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
        x.closePath();
        x.fill();
        x.strokeStyle = '#0d1116';
        x.stroke();
      };
      face([P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)], left);
      face([P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, 0, h)], right);
      face([P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)], top);
      // Floor lines over the glass.
      x.strokeStyle = 'rgba(255,255,255,0.25)';
      for (let k = 14; k < h; k += 14) {
        const a1 = P(0, d, k);
        const a2 = P(w, d, k);
        const a3 = P(w, 0, k);
        x.beginPath();
        x.moveTo(a1.x, a1.y);
        x.lineTo(a2.x, a2.y);
        x.lineTo(a3.x, a3.y);
        x.stroke();
      }
    };
    block(-60, -50, 0, 120, 90, 28, '#cfd8dc', '#90a4ae', '#b0bec5');
    block(-50, -40, 28, 50, 50, 110, '#eceff1', '#4f83cc', '#7fa9e0');
    block(10, -40, 28, 50, 70, 42, '#a5d6a7', '#5c8fd6', '#8fb5ea');
    // The selected wall in orange, its tag.
    x.strokeStyle = '#ff9800';
    x.lineWidth = 2;
    const s1 = iso(-50, 10, 28);
    const s2 = iso(0, 10, 28);
    const s3 = iso(0, 10, 138);
    const s4 = iso(-50, 10, 138);
    x.beginPath();
    x.moveTo(s1.x, s1.y);
    x.lineTo(s2.x, s2.y);
    x.lineTo(s3.x, s3.y);
    x.lineTo(s4.x, s4.y);
    x.closePath();
    x.stroke();
    x.fillStyle = '#ff9800';
    x.font = `bold 11px ${FONT}`;
    x.fillText('커튼월 CW-01', 380, 70);
    // The view cube and the status bar.
    x.fillStyle = '#cfd8dc';
    x.fillRect(470, 44, 30, 30);
    x.fillStyle = '#20262e';
    x.font = `bold 9px ${FONT}`;
    x.fillText('위', 478, 60);
    x.fillStyle = '#323a45';
    x.fillRect(96, 304, 416, 16);
    x.fillStyle = '#90a4ae';
    x.font = `10px ${FONT}`;
    x.fillText('성수_복합문화공간_계획안.bim   1:200   상세 수준: 중간', 104, 312);
  });
}

/** The second monitor's floor plan: white sheet, black ink, a title block. */
function planTex(): THREE.Texture {
  return painted('arch-plan', 256, 360, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 256, 360);
    x.fillStyle = '#e8eaed';
    x.fillRect(0, 0, 256, 18);
    x.fillStyle = '#455a64';
    x.font = `10px ${FONT}`;
    x.textBaseline = 'middle';
    x.fillText('1층 평면도  1:100', 6, 9);
    paintPlan(x, 10, 26, 236, 230, '#263238');
    // The title block.
    x.strokeStyle = '#263238';
    x.lineWidth = 1;
    x.strokeRect(10, 268, 236, 82);
    x.beginPath();
    x.moveTo(10, 290);
    x.lineTo(246, 290);
    x.moveTo(150, 268);
    x.lineTo(150, 350);
    x.stroke();
    x.fillStyle = '#263238';
    x.font = `bold 13px ${FONT}`;
    x.fillText(FIRM, 18, 279);
    x.font = `10px ${FONT}`;
    x.fillText('A-101', 160, 279);
    x.fillText('성수 복합문화공간', 18, 305);
    x.fillText('신축공사', 18, 322);
    x.fillText('2026.10', 160, 305);
    x.fillText('설계: 하예솔', 160, 322);
  });
}

/** The drawing coming out of the plotter: a full sheet with a plan in it and the title block down the right. */
function plotTex(): THREE.Texture {
  return painted('arch-plot', 512, 256, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 512, 256);
    x.strokeStyle = '#1a237e';
    x.lineWidth = 2;
    x.strokeRect(8, 8, 496, 240);
    paintPlan(x, 20, 16, 380, 226, '#1a237e');
    // Grid bubbles over the plan.
    x.lineWidth = 1;
    ['1', '2', '3', '4'].forEach((t, i) => {
      x.beginPath();
      x.arc(50 + i * 100, 16, 7, 0, Math.PI * 2);
      x.stroke();
      x.fillStyle = '#1a237e';
      x.font = `9px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(t, 50 + i * 100, 16);
    });
    x.textAlign = 'left';
    // The title block.
    x.strokeRect(410, 8, 94, 240);
    for (const y of [60, 110, 160, 200]) {
      x.beginPath();
      x.moveTo(410, y);
      x.lineTo(504, y);
      x.stroke();
    }
    x.fillStyle = '#1a237e';
    x.font = `bold 14px ${FONT}`;
    x.fillText(FIRM, 418, 34);
    x.font = `10px ${FONT}`;
    x.fillText('성수 복합문화공간', 416, 84);
    x.fillText('1층 평면도', 416, 134);
    x.fillText('A-101  1:100', 416, 182);
    x.font = `bold 12px ${FONT}`;
    x.fillText('실시설계', 416, 224);
  });
}

/** The plotter's panel: printing, the sheet size and how far along. */
function plotterLcdTex(): THREE.Texture {
  return painted('arch-plotlcd', 160, 96, (x) => {
    x.fillStyle = '#0d2238';
    x.fillRect(0, 0, 160, 96);
    x.fillStyle = '#b3e5fc';
    x.font = `bold 15px ${FONT}`;
    x.textBaseline = 'middle';
    x.fillText('출력 중…', 10, 18);
    x.font = `12px ${FONT}`;
    x.fillText('A-101.pdf  A0', 10, 42);
    x.fillStyle = '#37474f';
    x.fillRect(10, 60, 140, 12);
    x.fillStyle = '#4fc3f7';
    x.fillRect(10, 60, 88, 12);
    x.fillStyle = '#e1f5fe';
    x.font = `11px ${FONT}`;
    x.fillText('62%   남은 시간 1:40', 10, 85);
  });
}

/** The competition's renderings and drawings pinned up. */
function renderTex(kind: 'exterior' | 'interior' | 'section' | 'site' | 'diagram'): THREE.Texture {
  return painted(`arch-render-${kind}`, 320, 224, (x) => {
    const W = 320;
    const H = 224;
    if (kind === 'exterior') {
      // Dusk: a sky from deep blue to orange, the building lit from inside, trees and people.
      const sky = x.createLinearGradient(0, 0, 0, H * 0.72);
      sky.addColorStop(0, '#1d2b53');
      sky.addColorStop(0.55, '#7e5a9b');
      sky.addColorStop(1, '#ffb26b');
      x.fillStyle = sky;
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#3b3f4a';
      x.fillRect(0, H * 0.72, W, H * 0.28);
      x.fillStyle = '#596070';
      x.fillRect(0, H * 0.72, W, 6);
      // The building: a solid podium, a glass box over it cantilevered, a roof garden.
      x.fillStyle = '#d9d4cc';
      x.fillRect(40, 120, 220, 42);
      x.fillStyle = '#ffd77a';
      for (let i = 0; i < 6; i++) x.fillRect(52 + i * 34, 128, 24, 30);
      x.fillStyle = '#2e3648';
      x.fillRect(80, 52, 200, 68);
      x.fillStyle = '#ffe6a6';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) if ((r * 7 + c * 3) % 5) x.fillRect(86 + c * 21.5, 58 + r * 21, 18, 15);
      x.fillStyle = '#6a994e';
      x.fillRect(80, 46, 200, 7);
      for (let i = 0; i < 9; i++) {
        x.beginPath();
        x.arc(90 + i * 23, 46, 6, 0, Math.PI * 2);
        x.fill();
      }
      // Trees and people in silhouette.
      x.fillStyle = '#1e2a20';
      for (const tx of [20, 288, 300]) {
        x.fillRect(tx - 1, 130, 3, 32);
        x.beginPath();
        x.arc(tx, 124, 14, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = '#20232b';
      for (const [px, ph] of [[120, 18], [128, 17], [200, 19], [236, 16]]) {
        x.fillRect(px, 172 - ph, 4, ph);
        x.beginPath();
        x.arc(px + 2, 170 - ph, 3, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = '#ffffff';
      x.font = `bold 12px ${FONT}`;
      x.fillText('투시도 01 — 성수 복합문화공간', 10, 214);
    } else if (kind === 'interior') {
      // A double-height lounge: timber floor, a wall of glass, a stair, warm light.
      x.fillStyle = '#efe6d8';
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#c69c6d';
      x.beginPath();
      x.moveTo(0, H);
      x.lineTo(W, H);
      x.lineTo(W * 0.72, H * 0.62);
      x.lineTo(W * 0.28, H * 0.62);
      x.closePath();
      x.fill();
      x.fillStyle = '#bfe0f2';
      x.fillRect(W * 0.3, H * 0.12, W * 0.4, H * 0.5);
      x.strokeStyle = '#5d4037';
      x.lineWidth = 3;
      for (let i = 1; i < 4; i++) {
        x.beginPath();
        x.moveTo(W * 0.3 + i * W * 0.1, H * 0.12);
        x.lineTo(W * 0.3 + i * W * 0.1, H * 0.62);
        x.stroke();
      }
      x.fillStyle = '#8d6e63';
      for (let i = 0; i < 6; i++) x.fillRect(20 + i * 12, H * 0.62 - i * 14, 30, 6);
      x.fillStyle = '#4e5d6c';
      x.fillRect(W * 0.45, H * 0.72, 70, 18);
      x.fillRect(W * 0.45, H * 0.66, 70, 8);
      x.fillStyle = '#66bb6a';
      x.beginPath();
      x.arc(W * 0.86, H * 0.6, 18, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#ffe082';
      for (const lx of [90, 160, 230]) {
        x.beginPath();
        x.arc(lx, 30, 6, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = '#3e2723';
      x.font = `bold 12px ${FONT}`;
      x.fillText('내부 투시도 — 라운지', 10, 214);
    } else if (kind === 'section') {
      x.fillStyle = CARD;
      x.fillRect(0, 0, W, H);
      x.strokeStyle = '#263238';
      x.lineWidth = 3;
      // The ground, hatched, and the floors cut through.
      x.beginPath();
      x.moveTo(0, 170);
      x.lineTo(W, 170);
      x.stroke();
      x.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        x.beginPath();
        x.moveTo(i * 9, 172);
        x.lineTo(i * 9 - 10, 190);
        x.stroke();
      }
      x.lineWidth = 4;
      for (const y of [170, 128, 86, 50]) {
        x.beginPath();
        x.moveTo(60, y);
        x.lineTo(y === 50 ? 220 : 260, y);
        x.stroke();
      }
      x.beginPath();
      x.moveTo(60, 170);
      x.lineTo(60, 50);
      x.moveTo(260, 170);
      x.lineTo(260, 86);
      x.moveTo(220, 86);
      x.lineTo(220, 50);
      x.stroke();
      x.lineWidth = 1;
      x.fillStyle = '#90caf9';
      x.fillRect(100, 94, 80, 30);
      x.fillStyle = '#263238';
      for (const [px, py] of [[120, 170], [200, 128], [150, 86]]) {
        x.fillRect(px, py - 16, 3, 16);
        x.beginPath();
        x.arc(px + 1.5, py - 19, 3, 0, Math.PI * 2);
        x.fill();
      }
      x.font = `10px ${FONT}`;
      for (const [t, y] of [['RF', 50], ['3F', 86], ['2F', 128], ['1F', 170]] as Array<[string, number]>) x.fillText(t, 270, y - 4);
      x.font = `bold 12px ${FONT}`;
      x.fillText("단면도 A-A'", 10, 214);
    } else if (kind === 'site') {
      x.fillStyle = '#e9efd9';
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#c9ced3';
      x.fillRect(0, 150, W, 26);
      x.fillRect(236, 0, 22, H);
      x.fillStyle = '#ffffff';
      for (let i = 0; i < 12; i++) x.fillRect(i * 28, 162, 14, 2);
      x.fillStyle = '#9ad1f0';
      x.beginPath();
      x.moveTo(0, 196);
      x.quadraticCurveTo(160, 182, W, 204);
      x.lineTo(W, H);
      x.lineTo(0, H);
      x.fill();
      x.fillStyle = '#d7ccc8';
      for (const [bx, by, bw, bh] of [[14, 20, 40, 34], [64, 14, 30, 50], [268, 30, 40, 40], [270, 90, 38, 44]]) x.fillRect(bx, by, bw, bh);
      x.fillStyle = '#ff8a65';
      x.fillRect(110, 50, 100, 70);
      x.fillStyle = '#ffccbc';
      x.fillRect(150, 50, 60, 36);
      x.fillStyle = '#7cb342';
      for (let i = 0; i < 8; i++) {
        x.beginPath();
        x.arc(112 + i * 14, 134, 5, 0, Math.PI * 2);
        x.fill();
      }
      // North arrow.
      x.fillStyle = '#263238';
      x.beginPath();
      x.moveTo(30, 90);
      x.lineTo(24, 110);
      x.lineTo(36, 110);
      x.fill();
      x.font = `bold 11px ${FONT}`;
      x.fillText('N', 26, 84);
      x.fillText('배치도 1:500', 10, 214);
    } else {
      // The diagram: the programme as coloured blocks, the routes through as arrows.
      x.fillStyle = CARD;
      x.fillRect(0, 0, W, H);
      const blocks: Array<[number, number, number, number, string, string]> = [[20, 30, 90, 60, '#ffab91', '전시'], [120, 30, 80, 60, '#80cbc4', '카페'], [210, 30, 90, 60, '#ce93d8', '공방'], [20, 100, 180, 50, '#fff59d', '라운지'], [210, 100, 90, 50, '#90caf9', '사무']];
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      for (const [bx, by, bw, bh, col, t] of blocks) {
        x.fillStyle = col;
        x.fillRect(bx, by, bw, bh);
        x.fillStyle = '#37474f';
        x.font = `bold 13px ${FONT}`;
        x.fillText(t, bx + bw / 2, by + bh / 2);
      }
      x.strokeStyle = '#e53935';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(10, 180);
      x.bezierCurveTo(80, 160, 140, 190, 200, 125);
      x.lineTo(260, 65);
      x.stroke();
      x.fillStyle = '#e53935';
      x.beginPath();
      x.moveTo(266, 58);
      x.lineTo(252, 62);
      x.lineTo(262, 72);
      x.fill();
      x.textAlign = 'left';
      x.fillStyle = '#263238';
      x.font = `bold 12px ${FONT}`;
      x.fillText('프로그램 · 동선 다이어그램', 10, 210);
    }
  });
}

// ---- Small things ----

/** A task chair facing +z in its own group, its seat `h` up: five-star base, gas lift, a black seat and a mesh back. */
function taskChair(c: THREE.Object3D, h: number) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.25, 0.045, Math.cos(a) * 0.25), 0.015, '#3a3d44');
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.25, 0.024, Math.cos(a) * 0.25, { outline: false });
  }
  part(c, cyl(0.024, 0.024, h - 0.12, 10), CHROME, 0, 0.08 + (h - 0.12) / 2, 0, { outline: false });
  part(c, rbox(0.47, 0.07, 0.45, 0.035), '#33363c', 0, h + 0.01, 0.01);
  const back = frame(c, 0, h + 0.06, -0.22, 0, -0.12);
  part(back, rbox(0.44, 0.56, 0.04, 0.05), '#2a2c31', 0, 0.3, 0);
  part(back, box(0.38, 0.48, 0.006), '#4b5058', 0, 0.31, 0.022, { outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.035, 0.18, 0.035, 0.008), '#2a2c31', sx * 0.24, h + 0.1, -0.03, { outline: false });
    part(c, rbox(0.07, 0.025, 0.2, 0.012), '#2a2c31', sx * 0.24, h + 0.2, -0.02);
  }
}

/** A keyboard and mouse at (x, y, z) on a top; returns where the hands go. */
function keysAndMouse(g: THREE.Object3D, x: number, y: number, z: number): THREE.Object3D {
  part(g, rbox(0.4, 0.018, 0.13, 0.006), '#e6e8ea', x, y + 0.009, z);
  for (let r = 0; r < 4; r++) part(g, box(0.36, 0.004, 0.022), '#c9cdd1', x, y + 0.02, z - 0.04 + r * 0.027, { outline: false });
  part(g, rbox(0.055, 0.025, 0.09, 0.022), '#e6e8ea', x + 0.27, y + 0.012, z + 0.01);
  return marker(g, x, y + 0.03, z);
}

/** A three-sided architect's scale rule lying on a top at (x, y, z), turned `ry`. */
function scaleRule(g: THREE.Object3D, x: number, y: number, z: number, ry: number) {
  part(g, cyl(0.016, 0.016, 0.3, 3), '#eceff1', x, y + 0.012, z, { rz: Math.PI / 2, ry, outline: false });
  part(g, cyl(0.0165, 0.0165, 0.02, 3), '#e53935', x + Math.cos(ry) * 0.13, y + 0.012, z - Math.sin(ry) * 0.13, { rz: Math.PI / 2, ry, outline: false });
}

/** A roll of yellow trace paper lying on a top. */
function traceRoll(g: THREE.Object3D, x: number, y: number, z: number, ry: number, len = 0.32) {
  part(g, cyl(0.035, 0.035, len, 14), '#fff59d', x, y + 0.035, z, { rz: Math.PI / 2, ry });
  part(g, cyl(0.013, 0.013, len + 0.01, 8), '#8d6e63', x, y + 0.035, z, { rz: Math.PI / 2, ry, outline: false });
}

/** A hard hat at (x, y, z) facing +z turned `ry`: the dome, its ridge, the brim peaked at the front, the firm's sticker. */
function hardHat(g: THREE.Object3D, x: number, y: number, z: number, color: string, ry = 0, text = FIRM) {
  const h = frame(g, x, y, z, ry);
  part(h, dome(0.11), color, 0, 0.012, 0);
  part(h, rbox(0.03, 0.03, 0.2, 0.012), color, 0, 0.1, 0, { outline: false });
  part(h, cyl(0.135, 0.135, 0.014, 22), color, 0, 0.012, 0.012);
  part(h, rbox(0.12, 0.012, 0.06, 0.006), color, 0, 0.014, 0.14);
  label(h, text, 0.09, 0.025, 0, 0.06, 0.102, 'none', '#263238', 0, -0.35);
}

/** A hi-vis vest on a hanger, its back to the room (the firm's name on it), hung from (x, y, z). */
function vest(g: THREE.Object3D, x: number, y: number, z: number, color: string) {
  const v = frame(g, x, y, z);
  part(v, ring(0.012, 0.003, Math.PI * 1.5), CHROME, 0, 0.01, 0, { outline: false });
  part(v, rbox(0.3, 0.012, 0.02, 0.006), '#5d4037', 0, -0.03, 0);
  part(v, rbox(0.3, 0.46, 0.03, 0.03), color, 0, -0.26, 0.012);
  for (const sx of [-1, 1]) part(v, rbox(0.08, 0.1, 0.03, 0.02), color, sx * 0.11, -0.01, 0.012);
  for (const y of [-0.3, -0.42]) part(v, box(0.302, 0.03, 0.005), '#cfd8dc', 0, y, 0.03, { outline: false });
  label(v, FIRM, 0.2, 0.05, 0, -0.16, 0.029, 'none', '#263238');
}

/** A safety boot standing at (x, y, z) facing +z. */
function boot(g: THREE.Object3D, x: number, y: number, z: number, color: string) {
  part(g, rbox(0.1, 0.035, 0.26, 0.015), '#1d1d1f', x, y + 0.018, z);
  part(g, rbox(0.095, 0.08, 0.2, 0.03), color, x, y + 0.07, z + 0.02);
  part(g, rbox(0.095, 0.17, 0.11, 0.03), color, x, y + 0.14, z - 0.06);
  part(g, rbox(0.1, 0.05, 0.06, 0.02), '#ffb300', x, y + 0.05, z + 0.1, { outline: false });
}

/** A traffic cone at (x, y, z). */
function trafficCone(g: THREE.Object3D, x: number, y: number, z: number, s = 1) {
  part(g, rbox(0.26 * s, 0.03 * s, 0.26 * s, 0.01), '#e65100', x, y + 0.015 * s, z);
  part(g, cone(0.1 * s, 0.4 * s), ORANGE, x, y + 0.23 * s, z);
  part(g, cyl(0.062 * s, 0.075 * s, 0.07 * s, 16), '#f5f5f5', x, y + 0.2 * s, z, { outline: false });
}

/** A little model tree: a cluster on a stick (green, or white as in a white card model). */
function modelTree(g: THREE.Object3D, x: number, y: number, z: number, r: number, color: string) {
  part(g, cyl(0.003, 0.003, r * 1.6, 5), '#8d6e63', x, y + r * 0.8, z, { outline: false });
  part(g, ball(r), color, x, y + r * 1.9, z, { outline: false });
}

/** Wheels under a vehicle along x: a tyre, its rim and hub at (x, y, z), the arch over it on side `s`. */
function wheel(g: THREE.Object3D, x: number, r: number, z: number, s: number, archZ: number) {
  part(g, cyl(r, r, 0.22, 22), BLACK, x, r, z, { rx: Math.PI / 2 });
  part(g, cyl(r * 0.6, r * 0.6, 0.225, 16), '#b8c0c6', x, r, z, { rx: Math.PI / 2, outline: false });
  part(g, cyl(r * 0.16, r * 0.16, 0.23, 8), '#7d868c', x, r, z, { rx: Math.PI / 2, outline: false });
  part(g, ring(r + 0.05, 0.035, Math.PI), '#37474f', x, r, archZ + s * 0.005, { outline: false });
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * A CAD workstation (설계용 컴퓨터): a light oak top on black steel sled legs, a wide monitor on its
   * arm with the BIM model of the scheme in axonometric (the curtain wall picked out in orange; lit
   * in use), a second monitor turned in on the left with the ground-floor plan in its title block,
   * a 3D mouse puck by the keyboard, a three-sided scale rule, a roll of yellow trace, a little white
   * massing model, a swing-arm lamp, a mug; the tower under it with its blue light, a task chair.
   * Sat at it working the model, the hands on the keys; heard out in a design review sat back; the
   * spec read through at it.
   */
  cadStation(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.03, 0.98);
    const d = Math.min(D - 0.32, 0.66);
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const h = 0.74;
    const ty = h + 0.015;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    // The top and its sled legs.
    part(g, rbox(w, 0.03, d, 0.01), OAK, 0, h, z);
    part(g, box(w, 0.006, 0.004), shade(OAK, 0.8), 0, h - 0.01, front + 0.001, { outline: false });
    for (const sx of [-1, 1]) {
      const lx = sx * (w / 2 - 0.05);
      part(g, rbox(0.04, h - 0.03, 0.04, 0.008), STEEL_BLACK, lx, (h - 0.03) / 2, z - d / 2 + 0.06);
      part(g, rbox(0.04, h - 0.03, 0.04, 0.008), STEEL_BLACK, lx, (h - 0.03) / 2, front - 0.06);
      part(g, rbox(0.04, 0.03, d - 0.06, 0.008), STEEL_BLACK, lx, 0.015, z);
      part(g, rbox(0.04, 0.03, d - 0.06, 0.008), STEEL_BLACK, lx, h - 0.045, z);
    }
    part(g, rbox(w - 0.14, 0.025, 0.025, 0.008), STEEL_BLACK, 0, h - 0.05, z - d / 2 + 0.06);
    // The tower under it on the right, its light.
    const tx = w / 2 - 0.2;
    part(g, rbox(0.2, 0.44, 0.44, 0.015), '#1f2125', tx, 0.23, z - 0.02);
    part(g, box(0.004, 0.36, 0.006), '#29b6f6', tx - 0.07, 0.25, z + 0.2, { outline: false, material: glow('#4fc3f7') });
    for (let i = 0; i < 4; i++) part(g, box(0.12, 0.006, 0.004), '#3a3d44', tx + 0.02, 0.36 - i * 0.03, z + 0.2, { outline: false });
    // The main monitor on its arm, the BIM model on it.
    const mw = 0.6;
    const mh = 0.34;
    const mx = 0.08;
    const mz = z - d / 2 + 0.16;
    part(g, rbox(0.08, 0.05, 0.08, 0.01), STEEL_BLACK, mx, ty + 0.025, mz - 0.08);
    part(g, cyl(0.016, 0.016, 0.34, 10), STEEL_BLACK, mx, ty + 0.19, mz - 0.08, { outline: false });
    rod(g, new THREE.Vector3(mx, ty + 0.34, mz - 0.08), new THREE.Vector3(mx, ty + 0.32, mz - 0.02), 0.013, STEEL_BLACK);
    const m = frame(g, mx, ty + 0.36, mz, 0, -0.05);
    part(m, rbox(mw + 0.02, mh + 0.02, 0.025, 0.006), BLACK, 0, 0, 0);
    out.screen = screenOf(m, bimTex(), mw, mh, 0, 0, 0.0135);
    // The second monitor, turned in, the plan on it (lit in use).
    const sx2 = -w / 2 + 0.15;
    const s = frame(g, sx2, ty + 0.3, mz + 0.05, 0.45);
    part(s, rbox(0.25, 0.36, 0.022, 0.006), BLACK, 0, 0, 0);
    part(s, rbox(0.05, 0.3, 0.03, 0.01), STEEL_BLACK, 0, -0.16, -0.03);
    part(g, rbox(0.14, 0.012, 0.1, 0.004), STEEL_BLACK, sx2 + 0.01, ty + 0.006, mz + 0.03);
    (sheet(s, planTex(), 0.23, 0.33, 0, 0, 0.012).material as THREE.MeshBasicMaterial).color.set('#8a93a3');
    sheet(frame(use, sx2, ty + 0.3, mz + 0.05, 0.45), planTex(), 0.23, 0.33, 0, 0, 0.013);
    // The keyboard and mouse, the 3D mouse puck on the left of them.
    const kz = front - 0.15;
    const kb = keysAndMouse(g, 0.04, ty, kz);
    part(g, cyl(0.04, 0.045, 0.025, 18), '#37474f', -0.24, ty + 0.0125, kz + 0.01);
    part(g, cyl(0.03, 0.03, 0.03, 18), '#90a4ae', -0.24, ty + 0.04, kz + 0.01);
    part(g, ring(0.031, 0.003), '#29b6f6', -0.24, ty + 0.03, kz + 0.01, { rx: Math.PI / 2, outline: false, material: glow('#4fc3f7') });
    // The scale rule, the trace roll, a white massing model, a mug.
    scaleRule(g, w / 2 - 0.16, ty, front - 0.08, 0.25);
    traceRoll(g, -w / 2 + 0.16, ty, front - 0.12, 0.1, 0.24);
    part(g, rbox(0.1, 0.012, 0.1, 0.004), '#c8a27a', w / 2 - 0.12, ty + 0.006, z - 0.12);
    part(g, rbox(0.05, 0.14, 0.05, 0.004), CARD, w / 2 - 0.14, ty + 0.08, z - 0.13);
    part(g, rbox(0.08, 0.05, 0.04, 0.004), CARD, w / 2 - 0.1, ty + 0.037, z - 0.09);
    part(g, cyl(0.035, 0.032, 0.09, 14), '#263238', w / 2 - 0.3, ty + 0.045, front - 0.2);
    part(g, ring(0.025, 0.007, Math.PI), '#263238', w / 2 - 0.26, ty + 0.05, front - 0.2, { rz: -Math.PI / 2, outline: false });
    label(g, FIRM, 0.05, 0.016, w / 2 - 0.3, ty + 0.05, front - 0.164, 'none', '#ffffff');
    // A swing-arm lamp clamped to the back edge on the right, over the keys.
    const lx = w / 2 - 0.08;
    part(g, rbox(0.04, 0.06, 0.05, 0.01), BLACK, lx, ty + 0.02, z - d / 2 + 0.04);
    const j1 = new THREE.Vector3(lx, ty + 0.42, z - d / 2 + 0.06);
    const j2 = new THREE.Vector3(lx - 0.18, ty + 0.5, z + 0.02);
    rod(g, new THREE.Vector3(lx, ty + 0.05, z - d / 2 + 0.04), j1, 0.008, STEEL_BLACK);
    rod(g, j1, j2, 0.008, STEEL_BLACK);
    part(g, ball(0.018), BLACK, j1.x, j1.y, j1.z, { outline: false });
    part(g, cyl(0.03, 0.07, 0.09, 16), STEEL_BLACK, j2.x, j2.y - 0.04, j2.z + 0.02, { rx: 0.35 });
    part(use, ball(0.026), '#fff3c4', j2.x, j2.y - 0.075, j2.z + 0.035, { outline: false, material: glow('#fff3c4') });
    // The chair.
    const cz = front + 0.26;
    taskChair(frame(g, 0.04, 0, cz, Math.PI), 0.44);
    out.work = kb;
    out.seat = marker(g, 0.04, 0.48, cz);
    out.spots = {
      '*': satAt(g, 0.04, cz, 'type', kb),
      engineer_designReviewMeeting: satAt(g, 0.04, cz, 'meeting', kb),
      engineer_specStudy: satAt(g, 0.04, cz, 'read', kb),
    };
  },

  /**
   * The firm's site van (현장 차량): a white high-roofed van, a teal stripe and '정우건축 현장지원'
   * down its sides, the sliding door on the near side, tinted glass, an amber beacon bar and a roof
   * rack with a ladder and a tube of drawings strapped to it, hard hats on the dash, the plates; on a
   * concrete bay of its own with its lines and '현장 차량' painted on it, a traffic cone at the back.
   * Off to the site it pulls out forward with the beacon going and is gone; it backs in again after.
   */
  siteVan(g, _W, _D, _c, _def, _ctx, out) {
    const L = 4.1;
    const Wd = 1.46;
    const zc = 0.2;
    const WHITE_VAN = '#f5f6f7';
    const TEAL = '#00897b';
    const side = (s: number) => zc + s * (Wd / 2);
    // The bay: a concrete pad, its lines, the words.
    part(g, box(L + 0.6, 0.012, 1.6), '#b9bcbf', 0, 0.006, zc, { outline: false });
    for (const s of [-1, 1]) part(g, box(0.06, 0.004, 1.5), '#ffffff', s * (L / 2 + 0.22), 0.014, zc, { outline: false });
    label(g, '현장 차량', 0.9, 0.24, 0.3, 0.015, zc + 0.35, 'none', '#ffffff', 0, -Math.PI / 2);
    trafficCone(g, -L / 2 - 0.05, 0.012, zc + 0.6, 0.85);
    const van = new THREE.Group();
    g.add(van);
    // The lower body and the high box over it, the short bonnet sloping into the windscreen.
    part(van, rbox(L, 0.62, Wd, 0.14), WHITE_VAN, -0.02, 0.66, zc);
    part(van, rbox(L - 0.95, 0.72, Wd - 0.02, 0.12), WHITE_VAN, -0.45, 1.3, zc);
    part(van, rbox(L - 0.9, 0.06, Wd - 0.14, 0.03), shade(WHITE_VAN, 0.94), -0.45, 1.68, zc);
    part(van, rbox(0.7, 0.2, Wd - 0.02, 0.1), WHITE_VAN, 1.62, 0.98, zc, { rz: -0.22 });
    part(van, box(0.82, 0.02, Wd - 0.12), '#2d3e50', 1.32, 1.27, zc, { rz: -0.95, material: TINT });
    part(van, rbox(L * 0.98, 0.1, Wd - 0.02, 0.05), shade(WHITE_VAN, 0.86), -0.02, 0.36, zc);
    // Wheels.
    for (const x of [-1.32, 1.28]) for (const s of [-1, 1]) wheel(van, x, 0.3, side(s) - s * 0.1, s, side(s));
    // Both sides: tinted windows, a teal stripe, the words, door seams, handles, mirrors.
    for (const s of [-1, 1]) {
      const zz = side(s) + s * 0.004;
      const ry = s > 0 ? 0 : Math.PI;
      part(van, box(0.62, 0.42, 0.006), '#2d3e50', 0.78, 1.33, zz, { outline: false, material: TINT });
      part(van, box(1.0, 0.42, 0.006), '#2d3e50', -0.12, 1.33, zz, { outline: false, material: TINT });
      part(van, box(0.82, 0.42, 0.006), '#2d3e50', -1.22, 1.33, zz, { outline: false, material: TINT });
      part(van, box(L - 0.4, 0.07, 0.006), TEAL, -0.05, 0.86, zz, { outline: false });
      part(van, box(L - 0.4, 0.02, 0.006), ORANGE, -0.05, 0.81, zz, { outline: false });
      label(van, `${FIRM} 현장지원`, 1.3, 0.16, -0.5, 0.62, zz + s * 0.002, 'none', '#263238', ry);
      label(van, 'JUNGWOO ARCHITECTS', 0.9, 0.07, -0.5, 0.5, zz + s * 0.002, 'none', TEAL, ry);
      for (const x of [1.12, 0.42, -0.62]) part(van, box(0.008, 1.0, 0.007), '#a7adb2', x, 0.95, zz, { outline: false });
      for (const x of [0.55, -0.48]) part(van, rbox(0.13, 0.025, 0.02, 0.008), '#8d949a', x, 1.0, zz + s * 0.01, { outline: false });
      part(van, rbox(0.06, 0.14, 0.12, 0.02), BLACK, 1.14, 1.2, side(s) + s * 0.1);
      rod(van, new THREE.Vector3(1.14, 1.14, side(s)), new THREE.Vector3(1.14, 1.16, side(s) + s * 0.06), 0.012, BLACK);
    }
    // The sliding door's rail along the near side behind the windows.
    part(van, box(1.15, 0.025, 0.02), '#5f666c', -0.6, 1.1, side(1) + 0.012, { outline: false });
    // The front: grille, lamps, bumper, plate.
    const fx = L / 2 - 0.02;
    part(van, rbox(0.04, 0.16, 0.9, 0.015), '#37474f', fx, 0.64, zc);
    for (let i = 0; i < 3; i++) part(van, box(0.01, 0.01, 0.84), '#78838a', fx + 0.02, 0.59 + i * 0.05, zc, { outline: false });
    for (const s of [-1, 1]) {
      part(van, rbox(0.04, 0.05, 0.36, 0.02), '#fffde7', fx - 0.01, 0.79, zc + s * 0.5, { material: glow('#fffde7') });
      part(van, rbox(0.04, 0.05, 0.08, 0.02), '#ffb300', fx - 0.01, 0.79, zc + s * 0.66);
    }
    part(van, rbox(0.12, 0.2, Wd + 0.02, 0.04), '#5b6268', fx + 0.04, 0.42, zc);
    label(van, '81나 2026', 0.42, 0.1, fx + 0.105, 0.46, zc, '#ffffff', '#111111', Math.PI / 2);
    // Behind the windscreen: hard hats on the dash, the wheel.
    hardHat(van, 1.05, 1.0, zc - 0.35, '#fafafa', Math.PI / 2);
    hardHat(van, 1.05, 1.0, zc + 0.1, '#fdd835', Math.PI / 2, '방문자');
    part(van, ring(0.15, 0.016), BLACK, 0.85, 1.14, zc - 0.32, { ry: Math.PI / 2, rz: 0.5, outline: false });
    // The back: two doors, tail lights, a step, the plate, '안전제일'.
    const bx = -L / 2 + 0.02;
    part(van, box(0.008, 1.1, 0.008), '#a7adb2', bx - 0.01, 1.0, zc, { outline: false });
    for (const s of [-1, 1]) {
      part(van, box(0.006, 0.36, 0.5), '#2d3e50', bx - 0.012, 1.36, zc + s * 0.33, { outline: false, material: TINT });
      part(van, rbox(0.04, 0.4, 0.1, 0.02), '#d32f2f', bx - 0.005, 0.95, zc + s * 0.64, { material: glow('#e57373') });
    }
    part(van, rbox(0.14, 0.06, Wd - 0.2, 0.02), '#5b6268', bx - 0.06, 0.4, zc);
    label(van, '81나 2026', 0.4, 0.1, bx - 0.014, 0.66, zc, '#ffffff', '#111111', -Math.PI / 2);
    label(van, '안전제일', 0.36, 0.1, bx - 0.014, 1.1, zc + 0.33, '#2e7d32', '#ffffff', -Math.PI / 2);
    // The roof: a rack, a ladder and a drawings tube strapped to it; the beacon bar over the cab.
    const ry0 = 1.72;
    for (const s of [-1, 1]) part(van, rbox(L - 1.2, 0.04, 0.04, 0.01), '#3a3d44', -0.5, ry0 + 0.02, zc + s * 0.6);
    for (const x of [-1.6, -0.6, 0.4]) part(van, rbox(0.04, 0.04, 1.24, 0.01), '#3a3d44', x, ry0 + 0.06, zc);
    const lad = frame(van, -0.6, ry0 + 0.1, zc + 0.22);
    for (const s of [-1, 1]) part(lad, rbox(2.3, 0.04, 0.035, 0.01), '#c3c9ce', 0, 0, s * 0.18);
    for (let i = 0; i < 8; i++) part(lad, cyl(0.012, 0.012, 0.36, 6), '#c3c9ce', -1.05 + i * 0.3, 0, 0, { rx: Math.PI / 2, outline: false });
    part(van, cyl(0.06, 0.06, 1.2, 14), '#1e1f23', -0.7, ry0 + 0.14, zc - 0.35, { rz: Math.PI / 2 });
    for (const x of [-1.28, -0.12]) part(van, cyl(0.065, 0.065, 0.03, 14), '#e53935', x, ry0 + 0.14, zc - 0.35, { rz: Math.PI / 2, outline: false });
    const bar = 0.75;
    part(van, rbox(0.22, 0.05, 1.0, 0.02), BLACK, bar, ry0 + 0.03, zc);
    const lamps: THREE.Mesh[] = [];
    const beacon = new THREE.Group();
    van.add(beacon);
    const dark = new THREE.Group();
    van.add(dark);
    for (let i = 0; i < 4; i++) {
      const zz = zc - 0.36 + i * 0.24;
      part(dark, rbox(0.18, 0.07, 0.2, 0.03), '#c77700', bar, ry0 + 0.09, zz);
      lamps.push(part(beacon, rbox(0.18, 0.07, 0.2, 0.03), '#ffb300', bar, ry0 + 0.09, zz, { material: glow('#ffc107') }));
    }
    beacon.visible = false;
    // Out to the site: the beacon going, it pulls out forward and is gone; it backs into its bay after.
    let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    const PULL = 4.5;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      let x = 0;
      if (state === 'leaving') {
        const u = Math.min(1, (t - since) / 3);
        x = PULL * u * u;
        if (u >= 1) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, (t - since) / 4.5);
        x = PULL * (1 - u) * (1 - u);
        if (u >= 1) state = 'parked';
      }
      van.position.x = x;
      van.visible = state !== 'gone';
      const moving = state === 'leaving' || state === 'back';
      beacon.visible = moving;
      dark.visible = !moving;
      if (moving) lamps.forEach((m, i) => (m.visible = Math.sin(t * 10 + i * 1.6) > 0));
    };
    // Kitted up by the sliding door before getting in.
    const work = marker(van, -0.05, 1.2, side(1));
    out.work = work;
    out.spots = { '*': stoodAt(g, -0.05, side(1) + 0.36, 'gearUp', work) };
  },

  /**
   * An A0 plotter (대형 플로터): a long graphite body on two legs with feet, a smoked window along its
   * lid over the print head's rail, the roll of paper at the back on its spindle, the ink bay's five
   * colours, a tilted panel at the right end (printing, 62%; lit in use) and a cloth catch basket
   * slung under the front; a basket of rolled drawings beside it. While it prints the head runs to
   * and fro behind the window and the floor plan comes down out of the slot into the basket. Stood at
   * its panel.
   */
  archPlotter(g, W, D, _c, _def, _ctx, out) {
    const bw = Math.min(W - 0.32, 1.66);
    const bz = -D / 2 + 0.3;
    const by = 0.98;
    const GRAPHITE = '#3a3f46';
    // The legs and feet, a brace between.
    for (const sx of [-1, 1]) {
      const lx = sx * (bw / 2 - 0.1);
      part(g, rbox(0.06, by - 0.12, 0.08, 0.012), GRAPHITE, lx, (by - 0.12) / 2 + 0.04, bz);
      part(g, rbox(0.08, 0.04, 0.56, 0.012), GRAPHITE, lx, 0.04, bz);
      for (const z of [bz - 0.24, bz + 0.24]) part(g, cyl(0.025, 0.025, 0.03, 10), BLACK, lx, 0.015, z, { outline: false });
    }
    part(g, rbox(bw - 0.24, 0.04, 0.04, 0.01), GRAPHITE, 0, 0.3, bz - 0.04);
    // The body: the main block, its lighter lid sloping back, the smoked window, end caps.
    part(g, rbox(bw, 0.24, 0.4, 0.04), GRAPHITE, 0, by, bz);
    part(g, rbox(bw - 0.02, 0.06, 0.26, 0.03), '#5b636b', 0, by + 0.13, bz - 0.04, { rx: -0.25 });
    part(g, box(bw - 0.36, 0.05, 0.004), '#1b2430', 0, by + 0.07, bz + 0.202, { outline: false, material: SMOKE });
    for (const sx of [-1, 1]) part(g, rbox(0.12, 0.3, 0.44, 0.04), '#2b2f35', sx * (bw / 2 - 0.02), by + 0.02, bz);
    // The print head's rail behind the window and the head itself.
    part(g, box(bw - 0.4, 0.012, 0.012), CHROME, 0, by + 0.07, bz + 0.18, { outline: false });
    const head = frame(g, 0, by + 0.07, bz + 0.18);
    part(head, rbox(0.1, 0.06, 0.05, 0.01), '#cfd8dc', 0, 0, -0.01);
    part(head, box(0.02, 0.01, 0.002), '#4fc3f7', 0, 0.015, 0.016, { outline: false, material: glow('#4fc3f7') });
    // The roll at the back on its spindle.
    part(g, cyl(0.06, 0.06, bw - 0.3, 18), '#ffffff', 0, by + 0.06, bz - 0.24, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, cyl(0.025, 0.025, 0.06, 10), BLACK, sx * (bw / 2 - 0.14), by + 0.06, bz - 0.24, { rz: Math.PI / 2, outline: false });
    // The ink bay at the left end: a door with five cartridges' colours under it.
    const ix = -bw / 2 + 0.24;
    part(g, rbox(0.3, 0.12, 0.01, 0.01), '#4a5058', ix, by - 0.05, bz + 0.203);
    ['#00bcd4', '#e91e63', '#ffeb3b', '#212121', '#616161'].forEach((col, i) => part(g, box(0.035, 0.02, 0.006), col, ix - 0.1 + i * 0.05, by - 0.08, bz + 0.21, { outline: false }));
    label(g, 'A0 대형 플로터', 0.32, 0.04, 0.1, by - 0.08, bz + 0.203, 'none', '#cfd8dc');
    // The panel at the right end, tipped up, its screen and buttons.
    const px = bw / 2 - 0.2;
    const panel = frame(g, px, by + 0.13, bz + 0.16, 0, -0.6);
    part(panel, rbox(0.24, 0.16, 0.03, 0.01), '#2b2f35', 0, 0, 0);
    out.screen = screenOf(panel, plotterLcdTex(), 0.14, 0.085, -0.03, 0.015, 0.0155);
    for (let i = 0; i < 3; i++) part(panel, cyl(0.012, 0.012, 0.01, 10), i === 2 ? '#43a047' : '#90a4ae', 0.08, 0.045 - i * 0.04, 0.018, { rx: Math.PI / 2, outline: false });
    const press = marker(panel, 0, 0, 0.03);
    // The output slot: a lip of paper always out of it.
    const sy = by - 0.11;
    const sz = bz + 0.2;
    part(g, box(bw - 0.3, 0.012, 0.03), BLACK, 0, sy, sz + 0.005, { outline: false });
    part(g, box(bw - 0.42, 0.003, 0.05), '#ffffff', 0, sy - 0.01, sz + 0.03, { rx: 0.5, outline: false });
    // The catch basket: a cloth sling between two bars under the front.
    for (const [y, z] of [[0.62, sz + 0.12], [0.28, bz - 0.18]] as Array<[number, number]>) part(g, cyl(0.012, 0.012, bw - 0.2, 8), CHROME, 0, y, z, { rz: Math.PI / 2, outline: false });
    const sling = new THREE.Vector3(0, 0.62, sz + 0.12).sub(new THREE.Vector3(0, 0.28, bz - 0.18));
    const slingLen = sling.length();
    part(g, box(bw - 0.24, 0.006, slingLen), '#4e545c', 0, 0.45, (sz + 0.12 + bz - 0.18) / 2, { rx: -Math.atan2(sling.y, sling.z), outline: false });
    // While it prints: the drawing coming down out of the slot, longer and longer.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const paper = frame(use, 0, sy - 0.005, sz + 0.03, 0, 0.12);
    const ph = 0.5;
    const pw = bw - 0.42;
    (sheet(paper, plotTex(), pw, ph, 0, -ph / 2, 0).material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
    // A basket of rolled drawings beside it.
    const rx = W / 2 - 0.12;
    const rz = bz + 0.12;
    part(g, cyl(0.1, 0.09, 0.42, 16), '#3a3d44', rx, 0.21, rz);
    part(g, ring(0.1, 0.008), '#5b636b', rx, 0.42, rz, { rx: Math.PI / 2, outline: false });
    const rolls: Array<[number, number, number, string]> = [[0.03, 0.02, 0.75, '#fafafa'], [-0.04, 0.03, 0.68, '#e3f2fd'], [0.0, -0.05, 0.82, '#fffde7'], [0.05, -0.03, 0.7, '#ffffff'], [-0.04, -0.04, 0.6, '#f5f5f5']];
    for (const [dx, dz, len, col] of rolls) {
      part(g, cyl(0.026, 0.026, len, 12), col, rx + dx, len / 2 + 0.03, rz + dz, { rx: dz * 2, rz: -dx * 2 });
      part(g, cyl(0.027, 0.027, 0.02, 12), '#1565c0', rx + dx, len * 0.7, rz + dz, { rx: dz * 2, rz: -dx * 2, outline: false });
    }
    out.animate = (t) => {
      head.position.x = (bw / 2 - 0.3) * Math.sin(t * 2.4);
      const u = ((t / 12) % 1 + 1) % 1;
      paper.scale.y = 0.15 + 0.85 * u;
      paper.rotation.x = 0.12 + 0.25 * u;
    };
    out.work = press;
    out.spots = { '*': stoodAt(g, px, sz + 0.42, 'tinker', press) };
  },

  /**
   * The materials library (마감재 샘플 라이브러리): a tall oak shelving unit — boxes of samples along
   * the top (벽돌, 금속, 유리, 석재), a row of catalogues, tiles and stone standing in slots (terrazzo,
   * marble, concrete, brick, slate, oak), labelled drawers at the bottom — and a pull-out board at
   * waist height with this week's sample board on it: brick, oak, terrazzo, brass, a fabric swatch
   * and a fan of colour chips; fabric swatches hung on a rail at one end. Stood at the board picking
   * the finishes.
   */
  archMaterialLibrary(g, W, D, _c, _def, _ctx, out) {
    const uw = Math.min(W - 0.08, 1.9);
    const ud = 0.42;
    const z = -D / 2 + ud / 2 + 0.03;
    const front = z + ud / 2;
    const uh = 2.0;
    // The carcass: sides, back, shelves.
    for (const sx of [-1, 1]) part(g, rbox(0.035, uh, ud, 0.008), OAK, sx * (uw / 2 - 0.0175), uh / 2, z);
    part(g, box(uw - 0.04, uh - 0.04, 0.015), shade(OAK, 0.82), 0, uh / 2, z - ud / 2 + 0.01, { outline: false });
    const shelves = [0.04, 0.5, 0.92, 1.3, 1.62, uh - 0.02];
    for (const y of shelves) part(g, rbox(uw - 0.05, 0.03, ud - 0.02, 0.006), OAK, 0, y, z);
    // Drawers at the bottom, labelled.
    const dn = 4;
    const dw = (uw - 0.08) / dn;
    ['타일', '석재', '목재', '패브릭'].forEach((t, i) => {
      const dx = -uw / 2 + 0.04 + dw * (i + 0.5);
      part(g, rbox(dw - 0.02, 0.42, 0.02, 0.008), shade(OAK, 1.06), dx, 0.27, front - 0.005);
      part(g, rbox(0.12, 0.02, 0.02, 0.006), STEEL_BLACK, dx, 0.4, front + 0.012);
      label(g, t, 0.14, 0.05, dx, 0.33, front + 0.006, '#ffffff', '#3e2723');
    });
    // The pull-out board at waist height and the sample board on it.
    // Pulled out from under the catalogues' shelf on its runners.
    const by = 0.86;
    const bc = front + 0.13;
    part(g, rbox(uw * 0.55, 0.025, 0.34, 0.008), shade(OAK, 0.95), -0.1, by, bc);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.02, 0.4), CHROME, -0.1 + sx * (uw * 0.27), by - 0.02, bc - 0.12, { outline: false });
    const bt = by + 0.0125;
    part(g, rbox(0.42, 0.008, 0.28, 0.003), '#9e9e9e', -0.16, bt + 0.004, bc, { ry: 0.08 });
    const chips: Array<[number, number, number, number, string]> = [[-0.3, -0.07, 0.12, 0.08, '#b5532f'], [-0.15, -0.07, 0.12, 0.08, '#c79a62'], [-0.01, -0.06, 0.1, 0.1, '#ece8e1'], [-0.3, 0.06, 0.1, 0.1, '#8d8d8d'], [-0.16, 0.06, 0.14, 0.03, '#c9a227'], [-0.02, 0.07, 0.11, 0.09, '#5c7a8a']];
    for (const [cx, cz, cw, cd, col] of chips) part(g, rbox(cw, 0.012, cd, 0.003), col, cx, bt + 0.014, bc + cz, { ry: 0.08 });
    for (let i = 0; i < 9; i++) part(g, ball(0.005), ['#9e9e9e', '#795548', '#212121'][i % 3], -0.035 + (i % 3) * 0.025, bt + 0.021, bc - 0.09 + Math.floor(i / 3) * 0.025, { outline: false });
    // The colour fan, fanned open beside the board.
    ['#ef9a9a', '#ffcc80', '#fff59d', '#a5d6a7', '#80deea', '#9fa8da', '#ce93d8'].forEach((col, i) => part(g, rbox(0.035, 0.003, 0.17, 0.002), col, 0.2 + Math.sin(-0.6 + i * 0.2) * 0.07, bt + 0.004 + i * 0.002, bc + 0.02 - Math.cos(-0.6 + i * 0.2) * 0.07, { ry: -0.6 + i * 0.2 }));
    const work = marker(g, -0.14, bt + 0.03, bc);
    // Tiles and stone standing in slots on the shelf over the drawers' top.
    const tileCols = ['#e8e4dc', '#cfd2d4', '#b5532f', '#f2efe9', '#5f6366', '#c79a62', '#9fb3a3', '#d9c7b0', '#8d6e63', '#e0e0e0', '#37474f', '#c2a68b'];
    tileCols.forEach((col, i) => {
      const tx = -uw / 2 + 0.1 + i * ((uw - 0.2) / (tileCols.length - 1));
      part(g, rbox(0.12, 0.2, 0.018, 0.005), col, tx, 0.5 + 0.115, z + 0.02, { rx: -0.08 + (i % 3) * 0.04 });
      if (i === 0 || i === 3) for (let k = 0; k < 5; k++) part(g, ball(0.007), ['#9e9e9e', '#795548', '#455a64'][k % 3], tx - 0.04 + k * 0.02, 0.56 + (k % 2) * 0.06, z + 0.031, { outline: false });
      if (i === 1) for (let k = 0; k < 3; k++) part(g, box(0.1, 0.004, 0.002), '#9e9e9e', tx, 0.56 + k * 0.05, z + 0.031, { rz: 0.4 - k * 0.3, outline: false });
    });
    // Catalogues on the next shelf, some labelled.
    const spines = ['#263238', '#8d6e63', '#c62828', '#00695c', '#f9a825', '#37474f', '#5d4037', '#1565c0', '#9e9e9e', '#6a1b9a', '#2e7d32', '#ef6c00', '#455a64', '#ad1457'];
    spines.forEach((col, i) => {
      const sx = -uw / 2 + 0.07 + i * 0.07;
      if (sx > uw / 2 - 0.5) return;
      part(g, rbox(0.055, 0.3, 0.26, 0.006), col, sx, 0.935 + 0.15 + 0.01, z + 0.02, { rz: i === 6 ? 0.18 : 0 });
    });
    label(g, '타일·석재 카탈로그', 0.42, 0.028, -uw / 2 + 0.33, 1.3, front - 0.008, '#ffffff', '#37474f');
    // Wood chips on rings, a few loose sample blocks on the right of the catalogues.
    for (let i = 0; i < 6; i++) part(g, rbox(0.06, 0.16, 0.012, 0.004), ['#c79a62', '#8d6e63', '#d7b98a', '#5d4037', '#e0c095', '#a1887f'][i], uw / 2 - 0.38 + i * 0.022, 1.03, z + 0.05, { ry: -0.5 + i * 0.2 });
    part(g, ring(0.03, 0.004), CHROME, uw / 2 - 0.33, 1.1, z + 0.05, { outline: false });
    part(g, rbox(0.1, 0.07, 0.1, 0.01), '#bdbdbd', uw / 2 - 0.12, 0.97, z + 0.04);
    part(g, rbox(0.08, 0.06, 0.08, 0.01), '#b5532f', uw / 2 - 0.13, 1.035, z + 0.04, { ry: 0.3 });
    // Sample boxes along the top two shelves.
    const boxes: Array<[string, string]> = [['벽돌', '#ffffff'], ['금속', '#eceff1'], ['유리', '#ffffff'], ['석재', '#f5f5f5'], ['조명', '#eceff1']];
    boxes.forEach(([t, col], i) => {
      const x = -uw / 2 + 0.2 + i * ((uw - 0.4) / (boxes.length - 1));
      part(g, rbox(0.3, 0.26, 0.34, 0.01), col, x, 1.33 + 0.13, z + 0.01);
      label(g, t, 0.16, 0.06, x, 1.47, z + 0.181, 'none', '#37474f');
      part(g, rbox(0.3, 0.24, 0.34, 0.01), i % 2 ? '#d7ccc8' : '#cfd8dc', x, 1.64 + 0.12, z + 0.01);
    });
    // The fabric swatches hung on a rail at the right end, in front of the drawers' top corner.
    const fx = uw / 2 - 0.2;
    part(g, cyl(0.008, 0.008, 0.36, 8), CHROME, fx, 0.88, front - 0.03, { rz: Math.PI / 2, outline: false });
    ['#5c6bc0', '#a1887f', '#7cb342', '#ef9a9a', '#90a4ae'].forEach((col, i) => part(g, box(0.06, 0.24, 0.006), col, fx - 0.14 + i * 0.07, 0.76, front - 0.025 + (i % 2) * 0.006, { outline: false }));
    // A plaque on top.
    label(g, 'MATERIAL LIBRARY', 0.7, 0.07, 0, uh - 0.08, front + 0.002, STEEL_BLACK, '#ffffff');
    out.work = work;
    out.spots = { '*': stoodAt(g, -0.14, front + 0.52, 'rummage', work) };
  },

  /**
   * The pin-up wall (렌더링 핀업 보드): charcoal felt panels under a black header naming the competition,
   * the scheme pinned up in A1 and A2 — the dusk perspective, the lounge inside, the section, the site
   * plan, the programme diagram — with black pins at the corners, the crit's sticky notes and a red
   * circle on the section; a track of three spotlights over it that come on in use; a ledge of
   * markers and a roll of tape, the next sheet rolled up waiting. Hung on the wall, or on two posts in
   * the open. The crit gathers round it; a sheet is pinned up stood at it.
   */
  archPinupBoard(g, W, D, _c, _def, ctx, out) {
    const bw = W - 0.14;
    const bh = 1.2;
    const z = -D / 2 + (ctx.againstWall ? 0.03 : 0.22);
    const y = ctx.againstWall ? 1.42 : 1.3;
    if (!ctx.againstWall)
      for (const sx of [-1, 1]) {
        part(g, rbox(0.05, y + 0.4, 0.05, 0.01), STEEL_BLACK, sx * (bw / 2 + 0.02), (y + 0.4) / 2, z - 0.03);
        part(g, rbox(0.08, 0.04, 0.6, 0.015), STEEL_BLACK, sx * (bw / 2 + 0.02), 0.02, z);
      }
    part(g, rbox(bw + 0.04, bh + 0.04, 0.04, 0.01), STEEL_BLACK, 0, y, z);
    part(g, box(bw, bh, 0.012), '#4a4f55', 0, y, z + 0.02, { outline: false });
    for (const sx of [-0.33, 0.33]) part(g, box(0.004, bh, 0.004), '#3a3e43', sx * bw, y, z + 0.027, { outline: false });
    const fz = z + 0.027;
    label(g, '2026 공모전 핀업 · 성수 복합문화공간', bw - 0.1, 0.09, 0, y + bh / 2 - 0.07, fz, '#111214', '#ffffff');
    // The sheets.
    const sheets: Array<[Parameters<typeof renderTex>[0], number, number, number, number]> = [
      ['exterior', -0.56, 0.0, 0.66, 0.46],
      ['interior', 0.07, 0.17, 0.42, 0.29],
      ['section', 0.07, -0.25, 0.42, 0.29],
      ['site', 0.6, 0.17, 0.4, 0.28],
      ['diagram', 0.6, -0.25, 0.4, 0.28],
    ];
    sheets.forEach(([kind, sx, sy, sw, sh], i) => {
      sheet(g, renderTex(kind), sw, sh, sx, y + sy - 0.03, fz + 0.001 + i * 0.0005);
      for (const cx of [-1, 1]) for (const cy of [-1, 1]) part(g, ball(0.01), '#111111', sx + cx * (sw / 2 - 0.015), y + sy - 0.03 + cy * (sh / 2 - 0.015), fz + 0.008, { outline: false });
    });
    // The crit's notes and a red circle on the section.
    const notes: Array<[number, number, string, string]> = [[-0.82, -0.36, '#fff176', '입구 더 크게?'], [-0.3, -0.38, '#f48fb1', '재료 톤 통일'], [0.34, 0.33, '#a5d6a7', '좋아요!'], [0.86, -0.06, '#81d4fa', '주차 동선?']];
    for (const [nx, ny, col, text] of notes) label(g, text, 0.17, 0.1, nx, y + ny, fz + 0.006, col, '#37474f');
    part(g, ring(0.07, 0.005), '#e53935', 0.12, y - 0.24, fz + 0.007, { outline: false });
    // The track and its three lights, lit in use.
    const ty = y + bh / 2 + 0.16;
    part(g, rbox(bw, 0.035, 0.04, 0.01), STEEL_BLACK, 0, ty, z + 0.12);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * (bw / 2 - 0.1), ty, z + 0.1), new THREE.Vector3(sx * (bw / 2 - 0.1), ty, z + 0.02), 0.01, STEEL_BLACK);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    for (const lx of [-0.6, 0, 0.6]) {
      part(g, rbox(0.04, 0.06, 0.04, 0.01), STEEL_BLACK, lx, ty - 0.04, z + 0.12);
      const head = frame(g, lx, ty - 0.08, z + 0.15, 0, 0.7);
      part(head, cyl(0.035, 0.045, 0.12, 14), STEEL_BLACK, 0, -0.04, 0);
      part(head, cyl(0.035, 0.035, 0.005, 14), '#5b636b', 0, -0.1, 0, { outline: false });
      const on = frame(use, lx, ty - 0.08, z + 0.15, 0, 0.7);
      part(on, cyl(0.035, 0.035, 0.006, 14), '#fff3c4', 0, -0.102, 0, { outline: false, material: glow('#fff3c4') });
      part(on, cone(0.24, 0.62, 18), '#fff3c4', 0, -0.41, 0, { outline: false, material: BEAM, shadow: false });
    }
    // The ledge: markers, tape, the next sheet rolled up.
    const ly = y - bh / 2 - 0.04;
    part(g, rbox(bw, 0.025, 0.08, 0.008), STEEL_BLACK, 0, ly, z + 0.05);
    for (const [i, col] of ['#e53935', '#1565c0', '#212121', '#2e7d32'].entries()) part(g, cyl(0.009, 0.009, 0.13, 8), col, -0.7 + i * 0.05, ly + 0.02, z + 0.06, { rz: Math.PI / 2, ry: 0.2, outline: false });
    part(g, cyl(0.035, 0.035, 0.025, 14), '#b0bec5', -0.38, ly + 0.025, z + 0.06);
    part(g, cyl(0.02, 0.02, 0.026, 14), '#ffffff', -0.38, ly + 0.025, z + 0.06, { outline: false });
    part(g, cyl(0.03, 0.03, 0.6, 12), '#fafafa', 0.45, ly + 0.04, z + 0.06, { rz: Math.PI / 2 });
    part(g, cyl(0.031, 0.031, 0.03, 12), '#1565c0', 0.3, ly + 0.04, z + 0.06, { rz: Math.PI / 2, outline: false });
    const pin = marker(g, 0.6, y + 0.14, fz);
    out.work = pin;
    out.spots = { archPinRendering: stoodAt(g, 0.6, z + 0.55, 'board', pin) };
  },

  /**
   * The site model on its plinth (대지 모형 테이블): a white plinth with a black kick, a walnut-framed
   * base on it and the site at 1:200 — the hill behind built up in layers of cork, the river along
   * the front, the road, the neighbours as plain white blocks, little trees — and the scheme in
   * basswood and clear acrylic, its roof garden green, lit from inside in use; a plaque on the
   * plinth's front. Bent over it moving the blocks about; or stood at its end turned out to the room
   * rehearsing the pitch, pointing back at the scheme.
   */
  archSiteModel(g, W, D, _c, _def, _ctx, out) {
    const pw = W - 0.16;
    const pd = Math.min(D - 0.12, 0.84);
    const ph = 0.84;
    const front = pd / 2;
    // The plinth and its kick.
    part(g, rbox(pw - 0.04, 0.08, pd - 0.04, 0.01), '#1d1e22', 0, 0.04, 0);
    part(g, rbox(pw, ph - 0.08, pd, 0.012), '#f6f6f4', 0, 0.08 + (ph - 0.08) / 2, 0);
    label(g, `성수 복합문화공간 · 1:200 — ${FIRM}`, 0.86, 0.06, 0, ph - 0.16, front + 0.002, 'none', '#37474f');
    // The base: a walnut frame and the ground in it.
    const top = ph;
    part(g, rbox(pw - 0.06, 0.04, pd - 0.06, 0.008), '#5d4037', 0, top + 0.02, 0);
    const gy = top + 0.041;
    part(g, box(pw - 0.12, 0.004, pd - 0.12), '#ece6d6', 0, gy, 0, { outline: false });
    // The river along the front, the road across.
    part(g, box(pw - 0.12, 0.004, 0.12), '#90caf9', 0, gy + 0.002, front - 0.12, { outline: false });
    part(g, box(pw - 0.12, 0.004, 0.08), '#9e9e9e', 0, gy + 0.003, front - 0.26, { outline: false });
    part(g, box(0.08, 0.004, pd - 0.42), '#9e9e9e', -0.3, gy + 0.003, -0.13, { outline: false });
    for (let i = 0; i < 10; i++) part(g, box(0.04, 0.002, 0.006), '#ffffff', -0.75 + i * 0.17, gy + 0.006, front - 0.26, { outline: false });
    // The hill in cork layers at the back left.
    const hx = -0.62;
    const hz = -0.18;
    for (let i = 0; i < 5; i++) {
      const r = 0.24 - i * 0.04;
      part(g, cyl(r, r, 0.02, 20), i % 2 ? '#c49a6c' : '#b58a5a', hx + i * 0.01, gy + 0.01 + i * 0.02, hz - i * 0.01, { outline: false }).scale.set(1.3, 1, 0.8);
    }
    // The neighbours: plain white blocks.
    const blocks: Array<[number, number, number, number, number]> = [[-0.14, -0.22, 0.14, 0.12, 0.12], [-0.14, -0.04, 0.12, 0.08, 0.09], [0.62, -0.2, 0.16, 0.14, 0.2], [0.78, -0.02, 0.12, 0.1, 0.07], [0.62, 0.04, 0.12, 0.08, 0.1], [0.84, -0.22, 0.06, 0.1, 0.14]];
    for (const [bx, bz, bw2, bd, bh2] of blocks) part(g, rbox(bw2, bh2, bd, 0.004), CARD, bx, gy + bh2 / 2, bz);
    // The scheme: a basswood podium, a glass box over it cantilevered, a roof garden, a lit interior.
    const sx = 0.22;
    const sz = -0.08;
    part(g, rbox(0.42, 0.06, 0.26, 0.004), BASSWOOD, sx, gy + 0.03, sz);
    part(g, rbox(0.12, 0.12, 0.14, 0.004), BASSWOOD, sx - 0.12, gy + 0.12, sz - 0.04);
    part(g, rbox(0.38, 0.1, 0.2, 0.004), BASSWOOD, sx + 0.04, gy + 0.23, sz - 0.02);
    part(g, box(0.36, 0.08, 0.004), '#a9d4ef', sx + 0.04, gy + 0.23, sz + 0.082, { material: GLASS, outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.004, 0.08, 0.006), BASSWOOD, sx - 0.13 + i * 0.07, gy + 0.23, sz + 0.083, { outline: false });
    part(g, box(0.34, 0.006, 0.18), '#7cb342', sx + 0.04, gy + 0.283, sz - 0.02, { outline: false });
    for (let i = 0; i < 5; i++) modelTree(g, sx - 0.1 + i * 0.07, gy + 0.286, sz - 0.06 + (i % 2) * 0.05, 0.014, '#558b2f');
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, box(0.34, 0.06, 0.16), '#ffe082', sx + 0.04, gy + 0.23, sz - 0.02, { outline: false, material: glow('#ffe9a8') });
    part(use, box(0.36, 0.035, 0.2), '#ffe082', sx, gy + 0.03, sz + 0.035, { outline: false, material: glow('#fff1c1') });
    // Trees along the river and on the hill, white ones in the plaza; little people.
    for (let i = 0; i < 9; i++) modelTree(g, -0.78 + i * 0.19, gy, front - 0.2, 0.025, i % 3 ? '#6b8e3a' : '#7cb342');
    for (let i = 0; i < 4; i++) modelTree(g, hx - 0.12 + i * 0.08, gy + 0.08, hz + 0.04 - (i % 2) * 0.06, 0.022, '#558b2f');
    for (let i = 0; i < 3; i++) modelTree(g, sx - 0.1 + i * 0.1, gy, sz + 0.2, 0.02, CARD);
    for (const [px, pz] of [[0.1, 0.12], [0.16, 0.1], [0.36, 0.13]] as Array<[number, number]>) part(g, cyl(0.004, 0.004, 0.035, 5), '#455a64', px, gy + 0.018, pz, { outline: false });
    // A north arrow and a scale bar on the base's corner.
    part(g, cone(0.02, 0.05, 3), '#263238', -0.86, gy + 0.004, -0.3, { rx: -Math.PI / 2, outline: false });
    part(g, box(0.16, 0.003, 0.012), '#263238', 0.8, gy + 0.004, front - 0.06, { outline: false });
    const scheme = marker(g, sx, gy + 0.2, sz + 0.06);
    out.work = scheme;
    // Rehearsing the pitch: in front of it turned out to the room, the scheme off behind the right hand.
    const pitch = spot(g, 'stand', 0.68, 0, front + 0.3, -0.25);
    pitch.work = scheme;
    pitch.motion = 'present';
    out.spots = {
      archSiteStudy: stoodAt(g, sx, front + 0.32, 'tinker', scheme),
      archPresentScheme: pitch,
      '*': stoodAt(g, sx, front + 0.32, 'tinker', scheme),
    };
  },

  /**
   * The site gear rack (현장 안전 장비 걸이) by the way out: a black steel frame on the wall, the firm's
   * white hard hats and a yellow visitor's one on the top shelf, hi-vis vests on hangers in a row,
   * two pairs of safety boots underneath, a clipboard of the site checklist, a tape and a laser
   * measure in a tray, the yellow-and-black '안전모 착용' sign over it. In use one hat and one vest are
   * gone — put on — the architect kitting up at it.
   */
  archGearRack(g, W, D, _c, _def, _ctx, out) {
    const rw = Math.min(W - 0.08, 0.9);
    const rd = 0.34;
    const z = -D / 2 + rd / 2 + 0.03;
    const front = z + rd / 2;
    const rh = 1.95;
    // The frame: two uprights, a back of perforated steel, shelves.
    for (const sx of [-1, 1]) part(g, rbox(0.04, rh, rd, 0.008), STEEL_BLACK, sx * (rw / 2 - 0.02), rh / 2, z);
    part(g, box(rw - 0.04, rh - 0.1, 0.012), '#3d4045', 0, rh / 2, z - rd / 2 + 0.01, { outline: false });
    for (let i = 0; i < 7; i++) for (let j = 0; j < 14; j++) part(g, box(0.012, 0.012, 0.004), '#2a2c30', -rw / 2 + 0.1 + i * 0.12, 0.2 + j * 0.12, z - rd / 2 + 0.018, { outline: false });
    for (const y of [0.06, 0.42, 1.62]) part(g, rbox(rw - 0.04, 0.025, rd - 0.02, 0.006), STEEL_BLACK, 0, y, z);
    // The sign over it.
    part(g, rbox(rw - 0.06, 0.16, 0.012, 0.004), '#fdd835', 0, rh - 0.06, z + 0.02);
    for (let i = 0; i < 8; i++) part(g, box(0.04, 0.16, 0.002), '#212121', -rw / 2 + 0.08 + i * 0.11, rh - 0.06, z + 0.027, { rz: 0.5, outline: false }).scale.set(1, 0.6, 1);
    label(g, '현장 출입 시 안전모 착용', rw - 0.2, 0.08, 0, rh - 0.06, z + 0.03, '#fdd835', '#212121');
    // Hats on the top shelf: the firm's white ones and a yellow visitor's; the first is the one taken.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const hy = 1.635;
    hardHat(idle, -0.28, hy, z + 0.04, '#fafafa', 0.2);
    hardHat(g, 0.0, hy, z + 0.04, '#fafafa', -0.1);
    hardHat(g, 0.27, hy, z + 0.04, '#fdd835', 0.1, '방문자');
    // The vests on a rail of hooks; the first is the one taken.
    const vy = 1.48;
    part(g, cyl(0.012, 0.012, rw - 0.06, 8), CHROME, 0, vy + 0.02, z + 0.02, { rz: Math.PI / 2, outline: false });
    vest(idle, -0.27, vy, z + 0.04, HIVIS);
    vest(g, -0.02, vy, z + 0.05, HIVIS);
    vest(g, 0.24, vy, z + 0.06, ORANGE);
    // A clipboard hung on the right upright, the tray of measuring tools on the boots' shelf.
    const cb = frame(g, rw / 2 + 0.005, 1.0, z + 0.06, Math.PI / 2);
    part(cb, rbox(0.22, 0.3, 0.012, 0.006), '#8d6e63', 0, 0, 0);
    part(cb, box(0.19, 0.25, 0.002), '#ffffff', 0, -0.015, 0.007, { outline: false });
    part(cb, rbox(0.08, 0.03, 0.02, 0.008), CHROME, 0, 0.14, 0.01);
    label(cb, '안전 점검표', 0.16, 0.035, 0, 0.08, 0.009, 'none', '#263238');
    for (let i = 0; i < 5; i++) {
      part(cb, box(0.015, 0.015, 0.002), '#43a047', -0.075, 0.03 - i * 0.04, 0.009, { outline: false });
      part(cb, box(0.12, 0.006, 0.002), '#90a4ae', 0.02, 0.03 - i * 0.04, 0.009, { outline: false });
    }
    part(g, rbox(0.3, 0.04, 0.16, 0.008), '#455a64', 0.2, 0.455, z + 0.04);
    part(g, rbox(0.08, 0.08, 0.04, 0.02), '#fdd835', 0.12, 0.51, z + 0.04);
    part(g, cyl(0.02, 0.02, 0.041, 12), '#212121', 0.12, 0.51, z + 0.04, { rx: Math.PI / 2, outline: false });
    part(g, rbox(0.05, 0.11, 0.025, 0.01), '#e65100', 0.26, 0.53, z + 0.04);
    part(g, box(0.035, 0.025, 0.002), '#80deea', 0.26, 0.56, z + 0.054, { outline: false });
    // Boots underneath.
    boot(g, -0.3, 0.075, z + 0.02, '#6d4c41');
    boot(g, -0.18, 0.075, z + 0.02, '#6d4c41');
    boot(g, 0.06, 0.075, z + 0.02, '#263238');
    boot(g, 0.18, 0.075, z + 0.02, '#263238');
    const hooks = marker(g, -0.27, 1.3, front);
    out.work = hooks;
    out.spots = { '*': stoodAt(g, -0.15, front + 0.38, 'gearUp', hooks) };
  },
};
