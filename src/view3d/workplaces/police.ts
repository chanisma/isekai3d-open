import * as THREE from 'three';
import { marker, rod, shade, spot, tint, type Builder, type Built, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox, toon } from '../toon';
import type { HeldTool } from '../handTool';
import * as PO from './policeMotion';
import { pavementSign } from './dentist';

/**
 * The police station drawn as itself (2026-10-26 workplace pipeline, at the user's request): the
 * squad room's case desks, the forensic bench, the arrest-drill dummy and the patrol car redone, and
 * what the station was missing — a case board of photos and red string, the 112 radio desk, a
 * barred holding cell, the interrogation room's steel table and bolted chairs, a gear locker and the
 * lobby's wanted posters. Each use puts the officer where it's done: sat typing up the report,
 * bent to the microscope's eyepieces, seizing the dummy's wrist, trying the cell door's lock.
 */

const BLACK = '#26282d';
const STEEL = '#b9c1c7';
const CHROME = '#dfe4e8';
const NAVY = '#1a2a5a';
/** The fluorescent yellow-green of Korean police vests and car stripes. */
const NEON = '#c6e31a';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

/** Lit parts (LEDs, lamps): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

/** See-through parts (a magnifier's lens, a riot shield, a helmet's visor), shared. */
const LENS = new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.45, depthWrite: false });
const VISOR = new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.55, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));

/** Pictures painted once a key (posters, screens, photos, labels). */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
/** A flat picture facing +z (turned by `ry`), always seen in its own colours. */
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
/**
 * A screen with a picture on it that the lot lights while it's used (its colour is set dark when
 * off, light when on, over the picture): handed out as `out.screen`.
 */
function screenOf(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: '#2a3140' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** A face in a photo: a head and shoulders on a plain ground (mugshots, wanted posters). */
function portrait(x2: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, ground: string, skin: string, hair: string, shirt: string) {
  x2.fillStyle = ground;
  x2.fillRect(px, py, w, h);
  x2.fillStyle = shirt;
  x2.beginPath();
  x2.ellipse(px + w / 2, py + h * 1.02, w * 0.42, h * 0.32, 0, 0, Math.PI * 2);
  x2.fill();
  x2.fillStyle = skin;
  x2.beginPath();
  x2.ellipse(px + w / 2, py + h * 0.45, w * 0.2, h * 0.24, 0, 0, Math.PI * 2);
  x2.fill();
  x2.fillStyle = hair;
  x2.beginPath();
  x2.ellipse(px + w / 2, py + h * 0.31, w * 0.22, h * 0.12, 0, Math.PI, Math.PI * 2);
  x2.fill();
  x2.fillStyle = '#2b2b2b';
  for (const sx of [-1, 1]) x2.fillRect(px + w / 2 + sx * w * 0.075 - 2, py + h * 0.43, 4, 3);
}

const FACES: Array<[string, string, string, string]> = [
  ['#cfd8dc', '#e8c09a', '#1a1a1a', '#455a64'],
  ['#d7ccc8', '#d9a77c', '#3e2723', '#6d4c41'],
  ['#c5cae9', '#f1cfb0', '#212121', '#263238'],
  ['#dcedc8', '#c99a6e', '#4e342e', '#33691e'],
  ['#ffe0b2', '#eac09a', '#5d4037', '#8e24aa'],
];
/** A photo print: a white border round a face. */
function photoTex(i: number): THREE.Texture {
  const [ground, skin, hair, shirt] = FACES[i % FACES.length];
  return painted(`photo${i % FACES.length}`, 96, 112, (x2) => {
    x2.fillStyle = '#fafafa';
    x2.fillRect(0, 0, 96, 112);
    portrait(x2, 6, 6, 84, 84, ground, skin, hair, shirt);
    x2.fillStyle = '#555';
    x2.font = `bold 13px ${FONT}`;
    x2.textAlign = 'center';
    x2.fillText(['용의자 A', '용의자 B', '목격자', '피해자', '공범?'][i % 5], 48, 105);
  });
}

/** An office chair on a five-star base, its seat `h` up, facing +z in its own group. */
function officeChair(c: THREE.Object3D, h: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, BLACK);
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.024, 0.024, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, h + 0.02, 0);
  part(c, rbox(0.42, 0.46, 0.06, 0.04), color, 0, h + 0.33, -0.21, { rx: -0.08 });
  part(c, rbox(0.3, 0.1, 0.03, 0.01), shade(color, 0.8), 0, h + 0.2, -0.24, { outline: false });
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
/** A spot stood facing -z at (x, z) (at the object, from its front), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}

/** The case desk's monitor: the criminal records system with a form filled in. */
const recordsTex = () =>
  painted('kics', 192, 112, (x2) => {
    x2.fillStyle = '#eef2f7';
    x2.fillRect(0, 0, 192, 112);
    x2.fillStyle = '#1a3a7a';
    x2.fillRect(0, 0, 192, 16);
    x2.fillStyle = '#fff';
    x2.font = `bold 11px ${FONT}`;
    x2.fillText('형사사법정보시스템', 6, 12);
    x2.fillStyle = '#c5d0e0';
    x2.fillRect(6, 22, 52, 62);
    portrait(x2, 8, 24, 48, 58, '#c5d0e0', '#e3b991', '#222', '#555');
    x2.font = `10px ${FONT}`;
    const rows = ['성명  김○○', '생년  1988', '죄명  절도', '전과  2범', '사건  2026-1127'];
    rows.forEach((r, i) => {
      x2.fillStyle = '#90a4ae';
      x2.fillRect(64, 24 + i * 13, 120, 11);
      x2.fillStyle = '#fff';
      x2.fillRect(65, 25 + i * 13, 118, 9);
      x2.fillStyle = '#263238';
      x2.fillText(r, 68, 33 + i * 13);
    });
    x2.fillStyle = '#1565c0';
    x2.fillRect(130, 92, 54, 14);
    x2.fillStyle = '#fff';
    x2.fillText('조회', 148, 103);
  });

/** The district on the radio desk's map screen: streets, the river, patrol cars and calls. */
const mapTex = () =>
  painted('districtMap', 192, 112, (x2) => {
    x2.fillStyle = '#e9edde';
    x2.fillRect(0, 0, 192, 112);
    x2.fillStyle = '#9fd3f0';
    x2.beginPath();
    x2.moveTo(0, 78);
    x2.quadraticCurveTo(80, 60, 192, 90);
    x2.lineTo(192, 104);
    x2.quadraticCurveTo(80, 76, 0, 94);
    x2.fill();
    x2.strokeStyle = '#ffffff';
    x2.lineWidth = 5;
    for (const x of [30, 84, 140]) {
      x2.beginPath();
      x2.moveTo(x, 0);
      x2.lineTo(x + 8, 112);
      x2.stroke();
    }
    for (const y of [22, 50]) {
      x2.beginPath();
      x2.moveTo(0, y);
      x2.lineTo(192, y + 4);
      x2.stroke();
    }
    x2.fillStyle = '#a5d6a7';
    x2.fillRect(96, 26, 36, 18);
    for (const [x, y] of [[40, 30], [120, 56], [160, 18]]) {
      x2.fillStyle = '#1565c0';
      x2.beginPath();
      x2.arc(x, y, 4, 0, Math.PI * 2);
      x2.fill();
    }
    x2.strokeStyle = '#e53935';
    x2.lineWidth = 2;
    x2.beginPath();
    x2.arc(70, 40, 8, 0, Math.PI * 2);
    x2.stroke();
    x2.fillStyle = '#e53935';
    x2.beginPath();
    x2.arc(70, 40, 3, 0, Math.PI * 2);
    x2.fill();
  });

/** The 112 calls coming in, the newest at the top in red. */
const callsTex = () =>
  painted('calls112', 192, 112, (x2) => {
    x2.fillStyle = '#0f1b2d';
    x2.fillRect(0, 0, 192, 112);
    x2.fillStyle = '#c62828';
    x2.fillRect(0, 0, 192, 16);
    x2.fillStyle = '#fff';
    x2.font = `bold 11px ${FONT}`;
    x2.fillText('112 신고 접수', 6, 12);
    const rows: Array<[string, string]> = [['코드1', '#ff5252'], ['코드2', '#ffb300'], ['코드2', '#ffb300'], ['코드3', '#81c784'], ['코드4', '#90a4ae']];
    const what = ['주거침입 신고', '교통사고', '소음 신고', '분실물', '길 안내'];
    x2.font = `10px ${FONT}`;
    rows.forEach(([code, col], i) => {
      x2.fillStyle = i === 0 ? '#3a1f26' : '#17263d';
      x2.fillRect(4, 20 + i * 18, 184, 15);
      x2.fillStyle = col;
      x2.fillText(code, 8, 31 + i * 18);
      x2.fillStyle = '#e3f2fd';
      x2.fillText(what[i], 50, 31 + i * 18);
      x2.fillStyle = '#78909c';
      x2.fillText(`23:${String(41 - i * 7).padStart(2, '0')}`, 150, 31 + i * 18);
    });
  });

/** The CCTV wall in four. */
const cctvTex = () =>
  painted('cctv4', 192, 112, (x2) => {
    x2.fillStyle = '#111';
    x2.fillRect(0, 0, 192, 112);
    const cams = ['#37474f', '#455a64', '#3e4a3f', '#4a3f3f'];
    cams.forEach((c, i) => {
      const x = (i % 2) * 96 + 2;
      const y = Math.floor(i / 2) * 56 + 2;
      x2.fillStyle = c;
      x2.fillRect(x, y, 92, 52);
      x2.fillStyle = '#607d8b';
      x2.fillRect(x + 10, y + 30, 70, 4);
      x2.fillRect(x + 30 + i * 6, y + 14, 8, 18);
      x2.fillStyle = '#cfd8dc';
      x2.font = `9px ${FONT}`;
      x2.fillText(`CAM ${i + 1}`, x + 4, y + 10);
      x2.fillStyle = '#ff5252';
      x2.beginPath();
      x2.arc(x + 86, y + 7, 2.5, 0, Math.PI * 2);
      x2.fill();
    });
  });

/** A desk monitor on its stand, facing +z, its screen picture handed back. */
function monitor(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  part(m, rbox(0.16, 0.012, 0.11, 0.004), BLACK, 0, 0.006, 0);
  part(m, rbox(0.035, h * 0.55, 0.025, 0.008), BLACK, 0, h * 0.3, -0.02);
  part(m, rbox(w, h, 0.03, 0.01), BLACK, 0, h * 0.5 + 0.1, 0);
  return m;
}

/** A keyboard and mouse at (x, z) on a top at `y`. */
function keyboard(g: THREE.Object3D, x: number, y: number, z: number, w = 0.36) {
  part(g, rbox(w, 0.018, 0.12, 0.006), '#3a3d44', x, y + 0.009, z);
  part(g, box(w - 0.03, 0.004, 0.095), '#5b6068', x, y + 0.02, z, { outline: false });
  part(g, rbox(0.05, 0.02, 0.08, 0.01), '#3a3d44', x + w / 2 + 0.09, y + 0.01, z);
}

/** A police cap: the navy crown, a black peak and the gold badge on its band. */
function cap(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  c.rotation.y = ry;
  g.add(c);
  part(c, cyl(0.1, 0.085, 0.06, 18), NAVY, 0, 0.03, 0);
  part(c, cyl(0.115, 0.1, 0.025, 18), shade(NAVY, 1.2), 0, 0.072, -0.01);
  part(c, cyl(0.09, 0.09, 0.005, 18), BLACK, 0, 0.004, 0.05, { outline: false }).scale.set(1, 1, 0.8);
  part(c, ball(0.018), '#d4af37', 0, 0.045, 0.085, { outline: false });
}

/** Folders and binders on a pile (case files), the top one a manila folder with a paper sticking out. */
function files(g: THREE.Object3D, x: number, y: number, z: number, n = 3, ry = 0) {
  const cols = ['#3949ab', '#e8c88a', '#c62828', '#00897b', '#e8c88a'];
  for (let i = 0; i < n; i++) {
    part(g, rbox(0.24, 0.025, 0.31, 0.006), cols[i % cols.length], x + (i % 2) * 0.012, y + 0.0125 + i * 0.027, z - (i % 3) * 0.01, { ry: ry + (i % 2 ? 0.06 : -0.04) });
  }
  part(g, box(0.2, 0.003, 0.1), '#ffffff', x + 0.02, y + n * 0.027 - 0.012, z + 0.15, { ry, outline: false });
}

/** Square steel legs with plates bolted to the floor (an interrogation room's furniture). */
function boltedLeg(g: THREE.Object3D, x: number, z: number, h: number, color: string) {
  part(g, rbox(0.04, h, 0.04, 0.008), color, x, h / 2, z);
  part(g, box(0.1, 0.008, 0.1), shade(color, 0.7), x, 0.004, z, { outline: false });
  for (const [dx, dz] of [[-0.035, -0.035], [0.035, 0.035], [-0.035, 0.035], [0.035, -0.035]]) part(g, cyl(0.007, 0.007, 0.012, 6), CHROME, x + dx, 0.01, z + dz, { outline: false });
}

/** The side profile of the patrol car's glasshouse, made once, centred on its middle. */
const cabinGeom = () =>
  shape('patrolCabin', () => {
    const p = new THREE.Shape();
    p.moveTo(-1.6, 0);
    p.lineTo(1.12, 0);
    p.lineTo(0.66, 0.47);
    p.lineTo(-1.3, 0.47);
    p.closePath();
    const geom = new THREE.ExtrudeGeometry(p, { depth: 1.3, bevelEnabled: false });
    geom.center();
    return geom;
  });

// =============================================================================================
// What the lost-property shelf and the print scanner draw with (policeMotion.ts has the script).

const NO = { outline: false };
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PEN_AXIS = v3(-0.12, -1, -0.28).normalize();
/** A pen held at its waist, its tip PEN_UP along PEN_AXIS from there. */
function poPen(g: THREE.Object3D, name: string): { root: THREE.Group; held: HeldTool } {
  const root = new THREE.Group();
  root.name = name;
  g.add(root);
  const inner = new THREE.Group();
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), PEN_AXIS);
  root.add(inner);
  part(inner, cyl(0.006, 0.006, PO.PEN_UP * 0.78 + 0.05, 10), NAVY, 0, (0.05 - PO.PEN_UP * 0.78) / 2, 0, NO);
  part(inner, cyl(0.006, 0.002, PO.PEN_UP * 0.22, 10), BLACK, 0, -PO.PEN_UP * 0.89, 0, NO);
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: PEN_AXIS.clone(), shape: 'pen', radius: 0.012, writes: PO.PEN_UP } } } };
}
const posedOf = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Which use is going on: the spot a dweller was posed at just now. */
function nowAt(spots: Record<string, Spot>, t: number): Spot | null {
  let best: Spot | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedOf(s)) < 0.6 && (!best || posedOf(s) > posedOf(best))) best = s;
  return best;
}
const putAt = (o: THREE.Object3D, p: PO.P) => o.position.set(p[0], p[1], p[2]);

