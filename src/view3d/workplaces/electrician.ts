import * as THREE from 'three';
import { deskChair, marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { label, painted, picture, ring, text } from './doctor';
import * as E from './electricianMotion';

/**
 * 전기 공사 업체: plywood practice walls, segregated conductors, lockout tags,
 * insulated instruments, a working ceiling mock-up and a loaded service van.
 * 해온전기 is only a fictional name painted on equipment, never the workplace name.
 * Every loose tool is one object, placed either in its holder or at the matching
 * motion's hand. State changes use the same fixed marker as electricianMotion.
 */
const INK = '#25343c';
const STEEL = '#9eafb5';
const CHROME = '#d5dce0';
const YELLOW = '#f2bb38';
const BLUE = '#246e9d';
const RED = '#c44938';
const GREEN = '#45836a';
const PAPER = '#f8f3e7';
const WOOD = '#c3a274';
const RUBBER = '#30363a';
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
type V = E.V;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
  return g;
}
function place(m: THREE.Object3D, p: V | null) {
  m.visible = !!p;
  if (p) m.position.set(...p);
}
function use(g: THREE.Object3D, motion: E.ElMotion, x = 0, z = 0.62, sit = false, y = 0) {
  const s = spot(g, sit ? 'sit' : 'stand', x, sit ? 0.48 : y, z, Math.PI, sit ? 0.48 : undefined);
  s.motion = motion;
  s.work = marker(g, 0, 1, 0);
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function current(list: Spot[], t: number): Spot | null {
  return list.filter(s => Math.abs(t - posedAt(s)) < 0.6).sort((a, b) => posedAt(b) - posedAt(a))[0] ?? null;
}
function now(s: Spot, t: number) {
  return E.elNow(s.motion as E.ElMotion, t, E.elPhase(s.work!.getWorldPosition(tmp)));
}
function flatLabel(g: THREE.Object3D, words: string, w: number, d: number, p: V, bg = PAPER, fg = INK) {
  const m = label(g, words, w, d, ...p, bg, fg);
  m.rotation.x = -Math.PI / 2;
  return m;
}
function screw(g: THREE.Object3D, p: V, r = 0.012) {
  part(g, cyl(r, r, 0.007, 10), CHROME, ...p, { rx: Math.PI / 2, outline: false });
  part(g, box(r * 1.3, 0.002, 0.002), INK, p[0], p[1], p[2] + 0.004, { rz: 0.5, outline: false });
}
function cable(g: THREE.Object3D, points: V[], color: string, radius = 0.009) {
  for (let i = 1; i < points.length; i++) rod(g, v(...points[i - 1]), v(...points[i]), radius, color);
}
function stretch(g: THREE.Object3D, color: string, radius = 0.01) {
  const m = part(g, cyl(radius, radius, 1, 8), color, 0, 0, 0, { outline: false });
  return (a: V, b: V) => {
    const d = v(...b).sub(v(...a));
    m.position.copy(v(...a)).addScaledVector(d, 0.5);
    m.scale.y = Math.max(0.001, d.length());
    if (d.lengthSq() > 1e-9) m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
function pilot(g: THREE.Object3D, out: Built, p: V, color = '#8df5a0', radius = 0.016) {
  part(g, cyl(radius * 1.45, radius * 1.45, 0.014, 12), RUBBER, ...p, { rx: Math.PI / 2 });
  if (!out.inUse) out.inUse = group(g);
  const material = new THREE.MeshBasicMaterial({ color });
  const m = part(out.inUse, ball(radius), color, p[0], p[1], p[2] + 0.012, { material, outline: false });
  m.userData.ownMaterial = true;
  return m;
}
function status(g: THREE.Object3D, w: number, h: number, p: V, fg = '#c8f9bc') {
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  if (canvas) { canvas.width = 512; canvas.height = Math.max(64, Math.round(512 * h / w)); }
  const texture = canvas ? new THREE.CanvasTexture(canvas) : new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
  m.position.set(...p);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.userData.ownTexture = true;
  g.add(m);
  let last = '';
  return { mesh: m, set(words: string) {
    if (!canvas || words === last) return;
    last = words;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#172d32'; c.fillRect(0, 0, canvas.width, canvas.height);
    text(c, words, 256, canvas.height / 2, Math.min(55, canvas.height * 0.58), fg, 'center');
    texture.needsUpdate = true;
  } };
}
function bench(g: THREE.Object3D, width: number, top = 0.9, depth = 0.65) {
  part(g, rbox(width, 0.055, depth, 0.012), '#b9c6c8', 0, top - 0.0275, 0.02);
  part(g, box(width - 0.025, 0.009, depth - 0.02), '#486a65', 0, top + 0.004, 0.02, { outline: false });
  for (const x of [-width / 2 + 0.06, width / 2 - 0.06]) {
    for (const z of [-0.24, 0.27]) {
      part(g, box(0.05, top - 0.055, 0.05), INK, x, (top - 0.055) / 2, z);
      part(g, rbox(0.08, 0.03, 0.08, 0.006), RUBBER, x, 0.015, z);
    }
    part(g, box(0.04, 0.04, 0.55), STEEL, x, 0.21, 0.02);
  }
  part(g, box(width - 0.1, 0.025, depth - 0.07), STEEL, 0, 0.25, 0.01);
}
function tool(g: THREE.Object3D, kind: 'driver' | 'pen' | 'probe' | 'cutter', color = RED) {
  const root = group(g);
  if (kind === 'cutter') {
    for (const side of [-1, 1]) {
      rod(root, v(side * 0.028, -0.07, 0), v(side * 0.012, 0.035, 0), 0.012, color);
      rod(root, v(side * 0.012, 0.025, 0), v(-side * 0.015, 0.08, 0), 0.012, STEEL);
    }
    screw(root, [0, 0.025, 0.014], 0.009);
  } else {
    const pen = kind === 'pen';
    part(root, cyl(pen ? 0.006 : 0.016, pen ? 0.006 : 0.018, pen ? 0.13 : 0.09, 10), color, 0, 0.005, 0);
    part(root, cyl(0.004, 0.004, pen ? 0.04 : 0.11, 8), CHROME, 0, pen ? -0.08 : 0.105, 0, { outline: false });
    if (!pen) part(root, cyl(0.023, 0.023, 0.012, 10), YELLOW, 0, 0.05, 0);
  }
  return root;
}
function paper(g: THREE.Object3D, p: V, heading: string, w = 0.28, d = 0.24) {
  const root = group(g, ...p);
  part(root, box(w + 0.03, 0.012, d + 0.035), '#9d805c', 0, -0.005, 0);
  part(root, box(w, 0.003, d), PAPER, 0, 0.004, 0, { outline: false });
  flatLabel(root, heading, w * 0.9, 0.04, [0, 0.007, -d * 0.33]);
  for (let i = 0; i < 4; i++) part(root, box(w * 0.8, 0.001, 0.002), '#aab7b8', 0, 0.007, -d * 0.14 + i * d * 0.15, { outline: false });
  part(root, box(0.07, 0.015, 0.025), CHROME, 0, 0.012, -d / 2);
  return root;
}
function ticks(g: THREE.Object3D, p: V, n = 4) {
  return Array.from({ length: n }, (_, i) => {
    const a = group(g, p[0], p[1], p[2] + i * 0.033);
    rod(a, v(-0.016, 0, 0), v(-0.006, 0, 0.012), 0.0025, BLUE);
    rod(a, v(-0.006, 0, 0.012), v(0.018, 0, -0.012), 0.0025, BLUE);
    a.visible = false;
    return a;
  });
}
function lockTag(g: THREE.Object3D, p: V) {
  const a = group(g, ...p);
  part(a, ring(0.022, 0.005, Math.PI * 1.7), CHROME, 0, 0.035, 0);
  part(a, rbox(0.055, 0.055, 0.025, 0.006), RED, 0, 0, 0);
  label(a, '조작 금지', 0.11, 0.04, 0, -0.065, 0.008, RED, PAPER);
  label(a, '작업 중', 0.11, 0.035, 0, -0.102, 0.008, PAPER, RED);
  rod(a, v(0, 0, 0), v(0, -0.04, 0), 0.003, CHROME);
  return a;
}
function helmet(g: THREE.Object3D, p: V) {
  const a = group(g, ...p);
  part(a, new THREE.SphereGeometry(0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), YELLOW, 0, 0, 0);
  part(a, cyl(0.14, 0.14, 0.014, 22), YELLOW, 0, 0, 0);
  part(a, box(0.018, 0.018, 0.17), '#ffe49d', 0, 0.108, -0.01, { outline: false });
  part(a, ring(0.09, 0.006, Math.PI), INK, 0, -0.01, 0, { rx: Math.PI });
  return a;
}
function glove(g: THREE.Object3D, p: V, color = '#df9d59') {
  const a = group(g, ...p);
  part(a, rbox(0.073, 0.10, 0.035, 0.014), color, 0, 0, 0);
  for (let i = 0; i < 4; i++) part(a, cyl(0.008, 0.01, 0.06 - Math.abs(i - 1.5) * 0.008, 8), color, -0.025 + i * 0.017, 0.067, 0, { outline: false });
  part(a, rbox(0.022, 0.056, 0.025, 0.01), color, 0.044, 0.015, 0, { rz: -0.6 });
  part(a, box(0.08, 0.025, 0.038), '#f4d2a5', 0, -0.05, 0);
  return a;
}

/** Protective equipment follows the operator, with the same local contact points as the IK. */
function wornProtection(g: THREE.Object3D) {
  const hat = helmet(g, [0, 0, 0]);
  const left = glove(g, [0, 0, 0]);
  const right = glove(g, [0, 0, 0]);
  left.scale.setScalar(0.78);
  right.scale.setScalar(0.78);
  left.rotation.x = right.rotation.x = -Math.PI / 2;
  hat.visible = left.visible = right.visible = false;
  return (s: Spot | null, a: ReturnType<typeof E.elNow> | null) => {
    hat.visible = left.visible = right.visible = !!s && !!a;
    if (!s || !a) return;
    const height = (s.at.userData.height as number | undefined) ?? 1.6;
    const p = s.at.position;
    // Follow both the torso bend and the neck tilt; leave room for the avatar's hair.
    const scale = height / 1.6;
    hat.position.set(p.x, p.y + height - 0.045 - a.crouch * 0.30
      - 0.55 * (1 - Math.cos(a.lean)) - 0.16 * (1 - Math.cos(a.nod)),
    p.z - 0.55 * Math.sin(a.lean) - 0.16 * Math.sin(a.nod) + 0.035);
    hat.scale.set(1.25 * scale, 1.08 * scale, 1.25 * scale);
    hat.rotation.set(-a.lean - a.nod * 0.55, Math.PI, 0);
    place(left, a.l);
    place(right, a.r);
    left.rotation.z = -0.1;
    right.rotation.z = 0.1;
  };
}
function meter(g: THREE.Object3D, p: V, clamp = false) {
  const a = group(g, ...p);
  part(a, rbox(0.14, 0.23, 0.055, 0.017), YELLOW, 0, 0, 0);
  part(a, rbox(0.115, 0.19, 0.058, 0.01), INK, 0, 0, 0);
  const read = status(a, 0.095, 0.043, [0, 0.055, 0.031]);
  read.set('0.00');
  const dial = part(a, cyl(0.027, 0.027, 0.012, 14), '#57636c', 0, -0.025, 0.036, { rx: Math.PI / 2 });
  part(a, box(0.008, 0.025, 0.006), PAPER, 0, -0.025, 0.044, { rz: 0.4, outline: false });
  for (const x of [-0.035, 0.035]) part(a, ball(0.009), x < 0 ? RUBBER : RED, x, -0.08, 0.032, { outline: false });
  const jaw = group(a, 0, 0.15, 0);
  if (clamp) {
    for (const x of [-1, 1]) part(jaw, ring(0.056, 0.013, Math.PI * 0.9), RED, 0, 0, 0, { rz: x < 0 ? 0.15 : Math.PI + 0.15 });
  }
  return { root: a, read, dial, jaw };
}
function outlet(g: THREE.Object3D, p: V) {
  const a = group(g, ...p);
  part(a, rbox(0.13, 0.13, 0.03, 0.008), PAPER, 0, 0, 0);
  part(a, cyl(0.041, 0.041, 0.006, 18), '#cbd0cb', 0, 0, 0.018, { rx: Math.PI / 2, outline: false });
  for (const x of [-0.018, 0.018]) part(a, ball(0.008), RUBBER, x, 0, 0.023, { outline: false });
  screw(a, [0, 0.052, 0.017], 0.006);
  screw(a, [0, -0.052, 0.017], 0.006);
  return a;
}
function rocker(g: THREE.Object3D, p: V) {
  const a = group(g, ...p);
  part(a, rbox(0.105, 0.14, 0.035, 0.007), PAPER, 0, 0, 0);
  const lever = part(a, rbox(0.062, 0.09, 0.018, 0.006), '#e6e7de', 0, 0, 0.025);
  label(a, 'ON', 0.035, 0.015, 0, 0.035, 0.036, PAPER, GREEN);
  return lever;
}
function toolbox(g: THREE.Object3D, p: V) {
  const a = group(g, ...p);
  part(a, rbox(0.34, 0.19, 0.23, 0.018), BLUE, 0, -0.07, 0);
  part(a, rbox(0.35, 0.045, 0.24, 0.01), INK, 0, 0.04, 0);
  part(a, rbox(0.12, 0.025, 0.035, 0.006), RUBBER, 0, 0.10, 0);
  for (const x of [-0.06, 0.06]) rod(a, v(x, 0.05, 0), v(x, 0.10, 0), 0.009, CHROME);
  for (const x of [-0.11, 0.11]) part(a, box(0.035, 0.055, 0.012), CHROME, x, 0.013, 0.123);
  label(a, '절연 공구', 0.19, 0.044, 0, -0.075, 0.118, BLUE, PAPER);
  return a;
}

/** A drawn colleague/client with articulated arms and an actual seated or standing body. */
function person(parent: THREE.Object3D, x: number, z: number, yaw: number, seated = false, worker = false) {
  const root = group(parent, x, 0, z, yaw);
  const skin = '#e9bd94', top = worker ? '#d9aa38' : '#8198a5';
  const hipY = seated ? 0.55 : 0.87;
  const shoulderY = seated ? 0.98 : 1.30;
  for (const side of [-1, 1]) {
    const hip: V = [side * 0.09, hipY, 0];
    const knee: V = [side * 0.10, seated ? 0.53 : 0.46, seated ? 0.29 : 0.025];
    const ankle: V = [side * 0.10, 0.08, seated ? 0.38 : 0.035];
    rod(root, v(...hip), v(...knee), 0.058, INK);
    rod(root, v(...knee), v(...ankle), 0.048, INK);
    part(root, rbox(0.10, 0.07, 0.20, 0.025), RUBBER, ankle[0], 0.045, ankle[2] + 0.035);
  }
  part(root, rbox(0.31, 0.15, 0.23, 0.045), INK, 0, hipY, 0);
  part(root, rbox(0.34, 0.43, 0.22, 0.06), top, 0, shoulderY - 0.17, 0);
  if (worker) {
    for (const sx of [-1, 1]) part(root, box(0.025, 0.34, 0.225), PAPER, sx * 0.12, shoulderY - 0.18, 0, { outline: false });
    label(root, '기사', 0.08, 0.034, 0.07, shoulderY - 0.11, 0.116, INK, PAPER);
  }
  part(root, cyl(0.043, 0.045, 0.08, 10), skin, 0, shoulderY + 0.045, 0);
  const head = group(root, 0, shoulderY + 0.19, 0);
  part(head, ball(0.11), skin, 0, 0, 0);
  part(head, ball(0.115), '#352c29', 0, 0.03, -0.035);
  for (const side of [-1, 1]) part(head, ball(0.009), INK, side * 0.038, 0.006, 0.103, { outline: false });
  part(head, box(0.029, 0.006, 0.005), '#995c53', 0, -0.042, 0.104, { outline: false });
  if (worker) helmet(head, [0, 0.105, -0.015]).scale.setScalar(1.16);
  const arms = [-1, 1].map(side => {
    const upper = stretch(root, top, 0.042), fore = stretch(root, top, 0.034);
    const hand = part(root, ball(0.035), worker ? '#df9d59' : skin, 0, 0, 0, { outline: false });
    return (to: V | null) => {
      const sh = v(side * 0.19, shoulderY, 0);
      const end = to ? v(...to).sub(root.position).applyAxisAngle(UP, -yaw) : v(side * 0.18, hipY + 0.12, seated ? 0.24 : 0.06);
      const d = end.clone().sub(sh), len = Math.max(0.08, Math.min(0.51, d.length()));
      d.normalize(); end.copy(sh).addScaledVector(d, len);
      const pole = v(side * 0.5, -1, -0.25); pole.addScaledVector(d, -pole.dot(d)).normalize();
      const cos = THREE.MathUtils.clamp((0.27 ** 2 + len ** 2 - 0.25 ** 2) / (0.54 * len), -1, 1);
      const elbow = sh.clone().addScaledVector(d, 0.27 * cos).addScaledVector(pole, 0.27 * Math.sqrt(1 - cos * cos));
      upper(sh.toArray() as [number, number, number], elbow.toArray() as [number, number, number]);
      fore(elbow.toArray() as [number, number, number], end.toArray() as [number, number, number]);
      hand.position.copy(end);
    };
  });
  arms.forEach(fn => fn(null));
  return { root, head, left: arms[0], right: arms[1] };
}

/** Printed single-line drawing used on paper, consultation boards and the CAD screen. */
function diagramTexture(stage = 4, review = false) {
  return painted(`elDiagram:${stage}:${review}`, 640, 400, c => {
    c.fillStyle = '#e8f0ec'; c.fillRect(0, 0, 640, 400);
    c.fillStyle = '#294f60'; c.fillRect(0, 0, 640, 50);
    text(c, '단선결선도 · 해온전기', 24, 26, 26, PAPER);
    c.strokeStyle = '#c8d8d6'; c.lineWidth = 1;
    for (let x = 20; x < 640; x += 20) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x, 350); c.stroke(); }
    for (let y = 60; y < 350; y += 20) { c.beginPath(); c.moveTo(20, y); c.lineTo(620, y); c.stroke(); }
    c.strokeStyle = '#284d5e'; c.lineWidth = 5;
    c.strokeRect(55, 88, 100, 56);
    text(c, '주차단기', 105, 115, 21, INK, 'center');
    c.beginPath(); c.moveTo(155, 116); c.lineTo(548, 116); c.stroke();
    for (let i = 0; i < Math.min(4, stage); i++) {
      const x = 235 + i * 100;
      c.beginPath(); c.moveTo(x, 116); c.lineTo(x, 170); c.lineTo(x + 15, 198); c.moveTo(x, 203); c.lineTo(x, 277); c.stroke();
      c.strokeRect(x - 28, 277, 56, 32);
      text(c, ['조명', '콘센트', '냉방', '예비'][i], x, 333, 20, INK, 'center');
      text(c, ['10A', '20A', '30A', '20A'][i], x + 30, 220, 18, BLUE, 'center');
    }
    text(c, 'L · N · PE 분리 / 회로별 부하 확인', 320, 378, 22, GREEN, 'center');
    if (review) {
      c.strokeStyle = RED; c.lineWidth = 5; c.beginPath(); c.arc(337, 218, 47, 0, Math.PI * 2); c.stroke();
      text(c, '선경 재확인', 480, 253, 23, RED, 'center');
    }
  });
}

/** Plywood, clipped conduit, open junction boxes and a complete lamp circuit. */
const wiringBoard: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g, 1.94, 0.88);
  part(g, box(1.88, 1.18, 0.055), WOOD, 0, 1.38, -0.24);
  for (let i = 0; i < 11; i++) part(g, box(1.8, 0.003, 0.001), '#b28c60', 0, 0.85 + i * 0.102, -0.211, { outline: false });
  for (const x of [-0.88, 0.88]) for (const y of [0.86, 1.9]) screw(g, [x, y, -0.205]);
  label(g, '배선 실습 · 차단 → 검전 → 결선', 1.65, 0.13, 0, 1.84, -0.208, INK, PAPER);
  // Deliberately separated L, N and protective earth runs, with visible saddles.
  for (const x of [-0.46, -0.23, 0.13, 0.4]) {
    cable(g, [[x, 1.08, -0.15], [x, 1.60, -0.15], [0.67, 1.60, -0.15]], '#b7c1bf', 0.024);
    for (const y of [1.18, 1.50]) {
      part(g, box(0.077, 0.024, 0.024), CHROME, x, y, -0.135);
      screw(g, [x - 0.029, y, -0.12], 0.006);
      screw(g, [x + 0.029, y, -0.12], 0.006);
    }
  }
  const colors = [RED, BLUE, GREEN];
  colors.forEach((color, i) => {
    cable(g, [[-0.25 + i * 0.018, 1.10, -0.08], [-0.25 + i * 0.018, 1.31, -0.08], [0.10 + i * 0.025, 1.31, -0.06], [0.10 + i * 0.025, 1.19, -0.06]], color, 0.006);
  });
  for (const x of [-0.23, 0.13]) {
    part(g, rbox(0.19, 0.19, 0.08, 0.01), '#aebbbd', x, 1.29, -0.08);
    part(g, box(0.155, 0.15, 0.005), INK, x, 1.29, -0.036);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.035, 0.052, 0.035), i === 2 ? GREEN : '#ded6bf', x - 0.05 + i * 0.05, 1.28, -0.012);
      screw(g, [x - 0.05 + i * 0.05, 1.28, 0.008], 0.009);
    }
  }
  const main = rocker(g, [-0.46, 1.12, -0.02]);
  const sw = rocker(g, E.WIRE.switch);
  outlet(g, [-0.63, 1.45, -0.07]);
  outlet(g, [0.68, 1.13, -0.06]);
  label(g, 'L   N   PE', 0.25, 0.05, 0.12, 1.11, -0.04, PAPER, INK);
  const lamp = group(g, 0.55, 1.55, -0.03);
  part(lamp, cyl(0.055, 0.065, 0.045, 16), PAPER, 0, 0, 0, { rx: Math.PI / 2 });
  part(lamp, ball(0.09), '#e6e0c8', 0, 0, 0.09);
  const lit = pilot(g, out, [0.55, 1.55, 0.06], '#fff2ad', 0.085);
  const lock = lockTag(g, [-0.46, 1.04, 0.04]);
  // The shelf carries ferrules, terminal blocks, tape and the actual loose tools.
  for (let i = 0; i < 3; i++) {
    part(g, rbox(0.17, 0.06, 0.12, 0.008), ['#7c9dac', '#c89c53', '#789780'][i], -0.65 + i * 0.22, 0.92, -0.08);
    for (let j = 0; j < 5; j++) part(g, cyl(0.009, 0.009, 0.035, 6), CHROME, -0.71 + i * 0.22 + j * 0.025, 0.96, -0.08, { rz: 0.5, outline: false });
  }
  for (let i = 0; i < 3; i++) part(g, ring(0.035, 0.012), colors[i], 0.68, 0.92 + i * 0.025, 0.18, { rx: Math.PI / 2 });
  toolbox(g, [0.55, 0.44, 0.04]);
  helmet(g, [-0.55, 0.28, 0.05]);
  const driver = tool(g, 'driver'), stripper = tool(g, 'cutter', BLUE);
  const looseWire = stretch(g, RED, 0.009);
  const trimmed = part(g, cyl(0.004, 0.004, 0.035, 6), '#b97843', -0.25, 1.03, 0.24, { rz: Math.PI / 2, outline: false });
  const work = use(g, 'elWire', 0, 0.54);
  const assist = use(g, 'elAssist', 0, 0.54);
  out.spots = { wirePanel: work, electrician_assistWiring: assist, '*': work };
  out.work = work.work;
  const mentor = person(g, 0.77, 0.50, Math.PI, false, true);
  mentor.root.visible = false;
  const message = status(g, 0.90, 0.09, [0, 1.69, -0.17]);
  const protect = wornProtection(g);
  out.away = (_away, t) => {
    const s = current([work, assist], t), a = s ? now(s, t) : null, k = a?.b.key;
    protect(s, a);
    const assisting = s === assist;
    const screwing = k === 'terminal' || k === 'copy';
    const handing = assisting && (k === 'select' || k === 'handover');
    place(driver, screwing || handing ? a!.r : E.WIRE.tool);
    driver.rotation.set(screwing ? -Math.PI / 2 : 0, 0, screwing ? 0.15 * Math.sin(t * 15) : Math.PI / 2);
    place(stripper, k === 'strip' ? a!.r : [-0.1, 0.93, 0.23]);
    stripper.rotation.z = k === 'strip' ? 0.1 * Math.sin(t * 18) : Math.PI / 2;
    // In the right hand while it's used (handTool.ts).
    if (s) {
      driver.name = 'driver';
      stripper.name = 'stripper';
      s.held = screwing || handing
        ? { tool: driver, lead: 'right', grips: { right: { at: v(0, 0.005, 0), axis: v(0, 1, 0), shape: 'power' } } }
        : k === 'strip'
          ? { tool: stripper, lead: 'right', grips: { right: { at: v(0, -0.03, 0), axis: v(0, 1, 0), shape: 'power' } } }
          : null;
    }
    const wireAt: V = k === 'feed' ? a!.r : [-0.25, 1.03, 0.24];
    looseWire(E.add(wireAt, -0.14, -0.03), E.add(wireAt, 0.03));
    trimmed.visible = k === 'strip' && a!.b.u > 0.55;
    const on = k === 'verify' || k === 'test' || k === 'return' || k === 'switch' && a!.b.u > 0.45;
    lit.visible = !!on;
    sw.rotation.x = on ? -0.22 : 0.22;
    main.rotation.x = a && !on ? 0.22 : -0.22;
    lock.visible = !!a && !on;
    mentor.root.visible = assisting;
    if (assisting) {
      mentor.head.rotation.x = k === 'listen' ? 0.05 * Math.sin(t * 4) : 0.14;
      mentor.left(k === 'handover' ? [0.44, 1.14, 0.3] : k === 'steady' ? [0.35, 1.29, 0.09] : null);
      mentor.right(k === 'listen' ? [0.40, 1.46, 0.05] : k === 'copy' ? [0.45, 1.28, 0.20] : null);
      if (k === 'handover' && a!.b.u > 0.62) place(driver, [0.45, 1.14, 0.30]);
    }
    message.set(!a ? '24V 교육 회로' : on ? '점등 확인 · 정상' : k === 'strip' ? '피복 제거 · 심선 보호' : k === 'feed' ? '전선관 입선' : screwing ? '단자 체결' : assisting ? '선배와 함께 확인' : '전원 차단 · 작업 중');
  };
};

