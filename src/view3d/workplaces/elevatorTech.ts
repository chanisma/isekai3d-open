import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { glowing, label, painted, picture, ring, seeded, text } from './doctor';
import * as E from './elevatorTechMotion';

/**
 * The 승강기 서비스센터 drawn as itself (2026-10-31 workplace pipeline): a workshop where a full-size
 * car hangs in a training hoistway, its doors parting and its counterweight running opposite it; a
 * machine room's worth of kit (the 권상기 on its bench, the 제어반, the 조속기 test stand, guide rails to
 * gauge), the parts cabinets, a monitoring room with its map wall and the stuck-passenger alarm, the
 * 정기검사 desk, and the service van loaded at its sliding door.
 *
 * 오름승강기 and every building and name on a screen are made up. Each piece's props and displays read
 * the same clock as the hands (elevatorTechMotion.ts): a tool's resting copy hides while it's held.
 */

const BRAND = '#1f6f8b';
const BRAND_D = '#14506a';
const SIGNAL = '#f2b632';
const INK = '#263238';
const STEEL = '#aeb9c0';
const CHROME = '#dde3e7';
const FRAME = '#5a6770';
const HAZARD = '#f4c20d';
const PAPER = '#f9f6ec';
const RED = '#d6402f';
const GREEN = '#3f9e62';
const ROPE = '#6e7478';
const BRASS = '#c9a24a';
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
type V = E.V;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const CO = '오름승강기';

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
  return g;
}
function place(m: THREE.Object3D, p: V | null) {
  m.visible = !!p;
  if (p) m.position.set(p[0], p[1], p[2]);
}
function use(g: THREE.Object3D, motion: E.EtMotion, x: number, z: number, sit = false): Spot {
  const s = spot(g, sit ? 'sit' : 'stand', x, sit ? 0.48 : 0, z, Math.PI, sit ? 0.48 : undefined);
  s.motion = motion;
  s.work = marker(g, 0, 1, 0);
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function current(list: Spot[], t: number): Spot | null {
  return list.filter((s) => Math.abs(t - posedAt(s)) < 0.6).sort((a, b) => posedAt(b) - posedAt(a))[0] ?? null;
}
function now(s: Spot, t: number) {
  return E.etNow(s.motion as E.EtMotion, t, E.etPhase(s.work!.getWorldPosition(tmp)), (s.at.userData.height as number | undefined) ?? 1.6);
}
function stretch(g: THREE.Object3D, color: string, radius = 0.01) {
  const m = part(g, cyl(radius, radius, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a: V, b: V) => {
    d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    m.position.set(a[0] + d.x / 2, a[1] + d.y / 2, a[2] + d.z / 2);
    m.scale.y = Math.max(0.001, d.length());
    if (d.lengthSq() > 1e-9) m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
function lit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
/** A picture whose texture is swapped as the work goes on. */
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t: THREE.Texture) => {
      if (mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
function flatPic(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0) {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.set(-Math.PI / 2, ry, 0, 'YXZ');
  return m;
}
const ledCache = new Map<string, THREE.Texture>();
/** A little LED read-out. */
function ledTex(s: string, color = '#ff5a3c', bg = '#160808', w = 128, h = 48): THREE.Texture {
  const k = `${s}|${color}|${bg}|${w}|${h}`;
  let t = ledCache.get(k);
  if (!t) {
    t = painted(`etLed|${k}`, w, h, (c) => {
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
      text(c, s, w / 2, h / 2 + 1, Math.round(h * 0.62), color, 'center');
    });
    ledCache.set(k, t);
  }
  return t;
}
const sheetTex = (key: string, title: string, lines: string[], head = '#37474f') =>
  painted(key, 128, 170, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 170);
    c.fillStyle = head;
    c.fillRect(0, 0, 128, 28);
    text(c, title, 64, 15, 15, '#ffffff', 'center');
    lines.forEach((s, i) => {
      text(c, s, 8, 42 + i * 18, 11, '#37474f');
      c.fillStyle = '#b0bec5';
      c.fillRect(8, 50 + i * 18, 112, 1);
    });
  });
function clipboard(g: THREE.Object3D, tex: THREE.Texture, p: V) {
  const m = group(g, p[0], p[1], p[2]);
  part(m, rbox(0.17, 0.012, 0.23, 0.004), '#8d6e63', 0, 0, 0);
  flatPic(m, tex, 0.15, 0.2, 0, 0.0075, 0.005);
  part(m, rbox(0.07, 0.012, 0.02, 0.004), CHROME, 0, 0.012, -0.1);
  return m;
}
function feeler() {
  const g = new THREE.Group();
  part(g, rbox(0.03, 0.02, 0.09, 0.006), '#b71c1c', 0, 0, 0.0);
  for (let i = 0; i < 4; i++) part(g, box(0.018, 0.002, 0.1), CHROME, 0, 0.002 + i * 0.002, -0.08, { ry: i * 0.08, outline: false });
  return g;
}
function wrench(color = '#cfd8dc') {
  const g = new THREE.Group();
  part(g, box(0.024, 0.012, 0.18), color, 0, 0, -0.04);
  part(g, cyl(0.024, 0.024, 0.014, 10), color, 0, 0, -0.14);
  part(g, rbox(0.03, 0.02, 0.09, 0.006), '#c62828', 0, 0, 0.03);
  return g;
}
/** A test meter: the box in the left hand's reach, two probes. */
function meter(p: V) {
  const g = new THREE.Group();
  g.position.set(p[0], p[1], p[2]);
  part(g, rbox(0.09, 0.03, 0.15, 0.012), '#f9a825', 0, 0, 0);
  part(g, box(0.06, 0.003, 0.05), '#b9f6ca', 0, 0.016, -0.03, { outline: false });
  part(g, cyl(0.016, 0.016, 0.012, 12), INK, 0, 0.02, 0.03);
  return g;
}
function probe(color: string) {
  const g = new THREE.Group();
  part(g, cyl(0.009, 0.009, 0.1, 8), color, 0, 0, 0, { rx: Math.PI / 2 - 0.3, outline: false });
  rod(g, v3(0, 0.014, -0.048), v3(0, 0.03, -0.09), 0.0025, CHROME);
  return g;
}
function padlock(g: THREE.Object3D, x: number, y: number, z: number, color = RED) {
  const m = group(g, x, y, z);
  part(m, rbox(0.04, 0.035, 0.018, 0.005), color, 0, 0, 0);
  part(m, ring(0.012, 0.0025, Math.PI), CHROME, 0, 0.018, 0);
  return m;
}
function dangerTag(g: THREE.Object3D, x: number, y: number, z: number) {
  const m = group(g, x, y, z);
  part(m, box(0.085, 0.13, 0.002), '#fff', 0, 0, 0, { outline: false });
  label(m, '정비 중', 0.08, 0.035, 0, 0.038, 0.002, RED, '#ffffff');
  label(m, '조작 금지', 0.076, 0.022, 0, -0.008, 0.002, '#ffffff', RED);
  part(m, ring(0.008, 0.0015), CHROME, 0, 0.056, 0.002);
  return m;
}
function hazardStrip(g: THREE.Object3D, w: number, x: number, y: number, z: number, h = 0.05) {
  part(g, box(w, h, 0.004), HAZARD, x, y, z, { outline: false });
  const n = Math.floor(w / 0.1);
  for (let i = 0; i < n; i++) part(g, box(0.035, h * 0.98, 0.005), INK, x - w / 2 + 0.05 + i * (w / n), y, z, { rz: 0.5, outline: false });
}
function swivel(g: THREE.Object3D, seat = 0.47, color = BRAND_D) {
  part(g, cyl(0.035, 0.035, seat - 0.1, 8), INK, 0, (seat - 0.1) / 2 + 0.04, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(g, box(0.04, 0.03, 0.26), INK, Math.sin(a) * 0.12, 0.05, Math.cos(a) * 0.12, { ry: a, outline: false });
    part(g, ball(0.025), INK, Math.sin(a) * 0.24, 0.025, Math.cos(a) * 0.24, { outline: false });
  }
  part(g, rbox(0.46, 0.08, 0.44, 0.04), color, 0, seat - 0.04, 0);
  part(g, rbox(0.44, 0.46, 0.07, 0.04), color, 0, seat + 0.3, -0.22, { rx: -0.08 });
}

// ---------------------------------------------------------------------------------------------
// A senior drawn in beside the trainee.

function senior(parent: THREE.Object3D, x: number, z: number, ry: number) {
  const root = group(parent, x, 0, z, ry);
  const coat = BRAND;
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, '#37474f');
    part(root, rbox(0.09, 0.07, 0.2, 0.03), INK, sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), '#37474f', 0, 0.88, 0);
  part(root, rbox(0.35, 0.47, 0.21, 0.08), coat, 0, 1.11, 0);
  part(root, box(0.33, 0.03, 0.215), SIGNAL, 0, 1.02, 0, { outline: false });
  label(root, CO, 0.14, 0.03, 0.08, 1.24, 0.107, BRAND, '#ffffff');
  part(root, cyl(0.045, 0.05, 0.08, 10), '#eac09a', 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), '#eac09a', 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), INK, sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.122), SIGNAL, 0, 0.04, -0.01);
  part(head, box(0.2, 0.02, 0.1), SIGNAL, 0, 0.03, 0.09, { outline: false });
  const shoulder = (sx: number) => v3(sx * 0.21, 1.32, 0);
  const armOf = (sx: number) => {
    const up = stretch(root, coat, 0.04);
    const lo = stretch(root, coat, 0.034);
    const hand = part(root, ball(0.036), '#eac09a', 0, 0, 0, { outline: false });
    return (to: V) => {
      const s = shoulder(sx);
      const mid: V = [(s.x + to[0]) / 2 + sx * 0.05, (s.y + to[1]) / 2 - 0.08, (s.z + to[2]) / 2];
      up([s.x, s.y, s.z], mid);
      lo(mid, to);
      hand.position.set(to[0], to[1], to[2]);
    };
  };
  const armL = armOf(1);
  const armR = armOf(-1);
  armL([0.23, 0.84, 0.06]);
  armR([-0.23, 0.84, 0.06]);
  return { root, head, armL, armR };
}

// =============================================================================================
// The training hoistway.

const hallTex = painted('etHall', 128, 64, (c) => {
  c.fillStyle = '#10161a';
  c.fillRect(0, 0, 128, 64);
  text(c, '1호기', 64, 32, 24, '#ffd54f', 'center');
});
const inspectionTex = painted('etLicence', 160, 110, (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 160, 110);
  c.fillStyle = BRAND;
  c.fillRect(0, 0, 160, 22);
  text(c, '승강기 안전검사 합격', 80, 12, 13, '#ffffff', 'center');
  ['고유번호 0000-777', '적재 1,000kg 15인', '정격 105m/min', '차기검사 D-92'].forEach((s, i) => text(c, s, 10, 38 + i * 18, 12, '#37474f'));
});
const manualTex = sheetTex('etManual', '승강기 구조', ['권상기·시브', '주 로프', '균형추', '비상정지·조속기', '완충기', '도어 장치'], BRAND);
const checkTex = sheetTex('etCheck', '도어 조정표', ['문턱 틈새 □', '도어 슈 □', '광전 장치 □', '닫힘력 □'], BRAND_D);

/**
 * A full-size car in an open steel hoistway: a stainless landing wall with parting doors, the hall
 * button and read-out, and inside the lit car (mirror, handrail, its button panel). Behind and above,
 * the frame, the rails, the top sheave, real ropes down to the car's crosshead and over to the
 * counterweight on the left, with its spring buffer at the bottom. Practising (practiceRepair): the
 * hall button called, the feeler gauge along the sill, the door shoe adjusted with a spanner, the doors
 * closed and a hand put across the photo-eye so they reverse, shut, the tag signed. Learning
 * (learnParts): a senior beside them points out the ropes while the car rises and the counterweight
 * falls, each part's tag lit in turn; the dweller follows in the manual.
 */