/** A bag of something found on a shelf: a clear bag, its seal and what's in it, its tag on the front. */
function foundBag(g: THREE.Object3D, x: number, y: number, z: number, what: string, inside: string) {
  const b = new THREE.Group();
  b.position.set(x, y, z);
  g.add(b);
  part(b, rbox(0.08, 0.13, 0.03, 0.008), inside, 0, 0.07, 0, NO);
  part(b, box(0.15, 0.21, 0.04), '#e3f2fd', 0, 0.105, 0, { outline: false, material: LENS });
  part(b, box(0.152, 0.018, 0.042), NAVY, 0, 0.205, 0, NO);
  label(b, what, 0.09, 0.05, 0.03, 0.17, 0.026, '#fff8e1', '#37474f', 0, 0, false);
}
/** A cardboard box on a shelf with its tag. */
function foundBox(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, what: string) {
  part(g, rbox(w, h, 0.26, 0.008), '#c8a165', x, y + h / 2, z);
  part(g, box(w + 0.002, 0.016, 0.262), '#a67c45', x, y + h - 0.02, z, NO);
  label(g, what, Math.min(0.13, w - 0.03), 0.05, x, y + h * 0.5, z + 0.133, '#fff8e1', '#37474f', 0, 0, false);
}
/** A print, made up: rings broken here and there, patchy in the found one. */
function ridges(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, smudge: boolean) {
  c.lineWidth = 1.5;
  for (let r = 0.1; r < 1; r += 0.085) {
    const gaps = 2 + Math.floor(r * 7);
    for (let i = 0; i < gaps; i++) {
      const a0 = (i / gaps) * Math.PI * 2 + r * 5;
      const a1 = a0 + (Math.PI * 2 * 0.86) / gaps;
      c.globalAlpha = smudge ? 0.42 + 0.5 * Math.abs(Math.sin(r * 31 + i * 7)) : 1;
      c.beginPath();
      c.ellipse(cx, cy + r * 3, rx * r, ry * r, 0.12, a0, a1);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
}
/** The marked points, the same on both prints: as fractions of each print's half-size. */
const POINTS: Array<[number, number]> = [[-0.5, -0.55], [0.34, -0.62], [0.62, -0.18], [-0.68, 0.06], [0.14, -0.2], [-0.24, 0.34], [0.55, 0.42], [-0.05, 0.72]];
function printScreen(marks: number, stage: 'compare' | 'result') {
  return painted(`poPrint|${stage}|${marks}`, 384, 232, (c) => {
    c.fillStyle = '#10202e';
    c.fillRect(0, 0, 384, 232);
    c.fillStyle = '#1f3a4f';
    c.fillRect(0, 0, 384, 24);
    c.fillStyle = '#e0f2f1';
    c.font = `bold 14px ${FONT}`;
    c.fillText('지문 대조', 10, 17);
    for (const [ox, name, smudge] of [[100, '현장 지문', true], [284, '대조 지문', false]] as const) {
      c.fillStyle = '#f5f1e6';
      c.fillRect(ox - 78, 32, 156, 148);
      c.strokeStyle = '#26323a';
      ridges(c, ox, 106, 62, 68, smudge);
      c.fillStyle = '#90caf9';
      c.font = `12px ${FONT}`;
      c.fillText(name, ox - 26, 196);
      POINTS.slice(0, marks).forEach(([u, v], i) => {
        const x = ox + u * 62;
        const y = 106 + v * 66;
        c.strokeStyle = '#e53935';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y, 6, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = '#c62828';
        c.font = `bold 11px ${FONT}`;
        c.fillText(String(i + 1), x + 7, y - 5);
      });
    }
    c.fillStyle = stage === 'result' ? '#a5d6a7' : '#ffe082';
    c.font = `bold 13px ${FONT}`;
    c.fillText(stage === 'result' ? '표시한 특징점 일치 · 다른 직원 재확인 요청' : `특징점 표시 ${marks}곳 · 끝점 · 분기점 비교`, 10, 220);
  });
}
function plainScreen(title: string, sub: string, progress = -1) {
  const key = progress < 0 ? -1 : Math.round(progress * 10);
  return painted(`poPlain|${title}|${key}`, 384, 232, (c) => {
    c.fillStyle = '#10202e';
    c.fillRect(0, 0, 384, 232);
    c.fillStyle = '#e0f2f1';
    c.font = `bold 22px ${FONT}`;
    c.fillText(title, 26, 92);
    c.fillStyle = '#90caf9';
    c.font = `14px ${FONT}`;
    c.fillText(sub, 26, 122);
    if (key >= 0) {
      c.strokeStyle = '#90caf9';
      c.strokeRect(26, 146, 332, 18);
      c.fillStyle = '#4fc3f7';
      c.fillRect(28, 148, 328 * (key / 10), 14);
    }
  });
}

export const BUILDERS: Record<string, Builder> = {
  // The 경찰특공대 기지's pieces (2026-11-04, the branch lots).
  swatRappelTower(g, W, D) {
    swatRappelTower(g, W, D);
  },
  swatK9Kennel(g, W, D) {
    swatK9Kennel(g, W, D);
  },
  swatEodRig(g, W, D) {
    swatEodRig(g, W, D);
  },
  swatVan(g, W, D, _c, _def, _ctx, out) {
    swatVan(g, W, D, out);
  },
  swatArmoryRack(g, W, D) {
    swatArmoryRack(g, W, D);
  },
  swatXrayDesk(g, W, D) {
    swatXrayDesk(g, W, D);
  },
  swatK9GearShelf(g, W, D) {
    swatK9GearShelf(g, W, D);
  },
  swatSteelTarget(g, _W, D) {
    swatSteelTarget(g, D);
  },
  swatCompoundFence(g) {
    swatCompoundFence(g);
  },
  poCarPark(g, W, D) {
    carPark(g, W, D);
  },
  poStationSign(g, W, D, c, def, ctx, out) {
    STATION_SIGN(g, W, D, c, def, ctx, out);
    part(g, cyl(0.07, 0.07, 0.14, 12), '#1565c0', 0, 2.3, 0, { outline: false, material: glow('#42a5f5') });
  },
  /**
   * A detective's case desk: a grey steel desk with a drawer pedestal and a modesty panel, the
   * criminal records system up on the monitor (lit while it's used), keyboard and mouse, a desk
   * phone, a pile of case files with the officer's cap on top, a mug, a bin under it; a navy office
   * chair. Sat in it typing up a report or running a search, writing in the file for a case, reading
   * up on the law; called up from it, the officer stands in front to run the case meeting.
   */
  policeDesk(g, W, D, _c, _def, _ctx, out) {
    const h = 0.74;
    const d = 0.64;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const steel = '#8f989f';
    part(g, rbox(W - 0.06, 0.035, d, 0.012), '#d4d8db', 0, h, z);
    part(g, box(W - 0.06, 0.02, 0.01), shade(steel, 0.8), 0, h - 0.008, front, { outline: false });
    // The drawer pedestal on the right, a panel leg on the left, the modesty panel at the back.
    const px = W / 2 - 0.25;
    part(g, rbox(0.4, h - 0.02, d - 0.06, 0.012), steel, px, (h - 0.02) / 2, z);
    for (let i = 0; i < 3; i++) {
      const y = 0.14 + i * 0.22;
      part(g, rbox(0.36, 0.19, 0.012, 0.006), tint(steel, 0.15), px, y, z + (d - 0.06) / 2 + 0.004);
      part(g, rbox(0.12, 0.018, 0.02, 0.006), CHROME, px, y + 0.06, z + (d - 0.06) / 2 + 0.014, { outline: false });
    }
    part(g, rbox(0.04, h - 0.02, d - 0.06, 0.01), steel, -W / 2 + 0.07, (h - 0.02) / 2, z);
    part(g, rbox(W - 0.5, 0.38, 0.015, 0.006), shade(steel, 0.9), -0.12, 0.5, z - d / 2 + 0.04);
    const ty = h + 0.018;
    // The monitor: the records system.
    const mon = monitor(g, -0.08, ty, z - 0.14, 0.5, 0.31);
    const scr = screenOf(mon, recordsTex(), 0.46, 0.27, 0, 0.255, 0.016);
    out.screen = scr;
    const kb = marker(g, -0.08, ty + 0.03, z + 0.12);
    keyboard(g, -0.08, ty, z + 0.12);
    // A desk phone on the left, its handset cord coiled.
    part(g, rbox(0.17, 0.05, 0.2, 0.02), '#3a3d44', -W / 2 + 0.16, ty + 0.025, z - 0.04, { ry: 0.2 });
    part(g, rbox(0.05, 0.035, 0.2, 0.017), '#2b2d33', -W / 2 + 0.11, ty + 0.06, z - 0.05, { ry: 0.2 });
    part(g, box(0.08, 0.004, 0.06), '#9ccc65', -W / 2 + 0.19, ty + 0.052, z - 0.03, { ry: 0.2, outline: false, material: glow('#9ccc65') });
    // The case files on the right with the cap on top, a mug in front of them.
    files(g, W / 2 - 0.2, ty, z - 0.08, 4, -0.1);
    cap(g, W / 2 - 0.2, ty + 0.11, z - 0.1, 0.5);
    part(g, cyl(0.035, 0.03, 0.09, 12), '#ffffff', W / 2 - 0.13, ty + 0.045, z + 0.18);
    part(g, ring(0.025, 0.007, Math.PI), '#ffffff', W / 2 - 0.09, ty + 0.05, z + 0.18, { rz: -Math.PI / 2, outline: false });
    part(g, cyl(0.03, 0.03, 0.004, 12), '#5d4037', W / 2 - 0.13, ty + 0.088, z + 0.18, { outline: false });
    // Paper and a pen where the hand writes in the file.
    part(g, box(0.21, 0.003, 0.28), '#ffffff', 0.22, ty + 0.002, z + 0.16, { ry: 0.12, outline: false });
    for (let i = 0; i < 5; i++) part(g, box(0.15, 0.002, 0.005), '#9e9e9e', 0.22, ty + 0.004, z + 0.07 + i * 0.04, { ry: 0.12, outline: false });
    part(g, cyl(0.005, 0.005, 0.13, 6), '#1a237e', 0.3, ty + 0.007, z + 0.22, { rz: Math.PI / 2, ry: 0.6, outline: false });
    const paper = marker(g, 0.2, ty + 0.01, z + 0.15);
    // A bin under it.
    part(g, cyl(0.12, 0.1, 0.28, 14), '#546e7a', -0.15, 0.14, z - 0.1);
    // The chair, pulled up to the front.
    const ch = new THREE.Group();
    const cz = front + 0.22;
    ch.position.set(0, 0, cz);
    ch.rotation.y = Math.PI;
    g.add(ch);
    officeChair(ch, 0.44, '#283593');
    out.seat = marker(g, 0, 0.48, cz);
    out.work = kb;
    // Called up out of the chair to run the case meeting: stood in front of it, facing the room.
    const lead = spot(g, 'stand', 0, 0, cz + 0.5, 0);
    lead.motion = 'gesture';
    out.spots = {
      fileReport: satAt(g, cz, 'type', kb),
      searchRecords: satAt(g, cz, 'type', kb),
      police_caseFile: satAt(g, cz, 'write', paper),
      police_lawStudy: satAt(g, cz, 'read', paper),
      police_investigationPlan: lead,
      '*': satAt(g, cz, 'type', kb),
    };
  },

  /**
   * The forensic bench: a white epoxy top on a steel frame, a shelf of reagent bottles on the riser
   * behind, evidence boxes taped '증거물' on the shelf under it; on the top a microscope, a fingerprint
   * card with its brush and powder, evidence bags taped red, numbered yellow markers, the scene's
   * photos laid out, a box of gloves, a laptop running the print match (lit in use) and a magnifier
   * lamp on an arm that lights while it's used. Stood bent to the microscope to analyse evidence;
   * stood over the photos and bags linking the clues.
   */
  evidenceTable(g, W, D, _c, _def, _ctx, out) {
    const h = 0.9;
    const d = 0.72;
    const z = -D / 2 + d / 2 + 0.03;
    const steel = '#90a4ae';
    part(g, rbox(W - 0.08, 0.05, d, 0.015), '#eef1f3', 0, h, z);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) part(g, rbox(0.045, h - 0.02, 0.045, 0.008), steel, sx * (W / 2 - 0.1), (h - 0.02) / 2, z + sz * (d / 2 - 0.06));
    // A shelf under it with evidence boxes.
    part(g, rbox(W - 0.2, 0.025, d - 0.1, 0.008), shade(steel, 0.9), 0, 0.2, z);
    for (let i = 0; i < 3; i++) {
      const bx = -0.6 + i * 0.5;
      part(g, rbox(0.42, 0.26, 0.34, 0.012), '#c8a165', bx, 0.345, z + 0.02);
      part(g, box(0.43, 0.04, 0.345), '#c62828', bx, 0.42, z + 0.02, { outline: false });
      label(g, '증거물', 0.2, 0.07, bx, 0.33, z + 0.192, '#fff8e1', '#b71c1c');
    }
    // The riser at the back: a shelf of bottles and a sign.
    const rz = z - d / 2 + 0.03;
    part(g, rbox(W - 0.12, 0.62, 0.03, 0.01), '#dfe5e8', 0, h + 0.33, rz);
    part(g, rbox(W - 0.2, 0.025, 0.16, 0.008), steel, 0, h + 0.4, rz + 0.08);
    const bottles = ['#8d6e63', '#ffffff', '#1e88e5', '#8d6e63', '#43a047', '#ffffff', '#fdd835'];
    bottles.forEach((col, i) => {
      const bx = -0.75 + i * 0.22;
      part(g, cyl(0.035, 0.04, 0.13, 12), col, bx, h + 0.48, rz + 0.08);
      part(g, cyl(0.02, 0.02, 0.03, 10), BLACK, bx, h + 0.56, rz + 0.08, { outline: false });
    });
    label(g, '과학수사 · 증거분석', 0.7, 0.1, 0, h + 0.56 + 0.12, rz + 0.017, '#1a2a5a', '#ffffff');
    const ty = h + 0.025;
    // The microscope on the left: base, arm, stage with a slide, objectives, the eyepieces tipped to the user.
    const mx = -0.62;
    const mz = z + 0.1;
    part(g, rbox(0.2, 0.04, 0.24, 0.02), '#eceff1', mx, ty + 0.02, mz);
    part(g, rbox(0.06, 0.3, 0.07, 0.02), '#eceff1', mx, ty + 0.18, mz - 0.08, { rx: 0.12 });
    part(g, rbox(0.14, 0.015, 0.12, 0.004), BLACK, mx, ty + 0.13, mz + 0.01);
    part(g, box(0.07, 0.003, 0.025), '#e3f2fd', mx, ty + 0.14, mz + 0.01, { outline: false });
    part(g, cyl(0.025, 0.025, 0.05, 10), '#eceff1', mx + 0.06, ty + 0.12, mz - 0.06, { rz: Math.PI / 2 });
    part(g, rbox(0.1, 0.08, 0.12, 0.02), '#eceff1', mx, ty + 0.31, mz - 0.02);
    for (const dx of [-0.02, 0.02]) part(g, cyl(0.009, 0.007, 0.06, 8), '#9e9e9e', mx + dx, ty + 0.24, mz + 0.01, { outline: false });
    for (const dx of [-0.025, 0.025]) part(g, cyl(0.014, 0.014, 0.1, 10), BLACK, mx + dx, ty + 0.38, mz + 0.03, { rx: 0.55 });
    const eyepiece = marker(g, mx, ty + 0.42, mz + 0.07);
    // A fingerprint card, its brush and the black powder.
    const fx = -0.22;
    const card = painted('printCard', 96, 64, (x2) => {
      x2.fillStyle = '#fafafa';
      x2.fillRect(0, 0, 96, 64);
      x2.strokeStyle = '#222';
      x2.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const cx = 14 + k * 22;
        for (let r = 3; r < 10; r += 2.2) {
          x2.beginPath();
          x2.ellipse(cx, 26, r * 0.8, r, 0, 0.2, Math.PI * 2 - 0.4);
          x2.stroke();
        }
      }
      x2.fillStyle = '#c62828';
      x2.font = `bold 10px ${FONT}`;
      x2.fillText('지문 채취', 4, 56);
    });
    sheet(g, card, 0.2, 0.13, fx, ty + 0.003, z + 0.1, 0.1, -Math.PI / 2);
    part(g, cyl(0.03, 0.03, 0.05, 12), BLACK, fx + 0.14, ty + 0.025, z - 0.05);
    part(g, cyl(0.032, 0.032, 0.012, 12), '#616161', fx + 0.14, ty + 0.055, z - 0.05, { outline: false });
    part(g, cyl(0.006, 0.006, 0.14, 6), '#8d6e63', fx + 0.05, ty + 0.012, z - 0.07, { rz: Math.PI / 2, ry: 0.5, outline: false });
    part(g, ball(0.022), BLACK, fx - 0.01, ty + 0.018, z - 0.03, { outline: false }).scale.set(1.6, 0.7, 1);
    // Evidence bags: clear, a red seal across the top, a phone and a knife in them.
    const bag = (x: number, bz: number, ry: number, what: 'phone' | 'knife') => {
      const b = new THREE.Group();
      b.position.set(x, ty, bz);
      b.rotation.y = ry;
      g.add(b);
      part(b, box(0.18, 0.012, 0.24), '#e3f2fd', 0, 0.006, 0);
      part(b, box(0.182, 0.014, 0.035), '#d32f2f', 0, 0.007, -0.1, { outline: false });
      if (what === 'phone') part(b, rbox(0.07, 0.012, 0.13, 0.008), BLACK, 0, 0.012, 0.02, { outline: false });
      else {
        part(b, box(0.025, 0.012, 0.09), '#5d4037', 0, 0.012, 0.07, { outline: false });
        part(b, box(0.022, 0.006, 0.12), CHROME, 0, 0.012, -0.03, { outline: false });
      }
      label(b, '증거 #3', 0.1, 0.03, 0, 0.015, -0.1, '#d32f2f', '#ffffff', 0, -Math.PI / 2);
    };
    bag(0.12, z - 0.02, -0.15, 'phone');
    bag(0.34, z + 0.06, 0.2, 'knife');
    // The scene's photos laid out on the bench to link up.
    for (let i = 0; i < 3; i++) sheet(g, photoTex(i), 0.09, 0.105, 0.05 + i * 0.12, ty + 0.002 + i * 0.0005, z + 0.24, 0.1 - i * 0.12, -Math.PI / 2);
    const clues = marker(g, 0.17, ty + 0.01, z + 0.15);
    // Numbered yellow markers (folded tents).
    for (let i = 0; i < 3; i++) {
      const tx = 0.6 + i * 0.1;
      const tz = z + 0.17 - (i % 2) * 0.08;
      const t = new THREE.Group();
      t.position.set(tx, ty, tz);
      t.rotation.y = 0.3 * (i - 1);
      g.add(t);
      for (const s of [-1, 1]) part(t, box(0.06, 0.07, 0.004), '#fdd835', 0, 0.03, s * 0.017, { rx: s * 0.45 });
      label(t, String(i + 1), 0.04, 0.045, 0, 0.033, 0.032, '#fdd835', '#111111', 0, -0.45);
    }
    // A box of blue gloves.
    part(g, rbox(0.22, 0.09, 0.12, 0.01), '#ffffff', -0.32, ty + 0.045, z - 0.24);
    part(g, ball(0.03), '#64b5f6', -0.32, ty + 0.1, z - 0.24, { outline: false }).scale.set(1.3, 0.6, 1);
    // A laptop running the print match.
    const lx = 0.62;
    const lz = z - 0.17;
    part(g, rbox(0.34, 0.015, 0.24, 0.008), '#455a64', lx, ty + 0.008, lz);
    const lid = new THREE.Group();
    lid.position.set(lx, ty + 0.015, lz - 0.115);
    lid.rotation.x = -0.25;
    g.add(lid);
    part(lid, rbox(0.34, 0.22, 0.012, 0.008), '#455a64', 0, 0.11, 0);
    const match = painted('printMatch', 128, 80, (x2) => {
      x2.fillStyle = '#0d1b2a';
      x2.fillRect(0, 0, 128, 80);
      for (const [cx, col] of [[34, '#4fc3f7'], [94, '#4fc3f7']] as const) {
        x2.strokeStyle = col;
        for (let r = 4; r < 22; r += 3.4) {
          x2.beginPath();
          x2.ellipse(cx, 36, r * 0.75, r, 0, 0.3, Math.PI * 2 - 0.5);
          x2.stroke();
        }
      }
      x2.fillStyle = '#66bb6a';
      x2.font = `bold 12px ${FONT}`;
      x2.fillText('일치 98.6%', 32, 72);
    });
    out.screen = screenOf(lid, match, 0.3, 0.18, 0, 0.11, 0.007);
    // A magnifier lamp clamped at the back right, over the bench: its ring lights while it's used.
    const ax = 0.86;
    const j1 = new THREE.Vector3(ax, ty + 0.4, rz + 0.06);
    const j2 = new THREE.Vector3(0.45, ty + 0.36, z + 0.08);
    part(g, rbox(0.06, 0.06, 0.06, 0.01), '#eceff1', ax, ty + 0.03, rz + 0.06);
    rod(g, new THREE.Vector3(ax, ty + 0.05, rz + 0.06), j1, 0.012, '#eceff1');
    rod(g, j1, j2, 0.012, '#eceff1');
    part(g, ball(0.02), '#eceff1', j1.x, j1.y, j1.z, { outline: false });
    part(g, ring(0.08, 0.018), '#eceff1', j2.x, j2.y - 0.04, j2.z, { rx: Math.PI / 2 });
    part(g, cyl(0.072, 0.072, 0.008, 22), '#d7f1fb', j2.x, j2.y - 0.04, j2.z, { outline: false, material: LENS });
    const lamp = new THREE.Group();
    part(lamp, ring(0.08, 0.01), '#fffde7', j2.x, j2.y - 0.055, j2.z, { rx: Math.PI / 2, outline: false, material: glow('#fffde7') });
    g.add(lamp);
    out.inUse = lamp;
    out.work = clues;
    out.spots = {
      // Bent to the eyepieces.
      analyzeEvidence: stoodAt(g, mx, z + d / 2 + 0.22, 'peer', eyepiece),
      // Over the photos and bags, moving them about.
      police_caseBoard: stoodAt(g, 0.18, z + d / 2 + 0.24, 'tinker', clues),
      '*': stoodAt(g, 0.18, z + d / 2 + 0.24, 'tinker', clues),
    };
  },

  /**
   * An arrest-drill dummy on a blue mat: a padded tan figure on a weighted base, the right arm held
   * out to be seized, a red training vest, a pair of handcuffs hung on its belt and another on the
   * mat. Drilled on squared up to it — the wrist seized, the elbow pressed down, the arm turned and
   * cuffed (`restrain`); it rocks on its base while it's worked. Briefing the counter-terror drill,
   * the officer stands beside it facing the room.
   */
  trainingDummy(g, W, D, c, _def, _ctx, out) {
    part(g, rbox(W - 0.04, 0.035, D - 0.04, 0.015), '#1565c0', 0, 0.0175, 0);
    part(g, box(W - 0.2, 0.002, D - 0.2), '#1e88e5', 0, 0.036, 0, { outline: false });
    const fig = new THREE.Group();
    fig.position.set(0, 0.035, -0.14);
    g.add(fig);
    const pad = c;
    // The weighted base and a short sprung post.
    part(fig, cyl(0.24, 0.27, 0.16, 22), BLACK, 0, 0.08, 0);
    part(fig, cyl(0.2, 0.2, 0.01, 22), '#424242', 0, 0.165, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(fig, ring(0.07, 0.012), '#9e9e9e', 0, 0.19 + i * 0.03, 0, { rx: Math.PI / 2, outline: false });
    // Legs, hips, the torso in its vest, the head with its seams.
    for (const sx of [-1, 1]) part(fig, rbox(0.13, 0.5, 0.15, 0.05), pad, sx * 0.08, 0.6, 0);
    part(fig, rbox(0.34, 0.16, 0.2, 0.06), shade(pad, 0.9), 0, 0.9, 0);
    part(fig, rbox(0.4, 0.5, 0.24, 0.08), pad, 0, 1.2, 0);
    part(fig, rbox(0.42, 0.34, 0.26, 0.06), '#c62828', 0, 1.22, 0);
    label(fig, '훈련용', 0.2, 0.07, 0, 1.28, 0.132, '#c62828', '#ffffff');
    part(fig, rbox(0.36, 0.05, 0.25, 0.02), BLACK, 0, 0.99, 0);
    part(fig, cyl(0.06, 0.07, 0.08, 12), pad, 0, 1.49, 0);
    part(fig, ball(0.13), pad, 0, 1.62, 0).scale.set(0.95, 1.1, 1);
    part(fig, ring(0.13, 0.004, Math.PI), shade(pad, 0.7), 0, 1.62, 0, { ry: Math.PI / 2, outline: false });
    // The left arm down by its side; the right held out in front, bent, its wrist to grab.
    part(fig, rbox(0.1, 0.48, 0.11, 0.045), pad, 0.25, 1.15, 0.02, { rz: -0.12 });
    const sh = new THREE.Vector3(-0.24, 1.36, 0.02);
    const el = new THREE.Vector3(-0.27, 1.12, 0.18);
    const wr = new THREE.Vector3(-0.2, 1.08, 0.38);
    for (const [a, b] of [[sh, el], [el, wr]]) rod(fig, a, b, 0.05, pad);
    part(fig, ball(0.055), pad, el.x, el.y, el.z, { outline: false });
    part(fig, ball(0.05), shade(pad, 0.9), wr.x, wr.y, wr.z);
    // Handcuffs on its belt, another pair on the mat.
    const cuffs = (p: THREE.Object3D, x: number, y: number, z: number, rx: number) => {
      for (const dx of [-0.04, 0.04]) part(p, ring(0.032, 0.006), CHROME, x + dx, y, z, { rx, outline: false });
      part(p, box(0.03, 0.008, 0.008), CHROME, x, y, z, { outline: false });
    };
    cuffs(fig, 0.14, 0.95, 0.13, 0);
    cuffs(g, 0.32, 0.045, 0.34, Math.PI / 2);
    const wrist = marker(fig, wr.x, wr.y, wr.z);
    // Rocks on its base while it's worked.
    out.animate = (t) => {
      fig.rotation.x = -0.05 - 0.035 * Math.max(0, Math.sin(t * 1.3)) + 0.012 * Math.sin(t * 5.1);
      fig.rotation.z = 0.025 * Math.sin(t * 0.9);
    };
    out.work = wrist;
    const brief = spot(g, 'stand', 0.5, 0, 0.3, 0.35);
    brief.motion = 'gesture';
    out.spots = {
      arrestDrill: stoodAt(g, -0.05, 0.42, 'restrain', wrist),
      police_tacticalDrill: stoodAt(g, -0.05, 0.42, 'restrain', wrist),
      police_counterTerrorBrief: brief,
      '*': stoodAt(g, -0.05, 0.42, 'restrain', wrist),
    };
  },

  /**
   * A Korean patrol car parked by the station: white, a navy band and a fluorescent stripe down
   * its sides with '경찰 POLICE' on the front doors and 112 on the back, the red and blue light bar
   * on the roof, a black push bumper, the plates; drawn full size, its near side at the front tile
   * where the officer gets in. It's gone while it's out on patrol or a call.
   */
  patrolCar(g, _W, _D, _c, _def, _ctx, out) {
    const car = new THREE.Group();
    g.add(car);
    out.idle = car;
    const L = 3.9;
    const Wd = 1.46;
    const zc = 0.22;
    const WHITE_CAR = '#f6f7f8';
    const side = (s: number) => zc + s * (Wd / 2);
    // Body, hood and boot.
    part(car, rbox(L, 0.5, Wd, 0.16), WHITE_CAR, 0, 0.56, zc);
    part(car, rbox(L * 0.98, 0.1, Wd - 0.02, 0.05), shade(WHITE_CAR, 0.92), 0, 0.33, zc);
    // The glasshouse, a white roof and pillars.
    part(car, cabinGeom(), '#2d3e50', -0.24, 1.045, zc);
    part(car, rbox(2.0, 0.05, 1.28, 0.03), WHITE_CAR, -0.31, 1.29, zc);
    const pillars: Array<[number, number, number, number]> = [[-0.25, 0.1, 0.46, 0], [0.89, 0.06, 0.64, 0.77], [-1.45, 0.06, 0.56, -0.57]];
    for (const [x, pw, ph, rz] of pillars) for (const s of [-1, 1]) part(car, box(pw, ph, 0.012), WHITE_CAR, x, 1.045, zc + s * 0.652, { rz, outline: false });
    // Wheels under arches.
    for (const x of [-1.25, 1.22])
      for (const s of [-1, 1]) {
        const wz = side(s) - s * 0.1;
        part(car, cyl(0.31, 0.31, 0.22, 22), BLACK, x, 0.31, wz, { rx: Math.PI / 2 });
        part(car, cyl(0.19, 0.19, 0.225, 16), STEEL, x, 0.31, wz, { rx: Math.PI / 2, outline: false });
        part(car, cyl(0.05, 0.05, 0.23, 8), shade(STEEL, 0.7), x, 0.31, wz, { rx: Math.PI / 2, outline: false });
        part(car, ring(0.36, 0.035, Math.PI), '#37474f', x, 0.31, side(s) + s * 0.005, { outline: false });
      }
    // The livery on both sides: a navy band, the neon stripe over it, door lines, handles, the words.
    for (const s of [-1, 1]) {
      const zz = side(s) + s * 0.004;
      part(car, box(L - 0.5, 0.13, 0.006), NAVY, -0.05, 0.45, zz, { outline: false });
      part(car, box(L - 0.5, 0.04, 0.006), NEON, -0.05, 0.54, zz, { outline: false });
      for (const x of [0.62, -0.28, -1.12]) part(car, box(0.008, 0.48, 0.007), '#9aa0a6', x, 0.6, zz, { outline: false });
      for (const x of [0.12, -0.75]) part(car, rbox(0.12, 0.025, 0.02, 0.008), '#9aa0a6', x, 0.72, zz + s * 0.01, { outline: false });
      const ry = s > 0 ? 0 : Math.PI;
      label(car, '경찰 POLICE', 0.95, 0.15, 0.17, 0.68, zz + s * 0.004, 'none', NAVY, ry);
      label(car, '112', 0.34, 0.15, -1.45, 0.68, zz + s * 0.004, 'none', '#1565c0', ry);
      // Side mirrors.
      part(car, rbox(0.12, 0.09, 0.08, 0.02), BLACK, 0.66, 0.92, side(s) + s * 0.08);
    }
    // The front (+x): the grille, headlights, a black push bumper, the plate.
    const fx = L / 2;
    part(car, rbox(0.04, 0.14, 0.6, 0.015), '#37474f', fx, 0.62, zc);
    for (const s of [-1, 1]) part(car, rbox(0.04, 0.09, 0.3, 0.02), '#fffde7', fx, 0.7, zc + s * 0.5, { material: glow('#fffde7') });
    part(car, rbox(0.1, 0.32, Wd - 0.3, 0.03), BLACK, fx + 0.12, 0.48, zc);
    for (const s of [-1, 1]) part(car, rbox(0.14, 0.06, 0.06, 0.015), BLACK, fx + 0.06, 0.4, zc + s * 0.35);
    label(car, '12경 3456', 0.4, 0.1, fx + 0.175, 0.45, zc, '#ffffff', '#111111', Math.PI / 2);
    // The back: tail lights and the plate.
    const bx = -L / 2;
    for (const s of [-1, 1]) part(car, rbox(0.04, 0.12, 0.3, 0.02), '#d32f2f', bx, 0.7, zc + s * 0.5);
    part(car, rbox(0.08, 0.12, Wd - 0.1, 0.03), '#cfd8dc', bx - 0.02, 0.38, zc);
    label(car, '12경 3456', 0.4, 0.1, bx - 0.065, 0.58, zc, '#ffffff', '#111111', -Math.PI / 2);
    // The light bar: red on the driver's side, blue on the other, a speaker between; an aerial.
    const ly = 1.32;
    part(car, rbox(0.34, 0.05, 1.24, 0.02), BLACK, -0.3, ly, zc);
    part(car, rbox(0.28, 0.09, 0.5, 0.03), '#e53935', -0.3, ly + 0.06, zc - 0.32, { material: toon('#ef5350', '#5a0d0d') });
    part(car, rbox(0.28, 0.09, 0.5, 0.03), '#1e88e5', -0.3, ly + 0.06, zc + 0.32, { material: toon('#42a5f5', '#0d2c5a') });
    part(car, rbox(0.2, 0.08, 0.12, 0.02), '#cfd8dc', -0.3, ly + 0.055, zc);
    part(car, cyl(0.005, 0.005, 0.4, 6), BLACK, -1.15, 1.48, zc, { outline: false });
  },

  /**
   * The squad room's case board: a cork board in an aluminium frame under a navy header naming the
   * case, the suspects' and witnesses' photos pinned up and tied together with red string, the
   * district map with the scenes circled, sticky notes and a timeline across the bottom, a tray of
   * markers; hung on the wall (or on a stand in the open). The case meeting stands round it; sorting
   * it, the officer stands at it pinning and moving things.
   */
  policeCaseBoard(g, W, D, _c, _def, ctx, out) {
    const bw = W - 0.24;
    const bh = 1.05;
    const z = -D / 2 + (ctx.againstWall ? 0.03 : 0.22);
    const y = ctx.againstWall ? 1.45 : 1.25;
    if (!ctx.againstWall)
      for (const sx of [-1, 1]) {
        part(g, cyl(0.025, 0.025, y + 0.3, 8), STEEL, sx * (bw / 2 + 0.02), (y + 0.3) / 2, z);
        part(g, rbox(0.06, 0.04, 0.6, 0.015), STEEL, sx * (bw / 2 + 0.02), 0.02, z);
      }
    part(g, rbox(bw + 0.06, bh + 0.06, 0.04, 0.012), '#b0b4b8', 0, y, z);
    part(g, box(bw, bh, 0.012), '#b08a5a', 0, y, z + 0.02, { outline: false });
    const fz = z + 0.027;
    label(g, '수사본부 · 연쇄 주거침입 사건', bw - 0.1, 0.11, 0, y + bh / 2 - 0.09, fz, NAVY, '#ffffff');
    // The photos, each pinned with a red pin, and the red string between them.
    const pins: THREE.Vector3[] = [];
    const at: Array<[number, number]> = [[-0.62, 0.2], [-0.28, 0.24], [-0.5, -0.17], [0.02, -0.06], [-0.18, -0.32]];
    at.forEach(([px, py], i) => {
      sheet(g, photoTex(i), 0.17, 0.2, px, y + py, fz + 0.001 * i, 0, 0).rotation.z = ((i * 37) % 7) * 0.025 - 0.07;
      const pin = new THREE.Vector3(px, y + py + 0.085, fz + 0.012);
      part(g, ball(0.013), '#e53935', pin.x, pin.y, pin.z, { outline: false });
      pins.push(pin);
    });
    for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [2, 4]]) rod(g, pins[a].clone().setZ(fz + 0.016), pins[b].clone().setZ(fz + 0.016), 0.0035, '#d50000');
    // The district map with its scenes circled, a string to the map from the main suspect.
    sheet(g, mapTex(), 0.5, 0.32, 0.5, y + 0.15, fz);
    const mp = new THREE.Vector3(0.38, y + 0.18, fz + 0.016);
    part(g, ball(0.013), '#e53935', mp.x, mp.y, mp.z, { outline: false });
    rod(g, pins[3].clone().setZ(fz + 0.016), mp, 0.0035, '#d50000');
    // Sticky notes and the timeline.
    const notes: Array<[number, number, string, string]> = [[0.32, -0.12, '#fff176', '목격 22:40'], [0.52, -0.1, '#f48fb1', 'CCTV 확보'], [0.72, -0.14, '#a5d6a7', '알리바이?']];
    for (const [nx, ny, col, text] of notes) label(g, text, 0.17, 0.14, nx, y + ny, fz + 0.002, col, '#37474f', 0, 0, false);
    label(g, '21:40 ▶ 22:15 ▶ 23:05 ▶ 00:30', 0.9, 0.07, 0.38, y - 0.35, fz + 0.002, '#ffffff', '#c62828');
    // The marker tray.
    part(g, rbox(bw * 0.5, 0.025, 0.07, 0.008), '#b0b4b8', 0.3, y - bh / 2 - 0.02, z + 0.04);
    for (const [i, col] of ['#d32f2f', '#1565c0', '#212121'].entries()) part(g, cyl(0.009, 0.009, 0.12, 8), col, 0.15 + i * 0.07, y - bh / 2 - 0.005, z + 0.045, { rz: Math.PI / 2, outline: false });
    const photo = marker(g, -0.3, y - 0.05, fz);
    out.work = photo;
    out.spots = { policePinClues: stoodAt(g, -0.3, z + 0.5, 'board', photo) };
  },

  /**
   * The 112 radio desk: a steel desk with three monitors on a bar — the district map with the
   * patrol cars and the call circled, the calls coming in (lit while it's used), the CCTV in four —
   * a '112 상황' sign over them, a radio base station with its green display and the hand mic on its
   * coiled lead, a red hotline phone, a headset on its hook, keyboard and mouse; a chair. Sat at it
   * with the headset on, typing the calls in.
   */
  policeDispatchConsole(g, W, D, _c, _def, _ctx, out) {
    const h = 0.74;
    const d = 0.7;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const steel = '#5f6b73';
    part(g, rbox(W - 0.06, 0.04, d, 0.015), '#cfd6da', 0, h, z);
    for (const sx of [-1, 1]) part(g, rbox(0.05, h - 0.02, d - 0.08, 0.012), steel, sx * (W / 2 - 0.08), (h - 0.02) / 2, z);
    part(g, rbox(W - 0.24, 0.4, 0.015, 0.006), shade(steel, 0.9), 0, 0.5, z - d / 2 + 0.05);
    part(g, rbox(0.4, h - 0.04, d - 0.1, 0.012), steel, -W / 2 + 0.3, (h - 0.04) / 2, z);
    const ty = h + 0.02;
    // A bar across the back holding three monitors, the sign over the middle one.
    const mz = z - d / 2 + 0.12;
    part(g, rbox(0.06, 0.45, 0.04, 0.01), BLACK, 0, ty + 0.22, mz - 0.04);
    part(g, rbox(1.6, 0.04, 0.04, 0.01), BLACK, 0, ty + 0.4, mz - 0.03);
    const screens: Array<[number, number, () => THREE.Texture]> = [[-0.54, 0.35, mapTex], [0, 0, callsTex], [0.54, -0.35, cctvTex]];
    for (const [x, ry, tex] of screens) {
      const m = new THREE.Group();
      m.position.set(x, ty + 0.4, mz + Math.abs(x) * 0.25);
      m.rotation.y = ry;
      g.add(m);
      part(m, rbox(0.52, 0.32, 0.03, 0.01), BLACK, 0, 0, 0);
      if (x === 0) out.screen = screenOf(m, tex(), 0.48, 0.28, 0, 0, 0.016);
      else sheet(m, tex(), 0.48, 0.28, 0, 0, 0.016);
    }
    part(g, rbox(0.5, 0.11, 0.03, 0.01), '#c62828', 0, ty + 0.68, mz - 0.03);
    label(g, '112 상황', 0.44, 0.08, 0, ty + 0.68, mz - 0.013, '#c62828', '#ffffff');
    part(g, cyl(0.035, 0.035, 0.04, 14), '#ff1744', 0.3, ty + 0.7, mz - 0.03, { material: glow('#ff5252') });
    // The radio base station on the left, its hand mic on a coiled lead.
    const rx = -0.72;
    part(g, rbox(0.28, 0.1, 0.22, 0.015), '#263238', rx, ty + 0.05, z - 0.02);
    part(g, box(0.12, 0.035, 0.004), '#76ff03', rx - 0.05, ty + 0.065, z + 0.091, { outline: false, material: glow('#b2ff59') });
    for (const dx of [0.06, 0.11]) part(g, cyl(0.016, 0.016, 0.02, 12), '#90a4ae', rx + dx, ty + 0.06, z + 0.098, { rx: Math.PI / 2, outline: false });
    part(g, rbox(0.06, 0.1, 0.035, 0.015), BLACK, rx + 0.14, ty + 0.06, z + 0.16, { rz: -0.2 });
    for (let i = 0; i < 5; i++) part(g, ring(0.012, 0.003), BLACK, rx + 0.07 + i * 0.015, ty + 0.04, z + 0.13, { ry: Math.PI / 2, outline: false });
    // The red hotline phone on the right, the headset on its hook at the edge.
    const px = 0.72;
    part(g, rbox(0.17, 0.05, 0.2, 0.02), '#c62828', px, ty + 0.025, z - 0.02);
    part(g, rbox(0.05, 0.035, 0.2, 0.017), '#b71c1c', px - 0.04, ty + 0.06, z - 0.02);
    label(g, '112', 0.08, 0.04, px + 0.03, ty + 0.052, z + 0.03, '#ffffff', '#c62828', 0, -Math.PI / 2);
    part(g, ring(0.07, 0.01, Math.PI), BLACK, W / 2 - 0.05, h - 0.06, z + 0.2, { ry: Math.PI / 2, outline: false });
    for (const s of [-1, 1]) part(g, cyl(0.03, 0.03, 0.025, 12), BLACK, W / 2 - 0.05, h - 0.12, z + 0.2 + s * 0.07, { rx: Math.PI / 2, outline: false });
    // Keyboard and the log book.
    const kb = marker(g, 0, ty + 0.03, z + 0.14);
    keyboard(g, 0, ty, z + 0.14, 0.42);
    files(g, 0.42, ty, z + 0.08, 2, 0.2);
    // The chair.
    const ch = new THREE.Group();
    const cz = front + 0.22;
    ch.position.set(0, 0, cz);
    ch.rotation.y = Math.PI;
    g.add(ch);
    officeChair(ch, 0.44, '#37474f');
    out.seat = marker(g, 0, 0.48, cz);
    out.work = kb;
    out.spots = { '*': satAt(g, cz, 'type', kb) };
  },

  /**
   * The holding cell (유치장): a raised concrete floor, steel bars on its front and open side with
   * flat bands across them, a barred door on the right of the front with its lock box and hinges,
   * the '유치장' plate over it; inside a steel bench along the back with a folded grey blanket and a
   * paper cup. Checked from outside: the officer stands at the door trying the lock.
   */
  policeHoldingCell(g, W, D, _c, _def, _ctx, out) {
    const H = 2.15;
    const bar = '#6b7680';
    part(g, rbox(W - 0.04, 0.04, D - 0.04, 0.01), '#9ea4a8', 0, 0.02, 0);
    // The bench along the back, a blanket and a cup on it.
    const bz = -D / 2 + 0.25;
    part(g, rbox(W - 0.2, 0.05, 0.42, 0.012), '#9aa3ab', 0, 0.45, bz);
    for (const sx of [-1, 1]) part(g, rbox(0.05, 0.43, 0.38, 0.01), shade('#9aa3ab', 0.85), sx * (W / 2 - 0.2), 0.225, bz);
    part(g, rbox(0.5, 0.08, 0.32, 0.03), '#78909c', 0.45, 0.515, bz + 0.01);
    part(g, box(0.5, 0.004, 0.33), '#90a4ae', 0.45, 0.56, bz + 0.01, { outline: false });
    part(g, cyl(0.03, 0.025, 0.08, 12), '#fafafa', -0.6, 0.515, bz + 0.05);
    // Bars along the front (z) and the left side (x), each side with bands at the top, middle and foot.
    const fz = D / 2 - 0.05;
    const lx = -W / 2 + 0.05;
    const doorFrom = 0.05;
    const doorTo = W / 2 - 0.1;
    for (let x = -W / 2 + 0.05; x <= W / 2 - 0.04; x += 0.12) {
      if (x > doorFrom - 0.04 && x < doorTo + 0.04) continue;
      part(g, cyl(0.014, 0.014, H, 8), bar, x, H / 2, fz, { outline: false });
    }
    for (let zz = -D / 2 + 0.05; zz <= D / 2 - 0.04; zz += 0.12) part(g, cyl(0.014, 0.014, H, 8), bar, lx, H / 2, zz, { outline: false });
    for (const y of [0.06, 1.0, H - 0.03]) {
      part(g, box(W - 0.06, 0.05, 0.03), shade(bar, 0.85), 0, y, fz);
      part(g, box(0.03, 0.05, D - 0.06), shade(bar, 0.85), lx, y, 0);
    }
    for (const x of [-W / 2 + 0.05, doorFrom - 0.03, doorTo + 0.03, W / 2 - 0.04]) part(g, rbox(0.05, H, 0.05, 0.01), shade(bar, 0.8), x, H / 2, fz);
    part(g, rbox(0.05, H, 0.05, 0.01), shade(bar, 0.8), lx, H / 2, -D / 2 + 0.05);
    // The barred door: its own bars and bands, hinges on the right, the lock box on the left.
    for (let x = doorFrom + 0.04; x <= doorTo - 0.02; x += 0.11) part(g, cyl(0.014, 0.014, H - 0.2, 8), bar, x, (H - 0.2) / 2 + 0.06, fz + 0.03, { outline: false });
    for (const y of [0.14, 1.0, H - 0.18]) part(g, box(doorTo - doorFrom, 0.04, 0.025), shade(bar, 0.9), (doorFrom + doorTo) / 2, y, fz + 0.03);
    for (const y of [0.4, H - 0.4]) part(g, cyl(0.025, 0.025, 0.1, 10), BLACK, doorTo + 0.02, y, fz + 0.03);
    part(g, rbox(0.12, 0.2, 0.06, 0.01), '#455a64', doorFrom + 0.08, 1.0, fz + 0.04);
    part(g, cyl(0.014, 0.014, 0.012, 10), '#ffd54f', doorFrom + 0.08, 1.03, fz + 0.077, { rx: Math.PI / 2, outline: false });
    part(g, rbox(0.03, 0.015, 0.06, 0.006), CHROME, doorFrom + 0.08, 0.96, fz + 0.09, { outline: false });
    const lock = marker(g, doorFrom + 0.08, 1.0, fz + 0.1);
    // The plate over the door.
    part(g, rbox(0.62, 0.15, 0.025, 0.008), NAVY, (doorFrom + doorTo) / 2, H - 0.1, fz + 0.035);
    label(g, '유 치 장', 0.56, 0.11, (doorFrom + doorTo) / 2, H - 0.1, fz + 0.049, NAVY, '#ffffff');
    out.work = lock;
    out.spots = { '*': stoodAt(g, doorFrom + 0.3, D / 2 + 0.32, 'tinker', lock) };
  },

  /**
   * The interrogation room's table: a brushed steel top on square legs bolted to the floor, a steel
   * ring on the suspect's side to cuff to; on the officer's side a gooseneck lamp turned on the
   * suspect, the case file with '진술조서' on it and a pen, a recorder with its red light; a paper
   * cup of water in front of the suspect.
   */
  policeInterrogationTable(g, W, D, c, _def, _ctx, _out) {
    const h = 0.74;
    const tw = W - 0.3;
    const td = D - 0.2;
    part(g, rbox(tw, 0.035, td, 0.01), c, 0, h, 0);
    part(g, box(tw - 0.02, 0.004, td - 0.02), tint(c, 0.2), 0, h + 0.018, 0, { outline: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boltedLeg(g, sx * (tw / 2 - 0.08), sz * (td / 2 - 0.08), h - 0.02, shade(c, 0.8));
    part(g, rbox(tw - 0.2, 0.05, 0.03, 0.01), shade(c, 0.8), 0, h - 0.05, -td / 2 + 0.1);
    const ty = h + 0.018;
    // The cuff ring on the suspect's side.
    for (const dx of [-0.07, 0.07]) part(g, cyl(0.012, 0.012, 0.025, 8), CHROME, dx, ty + 0.012, td / 2 - 0.14, { outline: false });
    part(g, ring(0.07, 0.01, Math.PI), CHROME, 0, ty + 0.002, td / 2 - 0.14, { outline: false });
    // The lamp on the officer's side, its head turned on the suspect's chair.
    const lx = -0.48;
    const lz = -td / 2 + 0.12;
    part(g, cyl(0.07, 0.08, 0.025, 16), BLACK, lx, ty + 0.012, lz);
    const j = new THREE.Vector3(lx + 0.04, ty + 0.4, lz + 0.05);
    rod(g, new THREE.Vector3(lx, ty + 0.02, lz), j, 0.009, BLACK);
    const head = new THREE.Group();
    head.position.copy(j);
    head.rotation.set(0.9, -0.35, 0);
    g.add(head);
    part(head, cyl(0.035, 0.09, 0.14, 16), '#37474f', 0, -0.03, 0.05, { rx: Math.PI / 2 - 0.2 });
    part(head, cyl(0.08, 0.08, 0.005, 16), '#fff9c4', 0, -0.045, 0.12, { rx: Math.PI / 2 - 0.2, outline: false, material: glow('#fff9c4') });
    // The case file and a pen, the recorder between the two sides.
    part(g, rbox(0.26, 0.012, 0.32, 0.005), '#e8c88a', 0.25, ty + 0.006, -td / 2 + 0.22, { ry: -0.1 });
    label(g, '진술조서', 0.16, 0.05, 0.25, ty + 0.014, -td / 2 + 0.16, '#e8c88a', '#3e2723', -0.1, -Math.PI / 2);
    part(g, box(0.2, 0.003, 0.26), '#ffffff', 0.27, ty + 0.014, -td / 2 + 0.24, { ry: -0.1, outline: false });
    part(g, cyl(0.005, 0.005, 0.14, 6), BLACK, 0.45, ty + 0.01, -td / 2 + 0.2, { rz: Math.PI / 2, ry: 0.4, outline: false });
    part(g, rbox(0.06, 0.02, 0.13, 0.006), '#263238', -0.12, ty + 0.01, 0.02, { ry: 0.3 });
    part(g, ball(0.008), '#ff1744', -0.1, ty + 0.022, -0.02, { outline: false, material: glow('#ff1744') });
    part(g, cyl(0.035, 0.028, 0.09, 12), '#fafafa', 0.42, ty + 0.045, td / 2 - 0.12);
  },

  /** The interrogation room's chair: steel, a grey seat and back, its feet bolted down. */
  policeInterrogationChair(g, _W, _D, c, _def, _ctx, out) {
    const w = 0.44;
    const d = 0.42;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boltedLeg(g, sx * (w / 2 - 0.03), sz * (d / 2 - 0.03), 0.43, '#455a64');
    part(g, rbox(w, 0.04, d, 0.012), c, 0, 0.45, 0);
    for (const sx of [-1, 1]) part(g, rbox(0.03, 0.42, 0.03, 0.008), '#455a64', sx * (w / 2 - 0.03), 0.66, -d / 2 + 0.03);
    part(g, rbox(w - 0.02, 0.2, 0.025, 0.01), c, 0, 0.76, -d / 2 + 0.03);
    out.seat = marker(g, 0, 0.47, 0.02);
  },

  /**
   * The training room's gear locker: steel, its door swung open while it's used (shut, louvred and
   * labelled '장비함'); inside a helmet on the top shelf, the fluorescent vest with its reflective
   * bands and 'POLICE' on a hanger, a baton and a handcuff pouch on hooks, boots at the foot, a
   * clear riot shield leant against its side. Checked over standing at it, hands in among the gear.
   */
  policeGearLocker(g, W, D, c, _def, _ctx, out) {
    const h = 1.95;
    const w = W - 0.12;
    const d = Math.min(D, 0.5);
    const z = -D / 2 + d / 2 + 0.03;
    const fz = z + d / 2;
    part(g, rbox(w, 0.03, d, 0.01), c, 0, 0.015, z);
    part(g, rbox(w, 0.03, d, 0.01), c, 0, h, z);
    for (const sx of [-1, 1]) part(g, rbox(0.03, h, d, 0.01), c, sx * (w / 2 - 0.015), h / 2, z);
    part(g, rbox(w, h, 0.02, 0.008), shade(c, 0.85), 0, h / 2, z - d / 2 + 0.01);
    part(g, rbox(w - 0.06, 0.02, d - 0.04, 0.006), c, 0, 1.58, z);
    // A helmet on the shelf.
    part(g, ball(0.13), NAVY, -0.12, 1.66, z + 0.02).scale.set(1, 0.85, 1.1);
    part(g, box(0.24, 0.07, 0.01), '#b3e5fc', -0.12, 1.66, z + 0.15, { outline: false, material: VISOR });
    label(g, '경찰', 0.1, 0.04, -0.12, 1.74, z + 0.14, NAVY, '#ffffff');
    part(g, rbox(0.18, 0.06, 0.2, 0.02), '#5d4037', 0.2, 1.62, z);
    // The rail and the vest on its hanger.
    part(g, cyl(0.01, 0.01, w - 0.06, 8), CHROME, 0, 1.48, z, { rz: Math.PI / 2, outline: false });
    part(g, ring(0.03, 0.005, Math.PI), CHROME, -0.08, 1.49, z, { outline: false });
    rod(g, new THREE.Vector3(-0.08, 1.45, z), new THREE.Vector3(-0.28, 1.38, z), 0.006, CHROME);
    rod(g, new THREE.Vector3(-0.08, 1.45, z), new THREE.Vector3(0.12, 1.38, z), 0.006, CHROME);
    part(g, rbox(0.42, 0.56, 0.12, 0.05), NEON, -0.08, 1.12, z + 0.04);
    for (const y of [0.98, 1.1]) part(g, box(0.43, 0.035, 0.125), '#cfd8dc', -0.08, y, z + 0.04, { outline: false });
    part(g, rbox(0.14, 0.2, 0.125, 0.03), '#5f7a1a', -0.08, 1.36, z + 0.04);
    label(g, 'POLICE', 0.26, 0.06, -0.08, 1.24, z + 0.102, NAVY, '#ffffff');
    // Hooks on the right with a baton and the cuff pouch.
    for (const y of [1.3, 1.05]) part(g, cyl(0.008, 0.008, 0.06, 6), CHROME, 0.28, y, z - 0.05, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.016, 0.018, 0.5, 10), BLACK, 0.28, 1.04, z - 0.02);
    part(g, rbox(0.08, 0.1, 0.05, 0.02), BLACK, 0.2, 0.98, z - 0.02);
    // Boots at the foot.
    for (const dx of [-0.08, 0.04]) {
      part(g, rbox(0.1, 0.24, 0.12, 0.03), BLACK, -0.1 + dx, 0.15, z - 0.02);
      part(g, rbox(0.1, 0.08, 0.24, 0.03), BLACK, -0.1 + dx, 0.06, z + 0.04);
    }
    // A riot shield leant on its right side.
    const sh = new THREE.Group();
    sh.position.set(w / 2 + 0.05, 0, fz - 0.1);
    sh.rotation.set(0, Math.PI / 2, -0.12);
    g.add(sh);
    const shield = new THREE.Mesh(box(0.5, 0.95, 0.012), LENS);
    shield.position.set(0, 0.5, 0);
    sh.add(shield);
    part(sh, box(0.5, 0.04, 0.016), BLACK, 0, 0.97, 0, { outline: false });
    label(sh, 'POLICE', 0.36, 0.08, 0, 0.7, 0.008, 'none', '#ffffff');
    // The door, hung on the left, louvred, shut but for when it's used.
    const hinge = new THREE.Group();
    hinge.position.set(-w / 2, 0, fz + 0.012);
    hinge.userData.swing = -1;
    g.add(hinge);
    part(hinge, rbox(w, h - 0.04, 0.02, 0.008), tint(c, 0.08), w / 2, h / 2, 0);
    for (let i = 0; i < 5; i++) part(hinge, box(w * 0.5, 0.012, 0.012), shade(c, 0.75), w / 2, 1.7 - i * 0.04, 0.012, { outline: false });
    part(hinge, rbox(0.03, 0.14, 0.03, 0.01), CHROME, w - 0.08, 1.05, 0.022);
    label(hinge, '장비함', 0.24, 0.07, w / 2, 1.42, 0.013, '#ffffff', NAVY);
    out.doors = [hinge];
    out.work = marker(g, -0.06, 1.2, fz);
  },

  /**
   * The lobby's notice board: green felt in a wooden frame under '알림판', four posters pinned to it —
   * a wanted poster (공개수배, a face, the reward), a missing child, a voice-phishing warning and
   * the 112 call poster.
   */
  policeWantedBoard(g, W, D, c, _def, ctx) {
    const bw = W - 0.2;
    const bh = 0.95;
    const z = -D / 2 + (ctx.againstWall ? 0.03 : 0.22);
    const y = ctx.againstWall ? 1.4 : 1.2;
    if (!ctx.againstWall) for (const sx of [-1, 1]) part(g, cyl(0.025, 0.025, y + 0.3, 8), c, sx * (bw / 2 + 0.02), (y + 0.3) / 2, z);
    part(g, rbox(bw + 0.08, bh + 0.08, 0.04, 0.012), c, 0, y, z);
    part(g, box(bw, bh, 0.012), '#2e5e3e', 0, y, z + 0.02, { outline: false });
    const fz = z + 0.027;
    part(g, rbox(0.5, 0.1, 0.02, 0.006), c, 0, y + bh / 2 + 0.1, z + 0.01);
    label(g, '알 림 판', 0.44, 0.08, 0, y + bh / 2 + 0.1, z + 0.021, c, '#fff8e1');
    const poster = (key: string, paint: (x2: CanvasRenderingContext2D) => void, x: number, py: number, rz: number) => {
      const m = sheet(g, painted(key, 128, 176, paint), 0.36, 0.5, x, y + py, fz);
      m.rotation.z = rz;
      for (const sx of [-1, 1]) part(g, ball(0.011), '#fdd835', x + sx * 0.15, y + py + 0.22, fz + 0.006, { outline: false });
    };
    const head = (x2: CanvasRenderingContext2D, bg: string, text: string, fg = '#ffffff') => {
      x2.fillStyle = '#fafafa';
      x2.fillRect(0, 0, 128, 176);
      x2.fillStyle = bg;
      x2.fillRect(0, 0, 128, 30);
      x2.fillStyle = fg;
      x2.font = `bold 20px ${FONT}`;
      x2.textAlign = 'center';
      x2.fillText(text, 64, 23);
    };
    poster('wanted', (x2) => {
      head(x2, '#c62828', '공개수배');
      portrait(x2, 24, 36, 80, 80, '#cfd8dc', '#e3b991', '#1a1a1a', '#37474f');
      x2.fillStyle = '#212121';
      x2.font = `bold 13px ${FONT}`;
      x2.fillText('특수절도 피의자', 64, 134);
      x2.fillStyle = '#c62828';
      x2.font = `bold 15px ${FONT}`;
      x2.fillText('현상금 500만원', 64, 156);
    }, -0.6, 0.18, 0.03);
    poster('missing', (x2) => {
      head(x2, '#ff8f00', '실종아동');
      portrait(x2, 24, 36, 80, 80, '#fff3e0', '#f1cfb0', '#3e2723', '#e91e63');
      x2.fillStyle = '#212121';
      x2.font = `bold 13px ${FONT}`;
      x2.fillText('이○○ (8세)', 64, 134);
      x2.font = `12px ${FONT}`;
      x2.fillText('찾습니다 · 182', 64, 156);
    }, -0.18, 0.16, -0.02);
    poster('phishing', (x2) => {
      head(x2, '#1565c0', '보이스피싱');
      x2.fillStyle = '#212121';
      x2.font = `bold 16px ${FONT}`;
      x2.fillText('검찰·경찰은', 64, 66);
      x2.fillText('돈을 요구하지', 64, 90);
      x2.fillText('않습니다!', 64, 114);
      x2.fillStyle = '#c62828';
      x2.font = `bold 40px ${FONT}`;
      x2.fillText('✋', 64, 160);
    }, 0.22, 0.17, 0.02);
    poster('call112', (x2) => {
      head(x2, NAVY, '범죄신고');
      x2.fillStyle = '#1565c0';
      x2.font = `bold 56px ${FONT}`;
      x2.fillText('112', 64, 104);
      x2.fillStyle = '#212121';
      x2.font = `bold 13px ${FONT}`;
      x2.fillText('문자 신고도 OK', 64, 140);
      x2.fillText('24시간 출동', 64, 160);
    }, 0.6, 0.15, -0.03);
    // Notices along the bottom.
    for (let i = 0; i < 4; i++) part(g, box(0.18, 0.13, 0.002), i % 2 ? '#fff9c4' : '#ffffff', -0.55 + i * 0.36, y - 0.32, fz + 0.001, { rz: (i % 3) * 0.03 - 0.03, outline: false });
  },

  /**
   * 분실물 보관 선반: a steel shelf bay of tagged bags and boxes over month plates on the left, the intake counter on the right with the
   * ledger open, a pad of tags, the receipt pad and its tray, a basket with today's find, and the order of work on the board behind.
   * Under 1.5 m, so it hides nobody. A find is taken in, tagged and put up; or the shelf's gone over.
   */
  poLostShelf(g, _W, _D, _c, _def, _ctx, out) {
    const S = PO.SHELF;
    const cx = (S.x0 + S.x1) / 2;
    const wide = S.x1 - S.x0;
    const zc = (S.front - 0.48) / 2;
    for (const x of [S.x0, S.x1]) for (const z of [-0.47, S.front - 0.01]) part(g, box(0.03, S.top + 0.02, 0.03), '#78909c', x, (S.top + 0.02) / 2, z);
    for (const y of [...S.levels, S.top]) part(g, box(wide, 0.03, S.front + 0.48), '#b0bec5', cx, y - 0.015, zc);
    part(g, box(wide, S.top, 0.012), '#90a4ae', cx, S.top / 2, -0.475, NO);
    ['9월 습득', '10월 습득', '11월 습득'].forEach((s, i) => label(g, s, 0.26, 0.026, cx, S.levels[i] - 0.015, S.front + 0.003, NAVY, '#ffffff'));
    part(g, box(0.52, 0.07, 0.02), NAVY, cx, S.top + 0.035, S.front - 0.1, NO);
    label(g, '분실물 보관', 0.48, 0.06, cx, S.top + 0.035, S.front - 0.088, NAVY, '#ffffff');
    foundBox(g, -0.76, S.levels[0], -0.08, 0.28, 0.2, '신발');
    foundBox(g, -0.4, S.levels[0], -0.08, 0.3, 0.3, '가방');
    foundBag(g, -0.14, S.levels[0], -0.02, '장갑', '#5d4037');
    foundBox(g, -0.74, S.levels[1], -0.08, 0.3, 0.22, '서류');
    foundBag(g, -0.44, S.levels[1], 0, '지갑', '#6d4c41');
    foundBag(g, -0.26, S.levels[1], -0.02, '휴대폰', '#263238');
    foundBag(g, -0.1, S.levels[1], 0, '열쇠', '#90a4ae');
    foundBag(g, -0.8, S.levels[2], 0, '우산', '#3949ab');
    foundBag(g, -0.62, S.levels[2], -0.02, '안경', '#37474f');
    foundBag(g, -0.44, S.levels[2], 0, '시계', '#b0bec5');
    // The intake counter.
    const C = S.counter;
    part(g, rbox(0.96, C - 0.03, 0.46, 0.012), '#cfd8dc', 0.48, (C - 0.03) / 2, 0.07);
    part(g, rbox(0.98, 0.03, 0.48, 0.008), '#eceff1', 0.48, C - 0.015, 0.07);
    label(g, '습득물 접수', 0.34, 0.08, 0.48, 0.62, S.counterFront + 0.002, '#ffffff', NAVY);
    part(g, box(0.96, 0.46, 0.02), '#dfe5e8', 0.48, C + 0.23, -0.17);
    const steps = painted('poLostSteps', 256, 112, (c) => {
      c.fillStyle = '#fbfbf7';
      c.fillRect(0, 0, 256, 112);
      c.fillStyle = NAVY;
      c.font = `bold 15px ${FONT}`;
      c.fillText('습득물 접수 순서', 10, 20);
      c.fillStyle = '#263238';
      c.font = `13px ${FONT}`;
      ['① 물건 확인 · 신고서', '② 꼬리표 쓰고 묶기', '③ 대장에 기록', '④ 보관증 주기 · 선반에 보관'].forEach((l, i) => c.fillText(l, 12, 42 + i * 20));
    });
    sheet(g, steps, 0.56, 0.245, 0.62, C + 0.26, -0.157);
    // The ledger, its new lines coming up as it's written.
    const L = PO.LEDGER;
    part(g, box(0.36, 0.008, 0.25), NAVY, L[0], C + 0.004, L[2]);
    part(g, box(0.34, 0.004, 0.23), '#fafaf2', L[0], C + 0.009, L[2], NO);
    part(g, box(0.004, 0.005, 0.23), '#90a4ae', L[0], C + 0.009, L[2], NO);
    for (let i = 0; i < 5; i++) {
      part(g, box(0.13, 0.001, 0.004), '#78909c', L[0] - 0.09, C + 0.0115, L[2] - 0.09 + i * 0.04, NO);
      if (i < 2) part(g, box(0.13, 0.001, 0.004), '#78909c', L[0] + 0.09, C + 0.0115, L[2] - 0.09 + i * 0.04, NO);
    }
    const entry = [0, 1, 2].map((i) => part(g, box(0.13, 0.001, 0.004), NAVY, L[0] + 0.09, C + 0.0115, L[2] + i * 0.035, NO));
    // The pad of tags, the receipts, their tray, the pen's cup, the basket.
    const T = PO.TAG_HOME;
    part(g, box(0.12, 0.012, 0.15), '#d7ccc8', T[0] + 0.02, C + 0.006, T[2], NO);
    const R = PO.SLIP_PAD;
    part(g, box(0.15, 0.014, 0.1), '#fff9c4', R[0], C + 0.007, R[2], NO);
    label(g, '보관증', 0.1, 0.04, R[0], C + 0.0145, R[2], '#fff9c4', '#5d4037', 0, -Math.PI / 2);
    const TR = PO.SLIP_TRAY;
    part(g, box(0.18, 0.012, 0.13), '#607d8b', TR[0], C + 0.006, TR[2], NO);
    for (const [dx, dz, w, d] of [[0, -0.06, 0.18, 0.01], [0, 0.06, 0.18, 0.01], [-0.085, 0, 0.01, 0.13], [0.085, 0, 0.01, 0.13]]) part(g, box(w, 0.03, d), '#607d8b', TR[0] + dx, C + 0.02, TR[2] + dz, NO);
    const given = part(g, box(0.14, 0.003, 0.09), '#fff9c4', TR[0], C + 0.015, TR[2], NO);
    const cup = PO.PEN_CUP;
    part(g, cyl(0.03, 0.028, 0.09, 12), '#455a64', cup[0], C + 0.045, cup[2]);
    const H = PO.BAG_HOME;
    part(g, box(0.26, 0.012, 0.2), '#78909c', H[0], C + 0.012, H[2], NO);
    for (const sx of [-1, 1]) part(g, box(0.012, 0.09, 0.2), '#78909c', H[0] + sx * 0.125, C + 0.05, H[2], NO);
    part(g, box(0.26, 0.09, 0.012), '#78909c', H[0], C + 0.05, H[2] - 0.095, NO);
    // What's handled: today's find, its tag, the pen, a receipt.
    const bag = new THREE.Group();
    bag.name = 'poFoundBag';
    g.add(bag);
    const D = PO.BAG.drop;
    part(bag, rbox(0.09, 0.14, 0.03, 0.01), '#8d5a2b', 0, -D + 0.08, 0, NO);
    part(bag, box(0.17, D - 0.012, 0.042), '#e3f2fd', 0, -D / 2 - 0.004, 0, { outline: false, material: LENS });
    part(bag, box(0.17, 0.018, 0.044), NAVY, 0, -0.004, 0, NO);
    const tag = new THREE.Group();
    tag.name = 'poTag';
    g.add(tag);
    part(tag, box(0.05, 0.002, 0.09), '#fff8e1', 0, 0, 0, NO);
    part(tag, ring(0.006, 0.0016), '#37474f', 0, 0.002, -0.038, { rx: Math.PI / 2, ...NO });
    const writ = [0, 1].map((i) => part(tag, box(0.032, 0.0012, 0.004), NAVY, 0, 0.002, -0.008 + i * 0.022, NO));
    const pen = poPen(g, 'poLostPen');
    const slip = new THREE.Group();
    slip.name = 'poReceipt';
    g.add(slip);
    part(slip, box(0.14, 0.002, 0.09), '#fff9c4', -0.04, 0, 0, NO);
    // Places.
    const mark = marker(g, L[0], C, L[2]);
    const at = (a: PO.SpotAt, motion: Motion) => {
      const s = spot(g, 'stand', a.x, 0, a.z, a.yaw);
      s.work = mark;
      s.motion = motion;
      return s;
    };
    const sort = at(PO.SORT_AT, 'poSort');
    const spots: Record<string, Spot> = { xwLostProperty: at(PO.LOST_AT, 'poLost'), poSortLost: sort, '*': sort };
    out.spots = spots;
    out.work = mark;
    const G = PO.BAG.grip;
    const grip = (x: number) => ({ at: v3(x, 0, 0), axis: v3(1, 0, 0), shape: 'pinch' as const, radius: 0.008 });
    const tmp = new THREE.Vector3();
    out.away = (_o, t) => {
      const sp = nowAt(spots, t);
      const m = sp?.motion as PO.PoMotion | undefined;
      const N = m ? PO.poNow(m, t, PO.poPhase(mark.getWorldPosition(tmp))) : null;
      putAt(bag, N?.bagAt ?? PO.BAG_HOME);
      bag.rotation.y = N?.bagTurn ?? 0;
      if (N?.tied) {
        const b = N.bagAt;
        tag.position.set(b[0] + PO.TAG_ON[0], b[1] + PO.TAG_ON[1], b[2] + PO.TAG_ON[2]);
        tag.rotation.set(Math.PI / 2 - 0.15, 0, 0.2);
      } else {
        putAt(tag, N?.tagAt ?? PO.TAG_HOME);
        tag.rotation.set(N?.tagInHand ? 0.8 : 0, 0, 0);
      }
      writ.forEach((w, i) => (w.visible = (N?.tagWrit ?? 0) > 0.2 + i * 0.4));
      entry.forEach((e, i) => (e.visible = (N?.entry ?? 0) > 0.1 + i * 0.32));
      given.visible = !!N?.slipOut;
      slip.visible = N?.tool === 'slip';
      if (N?.slipAt) putAt(slip, N.slipAt);
      putAt(pen.root, N?.tool === 'pen' && N.penAt ? N.penAt : cup);
      let held: HeldTool | null = null;
      if (N?.tool === 'pen') held = pen.held;
      else if (N?.tool === 'slip') held = { tool: slip, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.004 } } };
      else if (N?.tool === 'bag') {
        const grips: HeldTool['grips'] = N.lead === 'left' ? { left: grip(-G) } : { right: grip(G) };
        if (N.two) grips[N.lead === 'left' ? 'right' : 'left'] = grip(N.lead === 'left' ? G : -G);
        // Tying: the left hand has the tag, the bag's in the right.
        if (N.tagInHand) grips.left = { at: v3(N.key.l[0] - N.bagAt[0], N.key.l[1] - N.bagAt[1], N.key.l[2] - N.bagAt[2]), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.004 };
        held = { tool: bag, lead: N.lead, grips };
      }
      for (const s of Object.values(spots)) s.held = s === sp ? held : null;
    };
  },

  /**
   * 지문 대조기: a steel bench with a flatbed scanner on the right, its light running under the glass; the monitor at the back with a found print and
   * a known one side by side, made up, red points marked on both as the work goes on; the card's tray, a loupe, the result form and a pen in front.
   * Under 1.5 m. Cards are scanned in, or a found print compared.
   */
  poPrintScanner(g, _W, _D, _c, _def, _ctx, out) {
    const B = PO.BENCH;
    const T = B.top;
    const zc = (B.back + B.front) / 2;
    const dz = B.front - B.back;
    part(g, rbox(1.92, 0.04, dz, 0.012), '#eef1f3', 0, T - 0.02, zc);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.045, T - 0.04, 0.045, 0.008), '#90a4ae', sx * 0.9, (T - 0.04) / 2, zc + sz * (dz / 2 - 0.05));
    part(g, rbox(1.76, 0.025, dz - 0.12, 0.008), '#b0bec5', 0, 0.24, zc);
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.32, 0.2, 0.3, 0.01), '#c8a165', -0.56 + i * 0.5, 0.35, zc + 0.02);
      label(g, ['지문 카드 A', '지문 카드 B', '대조 완료'][i], 0.24, 0.06, -0.56 + i * 0.5, 0.36, zc + 0.172, '#fff8e1', '#37474f');
    }
    // The monitor.
    part(g, rbox(0.72, 0.46, 0.04, 0.012), '#263238', -0.02, 1.2, -0.22);
    part(g, box(0.06, 0.26, 0.04), '#37474f', -0.02, 1.02, -0.26);
    part(g, rbox(0.3, 0.018, 0.2, 0.008), '#37474f', -0.02, T + 0.009, -0.26);
    const screen = screenOf(g, plainScreen('지문 대조 시스템', '카드를 올려 주세요'), 0.66, 0.4, -0.02, 1.2, -0.197);
    out.screen = screen;
    // The scanner: its body, the glass plate, the light under it, a little green lamp.
    const P = PO.CARD_PLATE;
    const m0 = PO.CARD_MID;
    const sx = P[0] + m0[0];
    const sz = P[2] + m0[2];
    part(g, rbox(0.34, 0.05, 0.3, 0.012), '#37474f', sx, T + 0.025, sz);
    part(g, box(0.27, 0.002, 0.21), '#9fd8ee', sx, T + 0.052, sz, NO);
    const light = new THREE.Group();
    g.add(light);
    part(light, box(0.27, 0.003, 0.012), '#b2ebf2', sx, T + 0.054, sz, { outline: false, material: glow('#b2ebf2') });
    label(g, '스캐너', 0.12, 0.03, sx - 0.06, T + 0.025, sz + 0.1505, '#37474f', '#e0f2f1');
    part(g, ball(0.007), '#69f0ae', sx + 0.13, T + 0.028, sz + 0.15, { outline: false, material: glow('#69f0ae') });
    // The tray under the card, the mouse, the form, the cup.
    const CT = PO.CARD_TRAY;
    part(g, box(0.24, 0.012, 0.16), '#90a4ae', CT[0] + m0[0], T + 0.006, CT[2] + m0[2], NO);
    const M = PO.MOUSE;
    part(g, rbox(0.06, 0.03, 0.1, 0.012), '#37474f', M[0], T + 0.016, M[2], NO);
    const F = PO.FORM;
    part(g, box(0.17, 0.003, 0.2), '#ffffff', F[0], T + 0.002, F[2], NO);
    part(g, box(0.1, 0.002, 0.012), NAVY, F[0], T + 0.004, F[2] - 0.08, NO);
    const lines = [0, 1, 2].map((i) => part(g, box(0.11, 0.0015, 0.004), NAVY, F[0], T + 0.004, F[2] - 0.03 + i * 0.03, NO));
    const cup = PO.PRINT_PEN_CUP;
    part(g, cyl(0.03, 0.028, 0.09, 12), '#455a64', cup[0], T + 0.045, cup[2]);
    // The card: ten boxes on it, two rows, a print in each.
    const card = new THREE.Group();
    card.name = 'poPrintCard';
    g.add(card);
    const cardTex = painted('poPrintCard', 192, 128, (c) => {
      c.fillStyle = '#fbf8ee';
      c.fillRect(0, 0, 192, 128);
      c.strokeStyle = '#37474f';
      c.lineWidth = 1;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) c.strokeRect(6 + i * 36, 22 + j * 50, 34, 46);
      c.strokeStyle = '#26323a';
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) ridges(c, 23 + i * 36, 45 + j * 50, 12, 16, false);
      c.fillStyle = NAVY;
      c.font = `bold 12px ${FONT}`;
      c.fillText('지문 카드', 8, 15);
    });
    part(card, box(0.2, 0.002, 0.13), '#fbf8ee', m0[0], 0, m0[2], NO);
    sheet(card, cardTex, 0.2, 0.13, m0[0], 0.0015, m0[2], 0, -Math.PI / 2);
    // The loupe: a ring and a lens out ahead of its handle.
    const loupe = new THREE.Group();
    loupe.name = 'poLoupe';
    g.add(loupe);
    part(loupe, cyl(0.011, 0.012, 0.1, 10), BLACK, 0, 0, 0, { rx: Math.PI / 2, ...NO });
    part(loupe, ring(0.042, 0.006), BLACK, 0, 0, -0.09, { rx: Math.PI / 2, ...NO });
    part(loupe, cyl(0.04, 0.04, 0.004, 22), '#d7f1fb', 0, 0, -0.09, { outline: false, material: LENS });
    const pen = poPen(g, 'poPrintPen');
    const mark = marker(g, CT[0], T, CT[2]);
    const at = (motion: Motion) => {
      const s = spot(g, 'stand', PO.PRINT_AT.x, 0, PO.PRINT_AT.z, PO.PRINT_AT.yaw);
      s.work = mark;
      s.motion = motion;
      return s;
    };
    const enrol = at('poEnrol');
    const spots: Record<string, Spot> = { xwFingerprint: at('poPrint'), poScanCard: enrol, '*': enrol };
    out.spots = spots;
    out.work = mark;
    const cardHeld: HeldTool = { tool: card, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.004 } } };
    const loupeHeld: HeldTool = { tool: loupe, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: v3(0, 0, 1), shape: 'power', radius: 0.012 } } };
    const mat = screen.material as THREE.MeshBasicMaterial;
    const tmp = new THREE.Vector3();
    out.away = (_o, t) => {
      const sp = nowAt(spots, t);
      const m = sp?.motion as PO.PoMotion | undefined;
      const N = m ? PO.poNow(m, t, PO.poPhase(mark.getWorldPosition(tmp))) : null;
      putAt(card, N?.cardAt ?? PO.CARD_TRAY);
      putAt(loupe, N?.loupeAt ?? PO.LOUPE_HOME);
      putAt(pen.root, N?.tool === 'pen' && N.penAt ? N.penAt : cup);
      light.visible = N?.scan != null;
      if (N?.scan != null) light.position.z = -0.1 + 0.2 * N.scan;
      lines.forEach((l, i) => (l.visible = (N?.form ?? 0) > 0.1 + i * 0.32));
      const next = !N || N.screen === 'idle' ? plainScreen('지문 대조 시스템', '카드를 올려 주세요') : N.screen === 'scan' ? plainScreen('스캔 중', '카드 내용을 읽고 있어요', N.scan ?? 0) : N.screen === 'filed' ? plainScreen('등록 완료', '지문 카드를 저장했어요') : printScreen(N.marks, N.screen === 'result' ? 'result' : 'compare');
      if (mat.map !== next) mat.map = next;
      const held = N?.tool === 'card' ? cardHeld : N?.tool === 'loupe' ? loupeHeld : N?.tool === 'pen' ? pen.held : null;
      for (const s of Object.values(spots)) s.held = s === sp ? held : null;
    };
  },
};