/** A recessed, hinged distribution cabinet; the dead-front and busbars are visible inside. */
const switchboard: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(0.82, 1.67, 0.30, 0.018), '#b5c2c7', 0, 1.03, -0.14);
  part(g, box(0.73, 1.43, 0.015), INK, 0, 1.04, 0.018);
  for (const x of [-0.34, 0.34]) part(g, box(0.03, 1.37, 0.04), STEEL, x, 1.04, 0.04);
  for (const y of [0.66, 1.05, 1.42]) part(g, box(0.64, 0.025, 0.02), CHROME, 0, y, 0.045);
  const toggles: THREE.Object3D[] = [];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = -0.25 + i * 0.125, y = 1.35 - row * 0.32;
    part(g, rbox(0.105, 0.19, 0.08, 0.006), PAPER, x, y, 0.07);
    const toggle = part(g, box(0.066, 0.04, 0.025), row === 0 && i === 0 ? RED : INK, x, y + 0.015, 0.12);
    toggles.push(toggle);
    label(g, `${i === 0 && row === 0 ? 'MAIN' : `${10 + (i % 3) * 10}A`}`, 0.09, 0.026, x, y - 0.06, 0.113, PAPER, INK);
    cable(g, [[x, y - 0.1, 0.05], [x, y - 0.15, 0.05], [x + 0.02, y - 0.2, 0.04]], i % 2 ? BLUE : RED, 0.008);
  }
  for (const x of [-0.18, 0.15]) {
    part(g, box(0.055, 0.22, 0.018), '#b9874b', x, 0.69, 0.06);
    for (let i = 0; i < 4; i++) screw(g, [x, 0.61 + i * 0.05, 0.075], 0.008);
  }
  label(g, '분전반 · 회로별 차단', 0.72, 0.10, 0, 1.79, 0.02, INK, PAPER);
  label(g, 'L / N / PE', 0.30, 0.06, 0, 0.48, 0.06, PAPER, INK);
  // Door opens to the left, clear of the operator's feet and torso.
  const hinge = group(g, -0.39, 0, 0.045);
  part(hinge, rbox(0.78, 1.56, 0.035, 0.013), '#cbd3d5', 0.39, 1.04, 0);
  label(hinge, '분전반', 0.39, 0.11, 0.39, 1.54, 0.022, '#cbd3d5', INK);
  label(hinge, '전원 차단 후 점검', 0.57, 0.09, 0.39, 0.75, 0.022, YELLOW, INK);
  part(hinge, rbox(0.035, 0.17, 0.04, 0.009), INK, 0.50, 1.18, 0.035);
  for (let i = 0; i < 7; i++) part(hinge, box(0.40, 0.009, 0.005), '#8d9ca2', 0.39, 0.45 + i * 0.03, 0.022, { outline: false });
  const tag = lockTag(g, [-0.19, 1.29, 0.15]);
  // A fold-down shelf is low enough that the cabinet remains the dominant silhouette.
  part(g, rbox(0.86, 0.035, 0.27, 0.01), STEEL, 0, 0.84, 0.27);
  const multimeter = meter(g, [-0.24, 0.98, 0.25]);
  paper(g, [0.22, 0.865, 0.29], '점검표', 0.24, 0.18);
  const marks = ticks(g, [0.15, 0.879, 0.26]);
  const redProbe = tool(g, 'probe'), blackProbe = tool(g, 'probe', RUBBER), pen = tool(g, 'pen', BLUE);
  const leadL = stretch(g, RUBBER, 0.004), leadR = stretch(g, RED, 0.004);
  const camera = group(g);
  part(camera, rbox(0.095, 0.12, 0.045, 0.008), YELLOW, 0, 0.025, 0);
  part(camera, cyl(0.024, 0.024, 0.035, 12), INK, 0, 0.04, -0.03, { rx: Math.PI / 2 });
  const thermal = status(camera, 0.073, 0.045, [0, 0.04, 0.024], '#ffc386');
  thermal.set('24°C');
  const led = pilot(g, out, [0.31, 1.68, 0.04]);
  const s = use(g, 'elInspect', 0, 0.64);
  out.spots = { inspectPanel: s, '*': s }; out.work = s.work;
  out.screen = multimeter.read.mesh;
  const protect = wornProtection(g);
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, k = a?.b.key;
    protect(a ? s : null, a);
    const open = !a ? 0 : k === 'open' ? E.sm(a.b.u) : k === 'close' ? 1 - E.sm(a.b.u) : 1;
    hinge.rotation.y = E.panelDoorAngle(open);
    tag.visible = !!a && a.b.i >= 1 && k !== 'close';
    toggles.forEach((m, i) => m.rotation.x = i === 0 && tag.visible ? 0.45 : -0.4);
    const probing = k === 'probe' || k === 'prove';
    const lp: V = probing ? a!.l : [-0.31, 0.90, 0.34];
    const rp: V = probing ? a!.r : [-0.15, 0.90, 0.34];
    place(blackProbe, lp); place(redProbe, rp);
    blackProbe.rotation.x = redProbe.rotation.x = probing ? -Math.PI / 2 : 0.8;
    leadL([-0.27, 0.89, 0.28], lp); leadR([-0.20, 0.89, 0.28], rp);
    multimeter.read.set(k === 'prove' ? '24.0 V' : k === 'probe' ? '0.00 V' : '대기');
    place(camera, k === 'thermal' ? a!.r : [0.32, 0.98, 0.26]);
    place(pen, k === 'tick' ? a!.r : [0.36, 0.90, 0.31]);
    marks.forEach((m, i) => m.visible = k === 'close' || k === 'tick' && i < a!.b.u * marks.length);
    led.visible = !!a && (k !== 'probe' || Math.sin(t * 10) > 0);
  };
};