const elevatorMockup: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const F = E.MK.face;
  // Pit plate and the yellow line.
  part(g, box(2, 0.04, 2), '#7c868c', 0, 0.02, 0, { outline: false });
  // The frame.
  for (const [x, z] of [[-0.95, -0.92], [0.95, -0.92], [-0.95, 0.66], [0.95, 0.66]] as const) part(g, box(0.09, 2.95, 0.09), FRAME, x, 1.475, z);
  for (const y of [1.0, 2.05, 2.92]) {
    for (const x of [-0.95, 0.95]) part(g, box(0.05, 0.05, 1.58), FRAME, x, y, -0.13, { outline: false });
    part(g, box(1.9, 0.05, 0.05), FRAME, 0, y, -0.92, { outline: false });
  }
  // A brace across each side and the safety mesh.
  for (const sx of [-1, 1]) {
    rod(g, v3(sx * 0.95, 0.1, -0.9), v3(sx * 0.95, 1.0, 0.64), 0.015, FRAME);
    rod(g, v3(sx * 0.95, 1.0, -0.9), v3(sx * 0.95, 2.05, 0.64), 0.015, FRAME);
  }
  // Car guide rails (yellow-brown oiled T-section), at either side of the car.
  for (const sx of [-1, 1]) {
    part(g, box(0.04, 2.85, 0.08), '#8d8678', sx * 0.72, 1.45, -0.1);
    part(g, box(0.09, 2.85, 0.015), '#6d675b', sx * 0.72, 1.45, -0.1, { outline: false });
    for (const y of [0.5, 1.5, 2.5]) part(g, box(0.23, 0.05, 0.06), FRAME, sx * 0.84, y, -0.1, { outline: false });
  }
  // The counterweight's rails, at the back left, and its spring buffer in the pit.
  for (const dz of [-0.28, 0.28]) part(g, box(0.05, 2.8, 0.03), '#7a7468', -0.84, 1.42, -0.42 + dz);
  part(g, cyl(0.1, 0.1, 0.03, 12), INK, -0.84, 0.055, -0.42);
  const buffer = group(g, -0.84, 0.07, -0.42);
  for (let i = 0; i < 6; i++) part(buffer, new THREE.TorusGeometry(0.06, 0.012, 6, 16), HAZARD, 0, 0.035 + i * 0.045, 0, { rx: Math.PI / 2, outline: false });
  part(buffer, cyl(0.07, 0.07, 0.03, 12), INK, 0, 0.3, 0);
  // Counterweight: filler slabs in a frame.
  const cwt = group(g);
  const cwtY = (c: number) => 1.72 - 0.44 * c;
  part(cwt, box(0.13, 1.04, 0.5), FRAME, 0, 0, 0);
  for (let i = 0; i < 8; i++) part(cwt, box(0.1, 0.1, 0.44), i % 2 ? '#4f5a61' : '#5d6971', 0, -0.42 + i * 0.12, 0, { outline: false });
  label(cwt, '균형추', 0.3, 0.07, 0.078, 0, 0, HAZARD, INK, Math.PI / 2);
  cwt.position.set(-0.84, cwtY(0), -0.42);
  // The car.
  const car = group(g);
  part(car, box(1.24, 0.05, 1.2), STEEL, 0, 0.13, -0.08);
  part(car, box(1.24, 0.004, 1.2), '#54636b', 0, 0.156, -0.08, { outline: false });
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) part(car, box(0.24, 0.002, 0.24), '#cfd8dc', -0.48 + i * 0.24, 0.159, -0.56 + j * 0.24, { outline: false });
  const wall = '#c8d1d6';
  part(car, box(1.24, 2.13, 0.03), wall, 0, 1.21, -0.69);
  for (const sx of [-1, 1]) {
    part(car, box(0.03, 2.13, 1.22), wall, sx * 0.62, 1.21, -0.08);
    for (let i = 0; i < 3; i++) part(car, box(0.002, 2.1, 0.008), '#9aa6ad', sx * 0.604, 1.21, -0.46 + i * 0.4, { outline: false });
  }
  part(car, box(1.24, 0.03, 1.22), wall, 0, 2.28, -0.08);
  part(car, box(0.34, 0.86, 0.008), '#e7f3fa', 0, 1.3, -0.67, { outline: false });
  for (const sx of [-1, 1]) part(car, box(0.012, 0.03, 1.0), BRASS, sx * 0.565, 0.98, -0.1, { outline: false });
  part(car, box(1.0, 0.03, 0.012), BRASS, 0, 0.98, -0.635, { outline: false });
  // The ceiling light.
  const ceil = lit(car, box(0.76, 0.012, 0.5), '#55606a', 0, 2.26, -0.06);
  // The car's own button panel.
  part(car, box(0.26, 0.78, 0.012), '#e0e6e9', 0.42, 1.2, 0.545, { outline: false });
  for (let i = 0; i < 6; i++) lit(car, cyl(0.016, 0.016, 0.006, 10), i === 1 ? '#ffd54f' : '#90a4ae', 0.36 + (i % 2) * 0.1, 1.05 + Math.floor(i / 2) * 0.09, 0.536).rotation.x = Math.PI / 2;
  part(car, box(0.1, 0.05, 0.004), RED, 0.41, 1.4, 0.536, { outline: false });
  label(car, '비상 인터폰', 0.13, 0.03, 0.41, 0.93, 0.536, '#e0e6e9', INK, Math.PI);
  // Car doors behind the landing doors, and the crosshead on top.
  const carDoors = [group(car), group(car)];
  for (const d of carDoors) part(d, box(0.46, 2.05, 0.02), '#d4dbe0', 0, 1.2, 0.585);
  part(car, box(1.24, 0.1, 0.1), FRAME, 0, 2.36, -0.1);
  part(car, cyl(0.05, 0.05, 0.12, 12), INK, 0, 2.47, -0.1);
  for (const sx of [-1, 1]) part(car, box(0.06, 0.36, 0.1), HAZARD, sx * 0.62, 2.48, -0.1);
  label(car, 'CAR TOP', 0.24, 0.05, 0, 2.36, -0.044, FRAME, '#ffffff');
  // The landing wall, either side of the opening and above it.
  const panelC = '#d1d8dd';
  for (const sx of [-1, 1]) {
    part(g, box(0.52, 2.13, 0.05), panelC, sx * 0.74, 1.09, F - 0.02);
    part(g, box(0.05, 2.08, 0.07), '#adb7be', sx * 0.48, 1.06, F);
  }
  part(g, box(2, 0.56, 0.05), panelC, 0, 2.4, F - 0.02);
  part(g, box(1.0, 0.05, 0.07), '#adb7be', 0, 2.1, F);
  // Sill.
  part(g, box(1.02, 0.05, 0.12), '#8f9aa1', 0, 0.075, F - 0.02);
  part(g, box(0.92, 0.008, 0.012), INK, 0, 0.102, F + 0.01, { outline: false });
  // Landing doors.
  const doorL = group(g);
  const doorR = group(g);
  part(doorL, rbox(0.46, 2.0, 0.025, 0.004), '#e5eaed', 0, 1.09, F + 0.005);
  part(doorR, rbox(0.46, 2.0, 0.025, 0.004), '#e5eaed', 0, 1.09, F + 0.005);
  part(doorL, box(0.012, 2.0, 0.03), '#a4aeb5', 0.228, 1.09, F + 0.008, { outline: false });
  part(doorR, box(0.012, 2.0, 0.03), '#a4aeb5', -0.228, 1.09, F + 0.008, { outline: false });
  label(doorL, CO, 0.3, 0.06, 0.03, 1.5, F + 0.02, '#e5eaed', BRAND);
  // The door shoe (guide), low on the left leaf; turned as it's adjusted.
  const shoe = group(g, E.MK.shoe[0], 0.13, F + 0.03);
  part(shoe, rbox(0.1, 0.03, 0.03, 0.006), INK, 0, 0, 0);
  // Photo-eye beam.
  const beam = lit(g, box(0.9, 0.006, 0.006), '#ff5252', 0, 1.08, F + 0.05);
  // Hall station: the read-out above, the button plate.
  part(g, rbox(0.46, 0.15, 0.03, 0.006), INK, 0, 2.3, F + 0.015);
  const ind = swapPic(g, 0.42, 0.12, 0, 2.3, F + 0.033);
  part(g, rbox(0.12, 0.26, 0.015, 0.005), '#bcc6cc', E.MK.button[0], E.MK.button[1], F + 0.01);
  const callLamp = lit(g, cyl(0.024, 0.024, 0.012, 14), '#6d7a80', E.MK.button[0], E.MK.button[1] + 0.06, F + 0.022);
  callLamp.rotation.x = Math.PI / 2;
  const closeLamp = lit(g, cyl(0.024, 0.024, 0.012, 14), '#6d7a80', E.MK.button[0], E.MK.button[1] - 0.05, F + 0.022);
  closeLamp.rotation.x = Math.PI / 2;
  label(g, '▲', 0.03, 0.025, E.MK.button[0], E.MK.button[1] + 0.105, F + 0.019, '#bcc6cc', INK);
  // Plates on the wall.
  picture(g, inspectionTex, 0.32, 0.22, 0.66, 1.72, F + 0.006);
  label(g, '정원 15인 · 1,000kg', 0.4, 0.07, -0.72, 1.82, F + 0.006, '#e5eaed', INK);
  label(g, '1호기', 0.36, 0.12, -0.5, 2.52, F + 0.006, BRAND, '#ffffff');
  // The shaft's walls (2026-11-04): a building's lift is in the wall, only its landing showing; the rig behind is shut in.
  for (const sx of [-1, 1]) part(g, box(0.08, 3.1, F + 1.02), '#e9e3d6', sx * 1.04, 1.55, (F - 1.02) / 2 - 0.0);
  part(g, box(2.16, 0.08, F + 1.02), '#e9e3d6', 0, 3.06, (F - 1.02) / 2);
  for (const sx of [-1, 1]) part(g, box(0.3, 3.1, 0.06), '#e9e3d6', sx * 0.88, 1.55, F - 0.06);
  part(g, box(2.16, 0.5, 0.06), '#e9e3d6', 0, 2.85, F - 0.06);
  hazardStrip(g, 2, 0, 0.05, F + 0.1, 0.07);
  // The part tags, lit as they're named.
  const tagRope = swapPic(g, 0.3, 0.09, 0.62, 2.28, F + 0.012);
  const tagCwt = swapPic(g, 0.3, 0.09, -0.72, 2.28, F + 0.012);
  const tagBuf = swapPic(g, 0.3, 0.09, -0.72, 0.42, F + 0.012);
  // Top: the sheave and its beam, and the ropes that run from it.
  part(g, box(1.84, 0.1, 0.12), FRAME, -0.04, 2.8, -0.26);
  const sheave = group(g, -0.42, 2.92, -0.26);
  part(sheave, cyl(0.16, 0.16, 0.08, 24), '#3f474d', 0, 0, 0, { rz: Math.PI / 2, rx: 0, ry: Math.PI / 2 });
  for (let i = 0; i < 4; i++) part(sheave, box(0.02, 0.3, 0.012), '#8d99a0', 0, 0, 0.042, { rz: (i * Math.PI) / 4, outline: false });
  const ropes = [-0.022, 0, 0.022].map(() => [stretch(g, ROPE, 0.006), stretch(g, ROPE, 0.006), stretch(g, ROPE, 0.006)]);
  const setRopes = (c: number) => {
    const carY = 0.35 * c;
    ropes.forEach(([a, b, d], i) => {
      const dz = -0.024 + i * 0.024;
      a([0, 2.53 + carY, -0.1 + dz], [-0.27, 2.94, -0.26 + dz]);
      b([-0.27, 2.94, -0.26 + dz], [-0.58, 2.94, -0.26 + dz]);
      d([-0.58, 2.94, -0.26 + dz], [-0.84, cwtY(c) + 0.52, -0.42 + dz]);
    });
    car.position.y = carY;
    cwt.position.y = cwtY(c);
  };
  setRopes(0);
  // The shelf of tools and the tag on the wall.
  part(g, box(0.24, 0.015, 0.12), '#78909c', E.MK.tray[0], E.MK.tray[1] - 0.04, E.MK.tray[2] - 0.05, { outline: false });
  part(g, box(0.22, 0.04, 0.008), '#78909c', E.MK.tray[0], E.MK.tray[1] - 0.02, E.MK.tray[2] + 0.005, { outline: false });
  const gaugeRest = feeler();
  g.add(gaugeRest);
  place(gaugeRest, E.add(E.MK.tray, -0.04, -0.018, -0.05));
  const spannerRest = wrench();
  g.add(spannerRest);
  place(spannerRest, E.add(E.MK.tray, 0.07, -0.022, -0.05));
  const gaugeHeld = feeler();
  g.add(gaugeHeld);
  const spannerHeld = wrench();
  g.add(spannerHeld);
  const tag = group(g, E.MK.tag[0], E.MK.tag[1], F + 0.006);
  part(tag, box(0.2, 0.26, 0.004), '#ffffff', 0, 0, 0, { outline: false });
  picture(tag, checkTex, 0.18, 0.24, 0, 0, 0.003);
  const signed = lit(tag, box(0.14, 0.03, 0.002), '#43a047', 0, -0.09, 0.004);
  signed.visible = false;
  const pen = group(g);
  part(pen, cyl(0.007, 0.007, 0.13, 8), BRAND, 0, 0, 0, { rx: 1.0, outline: false });
  // The manual (in the hand for learning), the senior.
  const book = group(g);
  part(book, rbox(0.3, 0.015, 0.21, 0.004), '#fff', 0, 0, 0);
  flatPic(book, manualTex, 0.13, 0.19, -0.075, 0.009, 0);
  flatPic(book, manualTex, 0.13, 0.19, 0.075, 0.009, 0);
  const mentor = senior(g, -0.62, 1.24, 0.3);
  mentor.root.visible = false;
  // The uses.
  const practice = use(g, 'etPractice', E.MK.stand[0], E.MK.stand[1]);
  const learn = use(g, 'etLearn', E.MK.stand[0], E.MK.stand[1]);
  out.spots = { practiceRepair: practice, elevatorTech_learnParts: learn, '*': practice };
  out.work = practice.work;
  let door = 0;
  out.away = (_o, t) => {
    const s = current([practice, learn], t);
    const a = s ? now(s, t) : null;
    const k = a?.b.key;
    const u = a?.b.u ?? 0;
    const isP = s === practice;
    door = isP && a ? E.mkDoor(k!, u) : door * 0.9;
    const off = 0.46 * door;
    doorL.position.x = -0.23 - off;
    doorR.position.x = 0.23 + off;
    carDoors[0].position.x = -0.23 - off;
    carDoors[1].position.x = 0.23 + off;
    setLit(ceil, door > 0.03 || s === learn ? '#fff8e1' : '#55606a');
    // Learning: the car goes up and down.
    const c = s === learn && a ? E.mkCar(k!, u) : car.position.y / 0.35;
    setRopes(s === learn ? c : c * 0.92);
    sheave.rotation.z = -c * 4;
    const named = (s0: string, on: boolean) => ledTex(s0, '#ffffff', on ? '#e65100' : '#3c4750', 128, 40);
    // The parts' tags show only while they're being learnt.
    for (const tg of [tagRope, tagCwt, tagBuf]) tg.mesh.visible = s === learn;
    tagRope.set(named('주 로프', k === 'rope'));
    tagCwt.set(named('균형추', k === 'cwt'));
    tagBuf.set(named('완충기', k === 'pit'));
    // The hall panel.
    setLit(callLamp, isP && (k === 'call' ? u > 0.12 : false) ? '#ffcf40' : '#6d7a80');
    setLit(closeLamp, isP && k === 'close' ? '#ffcf40' : '#6d7a80');
    const eye = isP && k === 'eye' && u > 0.1 && u < 0.75;
    beam.visible = !!isP && (k === 'close' || k === 'eye');
    setLit(beam, eye ? '#ff1744' : '#ffcdd2');
    // The read-out.
    if (isP && k === 'eye' && eye) ind.set(ledTex('광전 감지', '#ff5252'));
    else if (s === learn) ind.set(ledTex(c > 0.5 ? '▲ 2F' : '1F', '#ffd54f', '#10161a'));
    else if (isP && door > 0.05) ind.set(ledTex('1F 열림', '#7cffb2', '#10161a'));
    else ind.set(hallTex);
    // The gauge and spanner.
    gaugeHeld.visible = false;
    spannerHeld.visible = false;
    gaugeRest.visible = spannerRest.visible = true;
    if (isP && a && (k === 'tool' ? u > 0.45 : k === 'sill')) {
      place(gaugeHeld, a.r);
      gaugeRest.visible = false;
    }
    if (isP && a && (k === 'shoe' || (k === 'sill' && u > 0.96))) {
      place(spannerHeld, a.r);
      spannerRest.visible = false;
      spannerHeld.rotation.y = 0.5 * Math.sin(t * 8);
      shoe.rotation.z = 0.05 * Math.sin(t * 6);
    } else shoe.rotation.z = 0;
    // The tag signed; the pen in the hand.
    signed.visible = !!(isP && (k === 'tag' && u > 0.6));
    pen.visible = !!(a && ((isP && k === 'tag') || (s === learn && k === 'note')));
    if (pen.visible) pen.position.set(a!.r[0], a!.r[1], a!.r[2]);
    // The manual and the senior.
    book.visible = s === learn && !!a;
    if (book.visible) {
      const bk = E.lerp(a!.l, a!.r, 0.5);
      book.position.set(k === 'read' || k === 'note' ? bk[0] : a!.l[0] + 0.1, (k === 'read' || k === 'note' ? bk[1] : a!.l[1] + 0.0) - 0.01, k === 'read' || k === 'note' ? bk[2] : a!.l[2]);
      book.rotation.x = 0.35;
    }
    mentor.root.visible = s === learn;
    if (s === learn && a) {
      const pt: V | null = k === 'rope' ? [0.32, 1.92, -0.55] : k === 'cwt' ? [0.12, 1.72, -0.5] : k === 'pit' ? [0.06, 0.68, -0.42] : k === 'door' ? [0.45, 1.38, -0.32] : null;
      mentor.armL(pt ?? [0.23, 0.84, 0.06]);
      mentor.head.rotation.x = k === 'pit' ? 0.4 : k === 'rope' ? -0.4 : 0;
      mentor.head.rotation.y = k === 'read' || k === 'note' ? -0.9 : 0;
    }
  };
};

// =============================================================================================
// The 권상기 bench.

const faultTex = ledTex('E-21', '#ff5a3c');
const okTex = ledTex('정상', '#7cffb2', '#061a10');
const runTex = ledTex('운전', '#ffd54f', '#10161a');
const faultCard = painted('etFaultCard', 192, 128, (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 192, 128);
  c.fillStyle = '#b71c1c';
  c.fillRect(0, 0, 192, 24);
  text(c, '고장 코드 일람', 96, 13, 15, '#ffffff', 'center');
  [['E-11', '도어 스위치'], ['E-21', '브레이크 릴레이'], ['E-32', '과부하'], ['E-40', '안전 회로']].forEach(([a, b], i) => {
    text(c, a, 10, 42 + i * 20, 12, i === 1 ? '#c62828' : '#37474f');
    text(c, b, 60, 42 + i * 20, 12, i === 1 ? '#c62828' : '#37474f');
  });
});
/**
 * A heavy steel bench carrying a real 권상기 (the green motor, its brake drum and shoes under a yellow
 * cover, the grooved sheave with ropes on it, the tacho) and, to the right, a reel of new rope and a
 * training control board with its fault read-out and relay row; a lock-out switch on the bench's face,
 * a bin for scrap rope, tools on the shadow board below.
 * Servicing (serviceMotor): locked out and tagged, the brake cover lifted off, the grease gun, a feeler
 * in the brake gap, the sheave turned by hand, a test run (it spins, the tacho climbs), written up.
 * The rope (replaceRope): the caliper on the old rope (worn), stripped off into the bin, new rope drawn
 * off the reel (it turns), seated groove by groove, clamped, tagged.
 * A fault (faultFind): E-21 on the board, the code card read, the meter's probes on the relay, the
 * burnt one pulled and a new one pressed in, reset, a test run, 정상.
 */
