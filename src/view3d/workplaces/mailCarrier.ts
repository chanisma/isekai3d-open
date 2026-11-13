import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glowing, label, painted, picture, ring, seeded, text, type Paint } from './doctor';
import { BK, BT, CAGE_BOX, CG, MB, PARCEL, PC, PO, PO_DOORS, RL, RM, RM_PINS, ROLL_BOX, SB, SC, SC_DROPS, TK, WD, cageSlot, mpNow, mpPhase, poAt, rollerY, wrap } from './mailCarrierMotion';
import type { MpMotion, MpNow } from './mailCarrierMotion';
import type { V } from './busDriverMotion';
import { vroidFigure } from './vroidFigure';
import { shopFront } from './shopFront';

/**
 * A neighbourhood 우체국 drawn as itself (2026-11-01, the workplace pipeline, at the user's request): cream walls of paper
 * and red paint, the made-up 새말우체국 on everything. The pigeonhole frame is a case of six routes by five rows, letters
 * standing in it, the one just read pushed into its hole. The counter has its glass, its number board (딩동), scale, stamp
 * and printer, with a customer at the window whose parcel goes through and whose receipt comes back. The motorbike is the red
 * step-through with its box, which rides off with its rider for a round and comes back. And what the place was missing
 * (workFurniture/mailCarrier.ts): the 묶음대, the roller line and cage trolley of the parcel room, the 배달 구역 지도, the 사서함 wall,
 * the customers' 기재대 and 번호표 발권기, and out the front a 우체통 and the row of house boxes the walk-out round goes along.
 *
 * The hands and what they hold go by one clock (mailCarrierMotion.ts). What's moved for a use is put back every frame it isn't
 * going on (`away`, told every frame), and every name, address and number here is made up. The 소포 저울 belongs to the 택배
 * 물류센터 (courier.ts) and isn't redrawn here.
 */

const RED = '#d32f2f';
const RED_D = '#a31f1f';
const CREAM = '#f4efe2';
const PAPER = '#fbf8ef';
const KRAFT = '#c99d63';
const KRAFT_D = '#a97c46';
const WOOD = '#b88a5a';
const WOOD_D = '#8f6a44';
const GREY = '#78909c';
const GREY_D = '#455a64';
const INK = '#2b2b30';
const SKIN = '#ecc6a3';
const BRASS = '#c9a24a';
const BRANCH = '새말우체국';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vec = (p: V) => v3(p[0], p[1], p[2]);
const tmp = new THREE.Vector3();
const FLAT = -Math.PI / 2;

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  m.visible = !!(p ?? home);
  const q = p ?? home;
  if (q) m.position.set(q[0], q[1], q[2]);
}
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t: THREE.Texture | null) => {
      if (!t || mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
/** A canvas repainted only when `key` changes. */
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let last = '';
  return (key: string, paint: (c: CanvasRenderingContext2D) => void): THREE.Texture | null => {
    if (typeof document === 'undefined') return null;
    if (!tex) {
      const can = document.createElement('canvas');
      can.width = w;
      can.height = h;
      ctx = can.getContext('2d');
      tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (key !== last && ctx) {
      last = key;
      paint(ctx);
      tex.needsUpdate = true;
    }
    return tex;
  };
}
const paintBubble = (s: string): Paint => (c) => {
  c.clearRect(0, 0, 256, 96);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#3b2b2b';
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(6, 6, 244, 72, 26);
  c.fill();
  c.stroke();
  text(c, s, 128, 44, 40, '#c62828', 'center');
};
function bubble(parent: THREE.Object3D, s: string, w: number, x: number, y: number, z: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: painted(`mpBubble|${s}`, 256, 96, paintBubble(s)), transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ownMaterial = true;
  sp.scale.set(w, w * 0.375, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 5;
  sp.visible = false;
  parent.add(sp);
  return sp;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: MpNow | null, t: number, isOut: boolean) => void) {
  out.spots = spots;
  out.away = (isOut, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? mpNow(sp.motion as MpMotion, t, mpPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t, isOut);
  };
}
function standAt(g: THREE.Object3D, motion: MpMotion, z = 0.6): Spot {
  const s = spot(g, 'stand', 0, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: MpMotion, seat: V): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], Math.PI, 0);
  s.motion = motion;
  return s;
}
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) / 2 + Math.abs(p.z));
};
/** A letter: a white or manila envelope, its middle at the origin, lying flat. */
function letter(parent: THREE.Object3D, color = PAPER): THREE.Group {
  const g = group(parent);
  part(g, box(0.16, 0.004, 0.1), color, 0, 0, 0, { outline: false });
  part(g, box(0.022, 0.002, 0.026), RED, 0.06, 0.003, -0.028, { outline: false });
  part(g, box(0.07, 0.002, 0.008), '#8b8f95', -0.02, 0.003, 0.006, { outline: false });
  part(g, box(0.05, 0.002, 0.008), '#8b8f95', -0.03, 0.003, 0.026, { outline: false });
  return g;
}
/** A bundle of letters with its band. */
function bundle(parent: THREE.Object3D, n = 8, banded = true): THREE.Group {
  const g = group(parent);
  for (let i = 0; i < n; i++) part(g, box(0.17, 0.008, 0.11), i % 3 === 1 ? '#e6d3a8' : PAPER, 0.004 * Math.sin(i * 2.1), i * 0.009 - n * 0.0045, 0.004 * Math.cos(i * 1.7), { outline: false });
  if (banded) part(g, box(0.008, n * 0.009 + 0.006, 0.116), RED, 0, 0, 0, { outline: false });
  return g;
}
const billTex = (s: string) =>
  painted(`mpBill|${s}`, 128, 80, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 80);
    c.fillStyle = RED;
    c.fillRect(0, 0, 128, 16);
    text(c, '소포', 6, 9, 12, '#ffffff');
    text(c, s, 8, 34, 16, INK);
    const r = seeded(s.length * 13 + s.charCodeAt(0));
    let x = 8;
    while (x < 118) {
      const w = 1 + Math.floor(r() * 3);
      c.fillStyle = '#111111';
      c.fillRect(x, 50, w, 24);
      x += w + 1 + Math.floor(r() * 3);
    }
  });
const AREAS = ['새말1동', '솔내2동', '달빛길', '은행골', '샘터로', '언덕말'];
/** A parcel, its middle at the origin: kraft, taped, the slip on top. */
function parcel(parent: THREE.Object3D, s: V, area = AREAS[0], outline = true): THREE.Group {
  const g = group(parent);
  part(g, rbox(s[0], s[1], s[2], 0.012), KRAFT, 0, 0, 0, { outline });
  part(g, box(s[0] + 0.004, 0.004, Math.min(0.06, s[2] * 0.25)), '#b48450', 0, s[1] / 2, 0, { outline: false });
  const w = Math.min(0.13, s[0] * 0.5);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.62), new THREE.MeshBasicMaterial({ map: billTex(area) }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(s[0] / 2 - w / 2 - 0.015, s[1] / 2 + 0.004, s[2] / 4);
  m.rotation.x = FLAT;
  g.add(m);
  return g;
}
/** The branch's mark: a white envelope on red, with a stroke of wing. */
const markTex = painted('mpMark', 64, 64, (c) => {
  c.fillStyle = RED;
  c.beginPath();
  c.roundRect(2, 2, 60, 60, 12);
  c.fill();
  c.fillStyle = '#ffffff';
  c.fillRect(12, 20, 40, 26);
  c.strokeStyle = RED;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(12, 20);
  c.lineTo(32, 36);
  c.lineTo(52, 20);
  c.stroke();
});
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
interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
}
const CUSTOMERS: Look[] = [
  { top: '#7e8f6a', bottom: '#3e4a52', hair: '#9e9e9e' },
  { top: '#b56a7a', bottom: '#37474f', hair: '#2b1b10' },
  { top: '#5c7fa3', bottom: '#2f3640', hair: '#1a1a1a' },
];
type Fig = ReturnType<typeof vroidFigure>;
/** Someone stood, or sat if `seat` is given. */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const sitting = seat !== undefined;
  const base = sitting ? seat + 0.07 - 0.88 : 0;
  if (sitting) {
    for (const sx of [-1, 1]) {
      const knee = v3(sx * 0.09, seat + 0.03, 0.36);
      const ankle = v3(sx * 0.09, 0.08, 0.42);
      rod(root, v3(sx * 0.09, seat + 0.08, -0.08), knee, 0.056, look.bottom);
      rod(root, knee, ankle, 0.045, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', ankle.x, ankle.y - 0.045, ankle.z + 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, seat + 0.08, -0.08);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  }
  const dz = sitting ? -0.08 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, base + 1.11, dz);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, base + 1.37, dz, { outline: false });
  const head = group(root, 0, base + 1.51, dz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, base + 1.31, dz);
    const restAt = sitting ? v3(sx * 0.11, seat + 0.14, 0.2) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, skin);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(restAt);
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
  const f = vroidFigure({ root, head, armL, armR }, { gender, ...(sitting ? { seat } : {}), ...(seed !== undefined ? { seed } : {}) });
  root.visible = false;
  return f;
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => f && (f.root.visible = false) };
}
/** A plain pen. */
function pen(parent: THREE.Object3D, color = '#1d1d22'): THREE.Group {
  const g = group(parent);
  part(g, cyl(0.006, 0.006, 0.13, 8), color, 0, 0.055, 0, { outline: false, rz: 0.4 });
  g.visible = false;
  return g;
}

// =============================================================================================
// 우편 분류대: the pigeonhole frame.

const ROUTE_SETS = [
  ['1구 새말1동', '2구 새말2동', '3구 솔내1동', '4구 솔내2동', '5구 달빛길', '6구 은행골'],
  ['7구 샘터로', '8구 언덕말', '9구 나루터', '10구 버들골', '11구 꽃재', '12구 동산길'],
];
const routeHead = (s: string, i: number) =>
  painted(`mpRouteHead|${s}`, 128, 56, (c) => {
    c.fillStyle = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f'][i % 6];
    c.fillRect(0, 0, 128, 56);
    const [n, a] = s.split(' ');
    text(c, n, 64, 18, 20, '#ffffff', 'center');
    text(c, a, 64, 42, 18, '#ffffff', 'center', false);
  });

