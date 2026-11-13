import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { glowing, label, painted, picture, ring, text, type Paint } from './doctor';
import { GR, NP, NT, SV, bsBeat, bsKey, bsPhase, inBeat, serveOf, type BsMotion } from './babysitterMotion';
import type { Loc } from './childcareMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The babysitter's work drawn as itself (2026-11-01 workplace pipeline, at the user's request; since 2026-11-05 the
 * layout audit, the family's flat, 윤서네, and the 단지 playground, where it was a home-style 어린이집 called 포근둥지). The story corner, the craft tables, the snack counter and the nap mats are shared with the 국공립 어린이집
 * (childcareTeacher.ts builds them, with babysitter_ spots of their own), as are its cubbies, little sinks and nap
 * curtain. Here is what a house made into a daycare adds: a nappy station that is only ever cleaned and stocked (no
 * child is shown on it), a low snack table with an oilcloth where four children get their plates and say 잘 먹겠습니다,
 * a wooden play kitchen where a toddler cooks and brings a plate over, the desk where the 알림장 notes to parents are
 * written, the entryway where a child is met and their temperature taken, and a wall of family photos with a height
 * chart. Everyone in a scene shows only while the piece is in use; the children are children's bodies.
 */

const CENTRE = '윤서네';
const CLASS = '도토리반';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);

const OAK = '#d9b98a';
const OAK_D = '#a98352';
const CREAM = '#fff8ea';
const PAPER = '#fffdf6';
const SKIN = '#f6d2b5';
const PASTEL = ['#ffab91', '#ffe082', '#a5d6a7', '#81d4fa', '#ce93d8', '#f48fb1', '#fff59d', '#80cbc4'];

// ---------------------------------------------------------------------------------------------
// Small parts and spots.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: BsMotion, cross = false): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, y);
  s.motion = motion as Motion;
  if (cross) s.legs = 'cross';
  return s;
}
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: BsMotion): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.motion = motion as Motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
const inUse = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
const tmp = new THREE.Vector3();
const phaseOf = (s: Spot) => bsPhase(s.at.getWorldPosition(tmp));
/** A place in a spot's frame, in the piece's frame. */
function inFrame(s: Spot, p: Loc, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(p[0], p[1], p[2]).applyAxisAngle(UP, s.at.rotation.y).add(s.at.position);
}
/** The dweller's hands at a spot, in the piece's frame. */
function handsAt(s: Spot, m: BsMotion, t: number) {
  const k = bsKey(m, t, phaseOf(s));
  const base = s.how === 'sit' ? (s.drop ?? s.at.position.y) : 0;
  return { l: inFrame(s, [k.l[0], k.l[1] + base - s.at.position.y, k.l[2]]), r: inFrame(s, [k.r[0], k.r[1] + base - s.at.position.y, k.r[2]]) };
}
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
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
/** A little chair (seat's top at `h`), built facing +z. */
function tinyChair(g: THREE.Object3D, x: number, z: number, ry: number, color: string, h = 0.26, w = 0.28): THREE.Group {
  const c = group(g, x, 0, z, ry);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.016, 0.014, h - 0.025, 8), OAK_D, sx * (w / 2 - 0.03), (h - 0.025) / 2, sz * (w / 2 - 0.03), { outline: false });
  part(c, rbox(w, 0.03, w * 0.95, 0.012), color, 0, h - 0.015, 0);
  part(c, rbox(w, 0.18, 0.03, 0.012), OAK, 0, h + 0.13, -w / 2 + 0.02);
  return c;
}
/** A folded nappy: a soft white parcel with a printed waist. */
function nappy(g: THREE.Object3D, x: number, y: number, z: number, tint = '#b3e5fc'): THREE.Mesh {
  const n = part(g, rbox(0.11, 0.035, 0.09, 0.016), '#fdfdfb', x, y, z);
  part(n, box(0.112, 0.012, 0.012), tint, 0, 0, 0.04, { outline: false });
  return n;
}

