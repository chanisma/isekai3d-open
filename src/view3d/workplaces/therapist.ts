import * as THREE from 'three';
import { marker, spot, type Builder, type Built } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { glowing, label, painted, picture, ring, text } from './doctor';
import * as T from './therapistMotion';
import { pavementSign } from './dentist';

/** A quiet Korean counselling centre: pale oak, washable sage upholstery,
 * private records and warm task lighting. '마음숲' is a fictional stationery
 * mark, not a replacement for the workplace's 심리 상담 센터 name. */
const OAK = '#c8a47b';
const EDGE = '#a17d57';
const SAGE = '#8ca89a';
const DEEP = '#47675f';
const CREAM = '#f1e8d8';
const WHITE = '#fffaf1';
const INK = '#384b50';
const BLUE = '#7fa5b5';
const CORAL = '#c98d7c';
const GOLD = '#dab66f';
const METAL = '#a5b4b2';
const SKIN = '#e5bd9e';
const UP = new THREE.Vector3(0, 1, 0);

function group(p: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  p.add(g);
  return g;
}
function place(o: THREE.Object3D, p: T.V) { o.position.set(...p); }
function flat(g: THREE.Object3D, s: string, w: number, d: number, p: T.V, bg = WHITE, fg = INK) {
  const m = label(g, s, w, d, ...p, bg, fg);
  m.rotation.x = -Math.PI / 2;
  return m;
}
function rod(g: THREE.Object3D, color: string, radius = 0.022) {
  const mesh = part(g, cyl(radius, radius, 1, 10), color, 0, 0, 0, { outline: false });
  return (a: T.V, b: T.V) => {
    const aa = T.v(a), bb = T.v(b), d = bb.clone().sub(aa);
    mesh.position.copy(aa.add(bb).multiplyScalar(0.5));
    mesh.scale.y = Math.max(0.001, d.length());
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
function wood(g: THREE.Object3D, w: number, d: number, y: number, x = 0, z = 0) {
  const top = part(g, rbox(w, 0.045, d, 0.016), OAK, x, y - 0.0225, z);
  for (let i = 0; i < 5; i++) {
    part(g, box(w - 0.06, 0.001, 0.002), '#b38e65', x, y + 0.001,
      z - d * 0.36 + i * d * 0.18, { outline: false });
  }
  return top;
}
function table(g: THREE.Object3D, w = 0.94, d = 0.72, h = 0.77) {
  wood(g, w, d, h);
  for (const x of [-w / 2 + 0.055, w / 2 - 0.055]) {
    for (const z of [-d / 2 + 0.055, d / 2 - 0.055]) {
      part(g, rbox(0.045, h - 0.045, 0.045, 0.008), EDGE, x, (h - 0.045) / 2, z);
      part(g, cyl(0.025, 0.025, 0.018, 10), INK, x, 0.009, z);
    }
  }
  part(g, box(w - 0.1, 0.09, 0.025), OAK, 0, h - 0.11, -d / 2 + 0.045);
}
function drawer(g: THREE.Object3D, p: T.V, title: string, w = 0.25) {
  const root = group(g, ...p);
  part(root, rbox(w, 0.13, 0.31, 0.012), SAGE, 0, 0, 0);
  part(root, box(w - 0.02, 0.105, 0.015), '#a9bdb0', 0, 0, 0.16);
  part(root, rbox(0.09, 0.015, 0.022, 0.006), METAL, 0, 0.018, 0.177);
  label(root, title, w - 0.04, 0.032, 0, -0.029, 0.17, CREAM, INK);
  part(root, cyl(0.008, 0.008, 0.01, 10), INK, w / 2 - 0.035, 0.018, 0.18, { rx: Math.PI / 2 });
  return root;
}

/** Seat top is exact: 0.46 m, or 0.42 at the child-height sand table.
 * Open front rails leave both the dweller's shins and the drawn clients clear. */
function chair(g: THREE.Object3D, p: T.V, yaw = Math.PI, color = SAGE, arms = false) {
  const root = group(g, ...p, yaw);
  const h = p[1] || 0.46;
  root.position.y = 0;
  for (const x of [-0.18, 0.18]) for (const z of [-0.17, 0.17]) {
    part(root, cyl(0.023, 0.028, h - 0.07, 10), EDGE, x, (h - 0.07) / 2, z);
    part(root, cyl(0.026, 0.026, 0.015, 10), INK, x, 0.008, z, { outline: false });
  }
  part(root, rbox(0.49, 0.085, 0.48, 0.045), color, 0, h - 0.043, 0);
  part(root, rbox(0.46, 0.36, 0.075, 0.04), color, 0, h + 0.16, -0.22, { rx: -0.08 });
  part(root, rbox(0.43, 0.012, 0.42, 0.035), '#b6c6b7', 0, h - 0.006, 0, { outline: false });
  for (const x of [-0.18, 0.18]) part(root, box(0.025, 0.28, 0.025), EDGE, x, h - 0.03, -0.225);
  if (arms) for (const x of [-0.27, 0.27]) {
    part(root, rbox(0.095, 0.085, 0.47, 0.035), color, x, h + 0.16, 0);
    part(root, box(0.035, 0.22, 0.035), EDGE, x, h + 0.035, 0.13);
    part(root, box(0.035, 0.22, 0.035), EDGE, x, h + 0.035, -0.15);
  }
  for (const x of [-0.13, 0.13]) {
    part(root, ball(0.011), DEEP, x, h + 0.19, -0.178, { outline: false });
  }
  return root;
}
function rug(g: THREE.Object3D, w: number, d: number) {
  part(g, rbox(w, 0.012, d, 0.09), '#dcd7bd', 0, 0.009, 0);
  part(g, rbox(w - 0.1, 0.004, d - 0.1, 0.08), '#e9e4d2', 0, 0.017, 0, { outline: false });
  for (let i = 0; i < Math.floor(w / 0.12); i++) {
    const x = -w / 2 + 0.08 + i * 0.12;
    for (const s of [-1, 1]) part(g, box(0.014, 0.003, 0.06), CREAM, x, 0.01, s * d / 2, { outline: false });
  }
}
function tissueBox(g: THREE.Object3D, p: T.V) {
  const root = group(g, ...p);
  part(root, rbox(0.19, 0.09, 0.12, 0.015), CORAL, 0, 0, 0);
  part(root, rbox(0.1, 0.004, 0.025, 0.01), INK, 0, 0.046, 0, { outline: false });
  part(root, box(0.065, 0.065, 0.004), WHITE, 0, 0.073, 0, { rz: 0.14, outline: false });
  label(root, '편히 쓰세요', 0.15, 0.027, 0, 0, 0.063, CORAL, WHITE);
  return root;
}
function water(g: THREE.Object3D, p: T.V) {
  const root = group(g, ...p);
  part(root, cyl(0.036, 0.03, 0.11, 16), '#d1e2dc', 0, 0.055, 0);
  part(root, cyl(0.029, 0.029, 0.003, 16), '#91bec3', 0, 0.082, 0, { outline: false });
  part(root, ring(0.032, 0.003), WHITE, 0, 0.111, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.048, 0.048, 0.006, 16), CREAM, 0, 0.003, 0);
  return root;
}
function plant(g: THREE.Object3D, p: T.V, scale = 1) {
  const root = group(g, ...p); root.scale.setScalar(scale);
  part(root, cyl(0.065, 0.045, 0.1, 16), CREAM, 0, 0.05, 0);
  part(root, cyl(0.056, 0.056, 0.005, 14), '#715a43', 0, 0.099, 0);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    const x = Math.cos(a) * 0.045, z = Math.sin(a) * 0.045;
    rod(root, DEEP, 0.003)([0, 0.1, 0], [x, 0.17 + i % 3 * 0.03, z]);
    part(root, ball(0.035), i % 2 ? SAGE : DEEP, x, 0.18 + i % 3 * 0.03, z,
      { rz: a, outline: false }).scale.set(0.6, 1.4, 0.35);
  }
}
function lamp(g: THREE.Object3D, out: Built, p: T.V) {
  const root = group(g, ...p);
  part(root, cyl(0.065, 0.07, 0.018, 18), DEEP, 0, 0.009, 0);
  part(root, cyl(0.009, 0.009, 0.3, 10), METAL, 0, 0.16, 0);
  part(root, cyl(0.065, 0.09, 0.12, 18), CREAM, 0, 0.31, 0);
  const lit = group(root);
  glowing(lit, cyl(0.075, 0.075, 0.005, 18), '#ffe6a3', 0, 0.253, 0);
  out.inUse = lit;
}
function page(g: THREE.Object3D, p: T.V, title: string, w = 0.28, d = 0.24) {
  const root = group(g, ...p);
  part(root, rbox(w + 0.018, 0.012, d + 0.018, 0.007), DEEP, 0, 0, 0);
  part(root, box(w, 0.003, d), WHITE, 0, 0.008, 0);
  flat(root, title, w - 0.025, 0.035, [0, 0.011, -d / 2 + 0.03]);
  part(root, box(0.065, 0.012, 0.018), METAL, 0, 0.015, -d / 2 + 0.006);
  for (let i = 0; i < 5; i++) {
    part(root, box(w - 0.045, 0.001, 0.002), '#c7ccc2', 0, 0.012, -0.055 + i * 0.033, { outline: false });
    part(root, box(0.01, 0.001, 0.01), SAGE, -w / 2 + 0.025, 0.012, -0.064 + i * 0.033, { outline: false });
  }
  return root;
}
function pen(g: THREE.Object3D, color = DEEP) {
  const root = group(g);
  part(root, cyl(0.005, 0.005, 0.13, 8), color, 0, 0.01, 0, { rz: -0.2, outline: false });
  part(root, cyl(0, 0.005, 0.02, 8), INK, -0.014, -0.063, 0, { rz: Math.PI - 0.2, outline: false });
  part(root, box(0.003, 0.035, 0.003), GOLD, 0.011, 0.04, 0.005, { outline: false });
  return root;
}
function ink(g: THREE.Object3D, p: T.V, n = 6, color = BLUE) {
  return Array.from({ length: n }, (_, i) => part(g, box(0.055 + i % 2 * 0.025, 0.001, 0.004), color,
    p[0] + i % 2 * 0.09, p[1], p[2] + Math.floor(i / 2) * 0.035, { ry: -0.06, outline: false }));
}
function folder(g: THREE.Object3D, p: T.V, title: string, color = CORAL) {
  const root = group(g, ...p);
  part(root, box(0.25, 0.018, 0.21), color, 0, 0, 0);
  part(root, box(0.075, 0.019, 0.025), color, -0.075, 0, -0.115);
  flat(root, title, 0.2, 0.05, [0, 0.011, -0.03], color, WHITE);
  part(root, box(0.22, 0.007, 0.18), WHITE, 0, 0.003, 0.005);
  return root;
}