function mailSorter(g: THREE.Group, out: Built) {
  const W = 1.86;
  const zb = -0.42;
  const zf = SC.face;
  const zc = (zb + zf) / 2;
  const d = zf - zb;
  const y0 = SC.rowY[0] - 0.02;
  const y1 = SC.rowY[4] + 0.16;
  // The carcase: wooden sides, back, top with the branch's name; the base with its drawers.
  part(g, box(W, y1 - y0 + 0.2, 0.02), WOOD_D, 0, (y1 + y0 + 0.2) / 2, zb);
  for (const sx of [-1, 1]) part(g, box(0.04, y1 + 0.2, d), WOOD, (sx * W) / 2, (y1 + 0.2) / 2, zc);
  part(g, rbox(W + 0.06, 0.04, d + 0.04, 0.008), WOOD, 0, y1 + 0.2, zc);
  part(g, box(W, 0.86, d), WOOD_D, 0, 0.43, zc);
  for (const x of [-0.46, 0.46]) {
    part(g, rbox(0.82, 0.32, 0.02, 0.006), WOOD, x, 0.62, zf + 0.002);
    part(g, rbox(0.82, 0.32, 0.02, 0.006), WOOD, x, 0.26, zf + 0.002);
    part(g, box(0.12, 0.018, 0.02), CHROME, x, 0.62, zf + 0.02, { outline: false });
    part(g, box(0.12, 0.018, 0.02), CHROME, x, 0.26, zf + 0.02, { outline: false });
  }
  // Its ledge, the tray of what's come in, the route book.
  part(g, rbox(W, 0.035, SC.ledgeZ - zf + 0.1, 0.008), WOOD, 0, SC.ledgeY, (SC.ledgeZ + zf) / 2);
  for (const sx of [-1, 1]) part(g, box(0.03, 0.06, 0.2), WOOD_D, sx * 0.86, SC.ledgeY - 0.05, zf + 0.06, { outline: false });
  const T = SC.tray;
  part(g, rbox(0.34, 0.03, 0.24, 0.01), '#e0e0e0', T[0], T[1] - 0.012, T[2]);
  for (const sx of [-1, 1]) part(g, box(0.012, 0.09, 0.24), RED, T[0] + sx * 0.17, T[1] + 0.03, T[2], { outline: false });
  part(g, box(0.34, 0.09, 0.012), RED, T[0], T[1] + 0.03, T[2] - 0.12, { outline: false });
  const heap = group(g, T[0], T[1] + 0.03, T[2]);
  bundle(heap, 7, false);
  const B = SC.book;
  part(g, rbox(0.3, 0.02, 0.2, 0.006), '#3b5b7a', B[0], B[1] - 0.01, B[2]);
  part(g, box(0.28, 0.006, 0.18), PAPER, B[0], B[1] + 0.005, B[2], { outline: false });
  label(g, '순로구분표', 0.2, 0.03, B[0], B[1] + 0.012, B[2] - 0.05, PAPER, INK);
  // The dividers and the shelves.
  for (let i = 0; i <= 6; i++) part(g, box(0.012, y1 - y0, d - 0.02), CREAM, -0.9 + i * 0.3, (y0 + y1) / 2, zc, { outline: false });
  SC.rowY.forEach((y) => part(g, box(W - 0.02, 0.012, d - 0.02), CREAM, 0, y - 0.015, zc, { outline: false }));
  part(g, box(W - 0.02, 0.012, d - 0.02), CREAM, 0, y1 + 0.005, zc, { outline: false });
  // Heads over the columns: two sets, one shown by where the frame stands.
  const sets = ROUTE_SETS.map((set) => {
    const sg = group(g);
    set.forEach((s, i) => picture(sg, routeHead(s, i), 0.28, 0.12, SC.cols[i], y1 + 0.08, zf + 0.01));
    return sg;
  });
  sets[1].visible = false;
  // Letters standing in the holes.
  const rng = seeded(41);
  const drops = new Set(SC_DROPS.map(([c, r]) => `${c},${r}`));
  for (let c = 0; c < 6; c++)
    for (let r = 0; r < 5; r++) {
      if (drops.has(`${c},${r}`) || rng() < 0.2) continue;
      const n = 2 + Math.floor(rng() * 5);
      for (let i = 0; i < n; i++) {
        const l = part(g, box(0.2, 0.09 + 0.03 * rng(), 0.004), rng() > 0.72 ? '#e6d3a8' : PAPER, SC.cols[c] + 0.012 * (rng() - 0.5), SC.rowY[r] + 0.045, zf - 0.03 - i * 0.022, { outline: false });
        l.rotation.x = -0.14;
      }
    }
  // Under the frame: a canvas mail sack and a red crate.
  const sack = group(g, 0.68, 0, 0.26);
  part(sack, rbox(0.34, 0.42, 0.28, 0.08), '#c9bb9b', 0, 0.21, 0);
  part(sack, rbox(0.12, 0.1, 0.1, 0.03), '#b6a886', 0, 0.46, 0);
  label(sack, '우편', 0.16, 0.08, 0, 0.22, 0.145, '#c9bb9b', RED_D);
  // What moves: the letter in the hand, and those that have gone in this round's run.
  const held = letter(g);
  held.rotation.x = Math.PI / 2 - 0.3;
  held.visible = false;
  const penHeld = pen(g);
  const placed = SC_DROPS.map(([c, r]) => {
    const l = part(g, box(0.2, 0.1, 0.004), PAPER, SC.cols[c], SC.rowY[r] + 0.045, zf - 0.03, { outline: false });
    l.rotation.x = -0.14;
    l.visible = false;
    return l;
  });
  const spots: Record<string, Spot> = { sortMail: standAt(g, 'mpSort', SC.stand) };
  const route = standAt(g, 'mpRoute', SC.stand);
  spots.mailCarrier_learnRoutes = spots.mailCarrier_optimizeRoute = spots.mailCarrier_ownDistrict = route;
  spots['*'] = spots.sortMail;
  let chosen = false;
  drive(g, out, spots, (now, N) => {
    if (!chosen) {
      chosen = true;
      const pick = wrap(seedOf(g), 2);
      sets.forEach((s, i) => (s.visible = i === pick));
    }
    const P = N?.props ?? {};
    at(held, P.letter);
    at(penHeld, P.pen);
    const sorting = now === 'sortMail';
    const count = sorting && N ? wrap(N.b.n, placed.length) + ((N.n.stuck ?? 0) > 0.5 ? 1 : 0) : 0;
    placed.forEach((l, i) => (l.visible = i < count));
    if (sorting && N) heap.scale.y = 0.6 + 0.4 * (1 - wrap(N.b.n, placed.length) / placed.length);
  });
  out.work = marker(g, 0, SC.ledgeY + 0.05, SC.ledgeZ);
}

// =============================================================================================
// 우체국 창구: the counter with its glass.