// ---------------------------------------------------------------------------------------------
// The 경찰특공대 기지's pieces (2026-11-04, the branch lots: workFurniture/police.ts). The unit and its city are made up.

const SWAT = '#1f2326';
const SWAT_GREY = '#5d6d7e';

/**
 * 레펠 훈련탑 (2 × 2): a steel tower about four storeys high, four posts braced across, a railed platform on top with the rope beam out
 * over the front; the front faced with plywood and a window to go in by, the rope hanging down it to a mat at its foot; a caged ladder
 * up the back.
 */
function swatRappelTower(g: THREE.Group, W: number, D: number) {
  // A real one is 10 m and more; 7.6 here is over twice a storey's walls (2026-11-04, the layout audit: at 4.4 it read as two storeys).
  const H = 7.6;
  const x0 = -W / 2 + 0.14;
  const x1 = W / 2 - 0.14;
  const z0 = -D / 2 + 0.14;
  const z1 = D / 2 - 0.3;
  for (const x of [x0, x1]) for (const z of [z0, z1]) part(g, box(0.12, H, 0.12), SWAT_GREY, x, H / 2, z);
  // Braces on each side, every storey.
  for (let y = 1.1; y < H; y += 1.1) {
    for (const z of [z0, z1]) part(g, box(x1 - x0, 0.07, 0.07), shade(SWAT_GREY, 0.85), 0, y, z, { outline: false });
    for (const x of [x0, x1]) part(g, box(0.07, 0.07, z1 - z0), shade(SWAT_GREY, 0.85), x, y, (z0 + z1) / 2, { outline: false });
  }
  // The platform and its rail.
  part(g, box(x1 - x0 + 0.3, 0.1, z1 - z0 + 0.3), '#7f8c8d', 0, H, (z0 + z1) / 2);
  for (const x of [x0 - 0.1, x1 + 0.1]) part(g, box(0.05, 0.9, z1 - z0 + 0.3), '#f9a825', x, H + 0.5, (z0 + z1) / 2, { outline: false });
  part(g, box(x1 - x0 + 0.3, 0.05, 0.05), '#f9a825', 0, H + 0.95, z0 - 0.12, { outline: false });
  // The rope beam out over the front, the rope down to the mat.
  part(g, box(0.1, 0.1, 0.7), SWAT, 0.2, H + 1.0, z1 + 0.15);
  part(g, cyl(0.02, 0.02, H + 0.9, 6), '#ef6c00', 0.2, (H + 0.9) / 2 + 0.08, z1 + 0.45, { outline: false });
  part(g, rbox(1.2, 0.18, 0.5, 0.05), '#1565c0', 0.1, 0.09, D / 2 - 0.25);
  // The plywood face with the window.
  const ply = '#c8a26a';
  part(g, box(x1 - x0, 1.2, 0.05), ply, 0, 0.6 + 1.1, z1 + 0.04);
  part(g, box(x1 - x0, 0.9, 0.05), ply, 0, 3.4, z1 + 0.04);
  for (const x of [x0 + 0.15, x1 - 0.15]) part(g, box(0.3, 0.8, 0.05), ply, x, 2.75, z1 + 0.04);
  part(g, box(0.7, 0.7, 0.02), '#263238', 0, 2.75, z1 + 0.03, { outline: false });
  // The ladder up the back, in its cage.
  for (const x of [-0.18, 0.18]) part(g, box(0.04, H, 0.04), CHROME, x, H / 2, z0 - 0.1, { outline: false });
  for (let y = 0.3; y < H; y += 0.3) part(g, box(0.36, 0.03, 0.03), CHROME, 0, y, z0 - 0.1, { outline: false });
  label(g, '레펠 훈련탑', 0.9, 0.2, 0, 1.0, z1 + 0.08, SWAT, '#ffffff');
}

