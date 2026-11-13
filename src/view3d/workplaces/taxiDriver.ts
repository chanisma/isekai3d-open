import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glow, label, painted, picture, ring, seeded, text } from './doctor';
import { fenceRun } from './busDriver';

/**
 * The 택시 차고지 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a 법인택시
 * depot of the made-up 한빛운수. The cabs are Seoul's 꽃담황토 orange sedans with the 택시 표시등 on
 * the roof, the red 빈차 lamp in the windscreen, the yellow 영업용 plates, and inside the meter, the
 * 카드 단말기, the nav and the call app on a phone on the dash. Out on a fare (pickUpFares, airportCall)
 * a cab pulls out of its bay, swings down its lane to the street and is gone, the driver at the wheel
 * and a passenger in the back (빈차 off, the meter running; a 예약 call with a suitcase every other
 * time); it backs in again showing 회송. In the yard the call terminal (콜 단말기) with the map and a
 * 새 콜 to 수락, and what the depot was missing (workFurniture/taxiDriver.ts): the 배차실 창구 (the
 * 음주측정기, the keys on the tray, the 입금 장부), the yard's LPG 충전기, the 휴게실's 커피 자판기,
 * the 운행일지 desk and the 유실물 보관함.
 */

const ORANGE = '#e8873a';
const ORANGE_D = '#c96e26';
const ASPHALT = '#4b5056';
const PAINT = '#f4f4ef';
const PLATE = '#f7d038';
const COMPANY = '한빛운수';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();

/** A car's glass: the seats and whoever's in them show through. */
const GLASS = new THREE.MeshToonMaterial({ color: '#a9cfe0', transparent: true, opacity: 0.3, depthWrite: false });
/** A booth's window. */
const PANE = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.25, depthWrite: false });
const STEAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false });

/** Shapes made once. */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** Several pictures in one place, one shown at a time (a meter's modes, a pump's count). */
function swap(g: THREE.Object3D, texes: THREE.Texture[], w: number, h: number, x: number, y: number, z: number, ry = 0): (i: number) => void {
  const ms = texes.map((t, i) => {
    const m = picture(g, t, w, h, x, y, z, '#ffffff', ry);
    m.visible = i === 0;
    return m;
  });
  let cur = 0;
  return (i) => {
    if (i === cur) return;
    ms[cur].visible = false;
    ms[i].visible = true;
    cur = i;
  };
}
/** A spot stood at, facing `yaw`, and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot sat at (the seat's top `y`, the floor `drop` below), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, drop = y): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, drop);
  s.work = work;
  s.motion = motion;
  return s;
}
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;

// ---------------------------------------------------------------------------------------------
// People drawn in: the driver at the wheel, passengers, the dispatcher, a senior and a rookie.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'pony' | 'bob' | 'perm' | 'bald';
  skin?: string;
  shoes?: string;
  glasses?: boolean;
  vest?: string;
  vestText?: string;
  /** A backpack on (a tourist). */
  pack?: string;
  /** A tie (an office worker). */
  tie?: string;
}
const SKIN = '#f1c9a5';
const LOOKS = {
  driver: { top: '#f5f5f5', bottom: '#263238', hair: '#2b2b2b', hairdo: 'short', shoes: '#212121', tie: '#e8873a' } as Look,
  senior: { top: '#cfd8dc', bottom: '#37474f', hair: '#9e9e9e', hairdo: 'short', glasses: true, shoes: '#212121' } as Look,
  rookie: { top: '#fafafa', bottom: '#263238', hair: '#1a1a1a', hairdo: 'short', vest: '#f9a825', vestText: '신입', shoes: '#212121' } as Look,
  dispatcher: { top: '#90a4ae', bottom: '#37474f', hair: '#4e342e', hairdo: 'bob', glasses: true } as Look,
  office: { top: '#37474f', bottom: '#263238', hair: '#1a1a1a', hairdo: 'short', tie: '#c62828', shoes: '#111111' } as Look,
  grandma: { top: '#ad1457', bottom: '#5d4037', hair: '#bdbdbd', hairdo: 'perm', shoes: '#4e342e' } as Look,
  tourist: { top: '#4fc3f7', bottom: '#d7ccc8', hair: '#f2cf7a', hairdo: 'pony', skin: '#f6d7c3', pack: '#e65100', shoes: '#fafafa' } as Look,
};

interface Figure {
  root: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/**
 * Someone drawn in, their feet (or the seat under them) at (x, z) in `parent`, turned `ry` (0 faces
 * +z): stood, or sat on a seat whose top is `seat` high. The hands rest until put somewhere (in the
 * parent's frame).
 */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat?: number): Figure {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#2b2b30';
  const sat = seat !== undefined;
  const sh = seat ?? 0;
  const shoulderY = sat ? sh + 0.53 : 1.31;
  const torsoY = sat ? sh + 0.33 : 1.11;
  if (sat) {
    for (const sx of [-1, 1]) {
      const hip = v3(sx * 0.09, sh + 0.07, -0.03);
      const knee = v3(sx * 0.1, sh + 0.1, 0.36);
      const ankle = v3(sx * 0.1, Math.max(0.1, sh - 0.3), 0.5);
      rod(root, hip, knee, 0.062, look.bottom);
      rod(root, knee, ankle, 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    }
    part(root, rbox(0.31, 0.15, 0.26, 0.06), look.bottom, 0, sh + 0.08, 0);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  }
  const tz = sat ? -0.02 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, torsoY, tz);
  if (look.tie) part(root, box(0.045, 0.3, 0.01), look.tie, 0, torsoY + 0.04, tz + 0.107, { outline: false });
  if (look.vest) {
    part(root, rbox(0.36, 0.4, 0.23, 0.08), look.vest, 0, torsoY - 0.02, tz);
    part(root, box(0.08, 0.16, 0.235), look.top, 0, torsoY + 0.14, tz, { outline: false });
    if (look.vestText) label(root, look.vestText, 0.2, 0.06, 0, torsoY - 0.06, tz + 0.117, look.vest, '#ffffff');
  }
  if (look.pack) {
    part(root, rbox(0.3, 0.38, 0.16, 0.06), look.pack, 0, torsoY + 0.02, tz - 0.18);
    for (const sx of [-1, 1]) part(root, box(0.04, 0.4, 0.012), shade(look.pack, 0.7), sx * 0.11, torsoY + 0.04, tz + 0.108, { outline: false });
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'pony':
      part(head, ball(0.12), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.06, 0.06, 0.02), look.hair, 0, 0.075, 0.07, { rx: -0.3 });
      part(head, rbox(0.06, 0.2, 0.06, 0.03), look.hair, 0, -0.06, -0.14, { rx: 0.3 });
      break;
    case 'bob':
      part(head, ball(0.122), look.hair, 0, 0.025, -0.03);
      for (const sx of [-1, 1]) part(head, rbox(0.05, 0.16, 0.14, 0.025), look.hair, sx * 0.1, -0.03, -0.02);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    case 'perm':
      // A 뽀글이 perm: tight curls all over the top.
      part(head, ball(0.118), look.hair, 0, 0.035, -0.03);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        part(head, ball(0.045), look.hair, Math.cos(a) * 0.09, 0.07 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.08, { outline: false });
      }
      break;
    case 'bald':
      part(head, ball(0.114), skin, 0, 0.01, -0.01);
      for (const sx of [-1, 1]) part(head, ball(0.04), look.hair, sx * 0.1, -0.01, -0.04, { outline: false });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#37474f', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.112, { outline: false });
  }
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = sat ? v3(sx * 0.11, sh + 0.16, 0.24) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.vest ?? look.top);
    const lower = limb(root, 0.035, look.top);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(rest);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.05, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const a = 0.27;
      const b = 0.25;
      const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
      bend.set(sx * 0.6, -1, -0.25).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  return { root, armL, armR };
}

/** A carry-on suitcase stood on its wheels, the handle up. */
function suitcase(g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#5c6bc0'): THREE.Group {
  const s = group(g, x, y, z, ry);
  part(s, rbox(0.36, 0.5, 0.22, 0.05), color, 0, 0.3, 0);
  for (const k of [-0.08, 0.08]) part(s, box(0.006, 0.44, 0.226), shade(color, 0.8), k, 0.3, 0, { outline: false });
  for (const sx of [-1, 1]) {
    rod(s, v3(sx * 0.08, 0.55, -0.08), v3(sx * 0.08, 0.82, -0.08), 0.01, '#9e9e9e');
    part(s, cyl(0.025, 0.025, 0.02, 10), BLACK, sx * 0.14, 0.03, -0.08, { rz: Math.PI / 2, outline: false });
  }
  part(s, rbox(0.2, 0.03, 0.03, 0.01), BLACK, 0, 0.83, -0.08);
  part(s, box(0.1, 0.06, 0.004), '#ffffff', 0.08, 0.36, 0.112, { outline: false });
  return s;
}

// ---------------------------------------------------------------------------------------------
// Pictures.

const meterTex = (word: string, wordCol: string, fare: string, extra = '') =>
  painted(`txMeter|${word}|${fare}|${extra}`, 192, 72, (c) => {
    c.fillStyle = '#0d0d0d';
    c.fillRect(0, 0, 192, 72);
    c.fillStyle = '#1e1e1e';
    c.fillRect(6, 30, 180, 36);
    text(c, word, 10, 15, 16, wordCol);
    if (extra) text(c, extra, 182, 15, 13, '#ffb300', 'right');
    c.font = `bold 34px "Consolas","Courier New",monospace`;
    c.fillStyle = '#ff3b2f';
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.fillText(fare, 182, 50);
  });
const METER = {
  free: () => meterTex('빈차', '#4caf50', '4,800', '기본요금'),
  run: () => meterTex('주행', '#ffb300', '13,700', '심야할증 X'),
  check1: () => meterTex('점검', '#29b6f6', '8.8.8.8.8'),
  check2: () => meterTex('점검', '#29b6f6', '4,800', '거리 131m'),
  back: () => meterTex('회송', '#90a4ae', '0'),
};
/** The windscreen lamp: 빈차 (red), 예약 (green), 회송 (amber), or dark. */
const lampTex = (word: string, bg: string, fg: string) =>
  painted(`txLamp|${word}|${bg}`, 128, 56, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 128, 56);
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 3;
    c.strokeRect(3, 3, 122, 50);
    text(c, word, 64, 30, 34, fg, 'center');
  });
const LAMP = {
  free: () => lampTex('빈차', '#d50000', '#fff3f3'),
  booked: () => lampTex('예약', '#00a152', '#f1fff6'),
  back: () => lampTex('회송', '#ff8f00', '#fff8e1'),
  off: () => lampTex('빈차', '#2a1a1a', '#4a2b2b'),
};
/** The roof's 택시 표시등, lit or dark. */
const roofTex = (word: string, lit: boolean) =>
  painted(`txRoof|${word}|${lit}`, 160, 64, (c) => {
    const grd = c.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, lit ? '#fffdf0' : '#d9d6cc');
    grd.addColorStop(1, lit ? '#ffe9a8' : '#b9b5aa');
    c.fillStyle = grd;
    c.fillRect(0, 0, 160, 64);
    text(c, word, 80, 34, word === 'TAXI' ? 42 : 36, lit ? '#e65100' : '#8d7f6a', 'center');
  });
const plateTex = (s: string) =>
  painted(`txPlate|${s}`, 160, 40, (c) => {
    c.fillStyle = PLATE;
    c.fillRect(0, 0, 160, 40);
    c.strokeStyle = '#333';
    c.lineWidth = 3;
    c.strokeRect(2, 2, 156, 36);
    text(c, s, 80, 21, 24, '#111111', 'center');
  });