/** Texture frames are cached, never allocated in animate. A monitor has a dark
 * privacy frame at rest, and no readable personal information on its back. */
function display(g: THREE.Object3D, titles: string[], p: T.V, w: number, h: number, mode = 'list') {
  const maps = titles.map((title, k) => painted(`th:${mode}:${title}`, 512, 320, c => {
    c.fillStyle = k === 0 ? '#314b47' : '#edf1e7'; c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#527d70'; c.fillRect(0, 0, 512, 62);
    text(c, title, 24, 40, 28, '#ffffff');
    if (k === 0) {
      text(c, '마음숲  ·  비공개', 256, 172, 28, '#c9ddd0', 'center');
      text(c, '상담 준비', 256, 225, 22, '#9fb7ad', 'center');
      return;
    }
    if (mode === 'video') {
      const count = title.includes('회의') ? 3 : 1;
      for (let j = 0; j < count; j++) {
        const x = count === 1 ? 180 : 25 + j * 163;
        c.fillStyle = ['#bcd4c4', '#d8c9b4', '#c1d4dd'][j]; c.fillRect(x, 79, 145, 160);
        c.fillStyle = '#596e78'; c.beginPath(); c.ellipse(x + 72, 215, 47, 49, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e2b99b'; c.beginPath(); c.arc(x + 72, 142, 30, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#4d4540'; c.beginPath(); c.arc(x + 72, 130, 31, Math.PI, 2 * Math.PI); c.fill();
        c.fillStyle = '#354347'; c.fillRect(x + 58, 141, 5, 4); c.fillRect(x + 82, 141, 5, 4);
        c.fillRect(x + 67, 159, 12, title.includes('답변') || title.includes('발언') ? 7 : 2);
        c.fillStyle = '#e2b99b';
        c.beginPath(); c.ellipse(x + 116, title.includes('답변') ? 180 : 217, 10, 17, -0.3, 0, 2 * Math.PI); c.fill();
      }
      text(c, title.includes('회의') ? '동료 1       동료 2       진행자' : '수퍼바이저  ·  연결됨', 256, 282, 22, '#47675f', 'center');
    } else if (mode === 'chart') {
      c.strokeStyle = '#b8c6bd'; c.lineWidth = 2;
      for (let row = 0; row < 4; row++) { c.beginPath(); c.moveTo(50, 110 + row * 40); c.lineTo(465, 110 + row * 40); c.stroke(); }
      for (let j = 0; j < 5; j++) {
        const height = 45 + ((j * 29 + k * 19) % 105);
        c.fillStyle = j % 2 ? '#91b7ad' : '#cfaa77'; c.fillRect(68 + j * 77, 247 - height, 37, height);
      }
      text(c, '예시 자료  ·  상담 참고', 256, 291, 23, '#47675f', 'center');
    } else {
      for (let i = 0; i < 4; i++) {
        c.fillStyle = '#d5e3d7'; c.fillRect(22, 84 + i * 47, 465, 35);
        text(c, ['동의 확인', '현재 상태', '함께 정한 목표', '다음 만남'][i], 42, 109 + i * 47, 21, '#47675f');
        if (i < k) text(c, '✓', 450, 110 + i * 47, 23, '#527d70', 'center');
      }
      text(c, '개인정보 보호  ·  예시 화면', 256, 300, 19, '#66756b', 'center');
    }
  }));
  const mesh = picture(g, maps[0], w, h, ...p);
  const material = new THREE.MeshBasicMaterial({ map: maps[0] });
  mesh.material = material; mesh.userData.ownMaterial = true;
  let last = -1;
  return { mesh, set(index: number) {
    const i = Math.max(0, Math.min(maps.length - 1, index));
    if (i !== last) { material.map = maps[i]; material.needsUpdate = true; last = i; }
  } };
}
function keyboard(g: THREE.Object3D, p: T.V, w = 0.32) {
  const root = group(g, ...p);
  part(root, rbox(w, 0.016, 0.105, 0.01), '#e1e2d8', 0, 0, 0);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 10; col++) {
    part(root, box(w * 0.072, 0.006, 0.019), WHITE,
      -w * 0.43 + col * w * 0.095, 0.011, -0.033 + row * 0.028, { outline: false });
  }
  return root;
}
function clock(g: THREE.Object3D, p: T.V, yaw = 0) {
  const root = group(g, ...p, yaw);
  part(root, cyl(0.09, 0.09, 0.025, 24), OAK, 0, 0, 0, { rx: Math.PI / 2 });
  part(root, cyl(0.078, 0.078, 0.003, 24), WHITE, 0, 0, 0.015, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    part(root, box(0.003, 0.01, 0.002), INK, Math.sin(a) * 0.063, Math.cos(a) * 0.063, 0.018, { rz: -a, outline: false });
  }
  part(root, box(0.005, 0.05, 0.003), INK, 0.012, 0.018, 0.021, { rz: -0.6, outline: false });
  part(root, box(0.004, 0.065, 0.003), INK, -0.027, 0.004, 0.022, { rz: 1.4, outline: false });
  part(root, ball(0.006), CORAL, 0, 0, 0.023, { outline: false });
}

/** Appointment pages are physical stationery. The movable marker goes on a
 * day square only after the plan's scheduling beat, not at session start. */
function calendar(g: THREE.Object3D, p: T.V) {
  const root = group(g, ...p);
  part(root, box(0.2, 0.024, 0.1), EDGE, 0, 0.012, 0);
  part(root, box(0.18, 0.15, 0.006), WHITE, 0, 0.1, 0, { rx: -0.12 });
  label(root, '다음 만남', 0.16, 0.03, 0, 0.158, 0.013, SAGE, WHITE);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      part(root, box(0.025, 0.022, 0.002), row === 1 && col === 2 ? '#c6d9c9' : CREAM,
        -0.065 + col * 0.032, 0.119 - row * 0.028, 0.014, { outline: false });
    }
  }
  for (const x of [-0.045, 0.045]) {
    part(root, ring(0.012, 0.002), METAL, x, 0.177, 0, { ry: Math.PI / 2, outline: false });
  }
  const mark = part(root, ball(0.008), CORAL, 0, 0.091, 0.02, { outline: false });
  return { root, mark };
}

/** A quiet waiting room needs somewhere for water, returned worksheets and
 * used tissues. These bins and trays stay beneath surfaces, away from knees. */
function wasteBasket(g: THREE.Object3D, p: T.V) {
  const root = group(g, ...p);
  part(root, cyl(0.105, 0.08, 0.23, 18), '#acb7a9', 0, 0.115, 0);
  part(root, cyl(0.094, 0.094, 0.004, 18), '#66796d', 0, 0.228, 0);
  part(root, ring(0.1, 0.008), CREAM, 0, 0.234, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    part(root, box(0.003, 0.19, 0.003), '#86998c', Math.sin(a) * 0.096, 0.125,
      Math.cos(a) * 0.096, { outline: false });
  }
  for (let i = 0; i < 3; i++) {
    part(root, ball(0.027), WHITE, -0.03 + i * 0.03, 0.215, i % 2 * 0.035,
      { outline: false }).scale.set(1.1, 0.65, 0.8);
  }
  return root;
}

function archiveTray(g: THREE.Object3D, p: T.V) {
  const root = group(g, ...p);
  part(root, box(0.22, 0.012, 0.17), SAGE, 0, 0, 0);
  for (const x of [-0.108, 0.108]) part(root, box(0.012, 0.04, 0.17), SAGE, x, 0.02, 0);
  part(root, box(0.22, 0.04, 0.012), SAGE, 0, 0.02, -0.079);
  for (let i = 0; i < 4; i++) {
    part(root, box(0.19, 0.002, 0.14), WHITE, i * 0.002, 0.008 + i * 0.003, 0);
  }
  label(root, '보관 대기', 0.14, 0.028, 0, 0.012, 0.09, SAGE, WHITE);
  return root;
}

