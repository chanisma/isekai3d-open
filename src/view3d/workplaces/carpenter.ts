import * as THREE from 'three';
import {
  ASSEMBLE,
  CHISEL,
  DRILL,
  FINISH,
  LUMBER,
  PLANE,
  RIP,
  SAW,
  assembleRound,
  chiselRound,
  drillRound,
  finishRound,
  planeRound,
  ripRound,
  sawRound,
  sightRound,
  toolPhase,
  type BarOffset,
  type Motion,
} from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox, textured } from '../toon';
import { BLACK, STEEL, glass, glowing, label, painted, picture, ring, seeded, text, type Paint } from './doctor';
import { carpenterSand } from './handWorkProps';
import { shopFront } from './shopFront';

/**
 * The woodworking shop drawn as itself (2026-10-27 workplace pipeline, at the user's request: a 목공소
 * should read as one, and woodworking should look like it). The workbench — laminated beech with its
 * vise and dog holes, the tool wall of 양날톱 saws, chisels, squares, the 먹통 and the planes behind
 * it — where a board is planed with the Korean pull plane (shavings curling out of its mouth), marked
 * with the square and crosscut with the pull saw (the offcut dropping off the end), a mortise chopped
 * with chisel and mallet and its tenon tried, a stool frame or a ceiling frame knocked together, and a
 * junior shown a dovetail; the table saw with its spinning blade, rip fence and push stick, a board
 * fed through and ripped in two; the lumber rack with the species on its shelves and the end grain
 * showing, a board drawn out and sighted along; the finishing table, a panel sanded and oiled row by
 * row and wiped off; and what the shop was missing (workFurniture/carpenter.ts): the clamp rack, the
 * dust collector, the drill press, the order board, the showroom platform and the offcut crate.
 */

const BEECH = '#dcb98b';
const BEECH_DARK = '#a97d50';
const BEECH_LINE = '#c49a68';
const OAK = '#caa06a';
const OAK_DARK = '#8d6748';
const WALNUT = '#6b4a33';
const PINE = '#e7c993';
const CHERRY = '#b06a45';
const MAPLE = '#ead5aa';
const HINOKI = '#f0dcae';
const SHAVING = '#f4ddb0';
const SAWDUST = '#e9cf9c';
const PLY = '#d9bf8f';
const CAST = '#9aa4ab';
const MACHINE = '#3d4a52';
const RATTAN = '#7a5532';
const PAPER = '#f6f1e3';
const PENCIL = '#f2c230';
const SKIN = '#f3cfb3';
const HAIR = '#2f2219';

const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D | undefined, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
/** The clock a piece shares with whoever's at it: toolPhase of where the hands meet the wood. */
const phaseOf = (m: THREE.Object3D) => toolPhase(m.getWorldPosition(tmp));
/**
 * The carpenter's own frame at `p` (they face `yaw`): its x to their left, y up, z away from them,
 * so a BarOffset goes straight in as a position.
 */
function frame(g: THREE.Object3D, p: THREE.Vector3, yaw: number): THREE.Group {
  const f = new THREE.Group();
  f.position.copy(p);
  f.rotation.y = yaw;
  g.add(f);
  return f;
}
const v3 = (o: BarOffset, v = new THREE.Vector3()) => v.set(o.side, o.up, o.ahead);
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** Lit-by-the-room painted faces (a sign, a board's end grain), one material a texture. */
const paintedMats = new Map<string, THREE.Material>();
function paintedMat(key: string, w: number, h: number, paint: Paint): THREE.Material {
  let m = paintedMats.get(key);
  if (!m) paintedMats.set(key, (m = textured(painted(key, w, h, paint))));
  return m;
}
/** A flat face lit like the rest (an end of a board, the pegboard). */
function face(g: THREE.Object3D, mat: THREE.Material, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.ownGeometry = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  m.receiveShadow = true;
  g.add(m);
  return m;
}
/** Points `o`'s +y from `from` to `to` (a rod-shaped tool laid along them). */
function alongY(o: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  o.position.copy(from);
  const d = tmp.copy(to).sub(from);
  if (d.lengthSq() > 1e-8) o.quaternion.setFromUnitVectors(UP, d.normalize());
}

// ---------------------------------------------------------------------------------------------
// What's painted: end grain, the pegboard, the order board, the signs.

function endGrain(color: string, seed: number): Paint {
  return (c) => {
    const base = new THREE.Color(color);
    c.fillStyle = '#' + base.getHexString();
    c.fillRect(0, 0, 64, 32);
    const r = seeded(seed);
    const cx = 10 + r() * 44;
    const cy = 30 + r() * 30;
    c.lineWidth = 1.4;
    for (let i = 1; i < 14; i++) {
      c.strokeStyle = `rgba(${Math.round(base.r * 120)},${Math.round(base.g * 80)},${Math.round(base.b * 50)},${0.35 + 0.25 * (i % 2)})`;
      c.beginPath();
      c.arc(cx, cy, i * 4.2 + r() * 1.5, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(0, 0, 64, 3);
  };
}
const SPECIES: Array<{ name: string; en: string; color: string }> = [
  { name: '월넛', en: 'WALNUT', color: WALNUT },
  { name: '화이트 오크', en: 'WHITE OAK', color: OAK },
  { name: '체리', en: 'CHERRY', color: CHERRY },
  { name: '하드 메이플', en: 'MAPLE', color: MAPLE },
  { name: '편백 (히노키)', en: 'HINOKI', color: HINOKI },
  { name: '삼나무', en: 'CEDAR', color: '#c98d5a' },
  { name: '애쉬', en: 'ASH', color: '#e0c79c' },
  { name: '라디에타 소나무', en: 'PINE', color: PINE },
];
const grainMat = (color: string, seed: number) => paintedMat(`carp-grain-${color}-${seed % 4}`, 64, 32, endGrain(color, seed % 4 + 3));

const paintPegboard: Paint = (c) => {
  c.fillStyle = '#c9a87c';
  c.fillRect(0, 0, 256, 128);
  c.fillStyle = 'rgba(70,45,25,0.55)';
  for (let y = 6; y < 128; y += 12) for (let x = 6; x < 256; x += 12) c.fillRect(x, y, 3, 3);
};
const paintOrders: Paint = (c) => {
  c.fillStyle = '#fbfcfd';
  c.fillRect(0, 0, 512, 352);
  text(c, '주문 현황', 18, 26, 26, '#263238');
  text(c, '11월 · 나무결 공방', 494, 26, 14, '#78909c', 'right');
  c.fillStyle = '#263238';
  c.fillRect(14, 46, 484, 2);
  const head = ['품목', '고객', '수종', '납기', '진행'];
  const xs = [18, 168, 262, 352, 428];
  head.forEach((h, i) => text(c, h, xs[i], 64, 14, '#546e7a'));
  const rows: Array<[string, string, string, string, string, string]> = [
    ['6인 원목 식탁', '김○○', '월넛', '11.03', '오일 마감', '#43a047'],
    ['2단 책장', '이○○', '화이트 오크', '11.07', '짜맞춤', '#fb8c00'],
    ['원목 도마 ×20', '○○카페', '체리', '11.10', '재단', '#1e88e5'],
    ['아이 침대', '박○○', '편백', '11.14', '도면', '#8e24aa'],
    ['한옥 창호 보수', '△△재', '소나무', '11.20', '견적', '#757575'],
  ];
  rows.forEach(([a, b, s, d, st, col], i) => {
    const y = 96 + i * 34;
    c.fillStyle = i % 2 ? '#ffffff' : '#f3f6f8';
    c.fillRect(14, y - 15, 484, 32);
    text(c, a, xs[0], y, 15, '#263238');
    text(c, b, xs[1], y, 14, '#37474f', 'left', false);
    text(c, s, xs[2], y, 14, '#5d4037', 'left', false);
    text(c, d, xs[3], y, 14, i === 0 ? '#d32f2f' : '#37474f');
    c.fillStyle = col;
    c.fillRect(xs[4] - 4, y - 11, 76, 22);
    text(c, st, xs[4] + 34, y, 12, '#ffffff', 'center');
  });
  // A sketch of the table on order with its sizes, in marker.
  c.strokeStyle = '#1565c0';
  c.lineWidth = 3;
  c.strokeRect(40, 280, 150, 16);
  c.beginPath();
  c.moveTo(52, 296);
  c.lineTo(52, 340);
  c.moveTo(178, 296);
  c.lineTo(178, 340);
  c.stroke();
  text(c, '1800 × 900 × 720', 210, 300, 15, '#1565c0');
  text(c, '상판 32T · 다리 75각', 210, 326, 13, '#1565c0', 'left', false);
  text(c, '납기 지키기!!', 494, 330, 18, '#d32f2f', 'right');
};
const paintPhoto: Paint = (c) => {
  const g = c.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, '#f3ece0');
  g.addColorStop(1, '#d9c9b0');
  c.fillStyle = g;
  c.fillRect(0, 0, 160, 96);
  c.fillStyle = WALNUT;
  c.fillRect(60, 30, 40, 6);
  c.fillRect(62, 36, 5, 44);
  c.fillRect(93, 36, 5, 44);
  c.fillRect(64, 6, 32, 5);
  c.fillRect(64, 6, 4, 26);
  c.fillRect(92, 6, 4, 26);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 160, 12);
  text(c, '좋아요 1,284  #원목가구 #주문제작', 6, 6, 8, '#e91e63', 'left', false);
};
const paintPriceTag = (name: string, price: string): Paint => (c) => {
  c.fillStyle = '#fffdf6';
  c.fillRect(0, 0, 128, 80);
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 3;
  c.strokeRect(3, 3, 122, 74);
  text(c, name, 64, 26, 14, '#4e342e', 'center');
  text(c, price, 64, 54, 17, '#bf360c', 'center');
};

// ---------------------------------------------------------------------------------------------
// The tools: built in the carpenter's frame (+z away from them), each with its handle where the
// hands go in activity.ts's rounds.

/** The Korean pull plane (대패): its origin the middle of its sole, the crossbar through its front. */
function pullPlane(g: THREE.Object3D): THREE.Group {
  const P = PLANE;
  const p = new THREE.Group();
  g.add(p);
  part(p, rbox(P.wide, P.high, P.len, 0.008), '#c79a5b', 0, P.high / 2, 0);
  // The mouth and the iron wedged in it, slanting back, its edge just through the sole.
  part(p, box(P.wide * 0.7, 0.004, 0.03), '#3b2a1c', 0, P.high + 0.0005, -0.01, { outline: false });
  part(p, box(P.wide * 0.62, 0.006, 0.075), '#9aa3ab', 0, P.high + 0.018, -0.03, { rx: -0.55 });
  part(p, box(P.wide * 0.55, 0.012, 0.05), '#6d4c41', 0, P.high + 0.012, -0.045, { rx: -0.55 });
  // The crossbar the hands pull by.
  part(p, cyl(0.011, 0.011, 2 * P.grip + 0.05, 10), OAK_DARK, 0, P.high + 0.02, P.bar, { rz: Math.PI / 2 });
  return p;
}

/**
 * The 양날톱 (pull saw): its origin the heel, the handle along -z, the blade along +z, the plate
 * above its cutting edge, teeth along both edges, the long handle bound in rattan.
 */
function pullSaw(g: THREE.Object3D): THREE.Group {
  const s = new THREE.Group();
  g.add(s);
  const L = SAW.blade;
  // The plate, wider towards the tip, with the teeth along both edges.
  part(s, box(0.0025, 0.07, L), '#cfd6db', 0, 0.035, L / 2, { outline: false });
  part(s, box(0.003, 0.012, L - 0.02), '#9aa3ab', 0, 0.075, L / 2, { outline: false });
  for (let i = 0; i < 14; i++) {
    const z = 0.015 + (i * (L - 0.02)) / 14;
    part(s, box(0.003, 0.007, 0.007), '#8f989f', 0, 0.0, z, { rx: Math.PI / 4, outline: false });
    part(s, box(0.003, 0.007, 0.007), '#8f989f', 0, 0.07, z, { rx: Math.PI / 4, outline: false });
  }
  // The neck to the handle, and the handle in rattan.
  part(s, box(0.004, 0.018, 0.05), '#7c858c', 0, 0.03, -0.02, { outline: false });
  part(s, cyl(0.014, 0.014, SAW.handle, 10), '#d2b48c', 0, 0.03, -0.045 - SAW.handle / 2, { rx: Math.PI / 2 });
  for (let i = 0; i < 7; i++) part(s, cyl(0.0155, 0.0155, 0.012, 10), RATTAN, 0, 0.03, -0.06 - i * 0.03, { rx: Math.PI / 2, outline: false });
  return s;
}

/** A chisel (끌): its origin the edge, up along +y: the blade, the ferrule, the oak handle, the hoop. */
function chiselTool(g: THREE.Object3D, width = 0.018): THREE.Group {
  const c = new THREE.Group();
  g.add(c);
  part(c, box(width, 0.004, 0.006), '#e0e4e7', 0, 0.002, 0, { outline: false });
  part(c, box(width, 0.1, 0.007), '#a9b2b8', 0, 0.055, 0);
  part(c, cyl(0.011, 0.012, 0.025, 10), '#5d6469', 0, 0.115, 0);
  part(c, cyl(0.014, 0.012, 0.12, 10), '#b98a55', 0, 0.185, 0);
  part(c, cyl(0.0155, 0.0155, 0.012, 12), '#4a4f53', 0, 0.245, 0);
  return c;
}

/** The mallet (나무 메): a head of oak and its handle, posed by its head's middle and the hand. */
function mallet(g: THREE.Object3D) {
  const m = new THREE.Group();
  g.add(m);
  const head = part(m, cyl(CHISEL.headR, CHISEL.headR, CHISEL.head, 14), '#8d6e4f', 0, 0, 0);
  for (const sy of [-1, 1]) part(head, cyl(CHISEL.headR + 0.003, CHISEL.headR + 0.003, 0.01, 14), '#5d4a37', 0, sy * (CHISEL.head / 2 - 0.012), 0, { outline: false });
  const handle = part(m, cyl(0.012, 0.014, 1, 10), '#c49a68', 0, 0, 0, { rz: -Math.PI / 2 });
  const xa = new THREE.Vector3();
  const ya = new THREE.Vector3();
  const za = new THREE.Vector3();
  const mat = new THREE.Matrix4();
  return {
    m,
    /** The head at `h`, the handle back to `hand` (the head's axis square to the handle, upright). */
    pose(h: THREE.Vector3, hand: THREE.Vector3) {
      xa.copy(hand).sub(h);
      const len = xa.length();
      xa.normalize();
      ya.copy(UP).addScaledVector(xa, -UP.dot(xa));
      if (ya.lengthSq() < 1e-6) ya.set(0, 0, 1);
      ya.normalize();
      za.crossVectors(xa, ya);
      mat.makeBasis(xa, ya, za);
      m.position.copy(h);
      m.quaternion.setFromRotationMatrix(mat);
      handle.scale.set(1, len + 0.05, 1);
      handle.position.set((len + 0.05) / 2, 0, 0);
    },
  };
}

/** A pencil laid from its point to where it's held. */
function pencil(g: THREE.Object3D): THREE.Group {
  const p = new THREE.Group();
  g.add(p);
  part(p, cyl(0.004, 0.004, 0.13, 6), PENCIL, 0, 0.085, 0, { outline: false });
  part(p, cyl(0.004, 0.001, 0.02, 6), '#e8c9a0', 0, 0.01, 0, { outline: false });
  return p;
}

/** The 곱자 (steel square): its blade across the board from its origin, its stock down the near edge. */
function trySquare(g: THREE.Object3D): THREE.Group {
  const s = new THREE.Group();
  g.add(s);
  part(s, box(0.03, 0.003, 0.24), '#b0bac1', 0, 0.0015, 0.02);
  for (let i = 0; i < 10; i++) part(s, box(0.012, 0.0008, 0.002), '#37474f', 0.008, 0.0035, -0.08 + i * 0.022, { outline: false });
  part(s, box(0.12, 0.035, 0.016), '#78909c', 0.045, -0.012, -SAW.wide / 2 - 0.008);
  return s;
}

/** A curl of shaving (its width across, the curl up and back). */
function shaving(g: THREE.Object3D, r = 0.02, arc = 4.6): THREE.Group {
  const s = new THREE.Group();
  g.add(s);
  const m = part(s, ring(r, 0.0035, arc), SHAVING, 0, r, 0, { outline: false, ry: Math.PI / 2 });
  m.rotation.z = -Math.PI / 2;
  s.scale.x = 6;
  return s;
}

/** A pool of bits (dust, chips) thrown about by the clock; each bit's own seed. */
function bits(g: THREE.Object3D, n: number, color: string, size: number): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) out.push(part(g, box(size, size * 0.6, size), color, 0, 0, 0, { outline: false, shadow: false }));
  return out;
}