const motorBench: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const M = E.MB;
  const T = M.top;
  // The bench.
  part(g, rbox(1.98, 0.06, 0.92, 0.012), '#4f5b62', 0, T - 0.03, 0);
  part(g, box(1.96, 0.006, 0.9), '#6c7a82', 0, T + 0.002, 0, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.07, T - 0.06, 0.07), INK, sx * 0.92, (T - 0.06) / 2, sz * 0.4);
  part(g, box(1.86, 0.03, 0.74), INK, 0, 0.2, 0, { outline: false });
  // Front apron: the lock-out switch.
  part(g, box(1.94, 0.12, 0.02), '#39444a', 0, T - 0.11, 0.44);
  part(g, rbox(0.14, 0.14, 0.04, 0.008), RED, M.lock[0], M.lock[1], 0.44);
  part(g, rbox(0.03, 0.08, 0.03, 0.005), INK, M.lock[0], M.lock[1] + 0.0, 0.47);
  label(g, '주전원', 0.11, 0.028, M.lock[0], M.lock[1] + 0.1, 0.452, '#39444a', '#ffffff');
  const lockOn = group(g);
  padlock(lockOn, M.lock[0] + 0.03, M.lock[1] - 0.04, 0.485);
  dangerTag(lockOn, M.lock[0] + 0.03, M.lock[1] - 0.13, 0.49);
  // Below: a shelf of oil cans and tools.
  for (let i = 0; i < 4; i++) part(g, cyl(0.05, 0.05, 0.18, 12), i % 2 ? '#c62828' : '#2e7d32', -0.72 + i * 0.13, 0.31, 0.1);
  part(g, rbox(0.42, 0.16, 0.24, 0.02), RED, 0.1, 0.3, 0.12);
  part(g, box(0.2, 0.02, 0.02), CHROME, 0.1, 0.39, 0.12, { outline: false });
  for (let i = 0; i < 2; i++) part(g, rbox(0.3, 0.1, 0.24, 0.01), '#546e7a', 0.58, 0.27 + i * 0.11, 0.1);
  label(g, '권상기', 0.44, 0.07, -0.28, 0.72, 0.452, '#39444a', '#ffd54f');
  label(g, '고장 진단', 0.3, 0.07, 0.56, 0.72, 0.452, '#39444a', '#ffd54f');
  // The machine: motor on feet, gearbox, brake drum, sheave.
  const mx = -0.64;
  part(g, box(1.02, 0.05, 0.42), '#37474f', -0.34, T + 0.03, 0.02);
  for (const x of [mx - 0.14, mx + 0.14]) part(g, box(0.06, 0.12, 0.3), '#2e5d46', x, T + 0.1, 0.03);
  part(g, cyl(0.17, 0.17, 0.4, 24), '#2f7d5b', mx, T + 0.3, 0.03, { rz: Math.PI / 2 });
  for (let i = 0; i < 7; i++) part(g, box(0.36, 0.01, 0.34), '#266a4c', mx, T + 0.3, 0.03, { rx: (i * Math.PI) / 7, outline: false });
  part(g, cyl(0.17, 0.17, 0.04, 24), '#1f5a40', mx - 0.21, T + 0.3, 0.03, { rz: Math.PI / 2 });
  label(g, '11kW', 0.12, 0.04, mx, T + 0.5, 0.03, '#ffffff', INK).rotation.x = -Math.PI / 2;
  // Grease nipple, the brake drum and shoes.
  const G = M.grease;
  part(g, cyl(0.012, 0.012, 0.03, 8), BRASS, G[0], G[1] - 0.02, G[2] - 0.0, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.15, 0.15, 0.08, 24), CHROME, M.brake[0], T + 0.3, 0.03, { rz: Math.PI / 2 });
  for (const sy of [-1, 1]) {
    part(g, rbox(0.1, 0.05, 0.2, 0.01), '#607d8b', M.brake[0], T + 0.3 + sy * 0.17, 0.03);
    part(g, box(0.09, 0.012, 0.18), '#3e2723', M.brake[0], T + 0.3 + sy * 0.145, 0.03, { outline: false });
  }
  part(g, rbox(0.14, 0.03, 0.03, 0.006), RED, M.brake[0], T + 0.47, 0.17);
  // The yellow cover over the brake (lifted off to get at it).
  const cover = group(g);
  part(cover, rbox(0.2, 0.09, 0.3, 0.02), SIGNAL, 0, 0, 0);
  part(cover, rbox(0.15, 0.015, 0.02, 0.004), INK, 0, 0.05, 0.12);
  label(cover, '브레이크', 0.13, 0.03, 0, 0.01, 0.152, SIGNAL, INK);
  // The sheave on its shaft.
  const S = M.sheave;
  part(g, rbox(0.1, 0.42, 0.2, 0.01), '#4a5359', S[0] - 0.05, T + 0.22, S[2] - 0.08);
  const sheave = group(g, S[0], S[1], S[2]);
  part(sheave, cyl(M.sheaveR, M.sheaveR, 0.12, 32), '#2f3438', 0, 0, 0, { rx: Math.PI / 2 });
  part(sheave, cyl(M.sheaveR * 0.72, M.sheaveR * 0.72, 0.126, 32), '#525c63', 0, 0, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 4; i++) part(sheave, new THREE.TorusGeometry(M.sheaveR - 0.004, 0.006, 6, 32), '#191c1e', 0, 0, -0.04 + i * 0.027, { outline: false });
  for (let i = 0; i < 6; i++) part(sheave, box(0.02, M.sheaveR * 0.68, 0.01), HAZARD, 0, M.sheaveR * 0.36, 0.066, { rz: (i * Math.PI) / 3, outline: false });
  // The ropes on it (old grey or new bright), drawn round its top half.
  const makeArc = (color: string, r = 0.008) => {
    const a = group(g, S[0], S[1], S[2]);
    for (let i = 0; i < 3; i++) part(a, new THREE.TorusGeometry(M.sheaveR + 0.002, r, 6, 28, Math.PI), color, 0, 0, -0.03 + i * 0.03, { outline: false });
    return a;
  };
  const oldRope = makeArc('#5c5148');
  const newRope = makeArc('#c9d0d4');
  newRope.visible = false;
  const strand = stretch(g, '#c9d0d4', 0.009);
  const strandOld = stretch(g, '#5c5148', 0.009);
  // The rope's dead-end clamp, below the sheave.
  part(g, rbox(0.14, 0.06, 0.06, 0.01), CHROME, S[0] - 0.08, S[1] - 0.26, S[2] + 0.16);
  // The reel.
  const reelAt = M.reel;
  part(g, box(0.04, 0.2, 0.2), INK, reelAt[0] - 0.13, T + 0.1, reelAt[2]);
  part(g, box(0.04, 0.2, 0.2), INK, reelAt[0] + 0.13, T + 0.1, reelAt[2]);
  const reel = group(g, reelAt[0], reelAt[1], reelAt[2]);
  for (const sx of [-1, 1]) part(reel, cyl(0.17, 0.17, 0.015, 24), '#b5894f', sx * 0.1, 0, 0, { rz: Math.PI / 2 });
  part(reel, cyl(0.12, 0.12, 0.2, 24), '#c9d0d4', 0, 0, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < 6; i++) part(reel, new THREE.TorusGeometry(0.122, 0.006, 6, 24), '#9aa4aa', -0.08 + i * 0.032, 0, 0, { ry: Math.PI / 2, outline: false });
  part(reel, box(0.012, 0.34, 0.03), '#7a5a30', 0.11, 0, 0, { outline: false });
  label(g, 'Φ12 로프', 0.26, 0.05, reelAt[0], T + 0.16, reelAt[2] + 0.11, '#ffffff', INK);
  // The scrap bin.
  const B = M.bin;
  part(g, box(0.2, 0.06, 0.16), '#78909c', B[0], T + 0.03, B[2]);
  const scrap = group(g);
  for (let i = 0; i < 2; i++) part(scrap, new THREE.TorusGeometry(0.06, 0.007, 6, 16), '#5c5148', B[0], T + 0.05 + i * 0.012, B[2], { rx: Math.PI / 2 + 0.2 * i, outline: false });
  // The control board on its stand.
  const BD = M.board;
  part(g, box(0.05, 0.4, 0.05), INK, BD[0] + 0.0, T + 0.17, BD[2] - 0.08);
  part(g, rbox(0.62, 0.6, 0.04, 0.008), '#dfe5e8', BD[0], BD[1] + 0.03, BD[2] - 0.06);
  // Relays in a row.
  const relays: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const x = M.relay[0] + i * 0.1 - 0.0;
    part(g, box(0.07, 0.02, 0.012), INK, x, M.relay[1] - 0.05, BD[2] - 0.036, { outline: false });
    const r = group(g, x, M.relay[1], BD[2] - 0.016);
    part(r, rbox(0.075, 0.09, 0.04, 0.006), i === 0 ? '#5d4037' : '#90a4ae', 0, 0, 0);
    part(r, box(0.05, 0.02, 0.002), '#ffffff', 0, 0.016, 0.021, { outline: false });
    relays.push(r);
  }
  // The burn mark on the bad one.
  const burn = part(relays[0], box(0.05, 0.03, 0.002), '#212121', 0, -0.02, 0.021, { outline: false });
  // Terminal strip, breakers, read-out, reset.
  for (let i = 0; i < 9; i++) part(g, box(0.03, 0.03, 0.012), i % 3 === 0 ? '#ef6c00' : '#90a4ae', BD[0] - 0.24 + i * 0.055, BD[1] - 0.17, BD[2] - 0.036, { outline: false });
  const fault = swapPic(g, 0.26, 0.1, BD[0] - 0.08, BD[1] + 0.24, BD[2] - 0.038);
  part(g, rbox(0.3, 0.13, 0.012, 0.004), '#1a1a1a', BD[0] - 0.08, BD[1] + 0.24, BD[2] - 0.046);
  part(g, cyl(0.03, 0.03, 0.02, 14), RED, M.reset[0], M.reset[1], BD[2] - 0.03, { rx: Math.PI / 2 });
  label(g, '리셋', 0.08, 0.025, M.reset[0], M.reset[1] - 0.05, BD[2] - 0.038, '#dfe5e8', INK);
  // The fault-code card, the relay box, the meter and its probes.
  flatPic(g, faultCard, 0.26, 0.17, M.card[0], T + 0.008, M.card[2]);
  part(g, rbox(0.16, 0.06, 0.1, 0.008), '#90a4ae', M.relayBox[0], T + 0.03, M.relayBox[2]);
  label(g, '릴레이', 0.1, 0.03, M.relayBox[0], T + 0.03, M.relayBox[2] + 0.052, '#90a4ae', '#ffffff');
  const meterBox = meter([M.xFault - 0.32, T + 0.02, 0.36]);
  g.add(meterBox);
  const probes = [probe('#d32f2f'), probe('#212121')];
  probes.forEach((p) => g.add(p));
  // The run button and tacho.
  part(g, rbox(0.14, 0.05, 0.1, 0.01), '#39444a', M.run[0], T + 0.025, M.run[2]);
  const runLamp = lit(g, cyl(0.022, 0.022, 0.015, 14), '#2c5e3f', M.run[0], T + 0.056, M.run[2]);
  const tacho = swapPic(g, 0.18, 0.07, S[0] + 0.02, T + 0.09, 0.32, 0, -0.4);
  part(g, rbox(0.2, 0.09, 0.06, 0.008), INK, S[0] + 0.02, T + 0.08, 0.3);
  // The record clipboard, grease gun, gauges.
  const clip = clipboard(g, sheetTex('etMotorLog', '권상기 정비', ['그리스 □', '브레이크 틈새 □', '시운전 □', '로프 □']), [M.clip[0], T + 0.012, M.clip[2]]);
  const pen = group(g);
  part(pen, cyl(0.007, 0.007, 0.13, 8), BRAND, 0, 0, 0, { rx: 1.0, outline: false });
  const gunRest: V = [M.xMotor - 0.34, T + 0.03, 0.34];
  const gun = group(g);
  part(gun, cyl(0.03, 0.03, 0.18, 12), '#c62828', 0, 0, 0.02, { rx: Math.PI / 2 });
  part(gun, cyl(0.006, 0.006, 0.12, 8), INK, 0, 0, -0.12, { rx: Math.PI / 2, outline: false });
  const gaugeRest = feeler();
  gaugeRest.position.set(M.xMotor - 0.14, T + 0.012, 0.33);
  g.add(gaugeRest);
  const gaugeHeld = feeler();
  g.add(gaugeHeld);
  const caliperRest: V = [M.xRope + 0.0, T + 0.012, 0.36];
  const caliper = group(g);
  part(caliper, box(0.2, 0.012, 0.024), CHROME, 0, 0, 0);
  part(caliper, box(0.012, 0.012, 0.05), CHROME, -0.09, 0, -0.03);
  part(caliper, box(0.012, 0.012, 0.05), CHROME, 0.03, 0, -0.03);
  part(caliper, rbox(0.05, 0.016, 0.03, 0.004), '#37474f', 0.03, 0.008, 0.01);
  const spanner = wrench();
  g.add(spanner);
  const spannerRest: V = [M.xRope + 0.22, T + 0.012, 0.37];
  const clampTag = group(g, S[0] - 0.06, S[1] - 0.33, S[2] + 0.19);
  part(clampTag, box(0.09, 0.05, 0.002), '#ffee58', 0, 0, 0, { outline: false });
  // The uses.
  const motor = use(g, 'etMotor', M.xMotor, M.z);
  const rope = use(g, 'etRope', M.xRope, M.z);
  const fix = use(g, 'etFault', M.xFault, M.z);
  out.spots = { serviceMotor: motor, elevatorTech_replaceRope: rope, elevatorTech_faultFind: fix, '*': motor };
  out.work = motor.work;
  let spin = 0;
  let turnSpeed = 0;
  out.away = (_o, t) => {
    const s = current([motor, rope, fix], t);
    const a = s ? now(s, t) : null;
    const k = a?.b.key;
    const u = a?.b.u ?? 0;
    const isM = s === motor;
    const isR = s === rope;
    const isF = s === fix;
    // Lock-out and cover.
    lockOn.visible = !!isM && !(k === 'run' || (k === 'note' && u > 0.1) || (k === 'lock' && u < 0.55));
    const off = isM && ['grease', 'gap', 'turn', 'run'].includes(k!);
    const held = isM && k === 'cover';
    if (held) place(cover, E.lerp(a!.l, a!.r, 0.5));
    else place(cover, off ? E.add(M.coverOff, 0, -0.03) : M.cover);
    cover.rotation.y = off ? 0.5 : 0;
    // Grease gun and gauge.
    if (isM && k === 'grease') {
      place(gun, E.add(a!.r, 0, 0, 0.1));
      gun.rotation.set(0, 0, 0);
    } else {
      place(gun, gunRest);
      gun.rotation.set(0, 0.5, 0);
    }
    gaugeHeld.visible = !!isM && k === 'gap';
    if (gaugeHeld.visible) place(gaugeHeld, a!.r);
    gaugeRest.visible = !gaugeHeld.visible;
    // The sheave: turned by hand, or running.
    const running = (isM && k === 'run' && u > 0.1) || (isF && k === 'run');
    turnSpeed = running ? Math.min(14, turnSpeed + 0.2) : turnSpeed * 0.94;
    if (isM && k === 'turn') spin = u * Math.PI * 1.3;
    else spin += turnSpeed / 60;
    sheave.rotation.z = -spin;
    setLit(runLamp, running ? '#6dff9e' : isM && k === 'run' ? '#b4f7c9' : '#2c5e3f');
    tacho.set(ledTex(running ? String(Math.round(turnSpeed * 8)).padStart(3, '0') : '000', '#7cffb2', '#061a10'));
    // The ropes, old off and new on.
    const o = isR ? k : null;
    const newOn = o === 'seat' ? u > 0.25 : o === 'clamp' || o === 'tag';
    const oldOn = !isR || o === 'gauge' || (o === 'strip' && u < 0.55);
    oldRope.visible = oldOn;
    newRope.visible = !!newOn;
    if (o === 'strip' && a) {
      strandOld(E.add(S, -0.18, 0.16, 0.08), a.r);
    } else strandOld([0, -1, 0], [0, -1, 0.001]);
    scrap.visible = !isR || o !== 'gauge';
    if ((o === 'pull' || o === 'seat') && a) strand(E.add(reelAt, -0.05, 0.1, 0.12), a.r);
    else strand([0, -1, 0], [0, -1, 0.001]);
    if (o === 'pull') reel.rotation.x = u * 7;
    else if (o === 'seat') reel.rotation.x = 7 + u * 3;
    clampTag.visible = !!isR && o === 'tag' && u > 0.5;
    // Caliper, spanner.
    if (o === 'gauge' && a) {
      place(caliper, a.r);
      caliper.rotation.set(0, 0, 0);
    } else {
      place(caliper, caliperRest);
      caliper.rotation.set(0, 0, 0);
    }
    if (o === 'clamp' && a) {
      place(spanner, a.r);
      spanner.rotation.y = 0.5 * Math.sin(t * 7);
    } else {
      place(spanner, spannerRest);
      spanner.rotation.y = 0.4;
    }
    // The fault at the board.
    const bad = isF && !['reset', 'run'].includes(k!) && !(k === 'fit' && u > 0.85);
    if (isF) fault.set(k === 'run' ? runTex : k === 'reset' && u > 0.4 ? okTex : bad && Math.sin(t * 8) > -0.4 ? faultTex : ledTex('', '#000', '#160808'));
    else if (isM && k === 'run') fault.set(runTex);
    else fault.set(okTex);
    const r0 = relays[0];
    const gone = isF && (k === 'out' ? u > 0.15 : k === 'fit' ? u < 0.75 : false);
    r0.visible = !gone;
    burn.visible = !!isF && (k === 'code' || k === 'table' || k === 'probe' || (k === 'out' && u <= 0.15));
    if (isF && a && k === 'out' && u > 0.15) {
      probes[0].visible = false;
    }
    // A relay in the fingers, the probes in both hands.
    probes.forEach((p) => (p.visible = false));
    if (isF && k === 'probe' && a) {
      place(probes[0], a.l);
      place(probes[1], a.r);
    }
    held0(heldRelay, gone && a ? a.r : null, k === 'out');
    // The pen on the note beat.
    pen.visible = !!isM && k === 'note';
    if (pen.visible) pen.position.set(a!.r[0], a!.r[1], a!.r[2]);
    clip.visible = true;
  };
  const heldRelay = group(g);
  part(heldRelay, rbox(0.075, 0.09, 0.04, 0.006), '#90a4ae', 0, 0, 0);
  const burntFace = part(heldRelay, box(0.05, 0.03, 0.002), '#212121', 0, -0.02, 0.021, { outline: false });
  function held0(m: THREE.Object3D, p: V | null, burnt: boolean) {
    place(m, p);
    burntFace.visible = burnt;
  }
};

// =============================================================================================
// The 제어반.

/**
 * A tall grey control cabinet with a key-locked door hung at its right; inside, a printed board with a
 * blinking inverter read-out, rows of contactors and relays, a terminal rail with coloured wires in
 * their trunking, the circuit diagram folded in the door. Beside it the 주전원 breaker, with a padlock
 * and a danger tag put on it first. Checking it (etPanelCheck): locked out, the door opened, the
 * meter's probes on the terminals (the read-out and meter come alive), the code read, each screw
 * nipped up with a driver, shut, unlocked.
 */