/** The call app on the phone on the dash: a 새 콜 to 수락. */
const appTex = painted('txApp', 72, 128, (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 72, 128);
  c.fillStyle = '#ffca28';
  c.fillRect(0, 0, 72, 20);
  text(c, '택시 호출', 36, 11, 10, '#212121', 'center');
  c.fillStyle = '#eceff1';
  c.fillRect(4, 24, 64, 52);
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(8, 70);
  c.lineTo(30, 46);
  c.lineTo(60, 34);
  c.stroke();
  c.fillStyle = '#e53935';
  c.beginPath();
  c.arc(60, 34, 4, 0, Math.PI * 2);
  c.fill();
  text(c, '새 콜 도착!', 36, 86, 11, '#d84315', 'center');
  text(c, '역삼역 4번 출구', 36, 100, 8, '#37474f', 'center', false);
  c.fillStyle = '#00c853';
  c.fillRect(8, 108, 56, 16);
  text(c, '수락', 36, 117, 11, '#ffffff', 'center');
});
/** The nav on the dash: the streets, the route in blue, the next turn. */
const navTex = painted('txNav', 192, 112, (c) => {
  c.fillStyle = '#e8eaed';
  c.fillRect(0, 0, 192, 112);
  c.fillStyle = '#cfd8dc';
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) c.fillRect(6 + i * 32, 6 + j * 28, 24, 20);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 6;
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.moveTo(i * 32 + 2, 0);
    c.lineTo(i * 32 + 2, 112);
    c.stroke();
  }
  c.strokeStyle = '#ffd54f';
  c.lineWidth = 8;
  c.beginPath();
  c.moveTo(0, 58);
  c.lineTo(192, 58);
  c.stroke();
  c.strokeStyle = '#1e88e5';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(66, 112);
  c.lineTo(66, 58);
  c.lineTo(162, 58);
  c.lineTo(162, 0);
  c.stroke();
  c.fillStyle = '#d84315';
  c.beginPath();
  c.moveTo(66, 84);
  c.lineTo(58, 100);
  c.lineTo(74, 100);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(33,33,33,0.85)';
  c.fillRect(0, 0, 96, 22);
  text(c, '↱ 380m 테헤란로', 6, 12, 12, '#ffffff');
});
/** The yard terminal: the city map with the waiting calls and a 새 콜 card to 수락. */
const kioskTex = painted('txKiosk', 384, 256, (c) => {
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#37474f';
  for (let i = 0; i < 10; i++) for (let j = 0; j < 7; j++) c.fillRect(4 + i * 30, 30 + j * 32, 22, 24);
  c.strokeStyle = '#ffd54f';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(0, 150);
  c.bezierCurveTo(80, 130, 180, 170, 300, 120);
  c.stroke();
  c.strokeStyle = '#4fc3f7';
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(0, 210);
  c.bezierCurveTo(100, 220, 200, 190, 300, 230);
  c.stroke();
  text(c, '한강', 60, 222, 12, '#b3e5fc');
  const rng = seeded(41);
  for (let k = 0; k < 9; k++) {
    const x = 20 + rng() * 260;
    const y = 40 + rng() * 170;
    c.fillStyle = k < 3 ? '#ff7043' : '#66bb6a';
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#1b2327';
  c.fillRect(0, 0, 384, 24);
  text(c, `${COMPANY} 배차 콜`, 8, 13, 15, '#ffca28');
  text(c, '대기 콜 3 · 운행 18대', 300, 13, 12, '#cfd8dc', 'right');
  c.fillStyle = '#ff5252';
  c.beginPath();
  c.arc(372, 12, 5, 0, Math.PI * 2);
  c.fill();
  // The 새 콜 card.
  c.fillStyle = '#fafafa';
  c.fillRect(300, 32, 80, 216);
  c.fillStyle = '#ff7043';
  c.fillRect(300, 32, 80, 22);
  text(c, '새 콜', 340, 44, 14, '#ffffff', 'center');
  text(c, '출발', 306, 68, 10, '#78909c');
  text(c, '역삼역 4번', 306, 84, 12, '#212121');
  text(c, '도착', 306, 106, 10, '#78909c');
  text(c, '인천공항 T2', 306, 122, 12, '#212121');
  text(c, '예상 요금', 306, 146, 10, '#78909c');
  text(c, '52,000원', 306, 162, 13, '#d84315');
  text(c, '1.2km · 4분', 306, 182, 10, '#455a64', 'left', false);
  c.fillStyle = '#00c853';
  c.fillRect(306, 204, 68, 34);
  text(c, '수락', 340, 222, 17, '#ffffff', 'center');
});
/** The 배차표 on the terminal's clipboard. */
const rosterTex = painted('txRoster', 96, 128, (c) => {
  c.fillStyle = '#fbfbf6';
  c.fillRect(0, 0, 96, 128);
  text(c, '배차표 10/27', 48, 10, 11, '#263238', 'center');
  c.strokeStyle = '#b0bec5';
  c.lineWidth = 1;
  const rows = [['1027', '김모범', '주'], ['1031', '오야간', '야'], ['1044', '이성실', '주'], ['1052', '박안전', '주'], ['1068', '최친절', '야'], ['1071', '한빛나', '주']];
  rows.forEach((r, i) => {
    const y = 26 + i * 16;
    c.beginPath();
    c.moveTo(4, y + 8);
    c.lineTo(92, y + 8);
    c.stroke();
    text(c, r[0], 6, y, 10, '#37474f', 'left', false);
    text(c, r[1], 38, y, 10, '#37474f', 'left', false);
    text(c, r[2], 86, y, 10, r[2] === '야' ? '#5e35b1' : '#ef6c00', 'center');
  });
});

// ---------------------------------------------------------------------------------------------
// The cab.

interface Cab {
  seatY: number;
  dz: number;
  pz: number;
  sx: number;
  rx: number;
  wheel: THREE.Group;
  hubAt: THREE.Object3D;
  rimL: THREE.Object3D;
  rimR: THREE.Object3D;
  fx: number;
  bx: number;
  side: (s: number) => number;
  roofY: number;
  wsTop: number;
  wsFoot: number;
  bPillar: number;
  heads: THREE.Group;
  brake: THREE.Group;
  reverse: THREE.Group;
  blink: THREE.Group;
  /** The rear door on the passenger's side (+z), hung at its front edge. */
  rearDoor: THREE.Group;
  /** Each wheel, spun about its axle. */
  wheels: THREE.Group[];
}
/**
 * A mid-size sedan facing +x, its middle across at `zc` (the driver's side, the left, is -z): the
 * body and sills, bumpers, a glasshouse you can see in through, roof and pillars, mirrors, wheels with
 * their covers under the arches, the lamps, and the cabin (front seats, the back seat, the dash and
 * the wheel). The passenger-side rear door is its own panel, to open.
 */
function cabShell(car: THREE.Object3D, zc: number, L: number, Wd: number, body: string): Cab {
  const fx = L / 2;
  const bx = -L / 2;
  const side = (s: number) => zc + s * (Wd / 2);
  part(car, rbox(L, 0.48, Wd, 0.16), body, 0, 0.57, zc);
  part(car, rbox(L * 0.97, 0.1, Wd - 0.02, 0.05), '#3a3d42', 0, 0.33, zc);
  part(car, rbox(0.14, 0.2, Wd - 0.04, 0.06), shade(body, 0.92), fx - 0.03, 0.43, zc);
  part(car, rbox(0.14, 0.2, Wd - 0.04, 0.06), shade(body, 0.92), bx + 0.03, 0.43, zc);
  // The grille.
  part(car, rbox(0.03, 0.12, Wd - 0.7, 0.02), '#2b2e33', fx + 0.035, 0.6, zc);
  for (let k = -3; k <= 3; k++) part(car, box(0.01, 0.1, 0.012), CHROME, fx + 0.05, 0.6, zc + k * 0.1, { outline: false });
  const wsFoot = fx - 1.05;
  const wsTop = wsFoot - 0.6;
  const tailFoot = bx + 0.45;
  const tailTop = bx + 0.95;
  const gh = 0.48;
  const geom = shape(`txCabin|${L}|${Wd}`, () => {
    const p = new THREE.Shape();
    p.moveTo(tailFoot, 0);
    p.lineTo(wsFoot, 0);
    p.lineTo(wsTop, gh);
    p.lineTo(tailTop, gh);
    p.closePath();
    const g = new THREE.ExtrudeGeometry(p, { depth: Wd - 0.14, bevelEnabled: false });
    g.translate(0, 0, -(Wd - 0.14) / 2);
    return g;
  });
  part(car, geom, '#a9cfe0', 0, 0.81, zc, { material: GLASS, outline: false, shadow: false });
  const roofY = 0.81 + gh + 0.025;
  part(car, rbox(wsTop - tailTop + 0.08, 0.05, Wd - 0.1, 0.025), body, (wsTop + tailTop) / 2, roofY, zc);
  part(car, rbox(tailFoot - bx, 0.05, Wd - 0.08, 0.03), body, (tailFoot + bx) / 2 + 0.04, 0.82, zc);
  part(car, rbox(fx - wsFoot, 0.05, Wd - 0.08, 0.03), body, (fx + wsFoot) / 2 - 0.03, 0.82, zc);
  const bPillar = (wsTop + tailTop) / 2 + 0.05;
  for (const s of [-1, 1]) {
    const zz = zc + s * (Wd / 2 - 0.07);
    rod(car, v3(wsFoot, 0.81, zz), v3(wsTop, 0.81 + gh, zz), 0.03, body);
    rod(car, v3(tailFoot, 0.81, zz), v3(tailTop, 0.81 + gh, zz), 0.04, body);
    rod(car, v3(bPillar, 0.81, zz), v3(bPillar, 0.81 + gh, zz), 0.035, BLACK);
    const zs = side(s) + s * 0.002;
    const lines = s > 0 ? [wsFoot + 0.05, bPillar + 0.004] : [wsFoot + 0.05, bPillar, bPillar - 0.85];
    for (const x of lines) part(car, box(0.008, 0.44, 0.006), shade(body, 0.7), x, 0.58, zs, { outline: false });
    part(car, rbox(0.13, 0.025, 0.02, 0.008), CHROME, bPillar + 0.14, 0.72, zs + s * 0.008, { outline: false });
    if (s < 0) part(car, rbox(0.13, 0.025, 0.02, 0.008), CHROME, bPillar - 0.62, 0.72, zs + s * 0.008, { outline: false });
    part(car, rbox(0.13, 0.09, 0.09, 0.02), body, wsFoot - 0.04, 0.92, side(s) + s * 0.06);
    part(car, box(0.004, 0.06, 0.07), '#90caf9', wsFoot - 0.105, 0.92, side(s) + s * 0.06, { outline: false });
  }
  // The rear door on the near side: a panel over the body, its window frame, its handle.
  const rearDoor = group(car, bPillar, 0, side(1));
  part(rearDoor, rbox(0.84, 0.44, 0.03, 0.012), body, -0.43, 0.58, 0.012);
  part(rearDoor, box(0.84, 0.03, 0.032), shade(body, 0.8), -0.43, 0.38, 0.013, { outline: false });
  rod(rearDoor, v3(-0.02, 0.81, -0.06), v3(-0.02, 1.27, -0.06), 0.014, BLACK);
  rod(rearDoor, v3(-0.02, 1.27, -0.06), v3(-0.64, 1.27, -0.06), 0.014, BLACK);
  rod(rearDoor, v3(-0.64, 1.27, -0.06), v3(-0.84, 0.81, -0.06), 0.014, BLACK);
  part(rearDoor, rbox(0.13, 0.025, 0.02, 0.008), CHROME, -0.62, 0.72, 0.034, { outline: false });
  label(rearDoor, '카드 결제 OK', 0.3, 0.06, -0.62, 0.86, -0.055, '#1565c0', '#ffffff');
  // Wheels with their covers.
  const ax = L / 2 - 0.7;
  const wheels: THREE.Group[] = [];
  for (const x of [-ax, ax])
    for (const s of [-1, 1]) {
      const wz = side(s) - s * 0.11;
      const w = group(car, x, 0.3, wz);
      part(w, cyl(0.3, 0.3, 0.22, 22), '#141414', 0, 0, 0, { rx: Math.PI / 2 });
      part(w, cyl(0.2, 0.2, 0.225, 16), '#cfd4d8', 0, 0, 0, { rx: Math.PI / 2, outline: false });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        part(w, box(0.035, 0.16, 0.01), '#8f969c', Math.cos(a) * 0.09, Math.sin(a) * 0.09, s * 0.116, { rz: a + Math.PI / 2, outline: false });
      }
      wheels.push(w);
      part(car, ring(0.35, 0.035, Math.PI), '#26282c', x, 0.3, side(s) + s * 0.005, { outline: false });
    }
  // Lamps: the plain lenses, and the lit ones in groups shown when they're on.
  const heads = group(car);
  const brake = group(car);
  const reverse = group(car);
  const blink = group(car);
  for (const s of [-1, 1]) {
    part(car, rbox(0.05, 0.1, 0.34, 0.03), '#eceff1', fx - 0.01, 0.7, zc + s * (Wd / 2 - 0.24));
    part(heads, box(0.012, 0.08, 0.3), '#fffde7', fx + 0.018, 0.7, zc + s * (Wd / 2 - 0.24), { outline: false, material: glow('#fffde7') });
    part(car, rbox(0.05, 0.12, 0.32, 0.03), '#8e1b1b', bx + 0.01, 0.72, zc + s * (Wd / 2 - 0.22));
    part(brake, box(0.012, 0.1, 0.28), '#ff3d3d', bx - 0.018, 0.72, zc + s * (Wd / 2 - 0.22), { outline: false, material: glow('#ff5252') });
    part(car, box(0.02, 0.05, 0.1), '#e0e0e0', bx - 0.01, 0.56, zc + s * (Wd / 2 - 0.3), { outline: false });
    part(reverse, box(0.012, 0.045, 0.09), '#ffffff', bx - 0.022, 0.56, zc + s * (Wd / 2 - 0.3), { outline: false, material: glow('#ffffff') });
    // The indicators at the four corners (and the hazards).
    for (const [x, d] of [[fx - 0.02, 1], [bx + 0.02, -1]] as const) {
      part(car, box(0.03, 0.05, 0.08), '#ffb74d', x, 0.62, zc + s * (Wd / 2 - 0.06), { outline: false });
      part(blink, box(0.012, 0.045, 0.075), '#ffa000', x + d * 0.012, 0.62, zc + s * (Wd / 2 - 0.06), { outline: false, material: glow('#ffab00') });
    }
  }
  heads.visible = brake.visible = reverse.visible = blink.visible = false;
  // The cabin.
  const seatY = 0.42;
  const dz = zc - 0.33;
  const pz = zc + 0.33;
  const sx = wsFoot - 1.0;
  const rx = sx - 0.9;
  for (const z of [dz, pz]) {
    part(car, rbox(0.48, 0.12, 0.48, 0.05), '#3e3a36', sx, seatY - 0.06, z);
    part(car, rbox(0.12, 0.6, 0.48, 0.05), '#3e3a36', sx - 0.28, seatY + 0.26, z, { rz: 0.14 });
    part(car, rbox(0.1, 0.14, 0.26, 0.04), '#34302c', sx - 0.34, seatY + 0.64, z);
    // A lace seat cover over the headrest (the old taxi look).
    part(car, box(0.004, 0.16, 0.28), '#f5f5f5', sx - 0.28, seatY + 0.62, z, { outline: false });
  }
  part(car, rbox(0.5, 0.12, Wd - 0.3, 0.05), '#3e3a36', rx, seatY - 0.06, zc);
  part(car, rbox(0.12, 0.55, Wd - 0.3, 0.05), '#3e3a36', rx - 0.28, seatY + 0.24, zc, { rz: 0.16 });
  part(car, rbox(0.42, 0.18, Wd - 0.2, 0.05), '#2f3237', wsFoot - 0.12, 0.76, zc);
  part(car, rbox(0.04, 0.06, 0.22, 0.015), BLACK, wsTop + 0.06, 0.81 + gh - 0.07, zc);
  part(car, box(0.004, 0.045, 0.2), '#cfe8f3', wsTop + 0.035, 0.81 + gh - 0.07, zc, { outline: false });
  const hubX = sx + 0.5;
  const hub = group(car, hubX, 0.86, dz);
  hub.rotation.z = 0.5;
  const wheel = group(hub);
  part(wheel, ring(0.17, 0.016), '#1a1a1a', 0, 0, 0, { ry: Math.PI / 2 });
  part(wheel, cyl(0.045, 0.045, 0.04, 12), '#2b2b2b', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  for (const [y, z] of [[-0.16, 0], [0.05, 0.16], [0.05, -0.16]] as const) rod(wheel, v3(0, 0, 0), v3(0, y, z), 0.012, '#1a1a1a');
  rod(car, v3(hubX + 0.02, 0.86, dz), v3(hubX + 0.25, 0.73, dz), 0.025, '#1a1a1a');
  const hubAt = marker(wheel, 0, 0, 0);
  const rimL = marker(wheel, -0.01, 0.1, -0.14);
  const rimR = marker(wheel, -0.01, 0.1, 0.14);
  return { seatY, dz, pz, sx, rx, wheel, hubAt, rimL, rimR, fx, bx, side, roofY, wsTop, wsFoot, bPillar, heads, brake, reverse, blink, rearDoor, wheels };
}

/** Who's at a car's wheel: their hands kept on its two rim marks as it turns. */
function handsOnWheel(car: THREE.Object3D, who: Figure, s: Cab) {
  car.updateMatrixWorld(true);
  who.armL(car.worldToLocal(s.rimL.getWorldPosition(tmp)).clone());
  who.armR(car.worldToLocal(s.rimR.getWorldPosition(tmp)).clone());
}

/**
 * The taxi (택시): see the file's note. Its uses on the lot:
 * - txCheckMeter: sat at the wheel, a finger on the meter's keys — it runs through its 점검 (all
 *   eights, then the 기본요금), the 빈차 lamp steps through 빈차/예약/회송, the roof lamp and the
 *   hazards blink.
 * - learnRoutes (입문): sat at the wheel with the 지도책 open, the senior in the passenger seat
 *   pointing out the way on the nav.
 * - guideTourist (갈래): the rear door held open at the kerb for a tourist with a backpack and a
 *   suitcase, the way shown with a hand.
 */
function taxi(g: THREE.Group, out: Parameters<Builder>[6]) {
  const zc = 0.22;
  const L = 4.0;
  const Wd = 1.56;
  // The bay: asphalt, its lines, 택시 전용 painted at its head.
  part(g, box(L + 0.8, 0.012, 2.4), ASPHALT, -0.1, 0.006, zc, { outline: false, shadow: false });
  const back = -L / 2 - 0.25;
  part(g, box(0.07, 0.004, 2.0), PAINT, back, 0.014, zc, { outline: false, shadow: false });
  for (const s of [-1, 1]) part(g, box(L + 0.1, 0.004, 0.07), PAINT, back + (L + 0.1) / 2, 0.014, zc + s * 0.98, { outline: false, shadow: false });
  const bayLabel = label(g, '택시 전용', 0.9, 0.22, back + 0.3, 0.016, zc, '#4b5056', '#f2c230', Math.PI / 2);
  bayLabel.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  // A wheel stop at the back of the bay.
  for (const s of [-1, 1]) part(g, rbox(0.12, 0.08, 0.5, 0.03), '#ffd54f', back + 0.15, 0.04, zc + s * 0.45);

  const car = group(g);
  const s = cabShell(car, zc, L, Wd, ORANGE);
  // The livery: a dark band along the sills, the company on the front doors, the car's number.
  for (const sd of [-1, 1]) {
    const zz = s.side(sd) + sd * 0.006;
    const ry = sd > 0 ? 0 : Math.PI;
    part(car, box(L - 0.5, 0.05, 0.006), ORANGE_D, -0.05, 0.42, zz, { outline: false });
    label(car, COMPANY, 0.6, 0.13, (s.wsFoot + s.bPillar) / 2, 0.62, zz + sd * 0.004, ORANGE, '#ffffff', ry);
    label(car, '1027', 0.22, 0.08, (s.wsFoot + s.bPillar) / 2, 0.5, zz + sd * 0.004, ORANGE, '#5d2a00', ry);
  }
  // The roof's 택시 표시등: a lamp box across the roof, TAXI to the front, 택시 to the back.
  const lampX = (s.wsTop + s.bPillar) / 2 - 0.05;
  const ry0 = s.roofY + 0.02;
  part(car, rbox(0.12, 0.03, 0.4, 0.01), BLACK, lampX, ry0, zc);
  part(car, rbox(0.14, 0.22, 0.6, 0.05), '#f3efe2', lampX, ry0 + 0.13, zc);
  const roofLit = group(car);
  const roofDark = group(car);
  for (const [word, d] of [['TAXI', 1], ['택시', -1]] as const) {
    picture(roofLit, roofTex(word, true), 0.54, 0.19, lampX + d * 0.072, ry0 + 0.13, zc, '#ffffff', d * (Math.PI / 2));
    picture(roofDark, roofTex(word, false), 0.54, 0.19, lampX + d * 0.072, ry0 + 0.13, zc, '#ffffff', d * (Math.PI / 2));
  }
  // The 빈차 lamp at the windscreen's foot on the passenger side, facing out the front.
  part(car, rbox(0.06, 0.08, 0.22, 0.01), BLACK, s.wsFoot - 0.21, 0.9, zc + 0.42);
  const lamp = swap(car, [LAMP.off(), LAMP.free(), LAMP.booked(), LAMP.back()], 0.19, 0.07, s.wsFoot - 0.178, 0.9, zc + 0.42, Math.PI / 2);
  // The plates.
  picture(car, plateTex('서울32바 1027'), 0.42, 0.1, s.fx + 0.075, 0.45, zc, '#ffffff', Math.PI / 2);
  picture(car, plateTex('서울32바 1027'), 0.42, 0.1, s.bx - 0.075, 0.52, zc, '#ffffff', -Math.PI / 2);
  // On the back window (along its slope), the sticker: 외국어 안내 가능.
  const sticker = group(car, -L / 2 + 0.64, 1.0, zc - 0.3);
  sticker.rotation.z = -0.76;
  picture(
    sticker,
    painted('txRearSticker', 128, 48, (c) => {
      c.fillStyle = '#0d47a1';
      c.fillRect(0, 0, 128, 48);
      text(c, 'English · 中文 · 日本語', 64, 16, 12, '#ffffff', 'center');
      text(c, '외국어 안내 가능', 64, 34, 13, '#ffeb3b', 'center');
    }),
    0.3,
    0.11,
    -0.01,
    0,
    0,
    '#ffffff',
    -Math.PI / 2,
  );
  // The meter on the dash's middle, facing the driver; the 카드 단말기 by it; the nav; the phone.
  const mx = s.wsFoot - 0.25;
  part(car, rbox(0.1, 0.07, 0.26, 0.015), '#151515', mx, 0.885, zc + 0.02);
  const meter = swap(car, [METER.free(), METER.run(), METER.check1(), METER.check2(), METER.back()], 0.23, 0.06, mx - 0.052, 0.885, zc + 0.02, -Math.PI / 2);
  for (let k = 0; k < 4; k++) part(car, box(0.012, 0.012, 0.035), ['#e53935', '#43a047', '#fdd835', '#1e88e5'][k], mx - 0.045, 0.85, zc - 0.08 + k * 0.05, { outline: false });
  const meterAt = marker(car, mx - 0.07, 0.86, zc + 0.02);
  // The card reader: a grey slab with its keypad and slot, a receipt curling out.
  part(car, rbox(0.12, 0.05, 0.1, 0.015), '#546e7a', mx - 0.1, 0.83, zc + 0.24, { rz: -0.3 });
  part(car, box(0.003, 0.03, 0.06), '#80cbc4', mx - 0.16, 0.85, zc + 0.24, { rz: -0.3, outline: false, material: glow('#a7ffeb') });
  part(car, box(0.05, 0.003, 0.05), '#fafafa', mx - 0.06, 0.865, zc + 0.24, { rz: 0.4, outline: false });
  // The nav in the dash's middle, the phone in its mount by the driver.
  part(car, rbox(0.04, 0.13, 0.22, 0.01), '#111', s.wsFoot - 0.35, 0.76, zc - 0.05);
  picture(car, navTex, 0.2, 0.115, s.wsFoot - 0.3725, 0.76, zc - 0.05, '#ffffff', -Math.PI / 2);
  const navAt = marker(car, s.wsFoot - 0.39, 0.76, zc - 0.05);
  part(car, rbox(0.02, 0.14, 0.075, 0.01), '#212121', s.wsFoot - 0.35, 0.95, s.dz - 0.2);
  picture(car, appTex, 0.064, 0.122, s.wsFoot - 0.362, 0.95, s.dz - 0.2, '#ffffff', -Math.PI / 2);
  rod(car, v3(s.wsFoot - 0.34, 0.88, s.dz - 0.2), v3(s.wsFoot - 0.34, 0.84, s.dz - 0.2), 0.008, BLACK);
  // Who's in it while it's out: the driver (and a passenger in the back on the way out).
  const crew = group(car);
  const driver = person(crew, LOOKS.driver, s.sx + 0.02, s.dz, Math.PI / 2, s.seatY);
  const riders = [LOOKS.office, LOOKS.grandma, LOOKS.tourist].map((look) => {
    const rg = group(crew);
    person(rg, look, s.rx + 0.02, s.pz, Math.PI / 2, s.seatY - 0.02);
    rg.visible = false;
    return rg;
  });
  const bag = suitcase(crew, s.rx + 0.05, s.seatY - 0.1, s.dz + 0.05, Math.PI / 2, '#7e57c2');
  bag.visible = false;
  crew.visible = false;
  // On the lot: the senior beside them (입문), the tourist at the kerb (갈래).
  const senior = person(car, LOOKS.senior, s.sx + 0.02, s.pz, Math.PI / 2, s.seatY);
  senior.root.visible = false;
  const tourist = group(g);
  const tFig = person(tourist, LOOKS.tourist, s.bPillar - 1.05, s.side(1) + 0.8, 2.5);
  // The suitcase's handle in the left hand, a phone with the address's photo up in the right.
  suitcase(tourist, s.bPillar - 1.45, 0, s.side(1) + 0.6, 0.4, '#26a69a');
  tFig.armL(v3(s.bPillar - 1.48, 0.83, s.side(1) + 0.53));
  const tPhone = v3(s.bPillar - 0.86, 1.18, s.side(1) + 0.57);
  tFig.armR(tPhone);
  part(tourist, rbox(0.075, 0.14, 0.012, 0.01), '#212121', tPhone.x + 0.02, tPhone.y + 0.05, tPhone.z - 0.02, { ry: 2.5 });
  tourist.visible = false;

  const check = sitAt(car, s.sx + 0.02, s.seatY, s.dz, Math.PI / 2, 'type', meterAt);
  const learn = sitAt(car, s.sx + 0.02, s.seatY, s.dz, Math.PI / 2, 'read', s.hubAt);
  const doorAt = marker(car, s.bPillar - 0.1, 1.05, s.side(1) + 0.3);
  const kerb = standAt(car, s.bPillar + 0.32, s.side(1) + 0.55, -1.4, 'gesture', doorAt);
  const by = standAt(car, (s.wsFoot + s.bPillar) / 2, s.side(1) + 0.45, Math.PI, 'tinker', marker(car, (s.wsFoot + s.bPillar) / 2, 0.75, s.side(1) + 0.03));
  out.work = s.hubAt;
  out.spots = { txCheckMeter: check, taxiDriver_learnRoutes: learn, taxiDriver_guideTourist: kerb, '*': by };

  // Out on a fare: out of the bay, round to the right, down the lane and away; back: reversing up the
  // lane and round into the bay showing 회송. 2026-11-05, the layout audit: a cab parked nose to the street (the depot's bays) drives
  // straight out of its bay to the street and turns right into its near lane there, so it crosses nothing on the way; parked any
  // other way (a cab at a kerb) it pulls forward a little and turns as before.
  const R = 1.2;
  let s1 = 0.6;
  const arc = (Math.PI * R) / 2;
  let far = 22;
  let measured = false;
  const measure = () => {
    measured = true;
    g.updateWorldMatrix(true, false);
    const at = g.getWorldPosition(new THREE.Vector3());
    const nose = new THREE.Vector3(1, 0, 0).transformDirection(g.matrixWorld);
    // The street's westbound lane (Korea drives on the right) runs along z ≈ 15.9.
    if (nose.z > 0.9 && at.z < 14) {
      s1 = Math.max(0.6, 15.9 - R - at.z);
      far = s1 + arc + 22;
    }
  };
  const along = (d: number) => {
    if (d <= s1) return { x: d, z: 0, yaw: 0 };
    if (d <= s1 + arc) {
      const th = (d - s1) / R;
      return { x: s1 + R * Math.sin(th), z: R * (1 - Math.cos(th)), yaw: -th };
    }
    return { x: s1 + R, z: R + (d - s1 - arc), yaw: -Math.PI / 2 };
  };
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  let trips = 0;
  let door = 0;
  let lastT = 0;
  out.away = (isOut, t) => {
    if (!measured) measure();
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) {
      [state, since] = ['leaving', t];
      trips++;
    } else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    const e = t - since;
    let d = 0;
    if (state === 'leaving') {
      const r = Math.max(0, e - 1.2);
      d = Math.min(far, 0.75 * r * r);
      if (d >= far) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, e / 8);
      d = far * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    const p = along(d);
    car.position.set(p.x, 0, p.z);
    car.rotation.y = p.yaw;
    s.wheel.rotation.x = d > s1 * 0.6 && d < s1 + arc ? -1.8 : 0;
    s.wheels.forEach((w) => (w.rotation.z = -d / 0.3));
    car.visible = state !== 'gone';
    const moving = state === 'leaving' || state === 'back';
    crew.visible = moving;
    const booked = trips % 2 === 0;
    riders.forEach((r, i) => (r.visible = state === 'leaving' && i === (booked ? 0 : trips % 4 === 1 ? 1 : 2)));
    bag.visible = state === 'leaving' && booked;
    s.heads.visible = moving;
    s.reverse.visible = state === 'back';
    s.brake.visible = (state === 'back' && d < 1) || (state === 'leaving' && e < 1.2);
    if (moving) handsOnWheel(car, driver, s);

    // On the lot.
    const checking = state === 'parked' && posed(check, t);
    const learning = state === 'parked' && posed(learn, t);
    const kerbside = state === 'parked' && posed(kerb, t);
    senior.root.visible = learning;
    if (learning) {
      // Pointing the turns out on the nav now and then, a hand back in the lap otherwise.
      const pointing = Math.sin(t * 0.7) > -0.2;
      senior.armR(pointing ? navAt.position.clone().add(v3(-0.05, 0.02 * Math.sin(t * 3), 0.04 * Math.sin(t * 1.3))) : null);
    }
    tourist.visible = kerbside;
    door = THREE.MathUtils.damp(door, kerbside ? 1.1 : 0, 4, dt);
    s.rearDoor.rotation.y = door;
    if (checking) {
      const k = Math.floor(t / 1.6) % 4;
      lamp([1, 2, 3, 0][k]);
      meter(Math.floor(t / 2.4) % 2 === 0 ? 2 : 3);
      const on = Math.sin(t * 6) > 0;
      roofLit.visible = on;
      roofDark.visible = !on;
      s.blink.visible = Math.sin(t * 8) > 0;
    } else {
      const free = state === 'back';
      lamp(state === 'leaving' ? (booked ? 2 : 0) : state === 'back' ? 3 : 0);
      meter(state === 'leaving' ? 1 : state === 'back' ? 4 : 0);
      roofLit.visible = free;
      roofDark.visible = !free;
      s.blink.visible = state === 'leaving' && e < 2.2 && Math.sin(t * 8) > 0;
    }
  };
  handsOnWheel(car, driver, s);
}