/** A heap of sawdust on the floor or a top. */
function dustHeap(g: THREE.Object3D, x: number, y: number, z: number, r: number) {
  const h = part(g, cyl(r * 0.35, r, r * 0.3, 14), SAWDUST, x, y + r * 0.15, z, { outline: false });
  h.scale.z = 0.8;
  return h;
}

/** Someone drawn in: a junior in an apron at the bench (facing +z, the feet at the origin). */
function junior(g: THREE.Object3D, x: number, z: number, yaw: number) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  g.add(root);
  for (const sx of [-1, 1]) {
    rod(root, new THREE.Vector3(sx * 0.08, 0.8, 0), new THREE.Vector3(sx * 0.085, 0.08, 0.02), 0.055, '#4e5a65');
    part(root, rbox(0.1, 0.07, 0.2, 0.03), '#3e2723', sx * 0.085, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.16, 0.2, 0.06), '#4e5a65', 0, 0.86, 0);
  part(root, rbox(0.32, 0.44, 0.2, 0.08), '#e8e4da', 0, 1.1, 0);
  // The canvas apron with its pocket and a pencil in it.
  part(root, rbox(0.3, 0.62, 0.02, 0.01), '#8a7a5c', 0, 0.98, 0.105);
  part(root, box(0.16, 0.08, 0.008), '#7a6a4c', 0, 0.88, 0.118, { outline: false });
  part(root, cyl(0.004, 0.004, 0.1, 6), PENCIL, 0.05, 0.93, 0.12, { outline: false });
  part(root, cyl(0.04, 0.045, 0.08, 10), SKIN, 0, 1.35, 0, { outline: false });
  const head = new THREE.Group();
  head.position.set(0, 1.47, 0);
  root.add(head);
  part(head, ball(0.11), SKIN, 0, 0, 0);
  part(head, ball(0.117), HAIR, 0, 0.03, -0.027);
  part(head, rbox(0.19, 0.055, 0.055, 0.02), HAIR, 0, 0.068, 0.068, { rx: -0.3 });
  part(head, rbox(0.23, 0.035, 0.2, 0.015), '#1565c0', 0, 0.06, 0, { rx: -0.1 });
  for (const sx of [-1, 1]) part(head, ball(0.013), '#2b2b30', sx * 0.037, 0, 0.103, { outline: false });
  // Both hands forward to the bench, a chisel held in the right.
  for (const sx of [-1, 1]) {
    const s = new THREE.Vector3(sx * 0.19, 1.27, 0);
    const e = new THREE.Vector3(sx * 0.2, 1.03, 0.12);
    const w = new THREE.Vector3(sx * 0.12, 0.95, 0.34);
    rod(root, s, e, 0.042, '#e8e4da');
    rod(root, e, w, 0.035, SKIN);
    part(root, ball(0.04), SKIN, w.x, w.y, w.z, { outline: false });
  }
  const c = chiselTool(root);
  c.position.set(-0.12, 0.9, 0.36);
  c.rotation.x = 0.5;
  return { root, head };
}

/** A dining chair in walnut (for the showroom): facing +z, its seat's top at 0.45. */
function walnutChair(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  c.rotation.y = ry;
  g.add(c);
  for (const sx of [-1, 1]) {
    part(c, box(0.035, 0.43, 0.035), WALNUT, sx * 0.19, 0.215, 0.18);
    part(c, box(0.035, 0.86, 0.035), WALNUT, sx * 0.19, 0.43, -0.18, { rx: -0.05 });
  }
  part(c, rbox(0.44, 0.035, 0.42, 0.012), WALNUT, 0, 0.43, 0.0);
  part(c, rbox(0.36, 0.02, 0.36, 0.008), '#d8c3a5', 0, 0.455, 0.01);
  part(c, box(0.4, 0.04, 0.025), WALNUT, 0, 0.36, 0.18);
  part(c, box(0.36, 0.12, 0.025), WALNUT, 0, 0.78, -0.2, { rx: -0.08 });
  part(c, box(0.36, 0.03, 0.02), WALNUT, 0, 0.6, -0.19, { rx: -0.05 });
  for (const sx of [-1, 1]) part(c, box(0.025, 0.025, 0.36), WALNUT, sx * 0.19, 0.12, 0);
  return c;
}

/** A steel F-clamp: hung by its bar (upright), the jaws at the top reaching to +z. */
function fClamp(g: THREE.Object3D, x: number, y: number, z: number, len: number, handle: string) {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  g.add(c);
  part(c, box(0.012, len, 0.026), '#9aa3ab', 0, -len / 2, 0);
  part(c, box(0.02, 0.03, 0.09), '#37474f', 0, -0.015, 0.045);
  part(c, box(0.022, 0.035, 0.1), '#455a64', 0, -len * 0.55, 0.05);
  part(c, cyl(0.004, 0.004, 0.08, 6), STEEL, 0, -len * 0.55 + 0.035, 0.09, { outline: false });
  part(c, cyl(0.016, 0.016, 0.07, 10), handle, 0, -len * 0.55 + 0.085, 0.09);
  return c;
}

let rackCount = 0;

