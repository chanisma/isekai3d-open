import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox } from '../toon';
import { BLACK, CHROME, glass, glowing, label, litScreen, painted, picture, seeded, starBase, text, type Paint } from './doctor';
import { COUNCIL_MIC, PHONE_KEYPAD, SPEECH_SCAN, councilMicOn, orateBeat, phoneEar, polPhase, pressBeat } from './politicianMotion';

/**
 * The 시청 의원 사무실 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a
 * Korean 시의원's office and the 시의회 chamber. The staff desks with the 조례안 on screen, the desk
 * phone and the call list, the little desk flags; the chamber's podium with the city's emblem on its
 * front, two goosenecks and the script on its sloped top (the press's microphones clamped to it for
 * a briefing); a council desk for two with tent nameplates, a microphone at each place whose ring
 * lights while the member speaks, and the 찬성 · 반대 · 기권 voting buttons. And what it was missing
 * (workFurniture/politician.ts): the member's desk with the 태극기 and the city flag behind the
 * chair, the briefing backdrop, the district map with its pins, the 민원 상담 창구 with its acrylic
 * screen and number display, the 민원 filing cabinet.
 *
 * The city (새솔시), its emblem, its council and every name on a plate are made up, and nothing on
 * any piece belongs to a party. A speech (politicianMotion.ts orateBeat) is made to the room: a hand
 * flat on the script, both hands opened out, turned to one side of the room and the other with a hand
 * swept out to them, a fist on the point, a hand on the heart — the podium turns its spot by the same
 * clock as the hands.
 */

const WALNUT = '#5d4037';
const PANEL = '#7b5a43';
const GOLD = '#d4af37';
const PAPER = '#fbfaf5';
const NAVY = '#1a3a6b';
const PINE = '#2e7d32';
const LEATHER = '#2f2a2a';
const MAROON = '#5a1f24';
const STEELGREY = '#8a969e';
const CITY = '새솔시';
const COUNCIL = '새솔시의회';

// ---------------------------------------------------------------------------------------------
// Small parts.

/** A spot sat at (the seat's top `y`), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work: THREE.Object3D): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, y);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot stood at, facing `yaw`, and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** The same place, done another way. */
const also = (s: Spot, motion: Motion, work = s.work): Spot => ({ ...s, motion, work });
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
/** How tall whoever's posed at a spot is (activity.ts spotPose marks it). */
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const tmp = new THREE.Vector3();
const phaseOf = (s: Spot) => polPhase(s.at.getWorldPosition(tmp));

/** A sheet lying flat on a top, its head away from +z, turned `ry` about the vertical. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A pen lying on a top. */
const pen = (g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#1a237e') => part(g, cyl(0.0045, 0.0045, 0.14, 6), color, x, y + 0.005, z, { rz: Math.PI / 2, ry, outline: false });
/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

/** A swivel chair, built facing +z: five-star base, gas lift, the seat's top at 0.48, a back `back` high, arms. */
function swivel(g: THREE.Object3D, x: number, z: number, ry: number, color: string, back = 0.55): THREE.Group {
  const c = group(g, x, 0, z, ry);
  starBase(c, 0, 0, 0.26, BLACK);
  part(c, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.5, 0.09, 0.48, 0.04), color, 0, 0.435, 0);
  part(c, rbox(0.5, back, 0.1, 0.05), color, 0, 0.5 + back / 2, -0.24, { rx: -0.08 });
  part(c, rbox(0.42, back - 0.16, 0.02, 0.04), shade(color, 1.25), 0, 0.5 + back / 2, -0.185, { rx: -0.08, outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.04, 0.3, 0.015), color, sx * 0.27, 0.67, 0.0);
    part(c, rbox(0.03, 0.18, 0.03, 0.01), CHROME, sx * 0.27, 0.57, 0.04, { outline: false });
  }
  return c;
}

/**
 * A gooseneck microphone on its base, bending out over +z to a head at `reach` out and `rise` up;
 * the tally ring at its head drawn again, glowing, in `lit` (shown while it's live). Returns its group.
 */
function gooseMic(g: THREE.Object3D, x: number, y: number, z: number, ry: number, lit?: THREE.Object3D, rise = 0.3, reach = 0.1): THREE.Group {
  const m = group(g, x, y, z, ry);
  part(m, rbox(0.1, 0.03, 0.13, 0.012), BLACK, 0, 0.015, 0);
  part(m, cyl(0.013, 0.013, 0.008, 10), '#9e9e9e', 0.025, 0.034, 0.04, { outline: false });
  const knee = new THREE.Vector3(0, rise * 0.72, -0.01);
  const head = new THREE.Vector3(0, rise, reach);
  rod(m, new THREE.Vector3(0, 0.03, -0.03), knee, 0.006, BLACK);
  rod(m, knee, head.clone().addScaledVector(new THREE.Vector3(0, -0.02, -0.02), 1), 0.006, BLACK);
  const tilt = Math.PI / 2 - Math.atan2(rise - knee.y, reach - knee.z) * 0.5;
  part(m, cyl(0.014, 0.011, 0.075, 10), '#424242', 0, head.y, head.z + 0.02, { rx: tilt });
  part(m, cyl(0.0155, 0.0155, 0.008, 12), '#5a1a1a', 0, head.y - 0.008, head.z - 0.012, { rx: tilt, outline: false });
  if (lit) {
    const on = group(lit, 0, 0, 0);
    on.position.copy(m.position);
    on.rotation.copy(m.rotation);
    glowing(on, cyl(0.017, 0.017, 0.01, 12), '#ff1744', 0, head.y - 0.008, head.z - 0.012, tilt);
  }
  return m;
}

/** A tent card that reads from both sides, along x at `x, y, z`. */
function tentCard(g: THREE.Object3D, s: string, w: number, x: number, y: number, z: number, bg = '#fafafa', fg = '#1a237e') {
  const tent = group(g, x, y, z);
  for (const sz of [-1, 1]) {
    part(tent, box(w, 0.1, 0.005), bg, 0, 0.046, sz * 0.018, { rx: -sz * 0.35 });
    label(tent, s, w - 0.03, 0.065, 0, 0.046, sz * 0.022, bg, fg, sz > 0 ? 0 : Math.PI).rotation.x = -sz * 0.35;
  }
}

/**
 * A flag that hangs on its own stand (rippled, a gold fringe along its foot), its pole at the group's
 * middle, the cloth out to `side` (+1 to the right as you face it, -1 to the left; its face is +z
 * either way, so it never reads backwards).
 */
function flagStand(g: THREE.Object3D, tex: THREE.Texture, x: number, z: number, ry: number, k = 1, side = 1): THREE.Group {
  const f = group(g, x, 0, z, ry);
  f.scale.setScalar(k);
  // The weighted base and its brass collar, the pole, the finial.
  part(f, cyl(0.16, 0.19, 0.05, 20), '#3e2723', 0, 0.025, 0);
  part(f, cyl(0.05, 0.07, 0.08, 14), GOLD, 0, 0.09, 0);
  part(f, cyl(0.013, 0.013, 2.0, 10), '#6d4c41', 0, 1.1, 0, { outline: false });
  part(f, cyl(0.022, 0.022, 0.03, 10), GOLD, 0, 2.1, 0, { outline: false });
  part(f, ball(0.04), GOLD, 0, 2.15, 0).scale.set(0.9, 1.25, 0.9);
  // The cloth: a plane rippled along its width, drooping a little from the pole.
  const fw = 0.66;
  const fh = 0.44;
  const geom = new THREE.PlaneGeometry(fw, fh, 14, 2);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = side > 0 ? (pos.getX(i) + fw / 2) / fw : (fw / 2 - pos.getX(i)) / fw;
    pos.setZ(i, 0.045 * Math.sin(u * Math.PI * 2.6) * u);
    pos.setY(i, pos.getY(i) - 0.12 * u * u);
  }
  geom.computeVertexNormals();
  const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: gradient, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(geom, mat);
  cloth.userData.ownGeometry = cloth.userData.ownMaterial = true;
  cloth.castShadow = true;
  cloth.position.set(side * (fw / 2 + 0.015), 1.86, 0);
  f.add(cloth);
  // The fringe along the foot (following the droop), and the tassel cord from the top.
  for (let i = 0; i < 6; i++) {
    const u = (i + 0.5) / 6;
    part(f, box(fw / 6 + 0.01, 0.025, 0.01), GOLD, side * (0.015 + u * fw), 1.86 - fh / 2 - 0.12 * u * u - 0.012, 0.045 * Math.sin(u * Math.PI * 2.6) * u, { outline: false });
  }
  rod(f, new THREE.Vector3(side * 0.01, 2.08, 0), new THREE.Vector3(side * 0.02, 1.62, 0.02), 0.004, GOLD);
  part(f, cyl(0.012, 0.02, 0.06, 8), GOLD, side * 0.02, 1.59, 0.02, { outline: false });
  return f;
}

/** A desk phone, built facing +z (its keypad toward whoever's at it): the base, the keypad, the screen, the cradle. */
function deskPhone(g: THREE.Object3D, x: number, y: number, z: number, ry: number) {
  const p = group(g, x, y, z, ry);
  part(p, rbox(0.2, 0.045, 0.17, 0.015), '#37474f', 0, 0.022, 0);
  const face = group(p, 0, 0.05, 0.03);
  face.rotation.x = -0.25;
  part(face, box(0.17, 0.006, 0.1), '#263238', 0, 0, 0, { outline: false });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) part(face, box(0.022, 0.006, 0.016), '#cfd8dc', 0.02 + (c - 1) * 0.03, 0.005, 0.035 - r * 0.022, { outline: false });
  part(face, box(0.045, 0.006, 0.08), '#80cbc4', -0.055, 0.004, 0.0, { outline: false });
  // The cradle along the back, the handset in it.
  part(p, rbox(0.2, 0.03, 0.06, 0.012), '#37474f', 0, 0.06, -0.055);
}
/** A desk phone's handset lying in its cradle (deskPhone's frame). */
function handsetOnCradle(parent: THREE.Object3D, x: number, y: number, z: number, ry: number) {
  const h = group(parent, x, y, z, ry);
  part(h, rbox(0.21, 0.035, 0.05, 0.016), '#263238', 0, 0.09, -0.055);
  for (const sx of [-1, 1]) part(h, rbox(0.05, 0.03, 0.06, 0.014), '#263238', sx * 0.085, 0.075, -0.055);
}

