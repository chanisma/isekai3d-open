import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { pavementSign } from './dentist';
import { BLACK, CHROME, STEEL, glass, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';
import {
  BADUK_AT,
  GREET_AT,
  PIN_AT,
  SERVE_AT,
  SHAKE_AT,
  STOCK_AT,
  amountOf,
  badukBeat,
  badukPoint,
  badukStoneAt,
  counselBeat,
  donorBeat,
  greetBeat,
  ladleOf,
  leafletOut,
  noticeUp,
  pinBeat,
  serveBeat,
  stockBeat,
  stockBox,
  stoneInHand,
  tagOut,
  trayOf,
  tutorBeat,
  welfareKey,
  welfarePhase,
  type Loc,
} from './socialWorkerMotion';

/**
 * The 종합사회복지관 drawn as itself (2026-10-27 workplace pipeline, at the user's request): warm and
 * respectful, a place people come to for help and are welcomed in. The case desk with a visitor's
 * chair across it, where an 이용자 sits while the case is talked through (the social worker listens,
 * lays a hand on the table by theirs, writes up the 상담 일지, hands over a leaflet), the tissues and
 * the brochures within their reach; the donation shelves stacked with 햅쌀 sacks, 라면 boxes, 김장
 * 김치 and tins, a box carried up from the floor and ticked off in the 입고 대장 (a donor's hand shaken
 * over a 협약서); the 경로식당's serving counter, 미역국 ladled into the tray of the senior at the
 * front of the queue; the centre's van, which drives off on a home visit and backs in again. And what
 * it was missing (workFurniture/socialWorker.ts): the 프로그램 안내 board, the seniors' 바둑 · 장기
 * corner, the after-school 공부방 table and the volunteers' sign-in stand.
 *
 * The centre (새솔종합사회복지관), its people and its donors are made up. The people drawn in (the
 * 이용자, the seniors in the queue, the children, a volunteer, a donor) show only while the piece is in
 * use, and only for the use they belong to (activity.ts spotPose marks the spot that's used).
 */

const CENTRE = '새솔종합사회복지관';
const GREEN = '#2e7d32';
const LEAF = '#66bb6a';
const OAK = '#c9a27a';
const OAK_DARK = '#9c7653';
const PAPER = '#fbfaf5';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------------------------
// Small parts.

/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
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
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
const tmp = new THREE.Vector3();
const phaseOf = (s: Spot) => welfarePhase(s.at.getWorldPosition(tmp));
/** A place in a spot's frame, in the frame the spot's marker hangs in (the piece's). */
function inFrame(s: Spot, p: Loc, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(p[0], p[1], p[2]).applyAxisAngle(UP, s.at.rotation.y).add(s.at.position);
}
/** A group in `parent` standing where a spot's marker is, turned as it is (for what the hands hold, shown only in use). */
function frameOf(parent: THREE.Object3D, s: Spot): THREE.Group {
  const f = group(parent, s.at.position.x, s.at.position.y, s.at.position.z, s.at.rotation.y);
  return f;
}
const setLoc = (o: THREE.Object3D, p: Loc, dx = 0, dy = 0, dz = 0) => o.position.set(p[0] + dx, p[1] + dy, p[2] + dz);

/** A point in a drawn person's own frame (x to their left, y up, z ahead), in the frame they stand in. */
const on = (f: Figure, x: number, y: number, z: number) => v3(x, y, z).multiplyScalar(f.root.scale.x).applyAxisAngle(UP, f.root.rotation.y).add(f.root.position);

/** A sheet lying flat on a top, readable from +z (turned `ry` about the vertical: π to read it from -z). */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A pen lying on a top. */
const pen = (g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#1a237e') => part(g, cyl(0.0045, 0.0045, 0.14, 6), color, x, y + 0.005, z, { rz: Math.PI / 2, ry, outline: false });

/** A cylinder stretched between two points each frame (a drawn person's arm, a ladle's handle). */
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

/** A swivel office chair, built facing +z: five-star base, gas lift, the seat's top at 0.48, the back behind. */
function swivel(g: THREE.Object3D, x: number, z: number, ry: number, color: string): THREE.Group {
  const c = group(g, x, 0, z, ry);
  starBase(c, 0, 0, 0.26, BLACK);
  part(c, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.48, 0.09, 0.46, 0.04), color, 0, 0.435, 0);
  part(c, rbox(0.46, 0.5, 0.08, 0.05), color, 0, 0.76, -0.23, { rx: -0.08 });
  part(c, rbox(0.38, 0.34, 0.02, 0.04), shade(color, 1.2), 0, 0.76, -0.185, { rx: -0.08, outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.05, 0.035, 0.26, 0.012), BLACK, sx * 0.26, 0.66, 0);
    part(c, box(0.025, 0.17, 0.025), BLACK, sx * 0.26, 0.565, 0.03, { outline: false });
  }
  return c;
}
/** A visitor's chair (wooden frame, a padded seat and back), built facing +z, the seat's top at `h`. */
function guestChair(g: THREE.Object3D, x: number, z: number, ry: number, fabric: string, h = 0.46, wood = OAK_DARK): THREE.Group {
  const c = group(g, x, 0, z, ry);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) part(c, cyl(0.018, 0.015, h - 0.04, 8), wood, sx * 0.19, (h - 0.04) / 2, sz * 0.18, { outline: false });
  part(c, rbox(0.44, 0.04, 0.42, 0.015), wood, 0, h - 0.04, 0);
  part(c, rbox(0.41, 0.05, 0.39, 0.03), fabric, 0, h - 0.005, 0.005);
  for (const sx of [-1, 1]) part(c, cyl(0.016, 0.016, 0.42, 8), wood, sx * 0.19, h + 0.19, -0.19, { outline: false });
  part(c, rbox(0.4, 0.26, 0.05, 0.03), fabric, 0, h + 0.24, -0.2, { rx: -0.08 });
  return c;
}

// ---------------------------------------------------------------------------------------------
// People drawn in: the 이용자 across the desk, the seniors at lunch and at 바둑, children, a volunteer, a donor.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
  shoes?: string;
  hairdo: 'perm' | 'grey' | 'short' | 'pony' | 'kid' | 'pigtails';
  cap?: string;
  glasses?: boolean;
  /** A cardigan's buttons down the front. */
  cardigan?: boolean;
  /** A vest over the top, and what's printed on its front. */
  vest?: string;
  vestText?: string;
  apron?: string;
}
const SKIN = '#f1c9a5';
const LOOKS = {
  grandmaA: { top: '#b5838d', bottom: '#5d4e60', hair: '#6d5a4b', hairdo: 'perm', cardigan: true, shoes: '#4e342e' } as Look,
  grandmaB: { top: '#7e9a7a', bottom: '#4a4a52', hair: '#d8d4ce', hairdo: 'perm', cardigan: true, glasses: true, shoes: '#3e2723' } as Look,
  grandmaC: { top: '#c9a66b', bottom: '#5a4a3a', hair: '#3b2f2a', hairdo: 'perm', shoes: '#5d4037' } as Look,
  grandpaA: { top: '#8d7b68', bottom: '#4b4f58', hair: '#cfcfcf', hairdo: 'grey', cap: '#37474f', glasses: true, shoes: '#2b2b30' } as Look,
  grandpaB: { top: '#5d6d7e', bottom: '#3e3e46', hair: '#e0e0e0', hairdo: 'grey', vest: '#6d4c41', shoes: '#2b2b30' } as Look,
  volunteer: { top: '#f5f5f5', bottom: '#37474f', hair: '#2b1b10', hairdo: 'pony', vest: LEAF, vestText: '자원봉사', shoes: '#eceff1' } as Look,
  baker: { top: '#fafafa', bottom: '#4e4e56', hair: '#1a1a1a', hairdo: 'short', apron: '#8d6e63', shoes: '#3e2723' } as Look,
  kidA: { top: '#ffca28', bottom: '#1e88e5', hair: '#1a1a1a', hairdo: 'kid', shoes: '#e53935' } as Look,
  kidB: { top: '#f48fb1', bottom: '#5c6bc0', hair: '#2b1b10', hairdo: 'pigtails', shoes: '#fafafa' } as Look,
};
const GRANDMAS = [LOOKS.grandmaA, LOOKS.grandpaA, LOOKS.grandmaB, LOOKS.grandpaB];

interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
/**
 * Someone drawn in, their feet (or the seat under them) at (x, z) in `parent`, turned `ry` (0 faces
 * +z): stood, or sat on a seat whose top is `seat` high (in their own size); `k` scales them (a
 * child). Their hands rest in the lap or at the sides until put somewhere.
 */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat?: number, k = 1): Figure {
  const root = group(parent, x, 0, z, ry);
  root.scale.setScalar(k);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#2b2b30';
  const sat = seat !== undefined;
  const sh = seat ?? 0;
  const shoulderY = sat ? sh + 0.53 : 1.31;
  const torsoY = sat ? sh + 0.33 : 1.11;
  if (sat) {
    for (const sx of [-1, 1]) {
      const hip = v3(sx * 0.09, sh + 0.07, -0.03);
      const knee = v3(sx * 0.1, sh + 0.06, 0.36);
      const ankle = v3(sx * 0.1, Math.max(0.07, sh + 0.06 - 0.4), 0.4);
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
  if (look.cardigan) for (let i = 0; i < 4; i++) part(root, ball(0.011), '#f5f0e6', 0, torsoY + 0.14 - i * 0.09, tz + 0.106, { outline: false });
  if (look.vest) {
    part(root, rbox(0.36, 0.4, 0.23, 0.08), look.vest, 0, torsoY - 0.02, tz);
    part(root, box(0.08, 0.16, 0.235), look.top, 0, torsoY + 0.14, tz, { outline: false });
    if (look.vestText) label(root, look.vestText, 0.2, 0.06, 0, torsoY - 0.06, tz + 0.117, look.vest, '#ffffff');
  }
  if (look.apron) {
    part(root, rbox(0.3, 0.5, 0.02, 0.01), look.apron, 0, torsoY - 0.12, tz + 0.112);
    label(root, '새솔제과', 0.16, 0.05, 0, torsoY - 0.02, tz + 0.124, look.apron, '#fff3e0');
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'perm': {
      // The 뽀글 perm: tight curls all over.
      part(head, ball(0.118), look.hair, 0, 0.035, -0.025);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        part(head, ball(0.045), look.hair, Math.cos(a) * 0.08, 0.08 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.07, { outline: false });
      }
      part(head, ball(0.05), look.hair, 0, 0.12, -0.01, { outline: false });
      break;
    }
    case 'grey':
      part(head, ball(0.117), look.hair, 0, 0.02, -0.035);
      part(head, ball(0.1), skin, 0, 0.05, 0.02, { outline: false });
      break;
    case 'pony':
      part(head, ball(0.12), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.06, 0.06, 0.02), look.hair, 0, 0.075, 0.07, { rx: -0.3 });
      part(head, rbox(0.06, 0.2, 0.06, 0.03), look.hair, 0, -0.06, -0.14, { rx: 0.3 });
      break;
    case 'kid':
      part(head, ball(0.12), look.hair, 0, 0.035, -0.02);
      part(head, rbox(0.22, 0.05, 0.05, 0.02), look.hair, 0, 0.065, 0.085);
      break;
    case 'pigtails':
      part(head, ball(0.12), look.hair, 0, 0.035, -0.025);
      for (const sx of [-1, 1]) part(head, ball(0.045), look.hair, sx * 0.12, -0.01, -0.03);
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.cap) {
    part(head, new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), look.cap, 0, 0.035, -0.01, { outline: false });
    part(head, box(0.15, 0.01, 0.09), look.cap, 0, 0.04, 0.11, { rx: -0.1, outline: false });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#5d4037', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#5d4037', 0, 0.002, 0.112, { outline: false });
  }
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = sat ? v3(sx * 0.11, sh + 0.16, 0.24) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, look.top);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y).divideScalar(k);
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
  return { root, head, armL, armR };
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the papers and the signs.