export const BUILDERS: Record<string, Builder> = {
  // The 내장 목공 현장's pieces (2026-11-04, the branch lots).
  cpCeilingFrame(g, W, D) {
    cpCeilingFrame(g, W, D);
  },
  cpBoardWall(g, W, D) {
    cpBoardWall(g, W, D);
  },
  cpStudWall(g, W, D) {
    cpStudWall(g, W, D);
  },
  cpBoardStack(g, W, D) {
    cpBoardStack(g, W, D);
  },
  /**
   * The workbench (목공 작업대, 2 tiles): a laminated beech top on heavy legs with a shelf under it
   * (the toolbox, glue, a clamp, offcuts), a front vise at its left with its wooden T-bar, a row of dog
   * holes, shavings and a tape measure about; against a wall a pegboard of the hand tools — two 양날톱,
   * a 등대기톱, a rack of chisels by size, the 곱자, a mallet, planes and the 먹통 on a shelf, F-clamps —
   * and a sign. Planing (planeBoard): stood at the end of a board laid away from them, the pull plane
   * carried out and drawn back with both hands on its crossbar, the body going with it, a shaving
   * curling out of the mouth each stroke and dropping beside it; every fifth stroke the board's felt
   * along for flat. Cutting (cutWood): the square laid across, the pencil line drawn, the pull saw
   * stroked through it on the pull (dust falling), the offcut dropping off the bench's end and the
   * board slid along. Joinery (joinWood): a mortise chopped in a post, chisel upright in the left hand,
   * the mallet coming down on it, chips levered out, then the tenon tried in the hole. The rush order
   * and the ceiling frame: a stool frame or a 반자틀 lattice tapped together corner by corner with the
   * mallet and looked over for square. Teaching (lead): a dovetail sample held up to a junior in an
   * apron working beside them.
   */
  carpentryBench(g, W, _D, _c, _def, ctx, out) {
    const T = 0.82;
    const z0 = -0.42;
    const z1 = 0.32;
    const zc = (z0 + z1) / 2;
    const half = W / 2 - 0.05;
    const yaw = Math.PI;
    // The top: laminated strips, breadboard ends, dog holes along the front.
    part(g, rbox(W - 0.12, 0.07, z1 - z0, 0.01), BEECH, 0, T - 0.035, zc);
    for (let i = 1; i < 8; i++) part(g, box(W - 0.14, 0.002, 0.003), BEECH_LINE, 0, T + 0.0005, z0 + (i * (z1 - z0)) / 8, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.045, 0.074, z1 - z0 + 0.01, 0.01), BEECH_DARK, sx * half, T - 0.035, zc);
    for (let x = -0.15; x <= 0.85; x += 0.14) part(g, box(0.02, 0.003, 0.02), '#3b2a1c', x, T + 0.0012, 0.25, { outline: false });
    // The legs, the stretchers, the shelf and what's on it.
    for (const sx of [-1, 1]) for (const sz of [z0 + 0.07, z1 - 0.08]) part(g, box(0.085, T - 0.07, 0.085), BEECH_DARK, sx * 0.8, (T - 0.07) / 2, sz);
    for (const sx of [-1, 1]) part(g, box(0.07, 0.08, z1 - z0 - 0.06), BEECH_DARK, sx * 0.8, 0.1, zc);
    part(g, box(1.52, 0.07, 0.05), BEECH_DARK, 0, 0.12, zc);
    part(g, box(1.52, 0.025, z1 - z0 - 0.18), PLY, 0, 0.17, zc - 0.02);
    part(g, rbox(0.42, 0.18, 0.22, 0.02), '#c62828', -0.45, 0.275, zc - 0.04);
    part(g, box(0.42, 0.02, 0.22), '#8e1b1b', -0.45, 0.31, zc - 0.04, { outline: false });
    part(g, box(0.12, 0.03, 0.03), '#37474f', -0.45, 0.385, zc - 0.04);
    part(g, rbox(0.07, 0.16, 0.05, 0.015), '#fafafa', 0.1, 0.263, zc);
    part(g, cyl(0.012, 0.004, 0.04, 8), '#ff7043', 0.1, 0.36, zc);
    label(g, '목공 본드', 0.06, 0.03, 0.1, 0.26, zc + 0.026, '#fafafa', '#e65100');
    for (let i = 0; i < 4; i++) part(g, box(0.3 + i * 0.07, 0.03, 0.08), [OAK, PINE, WALNUT, CHERRY][i], 0.42, 0.2 + i * 0.031, zc - 0.05 + (i % 2) * 0.05, { ry: (i - 1.5) * 0.08 });
    // The front vise at the left: the jaw, its screw and the T-bar.
    const vx = -0.75;
    part(g, rbox(0.3, 0.16, 0.05, 0.01), BEECH, vx, T - 0.08, z1 + 0.03);
    part(g, cyl(0.014, 0.014, 0.11, 10), STEEL, vx, T - 0.1, z1 + 0.1, { rx: Math.PI / 2 });
    part(g, cyl(0.02, 0.02, 0.03, 12), BEECH_DARK, vx, T - 0.1, z1 + 0.16, { rx: Math.PI / 2 });
    part(g, cyl(0.011, 0.011, 0.24, 8), BEECH_DARK, vx, T - 0.1, z1 + 0.16, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, ball(0.017), BEECH_DARK, vx + sx * 0.12, T - 0.1, z1 + 0.16);
    // What lies about at the back of the top: the tape measure, a square, shavings, a pencil.
    part(g, rbox(0.07, 0.07, 0.03, 0.015), '#fdd835', -0.82, T + 0.035, -0.3, { ry: 0.3 });
    part(g, cyl(0.012, 0.012, 0.032, 10), '#212121', -0.82, T + 0.035, -0.3, { rx: Math.PI / 2, ry: 0.3 });
    const rs = seeded(17);
    for (let i = 0; i < 9; i++) {
      const sh = shaving(g, 0.012 + rs() * 0.01, 3 + rs() * 2);
      sh.position.set(-0.85 + rs() * 1.7, T, -0.36 + rs() * 0.12);
      sh.rotation.y = rs() * Math.PI * 2;
    }
    for (let i = 0; i < 7; i++) {
      const sh = shaving(g, 0.014 + rs() * 0.01, 3 + rs() * 2);
      sh.position.set(-0.9 + rs() * 1.8, 0.0, 0.25 + rs() * 0.4);
      sh.rotation.set(0, rs() * Math.PI * 2, Math.PI / 2 * rs());
    }
    if (ctx.againstWall) {
      // The tool wall: a pegboard with the hand tools in their places.
      const zw = -0.485;
      face(g, paintedMat('carp-pegboard', 256, 128, paintPegboard), 1.8, 0.85, 0, 1.47, zw, 0);
      part(g, box(1.84, 0.03, 0.02), BEECH_DARK, 0, 1.06, zw + 0.005);
      part(g, box(1.84, 0.03, 0.02), BEECH_DARK, 0, 1.885, zw + 0.005);
      // Two 양날톱 and a 등대기톱 hanging, handles down.
      for (const [x, k] of [[-0.78, 1], [-0.66, 1], [-0.52, 0.8]] as const) {
        const sg = new THREE.Group();
        sg.position.set(x, 1.32, zw + 0.03);
        g.add(sg);
        part(sg, box(0.065 * k, 0.24, 0.003), '#cfd6db', 0, 0.16, 0, { outline: false });
        if (k < 1) part(sg, box(0.07, 0.018, 0.008), '#5d6469', 0, 0.06 + 0.24 * 0.5 - 0.11, 0, { outline: false });
        part(sg, cyl(0.013, 0.013, 0.22, 10), '#d2b48c', 0, -0.07, 0);
        for (let i = 0; i < 5; i++) part(sg, cyl(0.0145, 0.0145, 0.012, 10), RATTAN, 0, -0.14 + i * 0.03, 0, { outline: false });
        part(sg, cyl(0.004, 0.004, 0.04, 6), '#5d4037', 0, 0.3, -0.015, { rx: Math.PI / 2, outline: false });
      }
      // The chisel rack: six chisels by width, edges down.
      part(g, rbox(0.42, 0.05, 0.06, 0.01), BEECH_DARK, -0.15, 1.5, zw + 0.03);
      [0.006, 0.009, 0.012, 0.018, 0.024, 0.03].forEach((w, i) => {
        const c = chiselTool(g, w);
        c.position.set(-0.32 + i * 0.07, 1.39, zw + 0.045);
      });
      label(g, '끌 3·6·9·12·18·24·30', 0.36, 0.04, -0.15, 1.5, zw + 0.062, '#f6efe1', '#5d4037');
      // The 곱자 and a 연귀자 (mitre square).
      part(g, box(0.025, 0.42, 0.003), '#b0bac1', 0.18, 1.5, zw + 0.02);
      part(g, box(0.24, 0.025, 0.003), '#b0bac1', 0.29, 1.3, zw + 0.02);
      part(g, box(0.16, 0.025, 0.006), '#8d6e63', 0.32, 1.66, zw + 0.02, { rz: Math.PI / 4 });
      // A mallet on two pegs; the 먹통 and two planes on a little shelf.
      const mh = mallet(g);
      mh.pose(new THREE.Vector3(0.52, 1.75, zw + 0.06), new THREE.Vector3(0.49, 1.47, zw + 0.06));
      part(g, rbox(0.5, 0.025, 0.12, 0.01), BEECH_DARK, 0.62, 1.2, zw + 0.06);
      const pl = pullPlane(g);
      pl.position.set(0.5, 1.2125, zw + 0.06);
      pl.rotation.y = Math.PI / 2;
      const pl2 = pullPlane(g);
      pl2.position.set(0.72, 1.2125, zw + 0.06);
      pl2.rotation.y = Math.PI / 2;
      pl2.scale.setScalar(0.75);
      // The 먹통: a carved boat-shaped ink box with its reel and the line out of its nose.
      part(g, rbox(0.12, 0.06, 0.05, 0.02), '#7b4f2e', 0.82, 1.2425, zw + 0.06);
      part(g, cyl(0.025, 0.025, 0.035, 14), '#5d3b1f', 0.85, 1.27, zw + 0.06, { rx: Math.PI / 2 });
      part(g, ball(0.012), '#1b1b1b', 0.79, 1.27, zw + 0.06, { outline: false });
      // F-clamps on the right.
      fClamp(g, 0.42, 1.82, zw + 0.02, 0.3, '#c62828');
      fClamp(g, 0.6, 1.82, zw + 0.02, 0.3, '#c62828');
      fClamp(g, 0.78, 1.82, zw + 0.02, 0.36, '#ef6c00');
      label(g, '공구는 제자리에!', 0.36, 0.06, -0.62, 1.82, zw + 0.012, '#fff8e1', '#bf360c');
    } else {
      // A tool well at the back instead: chisels, a pencil and the square lying in it.
      part(g, box(W - 0.2, 0.05, 0.1), BEECH_DARK, 0, T - 0.01, z0 - 0.04);
      for (let i = 0; i < 4; i++) {
        const c = chiselTool(g);
        c.position.set(-0.6 + i * 0.08, T + 0.02, z0 - 0.04);
        c.rotation.set(0, 0, Math.PI / 2);
      }
    }

    // What the hands work at, one use at a time (in use), and the bench tidy (idle).
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    {
      const b = part(idle, box(1.0, 0.035, 0.15), PINE, 0.1, T + 0.0175, 0.08);
      b.rotation.y = 0.03;
      const pl = pullPlane(idle);
      pl.position.set(-0.45, T, -0.12);
      pl.rotation.y = 0.4;
      const sq = trySquare(idle);
      sq.position.set(0.55, T + 0.035, 0.1);
      const pn = pencil(idle);
      pn.position.set(0.3, T + 0.04, 0.02);
      pn.rotation.set(0, 0, Math.PI / 2);
    }

    // --- Planing: the board laid away from the carpenter at the left of the bench.
    const planeG = new THREE.Group();
    use.add(planeG);
    const xP = -0.35;
    const pP = new THREE.Vector3(xP, T + 0.035, 0.04);
    const SP = frame(planeG, pP, yaw);
    part(SP, box(0.13, 0.035, PLANE.board), PINE, 0, -0.0175, 0);
    part(SP, box(0.13, 0.0015, PLANE.board - 0.02), '#f0d9a6', 0, 0.0005, 0, { outline: false });
    part(SP, box(0.2, 0.03, 0.035), BEECH_DARK, 0, -0.02, -PLANE.board / 2 - 0.02);
    const plane = pullPlane(SP);
    // The shaving coming out of the mouth, and the ones dropped beside the board.
    const curl = shaving(plane, 0.02, 4.4);
    curl.position.set(0, PLANE.high, -0.02);
    const falling = shaving(SP, 0.02, 4.4);
    const landed = Array.from({ length: 7 }, () => shaving(SP, 0.018, 4));
    const planeWork = marker(g, pP.x, pP.y, pP.z);

    // --- Sawing: the board across the bench, its end over the bench's right end.
    const sawG = new THREE.Group();
    use.add(sawG);
    const pS = new THREE.Vector3(half + 0.02, T + SAW.thick, 0.12);
    const SS = frame(sawG, pS, yaw);
    const BOARD = 1.2;
    const mainBoard = new THREE.Group();
    SS.add(mainBoard);
    part(mainBoard, box(BOARD, SAW.thick, SAW.wide), OAK, BOARD / 2, -SAW.thick / 2, 0);
    face(mainBoard, grainMat(OAK, 1), SAW.wide, SAW.thick, BOARD + 0.0005, -SAW.thick / 2, 0, Math.PI / 2);
    const offcut = new THREE.Group();
    SS.add(offcut);
    part(offcut, box(SAW.off, SAW.thick, SAW.wide), OAK, -SAW.off / 2, -SAW.thick / 2, 0);
    face(offcut, grainMat(OAK, 2), SAW.wide, SAW.thick, -SAW.off - 0.0005, -SAW.thick / 2, 0, -Math.PI / 2);
    const kerf = part(SS, box(0.003, 1, SAW.wide + 0.002), '#3b2a1c', 0, 0, 0, { outline: false });
    const line = part(SS, box(0.0015, 0.001, 1), '#37474f', -0.004, 0.0008, 0, { outline: false });
    const square = trySquare(SS);
    const pen = pencil(SS);
    const saw = pullSaw(SS);
    // Lying along the bench's front edge: the plate flat towards the carpenter, the blade to their left.
    const qRest = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)));
    const qUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(SAW.tilt, 0, 0));
    const sawDust = bits(SS, 14, SAWDUST, 0.007);
    dustHeap(SS, 0, -pS.y, 0.02, 0.09);
    // Old offcuts on the floor under the end.
    for (let i = 0; i < 2; i++) part(SS, box(0.2 + i * 0.05, SAW.thick, SAW.wide), OAK, -0.18 - i * 0.12, -pS.y + SAW.thick / 2 + i * SAW.thick, -0.1 + i * 0.12, { ry: 0.5 + i });
    const sawWork = marker(g, pS.x, pS.y, pS.z);

    // --- Joinery: a post across the bench, its mortise marked out in pencil.
    const chiselG = new THREE.Group();
    use.add(chiselG);
    const pC = new THREE.Vector3(0, T + 0.07, 0.06);
    const SC = frame(chiselG, pC, yaw);
    part(SC, box(0.7, 0.07, 0.07), OAK, 0, -0.035, 0);
    face(SC, grainMat(OAK, 3), 0.07, 0.07, 0.3505, -0.035, 0, Math.PI / 2);
    face(SC, grainMat(OAK, 0), 0.07, 0.07, -0.3505, -0.035, 0, -Math.PI / 2);
    for (const [w, d, x, z] of [[0.07, 0.0015, 0, 0.012], [0.07, 0.0015, 0, -0.012], [0.0015, 0.026, 0.035, 0], [0.0015, 0.026, -0.035, 0]] as const) part(SC, box(w, 0.001, d), '#37474f', x, 0.0006, z, { outline: false });
    const hole = part(SC, box(0.066, 1, 0.022), '#2b1d12', 0, 0, 0, { outline: false });
    const chisel = chiselTool(SC);
    const mal = mallet(SC);
    const tenon = new THREE.Group();
    SC.add(tenon);
    part(tenon, box(0.064, 0.045, 0.02), OAK, 0, -CHISEL.tenonLen / 2 + 0.0225, 0);
    part(tenon, box(0.085, CHISEL.tenonLen - 0.045, 0.05), OAK, 0, 0.0225, 0);
    const chips = bits(SC, 8, '#d9b27a', 0.01);
    for (let i = 0; i < 6; i++) part(SC, box(0.012, 0.004, 0.008), '#d9b27a', (seeded(40 + i)() - 0.5) * 0.3, -0.069, 0.06 + (seeded(60 + i)() - 0.5) * 0.12, { outline: false, ry: i });
    const chiselWork = marker(g, pC.x, pC.y, pC.z);

    // --- The rush order: a stool's frame stood on the bench, its seat waiting beside it, a clamp on.
    const rushG = new THREE.Group();
    use.add(rushG);
    const STOOL = 0.32;
    const pR = new THREE.Vector3(0.05, T + STOOL, 0.0);
    const SR = frame(rushG, pR, yaw);
    for (const c of ASSEMBLE) part(SR, box(0.035, STOOL, 0.035), WALNUT, c.side, -STOOL / 2, c.ahead);
    for (const sa of [-1, 1]) {
      part(SR, box(0.3, 0.05, 0.022), WALNUT, 0, -0.04, sa * 0.12);
      part(SR, box(0.022, 0.05, 0.24), WALNUT, sa * 0.15, -0.04, 0);
      part(SR, box(0.3, 0.02, 0.018), WALNUT, 0, -0.22, sa * 0.12);
    }
    part(SR, rbox(0.38, 0.03, 0.34, 0.03), WALNUT, 0.55, -STOOL + 0.015, 0.02);
    // A bar clamp across the aprons.
    part(SR, box(0.42, 0.012, 0.025), '#9aa3ab', 0, -0.12, -0.15);
    for (const sx of [-1, 1]) part(SR, box(0.03, 0.06, 0.04), '#c62828', sx * 0.19, -0.12, -0.15);
    part(SR, cyl(0.014, 0.014, 0.06, 10), '#212121', -0.24, -0.12, -0.15, { rz: Math.PI / 2 });
    const rushMallet = mallet(SR);
    const rushWork = marker(g, pR.x, pR.y, pR.z);

    // --- The ceiling frame (반자틀): a lattice of 각재 laid flat, nailed where they cross.
    const frameG = new THREE.Group();
    use.add(frameG);
    const pF = new THREE.Vector3(0.05, T + 0.03, 0.0);
    const SF = frame(frameG, pF, yaw);
    for (const a of [-0.27, -0.12, 0.12, 0.27]) part(SF, box(0.96, 0.03, 0.03), PINE, 0, -0.015, a);
    for (const s of [-0.45, -0.15, 0.15, 0.45]) part(SF, box(0.03, 0.03, 0.6), '#dcbc85', s, -0.015, 0);
    for (const s of [-0.45, -0.15, 0.15, 0.45]) for (const a of [-0.27, -0.12, 0.12, 0.27]) part(SF, cyl(0.005, 0.005, 0.002, 8), '#5f6a72', s, 0.001, a, { outline: false });
    label(SF, '반자틀 900×600', 0.2, 0.04, -0.3, 0.0012, -0.2, PINE, '#5d4037').rotation.set(-Math.PI / 2, 0, 0);
    const frameMallet = mallet(SF);
    const frameWork = marker(g, pF.x, pF.y, pF.z);

    // --- Teaching: a dovetail corner held up, and a junior chopping at the bench beside.
    const teachG = new THREE.Group();
    use.add(teachG);
    const xT = -0.55;
    const sample = new THREE.Group();
    sample.position.set(xT, 1.08, 0.38);
    sample.rotation.y = Math.PI;
    teachG.add(sample);
    part(sample, box(0.2, 0.1, 0.02), CHERRY, 0, 0, 0.0);
    part(sample, box(0.02, 0.1, 0.16), MAPLE, 0.09, 0, -0.08);
    for (let i = 0; i < 3; i++) part(sample, box(0.022, 0.022, 0.02), MAPLE, 0.09, -0.033 + i * 0.033, 0.005, { outline: false });
    const jr = junior(teachG, 0.5, 0.64, Math.PI + 0.35);
    part(teachG, box(0.6, 0.07, 0.07), OAK, 0.45, T + 0.035, 0.06);
    const teachAt = marker(g, xT, 1.08, 0.38);

    const stand = (x: number, z: number) => spot(g, 'stand', x, 0, z, yaw);
    const spots: Record<string, Spot> = {
      planeBoard: at(stand(xP, pP.z + 0.5), planeWork, 'plane'),
      cutWood: at(stand(pS.x - 0.1, pS.z + 0.62), sawWork, 'handSaw'),
      joinWood: at(stand(0, pC.z + 0.56), chiselWork, 'chisel'),
      rushFurniture: at(stand(pR.x, 0.55), rushWork, 'assemble'),
      carpenter_buildFrame: at(stand(pF.x, 0.52), frameWork, 'assemble'),
      carpenter_teachJoinery: at(stand(xT, 0.7), teachAt, 'bookShow'),
      '*': at(stand(xP, pP.z + 0.5), planeWork, 'plane'),
    };
    out.spots = spots;
    out.work = planeWork;
    const v = new THREE.Vector3();
    const w2 = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const planing = now === 'planeBoard' || now === '*';
      planeG.visible = planing;
      sawG.visible = now === 'cutWood';
      chiselG.visible = now === 'joinWood';
      rushG.visible = now === 'rushFurniture';
      frameG.visible = now === 'carpenter_buildFrame';
      teachG.visible = now === 'carpenter_teachJoinery';
      idle.visible = now === null;
      if (planing) {
        const k = planeRound(t, phaseOf(planeWork));
        plane.position.copy(v3(k.at, v));
        curl.visible = k.shave > 0.02 && k.drop < 0.02;
        curl.scale.set(6, 0.3 + 0.7 * k.shave, 0.3 + 0.7 * k.shave);
        // The shaving off the end of the stroke, tumbling down beside the board.
        falling.visible = k.drop > 0.02 && k.drop < 0.98 && !k.check;
        const r = seeded(k.n * 13 + 7);
        const land = new THREE.Vector3(-0.1 - r() * 0.07, -0.035, PLANE.near - 0.05 + r() * 0.15);
        const from = new THREE.Vector3(0, PLANE.high + 0.03, PLANE.near - 0.02);
        falling.position.copy(from).lerp(land, k.drop);
        falling.position.y = from.y + (land.y - from.y) * k.drop * k.drop;
        falling.rotation.set(k.drop * 3, k.drop * 2, 0);
        landed.forEach((s, j) => {
          const m = k.n - 1 - j;
          const q = seeded(m * 13 + 7);
          s.visible = ((m % 5) + 5) % 5 !== 4;
          s.position.set(-0.1 - q() * 0.07, -0.035, PLANE.near - 0.05 + q() * 0.15);
          s.rotation.set(0, q() * 6, q() * 0.6);
        });
      }
      if (now === 'cutWood') {
        const k = sawRound(t, phaseOf(sawWork));
        square.position.copy(v3(k.square, v));
        pen.position.copy(v3(k.pencil, v));
        alongY(pen, v3(k.pencil, v), v3(k.pencil, w2).add(new THREE.Vector3(-0.012, 0.09, -0.036)));
        saw.position.copy(v3(k.heel, v));
        saw.quaternion.copy(qRest).slerp(qUp, k.upright);
        line.visible = k.line > 0.01;
        const L = SAW.wide * k.line;
        line.scale.z = Math.max(0.001, L);
        line.position.z = SAW.wide / 2 - 0.01 - L / 2;
        const done = k.u > 0.82;
        kerf.visible = k.depth > 0.001 && !done;
        kerf.scale.y = Math.max(0.001, k.depth);
        kerf.position.y = -k.depth / 2 + 0.0005;
        // The offcut: on, then dropping off the end to the floor; the board slid along after.
        offcut.visible = k.u < 0.985;
        const e = k.drop * k.drop;
        offcut.position.set(-0.03 * k.drop, -(pS.y - SAW.thick) * e, 0.02 * k.drop);
        offcut.rotation.set(0, 0.4 * k.drop, -1.2 * Math.sin(Math.PI * k.drop));
        mainBoard.position.x = -SAW.off * k.slide;
        sawDust.forEach((d, i) => {
          const f = (t * 1.6 + i / sawDust.length) % 1;
          d.visible = k.sawing;
          const q = seeded(i * 31 + 5);
          d.position.set((q() - 0.5) * 0.03, -k.depth - 0.01 - f * (pS.y - 0.05), (q() - 0.5) * SAW.wide + 0.02 * wave(t, 2, i * 0.1));
          d.rotation.y = f * 5 + i;
        });
      }
      if (now === 'joinWood') {
        const k = chiselRound(t, phaseOf(chiselWork));
        hole.scale.y = Math.max(0.002, k.depth + 0.004);
        hole.position.y = -hole.scale.y / 2 + 0.0006;
        chisel.position.copy(v3(k.edge, v));
        if (k.lie) chisel.rotation.set(0, 0, Math.PI / 2);
        else chisel.rotation.set(-k.tilt, 0, 0);
        mal.pose(v3(k.head, v), v3(k.hand, w2));
        tenon.position.copy(v3(k.tenon, v));
        tenon.rotation.z = k.wiggle;
        // Chips thrown out of the mortise on the blows and when it's levered.
        const pop = Math.max(k.hit, k.pry);
        chips.forEach((c, i) => {
          const q = seeded(i * 17 + 3);
          const f = (t * 1.3 + i / chips.length) % 1;
          c.visible = k.u < 0.64 && pop > 0.05 && f < 0.7;
          const a = q() * Math.PI * 2;
          c.position.set(Math.cos(a) * 0.12 * f, 0.01 + 0.12 * f - 0.25 * f * f, Math.sin(a) * 0.1 * f - 0.03 * f);
          c.rotation.set(f * 9, f * 7 + i, 0);
        });
      }
      if (now === 'rushFurniture' || now === 'carpenter_buildFrame') {
        const work = now === 'rushFurniture' ? rushWork : frameWork;
        const k = assembleRound(t, phaseOf(work));
        (now === 'rushFurniture' ? rushMallet : frameMallet).pose(v3(k.head, v), v3(k.hand, w2));
      }
      if (now === 'carpenter_teachJoinery') jr.head.rotation.x = 0.35 + 0.05 * wave(t, 0.3);
    };
  },

  /**
   * The table saw (테이블 쏘): a cast-iron table on a dark cabinet, the blade coming up through a red
   * throat plate behind a riving knife and a clear guard, the rip fence on its rail with the scale,
   * the miter gauge in its slot, the start and stop paddle, the dust port at the back with its hose,
   * sawdust under it and the stack of boards waiting on the table's left; the push stick hangs on the
   * fence. Ripping (sawBoards): a board taken off the stack and laid against the fence, then fed
   * through the spinning blade — the left hand pressing it to the fence short of the blade, the right
   * pushing the strip by the fence with the push stick — the kerf running back along it and the dust
   * flying, two strips left on the far side; leaning in as it goes.
   */
  tableSaw(g, _W, _D, _c, _def, ctx, out) {
    const TS = 0.86;
    const bz = 0.12;
    const yaw = Math.PI;
    // The cabinet, its base and the switch; the table and its wings.
    part(g, rbox(0.56, TS - 0.06, 0.56, 0.02), MACHINE, 0, (TS - 0.06) / 2, -0.02);
    part(g, rbox(0.62, 0.06, 0.62, 0.02), '#2a3338', 0, 0.03, -0.02);
    part(g, rbox(0.76, 0.035, 0.84, 0.008), CAST, 0, TS - 0.0175, -0.02);
    part(g, box(0.025, 0.002, 0.84), '#5f6a72', -0.2, TS + 0.0005, -0.02, { outline: false });
    label(g, '테이블 쏘', 0.22, 0.05, 0, 0.62, 0.262, MACHINE, '#ffffff');
    label(g, '⚠ 푸시스틱 사용!', 0.3, 0.05, 0, 0.5, 0.262, '#fdd835', '#212121');
    part(g, rbox(0.14, 0.09, 0.04, 0.01), '#fdd835', 0.17, TS - 0.16, 0.28);
    part(g, rbox(0.1, 0.04, 0.03, 0.01), '#d32f2f', 0.17, TS - 0.17, 0.305);
    glowing(g, ball(0.008), '#69f0ae', 0.22, TS - 0.13, 0.302);
    // The fence rail along the front with its scale, and the rip fence on it.
    part(g, cyl(0.02, 0.02, 0.95, 12), STEEL, 0, TS - 0.05, 0.42, { rz: Math.PI / 2 });
    label(g, '0   10   20   30   40   50', 0.6, 0.025, 0.05, TS - 0.022, 0.4, '#fff8e1', '#37474f').rotation.x = -0.6;
    const fx = -RIP.fence;
    part(g, rbox(0.04, 0.065, 0.84, 0.008), '#cfd8dc', fx + 0.02, TS + 0.0325, -0.02);
    part(g, rbox(0.09, 0.09, 0.07, 0.01), '#37474f', fx + 0.02, TS - 0.01, 0.44);
    part(g, rbox(0.02, 0.1, 0.02, 0.008), '#d32f2f', fx + 0.02, TS + 0.06, 0.47, { rx: 0.4 });
    // The miter gauge's slot (the gauge itself hung on the front).
    part(g, rbox(0.1, 0.02, 0.05, 0.006), '#d32f2f', -0.2, TS - 0.01, 0.42);
    // The blade, the throat plate, the riving knife and the guard.
    part(g, rbox(0.08, 0.004, 0.32, 0.002), '#d32f2f', 0, TS + 0.001, bz);
    part(g, box(0.006, 0.002, 0.26), '#1b1b1b', 0, TS + 0.003, bz, { outline: false });
    const blade = new THREE.Group();
    blade.position.set(0, TS - 0.06, bz);
    g.add(blade);
    part(blade, cyl(0.12, 0.12, 0.003, 36), '#d6dbdf', 0, 0, 0, { rz: Math.PI / 2, outline: false });
    part(blade, cyl(0.03, 0.03, 0.006, 16), '#7c858c', 0, 0, 0, { rz: Math.PI / 2, outline: false });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      part(blade, box(0.004, 0.012, 0.012), '#8f989f', 0, Math.cos(a) * 0.121, Math.sin(a) * 0.121, { rx: a + 0.4, outline: false });
    }
    part(g, box(0.003, 0.09, 0.09), '#9aa3ab', 0, TS + 0.045, bz - 0.15);
    glass(g, box(0.05, 0.05, 0.26), 0, TS + 0.115, bz - 0.04);
    part(g, rbox(0.052, 0.012, 0.27, 0.004), '#ef6c00', 0, TS + 0.142, bz - 0.04);
    part(g, box(0.006, 0.06, 0.006), '#9aa3ab', 0, TS + 0.17, bz - 0.15, { outline: false });
    // The dust port and its hose off to the back; sawdust under it.
    part(g, cyl(0.055, 0.055, 0.08, 14), '#263238', 0, 0.3, -0.33, { rx: Math.PI / 2 });
    for (let i = 0; i < 6; i++) part(g, cyl(0.058, 0.058, 0.035, 14), '#90a4ae', 0.02 * i, 0.27 - i * 0.04, -0.39 - i * 0.012, { rx: Math.PI / 2 - 0.3 * i, outline: false });
    if (ctx.againstWall) part(g, cyl(0.06, 0.06, 0.8, 14), '#b0bec5', 0, 1.6, -0.44);
    dustHeap(g, 0.3, 0, 0.3, 0.12);
    dustHeap(g, -0.1, 0, -0.4, 0.1);
    // The stack of boards waiting, and the strips done on the far side.
    const SB = frame(g, new THREE.Vector3(0, TS, bz), yaw);
    const stack: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Group();
      b.position.copy(v3(RIP.stack)).add(new THREE.Vector3(0, RIP.thick * (i + 0.5), 0));
      SB.add(b);
      part(b, box(RIP.wide, RIP.thick, RIP.len), i % 2 ? PINE : '#e3c48d', 0, 0, 0);
      face(b, grainMat(PINE, i), RIP.wide, RIP.thick, 0, 0, -RIP.len / 2 - 0.0005, Math.PI);
      stack.push(b);
    }
    // The board being ripped: the strip left of the blade and the strip by the fence, the kerf between.
    const board = new THREE.Group();
    SB.add(board);
    const half = RIP.wide / 2;
    const cutAt = -RIP.mid;
    const leftW = half - cutAt;
    const rightW = half + cutAt;
    const leftStrip = part(board, box(leftW, RIP.thick, RIP.len), PINE, cutAt + leftW / 2, 0, 0);
    const rightStrip = part(board, box(rightW, RIP.thick, RIP.len), PINE, cutAt - rightW / 2, 0, 0);
    face(board, grainMat(PINE, 3), RIP.wide, RIP.thick, 0, 0, -RIP.len / 2 - 0.0005, Math.PI);
    const kerf = part(board, box(0.004, 0.002, 1), '#5d4037', cutAt, RIP.thick / 2 + 0.001, 0, { outline: false });
    const stick = new THREE.Group();
    SB.add(stick);
    part(stick, box(0.012, 0.3, 0.05), '#ff8f00', 0, 0.15, 0);
    part(stick, box(0.014, 0.03, 0.02), '#e65100', 0, 0.015, 0.03, { outline: false });
    const dust = bits(SB, 18, SAWDUST, 0.007);
    const workAt = marker(g, 0, TS, bz);
    const spots: Record<string, Spot> = {
      sawBoards: at(spot(g, 'stand', -0.3, 0, bz + 0.62, yaw), workAt, 'ripSaw'),
      '*': at(spot(g, 'stand', -0.3, 0, bz + 0.62, yaw), workAt, 'ripSaw'),
    };
    out.spots = spots;
    out.work = workAt;
    const v = new THREE.Vector3();
    const w2 = new THREE.Vector3();
    let spin = 0;
    let last = 0;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      if (!now) {
        stack.forEach((b) => (b.visible = true));
        board.visible = false;
        stick.position.copy(v3(RIP.stick, v));
        alongY(stick, v, v3(RIP.stick, w2).add(new THREE.Vector3(-0.02, 0.13, -0.16)));
        dust.forEach((d) => (d.visible = false));
        return;
      }
      spin += dt * 40;
      blade.rotation.x = spin;
      const k = ripRound(t, phaseOf(workAt));
      stack[3].visible = !k.taken;
      board.visible = k.taken && k.u < 0.97;
      board.position.copy(v3(k.board, v));
      const apart = k.lead > RIP.len ? 0.006 : 0;
      leftStrip.position.x = cutAt + leftW / 2 + apart;
      rightStrip.position.x = cutAt - rightW / 2;
      kerf.visible = k.cut > 0.005;
      kerf.scale.z = Math.max(0.001, k.cut);
      kerf.position.z = RIP.len / 2 - k.cut / 2;
      stick.position.copy(v3(k.stick, v));
      alongY(stick, v, v3(k.stick, w2).add(new THREE.Vector3(-0.02, 0.13, -0.16)));
      dust.forEach((d, i) => {
        const q = seeded(i * 23 + 9);
        const f = (t * 2.2 + i / dust.length) % 1;
        d.visible = k.cutting;
        // Thrown back off the top of the blade towards the sawyer, and falling.
        d.position.set((q() - 0.5) * 0.06, 0.05 + 0.25 * f * q() - 0.6 * f * f, -0.02 - 0.45 * f * (0.5 + q()));
        d.rotation.set(f * 6, i, 0);
      });
    };
  },

  /**
   * The lumber rack (목재 선반): a steel frame of five shelves of boards laid end-on, a species to each
   * shelf, named on its front edge (월넛, 화이트 오크, 체리, 메이플, 편백…), the growth rings showing on
   * every board's end, a moisture meter hung on its post and a sign over it. Choosing a board
   * (selectLumber, and learning the grain): a board drawn out by its end in both hands, its end lifted
   * and sighted along with the head down to it, turned over, the grain felt along with the right
   * hand, and slid back.
   */
  lumberRack(g, _W, _D, _c, _def, _ctx, out) {
    const n = rackCount++;
    const LEVELS = [0.1, 0.48, 0.88, 1.27, 1.66];
    const zf = 0.36;
    const zb = -0.46;
    const zm = (zf + zb) / 2;
    const depth = zf - zb;
    for (const sx of [-1, 1]) for (const z of [zb + 0.02, zf - 0.02]) part(g, box(0.04, 2.05, 0.04), '#455a64', sx * 0.44, 1.025, z);
    for (const sx of [-1, 1]) for (const y of [0.04, 2.03]) part(g, box(0.04, 0.04, depth), '#455a64', sx * 0.44, y, zm);
    part(g, box(0.92, 0.04, 0.04), '#455a64', 0, 2.03, zf - 0.02);
    const cols = [-0.3, -0.1, 0.1, 0.3];
    const pick = 2;
    const pickLevel = 3;
    LEVELS.forEach((y, li) => {
      part(g, box(0.86, 0.025, depth - 0.02), PLY, 0, y, zm);
      const sp = SPECIES[(n * 3 + li) % SPECIES.length];
      label(g, `${sp.name} ${sp.en}`, 0.34, 0.045, -0.2, y - 0.002, zf + 0.004, '#fff8e1', '#4e342e');
      const r = seeded(n * 31 + li * 7 + 1);
      cols.forEach((x, ci) => {
        const layers = 1 + Math.floor(r() * 3);
        for (let j = 0; j < layers; j++) {
          if (li === pickLevel && ci === pick && j === 0) continue;
          if (li === pickLevel && ci === pick) break;
          const len = LUMBER.len - r() * 0.08;
          const yy = y + 0.0125 + LUMBER.thick * (j + 0.5);
          const zz = zf + 0.02 - len / 2 - r() * 0.03;
          part(g, box(LUMBER.wide, LUMBER.thick, len), sp.color, x + (r() - 0.5) * 0.02, yy, zz);
          face(g, grainMat(sp.color, li * 4 + ci + j), LUMBER.wide, LUMBER.thick, x, yy, zz + len / 2 + 0.0005);
        }
      });
    });
    // The board that's taken out (its end at `work`), drawn from the shelf's species.
    const sp = SPECIES[(n * 3 + pickLevel) % SPECIES.length];
    const p = new THREE.Vector3(cols[pick], LEVELS[pickLevel] + 0.0125 + LUMBER.thick / 2, zf + 0.02);
    const S = frame(g, p, Math.PI);
    const pivot = new THREE.Group();
    S.add(pivot);
    const roller = new THREE.Group();
    pivot.add(roller);
    part(roller, box(LUMBER.wide, LUMBER.thick, LUMBER.len), sp.color, 0, 0, LUMBER.len / 2);
    face(roller, grainMat(sp.color, 9), LUMBER.wide, LUMBER.thick, 0, 0, -0.0005, Math.PI);
    // The knot on its underside (seen when it's turned).
    part(roller, cyl(0.018, 0.018, 0.002, 12), '#5d3b1f', 0.02, -LUMBER.thick / 2 - 0.001, 0.3, { outline: false });
    // A moisture meter on the post, and the sign on top.
    part(g, rbox(0.06, 0.11, 0.025, 0.01), '#fdd835', 0.47, 1.2, zf - 0.02);
    part(g, box(0.04, 0.03, 0.003), '#263238', 0.47, 1.22, zf - 0.006, { outline: false });
    label(g, '함수율 8%', 0.04, 0.014, 0.47, 1.22, zf - 0.004, '#263238', '#69f0ae');
    label(g, '목재 보관 · 수종별', 0.5, 0.08, 0, 1.95, zf + 0.002, '#5d4037', '#fff8e1');
    const workAt = marker(g, p.x, p.y, p.z);
    const stand = () => spot(g, 'stand', p.x, 0, p.z + 0.62, Math.PI);
    const spots: Record<string, Spot> = {
      selectLumber: at(stand(), workAt, 'sightBoard'),
      carpenter_learnGrain: at(stand(), workAt, 'sightBoard'),
      '*': at(stand(), workAt, 'sightBoard'),
    };
    out.spots = spots;
    out.work = workAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      if (!now) {
        pivot.position.set(0, 0, 0);
        pivot.rotation.set(0, 0, 0);
        roller.rotation.z = 0;
        return;
      }
      const k = sightRound(t, phaseOf(workAt));
      // Lifted about its far end: the near end where the round has it, the board running down and away.
      pivot.position.set(0, k.end.up, k.end.ahead);
      pivot.rotation.set(k.pitch, 0, 0);
      roller.rotation.z = k.roll;
    };
  },

  /**
   * The finishing table (마감 도장대): a trestle table under brown paper, a panel up on blue painter's
   * pyramids, the tin of oil (천연 오일 스테인) with a brush in it, sanding blocks and sheets by grit, a
   * rag, nitrile gloves and a jar of brushes, a stool drying at the end with its tag. Finishing
   * (finishFurniture): the panel sanded along the grain with the block, the left hand holding its edge,
   * dust lifting; then oiled row by row — the brush dipped, wiped on the lip, drawn along the grain,
   * each row going dark and glossy — and wiped off with the rag. Pricing (branch): stood at the end
   * writing up the quote on the order sheet beside the calculator.
   */
  finishingTable(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.78;
    const yaw = Math.PI;
    part(g, rbox(W - 0.14, 0.04, 0.74, 0.01), '#bfa27a', 0, top - 0.02, -0.05);
    part(g, box(W - 0.16, 0.003, 0.72), '#c9a77c', 0, top + 0.0015, -0.05, { outline: false });
    for (const [x, z, r] of [[-0.4, 0.1, 0.06], [0.5, -0.25, 0.05], [0.0, -0.3, 0.04]] as const) part(g, cyl(r, r, 0.001, 16), '#a7652f', x, top + 0.0035, z, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, box(0.06, top - 0.04, 0.06), '#5f6a72', sx * (W / 2 - 0.15), (top - 0.04) / 2, -0.32);
      part(g, box(0.06, top - 0.04, 0.06), '#5f6a72', sx * (W / 2 - 0.15), (top - 0.04) / 2, 0.22);
      part(g, box(0.05, 0.05, 0.6), '#5f6a72', sx * (W / 2 - 0.15), 0.12, -0.05);
    }
    part(g, box(W - 0.3, 0.05, 0.05), '#5f6a72', 0, 0.12, -0.05);
    // The panel on its pyramids.
    const pz = 0.04;
    const px = 0.1;
    const lift = 0.06;
    const pt = top + lift + 0.025;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.003, 0.03, lift, 3), '#1e88e5', px + sx * 0.22, top + lift / 2, pz + sz * 0.13);
    part(g, rbox(FINISH.w, 0.025, FINISH.d, 0.004), '#dcb27a', px, pt - 0.0125, pz);
    for (let i = 0; i < 6; i++) part(g, box(FINISH.w - 0.02, 0.0008, 0.004), '#c79a5e', px, pt + 0.0004, pz - 0.17 + i * 0.07, { outline: false });
    const p = new THREE.Vector3(px, pt, pz);
    const S = frame(g, p, yaw);
    // The tin of oil, open, and its label.
    const can = v3(FINISH.can);
    part(S, cyl(0.055, 0.055, 0.1, 18), '#8d6e63', can.x, can.y + 0.05, can.z);
    part(S, cyl(0.05, 0.05, 0.002, 18), '#7a4219', can.x, can.y + 0.098, can.z, { outline: false });
    label(S, '천연 오일', 0.08, 0.035, can.x, can.y + 0.05, can.z - 0.056, '#fff3e0', '#6d4c41', Math.PI);
    // Sanding sheets by grit, a jar of brushes, gloves, the drying stool and its tag.
    ['#120', '#220', '#320'].forEach((gr, i) => {
      part(g, box(0.14, 0.002, 0.11), '#d7c5a0', -0.55 + i * 0.03, top + 0.004 + i * 0.002, -0.28 + i * 0.02, { ry: 0.1 * i });
      label(g, gr, 0.05, 0.02, -0.55 + i * 0.03, top + 0.006 + i * 0.002, -0.24 + i * 0.02, '#d7c5a0', '#5d4037').rotation.set(-Math.PI / 2, 0, 0.1 * i);
    });
    part(g, cyl(0.04, 0.035, 0.12, 14), '#cfd8dc', -0.3, top + 0.06, -0.33);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(-0.3 + (i - 1) * 0.015, top + 0.08, -0.33), new THREE.Vector3(-0.3 + (i - 1) * 0.03, top + 0.22, -0.34 + (i % 2) * 0.02), 0.006, '#c49a68');
    part(g, rbox(0.12, 0.012, 0.09, 0.01), '#1e88e5', 0.62, top + 0.006, -0.3, { ry: 0.4 });
    const stool = new THREE.Group();
    stool.position.set(-0.68, top, 0.0);
    g.add(stool);
    part(stool, rbox(0.26, 0.025, 0.26, 0.02), '#9c5a2c', 0, 0.3, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(stool, box(0.025, 0.29, 0.025), '#9c5a2c', sx * 0.1, 0.145, sz * 0.1);
    label(g, '건조 중 · 만지지 마세요', 0.2, 0.04, -0.68, top + 0.36, 0.14, '#fff9c4', '#bf360c');
    // What moves: the block, the brush, the rag, the wet rows; the quote sheet for pricing.
    const block = new THREE.Group();
    S.add(block);
    part(block, rbox(0.1, 0.032, 0.065, 0.008), '#37474f', 0, 0.02, 0);
    part(block, box(0.1, 0.004, 0.065), '#d7c5a0', 0, 0.002, 0, { outline: false });
    const brush = new THREE.Group();
    S.add(brush);
    part(brush, box(0.05, 0.035, 0.012), '#e8d4a8', 0, 0.0175, 0, { outline: false });
    part(brush, box(0.052, 0.025, 0.014), '#b0bac1', 0, 0.045, 0);
    part(brush, rbox(0.03, 0.12, 0.012, 0.006), '#c62828', 0, 0.115, 0);
    const rag = new THREE.Group();
    S.add(rag);
    for (let i = 0; i < 4; i++) part(rag, rbox(0.07, 0.025, 0.06, 0.012), '#eeeeee', (i % 2) * 0.02 - 0.01, 0.0125 + (i > 1 ? 0.012 : 0), Math.floor(i / 2) * 0.02 - 0.01, { ry: i * 0.7 });
    const WET = new THREE.MeshToonMaterial({ color: '#a2602c', emissive: '#2a1406', gradientMap: gradient, transparent: true, opacity: 0.92 });
    const wet = FINISH.rows.map((a) => {
      const m = new THREE.Mesh(box(1, 0.0015, 0.088), WET);
      m.position.set(0, 0.0012, a);
      m.userData.ownMaterial = true;
      S.add(m);
      return m;
    });
    const sandDust = bits(S, 10, '#efe2c4', 0.006);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const sheetAt = new THREE.Vector3(-0.62, top + 0.003, 0.12);
    const quote = new THREE.Group();
    use.add(quote);
    picture(quote, painted('carp-quote', 128, 160, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 128, 160);
      text(c, '견 적 서', 64, 16, 15, '#3e2723', 'center');
      const rows: Array<[string, string]> = [['월넛 판재', '420,000'], ['하드웨어', '35,000'], ['공임 4일', '480,000'], ['오일 마감', '60,000']];
      rows.forEach(([a, b], i) => {
        text(c, a, 8, 44 + i * 22, 11, '#4e342e', 'left', false);
        text(c, b, 120, 44 + i * 22, 11, '#4e342e', 'right', false);
      });
      c.fillStyle = '#4e342e';
      c.fillRect(8, 128, 112, 1);
      text(c, '합계 995,000원', 120, 142, 12, '#bf360c', 'right');
    }), 0.16, 0.2, sheetAt.x, sheetAt.y, sheetAt.z, '#ffffff', 0, -Math.PI / 2).rotation.set(-Math.PI / 2, 0, Math.PI);
    part(quote, rbox(0.08, 0.012, 0.12, 0.006), '#455a64', sheetAt.x - 0.15, top + 0.006, sheetAt.z - 0.02);
    const sheet = marker(g, sheetAt.x, sheetAt.y, sheetAt.z);
    const workAt = marker(g, p.x, p.y, p.z);
    const spots: Record<string, Spot> = {
      finishFurniture: at(spot(g, 'stand', px, 0, pz + 0.5, yaw), workAt, 'woodFinish'),
      carpenter_pricePiece: at(spot(g, 'stand', sheetAt.x, 0, 0.6, yaw), sheet, 'write'),
      xwSanding: carpenterSand(g, out, [block]),
      '*': at(spot(g, 'stand', px, 0, pz + 0.5, yaw), workAt, 'woodFinish'),
    };
    out.spots = spots;
    out.work = workAt;
    const v = new THREE.Vector3();
    const w2 = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const finishing = now === 'finishFurniture' || now === '*';
      quote.visible = now === 'carpenter_pricePiece';
      if (!finishing) {
        block.position.copy(v3(FINISH.block, v));
        alongY(brush, v3(FINISH.can, v).add(new THREE.Vector3(0, 0.06, 0)), v3(FINISH.can, w2).add(new THREE.Vector3(0.0, 0.25, 0.02)));
        rag.position.copy(v3(FINISH.rag, v));
        wet.forEach((m) => (m.visible = false));
        sandDust.forEach((d) => (d.visible = false));
        return;
      }
      const k = finishRound(t, phaseOf(workAt));
      block.position.copy(v3(k.block, v));
      alongY(brush, v3(k.brush, v), v3(k.brush, w2).add(new THREE.Vector3(-0.01, 0.13, -0.06)));
      rag.position.copy(v3(k.rag, v));
      const span = FINISH.w - 0.04;
      wet.forEach((m, i) => {
        const c = k.rows[i];
        m.visible = c > 0.01 && k.u > 0.36;
        m.scale.x = Math.max(0.001, span * c);
        m.position.x = -span / 2 + (span * c) / 2;
      });
      WET.opacity = k.wipe > 0.5 ? 0.75 : 0.92;
      sandDust.forEach((d, i) => {
        const q = seeded(i * 11 + 2);
        const f = (t * 0.9 + i / sandDust.length) % 1;
        d.visible = k.sanding;
        d.position.set(k.block.side + (q() - 0.5) * 0.12, 0.01 + f * 0.12, k.block.ahead + (q() - 0.5) * 0.1);
      });
    };
  },

  /**
   * The clamp rack (클램프 거치대, decor): two oak rails on a plywood back on the wall, F-clamps of
   * every length hung in a row by their bars, quick-grip clamps in orange, long pipe clamps stood
   * against it and a bucket of spring clamps on the floor; free-standing, an A-frame.
   */
  carpClampRack(g, _W, _D, _c, _def, ctx, out) {
    const zb = ctx.againstWall ? -0.47 : -0.1;
    if (ctx.againstWall) part(g, box(0.9, 1.3, 0.02), PLY, 0, 1.3, zb);
    else for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.42, 0, zb + 0.2), new THREE.Vector3(sx * 0.42, 1.95, zb), 0.025, BEECH_DARK);
    for (const y of [1.85, 1.25]) part(g, rbox(0.9, 0.06, 0.06, 0.01), OAK, 0, y, zb + 0.04);
    const r = seeded(5);
    for (let i = 0; i < 7; i++) fClamp(g, -0.36 + i * 0.12, 1.82, zb + 0.08, 0.3 + r() * 0.3, i % 3 === 2 ? '#ef6c00' : '#c62828');
    for (let i = 0; i < 4; i++) {
      const q = new THREE.Group();
      q.position.set(-0.3 + i * 0.2, 1.22, zb + 0.09);
      g.add(q);
      part(q, box(0.012, 0.34, 0.022), '#37474f', 0, -0.17, 0);
      part(q, rbox(0.03, 0.08, 0.09, 0.01), '#ff6f00', 0, -0.04, 0.03);
      part(q, rbox(0.03, 0.12, 0.05, 0.01), '#212121', 0, -0.22, 0.05, { rx: 0.2 });
    }
    for (let i = 0; i < 3; i++) {
      rod(g, new THREE.Vector3(-0.3 + i * 0.2, 0.02, zb + 0.32), new THREE.Vector3(-0.32 + i * 0.2, 1.1, zb + 0.1), 0.014, '#263238');
      part(g, rbox(0.05, 0.07, 0.06, 0.01), '#c62828', -0.31 + i * 0.2, 0.9, zb + 0.15);
      part(g, rbox(0.05, 0.07, 0.06, 0.01), '#c62828', -0.3 + i * 0.2, 0.12, zb + 0.3);
    }
    part(g, cyl(0.12, 0.1, 0.22, 16), '#1e88e5', 0.32, 0.11, 0.25);
    for (let i = 0; i < 6; i++) part(g, box(0.03, 0.1, 0.012), i % 2 ? '#ff7043' : '#fdd835', 0.32 + (r() - 0.5) * 0.14, 0.25, 0.25 + (r() - 0.5) * 0.12, { rz: (r() - 0.5) * 0.8 });
    label(g, '클램프 · 쓰고 나면 걸어 두기', 0.5, 0.06, 0, 1.98, zb + 0.08, '#fff8e1', '#4e342e');
    out.work = marker(g, 0, 1.2, zb + 0.1);
  },

  /**
   * The dust collector (집진기): a double-bag collector — the blue motor and impeller housing on a
   * wheeled frame, two white felt filter bags above and two clear bags below showing the sawdust,
   * clamped on with steel bands — its inlet piped to a duct up the wall, the remote on its hook.
   * Emptying it (carpEmptyDust): crouched at the left bag's clamp, the full bag off and tied, a sack of
   * sawdust on the floor beside, a fresh bag on.
   */
  carpDustCollector(g, _W, _D, _c, _def, ctx, out) {
    const BLUE = '#1e5aa8';
    part(g, rbox(0.8, 0.05, 0.4, 0.01), '#37474f', 0, 0.07, -0.05);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.03, 0.03, 0.025, 10), '#212121', sx * 0.36, 0.03, -0.05 + sz * 0.16, { rx: Math.PI / 2 });
    part(g, box(0.05, 1.1, 0.05), '#37474f', 0, 0.6, -0.22);
    part(g, rbox(0.86, 0.04, 0.12, 0.01), '#37474f', 0, 1.2, -0.08);
    // The motor and the impeller housing, the inlet with its hose.
    part(g, cyl(0.17, 0.17, 0.12, 24), BLUE, 0, 0.95, -0.08, { rx: Math.PI / 2 });
    part(g, cyl(0.09, 0.09, 0.22, 18), '#164580', 0, 0.95, -0.27, { rx: Math.PI / 2 });
    part(g, cyl(0.06, 0.06, 0.12, 14), '#90a4ae', 0, 0.95, 0.04, { rx: Math.PI / 2 });
    label(g, '2HP 집진기', 0.18, 0.05, 0, 0.95, -0.017, BLUE, '#ffffff');
    for (let i = 0; i < 7; i++) part(g, cyl(0.065, 0.065, 0.04, 14), '#b0bec5', 0.04 * i, 0.95 + 0.12 * i, 0.12 - 0.08 * i, { rx: Math.PI / 2 - 0.25 * i, outline: false });
    if (ctx.againstWall) {
      part(g, cyl(0.07, 0.07, 1.0, 14), '#cfd8dc', 0.28, 1.95, -0.42);
      part(g, cyl(0.07, 0.07, 0.9, 14), '#cfd8dc', -0.15, 2.4, -0.42, { rz: Math.PI / 2 });
    }
    // The bags: felt filters up top, clear bags of sawdust below.
    const CLEAR = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.42, depthWrite: false, gradientMap: gradient });
    const bagFill: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      part(g, cyl(0.15, 0.16, 0.62, 18), '#f5f5f0', sx * 0.25, 1.55, -0.06);
      part(g, ball(0.15), '#f5f5f0', sx * 0.25, 1.86, -0.06).scale.y = 0.5;
      part(g, cyl(0.17, 0.17, 0.035, 18), '#9aa3ab', sx * 0.25, 1.24, -0.06);
      part(g, cyl(0.17, 0.17, 0.035, 18), '#9aa3ab', sx * 0.25, 0.63, -0.06);
      const fill = part(g, cyl(0.15, 0.16, 1, 18), SAWDUST, sx * 0.25, 0, -0.06, { outline: false });
      bagFill.push(fill);
      glass(g, cyl(0.165, 0.17, 0.52, 18), sx * 0.25, 0.36, -0.06, CLEAR);
    }
    const setFill = (m: THREE.Mesh, h: number) => {
      m.scale.y = Math.max(0.001, h);
      m.position.y = 0.11 + h / 2;
    };
    setFill(bagFill[1], 0.3);
    // The remote on a hook, a sign.
    part(g, rbox(0.05, 0.09, 0.02, 0.01), '#212121', 0.42, 1.1, 0.0);
    glowing(g, ball(0.008), '#69f0ae', 0.42, 1.12, 0.012);
    label(g, '작업 전 집진기 ON', 0.3, 0.05, 0, 1.33, -0.01, '#fff8e1', '#c62828');
    // In use: the left bag off, a tied sack beside, a fresh bag going on.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const sack = new THREE.Group();
    sack.position.set(-0.3, 0, 0.35);
    use.add(sack);
    part(sack, ball(0.17), SAWDUST, 0, 0.15, 0).scale.set(1, 0.9, 0.85);
    part(sack, cyl(0.03, 0.06, 0.08, 10), '#cfd8dc', 0, 0.32, 0);
    glass(sack, ball(0.18), 0, 0.15, 0, CLEAR).scale.set(1, 0.9, 0.85);
    const workAt = marker(g, -0.25, 0.63, 0.11);
    const spots: Record<string, Spot> = {
      carpEmptyDust: at(spot(g, 'stand', -0.25, 0, 0.58, Math.PI), workAt, 'tinker'),
      '*': at(spot(g, 'stand', -0.25, 0, 0.58, Math.PI), workAt, 'tinker'),
    };
    out.spots = spots;
    out.work = workAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      setFill(bagFill[0], now ? 0.02 + 0.02 * Math.max(0, wave(t, 0.2)) : 0.42);
    };
  },

  /**
   * The drill press (드릴 프레스): a green floor-standing press — the base, the column, the table with
   * its fence, the head with the motor behind, the belt cover, the quill and chuck with a brad-point
   * bit, three feed handles on the right, a work lamp, the stop buttons, a 보안경 sign. Drilling dowel
   * holes (carpDrillHoles): an oak rail slid along under the bit to each pencil mark with the left
   * hand, the feed handle pulled round with the right, the bit spinning down into it, chips curling
   * off, and riding back up; three holes a rail.
   */
  carpDrillPress(g, _W, _D, _c, _def, _ctx, out) {
    const GREEN = '#3a7d44';
    const tableY = 0.8;
    const p = new THREE.Vector3(0, tableY + 0.04, 0.0);
    const yaw = Math.PI;
    part(g, rbox(0.42, 0.05, 0.42, 0.01), GREEN, 0, 0.025, -0.15);
    part(g, cyl(0.04, 0.04, 1.48, 14), '#cfd8dc', 0, 0.79, -0.32);
    part(g, rbox(0.34, 0.025, 0.32, 0.006), CAST, 0, tableY - 0.0125, 0.0);
    part(g, rbox(0.08, 0.06, 0.26, 0.01), GREEN, 0, tableY - 0.06, -0.18);
    part(g, cyl(0.06, 0.06, 0.08, 14), GREEN, 0, tableY - 0.06, -0.32);
    part(g, box(0.3, 0.035, 0.025), OAK, 0, tableY + 0.0175, -0.09);
    // The head, the motor, the belt cover; the stop buttons and the lamp.
    part(g, rbox(0.26, 0.28, 0.44, 0.04), GREEN, 0, 1.24, -0.16);
    part(g, cyl(0.09, 0.09, 0.24, 18), '#2e5d35', 0, 1.22, -0.44);
    part(g, rbox(0.27, 0.11, 0.56, 0.04), '#2e5d35', 0, 1.43, -0.2);
    label(g, '드릴 프레스', 0.2, 0.05, 0, 1.43, 0.083, '#2e5d35', '#ffffff');
    part(g, cyl(0.022, 0.022, 0.02, 14), '#d32f2f', -0.07, 1.28, 0.065, { rx: Math.PI / 2 });
    part(g, cyl(0.016, 0.016, 0.02, 14), '#43a047', -0.07, 1.21, 0.065, { rx: Math.PI / 2 });
    label(g, '⚠ 보안경 착용', 0.16, 0.04, 0.05, 1.32, 0.062, '#fdd835', '#212121');
    rod(g, new THREE.Vector3(-0.13, 1.3, -0.05), new THREE.Vector3(-0.2, 1.25, 0.05), 0.008, '#37474f');
    part(g, cyl(0.02, 0.035, 0.05, 12), '#37474f', -0.2, 1.22, 0.07);
    const lamp = glowing(g, ball(0.016), '#fff3c4', -0.2, 1.195, 0.07);
    // The depth stop rod on the left.
    part(g, cyl(0.006, 0.006, 0.2, 8), STEEL, -0.1, 1.05, 0.02, { outline: false });
    const S = frame(g, p, yaw);
    // The quill, chuck and bit (they come down and spin), and the feed handles (they turn).
    const quill = new THREE.Group();
    S.add(quill);
    part(quill, cyl(0.028, 0.028, 0.08, 14), '#cfd8dc', 0, DRILL.gap + 0.16, 0);
    const chuck = new THREE.Group();
    chuck.position.set(0, DRILL.gap, 0);
    quill.add(chuck);
    part(chuck, cyl(0.024, 0.016, 0.06, 12), '#90a4ae', 0, 0.09, 0);
    part(chuck, cyl(0.004, 0.004, 0.065, 8), '#b0bac1', 0, 0.03, 0, { outline: false });
    part(chuck, box(0.012, 0.004, 0.003), '#5f6a72', 0, 0.002, 0, { outline: false });
    const hub = new THREE.Group();
    hub.position.copy(v3(DRILL.hub));
    S.add(hub);
    part(hub, cyl(0.032, 0.032, 0.05, 14), '#cfd8dc', 0.0, 0, 0, { rz: Math.PI / 2 });
    const spokes = new THREE.Group();
    hub.add(spokes);
    for (let i = 0; i < 3; i++) {
      const a = DRILL.a0 + (i * Math.PI * 2) / 3;
      const end = new THREE.Vector3(-0.03, Math.cos(a) * DRILL.spoke, -Math.sin(a) * DRILL.spoke);
      rod(spokes, new THREE.Vector3(-0.03, 0, 0), end, 0.007, STEEL);
      part(spokes, ball(0.018), '#212121', end.x, end.y, end.z);
    }
    // The rail on the table, its pencil marks and the holes drilled.
    const rail = new THREE.Group();
    S.add(rail);
    part(rail, box(0.36, 0.04, 0.06), OAK, 0, -0.02, 0);
    const holes = DRILL.holes.map((h) => {
      part(rail, box(0.0015, 0.001, 0.03), '#37474f', h, 0.0006, 0, { outline: false });
      return part(rail, cyl(0.0045, 0.0045, 0.002, 10), '#2b1d12', h, 0.0012, 0, { outline: false });
    });
    const chips = Array.from({ length: 6 }, () => shaving(S, 0.006, 4));
    const workAt = marker(g, p.x, p.y, p.z);
    const spots: Record<string, Spot> = {
      carpDrillHoles: at(spot(g, 'stand', 0, 0, 0.5, yaw), workAt, 'drillPress'),
      '*': at(spot(g, 'stand', 0, 0, 0.5, yaw), workAt, 'drillPress'),
    };
    out.spots = spots;
    out.work = workAt;
    let spin = 0;
    let last = 0;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      lamp.visible = now !== null;
      if (!now) {
        quill.position.y = 0;
        spokes.rotation.x = 0;
        rail.position.x = -DRILL.holes[0];
        holes.forEach((h) => (h.visible = false));
        chips.forEach((c) => (c.visible = false));
        return;
      }
      const k = drillRound(t, phaseOf(workAt));
      spin += dt * 30;
      chuck.rotation.y = spin;
      quill.position.y = -DRILL.travel * k.pull;
      spokes.rotation.x = -(k.angle - DRILL.a0);
      rail.position.x = k.shift;
      holes.forEach((h, i) => (h.visible = i < k.done));
      chips.forEach((c, i) => {
        const f = (t * 1.5 + i / chips.length) % 1;
        c.visible = k.drilling;
        const a = spin * 0.3 + (i / chips.length) * Math.PI * 2;
        c.position.set(Math.cos(a) * (0.01 + 0.05 * f), 0.004 + 0.02 * f, Math.sin(a) * (0.01 + 0.05 * f));
        c.rotation.set(0, a, f * 2);
      });
    };
  },

  /**
   * The order board (주문 현황판): a whiteboard on the wall (on legs standing free) listing the
   * commissions — what, for whom, in what wood, by when, and how far along, the first one due in red —
   * a sketch of the dining table with its sizes, magnets, sticky notes and a pen tray. Sorting the
   * orders (carpCheckOrders): stood at it with a marker, the row being worked on lit up in yellow.
   */
  carpOrderBoard(g, _W, _D, _c, _def, ctx, out) {
    const zb = ctx.againstWall ? -0.47 : -0.05;
    const y = 1.35;
    if (!ctx.againstWall) for (const sx of [-1, 1]) {
      rod(g, new THREE.Vector3(sx * 0.45, 0, zb + 0.15), new THREE.Vector3(sx * 0.45, 1.75, zb), 0.02, '#b0bec5');
      rod(g, new THREE.Vector3(sx * 0.45, 0, zb - 0.15), new THREE.Vector3(sx * 0.45, 1.75, zb), 0.02, '#b0bec5');
    }
    part(g, rbox(0.98, 0.7, 0.03, 0.01), '#cfd8dc', 0, y, zb);
    picture(g, painted('carp-orders', 512, 352, paintOrders), 0.92, 0.633, 0, y, zb + 0.016);
    part(g, box(0.6, 0.025, 0.06), '#b0bec5', 0.1, y - 0.37, zb + 0.03);
    for (let i = 0; i < 3; i++) part(g, cyl(0.007, 0.007, 0.11, 8), ['#1565c0', '#d32f2f', '#212121'][i], 0.0 + i * 0.05, y - 0.35, zb + 0.035, { rz: Math.PI / 2 });
    for (const [x, yy, col] of [[-0.42, 0.28, '#e53935'], [0.4, 0.28, '#1e88e5'], [-0.42, -0.2, '#fdd835']] as const) part(g, cyl(0.016, 0.016, 0.012, 12), col, x, y + yy, zb + 0.022, { rx: Math.PI / 2 });
    for (const [x, yy, col, r] of [[0.33, -0.18, '#fff59d', 0.1], [0.42, -0.12, '#f8bbd0', -0.08]] as const) part(g, box(0.08, 0.08, 0.002), col, x, y + yy, zb + 0.018, { rz: r, outline: false });
    // The row worked on, lit up while someone's at it.
    const hl = part(g, box(0.9, 0.06, 0.002), '#fff59d', 0, y, zb + 0.0175, { outline: false, shadow: false, material: new THREE.MeshBasicMaterial({ color: '#fff59d', transparent: true, opacity: 0.35 }) });
    hl.userData.ownMaterial = true;
    hl.visible = false;
    const rowY = (i: number) => y + 0.633 / 2 - ((96 + i * 34) / 352) * 0.633;
    const workAt = marker(g, 0.05, y, zb + 0.02);
    const spots: Record<string, Spot> = {
      carpCheckOrders: at(spot(g, 'stand', 0, 0, zb + 0.5, Math.PI), workAt, 'board'),
      '*': at(spot(g, 'stand', 0, 0, zb + 0.5, Math.PI), workAt, 'board'),
    };
    out.spots = spots;
    out.work = workAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      hl.visible = now !== null;
      if (now) hl.position.y = rowY(Math.floor(t / 4) % 5);
    };
  },

  /**
   * The showroom platform (완성 가구 전시대, 2 tiles): a low walnut-edged plinth with what the shop has
   * made — a walnut dining chair, a round side table with a vase, a three-drawer chest in cherry,
   * cutting boards on a stand — each with its price tag, and the 공방's carved name board and two
   * spotlights on the wall above. Photographing a piece for the shop's SNS (carpPhotoPiece): stood
   * back with the phone up in both hands, framing the chair (on the screen, hearts and all), the
   * flash going.
   */
  carpShowcase(g, W, _D, _c, _def, ctx, out) {
    const h = 0.12;
    part(g, rbox(W - 0.1, h, 0.72, 0.01), '#efe6d6', 0, h / 2, -0.12);
    part(g, box(W - 0.08, 0.03, 0.74), WALNUT, 0, 0.015, -0.12);
    walnutChair(g, -0.6, h, -0.15, 0.25);
    // A round side table with a vase.
    part(g, cyl(0.2, 0.2, 0.025, 24), OAK, -0.05, h + 0.5, -0.15);
    part(g, cyl(0.025, 0.04, 0.48, 12), OAK_DARK, -0.05, h + 0.25, -0.15);
    part(g, cyl(0.14, 0.15, 0.02, 20), OAK_DARK, -0.05, h + 0.01, -0.15);
    part(g, cyl(0.035, 0.05, 0.16, 14), '#eceff1', -0.05, h + 0.6, -0.15);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(-0.05, h + 0.66, -0.15), new THREE.Vector3(-0.05 + (i - 1) * 0.06, h + 0.82, -0.15 + (i % 2) * 0.04), 0.004, '#558b2f');
    // A three-drawer chest in cherry.
    part(g, rbox(0.46, 0.56, 0.36, 0.01), CHERRY, 0.55, h + 0.3, -0.25);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.42, 0.003, 0.004), '#7a3f22', 0.55, h + 0.12 + i * 0.17, -0.068, { outline: false });
      part(g, rbox(0.06, 0.018, 0.02, 0.008), '#c9a34a', 0.55, h + 0.2 + i * 0.17, -0.06);
    }
    for (const sx of [-1, 1]) part(g, box(0.03, 0.04, 0.03), CHERRY, 0.55 + sx * 0.2, h + 0.0, -0.25);
    // Cutting boards on a little stand at the front corner.
    for (let i = 0; i < 3; i++) part(g, rbox(0.2, 0.3 - i * 0.04, 0.02, 0.03), [WALNUT, CHERRY, MAPLE][i], 0.75 - i * 0.02, h + 0.15 - i * 0.02, 0.1 + i * 0.03, { rx: -0.25 });
    // The price tags.
    const tags: Array<[string, string, number, number, number]> = [
      ['월넛 체어', '₩380,000', -0.6, h + 0.06, 0.12],
      ['원형 사이드 테이블', '₩290,000', -0.05, h + 0.06, 0.12],
      ['체리 3단 서랍장', '₩1,250,000', 0.42, h + 0.06, 0.12],
    ];
    for (const [n, pr, x, y, z] of tags) {
      part(g, box(0.004, 0.1, 0.004), '#9e9e9e', x, y - 0.03, z - 0.01, { outline: false });
      picture(g, painted(`carp-tag-${n}`, 128, 80, paintPriceTag(n, pr)), 0.12, 0.075, x, y + 0.04, z, '#ffffff', 0, -0.3);
    }
    if (ctx.againstWall) {
      part(g, rbox(0.9, 0.2, 0.04, 0.02), WALNUT, 0, 1.95, -0.48);
      label(g, '나무결 공방 · 주문 제작 가구', 0.84, 0.13, 0, 1.95, -0.458, WALNUT, '#f3e3c3');
      part(g, box(1.6, 0.03, 0.04), '#212121', 0, 2.3, -0.46);
      for (const x of [-0.55, 0.5]) {
        part(g, cyl(0.035, 0.045, 0.12, 12), '#212121', x, 2.22, -0.38, { rx: 0.7 });
        glowing(g, cyl(0.03, 0.03, 0.005, 12), '#fff3c4', x, 2.18, -0.33, 0.7);
      }
    }
    // In use: the phone up, its screen to the photographer, the flash.
    const phoneAt = new THREE.Vector3(0.25, 1.34, 0.43);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const phone = new THREE.Group();
    phone.position.set(phoneAt.x, phoneAt.y - 0.03, phoneAt.z + 0.06);
    use.add(phone);
    part(phone, rbox(0.15, 0.075, 0.009, 0.008), BLACK, 0, 0, 0);
    picture(phone, painted('carp-photo', 160, 96, paintPhoto), 0.138, 0.065, 0, 0, 0.0052);
    const flash = glowing(phone, ball(0.006), '#ffffff', 0.06, 0.025, -0.006);
    const workAt = marker(g, phoneAt.x, phoneAt.y, phoneAt.z);
    const spots: Record<string, Spot> = {
      carpPhotoPiece: at(spot(g, 'stand', phoneAt.x, 0, 0.75, Math.PI), workAt, 'peer'),
      '*': at(spot(g, 'stand', phoneAt.x, 0, 0.75, Math.PI), workAt, 'peer'),
    };
    out.spots = spots;
    out.work = workAt;
    out.animate = (t) => {
      flash.visible = (t % 3.2) < 0.12;
    };
  },

  /**
   * The offcut crate (자투리 나무 상자, decor): a slatted pine crate full of offcuts of every wood,
   * some standing up out of it and a few on the floor, with a cardboard sign — 자투리 나무 나눔,
   * take what you need — as the 공방s do.
   */
  carpOffcutBin(g, _W, _D, _c, _def, _ctx, out) {
    const ch = 0.42;
    for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) part(g, box(0.62, 0.1, 0.02), PINE, 0, 0.08 + i * 0.14, sz * 0.25);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) part(g, box(0.02, 0.1, 0.5), PINE, sx * 0.31, 0.08 + i * 0.14, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, ch, 0.04), '#cfa970', sx * 0.3, ch / 2, sz * 0.24);
    part(g, box(0.6, 0.02, 0.48), PLY, 0, 0.03, 0);
    const r = seeded(77);
    const woods = [OAK, WALNUT, CHERRY, MAPLE, PINE, HINOKI, '#c98d5a'];
    for (let i = 0; i < 16; i++) {
      const len = 0.12 + r() * 0.4;
      const col = woods[Math.floor(r() * woods.length)];
      const m = part(g, box(0.04 + r() * 0.08, 0.025 + r() * 0.03, len), col, (r() - 0.5) * 0.45, 0.25 + r() * 0.15 + (len > 0.35 ? 0.12 : 0), (r() - 0.5) * 0.3);
      m.rotation.set((r() - 0.5) * 1.6 + (len > 0.35 ? 1.1 : 0), r() * 3, (r() - 0.5) * 0.5);
    }
    for (let i = 0; i < 3; i++) part(g, box(0.06, 0.03, 0.2 + i * 0.05), woods[i], 0.2 - i * 0.25, 0.015, 0.36 + (i % 2) * 0.05, { ry: 0.6 * i + 0.3 });
    part(g, box(0.34, 0.2, 0.006), '#c8a26d', 0, 0.62, 0.26, { rx: -0.15 });
    label(g, '자투리 나무 나눔', 0.3, 0.07, 0, 0.66, 0.267, '#c8a26d', '#3e2723').rotation.x = -0.15;
    label(g, '필요하신 분 가져가세요 :)', 0.3, 0.045, 0, 0.57, 0.275, '#c8a26d', '#5d4037').rotation.x = -0.15;
    part(g, box(0.006, 0.18, 0.006), '#8d6e63', 0, 0.5, 0.25, { outline: false });
    out.work = marker(g, 0, 0.45, 0.25);
  },
  // ===========================================================================================
  // The 목공소 as a panel factory (2026-11-05, the layout audit): machines, the paint booth, the showroom's boards, the yard.

  /** 수압대패 (2 × 1): the long cast bed in two tables with the cutter guard between, the fence, the dust hood piped off; a board on the infeed. */
  carpJointer(g, W) {
    part(g, rbox(W - 0.5, 0.72, 0.42, 0.03), MACHINE, 0, 0.36, -0.02);
    part(g, box(W - 0.2, 0.05, 0.36), CAST, -0.02, 0.86, 0);
    part(g, box(W - 0.2, 0.012, 0.004), '#7c868d', -0.02, 0.886, 0.18, { outline: false });
    part(g, box(0.1, 0.05, 0.36), '#263238', 0.08, 0.87, 0, { outline: false });
    part(g, cyl(0.1, 0.1, 0.32, 16), '#fbc02d', 0.08, 0.93, 0, { rx: Math.PI / 2 });
    part(g, box(W - 0.4, 0.16, 0.05), CAST, 0, 0.97, -0.17);
    part(g, cyl(0.06, 0.06, 0.6, 12), '#90a4ae', 0.1, 0.48, -0.28, { rx: Math.PI / 2 });
    part(g, cyl(0.06, 0.06, 1.9, 12), '#90a4ae', 0.1, 1.2, -0.45);
    part(g, box(0.9, 0.035, 0.12), OAK, -0.5, 0.905, 0.02);
    part(g, rbox(0.12, 0.1, 0.06, 0.02), '#c62828', -W / 2 + 0.35, 0.6, 0.2);
    label(g, '수압대패 · 손 조심', 0.34, 0.07, W / 2 - 0.45, 0.6, 0.2, '#fbc02d', '#212121');
  },
  /** 밴드쏘 (1 × 1): the tall C-frame in green with its two wheel covers, the table and the thin blade through it, a curved cut-out lying by. */
  carpBandSaw(g) {
    part(g, rbox(0.42, 0.5, 0.36, 0.03), '#2e7d32', 0, 0.25, -0.06);
    part(g, rbox(0.46, 1.25, 0.18, 0.06), '#388e3c', 0, 1.15, -0.12);
    part(g, cyl(0.21, 0.21, 0.2, 24), '#2e7d32', 0.02, 1.55, -0.1, { rx: Math.PI / 2 });
    part(g, cyl(0.21, 0.21, 0.2, 24), '#2e7d32', 0.02, 0.72, -0.1, { rx: Math.PI / 2 });
    part(g, box(0.5, 0.03, 0.46), CAST, 0, 0.98, 0.08);
    part(g, box(0.006, 0.36, 0.006), STEEL, 0, 1.15, 0.1, { outline: false });
    part(g, box(0.04, 0.12, 0.05), '#212121', 0, 1.38, 0.1);
    part(g, box(0.26, 0.02, 0.16), WALNUT, -0.1, 1.005, 0.12, { ry: 0.3 });
    label(g, 'BAND SAW', 0.24, 0.06, 0, 1.15, -0.025, '#388e3c', '#ffffff');
  },
  /** 자재 카트 (2 × 1): a flat steel cart on castors, ripped boards stacked on it, the push handle at one end. */
  carpLumberCart(g, W) {
    part(g, box(W - 0.25, 0.04, 0.6), '#607d8b', 0, 0.26, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.06, 0.06, 0.05, 12), '#263238', sx * (W / 2 - 0.25), 0.07, sz * 0.24, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.03, 0.14, 0.03), '#455a64', sx * (W / 2 - 0.25), 0.17, sz * 0.24, { outline: false });
    part(g, box(0.04, 0.7, 0.6), '#455a64', W / 2 - 0.14, 0.6, 0);
    const woods = [OAK, WALNUT, PINE, MAPLE, CHERRY];
    for (let i = 0; i < 5; i++) part(g, box(W - 0.5, 0.035, 0.11), woods[i], -0.05, 0.3 + Math.floor(i / 3) * 0.04, -0.2 + (i % 3) * 0.2);
  },
  /** 도장 건조대 (1 × 1): a tall steel rack of slotted shelves, oiled panels laid flat to dry on it. */
  carpDryRack(g) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.03, 1.7, 0.03), '#9e9e9e', sx * 0.36, 0.85, sz * 0.3, { outline: false });
    for (let i = 0; i < 6; i++) {
      part(g, box(0.74, 0.015, 0.62), '#bdbdbd', 0, 0.15 + i * 0.28, 0, { outline: false });
      if (i % 5) part(g, box(0.6, 0.02, 0.5), [CHERRY, WALNUT, OAK, MAPLE, OAK][i - 1], 0, 0.17 + i * 0.28, 0);
    }
    label(g, '건조 중 · 만지지 마세요', 0.42, 0.06, 0, 1.75, 0.31, '#fff8e1', '#e65100');
  },
  /** 도장 부스 배기팬·필터 (1 × 1, on the wall): the filter wall in its frame, the exhaust fan behind the grille, the duct up through the roof. */
  carpBoothFan(g) {
    part(g, box(0.9, 1.9, 0.12), '#cfd8dc', 0, 1.05, -0.42);
    part(g, box(0.8, 1.1, 0.02), '#f5f0e1', 0, 0.75, -0.355);
    for (let i = 0; i < 6; i++) part(g, box(0.8, 0.01, 0.025), '#e0d7bf', 0, 0.25 + i * 0.2, -0.345, { outline: false });
    part(g, cyl(0.3, 0.3, 0.06, 28), '#455a64', 0, 1.6, -0.36, { rx: Math.PI / 2 });
    for (let i = 0; i < 4; i++) part(g, box(0.5, 0.06, 0.01), '#90a4ae', 0, 1.6, -0.32, { rz: (i * Math.PI) / 4, outline: false });
    part(g, cyl(0.16, 0.16, 0.9, 16), '#b0bec5', 0, 2.45, -0.4);
    label(g, '도장 부스 · 화기 엄금', 0.5, 0.08, 0, 2.08, -0.355, '#c62828', '#ffffff');
  },
  /** 도료 보관장 (1 × 1, on the wall): a yellow steel cabinet for flammables, cans of oil and stain on its shelves. */
  carpPaintShelf(g) {
    part(g, rbox(0.7, 1.5, 0.45, 0.02), '#fbc02d', 0, 0.75, -0.2);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.62, 0.02, 0.4), '#e0a800', 0, 0.35 + i * 0.4, 0.03, { outline: false });
      for (let j = 0; j < 3; j++) part(g, cyl(0.07, 0.07, 0.16, 14), ['#c62828', '#6d4c41', '#eceff1'][(i + j) % 3], -0.2 + j * 0.2, 0.44 + i * 0.4, 0.06);
    }
    label(g, '인화성 물질', 0.36, 0.08, 0, 1.38, 0.031, '#fbc02d', '#c62828');
  },
  /** 원목 샘플 보드 (1 × 1, on the wall): squares of each wood oiled and named, a stand of edge samples under them. */
  carpSampleWall(g) {
    part(g, box(0.86, 1.0, 0.04), '#f3ead8', 0, 1.45, -0.46);
    const woods: Array<[string, string]> = [['월넛', WALNUT], ['오크', OAK], ['체리', CHERRY], ['메이플', MAPLE], ['애쉬', '#d8c49a'], ['편백', HINOKI]];
    woods.forEach(([n, c], i) => {
      const x = -0.27 + (i % 3) * 0.27;
      const y = 1.65 - Math.floor(i / 3) * 0.42;
      part(g, box(0.22, 0.22, 0.03), c, x, y, -0.43);
      label(g, n, 0.16, 0.05, x, y - 0.15, -0.438, '#f3ead8', '#3e2723');
    });
    part(g, box(0.7, 0.8, 0.3), OAK_DARK, 0, 0.4, -0.3);
    for (let i = 0; i < 5; i++) part(g, box(0.1, 0.02, 0.26), [WALNUT, OAK, CHERRY, MAPLE, PINE][i], -0.25 + i * 0.125, 0.81, -0.3);
  },
  /** 목재 더미·팔레트 (2 × 1): rough-sawn boards on a pallet, stickered in layers to dry, a tarp folded back on top, a strap. */
  carpLumberStack(g, W) {
    part(g, box(W - 0.15, 0.12, 0.85), '#b08a5a', 0, 0.06, 0);
    for (let l = 0; l < 5; l++) {
      for (let i = 0; i < 5; i++) part(g, box(W - 0.2, 0.06, 0.15), l % 2 ? PINE : '#d9b98a', 0, 0.16 + l * 0.1, -0.33 + i * 0.165);
      if (l < 4) for (const x of [-0.3, 0, 0.3]) part(g, box(0.04, 0.03, 0.82), '#6d4c41', x * W, 0.205 + l * 0.1, 0, { outline: false });
    }
    part(g, box(W * 0.55, 0.03, 0.9), '#1565c0', -W * 0.2, 0.66, 0);
    part(g, box(0.04, 0.6, 0.88), '#ff8f00', W * 0.3, 0.38, 0, { outline: false });
  },
  /** 목재 반입 셔터 (on the yard, its anchor beside the two-bay shutter in the store's wall): the frame, the rolled-up shutter's box, the striped guides. */
  carpShutter(g) {
    // The opening runs along the wall from local z 0.5 to 2.5; an outside wall stands on the room's edge (world x 18), a tile and a
    // half west of the anchor's centre, its outer face half its thickness out.
    const X = -1.5 + 0.08 + 0.06;
    part(g, box(0.12, 0.45, 2.2), '#90a4ae', X, 2.55, 1.5);
    part(g, cyl(0.18, 0.18, 2.0, 16), '#78909c', X + 0.14, 2.15, 1.5, { rx: Math.PI / 2 });
    part(g, box(0.05, 0.12, 1.9), '#b0bec5', X + 0.03, 1.9, 1.5);
    for (const z of [0.56, 2.44]) {
      part(g, box(0.1, 2.3, 0.1), '#607d8b', X, 1.15, z);
      for (let i = 0; i < 5; i++) part(g, box(0.105, 0.2, 0.105), i % 2 ? BLACK : '#fbc02d', X, 0.15 + i * 0.4, z, { outline: false });
    }
    label(g, '목재 반입구', 0.6, 0.14, X + 0.065, 2.6, 1.5, '#90a4ae', '#ffffff', Math.PI / 2);
    part(g, box(0.1, 0.004, 2.0), '#fbc02d', X + 0.1, 0.012, 1.5, { outline: false });
  },
  /** The showroom's glass front on the street and the sign over it (shopFront.ts). */
  carpFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 13, door: 12, name: '나무결 공방', sub: '원목 가구 주문 제작 · 쇼룸', bg: '#5d4037', fg: '#f3e3c3', frame: '#3e2723', awning: '#6d4c41', posters: [['맞춤 식탁 상담', '#f3e3c3', '#3e2723', 4.5], ['원데이 클래스', '#fff8e1', '#5d4037', 8.5]] });
  },
  /**
   * 목재 운반 1톤 트럭 (2 × 4, set 'up' so its tail is to the lumber pile and its nose to the street): a white cab, the drop-side bed
   * loaded with boards, the tailgate down; the timber yard's name on the door. Unloaded from the tail.
   */
  carpTruck(g, W, D) {
    const L = D - 0.2;
    const hw = Math.min(W - 0.3, 1.7) / 2;
    const zt = L / 2;
    const zn = -L / 2;
    const cab = zn + 1.3;
    for (const z of [zn + 0.55, zt - 0.7])
      for (const sx of [-1, 1]) {
        part(g, cyl(0.3, 0.3, 0.2, 18), '#212121', sx * (hw - 0.08), 0.3, z, { rz: Math.PI / 2 });
        part(g, cyl(0.15, 0.15, 0.21, 12), '#b0bec5', sx * (hw - 0.08), 0.3, z, { rz: Math.PI / 2, outline: false });
      }
    part(g, box(hw * 1.6, 0.16, L - 0.2), '#263238', 0, 0.45, 0);
    // The cab, its windscreen to the nose.
    part(g, rbox(hw * 2, 1.35, 1.3, 0.12), '#fafafa', 0, 1.1, zn + 0.65);
    glass(g, box(hw * 1.8, 0.55, 0.03), 0, 1.45, zn - 0.005);
    for (const sx of [-1, 1]) glass(g, box(0.03, 0.45, 0.7), sx * hw, 1.45, zn + 0.75);
    part(g, box(hw * 2 - 0.1, 0.2, 0.05), '#cfd8dc', 0, 0.62, zn - 0.01);
    for (const sx of [-1, 1]) {
      part(g, box(0.18, 0.08, 0.03), '#fff59d', sx * (hw - 0.2), 0.78, zn - 0.02, { outline: false });
      label(g, '숲길목재', 0.42, 0.12, sx * (hw + 0.006), 0.95, zn + 0.75, '#fafafa', '#2e7d32', (sx * Math.PI) / 2);
    }
    // The bed and its drop sides, the boards, the tailgate let down.
    const bl = zt - cab;
    part(g, box(hw * 2, 0.06, bl), '#90a4ae', 0, 0.58, cab + bl / 2);
    for (const sx of [-1, 1]) part(g, box(0.04, 0.35, bl), '#b0bec5', sx * hw, 0.78, cab + bl / 2);
    part(g, box(hw * 2, 0.35, 0.04), '#b0bec5', 0, 0.78, cab + 0.02);
    part(g, box(hw * 2, 0.35, 0.04), '#b0bec5', 0, 0.42, zt + 0.02, { rx: 1.2 });
    const woods = [PINE, '#d9b98a', OAK, PINE, '#d9b98a'];
    for (let l = 0; l < 3; l++) for (let i = 0; i < 5; i++) part(g, box(0.24, 0.06, bl - 0.25), woods[(i + l) % 5], -hw + 0.22 + i * ((hw * 2 - 0.44) / 4), 0.65 + l * 0.065, cab + bl / 2 + 0.05);
    part(g, box(0.05, 0.25, bl - 0.2), '#ff8f00', 0, 0.8, cab + bl / 2, { outline: false });
  },

};