/** Cable drum on bearings, measuring fence, moving cable and a tied finished coil. */
const cableReel: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g, 0.94, 0.89, 0.70);
  const drum = group(g, 0, 0.53, -0.12);
  for (const x of [-0.27, 0.27]) {
    part(drum, cyl(0.28, 0.28, 0.035, 28), WOOD, x, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * Math.PI * 2;
      part(drum, cyl(0.008, 0.008, 0.04, 8), INK, x, Math.cos(ang) * 0.22, Math.sin(ang) * 0.22, { rz: Math.PI / 2, outline: false });
    }
  }
  part(drum, cyl(0.17, 0.17, 0.51, 24), RUBBER, 0, 0, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < 18; i++) part(drum, ring(0.18, 0.012), i % 5 === 0 ? '#404950' : RUBBER, -0.23 + i * 0.027, 0, 0, { ry: Math.PI / 2, outline: false });
  part(g, cyl(0.025, 0.025, 0.70, 12), CHROME, 0, 0.53, -0.12, { rz: Math.PI / 2 });
  for (const x of [-0.35, 0.35]) part(g, box(0.04, 0.30, 0.06), INK, x, 0.40, -0.12);
  cable(g, [[-0.20, 0.59, 0.05], [-0.20, 0.77, 0.29], [-0.23, 0.94, 0.17]], RUBBER, 0.011);
  part(g, box(0.80, 0.012, 0.13), '#e4d29f', 0, 0.913, 0.14);
  for (let i = 0; i <= 30; i++) part(g, box(0.003, 0.002, i % 5 === 0 ? 0.05 : 0.025), INK, -0.38 + i * 0.025, 0.921, 0.105, { outline: false });
  flatLabel(g, '0   10   20   30   40   50', 0.73, 0.04, [0, 0.924, 0.18], '#e4d29f');
  label(g, '전선 재단 · 측정 후 절단', 0.85, 0.09, 0, 1.20, -0.27, INK, PAPER);
  for (const x of [-0.43, 0.43]) part(g, box(0.025, 0.30, 0.025), STEEL, x, 1.06, -0.28);
  const cutter = tool(g, 'cutter');
  const wire = stretch(g, RUBBER, 0.009);
  const coil = group(g);
  part(g, rbox(0.49, 0.025, 0.24, 0.01), STEEL, 0.07, 0.75, 0.44);
  for (let i = 0; i < 5; i++) part(coil, ring(0.12 + i * 0.006, 0.008), RUBBER, 0, 0, i * 0.006, { outline: false });
  const tie = part(coil, box(0.027, 0.095, 0.045), YELLOW, 0.12, 0, 0.015);
  const endCopper = part(g, cyl(0.004, 0.004, 0.025, 8), '#bd8049', 0.28, 0.94, 0.17, { rz: Math.PI / 2, outline: false });
  const cutoffs = group(g, -0.31, 0.92, -0.09);
  for (let i = 0; i < 5; i++) part(cutoffs, cyl(0.007, 0.007, 0.045, 8), [RED, BLUE, GREEN][i % 3], 0.025 * i, 0.008, 0.02 * (i % 2), { rz: Math.PI / 2, ry: i, outline: false });
  const display = status(g, 0.35, 0.085, [0, 1.06, -0.25]);
  out.screen = display.mesh;
  const lamp = pilot(g, out, [0.36, 1.05, -0.24]);
  const s = use(g, 'elCut', 0, 0.62);
  out.spots = { cutCable: s, '*': s }; out.work = s.work;
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, k = a?.b.key;
    const length = k === 'pull' ? E.sm(a!.b.u) : a && a.b.i > 1 ? 1 : 0.15;
    wire(E.CABLE.start, E.lerp(E.CABLE.start, E.CABLE.end, length));
    drum.rotation.x = k === 'pull' ? -length * 2.6 : 0;
    place(cutter, k === 'cut' ? a!.r : E.CABLE.cutter);
    cutter.rotation.z = k === 'cut' ? 0.12 * Math.sin(t * 17) : Math.PI / 2;
    const coiling = k === 'coil' || k === 'tie';
    place(coil, coiling ? E.CABLE.coil : [0.08, 0.78, 0.44]);
    coil.rotation.set(coiling ? 0 : Math.PI / 2, 0, k === 'coil' ? a!.b.u * Math.PI * 4 : 0);
    coil.scale.setScalar(k === 'coil' ? 0.7 + 0.3 * a!.b.u : 1);
    tie.visible = !a || k === 'shelve' || k === 'tie' && a!.b.u > 0.5;
    endCopper.visible = !!a && a.b.i >= 3;
    display.set(a ? k === 'cut' ? '절단' : k === 'coil' || k === 'tie' ? '결속' : `${(length * 0.5).toFixed(2)} m` : '0.00 m');
    lamp.visible = k === 'measure' || k === 'cut';
  };
};