// ---------------------------------------------------------------------------------------------
// The call terminal.

/**
 * The call terminal (콜 단말기): a pedestal kiosk in the yard, its touch screen tipped back under a
 * hood showing the city's map with the waiting calls and a 새 콜 card (역삼역 → 인천공항 T2, 52,000원,
 * 수락), the company's lit header on top, a ledge with the 배차표 on its clipboard, the dispatch radio
 * hung on the side, a receipt printer. Checking calls (checkCalls): at the screen, tapping through
 * them. Planning the day's 배차 (planDispatch): the 배차표 on the ledge written up. Training a new
 * driver (trainDrivers): stood beside it turned to them, pointing back at the map, a rookie in a
 * 신입 vest stood listening.
 */
function terminal(g: THREE.Group, out: Parameters<Builder>[6]) {
  part(g, rbox(0.62, 0.05, 0.5, 0.02), '#9e9e9e', 0, 0.025, -0.1);
  part(g, rbox(0.3, 0.95, 0.24, 0.05), '#37474f', 0, 0.52, -0.15);
  part(g, box(0.31, 0.06, 0.25), '#ffca28', 0, 0.85, -0.15, { outline: false });
  // The head, tipped back.
  const head = group(g, 0, 1.22, -0.08);
  head.rotation.x = -0.45;
  part(head, rbox(0.66, 0.46, 0.08, 0.03), '#263238', 0, 0, -0.03);
  const screen = picture(head, kioskTex, 0.6, 0.4, 0, 0, 0.012);
  out.screen = screen;
  part(head, rbox(0.7, 0.03, 0.18, 0.01), '#212121', 0, 0.245, 0.03);
  const tapAt = marker(head, 0.18, -0.05, 0.03);
  // The lit header.
  part(g, rbox(0.7, 0.16, 0.1, 0.03), '#212121', 0, 1.62, -0.18);
  label(g, `${COMPANY} 콜`, 0.62, 0.12, 0, 1.62, -0.125, '#ffca28', '#212121');
  rod(g, v3(0, 1.4, -0.2), v3(0, 1.54, -0.2), 0.02, '#455a64');
  // The ledge with the 배차표.
  part(g, rbox(0.3, 0.03, 0.24, 0.01), '#546e7a', -0.36, 0.98, 0.0);
  rod(g, v3(-0.2, 0.96, -0.1), v3(-0.15, 0.8, -0.15), 0.015, '#546e7a');
  const clip = group(g, -0.36, 1.0, 0.02);
  clip.rotation.x = -Math.PI / 2;
  part(clip, rbox(0.2, 0.26, 0.01, 0.005), '#8d6e63', 0, 0, 0);
  picture(clip, rosterTex, 0.18, 0.23, 0, -0.005, 0.007);
  part(clip, rbox(0.08, 0.02, 0.015, 0.004), CHROME, 0, 0.12, 0.008, { outline: false });
  const clipAt = marker(g, -0.36, 1.01, 0.02);
  // The radio handset on its hook, the coiled cord; the receipt printer.
  part(g, rbox(0.03, 0.05, 0.03, 0.01), BLACK, 0.17, 1.0, -0.12);
  part(g, rbox(0.07, 0.15, 0.04, 0.015), '#212121', 0.2, 0.98, -0.1);
  part(g, cyl(0.006, 0.006, 0.06, 6), BLACK, 0.21, 1.08, -0.1, { outline: false });
  for (let k = 0; k < 6; k++) part(g, ring(0.018, 0.004), BLACK, 0.18, 0.88 - k * 0.025, -0.1, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.16, 0.08, 0.12, 0.02), '#eceff1', 0.0, 0.92, 0.02);
  part(g, box(0.1, 0.002, 0.08), '#ffffff', 0.0, 0.965, 0.07, { rx: -0.6, outline: false });
  // The rookie, there while a new driver's taught.
  const rookie = person(g, LOOKS.rookie, -0.15, 0.95, 2.85);
  rookie.root.visible = false;
  const calls = standAt(g, 0, 0.5, Math.PI, 'type', tapAt);
  const plan = standAt(g, -0.3, 0.48, Math.PI, 'write', clipAt);
  const train = standAt(g, 0.55, 0.3, -0.35, 'present', marker(head, 0.05, 0.05, 0.02));
  out.work = tapAt;
  out.spots = { checkCalls: calls, taxiDriver_planDispatch: plan, taxiDriver_trainDrivers: train, '*': calls };
  out.away = (_o, t) => {
    rookie.root.visible = posed(train, t);
  };
}