// ---------------------------------------------------------------------------------------------
// The 내장 목공 현장's pieces (2026-11-04, the branch lots: workFurniture/carpenter.ts).

const CP_TIMBER = '#d2b07a';
const CP_BOARD = '#e6e4dc';

/** A 우마: a work platform on two folding A-frames, a step up to the ceiling. */
function cpUma(g: THREE.Object3D, x: number, z: number, len: number) {
  for (const dx of [-len / 2 + 0.1, len / 2 - 0.1]) for (const s of [-1, 1]) part(g, box(0.05, 0.95, 0.05), '#90a4ae', x + dx, 0.45, z + s * 0.16, { rx: s * 0.3, outline: false });
  part(g, box(len, 0.05, 0.42), '#b0bec5', x, 0.92, z);
}

/**
 * 천장 각재 틀 (3 × 2): the ceiling being framed. Threaded hangers down from the slab to the main runners, the timber grid across
 * them at 450, a stretch already boarded; under it a 우마 and a stepladder, the laser level on its tripod throwing its red line.
 */
function cpCeilingFrame(g: THREE.Group, W: number, D: number) {
  const H = 2.45;
  // The hangers.
  for (const x of [-W / 2 + 0.3, 0, W / 2 - 0.3]) for (const z of [-D / 2 + 0.3, D / 2 - 0.4]) part(g, cyl(0.008, 0.008, 0.4, 6), STEEL, x, H + 0.2, z, { outline: false });
  // The runners along, the battens across.
  for (const z of [-D / 2 + 0.3, D / 2 - 0.4]) part(g, box(W - 0.2, 0.06, 0.05), CP_TIMBER, 0, H, z);
  for (let x = -W / 2 + 0.2; x <= W / 2 - 0.15; x += 0.45) part(g, box(0.04, 0.04, D - 0.4), CP_TIMBER, x, H - 0.05, -0.05);
  // A stretch boarded already.
  part(g, box(0.9, 0.015, D - 0.4), CP_BOARD, -W / 2 + 0.6, H - 0.08, -0.05, { outline: false });
  cpUma(g, 0.3, 0.1, 1.5);
  // The stepladder.
  for (const s of [-1, 1]) part(g, box(0.05, 1.5, 0.05), '#f9a825', W / 2 - 0.35 + s * 0.2, 0.72, -0.3, { rx: 0.2, outline: false });
  for (let y = 0.3; y < 1.4; y += 0.3) part(g, box(0.4, 0.03, 0.06), '#f9a825', W / 2 - 0.35, y, -0.3 + y * 0.2 - 0.14, { outline: false });
  // The laser level on its tripod and its line round the wall.
  for (let i = 0; i < 3; i++) part(g, cyl(0.01, 0.01, 1.2, 6), BLACK, -W / 2 + 0.4 + Math.cos(i * 2.1) * 0.12, 0.58, D / 2 - 0.35 + Math.sin(i * 2.1) * 0.12, { rx: Math.sin(i * 2.1) * 0.2, rz: -Math.cos(i * 2.1) * 0.2, outline: false });
  part(g, rbox(0.12, 0.12, 0.12, 0.02), '#e53935', -W / 2 + 0.4, 1.22, D / 2 - 0.35);
  part(g, box(W - 0.2, 0.008, 0.008), '#ff1744', 0, 1.22, -D / 2 + 0.06, { outline: false });
  label(g, 'CH 2,700 · 각재 @450', 1.0, 0.16, 0, 1.6, -D / 2 + 0.05, '#fafafa', '#37474f');
}