/** A dog lying or standing (a 저먼 셰퍼드: tan with a black saddle), facing +z. */
function swatDog(g: THREE.Object3D, x: number, z: number, lying: boolean) {
  const d = new THREE.Group();
  d.position.set(x, 0, z);
  g.add(d);
  const y = lying ? 0.13 : 0.4;
  part(d, ball(0.15), '#b07a3c', 0, y, 0, { outline: false }).scale.set(0.9, 0.8, 1.7);
  part(d, ball(0.12), '#2b2b30', 0, y + 0.06, -0.02, { outline: false }).scale.set(0.95, 0.6, 1.5);
  part(d, ball(0.09), '#b07a3c', 0, y + 0.12, 0.27, { outline: false });
  part(d, box(0.07, 0.06, 0.12), '#8d5a2b', 0, y + 0.09, 0.37, { outline: false });
  for (const s of [-1, 1]) part(d, cyl(0.0, 0.035, 0.09, 4), '#2b2b30', s * 0.05, y + 0.22, 0.25, { outline: false });
  if (!lying) for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(d, cyl(0.03, 0.025, 0.32, 6), '#b07a3c', sx * 0.07, 0.16, sz * 0.17, { outline: false });
  part(d, cyl(0.02, 0.01, 0.28, 6), '#2b2b30', 0, y + 0.05, -0.3, { rx: 1.1, outline: false });
}