// ---------------------------------------------------------------------------------------------
// People drawn in, until a body has come: children (a big head on a small body) and a parent.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  kid?: boolean;
}
const KIDS: Look[] = [
  { top: '#f8bbd0', bottom: '#7986cb', hair: '#3b2a20', kid: true },
  { top: '#81d4fa', bottom: '#5d4037', hair: '#2a1d15', kid: true },
  { top: '#fff176', bottom: '#ef9a9a', hair: '#4e342e', kid: true },
  { top: '#a5d6a7', bottom: '#455a64', hair: '#1f1a17', kid: true },
  { top: '#ffcc80', bottom: '#3949ab', hair: '#3e2723', kid: true },
];
const PARENT: Look = { top: '#90a4ae', bottom: '#37474f', hair: '#2b1b10' };
const TOT = 0.55;
interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
/** Stood, or sat on a seat `seat` high (in their own size), scaled `k`; x and z in `parent`, 0 faces +z. */
function drawn(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat: number | null, k: number): Figure {
  const root = group(parent, x, 0, z, ry);
  root.scale.setScalar(k);
  const kid = !!look.kid;
  const hr = kid ? 0.15 : 0.112;
  const sat = seat !== null;
  const hipY = sat ? seat + 0.08 : 0.88;
  for (const sx of [-1, 1]) {
    if (sat) {
      const knee = v3(sx * 0.1, hipY, 0.36);
      const ankle = v3(sx * 0.1, Math.max(0.07, hipY - 0.4), 0.4);
      rod(root, v3(sx * 0.09, hipY, -0.03), knee, 0.062, look.bottom);
      rod(root, knee, ankle, 0.05, look.bottom);
      part(root, rbox(0.1, 0.07, 0.19, 0.03), '#ffffff', sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    } else {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.058, look.bottom);
      part(root, rbox(0.1, 0.07, 0.19, 0.03), kid ? '#ffffff' : '#5d4037', sx * 0.09, 0.035, 0.04);
    }
  }
  part(root, rbox(0.3, 0.16, 0.22, 0.06), look.bottom, 0, hipY, 0);
  const torsoY = hipY + 0.25;
  const shoulderY = hipY + 0.44;
  part(root, rbox(0.34, 0.46, 0.22, 0.09), look.top, 0, torsoY, 0);
  part(root, cyl(0.045, 0.05, kid ? 0.04 : 0.08, 10), SKIN, 0, shoulderY + (kid ? 0.03 : 0.06), 0, { outline: false });
  const head = group(root, 0, shoulderY + hr + (kid ? 0.03 : 0.09), 0);
  part(head, ball(hr), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(hr * 0.11), '#2b2b30', sx * hr * 0.36, hr * 0.02, hr * 0.93, { outline: false });
  part(head, ring(hr * 0.17, hr * 0.03, Math.PI), '#c2185b', 0, -hr * 0.36, hr * 0.94, { outline: false, rz: Math.PI });
  part(head, ball(hr * 1.05), look.hair, 0, hr * 0.2, -hr * 0.2);
  part(head, rbox(hr * 1.65, hr * 0.38, hr * 0.4, hr * 0.16), look.hair, 0, hr * 0.62, hr * 0.6, { rx: -0.3 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, 0);
    const rest = sat ? v3(sx * 0.11, seat + 0.17, 0.24) : v3(sx * 0.23, 0.84, 0.06);
    const upper = limb(root, 0.044, look.top);
    const lower = limb(root, 0.036, kid ? look.top : SKIN);
    const hand = part(root, ball(0.04), SKIN, 0, 0, 0, { outline: false });
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
      const cosA = THREE.MathUtils.clamp((0.27 * 0.27 + L * L - 0.25 * 0.25) / (2 * 0.27 * L), -1, 1);
      bend.set(sx * 0.6, -1, -0.25).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, 0.27 * cosA).addScaledVector(bend, 0.27 * Math.sqrt(1 - cosA * cosA));
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
/** A child in `parent`, seated `seat` metres up or stood, played by a child's body as soon as one has come. */
function child(parent: THREE.Object3D, i: number, x: number, z: number, ry: number, seat: number | null, opts: FigureOptions): Figure {
  return vroidFigure(drawn(parent, KIDS[i % KIDS.length], x, z, ry, seat === null ? null : seat / TOT, TOT), { ...(seat === null ? {} : { seat }), ...opts });
}
/** Where a figure's mouth is, in its parent's frame, drawn or bodied. */
function mouthOf(f: Figure, out: THREE.Vector3): THREE.Vector3 {
  f.head.getWorldPosition(out);
  f.root.parent!.worldToLocal(out);
  const yaw = f.root.rotation.y;
  return out.add(v3(Math.sin(yaw) * 0.06, -0.05, Math.cos(yaw) * 0.06));
}

// ---------------------------------------------------------------------------------------------
// What's painted.

const paintNappyChart: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 200, 150);
  c.fillStyle = '#80cbc4';
  c.fillRect(0, 0, 200, 26);
  text(c, '교환대 위생 점검표', 100, 13, 13, '#ffffff', 'center');
  ['소독', '보충', '손 씻기', '점검'].forEach((s, i) => text(c, s, 74 + i * 34, 38, 9, '#00695c', 'center'));
  ['오전', '점심', '오후'].forEach((s, j) => {
    const y = 58 + j * 30;
    text(c, s, 26, y, 10, '#37474f', 'center');
    c.strokeStyle = '#e0e0e0';
    c.strokeRect(6, y - 14, 188, 28);
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = j < 2 ? '#26a69a' : '#cfd8dc';
      c.lineWidth = 2;
      c.strokeRect(68 + i * 34, y - 6, 12, 12);
      if (j < 2) {
        c.beginPath();
        c.moveTo(70 + i * 34, y);
        c.lineTo(74 + i * 34, y + 4);
        c.lineTo(79 + i * 34, y - 5);
        c.stroke();
      }
      c.lineWidth = 1;
    }
  });
  text(c, `${CENTRE} ${CLASS}`, 100, 141, 8, '#90a4ae', 'center', false);
};
const paintPad: Paint = (c) => {
  c.fillStyle = '#e0f2f1';
  c.fillRect(0, 0, 200, 120);
  const animals = ['#ffb74d', '#81c784', '#64b5f6', '#f06292'];
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 7; x++) {
      c.fillStyle = animals[(x + y) % 4];
      c.beginPath();
      c.arc(14 + x * 29 + (y % 2) * 12, 16 + y * 29, 7, 0, Math.PI * 2);
      c.arc(9 + x * 29 + (y % 2) * 12, 10 + y * 29, 3, 0, Math.PI * 2);
      c.arc(19 + x * 29 + (y % 2) * 12, 10 + y * 29, 3, 0, Math.PI * 2);
      c.fill();
    }
};
const paintOilcloth: Paint = (c) => {
  c.fillStyle = '#fff5e0';
  c.fillRect(0, 0, 512, 212);
  c.fillStyle = '#ffe0b2';
  for (let i = 0; i < 26; i++) for (let j = 0; j < 11; j++) if ((i + j) % 2) c.fillRect(i * 20, j * 20, 20, 20);
  const fruit: Array<[string, number, number]> = [['#ef5350', 50, 40], ['#fdd835', 140, 150], ['#66bb6a', 230, 50], ['#ff8a65', 330, 160], ['#ef5350', 430, 60], ['#fdd835', 470, 170], ['#66bb6a', 70, 170], ['#ff8a65', 280, 100]];
  for (const [k, x, y] of fruit) {
    c.fillStyle = k;
    c.beginPath();
    c.arc(x, y, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#558b2f';
    c.fillRect(x - 1, y - 18, 3, 7);
  }
};
const paintGrace: Paint = (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 240, 96);
  c.fillStyle = '#ffb74d';
  c.fillRect(0, 0, 240, 8);
  text(c, '잘 먹겠습니다!', 120, 36, 22, '#e65100', 'center');
  text(c, '오늘의 간식 · 바나나, 쌀떡, 우유', 120, 70, 12, '#6d4c41', 'center', false);
};
const NOTE = ['오늘 낮잠을 푹 잤어요.', '간식으로 바나나를', '맛있게 먹었어요.', '내일 여벌 옷 부탁드려요.'];
const paintNote: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#ffcc80';
  c.fillRect(0, 0, 256, 22);
  text(c, `${CLASS} 알림장`, 128, 11, 12, '#5d4037', 'center');
  c.fillStyle = '#d7ccc8';
  c.fillRect(127, 22, 2, 138);
  // The left page: a crayon drawing and yesterday's line.
  c.strokeStyle = '#ef6c00';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(62, 66, 20, 0, Math.PI * 2);
  c.moveTo(62, 90);
  c.lineTo(62, 130);
  c.stroke();
  text(c, '오늘의 사진', 62, 146, 9, '#8d6e63', 'center', false);
  NOTE.forEach((s, i) => {
    text(c, s, 134, 42 + i * 28, 10, '#37474f', 'left', false);
    c.fillStyle = '#eeeeee';
    c.fillRect(134, 52 + i * 28, 114, 1);
  });
};
const paintWelcome: Paint = (c) => {
  c.fillStyle = '#fff3e0';
  c.fillRect(0, 0, 360, 96);
  c.strokeStyle = '#a1887f';
  c.lineWidth = 4;
  c.strokeRect(4, 4, 352, 88);
  text(c, `${CENTRE} 집`, 180, 36, 26, '#6d4c41', 'center');
  text(c, '다녀왔습니다! 손부터 씻어요', 180, 70, 15, '#a1887f', 'center', false);
};
const paintEntryLog: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 140, 180);
  c.fillStyle = '#a5d6a7';
  c.fillRect(0, 0, 140, 22);
  text(c, '하원 · 체온 메모', 70, 11, 11, '#1b5e20', 'center');
  ['월', '화', '수', '목', '금'].forEach((s, i) => {
    const y = 40 + i * 26;
    text(c, s, 10, y, 11, '#37474f', 'left', false);
    text(c, i < 3 ? `36.${5 - i % 2}` : '', 100, y, 11, '#2e7d32', 'center', false);
    c.fillStyle = '#e0e0e0';
    c.fillRect(6, y + 12, 128, 1);
  });
};
const paintRuler: Paint = (c) => {
  c.fillStyle = '#fff9c4';
  c.fillRect(0, 0, 128, 512);
  // A giraffe up the side, the heights across.
  c.fillStyle = '#ffb74d';
  c.fillRect(82, 80, 22, 400);
  c.beginPath();
  c.ellipse(90, 66, 26, 20, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#a1662e';
  for (let i = 0; i < 9; i++) c.fillRect(85 + (i % 2) * 8, 104 + i * 42, 10, 16);
  c.fillStyle = '#3e2723';
  c.beginPath();
  c.arc(82, 60, 3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#37474f';
  for (let i = 0; i <= 12; i++) {
    const y = 500 - i * 38;
    c.fillRect(6, y, i % 2 ? 12 : 22, 2);
    if (i % 2 === 0) text(c, `${60 + i * 5}`, 42, y, 11, '#37474f', 'center', false);
  }
  const marks: Array<[string, number]> = [['서아', 7], ['하린', 8], ['도윤', 10]];
  for (const [n, i] of marks) {
    c.fillStyle = '#f06292';
    c.fillRect(6, 498 - i * 38, 60, 5);
    text(c, n, 36, 488 - i * 38, 10, '#ad1457', 'center');
  }
};
function familyPhoto(i: number): Paint {
  const bg = ['#bbdefb', '#c8e6c9', '#ffe0b2', '#f8bbd0', '#d1c4e9', '#fff9c4'][i % 6];
  return (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 96, 72);
    c.fillStyle = '#9ccc65';
    c.fillRect(0, 56, 96, 16);
    const n = 2 + (i % 3);
    for (let j = 0; j < n; j++) {
      const x = 96 * ((j + 0.5) / n);
      const small = j === n - 1;
      const h = small ? 24 : 38;
      c.fillStyle = PASTEL[(i + j * 2) % PASTEL.length];
      c.fillRect(x - 6, 62 - h + 10, 12, h - 10);
      c.fillStyle = '#f6d2b5';
      c.beginPath();
      c.arc(x, 62 - h + 4, small ? 6 : 7, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3e2723';
      c.beginPath();
      c.arc(x, 62 - h + 1, small ? 6 : 7, Math.PI, Math.PI * 2);
      c.fill();
    }
  };
}
const paintCalendar: Paint = (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 160, 96);
  text(c, '이달의 생일 친구', 80, 16, 13, '#ad1457', 'center');
  [['3일', '서아'], ['17일', '도윤']].forEach(([d, n], i) => {
    c.fillStyle = PASTEL[i * 3];
    c.fillRect(14 + i * 70, 34, 62, 46);
    text(c, d, 45 + i * 70, 48, 12, '#ffffff', 'center');
    text(c, n, 45 + i * 70, 66, 13, '#ffffff', 'center');
  });
};

// ---------------------------------------------------------------------------------------------
// The builders.

export const BUILDERS: Record<string, Builder> = {
  /**
   * The nappy station (기저귀 교환대): a white cabinet with a raised padded top in an animal print, drawers labelled,
   * baskets of folded nappies below, a caddy on top with wipes, a spray bottle, a pump of sanitiser, a pedal bin
   * alongside and the hygiene chart on the wall. Used only as the station is looked after: sprayed and wiped down,
   * nappies lifted from the carton into the caddy (the stack grows through the shift), the chart ticked, the hands
   * sanitised. No child is ever shown on it.
   */
  bsNappyStation(g, W, D, _c, _def, ctx, out) {
    const top = 0.88;
    const cw = W - 0.08;
    const cd = 0.56;
    const cz = -D / 2 + cd / 2 + 0.02;
    part(g, rbox(cw, top - 0.04, cd, 0.02), '#fafafa', 0, (top - 0.04) / 2 + 0.02, cz);
    part(g, rbox(cw + 0.02, 0.03, cd + 0.02, 0.012), OAK, 0, top + 0.005, cz);
    // Open baskets below, drawers above; each drawer with a tag and a little knob.
    const fz = cz + cd / 2;
    for (const sx of [-1, 1]) {
      part(g, rbox(cw / 2 - 0.05, 0.2, 0.014, 0.01), '#e0f2f1', sx * (cw / 4), 0.72, fz + 0.002);
      part(g, cyl(0.012, 0.012, 0.012, 10), '#26a69a', sx * (cw / 4), 0.72, fz + 0.014, { rx: Math.PI / 2, outline: false });
      const basket = group(g, sx * (cw / 4), 0.03, fz + 0.045);
      part(basket, rbox(cw / 2 - 0.08, 0.16, 0.085, 0.02), '#d7b98a', 0, 0.08, 0);
      for (let i = 0; i < 3; i++) nappy(basket, -0.09 + i * 0.09, 0.175, 0, sx > 0 ? '#f8bbd0' : '#b3e5fc');
      for (let i = 0; i < 2; i++) nappy(basket, -0.05 + i * 0.09, 0.21, 0, sx > 0 ? '#b3e5fc' : '#f8bbd0');
    }
    part(g, rbox(cw - 0.03, 0.34, 0.012, 0.01), '#eceff1', 0, 0.42, fz + 0.002);
    label(g, '여벌 옷 · 물티슈', 0.42, 0.07, 0, 0.5, fz + 0.012, '#eceff1', '#455a64');
    const stand = standAt(g, 0, fz + NP.stand, Math.PI, 'bsNappy');
    const L = (p: Loc) => inFrame(stand, p);
    // The padded top, with a soft rim all round; no strap, no figure: it stands ready.
    const padAt = L(NP.pad);
    const padW = 0.44;
    const padD = 0.42;
    part(g, rbox(padW + 0.06, 0.03, padD + 0.06, 0.012), '#80cbc4', 0, top + 0.03, padAt.z);
    flat(g, painted('bs-pad', 200, 120, paintPad), padW, padD, 0, top + 0.048, padAt.z);
    for (const sx of [-1, 1]) part(g, rbox(0.035, 0.05, padD + 0.06, 0.015), '#4db6ac', sx * (padW / 2 + 0.018), top + 0.06, padAt.z);
    part(g, rbox(padW, 0.05, 0.035, 0.015), '#4db6ac', 0, top + 0.06, padAt.z - padD / 2 - 0.015);
    // A clean sheen on the pad just after it's been wiped.
    const sheen = part(g, box(padW - 0.02, 0.002, padD - 0.02), '#ffffff', 0, top + 0.05, padAt.z, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }) });
    sheen.userData.ownMaterial = true;
    // The bottle, the clipboard, the pump and the caddy.
    const bottleHome = L(NP.bottle);
    const bottle = group(g, bottleHome.x, top + 0.02, bottleHome.z);
    part(bottle, cyl(0.03, 0.034, 0.12, 12), '#b2ebf2', 0, 0.06, 0);
    part(bottle, rbox(0.04, 0.03, 0.05, 0.008), '#00acc1', 0, 0.135, 0.01);
    label(bottle, '소독', 0.045, 0.024, 0, 0.06, 0.033, '#b2ebf2', '#006064');
    const clipAt = L(NP.clip);
    part(g, rbox(0.14, 0.012, 0.19, 0.004), '#8d6e63', clipAt.x, top + 0.026, clipAt.z);
    flat(g, painted('bs-nappy-chart', 200, 150, paintNappyChart), 0.125, 0.165, clipAt.x, top + 0.034, clipAt.z);
    const pumpAt = L(NP.pump);
    const pump = group(g, pumpAt.x, top + 0.02, pumpAt.z);
    part(pump, cyl(0.035, 0.04, 0.11, 14), '#e8f5e9', 0, 0.055, 0);
    const head = part(pump, rbox(0.03, 0.012, 0.05, 0.004), '#43a047', 0, 0.14, 0.012);
    part(pump, cyl(0.006, 0.006, 0.03, 6), '#43a047', 0, 0.125, 0, { outline: false });
    const caddyAt = L(NP.caddy);
    const caddy = group(g, caddyAt.x, top + 0.02, caddyAt.z);
    part(caddy, rbox(0.17, 0.012, 0.15, 0.004), '#b0bec5', 0, 0.006, 0);
    for (const sx of [-1, 1]) part(caddy, rbox(0.008, 0.08, 0.15, 0.003), '#b0bec5', sx * 0.085, 0.04, 0);
    const stack = Array.from({ length: 5 }, (_, i) => nappy(caddy, 0, 0.03 + i * 0.033, 0));
    // The pedal bin at the side, in the wipes' colour.
    const bin = group(g, -cw / 2 + 0.08, 0, 0.24);
    part(bin, cyl(0.1, 0.09, 0.3, 14), '#b2dfdb', 0, 0.15, 0);
    part(bin, cyl(0.105, 0.105, 0.025, 14), '#4db6ac', 0, 0.31, 0);
    part(bin, rbox(0.06, 0.012, 0.05, 0.004), '#607d8b', 0, 0.015, 0.11);
    if (ctx.againstWall) {
      picture(g, painted('bs-nappy-chart', 200, 150, paintNappyChart), 0.48, 0.36, 0, 1.4, -D / 2 + 0.015);
      part(g, rbox(0.5, 0.38, 0.008, 0.004), '#80cbc4', 0, 1.4, -D / 2 + 0.008);
    }
    // In use: the carton beside the feet, what's in the hands.
    const use = group(g);
    out.inUse = use;
    const cartonAt = L(NP.carton);
    const carton = group(use, cartonAt.x, 0, cartonAt.z);
    part(carton, rbox(0.26, 0.2, 0.22, 0.01), '#d7b98a', 0, 0.1, 0);
    for (const sx of [-1, 1]) part(carton, box(0.13, 0.004, 0.22), '#c8a26a', sx * 0.16, 0.205, 0, { rz: sx * -0.55, outline: false });
    label(carton, '기저귀', 0.15, 0.05, 0, 0.1, 0.112, '#d7b98a', '#5d4037');
    for (let i = 0; i < 3; i++) nappy(carton, -0.07 + i * 0.07, 0.215, 0);
    const cloth = part(use, rbox(0.14, 0.012, 0.1, 0.004), '#ffffff', 0, 0, 0);
    const held = nappy(use, 0, 0, 0);
    const pen = part(use, cyl(0.005, 0.005, 0.12, 8), '#26a69a', 0, 0, 0, { outline: false });
    const rubbing = Array.from({ length: 4 }, () => part(use, ball(0.009), '#e8f5e9', 0, 0, 0, { outline: false }));
    out.spots = { bsRestockNappies: stand, '*': stand };
    out.animate = (t) => {
      const now = inUse(stand, t);
      bottle.position.set(bottleHome.x, top + 0.02, bottleHome.z);
      bottle.rotation.set(0, 0, 0);
      stack.forEach((m, i) => (m.visible = i < 2));
      sheen.visible = false;
      head.position.y = 0.14;
      if (!now) return;
      const b = bsBeat('bsNappy', t, phaseOf(stand));
      const { l, r } = handsAt(stand, 'bsNappy', t);
      const has = 2 + (((b.n % 3) + 3) % 3);
      const got = b.i > 3 || (b.i === 3 && (b.e > 0 || b.u > 0.5));
      stack.forEach((m, i) => (m.visible = i < has + (got ? 1 : 0)));
      if (inBeat(b, 'spray')) {
        bottle.position.copy(r).add(v3(0, -0.08, 0));
        bottle.rotation.z = 0.2;
      }
      cloth.visible = inBeat(b, 'wipe');
      if (cloth.visible) cloth.position.copy(r).setY(top + 0.058);
      sheen.visible = b.i >= 2 && b.i <= 4;
      held.visible = b.i === 2 || (b.i === 3 && b.u < 0.5 && b.e === 0);
      if (held.visible) held.position.copy(r).addScaledVector(UP, -0.02);
      pen.visible = inBeat(b, 'chart');
      if (pen.visible) {
        pen.position.copy(r).addScaledVector(UP, 0.03);
        pen.rotation.set(0.5, 0, 0.3);
      }
      if (inBeat(b, 'pump')) head.position.y = 0.14 - 0.02 * Math.max(0, wave(t, 1.4));
      const rubOn = inBeat(b, 'rub');
      const mid = l.clone().lerp(r, 0.5);
      rubbing.forEach((m, i) => {
        m.visible = rubOn;
        if (rubOn) m.position.copy(mid).add(v3(0.05 * Math.cos(t * 3 + i * 1.6), 0.03 * Math.sin(t * 4 + i), 0.03 * Math.sin(t * 3 + i * 1.6)));
      });
    };
  },

  /**
   * The snack table (간식 상): a low oak table under a fruit-print oilcloth with four little chairs and a low stool at
   * the front, a tray of plates, a jug of milk, cups at each place, and over it the 잘 먹겠습니다 card. Serving: a plate
   * of banana and rice cake from the tray set before each child in turn with the nearer hand; hands together for 잘
   * 먹겠습니다 (the children's too); the oilcloth wiped; then watching them eat, each hand going up to the mouth.
   */
  bsSnackTable(g, W, D, _c, _def, ctx, out) {
    const top = 0.44;
    const tz = 0.02;
    const tw = Math.min(1.36, W - 0.5);
    const td = 0.56;
    part(g, rbox(tw, 0.04, td, 0.03), OAK, 0, top - 0.025, tz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.03, 0.026, top - 0.05, 10), OAK_D, sx * (tw / 2 - 0.08), (top - 0.05) / 2, tz + sz * (td / 2 - 0.07));
    flat(g, painted('bs-oilcloth', 512, 212, paintOilcloth), tw - 0.02, td - 0.02, 0, top - 0.003, tz);
    const seatY = 0.3;
    const seatZ = tz + td / 2 + 0.2;
    // The low stool at the front.
    const stool = group(g, 0, 0, seatZ);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(stool, cyl(0.016, 0.014, seatY - 0.03, 8), OAK_D, sx * 0.13, (seatY - 0.03) / 2, sz * 0.13, { outline: false });
    part(stool, cyl(0.19, 0.19, 0.035, 18), '#ffab91', 0, seatY - 0.018, 0);
    const serve = sitAt(g, 0, seatY, seatZ, Math.PI, 'bsServe');
    const L = (p: Loc) => inFrame(serve, p);
    // The children's chairs: two across, one at each end.
    const kidSeat = 0.26;
    const kidAt: Array<{ x: number; z: number; ry: number }> = [
      { x: -0.3, z: tz - td / 2 - 0.12, ry: 0 },
      { x: 0.3, z: tz - td / 2 - 0.12, ry: 0 },
      { x: -tw / 2 - 0.13, z: tz + 0.06, ry: Math.PI / 2 },
      { x: tw / 2 + 0.13, z: tz + 0.06, ry: -Math.PI / 2 },
    ];
    kidAt.forEach((p, i) => tinyChair(g, p.x, p.z, p.ry, PASTEL[(i * 3 + 1) % PASTEL.length], kidSeat));
    // The tray with the plates ready, the jug, a box of tissues.
    const trayAt = L(SV.tray);
    part(g, rbox(0.34, 0.012, 0.2, 0.02), '#ffcc80', trayAt.x, top + 0.006, trayAt.z);
    const trayPlates = Array.from({ length: 4 }, (_, i) => part(g, cyl(0.075, 0.06, 0.012, 18), '#ffffff', trayAt.x, top + 0.018 + i * 0.012, trayAt.z));
    const jug = group(g, tw / 2 - 0.16, top, tz + td / 2 - 0.12);
    part(jug, cyl(0.04, 0.045, 0.13, 14), '#ffffff', 0, 0.065, 0);
    label(jug, '우유', 0.045, 0.022, 0, 0.07, 0.046, '#42a5f5', '#ffffff');
    part(jug, ring(0.028, 0.006, Math.PI), '#ffffff', 0.045, 0.07, 0, { rz: -Math.PI / 2 });
    const tissues = group(g, -tw / 2 + 0.16, top, tz + td / 2 - 0.12);
    part(tissues, rbox(0.14, 0.05, 0.08, 0.008), '#f8bbd0', 0, 0.025, 0);
    part(tissues, box(0.05, 0.03, 0.02), '#ffffff', 0, 0.06, 0, { outline: false });
    // The 잘 먹겠습니다 card: on the wall, or stood on the table where the table is out in the room.
    if (!ctx.againstWall) {
      const card = group(g, 0, top, tz - td / 2 + 0.08);
      part(card, rbox(0.34, 0.15, 0.012, 0.004), '#ffb74d', 0, 0.08, 0, { rx: -0.12 });
      picture(card, painted('bs-grace', 240, 96, paintGrace), 0.32, 0.13, 0, 0.08, 0.008, '#ffffff', 0, -0.12);
    } else {
      picture(g, painted('bs-grace', 240, 96, paintGrace), 0.62, 0.25, 0, 1.3, -D / 2 + 0.015);
      for (let i = 0; i < 4; i++) {
        part(g, cyl(0.01, 0.01, 0.03, 6), '#a1887f', -0.72 + i * 0.16, 1.08, -D / 2 + 0.03, { rx: Math.PI / 2, outline: false });
        part(g, rbox(0.12, 0.17, 0.006, 0.02), PASTEL[(i + 2) % PASTEL.length], -0.72 + i * 0.16, 0.99, -D / 2 + 0.03);
      }
    }
    // In use: the children, what's on each place.
    const use = group(g);
    out.inUse = use;
    const placeAt = SV.places.map((p) => L(p));
    const kids = placeAt.map((_, i) => {
      const p = kidAt[i];
      return child(use, i, p.x, p.z, p.ry, kidSeat, { stage: 'child', gender: i % 2 ? 'female' : 'male', seed: 40 + i });
    });
    const plates = placeAt.map((p) => {
      const m = group(use, p.x, top + 0.002, p.z);
      part(m, cyl(0.075, 0.06, 0.012, 18), '#ffffff', 0, 0.006, 0);
      for (let i = 0; i < 3; i++) part(m, cyl(0.018, 0.018, 0.008, 10), '#fff59d', -0.03 + i * 0.024, 0.016, 0.018, { outline: false });
      part(m, rbox(0.05, 0.016, 0.03, 0.006), '#fafafa', 0.016, 0.02, -0.022);
      return m;
    });
    placeAt.forEach((p, i) => {
      const dir = i % 2 ? 1 : -1;
      part(use, cyl(0.026, 0.021, 0.06, 12), PASTEL[(i * 2 + 3) % PASTEL.length], p.x + dir * 0.1, top + 0.03, p.z + 0.03);
      part(use, cyl(0.022, 0.02, 0.006, 12), '#fffef7', p.x + dir * 0.1, top + 0.058, p.z + 0.03, { outline: false });
    });
    const handPlate = group(use);
    part(handPlate, cyl(0.075, 0.06, 0.012, 18), '#ffffff', 0, 0, 0);
    for (let i = 0; i < 3; i++) part(handPlate, cyl(0.018, 0.018, 0.008, 10), '#fff59d', -0.03 + i * 0.024, 0.01, 0.018, { outline: false });
    const bites = kids.map(() => part(use, ball(0.016), '#fff59d', 0, 0, 0, { outline: false }));
    const cloth = part(use, rbox(0.14, 0.01, 0.09, 0.004), '#b3e5fc', 0, 0, 0);
    const mouth = new THREE.Vector3();
    out.spots = { bsServeSnack: serve, '*': serve };
    out.animate = (t) => {
      const now = inUse(serve, t);
      trayPlates.forEach((m) => (m.visible = true));
      if (!now) return;
      const b = bsBeat('bsServe', t, phaseOf(serve));
      const sv = serveOf(b);
      const { l, r } = handsAt(serve, 'bsServe', t);
      trayPlates.forEach((m, i) => (m.visible = i < 4 - sv.set - (sv.inHand >= 0 ? 1 : 0)));
      plates.forEach((m, i) => (m.visible = i < sv.set));
      handPlate.visible = sv.inHand >= 0;
      if (handPlate.visible) handPlate.position.copy(sv.left ? l : r).addScaledVector(UP, -0.02);
      cloth.visible = inBeat(b, 'wipe');
      if (cloth.visible) cloth.position.copy(r).setY(top + 0.008);
      kids.forEach((f, i) => {
        const p = placeAt[i];
        const k = f.root;
        const given = i < sv.set;
        const lift = sv.eating && given ? Math.max(0, wave(t, 0.42, i * 0.27)) ** 2 : 0;
        const bite = bites[i];
        bite.visible = false;
        f.head.rotation.set(0.25, 0.05 * wave(t, 0.2, i * 0.4), 0);
        if (sv.grace) {
          const h = k.position.clone().lerp(v3(p.x, top + 0.22, p.z), 0.42);
          f.armL(h.clone().setY(top + 0.2));
          f.armR(h.clone().setY(top + 0.2));
          f.head.rotation.x = 0.4;
        } else if (given && sv.eating) {
          const from = v3(p.x, top + 0.03, p.z);
          mouthOf(f, mouth);
          const at = from.clone().lerp(mouth, lift);
          f.armR(at);
          f.armL(null);
          bite.visible = lift < 0.95;
          bite.position.copy(at);
          f.head.rotation.x = 0.3 - 0.15 * lift;
        } else {
          f.armL(null);
          f.armR(null);
        }
      });
    };
  },

  /**
   * The play kitchen (소꿉놀이 코너): a wooden toy kitchen at a toddler's height with a hob of two rings, an oven with a
   * window, a sink and tap, pots and a shelf of wooden fruit, a soft mat before it and a crate of toy food. Pretend
   * play: sat cross-legged on the mat while a toddler stirs a pot and carries a plate over; taken in both hands, a
   * pretend spoonful, 냠냠 with a pat of the tummy, a clap, and off they go to cook another.
   */
  bsPlayKitchen(g, W, D, _c, _def, ctx, out) {
    // The soft mat, in warm squares.
    const nx = 4;
    const nz = 2;
    const sw = (W - 0.06) / nx;
    const sd = (D + 0.5) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) part(g, rbox(sw - 0.006, 0.02, sd - 0.006, 0.006), ['#ffe0b2', '#fff9c4', '#ffccbc', '#dcedc8'][(i + j * 3) % 4], -W / 2 + 0.03 + sw * (i + 0.5), 0.01, -D / 2 + sd * (j + 0.5), { outline: false });
    // The toy kitchen.
    const kw = 1.14;
    const kd = 0.32;
    const kh = 0.56;
    const kz = -D / 2 + kd / 2 + 0.02;
    const k = group(g, -0.14, 0, kz);
    part(k, rbox(kw, kh, kd, 0.02), '#fff3e0', 0, kh / 2, 0);
    part(k, rbox(kw + 0.03, 0.03, kd + 0.03, 0.012), OAK, 0, kh + 0.015, 0);
    part(k, rbox(kw, 0.5, 0.02, 0.01), '#ffe0b2', 0, kh + 0.27, -kd / 2 + 0.012);
    for (const sx of [-1, 1]) part(k, rbox(0.03, 0.52, kd * 0.5, 0.01), OAK, sx * (kw / 2 - 0.015), kh + 0.27, -kd / 4);
    part(k, rbox(kw, 0.03, kd * 0.5, 0.01), OAK, 0, kh + 0.52, -kd / 4);
    // The oven below the hob: a door with a window, a knob row.
    const oven = group(k, -0.28, 0, kd / 2 + 0.002);
    part(oven, rbox(0.4, 0.36, 0.012, 0.012), '#ef9a9a', 0, 0.24, 0);
    part(oven, rbox(0.28, 0.15, 0.006, 0.01), '#546e7a', 0, 0.22, 0.008);
    rod(oven, v3(-0.13, 0.36, 0.022), v3(0.13, 0.36, 0.022), 0.008, '#fafafa');
    for (let i = 0; i < 3; i++) part(oven, cyl(0.02, 0.02, 0.02, 12), ['#ffeb3b', '#4fc3f7', '#f06292'][i], -0.1 + i * 0.1, 0.48, 0.01, { rx: Math.PI / 2 });
    // The cupboard beside it, with a flower on the door.
    const cup = group(k, 0.22, 0, kd / 2 + 0.002);
    part(cup, rbox(0.5, 0.4, 0.012, 0.012), '#a5d6a7', 0, 0.28, 0);
    part(cup, ball(0.02), '#fff59d', 0.18, 0.28, 0.012, { outline: false });
    // The hob: two rings; the pot on one, a pan on the other.
    const stoveX = -0.42;
    for (let i = 0; i < 2; i++) {
      part(k, cyl(0.075, 0.075, 0.006, 16), '#37474f', -0.28 + (i - 0.5) * 0.24, kh + 0.034, 0.02);
      part(k, ring(0.055, 0.005), '#ef5350', -0.28 + (i - 0.5) * 0.24, kh + 0.04, 0.02, { rx: Math.PI / 2, outline: false });
    }
    const pot = group(k, -0.28 - 0.12, kh + 0.036, 0.02);
    part(pot, cyl(0.06, 0.052, 0.08, 14), '#90caf9', 0, 0.04, 0);
    part(pot, ring(0.06, 0.006), '#64b5f6', 0, 0.08, 0, { rx: Math.PI / 2, outline: false });
    for (const sx of [-1, 1]) part(pot, rbox(0.03, 0.008, 0.02, 0.003), '#64b5f6', sx * 0.07, 0.06, 0);
    const pan = group(k, -0.28 + 0.12, kh + 0.036, 0.02);
    part(pan, cyl(0.06, 0.05, 0.025, 14), '#ffb74d', 0, 0.012, 0);
    part(pan, rbox(0.11, 0.012, 0.02, 0.004), '#8d6e63', 0.1, 0.022, 0);
    // The sink and tap, a toy dish in it.
    part(k, cyl(0.1, 0.085, 0.01, 18), '#cfd8dc', 0.28, kh + 0.034, 0.02).scale.set(1, 1, 0.65);
    part(k, cyl(0.012, 0.014, 0.11, 8), '#b0bec5', 0.28, kh + 0.085, -0.08);
    rod(k, v3(0.28, kh + 0.14, -0.08), v3(0.28, kh + 0.13, -0.02), 0.009, '#b0bec5');
    part(k, cyl(0.05, 0.042, 0.01, 12), '#f48fb1', 0.28, kh + 0.045, 0.03);
    // Above: the shelf of wooden fruit, ladle and whisk on hooks, a clock with big numbers.
    ['#ef5350', '#fdd835', '#ff8a65', '#66bb6a', '#ab47bc'].forEach((c, i) => part(k, ball(0.03), c, -0.4 + i * 0.1, kh + 0.57, -kd / 4 + 0.02));
    for (let i = 0; i < 3; i++) {
      rod(k, v3(0.1 + i * 0.13, kh + 0.44, -kd / 2 + 0.03), v3(0.1 + i * 0.13, kh + 0.27, -kd / 2 + 0.03), 0.006, ['#ffb74d', '#81c784', '#e57373'][i]);
      part(k, ball(0.024), ['#ffb74d', '#81c784', '#e57373'][i], 0.1 + i * 0.13, kh + 0.25, -kd / 2 + 0.03).scale.set(1, 1, 0.4);
    }
    part(k, cyl(0.07, 0.07, 0.012, 18), '#ffffff', -0.32, kh + 0.36, -kd / 2 + 0.03, { rx: Math.PI / 2 });
    rod(k, v3(-0.32, kh + 0.36, -kd / 2 + 0.04), v3(-0.32, kh + 0.41, -kd / 2 + 0.04), 0.005, '#37474f');
    rod(k, v3(-0.32, kh + 0.36, -kd / 2 + 0.04), v3(-0.285, kh + 0.36, -kd / 2 + 0.04), 0.005, '#37474f');
    // The crate of toy food at the side.
    const crate = group(g, W / 2 - 0.24, 0.02, kz + 0.02);
    part(crate, rbox(0.38, 0.17, 0.3, 0.012), OAK, 0, 0.085, 0);
    label(crate, '우리 가게', 0.26, 0.06, 0, 0.09, 0.154, OAK, '#5d4037');
    ['#ef5350', '#fdd835', '#66bb6a', '#ff8a65', '#ab47bc', '#ffcc80'].forEach((c, i) => part(crate, ball(0.04), c, -0.11 + (i % 3) * 0.11, 0.18 + Math.floor(i / 3) * 0.03, -0.05 + Math.floor(i / 3) * 0.08));
    if (ctx.againstWall) label(g, `${CLASS} 소꿉놀이`, 0.8, 0.13, 0, 1.42, -D / 2 + 0.015, CREAM, '#e65100');
    // Where everybody is.
    const sitZ = 0.62;
    const dweller = sitAt(g, 0, 0.024, sitZ, Math.PI, 'bsPretend', true);
    const offer = v3(0, 0, sitZ - 0.5);
    const cook = v3(-0.14 + stoveX + 0.02, 0, kz + kd / 2 + 0.12);
    // In use.
    const use = group(g);
    out.inUse = use;
    const tot = child(use, 4, cook.x, cook.z, Math.PI, null, { stage: 'toddler', gender: 'female', seed: 45 });
    const ladle = group(use);
    part(ladle, cyl(0.006, 0.006, 0.14, 6), '#ffb74d', 0, 0.04, 0, { outline: false });
    part(ladle, ball(0.018), '#ffb74d', 0, -0.03, 0, { outline: false });
    const plate = group(use);
    part(plate, cyl(0.07, 0.056, 0.012, 16), '#fff59d', 0, 0, 0);
    part(plate, ball(0.028), '#ef5350', 0, 0.022, 0);
    part(plate, ball(0.02), '#66bb6a', 0.03, 0.018, 0.018);
    const spoon = group(use);
    part(spoon, cyl(0.005, 0.005, 0.12, 6), '#8d6e63', 0, 0.05, 0, { outline: false });
    part(spoon, ball(0.016), '#a1887f', 0, -0.015, 0, { outline: false });
    const potAt = v3(k.position.x + pot.position.x, kh + 0.08, kz + pot.position.z);
    const twoHands = (at: THREE.Vector3, yaw: number) => {
      const across = v3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(0.06);
      tot.armL(at.clone().add(across));
      tot.armR(at.clone().sub(across));
    };
    out.spots = { bsPretendPlay: dweller, '*': dweller };
    out.work = marker(g, offer.x, 0.4, offer.z + 0.16);
    out.animate = (t) => {
      if (!inUse(dweller, t)) return;
      const b = bsBeat('bsPretend', t, phaseOf(dweller));
      const { l, r } = handsAt(dweller, 'bsPretend', t);
      // Where the toddler is on the round: at the stove, then at the mat, walking between.
      const walk = (from: THREE.Vector3, to: THREE.Vector3, u: number) => {
        const d = to.clone().sub(from);
        tot.root.position.copy(from).lerp(to, u);
        tot.root.position.y = Math.abs(Math.sin(u * Math.PI * 5)) * 0.018;
        tot.root.rotation.y = Math.atan2(d.x, d.z);
      };
      const here = b.from === 'cook' && b.e === 0;
      const going = (b.from === 'cook' && b.e > 0) || b.from === 'carry';
      const leaving = b.from === 'back';
      tot.root.position.y = 0;
      if (here) {
        tot.root.position.copy(cook);
        tot.root.rotation.y = Math.PI;
      } else if (going) walk(cook, offer, b.from === 'cook' ? b.e * 0.05 : b.e > 0 ? 1 : Math.min(1, b.u));
      else if (leaving) walk(offer, cook, b.e > 0 ? 1 : b.u);
      else {
        tot.root.position.copy(offer);
        tot.root.rotation.y = 0;
      }
      const yaw = tot.root.rotation.y;
      const front = v3(Math.sin(yaw), 0, Math.cos(yaw));
      const inFront = tot.root.position.clone().addScaledVector(front, 0.17).setY(0.42);
      ladle.visible = here;
      spoon.visible = inBeat(b, 'eat');
      const withKid = going || (b.from === 'take' && b.u < 0.5);
      plate.visible = withKid || b.from === 'take' || b.from === 'eat' || b.from === 'yum';
      if (here) {
        // Stirring, the other hand on the pot.
        const stir = potAt.clone().add(v3(0.03 * Math.cos(t * 3.2), 0.05, 0.03 * Math.sin(t * 3.2)));
        tot.armR(stir);
        tot.armL(potAt.clone().add(v3(0.1, -0.02, 0)));
        ladle.position.copy(stir);
        tot.head.rotation.set(0.3, 0, 0);
      } else if (withKid) {
        twoHands(inFront, yaw);
        plate.position.copy(inFront).addScaledVector(UP, 0.015);
        tot.head.rotation.set(0.1, 0, 0);
      } else if (b.from === 'clap') {
        const c = 0.035 * Math.abs(wave(t, 2.4));
        tot.armL(inFront.clone().setY(0.56).add(v3(c + 0.02, 0, 0)));
        tot.armR(inFront.clone().setY(0.56).add(v3(-c - 0.02, 0, 0)));
        tot.head.rotation.set(-0.15, 0, 0);
      } else {
        tot.armL(null);
        tot.armR(null);
        tot.head.rotation.set(-0.1, 0.1 * wave(t, 0.5), 0);
      }
      if (!withKid && plate.visible) plate.position.copy(l).lerp(b.from === 'take' ? r : l, 0.5).addScaledVector(UP, -0.015);
      if (spoon.visible) spoon.position.copy(r);
    };
  },

  /**
   * The 알림장 desk (알림장 책상): a small home writing desk with a hutch of binders and a warm lamp, a stack of the
   * children's notebooks in their colours, a pile of the done, a pen pot, a sheet of stickers, today's printed photo.
   * Writing the note to parents: a notebook off the stack, opened flat, today's lines written one by one (the words
   * appear as the pen goes), a sticker pressed on, closed, filed on the done pile; the done pile grows.
   */
  bsNoteDesk(g, W, D, _c, _def, ctx, out) {
    const top = 0.72;
    const dw = W - 0.1;
    const dd = 0.46;
    const dz = -D / 2 + dd / 2 + 0.02;
    part(g, rbox(dw, 0.035, dd, 0.012), OAK, 0, top - 0.018, dz);
    for (const sx of [-1, 1]) part(g, rbox(0.03, top - 0.03, dd - 0.04, 0.008), OAK_D, sx * (dw / 2 - 0.03), (top - 0.03) / 2, dz);
    part(g, rbox(dw - 0.06, 0.24, 0.015, 0.006), '#efe0c6', 0, top - 0.15, dz - dd / 2 + 0.02);
    part(g, rbox(0.3, 0.09, 0.012, 0.006), '#efe0c6', dw / 2 - 0.22, top - 0.09, dz + dd / 2 - 0.02);
    part(g, cyl(0.009, 0.009, 0.01, 8), OAK_D, dw / 2 - 0.22, top - 0.09, dz + dd / 2 - 0.012, { rx: Math.PI / 2, outline: false });
    // The hutch: binders with hand-written spines.
    if (ctx.againstWall) {
      const hz = -D / 2 + 0.09;
      for (const sx of [-1, 1]) part(g, rbox(0.022, 0.5, 0.14, 0.006), OAK_D, sx * (dw / 2 - 0.02), top + 0.25, hz);
      part(g, rbox(dw, 0.022, 0.15, 0.006), OAK, 0, top + 0.5, hz);
      part(g, rbox(dw, 0.022, 0.15, 0.006), OAK, 0, top + 0.26, hz);
      [['보육일지', '#ffcc80'], ['투약 의뢰', '#a5d6a7'], ['귀가 동의', '#90caf9'], ['식단표', '#f48fb1']].forEach(([s, k], i) => {
        const x = -dw / 2 + 0.12 + i * 0.16;
        part(g, rbox(0.13, 0.22, 0.1, 0.008), k, x, top + 0.39, hz);
        label(g, s, 0.1, 0.04, x, top + 0.42, hz + 0.052, k, '#37474f');
      });
    }
    const lamp = group(g, dw / 2 - 0.13, top, dz - 0.12);
    part(lamp, cyl(0.06, 0.07, 0.02, 14), '#a1887f', 0, 0.01, 0);
    rod(lamp, v3(0, 0.02, 0), v3(0, 0.26, 0.05), 0.008, '#a1887f');
    part(lamp, cyl(0.05, 0.09, 0.09, 14), '#fff3e0', 0, 0.3, 0.06);
    const bulb = glowing(lamp, ball(0.03), '#fff59d', 0, 0.275, 0.06);
    // The chair.
    const seatY = 0.44;
    const seatZ = dz + dd / 2 + 0.2;
    const ch = group(g, 0, 0, seatZ);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(ch, cyl(0.016, 0.014, seatY - 0.03, 8), OAK_D, sx * 0.16, (seatY - 0.03) / 2, sz * 0.15, { outline: false });
    part(ch, rbox(0.4, 0.035, 0.36, 0.015), OAK, 0, seatY - 0.018, 0);
    part(ch, rbox(0.36, 0.022, 0.32, 0.012), '#ffcc80', 0, seatY + 0.002, 0);
    for (const sx of [-1, 1]) part(ch, cyl(0.014, 0.014, 0.4, 8), OAK_D, sx * 0.16, seatY + 0.2, 0.17, { outline: false });
    part(ch, rbox(0.36, 0.11, 0.022, 0.008), OAK, 0, seatY + 0.36, 0.17);
    const dweller = sitAt(g, 0, seatY, seatZ, Math.PI, 'bsNote');
    const L = (p: Loc) => inFrame(dweller, p);
    // The notebooks, the done pile, the stickers, the pen pot, the photo.
    const colors = ['#ffcc80', '#a5d6a7', '#90caf9', '#f8bbd0', '#ce93d8', '#fff59d'];
    const book = (parent: THREE.Object3D, k: string, x: number, y: number, z: number, ry = 0) => {
      const m = part(parent, rbox(0.15, 0.012, 0.2, 0.004), k, x, y, z, { ry });
      part(m, box(0.09, 0.002, 0.03), '#ffffff', 0, 0.007, -0.04, { outline: false });
      return m;
    };
    const stackAt = L(NT.stack);
    const doneAt = L(NT.done);
    const stack = colors.map((k, i) => book(g, k, stackAt.x, top + 0.006 + i * 0.012, stackAt.z, (i - 2.5) * 0.02));
    const done = colors.map((k, i) => book(g, k, doneAt.x, top + 0.006 + i * 0.012, doneAt.z, (2.5 - i) * 0.03));
    const stickerAt = L(NT.stickers);
    part(g, rbox(0.1, 0.004, 0.12, 0.002), '#ffffff', stickerAt.x, top + 0.002, stickerAt.z);
    for (let i = 0; i < 6; i++) part(g, cyl(0.013, 0.013, 0.003, 10), '#ffd54f', stickerAt.x - 0.028 + (i % 2) * 0.056, top + 0.005, stickerAt.z - 0.04 + Math.floor(i / 2) * 0.04, { outline: false });
    const penPot = group(g, -dw / 2 + 0.12, top, dz - 0.12);
    part(penPot, cyl(0.03, 0.026, 0.09, 12), '#4fc3f7', 0, 0.045, 0);
    for (let i = 0; i < 3; i++) part(penPot, cyl(0.004, 0.004, 0.12, 6), ['#e53935', '#1e88e5', '#43a047'][i], (i - 1) * 0.01, 0.11, 0, { rz: (i - 1) * 0.13, outline: false });
    // In use: the open notebook, its words showing as they're written, the pen, the sticker.
    const padAt = L(NT.pad);
    const use = group(g);
    out.inUse = use;
    const open = group(use, padAt.x, top + 0.003, padAt.z);
    const tex = painted('bs-note', 256, 160, paintNote);
    // It reads the writer's way (they look along -z, their right hand on +x).
    flat(open, tex, 0.34, 0.21, 0, 0.004, 0);
    part(open, rbox(0.355, 0.006, 0.225, 0.003), '#ffcc80', 0, 0, 0);
    // A sheet of blank paper over the right-hand page, drawn back as the lines are written.
    const blank = part(open, box(0.165, 0.002, 0.18), PAPER, 0.085, 0.007, 0.0, { outline: false });
    const sticker = part(open, cyl(0.018, 0.018, 0.003, 12), '#ffd54f', 0.14, 0.009, -0.075, { outline: false });
    const closed = book(use, colors[0], 0, 0, 0);
    const pen = group(use);
    part(pen, cyl(0.005, 0.004, 0.12, 8), '#e53935', 0, 0.04, 0, { outline: false });
    const stuck = part(use, cyl(0.016, 0.016, 0.003, 10), '#ffd54f', 0, 0, 0, { outline: false });
    out.spots = { bsWriteNote: dweller, '*': dweller };
    out.work = marker(g, padAt.x, top + 0.01, padAt.z);
    out.animate = (t) => {
      const now = inUse(dweller, t);
      bulb.visible = now;
      if (!now) {
        stack.forEach((m) => (m.visible = true));
        done.forEach((m, i) => (m.visible = i < 2));
        return;
      }
      const b = bsBeat('bsNote', t, phaseOf(dweller));
      const { l, r } = handsAt(dweller, 'bsNote', t);
      const round = ((b.n % 6) + 6) % 6;
      stack.forEach((m, i) => (m.visible = i < 6 - round - (b.i > 0 || b.u > 0.5 ? 1 : 0)));
      done.forEach((m, i) => (m.visible = i < round + (b.from === 'file' && b.u > 0.6 ? 1 : 0)));
      const isOpen = b.i >= 1 && b.i <= 3 && !(b.from === 'open' && b.u < 0.4);
      open.visible = isOpen;
      closed.visible = !isOpen && (b.i <= 1 || b.i === 4 || (b.i === 5 && b.u < 0.6 && b.e === 0));
      if (closed.visible) {
        const inL = b.from === 'take' || (b.from === 'open' && b.u < 0.4);
        const pos = inL ? l : r;
        closed.position.copy(pos).addScaledVector(UP, -0.012);
      }
      const written = b.i > 2 ? 1 : b.from === 'write' ? (b.e > 0 ? 1 : b.u) : 0;
      blank.scale.z = Math.max(0.001, 1 - written);
      blank.position.z = 0.09 * written;
      blank.visible = written < 1;
      sticker.visible = b.i >= 4 || (b.i === 3 && b.u > 0.6);
      pen.visible = b.from === 'write' && b.e === 0;
      if (pen.visible) {
        pen.position.copy(r);
        pen.rotation.set(0.45, 0, 0.3);
      }
      stuck.visible = b.from === 'stick' && b.u < 0.6;
      if (stuck.visible) stuck.position.copy(r).addScaledVector(UP, -0.01);
    };
  },

  /**
   * The entryway (현관 맞이 공간): a mat by the wall with little shoes on a low bench, small coats on a rail, the
   * centre's welcome sign and the temperature log, a low stand with the forehead thermometer in its cradle and a pump
   * of sanitiser. Meeting a child: a bow to the parent behind them, their bag taken in both hands and set down, a
   * crouch to the child's height, the thermometer read at the forehead until it shows 36.5 in green, a high five; up
   * again to wave the parent off. The parent and the child are there only while it's done.
   */
  bsEntry(g, W, D, _c, _def, ctx, out) {
    // The mat, a warm coir colour with a border.
    part(g, rbox(W - 0.1, 0.018, D - 0.12, 0.008), '#c8ad86', 0, 0.009, 0);
    part(g, rbox(W - 0.24, 0.019, D - 0.26, 0.008), '#dcc8a6', 0, 0.01, 0);
    const matWord = label(g, '어서 오세요', 0.46, 0.09, 0.2, 0.021, 0.2, '#dcc8a6', '#6d4c41');
    matWord.rotation.set(-Math.PI / 2, 0, 0);
    // The bench: cushion on top, little shoes below.
    const bench = group(g, 0.34, 0, -D / 2 + 0.17);
    part(bench, rbox(1.0, 0.03, 0.28, 0.01), OAK, 0, 0.32, 0);
    part(bench, rbox(0.92, 0.025, 0.24, 0.012), '#ffcc80', 0, 0.345, 0);
    for (const sx of [-1, 1]) part(bench, rbox(0.03, 0.3, 0.26, 0.008), OAK_D, sx * 0.47, 0.16, 0);
    part(bench, rbox(0.95, 0.018, 0.25, 0.006), OAK, 0, 0.14, 0);
    const shoeC = ['#ef5350', '#42a5f5', '#fdd835', '#66bb6a', '#ab47bc'];
    shoeC.forEach((k, i) => {
      for (const sx of [-1, 1]) {
        part(bench, rbox(0.06, 0.04, 0.12, 0.02), k, -0.36 + i * 0.18 + sx * 0.035, 0.17, 0.03);
        part(bench, rbox(0.055, 0.036, 0.11, 0.018), shade(k, 1.1), -0.36 + i * 0.18 + sx * 0.035, 0.02 + 0.016, 0.03);
      }
    });
    // The rail of small coats, the sign and the log on the wall.
    if (ctx.againstWall) {
      rod(g, v3(-0.2, 1.08, -D / 2 + 0.05), v3(0.9, 1.08, -D / 2 + 0.05), 0.012, OAK_D);
      for (let i = 0; i < 4; i++) {
        const x = -0.04 + i * 0.26;
        part(g, rbox(0.2, 0.32, 0.05, 0.03), PASTEL[(i * 3 + 1) % PASTEL.length], x, 0.9, -D / 2 + 0.055);
        part(g, cyl(0.006, 0.006, 0.03, 6), '#90a4ae', x, 1.06, -D / 2 + 0.05, { outline: false });
        for (const sx of [-1, 1]) part(g, rbox(0.05, 0.22, 0.04, 0.02), shade(PASTEL[(i * 3 + 1) % PASTEL.length], 0.92), x + sx * 0.12, 0.92, -D / 2 + 0.055);
      }
      picture(g, painted('bs-welcome', 360, 96, paintWelcome), 0.96, 0.26, 0.28, 1.46, -D / 2 + 0.015);
      picture(g, painted('bs-entry-log', 140, 180, paintEntryLog), 0.3, 0.38, -0.72, 1.42, -D / 2 + 0.015);
    }
    // The low stand with its cradle and sanitiser, beside where the dweller stands.
    const dweller = standAt(g, -0.52, 0.62, Math.PI / 2, 'bsGreet');
    const L = (p: Loc) => inFrame(dweller, p);
    const cradleAt = L(GR.cradle);
    const st = group(g, cradleAt.x, 0, cradleAt.z);
    part(st, cyl(0.016, 0.02, 0.82, 10), '#b0bec5', 0, 0.42, 0);
    part(st, cyl(0.12, 0.13, 0.02, 16), '#90a4ae', 0, 0.02, 0);
    part(st, rbox(0.22, 0.02, 0.16, 0.008), '#eceff1', 0, 0.84, 0);
    part(st, rbox(0.05, 0.05, 0.06, 0.01), '#607d8b', 0.05, 0.875, 0);
    const pump = group(st, -0.06, 0.85, 0);
    part(pump, cyl(0.025, 0.03, 0.08, 12), '#e8f5e9', 0, 0.04, 0);
    part(pump, rbox(0.02, 0.008, 0.036, 0.003), '#43a047', 0, 0.09, 0.006);
    // The thermometer: on its cradle, or in the hand with the reading shown.
    const therm = group(g);
    part(therm, rbox(0.04, 0.12, 0.03, 0.01), '#f5f5f5', 0, 0, 0);
    part(therm, rbox(0.035, 0.05, 0.08, 0.012), '#eeeeee', 0, 0.075, 0.03);
    part(therm, cyl(0.012, 0.016, 0.012, 10), '#37474f', 0, 0.075, 0.075, { rx: Math.PI / 2, outline: false });
    const read = glowing(therm, new THREE.BoxGeometry(0.028, 0.024, 0.002), '#69f0ae', 0, 0.075, -0.012);
    const thermLabel = label(therm, '36.5', 0.026, 0.02, 0, 0.075, -0.0135, '#69f0ae', '#1b5e20', Math.PI);
    // In use: the child, the parent behind them, the bag.
    const use = group(g);
    out.inUse = use;
    const yaw = dweller.at.rotation.y;
    const fwd = v3(Math.sin(yaw), 0, Math.cos(yaw));
    const childAt = dweller.at.position.clone().addScaledVector(fwd, GR.child);
    const parentAt = dweller.at.position.clone().addScaledVector(fwd, GR.parent).add(v3(0, 0, 0.08));
    const kid = child(use, 0, childAt.x, childAt.z, yaw + Math.PI, null, { stage: 'toddler', gender: 'female', seed: 47 });
    const parent = vroidFigure(drawn(use, PARENT, parentAt.x, parentAt.z, yaw + Math.PI, null, 1), { gender: 'female', seed: 48 });
    const bag = group(use);
    part(bag, rbox(0.2, 0.22, 0.1, 0.05), '#ffb74d', 0, 0, 0);
    part(bag, rbox(0.14, 0.08, 0.02, 0.02), '#fb8c00', 0, -0.04, 0.055);
    rod(bag, v3(-0.03, 0.11, 0), v3(0.03, 0.11, 0), 0.008, '#5d4037');
    const flash = glowing(use, ball(0.018), '#69f0ae', 0, 0, 0);
    const up = (f: Figure, x: number, y: number, z: number) => v3(x, y, z).applyAxisAngle(UP, f.root.rotation.y).add(f.root.position);
    out.spots = { bsGreetChild: dweller, '*': dweller };
    out.animate = (t) => {
      therm.visible = true;
      therm.position.set(cradleAt.x + 0.05, 0.96, cradleAt.z);
      therm.rotation.set(0, Math.PI / 2, 0);
      read.visible = thermLabel.visible = false;
      flash.visible = false;
      if (!inUse(dweller, t)) return;
      const b = bsBeat('bsGreet', t, phaseOf(dweller));
      const { l, r } = handsAt(dweller, 'bsGreet', t);
      const holding = b.i >= 2 && b.i <= 5 && !(b.from === 'pick' && b.u < 0.5);
      if (holding) {
        therm.position.copy(r).addScaledVector(UP, -0.03);
        therm.rotation.set(0, yaw, 0);
      }
      const scanning = inBeat(b, 'scan') || inBeat(b, 'read');
      read.visible = thermLabel.visible = inBeat(b, 'read') || (b.from === 'scan' && b.u > 0.7);
      flash.visible = scanning && !read.visible;
      if (flash.visible) flash.position.copy(r).addScaledVector(fwd, 0.08).addScaledVector(UP, 0.04);
      // The bag: on the parent's arm, into the dweller's hands, then set down by the bench.
      if (b.i === 0 || (b.from === 'bag' && b.u < 0.5)) bag.position.copy(up(parent, 0.05, 0.96, 0.32));
      else if (b.from === 'bag') bag.position.copy(l).lerp(r, 0.5).addScaledVector(UP, -0.08);
      else bag.position.set(dweller.at.position.x + 0.15, 0.12, dweller.at.position.z - 0.4);
      // The parent: the bag held out, a small bow, a wave as they go.
      const greeted = b.from === 'bow';
      const waving = b.from === 'wave' || b.to === 'wave';
      parent.armL(greeted || (b.from === 'bag' && b.u < 0.5) ? up(parent, 0.14, 0.96, 0.3) : null);
      parent.armR(waving ? up(parent, -0.22 + 0.07 * wave(t, 1.5, 0.3), 1.42, 0.18) : greeted || (b.from === 'bag' && b.u < 0.5) ? up(parent, -0.08, 0.96, 0.3) : null);
      parent.head.rotation.set(greeted ? 0.3 : 0, 0, 0);
      // The child: looks up at the thermometer, holds their hand up for the five, waves.
      kid.head.rotation.set(-0.3, 0.06 * wave(t, 0.3), 0);
      const five = b.from === 'five';
      kid.armR(five ? r.clone().addScaledVector(UP, -0.005) : waving ? up(kid, -0.16 + 0.05 * wave(t, 1.8), 0.82, 0.08) : null);
      kid.armL(null);
    };
  },

  /**
   * The family wall (우리 가족 사진 벽 · 키재기 자): a giraffe height chart from the floor up with the children's marks in
   * pink, framed drawings of each child's family, this month's birthdays, a low basket of soft toys.
   */
  bsFamilyWall(g, _W, D, _c, _def, _ctx, _out) {
    const wz = -D / 2 + 0.018;
    picture(g, painted('bs-ruler', 128, 512, paintRuler), 0.3, 1.2, -0.3, 0.72, wz);
    part(g, rbox(0.32, 1.22, 0.012, 0.006), OAK, -0.3, 0.72, wz - 0.008);
    for (let i = 0; i < 6; i++) {
      const x = 0.0 + (i % 2) * 0.24;
      const y = 1.5 - Math.floor(i / 2) * 0.27;
      const m = picture(g, painted(`bs-family-${i}`, 96, 72, familyPhoto(i)), 0.2, 0.15, x + 0.02, y, wz + 0.01);
      m.rotation.z = (i % 3 === 1 ? 1 : -1) * 0.03;
      part(g, rbox(0.23, 0.18, 0.012, 0.006), ['#a1887f', '#ffb74d', '#81c784', '#64b5f6'][i % 4], x + 0.02, y, wz);
    }
    picture(g, painted('bs-birthdays', 160, 96, paintCalendar), 0.42, 0.26, 0.13, 0.66, wz + 0.004);
    const basket = group(g, 0.12, 0, -D / 2 + 0.24);
    part(basket, cyl(0.17, 0.14, 0.2, 16), '#d7b98a', 0, 0.1, 0);
    part(basket, ring(0.17, 0.012), '#a98352', 0, 0.2, 0, { rx: Math.PI / 2 });
    PASTEL.slice(0, 4).forEach((k, i) => part(basket, ball(0.07), k, Math.cos(i * 1.6) * 0.07, 0.22, Math.sin(i * 1.6) * 0.07));
    for (const sx of [-1, 1]) part(basket, ball(0.03), '#f48fb1', sx * 0.04, 0.3, 0.02, { outline: false });
  },

  /**
   * The living room's play mat (거실 놀이 매트, 3 × 2, 2026-11-05, the layout audit): the thick folding mat a Korean family lays
   * over the living-room floor, pastel panels with their seams, the alphabet and animals printed on it; the toys left about on
   * it — a tower of blocks, a toy car, a shape sorter, a soft bunny, a picture book open face down.
   */
  bsPlayMat(g, W, D) {
    const mw = W - 0.16;
    const md = D - 0.16;
    const panels = 4;
    for (let i = 0; i < panels; i++) {
      const pw = mw / panels;
      part(g, rbox(pw - 0.01, 0.04, md, 0.015), ['#ffe0b2', '#c8e6c9', '#bbdefb', '#f8bbd0'][i], -mw / 2 + pw * (i + 0.5), 0.02, 0);
    }
    flat(g, painted('bs-mat-print', 384, 256, paintMatPrint), mw - 0.1, md - 0.1, 0, 0.042, 0);
    // A tower of blocks.
    PASTEL.slice(0, 5).forEach((k, i) => part(g, rbox(0.1, 0.1, 0.1, 0.01), k, -0.85 + (i % 2) * 0.012, 0.09 + i * 0.1, -0.3, { ry: i * 0.3 }));
    for (let i = 0; i < 4; i++) part(g, rbox(0.1, 0.1, 0.1, 0.01), PASTEL[(i + 3) % 8], -0.6 + i * 0.13, 0.09, -0.05 - (i % 2) * 0.09, { ry: i * 0.7 });
    // A toy car.
    const car = group(g, 0.35, 0.04, 0.3, 0.6);
    part(car, rbox(0.26, 0.08, 0.13, 0.03), '#e53935', 0, 0.07, 0);
    part(car, rbox(0.13, 0.07, 0.11, 0.03), '#ffcdd2', -0.02, 0.14, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(car, cyl(0.035, 0.035, 0.03, 12), '#263238', sx * 0.08, 0.035, sz * 0.065, { rx: Math.PI / 2, outline: false });
    // A shape sorter.
    const sorter = group(g, 0.95, 0.04, -0.35);
    part(sorter, rbox(0.22, 0.18, 0.22, 0.02), '#ffca28', 0, 0.09, 0);
    part(sorter, cyl(0.03, 0.03, 0.005, 12), '#e65100', -0.05, 0.181, 0.04, { outline: false });
    part(sorter, box(0.06, 0.005, 0.06), '#1565c0', 0.05, 0.181, -0.04, { outline: false });
    part(g, cyl(0.04, 0.04, 0.04, 12), '#43a047', 0.7, 0.06, -0.1);
    // A soft bunny sat on the mat.
    const bunny = group(g, -0.2, 0.04, 0.35, -0.4);
    part(bunny, ball(0.1), '#fce4ec', 0, 0.1, 0);
    part(bunny, ball(0.075), '#fce4ec', 0, 0.24, 0.02);
    for (const sx of [-1, 1]) part(bunny, rbox(0.035, 0.13, 0.02, 0.012), '#f8bbd0', sx * 0.035, 0.36, 0.0, { rz: sx * -0.15 });
    for (const sx of [-1, 1]) part(bunny, ball(0.01), '#3e2723', sx * 0.025, 0.25, 0.09, { outline: false });
    // A picture book left open, face down.
    const book = group(g, 0.25, 0.045, -0.4, 0.3);
    for (const sx of [-1, 1]) part(book, box(0.16, 0.012, 0.22), '#4fc3f7', sx * 0.082, 0.012, 0, { rz: sx * -0.12 });
  },

  /**
   * The playground's swings (놀이터 그네, 2 × 1, 2026-11-05, the layout audit): a steel A-frame in the 단지 playground's colours,
   * two rubber seats on chains over a patch of the soft rubber surfacing. Pushing a swing: the child on the near seat swings out
   * and back, kicking their legs; the other seat sways a little. The child is there only while it's done.
   */
  bsSwing(g, W, D, _c, _def, _ctx, out) {
    const top = 2.0;
    const half = W / 2 - 0.08;
    // The rubber surfacing under it, in two tones.
    part(g, rbox(W - 0.04, 0.03, D + 0.9, 0.01), '#7cb342', 0, 0.015, 0.0, { outline: false });
    part(g, rbox(W - 0.4, 0.035, D + 0.5, 0.01), '#ef6c00', 0, 0.02, 0.0, { outline: false });
    // The A-frame legs at each end and the bar across.
    for (const sx of [-1, 1]) {
      rod(g, v3(sx * half, 0, -0.55), v3(sx * half, top, 0), 0.04, '#1e88e5');
      rod(g, v3(sx * half, 0, 0.55), v3(sx * half, top, 0), 0.04, '#1e88e5');
      part(g, ball(0.06), '#fdd835', sx * half, top, 0);
    }
    rod(g, v3(-half, top, 0), v3(half, top, 0), 0.045, '#fdd835');
    // The seats on their chains, hung from pivots on the bar.
    const seat = (x: number): THREE.Group => {
      const p = group(g, x, top - 0.02, 0);
      for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) part(p, box(0.012, 0.18, 0.012), '#b0bec5', sx * 0.2, -0.1 - i * 0.2, 0, { outline: false });
      part(p, rbox(0.46, 0.04, 0.18, 0.02), '#263238', 0, -1.5, 0);
      return p;
    };
    const near = seat(-0.45);
    const far = seat(0.45);
    const use = group(near);
    out.inUse = use;
    const kid = child(use, 2, 0, -0.04, 0, 0.3, { stage: 'child', gender: 'female', seed: 52 });
    kid.root.position.y = -1.48 - 0.3;
    kid.armL(v3(-0.16, -1.05, 0));
    kid.armR(v3(0.16, -1.05, 0));
    out.animate = (t) => {
      const on = !!use.visible;
      near.rotation.x = on ? 0.45 * Math.sin(t * Math.PI * 2 * 0.42) : 0;
      far.rotation.x = 0.06 * Math.sin(t * Math.PI * 2 * 0.3 + 1);
    };
  },
};

/** The play mat's print: big letters and a few animals in soft colours. */
function paintMatPrint(c: CanvasRenderingContext2D) {
  ['#ffe0b2', '#c8e6c9', '#bbdefb', '#f8bbd0'].forEach((k, i) => {
    c.fillStyle = k;
    c.fillRect(i * 96, 0, 96, 256);
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(i * 96, 0, 2, 256);
  });
  const letters = ['가', 'A', '나', 'B', '다', 'C'];
  letters.forEach((s, i) => text(c, s, 48 + (i % 3) * 128, 80 + Math.floor(i / 3) * 110, 44, ['#ef6c00', '#43a047', '#1e88e5', '#d81b60', '#8e24aa', '#f9a825'][i], 'center'));
  c.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.arc(30 + ((i * 47) % 360), 30 + ((i * 83) % 220), 8, 0, Math.PI * 2);
    c.fill();
  }
}
