import * as THREE from 'three';
import { marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox, textured } from '../toon';
import { boardGrip, type HeldTool } from '../handTool';
import * as FS from './firefighterMotion';

/**
 * The fire station drawn as itself (2026-10-26 workplace pipeline, at the user's request): a Korean
 * 119 safety centre. The pumper redone full of what's on one — roll-up lockers, the pump panel, the
 * roof ladder, the hose bed, a cab you can see the driver in — which drives out of its bay on a call
 * and backs in again; the hose racks, the turnout gear racks with their breathing sets, the drill
 * tower with its ladder, smoke room and a casualty manikin; and what the station was missing — the
 * dispatch terminal, the breathing-air compressor, the rescue tool shelf, the duty board and the red
 * bay doors. Each use puts the firefighter where it's done: at the pump panel, at the wheel, up the
 * ladder, down low in the smoke, kneeling to a casualty's chest, pulling the gear on.
 */

const BLACK = '#26282d';
const STEEL = '#b9c1c7';
const CHROME = '#dfe4e8';
const ALU = '#cfd5da';
/** Korean fire-engine red, and its darker trim. */
const RED = '#d4231f';
const DEEP = '#a3161a';
const WHITE = '#f7f7f5';
const YELLOW = '#ffd23f';
/** Turnout gear: tan shell, lime and silver reflective bands; the helmet. */
const TAN = '#c7974a';
const LIME = '#d4e157';
const SILVER = '#e0e6ea';
const HELMET = '#f4c20d';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const STATION = '한빛119안전센터';

/** Lit parts (LEDs, lamps): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

/** Glass you can see the driver through; the smoke in the smoke room. */
const GLASS = new THREE.MeshToonMaterial({ color: '#bfe3f2', transparent: true, opacity: 0.32, depthWrite: false });
const SMOKE = new THREE.MeshToonMaterial({ color: '#8d9196', transparent: true, opacity: 0.38, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));

