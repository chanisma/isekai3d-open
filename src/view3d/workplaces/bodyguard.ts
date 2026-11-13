import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';
import { pavementSign } from './dentist';
import { CHECKPOINTS, CONE, DUMMY, MAT, NOTEPAD, ROUTE, WAND, bgPhase, defenseAt, formationAt, tokenAt, wandAt } from './bodyguardMotion';

/**
 * The 경호 업체 drawn as itself (2026-10-27 workplace pipeline, at the user's request): the training
 * hall's sparring mats with a padded takedown dummy and a VIP cone for the formation drill, the
 * 작전실's route-planning table (the motorcade route on a city map, the crowd flow on a venue plan),
 * the radio rack with its earpieces and the black escort sedan that drives off on a job — and what
 * the firm was missing (workFurniture/bodyguard.ts): the 상황실's CCTV command desk, the briefing
 * screen with the day's VIP schedule, the suit lockers and a walk-through metal-detector gate.
 *
 * Every drill is professional and non-violent: blocks, palm strikes on a pad, a controlled takedown
 * and pin on a dummy, nothing else. The firm (한결시큐리티), the VIP (한결그룹 윤태성 회장), the
 * places on the maps and the plates are all made up. The motions are in bodyguardMotion.ts.
 */

const GUNMETAL = '#37414a';
const STEEL = '#8e99a3';
const NAVY = '#1b2a41';
const SUIT = '#1d1f24';
const VINYL = '#2a2b2f';
const PAD_RED = '#c62828';
const FIRM = '한결시큐리티';
/** See-through parts, shared: an earpiece's clear coil, the car's tinted glass, a mirror, a water bottle. */
const COIL = new THREE.MeshToonMaterial({ color: '#e1f5fe', transparent: true, opacity: 0.55, depthWrite: false });
const TINT = new THREE.MeshToonMaterial({ color: '#25303a', transparent: true, opacity: 0.55, depthWrite: false });
const MIRROR = new THREE.MeshToonMaterial({ color: '#cfe8f3' });
const BOTTLE = new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.7 });

// ---------------------------------------------------------------------------------------------
// Small parts.

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
/** Which of a piece's spots is being used just now, if any. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (posed(s, t) && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** The clock offset of a fixed mark on the piece (as the motion takes it from its `work`). */
const phaseOf = (m: THREE.Object3D) => bgPhase(m.getWorldPosition(tmp));

/** A spot stood at (`y` the floor under the feet), facing `yaw`, and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, y = 0): Spot {
  const s = spot(g, 'stand', x, y, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot sat at (the seat's top `y`, over the floor `drop` below), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, drop = y): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, drop);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A picture lying flat on a top, its top edge away from the viewer at +z. */
const flat = (g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number) => picture(g, tex, w, h, x, y, z, '#ffffff', 0, -Math.PI / 2);

/** A swivel chair facing +z: five-star base, gas lift, the seat's top at 0.48, a mesh back. */
function swivel(g: THREE.Object3D, x: number, z: number, ry: number, color: string): THREE.Group {
  const c = group(g, x, 0, z, ry);
  starBase(c, 0, 0, 0.26, BLACK);
  part(c, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.5, 0.09, 0.48, 0.04), color, 0, 0.435, 0);
  part(c, rbox(0.48, 0.6, 0.08, 0.05), color, 0, 0.8, -0.24, { rx: -0.1 });
  part(c, rbox(0.4, 0.44, 0.02, 0.04), shade(color, 1.4), 0, 0.8, -0.195, { rx: -0.1, outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.04, 0.3, 0.015), color, sx * 0.27, 0.67, 0.0);
    part(c, rbox(0.03, 0.18, 0.03, 0.01), CHROME, sx * 0.27, 0.57, 0.04, { outline: false });
  }
  return c;
}

/** A handheld radio standing up (its front to +z): body, keypad, a little screen, the aerial, the PTT key on its side. */
function radio(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, lit = true): THREE.Group {
  const r = group(g, x, y, z, ry);
  part(r, rbox(0.06, 0.15, 0.035, 0.01), '#1f2125', 0, 0.075, 0);
  part(r, box(0.042, 0.022, 0.003), lit ? '#9ccc65' : '#455a64', 0, 0.118, 0.0185, { outline: false, material: lit ? glow('#aed581') : undefined });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) part(r, box(0.012, 0.008, 0.003), '#555b61', -0.013 + j * 0.026, 0.085 - i * 0.016, 0.0185, { outline: false });
  part(r, cyl(0.006, 0.005, 0.11, 6), '#111', 0.017, 0.2, -0.004, { outline: false });
  part(r, cyl(0.009, 0.009, 0.014, 8), '#ff7043', -0.016, 0.158, 0, { outline: false });
  part(r, box(0.004, 0.035, 0.012), '#3a3d42', -0.031, 0.1, 0, { outline: false });
  return r;
}

/** A coiled acoustic-tube earpiece hanging from (x, y, z): the clear coil, the clip and PTT mic, the earbud. */
function earpiece(g: THREE.Object3D, x: number, y: number, z: number) {
  for (let i = 0; i < 6; i++) glass(g, ring(0.012, 0.0025), x, y - 0.03 - i * 0.012, z + 0.012, COIL, Math.PI / 2 - 0.25);
  part(g, cyl(0.002, 0.002, 0.16, 5), '#222', x + 0.012, y - 0.16, z + 0.01, { outline: false });
  part(g, rbox(0.018, 0.04, 0.012, 0.004), '#222', x + 0.012, y - 0.25, z + 0.012, { outline: false });
  part(g, ball(0.007), '#222', x - 0.004, y - 0.11, z + 0.014, { outline: false });
}

/** A black traffic cone with a 'VIP' card on a stick. */
function vipCone(g: THREE.Object3D, x: number, z: number) {
  const c = group(g, x, MAT, z);
  part(c, rbox(0.2, 0.02, 0.2, 0.01), '#212121', 0, 0.01, 0);
  part(c, cyl(0.022, 0.085, 0.34, 16), '#ff6d00', 0, 0.19, 0);
  part(c, cyl(0.05, 0.068, 0.06, 16), '#f5f5f5', 0, 0.2, 0, { outline: false });
  rod(c, new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0, 0.52, 0), 0.005, '#9e9e9e');
  label(c, 'VIP', 0.14, 0.08, 0, 0.52, 0.004, '#fdd835', '#111111');
  label(c, 'VIP', 0.14, 0.08, 0, 0.52, -0.004, '#fdd835', '#111111', Math.PI);
}

/**
 * The padded takedown dummy, its heels' back edge (its pivot) at the group's origin, standing up +y
 * and facing -x: black vinyl legs, hips and torso stitched in panels, a red strike pad on its
 * chest, its arms angled out in front, a padded head. Tips over toward +x about its pivot.
 */
function takedownDummy(parent: THREE.Object3D): THREE.Group {
  const d = group(parent, DUMMY.pivot, MAT, 0);
  const R = DUMMY.R;
  const cx = -R;
  // Feet block, legs, hips.
  part(d, rbox(0.24, 0.06, 0.3, 0.02), '#1c1c1f', cx, 0.03, 0);
  for (const sz of [-1, 1]) {
    part(d, rbox(0.15, 0.68, 0.13, 0.05), VINYL, cx, 0.4, sz * 0.08);
    part(d, box(0.152, 0.01, 0.132), '#4a4b50', cx, 0.45, sz * 0.08, { outline: false });
  }
  part(d, rbox(0.22, 0.16, 0.34, 0.06), VINYL, cx, 0.8, 0);
  // Torso, the seams, the red strike pad with its target ring.
  part(d, rbox(2 * R, 0.44, 0.4, 0.08), VINYL, cx, 1.04, 0);
  for (const y of [0.9, 1.18]) part(d, box(2 * R + 0.004, 0.006, 0.402), '#4a4b50', cx, y, 0, { outline: false });
  part(d, rbox(0.045, 0.27, 0.3, 0.03), PAD_RED, -2 * R - 0.01, DUMMY.chest, 0);
  part(d, ring(0.06, 0.008), '#ffeb3b', -2 * R - 0.034, DUMMY.chest, 0, { ry: Math.PI / 2, outline: false });
  // Shoulders, arms angled out ahead, the padded head with its face guard.
  for (const sz of [-1, 1]) {
    part(d, ball(0.09), VINYL, cx, DUMMY.shoulder, sz * 0.19);
    rod(d, new THREE.Vector3(cx, DUMMY.shoulder - 0.02, sz * 0.21), new THREE.Vector3(cx - 0.2, 0.9, sz * 0.25), 0.055, VINYL);
    part(d, ball(0.06), '#1c1c1f', cx - 0.2, 0.9, sz * 0.25, { outline: false });
  }
  part(d, cyl(0.06, 0.07, 0.1, 12), VINYL, cx, 1.25, 0);
  part(d, ball(0.11), VINYL, cx, DUMMY.head, 0).scale.set(1, 1.08, 0.95);
  part(d, rbox(0.03, 0.12, 0.14, 0.012), PAD_RED, cx - 0.105, DUMMY.head - 0.01, 0);
  return d;
}