/** A snapshot is revealed by the shutter, followed by a small sand scene
 * preview. The photo is an illustration, never a new live camera allocation. */
function sandPhoto(g: THREE.Object3D, p: T.V) {
  const root = group(g, ...p);
  part(root, box(0.16, 0.003, 0.13), WHITE, 0, 0, 0);
  const map = painted('th-sand-photo', 256, 180, c => {
    c.fillStyle = '#80aaba'; c.fillRect(0, 0, 256, 180);
    c.fillStyle = '#e8d4a9'; c.fillRect(12, 12, 232, 156);
    c.fillStyle = '#eee5cd'; c.fillRect(35, 74, 52, 44);
    c.fillStyle = '#b67e70'; c.beginPath();
    c.moveTo(26, 76); c.lineTo(61, 45); c.lineTo(96, 76); c.fill();
    c.fillStyle = '#789a7c'; c.beginPath();
    c.moveTo(180, 28); c.lineTo(145, 109); c.lineTo(215, 109); c.fill();
    c.fillStyle = '#a7875e'; c.fillRect(174, 102, 12, 33);
    c.fillStyle = '#779fb5'; c.fillRect(112, 108, 18, 28);
    c.fillStyle = '#e3bca1'; c.beginPath(); c.arc(121, 100, 12, 0, Math.PI * 2); c.fill();
  });
  picture(root, map, 0.144, 0.1, 0, 0.003, -0.005, WHITE, 0, -Math.PI / 2);
  flat(root, '장면 보관', 0.1, 0.018, [0, 0.003, 0.052]);
  return root;
}

/** A discrete call indicator and advancing log rows make the long listening
 * beats readable without inventing audible dialogue or medical instructions. */
function callLog(g: THREE.Object3D, p: T.V) {
  const root = group(g, ...p);
  part(root, rbox(0.33, 0.11, 0.012, 0.008), INK, 0, 0, 0);
  const bars = Array.from({ length: 14 }, (_, i) => glowing(root,
    box(0.008, 0.05, 0.002), '#b9d6ba', -0.14 + i * 0.021, 0, 0.008));
  return (f: Frame | null) => {
    root.visible = !!f;
    bars.forEach((bar, i) => {
      const speaking = f && ['listen', 'confirm', 'ground'].includes(f.b.key);
      bar.scale.y = speaking ? 0.15 + 0.8 * Math.abs(T.wave(f!.t + i * 0.13, 1.3)) : 0.1;
    });
  };
}

/** Small room details are kept low, so the default game camera can still read
 * the participants' faces and the objects between their hands. */
function personalBelongings(g: THREE.Object3D, p: T.V) {
  const root = group(g, ...p);
  part(root, rbox(0.23, 0.21, 0.1, 0.025), '#9c7c68', 0, 0.13, 0);
  part(root, rbox(0.2, 0.13, 0.012, 0.015), '#b4947a', 0, 0.16, 0.058);
  part(root, box(0.021, 0.025, 0.009), GOLD, 0, 0.145, 0.07);
  part(root, ring(0.065, 0.008, Math.PI), '#7b6456', 0, 0.245, 0);
  for (const x of [-0.085, 0.085]) {
    part(root, box(0.004, 0.14, 0.002), '#c5a48a', x, 0.15, 0.066, { outline: false });
  }
}

/** Drawn session partners occupy their own chairs, never the real waiting
 * client seats. Arm chains are clamped to their reach and solved with elbows. */
function person(g: THREE.Object3D, p: T.V, yaw = 0, shirt = BLUE, child = false) {
  const root = group(g, ...p, yaw);
  const k = child ? 0.8 : 1;
  const seat = p[1]; root.position.y = 0;
  const hip = seat + 0.045, shoulderY = seat + 0.5 * k;
  part(root, rbox(0.29 * k, 0.12, 0.22 * k, 0.045), INK, 0, hip, 0);
  part(root, rbox(0.3 * k, 0.43 * k, 0.19 * k, 0.05), shirt, 0, seat + 0.28 * k, -0.015);
  // Woven cardigan edges, buttons and a shirt collar help these participants
  // read as clothed people from the game camera rather than abstract mannequins.
  for (const s of [-1, 1]) {
    part(root, box(0.025 * k, 0.28 * k, 0.007), CREAM,
      s * 0.036 * k, seat + 0.29 * k, 0.085 * k, { rz: s * 0.06, outline: false });
    part(root, box(0.07 * k, 0.045 * k, 0.009), CREAM,
      s * 0.042 * k, seat + 0.475 * k, 0.075 * k, { rz: s * 0.5, outline: false });
  }
  for (let i = 0; i < 4; i++) {
    part(root, ball(0.007 * k), EDGE, 0, seat + (0.19 + i * 0.065) * k,
      0.089 * k, { outline: false });
  }
  part(root, rbox(0.08 * k, 0.065 * k, 0.01, 0.008), shirt,
    -0.085 * k, seat + 0.23 * k, 0.083 * k, { outline: false });
  part(root, box(0.07 * k, 0.003, 0.004), CREAM,
    -0.085 * k, seat + 0.26 * k, 0.092 * k, { outline: false });
  part(root, cyl(0.042 * k, 0.046 * k, 0.09 * k, 12), SKIN, 0, seat + 0.55 * k, 0);
  const head = group(root, 0, seat + 0.69 * k, 0);
  part(head, ball(0.113 * k), SKIN, 0, 0, 0).scale.set(0.87, 1.05, 0.88);
  part(head, ball(0.116 * k), '#514641', 0, 0.047 * k, -0.022 * k).scale.set(0.92, 0.7, 0.9);
  for (const s of [-1, 1]) {
    part(head, ball(0.022 * k), SKIN, s * 0.099 * k, -0.005, 0);
    part(head, ball(0.007 * k), INK, s * 0.034 * k, 0.008, 0.09 * k, { outline: false });
    part(head, box(0.027 * k, 0.004, 0.003), '#655447', s * 0.034 * k, 0.029, 0.089 * k, { outline: false });
    part(head, ball(0.002), WHITE, s * 0.034 * k - 0.002, 0.011, 0.096 * k, { outline: false });
  }
  if (!child) {
    for (const s of [-1, 1]) {
      part(head, ring(0.025 * k, 0.002), '#6e6861', s * 0.034 * k, 0.008,
        0.098 * k, { outline: false });
    }
    part(head, box(0.02 * k, 0.003, 0.003), '#6e6861', 0, 0.012, 0.099 * k, { outline: false });
  }
  part(head, ball(0.014 * k), SKIN, 0, -0.016, 0.104 * k, { outline: false });
  const mouth = part(head, rbox(0.026 * k, 0.008, 0.003, 0.002), CORAL, 0, -0.049 * k, 0.089 * k, { outline: false });
  for (const s of [-1, 1]) {
    const x = s * 0.085 * k;
    const knee: T.V = [x, seat - 0.035, 0.28 * k];
    rod(root, '#5c6870', 0.06 * k)([x, hip, 0.04], knee);
    rod(root, '#5c6870', 0.043 * k)(knee, [x, 0.08, 0.3 * k]);
    part(root, rbox(0.1 * k, 0.065, 0.18 * k, 0.025), '#655d55', x, 0.045, 0.34 * k);
  }
  const arms = [-1, 1].map(s => {
    const upper = rod(root, shirt, 0.043 * k);
    const fore = rod(root, SKIN, 0.03 * k);
    const palm = part(root, ball(0.039 * k), SKIN, 0, 0, 0);
    const thumb = part(palm, ball(0.015 * k), SKIN, -s * 0.027 * k, 0.003, 0.018, { outline: false });
    thumb.scale.set(0.7, 1.3, 0.8);
    return { s, upper, fore, palm };
  });
  const local = (p: T.V): T.V => {
    const v = T.v(p).sub(T.v([root.position.x, 0, root.position.z])).applyAxisAngle(UP, -yaw);
    return [v.x, v.y, v.z];
  };
  const restL: T.V = [-0.12 * k, seat + 0.12 * k, 0.22 * k];
  const restR: T.V = [0.12 * k, seat + 0.12 * k, 0.22 * k];
  function move(t: number, speaking = false, left?: T.V, right?: T.V, nod = 0.06) {
    head.rotation.x = nod + (speaking ? 0.025 * T.wave(t, 0.7) : 0.012 * T.wave(t, 0.3));
    head.rotation.y = speaking ? 0.025 * T.wave(t, 0.4) : 0;
    mouth.scale.y = speaking ? 1 + 1.3 * Math.abs(T.wave(t, 2.5)) : 1;
    arms.forEach((a, i) => {
      const target = (i ? right : left) ? local((i ? right : left)!) : i ? restR : restL;
      const shoulder = new THREE.Vector3(a.s * 0.17 * k, shoulderY, 0);
      const dir = T.v(target).sub(shoulder);
      const reach = 0.58 * k, len = Math.min(reach, dir.length());
      const end = shoulder.clone().add(dir.normalize().multiplyScalar(len));
      const mid = shoulder.clone().add(end).multiplyScalar(0.5);
      const bend = new THREE.Vector3(a.s * 0.35, -1, 0.2).normalize();
      bend.addScaledVector(dir, -bend.dot(dir)).normalize();
      mid.addScaledVector(bend, Math.sqrt(Math.max(0.001, (reach / 2) ** 2 - (len / 2) ** 2)));
      a.upper(shoulder.toArray() as [number, number, number], mid.toArray() as [number, number, number]);
      a.fore(mid.toArray() as [number, number, number], end.toArray() as [number, number, number]);
      a.palm.position.copy(end);
      a.palm.rotation.z = a.s * (speaking ? 0.2 : 0.05);
    });
  }
  move(0);
  return { root, head, move };
}