/** Pictures painted once a key (signs, screens, liveries). */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
/** A painted picture as a lit (toon) surface, shared a key. */
const litMats = new Map<string, THREE.Material>();
function litPaint(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Material {
  let m = litMats.get(key);
  if (!m) litMats.set(key, (m = textured(painted(key, cw, ch, paint))));
  return m;
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
/** A screen with a picture on it that the lot lights while it's used: handed out as `out.screen`. */
function screenOf(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: '#2a3140' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** A spot stood facing `yaw` at (x, z), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}

/** A turned group: its +z the way `ry` turns it, at (x, y, z). */
function group(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  c.rotation.y = ry;
  g.add(c);
  return c;
}

/** A round dial facing +z: white face, black bezel, a red needle (handed back, to swing). */
function gauge(g: THREE.Object3D, x: number, y: number, z: number, r: number): THREE.Group {
  part(g, cyl(r, r, 0.02, 20), '#fafafa', x, y, z, { rx: Math.PI / 2 });
  part(g, ring(r, r * 0.12), BLACK, x, y, z + 0.01, { outline: false });
  for (let i = 0; i < 7; i++) {
    const a = -2.2 + (i / 6) * 4.4;
    part(g, box(0.004, r * 0.22, 0.002), i > 4 ? '#e53935' : '#424242', x + Math.sin(a) * r * 0.72, y + Math.cos(a) * r * 0.72, z + 0.011, { rz: -a, outline: false });
  }
  const n = group(g, x, y, z + 0.013);
  part(n, box(0.006, r * 0.75, 0.003), '#d50000', 0, r * 0.3, 0, { outline: false });
  part(n, cyl(r * 0.1, r * 0.1, 0.006, 10), BLACK, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  n.rotation.z = 0.6;
  return n;
}

/** Roll-up locker shutter slats in brushed aluminium. */
const shutterMat = () =>
  litPaint('alShutter', 64, 128, (x2) => {
    x2.fillStyle = '#d7dce0';
    x2.fillRect(0, 0, 64, 128);
    for (let y = 0; y < 128; y += 8) {
      x2.fillStyle = '#aab2b8';
      x2.fillRect(0, y, 64, 2);
      x2.fillStyle = '#eef1f3';
      x2.fillRect(0, y + 2, 64, 2);
    }
  });

/** Red and yellow chevrons for the back of the truck. */
const chevronTex = () =>
  painted('chevron', 256, 64, (x2) => {
    x2.fillStyle = YELLOW;
    x2.fillRect(0, 0, 256, 64);
    x2.fillStyle = '#e53935';
    for (let i = -2; i < 12; i++) {
      x2.beginPath();
      x2.moveTo(i * 32, 64);
      x2.lineTo(i * 32 + 16, 64);
      x2.lineTo(i * 32 + 48, 0);
      x2.lineTo(i * 32 + 32, 0);
      x2.fill();
    }
  });

/** Yellow and black hazard stripes. */
const hazardTex = (n: number) =>
  painted(`hazard${n}`, 128 * n, 32, (x2) => {
    x2.fillStyle = YELLOW;
    x2.fillRect(0, 0, 128 * n, 32);
    x2.fillStyle = '#1b1b1b';
    for (let i = -2; i < 10 * n; i++) {
      x2.beginPath();
      x2.moveTo(i * 16, 32);
      x2.lineTo(i * 16 + 8, 32);
      x2.lineTo(i * 16 + 24, 0);
      x2.lineTo(i * 16 + 16, 0);
      x2.fill();
    }
  });

/** The fire service's round badge: a gold ring, a red ground, 소방 across it. */
const badgeTex = () =>
  painted('ffBadge', 96, 96, (x2) => {
    x2.fillStyle = '#d4a017';
    x2.beginPath();
    x2.arc(48, 48, 46, 0, Math.PI * 2);
    x2.fill();
    x2.fillStyle = '#b71c1c';
    x2.beginPath();
    x2.arc(48, 48, 38, 0, Math.PI * 2);
    x2.fill();
    x2.fillStyle = '#ffeb3b';
    x2.beginPath();
    x2.moveTo(48, 16);
    x2.quadraticCurveTo(66, 38, 54, 54);
    x2.quadraticCurveTo(62, 40, 48, 30);
    x2.quadraticCurveTo(36, 46, 44, 58);
    x2.quadraticCurveTo(28, 44, 48, 16);
    x2.fill();
    x2.fillStyle = '#ffffff';
    x2.font = `bold 20px ${FONT}`;
    x2.textAlign = 'center';
    x2.fillText('소방', 48, 80);
  });

/** A rolled length of hose standing on edge, its face to +z, the coupling in the middle. */
function hoseRoll(g: THREE.Object3D, x: number, y: number, z: number, r: number, color = '#efe9dc', ry = 0): THREE.Group {
  const c = group(g, x, y, z, ry);
  part(c, cyl(r, r, 0.075, 22), color, 0, 0, 0, { rx: Math.PI / 2 });
  for (const k of [0.78, 0.55, 0.33]) part(c, ring(r * k, 0.004), shade(color, 0.72), 0, 0, 0.039, { outline: false });
  part(c, cyl(0.045, 0.045, 0.1, 14), '#c9a227', 0, 0, 0.0, { rx: Math.PI / 2 });
  part(c, ring(0.045, 0.008), '#a8841c', 0, 0, 0.05, { outline: false });
  return c;
}

/** A firefighter's helmet (yellow, a visor folded up, 119 on the front), facing +z. */
function helmet(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const c = group(g, x, y, z, ry);
  part(c, ball(0.13), HELMET, 0, 0.06, 0).scale.set(1, 0.85, 1.12);
  part(c, cyl(0.17, 0.18, 0.02, 22), HELMET, 0, 0.0, -0.01).scale.set(1, 1, 1.15);
  part(c, rbox(0.04, 0.03, 0.26, 0.012), shade(HELMET, 0.85), 0, 0.17, 0);
  const visor = new THREE.Mesh(box(0.22, 0.08, 0.01), GLASS);
  visor.position.set(0, 0.12, 0.13);
  visor.rotation.x = -0.9;
  c.add(visor);
  label(c, '119', 0.08, 0.035, 0, 0.09, 0.143, 'none', DEEP, 0, -0.35);
  part(c, box(0.24, 0.015, 0.005), SILVER, 0, 0.04, 0.142, { outline: false }).rotation.x = -0.2;
}

/**
 * A breathing set (공기호흡기): the cylinder in its harness, the backplate, the gauge on its hose,
 * the mask hung off it; standing up, its back to -z. Hands back the gauge.
 */
function breathingSet(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Object3D {
  const c = group(g, x, y, z, ry);
  part(c, rbox(0.3, 0.6, 0.04, 0.02), BLACK, 0, 0.32, -0.05);
  part(c, cyl(0.085, 0.085, 0.52, 16), '#e8eaec', 0, 0.32, 0.05);
  part(c, ball(0.085), '#e8eaec', 0, 0.58, 0.05).scale.set(1, 0.5, 1);
  part(c, box(0.172, 0.05, 0.172), YELLOW, 0, 0.42, 0.05, { outline: false });
  part(c, cyl(0.03, 0.03, 0.06, 10), CHROME, 0, 0.63, 0.05);
  part(c, cyl(0.02, 0.02, 0.07, 8), BLACK, 0.04, 0.64, 0.05, { rz: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) part(c, rbox(0.05, 0.62, 0.02, 0.01), '#37474f', sx * 0.11, 0.33, 0.14);
  part(c, rbox(0.3, 0.05, 0.03, 0.01), '#37474f', 0, 0.12, 0.14);
  // The pressure gauge on its hose, hung on the shoulder strap.
  rod(c, new THREE.Vector3(0.04, 0.62, 0.05), new THREE.Vector3(0.12, 0.45, 0.17), 0.009, BLACK);
  part(c, cyl(0.03, 0.03, 0.03, 14), BLACK, 0.12, 0.43, 0.17, { rx: Math.PI / 2 });
  part(c, cyl(0.022, 0.022, 0.032, 14), '#f5f5f5', 0.12, 0.43, 0.172, { rx: Math.PI / 2, outline: false });
  // The mask: a clear face on a black seal.
  part(c, ball(0.08), BLACK, -0.06, 0.24, 0.19).scale.set(1, 1.2, 0.5);
  const lens = new THREE.Mesh(ball(0.07), GLASS);
  lens.position.set(-0.06, 0.25, 0.215);
  lens.scale.set(1, 1.15, 0.4);
  c.add(lens);
  part(c, cyl(0.025, 0.03, 0.04, 12), '#455a64', -0.06, 0.17, 0.23, { rx: Math.PI / 2 });
  return marker(c, 0.12, 0.43, 0.2);
}

/** An office chair with five feet, its seat `h` up, facing +z. */
function officeChair(c: THREE.Object3D, h: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, BLACK);
  }
  part(c, cyl(0.024, 0.024, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, h + 0.02, 0);
  part(c, rbox(0.42, 0.5, 0.06, 0.04), color, 0, h + 0.35, -0.21, { rx: -0.08 });
}

/** The call-out slip on the dispatch screen: the address, what's burning, which trucks go. */
const dispatchTex = () =>
  painted('ffDispatch', 192, 112, (x2) => {
    x2.fillStyle = '#fbf7ee';
    x2.fillRect(0, 0, 192, 112);
    x2.fillStyle = '#c62828';
    x2.fillRect(0, 0, 192, 18);
    x2.fillStyle = '#fff';
    x2.font = `bold 12px ${FONT}`;
    x2.fillText('🚨 119 출동 지령서', 6, 13);
    x2.font = `10px ${FONT}`;
    const rows: Array<[string, string]> = [['유형', '화재 - 주택'], ['주소', '한빛로 27 (3층)'], ['신고', '23:41 연기 다량'], ['출동', '펌프1 · 탱크1 · 구급1']];
    rows.forEach(([k, v], i) => {
      x2.fillStyle = '#90a4ae';
      x2.fillText(k, 6, 34 + i * 16);
      x2.fillStyle = i === 0 ? '#c62828' : '#263238';
      x2.fillText(v, 40, 34 + i * 16);
    });
    x2.fillStyle = '#2e7d32';
    x2.fillRect(126, 92, 60, 15);
    x2.fillStyle = '#fff';
    x2.fillText('출동 확인', 132, 103);
  });

/** The district map with the fire and the trucks' route. */
const routeTex = () =>
  painted('ffRoute', 192, 112, (x2) => {
    x2.fillStyle = '#e8ecdf';
    x2.fillRect(0, 0, 192, 112);
    x2.strokeStyle = '#ffffff';
    x2.lineWidth = 6;
    for (const x of [26, 90, 150]) {
      x2.beginPath();
      x2.moveTo(x, 0);
      x2.lineTo(x + 10, 112);
      x2.stroke();
    }
    for (const y of [30, 76]) {
      x2.beginPath();
      x2.moveTo(0, y);
      x2.lineTo(192, y - 6);
      x2.stroke();
    }
    x2.fillStyle = '#a5d6a7';
    x2.fillRect(100, 38, 40, 26);
    x2.strokeStyle = '#1e88e5';
    x2.lineWidth = 3;
    x2.beginPath();
    x2.moveTo(30, 96);
    x2.lineTo(34, 30);
    x2.lineTo(152, 22);
    x2.stroke();
    x2.fillStyle = '#1e88e5';
    x2.fillRect(24, 92, 14, 10);
    x2.fillStyle = '#ff5722';
    x2.beginPath();
    x2.arc(156, 22, 9, 0, Math.PI * 2);
    x2.fill();
    x2.fillStyle = '#ffeb3b';
    x2.beginPath();
    x2.arc(156, 22, 4, 0, Math.PI * 2);
    x2.fill();
  });

// =============================================================================================
// What the inspection board draws with (firefighterMotion.ts has the script).

const NO = { outline: false };
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** An extinguisher: the cylinder down from its handle, gauge, pin and a hose to a nozzle; the handle at the group's origin when `carried`. */
function extinguisherBody(p: THREE.Object3D, y0: number, color: string, tag: string) {
  const H = 0.36;
  part(p, cyl(0.07, 0.075, H, 18), color, 0, y0 + H / 2, 0, NO);
  part(p, cyl(0.07, 0.074, 0.02, 18), BLACK, 0, y0 + 0.01, 0, NO);
  part(p, ball(0.07), color, 0, y0 + H, 0, NO).scale.y = 0.5;
  part(p, cyl(0.024, 0.03, 0.05, 12), BLACK, 0, y0 + H + 0.05, 0, NO);
  part(p, box(0.11, 0.09, 0.002), '#fafafa', 0, y0 + H * 0.5, 0.0745, NO);
  label(p, tag, 0.1, 0.05, 0, y0 + H * 0.5, 0.0765, '#fafafa', '#b71c1c');
}
/** A hose between two points, stretched each frame. */
function liveHose(p: THREE.Object3D, color: string) {
  const m = part(p, cyl(0.009, 0.009, 1, 8), color, 0, 0, 0, NO);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  return (from: readonly number[], to: readonly number[]) => {
    a.set(from[0], from[1], from[2]);
    b.set(to[0], to[1], to[2]);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    b.sub(a);
    m.scale.y = Math.max(0.01, b.length());
    m.quaternion.setFromUnitVectors(up, b.normalize());
  };
}
const posedOf = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): Spot | null {
  let best: Spot | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedOf(s)) < 0.6 && (!best || posedOf(s) > posedOf(best))) best = s;
  return best;
}
const putAt = (o: THREE.Object3D, p: FS.P) => o.position.set(p[0], p[1], p[2]);

// =============================================================================================
// The engine bay's open front (2026-11-04, the vehicles' way out; the 119 안전센터's garage too: paramedic.ts).

const BRICK = '#a4493a';
const HEADER_Y = 2.72;

/**
 * A garage wall as a piece, where the bay meets the open lot (a wall between two outdoor areas isn't drawn): brick, its coping, along
 * the piece's long side and set to its inner face (`inner`: +1 the +x/+z side, -1 the other), so what stands against it still does.
 */
export function bayWall(g: THREE.Group, W: number, D: number, inner: 1 | -1, h = 3.0) {
  const alongX = W >= D;
  const len = alongX ? W : D;
  const off = inner * ((alongX ? D : W) / 2 - 0.13);
  const at = (u: number, y: number, size: [number, number, number], c: string) =>
    part(g, alongX ? box(size[0], size[1], size[2]) : box(size[2], size[1], size[0]), c, alongX ? u : off, y, alongX ? off : u);
  at(0, h / 2, [len, h, 0.24], BRICK);
  at(0, h - 0.04, [len + 0.02, 0.08, 0.3], '#8d3b2f');
  at(0, 0.08, [len + 0.01, 0.16, 0.26], '#6d6f73');
}

/**
 * A garage's open front: the piers, the header over the openings at 2.7 m (the floor above sits on it), and in each opening the
 * shutter rolled up into its box, its yellow-and-black guides down the piers, the signal lamp green; the station's name on the
 * header; the threshold's hazard line and the 정차 금지 box on the apron in front of each opening. In lot x from the anchor tile's
 * (x0, 14): the opening line is the tile's north edge.
 */
export function bayFront(g: THREE.Group, x0: number, piers: number[], openings: Array<[number, number]>, sign: string) {
  const at = (x: number) => x - (x0 + 0.5);
  const Z = -0.5;
  const left = Math.min(...piers);
  const right = Math.max(...piers);
  part(g, box(right - left + 0.4, 0.3, 0.42), '#d7d2c8', at((left + right) / 2), HEADER_Y + 0.15, Z + 0.05);
  label(g, sign, Math.min(3.2, (right - left) * 0.4), 0.26, at((left + right) / 2), HEADER_Y + 0.15, Z + 0.265, 'none', RED);
  for (const x of piers) part(g, box(0.4, HEADER_Y, 0.42), '#d7d2c8', at(x), HEADER_Y / 2, Z + 0.05);
  for (const [a, b] of openings) {
    const mid = at((a + b) / 2);
    const w = b - a;
    // The shutter rolled up: its box under the header inside, the bottom slat showing, the guides down each side.
    part(g, cyl(0.2, 0.2, w - 0.1, 16), '#5b6068', mid, HEADER_Y - 0.2, Z - 0.22, { rz: Math.PI / 2 });
    part(g, box(w - 0.12, 0.12, 0.04), RED, mid, HEADER_Y - 0.44, Z - 0.05);
    part(g, box(w - 0.12, 0.03, 0.05), '#7f1414', mid, HEADER_Y - 0.5, Z - 0.05, { outline: false });
    for (const x of [a + 0.06, b - 0.06]) {
      part(g, box(0.09, HEADER_Y - 0.05, 0.08), '#5b6068', at(x), (HEADER_Y - 0.05) / 2, Z - 0.05);
      for (let i = 0; i < 5; i++) part(g, box(0.095, 0.2, 0.085), i % 2 ? BLACK : YELLOW, at(x), 0.15 + i * 0.4, Z - 0.05, { outline: false });
    }
    part(g, rbox(0.22, 0.1, 0.06, 0.02), BLACK, at(b) - 0.3, HEADER_Y + 0.15, Z + 0.29);
    part(g, ball(0.03), '#00e676', at(b) - 0.36, HEADER_Y + 0.15, Z + 0.32, { material: glow('#69f0ae'), outline: false });
    part(g, ball(0.03), '#5a1d1d', at(b) - 0.24, HEADER_Y + 0.15, Z + 0.32, { outline: false });
    // The threshold line, the box on the apron (2 m out) that nothing may stand in.
    part(g, box(w, 0.004, 0.1), YELLOW, mid, 0.012, Z + 0.05, { outline: false });
    for (const x of [a + 0.15, b - 0.15]) part(g, box(0.1, 0.004, 2.2), YELLOW, at(x), 0.012, Z + 1.2, { outline: false });
    part(g, box(w - 0.3, 0.004, 0.1), YELLOW, mid, 0.012, Z + 2.3, { outline: false });
    label(g, '정차 금지', Math.min(1.6, w * 0.5), 0.45, mid, 0.014, Z + 1.3, 'none', YELLOW, 0, -Math.PI / 2);
  }
}

export const BUILDERS: Record<string, Builder> = {
  /** The bay's walls on the lot's edge, the wall beside the openings (2026-11-04, the vehicles' way out). */
  ffBayWallSide(g, W, D) {
    bayWall(g, W, D, 1);
  },
  ffBayWallBack(g, W, D) {
    bayWall(g, W, D, 1);
  },
  ffBayWallFront(g, W, D) {
    bayWall(g, W, D, -1);
  },
  /**
   * The engine bay's open front: the two openings in front of the pumpers, their shutters rolled up (they pull straight out onto the
   * street), the piers between, the station's name on the header.
   */
  /**
   * The yard's 훈련탑 (2026-11-05, the layout audit; before, a drill frame stood in a room indoors): a concrete tower of three floors
   * and a roof, open window bays on its yard face to climb in at, a steel ladder up its side, a rail round its roof, a red band with
   * 훈련탑, and hoses hung from a beam at its top to dry. The drill rig (fireDrill) stands at its foot.
   */
  ffDrillTower(g, W, D) {
    const CON = '#bdb6aa';
    const H = 9.2;
    const w = W - 0.4;
    const d = D - 0.4;
    part(g, box(w, H, d), CON, 0, H / 2, -0.1);
    part(g, box(w + 0.1, 0.12, d + 0.1), '#9e978b', 0, H + 0.06, -0.1);
    part(g, box(w + 0.04, 0.45, d + 0.04), RED, 0, H - 0.5, -0.1);
    label(g, '훈련탑', 1.2, 0.36, 0, H - 0.5, -0.1 + d / 2 + 0.03, 'none', WHITE);
    // Each floor's slab line and its window bays on the yard face, dark inside.
    for (let f = 0; f < 3; f++) {
      const y = 0.4 + f * 2.8;
      part(g, box(w + 0.06, 0.14, d + 0.06), '#a8a194', 0, y + 2.7, -0.1);
      for (const sx of [-1, 1]) {
        part(g, box(0.8, 1.4, 0.06), '#3a3c40', sx * 0.6, y + 1.2, -0.1 + d / 2 + 0.005, { outline: false });
        part(g, box(0.9, 0.08, 0.14), '#9e978b', sx * 0.6, y + 0.48, -0.1 + d / 2 + 0.05);
      }
    }
    // The ladder up the east side, its cage at the top half; the rail round the roof.
    const lx = w / 2 + 0.18;
    for (const z of [-0.25, 0.25]) part(g, box(0.05, H + 0.9, 0.05), STEEL, lx, (H + 0.9) / 2, z);
    for (let i = 0; i < Math.floor(H / 0.3); i++) part(g, box(0.04, 0.03, 0.5), STEEL, lx, 0.3 + i * 0.3, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(g, ring(0.34, 0.015, Math.PI), STEEL, lx + 0.02, H / 2 + i * 0.8, 0, { ry: Math.PI / 2, rz: 0, outline: false });
    for (const [x, z, len, along] of [[0, -0.1 - d / 2, w, true], [0, -0.1 + d / 2, w, true], [-w / 2, -0.1, d, false], [w / 2, -0.1, d, false]] as const) {
      part(g, along ? box(len, 0.04, 0.04) : box(0.04, 0.04, len), STEEL, x, H + 0.95, z, { outline: false });
      for (let k = 0; k <= 4; k++) part(g, box(0.04, 0.95, 0.04), STEEL, along ? -len / 2 + (k * len) / 4 : x, H + 0.5, along ? z : -0.1 - len / 2 + (k * len) / 4, { outline: false });
    }
    // The hose beam out over the back, three hoses hung down to dry.
    const back = -0.1 - d / 2;
    part(g, box(0.1, 0.1, 0.7), STEEL, 0.3, H - 1.2, back - 0.3);
    for (let i = 0; i < 3; i++) part(g, box(0.07, 5.2, 0.02), i === 1 ? '#e8e2d0' : '#f0ece0', 0.05 + i * 0.25, H - 1.25 - 2.6, back - 0.28, { outline: false });
  },
  ffBayFront(g) {
    bayFront(g, 2, [2.2, 6.0, 9.8], [[2.4, 5.8], [6.2, 9.6]], STATION);
    // The walk-in doorway at the path between the two lengths of front wall, its lintel.
    part(g, box(1.0, 0.8, 0.24), BRICK, 12.5 - 2.5, 2.6, -0.5 + 0.13);
  },
  /**
   * A Korean pumper (펌프차): fire-engine red, a cab-over cab with glass all round (the driver seen
   * at the wheel, the passenger seat beside), the light bar and siren on its roof, '119' over the
   * windscreen and on the doors with the fire service's badge, a white band down its sides; three
   * aluminium roll-up lockers a side (the back right one the pump panel, rolled up while it's checked
   * — dials, valves, outlets), the station's name over them, an extension ladder and the black
   * suction hose on the roof, the hose bed at the back with its chevrons. It stands in its painted
   * bay with the exhaust hose clipped to it. On a call it pulls out with its lights going and is gone;
   * coming back it reverses in. Checked over at the pump panel; route practice sat at the wheel; the
   * incident plan run stood at its nose.
   */
  fireTruck(g, W, D, _c, _def, _ctx, out) {
    const truck = new THREE.Group();
    g.add(truck);
    const L = Math.min(D + 0.5, 3.6);
    const Wd = Math.min(W - 0.14, 1.86);
    const hw = Wd / 2;
    const zf = L / 2;
    const zb = -L / 2;
    const cab0 = zf - 1.02;
    const top = 1.98;
    // The bay floor: yellow lines round it and the truck's name, seen when it's out.
    const fy = 0.004;
    for (const sx of [-1, 1]) part(g, box(0.06, 0.004, D - 0.1), YELLOW, sx * (W / 2 - 0.05), fy, 0, { outline: false });
    part(g, box(W - 0.1, 0.004, 0.06), YELLOW, 0, fy, -D / 2 + 0.05, { outline: false });
    label(g, '펌프차', 0.9, 0.3, 0, fy + 0.002, 0.3, 'none', YELLOW, 0, -Math.PI / 2);
    label(g, '주차금지', 0.6, 0.18, 0, fy + 0.002, -0.4, 'none', '#ffeb3b', 0, -Math.PI / 2, false);
    // Chassis and wheels: one axle under the cab, two at the back.
    part(truck, rbox(Wd - 0.4, 0.2, L - 0.3, 0.03), BLACK, 0, 0.46, 0);
    const wheels: number[] = [zf - 0.62, zb + 1.05, zb + 0.55];
    for (const wz of wheels)
      for (const sx of [-1, 1]) {
        const x = sx * (hw - 0.14);
        part(truck, cyl(0.36, 0.36, 0.27, 22), BLACK, x, 0.36, wz, { rz: Math.PI / 2 });
        part(truck, cyl(0.21, 0.21, 0.275, 18), STEEL, x, 0.36, wz, { rz: Math.PI / 2, outline: false });
        part(truck, cyl(0.07, 0.07, 0.29, 10), shade(STEEL, 0.6), x, 0.36, wz, { rz: Math.PI / 2, outline: false });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          part(truck, cyl(0.015, 0.015, 0.29, 6), '#8a9298', x, 0.36 + Math.sin(a) * 0.13, wz + Math.cos(a) * 0.13, { rz: Math.PI / 2, outline: false });
        }
        // Mudguards over them.
        part(truck, rbox(0.3, 0.04, 0.82, 0.015), BLACK, sx * (hw - 0.12), 0.76, wz, { outline: false });
      }
    // The body behind the cab: the lockers' box.
    const bodyLen = cab0 - 0.04 - zb;
    const bodyZ = (cab0 - 0.04 + zb) / 2;
    // A core narrower than the truck (the lockers are let into its sides), the skin over and under them.
    part(truck, rbox(Wd - 0.24, top - 0.55, bodyLen, 0.04), RED, 0, (top + 0.55) / 2, bodyZ);
    part(truck, rbox(Wd, 0.27, bodyLen, 0.03), RED, 0, 0.685, bodyZ);
    part(truck, rbox(Wd, 0.16, bodyLen, 0.03), RED, 0, top - 0.08, bodyZ);
    part(truck, rbox(Wd + 0.02, 0.05, bodyLen + 0.02, 0.015), DEEP, 0, top, bodyZ);
    // The cab: a solid lower half (doors and dash), glass above, a red roof.
    const cabLen = zf - cab0;
    const cabZ = (zf + cab0) / 2;
    part(truck, rbox(Wd, 0.78, cabLen, 0.06), RED, 0, 0.94, cabZ);
    part(truck, rbox(Wd, 0.12, cabLen, 0.04), RED, 0, 2.32, cabZ);
    part(truck, rbox(Wd - 0.04, 0.96, 0.05, 0.02), RED, 0, 1.8, cab0 + 0.03);
    for (const sx of [-1, 1])
      for (const z of [zf - 0.05, cab0 + 0.06]) part(truck, rbox(0.06, 0.96, 0.07, 0.02), RED, sx * (hw - 0.03), 1.8, z);
    // The windscreen and side windows, and the seats, dash and wheel behind them.
    const wind = new THREE.Mesh(box(Wd - 0.12, 0.9, 0.02), GLASS);
    wind.position.set(0, 1.8, zf - 0.04);
    wind.rotation.x = -0.05;
    truck.add(wind);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(box(0.02, 0.88, cabLen - 0.14), GLASS);
      side.position.set(sx * (hw - 0.01), 1.79, cabZ);
      truck.add(side);
    }
    part(truck, rbox(Wd - 0.1, 0.14, 0.24, 0.03), '#37474f', 0, 1.38, zf - 0.17);
    for (const sx of [-1, 1]) {
      part(truck, rbox(0.42, 0.07, 0.42, 0.03), '#263238', sx * 0.45, 1.28, cab0 + 0.36);
      part(truck, rbox(0.42, 0.62, 0.08, 0.04), '#263238', sx * 0.45, 1.62, cab0 + 0.12, { rx: -0.1 });
      part(truck, rbox(0.24, 0.14, 0.06, 0.03), '#263238', sx * 0.45, 2.02, cab0 + 0.1);
    }
    // Korea drives on the right: the wheel's on the left (+x, facing the front).
    const dx = 0.45;
    const wheel = group(truck, dx, 1.62, zf - 0.32);
    wheel.rotation.x = -0.55;
    part(wheel, ring(0.17, 0.018), BLACK, 0, 0, 0, { outline: false });
    part(wheel, cyl(0.045, 0.045, 0.04, 12), BLACK, 0, 0, 0, { rx: Math.PI / 2 });
    for (const a of [Math.PI / 2, Math.PI * 1.2, -0.2]) part(wheel, box(0.012, 0.15, 0.012), BLACK, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0, { rz: a + Math.PI / 2, outline: false });
    rod(truck, new THREE.Vector3(dx, 1.55, zf - 0.22), new THREE.Vector3(dx, 1.42, zf - 0.12), 0.025, BLACK);
    const hub = marker(wheel, 0, 0, 0);
    // A radio handset and a tablet mount on the dash.
    part(truck, rbox(0.2, 0.12, 0.02, 0.01), BLACK, -0.1, 1.55, zf - 0.12, { rx: -0.4 });
    part(truck, box(0.17, 0.09, 0.004), '#90caf9', -0.1, 1.555, zf - 0.11, { rx: -0.4, outline: false, material: glow('#90caf9') });
    // The front: a black grille with 119 on it, headlights, the bumper and the plate.
    part(truck, rbox(Wd - 0.5, 0.3, 0.03, 0.01), '#2b2d33', 0, 0.98, zf + 0.005);
    for (let i = 0; i < 4; i++) part(truck, box(Wd - 0.56, 0.015, 0.01), '#5b6068', 0, 0.88 + i * 0.065, zf + 0.022, { outline: false });
    label(truck, '119', 0.36, 0.14, 0, 0.98, zf + 0.03, 'none', WHITE);
    sheet(truck, badgeTex(), 0.24, 0.24, 0, 1.27, zf + 0.01);
    for (const sx of [-1, 1]) {
      part(truck, rbox(0.24, 0.12, 0.04, 0.02), '#fffde7', sx * (hw - 0.2), 0.78, zf + 0.01, { material: glow('#fffde7') });
      part(truck, rbox(0.1, 0.07, 0.03, 0.015), '#ffb300', sx * (hw - 0.07), 0.78, zf + 0.01, { material: glow('#ffca28') });
    }
    part(truck, rbox(Wd + 0.04, 0.2, 0.14, 0.03), '#9ea7ae', 0, 0.56, zf + 0.05);
    label(truck, '99소 1190', 0.42, 0.1, 0, 0.56, zf + 0.125, '#ffffff', '#111111');
    // Over the windscreen: 119 on a white strip; the light bar and siren on the roof.
    part(truck, box(Wd - 0.2, 0.1, 0.01), WHITE, 0, 2.32, zf + 0.005, { outline: false });
    label(truck, '119 화재진압', 0.8, 0.09, 0, 2.32, zf + 0.012, 'none', DEEP);
    const ly = 2.42;
    part(truck, rbox(Wd - 0.3, 0.06, 0.28, 0.02), BLACK, 0, ly, zf - 0.25);
    const lights = new THREE.Group();
    truck.add(lights);
    const off = new THREE.Group();
    truck.add(off);
    const lamps: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const x = -0.6 + i * 0.24;
      const col = i === 2 || i === 3 ? WHITE : '#ff3b30';
      part(off, rbox(0.2, 0.08, 0.22, 0.03), i === 2 || i === 3 ? '#dfe3e6' : '#c62828', x, ly + 0.07, zf - 0.25);
      lamps.push(part(lights, rbox(0.2, 0.08, 0.22, 0.03), col, x, ly + 0.07, zf - 0.25, { material: glow(col === WHITE ? '#ffffff' : '#ff5252') }));
    }
    lights.visible = false;
    part(truck, rbox(0.22, 0.14, 0.16, 0.03), BLACK, -0.55, ly + 0.02, zf - 0.6);
    part(truck, cyl(0.05, 0.07, 0.02, 12), '#455a64', -0.55, ly + 0.02, zf - 0.51, { rx: Math.PI / 2, outline: false });
    // Mirrors on arms.
    for (const sx of [-1, 1]) {
      rod(truck, new THREE.Vector3(sx * hw, 1.5, zf - 0.08), new THREE.Vector3(sx * (hw + 0.17), 1.62, zf - 0.02), 0.012, BLACK);
      part(truck, rbox(0.06, 0.3, 0.14, 0.02), BLACK, sx * (hw + 0.18), 1.75, zf - 0.02);
    }
    // The sides: the white band, the doors with 119 and the badge, three lockers, the name over them.
    const lockers: Array<[number, number]> = [];
    const lockLen = (bodyLen - 0.2) / 3;
    for (let i = 0; i < 3; i++) lockers.push([zb + 0.08 + lockLen * (i + 0.5) + 0.02 * i, lockLen - 0.04]);
    let pumpWork: THREE.Object3D = hub;
    const needles: THREE.Object3D[] = [];
    let pumpShut: THREE.Object3D | undefined;
    let pumpRolled: THREE.Object3D | undefined;
    for (const s of [-1, 1]) {
      const sd = group(truck, s * hw, 0, 0, (s * Math.PI) / 2);
      const lx = (z: number) => -s * z;
      // The band along the whole length, a yellow pinstripe over it.
      part(sd, box(L - 0.1, 0.11, 0.006), WHITE, lx((zf + zb) / 2), 0.67, 0.004, { outline: false });
      part(sd, box(L - 0.1, 0.025, 0.006), YELLOW, lx((zf + zb) / 2), 0.745, 0.004, { outline: false });
      // The cab door: its seam, handle, a step below; 119 and the badge on it.
      const dz = cabZ - 0.04;
      part(sd, box(0.008, 0.72, 0.008), DEEP, lx(cab0 + 0.12), 1.3, 0.005, { outline: false });
      part(sd, rbox(0.12, 0.03, 0.03, 0.01), CHROME, lx(cab0 + 0.22), 1.22, 0.02, { outline: false });
      part(sd, rbox(0.4, 0.04, 0.14, 0.01), '#9ea7ae', lx(dz), 0.55, 0.05);
      label(sd, '119', 0.36, 0.18, lx(dz + 0.04), 1.02, 0.008, 'none', WHITE);
      sheet(sd, badgeTex(), 0.16, 0.16, lx(dz + 0.04), 1.2, 0.008);
      // The lockers.
      lockers.forEach(([lz, len], i) => {
        const pump = s === 1 && i === 0;
        const y0 = 0.82;
        const y1 = top - 0.16;
        const h = y1 - y0;
        // The recess behind every shutter (seen only where one's rolled up).
        part(sd, box(len - 0.04, h, 0.01), '#4a4f55', lx(lz), y0 + h / 2, -0.115, { outline: false });
        for (const e of [-1, 1]) part(sd, box(0.06, h, 0.12), RED, lx(lz) + e * (len / 2 + 0.015), y0 + h / 2, -0.06, { outline: false });
        part(sd, rbox(len + 0.02, 0.03, 0.04, 0.01), CHROME, lx(lz), y1 + 0.02, 0.012, { outline: false });
        for (const e of [-1, 1]) part(sd, box(0.025, h, 0.02), CHROME, lx(lz) + e * (len / 2), y0 + h / 2, 0.01, { outline: false });
        const shut = new THREE.Group();
        sd.add(shut);
        part(shut, box(len - 0.03, h, 0.012), ALU, lx(lz), y0 + h / 2, 0.006, { material: shutterMat(), outline: false });
        part(shut, rbox(len - 0.08, 0.05, 0.03, 0.01), shade(ALU, 0.75), lx(lz), y0 + 0.05, 0.02, { outline: false });
        if (!pump) return;
        // The pump panel inside: steel plate, two big dials and two small, four valve handles, outlets.
        const p = group(sd, lx(lz), y0, -0.105);
        part(p, box(len - 0.06, h - 0.04, 0.01), '#9aa3ab', 0, h / 2, 0, { outline: false });
        label(p, '방수 압력', 0.3, 0.06, 0, h - 0.1, 0.008, '#263238', WHITE);
        needles.push(gauge(p, -0.13, h - 0.3, 0.008, 0.075), gauge(p, 0.13, h - 0.3, 0.008, 0.075));
        needles.push(gauge(p, -0.2, h - 0.5, 0.008, 0.035), gauge(p, 0.2, h - 0.5, 0.008, 0.035));
        ['#e53935', '#1e88e5', '#fdd835', '#43a047'].forEach((col, k) => {
          const vx = -0.21 + k * 0.14;
          part(p, cyl(0.02, 0.02, 0.05, 10), CHROME, vx, 0.32, 0.03, { rx: Math.PI / 2, outline: false });
          part(p, rbox(0.035, 0.12, 0.025, 0.01), col, vx, 0.37, 0.06);
        });
        for (const vx of [-0.15, 0.15]) {
          part(p, cyl(0.055, 0.055, 0.08, 14), '#c9a227', vx, 0.14, 0.04, { rx: Math.PI / 2 });
          part(p, cyl(0.06, 0.06, 0.012, 14), '#e53935', vx, 0.14, 0.085, { rx: Math.PI / 2, outline: false });
        }
        part(p, box(len - 0.12, 0.02, 0.004), '#fff8e1', 0, h - 0.03, 0.01, { outline: false, material: glow('#fff8e1') });
        pumpWork = marker(p, 0, h - 0.35, 0.05);
        pumpShut = shut;
        // Rolled up into its drum at the top while the panel's in use.
        const rolled = new THREE.Group();
        sd.add(rolled);
        part(rolled, cyl(0.06, 0.06, len - 0.04, 14), ALU, lx(lz), y1 - 0.04, 0.05, { rz: Math.PI / 2 });
        pumpRolled = rolled;
      });
      // End caps over the gaps fore and aft of the lockers.
      part(sd, box(0.12, top - 0.55, 0.12), RED, lx(zb + 0.06), (top + 0.55) / 2, -0.06, { outline: false });
      part(sd, box(0.1, top - 0.55, 0.12), RED, lx(cab0 - 0.09), (top + 0.55) / 2, -0.06, { outline: false });
      // The station's name over the lockers.
      label(sd, STATION, 1.3, 0.11, lx(bodyZ), top - 0.08, 0.008, 'none', WHITE);
      // A step and grab rail at the back corner.
      part(sd, rbox(0.3, 0.035, 0.16, 0.01), '#9ea7ae', lx(zb + 0.25), 0.62, 0.07);
    }
    if (pumpShut) out.idle = pumpShut;
    if (pumpRolled) out.inUse = pumpRolled;
    // The back: chevrons, tail lights, the hose bed's flap, a ladder up and the rear step.
    const bk = group(truck, 0, 0, zb, Math.PI);
    sheet(bk, chevronTex(), Wd - 0.1, 0.32, 0, 0.78, 0.006);
    for (const sx of [-1, 1]) {
      part(bk, rbox(0.12, 0.2, 0.03, 0.02), '#d32f2f', sx * (hw - 0.12), 1.05, 0.01, { material: glow('#ff5252') });
      part(bk, rbox(0.12, 0.08, 0.03, 0.02), '#ffb300', sx * (hw - 0.12), 1.21, 0.01);
    }
    part(bk, rbox(Wd - 0.5, 0.6, 0.02, 0.01), shade(RED, 0.9), 0, 1.5, 0.008);
    label(bk, '119', 0.4, 0.2, 0, 1.55, 0.02, 'none', WHITE);
    part(bk, rbox(Wd + 0.02, 0.06, 0.24, 0.02), '#9ea7ae', 0, 0.5, 0.1);
    for (const sx of [-1, 1]) rod(bk, new THREE.Vector3(sx * 0.62, 0.6, 0.03), new THREE.Vector3(sx * 0.62, top + 0.2, 0.03), 0.015, CHROME);
    for (let y = 0.85; y < top; y += 0.28) part(bk, cyl(0.012, 0.012, 0.16, 6), CHROME, 0.62, y, 0.05, { rz: Math.PI / 2, outline: false });
    label(bk, '99소 1190', 0.36, 0.09, 0, 0.62, 0.012, '#ffffff', '#111111');
    // The roof: a deck rail, the hose bed's folds at the back, the ladder and the suction hose.
    for (const sx of [-1, 1]) rod(truck, new THREE.Vector3(sx * (hw - 0.04), top + 0.14, zb + 0.08), new THREE.Vector3(sx * (hw - 0.04), top + 0.14, cab0 - 0.1), 0.012, CHROME);
    for (let i = 0; i < 4; i++) part(truck, rbox(Wd * 0.42, 0.06, 0.12, 0.02), i % 2 ? '#efe9dc' : '#e6dcc4', -0.32, top + 0.06 + (i % 2) * 0.02, zb + 0.2 + i * 0.13);
    const lad = group(truck, 0.42, top + 0.1, (zb + cab0) / 2 + 0.25);
    const ladLen = bodyLen + 0.35;
    for (const sx of [-1, 1]) part(lad, rbox(0.04, 0.05, ladLen, 0.01), ALU, sx * 0.2, 0, 0);
    for (let k = 0; k < Math.floor(ladLen / 0.28); k++) part(lad, cyl(0.014, 0.014, 0.4, 6), ALU, 0, 0, -ladLen / 2 + 0.14 + k * 0.28, { rz: Math.PI / 2, outline: false });
    part(truck, cyl(0.065, 0.065, bodyLen - 0.4, 14), '#1d1e22', -hw + 0.12, top + 0.1, bodyZ, { rx: Math.PI / 2 });
    for (let k = 0; k < 8; k++) part(truck, ring(0.066, 0.008), '#3a3d44', -hw + 0.12, top + 0.1, bodyZ - (bodyLen - 0.5) / 2 + k * ((bodyLen - 0.5) / 7), { outline: false });
    // The exhaust extraction hose from the ceiling, clipped to the tail pipe when it's in; hanging free when it's out.
    const ex = -0.62;
    const pipe = new THREE.Vector3(ex, 0.45, zb - 0.05);
    part(truck, cyl(0.045, 0.045, 0.14, 10), '#5b6068', ex, 0.45, zb + 0.02, { rx: Math.PI / 2 });
    const reel = new THREE.Vector3(ex, 2.92, zb - 0.22);
    part(g, rbox(0.2, 0.1, 0.3, 0.03), '#37474f', reel.x, reel.y, reel.z);
    const clipped = new THREE.Group();
    g.add(clipped);
    const knee = new THREE.Vector3(ex, 1.35, zb - 0.32);
    rod(clipped, reel, knee, 0.06, '#ff7043');
    rod(clipped, knee, pipe.clone().add(new THREE.Vector3(0, 0.05, -0.08)), 0.06, '#ff7043');
    part(clipped, cyl(0.07, 0.07, 0.12, 12), BLACK, pipe.x, pipe.y + 0.02, pipe.z - 0.03, { rx: 1.0 });
    const hanging = new THREE.Group();
    g.add(hanging);
    rod(hanging, reel, new THREE.Vector3(ex, 1.15, zb - 0.24), 0.06, '#ff7043');
    part(hanging, cyl(0.07, 0.07, 0.14, 12), BLACK, ex, 1.08, zb - 0.24);
    hanging.visible = false;
    // Out on a call: lights going, it pulls out of the bay through the open front and onto the street, and is gone; it reverses
    // back in. 8 m takes it from its bay past the lot's edge (2026-11-04, the vehicles' way out: it used to stop at the shutter).
    let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    const PULL = 8;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      let z = 0;
      if (state === 'leaving') {
        const u = Math.min(1, (t - since) / 3);
        z = PULL * u * u;
        if (u >= 1) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, (t - since) / 4.5);
        z = PULL * (1 - u) * (1 - u);
        if (u >= 1) state = 'parked';
      }
      truck.position.z = z;
      truck.visible = state !== 'gone';
      const moving = state === 'leaving' || state === 'back';
      lights.visible = moving;
      off.visible = !moving;
      if (moving) lamps.forEach((m, i) => (m.visible = Math.sin(t * 13 + (i < 3 ? 0 : Math.PI)) > 0));
      clipped.visible = state === 'parked';
      hanging.visible = !clipped.visible;
      // Rolled shut when it goes.
      if (state !== 'parked' && pumpShut && pumpRolled) {
        pumpShut.visible = true;
        pumpRolled.visible = false;
      }
    };
    // The pump's dials swing while it's checked.
    out.animate = (t) => needles.forEach((n, i) => (n.rotation.z = 0.4 - 0.5 * Math.sin(t * 0.7 + i) + 0.04 * Math.sin(t * 9 + i * 2)));
    out.work = pumpWork;
    const drive = spot(truck, 'sit', dx, 1.32, cab0 + 0.4, 0, 0.42);
    drive.work = hub;
    drive.motion = 'steer';
    const board = spot(truck, 'stand', hw + 0.35, 0, cab0 + 0.2, -Math.PI / 2);
    board.motion = 'gesture';
    const command = spot(g, 'stand', -0.5, 0, zf + 0.42, 0);
    command.motion = 'gesture';
    const pump = stoodAt(g, hw + 0.42, lockers[0][0], 'tinker', pumpWork, -Math.PI / 2);
    out.spots = {
      inspectTruck: pump,
      respondFire: board,
      firefighter_routeDrive: drive,
      firefighter_incidentCommand: command,
      '*': pump,
    };
  },

  /**
   * The hose rack: a red steel frame against the wall, three shelves of rolled hoses standing on
   * edge with their brass couplings, nozzles hung on the side, '소방호스' over it. Rolling one up,
   * the firefighter's down low at its front with a roll on the floor (turning as it's rolled) and
   * the flat hose run out behind it.
   */
  hoseRack(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.1;
    const d = 0.42;
    const z = -D / 2 + d / 2 + 0.03;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) part(g, rbox(0.04, 1.9, 0.04, 0.01), DEEP, sx * (w / 2 - 0.02), 0.95, z + sz * (d / 2 - 0.02));
    const shelves = [0.12, 0.62, 1.12];
    for (const y of shelves) {
      part(g, rbox(w, 0.03, d, 0.01), '#8d9399', 0, y, z);
      for (const sz of [-1, 1]) part(g, box(w, 0.04, 0.02), DEEP, 0, y + 0.03, z + sz * (d / 2 - 0.01), { outline: false });
    }
    part(g, rbox(w, 0.03, d, 0.01), DEEP, 0, 1.9, z);
    // Two rolls a shelf, one red-jacketed among the white.
    shelves.forEach((y, i) => {
      for (const k of [-1, 1]) hoseRoll(g, k * 0.2, y + 0.2, z + 0.02, 0.18, i === 1 && k === 1 ? '#c62828' : '#efe9dc', 0.0);
    });
    // Nozzles hung on the right post.
    for (const [y, col] of [[1.55, '#c9a227'], [1.3, BLACK]] as const) {
      part(g, cyl(0.006, 0.006, 0.08, 6), CHROME, w / 2 + 0.02, y + 0.06, z + 0.1, { rz: Math.PI / 2, outline: false });
      part(g, cyl(0.022, 0.04, 0.26, 12), col, w / 2 + 0.05, y - 0.06, z + 0.1);
      part(g, rbox(0.04, 0.05, 0.08, 0.01), '#e53935', w / 2 + 0.05, y + 0.04, z + 0.1);
    }
    part(g, rbox(w - 0.1, 0.13, 0.02, 0.01), RED, 0, 1.72, z + d / 2);
    label(g, '소방호스', w - 0.2, 0.1, 0, 1.72, z + d / 2 + 0.012, RED, WHITE);
    // Being rolled: a roll on the floor in front, the flat hose run out to the front.
    const roll = new THREE.Group();
    g.add(roll);
    const rz = D / 2 + 0.02;
    const r = hoseRoll(roll, 0, 0.17, rz, 0.15, '#efe9dc', Math.PI / 2);
    part(roll, box(0.075, 0.012, 0.8), '#e6dcc4', 0, 0.006, rz + 0.55, { outline: false });
    part(roll, rbox(0.1, 0.05, 0.1, 0.02), '#c9a227', 0, 0.025, rz + 0.95);
    out.inUse = roll;
    out.animate = (t) => (r.rotation.x = -t * 1.6);
    const at = marker(g, 0, 0.3, rz);
    out.work = at;
    out.spots = { '*': stoodAt(g, 0, rz + 0.45, 'tinker', at) };
  },

  /**
   * A turnout gear rack (방화복 보관함), open-fronted grey steel with the owner's name plate: the
   * yellow helmet on the top shelf, the tan coat with lime and silver bands on its hook, the trousers
   * pushed down round the boots on the floor ready to step into, a breathing set in its bracket on the
   * side and a torch. Checked at the breathing set's gauge; for the gear-on drill the firefighter
   * stands in front of it, facing out, and pulls it all on.
   */
  gearLocker(g, W, D, _c, _def, _ctx, out) {
    const h = 2.0;
    const w = W - 0.08;
    const d = 0.5;
    const z = -D / 2 + d / 2 + 0.03;
    const grey = '#7d868c';
    part(g, rbox(w, h, 0.02, 0.008), shade(grey, 0.8), 0, h / 2, z - d / 2 + 0.01);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.03, h, d, 0.008), grey, sx * (w / 2 - 0.015), h / 2, z);
      for (let i = 0; i < 6; i++) part(g, box(0.004, 0.012, d * 0.6), shade(grey, 0.7), sx * (w / 2 + 0.001), 0.4 + i * 0.05, z, { outline: false });
    }
    part(g, rbox(w, 0.03, d, 0.008), grey, 0, h, z);
    part(g, rbox(w - 0.06, 0.025, d - 0.04, 0.006), grey, 0, 1.6, z);
    part(g, rbox(w - 0.06, 0.025, d - 0.04, 0.006), grey, 0, 0.03, z);
    // The name plate.
    part(g, rbox(0.5, 0.1, 0.02, 0.006), WHITE, 0, h - 0.12, z + d / 2);
    label(g, '소방교 유하늘', 0.44, 0.07, 0, h - 0.12, z + d / 2 + 0.012, WHITE, '#263238');
    helmet(g, -0.1, 1.64, z + 0.02);
    // The coat on its hook, its back to the wall: tan, the bands, the collar up, 119 on the chest.
    part(g, cyl(0.012, 0.012, 0.08, 6), CHROME, -0.02, 1.48, z - d / 2 + 0.05, { rx: Math.PI / 2, outline: false });
    const coat = group(g, -0.02, 0, z + 0.02);
    part(coat, rbox(0.46, 0.72, 0.18, 0.07), TAN, 0, 1.08, 0);
    part(coat, rbox(0.3, 0.12, 0.16, 0.05), shade(TAN, 0.9), 0, 1.48, -0.01);
    for (const sx of [-1, 1]) part(coat, rbox(0.12, 0.6, 0.14, 0.05), TAN, sx * 0.25, 1.06, 0.0, { rz: sx * 0.08 });
    for (const y of [0.82, 1.02]) {
      part(coat, box(0.465, 0.05, 0.185), LIME, 0, y, 0, { outline: false });
      part(coat, box(0.467, 0.018, 0.187), SILVER, 0, y, 0, { outline: false });
    }
    part(coat, box(0.02, 0.62, 0.005), shade(TAN, 0.7), 0, 1.06, 0.092, { outline: false });
    label(coat, '119', 0.12, 0.05, 0.12, 1.3, 0.093, 'none', DEEP);
    // Trousers down round the boots on the floor, the braces hanging.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.12, 0.3, 0.14, 0.04), BLACK, sx * 0.09 - 0.02, 0.2, z + 0.06);
      part(g, rbox(0.12, 0.06, 0.24, 0.03), BLACK, sx * 0.09 - 0.02, 0.07, z + 0.1);
      part(g, cyl(0.1, 0.11, 0.16, 14), TAN, sx * 0.09 - 0.02, 0.38, z + 0.06).scale.set(1, 1, 1.1);
      part(g, box(0.2, 0.04, 0.21), LIME, sx * 0.09 - 0.02, 0.34, z + 0.06, { outline: false });
      rod(g, new THREE.Vector3(sx * 0.07 - 0.02, 0.46, z + 0.12), new THREE.Vector3(sx * 0.1 - 0.02, 0.18, z + 0.2), 0.012, '#c62828');
    }
    // The breathing set stood on the floor on the right, a torch on the shelf.
    const gaugeAt = breathingSet(g, w / 2 - 0.16, 0.045, z + 0.0, 0);
    part(g, rbox(0.06, 0.18, 0.06, 0.02), '#ff8f00', -w / 2 + 0.1, 1.705, z + 0.1);
    part(g, cyl(0.03, 0.03, 0.03, 10), '#fffde7', -w / 2 + 0.1, 1.76, z + 0.14, { rx: Math.PI / 2, outline: false });
    out.work = gaugeAt;
    const don = spot(g, 'stand', 0, 0, D / 2 + 0.3, 0);
    don.motion = 'gearUp';
    out.spots = {
      checkGear: stoodAt(g, 0.1, D / 2 + 0.3, 'tinker', gaugeAt),
      firefighter_gearDrill: don,
      '*': stoodAt(g, 0.1, D / 2 + 0.3, 'tinker', gaugeAt),
    };
  },

  /**
   * The drill tower (훈련탑): red steel posts and a grated platform with a railing up near the
   * ceiling, an aluminium ladder up its front, '소방 훈련탑' on it, a coiled rope and a cone; under the
   * platform on the right a smoke room, its doorway hung with black strips and smoke drifting out of
   * it while it's used; a casualty manikin laid on a mat in front. The drill climbs the ladder hand
   * over hand to the platform and back down; the search goes in low at the smoke room's door, one
   * hand on the wall; first aid is chest compressions on the manikin.
   */
  fireDrill(g, W, D, _c, _def, _ctx, out) {
    const zb = -D / 2 + 0.06;
    const zf = 0.3;
    const hx = W / 2 - 0.06;
    const deck = 2.0;
    const postH = 2.95;
    for (const sx of [-1, 1]) for (const z of [zb, zf]) part(g, rbox(0.08, postH, 0.08, 0.015), RED, sx * hx, postH / 2, z);
    part(g, rbox(0.08, postH, 0.08, 0.015), RED, 0, postH / 2, zb);
    // The platform: grating on a red frame, a railing round it.
    part(g, rbox(W - 0.04, 0.08, zf - zb + 0.08, 0.015), DEEP, 0, deck, (zb + zf) / 2);
    part(g, box(W - 0.12, 0.012, zf - zb), '#8d9399', 0, deck + 0.045, (zb + zf) / 2, { outline: false });
    for (const y of [deck + 0.5, postH - 0.04]) {
      part(g, box(W - 0.1, 0.04, 0.04), RED, 0, y, zf);
      part(g, box(W - 0.1, 0.04, 0.04), RED, 0, y, zb);
      for (const sx of [-1, 1]) part(g, box(0.04, 0.04, zf - zb), RED, sx * hx, y, (zb + zf) / 2);
    }
    part(g, rbox(1.0, 0.18, 0.03, 0.01), WHITE, 0.4, deck - 0.16, zf + 0.04);
    label(g, '소방 훈련탑', 0.92, 0.14, 0.4, deck - 0.16, zf + 0.057, WHITE, DEEP);
    // A coil of rope and a cone up on the deck.
    for (let i = 0; i < 4; i++) part(g, ring(0.13 - i * 0.004, 0.018), '#1565c0', 0.6, deck + 0.07 + i * 0.03, -0.1, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.02, 0.13, 0.32, 14), '#ff6d00', 0.15, deck + 0.21, -0.15);
    part(g, cyl(0.07, 0.1, 0.06, 14), WHITE, 0.15, deck + 0.21, -0.15, { outline: false });
    // The smoke room under the right of the platform: dark walls, a doorway half hung with black strips.
    const rx0 = 0.05;
    const rw = hx - rx0;
    const rh = deck - 0.04;
    part(g, rbox(rw, rh, 0.04, 0.01), '#3e3f44', rx0 + rw / 2, rh / 2, zb + 0.02);
    part(g, rbox(0.04, rh, zf - zb, 0.01), '#3e3f44', rx0, rh / 2, (zb + zf) / 2);
    part(g, rbox(0.04, rh, zf - zb, 0.01), '#3e3f44', hx - 0.04, rh / 2, (zb + zf) / 2);
    const doorL = 0.5;
    part(g, rbox(doorL - rx0, rh, 0.04, 0.01), '#4a4b51', (rx0 + doorL) / 2, rh / 2, zf);
    part(g, rbox(hx - doorL, 0.35, 0.04, 0.01), '#4a4b51', (doorL + hx) / 2, rh - 0.175, zf);
    for (let x = doorL + 0.04; x < doorL + 0.2; x += 0.075) part(g, box(0.065, rh - 0.4, 0.008), '#17181b', x, (rh - 0.35) / 2 + 0.05, zf + 0.012, { outline: false });
    label(g, '농연 훈련실', 0.36, 0.08, (rx0 + doorL) / 2, 1.5, zf + 0.022, '#212121', '#ffb74d');
    part(g, rbox(0.14, 0.14, 0.02, 0.02), '#424242', (rx0 + doorL) / 2, 1.1, zf + 0.022);
    part(g, box(0.1, 0.1, 0.004), '#ff7043', (rx0 + doorL) / 2, 1.1, zf + 0.034, { outline: false, material: glow('#ff7043') });
    // Smoke spilling out of the doorway while it's used.
    const smoke = new THREE.Group();
    g.add(smoke);
    const puffs: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(ball(0.16 + (i % 3) * 0.05), SMOKE);
      smoke.add(m);
      puffs.push(m);
    }
    out.inUse = smoke;
    // The ladder up the front on the left, from the floor to a hand-hold over the deck.
    const lx = -0.5;
    const lz = zf + 0.06;
    for (const sx of [-1, 1]) part(g, rbox(0.045, postH - 0.05, 0.04, 0.01), ALU, lx + sx * 0.21, (postH - 0.05) / 2, lz);
    for (let y = 0.26; y < postH - 0.1; y += 0.28) part(g, cyl(0.016, 0.016, 0.42, 8), shade(ALU, 0.9), lx, y, lz, { rz: Math.PI / 2, outline: false });
    // The casualty on a mat in front: an orange rescue manikin on its back, head to the left.
    part(g, rbox(1.0, 0.03, 0.42, 0.012), '#1565c0', 0.22, 0.015, 0.36);
    const mk = group(g, 0.22, 0.03, 0.36);
    part(mk, ball(0.1), '#f1c7a6', -0.4, 0.09, 0).scale.set(1, 0.95, 1.1);
    part(mk, rbox(0.4, 0.17, 0.3, 0.07), '#ff7043', -0.07, 0.085, 0);
    part(mk, rbox(0.12, 0.12, 0.28, 0.05), '#37474f', 0.18, 0.07, 0);
    for (const sz of [-1, 1]) {
      part(mk, rbox(0.4, 0.1, 0.11, 0.04), '#37474f', 0.43, 0.055, sz * 0.075);
      part(mk, rbox(0.34, 0.08, 0.08, 0.035), '#ff7043', -0.06, 0.05, sz * 0.2, { ry: sz * 0.1 });
    }
    const chest = marker(mk, -0.1, 0.18, 0);
    // A hose line laid across the floor to the smoke room door.
    part(g, box(0.07, 0.012, 0.5), '#efe9dc', 0.82, 0.006, 0.45, { outline: false });
    part(g, cyl(0.03, 0.045, 0.2, 10), '#c9a227', 0.8, 0.03, 0.2, { rx: Math.PI / 2 });
    // The climber: up the ladder and down again, the hands on the rungs before the face.
    const climber = spot(g, 'stand', lx, 0, lz + 0.22, Math.PI);
    climber.motion = 'climb';
    climber.work = marker(climber.at, 0, 1.18, 0.26);
    const hands = new THREE.Vector3();
    out.animate = (t) => {
      const u = (t / 16) % 1;
      const k = u < 0.4 ? u / 0.4 : u < 0.55 ? 1 : u < 0.95 ? 1 - (u - 0.55) / 0.4 : 0;
      // Step by step: each rung a little lift and a little pause.
      const steps = k * 5;
      const y = (Math.floor(steps) + THREE.MathUtils.smoothstep(steps - Math.floor(steps), 0.3, 1)) * 0.28;
      climber.at.position.y = Math.min(1.4, y);
      puffs.forEach((m, i) => {
        const v = (t * 0.12 + i / puffs.length) % 1;
        hands.set(0.78 + 0.1 * Math.sin(i * 2.1 + t * 0.5) + v * 0.15, 0.6 + v * 1.4 + (i % 2) * 0.2, zf + 0.1 + v * 0.45);
        m.position.copy(hands);
        m.scale.setScalar(0.6 + v * 1.1);
      });
    };
    out.work = climber.work;
    out.spots = {
      fireDrill: climber,
      firefighter_rescueFirstAid: stoodAt(g, 0.12, 0.84, 'cpr', chest),
      firefighter_searchDrill: stoodAt(g, 0.78, 0.1, 'search', chest),
      '*': climber,
    };
  },

  /**
   * The 119 dispatch terminal: a grey steel desk, two monitors — the call-out slip (lit while it's
   * used) and the route map to the fire — the slip printer with the last one hanging out, the radio
   * base with its hand mic, a desk phone, the run log open with a pen; on a post behind it the red
   * call-out lamp and its speaker, '출동 지령' under them. Sat at it writing up the run log.
   */
  ffDispatchDesk(g, W, D, _c, _def, _ctx, out) {
    const h = 0.74;
    const d = 0.66;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const steel = '#7f8a91';
    part(g, rbox(W - 0.06, 0.035, d, 0.012), '#d9dde0', 0, h, z);
    part(g, rbox(0.42, h - 0.02, d - 0.06, 0.012), steel, W / 2 - 0.27, (h - 0.02) / 2, z);
    for (let i = 0; i < 3; i++) part(g, rbox(0.38, 0.19, 0.012, 0.006), tint(steel, 0.15), W / 2 - 0.27, 0.14 + i * 0.22, z + (d - 0.06) / 2 + 0.004);
    part(g, rbox(0.04, h - 0.02, d - 0.06, 0.01), steel, -W / 2 + 0.07, (h - 0.02) / 2, z);
    part(g, rbox(W - 0.5, 0.38, 0.015, 0.006), shade(steel, 0.9), -0.12, 0.5, z - d / 2 + 0.04);
    const ty = h + 0.018;
    // Two monitors.
    const mons: Array<[number, number, () => THREE.Texture, boolean]> = [[-0.3, 0.12, dispatchTex, true], [0.3, -0.12, routeTex, false]];
    for (const [x, ry, tex, main] of mons) {
      const m = group(g, x, ty, z - 0.12, ry);
      part(m, rbox(0.16, 0.012, 0.11, 0.004), BLACK, 0, 0.006, 0);
      part(m, rbox(0.035, 0.18, 0.025, 0.008), BLACK, 0, 0.1, -0.02);
      part(m, rbox(0.52, 0.32, 0.03, 0.01), BLACK, 0, 0.32, 0);
      if (main) out.screen = screenOf(m, tex(), 0.48, 0.28, 0, 0.32, 0.016);
      else sheet(m, tex(), 0.48, 0.28, 0, 0.32, 0.016);
    }
    // The slip printer on the left, a slip curling out of it.
    const px = -W / 2 + 0.22;
    part(g, rbox(0.2, 0.12, 0.18, 0.02), '#eceff1', px, ty + 0.06, z + 0.04);
    part(g, box(0.12, 0.004, 0.02), BLACK, px, ty + 0.12, z + 0.1, { outline: false });
    const slip = painted('ffSlip', 64, 96, (x2) => {
      x2.fillStyle = '#ffffff';
      x2.fillRect(0, 0, 64, 96);
      x2.fillStyle = '#c62828';
      x2.font = `bold 11px ${FONT}`;
      x2.fillText('출동지령', 6, 14);
      x2.fillStyle = '#555';
      for (let i = 0; i < 6; i++) x2.fillRect(6, 24 + i * 11, 40 + (i % 3) * 6, 3);
    });
    sheet(g, slip, 0.1, 0.15, px, ty + 0.19, z + 0.11, 0, -0.3);
    // The radio base and its hand mic, a desk phone.
    part(g, rbox(0.24, 0.08, 0.18, 0.015), '#263238', 0.62, ty + 0.04, z - 0.08);
    part(g, box(0.1, 0.03, 0.004), '#76ff03', 0.58, ty + 0.05, z + 0.012, { outline: false, material: glow('#b2ff59') });
    part(g, rbox(0.06, 0.1, 0.035, 0.015), BLACK, 0.76, ty + 0.06, z + 0.06, { rz: -0.2 });
    part(g, rbox(0.17, 0.05, 0.2, 0.02), '#c62828', 0.58, ty + 0.025, z + 0.16, { ry: -0.2 });
    // The run log open, a pen.
    part(g, box(0.36, 0.012, 0.26), '#1a237e', 0.02, ty + 0.006, z + 0.17);
    part(g, box(0.34, 0.004, 0.24), '#fafafa', 0.02, ty + 0.014, z + 0.17, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.13, 0.002, 0.004), '#9e9e9e', -0.06 + (i % 2) * 0.17, ty + 0.017, z + 0.09 + Math.floor(i / 2) * 0.06, { outline: false });
    part(g, cyl(0.005, 0.005, 0.13, 6), BLACK, 0.12, ty + 0.02, z + 0.2, { rz: Math.PI / 2, ry: 0.6, outline: false });
    const log = marker(g, 0.06, ty + 0.02, z + 0.17);
    // The call-out lamp on its post behind, the speaker under it.
    const postX = -0.02;
    const pz = z - d / 2 + 0.03;
    part(g, rbox(0.05, 1.3, 0.05, 0.01), steel, postX, h + 0.65, pz);
    part(g, cyl(0.07, 0.08, 0.04, 16), BLACK, postX, h + 1.32, pz + 0.04);
    part(g, cyl(0.06, 0.07, 0.1, 16), '#e53935', postX, h + 1.39, pz + 0.04, { material: glow('#ff5252') });
    part(g, rbox(0.2, 0.2, 0.08, 0.03), '#37474f', postX, h + 1.08, pz + 0.04);
    for (let i = 0; i < 4; i++) part(g, box(0.14, 0.01, 0.004), BLACK, postX, h + 1.02 + i * 0.035, pz + 0.081, { outline: false });
    label(g, '출동 지령', 0.3, 0.07, postX, h + 0.88, pz + 0.03, '#c62828', WHITE);
    // The chair.
    const cz = front + 0.22;
    const ch = group(g, 0, 0, cz, Math.PI);
    officeChair(ch, 0.44, '#b71c1c');
    out.seat = marker(g, 0, 0.48, cz);
    out.work = log;
    const sat = spot(g, 'sit', 0, 0.48, cz, Math.PI, 0.48);
    sat.work = log;
    sat.motion = 'write';
    out.spots = { '*': sat };
  },

  /**
   * The breathing-air compressor (공기충전기): a grey unit, the compressor behind louvres at the foot,
   * above it the fill cage — yellow steel bars round two cylinders on their fill whips — the panel
   * beside it with three dials, the fill valves and a green 충전 lamp that lights while it's used, a
   * warning sign; a spare cylinder stands by it. Filled stood at the panel, hands on the valves.
   */
  ffAirCompressor(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.1;
    const d = 0.6;
    const z = -D / 2 + d / 2 + 0.03;
    const fz = z + d / 2;
    const grey = '#9aa3ab';
    // The compressor housing with its louvres.
    part(g, rbox(w, 0.62, d, 0.03), grey, 0, 0.31, z);
    for (let i = 0; i < 7; i++) part(g, box(w - 0.2, 0.02, 0.01), shade(grey, 0.7), 0, 0.12 + i * 0.065, fz + 0.002, { outline: false });
    label(g, '공기충전기', 0.4, 0.08, 0, 0.56, fz + 0.006, '#263238', WHITE);
    // The fill cage on the left: bars round two cylinders.
    const cx = -0.18;
    const cw = 0.44;
    const y0 = 0.64;
    const ch = 0.95;
    part(g, rbox(cw + 0.04, 0.04, d - 0.06, 0.01), YELLOW, cx, y0, z);
    part(g, rbox(cw + 0.04, 0.04, d - 0.06, 0.01), YELLOW, cx, y0 + ch, z);
    for (let x = cx - cw / 2; x <= cx + cw / 2 + 0.001; x += cw / 6) part(g, cyl(0.011, 0.011, ch, 8), YELLOW, x, y0 + ch / 2, fz - 0.05, { outline: false });
    for (const y of [y0 + 0.3, y0 + 0.62]) part(g, box(cw, 0.025, 0.02), YELLOW, cx, y, fz - 0.05, { outline: false });
    for (const dx of [-0.1, 0.1]) {
      part(g, cyl(0.075, 0.075, 0.62, 16), '#e8eaec', cx + dx, y0 + 0.35, z - 0.04);
      part(g, ball(0.075), '#e8eaec', cx + dx, y0 + 0.66, z - 0.04).scale.set(1, 0.5, 1);
      part(g, cyl(0.025, 0.025, 0.06, 10), CHROME, cx + dx, y0 + 0.72, z - 0.04);
      rod(g, new THREE.Vector3(cx + dx, y0 + 0.75, z - 0.04), new THREE.Vector3(cx + dx * 0.4, y0 + 0.9, z - 0.15), 0.01, BLACK);
    }
    // The panel on the right: dials, valves and the fill lamp.
    const px = 0.23;
    part(g, rbox(0.3, ch, d - 0.06, 0.02), shade(grey, 0.9), px, y0 + ch / 2, z);
    const needles = [gauge(g, px, y0 + 0.78, fz - 0.02, 0.06), gauge(g, px - 0.07, y0 + 0.6, fz - 0.02, 0.04), gauge(g, px + 0.07, y0 + 0.6, fz - 0.02, 0.04)];
    for (let k = 0; k < 3; k++) {
      part(g, cyl(0.016, 0.016, 0.05, 10), CHROME, px - 0.08 + k * 0.08, y0 + 0.4, fz, { rx: Math.PI / 2, outline: false });
      part(g, rbox(0.025, 0.09, 0.02, 0.008), k === 2 ? '#e53935' : '#1e88e5', px - 0.08 + k * 0.08, y0 + 0.44, fz + 0.03);
    }
    part(g, cyl(0.025, 0.025, 0.02, 12), '#1b5e20', px, y0 + 0.2, fz - 0.02, { rx: Math.PI / 2 });
    const lamp = new THREE.Group();
    g.add(lamp);
    part(lamp, cyl(0.026, 0.026, 0.022, 12), '#69f0ae', px, y0 + 0.2, fz - 0.015, { rx: Math.PI / 2, outline: false, material: glow('#69f0ae') });
    out.inUse = lamp;
    label(g, '충전 중 문 열지 마시오', 0.28, 0.05, px, y0 + 0.1, fz - 0.008, YELLOW, '#212121');
    // A spare cylinder standing on the floor by it.
    part(g, cyl(0.075, 0.075, 0.6, 16), '#e8eaec', w / 2 - 0.04, 0.3, fz + 0.12);
    part(g, box(0.152, 0.05, 0.152), '#43a047', w / 2 - 0.04, 0.45, fz + 0.12, { outline: false });
    const valves = marker(g, px - 0.04, y0 + 0.45, fz + 0.04);
    out.animate = (t) => needles.forEach((n, i) => (n.rotation.z = 1.2 - ((t * 0.05 + i * 0.3) % 1) * 2.2));
    out.work = valves;
    out.spots = { '*': stoodAt(g, 0.12, D / 2 + 0.32, 'tinker', valves) };
  },

  /**
   * The rescue tool shelf (구조 장비): a red steel shelf, a pegboard behind with a halligan bar and an
   * axe on hooks and '구조 장비' over it; on the shelves the yellow hydraulic spreader and cutter, the
   * orange power pack with its hose reel, a chainsaw, rope bags. Checked stood at it with the
   * spreader in the hands — its jaws opening and shutting while it's tried.
   */
  ffRescueToolRack(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.1;
    const d = 0.48;
    const z = -D / 2 + d / 2 + 0.03;
    const fz = z + d / 2;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) part(g, rbox(0.04, 1.4, 0.04, 0.01), RED, sx * (w / 2 - 0.02), 0.7, z + sz * (d / 2 - 0.02));
    for (const y of [0.1, 0.55, 1.0, 1.4]) {
      part(g, rbox(w, 0.03, d, 0.01), '#8d9399', 0, y, z);
      part(g, box(w, 0.05, 0.02), RED, 0, y + 0.01, fz - 0.01, { outline: false });
    }
    // The pegboard over it, a halligan and an axe on it.
    part(g, rbox(w, 0.8, 0.02, 0.008), '#d7ccc8', 0, 1.85, z - d / 2 + 0.02);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) part(g, box(0.012, 0.012, 0.004), '#8d6e63', -w / 2 + 0.15 + i * 0.2, 1.55 + j * 0.18, z - d / 2 + 0.032, { outline: false });
    const bz = z - d / 2 + 0.06;
    part(g, rbox(0.8, 0.035, 0.035, 0.01), '#37474f', -0.4, 1.78, bz, { rz: 0.05 });
    part(g, rbox(0.08, 0.14, 0.03, 0.01), '#37474f', -0.8, 1.76, bz);
    part(g, rbox(0.04, 0.12, 0.03, 0.01), '#37474f', -0.01, 1.82, bz, { rz: 0.4 });
    part(g, rbox(0.7, 0.04, 0.035, 0.012), '#8d6e63', 0.4, 1.66, bz, { rz: -0.04 });
    part(g, rbox(0.12, 0.18, 0.02, 0.01), '#cfd8dc', 0.75, 1.68, bz);
    part(g, rbox(0.06, 0.08, 0.03, 0.01), '#e53935', 0.68, 1.67, bz);
    part(g, rbox(0.7, 0.13, 0.02, 0.01), RED, 0, 2.15, z - d / 2 + 0.04);
    label(g, '구조 장비', 0.6, 0.1, 0, 2.15, z - d / 2 + 0.052, RED, WHITE);
    // Middle shelf: the spreader (its jaws move) and the cutter.
    const sp = group(g, -0.45, 1.03, z + 0.02, Math.PI / 2);
    part(sp, rbox(0.12, 0.12, 0.42, 0.04), '#fbc02d', 0, 0.06, -0.06);
    part(sp, rbox(0.08, 0.06, 0.12, 0.02), BLACK, 0, 0.14, -0.15);
    rod(sp, new THREE.Vector3(-0.05, 0.08, -0.26), new THREE.Vector3(-0.2, 0.06, -0.32), 0.012, BLACK);
    const jaws: THREE.Group[] = [];
    for (const sx of [-1, 1]) {
      const j = group(sp, sx * 0.02, 0.06, 0.15);
      part(j, rbox(0.04, 0.06, 0.28, 0.015), '#424242', 0, 0, 0.12);
      part(j, rbox(0.05, 0.04, 0.06, 0.01), CHROME, 0, 0, 0.27);
      jaws.push(j);
    }
    const ct = group(g, 0.35, 1.03, z + 0.02, Math.PI / 2 + 0.15);
    part(ct, rbox(0.11, 0.11, 0.36, 0.04), '#fbc02d', 0, 0.06, -0.06);
    for (const sx of [-1, 1]) part(ct, rbox(0.03, 0.05, 0.16, 0.01), '#424242', sx * 0.03, 0.06, 0.18, { ry: -sx * 0.18 });
    // Bottom shelf: the power pack with its hose reel, the chainsaw.
    part(g, rbox(0.5, 0.36, 0.34, 0.04), '#ef6c00', -0.4, 0.3, z);
    part(g, cyl(0.12, 0.12, 0.06, 18), '#212121', -0.4, 0.36, z + 0.19, { rx: Math.PI / 2 });
    for (let i = 0; i < 3; i++) part(g, ring(0.1 - i * 0.02, 0.008), '#455a64', -0.4, 0.36, z + 0.225, { outline: false });
    part(g, rbox(0.4, 0.2, 0.16, 0.04), '#ff8f00', 0.35, 0.22, z + 0.02);
    part(g, rbox(0.5, 0.05, 0.08, 0.02), '#9e9e9e', 0.62, 0.2, z + 0.02);
    part(g, ring(0.07, 0.012, Math.PI), BLACK, 0.3, 0.33, z + 0.02, { outline: false });
    // Top shelf: rope bags and a basket stretcher's straps.
    for (const [x, col] of [[-0.6, '#c62828'], [-0.3, '#1565c0'], [0.0, '#2e7d32']] as const) {
      part(g, cyl(0.11, 0.12, 0.3, 14), col, x, 1.57, z);
      part(g, ring(0.08, 0.01), shade(col, 0.6), x, 1.72, z, { rx: Math.PI / 2, outline: false });
    }
    part(g, rbox(0.4, 0.12, 0.3, 0.03), '#fdd835', 0.5, 1.48, z);
    const handle = marker(sp, 0, 0.1, 0.1);
    out.animate = (t) => {
      const a = 0.05 + 0.22 * (0.5 - 0.5 * Math.cos(t * 1.2));
      jaws.forEach((j, i) => (j.rotation.y = (i ? -1 : 1) * a));
    };
    out.work = handle;
    out.spots = { '*': stoodAt(g, -0.35, D / 2 + 0.3, 'tinker', handle) };
  },

  /**
   * The duty board: a whiteboard in an aluminium frame on the wall, '근무 현황판' and the station on
   * its header, today's crews in a grid by truck (펌프 · 탱크 · 구급 · 구조) with magnets for who's
   * in and who's out, the month's runs, and a fire-danger dial at 주의; a marker tray. The briefing
   * gathers in front of it.
   */
  ffDutyBoard(g, W, D, _c, _def, ctx, out) {
    const bw = W - 0.2;
    const bh = 1.0;
    const z = -D / 2 + (ctx.againstWall ? 0.03 : 0.22);
    const y = ctx.againstWall ? 1.45 : 1.25;
    if (!ctx.againstWall)
      for (const sx of [-1, 1]) {
        part(g, cyl(0.025, 0.025, y + 0.3, 8), STEEL, sx * (bw / 2 + 0.02), (y + 0.3) / 2, z);
        part(g, rbox(0.06, 0.04, 0.6, 0.015), STEEL, sx * (bw / 2 + 0.02), 0.02, z);
      }
    part(g, rbox(bw + 0.06, bh + 0.06, 0.04, 0.012), '#b0b4b8', 0, y, z);
    const tex = painted('ffDuty', 384, 208, (x2) => {
      x2.fillStyle = '#fbfbfb';
      x2.fillRect(0, 0, 384, 208);
      x2.fillStyle = '#c62828';
      x2.fillRect(0, 0, 384, 30);
      x2.fillStyle = '#fff';
      x2.font = `bold 17px ${FONT}`;
      x2.fillText(`근무 현황판 · ${STATION}`, 10, 21);
      // The grid of crews by truck.
      const cols = ['펌프', '탱크', '구급', '구조'];
      const crew = [['왕대철', '유하늘'], ['표준혁', '김소방'], ['맹응급', '하생명'], ['홍구조', '박로프']];
      x2.font = `bold 13px ${FONT}`;
      cols.forEach((c, i) => {
        const cx = 10 + i * 62;
        x2.fillStyle = '#263238';
        x2.fillRect(cx, 40, 58, 20);
        x2.fillStyle = '#fff';
        x2.fillText(c, cx + 14, 55);
        crew[i].forEach((n, j) => {
          x2.fillStyle = '#eceff1';
          x2.fillRect(cx, 64 + j * 26, 58, 22);
          x2.fillStyle = '#212121';
          x2.font = `12px ${FONT}`;
          x2.fillText(n, cx + 4, 80 + j * 26);
          x2.fillStyle = (i + j) % 3 === 2 ? '#e53935' : '#43a047';
          x2.beginPath();
          x2.arc(cx + 50, 75 + j * 26, 5, 0, Math.PI * 2);
          x2.fill();
        });
      });
      x2.fillStyle = '#212121';
      x2.font = `12px ${FONT}`;
      x2.fillText('● 대기   ● 출동', 10, 136);
      x2.fillStyle = '#e53935';
      x2.fillText('●', 52, 136);
      x2.fillStyle = '#43a047';
      x2.fillText('●', 10, 136);
      // The month's runs.
      x2.fillStyle = '#1565c0';
      x2.font = `bold 13px ${FONT}`;
      x2.fillText('10월 출동', 10, 162);
      x2.fillStyle = '#263238';
      x2.font = `12px ${FONT}`;
      x2.fillText('화재 12 · 구조 31 · 구급 148', 10, 182);
      x2.fillText('무사고 217일째', 10, 200);
      // The fire-danger dial.
      const dx = 318;
      const dy = 132;
      const bands = ['#43a047', '#fdd835', '#fb8c00', '#e53935'];
      bands.forEach((c, i) => {
        x2.strokeStyle = c;
        x2.lineWidth = 16;
        x2.beginPath();
        x2.arc(dx, dy, 44, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 1) * Math.PI) / 4);
        x2.stroke();
      });
      x2.strokeStyle = '#212121';
      x2.lineWidth = 3;
      x2.beginPath();
      x2.moveTo(dx, dy);
      x2.lineTo(dx + Math.cos(Math.PI * 1.36) * 40, dy + Math.sin(Math.PI * 1.36) * 40);
      x2.stroke();
      x2.fillStyle = '#212121';
      x2.font = `bold 13px ${FONT}`;
      x2.fillText('화재위험 : 주의', 268, 160);
      x2.font = `11px ${FONT}`;
      x2.fillText('관심 주의 경계 심각', 262, 80);
    });
    sheet(g, tex, bw, bh, 0, y, z + 0.022);
    part(g, rbox(bw * 0.5, 0.025, 0.07, 0.008), '#b0b4b8', -0.2, y - bh / 2 - 0.02, z + 0.04);
    for (const [i, col] of ['#d32f2f', '#1565c0', '#212121'].entries()) part(g, cyl(0.009, 0.009, 0.12, 8), col, -0.35 + i * 0.07, y - bh / 2 - 0.005, z + 0.045, { rz: Math.PI / 2, outline: false });
    out.work = marker(g, -0.3, y, z + 0.03);
  },

  /**
   * A bay door on the street wall: a red roll-up shutter in its yellow-and-black guides under the
   * roller box, a row of windows across it, 119 painted big on it, a green and red signal lamp over
   * it and the hazard line on the floor in front. (It stays shut: a truck going out is gone by the
   * time it gets there.)
   */
  ffBayDoorBoard(g, W, D, _c, _def, ctx) {
    const z = -D / 2 + (ctx.againstWall ? 0.04 : 0.2);
    const dw = W - 0.2;
    const dh = 2.55;
    const mat = litPaint('ffShutter', 256, 320, (x2) => {
      x2.fillStyle = '#c62828';
      x2.fillRect(0, 0, 256, 320);
      for (let y = 0; y < 320; y += 10) {
        x2.fillStyle = '#a31b1b';
        x2.fillRect(0, y, 256, 2);
        x2.fillStyle = '#d84a3f';
        x2.fillRect(0, y + 2, 256, 2);
      }
      x2.fillStyle = '#1e2a33';
      for (let i = 0; i < 6; i++) x2.fillRect(14 + i * 40, 74, 30, 22);
      x2.fillStyle = '#9fc6da';
      for (let i = 0; i < 6; i++) x2.fillRect(16 + i * 40, 76, 26, 18);
      x2.fillStyle = '#ffffff';
      x2.font = `bold 92px ${FONT}`;
      x2.textAlign = 'center';
      x2.fillText('119', 128, 210);
      x2.font = `bold 22px ${FONT}`;
      x2.fillText('긴급차량 출입구', 128, 250);
      x2.fillStyle = '#7f1414';
      x2.fillRect(0, 300, 256, 20);
    });
    part(g, box(dw, dh, 0.03), RED, 0, dh / 2, z, { material: mat, outline: false });
    // The guides with their hazard stripes, the roller box over it.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.1, dh + 0.1, 0.08, 0.01), '#5b6068', sx * (dw / 2 + 0.05), (dh + 0.1) / 2, z + 0.01);
      sheet(g, hazardTex(4), 1.2, 0.08, sx * (dw / 2 + 0.05), 0.6, z + 0.052, 0, 0).rotation.z = Math.PI / 2;
    }
    part(g, rbox(dw + 0.22, 0.3, 0.3, 0.03), '#5b6068', 0, dh + 0.18, z + 0.1);
    part(g, rbox(0.2, 0.05, 0.05, 0.02), BLACK, 0.2, 0.08, z + 0.03);
    // Signal lamps on the roller box.
    part(g, rbox(0.26, 0.12, 0.06, 0.03), BLACK, dw / 2 - 0.2, dh + 0.18, z + 0.28);
    part(g, ball(0.035), '#00e676', dw / 2 - 0.26, dh + 0.18, z + 0.31, { material: glow('#69f0ae'), outline: false });
    part(g, ball(0.035), '#7f1d1d', dw / 2 - 0.14, dh + 0.18, z + 0.31, { outline: false });
    // The hazard line on the floor along its foot.
    sheet(g, hazardTex(3), dw, 0.14, 0, 0.004, z + 0.35, 0, -Math.PI / 2);
  },

  /**
   * 소방 시설 점검대: a training board of what's on a building's floors. A red hydrant box with a door that opens on its hose, valve and gauge; an
   * extinguisher on its step, gauge in the green, pin and seal in; a clipboard on a post; the table with the inspection log, a practice
   * extinguisher, a plain CPR torso and a carton of leaflets, and a card of the four steps. A hydrant box looked over; the extinguisher inspected;
   * or a class got ready and its demonstration practised, facing the room with the paper fire on the floor.
   */
  ffInspectBoard(g, _W, _D, _c, _def, _ctx, out) {
    const B = FS.BOARD;
    part(g, box(1.92, 1.3, 0.03), '#e8e4d8', 0, 0.65, -0.45);
    part(g, box(1.92, 0.06, 0.04), '#b71c1c', 0, 1.3, -0.45, NO);
    label(g, '소방 시설 점검 · 교육', 0.74, 0.1, 0.3, 1.19, -0.433, '#b71c1c', '#ffffff');
    // The hydrant box, a mock on legs, its door hinged on the left.
    const X = B.box;
    const bw = X.x1 - X.x0;
    const bh = X.y1 - X.y0;
    const bz = (X.z0 + X.z1) / 2;
    const bd = X.z1 - X.z0;
    const bx = (X.x0 + X.x1) / 2;
    part(g, box(bw, bh, 0.012), RED, bx, X.y0 + bh / 2, X.z0, NO);
    part(g, box(0.012, bh, bd), RED, X.x0, X.y0 + bh / 2, bz, NO);
    part(g, box(0.012, bh, bd), RED, X.x1, X.y0 + bh / 2, bz, NO);
    for (const y of [X.y0, X.y1]) part(g, box(bw, 0.012, bd), DEEP, bx, y, bz, NO);
    for (const x of [X.x0 + 0.03, X.x1 - 0.03]) part(g, box(0.04, X.y0, 0.3), '#78909c', x, X.y0 / 2, bz, NO);
    part(g, box(bw - 0.03, 0.01, bd - 0.03), '#37474f', bx, 0.62, bz, NO);
    // Inside: the hose on its roll, the valve, the gauge.
    const hr = FS.HOSE_ROLL;
    hoseRoll(g, hr[0], hr[1], hr[2] + 0.02, 0.1);
    part(g, cyl(0.016, 0.016, 0.16, 10), CHROME, hr[0], hr[1] - 0.12, hr[2] + 0.14, NO);
    const va = FS.VALVE;
    part(g, cyl(0.025, 0.025, 0.1, 10), '#8d6e63', va[0], va[1], va[2], { rx: Math.PI / 2, ...NO });
    part(g, ring(0.04, 0.006), RED, va[0], va[1], va[2] + 0.055, NO);
    part(g, box(0.07, 0.006, 0.006), RED, va[0], va[1], va[2] + 0.055, NO);
    const ga = FS.BOX_GAUGE;
    gauge(g, ga[0], ga[1], ga[2], 0.038);
    const door = new THREE.Group();
    door.position.set(X.x0, 0, X.z1);
    g.add(door);
    part(door, box(bw, bh, 0.014), RED, bw / 2, X.y0 + bh / 2, 0);
    part(door, box(0.28, 0.32, 0.004), '#ffcdd2', bw / 2, X.y0 + bh * 0.62, 0.008, NO);
    label(door, '소화전', 0.26, 0.1, bw / 2, X.y0 + bh * 0.62, 0.0115, '#ffcdd2', '#b71c1c');
    part(door, rbox(0.02, 0.1, 0.03, 0.006), CHROME, FS.HANDLE_R, 0.82, 0.02, NO);
    // Its sheet on the board above, its pen on the post.
    part(g, box(0.36, 0.14, 0.01), '#fafafa', FS.BOX_SHEET[0], FS.BOX_SHEET[1], FS.BOX_SHEET[2] - 0.006, NO);
    const sheetTicks = [0, 1, 2].map((i) => part(g, box(0.05, 0.007, 0.002), '#2e7d32', FS.BOX_SHEET[0] - 0.1 + i * 0.1, FS.BOX_SHEET[1], FS.BOX_SHEET[2], NO));
    // The extinguisher's step and the extinguisher.
    const S = B.step;
    const E = B.ext;
    part(g, box(S.x1 - S.x0, S.h, S.z1 - S.z0), '#90a4ae', (S.x0 + S.x1) / 2, S.h / 2, (S.z0 + S.z1) / 2);
    const ex = new THREE.Group();
    ex.position.set(E.x, 0, E.z);
    g.add(ex);
    extinguisherBody(ex, S.h, RED, '소화기');
    // Its head: gauge face, handle, pin and seal.
    part(ex, box(0.1, 0.015, 0.03), BLACK, 0, S.h + 0.46, 0, NO);
    part(ex, box(0.1, 0.012, 0.03), BLACK, 0, S.h + 0.42, 0, { rz: 0.12, ...NO });
    part(g, box(0.012, 0.012, 0.05), BLACK, E.gauge[0], E.gauge[1], E.gauge[2] - 0.03, NO);
    part(g, cyl(0.022, 0.022, 0.012, 16), '#fafafa', E.gauge[0], E.gauge[1], E.gauge[2], { rx: Math.PI / 2, ...NO });
    const faceTex = painted('ffGaugeFace', 64, 64, (c) => {
      c.fillStyle = '#fafafa';
      c.fillRect(0, 0, 64, 64);
      c.lineWidth = 8;
      for (const [col, a0, a1] of [['#e53935', Math.PI, Math.PI * 1.3], ['#43a047', Math.PI * 1.3, Math.PI * 1.75], ['#e53935', Math.PI * 1.75, Math.PI * 2]] as const) {
        c.strokeStyle = col;
        c.beginPath();
        c.arc(32, 40, 23, a0, a1);
        c.stroke();
      }
      c.strokeStyle = '#212121';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(32, 40);
      c.lineTo(38, 17);
      c.stroke();
    });
    sheet(g, faceTex, 0.036, 0.036, E.gauge[0], E.gauge[1], E.gauge[2] + 0.0075);
    part(g, ring(0.016, 0.003), '#ffd23f', E.pin[0] + 0.02, E.pin[1], E.pin[2], { ry: Math.PI / 2, ...NO });
    part(g, cyl(0.002, 0.002, 0.05, 6), CHROME, E.pin[0], E.pin[1], E.pin[2], { rz: Math.PI / 2, ...NO });
    part(g, box(0.012, 0.018, 0.006), '#ffee58', E.pin[0] - 0.02, E.pin[1] - 0.012, E.pin[2], NO);
    rod(g, v3(E.hoseTop[0], E.hoseTop[1], E.hoseTop[2]), v3(E.hoseEnd[0], E.hoseEnd[1], E.hoseEnd[2]), 0.009, BLACK);
    part(g, cyl(0.012, 0.016, 0.05, 8), BLACK, E.hoseEnd[0], E.hoseEnd[1] - 0.02, E.hoseEnd[2], NO);
    // The post with the clipboard's hook.
    const HK = B.hook;
    part(g, box(0.03, HK[1] + 0.12, 0.03), '#78909c', HK[0], (HK[1] + 0.12) / 2, HK[2] - 0.03);
    // The table.
    const Tb = B.table;
    const tx = (Tb.x0 + Tb.x1) / 2;
    const tz = (Tb.z0 + Tb.z1) / 2;
    part(g, rbox(Tb.x1 - Tb.x0, 0.03, Tb.z1 - Tb.z0, 0.01), '#dfe3e6', tx, Tb.top - 0.015, tz);
    for (const x of [Tb.x0 + 0.04, Tb.x1 - 0.04]) for (const z of [Tb.z0 + 0.04, Tb.z1 - 0.04]) part(g, box(0.035, Tb.top - 0.03, 0.035), STEEL, x, (Tb.top - 0.03) / 2, z, NO);
    // The log, its lines.
    const L = FS.LOG;
    part(g, box(0.22, 0.006, 0.28), '#ffffff', L[0], Tb.top + 0.003, L[2], NO);
    part(g, box(0.18, 0.002, 0.016), RED, L[0], Tb.top + 0.007, L[2] - 0.11, NO);
    const logLines = [0, 1, 2].map((i) => part(g, box(0.15, 0.0015, 0.004), '#263238', L[0], Tb.top + 0.007, L[2] - 0.05 + i * 0.035, NO));
    // The four steps' card, stood up at the back of the table.
    const stepsTex = painted('ffPassCard', 192, 112, (c) => {
      c.fillStyle = '#fff8e1';
      c.fillRect(0, 0, 192, 112);
      c.fillStyle = '#b71c1c';
      c.font = `bold 15px ${FONT}`;
      c.fillText('소화기 사용 네 단계', 10, 20);
      c.fillStyle = '#263238';
      c.font = `13px ${FONT}`;
      ['① 안전핀 뽑기', '② 불 아래쪽 겨누기', '③ 손잡이 움켜쥐기', '④ 좌우로 쓸기'].forEach((s, i) => c.fillText(s, 12, 42 + i * 20));
    });
    part(g, box(0.34, 0.2, 0.01), '#a1887f', 0.56, Tb.top + 0.11, Tb.z0 + 0.02, NO);
    sheet(g, stepsTex, 0.32, 0.187, 0.56, Tb.top + 0.11, Tb.z0 + 0.027);
    // The carton of leaflets.
    const Cn = FS.CARTON;
    part(g, box(0.24, 0.16, 0.2), '#c8a165', Cn[0], Cn[1] + 0.08, Cn[2]);
    part(g, box(0.2, 0.012, 0.16), '#ffffff', Cn[0], Cn[1] + 0.162, Cn[2], NO);
    // The torso: no detail on it but a shape and a mark at the middle of the chest.
    const torso = new THREE.Group();
    g.add(torso);
    part(torso, rbox(0.34, 0.1, 0.38, 0.04), '#c9ced2', 0, 0.05, 0, NO);
    part(torso, cyl(0.04, 0.04, 0.05, 12), '#b5bbc0', 0, 0.05, -0.2, { rx: Math.PI / 2, ...NO });
    part(torso, ball(0.075), '#c9ced2', 0, 0.06, -0.28, NO).scale.y = 0.85;
    part(torso, cyl(0.03, 0.03, 0.003, 14), '#90a4ae', 0, 0.101, -0.02, NO);
    // The leaflets, in the hand or on the table.
    const leaf = new THREE.Group();
    leaf.name = 'ffLeaflets';
    g.add(leaf);
    part(leaf, box(0.15, 0.03, 0.21), '#ffffff', 0, -0.01, 0, NO);
    part(leaf, box(0.152, 0.004, 0.08), RED, 0, 0.006, -0.05, NO);
    // The clipboard (a sheet with three ticks, its pen clipped on).
    const clip = new THREE.Group();
    clip.name = 'ffClipboard';
    g.add(clip);
    const tilted = new THREE.Group();
    tilted.rotation.x = -0.55;
    clip.add(tilted);
    part(tilted, box(0.22, 0.3, 0.008), '#8d6e63', 0, 0, 0, NO);
    part(tilted, box(0.19, 0.25, 0.002), '#ffffff', 0, -0.015, 0.006, NO);
    part(tilted, box(0.08, 0.022, 0.012), CHROME, 0, 0.135, 0.008, NO);
    const ticks = [0, 1, 2].map((i) => {
      part(tilted, box(0.14, 0.004, 0.001), '#90a4ae', -0.01, 0.07 - i * 0.05, 0.0075, NO);
      return part(tilted, box(0.02, 0.008, 0.002), '#2e7d32', 0.07, 0.07 - i * 0.05, 0.008, NO);
    });
    const pen = new THREE.Group();
    pen.name = 'ffClipPen';
    clip.add(pen);
    part(pen, cyl(0.006, 0.006, 0.13, 8), BLACK, 0, -0.03, 0, { rx: 0.35, ...NO });
    // A separate pen for the box's sheet.
    const boxPen = new THREE.Group();
    boxPen.name = 'ffBoxPen';
    g.add(boxPen);
    part(boxPen, cyl(0.006, 0.006, 0.13, 8), BLACK, 0, -0.03, 0, { rx: 0.35, ...NO });
    // The training extinguisher: blue, and marked. Its origin is the carrying handle, its frame turned with the dweller.
    const trainer = new THREE.Group();
    trainer.name = 'ffTrainer';
    g.add(trainer);
    extinguisherBody(trainer, -FS.TRAINER.drop, '#1565c0', '교육용');
    part(trainer, cyl(0.018, 0.018, 0.1, 10), BLACK, 0, -0.05, 0, NO);
    part(trainer, box(0.11, 0.018, 0.028), BLACK, 0, 0, 0, NO);
    const lever = new THREE.Group();
    lever.position.set(-0.05, -0.04, 0);
    trainer.add(lever);
    part(lever, box(0.1, 0.012, 0.026), BLACK, 0.05, 0, 0, NO);
    const pin = new THREE.Group();
    pin.name = 'ffPin';
    g.add(pin);
    part(pin, ring(0.016, 0.003), '#ffd23f', 0, 0, 0, { ry: Math.PI / 2, ...NO });
    const nozzle = new THREE.Group();
    trainer.add(nozzle);
    part(nozzle, cyl(0.012, 0.015, 0.09, 10), BLACK, 0, 0, 0, NO);
    const hose = liveHose(trainer, BLACK);
    // The paper fire on the floor, and the spray to it (only for the practice).
    const fire = new THREE.Group();
    fire.position.set(FS.FLAME[0], 0, FS.FLAME[2]);
    g.add(fire);
    part(fire, cyl(0.26, 0.28, 0.012, 22), '#78909c', 0, 0.006, 0, NO);
    part(fire, cyl(0.02, 0.17, 0.42, 12), '#ff7043', 0, 0.22, 0, NO);
    part(fire, cyl(0.01, 0.1, 0.26, 10), '#ffd54f', 0, 0.16, 0.05, NO);
    const sprayMat = new THREE.MeshBasicMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.4, depthWrite: false });
    const spray = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.012, 1, 12, 1, true), sprayMat);
    spray.userData.ownGeometry = spray.userData.ownMaterial = true;
    g.add(spray);
    // Places.
    const mark = marker(g, 0.1, 0.9, 0);
    const at = (a: FS.SpotAt, motion: Motion) => {
      const s = spot(g, 'stand', a.x, 0, a.z, a.yaw);
      s.work = mark;
      s.motion = motion;
      return s;
    };
    const check = at(FS.HYDRANT_AT, 'fsHydrant');
    const classy = at(FS.CLASS_AT, 'fsClass');
    const spots: Record<string, Spot> = { xwFireInspection: at(FS.INSPECT_AT, 'fsInspect'), xwSafetyClass: classy, ffCheckHydrant: check, '*': check };
    out.spots = spots;
    out.work = mark;
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const clipGrip = boardGrip(0.55);
    const leafHeld: HeldTool = { tool: leaf, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), palm: v3(0, -1, 0), shape: 'flat', radius: 0.016 } } };
    const inv = new THREE.Vector3();
    /** A point of the piece's in the trainer's frame. */
    const inTrainer = (p: readonly number[], at0: readonly number[], yaw: number) => {
      inv.set(p[0] - at0[0], p[1] - at0[1], p[2] - at0[2]).applyAxisAngle(up, -yaw);
      return inv.clone();
    };
    out.away = (_o, t) => {
      const sp = nowAt(spots, t);
      const m = sp?.motion as FS.FsMotion | undefined;
      const N = m ? FS.fsNow(m, t, FS.fsPhase(mark.getWorldPosition(tmp))) : null;
      // Walked and turned by the script (the class's demonstration).
      if (N && sp) {
        sp.at.position.set(N.at.x, 0, N.at.z);
        sp.at.rotation.y = N.at.yaw;
      }
      door.rotation.y = -FS.DOOR_OPEN * (N?.door ?? 0);
      sheetTicks.forEach((k, i) => (k.visible = (N?.boxTicks ?? 0) > 0.15 + i * 0.3));
      logLines.forEach((k, i) => (k.visible = (N?.log ?? 0) > 0.1 + i * 0.3));
      ticks.forEach((k, i) => (k.visible = (N?.ticks ?? 0) > i));
      // The clipboard: on its hook, leaning back to hang straight, or in the hand.
      const inHand = N?.tool === 'clip';
      putAt(clip, inHand ? N.clipAt : B.hook);
      clip.rotation.set(inHand ? 0 : 0.55, 0, 0);
      const penIn = inHand && N.penInHand;
      if (penIn) pen.position.set(N.penAt[0] - N.clipAt[0], N.penAt[1] - N.clipAt[1], N.penAt[2] - N.clipAt[2]);
      else pen.position.fromArray(FS.CLIP_PEN);
      // The box's pen.
      putAt(boxPen, N?.tool === 'pen' ? N.penAt : FS.BOX_PEN);
      // The class's props.
      const classing = m === 'fsClass' && N;
      torso.position.set(FS.TORSO.x, B.table.top, N?.torsoZ ?? FS.TORSO.home);
      leaf.visible = !!N?.leaflets;
      if (N?.leaflets) putAt(leaf, N.leaflets);
      const tAt = N?.trainerAt ?? FS.TRAINER_HOME;
      const yaw = N?.trainerYaw ?? Math.PI;
      putAt(trainer, tAt);
      trainer.rotation.y = yaw;
      lever.rotation.z = 0.2 * (N?.lever ?? 0);
      const inPlace = (N?.pinIn ?? 1) >= 0.999;
      pin.visible = !(N?.pinOut ?? false);
      if (N?.pinInHand) putAt(pin, N.penAt);
      else if (inPlace) {
        const c = Math.cos(yaw);
        const s = Math.sin(yaw);
        const q = FS.TRAINER.pin;
        pin.position.set(tAt[0] + q[0] * c + q[2] * s, tAt[1] + q[1], tAt[2] - q[0] * s + q[2] * c);
      }
      pin.rotation.y = yaw;
      const nz = N?.nozzle ? inTrainer(N.nozzle, tAt, yaw) : tmp.set(FS.TRAINER.rest[0], FS.TRAINER.rest[1], FS.TRAINER.rest[2]).clone();
      nozzle.position.copy(nz);
      hose(FS.TRAINER.top, [nz.x, nz.y, nz.z]);
      fire.visible = !!classing;
      spray.visible = !!N?.spray && !!N.nozzle;
      if (N?.nozzle) {
        const a = N.nozzle;
        const b = N.aimAt;
        spray.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
        dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        spray.scale.y = dir.length();
        spray.quaternion.setFromUnitVectors(up, dir.normalize());
        nozzle.quaternion.copy(trainer.quaternion).invert().multiply(spray.quaternion);
      } else nozzle.quaternion.identity();
      // In the hand.
      let held: HeldTool | null = null;
      if (inHand) {
        const grips: HeldTool['grips'] = { left: clipGrip };
        if (penIn) grips.right = { at: pen.position.clone(), axis: v3(0, 1, 0.35).normalize(), shape: 'pen', radius: 0.012 };
        held = { tool: clip, lead: 'left', grips };
      } else if (N?.tool === 'pen') {
        held = { tool: boxPen, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0.35).normalize(), shape: 'pen', radius: 0.012 } } };
      } else if (N?.tool === 'leaflets') held = leafHeld;
      else if (N?.tool === 'trainer') {
        const grips: HeldTool['grips'] = { left: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'power', radius: 0.014 } };
        if (N.nozzle) grips.right = { at: nz.clone(), axis: v3(0, 1, 0).applyQuaternion(nozzle.quaternion), shape: 'power', radius: 0.013 };
        else if (N.pinInHand) grips.right = { at: inTrainer(N.penAt, tAt, yaw), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.005 };
        held = { tool: trainer, lead: 'left', grips };
      }
      for (const s of Object.values(spots)) s.held = s === sp ? held : null;
    };
  },
};