// ---------------------------------------------------------------------------------------------
// The new pieces.

const dispatchBoardTex = painted('txDispatchBoard', 128, 160, (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 128, 160);
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 128, 22);
  text(c, '오늘의 배차', 64, 12, 13, '#ffffff', 'center');
  const rows = [['1027', '주간', '출고'], ['1031', '야간', '대기'], ['1044', '주간', '출고'], ['1052', '주간', '정비'], ['1068', '야간', '대기'], ['1071', '주간', '출고']];
  rows.forEach((r, i) => {
    const y = 34 + i * 20;
    text(c, r[0], 8, y, 12, '#37474f');
    text(c, r[1], 56, y, 11, r[1] === '야간' ? '#5e35b1' : '#ef6c00', 'center');
    c.fillStyle = r[2] === '출고' ? '#43a047' : r[2] === '정비' ? '#e53935' : '#90a4ae';
    c.fillRect(82, y - 8, 40, 16);
    text(c, r[2], 102, y, 11, '#ffffff', 'center');
  });
  text(c, '무사고 312일째', 64, 154, 11, '#c62828', 'center');
});
const keyCabinetTex = painted('txKeyCab', 128, 96, (c) => {
  c.fillStyle = '#eceff1';
  c.fillRect(0, 0, 128, 96);
  text(c, '차량 키', 64, 9, 10, '#455a64', 'center');
  for (let r = 0; r < 3; r++)
    for (let k = 0; k < 6; k++) {
      const x = 12 + k * 20;
      const y = 26 + r * 26;
      c.fillStyle = '#9e9e9e';
      c.beginPath();
      c.arc(x, y - 6, 2, 0, Math.PI * 2);
      c.fill();
      if ((r * 6 + k) % 5 === 3) continue;
      c.fillStyle = ['#ff7043', '#ffca28', '#66bb6a'][r];
      c.fillRect(x - 6, y, 12, 12);
      c.fillStyle = '#424242';
      c.fillRect(x - 1, y - 6, 2, 7);
    }
});