const etControlCabinet: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const C = E.CB;
  const zF = C.hinge[1];
  part(g, box(0.82, 0.08, 0.64), INK, 0, 0.04, -0.12);
  // A real shell, so the door shuts over what's inside: back, sides, top and bottom.
  part(g, box(0.82, 1.9, 0.03), '#b8c2c8', 0, 1.03, -0.43);
  for (const sx of [-1, 1]) part(g, box(0.03, 1.9, 0.6), '#b8c2c8', sx * 0.395, 1.03, -0.14);
  part(g, box(0.82, 0.03, 0.6), '#b8c2c8', 0, 1.965, -0.14);
  part(g, box(0.82, 0.03, 0.6), '#b8c2c8', 0, 0.095, -0.14);
  // The mounting plate, set back, with the boards on it.
  part(g, box(0.76, 1.8, 0.012), '#37474f', 0, 1.03, zF - 0.11);
  const P = group(g, 0, 0, zF - 0.1);
  part(P, box(0.68, 0.44, 0.006), '#1b5e20', 0, 1.46, 0.003, { outline: false });
  const seed = seeded(11);
  for (let i = 0; i < 26; i++) part(P, box(0.03 + seed() * 0.04, 0.02 + seed() * 0.03, 0.012), ['#37474f', '#90a4ae', '#ffb300', '#212121'][i % 4], -0.28 + (i % 7) * 0.09, 1.3 + Math.floor(i / 7) * 0.09 + 0.02, 0.012, { outline: false });
  part(P, rbox(0.24, 0.11, 0.015, 0.004), '#111', C.led[0], C.led[1], 0.012);
  const led = swapPic(P, 0.21, 0.08, C.led[0], C.led[1], 0.021);
  // Contactors.
  for (let i = 0; i < 5; i++) {
    part(P, rbox(0.11, 0.14, 0.06, 0.006), '#cfd8dc', -0.26 + i * 0.13, 1.08, 0.03);
    part(P, box(0.07, 0.03, 0.002), i === 2 ? '#ff7043' : '#546e7a', -0.26 + i * 0.13, 1.08, 0.061, { outline: false });
  }
  // Terminal rail, wire trunking.
  for (let i = 0; i < 14; i++) part(P, box(0.038, 0.05, 0.03), i % 4 === 0 ? '#1976d2' : '#90a4ae', -0.28 + i * 0.044, 0.86, 0.02, { outline: false });
  part(P, box(0.68, 0.05, 0.03), '#78909c', 0, 0.76, 0.02);
  for (let i = 0; i < 8; i++) rod(P, v3(-0.28 + i * 0.08, 0.79, 0.024), v3(-0.28 + i * 0.08, 0.84, 0.024), 0.005, ['#d32f2f', '#1976d2', '#fdd835', '#212121'][i % 4]);
  part(P, box(0.68, 0.05, 0.03), '#78909c', 0, 0.58, 0.02);
  part(P, rbox(0.3, 0.14, 0.05, 0.008), '#546e7a', 0, 0.42, 0.03);
  label(P, '전원 장치', 0.2, 0.04, 0, 0.42, 0.056, '#546e7a', '#ffffff');
  // The door.
  const hinge = group(g, C.hinge[0], 0, zF);
  const door = group(hinge, -C.door / 2, 0, 0);
  part(door, rbox(C.door, 1.76, 0.03, 0.006), '#c6cfd4', 0, 1.02, 0.01);
  part(door, box(C.door - 0.1, 1.6, 0.003), '#b4bec4', 0, 1.02, 0.027, { outline: false });
  part(door, rbox(0.04, 0.2, 0.05, 0.008), INK, -(C.grip - C.door / 2), C.gripY, 0.04);
  label(door, '제어반', 0.3, 0.09, 0, 1.6, 0.03, BRAND, '#ffffff');
  label(door, '⚡ 고압 위험', 0.3, 0.06, 0, 1.46, 0.03, HAZARD, INK);
  label(door, '승강기 1호기', 0.24, 0.05, 0, 1.34, 0.03, '#c6cfd4', INK);
  // The vent slats.
  for (let i = 0; i < 6; i++) part(door, box(0.34, 0.012, 0.004), '#7f8b92', 0, 0.3 + i * 0.03, 0.028, { outline: false });
  // The diagram folded inside the door (on its back).
  const diag = painted('etDiagram', 128, 160, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 160);
    c.strokeStyle = '#37474f';
    c.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(16, 20 + i * 22);
      c.lineTo(112, 20 + i * 22);
      c.stroke();
      c.strokeRect(50 + (i % 3) * 16, 14 + i * 22, 12, 12);
    }
    text(c, '회로도', 64, 148, 13, '#37474f', 'center');
  });
  picture(door, diag, 0.3, 0.4, 0, 1.0, -0.007, '#ffffff', Math.PI);
  // Breaker on the left side.
  const B = C.breaker;
  part(g, rbox(0.1, 0.26, 0.1, 0.01), '#546e7a', B[0], B[1], B[2]);
  const brkLever = part(g, rbox(0.03, 0.08, 0.03, 0.005), INK, B[0], B[1] + 0.03, B[2] + 0.06);
  const lockGroup = group(g);
  padlock(lockGroup, B[0], B[1] - 0.08, B[2] + 0.06);
  dangerTag(lockGroup, B[0] + 0.0, B[1] - 0.17, B[2] + 0.055);
  // Top: conduits to the ceiling, an ID plate.
  for (const x of [-0.25, 0, 0.25]) part(g, cyl(0.03, 0.03, 0.8, 10), '#78909c', x, 2.38, -0.2);
  // Meter and probes, screwdriver.
  const meterBox = meter([-0.34, 0.78, 0.38]);
  part(g, rbox(0.36, 0.04, 0.2, 0.006), '#607d8b', -0.3, 0.71, 0.32);
  part(g, cyl(0.02, 0.02, 0.71, 8), INK, -0.3, 0.355, 0.32, { outline: false });
  g.add(meterBox);
  meterBox.position.set(-0.33, 0.745, 0.32);
  const p1 = probe('#d32f2f');
  const p2 = probe('#212121');
  g.add(p1, p2);
  const driver = group(g);
  part(driver, cyl(0.014, 0.014, 0.1, 8), '#f9a825', 0, 0, 0.03, { rx: Math.PI / 2 });
  part(driver, cyl(0.004, 0.004, 0.12, 6), CHROME, 0, 0, -0.08, { rx: Math.PI / 2, outline: false });
  const driverRest: V = [-0.22, 0.74, 0.32];
  const inner = lit(g, box(0.6, 0.01, 0.02), '#454f55', 0, 1.82, zF + 0.04);
  const check = use(g, 'etCabinet', C.stand[0], C.stand[1]);
  out.spots = { etPanelCheck: check, '*': check };
  out.work = check.work;
  let swing = 0;
  out.away = (_o, t) => {
    const a = current([check], t) ? now(check, t) : null;
    const k = a?.b.key;
    const u = a?.b.u ?? 0;
    swing = a ? E.cbDoor(k!, u) : swing * 0.9;
    hinge.rotation.y = swing;
    setLit(inner, swing > 0.2 ? '#fff3c4' : '#454f55');
    lockGroup.visible = !!a && !(k === 'lock' && u < 0.5) && !(k === 'unlock' && u > 0.5);
    brkLever.position.y = B[1] + (lockGroup.visible ? -0.03 : 0.03);
    led.set(!a || lockGroup.visible === false ? ledTex('RUN', '#7cffb2', '#061a10') : k === 'read' ? (Math.sin(t * 6) > -0.3 ? ledTex('F-07', '#ffb300') : ledTex('', '#000', '#160808')) : ledTex('OFF', '#ff5a3c'));
    p1.visible = p2.visible = k === 'meter';
    if (k === 'meter') {
      place(p1, a!.l);
      place(p2, a!.r);
    }
    if (k === 'tighten') {
      place(driver, E.add(a!.r, 0, 0, 0.06));
      driver.rotation.z = t * 8;
    } else {
      place(driver, driverRest);
      driver.rotation.set(0, 0.6, 0);
    }
  };
};

// =============================================================================================
// The 조속기 test stand.

/**
 * The overspeed governor on a test stand: a grooved wheel with two hinged fly-weights and their
 * spring, the trip lever, the rope in a loop down to a tension weight on the floor, the drive with its
 * hold-to-run button, a big read-out of the speed against the 작동 속도 mark. Tested (etGovernorTest):
 * the tacho clipped on, the button held (the wheel spins up, the weights swing out, the speed climbs to
 * 126 m/min), a clack as it trips (lamp red, the wheel grabs and stops), read and written down, the
 * lever pushed back.
 */
const etGovernor: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const G = E.GV;
  const T = 0.78;
  part(g, rbox(0.92, 0.04, 0.78, 0.01), '#4f5b62', 0, T - 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, T - 0.04, 0.05), INK, sx * 0.42, (T - 0.04) / 2, sz * 0.33);
  // The frame holding the wheel up.
  part(g, box(0.5, 0.05, 0.16), FRAME, 0, T + 0.025, G.wheel[2] - 0.12);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.62, 0.05), FRAME, sx * 0.25, T + 0.31, G.wheel[2] - 0.12);
  part(g, box(0.55, 0.04, 0.05), FRAME, 0, T + 0.62, G.wheel[2] - 0.12);
  part(g, cyl(0.03, 0.03, 0.22, 12), CHROME, 0, G.wheel[1], G.wheel[2] - 0.06, { rx: Math.PI / 2 });
  const wheel = group(g, G.wheel[0], G.wheel[1], G.wheel[2]);
  part(wheel, cyl(G.r, G.r, 0.05, 32), '#39434a', 0, 0, 0, { rx: Math.PI / 2 });
  part(wheel, new THREE.TorusGeometry(G.r + 0.004, 0.008, 6, 32), ROPE, 0, 0, 0, { outline: false });
  part(wheel, cyl(0.04, 0.04, 0.07, 14), BRASS, 0, 0, 0.01, { rx: Math.PI / 2 });
  for (let i = 0; i < 4; i++) part(wheel, box(0.018, G.r * 1.75, 0.008), '#7d8a92', 0, 0, 0.027, { rz: (i * Math.PI) / 4, outline: false });
  // The fly-weights.
  const flies = [-1, 1].map((sx) => {
    const f = group(wheel, sx * 0.04, 0, 0.038);
    part(f, rbox(0.1, 0.04, 0.02, 0.01), RED, sx * 0.05, 0, 0);
    part(f, ball(0.018), HAZARD, sx * 0.1, 0, 0.002, { outline: false });
    return { f, sx };
  });
  // The rope's loop to the tension weight.
  rod(g, v3(-G.r, G.wheel[1], G.wheel[2]), v3(-0.14, 0.3, 0.12), 0.006, ROPE);
  rod(g, v3(G.r, G.wheel[1], G.wheel[2]), v3(0.14, 0.3, 0.12), 0.006, ROPE);
  part(g, cyl(0.09, 0.09, 0.05, 18), '#7d8a92', 0, 0.3, 0.12, { rz: Math.PI / 2 });
  part(g, rbox(0.2, 0.2, 0.14, 0.012), '#37474f', 0, 0.12, 0.12);
  label(g, '장력 추', 0.14, 0.04, 0, 0.12, 0.192, '#37474f', '#ffffff');
  // The switch and trip lever.
  const lever = group(g, G.lever[0], G.lever[1], G.lever[2] - 0.04);
  part(lever, rbox(0.03, 0.14, 0.03, 0.006), RED, 0, 0.0, 0);
  // The read-out.
  part(g, rbox(0.42, 0.2, 0.05, 0.008), INK, 0, 1.56, G.wheel[2] - 0.12);
  const read = swapPic(g, 0.38, 0.13, 0, 1.58, G.wheel[2] - 0.093);
  label(g, '작동 속도 126 m/min 이내', 0.38, 0.03, 0, 1.49, G.wheel[2] - 0.093, INK, '#ffd54f');
  label(g, '조속기 시험대', 0.46, 0.07, -0.0, 0.72, 0.4, '#4f5b62', '#ffd54f');
  const lamp = lit(g, ball(0.03), '#2c5e3f', 0.3, T + 0.05, 0.22);
  // Hold button, tacho sensor.
  part(g, rbox(0.14, 0.05, 0.1, 0.01), '#39444a', G.hold[0], T + 0.025, G.hold[2]);
  const hold = lit(g, cyl(0.024, 0.024, 0.016, 14), '#2c5e3f', G.hold[0], T + 0.055, G.hold[2]);
  label(g, '구동', 0.08, 0.024, G.hold[0], T + 0.03, G.hold[2] + 0.051, '#39444a', '#ffffff');
  const sensor = group(g);
  part(sensor, rbox(0.05, 0.05, 0.08, 0.01), '#fbc02d', 0, 0, 0);
  part(sensor, cyl(0.01, 0.01, 0.05, 8), INK, 0, 0, -0.05, { rx: Math.PI / 2, outline: false });
  const clip = clipboard(g, sheetTex('etGovLog', '조속기 시험', ['정격 105', '작동 126', '판정 적합 □']), [G.clip[0], T + 0.012, G.clip[2]]);
  void clip;
  const pen = group(g);
  part(pen, cyl(0.007, 0.007, 0.13, 8), BRAND, 0, 0, 0, { rx: 1, outline: false });
  const test = use(g, 'etGovernor', 0, 0.74);
  out.spots = { etGovernorTest: test, '*': test };
  out.work = test.work;
  let spin = 0;
  out.away = (_o, t) => {
    const a = current([test], t) ? now(test, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    const s = E.gvNow(k, u);
    spin += s.turn * 0.1;
    wheel.rotation.z = -spin;
    const out2 = Math.min(1, s.speed / 126);
    for (const { f, sx } of flies) f.rotation.z = sx * (-0.15 - 0.55 * out2);
    setLit(hold, k === 'spin' ? '#6dff9e' : '#2c5e3f');
    setLit(lamp, s.tripped ? '#ff5252' : k === 'spin' ? '#6dff9e' : '#2c5e3f');
    lever.rotation.x = s.tripped ? -0.8 : 0;
    read.set(s.tripped ? ledTex('126 작동', '#ff5a3c') : ledTex(`${String(s.speed).padStart(3, '0')} m/min`, '#7cffb2', '#061a10', 192, 56));
    const onWheel = !!a && k !== 'reset' && !(k === 'clip' && u < 0.45);
    place(sensor, onWheel ? [E.GV.sensor[0], E.GV.sensor[1], E.GV.sensor[2]] : k === 'clip' && a ? a.r : [0.3, T + 0.03, 0.34]);
    pen.visible = k === 'note';
    if (pen.visible) pen.position.set(a!.r[0], a!.r[1], a!.r[2]);
  };
};

// =============================================================================================
// The guide-rail jig.

/**
 * A stretch of real hoistway: two oiled T-section guide rails on brackets to a steel back, with
 * fishplates at a joint, floor to head height and more. A plumb line drops from a bracket, a rail
 * gauge bar (DBG 게이지) with a dial in its middle hangs on hooks. Gauged (etRailGauge): the plumb line
 * let down, the bar lifted and set across at head height and low down (a crouch; the dial's read each
 * time, off), the bracket's clip nipped up (the dial comes good, 1,600 mm 레일 간격), the rail wiped with
 * an oily rag, the bar hung up.
 */
const etRailJig: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const R = E.RL;
  part(g, box(1.96, 0.04, 0.5), '#6c7a82', 0, 0.02, -0.1, { outline: false });
  part(g, box(1.7, 2.2, 0.05), '#90a4ae', 0, 1.14, -0.3);
  for (let i = 0; i < 5; i++) part(g, box(1.7, 0.02, 0.008), '#78909c', 0, 0.3 + i * 0.44, -0.27, { outline: false });
  label(g, '가이드레일 실습대', 0.7, 0.1, 0, 2.08, -0.27, BRAND, '#ffffff');
  for (const sx of [-1, 1]) {
    const X = sx * R.railX;
    part(g, box(0.1, 2.15, 0.02), '#5d6971', X, 1.1, R.z - 0.09);
    part(g, box(0.024, 2.15, 0.09), '#b6b2a6', X, 1.1, R.z - 0.03);
    part(g, box(0.012, 2.15, 0.03), '#ece7d6', X, 1.1, R.z + 0.002, { outline: false });
    for (const y of [0.42, 1.0, 1.58]) {
      part(g, box(0.28, 0.08, 0.34), FRAME, X, y, R.z - 0.24);
      for (const dx of [-0.05, 0.05]) part(g, cyl(0.016, 0.016, 0.014, 8), CHROME, X + dx, y, R.z - 0.07, { rx: Math.PI / 2, outline: false });
    }
    // The joint's fishplate.
    part(g, box(0.1, 0.26, 0.012), '#6f7a81', X, 1.3, R.z - 0.1);
  }
  // Oil pan and drip, a sign, rails stacked.
  for (const sx of [-1, 1]) part(g, box(0.16, 0.03, 0.14), '#2f3438', sx * R.railX, 0.055, R.z - 0.03);
  part(g, box(0.2, 0.02, 0.12), '#1f2224', -0.84, 0.05, 0.25, { outline: false });
  // The plumb line.
  const P = R.plumb;
  part(g, box(0.1, 0.03, 0.2), INK, P[0], 1.9, P[2] - 0.1);
  const bob = group(g);
  part(bob, cyl(0.022, 0.003, 0.07, 10), BRASS, 0, 0, 0);
  const line = stretch(g, '#ef5350', 0.0025);
  // The bar's hooks and its bar.
  for (const sx of [-1, 1]) part(g, box(0.02, 0.04, 0.06), INK, sx * 0.3, R.bar - 0.03, 0.1);
  const bar = group(g);
  part(bar, rbox(0.9, 0.04, 0.024, 0.006), '#f0f1f2', 0, 0, 0);
  for (const sx of [-1, 1]) part(bar, box(0.03, 0.06, 0.04), INK, sx * 0.43, 0, -0.01);
  part(bar, cyl(0.05, 0.05, 0.02, 20), '#ffffff', 0, 0, 0.018, { rx: Math.PI / 2 });
  const needle = part(bar, box(0.006, 0.04, 0.002), RED, 0, 0.014, 0.03, { outline: false });
  const barRead = swapPic(bar, 0.1, 0.03, 0, -0.04, 0.014);
  // The rag and spanner.
  const rag = group(g);
  part(rag, rbox(0.1, 0.03, 0.08, 0.015), '#9e8866', 0, 0, 0);
  const ragRest: V = [-0.84, 0.08, 0.25];
  const span = wrench();
  g.add(span);
  const spanRest: V = [0.84, 0.05, 0.25];
  part(g, box(0.2, 0.02, 0.12), '#1f2224', 0.84, 0.03, 0.25, { outline: false });
  const check = use(g, 'etRail', R.stand[0], R.stand[1]);
  out.spots = { etRailGauge: check, '*': check };
  out.work = check.work;
  const barHome: V = [0, R.bar, 0.12];
  out.away = (_o, t) => {
    const a = current([check], t) ? now(check, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    const bp = a ? E.railBarAt(k, u) : null;
    place(bar, bp ?? barHome);
    // The dial.
    const off = k === 'high' ? 0.8 : k === 'low' ? 0.7 : k === 'shim' ? 0.7 * (1 - u) : 0;
    needle.rotation.z = -off + (k === 'high' || k === 'low' ? 0.04 * Math.sin(t * 3) : 0);
    barRead.mesh.visible = !!bp;
    barRead.set(k === 'shim' && u > 0.7 ? ledTex('1600.0', '#7cffb2', '#061a10') : ledTex(k === 'high' ? '1601.4' : k === 'low' ? '1601.0' : '----', '#ff5a3c'));
    // The plumb bob.
    const dropAt = k === 'plumb' ? 1 - sm0(u) : 0;
    const bobY = R.bob[1] + (P[1] - 0.06 - R.bob[1]) * dropAt;
    const showLine = !!a;
    bob.visible = showLine;
    if (showLine) {
      bob.position.set(P[0] + 0.01 * Math.sin(t * 1.1) * (1 - dropAt), bobY, P[2]);
      line([P[0], P[1] + 0.14, P[2]], [P[0] + 0.01 * Math.sin(t * 1.1) * (1 - dropAt), bobY + 0.03, P[2]]);
    } else line([0, -1, 0], [0, -1, 0.001]);
    // Rag and spanner.
    if (k === 'rag' && a) place(rag, a.r);
    else place(rag, ragRest);
    if (k === 'shim' && a) {
      place(span, a.r);
      span.rotation.y = 0.5 * Math.sin(t * 7);
    } else {
      place(span, spanRest);
      span.rotation.y = 0;
    }
  };
};
const sm0 = (u: number) => E.sm(u, 0.15, 0.75);