/** A compact CAD desk with enough knee space, paper drawing and separate calculation controls. */
const circuitDesk: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(0.96, 0.045, 0.68, 0.012), WOOD, 0, 0.752, -0.03);
  for (const x of [-0.43, 0.43]) part(g, box(0.045, 0.73, 0.56), INK, x, 0.365, -0.07);
  part(g, box(0.82, 0.15, 0.03), STEEL, 0, 0.60, -0.32);
  out.seat = deskChair(g, 0.30);
  part(g, rbox(0.21, 0.018, 0.14, 0.005), INK, 0, 0.79, -0.22);
  part(g, box(0.035, 0.16, 0.035), INK, 0, 0.87, -0.24);
  part(g, rbox(0.61, 0.37, 0.035, 0.015), INK, 0, 1.13, -0.25);
  const screen = picture(g, diagramTexture(0), 0.56, 0.32, 0, 1.13, -0.23);
  out.screen = screen;
  const frames = [0, 1, 2, 3, 4].map(i => diagramTexture(i));
  const reviewed = diagramTexture(4, true);
  const loadScreen = painted('elLoadTable', 640, 400, c => {
    c.fillStyle = '#eaf0eb'; c.fillRect(0, 0, 640, 400);
    c.fillStyle = INK; c.fillRect(0, 0, 640, 55);
    text(c, '회로별 부하 계산', 24, 28, 29, PAPER);
    const rows = ['조명       0.8 kW     3.6 A', '콘센트     2.2 kW    10.0 A', '냉방       3.3 kW    15.0 A', '합계       6.3 kW    28.6 A'];
    rows.forEach((r, i) => { c.fillStyle = i % 2 ? '#d7e2df' : '#f5f7f1'; c.fillRect(15, 75 + i * 61, 610, 53); text(c, r, 35, 103 + i * 61, 28, i === 3 ? RED : INK); });
    text(c, '설계 여유 · 차단기 정격 확인', 320, 363, 24, GREEN, 'center');
  });
  part(g, rbox(0.30, 0.02, 0.11, 0.005), '#b7c5c7', 0.13, 0.79, 0.12);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 10; col++) part(g, box(0.022, 0.005, 0.022), PAPER, 0.008 + col * 0.026, 0.803, 0.084 + row * 0.031, { outline: false });
  part(g, rbox(0.13, 0.025, 0.15, 0.006), INK, ...E.DESK.calc);
  const calc = status(g, 0.10, 0.035, [0.32, 0.836, 0.166]); calc.mesh.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i++) part(g, box(0.022, 0.006, 0.018), i === 11 ? YELLOW : PAPER, 0.283 + i % 3 * 0.034, 0.837, 0.20 + Math.floor(i / 3) * 0.020, { outline: false });
  const drawing = picture(g, diagramTexture(4), 0.30, 0.23, -0.20, 0.782, 0.15);
  drawing.rotation.x = -Math.PI / 2;
  const drawn = [0, 1, 2, 3].map(i => {
    const line = part(g, box(0.12, 0.001, 0.003), BLUE, -0.20, 0.786, 0.09 + i * 0.035, { outline: false });
    line.visible = false; return line;
  });
  const ruler = part(g, box(0.31, 0.004, 0.026), '#d3e0cf', -0.21, 0.791, 0.28, { ry: -0.12 });
  for (let i = 0; i < 15; i++) part(ruler, box(0.002, 0.002, i % 5 ? 0.009 : 0.017), INK, -0.14 + i * 0.02, 0.003, 0, { outline: false });
  // Rolled prints, reference binders, printer, fresh output and a stamp pad.
  for (let i = 0; i < 3; i++) {
    part(g, cyl(0.022, 0.022, 0.24, 12), PAPER, -0.39 + i * 0.045, 0.805, -0.16, { rx: Math.PI / 2 });
    part(g, cyl(0.014, 0.014, 0.242, 12), '#a8b2ad', -0.39 + i * 0.045, 0.805, -0.16, { rx: Math.PI / 2, outline: false });
  }
  part(g, rbox(0.19, 0.10, 0.22, 0.01), '#d9dfdb', 0.35, 0.84, -0.15);
  part(g, box(0.15, 0.012, 0.015), INK, 0.35, 0.85, -0.034);
  const output = part(g, box(0.12, 0.002, 0.15), PAPER, 0.35, 0.852, 0.015, { outline: false });
  const ready = pilot(g, out, [0.40, 0.88, -0.034]);
  const pencil = tool(g, 'pen', BLUE), redPen = tool(g, 'pen');
  const stamp = group(g);
  part(stamp, box(0.055, 0.018, 0.045), RED, 0, -0.06, 0);
  part(stamp, cyl(0.018, 0.024, 0.07, 10), '#624837', 0, -0.015, 0);
  const approved = flatLabel(g, '검토 완료', 0.10, 0.033, [-0.13, 0.788, 0.24], PAPER, RED);
  const design = use(g, 'elDesign', 0, 0.50, true);
  const review = use(g, 'elReview', 0, 0.50, true);
  const load = use(g, 'elLoad', 0, 0.50, true);
  out.spots = { drawCircuit: design, electrician_supervisePlan: review, electrician_loadCalc: load, '*': design };
  out.work = design.work;
  out.away = (_away, t) => {
    const s = current([design, review, load], t), a = s ? now(s, t) : null, k = a?.b.key;
    const writing = ['route', 'symbol', 'list', 'record'].includes(k ?? '');
    place(pencil, writing ? a!.r : [-0.39, 0.81, 0.22]);
    place(redPen, k === 'mark' ? a!.r : [-0.36, 0.81, 0.22]);
    pencil.rotation.z = writing ? 0.25 : Math.PI / 2;
    redPen.rotation.z = k === 'mark' ? 0.25 : Math.PI / 2;
    place(stamp, k === 'approve' ? a!.r : [0.39, 0.85, 0.04]);
    approved.visible = s === review && (k === 'file' || k === 'approve' && a!.b.u > 0.6);
    const texture = s === load ? loadScreen : s === review ? (a!.b.i >= 3 ? reviewed : frames[4]) : frames[a ? Math.min(4, a.b.i) : 4];
    const material = screen.material as THREE.MeshBasicMaterial;
    if (material.map !== texture) {
      material.map = texture;
      material.needsUpdate = true;
    }
    drawn.forEach((m, i) => m.visible = !!a && s === design && (a.b.i > 1 || k === 'route' && i < a.b.u * 4));
    calc.set(s === load ? k === 'calculate' ? `${Math.round(a!.b.u * 6300)}` : a!.b.i > 2 ? '28.6 A' : '6300 W' : '0');
    output.scale.z = k === 'print' ? 0.1 + 0.9 * E.sm(a!.b.u) : 0.15;
    ready.visible = k === 'print' ? Math.sin(t * 15) > 0 : !!a;
  };
};

