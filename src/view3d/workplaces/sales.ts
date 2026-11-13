import * as THREE from 'three';
import { marker, spot, type Builder, type Built } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { glowing, label, painted, picture, ring, text } from './doctor';
import * as S from './salesMotion';

/** Fictional company and products appear on the objects only. The workplace remains 영업 본부.
 * All geometry is in furniture metres; motion targets use this exact coordinate frame. */
const NAVY = '#233f51', TEAL = '#327e80', MINT = '#92cbbb', GOLD = '#dca754';
const WHITE = '#f8f4e9', PAPER = '#fffdf5', WOOD = '#ad815b', EDGE = '#705138';
const STEEL = '#a7b6bf', DARK = '#273039', INK = '#38505a', RED = '#bc514b';
const SKIN = '#edc19e', BLUE = '#6a9bbb', UP = new THREE.Vector3(0, 1, 0);
function group(p: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  p.add(root);
  return root;
}
function place(o: THREE.Object3D, p: S.V) { o.position.set(...p); }
function flat(g: THREE.Object3D, s: string, w: number, d: number, p: S.V, bg = PAPER, fg = INK) {
  const m = label(g, s, w, d, ...p, bg, fg);
  m.rotation.x = -Math.PI / 2;
  return m;
}
function rod(g: THREE.Object3D, color: string, radius = 0.025) {
  const mesh = part(g, cyl(radius, radius, 1, 10), color, 0, 0, 0, { outline: false });
  return (a: S.V, b: S.V) => {
    const av = S.v(a), delta = S.v(b).sub(av);
    mesh.position.copy(av).addScaledVector(delta, 0.5);
    mesh.scale.y = Math.max(0.001, delta.length());
    mesh.quaternion.setFromUnitVectors(UP, delta.normalize());
  };
}
function cable(g: THREE.Object3D, points: S.V[], color = DARK, r = 0.005) {
  const curve = new THREE.CatmullRomCurve3(points.map(S.v));
  const geom = new THREE.TubeGeometry(curve, 30, r, 6, false);
  const mesh = part(g, geom, color, 0, 0, 0, { outline: false });
  mesh.userData.ownGeometry = true;
  return mesh;
}
function screws(g: THREE.Object3D, w: number, h: number, y: number, z: number) {
  for (const x of [-w / 2, w / 2]) for (const dy of [-h / 2, h / 2]) {
    part(g, cyl(0.007, 0.007, 0.004, 8), STEEL, x, y + dy, z, { rx: Math.PI / 2, outline: false });
  }
}
function caster(g: THREE.Object3D, x: number, z: number) {
  part(g, box(0.026, 0.045, 0.035), STEEL, x, 0.055, z);
  part(g, cyl(0.03, 0.03, 0.035, 12), DARK, x, 0.026, z, { rz: Math.PI / 2 });
}
function chair(g: THREE.Object3D, p: S.V, yaw = Math.PI, color = NAVY, wheeled = false) {
  const root = group(g, ...p, yaw);
  part(root, rbox(0.40, 0.065, 0.38, 0.035), color, 0, 0.425, 0);
  part(root, rbox(0.38, 0.37, 0.065, 0.035), color, 0, 0.69, -0.17, { rx: -0.10 });
  part(root, box(0.30, 0.025, 0.025), STEEL, 0, 0.52, -0.19);
  for (let i = 0; i < 6; i++) {
    part(root, box(0.28, 0.005, 0.003), '#567078', 0, 0.57 + i * 0.044, -0.129, { outline: false });
  }
  for (const x of [-0.22, 0.22]) {
    part(root, box(0.025, 0.20, 0.025), STEEL, x, 0.48, 0.04);
    part(root, rbox(0.055, 0.03, 0.24, 0.012), DARK, x, 0.59, 0.04);
  }
  if (wheeled) {
    part(root, cyl(0.035, 0.035, 0.30, 12), STEEL, 0, 0.235, 0);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      part(root, box(0.035, 0.035, 0.27), DARK, Math.sin(a) * 0.115, 0.085, Math.cos(a) * 0.115, { ry: a });
      caster(root, Math.sin(a) * 0.24, Math.cos(a) * 0.24);
    }
  } else {
    for (const x of [-0.15, 0.15]) for (const z of [-0.13, 0.13]) {
      part(root, cyl(0.016, 0.018, 0.39, 10), STEEL, x, 0.21, z);
      part(root, cyl(0.022, 0.022, 0.018, 10), DARK, x, 0.025, z);
    }
  }
  return root;
}
/** Articulated adults: elbows remain outside the torso, hands accept table-local targets.
 * These are demonstration customers/colleagues, separate from the game's real waiting clients. */