/**
 * 탐지견 견사 (3 × 1): three kennel runs on a raised concrete slab, block walls between them and at the back, chain-link fronts with a
 * gate each, a roof over the back half, a dog house and a water bowl in each; two dogs in, one out training. The name plates.
 */
function swatK9Kennel(g: THREE.Group, W: number, D: number) {
  const z0 = -D / 2 + 0.06;
  const z1 = D / 2 - 0.08;
  part(g, box(W - 0.04, 0.08, D - 0.1), '#bdbdbd', 0, 0.04, 0, { outline: false });
  part(g, box(W - 0.04, 1.6, 0.1), '#d7ccc8', 0, 0.8, z0);
  const run = (W - 0.04) / 3;
  for (let i = 0; i <= 3; i++) part(g, box(0.08, 1.4, D - 0.16), '#d7ccc8', -W / 2 + 0.02 + i * run, 0.7, 0);
  part(g, box(W, 0.06, D * 0.55), '#455a64', 0, 1.72, z0 + D * 0.27);
  // The chain-link fronts: posts, rails, the wires.
  for (let i = 0; i < 3; i++) {
    const cx = -W / 2 + 0.02 + run * (i + 0.5);
    for (let k = -4; k <= 4; k++) part(g, box(0.008, 1.3, 0.008), '#9e9e9e', cx + k * (run / 9), 0.73, z1, { outline: false });
    for (const y of [0.1, 0.75, 1.38]) part(g, box(run - 0.08, 0.025, 0.025), '#9e9e9e', cx, y, z1, { outline: false });
    // The dog house at the back, the bowl at the front.
    part(g, box(0.42, 0.36, 0.34), '#8d6e63', cx - 0.18, 0.26, z0 + 0.25);
    part(g, cyl(0.01, 0.3, 0.2, 4), '#5d4037', cx - 0.18, 0.54, z0 + 0.25, { ry: Math.PI / 4 });
    part(g, cyl(0.07, 0.06, 0.04, 12), '#1565c0', cx + 0.25, 0.1, z1 - 0.15, { outline: false });
    label(g, ['K9 한결', 'K9 바람', 'K9 별'][i], 0.36, 0.1, cx, 1.5, z1 + 0.02, SWAT, '#ffd54f');
    if (i < 2) swatDog(g, cx + 0.08, 0, i === 1);
  }
}