interface Frame { m: T.ThMotion; t: number; b: T.Beat; h: T.Hands; height: number }
function animate(g: THREE.Group, out: Built, bindings: Record<string, T.ThMotion>, tick: (f: Frame | null, t: number) => void) {
  const work = marker(g, 0, 0, 0);
  out.work = work;
  out.spots = {};
  const entries = Object.entries(bindings).map(([id, motion]) => {
    const p = T.spotOf(motion);
    const s = spot(g, p[1] > 0 ? 'sit' : 'stand', ...p, Math.PI, p[1]);
    s.motion = motion; s.work = work; out.spots![id] = s;
    return { s, motion };
  });
  out.animate = t => {
    const live = entries.filter(e => Math.abs(t - Number(e.s.at.userData.posedAt ?? -999)) < 0.6)
      .sort((a, b) => Number(b.s.at.userData.posedAt) - Number(a.s.at.userData.posedAt))[0];
    if (!live) { tick(null, t); return; }
    const elapsed = T.thTime(live.motion, t, work.getWorldPosition(new THREE.Vector3()));
    const height = Number(live.s.at.userData.height ?? 1.6);
    tick({ m: live.motion, t: elapsed, b: T.thBeat(live.motion, elapsed), h: T.thHands(live.motion, elapsed, height), height }, t);
  };
  tick(null, 0);
}
function held(o: THREE.Object3D, f: Frame | null, keys: string[], rest: T.V, hand: 'l' | 'r' = 'r') {
  const holding = !!f && keys.includes(f.b.key);
  place(o, holding ? f.h[hand] : rest);
  return holding;
}
function middle(f: Frame): T.V { return T.between(f.h.l, f.h.r, 0.5); }

/** Miniature library: recognisable houses, trees, people, bridge and animals.
 * Its shallow cubbies leave the working surface fully visible from the camera. */
function miniature(g: THREE.Object3D, kind: number, color = CORAL) {
  const root = group(g);
  if (kind % 5 === 0) {
    part(root, box(0.085, 0.07, 0.075), CREAM, 0, 0.035, 0);
    part(root, cyl(0, 0.075, 0.055, 4), color, 0, 0.096, 0, { ry: Math.PI / 4 });
    part(root, box(0.019, 0.039, 0.003), EDGE, 0, 0.021, 0.04);
    for (const x of [-0.027, 0.027]) part(root, box(0.013, 0.018, 0.003), BLUE, x, 0.045, 0.04, { outline: false });
  } else if (kind % 5 === 1) {
    part(root, cyl(0.009, 0.013, 0.07, 8), EDGE, 0, 0.035, 0);
    for (let i = 0; i < 3; i++) part(root, cyl(0, 0.05 - i * 0.008, 0.065, 9), SAGE, 0, 0.075 + i * 0.028, 0);
  } else if (kind % 5 === 2) {
    part(root, cyl(0.02, 0.027, 0.055, 10), color, 0, 0.039, 0);
    part(root, ball(0.024), SKIN, 0, 0.087, 0);
    for (const s of [-1, 1]) {
      part(root, box(0.014, 0.026, 0.019), INK, s * 0.013, 0.012, 0.004);
      part(root, ball(0.012), SKIN, s * 0.027, 0.043, 0);
    }
  } else if (kind % 5 === 3) {
    part(root, rbox(0.13, 0.023, 0.06, 0.01), OAK, 0, 0.045, 0);
    for (const x of [-0.05, 0.05]) part(root, box(0.018, 0.045, 0.055), EDGE, x, 0.022, 0);
    for (const z of [-0.035, 0.035]) part(root, box(0.14, 0.012, 0.012), OAK, 0, 0.075, z);
  } else {
    part(root, ball(0.04), color, 0, 0.045, 0).scale.set(1.2, 0.8, 0.65);
    part(root, ball(0.025), color, 0.04, 0.083, 0);
    part(root, box(0.036, 0.011, 0.025), GOLD, 0.066, 0.078, 0);
    for (const z of [-0.019, 0.019]) part(root, ball(0.004), INK, 0.05, 0.089, z, { outline: false });
  }
  return root;
}

const sandTray: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  table(g, 0.93, 0.76, 0.65);
  chair(g, [0, 0.42, 0.66], Math.PI, SAGE);
  chair(g, [0, 0.42, -0.56], 0, CORAL);
  const client = person(g, [0, 0.42, -0.56], 0, '#d1a272', true);
  const tray = group(g, 0, 0.68, -0.01);
  part(tray, box(0.64, 0.055, 0.48), BLUE, 0, -0.015, 0);
  part(tray, box(0.59, 0.014, 0.43), '#e5d2a5', 0, 0.018, 0);
  for (const x of [-0.32, 0.32]) part(tray, rbox(0.035, 0.075, 0.52, 0.009), OAK, x, 0.01, 0);
  for (const z of [-0.25, 0.25]) part(tray, rbox(0.67, 0.075, 0.035, 0.009), OAK, 0, 0.01, z);
  label(tray, '모래놀이', 0.25, 0.04, 0, 0.005, 0.27, OAK, INK);
  const furrows = Array.from({ length: 7 }, (_, i) => part(tray, box(0.49, 0.002, 0.003), '#cdb78d',
    0, 0.027, -0.16 + i * 0.052, { outline: false }));
  for (let i = 0; i < 24; i++) {
    part(tray, ball(0.006), i % 3 ? '#ead8b0' : '#cbb68c',
      -0.26 + ((i * 37) % 53) / 100, 0.026, -0.18 + ((i * 19) % 37) / 100, { outline: false });
  }
  // Side library rather than an opaque wall between the therapist and child.
  const shelf = group(g, -0.57, 0, -0.06);
  part(shelf, box(0.24, 0.83, 0.035), '#d2b38b', 0, 0.415, -0.19);
  for (const x of [-0.13, 0.13]) part(shelf, box(0.025, 0.86, 0.4), OAK, x, 0.43, 0);
  for (const y of [0.1, 0.36, 0.62, 0.87]) wood(shelf, 0.28, 0.4, y);
  label(shelf, '작은 세상', 0.22, 0.055, 0, 0.82, 0.208, CREAM, DEEP);
  for (let i = 0; i < 6; i++) {
    const m = miniature(shelf, i, [CORAL, SAGE, BLUE][i % 3]);
    place(m, [i % 2 ? 0.065 : -0.065, 0.11 + Math.floor(i / 2) * 0.26, 0.03]);
  }
  const house = miniature(g, 0), tree = miniature(g, 1), figure = miniature(g, 2, BLUE);
  place(house, [-0.16, 0.708, -0.1]);
  place(tree, [0.17, 0.708, -0.11]);
  place(figure, [0.08, 0.708, 0.04]);
  const bridge = miniature(g, 3); place(bridge, [-0.03, 0.708, -0.08]);
  const rake = group(g);
  part(rake, cyl(0.007, 0.007, 0.13, 8), EDGE, 0, 0.005, 0, { outline: false });
  part(rake, box(0.12, 0.015, 0.018), OAK, 0, -0.058, 0);
  for (let i = 0; i < 6; i++) part(rake, box(0.008, 0.026, 0.008), OAK, -0.05 + i * 0.02, -0.075, 0, { outline: false });
  const camera = group(g);
  part(camera, rbox(0.18, 0.09, 0.06, 0.012), INK, 0, 0, 0);
  part(camera, cyl(0.035, 0.038, 0.035, 16), '#57767b', 0.025, 0, -0.042, { rx: Math.PI / 2 });
  part(camera, cyl(0.023, 0.023, 0.004, 16), '#95c3c7', 0.025, 0, -0.062, { rx: Math.PI / 2, outline: false });
  part(camera, box(0.11, 0.055, 0.004), BLUE, 0, 0, 0.032);
  part(camera, cyl(0.009, 0.009, 0.006, 10), CORAL, 0.06, 0.048, 0);
  const flash = glowing(camera, box(0.03, 0.017, 0.004), '#fff8c1', -0.052, 0.025, -0.033);
  const notebook = page(g, T.SAND.page, '관찰 기록', 0.2, 0.17);
  const photo = sandPhoto(g, [-0.39, 0.66, 0.25]);
  wasteBasket(g, [0.53, 0, -0.1]);
  const notes = ink(notebook, [-0.055, 0.014, -0.015], 4);
  const pencil = pen(g);
  const drawing = page(g, [0, 0.745, -0.02], '나의 마음', 0.32, 0.28);
  const art = group(drawing, 0, 0.014, 0.03);
  const artSun = part(art, cyl(0.035, 0.035, 0.001, 16), GOLD, 0.08, 0, -0.045);
  const artHome = part(art, box(0.09, 0.001, 0.075), CORAL, -0.025, 0, 0.025, { outline: false });
  const artRoof = part(art, cyl(0.055, 0.055, 0.001, 3), BLUE, -0.025, 0.001, -0.025, { outline: false });
  const crayon = pen(g, CORAL);
  const crayons = group(g, 0.35, 0.71, -0.11);
  part(crayons, box(0.12, 0.03, 0.16), CREAM, 0, 0, 0);
  for (let i = 0; i < 4; i++) part(crayons, cyl(0.006, 0.006, 0.11, 6), [BLUE, CORAL, GOLD, SAGE][i], -0.04 + i * 0.027, 0.025, 0, { rx: Math.PI / 2, outline: false });
  const status = display(g, ['모래놀이 준비', '선택을 기다려요', '이야기 듣기', '관찰 기록', '장면 보관', '정리 완료'], [0, 0.42, 0.386], 0.41, 0.11);
  out.screen = status.mesh;
  lamp(g, out, [0.39, 0.65, -0.27]);
  animate(g, out, { prepPlayTherapy: 'thSand', therapist_artTherapy: 'thArt' }, f => {
    const key = f?.b.key ?? '', i = f?.b.i ?? -1, u = f?.b.u ?? 0;
    const artSession = f?.m === 'thArt';
    drawing.visible = !!artSession;
    [house, tree, bridge, figure].forEach(o => o.visible = !artSession);
    artSun.visible = i >= 2 && (key !== 'draw' || u > 0.15);
    artHome.visible = i >= 2 && (key !== 'draw' || u > 0.4);
    artRoof.visible = i >= 2 && (key !== 'draw' || u > 0.65);
    place(drawing, [0, 0.745, -0.02]); drawing.rotation.x = 0;
    if (artSession && key === 'show') { place(drawing, middle(f!)); drawing.rotation.x = 0.7; }
    let childHand: T.V | undefined;
    if (!artSession) {
      place(figure, [0.08, 0.708, -0.12]);
      if (key === 'place') {
        const p = T.sandChildHand(key, u, f!.t)!;
        place(figure, T.add(p, 0, -0.04)); childHand = p;
      }
      if (key === 'clear') place(figure, T.add(f!.h.r, 0, -0.035));
      if (key === 'smooth') { figure.visible = false; house.visible = false; tree.visible = false; bridge.visible = false; }
    }
    if (artSession && key === 'draw') childHand = T.sandChildHand(key, u, f!.t);
    crayon.visible = !!childHand && !!artSession;
    if (childHand) place(crayon, childHand);
    client.move(f?.t ?? 0, key === 'observe' || key === 'reflect', undefined, childHand, key === 'draw' ? 0.2 : 0.06);
    held(pencil, f, ['note'], [0.39, 0.74, 0.25]);
    pencil.rotation.z = key === 'note' ? 0 : Math.PI / 2;
    held(rake, f, ['smooth'], T.SAND.rake);
    rake.rotation.z = key === 'smooth' ? 0 : Math.PI / 2;
    place(camera, key === 'photo' ? middle(f!) : T.SAND.camera);
    camera.rotation.x = key === 'photo' ? -0.55 : 0;
    flash.visible = key === 'photo' && u > 0.5 && u < 0.62;
    photo.visible = !artSession && (i > 4 || key === 'photo' && u > 0.62);
    notes.forEach((m, j) => m.visible = i > 3 || key === 'note' && j / notes.length < u);
    furrows.forEach((m, j) => m.visible = !f || key === 'smooth' && j / furrows.length < u);
    status.set(!f ? 0 : key === 'note' ? 3 : key === 'photo' ? 4 : key === 'smooth' || key === 'close' ? 5 : i < 2 ? 1 : 2);
  });
};