function person(g: THREE.Object3D, p: S.V, yaw = 0, shirt = TEAL, seated = true) {
  const root = group(g, ...p, yaw);
  const hip = seated ? 0.50 : 0.83;
  part(root, rbox(0.29, 0.16, 0.19, 0.04), NAVY, 0, hip, 0);
  part(root, rbox(0.34, 0.40, 0.20, 0.055), shirt, 0, hip + 0.25, 0);
  part(root, box(0.10, 0.24, 0.008), PAPER, 0, hip + 0.30, 0.108);
  part(root, box(0.028, 0.19, 0.012), GOLD, 0, hip + 0.28, 0.116);
  for (let i = 0; i < 3; i++) part(root, ball(0.005), STEEL, 0.045, hip + 0.13 + i * 0.05, 0.109, { outline: false });
  part(root, cyl(0.045, 0.05, 0.10, 12), SKIN, 0, hip + 0.49, 0);
  const head = group(root, 0, hip + 0.62, 0);
  part(head, ball(0.116), SKIN, 0, 0, 0).scale.set(0.89, 1.12, 0.92);
  part(head, ball(0.118), DARK, 0, 0.047, -0.027).scale.set(0.92, 0.76, 0.91);
  part(head, rbox(0.14, 0.055, 0.035, 0.01), DARK, -0.012, 0.079, 0.073, { rz: 0.12 });
  part(head, ball(0.02), SKIN, 0, -0.005, 0.106, { outline: false });
  for (const x of [-0.04, 0.04]) {
    part(head, ball(0.008), DARK, x, 0.02, 0.095, { outline: false });
    part(head, ball(0.022), SKIN, x < 0 ? -0.105 : 0.105, 0, 0);
    part(head, box(0.026, 0.006, 0.005), DARK, x, 0.043, 0.095, { outline: false });
  }
  const mouth = part(head, rbox(0.035, 0.007, 0.004, 0.002), '#925853', 0, -0.055, 0.096, { outline: false });
  for (const side of [-1, 1]) {
    const x = side * 0.085;
    if (seated) {
      part(root, cyl(0.061, 0.066, 0.29, 12), NAVY, x, hip - 0.015, 0.16, { rx: Math.PI / 2 });
      part(root, cyl(0.046, 0.055, 0.34, 12), NAVY, x, 0.27, 0.29);
      part(root, rbox(0.11, 0.075, 0.23, 0.025), DARK, x, 0.065, 0.34);
    } else {
      part(root, cyl(0.052, 0.069, 0.73, 12), NAVY, x, 0.43, 0);
      part(root, rbox(0.11, 0.075, 0.23, 0.025), DARK, x, 0.055, 0.055);
    }
  }
  const arms = [-1, 1].map(side => ({
    side, upper: rod(root, shirt, 0.055), lower: rod(root, SKIN, 0.037),
    hand: part(root, ball(0.042), SKIN, 0, 0, 0),
  }));
  const inv = new THREE.Matrix4();
  const update = (l: S.V, r: S.V, talking = false, nod = 0, t = 0) => {
    root.updateMatrix(); inv.copy(root.matrix).invert();
    for (const arm of arms) {
      const q = S.v(arm.side < 0 ? l : r).applyMatrix4(inv);
      const shoulder: S.V = [arm.side * 0.185, hip + 0.39, 0];
      const delta = q.clone().sub(S.v(shoulder));
      if (delta.length() > 0.57) q.copy(S.v(shoulder)).add(delta.setLength(0.57));
      const elbow: S.V = [arm.side * 0.24 + q.x * 0.14, hip + 0.17, Math.max(0.06, q.z * 0.48)];
      arm.upper(shoulder, elbow);
      arm.lower(elbow, [q.x, q.y, q.z]);
      arm.hand.position.copy(q);
    }
    head.rotation.x = nod;
    head.rotation.y = 0.035 * Math.sin(t * 1.6);
    mouth.scale.y = talking ? 1 + Math.abs(Math.sin(t * 9)) * 2.5 : 1;
  };
  return { root, head, update, hip };
}
function document(g: THREE.Object3D, p: S.V, title: string, w = 0.27, d = 0.23) {
  const root = group(g, ...p);
  part(root, box(w + 0.02, 0.012, d + 0.025), NAVY, 0, 0, 0);
  part(root, box(w, 0.006, d), PAPER, 0, 0.009, 0);
  flat(root, title, w - 0.025, 0.04, [0, 0.013, -d / 2 + 0.035]);
  for (let i = 0; i < 4; i++) {
    part(root, box(w - 0.05 - (i % 2) * 0.04, 0.001, 0.004), '#a2b3b4', -0.01, 0.014, -0.025 + i * 0.032, { outline: false });
  }
  part(root, box(w * 0.38, 0.002, 0.008), TEAL, w * 0.17, 0.016, d / 2 - 0.025, { outline: false });
  return root;
}
function pen(g: THREE.Object3D, color = NAVY) {
  const root = group(g);
  part(root, cyl(0.007, 0.008, 0.13, 8), color, 0, 0.015, 0, { rz: -0.25, outline: false });
  part(root, cyl(0.006, 0.007, 0.025, 8), GOLD, -0.016, -0.048, 0, { rz: -0.25, outline: false });
  part(root, cyl(0, 0.006, 0.022, 8), DARK, -0.021, -0.07, 0, { rz: Math.PI - 0.25, outline: false });
  part(root, box(0.005, 0.04, 0.006), STEEL, 0.013, 0.05, 0, { rz: -0.25, outline: false });
  return root;
}
function stamp(g: THREE.Object3D) {
  const root = group(g);
  part(root, cyl(0.022, 0.025, 0.065, 12), EDGE, 0, -0.005, 0);
  part(root, cyl(0.026, 0.026, 0.012, 12), RED, 0, -0.044, 0);
  part(root, ball(0.028), WOOD, 0, 0.033, 0).scale.y = 0.65;
  return root;
}
function card(g: THREE.Object3D, title = '다온상사', color = TEAL) {
  const root = group(g);
  part(root, box(0.14, 0.003, 0.085), PAPER, 0, 0, 0);
  flat(root, title, 0.13, 0.031, [0, 0.003, -0.014], PAPER, color);
  for (let i = 0; i < 2; i++) part(root, box(0.09, 0.001, 0.003), STEEL, 0.01, 0.003, 0.013 + i * 0.012, { outline: false });
  return root;
}
function brochure(g: THREE.Object3D, title = '온유 에어', color = TEAL) {
  const root = group(g);
  part(root, box(0.16, 0.012, 0.23), color, 0, 0, 0);
  flat(root, title, 0.14, 0.05, [0, 0.007, -0.065], color, PAPER);
  part(root, box(0.065, 0.002, 0.07), MINT, 0, 0.008, 0.015, { outline: false });
  for (let i = 0; i < 3; i++) part(root, box(0.12, 0.001, 0.003), PAPER, 0, 0.009, 0.065 + i * 0.012, { outline: false });
  return root;
}
function bottle(g: THREE.Object3D, p: S.V) {
  const root = group(g, ...p);
  part(root, cyl(0.025, 0.029, 0.13, 12), '#c5e3df', 0, 0.065, 0);
  part(root, cyl(0.013, 0.023, 0.03, 12), '#d8ede9', 0, 0.145, 0);
  part(root, cyl(0.014, 0.014, 0.02, 10), TEAL, 0, 0.167, 0);
  part(root, cyl(0.026, 0.027, 0.04, 12), PAPER, 0, 0.074, 0);
  return root;
}
/** Small fictional air-quality sensor, demonstrably a product rather than an anonymous cube. */
function product(g: THREE.Object3D, color = WHITE, size = 1) {
  const root = group(g); root.scale.setScalar(size);
  part(root, rbox(0.14, 0.17, 0.12, 0.025), color, 0, 0.0, 0);
  part(root, rbox(0.10, 0.05, 0.006, 0.009), NAVY, 0, 0.035, 0.063);
  glowing(root, box(0.043, 0.013, 0.002), MINT, 0, 0.035, 0.068);
  for (let i = 0; i < 5; i++) part(root, box(0.075, 0.003, 0.003), STEEL, 0, -0.018 - i * 0.009, 0.064, { outline: false });
  part(root, cyl(0.009, 0.009, 0.003, 12), GOLD, 0.042, 0.065, 0.064, { rx: Math.PI / 2 });
  part(root, box(0.06, 0.003, 0.006), DARK, 0, 0.087, 0, { outline: false });
  return root;
}
function caseModel(g: THREE.Object3D, p: S.V, w = 0.48) {
  const root = group(g, ...p);
  part(root, rbox(w, 0.12, 0.30, 0.025), NAVY, 0, 0, 0);
  part(root, box(w - 0.035, 0.015, 0.26), '#687f83', 0, 0.065, 0);
  for (const x of [-0.12, 0.12]) part(root, rbox(0.17, 0.012, 0.20, 0.015), DARK, x, 0.045, 0);
  const lid = group(root, 0, 0.065, -0.15);
  part(lid, rbox(w, 0.055, 0.30, 0.02), TEAL, 0, 0.02, 0.15);
  part(lid, box(w - 0.04, 0.007, 0.25), '#677e82', 0, -0.011, 0.15);
  flat(lid, '다온 · 방문 샘플', w - 0.08, 0.08, [0, 0.051, 0.15], TEAL, PAPER);
  for (const x of [-0.17, 0.17]) {
    part(root, box(0.035, 0.04, 0.015), GOLD, x, 0.02, 0.157);
    part(root, box(0.038, 0.015, 0.022), STEEL, x, 0.063, -0.14);
  }
  part(root, box(0.18, 0.018, 0.025), DARK, 0, 0.01, 0.205);
  for (const x of [-0.08, 0.08]) part(root, box(0.018, 0.018, 0.055), DARK, x, 0.01, 0.18);
  return { root, lid };
}
function keyboard(g: THREE.Object3D, p: S.V, scale = 1) {
  const root = group(g, ...p); root.scale.setScalar(scale);
  part(root, rbox(0.34, 0.019, 0.13, 0.009), STEEL, 0, 0, 0);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 11; col++) {
    part(root, box(0.021, 0.006, 0.018), row === 3 && col > 3 && col < 7 ? DARK : WHITE,
      -0.145 + col * 0.029, 0.012, -0.045 + row * 0.029, { outline: false });
  }
  return root;
}
interface Display { mesh: THREE.Mesh; set: (i: number) => void }
function screen(g: THREE.Object3D, p: S.V, w: number, h: number, title: string, states: string[], style: 'crm' | 'chart' | 'list' = 'list'): Display {
  const maps = states.map((state, i) => painted(`sales-${title}-${state}`, 768, 448, c => {
    c.fillStyle = '#142f40'; c.fillRect(0, 0, 768, 448);
    c.fillStyle = '#245365'; c.fillRect(0, 0, 768, 80);
    text(c, title, 35, 43, 32, '#f8f4e9', 'left');
    text(c, '다온상사', 730, 43, 24, '#a6d9ce', 'right');
    if (style === 'crm') {
      ['신규 문의', '제안 진행', '협의 중', '수주 완료'].forEach((s, col) => {
        const x = 26 + col * 185;
        text(c, s, x + 77, 119, 23, '#c9e5e0', 'center');
        c.fillStyle = '#204454'; c.fillRect(x, 143, 166, 190);
        for (let j = 0; j < 2; j++) {
          c.fillStyle = col === Math.min(3, i) && j === 0 ? '#60ad99' : '#3a6470';
          c.fillRect(x + 10, 157 + j * 80, 145, 60);
          text(c, ['새봄유통', '한결산업', '소담물류', '온유 에어'][col], x + 82, 181 + j * 80, 19, '#ffffff', 'center');
          text(c, j ? '후속 연락 예약' : '담당 거래처', x + 82, 204 + j * 80, 14, '#d4eee7', 'center');
        }
      });
    } else if (style === 'chart') {
      for (let j = 0; j < 5; j++) {
        c.fillStyle = '#294e5d'; c.fillRect(55, 140 + j * 39, 650, 2);
        const height = 40 + j * 27 + Math.min(i, 3) * 13;
        c.fillStyle = j === 4 ? '#e3b768' : '#79b6a7';
        c.fillRect(90 + j * 122, 330 - height, 72, height);
        text(c, ['상담', '시연', '제안', '협의', '수주'][j], 126 + j * 122, 351, 23, '#e2efec', 'center');
      }
    } else {
      ['01  고객 요구 확인', '02  온유 에어 · 30대', '03  납기 / 설치 / 유지 관리', '04  후속 일정 공유'].forEach((s, j) => {
        text(c, s, 50, 136 + j * 56, 27, '#edf4ea', 'left');
        text(c, j < i ? '완료' : '확인', 695, 136 + j * 56, 22, j < i ? '#9de0b4' : '#e2bf77', 'right');
      });
    }
    c.fillStyle = '#b6d9ce'; c.fillRect(24, 382, 720, 48);
    text(c, state, 384, 407, 28, '#193c47', 'center');
  }));
  const mesh = picture(g, maps[0], w, h, ...p);
  const mat = mesh.material as THREE.MeshBasicMaterial;
  return { mesh, set(i) {
    const map = maps[Math.max(0, Math.min(maps.length - 1, i))];
    if (mat.map !== map) { mat.map = map; mat.needsUpdate = true; }
  } };
}
/** Status strips have their own large type instead of shrinking a desktop UI into a label. */
function strip(g: THREE.Object3D, p: S.V, w: number, h: number, states: string[], bg = NAVY, fg = WHITE): Display {
  const maps = states.map(state => painted(`sales-strip-${state}-${bg}`, 768, 96, c => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 768, 96);
    text(c, state, 384, 50, 39, fg, 'center');
  }));
  const mesh = picture(g, maps[0], w, h, ...p);
  const mat = mesh.material as THREE.MeshBasicMaterial;
  return { mesh, set(i) {
    const map = maps[Math.max(0, Math.min(maps.length - 1, i))];
    if (mat.map !== map) {
      mat.map = map;
      mat.needsUpdate = true;
    }
  } };
}