const WEIGHTS = ['1.24', '0.86', '3.40', '2.15', '0.52', '4.78', '1.92'];
function postCounter(g: THREE.Group, out: Built) {
  const T = PC.T;
  const zb = -0.5;
  const zf = 0.3;
  const zc = (zb + zf) / 2;
  // The customers' face (at -z): cream panels and a red band with the branch's name, solid to the top; legroom on the clerk's side.
  part(g, box(1.96, T - 0.05, 0.06), CREAM, 0, (T - 0.05) / 2, zb + 0.03);
  part(g, box(1.96, 0.16, 0.012), RED, 0, 0.56, zb - 0.002);
  const sign = painted('mpCounterSign', 512, 64, (c) => {
    c.fillStyle = RED;
    c.fillRect(0, 0, 512, 64);
    text(c, `${BRANCH} · 우편 · 예금 · 보험`, 256, 34, 30, '#ffffff', 'center');
  });
  picture(g, sign, 1.4, 0.15, 0, 0.56, zb - 0.01, '#ffffff', Math.PI);
  picture(g, markTex, 0.14, 0.14, 0.8, 0.56, zb - 0.01, '#ffffff', Math.PI);
  for (const x of [-0.96, 0.96]) part(g, box(0.05, T - 0.05, zf - zb), '#d8d0bc', x, (T - 0.05) / 2, zc);
  part(g, rbox(2.02, 0.05, zf - zb + 0.04, 0.012), '#e8e1cf', 0, T - 0.025, zc);
  part(g, rbox(2.0, 0.02, 0.26, 0.006), '#a8896a', 0, T + 0.008, (zb + PC.glassZ) / 2, { outline: false });
  // The glass and its posts: open under it, chest high up.
  const GL = new THREE.MeshToonMaterial({ color: '#d7ecf5', transparent: true, opacity: 0.32, depthWrite: false });
  const glass = new THREE.Mesh(box(1.9, 0.44, 0.012), GL);
  glass.position.set(0, 1.33, PC.glassZ);
  g.add(glass);
  for (const x of [-0.96, 0, 0.96]) part(g, box(0.03, 0.74, 0.03), GREY, x, T + 0.37, PC.glassZ);
  part(g, box(1.96, 0.03, 0.03), GREY, 0, 1.1, PC.glassZ);
  part(g, box(1.96, 0.03, 0.03), GREY, 0, 1.56, PC.glassZ);
  // The number over the window, with a little 호출 lamp, at the customers' side.
  part(g, rbox(0.52, 0.2, 0.05, 0.012), BLACK, 0.48, 1.68, PC.glassZ);
  const number = swapPic(g, 0.48, 0.17, 0.48, 1.68, PC.glassZ - 0.028, Math.PI);
  const numberBack = swapPic(g, 0.48, 0.17, 0.48, 1.68, PC.glassZ + 0.028);
  const liveNum = live(192, 68);
  label(g, '번호 호출', 0.3, 0.05, -0.5, 1.61, PC.glassZ - 0.006, RED, '#ffffff', Math.PI);
  // The customer's ledge: leaflets, a tray of pens, a coin dish.
  part(g, cyl(0.06, 0.05, 0.016, 16), '#90a4ae', 0.34, T + 0.024, -0.34);
  part(g, rbox(0.18, 0.1, 0.1, 0.01), '#ffffff', -0.72, T + 0.06, -0.38);
  label(g, '예금 안내', 0.14, 0.05, -0.72, T + 0.08, -0.436, RED, '#ffffff', Math.PI);
  for (let i = 0; i < 3; i++) part(g, box(0.12, 0.003, 0.18), PAPER, 0.7, T + 0.03 + i * 0.004, -0.34, { outline: false });
  // The clerk's side: the scale at the left with its digits on a stalk.
  const S = PC.scale;
  part(g, rbox(0.34, 0.03, 0.3, 0.008), STEEL, S[0], T + 0.018, S[2]);
  part(g, box(0.32, 0.01, 0.28), CHROME, S[0], S[1] - 0.006, S[2], { outline: false });
  rod(g, v3(S[0] - 0.14, T + 0.03, S[2] - 0.17), v3(S[0] - 0.14, T + 0.2, S[2] - 0.17), 0.012, GREY);
  part(g, rbox(0.17, 0.08, 0.03, 0.008), BLACK, S[0] - 0.14, T + 0.24, S[2] - 0.17);
  const digitsIn = swapPic(g, 0.15, 0.06, S[0] - 0.14, T + 0.24, S[2] - 0.153);
  const digitsOut = swapPic(g, 0.15, 0.06, S[0] - 0.14, T + 0.24, S[2] - 0.187, Math.PI);
  const liveKg = live(120, 48);
  // The monitor and keyboard, the printer, the stamp and its pad, the bell.
  part(g, rbox(0.34, 0.22, 0.02, 0.01), BLACK, 0.52, T + 0.26, -0.02, { rx: -0.08 });
  rod(g, v3(0.52, T, 0.0), v3(0.52, T + 0.16, -0.01), 0.014, GREY_D);
  part(g, cyl(0.07, 0.08, 0.012, 14), GREY_D, 0.52, T + 0.006, 0.0, { outline: false });
  const monitor = swapPic(g, 0.31, 0.19, 0.52, T + 0.26, -0.008, 0, -0.08);
  const liveMon = live(248, 152);
  const Kb = PC.keyboard;
  part(g, rbox(0.3, 0.018, 0.11, 0.006), '#3a3f47', Kb[0], T + 0.012, Kb[2]);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) part(g, box(0.016, 0.006, 0.016), '#c7ccd2', Kb[0] - 0.12 + i * 0.022, T + 0.024, Kb[2] - 0.028 + j * 0.026, { outline: false });
  const Pr = PC.printer;
  part(g, rbox(0.2, 0.1, 0.2, 0.012), '#eceff1', Pr[0] + 0.16, T + 0.05, Pr[2] - 0.02);
  part(g, box(0.14, 0.008, 0.008), INK, Pr[0] + 0.1, T + 0.07, Pr[2] + 0.08, { outline: false });
  const P0 = PC.pad;
  part(g, rbox(0.12, 0.018, 0.09, 0.006), '#5b2020', P0[0], T + 0.009, P0[2]);
  part(g, box(0.1, 0.002, 0.07), '#b81d24', P0[0], T + 0.019, P0[2], { outline: false });
  const makeStamp = (parent: THREE.Object3D) => {
    const s = group(parent);
    part(s, cyl(0.022, 0.03, 0.02, 12), '#3a2f28', 0, 0.01, 0);
    part(s, cyl(0.014, 0.02, 0.05, 10), WOOD, 0, 0.045, 0, { outline: false });
    part(s, ball(0.026), WOOD_D, 0, 0.085, 0, { outline: false });
    return s;
  };
  const stamp = makeStamp(g);
  const Be = PC.bell;
  part(g, cyl(0.03, 0.04, 0.03, 12), BRASS, Be[0], T + 0.018, Be[2]);
  part(g, ball(0.01), INK, Be[0], T + 0.036, Be[2], { outline: false });
  // The slip being stamped and handed back, the label in the hand, the postmark, the parcel, the customer.
  const slipTex = (done: boolean) =>
    painted(`mpSlip|${done}`, 96, 128, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 96, 128);
      text(c, '소포 영수증', 48, 12, 11, INK, 'center');
      c.fillStyle = '#9aa1a7';
      for (let i = 0; i < 5; i++) c.fillRect(8, 26 + i * 12, 50 + ((i * 17) % 30), 3);
      if (done) {
        c.strokeStyle = '#c62828';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(62, 96, 22, 0, Math.PI * 2);
        c.stroke();
        text(c, '새말', 62, 90, 11, '#c62828', 'center');
        text(c, '11.01', 62, 104, 10, '#c62828', 'center');
      }
    });
  const slip = group(g);
  slip.visible = false;
  const slipPic = swapPic(slip, 0.12, 0.16, 0, 0.003, 0, 0, FLAT);
  part(slip, box(0.122, 0.002, 0.162), '#e6e0d0', 0, 0, 0, { outline: false });
  const pad = group(g);
  picturePlane(pad, billTex(AREAS[1]), 0.1, 0.06);
  pad.visible = false;
  const onParcel = group(g);
  picturePlane(onParcel, billTex(AREAS[2]), 0.13, 0.08);
  onParcel.visible = false;
  const box1 = parcel(g, PARCEL, AREAS[0]);
  box1.visible = false;
  const bookOf = group(g);
  part(bookOf, rbox(0.1, 0.01, 0.14, 0.003), '#1e6e50', 0, 0, 0);
  part(bookOf, box(0.08, 0.002, 0.12), '#ffffff', 0, 0.006, 0, { outline: false });
  bookOf.visible = false;
  const pens = pen(g);
  // A leaflet on the top while the savings are gone through.
  const leaflet = group(g, PC.brochure[0], T + 0.008, PC.brochure[2]);
  part(leaflet, box(0.2, 0.003, 0.26), '#ffffff', 0, 0, 0, { outline: false });
  picturePlane(leaflet, painted('mpLeaflet', 120, 160, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 120, 160);
    c.fillStyle = '#1e6e50';
    c.fillRect(0, 0, 120, 30);
    text(c, '새말 정기예금', 60, 16, 14, '#ffffff', 'center');
    ['기간 12개월', '금리 안내', '자동 이체', '상담 창구 2번'].forEach((s, i) => text(c, s, 8, 52 + i * 26, 13, INK, 'left', false));
  }), 0.19, 0.25);
  leaflet.visible = false;
  // A stool with a back: the clerk sits.
  const stool = group(g, PC.seat[0], 0, PC.seat[2]);
  part(stool, cyl(0.03, 0.03, PC.seat[1] - 0.06, 8), GREY_D, 0, PC.seat[1] / 2, 0, { outline: false });
  part(stool, cyl(0.21, 0.24, 0.02, 12), GREY_D, 0, 0.03, 0, { outline: false });
  part(stool, rbox(0.42, 0.06, 0.4, 0.03), '#49667f', 0, PC.seat[1] - 0.03, 0);
  part(stool, rbox(0.38, 0.34, 0.05, 0.03), '#49667f', 0, PC.seat[1] + 0.26, 0.21);
  // The bin of the day's parcels, behind at the left.
  const Bi = PC.bin;
  part(g, box(0.5, Bi[1], 0.4), RED_D, Bi[0], Bi[1] / 2, Bi[2]);
  part(g, box(0.44, 0.012, 0.34), '#7a1515', Bi[0], Bi[1] + 0.003, Bi[2], { outline: false });
  const binStack = parcel(g, [0.3, 0.14, 0.24], AREAS[3]);
  binStack.position.set(Bi[0] + 0.02, Bi[1] + 0.07, Bi[2] - 0.03);
  label(g, '접수 소포', 0.2, 0.06, Bi[0], Bi[1] * 0.6, Bi[2] + 0.204, RED_D, '#ffffff');
  const custF = CUSTOMERS.map((l, i) => lazy(() => person(g, l, PC.customer[0], PC.customer[1], 0, i === 1 ? 'female' : 'male', undefined, 40 + i)));
  const ding = bubble(g, '딩동', 0.34, -0.5, 1.82, PC.glassZ);
  const thud = bubble(g, '쾅!', 0.26, PC.slip[0], 1.2, PC.slip[2]);
  const spots: Record<string, Spot> = { servePostCounter: seatAt(g, 'mpCounter', PC.seat), mailCarrier_postalFinance: seatAt(g, 'mpBank', PC.seat) };
  spots['*'] = spots.servePostCounter;
  let seed = -1;
  drive(g, out, spots, (now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seed;
    at(box1, P.parcel);
    at(stamp, P.stamp, add3(PC.stamp, 0, -0.03, 0));
    at(pad, P.label);
    onParcel.visible = !!P.parcel && (n.labelled ?? 0) > 0.5 && (P.parcel?.[1] ?? 0) > 0;
    if (onParcel.visible && P.parcel) {
      onParcel.position.set(P.parcel[0] + 0.03, P.parcel[1] + PARCEL[1] / 2 + 0.006, P.parcel[2] + 0.02);
      onParcel.rotation.set(0, 0, 0);
    }
    at(slip, P.slip);
    slipPic.set(slipTex((n.stamped ?? 0) > 0.5));
    at(bookOf, P.book);
    at(pens, P.pen);
    leaflet.visible = now === 'mailCarrier_postalFinance';
    // The number: this round's, called up.
    const num = String(100 + wrap(round + ((n.called ?? 1) > 0.5 ? 1 : 0), 400));
    const nt = liveNum(num, (c) => {
      c.fillStyle = '#100b05';
      c.fillRect(0, 0, 192, 68);
      text(c, num, 96, 36, 48, '#ff6d2e', 'center');
    });
    number.set(nt);
    numberBack.set(nt);
    const wIdx = wrap(round, WEIGHTS.length);
    const kg = now === 'servePostCounter' && P.parcel && (P.parcel[1] ?? 0) > 0 && Math.abs((P.parcel[0] ?? 0) - PC.scale[0]) < 0.02 ? ((n.settle ?? 0) > 0.95 ? `${WEIGHTS[wIdx]}kg` : `${(Number(WEIGHTS[wIdx]) * (0.6 + 0.4 * (n.settle ?? 0)) + 0.05 * Math.sin(t * 19)).toFixed(2)}kg`) : '0.00kg';
    const kt = liveKg(kg, (c) => {
      c.fillStyle = '#101006';
      c.fillRect(0, 0, 120, 48);
      text(c, kg, 60, 25, 26, '#ff5252', 'center');
    });
    digitsIn.set(kt);
    digitsOut.set(kt);
    monitor.set(liveMon(`${now ?? ''}|${(n.settle ?? 0) > 0.95 ? 1 : 0}|${(n.labelled ?? 0) > 0.5 ? 1 : 0}|${wIdx}`, (c) => {
      c.fillStyle = '#e9edf1';
      c.fillRect(0, 0, 248, 152);
      c.fillStyle = RED;
      c.fillRect(0, 0, 248, 24);
      text(c, now === 'mailCarrier_postalFinance' ? '예금 통장 정리' : '소포 접수', 8, 13, 15, '#ffffff');
      if (now === 'mailCarrier_postalFinance') {
        ['거래 내역 조회', '잔액 *** 원', '통장 인쇄 대기'].forEach((s, i) => text(c, s, 10, 48 + i * 26, 15, INK, 'left', false));
      } else {
        text(c, `무게 ${(n.settle ?? 0) > 0.95 ? WEIGHTS[wIdx] : '...'} kg`, 10, 48, 16, INK, 'left', false);
        text(c, `받는 곳 ${AREAS[wIdx % AREAS.length]}`, 10, 76, 16, INK, 'left', false);
        text(c, (n.labelled ?? 0) > 0.5 ? '요금 4,000원 · 인쇄 완료' : '요금 계산 중', 10, 108, 15, '#1b5e20', 'left', false);
      }
    }));
    // The customer at the window.
    const who = wrap(round, custF.length);
    custF.forEach((c, i) => i !== who && c.hide());
    if (now) {
      const f = custF[who].get();
      f.root.visible = true;
      const pr = P.parcel ?? null;
      f.armR((n.custGive ?? 0) > 0.5 && pr ? v3(pr[0] + PARCEL[0] / 2 + 0.01, pr[1], Math.min(pr[2], -0.2)) : (n.custTake ?? 0) > 0.5 ? v3(PC.gap[0] + 0.1, T + 0.04, PC.ledge[2] + 0.04) : null);
      f.armL((n.custGive ?? 0) > 0.5 && pr ? v3(pr[0] - PARCEL[0] / 2 - 0.01, pr[1], Math.min(pr[2], -0.2)) : (n.custBye ?? 0) > 0.5 ? v3(PC.customer[0] + 0.3, 1.45 + 0.05 * Math.sin(t * 6), PC.customer[1] + 0.18) : null);
      f.head.rotation.x = (n.custLook ?? 0) > 0.5 ? 0.3 : 0.14;
    } else custF.forEach((c) => c.hide());
    ding.visible = now === 'servePostCounter' && (N?.b.from === 'call') && (N?.b.u ?? 0) < 0.65;
    thud.visible = (n.thud ?? 0) > 0.5;
  });
  out.work = marker(g, PC.slip[0], T + 0.03, PC.slip[2]);
}
const add3 = (p: V, x: number, y: number, z: number): V => [p[0] + x, p[1] + y, p[2] + z];
function picturePlane(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.rotation.x = FLAT;
  m.position.y = 0.003;
  g.add(m);
  return m;
}

// =============================================================================================
// 우편 배달 오토바이: red step-through, nose to +x.