/** One private workstation supports six genuinely different workflows. The
 * conference and supervision partners appear on the camera screen and answer
 * in their own beats; physical visitors keep their existing waiting seats. */
const notesDesk: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  table(g);
  chair(g, [0, 0.46, 0.54]);
  drawer(g, [-0.32, 0.64, -0.15], '잠금 기록');
  drawer(g, [-0.32, 0.49, -0.15], '동의서');
  part(g, box(0.9, 0.27, 0.025), SAGE, 0, 0.58, -0.325);
  part(g, rbox(0.23, 0.018, 0.16, 0.015), INK, 0, 0.784, -0.18);
  part(g, box(0.035, 0.15, 0.025), METAL, 0, 0.86, -0.23);
  part(g, rbox(0.47, 0.31, 0.035, 0.018), INK, 0, 1.06, -0.23);
  const screen = display(g, ['상담 기록', '초안 작성', '기록 검토', '저장 완료', '다음 일정'], [0, 1.06, -0.21], 0.43, 0.265);
  const chart = display(g, ['검사 자료', '응답 확인', '척도 합산', '결과 비교', '해석 기록'], [0, 1.06, -0.208], 0.43, 0.265, 'chart');
  const call = display(g, ['화상 상담', '수퍼비전 연결', '사례 제시', '수퍼바이저 답변', '사례 회의', '회의 발언', '수퍼바이저 경청', '회의 경청'], [0, 1.06, -0.206], 0.43, 0.265, 'video');
  out.screen = screen.mesh;
  part(g, ball(0.009), '#283c3d', 0, 1.225, -0.209, { outline: false });
  const cameraLight = glowing(g, ball(0.004), '#b5e0a6', 0.025, 1.225, -0.208);
  keyboard(g, T.DESK.keys, 0.25);
  const mouse = group(g, ...T.DESK.mouse);
  part(mouse, rbox(0.045, 0.025, 0.065, 0.018), CREAM, 0, 0, 0);
  part(mouse, box(0.002, 0.008, 0.028), INK, 0, 0.015, -0.016, { outline: false });
  const record = page(g, T.DESK.page, '상담 기록 · 비공개', 0.27, 0.22);
  const written = ink(record, [-0.075, 0.014, -0.02], 6);
  const pencil = pen(g);
  const forms = page(g, [0, 0.79, 0.21], '우울 · 불안 척도', 0.27, 0.22);
  const scoreTicks = Array.from({ length: 5 }, (_, i) => part(forms, box(0.013, 0.002, 0.004), CORAL,
    -0.06 + i % 3 * 0.055, 0.014, -0.05 + i * 0.029, { ry: -0.65, outline: false }));
  const binder = group(g);
  part(binder, box(0.31, 0.027, 0.24), CORAL, 0, 0, 0);
  part(binder, box(0.285, 0.016, 0.215), WHITE, 0, 0.018, 0);
  flat(binder, '사례 연구', 0.23, 0.045, [0, 0.028, -0.06], WHITE, DEEP);
  for (let i = 0; i < 6; i++) part(binder, box(0.22, 0.001, 0.002), '#a9b9ae', 0, 0.028, -0.025 + i * 0.025, { outline: false });
  const leaf = group(binder, -0.14, 0.03, 0);
  part(leaf, box(0.28, 0.002, 0.21), WHITE, 0.14, 0, 0);
  flat(leaf, '이해 · 관계 · 변화', 0.23, 0.05, [0.14, 0.003, -0.04]);
  const bookmark = part(binder, box(0.025, 0.002, 0.1), GOLD, 0.07, 0.034, -0.09, { outline: false });
  const calc = group(g, ...T.DESK.calc);
  part(calc, rbox(0.12, 0.02, 0.13, 0.008), DEEP, 0, 0, 0);
  flat(calc, '12', 0.09, 0.028, [0, 0.012, -0.042], '#d3dfbd', INK);
  for (let i = 0; i < 9; i++) part(calc, box(0.024, 0.006, 0.02), CREAM, -0.035 + i % 3 * 0.035, 0.014, -0.008 + Math.floor(i / 3) * 0.027, { outline: false });
  const goalCard = group(g);
  part(goalCard, box(0.1, 0.003, 0.075), GOLD, 0, 0, 0);
  flat(goalCard, '작은 목표', 0.09, 0.035, [0, 0.003, 0], GOLD, INK);
  const filed = folder(g, [-0.3, 0.79, 0.1], '기록 보관', SAGE);
  const fileTab = label(g, '보관함', 0.15, 0.035, -0.32, 0.83, 0.22, CREAM, DEEP);
  for (let i = 0; i < 3; i++) {
    const f = folder(g, [-0.33, 0.81 + i * 0.022, 0.1], ['상담', '동의', '계획'][i], [CORAL, BLUE, SAGE][i]);
    f.scale.setScalar(0.8);
  }
  const holder = group(g, 0.39, 0.78, -0.11);
  part(holder, cyl(0.035, 0.03, 0.075, 12), SAGE, 0, 0.038, 0);
  for (let i = 0; i < 3; i++) part(holder, cyl(0.004, 0.004, 0.12, 6), [BLUE, CORAL, GOLD][i], -0.016 + i * 0.016, 0.09, 0, { rz: (i - 1) * 0.1, outline: false });
  label(g, '상담 기록 · 사용 후 잠금', 0.5, 0.045, 0, 0.67, 0.365, CREAM, DEEP);
  label(g, '마음숲', 0.15, 0.044, 0.31, 0.91, -0.338, CREAM, DEEP, Math.PI);
  lamp(g, out, [-0.4, 0.77, -0.27]);
  plant(g, [0.4, 0.77, -0.28], 0.7);
  const appointment = calendar(g, [0.32, 0.77, -0.22]);
  archiveTray(g, [-0.32, 0.3, -0.14]);
  wasteBasket(g, [0.32, 0, -0.14]);
  animate(g, out, {
    writeNotes: 'thNotes', studyCase: 'thStudy', therapist_supervision: 'thSupervise',
    therapist_psychTest: 'thTest', therapist_caseConference: 'thConference', therapist_ownCaseload: 'thPlan',
  }, f => {
    const key = f?.b.key ?? '', i = f?.b.i ?? -1, u = f?.b.u ?? 0;
    const m = f?.m;
    const video = m === 'thSupervise' || m === 'thConference';
    const study = m === 'thStudy', test = m === 'thTest';
    chart.mesh.visible = test; call.mesh.visible = video; screen.mesh.visible = !video && !test;
    cameraLight.visible = !!video && key !== 'connect' && key !== 'close';
    screen.set(!f ? 0 : key === 'file' ? 3 : key === 'schedule' ? 4 : i >= 4 ? 2 : 1);
    chart.set(!f ? 0 : key === 'sum' ? 2 : i >= 3 ? 3 : 1);
    const answering = f && Math.sin(f.t * 8) > 0;
    call.set(!video || key === 'close' ? 0 : m === 'thConference'
      ? key === 'listen' ? answering ? 5 : 7 : 4
      : key === 'listen' ? answering ? 3 : 6 : key === 'present' ? 2 : 1);
    appointment.root.visible = m === 'thPlan' || !f;
    appointment.mark.visible = m === 'thPlan' && i >= 3;
    appointment.mark.position.x = key === 'schedule' ? -0.064 + Math.min(4, Math.floor(u * 5)) * 0.032 : 0.032;
    record.visible = !study && !test;
    forms.visible = !!test;
    binder.visible = !!study;
    calc.visible = !!test;
    mouse.visible = !test;
    goalCard.visible = m === 'thPlan';
    fileTab.visible = !f || key === 'file';
    filed.visible = !f;
    place(record, T.DESK.page); record.rotation.x = 0;
    place(forms, T.DESK.page); forms.rotation.x = 0;
    place(binder, [0.16, 0.79, 0.23]); binder.rotation.x = 0;
    const reading = ['read', 'review', 'present', 'agenda', 'forms'].includes(key);
    if (f && reading) {
      const paper = study ? binder : test ? forms : record;
      place(paper, middle(f)); paper.rotation.x = 0.55;
    }
    if (f && key === 'turn') { place(binder, [0, 0.96, 0.34]); binder.rotation.x = 0.55; }
    leaf.rotation.z = key === 'turn' ? -Math.PI * T.sm(u) : 0;
    leaf.visible = study && (key === 'read' || key === 'turn');
    bookmark.visible = study && i >= 5;
    if (f && key === 'file') { place(test ? forms : record, T.add(middle(f), 0, -0.01 * u, -0.1 * u)); }
    held(pencil, f, ['write', 'note', 'underline', 'score', 'minutes'], T.DESK.pen);
    pencil.rotation.z = ['write', 'note', 'underline', 'score', 'minutes'].includes(key) ? 0 : Math.PI / 2;
    held(goalCard, f, ['goal'], [0.27, 0.79, 0.25]);
    if (m === 'thPlan' && i > 2) place(goalCard, [0.16, 0.8, 0.23]);
    written.forEach((mark, j) => mark.visible = i > 2 || ['write', 'note', 'minutes'].includes(key) && j / written.length < u);
    scoreTicks.forEach((mark, j) => mark.visible = test && (i > 1 || key === 'score' && j / scoreTicks.length < u));
  });
};