interface Frame { m: S.SalesMotion; b: S.Beat; h: S.Hands; t: number; height: number }
function animate(g: THREE.Group, out: Built, mapping: Record<string, S.SalesMotion>, update: (f: Frame | null) => void) {
  out.spots = Object.fromEntries(Object.entries(mapping).map(([id, m]) => {
    const p = S.spotOf(m), seated = p[1] > 0;
    const s = spot(g, seated ? 'sit' : 'stand', ...p, Math.PI, seated ? p[1] : undefined);
    s.motion = m; s.work = marker(g, 0, 0, 0);
    return [id, s];
  }));
  out.work = marker(g, 0, 0, 0);
  out.away = (_gone, t) => {
    const active = Object.values(out.spots!).filter(s => Math.abs(t - Number(s.at.userData.posedAt ?? -1e9)) < 0.6)
      .sort((a, b) => Number(b.at.userData.posedAt) - Number(a.at.userData.posedAt))[0];
    if (!active) { update(null); return; }
    const m = active.motion as S.SalesMotion;
    const elapsed = S.salesTime(m, t, active.work!.getWorldPosition(new THREE.Vector3()));
    const height = Number(active.at.userData.height ?? 1.6);
    active.at.position.x = S.spotOf(m)[0] + S.stepOf(m, elapsed);
    update({ m, t: elapsed, b: S.beat(m, elapsed), h: S.salesHands(m, elapsed, height), height });
  };
}
function held(o: THREE.Object3D, f: Frame | null, keys: string[], hand: 'l' | 'r' = 'r') {
  o.visible = !!f && keys.includes(f.b.key);
  if (o.visible && f) place(o, f.h[hand]);
}
function parked(g: THREE.Object3D, heldModel: THREE.Object3D, p: S.V, tilt = 0) {
  const rest = heldModel.clone(); g.add(rest); place(rest, p); rest.rotation.z = tilt;
  return () => { rest.visible = !heldModel.visible; };
}
function middle(f: Frame): S.V { return S.between(f.h.l, f.h.r, 0.5); }
function lamp(g: THREE.Object3D, out: Built, p: S.V) {
  const root = group(g, ...p);
  part(root, cyl(0.055, 0.065, 0.02, 16), NAVY, 0, 0, 0);
  part(root, cyl(0.008, 0.008, 0.25, 8), STEEL, 0, 0.13, 0);
  part(root, box(0.16, 0.025, 0.045), NAVY, 0.055, 0.255, 0);
  const use = group(root); out.inUse = use;
  glowing(use, box(0.13, 0.005, 0.035), '#ffe9b4', 0.055, 0.24, 0);
  return use;
}
function deskTop(g: THREE.Object3D, width: number, depth = 0.68, y = 0.75) {
  part(g, rbox(width, 0.045, depth, 0.022), WOOD, 0, y, 0);
  part(g, box(width - 0.03, 0.009, depth - 0.02), EDGE, 0, y - 0.027, 0);
  for (const x of [-width / 2 + 0.08, width / 2 - 0.08]) {
    part(g, box(0.04, y - 0.08, 0.04), NAVY, x, (y - 0.08) / 2 + 0.025, -0.23);
    part(g, box(0.04, y - 0.08, 0.04), NAVY, x, (y - 0.08) / 2 + 0.025, 0.23);
    part(g, box(0.045, 0.035, 0.55), NAVY, x, 0.04, 0);
  }
  part(g, box(width - 0.12, 0.24, 0.022), NAVY, 0, 0.52, -0.25);
  for (let i = 0; i < 4; i++) part(g, box(width - 0.025, 0.001, 0.002), '#97714e', 0, y + 0.023, -0.24 + i * 0.15, { outline: false });
}

/** The start-ups the fund has backed (all made up), for the portfolio wall. */
/** A firm's name on its lobby wall, a light strip along the foot. */
function logoWall(g: THREE.Group, W: number, D: number, wall: string, accent: string, name: string, line: string, lineColor: string) {
  const z = -D / 2 + 0.05;
  part(g, rbox(W - 0.2, 2.2, 0.08, 0.02), wall, 0, 1.1, z);
  part(g, box(W - 0.3, 0.02, 0.02), accent, 0, 0.12, z + 0.05, { outline: false });
  label(g, name, 1.7, 0.3, 0, 1.55, z + 0.045, wall, accent);
  label(g, line, 1.7, 0.1, 0, 1.25, z + 0.045, wall, lineColor);
}
const PORTFOLIO = ['모아핀', '그린셀', '루프랩', '하루봇', '온새미', '도담케어', '피크닉AI', '새길모빌리티', '바른팜', '코드나무', '마음로그', '빛누리에너지'];
const portfolioTex = painted('vcPortfolio', 512, 256, (c) => {
  c.fillStyle = '#f7f7f3';
  c.fillRect(0, 0, 512, 256);
  text(c, 'OUR PORTFOLIO', 256, 34, 24, '#1d2b4a', 'center');
  PORTFOLIO.forEach((n, i) => {
    const x = 20 + (i % 4) * 123;
    const y = 58 + Math.floor(i / 4) * 64;
    c.fillStyle = '#ffffff';
    c.fillRect(x, y, 112, 52);
    c.strokeStyle = '#d5d8de';
    c.strokeRect(x, y, 112, 52);
    text(c, n, x + 56, y + 33, 17, ['#1d2b4a', '#2e7d32', '#c2185b', '#ef6c00'][i % 4], 'center');
  });
});