function mailScooter(g: THREE.Group, out: Built) {
  const bike = group(g);
  const wheel = (x: number) => {
    const w = group(bike, x, 0.24, 0);
    part(w, cyl(0.24, 0.24, 0.09, 22), BLACK, 0, 0, 0, { rx: Math.PI / 2 });
    part(w, cyl(0.15, 0.15, 0.095, 18), STEEL, 0, 0, 0, { rx: Math.PI / 2, outline: false });
    part(w, cyl(0.04, 0.04, 0.1, 8), GREY_D, 0, 0, 0, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 6; i++) part(w, box(0.012, 0.28, 0.01), '#dfe3e6', 0, 0, 0, { rz: (i * Math.PI) / 6, outline: false });
    return w;
  };
  const rear = wheel(-0.62);
  const front = wheel(0.72);
  // Mudguards, step-through body, seat.
  part(bike, rbox(0.52, 0.04, 0.16, 0.02), RED, -0.62, 0.5, 0, { rz: -0.06 });
  part(bike, rbox(0.44, 0.04, 0.14, 0.02), RED, 0.72, 0.5, 0, { rz: 0.1 });
  rod(bike, v3(0.72, 0.24, 0.07), v3(0.54, 0.94, 0.07), 0.016, CHROME);
  rod(bike, v3(0.72, 0.24, -0.07), v3(0.54, 0.94, -0.07), 0.016, CHROME);
  part(bike, rbox(0.72, 0.1, 0.3, 0.03), RED, -0.02, 0.38, 0);
  part(bike, rbox(0.46, 0.05, 0.28, 0.02), '#37474f', 0.14, 0.44, 0, { outline: false });
  part(bike, rbox(0.1, 0.6, 0.34, 0.04), RED, 0.46, 0.72, 0, { rz: -0.22 });
  part(bike, rbox(0.46, 0.3, 0.26, 0.06), RED, -0.3, 0.54, 0);
  part(bike, rbox(0.3, 0.18, 0.14, 0.04), GREY_D, -0.42, 0.3, 0.1);
  rod(bike, v3(-0.26, 0.26, 0.14), v3(-0.95, 0.34, 0.16), 0.024, CHROME);
  part(bike, rbox(0.44, 0.09, 0.28, 0.04), '#23262b', 0.04, 0.76, 0);
  // Handlebars, headlamp, mirrors, windscreen.
  rod(bike, v3(0.54, 0.94, 0), v3(0.5, 1.06, 0), 0.02, GREY_D);
  rod(bike, v3(0.5, 1.06, -0.3), v3(0.5, 1.06, 0.3), 0.012, CHROME);
  for (const sz of [-1, 1]) {
    part(bike, cyl(0.02, 0.02, 0.11, 10), BLACK, 0.5, 1.06, sz * 0.3, { rx: Math.PI / 2, outline: false });
    rod(bike, v3(0.5, 1.06, sz * 0.22), v3(0.5, 1.26, sz * 0.28), 0.006, BLACK);
    part(bike, cyl(0.05, 0.05, 0.012, 12), BLACK, 0.5, 1.28, sz * 0.28, { rz: Math.PI / 2 });
  }
  part(bike, rbox(0.12, 0.16, 0.22, 0.05), RED, 0.58, 1.0, 0);
  glowing(bike, cyl(0.06, 0.06, 0.02, 14), '#fff9d6', 0.645, 1.0, 0).rotation.z = Math.PI / 2;
  const WS = new THREE.Mesh(box(0.012, 0.24, 0.3), new THREE.MeshToonMaterial({ color: '#d7ecf5', transparent: true, opacity: 0.45, depthWrite: false }));
  WS.position.set(0.59, 1.22, 0);
  WS.rotation.z = 0.22;
  bike.add(WS);
  // The front basket with the letter bags.
  part(bike, box(0.3, 0.02, 0.32), GREY_D, 0.82, 0.68, 0);
  for (const [dx, dz] of [[-0.15, -0.16], [-0.15, 0.16], [0.15, -0.16], [0.15, 0.16]] as Array<[number, number]>) rod(bike, v3(0.82 + dx, 0.68, dz), v3(0.82 + dx, 0.86, dz), 0.006, GREY_D);
  for (const sz of [-1, 1]) rod(bike, v3(0.67, 0.86, sz * 0.16), v3(0.97, 0.86, sz * 0.16), 0.006, GREY_D);
  for (const dx of [-1, 1]) rod(bike, v3(0.82 + dx * 0.15, 0.86, -0.16), v3(0.82 + dx * 0.15, 0.86, 0.16), 0.006, GREY_D);
  const basket = bundle(bike, 9);
  basket.position.set(0.82, 0.76, 0);
  // The red box on its rack, the lid hinged at the back, the letters on it.
  const Bx = BK.box;
  rod(bike, v3(-0.84, 0.76, -0.2), v3(-0.38, 0.76, -0.2), 0.012, GREY_D);
  rod(bike, v3(-0.84, 0.76, 0.2), v3(-0.38, 0.76, 0.2), 0.012, GREY_D);
  part(bike, box(0.5, 0.42, 0.44), RED, Bx[0], Bx[1], Bx[2]);
  part(bike, box(0.46, 0.38, 0.4), '#7a1515', Bx[0], Bx[1] + 0.03, Bx[2], { outline: false });
  const boxSide = painted('mpBikeBox', 200, 160, (c) => {
    c.fillStyle = RED;
    c.fillRect(0, 0, 200, 160);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 118, 200, 8);
    text(c, '우편', 100, 56, 62, '#ffffff', 'center');
    text(c, BRANCH, 100, 142, 22, '#ffffff', 'center');
  });
  for (const sz of [-1, 1]) picture(bike, boxSide, 0.46, 0.38, Bx[0], Bx[1], sz * 0.224, '#ffffff', sz > 0 ? 0 : Math.PI);
  const lid = group(bike, Bx[0], Bx[1] + 0.21, Bx[2] - 0.22);
  part(lid, rbox(0.52, 0.04, 0.46, 0.015), RED, 0, 0.02, 0.22);
  part(lid, box(0.08, 0.018, 0.03), CHROME, 0, 0.0, 0.45, { outline: false });
  const inBox = [0, 1].map((i) => {
    const b = bundle(bike, 7);
    b.position.set(Bx[0] + (i === 0 ? -0.08 : 0.08), Bx[1] + 0.08, Bx[2]);
    b.visible = false;
    return b;
  });
  // The small rack behind the seat, a parcel strapped on it when it's loaded.
  const Rk = BK.rack;
  part(bike, box(0.28, 0.02, 0.26), GREY_D, Rk[0], Rk[1] - 0.01, Rk[2]);
  const rackBox = parcel(bike, [0.26, 0.16, 0.24], AREAS[3]);
  rackBox.position.set(Rk[0], Rk[1] + 0.08, Rk[2]);
  const strap = part(bike, box(0.03, 0.18, 0.27), '#1b1b1f', Rk[0], Rk[1] + 0.09, Rk[2], { outline: false });
  // The plates and the lamps.
  const plateTex = painted('mpBikePlate', 128, 64, (c) => {
    c.fillStyle = '#f2f2ee';
    c.fillRect(0, 0, 128, 64);
    c.strokeStyle = '#212121';
    c.lineWidth = 3;
    c.strokeRect(2, 2, 124, 60);
    text(c, '새말', 64, 18, 18, '#1b5e20', 'center');
    text(c, '라 3710', 64, 44, 26, '#1b5e20', 'center');
  });
  picture(bike, plateTex, 0.18, 0.09, -0.875, 0.68, 0, '#ffffff', -Math.PI / 2);
  part(bike, rbox(0.04, 0.05, 0.12, 0.01), '#b71c1c', -0.875, 0.76, 0);
  const tail = glowing(bike, rbox(0.03, 0.05, 0.12, 0.01), '#ff5252', -0.89, 0.76, 0);
  tail.visible = false;
  // A helmet hung on the mirror while it's parked.
  const helmetHung = group(bike, 0.5, 1.14, -0.32);
  part(helmetHung, ball(0.11), '#fafafa', 0, 0, 0);
  part(helmetHung, rbox(0.14, 0.03, 0.2, 0.01), RED, 0, 0.09, 0, { outline: false });
  // The kickstand and, for loading, the crate on the floor.
  part(bike, box(0.03, 0.26, 0.03), GREY_D, -0.16, 0.13, -0.2, { rz: 0.3 });
  const crate = group(g, BK.crate[0], 0, BK.crate[2]);
  part(crate, box(0.52, 0.03, 0.34), RED, 0, 0.04, 0);
  for (const sz of [-1, 1]) part(crate, box(0.52, 0.2, 0.016), RED, 0, 0.14, sz * 0.17);
  for (const sx of [-1, 1]) part(crate, box(0.016, 0.2, 0.34), RED, sx * 0.26, 0.14, 0);
  const cBundles = [-0.14, 0.14].map((x) => {
    const b = bundle(crate, 8);
    b.position.set(x, 0.14, 0);
    return b;
  });
  crate.visible = false;
  const held = bundle(g, 7);
  held.visible = false;
  // The rider, seen riding off and coming back: a body on the seat, the hands on the bars and a helmet on.
  const rider = lazy(() => {
    const f = person(bike, { top: '#c62828', bottom: '#263238', hair: '#2b1b10' }, 0.08, 0, Math.PI / 2, 'male', 0.8, 71);
    const h = group(f.head, 0, 0.012, -0.012);
    part(h, ball(0.13), '#fafafa', 0, 0.02, -0.01);
    part(h, box(0.2, 0.03, 0.1), RED, 0, 0.1, -0.02, { outline: false });
    return f;
  });
  const spots: Record<string, Spot> = { mpLoadBike: standAt(g, 'mpLoadBike', 0.6) };
  spots['*'] = spots.mpLoadBike;
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  const PULL = 7;
  drive(g, out, spots, (_now, N, t, isOut) => {
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let x = 0;
    const dt = Math.max(0, t - since);
    if (state === 'leaving') {
      const u = Math.min(1, dt / 3.5);
      x = PULL * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, dt / 5);
      x = PULL * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    bike.position.x = x;
    bike.visible = state !== 'gone';
    const moving = state === 'leaving' || state === 'back';
    rear.rotation.z = -x / 0.24;
    front.rotation.z = -x / 0.24;
    tail.visible = moving;
    helmetHung.visible = !moving;
    if (moving) {
      const f = rider.get();
      f.root.visible = true;
      f.armL(v3(0.5, 1.06, -0.28));
      f.armR(v3(0.5, 1.06, 0.28));
    } else rider.hide();
    // Loading.
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const loading = !!N && state === 'parked';
    crate.visible = loading;
    lid.rotation.x = -(loading ? n.lid ?? 0 : 0) * 1.9;
    const filled = loading ? n.filled ?? 0 : 2;
    inBox[0].visible = filled > 0.5;
    inBox[1].visible = filled > 1.5;
    cBundles[0].visible = filled <= 0.5;
    cBundles[1].visible = filled <= 1.5;
    at(held, loading ? P.bundle : null);
    const strapped = loading ? n.strapped ?? 0 : 1;
    rackBox.visible = strap.visible = strapped > 0.5 || !loading;
  });
  out.work = marker(g, Bx[0], Bx[1] + 0.2, Bx[2] + 0.2);
}

// =============================================================================================
// 묶음대.

function bundleTable(g: THREE.Group, out: Built) {
  const T = BT.T;
  part(g, rbox(1.9, 0.05, 0.8, 0.012), '#dbc8a0', 0, T - 0.025, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, T - 0.05, 0.05), GREY_D, sx * 0.88, (T - 0.05) / 2, sz * 0.34);
  part(g, box(1.8, 0.02, 0.7), '#9aa5ab', 0, 0.2, 0);
  // Under it: flat canvas sacks, a crate.
  for (let i = 0; i < 4; i++) part(g, rbox(0.8, 0.03, 0.5, 0.014), '#c9bb9b', -0.42, 0.23 + i * 0.03, 0, { outline: false });
  part(g, box(0.48, 0.18, 0.4), RED, 0.5, 0.31, 0);
  // Loose letters at the left.
  const L = BT.loose;
  const rng = seeded(23);
  const scat: THREE.Object3D[] = [];
  for (let i = 0; i < 18; i++) {
    const m = letter(g, rng() > 0.7 ? '#e6d3a8' : PAPER);
    m.position.set(L[0] + 0.32 * (rng() - 0.5), T + 0.004 + i * 0.004, L[2] + 0.28 * (rng() - 0.5));
    m.rotation.y = 0.8 * (rng() - 0.5);
    scat.push(m);
  }
  // The band tin, the register book, the route tray with its bundles.
  const Tn = BT.tin;
  part(g, cyl(0.06, 0.06, 0.05, 14), '#7f8b92', Tn[0], T + 0.025, Tn[2]);
  for (let i = 0; i < 5; i++) part(g, ring(0.03, 0.003), '#b5563e', Tn[0] + 0.02 * Math.sin(i * 2), T + 0.052, Tn[2] + 0.02 * Math.cos(i * 2), { rx: Math.PI / 2, outline: false });
  const Bk = BT.book;
  part(g, rbox(0.34, 0.016, 0.24, 0.004), '#28456a', Bk[0], T + 0.008, Bk[2]);
  picture(g, painted('mpRegister', 200, 140, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 200, 140);
    text(c, '등기 수령부', 100, 14, 16, INK, 'center');
    c.strokeStyle = '#90a4ae';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(6, 30 + i * 18);
      c.lineTo(194, 30 + i * 18);
      c.stroke();
    }
    ['은행골 12 하은솔', '샘터로 3 고다온', '달빛길 7 민서한'].forEach((s, i) => text(c, s, 10, 40 + i * 18, 12, '#37474f', 'left', false));
  }), 0.32, 0.22, Bk[0], T + 0.018, Bk[2], '#ffffff', 0, FLAT);
  const Tr = BT.tray;
  part(g, rbox(0.42, 0.03, 0.34, 0.01), RED, Tr[0], T + 0.015, Tr[2]);
  for (const sz of [-1, 1]) part(g, box(0.42, 0.1, 0.012), RED, Tr[0], T + 0.05, Tr[2] + sz * 0.17, { outline: false });
  label(g, '3구 솔내1동', 0.3, 0.06, Tr[0], T + 0.05, Tr[2] + 0.18, RED, '#ffffff');
  const inTray = [0, 1, 2, 3].map((i) => {
    const b = bundle(g, 6);
    b.position.set(Tr[0] - 0.09 + (i % 2) * 0.18, T + 0.075 + Math.floor(i / 2) * 0.06, Tr[2]);
    b.visible = false;
    return b;
  });
  // On the table, the bundle being made.
  const W = BT.work;
  const stackM = group(g, W[0], T + 0.008, W[2]);
  for (let i = 0; i < 10; i++) part(stackM, box(0.17, 0.008, 0.11), i % 3 === 1 ? '#e6d3a8' : PAPER, 0.003 * Math.sin(i * 2.1), 0.004 + i * 0.009, 0.003 * Math.cos(i * 1.7), { outline: false });
  const bandOn = part(stackM, box(0.008, 0.1, 0.116), RED, 0, 0.044, 0, { outline: false });
  const redTag = part(stackM, box(0.05, 0.004, 0.03), '#ffb300', -0.05, 0.096, 0.02, { outline: false });
  const stretched = part(g, ring(0.1, 0.003), '#b5563e', W[0], W[1] + 0.1, W[2] + 0.02, { rx: Math.PI / 2, outline: false });
  const hand = letter(g);
  const handBundle = bundle(g, 6);
  const penH = pen(g);
  hand.visible = handBundle.visible = false;
  const spots: Record<string, Spot> = { mpBundleMail: standAt(g, 'mpBundle', BT.stand[1]) };
  spots['*'] = spots.mpBundleMail;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    at(hand, P.handful);
    at(handBundle, P.bundle);
    at(penH, P.pen);
    const stackAmt = now ? n.stack ?? 0 : 1;
    stackM.visible = !now || (n.filed ?? 0) < 0.5;
    stackM.scale.y = 0.15 + 0.85 * stackAmt;
    bandOn.visible = !now || (n.banded ?? 0) > 0.5;
    redTag.visible = !now || (n.signed ?? 0) > 0.5;
    const s = n.stretch ?? 0;
    stretched.visible = s > 0;
    if (s > 0) stretched.scale.set(s / 0.1, 0.45, 1);
    const done = wrap(round, 4) + ((n.filed ?? 0) > 0.5 ? 1 : 0);
    inTray.forEach((b, i) => (b.visible = now ? i < done : i < 2));
    scat.forEach((m, i) => (m.visible = !now || i >= (stackAmt * scat.length) / 2));
  });
  out.work = marker(g, W[0], W[1], W[2]);
}

