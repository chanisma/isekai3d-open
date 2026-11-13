import * as THREE from 'three';
import { marker, rod, screenMesh, shade, spot, tint, type Builder, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';
import { pavementSign } from './dentist';
import { frontDesk } from './frontDesk';

/**
 * The science lab drawn as itself (2026-10-26 workplace pipeline, at the user's request): the
 * chemistry bench with its titration, burner and microscope, the chalkboard of equations, the -80℃
 * sample freezer, the inventor's workbench with a robot arm half built on it, the experiment's
 * control console, the researcher's desk with a paper on its screen; and what the lab was missing
 * (workFurniture/scientist.ts): a fume hood, an instrument bench, the safety station, a 3D printer
 * and a rack of gas cylinders. The space centre's research room shares the research desk.
 */

const BLACK = '#2b2b30';
const STEEL = '#b0bac2';
const CHROME = '#e3e7ea';
const ENAMEL = '#f1f3f4';
const RESIN = '#3a3f45';
const LABGREY = '#dfe4e7';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const MATH = '"Cambria Math","Times New Roman",serif';

/** Lit parts (LEDs, flames, a lamp's face): one unlit material a colour. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
const glowing = (g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rx = 0) =>
  part(g, geom, color, x, y, z, { outline: false, shadow: false, material: glow(color), rx });

const GLASS = new THREE.MeshToonMaterial({ color: '#dff4fb', transparent: true, opacity: 0.32, depthWrite: false });
const PANE = new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
/** A see-through part (no outline: the rim round it draws the edge). */
function glass(g: THREE.Object3D, geom: THREE.BufferGeometry, x: number, y: number, z: number, mat: THREE.Material = GLASS, rx = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  m.renderOrder = 2;
  g.add(m);
  return m;
}
/** A coloured liquid seen through its glass. */
const fluids = new Map<string, THREE.MeshToonMaterial>();
function fluid(color: string): THREE.MeshToonMaterial {
  let m = fluids.get(color);
  if (!m) fluids.set(color, (m = new THREE.MeshToonMaterial({ color, transparent: true, opacity: 0.82 })));
  return m;
}
const liquid = (g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number) =>
  part(g, geom, color, x, y, z, { outline: false, shadow: false, material: fluid(color) });

const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
const cone = (r: number, h: number) => shape(`cone${r},${h}`, () => new THREE.ConeGeometry(r, h, 14));

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the board and the signs (once each; blank outside a browser).

type Paint = (c: CanvasRenderingContext2D) => void;
const paints = new Map<string, THREE.Texture>();
function painted(key: string, w: number, h: number, paint: Paint): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(w, h, paint)));
  return t;
}
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', bold = true, font = FONT) {
  c.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
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

/** A flat picture lit by itself (a screen's face, a sign); `color` dims it. */
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
/** Words on a plate (a sign, a bottle's label). */
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
/** A puff of something (smoke, vapour) that fades as it rises: its own material, so each fades by itself. */
function puff(g: THREE.Object3D, color: string, r: number): THREE.Mesh {
  const m = new THREE.Mesh(ball(r), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false }));
  m.userData.ownMaterial = true;
  g.add(m);
  return m;
}
/** Wisps rising from (x, y, z) over `rise`, round and round every `period` seconds. */
function wisps(g: THREE.Object3D, n: number, color: string, r: number, x: number, y: number, z: number, rise: number, period: number) {
  const ms = Array.from({ length: n }, () => puff(g, color, r));
  return (t: number) =>
    ms.forEach((m, i) => {
      const k = ((t / period + i / n) % 1 + 1) % 1;
      m.position.set(x + 0.025 * Math.sin(t * 1.3 + i * 2), y + k * rise, z + 0.02 * Math.cos(t + i));
      m.scale.setScalar(0.6 + 1.4 * k);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - k);
    });
}

/** A chalkboard worked through: a wave equation solved, Maxwell, a Gaussian, a sketch, notes in Korean. */
const paintChalk: Paint = (c) => {
  c.fillStyle = '#2e4a3a';
  c.fillRect(0, 0, 1024, 512);
  // Old rubbed-out work, a haze of chalk.
  const r = seeded(7);
  for (let i = 0; i < 26; i++) {
    c.fillStyle = `rgba(230,240,230,${0.03 + r() * 0.04})`;
    c.beginPath();
    c.ellipse(r() * 1024, r() * 512, 60 + r() * 120, 14 + r() * 26, r() * 0.4 - 0.2, 0, Math.PI * 2);
    c.fill();
  }
  const ch = '#f1f4ee';
  text(c, 'iℏ ∂ψ/∂t = − (ℏ²/2m) ∇²ψ + V ψ', 36, 54, 40, ch, 'left', false, MATH);
  text(c, 'ψ(x,t) = Σ cₙ φₙ(x) e^(−iEₙt/ℏ)', 60, 116, 34, ch, 'left', false, MATH);
  text(c, 'Eₙ = n²π²ℏ² / 2mL²', 60, 172, 36, '#ffe082', 'left', false, MATH);
  c.strokeStyle = '#ffe082';
  c.lineWidth = 3;
  c.strokeRect(46, 146, 380, 52);
  text(c, '∇·E = ρ/ε₀     ∇×B = μ₀J + μ₀ε₀ ∂E/∂t', 36, 252, 30, ch, 'left', false, MATH);
  text(c, '∫ e^(−x²) dx = √π', 60, 316, 36, ch, 'left', false, MATH);
  text(c, '경계 조건: φ(0) = φ(L) = 0', 40, 384, 28, '#b3e5fc');
  text(c, '→ 실험값과 비교할 것!', 40, 436, 28, '#ef9a9a');
  // A sketch: axes and the first three modes in a box.
  const ox = 640;
  const oy = 230;
  c.strokeStyle = ch;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(ox, oy - 170);
  c.lineTo(ox, oy + 10);
  c.lineTo(ox + 330, oy + 10);
  c.stroke();
  text(c, 'x', ox + 340, oy + 12, 26, ch, 'left', false, MATH);
  text(c, 'φₙ', ox - 44, oy - 170, 26, ch, 'left', false, MATH);
  const cols = ['#ffffff', '#80deea', '#ffab91'];
  for (let n = 1; n <= 3; n++) {
    c.strokeStyle = cols[n - 1];
    c.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = ox + (i / 100) * 300;
      const y = oy - 50 * n + 8 - 34 * Math.sin((n * Math.PI * i) / 100);
      (i ? c.lineTo : c.moveTo).call(c, x, y);
    }
    c.stroke();
    text(c, `n=${n}`, ox + 306, oy - 50 * n + 8, 20, cols[n - 1], 'left', false, MATH);
  }
  // A note circled, an arrow to it.
  text(c, '∴ 증명 끝?', 720, 330, 34, ch);
  c.strokeStyle = '#fff59d';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(800, 330, 120, 36, -0.05, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(440, 172);
  c.quadraticCurveTo(620, 260, 690, 318);
  c.stroke();
  text(c, '2026.10.26 · 이론팀', 1000, 490, 22, 'rgba(241,244,238,0.7)', 'right', false);
};

/** The periodic table on the back of the board (a real one: s, p, d and f blocks coloured). */
const ELEMENTS = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
const paintPeriodic: Paint = (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 1024, 576);
  text(c, '원소 주기율표', 512, 30, 30, '#263238', 'center');
  const cw = 54;
  const chh = 52;
  const x0 = 26;
  const y0 = 64;
  const cell = (z: number, col: number, row: number) => {
    const s = ELEMENTS[z - 1];
    const block = row >= 8 ? 'f' : col <= 2 || z === 2 ? 's' : col >= 13 ? 'p' : 'd';
    c.fillStyle = { s: '#ef9a9a', p: '#fff59d', d: '#90caf9', f: '#a5d6a7' }[block];
    const x = x0 + (col - 1) * cw;
    const y = y0 + (row - 1) * chh + (row >= 8 ? 14 : 0);
    c.fillRect(x + 1, y + 1, cw - 2, chh - 2);
    text(c, String(z), x + 5, y + 11, 11, '#37474f', 'left', false);
    text(c, s, x + cw / 2, y + chh / 2 + 6, 20, '#212121', 'center');
  };
  let z = 1;
  const lengths = [2, 8, 8, 18, 18, 32, 32];
  lengths.forEach((n, p) => {
    const row = p + 1;
    for (let i = 0; i < n; i++, z++) {
      let col: number;
      if (n === 2) col = i === 0 ? 1 : 18;
      else if (n === 8) col = i < 2 ? i + 1 : i + 11;
      else if (n === 18) col = i + 1;
      else if (i < 2) col = i + 1;
      else if (i < 17) {
        // The lanthanides and actinides (La… / Ac…) go in the rows underneath.
        cell(z, i + 1, row + 2);
        continue;
      } else col = i - 14;
      cell(z, col, row);
    }
  });
};

/** A paper being written: the LaTeX source on the left, the PDF on the right with an equation and a plot. */
const paintPaper: Paint = (c) => {
  c.fillStyle = '#1e1f24';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#2d2f36';
  c.fillRect(0, 0, 512, 22);
  text(c, 'main.tex — 연구논문_v7', 10, 12, 12, '#cfd8dc');
  const src: Array<[string, string]> = [
    ['\\section{서론}', '#ce93d8'], ['고온 초전도체의 임계 전류는', '#e0e0e0'], ['온도에 따라 급격히 변한다', '#e0e0e0'], ['\\cite{kim2025}.', '#80cbc4'], ['', ''],
    ['\\begin{equation}', '#ce93d8'], ['J_c(T)=J_0(1-T/T_c)^{3/2}', '#ffcc80'], ['\\end{equation}', '#ce93d8'], ['', ''], ['\\begin{figure}', '#ce93d8'], ['\\includegraphics{jc.pdf}', '#80cbc4'],
  ];
  src.forEach(([s, col], i) => text(c, s, 10, 38 + i * 20, 11, col, 'left', false, 'Consolas, monospace'));
  c.fillStyle = '#ffffff';
  c.fillRect(250, 30, 254, 284);
  text(c, '고온 초전도 박막의', 377, 50, 13, '#111', 'center');
  text(c, '임계 전류 밀도 연구', 377, 67, 13, '#111', 'center');
  text(c, '함소희 · 변재원 · 노경수', 377, 84, 9, '#555', 'center', false);
  c.fillStyle = '#9e9e9e';
  for (let i = 0; i < 6; i++) c.fillRect(262, 98 + i * 8, i === 5 ? 140 : 230, 3);
  text(c, 'Jc(T) = J₀ (1 − T/Tc)^3/2   (1)', 377, 160, 12, '#111', 'center', false, MATH);
  c.strokeStyle = '#424242';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(286, 186);
  c.lineTo(286, 286);
  c.lineTo(470, 286);
  c.stroke();
  c.strokeStyle = '#1565c0';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 50; i++) {
    const k = i / 50;
    const y = 286 - 92 * Math.pow(Math.max(0, 1 - k), 1.5);
    (i ? c.lineTo : c.moveTo).call(c, 288 + k * 178, y);
  }
  c.stroke();
  c.fillStyle = '#e53935';
  const r = seeded(3);
  for (let i = 1; i < 10; i++) {
    const k = i / 10;
    c.beginPath();
    c.arc(288 + k * 178, 286 - 92 * Math.pow(1 - k, 1.5) + (r() - 0.5) * 8, 2.6, 0, Math.PI * 2);
    c.fill();
  }
  text(c, '그림 1. 온도에 따른 Jc', 377, 302, 9, '#555', 'center', false);
};

/** The spectrophotometer's result: an absorbance spectrum with its peaks marked. */
const paintSpectrum: Paint = (c) => {
  c.fillStyle = '#f5f7fa';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#00695c';
  c.fillRect(0, 0, 512, 28);
  text(c, 'UV-Vis 흡광 스펙트럼 · 시료 #A-17', 12, 15, 14, '#ffffff');
  text(c, '측정 완료', 500, 15, 12, '#b2dfdb', 'right');
  const x0 = 50;
  const y0 = 270;
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    c.beginPath();
    c.moveTo(x0, y0 - i * 44);
    c.lineTo(490, y0 - i * 44);
    c.stroke();
    text(c, (i * 0.4).toFixed(1), x0 - 8, y0 - i * 44, 10, '#546e7a', 'right', false);
  }
  for (let i = 0; i <= 5; i++) text(c, String(300 + i * 80), x0 + i * 88, y0 + 14, 10, '#546e7a', 'center', false);
  text(c, '파장 (nm)', 270, 306, 12, '#37474f', 'center');
  // The spectrum: a rainbow under the axis, then the curve.
  const grad = c.createLinearGradient(x0 + 88, 0, x0 + 440, 0);
  ['#7b1fa2', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#e53935'].forEach((k, i) => grad.addColorStop(i / 5, k));
  c.fillStyle = grad;
  c.fillRect(x0 + 88, y0 + 2, 352, 4);
  const f = (nm: number) => 0.25 + 1.55 * Math.exp(-(((nm - 420) / 26) ** 2)) + 0.9 * Math.exp(-(((nm - 545) / 34) ** 2)) + 0.35 * Math.exp(-(((nm - 330) / 18) ** 2));
  c.strokeStyle = '#d81b60';
  c.lineWidth = 2.5;
  c.beginPath();
  for (let nm = 300; nm <= 700; nm += 2) {
    const x = x0 + ((nm - 300) / 400) * 440;
    const y = y0 - (f(nm) / 2) * 220;
    (nm === 300 ? c.moveTo : c.lineTo).call(c, x, y);
  }
  c.stroke();
  for (const nm of [420, 545]) {
    const x = x0 + ((nm - 300) / 400) * 440;
    const y = y0 - (f(nm) / 2) * 220;
    c.fillStyle = '#d81b60';
    c.beginPath();
    c.arc(x, y, 4, 0, Math.PI * 2);
    c.fill();
    text(c, `λmax ${nm}`, x + 8, y - 10, 11, '#ad1457', 'left');
  }
};