export const BUILDERS: Record<string, Builder> = {
  /** 펀드 로고 벽: a navy wall panel with the fund's name and star, a light strip along its foot. */
  vcLogoWall(g, W, D) {
    logoWall(g, W, D, '#1d2b4a', '#ffd54f', '★ 새벽별벤처스', 'DAYBREAK STAR VENTURES · 초기 투자 전문', '#cfd8e8');
  },
  /** 대행사 로고 벽: the PR agency's name on a white wall with its coral line. */
  prLogoWall(g, W, D) {
    logoWall(g, W, D, '#fbfaf7', '#ff7043', '빛나래 PR 컨설팅', 'BITNARAE PR · 브랜드 · 미디어 · 위기관리', '#5d6470');
  },
  /** 포트폴리오 벽: a white board of the backed start-ups' names. */
  vcPortfolioWall(g, W, D) {
    const z = -D / 2 + 0.05;
    part(g, rbox(W - 0.2, 1.1, 0.05, 0.015), '#e6e6e0', 0, 1.45, z);
    picture(g, portfolioTex, W - 0.3, 0.9, 0, 1.45, z + 0.03);
  },
  /** Personal calling station: acoustic divider, CRM, dial pad, notes, diary, headset,
   * under-desk computer and cables. The chair's seat is exactly the sit marker. */
  salesPhoneDesk(g, _W, _D, _c, _def, _ctx, out) {
    deskTop(g, 0.92);
    chair(g, [0, 0, 0.64], Math.PI, NAVY, true);
    part(g, rbox(0.91, 0.43, 0.035, 0.015), '#73999b', 0, 0.94, -0.335);
    part(g, box(0.88, 0.018, 0.045), STEEL, 0, 1.16, -0.335);
    for (const x of [-0.435, 0.435]) part(g, box(0.02, 0.49, 0.02), STEEL, x, 0.92, -0.33);
    label(g, '다온상사 · 영업지원', 0.40, 0.065, -0.17, 1.105, -0.311, NAVY, WHITE);
    label(g, '고객의 내일을 함께', 0.28, 0.045, 0.25, 1.09, -0.309, MINT, NAVY);
    part(g, box(0.16, 0.28, 0.29), NAVY, 0.32, 0.18, -0.02);
    part(g, box(0.135, 0.24, 0.012), DARK, 0.32, 0.18, 0.132);
    for (let i = 0; i < 8; i++) part(g, box(0.095, 0.005, 0.004), STEEL, 0.32, 0.10 + i * 0.014, 0.141, { outline: false });
    glowing(g, ball(0.006), MINT, 0.35, 0.27, 0.143);
    cable(g, [[0.32, 0.20, -0.16], [0.33, 0.09, -0.25], [0.16, 0.15, -0.29], [0.02, 0.73, -0.24]]);
    part(g, box(0.18, 0.02, 0.14), NAVY, 0, 0.79, -0.13);
    part(g, box(0.035, 0.15, 0.025), STEEL, 0, 0.87, -0.18);
    part(g, rbox(0.47, 0.31, 0.035, 0.014), DARK, 0, 1.025, -0.185);
    const crm = screen(g, [0, 1.025, -0.165], 0.435, 0.267, '거래처 CRM',
      ['새 문의 · 연락 준비', '상담 중 · 요구사항 기록', '제안 발송 · 일정 예약', '수주 확정 · 후속 방문'], 'crm');
    out.screen = crm.mesh;
    keyboard(g, S.DESK.keys);
    part(g, rbox(0.11, 0.002, 0.15, 0.008), '#486873', 0.30, 0.778, 0.14);
    const mouse = part(g, rbox(0.045, 0.028, 0.075, 0.014), WHITE, 0.30, 0.795, 0.12);
    part(g, box(0.003, 0.003, 0.025), DARK, 0.30, 0.81, 0.10, { outline: false });
    part(g, rbox(0.18, 0.045, 0.19, 0.012), DARK, -0.32, 0.795, 0.02);
    const phoneStatus = label(g, '대기', 0.10, 0.035, -0.32, 0.822, -0.02, MINT, NAVY);
    phoneStatus.rotation.x = -Math.PI / 2;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      part(g, box(0.022, 0.006, 0.018), WHITE, -0.35 + col * 0.03, 0.822, 0.015 + row * 0.026, { outline: false });
    }
    const receiver = group(g);
    part(receiver, rbox(0.035, 0.16, 0.03, 0.01), NAVY, 0, 0, 0);
    for (const y of [-0.076, 0.076]) {
      part(receiver, rbox(0.057, 0.045, 0.045, 0.014), DARK, 0, y, 0.012);
      for (let i = 0; i < 3; i++) part(receiver, ball(0.003), STEEL, -0.015 + i * 0.015, y, 0.037, { outline: false });
    }
    const parkPhone = parked(g, receiver, [-0.39, 0.84, 0.025], Math.PI / 2);
    const liveCord = cable(g, [[-0.36, 0.80, 0.05], [-0.46, 0.69, 0.27], [-0.16, 1.04, 0.56]], DARK, 0.004);
    const headset = group(g, 0.245, 1.06, -0.17);
    part(headset, new THREE.TorusGeometry(0.065, 0.007, 6, 20, Math.PI), NAVY, 0, 0.04, 0, { rz: 0.1 });
    for (const x of [-0.065, 0.065]) part(headset, rbox(0.025, 0.06, 0.035, 0.009), DARK, x, 0.025, 0);
    const memo = document(g, [0.28, 0.779, 0.20], '상담 메모', 0.21, 0.18);
    const writing = pen(g); const parkPen = parked(g, writing, [0.40, 0.795, 0.20], 1.3);
    const brief = document(g, [0, 0, 0], '고객 요청서', 0.23, 0.20);
    const parkBrief = parked(g, brief, [-0.18, 0.782, 0.26]);
    const noteLines = Array.from({ length: 4 }, (_, i) => part(memo, box(0.09, 0.002, 0.004), BLUE,
      -0.015, 0.017, -0.02 + i * 0.025, { outline: false }));
    const calendar = group(g, 0.32, 0.81, -0.18);
    part(calendar, box(0.14, 0.11, 0.008), PAPER, 0, 0.035, 0, { rx: -0.2 });
    label(calendar, '수요일  28', 0.13, 0.045, 0, 0.06, 0.013, WHITE, RED);
    label(calendar, '14:00 방문', 0.13, 0.035, 0, 0.015, 0.004, WHITE, INK);
    part(g, cyl(0.03, 0.03, 0.08, 12), TEAL, 0.39, 0.82, -0.04);
    for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.12, 6), [GOLD, RED, BLUE][i], 0.38 + i * 0.012, 0.88, -0.04, { rz: (i - 1) * 0.1, outline: false });
    const trainer = person(g, [0.76, 0, 0.30], -0.55, '#6c7e99', false);
    const trainerBadge = group(trainer.root, 0.08, 1.07, 0.12);
    label(trainerBadge, '선임', 0.08, 0.045, 0, 0, 0, PAPER, INK);
    const trainingNotes = document(g, [0.64, 1.04, 0.25], '통화 코칭', 0.19, 0.16);
    const trainingStates = ['연결 · 선임 통화 공유', '듣기 · 질문과 답 기록', '역할 연습 · 말투 점검', '교육 완료 · 피드백 저장'];
    const proposalStates = ['요청서 확인', '견적 작성 · 단가 검산', '효과 분석 · 문안 교정', '제안서 발송 완료'];
    const accountStates = ['거래 이력 확인', '후속 통화 연결', '방문 일정 예약', '담당 거래처 갱신 완료'];
    const statusMaps = [trainingStates, proposalStates, accountStates].map((states, i) =>
      strip(g, [0, 1.19, -0.30], 0.78, 0.08, states, [TEAL, NAVY, EDGE][i]));
    const calendarCheck = label(calendar, '방문 확정', 0.13, 0.035, 0, 0.015, 0.006, MINT, NAVY);
    const headsetWorn = group(g);
    const headband = part(headsetWorn, new THREE.TorusGeometry(0.112, 0.009, 6, 24, Math.PI), NAVY, 0, 0, 0);
    headband.userData.ownGeometry = true;
    for (const x of [-0.112, 0.112]) part(headsetWorn, rbox(0.027, 0.067, 0.045, 0.01), DARK, x, -0.01, 0);
    cable(headsetWorn, [[-0.12, -0.02, 0], [-0.13, -0.09, -0.06], [-0.04, -0.10, -0.09]], DARK, 0.006);
    part(headsetWorn, ball(0.012), DARK, -0.04, -0.10, -0.09);
    const lampUse = lamp(g, out, [-0.36, 0.79, -0.20]);
    const callLed = glowing(lampUse, ball(0.009), MINT, 0.045, 0.055, 0.22);
    animate(g, out, {
      coldCall: 'slCall', writeProposal: 'slProposal', sales_shadowCall: 'slShadow',
      sales_ownAccounts: 'slAccounts', '*': 'slCall',
    }, f => {
      const k = f?.b.key;
      const phoneKeys = f?.m === 'slShadow' ? ['connect', 'listen', 'note', 'question', 'retry']
        : ['dial', 'listen', 'offer', 'note', 'agree', 'followup'];
      held(receiver, f, f?.m === 'slProposal' ? [] : phoneKeys, 'l');
      if (f?.m === 'slShadow') receiver.visible = false;
      parkPhone(); liveCord.visible = receiver.visible;
      trainer.root.visible = f?.m === 'slShadow';
      trainingNotes.visible = trainer.root.visible;
      if (f && trainer.root.visible) {
        const coach = S.coachHands(f.t);
        trainer.update(coach.l, coach.r, coach.talking, coach.nod, f.t);
      }
      headsetWorn.visible = f?.m === 'slShadow' && k !== 'check';
      headset.visible = !headsetWorn.visible;
      if (f && headsetWorn.visible) place(headsetWorn, S.headsetAt(f.b.key, f.b.u, f.height));
      statusMaps.forEach((display, i) => {
        display.mesh.visible = !!f && f.m === ['slShadow', 'slProposal', 'slAccounts'][i];
        if (f) display.set(S.deskStatus(f.m, f.b.key));
      });
      calendarCheck.visible = f?.m === 'slAccounts' && (k === 'schedule' || k === 'save');
      held(writing, f, ['note', 'proof']); parkPen();
      brief.visible = f?.m === 'slProposal' && k === 'brief';
      if (brief.visible && f) place(brief, middle(f));
      parkBrief();
      noteLines.forEach((line, i) => { line.visible = !!f && (f.b.i > 4 || (k === 'note' || k === 'proof') && f.b.u > i / 4); });
      crm.set(!f ? 0 : k === 'save' || k === 'agree' || k === 'send' ? 3 : ['chart', 'proof', 'schedule', 'retry'].includes(k!) ? 2 : 1);
      mouse.rotation.y = k === 'chart' || k === 'select' ? 0.04 * S.wave(f!.t) : 0;
      callLed.visible = !!f && receiver.visible && S.wave(f.t, 2) > -0.4;
      lampUse.visible = !!f;
    });
  },

  /** A real negotiating table with a seated buyer, paired copies, tablet, calculator,
   * seal case and two pens. Both the client and the worker respond to the same beat. */
  contractTable(g, _W, _D, _c, _def, _ctx, out) {
    deskTop(g, 1.84, 0.76);
    chair(g, [-0.28, 0, 0.58], Math.PI, NAVY);
    chair(g, [0.15, 0, -0.55], 0, '#856552');
    const buyer = person(g, [0.15, 0, -0.55], 0, '#84675b');
    label(g, '다온상사  ×  새봄유통', 0.66, 0.09, 0.43, 0.67, 0.39, NAVY, WHITE);
    const deskmat = part(g, rbox(0.72, 0.008, 0.52, 0.02), '#648383', -0.22, 0.779, 0.02);
    deskmat.receiveShadow = true;
    const contract = document(g, S.TABLE.paper, '제품 공급 계약서', 0.28, 0.25);
    const heldDoc = document(g, [0, 0, 0], '계약 조건 검토', 0.25, 0.23);
    const folder = group(g, -0.58, 0.79, -0.06);
    part(folder, box(0.24, 0.018, 0.30), TEAL, 0, 0, 0);
    flat(folder, '검토 자료', 0.19, 0.06, [0, 0.011, -0.05], TEAL, WHITE);
    const flap = group(folder, -0.12, 0.012, 0);
    part(flap, box(0.24, 0.006, 0.30), MINT, 0.12, 0, 0);
    const tabRoot = group(g, ...S.TABLE.tablet);
    part(tabRoot, rbox(0.30, 0.025, 0.21, 0.017), NAVY, 0, 0, 0);
    const tablet = screen(tabRoot, [0, 0.014, 0], 0.267, 0.175, '공급 제안',
      ['온유 에어 · 30대', '납기 14일 · 설치 포함', '합의 완료 · 서명 대기', '계약 체결 완료'], 'chart');
    tablet.mesh.rotation.x = -Math.PI / 2;
    out.screen = tablet.mesh;
    const writing = pen(g); const parkPen = parked(g, writing, [-0.50, 0.81, 0.23], 1.3);
    const seal = stamp(g); const parkSeal = parked(g, seal, [0.48, 0.84, 0.14]);
    part(g, rbox(0.10, 0.025, 0.08, 0.006), NAVY, ...S.TABLE.ink);
    part(g, box(0.083, 0.006, 0.064), RED, 0.35, 0.825, 0.15);
    part(g, rbox(0.10, 0.013, 0.08, 0.006), NAVY, 0.35, 0.795, 0.05, { rx: 0.2 });
    const redMark = flat(g, '다온', 0.05, 0.045, [-0.17, 0.809, 0.23], '#f8d9ce', RED);
    const signature = Array.from({ length: 5 }, (_, i) => part(contract, box(0.018, 0.002, 0.004), NAVY,
      -0.07 + i * 0.021, 0.017, 0.065 + 0.005 * (i % 2), { ry: i * 0.32, outline: false }));
    const corrections = Array.from({ length: 3 }, (_, i) => part(contract, box(0.08, 0.001, 0.003), RED,
      0, 0.019, -0.026 + i * 0.033, { outline: false }));
    const customerCopy = document(g, [0.28, 0.79, -0.19], '거래처 보관용', 0.25, 0.20);
    const clientPen = pen(g, EDGE);
    const nameplate = group(g, 0.68, 0.79, -0.10);
    part(nameplate, box(0.29, 0.075, 0.04), STEEL, 0, 0.035, 0);
    label(nameplate, '새봄유통 · 구매팀', 0.28, 0.055, 0, 0.04, 0.024, WHITE, INK);
    bottle(g, [0.72, 0.78, 0.16]);
    bottle(g, [-0.76, 0.78, -0.18]);
    const calculator = group(g, 0.64, 0.80, 0.01);
    part(calculator, rbox(0.12, 0.025, 0.17, 0.01), DARK, 0, 0, 0);
    flat(calculator, '30 × 12', 0.10, 0.04, [0, 0.014, -0.045], MINT, NAVY);
    for (let i = 0; i < 9; i++) part(calculator, box(0.022, 0.005, 0.022), WHITE, -0.032 + i % 3 * 0.032, 0.017, i / 3 % 1 * 0.02 + Math.floor(i / 3) * 0.03, { outline: false });
    const decisionCards = [-0.07, 0.07, 0.21].map((x, i) => {
      const c = card(g, ['납기', '단가', '설치'][i]); place(c, [x, 0.80, -0.10]); return c;
    });
    const use = group(g); out.inUse = use;
    glowing(use, ball(0.009), MINT, 0.14, 0.89, 0.02);
    animate(g, out, { reviewContract: 'slReview', closeDeal: 'slClose',
      sales_partnerNegotiation: 'slStrategy', '*': 'slReview' }, f => {
      const k = f?.b.key, t = f?.t ?? 0;
      held(writing, f, ['sign', 'correct', 'agenda', 'minutes']); parkPen();
      held(seal, f, ['ink', 'stamp']); parkSeal();
      heldDoc.visible = !!f && ['read', 'file', 'exchange'].includes(k!);
      if (heldDoc.visible && f) {
        const paperAt: S.V = k === 'exchange'
          ? S.between([-0.28, 0.802, 0.20], [-0.08, 0.802, -0.12], S.smooth(f.b.u, 0, 0.85))
          : middle(f);
        place(heldDoc, paperAt);
      }
      contract.visible = !heldDoc.visible;
      flap.rotation.z = k === 'open' ? -Math.PI * S.smooth(f!.b.u) : f?.m === 'slReview' ? -Math.PI : 0;
      const tabletHeld = k === 'tablet';
      if (tabletHeld && f) place(tabRoot, middle(f)); else place(tabRoot, S.TABLE.tablet);
      tabRoot.rotation.x = tabletHeld ? -0.18 : 0;
      tablet.set(!f ? 0 : k === 'terms' || k === 'query' ? 1 : ['sign', 'ink', 'stamp', 'decide'].includes(k!) ? 2 : ['shake', 'exchange', 'file', 'minutes'].includes(k!) ? 3 : 0);
      redMark.visible = f?.m === 'slClose' && (f.b.i > 5 || k === 'stamp' && f.b.u > 0.45);
      signature.forEach((s, i) => { s.visible = f?.m === 'slClose' && (f.b.i > 3 || k === 'sign' && f.b.u > i / 5); });
      corrections.forEach((s, i) => { s.visible = f?.m === 'slReview' && (k === 'file' || k === 'correct' && f.b.u > i / 3); });
      let l: S.V = [0.08, 0.80, -0.28], r: S.V = [0.42, 0.80, -0.28];
      if (k === 'tablet' || k === 'compare' || k === 'forecast') r = [0.13, 0.92, -0.02];
      if (k === 'terms' || k === 'query' || k === 'listen') r = [0.36, 1.02 + 0.03 * S.wave(t), -0.20];
      if (k === 'sign') r = [0.24 + 0.025 * S.wave(t, 1.4), 0.87, -0.17];
      if (k === 'shake' && f) l = f.h.r;
      buyer.root.position.z = -0.55 + (k === 'shake' ? 0.10 : 0);
      if (k === 'exchange') { l = [-0.20, 0.84, -0.12]; r = [0.05, 0.84, -0.12]; }
      buyer.update(l, r, ['terms', 'query', 'listen'].includes(k!), k === 'shake' ? -0.06 : 0.07 + (f ? 0.04 * S.wave(t, 0.7) : 0), t);
      clientPen.visible = k === 'sign'; place(clientPen, r);
      customerCopy.visible = k !== 'exchange';
      decisionCards.forEach((c, i) => { c.visible = f?.m === 'slStrategy'; c.position.x = -0.07 + i * 0.14 + (k === 'allocate' && i === 0 ? 0.28 * S.smooth(f!.b.u) : 0); });
      use.visible = !!f;
    });
  },
  /** Display inventory above a pull-out foam-lined case. The picked sensor has exactly
   * one visible copy, from shelf to hands to the fitted recess in the case. */
  sampleShelf(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.86, 0.10, 0.56, 0.015), NAVY, 0, 0.08, -0.12);
    part(g, box(0.84, 1.55, 0.035), '#b5c9bf', 0, 0.87, -0.36);
    for (const x of [-0.42, 0.42]) {
      part(g, box(0.035, 1.66, 0.52), NAVY, x, 0.86, -0.10);
      for (let j = 0; j < 12; j++) part(g, ball(0.004), STEEL, x > 0 ? x - 0.021 : x + 0.021, 0.3 + j * 0.1, 0.02, { outline: false });
    }
    for (const y of [0.24, 0.69, 1.035, 1.41, 1.71]) {
      part(g, box(0.84, 0.035, 0.50), WOOD, 0, y, -0.11);
      part(g, box(0.84, 0.018, 0.015), EDGE, 0, y, 0.148);
    }
    label(g, '온유 · 제품 샘플', 0.70, 0.12, 0, 1.61, 0.155, NAVY, WHITE);
    const shelfSample = product(g); place(shelfSample, S.SAMPLE.product);
    for (const x of [0.01, 0.23]) {
      const p = product(g, x > 0.1 ? '#acc9d7' : '#e5bd82'); place(p, [x, 1.14, -0.12]);
    }
    for (const x of [-0.26, 0, 0.26]) {
      part(g, box(0.20, 0.21, 0.28), '#c8a980', x, 0.37, -0.10);
      label(g, x < 0 ? '에어 S' : x === 0 ? '에어 M' : '부속품', 0.16, 0.065, x, 0.39, 0.045, PAPER, INK);
      part(g, box(0.022, 0.21, 0.283), TEAL, x, 0.37, -0.10, { outline: false });
    }
    const cards = [-0.22, 0, 0.23].map((x, i) => {
      label(g, ['휴대형 S', '실내용 M', '사무실형 L'][i], 0.19, 0.045, x, 1.01, 0.153, PAPER, INK);
      return label(g, ['재고 12', '재고 08', '재고 06'][i], 0.15, 0.04, x, 0.94, -0.335, WHITE, TEAL);
    });
    const drawer = group(g, 0, 0.75, 0.16);
    part(drawer, box(0.78, 0.035, 0.40), WOOD, 0, 0, 0);
    part(drawer, box(0.78, 0.055, 0.025), NAVY, 0, 0.01, 0.20);
    part(drawer, box(0.15, 0.018, 0.025), STEEL, 0, 0.015, 0.22);
    const sampleCase = caseModel(g, [0, 0.84, 0.22]);
    const movingProduct = product(g);
    const packedProduct = product(g); place(packedProduct, [0.10, 0.89, 0.22]);
    packedProduct.rotation.x = Math.PI / 2;
    const info = brochure(g); const parkInfo = parked(g, info, S.SAMPLE.card);
    const checklist = document(g, [-0.24, 1.45, -0.10], '방문 준비', 0.23, 0.18);
    checklist.rotation.x = 0.35;
    const use = group(g); out.inUse = use;
    glowing(use, box(0.73, 0.008, 0.02), '#f3ecc3', 0, 1.39, 0.09);
    glowing(use, box(0.73, 0.008, 0.02), '#f3ecc3', 0, 1.70, 0.09);
    const status = strip(g, [0, 1.79, -0.12], 0.69, 0.13, ['샘플 · 명함 · 사양표', '외관 검사 완료', '샘플 1 / 자료 1 · 준비 완료']);
    out.screen = status.mesh;
    animate(g, out, { prepareSamples: 'slSamples', '*': 'slSamples' }, f => {
      const k = f?.b.key;
      const picking = !!f && ['pick', 'inspect', 'pack'].includes(k!);
      movingProduct.visible = picking;
      if (f && picking) {
        place(movingProduct, k === 'inspect' ? middle(f) : f.h.r);
        movingProduct.rotation.y = k === 'inspect' ? 0.5 * S.wave(f.t, 0.5) : 0;
      }
      shelfSample.visible = !f || f.b.i < 1;
      packedProduct.visible = !!f && f.b.i >= 4 && k !== 'carry';
      held(info, f, ['card']); parkInfo();
      sampleCase.lid.rotation.x = !f ? -1.15 : k === 'close' ? -1.15 * (1 - S.smooth(f.b.u)) : k === 'carry' ? 0 : -1.15;
      sampleCase.root.rotation.x = k === 'carry' ? -Math.PI / 2 * S.smooth(f!.b.u, 0, 0.40) : 0;
      if (k === 'carry' && f) {
        const handle = new THREE.Vector3(0, 0.01, 0.205).applyEuler(sampleCase.root.rotation);
        sampleCase.root.position.copy(S.v(middle(f)).sub(handle));
      } else place(sampleCase.root, [0, 0.84, 0.22]);
      drawer.position.z = f ? 0.20 : 0.16;
      cards[0].visible = !f || f.b.i < 4;
      status.set(!f ? 0 : f.b.i < 3 ? 1 : 2);
      use.visible = !!f;
    });
  },

  /** A physical pipeline board, tablet entry station and brass deal bell. The magnetic
   * account card moves to 수주 and the completed sales total appears before the bell. */
  salesLeaderboard(g, _W, _D, _c, _def, _ctx, out) {
    for (const x of [-0.76, 0.76]) {
      part(g, box(0.045, 1.92, 0.045), NAVY, x, 0.99, -0.18);
      part(g, box(0.12, 0.045, 0.60), NAVY, x, 0.06, -0.08);
      caster(g, x, -0.31); caster(g, x, 0.16);
    }
    part(g, rbox(1.76, 1.28, 0.07, 0.025), NAVY, 0, 1.38, -0.18);
    part(g, box(1.66, 1.15, 0.012), WHITE, 0, 1.37, -0.137);
    label(g, '다온상사 · 실적 현황', 1.50, 0.15, 0, 1.88, -0.125, NAVY, WHITE);
    const display = strip(g, [0, 1.65, -0.12], 1.48, 0.22, ['목표 1.2억 · 달성 74%', '새봄유통 +360만원', '누적 9,240만원 · 달성 77%'], NAVY, MINT);
    out.screen = display.mesh;
    ['상담', '제안', '협의', '수주'].forEach((s, i) => {
      const x = -0.60 + i * 0.40;
      label(g, s, 0.34, 0.09, x, 1.43, -0.12, [BLUE, TEAL, GOLD, '#64a17c'][i], WHITE);
      part(g, box(0.002, 0.46, 0.005), STEEL, x + 0.19, 1.17, -0.12, { outline: false });
      label(g, ['소담물류', '한결산업', '새봄유통', '두레기획'][i], 0.29, 0.075, x, 1.18, -0.112, '#e8eee7', INK);
    });
    const movingCard = label(g, '새봄  360만', 0.29, 0.08, -0.40, 1.43, -0.07, GOLD, NAVY);
    const originalCard = label(g, '새봄  360만', 0.29, 0.08, -0.42, 1.31, -0.108, GOLD, NAVY);
    const completedCard = label(g, '새봄  360만', 0.29, 0.08, 0.60, 1.31, -0.108, MINT, NAVY);
    part(g, rbox(1.50, 0.05, 0.38, 0.02), WOOD, 0, 0.96, 0.015);
    const input = screen(g, [-0.32, 1.0, 0.09], 0.28, 0.18, '수주 입력', ['거래처 확인', '등록 완료']);
    input.mesh.rotation.x = -Math.PI / 2;
    part(g, rbox(0.32, 0.035, 0.22, 0.015), NAVY, -0.32, 0.979, 0.09);
    const receipt = document(g, [0, 0, 0], '수주 확인서', 0.22, 0.20);
    const parkReceipt = parked(g, receipt, [-0.63, 0.992, 0.08]);
    const bell = group(g, 0.43, 0.99, 0.03);
    part(bell, cyl(0.087, 0.10, 0.025, 20), EDGE, 0, 0, 0);
    part(bell, ball(0.078), GOLD, 0, 0.025, 0).scale.y = 0.65;
    const button = part(bell, cyl(0.014, 0.014, 0.035, 12), STEEL, 0, 0.09, 0);
    const rings = [0, 1, 2].map(i => part(bell, ring(0.09 + i * 0.038, 0.003), GOLD, 0, 0.07, 0, { rx: Math.PI / 2, outline: false }));
    label(g, '수주 축하!', 0.30, 0.06, 0.43, 0.89, 0.215, NAVY, WHITE);
    const badge = label(g, '이번 주 BEST  차은비', 0.74, 0.09, 0, 0.82, -0.12, GOLD, NAVY);
    const use = group(g); out.inUse = use;
    glowing(use, box(1.46, 0.008, 0.015), MINT, 0, 1.98, -0.12);
    animate(g, out, { salesRecordDeal: 'slRecord', '*': 'slRecord' }, f => {
      const k = f?.b.key;
      receipt.visible = k === 'receipt';
      if (receipt.visible && f) place(receipt, middle(f)); parkReceipt();
      movingCard.visible = k === 'move';
      if (movingCard.visible && f) movingCard.position.set(f.h.r[0], f.h.r[1], f.h.r[2] - 0.015);
      originalCard.visible = !f || f.b.i < 2;
      completedCard.visible = !!f && f.b.i >= 3;
      display.set(!f || f.b.i < 2 ? 0 : f.b.i < 4 ? 1 : 2);
      input.set(f && f.b.i >= 2 ? 1 : 0);
      button.position.y = 0.09 - (k === 'bell' ? 0.015 * Math.max(0, S.wave(f!.b.u, 2)) : 0);
      rings.forEach((r, i) => { r.visible = k === 'bell' && (f!.b.u * 3 + i / 3) % 1 < 0.55; r.scale.setScalar(1 + (f ? (f.t * 2 + i / 3) % 1 : 0) * 0.3); });
      badge.rotation.z = k === 'celebrate' ? 0.025 * S.wave(f!.t, 2) : 0;
      use.visible = !!f;
    });
  },

  /** Screen, lectern and an attentive buyer in a separate seat. The presenter holds a
   * clicker; each slide changes with the explanation, then the buyer raises a question. */
  salesPresentation(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(2.82, 0.025, 1.86, 0.045), '#4b646e', 0, 0.018, 0);
    for (const x of [-1.18, 1.18]) {
      part(g, box(0.055, 2.03, 0.055), STEEL, x, 1.05, -0.70);
      part(g, box(0.17, 0.04, 0.43), NAVY, x, 0.06, -0.67);
    }
    part(g, rbox(2.46, 1.35, 0.075, 0.02), DARK, 0, 1.49, -0.70);
    const slides = screen(g, [0, 1.49, -0.656], 2.32, 1.23, '온유 에어 · 고객 제안',
      ['깨끗한 사무실, 보이는 관리', '센서 / 상태 알림 / 일괄 관리', '30대 도입 · 유지 비용 절감', '질문을 듣겠습니다', '설치 일정과 후속 지원 안내'], 'chart');
    out.screen = slides.mesh;
    label(g, '다온상사  고객 제안실', 1.35, 0.10, 0, 2.24, -0.64, NAVY, WHITE);
    for (const x of [-1.30, 1.30]) {
      part(g, rbox(0.14, 0.40, 0.15, 0.012), NAVY, x, 0.62, -0.65);
      for (const y of [0.54, 0.71]) part(g, cyl(0.046, 0.046, 0.008, 16), DARK, x, y, -0.566, { rx: Math.PI / 2 });
    }
    part(g, box(0.055, 0.89, 0.055), STEEL, -0.75, 0.49, -0.03);
    part(g, rbox(0.43, 0.035, 0.32, 0.02), NAVY, -0.75, 0.95, -0.015);
    part(g, box(0.36, 0.035, 0.30), NAVY, -0.75, 0.055, -0.015);
    const remote = group(g);
    part(remote, rbox(0.038, 0.095, 0.025, 0.01), NAVY, 0, 0, 0);
    part(remote, ball(0.008), GOLD, 0, 0.023, 0.015, { outline: false });
    part(remote, box(0.016, 0.018, 0.003), MINT, 0, -0.01, 0.015, { outline: false });
    const parkRemote = parked(g, remote, [-0.75, 0.98, 0.05], Math.PI / 2);
    const demo = product(g, WHITE, 1.3); place(demo, [-1.02, 1.07, -0.02]);
    chair(g, [0.67, 0.03, 0.56], Math.PI, '#8d715a');
    const buyer = person(g, [0.67, 0.03, 0.56], Math.PI, '#8d715a');
    part(g, cyl(0.025, 0.035, 0.65, 12), STEEL, 1.12, 0.36, 0.43);
    part(g, cyl(0.18, 0.18, 0.035, 20), WOOD, 1.12, 0.70, 0.43);
    bottle(g, [1.14, 0.72, 0.40]);
    const customerNotes = document(g, [0.67, 0.73, 0.29], '도입 검토', 0.22, 0.20);
    customerNotes.rotation.x = 0.12;
    const jot = pen(g, EDGE);
    const use = group(g); out.inUse = use;
    glowing(use, box(2.35, 0.012, 0.02), MINT, 0, 0.82, -0.64);
    const laser = glowing(use, ball(0.012), RED, -0.56, 1.48, -0.644);
    animate(g, out, { salesPresentProduct: 'slPresent', '*': 'slPresent' }, f => {
      const k = f?.b.key, t = f?.t ?? 0;
      held(remote, f, ['remote', 'intro', 'demo', 'benefit', 'question', 'answer', 'finish']); parkRemote();
      slides.set(!f || f.b.i < 2 ? 0 : k === 'demo' ? 1 : k === 'benefit' ? 2 : k === 'question' ? 3 : 4);
      let l: S.V = [0.84, 0.82, 0.27], r: S.V = [0.50, 0.82, 0.27];
      if (k === 'question') r = [0.39, 1.20 + 0.025 * S.wave(t), 0.25];
      if (k === 'benefit') r = [0.60 + 0.02 * S.wave(t, 1.3), 0.80, 0.26];
      if (k === 'finish') { l = [0.70 + 0.035 * Math.abs(S.wave(t, 2)), 0.98, 0.24]; r = [0.64 - 0.035 * Math.abs(S.wave(t, 2)), 0.98, 0.24]; }
      buyer.update(l, r, k === 'question', f ? 0.04 * S.wave(t, 0.7) : 0, t);
      jot.visible = k === 'benefit'; place(jot, r);
      laser.visible = k === 'demo' || k === 'benefit';
      laser.position.x = -0.56 + (f ? 0.26 * S.wave(t, 0.3) : 0);
      use.visible = !!f;
    });
  },
  /** Business cards are offered and accepted with both hands. A visitor replies across
   * the counter; product leaflets go into the open visit folder after the exchange. */
  salesBrochureCounter(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(1.78, 0.86, 0.61, 0.025), WHITE, 0, 0.45, -0.03);
    part(g, box(1.72, 0.065, 0.55), NAVY, 0, 0.06, -0.03);
    part(g, rbox(1.88, 0.045, 0.70, 0.025), WOOD, 0, 0.91, -0.03);
    part(g, box(1.72, 0.22, 0.015), TEAL, 0, 0.58, 0.283);
    label(g, '다온상사 · 방문 안내', 1.10, 0.14, 0, 0.59, 0.295, TEAL, WHITE);
    label(g, '명함을 나누고, 약속을 기억합니다', 1.02, 0.065, 0, 0.35, 0.29, WHITE, INK);
    for (let i = 0; i < 9; i++) part(g, box(0.018, 0.20, 0.008), GOLD, -0.73 + i * 0.18, 0.79, 0.282, { outline: false });
    const guest = person(g, [-0.10, 0, -0.57], 0, '#997448', false);
    const racks = group(g, 0.38, 0.96, -0.03);
    part(racks, box(0.74, 0.025, 0.26), NAVY, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const x = -0.25 + i * 0.25;
      part(racks, box(0.015, 0.18, 0.25), STEEL, x - 0.11, 0.08, 0);
      part(racks, box(0.21, 0.07, 0.012), TEAL, x, 0.03, 0.13);
      const b = brochure(racks, ['온유 에어', '설치 안내', '관리 서비스'][i], [TEAL, BLUE, GOLD][i]);
      place(b, [x, 0.07, 0]); b.rotation.x = 0.55;
      label(racks, ['제품', '설치', '지원'][i], 0.18, 0.04, x, 0.025, 0.139, TEAL, WHITE);
    }
    const business = card(g); const received = card(g, '새봄유통', EDGE);
    const restBusiness = card(g); place(restBusiness, [-0.64, 0.95, 0.05]);
    const restReceived = card(g, '새봄유통', EDGE); place(restReceived, [0.28, 0.95, -0.20]);
    part(g, rbox(0.19, 0.025, 0.12, 0.01), NAVY, -0.64, 0.936, 0.05);
    const leaf = brochure(g); const parkLeaf = parked(g, leaf, [0.10, 1.05, 0.06]);
    const folder = group(g, -0.31, 0.947, 0.18);
    part(folder, box(0.38, 0.018, 0.27), TEAL, 0, 0, 0);
    flat(folder, '방문 자료', 0.24, 0.06, [0, 0.012, -0.06], TEAL, WHITE);
    const folderCover = group(folder, -0.19, 0.012, 0);
    part(folderCover, box(0.38, 0.008, 0.27), MINT, 0.19, 0, 0);
    const packedLeaf = brochure(folder); place(packedLeaf, [0.04, 0.021, 0]);
    const visitorLog = document(g, [-0.62, 0.94, -0.18], '방문 일정', 0.23, 0.18);
    visitorLog.rotation.y = 0.1;
    bottle(g, [0.78, 0.94, 0.12]);
    const status = screen(g, [-0.65, 1.19, -0.21], 0.31, 0.20, '고객 방문', ['14:00 새봄유통', '명함 확인 · 담당자 등록', '자료 전달 · 후속 일정 예약']);
    out.screen = status.mesh;
    part(g, box(0.025, 0.22, 0.025), STEEL, -0.65, 1.05, -0.23);
    part(g, rbox(0.34, 0.23, 0.02, 0.012), NAVY, -0.65, 1.19, -0.23);
    const use = group(g); out.inUse = use;
    glowing(use, box(1.68, 0.012, 0.01), GOLD, 0, 0.89, 0.325);
    animate(g, out, { salesPrepareVisit: 'slVisit', '*': 'slVisit' }, f => {
      const k = f?.b.key, t = f?.t ?? 0;
      business.visible = k === 'give'; received.visible = k === 'receive' || k === 'read';
      if (f && business.visible) place(business, middle(f));
      if (f && received.visible) place(received, middle(f));
      restBusiness.visible = !business.visible;
      restReceived.visible = !received.visible;
      held(leaf, f, ['brochure', 'pack']); parkLeaf();
      packedLeaf.visible = !!f && f.b.i >= 6;
      folderCover.rotation.z = !f ? 0 : k === 'confirm' ? -Math.PI * (1 - S.smooth(f.b.u)) : -Math.PI;
      let l: S.V = [0.10, 1.01, -0.22], r: S.V = [0.45, 1.01, -0.22];
      if (k === 'give' || k === 'receive') { l = [-0.31, 1.02, -0.08]; r = [-0.15, 1.02, -0.08]; }
      if (k === 'read') r = [0.43, 1.21, -0.21];
      if (k === 'confirm') r = [0.36, 1.24 + 0.02 * S.wave(t), -0.18];
      guest.update(l, r, k === 'read' || k === 'confirm', k === 'greet' ? 0.20 * Math.sin(f!.b.u * Math.PI) : 0.03, t);
      status.set(!f || f.b.i < 2 ? 0 : f.b.i < 5 ? 1 : 2);
      use.visible = !!f;
    });
  },

  /** Daily stand-up: yesterday's result, the movable visit card, a drawn route and a
   * colleague's reply. A second colleague is not hidden inside the board's footprint. */
  salesHuddleBoard(g, _W, _D, _c, _def, _ctx, out) {
    for (const x of [-0.82, 0.45]) {
      part(g, box(0.04, 1.84, 0.04), STEEL, x, 0.96, -0.20);
      part(g, box(0.13, 0.035, 0.53), NAVY, x, 0.055, -0.17);
      caster(g, x, -0.37); caster(g, x, 0.06);
    }
    part(g, rbox(1.38, 1.18, 0.065, 0.02), TEAL, -0.18, 1.34, -0.20);
    part(g, box(1.28, 1.07, 0.012), PAPER, -0.18, 1.34, -0.16);
    screws(g, 1.22, 0.95, 1.34, -0.145);
    label(g, '09:00  아침 영업 회의', 1.17, 0.13, -0.18, 1.79, -0.148, TEAL, WHITE);
    ['어제', '오늘', '지원 요청'].forEach((s, i) => {
      const x = -0.58 + i * 0.40;
      label(g, s, 0.34, 0.07, x, 1.60, -0.146, [BLUE, GOLD, MINT][i], NAVY);
      part(g, box(0.002, 0.40, 0.005), STEEL, x + 0.19, 1.35, -0.145, { outline: false });
      label(g, ['상담 12건', '방문 3곳', '샘플 2세트'][i], 0.32, 0.07, x, 1.26, -0.14, WHITE, INK);
    });
    const cardAtRest = label(g, '새봄 14:00', 0.28, 0.085, -0.35, 1.43, -0.135, '#f0d185', NAVY);
    const moving = label(g, '새봄 14:00', 0.28, 0.085, -0.35, 1.43, -0.07, '#f0d185', NAVY);
    const assigned = label(g, '차은비 · 방문', 0.30, 0.085, 0.21, 1.43, -0.135, MINT, NAVY);
    label(g, '오전: 한결 → 오후: 새봄', 1.10, 0.07, -0.18, 1.03, -0.143, PAPER, INK);
    const routes = Array.from({ length: 5 }, (_, i) => part(g, box(0.09, 0.008, 0.004), BLUE,
      -0.36 + i * 0.10, 1.14 + 0.025 * (i % 2), -0.14, { rz: i % 2 ? -0.3 : 0.3, outline: false }));
    for (const x of [-0.40, 0.16]) part(g, ball(0.014), RED, x, 1.14, -0.135, { outline: false });
    part(g, box(1.28, 0.03, 0.15), STEEL, -0.18, 0.79, -0.10);
    for (let i = 0; i < 3; i++) part(g, cyl(0.009, 0.009, 0.13, 8), [BLUE, RED, DARK][i], -0.60 + i * 0.13, 0.815, -0.08, { rz: Math.PI / 2 });
    part(g, rbox(0.10, 0.025, 0.045, 0.006), DARK, 0.24, 0.818, -0.08);
    const colleague = person(g, [0.62, 0, 0.62], -2.5, '#747e9a', false);
    const notepad = document(g, [0.50, 1.02, 0.44], '오늘 할 일', 0.22, 0.18);
    const handPen = pen(g, BLUE); const parkedPen = parked(g, handPen, [-0.60, 0.82, -0.08], Math.PI / 2);
    const clipboard = document(g, [0, 0, 0], '아침 점검', 0.22, 0.19);
    const restClipboard = parked(g, clipboard, [-0.65, 0.82, -0.08]);
    const use = group(g); out.inUse = use;
    glowing(use, box(1.18, 0.01, 0.015), '#f0d89b', -0.18, 1.94, -0.12);
    animate(g, out, { salesMorningHuddle: 'slHuddle', '*': 'slHuddle' }, f => {
      const k = f?.b.key, t = f?.t ?? 0;
      moving.visible = k === 'move';
      if (moving.visible && f) moving.position.set(...S.add(f.h.r, 0, 0, -0.012));
      cardAtRest.visible = !f || f.b.i < 2;
      assigned.visible = !!f && f.b.i >= 3;
      routes.forEach((r, i) => { r.visible = !!f && (f.b.i > 3 || k === 'route' && f.b.u > i / 5); });
      held(handPen, f, ['roll', 'route']); parkedPen();
      clipboard.visible = !!f && k !== 'cheer';
      if (clipboard.visible && f) place(clipboard, S.add(f.h.l, 0.035, -0.025)); restClipboard();
      let l: S.V = [0.58, 1.04, 0.40], r: S.V = [0.42, 1.08, 0.52];
      if (k === 'listen') r = [0.46, 1.33 + 0.025 * S.wave(t), 0.50];
      if (k === 'assign') r = [0.46, 1.13, 0.48];
      if (k === 'cheer') r = [0.40, 1.58, 0.56];
      colleague.update(l, r, k === 'listen', f ? 0.04 * S.wave(t, 0.7) : 0, t);
      notepad.visible = k !== 'cheer';
      use.visible = !!f;
    });
  },

  /**
   * The sales team's company car (영업용 회사 차, 2026-11-05, the layout audit: sales visits are by car), parked out front in a bay of
   * its own: a dark grey saloon, its glass tinted, the firm's small name on the front doors, the plates; the bay's lines on the
   * paving and '영업 차량' painted in it.
   */
  salesCompanyCar(g, W) {
    const L = Math.min(3.2, W + 1.1);
    const bw = 1.24;
    const BODY = '#4a535b';
    const GL = '#24323d';
    part(g, box(L + 0.5, 0.012, 1.6), '#b9bcbf', 0, 0.006, 0, { outline: false });
    for (const s of [-1, 1]) part(g, box(0.06, 0.004, 1.5), '#ffffff', s * (L / 2 + 0.2), 0.014, 0, { outline: false });
    flat(g, '영업 차량', 0.8, 0.22, [0, 0.016, 0.69], '#b9bcbf', '#ffffff');
    part(g, rbox(L, 0.42, bw, 0.14), BODY, 0, 0.5, 0);
    // The cabin, its windscreen and rear window raked between the bonnet, the roof and the boot.
    part(g, rbox(1.4, 0.34, bw - 0.12, 0.1), BODY, -0.15, 0.87, 0);
    part(g, box(0.05, 0.46, bw - 0.16), GL, 0.74, 0.86, 0, { rz: 0.95 });
    part(g, box(0.05, 0.42, bw - 0.16), GL, -1.04, 0.86, 0, { rz: -0.85 });
    for (const s of [-1, 1]) {
      part(g, box(0.58, 0.22, 0.006), GL, 0.18, 0.88, s * (bw / 2 - 0.055), { outline: false });
      part(g, box(0.58, 0.22, 0.006), GL, -0.5, 0.88, s * (bw / 2 - 0.055), { outline: false });
      part(g, box(0.008, 0.38, 0.008), '#30373d', -0.15, 0.52, s * (bw / 2 + 0.002), { outline: false });
      label(g, '한결산업', 0.34, 0.07, 0.22, 0.55, s * (bw / 2 + 0.004), BODY, '#e0e0e0', s > 0 ? 0 : Math.PI);
      for (const x of [L / 2 - 0.62, -L / 2 + 0.62]) {
        part(g, cyl(0.31, 0.31, 0.2, 18), '#1d1f21', x, 0.31, s * (bw / 2 - 0.08), { rx: Math.PI / 2 });
        part(g, cyl(0.18, 0.18, 0.205, 12), '#b0b8bf', x, 0.31, s * (bw / 2 - 0.08), { rx: Math.PI / 2, outline: false });
      }
      part(g, rbox(0.04, 0.08, 0.22, 0.02), '#fff8e1', L / 2 - 0.01, 0.6, s * 0.42, { outline: false });
      part(g, rbox(0.04, 0.08, 0.24, 0.02), '#e53935', -L / 2 + 0.01, 0.62, s * 0.42, { outline: false });
      part(g, rbox(0.08, 0.06, 0.12, 0.02), BODY, L * 0.12, 0.84, s * (bw / 2 + 0.05));
    }
    part(g, rbox(0.06, 0.16, bw - 0.1, 0.03), '#2b3136', L / 2 - 0.02, 0.36, 0);
    part(g, rbox(0.06, 0.16, bw - 0.1, 0.03), '#2b3136', -L / 2 + 0.02, 0.36, 0);
    label(g, '12가 3456', 0.4, 0.1, L / 2 + 0.015, 0.4, 0, '#ffffff', '#111111', Math.PI / 2);
    label(g, '12가 3456', 0.4, 0.1, -L / 2 - 0.015, 0.4, 0, '#ffffff', '#111111', -Math.PI / 2);
  },
};