/** The crisis station is a seated, acoustically screened workstation. Nothing
 * broadcasts the caller's details; the screen shows only workflow milestones. */
const crisisPhone: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  table(g, 0.95, 0.73);
  chair(g, [0, 0.46, 0.64], Math.PI, BLUE);
  part(g, rbox(0.94, 0.54, 0.055, 0.025), '#a8b9ac', 0, 1.04, -0.37);
  for (const x of [-0.47, 0.47]) part(g, rbox(0.04, 0.36, 0.35, 0.02), SAGE, x, 0.95, -0.21);
  for (let i = 0; i < 8; i++) part(g, box(0.002, 0.46, 0.002), '#91a697', -0.4 + i * 0.115, 1.05, -0.338, { outline: false });
  label(g, '위기 상담 전화', 0.5, 0.07, 0, 1.23, -0.335, CREAM, DEEP);
  label(g, '통화 중 · 조용히', 0.38, 0.052, 0, 1.1, -0.402, SAGE, WHITE, Math.PI);
  part(g, rbox(0.25, 0.05, 0.19, 0.015), INK, -0.27, 0.8, 0.02);
  part(g, box(0.13, 0.015, 0.045), BLUE, -0.27, 0.833, -0.03);
  for (let i = 0; i < 12; i++) part(g, box(0.026, 0.009, 0.019), CREAM,
    -0.31 + i % 3 * 0.04, 0.834, 0.015 + Math.floor(i / 3) * 0.025, { outline: false });
  const lineLamp = glowing(g, ball(0.007), '#b5e3ac', -0.18, 0.838, -0.045);
  part(g, cyl(0.018, 0.018, 0.14, 12), METAL, -0.28, 0.89, -0.08);
  part(g, rbox(0.11, 0.025, 0.035, 0.01), INK, -0.28, 0.97, -0.08);
  const headset = group(g);
  part(headset, ring(0.108, 0.009, Math.PI), INK, 0.105, 0.012, 0, { rz: 0 });
  part(headset, rbox(0.035, 0.075, 0.065, 0.015), INK, 0, 0, 0);
  part(headset, rbox(0.025, 0.056, 0.055, 0.013), '#73888b', 0.018, 0, 0);
  part(headset, rbox(0.03, 0.065, 0.06, 0.012), INK, 0.21, 0, 0);
  rod(headset, INK, 0.004)([-0.006, -0.014, 0], [0.015, -0.06, -0.105]);
  part(headset, ball(0.012), INK, 0.015, -0.06, -0.105);
  const cable = Array.from({ length: 7 }, () => rod(g, '#5c6c68', 0.003));
  part(g, box(0.025, 0.14, 0.025), METAL, 0.13, 0.87, -0.19);
  part(g, rbox(0.4, 0.27, 0.03, 0.015), INK, 0.13, 1.05, -0.19);
  const screen = display(g, ['전화 대기', '연결 · 경청', '현재 상태 확인', '함께 호흡', '기록 중', '다음 단계 확인', '통화 기록 저장'], [0.13, 1.05, -0.171], 0.365, 0.232);
  out.screen = screen.mesh;
  keyboard(g, T.PHONE.keys, 0.29);
  const script = page(g, T.PHONE.script, '경청 · 확인 · 연결', 0.28, 0.18);
  const scriptTab = group(script, 0.13, 0.015, 0);
  for (let i = 0; i < 3; i++) part(scriptTab, box(0.03, 0.003, 0.035), [SAGE, GOLD, CORAL][i], 0, i * 0.002, -0.05 + i * 0.05, { outline: false });
  const cursor = part(script, box(0.18, 0.002, 0.009), '#e1c789', 0, 0.014, -0.025, { outline: false });
  flat(g, '차분히 · 한 문장씩', 0.25, 0.06, [-0.25, 0.773, 0.27], CREAM, DEEP);
  water(g, [-0.4, 0.77, 0.2]);
  tissueBox(g, [-0.34, 0.82, -0.24]).scale.setScalar(0.7);
  const timer = display(g, ['대기', '통화 연결', '기록 저장'], [-0.26, 1.1, -0.334], 0.2, 0.075);
  const log = callLog(g, [0.13, 0.64, 0.37]);
  wasteBasket(g, [0.32, 0, -0.18]);
  const active = group(g);
  glowing(active, box(0.16, 0.025, 0.008), '#bfe2ac', 0, 1.32, -0.365);
  out.inUse = active;
  animate(g, out, { crisisCall: 'thCrisis' }, f => {
    const key = f?.b.key ?? '', u = f?.b.u ?? 0;
    const worn = !!f && key !== 'answer' && key !== 'close';
    place(headset, worn ? T.ear(f!.height) : key === 'answer' || key === 'close' ? f!.h.l : T.PHONE.dock);
    headset.rotation.y = 0;
    const end = headset.position;
    for (let i = 0; i < cable.length; i++) {
      const point = (a: number): T.V => [-0.28 + (end.x + 0.28) * a,
        0.84 + (end.y - 0.84) * a - 0.15 * Math.sin(a * Math.PI), 0.02 + (end.z - 0.02) * a];
      cable[i](point(i / cable.length), point((i + 1) / cable.length));
    }
    lineLamp.visible = !!f && (key !== 'answer' || Math.floor(u * 8) % 2 === 0);
    screen.set(!f ? 0 : key === 'listen' || key === 'answer' ? 1 : key === 'ground' ? 3 : key === 'script' ? 2 : key === 'log' ? 4 : key === 'confirm' ? 5 : 6);
    timer.set(!f ? 0 : key === 'close' ? 2 : 1);
    cursor.visible = key === 'script';
    cursor.position.z = -0.035 + u * 0.075;
    log(f);
  });
};

/** Two equal-height armchairs avoid the feeling of an interview across a desk.
 * The clock faces the therapist from behind the client, out of the client's
 * sightline; a small side table keeps tissues available without a barrier. */