/** Low ceiling module and a stable two-step platform; the operator's feet meet its top. */
const elCeilingRig: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, box(1.86, 0.025, 1.80), '#d0cdc1', 0, 0.0125, 0);
  for (const x of [-0.85, 0.85]) {
    part(g, box(0.06, 2.23, 0.06), STEEL, x, 1.115, -0.56);
    part(g, box(0.30, 0.025, 0.40), INK, x, 0.025, -0.56);
    rod(g, v(x, 1.65, -0.56), v(x, 0.03, -0.90), 0.018, STEEL);
  }
  // Open centre: no opaque ceiling slab hides the fixture from the game camera.
  for (const x of [-0.85, 0.85]) part(g, box(0.07, 0.11, 1.05), STEEL, x, 2.18, -0.12);
  part(g, box(1.76, 0.11, 0.07), STEEL, 0, 2.18, -0.61);
  part(g, box(1.76, 0.07, 0.07), STEEL, 0, 2.20, 0.37);
  part(g, ring(0.18, 0.055), PAPER, 0, 2.15, 0.18, { rx: Math.PI / 2 });
  for (const x of [-0.52, 0.52]) part(g, box(0.57, 0.035, 0.43), '#eee5d1', x, 2.175, 0.18);
  label(g, '천장 설치 실습 · 24V', 1.4, 0.13, 0, 2.29, 0.41, INK, PAPER);
  // The platform's wide treads, stiles, locking braces and rubber feet.
  for (const x of [-0.26, 0.26]) {
    rod(g, v(x, 0.02, 0.80), v(x, 0.60, 0.20), 0.022, CHROME);
    rod(g, v(x, 0.02, -0.04), v(x, 0.60, 0.20), 0.022, CHROME);
    rod(g, v(x, 0.27, 0.55), v(x, 0.27, 0.04), 0.012, BLUE);
    for (const z of [0.80, -0.04]) part(g, rbox(0.08, 0.04, 0.09, 0.008), RUBBER, x, 0.025, z);
  }
  part(g, box(0.51, 0.04, 0.20), CHROME, 0, 0.12, 0.66);
  part(g, box(0.52, 0.04, 0.37), CHROME, 0, 0.28, 0.42);
  for (let i = 0; i < 8; i++) part(g, box(0.46, 0.004, 0.008), RUBBER, 0, 0.302, 0.27 + i * 0.04, { outline: false });
  label(g, '잠금 확인', 0.27, 0.06, 0, 0.24, 0.615, YELLOW, INK);
  // A shallow side tray; the operator stands centrally on the platform.
  part(g, box(0.36, 0.025, 0.30), INK, 0.53, 1.24, 0.20);
  part(g, box(0.035, 1.21, 0.035), STEEL, 0.68, 0.63, 0.08);
  const light = group(g);
  part(light, cyl(0.12, 0.10, 0.055, 24), '#e7e5d9', 0, 0, 0);
  part(light, cyl(0.10, 0.10, 0.005, 24), '#d8dece', 0, -0.031, 0);
  const springL = part(light, box(0.055, 0.007, 0.02), CHROME, -0.13, 0.015, 0);
  const springR = part(light, box(0.055, 0.007, 0.02), CHROME, 0.13, 0.015, 0);
  const lit = pilot(g, out, [0, 2.11, 0.18], '#fff2b6', 0.095); lit.scale.y = 0.12;
  const rockerSwitch = rocker(g, [0.29, 1.32, 0.14]);
  const tag = lockTag(g, [0.37, 1.34, 0.18]);
  const hangingL = stretch(g, RED, 0.006), hangingN = stretch(g, BLUE, 0.006);
  paper(g, [0.53, 1.26, 0.20], '등기구 설치표', 0.26, 0.21);
  const pen = tool(g, 'pen', BLUE);
  const s = use(g, 'elLight', 0, 0.43, false, 0.30);
  out.spots = { elFitLight: s, '*': s }; out.work = s.work;
  const protect = wornProtection(g);
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, k = a?.b.key;
    protect(a ? s : null, a);
    const held = !!a && ['take', 'connect', 'springs', 'fit'].includes(k!);
    const fitted = !!a && a.b.i >= 5;
    const p: V = held ? E.lerp(a!.l, a!.r, 0.5) : fitted ? [0, 2.125, 0.18] : [0.30, 1.29, 0.24];
    place(light, p);
    springL.rotation.z = k === 'springs' || k === 'fit' ? 1.2 : 0;
    springR.rotation.z = -springL.rotation.z;
    hangingL([-0.04, 2.16, 0.18], E.add(p, -0.04, 0.04));
    hangingN([0.04, 2.16, 0.18], E.add(p, 0.04, 0.04));
    lit.visible = k === 'record' || k === 'test' && a!.b.u > 0.35;
    rockerSwitch.rotation.x = lit.visible ? -0.2 : 0.2;
    tag.visible = !!a && !lit.visible;
    place(pen, k === 'record' ? a!.r : [0.65, 1.28, 0.21]);
  };
};