// =============================================================================================
// 소포 롤러.

function rollerLine(g: THREE.Group, out: Built) {
  const len = RL.x1 - RL.x0;
  const midX = (RL.x0 + RL.x1) / 2;
  const slope = Math.atan2(RL.y1 - RL.y0, len);
  const midY = (RL.y0 + RL.y1) / 2;
  // Side rails along the slope, legs under them.
  for (const sz of [-1, 1]) {
    part(g, box(len, 0.08, 0.03), '#b0bec5', midX, midY - 0.015, sz * 0.31, { rz: slope });
    for (const x of [RL.x0 + 0.1, midX, RL.x1 - 0.1]) part(g, box(0.04, rollerY(x) - 0.05, 0.04), GREY_D, x, (rollerY(x) - 0.05) / 2, sz * 0.31);
  }
  const rollers: THREE.Mesh[] = [];
  const m = Math.round(len / 0.09);
  for (let i = 0; i <= m; i++) {
    const x = RL.x0 + (i * len) / m;
    const r = part(g, cyl(0.03, 0.03, 0.58, 10), i % 2 ? '#cfd8dc' : '#b6c2c8', x, rollerY(x), 0, { rx: Math.PI / 2, outline: false });
    rollers.push(r);
    part(r, box(0.04, 0.56, 0.006), '#8fa0a9', 0, 0, 0, { outline: false });
  }
  // The stop at the middle, that drops when the parcel's pushed on.
  const stopX = RL.stopX;
  const stopM = part(g, rbox(0.03, 0.1, 0.5, 0.008), '#fbc02d', stopX, rollerY(stopX) + 0.06, 0);
  // At the far end: the bin the parcels run into, its sign; the chute at the infeed, with the arrivals' sign.
  const Bn = group(g, RL.x1 + 0.22, 0, 0);
  part(Bn, box(0.3, 0.6, 0.62), RED_D, 0, 0.3, 0);
  part(Bn, box(0.26, 0.012, 0.56), '#6d1313', 0, 0.595, 0, { outline: false });
  label(Bn, '구분 완료', 0.24, 0.07, 0, 0.42, 0.315, RED_D, '#ffffff');
  const pile = parcel(Bn, [0.24, 0.14, 0.3], AREAS[2]);
  pile.position.set(0, 0.67, 0);
  label(g, '접수분 ▶ 구분', 0.5, 0.08, RL.x0 + 0.4, 0.5, 0.33, GREY_D, '#ffffff');
  // The scan gun on its bracket, a little desk for the log, a tablet.
  const Sc = RL.scanner;
  part(g, box(0.5, 0.025, 0.3), GREY_D, Sc[0] - 0.14, Sc[1] - 0.09, Sc[2] + 0.01);
  rod(g, v3(Sc[0] - 0.36, Sc[1] - 0.09, Sc[2] + 0.04), v3(Sc[0] - 0.36, 0.0, Sc[2] + 0.04), 0.012, GREY_D);
  const gunM = (parent: THREE.Object3D) => {
    const s = group(parent);
    part(s, rbox(0.05, 0.06, 0.13, 0.015), '#fbc02d', 0, 0.03, 0.02);
    part(s, rbox(0.04, 0.1, 0.04, 0.012), '#263238', 0, -0.03, -0.02, { rx: -0.3 });
    return s;
  };
  const gun = gunM(g);
  part(g, rbox(0.22, 0.018, 0.15, 0.008), '#263238', Sc[0] - 0.24, Sc[1] - 0.07, Sc[2] + 0.02);
  const tab = swapPic(g, 0.2, 0.13, Sc[0] - 0.24, Sc[1] - 0.058, Sc[2] + 0.02, 0, FLAT);
  const liveTab = live(160, 104);
  // What rolls.
  const P1 = parcel(g, ROLL_BOX, AREAS[1]);
  const P2 = parcel(g, [0.3, 0.16, 0.3], AREAS[4], false);
  P1.visible = false;
  P2.position.set(RL.x0 + 0.24, rollerY(RL.x0 + 0.24) + 0.1, 0);
  const beep = bubble(g, '삑!', 0.24, RL.stopX + 0.1, 1.4, 0.1);
  const spots: Record<string, Spot> = { mpRollParcel: standAt(g, 'mpRoll', RL.stand[1]) };
  spots['*'] = spots.mpRollParcel;
  let count = 0;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(P1, P.box);
    if (P.box) P1.rotation.z = slope;
    at(gun, P.gun, [Sc[0], Sc[1] + 0.02, Sc[2]]);
    stopM.position.y = rollerY(stopX) + (now && (n.stop ?? 1) < 0.5 ? -0.08 : 0.06);
    if (now && (n.spin ?? 0) > 0.5) for (const r of rollers) r.rotation.y = t * 7;
    beep.visible = (n.beep ?? 0) > 0.5;
    count = N ? 120 + wrap(N.b.n, 800) : count;
    tab.set(liveTab(`${count}|${(n.beep ?? 0) > 0.5 ? 1 : 0}`, (c) => {
      c.fillStyle = '#10222e';
      c.fillRect(0, 0, 160, 104);
      text(c, '소포 구분', 8, 12, 13, '#80deea');
      text(c, `오늘 ${count}개`, 8, 38, 17, '#ffffff');
      text(c, (n.beep ?? 0) > 0.5 ? AREAS[wrap(count, AREAS.length)] : '대기 중', 8, 70, 19, (n.beep ?? 0) > 0.5 ? '#69f0ae' : '#90a4ae');
    }));
  });
  out.work = marker(g, RL.stopX, RL.y0, 0.1);
}

// =============================================================================================
// 운반 카고.

function cageTrolley(g: THREE.Group, out: Built) {
  const CC = '#9aa5ad';
  const hw = 0.33;
  const zb = -0.34;
  const zf = 0.3;
  const top = 1.46;
  // The castors, the base and three shelves of grid, wire round three sides, the zone's placard.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.05, 0.05, 0.03, 10), '#263238', sx * (hw - 0.03), 0.06, (zb + zf) / 2 + sz * 0.28, { rx: Math.PI / 2 });
  for (const y of CG.shelves) {
    part(g, box(2 * hw, 0.015, zf - zb), CC, 0, y, (zb + zf) / 2);
    for (let i = 1; i < 6; i++) rod(g, v3(-hw + (i * hw) / 3, y + 0.01, zb), v3(-hw + (i * hw) / 3, y + 0.01, zf), 0.003, '#c5ccd1');
  }
  for (const sx of [-1, 1]) for (const z of [zb, zf]) rod(g, v3(sx * hw, 0.08, z), v3(sx * hw, top, z), 0.016, GREY_D);
  rod(g, v3(-hw, top, zb), v3(hw, top, zb), 0.016, GREY_D);
  rod(g, v3(-hw, top, zf), v3(hw, top, zf), 0.016, GREY_D);
  for (let i = 1; i < 8; i++) {
    const y = 0.08 + (i * (top - 0.08)) / 8;
    rod(g, v3(-hw, y, zb), v3(hw, y, zb), 0.004, '#c5ccd1');
    for (const sx of [-1, 1]) rod(g, v3(sx * hw, y, zb), v3(sx * hw, y, zf), 0.004, '#c5ccd1');
  }
  for (let i = 1; i < 6; i++) {
    const x = -hw + (i * hw) / 3;
    rod(g, v3(x, 0.08, zb), v3(x, top, zb), 0.004, '#c5ccd1');
  }
  // The placard and its tag.
  const placed = painted('mpCagePlacard', 128, 96, (c) => {
    c.fillStyle = RED;
    c.fillRect(0, 0, 128, 96);
    text(c, '솔내 집중국', 64, 28, 20, '#ffffff', 'center');
    text(c, '오후 2시 발송', 64, 64, 18, '#ffe0b2', 'center', false);
  });
  picture(g, placed, 0.24, 0.18, CG.tag[0] - 0.26, top - 0.12, zf + 0.012);
  part(g, box(0.16, 0.2, 0.004), PAPER, CG.tag[0], CG.tag[1], zf + 0.02, { outline: false });
  // The boxes already in; those of this run; the stack to be loaded.
  const inCage = [0, 1, 2, 3, 4, 5].map((i) => {
    const b = parcel(g, CAGE_BOX, AREAS[i], false);
    const [x, y, z] = cageSlot(i);
    b.position.set(x, y, z);
    b.visible = false;
    return b;
  });
  const stack = group(g, CG.stack[0], 0, CG.stack[2]);
  const onStack = [0, 1, 2].map((i) => {
    const b = parcel(stack, CAGE_BOX, AREAS[(i + 2) % 6]);
    b.position.set(0, 0.1 + i * 0.205, 0);
    b.rotation.y = 0.1 * (i - 1);
    return b;
  });
  stack.visible = false;
  const held = parcel(g, CAGE_BOX, AREAS[0]);
  held.visible = false;
  const penH = pen(g);
  const spots: Record<string, Spot> = { mpLoadCage: standAt(g, 'mpCage', CG.stand[1]) };
  spots['*'] = spots.mpLoadCage;
  const seed = { v: -1 };
  drive(g, out, spots, (now, N) => {
    if (seed.v < 0) seed.v = wrap(seedOf(g), 6);
    const P = N?.props ?? {};
    at(held, P.box);
    at(penH, P.pen);
    stack.visible = !!now;
    onStack[2].visible = !P.box;
    const count = N ? wrap(N.b.n, 6) + ((N.n.placed ?? 0) > 0.5 ? 1 : 0) : 2 + seed.v % 3;
    inCage.forEach((b, i) => (b.visible = i < count));
  });
  out.work = marker(g, 0, 0.9, 0.1);
}

// =============================================================================================
// 배달 구역 지도.

