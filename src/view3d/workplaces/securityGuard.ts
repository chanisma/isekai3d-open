import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glass, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';
import { pavementSign } from './dentist';
import { CCTV, DESK, KEY_HOOKS, PANEL, badgeAt, cctvAt, frameAt, gateAt, keyAt, panelAt, radioAt, sgPhase, sgTurn, tagAt, type SecurityMotion } from './securityGuardMotion';

/**
 * The 빌딩 보안실 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a Korean
 * office tower's security and fire-control room (보안실 · 방재실). The CCTV consoles under the video
 * wall — six feeds a console from round the building (정문, 로비, B2 주차장, the lifts, the stairs, the
 * loading dock, the roof, a corridor), sequencing on their own, the big one switched, zoomed and panned
 * from the PTZ joystick while it's worked; the key cabinet with its numbered hooks and the 열쇠
 * 수불대장 on its ledge (the torch and the patrol wand gone from its side while the building's walked);
 * the patrol log desks with the floor plan and its route pinned up; the intruder alarm panels with the
 * tower drawn in section, a zone lamp per wing a floor (one goes red, the beacon on top turns). And what
 * it was missing (workFurniture/securityGuard.ts): the lobby's visitor desk, the speed gate, the 방재
 * 수신기, the radios' charging rack, the lost-and-found shelf and a patrol checkpoint on the wall.
 *
 * The building (한빛타워), its tenants and every name on a tag are made up. Every piece's spots face it
 * square on and turn by the motion's own clock (securityGuardMotion.ts), so what's held is drawn in
 * the hands that hold it.
 */

const STEEL = '#9aa4ab';
const GUNMETAL = '#3b434a';
const CREAM = '#e8e3d6';
const NAVY = '#1f2d3d';
const SAFETY = '#f9a825';
const ALARM = '#ff1744';
const OK = '#00e676';
const PAPER = '#fbfaf5';
const BUILDING = '한빛타워';
const TOP = 0.76;

// ---------------------------------------------------------------------------------------------
// Small parts.

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
/** How tall whoever's posed at a spot is. */
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;

/** A spot sat at (the seat's top `y`), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
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
/** The same place, done another way (a spot object of its own, so which use is going on can be told). */
function also(g: THREE.Object3D, s: Spot, motion: Motion, work = s.work): Spot {
  const at = marker(g, s.at.position.x, s.at.position.y, s.at.position.z);
  at.rotation.y = s.at.rotation.y;
  return { ...s, at, motion, work };
}
/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A sheet lying flat on a top, its head away from +z, turned `ry` about the vertical. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A see-through overlay (painted on a transparent canvas) in front of a screen. */
function overlay(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  const mat = m.material as THREE.MeshBasicMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  m.renderOrder = 3;
  return m;
}
/** A pen lying on a top. */
const pen = (g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#1a237e') => part(g, cyl(0.0045, 0.0045, 0.14, 6), color, x, y + 0.005, z, { rz: Math.PI / 2, ry, outline: false });

/** A swivel chair, built facing +z: five-star base, gas lift, the seat's top at 0.48, a back `back` high, arms. */
function swivel(g: THREE.Object3D, x: number, z: number, ry: number, color: string, back = 0.6): THREE.Group {
  const c = group(g, x, 0, z, ry);
  starBase(c, 0, 0, 0.26, BLACK);
  part(c, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.5, 0.09, 0.48, 0.04), color, 0, 0.435, 0);
  part(c, rbox(0.5, back, 0.1, 0.05), color, 0, 0.5 + back / 2, -0.24, { rx: -0.08 });
  part(c, rbox(0.42, back - 0.16, 0.02, 0.04), shade(color, 1.25), 0, 0.5 + back / 2, -0.185, { rx: -0.08, outline: false });
  part(c, rbox(0.3, 0.12, 0.08, 0.04), color, 0, 0.56 + back, -0.27, { rx: -0.08 });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.04, 0.3, 0.015), color, sx * 0.27, 0.67, 0.0);
    part(c, rbox(0.03, 0.18, 0.03, 0.01), CHROME, sx * 0.27, 0.57, 0.04, { outline: false });
  }
  return c;
}

/** A frame worked out in the piece's frame for a spot and the piece's work point (the builder's side of securityGuardMotion.ts). */
const frameOf = (s: Spot, work: THREE.Object3D) => frameAt(work.position, 0, s.at.position, s.at.rotation.y, heightAt(s), s.how === 'sit');
const phaseOf = (work: THREE.Object3D) => sgPhase(work.getWorldPosition(tmp));
/** Turns a spot by its motion's clock (square on is π). */
const turnSpot = (s: Spot, m: SecurityMotion, t: number, ph: number) => {
  s.at.rotation.y = Math.PI + sgTurn(m, t, ph);
};

/**
 * A handheld radio (a 무전기), its middle at the group's origin, its face toward +z: the black body,
 * the antenna, the channel knob, the little screen, the PTT on its side, a belt clip.
 */
function radioUnit(parent: THREE.Object3D, body = '#212121'): THREE.Group {
  const r = new THREE.Group();
  parent.add(r);
  part(r, rbox(0.058, 0.13, 0.035, 0.012), body, 0, 0, 0);
  part(r, rbox(0.05, 0.03, 0.005, 0.004), '#455a64', 0, -0.035, 0.018, { outline: false });
  for (let i = 0; i < 3; i++) part(r, box(0.036, 0.003, 0.002), '#111111', 0, -0.045 + i * 0.008, 0.021, { outline: false });
  glowing(r, box(0.036, 0.018, 0.002), '#9ccc65', 0, 0.028, 0.0185);
  part(r, cyl(0.007, 0.007, 0.11, 8), '#111111', 0.017, 0.12, -0.004, { outline: false });
  part(r, ball(0.008), '#111111', 0.017, 0.176, -0.004, { outline: false });
  part(r, cyl(0.009, 0.009, 0.016, 10), '#424242', -0.015, 0.072, 0, { outline: false });
  part(r, rbox(0.006, 0.035, 0.016, 0.003), SAFETY, -0.031, 0.012, 0, { outline: false });
  return r;
}

/** A handset-sized torch, along +z from the group's origin (the lens at the far end); its beam drawn in `beam`. */
function torchUnit(parent: THREE.Object3D): { root: THREE.Group; beam: THREE.Mesh } {
  const root = new THREE.Group();
  parent.add(root);
  part(root, cyl(0.016, 0.016, 0.16, 12), '#263238', 0, 0, 0.0, { rx: Math.PI / 2 });
  part(root, cyl(0.024, 0.018, 0.045, 14), '#37474f', 0, 0, 0.09, { rx: Math.PI / 2 });
  glowing(root, cyl(0.02, 0.02, 0.004, 14), '#fffde7', 0, 0, 0.114, Math.PI / 2);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.6, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff8d6', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  beam.userData.ownGeometry = beam.userData.ownMaterial = true;
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(0, 0, 0.115 + 0.8);
  beam.renderOrder = 4;
  root.add(beam);
  return { root, beam };
}

/** A lamp that lights: its dark lens and the lit one drawn over it, shown by `on`. */
function lamp(g: THREE.Object3D, geom: THREE.BufferGeometry, dark: string, lit: string, x: number, y: number, z: number, rx = 0) {
  part(g, geom, dark, x, y, z, { outline: false, rx });
  const on = glowing(g, geom, lit, x, y, z + 0.001, rx);
  on.visible = false;
  return on;
}

// ---------------------------------------------------------------------------------------------
// What's painted: the cameras' pictures, the screens, the logs and the signs.