// =============================================================================================
// The 부품함.

const PART_COLOURS = ['#ef6c00', '#1976d2', '#2e7d32', '#6d4c41', '#7b1fa2', '#00838f'];
const PART_NAMES = ['도어 롤러', '도어 슈', '릴레이', '버튼', '리밋 S/W', '가이드 슈', '퓨즈', '벨트'];
/**
 * A steel parts cabinet with double doors: shelves of labelled blue bins (도어 롤러, 도어 슈, 릴레이,
 * 버튼…), a door roller or relay showing in each, a shelf of boxed spares, a scanner on its hook and a
 * red 발주 flag. Sorted (orderParts): both doors pulled open, a bin's label scanned (the scanner's lit),
 * the bin drawn out and held on the arm, its parts counted out with the fingers, pushed home, the low
 * bin flagged for ordering, the doors shut.
 */
const partsCabinet: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const C = E.PC;
  const zF = C.face;
  const W = C.half * 2;
  part(g, box(W + 0.04, 0.08, 0.66), INK, 0, 0.04, -0.1);
  // The carcass: sides, top, back.
  for (const sx of [-1, 1]) part(g, box(0.02, 1.84, 0.62), '#a4b0b7', sx * (C.half + 0.01), 1.0, -0.09);
  part(g, box(W + 0.04, 0.02, 0.62), '#a4b0b7', 0, 1.92, -0.09);
  part(g, box(W, 1.84, 0.02), '#7f8b92', 0, 1.0, -0.39);
  const Y = [0.34, 0.68, 1.02, 1.36, 1.68];
  const seedR = seeded(5);
  Y.forEach((y, r) => {
    part(g, box(W, 0.016, 0.58), '#c1cad0', 0, y - 0.09, -0.09, { outline: false });
    if (r === 0) {
      // Boxed spares on the bottom shelf.
      for (let i = 0; i < 3; i++) part(g, rbox(0.26, 0.2, 0.34, 0.012), '#c9a678', -0.3 + i * 0.3, y + 0.02, -0.1);
      label(g, '도어 모터', 0.2, 0.04, 0, y + 0.02, 0.075, '#c9a678', INK);
      return;
    }
    for (let i = 0; i < 3; i++) {
      if (r === 2 && i === 2) continue;
      const x = -0.27 + i * 0.27;
      part(g, rbox(0.24, 0.17, 0.32, 0.012), '#1c6fa8', x, y, -0.04);
      part(g, box(0.2, 0.08, 0.004), '#ffffff', x, y + 0.02, 0.122, { outline: false });
      const name = PART_NAMES[(r * 3 + i) % PART_NAMES.length];
      label(g, name, 0.18, 0.05, x, y + 0.02, 0.126, '#ffffff', INK);
      for (let j = 0; j < 3; j++) part(g, ball(0.025 + seedR() * 0.01), PART_COLOURS[(r + i + j) % 6], x - 0.06 + j * 0.06, y + 0.085, -0.04 + j * 0.03, { outline: false });
    }
  });
  // The bin that's drawn out.
  const bin = group(g);
  part(bin, rbox(0.24, 0.17, 0.32, 0.012), '#1c6fa8', 0, 0, -0.14);
  part(bin, box(0.2, 0.08, 0.004), '#ffffff', 0, 0.02, 0.022, { outline: false });
  label(bin, '도어 롤러', 0.18, 0.05, 0, 0.02, 0.026, '#ffffff', INK);
  const rollers: THREE.Object3D[] = [];
  for (let j = 0; j < 5; j++) {
    const r = group(bin, -0.07 + (j % 3) * 0.07, 0.08, -0.22 + Math.floor(j / 3) * 0.14);
    part(r, cyl(0.03, 0.03, 0.02, 14), '#ef6c00', 0, 0, 0, { rx: Math.PI / 2 });
    part(r, cyl(0.01, 0.01, 0.024, 8), CHROME, 0, 0, 0, { rx: Math.PI / 2, outline: false });
    rollers.push(r);
  }
  const rollerHeld = group(g);
  part(rollerHeld, cyl(0.03, 0.03, 0.02, 14), '#ef6c00', 0, 0, 0, { rx: Math.PI / 2 });
  // Doors.
  const hinges = [-1, 1].map((sx) => {
    const h = group(g, sx * (C.half + 0.01), 0, zF);
    const d = group(h, -sx * C.half / 2, 0, 0);
    part(d, rbox(C.half - 0.005, 1.82, 0.02, 0.004), '#b3bec4', 0, 1.0, 0.006);
    part(d, box(C.half - 0.06, 1.7, 0.003), '#a4b0b7', 0, 1.0, 0.018, { outline: false });
    part(d, rbox(0.02, 0.18, 0.03, 0.005), INK, -sx * (C.half / 2 - 0.05), C.handleY, 0.028);
    if (sx < 0) label(d, '승강기 부품', 0.32, 0.06, 0, 1.56, 0.02, BRAND, '#ffffff');
    else label(d, '재고 확인', 0.26, 0.06, 0, 1.56, 0.02, '#b3bec4', INK);
    return { h, sx };
  });
  // The flag and scanner.
  const flag = group(g, C.flag[0], C.flag[1], C.flag[2] - 0.04);
  part(flag, box(0.14, 0.07, 0.003), RED, 0, 0, 0, { outline: false });
  label(flag, '발주', 0.1, 0.05, 0, 0, 0.003, RED, '#ffffff');
  const scanner = group(g);
  part(scanner, rbox(0.05, 0.14, 0.04, 0.012), '#263238', 0, -0.03, 0);
  part(scanner, rbox(0.07, 0.04, 0.1, 0.012), '#263238', 0, 0.05, -0.04);
  const beam = lit(scanner, box(0.06, 0.004, 0.08), '#ff1744', 0, 0.04, -0.13);
  const scanHome: V = [C.half + 0.05, 1.48, 0.1];
  const check = use(g, 'etParts', C.stand[0], C.stand[1]);
  out.spots = { orderParts: check, '*': check };
  out.work = check.work;
  let swing = 0;
  out.away = (_o, t) => {
    const a = current([check], t) ? now(check, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    swing = a ? E.pcDoor(k, u) : swing * 0.9;
    for (const { h, sx } of hinges) h.rotation.y = sx * swing;
    const held = k === 'pull' || k === 'count' || k === 'stow';
    if (held && a) place(bin, E.add(E.lerp(a.l, a.r, 0.5), 0, -0.01, 0.0));
    else place(bin, [C.bin[0], C.bin[1] - 0.11, C.bin[2]]);
    bin.visible = true;
    const counted = k === 'count' ? Math.floor(u * 5) : k === 'stow' || k === 'flag' ? 5 : 0;
    rollers.forEach((r, i) => (r.visible = i >= counted || !a || k === 'scan'));
    rollerHeld.visible = k === 'count';
    if (k === 'count') place(rollerHeld, a!.r);
    flag.visible = a ? k === 'flag' ? u > 0.5 : k === 'close' : false;
    if (k === 'scan' && a) {
      place(scanner, a.r);
      beam.visible = u > 0.35 && Math.sin(t * 30) > 0;
    } else {
      place(scanner, scanHome);
      beam.visible = false;
    }
  };
};

// =============================================================================================
// The monitoring desk.

function listRows(c: CanvasRenderingContext2D, alarm: boolean, picked: number) {
  const rows = ['가람타워 1호기', '새빛아파트 3호기', '솔빛병원 2호기', '누리상가 1호기', '한내오피스 5호기', '다온역사 E/L 2호기'];
  rows.forEach((r, i) => {
    const y = 38 + i * 22;
    if (i === picked) {
      c.fillStyle = alarm ? '#7f1d1d' : '#1a5a78';
      c.fillRect(4, y - 10, 248, 20);
    }
    text(c, r, 10, y, 13, '#e3f2fd');
    const bad = alarm && i === 2;
    c.fillStyle = bad ? '#ff5252' : i === 4 ? '#ffc107' : '#66bb6a';
    c.beginPath();
    c.arc(238, y, 6, 0, Math.PI * 2);
    c.fill();
    text(c, bad ? '갇힘' : i === 4 ? '점검' : '정상', 190, y, 12, bad ? '#ff8a80' : '#b0bec5');
  });
}
const listTex = (alarm: boolean, picked: number) =>
  painted(`etList|${alarm}|${picked}`, 256, 170, (c) => {
    c.fillStyle = '#0e1a22';
    c.fillRect(0, 0, 256, 170);
    c.fillStyle = alarm ? '#b71c1c' : BRAND;
    c.fillRect(0, 0, 256, 22);
    text(c, alarm ? '🚨 갇힘 사고 발생' : '원격 감시 · 운행 현황', 128, 12, 14, '#ffffff', 'center');
    listRows(c, alarm, picked);
  });