/** A megohmmeter and clamp meter on an insulated test circuit with visible leads. */
const elTestBench: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g, 1.94, 0.95);
  part(g, box(1.80, 0.62, 0.04), '#d2d6cd', 0, 1.31, -0.27);
  label(g, '계측 시험 · 분리 회로', 1.65, 0.12, 0, 1.56, -0.244, INK, PAPER);
  part(g, rbox(0.41, 0.19, 0.27, 0.018), '#d3b338', -0.33, 1.045, 0.05);
  part(g, box(0.35, 0.13, 0.008), INK, -0.33, 1.075, 0.19);
  const read = status(g, 0.24, 0.06, [-0.34, 1.105, 0.196]); out.screen = read.mesh;
  const dial = part(g, cyl(0.038, 0.038, 0.022, 16), INK, ...E.TEST.knob, { rx: Math.PI / 2 });
  label(g, '절연저항계', 0.33, 0.05, -0.33, 0.99, 0.195, YELLOW, INK);
  label(g, '시험 회로', 0.32, 0.06, 0.15, 1.42, -0.242, PAPER, INK);
  const liveWire = [[0.02, 1.08, 0.05], [0.02, 1.32, -0.07], [0.28, 1.32, -0.07], [0.28, 1.08, 0.05]] as V[];
  cable(g, liveWire, RED, 0.012);
  cable(g, [[0.10, 1.08, 0.05], [0.10, 1.20, -0.13], [0.37, 1.20, -0.13], [0.37, 1.08, 0.05]], BLUE, 0.012);
  for (const p of [E.TEST.clipL, E.TEST.clipR]) {
    part(g, cyl(0.018, 0.018, 0.06, 12), '#b88a52', p[0], p[1] - 0.04, p[2]);
    part(g, cyl(0.025, 0.025, 0.018, 12), INK, p[0], p[1] - 0.08, p[2]);
  }
  const sw = rocker(g, [0.43, 1.27, -0.08]);
  const tag = lockTag(g, [0.49, 1.21, -0.04]);
  const clamp = meter(g, [-0.43, 1.08, 0.17], true);
  const clipR = tool(g, 'probe'), clipL = tool(g, 'probe', RUBBER);
  const leadR = stretch(g, RED, 0.005), leadL = stretch(g, RUBBER, 0.005);
  paper(g, [0.28, 0.972, 0.29], '절연 / 전류 기록', 0.36, 0.25);
  const marks = ticks(g, [0.15, 0.988, 0.26]);
  const pen = tool(g, 'pen', BLUE);
  for (const x of [-0.72, -0.60]) part(g, ring(0.04, 0.012), x < -0.65 ? RED : RUBBER, x, 0.98, 0.18, { rx: Math.PI / 2 });
  part(g, rbox(0.25, 0.08, 0.18, 0.008), INK, 0.65, 1.00, -0.11);
  label(g, '검교정', 0.16, 0.04, 0.65, 1.02, -0.012, PAPER, GREEN);
  const led = pilot(g, out, [-0.16, 1.10, 0.195]);
  const meg = use(g, 'elMegger', 0.05, 0.63), amp = use(g, 'elClamp', 0.05, 0.63);
  out.spots = { elInsulation: meg, elClamp: amp, '*': meg }; out.work = meg.work;
  const protect = wornProtection(g);
  out.away = (_away, t) => {
    const s = current([meg, amp], t), a = s ? now(s, t) : null, k = a?.b.key;
    protect(s, a);
    const isMeg = s === meg;
    tag.visible = isMeg;
    sw.rotation.x = isMeg ? 0.2 : -0.2;
    const clipped = isMeg && a!.b.i >= 2 && a!.b.i <= 4;
    const lp = k === 'clip' || k === 'discharge' ? a!.l : clipped ? E.TEST.clipL : [-0.65, 0.99, 0.28] as V;
    const rp = k === 'clip' || k === 'discharge' ? a!.r : clipped ? E.TEST.clipR : [-0.53, 0.99, 0.28] as V;
    place(clipL, lp); place(clipR, rp);
    clipL.rotation.x = clipR.rotation.x = Math.PI;
    leadL([-0.42, 1.00, 0.18], lp); leadR([-0.28, 1.00, 0.18], rp);
    read.set(!isMeg ? '대기' : k === 'test' ? `${Math.round(50 + a!.b.u * 150)} MΩ` : k === 'discharge' ? '방전 · 0 V' : a!.b.i > 3 ? '200 MΩ' : '500 V / 시험');
    dial.rotation.z = k === 'zero' ? a!.b.u * 1.4 : 0;
    const holding = s === amp && ['zero', 'open', 'clamp', 'read'].includes(k!);
    place(clamp.root, holding ? a!.r : [-0.65, 1.14, -0.05]);
    clamp.jaw.scale.x = k === 'open' ? 1.3 : 1;
    clamp.read.set(s === amp && (k === 'clamp' || k === 'read') ? '3.62 A' : '0.00 A');
    place(pen, k === 'record' ? a!.r : [0.80, 1.0, 0.22]);
    marks.forEach((m, i) => m.visible = k === 'return' || k === 'record' && i < a!.b.u * 4);
    led.visible = k === 'test' && Math.sin(t * 10) > 0;
  };
};

/** Pegboard silhouettes make it obvious when the helmet, gloves or padlock are missing. */
const elSafetyWall: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g, 1.93, 0.91);
  part(g, rbox(1.85, 1.05, 0.045, 0.01), '#8b9c9d', 0, 1.43, -0.25);
  for (let row = 0; row < 10; row++) for (let col = 0; col < 20; col++) part(g, ball(0.006), INK, -0.82 + col * 0.086, 1.0 + row * 0.088, -0.224, { outline: false });
  label(g, '안전모 · 절연장갑 · 잠금표', 1.70, 0.13, 0, 1.89, -0.22, YELLOW, INK);
  const hardhat = helmet(g, [-0.48, 1.46, -0.03]);
  const gloveL = glove(g, [-0.05, 1.18, -0.07]);
  const gloveR = glove(g, [0.05, 1.18, -0.07]);
  const tag = lockTag(g, [0.32, 1.23, -0.04]);
  for (const [x, name] of [[-0.48, '안전모'], [0, '절연장갑'], [0.32, '개인 잠금']] as Array<[number, string]>) {
    rod(g, v(x, 1.48, -0.22), v(x, 1.48, -0.07), 0.008, CHROME);
    label(g, name, 0.29, 0.055, x, 1.65, -0.22, PAPER, INK);
  }
  // Insulated screwdrivers, pliers, tape measure, face shield and safety vest.
  for (let i = 0; i < 4; i++) {
    const driver = tool(g, 'driver', i % 2 ? BLUE : RED);
    driver.position.set(0.54 + i * 0.075, 1.36, -0.15);
    driver.rotation.x = Math.PI;
  }
  const pliers = tool(g, 'cutter', BLUE); pliers.position.set(-0.76, 1.25, -0.14);
  part(g, rbox(0.09, 0.10, 0.05, 0.018), YELLOW, -0.74, 1.52, -0.14);
  part(g, cyl(0.024, 0.024, 0.006, 14), INK, -0.74, 1.52, -0.11, { rx: Math.PI / 2 });
  const vest = group(g, 0.59, 0.54, -0.06);
  part(vest, rbox(0.30, 0.36, 0.045, 0.025), '#eaae32', 0, 0, 0);
  for (const x of [-0.09, 0.09]) part(vest, box(0.025, 0.32, 0.048), PAPER, x, 0, 0, { outline: false });
  part(vest, box(0.30, 0.035, 0.048), PAPER, 0, -0.06, 0, { outline: false });
  part(g, rbox(0.31, 0.11, 0.22, 0.015), BLUE, -0.58, 0.34, 0.05);
  label(g, '보안경', 0.18, 0.05, -0.58, 0.36, 0.165, BLUE, PAPER);
  paper(g, [0, 0.93, 0.21], '사용 전 점검', 0.36, 0.23);
  const marks = ticks(g, [-0.12, 0.946, 0.18]);
  const pen = tool(g, 'pen', BLUE);
  const check = status(g, 0.8, 0.09, [0, 1.04, -0.21]);
  const ready = pilot(g, out, [0.79, 1.77, -0.21]);
  const s = use(g, 'elPpe', 0, 0.57);
  out.spots = { elPreparePpe: s, '*': s }; out.work = s.work;
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, k = a?.b.key;
    const hatInHand = k === 'helmet' || k === 'strap';
    place(hardhat, hatInHand ? [-0.16, 1.26, 0.25] : [-0.48, 1.46, -0.03]);
    hardhat.rotation.z = k === 'helmet' ? 0.25 * Math.sin(t * 2) : 0;
    hardhat.rotation.x = k === 'strap' ? Math.PI : 0;
    const checking = k === 'glove' || k === 'inflate' || k === 'return';
    place(gloveR, checking ? a!.r : [0.05, 1.18, -0.07]);
    gloveR.scale.z = k === 'inflate' ? 1.3 + 0.3 * Math.sin(t * 4) : 1;
    place(gloveL, k === 'glove' ? a!.l : [-0.05, 1.18, -0.07]);
    place(tag, k === 'lock' ? a!.r : [0.32, 1.23, -0.04]);
    place(pen, k === 'tick' ? a!.r : [0.26, 0.95, 0.25]);
    marks.forEach((m, i) => m.visible = k === 'return' || k === 'tick' && i < a!.b.u * 4);
    ready.visible = k === 'return';
    check.set(!a ? '공구는 제자리에' : k === 'helmet' ? '외관 균열 확인' : k === 'strap' ? '턱끈·내피 확인' : k === 'glove' || k === 'inflate' ? '장갑 손상 확인' : k === 'lock' ? '개인 잠금표 확인' : '점검 기록');
  };
};