/**
 * The 배차실 창구: the dispatch office's window in the depot's wall — a cream wall with its sliding
 * glass, a steel counter outside with the pass-through tray, the 배차실 sign lit over it, the 음주측정기
 * on its bracket with 음주 측정 후 출차 by it, the 오늘의 배차 board (who's out, who's waiting, the
 * 무사고 days), and inside the dispatcher at the desk with the screen and the key cabinet behind
 * them. Getting the keys (txGetKeys): at the window, the keys on their orange tag pushed out on the
 * tray and taken. Paying in the day's takings (txDepositFare): the 입금 envelope on the tray and the
 * 입금 장부 signed.
 */
function dispatchWindow(g: THREE.Group, out: Parameters<Builder>[6]) {
  const WALL = '#e9e3d3';
  const fz = -0.05;
  const H = 2.3;
  // The wall around the window (sill 0.95, head 1.7, the window ±0.55).
  part(g, box(2, 0.95, 0.1), WALL, 0, 0.475, fz);
  part(g, box(2, 0.1, 0.104), '#8d7b68', 0, 0.05, fz, { outline: false });
  part(g, box(2, H - 1.7, 0.1), WALL, 0, (H + 1.7) / 2, fz);
  for (const s of [-1, 1]) part(g, box(1 - 0.55, 0.75, 0.1), WALL, s * (0.55 + (1 - 0.55) / 2), 1.325, fz);
  // The booth behind: its sides, back and roof, dim inside.
  for (const s of [-1, 1]) part(g, box(0.06, H, 0.45), WALL, s * 0.97, H / 2, -0.28);
  part(g, box(2, H, 0.05), '#d6cfbd', 0, H / 2, -0.48);
  part(g, box(2, 0.06, 0.5), '#bdb6a5', 0, H + 0.03, -0.25);
  part(g, box(1.9, 0.01, 0.42), '#8d8d8d', 0, 0.005, -0.27, { outline: false });
  // The window: its frame, two glass panes (one slid back), the speaking holes, the tray slot.
  for (const s of [-1, 1]) part(g, box(0.04, 0.75, 0.12), '#90a4ae', s * 0.55, 1.325, fz);
  part(g, box(1.14, 0.04, 0.12), '#90a4ae', 0, 1.7, fz);
  part(g, box(0.56, 0.62, 0.01), '#d7eef7', -0.26, 1.36, fz + 0.02, { material: PANE, outline: false, shadow: false });
  part(g, box(0.56, 0.62, 0.01), '#d7eef7', 0.12, 1.36, fz - 0.02, { material: PANE, outline: false, shadow: false });
  part(g, cyl(0.06, 0.06, 0.012, 16), '#b0bec5', -0.26, 1.38, fz + 0.026, { rx: Math.PI / 2, outline: false });
  // The counter outside and the tray through.
  part(g, rbox(1.3, 0.04, 0.34, 0.01), STEEL, 0, 0.97, 0.13);
  for (const s of [-1, 1]) part(g, box(0.03, 0.2, 0.25), STEEL, s * 0.6, 0.86, 0.1, { outline: false });
  part(g, rbox(0.36, 0.03, 0.4, 0.01), '#9aa3ab', -0.08, 1.0, 0.0);
  part(g, box(0.3, 0.02, 0.34), '#cfd8dc', -0.08, 1.016, 0.0, { outline: false });
  const trayAt = marker(g, -0.08, 1.03, 0.08);
  // On the counter: the 입금 장부 with its pen, a bell.
  const ledger = group(g, 0.38, 0.995, 0.15);
  part(ledger, box(0.3, 0.015, 0.22), '#1a237e', 0, 0, 0);
  part(ledger, box(0.28, 0.006, 0.2), '#fafafa', 0, 0.01, 0, { outline: false });
  label(ledger, '운송수입금 입금 장부', 0.26, 0.03, 0, 0.0145, -0.08, '#fafafa', '#1a237e').rotation.set(-Math.PI / 2, 0, 0);
  for (let k = 0; k < 5; k++) part(ledger, box(0.24, 0.002, 0.004), '#90a4ae', 0, 0.0145, -0.04 + k * 0.025, { outline: false });
  rod(ledger, v3(0.1, 0.02, 0.06), v3(0.02, 0.02, 0.1), 0.006, '#1565c0');
  const ledgerAt = marker(g, 0.36, 1.01, 0.16);
  part(g, cyl(0.04, 0.05, 0.02, 14), '#455a64', 0.58, 1.0, 0.24);
  part(g, ball(0.03), CHROME, 0.58, 1.02, 0.24);
  // The keys (shown while they're handed over) and the envelope (while the takings are paid in).
  const keys = group(g, -0.08, 1.03, 0.04);
  part(keys, rbox(0.06, 0.015, 0.03, 0.006), '#212121', 0, 0, 0);
  part(keys, box(0.006, 0.004, 0.06), '#b0bec5', 0, 0, 0.04, { outline: false });
  part(keys, ring(0.016, 0.003), '#9e9e9e', 0, 0, -0.03, { rx: Math.PI / 2, outline: false });
  part(keys, rbox(0.05, 0.004, 0.07, 0.004), '#ff7043', 0.03, 0, -0.07);
  keys.visible = false;
  const envelope = group(g, -0.12, 1.03, 0.06);
  part(envelope, box(0.24, 0.012, 0.12), '#f5e6c8', 0, 0, 0);
  label(envelope, '입금 1027', 0.18, 0.05, 0, 0.0065, 0, '#f5e6c8', '#6d4c41').rotation.set(-Math.PI / 2, 0, 0);
  envelope.visible = false;
  // The sign over the window, lit.
  part(g, rbox(0.9, 0.22, 0.06, 0.02), '#263238', 0, 1.98, fz + 0.06);
  label(g, '배차실', 0.82, 0.17, 0, 1.98, fz + 0.093, '#263238', '#ffca28');
  // The 음주측정기 on its bracket, its mouthpiece on the coiled cord, and its notice.
  part(g, rbox(0.16, 0.22, 0.08, 0.02), '#eceff1', -0.78, 1.36, fz + 0.09);
  part(g, box(0.1, 0.05, 0.004), '#263238', -0.78, 1.42, fz + 0.132, { outline: false, material: glow('#64ffda') });
  label(g, '0.000', 0.08, 0.03, -0.78, 1.42, fz + 0.135, '#004d40', '#64ffda');
  part(g, rbox(0.04, 0.12, 0.04, 0.015), '#37474f', -0.66, 1.25, fz + 0.1);
  part(g, cyl(0.006, 0.006, 0.04, 6), '#fafafa', -0.66, 1.33, fz + 0.1, { outline: false });
  for (let k = 0; k < 5; k++) part(g, ring(0.016, 0.004), BLACK, -0.7, 1.18 - k * 0.025, fz + 0.1, { rx: Math.PI / 2, outline: false });
  const notice = painted('txBreathNotice', 128, 96, (c) => {
    c.fillStyle = '#fffde7';
    c.fillRect(0, 0, 128, 96);
    c.fillStyle = '#c62828';
    c.fillRect(0, 0, 128, 26);
    text(c, '음주 측정 후 출차', 64, 14, 15, '#ffffff', 'center');
    text(c, '측정기에 3초간', 64, 44, 13, '#37474f', 'center');
    text(c, '길게 부세요', 64, 62, 13, '#37474f', 'center');
    text(c, '0.03% 이상 운행 금지', 64, 84, 11, '#c62828', 'center');
  });
  picture(g, notice, 0.3, 0.22, -0.78, 1.63, fz + 0.055);
  // The 오늘의 배차 board.
  part(g, rbox(0.36, 0.46, 0.03, 0.01), '#b0bec5', 0.78, 1.38, fz + 0.065);
  picture(g, dispatchBoardTex, 0.32, 0.42, 0.78, 1.38, fz + 0.082);
  // Inside: the desk, the screen, the key cabinet, the dispatcher.
  part(g, rbox(1.2, 0.04, 0.3, 0.01), '#a1887f', 0.15, 0.78, -0.3);
  part(g, rbox(0.03, 0.24, 0.34, 0.01), '#212121', 0.6, 1.0, -0.3);
  picture(g, kioskTex, 0.3, 0.2, 0.583, 1.0, -0.3, '#cfd8dc', -Math.PI / 2);
  part(g, rbox(0.5, 0.42, 0.06, 0.01), '#cfd8dc', -0.3, 1.42, -0.44);
  picture(g, keyCabinetTex, 0.46, 0.36, -0.3, 1.42, -0.408);
  // The dispatcher, sat side-on at the desk facing the screen; turned to the window when someone's there.
  part(g, rbox(0.4, 0.06, 0.4, 0.03), '#3949ab', -0.15, 0.42, -0.4);
  const clerk = person(g, LOOKS.dispatcher, -0.15, -0.4, Math.PI / 2, 0.45);
  const typing = [v3(0.3, 0.82, -0.36), v3(0.3, 0.82, -0.22)];
  clerk.armL(typing[0]);
  clerk.armR(typing[1]);
  // The uses.
  const take = standAt(g, -0.08, 0.62, Math.PI, 'rummage', trayAt);
  const pay = standAt(g, 0.3, 0.62, Math.PI, 'write', ledgerAt);
  out.work = trayAt;
  out.spots = { txGetKeys: take, txDepositFare: pay, '*': take };
  out.away = (_o, t) => {
    const taking = posed(take, t);
    const paying = posed(pay, t);
    keys.visible = taking && Math.sin(t * 0.5) > -0.6;
    envelope.visible = paying;
    // The dispatcher turns to whoever's at the window.
    clerk.root.rotation.y = taking || paying ? 0.95 : Math.PI / 2;
    clerk.armR(taking ? v3(-0.08, 1.02, -0.05) : paying ? v3(0.05, 0.85, -0.2) : typing[1]);
    clerk.armL(taking || paying ? null : typing[0]);
  };
}