const LIST_OK = listTex(false, -1);
const LIST_PICK = listTex(false, 1);
const LIST_ALARM = listTex(true, 2);
const carCamTex = (people: number, key: string) =>
  painted(`etCam|${key}`, 256, 170, (c) => {
    c.fillStyle = '#1b2329';
    c.fillRect(0, 0, 256, 170);
    c.fillStyle = '#7d8a92';
    c.beginPath();
    c.moveTo(30, 150);
    c.lineTo(226, 150);
    c.lineTo(190, 60);
    c.lineTo(66, 60);
    c.closePath();
    c.fill();
    c.fillStyle = '#a5b1b8';
    c.fillRect(66, 20, 124, 40);
    for (let i = 0; i < people; i++) {
      const x = 90 + i * 40;
      c.fillStyle = ['#c0ca33', '#ec407a', '#42a5f5'][i];
      c.fillRect(x - 12, 88, 24, 44);
      c.fillStyle = '#f2c9a0';
      c.beginPath();
      c.arc(x, 76, 11, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#00000088';
    c.fillRect(0, 0, 256, 18);
    text(c, `CAM 카 내부 ● REC  탑승 ${people}명`, 8, 10, 11, '#b9f6ca');
  });
const CAM_EMPTY = carCamTex(0, 'empty');
const CAM_ONE = carCamTex(1, 'one');
const CAM_THREE = carCamTex(3, 'three');
const statusTex = (title: string, lines: string[], color: string, key: string) =>
  painted(`etStatus|${key}`, 256, 170, (c) => {
    c.fillStyle = '#0e1a22';
    c.fillRect(0, 0, 256, 170);
    c.fillStyle = color;
    c.fillRect(0, 0, 256, 26);
    text(c, title, 128, 14, 15, '#ffffff', 'center');
    lines.forEach((s, i) => text(c, s, 12, 48 + i * 24, 14, '#e3f2fd'));
  });
const LOG_TEX = statusTex('감시 일지', ['16:20 3호기 문 닫힘 지연', '조치: 원격 재기동', '결과: 정상 복귀 ✓'], BRAND, 'log');
const SEND_TEX = statusTex('출동 지시', ['솔빛병원 2호기 / 3F-4F', '탑승 3명 · 호흡 이상 없음', '정비 차량 2호 출동 ▶', '도착 예정 7분'], '#b71c1c', 'send');
const IDLE_TEX = statusTex('운행 통계', ['가동률 99.3%', '오늘 고장 2건', '정기 점검 D-3', '원격 감시 124대'], '#37474f', 'idle');
/**
 * A monitoring desk: two screens on a stand (the live list of 124 cars at the buildings under contract,
 * and the car camera or a log), the keyboard and mouse, a red 갇힘 alarm lamp and its acknowledge
 * button, a headset on its hook, a phone, the 비상 연락망 under the glass; sat at on a swivel chair.
 * Watching (remoteMonitor): down the list with the mouse, a car picked, the car's camera up, a word
 * with the passenger on the handset, logged, back to the list.
 * A stuck passenger (etTrapCall): the lamp flashes and the screen goes red; acknowledged, the headset
 * put on, the camera found (three people in a stopped car), a calm open hand as they're talked to, the
 * crew sent (the order on screen), the headset hung up.
 */
const monitorDesk: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const D = E.MD;
  const T = D.top;
  part(g, rbox(0.98, 0.04, 0.72, 0.01), '#d7dcdf', 0, T - 0.02, -0.02);
  for (const sx of [-1, 1]) part(g, box(0.04, T - 0.04, 0.66), '#5f6b72', sx * 0.46, (T - 0.04) / 2, -0.02);
  part(g, box(0.9, 0.36, 0.02), '#5f6b72', 0, 0.5, -0.34, { outline: false });
  part(g, rbox(0.18, 0.4, 0.42, 0.012), INK, -0.32, 0.21, -0.1);
  glowing(g, box(0.012, 0.012, 0.004), '#40c4ff', -0.25, 0.36, 0.112);
  // Under the glass: the contact sheet.
  flatPic(g, sheetTex('etContact', '비상 연락망', ['본사 상황실', '119 종합상황', '담당 정비원', '관리사무소']), 0.18, 0.24, 0.0, T + 0.002, 0.2).visible = false;
  // Monitors.
  part(g, cyl(0.1, 0.12, 0.02, 16), INK, 0, T + 0.01, -0.22);
  rod(g, v3(0, T, -0.22), v3(0, T + 0.34, -0.22), 0.016, '#424242');
  const scrA = group(g, -0.22, T + 0.34, -0.17, 0.14);
  const scrB = group(g, 0.22, T + 0.34, -0.17, -0.14);
  part(scrA, rbox(0.42, 0.29, 0.024, 0.008), INK, 0, 0, 0);
  part(scrB, rbox(0.42, 0.29, 0.024, 0.008), INK, 0, 0, 0);
  const left = swapPic(scrA, 0.39, 0.26, 0, 0, 0.014);
  const right = swapPic(scrB, 0.39, 0.26, 0, 0, 0.014);
  // Keyboard, mouse, phone.
  part(g, rbox(0.34, 0.018, 0.12, 0.004), INK, D.keys[0], T + 0.009, D.keys[2]);
  for (let i = 0; i < 4; i++) part(g, box(0.3, 0.003, 0.016), '#59626b', D.keys[0], T + 0.02, D.keys[2] - 0.04 + i * 0.026, { outline: false });
  part(g, box(0.16, 0.004, 0.16), '#2f3440', D.mouse[0], T + 0.002, D.mouse[2], { outline: false });
  part(g, rbox(0.05, 0.025, 0.08, 0.02), INK, D.mouse[0], T + 0.016, D.mouse[2]);
  // The alarm lamp and its button.
  part(g, cyl(0.05, 0.06, 0.03, 16), INK, -0.4, T + 0.015, -0.12);
  const beacon = lit(g, cyl(0.04, 0.04, 0.09, 14), '#6b1a1a', -0.4, T + 0.075, -0.12);
  part(g, rbox(0.1, 0.03, 0.1, 0.01), HAZARD, D.ack[0], T + 0.015, D.ack[2]);
  const ackBtn = lit(g, cyl(0.03, 0.03, 0.016, 14), '#8e1c1c', D.ack[0], T + 0.036, D.ack[2]);
  // Headset on its hook, then on the head.
  part(g, box(0.02, 0.26, 0.02), '#424242', D.hook[0], T + 0.13, D.hook[2]);
  const headset = group(g);
  part(headset, new THREE.TorusGeometry(0.1, 0.008, 6, 20, Math.PI), INK, 0, 0, 0, { outline: false });
  for (const sx of [-1, 1]) part(headset, cyl(0.03, 0.03, 0.02, 12), INK, sx * 0.1, -0.01, 0, { rz: Math.PI / 2 });
  rod(headset, v3(0.1, -0.02, 0), v3(0.05, -0.12, 0.08), 0.004, INK);
  part(headset, ball(0.012), INK, 0.05, -0.12, 0.08, { outline: false });
  // The handset and small desk things.
  part(g, rbox(0.14, 0.03, 0.18, 0.01), '#37474f', 0.36, T + 0.015, 0.0);
  part(g, cyl(0.045, 0.035, 0.09, 12), '#eceff1', -0.46 + 0.12, T + 0.045, 0.27);
  // Chair.
  const ch = group(g, 0, 0, 0.66, Math.PI);
  swivel(ch);
  const watch = use(g, 'etMonitor', 0, 0.56, true);
  const trap = use(g, 'etTrap', 0, 0.56, true);
  out.spots = { remoteMonitor: watch, etTrapCall: trap, '*': watch };
  out.work = watch.work;
  out.away = (_o, t) => {
    const s = current([watch, trap], t);
    const a = s ? now(s, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    const H = s ? ((s.at.userData.height as number | undefined) ?? 1.6) : 1.6;
    ch.position.z = s ? 0.6 : 0.7;
    if (!s) {
      left.set(LIST_OK);
      right.set(IDLE_TEX);
      setLit(beacon, '#6b1a1a');
      setLit(ackBtn, '#8e1c1c');
      place(headset, E.add(D.hook, 0, 0.04, 0));
      headset.rotation.set(0, 0, 0);
      return;
    }
    if (s === watch) {
      setLit(beacon, '#6b1a1a');
      setLit(ackBtn, '#8e1c1c');
      left.set(k === 'scan' ? LIST_OK : LIST_PICK);
      right.set(k === 'scan' || k === 'clear' ? IDLE_TEX : k === 'pick' ? (Math.sin(t * 12) > 0 ? CAM_EMPTY : IDLE_TEX) : k === 'log' ? LOG_TEX : CAM_ONE);
      place(headset, E.add(D.hook, 0, 0.04, 0));
      headset.rotation.set(0, 0, 0);
    } else {
      const alarmed = k === 'ack' || k === 'headset' || k === 'cam' || k === 'calm';
      const on = Math.sin(t * 14) > 0;
      setLit(beacon, k === 'ack' ? (on ? '#ff1744' : '#6b1a1a') : alarmed ? '#ff5252' : k === 'send' ? '#ffb300' : '#6b1a1a');
      setLit(ackBtn, k === 'ack' && u < 0.3 ? '#ff1744' : '#8e1c1c');
      left.set(k === 'off' ? LIST_OK : LIST_ALARM);
      right.set(k === 'ack' ? IDLE_TEX : k === 'headset' ? CAM_EMPTY : k === 'cam' || k === 'calm' ? CAM_THREE : k === 'send' ? SEND_TEX : IDLE_TEX);
      const head = D.head(H);
      if (k === 'headset' && u < 0.9) {
        place(headset, a!.r);
        headset.rotation.set(0, Math.PI / 2, 0);
      } else if (k === 'cam' || k === 'calm' || k === 'send' || k === 'headset') {
        place(headset, head);
        headset.rotation.set(0, 0, 0);
      } else if (k === 'off') {
        if (u < 0.9) place(headset, a!.r);
        else place(headset, E.add(D.hook, 0, 0.04, 0));
        headset.rotation.set(0, Math.PI / 2, 0);
      } else {
        place(headset, E.add(D.hook, 0, 0.04, 0));
        headset.rotation.set(0, 0, 0);
      }
    }
  };
};

// =============================================================================================
// The map wall.

const CITY = (() => {
  const r = seeded(21);
  return Array.from({ length: 28 }, (_, i) => ({ x: 60 + (i % 7) * 96 + r() * 40, y: 58 + Math.floor(i / 7) * 74 + r() * 30, w: 18 + r() * 26, h: 16 + r() * 18 }));
})();
function paintWall(alarm: boolean, sent: boolean) {
  return (c: CanvasRenderingContext2D) => {
    c.fillStyle = '#0c1820';
    c.fillRect(0, 0, 768, 340);
    // Roads and a river.
    c.strokeStyle = '#1f3a4a';
    c.lineWidth = 8;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(0, 70 + i * 74);
      c.lineTo(768, 70 + i * 74 + (i - 1) * 8);
      c.stroke();
    }
    for (let i = 1; i < 6; i++) {
      c.beginPath();
      c.moveTo(i * 120, 0);
      c.lineTo(i * 120 + 16, 340);
      c.stroke();
    }
    c.strokeStyle = '#16465e';
    c.lineWidth = 22;
    c.beginPath();
    c.moveTo(0, 310);
    c.quadraticCurveTo(320, 220, 768, 300);
    c.stroke();
    text(c, '한내천', 620, 278, 13, '#4fa3c7');
    // Buildings and their cars.
    CITY.forEach((b, i) => {
      c.fillStyle = '#23404f';
      c.fillRect(b.x, b.y, b.w, b.h);
      const hot = alarm && i === 16;
      c.fillStyle = hot ? '#ff1744' : i % 9 === 4 ? '#ffc107' : '#4caf50';
      c.beginPath();
      c.arc(b.x + b.w / 2, b.y + b.h / 2, hot ? 11 : 5, 0, Math.PI * 2);
      c.fill();
    });
    // The header bar.
    c.fillStyle = alarm ? '#b71c1c' : BRAND;
    c.fillRect(0, 0, 768, 30);
    text(c, `${CO} 원격 감시 상황판 · 관리 124대`, 12, 16, 17, '#ffffff');
    text(c, alarm ? (sent ? '갇힘 1건 · 출동 중' : '갇힘 1건 · 미배차') : '정상 123 · 점검 1', 756, 16, 16, alarm ? '#ffe082' : '#a5d6a7', 'right');
    // The side list.
    c.fillStyle = '#0e222ccc';
    c.fillRect(600, 34, 164, 176);
    text(c, '정비 차량', 610, 50, 14, '#ffd54f');
    ['1호 권로프 대기', '2호 하안전 대기', '3호 김레일 현장', '4호 오도어 현장'].forEach((s, i) => text(c, s, 610, 76 + i * 26, 13, sent && i === 1 ? '#ff8a80' : '#cfd8dc'));
  };
}
const WALL_OK = painted('etWall|ok', 768, 340, paintWall(false, false));
const WALL_ALARM = painted('etWall|alarm', 768, 340, paintWall(true, false));
const WALL_SENT = painted('etWall|sent', 768, 340, paintWall(true, true));
const etaTex = (m: number) => ledTex(`도착 ${m}분`, '#ffd54f', '#10161a', 160, 44);
/**
 * A wall of video panels on a steel stand: a city map with every building under contract and a dot for
 * each car, the header counting 정상 and 점검, the vans' list at the side, a 갇힘 count; a small console
 * ledge under it with a radio. Dispatching (etDispatchCrew): looked over, hand on chin, the red dot
 * touched (it swells), the van's tag dragged from the list to the building with a finger, the radio up
 * (당번 출동), the ETA counting down over the map, all clear.
 */
const etMonitorWall: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const W = E.MW;
  const face = W.face;
  part(g, box(2.94, 0.1, 0.34), INK, 0, 0.05, -0.32);
  part(g, rbox(2.94, 2.04, 0.1, 0.01), '#1b252b', 0, 1.48, face - 0.1);
  // A row of panels' seams over the picture.
  part(g, rbox(2.9, 1.5, 0.03, 0.006), '#0a0f12', 0, 1.56, face - 0.04);
  const map = swapPic(g, 2.84, 1.44, 0, 1.56, face - 0.02);
  for (let i = 1; i < 4; i++) part(g, box(0.006, 1.44, 0.002), '#0a0f12', -1.42 + i * 0.71, 1.56, face - 0.015, { outline: false });
  part(g, box(2.84, 0.006, 0.002), '#0a0f12', 0, 1.56, face - 0.015, { outline: false });
  // A status strip under it, the console ledge and its phone.
  part(g, rbox(2.9, 0.22, 0.06, 0.008), '#37474f', 0, 0.68, face - 0.08);
  part(g, rbox(2.9, 0.03, 0.2, 0.006), '#cfd8dc', 0, 0.82, face);
  const clock = swapPic(g, 0.5, 0.12, -1.0, 0.68, face - 0.046);
  const eta = swapPic(g, 0.5, 0.12, 0.2, 0.68, face - 0.046);
  label(g, '오늘 고장 2건 · 갇힘 0건', 0.82, 0.08, 0.92, 0.68, face - 0.046, '#37474f', '#ffd54f');
  // The ledge's radio charger.
  part(g, rbox(0.16, 0.05, 0.12, 0.008), INK, W.radio[0], 0.86, W.radio[2] - 0.2);
  const radio = group(g);
  part(radio, rbox(0.06, 0.13, 0.03, 0.008), INK, 0, 0, 0);
  part(radio, cyl(0.005, 0.005, 0.1, 8), INK, -0.02, 0.1, 0, { outline: false });
  const radioHome: V = [W.radio[0], 0.93, W.radio[2] - 0.2];
  const redDot = lit(g, ball(0.02), '#ff1744', W.dot[0], W.dot[1], face + 0.01);
  redDot.visible = false;
  const vanTag = group(g);
  part(vanTag, rbox(0.11, 0.05, 0.008, 0.002), '#ffd54f', 0, 0, 0);
  label(vanTag, '2호차', 0.09, 0.03, 0, 0, 0.005, '#ffd54f', INK);
  const use1 = use(g, 'etDispatch', W.stand[0], W.stand[1]);
  out.spots = { etDispatchCrew: use1, '*': use1 };
  out.work = use1.work;
  out.away = (_o, t) => {
    const a = current([use1], t) ? now(use1, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    const sent = k === 'radio' || k === 'eta';
    map.set(!a || k === 'ok' ? WALL_OK : sent ? WALL_SENT : WALL_ALARM);
    clock.set(ledTex('16:24', '#7cffb2', '#061a10', 160, 44));
    eta.set(k === 'eta' ? etaTex(Math.max(1, 7 - Math.floor(u * 6))) : k === 'radio' ? etaTex(7) : ledTex('', '#000', '#10161a', 160, 44));
    redDot.visible = !!a && (k === 'look' || k === 'point' || k === 'drag') && Math.sin(t * 7) > -0.3;
    redDot.scale.setScalar(k === 'point' ? 1.6 + 0.4 * Math.sin(t * 7) : 1);
    if (k === 'drag' && a) place(vanTag, [a.r[0], a.r[1], face + 0.015]);
    else if (sent && a) place(vanTag, [W.dot[0] + 0.07, W.dot[1] - 0.05, face + 0.015]);
    else place(vanTag, null);
    if (k === 'radio' && a) place(radio, a.r);
    else place(radio, radioHome);
  };
};

// =============================================================================================
// The rounds board.

const BUILDINGS = ['가람타워', '새빛APT', '솔빛병원', '누리상가', '한내오피스', '다온역사', '푸른빌', '온새미로', '하늘채움', '수정아파트', '보람빌딩', '이룸학교'];
const boardTex = painted('etRounds', 512, 340, (c) => {
  c.fillStyle = '#fbfbf7';
  c.fillRect(0, 0, 512, 340);
  c.fillStyle = BRAND;
  c.fillRect(0, 0, 512, 34);
  text(c, '11월 정기 점검 일정', 256, 18, 20, '#ffffff', 'center');
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 1;
  const days = ['월', '화', '수', '목'];
  days.forEach((d, i) => text(c, d, 66 + i * 102 + 44, 50, 15, '#546e7a', 'center'));
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) c.strokeRect(66 + i * 102, 62 + r * 88, 102, 88);
  ['1주', '2주', '3주'].forEach((w, i) => text(c, w, 32, 106 + i * 88, 15, '#546e7a', 'center'));
});
/**
 * The month's rounds on a magnetic board: a calendar with one magnet per lift, names of the buildings
 * on each, a tray of spare magnets and markers. Planning (planRounds, the 팀장's job): the contract
 * list on the clipboard, a magnet taken from the tray, stuck on the day, the building's name written
 * by it, stepped back to look, ticked off. Each round fills one more.
 */
const etRoundsBoard: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const B = E.RB;
  const f = B.face;
  for (const sx of [-1, 1]) part(g, box(0.05, 1.9, 0.05), FRAME, sx * 0.96, 0.95, f - 0.06);
  part(g, box(2, 0.05, 0.4), INK, 0, 0.03, f - 0.04);
  part(g, rbox(1.3, 0.96, 0.03, 0.006), '#eceff1', 0.0, 1.46, f - 0.03);
  picture(g, boardTex, 1.26, 0.92, 0, 1.46, f - 0.012);
  // Side sheets.
  picture(g, sheetTex('etContracts', '유지관리 계약', ['124대', '월 1회 점검', '정기검사 연 1회', '우수 업체 ✓']), 0.26, 0.36, -0.82, 1.46, f - 0.022);
  picture(g, sheetTex('etTeam', '정비조', ['1조 권로프', '2조 하안전', '3조 김레일', '당직 오도어']), 0.26, 0.36, 0.82, 1.46, f - 0.022);
  // The tray.
  part(g, box(1.3, 0.025, 0.09), '#b0bec5', 0, 0.96, f + 0.02);
  for (let i = 0; i < 6; i++) part(g, cyl(0.022, 0.022, 0.018, 12), ['#ef5350', '#42a5f5', '#66bb6a'][i % 3], B.tray[0] - 0.1 + i * 0.04, 0.985, f + 0.02);
  part(g, cyl(0.01, 0.01, 0.13, 8), '#1565c0', -0.3, 0.985, f + 0.02, { rz: Math.PI / 2, outline: false });
  // Magnets on the calendar: a mesh per slot with its name.
  const slotOf = (i: number) => [E.RB.slot(i)[0], E.RB.slot(i)[1], f + 0.005] as const;
  const mags = BUILDINGS.map((name, i) => {
    const [x, y, z] = slotOf(i);
    const m = group(g, x, y, z);
    part(m, cyl(0.02, 0.02, 0.012, 12), ['#ef5350', '#42a5f5', '#66bb6a'][i % 3], -0.07, 0, 0, { rx: Math.PI / 2 });
    label(m, name, 0.13, 0.034, 0.03, 0, 0.003, '#fbfbf7', INK);
    return m;
  });
  const held = group(g);
  part(held, cyl(0.022, 0.022, 0.014, 12), '#ef5350', 0, 0, 0, { rx: Math.PI / 2 });
  const marker2 = group(g);
  part(marker2, cyl(0.01, 0.01, 0.13, 8), '#1565c0', 0, 0, 0, { rx: 1.2, outline: false });
  const clip = clipboard(g, sheetTex('etRoundList', '계약 건물', BUILDINGS.slice(0, 6)), [0, 0, 0]);
  clip.rotation.x = 1.0;
  const plan = use(g, 'etRounds', B.stand[0], B.stand[1]);
  out.spots = { elevatorTech_planRounds: plan, '*': plan };
  out.work = plan.work;
  const shown = 5;
  out.away = (_o, t) => {
    const a = current([plan], t) ? now(plan, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    const n = a ? a.b.n : 0;
    const filled = a ? shown + (((n % 7) + 7) % 7) + (['write', 'back', 'tick'].includes(k) || (k === 'place' && u > 0.75) ? 1 : 0) : shown;
    mags.forEach((m, i) => (m.visible = i < filled));
    held.visible = k === 'take' ? u > 0.5 : k === 'place' && u <= 0.75;
    if (held.visible) place(held, a!.r);
    marker2.visible = k === 'write';
    if (k === 'write') place(marker2, a!.r);
    clip.visible = !!a;
    if (a) clip.position.set(a.l[0], a.l[1], a.l[2]);
    void t;
  };
};

// =============================================================================================
// The 정기검사 desk.

const lawTex = sheetTex('etLaw', '승강기 안전관리법', ['제32조 안전검사', '제31조 자체점검', '월 1회 이상', '결과 전산 입력'], '#37474f');
const inspTex = sheetTex('etInspectForm', '정기검사 기록부', ['고유번호 0777', '브레이크 □', '로프 마모 □', '도어 안전 □', '비상 통화 □', '평가: _____'], BRAND);
const certTex = painted('etCert', 96, 64, (c) => {
  c.fillStyle = '#e8f5e9';
  c.fillRect(0, 0, 96, 64);
  c.fillStyle = '#2e7d32';
  c.fillRect(0, 0, 96, 16);
  text(c, '검사 합격', 48, 9, 11, '#ffffff', 'center');
  text(c, '유효 ~ 2027.11', 48, 30, 10, '#1b5e20', 'center');
  c.fillStyle = '#263238';
  c.fillRect(30, 40, 36, 18);
});
/**
 * The inspection desk: a row of ring binders by building, the 정기검사 기록부 open, the code book, a
 * red stamp and its pad, a label printer, and a stainless sample plate standing up with the place the
 * sticker goes. Safety check (safetyCheck): a binder pulled and opened, a finger down the list, the
 * code book checked, ticks, the 적합 stamp comes down (a red mark), filed. Certificate (etIssueCert): the
 * details typed, the label comes out of the printer, peeled, stuck on the plate, smoothed down, a photo
 * taken of it for the record.
 */