const FONTLESS = (c: CanvasRenderingContext2D, w: number, h: number, bg: string) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
};
/** A heart drawn on a canvas (the font's heart would be an emoji). */
function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  c.fill();
}
/** Handwriting: a few wavy lines of ink. */
function scribble(c: CanvasRenderingContext2D, x: number, y: number, w: number, r: () => number, color = '#37474f') {
  c.strokeStyle = color;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(x, y);
  for (let i = 0; i < w; i += 4) c.lineTo(x + i, y + Math.sin(i * 0.7 + r() * 6) * 1.6);
  c.stroke();
}
const paintCaseScreen: Paint = (c) => {
  FONTLESS(c, 320, 200, '#f4f7f4');
  c.fillStyle = GREEN;
  c.fillRect(0, 0, 320, 26);
  text(c, '사례관리 시스템 · 상담', 10, 13, 12, '#ffffff');
  text(c, '2026.10.27', 310, 13, 10, '#c8e6c9', 'right', false);
  const rows: Array<[string, string]> = [['이용자', '김순자 님 (78) · 독거'], ['주소', '새솔동 · 2층 단독'], ['욕구', '주거 · 건강 · 정서 지원'], ['연계', '도시락 배달 · 방문 간호'], ['다음 상담', '11.03 (월) 가정 방문']];
  rows.forEach(([k, v], i) => {
    text(c, k, 12, 44 + i * 26, 11, '#78909c', 'left', false);
    text(c, v, 84, 44 + i * 26, 12, '#263238');
  });
  c.fillStyle = '#e8f5e9';
  c.fillRect(224, 36, 86, 92);
  text(c, '서비스 계획', 267, 48, 10, GREEN, 'center');
  ['✓ 기초연금 신청', '✓ 반찬 지원', '· 보일러 수리', '· 말벗 봉사'].forEach((s, i) => text(c, s, 230, 66 + i * 16, 9, '#37474f', 'left', false));
  c.fillStyle = '#43a047';
  c.fillRect(224, 160, 86, 26);
  text(c, '상담 기록 저장', 267, 173, 10, '#ffffff', 'center');
};
const paintCaseNote: Paint = (c) => {
  FONTLESS(c, 128, 170, PAPER);
  text(c, '상담 일지', 64, 12, 11, GREEN, 'center');
  c.fillStyle = '#c8e6c9';
  c.fillRect(6, 22, 116, 1);
  const r = seeded(7);
  for (let i = 0; i < 9; i++) {
    c.fillStyle = '#e0e0e0';
    c.fillRect(8, 34 + i * 14, 112, 1);
    if (i < 7) scribble(c, 10, 30 + i * 14, 60 + r() * 45, r, '#1a237e');
  }
};
function leafletTex(title: string, color: string): THREE.Texture {
  return painted(`swLeaflet|${title}`, 96, 128, (c) => {
    FONTLESS(c, 96, 128, '#ffffff');
    c.fillStyle = color;
    c.fillRect(0, 0, 96, 34);
    text(c, title, 48, 17, title.length > 6 ? 10 : 12, '#ffffff', 'center');
    c.fillStyle = shade(color, 1.3);
    c.beginPath();
    c.arc(48, 62, 16, 0, Math.PI * 2);
    c.fill();
    heart(c, 48, 63, 9, '#ffffff');
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#bdbdbd';
      c.fillRect(12, 88 + i * 9, 72 - (i % 2) * 18, 3);
    }
    text(c, CENTRE, 48, 122, 7, '#757575', 'center', false);
  });
}
const LEAFLETS: Array<[string, string]> = [['기초생활보장', '#43a047'], ['긴급복지 지원', '#ef6c00'], ['노인맞춤돌봄', '#1e88e5']];

const paintMenu: Paint = (c) => {
  FONTLESS(c, 220, 120, '#1b3a2a');
  c.strokeStyle = '#c8b273';
  c.lineWidth = 3;
  c.strokeRect(5, 5, 210, 110);
  text(c, '오늘의 메뉴', 110, 22, 16, '#fff3c4', 'center');
  ['쌀밥 · 미역국', '고등어조림 · 시금치나물', '배추김치 · 요구르트'].forEach((s, i) => text(c, s, 110, 50 + i * 21, 13, '#ffffff', 'center', false));
  text(c, '맛있게 드세요', 110, 108, 9, '#a5d6a7', 'center', false);
};

const POSTERS: Array<{ title: string; sub: string; color: string; icon: string }> = [
  { title: '어르신 한글 교실', sub: '월 · 수 오전 10시', color: '#8e24aa', icon: '가' },
  { title: '건강 체조 교실', sub: '화 · 목 오후 2시', color: '#00897b', icon: '♪' },
  { title: '방과후 공부방', sub: '평일 14:00 ~ 18:00', color: '#f9a825', icon: '✎' },
  { title: '경로식당', sub: '무료 급식 11:30 ~ 13:00', color: '#e64a19', icon: '♨' },
  { title: '이 · 미용 봉사', sub: '매월 둘째 화요일', color: '#5c6bc0', icon: '✂' },
  { title: '자원봉사자 모집', sub: '함께해요! 상담실 문의', color: GREEN, icon: '' },
];
function posterTex(i: number): THREE.Texture {
  const p = POSTERS[i % POSTERS.length];
  return painted(`swPoster|${i}`, 104, 140, (c) => {
    FONTLESS(c, 104, 140, '#ffffff');
    c.fillStyle = p.color;
    c.fillRect(0, 0, 104, 44);
    text(c, p.title, 52, 22, p.title.length > 6 ? 11 : 13, '#ffffff', 'center');
    c.fillStyle = shade(p.color, 1.25);
    c.beginPath();
    c.arc(52, 78, 20, 0, Math.PI * 2);
    c.fill();
    if (p.icon) text(c, p.icon, 52, 79, 20, '#ffffff', 'center');
    else heart(c, 52, 79, 11, '#ffffff');
    text(c, p.sub, 52, 114, 9, '#424242', 'center');
    text(c, CENTRE, 52, 131, 7, '#9e9e9e', 'center', false);
  });
}
const paintCalendar: Paint = (c) => {
  FONTLESS(c, 160, 130, '#ffffff');
  c.fillStyle = GREEN;
  c.fillRect(0, 0, 160, 22);
  text(c, '11월 프로그램 일정', 80, 11, 11, '#ffffff', 'center');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  days.forEach((d, i) => text(c, d, 12 + i * 22, 31, 8, i === 0 ? '#e53935' : i === 6 ? '#1e88e5' : '#616161', 'center'));
  for (let d = 1; d <= 30; d++) {
    const col = (d + 5) % 7;
    const row = Math.floor((d + 5) / 7);
    const x = 12 + col * 22;
    const y = 44 + row * 16;
    if (d === 22) {
      c.fillStyle = '#ffcdd2';
      c.fillRect(x - 9, y - 7, 18, 14);
    } else if (col === 1 || col === 3) {
      c.fillStyle = '#e1bee7';
      c.fillRect(x - 9, y - 7, 18, 14);
    }
    text(c, String(d), x, y, 8, col === 0 ? '#e53935' : '#424242', 'center', false);
  }
};
const paintNewNotice: Paint = (c) => {
  FONTLESS(c, 120, 160, '#fffde7');
  c.fillStyle = '#c62828';
  c.fillRect(0, 0, 120, 40);
  text(c, '김장 나눔 행사', 60, 14, 13, '#ffffff', 'center');
  text(c, '자원봉사자 모집', 60, 31, 10, '#ffebee', 'center');
  // A cabbage.
  c.fillStyle = '#9ccc65';
  c.beginPath();
  c.ellipse(60, 78, 22, 28, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f1f8e9';
  c.beginPath();
  c.ellipse(60, 86, 12, 18, 0, 0, Math.PI * 2);
  c.fill();
  text(c, '11.22 (토) 오전 10시', 60, 122, 9, '#37474f', 'center');
  text(c, '복지관 앞마당', 60, 137, 9, '#37474f', 'center', false);
  text(c, '함께 담가요!', 60, 152, 8, '#c62828', 'center', false);
};
const paintBaduk: Paint = (c) => {
  FONTLESS(c, 256, 256, '#e2b866');
  const r = seeded(3);
  // The grain.
  for (let i = 0; i < 40; i++) {
    c.strokeStyle = `rgba(150,100,40,${0.05 + r() * 0.08})`;
    c.lineWidth = 1 + r() * 2;
    c.beginPath();
    const y = r() * 256;
    c.moveTo(0, y);
    c.bezierCurveTo(80, y + (r() - 0.5) * 10, 170, y + (r() - 0.5) * 10, 256, y + (r() - 0.5) * 6);
    c.stroke();
  }
  // The margin that puts the lines BADUK_AT.pitch apart on a 0.47 m board.
  const m = 12.8;
  const step = (256 - 2 * m) / 18;
  c.strokeStyle = '#3e2a14';
  c.lineWidth = 1.2;
  for (let i = 0; i < 19; i++) {
    c.beginPath();
    c.moveTo(m, m + i * step);
    c.lineTo(256 - m, m + i * step);
    c.moveTo(m + i * step, m);
    c.lineTo(m + i * step, 256 - m);
    c.stroke();
  }
  c.fillStyle = '#3e2a14';
  for (const a of [3, 9, 15]) for (const b of [3, 9, 15]) {
    c.beginPath();
    c.arc(m + a * step, m + b * step, 2.6, 0, Math.PI * 2);
    c.fill();
  }
};
const paintJanggi: Paint = (c) => {
  FONTLESS(c, 200, 220, '#e9c98a');
  const mx = 14;
  const my = 14;
  const sx = (200 - 2 * mx) / 8;
  const sy = (220 - 2 * my) / 9;
  c.strokeStyle = '#4e342e';
  c.lineWidth = 1.2;
  for (let i = 0; i < 10; i++) {
    c.beginPath();
    c.moveTo(mx, my + i * sy);
    c.lineTo(200 - mx, my + i * sy);
    c.stroke();
  }
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.moveTo(mx + i * sx, my);
    c.lineTo(mx + i * sx, 220 - my);
    c.stroke();
  }
  // The palaces' diagonals.
  for (const y0 of [0, 7]) {
    c.beginPath();
    c.moveTo(mx + 3 * sx, my + y0 * sy);
    c.lineTo(mx + 5 * sx, my + (y0 + 2) * sy);
    c.moveTo(mx + 5 * sx, my + y0 * sy);
    c.lineTo(mx + 3 * sx, my + (y0 + 2) * sy);
    c.stroke();
  }
};
function workbookTex(i: number): THREE.Texture {
  return painted(`swWorkbook|${i}`, 160, 110, (c) => {
    FONTLESS(c, 160, 110, PAPER);
    c.fillStyle = '#d7ccc8';
    c.fillRect(79, 0, 2, 110);
    text(c, i ? '국어 받아쓰기' : '수학 익힘책 3-2', 40, 10, 8, '#1565c0', 'center');
    const probs = i ? ['1. 할머니께서', '2. 맛있는 김치', '3. 깨끗한 교실', '4. 즐거운 소풍'] : ['24 × 3 = 72', '45 ÷ 5 = 9', '108 + 96 = 204', '312 − 87 = ?'];
    probs.forEach((s, k) => text(c, s, 6, 28 + k * 20, 9, '#37474f', 'left', false));
    const r = seeded(11 + i);
    for (let k = 0; k < 4; k++) scribble(c, 86, 26 + k * 20, 50 + r() * 15, r, '#455a64');
    c.strokeStyle = '#e53935';
    c.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(66, 28 + k * 20, 7, 0, Math.PI * 2);
      c.stroke();
    }
  });
}
const paintSignIn: Paint = (c) => {
  FONTLESS(c, 200, 140, PAPER);
  c.fillStyle = LEAF;
  c.fillRect(0, 0, 200, 20);
  text(c, '자원봉사 활동 일지', 100, 10, 11, '#ffffff', 'center');
  const head = ['이름', '활동', '시간', '서명'];
  const xs = [8, 58, 122, 162];
  head.forEach((h, i) => text(c, h, xs[i], 30, 9, '#2e7d32', 'left'));
  const rows: Array<[string, string, string]> = [['박서준', '경로식당 배식', '10~13'], ['이하늘', '공부방 학습', '14~17'], ['최민아', '말벗 방문', '13~15'], ['', '', '']];
  const r = seeded(5);
  rows.forEach(([n, a, h], i) => {
    const y = 48 + i * 22;
    c.fillStyle = '#e0e0e0';
    c.fillRect(4, y + 10, 192, 1);
    text(c, n, xs[0], y, 9, '#263238', 'left', false);
    text(c, a, xs[1], y, 8, '#263238', 'left', false);
    text(c, h, xs[2], y, 8, '#263238', 'left', false);
    if (n) scribble(c, xs[3], y, 28, r, '#1a237e');
  });
};
const paintLedger: Paint = (c) => {
  FONTLESS(c, 100, 130, PAPER);
  text(c, '후원 물품 입고 대장', 50, 10, 8, GREEN, 'center');
  const items = ['햅쌀 10kg × 12', '라면 × 20박스', '김장 김치 × 15', '참치 캔 × 40', '화장지 × 10'];
  items.forEach((s, i) => {
    text(c, s, 6, 28 + i * 18, 8, '#37474f', 'left', false);
    text(c, '✓', 92, 28 + i * 18, 9, '#e53935', 'center');
  });
};