/** Transparent meter cover, terminal shield, pulsing indicator and advancing kWh reading. */
const elMeterPanel: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g, 0.93, 0.87);
  part(g, box(0.84, 1.0, 0.045), '#d3d7d3', 0, 1.38, -0.25);
  label(g, '계량기 · 검침 실습', 0.78, 0.10, 0, 1.80, -0.222, INK, PAPER);
  part(g, rbox(0.36, 0.46, 0.12, 0.025), PAPER, 0, 1.38, -0.10);
  part(g, box(0.30, 0.13, 0.014), INK, 0, 1.43, -0.027);
  const read = status(g, 0.26, 0.075, [0, 1.43, -0.018]); out.screen = read.mesh;
  label(g, 'kWh', 0.07, 0.025, 0.10, 1.37, -0.024, PAPER, INK);
  label(g, '교육용 / 24V', 0.27, 0.045, 0, 1.56, -0.024, PAPER, INK);
  for (let i = 0; i < 4; i++) {
    const x = -0.12 + i * 0.08;
    part(g, box(0.058, 0.06, 0.035), '#b8945b', x, 1.14, 0.07);
    screw(g, [x, 1.14, 0.092], 0.013);
    cable(g, [[x, 1.1, 0.06], [x, 0.99, 0.06], [x + 0.06, 0.93, 0.06]], i % 2 ? BLUE : RED, 0.009);
  }
  const guard = group(g, 0, 1.15, 0.13);
  part(guard, rbox(0.34, 0.13, 0.022, 0.008), '#bccbc9', 0, 0, 0);
  label(guard, '단자 보호 덮개', 0.27, 0.04, 0, 0, 0.013, '#bccbc9', INK);
  const seal = group(g, 0.13, 1.12, 0.17);
  part(seal, ball(0.013), RED, 0, 0, 0, { outline: false });
  part(seal, ring(0.025, 0.002), CHROME, 0, 0.027, 0);
  const main = rocker(g, [-0.27, 1.0, 0.09]);
  const tag = lockTag(g, [-0.28, 0.95, 0.14]);
  const pulse = pilot(g, out, [0.11, 1.29, -0.02], '#ffbd5b', 0.012);
  paper(g, [0.08, 0.90, 0.26], '검침 기록', 0.32, 0.20);
  const marks = ticks(g, [-0.03, 0.916, 0.23]);
  const driver = tool(g, 'driver'), pen = tool(g, 'pen', BLUE);
  const s = use(g, 'elMeter', 0, 0.59);
  out.spots = { elMeterCheck: s, '*': s }; out.work = s.work;
  const protect = wornProtection(g);
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, k = a?.b.key;
    protect(a ? s : null, a);
    const exposed = !!a && a.b.i > 0 && a.b.i < 3;
    guard.position.y = exposed ? 0.94 : 1.15;
    guard.rotation.x = exposed ? -Math.PI / 2 : 0;
    place(seal, k === 'seal' || k === 'sealBack' ? a!.r : exposed ? [0.30, 0.93, 0.25] : [0.13, 1.12, 0.17]);
    place(driver, k === 'terminal' ? a!.r : [-0.30, 0.93, 0.27]);
    driver.rotation.x = k === 'terminal' ? -Math.PI / 2 : 0;
    driver.rotation.z = k === 'terminal' ? 0.12 * Math.sin(t * 14) : Math.PI / 2;
    place(pen, k === 'record' ? a!.r : [0.30, 0.94, 0.27]);
    tag.visible = exposed;
    main.rotation.x = exposed ? 0.2 : -0.2;
    pulse.visible = !!a && !exposed && Math.sin(t * 8) > 0.5;
    read.set(exposed ? '전원 차단' : `${(1248.2 + (a ? E.frac(t / 12) * 0.08 : 0)).toFixed(2)}`);
    marks.forEach((m, i) => m.visible = k === 'sealBack' || k === 'record' && i < a!.b.u * 4);
  };
};

/** Consultation across a real table: the client listens, points, signs, and receives the quote. */
const elQuoteDesk: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(1.45, 0.055, 0.83, 0.025), WOOD, 0, 0.775, -0.02);
  for (const x of [-0.65, 0.65]) for (const z of [-0.33, 0.29]) part(g, box(0.05, 0.75, 0.05), INK, x, 0.375, z);
  out.seat = deskChair(g, 0.34);
  const chair = group(g, 0.30, 0, -0.72);
  for (const x of [-0.16, 0.16]) for (const z of [-0.15, 0.15]) part(chair, cyl(0.018, 0.018, 0.43, 8), INK, x, 0.215, z);
  part(chair, rbox(0.43, 0.07, 0.42, 0.035), '#698b8e', 0, 0.445, 0);
  part(chair, rbox(0.43, 0.37, 0.055, 0.035), '#698b8e', 0, 0.68, -0.19);
  const client = person(g, 0.30, -0.72, 0, true);
  client.root.visible = false;
  // The board lives to the side, leaving an unobstructed line between the two people.
  const board = group(g, -0.76, 0, -0.50, 0.18);
  part(board, box(0.07, 1.55, 0.07), INK, 0, 0.775, 0);
  part(board, rbox(0.55, 0.55, 0.035, 0.012), BLUE, 0, 1.36, 0);
  picture(board, diagramTexture(4), 0.50, 0.46, 0, 1.36, 0.02);
  label(g, '해온전기 · 공사 상담', 0.95, 0.095, 0, 0.67, 0.405, INK, PAPER);
  const sheet = group(g, -0.05, 0.816, 0.08);
  part(sheet, box(0.39, 0.003, 0.28), PAPER, 0, 0, 0);
  flatLabel(sheet, '공사 견적서', 0.30, 0.04, [0, 0.003, -0.09]);
  for (let i = 0; i < 4; i++) flatLabel(sheet, ['배선 · 12 m', '콘센트 · 4개', '조명 · 2개', '자재 + 시공'][i], 0.28, 0.026, [0, 0.004, -0.04 + i * 0.044]);
  const plan = picture(g, diagramTexture(4), 0.40, 0.26, -0.08, 0.810, -0.02); plan.rotation.x = -Math.PI / 2;
  const calculator = group(g, 0.30, 0.815, 0.21);
  part(calculator, rbox(0.16, 0.025, 0.18, 0.007), INK, 0, 0, 0);
  const total = status(calculator, 0.13, 0.04, [0, 0.014, -0.055]); total.mesh.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i++) part(calculator, box(0.03, 0.005, 0.02), i === 11 ? YELLOW : PAPER, -0.048 + i % 3 * 0.046, 0.015, -0.005 + Math.floor(i / 3) * 0.025, { outline: false });
  const sample = outlet(g, [0.50, 0.85, 0.02]); sample.rotation.x = -Math.PI / 2;
  const pen = tool(g, 'pen', BLUE), clientPen = tool(g, 'pen', INK);
  const signed = flatLabel(sheet, '확인 ✓', 0.10, 0.027, [0.12, 0.005, 0.10], PAPER, BLUE);
  part(g, cyl(0.04, 0.035, 0.08, 14), PAPER, 0.56, 0.85, -0.27);
  part(g, cyl(0.033, 0.033, 0.003, 14), '#765139', 0.56, 0.892, -0.27, { outline: false });
  const progress = status(g, 0.66, 0.08, [0.09, 1.09, -0.34]);
  part(g, rbox(0.72, 0.14, 0.04, 0.008), INK, 0.09, 1.09, -0.366);
  const quote = use(g, 'elQuote', -0.05, 0.54, true), explain = use(g, 'elExplain', -0.05, 0.54, true);
  out.spots = { quoteJob: quote, explainWork: explain, '*': quote }; out.work = quote.work;
  pilot(g, out, [0.64, 0.72, 0.406]);
  out.away = (_away, t) => {
    const s = current([quote, explain], t), a = s ? now(s, t) : null, k = a?.b.key;
    client.root.visible = !!a;
    client.head.rotation.x = a ? 0.08 + 0.05 * Math.sin(t * (k === 'agree' ? 5 : 2)) : 0;
    const replying = k === 'listen' || k === 'question';
    client.left(replying ? [0.12, 1.02, -0.39] : null);
    client.right(k === 'agree' ? [0.08, 0.85, -0.13] : k === 'confirm' ? [0.05, 0.85, -0.08] : replying ? [0.45, 1.03, -0.39] : null);
    sheet.visible = s !== explain;
    plan.visible = s === explain;
    sheet.position.set(-0.05, 0.816, 0.08 - (k === 'offer' ? 0.21 * E.sm(a!.b.u) : k === 'agree' ? 0.21 : 0));
    signed.visible = k === 'agree' && a!.b.u > 0.4;
    place(pen, k === 'write' ? a!.r : [-0.40, 0.84, 0.25]);
    place(clientPen, k === 'agree' ? [0.08, 0.86, -0.13] : [0.46, 0.84, -0.22]);
    place(sample, k === 'sample' ? a!.r : [0.50, 0.85, 0.02]);
    sample.rotation.x = k === 'sample' ? 0 : -Math.PI / 2;
    total.set(k === 'calculate' ? String(Math.round(a!.b.u * 385000)) : a && s === quote && a.b.i > 3 ? '385,000' : '0');
    progress.set(!a ? '상담 준비' : k === 'question' ? '차단은 얼마나 걸리나요?' : k === 'answer' ? '작업 전 시간을 안내해요' : k === 'agree' ? '견적 확인 · 서명' : s === quote ? '자재 · 수량 · 시공비' : '회로와 작업 범위 안내');
  };
};