const pumpTex = (litres: string, won: string) =>
  painted(`txPump|${litres}|${won}`, 160, 128, (c) => {
    c.fillStyle = '#102027';
    c.fillRect(0, 0, 160, 128);
    const row = (y: number, k: string, v: string, unit: string) => {
      text(c, k, 8, y, 12, '#b0bec5');
      c.fillStyle = '#000';
      c.fillRect(50, y - 14, 84, 28);
      c.font = 'bold 24px "Consolas","Courier New",monospace';
      c.fillStyle = '#ff5252';
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.fillText(v, 130, y + 1);
      text(c, unit, 152, y, 12, '#b0bec5', 'center');
    };
    row(22, '금액', won, '원');
    row(60, '충전량', litres, 'L');
    row(98, '단가', '1,045', '원');
  });

/**
 * The LPG 충전기: the yard's own dispenser on its striped island, white with the gas company's blue
 * band, its head with the red digits (금액, 충전량, 단가 1,045원), the chunky LPG nozzle in its holster
 * on the side and its hose looped from the top, 화기엄금 on a post, 시동 끄고 충전 on the cabinet,
 * an extinguisher at its foot. Filling (txRefuelLpg): the nozzle off its holster and held out, the
 * hose after it, the digits climbing.
 */
function lpgPump(g: THREE.Group, out: Parameters<Builder>[6]) {
  // The island.
  part(g, rbox(0.95, 0.14, 0.82, 0.03), '#bdbdbd', 0, 0.07, -0.05);
  const stripe = painted('txStripe', 128, 16, (c) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? '#212121' : '#fdd835';
      c.beginPath();
      c.moveTo(i * 16 - 8, 16);
      c.lineTo(i * 16 + 8, 0);
      c.lineTo(i * 16 + 16, 0);
      c.lineTo(i * 16, 16);
      c.closePath();
      c.fill();
    }
  });
  picture(g, stripe, 0.95, 0.12, 0, 0.07, 0.372);
  // The cabinet and its head.
  part(g, rbox(0.6, 1.1, 0.38, 0.03), '#f5f5f5', 0, 0.69, -0.12);
  part(g, box(0.604, 0.12, 0.384), '#1565c0', 0, 0.4, -0.12, { outline: false });
  label(g, 'LPG', 0.3, 0.1, 0, 0.4, 0.073, '#1565c0', '#ffffff');
  label(g, '시동 끄고 충전', 0.36, 0.06, 0, 0.62, 0.072, '#f5f5f5', '#c62828');
  part(g, rbox(0.62, 0.5, 0.4, 0.04), '#eceff1', 0, 1.49, -0.12);
  part(g, box(0.64, 0.06, 0.42), '#1565c0', 0, 1.77, -0.12, { outline: false });
  label(g, '한빛운수 충전소', 0.5, 0.05, 0, 1.77, 0.093, '#1565c0', '#ffffff');
  const digits = swap(g, [pumpTex('0.00', '0'), pumpTex('8.42', '8,799'), pumpTex('17.30', '18,078'), pumpTex('26.11', '27,284'), pumpTex('35.00', '36,575')], 0.48, 0.38, 0, 1.49, 0.082);
  // A keypad under it.
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) part(g, box(0.05, 0.035, 0.012), '#90a4ae', -0.09 + k * 0.06, 0.98 - r * 0.05, 0.075, { outline: false });
  // The holster, the nozzle in it (or held), the hose.
  part(g, rbox(0.08, 0.16, 0.12, 0.02), '#424242', 0.34, 1.05, -0.05);
  const nozzle = group(g, 0.38, 1.0, -0.02);
  const buildNozzle = (n: THREE.Group) => {
    part(n, rbox(0.07, 0.2, 0.08, 0.025), '#212121', 0, 0, 0);
    part(n, cyl(0.025, 0.03, 0.14, 12), '#424242', 0, -0.14, 0.03, { rx: 0.5 });
    part(n, rbox(0.075, 0.03, 0.09, 0.01), '#d32f2f', 0, 0.06, 0.02);
    part(n, cyl(0.035, 0.035, 0.03, 12), '#9e9e9e', 0, -0.2, 0.06, { rx: 0.5, outline: false });
  };
  buildNozzle(nozzle);
  const held = group(g);
  buildNozzle(held);
  held.visible = false;
  const hoseTop = v3(0.31, 1.75, -0.1);
  const hose = [limb(g, 0.022, '#1b1b1b'), limb(g, 0.022, '#1b1b1b'), limb(g, 0.022, '#1b1b1b')];
  const idleMid = v3(0.42, 1.35, -0.02);
  const idleEnd = v3(0.38, 1.1, -0.02);
  hose[0](hoseTop, v3(0.42, 1.6, -0.06));
  hose[1](v3(0.42, 1.6, -0.06), idleMid);
  hose[2](idleMid, idleEnd);
  // The 화기엄금 post and the extinguisher.
  rod(g, v3(-0.4, 0.14, 0.25), v3(-0.4, 1.25, 0.25), 0.018, '#9e9e9e');
  label(g, '화기엄금', 0.2, 0.2, -0.4, 1.32, 0.262, '#c62828', '#ffffff');
  part(g, cyl(0.06, 0.06, 0.36, 14), '#d32f2f', -0.38, 0.32, -0.12);
  part(g, rbox(0.05, 0.06, 0.05, 0.01), BLACK, -0.38, 0.53, -0.12);
  const workAt = marker(g, 0.1, 0.95, 0.32);
  const fill = standAt(g, 0.05, 0.68, Math.PI, 'tinker', workAt);
  out.work = workAt;
  out.spots = { '*': fill };
  let since = -1;
  out.away = (_o, t) => {
    const on = posed(fill, t);
    nozzle.visible = !on;
    held.visible = on;
    if (on) {
      if (since < 0) since = t;
      held.position.set(0.13, 0.98, 0.3);
      held.rotation.set(-1.2, 0, 0);
      const mid = v3(0.4, 1.0, 0.2);
      hose[0](hoseTop, v3(0.45, 1.5, 0.05));
      hose[1](v3(0.45, 1.5, 0.05), mid);
      hose[2](mid, v3(0.14, 0.92, 0.36));
      digits(Math.min(4, 1 + Math.floor((t - since) / 2.5)));
    } else {
      since = -1;
      hose[0](hoseTop, v3(0.42, 1.6, -0.06));
      hose[1](v3(0.42, 1.6, -0.06), idleMid);
      hose[2](idleMid, idleEnd);
      digits(0);
    }
  };
}

const vendTex = painted('txVendPanel', 192, 160, (c) => {
  c.fillStyle = '#fff8e1';
  c.fillRect(0, 0, 192, 160);
  c.fillStyle = '#b71c1c';
  c.fillRect(0, 0, 192, 26);
  text(c, '따뜻한 커피', 96, 14, 16, '#ffffff', 'center');
  const items: Array<[string, string, string]> = [['밀크커피', '400', '#d7a86e'], ['고급커피', '500', '#8d6e63'], ['블랙커피', '400', '#3e2723'], ['율무차', '400', '#efdcb5'], ['코코아', '400', '#6d4c41'], ['녹차', '400', '#9ccc65']];
  items.forEach(([n, p, col], i) => {
    const x = 32 + (i % 3) * 64;
    const y = 58 + Math.floor(i / 3) * 62;
    // A paper cup with the drink in it.
    c.fillStyle = '#fafafa';
    c.beginPath();
    c.moveTo(x - 14, y - 22);
    c.lineTo(x + 14, y - 22);
    c.lineTo(x + 10, y + 8);
    c.lineTo(x - 10, y + 8);
    c.closePath();
    c.fill();
    c.fillStyle = '#e53935';
    c.fillRect(x - 12, y - 10, 24, 6);
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(x, y - 22, 14, 4, 0, 0, Math.PI * 2);
    c.fill();
    text(c, n, x, y + 17, 11, '#3e2723', 'center');
    text(c, `${p}원`, x, y + 29, 10, '#c62828', 'center');
  });
});
/**
 * The 커피 자판기 in the drivers' 휴게실: the tall maroon cabinet with its lit panel of paper cups
 * (밀크커피 400원…), a row of buttons under them, the coin slot and the bill reader, the return
 * lever, the 거스름돈 cup, and the cup outlet behind its little flap; a bin for the empties. A
 * coffee (txVendCoffee): the coin in, the button pressed, the cup taken from the outlet, steaming.
 */
function vending(g: THREE.Group, out: Parameters<Builder>[6]) {
  const BODY = '#8e1b1b';
  part(g, rbox(0.8, 1.78, 0.6, 0.03), BODY, 0, 0.89, -0.15);
  part(g, box(0.82, 0.08, 0.62), '#3e2723', 0, 0.04, -0.15, { outline: false });
  // The panel, lit.
  part(g, box(0.62, 0.56, 0.02), '#fff8e1', -0.04, 1.36, 0.155, { outline: false });
  picture(g, vendTex, 0.6, 0.5, -0.04, 1.36, 0.167);
  // The buttons under each cup.
  const lit: THREE.Mesh[] = [];
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 3; k++) {
      part(g, rbox(0.1, 0.03, 0.02, 0.008), '#eeeeee', -0.24 + k * 0.2, 1.03 - r * 0.05, 0.16);
      const m = part(g, box(0.08, 0.018, 0.004), '#ff5252', -0.24 + k * 0.2, 1.03 - r * 0.05, 0.172, { outline: false, material: glow('#ff5252') });
      m.visible = false;
      lit.push(m);
    }
  // The coin slot, bill reader, return lever, change cup on the right.
  part(g, rbox(0.12, 0.3, 0.02, 0.01), '#bdbdbd', 0.3, 1.36, 0.16);
  part(g, box(0.012, 0.05, 0.006), BLACK, 0.3, 1.46, 0.172, { outline: false });
  part(g, box(0.08, 0.012, 0.006), BLACK, 0.3, 1.36, 0.172, { outline: false });
  label(g, '동전', 0.08, 0.025, 0.3, 1.5, 0.172, '#bdbdbd', '#212121');
  part(g, rbox(0.03, 0.06, 0.03, 0.01), '#9e9e9e', 0.3, 1.27, 0.18);
  part(g, rbox(0.12, 0.07, 0.06, 0.01), '#616161', 0.28, 0.42, 0.17);
  // The cup outlet: a dark recess with its flap.
  part(g, box(0.24, 0.24, 0.02), '#1a1a1a', -0.05, 0.78, 0.157, { outline: false });
  part(g, rbox(0.28, 0.03, 0.06, 0.01), '#9e9e9e', -0.05, 0.66, 0.17);
  label(g, '컵 나오는 곳', 0.24, 0.04, -0.05, 0.94, 0.168, BODY, '#ffecb3');
  const flap = group(g, -0.05, 0.9, 0.17);
  part(flap, box(0.24, 0.2, 0.01), '#bcaaa4', 0, -0.1, 0, { material: PANE, outline: false });
  // The cup, there while it's poured and taken, with its steam.
  const cup = group(g, -0.05, 0.69, 0.1);
  part(cup, cyl(0.04, 0.03, 0.08, 14), '#fafafa', 0, 0.04, 0);
  part(cup, cyl(0.041, 0.04, 0.02, 14), '#e53935', 0, 0.045, 0, { outline: false });
  part(cup, cyl(0.037, 0.037, 0.004, 14), '#c8a272', 0, 0.075, 0, { outline: false });
  const steam = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(ball(0.025), STEAM);
    m.position.set(0, 0.1, 0);
    cup.add(m);
    return m;
  });
  cup.visible = false;
  // A bin for the empties at its side.
  part(g, cyl(0.12, 0.1, 0.42, 16), '#78909c', -0.55 + 0.1, 0.21, 0.25);
  label(g, '컵 버리는 곳', 0.18, 0.04, -0.45, 0.35, 0.37, '#78909c', '#ffffff');
  const outlet = marker(g, -0.05, 0.78, 0.2);
  const use = standAt(g, 0, 0.55, Math.PI, 'rummage', outlet);
  out.work = outlet;
  out.spots = { '*': use };
  out.away = (_o, t) => {
    const on = posed(use, t);
    cup.visible = on;
    const k = Math.floor(t / 4) % 6;
    lit.forEach((m, i) => (m.visible = on && i === k % 2));
    flap.rotation.x = on ? -0.9 : 0;
    steam.forEach((m, i) => {
      const u = (t * 0.6 + i / 3) % 1;
      m.position.set(0.02 * Math.sin(t * 2 + i), 0.1 + 0.18 * u, 0.01 * i);
      m.scale.setScalar(0.6 + 1.2 * u);
      m.visible = on && u < 0.9;
    });
  };
}