// ---------------------------------------------------------------------------------------------
// Things on the shelves and in the hands.

/** A 10 kg rice sack lying (its middle at x, y, z), its print to +z. */
function riceSack(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const s = group(g, x, y, z, ry);
  part(s, rbox(0.36, 0.12, 0.27, 0.05), '#f3efe4', 0, 0, 0);
  part(s, box(0.3, 0.005, 0.2), '#e8e2d2', 0, 0.06, 0, { outline: false });
  label(s, '햅쌀 10kg', 0.24, 0.07, 0, 0.0, 0.136, '#f3efe4', '#2e7d32');
  return s;
}
/** A box of 라면 (its middle), its print to +z. */
function ramenBox(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, w = 0.34, h = 0.22, d = 0.28): THREE.Group {
  const b = group(g, x, y, z, ry);
  part(b, box(w, h, d), '#d9b48a', 0, 0, 0);
  part(b, box(w + 0.002, 0.02, d + 0.002), '#c8a070', 0, h / 2 - 0.03, 0, { outline: false });
  label(b, '라면', w * 0.5, h * 0.35, -w * 0.12, 0.0, d / 2 + 0.002, '#e53935', '#ffffff');
  label(b, '사랑 나눔', w * 0.32, h * 0.18, w * 0.27, -h * 0.25, d / 2 + 0.002, '#d9b48a', '#6d4c41');
  return b;
}
/** A 김치통 of 김장 김치 (its foot at y), the red of the kimchi through its sides, a green lid. */
function kimchiTub(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, rbox(0.22, 0.18, 0.28, 0.03), '#c62828', x, y + 0.085, z);
  glass(g, rbox(0.24, 0.2, 0.3, 0.035), x, y + 0.1, z);
  part(g, rbox(0.25, 0.03, 0.31, 0.012), '#43a047', x, y + 0.215, z);
  label(g, '김장 김치', 0.17, 0.045, x, y + 0.1, z + 0.152, '#ffffff', '#c62828');
}
/** A 6-pack of tins. */
function tins(g: THREE.Object3D, x: number, y: number, z: number, color: string) {
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) {
      part(g, cyl(0.04, 0.04, 0.05, 14), color, x + (i - 1) * 0.085, y + 0.025, z + (j - 0.5) * 0.085, { outline: j === 1 });
      part(g, cyl(0.036, 0.036, 0.003, 14), STEEL, x + (i - 1) * 0.085, y + 0.051, z + (j - 0.5) * 0.085, { outline: false });
    }
}
/** A 30-roll pack of toilet paper. */
function tissuePack(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, rbox(0.32, 0.24, 0.24, 0.04), '#f5f7fa', x, y + 0.12, z);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) part(g, ring(0.04, 0.008), '#cfd8dc', x + (i - 1) * 0.1, y + 0.07 + j * 0.1, z + 0.121, { outline: false });
  label(g, '화장지 30롤', 0.2, 0.04, x, y + 0.215, z + 0.122, '#1e88e5', '#ffffff');
}
/** A stainless 식판 tray (its middle at the origin of the group): rice, three 반찬, the soup bowl at the back right. */
function tray(g: THREE.Object3D, x: number, y: number, z: number): { root: THREE.Group; soup: THREE.Mesh } {
  const t = group(g, x, y, z);
  part(t, rbox(0.36, 0.02, 0.27, 0.01), '#d6dbdf', 0, 0, 0);
  for (const [cx, cz, w, d] of [[-0.11, -0.07, 0.1, 0.08], [0.0, -0.07, 0.1, 0.08], [0.11, -0.07, 0.1, 0.08], [-0.08, 0.06, 0.16, 0.11]] as const) part(t, box(w, 0.004, d), '#b0b8bf', cx, 0.011, cz, { outline: false });
  part(t, ball(0.045), '#fffdf7', -0.08, 0.012, 0.06, { outline: false }).scale.set(1.3, 0.5, 1);
  part(t, box(0.07, 0.015, 0.05), '#c62828', -0.11, 0.018, -0.07, { outline: false });
  part(t, box(0.07, 0.012, 0.05), '#558b2f', 0.0, 0.017, -0.07, { outline: false });
  part(t, rbox(0.075, 0.02, 0.045, 0.01), '#8d5a2b', 0.11, 0.02, -0.07, { outline: false });
  // The soup bowl, stood at the back right; its soup shown once it's poured.
  part(t, cyl(0.055, 0.04, 0.05, 16), '#eceff1', 0.08, 0.035, 0.04);
  const soup = part(t, cyl(0.05, 0.05, 0.004, 16), '#6d5a3a', 0.08, 0.056, 0.04, { outline: false });
  part(t, box(0.02, 0.006, 0.01), '#2e5d2e', 0.07, 0.06, 0.04, { outline: false });
  return { root: t, soup };
}
/** A ladle, from where it's held (the origin) down its handle to the bowl at `len`. */
function ladle(g: THREE.Object3D): { root: THREE.Group; len: (l: number) => void } {
  const root = group(g);
  const handle = part(root, cyl(0.007, 0.007, 1, 8), CHROME, 0, -0.5, 0, { outline: false });
  const bowl = part(root, new THREE.SphereGeometry(0.045, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), CHROME, 0, -1, 0);
  return {
    root,
    len: (l) => {
      handle.scale.y = l;
      handle.position.y = -l / 2;
      bowl.position.y = -l;
    },
  };
}

let deskCount = 0;
let shelfCount = 0;
const NAMES = ['조하나', '민경수', '윤지아', '이준호'];