// ---------------------------------------------------------------------------------------------
// What's painted on the papers, the screens, the flags and the boards.

/** The city's emblem (made up): a pine of three tiers over two waves, in a ring. */
function paintEmblem(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, onDark = false) {
  c.save();
  c.fillStyle = onDark ? '#ffffff' : '#f7f9fc';
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = r * 0.12;
  c.strokeStyle = NAVY;
  c.beginPath();
  c.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = PINE;
  for (let i = 0; i < 3; i++) {
    const top = cy - r * 0.62 + i * r * 0.22;
    const half = r * (0.2 + i * 0.1);
    c.beginPath();
    c.moveTo(cx, top);
    c.lineTo(cx + half, top + r * 0.32);
    c.lineTo(cx - half, top + r * 0.32);
    c.closePath();
    c.fill();
  }
  c.fillRect(cx - r * 0.05, cy + r * 0.06, r * 0.1, r * 0.14);
  c.strokeStyle = '#1e88e5';
  c.lineWidth = r * 0.09;
  for (let i = 0; i < 2; i++) {
    const y = cy + r * (0.32 + i * 0.2);
    c.beginPath();
    for (let k = 0; k <= 20; k++) {
      const x = cx - r * 0.55 + (k / 20) * r * 1.1;
      const yy = y + Math.sin((k / 20) * Math.PI * 3) * r * 0.05;
      if (k === 0) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.stroke();
  }
  c.restore();
}

/** 태극기. */
const paintTaegeukgi: Paint = (c) => {
  const W = 300;
  const H = 200;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, H);
  const R = H / 4;
  c.save();
  c.translate(W / 2, H / 2);
  c.rotate(Math.atan2(2, 3));
  c.fillStyle = '#0047a0';
  c.beginPath();
  c.arc(0, 0, R, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#cd2e3a';
  c.beginPath();
  c.arc(0, 0, R, Math.PI, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(-R / 2, 0, R / 2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#0047a0';
  c.beginPath();
  c.arc(R / 2, 0, R / 2, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // The four trigrams at the corners, their bars across the diagonal: 건 ☰, 감 ☵, 곤 ☷, 리 ☲.
  const bars: Array<[number, number, boolean[]]> = [
    [-3, -2, [true, true, true]],
    [3, -2, [false, true, false]],
    [3, 2, [false, false, false]],
    [-3, 2, [true, false, true]],
  ];
  const d = Math.hypot(3, 2);
  c.fillStyle = '#000000';
  for (const [dx, dy, solid] of bars) {
    c.save();
    c.translate(W / 2 + (dx / d) * R * 2.05, H / 2 + (dy / d) * R * 2.05);
    c.rotate(Math.atan2(dy, dx));
    const t = R / 4;
    const L = R;
    solid.forEach((s, i) => {
      const x = (i - 1) * t * 1.5;
      if (s) c.fillRect(x - t / 2, -L / 2, t, L);
      else {
        c.fillRect(x - t / 2, -L / 2, t, L * 0.45);
        c.fillRect(x - t / 2, L * 0.05, t, L * 0.45);
      }
    });
    c.restore();
  }
};
/** The city's flag (made up): the emblem on white over the city's name. */
const paintCityFlag: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 300, 200);
  c.fillStyle = NAVY;
  c.fillRect(0, 176, 300, 24);
  paintEmblem(c, 150, 82, 58);
  text(c, CITY, 150, 160, 22, NAVY, 'center');
};

/** The 조례안 open in the word processor on a staff desk's screen. */
const paintOrdinanceScreen: Paint = (c) => {
  c.fillStyle = '#dfe4ea';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#1e5aa8';
  c.fillRect(0, 0, 384, 22);
  text(c, '어린이보호구역_안전강화_조례안(수정).hwp', 8, 12, 11, '#ffffff', 'left');
  c.fillStyle = '#ffffff';
  c.fillRect(64, 30, 256, 226);
  text(c, `${CITY} 어린이 보호구역`, 192, 50, 13, '#111111', 'center');
  text(c, '안전 강화에 관한 조례안', 192, 68, 13, '#111111', 'center');
  const r = seeded(17);
  const art = (s: string, y: number, n: number) => {
    text(c, s, 78, y, 10, '#111111', 'left');
    c.fillStyle = '#9e9e9e';
    for (let i = 0; i < n; i++) c.fillRect(i === 0 ? 90 : 78, y + 12 + i * 10, 150 + r() * 70, 3);
  };
  art('제1조(목적)', 94, 3);
  art('제2조(정의)', 138, 3);
  art('제3조(시장의 책무)', 182, 3);
  c.fillStyle = 'rgba(255,235,59,0.55)';
  c.fillRect(76, 190, 180, 12);
  c.fillStyle = '#111111';
  c.fillRect(250, 222, 2, 10);
};
/** The call list: names (masked), the 동, a tick or a note against each. */
const paintCallList: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  text(c, '주민 의견 청취 전화 명단', 128, 26, 15, '#111111', 'center');
  text(c, '10월 27일 · 솔빛동', 128, 46, 11, '#455a64', 'center', false);
  const names = ['김*수', '이*영', '박*호', '최*희', '정*민', '강*준', '조*아', '윤*석', '장*림', '임*우', '한*진', '오*경'];
  names.forEach((n, i) => {
    const y = 76 + i * 23;
    c.fillStyle = '#cfd8dc';
    c.fillRect(14, y + 10, 228, 1);
    text(c, `${i + 1}`, 22, y, 11, '#607d8b', 'center', false);
    text(c, n, 40, y, 12, '#212121', 'left', false);
    text(c, ['솔빛동', '하늘동', '강변동'][i % 3], 104, y, 11, '#607d8b', 'left', false);
    if (i < 5) {
      c.strokeStyle = '#1565c0';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(214, y);
      c.lineTo(220, y + 6);
      c.lineTo(234, y - 7);
      c.stroke();
      if (i === 1 || i === 3) text(c, ['', '가로등 고장', '', '버스 배차'][i], 150, y, 10, '#c62828', 'left', false);
    }
  });
};
/** A speech's script: the opening, the points, a line underlined. */
const paintScript: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  text(c, '시정 질문 · 5분 자유발언', 128, 24, 13, '#37474f', 'center');
  text(c, `존경하는 ${CITY}민 여러분,`, 20, 58, 14, '#111111', 'left');
  text(c, '그리고 동료 의원 여러분.', 20, 80, 14, '#111111', 'left');
  const r = seeded(23);
  const para = (y0: number, n: number) => {
    c.fillStyle = '#9e9e9e';
    for (let i = 0; i < n; i++) c.fillRect(20, y0 + i * 15, (i === n - 1 ? 0.5 : 0.82 + r() * 0.12) * 216, 4);
  };
  para(104, 5);
  text(c, '첫째, 아이들이 안전한 통학로', 20, 196, 13, '#0d47a1', 'left');
  c.fillStyle = '#e53935';
  c.fillRect(20, 206, 190, 2);
  para(220, 4);
  text(c, '둘째, 걷기 좋은 골목', 20, 296, 13, '#0d47a1', 'left');
  para(310, 3);
};
/** A briefing's statement: the 보도자료 head, the date, the lines. */
const paintStatement: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 256, 34);
  text(c, '보 도 자 료', 128, 18, 16, '#ffffff', 'center');
  text(c, `${COUNCIL} 의정홍보담당`, 236, 48, 9, '#455a64', 'right', false);
  text(c, '2026. 10. 27.(화) 배포 즉시 보도', 20, 64, 10, '#c62828', 'left');
  text(c, '통학로 안전 조례안 상임위 통과', 128, 96, 14, '#111111', 'center');
  text(c, '- 보호구역 과속방지턱·조명 확충 -', 128, 116, 11, '#37474f', 'center', false);
  const r = seeded(29);
  c.fillStyle = '#9e9e9e';
  for (let i = 0; i < 14; i++) c.fillRect(20, 142 + i * 14, (i % 5 === 4 ? 0.45 : 0.85 + r() * 0.1) * 216, 4);
};
/** The 민원 상담 기록부 on the counter: the fields filled in. */
const paintComplaintForm: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  text(c, '민원 상담 기록부', 128, 26, 16, '#111111', 'center');
  c.strokeStyle = '#455a64';
  c.lineWidth = 1.5;
  const rows: Array<[string, string]> = [
    ['접수번호', '2026-1027-014'],
    ['접수일시', '10. 27. 14:20'],
    ['민원인', '김 * 수 (솔빛동)'],
    ['유형', '도로 · 교통'],
    ['내용', '초등학교 앞 횡단보도'],
    ['', '신호등 설치 요청'],
    ['처리', '관계 부서 현장 확인'],
  ];
  rows.forEach(([k, v], i) => {
    const y = 52 + i * 34;
    c.strokeRect(14, y, 228, 34);
    c.beginPath();
    c.moveTo(80, y);
    c.lineTo(80, y + 34);
    c.stroke();
    text(c, k, 47, y + 17, 11, '#37474f', 'center');
    text(c, v, 88, y + 17, 11, i === 6 ? '#1565c0' : '#212121', 'left', false);
  });
  text(c, '상담자: 정책비서관  (서명)', 236, 326, 10, '#37474f', 'right', false);
};
/** The 민원 system on the counter's screen. */
const paintComplaintScreen: Paint = (c) => {
  c.fillStyle = '#f4f6f8';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#00695c';
  c.fillRect(0, 0, 384, 26);
  text(c, '새솔 민원 접수 · 처리 시스템', 10, 14, 13, '#ffffff', 'left');
  text(c, '오늘 접수 14건', 374, 14, 11, '#b2dfdb', 'right', false);
  const items: Array<[string, string, string, string]> = [
    ['014', '도로·교통', '횡단보도 신호등 설치', '접수'],
    ['013', '환경', '공원 쓰레기통 추가', '처리 중'],
    ['012', '복지', '경로당 난방 점검', '처리 중'],
    ['011', '안전', '골목 가로등 고장', '완료'],
    ['010', '교통', '마을버스 배차 간격', '완료'],
    ['009', '주거', '공동주택 주차 문제', '완료'],
  ];
  text(c, '번호', 18, 42, 10, '#607d8b', 'left');
  text(c, '유형', 60, 42, 10, '#607d8b', 'left');
  text(c, '내용', 130, 42, 10, '#607d8b', 'left');
  text(c, '상태', 366, 42, 10, '#607d8b', 'right');
  items.forEach(([n, k, s, st], i) => {
    const y = 66 + i * 30;
    c.fillStyle = i === 0 ? '#e0f2f1' : i % 2 ? '#ffffff' : '#f9fafb';
    c.fillRect(8, y - 13, 368, 26);
    text(c, n, 18, y, 11, '#37474f', 'left', false);
    text(c, k, 60, y, 11, '#37474f', 'left', false);
    text(c, s, 130, y, 11, '#212121', 'left', false);
    const col = st === '완료' ? '#2e7d32' : st === '접수' ? '#c62828' : '#ef6c00';
    c.fillStyle = col;
    c.fillRect(318, y - 9, 52, 18);
    text(c, st, 344, y, 10, '#ffffff', 'center');
  });
};
/** The council's agenda on a member's screen: the session, the bills, the vote being taken. */
const paintAgenda: Paint = (c) => {
  c.fillStyle = '#0d1b3e';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#16306b';
  c.fillRect(0, 0, 384, 42);
  text(c, `제287회 ${COUNCIL} (정례회)`, 192, 14, 14, '#ffffff', 'center');
  text(c, '제3차 본회의 · 의사일정', 192, 32, 12, '#bbdefb', 'center', false);
  const rows = ['1. 어린이 보호구역 안전 강화 조례안', '2. 2027년도 예산안 제안 설명', '3. 시정에 관한 질문', '4. 5분 자유발언'];
  rows.forEach((s, i) => {
    const y = 66 + i * 26;
    if (i === 0) {
      c.fillStyle = 'rgba(255,213,79,0.2)';
      c.fillRect(8, y - 12, 368, 24);
    }
    text(c, s, 16, y, 12, i === 0 ? '#ffd54f' : '#e3f2fd', 'left', i === 0);
  });
  text(c, '전자 표결 중', 16, 184, 13, '#ff8a80', 'left');
  const bar = (k: string, n: number, col: string, x: number) => {
    c.fillStyle = col;
    c.fillRect(x, 200, 100, 36);
    text(c, `${k} ${n}`, x + 50, 218, 15, '#ffffff', 'center');
  };
  bar('찬성', 12, '#2e7d32', 16);
  bar('반대', 3, '#c62828', 142);
  bar('기권', 1, '#f9a825', 268);
};
/** The briefing backdrop: the council's name and emblem over and over, a band across the top. */
const paintBackdrop: Paint = (c) => {
  const W = 768;
  const H = 576;
  const grd = c.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#1d4f91');
  grd.addColorStop(1, '#0f2f5c');
  c.fillStyle = grd;
  c.fillRect(0, 0, W, H);
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 96 + col * 192 + (row % 2 ? 96 : 0) - 48;
      const y = 112 + row * 80;
      if (x > W - 40) continue;
      paintEmblem(c, x - 46, y, 20, true);
      text(c, COUNCIL, x + 20, y, 20, 'rgba(255,255,255,0.9)', 'center');
    }
  }
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.fillRect(0, 0, W, 70);
  paintEmblem(c, 60, 35, 26);
  text(c, `${COUNCIL} 정례 브리핑`, W / 2, 36, 34, NAVY, 'center');
};
/** The district map (made up): the river, the main roads, the 동s in soft colours, their names. */
const paintDistrict: Paint = (c) => {
  const W = 640;
  const H = 400;
  c.fillStyle = '#f4f1e8';
  c.fillRect(0, 0, W, H);
  const dongs: Array<[string, string, Array<[number, number]>]> = [
    ['솔빛동', '#c8e6c9', [[30, 60], [250, 40], [280, 190], [40, 210]]],
    ['하늘동', '#bbdefb', [[250, 40], [470, 50], [430, 180], [280, 190]]],
    ['새솔1동', '#ffe0b2', [[470, 50], [610, 70], [600, 220], [430, 180]]],
    ['새솔2동', '#f8bbd0', [[40, 210], [280, 190], [300, 360], [50, 370]]],
    ['강변동', '#e1bee7', [[280, 190], [430, 180], [600, 220], [590, 370], [300, 360]]],
  ];
  for (const [name, col, pts] of dongs) {
    c.fillStyle = col;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
    c.strokeStyle = '#8d6e63';
    c.setLineDash([8, 6]);
    c.lineWidth = 2;
    c.stroke();
    c.setLineDash([]);
    const cx = pts.reduce((n, p) => n + p[0], 0) / pts.length;
    const cy = pts.reduce((n, p) => n + p[1], 0) / pts.length;
    text(c, name, cx, cy, 20, '#4e342e', 'center');
  }
  // The river and the roads.
  c.strokeStyle = '#64b5f6';
  c.lineWidth = 22;
  c.beginPath();
  c.moveTo(0, 300);
  c.bezierCurveTo(200, 250, 380, 380, 640, 300);
  c.stroke();
  c.strokeStyle = '#ffffff';
  c.lineWidth = 9;
  for (const [a, b, d, e] of [[0, 140, 640, 120], [330, 0, 340, 400], [120, 0, 160, 400]]) {
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(d, e);
    c.stroke();
  }
  // The title strip and the legend.
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.fillRect(0, 0, W, 34);
  text(c, `${CITY} 제3선거구 지역 현안 지도`, 14, 18, 18, NAVY, 'left');
  const legend: Array<[string, string]> = [['#e53935', '민원'], ['#1e88e5', '추진 사업'], ['#fbc02d', '현장 방문']];
  legend.forEach(([col, s], i) => {
    const x = 410 + i * 76;
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, 17, 7, 0, Math.PI * 2);
    c.fill();
    text(c, s, x + 12, 18, 13, '#37474f', 'left', false);
  });
};

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  /**
   * A staff desk in the member's office (의원실 책상): a light oak top on a grey steel pedestal, the
   * 조례안 open on the monitor, the keyboard, the desk phone at the left with the call list beside
   * it, the 태극기 and the city flag crossed on a little desk stand, the red 조례집, the 민원 files
   * with their tabs, a mug, a swivel chair. The calls are made with the handset at the ear, the
   * names ticked off the list; the 조례안 typed; the 조례집 read up in the chair; notes written, a
   * committee run with a notebook.
   */
  campaignDesk(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.04;
    const d = 0.62;
    const h = 0.74;
    const zc = -D / 2 + d / 2 + 0.03;
    const zf = zc + d / 2;
    const top = h + 0.02;
    part(g, rbox(w, 0.04, d, 0.012), '#d2b48c', 0, h, zc);
    part(g, rbox(w - 0.02, 0.006, d - 0.02, 0.003), '#dcc39b', 0, h + 0.021, zc, { outline: false });
    // The pedestal on the right, three drawers; the leg panel on the left; the modesty panel.
    const px = w / 2 - 0.19;
    part(g, rbox(0.34, h - 0.03, d - 0.06, 0.01), STEELGREY, px, (h - 0.03) / 2, zc);
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.3, 0.19, 0.012, 0.005), shade(STEELGREY, 1.12), px, 0.14 + i * 0.21, zf - 0.024);
      part(g, rbox(0.1, 0.014, 0.014, 0.005), '#455a64', px, 0.2 + i * 0.21, zf - 0.014, { outline: false });
    }
    part(g, rbox(0.035, h - 0.02, d - 0.06, 0.008), STEELGREY, -w / 2 + 0.03, (h - 0.02) / 2, zc);
    part(g, rbox(w - 0.1, 0.36, 0.015, 0.006), shade(STEELGREY, 0.9), 0, h - 0.22, zc - d / 2 + 0.04);
    // The monitor with the 조례안, the keyboard and mouse.
    const mx = 0.06;
    const mz = zc - 0.17;
    part(g, rbox(0.16, 0.012, 0.12, 0.006), BLACK, mx, top + 0.006, mz);
    part(g, rbox(0.035, 0.18, 0.025, 0.008), BLACK, mx, top + 0.09, mz - 0.03);
    part(g, rbox(0.44, 0.28, 0.03, 0.01), BLACK, mx, top + 0.3, mz);
    out.screen = litScreen(g, painted('polOrdinanceScreen', 384, 256, paintOrdinanceScreen), 0.41, 0.25, mx, top + 0.3, mz + 0.017);
    part(g, rbox(0.34, 0.014, 0.12, 0.006), '#37474f', mx + 0.02, top + 0.007, zf - 0.17);
    part(g, box(0.32, 0.004, 0.1), '#eceff1', mx + 0.02, top + 0.016, zf - 0.17, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#37474f', mx + 0.26, top + 0.01, zf - 0.16);
    // The desk phone at the left with the call list beside it.
    // The keypad's where the hand dials (PHONE_KEYPAD from the list, to the caller's left: -x here).
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const listX = -0.16;
    const listZ = zf - 0.19;
    const phX = listX - PHONE_KEYPAD.side;
    const phZ = listZ - PHONE_KEYPAD.ahead - 0.03;
    deskPhone(g, phX, top, phZ, 0);
    handsetOnCradle(idle, phX, top, phZ, 0);
    flat(g, painted('polCallList', 256, 362, paintCallList), 0.15, 0.21, listX, top + 0.002, listZ, 0.12);
    // The little desk flags at the back left, the 조례집 and the files, a mug.
    const fl = group(g, -0.36, top, zc - 0.22);
    part(fl, rbox(0.12, 0.02, 0.06, 0.01), '#3e2723', 0, 0.01, 0);
    for (const [sx, tex] of [[-1, painted('polTaegeukgi', 300, 200, paintTaegeukgi)], [1, painted('polCityFlag', 300, 200, paintCityFlag)]] as const) {
      const pole = group(fl, sx * 0.02, 0.02, 0);
      pole.rotation.z = -sx * 0.32;
      part(pole, cyl(0.003, 0.003, 0.26, 6), GOLD, 0, 0.13, 0, { outline: false });
      part(pole, ball(0.007), GOLD, 0, 0.265, 0, { outline: false });
      (picture(pole, tex, 0.12, 0.08, sx * 0.062, 0.21, 0).material as THREE.Material).side = THREE.DoubleSide;
    }
    part(g, rbox(0.16, 0.05, 0.22, 0.008), '#b71c1c', 0.37, top + 0.025, zc - 0.12, { ry: -0.1 });
    label(g, '조례집', 0.08, 0.035, 0.37, top + 0.051, zc - 0.12, '#b71c1c', '#ffd54f').rotation.set(-Math.PI / 2, 0, 0.1);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.22, 0.012, 0.3), ['#fff176', '#90caf9', '#a5d6a7'][i], 0.36, top + 0.064 + i * 0.013, zc - 0.12, { ry: -0.1 + i * 0.06 });
    }
    part(g, cyl(0.035, 0.03, 0.09, 12), '#eceff1', 0.4, top + 0.045, zf - 0.16);
    part(g, cyl(0.03, 0.03, 0.004, 12), '#5d4037', 0.4, top + 0.088, zf - 0.16, { outline: false });
    // In use: the draft printed out beside the keyboard, a highlighter on it.
    const use = new THREE.Group();
    g.add(use);
    flat(use, painted('polScript', 256, 362, paintScript), 0.15, 0.21, 0.36, top + 0.105, zc - 0.12, -0.04);
    part(use, cyl(0.007, 0.007, 0.11, 8), '#ffeb3b', 0.33, top + 0.115, zc - 0.06, { rz: Math.PI / 2, ry: 0.6, outline: false });
    // The handset in its cradle unless it's at the ear.
    const cradle = new THREE.Group();
    use.add(cradle);
    handsetOnCradle(cradle, phX, top, phZ, 0);
    // The handset at the ear while a call's made: drawn where the left hand holds it, by the caller's height.
    const handset = new THREE.Group();
    use.add(handset);
    part(handset, rbox(0.05, 0.21, 0.045, 0.018), '#263238', 0, 0, 0);
    for (const sy of [-1, 1]) part(handset, rbox(0.06, 0.05, 0.055, 0.016), '#263238', 0, sy * 0.085, 0.012);
    const cord = part(use, cyl(0.006, 0.006, 1, 6), '#263238', 0, 0, 0, { outline: false });
    out.inUse = use;
    // The chair, and how it's sat in.
    swivel(g, 0, zf + 0.24, Math.PI, '#37474f', 0.6);
    const keys = marker(g, mx + 0.02, top + 0.02, zf - 0.17);
    const list = marker(g, listX, top + 0.01, listZ);
    out.work = keys;
    const type = sitAt(g, 0, 0.48, zf + 0.24, Math.PI, 'type', keys);
    const call = sitAt(g, 0, 0.48, zf + 0.24, Math.PI, 'phoneCall', list);
    out.seat = type.at;
    const cordFrom = new THREE.Vector3(phX - 0.1, top + 0.03, phZ - 0.03);
    const ear = new THREE.Vector3();
    const dir = new THREE.Vector3();
    out.animate = (t) => {
      const calling = posed(call, t);
      handset.visible = cord.visible = calling;
      cradle.visible = !calling;
      if (!calling) return;
      const e = phoneEar(heightAt(call));
      // The spot faces -z: its left is -x, ahead is -z; the handset just outside the hand at the ear.
      ear.set(call.at.position.x - e.x - 0.035, call.at.position.y + e.y, call.at.position.z - e.z);
      handset.position.copy(ear);
      handset.rotation.set(0.45, 0, 0.12);
      const bottom = ear.clone().add(new THREE.Vector3(0, -0.09, -0.04));
      dir.subVectors(bottom, cordFrom);
      cord.position.copy(cordFrom).addScaledVector(dir, 0.5);
      cord.scale.set(1, dir.length(), 1);
      cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    };
    out.spots = {
      '*': type,
      callVoters: call,
      politician_billStudy: also(type, 'read'),
      politician_ordinance: also(type, 'write', list),
      politician_steeringCommittee: also(type, 'meeting', list),
    };
  },

  /**
   * The council chamber's podium (연단): a walnut lectern on a low plinth, the city's emblem in a
   * brass ring on its front over 새솔시의회 in gold, the sloped top with its lip, the script, two
   * goosenecks bending back to the speaker (their rings lit while it's spoken into), a reading light,
   * a glass of water. Spoken from behind it to the room (politicianMotion.ts orateBeat): the spot
   * turned to one side of the chamber and the other by the same clock as the hands. For a briefing
   * the press's microphones are clamped along its front edge, each with its station's cube, the
   * statement on the top, and the questions are taken from either side.
   */
  pressPodium(g, W, D, c, def, ctx, out) {
    BUILDERS.speechPodium(g, W, D, c, def, { ...ctx, plain: true } as typeof ctx, out);
  },
  speechPodium(g, _W, _D, _c, _def, ctx, out) {
    const plain = !!(ctx as { plain?: boolean } | undefined)?.plain;
    const bz = 0.12;
    part(g, rbox(0.74, 0.04, 0.5, 0.012), shade(WALNUT, 0.8), 0, 0.02, bz);
    part(g, rbox(0.58, 0.98, 0.38, 0.015), WALNUT, 0, 0.53, bz);
    for (const sx of [-1, 1]) part(g, rbox(0.04, 1.0, 0.42, 0.01), shade(WALNUT, 0.85), sx * 0.3, 0.53, bz + 0.01);
    // The front the room sees: a raised panel, the emblem in its brass ring, the council's name.
    const fz = bz + 0.19;
    part(g, rbox(0.48, 0.74, 0.015, 0.008), PANEL, 0, 0.5, fz + 0.005);
    part(g, cyl(0.15, 0.15, 0.02, 32), GOLD, 0, 0.68, fz + 0.016, { rx: Math.PI / 2 });
    const emblem = painted('polEmblem', 128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      paintEmblem(c, 64, 64, 62);
    });
    const em = picture(g, emblem, 0.27, 0.27, 0, 0.68, fz + 0.028);
    (em.material as THREE.MeshBasicMaterial).transparent = true;
    em.visible = !plain;
    part(g, rbox(0.4, 0.07, 0.012, 0.006), '#3e2723', 0, 0.4, fz + 0.016);
    if (!plain) label(g, COUNCIL, 0.36, 0.05, 0, 0.4, fz + 0.024, '#3e2723', '#e8c766');
    // The sloped top, lower to the speaker's side, and what's on it.
    const topG = group(g, 0, 1.06, bz - 0.04);
    topG.rotation.x = -0.2;
    part(topG, rbox(0.66, 0.04, 0.46, 0.012), shade(WALNUT, 1.15), 0, 0, 0);
    part(topG, rbox(0.66, 0.035, 0.025, 0.008), WALNUT, 0, 0.03, -0.22);
    // What shows only in use, and only while it isn't, each in the top's frame.
    const like = (parent: THREE.Object3D) => {
      const m = group(parent, 0, 0, 0);
      m.position.copy(topG.position);
      m.rotation.copy(topG.rotation);
      return m;
    };
    const idleTop = like(g);
    out.idle = idleTop;
    flat(idleTop, painted('polScript', 256, 362, paintScript), 0.2, 0.28, 0.02, 0.022, -0.04, 0.03);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const useTop = like(use);
    const lit = group(useTop, 0, 0, 0);
    for (const sx of [-1, 1]) gooseMic(topG, sx * 0.17, 0.02, 0.16, Math.PI + sx * 0.25, lit, 0.36, 0.2);
    // A reading light on the right, a glass of water on the left.
    const lamp = group(topG, 0.27, 0.02, 0.17);
    part(lamp, cyl(0.03, 0.035, 0.02, 12), GOLD, 0, 0.01, 0);
    rod(lamp, new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, 0.14, -0.06), 0.005, GOLD);
    part(lamp, cyl(0.02, 0.04, 0.05, 12), GOLD, 0, 0.14, -0.1, { rx: -0.6 });
    part(topG, cyl(0.03, 0.026, 0.1, 12), '#e1f5fe', -0.27, 0.07, 0.1, { outline: false });
    // In use: the rings and the light on; the script for a speech, or for a briefing the statement and
    // the press's microphones clamped along the front edge.
    const lampOn = group(useTop, 0.27, 0.02, 0.17);
    glowing(lampOn, cyl(0.036, 0.036, 0.004, 12), '#fff8e1', 0, 0.12, -0.115, -0.6);
    const speech = group(useTop, 0, 0, 0);
    flat(speech, painted('polScript', 256, 362, paintScript), 0.2, 0.28, 0.02, 0.022, -0.04, 0.03);
    const press = group(useTop, 0, 0, 0);
    flat(press, painted('polStatement', 256, 362, paintStatement), 0.2, 0.28, -0.02, 0.023, -0.04, -0.04);
    const stations: Array<[string, string]> = [['새솔TV', '#1565c0'], ['시민일보', '#2e7d32'], ['HB뉴스', '#c62828'], ['한빛방송', '#6a1b9a'], ['라디오', '#ef6c00']];
    stations.forEach(([s, col], i) => {
      const x = -0.2 + i * 0.1;
      const m = group(press, x, 0.04, 0.2, (i - 2) * 0.12);
      part(m, rbox(0.03, 0.03, 0.05, 0.008), '#455a64', 0, 0, 0);
      rod(m, new THREE.Vector3(0, 0.015, 0), new THREE.Vector3(0, 0.09, -0.07), 0.005, '#263238');
      part(m, cyl(0.016, 0.02, 0.12, 10), '#212121', 0, 0.11, -0.14, { rx: Math.PI / 2 - 0.3 });
      part(m, ball(0.024), '#424242', 0, 0.12, -0.2);
      const cube = group(m, 0, 0.1, -0.1);
      part(cube, rbox(0.06, 0.05, 0.06, 0.008), col, 0, 0, 0);
      label(cube, s, 0.055, 0.02, 0, 0, 0.031, col, '#ffffff');
      label(cube, s, 0.055, 0.02, 0, 0, -0.031, col, '#ffffff', Math.PI);
    });
    // How it's spoken from: behind it facing the room, turned by the same clock as the hands.
    const script = marker(topG, 0, 0.03, -0.17);
    out.work = script;
    const orate = standAt(g, 0, -0.34, 0, 'orate', script);
    const brief = standAt(g, 0, -0.34, 0, 'pressBrief', script);
    out.animate = (t) => {
      orate.at.rotation.y = orateBeat(t, phaseOf(orate)).turn * SPEECH_SCAN;
      brief.at.rotation.y = pressBeat(t, phaseOf(brief)).turn * SPEECH_SCAN;
      const briefing = posed(brief, t);
      press.visible = briefing;
      speech.visible = !briefing;
    };
    out.spots = { '*': orate, pressConference: brief };
  },

  /**
   * A council desk (의석) for two members, facing the podium: a broad walnut top on a
   * panelled front with the emblem, a tent nameplate at each place, a gooseneck at each whose ring
   * lights while the member's speaking (councilMicOn), the 찬성 · 반대 · 기권 voting buttons, a
   * screen with the day's agenda and the vote, the bills in their binders, leather chairs. Sat at
   * to speak (leaning in to the mic, a hand making the point, the button pressed before and after),
   * or to run a briefing with a notebook.
   */
  debateTable(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.1;
    const d = 0.6;
    const h = 0.74;
    const zc = -D / 2 + d / 2 + 0.06;
    const zb = zc - d / 2;
    const zf = zc + d / 2;
    const top = h + 0.022;
    // The front the chamber sees (-z): panels and the emblem.
    part(g, rbox(w, 0.72, 0.04, 0.012), WALNUT, 0, 0.36, zb + 0.02);
    for (const sx of [-1, 1]) {
      part(g, rbox(w / 2 - 0.2, 0.46, 0.012, 0.006), PANEL, sx * (w / 4 + 0.05), 0.36, zb - 0.002, { outline: false });
      part(g, rbox(0.04, 0.74, d - 0.04, 0.01), WALNUT, sx * (w / 2 - 0.02), 0.37, zc);
    }
    part(g, cyl(0.1, 0.1, 0.015, 28), GOLD, 0, 0.42, zb - 0.006, { rx: Math.PI / 2 });
    const em = picture(g, painted('polEmblem', 128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      paintEmblem(c, 64, 64, 62);
    }), 0.18, 0.18, 0, 0.42, zb - 0.016, '#ffffff', Math.PI);
    (em.material as THREE.MeshBasicMaterial).transparent = true;
    part(g, rbox(w + 0.06, 0.044, d + 0.04, 0.02), shade(WALNUT, 1.18), 0, h, zc);
    part(g, rbox(w - 0.2, 0.004, d - 0.16, 0.002), '#2e4a3a', 0, h + 0.023, zc + 0.02, { outline: false });
    // The agenda screen in the middle, turned up to both places.
    const scr = group(g, 0, top, zb + 0.14);
    part(scr, rbox(0.12, 0.012, 0.1, 0.005), BLACK, 0, 0.006, 0);
    const face = group(scr, 0, 0.13, 0.0);
    face.rotation.x = -0.25;
    part(face, rbox(0.38, 0.24, 0.02, 0.008), BLACK, 0, 0, 0);
    out.screen = litScreen(face, painted('polAgenda', 384, 256, paintAgenda), 0.35, 0.21, 0, 0, 0.011);
    part(scr, rbox(0.03, 0.12, 0.02, 0.006), BLACK, 0, 0.065, -0.03);
    // Each place: the nameplate, the mic, the voting buttons, the bill binders.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const lit = group(use, 0, 0, 0);
    const places: Array<[number, string]> = [[-0.5, '박도윤 의원'], [0.5, `${CITY}의회 의원`]];
    const PX = 0.5;
    const paperZ = zf - 0.16;
    for (const [x, name] of places) {
      const sg = Math.sign(x);
      tentCard(g, name, 0.3, x + 0.15 * sg, top, zb + 0.07);
      // The mic's base where the button is (from the papers, see COUNCIL_MIC), bending out to the speaker.
      gooseMic(g, x > 0 ? x - COUNCIL_MIC.side : x + COUNCIL_MIC.side, top, paperZ - COUNCIL_MIC.ahead, x > 0 ? -0.35 : 0.35, x > 0 ? lit : undefined, 0.36, 0.2);
      // The voting buttons on a little console.
      const vb = group(g, x - 0.3 * sg, top, zf - 0.12);
      part(vb, rbox(0.17, 0.03, 0.08, 0.008), '#37474f', 0, 0.015, 0);
      (['#43a047', '#e53935', '#fdd835'] as const).forEach((col, i) => part(vb, cyl(0.016, 0.016, 0.014, 12), col, -0.05 + i * 0.05, 0.035, 0.005, { outline: false }));
      label(vb, '찬  반  기', 0.15, 0.018, 0, 0.031, 0.041, '#37474f', '#ffffff');
      // The bills.
      part(g, rbox(0.24, 0.035, 0.29, 0.008), x > 0 ? NAVY : '#455a64', x - 0.12 * sg, top + 0.018, zb + 0.19, { ry: 0.08 * sg });
      flat(g, painted('polStatement', 256, 362, paintStatement), 0.15, 0.21, x, top + 0.003, paperZ, -0.06 * sg);
      part(g, cyl(0.03, 0.026, 0.1, 12), '#e1f5fe', x + 0.32 * sg, top + 0.05, zc - 0.06, { outline: false });
    }
    pen(g, PX - 0.1, top, paperZ + 0.03, 0.3);
    // In use: the papers spread, a pen out.
    flat(use, painted('polScript', 256, 362, paintScript), 0.15, 0.21, PX - 0.14, top + 0.005, paperZ - 0.01, 0.25);
    // The chairs: high-backed leather, one to a place.
    for (const [x] of places) swivel(g, x, zf + 0.26, Math.PI, MAROON, 0.72);
    const papers = marker(g, PX, top + 0.01, paperZ);
    out.work = papers;
    const speak = sitAt(g, PX, 0.48, zf + 0.26, Math.PI, 'council', papers);
    out.seat = speak.at;
    out.animate = (t) => {
      lit.visible = posed(speak, t) && councilMicOn(t, phaseOf(speak));
    };
    out.spots = { '*': speak, politician_staffBriefing: also(speak, 'meeting') };
  },

  /**
   * The member's own desk (의원 집무 책상): a broad walnut desk on two pedestals with a green inlay,
   * the nameplate facing the room, the 태극기 and the city flag on their stands behind the tall
   * leather chair, a slim monitor, the 결재 folders in a tray, a fountain pen, a framed photo of the
   * district, the seal. Sat behind it facing the room to go through the papers.
   */
  polMemberDesk(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.5, 1.5);
    const d = 0.66;
    const h = 0.76;
    const zc = D / 2 - d / 2 - 0.01;
    const zf = zc + d / 2;
    const zb = zc - d / 2;
    const top = h + 0.027;
    part(g, rbox(w, 0.05, d, 0.015), WALNUT, 0, h, zc);
    part(g, rbox(w - 0.44, 0.006, d - 0.22, 0.004), '#1f4d36', 0, h + 0.026, zc, { outline: false });
    for (const sx of [-1, 1]) {
      const px = sx * (w / 2 - 0.22);
      part(g, rbox(0.4, h - 0.04, d - 0.06, 0.012), shade(WALNUT, 0.92), px, (h - 0.04) / 2, zc);
      // The drawers face the member (-z); the room sees panels.
      for (let i = 0; i < 3; i++) {
        part(g, rbox(0.36, 0.18, 0.015, 0.006), WALNUT, px, 0.13 + i * 0.21, zb + 0.025);
        part(g, rbox(0.1, 0.016, 0.016, 0.006), GOLD, px, 0.16 + i * 0.21, zb + 0.012, { outline: false });
      }
      part(g, rbox(0.36, 0.5, 0.012, 0.006), shade(WALNUT, 1.15), px, 0.38, zf - 0.024, { outline: false });
    }
    part(g, rbox(w - 0.84, 0.5, 0.025, 0.008), shade(WALNUT, 0.85), 0, h - 0.28, zf - 0.04);
    // The nameplate facing the room.
    const np = group(g, 0, top, zf - 0.07);
    part(np, rbox(0.42, 0.1, 0.05, 0.01), '#3e2723', 0, 0.05, 0);
    part(np, rbox(0.44, 0.012, 0.06, 0.004), GOLD, 0, 0.006, 0, { outline: false });
    label(np, `${CITY}의회 의원`, 0.38, 0.065, 0, 0.055, 0.026, '#3e2723', '#f5d76e');
    // The monitor on the left, turned in; the tray of 결재 folders; the pen stand; a photo; the seal.
    const mon = group(g, -0.45, top, zc - 0.05, 0.35 + Math.PI);
    part(mon, rbox(0.16, 0.01, 0.12, 0.005), '#9e9e9e', 0, 0.005, 0);
    part(mon, rbox(0.025, 0.2, 0.02, 0.006), '#9e9e9e', 0, 0.1, -0.02);
    part(mon, rbox(0.46, 0.28, 0.02, 0.008), BLACK, 0, 0.33, 0);
    out.screen = litScreen(mon, painted('polComplaintScreen', 384, 256, paintComplaintScreen), 0.43, 0.25, 0, 0.33, 0.012);
    part(g, rbox(0.28, 0.05, 0.34, 0.008), '#3e2723', 0.45, top + 0.025, zc + 0.02);
    for (let i = 0; i < 3; i++) part(g, rbox(0.24, 0.012, 0.31, 0.004), ['#1a237e', '#004d40', '#4a148c'][i], 0.45, top + 0.055 + i * 0.014, zc + 0.02, { ry: 0.04 * i });
    label(g, '결 재', 0.1, 0.035, 0.45, top + 0.097, zc + 0.02, '#4a148c', '#ffffff').rotation.set(-Math.PI / 2, 0, Math.PI);
    part(g, rbox(0.12, 0.03, 0.08, 0.01), '#212121', 0.2, top + 0.015, zc - 0.2);
    rod(g, new THREE.Vector3(0.2, top + 0.03, zc - 0.2), new THREE.Vector3(0.22, top + 0.14, zc - 0.16), 0.006, '#111111');
    const ph = group(g, -0.2, top, zc + 0.2, Math.PI - 0.3);
    part(ph, rbox(0.14, 0.11, 0.015, 0.006), GOLD, 0, 0.065, 0, { rx: -0.2 });
    picture(ph, painted('polDistrict', 640, 400, paintDistrict), 0.12, 0.085, 0, 0.066, 0.009, '#ffffff', 0, -0.2);
    part(g, cyl(0.035, 0.035, 0.02, 16), '#b71c1c', -0.02, top + 0.01, zc - 0.22);
    part(g, cyl(0.011, 0.012, 0.06, 10), '#efe3c8', 0.05, top + 0.03, zc - 0.21);
    // The flags behind the chair.
    flagStand(g, painted('polTaegeukgi', 300, 200, paintTaegeukgi), -0.82, -D / 2 + 0.2, 0.25, 0.92);
    flagStand(g, painted('polCityFlag', 300, 200, paintCityFlag), 0.82, -D / 2 + 0.2, -0.25, 0.92, -1);
    // In use: the folder open in front of the member, the pen out.
    const use = new THREE.Group();
    g.add(use);
    part(use, rbox(0.46, 0.008, 0.32, 0.004), '#1a237e', 0, top + 0.004, zb + 0.22);
    flat(use, painted('polComplaintForm', 256, 362, paintComplaintForm), 0.2, 0.28, 0.1, top + 0.01, zb + 0.22, Math.PI);
    flat(use, painted('polStatement', 256, 362, paintStatement), 0.2, 0.28, -0.11, top + 0.01, zb + 0.22, Math.PI + 0.05);
    out.inUse = use;
    // Behind the desk, facing the room.
    const chairZ = zb - 0.21;
    swivel(g, 0, chairZ, 0, LEATHER, 0.8);
    const folder = marker(g, 0.06, top + 0.015, zb + 0.2);
    out.work = folder;
    const sign = sitAt(g, 0, 0.48, chairZ, 0, 'write', folder);
    out.seat = sign.at;
    out.spots = { '*': sign };
  },

  /**
   * The briefing backdrop (백드롭) the podium stands in front of: a step-and-repeat banner of the
   * council's emblem and name on its frame and feet, a band across the top with 정례 브리핑, the
   * 태극기 and the city flag on their stands at either end.
   */
  polPressBackdrop(g, W, D, _c, _def, _ctx, _out) {
    const w = Math.min(W - 0.5, 2.5);
    const z = -D / 2 + 0.12;
    const hh = 2.05;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.05, hh + 0.1, 0.05, 0.01), '#b0bec5', sx * (w / 2 + 0.03), (hh + 0.1) / 2, z);
      part(g, rbox(0.08, 0.03, 0.5, 0.01), '#90a4ae', sx * (w / 2 + 0.03), 0.015, z + 0.05);
    }
    part(g, rbox(w + 0.1, 0.05, 0.05, 0.01), '#b0bec5', 0, hh + 0.12, z);
    part(g, box(w, hh - 0.1, 0.02), NAVY, 0, 0.12 + (hh - 0.1) / 2, z - 0.01, { outline: false });
    picture(g, painted('polBackdrop', 768, 576, paintBackdrop), w, hh - 0.1, 0, 0.12 + (hh - 0.1) / 2, z + 0.002);
    flagStand(g, painted('polTaegeukgi', 300, 200, paintTaegeukgi), -W / 2 + 0.2, z + 0.2, 0.35, 0.95);
    flagStand(g, painted('polCityFlag', 300, 200, paintCityFlag), W / 2 - 0.2, z + 0.2, -0.35, 0.95, -1);
  },

  /**
   * The district map (지역구 현안 지도) on the office wall: a cork-framed board with the 선거구's
   * 동s in soft colours, the river and the roads, pins stuck in it (red for 민원, blue for 추진
   * 사업, yellow for 현장 방문), sticky notes of the 현안 beside them, a pen tray with spare pins.
   * Talked through stood beside it, a hand out to a pin.
   */
  polDistrictMap(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.2, 1.75);
    const bh = 1.1;
    const y0 = 0.85;
    const z = -D / 2 + 0.06;
    part(g, rbox(w + 0.08, bh + 0.08, 0.04, 0.012), '#8d6e63', 0, y0 + bh / 2, z);
    part(g, box(w, bh, 0.012), '#c8a77b', 0, y0 + bh / 2, z + 0.02, { outline: false });
    const mw = w - 0.36;
    const mh = bh - 0.12;
    picture(g, painted('polDistrict', 640, 400, paintDistrict), mw, mh, -0.15, y0 + bh / 2, z + 0.028);
    // The pins, each a head on a needle, and sticky notes of the 현안 down the right.
    const mapX = (u: number) => -0.15 - mw / 2 + u * mw;
    const mapY = (v: number) => y0 + bh / 2 + mh / 2 - v * mh;
    const pins: Array<[number, number, string]> = [
      [0.2, 0.3, '#e53935'], [0.33, 0.6, '#e53935'], [0.62, 0.42, '#1e88e5'], [0.78, 0.7, '#1e88e5'], [0.47, 0.82, '#fbc02d'], [0.15, 0.75, '#e53935'], [0.85, 0.3, '#fbc02d'],
    ];
    for (const [u, v, col] of pins) {
      part(g, cyl(0.003, 0.003, 0.04, 6), '#cfd8dc', mapX(u), mapY(v), z + 0.05, { rx: Math.PI / 2, outline: false });
      part(g, ball(0.017), col, mapX(u), mapY(v), z + 0.072);
    }
    const notes: Array<[string, string]> = [['스쿨존 신호등', '#fff59d'], ['공원 쓰레기통', '#c5e1a5'], ['경로당 난방', '#ffcc80'], ['마을버스 배차', '#90caf9']];
    notes.forEach(([s, col], i) => {
      const y = y0 + bh - 0.17 - i * 0.24;
      part(g, box(0.15, 0.15, 0.006), col, w / 2 - 0.12, y, z + 0.03, { rz: (i % 2 ? 1 : -1) * 0.06, outline: false });
      label(g, s, 0.14, 0.04, w / 2 - 0.12, y, z + 0.035, col, '#37474f').rotation.z = (i % 2 ? 1 : -1) * 0.06;
      part(g, ball(0.01), '#e53935', w / 2 - 0.12, y + 0.06, z + 0.04, { outline: false });
    });
    // A string from a note to its pin, the tray along the foot.
    rod(g, new THREE.Vector3(w / 2 - 0.19, y0 + bh - 0.17, z + 0.04), new THREE.Vector3(mapX(0.85), mapY(0.3), z + 0.06), 0.002, '#c62828');
    part(g, rbox(w - 0.1, 0.03, 0.08, 0.008), '#8d6e63', 0, y0 - 0.02, z + 0.06);
    for (let i = 0; i < 4; i++) part(g, cyl(0.008, 0.008, 0.12, 8), ['#e53935', '#1e88e5', '#212121', '#2e7d32'][i], -0.4 + i * 0.07, y0 + 0.005, z + 0.06, { rz: Math.PI / 2, outline: false });
    // In use: a new pin in the hand's place, a fresh note.
    const use = new THREE.Group();
    g.add(use);
    part(use, ball(0.02), '#fbc02d', mapX(0.55), mapY(0.25), z + 0.072);
    part(use, box(0.15, 0.15, 0.006), '#f8bbd0', mapX(0.55) + 0.14, mapY(0.25) + 0.05, z + 0.03, { rz: 0.05, outline: false });
    label(use, '현장 방문', 0.13, 0.04, mapX(0.55) + 0.14, mapY(0.25) + 0.05, z + 0.035, '#f8bbd0', '#37474f');
    out.inUse = use;
    const pin = marker(g, mapX(0.55), mapY(0.25), z + 0.08);
    out.work = pin;
    out.spots = { '*': standAt(g, w / 2 - 0.1, z + 0.62, -0.5, 'present', pin) };
  },

  /**
   * The 민원 상담 창구 in the lobby: a counter-height desk with the staff member's side (+z, their
   * chair, the monitor with the 민원 system and its keyboard) and the constituents' side (-z, their
   * own chairs drawn up), a clear acrylic screen down the middle with a pass-through slot, 민원 상담
   * on a tent plate, the number display on its post, leaflets in a stand, tissues and a cup of water
   * for whoever's sat across. In use the 상담 기록부 is filled in.
   */
  polPetitionDesk(g, W, _D, _c, _def, _ctx, out) {
    const w = W - 0.12;
    const d = 0.72;
    const h = 0.74;
    const zc = -0.05;
    const zf = zc + d / 2;
    const zb = zc - d / 2;
    const top = h + 0.02;
    const body = '#eceff1';
    part(g, rbox(w, 0.04, d, 0.012), '#cfd8dc', 0, h, zc);
    part(g, rbox(w, 0.68, 0.035, 0.012), body, 0, 0.36, zb + 0.03);
    part(g, rbox(w - 0.1, 0.1, 0.01, 0.004), '#00897b', 0, 0.56, zb + 0.008);
    label(g, '민 원 상 담', 0.5, 0.075, 0, 0.56, zb + 0.002, '#00897b', '#ffffff', Math.PI);
    for (const sx of [-1, 1]) part(g, rbox(0.04, h, d - 0.04, 0.01), body, sx * (w / 2 - 0.02), h / 2, zc);
    part(g, rbox(0.4, h - 0.04, d - 0.1, 0.01), '#b0bec5', w / 2 - 0.25, (h - 0.04) / 2, zc + 0.02);
    // The acrylic screen with its slot, held in two clear feet.
    const sh = 0.55;
    glass(g, box(w - 0.3, sh, 0.008), 0, top + 0.08 + sh / 2, zc - 0.02);
    part(g, rbox(w - 0.3, 0.012, 0.01, 0.004), '#b0bec5', 0, top + 0.08 + sh, zc - 0.02, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.04, 0.09, 0.14, 0.01), '#cfd8dc', sx * (w / 2 - 0.18), top + 0.045, zc - 0.02);
    part(g, rbox(0.3, 0.012, 0.02, 0.004), '#b0bec5', -0.1, top + 0.08, zc - 0.02, { outline: false });
    // The number display on its post at the left end, facing the constituents.
    const nd = group(g, -w / 2 + 0.12, top, zb + 0.12, Math.PI);
    part(nd, cyl(0.015, 0.015, 0.3, 8), '#90a4ae', 0, 0.15, 0, { outline: false });
    part(nd, rbox(0.2, 0.1, 0.05, 0.01), '#212121', 0, 0.34, 0);
    label(nd, '017', 0.16, 0.06, 0, 0.34, 0.026, '#212121', '#ff3d00');
    // The staff side: the monitor turned to them, the keyboard, the 상담 기록부 and the pen.
    const mon = group(g, 0.12, top, zc + 0.04);
    part(mon, rbox(0.16, 0.012, 0.12, 0.006), BLACK, 0, 0.006, 0);
    part(mon, rbox(0.035, 0.18, 0.025, 0.008), BLACK, 0, 0.09, -0.03);
    part(mon, rbox(0.44, 0.28, 0.03, 0.01), BLACK, 0, 0.3, 0);
    out.screen = litScreen(mon, painted('polComplaintScreen', 384, 256, paintComplaintScreen), 0.41, 0.25, 0, 0.3, 0.017);
    part(g, rbox(0.34, 0.014, 0.12, 0.006), '#37474f', 0.08, top + 0.007, zf - 0.15);
    part(g, box(0.32, 0.004, 0.1), '#eceff1', 0.08, top + 0.016, zf - 0.15, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#37474f', 0.32, top + 0.01, zf - 0.14);
    const formX = -0.3;
    const formZ = zf - 0.18;
    flat(g, painted('polComplaintForm', 256, 362, paintComplaintForm), 0.16, 0.22, formX, top + 0.002, formZ, 0.1);
    pen(g, formX + 0.12, top, formZ, 0.5);
    tentCard(g, '민원 상담', 0.3, -0.5, top, zb + 0.08, '#e0f2f1', '#00695c');
    // The constituents' side: leaflets in a stand, tissues, a cup of water.
    const lf = group(g, 0.62, top, zb + 0.12, Math.PI);
    part(lf, rbox(0.2, 0.16, 0.06, 0.008), '#cfd8dc', 0, 0.08, 0, { rx: -0.15 });
    for (let i = 0; i < 3; i++) part(lf, box(0.055, 0.14, 0.005), ['#4fc3f7', '#aed581', '#ffb74d'][i], -0.065 + i * 0.065, 0.12, 0.03, { rx: -0.15, outline: false });
    part(g, rbox(0.2, 0.08, 0.11, 0.012), '#ffffff', 0.25, top + 0.04, zb + 0.14);
    part(g, box(0.06, 0.04, 0.03), '#ffffff', 0.25, top + 0.09, zb + 0.14, { outline: false });
    part(g, cyl(0.03, 0.026, 0.09, 12), '#e1f5fe', -0.2, top + 0.045, zb + 0.14, { outline: false });
    // In use: a second form passed under the screen, a highlighter.
    const use = new THREE.Group();
    g.add(use);
    flat(use, painted('polComplaintForm', 256, 362, paintComplaintForm), 0.16, 0.22, -0.1, top + 0.004, zc - 0.17, Math.PI - 0.1);
    part(use, cyl(0.007, 0.007, 0.11, 8), '#ffeb3b', formX - 0.1, top + 0.01, formZ + 0.02, { rz: Math.PI / 2, ry: -0.5, outline: false });
    out.inUse = use;
    swivel(g, 0, zf + 0.26, Math.PI, '#00695c', 0.55);
    const keys = marker(g, 0.08, top + 0.02, zf - 0.15);
    const form = marker(g, formX, top + 0.01, formZ);
    out.work = keys;
    const type = sitAt(g, 0, 0.48, zf + 0.26, Math.PI, 'type', keys);
    out.seat = type.at;
    out.spots = { '*': type, politician_listeningTour: also(type, 'write', form) };
  },

  /**
   * The 민원 filing cabinet: grey steel, four drawers labelled 접수 · 처리 중 · 완료 · 조례·자료 with
   * their card holders and handles, the 2026 민원 대장 and a tray of folders on top. A file's looked
   * out with the second drawer pulled out, its hanging folders and coloured tabs showing.
   */
  polPetitionCabinet(g, _W, D, _c, _def, _ctx, out) {
    const w = 0.5;
    const d = 0.6;
    const H = 1.32;
    const zc = -D / 2 + d / 2 + 0.04;
    const zf = zc + d / 2;
    part(g, rbox(w, H, d, 0.015), STEELGREY, 0, H / 2, zc);
    part(g, rbox(w + 0.01, 0.02, d + 0.01, 0.006), shade(STEELGREY, 0.8), 0, H + 0.005, zc);
    const labels = ['접수', '처리 중', '완료', '조례·자료'];
    const dh = (H - 0.08) / 4;
    const drawerY = (i: number) => H - 0.04 - dh * (i + 0.5);
    const front = (parent: THREE.Object3D, i: number, z: number) => {
      const y = drawerY(i);
      part(parent, rbox(w - 0.04, dh - 0.03, 0.02, 0.006), shade(STEELGREY, 1.08), 0, y, z);
      part(parent, rbox(0.12, 0.05, 0.008, 0.003), '#cfd8dc', 0, y + 0.07, z + 0.012, { outline: false });
      label(parent, labels[i], 0.11, 0.04, 0, y + 0.07, z + 0.017, '#ffffff', '#263238');
      part(parent, rbox(0.16, 0.025, 0.03, 0.008), '#455a64', 0, y - 0.02, z + 0.02);
    };
    for (const i of [0, 2, 3]) front(g, i, zf);
    // The second drawer: shut, or pulled out with its hanging folders.
    const idle = new THREE.Group();
    g.add(idle);
    front(idle, 1, zf);
    const use = new THREE.Group();
    g.add(use);
    const pull = 0.38;
    front(use, 1, zf + pull);
    const y1 = drawerY(1);
    for (const sx of [-1, 1]) part(use, box(0.012, dh - 0.08, pull), shade(STEELGREY, 0.9), sx * (w / 2 - 0.04), y1 - 0.02, zf + pull / 2, { outline: false });
    part(use, box(w - 0.08, 0.01, pull), shade(STEELGREY, 0.8), 0, y1 - dh / 2 + 0.03, zf + pull / 2, { outline: false });
    const tabCols = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00'];
    for (let i = 0; i < 9; i++) {
      const fz = zf + 0.03 + i * 0.038;
      part(use, box(w - 0.1, dh - 0.1, 0.006), i === 4 ? '#ffe082' : '#d7ccc8', 0, y1 - 0.02 + (i === 4 ? 0.06 : 0), fz, { outline: false });
      part(use, box(0.06, 0.03, 0.006), tabCols[i % tabCols.length], -0.12 + (i % 4) * 0.08, y1 + dh / 2 - 0.05 + (i === 4 ? 0.06 : 0), fz, { outline: false });
    }
    out.inUse = use;
    out.idle = idle;
    // On top: the 민원 대장 and a tray of folders.
    part(g, rbox(0.22, 0.05, 0.3, 0.008), '#1a237e', -0.1, H + 0.04, zc, { ry: 0.1 });
    label(g, '2026 민원 대장', 0.16, 0.035, -0.1, H + 0.066, zc, '#1a237e', '#ffffff').rotation.set(-Math.PI / 2, 0, 0.1);
    part(g, rbox(0.2, 0.06, 0.28, 0.006), '#455a64', 0.13, H + 0.04, zc);
    for (let i = 0; i < 3; i++) part(g, box(0.18, 0.01, 0.26), ['#fff176', '#90caf9', '#ef9a9a'][i], 0.13, H + 0.05 + i * 0.012, zc, { outline: false });
    const hand = marker(g, 0, y1 + 0.03, zf + 0.2);
    out.work = hand;
    out.spots = { '*': standAt(g, 0.05, zf + 0.62, Math.PI, 'rummage', hand) };
  },

  /**
   * A civic group's signature stand on the pavement (2026-11-04, the branch lots): a white pop-up canopy on four grey legs, the
   * group's name on its orange valance (함께여는 시민모임, made up), a folding table under a printed cloth with what the petition
   * asks, clipboards of signature sheets and a pot of pens, a stack of leaflets, a hand-painted picket leaning on a leg. A passer-by
   * is asked to sign stood at the table; a statement is read out in front of it, facing the street, the banner behind.
   */
  actSignBooth(g, W, D, _c, _def, _ctx, out) {
    const ORANGE = '#ef6c00';
    const cw = W - 0.1;
    const cd = D - 0.08;
    const ch = 2.15;
    // The canopy: four legs, the roof, the valance with the group's name front and back.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.022, 0.022, ch, 8), '#90a4ae', sx * (cw / 2 - 0.03), ch / 2, sz * (cd / 2 - 0.03), { outline: false });
    part(g, box(cw, 0.04, cd), '#fafafa', 0, ch + 0.06, 0);
    part(g, box(cw * 0.5, 0.16, cd * 0.5), '#fafafa', 0, ch + 0.14, 0);
    for (const sz of [-1, 1]) {
      part(g, box(cw, 0.2, 0.01), ORANGE, 0, ch - 0.05, sz * (cd / 2), { outline: false });
      label(g, '함께여는 시민모임', 0.9, 0.13, 0, ch - 0.05, sz * (cd / 2 + 0.006), ORANGE, '#ffffff', sz > 0 ? 0 : Math.PI);
    }
    for (const sx of [-1, 1]) part(g, box(0.01, 0.2, cd), ORANGE, sx * (cw / 2), ch - 0.05, 0, { outline: false });
    // The folding table and its printed cloth with what the petition asks.
    const tw = 1.5;
    const td = 0.55;
    const th = 0.74;
    const tz = -0.08;
    part(g, rbox(tw, 0.03, td, 0.01), '#eceff1', 0, th, tz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.014, th, 6), '#78909c', sx * (tw / 2 - 0.06), th / 2, tz + sz * (td / 2 - 0.05), { outline: false });
    part(g, box(tw + 0.02, 0.5, 0.01), '#fff3e0', 0, th - 0.24, tz + td / 2 + 0.006, { outline: false });
    picture(g, painted('actPetitionCloth', 600, 200, paintPetitionCloth), tw - 0.04, 0.46, 0, th - 0.24, tz + td / 2 + 0.013);
    // On the table: clipboards of signature sheets, a pot of pens, leaflets.
    for (const [x, ry] of [[-0.42, 0.08], [0.05, -0.05]] as Array<[number, number]>) {
      part(g, rbox(0.24, 0.012, 0.32, 0.004), '#8d6e63', x, th + 0.022, tz + 0.06, { ry });
      flat(g, painted('actSignSheet', 256, 340, paintSignSheet), 0.21, 0.28, x, th + 0.03, tz + 0.07, ry);
      part(g, rbox(0.1, 0.02, 0.03, 0.004), '#b0bec5', x, th + 0.035, tz - 0.08, { ry });
    }
    part(g, cyl(0.035, 0.03, 0.1, 10), ORANGE, 0.36, th + 0.065, tz - 0.12);
    for (let i = 0; i < 4; i++) part(g, cyl(0.004, 0.004, 0.14, 6), ['#1a237e', '#212121', '#c62828', '#1a237e'][i], 0.34 + (i % 2) * 0.03, th + 0.13, tz - 0.13 + Math.floor(i / 2) * 0.02, { rz: (i - 1.5) * 0.1, outline: false });
    for (let i = 0; i < 5; i++) part(g, box(0.15, 0.004, 0.21), i % 2 ? '#ffe0b2' : '#ffcc80', 0.58, th + 0.02 + i * 0.005, tz + 0.02, { ry: 0.05 * i, outline: false });
    // The picket stood at the table's left end, leaning back on it, facing the street.
    const pk = group(g, -cw / 2 + 0.27, 0, tz + td / 2 + 0.16);
    pk.rotation.x = -0.12;
    part(pk, box(0.025, 1.2, 0.025), '#a1887f', 0, 0.6, 0);
    part(pk, box(0.5, 0.36, 0.01), '#fffde7', 0, 1.12, 0.02);
    label(pk, '안전한 통학로!', 0.44, 0.1, 0, 1.17, 0.027, '#fffde7', '#c62828');
    label(pk, '서명해 주세요', 0.36, 0.07, 0, 1.04, 0.027, '#fffde7', '#37474f');
    // In use: a sheet turned to a fresh page, a pen out on it.
    const use = new THREE.Group();
    g.add(use);
    flat(use, painted('actSignSheet', 256, 340, paintSignSheet), 0.21, 0.28, -0.2, th + 0.03, tz + 0.12, 0.2);
    pen(use, -0.18, th + 0.035, tz + 0.12, 0.6);
    out.inUse = use;
    const sheet = marker(g, -0.2, th + 0.04, tz + 0.12);
    out.work = sheet;
    // Asking to sign, stood at the table; the statement, facing the street with the banner behind.
    const ask = standAt(g, -0.2, D / 2 + 0.3, Math.PI, 'talk', sheet);
    const speak = standAt(g, 0.3, D / 2 + 0.25, 0, 'gesture');
    out.spots = { '*': ask, actStreetCampaign: speak };
  },

  /**
   * The 본회의장's 의장석 (2026-11-05, the layout audit), 3 × 2 at the head of the chamber, its back to the wall: the panelled
   * walnut wall behind with the council's emblem in its brass ring and 새솔시의회 under it, the 태극기 and the city flag on their
   * stands either side; the dais two steps up, the 의장's desk across its middle with the nameplate, the gavel on its block and a
   * gooseneck, the high-backed chair behind; a step down on either side the desks of the 사무국장 and the 의사 담당, each with a
   * monitor and the order of business.
   */
  polSpeakerDais(g, W, D) {
    const back = -D / 2;
    // The wall behind: panels, the emblem, the name, a valance along the top.
    part(g, box(W - 0.04, 2.7, 0.08), shade(WALNUT, 0.85), 0, 1.35, back + 0.05);
    for (const x of [-1, 0, 1]) part(g, rbox(0.86, 2.2, 0.02, 0.01), PANEL, x * 0.98, 1.3, back + 0.1, { outline: false });
    part(g, cyl(0.36, 0.36, 0.03, 36), GOLD, 0, 2.05, back + 0.12, { rx: Math.PI / 2 });
    const em = picture(g, painted('polEmblem', 128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      paintEmblem(c, 64, 64, 62);
    }), 0.64, 0.64, 0, 2.05, back + 0.14);
    (em.material as THREE.MeshBasicMaterial).transparent = true;
    part(g, rbox(1.3, 0.16, 0.02, 0.01), '#3e2723', 0, 1.6, back + 0.11);
    label(g, COUNCIL, 1.2, 0.13, 0, 1.6, back + 0.125, '#3e2723', '#e8c766');
    part(g, box(W - 0.04, 0.12, 0.14), MAROON, 0, 2.66, back + 0.12);
    // The dais: two steps up across the front, the platform.
    const ph = 0.4;
    part(g, rbox(W - 0.1, ph, D - 0.45, 0.02), shade(WALNUT, 1.05), 0, ph / 2, back + 0.15 + (D - 0.45) / 2);
    part(g, rbox(W - 0.1, ph / 2, 0.3, 0.02), shade(WALNUT, 1.1), 0, ph / 4, D / 2 - 0.3);
    part(g, box(W - 0.14, 0.006, D - 0.5), MAROON, 0, ph + 0.003, back + 0.15 + (D - 0.5) / 2, { outline: false });
    // The 의장's desk: a panelled front with the emblem, the top, the nameplate, the gavel, a mic; the chair behind.
    const dz = 0.05;
    const dh = 0.78;
    part(g, rbox(1.3, dh, 0.06, 0.012), WALNUT, 0, ph + dh / 2, dz + 0.22);
    part(g, rbox(0.9, dh - 0.2, 0.012, 0.006), PANEL, 0, ph + dh / 2, dz + 0.256, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.06, dh, 0.5, 0.01), WALNUT, sx * 0.62, ph + dh / 2, dz);
    part(g, rbox(1.38, 0.05, 0.58, 0.015), shade(WALNUT, 1.18), 0, ph + dh, dz);
    const top = ph + dh + 0.025;
    tentCard(g, '의 장', 0.3, 0, top, dz + 0.2, '#3e2723', '#f5d76e');
    part(g, rbox(0.14, 0.03, 0.1, 0.01), '#3e2723', 0.4, top + 0.015, dz + 0.02);
    const gavel = group(g, 0.4, top + 0.06, dz + 0.02, 0.5);
    part(gavel, cyl(0.03, 0.03, 0.12, 12), '#5d4037', 0, 0, 0, { rz: Math.PI / 2 });
    part(gavel, cyl(0.008, 0.008, 0.2, 8), '#6d4c41', 0, 0, 0.1, { rx: Math.PI / 2, outline: false });
    gooseMic(g, -0.25, top, dz + 0.1, Math.PI, undefined, 0.32, 0.12);
    flat(g, painted('polAgendaSheet', 256, 362, paintStatement), 0.2, 0.28, 0.05, top + 0.004, dz - 0.08, Math.PI);
    const chair = group(g, 0, ph, dz - 0.5);
    swivel(chair, 0, 0, 0, MAROON, 0.95);
    // The side desks, a step down: the 사무국장's and the 의사 담당's.
    for (const sx of [-1, 1]) {
      const s = group(g, sx * 1.12, 0, dz + 0.15);
      part(s, rbox(0.6, 0.72, 0.4, 0.01), WALNUT, 0, 0.36 + 0.2, 0.1);
      part(s, rbox(0.66, 0.04, 0.46, 0.01), shade(WALNUT, 1.18), 0, 0.94, 0.08);
      part(s, rbox(0.3, 0.2, 0.02, 0.006), BLACK, 0, 1.08, -0.02, { rx: -0.2 });
      part(s, rbox(0.62, 0.2, 0.36, 0.01), shade(WALNUT, 0.9), 0, 0.1, 0.1);
      swivel(s, 0, -0.35, 0, LEATHER, 0.55).position.y = 0.2;
    }
    // The flags either side of the 의장's chair.
    flagStand(g, painted('polTaegeukgi', 300, 200, paintTaegeukgi), -1.3, back + 0.3, 0.2, 1.0, -1);
    flagStand(g, painted('polCityFlag', 300, 200, paintCityFlag), 1.3, back + 0.3, -0.2, 1.0, 1);
  },

  /**
   * Out front of the council building (2026-11-05, the layout audit), 3 × 1 on the pavement: the granite name stone with 새솔시의회
   * cut into it and gilded, on its low plinth, the planting round it; behind, three flagpoles of brushed steel, the 태극기 in the
   * middle and highest, the city's flag and the council's either side.
   */
  polCouncilSign(g, W, D) {
    part(g, rbox(W - 0.2, 0.12, D - 0.2, 0.02), '#9e9e9e', 0, 0.06, 0);
    part(g, rbox(W - 0.4, 0.08, D - 0.4, 0.02), '#6d8b4e', 0, 0.14, 0, { outline: false });
    const stone = group(g, -0.45, 0.12, 0.12);
    part(stone, rbox(1.5, 0.75, 0.32, 0.05), '#5f5f62', 0, 0.42, 0);
    part(stone, rbox(1.36, 0.6, 0.01, 0.02), '#4a4a4d', 0, 0.44, 0.165, { outline: false });
    label(stone, COUNCIL, 1.2, 0.26, 0, 0.47, 0.172, '#4a4a4d', '#e8c766');
    label(stone, 'SAESOL CITY COUNCIL', 1.0, 0.07, 0, 0.26, 0.172, '#4a4a4d', '#d7ccc8');
    const flags: Array<[number, number, THREE.Texture]> = [
      [-0.95, 5.2, painted('polCityFlag', 300, 200, paintCityFlag)],
      [0, 5.6, painted('polTaegeukgi', 300, 200, paintTaegeukgi)],
      [0.95, 5.2, painted('polCouncilFlag', 300, 200, (c) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, 300, 200);
        paintEmblem(c, 150, 86, 60);
        text(c, COUNCIL, 150, 175, 26, NAVY, 'center');
      })],
    ];
    for (const [x, h, tex] of flags) {
      part(g, cyl(0.07, 0.09, 0.1, 12), '#78909c', x, 0.17, -0.25);
      part(g, cyl(0.025, 0.035, h, 10), '#cfd8dc', x, h / 2, -0.25, { outline: false });
      part(g, ball(0.045), GOLD, x, h + 0.04, -0.25);
      const cloth = picture(g, tex, 0.75, 0.5, x + 0.4, h - 0.3, -0.25);
      (cloth.material as THREE.Material).side = THREE.DoubleSide;
    }
  },
};