/**
 * 폭발물 처리 장비 (2 × 1): the bomb suit on its stand (the heavy olive suit, the helmet with its thick visor, the boots below), and the
 * tracked disposal robot beside it, its arm folded with the gripper and the camera; a portable X-ray panel against the wall.
 */
function swatEodRig(g: THREE.Group, W: number, D: number) {
  const zb = -D / 2 + 0.25;
  const olive = '#556b2f';
  // The suit on its stand.
  const sx = -W / 2 + 0.4;
  part(g, cyl(0.25, 0.28, 0.04, 16), BLACK, sx, 0.02, zb, { outline: false });
  part(g, cyl(0.025, 0.025, 1.6, 8), STEEL, sx, 0.8, zb - 0.12, { outline: false });
  part(g, rbox(0.5, 0.62, 0.32, 0.1), olive, sx, 1.2, zb);
  part(g, rbox(0.4, 0.26, 0.06, 0.04), shade(olive, 0.8), sx, 1.2, zb + 0.17);
  for (const s of [-1, 1]) part(g, rbox(0.15, 0.55, 0.16, 0.06), olive, sx + s * 0.32, 1.12, zb, { rz: s * 0.08 });
  for (const s of [-1, 1]) part(g, rbox(0.18, 0.62, 0.2, 0.07), olive, sx + s * 0.12, 0.55, zb);
  for (const s of [-1, 1]) part(g, rbox(0.17, 0.12, 0.28, 0.04), BLACK, sx + s * 0.12, 0.06, zb + 0.04);
  part(g, ball(0.2), olive, sx, 1.72, zb);
  part(g, box(0.26, 0.14, 0.04), '#80cbc4', sx, 1.72, zb + 0.18, { outline: false });
  // The robot: chassis, tracks, arm, gripper, camera.
  const rx = W / 2 - 0.5;
  part(g, rbox(0.55, 0.18, 0.4, 0.03), '#37474f', rx, 0.2, zb + 0.1);
  for (const s of [-1, 1]) part(g, rbox(0.62, 0.16, 0.08, 0.07), BLACK, rx, 0.11, zb + 0.1 + s * 0.24);
  part(g, cyl(0.05, 0.05, 0.12, 10), '#f9a825', rx - 0.15, 0.36, zb + 0.1);
  part(g, box(0.06, 0.06, 0.5), '#f9a825', rx - 0.05, 0.52, zb + 0.1, { rx: 0.0, ry: Math.PI / 2, rz: 0.5 });
  part(g, box(0.06, 0.06, 0.36), '#f9a825', rx + 0.18, 0.6, zb + 0.1, { ry: Math.PI / 2, rz: -0.6 });
  for (const s of [-1, 1]) part(g, box(0.02, 0.1, 0.03), CHROME, rx + 0.3, 0.5, zb + 0.1 + s * 0.03, { outline: false });
  part(g, box(0.1, 0.07, 0.07), BLACK, rx - 0.15, 0.46, zb + 0.1);
  // The X-ray panel against the wall.
  part(g, rbox(0.42, 0.5, 0.04, 0.02), '#cfd8dc', W / 2 - 0.25, 0.55, -D / 2 + 0.06, { rx: -0.1 });
  label(g, '폭발물 처리반', 0.7, 0.14, 0, 1.95, -D / 2 + 0.05, SWAT, '#ffffff');
}