const etInspectDesk: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const D = E.ID;
  const T = D.top;
  part(g, rbox(1.96, 0.04, 0.8, 0.012), '#ccd3d7', 0, T - 0.02, -0.04);
  for (const sx of [-1, 1]) part(g, box(0.04, T - 0.04, 0.72), '#5f6b72', sx * 0.94, (T - 0.04) / 2, -0.04);
  part(g, box(1.8, 0.4, 0.02), '#5f6b72', 0, 0.52, -0.38, { outline: false });
  part(g, rbox(0.34, 0.46, 0.5, 0.012), '#8e99a0', -0.72, 0.24, -0.1);
  for (let i = 0; i < 3; i++) part(g, box(0.12, 0.012, 0.012), CHROME, -0.72, 0.1 + i * 0.13, 0.16, { outline: false });
  // A low shelf at the back with binders.
  part(g, box(1.1, 0.02, 0.2), '#78909c', 0.38, T + 0.26, -0.28, { outline: false });
  for (const x of [-0.17, 0.92]) part(g, box(0.02, 0.26, 0.2), '#78909c', x, T + 0.13, -0.28, { outline: false });
  const colors = ['#1565c0', '#c62828', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#5d4037', '#37474f', '#1565c0', '#2e7d32'];
  const spines: THREE.Object3D[] = [];
  colors.forEach((col, i) => {
    const x = -0.12 + i * 0.1 + 0.0;
    const b = part(g, rbox(0.08, 0.24, 0.17, 0.006), col, x, T + 0.12, -0.27);
    part(g, box(0.05, 0.05, 0.002), '#ffffff', x, T + 0.15, -0.184, { outline: false });
    spines.push(b);
  });
  const lift = spines[6];
  label(g, '정기검사 기록부', 0.5, 0.06, 0.38, T + 0.3, -0.18, BRAND, '#ffffff');
  // The binder pulled out and the open form.
  const binder = group(g);
  part(binder, rbox(0.08, 0.24, 0.17, 0.006), '#5d4037', 0, 0, 0);
  const openBook = group(g, D.open[0], T + 0.008, D.open[2]);
  part(openBook, rbox(0.46, 0.012, 0.3, 0.004), '#5d4037', 0, 0, 0);
  flatPic(openBook, inspTex, 0.21, 0.28, -0.11, 0.008, 0);
  flatPic(openBook, inspTex, 0.21, 0.28, 0.11, 0.008, 0);
  for (let i = 0; i < 3; i++) part(openBook, new THREE.TorusGeometry(0.012, 0.002, 6, 12), CHROME, 0, 0.012, -0.08 + i * 0.08, { ry: Math.PI / 2, outline: false });
  const ticks = [0, 1, 2].map((i) => part(openBook, box(0.03, 0.002, 0.004), '#1565c0', 0.11, 0.012, -0.03 + i * 0.04, { outline: false }));
  const stampMark = part(openBook, cyl(0.03, 0.03, 0.002, 18), '#d32f2f', 0.13, 0.012, 0.08, { outline: false });
  // The code book.
  const lawBook = group(g, D.law[0], T + 0.02, D.law[2]);
  part(lawBook, rbox(0.2, 0.04, 0.27, 0.006), '#37474f', 0, 0, 0);
  flatPic(lawBook, lawTex, 0.18, 0.24, 0, 0.022, 0);
  // Stamp and pad.
  part(g, rbox(0.1, 0.018, 0.08, 0.006), '#c62828', D.stamp[0] + 0.1, T + 0.01, D.stamp[2]);
  const stamp = group(g);
  part(stamp, cyl(0.022, 0.028, 0.06, 12), '#6d4c41', 0, 0.03, 0);
  part(stamp, ball(0.024), '#6d4c41', 0, 0.075, 0);
  const stampRest: V = [D.stamp[0], T + 0.004, D.stamp[2]];
  // Keyboard and screen.
  part(g, rbox(0.3, 0.018, 0.12, 0.004), INK, D.keys[0], T + 0.009, D.keys[2]);
  for (let i = 0; i < 3; i++) part(g, box(0.26, 0.003, 0.016), '#59626b', D.keys[0], T + 0.02, D.keys[2] - 0.03 + i * 0.03, { outline: false });
  part(g, rbox(0.46, 0.3, 0.02, 0.008), INK, 0.44, T + 0.34, -0.1);
  // Under the shelf: a small screen would clash with binders, so it stands to the right front.
  const screen = swapPic(g, 0.42, 0.26, 0.44, T + 0.34, -0.088);
  rod(g, v3(0.44, T, -0.12), v3(0.44, T + 0.2, -0.12), 0.012, '#424242');
  part(g, cyl(0.07, 0.08, 0.016, 14), INK, 0.44, T + 0.008, -0.12);
  // The label printer and its sticker.
  const Pr = D.printer;
  part(g, rbox(0.2, 0.16, 0.2, 0.012), '#e0e6e9', Pr[0], T + 0.08, Pr[2]);
  part(g, box(0.12, 0.012, 0.004), INK, Pr[0], T + 0.07, Pr[2] + 0.101, { outline: false });
  const prLamp = lit(g, ball(0.012), '#2c5e3f', Pr[0] + 0.07, T + 0.14, Pr[2] + 0.1);
  const sticker = group(g);
  part(sticker, box(0.12, 0.08, 0.002), '#e8f5e9', 0, 0, 0, { outline: false });
  picture(sticker, certTex, 0.12, 0.08, 0, 0, 0.002);
  // The sample plate.
  const PL = D.plate;
  part(g, box(0.34, 0.04, 0.12), FRAME, PL[0], T + 0.02, PL[2] - 0.02);
  part(g, rbox(0.3, 0.36, 0.012, 0.004), CHROME, PL[0], T + 0.21, PL[2] - 0.012);
  label(g, '합격증 부착', 0.16, 0.03, PL[0], T + 0.37, PL[2] - 0.004, CHROME, INK);
  part(g, box(0.13, 0.09, 0.001), '#b0bec5', PL[0], PL[1], PL[2] - 0.005, { outline: false });
  const placed = group(g, PL[0], PL[1], PL[2] - 0.004);
  part(placed, box(0.12, 0.08, 0.002), '#e8f5e9', 0, 0, 0, { outline: false });
  picture(placed, certTex, 0.12, 0.08, 0, 0, 0.002);
  // A phone for the record photo.
  const phone = group(g);
  part(phone, rbox(0.07, 0.13, 0.008, 0.006), INK, 0, 0, 0);
  const phoneRest: V = [0.14, T + 0.006, 0.28];
  // Chair.
  const ch = group(g, 0, 0, D.seat + 0.1, Math.PI);
  swivel(ch);
  const check = use(g, 'etInspect', 0, D.seat, true);
  const cert = use(g, 'etCert', 0, D.seat, true);
  out.spots = { elevatorTech_safetyCheck: check, etIssueCert: cert, '*': check };
  out.work = check.work;
  const SC_OK = statusTex('전산 입력', ['고유번호 0777', '적합 · 합격증 출력', '차기검사 2027.11'], GREEN, 'cert');
  const SC_IDLE = statusTex('검사 현황', ['이번 달 대상 12건', '합격 9 · 조건부 1', '남은 2건'], '#37474f', 'inspIdle');
  out.away = (_o, t) => {
    const s = current([check, cert], t);
    ch.position.z = s ? D.seat + 0.04 : D.seat + 0.14;
    const a = s ? now(s, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    const insp = s === check;
    const isCert = s === cert;
    // The binder: on the shelf; in the hand; opened.
    const taken = insp && (k === 'binder' ? u > 0.1 : k === 'file' ? u < 0.9 : false);
    lift.visible = !taken && !(insp && !['binder', 'file'].includes(k));
    binder.visible = taken;
    if (taken) place(binder, a!.r);
    openBook.visible = !insp || !['binder'].includes(k) || u > 0.95;
    if (insp && k === 'file') openBook.visible = u < 0.1;
    // The ticks and the stamp's mark.
    const tickN = insp ? (k === 'tick' ? Math.floor(u * 3) + 1 : k === 'stamp' || k === 'file' ? 3 : 0) : 0;
    ticks.forEach((m, i) => (m.visible = i < tickN));
    stampMark.visible = insp && ((k === 'stamp' && u > 0.35) || k === 'file');
    if (insp && k === 'stamp') place(stamp, E.add(a!.r, 0, -0.06, 0));
    else place(stamp, stampRest);
    // The certificate.
    screen.set(isCert && (k === 'type' || k === 'print') ? SC_OK : SC_IDLE);
    setLit(prLamp, isCert && k === 'print' ? (Math.sin(t * 16) > 0 ? '#6dff9e' : '#2c5e3f') : '#2c5e3f');
    const out0 = isCert && k === 'print' ? E.sm(u, 0.15, 0.9) : 0;
    const inHand = isCert && (k === 'peel' || (k === 'stick' && u < 0.7));
    if (inHand) {
      place(sticker, a!.r);
      sticker.rotation.set(-0.5, 0, 0);
    } else if (isCert && k === 'print') {
      place(sticker, [Pr[0], T + 0.07, Pr[2] + 0.1 + 0.05 * out0]);
      sticker.rotation.set(-1.4, 0, 0);
    } else place(sticker, null);
    placed.visible = isCert && ((k === 'stick' && u >= 0.7) || k === 'smooth' || k === 'photo');
    if (isCert && k === 'photo') {
      place(phone, a!.r);
      phone.rotation.set(-0.1, 0, 0);
    } else {
      place(phone, phoneRest);
      phone.rotation.set(-Math.PI / 2, 0, 0);
    }
  };
};

// =============================================================================================
// The safety rack.

/**
 * A pegboard of the things that keep a mechanic alive: hard hats with the company's stripe, a
 * full-body 안전대 (harness) with lanyard and its big hook, a board of red lock-out padlocks and danger
 * tags with their keys, safety glasses, insulated gloves, a first-aid box and an inspection sheet.
 * Checked before going up (etCheckGear): a hat taken down and turned in the hands, hung back, the
 * harness's webbing run through the fingers, the lanyard hook snapped, a padlock tried on its key,
 * ticked off.
 */
const etSafetyRack: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const S = E.SR;
  part(g, box(1.96, 0.04, 0.42), '#78909c', 0, 0.02, -0.1, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.05, 2.0, 0.05), FRAME, sx * 0.93, 1.0, -0.14);
  part(g, box(1.92, 1.4, 0.03), '#e7ded0', 0, 1.26, -0.12);
  for (let i = 0; i < 22; i++) for (let j = 0; j < 14; j++) if ((i + j) % 2) part(g, box(0.012, 0.012, 0.001), '#b8ad9c', -0.88 + i * 0.084, 0.66 + j * 0.09, -0.103, { outline: false });
  label(g, '안전 장비 · 작업 전 점검', 0.96, 0.1, 0, 1.87, -0.103, HAZARD, INK);
  // Hats.
  const hat = (p: THREE.Object3D, color: string) => {
    part(p, ball(0.11), color, 0, 0.02, 0);
    part(p, cyl(0.125, 0.125, 0.012, 18), color, 0, 0, 0.01, { outline: false });
    part(p, box(0.024, 0.09, 0.22), SIGNAL, 0, 0.09, 0, { outline: false });
  };
  const H = S.helmet;
  const hatOn = group(g, H[0], H[1], H[2]);
  hat(hatOn, '#fafafa');
  for (const [x, c] of [[-0.82, '#fafafa'], [-0.34, '#f4c20d']] as const) {
    const p = group(g, x, H[1], H[2]);
    hat(p, c);
    part(g, cyl(0.008, 0.008, 0.06, 8), INK, x, H[1] - 0.08, H[2] - 0.05, { rx: Math.PI / 2, outline: false });
  }
  const hatHeld = group(g);
  hat(hatHeld, '#fafafa');
  // Harness: straps, D-ring, lanyard.
  const A = S.harness;
  const harness = group(g, A[0], A[1], A[2]);
  const strap = '#e65100';
  for (const sx of [-1, 1]) {
    part(harness, box(0.04, 0.68, 0.012), strap, sx * 0.1, -0.38, 0);
    part(harness, box(0.2, 0.04, 0.012), strap, sx * 0.05, -0.3, 0.012, { rz: sx * 0.5 });
    part(harness, box(0.04, 0.36, 0.012), strap, sx * 0.18, -0.92, 0);
  }
  part(harness, box(0.34, 0.06, 0.014), strap, 0, -0.7, 0.01);
  part(harness, ring(0.03, 0.006), CHROME, 0, -0.12, 0.02);
  part(harness, cyl(0.015, 0.015, 0.02, 8), INK, 0, 0.0, -0.05, { rx: Math.PI / 2, outline: false });
  // Lanyard with its big snap hook.
  const lanyardHome: V = [0.2, 1.22, 0.1];
  const hook = group(g);
  part(hook, ring(0.045, 0.008, Math.PI * 1.6), CHROME, 0, 0, 0);
  const gate = part(hook, box(0.008, 0.06, 0.01), RED, 0.04, -0.01, 0);
  const cord = stretch(g, '#1565c0', 0.009);
  // Lock-out board.
  const P = S.padlock;
  part(g, rbox(0.46, 0.46, 0.012, 0.006), '#c62828', P[0], P[1] + 0.06, -0.09);
  label(g, 'LOTO 잠금·표지', 0.4, 0.06, P[0], P[1] + 0.25, -0.082, '#c62828', '#ffffff');
  for (let i = 0; i < 6; i++) if (i !== 4) padlock(g, P[0] - 0.14 + (i % 3) * 0.14, P[1] + 0.12 - Math.floor(i / 3) * 0.12, -0.07);
  const lockHeld = group(g);
  padlock(lockHeld, 0, 0, 0);
  const lockRest = group(g);
  padlock(lockRest, P[0] - 0.0, P[1] - 0.0, -0.07);
  const key = group(g);
  part(key, cyl(0.012, 0.012, 0.004, 10), BRASS, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(key, box(0.004, 0.04, 0.002), BRASS, 0, -0.025, 0, { outline: false });
  dangerTag(g, P[0] + 0.3, P[1] + 0.13, -0.085);
  dangerTag(g, P[0] + 0.3, P[1] - 0.03, -0.085);
  // Gloves, glasses, first aid.
  for (const x of [-0.72, -0.58]) part(g, rbox(0.1, 0.24, 0.02, 0.012), '#f9a825', x, 0.84, -0.09);
  part(g, rbox(0.3, 0.05, 0.03, 0.01), INK, -0.25, 0.86, -0.08);
  part(g, rbox(0.26, 0.2, 0.08, 0.012), '#ffffff', 0.72, 0.8, -0.05);
  label(g, '✚ 구급함', 0.2, 0.06, 0.72, 0.84, -0.008, '#ffffff', RED);
  // The check sheet on the post.
  const clip = clipboard(g, sheetTex('etGearLog', '안전 장비 점검', ['안전모 □', '안전대 □', '죔줄·고리 □', '잠금장치 □']), [S.clip[0], S.clip[1], S.clip[2] - 0.1]);
  clip.rotation.x = Math.PI / 2 - 0.2;
  const pen = group(g);
  part(pen, cyl(0.007, 0.007, 0.13, 8), BRAND, 0, 0, 0, { rx: 1, outline: false });
  const check = use(g, 'etGear', S.stand[0], S.stand[1]);
  out.spots = { etCheckGear: check, '*': check };
  out.work = check.work;
  out.away = (_o, t) => {
    const a = current([check], t) ? now(check, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    const holdsHat = k === 'helmet' ? u > 0.12 : k === 'shell' ? u < 0.9 : false;
    hatOn.visible = !holdsHat;
    hatHeld.visible = holdsHat;
    if (holdsHat) {
      place(hatHeld, E.lerp(a!.l, a!.r, 0.5));
      hatHeld.rotation.set(0.25, k === 'helmet' ? (u - 0.5) * 2.6 : 0.8 * (1 - u), 0);
    }
    harness.rotation.z = k === 'harness' ? 0.02 * Math.sin(t * 3) : 0;
    const holdHook = k === 'hook';
    if (holdHook) {
      place(hook, a!.r);
      gate.rotation.z = 0.5 * Math.max(0, Math.sin(t * 8));
    } else {
      place(hook, lanyardHome);
      gate.rotation.z = 0;
    }
    const h0 = hook.position;
    cord([A[0], A[1] - 0.12, A[2] + 0.02], [h0.x, h0.y + 0.04, h0.z]);
    const lockOn = k === 'padlock';
    lockRest.visible = !lockOn;
    lockHeld.visible = lockOn;
    key.visible = lockOn;
    if (lockOn) {
      place(lockHeld, a!.l);
      place(key, a!.r);
      key.rotation.z = 0.5 * Math.sin(t * 7);
    }
    pen.visible = k === 'tick';
    if (pen.visible) pen.position.set(a!.r[0], a!.r[1], a!.r[2]);
  };
};

// =============================================================================================
// The van.

/**
 * A short white service van in the company's teal stripe, cab to the right: a sliding side door, inside
 * racks of parts boxes and rope coils, a ladder and amber beacon on the roof. Loading (etLoadVan): the
 * job list ticked, the door slid back, the toolbox lifted off the trolley and shelved, a coil of rope
 * after it, the strap pulled tight, the door shut. Going out (routineCheck, trappedRescue): a mechanic's
 * in the cab; the beacon turns and it drives off along the road, and backs in again on the way home.
 */
const elevatorVan: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const V_ = E.VN;
  const van = group(g);
  const WHITE = '#f4f6f7';
  part(van, rbox(1.92, 0.14, 0.86, 0.03), '#2e3438', 0, 0.3, 0);
  part(van, rbox(1.94, 0.42, 0.88, 0.05), WHITE, 0, 0.56, 0);
  // Cargo box, its back wall, its roof.
  part(van, rbox(1.3, 0.6, 0.05, 0.02), WHITE, -0.3, 1.04, -0.42);
  part(van, box(0.04, 0.6, 0.84), WHITE, -0.94, 1.04, 0);
  part(van, box(0.04, 0.6, 0.84), WHITE, 0.33, 1.04, 0);
  part(van, rbox(1.32, 0.06, 0.9, 0.02), WHITE, -0.3, 1.36, 0);
  part(van, box(1.24, 0.02, 0.8), '#6b777b', -0.3, 0.77, 0);
  // Inside: two shelves with boxes.
  part(van, box(1.2, 0.02, 0.26), STEEL, -0.3, 0.92 - 0.06, -0.2 + 0.0);
  part(van, box(1.2, 0.02, 0.26), STEEL, -0.3, 1.2, -0.26);
  for (let i = 0; i < 4; i++) {
    part(van, rbox(0.22, 0.13, 0.2, 0.01), i % 2 ? '#c9a678' : '#1c6fa8', -0.75 + i * 0.3, 1.28, -0.26);
    if (i) part(van, rbox(0.2, 0.1, 0.2, 0.01), i % 2 ? '#1c6fa8' : '#c9a678', -0.45 + (i - 1) * 0.28, 0.92, -0.28);
  }
  part(van, box(0.02, 0.5, 0.02), INK, -0.82, 1.04, 0.05, { outline: false });
  // Cab, windscreen, side glazing with driver visible.
  part(van, rbox(0.56, 0.2, 0.84, 0.03), WHITE, 0.64, 0.84, 0);
  part(van, rbox(0.6, 0.05, 0.86, 0.02), WHITE, 0.64, 1.28, 0);
  for (const x of [0.38, 0.89]) for (const z of [-0.4, 0.4]) part(van, box(0.03, 0.34, 0.03), WHITE, x, 1.09, z);
  const glassMat = new THREE.MeshBasicMaterial({ color: '#9dd3e4', transparent: true, opacity: 0.22, depthWrite: false });
  const win = part(van, box(0.46, 0.29, 0.006), '#9dd3e4', 0.64, 1.08, 0.41, { material: glassMat, outline: false });
  win.userData.ownMaterial = true;
  part(van, rbox(0.03, 0.3, 0.68, 0.015), '#5f8899', 0.91, 1.08, 0);
  part(van, rbox(0.06, 0.11, 0.84, 0.015), INK, 0.97, 0.42, 0);
  for (const z of [-0.28, 0.28]) lit(van, box(0.02, 0.08, 0.13), '#fff3c6', 0.985, 0.66, z);
  for (let i = 0; i < 4; i++) part(van, box(0.02, 0.014, 0.28), INK, 0.985, 0.54 + i * 0.026, 0, { outline: false });
  part(van, rbox(0.27, 0.05, 0.3, 0.02), INK, 0.56, 0.82, 0.19);
  part(van, rbox(0.04, 0.26, 0.3, 0.02), INK, 0.42, 0.94, 0.19);
  part(van, box(0.08, 0.09, 0.7), INK, 0.84, 0.94, 0);
  const steering = part(van, ring(0.07, 0.008), INK, 0.76, 1.0, 0.19, { ry: Math.PI / 2, rz: 0.15 });
  // The stripe and name along the lower body.
  part(van, box(1.9, 0.09, 0.006), BRAND, 0, 0.56, 0.443, { outline: false });
  label(van, '승강기 365 긴급 출동', 0.74, 0.07, 0.3, 0.44, 0.444, WHITE, BRAND);
  // The plate.
  label(van, '12오 3456', 0.24, 0.06, -0.54, 0.42, 0.444, '#ffffff', INK);
  // Wheels.
  const wheels: THREE.Object3D[] = [];
  for (const x of [-0.62, 0.63]) for (const z of [-0.43, 0.43]) {
    const w = group(van, x, 0.24, z);
    part(w, cyl(0.2, 0.2, 0.1, 24), '#2e3438', 0, 0, 0, { rx: Math.PI / 2 });
    part(w, cyl(0.11, 0.11, 0.104, 18), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
    part(w, cyl(0.05, 0.05, 0.11, 12), INK, 0, 0, 0, { rx: Math.PI / 2 });
    wheels.push(w);
  }
  // Tail lamp, brake, reversing.
  for (const z of [-0.3, 0.3]) part(van, box(0.024, 0.12, 0.07), RED, -0.975, 0.64, z);
  const reverse = group(van);
  for (const z of [-0.3, 0.3]) part(reverse, box(0.028, 0.04, 0.07), PAPER, -0.978, 0.6, z);
  // Roof rack, ladder, beacon.
  for (const x of [-0.74, 0.14]) {
    for (const z of [-0.3, 0.3]) part(van, box(0.04, 0.09, 0.04), INK, x, 1.42, z);
    part(van, box(0.05, 0.04, 0.72), STEEL, x, 1.47, 0);
  }
  for (const z of [-0.18, 0.18]) part(van, box(1.56, 0.05, 0.035), CHROME, -0.3, 1.52, z);
  for (let i = 0; i < 9; i++) part(van, box(0.028, 0.035, 0.36), CHROME, -1.0 + 0.16 * i + 0.06, 1.52, 0);
  part(van, cyl(0.06, 0.07, 0.03, 14), INK, 0.62, 1.32, 0);
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#7a5a10' });
  const beacon = part(van, cyl(0.05, 0.05, 0.08, 14), '#7a5a10', 0.62, 1.38, 0, { material: beaconMat, outline: false });
  beacon.userData.ownMaterial = true;
  // The driver.
  const driver = group(van, 0.56, 0.84, 0.19, Math.PI / 2);
  part(driver, rbox(0.2, 0.23, 0.15, 0.035), BRAND, 0, 0.12, 0);
  part(driver, ball(0.084), '#e9bd94', 0, 0.29, 0);
  part(driver, ball(0.087), SIGNAL, 0, 0.315, -0.01);
  for (const sx of [-1, 1]) {
    rod(driver, v3(sx * 0.105, 0.22, 0), v3(sx * 0.075, 0.13, 0.22), 0.023, BRAND);
    part(driver, ball(0.025), '#e9bd94', sx * 0.075, 0.13, 0.22, { outline: false });
  }
  // The sliding door.
  const door = group(van, -0.3, 0, 0.45);
  part(door, rbox(1.2, 0.56, 0.03, 0.012), WHITE, 0, 1.04, 0);
  part(door, box(1.1, 0.1, 0.03), BRAND, 0, 0.94, 0.002);
  label(door, CO, 0.6, 0.12, 0, 1.14, 0.018, WHITE, BRAND);
  label(door, '승강기 유지관리 · 긴급 구출', 0.92, 0.07, 0, 0.94, 0.02, BRAND, '#ffffff');
  part(door, rbox(0.1, 0.025, 0.03, 0.006), INK, -0.5, 1.03, 0.025);
  // What's loaded.
  const toolbox = (p: THREE.Object3D) => {
    part(p, rbox(0.34, 0.15, 0.17, 0.012), RED, 0, 0, 0);
    part(p, box(0.17, 0.02, 0.02), INK, 0, 0.09, 0, { outline: false });
    part(p, box(0.04, 0.03, 0.008), CHROME, -0.1, 0.02, 0.086, { outline: false });
    part(p, box(0.04, 0.03, 0.008), CHROME, 0.1, 0.02, 0.086, { outline: false });
  };
  const coilOf = (p: THREE.Object3D) => {
    for (let i = 0; i < 4; i++) part(p, new THREE.TorusGeometry(0.11, 0.013, 6, 18), '#b8bec2', 0, -0.03 + i * 0.022, 0, { rx: Math.PI / 2, outline: false });
    part(p, box(0.04, 0.09, 0.02), HAZARD, 0.11, 0, 0, { outline: false });
  };
  const boxIn = group(van);
  toolbox(boxIn);
  place(boxIn, [V_.shelf[0], V_.shelf[1], V_.shelf[2]]);
  const coilIn = group(van);
  coilOf(coilIn);
  place(coilIn, [V_.coil[0], V_.coil[1], V_.coil[2]]);
  const strapM = part(van, box(0.82, 0.03, 0.006), '#ef6c00', -0.46, 1.03, 0.205, { outline: false });
  // The trolley, parked in front, with the load on it.
  const T = V_.trolley;
  const trolley = group(g, T[0], 0, T[1]);
  part(trolley, rbox(0.56, 0.04, 0.34, 0.01), '#4a6f85', 0, 0.42, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(trolley, cyl(0.03, 0.03, 0.03, 10), INK, sx * 0.24, 0.03, sz * 0.14, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(trolley, box(0.025, 0.38, 0.025), STEEL, sx * 0.25, 0.23, sz * 0.15);
  rod(trolley, v3(0.27, 0.44, -0.16), v3(0.27, 0.88, -0.16), 0.012, INK);
  rod(trolley, v3(0.27, 0.44, 0.16), v3(0.27, 0.88, 0.16), 0.012, INK);
  rod(trolley, v3(0.27, 0.88, -0.16), v3(0.27, 0.88, 0.16), 0.014, INK);
  const boxHand = group(g);
  toolbox(boxHand);
  const coilHand = group(g);
  coilOf(coilHand);
  // The job list.
  const list = clipboard(g, sheetTex('etLoadList', '출동 장비', ['공구함 □', '로프 □', '안전대 □', '인터폰 □']), [0, 0, 0]);
  list.rotation.x = Math.PI / 2 - 0.3;
  const pen = group(g);
  part(pen, cyl(0.007, 0.007, 0.13, 8), BRAND, 0, 0, 0, { rx: 1, outline: false });
  const load = use(g, 'etLoad', V_.stand[0], V_.stand[1]);
  const check = use(g, 'etLoad', V_.stand[0], V_.stand[1]);
  const rescue = use(g, 'etLoad', V_.stand[0], V_.stand[1]);
  out.spots = { etLoadVan: load, routineCheck: check, trappedRescue: rescue, '*': load };
  out.work = load.work;
  let state: 'parked' | 'ready' | 'leaving' | 'gone' | 'back' = 'parked';
  let since = 0;
  let travel = 0;
  let returnFrom = 1;
  out.away = (isOut, t) => {
    if (isOut && (state === 'parked' || state === 'back')) {
      state = 'ready';
      since = t;
    } else if (!isOut && (state === 'ready' || state === 'leaving' || state === 'gone')) {
      returnFrom = travel;
      state = 'back';
      since = t;
    }
    if (state === 'ready' && t - since > 1.6) {
      state = 'leaving';
      since = t;
    }
    if (state === 'leaving') {
      travel = Math.min(1, (t - since) / 5) ** 2;
      if (travel === 1) state = 'gone';
    } else if (state === 'back') {
      travel = returnFrom * (1 - Math.min(1, (t - since) / 6)) ** 2;
      if (travel === 0) state = 'parked';
    } else if (state === 'parked' || state === 'ready') travel = 0;
    van.position.x = travel * 9;
    van.visible = state !== 'gone';
    trolley.visible = state === 'parked';
    wheels.forEach((w) => (w.rotation.z = (-travel * 9) / 0.2));
    const moving = state === 'leaving' || state === 'back';
    driver.visible = moving || state === 'ready';
    driver.rotation.y = Math.PI / 2 + (state === 'back' ? -0.2 : 0);
    steering.rotation.x = moving ? 0.12 * Math.sin(t * 2) : 0;
    reverse.visible = state === 'back';
    beaconMat.color.set(isOut || moving ? (Math.sin(t * 12) > 0 ? '#ffb300' : '#7a5a10') : '#7a5a10');
    const a = !isOut && state === 'parked' && current([load], t) ? now(load, t) : null;
    const k = a?.b.key ?? '';
    const u = a?.b.u ?? 0;
    const doorOpen = !a ? 0 : k === 'door' ? E.sm(u, 0.1, 0.9) : k === 'shut' ? 1 - E.sm(u, 0.1, 0.9) : k === 'list' ? 0 : 1;
    door.position.x = -0.3 + 0.7 * doorOpen;
    // The load.
    const stacked = !a || ['strap', 'shut'].includes(k) || (k === 'list' && false);
    boxIn.visible = !a ? true : stacked || k === 'coil' || k === 'in2' || (k === 'in' && u > 0.85);
    coilIn.visible = !a ? true : stacked || (k === 'in2' && u > 0.85);
    strapM.visible = !a || k === 'strap' || k === 'shut';
    if (a && (k === 'box' || (k === 'in' && u <= 0.85))) place(boxHand, E.vnBoxAt(k, u));
    else if (a && ['list', 'door'].includes(k)) place(boxHand, E.vnBoxAt('', 0));
    else place(boxHand, null);
    if (a && (k === 'coil' || (k === 'in2' && u <= 0.85))) place(coilHand, E.vnCoilAt(k, u));
    else if (a && ['list', 'door', 'box', 'in'].includes(k)) place(coilHand, E.vnCoilAt('', 0));
    else place(coilHand, null);
    list.visible = !!a && k === 'list';
    if (k === 'list') list.position.set(V_.list[0], V_.list[1] - 0.02, V_.list[2]);
    pen.visible = k === 'list';
    if (pen.visible) pen.position.set(a!.r[0], a!.r[1], a!.r[2]);
  };
};

// =============================================================================================
// The lobby's display.

const safetyTex = painted('etRules', 256, 340, (c) => {
  c.fillStyle = '#fdfaf1';
  c.fillRect(0, 0, 256, 340);
  c.fillStyle = BRAND;
  c.fillRect(0, 0, 256, 44);
  text(c, '승강기 안전 수칙', 128, 23, 22, '#ffffff', 'center');
  ['갇혔을 땐 침착하게', '비상 버튼을 누르세요', '문을 억지로 열지 마세요', '정원을 지켜 주세요', '어린이는 손잡고 타요'].forEach((s, i) => {
    c.fillStyle = BRAND;
    c.beginPath();
    c.arc(26, 82 + i * 50, 13, 0, Math.PI * 2);
    c.fill();
    text(c, String(i + 1), 26, 83 + i * 50, 15, '#ffffff', 'center');
    text(c, s, 48, 83 + i * 50, 16, '#37474f');
  });
});
/**
 * For the 관리소장 who comes in: a glass case with a working scale model of a lift (a little car and
 * counterweight going up and down by themselves), the 안전 수칙 board beside it, a sample door panel
 * and button plate, brochures. Set dressing.
 */
const etLobbyModel: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(0.9, 0.82, 0.62, 0.012), '#37474f', -0.42, 0.41, -0.04);
  label(g, '승강기 구조 모형', 0.7, 0.1, -0.42, 0.62, 0.272, '#37474f', '#ffd54f');
  label(g, `${CO}`, 0.46, 0.08, -0.42, 0.44, 0.272, '#37474f', '#ffffff');
  // The model: a frame with a little car.
  const M = group(g, -0.42, 0.82, -0.04);
  for (const [x, z] of [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.1], [0.14, 0.1]] as const) part(M, box(0.012, 0.96, 0.012), FRAME, x, 0.48, z, { outline: false });
  part(M, box(0.3, 0.02, 0.22), FRAME, 0, 0.97, 0, { outline: false });
  part(M, cyl(0.03, 0.03, 0.03, 14), INK, 0, 0.93, 0, { rx: Math.PI / 2 });
  const car = group(M);
  part(car, box(0.16, 0.2, 0.14), CHROME, 0, 0, 0);
  part(car, box(0.14, 0.17, 0.002), '#ffe082', 0, 0, 0.071, { outline: false });
  const cwt = group(M);
  part(cwt, box(0.05, 0.14, 0.05), HAZARD, -0.09, 0, -0.04);
  const r1 = stretch(M, ROPE, 0.002);
  const r2 = stretch(M, ROPE, 0.002);
  // The glass case over it.
  const glassMat = new THREE.MeshBasicMaterial({ color: '#cfeaf7', transparent: true, opacity: 0.16, depthWrite: false });
  const glass = part(g, box(0.5, 1.06, 0.5), '#cfeaf7', -0.42, 1.35, -0.04, { material: glassMat, outline: false });
  glass.userData.ownMaterial = true;
  // The board.
  part(g, box(0.04, 1.75, 0.04), FRAME, 0.56, 0.875, -0.3);
  part(g, rbox(0.72, 0.94, 0.02, 0.006), '#ffffff', 0.56, 1.32, -0.28);
  picture(g, safetyTex, 0.68, 0.9, 0.56, 1.32, -0.268);
  part(g, cyl(0.16, 0.18, 0.03, 18), INK, 0.56, 0.015, -0.3);
  // A sample door panel and a button plate, a brochure stand.
  part(g, rbox(0.26, 0.24, 0.1, 0.01), '#dfe5e8', 0.5, 0.25, 0.1);
  for (let i = 0; i < 3; i++) part(g, rbox(0.06, 0.1, 0.012, 0.003), ['#ef5350', '#42a5f5', '#66bb6a'][i], 0.42 + i * 0.08, 0.3, 0.156);
  label(g, '안내서', 0.2, 0.04, 0.5, 0.17, 0.152, '#dfe5e8', INK);
  out.away = (_o, t) => {
    const y = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.5));
    car.position.y = y;
    cwt.position.y = 0.94 - y;
    r1.call(null, [0, y + 0.1, 0], [0, 0.93, 0]);
    r2.call(null, [-0.09, 0.94 - y + 0.07, -0.04], [-0.03, 0.93, -0.02]);
  };
};