/** Studs across the back of a W-wide piece, `h` high, every 0.45, with top and bottom plates; returns the back z. */
function cpStuds(g: THREE.Object3D, W: number, D: number, h: number, skip?: [number, number]): number {
  const z = -D / 2 + 0.1;
  part(g, box(W - 0.06, 0.05, 0.09), CP_TIMBER, 0, 0.025, z);
  part(g, box(W - 0.06, 0.05, 0.09), CP_TIMBER, 0, h, z);
  for (let x = -W / 2 + 0.06; x <= W / 2 - 0.05; x += 0.45) {
    if (skip && x > skip[0] && x < skip[1]) continue;
    part(g, box(0.045, h, 0.09), CP_TIMBER, x, h / 2, z);
  }
  return z;
}

/** 석고보드 붙이는 벽 (3 × 1): a stud wall with plasterboard screwed over two thirds of it, the last sheet leaning ready, the screw gun. */
function cpBoardWall(g: THREE.Group, W: number, D: number) {
  const h = 2.4;
  const z = cpStuds(g, W, D, h);
  for (let i = 0; i < 2; i++) {
    const x = -W / 2 + 0.06 + 0.6 + i * 1.2;
    part(g, box(1.18, h - 0.04, 0.012), CP_BOARD, x, h / 2, z + 0.052);
    for (let k = 0; k < 6; k++) for (const dx of [-0.55, 0, 0.55]) part(g, box(0.012, 0.012, 0.004), '#9e9e9e', x + dx, 0.2 + k * 0.4, z + 0.06, { outline: false });
  }
  part(g, box(0.9, 1.8, 0.012), CP_BOARD, W / 2 - 0.5, 0.9, z + 0.3, { rx: -0.1 });
  part(g, rbox(0.22, 0.16, 0.06, 0.02), '#1565c0', W / 2 - 0.8, 0.07, z + 0.4, { outline: false });
  label(g, '석고보드 2겹 · 9.5T', 0.8, 0.14, -W / 2 + 0.66, 1.5, z + 0.065, '#fafafa', '#455a64');
}