const W_FEED = 256;
const H_FEED = 160;
/** A person seen from a camera: head and shoulders, `s` tall. */
function figure(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) {
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y - s * 0.86, s * 0.12, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(x - s * 0.17, y - s * 0.7);
  c.lineTo(x + s * 0.17, y - s * 0.7);
  c.lineTo(x + s * 0.13, y - s * 0.3);
  c.lineTo(x + s * 0.09, y);
  c.lineTo(x - s * 0.09, y);
  c.lineTo(x - s * 0.13, y - s * 0.3);
  c.closePath();
  c.fill();
}
/** A corridor seen down its length: the floor, the walls and the ceiling to a vanishing point. */
function corridor(c: CanvasRenderingContext2D, vx: number, vy: number, floor: string, wall: string, ceil: string, inner = 0.22) {
  const w = W_FEED;
  const h = H_FEED;
  const ix = (x: number) => vx + (x - vx) * inner;
  const iy = (y: number) => vy + (y - vy) * inner;
  const quad = (pts: number[][], col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
    c.closePath();
    c.fill();
  };
  quad([[0, h], [w, h], [ix(w), iy(h)], [ix(0), iy(h)]], floor);
  quad([[0, 0], [w, 0], [ix(w), iy(0)], [ix(0), iy(0)]], ceil);
  quad([[0, 0], [ix(0), iy(0)], [ix(0), iy(h)], [0, h]], wall);
  quad([[w, 0], [ix(w), iy(0)], [ix(w), iy(h)], [w, h]], shade(wall, 0.85));
  c.fillStyle = shade(wall, 0.6);
  c.fillRect(ix(0), iy(0), ix(w) - ix(0), iy(h) - iy(0));
}
/** Noise and scan lines over a picture, as a camera's picture has. */
function grain(c: CanvasRenderingContext2D, seed: number, tint = 'rgba(0,0,0,0.12)') {
  const r = seeded(seed);
  c.fillStyle = tint;
  for (let y = 0; y < H_FEED; y += 3) c.fillRect(0, y, W_FEED, 1);
  for (let i = 0; i < 500; i++) {
    c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
    c.fillRect(r() * W_FEED, r() * H_FEED, 2, 1);
  }
  const v = c.createRadialGradient(W_FEED / 2, H_FEED / 2, 40, W_FEED / 2, H_FEED / 2, 170);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = v;
  c.fillRect(0, 0, W_FEED, H_FEED);
}
/** The cameras round the building: what each is called and what it sees (no words: those go on over it). */
const FEEDS: Array<{ name: string; paint: Paint }> = [
  {
    name: '정문 출입구',
    paint: (c) => {
      c.fillStyle = '#1d262c';
      c.fillRect(0, 0, W_FEED, H_FEED);
      c.fillStyle = '#3a4650';
      c.fillRect(0, 96, W_FEED, 64);
      // The entrance canopy, the glass doors lit from inside, the plaza's paving.
      c.fillStyle = '#56636d';
      c.fillRect(30, 18, 196, 14);
      c.fillStyle = '#b8c7cf';
      c.fillRect(64, 34, 128, 66);
      c.fillStyle = '#7d8e98';
      for (const x of [64, 96, 128, 160, 192]) c.fillRect(x - 2, 34, 4, 66);
      c.strokeStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 9; i++) {
        c.beginPath();
        c.moveTo(i * 32 - 40, 160);
        c.lineTo(128 + (i - 4) * 8, 98);
        c.stroke();
      }
      figure(c, 150, 128, 46, '#11181d');
      figure(c, 92, 96, 26, '#3c4a52');
      c.fillStyle = 'rgba(255,240,200,0.35)';
      c.beginPath();
      c.arc(232, 30, 16, 0, Math.PI * 2);
      c.fill();
    },
  },
  {
    name: '1F 로비',
    paint: (c) => {
      c.fillStyle = '#c9cfc9';
      c.fillRect(0, 0, W_FEED, H_FEED);
      c.fillStyle = '#9fa8a3';
      c.fillRect(0, 70, W_FEED, 90);
      c.strokeStyle = '#8b958f';
      for (let i = 0; i < 12; i++) {
        c.beginPath();
        c.moveTo(i * 30 - 50, 160);
        c.lineTo(128 + (i - 6) * 12, 70);
        c.stroke();
      }
      for (let y = 80; y < 160; y += 16) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(256, y);
        c.stroke();
      }
      // The information desk, the speed gates, the lift doors.
      c.fillStyle = '#5d6b72';
      c.fillRect(30, 76, 70, 22);
      c.fillStyle = '#c0c8cc';
      for (const x of [140, 165, 190, 215]) c.fillRect(x, 82, 8, 22);
      c.fillStyle = '#7f8b90';
      c.fillRect(120, 20, 40, 50);
      c.fillRect(170, 20, 40, 50);
      figure(c, 62, 80, 22, '#2b3338');
      figure(c, 178, 140, 48, '#38434a');
      figure(c, 110, 120, 34, '#4b5860');
    },
  },
  {
    name: 'B2 주차장',
    paint: (c) => {
      c.fillStyle = '#2a302c';
      c.fillRect(0, 0, W_FEED, H_FEED);
      c.fillStyle = '#3b433e';
      c.fillRect(0, 60, W_FEED, 100);
      c.strokeStyle = '#d7d27a';
      c.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.moveTo(i * 44 - 20, 160);
        c.lineTo(60 + i * 26, 72);
        c.stroke();
      }
      c.lineWidth = 1;
      // The cars in their bays, the pillars with their numbers, the ceiling's lights.
      const cars = ['#66706b', '#8a8f8c', '#4e5652', '#9da39f'];
      cars.forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect(10 + i * 62, 96 + (i % 2) * 6, 46, 30);
        c.fillStyle = '#222';
        c.fillRect(14 + i * 62, 100 + (i % 2) * 6, 38, 10);
      });
      c.fillStyle = '#7d847f';
      for (const x of [50, 170]) c.fillRect(x, 20, 16, 120);
      c.fillStyle = '#e0e0a0';
      c.fillRect(52, 40, 12, 10);
      c.fillRect(172, 40, 12, 10);
      c.fillStyle = 'rgba(255,255,220,0.5)';
      for (let i = 0; i < 4; i++) c.fillRect(20 + i * 64, 8, 40, 4);
    },
  },
  {
    name: '엘리베이터 1호기',
    paint: (c) => {
      c.fillStyle = '#20262a';
      c.fillRect(0, 0, W_FEED, H_FEED);
      // Looking down from the car's ceiling corner: the walls bowed in by the fisheye, the floor, a rider.
      c.fillStyle = '#7e8b8f';
      c.beginPath();
      c.ellipse(128, 86, 120, 80, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#a7b2b5';
      c.beginPath();
      c.moveTo(70, 50);
      c.quadraticCurveTo(128, 40, 190, 50);
      c.quadraticCurveTo(200, 100, 180, 140);
      c.quadraticCurveTo(128, 150, 76, 140);
      c.quadraticCurveTo(58, 100, 70, 50);
      c.fill();
      c.strokeStyle = '#69767a';
      c.strokeRect(100, 60, 56, 70);
      c.fillStyle = '#2d3539';
      c.beginPath();
      c.arc(122, 92, 15, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3d4a50';
      c.beginPath();
      c.ellipse(124, 112, 22, 14, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#c8b18b';
      c.fillRect(150, 110, 16, 12);
    },
  },
  {
    name: '비상계단 3F',
    paint: (c) => {
      c.fillStyle = '#33393a';
      c.fillRect(0, 0, W_FEED, H_FEED);
      // The flight going up across the picture, its rail, the 비상구 sign glowing green.
      for (let i = 0; i < 9; i++) {
        c.fillStyle = i % 2 ? '#6c7577' : '#7f888a';
        c.beginPath();
        c.moveTo(20 + i * 22, 150 - i * 14);
        c.lineTo(80 + i * 22, 150 - i * 14);
        c.lineTo(80 + i * 22, 136 - i * 14);
        c.lineTo(20 + i * 22, 136 - i * 14);
        c.fill();
      }
      c.strokeStyle = '#b0b8ba';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(40, 110);
      c.lineTo(240, 0);
      c.stroke();
      c.lineWidth = 1;
      c.fillStyle = '#3ddc84';
      c.fillRect(196, 96, 44, 18);
      c.fillStyle = '#e8f5e9';
      c.fillRect(200, 100, 8, 10);
      c.fillStyle = '#d9d9d9';
      c.font = 'bold 26px sans-serif';
      c.fillText('3F', 20, 40);
    },
  },
  {
    name: '하역장',
    paint: (c) => {
      c.fillStyle = '#2b2f33';
      c.fillRect(0, 0, W_FEED, H_FEED);
      c.fillStyle = '#4a5157';
      c.fillRect(0, 104, W_FEED, 56);
      // The roller shutter half up, a truck backed in, pallets and a cart.
      c.fillStyle = '#7c868c';
      c.fillRect(110, 20, 130, 50);
      c.strokeStyle = '#5f686d';
      for (let y = 22; y < 70; y += 6) {
        c.beginPath();
        c.moveTo(110, y);
        c.lineTo(240, y);
        c.stroke();
      }
      c.fillStyle = '#d9dcdc';
      c.fillRect(124, 70, 104, 46);
      c.fillStyle = '#9aa1a3';
      c.fillRect(124, 70, 104, 6);
      c.fillStyle = '#8d6e4e';
      c.fillRect(20, 120, 50, 12);
      c.fillRect(24, 100, 42, 20);
      c.fillStyle = '#b08e6b';
      c.fillRect(26, 102, 18, 16);
      figure(c, 90, 132, 40, '#1f2427');
      c.fillStyle = '#f2c94c';
      for (let i = 0; i < 8; i++) c.fillRect(i * 32, 150, 16, 4);
    },
  },
  {
    name: '옥상',
    paint: (c) => {
      const sky = c.createLinearGradient(0, 0, 0, 90);
      sky.addColorStop(0, '#0d1626');
      sky.addColorStop(1, '#263449');
      c.fillStyle = sky;
      c.fillRect(0, 0, W_FEED, 90);
      const r = seeded(31);
      for (let i = 0; i < 50; i++) {
        c.fillStyle = r() > 0.6 ? '#ffe9a8' : '#c5d6ff';
        c.fillRect(r() * 256, 60 + r() * 28, 2, 2);
      }
      c.fillStyle = '#3c454c';
      c.fillRect(0, 88, W_FEED, 72);
      // The water tank, the railing, the helipad's H.
      c.fillStyle = '#6e7a82';
      c.fillRect(170, 40, 60, 60);
      c.fillStyle = '#56616a';
      c.beginPath();
      c.ellipse(200, 40, 30, 8, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#8d979d';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, 80);
      c.lineTo(256, 80);
      c.stroke();
      for (let x = 0; x < 256; x += 18) {
        c.beginPath();
        c.moveTo(x, 80);
        c.lineTo(x, 92);
        c.stroke();
      }
      c.lineWidth = 1;
      c.strokeStyle = '#c9cfd2';
      c.beginPath();
      c.ellipse(80, 128, 52, 20, 0, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#c9cfd2';
      c.font = 'bold 26px sans-serif';
      c.fillText('H', 71, 138);
    },
  },
  {
    name: '5F 복도',
    paint: (c) => {
      corridor(c, 140, 70, '#8f9792', '#c7cbc3', '#dfe2dc');
      // The office doors down each side, the lights along the ceiling, someone at the far end.
      c.fillStyle = '#6d5b4b';
      for (const [x, w] of [[14, 30], [70, 16], [100, 9]] as const) c.fillRect(x, 40 + (x / 140) * 22, w, 80 - (x / 140) * 40);
      for (const [x, w] of [[220, 26], [180, 14], [160, 8]] as const) c.fillRect(x, 42 + ((256 - x) / 140) * 18, w, 78 - ((256 - x) / 140) * 34);
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const k = 1 - i * 0.24;
        c.fillRect(140 - 40 * k, 70 - 60 * k, 80 * k, 4 * k + 1);
      }
      figure(c, 146, 96, 30, '#2f3a40');
    },
  },
];
const feedTex = (n: number) => feedPaint(((Math.floor(n) % FEEDS.length) + FEEDS.length) % FEEDS.length || 0);
const feedPaint = (i: number) => painted(`sgFeed${i}`, W_FEED, H_FEED, (c) => {
  FEEDS[i].paint(c);
  grain(c, 11 + i * 7);
});
/** The words a camera puts over its picture: its number and place, REC, the time. */
const osdTex = (n: number) => osdPaint(((Math.floor(n) % FEEDS.length) + FEEDS.length) % FEEDS.length || 0);
const osdPaint = (i: number) => painted(`sgOsd${i}`, W_FEED, H_FEED, (c) => {
  c.clearRect(0, 0, W_FEED, H_FEED);
  c.shadowColor = 'rgba(0,0,0,0.9)';
  c.shadowBlur = 3;
  text(c, `CAM ${String(i + 1).padStart(2, '0')}  ${FEEDS[i].name}`, 8, 14, 13, '#ffffff');
  text(c, `2026-10-27  02:1${i}:${String(17 + i * 6).padStart(2, '0')}`, 248, 148, 11, '#ffffff', 'right', false);
  c.fillStyle = '#ff1744';
  c.beginPath();
  c.arc(216, 14, 4.5, 0, Math.PI * 2);
  c.fill();
  text(c, 'REC', 248, 14, 11, '#ff5252', 'right');
});
/** The PTZ overlay on the big monitor while a camera's steered: the corners, the cross, the zoom. */
const paintPtz: Paint = (c) => {
  c.clearRect(0, 0, W_FEED, H_FEED);
  c.strokeStyle = 'rgba(255,255,140,0.9)';
  c.lineWidth = 2;
  const cx = W_FEED / 2;
  const cy = H_FEED / 2;
  c.beginPath();
  c.moveTo(cx - 14, cy);
  c.lineTo(cx - 4, cy);
  c.moveTo(cx + 4, cy);
  c.lineTo(cx + 14, cy);
  c.moveTo(cx, cy - 14);
  c.lineTo(cx, cy - 4);
  c.moveTo(cx, cy + 4);
  c.lineTo(cx, cy + 14);
  c.stroke();
  for (const [x, y, dx, dy] of [[60, 40, 1, 1], [196, 40, -1, 1], [60, 120, 1, -1], [196, 120, -1, -1]] as const) {
    c.beginPath();
    c.moveTo(x, y + dy * 14);
    c.lineTo(x, y);
    c.lineTo(x + dx * 14, y);
    c.stroke();
  }
  text(c, 'PTZ ▲▼◀▶  ZOOM', 8, 148, 11, '#fff59d');
};

/** The NVR's settings on the console's own monitor: the camera list, a camera's settings. */
const paintNvr: Paint = (c) => {
  c.fillStyle = '#1b2530';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#0d47a1';
  c.fillRect(0, 0, 384, 26);
  text(c, '통합관제 NVR · 카메라 설정', 10, 14, 14, '#ffffff');
  text(c, BUILDING, 374, 14, 12, '#bbdefb', 'right');
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i === 2 ? '#1565c0' : '#263544';
    c.fillRect(8, 34 + i * 26, 130, 22);
    text(c, `CAM ${String(i + 1).padStart(2, '0')} ${FEEDS[i].name}`, 14, 45 + i * 26, 11, '#e3f2fd', 'left', false);
    c.fillStyle = i === 5 ? '#ffb300' : '#43a047';
    c.beginPath();
    c.arc(128, 45 + i * 26, 4, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#22303d';
  c.fillRect(148, 34, 228, 214);
  text(c, 'CAM 03 · B2 주차장', 158, 50, 13, '#ffffff');
  const rows: Array<[string, string]> = [['해상도', '1920 × 1080'], ['프레임', '30 fps'], ['모션 감지', 'ON · 민감도 7'], ['녹화 보관', '30일'], ['야간 모드', '자동 (IR)'], ['프리셋', 'P1 출입구 · P2 경사로']];
  rows.forEach(([k, v], i) => {
    text(c, k, 160, 80 + i * 26, 12, '#90a4ae', 'left', false);
    c.fillStyle = '#2f4050';
    c.fillRect(244, 70 + i * 26, 124, 20);
    text(c, v, 250, 80 + i * 26, 12, '#e3f2fd', 'left', false);
  });
  c.fillStyle = '#1e88e5';
  c.fillRect(290, 226, 78, 16);
  text(c, '적용', 329, 234, 11, '#ffffff', 'center');
};
/** A ruled log page: a title, the columns, rows of entries in hand. */
function logPage(title: string, sub: string, cols: Array<[string, number]>, rows: string[][], head = '#37474f'): Paint {
  return (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 256, 362);
    text(c, title, 128, 24, 20, head, 'center');
    text(c, sub, 128, 48, 11, '#607d8b', 'center', false);
    c.strokeStyle = '#90a4ae';
    c.lineWidth = 1;
    c.strokeRect(10, 62, 236, 290);
    let x = 10;
    c.fillStyle = '#eceff1';
    c.fillRect(10, 62, 236, 22);
    for (const [name, w] of cols) {
      text(c, name, x + w / 2, 73, 11, '#37474f', 'center');
      x += w;
      if (x < 246) {
        c.beginPath();
        c.moveTo(x, 62);
        c.lineTo(x, 352);
        c.stroke();
      }
    }
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(10, 84 + i * 22);
      c.lineTo(246, 84 + i * 22);
      c.stroke();
    }
    rows.forEach((r, i) => {
      let cx = 10;
      r.forEach((v, j) => {
        text(c, v, cx + 4, 95 + i * 22, 11, v === '✓' || v === '이상 없음' ? '#2e7d32' : '#1a237e', 'left', false);
        cx += cols[j][1];
      });
    });
  };
}
const paintCctvLog = logPage('보안 관제 일지', `${BUILDING} 방재실 · 2026. 10. 27. 야간`, [['시각', 44], ['구역', 74], ['내용', 118]], [
  ['22:10', 'B2 주차장', '이상 없음'],
  ['23:40', '하역장', '택배 차량 출입'],
  ['00:25', '정문', '출입문 잠금 확인'],
  ['01:05', '5F 복도', '조명 점검 요청'],
  ['02:14', '3F 계단', '이상 없음'],
]);
const paintPatrolLog = logPage('순찰 일지', '2026. 10. 27. (화) 야간 근무', [['시각', 44], ['순찰 구역', 84], ['이상', 64], ['확인', 44]], [
  ['22:00', 'B2·B1 주차장', '이상 없음', '✓'],
  ['23:00', '1F 로비·하역장', '이상 없음', '✓'],
  ['00:00', '2F~6F 복도', '5F 소등', '✓'],
  ['01:00', '7F~12F 복도', '이상 없음', '✓'],
  ['02:00', '옥상·기계실', '', ''],
]);
const paintKeyLog = logPage('열쇠 수불대장', '반출 시 기재 · 반납 시 확인 서명', [['번호', 40], ['장소', 76], ['반출', 44], ['반납', 44], ['서명', 32]], [
  ['07', '3F 회의실', '09:10', '11:30', '김'],
  ['12', 'B1 기계실', '13:05', '14:20', '설'],
  ['21', '옥상 출입문', '15:40', '', ''],
  ['03', '1F 창고', '18:15', '18:50', '박'],
]);
const paintLostLog = logPage('분실물 접수대장', '습득 일시 · 장소 · 물품 · 보관 위치', [['일시', 52], ['장소', 62], ['물품', 74], ['보관', 48]], [
  ['10.25', '1F 로비', '검정 장우산', 'A-1'],
  ['10.26', '3F 화장실', '카드 지갑', 'B-2'],
  ['10.26', 'B2 주차장', '차 키', '금고'],
  ['10.27', '5F 복도', '무선 이어폰', 'B-1'],
]);
/** The building's floor plan with the night patrol's route and its checkpoints. */
const paintRoute: Paint = (c) => {
  c.fillStyle = '#fdfdf8';
  c.fillRect(0, 0, 384, 256);
  text(c, `${BUILDING} 기준층 평면 · 순찰 경로`, 12, 16, 14, '#263238');
  c.strokeStyle = '#455a64';
  c.lineWidth = 3;
  c.strokeRect(20, 34, 344, 200);
  c.lineWidth = 1.5;
  // The core (lifts, stairs, restrooms) in the middle, the offices round it, the corridor between.
  c.fillStyle = '#cfd8dc';
  c.fillRect(150, 100, 84, 70);
  for (const [x, y, w, h] of [[20, 34, 110, 70], [130, 34, 120, 52], [250, 34, 114, 70], [20, 170, 110, 64], [130, 186, 120, 48], [250, 170, 114, 64]] as const) {
    c.strokeRect(x, y, w, h);
  }
  text(c, '코어', 192, 135, 12, '#546e7a', 'center');
  c.setLineDash([6, 5]);
  c.strokeStyle = '#d32f2f';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(140, 92);
  c.lineTo(244, 92);
  c.lineTo(244, 178);
  c.lineTo(140, 178);
  c.closePath();
  c.stroke();
  c.setLineDash([]);
  const pts: Array<[number, number]> = [[140, 92], [192, 92], [244, 92], [244, 178], [192, 178], [140, 178]];
  pts.forEach(([x, y], i) => {
    c.fillStyle = '#d32f2f';
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.fill();
    text(c, String(i + 1), x, y + 1, 11, '#ffffff', 'center');
  });
  text(c, '● 순찰 체크포인트 (NFC)', 372, 246, 11, '#d32f2f', 'right');
};
/** A month's roster: 주간 · 야간 · 비번 a day for each guard. */
const paintRoster: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  text(c, '경비 근무표 · 10월', 128, 22, 18, '#263238', 'center');
  const names = ['안지킴', '최야간', '정순찰', '본인'];
  const codes = ['주', '야', '비'];
  const cols: Record<string, string> = { 주: '#fff59d', 야: '#90caf9', 비: '#e0e0e0' };
  for (let d = 0; d < 14; d++) text(c, String(d + 14), 62 + d * 13.5, 46, 9, '#546e7a', 'center', false);
  names.forEach((n, i) => {
    text(c, n, 8, 66 + i * 26, 11, '#37474f', 'left');
    for (let d = 0; d < 14; d++) {
      const k = codes[(d + i) % 3];
      c.fillStyle = cols[k];
      c.fillRect(56 + d * 13.5, 56 + i * 26, 12, 20);
      text(c, k, 62 + d * 13.5, 66 + i * 26, 9, '#37474f', 'center', false);
    }
  });
  text(c, '※ 야간 근무 후 비번 · 교대 08:00 / 20:00', 128, 190, 10, '#d32f2f', 'center', false);
};
/** The 근무 수칙 binder's cover. */
const paintRules: Paint = (c) => {
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 192, 256);
  c.fillStyle = '#ffffff';
  c.fillRect(20, 40, 152, 70);
  text(c, '보안 근무 수칙', 96, 64, 18, '#0d47a1', 'center');
  text(c, BUILDING, 96, 92, 13, '#1565c0', 'center');
  text(c, '1. 출입 통제', 24, 140, 12, '#e3f2fd', 'left', false);
  text(c, '2. 순찰 및 기록', 24, 162, 12, '#e3f2fd', 'left', false);
  text(c, '3. 비상시 행동 요령', 24, 184, 12, '#e3f2fd', 'left', false);
};
/** The visitor system on the desk's monitor. */
const paintVisitor: Paint = (c) => {
  c.fillStyle = '#f4f6f8';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#00695c';
  c.fillRect(0, 0, 384, 28);
  text(c, '방문객 출입 관리', 10, 15, 14, '#ffffff');
  text(c, BUILDING, 374, 15, 12, '#b2dfdb', 'right');
  const rows: Array<[string, string]> = [['방문객', '이○○'], ['방문처', '9F (주)새솔소프트'], ['목적', '업무 미팅'], ['신분증', '확인 완료 ✓'], ['방문증', 'VISITOR 07'], ['입실', '14:05']];
  rows.forEach(([k, v], i) => {
    text(c, k, 16, 52 + i * 30, 13, '#607d8b', 'left', false);
    c.fillStyle = '#ffffff';
    c.fillRect(100, 40 + i * 30, 268, 24);
    c.strokeStyle = '#cfd8dc';
    c.strokeRect(100, 40 + i * 30, 268, 24);
    text(c, v, 108, 52 + i * 30, 13, '#263238', 'left', false);
  });
  c.fillStyle = '#00897b';
  c.fillRect(270, 224, 98, 22);
  text(c, '방문증 출력', 319, 235, 12, '#ffffff', 'center');
};
/** A visitor's badge: VISITOR and its number. */
const paintBadge: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 128, 180);
  c.fillStyle = '#e65100';
  c.fillRect(0, 0, 128, 44);
  text(c, 'VISITOR', 64, 23, 20, '#ffffff', 'center');
  text(c, '방문증', 64, 72, 22, '#e65100', 'center');
  text(c, '07', 64, 116, 40, '#263238', 'center');
  text(c, BUILDING, 64, 160, 12, '#607d8b', 'center');
};

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  // The car park's entrance (2026-11-05, the layout audit).
  sgParkingGate(g) {
    parkingGate(g);
  },
  // The tower's pole sign on the pavement (2026-11-05, the layout audit).
  sgTowerSign: pavementSign('sgTowerSign', '🏢', '새솔|타워', ['지하 1~3층 주차장', '방문객은 1층 안내 데스크', '24시간 보안 근무'], NAVY, 2.2),
  /**
   * A CCTV console under its part of the video wall (2 × 1; two side by side make the wall): six
   * monitors in a steel frame, each a camera round the building with its number, place, REC and the
   * time over the picture, sequencing on their own every few seconds; the header bar; the console's
   * steel top over its cabinets (the NVRs racked in the right one, their lights flickering), the
   * PTZ controller — camera keypad on the left, joystick on the right — the log sheet on its
   * clipboard, the NVR's own monitor and keyboard at the left, the PA microphone, a radio in its
   * charger, a mug; a high-backed swivel chair. Watched sat at the controller (sgCctv): the big
   * monitor (bottom middle) switches to the camera called up on the keypad, zooms in as the stick is
   * twisted (the PTZ marks over it) and pans as it's leant, the stick moving with the hand. The
   * NVR's settings are typed at its keyboard, the chair rolled over to it.
   */
  securityMonitor(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.04;
    const zb = -D / 2;
    // The video wall's frame and its six monitors.
    for (const sx of [-1, 1]) part(g, rbox(0.05, 1.98, 0.06, 0.01), GUNMETAL, sx * (w / 2 - 0.03), 0.99, zb + 0.05);
    for (const y of [0.95, 1.37, 1.78]) part(g, box(w - 0.06, 0.035, 0.035), GUNMETAL, 0, y, zb + 0.05, { outline: false });
    part(g, rbox(w - 0.1, 0.08, 0.06, 0.01), '#263238', 0, 0.9, zb + 0.06);
    const wallZ = zb + 0.11;
    const screens: THREE.Mesh[] = [];
    const osd: THREE.Mesh[] = [];
    const xs = [-0.635, 0, 0.635];
    const ys = [1.16, 1.575];
    for (const y of ys)
      for (const x of xs) {
        part(g, rbox(0.625, 0.385, 0.05, 0.012), BLACK, x, y, wallZ);
        part(g, box(0.1, 0.012, 0.02), '#424242', x + 0.22, y - 0.18, wallZ + 0.026, { outline: false });
        screens.push(picture(g, feedTex(screens.length), 0.59, 0.355, x, y + 0.005, wallZ + 0.026));
        osd.push(overlay(g, osdTex(osd.length), 0.59, 0.355, x, y + 0.005, wallZ + 0.028));
      }
    const MAIN = 1;
    const ptz = overlay(g, painted('sgPtz', W_FEED, H_FEED, paintPtz), 0.59, 0.355, xs[1], ys[0] + 0.005, wallZ + 0.03);
    ptz.visible = false;
    part(g, rbox(w - 0.04, 0.12, 0.05, 0.012), NAVY, 0, 1.87, wallZ);
    label(g, `${BUILDING} 통합관제 CCTV`, 0.9, 0.08, -0.35, 1.87, wallZ + 0.026, NAVY, '#e3f2fd');
    for (let i = 0; i < 4; i++) glowing(g, cyl(0.012, 0.012, 0.004, 10), i === 0 ? ALARM : OK, 0.45 + i * 0.1, 1.87, wallZ + 0.027, Math.PI / 2);
    // The console: a steel top over two cabinets, the bumper along its front, the modesty panel.
    const zc = -0.03;
    const dd = 0.64;
    const zf = zc + dd / 2;
    const surf = TOP + 0.025;
    part(g, rbox(w, 0.05, dd, 0.015), '#d5dbde', 0, TOP, zc);
    part(g, rbox(w, 0.055, 0.05, 0.02), '#263238', 0, TOP - 0.005, zf);
    for (const sx of [-1, 1]) {
      const cx = sx * (w / 2 - 0.24);
      part(g, rbox(0.46, TOP - 0.03, dd - 0.08, 0.012), STEEL, cx, (TOP - 0.03) / 2, zc - 0.02);
      for (let i = 0; i < 5; i++) part(g, box(0.3, 0.008, 0.004), shade(STEEL, 0.7), cx, 0.12 + i * 0.03, zc - 0.02 + (dd - 0.08) / 2 + 0.002, { outline: false });
    }
    part(g, rbox(w - 0.94, 0.42, 0.02, 0.006), GUNMETAL, 0, TOP - 0.25, zc - dd / 2 + 0.05);
    // The NVRs racked in the right cabinet, their disk lights.
    const rackX = w / 2 - 0.24;
    const rackZ = zc - 0.02 + (dd - 0.08) / 2 + 0.006;
    const leds: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const y = 0.38 + i * 0.1;
      part(g, rbox(0.4, 0.08, 0.012, 0.004), '#1c1f22', rackX, y, rackZ);
      label(g, 'NVR', 0.06, 0.025, rackX - 0.15, y, rackZ + 0.007, '#1c1f22', '#90a4ae');
      for (let j = 0; j < 6; j++) leds.push(lamp(g, box(0.012, 0.008, 0.003), '#1b5e20', j % 3 === 2 ? '#ffb300' : OK, rackX - 0.02 + j * 0.035, y, rackZ + 0.008));
    }
    // The PTZ controller: the keypad and its little screen, the joystick in its boot.
    const CX = 0.08;
    const CZ = zf - 0.15;
    const ctop = surf + 0.035;
    part(g, rbox(0.38, 0.035, 0.17, 0.012), '#2b2f33', CX, surf + 0.0175, CZ);
    part(g, rbox(0.36, 0.004, 0.15, 0.002), '#3a4046', CX, ctop + 0.001, CZ, { outline: false });
    glowing(g, box(0.1, 0.002, 0.03), '#80deea', CX + CCTV.pad[0], ctop + 0.003, CZ - 0.055);
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 3; k++) part(g, box(0.022, 0.006, 0.018), r === 3 && k === 2 ? '#ef5350' : '#cfd8dc', CX + CCTV.pad[0] - 0.03 + k * 0.03, ctop + 0.004, CZ - 0.02 + r * 0.025, { outline: false });
    part(g, cyl(0.03, 0.042, 0.03, 16), '#151515', CX + CCTV.joy[0], ctop + 0.015, CZ + CCTV.joy[2]);
    const stick = group(g, CX + CCTV.joy[0], ctop + CCTV.joy[1], CZ + CCTV.joy[2]);
    const L = CCTV.stick;
    part(stick, cyl(0.007, 0.007, L, 8), CHROME, 0, L / 2, 0, { outline: false });
    part(stick, cyl(0.019, 0.017, 0.04, 14), '#1c1c1c', 0, L + 0.01, 0);
    part(stick, box(0.006, 0.026, 0.008), SAFETY, 0.019, L + 0.01, 0, { outline: false });
    part(stick, ball(0.008), '#d32f2f', 0, L + 0.032, 0, { outline: false });
    for (const k of [-1, 1]) part(g, cyl(0.009, 0.009, 0.006, 10), '#90a4ae', CX + 0.165, ctop + 0.004, CZ + k * 0.04, { outline: false });
    const ctl = marker(g, CX, ctop, CZ);
    // The NVR's own monitor and keyboard at the left.
    const KX = -0.46;
    const mon = group(g, -0.72, surf, zc - 0.12, 0.35);
    part(mon, rbox(0.15, 0.012, 0.11, 0.005), BLACK, 0, 0.006, 0);
    part(mon, rbox(0.03, 0.14, 0.02, 0.006), BLACK, 0, 0.08, -0.025);
    part(mon, rbox(0.42, 0.27, 0.03, 0.01), BLACK, 0, 0.27, 0);
    out.screen = litScreen(mon, painted('sgNvr', 384, 256, paintNvr), 0.39, 0.245, 0, 0.27, 0.017);
    part(g, rbox(0.36, 0.014, 0.12, 0.006), '#37474f', KX, surf + 0.007, CZ - 0.01);
    part(g, box(0.34, 0.004, 0.1), '#eceff1', KX, surf + 0.016, CZ - 0.01, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#37474f', KX + 0.24, surf + 0.01, CZ);
    const kbd = marker(g, KX, surf + 0.02, CZ - 0.01);
    // The log on its clipboard, a pen; the PA microphone, a radio in its charger, a mug.
    const lx = CX + CCTV.log[0];
    const lz = CZ + CCTV.log[2];
    part(g, rbox(0.17, 0.008, 0.24, 0.004), '#795548', lx, surf + 0.004, lz);
    part(g, rbox(0.07, 0.012, 0.02, 0.004), CHROME, lx, surf + 0.012, lz - 0.11);
    flat(g, painted('sgCctvLog', 256, 362, paintCctvLog), 0.15, 0.21, lx, surf + 0.009, lz + 0.01);
    pen(g, lx + 0.1, surf, lz + 0.02, 1.2);
    const mic = group(g, 0.66, surf, zc - 0.17);
    part(mic, rbox(0.1, 0.03, 0.12, 0.012), BLACK, 0, 0.015, 0);
    glowing(mic, box(0.02, 0.004, 0.012), OK, 0.025, 0.032, 0.04);
    rod(mic, new THREE.Vector3(0, 0.03, -0.02), new THREE.Vector3(0, 0.25, 0.02), 0.006, BLACK);
    rod(mic, new THREE.Vector3(0, 0.25, 0.02), new THREE.Vector3(0, 0.3, 0.12), 0.006, BLACK);
    part(mic, cyl(0.014, 0.011, 0.07, 10), '#424242', 0, 0.31, 0.15, { rx: Math.PI / 2 - 0.4 });
    label(g, '비상 방송', 0.09, 0.026, 0.66, surf + 0.032, zc - 0.105, BLACK, '#ffcc80').rotation.x = -Math.PI / 2;
    const dock = group(g, 0.86, surf, zc - 0.05);
    part(dock, rbox(0.09, 0.04, 0.07, 0.01), '#212121', 0, 0.02, 0);
    glowing(dock, box(0.012, 0.008, 0.003), OK, 0.03, 0.03, 0.036);
    radioUnit(dock).position.set(0, 0.105, 0);
    part(g, cyl(0.036, 0.031, 0.09, 12), '#eceff1', 0.68, surf + 0.045, CZ + 0.02);
    part(g, cyl(0.031, 0.031, 0.004, 12), '#4e342e', 0.68, surf + 0.088, CZ + 0.02, { outline: false });
    // The chair (it rolls to whichever place is being worked at).
    const chair = swivel(g, CX, zf + 0.24, Math.PI, '#263238', 0.68);
    const watch = sitAt(g, CX, 0.48, zf + 0.24, Math.PI, 'sgCctv', ctl);
    const tune = sitAt(g, KX, 0.48, zf + 0.24, Math.PI, 'type', kbd);
    out.seat = watch.at;
    out.work = ctl;
    out.spots = { '*': watch, securityGuard_tuneCameras: tune };
    // The big monitor's picture while a camera's steered: its own copy of each camera's picture, zoomed and panned.
    const zoomed = new Map<number, THREE.Texture>();
    const zoomTex = (cam: number) => {
      let tx = zoomed.get(cam);
      if (!tx) {
        tx = feedTex(cam).clone();
        tx.needsUpdate = true;
        zoomed.set(cam, tx);
      }
      return tx;
    };
    const showing: Array<THREE.Texture | null> = screens.map(() => null);
    const show = (i: number, tex: THREE.Texture, cam: number) => {
      if (showing[i] === tex) return;
      showing[i] = tex;
      (screens[i].material as THREE.MeshBasicMaterial).map = tex;
      (osd[i].material as THREE.MeshBasicMaterial).map = osdTex(cam);
    };
    const UP = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const twistQ = new THREE.Quaternion();
    let base = -1;
    let last = 0;
    // Every frame (the wall's always on, sequencing its cameras): which camera each monitor shows, and the steered one.
    out.away = (_gone, t) => {
      if (base < 0) base = Math.floor(sgPhase(g.getWorldPosition(tmp)) * 8);
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      const watching = posed(watch, t);
      for (let i = 0; i < screens.length; i++) {
        if (i === MAIN && watching) continue;
        const cam = (base + i * 3 + Math.floor(t / 9 + i * 0.37)) % 8;
        show(i, feedTex(cam), cam);
      }
      for (let i = 0; i < leds.length; i++) leds[i].visible = Math.sin(t * (5 + (i % 4) * 3) + i * 1.7) > 0.2;
      ptz.visible = watching;
      const sat = posed(tune, t) ? tune : watch;
      chair.position.x = THREE.MathUtils.damp(chair.position.x, sat.at.position.x, 6, dt);
      chair.rotation.y = sat.at.rotation.y;
      if (!watching) return;
      const ph = phaseOf(ctl);
      turnSpot(watch, 'sgCctv', t, ph);
      const v = cctvAt(t, ph);
      const cam = (base + 1 + v.cam) % 8;
      const tx = zoomTex(cam);
      const k = 1 / v.zoom;
      tx.repeat.set(k, k);
      tx.offset.set(((1 - k) / 2) * (1 + v.pan), (1 - k) * 0.45);
      show(MAIN, tx, cam);
      // The stick leant away (-z) and across (+x) and twisted, as the hand has it.
      dir.set(Math.sin(v.across), Math.cos(v.push) * Math.cos(v.across), -Math.sin(v.push)).normalize();
      stick.quaternion.setFromUnitVectors(UP, dir).multiply(twistQ.setFromAxisAngle(UP, v.twist));
    };
  },

  /**
   * The key cabinet (열쇠함) on the wall: a steel box with a glazed door (open while it's used), the
   * numbered hooks inside — 24 keys on coloured tags, a row a floor — the 열쇠함 plate on top, the
   * 반출 rule beside it, the ledge under it with the 열쇠 수불대장 open and a pen on its chain; the torch
   * and the patrol wand in their clips on its side (gone while the building's walked). A key's signed
   * out (sgKeys): a finger run along the hooks, this one lifted off and its tag read, handed to whoever
   * asked for it (turned to them), the 대장 signed — and its hook stays empty while it's out.
   */
  keyCabinet(g, _W, D, _c, _def, _ctx, out) {
    const zb = -D / 2;
    const ledgeY = 1.0;
    // The ledge on its brackets, the 수불대장 open on it, the pen on its chain.
    part(g, rbox(0.72, 0.03, 0.24, 0.01), STEEL, 0, ledgeY - 0.015, zb + 0.12);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.12, 0.18), GUNMETAL, sx * 0.3, ledgeY - 0.09, zb + 0.1);
    const work = marker(g, 0, ledgeY + 0.012, zb + 0.14);
    part(g, rbox(0.34, 0.012, 0.22, 0.004), '#1a237e', 0, ledgeY + 0.006, zb + 0.14);
    flat(g, painted('sgKeyLog', 256, 362, paintKeyLog), 0.155, 0.21, 0.08, ledgeY + 0.013, zb + 0.14);
    flat(g, painted('sgKeyLog', 256, 362, paintKeyLog), 0.155, 0.21, -0.08, ledgeY + 0.013, zb + 0.14);
    pen(g, 0.22, ledgeY + 0.01, zb + 0.16, 0.4);
    rod(g, new THREE.Vector3(0.28, ledgeY + 0.005, zb + 0.03), new THREE.Vector3(0.24, ledgeY + 0.012, zb + 0.15), 0.002, CHROME);
    // The box: back, sides, top and bottom; the board the hooks are on.
    const by = 1.1;
    const bh = 0.66;
    const bz = zb + 0.05;
    part(g, rbox(0.66, bh, 0.02, 0.006), '#b0bec5', 0, by + bh / 2, zb + 0.01);
    part(g, box(0.6, bh - 0.06, 0.008), '#eceff1', 0, by + bh / 2, zb + 0.025, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.02, bh, 0.1, 0.004), '#90a4ae', sx * 0.32, by + bh / 2, bz);
    for (const y of [by, by + bh]) part(g, rbox(0.66, 0.02, 0.1, 0.004), '#90a4ae', 0, y, bz);
    // The keys on their hooks: a row a floor, the tags coloured by row, numbered.
    const tagCols = ['#e53935', '#1e88e5', '#43a047', '#fdd835'];
    const keys = new Map<string, THREE.Group>();
    const hookZ = work.position.z + KEY_HOOKS[0][2];
    const keyOf = (parent: THREE.Object3D, n: number, col: string) => {
      const k = new THREE.Group();
      parent.add(k);
      part(k, ring(0.011, 0.0018), CHROME, 0, -0.012, 0, { outline: false });
      part(k, box(0.008, 0.04, 0.003), '#c9a227', 0.0, -0.045, 0.003, { outline: false });
      part(k, cyl(0.009, 0.009, 0.003, 10), '#c9a227', 0, -0.027, 0.003, { rx: Math.PI / 2, outline: false });
      part(k, rbox(0.026, 0.04, 0.004, 0.006), col, 0.017, -0.04, -0.002, { outline: false });
      label(k, String(n).padStart(2, '0'), 0.02, 0.014, 0.017, -0.036, 0.001, col, col === '#fdd835' ? '#212121' : '#ffffff');
      return k;
    };
    let n = 1;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++) {
        const x = -0.225 + c * 0.09;
        const y = work.position.y + 0.58 - r * 0.12;
        part(g, cyl(0.003, 0.003, 0.04, 6), CHROME, x, y, (hookZ + zb + 0.03) / 2, { rx: Math.PI / 2, outline: false });
        const k = keyOf(g, n++, tagCols[r]);
        k.position.set(x, y, hookZ);
        keys.set(`${c},${r}`, k);
        if (c === 0) label(g, `${5 - r}F`, 0.035, 0.016, -0.285, y - 0.03, zb + 0.03, '#eceff1', '#455a64');
      }
    const hooked = KEY_HOOKS.map((h) => keys.get(`${Math.round((h[0] + 0.225) / 0.09)},${Math.round((0.58 - h[1]) / 0.12)}`)!);
    // The glazed door, hung on the left (open while it's used), its lock and plate.
    const door = group(g, -0.33, by + bh / 2, bz + 0.05);
    door.userData.swing = -1;
    part(door, rbox(0.025, bh, 0.02, 0.005), '#78909c', 0.012, 0, 0);
    part(door, rbox(0.025, bh, 0.02, 0.005), '#78909c', 0.648, 0, 0);
    for (const y of [-1, 1]) part(door, rbox(0.66, 0.025, 0.02, 0.005), '#78909c', 0.33, y * (bh / 2 - 0.012), 0);
    glass(door, box(0.61, bh - 0.05, 0.006), 0.33, 0, 0);
    part(door, rbox(0.03, 0.06, 0.02, 0.006), CHROME, 0.62, 0, 0.012);
    part(door, cyl(0.007, 0.007, 0.006, 10), '#37474f', 0.62, 0.01, 0.024, { rx: Math.PI / 2, outline: false });
    out.doors = [door];
    part(g, rbox(0.5, 0.07, 0.02, 0.006), NAVY, 0, by + bh + 0.06, zb + 0.02);
    label(g, '열쇠함 · KEY BOX', 0.44, 0.05, 0, by + bh + 0.06, zb + 0.031, NAVY, '#ffffff');
    part(g, rbox(0.15, 0.13, 0.006, 0.004), '#fffde7', -0.42, 1.4, zb + 0.005);
    label(g, '열쇠 반출 시', 0.13, 0.03, -0.42, 1.43, zb + 0.009, '#fffde7', '#c62828');
    label(g, '수불대장 기재', 0.13, 0.03, -0.42, 1.38, zb + 0.009, '#fffde7', '#37474f');
    // The torch and the patrol wand in their clips on its right.
    const kit = group(g, 0.42, 0, zb + 0.04);
    part(kit, rbox(0.1, 0.03, 0.03, 0.006), GUNMETAL, 0, 1.38, 0);
    const torch = torchUnit(kit);
    torch.root.position.set(-0.02, 1.27, 0.03);
    torch.root.rotation.x = Math.PI / 2;
    torch.root.remove(torch.beam);
    part(kit, rbox(0.035, 0.18, 0.025, 0.01), '#212121', 0.03, 1.28, 0.03);
    part(kit, cyl(0.006, 0.006, 0.03, 8), CHROME, 0.03, 1.385, 0.03, { outline: false });
    label(g, '순찰 장비', 0.1, 0.025, 0.42, 1.43, zb + 0.032, '#fffde7', '#37474f');
    // The key in the hand while it's signed out (in use).
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const held = keyOf(use, 21, '#43a047');
    const keysAt = standAt(g, 0, 0.05, Math.PI, 'sgKeys', work);
    out.work = work;
    out.spots = { '*': keysAt };
    out.animate = (t) => {
      const ph = phaseOf(work);
      turnSpot(keysAt, 'sgKeys', t, ph);
      const k = keyAt(frameOf(keysAt, work), t, ph);
      hooked.forEach((h, i) => (h.visible = i !== k.hook || k.where === 'hook'));
      held.visible = k.where === 'hand';
      if (k.at) {
        held.position.copy(k.at).add(new THREE.Vector3(0, 0.04, 0));
        held.rotation.y = keysAt.at.rotation.y + Math.PI;
      }
    };
    out.away = (gone, t) => {
      kit.visible = !gone;
      if (!posed(keysAt, t)) for (const h of hooked) h.visible = true;
    };
  },

  /**
   * A patrol log desk (순찰 일지 데스크): a grey steel desk with a cork partition behind it — the
   * tower's typical floor drawn with the night round in red dashes and its six NFC checkpoints, the
   * month's 근무표 — the 순찰 일지 open on the top with the night's rounds ticked, a pen, the desk lamp
   * (lit while it's used), the guard's cap with its badge, a torch, a mug, a swivel chair. The log's
   * written sat at it; the 근무 수칙 binder read up in the chair; the roster drawn up on its own sheet.
   */
  patrolLog(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.08;
    const d = 0.6;
    const zc = -D / 2 + d / 2 + 0.03;
    const zf = zc + d / 2;
    const surf = TOP + 0.02;
    part(g, rbox(w, 0.04, d, 0.012), '#cfd8dc', 0, TOP, zc);
    part(g, rbox(w, 0.03, 0.03, 0.01), '#546e7a', 0, TOP - 0.01, zf - 0.01);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.04, TOP - 0.02, d - 0.06, 0.008), '#78909c', sx * (w / 2 - 0.03), (TOP - 0.02) / 2, zc);
      part(g, box(0.05, 0.02, d - 0.04), '#546e7a', sx * (w / 2 - 0.03), 0.01, zc, { outline: false });
    }
    part(g, rbox(0.28, 0.32, d - 0.08, 0.008), '#90a4ae', w / 2 - 0.2, TOP - 0.18, zc);
    part(g, rbox(0.22, 0.01, 0.01, 0.004), '#455a64', w / 2 - 0.2, TOP - 0.12, zc + (d - 0.08) / 2 + 0.005, { outline: false });
    // The cork partition with the route and the roster pinned up.
    const pz = zc - d / 2 + 0.02;
    part(g, rbox(w, 0.56, 0.03, 0.008), '#607d8b', 0, surf + 0.3, pz);
    part(g, box(w - 0.06, 0.5, 0.006), '#c8a26b', 0, surf + 0.3, pz + 0.017, { outline: false });
    picture(g, painted('sgRoute', 384, 256, paintRoute), 0.48, 0.32, -0.15, surf + 0.33, pz + 0.022);
    picture(g, painted('sgRoster', 256, 362, paintRoster), 0.2, 0.28, 0.27, surf + 0.31, pz + 0.022);
    for (const [x, y] of [[-0.37, 0.48], [0.07, 0.48], [0.27, 0.44]] as const) part(g, ball(0.008), '#e53935', x, surf + y, pz + 0.026, { outline: false });
    // The log open on the top, a pen; the lamp; the cap, a torch, a mug.
    const lz = zf - 0.17;
    part(g, rbox(0.36, 0.012, 0.25, 0.004), NAVY, 0, surf + 0.006, lz);
    flat(g, painted('sgPatrolLog', 256, 362, paintPatrolLog), 0.165, 0.23, 0.085, surf + 0.013, lz);
    flat(g, painted('sgPatrolLog', 256, 362, paintPatrolLog), 0.165, 0.23, -0.085, surf + 0.013, lz);
    pen(g, 0.2, surf + 0.01, lz + 0.03, 0.5);
    const work = marker(g, 0.05, surf + 0.015, lz);
    const lampG = group(g, -0.33, surf, zc - 0.12, 0.4);
    part(lampG, cyl(0.06, 0.07, 0.02, 14), '#263238', 0, 0.01, 0);
    rod(lampG, new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, 0.3, -0.04), 0.008, '#263238');
    rod(lampG, new THREE.Vector3(0, 0.3, -0.04), new THREE.Vector3(0, 0.36, 0.1), 0.008, '#263238');
    part(lampG, cyl(0.03, 0.065, 0.08, 14), '#263238', 0, 0.33, 0.14, { rx: 0.4 });
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const lampOn = group(use, -0.33, surf, zc - 0.12, 0.4);
    glowing(lampOn, cyl(0.06, 0.06, 0.004, 14), '#fff3c4', 0, 0.292, 0.124, 0.4);
    const cap = group(g, 0.32, surf, zc - 0.12, -0.5);
    part(cap, ball(0.085), NAVY, 0, 0.0, 0).scale.set(1, 0.6, 1.05);
    part(cap, rbox(0.15, 0.008, 0.09, 0.03), '#111111', 0, 0.006, 0.1);
    part(cap, cyl(0.02, 0.02, 0.004, 10), '#c9a227', 0, 0.045, 0.072, { rx: Math.PI / 2 - 0.5, outline: false });
    const torch = torchUnit(g);
    torch.root.position.set(0.3, surf + 0.018, zf - 0.08);
    torch.root.rotation.y = -1.9;
    torch.root.remove(torch.beam);
    part(g, cyl(0.035, 0.03, 0.09, 12), '#eceff1', -0.36, surf + 0.045, zf - 0.12);
    // What's on the top for the other uses: the 근무 수칙 binder, the roster's draft.
    const rules = group(g, 0.08, surf, zc - 0.16, Math.PI / 2 + 0.08);
    part(rules, rbox(0.2, 0.04, 0.27, 0.008), '#1565c0', 0, 0.02, 0);
    flat(rules, painted('sgRules', 192, 256, paintRules), 0.18, 0.24, 0, 0.041, 0);
    const draft = group(use, 0.0, surf + 0.02, lz + 0.01, -0.06);
    flat(draft, painted('sgRoster', 256, 362, paintRoster), 0.17, 0.24, 0, 0, 0);
    swivel(g, 0, zf + 0.24, Math.PI, '#37474f');
    const write = sitAt(g, 0, 0.48, zf + 0.24, Math.PI, 'write', work);
    const read = also(g, write, 'read');
    const roster = also(g, write, 'write', work);
    out.seat = write.at;
    out.work = work;
    out.spots = { '*': write, securityGuard_learnPosts: read, securityGuard_planRoster: roster };
    out.animate = (t) => {
      rules.visible = !posed(read, t);
      draft.visible = posed(roster, t);
    };
    out.away = (_g, t) => {
      if (!posed(read, t)) rules.visible = true;
    };
  },

  /**
   * The intruder alarm panel (방범 감시반) on the wall: a grey steel cabinet with the tower drawn in
   * section on its dark face — 12F down to B2, a lamp a wing a floor (서측 · 코어 · 동측), all green
   * while it's armed — the status lamps (전원 · 경계 · 이상 · 통신) and the key switch on its left, the
   * event screen and the event printer on its right, the control shelf (keypad, 확인, 복구, buzzer), a
   * red beacon on top. At an intrusion (intrusionAlert) the 4F 서측 lamp flashes red and the beacon
   * turns: the zone traced on the drawing, 확인 pressed (the flashing stops, steady red), the radio up
   * to send someone, listened to, 복구 (back to green). Tested (testAlarms) the reds run up the floors
   * a row at a time — the lamp test — till 확인.
   */
  alarmPanel(g, _W, D, _c, _def, _ctx, out) {
    const zb = -D / 2;
    const face = zb + 0.16;
    part(g, rbox(1.74, 1.12, 0.16, 0.015), '#d9dde0', 0, 1.46, zb + 0.08);
    part(g, box(1.66, 1.04, 0.006), '#16222e', 0, 1.46, face + 0.002, { outline: false });
    part(g, box(1.66, 0.09, 0.008), NAVY, 0, 1.94, face + 0.004, { outline: false });
    label(g, `방범 감시반 · ${BUILDING}`, 0.62, 0.06, -0.38, 1.94, face + 0.009, NAVY, '#ffffff');
    // The tower in section: the floors' names, the wings, a lamp a wing a floor (one goes red).
    const CW = 0.16;
    const RH = 0.04;
    const work = marker(g, 0, 1.12, face + 0.07);
    const hot: [number, number] = [8, 0];
    const gx0 = work.position.x + PANEL.zone[0] - (hot[1] + 0.5) * CW;
    const gy0 = work.position.y + PANEL.zone[1] + (hot[0] + 0.5) * RH;
    const floors = ['12F', '11F', '10F', '9F', '8F', '7F', '6F', '5F', '4F', '3F', '2F', '1F', 'B1', 'B2'];
    const rx0 = gx0 - 0.22;
    const ry1 = gy0 + 0.04;
    const PX = 400;
    picture(g, painted('sgSection', 280, 248, (c) => {
      c.fillStyle = '#16222e';
      c.fillRect(0, 0, 280, 248);
      const X = (x: number) => (x - rx0) * PX;
      const Y = (y: number) => (ry1 - y) * PX;
      c.strokeStyle = '#90caf9';
      c.lineWidth = 2;
      c.strokeRect(X(gx0), Y(gy0), 3 * CW * PX, 14 * RH * PX);
      c.lineWidth = 1;
      c.strokeStyle = 'rgba(144,202,249,0.5)';
      for (let r = 1; r < 14; r++) {
        c.beginPath();
        c.moveTo(X(gx0), Y(gy0 - r * RH));
        c.lineTo(X(gx0 + 3 * CW), Y(gy0 - r * RH));
        c.stroke();
      }
      for (let k = 1; k < 3; k++) {
        c.beginPath();
        c.moveTo(X(gx0 + k * CW), Y(gy0));
        c.lineTo(X(gx0 + k * CW), Y(gy0 - 14 * RH));
        c.stroke();
      }
      c.fillStyle = 'rgba(144,202,249,0.25)';
      c.fillRect(X(gx0), Y(gy0 - 12 * RH), 3 * CW * PX, 2);
      floors.forEach((f, r) => text(c, f, X(gx0) - 8, Y(gy0 - (r + 0.5) * RH), 11, r >= 12 ? '#ffcc80' : '#e3f2fd', 'right'));
      ['서측', '코어', '동측'].forEach((s, k) => text(c, s, X(gx0 + (k + 0.5) * CW), 8, 10, '#90caf9', 'center'));
    }), 0.7, 0.62, rx0 + 0.35, ry1 - 0.31, face + 0.006);
    const reds: THREE.Mesh[][] = [];
    for (let r = 0; r < 14; r++) {
      reds.push([]);
      for (let k = 0; k < 3; k++) {
        const x = gx0 + (k + 0.5) * CW;
        const y = gy0 - (r + 0.5) * RH;
        glowing(g, rbox(0.03, 0.016, 0.006, 0.003), '#43a047', x, y, face + 0.009);
        const red = glowing(g, rbox(0.034, 0.02, 0.006, 0.003), ALARM, x, y, face + 0.012);
        red.visible = false;
        reds[r].push(red);
      }
    }
    // The status lamps and the key switch on the left.
    ([['전원', OK, true], ['경계', '#ffb300', true], ['이상', ALARM, false], ['통신', OK, true]] as const).forEach(([s, col, on], i) => {
      const y = 1.72 - i * 0.09;
      const l = lamp(g, cyl(0.02, 0.02, 0.008, 14), '#3e2723', col, -0.7, y, face + 0.008, Math.PI / 2);
      l.visible = on;
      label(g, s, 0.08, 0.03, -0.6, y, face + 0.006, '#16222e', '#e3f2fd');
    });
    part(g, cyl(0.03, 0.03, 0.02, 16), CHROME, -0.66, 1.3, face + 0.012, { rx: Math.PI / 2 });
    part(g, box(0.008, 0.03, 0.01), '#212121', -0.66, 1.3, face + 0.025, { outline: false });
    label(g, '경계 · 해제', 0.12, 0.03, -0.66, 1.24, face + 0.006, '#16222e', '#ffcc80');
    // The event screen and the printer on the right.
    out.screen = litScreen(g, painted('sgEvents', 384, 256, (c) => {
      c.fillStyle = '#0b1a10';
      c.fillRect(0, 0, 384, 256);
      text(c, 'EVENT LOG · 방범', 12, 18, 16, '#69f0ae');
      const ev = ['02:14:33  4F 서측  침입 감지', '02:14:40  확인 · 근무자 출동', '01:58:02  B1 주차장 문 열림', '01:12:47  경계 설정 (전관)', '00:40:15  3F 동측 정상 복구', '23:05:09  하역장 셔터 닫힘'];
      ev.forEach((s, i) => text(c, s, 12, 52 + i * 32, 14, i === 0 ? '#ff8a80' : '#b9f6ca', 'left', false));
    }), 0.4, 0.25, 0.58, 1.66, face + 0.012);
    part(g, rbox(0.44, 0.29, 0.02, 0.01), '#263238', 0.58, 1.66, face + 0.002);
    part(g, rbox(0.3, 0.12, 0.08, 0.012), '#eceff1', 0.58, 1.35, face + 0.04);
    part(g, box(0.2, 0.006, 0.02), '#212121', 0.58, 1.415, face + 0.06, { outline: false });
    part(g, box(0.17, 0.09, 0.002), PAPER, 0.58, 1.46, face + 0.062, { rx: -0.2, outline: false });
    label(g, '이벤트 프린터', 0.16, 0.03, 0.58, 1.33, face + 0.081, '#eceff1', '#455a64');
    // The control shelf: keypad, 확인, 복구, the buzzer's grille.
    part(g, rbox(1.5, 0.03, 0.14, 0.008), '#b0bec5', 0, work.position.y - 0.015, face + 0.07);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.1, 0.12), GUNMETAL, sx * 0.7, work.position.y - 0.08, face + 0.06);
    const sy = work.position.y;
    const sz = work.position.z;
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) part(g, box(0.026, 0.008, 0.022), '#eceff1', -0.38 + k * 0.035, sy + 0.004, sz - 0.03 + r * 0.03, { outline: false });
    const button = (x: number, col: string, s: string) => {
      part(g, cyl(0.03, 0.03, 0.012, 16), '#37474f', work.position.x + x, sy + 0.006, sz);
      part(g, cyl(0.022, 0.022, 0.012, 16), col, work.position.x + x, sy + 0.014, sz);
      const m = label(g, s, 0.06, 0.024, work.position.x + x, sy + 0.002, sz + 0.05, '#b0bec5', '#263238');
      m.rotation.x = -Math.PI / 2;
    };
    button(PANEL.ack[0], '#fdd835', '확인');
    button(PANEL.reset[0], '#43a047', '복구');
    for (let i = 0; i < 5; i++) part(g, box(0.1, 0.003, 0.006), '#263238', 0.5, sy + 0.002, sz - 0.03 + i * 0.015, { outline: false });
    // The beacon on top: a red dome, the reflector inside that turns while it's going.
    const bx = 0.72;
    part(g, cyl(0.06, 0.07, 0.04, 16), '#212121', bx, 2.04, zb + 0.08);
    glass(g, ball(0.06), bx, 2.09, zb + 0.08, new THREE.MeshToonMaterial({ color: '#e53935', transparent: true, opacity: 0.55, depthWrite: false }));
    const spin = group(g, bx, 2.09, zb + 0.08);
    glowing(spin, box(0.07, 0.05, 0.012), '#ff5252', 0, 0, 0.012);
    part(spin, box(0.06, 0.04, 0.01), '#cfd8dc', 0, 0, -0.004, { outline: false });
    spin.visible = false;
    // How it's answered.
    const check = standAt(g, 0, sz + 0.36, Math.PI, 'sgAlarm', work);
    const alert = also(g, check, 'sgAlarm');
    out.work = work;
    out.spots = { '*': check, intrusionAlert: alert };
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const radio = radioUnit(use);
    const clear = () => {
      for (const row of reds) for (const m of row) m.visible = false;
      spin.visible = false;
    };
    out.animate = (t) => {
      const s = posed(alert, t) ? alert : check;
      const ph = phaseOf(work);
      turnSpot(s, 'sgAlarm', t, ph);
      const p = panelAt(frameOf(s, work), t, ph);
      clear();
      radio.visible = !!p.radio;
      if (p.radio) {
        radio.position.copy(p.radio);
        radio.rotation.y = s.at.rotation.y + Math.PI;
      }
      if (s === alert) {
        reds[hot[0]][hot[1]].visible = !p.reset && (p.acked || Math.sin(t * 10) > 0);
        spin.visible = !p.reset;
        spin.rotation.y = t * 7;
        return;
      }
      // The lamp test: a floor at a time up the tower, all on once it's acknowledged, off at 복구.
      if (p.reset) return;
      const row = p.acked ? -1 : 13 - (Math.floor(t * 4) % 14);
      for (let r = 0; r < 14; r++) for (const m of reds[r]) m.visible = p.acked || r === row;
    };
    out.away = (_g, t) => {
      if (!posed(alert, t) && !posed(check, t)) clear();
    };
  },

  /**
   * The fire alarm control panel (방재 수신기 · P형 1급 수신기), stood on the floor: a cream steel
   * cabinet, its louvred doors below with the 자동화재탐지설비 plate; the sloped desk with the bell
   * switches (주경종 · 지구경종 · 비상방송 · 사이렌 · 축적), the test selectors, 확인 and 복구 and the
   * 비상전화's handset; above, the window of 25 경계구역 — a red lamp over each zone's name — the big
   * 화재 lamp and the power lamps (교류전원 always lit). Checked (sgAlarm, 동작시험): the zones light one
   * after another with the 화재 lamp flashing, 확인 holds the zone being tested, the radio up to tell
   * the floors it's a test, 복구 puts it all out.
   */
  sgFirePanel(g, _W, D, _c, _def, _ctx, out) {
    const zb = -D / 2;
    const face = -0.06;
    // The lower cabinet, its doors, louvres and plate.
    part(g, rbox(1.64, 0.95, 0.44, 0.015), CREAM, 0, 0.475, (zb + face) / 2 + 0.02);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.78, 0.82, 0.012, 0.006), shade(CREAM, 0.95), sx * 0.405, 0.46, face + 0.03);
      for (let i = 0; i < 6; i++) part(g, box(0.5, 0.012, 0.006), shade(CREAM, 0.75), sx * 0.405, 0.18 + i * 0.03, face + 0.038, { outline: false });
      part(g, rbox(0.02, 0.12, 0.02, 0.006), '#9e9e9e', sx * 0.06, 0.56, face + 0.045);
    }
    part(g, rbox(0.7, 0.1, 0.006, 0.004), '#eceff1', 0, 0.78, face + 0.039);
    label(g, '자동화재탐지설비 · P형 1급 수신기', 0.66, 0.05, 0, 0.79, face + 0.043, '#eceff1', '#b71c1c');
    label(g, `${BUILDING} 방재실`, 0.3, 0.03, 0, 0.75, face + 0.043, '#eceff1', '#455a64');
    // The desk and its control plate.
    const work = marker(g, 0, 1.075, 0.0);
    part(g, rbox(1.64, 0.12, 0.56, 0.015), CREAM, 0, 1.01, -0.2);
    part(g, box(1.52, 0.006, 0.12), '#d7d2c4', 0, 1.073, 0.0, { outline: false });
    const sy = work.position.y;
    const sz = work.position.z;
    const flatLabel = (s: string, w: number, x: number, z: number, fg = '#37474f') => {
      const m = label(g, s, w, 0.022, x, sy + 0.004, z, '#d7d2c4', fg);
      m.rotation.x = -Math.PI / 2;
    };
    ['주경종', '지구경종', '비상방송', '사이렌', '축적'].forEach((s, i) => {
      const x = -0.68 + i * 0.1;
      part(g, rbox(0.04, 0.012, 0.03, 0.004), '#455a64', x, sy + 0.006, sz - 0.02);
      part(g, cyl(0.004, 0.004, 0.03, 6), CHROME, x, sy + 0.022, sz - 0.025, { rx: -0.4, outline: false });
      flatLabel(s, 0.085, x, sz + 0.035);
    });
    for (const [x, s] of [[-0.12, '동작시험'], [0.42, '도통시험']] as const) {
      part(g, cyl(0.026, 0.026, 0.014, 16), '#212121', x, sy + 0.008, sz - 0.01);
      part(g, box(0.008, 0.008, 0.03), '#eceff1', x, sy + 0.017, sz - 0.015, { outline: false });
      flatLabel(s, 0.09, x, sz + 0.035);
    }
    const button = (x: number, col: string, s: string) => {
      part(g, cyl(0.028, 0.028, 0.012, 16), '#37474f', x, sy + 0.006, sz);
      part(g, cyl(0.021, 0.021, 0.012, 16), col, x, sy + 0.014, sz);
      flatLabel(s, 0.06, x, sz + 0.04);
    };
    button(work.position.x + PANEL.ack[0], '#fdd835', '확인');
    button(work.position.x + PANEL.reset[0], '#43a047', '복구');
    // The 비상전화's handset in its cradle, its curly cord.
    part(g, rbox(0.1, 0.03, 0.2, 0.01), '#263238', 0.66, sy + 0.015, sz - 0.02);
    part(g, rbox(0.05, 0.035, 0.22, 0.015), '#111111', 0.66, sy + 0.045, sz - 0.02);
    for (let i = 0; i < 6; i++) part(g, ring(0.012, 0.003), '#111111', 0.71 + i * 0.006, sy - 0.02 - i * 0.02, sz + 0.06, { ry: Math.PI / 2, outline: false });
    flatLabel('비상전화', 0.09, 0.66, sz + 0.1);
    // The upper cabinet and its face: the zone window, the 화재 and power lamps, the speaker.
    part(g, rbox(1.64, 0.74, face - zb, 0.015), CREAM, 0, 1.07 + 0.37, (zb + face) / 2);
    part(g, rbox(1.56, 0.66, 0.006, 0.006), '#f3efe4', 0, 1.44, face + 0.004);
    part(g, box(1.5, 0.08, 0.006), '#b71c1c', 0, 1.715, face + 0.007, { outline: false });
    label(g, 'P형 1급 수신기 · 화재 경계구역', 0.7, 0.05, -0.3, 1.715, face + 0.011, '#b71c1c', '#ffffff');
    const CW = 0.18;
    const RH = 0.07;
    const hot: [number, number] = [2, 2];
    const gx0 = work.position.x + PANEL.zone[0] - (hot[1] + 0.5) * CW;
    const gy0 = work.position.y + PANEL.zone[1] + (hot[0] + 0.5) * RH;
    const zones = ['B2 기계실', 'B2 전기실', 'B2 주차장', 'B1 주차장', 'B1 창고', '1F 로비', '1F 하역장', '2F 동측', '2F 서측', '3F 동측', '3F 서측', '4F 동측', '4F 서측', '5F 동측', '5F 서측', '6F', '7F', '8F', '9F', '10F', '11F', '12F', '옥상', '계단실', 'E/V 홀'];
    const PX = 400;
    const wx0 = gx0 - 0.02;
    const wy1 = gy0 + 0.02;
    picture(g, painted('sgZones', 376, 156, (c) => {
      c.fillStyle = '#fbf8ef';
      c.fillRect(0, 0, 376, 156);
      c.strokeStyle = '#bcaaa4';
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 5; k++) {
          const x = (gx0 - wx0 + k * CW) * PX;
          const y = (wy1 - gy0 + r * RH) * PX;
          c.strokeRect(x + 1, y + 1, CW * PX - 2, RH * PX - 2);
          text(c, `${r * 5 + k + 1} ${zones[r * 5 + k]}`, x + (CW * PX) / 2, y + RH * PX * 0.74, 12, '#37474f', 'center', false);
        }
    }), 0.94, 0.39, wx0 + 0.47, wy1 - 0.195, face + 0.008);
    const zoneLamps: THREE.Mesh[] = [];
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 5; k++) zoneLamps.push(lamp(g, rbox(0.06, 0.022, 0.008, 0.004), '#7f1d1d', ALARM, gx0 + (k + 0.5) * CW, gy0 - (r + 0.5) * RH + 0.014, face + 0.012));
    const fire = lamp(g, rbox(0.14, 0.08, 0.01, 0.01), '#7f1d1d', ALARM, 0.6, 1.58, face + 0.012);
    label(g, '화재', 0.08, 0.035, 0.6, 1.58, face + 0.019, '#7f1d1d', '#ffffff');
    const power = ([['교류전원', OK, true], ['예비전원', OK, false], ['스위치주의', '#ffb300', false], ['도통', OK, false]] as const).map(([s, col, on], i) => {
      const y = 1.47 - i * 0.065;
      const l = lamp(g, cyl(0.016, 0.016, 0.008, 12), '#3e2723', col, 0.5, y, face + 0.012, Math.PI / 2);
      l.visible = on;
      label(g, s, 0.12, 0.028, 0.62, y, face + 0.009, '#f3efe4', '#37474f');
      return l;
    });
    for (let i = 0; i < 5; i++) part(g, box(0.12, 0.006, 0.004), '#5d4037', -0.7, 1.32 + i * 0.022, face + 0.009, { outline: false });
    label(g, '스피커', 0.08, 0.025, -0.7, 1.28, face + 0.009, '#f3efe4', '#5d4037');
    // How it's checked.
    const check = standAt(g, 0, sz + 0.38, Math.PI, 'sgAlarm', work);
    out.work = work;
    out.spots = { '*': check };
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const radio = radioUnit(use);
    const clear = () => {
      for (const l of zoneLamps) l.visible = false;
      fire.visible = false;
      power[2].visible = power[3].visible = false;
    };
    out.animate = (t) => {
      const ph = phaseOf(work);
      turnSpot(check, 'sgAlarm', t, ph);
      const p = panelAt(frameOf(check, work), t, ph);
      clear();
      radio.visible = !!p.radio;
      if (p.radio) {
        radio.position.copy(p.radio);
        radio.rotation.y = check.at.rotation.y + Math.PI;
      }
      power[3].visible = true;
      if (p.reset) return;
      power[2].visible = true;
      if (p.acked) {
        zoneLamps[hot[0] * 5 + hot[1]].visible = true;
        fire.visible = true;
        return;
      }
      zoneLamps[Math.floor(t * 3) % zoneLamps.length].visible = true;
      fire.visible = Math.sin(t * 9) > 0;
    };
    out.away = (_g, t) => {
      if (!posed(check, t)) clear();
    };
  },

  /**
   * The radios' charging rack (무전기 충전 랙) on the wall: a steel shelf with a six-way gang charger,
   * a radio standing in each cup with its light (green charged, red charging), the board behind with
   * the 반출 rule and the channels (CH1 보안 · CH2 방재 · CH3 시설), the sign-out sheet on its clip, two
   * belt holsters on hooks. A radio's checked (sgRadio): lifted out, its battery and channel looked at,
   * a call sent with it at the mouth ("방재실, 감 잡히나"), the answer listened to, put back.
   */
  sgRadioDock(g, _W, D, _c, _def, _ctx, out) {
    const zb = -D / 2;
    part(g, rbox(0.82, 0.52, 0.02, 0.008), '#eceff1', 0, 1.46, zb + 0.012);
    label(g, '무전기 충전 · 반출 시 기재', 0.5, 0.05, -0.12, 1.65, zb + 0.024, '#eceff1', '#c62828');
    ['CH1 보안', 'CH2 방재', 'CH3 시설'].forEach((s, i) => {
      part(g, rbox(0.15, 0.045, 0.006, 0.004), ['#1565c0', '#c62828', '#2e7d32'][i], -0.27 + i * 0.16, 1.55, zb + 0.024);
      label(g, s, 0.13, 0.03, -0.27 + i * 0.16, 1.55, zb + 0.028, ['#1565c0', '#c62828', '#2e7d32'][i], '#ffffff');
    });
    part(g, rbox(0.18, 0.26, 0.012, 0.006), '#8d6e63', 0.27, 1.36, zb + 0.026);
    part(g, rbox(0.07, 0.015, 0.01, 0.004), CHROME, 0.27, 1.48, zb + 0.034);
    picture(g, painted('sgRadioLog', 256, 362, logPage('무전기 반출 대장', '반출 · 반납 · 서명', [['번호', 44], ['반출', 64], ['반납', 64], ['서명', 64]], [['1', '08:00', '20:00', '최'], ['2', '08:00', '', ''], ['4', '20:00', '', '정']])), 0.16, 0.22, 0.27, 1.35, zb + 0.034);
    // The shelf on its brackets, the gang charger, a radio in each cup.
    part(g, rbox(0.84, 0.03, 0.26, 0.008), STEEL, 0, 0.935, zb + 0.13);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.12, 0.2), GUNMETAL, sx * 0.36, 0.86, zb + 0.11);
    const cz = zb + 0.11;
    part(g, rbox(0.76, 0.06, 0.13, 0.012), '#1c1c1c', 0, 0.98, cz);
    const slots: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const x = -0.3 + i * 0.12;
      part(g, rbox(0.075, 0.03, 0.055, 0.008), '#2b2b2b', x, 1.02, cz);
      lamp(g, box(0.014, 0.008, 0.003), '#1b1b1b', i === 1 || i === 4 ? ALARM : OK, x, 0.975, cz + 0.066).visible = true;
      const r = radioUnit(g);
      r.position.set(x, 1.035 + 0.065, cz);
      slots.push(r);
    }
    const USED = 2;
    const work = marker(g, slots[USED].position.x, slots[USED].position.y - 0.01, cz);
    // Two belt holsters on their hooks under the shelf.
    for (const x of [-0.18, 0.12]) {
      part(g, cyl(0.004, 0.004, 0.04, 6), CHROME, x, 0.84, zb + 0.03, { rx: Math.PI / 2, outline: false });
      part(g, rbox(0.07, 0.15, 0.035, 0.012), '#212121', x, 0.75, zb + 0.045);
      part(g, box(0.05, 0.02, 0.04), '#424242', x, 0.82, zb + 0.045, { outline: false });
    }
    const st = standAt(g, work.position.x, 0.03, Math.PI, 'sgRadio', work);
    out.work = work;
    out.spots = { '*': st };
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const held = radioUnit(use);
    const tx = glowing(held, ball(0.006), ALARM, -0.015, 0.075, 0.01);
    out.animate = (t) => {
      const ph = phaseOf(work);
      turnSpot(st, 'sgRadio', t, ph);
      const r = radioAt(frameOf(st, work), t, ph);
      slots[USED].visible = !r.held;
      held.visible = r.held;
      tx.visible = r.key === 'talk';
      if (r.at) {
        held.position.copy(r.at);
        held.rotation.y = st.at.rotation.y + Math.PI;
      }
    };
    out.away = (_g, t) => {
      if (!posed(st, t)) slots[USED].visible = true;
    };
  },

  /**
   * A patrol checkpoint (순찰 체크포인트) on a corridor wall: the NFC reader on its steel plate with a
   * ring that lights blue (green with a beep when it's read), the yellow 순찰 지점 ③ sign over it and
   * where it is under it, the green 비상구 sign higher up, a fire extinguisher on its stand with the
   * 소화기 sign. Walked up to on a round (sgTag): the patrol wand touched to the reader, its screen
   * read, the torch shone down the corridor one way and the other.
   */
  sgCheckpoint(g, _W, D, _c, _def, _ctx, out) {
    const zb = -D / 2;
    part(g, rbox(0.14, 0.2, 0.015, 0.01), CHROME, 0, 1.3, zb + 0.008);
    part(g, cyl(0.045, 0.045, 0.014, 20), '#151515', 0, 1.315, zb + 0.02, { rx: Math.PI / 2 });
    const blue = glowing(g, ring(0.05, 0.004), '#40c4ff', 0, 1.315, zb + 0.028);
    const green = glowing(g, ring(0.052, 0.005), OK, 0, 1.315, zb + 0.03);
    green.visible = false;
    label(g, 'NFC 순찰', 0.1, 0.022, 0, 1.235, zb + 0.017, '#cfd8dc', '#37474f');
    const work = marker(g, 0, 1.315, zb + 0.03);
    part(g, rbox(0.27, 0.12, 0.01, 0.008), '#fdd835', 0, 1.5, zb + 0.006);
    label(g, '순찰 지점 ③', 0.24, 0.07, 0, 1.5, zb + 0.012, '#fdd835', '#212121');
    label(g, '3F 동측 비상계단', 0.2, 0.035, 0, 1.15, zb + 0.004, '#eceff1', '#455a64');
    // The 비상구 sign.
    part(g, rbox(0.38, 0.15, 0.05, 0.01), '#eceff1', 0, 2.15, zb + 0.03);
    picture(g, painted('sgExit', 256, 100, (c) => {
      c.fillStyle = '#00a651';
      c.fillRect(0, 0, 256, 100);
      c.fillStyle = '#ffffff';
      c.fillRect(14, 14, 44, 72);
      c.fillStyle = '#00a651';
      c.fillRect(22, 22, 28, 64);
      figure(c, 92, 84, 64, '#ffffff');
      text(c, '비상구', 186, 52, 34, '#ffffff', 'center');
    }), 0.35, 0.13, 0, 2.15, zb + 0.056);
    // The fire extinguisher on its stand, its sign.
    const fx = 0.32;
    part(g, rbox(0.2, 0.03, 0.16, 0.01), '#b71c1c', fx, 0.015, zb + 0.12);
    part(g, cyl(0.075, 0.075, 0.42, 18), '#d32f2f', fx, 0.25, zb + 0.12);
    part(g, ball(0.075), '#d32f2f', fx, 0.46, zb + 0.12).scale.set(1, 0.45, 1);
    part(g, cyl(0.02, 0.02, 0.05, 10), '#212121', fx, 0.5, zb + 0.12);
    part(g, rbox(0.1, 0.012, 0.025, 0.004), '#9e9e9e', fx + 0.03, 0.535, zb + 0.12, { rz: -0.2 });
    part(g, cyl(0.016, 0.016, 0.01, 12), '#fafafa', fx - 0.03, 0.51, zb + 0.16, { rx: Math.PI / 2, outline: false });
    rod(g, new THREE.Vector3(fx + 0.02, 0.5, zb + 0.15), new THREE.Vector3(fx + 0.07, 0.25, zb + 0.18), 0.008, '#212121');
    label(g, '소화기', 0.12, 0.05, fx, 0.27, zb + 0.196, '#d32f2f', '#ffffff');
    part(g, rbox(0.18, 0.08, 0.006, 0.004), '#d32f2f', fx, 0.9, zb + 0.004);
    label(g, '소화기', 0.15, 0.06, fx, 0.9, zb + 0.008, '#d32f2f', '#ffffff');
    // The round: the wand and the torch in the hands.
    const tag = standAt(g, -0.04, zb + 0.44, Math.PI, 'sgTag', work);
    out.work = work;
    out.spots = { '*': tag };
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const wand = group(use, 0, 0, 0);
    part(wand, cyl(0.016, 0.014, 0.17, 12), '#263238', 0, 0, 0.0, { rx: Math.PI / 2 });
    part(wand, cyl(0.012, 0.016, 0.03, 12), '#b0bec5', 0, 0, 0.1, { rx: Math.PI / 2 });
    const wandOk = glowing(wand, box(0.016, 0.004, 0.03), OK, 0, 0.016, 0.02);
    wand.rotation.order = 'YXZ';
    const torch = torchUnit(use);
    torch.root.rotation.order = 'YXZ';
    out.animate = (t) => {
      const ph = phaseOf(work);
      turnSpot(tag, 'sgTag', t, ph);
      const k = tagAt(frameOf(tag, work), t, ph);
      blue.visible = !k.beep;
      green.visible = wandOk.visible = k.beep;
      const yaw = tag.at.rotation.y;
      wand.position.copy(k.wand);
      wand.rotation.set(0.1, yaw, 0);
      torch.root.position.copy(k.torch);
      torch.root.rotation.set(k.shine ? 0.12 : 1.3, yaw, 0);
      torch.beam.visible = k.shine;
    };
    out.away = (_g, t) => {
      if (!posed(tag, t)) {
        blue.visible = true;
        green.visible = false;
      }
    };
  },

  /**
   * The lobby's visitor desk (방문객 안내 데스크): the guard behind it (its front), the visitors at its
   * back across the stone transaction ledge, under which its face reads 안내 INFORMATION and 한빛타워;
   * on the ledge the 방문객 명부 open to them, the tray of 방문증 on their lanyards, a call bell, the
   * acrylic 신분증 확인 sign; behind it the work top with the visitor system on its monitor, the
   * keyboard, the badge printer, the phone, the drawers. A 방문증 is issued (sgBadge): the visitor's ID
   * taken across the ledge, the visit typed in, the badge out of the printer and clipped to its
   * lanyard, both handed back over the ledge, the way to the gates pointed out.
   */
  sgVisitorDesk(g, _W, D, _c, _def, _ctx, out) {
    const zb = -D / 2;
    // The face the visitors see, the ledge, the ends.
    part(g, rbox(1.9, 1.1, 0.06, 0.012), '#f5f4ef', 0, 0.55, zb + 0.05);
    part(g, rbox(1.92, 0.1, 0.064, 0.01), '#6d4c41', 0, 0.96, zb + 0.05);
    part(g, rbox(1.92, 0.06, 0.064, 0.01), '#455a64', 0, 0.04, zb + 0.05);
    label(g, '안내  INFORMATION', 0.9, 0.11, 0, 0.66, zb + 0.018, '#f5f4ef', NAVY, Math.PI);
    label(g, BUILDING, 0.3, 0.06, 0, 0.52, zb + 0.018, '#f5f4ef', '#6d4c41', Math.PI);
    part(g, rbox(1.98, 0.04, 0.22, 0.01), '#cfc8bd', 0, 1.12, zb + 0.08);
    for (const sx of [-1, 1]) part(g, rbox(0.05, 1.1, 0.62, 0.01), '#e0ddd5', sx * 0.955, 0.55, zb + 0.31);
    // The work top behind, the drawers.
    const surf = 0.92;
    part(g, rbox(1.86, 0.035, 0.46, 0.01), '#e3e1da', 0, surf - 0.0175, zb + 0.42);
    part(g, rbox(0.38, surf - 0.04, 0.42, 0.01), '#cfcac0', 0.7, (surf - 0.04) / 2, zb + 0.4);
    for (let i = 0; i < 3; i++) part(g, rbox(0.06, 0.012, 0.012, 0.004), '#455a64', 0.7, 0.25 + i * 0.26, zb + 0.615, { outline: false });
    // The keyboard (the work point), the monitor with the visitor system, the badge printer, the phone.
    const KX = -0.1;
    const work = marker(g, KX, surf + 0.012, 0.0);
    part(g, rbox(0.36, 0.014, 0.12, 0.006), '#37474f', KX, surf + 0.007, 0.0);
    part(g, box(0.34, 0.004, 0.1), '#eceff1', KX, surf + 0.016, 0.0, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#37474f', KX + 0.25, surf + 0.01, 0.02);
    const mon = group(g, -0.56, surf, -0.2, 0.4);
    part(mon, rbox(0.16, 0.012, 0.12, 0.005), BLACK, 0, 0.006, 0);
    part(mon, rbox(0.035, 0.18, 0.025, 0.008), BLACK, 0, 0.1, -0.02);
    part(mon, rbox(0.46, 0.29, 0.03, 0.01), BLACK, 0, 0.31, 0);
    out.screen = litScreen(mon, painted('sgVisitor', 384, 256, paintVisitor), 0.43, 0.265, 0, 0.31, 0.017);
    const px = KX + DESK.printer[0];
    const pz = DESK.printer[2];
    part(g, rbox(0.17, 0.12, 0.2, 0.015), '#eceff1', px, surf + 0.06, pz - 0.07);
    part(g, box(0.1, 0.006, 0.012), '#212121', px, surf + 0.121, pz, { outline: false });
    glowing(g, box(0.012, 0.006, 0.003), OK, px + 0.06, surf + 0.1, pz + 0.031);
    label(g, '방문증 프린터', 0.12, 0.025, px, surf + 0.06, pz + 0.031, '#eceff1', '#455a64');
    part(g, rbox(0.18, 0.05, 0.2, 0.012), '#263238', -0.8, surf + 0.025, 0.02, { ry: 0.3 });
    part(g, rbox(0.05, 0.04, 0.2, 0.015), '#111111', -0.86, surf + 0.06, 0.02, { ry: 0.3 });
    // On the ledge: the 명부 open to the visitors, the badge tray, the bell, the sign.
    const ly = 1.14;
    const lz = zb + 0.08;
    flat(g, painted('sgVisitLog', 256, 362, logPage('방문객 명부', '성명 · 방문처 · 시간 · 방문증', [['성명', 56], ['방문처', 84], ['시간', 48], ['번호', 48]], [['이○○', '9F 새솔소프트', '14:05', '07'], ['박○○', '5F 한결세무', '13:40', '06'], ['정○○', '11F 다온디자인', '11:20', '03']])), 0.15, 0.2, -0.6, ly + 0.003, lz, Math.PI);
    pen(g, -0.47, ly, lz, 1.4);
    const tray = group(g, 0.55, ly, lz);
    part(tray, rbox(0.22, 0.05, 0.14, 0.01), '#90a4ae', 0, 0.025, 0);
    for (let i = 0; i < 4; i++) {
      const b = group(tray, -0.075 + i * 0.05, 0.05, 0.0, Math.PI);
      part(b, box(0.045, 0.065, 0.004), '#ffffff', 0, 0.025, 0, { outline: false });
      picture(b, painted('sgBadge', 128, 180, paintBadge), 0.043, 0.06, 0, 0.026, 0.003);
      part(b, box(0.012, 0.04, 0.003), '#e65100', 0, 0.075, -0.004, { outline: false });
    }
    label(g, '방문증', 0.1, 0.03, 0.55, ly + 0.03, lz - 0.071, '#90a4ae', '#ffffff', Math.PI);
    part(g, cyl(0.035, 0.04, 0.012, 16), '#424242', 0.15, ly + 0.006, lz - 0.02);
    part(g, ball(0.03), '#c9a227', 0.15, ly + 0.015, lz - 0.02).scale.set(1, 0.75, 1);
    const sign = group(g, 0.86, ly, lz + 0.01, Math.PI);
    glass(sign, box(0.16, 0.12, 0.004), 0, 0.07, 0);
    label(sign, '신분증 확인 후', 0.14, 0.03, 0, 0.09, 0.004, '#ffffff', '#263238');
    label(sign, '방문증 교부', 0.14, 0.03, 0, 0.055, 0.004, '#ffffff', '#e65100');
    // The guard's place; what's passed over the ledge.
    const st = standAt(g, KX, 0.3, Math.PI, 'sgBadge', work);
    out.work = work;
    out.spots = { '*': st };
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idCard = group(use, 0, 0, 0);
    part(idCard, box(0.085, 0.054, 0.003), '#bbdefb', 0, 0, 0, { outline: false });
    part(idCard, box(0.022, 0.028, 0.001), '#8d6e63', -0.025, 0.004, 0.002, { outline: false });
    for (let i = 0; i < 3; i++) part(idCard, box(0.04, 0.004, 0.001), '#546e7a', 0.015, 0.012 - i * 0.01, 0.002, { outline: false });
    const badge = group(use, 0, 0, 0);
    part(badge, box(0.06, 0.088, 0.003), '#ffffff', 0, 0, 0, { outline: false });
    picture(badge, painted('sgBadge', 128, 180, paintBadge), 0.058, 0.082, 0, 0, 0.002);
    part(badge, box(0.014, 0.06, 0.002), '#e65100', -0.02, 0.07, 0.0, { rz: 0.35, outline: false });
    part(badge, box(0.014, 0.06, 0.002), '#e65100', 0.02, 0.07, 0.0, { rz: -0.35, outline: false });
    out.animate = (t) => {
      const ph = phaseOf(work);
      turnSpot(st, 'sgBadge', t, ph);
      const b = badgeAt(frameOf(st, work), t, ph);
      const face = st.at.rotation.y + Math.PI;
      idCard.visible = b.id !== 'none';
      if (b.id === 'hand') {
        idCard.position.copy(b.l).add(new THREE.Vector3(0, -0.02, 0));
        idCard.rotation.set(-0.6, face, 0);
      } else if (b.id === 'desk') {
        idCard.position.set(work.position.x + DESK.id[0], work.position.y + DESK.id[1] - 0.008, work.position.z + DESK.id[2]);
        idCard.rotation.set(-Math.PI / 2, 0, 0.2);
      } else if (b.id === 'out') {
        idCard.position.copy(b.l).add(new THREE.Vector3(0, -0.015, 0));
        idCard.rotation.set(-1.0, face, 0);
      }
      badge.visible = b.badge !== 'none';
      if (b.badge === 'printer') {
        badge.position.set(px, surf + 0.12 + (b.printing ? 0.02 : 0.04), pz);
        badge.rotation.set(0, 0, 0);
      } else if (b.badge === 'hand') {
        badge.position.copy(b.mid).add(new THREE.Vector3(0, 0.0, 0));
        badge.rotation.set(-0.3, face, 0);
      }
    };
  },

  /**
   * The speed gate (스피드게이트) at the lobby's inner line: three brushed steel pedestals with black
   * glass tops making two lanes, glass flaps meeting across each lane, light strips along the lanes'
   * edges, a card reader at each lane's entry with its light, the arrow or the cross at each end.
   * Checked (sgGate): a card tapped on the first lane's reader (its light green), the flaps fold back,
   * a visitor waved through, the hands folded while they close.
   */
  sgSpeedGate(g, _W, _D, _c, _def, _ctx, out) {
    const peds: Array<[number, number]> = [[-0.85, 0.16], [0, 0.22], [0.85, 0.16]];
    const okLights: THREE.Mesh[] = [];
    const noLights: THREE.Mesh[] = [];
    for (const [x, w] of peds) {
      part(g, rbox(w, 0.95, 0.9, 0.02), '#cfd8dc', x, 0.475, 0);
      part(g, rbox(w + 0.01, 0.03, 0.92, 0.01), '#1c2329', x, 0.965, 0);
      part(g, box(w - 0.04, 0.6, 0.004), '#b0bec5', x, 0.45, 0.452, { outline: false });
      for (const sz of [-1, 1]) {
        part(g, box(w - 0.06, 0.08, 0.006), '#111111', x, 0.82, sz * 0.453, { outline: false });
        const ok = glowing(g, box(0.03, 0.04, 0.004), OK, x, 0.82, sz * 0.457);
        const no = glowing(g, box(0.03, 0.012, 0.004), ALARM, x, 0.82, sz * 0.457);
        ok.visible = false;
        okLights.push(ok);
        noLights.push(no);
      }
      for (const sx of [-1, 1]) glowing(g, box(0.004, 0.012, 0.8), '#40c4ff', x + (sx * w) / 2 + sx * 0.002, 0.93, 0);
    }
    // The flaps: two a lane, hinged at the pedestals, meeting in the middle.
    const flaps: Array<{ hinge: THREE.Group; side: number }> = [];
    const lanes: Array<[number, number]> = [[-0.77, -0.11], [0.11, 0.77]];
    for (const [a, b] of lanes)
      for (const [x, side] of [[a, 1], [b, -1]] as const) {
        const hinge = group(g, x, 0.64, 0);
        glass(hinge, box(0.31, 0.5, 0.012), side * 0.155, 0, 0);
        part(hinge, box(0.31, 0.02, 0.016), '#90a4ae', side * 0.155, 0.25, 0, { outline: false });
        flaps.push({ hinge, side });
      }
    // The readers at the lanes' entries.
    const readers: Array<[number, number]> = [[-0.06, 0.32], [0.8, 0.32]];
    const readerOk: THREE.Mesh[] = [];
    for (const [x, z] of readers) {
      part(g, rbox(0.085, 0.01, 0.085, 0.006), '#111111', x, 0.985, z);
      part(g, box(0.035, 0.002, 0.025), '#eceff1', x, 0.991, z + 0.005, { outline: false });
      readerOk.push(lamp(g, box(0.05, 0.003, 0.008), '#37474f', OK, x, 0.991, z - 0.03));
    }
    label(g, '출입증을 대 주세요', 0.18, 0.035, 0, 0.7, 0.456, '#cfd8dc', '#263238');
    const work = marker(g, readers[0][0], 0.99, readers[0][1]);
    const st = standAt(g, -0.44, 0.75, Math.PI, 'sgGate', work);
    out.work = work;
    out.spots = { '*': st };
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const card = group(use, 0, 0, 0);
    part(card, box(0.085, 0.054, 0.003), '#ffffff', 0, 0, 0, { outline: false });
    part(card, box(0.085, 0.014, 0.0035), '#e65100', 0, 0.018, 0, { outline: false });
    const set = (open: number, ok: boolean) => {
      flaps.forEach((f, i) => (f.hinge.rotation.y = i < 2 ? f.side * (Math.PI / 2) * open : 0));
      readerOk[0].visible = ok;
      okLights[0].visible = okLights[1].visible = okLights[2].visible = okLights[3].visible = ok;
      noLights[0].visible = noLights[1].visible = noLights[2].visible = noLights[3].visible = !ok;
    };
    out.animate = (t) => {
      const ph = phaseOf(work);
      turnSpot(st, 'sgGate', t, ph);
      const k = gateAt(frameOf(st, work), t, ph);
      set(k.open, k.ok);
      card.position.copy(k.card);
      card.rotation.set(-1.2, st.at.rotation.y + Math.PI, 0);
    };
    out.away = (_g, t) => {
      if (!posed(st, t)) set(0, false);
    };
  },

  /**
   * The lost-and-found shelf (분실물 보관함): grey steel shelving under its LOST & FOUND sign, the
   * labelled bins (전자기기 · 지갑·카드 · 의류 · 기타) with what's been handed in peeking out, a
   * backpack and a shopping bag tagged on the middle shelf, a bucket of umbrellas and a helmet on the
   * bottom, a teddy bear on top, every one with its paper tag; the fold-down ledge in front with the
   * 분실물 접수대장. An item's logged in (written stood at the ledge), the wallet that came in lying by
   * the 대장 with its tag.
   */
  sgLostFound(g, _W, D, _c, _def, _ctx, out) {
    const zb = -D / 2;
    const z0 = zb + 0.02;
    const z1 = zb + 0.42;
    const zm = (z0 + z1) / 2;
    for (const x of [-0.42, 0.42]) for (const z of [z0, z1]) part(g, rbox(0.03, 1.78, 0.03, 0.006), GUNMETAL, x, 0.89, z);
    const shelves = [0.06, 0.45, 0.86, 1.27, 1.68];
    for (const y of shelves) part(g, rbox(0.86, 0.025, 0.42, 0.006), STEEL, 0, y, zm);
    part(g, rbox(0.7, 0.1, 0.02, 0.008), NAVY, 0, 1.86, z1 - 0.01);
    label(g, '분실물 보관함 · LOST & FOUND', 0.64, 0.06, 0, 1.86, z1 + 0.002, NAVY, '#ffffff');
    /** A paper tag on a string. */
    const tag = (x: number, y: number, z: number) => {
      part(g, box(0.035, 0.05, 0.002), '#fffde7', x, y, z, { rz: 0.2, outline: false });
      part(g, box(0.002, 0.04, 0.002), '#9e9e9e', x - 0.01, y + 0.04, z, { outline: false });
    };
    // The bins with their labels and what's in them.
    const bins: Array<[number, number, string, string]> = [[-0.2, 1.27, '전자기기', '#90caf9'], [0.2, 1.27, '지갑·카드', '#ffcc80'], [-0.2, 0.86, '의류', '#a5d6a7'], [0.2, 0.86, '기타', '#ce93d8']];
    for (const [x, y, s, col] of bins) {
      part(g, rbox(0.37, 0.2, 0.36, 0.02), col, x, y + 0.112, zm);
      part(g, box(0.33, 0.17, 0.33), shade(col, 0.7), x, y + 0.13, zm, { outline: false });
      label(g, s, 0.2, 0.045, x, y + 0.13, zm + 0.181, '#ffffff', '#37474f');
    }
    part(g, rbox(0.08, 0.012, 0.15, 0.006), '#111111', -0.24, 1.49, zm - 0.04, { rx: -0.5 });
    part(g, rbox(0.12, 0.03, 0.08, 0.01), '#6d4c41', 0.2, 1.49, zm - 0.05, { rx: -0.3 });
    part(g, rbox(0.16, 0.04, 0.12, 0.02), '#c62828', -0.18, 1.07, zm - 0.04);
    // The middle shelf: a backpack, a shopping bag; the bottom: umbrellas, a helmet; a bear on top.
    const pack = group(g, -0.2, 0.465, zm);
    part(pack, rbox(0.28, 0.32, 0.18, 0.08), '#283593', 0, 0.16, 0);
    part(pack, rbox(0.2, 0.12, 0.05, 0.03), '#1a237e', 0, 0.1, 0.1);
    for (const sx of [-1, 1]) part(pack, box(0.03, 0.26, 0.01), '#1a237e', sx * 0.08, 0.16, -0.095, { outline: false });
    tag(-0.05, 0.68, zm + 0.1);
    const bag = group(g, 0.2, 0.465, zm);
    part(bag, box(0.24, 0.3, 0.12), '#d7ccc8', 0, 0.15, 0);
    for (const sx of [-1, 1]) rod(bag, new THREE.Vector3(sx * 0.06, 0.3, 0.04), new THREE.Vector3(sx * 0.02, 0.36, 0.04), 0.006, '#8d6e63');
    label(bag, 'SHOP', 0.1, 0.04, 0, 0.18, 0.061, '#d7ccc8', '#5d4037');
    tag(0.33, 0.62, zm + 0.07);
    part(g, cyl(0.1, 0.09, 0.3, 16), '#78909c', -0.22, 0.225, zm);
    (['#1a1a1a', '#1565c0', '#ad1457'] as const).forEach((col, i) => {
      const u = group(g, -0.22 + (i - 1) * 0.04, 0.075, zm + (i % 2) * 0.03 - 0.015);
      u.rotation.z = (i - 1) * 0.12;
      part(u, cyl(0.004, 0.004, 0.75, 6), '#9e9e9e', 0, 0.4, 0, { outline: false });
      part(u, cyl(0.03, 0.006, 0.5, 10), col, 0, 0.45, 0);
      part(u, ring(0.02, 0.006, Math.PI), '#4e342e', 0.02, 0.8, 0, { rx: Math.PI / 2 });
    });
    tag(-0.14, 0.5, zm + 0.1);
    const helmet = group(g, 0.2, 0.075, zm);
    part(helmet, ball(0.12), '#fbc02d', 0, 0.02, 0).scale.set(1, 0.85, 1.1);
    part(helmet, box(0.26, 0.03, 0.3), '#fbc02d', 0, -0.0, 0.0, { outline: false });
    const bear = group(g, 0.15, 1.695, zm);
    part(bear, ball(0.08), '#a1887f', 0, 0.08, 0);
    part(bear, ball(0.06), '#a1887f', 0, 0.2, 0.01);
    for (const sx of [-1, 1]) {
      part(bear, ball(0.025), '#8d6e63', sx * 0.045, 0.255, 0.0);
      part(bear, ball(0.03), '#a1887f', sx * 0.07, 0.03, 0.05);
    }
    part(bear, ball(0.02), '#d7ccc8', 0, 0.19, 0.06);
    tag(0.25, 1.78, zm + 0.05);
    part(g, rbox(0.3, 0.18, 0.28, 0.01), '#bcaaa4', -0.2, 1.785, zm);
    // The ledge with the 대장 open, a pen.
    const ly = 1.0;
    part(g, rbox(0.62, 0.03, 0.22, 0.008), '#b0bec5', 0, ly - 0.015, z1 + 0.09);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.28, ly - 0.03, z1 + 0.18), new THREE.Vector3(sx * 0.28, ly - 0.2, z1), 0.008, GUNMETAL);
    const work = marker(g, -0.04, ly + 0.012, z1 + 0.09);
    part(g, rbox(0.33, 0.012, 0.2, 0.004), '#4e342e', -0.04, ly + 0.006, z1 + 0.09);
    flat(g, painted('sgLostLog', 256, 362, paintLostLog), 0.145, 0.195, 0.035, ly + 0.013, z1 + 0.09);
    flat(g, painted('sgLostLog', 256, 362, paintLostLog), 0.145, 0.195, -0.115, ly + 0.013, z1 + 0.09);
    pen(g, 0.16, ly + 0.01, z1 + 0.12, 0.6);
    // In use: the wallet just handed in, its tag.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, rbox(0.1, 0.02, 0.075, 0.01), '#5d4037', 0.22, ly + 0.01, z1 + 0.07, { ry: 0.3 });
    part(use, box(0.04, 0.002, 0.055), '#fffde7', 0.25, ly + 0.022, z1 + 0.12, { ry: -0.2, outline: false });
    const st = standAt(g, -0.04, z1 + 0.42, Math.PI, 'write', work);
    out.work = work;
    out.spots = { '*': st };
  },
};