/** 점검 중 안내 바리케이드: a folding barrier at either side of the landing, the notice on the right one, a cone at each end. */
const etServiceBarrier: Builder = (g) => {
  for (const sx of [-1, 1]) {
    const x = sx * 0.85;
    for (const dz of [-0.12, 0.12]) part(g, box(0.04, 0.95, 0.04), '#eceff1', x, 0.47, dz, { rz: sx * 0.05 });
    for (let i = 0; i < 4; i++) part(g, box(0.06, 0.12, 0.3), i % 2 ? INK : HAZARD, x, 0.82 - i * 0.001, -0.15 + i * 0.1, { outline: false });
    part(g, box(0.07, 0.14, 0.42), HAZARD, x, 0.82, 0);
    part(g, cyl(0.03, 0.14, 0.42, 14), '#f57c00', x, 0.21, 0.34);
    part(g, cyl(0.1, 0.1, 0.02, 14), INK, x, 0.01, 0.34);
  }
  label(g, '승강기 점검 중 · 계단을 이용해 주세요', 0.42, 0.3, 0.85, 1.12, 0.03, '#ffffff', RED);
  label(g, CO, 0.36, 0.07, 0.85, 0.94, 0.03, BRAND, '#ffffff');
};

export const BUILDERS: Record<string, Builder> = {
  elevatorMockup, motorBench, partsCabinet, monitorDesk, elevatorVan,
  etControlCabinet, etGovernor, etRailJig, etMonitorWall, etRoundsBoard, etInspectDesk, etSafetyRack, etLobbyModel, etServiceBarrier,
};