const thCounselPair: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  rug(g, 2.75, 1.86);
  chair(g, [-0.14, 0.46, 0.67], Math.PI, SAGE, true);
  chair(g, [-0.14, 0.46, -0.4], 0, '#c2aa8f', true);
  const client = person(g, [-0.14, 0.46, -0.4], 0, '#b08e9d');
  const side = group(g, 0.55, 0, 0.25);
  part(side, cyl(0.29, 0.29, 0.035, 32), OAK, 0, 0.64, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    rod(side, EDGE, 0.022)([Math.sin(a) * 0.17, 0.02, Math.cos(a) * 0.17], [Math.sin(a) * 0.1, 0.63, Math.cos(a) * 0.1]);
  }
  tissueBox(g, [0.52, 0.7, 0.1]);
  water(g, [0.72, 0.66, 0.13]);
  water(g, [0.72, 0.66, 0.38]);
  const cards = group(g);
  for (let i = 0; i < 4; i++) {
    const card = group(cards, (i - 1.5) * 0.035, i * 0.002, 0, (i - 1.5) * 0.12);
    part(card, rbox(0.095, 0.003, 0.12, 0.008), [GOLD, BLUE, CORAL, SAGE][i], 0, 0, 0);
    flat(card, ['기쁨', '걱정', '속상함', '편안함'][i], 0.08, 0.035, [0, 0.003, 0.025], [GOLD, BLUE, CORAL, SAGE][i], INK);
    part(card, cyl(0.023, 0.023, 0.001, 16), WHITE, 0, 0.003, -0.025, { outline: false });
  }
  const selected = group(g);
  part(selected, rbox(0.095, 0.003, 0.12, 0.008), BLUE, 0, 0, 0);
  flat(selected, '걱정', 0.08, 0.035, [0, 0.003, 0], BLUE, INK);
  const sheet = page(g, T.PAIR.page, '상황 → 생각 → 마음', 0.29, 0.23);
  const marks = ink(sheet, [-0.08, 0.014, -0.02]);
  const pencil = pen(g);
  const tissue = group(g);
  part(tissue, box(0.085, 0.003, 0.08), WHITE, 0, 0, 0, { rz: 0.15, outline: false });
  part(tissue, box(0.055, 0.035, 0.003), WHITE, 0.015, 0.017, 0, { rz: -0.35, outline: false });
  const rear = group(g, -0.14, 0, -0.91);
  for (const x of [-0.44, 0.44]) part(rear, box(0.025, 1.3, 0.025), EDGE, x, 0.65, 0);
  part(rear, rbox(0.94, 0.33, 0.035, 0.02), '#b8c9b6', 0, 1.12, 0);
  clock(rear, [0.29, 1.15, 0.029]);
  label(rear, '말하지 않아도 괜찮아요', 0.5, 0.065, -0.11, 1.17, 0.023, '#b8c9b6', DEEP);
  label(rear, '개인 상담', 0.36, 0.065, -0.1, 1.06, 0.023, '#b8c9b6', DEEP);
  // A low slatted divider gives privacy without hiding faces from the camera.
  for (let i = 0; i < 9; i++) part(g, rbox(0.035, 0.86, 0.035, 0.008), OAK, -1.08, 0.43, -0.8 + i * 0.18);
  for (const z of [-0.8, 0.64]) part(g, box(0.2, 0.025, 0.08), EDGE, -1.08, 0.013, z);
  plant(g, [1.04, 0, -0.6], 2.3);
  personalBelongings(g, [-0.65, 0, -0.65]);
  wasteBasket(g, [0.69, 0, -0.32]);
  const stand = group(g, 1.05, 0, 0.56);
  part(stand, cyl(0.12, 0.13, 0.025, 24), DEEP, 0, 0.012, 0);
  part(stand, cyl(0.012, 0.012, 1.12, 12), METAL, 0, 0.57, 0);
  part(stand, cyl(0.13, 0.21, 0.26, 24), CREAM, 0, 1.18, 0);
  const light = group(stand);
  glowing(light, cyl(0.185, 0.185, 0.008, 24), '#ffe5ad', 0, 1.051, 0);
  out.inUse = light;
  part(g, rbox(0.37, 0.12, 0.03, 0.008), OAK, 0.55, 0.59, 0.5);
  const badge = display(g, ['상담 준비', '경청 중', '함께 정리', '다음 만남'], [0.55, 0.59, 0.52], 0.32, 0.09);
  out.screen = badge.mesh;
  animate(g, out, { thListen: 'thListen', thReframe: 'thReframe' }, f => {
    const key = f?.b.key ?? '', u = f?.b.u ?? 0, i = f?.b.i ?? -1;
    const reframe = f?.m === 'thReframe';
    held(cards, f, reframe ? [] : ['offer', 'choose'], T.PAIR.cards);
    cards.visible = !reframe;
    selected.visible = !reframe && !!f && i >= 2 && i < 7;
    // Transfer the selected card to the other hand before accepting a tissue.
    // It must not keep floating at the old right-hand target during that reach.
    const leftCard = i >= 5;
    const cardHand: T.V = leftCard ? [-0.24, 0.88, -0.2] : [-0.12, 0.9, -0.22];
    place(selected, key === 'choose' ? T.between([0.07, 0.87, 0.14], cardHand, T.sm(u)) : cardHand);
    selected.rotation.x = 0.7;
    place(sheet, T.PAIR.page); sheet.rotation.x = 0;
    sheet.visible = !!reframe || key === 'note';
    if (f && ['sheet', 'review', 'return'].includes(key)) {
      place(sheet, middle(f)); sheet.rotation.x = key === 'return' ? 0.25 : 0.5;
    }
    held(pencil, f, ['write', 'note'], [0.42, 0.68, 0.3]);
    pencil.rotation.z = key === 'write' || key === 'note' ? 0 : Math.PI / 2;
    tissue.visible = key === 'tissue';
    if (key === 'tissue') place(tissue, f!.h.r);
    const taking: T.V | undefined = key === 'choose' ? selected.position.toArray() as [number, number, number]
      : key === 'tissue' ? T.between([-0.04, 0.8, -0.3], [0.22, 0.88, 0.14], T.sm(u))
      : selected.visible && !leftCard ? cardHand : key === 'return' ? [0.02, 0.86, 0.08] : undefined;
    client.move(f?.t ?? 0, key === 'listen' || key === 'review',
      selected.visible && leftCard ? cardHand : undefined, taking, key === 'listen' ? 0.12 : 0.04);
    marks.forEach((m, j) => m.visible = key === 'review' || key === 'return' || (key === 'write' || key === 'note') && j / marks.length < u);
    badge.set(!f ? 0 : key === 'close' || key === 'return' ? 3 : ['write', 'note', 'review'].includes(key) ? 2 : 1);
  });
};

/** Three participants sit around an empty centre, with the therapist's fourth
 * chair left for the real dweller. A talking stone changes hands between turns. */
const thGroupCircle: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  rug(g, 2.76, 2.76);
  chair(g, [0, 0.46, 0.97], Math.PI, DEEP, true);
  chair(g, [-0.82, 0.46, 0.3], Math.PI / 2, SAGE);
  chair(g, [0.82, 0.46, 0.3], -Math.PI / 2, CORAL);
  chair(g, [0, 0.46, -0.94], 0, BLUE);
  const first = person(g, [-0.82, 0.46, 0.3], Math.PI / 2, '#aa9477');
  const second = person(g, [0.82, 0.46, 0.3], -Math.PI / 2, '#8f9db0');
  const third = person(g, [0, 0.46, -0.94], 0, '#a68ca3');
  part(g, cyl(0.31, 0.31, 0.035, 32), OAK, 0, 0.27, 0);
  for (const x of [-0.15, 0.15]) for (const z of [-0.15, 0.15]) part(g, cyl(0.018, 0.022, 0.25, 10), EDGE, x, 0.125, z);
  tissueBox(g, [0.08, 0.335, -0.05]);
  part(g, cyl(0.09, 0.09, 0.012, 24), SAGE, -0.12, 0.297, 0.09);
  const stone = group(g);
  part(stone, ball(0.055), '#7d9d94', 0, 0, 0).scale.set(1.1, 0.65, 0.8);
  part(stone, ring(0.025, 0.002), CREAM, 0, 0.033, 0, { rx: Math.PI / 2, outline: false });
  const cards = group(g, 0.13, 0.294, 0.13);
  for (let i = 0; i < 4; i++) {
    part(cards, box(0.13, 0.002, 0.09), [SAGE, CORAL, GOLD, BLUE][i], i * 0.008, i * 0.003, i * 0.007, { ry: i * 0.08 });
  }
  flat(g, '차례로 · 비밀 지키기', 0.29, 0.07, [0, 0.295, -0.15], CREAM, DEEP);
  const board = group(g, -1.12, 0, -1.03, 0.25);
  for (const x of [-0.18, 0.18]) rod(board, EDGE, 0.018)([x * 1.3, 0, 0.08], [x, 1.2, 0]);
  part(board, rbox(0.48, 0.53, 0.035, 0.02), OAK, 0, 1.03, 0);
  label(board, '마음 나눔', 0.39, 0.09, 0, 1.18, 0.021, CREAM, DEEP);
  label(board, '판단 없이 듣기', 0.39, 0.065, 0, 1.06, 0.021, CREAM, INK);
  label(board, '말하지 않을 권리', 0.39, 0.065, 0, 0.96, 0.021, CREAM, INK);
  label(board, '여기서 나눈 이야기', 0.39, 0.055, 0, 0.86, 0.021, CREAM, INK);
  const progress = display(board, ['시작 전', '한 사람씩', '함께 호흡', '마무리'], [0, 0.68, 0.022], 0.4, 0.09);
  out.screen = progress.mesh;
  plant(g, [1.13, 0, -1.08], 1.8);
  personalBelongings(g, [1.17, 0, -0.52]);
  personalBelongings(g, [-1.16, 0, 0.51]);
  water(g, [-0.13, 0.29, -0.04]);
  const breathing = group(g, 0, 0.022, 0);
  glowing(breathing, ring(0.48, 0.009), '#aac7b0', 0, 0, 0, Math.PI / 2);
  out.inUse = breathing;
  animate(g, out, { thGroup: 'thGroup' }, f => {
    const key = f?.b.key ?? '', u = f?.b.u ?? 0;
    const p = f ? T.tokenAt(key, u) : [-0.12, 0.33, 0.09] as T.V;
    const onTable = !f || key === 'breathe' || key === 'close';
    place(stone, onTable ? [-0.12, 0.33, 0.09] : p);
    first.move(f?.t ?? 0, key === 'first',
      key === 'pass' || key === 'first' || key === 'second' && u < 0.25 ? p : undefined);
    second.move(f?.t ?? 0, key === 'second', undefined,
      key === 'second' && u >= 0.45 || key === 'reflect' && u < 0.45 ? p : undefined);
    third.move(f?.t ?? 0, key === 'close', undefined, key === 'close' ? [0.16, 1.0, -0.63] : undefined);
    if (key === 'breathe') {
      const y = 0.7 + 0.1 * Math.sin(u * Math.PI);
      first.move(f!.t, false, [-0.6, y, 0.42], [-0.6, y, 0.18], 0.08);
      second.move(f!.t, false, [0.6, y, 0.18], [0.6, y, 0.42], 0.08);
      third.move(f!.t, false, [-0.12, y, -0.73], [0.12, y, -0.73], 0.08);
    }
    breathing.scale.setScalar(key === 'breathe' ? 1 + 0.13 * Math.sin(u * Math.PI) : 1);
    progress.set(!f ? 0 : key === 'breathe' ? 2 : key === 'close' ? 3 : 1);
  });
};