const mapTex = painted('mpRouteMapTex', 512, 320, (c) => {
  c.fillStyle = '#f6efd9';
  c.fillRect(0, 0, 512, 320);
  const zones: Array<[string, string, number, number, number, number]> = [
    ['#f7c5bd', '1구 새말1동', 8, 8, 160, 100],
    ['#bcd9f2', '2구 새말2동', 172, 8, 160, 110],
    ['#c6e6c1', '3구 솔내1동', 336, 8, 168, 96],
    ['#fbe0aa', '4구 솔내2동', 8, 112, 140, 110],
    ['#dcc7ee', '5구 달빛길', 152, 122, 180, 100],
    ['#bfe8e6', '6구 은행골', 336, 108, 168, 114],
    ['#f2c7da', '7구 샘터로', 8, 226, 240, 86],
    ['#e4e0c2', '8구 언덕말', 252, 226, 252, 86],
  ];
  for (const [col, name, x, y, w, h] of zones) {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
    text(c, name, x + w / 2, y + 16, 16, '#37474f', 'center');
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.moveTo(x + 6, y + 18 + (i * (h - 22)) / 4);
      c.lineTo(x + w - 6, y + 18 + (i * (h - 22)) / 4);
      c.stroke();
    }
  }
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(0, 174);
  c.bezierCurveTo(140, 200, 360, 120, 512, 170);
  c.stroke();
  text(c, '은행나무대로', 256, 164, 15, '#546e7a', 'center', false);
  text(c, `${BRANCH} 배달 구역`, 10, 310, 13, '#37474f', 'left');
});
function routeMap(g: THREE.Group, out: Built) {
  // A frame on the wall with the map, a ledge under it, a stand of notes.
  const z = RM.z;
  part(g, box(1.84, 1.18, 0.03), WOOD_D, 0, 1.36, z - 0.02);
  picture(g, mapTex, 1.76, 1.1, 0, 1.36, z);
  for (const sx of [-1, 1]) part(g, box(0.04, 1.96, 0.05), WOOD, sx * 0.94, 0.98, z - 0.02);
  part(g, rbox(1.9, 0.03, 0.24, 0.006), WOOD, 0, RM.ledge[1], RM.ledge[2]);
  const Pb = RM.pinBox;
  part(g, box(0.16, 0.05, 0.12), '#eceff1', Pb[0], Pb[1], Pb[2]);
  for (let i = 0; i < 6; i++) part(g, ball(0.01), ['#e53935', '#1e88e5', '#fbc02d'][i % 3], Pb[0] - 0.05 + i * 0.02, Pb[1] + 0.03, Pb[2] + (i % 2) * 0.02 - 0.01, { outline: false });
  // A note on the frame for the block being added, its lines.
  const No = RM.note;
  part(g, box(0.3, 0.2, 0.004), '#fff7b0', No[0] - 0.02, No[1], No[2], { outline: false });
  const written = part(g, box(0.22, 0.05, 0.002), '#546e7a', No[0] - 0.02, No[1], No[2] + 0.004, { outline: false });
  // The pins always there, and this round's.
  const rng = seeded(61);
  for (let i = 0; i < 26; i++) {
    const x = -0.82 + 1.64 * rng();
    const y = 0.86 + 1.0 * rng();
    part(g, ball(0.012), ['#e53935', '#1e88e5', '#fbc02d', '#43a047'][i % 4], x, y, z + 0.015, { outline: false });
  }
  const pinM = (parent: THREE.Object3D, col: string) => {
    const s = group(parent);
    part(s, ball(0.018), col, 0, 0, 0.02, { outline: false });
    part(s, cyl(0.002, 0.002, 0.03, 4), CHROME, 0, 0, 0.005, { rx: Math.PI / 2, outline: false });
    return s;
  };
  const moving = pinM(g, '#e53935');
  moving.visible = false;
  const placedPins = RM_PINS.map((p) => {
    const m = pinM(g, '#e53935');
    m.position.set(p[0], p[1], p[2]);
    m.visible = false;
    return m;
  });
  const str = limb(g, 0.003, '#c62828');
  const strMesh = g.children[g.children.length - 1];
  strMesh.visible = false;
  const penH = pen(g);
  const spots: Record<string, Spot> = { mpStudyMap: standAt(g, 'mpMap', 0.2) };
  spots['*'] = spots.mpStudyMap;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(moving, P.pin);
    at(penH, P.pen);
    const r = N?.b.n ?? 0;
    const i = wrap(r, RM_PINS.length);
    placedPins.forEach((m, k) => {
      m.visible = !!now && (k < i || (k === i && (n.placed ?? 0) > 0.5));
    });
    written.visible = !!now && N?.b.from === 'note';
    strMesh.visible = !!P.end;
    if (P.end) {
      const prev = RM_PINS[wrap(r - 1, RM_PINS.length)];
      str(vec([prev[0], prev[1], prev[2] + 0.02]), vec([P.end[0], P.end[1], P.end[2] + 0.02]));
    }
  });
  out.work = marker(g, 0, 1.3, RM.z);
}

// =============================================================================================
// 사서함.

function poBoxes(g: THREE.Group, out: Built) {
  const cols = PO.cols;
  const rows = PO.rows;
  const w = cols * PO.dx + 0.1;
  const h = rows * PO.dy + 0.1;
  const y0 = PO.y0 - PO.dy / 2 - 0.05;
  part(g, box(w, y0 + h, 0.34), WOOD_D, 0, (y0 + h) / 2, -0.17 + PO.z);
  part(g, rbox(w + 0.04, 0.05, 0.38, 0.01), WOOD, 0, y0 + h + 0.02, -0.17 + PO.z);
  picture(g, painted('mpPoSign', 360, 48, (c) => {
    c.fillStyle = '#3e2b1c';
    c.fillRect(0, 0, 360, 48);
    text(c, `${BRANCH} 사서함`, 180, 26, 26, BRASS, 'center');
  }), 1.2, 0.14, 0, y0 + h + 0.12, PO.z - 0.1);
  part(g, box(1.26, 0.2, 0.02), '#3e2b1c', 0, y0 + h + 0.12, PO.z - 0.12);
  part(g, box(w, y0, 0.02), '#6e5236', 0, y0 / 2, PO.z + 0.003);
  const doorAt = (c: number, r: number) => {
    const [x, y] = poAt(c, r);
    const d = group(g, x - PO.w / 2, y, PO.z + 0.008);
    part(d, box(PO.w - 0.012, PO.h - 0.012, 0.012), BRASS, PO.w / 2, 0, 0, { outline: false });
    part(d, box(PO.w - 0.05, 0.05, 0.002), '#e8d38c', PO.w / 2, 0.04, 0.008, { outline: false });
    part(d, cyl(0.012, 0.012, 0.006, 8), '#5b4a1d', PO.w - 0.03, -0.03, 0.008, { rx: Math.PI / 2, outline: false });
    return d;
  };
  const doors: THREE.Group[] = [];
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const d = doorAt(c, r);
      doors[c * rows + r] = d;
      const [x, y] = poAt(c, r);
      label(g, String(101 + c * rows + r), 0.1, 0.03, x + 0.0, y - 0.058, PO.z + 0.018, BRASS, '#3b2b0f');
      part(g, box(PO.w - 0.016, PO.h - 0.016, 0.003), '#2b1f12', x, y, PO.z + 0.003, { outline: false });
    }
  const held = letter(g);
  held.rotation.x = Math.PI / 2 - 0.3;
  held.visible = false;
  const pile = bundle(g, 6, false);
  pile.visible = false;
  const penH = pen(g);
  const spots: Record<string, Spot> = { mpFillBox: standAt(g, 'mpBoxes', 0.58) };
  spots['*'] = spots.mpFillBox;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    at(held, P.letter);
    at(pile, P.pile);
    at(penH, P.pen);
    for (const d of doors) if (d) d.rotation.y = 0;
    if (N) {
      const [c, r] = PO_DOORS[wrap(N.b.n, PO_DOORS.length)];
      const d = doors[c * rows + r];
      if (d) d.rotation.y = -(N.n.door ?? 0) * 1.9;
    }
  });
  out.work = marker(g, 0, 1.1, PO.z + 0.03);
}

// =============================================================================================
// 기재대.

function writingDesk(g: THREE.Group, out: Built) {
  const T = WD.top;
  // A stand-up desk: sloped top on steel legs, the 안내 strip, a bar for bags.
  for (const sx of [-1, 1]) {
    part(g, box(0.05, T - 0.05, 0.05), GREY_D, sx * 0.88, (T - 0.05) / 2, -0.26);
    part(g, box(0.05, T - 0.1, 0.05), GREY_D, sx * 0.88, (T - 0.1) / 2, 0.22);
    part(g, box(0.05, 0.05, 0.54), GREY_D, sx * 0.88, 0.05, -0.02);
  }
  part(g, box(1.8, 0.02, 0.2), '#9aa5ab', 0, 0.24, -0.02);
  const top = group(g, 0, T - 0.02, -0.02);
  top.rotation.x = 0.14;
  part(top, rbox(1.94, 0.04, 0.58, 0.012), '#ece6d6', 0, 0, 0);
  for (let i = 0; i < 3; i++) part(top, box(0.42, 0.003, 0.3), PAPER, -0.62 + i * 0.62, 0.022, 0.03, { outline: false });
  const sheet = painted('mpForm', 180, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 180, 128);
    text(c, '소포 송장 쓰는 법', 90, 14, 14, RED_D, 'center');
    ['받는 분 성함', '받는 분 주소 · 우편번호', '보내는 분 성함', '내용물 · 무게'].forEach((s, i) => {
      text(c, s, 8, 38 + i * 22, 12, '#37474f', 'left', false);
      c.fillStyle = '#b0bec5';
      c.fillRect(8, 46 + i * 22, 160, 1);
    });
  });
  for (const x of [-0.62, 0, 0.62]) picture(top, sheet, 0.4, 0.28, x, 0.024, 0.03, '#ffffff', 0, FLAT);
  // The back with holders of forms, the sign.
  part(g, box(1.9, 0.34, 0.03), '#e0d6c0', 0, 1.14, -0.32);
  picture(g, painted('mpDeskSign', 512, 56, (c) => {
    c.fillStyle = RED;
    c.fillRect(0, 0, 512, 56);
    text(c, '기재대 · 우표 · 봉투 · 송장은 여기서 쓰세요', 256, 30, 26, '#ffffff', 'center');
  }), 1.84, 0.12, 0, 1.25, -0.303);
  const holderTex = ['국내 소포', '등기 신청', '해외 우편'];
  WD.holders.forEach((H, i) => {
    part(g, box(0.36, 0.2, 0.02), '#b0bec5', H[0], H[1], H[2] - 0.08);
    part(g, box(0.36, 0.1, 0.012), '#cfd8dc', H[0], H[1] - 0.05, H[2] + 0.02);
    part(g, box(0.36, 0.015, 0.1), '#b0bec5', H[0], H[1] - 0.1, H[2] - 0.03, { outline: false });
    for (let k = 0; k < 4; k++) part(g, box(0.32, 0.14, 0.002), PAPER, H[0], H[1] - 0.015, H[2] - 0.05 + k * 0.012, { outline: false });
    label(g, holderTex[i], 0.3, 0.05, H[0], H[1] - 0.05, H[2] + 0.028, '#cfd8dc', INK);
  });
  // Pens on chains, a stamp set under glass, a magnifier, a tube of glue.
  const P0 = WD.pen;
  for (const x of [P0[0], P0[0] + 0.62, P0[0] - 0.46]) {
    part(g, cyl(0.007, 0.007, 0.14, 8), '#1d1d22', x, P0[1], P0[2], { rz: Math.PI / 2 - 0.2, outline: false });
    rod(g, v3(x - 0.06, P0[1] - 0.005, P0[2] - 0.02), v3(x - 0.08, 1.02, -0.26), 0.003, CHROME);
  }
  part(g, cyl(0.02, 0.02, 0.09, 10), '#f0c419', 0.52, T + 0.07, -0.18);
  // The rack of envelopes at the left end, stamps in a tray.
  const Rk = WD.rack;
  part(g, box(0.28, 0.2, 0.2), '#b0bec5', Rk[0], Rk[1], Rk[2] - 0.08);
  const envs = [0, 1, 2, 3, 4].map((i) => {
    const m = part(g, box(0.24, 0.13, 0.004), i % 2 ? '#e6d3a8' : PAPER, Rk[0], Rk[1] + 0.07, Rk[2] - 0.15 + i * 0.022, { outline: false });
    m.rotation.x = -0.15;
    return m;
  });
  const stamps = painted('mpStamps', 128, 96, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 96);
    const col = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00'];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        c.fillStyle = col[(i + j) % 4];
        c.fillRect(5 + i * 30, 5 + j * 30, 26, 26);
        text(c, '430', 18 + i * 30, 18 + j * 30, 10, '#ffffff', 'center');
      }
  });
  picture(g, stamps, 0.22, 0.16, 0.76, T + 0.058, -0.02, '#ffffff', 0, FLAT);
  part(g, box(0.24, 0.018, 0.18), CHROME, 0.76, T + 0.046, -0.02, { outline: false });
  // The carton on the floor while it's being restocked.
  const C = WD.carton;
  const carton = group(g, C[0], 0, C[2]);
  part(carton, box(0.42, 0.24, 0.3), KRAFT, 0, 0.12, 0);
  part(carton, box(0.42, 0.01, 0.1), KRAFT_D, 0, 0.245, -0.1, { outline: false });
  label(carton, '봉투 500매', 0.26, 0.06, 0, 0.12, 0.155, KRAFT, INK);
  carton.visible = false;
  // What moves.
  const forms = group(g);
  for (let i = 0; i < 4; i++) part(forms, box(0.2, 0.004, 0.14), PAPER, 0, i * 0.006, 0, { outline: false });
  forms.visible = false;
  const env = group(g);
  part(env, box(0.14, 0.09, 0.006), '#e6d3a8', 0, 0, 0, { outline: false });
  env.visible = false;
  const custF = lazy(() => person(g, CUSTOMERS[1], WD.customer[0], WD.customer[1], Math.PI, 'female', undefined, 44));
  const custPen = pen(g);
  const spots: Record<string, Spot> = { mpRestockForms: standAt(g, 'mpStock', WD.stand[1]) };
  spots['*'] = spots.mpRestockForms;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    carton.visible = !!now;
    at(forms, P.forms);
    at(env, P.env);
    const count = now ? 3 + Math.round(2 * (n.filled ?? 0)) : 5;
    envs.forEach((m, i) => (m.visible = i < count));
    if (now) {
      const f = custF.get();
      f.root.visible = true;
      const wx = WD.customer[0] + 0.04 * Math.sin(t * 7);
      f.armR(v3(wx + 0.06, T + 0.08, 0.1 + 0.02 * Math.sin(t * 3)));
      f.armL(v3(WD.customer[0] - 0.2, T + 0.06, 0.05));
      f.head.rotation.x = 0.42;
      custPen.visible = true;
      custPen.position.set(wx + 0.05, T + 0.1, 0.12);
    } else {
      custF.hide();
      custPen.visible = false;
    }
  });
  out.work = marker(g, 0, T + 0.04, 0.05);
}