/**
 * 특공대 전술 차량 (3 × 1): a black armoured van across the tile, side windows small, the light bar, the unit's name along its side. Its
 * nose is +x: the lot parks it turned 'left', nose to the street, so on a call it pulls straight out of the garage and is gone, and
 * backs in again after (2026-11-04, the layout audit).
 */
function swatVan(g: THREE.Group, W: number, D: number, out: Built) {
  const L = W - 0.2;
  const B = D - 0.12;
  const root = g;
  g = new THREE.Group();
  root.add(g);
  const PULL = 6.5;
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  out.away = (isOut, t) => {
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let x = 0;
    if (state === 'leaving') {
      const u = Math.min(1, (t - since) / 3.5);
      x = PULL * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, (t - since) / 5);
      x = PULL * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    g.position.x = x;
    g.visible = state !== 'gone';
  };
  part(g, rbox(L, 1.25, B, 0.12), SWAT, 0, 0.95, 0);
  part(g, rbox(L * 0.32, 0.5, B - 0.02, 0.1), SWAT, L / 2 - L * 0.16 - 0.02, 1.5, 0);
  // The windscreen at the front (+x), the small side windows.
  part(g, box(0.04, 0.42, B - 0.2), '#90a4ae', L / 2 + 0.01, 1.42, 0, { outline: false });
  for (const x of [L / 2 - 0.45]) part(g, box(0.4, 0.3, 0.02), '#90a4ae', x, 1.45, B / 2 + 0.005, { outline: false });
  // Wheels, the bumper, the light bar.
  for (const x of [-L / 2 + 0.5, L / 2 - 0.55]) for (const s of [-1, 1]) part(g, cyl(0.3, 0.3, 0.2, 16), BLACK, x, 0.3, s * (B / 2 - 0.05), { rx: Math.PI / 2 });
  part(g, box(0.08, 0.16, B), '#424242', L / 2 + 0.04, 0.45, 0);
  part(g, box(0.5, 0.08, 0.16), '#d32f2f', L / 2 - 0.5, 1.62, -0.12, { outline: false });
  part(g, box(0.5, 0.08, 0.16), '#1976d2', L / 2 - 0.5, 1.62, 0.12, { outline: false });
  label(g, '경찰특공대 SWAT', 1.4, 0.24, -0.25, 1.05, B / 2 + 0.01, SWAT, '#ffd54f');
}