/** The cloth on the signature table: what the petition asks (made up). */
const paintPetitionCloth: Paint = (c) => {
  c.fillStyle = '#fff3e0';
  c.fillRect(0, 0, 600, 200);
  c.fillStyle = '#ef6c00';
  c.fillRect(0, 0, 600, 46);
  text(c, '시민 서명 운동', 300, 25, 28, '#ffffff', 'center');
  text(c, '어린이 통학로에 보도와 신호등을!', 300, 92, 30, '#bf360c', 'center');
  text(c, '새솔동 3개 초등학교 학부모·주민 함께', 300, 140, 20, '#5d4037', 'center', false);
  text(c, '목표 5,000명', 300, 176, 20, '#5d4037', 'center');
};
/** A signature sheet: a header and ruled lines, a few names filled in. */
const paintSignSheet: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 340);
  text(c, '서명 용지', 128, 24, 20, '#bf360c', 'center');
  c.strokeStyle = '#b0bec5';
  c.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    c.beginPath();
    c.moveTo(14, 54 + i * 24);
    c.lineTo(242, 54 + i * 24);
    c.stroke();
  }
  ['김○○', '이○○', '박○○', '최○○', '정○○'].forEach((s, i) => text(c, s, 22, 66 + i * 24, 14, '#1a237e', 'left', false));
};