export const BUILDERS: Record<string, Builder> = {
  // The centre's pole sign on the pavement (2026-11-05, the layout audit).
  swCentreSign: pavementSign('swCentreSign', '🤝', '새솔|종합사회복지관', ['경로식당 · 상담실 1층', '프로그램실 · 공부방 2층', '평일 9:00 ~ 18:00'], '#2e7d32', 2.1),
  /**
   * The case desk (사례관리 책상): an oak desk with the social worker's swivel chair behind it and a
   * padded visitor's chair across it, so the 이용자 sits facing them. On it: the case on the monitor
   * (사례관리 시스템: the person, their needs, the services linked, the next visit), the 상담 일지 and
   * a pen, the case files, a mug; on the visitor's side the nameplate, a box of tissues and the
   * brochure stand (기초생활보장 · 긴급복지 · 노인맞춤돌봄) within their reach. Counselling a case
   * (manageCase): sat behind it with the 이용자 drawn in across — listening with the hands folded,
   * a hand laid on the table by theirs, the note written, a leaflet held out and taken. The case note:
   * written sat. The old case files: read. The service plan (and anything else): typed at the monitor.
   */
  caseDesk(g, _W, _D, _c, _def, _ctx, out) {
    const n = deskCount++;
    const top = 0.74;
    const z0 = -0.14;
    const z1 = 0.3;
    const zc = (z0 + z1) / 2;
    const hw = 0.47;
    part(g, rbox(hw * 2, 0.035, z1 - z0, 0.012), OAK, 0, top - 0.0175, zc);
    part(g, box(hw * 2 - 0.02, 0.01, 0.004), OAK_DARK, 0, top - 0.03, z1 + 0.001, { outline: false });
    // The drawer pedestal at the worker's left, its drawers to them; a slab leg at the right.
    part(g, rbox(0.25, top - 0.05, z1 - z0 - 0.04, 0.012), OAK_DARK, 0.335, (top - 0.05) / 2, zc);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.22, 0.004, 0.004), '#5d4037', 0.335, 0.24 + i * 0.16, z0 + 0.018, { outline: false });
      part(g, box(0.07, 0.012, 0.012), CHROME, 0.335, 0.31 + i * 0.16 - 0.04, z0 + 0.012, { outline: false });
    }
    part(g, rbox(0.035, top - 0.035, z1 - z0 - 0.04, 0.01), OAK_DARK, -hw + 0.03, (top - 0.035) / 2, zc);
    part(g, box(0.62, 0.2, 0.015), OAK_DARK, -0.06, 0.55, zc, { outline: false });
    // The chairs: the social worker's behind, the visitor's across.
    swivel(g, 0, -0.3, 0, '#4e6e58');
    guestChair(g, 0, 0.64, Math.PI, '#a5c49a');
    // The monitor at the worker's right, turned in to them; the keyboard and mouse.
    const mx = -0.27;
    const mz = 0.15;
    const mon = group(g, mx, top, mz, Math.atan2(0 - mx, -0.3 - mz));
    part(mon, rbox(0.2, 0.012, 0.14, 0.005), BLACK, 0, 0.006, -0.02);
    part(mon, box(0.035, 0.14, 0.025), BLACK, 0, 0.08, -0.03, { outline: false });
    part(mon, rbox(0.47, 0.3, 0.025, 0.01), BLACK, 0, 0.3, -0.01);
    out.screen = litScreen(mon, painted('swCaseScreen', 320, 200, paintCaseScreen), 0.44, 0.27, 0, 0.3, 0.004);
    part(g, rbox(0.3, 0.016, 0.1, 0.006), '#37474f', -0.17, top + 0.008, 0.02, { ry: 0.12 });
    part(g, box(0.27, 0.004, 0.075), '#90a4ae', -0.17, top + 0.017, 0.02, { ry: 0.12, outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.01), '#37474f', -0.37, top + 0.01, -0.02);
    const keys = marker(g, -0.17, top + 0.02, 0.02);
    // The 상담 일지 and a pen in front of them; the case files at their left; a mug.
    const padAt = new THREE.Vector3(0.06, top + 0.004, 0.08);
    part(g, rbox(0.17, 0.006, 0.23, 0.004), '#795548', padAt.x, top + 0.003, padAt.z);
    flat(g, painted('swCaseNote', 128, 170, paintCaseNote), 0.15, 0.2, padAt.x, top + 0.0075, padAt.z - 0.005, Math.PI);
    part(g, box(0.06, 0.012, 0.015), CHROME, padAt.x, top + 0.012, padAt.z + 0.105, { outline: false });
    pen(g, padAt.x + 0.11, top, padAt.z, 0.3);
    const pad = marker(g, padAt.x, top + 0.01, padAt.z);
    const fileColors = ['#1e88e5', '#43a047', '#fdd835'];
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.23, 0.022, 0.31, 0.006), fileColors[(i + n) % 3], 0.3, top + 0.011 + i * 0.024, -0.02 + (i % 2) * 0.01, { ry: 0.05 * (i - 1) });
      label(g, `사례 #2026-${114 + i + n * 3}`, 0.12, 0.016, 0.3, top + 0.011 + i * 0.024, -0.02 + (i % 2) * 0.01 - 0.156, '#ffffff', '#37474f', Math.PI);
    }
    part(g, cyl(0.032, 0.029, 0.085, 14), '#ffffff', -0.41, top + 0.0425, -0.06);
    part(g, cyl(0.0325, 0.0325, 0.015, 14), GREEN, -0.41, top + 0.06, -0.06, { outline: false });
    part(g, ring(0.022, 0.006, Math.PI), '#ffffff', -0.445, top + 0.045, -0.06, { rz: -Math.PI / 2 });
    // On the visitor's side: the nameplate, tissues, the brochure stand, a little succulent.
    part(g, rbox(0.22, 0.055, 0.035, 0.01), '#5d4037', -0.1, top + 0.0275, 0.265);
    label(g, `사회복지사 ${NAMES[n % NAMES.length]}`, 0.2, 0.04, -0.1, top + 0.03, 0.2835, '#5d4037', '#fff8e1');
    part(g, rbox(0.13, 0.07, 0.08, 0.012), '#e3f2fd', 0.15, top + 0.035, 0.24);
    part(g, box(0.06, 0.004, 0.012), '#90caf9', 0.15, top + 0.071, 0.24, { outline: false });
    part(g, ball(0.03), '#ffffff', 0.15, top + 0.085, 0.24, { outline: false }).scale.set(1, 0.8, 0.7);
    const stand = group(g, 0.375, top, 0.22);
    LEAFLETS.forEach(([t, col], i) => {
      glass(stand, box(0.03, 0.12, 0.09), -0.035 + i * 0.035, 0.06, 0);
      picture(stand, leafletTex(t, col), 0.075, 0.1, -0.035 + i * 0.035, 0.075, 0.0, '#ffffff', Math.PI / 2 - 0.25);
    });
    part(g, cyl(0.035, 0.03, 0.05, 12), '#d7ccc8', -0.42, top + 0.025, 0.25);
    for (let i = 0; i < 5; i++) part(g, ball(0.017), '#7cb342', -0.42 + Math.cos(i * 1.3) * 0.015, top + 0.06 + (i % 2) * 0.012, 0.25 + Math.sin(i * 1.3) * 0.015, { outline: false });

    // Spots: all sat behind the desk, facing the visitor's chair.
    const seatY = 0.48;
    const counsel = sitAt(g, 0, seatY, -0.3, 0, 'swCounsel', pad);
    const write = sitAt(g, 0, seatY, -0.3, 0, 'write', pad);
    const read = sitAt(g, 0, seatY, -0.3, 0, 'read', pad);
    const type = sitAt(g, 0, seatY, -0.3, 0, 'type', keys);
    out.spots = { manageCase: counsel, writeCaseNote: write, socialWorker_reviewCases: read, socialWorker_casePlan: type, occupationalTherapist_learnAssessment: read, '*': type };

    // In use: the 이용자 across the desk (only while the case is counselled), the leaflet held out.
    const use = group(g);
    out.inUse = use;
    const client = person(use, GRANDMAS[n % GRANDMAS.length], 0, 0.64, Math.PI, 0.46);
    const held = frameOf(use, counsel);
    const leaflet = picture(held, leafletTex(LEAFLETS[n % 3][0], LEAFLETS[n % 3][1]), 0.1, 0.13, 0, 0, 0, '#ffffff', 0, -1.1);
    const onDesk = v3(0.04, top + 0.02, 0.34);
    const at = new THREE.Vector3();
    out.animate = (t) => {
      const on = posed(counsel, t);
      client.root.visible = on;
      held.visible = on;
      if (!on) return;
      const ph = phaseOf(counsel);
      const b = counselBeat(t, ph);
      const k = welfareKey('swCounsel', t, ph);
      const out_ = leafletOut(b);
      leaflet.visible = out_;
      setLoc(leaflet, k.r, 0, 0.02, 0.05);
      // Their hand comes onto the table when the worker reaches across, takes the leaflet when it's held out.
      client.armL(amountOf(b, 'reassure') > 0.35 ? onDesk : amountOf(b, 'listen') > 0.5 ? v3(-0.1, top + 0.02, 0.4) : null);
      client.armR(out_ && amountOf(b, 'leaflet') > 0.6 ? inFrame(counsel, [k.r[0] - 0.02, k.r[1] + 0.01, k.r[2] + 0.1], at) : null);
      // They look at the worker, nod along, look down at the leaflet.
      client.head.rotation.x = 0.08 + 0.06 * Math.max(0, Math.sin(t * 1.3 + ph * 9)) ** 6 + 0.2 * amountOf(b, 'leaflet');
    };
  },

  /**
   * A donation shelf (후원 물품 선반): a grey boltless rack, four shelves deep with what's been given —
   * 햅쌀 sacks at the bottom, 김장 김치 in their 김치통, 라면 boxes, tins of tuna and a pack of toilet
   * paper — '후원 물품 · 사랑 나눔' along its top, the 입고 대장 clipped to its post. Sorting it: a box
   * of 라면 from the floor beside it, crouched to, lifted, set into the gap on the shelf and pushed
   * home, ticked off in the ledger. Signing up a donor (the lead's): stood by it face to face with the
   * 동네 빵집's owner, a crate of bread at their feet — talked through, the 협약서 held up, the
   * handshake.
   */
  donationShelf(g, _W, D, _c, _def, _ctx, out) {
    const n = shelfCount++;
    const z0 = -D / 2 + 0.03;
    const dep = 0.44;
    const zr = z0 + dep / 2;
    const hw = 0.475;
    const POST = '#b9c0c6';
    const SHELF = '#d5dade';
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, box(0.035, 1.82, 0.035), POST, sx * (hw - 0.018), 0.91, zr + sz * (dep / 2 - 0.018));
        for (let i = 0; i < 12; i++) part(g, box(0.008, 0.02, 0.002), '#6f7880', sx * (hw - 0.018), 0.2 + i * 0.13, zr + sz * (dep / 2 - 0.0), { outline: false });
      }
    const levels = [0.1, 0.52, 0.94, 1.36, 1.78];
    for (const y of levels) {
      part(g, box(hw * 2 - 0.02, 0.022, dep - 0.02), SHELF, 0, y, zr);
      part(g, box(hw * 2 - 0.02, 0.04, 0.012), POST, 0, y - 0.01, zr + dep / 2 - 0.006);
    }
    const t0 = (i: number) => levels[i] + 0.011;
    const zf = zr + 0.02;
    // The bottom: rice sacks, two by two.
    for (const sx of [-1, 1]) {
      riceSack(g, sx * 0.21, t0(0) + 0.06, zf);
      riceSack(g, sx * 0.21 + 0.01, t0(0) + 0.18, zf - 0.01, 0.04 * sx);
    }
    // Then 김장 김치.
    for (let i = 0; i < 3; i++) kimchiTub(g, (i - 1) * 0.3, t0(1), zf + (i === 1 ? 0.02 : 0));
    // Then 라면 boxes, a gap left in the middle for the next one.
    for (const sx of [-1, 1]) ramenBox(g, sx * 0.32, t0(2) + 0.11, zf, 0, 0.26);
    // Tins and toilet paper (or the other way round on the next shelf along).
    const flip = n % 2 ? -1 : 1;
    tins(g, -0.24 * flip, t0(3), zf, '#1565c0');
    tins(g, -0.24 * flip, t0(3) + 0.052, zf, '#c62828');
    tissuePack(g, 0.24 * flip, t0(3), zf);
    // The top: a box of donated socks and soap, the sign along the front.
    part(g, box(0.4, 0.18, 0.3), '#d9b48a', -0.2 * flip, t0(4) + 0.09, zf);
    label(g, '양말 · 비누', 0.22, 0.05, -0.2 * flip, t0(4) + 0.09, zf + 0.151, '#d9b48a', '#5d4037');
    part(g, rbox(hw * 2 - 0.04, 0.12, 0.02, 0.01), GREEN, 0, 1.72, zr + dep / 2 + 0.02);
    label(g, '후원 물품 · 사랑 나눔', 0.8, 0.09, 0, 1.72, zr + dep / 2 + 0.031, GREEN, '#ffffff');
    // The ledger on the right-hand post.
    const clip = group(g, hw - 0.08, 1.22, zr + dep / 2 + 0.02);
    part(clip, rbox(0.15, 0.2, 0.01, 0.006), '#8d6e63', 0, 0, 0);
    part(clip, box(0.06, 0.02, 0.014), CHROME, 0, 0.09, 0.003, { outline: false });
    picture(clip, painted('swLedger', 100, 130, paintLedger), 0.13, 0.17, 0, -0.01, 0.0065);
    part(clip, cyl(0.004, 0.004, 0.25, 6), '#9e9e9e', 0.085, -0.05, 0.0, { outline: false });

    // Spots: stood at its front facing it (sorting); stood to its left of it with a donor (the lead's).
    const shelfMid = marker(g, 0, 1.06, zr);
    const stock = standAt(g, 0, 0.36, Math.PI, 'swStock', shelfMid);
    const donor = standAt(g, -0.3, 0.5, Math.PI / 2, 'swDonor');
    out.spots = { sortDonations: stock, socialWorker_partnerDonors: donor, '*': stock };

    // The box waiting on the floor while nobody's at it.
    const idle = group(g);
    out.idle = idle;
    const floorAt = inFrame(stock, STOCK_AT.floor);
    ramenBox(idle, floorAt.x, floorAt.y, floorAt.z, 0.15);
    // In use: the box carried; the donor with their bread and the 협약서.
    const use = group(g);
    out.inUse = use;
    const hands = frameOf(use, stock);
    const carried = ramenBox(hands, 0, 0, 0, 0, 0.34, 0.22, 0.26);
    const visitor = person(use, LOOKS.baker, 0.45, 0.5, -Math.PI / 2);
    const crate = group(use, 0.66, 0, 0.12, 0.2);
    part(crate, rbox(0.4, 0.16, 0.3, 0.02), '#1e88e5', 0, 0.08, 0);
    for (let i = 0; i < 4; i++) part(crate, rbox(0.15, 0.08, 0.09, 0.04), '#c88a3e', -0.1 + (i % 2) * 0.18, 0.18, -0.06 + Math.floor(i / 2) * 0.12, { ry: 0.2 * i });
    label(crate, '사랑의 빵 나눔', 0.26, 0.05, 0, 0.09, 0.152, '#1e88e5', '#ffffff');
    const deal = group(use);
    part(deal, rbox(0.24, 0.32, 0.012, 0.006), '#1b5e20', 0, 0, 0);
    label(deal, '후원 협약서', 0.18, 0.04, 0, 0.1, 0.007, '#1b5e20', '#fff8e1');
    const meet = new THREE.Vector3();
    out.animate = (t) => {
      const atShelf = posed(stock, t);
      const withDonor = posed(donor, t);
      hands.visible = atShelf;
      visitor.root.visible = crate.visible = deal.visible = withDonor;
      if (atShelf) setLoc(carried, stockBox(stockBeat(t, phaseOf(stock))));
      if (withDonor) {
        const ph = phaseOf(donor);
        const b = donorBeat(t, ph);
        const k = welfareKey('swDonor', t, ph);
        const shake = amountOf(b, 'shake');
        const show = amountOf(b, 'show');
        // The worker holds up the agreement; the donor takes the hand that's offered.
        deal.visible = show > 0.4;
        deal.position.copy(inFrame(donor, [0, k.l[1] + 0.06, k.l[2] + 0.02], meet));
        deal.rotation.y = donor.at.rotation.y;
        visitor.armR(shake > 0.5 ? inFrame(donor, [SHAKE_AT[0] - 0.02, k.r[1], SHAKE_AT[2] + 0.05], meet).clone() : null);
        visitor.armL(shake > 0.5 ? inFrame(donor, [SHAKE_AT[0] + 0.05, k.r[1] - 0.04, SHAKE_AT[2] + 0.14], meet).clone() : show > 0.5 ? v3(0.3, 1.0, 0.42) : null);
        visitor.head.rotation.x = 0.05 + 0.2 * shake + 0.05 * Math.sin(t * 1.1);
      }
    };
  },

  /**
   * The 경로식당's serving counter (배식대): a stainless steam table, the 미역국 in a big stock pot
   * sunk into it (steaming while lunch is on), a rice well and three 반찬 pans (배추김치, 시금치나물,
   * 고등어조림) under a sneeze guard, the 식판 trays stacked at the start, a 수저통, the tray rail along
   * the front; '오늘의 메뉴' over it and '사랑의 경로식당' on its front. Serving: stood behind it, the
   * ladle dipped in the soup and poured into the bowl on the tray, hung back on the pot, the tray
   * slid across with both hands to the senior at the front of the queue, a little bow; two more
   * seniors wait their turn with their trays, one with a cane.
   */
  mealServiceCounter(g, W, _D, _c, _def, _ctx, out) {
    const hw = W / 2 - 0.02;
    const zb = -0.32;
    const zf = 0.28;
    const top = 0.88;
    const SS = '#c7ced4';
    part(g, rbox(hw * 2, top - 0.02, zf - zb, 0.02), SS, 0, (top - 0.02) / 2, (zb + zf) / 2);
    part(g, box(hw * 2 + 0.02, 0.025, zf - zb + 0.02), '#dfe4e8', 0, top - 0.0125, (zb + zf) / 2);
    // The front: a green band and the sign, a kick plate.
    part(g, box(hw * 2 - 0.04, 0.16, 0.006), GREEN, 0, 0.62, zf + 0.003, { outline: false });
    label(g, '사랑의 경로식당', 0.7, 0.11, 0, 0.62, zf + 0.007, GREEN, '#ffffff');
    part(g, box(hw * 2 - 0.04, 0.08, 0.006), '#8a949b', 0, 0.06, zf + 0.003, { outline: false });
    // The tray rail on the diners' side.
    for (const x of [-hw + 0.1, 0, hw - 0.1]) part(g, box(0.02, 0.03, 0.16), CHROME, x, top - 0.04, zf + 0.08, { outline: false });
    part(g, cyl(0.016, 0.016, hw * 2 - 0.1, 10), CHROME, 0, top - 0.025, zf + 0.15, { rz: Math.PI / 2 });
    part(g, cyl(0.016, 0.016, hw * 2 - 0.1, 10), CHROME, 0, top - 0.025, zf + 0.06, { rz: Math.PI / 2 });
    // The soup pot, sunk into the counter at the worker's reach.
    const serve = standAt(g, 0.25, -0.55, 0, 'swServe');
    const potAt = inFrame(serve, SERVE_AT.pot);
    part(g, cyl(0.175, 0.165, 0.26, 24), '#b0b8bf', potAt.x, 0.91, potAt.z);
    part(g, ring(0.175, 0.012), '#dfe4e8', potAt.x, 1.04, potAt.z, { rx: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, ring(0.03, 0.008, Math.PI), '#9aa3ab', potAt.x + sx * 0.18, 1.0, potAt.z, { ry: Math.PI / 2 + (sx > 0 ? 0 : Math.PI), rz: 0 });
    part(g, cyl(0.165, 0.165, 0.01, 24), '#6d5a3a', potAt.x, potAt.y + 0.015, potAt.z, { outline: false });
    const rr = seeded(21);
    for (let i = 0; i < 8; i++) part(g, box(0.04, 0.004, 0.015), '#2e5d2e', potAt.x + (rr() - 0.5) * 0.24, potAt.y + 0.022, potAt.z + (rr() - 0.5) * 0.24, { ry: rr() * 3, outline: false });
    // The rice well at the worker's left, heaped.
    part(g, box(0.3, 0.012, 0.28), '#8a949b', 0.7, top + 0.002, -0.14, { outline: false });
    part(g, rbox(0.3, 0.07, 0.28, 0.01), '#dfe4e8', 0.7, top + 0.03, -0.14);
    part(g, ball(0.13), '#fffdf7', 0.7, top + 0.05, -0.14, { outline: false }).scale.set(1.05, 0.35, 0.95);
    part(g, rbox(0.06, 0.012, 0.09, 0.02), '#f5f5f5', 0.62, top + 0.1, -0.08, { rx: 0.5 });
    part(g, cyl(0.008, 0.008, 0.16, 6), '#f5f5f5', 0.62, top + 0.15, -0.0, { rx: 0.9, outline: false });
    // The 반찬 pans under the sneeze guard.
    const banchan: Array<[number, string, string]> = [[-0.3, '#c62828', '배추김치'], [-0.56, '#558b2f', '나물'], [-0.82, '#8d5a2b', '조림']];
    for (const [x, col] of banchan) {
      part(g, rbox(0.23, 0.06, 0.3, 0.01), '#dfe4e8', x, top + 0.02, -0.12);
      part(g, rbox(0.2, 0.03, 0.26, 0.02), col, x, top + 0.045, -0.12, { outline: false });
      part(g, box(0.015, 0.01, 0.2), CHROME, x + 0.06, top + 0.07, -0.08, { rx: -0.25, outline: false });
    }
    for (const x of [-0.17, -0.95]) part(g, cyl(0.012, 0.012, 0.48, 8), CHROME, x, top + 0.24, 0.02, { outline: false });
    glass(g, box(0.8, 0.02, 0.36), -0.56, top + 0.47, -0.08, undefined, 0.15);
    // The menu board over it and the 경로식당's hours over the soup.
    for (const x of [-0.9, -0.22]) part(g, cyl(0.01, 0.01, 0.35, 6), CHROME, x, top + 0.65, 0.02, { outline: false });
    part(g, rbox(0.76, 0.42, 0.03, 0.012), '#4e342e', -0.56, top + 0.83, 0.02);
    picture(g, painted('swMenu', 220, 120, paintMenu), 0.72, 0.38, -0.56, top + 0.83, 0.037);
    part(g, cyl(0.01, 0.01, 0.6, 6), CHROME, 0.9, top + 0.3, -0.25, { outline: false });
    label(g, '경로식당 11:30 ~ 13:00', 0.6, 0.09, 0.62, top + 0.62, -0.25, '#fff8e1', GREEN);
    // The trays stacked at the start, the 수저통 beside them.
    for (let i = 0; i < 7; i++) part(g, rbox(0.36, 0.018, 0.27, 0.01), '#d6dbdf', -0.78 + (i % 2) * 0.004, top + 0.012 + i * 0.02, 0.15);
    part(g, cyl(0.06, 0.06, 0.14, 14), '#cfd8dc', -0.48, top + 0.07, 0.17);
    for (let i = 0; i < 9; i++) part(g, cyl(0.004, 0.004, 0.2, 6), i % 2 ? '#b0bec5' : '#eceff1', -0.48 + Math.cos(i * 0.9) * 0.03, top + 0.18, 0.17 + Math.sin(i * 0.9) * 0.03, { rz: Math.cos(i) * 0.1, outline: false });

    // The tray waiting for its soup, while nobody's serving; the ladle hung on the pot.
    const restTray = inFrame(serve, SERVE_AT.tray);
    const idle = group(g);
    out.idle = idle;
    tray(idle, restTray.x, restTray.y, restTray.z);
    const hung = group(g, potAt.x + 0.1, 1.2, potAt.z - 0.02, 0);
    const hungLadle = ladle(hung);
    hungLadle.len(0.32);
    hung.rotation.z = -0.35;
    // In use: the tray served and slid over, the ladle in the hand, the steam, the queue.
    const use = group(g);
    out.inUse = use;
    const served = tray(use, restTray.x, restTray.y, restTray.z);
    const hands = frameOf(use, serve);
    const held = ladle(hands);
    const steam: THREE.Mesh[] = [];
    const STEAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(ball(0.05), STEAM);
      m.position.set(potAt.x, 1.1, potAt.z);
      use.add(m);
      steam.push(m);
    }
    const front = person(use, LOOKS.grandpaA, restTray.x + 0.02, 0.86, Math.PI);
    const second = person(use, LOOKS.grandmaA, 1.0, 1.02, Math.PI - 0.35);
    const third = person(use, LOOKS.grandpaB, 1.62, 1.22, Math.PI - 0.5);
    const theirs = tray(front.root, 0, 1.0, 0.3);
    theirs.soup.visible = true;
    const waiting = tray(second.root, 0, 0.98, 0.3);
    waiting.soup.visible = false;
    second.armL(on(second, 0.17, 0.99, 0.3));
    second.armR(on(second, -0.17, 0.99, 0.3));
    // The cane.
    part(third.root, cyl(0.012, 0.012, 0.86, 8), '#5d4037', -0.26, 0.43, 0.14, { rz: -0.05 });
    third.armR(on(third, -0.26, 0.86, 0.14));
    const at = new THREE.Vector3();
    out.animate = (t) => {
      const ph = phaseOf(serve);
      const b = serveBeat(t, ph);
      const k = welfareKey('swServe', t, ph);
      // The ladle: from the hand to its bowl, or hung on the pot.
      const ld = ladleOf(b);
      hands.visible = ld.held;
      hung.visible = !ld.held;
      if (ld.held) {
        setLoc(held.root, k.r);
        const d = new THREE.Vector3(ld.bowl[0] - k.r[0], ld.bowl[1] - k.r[1], ld.bowl[2] - k.r[2]);
        held.len(THREE.MathUtils.clamp(d.length(), 0.18, 0.38));
        held.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize());
      }
      // The tray: filled, slid over, taken.
      const tr = trayOf(b);
      served.soup.visible = tr.full;
      served.root.visible = !tr.gone;
      served.root.position.set(restTray.x, restTray.y, restTray.z + tr.slid * SERVE_AT.slid);
      // The senior at the front reaches for it, then has it in their hands.
      theirs.root.visible = tr.gone;
      if (tr.gone) {
        front.armL(v3(restTray.x + 0.02 - 0.17, 1.0, 0.86 - 0.3));
        front.armR(v3(restTray.x + 0.02 + 0.17, 1.0, 0.86 - 0.3));
      } else if (tr.slid > 0.3) {
        const p = served.root.position;
        front.armL(at.set(p.x - 0.16, p.y + 0.02, p.z + 0.05).clone());
        front.armR(at.set(p.x + 0.16, p.y + 0.02, p.z + 0.05).clone());
      } else {
        front.armL(v3(restTray.x - 0.12, top - 0.02, zf + 0.15));
        front.armR(null);
      }
      front.head.rotation.x = 0.25 - 0.2 * amountOf(b, 'greet');
      steam.forEach((m, i) => {
        const u = ((t * 0.35 + i / steam.length) % 1 + 1) % 1;
        m.position.set(potAt.x + 0.05 * Math.sin(t * 0.9 + i * 2), 1.06 + u * 0.45, potAt.z + 0.04 * Math.cos(t * 0.7 + i));
        m.scale.setScalar(0.6 + u * 1.4);
      });
      STEAM.opacity = 0.3;
    };
    out.spots = { serveSeniorMeal: serve, '*': serve };
  },

  /**
   * The centre's van (복지관 차량): a white 12-seater with the centre's green stripe and name down its
   * sides, '사랑의 차량' and a heart on the sliding door, a wheelchair lift sign at the back, the
   * plates; parked on the lot. Off on a home visit (checkOnElder) it pulls away and is gone, and
   * backs in again when it's back.
   */
  welfareVan(g, _W, _D, _c, _def, _ctx, out) {
    const van = group(g);
    const L = 4.7;
    const Wd = 1.62;
    const zc = 0.12;
    const WHITE_VAN = '#f7f8f8';
    const side = (s: number) => zc + s * (Wd / 2);
    // The body: one box, the nose sloping down to the bumper, the roof.
    part(van, rbox(L - 0.4, 1.5, Wd, 0.2), WHITE_VAN, -0.2, 1.08, zc);
    part(van, rbox(0.7, 0.62, Wd - 0.02, 0.16), WHITE_VAN, L / 2 - 0.4, 0.66, zc);
    part(van, box(0.06, 0.78, Wd - 0.16), '#2d3e50', L / 2 - 0.47, 1.36, zc, { rz: 0.55 });
    part(van, rbox(L - 0.55, 0.06, Wd - 0.08, 0.03), shade(WHITE_VAN, 0.94), -0.25, 1.86, zc);
    // Roof rails.
    for (const s of [-1, 1]) part(van, cyl(0.015, 0.015, L - 1.2, 8), '#9aa0a6', -0.35, 1.9, zc + s * 0.6, { rz: Math.PI / 2, outline: false });
    // The side windows, the green stripe, the words.
    for (const s of [-1, 1]) {
      const zz = side(s) + s * 0.004;
      const ry = s > 0 ? 0 : Math.PI;
      for (const [x, w] of [[1.05, 0.62], [0.25, 0.82], [-0.65, 0.82], [-1.55, 0.72]] as const) part(van, rbox(w, 0.42, 0.01, 0.04), '#2d3e50', x, 1.47, zz, { outline: false });
      part(van, box(L - 0.6, 0.12, 0.006), GREEN, -0.2, 0.86, zz, { outline: false });
      part(van, box(L - 0.6, 0.035, 0.006), LEAF, -0.2, 0.77, zz, { outline: false });
      label(van, CENTRE, 1.7, 0.16, -0.25, 1.08, zz + s * 0.003, 'none', GREEN, ry);
      label(van, '사랑의 차량', 0.62, 0.1, -0.25, 0.66, zz + s * 0.003, 'none', '#e53935', ry);
      // The sliding door's line and handle, mirrors.
      part(van, box(0.008, 1.0, 0.007), '#b0b6bb', -0.15, 1.05, zz, { outline: false });
      part(van, rbox(0.12, 0.025, 0.02, 0.008), '#9aa0a6', 0.0, 1.1, zz + s * 0.01, { outline: false });
      part(van, rbox(0.1, 0.13, 0.08, 0.02), BLACK, 1.45, 1.35, side(s) + s * 0.08);
    }
    // Wheels.
    for (const x of [-1.5, 1.45])
      for (const s of [-1, 1]) {
        const wz = side(s) - s * 0.12;
        part(van, cyl(0.33, 0.33, 0.22, 22), BLACK, x, 0.33, wz, { rx: Math.PI / 2 });
        part(van, cyl(0.2, 0.2, 0.225, 16), STEEL, x, 0.33, wz, { rx: Math.PI / 2, outline: false });
        part(van, ring(0.38, 0.035, Math.PI), '#37474f', x, 0.33, side(s) + s * 0.005, { outline: false });
      }
    // The front: grille, headlights, bumper, plate.
    const fx = L / 2 - 0.05;
    part(van, rbox(0.04, 0.16, 0.8, 0.02), '#37474f', fx, 0.72, zc);
    for (const s of [-1, 1]) part(van, rbox(0.05, 0.1, 0.3, 0.03), '#fffde7', fx - 0.01, 0.86, zc + s * 0.56);
    part(van, rbox(0.12, 0.2, Wd - 0.06, 0.05), '#cfd3d6', fx + 0.02, 0.42, zc);
    label(van, '78허 2026', 0.4, 0.1, fx + 0.085, 0.45, zc, '#ffffff', '#111111', Math.PI / 2);
    // The back: lights, the lift sign, the plate.
    const bx = -L / 2;
    for (const s of [-1, 1]) part(van, rbox(0.04, 0.3, 0.12, 0.02), '#d32f2f', bx + 0.02, 1.05, zc + s * 0.72);
    label(van, '♿ 휠체어 리프트', 0.7, 0.12, bx - 0.005, 1.3, zc, '#1565c0', '#ffffff', -Math.PI / 2);
    label(van, '78허 2026', 0.4, 0.1, bx - 0.005, 0.6, zc, '#ffffff', '#111111', -Math.PI / 2);
    part(van, rbox(0.1, 0.18, Wd - 0.06, 0.05), '#cfd3d6', bx - 0.02, 0.42, zc);
    // Driven: sat at the wheel (the driver's side, at the back of the lot).
    const wheel = marker(van, 1.15, 1.18, side(-1) + 0.42);
    part(van, ring(0.15, 0.015), BLACK, 1.15, 1.18, side(-1) + 0.42, { ry: Math.PI / 2, rz: 0.5 });
    const drive = sitAt(van, 0.75, 0.95, side(-1) + 0.42, Math.PI / 2, 'steer', wheel);
    out.spots = { '*': drive };
    // Off on a visit: it pulls away forwards and is gone; it backs in again when it's back.
    let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    const PULL = 4;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      let x = 0;
      if (state === 'leaving') {
        const u = Math.min(1, (t - since) / 3);
        x = PULL * u * u;
        if (u >= 1) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, (t - since) / 4.5);
        x = PULL * (1 - u) * (1 - u);
        if (u >= 1) state = 'parked';
      }
      van.position.x = x;
      van.visible = state !== 'gone';
    };
  },

  /**
   * The 프로그램 안내 board (복지관 프로그램 안내판): a cork board in an oak frame on the lobby wall
   * under a green header, the centre's programmes pinned up (한글 교실, 건강 체조, 방과후 공부방, the
   * 경로식당, 이 · 미용 봉사, volunteers wanted) round November's calendar, and a pocket rack of
   * leaflets under it for people to take. Pinning up a notice: stood at it, the new sheet (김장 나눔
   * 행사 — 자원봉사자 모집) held up by its corners, pinned at each, smoothed down, looked over.
   */
  swProgramNotice(g, W, D, _c, _def, ctx, out) {
    const bw = W - 0.3;
    const bh = 0.98;
    const z = -D / 2 + (ctx.againstWall ? 0.03 : 0.2);
    const y = 1.45;
    if (!ctx.againstWall)
      for (const sx of [-1, 1]) {
        part(g, cyl(0.025, 0.025, y + 0.4, 8), OAK_DARK, sx * (bw / 2 + 0.03), (y + 0.4) / 2, z);
        part(g, rbox(0.07, 0.04, 0.5, 0.015), OAK_DARK, sx * (bw / 2 + 0.03), 0.02, z);
      }
    part(g, rbox(bw + 0.08, bh + 0.08, 0.04, 0.015), OAK, 0, y, z);
    part(g, box(bw, bh, 0.012), '#b98a57', 0, y, z + 0.02, { outline: false });
    const fz = z + 0.027;
    part(g, rbox(bw + 0.08, 0.16, 0.05, 0.015), GREEN, 0, y + bh / 2 + 0.1, z + 0.005);
    label(g, `${CENTRE} 프로그램 안내`, bw - 0.1, 0.12, 0, y + bh / 2 + 0.1, z + 0.032, GREEN, '#ffffff');
    // The posters round the calendar (the space at the right left for the next notice).
    const spots: Array<[number, number]> = [[-0.62, 0.22], [-0.36, 0.22], [-0.62, -0.22], [-0.36, -0.22], [0.12, -0.25], [-0.1, -0.27]];
    const pinColors = ['#e53935', '#1e88e5', '#fdd835', '#43a047'];
    spots.forEach(([px, py], i) => {
      const m = picture(g, posterTex(i), 0.21, 0.28, px, y + py, fz + 0.001 * (i + 1));
      m.rotation.z = (((i * 37) % 7) - 3) * 0.012;
      part(g, ball(0.012), pinColors[i % 4], px, y + py + 0.12, fz + 0.012, { outline: false });
    });
    picture(g, painted('swCalendar', 160, 130, paintCalendar), 0.36, 0.29, 0.0, y + 0.22, fz + 0.002);
    for (const sx of [-1, 1]) part(g, ball(0.012), '#e53935', sx * 0.16, y + 0.35, fz + 0.012, { outline: false });
    // The leaflet pocket rack under it.
    part(g, rbox(0.9, 0.24, 0.06, 0.01), OAK, 0, 0.88, z + 0.04);
    LEAFLETS.concat([['장애인 활동지원', '#8e24aa'], ['아동 급식카드', '#f9a825']]).forEach(([t, col], i) => {
      glass(g, box(0.15, 0.13, 0.03), -0.34 + i * 0.17, 0.92, z + 0.085);
      picture(g, leafletTex(t, col), 0.12, 0.16, -0.34 + i * 0.17, 0.95, z + 0.075, '#ffffff', 0, -0.15);
    });
    label(g, '필요하신 분은 가져가세요', 0.5, 0.05, 0, 0.79, z + 0.072, OAK, '#4e342e');

    // Pinning up the new notice: stood before the space at the board's right.
    const zs = fz + PIN_AT.sheet[2] + 0.004;
    const sx0 = 0.48 + PIN_AT.sheet[0];
    const pin = standAt(g, sx0, zs, Math.PI, 'swPin', marker(g, 0.48, y, fz));
    out.spots = { '*': pin };
    const use = group(g);
    out.inUse = use;
    const sheetAt = inFrame(pin, PIN_AT.sheet);
    const sheet = picture(use, painted('swNewNotice', 120, 160, paintNewNotice), PIN_AT.hw * 2, PIN_AT.hh * 2, sheetAt.x, sheetAt.y, fz + 0.004);
    const pinL = part(use, ball(0.013), '#e53935', sheetAt.x - PIN_AT.hw + 0.02, sheetAt.y + PIN_AT.hh - 0.02, fz + 0.014, { outline: false });
    const pinR = part(use, ball(0.013), '#1e88e5', sheetAt.x + PIN_AT.hw - 0.02, sheetAt.y + PIN_AT.hh - 0.02, fz + 0.014, { outline: false });
    out.animate = (t) => {
      const b = pinBeat(t, phaseOf(pin));
      sheet.visible = posed(pin, t);
      // Held up flat before it's pinned, a finger's breadth off the cork.
      sheet.position.z = fz + (noticeUp(b) ? 0.004 : 0.02);
      pinL.visible = sheet.visible && b.from !== 'hold' && !(b.from === 'pinL' && b.p < 0.4);
      pinR.visible = sheet.visible && b.from !== 'hold' && b.from !== 'pinL' && !(b.from === 'pinR' && b.p < 0.4);
    };
  },

  /**
   * The seniors' corner (어르신 바둑 · 장기 쉼터): a square wooden table with a thick 바둑판 on it, a
   * game well under way, the black and white stones' bowls with their lids off; two round stools
   * with 방석 cushions; behind it a low cabinet with a 장기판 mid-game (楚 against 漢), the radio for
   * the 트로트, a flask of 보리차 and paper cups, '어르신 쉼터' on its front. A game with one of the
   * seniors: sat on the near stool, a long think, a black stone from the bowl set down with a click;
   * the 할아버지 across (drawn in) thinks, the chin on his hand, and plays white.
   */
  swBadukCorner(g, _W, _D, _c, _def, _ctx, out) {
    const zt = 0.05;
    const th = 0.68;
    const WOOD = '#b07a45';
    part(g, rbox(0.8, 0.04, 0.62, 0.015), WOOD, 0, th - 0.02, zt);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.05, th - 0.04, 0.05, 0.01), shade(WOOD, 0.8), sx * 0.34, (th - 0.04) / 2, zt + sz * 0.25);
    part(g, box(0.64, 0.06, 0.012), shade(WOOD, 0.8), 0, th - 0.07, zt + 0.29, { outline: false });
    // The 바둑판, its face at BADUK_AT's height above the stools.
    const seatH = 0.42;
    const face = seatH + BADUK_AT.board[1];
    part(g, rbox(0.48, face - th, 0.48, 0.01), '#d9a85a', 0, (th + face) / 2, zt);
    flat(g, painted('swBaduk', 256, 256, paintBaduk), 0.47, 0.47, 0, face + 0.001, zt, Math.PI / 2);
    // A game under way. (The board's lines run along x and z; the stones sit on the points.)
    const pitch = BADUK_AT.pitch;
    const r = seeded(41);
    const taken = new Set<string>();
    for (let i = 0; i < 26; i++) {
      const a = Math.round((r() - 0.5) * 14);
      const b = Math.round((r() - 0.5) * 14);
      if (taken.has(`${a},${b}`)) continue;
      taken.add(`${a},${b}`);
      part(g, ball(0.0105), i % 2 ? '#fafafa' : '#1c1c1c', a * pitch, face + 0.004, zt + b * pitch, { outline: false }).scale.set(1, 0.45, 1);
    }
    // The bowls: black at the near player's right, white at the far one's.
    const play = sitAt(g, -0.72, seatH, zt, Math.PI / 2, 'swBaduk');
    const blackAt = inFrame(play, BADUK_AT.bowl);
    const bowl = (x: number, z: number, stone: string) => {
      part(g, cyl(0.06, 0.045, 0.08, 18), '#6d3b1f', x, th + 0.04, z);
      part(g, ball(0.05), stone, x, th + 0.075, z, { outline: false }).scale.set(1, 0.3, 1);
    };
    bowl(blackAt.x, blackAt.z, '#1c1c1c');
    bowl(-blackAt.x, 2 * zt - blackAt.z, '#fafafa');
    // The stools with their cushions.
    for (const sx of [-1, 1]) {
      const s = group(g, sx * 0.72, 0, zt);
      part(s, cyl(0.17, 0.15, 0.03, 18), WOOD, 0, seatH - 0.05, 0);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        part(s, cyl(0.018, 0.022, seatH - 0.06, 8), shade(WOOD, 0.8), Math.cos(a) * 0.11, (seatH - 0.06) / 2, Math.sin(a) * 0.11, { outline: false });
      }
      part(s, rbox(0.36, 0.05, 0.36, 0.025), sx < 0 ? '#c0392b' : '#2e7d32', 0, seatH - 0.012, 0);
    }
    // The cabinet behind, the 장기판 on it.
    const cz = -0.4;
    const ch = 0.5;
    part(g, rbox(1.1, ch, 0.18, 0.012), OAK, 0, ch / 2, cz);
    for (const sx of [-1, 1]) part(g, box(0.5, ch - 0.08, 0.004), OAK_DARK, sx * 0.27, ch / 2, cz + 0.091, { outline: false });
    label(g, '어르신 쉼터', 0.36, 0.08, 0, ch - 0.12, cz + 0.094, OAK, '#4e342e');
    part(g, rbox(0.36, 0.035, 0.17, 0.005), '#d9a85a', -0.3, ch + 0.0175, cz);
    flat(g, painted('swJanggi', 200, 220, paintJanggi), 0.34, 0.16, -0.3, ch + 0.036, cz, 0);
    const jr = seeded(9);
    const glyphs = ['車', '馬', '象', '士', '包', '卒', '兵', '楚', '漢'];
    for (let i = 0; i < 10; i++) {
      const col = i % 2 ? '#c62828' : '#1b5e20';
      const px = -0.3 + (jr() - 0.5) * 0.3;
      const pz = cz + (jr() - 0.5) * 0.13;
      part(g, cyl(0.016, 0.018, 0.012, 8), '#f3e3c3', px, ch + 0.042, pz, { outline: false });
      flat(g, painted(`swJang|${glyphs[i % glyphs.length]}|${col}`, 32, 32, (c) => {
        FONTLESS(c, 32, 32, '#f3e3c3');
        text(c, glyphs[i % glyphs.length], 16, 17, 22, col, 'center');
      }), 0.026, 0.026, px, ch + 0.0485, pz, Math.PI / 2);
    }
    // The radio, the flask and the paper cups.
    part(g, rbox(0.2, 0.12, 0.08, 0.02), '#8d6e63', 0.18, ch + 0.06, cz);
    part(g, cyl(0.035, 0.035, 0.005, 16), '#4e342e', 0.13, ch + 0.07, cz + 0.042, { rx: Math.PI / 2, outline: false });
    part(g, box(0.06, 0.03, 0.004), '#fff59d', 0.22, ch + 0.08, cz + 0.042, { outline: false });
    part(g, cyl(0.004, 0.004, 0.2, 6), CHROME, 0.26, ch + 0.2, cz, { rz: 0.3, outline: false });
    part(g, cyl(0.04, 0.04, 0.24, 14), '#2e7d32', 0.42, ch + 0.12, cz);
    part(g, cyl(0.03, 0.035, 0.04, 14), '#212121', 0.42, ch + 0.26, cz);
    for (let i = 0; i < 2; i++) part(g, cyl(0.026, 0.02, 0.07, 12), '#ffffff', 0.35 - i * 0.05, ch + 0.035, cz + 0.04);

    out.spots = { swPlayBaduk: play, '*': play };
    // In use: the 할아버지 across, the stone in the hand, the stones of this move.
    const use = group(g);
    out.inUse = use;
    const elder = person(use, LOOKS.grandpaA, 0.72, zt, -Math.PI / 2, seatH);
    const hands = frameOf(use, play);
    const stone = part(hands, ball(0.0105), '#1c1c1c', 0, 0, 0, { outline: false });
    stone.scale.set(1, 0.45, 1);
    const black = part(hands, ball(0.0105), '#1c1c1c', 0, 0, 0, { outline: false });
    black.scale.set(1, 0.45, 1);
    const white = part(use, ball(0.0105), '#fafafa', 0, 0, 0, { outline: false });
    white.scale.set(1, 0.45, 1);
    const whiteBowl = v3(-blackAt.x, th + 0.1, 2 * zt - blackAt.z);
    const chin = v3(0.72 - 0.16, seatH + 0.64, zt - 0.02);
    out.animate = (t) => {
      const ph = phaseOf(play);
      const b = badukBeat(t, ph);
      const k = welfareKey('swBaduk', t, ph);
      stone.visible = stoneInHand(b);
      setLoc(stone, k.r, 0, -0.012, 0.02);
      const placedNow = (b.from === 'place' && (b.p > 0.5 || b.e > 0)) || b.from === 'watch';
      black.visible = placedNow;
      setLoc(black, badukStoneAt(b.n), 0, -0.004, 0);
      // His move while the dweller watches: a think, a white stone fetched and set down.
      const watching = b.from === 'watch' && b.e === 0;
      const [wa, wb] = badukPoint(b.n + 101);
      const whiteAt = v3(-wb * pitch, face + 0.004, zt + wa * pitch);
      white.visible = (watching && b.p > 0.7) || (b.from === 'watch' && b.e > 0);
      white.position.copy(whiteAt);
      if (watching && b.p > 0.4 && b.p <= 0.7) elder.armR(b.p < 0.52 ? whiteBowl : whiteAt.clone().add(v3(0, 0.02, 0)));
      else elder.armR(b.from === 'think' || (watching && b.p < 0.4) ? chin : null);
      elder.armL(v3(0.72 - 0.3, th + 0.02, zt + 0.12));
      elder.head.rotation.x = 0.45 + 0.04 * Math.sin(t * 0.8);
    };
  },

  /**
   * The after-school 공부방 table (방과후 공부방 책상): a long birch table at children's height, two
   * little chairs on the far side and the teacher's chair on the near side; the children's open
   * 익힘책 and 받아쓰기, pencil cases, pencils and an eraser, a stack of 문제집, a carton of 흰 우유, a
   * lamp, '꿈자람 공부방' on a little standing sign. Helping with homework: sat across from them, a
   * hand open explaining, leant in pointing along the line, listening, a tick on the page, a thumbs
   * up; the two children (drawn in) write away, one putting a hand up now and then.
   */
  swStudyNook(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.62;
    const BIRCH = '#ead7b5';
    part(g, rbox(1.56, 0.035, 0.64, 0.02), BIRCH, 0, top - 0.0175, -0.06);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.022, 0.022, top - 0.035, 8), '#9ccc65', sx * 0.72, (top - 0.035) / 2, -0.06 + sz * 0.26, { outline: false });
    // The children's chairs (behind), the teacher's (in front).
    for (const x of [-0.36, 0.4]) guestChair(g, x, -0.45, 0, x < 0 ? '#ffb74d' : '#81d4fa', 0.36, '#f5f5f5');
    guestChair(g, 0, 0.42, Math.PI, '#aed581', 0.41);
    // On the table: the open books, pencil cases, pencils, the milk, the lamp, the sign.
    const bookA = v3(-0.28, top + 0.004, -0.16);
    const bookB = v3(0.38, top + 0.004, -0.17);
    [bookA, bookB].forEach((p, i) => {
      part(g, rbox(0.33, 0.008, 0.22, 0.004), i ? '#ef5350' : '#42a5f5', p.x, p.y, p.z);
      flat(g, workbookTex(i), 0.32, 0.21, p.x, p.y + 0.0045, p.z, Math.PI);
      part(g, cyl(0.004, 0.004, 0.15, 6), '#fdd835', p.x + 0.12, p.y + 0.008, p.z + 0.14, { rz: Math.PI / 2, ry: 0.4, outline: false });
      part(g, rbox(0.2, 0.04, 0.06, 0.02), i ? '#ce93d8' : '#4fc3f7', p.x - 0.02, top + 0.02, p.z - 0.17);
    });
    part(g, rbox(0.04, 0.015, 0.02, 0.005), '#ffffff', 0.08, top + 0.008, -0.05);
    for (let i = 0; i < 3; i++) part(g, rbox(0.22, 0.02, 0.3, 0.006), ['#26a69a', '#ffa726', '#7e57c2'][i], 0.66, top + 0.01 + i * 0.021, -0.1, { ry: 0.08 * (i - 1) });
    part(g, box(0.06, 0.1, 0.06), '#ffffff', -0.62, top + 0.05, -0.02);
    part(g, box(0.062, 0.025, 0.062), '#42a5f5', -0.62, top + 0.088, -0.02, { outline: false });
    label(g, '우유', 0.05, 0.025, -0.62, top + 0.05, 0.011, '#ffffff', '#1565c0');
    part(g, cyl(0.06, 0.07, 0.02, 14), '#fafafa', -0.62, top + 0.01, -0.28);
    rod(g, v3(-0.62, top + 0.02, -0.28), v3(-0.58, top + 0.32, -0.26), 0.01, '#fafafa');
    part(g, cyl(0.03, 0.07, 0.07, 14), '#fafafa', -0.52, top + 0.32, -0.22, { rz: -0.9 });
    glowing(g, cyl(0.06, 0.06, 0.005, 14), '#fffde7', -0.5, top + 0.29, -0.2, 0).rotation.z = -0.9;
    const sign = group(g, 0.0, top, -0.33);
    part(sign, box(0.3, 0.12, 0.01), '#fff3e0', 0, 0.08, 0, { rx: -0.2 });
    label(sign, '꿈자람 공부방 ✎', 0.28, 0.08, 0, 0.08, 0.006, '#fff3e0', '#e65100').rotation.x = -0.2;

    const tutor = sitAt(g, 0, 0.41, 0.42, Math.PI, 'swTutor');
    out.spots = { swTutorKids: tutor, '*': tutor };
    // In use: the children at their books.
    const use = group(g);
    out.inUse = use;
    const kidSeat = 0.36 / 0.66;
    const kidA = person(use, LOOKS.kidA, -0.36, -0.45, 0, kidSeat, 0.66);
    const kidB = person(use, LOOKS.kidB, 0.4, -0.45, 0, kidSeat, 0.66);
    out.animate = (t) => {
      const ph = phaseOf(tutor);
      const b = tutorBeat(t, ph);
      const w = (x: number, z: number) => v3(x + 0.025 * Math.sin(t * 9), top + 0.025 + 0.005 * Math.sin(t * 17), z + 0.015 * Math.sin(t * 4.3));
      kidA.armR(w(bookA.x - 0.05, bookA.z - 0.02));
      kidA.armL(v3(bookA.x + 0.12, top + 0.02, bookA.z - 0.05));
      kidA.head.rotation.x = 0.45 - 0.35 * amountOf(b, 'explain');
      const hand = amountOf(b, 'listen') > 0.5 && Math.sin(t * 0.9) > 0.2;
      kidB.armL(hand ? v3(0.4 + 0.13, top + 0.62, -0.42) : v3(bookB.x + 0.1, top + 0.02, bookB.z - 0.05));
      kidB.armR(w(bookB.x - 0.06, bookB.z));
      kidB.head.rotation.x = hand ? -0.1 : 0.4 - 0.3 * amountOf(b, 'praise');
    };
  },

  /**
   * The volunteers' sign-in stand (자원봉사자 접수대): a green and white stand with a sloped top, the
   * 자원봉사 활동 일지 open on it with a pen on a chain, a tray of name tags on lanyards and a bottle of
   * hand sanitiser, '자원봉사자 접수' on its front; a coat stand beside it with the green volunteer
   * vests. Greeting volunteers: stood behind it, a little bow (어서 오세요), the day talked through,
   * a finger on the line where they sign, a name tag handed over; the volunteer (drawn in) signs.
   */
  swVolunteerSignIn(g, _W, _D, _c, _def, _ctx, out) {
    const zs = 0.2;
    const h = 0.98;
    part(g, rbox(0.64, h - 0.04, 0.32, 0.03), '#f5f5f0', 0, (h - 0.04) / 2, zs);
    part(g, box(0.6, 0.22, 0.006), LEAF, 0, 0.62, zs + 0.163, { outline: false });
    label(g, '자원봉사자 접수', 0.52, 0.1, 0, 0.64, zs + 0.167, LEAF, '#ffffff');
    label(g, '함께해서 고맙습니다', 0.46, 0.05, 0, 0.32, zs + 0.162, '#f5f5f0', GREEN);
    const lid = group(g, 0, h, zs);
    lid.rotation.x = 0.18;
    part(lid, rbox(0.68, 0.03, 0.38, 0.01), OAK, 0, 0, 0);
    part(lid, rbox(0.4, 0.012, 0.26, 0.004), '#1b5e20', 0.02, 0.02, 0.0);
    flat(lid, painted('swSignIn', 200, 140, paintSignIn), 0.38, 0.25, 0.02, 0.027, 0.0);
    part(lid, cyl(0.005, 0.005, 0.14, 6), '#1a237e', -0.22, 0.03, 0.03, { rz: Math.PI / 2, ry: 0.5, outline: false });
    part(lid, rbox(0.12, 0.03, 0.09, 0.01), '#cfd8dc', 0.27, 0.03, -0.1);
    for (let i = 0; i < 4; i++) part(lid, box(0.05, 0.004, 0.035), '#ffffff', 0.25 + (i % 2) * 0.03, 0.05 + i * 0.004, -0.11 + (i % 2) * 0.01, { outline: false });
    part(lid, cyl(0.025, 0.025, 0.12, 12), '#e1f5fe', 0.27, 0.08, 0.08);
    part(lid, cyl(0.008, 0.008, 0.04, 6), '#ffffff', 0.27, 0.16, 0.08, { outline: false });
    // The coat stand with the vests.
    const cs = group(g, -0.36, 0, -0.3);
    part(cs, cyl(0.16, 0.18, 0.03, 16), BLACK, 0, 0.015, 0);
    part(cs, cyl(0.016, 0.016, 1.7, 8), BLACK, 0, 0.85, 0, { outline: false });
    for (let i = 0; i < 2; i++) {
      const vest = group(cs, 0.07 * (i ? -1 : 1), 1.48, 0.06 * (i ? 1 : -1), i ? 0.5 : -0.4);
      part(vest, rbox(0.34, 0.46, 0.06, 0.04), LEAF, 0, -0.24, 0);
      part(vest, box(0.12, 0.16, 0.062), shade(LEAF, 0.75), 0, -0.06, 0, { outline: false });
      label(vest, '자원봉사', 0.18, 0.05, 0, -0.28, 0.032, LEAF, '#ffffff');
    }
    const greet = standAt(g, 0.05, -0.18, 0, 'swGreet');
    out.spots = { '*': greet };
    // In use: the volunteer signing in, the name tag held out.
    const use = group(g);
    out.inUse = use;
    const vol = person(use, LOOKS.volunteer, 0.02, 0.84, Math.PI);
    const hands = frameOf(use, greet);
    const tag = group(hands);
    part(tag, rbox(0.07, 0.1, 0.006, 0.004), '#ffffff', 0, -0.04, 0);
    part(tag, box(0.07, 0.025, 0.007), LEAF, 0, -0.005, 0, { outline: false });
    rod(tag, v3(-0.03, 0.0, 0), v3(0, 0.08, 0), 0.003, GREEN);
    rod(tag, v3(0.03, 0.0, 0), v3(0, 0.08, 0), 0.003, GREEN);
    const book = inFrame(greet, GREET_AT.book);
    const at = new THREE.Vector3();
    out.animate = (t) => {
      const ph = phaseOf(greet);
      const b = greetBeat(t, ph);
      const k = welfareKey('swGreet', t, ph);
      tag.visible = tagOut(b);
      setLoc(tag, k.r, 0, -0.02, 0.03);
      const signing = amountOf(b, 'point') > 0.5;
      vol.armR(signing ? v3(book.x - 0.03 + 0.03 * Math.sin(t * 8), book.y + 0.03, book.z + 0.1) : amountOf(b, 'give') > 0.6 ? inFrame(greet, [k.r[0], k.r[1], k.r[2] + 0.06], at).clone() : null);
      vol.armL(signing ? v3(book.x + 0.15, book.y + 0.02, book.z + 0.14) : null);
      vol.head.rotation.x = signing ? 0.5 : 0.1 - 0.15 * amountOf(b, 'bow');
    };
  },
};