// =============================================================================================
// 번호표 발권기.

function ticketMachine(g: THREE.Group, out: Built) {
  // A slim red pedestal, a head with the screen on a tilt; a door at the front low down.
  part(g, rbox(0.44, 0.06, 0.34, 0.02), GREY_D, 0, 0.03, 0);
  part(g, rbox(0.3, 0.94, 0.24, 0.02), RED, 0, 0.5, 0);
  part(g, rbox(0.36, 0.4, 0.3, 0.03), CREAM, 0, 1.18, 0);
  part(g, box(0.34, 0.08, 0.28), RED, 0, 1.4, 0);
  label(g, '번호표', 0.2, 0.06, 0, 1.4, 0.142, RED, '#ffffff');
  label(g, '뽑아 주세요', 0.22, 0.04, 0, 1.0, 0.13, CREAM, RED_D);
  // The screen with its buttons, showing who's next.
  const S = TK.screen;
  const screen = swapPic(g, 0.28, 0.2, S[0], S[1], S[2] + 0.015, 0, -0.1);
  const liveScreen = live(224, 160);
  // The mouth and the slip.
  const M = TK.mouth;
  part(g, box(0.1, 0.018, 0.02), INK, M[0], M[1] + 0.06, M[2] - 0.02, { outline: false });
  const slipT = painted('mpTicketSlip', 72, 96, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 72, 96);
    text(c, BRANCH, 36, 12, 9, RED_D, 'center');
    text(c, '147', 36, 44, 28, INK, 'center');
    text(c, '소포·등기', 36, 76, 11, '#546e7a', 'center', false);
  });
  const slip = group(g, M[0], M[1], M[2] + 0.003);
  picture(slip, slipT, 0.08, 0.1, 0, 0, 0);
  // The door hung at its left side, the paper roll behind it.
  const doorH = group(g, -0.14, TK.door.y, 0.125);
  part(doorH, box(0.28, 0.34, 0.012), RED_D, 0.14, 0, 0);
  part(doorH, cyl(0.012, 0.012, 0.012, 8), STEEL, 0.25, 0, 0.008, { rx: Math.PI / 2, outline: false });
  const R0 = TK.roll;
  const rollIn = group(g, R0[0], R0[1], R0[2]);
  part(rollIn, cyl(0.06, 0.06, 0.08, 14), PAPER, 0, 0, 0, { rz: Math.PI / 2 });
  part(rollIn, cyl(0.02, 0.02, 0.085, 10), KRAFT_D, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const rollOld = group(g);
  part(rollOld, cyl(0.022, 0.022, 0.08, 10), KRAFT_D, 0, 0, 0, { rz: Math.PI / 2 });
  rollOld.visible = false;
  const rollNew = group(g);
  part(rollNew, cyl(0.06, 0.06, 0.08, 14), PAPER, 0, 0, 0, { rz: Math.PI / 2 });
  rollNew.visible = false;
  const spots: Record<string, Spot> = { mpFillTickets: standAt(g, 'mpTicket', 0.62) };
  spots['*'] = spots.mpFillTickets;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    doorH.rotation.y = -(n.door ?? 0) * 1.8;
    at(rollOld, P.rollOld);
    at(rollNew, P.rollNew);
    rollIn.visible = !P.rollOld && !P.rollNew;
    slip.visible = (n.test ?? 0) > 0.05 || !N;
    slip.scale.y = N ? Math.max(0.05, n.test ?? 0) : 0.35;
    slip.position.y = M[1] - (slip.scale.y * 0.1) / 2 + 0.04;
    const num = 147 + wrap(N?.b.n ?? 0, 300);
    screen.set(liveScreen(`${num}|${(n.pressed ?? 0) > 0.5 ? 1 : 0}`, (c) => {
      c.fillStyle = '#eef3f6';
      c.fillRect(0, 0, 224, 160);
      c.fillStyle = RED;
      c.fillRect(0, 0, 224, 26);
      text(c, `대기 ${num % 9}명`, 112, 14, 16, '#ffffff', 'center');
      c.fillStyle = (n.pressed ?? 0) > 0.5 ? '#ffb300' : '#ffffff';
      c.fillRect(10, 38, 204, 50);
      c.strokeStyle = RED;
      c.lineWidth = 2;
      c.strokeRect(10, 38, 204, 50);
      text(c, '소포 · 등기', 112, 64, 22, RED_D, 'center');
      c.fillStyle = '#ffffff';
      c.fillRect(10, 98, 204, 50);
      c.strokeRect(10, 98, 204, 50);
      text(c, '예금 · 보험', 112, 124, 22, '#1e6e50', 'center');
    }));
  });
  out.work = marker(g, 0, 1.2, 0.2);
}

// =============================================================================================
// 우체통.

function mailbox(g: THREE.Group, out: Built) {
  // The red box with its round top on a stub; the slot, the rain hood, the hours on a plate.
  part(g, rbox(0.46, 0.1, 0.44, 0.02), GREY_D, 0, 0.05, 0);
  part(g, rbox(0.48, 0.92, 0.42, 0.05), RED, 0, 0.56, 0);
  part(g, cyl(0.24, 0.24, 0.42, 22), RED, 0, 1.02, 0, { rx: Math.PI / 2 });
  part(g, box(0.3, 0.012, 0.06), '#222', 0, 1.12, 0.21, { outline: false });
  part(g, rbox(0.36, 0.03, 0.09, 0.012), RED_D, 0, 1.17, 0.235, { rx: 0.25 });
  picture(g, painted('mpBoxFace', 128, 180, (c) => {
    c.fillStyle = RED;
    c.fillRect(0, 0, 128, 180);
    c.fillStyle = '#ffffff';
    c.fillRect(38, 12, 52, 38);
    c.strokeStyle = RED;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(38, 12);
    c.lineTo(64, 34);
    c.lineTo(90, 12);
    c.stroke();
    text(c, '우편', 64, 72, 34, '#ffffff', 'center');
    text(c, '수거 오전 11시', 64, 118, 14, '#ffebd0', 'center', false);
    text(c, '오후 5시', 64, 138, 14, '#ffebd0', 'center', false);
    text(c, BRANCH, 64, 162, 13, '#ffffff', 'center');
  }), 0.26, 0.38, 0, 0.92, 0.214);
  // The plate on the door for the collector to sign.
  const Cd = MB.card;
  // The door's inside, what's in.
  part(g, box(0.38, 0.54, 0.02), '#6d1616', 0, (MB.door.y0 + MB.door.y1) / 2, 0.19, { outline: false });
  const heap = group(g, MB.heap[0], MB.heap[1], MB.heap[2]);
  const rng = seeded(9);
  const letters = [...Array(10)].map(() => {
    const l = letter(heap, rng() > 0.7 ? '#e6d3a8' : PAPER);
    l.position.set(0.14 * (rng() - 0.5), 0.02 * rng(), 0.14 * (rng() - 0.5));
    l.rotation.y = rng() * 3;
    return l;
  });
  heap.visible = false;
  const door = group(g, 0, MB.door.y0, MB.door.z);
  part(door, rbox(0.42, MB.door.y1 - MB.door.y0, 0.024, 0.01), '#c62828', 0, (MB.door.y1 - MB.door.y0) / 2, 0);
  part(door, cyl(0.016, 0.016, 0.02, 10), CHROME, MB.keyhole[0], MB.keyhole[1] - MB.door.y0, 0.014, { rx: Math.PI / 2, outline: false });
  // The card holder.
  part(g, box(0.16, 0.12, 0.004), PAPER, Cd[0], Cd[1], Cd[2], { outline: false });
  const signed = part(g, box(0.1, 0.012, 0.002), '#1a237e', Cd[0], Cd[1] - 0.02, Cd[2] + 0.004, { outline: false });
  signed.visible = false;
  // The bag on the floor while it's emptied.
  const Bg = MB.bag;
  const bag = group(g, Bg[0], 0, Bg[2]);
  part(bag, rbox(0.34, 0.4, 0.24, 0.06), '#c9bb9b', 0, 0.2, 0);
  part(bag, box(0.2, 0.08, 0.008), '#6d4c41', 0, 0.2, 0.122, { outline: false });
  label(bag, '우편', 0.14, 0.07, 0, 0.3, 0.123, '#c9bb9b', RED_D);
  bag.visible = false;
  const held = letter(g);
  held.visible = false;
  const penH = pen(g);
  const spots: Record<string, Spot> = { mpEmptyMailbox: standAt(g, 'mpEmpty', 0.62) };
  spots['*'] = spots.mpEmptyMailbox;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    door.rotation.x = (n.door ?? 0) * 1.45;
    bag.visible = !!now;
    heap.visible = (n.door ?? 0) > 0.02;
    const left = Math.round(10 * (1 - (n.scooped ?? 0)));
    letters.forEach((l, i) => (l.visible = i < left));
    at(held, P.handful);
    at(penH, P.pen);
    signed.visible = (n.signed ?? 0) > 0.5;
  });
  out.work = marker(g, 0, 0.9, 0.3);
}

// =============================================================================================
// 골목 우편함.