/** The control console's main screen: the experiment's chamber drawn as a schematic, its readings beside. */
const paintChamber: Paint = (c) => {
  c.fillStyle = '#0b1622';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#12304a';
  c.fillRect(0, 0, 512, 26);
  text(c, '실험 장치 제어 · 플라즈마 챔버 B', 10, 14, 13, '#e3f2fd');
  text(c, '● 정상 운전', 502, 14, 12, '#69f0ae', 'right');
  // The chamber: a ring of magnets round a glowing torus, pipes in and out.
  c.strokeStyle = '#4fc3f7';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(170, 170, 120, 90, 0, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = '#e040fb';
  c.lineWidth = 10;
  c.beginPath();
  c.ellipse(170, 170, 80, 56, 0, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = '#ffab40';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.fillRect(170 + Math.cos(a) * 120 - 8, 170 + Math.sin(a) * 90 - 8, 16, 16);
  }
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(290, 170);
  c.lineTo(330, 170);
  c.moveTo(50, 170);
  c.lineTo(14, 170);
  c.stroke();
  const rows: Array<[string, string, string]> = [['온도', '312.4 K', '#e3f2fd'], ['진공도', '1.2×10⁻⁶ Torr', '#e3f2fd'], ['코일 전류', '48.2 A', '#e3f2fd'], ['자기장', '0.85 T', '#e3f2fd'], ['냉각수', '18.6 ℃', '#80d8ff']];
  rows.forEach(([k, v, col], i) => {
    const y = 56 + i * 44;
    c.fillStyle = '#132a3e';
    c.fillRect(344, y - 16, 160, 36);
    text(c, k, 352, y - 4, 11, '#90a4ae', 'left', false);
    text(c, v, 498, y + 9, 15, col, 'right');
  });
  c.fillStyle = '#1b5e20';
  c.fillRect(10, 290, 492, 22);
  text(c, '인터록 정상 · 방사선 준위 정상 · 다음 샷까지 04:12', 256, 301, 12, '#b9f6ca', 'center', false);
};
/** Three readings running against time. */
const paintTrends: Paint = (c) => {
  c.fillStyle = '#0b1622';
  c.fillRect(0, 0, 384, 256);
  text(c, '실시간 추이', 8, 12, 12, '#b0bec5');
  c.strokeStyle = '#1e3a52';
  c.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    c.beginPath();
    c.moveTo(0, 20 + i * 38);
    c.lineTo(384, 20 + i * 38);
    c.stroke();
  }
  const lines: Array<[string, (x: number) => number]> = [
    ['#ff8a65', (x) => 70 + 16 * Math.sin(x / 30) + 6 * Math.sin(x / 7)],
    ['#4fc3f7', (x) => 140 + 10 * Math.sin(x / 45 + 1) + 4 * Math.sin(x / 5)],
    ['#e040fb', (x) => 205 - 30 * Math.exp(-(((x - 260) / 26) ** 2)) + 3 * Math.sin(x / 4)],
  ];
  c.lineWidth = 2;
  for (const [col, f] of lines) {
    c.strokeStyle = col;
    c.beginPath();
    for (let x = 0; x <= 384; x += 3) (x ? c.lineTo : c.moveTo).call(c, x, f(x));
    c.stroke();
  }
  c.strokeStyle = '#ffd54f';
  c.setLineDash([4, 4]);
  c.beginPath();
  c.moveTo(0, 110);
  c.lineTo(384, 110);
  c.stroke();
  c.setLineDash([]);
  text(c, '경고 한계', 378, 102, 10, '#ffd54f', 'right', false);
};
/** The camera in the chamber: the plasma's violet ring in the dark. */
const paintCamera: Paint = (c) => {
  c.fillStyle = '#05030a';
  c.fillRect(0, 0, 320, 240);
  const g = c.createRadialGradient(160, 125, 20, 160, 125, 120);
  g.addColorStop(0, 'rgba(255,200,255,0.95)');
  g.addColorStop(0.35, 'rgba(206,90,255,0.75)');
  g.addColorStop(0.7, 'rgba(90,30,160,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(160, 125, 130, 70, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#05030a';
  c.beginPath();
  c.ellipse(160, 125, 50, 22, 0, 0, Math.PI * 2);
  c.fill();
  text(c, 'CAM 2 · 챔버 내부', 8, 14, 12, '#ff5252');
  text(c, 'REC ●', 312, 14, 12, '#ff5252', 'right');
};
/** The oscilloscope's trace on its grid. */
const paintScope: Paint = (c) => {
  c.fillStyle = '#04140a';
  c.fillRect(0, 0, 160, 112);
  c.strokeStyle = '#174d2a';
  c.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    c.beginPath();
    c.moveTo(i * 20, 0);
    c.lineTo(i * 20, 112);
    c.stroke();
  }
  for (let i = 1; i < 6; i++) {
    c.beginPath();
    c.moveTo(0, i * 18.7);
    c.lineTo(160, i * 18.7);
    c.stroke();
  }
  c.strokeStyle = '#69f0ae';
  c.lineWidth = 2;
  c.beginPath();
  for (let x = 0; x <= 160; x++) (x ? c.lineTo : c.moveTo).call(c, x, 56 - 30 * Math.sin(x / 9) * (x % 40 < 20 ? 1 : 0.4));
  c.stroke();
  c.strokeStyle = '#ffee58';
  c.beginPath();
  for (let x = 0; x <= 160; x++) (x ? c.lineTo : c.moveTo).call(c, x, x % 40 < 20 ? 92 : 102);
  c.stroke();
};
/** The printer's touch screen: the part, how far it's got. */
const paintPrinter: Paint = (c) => {
  c.fillStyle = '#101418';
  c.fillRect(0, 0, 192, 112);
  text(c, '출력 중', 10, 16, 15, '#ffffff');
  text(c, 'gear_v3.gcode', 10, 38, 11, '#90a4ae', 'left', false);
  c.fillStyle = '#263238';
  c.fillRect(10, 56, 172, 12);
  c.fillStyle = '#ff7043';
  c.fillRect(10, 56, 108, 12);
  text(c, '63%', 182, 82, 14, '#ff7043', 'right');
  text(c, '노즐 220℃ · 베드 60℃', 10, 100, 11, '#cfd8dc', 'left', false);
};

// ---------------------------------------------------------------------------------------------
// Small parts.