const logTex = painted('txLogBook', 192, 128, (c) => {
  c.fillStyle = '#fbfbf6';
  c.fillRect(0, 0, 192, 128);
  text(c, '운 행 일 지', 96, 10, 12, '#263238', 'center');
  text(c, '차량 서울32바 1027 · 김모범', 96, 24, 9, '#546e7a', 'center', false);
  const heads = ['출고', '입고', '주행km', '영업km', '수입금'];
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 1;
  heads.forEach((h, i) => text(c, h, 18 + i * 38, 40, 9, '#37474f', 'center'));
  const rows = [['04:30', '15:10', '231', '178', '213,400'], ['05:00', '15:40', '244', '190', '226,800'], ['04:40', '', '', '', '']];
  rows.forEach((r, j) => {
    const y = 58 + j * 18;
    c.beginPath();
    c.moveTo(2, y - 9);
    c.lineTo(190, y - 9);
    c.stroke();
    r.forEach((v, i) => text(c, v, 18 + i * 38, y, 9, '#1a237e', 'center', false));
  });
  c.beginPath();
  c.moveTo(2, 103);
  c.lineTo(190, 103);
  c.stroke();
  text(c, '특이사항: 뒷좌석 우산 습득', 6, 116, 9, '#c62828', 'left', false);
});
const tachoTex = painted('txTacho', 192, 120, (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 192, 120);
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 192, 18);
  text(c, '운행기록 분석 (DTG)', 6, 10, 11, '#ffffff');
  c.strokeStyle = '#eceff1';
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(14, 30 + i * 14);
    c.lineTo(186, 30 + i * 14);
    c.stroke();
  }
  c.strokeStyle = '#ef5350';
  c.setLineDash([4, 3]);
  c.beginPath();
  c.moveTo(14, 44);
  c.lineTo(186, 44);
  c.stroke();
  c.setLineDash([]);
  c.strokeStyle = '#1e88e5';
  c.lineWidth = 2;
  c.beginPath();
  const rng = seeded(9);
  let y = 96;
  c.moveTo(14, y);
  for (let x = 14; x <= 186; x += 6) {
    y = Math.max(40, Math.min(100, y + (rng() - 0.5) * 22));
    c.lineTo(x, y);
  }
  c.stroke();
  text(c, '과속 0회 · 급정거 1회 · 급가속 0회', 96, 112, 10, '#37474f', 'center');
});
/**
 * The 운행일지 desk in the back room: a grey steel office desk, the 운행일지 binder open on it at
 * today's page (출고 04:40 waiting to be filled), the laptop with the 운행기록계's (DTG) speed trace
 * and its card reader, a calculator, a pen cup, a desk lamp, a hutch board pinned with 안전운행 and
 * 이달의 무사고 notes; its swivel chair. Writing up the log (txWriteLog): sat with the pen at the
 * page. Reading the 운행기록 (txReadTacho): sat at the laptop going through the trace.
 */
function logDesk(g: THREE.Group, out: Parameters<Builder>[6]) {
  const STEELD = '#90a4ae';
  const tz = -0.15;
  part(g, rbox(1.7, 0.04, 0.62, 0.01), '#b0bec5', 0, 0.74, tz);
  part(g, box(1.66, 0.006, 0.58), '#cfd8dc', 0, 0.762, tz, { outline: false });
  part(g, rbox(0.42, 0.7, 0.58, 0.01), STEELD, 0.62, 0.36, tz);
  for (let k = 0; k < 3; k++) part(g, box(0.3, 0.004, 0.02), '#607d8b', 0.62, 0.6 - k * 0.2, tz + 0.295, { outline: false });
  part(g, box(0.04, 0.7, 0.58), STEELD, -0.81, 0.36, tz);
  part(g, box(1.6, 0.4, 0.02), STEELD, 0, 0.5, tz - 0.28, { outline: false });
  // The hutch board along the back.
  part(g, rbox(1.4, 0.5, 0.03, 0.01), '#a1887f', 0, 1.05, tz - 0.29);
  const note = (s: string, col: string, x: number, y: number) => label(g, s, 0.26, 0.12, x, y, tz - 0.27, col, '#37474f');
  note('안전운행', '#fff59d', -0.45, 1.15);
  note('이달의 무사고', '#c5e1a5', -0.12, 1.12);
  note('LPG 점검 매주 월', '#ffccbc', 0.22, 1.16);
  note('교대 15:30', '#b3e5fc', 0.5, 1.0);
  // The binder, open.
  const book = group(g, -0.3, 0.765, tz + 0.08);
  part(book, box(0.5, 0.02, 0.34), '#1565c0', 0, 0.005, 0);
  picture(book, logTex, 0.46, 0.3, 0, 0.018, 0, '#ffffff', 0, -Math.PI / 2);
  part(book, cyl(0.01, 0.01, 0.32, 8), '#9e9e9e', 0, 0.02, 0, { rx: Math.PI / 2, outline: false });
  rod(g, v3(-0.18, 0.78, tz + 0.18), v3(-0.1, 0.78, tz + 0.12), 0.006, '#263238');
  const bookAt = marker(g, -0.25, 0.79, tz + 0.1);
  // The laptop with the DTG trace, the card reader by it.
  const lap = group(g, 0.4, 0.765, tz + 0.02);
  part(lap, rbox(0.38, 0.018, 0.26, 0.006), '#37474f', 0, 0.009, 0.02);
  part(lap, box(0.34, 0.002, 0.14), '#263238', 0, 0.019, 0.04, { outline: false });
  const lid = group(lap, 0, 0.02, -0.11);
  lid.rotation.x = -0.25;
  part(lid, rbox(0.38, 0.25, 0.012, 0.006), '#37474f', 0, 0.125, 0);
  const lapScreen = picture(lid, tachoTex, 0.34, 0.21, 0, 0.125, 0.007);
  const keysAt = marker(g, 0.4, 0.79, tz + 0.08);
  part(g, rbox(0.1, 0.03, 0.14, 0.01), '#212121', 0.68, 0.78, tz + 0.02);
  part(g, box(0.05, 0.004, 0.08), '#fdd835', 0.68, 0.797, tz + 0.0, { outline: false });
  // The calculator, the pen cup, the lamp.
  part(g, rbox(0.1, 0.015, 0.15, 0.006), '#424242', 0.05, 0.77, tz + 0.12);
  part(g, box(0.07, 0.002, 0.03), '#a5d6a7', 0.05, 0.779, tz + 0.07, { outline: false });
  part(g, cyl(0.04, 0.04, 0.1, 12), '#5d4037', -0.7, 0.81, tz - 0.12);
  for (const [dx, col] of [[-0.01, '#1565c0'], [0.012, '#c62828'], [0, '#212121']] as const) rod(g, v3(-0.7 + dx, 0.82, tz - 0.12), v3(-0.7 + dx * 3, 0.92, tz - 0.12 + dx), 0.005, col);
  part(g, cyl(0.07, 0.08, 0.02, 14), BLACK, -0.68, 0.77, tz + 0.12);
  rod(g, v3(-0.68, 0.78, tz + 0.12), v3(-0.62, 1.05, tz + 0.02), 0.01, BLACK);
  part(g, cyl(0.03, 0.08, 0.09, 14), '#455a64', -0.55, 1.03, tz + 0.06, { rx: 0.5 });
  // The chair.
  const ch = group(g, 0, 0, 0.32);
  part(ch, cyl(0.04, 0.04, 0.4, 8), '#424242', 0, 0.2, 0, { outline: false });
  part(ch, cyl(0.24, 0.24, 0.03, 5), '#424242', 0, 0.03, 0, { outline: false });
  part(ch, rbox(0.46, 0.08, 0.44, 0.04), '#37474f', 0, 0.44, 0);
  part(ch, rbox(0.44, 0.5, 0.06, 0.04), '#37474f', 0, 0.76, 0.22);
  const write = sitAt(g, -0.1, 0.48, 0.32, Math.PI, 'write', bookAt);
  const read = sitAt(g, 0.1, 0.48, 0.32, Math.PI, 'type', keysAt);
  out.work = bookAt;
  out.screen = lapScreen;
  out.spots = { txWriteLog: write, txReadTacho: read, '*': write };
  out.away = (_o, t) => {
    const sat = posed(write, t) || posed(read, t);
    ch.position.x = posed(read, t) ? 0.1 : posed(write, t) ? -0.1 : 0;
    ch.rotation.y = sat ? 0 : 0.25;
  };
}

/**
 * The 유실물 보관함: a grey steel shelf of what passengers left behind, each with its white tag
 * (차량번호, 습득일): umbrellas in a bucket, phones in a tray, wallets in zip bags, a shopping bag, a
 * teddy, a laptop bag, a cap, a parcel; the 유실물 보관함 sign on top, the 습득 대장 on a ledge at
 * the front. Registering one (txLostItem): a wallet in its bag on the ledge, the 대장 written up.
 */