const BOX_NAMES = ['은행골 12', '은행골 14', '은행골 16', '은행골 18'];
function streetBoxes(g: THREE.Group, out: Built) {
  // A low wall of brick along the back with a coping, a gate at the third house.
  const wallZ = -0.22;
  part(g, box(1.98, 0.88, 0.2), '#b86b4a', 0, 0.44, wallZ);
  picture(g, painted('mpBricks', 256, 112, (c) => {
    c.fillStyle = '#b86b4a';
    c.fillRect(0, 0, 256, 112);
    c.strokeStyle = '#8c4c32';
    c.lineWidth = 2;
    for (let r = 0; r < 7; r++) {
      c.beginPath();
      c.moveTo(0, r * 16);
      c.lineTo(256, r * 16);
      c.stroke();
      for (let i = 0; i < 10; i++) {
        c.beginPath();
        c.moveTo(((i + (r % 2) * 0.5) * 256) / 10, r * 16);
        c.lineTo(((i + (r % 2) * 0.5) * 256) / 10, r * 16 + 16);
        c.stroke();
      }
    }
  }), 1.97, 0.86, 0, 0.44, wallZ + 0.102);
  part(g, rbox(2.04, 0.05, 0.28, 0.01), '#d8d2c2', 0, 0.9, wallZ);
  // A street lamp (lit: rounds begin early and end late) at the left end, the hook for the bag on it.
  rod(g, v3(-1.0, 0, 0.12), v3(-1.0, 2.4, 0.12), 0.03, GREY_D);
  rod(g, v3(-1.0, 2.4, 0.12), v3(-0.72, 2.5, 0.12), 0.018, GREY_D);
  part(g, rbox(0.22, 0.05, 0.14, 0.015), GREY_D, -0.66, 2.48, 0.12);
  glowing(g, box(0.18, 0.012, 0.1), '#fff3c4', -0.66, 2.45, 0.12);
  const lit = new THREE.PointLight('#ffe9b0', 1.2, 4.5);
  lit.position.set(-0.66, 2.3, 0.3);
  g.add(lit);
  const Hk = SB.hook;
  part(g, box(0.04, 0.02, 0.08), CHROME, Hk[0], Hk[1], Hk[2], { outline: false });
  // The bag on its hook.
  const bagMesh = (parent: THREE.Object3D) => {
    const s = group(parent);
    part(s, rbox(0.3, 0.26, 0.12, 0.04), '#c62828', 0, 0, 0);
    part(s, rbox(0.3, 0.1, 0.13, 0.03), RED_D, 0, 0.1, 0.005);
    label(s, '우편', 0.14, 0.06, 0, -0.03, 0.062, RED, '#ffffff');
    return s;
  };
  const bagHung = bagMesh(g);
  bagHung.position.set(Hk[0] - 0.02, Hk[1] - 0.16, Hk[2] + 0.1);
  const bag = bagMesh(g);
  bag.visible = false;
  // The boxes: each on a post against the wall with its flap and name.
  const flaps: THREE.Group[] = [];
  const stuck: THREE.Mesh[] = [];
  SB.boxes.forEach((x, i) => {
    const col = ['#3f7ca5', '#5d8a5f', '#c9a24a', '#8e5d7f'][i];
    part(g, rbox(0.3, 0.24, 0.2, 0.02), col, x, SB.y, SB.z - 0.04);
    picture(g, painted(`mpBoxTag|${i}`, 120, 40, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 120, 40);
      text(c, BOX_NAMES[i], 60, 22, 18, INK, 'center');
    }), 0.22, 0.07, x, SB.y - 0.04, SB.z + 0.062);
    part(g, box(0.2, 0.014, 0.01), '#222', x, SB.y + 0.04, SB.z + 0.062, { outline: false });
    const f = group(g, x, SB.y + 0.08, SB.z + 0.064);
    part(f, box(0.24, 0.06, 0.008), col, 0, -0.03, 0);
    flaps.push(f);
    stuck.push(part(g, box(0.18, 0.1, 0.004), PAPER, x, SB.y + 0.13, SB.z - 0.04, { outline: false }));
  });
  // The far post (seen only as the round reaches it, the lane down there is otherwise clear).
  const F = SB.far;
  const farG = group(g);
  rod(farG, v3(F[0], 0, F[2] - 0.04), v3(F[0], F[1] - 0.1, F[2] - 0.04), 0.03, WOOD_D);
  part(farG, rbox(0.3, 0.24, 0.22, 0.02), RED, F[0], F[1], F[2] - 0.04);
  part(farG, box(0.2, 0.014, 0.01), '#222', F[0], F[1] + 0.04, F[2] + 0.07, { outline: false });
  picture(farG, painted('mpFarTag', 120, 40, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 120, 40);
    text(c, '언덕말 3', 60, 22, 18, INK, 'center');
  }), 0.22, 0.07, F[0], F[1] - 0.05, F[2] + 0.072);
  const farFlap = group(farG, F[0], F[1] + 0.08, F[2] + 0.072);
  part(farFlap, box(0.24, 0.06, 0.008), RED_D, 0, -0.03, 0);
  const farIn = part(farG, box(0.18, 0.1, 0.004), PAPER, F[0], F[1] + 0.13, F[2] - 0.04, { outline: false });
  // The dog at the third house.
  const D = SB.dog;
  const dog = group(g, D[0], 0, D[2]);
  part(dog, rbox(0.14, 0.14, 0.32, 0.05), '#e4c58d', 0, 0.24, 0);
  part(dog, ball(0.09), '#e4c58d', 0, 0.36, 0.17);
  for (const sx of [-1, 1]) {
    part(dog, box(0.03, 0.09, 0.03), '#a97c46', sx * 0.07, 0.42, 0.14, { rz: sx * 0.2 });
    for (const z of [-0.11, 0.11]) part(dog, box(0.03, 0.18, 0.03), '#e4c58d', sx * 0.045, 0.09, z);
  }
  part(dog, ball(0.018), INK, 0, 0.35, 0.26);
  const tailM = part(dog, box(0.02, 0.1, 0.02), '#a97c46', 0, 0.34, -0.17, { rx: -0.5 });
  dog.visible = false;
  const bark = bubble(g, '멍!', 0.26, D[0], 0.86, D[2] + 0.1);
  const held = letter(g);
  held.rotation.x = Math.PI / 2 - 0.2;
  held.visible = false;
  const spots: Record<string, Spot> = { mpWalkRound: standAt(g, 'mpWalk', SB.stand) };
  spots['*'] = spots.mpWalkRound;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(bag, P.bag);
    bagHung.visible = !P.bag;
    at(held, P.letter);
    flaps.forEach((f, i) => {
      const openNow = (N?.b.from === `b${i}`) ? n.flap ?? 0 : 0;
      f.rotation.x = -openNow * 1.1;
    });
    stuck.forEach((s, i) => (s.visible = !!now && (n[`in${i}`] ?? 0) > 0.5));
    farG.visible = !!now;
    farFlap.rotation.x = -(N?.b.from === 'far' ? n.flap ?? 0 : 0) * 1.1;
    farIn.visible = (n.far ?? 0) > 0.5;
    dog.visible = !!now;
    dog.rotation.y = Math.sin(t * 2) * 0.1;
    tailM.rotation.x = -0.5 + 0.35 * Math.sin(t * 14);
    dog.position.y = (n.bark ?? 0) > 0.5 ? 0.02 * Math.abs(Math.sin(t * 16)) : 0;
    bark.visible = (n.bark ?? 0) > 0.5 && Math.sin(t * 5) > -0.3;
  });
  out.work = marker(g, 0, SB.y, SB.z);
}

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  // The 우체국 as one is (2026-11-05, the layout audit): the loading dock's shutter, the van, the front on the street.
  /** 하역장 셔터 (on the dock yard, its anchor beside the two-bay shutter in the parcel room's wall at world x 18, z 3 to 5). */
  mpShutter(g) {
    const X = -1.5 + 0.08 + 0.06;
    part(g, box(0.12, 0.45, 2.2), '#eceff1', X, 2.55, 1.5);
    part(g, cyl(0.18, 0.18, 2.0, 16), GREY, X + 0.14, 2.15, 1.5, { rx: Math.PI / 2 });
    part(g, box(0.05, 0.12, 1.9), RED, X + 0.03, 1.9, 1.5);
    for (const z of [0.56, 2.44]) {
      part(g, box(0.1, 2.3, 0.1), GREY_D, X, 1.15, z);
      for (let i = 0; i < 5; i++) part(g, box(0.105, 0.2, 0.105), i % 2 ? BLACK : '#fbc02d', X, 0.15 + i * 0.4, z, { outline: false });
    }
    label(g, '우편물 하역장', 0.7, 0.14, X + 0.065, 2.6, 1.5, '#eceff1', RED_D, Math.PI / 2);
    // The dock's apron lines and the cage trolleys' parking box.
    part(g, box(0.1, 0.004, 2.0), '#fbc02d', X + 0.1, 0.012, 1.5, { outline: false });
    part(g, box(2.2, 0.004, 0.08), '#fbc02d', X + 1.2, 0.012, 0.5, { outline: false });
    part(g, box(2.2, 0.004, 0.08), '#fbc02d', X + 1.2, 0.012, 2.5, { outline: false });
  },
  /** 우편 소형 화물차 (2 × 4, nose to +z): a red 1톤 box van, the white band and the post mark on the box, the back doors to the dock. */
  mpPostVan(g, W, D) {
    const L = D - 0.3;
    const hw = Math.min(W - 0.3, 1.7) / 2;
    const zn = L / 2;
    const zb = -L / 2;
    for (const z of [zn - 0.6, zb + 0.7])
      for (const sx of [-1, 1]) {
        part(g, cyl(0.3, 0.3, 0.2, 18), BLACK, sx * (hw - 0.08), 0.3, z, { rz: Math.PI / 2 });
        part(g, cyl(0.15, 0.15, 0.21, 12), STEEL, sx * (hw - 0.08), 0.3, z, { rz: Math.PI / 2, outline: false });
      }
    part(g, box(hw * 1.6, 0.16, L - 0.2), '#263238', 0, 0.45, 0);
    part(g, rbox(hw * 2, 1.35, 1.2, 0.12), RED, 0, 1.1, zn - 0.6);
    const glassM = new THREE.MeshToonMaterial({ color: '#9fc3d6' });
    const ws = new THREE.Mesh(box(hw * 1.8, 0.5, 0.03), glassM);
    ws.position.set(0, 1.45, zn + 0.005);
    g.add(ws);
    part(g, box(hw * 2 - 0.1, 0.18, 0.04), '#eceff1', 0, 0.62, zn + 0.01);
    for (const sx of [-1, 1]) part(g, box(0.18, 0.08, 0.03), '#fff59d', sx * (hw - 0.2), 0.78, zn + 0.02, { outline: false });
    const bl = L - 1.25;
    const bz = zb + bl / 2;
    part(g, rbox(hw * 2 + 0.04, 1.75, bl, 0.03), RED, 0, 1.4, bz);
    for (const sx of [-1, 1]) {
      part(g, box(0.01, 0.12, bl - 0.1), '#ffffff', sx * (hw + 0.025), 1.0, bz, { outline: false });
      label(g, `우편 · ${BRANCH}`, 1.4, 0.32, sx * (hw + 0.03), 1.75, bz, RED, '#ffffff', (sx * Math.PI) / 2);
    }
    part(g, box(0.02, 1.6, 0.02), RED_D, 0, 1.4, zb - 0.01, { outline: false });
  },
  /** The front on the street: glass doors across the 창구 hall, the red band and the sign over them (shopFront.ts). */
  mpFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 14, door: 12, name: BRANCH, sub: '우편 · 소포 · 예금 · 보험', bg: RED, fg: '#ffffff', frame: '#5d5d5d', posters: [['우체국 택배 접수', '#ffffff', RED_D, 4.5], ['국제 특급 EMS', '#fff8e1', RED_D, 8.5]] });
  },
  mailSorter(g, _W, _D, _c, _def, _ctx, out) {
    mailSorter(g, out);
  },
  postCounter(g, _W, _D, _c, _def, _ctx, out) {
    postCounter(g, out);
  },
  mailScooter(g, _W, _D, _c, _def, _ctx, out) {
    mailScooter(g, out);
  },
  mpBundleTable(g, _W, _D, _c, _def, _ctx, out) {
    bundleTable(g, out);
  },
  mpRollerLine(g, _W, _D, _c, _def, _ctx, out) {
    rollerLine(g, out);
  },
  mpCageTrolley(g, _W, _D, _c, _def, _ctx, out) {
    cageTrolley(g, out);
  },
  mpRouteMap(g, _W, _D, _c, _def, _ctx, out) {
    routeMap(g, out);
  },
  mpPoBoxes(g, _W, _D, _c, _def, _ctx, out) {
    poBoxes(g, out);
  },
  mpWritingDesk(g, _W, _D, _c, _def, _ctx, out) {
    writingDesk(g, out);
  },
  mpTicketMachine(g, _W, _D, _c, _def, _ctx, out) {
    ticketMachine(g, out);
  },
  mpMailbox(g, _W, _D, _c, _def, _ctx, out) {
    mailbox(g, out);
  },
  mpStreetBoxes(g, _W, _D, _c, _def, _ctx, out) {
    streetBoxes(g, out);
  },
};