/**
 * 총기 보관함 (2 × 1): the armoury's locked steel cabinet, its two doors open on the racked rifles (black, muzzles up in their slots),
 * the pistol drawers below, the sign-out log on a clipboard at its side and the "무기고 · 관계자 외 출입 금지" plate over it.
 */
function swatArmoryRack(g: THREE.Group, W: number, D: number) {
  const zb = -D / 2 + 0.25;
  const H = 1.9;
  const steel = '#4e5b63';
  part(g, rbox(W - 0.12, H, 0.42, 0.02), steel, 0, H / 2, zb);
  part(g, box(W - 0.24, H - 0.2, 0.02), shade(steel, 0.7), 0, H / 2 + 0.05, zb + 0.2, { outline: false });
  // The rifles in their slots, muzzles up.
  for (let i = 0; i < 6; i++) {
    const x = -W / 2 + 0.3 + i * ((W - 0.6) / 5);
    part(g, box(0.05, 0.95, 0.06), BLACK, x, 1.08, zb + 0.1);
    part(g, box(0.07, 0.22, 0.12), '#33363b', x, 0.72, zb + 0.12);
    part(g, box(0.03, 0.12, 0.03), BLACK, x, 0.86, zb + 0.19, { outline: false });
  }
  part(g, box(W - 0.3, 0.04, 0.3), '#8a959c', 0, 0.6, zb + 0.06, { outline: false });
  // The pistol drawers below.
  for (let i = 0; i < 2; i++) {
    part(g, rbox(W - 0.3, 0.2, 0.02, 0.01), tint(steel, 0.12), 0, 0.15 + i * 0.22, zb + 0.215);
    part(g, box(0.2, 0.025, 0.03), CHROME, 0, 0.2 + i * 0.22, zb + 0.23, { outline: false });
  }
  // The doors swung open to the sides.
  for (const s of [-1, 1]) part(g, rbox(0.04, H - 0.1, W / 2 - 0.3, 0.01), steel, s * (W / 2 - 0.08), H / 2, zb + 0.21 + (W / 2 - 0.3) / 2, { outline: false });
  // The sign-out clipboard, the plate.
  part(g, box(0.015, 0.3, 0.22), '#d7ccc8', W / 2 - 0.12, 1.2, zb + 0.5, { outline: false });
  label(g, '무기고 · 관계자 외 출입 금지', 1.3, 0.16, 0, H + 0.12, zb + 0.22, '#b71c1c', '#ffffff');
}

/**
 * 폭발물 X-ray 판독대 (2 × 1): a desk with the portable X-ray's screen showing a parcel's film (wires and a battery in grey), the laptop,
 * the reading log; the folded generator and the film panel on the floor beside it.
 */
function swatXrayDesk(g: THREE.Group, W: number, D: number) {
  const h = 0.74;
  const z = -D / 2 + 0.35;
  part(g, rbox(W - 0.08, 0.04, 0.6, 0.01), '#cfd8dc', 0, h, z);
  for (const sx of [-1, 1]) part(g, box(0.05, h, 0.55), '#78909c', sx * (W / 2 - 0.1), h / 2, z, { outline: false });
  // The screen with the film.
  const tex = painted('swatXray', 256, 160, (c) => {
    c.fillStyle = '#10161a';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#5f6f78';
    c.fillRect(48, 34, 160, 96);
    c.fillStyle = '#c9d4da';
    c.fillRect(70, 60, 38, 50);
    c.strokeStyle = '#e8eef1';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(108, 70);
    c.bezierCurveTo(140, 40, 150, 120, 180, 84);
    c.moveTo(108, 96);
    c.bezierCurveTo(130, 120, 160, 60, 186, 110);
    c.stroke();
    c.fillStyle = '#ffd54f';
    c.font = `bold 16px ${FONT}`;
    c.fillText('X-RAY 판독', 8, 20);
  });
  part(g, box(0.62, 0.42, 0.04), '#263238', -0.3, h + 0.32, z - 0.18);
  sheet(g, tex, 0.56, 0.36, -0.3, h + 0.32, z - 0.155);
  part(g, box(0.05, 0.12, 0.05), '#263238', -0.3, h + 0.06, z - 0.18, { outline: false });
  // The laptop and the reading log.
  part(g, box(0.34, 0.02, 0.24), '#37474f', 0.35, h + 0.03, z + 0.05);
  part(g, box(0.34, 0.22, 0.02), '#37474f', 0.35, h + 0.14, z - 0.07, { rx: -0.2 });
  part(g, box(0.22, 0.01, 0.3), '#fff8e1', -0.3, h + 0.03, z + 0.15, { outline: false });
  // The generator and the film panel on the floor.
  part(g, rbox(0.32, 0.26, 0.22, 0.03), '#f9a825', W / 2 - 0.3, 0.13, D / 2 - 0.2);
  part(g, rbox(0.45, 0.55, 0.05, 0.02), '#b0bec5', -W / 2 + 0.35, 0.3, D / 2 - 0.15, { rx: -0.12 });
}

/**
 * 탐지견 장비 선반 (2 × 1): open shelves, the feed sacks and a bowl below, the training-aid tins (the scents the dogs learn), the
 * harnesses and leads on hooks with each dog's name over its hook, a ball on top.
 */
function swatK9GearShelf(g: THREE.Group, W: number, D: number) {
  const zb = -D / 2 + 0.2;
  const wood = '#8d6e63';
  for (const sx of [-1, 1]) part(g, box(0.04, 1.7, 0.36), wood, sx * (W / 2 - 0.08), 0.85, zb);
  for (const y of [0.1, 0.65, 1.65]) part(g, box(W - 0.16, 0.03, 0.36), tint(wood, 0.1), 0, y, zb, { outline: false });
  part(g, box(W - 0.16, 1.6, 0.02), shade(wood, 0.8), 0, 0.85, zb - 0.17, { outline: false });
  for (const x of [-0.45, 0]) part(g, rbox(0.36, 0.45, 0.24, 0.06), '#d7b98e', x, 0.35, zb + 0.02);
  part(g, cyl(0.1, 0.08, 0.06, 14), '#1565c0', 0.45, 0.15, zb + 0.05);
  for (let i = 0; i < 5; i++) part(g, cyl(0.05, 0.05, 0.1, 12), i % 2 ? '#cfd8dc' : '#90a4ae', -0.6 + i * 0.3, 0.72, zb + 0.04);
  for (let i = 0; i < 3; i++) {
    const x = -0.55 + i * 0.55;
    part(g, rbox(0.26, 0.2, 0.08, 0.04), ['#d32f2f', '#212121', '#ef6c00'][i], x, 1.25, zb + 0.12);
    part(g, ring(0.08, 0.012), '#3e2723', x + 0.12, 1.4, zb + 0.15, { outline: false });
    label(g, ['한결', '바람', '별'][i], 0.22, 0.08, x, 1.55, zb + 0.185, '#ffd54f', SWAT);
  }
  part(g, ball(0.05), '#c0ca33', 0.6, 1.71, zb);
}

/** 철판 표적 (1 × 1): a steel silhouette plate on its stand, painted white, its hits marked in black, a sandbag on the stand's foot. */
function swatSteelTarget(g: THREE.Group, D: number) {
  const z = -D / 2 + 0.3;
  part(g, box(0.06, 0.5, 0.06), '#455a64', 0, 0.25, z, { outline: false });
  part(g, box(0.5, 0.04, 0.3), '#455a64', 0, 0.02, z, { outline: false });
  part(g, rbox(0.42, 0.62, 0.03, 0.08), '#eceff1', 0, 0.85, z + 0.04);
  part(g, ball(0.13), '#eceff1', 0, 1.3, z + 0.04).scale.set(1, 1.1, 0.2);
  for (const [x, y] of [[-0.06, 0.95], [0.08, 0.8], [0.02, 1.3]]) part(g, cyl(0.025, 0.025, 0.01, 10), BLACK, x, y, z + 0.06, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.34, 0.12, 0.2, 0.05), '#a1887f', 0.12, 0.06, z + 0.2);
}

/** The fence's mesh, seen through. */
const FENCE_MESH = new THREE.MeshToonMaterial({ color: '#90a4ae', transparent: true, opacity: 0.4, depthWrite: false });

/**
 * The compound's fence and gate, on the yard's south-east corner tile (24, 14), the rest drawn from there: a 2.4 m mesh fence topped
 * with barbed wire along the street behind the kennels, the gateway (x 18..21) left open with its sliding gate run back behind the
 * fence, the gateposts with the unit's name and the warning; past the guard post the fence to the lot's end.
 */
function swatCompoundFence(g: THREE.Group) {
  const H = 2.4;
  const run = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(-(z1 - z0), x1 - x0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    part(g, box(len, H - 0.1, 0.02), '#90a4ae', mx, H / 2, mz, { ry, outline: false, material: FENCE_MESH });
    part(g, box(len, 0.05, 0.05), '#607d8b', mx, H, mz, { ry, outline: false });
    part(g, box(len, 0.05, 0.05), '#607d8b', mx, 0.08, mz, { ry, outline: false });
    const n = Math.max(1, Math.round(len));
    for (let k = 0; k <= n; k++) part(g, box(0.06, H + 0.35, 0.06), '#546e7a', x0 + ((x1 - x0) * k) / n, (H + 0.35) / 2, z0 + ((z1 - z0) * k) / n, { outline: false });
    for (const dy of [0.12, 0.24]) part(g, box(len, 0.015, 0.015), '#37474f', mx, H + dy, mz, { ry, outline: false });
  };
  const z = 0.5;
  run(-9.5, z, -6.5, z);
  run(-0.5, z, 1.5, z);
  for (const x of [-6.5, -2.5]) part(g, rbox(0.35, 2.8, 0.35, 0.04), '#cfd8dc', x, 1.4, z);
  part(g, box(3.0, 1.9, 0.04), '#78909c', -8.0, 1.0, z - 0.25, { outline: false, material: FENCE_MESH });
  part(g, box(3.0, 0.06, 0.06), '#546e7a', -8.0, 1.95, z - 0.25, { outline: false });
  label(g, '한빛경찰청 경찰특공대', 1.6, 0.3, -6.5, 2.2, z + 0.19, NAVY, '#ffffff');
  label(g, '보안 시설 · 무단 출입 금지', 1.5, 0.22, -2.5, 2.2, z + 0.19, '#b71c1c', '#ffffff');
}

/**
 * The station's car park (poCarPark, 6 × 6; 2026-11-05, the layout audit: the patrol car stood on the grass): flat on the asphalt the lot
 * lays, the yellow bay lines either side of each patrol car's bay and '경찰 차량 전용' painted across the bays' ends. Tile x's centre is
 * x - 2.5 here, tile y's is y - 2.5.
 */
function carPark(g: THREE.Group, W: number, D: number) {
  const S = 48;
  const tex = painted('poCarPark', W * S, D * S, (c) => {
    c.clearRect(0, 0, W * S, D * S);
    c.strokeStyle = '#f2c230';
    c.lineWidth = 5;
    // Each bay two tiles wide, from the building's side to the open end.
    for (const x of [0.15, 2.0, 4.0]) {
      c.beginPath();
      c.moveTo(x * S, 0.4 * S);
      c.lineTo(x * S, 5.0 * S);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(0.15 * S, 0.4 * S);
    c.lineTo(4.0 * S, 0.4 * S);
    c.stroke();
    c.fillStyle = '#f2c230';
    c.font = `bold ${Math.round(S * 0.34)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('경찰 차량 전용', 2.1 * S, 5.5 * S);
  });
  const m = sheet(g, tex, W, D, 0, 0.012, 0, 0, -Math.PI / 2);
  m.renderOrder = 1;
}

/** The station's pole sign on the pavement, the blue lamp on its top (2026-11-05, the layout audit). */
const STATION_SIGN = pavementSign('poStationSign', '🚓', '새솔|경찰서', ['민원실 · 형사과 1층', '112 종합상황실 2층', '24시간 신고 접수'], NAVY, 2.2);