function lostShelf(g: THREE.Group, out: Parameters<Builder>[6]) {
  const UPR = '#78909c';
  const W = 0.9;
  const z0 = -0.25;
  const d = 0.42;
  const lv = [0.12, 0.55, 0.98, 1.41];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.035, 1.8, 0.035), UPR, sx * (W / 2 - 0.02), 0.9, z0 + sz * (d / 2 - 0.02));
  for (const y of lv) part(g, rbox(W, 0.025, d, 0.006), '#cfd8dc', 0, y, z0);
  part(g, box(W - 0.04, 1.7, 0.01), '#eceff1', 0, 0.9, z0 - d / 2 + 0.005, { outline: false });
  part(g, rbox(W, 0.2, 0.04, 0.01), '#5d4037', 0, 1.9, z0 + d / 2 - 0.02);
  label(g, '유실물 보관함', W - 0.06, 0.16, 0, 1.9, z0 + d / 2 + 0.002, '#5d4037', '#ffecb3');
  const tag = (x: number, y: number, z: number) => {
    part(g, box(0.05, 0.03, 0.002), '#ffffff', x, y, z, { outline: false });
    part(g, box(0.004, 0.004, 0.002), '#d32f2f', x - 0.018, y + 0.008, z + 0.0015, { outline: false });
  };
  const fz = z0 + d / 2;
  // Bottom: the umbrella bucket and a parcel.
  part(g, cyl(0.12, 0.1, 0.3, 14), '#455a64', -0.22, lv[0] + 0.16, z0);
  for (const [dx, dz, col] of [[-0.04, 0.02, '#1e88e5'], [0.04, -0.03, '#f06292'], [0.0, 0.05, '#212121'], [0.05, 0.04, '#ffeb3b']] as const) {
    rod(g, v3(-0.22 + dx, lv[0] + 0.15, z0 + dz), v3(-0.22 + dx * 1.6, lv[0] + 0.72, z0 + dz * 1.4), 0.02, col);
    part(g, ring(0.03, 0.006, Math.PI), '#5d4037', -0.22 + dx * 1.6, lv[0] + 0.75, z0 + dz * 1.4, { outline: false });
  }
  part(g, rbox(0.3, 0.22, 0.28, 0.01), '#c99d63', 0.2, lv[0] + 0.125, z0);
  tag(0.2, lv[0] + 0.1, z0 + 0.142);
  tag(-0.12, lv[0] + 0.3, fz - 0.06);
  // Second: the shopping bag, the laptop bag.
  part(g, rbox(0.24, 0.3, 0.12, 0.01), '#fafafa', -0.24, lv[1] + 0.165, z0);
  part(g, box(0.18, 0.06, 0.004), '#43a047', -0.24, lv[1] + 0.2, z0 + 0.062, { outline: false });
  part(g, ring(0.05, 0.006, Math.PI), '#43a047', -0.24, lv[1] + 0.31, z0, { outline: false });
  part(g, rbox(0.34, 0.24, 0.08, 0.02), '#263238', 0.17, lv[1] + 0.135, z0);
  part(g, rbox(0.3, 0.02, 0.02, 0.008), '#37474f', 0.17, lv[1] + 0.27, z0);
  tag(-0.24, lv[1] + 0.1, z0 + 0.064);
  tag(0.12, lv[1] + 0.12, z0 + 0.042);
  // Third: the phones tray, the wallets in their bags, the cap.
  part(g, rbox(0.3, 0.04, 0.22, 0.01), '#1e88e5', -0.22, lv[2] + 0.033, z0);
  for (let k = 0; k < 3; k++) part(g, rbox(0.07, 0.012, 0.14, 0.01), '#212121', -0.31 + k * 0.09, lv[2] + 0.06, z0, { ry: 0.1 * (k - 1) });
  tag(-0.22, lv[2] + 0.04, z0 + 0.112);
  for (let k = 0; k < 2; k++) {
    part(g, box(0.16, 0.02, 0.12), ['#5d4037', '#ad1457'][k], 0.15, lv[2] + 0.025 + k * 0.025, z0 + 0.02);
    part(g, box(0.19, 0.003, 0.15), '#e3f2fd', 0.15, lv[2] + 0.037 + k * 0.025, z0 + 0.02, { outline: false, material: PANE });
  }
  tag(0.15, lv[2] + 0.05, z0 + 0.082);
  part(g, ball(0.08), '#c62828', 0.34, lv[2] + 0.05, z0 - 0.05);
  part(g, box(0.1, 0.01, 0.08), '#c62828', 0.34, lv[2] + 0.02, z0 + 0.04, { outline: false });
  // Top: the teddy.
  const ted = group(g, -0.15, lv[3] + 0.02, z0);
  part(ted, ball(0.09), '#a1887f', 0, 0.09, 0);
  part(ted, ball(0.07), '#a1887f', 0, 0.22, 0.01);
  for (const sx of [-1, 1]) {
    part(ted, ball(0.03), '#8d6e63', sx * 0.055, 0.28, 0.0);
    part(ted, ball(0.035), '#a1887f', sx * 0.08, 0.04, 0.05);
  }
  part(ted, ball(0.02), '#4e342e', 0, 0.21, 0.075, { outline: false });
  tag(-0.15, lv[3] + 0.1, z0 + 0.095);
  part(g, rbox(0.26, 0.16, 0.2, 0.01), '#7e57c2', 0.2, lv[3] + 0.095, z0);
  // The ledge with the 습득 대장 at the front.
  part(g, rbox(0.4, 0.025, 0.24, 0.006), '#b0bec5', -0.15, 1.0, fz + 0.1);
  rod(g, v3(-0.33, 0.99, fz + 0.2), v3(-0.43, 0.75, fz - 0.01), 0.012, UPR);
  const book = group(g, -0.17, 1.016, fz + 0.1);
  part(book, box(0.28, 0.012, 0.2), '#2e7d32', 0, 0, 0);
  part(book, box(0.26, 0.004, 0.18), '#fafafa', 0, 0.008, 0, { outline: false });
  label(book, '유실물 습득 대장', 0.22, 0.03, 0, 0.0105, -0.06, '#fafafa', '#2e7d32').rotation.set(-Math.PI / 2, 0, 0);
  for (let k = 0; k < 4; k++) part(book, box(0.22, 0.002, 0.004), '#a5d6a7', 0, 0.0105, -0.02 + k * 0.025, { outline: false });
  const bookAt = marker(g, -0.17, 1.03, fz + 0.12);
  const wallet = group(g, 0.03, 1.02, fz + 0.12);
  part(wallet, box(0.13, 0.02, 0.1), '#3e2723', 0, 0, 0);
  part(wallet, box(0.16, 0.003, 0.13), '#e3f2fd', 0, 0.012, 0, { outline: false, material: PANE });
  part(wallet, box(0.05, 0.002, 0.03), '#ffffff', 0.04, 0.015, 0.03, { outline: false });
  wallet.visible = false;
  const reg = standAt(g, -0.17, 0.62, Math.PI, 'write', bookAt);
  out.work = bookAt;
  out.spots = { '*': reg };
  out.away = (_o, t) => {
    wallet.visible = posed(reg, t);
  };
}

// ---------------------------------------------------------------------------------------------
// The yard (2026-11-05, the layout audit): paved, fenced, the gateway its whole front.

const NO = { outline: false };
const flat = (g: THREE.Object3D, w: number, d: number, x: number, z: number, color: string) => part(g, box(w, 0.004, d), color, x, 0.013, z, NO);

/**
 * 차고지 울타리·주차선, placed at the yard's north-west tile (its middle is (0.5, 0.5) on the lot): the mesh fence along the back
 * and the west side and the east side down to the office; the gateway open the width of the bays (x 0..17.6), its two posts, the
 * company's name on the east one and the 입구·출구 arrows; the two empty bays of the front row (their cabs out on the road), their
 * lines and numbers; the yellow centre line of the aisle between the rows.
 */
function yard(g: THREE.Group) {
  const at = (x: number, z: number) => [x - 0.5, z - 0.5] as const;
  const [w0, n0] = at(0.15, 0.15);
  const [e0] = at(25.85, 0);
  const [, s0] = at(0, 14.85);
  fenceRun(g, w0, n0, e0, n0);
  fenceRun(g, w0, n0, w0, s0);
  fenceRun(g, e0, n0, e0, at(0, 6)[1]);
  // The gateposts and the name.
  const [gx0] = at(0.3, 0);
  const [gx1] = at(17.65, 0);
  for (const x of [gx0, gx1]) part(g, rbox(0.3, 2.0, 0.3, 0.04), '#cfd8dc', x, 1.0, s0);
  label(g, `${COMPANY} 차고지`, 1.5, 0.32, gx1, 2.25, s0 + 0.17, '#e8873a', '#ffffff');
  label(g, '관계자 외 출입 금지 · 서행', 1.4, 0.14, gx1, 1.75, s0 + 0.17, '#fafafa', '#37474f');
  // The stop line across the gateway, the arrows.
  flat(g, 17.2, 0.1, at(9, 0)[0], s0 - 0.25, PAINT);
  for (const x of [4, 9, 13]) {
    const [ax] = at(x, 0);
    flat(g, 0.14, 0.9, ax, s0 - 1.2, PAINT);
    for (const sx of [-1, 1]) part(g, box(0.36, 0.004, 0.12), PAINT, ax + sx * 0.12, 0.013, s0 - 0.7, { ry: sx * 0.7, outline: false });
  }
  // The aisle between the rows: its yellow centre line.
  flat(g, 17, 0.1, at(8.6, 0)[0], at(0, 6.0)[1], '#f2c230');
  // The empty bays in the front row (x 7 and 15, nose to the street): their lines, the 택시 전용 at their head, a wheel stop.
  for (const bx of [7, 15]) {
    const cx = bx + 0.28;
    for (const s of [-1, 1]) flat(g, 0.07, 4.1, at(cx + s * 0.98, 0)[0], at(0, 9)[1], PAINT);
    flat(g, 2.0, 0.07, at(cx, 0)[0], at(0, 6.75)[1], PAINT);
    const l = label(g, '택시 전용', 0.9, 0.22, at(cx, 0)[0], 0.016, at(0, 7.1)[1], ASPHALT, '#f2c230');
    l.rotation.set(-Math.PI / 2, 0, 0);
    for (const s of [-1, 1]) part(g, rbox(0.5, 0.08, 0.12, 0.03), '#ffd54f', at(cx + s * 0.45, 0)[0], 0.04, at(0, 7.0)[1]);
  }
}

/** 정비·세차장 지붕, placed at the north-west tile of the 정비 corner (x 18..25, y 0..5): four columns and a flat roof high over the lift, its sign. */
function canopy(g: THREE.Group) {
  const W = 7.4;
  const D = 5.2;
  const cx = -0.5 + 0.2 + W / 2;
  const cz = -0.5 + 0.2 + D / 2;
  const h = 4.4;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.2, h, 0.2), '#b0bec5', cx + sx * (W / 2 - 0.15), h / 2, cz + sz * (D / 2 - 0.15));
  part(g, rbox(W, 0.24, D, 0.05), '#eceff1', cx, h + 0.12, cz);
  part(g, box(W + 0.02, 0.3, 0.04), '#e8873a', cx, h + 0.12, cz + D / 2 + 0.01, NO);
  label(g, `${COMPANY} 정비 · 세차장`, 2.4, 0.24, cx, h + 0.12, cz + D / 2 + 0.035, '#e8873a', '#ffffff');
  // The bay's lines on the concrete, and the 화기 엄금 by the lift.
  flat(g, 0.1, D - 0.6, cx - W / 2 + 0.6, cz, '#f2c230');
  flat(g, 0.1, D - 0.6, cx + W / 2 - 0.6, cz, '#f2c230');
  label(g, '화기 엄금 · 리프트 작동 중 접근 금지', 1.6, 0.16, cx, h - 0.25, cz + D / 2 - 0.12, '#c62828', '#ffffff');
}

/** 택시 승강장: the sign on its pole at the kerb (yellow, TAXI), the yellow kerb line where cabs pull in to pick up. */
function taxiRank(g: THREE.Group) {
  part(g, cyl(0.04, 0.04, 2.6, 10), '#90a4ae', 0, 1.3, 0.2);
  part(g, rbox(0.7, 0.5, 0.05, 0.03), '#f9a825', 0, 2.35, 0.2);
  label(g, '택시 승강장', 0.6, 0.16, 0, 2.43, 0.23, '#f9a825', '#212121');
  label(g, 'TAXI', 0.5, 0.16, 0, 2.25, 0.23, '#212121', '#f9a825');
  label(g, '택시 승강장', 0.6, 0.16, 0, 2.43, 0.17, '#f9a825', '#212121', Math.PI);
  label(g, 'TAXI', 0.5, 0.16, 0, 2.25, 0.17, '#212121', '#f9a825', Math.PI);
  flat(g, 3, 0.1, 0, -0.45, '#f2c230');
}

export const BUILDERS: Record<string, Builder> = {
  txYard(g) {
    yard(g);
  },
  txCanopy(g) {
    canopy(g);
  },
  txTaxiRank(g) {
    taxiRank(g);
  },
  /** The taxi (택시): see taxi(). */
  taxiCab(g, _W, _D, _c, _def, _ctx, out) {
    taxi(g, out);
  },
  /** The call terminal (콜 단말기): see terminal(). */
  navTerminal(g, _W, _D, _c, _def, _ctx, out) {
    terminal(g, out);
  },
  /** The 배차실 창구: see dispatchWindow(). */
  txDispatchWindow(g, _W, _D, _c, _def, _ctx, out) {
    dispatchWindow(g, out);
  },
  /** The LPG 충전기: see lpgPump(). */
  txLpgPump(g, _W, _D, _c, _def, _ctx, out) {
    lpgPump(g, out);
  },
  /** The 커피 자판기: see vending(). */
  txVending(g, _W, _D, _c, _def, _ctx, out) {
    vending(g, out);
  },
  /** The 운행일지 desk: see logDesk(). */
  txLogDesk(g, _W, _D, _c, _def, _ctx, out) {
    logDesk(g, out);
  },
  /** The 유실물 보관함: see lostShelf(). */
  txLostShelf(g, _W, _D, _c, _def, _ctx, out) {
    lostShelf(g, out);
  },
};