/** A small black sedan token (the motorcade) or a blue pawn (a crowd group) on a map, at its middle's foot. */
function carToken(g: THREE.Object3D): THREE.Group {
  const c = group(g);
  part(c, rbox(0.07, 0.018, 0.035, 0.008), '#111', 0, 0.012, 0);
  part(c, rbox(0.038, 0.014, 0.03, 0.006), '#263238', -0.004, 0.026, 0, { outline: false });
  part(c, box(0.004, 0.006, 0.03), '#fffde7', 0.036, 0.012, 0, { outline: false, material: glow('#fffde7') });
  return c;
}
function pawnToken(g: THREE.Object3D): THREE.Group {
  const c = group(g);
  part(c, cyl(0.016, 0.02, 0.012, 12), '#1565c0', 0, 0.006, 0);
  part(c, cyl(0.008, 0.013, 0.025, 10), '#1e88e5', 0, 0.024, 0, { outline: false });
  part(c, ball(0.011), '#42a5f5', 0, 0.042, 0, { outline: false });
  return c;
}

// ---------------------------------------------------------------------------------------------
// What's painted: the maps, the CCTV feeds, the VIP schedule.

/** Map pixels for a point (dx, dz) from the map's middle (dx across, dz toward the planner). */
const mapPx = (dx: number, dz: number, w: number, d: number, cw: number, ch: number): [number, number] => [((dx + w / 2) / w) * cw, ((dz + d / 2) / d) * ch];
const MAP_W = 0.84;
const MAP_D = 0.66;

/** The city map: blocks, a river, a park, the hotel and the venue, the motorcade route with checkpoints 1–3. */
const cityMap: Paint = (c) => {
  const W = 420;
  const Hh = 330;
  c.fillStyle = '#eef0e6';
  c.fillRect(0, 0, W, Hh);
  // The river across the top, the park, the blocks in their grid of streets.
  c.fillStyle = '#9fd0ea';
  c.beginPath();
  c.moveTo(0, 30);
  c.bezierCurveTo(120, 10, 260, 62, 420, 28);
  c.lineTo(420, 62);
  c.bezierCurveTo(260, 92, 120, 40, 0, 62);
  c.fill();
  text(c, '한결강', 330, 52, 13, '#2d6b8f');
  c.fillStyle = '#c5e1a5';
  c.fillRect(250, 210, 100, 70);
  text(c, '시민공원', 300, 246, 12, '#33691e', 'center');
  const rnd = seeded(9);
  c.fillStyle = '#d9d6cc';
  for (let x = 12; x < W - 20; x += 46)
    for (let y = 80; y < Hh - 20; y += 40) {
      if (x > 240 && x < 356 && y > 200 && y < 284) continue;
      c.fillRect(x, y, 34 + rnd() * 6, 28);
    }
  c.strokeStyle = '#fafafa';
  c.lineWidth = 6;
  for (const y of [74, 154, 234, 314]) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
  for (const x of [52, 144, 236, 328]) {
    c.beginPath();
    c.moveTo(x, 66);
    c.lineTo(x, Hh);
    c.stroke();
  }
  // A bridge over the river.
  c.fillStyle = '#b0bec5';
  c.fillRect(320, 16, 12, 60);
  // The route: a wide red line with a dashed alternative in grey.
  const pts = ROUTE.map(([x, z]) => mapPx(x, z, MAP_W, MAP_D, W, Hh));
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 4;
  c.setLineDash([8, 8]);
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  c.lineTo(pts[0][0] + 60, pts[0][1]);
  c.lineTo(pts[pts.length - 1][0], pts[0][1] - 20);
  c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  c.stroke();
  c.setLineDash([]);
  c.strokeStyle = '#d32f2f';
  c.lineWidth = 7;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  // Start (the hotel), the venue, the checkpoints.
  const [sx, sy] = pts[0];
  c.fillStyle = '#1a237e';
  c.fillRect(sx - 18, sy - 2, 36, 26);
  text(c, 'H', sx, sy + 11, 16, '#ffffff', 'center');
  text(c, '출발 · 그랜드 호텔', sx + 22, sy + 14, 12, '#1a237e');
  const [ex, ey] = pts[pts.length - 1];
  c.fillStyle = '#f9a825';
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 7 : 16;
    c.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r);
  }
  c.fill();
  text(c, '시민홀 (행사장)', ex - 20, ey + 26, 12, '#e65100', 'center');
  CHECKPOINTS.forEach(([x, z], i) => {
    const [px, py] = mapPx(x, z, MAP_W, MAP_D, W, Hh);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(px + 16, py - 14, 10, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#d32f2f';
    c.lineWidth = 2;
    c.stroke();
    text(c, String(i + 1), px + 16, py - 13, 12, '#d32f2f', 'center');
  });
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.fillRect(6, 300, 150, 24);
  text(c, '주 경로 4.2km · 예비 경로', 12, 312, 11, '#37474f');
};

/** The venue plan: the stage, the seat blocks, gates A–C, the barriers and the audience flow along the same path. */
const venueMap: Paint = (c) => {
  const W = 420;
  const Hh = 330;
  c.fillStyle = '#f4f6f8';
  c.fillRect(0, 0, W, Hh);
  c.strokeStyle = '#455a64';
  c.lineWidth = 4;
  c.strokeRect(8, 8, W - 16, Hh - 16);
  // The stage at the top right, the seat blocks, the VIP box.
  c.fillStyle = '#37474f';
  c.fillRect(250, 14, 150, 36);
  text(c, '무대', 325, 32, 15, '#ffffff', 'center');
  c.fillStyle = '#fdd835';
  c.fillRect(318, 58, 50, 20);
  text(c, 'VIP석', 343, 68, 11, '#111', 'center');
  c.fillStyle = '#cfd8dc';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.fillRect(180 + i * 72, 92 + j * 58, 60, 46);
  // The gates down the bottom.
  const gates: Array<[number, string]> = [[60, 'A'], [200, 'B'], [340, 'C']];
  for (const [x, n] of gates) {
    c.fillStyle = '#ffffff';
    c.fillRect(x - 22, Hh - 18, 44, 14);
    text(c, `게이트 ${n}`, x, Hh - 28, 11, '#37474f', 'center');
  }
  // The flow: blue arrows along the path, grey barrier lines either side.
  const pts = ROUTE.map(([x, z]) => mapPx(x, z, MAP_W, MAP_D, W, Hh));
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 2;
  for (const off of [-14, 14]) {
    c.setLineDash([6, 4]);
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x + off, y + off) : c.moveTo(x + off, y + off)));
    c.stroke();
  }
  c.setLineDash([]);
  c.strokeStyle = '#1e88e5';
  c.lineWidth = 6;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const a = Math.atan2(y1 - y0, x1 - x0);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    c.fillStyle = '#1565c0';
    c.beginPath();
    c.moveTo(mx + Math.cos(a) * 10, my + Math.sin(a) * 10);
    c.lineTo(mx + Math.cos(a + 2.5) * 10, my + Math.sin(a + 2.5) * 10);
    c.lineTo(mx + Math.cos(a - 2.5) * 10, my + Math.sin(a - 2.5) * 10);
    c.fill();
  }
  ['검색대', '안내', '좌석 배정'].forEach((s, i) => {
    const [px, py] = mapPx(CHECKPOINTS[i][0], CHECKPOINTS[i][1], MAP_W, MAP_D, W, Hh);
    c.fillStyle = '#ffffff';
    c.fillRect(px + 6, py - 26, 62, 18);
    c.strokeStyle = '#1e88e5';
    c.lineWidth = 2;
    c.strokeRect(px + 6, py - 26, 62, 18);
    text(c, s, px + 37, py - 16, 11, '#1565c0', 'center');
  });
  text(c, '관객 동선 · 예상 1,200명', 20, 30, 13, '#37474f');
};

/** Six CCTV feeds in a 3 × 2 grid: the lobby, the car park, the gate, a corridor, the stage door, the street. */
const cctvWall: Paint = (c) => {
  const cw = 192;
  const ch = 108;
  const feeds = ['CAM01 로비', 'CAM02 지하주차장', 'CAM03 정문', 'CAM04 3층 복도', 'CAM05 무대 출입구', 'CAM06 차량 동선'];
  feeds.forEach((name, i) => {
    const x = (i % 3) * cw;
    const y = Math.floor(i / 3) * ch;
    const g = c.createLinearGradient(x, y, x, y + ch);
    g.addColorStop(0, ['#53606b', '#3d4650', '#6b7a80', '#59636e', '#3b3f4a', '#5c6b64'][i]);
    g.addColorStop(1, '#22272d');
    c.fillStyle = g;
    c.fillRect(x, y, cw, ch);
    // A little scene each: a floor's perspective lines, a figure or a car.
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 10, y + ch);
    c.lineTo(x + cw / 2 - 20, y + 40);
    c.moveTo(x + cw - 10, y + ch);
    c.lineTo(x + cw / 2 + 20, y + 40);
    c.stroke();
    c.fillStyle = 'rgba(220,230,235,0.75)';
    if (i === 1 || i === 5) {
      c.fillRect(x + 70, y + 62, 54, 22);
      c.fillRect(x + 80, y + 52, 32, 12);
    } else {
      for (let k = 0; k < 2 + (i % 2); k++) {
        const px = x + 60 + k * 34;
        c.beginPath();
        c.arc(px, y + 54, 6, 0, Math.PI * 2);
        c.fill();
        c.fillRect(px - 6, y + 61, 12, 24);
      }
    }
    if (i === 4) {
      c.strokeStyle = '#ffeb3b';
      c.lineWidth = 2;
      c.strokeRect(x + 86, y + 44, 30, 44);
    }
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(x, y, cw, 16);
    text(c, name, x + 5, y + 8, 10, '#e0e0e0');
    text(c, '● REC', x + cw - 40, y + 8, 10, '#ff5252');
    text(c, '2026-10-28 09:4' + i, x + 5, y + ch - 8, 9, '#cfd8dc');
    c.strokeStyle = '#111';
    c.lineWidth = 3;
    c.strokeRect(x, y, cw, ch);
  });
};