/** Two-metre service van: ladder rack, cab, cargo bay, sliding door and departure hook. */
const serviceVan: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const van = group(g);
  part(van, rbox(1.89, 0.15, 0.83, 0.03), INK, 0, 0.31, 0);
  part(van, rbox(1.90, 0.43, 0.84, 0.06), YELLOW, 0, 0.55, 0);
  // Open front cargo wall: a genuine recess rather than a black decal on a solid box.
  part(van, rbox(1.26, 0.55, 0.055, 0.025), YELLOW, -0.29, 1.02, -0.395);
  part(van, box(0.045, 0.55, 0.80), YELLOW, -0.91, 1.02, 0);
  part(van, box(0.045, 0.55, 0.80), YELLOW, 0.34, 1.02, 0);
  part(van, rbox(1.33, 0.07, 0.87, 0.03), YELLOW, -0.29, 1.32, 0);
  part(van, box(1.19, 0.03, 0.72), '#6b777b', -0.29, 0.79, 0);
  for (let i = 0; i < 4; i++) part(van, box(1.16, 0.003, 0.006), INK, -0.29, 0.808, -0.24 + i * 0.14, { outline: false });
  // Cab to the right, split windscreen, mirror, bumper, headlamps, grille and plate.
  part(van, rbox(0.54, 0.18, 0.79, 0.035), YELLOW, 0.64, 0.84, 0);
  part(van, rbox(0.58, 0.045, 0.83, 0.02), YELLOW, 0.64, 1.27, 0);
  for (const x of [0.39, 0.88]) for (const z of [-0.38, 0.38])
    part(van, box(0.035, 0.34, 0.035), YELLOW, x, 1.08, z);
  // Open side glazing makes the driver and steering wheel visible from the game camera.
  const glass = new THREE.MeshBasicMaterial({ color: '#9dd3e4', transparent: true, opacity: 0.19, depthWrite: false });
  const window = part(van, box(0.43, 0.29, 0.008), '#9dd3e4', 0.64, 1.08, 0.402, { material: glass, outline: false });
  window.userData.ownMaterial = true;
  part(van, rbox(0.025, 0.29, 0.65, 0.02), '#5f8899', 0.91, 1.08, 0);
  part(van, box(0.016, 0.27, 0.006), '#c9e4e6', 0.63, 1.08, 0.413, { outline: false });
  rod(van, v(0.86, 1.02, 0.41), v(0.92, 1.02, 0.51), 0.012, INK);
  part(van, rbox(0.09, 0.11, 0.045, 0.015), INK, 0.92, 1.04, 0.51);
  part(van, rbox(0.065, 0.12, 0.83, 0.015), INK, 0.97, 0.43, 0);
  for (const z of [-0.27, 0.27]) part(van, box(0.018, 0.10, 0.16), '#fff3c6', 0.986, 0.67, z);
  const headlights = group(van);
  for (const z of [-0.27, 0.27]) {
    const material = new THREE.MeshBasicMaterial({ color: '#fff4bf' });
    const lamp = part(headlights, box(0.021, 0.075, 0.13), '#fff4bf', 0.989, 0.67, z, { material, outline: false });
    lamp.userData.ownMaterial = true;
  }
  const reverseLights = group(van);
  for (const z of [-0.30, 0.30]) {
    part(van, box(0.025, 0.12, 0.065), RED, -0.956, 0.62, z);
    part(reverseLights, box(0.028, 0.035, 0.065), PAPER, -0.958, 0.59, z);
  }
  part(van, rbox(0.27, 0.055, 0.30, 0.02), INK, 0.57, 0.82, 0.19);
  part(van, rbox(0.045, 0.26, 0.30, 0.02), INK, 0.43, 0.94, 0.19);
  part(van, box(0.08, 0.085, 0.70), INK, 0.83, 0.94, 0);
  const steering = part(van, ring(0.075, 0.009), INK, 0.77, 1.0, 0.19, { ry: Math.PI / 2, rz: 0.15 });
  const driver = group(van, 0.55, 0.84, 0.19, Math.PI / 2);
  part(driver, rbox(0.20, 0.23, 0.15, 0.035), BLUE, 0, 0.12, 0);
  part(driver, ball(0.084), '#e9bd94', 0, 0.29, 0);
  part(driver, ball(0.087), '#38302b', 0, 0.315, -0.024);
  part(driver, cyl(0.095, 0.095, 0.025, 14), BLUE, 0, 0.36, 0);
  for (const side of [-1, 1]) {
    rod(driver, v(side * 0.105, 0.22, 0), v(side * 0.075, 0.13, 0.22), 0.023, BLUE);
    part(driver, ball(0.025), '#e9bd94', side * 0.075, 0.13, 0.22, { outline: false });
  }
  driver.visible = headlights.visible = reverseLights.visible = false;
  for (let i = 0; i < 4; i++) part(van, box(0.02, 0.015, 0.27), INK, 0.988, 0.57 + i * 0.028, 0, { outline: false });
  label(van, '해온 2048', 0.25, 0.065, 0.10, 0.44, 0.429, PAPER, INK);
  const wheels: THREE.Object3D[] = [];
  for (const x of [-0.61, 0.63]) for (const z of [-0.43, 0.43]) {
    const wheel = group(van, x, 0.25, z);
    part(wheel, cyl(0.21, 0.21, 0.095, 24), RUBBER, 0, 0, 0, { rx: Math.PI / 2 });
    part(wheel, cyl(0.12, 0.12, 0.099, 18), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
    part(wheel, cyl(0.05, 0.05, 0.105, 12), INK, 0, 0, 0, { rx: Math.PI / 2 });
    wheels.push(wheel);
  }
  const door = group(van, -0.32, 0, 0.423);
  part(door, rbox(1.13, 0.53, 0.032, 0.018), YELLOW, 0, 1.02, 0);
  part(door, box(1.08, 0.11, 0.034), BLUE, 0, 0.94, 0);
  label(door, '해온전기', 0.56, 0.12, 0, 1.12, 0.02, YELLOW, INK);
  label(door, '배선 · 조명 · 긴급 복구', 0.94, 0.07, 0, 0.94, 0.02, BLUE, PAPER);
  part(door, rbox(0.10, 0.025, 0.025, 0.007), INK, 0.41, 1.03, 0.03);
  // Roof rack and a detailed extension ladder, secured by orange straps.
  for (const x of [-0.72, 0.24]) {
    for (const z of [-0.32, 0.32]) part(van, box(0.04, 0.09, 0.04), INK, x, 1.39, z);
    part(van, box(0.05, 0.04, 0.77), STEEL, x, 1.45, 0);
  }
  for (const z of [-0.19, 0.19]) part(van, box(1.68, 0.05, 0.035), CHROME, -0.12, 1.51, z);
  for (let i = 0; i < 10; i++) part(van, box(0.028, 0.035, 0.40), CHROME, -0.84 + i * 0.16, 1.51, 0);
  for (const x of [-0.61, 0.18]) part(van, box(0.035, 0.015, 0.48), RED, x, 1.545, 0);
  const beacon = pilot(van, out, [0.60, 1.29, 0], '#ffd15c', 0.045);
  // The use-only beacon belongs to the moving van, including when the vehicle is away.
  const cargoBox = toolbox(van, [0.03, 0.97, -0.15]);
  const carried = toolbox(g, [-0.30, 0.51, 0.59]);
  const packedPanel = group(van, -0.30, 1.03, 0.29);
  part(packedPanel, box(0.34, 0.29, 0.17), '#c4cdcf', 0, -0.08, 0);
  label(packedPanel, '분전반', 0.24, 0.055, 0, -0.06, 0.089, PAPER, INK);
  const panelCarry = group(g);
  part(panelCarry, box(0.34, 0.29, 0.17), '#c4cdcf', 0, -0.08, 0);
  label(panelCarry, '분전반', 0.24, 0.055, 0, -0.06, 0.089, PAPER, INK);
  // Loading stool supports the waiting load clear of the operator's feet.
  part(g, rbox(0.43, 0.035, 0.28, 0.012), STEEL, -0.30, 0.3275, 0.59);
  for (const x of [-0.47, -0.13]) for (const z of [0.49, 0.69])
    part(g, box(0.025, 0.31, 0.025), INK, x, 0.155, z);
  const radio = group(g);
  part(radio, rbox(0.05, 0.09, 0.032, 0.008), INK, 0, 0, 0);
  part(radio, cyl(0.004, 0.004, 0.06, 8), INK, -0.016, 0.07, 0, { outline: false });
  const order = paper(g, [-0.3, 1.04, 0.51], '출동 작업지시', 0.28, 0.22);
  const torch = group(g);
  part(torch, cyl(0.021, 0.027, 0.14, 12), BLUE, 0, 0.01, 0);
  part(torch, cyl(0.035, 0.03, 0.04, 14), YELLOW, 0, 0.10, 0);
  const site = use(g, 'elSite', -0.30, 0.89);
  const emergency = use(g, 'elEmergency', -0.30, 0.89);
  const install = use(g, 'elPanelLoad', -0.30, 0.89);
  out.spots = { siteInstall: site, blackoutCall: emergency, electrician_installPanel: install, '*': site }; out.work = site.work;
  let state: 'parked' | 'ready' | 'leaving' | 'gone' | 'back' = 'parked';
  let since = 0, travel = 0, returnFrom = 1;
  out.away = (isOut, t) => {
    if (isOut && (state === 'parked' || state === 'back')) { state = 'ready'; since = t; }
    else if (!isOut && (state === 'ready' || state === 'leaving' || state === 'gone')) { returnFrom = travel; state = 'back'; since = t; }
    if (state === 'ready' && t - since > 1.4) { state = 'leaving'; since = t; }
    if (state === 'leaving') {
      travel = Math.min(1, (t - since) / 5) ** 2;
      if (travel === 1) state = 'gone';
    } else if (state === 'back') {
      travel = returnFrom * (1 - Math.min(1, (t - since) / 6)) ** 2;
      if (travel === 0) state = 'parked';
    } else if (state === 'parked' || state === 'ready') travel = 0;
    van.position.x = travel * 8;
    van.visible = state !== 'gone';
    wheels.forEach(w => w.rotation.z = -travel * 8 / 0.21);
    const moving = state === 'leaving' || state === 'back';
    driver.visible = moving || state === 'ready';
    driver.rotation.y = Math.PI / 2 + (state === 'back' ? -0.20 : state === 'ready' ? 0.14 * Math.sin(t * 3) : 0);
    steering.rotation.x = moving ? 0.12 * Math.sin(t * 2) : 0;
    headlights.visible = driver.visible;
    reverseLights.visible = state === 'back';
    const s = current([site, emergency, install], t), a = s && !isOut ? now(s, t) : null, k = a?.b.key;
    door.position.x = -0.32 + (a ? 0.84 : 0);
    const loading = !!a && (k === 'panel' || k === 'lift' || k === 'load');
    const panelJob = s === install;
    const stored = !a || ['strap', 'check', 'ready'].includes(k!);
    const held = loading ? E.lerp(a!.l, a!.r, 0.5) : [-0.30, panelJob ? 0.57 : 0.61, 0.59] as V;
    place(carried, state === 'parked' && !panelJob && !stored ? E.add(held, 0, -0.10) : null);
    place(panelCarry, state === 'parked' && panelJob && !stored ? held : null);
    cargoBox.position.set(panelJob ? 0.03 : -0.30, 0.97, panelJob ? -0.15 : 0.29);
    packedPanel.position.set(panelJob ? -0.30 : -0.68, 1.03, panelJob ? 0.29 : -0.12);
    cargoBox.visible = panelJob || stored;
    packedPanel.visible = !panelJob || stored;
    order.visible = k === 'order' || k === 'map';
    place(radio, k === 'radio' ? a!.r : null);
    place(torch, k === 'lamp' ? a!.r : null);
    beacon.visible = (isOut || s === emergency) && Math.sin(t * 12) > 0;
    // out.inUse is normally hidden away; the warning lamp still accompanies the moving van.
    if (isOut && out.inUse) out.inUse.visible = true;
  };
};

export const BUILDERS: Record<string, Builder> = {
  wiringBoard, switchboard, cableReel, circuitDesk, serviceVan,
  elCeilingRig, elTestBench, elSafetyWall, elMeterPanel, elQuoteDesk,
};