/**
 * The car park's entrance (sgParkingGate, 2 × 1; 2026-11-05, the layout audit): the guards' booth on its left tile, glazed all round,
 * the barrier's yellow-and-black boom reaching across the ramp to its right, the '주차장 입구' sign over it and the ticket post.
 */
function parkingGate(g: THREE.Group) {
  const bx = -0.5;
  part(g, rbox(0.9, 0.08, 0.9, 0.02), '#9e9e9e', bx, 0.04, 0);
  part(g, rbox(0.86, 1.0, 0.86, 0.03), CREAM, bx, 0.58, 0);
  part(g, box(0.88, 0.95, 0.88), '#b3e5fc', bx, 1.55, 0, { outline: false, material: GLASS_BOOTH });
  part(g, rbox(1.02, 0.1, 1.02, 0.03), NAVY, bx, 2.07, 0);
  label(g, '경비실', 0.4, 0.12, bx, 1.92, 0.45, NAVY, '#ffffff');
  // The boom's housing and the boom, out over the drive.
  part(g, rbox(0.3, 0.95, 0.3, 0.04), SAFETY, 0.25, 0.48, 0);
  const L = 3.0;
  for (let i = 0; i < 6; i++) part(g, box(L / 6, 0.07, 0.07), i % 2 ? '#212121' : SAFETY, 0.4 + (i + 0.5) * (L / 6), 0.86, 0, { outline: false });
  part(g, cyl(0.03, 0.03, 0.8, 8), STEEL, 0.4 + L, 0.4, 0, { outline: false });
  // The sign over the ramp's mouth; the ticket post.
  label(g, '주차장 입구 · 높이 2.3m', 1.3, 0.2, 1.9, 2.3, 0, NAVY, '#ffffff');
  for (const x of [0.4, 3.4]) part(g, cyl(0.03, 0.03, 2.3, 8), STEEL, x, 1.15, 0, { outline: false });
  part(g, rbox(0.22, 1.1, 0.22, 0.03), GUNMETAL, 0.75, 0.55, 0.35);
}
const GLASS_BOOTH = new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.4, depthWrite: false });