/** An Erlenmeyer flask, `s` its scale, a liquid in it. */
function erlenmeyer(g: THREE.Object3D, x: number, y: number, z: number, s: number, juice: string) {
  glass(g, cyl(0.02 * s, 0.065 * s, 0.13 * s, 16), x, y + 0.065 * s, z);
  liquid(g, cyl(0.042 * s, 0.062 * s, 0.055 * s, 16), juice, x, y + 0.03 * s, z);
  glass(g, cyl(0.02 * s, 0.02 * s, 0.05 * s, 10), x, y + 0.155 * s, z);
  part(g, ring(0.021 * s, 0.004 * s), '#e0f7fa', x, y + 0.18 * s, z, { rx: Math.PI / 2, outline: false });
}
/** A beaker with its pouring lip and graduations, filled `fill` of the way. */
function beaker(g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, juice: string, fill = 0.55) {
  glass(g, cyl(r, r * 0.95, h, 16), x, y + h / 2, z);
  liquid(g, cyl(r * 0.92, r * 0.88, h * fill, 16), juice, x, y + (h * fill) / 2 + 0.002, z);
  part(g, ring(r, 0.003), '#e0f7fa', x, y + h, z, { rx: Math.PI / 2, outline: false });
  for (let i = 1; i < 4; i++) part(g, box(0.012, 0.002, 0.002), '#ffffff', x, y + (h * i) / 4, z + r, { outline: false });
}
/** A round-bottomed flask (a reflux's, a distillation's). */
function roundFlask(g: THREE.Object3D, x: number, y: number, z: number, r: number, juice: string) {
  glass(g, ball(r), x, y, z);
  liquid(g, ball(r * 0.82), juice, x, y - r * 0.28, z).scale.set(1, 0.62, 1);
  glass(g, cyl(r * 0.28, r * 0.28, r * 1.2, 10), x, y + r * 1.3, z);
}
/** A reagent bottle: brown glass or white plastic, its cap, a label round it. */
function bottle(g: THREE.Object3D, x: number, y: number, z: number, body: string, cap: string, h = 0.15, r = 0.035) {
  part(g, cyl(r, r, h, 14), body, x, y + h / 2, z);
  part(g, cyl(r * 0.6, r, 0.03, 14), body, x, y + h + 0.015, z, { outline: false });
  part(g, cyl(r * 0.55, r * 0.55, 0.03, 12), cap, x, y + h + 0.045, z);
  part(g, cyl(r + 0.002, r + 0.002, h * 0.45, 14), '#fafafa', x, y + h * 0.5, z, { outline: false });
  part(g, cyl(r + 0.003, r + 0.003, h * 0.08, 14), cap, x, y + h * 0.62, z, { outline: false });
}
/** A test tube rack with tubes of colours in it. */
function tubeRack(g: THREE.Object3D, x: number, y: number, z: number, colors: string[]) {
  const n = colors.length;
  const w = n * 0.035 + 0.03;
  part(g, rbox(w, 0.015, 0.07, 0.004), '#eceff1', x, y + 0.01, z);
  part(g, rbox(w, 0.012, 0.07, 0.004), '#eceff1', x, y + 0.08, z);
  for (const sx of [-1, 1]) part(g, box(0.01, 0.08, 0.07), '#cfd8dc', x + sx * (w / 2 - 0.005), y + 0.045, z, { outline: false });
  colors.forEach((k, i) => {
    const tx = x - w / 2 + 0.03 + i * 0.035;
    glass(g, cyl(0.011, 0.011, 0.13, 10), tx, y + 0.075, z);
    liquid(g, cyl(0.009, 0.009, 0.05, 10), k, tx, y + 0.04, z);
  });
}
/** A caster: its fork and wheel. */
function caster(g: THREE.Object3D, x: number, z: number, r = 0.035) {
  part(g, box(0.03, 0.04, 0.04), '#90a4ae', x, r * 2 + 0.01, z, { outline: false });
  part(g, cyl(r, r, 0.025, 12), BLACK, x, r, z, { rz: Math.PI / 2 });
}
/** A lab bench's carcass: cupboards and a drawer row under a top `h` high, `d` deep, its front at `zf`. */
function cabinets(g: THREE.Object3D, W: number, h: number, d: number, zf: number, body: string, doors: string) {
  const z = zf - d / 2;
  part(g, box(W - 0.1, 0.1, d - 0.06), '#455a64', 0, 0.05, z - 0.03, { outline: false });
  part(g, rbox(W - 0.08, h - 0.14, d - 0.02, 0.01), body, 0, 0.1 + (h - 0.14) / 2, z);
  const n = Math.max(2, Math.round((W - 0.1) / 0.5));
  const cw = (W - 0.12) / n;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.06 + cw * (i + 0.5);
    part(g, rbox(cw - 0.03, 0.14, 0.014, 0.005), doors, x, h - 0.14, zf + 0.002);
    part(g, box(0.1, 0.012, 0.018), '#78909c', x, h - 0.12, zf + 0.014, { outline: false });
    part(g, rbox(cw - 0.03, h - 0.38, 0.014, 0.005), doors, x, 0.12 + (h - 0.38) / 2, zf + 0.002);
    part(g, box(0.012, 0.12, 0.018), '#78909c', x + (i % 2 ? -1 : 1) * (cw / 2 - 0.06), 0.12 + (h - 0.38) * 0.8, zf + 0.014, { outline: false });
  }
}
/** A swivel chair with a back, on five wheels; returns its seat. */
function swivelChair(g: THREE.Group, x: number, z: number, color: string, stool = false): THREE.Object3D {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = Math.PI;
  g.add(c);
  const seatY = stool ? 0.62 : 0.46;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.25, 0.04, Math.cos(a) * 0.25), 0.015, BLACK);
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.25, 0.024, Math.cos(a) * 0.25, { outline: false });
  }
  part(c, cyl(0.025, 0.025, seatY - 0.12, 10), CHROME, 0, (seatY - 0.04) / 2 + 0.04, 0, { outline: false });
  if (stool) part(c, ring(0.2, 0.012), CHROME, 0, 0.3, 0, { rx: Math.PI / 2, outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.04), color, 0, seatY - 0.03, 0);
  part(c, rbox(0.42, 0.42, 0.06, 0.04), color, 0, seatY + 0.28, -0.22, { rx: -0.1 });
  part(c, box(0.04, 0.2, 0.03), BLACK, 0, seatY + 0.06, -0.21, { outline: false });
  return marker(g, x, seatY + 0.02, z);
}
/** A keyboard and mouse on a top `y` high. */
function keyboard(g: THREE.Object3D, x: number, y: number, z: number, w = 0.38) {
  part(g, rbox(w, 0.018, 0.13, 0.006), '#37474f', x, y + 0.009, z);
  for (let r = 0; r < 4; r++) part(g, box(w - 0.04, 0.004, 0.018), '#607d8b', x, y + 0.02, z - 0.045 + r * 0.03, { outline: false });
  part(g, rbox(0.05, 0.024, 0.08, 0.012), '#37474f', x + w / 2 + 0.08, y + 0.012, z);
}
/** A monitor on its stand, facing +z; returns the group. */
function monitor(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  part(m, rbox(0.18, 0.014, 0.13, 0.006), BLACK, 0, 0.007, 0);
  part(m, rbox(0.04, 0.16, 0.025, 0.008), BLACK, 0, 0.09, -0.035);
  part(m, rbox(w + 0.03, h + 0.03, 0.03, 0.012), BLACK, 0, 0.17 + h / 2, -0.02);
  return m;
}
/** A spot stood at in front of the piece (facing back at it), the hands at `work`. */
function stand(g: THREE.Object3D, x: number, z: number, work: THREE.Object3D, motion?: Spot['motion'], yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  /**
   * The chemistry bench: a black resin top on grey cupboards, a cup sink with its gooseneck tap at
   * the left end, a reagent shelf on the riser behind (brown bottles, a wash bottle, the gas and power
   * taps); on the top a titration — the burette clamped over a flask on a stirring hot plate, its
   * stir bar spinning while it's worked — a rack of test tubes, a Bunsen burner lit in use under a
   * flask on a tripod, a lab notebook, and a microscope at the right end. Experiments are run with
   * the hands at the titration; samples are analysed bent to the microscope; the safety rules are
   * read standing at it.
   */
  chemistryBench(g, W, D, _c, _def, _ctx, out) {
    const h = 0.9;
    const d = 0.72;
    const zb = -D / 2 + 0.03;
    const zf = zb + d;
    const z = zb + d / 2;
    cabinets(g, W, h - 0.04, d - 0.02, zf - 0.03, LABGREY, '#cfd8dc');
    part(g, rbox(W - 0.04, 0.04, d, 0.01), RESIN, 0, h - 0.02, z);
    const top = h;
    // The riser and its shelf of reagents.
    part(g, rbox(W - 0.06, 0.5, 0.05, 0.01), '#cfd8dc', 0, top + 0.25, zb + 0.025);
    part(g, rbox(W - 0.1, 0.022, 0.17, 0.006), STEEL, 0, top + 0.36, zb + 0.11);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.1, 0.15), STEEL, sx * (W / 2 - 0.08), top + 0.31, zb + 0.1, { outline: false });
    const shelf: Array<[string, string, string]> = [
      ['#6d3b1f', BLACK, 'HCl'], ['#6d3b1f', '#c62828', 'H₂SO₄'], ['#fafafa', '#1e88e5', 'NaOH'], ['#fafafa', '#43a047', 'EtOH'], ['#6d3b1f', BLACK, 'AgNO₃'], ['#fafafa', '#fdd835', 'NaCl'], ['#6d3b1f', '#1e88e5', 'KMnO₄'],
    ];
    shelf.forEach(([body, cap], i) => bottle(g, -0.72 + i * 0.24, top + 0.371, zb + 0.11, body, cap, 0.13 + (i % 3) * 0.02, 0.034));
    label(g, '시약 · 사용 후 제자리', 0.6, 0.06, 0, top + 0.08, zb + 0.052, '#37474f', '#ffffff');
    // The gas and power taps along the riser's face.
    for (const x of [-0.3, 0.3]) {
      part(g, rbox(0.1, 0.06, 0.02, 0.006), '#eceff1', x, top + 0.18, zb + 0.06);
      for (const dx of [-0.022, 0.022]) part(g, box(0.008, 0.016, 0.006), BLACK, x + dx, top + 0.18, zb + 0.071, { outline: false });
    }
    part(g, cyl(0.016, 0.016, 0.07, 10), '#fdd835', 0.05, top + 0.18, zb + 0.09, { rx: Math.PI / 2 });
    part(g, box(0.05, 0.012, 0.012), '#e53935', 0.05, top + 0.2, zb + 0.13, { outline: false });
    // The cup sink at the left end and its gooseneck tap.
    const sx = -W / 2 + 0.22;
    part(g, rbox(0.26, 0.012, 0.3, 0.02), '#263238', sx, top + 0.001, z + 0.06, { outline: false });
    part(g, rbox(0.22, 0.01, 0.26, 0.02), '#11161a', sx, top + 0.004, z + 0.06, { outline: false });
    part(g, cyl(0.018, 0.018, 0.04, 10), CHROME, sx, top + 0.02, zb + 0.13);
    part(g, ring(0.07, 0.012, Math.PI), CHROME, sx, top + 0.3, zb + 0.2, { ry: Math.PI / 2, outline: false });
    part(g, cyl(0.012, 0.012, 0.26, 10), CHROME, sx, top + 0.15, zb + 0.13, { outline: false });
    part(g, cyl(0.012, 0.01, 0.08, 10), CHROME, sx, top + 0.26, zb + 0.27, { outline: false });
    for (const dx of [-0.06, 0.06]) part(g, box(0.06, 0.015, 0.02), '#1e88e5', sx + dx, top + 0.06, zb + 0.13, { outline: false });
    // A wash bottle by the sink.
    part(g, cyl(0.03, 0.035, 0.14, 12), '#fafafa', sx + 0.17, top + 0.07, z + 0.15);
    rod(g, new THREE.Vector3(sx + 0.17, top + 0.15, z + 0.15), new THREE.Vector3(sx + 0.13, top + 0.2, z + 0.2), 0.005, '#fafafa');
    part(g, cyl(0.031, 0.031, 0.03, 12), '#1e88e5', sx + 0.17, top + 0.15, z + 0.15, { outline: false });
    // The titration: a stand with its clamp, the burette over a flask on the stirring hot plate.
    const tx = -0.32;
    const tz = z + 0.1;
    part(g, rbox(0.2, 0.012, 0.14, 0.006), '#eceff1', tx + 0.02, top + 0.006, tz - 0.12);
    part(g, cyl(0.007, 0.007, 0.7, 8), CHROME, tx + 0.02, top + 0.35, tz - 0.16, { outline: false });
    rod(g, new THREE.Vector3(tx + 0.02, top + 0.5, tz - 0.16), new THREE.Vector3(tx, top + 0.5, tz), 0.006, CHROME);
    part(g, box(0.04, 0.02, 0.03), '#e53935', tx, top + 0.5, tz, { outline: false });
    glass(g, cyl(0.009, 0.009, 0.48, 8), tx, top + 0.5, tz);
    liquid(g, cyl(0.007, 0.007, 0.26, 8), '#7e57c2', tx, top + 0.6, tz);
    part(g, box(0.03, 0.014, 0.014), '#1e88e5', tx, top + 0.27, tz, { outline: false });
    glass(g, cyl(0.003, 0.002, 0.04, 6), tx, top + 0.24, tz);
    part(g, rbox(0.17, 0.06, 0.17, 0.01), '#eceff1', tx, top + 0.03, tz);
    part(g, cyl(0.065, 0.065, 0.006, 20), '#bdbdbd', tx, top + 0.063, tz, { outline: false });
    for (const [dx, k] of [[-0.04, '#455a64'], [0.04, '#455a64']] as const) part(g, cyl(0.014, 0.014, 0.012, 10), k, tx + dx, top + 0.03, tz + 0.085, { rx: Math.PI / 2, outline: false });
    glowing(g, ball(0.006), '#ff5252', tx, top + 0.05, tz + 0.087);
    erlenmeyer(g, tx, top + 0.066, tz, 1.05, '#f48fb1');
    const stir = new THREE.Group();
    stir.position.set(tx, top + 0.074, tz);
    g.add(stir);
    part(stir, cyl(0.006, 0.006, 0.04, 8), '#fafafa', 0, 0, 0, { rz: Math.PI / 2, outline: false });
    // A rack of tubes and a beaker beside.
    tubeRack(g, 0.0, top, z - 0.15, ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#ab47bc']);
    beaker(g, -0.1, top, z + 0.12, 0.045, 0.11, '#4dd0e1', 0.5);
    // The Bunsen burner under a flask on a tripod and gauze; its flame lit in use.
    const bx = 0.24;
    const bz = z - 0.02;
    part(g, cyl(0.04, 0.045, 0.015, 14), '#455a64', bx, top + 0.008, bz);
    part(g, cyl(0.011, 0.011, 0.12, 10), CHROME, bx, top + 0.075, bz, { outline: false });
    rod(g, new THREE.Vector3(bx, top + 0.02, bz), new THREE.Vector3(bx - 0.08, top + 0.01, bz - 0.2), 0.008, '#ff8a65');
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      rod(g, new THREE.Vector3(bx + Math.sin(a) * 0.09, top, bz + Math.cos(a) * 0.09), new THREE.Vector3(bx + Math.sin(a) * 0.06, top + 0.2, bz + Math.cos(a) * 0.06), 0.005, '#616161');
    }
    part(g, box(0.15, 0.004, 0.15), '#9e9e9e', bx, top + 0.2, bz, { outline: false });
    part(g, cyl(0.03, 0.03, 0.005, 12), '#eceff1', bx, top + 0.203, bz, { outline: false });
    roundFlask(g, bx, top + 0.26, bz, 0.055, '#aed581');
    const flame = new THREE.Group();
    g.add(flame);
    part(flame, cone(0.018, 0.07), '#4fc3f7', bx, top + 0.17, bz, { outline: false, shadow: false, material: glow('#4fc3f7') });
    part(flame, cone(0.009, 0.035), '#e1f5fe', bx, top + 0.155, bz, { outline: false, shadow: false, material: glow('#e1f5fe') });
    out.inUse = flame;
    const steam = wisps(g, 3, '#ffffff', 0.016, bx, top + 0.34, bz, 0.25, 2.2);
    // The lab notebook open at the front, a pen on it; goggles left by it.
    const nx = 0.48;
    part(g, box(0.3, 0.012, 0.22), '#1a237e', nx, top + 0.006, zf - 0.17, { ry: -0.08 });
    part(g, box(0.28, 0.006, 0.2), '#fffde7', nx, top + 0.014, zf - 0.17, { ry: -0.08, outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.1, 0.002, 0.004), '#78909c', nx + (i < 3 ? -0.07 : 0.07), top + 0.018, zf - 0.23 + (i % 3) * 0.05, { ry: -0.08, outline: false });
    part(g, cyl(0.005, 0.005, 0.13, 6), '#263238', nx + 0.05, top + 0.022, zf - 0.15, { rz: Math.PI / 2, ry: 0.6, outline: false });
    part(g, rbox(0.15, 0.04, 0.05, 0.02), '#80deea', 0.12, top + 0.02, zf - 0.08, { ry: 0.3 });
    part(g, box(0.13, 0.006, 0.04), '#37474f', 0.12, top + 0.04, zf - 0.11, { ry: 0.3, outline: false });
    // The microscope at the right end: base, arm, the stage with a slide, objectives, eyepieces tipped back.
    const mx = W / 2 - 0.24;
    const mz = z - 0.02;
    part(g, rbox(0.2, 0.04, 0.24, 0.02), '#eceff1', mx, top + 0.02, mz);
    part(g, rbox(0.06, 0.3, 0.07, 0.02), '#eceff1', mx, top + 0.18, mz - 0.08, { rx: 0.12 });
    part(g, rbox(0.14, 0.015, 0.12, 0.004), BLACK, mx, top + 0.13, mz + 0.01);
    part(g, box(0.07, 0.003, 0.025), '#f8bbd0', mx, top + 0.14, mz + 0.01, { outline: false });
    glowing(g, cyl(0.018, 0.018, 0.004, 12), '#fff9c4', mx, top + 0.122, mz + 0.01);
    for (const ssx of [-1, 1]) part(g, cyl(0.028, 0.028, 0.02, 14), BLACK, mx + ssx * 0.05, top + 0.15, mz - 0.07, { rz: Math.PI / 2 });
    part(g, rbox(0.1, 0.08, 0.12, 0.02), '#eceff1', mx, top + 0.31, mz - 0.02);
    for (const dx of [-0.02, 0.02, 0]) part(g, cyl(0.009, 0.007, 0.06, 8), '#9e9e9e', mx + dx, top + 0.24, mz + 0.01 - (dx === 0 ? 0.03 : 0), { outline: false });
    for (const dx of [-0.025, 0.025]) part(g, cyl(0.014, 0.014, 0.1, 10), BLACK, mx + dx, top + 0.38, mz + 0.03, { rx: 0.55 });
    const eyepiece = marker(g, mx, top + 0.42, mz + 0.07);
    // A slide box beside it.
    part(g, rbox(0.1, 0.03, 0.14, 0.008), '#1565c0', mx - 0.17, top + 0.015, mz + 0.08);
    // Stood at the titration; bent to the microscope; the rules read standing mid-bench.
    const sz = zf + 0.28;
    const titrate = marker(g, tx, top + 0.13, tz + 0.04);
    out.work = titrate;
    out.animate = (t) => {
      stir.rotation.y = t * 14;
      steam(t);
    };
    out.spots = {
      '*': stand(g, tx + 0.04, sz, titrate, 'tinker'),
      analyzeSamples: stand(g, mx, zf + 0.2, eyepiece, 'peer'),
      scientist_labSafety: stand(g, 0.3, sz + 0.06, marker(g, 0.3, top + 0.3, zf), 'read'),
    };
  },

  /**
   * The chalkboard of equations: a dark green board in an oak frame worked through — the
   * Schrödinger equation solved in a box, Maxwell, a Gaussian, the modes sketched, a result boxed
   * and a note circled — chalk and a felt eraser on its tray. On a wall it hangs there; standing
   * free it's on a rolling frame, the periodic table on its back. While a formula is worked a fresh
   * line of chalk runs out across the clear corner. Written at standing, the chalk hand up on it.
   */
  formulaBoard(g, W, D, _c, _def, ctx, out) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.03 : 0.2);
    const y = 1.42;
    const H = 0.98;
    const Wb = Math.min(W - 0.16, 1.84);
    const oak = '#9c6b3f';
    if (!wall) {
      for (const sx of [-1, 1]) {
        const x = sx * (Wb / 2 + 0.04);
        part(g, rbox(0.05, y + H / 2 + 0.1, 0.05, 0.01), STEEL, x, (y + H / 2 + 0.1) / 2, zb);
        part(g, rbox(0.07, 0.04, 0.6, 0.01), STEEL, x, 0.08, zb);
        for (const dz of [-0.26, 0.26]) caster(g, x, zb + dz);
      }
      // The periodic table on the back.
      part(g, box(Wb, H, 0.01), '#fafafa', 0, y, zb - 0.03, { outline: false });
      picture(g, painted('periodic', 1024, 576, paintPeriodic), Wb - 0.04, H - 0.06, 0, y, zb - 0.037, '#ffffff', Math.PI);
    }
    part(g, rbox(Wb + 0.08, H + 0.08, 0.05, 0.01), oak, 0, y, zb);
    part(g, box(Wb, H, 0.006), '#2e4a3a', 0, y, zb + 0.026, { outline: false });
    picture(g, painted('chalk', 1024, 512, paintChalk), Wb, H, 0, y, zb + 0.03, '#e8efe8');
    // The tray along the bottom: chalk sticks and the eraser.
    const ty = y - H / 2 - 0.03;
    part(g, rbox(Wb, 0.02, 0.08, 0.006), oak, 0, ty, zb + 0.05);
    part(g, box(Wb, 0.03, 0.01), oak, 0, ty + 0.015, zb + 0.09, { outline: false });
    for (const [x, k] of [[-0.5, '#ffffff'], [-0.44, '#fff59d'], [-0.4, '#ffffff'], [0.1, '#ef9a9a']] as const) part(g, cyl(0.006, 0.006, 0.07, 6), k, x, ty + 0.017, zb + 0.05, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.14, 0.04, 0.05, 0.008), '#5d4037', 0.5, ty + 0.03, zb + 0.05);
    part(g, box(0.13, 0.012, 0.045), '#cfd8dc', 0.5, ty + 0.012, zb + 0.05, { outline: false });
    // The fresh line written while it's used: a stroke of chalk growing across the clear corner.
    const pen = new THREE.Group();
    pen.position.set(0.12, y - 0.18, zb + 0.034);
    g.add(pen);
    out.inUse = pen;
    const lines: THREE.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Group();
      l.position.set(0, -i * 0.07, 0);
      pen.add(l);
      const len = [0.5, 0.36, 0.42][i];
      glowing(l, box(len, 0.012, 0.002), '#f5f5f5', len / 2, 0, 0);
      l.userData.len = len;
      lines.push(l);
    }
    out.animate = (t) => {
      const k = (t / 9) % 1;
      lines.forEach((l, i) => l.scale.set(THREE.MathUtils.clamp(k * 3 - i, 0.001, 1), 1, 1));
    };
    // Written at: stood before the clear corner, the chalk where the line has got to.
    const chalk = marker(g, 0.35, y - 0.2, zb + 0.05);
    out.work = chalk;
    out.spots = { '*': stand(g, 0.3, zb + 0.5, chalk, 'board') };
  },

  /**
   * An ultra-low freezer: a tall white cabinet on casters, the black panel at the top glowing its
   * red −80℃, a biohazard sticker and the 시료 label on the door, its big lever handle; the door
   * swings open while it's used on the inner doors and racks of frosted sample boxes in colours. Stood
   * at it, reaching into the racks.
   */
  specimenFreezer(g, W, D, _c, _def, _ctx, out) {
    const Wf = Math.min(W - 0.12, 0.84);
    const d = 0.78;
    const zb = -D / 2 + 0.04;
    const zf = zb + d;
    const z = zb + d / 2;
    const H = 1.95;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) caster(g, sx * (Wf / 2 - 0.08), z + sz * (d / 2 - 0.1));
    part(g, rbox(Wf, 0.1, d - 0.04, 0.01), '#90a4ae', 0, 0.12, z);
    for (let i = 0; i < 6; i++) part(g, box(Wf - 0.2, 0.012, 0.01), '#546e7a', 0, 0.09 + i * 0.012, zf - 0.015, { outline: false });
    // The cabinet: its walls and back, the inside lined white and frosted.
    part(g, rbox(Wf, H - 0.17, 0.05, 0.01), ENAMEL, 0, 0.17 + (H - 0.17) / 2, zb + 0.025);
    for (const sx of [-1, 1]) part(g, rbox(0.06, H - 0.17, d - 0.04, 0.01), ENAMEL, sx * (Wf / 2 - 0.03), 0.17 + (H - 0.17) / 2, z);
    part(g, rbox(Wf, 0.06, d - 0.04, 0.01), ENAMEL, 0, 0.2, z);
    part(g, rbox(Wf, 0.26, d - 0.04, 0.02), ENAMEL, 0, H - 0.13, z);
    part(g, box(Wf - 0.14, 1.36, 0.01), '#e3f2fd', 0, 0.94, zb + 0.06, { outline: false });
    // The panel: −80 in red, the alarm and lock.
    part(g, rbox(0.42, 0.13, 0.012, 0.01), '#212121', 0, H - 0.12, zf - 0.03);
    const panel = painted('ult', 192, 64, (c) => {
      c.fillStyle = '#111';
      c.fillRect(0, 0, 192, 64);
      text(c, '−80℃', 8, 33, 34, '#ff3d00', 'left', true, 'Consolas, monospace');
      text(c, 'SET −80', 184, 20, 12, '#ffab91', 'right', false);
      text(c, '● 정상', 184, 46, 13, '#69f0ae', 'right');
    });
    picture(g, panel, 0.38, 0.11, 0, H - 0.12, zf - 0.023);
    // Inside: three shelves behind their inner doors, frosted boxes of samples in colours.
    const rnd = seeded(13);
    const boxCols = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#26c6da', '#ffffff'];
    for (let s = 0; s < 4; s++) {
      const ly = 0.26 + s * 0.36;
      part(g, box(Wf - 0.14, 0.02, d - 0.14), '#cfd8dc', 0, ly, z + 0.01, { outline: false });
      for (let i = 0; i < 4; i++) {
        const k = boxCols[Math.floor(rnd() * boxCols.length)];
        const bxx = -Wf / 2 + 0.14 + i * 0.15;
        for (let j = 0; j < 2; j++) {
          part(g, rbox(0.13, 0.06, 0.13, 0.008), k, bxx, ly + 0.04 + j * 0.065, z + 0.02);
          part(g, box(0.132, 0.008, 0.132), '#ffffff', bxx, ly + 0.072 + j * 0.065, z + 0.02, { outline: false });
        }
      }
    }
    // The door, hung on the left, opening while it's used.
    const hinge = new THREE.Group();
    hinge.position.set(-Wf / 2 + 0.01, 0, zf - 0.01);
    hinge.userData.swing = -1;
    g.add(hinge);
    const dw = Wf - 0.02;
    part(hinge, rbox(dw, H - 0.42, 0.07, 0.02), ENAMEL, dw / 2, 0.22 + (H - 0.42) / 2, 0);
    part(hinge, rbox(dw - 0.08, H - 0.5, 0.02, 0.02), '#e8eaed', dw / 2, 0.22 + (H - 0.42) / 2, -0.04, { outline: false });
    // Its lever handle and lock on the right edge.
    part(hinge, rbox(0.06, 0.34, 0.05, 0.02), '#90a4ae', dw - 0.07, 1.12, 0.05);
    part(hinge, rbox(0.04, 0.22, 0.03, 0.015), '#607d8b', dw - 0.07, 1.12, 0.085);
    part(hinge, cyl(0.014, 0.014, 0.02, 10), '#ffd54f', dw - 0.07, 1.33, 0.06, { rx: Math.PI / 2, outline: false });
    // The stickers: biohazard and the samples' label.
    const bio = painted('biohazard', 96, 96, (c) => {
      c.fillStyle = '#fdd835';
      c.beginPath();
      c.moveTo(48, 4);
      c.lineTo(92, 88);
      c.lineTo(4, 88);
      c.closePath();
      c.fill();
      c.strokeStyle = '#111';
      c.lineWidth = 5;
      c.stroke();
      c.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        c.beginPath();
        c.arc(48 + Math.cos(a) * 11, 60 + Math.sin(a) * 11, 10, 0, Math.PI * 2);
        c.stroke();
      }
      c.beginPath();
      c.arc(48, 60, 5, 0, Math.PI * 2);
      c.stroke();
    });
    picture(hinge, bio, 0.14, 0.14, dw / 2, 1.5, 0.037);
    label(hinge, '생물 시료 보관 · −80℃', 0.4, 0.06, dw / 2, 1.34, 0.037, '#1565c0', '#ffffff');
    label(hinge, '문을 오래 열어 두지 마세요', 0.4, 0.045, dw / 2, 0.5, 0.037, '#eceff1', '#c62828');
    out.doors = [hinge];
    // Frost puffs out of the open door.
    const frost = new THREE.Group();
    g.add(frost);
    out.inUse = frost;
    const cold = wisps(frost, 4, '#e1f5fe', 0.05, 0.1, 0.9, zf + 0.06, -0.5, 3);
    out.animate = cold;
    // Stood back a little to the right of the door, a hand in the racks.
    const racks = marker(g, 0.05, 1.05, z + 0.2);
    out.work = racks;
    out.spots = { '*': stand(g, 0.12, zf + 0.3, racks, 'rummage') };
  },

  /**
   * The inventor's workbench: a thick maple top on a steel frame, a pegboard on the wall behind with
   * its tools hung on their outlines and a strip light, bins of parts on a shelf; on the top a
   * robot arm half built — base, turret, two links and a gripper, a ribbon cable to its driver board
   * — that works through its moves while it's being built, a soldering station whose iron smokes, an
   * oscilloscope tracing (lit in use), a breadboard of blinking LEDs under a ring magnifier, a vice
   * on the corner, screws and a blueprint. The prototype is built standing at the arm; parts are
   * fixed under the magnifier.
   */
  inventionBench(g, W, D, _c, _def, ctx, out) {
    const h = 0.92;
    const d = 0.74;
    const zb = -D / 2 + 0.03;
    const zf = zb + d;
    const z = zb + d / 2;
    const maple = '#d7b483';
    // The frame, the lower shelf of parts bins.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) part(g, rbox(0.05, h - 0.06, 0.05, 0.008), '#455a64', sx * (W / 2 - 0.08), (h - 0.06) / 2, z + sz * (d / 2 - 0.06));
    part(g, rbox(W - 0.12, 0.03, d - 0.1, 0.008), '#607d8b', 0, 0.2, z);
    const binCols = ['#e53935', '#1e88e5', '#fdd835', '#43a047'];
    for (let i = 0; i < 6; i++) {
      const bx = -W / 2 + 0.25 + i * ((W - 0.5) / 5);
      part(g, rbox(0.22, 0.14, 0.3, 0.02), binCols[i % 4], bx, 0.29, z + 0.05);
      part(g, box(0.2, 0.02, 0.26), '#424242', bx, 0.35, z + 0.05, { outline: false });
    }
    part(g, rbox(W - 0.04, 0.06, d, 0.01), maple, 0, h - 0.03, z);
    part(g, box(W - 0.06, 0.012, 0.012), shade(maple, 0.7), 0, h - 0.045, zf + 0.001, { outline: false });
    const top = h;
    // The pegboard behind (on the wall, or on two posts), its tools and the light strip.
    const pz = zb + 0.02;
    if (!ctx.againstWall) for (const sx of [-1, 1]) part(g, rbox(0.04, 0.8, 0.04, 0.008), '#455a64', sx * (W / 2 - 0.08), top + 0.4, pz);
    part(g, rbox(W - 0.1, 0.7, 0.02, 0.008), '#c8a97e', 0, top + 0.45, pz);
    for (let i = 0; i < 18; i++)
      for (let j = 0; j < 6; j++) part(g, box(0.008, 0.008, 0.004), '#6d5236', -W / 2 + 0.14 + i * 0.1, top + 0.18 + j * 0.1, pz + 0.012, { outline: false });
    const tool = (x: number, y: number, k: string, len: number, head: 'hammer' | 'wrench' | 'driver' | 'pliers') => {
      part(g, box(0.03, len + 0.03, 0.002), '#5d4037', x, y, pz + 0.012, { outline: false });
      part(g, rbox(0.022, len, 0.02, 0.006), k, x, y, pz + 0.025);
      if (head === 'hammer') part(g, rbox(0.1, 0.035, 0.03, 0.006), '#78909c', x, y + len / 2, pz + 0.026);
      if (head === 'wrench') part(g, ring(0.025, 0.008, Math.PI * 1.5), '#b0bec5', x, y + len / 2 + 0.015, pz + 0.025, { rz: Math.PI * 0.75, outline: false });
      if (head === 'driver') part(g, cyl(0.005, 0.005, 0.08, 6), '#cfd8dc', x, y - len / 2 - 0.04, pz + 0.025, { outline: false });
      if (head === 'pliers') part(g, box(0.04, 0.05, 0.02), '#90a4ae', x, y + len / 2 + 0.02, pz + 0.025);
    };
    tool(-0.75, top + 0.5, '#8d6e63', 0.25, 'hammer');
    for (let i = 0; i < 4; i++) tool(-0.55 + i * 0.07, top + 0.5 - i * 0.02, '#b0bec5', 0.16 + i * 0.03, 'wrench');
    const drivers = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#e53935'];
    drivers.forEach((k, i) => tool(-0.12 + i * 0.06, top + 0.6, k, 0.1, 'driver'));
    tool(0.28, top + 0.52, '#e53935', 0.14, 'pliers');
    tool(0.36, top + 0.52, '#1e88e5', 0.12, 'pliers');
    part(g, ring(0.08, 0.015), '#ff7043', 0.62, top + 0.55, pz + 0.04, { outline: false });
    part(g, ring(0.06, 0.012), '#ff7043', 0.62, top + 0.55, pz + 0.05, { outline: false });
    part(g, rbox(W - 0.14, 0.04, 0.08, 0.01), '#37474f', 0, top + 0.8, pz + 0.05);
    glowing(g, box(W - 0.2, 0.01, 0.04), '#fffde7', 0, top + 0.777, pz + 0.05);
    label(g, '발명 작업대 · 보안경 착용', 0.62, 0.065, 0, top + 0.9, pz + 0.015, '#ff7043', '#ffffff');
    // A blueprint taped flat on the top, the robot arm on it.
    const plan = painted('blueprint', 256, 160, (c) => {
      c.fillStyle = '#0d47a1';
      c.fillRect(0, 0, 256, 160);
      c.strokeStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 256; i += 16) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, 160);
        c.moveTo(0, i);
        c.lineTo(256, i);
        c.stroke();
      }
      c.strokeStyle = '#e3f2fd';
      c.lineWidth = 2;
      c.strokeRect(30, 110, 60, 24);
      c.beginPath();
      c.moveTo(60, 110);
      c.lineTo(110, 50);
      c.lineTo(180, 64);
      c.lineTo(200, 90);
      c.stroke();
      for (const [x, y] of [[60, 110], [110, 50], [180, 64]]) {
        c.beginPath();
        c.arc(x, y, 7, 0, Math.PI * 2);
        c.stroke();
      }
      text(c, '로봇 팔 v3 · 3축', 128, 148, 14, '#e3f2fd', 'center');
      text(c, '토크 1.2 N·m', 250, 16, 11, '#bbdefb', 'right', false);
    });
    const ax = -0.42;
    const az = z + 0.02;
    flat(g, plan, 0.46, 0.29, ax, top + 0.002, az + 0.04, 0.05);
    // The arm: base, a turret turning, the shoulder and elbow links, the gripper.
    part(g, cyl(0.09, 0.1, 0.05, 20), '#37474f', ax, top + 0.025, az);
    const turret = new THREE.Group();
    turret.position.set(ax, top + 0.05, az);
    g.add(turret);
    part(turret, cyl(0.06, 0.07, 0.07, 16), '#ff7043', 0, 0.035, 0);
    for (const sx of [-1, 1]) part(turret, rbox(0.02, 0.1, 0.07, 0.006), '#ff7043', sx * 0.045, 0.1, 0);
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 0.12, 0);
    turret.add(shoulder);
    part(shoulder, cyl(0.03, 0.03, 0.11, 14), '#263238', 0, 0, 0, { rz: Math.PI / 2 });
    part(shoulder, rbox(0.06, 0.26, 0.05, 0.015), '#eceff1', 0, 0.13, 0);
    part(shoulder, box(0.004, 0.18, 0.03), '#90a4ae', 0.032, 0.13, 0, { outline: false });
    const elbow = new THREE.Group();
    elbow.position.set(0, 0.26, 0);
    shoulder.add(elbow);
    part(elbow, cyl(0.026, 0.026, 0.09, 14), '#263238', 0, 0, 0, { rz: Math.PI / 2 });
    part(elbow, rbox(0.05, 0.05, 0.22, 0.015), '#eceff1', 0, 0, 0.11);
    const wrist = new THREE.Group();
    wrist.position.set(0, 0, 0.22);
    elbow.add(wrist);
    part(wrist, cyl(0.02, 0.02, 0.05, 12), '#ff7043', 0, 0, 0.02, { rx: Math.PI / 2 });
    const fingers: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) fingers.push(part(wrist, box(0.01, 0.03, 0.06), '#455a64', sx * 0.02, 0, 0.07));
    // Its cable over to the driver board, LEDs on it.
    part(g, rbox(0.12, 0.015, 0.09, 0.004), '#1b5e20', ax + 0.24, top + 0.008, az - 0.15);
    for (let i = 0; i < 3; i++) part(g, box(0.02, 0.012, 0.02), BLACK, ax + 0.2 + i * 0.03, top + 0.02, az - 0.15, { outline: false });
    rod(g, new THREE.Vector3(ax + 0.18, top + 0.02, az - 0.15), new THREE.Vector3(ax + 0.05, top + 0.12, az - 0.04), 0.008, '#90a4ae');
    // The soldering station and its iron in the holder; smoke while it's used.
    const sx0 = 0.02;
    const sz0 = z - 0.15;
    part(g, rbox(0.16, 0.09, 0.12, 0.01), '#263238', sx0, top + 0.045, sz0);
    const sold = painted('solder', 96, 48, (c) => {
      c.fillStyle = '#111';
      c.fillRect(0, 0, 96, 48);
      text(c, '350℃', 48, 25, 26, '#ff6e40', 'center', true, 'Consolas, monospace');
    });
    picture(g, sold, 0.1, 0.05, sx0, top + 0.06, sz0 + 0.061);
    part(g, ring(0.03, 0.006), '#b0bec5', sx0 + 0.15, top + 0.1, sz0, { ry: Math.PI / 2, outline: false });
    part(g, cyl(0.04, 0.045, 0.02, 14), '#455a64', sx0 + 0.15, top + 0.01, sz0);
    part(g, ball(0.03), '#ffcc80', sx0 + 0.15, top + 0.03, sz0, { outline: false }).scale.set(1, 0.4, 1);
    const iron = new THREE.Group();
    iron.position.set(sx0 + 0.15, top + 0.1, sz0);
    iron.rotation.x = -0.9;
    g.add(iron);
    part(iron, cyl(0.014, 0.014, 0.12, 10), '#1e88e5', 0, 0.02, 0);
    part(iron, cyl(0.006, 0.002, 0.07, 8), CHROME, 0, -0.07, 0, { outline: false });
    rod(g, new THREE.Vector3(sx0 + 0.15, top + 0.16, sz0 - 0.05), new THREE.Vector3(sx0 + 0.04, top + 0.04, sz0 - 0.05), 0.006, BLACK);
    part(g, cyl(0.03, 0.03, 0.02, 12), '#9e9e9e', sx0 + 0.24, top + 0.01, sz0 + 0.1, { rx: Math.PI / 2 });
    const smoke = wisps(g, 3, '#eceff1', 0.014, sx0 + 0.19, top + 0.1, sz0 + 0.08, 0.3, 1.8);
    // The breadboard of LEDs under the ring magnifier.
    const bbx = 0.32;
    const bbz = z + 0.12;
    part(g, rbox(0.2, 0.015, 0.12, 0.004), '#fafafa', bbx, top + 0.008, bbz);
    for (let i = 0; i < 2; i++) part(g, box(0.05, 0.012, 0.025), BLACK, bbx - 0.04 + i * 0.07, top + 0.022, bbz, { outline: false });
    const leds: THREE.Mesh[] = [];
    ['#ff1744', '#ffea00', '#00e676', '#2979ff'].forEach((k, i) => {
      part(g, ball(0.007), shade(k, 0.5), bbx - 0.08 + i * 0.05, top + 0.022, bbz + 0.045, { outline: false });
      leds.push(glowing(g, ball(0.008), k, bbx - 0.08 + i * 0.05, top + 0.022, bbz + 0.045));
    });
    // The magnifier on its arm, its ring lit while it's used.
    part(g, cyl(0.03, 0.04, 0.03, 12), '#eceff1', bbx + 0.18, top + 0.015, zb + 0.12);
    rod(g, new THREE.Vector3(bbx + 0.18, top + 0.03, zb + 0.12), new THREE.Vector3(bbx + 0.12, top + 0.38, bbz - 0.1), 0.01, '#eceff1');
    rod(g, new THREE.Vector3(bbx + 0.12, top + 0.38, bbz - 0.1), new THREE.Vector3(bbx, top + 0.25, bbz - 0.02), 0.01, '#eceff1');
    part(g, ring(0.07, 0.014), '#eceff1', bbx, top + 0.24, bbz - 0.02, { rx: Math.PI / 2 - 0.4 });
    glass(g, cyl(0.065, 0.065, 0.006, 20), bbx, top + 0.24, bbz - 0.02, GLASS, -0.4);
    const ringLight = new THREE.Group();
    g.add(ringLight);
    part(ringLight, ring(0.07, 0.006), '#fffde7', bbx, top + 0.232, bbz - 0.02, { outline: false, shadow: false, material: glow('#fffde7'), rx: Math.PI / 2 - 0.4 });
    out.inUse = ringLight;
    // The oscilloscope at the back right, its trace lit in use; a probe lead over to the breadboard.
    const ox = 0.7;
    const oz = zb + 0.18;
    part(g, rbox(0.3, 0.18, 0.22, 0.015), '#cfd8dc', ox, top + 0.09, oz);
    part(g, box(0.16, 0.112, 0.01), BLACK, ox - 0.05, top + 0.1, oz + 0.111, { outline: false });
    out.screen = litScreen(g, painted('scope', 160, 112, paintScope), 0.15, 0.1, ox - 0.05, top + 0.1, oz + 0.113);
    for (let i = 0; i < 6; i++) part(g, cyl(0.011, 0.011, 0.012, 10), '#455a64', ox + 0.08 + (i % 2) * 0.04, top + 0.15 - Math.floor(i / 2) * 0.045, oz + 0.115, { rx: Math.PI / 2, outline: false });
    rod(g, new THREE.Vector3(ox + 0.06, top + 0.03, oz + 0.12), new THREE.Vector3(bbx + 0.08, top + 0.02, bbz), 0.004, '#fdd835');
    // The vice on the front right corner.
    const vx = W / 2 - 0.16;
    const vz = zf - 0.12;
    part(g, rbox(0.12, 0.05, 0.16, 0.01), '#1565c0', vx, top + 0.025, vz);
    for (const dz of [-0.04, 0.04]) part(g, rbox(0.14, 0.07, 0.03, 0.008), '#1565c0', vx, top + 0.08, vz + dz);
    part(g, cyl(0.008, 0.008, 0.2, 8), CHROME, vx, top + 0.07, vz + 0.12, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.006, 0.006, 0.12, 6), CHROME, vx, top + 0.07, vz + 0.22, { rz: Math.PI / 2, outline: false });
    part(g, box(0.06, 0.05, 0.03), '#bdbdbd', vx, top + 0.13, vz, { outline: false });
    // Screws, a gear, a hex key scattered.
    const rnd = seeded(21);
    for (let i = 0; i < 9; i++) part(g, cyl(0.005, 0.005, 0.02, 6), '#9e9e9e', -0.05 + rnd() * 0.2, top + 0.004, zf - 0.08 - rnd() * 0.1, { rz: Math.PI / 2, ry: rnd() * 3, outline: false });
    part(g, cyl(0.03, 0.03, 0.01, 12), '#ff7043', 0.06, top + 0.005, zf - 0.22, { outline: false });
    // Built standing at the arm, the hands at its links; parts fixed under the magnifier.
    const armWork = marker(g, ax + 0.05, top + 0.2, az + 0.12);
    const fineWork = marker(g, bbx, top + 0.06, bbz + 0.04);
    out.work = armWork;
    out.animate = (t) => {
      turret.rotation.y = 0.7 * Math.sin(t * 0.45);
      shoulder.rotation.x = 0.35 + 0.25 * Math.sin(t * 0.6);
      elbow.rotation.x = 0.5 + 0.35 * Math.sin(t * 0.6 + 1.2);
      const grip = 0.5 + 0.5 * Math.sin(t * 1.2);
      fingers.forEach((f, i) => (f.position.x = (i ? 1 : -1) * (0.012 + 0.012 * grip)));
      leds.forEach((l, i) => (l.visible = Math.sin(t * 4 + i * 1.7) > 0));
      smoke(t);
    };
    const sz = zf + 0.28;
    out.spots = { '*': stand(g, ax + 0.05, sz, armWork, 'tinker'), tinkerParts: stand(g, bbx, sz, fineWork, 'tinker') };
  },

  /**
   * The experiment's control console: a sloped desk of switches, sliders, dials and a keyed panel,
   * the big red stop under its yellow guard; three screens over it — the chamber's schematic and
   * readings (lit while it's used), the trends running against their warning line, the camera inside
   * on the violet plasma — and a stack light whose green burns while it runs, the amber blinking. Watched sat at the keyboard in the operator's chair; when it goes
   * wrong it's stood up to, hands on the sliders.
   */
  labControl(g, W, D, _c, _def, _ctx, out) {
    const h = 0.76;
    const d = 0.7;
    const zb = -D / 2 + 0.04;
    const zf = zb + d;
    const z = zb + d / 2;
    const body = '#37474f';
    part(g, rbox(W - 0.06, h, d - 0.12, 0.02), body, 0, h / 2, z - 0.06);
    part(g, rbox(W - 0.1, 0.12, 0.04, 0.01), shade(body, 0.8), 0, 0.06, zf - 0.1);
    for (let i = 0; i < 4; i++) part(g, box(0.36, 0.012, 0.01), '#263238', -0.6 + i * 0.4, 0.4, zf - 0.115, { outline: false });
    // The desk's flat front lip and the sloped panel behind it.
    part(g, rbox(W - 0.04, 0.04, 0.24, 0.01), '#455a64', 0, h + 0.02, zf - 0.12);
    const slope = new THREE.Group();
    slope.position.set(0, h + 0.1, zb + 0.33);
    slope.rotation.x = 0.55;
    g.add(slope);
    part(slope, rbox(W - 0.06, 0.04, 0.3, 0.01), '#546e7a', 0, 0, 0);
    // Rows of switches, sliders, dials; a keyed panel.
    const sw = ['#e53935', '#fdd835', '#43a047', '#1e88e5'];
    for (let i = 0; i < 10; i++) {
      part(slope, rbox(0.03, 0.02, 0.05, 0.006), '#263238', -0.85 + i * 0.07, 0.025, -0.08);
      part(slope, box(0.012, 0.03, 0.012), sw[i % 4], -0.85 + i * 0.07, 0.045, -0.09, { outline: false });
      glowing(slope, ball(0.007), i % 3 ? '#76ff03' : '#ffab00', -0.85 + i * 0.07, 0.025, -0.125);
    }
    const sliders: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      part(slope, box(0.012, 0.004, 0.16), '#111', 0.08 + i * 0.07, 0.022, 0.02, { outline: false });
      sliders.push(part(slope, rbox(0.04, 0.025, 0.025, 0.006), '#cfd8dc', 0.08 + i * 0.07, 0.035, 0.02 - 0.05 + (i % 3) * 0.04));
    }
    for (let i = 0; i < 3; i++) {
      part(slope, cyl(0.03, 0.03, 0.025, 16), '#263238', 0.6 + i * 0.1, 0.03, -0.06);
      part(slope, box(0.006, 0.028, 0.03), '#ffffff', 0.6 + i * 0.1, 0.03, -0.075, { outline: false });
    }
    part(slope, cyl(0.016, 0.016, 0.02, 10), '#ffd54f', 0.65, 0.03, 0.07);
    // The big red stop under its yellow guard on the flat.
    part(g, cyl(0.055, 0.06, 0.02, 18), '#fdd835', 0.75, h + 0.05, zf - 0.1);
    part(g, cyl(0.04, 0.04, 0.03, 16), '#b71c1c', 0.75, h + 0.075, zf - 0.1);
    part(g, ball(0.045), '#e53935', 0.75, h + 0.09, zf - 0.1).scale.set(1, 0.5, 1);
    label(g, '비상 정지', 0.12, 0.03, 0.75, h + 0.041, zf - 0.02, '#fdd835', '#b71c1c');
    keyboard(g, -0.25, h + 0.04, zf - 0.13, 0.42);
    // The screens on their bar: the chamber in the middle (lit in use), the trends left, the camera right.
    const sy = h + 0.62;
    const sz = zb + 0.1;
    part(g, rbox(0.06, 0.4, 0.04, 0.01), BLACK, 0, h + 0.35, sz - 0.03);
    part(g, rbox(W - 0.2, 0.04, 0.04, 0.01), BLACK, 0, sy - 0.12, sz - 0.03);
    const mid = new THREE.Group();
    mid.position.set(0, sy, sz);
    g.add(mid);
    part(mid, rbox(0.62, 0.4, 0.04, 0.012), BLACK, 0, 0, -0.01);
    out.screen = litScreen(mid, painted('chamber', 512, 320, paintChamber), 0.58, 0.36, 0, 0, 0.012);
    for (const [sx, tex, key, w, hh] of [[-1, paintTrends, 'trends', 384, 256], [1, paintCamera, 'cam', 320, 240]] as const) {
      const m = new THREE.Group();
      m.position.set(sx * 0.58, sy - 0.02, sz + 0.06);
      m.rotation.y = -sx * 0.35;
      g.add(m);
      part(m, rbox(0.46, 0.33, 0.04, 0.012), BLACK, 0, 0, -0.01);
      picture(m, painted(key, w, hh, tex), 0.43, 0.3, 0, 0, 0.012, '#d0d8e0');
    }
    // The stack light on the console's corner: green while it runs, the amber blinking.
    const lx = -W / 2 + 0.12;
    part(g, cyl(0.012, 0.012, 0.3, 8), '#90a4ae', lx, h + 0.17, zb + 0.08, { outline: false });
    const lamps: Record<string, THREE.Mesh> = {};
    (['red', 'amber', 'green'] as const).forEach((k, i) => {
      const col = { red: '#e53935', amber: '#ffb300', green: '#43a047' }[k];
      const y = h + 0.5 - i * 0.07;
      part(g, cyl(0.035, 0.035, 0.065, 14), shade(col, 0.55), lx, y, zb + 0.08);
      lamps[k] = glowing(g, cyl(0.037, 0.037, 0.06, 14), col, lx, y, zb + 0.08);
      lamps[k].visible = false;
    });
    part(g, cyl(0.03, 0.035, 0.02, 12), '#263238', lx, h + 0.55, zb + 0.08);
    // A coffee mug and a printout of the run sheet.
    part(g, cyl(0.035, 0.03, 0.09, 12), '#ffffff', -0.78, h + 0.085, zf - 0.12);
    part(g, ring(0.025, 0.006), '#ffffff', -0.74, h + 0.09, zf - 0.12, { ry: Math.PI / 2, outline: false });
    part(g, box(0.2, 0.004, 0.27), '#fafafa', 0.4, h + 0.042, zf - 0.13, { ry: -0.15 });
    for (let i = 0; i < 6; i++) part(g, box(0.14, 0.002, 0.006), '#90a4ae', 0.4, h + 0.045, zf - 0.22 + i * 0.035, { ry: -0.15, outline: false });
    label(g, '실험 제어반 B', 0.36, 0.06, 0, h + 0.88, sz - 0.008, '#263238', '#80deea');
    // Sat at it watching (the operator's chair); stood up to it, hands on the sliders, when it goes wrong.
    const cz = zf + 0.22;
    out.seat = swivelChair(g, -0.25, cz, '#263238');
    const keys = marker(g, -0.25, h + 0.06, zf - 0.13);
    const sliderHands = marker(g, 0.25, h + 0.16, zb + 0.36);
    out.work = keys;
    out.spots = {
      '*': Object.assign(spot(g, 'sit', -0.25, 0.48, cz, Math.PI, 0.48), { work: keys, motion: 'type' as const }),
      stabilizeExperiment: stand(g, 0.3, zf + 0.22, sliderHands, 'tinker'),
    };
    out.animate = (t) => {
      // A live run: the green steady, the amber blinking as the readings move, the sliders riding.
      lamps.green.visible = true;
      lamps.amber.visible = Math.sin(t * 2) > 0.7;
      sliders.forEach((s, i) => (s.position.z = 0.02 + 0.05 * Math.sin(t * 0.7 + i)));
    };
  },

  /**
   * A researcher's desk: a white top on a drawer pedestal, a hutch of journals and binders over it,
   * the paper being written on the screen — the LaTeX on the left, the PDF with its equation and plot
   * on the right — a stack of printed papers flagged with sticky notes, a notepad of working, a mug
   * and a little desk plant; a mesh chair pulled up. Papers are typed; theory and plans are worked out
   * by hand on the pad; a lab meeting is led stood beside it, turned to the room.
   */
  researchDesk(g, W, D, c, _def, _ctx, out) {
    const h = 0.74;
    const d = 0.62;
    const zb = -D / 2 + 0.03;
    const zf = zb + d;
    const z = zb + d / 2;
    const top = h;
    part(g, rbox(W - 0.04, 0.04, d, 0.012), '#f4f4f0', 0, h - 0.02, z);
    part(g, box(W - 0.06, 0.012, 0.012), c, 0, h - 0.03, zf + 0.001, { outline: false });
    part(g, rbox(0.04, h - 0.04, d - 0.04, 0.01), '#cfd8dc', -(W / 2 - 0.05), (h - 0.04) / 2, z);
    const px = W / 2 - 0.18;
    part(g, rbox(0.3, h - 0.06, d - 0.06, 0.01), '#e3e8eb', px, (h - 0.06) / 2, z);
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.26, 0.17, 0.012, 0.005), tint(c, 0.35), px, 0.14 + i * 0.2, zf - 0.024);
      part(g, box(0.1, 0.012, 0.02), '#78909c', px, 0.19 + i * 0.2, zf - 0.012, { outline: false });
    }
    // The hutch: two posts, a shelf of journals and binders.
    const hz = zb + 0.1;
    for (const sx of [-1, 1]) part(g, rbox(0.03, 0.56, 0.18, 0.006), '#cfd8dc', sx * (W / 2 - 0.05), top + 0.28, hz);
    part(g, rbox(W - 0.06, 0.025, 0.2, 0.006), '#cfd8dc', 0, top + 0.56, hz);
    part(g, rbox(W - 0.06, 0.025, 0.2, 0.006), '#cfd8dc', 0, top + 0.82, hz);
    for (const sx of [-1, 1]) part(g, rbox(0.03, 0.27, 0.18, 0.006), '#cfd8dc', sx * (W / 2 - 0.05), top + 0.69, hz);
    const rnd = seeded(31);
    let x = -W / 2 + 0.1;
    const spines = ['#1565c0', '#c62828', '#2e7d32', '#f9a825', '#6a1b9a', '#37474f', '#00838f', '#ef6c00'];
    while (x < W / 2 - 0.12) {
      const w = 0.03 + rnd() * 0.03;
      const hh = 0.17 + rnd() * 0.07;
      part(g, box(w, hh, 0.16), spines[Math.floor(rnd() * spines.length)], x + w / 2, top + 0.575 + hh / 2, hz, { outline: false });
      x += w + 0.006;
    }
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.07, 0.22, 0.17, 0.006), ['#1e88e5', '#43a047', '#e53935'][i], -0.3 + i * 0.08, top + 0.15, hz);
      part(g, box(0.04, 0.08, 0.002), '#ffffff', -0.3 + i * 0.08, top + 0.17, hz + 0.087, { outline: false });
    }
    // The screen with the paper on it.
    const mon = monitor(g, 0.02, top, zb + 0.24, 0.48, 0.3);
    out.screen = litScreen(mon, painted('paper', 512, 320, paintPaper), 0.46, 0.288, 0, 0.17 + 0.15, -0.003);
    keyboard(g, 0.0, top, zf - 0.17, 0.36);
    // The printed papers, flagged; the notepad of working; the mug and a plant.
    for (let i = 0; i < 5; i++) part(g, box(0.21, 0.008, 0.29), i % 2 ? '#fafafa' : '#f5f5f5', 0.36, top + 0.004 + i * 0.008, zb + 0.24 + i * 0.004, { ry: 0.08 - i * 0.04 });
    for (const [k, dz] of [['#ffeb3b', 0], ['#f48fb1', 0.06], ['#81d4fa', 0.12]] as const) part(g, box(0.04, 0.003, 0.03), k, 0.48, top + 0.045, zb + 0.14 + dz, { outline: false });
    const note = painted('working', 128, 160, (cx) => {
      cx.fillStyle = '#fffde7';
      cx.fillRect(0, 0, 128, 160);
      cx.strokeStyle = '#b3e5fc';
      for (let i = 1; i < 10; i++) {
        cx.beginPath();
        cx.moveTo(0, i * 16);
        cx.lineTo(128, i * 16);
        cx.stroke();
      }
      text(cx, 'H|ψ⟩ = E|ψ⟩', 8, 22, 15, '#1a237e', 'left', false, MATH);
      text(cx, '⟨x²⟩ − ⟨x⟩²', 8, 54, 15, '#1a237e', 'left', false, MATH);
      text(cx, 'Δx·Δp ≥ ℏ/2', 8, 86, 15, '#c62828', 'left', false, MATH);
      text(cx, '→ 3장에 넣기', 8, 120, 13, '#1a237e', 'left', false);
    });
    const padX = -0.36;
    const padZ = zf - 0.2;
    part(g, box(0.17, 0.01, 0.22), '#fffde7', padX, top + 0.005, padZ, { ry: 0.12 });
    flat(g, note, 0.16, 0.2, padX, top + 0.011, padZ, 0.12);
    part(g, cyl(0.005, 0.005, 0.13, 6), '#1a237e', padX + 0.1, top + 0.014, padZ + 0.04, { rz: Math.PI / 2, ry: 0.8, outline: false });
    part(g, cyl(0.035, 0.03, 0.09, 12), '#1565c0', W / 2 - 0.08, top + 0.045, zf - 0.12);
    part(g, ring(0.025, 0.006), '#1565c0', W / 2 - 0.04, top + 0.05, zf - 0.12, { ry: Math.PI / 2, outline: false });
    part(g, cyl(0.045, 0.035, 0.07, 12), '#a1887f', -0.4, top + 0.035, zb + 0.24);
    for (let i = 0; i < 5; i++) part(g, ball(0.028), '#66bb6a', -0.4 + Math.sin(i * 1.3) * 0.03, top + 0.09 + (i % 2) * 0.03, zb + 0.24 + Math.cos(i * 1.3) * 0.03, { outline: false });
    // The chair; typed at; written on the pad; the meeting led stood beside it, turned to the room.
    const cz = zf + 0.22;
    out.seat = swivelChair(g, 0.0, cz, '#455a64');
    const keys = marker(g, 0.0, top + 0.02, zf - 0.17);
    const pad = marker(g, padX, top + 0.01, padZ);
    out.work = keys;
    const sit = (work: THREE.Object3D, motion: 'type' | 'write') => Object.assign(spot(g, 'sit', 0, 0.48, cz, Math.PI, 0.48), { work, motion });
    const lead = spot(g, 'stand', -(W / 2 + 0.05), 0, zf + 0.25, -0.5);
    lead.motion = 'talk';
    out.spots = { '*': sit(keys, 'type'), scientist_theoryPaper: sit(pad, 'write'), scientist_ownProject: sit(pad, 'write'), scientist_labMeeting: lead };
  },

  /**
   * A fume hood: the cupboards under it (the yellow flammables and the blue acids, labelled), its
   * tall white body to the duct running up to the ceiling, the glass sash raised a hand's breadth
   * over the work top; inside, lit while it's used, a reflux — a round flask on a heating mantle
   * with its condenser and water lines — a beaker and reagent bottles, the vapour rising and drawn
   * off; the airflow monitor at the side reading its 0.5 m/s. Worked at standing, the hands in under
   * the sash.
   */
  sciFumeHood(g, W, D, _c, _def, _ctx, out) {
    const h = 0.88;
    const d = 0.82;
    const zb = -D / 2 + 0.03;
    const zf = zb + d;
    const z = zb + d / 2;
    const H = 2.3;
    // The cupboards: flammables (yellow) and acids (blue).
    part(g, box(W - 0.06, 0.08, d - 0.08), '#455a64', 0, 0.04, z - 0.03, { outline: false });
    for (const [sx, k, s] of [[-1, '#fbc02d', '인화성 물질'], [1, '#1e88e5', '산 · 부식성']] as const) {
      const x = sx * (W / 4 - 0.01);
      part(g, rbox(W / 2 - 0.06, h - 0.1, d - 0.04, 0.01), k, x, 0.08 + (h - 0.1) / 2, z);
      part(g, box(0.012, h - 0.24, 0.01), shade(k, 0.75), x, 0.08 + (h - 0.1) / 2, zf - 0.015, { outline: false });
      part(g, box(0.1, 0.014, 0.02), '#eceff1', x - 0.05, h - 0.2, zf - 0.01, { outline: false });
      part(g, box(0.1, 0.014, 0.02), '#eceff1', x + 0.05, h - 0.2, zf - 0.01, { outline: false });
      label(g, s, 0.32, 0.07, x, 0.5, zf - 0.016, '#ffffff', sx < 0 ? '#e65100' : '#0d47a1');
    }
    // The work top inside, the side walls, the back baffle and the top housing.
    part(g, rbox(W - 0.08, 0.04, d - 0.04, 0.008), '#eceff1', 0, h + 0.02, z);
    for (const sx of [-1, 1]) part(g, rbox(0.1, H - h, d, 0.015), ENAMEL, sx * (W / 2 - 0.06), h + (H - h) / 2, z);
    part(g, box(W - 0.2, H - h - 0.32, 0.03), '#e8edf0', 0, h + (H - h - 0.32) / 2, zb + 0.04, { outline: false });
    for (let i = 0; i < 3; i++) part(g, box(W - 0.24, 0.02, 0.01), '#b0bec5', 0, h + 0.18 + i * 0.25, zb + 0.06, { outline: false });
    part(g, rbox(W - 0.04, 0.34, d, 0.015), ENAMEL, 0, H - 0.17, z);
    // The duct up to the ceiling.
    part(g, cyl(0.15, 0.15, 0.7, 18), '#cfd8dc', 0, H + 0.35, zb + 0.3);
    part(g, cyl(0.17, 0.17, 0.04, 18), '#b0bec5', 0, H + 0.02, zb + 0.3, { outline: false });
    // The light behind the top's lip, lit with the inside while it's used.
    const lightOn = new THREE.Group();
    g.add(lightOn);
    glowing(lightOn, box(W - 0.3, 0.02, 0.06), '#fffde7', 0, H - 0.36, zb + 0.3);
    glowing(lightOn, box(W - 0.24, H - h - 0.6, 0.004), '#f3faff', 0, h + (H - h - 0.6) / 2 + 0.05, zb + 0.058);
    out.inUse = lightOn;
    // The sash: a framed glass pane, raised so its bottom is a hand's breadth over the top.
    const sb = h + 0.38;
    const st = sb + 0.72;
    const sashZ = zf - 0.06;
    part(g, rbox(W - 0.2, 0.05, 0.05, 0.01), '#eceff1', 0, sb, sashZ);
    part(g, rbox(W - 0.4, 0.02, 0.03, 0.01), '#90a4ae', 0, sb - 0.035, sashZ + 0.03);
    part(g, box(W - 0.2, 0.03, 0.04), '#eceff1', 0, st, sashZ, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.03, st - sb, 0.04), '#eceff1', sx * (W / 2 - 0.115), (sb + st) / 2, sashZ, { outline: false });
    glass(g, box(W - 0.26, st - sb - 0.03, 0.008), 0, (sb + st) / 2, sashZ, PANE);
    label(g, '작업 시 새시를 내리세요', 0.5, 0.05, 0, st + 0.06, sashZ + 0.022, '#c62828', '#ffffff');
    label(g, '흄 후드 FH-02', 0.5, 0.08, 0, H - 0.14, zf + 0.002, '#37474f', '#ffffff');
    // The airflow monitor on the right post.
    const mx = W / 2 - 0.06;
    part(g, rbox(0.08, 0.16, 0.02, 0.006), '#263238', mx, h + 0.95, zf + 0.002);
    const flow = painted('flow', 64, 128, (c) => {
      c.fillStyle = '#0d1b12';
      c.fillRect(0, 0, 64, 128);
      text(c, '풍속', 32, 18, 13, '#a5d6a7', 'center');
      text(c, '0.5', 32, 56, 26, '#69f0ae', 'center', true, 'Consolas, monospace');
      text(c, 'm/s', 32, 84, 12, '#a5d6a7', 'center', false);
      c.fillStyle = '#00e676';
      c.beginPath();
      c.arc(32, 108, 8, 0, Math.PI * 2);
      c.fill();
    });
    picture(g, flow, 0.06, 0.12, mx, h + 0.95, zf + 0.014);
    // Inside: the heating mantle, a round flask, the condenser up to its clamp, the water lines.
    const rx = -0.28;
    const rz = z - 0.08;
    const ty = h + 0.04;
    part(g, rbox(0.18, 0.012, 0.14, 0.004), '#455a64', rx + 0.18, ty + 0.006, rz - 0.04);
    part(g, cyl(0.008, 0.008, 1.0, 8), CHROME, rx + 0.18, ty + 0.5, rz - 0.08, { outline: false });
    part(g, cyl(0.1, 0.09, 0.12, 18), '#6d4c41', rx, ty + 0.06, rz);
    part(g, cyl(0.06, 0.06, 0.01, 16), '#3e2723', rx, ty + 0.121, rz, { outline: false });
    glowing(g, box(0.03, 0.012, 0.004), '#ff6d00', rx, ty + 0.05, rz + 0.1);
    roundFlask(g, rx, ty + 0.17, rz, 0.075, '#ffb74d');
    glass(g, cyl(0.03, 0.03, 0.42, 12), rx, ty + 0.5, rz);
    glass(g, cyl(0.012, 0.012, 0.44, 8), rx, ty + 0.5, rz, new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.5, depthWrite: false }));
    for (const y of [ty + 0.33, ty + 0.66]) {
      part(g, box(0.04, 0.018, 0.018), '#e53935', rx + 0.03, y, rz, { outline: false });
      rod(g, new THREE.Vector3(rx + 0.18, y, rz - 0.08), new THREE.Vector3(rx + 0.03, y, rz), 0.006, CHROME);
    }
    rod(g, new THREE.Vector3(rx + 0.03, ty + 0.38, rz), new THREE.Vector3(rx + 0.28, ty + 0.02, rz - 0.2), 0.007, '#81d4fa');
    rod(g, new THREE.Vector3(rx + 0.03, ty + 0.62, rz), new THREE.Vector3(rx + 0.4, ty + 0.02, rz - 0.22), 0.007, '#81d4fa');
    const vapour = wisps(g, 4, '#fff3e0', 0.02, rx, ty + 0.74, rz, 0.5, 2.6);
    // A beaker, bottles and a spatula on the top.
    beaker(g, 0.18, ty, z + 0.06, 0.05, 0.12, '#9575cd', 0.45);
    bottle(g, 0.4, ty, z - 0.12, '#6d3b1f', BLACK, 0.17, 0.04);
    bottle(g, 0.52, ty, z - 0.04, '#fafafa', '#e53935', 0.13, 0.035);
    part(g, box(0.15, 0.004, 0.015), CHROME, 0.32, ty + 0.002, z + 0.16, { ry: 0.5, outline: false });
    // Worked at standing, the hands in under the sash.
    const hands = marker(g, -0.05, ty + 0.14, z + 0.2);
    out.work = hands;
    out.animate = vapour;
    out.spots = { '*': stand(g, -0.05, zf + 0.22, hands, 'tinker') };
  },

  /**
   * The instrument bench: a white top on grey cupboards and a shelf of consumables over it; a
   * benchtop centrifuge whose rotor spins under its lid's window while it runs, a spectrophotometer
   * with its cuvette and its spectrum up on a screen (lit in use), a PCR machine with its heated lid
   * and blue display, a carousel of pipettes, racks of little tubes and a tip box. Samples are loaded
   * into the centrifuge stood at it; the spectrum read stood at the keyboard.
   */
  sciInstrumentBench(g, W, D, _c, _def, _ctx, out) {
    const h = 0.9;
    const d = 0.72;
    const zb = -D / 2 + 0.03;
    const zf = zb + d;
    const z = zb + d / 2;
    cabinets(g, W, h - 0.04, d - 0.02, zf - 0.03, LABGREY, '#b0bec5');
    part(g, rbox(W - 0.04, 0.04, d, 0.01), '#f5f5f5', 0, h - 0.02, z);
    const top = h;
    // The shelf over it of gloves, tip boxes and tube bags.
    for (const sx of [-1, 1]) part(g, rbox(0.03, 0.6, 0.04, 0.006), STEEL, sx * (W / 2 - 0.06), top + 0.3, zb + 0.04);
    part(g, rbox(W - 0.08, 0.025, 0.24, 0.006), STEEL, 0, top + 0.58, zb + 0.13);
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.22, 0.1, 0.12, 0.008), '#ffffff', -0.65 + i * 0.25, top + 0.645, zb + 0.13);
      part(g, ball(0.025), ['#64b5f6', '#ba68c8', '#64b5f6'][i], -0.65 + i * 0.25, top + 0.7, zb + 0.13, { outline: false }).scale.set(1.4, 0.5, 1);
    }
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.14, 0.08, 0.1, 0.006), ['#26c6da', '#ffca28', '#66bb6a'][i], 0.15 + i * 0.17, top + 0.635, zb + 0.13);
      part(g, box(0.12, 0.012, 0.08), '#fafafa', 0.15 + i * 0.17, top + 0.68, zb + 0.13, { outline: false });
    }
    // The centrifuge on the left: a round-shouldered body, the lid with its window, the rotor under it.
    const cx = -0.6;
    const cz = z + 0.02;
    part(g, rbox(0.38, 0.22, 0.42, 0.06), '#eceff1', cx, top + 0.11, cz);
    part(g, rbox(0.36, 0.06, 0.08, 0.02), '#37474f', cx, top + 0.07, cz + 0.19, { rx: -0.4 });
    const cen = painted('centrifuge', 128, 48, (c) => {
      c.fillStyle = '#0a1a12';
      c.fillRect(0, 0, 128, 48);
      text(c, '13,000 rpm', 6, 16, 14, '#69f0ae', 'left', true, 'Consolas, monospace');
      text(c, '04:30 · 4℃', 6, 36, 12, '#a5d6a7', 'left', false);
    });
    picture(g, cen, 0.17, 0.06, cx - 0.06, top + 0.08, cz + 0.234, '#ffffff', 0, -0.4);
    part(g, cyl(0.016, 0.016, 0.01, 10), '#43a047', cx + 0.1, top + 0.08, cz + 0.232, { rx: Math.PI / 2 - 0.4, outline: false });
    part(g, cyl(0.016, 0.016, 0.01, 10), '#e53935', cx + 0.14, top + 0.08, cz + 0.232, { rx: Math.PI / 2 - 0.4, outline: false });
    part(g, cyl(0.15, 0.15, 0.03, 24), '#cfd8dc', cx, top + 0.235, cz - 0.02);
    glass(g, cyl(0.1, 0.1, 0.034, 24), cx, top + 0.236, cz - 0.02);
    const rotor = new THREE.Group();
    rotor.position.set(cx, top + 0.21, cz - 0.02);
    g.add(rotor);
    part(rotor, cyl(0.085, 0.07, 0.03, 18), '#90a4ae', 0, 0, 0, { outline: false });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(rotor, cyl(0.008, 0.006, 0.03, 6), ['#ffffff', '#ffeb3b'][i % 2], Math.sin(a) * 0.06, 0.02, Math.cos(a) * 0.06, { outline: false });
    }
    // The spectrophotometer: a boxy grey body, its cuvette door, and its screen standing beside.
    const spx = -0.12;
    part(g, rbox(0.32, 0.16, 0.32, 0.03), '#b0bec5', spx, top + 0.08, z - 0.02);
    part(g, rbox(0.1, 0.03, 0.1, 0.01), '#37474f', spx - 0.06, top + 0.17, z - 0.06);
    glass(g, box(0.012, 0.04, 0.012), spx + 0.06, top + 0.18, z - 0.06);
    liquid(g, box(0.01, 0.025, 0.01), '#d81b60', spx + 0.06, top + 0.175, z - 0.06);
    label(g, 'UV-Vis', 0.12, 0.035, spx + 0.06, top + 0.1, z + 0.142, '#b0bec5', '#263238');
    const mon = monitor(g, 0.32, top, zb + 0.16, 0.44, 0.27, -0.12);
    out.screen = litScreen(mon, painted('spectrum', 512, 320, paintSpectrum), 0.42, 0.26, 0, 0.17 + 0.135, -0.003);
    keyboard(g, 0.3, top, zf - 0.15, 0.32);
    // The PCR machine on the right.
    const px = W / 2 - 0.2;
    part(g, rbox(0.26, 0.2, 0.32, 0.03), '#eceff1', px, top + 0.1, z + 0.04);
    part(g, rbox(0.24, 0.05, 0.28, 0.02), '#90a4ae', px, top + 0.215, z + 0.02);
    part(g, box(0.15, 0.06, 0.01), '#0d47a1', px, top + 0.11, z + 0.2, { outline: false });
    const pcr = painted('pcr', 96, 40, (c) => {
      c.fillStyle = '#0d47a1';
      c.fillRect(0, 0, 96, 40);
      text(c, 'PCR 28/35', 48, 13, 12, '#e3f2fd', 'center');
      text(c, '72.0℃', 48, 30, 13, '#80d8ff', 'center', true, 'Consolas, monospace');
    });
    picture(g, pcr, 0.14, 0.055, px, top + 0.11, z + 0.207);
    // The pipette carousel, a tube rack and a tip box at the front.
    const pcx = 0.05;
    const pcz = zf - 0.12;
    part(g, cyl(0.07, 0.08, 0.02, 16), '#455a64', pcx, top + 0.01, pcz);
    part(g, cyl(0.01, 0.01, 0.3, 8), '#455a64', pcx, top + 0.16, pcz, { outline: false });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const p = new THREE.Group();
      p.position.set(pcx + Math.sin(a) * 0.05, top + 0.18, pcz + Math.cos(a) * 0.05);
      p.rotation.z = Math.sin(a) * 0.1;
      g.add(p);
      part(p, cyl(0.014, 0.014, 0.16, 8), '#eceff1', 0, 0, 0);
      part(p, cyl(0.016, 0.016, 0.02, 8), ['#e53935', '#fdd835', '#1e88e5', '#43a047'][i], 0, 0.09, 0, { outline: false });
      part(p, cyl(0.006, 0.002, 0.07, 6), '#eceff1', 0, -0.11, 0, { outline: false });
    }
    part(g, rbox(0.16, 0.05, 0.1, 0.008), '#29b6f6', -0.3, top + 0.025, zf - 0.12);
    for (let i = 0; i < 12; i++) part(g, cyl(0.004, 0.003, 0.02, 5), '#fff59d', -0.36 + (i % 6) * 0.024, top + 0.06, zf - 0.15 + Math.floor(i / 6) * 0.05, { outline: false });
    part(g, rbox(0.12, 0.02, 0.08, 0.004), '#fafafa', 0.62, top + 0.01, zf - 0.1);
    for (let i = 0; i < 8; i++) part(g, cyl(0.007, 0.004, 0.035, 6), ['#ffffff', '#f48fb1', '#80deea'][i % 3], 0.58 + (i % 4) * 0.025, top + 0.035, zf - 0.115 + Math.floor(i / 4) * 0.03, { outline: false });
    label(g, '공용 분석 장비 · 예약 후 사용', 0.62, 0.06, 0, top + 0.5, zb + 0.022, '#00695c', '#ffffff');
    // Loading the centrifuge stood at it; the spectrum read at the keyboard.
    const lid = marker(g, cx, top + 0.26, cz + 0.12);
    const keys = marker(g, 0.3, top + 0.03, zf - 0.15);
    out.work = keys;
    out.animate = (t) => {
      rotor.rotation.y = t * 40;
    };
    const sz = zf + 0.28;
    out.spots = { '*': stand(g, 0.3, sz, keys, 'type'), sciRunCentrifuge: stand(g, cx + 0.04, sz, lid, 'tinker') };
  },

  /**
   * The safety station by the lab's door: a yellow pipe up to the drench shower's big head with its
   * triangle pull, the eyewash bowl and its push paddle at waist height, the green sign over them;
   * beside, white lab coats on their hooks, a dispenser of goggles and boxes of gloves by size. Stood
   * at the hooks, gearing up.
   */
  sciSafetyCorner(g, W, D, _c, _def, ctx, out) {
    const zb = -D / 2 + (ctx.againstWall ? 0.03 : 0.12);
    const yel = '#fdd835';
    // A backboard (green safety panel) if it isn't on a wall.
    part(g, rbox(W - 0.08, 2.0, 0.03, 0.01), ctx.againstWall ? '#e8f5e9' : '#c8e6c9', 0, 1.0, zb + 0.015);
    if (!ctx.againstWall) part(g, rbox(W - 0.04, 0.05, 0.4, 0.01), '#9e9e9e', 0, 0.025, zb + 0.2);
    // The shower: pipe, arm, the big head, the pull rod and its triangle.
    const px = -0.28;
    part(g, cyl(0.025, 0.025, 2.2, 10), yel, px, 1.1, zb + 0.06);
    rod(g, new THREE.Vector3(px, 2.15, zb + 0.06), new THREE.Vector3(px, 2.15, zb + 0.42), 0.022, yel);
    part(g, cyl(0.13, 0.08, 0.06, 18), yel, px, 2.1, zb + 0.42);
    part(g, cyl(0.12, 0.12, 0.006, 18), '#9e9e9e', px, 2.068, zb + 0.42, { outline: false });
    part(g, cyl(0.006, 0.006, 0.6, 6), CHROME, px + 0.08, 1.85, zb + 0.32, { outline: false });
    part(g, ring(0.05, 0.007), CHROME, px + 0.08, 1.52, zb + 0.32, { outline: false });
    // The eyewash bowl and its paddle.
    rod(g, new THREE.Vector3(px, 0.98, zb + 0.06), new THREE.Vector3(px, 0.98, zb + 0.24), 0.02, yel);
    part(g, cyl(0.13, 0.06, 0.08, 20), yel, px, 1.0, zb + 0.3);
    part(g, cyl(0.115, 0.06, 0.06, 20), '#fff59d', px, 1.02, zb + 0.3, { outline: false });
    for (const dx of [-0.04, 0.04]) {
      part(g, cyl(0.012, 0.012, 0.05, 8), '#2e7d32', px + dx, 1.06, zb + 0.3);
      part(g, cyl(0.02, 0.02, 0.008, 10), '#43a047', px + dx, 1.09, zb + 0.3, { outline: false });
    }
    part(g, rbox(0.14, 0.02, 0.07, 0.006), '#2e7d32', px, 0.92, zb + 0.4, { rx: 0.4 });
    // The green sign over them.
    const sign = painted('safetySign', 192, 128, (c) => {
      c.fillStyle = '#2e7d32';
      c.fillRect(0, 0, 192, 128);
      c.fillStyle = '#ffffff';
      c.fillRect(20, 20, 56, 56);
      c.fillStyle = '#2e7d32';
      c.fillRect(42, 26, 12, 44);
      c.fillRect(26, 42, 44, 12);
      text(c, '비상 샤워', 132, 36, 22, '#ffffff', 'center');
      text(c, '세안기', 132, 66, 22, '#ffffff', 'center');
      text(c, '15분 이상 씻으세요', 96, 106, 16, '#c8e6c9', 'center');
    });
    picture(g, sign, 0.36, 0.24, -0.1, 1.72, zb + 0.034);
    // Lab coats on hooks.
    const coat = (x: number, k: string) => {
      part(g, rbox(0.04, 0.03, 0.04, 0.01), '#9e9e9e', x, 1.62, zb + 0.05);
      const c = new THREE.Group();
      c.position.set(x, 1.6, zb + 0.09);
      g.add(c);
      part(c, rbox(0.24, 0.12, 0.08, 0.04), k, 0, -0.08, 0);
      part(c, rbox(0.26, 0.6, 0.07, 0.03), k, 0, -0.42, 0);
      for (const sx of [-1, 1]) part(c, rbox(0.07, 0.5, 0.07, 0.03), shade(k, 0.95), sx * 0.15, -0.38, 0.01, { rz: sx * 0.08 });
      part(c, box(0.006, 0.6, 0.002), shade(k, 0.8), 0, -0.42, 0.036, { outline: false });
      part(c, box(0.06, 0.08, 0.004), shade(k, 0.9), 0.07, -0.3, 0.037, { outline: false });
      part(c, cyl(0.004, 0.004, 0.07, 6), '#1e88e5', 0.07, -0.25, 0.04, { outline: false });
    };
    coat(0.12, '#fafafa');
    coat(0.3, '#f0f4f8');
    // The goggles dispenser and the glove boxes.
    part(g, rbox(0.22, 0.24, 0.12, 0.01), '#eceff1', 0.2, 0.95, zb + 0.08);
    glass(g, box(0.2, 0.2, 0.004), 0.2, 0.96, zb + 0.142, PANE);
    for (let i = 0; i < 2; i++) {
      part(g, rbox(0.15, 0.04, 0.05, 0.02), '#80deea', 0.2, 0.9 + i * 0.07, zb + 0.09);
      part(g, box(0.17, 0.008, 0.03), '#37474f', 0.2, 0.9 + i * 0.07, zb + 0.06, { outline: false });
    }
    label(g, '보안경', 0.14, 0.04, 0.2, 1.1, zb + 0.142, '#00838f', '#ffffff');
    for (let i = 0; i < 3; i++) {
      const y = 0.55 + i * 0.13;
      part(g, rbox(0.24, 0.11, 0.12, 0.008), '#ffffff', 0.2, y, zb + 0.08);
      part(g, ball(0.025), '#64b5f6', 0.2, y + 0.055, zb + 0.12, { outline: false }).scale.set(1.5, 0.6, 1);
      label(g, ['S', 'M', 'L'][i], 0.04, 0.04, 0.29, y, zb + 0.141, '#1e88e5', '#ffffff');
    }
    label(g, '실험실 출입 전 보호구 착용', 0.6, 0.06, 0.02, 1.98, zb + 0.034, '#fdd835', '#212121');
    // Geared up stood at the coats.
    const hooks = marker(g, 0.2, 1.2, zb + 0.12);
    out.work = hooks;
    out.spots = { '*': stand(g, 0.15, zb + 0.6, hooks, 'rummage') };
  },

  /**
   * The workshop's 3D printer: an enclosed black printer on a little steel cart, its glass door on a
   * part being printed — the head running back and forth over the bed, the gear growing layer by
   * layer while it's used — a spool of orange filament on its holder, the touch screen at the front;
   * printed parts in a tray on the cart's shelf. Worked at standing, the hands at the door.
   */
  sci3dPrinter(g, W, D, _c, _def, _ctx, out) {
    const ct = 0.66;
    const cd = 0.6;
    const z = -D / 2 + cd / 2 + 0.08;
    const zf = z + cd / 2;
    const cw = Math.min(W - 0.16, 0.7);
    // The cart: legs on casters, two shelves.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, cyl(0.016, 0.016, ct - 0.08, 8), STEEL, sx * (cw / 2 - 0.04), (ct - 0.08) / 2 + 0.08, z + sz * (cd / 2 - 0.04), { outline: false });
        caster(g, sx * (cw / 2 - 0.04), z + sz * (cd / 2 - 0.04), 0.03);
      }
    part(g, rbox(cw, 0.03, cd, 0.008), '#90a4ae', 0, ct, z);
    part(g, rbox(cw - 0.02, 0.02, cd - 0.02, 0.008), '#90a4ae', 0, 0.22, z);
    // A tray of printed parts on the lower shelf.
    part(g, rbox(0.4, 0.06, 0.3, 0.01), '#455a64', 0, 0.26, z);
    const rnd = seeded(41);
    for (let i = 0; i < 7; i++) part(g, i % 2 ? cyl(0.035, 0.035, 0.02, 10) : rbox(0.06, 0.03, 0.04, 0.006), ['#ff7043', '#eceff1', '#26c6da'][i % 3], -0.14 + rnd() * 0.28, 0.3, z - 0.1 + rnd() * 0.2, { outline: false });
    // The printer: a black box, glass door, the spool on its back, the touch screen.
    const pb = ct + 0.015;
    const P = 0.5;
    const pz = z - 0.02;
    part(g, rbox(P, P, P, 0.02), '#263238', 0, pb + P / 2, pz);
    part(g, box(P - 0.08, P - 0.12, 0.01), '#0f1418', 0, pb + P / 2 + 0.02, pz + P / 2 - 0.004, { outline: false });
    // The chamber seen through the door: the bed, the gantry, the head, the part.
    const inside = new THREE.Group();
    inside.position.set(0, pb, pz);
    g.add(inside);
    glowing(inside, box(P - 0.1, 0.006, 0.006), '#fff8e1', 0, P - 0.07, P / 2 - 0.02);
    part(inside, box(P - 0.12, 0.012, P - 0.14), '#455a64', 0, 0.1, 0, { outline: false });
    const bedTop = 0.106;
    const gantry = new THREE.Group();
    inside.add(gantry);
    part(gantry, box(P - 0.1, 0.02, 0.02), '#90a4ae', 0, P - 0.14, 0, { outline: false });
    const head = new THREE.Group();
    gantry.add(head);
    part(head, rbox(0.06, 0.06, 0.06, 0.01), '#ff7043', 0, P - 0.14, 0.02);
    part(head, cyl(0.006, 0.002, 0.03, 6), '#ffd54f', 0, P - 0.185, 0.02, { outline: false });
    const gear = new THREE.Group();
    gear.position.set(0, bedTop, 0.02);
    inside.add(gear);
    part(gear, cyl(0.06, 0.06, 0.04, 12), '#ff7043', 0, 0.02, 0, { outline: false });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      part(gear, box(0.022, 0.04, 0.022), '#ff7043', Math.sin(a) * 0.066, 0.02, Math.cos(a) * 0.066, { ry: a, outline: false });
    }
    part(gear, cyl(0.02, 0.02, 0.042, 10), '#bf360c', 0, 0.02, 0, { outline: false });
    glass(g, box(P - 0.06, P - 0.1, 0.006), 0, pb + P / 2 + 0.02, pz + P / 2 + 0.006, PANE);
    part(g, box(0.02, 0.18, 0.02), '#90a4ae', P / 2 - 0.06, pb + P / 2 + 0.02, pz + P / 2 + 0.016, { outline: false });
    // The touch screen on the front's base strip.
    out.screen = litScreen(g, painted('printer', 192, 112, paintPrinter), 0.13, 0.075, -0.14, pb + 0.055, pz + P / 2 + 0.012);
    // The spool on its holder up on the back, filament fed in.
    const sp = new THREE.Group();
    sp.position.set(0.12, pb + P + 0.11, pz - 0.15);
    g.add(sp);
    part(sp, cyl(0.1, 0.1, 0.07, 22), '#ff7043', 0, 0, 0, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(sp, cyl(0.11, 0.11, 0.008, 22), '#212121', sx * 0.038, 0, 0, { rz: Math.PI / 2 });
    part(g, box(0.02, 0.1, 0.02), '#455a64', 0.12, pb + P + 0.05, pz - 0.15, { outline: false });
    rod(g, new THREE.Vector3(0.12, pb + P + 0.02, pz - 0.06), new THREE.Vector3(0.0, pb + P, pz + 0.05), 0.004, '#ff7043');
    label(g, '3D 프린터 · 출력 중 문 열지 마세요', 0.46, 0.04, 0, pb + P - 0.03, pz + P / 2 + 0.008, '#263238', '#ffab91');
    // The head runs over the bed, the gear growing a layer at a time, round again every 40 s.
    out.animate = (t) => {
      const k = (t / 40) % 1;
      gear.scale.set(1, Math.max(0.02, k), 1);
      head.position.x = 0.12 * Math.sin(t * 3.1);
      gantry.position.z = 0.08 * Math.sin(t * 2.3);
      gantry.position.y = bedTop + 0.04 * k - (P - 0.2);
    };
    gantry.position.y = bedTop - (P - 0.2);
    const door = marker(g, 0.0, pb + 0.25, pz + P / 2 + 0.04);
    out.work = door;
    out.spots = { '*': stand(g, 0, zf + 0.34, door, 'tinker') };
  },

  /**
   * Gas cylinders in their wall rack: nitrogen and argon in grey, carbon dioxide in blue, oxygen in
   * green, each chained, a regulator and its two gauges on top, the hoses off to the bench; the
   * yellow high-pressure warning over them.
   */
  sciGasRack(g, W, D, _c, _def, ctx, out) {
    const zb = -D / 2 + (ctx.againstWall ? 0.03 : 0.1);
    const Wr = W - 0.1;
    // The rack: a back frame, two straps with chains, the floor stop.
    if (!ctx.againstWall) for (const sx of [-1, 1]) part(g, rbox(0.04, 1.5, 0.04, 0.008), '#455a64', sx * (Wr / 2), 0.75, zb);
    for (const y of [0.5, 1.15]) {
      part(g, rbox(Wr, 0.06, 0.04, 0.008), '#455a64', 0, y, zb + 0.02);
      for (let i = 0; i < 12; i++) part(g, ring(0.012, 0.004), '#9e9e9e', -Wr / 2 + 0.05 + i * (Wr - 0.1) / 11, y, zb + 0.29, { ry: i % 2 ? Math.PI / 2 : 0, outline: false });
    }
    part(g, rbox(Wr, 0.04, 0.34, 0.01), '#607d8b', 0, 0.02, zb + 0.17);
    const gases: Array<[string, string]> = [['#9e9e9e', 'N₂'], ['#1e88e5', 'CO₂'], ['#43a047', 'O₂']];
    gases.forEach(([k, s], i) => {
      const x = -Wr / 2 + 0.15 + i * ((Wr - 0.3) / 2);
      const cz = zb + 0.17;
      part(g, cyl(0.11, 0.11, 1.3, 18), k, x, 0.69, cz);
      part(g, ball(0.11), k, x, 1.34, cz).scale.set(1, 0.6, 1);
      part(g, cyl(0.035, 0.04, 0.06, 10), '#bdbdbd', x, 1.43, cz, { outline: false });
      label(g, s, 0.12, 0.08, x, 1.0, cz + 0.112, '#ffffff', '#212121');
      // The regulator: a brass body, two gauges facing out.
      part(g, rbox(0.06, 0.07, 0.06, 0.01), '#c9a227', x, 1.5, cz);
      for (const dx of [-0.05, 0.05]) {
        part(g, cyl(0.035, 0.035, 0.02, 16), '#eceff1', x + dx, 1.54, cz + 0.03, { rx: Math.PI / 2 });
        part(g, box(0.002, 0.025, 0.002), '#d32f2f', x + dx, 1.545, cz + 0.042, { outline: false });
      }
      rod(g, new THREE.Vector3(x, 1.48, cz + 0.03), new THREE.Vector3(x + 0.08, 1.1, cz + 0.2), 0.008, i === 2 ? '#2e7d32' : '#212121');
    });
    const warn = painted('hpGas', 192, 64, (c) => {
      c.fillStyle = '#fdd835';
      c.fillRect(0, 0, 192, 64);
      c.fillStyle = '#212121';
      for (let i = -2; i < 14; i++) {
        c.beginPath();
        c.moveTo(i * 16, 64);
        c.lineTo(i * 16 + 8, 64);
        c.lineTo(i * 16 + 16, 52);
        c.lineTo(i * 16 + 8, 52);
        c.fill();
      }
      text(c, '⚠ 고압가스', 96, 26, 26, '#212121', 'center');
    });
    picture(g, warn, Wr - 0.1, 0.22, 0, 1.8, zb + 0.03);
    out.work = marker(g, 0, 1.5, zb + 0.3);
  },
  /** The front desk at the gates (2026-11-05, the layout audit; frontDesk.ts). */
  sciReception(g, W, D) {
    frontDesk(g, W, D, { name: '안내', body: '#00838f', top: ENAMEL, fg: '#ffffff', bg: '#00838f' });
  },
  /** The made-up institute's name by the path, the floor's lab on it (2026-11-05, the layout audit). */
  sciLabSign: pavementSign('sciLabSign', '🔬', '한빛과학|기술연구원', ['제2연구동 3층', '소재분석연구실', '방문객은 안내 데스크로'], '#00838f', 2.1),
};