/** 벽체 각재·문틀 (3 × 1): a stud wall going up, the door opening in the middle with its header and the door frame stood in it. */
function cpStudWall(g: THREE.Group, W: number, D: number) {
  const h = 2.4;
  const z = cpStuds(g, W, D, h, [-0.5, 0.5]);
  // The header over the opening, the frame in it.
  part(g, box(1.05, 0.12, 0.09), CP_TIMBER, 0, 2.15, z);
  const frame = '#8d6e63';
  for (const s of [-1, 1]) part(g, box(0.06, 2.05, 0.12), frame, s * 0.47, 1.03, z + 0.02);
  part(g, box(1.0, 0.06, 0.12), frame, 0, 2.08, z + 0.02);
  // A level clamped to the jamb, a nail gun on the floor.
  part(g, box(0.04, 0.9, 0.04), '#43a047', 0.42, 1.2, z + 0.1, { outline: false });
  part(g, rbox(0.28, 0.12, 0.08, 0.02), '#e53935', -0.9, 0.06, z + 0.35, { outline: false });
}

/** 석고보드 단 (2 × 1): a stack of plasterboard on timber bearers, its wrapper's label. */
function cpBoardStack(g: THREE.Group, W: number, D: number) {
  for (const x of [-W / 2 + 0.3, 0, W / 2 - 0.3]) part(g, box(0.08, 0.08, D - 0.2), CP_TIMBER, x, 0.04, 0);
  part(g, box(W - 0.1, 0.36, D - 0.25), CP_BOARD, 0, 0.26, 0);
  for (let i = 1; i < 6; i++) part(g, box(W - 0.09, 0.004, D - 0.24), '#c9c6bb', 0, 0.08 + i * 0.06, 0, { outline: false });
  label(g, '석고보드 9.5T', 0.7, 0.12, 0, 0.26, (D - 0.25) / 2 + 0.005, '#1565c0', '#ffffff');
}