/** The briefing slide: the date, the VIP and the codename, the day's timeline, the route, the risk level. */
const vipSchedule: Paint = (c) => {
  const W = 640;
  const Hh = 360;
  c.fillStyle = '#0f1a2a';
  c.fillRect(0, 0, W, Hh);
  c.fillStyle = '#c9a227';
  c.fillRect(0, 0, W, 6);
  text(c, '오늘의 경호 일정', 24, 34, 26, '#ffffff');
  text(c, '2026. 10. 28 (수) · 대외비', W - 24, 34, 15, '#c9a227', 'right');
  // The VIP card: a silhouette, the name, the codename and the protection level.
  c.fillStyle = '#1d2c42';
  c.fillRect(24, 64, 196, 270);
  c.fillStyle = '#5c6b7d';
  c.fillRect(48, 82, 148, 132);
  c.fillStyle = '#9aa7b5';
  c.beginPath();
  c.arc(122, 128, 30, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(122, 214, 58, 40, 0, Math.PI, Math.PI * 2);
  c.fill();
  text(c, '윤태성 회장', 122, 236, 20, '#ffffff', 'center');
  text(c, '한결그룹', 122, 262, 14, '#b0bec5', 'center');
  text(c, '코드명 「매」', 122, 288, 14, '#c9a227', 'center');
  c.fillStyle = '#c62828';
  c.fillRect(60, 304, 124, 22);
  text(c, '경호 등급 A', 122, 315, 13, '#ffffff', 'center');
  // The timeline.
  const rows: Array<[string, string, string]> = [
    ['08:30', '자택 출발', '차량 2대 · 선도차'],
    ['09:10', '한결타워 도착', '지하 VIP 주차장'],
    ['12:00', '오찬 · 그랜드 호텔', '별실 사전 점검'],
    ['15:30', '창립 기념식 · 시민홀', '검색대 운영'],
    ['18:00', '귀가', '예비 경로 대기'],
  ];
  rows.forEach(([time, what, note], i) => {
    const y = 84 + i * 48;
    c.fillStyle = i === 3 ? '#26405f' : '#17263a';
    c.fillRect(240, y - 18, 376, 40);
    c.fillStyle = '#c9a227';
    c.beginPath();
    c.arc(256, y + 2, 6, 0, Math.PI * 2);
    c.fill();
    text(c, time, 272, y + 2, 17, '#ffffff');
    text(c, what, 340, y - 4, 15, '#ffffff');
    text(c, note, 340, y + 13, 11, '#90a4ae');
  });
  c.strokeStyle = '#c9a227';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(256, 86);
  c.lineTo(256, 278);
  c.stroke();
  text(c, `위험도 보통 · 투입 인원 6명 · 무전 채널 3 · ${FIRM}`, 24, Hh - 12, 13, '#b0bec5');
};

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /** The firm's name on the reception's back wall: a black panel, the shield and the name in brushed steel (2026-11-05, the layout audit). */
  bgLogoWall(g) {
    part(g, box(1.9, 1.5, 0.06), '#1b1d21', 0, 1.35, -0.45);
    part(g, box(1.94, 0.04, 0.08), CHROME, 0, 2.12, -0.44, { outline: false });
    label(g, '🛡️ 강철방패 시큐리티', 1.5, 0.26, 0, 1.5, -0.41, '#1b1d21', '#cfd8dc');
    label(g, '신변 보호 · 행사 경호 · 시설 경비', 1.2, 0.12, 0, 1.18, -0.41, '#1b1d21', '#90a4ae');
  },
  // Its pole sign on the pavement (2026-11-05, the layout audit).
  bgFrontSign: pavementSign('bgFrontSign', '🛡️', '강철방패|시큐리티', ['신변 보호 · 행사 경호', '상담 예약제', '카드 출입 · 24시간 상황실'], '#212121', 2.1),
  /**
   * A self-defence mat: interlocking blue and red puzzle tiles with a white border tape, a guard's X
   * taped at the near end and four yellow marks round a VIP cone at the far end (the diamond
   * formation), a padded takedown dummy stood on it (black vinyl, a red strike pad on its chest),
   * focus mitts and a towel at the corner. Drilling self-defence the guard squares up to the dummy
   * down the mat: on guard, a high block, palm-heel strikes on the pad, a clinch at its shoulders, a
   * controlled takedown — the dummy goes over backwards and the guard follows down to a knee beside
   * it, a hand on its chest and one on its shoulder — and it's lifted back up (bgDefense). Learning the
   * formation, the guard takes each post round the cone in turn, faced out scanning, a hand to the
   * earpiece, the cuff mic up to answer (bgFormation).
   */
  sparringMat(g, _W, D, _c, _def, _ctx, out) {
    const x0 = -1.05;
    const x1 = 1.25;
    const len = x1 - x0;
    const n = Math.round(len / 0.46);
    const tw = len / n;
    const rows = 2;
    const td = (D - 0.02) / rows;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < rows; j++) part(g, box(tw - 0.006, MAT, td - 0.006), (i + j) % 2 ? '#1e4f9a' : '#b71c1c', x0 + tw * (i + 0.5), MAT / 2, -D / 2 + 0.01 + td * (j + 0.5), { outline: false });
    // The jigsaw edges along the sides, a border tape, the guard's X and the formation's marks.
    for (let i = 0; i < n; i++)
      for (const sz of [-1, 1]) part(g, box(0.05, MAT, 0.03), (i + (sz > 0 ? 1 : 0)) % 2 ? '#1e4f9a' : '#b71c1c', x0 + tw * (i + 0.5), MAT / 2, sz * (D / 2 - 0.005), { outline: false });
    for (const sz of [-1, 1]) part(g, box(len - 0.1, 0.002, 0.03), '#f5f5f5', (x0 + x1) / 2, MAT + 0.001, sz * (D / 2 - 0.07), { outline: false });
    for (const r of [0.6, -0.6]) part(g, box(0.22, 0.002, 0.03), '#f5f5f5', -0.85, MAT + 0.001, 0, { ry: r, outline: false });
    for (const [mx, mz] of [[CONE.x, 0.32], [CONE.x + 0.42, 0], [CONE.x, -0.32], [CONE.x - 0.42, 0]]) part(g, box(0.16, 0.002, 0.16), '#fdd835', mx, MAT + 0.001, mz, { outline: false });
    // Focus mitts and a rolled towel off the near corner.
    for (const sx of [0, 1]) {
      part(g, rbox(0.17, 0.05, 0.13, 0.04), PAD_RED, x0 + 0.12 + sx * 0.05, MAT + 0.03 + sx * 0.05, D / 2 - 0.15, { rx: sx * 0.3 });
      part(g, ring(0.04, 0.01), '#fafafa', x0 + 0.12 + sx * 0.05, MAT + 0.06 + sx * 0.05, D / 2 - 0.15, { rx: Math.PI / 2, outline: false });
    }
    part(g, cyl(0.045, 0.045, 0.3, 12), '#eceff1', x0 + 0.17, MAT + 0.045, -D / 2 + 0.16, { rz: Math.PI / 2 });
    // The dummy and the cone: stood still while nobody's drilling, moving when someone is.
    const idle = group(g);
    out.idle = idle;
    takedownDummy(idle);
    vipCone(idle, CONE.x, CONE.z);
    const use = group(g);
    out.inUse = use;
    const live = takedownDummy(use);
    const liveCone = group(use);
    vipCone(liveCone, CONE.x, CONE.z);
    const pivot = marker(g, DUMMY.pivot, MAT, 0);
    out.work = pivot;
    const drill = standAt(g, -0.85, 0, Math.PI / 2, 'bgDefense', pivot, MAT);
    const formation = standAt(g, CONE.x, 0.32, 0, 'bgFormation', pivot, MAT);
    const spots: Record<string, Spot> = { practiceDefense: drill, bodyguard_learnFormation: formation, '*': drill };
    out.spots = spots;
    out.animate = (t) => {
      const ph = phaseOf(pivot);
      if (nowAt(spots, t) === 'bodyguard_learnFormation') {
        const f = formationAt(t, ph);
        formation.at.position.set(f.x, MAT, f.z);
        formation.at.rotation.y = f.yaw;
        live.rotation.z = 0;
        liveCone.visible = true;
        return;
      }
      const d = defenseAt(t, ph);
      drill.at.position.set(d.x, MAT, d.z);
      // It rocks back a touch on each strike.
      const hit = d.from === 'strike' && d.e === 0 ? 0.03 * Math.max(0, Math.sin((t * 0.85 + ph * 7.1) * Math.PI * 2)) ** 2 : 0;
      live.rotation.z = -(d.theta + hit);
      liveCone.visible = false;
    };
  },

  /**
   * The 경호 작전 테이블: a steel-framed planning table at standing height, its glass top backlit,
   * the city map under it on the left (the river, the blocks, the park; the motorcade route in red
   * from the hotel to the venue with checkpoints 1–3 pinned, an alternative dashed in grey) and the
   * venue plan on the right (the stage, the seat blocks, gates A–C, the audience flow in blue between
   * the barriers); a black car token on the route, a blue pawn on the flow, a notepad and pen, a
   * coffee, a radio, a tray of magnets. Planning the route the guard stands at the city map: hands on
   * the edge studying it, the car token pushed along the route, a checkpoint pressed, a note made,
   * the route pointed out and the token slid back (bgRoute); planning the crowd flow, the same at the
   * venue plan with the pawn.
   */
  routeMapTable(g, W, D, _c, _def, _ctx, out) {
    const TOP = 0.92;
    const tw = W - 0.1;
    const td = Math.min(D - 0.16, 0.8);
    const tz = -D / 2 + td / 2 + 0.06;
    // The frame and legs, a shelf of binders under it, the backlit top in its rim.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) part(g, rbox(0.06, TOP - 0.04, 0.06, 0.015), GUNMETAL, sx * (tw / 2 - 0.05), (TOP - 0.04) / 2, tz + sz * (td / 2 - 0.05));
    part(g, rbox(tw - 0.08, 0.025, td - 0.08, 0.01), GUNMETAL, 0, 0.22, tz);
    for (let i = 0; i < 7; i++) part(g, rbox(0.06, 0.28, 0.24, 0.01), ['#1565c0', '#37474f', '#c62828', '#37474f', '#2e7d32', '#455a64', '#1565c0'][i], -0.7 + i * 0.09, 0.37, tz - 0.1);
    part(g, rbox(tw, 0.08, td, 0.02), GUNMETAL, 0, TOP - 0.04, tz);
    part(g, box(tw - 0.06, 0.004, td - 0.06), '#e3f2fd', 0, TOP + 0.001, tz, { outline: false, material: glow('#e8f4fd') });
    const mapAt = (x: number) => marker(g, x, TOP, tz);
    const cityAt = mapAt(-0.47);
    const venueAt = mapAt(0.47);
    flat(g, painted('bgCityMap', 420, 330, cityMap), MAP_W, MAP_D, -0.47, TOP + 0.006, tz);
    flat(g, painted('bgVenueMap', 420, 330, venueMap), MAP_W, MAP_D, 0.47, TOP + 0.006, tz);
    label(g, `경호 작전 테이블 · ${FIRM}`, 0.7, 0.06, 0, TOP - 0.04, tz + td / 2 + 0.002, GUNMETAL, '#e0e0e0');
    // Checkpoint pins on the route.
    for (const [x, z] of CHECKPOINTS) {
      part(g, cyl(0.003, 0.003, 0.03, 6), CHROME, -0.47 + x, TOP + 0.02, tz + z, { outline: false });
      part(g, ball(0.011), '#d32f2f', -0.47 + x, TOP + 0.036, tz + z, { outline: false });
    }
    // A tray of magnets at the far edge, a coffee, a radio lying down, the notepad and its pen.
    part(g, rbox(0.3, 0.02, 0.07, 0.01), '#cfd8dc', 0.05, TOP + 0.01, tz - td / 2 + 0.06);
    for (let i = 0; i < 8; i++) part(g, cyl(0.011, 0.011, 0.012, 10), ['#d32f2f', '#1e88e5', '#fdd835', '#43a047'][i % 4], -0.07 + i * 0.034, TOP + 0.026, tz - td / 2 + 0.06, { outline: false });
    part(g, cyl(0.035, 0.03, 0.1, 14), '#fafafa', 0.88, TOP + 0.05, tz - 0.25);
    part(g, cyl(0.03, 0.03, 0.005, 14), '#5d4037', 0.88, TOP + 0.098, tz - 0.25, { outline: false });
    radio(g, -0.86, TOP + 0.02, tz - 0.22, 0.4, false).rotation.x = -Math.PI / 2;
    const pad = group(g, -0.47 + NOTEPAD[0], TOP + 0.008, tz + NOTEPAD[1]);
    part(pad, box(0.12, 0.01, 0.16), '#fffde7', 0, 0, 0);
    for (let i = 0; i < 5; i++) part(pad, box(0.09, 0.0015, 0.004), '#90a4ae', 0, 0.006, -0.05 + i * 0.025, { outline: false });
    part(pad, cyl(0.004, 0.004, 0.13, 6), NAVY, 0.075, 0.008, 0.01, { rx: Math.PI / 2, ry: 0.3, outline: false });
    // The tokens: at the start while idle; moved by the round while someone plans.
    const idle = group(g);
    out.idle = idle;
    const start = (x: number, tok: THREE.Group) => tok.position.set(x + ROUTE[0][0], TOP + 0.006, tz + ROUTE[0][1]);
    start(-0.47, carToken(idle));
    start(0.47, pawnToken(idle));
    const use = group(g);
    out.inUse = use;
    const liveCar = carToken(use);
    const livePawn = pawnToken(use);
    const route = standAt(g, -0.47, tz + td / 2 + 0.26, Math.PI, 'bgRoute', cityAt);
    const crowd = standAt(g, 0.47, tz + td / 2 + 0.26, Math.PI, 'bgRoute', venueAt);
    const spots: Record<string, Spot> = { planRoute: route, bodyguard_crowdPlan: crowd, '*': route };
    out.spots = spots;
    out.work = cityAt;
    start(-0.47, liveCar);
    start(0.47, livePawn);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const onVenue = now === 'bodyguard_crowdPlan';
      const [tok, mx, mark] = onVenue ? [livePawn, 0.47, venueAt] : [liveCar, -0.47, cityAt];
      const [dx, dz] = tokenAt(t, phaseOf(mark));
      tok.position.set(mx + dx, TOP + 0.006, tz + dz);
      // The car faces along the leg of the route it's on.
      if (!onVenue) {
        const [ax, az] = tokenAt(t - 0.05, phaseOf(mark));
        if (Math.hypot(dx - ax, dz - az) > 1e-4) liveCar.rotation.y = Math.atan2(-(dz - az), dx - ax);
      }
      start(onVenue ? -0.47 : 0.47, onVenue ? liveCar : livePawn);
    };
  },

  /**
   * The radio rack: a steel wall cabinet under a pegboard, six handheld radios standing in a
   * charging bank along its top (a green or amber light under each, a little screen lit), six
   * coiled earpieces hung on the pegboard over them under '무전기 충전대 · 채널 3', a sign-out
   * clipboard on the side, spare batteries in a tray, the doors below. Checking the radios the guard
   * takes one out, clips it on the belt, fits the earpiece, talks a radio check into the cuff mic and
   * listens for the answer, a nod, and puts it back (bgEarpiece); its cradle's empty meanwhile.
   */
  radioRack(g, W, D, _c, _def, ctx, out) {
    const w = Math.min(W - 0.1, 0.84);
    const d = 0.32;
    const z = -D / 2 + d / 2 + 0.03;
    const top = 0.92;
    // The cabinet and its doors.
    part(g, rbox(w, top, d, 0.02), '#5b6670', 0, top / 2, z);
    for (const sx of [-1, 1]) {
      part(g, box(w / 2 - 0.03, top - 0.12, 0.01), '#6b7781', sx * (w / 4), top / 2 - 0.02, z + d / 2 + 0.003, { outline: false });
      part(g, box(0.012, 0.12, 0.02), CHROME, sx * 0.04, top / 2, z + d / 2 + 0.012, { outline: false });
    }
    // The charging bank: a sloped black base with six cradles.
    part(g, rbox(w, 0.07, d - 0.04, 0.015), '#212328', 0, top + 0.035, z);
    const n = 6;
    const slot = (i: number) => -w / 2 + 0.08 + ((w - 0.16) / (n - 1)) * i;
    const take = 2;
    const idle = group(g);
    out.idle = idle;
    for (let i = 0; i < n; i++) {
      const x = slot(i);
      part(g, rbox(0.085, 0.05, 0.09, 0.012), '#2f3237', x, top + 0.095, z + 0.02);
      const charging = i === 4;
      part(g, ball(0.009), charging ? '#ffb300' : '#69f0ae', x, top + 0.09, z + 0.068, { outline: false, material: glow(charging ? '#ffb300' : '#69f0ae') });
      radio(i === take ? idle : g, x, top + 0.11, z + 0.02, 0, !charging);
    }
    // The pegboard with the earpieces and the sign over them.
    const by = top + 0.28;
    const bh = ctx.againstWall ? 0.62 : 0.5;
    part(g, box(w, bh, 0.02), '#cfd8dc', 0, by + bh / 2, -D / 2 + 0.045);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) part(g, cyl(0.004, 0.004, 0.003, 6), '#90a4ae', -w / 2 + 0.06 + i * ((w - 0.12) / 8), by + 0.05 + j * ((bh - 0.1) / 4), -D / 2 + 0.056, { rx: Math.PI / 2, outline: false });
    label(g, '무전기 충전대 · 채널 3', w - 0.08, 0.07, 0, by + bh - 0.06, -D / 2 + 0.058, NAVY, '#ffffff');
    for (let i = 0; i < n; i++) {
      const x = slot(i);
      part(g, cyl(0.004, 0.004, 0.04, 6), CHROME, x, by + bh - 0.17, -D / 2 + 0.075, { rx: Math.PI / 2, outline: false });
      earpiece(g, x, by + bh - 0.17, -D / 2 + 0.07);
    }
    // The sign-out clipboard on the right side, the spare batteries.
    const cb = group(g, w / 2 + 0.006, top - 0.25, z, Math.PI / 2);
    part(cb, box(0.18, 0.25, 0.008), '#8d6e63', 0, 0, 0);
    part(cb, box(0.16, 0.2, 0.002), '#fafafa', 0, -0.015, 0.005, { outline: false });
    part(cb, rbox(0.07, 0.025, 0.01, 0.004), CHROME, 0, 0.115, 0.006, { outline: false });
    for (let i = 0; i < 6; i++) part(cb, box(0.13, 0.003, 0.001), '#90a4ae', 0, 0.05 - i * 0.025, 0.007, { outline: false });
    part(g, rbox(0.22, 0.03, 0.1, 0.008), '#455a64', w / 2 - 0.14, top + 0.015, z + d / 2 - 0.02);
    for (let i = 0; i < 4; i++) part(g, rbox(0.04, 0.02, 0.07, 0.006), '#212121', w / 2 - 0.21 + i * 0.045, top + 0.04, z + d / 2 - 0.02, { outline: false });
    const radioAt = marker(g, slot(take), top + 0.2, z + 0.06);
    out.work = radioAt;
    out.spots = { '*': standAt(g, slot(take) * 0.5, z + d / 2 + 0.34, Math.PI, 'bgEarpiece', radioAt) };
  },

  /**
   * The escort car: a long black executive sedan parked out front, gloss black with chrome window
   * trim and door handles, a big dark crest grille, slim LED headlights, a full-width tail-light bar,
   * multi-spoke dark rims, tinted glass (the leather seats and the wheel showing through), a shark-fin
   * aerial and Korean plates; drawn full size, its kerb side (the VIP's rear door) at the front tile.
   * Practising defensive driving the guard sits at the wheel (driver's side, the left) with the
   * headlights on; out on an escort or an event it drives off and is gone, and comes back in after.
   */
  escortCar(g, _W, _D, _c, _def, _ctx, out) {
    const car = group(g);
    const L = 4.4;
    const Wd = 1.5;
    const zc = 0.24;
    const BODY = '#121417';
    const side = (s: number) => zc + s * (Wd / 2);
    // The body: the lower body, a crease, the hood and the boot lid.
    part(car, rbox(L, 0.5, Wd, 0.18), BODY, 0, 0.56, zc);
    part(car, rbox(L * 0.97, 0.1, Wd - 0.02, 0.05), '#0b0c0e', 0, 0.33, zc);
    part(car, rbox(1.2, 0.04, Wd - 0.12, 0.03), '#1b1e22', 1.45, 0.82, zc);
    part(car, rbox(0.85, 0.04, Wd - 0.12, 0.03), '#1b1e22', -1.65, 0.82, zc);
    // The glasshouse: tinted glass all round (the cabin shows through), the roof, pillars and chrome trim.
    const cabin = new THREE.Shape();
    cabin.moveTo(-1.78, 0);
    cabin.lineTo(1.18, 0);
    cabin.lineTo(0.6, 0.5);
    cabin.lineTo(-1.42, 0.5);
    cabin.closePath();
    const cabinGeom = new THREE.ExtrudeGeometry(cabin, { depth: Wd - 0.16, bevelEnabled: false });
    cabinGeom.translate(0, 0, -(Wd - 0.16) / 2);
    const cab = glass(car, cabinGeom, 0, 0.81, zc, TINT);
    cab.userData.ownGeometry = true;
    part(car, rbox(2.06, 0.05, Wd - 0.14, 0.03), BODY, -0.41, 1.33, zc);
    for (const s of [-1, 1]) {
      const zz = zc + s * (Wd / 2 - 0.08);
      // A, B and C pillars.
      part(car, box(0.07, 0.62, 0.03), BODY, 0.9, 1.06, zz, { rz: 0.86, outline: false });
      part(car, box(0.08, 0.5, 0.03), BODY, -0.38, 1.06, zz, { outline: false });
      part(car, box(0.09, 0.58, 0.03), BODY, -1.6, 1.06, zz, { rz: -0.62, outline: false });
      // The chrome along the windows' foot, the door lines, the handles, the mirrors.
      part(car, box(2.9, 0.018, 0.012), CHROME, -0.3, 0.83, side(s) - s * 0.004, { outline: false });
      for (const x of [0.78, -0.38, -1.42]) part(car, box(0.008, 0.46, 0.006), '#2c3036', x, 0.58, side(s) + s * 0.002, { outline: false });
      for (const x of [0.2, -0.95]) part(car, rbox(0.14, 0.025, 0.02, 0.008), CHROME, x, 0.72, side(s) + s * 0.01, { outline: false });
      part(car, rbox(0.14, 0.09, 0.09, 0.02), BODY, 0.7, 0.93, side(s) + s * 0.07);
      part(car, box(0.004, 0.06, 0.07), '#1565c0', 0.635, 0.93, side(s) + s * 0.07, { outline: false });
    }
    // The cabin: front seats and the rear bench, the dashboard, the wheel.
    const seatY = 0.42;
    const dz = zc - 0.33;
    for (const sz of [dz, zc + 0.33]) {
      part(car, rbox(0.5, 0.12, 0.5, 0.05), '#3e2f27', 0.0, seatY - 0.06, sz);
      part(car, rbox(0.12, 0.6, 0.5, 0.05), '#3e2f27', -0.3, seatY + 0.26, sz, { rz: 0.14 });
      part(car, rbox(0.1, 0.14, 0.26, 0.04), '#3e2f27', -0.36, seatY + 0.62, sz);
    }
    part(car, rbox(0.55, 0.12, Wd - 0.3, 0.05), '#3e2f27', -1.1, seatY - 0.04, zc);
    part(car, rbox(0.14, 0.55, Wd - 0.3, 0.05), '#3e2f27', -1.4, seatY + 0.26, zc, { rz: 0.16 });
    part(car, rbox(0.42, 0.18, Wd - 0.2, 0.05), '#2a2420', 0.8, 0.78, zc);
    part(car, box(0.2, 0.08, 0.004), '#4fc3f7', 0.62, 0.86, zc, { ry: Math.PI / 2, outline: false, material: glow('#81d4fa') });
    const hub = group(car, 0.5, 0.86, dz);
    hub.rotation.z = 0.55;
    part(hub, ring(0.17, 0.016), '#1a1a1a', 0, 0, 0, { ry: Math.PI / 2 });
    part(hub, cyl(0.045, 0.045, 0.04, 12), '#2b2b2b', 0, 0, 0, { rz: Math.PI / 2, outline: false });
    rod(hub, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.16, 0), 0.012, '#1a1a1a');
    rod(hub, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.05, 0.16), 0.012, '#1a1a1a');
    rod(hub, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.05, -0.16), 0.012, '#1a1a1a');
    rod(car, new THREE.Vector3(0.52, 0.86, dz), new THREE.Vector3(0.75, 0.72, dz), 0.025, '#1a1a1a');
    const wheelAt = marker(hub, 0, 0, 0);
    // Wheels: big dark multi-spoke rims under the arches.
    for (const x of [-1.42, 1.38])
      for (const s of [-1, 1]) {
        const wz = side(s) - s * 0.11;
        part(car, cyl(0.33, 0.33, 0.24, 24), '#0d0d0d', x, 0.33, wz, { rx: Math.PI / 2 });
        part(car, cyl(0.22, 0.22, 0.245, 18), '#3a3f45', x, 0.33, wz, { rx: Math.PI / 2, outline: false });
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          part(car, box(0.03, 0.2, 0.01), '#9aa3ab', x + Math.cos(a) * 0.1, 0.33 + Math.sin(a) * 0.1, wz + s * 0.125, { rz: a + Math.PI / 2, outline: false });
        }
        part(car, cyl(0.04, 0.04, 0.25, 8), CHROME, x, 0.33, wz, { rx: Math.PI / 2, outline: false });
        part(car, ring(0.38, 0.035, Math.PI), '#0b0c0e', x, 0.33, side(s) + s * 0.005, { outline: false });
      }
    // The front (+x): the crest grille in its chrome frame, the LED headlights and their running strip, the plate.
    const fx = L / 2;
    part(car, rbox(0.04, 0.3, 0.6, 0.05), '#0a0a0a', fx + 0.005, 0.56, zc);
    part(car, rbox(0.03, 0.32, 0.62, 0.05), CHROME, fx - 0.005, 0.56, zc);
    for (let i = 0; i < 5; i++) part(car, box(0.01, 0.006, 0.55), '#3a3f45', fx + 0.026, 0.45 + i * 0.05, zc, { outline: false });
    const lights = group(car);
    for (const s of [-1, 1]) {
      part(car, rbox(0.04, 0.05, 0.36, 0.015), '#0a0a0a', fx - 0.03, 0.74, zc + s * 0.52);
      part(car, box(0.01, 0.012, 0.34), '#e3f2fd', fx - 0.005, 0.765, zc + s * 0.52, { outline: false, material: glow('#e3f2fd') });
      part(lights, box(0.012, 0.035, 0.3), '#fffde7', fx - 0.002, 0.735, zc + s * 0.52, { outline: false, material: glow('#fffde7') });
    }
    label(car, '123가 4567', 0.44, 0.1, fx + 0.03, 0.4, zc, '#ffffff', '#111111', Math.PI / 2);
    // The back: the tail-light bar, the plate.
    const bx = -L / 2;
    part(car, box(0.02, 0.035, Wd - 0.2), '#b71c1c', bx - 0.005, 0.74, zc, { outline: false, material: glow('#e53935') });
    label(car, '123가 4567', 0.44, 0.1, bx - 0.012, 0.55, zc, '#ffffff', '#111111', -Math.PI / 2);
    part(car, rbox(0.2, 0.07, 0.07, 0.03), BODY, -1.2, 1.38, zc);
    // Headlights on while it's driven (or practised in).
    const on = group(car);
    out.inUse = on;
    for (const s of [-1, 1]) part(on, box(0.012, 0.035, 0.3), '#fffde7', fx - 0.002, 0.735, zc + s * 0.52, { outline: false, material: glow('#ffffff') });
    // Off on a job: it pulls away along +x and is gone; it backs in again from +x and stops in its place (2026-11-05, the layout audit:
    // it came back from -x, through whatever stood behind it; the lot parks it nose to the street, 'left').
    let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      const s = t - since;
      let x = 0;
      if (state === 'leaving') {
        const r = Math.max(0, s - 0.8);
        x = 1.1 * r * r;
        if (s > 5) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, s / 5);
        x = 6 * (1 - u) * (1 - u);
        if (u >= 1) state = 'parked';
      }
      car.position.x = x;
      car.visible = state !== 'gone';
      lights.visible = state === 'leaving' || state === 'back';
    };
    lights.visible = false;
    const drive = sitAt(car, 0.02, seatY, dz, Math.PI / 2, 'steer', wheelAt);
    const handle = marker(car, -0.95, 0.72, side(1) + 0.03);
    const escort = standAt(g, -0.8, side(1) + 0.38, Math.PI, 'bgEarpiece', handle);
    out.work = wheelAt;
    out.spots = { bodyguard_defensiveDrive: drive, escortVIP: escort, eventSecurity: escort, '*': escort };
  },

  /**
   * The 상황실 desk: a wall of six CCTV feeds in a 3 × 2 frame (the lobby, the car park, the gate, a
   * corridor, the stage door, the motorcade's road), a dark console desk under it with a keyboard,
   * a PTZ joystick box, the radio base with a handheld in it, a gooseneck mic with its red talk key,
   * the duty log open with a pen, a tumbler; a black mesh swivel chair. Watching the feeds the guard
   * sits typing and calling cameras up (the wall lights); on the radio the guard sits, takes the
   * handheld off its base, fits the earpiece and relays to the team on the cuff mic (bgEarpiece).
   */
  bgCommandDesk(g, W, D, _c, _def, _ctx, out) {
    const h = 0.74;
    const d = 0.66;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    // The video wall.
    const vw = W - 0.2;
    const vh = vw * (216 / 576);
    const vy = 1.12 + vh / 2;
    part(g, rbox(vw + 0.08, vh + 0.08, 0.06, 0.02), '#111316', 0, vy, -D / 2 + 0.04);
    out.screen = litScreen(g, painted('bgCctv', 576, 216, cctvWall), vw, vh, 0, vy, -D / 2 + 0.075);
    for (let i = 1; i < 3; i++) part(g, box(0.012, vh, 0.004), '#111316', -vw / 2 + (vw / 3) * i, vy, -D / 2 + 0.088, { outline: false });
    part(g, box(vw, 0.012, 0.004), '#111316', 0, vy, -D / 2 + 0.088, { outline: false });
    label(g, `${FIRM} 경호 상황실`, 0.7, 0.07, 0, vy + vh / 2 + 0.1, -D / 2 + 0.05, NAVY, '#ffffff');
    // The desk: a dark top on a closed console, a lit strip under its edge.
    part(g, rbox(W - 0.08, 0.05, d, 0.015), '#2e3338', 0, h, z);
    part(g, rbox(W - 0.12, h - 0.05, d - 0.12, 0.015), '#22262a', 0, (h - 0.05) / 2, z - 0.04);
    glowing(g, box(W - 0.2, 0.01, 0.005), '#4fc3f7', 0, h - 0.04, front - 0.1);
    // Keyboard, the PTZ joystick box, the radio base, the mic, the log, a tumbler.
    const kb = group(g, -0.05, h + 0.025, front - 0.2);
    part(kb, rbox(0.44, 0.022, 0.15, 0.01), '#1d1f22', 0, 0, 0);
    for (let r = 0; r < 4; r++) part(kb, box(0.4, 0.004, 0.024), '#3a3d42', 0, 0.013, -0.05 + r * 0.032, { outline: false });
    const keys = marker(g, -0.05, h + 0.05, front - 0.2);
    const ptz = group(g, 0.38, h + 0.025, front - 0.2);
    part(ptz, rbox(0.24, 0.04, 0.17, 0.015), '#2b2f33', 0, 0.01, 0);
    part(ptz, cyl(0.012, 0.016, 0.1, 8), '#111', 0.06, 0.08, 0.0, { outline: false });
    part(ptz, ball(0.024), '#c62828', 0.06, 0.135, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(ptz, cyl(0.009, 0.009, 0.006, 8), ['#43a047', '#fdd835', '#1e88e5'][i % 3], -0.08 + (i % 3) * 0.035, 0.032, -0.03 + Math.floor(i / 3) * 0.05, { outline: false, material: glow(['#66bb6a', '#fff176', '#64b5f6'][i % 3]) });
    // The radio base with its handheld (in it while nobody's on the radio).
    part(g, rbox(0.12, 0.05, 0.12, 0.015), '#212328', -0.62, h + 0.05, z - 0.02);
    part(g, ball(0.008), '#69f0ae', -0.62, h + 0.05, z + 0.042, { outline: false, material: glow('#69f0ae') });
    const idle = group(g);
    out.idle = idle;
    radio(idle, -0.62, h + 0.07, z - 0.02);
    const radioAt = marker(g, -0.62, h + 0.16, z + 0.01);
    const goose = group(g, -0.38, h + 0.025, z + 0.05);
    part(goose, rbox(0.14, 0.03, 0.12, 0.01), '#1d1f22', 0, 0, 0);
    part(goose, rbox(0.04, 0.012, 0.03, 0.005), '#c62828', 0.03, 0.02, 0.03, { outline: false });
    rod(goose, new THREE.Vector3(-0.02, 0.02, 0), new THREE.Vector3(-0.02, 0.22, 0.06), 0.008, '#2b2b2b');
    rod(goose, new THREE.Vector3(-0.02, 0.22, 0.06), new THREE.Vector3(-0.02, 0.27, 0.16), 0.008, '#2b2b2b');
    part(goose, cyl(0.016, 0.012, 0.06, 10), '#111', -0.02, 0.28, 0.19, { rx: 1.2, outline: false });
    const log = group(g, 0.62, h + 0.03, front - 0.22, -0.25);
    part(log, box(0.3, 0.012, 0.21), '#1a237e', 0, 0, 0);
    part(log, box(0.28, 0.006, 0.19), '#fafafa', 0, 0.009, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(log, box(0.11, 0.002, 0.004), '#90a4ae', -0.07 + (i % 2) * 0.14, 0.013, -0.06 + Math.floor(i / 2) * 0.05, { outline: false });
    part(log, cyl(0.004, 0.004, 0.12, 6), '#111', 0.05, 0.016, 0.03, { rz: Math.PI / 2, ry: 0.5, outline: false });
    part(g, cyl(0.035, 0.03, 0.17, 14), '#455a64', 0.84, h + 0.11, z - 0.12);
    // The chair.
    const cz = front + 0.36;
    swivel(g, 0, cz + 0.02, Math.PI, '#1f2226');
    out.seat = marker(g, 0, 0.48, cz);
    out.work = keys;
    const watch = sitAt(g, 0, 0.48, cz, Math.PI, 'type', keys);
    const relay = sitAt(g, -0.05, 0.48, cz, Math.PI, 'bgEarpiece', radioAt);
    out.spots = { bgWatchCctv: watch, bgRadioRelay: relay, '*': watch };
  },

  /**
   * The briefing screen: a big display hung on the wall (on a rolling stand in the open) showing the
   * day's VIP schedule — 윤태성 회장 of 한결그룹 (made up), codename 「매」, protection level A, the
   * timeline from leaving home to the ceremony at 시민홀 and back, the risk level and the radio
   * channel — and a low cabinet under it with the laptop showing the same slide, a clicker, a stack of
   * printed schedules and a water bottle. Briefing the team the guard stands at the screen's right
   * edge turned out to the room, pointing back at it and making the case (present); the team stand round.
   */
  bgBriefScreen(g, W, D, _c, _def, ctx, out) {
    const sw = W - 0.24;
    const sh = sw * (360 / 640);
    const sz = -D / 2 + (ctx.againstWall ? 0.05 : 0.25);
    const sy = 1.5;
    if (!ctx.againstWall) {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.06, sy, 0.06, 0.015), GUNMETAL, sx * 0.3, sy / 2, sz - 0.04);
        part(g, rbox(0.08, 0.04, 0.6, 0.015), GUNMETAL, sx * 0.3, 0.06, sz);
      }
    }
    part(g, rbox(sw + 0.05, sh + 0.05, 0.05, 0.015), '#0d0f12', 0, sy, sz);
    const slide = painted('bgVipSchedule', 640, 360, vipSchedule);
    out.screen = litScreen(g, slide, sw, sh, 0, sy, sz + 0.03);
    part(g, box(0.06, 0.012, 0.01), '#9e9e9e', 0, sy - sh / 2 - 0.012, sz + 0.03, { outline: false });
    // The cabinet: laptop, clicker, printed schedules, water.
    const cw = Math.min(sw, 1.4);
    const cz = -D / 2 + 0.25;
    part(g, rbox(cw, 0.56, 0.4, 0.02), '#3e4650', 0, 0.28, cz);
    for (const sx of [-1, 1]) part(g, box(cw / 2 - 0.04, 0.44, 0.008), '#4b5561', sx * (cw / 4), 0.27, cz + 0.202, { outline: false });
    const lap = group(g, -0.3, 0.57, cz + 0.02, 0.25);
    part(lap, rbox(0.32, 0.015, 0.22, 0.008), '#b0bec5', 0, 0, 0);
    const lid = group(lap, 0, 0.008, -0.11);
    lid.rotation.x = -0.25;
    part(lid, rbox(0.32, 0.21, 0.01, 0.008), '#b0bec5', 0, 0.105, 0);
    picture(lid, slide, 0.29, 0.165, 0, 0.108, 0.006);
    part(g, rbox(0.03, 0.012, 0.09, 0.008), '#212121', 0.05, 0.566, cz + 0.08, { ry: 0.3 });
    for (let i = 0; i < 4; i++) part(g, box(0.21, 0.006, 0.297), '#fafafa', 0.32, 0.565 + i * 0.006, cz, { ry: 0.05 * i, outline: false });
    label(g, '대외비', 0.08, 0.03, 0.32, 0.59, cz - 0.1, '#c62828', '#ffffff');
    part(g, cyl(0.03, 0.03, 0.2, 12), '#81d4fa', 0.58, 0.66, cz - 0.08, { material: BOTTLE });
    part(g, cyl(0.02, 0.02, 0.03, 10), '#1565c0', 0.58, 0.775, cz - 0.08, { outline: false });
    const point = marker(g, sw / 2 - 0.3, sy - 0.05, sz + 0.04);
    out.work = point;
    out.spots = { '*': standAt(g, sw / 2 + 0.06, cz + 0.62, -0.5, 'present', point) };
  },

  /**
   * A suit locker: a tall grey steel locker, vents at the top, a name card and a locking handle; its
   * door opens on a mirror. Inside, the black suit and a white shirt on hangers, three ties on a rack
   * (black, navy, a dark stripe), sunglasses and a spare earpiece on the shelf, polished black shoes
   * on the floor. Suiting up the guard stands in front of it: reaching in for the tie, knotting it
   * and pulling it snug, the jacket's button done, each cuff shot, the sunglasses put on, the lapels
   * squared at the mirror (bgSuitUp); the sunglasses are off the shelf meanwhile.
   */
  bgSuitLocker(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.3, 0.62);
    const d = 0.5;
    const hgt = 1.86;
    const z = -D / 2 + d / 2 + 0.02;
    const fz = z + d / 2;
    const GREY = '#6f7a84';
    // The shell: back, sides, top and floor, so it's open when the door is.
    part(g, box(w, hgt, 0.02), GREY, 0, hgt / 2, z - d / 2 + 0.01);
    for (const sx of [-1, 1]) part(g, box(0.02, hgt, d), GREY, sx * (w / 2 - 0.01), hgt / 2, z);
    part(g, box(w, 0.02, d), GREY, 0, hgt - 0.01, z);
    part(g, box(w, 0.06, d), shade(GREY, 0.8), 0, 0.03, z);
    part(g, box(w - 0.04, 0.012, d - 0.04), '#cfd8dc', 0, 1.5, z);
    part(g, box(w - 0.04, 0.02, 0.012), '#3a3f45', 0, 1.48, z + d / 2 - 0.04, { outline: false });
    // The rail with the suit and the shirt, the ties on their rack, the shelf's things, the shoes.
    const rail = 1.42;
    part(g, cyl(0.008, 0.008, w - 0.04, 8), CHROME, 0, rail, z - 0.02, { rz: Math.PI / 2, outline: false });
    const hanger = (x: number, color: string, jacket: boolean) => {
      const hz = z - 0.02;
      part(g, ring(0.012, 0.003, Math.PI * 1.5), CHROME, x, rail + 0.012, hz, { outline: false });
      rod(g, new THREE.Vector3(x - 0.17, rail - 0.08, hz), new THREE.Vector3(x, rail - 0.01, hz), 0.006, CHROME);
      rod(g, new THREE.Vector3(x + 0.17, rail - 0.08, hz), new THREE.Vector3(x, rail - 0.01, hz), 0.006, CHROME);
      part(g, rbox(0.4, jacket ? 0.72 : 0.62, 0.07, 0.03), color, x, rail - 0.45, hz);
      if (jacket) {
        for (const sx of [-1, 1]) part(g, box(0.05, 0.3, 0.004), shade(color, 1.4), x + sx * 0.06, rail - 0.25, hz + 0.037, { rz: sx * 0.25, outline: false });
        part(g, box(0.09, 0.28, 0.003), '#fafafa', x, rail - 0.24, hz + 0.036, { outline: false });
        part(g, box(0.03, 0.22, 0.004), '#111', x, rail - 0.27, hz + 0.038, { outline: false });
      }
    };
    hanger(-0.08, '#f5f5f5', false);
    hanger(0.06, SUIT, true);
    const tieRack = group(g, w / 2 - 0.04, 1.25, z + 0.04);
    part(tieRack, box(0.012, 0.012, 0.22), CHROME, 0, 0, 0, { outline: false });
    const ties: Array<[number, string]> = [[-0.07, '#111111'], [0, '#1a237e'], [0.07, '#4a1c24']];
    for (const [tz, col] of ties) {
      part(tieRack, box(0.008, 0.38, 0.045), col, -0.008, -0.19, tz, { outline: false });
      part(tieRack, box(0.008, 0.06, 0.06), col, -0.008, -0.4, tz, { outline: false });
    }
    const tieAt = marker(g, w / 2 - 0.05, 1.18, z + 0.02);
    const idle = group(g);
    out.idle = idle;
    const shades = group(idle, -0.1, 1.53, z + 0.08);
    for (const sx of [-1, 1]) part(shades, rbox(0.06, 0.035, 0.008, 0.01), '#111', sx * 0.035, 0.02, 0, { outline: false });
    part(shades, box(0.016, 0.006, 0.006), '#111', 0, 0.03, 0, { outline: false });
    for (const sx of [-1, 1]) part(shades, box(0.004, 0.004, 0.12), '#111', sx * 0.065, 0.025, -0.06, { outline: false });
    earpiece(g, 0.12, 1.66, z - 0.15);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.1, 0.07, 0.26, 0.03), '#0d0d0d', sx * 0.07, 0.1, z + 0.04);
      part(g, ball(0.012), '#fafafa', sx * 0.07, 0.14, z + 0.15, { outline: false });
    }
    // The door, hung on the left: vents, the name card, the handle; a mirror inside.
    const hinge = group(g, -w / 2, 0, fz + 0.005);
    hinge.userData.swing = -1;
    part(hinge, box(w, hgt - 0.02, 0.02), shade(GREY, 1.08), w / 2, hgt / 2, 0);
    for (let i = 0; i < 5; i++) part(hinge, box(w * 0.5, 0.012, 0.004), '#4b5560', w / 2, hgt - 0.14 - i * 0.03, 0.012, { outline: false });
    label(hinge, '경호팀', 0.14, 0.05, w / 2, 1.42, 0.012, '#fafafa', NAVY);
    part(hinge, rbox(0.03, 0.14, 0.03, 0.01), CHROME, w - 0.07, 1.0, 0.025);
    part(hinge, cyl(0.012, 0.012, 0.01, 10), '#ffb300', w - 0.07, 1.1, 0.016, { rx: Math.PI / 2, outline: false });
    part(hinge, box(w * 0.6, 0.5, 0.004), '#cfe8f3', w / 2, 1.45, -0.013, { material: MIRROR, outline: false });
    out.doors = [hinge];
    out.work = tieAt;
    out.spots = { '*': standAt(g, 0.08, fz + 0.42, Math.PI, 'bgSuitUp', tieAt) };
  },

  /**
   * A walk-through metal-detector gate: grey side panels with blue trim and the zone LEDs up their
   * inside faces, the top beam's display ('금속 탐지기') with a light that's green — red when it
   * finds something — yellow footprints through it on a rubber mat; a white training mannequin in a
   * grey suit stood at its exit, its arms held out a little, a car key in its trouser pocket; beside
   * it a roller table with grey trays (a phone and keys, a belt, a bag) and the handheld wand.
   * Practising screening, the guard stands in front of the mannequin with the wand: round the head,
   * out along each arm, down the chest — it beeps at the pocket, held there while the left hand pats
   * it — down one leg and up the other (bgWand). Checking the trays, the guard goes through them (rummage).
   */
  bgMetalGate(g, W, _D, _c, _def, _ctx, out) {
    const AX = -W / 2 + 0.55;
    const gw = 0.84;
    const gd = 0.42;
    const gh = 2.08;
    const az = -0.12;
    const MZ = 0.28;
    const PANEL = '#d5dbe0';
    // The rubber mat with the footprints through the arch.
    part(g, rbox(gw + 0.1, 0.012, 1.0, 0.004), '#37474f', AX, 0.006, 0.02);
    for (let i = 0; i < 3; i++)
      for (const sx of [-1, 1]) part(g, rbox(0.07, 0.003, 0.16, 0.03), '#fdd835', AX + sx * 0.08, 0.014, -0.32 + i * 0.26 + (sx > 0 ? 0.08 : 0), { outline: false });
    // The two panels, their LED strips, the top beam with its display and lamp.
    const zones: Array<[number, number]> = [];
    for (const sx of [-1, 1]) {
      const px = AX + sx * (gw / 2 - 0.05);
      part(g, rbox(0.1, gh - 0.1, gd, 0.02), PANEL, px, (gh - 0.1) / 2, az);
      part(g, box(0.102, 0.06, gd + 0.004), '#1565c0', px, 0.2, az, { outline: false });
      part(g, rbox(0.14, 0.04, gd + 0.06, 0.015), '#90a4ae', px, 0.02, az);
      for (let k = 0; k < 6; k++) part(g, box(0.004, 0.2, 0.03), '#2e7d32', px - sx * 0.052, 0.4 + k * 0.25, az + 0.12, { outline: false, material: glow('#66bb6a') });
      zones.push([px - sx * 0.054, sx]);
    }
    part(g, rbox(gw + 0.02, 0.16, gd + 0.02, 0.02), PANEL, AX, gh - 0.02, az);
    part(g, box(gw - 0.1, 0.004, gd), '#90a4ae', AX, gh - 0.1, az, { outline: false });
    label(g, '금속 탐지기 · METAL DETECTOR', gw - 0.16, 0.06, AX, gh - 0.01, az + gd / 2 + 0.012, '#1565c0', '#ffffff');
    part(g, rbox(0.12, 0.06, 0.04, 0.01), '#212121', AX + 0.2, gh + 0.09, az + 0.1);
    glowing(g, ball(0.03), '#69f0ae', AX + 0.2, gh + 0.15, az + 0.1);
    // The training mannequin at the exit, facing out of the gate (+z).
    const man = group(g, AX, 0, MZ);
    part(man, cyl(0.16, 0.18, 0.03, 18), '#90a4ae', 0, 0.015, 0);
    part(man, cyl(0.012, 0.012, 0.1, 8), CHROME, 0.12, 0.08, -0.08, { outline: false });
    for (const sx of [-1, 1]) {
      part(man, rbox(0.12, 0.8, 0.13, 0.05), '#5f6b75', sx * 0.08, 0.45, 0);
      part(man, rbox(0.11, 0.05, 0.2, 0.025), '#111', sx * 0.08, 0.04, 0.03);
    }
    part(man, rbox(0.34, 0.14, 0.2, 0.06), '#5f6b75', 0, 0.88, 0);
    part(man, rbox(0.38, 0.5, 0.22, 0.08), '#5f6b75', 0, 1.17, 0);
    part(man, box(0.09, 0.3, 0.004), '#fafafa', 0, 1.26, 0.111, { outline: false });
    for (const sx of [-1, 1]) {
      rod(man, new THREE.Vector3(sx * 0.2, 1.36, 0), new THREE.Vector3(sx * 0.33, 1.02, 0.02), 0.048, '#5f6b75');
      part(man, ball(0.04), '#f1ece4', sx * 0.35, 0.98, 0.03);
    }
    part(man, cyl(0.045, 0.05, 0.08, 10), '#f1ece4', 0, 1.46, 0);
    part(man, ball(0.105), '#f1ece4', 0, 1.6, 0).scale.set(0.95, 1.12, 1);
    // A car key on a ring hanging out of the right trouser pocket (what the wand finds).
    part(man, ring(0.015, 0.003), CHROME, 0.1, 0.84, 0.08, { outline: false });
    part(man, rbox(0.03, 0.05, 0.012, 0.006), '#212121', 0.1, 0.8, 0.085, { outline: false });
    // The roller table with its trays.
    const tx = W / 2 - 0.4;
    const top = 0.74;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.02, top, 8), STEEL, tx + sx * 0.3, top / 2, sz * 0.2, { outline: false });
    part(g, rbox(0.7, 0.04, 0.48, 0.01), STEEL, tx, top, 0);
    for (let i = 0; i < 12; i++) part(g, cyl(0.016, 0.016, 0.44, 8), '#b0bec5', tx - 0.33 + i * 0.06, top + 0.03, 0, { rx: Math.PI / 2, outline: false });
    const tray = (x: number, z: number, ry: number) => {
      const t = group(g, x, top + 0.05, z, ry);
      part(t, rbox(0.3, 0.06, 0.22, 0.02), '#78909c', 0, 0.03, 0);
      part(t, box(0.27, 0.004, 0.19), '#90a4ae', 0, 0.008, 0, { outline: false });
      return t;
    };
    const a = tray(tx - 0.15, 0.08, 0.06);
    part(a, rbox(0.07, 0.012, 0.14, 0.01), '#111', -0.06, 0.016, 0);
    part(a, ring(0.02, 0.004), CHROME, 0.05, 0.014, 0.03, { rx: Math.PI / 2, outline: false });
    part(a, rbox(0.03, 0.008, 0.05, 0.005), '#c62828', 0.08, 0.016, 0.04, { outline: false });
    const b = tray(tx + 0.16, -0.06, -0.05);
    part(b, ring(0.07, 0.01), '#3e2723', 0, 0.02, 0, { rx: Math.PI / 2, outline: false });
    part(b, rbox(0.04, 0.012, 0.03, 0.005), CHROME, 0.07, 0.02, 0, { outline: false });
    part(g, rbox(0.3, 0.2, 0.14, 0.04), '#4e342e', tx + 0.15, top + 0.15, 0.17);
    // The wand: lying on the table, or in the guard's hand sweeping (drawn where the motion has it).
    const wand = (p: THREE.Object3D) => {
      const w = group(p);
      part(w, cyl(0.017, 0.019, 0.15, 10), '#1a1a1a', 0, 0, 0.02, { rx: Math.PI / 2 });
      part(w, rbox(0.075, 0.016, 0.2, 0.03), '#1a1a1a', 0, 0, -0.17);
      part(w, rbox(0.05, 0.018, 0.15, 0.02), '#fdd835', 0, 0.001, -0.17, { outline: false });
      const led = part(w, ball(0.007), '#69f0ae', 0, 0.02, -0.03, { outline: false, material: glow('#69f0ae') });
      const red = part(w, ball(0.0075), '#ff1744', 0, 0.02, -0.03, { outline: false, material: glow('#ff1744') });
      red.visible = false;
      return { w, led, red };
    };
    const idle = group(g);
    out.idle = idle;
    const lying = wand(idle).w;
    lying.position.set(tx - 0.2, top + 0.06, -0.17);
    lying.rotation.y = 1.3;
    const use = group(g);
    out.inUse = use;
    // The alarm while the wand's on the pocket: the lamp red, the zone at pocket height flashing red on both panels.
    const alarm = group(use);
    glowing(alarm, ball(0.034), '#ff1744', AX + 0.2, gh + 0.15, az + 0.1);
    const zoneFlash = group(alarm);
    for (const [zx] of zones) glowing(zoneFlash, box(0.006, 0.2, 0.032), '#ff1744', zx, 0.9, az + 0.12);
    alarm.visible = false;
    const onTable = wand(use).w;
    onTable.position.copy(lying.position);
    onTable.rotation.y = lying.rotation.y;
    const held = wand(use);
    const feet = marker(g, AX, 0, MZ);
    const trayAt = marker(g, tx, top + 0.1, 0.02);
    const drill = standAt(g, AX, MZ + WAND.head + WAND.grip + 0.48, Math.PI, 'bgWand', feet);
    const trays = standAt(g, tx, 0.62, Math.PI, 'rummage', trayAt);
    const spots: Record<string, Spot> = { bgScreeningDrill: drill, bgTrayCheck: trays, '*': drill };
    out.spots = spots;
    out.work = feet;
    out.animate = (t) => {
      const wanding = nowAt(spots, t) === 'bgScreeningDrill';
      held.w.visible = wanding;
      onTable.visible = !wanding;
      let beep = false;
      if (wanding) {
        const w = wandAt(t, phaseOf(feet));
        beep = w.beep;
        held.w.position.set(AX + w.x, w.y - 0.03, MZ + WAND.head + WAND.grip);
        held.w.rotation.set(0.15, 0, 0);
        const flash = beep && Math.sin(t * 22) > 0;
        held.red.visible = flash;
        held.led.visible = !flash;
      }
      alarm.visible = beep;
      zoneFlash.visible = Math.sin(t * 22) > 0;
    };
  },
};