/** The centre's reception desk (2026-11-05, the layout audit: staffed, not a kiosk left alone). Reception is a quiet assistive station, not a diagnostic machine. The
 * touchscreen shows example responses and produces a counselling appointment
 * slip; a white-noise unit and privacy wings belong to the waiting area. */
const thIntakeKiosk: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const cabinet = group(g, 0.22, 0, -0.1);
  part(cabinet, rbox(1.05, 0.83, 0.61, 0.04), SAGE, 0, 0.415, 0);
  wood(cabinet, 1.1, 0.67, 0.87);
  part(cabinet, box(0.91, 0.53, 0.018), '#abc0af', 0, 0.43, 0.315);
  part(cabinet, box(0.018, 0.51, 0.02), DEEP, 0, 0.43, 0.326);
  for (const x of [-0.08, 0.08]) part(cabinet, rbox(0.016, 0.1, 0.022, 0.005), METAL, x, 0.46, 0.34);
  label(cabinet, '마음숲 상담 접수', 0.7, 0.09, 0, 0.71, 0.33, CREAM, DEEP);
  label(cabinet, '결과는 상담 때 함께 살펴봐요', 0.7, 0.05, 0, 0.2, 0.33, SAGE, DEEP);
  part(g, rbox(0.36, 0.025, 0.21, 0.025), INK, 0.12, 0.89, -0.13);
  part(g, box(0.07, 0.16, 0.045), METAL, 0.12, 0.98, -0.19);
  const tablet = group(g, 0.12, 1.18, -0.12);
  tablet.rotation.x = -0.16;
  part(tablet, rbox(0.55, 0.37, 0.04, 0.02), INK, 0, 0, 0);
  const screen = display(tablet, ['마음 점검', '안내와 동의', '요즘의 마음', '응답 확인', '상담 접수 완료'], [0, 0, 0.025], 0.5, 0.32);
  out.screen = screen.mesh;
  for (const x of [-0.2, 0.44]) part(g, rbox(0.025, 0.27, 0.28, 0.015), '#b2c4b9', x, 1.07, -0.08);
  const printer = group(g, 0.53, 0.91, 0.1);
  part(printer, rbox(0.19, 0.1, 0.21, 0.015), CREAM, 0, 0, 0);
  part(printer, box(0.13, 0.012, 0.015), INK, 0, 0.01, 0.111);
  const printLamp = glowing(printer, ball(0.006), '#c3e5b6', 0.064, 0.055, 0.06);
  const receipt = group(g);
  part(receipt, box(0.105, 0.002, 0.15), WHITE, 0, 0, 0);
  flat(receipt, '상담 안내', 0.095, 0.03, [0, 0.003, -0.04]);
  flat(receipt, '다음 만남', 0.095, 0.026, [0, 0.003, 0.025]);
  for (let i = 0; i < 10; i++) part(receipt, box(i % 2 ? 0.002 : 0.004, 0.001, 0.025), INK, -0.035 + i * 0.008, 0.003, -0.002, { outline: false });
  const visitorChair = chair(g, [-0.7, 0.46, -0.05], Math.PI / 2, CORAL);
  const visitor = person(g, [-0.7, 0.46, -0.05], Math.PI / 2, '#b7a17f');
  visitorChair.scale.setScalar(0.95);
  const sound = group(g, -0.04, 0.9, 0.15);
  part(sound, cyl(0.075, 0.078, 0.07, 24), CREAM, 0, 0, 0);
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    part(sound, ball(0.004), DEEP, Math.sin(a) * 0.05, 0.037, Math.cos(a) * 0.05, { outline: false });
  }
  part(sound, cyl(0.018, 0.018, 0.008, 12), SAGE, 0, 0.04, 0);
  flat(g, '잔잔한 빗소리', 0.16, 0.045, [-0.04, 0.878, 0.28], CREAM, DEEP);
  const waves = group(sound);
  for (let i = 0; i < 3; i++) glowing(waves, ring(0.08 + i * 0.023, 0.002), '#bfdac8', 0, 0.06 + i * 0.017, 0, Math.PI / 2);
  out.inUse = waves;
  const leaflet = group(g, 0.62, 0.89, -0.26);
  part(leaflet, rbox(0.16, 0.14, 0.07, 0.012), CREAM, 0, 0.07, 0);
  for (let i = 0; i < 3; i++) {
    part(leaflet, box(0.12, 0.18, 0.003), [SAGE, CORAL, BLUE][i], i * 0.006, 0.13, -0.015 + i * 0.012, { rx: -0.08 });
  }
  label(leaflet, '첫 상담 안내', 0.11, 0.035, 0.012, 0.17, 0.023, BLUE, WHITE);
  const privacy = label(g, '동의 후 시작', 0.22, 0.05, 0.47, 1.08, 0.075, CREAM, DEEP);
  plant(g, [0.71, 0.87, 0.19], 0.65);
  const choiceDots = Array.from({ length: 4 }, (_, i) => glowing(tablet,
    cyl(0.012, 0.012, 0.002, 12), '#d8b970', -0.16 + i * 0.106, -0.117, 0.029, Math.PI / 2));
  const resultLines = Array.from({ length: 3 }, (_, i) => part(tablet,
    box(0.12 + i * 0.045, 0.006, 0.002), DEEP, 0.085, -0.02 + i * 0.035, 0.03, { outline: false }));
  animate(g, out, { thIntake: 'thIntake' }, f => {
    const key = f?.b.key ?? '', u = f?.b.u ?? 0;
    screen.set(!f ? 0 : key === 'privacy' || key === 'start' ? 1 : key === 'answer' ? 2 : key === 'review' ? 3 : key === 'print' || key === 'handover' ? 4 : 0);
    receipt.visible = key === 'print' || key === 'handover';
    if (key === 'print') { place(receipt, [0.53, 0.926, 0.22 + u * 0.07]); receipt.scale.z = 0.2 + u * 0.8; }
    else { receipt.scale.z = 1; place(receipt, f?.h.r ?? [0.53, 0.926, 0.24]); }
    printLamp.visible = key === 'print' && Math.floor(u * 12) % 2 === 0;
    const accepting: T.V | undefined = key === 'handover' ? T.between([-0.45, 0.78, 0.1], [-0.18, 1.0, 0.15], T.sm(u)) : undefined;
    visitor.move(f?.t ?? 0, key === 'answer' || key === 'review', undefined, accepting, key === 'privacy' ? 0.1 : 0.04);
    privacy.visible = !f || key === 'privacy' || key === 'start';
    waves.rotation.y = f ? f.t * 0.15 : 0;
    waves.scale.setScalar(f ? 1 + 0.035 * T.wave(f.t, 0.3) : 1);
    choiceDots.forEach((dot, i) => {
      dot.visible = key === 'answer' && i <= Math.floor(u * 4) || key === 'review';
    });
    resultLines.forEach((line, i) => {
      line.visible = key === 'review' && i / 3 < u || key === 'print' || key === 'handover';
    });
  });
};

export const BUILDERS: Record<string, Builder> = {
  // The centre's small sign by the door (2026-11-05, the layout audit): low, the name and a line, nothing loud.
  thStreetSign: pavementSign('thStreetSign', '🧠', '마음숲|심리상담센터', ['개인 · 아동 · 집단 상담', '심리검사 · 예약제'], DEEP, 1.4),
  sandTray, notesDesk, crisisPhone, thCounselPair, thGroupCircle, thIntakeKiosk,
};
