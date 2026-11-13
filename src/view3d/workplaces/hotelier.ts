import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { CHROME, STEEL, caster, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, text, type Paint } from './doctor';
import {
  BED, BELL, BUF, CART, CON, FD, HKC, LIFT, LINEN, LOUNGE, MINI,
  bedAt, bedHands, buffetAt, buffetHands, cardAt, cartAt, conciergeAt, frameAt, handsetUp, hotelPhase, hotelSpotYaw, liftAt, lobbyHands, minibarAt, minibarHands, routeAt, tagAt, teaAt, towelAt,
  type Frame, type TowelAt,
} from './hotelierMotion';

/**
 * The 호텔 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a Korean city
 * hotel, 호텔 라온 (made up). The lobby's front desk — a walnut counter under a marble guest ledge,
 * the logo and three world clocks on the panelled wall behind, two stations with their screens, the
 * key card encoder and the blank cards, the phone — where a guest is checked in: typed in, a card
 * encoded till its light goes green and handed across in both hands to the guest, who reaches for
 * it, the way to the lifts shown with an open hand and a bow; the concierge desk with the city map
 * the route is traced on and the destination ringed, a brochure handed over; the brass birdcage
 * luggage cart loaded, wheeled out, turned round and wheeled back; the room's bed made up — the sheet
 * snapped out over it, smoothed and tucked, the pillow plumped and set, a chocolate on it and the
 * towel swans at the foot; the minibar restocked drink by drink; the linen shelf a towel's folded in
 * four at. And what it was missing (workFurniture/hotelier.ts): the bell desk, the elevator hall,
 * the flower centrepiece under the chandelier, the lounge sofas a welcome tea is served at, the
 * 조식 뷔페 and the housekeeping cart.
 */

const WALNUT = '#4e342e';
const WALNUT_L = '#6d4c41';
const MARBLE = '#f3efe8';
const MARBLE_V = '#d9d0c4';
const BRASS = '#c9a646';
const GOLD = '#d4af37';
const LINEN_W = '#fbfaf7';
const TAUPE = '#a1887f';
const PLUM = '#5d4a6b';
const CARPET_RED = '#9b1c22';
const SKIN = '#f1cfb2';
const HOTEL = '호텔 라온';
const HOTEL_EN = 'HOTEL RAON';

const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

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
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
/** The clock offset of a piece (as the motion works it out from its work point). */
const phaseOf = (work: THREE.Object3D) => hotelPhase(work.getWorldPosition(tmp));
/** A spot stood at (x, z) facing `yaw`, with what's done there and where the hands work. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.motion = motion;
  s.work = work;
  return s;
}
/** The frame a piece's poses are worked out in, in its own space: its work point, where the feet are and which way they face. */
const pieceFrame = (work: THREE.Vector3, feet: { x: number; z: number }, yaw: number, H: number): Frame => frameAt(work, 0, new THREE.Vector3(feet.x, 0, feet.z), yaw, H);
/** A sheet lying flat on a top, its head away from +z (read from the front). */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A unit rod (along y) stretched from one point to another each frame. */
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
/** A key card: white with a gold band and the hotel's mark. */
function keyCard(g: THREE.Object3D, vip = false): THREE.Group {
  const c = group(g);
  part(c, box(0.054, 0.003, 0.086), vip ? '#1c1c1c' : '#fafafa', 0, 0, 0, { outline: false });
  part(c, box(0.054, 0.0035, 0.014), GOLD, 0, 0, -0.025, { outline: false });
  part(c, box(0.02, 0.0035, 0.02), vip ? GOLD : '#8d6e63', 0, 0, 0.018, { outline: false });
  return c;
}
/** A brass service bell. */
function serviceBell(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.045, 0.05, 0.012, 18), WALNUT, x, y + 0.006, z);
  part(g, new THREE.SphereGeometry(0.038, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), BRASS, x, y + 0.012, z, { outline: false });
  part(g, cyl(0.004, 0.004, 0.02, 6), BRASS, x, y + 0.058, z, { outline: false });
  part(g, ball(0.008), BRASS, x, y + 0.07, z, { outline: false });
}
/** A desk phone, its keypad toward +z; the handset drawn on its own (returned) so it can be lifted. */
function deskPhone(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const p = group(g, x, y, z, ry);
  part(p, rbox(0.17, 0.04, 0.15, 0.015), '#263238', 0, 0.02, 0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) part(p, box(0.02, 0.006, 0.014), '#cfd8dc', 0.025 + (c - 1) * 0.027, 0.043, 0.045 - r * 0.02, { outline: false });
  part(p, box(0.045, 0.005, 0.03), '#80cbc4', -0.05, 0.043, 0.04, { outline: false, material: glow('#80cbc4') });
  part(p, rbox(0.17, 0.03, 0.05, 0.012), '#37474f', 0, 0.05, -0.05);
  return p;
}
/** The handset (built along x), returned so it can be put at the cradle or the ear. */
function handset(g: THREE.Object3D): THREE.Group {
  const h = group(g);
  part(h, rbox(0.19, 0.03, 0.045, 0.014), '#263238', 0, 0, 0);
  for (const sx of [-1, 1]) part(h, rbox(0.045, 0.028, 0.055, 0.012), '#263238', sx * 0.075, -0.014, 0);
  return h;
}
/** A hard-shell suitcase stood up, the top of its handle at the origin. */
function suitcase(g: THREE.Object3D, color: string, s = 1): THREE.Group {
  const c = group(g);
  c.scale.setScalar(s);
  part(c, rbox(0.4, 0.55, 0.24, 0.04), color, 0, -0.305, 0);
  for (const x of [-0.12, 0, 0.12]) part(c, box(0.012, 0.5, 0.245), shade(color, 0.85), x, -0.305, 0, { outline: false });
  for (const sx of [-1, 1]) part(c, cyl(0.007, 0.007, 0.05, 6), '#424242', sx * 0.07, -0.015, 0, { outline: false });
  part(c, rbox(0.17, 0.02, 0.025, 0.008), '#424242', 0, 0.005, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.022, 0.022, 0.02, 10), '#212121', sx * 0.16, -0.6, sz * 0.08, { rz: Math.PI / 2, outline: false });
  return c;
}
/** A clean folded towel (or a stack of them) lying on a top. */
function towelStack(g: THREE.Object3D, x: number, y: number, z: number, n: number, w = 0.28, d = 0.21, color = '#ffffff', ry = 0) {
  for (let i = 0; i < n; i++) {
    const m = part(g, rbox(w, 0.026, d, 0.012), i % 2 ? shade(color, 0.97) : color, x + (i % 2 ? 0.004 : -0.003), y + 0.013 + i * 0.027, z, { ry: ry + (i % 3 - 1) * 0.03 });
    if (i === n - 1) part(g, box(w * 0.9, 0.003, 0.01), '#b0bec5', x, y + 0.027 * (i + 1), z + d / 2 - 0.03, { ry, outline: false }).rotation.y = m.rotation.y;
  }
}

// ---------------------------------------------------------------------------------------------
// People drawn stood (guests at the desks, the one shown into the lift).

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin: string;
  long: boolean;
  coat: boolean;
  shoes: string;
  shades?: boolean;
  cap?: string;
}
const TRAVELLER: Look = { top: '#c8a27a', bottom: '#33415c', hair: '#2b1b10', skin: SKIN, long: true, coat: true, shoes: '#5d4037' };
const VIP: Look = { top: '#1c1c1f', bottom: '#1c1c1f', hair: '#3e3e3e', skin: '#e8c3a2', long: false, coat: false, shoes: '#111111', shades: true };
const TOURIST: Look = { top: '#4fc3f7', bottom: '#8d6e63', hair: '#1a1a1a', skin: '#e3b48f', long: false, coat: false, shoes: '#eeeeee', cap: '#ef5350' };
const BUSINESS: Look = { top: '#2f3e5c', bottom: '#2f3e5c', hair: '#201812', skin: '#edc6a6', long: false, coat: false, shoes: '#3e2723' };

/** A head, the face to +z: hair short or long, maybe sunglasses or a cap. */
function headOf(g: THREE.Object3D, look: Look): THREE.Group {
  const h = group(g);
  h.rotation.order = 'YXZ';
  part(h, ball(0.09), look.skin, 0, 0, 0).scale.set(0.92, 1.06, 1);
  part(h, ball(0.096), look.hair, 0, 0.026, -0.018).scale.set(1, 0.92, 1);
  part(h, box(0.15, 0.04, 0.04), look.hair, 0, 0.07, 0.05, { rx: 0.4, outline: false });
  for (const sx of [-1, 1]) {
    part(h, ball(0.016), look.skin, sx * 0.083, -0.005, 0);
    if (!look.shades) part(h, ball(0.011), '#2b1d16', sx * 0.032, 0.004, 0.08, { outline: false });
  }
  if (look.shades) {
    part(h, box(0.15, 0.03, 0.01), '#111111', 0, 0.006, 0.085, { outline: false });
    for (const sx of [-1, 1]) part(h, box(0.006, 0.006, 0.08), '#111111', sx * 0.078, 0.01, 0.045, { outline: false });
  }
  part(h, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.046, 0.084, { outline: false });
  if (look.long) part(h, rbox(0.19, 0.28, 0.07, 0.03), look.hair, 0, -0.1, -0.07);
  if (look.cap) {
    part(h, new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), look.cap, 0, 0.03, -0.01, { outline: false });
    part(h, box(0.13, 0.008, 0.08), look.cap, 0, 0.035, 0.1, { rx: -0.1, outline: false });
  }
  return h;
}
interface Guest {
  root: THREE.Group;
  head: THREE.Group;
  /** Puts the right hand at a point in the parent's frame (or down at the side) and says where it is. */
  arm(to: THREE.Vector3 | null): THREE.Vector3;
}
/** Someone stood with their feet at (x, z) in `g`, turned `ry` (0 faces +z); the right arm moves. */
function guest(g: THREE.Object3D, look: Look, x: number, z: number, ry: number): Guest {
  const root = group(g, x, 0, z, ry);
  for (const sx of [-1, 1]) {
    rod(root, new THREE.Vector3(sx * 0.08, 0.86, 0), new THREE.Vector3(sx * 0.085, 0.08, 0.01), 0.055, look.bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), look.shoes, sx * 0.085, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.16, 0.2, 0.06), look.bottom, 0, 0.9, 0);
  if (look.coat) {
    part(root, rbox(0.37, 0.58, 0.24, 0.08), look.top, 0, 1.08, 0);
    part(root, rbox(0.36, 0.3, 0.23, 0.06), look.top, 0, 0.7, 0);
    part(root, box(0.3, 0.03, 0.245), shade(look.top, 0.75), 0, 0.93, 0, { outline: false });
  } else part(root, rbox(0.35, 0.52, 0.22, 0.08), look.top, 0, 1.1, 0);
  if (look === VIP || look === BUSINESS) {
    part(root, box(0.1, 0.18, 0.02), '#ffffff', 0, 1.27, 0.108, { outline: false });
    part(root, box(0.03, 0.15, 0.022), look === VIP ? '#7f1d1d' : '#1565c0', 0, 1.25, 0.11, { outline: false });
  }
  part(root, cyl(0.045, 0.05, 0.08, 12), look.skin, 0, 1.39, 0);
  const head = headOf(root, look);
  head.position.set(0, 1.52, 0);
  // The left arm down at the side; the right one reaches.
  const ls = new THREE.Vector3(0.2, 1.32, 0);
  rod(root, ls, new THREE.Vector3(0.23, 1.06, 0.02), 0.04, look.top);
  rod(root, new THREE.Vector3(0.23, 1.06, 0.02), new THREE.Vector3(0.22, 0.83, 0.06), 0.034, look.top);
  part(root, ball(0.035), look.skin, 0.22, 0.8, 0.07);
  const rs = new THREE.Vector3(-0.2, 1.32, 0);
  const upper = limb(root, 0.04, look.top);
  const lower = limb(root, 0.034, look.top);
  const hand = part(root, ball(0.035), look.skin, 0, 0, 0);
  const rest = new THREE.Vector3(-0.23, 0.82, 0.06);
  const local = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const arm = (to: THREE.Vector3 | null) => {
    if (to) local.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
    else local.copy(rest);
    const d = local.clone().sub(rs);
    const L = Math.min(0.52, d.length());
    d.normalize();
    local.copy(rs).addScaledVector(d, L);
    // The elbow bent out and down off the line from the shoulder.
    const a = 0.28;
    const b = 0.26;
    const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
    const bend = new THREE.Vector3(-0.6, -1, -0.2).normalize();
    bend.addScaledVector(d, -bend.dot(d)).normalize();
    elbow.copy(rs).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
    upper(rs, elbow);
    lower(elbow, local);
    hand.position.copy(local);
    return local.clone().applyAxisAngle(UP, root.rotation.y).add(root.position);
  };
  arm(null);
  return { root, head, arm };
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the map, the signs.

const paintCheckIn: Paint = (c) => {
  c.fillStyle = '#f4f6f9';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#4e342e';
  c.fillRect(0, 0, 320, 28);
  text(c, `${HOTEL} PMS · 체크인`, 10, 14, 13, '#ffe9b0');
  const rows: Array<[string, string]> = [['투숙객', '한시우 님 외 1명'], ['객실', '1207 · 디럭스 더블'], ['숙박', '10.27 ~ 10.29 (2박)'], ['조식', '포함 2인'], ['결제', '사전 결제 완료']];
  rows.forEach(([k, v], i) => {
    text(c, k, 14, 48 + i * 26, 12, '#78909c', 'left', false);
    text(c, v, 84, 48 + i * 26, 13, '#263238');
  });
  c.fillStyle = '#2e7d32';
  c.fillRect(214, 160, 96, 28);
  text(c, '키 발급', 262, 174, 13, '#ffffff', 'center');
};
const paintOccupancy: Paint = (c) => {
  c.fillStyle = '#f4f6f9';
  c.fillRect(0, 0, 320, 200);
  text(c, '객실 판매 현황 · 이번 주', 10, 16, 13, '#263238');
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const occ = [0.62, 0.58, 0.7, 0.74, 0.91, 0.98, 0.66];
  days.forEach((d, i) => {
    const h = occ[i] * 130;
    c.fillStyle = occ[i] > 0.9 ? '#c62828' : '#6d4c41';
    c.fillRect(22 + i * 42, 170 - h, 26, h);
    text(c, d, 35 + i * 42, 184, 11, '#546e7a', 'center', false);
    text(c, `${Math.round(occ[i] * 100)}%`, 35 + i * 42, 162 - h, 10, '#37474f', 'center', false);
  });
};
const paintRooms: Paint = (c) => {
  c.fillStyle = '#f4f6f9';
  c.fillRect(0, 0, 320, 200);
  text(c, '객실 배정 · 12층', 10, 16, 13, '#263238');
  const r = seeded(31);
  const col: Record<string, string> = { 투숙: '#90caf9', 정비: '#ffcc80', 공실: '#a5d6a7', 점검: '#ef9a9a' };
  for (let i = 0; i < 16; i++) {
    const k = r() < 0.5 ? '투숙' : r() < 0.5 ? '공실' : r() < 0.8 ? '정비' : '점검';
    const x = 12 + (i % 4) * 76;
    const y = 32 + Math.floor(i / 4) * 40;
    c.fillStyle = col[k];
    c.fillRect(x, y, 70, 34);
    text(c, `12${String(i + 1).padStart(2, '0')}`, x + 35, y + 12, 12, '#263238', 'center');
    text(c, k, x + 35, y + 26, 10, '#37474f', 'center', false);
  }
};
const paintIdle: Paint = (c) => {
  c.fillStyle = '#3e2723';
  c.fillRect(0, 0, 320, 200);
  text(c, HOTEL_EN, 160, 88, 26, '#d4af37', 'center');
  text(c, HOTEL, 160, 122, 16, '#efe3c8', 'center', false);
};
/** The city map the concierge traces routes on (made up): the river, the main roads, the sights. */
const paintMap: Paint = (c) => {
  c.fillStyle = '#f5f1e6';
  c.fillRect(0, 0, 360, 260);
  // Parks, the river along the bottom with its bridges.
  c.fillStyle = '#cfe6c4';
  c.fillRect(250, 20, 90, 60);
  c.fillRect(30, 150, 70, 40);
  c.fillStyle = '#9ccbe8';
  c.beginPath();
  c.moveTo(0, 215);
  c.bezierCurveTo(120, 190, 220, 250, 360, 210);
  c.lineTo(360, 260);
  c.lineTo(0, 260);
  c.fill();
  c.strokeStyle = '#ffffff';
  c.lineWidth = 9;
  for (const [x0, y0, x1, y1] of [[0, 120, 360, 110], [0, 60, 360, 70], [90, 0, 110, 260], [200, 0, 230, 260], [300, 0, 290, 220]]) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  }
  c.strokeStyle = '#e8ddc6';
  c.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    c.moveTo(0, 20 + i * 30);
    c.lineTo(360, 26 + i * 30);
    c.stroke();
  }
  text(c, '궁궐', 300, 48, 15, '#2e7d32', 'center');
  text(c, '전통시장', 160, 150, 13, '#6d4c41', 'center');
  text(c, '미술관', 60, 30, 13, '#5e35b1', 'center');
  text(c, '한강 공원', 70, 238, 12, '#1565c0', 'center', false);
  text(c, '타워', 250, 196, 12, '#c62828', 'center');
  text(c, 'CITY MAP · 시내 지도', 10, 12, 11, '#8d6e63', 'left');
};
const paintMenu: Paint = (c) => {
  c.fillStyle = '#fffaf0';
  c.fillRect(0, 0, 200, 280);
  text(c, '연회 메뉴', 100, 28, 18, '#4e342e', 'center');
  ['한우 갈비찜', '전복 죽', '구절판', '도미 찜', '수정과 · 약과'].forEach((s, i) => text(c, s, 100, 72 + i * 38, 14, '#5d4037', 'center', false));
};
const paintDirectory: Paint = (c) => {
  c.fillStyle = '#2b2b30';
  c.fillRect(0, 0, 160, 240);
  const rows: Array<[string, string]> = [['16F', '스카이 라운지'], ['3–15F', '객실'], ['2F', '연회장'], ['1F', '로비 · 조식당'], ['B1', '주차장']];
  rows.forEach(([f, s], i) => {
    text(c, f, 12, 34 + i * 44, 15, GOLD, 'left');
    text(c, s, 66, 34 + i * 44, 13, '#eeeeee', 'left', false);
  });
};
const paintFloor = (n: number, up: boolean): Paint => (c) => {
  c.fillStyle = '#0d0d0d';
  c.fillRect(0, 0, 128, 64);
  text(c, String(n), 76, 34, 40, '#ff8f00', 'center');
  c.fillStyle = up ? '#ff8f00' : '#3a2a10';
  c.beginPath();
  c.moveTo(22, 14);
  c.lineTo(38, 36);
  c.lineTo(6, 36);
  c.fill();
};
const floorTex = (n: number, up: boolean) => painted(`htl-floor-${n}-${up}`, 128, 64, paintFloor(n, up));
const paintTag: Paint = (c) => {
  c.fillStyle = '#fff3e0';
  c.fillRect(0, 0, 96, 160);
  c.fillStyle = '#c62828';
  c.fillRect(0, 0, 96, 30);
  text(c, '짐표', 48, 16, 15, '#ffffff', 'center');
  text(c, 'No.', 48, 62, 13, '#5d4037', 'center', false);
  text(c, '0127', 48, 92, 24, '#c62828', 'center');
  text(c, HOTEL, 48, 136, 12, '#5d4037', 'center', false);
};
const paintRates: Paint = (c) => {
  c.fillStyle = '#fffaf0';
  c.fillRect(0, 0, 160, 200);
  text(c, '미니바', 80, 22, 16, '#4e342e', 'center');
  [['생수', '무료'], ['맥주', '9,000'], ['콜라', '5,000'], ['주스', '6,000'], ['견과', '7,000']].forEach(([k, v], i) => {
    text(c, k, 16, 58 + i * 28, 13, '#5d4037', 'left', false);
    text(c, v, 144, 58 + i * 28, 13, '#5d4037', 'right', false);
  });
};

// ---------------------------------------------------------------------------------------------
// Things more than one piece has.

/** A wall clock (a city's time under it), its face to +z. */
function worldClock(g: THREE.Object3D, x: number, y: number, z: number, city: string, hour: number) {
  part(g, cyl(0.105, 0.105, 0.025, 28), BRASS, x, y, z, { rx: Math.PI / 2 });
  part(g, cyl(0.092, 0.092, 0.01, 28), '#fbf8f0', x, y, z + 0.014, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    part(g, box(0.006, i % 3 ? 0.012 : 0.022, 0.003), '#3e2723', x + Math.sin(a) * 0.078, y + Math.cos(a) * 0.078, z + 0.02, { rz: -a, outline: false });
  }
  const hr = ((hour % 12) / 12) * Math.PI * 2;
  part(g, box(0.008, 0.05, 0.003), '#3e2723', x + Math.sin(hr) * 0.022, y + Math.cos(hr) * 0.022, z + 0.022, { rz: -hr, outline: false });
  part(g, box(0.005, 0.07, 0.003), '#3e2723', x + 0.032, y, z + 0.023, { rz: -Math.PI / 2, outline: false });
  label(g, city, 0.2, 0.04, x, y - 0.14, z + 0.003, '#2b2118', '#e9d9b0');
}
/** A monitor on its foot at (x, z) on a top at `y`, its screen turned to -z (to someone behind the counter); returns the screen. */
function monitorBack(g: THREE.Object3D, x: number, y: number, z: number, tex: THREE.Texture): THREE.Mesh {
  const m = group(g, x, y, z, Math.PI);
  part(m, rbox(0.16, 0.012, 0.12, 0.006), '#2b2b30', 0, 0.006, 0);
  part(m, box(0.03, 0.12, 0.02), '#2b2b30', 0, 0.07, -0.02, { outline: false });
  part(m, rbox(0.44, 0.28, 0.025, 0.01), '#1f1f22', 0, 0.22, -0.01);
  return litScreen(m, tex, 0.41, 0.25, 0, 0.22, 0.004);
}
/** A keyboard and its mouse on a top at `y`. */
function keyboard(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, rbox(0.36, 0.018, 0.12, 0.006), '#2b2b30', x, y + 0.009, z);
  for (let r = 0; r < 4; r++) part(g, box(0.33, 0.004, 0.018), '#4a4a50', x, y + 0.02, z - 0.04 + r * 0.026, { outline: false });
  part(g, rbox(0.05, 0.02, 0.08, 0.02), '#2b2b30', x - 0.25, y + 0.01, z + 0.01);
}
/** Marble veins on a top at `y`. */
function veins(g: THREE.Object3D, w: number, d: number, x: number, y: number, z: number, seed: number) {
  const r = seeded(seed);
  for (let i = 0; i < Math.round(w * 4); i++) part(g, box(0.15 + r() * 0.3, 0.001, 0.004), MARBLE_V, x - w / 2 + 0.15 + r() * (w - 0.3), y + 0.0006, z - d / 2 + 0.05 + r() * (d - 0.1), { ry: -0.6 + r() * 1.2, outline: false });
}

// ---------------------------------------------------------------------------------------------
// The towel being folded (the linen shelf, the housekeeping cart).

interface TowelRig {
  show(st: TowelAt, stack: THREE.Vector3, t: number): void;
}
/** A white towel 0.56 × 0.42, laid with its middle at `P` (the folding top) to be folded in half and in four. */
function towelRig(g: THREE.Object3D, P: THREE.Vector3): TowelRig {
  const W = '#ffffff';
  const ballM = part(g, ball(0.07), W, 0, 0, 0);
  ballM.scale.set(1.1, 0.7, 0.9);
  const open = group(g);
  part(open, box(0.52, 0.42, 0.008), W, 0, -0.21, 0);
  for (const y of [-0.12, -0.3]) part(open, box(0.5, 0.012, 0.012), '#eef1f3', 0, y, 0.004, { outline: false });
  part(open, box(0.52, 0.03, 0.01), '#b0bec5', 0, -0.39, 0.002, { outline: false });
  const flatG = group(g, P.x, P.y + 0.003, P.z);
  // In half: the far half lies, the near one turns over onto it.
  const halfStage = group(flatG);
  part(halfStage, box(0.56, 0.006, 0.21), W, 0, 0.003, -0.105);
  const flapN = group(halfStage);
  part(flapN, box(0.56, 0.006, 0.21), W, 0, 0.003, 0.105);
  part(flapN, box(0.54, 0.0065, 0.02), '#b0bec5', 0, 0.003, 0.19, { outline: false });
  // In four: the half's left lies, its right turns over onto it.
  const quarterStage = group(flatG);
  part(quarterStage, box(0.28, 0.012, 0.21), W, -0.14, 0.006, -0.105);
  const flapR = group(quarterStage);
  part(flapR, box(0.28, 0.012, 0.21), W, 0.14, 0.006, -0.105);
  const block = part(g, box(0.28, 0.024, 0.21), W, 0, 0, 0);
  const stacked = part(g, box(0.28, 0.024, 0.21), W, 0, 0, 0);
  const mid = new THREE.Vector3();
  return {
    show(st, stack, t) {
      const h = st.hands;
      if (h.l && h.r) mid.copy(h.l).lerp(h.r, 0.5);
      ballM.visible = st.show === 'ball';
      open.visible = st.show === 'open';
      flatG.visible = st.show === 'flat';
      block.visible = st.show === 'block';
      stacked.visible = st.show === 'stacked';
      if (ballM.visible && h.r) ballM.position.copy(h.r).add(new THREE.Vector3(0, -0.04, 0));
      if (open.visible && h.l && h.r) {
        open.position.copy(mid);
        open.rotation.set(0.12 * Math.sin(t * 9), Math.atan2(-(h.r.z - h.l.z), h.r.x - h.l.x), 0);
      }
      if (flatG.visible) {
        const q = st.quarter;
        halfStage.visible = q <= 0;
        quarterStage.visible = q > 0;
        flapN.position.y = 0.012 * st.half;
        flapN.rotation.x = -Math.PI * st.half;
        flapR.position.y = 0.024 * q;
        flapR.rotation.z = Math.PI * q;
      }
      if (block.visible) block.position.copy(mid).add(new THREE.Vector3(0, -0.03, 0));
      if (stacked.visible) stacked.position.copy(stack).add(new THREE.Vector3(0, 0.012, 0));
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  /**
   * The front desk: a walnut counter fluted along its front with a warm light along its foot and the
   * hotel's name in gold, a marble guest ledge over it; behind, the clerk's work top with two stations
   * (screen, keyboard; at the clerk's, the blank key cards in their tray, the encoder with its light,
   * the memo pad, the phone), and on the panelled wall the logo and the clocks of 뉴욕, 서울 and 파리.
   * Checking a guest in (checkIn): stood behind it, typed in, a card taken off the stack and held in the
   * encoder till its light goes green, handed across the ledge in both hands to the guest — a traveller
   * in a trench coat with her case, who reaches for it — then the way to the lifts shown with an open
   * hand and a bow; a VIP in a dark suit and glasses gets a black card and flowers on the ledge. On the
   * phone (frontPhone) the handset's at the ear, typing and noting the booking down; the occupancy and
   * the room grid are worked on the screen; the service manual read stood there.
   */
  frontDesk(g, W, _D, _c, _def, _ctx, out) {
    const ledge = 1.12;
    const top = 0.92;
    // The panelled wall behind: fluted walnut, the logo, three clocks.
    part(g, rbox(W, 2.5, 0.04, 0.01), WALNUT_L, 0, 1.25, -0.48);
    for (let i = 0; i < 10; i++) part(g, box(0.025, 2.4, 0.012), shade(WALNUT_L, 0.82), -0.9 + i * 0.2, 1.25, -0.455, { outline: false });
    part(g, rbox(1.16, 0.36, 0.03, 0.01), '#2b2118', 0, 2.08, -0.445);
    label(g, HOTEL_EN, 0.94, 0.16, 0, 2.12, -0.428, '#2b2118', GOLD);
    label(g, HOTEL, 0.5, 0.08, 0, 1.98, -0.428, '#2b2118', '#efe3c8');
    ([[-0.66, '뉴욕', 9], [0, '서울', 10], [0.66, '파리', 3]] as Array<[number, string, number]>).forEach(([x, city, h]) => worldClock(g, x, 1.66, -0.44, city, h));
    // The counter: its fluted front, the light along the foot, the name; the marble ledge; the ends.
    part(g, rbox(W - 0.02, ledge - 0.02, 0.06, 0.012), WALNUT, 0, (ledge - 0.02) / 2, 0.47);
    for (let i = 0; i < 19; i++) part(g, box(0.03, ledge - 0.2, 0.01), shade(WALNUT, 1.18), -0.9 + i * 0.1, 0.57, 0.503, { outline: false });
    glowing(g, box(W - 0.1, 0.02, 0.01), '#ffd99a', 0, 0.06, 0.505);
    part(g, rbox(0.86, 0.13, 0.012, 0.004), '#2b2118', 0.42, 0.78, 0.51);
    label(g, HOTEL_EN, 0.7, 0.08, 0.42, 0.79, 0.517, '#2b2118', GOLD);
    part(g, rbox(W, 0.04, 0.32, 0.01), MARBLE, 0, ledge, 0.34);
    veins(g, W, 0.32, 0, ledge + 0.02, 0.34, 3);
    for (const sx of [-1, 1]) part(g, rbox(0.05, ledge, 0.62, 0.012), WALNUT, sx * (W / 2 - 0.025), ledge / 2, 0.17);
    // The work top behind the ledge, the panel under the ledge's back, a drawer pedestal at the far station.
    part(g, rbox(W - 0.12, 0.03, 0.34, 0.008), '#3e2723', 0, top - 0.015, 0.09);
    part(g, rbox(W - 0.12, ledge - top, 0.02, 0.006), WALNUT, 0, (ledge + top) / 2, 0.265);
    part(g, rbox(0.38, top - 0.04, 0.34, 0.01), WALNUT_L, 0.74, (top - 0.04) / 2, 0.09);
    for (const y of [0.25, 0.5, 0.74]) part(g, box(0.12, 0.012, 0.01), BRASS, 0.74, y, -0.085, { outline: false });
    // The clerk's station: screen, keyboard, the cards and the encoder, the pad, the phone.
    const kbdAt = FD.kbd;
    const screen = monitorBack(g, kbdAt.x, top, 0.17, painted('htl-checkin', 320, 200, paintCheckIn));
    keyboard(g, kbdAt.x, top, kbdAt.z);
    const off = (d: readonly [number, number, number]) => new THREE.Vector3(kbdAt.x + d[0], kbdAt.y + d[1], kbdAt.z + d[2]);
    const stackAt = off(FD.stack);
    glass(g, box(0.07, 0.03, 0.1), stackAt.x, top + 0.015, stackAt.z);
    for (let i = 0; i < 5; i++) keyCard(g).position.set(stackAt.x, top + 0.004 + i * 0.004, stackAt.z);
    const slotAt = off(FD.slot);
    part(g, rbox(0.09, 0.065, 0.13, 0.01), '#263238', slotAt.x, top + 0.0325, slotAt.z);
    part(g, box(0.064, 0.004, 0.006), '#000000', slotAt.x, top + 0.066, slotAt.z, { outline: false });
    label(g, 'KEY', 0.05, 0.016, slotAt.x, top + 0.04, slotAt.z + 0.066, '#263238', '#b0bec5');
    part(g, ball(0.007), '#455a64', slotAt.x + 0.03, top + 0.066, slotAt.z + 0.045, { outline: false });
    const padAt = off(FD.pad);
    part(g, box(0.1, 0.012, 0.13), '#fffdf5', padAt.x, top + 0.006, padAt.z, { ry: 0.15 });
    part(g, cyl(0.0045, 0.0045, 0.13, 6), '#1a237e', padAt.x + 0.07, top + 0.016, padAt.z, { rx: Math.PI / 2, ry: 0.1, outline: false });
    const cradle = off(FD.cradle);
    deskPhone(g, cradle.x, top, cradle.z);
    // The far station: its screen and keyboard, the receipt printer, the hours on the ledge, a bell.
    monitorBack(g, 0.45, top, 0.17, painted('htl-idle', 320, 200, paintIdle));
    keyboard(g, 0.45, top, 0.0);
    part(g, rbox(0.14, 0.1, 0.16, 0.02), '#eceff1', 0.82, top + 0.05, 0.05);
    part(g, box(0.08, 0.002, 0.06), '#ffffff', 0.82, top + 0.105, 0.09, { rx: -0.6, outline: false });
    const hours = group(g, 0.62, ledge + 0.02, 0.36);
    glass(hours, box(0.16, 0.11, 0.008), 0, 0.055, 0);
    label(hours, '체크인 15:00', 0.14, 0.03, 0, 0.075, 0.006, '#ffffff', WALNUT);
    label(hours, '체크아웃 11:00', 0.14, 0.03, 0, 0.035, 0.006, '#ffffff', WALNUT);
    serviceBell(g, 0.88, ledge + 0.02, 0.4);
    // The handset in its cradle while nobody's on the phone (another drawn in use, to be lifted).
    const cradleAt = new THREE.Vector3(cradle.x, top + 0.075, cradle.z - 0.05);
    const idle = group(g);
    out.idle = idle;
    handset(idle).position.copy(cradleAt);
    // What's out when it's used.
    const use = group(g);
    out.inUse = use;
    const phone = handset(use);
    const traveller = guest(use, TRAVELLER, kbdAt.x, 0.92, Math.PI);
    const bag = suitcase(use, '#8e6f5a');
    bag.position.set(kbdAt.x - 0.38, 0.63, 0.98);
    const vip = guest(use, VIP, kbdAt.x, 0.92, Math.PI);
    const flowers = group(use, -0.86, ledge + 0.02, 0.36);
    part(flowers, rbox(0.14, 0.1, 0.14, 0.01), '#1c1c1f', 0, 0.05, 0);
    const fr = seeded(7);
    for (let i = 0; i < 9; i++) part(flowers, ball(0.026), ['#ffffff', '#f8bbd0', '#fff3e0'][i % 3], -0.04 + fr() * 0.08, 0.11 + fr() * 0.03, -0.04 + fr() * 0.08, { outline: false });
    label(flowers, 'VIP', 0.06, 0.02, 0, 0.05, 0.072, '#1c1c1f', GOLD);
    const plain = keyCard(use);
    const black = keyCard(use, true);
    const led = {
      red: part(use, ball(0.008), '#ff1744', slotAt.x + 0.03, top + 0.067, slotAt.z + 0.045, { outline: false, material: glow('#ff1744') }),
      green: part(use, ball(0.008), '#00e676', slotAt.x + 0.03, top + 0.067, slotAt.z + 0.045, { outline: false, material: glow('#00e676') }),
    };
    // Each use its own place behind the counter (the same place, told apart by which was stood at).
    const kbd = marker(g, kbdAt.x, kbdAt.y, kbdAt.z);
    const clerk = (m: Motion) => standAt(g, FD.clerk.x, FD.clerk.z, 0, m, kbd);
    const spots: Record<string, Spot> = {
      checkInGuests: clerk('checkIn'),
      vipCheckIn: clerk('checkIn'),
      answerPhone: clerk('frontPhone'),
      hotelier_occupancyReport: clerk('type'),
      hotelier_roomAssignment: clerk('type'),
      hotelier_learnService: clerk('read'),
      '*': clerk('type'),
    };
    out.spots = spots;
    out.work = kbd;
    out.screen = screen;
    const faces = { checkIn: painted('htl-checkin', 320, 200, paintCheckIn), occ: painted('htl-occ', 320, 200, paintOccupancy), rooms: painted('htl-rooms', 320, 200, paintRooms) };
    out.animate = (t) => {
      const now = nowAt(spots, t) ?? '*';
      const ph = phaseOf(kbd);
      const f = pieceFrame(kbdAt, FD.clerk, 0, heightAt(spots[now]));
      (screen.material as THREE.MeshBasicMaterial).map = now === 'hotelier_occupancyReport' ? faces.occ : now === 'hotelier_roomAssignment' ? faces.rooms : faces.checkIn;
      const isVip = now === 'vipCheckIn';
      const checking = isVip || now === 'checkInGuests';
      const who = isVip ? vip : traveller;
      traveller.root.visible = bag.visible = now === 'checkInGuests';
      vip.root.visible = flowers.visible = isVip;
      plain.visible = black.visible = led.red.visible = led.green.visible = false;
      // The handset: at the ear while it's held there, else in its cradle.
      if (now === 'answerPhone' && handsetUp(t, ph)) {
        phone.position.copy(f.bd(0.1 * f.k, 0.885 * f.H, 0.05 * f.k)).add(new THREE.Vector3(0, -0.05, 0.03));
        phone.rotation.set(0, Math.PI / 2, 1.2);
      } else {
        phone.position.copy(cradleAt);
        phone.rotation.set(0, 0, 0);
      }
      if (!checking) return;
      const c = cardAt(f, t, ph);
      const cardM = isVip ? black : plain;
      const handoff = f.o(...FD.hand).add(new THREE.Vector3(0, -0.03, 0.09));
      const rest = who.arm(null);
      const hand = c.reach > 0 ? who.arm(rest.clone().lerp(handoff, c.reach)) : rest;
      who.head.rotation.x = 0.12 + 0.3 * c.reach;
      led.red.visible = c.led === 'red';
      led.green.visible = c.led === 'green';
      if (c.show === 'none') return;
      cardM.visible = true;
      if (c.show === 'hand' && c.at) {
        cardM.position.copy(c.at);
        // Stood up in the encoder's slot, tipped towards the guest as it's held out.
        cardM.rotation.set(c.led !== 'off' ? Math.PI / 2 : 1.2, 0, 0);
      } else {
        cardM.position.copy(hand).add(new THREE.Vector3(0, 0.01, 0));
        cardM.rotation.set(0.6, 0, 0);
      }
    };
  },

  /**
   * The concierge desk: a stood-at walnut desk with a brass-framed front (컨시어지), a marble top with
   * the city map on it turned to the guest, a banker's lamp, a bell, the brochures in their acrylic
   * rack. Planning a day out (concierge): a tourist in a cap across it; the hotel pointed out, the
   * route traced along the streets with a finger (drawn in red as it goes), the destination ringed,
   * the day talked through with a hand up to them, a brochure out of the rack handed over. A banquet
   * menu's written on its card there; the staff are briefed from behind it.
   */
  conciergeDesk(g, _W, _D, _c, _def, _ctx, out) {
    const top = CON.map.y - 0.001;
    part(g, rbox(0.82, top - 0.04, 0.46, 0.02), WALNUT, 0, (top - 0.04) / 2, 0.18);
    part(g, rbox(0.86, 0.06, 0.48, 0.02), BRASS, 0, 0.03, 0.18);
    part(g, rbox(0.66, 0.5, 0.012, 0.004), WALNUT_L, 0, 0.55, 0.415);
    for (const y of [0.8, 0.3]) part(g, box(0.68, 0.012, 0.008), BRASS, 0, y, 0.422, { outline: false });
    label(g, 'CONCIERGE', 0.5, 0.07, 0, 0.6, 0.423, WALNUT_L, GOLD);
    label(g, '컨시어지', 0.3, 0.06, 0, 0.5, 0.423, WALNUT_L, '#efe3c8');
    part(g, rbox(0.9, 0.04, 0.54, 0.01), MARBLE, 0, top - 0.02, 0.17);
    veins(g, 0.9, 0.54, 0, top, 0.17, 9);
    // The city map, the hotel's pin on it.
    flat(g, painted('htl-map', 360, 260, paintMap), 0.5, 0.36, CON.map.x, top + 0.001, CON.map.z);
    const [hx, hz] = CON.route[0];
    part(g, cyl(0.012, 0.012, 0.006, 12), WALNUT, CON.map.x + hx, top + 0.004, CON.map.z + hz, { outline: false });
    part(g, cyl(0.006, 0.006, 0.007, 8), GOLD, CON.map.x + hx, top + 0.006, CON.map.z + hz, { outline: false });
    // A banker's lamp, the bell, the brochure rack.
    part(g, cyl(0.06, 0.07, 0.02, 16), BRASS, -0.33, top + 0.01, 0);
    part(g, cyl(0.008, 0.008, 0.26, 8), BRASS, -0.33, top + 0.14, 0, { outline: false });
    part(g, new THREE.CylinderGeometry(0.03, 0.09, 0.07, 18, 1, true), '#1b5e20', -0.33, top + 0.28, 0.02, { rx: 0.3 }).userData.ownGeometry = true;
    serviceBell(g, 0.32, top, 0.36);
    const rack = new THREE.Vector3(CON.map.x + CON.rack[0], CON.map.y + CON.rack[1], CON.map.z + CON.rack[2]);
    glass(g, box(0.16, 0.13, 0.07), rack.x, top + 0.065, rack.z);
    ['#26a69a', '#ef6c00', '#5e35b1'].forEach((col, i) => part(g, box(0.045, 0.12, 0.006), col, rack.x - 0.05 + i * 0.05, top + 0.07, rack.z + (i - 1) * 0.008, { rx: -0.1, outline: false }));
    // The route traced so far, the destination ringed, the brochure taken out, the tourist.
    const use = group(g);
    out.inUse = use;
    glowing(use, ball(0.045), '#fff3c4', -0.33, top + 0.255, 0.035);
    const legs: THREE.Mesh[] = [];
    for (let i = 1; i < CON.route.length; i++) legs.push(part(use, box(1, 0.002, 0.008), '#d32f2f', 0, top + 0.004, 0, { outline: false }));
    const dots: THREE.Mesh[] = [];
    const [dx, dz] = CON.route[CON.route.length - 1];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      dots.push(part(use, box(0.012, 0.002, 0.006), '#d32f2f', CON.map.x + dx + 0.028 * Math.cos(a), top + 0.005, CON.map.z + dz + 0.028 * Math.sin(a), { ry: -a + Math.PI / 2, outline: false }));
    }
    const brochure = group(use);
    part(brochure, box(0.05, 0.13, 0.008), '#26a69a', 0, 0, 0, { outline: false });
    part(brochure, box(0.04, 0.03, 0.009), '#ffffff', 0, 0.03, 0, { outline: false });
    const tourist = guest(use, TOURIST, 0, 0.88, Math.PI);
    const menu = flat(use, painted('htl-menu', 200, 280, paintMenu), 0.15, 0.21, -0.12, top + 0.002, 0.05, 0.1);
    const mapAt = marker(g, CON.map.x, CON.map.y, CON.map.z);
    const menuAt = marker(g, -0.12, top + 0.004, 0.05);
    const edgeAt = marker(g, 0, top, -0.06);
    const stand = (m: Motion, w: THREE.Object3D) => standAt(g, CON.stand.x, CON.stand.z, 0, m, w);
    const spots: Record<string, Spot> = {
      planItinerary: stand('concierge', mapAt),
      hotelier_banquetMenu: stand('write', menuAt),
      hotelier_staffBriefing: stand('pressBrief', edgeAt),
      '*': stand('concierge', mapAt),
    };
    out.spots = spots;
    out.work = mapAt;
    out.animate = (t) => {
      const now = nowAt(spots, t) ?? '*';
      const tracing = now === 'planItinerary' || now === '*';
      menu.visible = now === 'hotelier_banquetMenu';
      tourist.root.visible = brochure.visible = tracing;
      for (const m of [...legs, ...dots]) m.visible = false;
      if (!tracing) return;
      const ph = phaseOf(mapAt);
      const f = pieceFrame(CON.map, CON.stand, 0, heightAt(spots[now]));
      const st = conciergeAt(t, ph);
      // The red line, leg by leg, as far as the finger's gone.
      const [ex, ez] = routeAt(st.traced);
      let done = st.traced <= 0;
      for (let i = 1; i < CON.route.length && !done; i++) {
        const a = CON.route[i - 1];
        let b = CON.route[i];
        const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (Math.abs(Math.hypot(ex - a[0], ez - a[1]) + Math.hypot(ex - b[0], ez - b[1]) - ab) < 1e-4) {
          b = [ex, ez];
          done = true;
        }
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const m = legs[i - 1];
        m.visible = len > 0.001;
        m.position.set(CON.map.x + (a[0] + b[0]) / 2, top + 0.004, CON.map.z + (a[1] + b[1]) / 2);
        m.scale.set(Math.max(0.001, len), 1, 1);
        m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      }
      dots.forEach((d, i) => (d.visible = i / dots.length < st.ringed));
      const h = lobbyHands('concierge', f, t, ph);
      const rest = tourist.arm(null);
      const give = f.o(...CON.give).add(new THREE.Vector3(0, -0.02, 0.08));
      const hand = st.reach > 0 ? tourist.arm(rest.clone().lerp(give, st.reach)) : rest;
      tourist.head.rotation.x = st.brochure === 'rack' ? 0.45 : 0.15;
      if (st.brochure === 'rack') brochure.position.set(rack.x - 0.05, top + 0.07, rack.z - 0.008);
      else brochure.position.copy(st.brochure === 'hand' && h.l ? h.l : hand).add(new THREE.Vector3(0, 0.02, 0));
      brochure.rotation.set(st.brochure === 'rack' ? -0.1 : 0.3, 0, 0);
    };
  },

  /**
   * The bell desk: a walnut podium on a brass kick plate (벨 데스크), a marble top with the pad of
   * numbered claim tags, a service bell and a phone. Tagging a guest's case (tagBag): the tag written,
   * torn off along its perforation, the captain turned to the case stood on their right and down to
   * loop it on its handle, the stub handed to the guest in both hands, a ding of the bell, a bow.
   */
  htlBellDesk(g, _W, _D, _c, _def, _ctx, out) {
    const top = BELL.pad.y - 0.005;
    part(g, rbox(0.62, top - 0.04, 0.4, 0.02), WALNUT, 0, (top - 0.04) / 2, 0.15);
    part(g, rbox(0.65, 0.08, 0.42, 0.02), BRASS, 0, 0.04, 0.15);
    for (const x of [-0.27, 0.27]) part(g, box(0.02, top - 0.2, 0.01), BRASS, x, (top - 0.04) / 2 + 0.04, 0.355, { outline: false });
    label(g, 'BELL DESK', 0.4, 0.07, 0, 0.74, 0.356, WALNUT, GOLD);
    label(g, '벨 데스크', 0.26, 0.055, 0, 0.64, 0.356, WALNUT, '#efe3c8');
    part(g, rbox(0.7, 0.035, 0.48, 0.01), MARBLE, 0, top - 0.0175, 0.14);
    veins(g, 0.7, 0.48, 0, top, 0.14, 13);
    serviceBell(g, BELL.pad.x + BELL.bell[0], top, BELL.pad.z + BELL.bell[2]);
    part(g, rbox(0.1, 0.02, 0.16, 0.004), '#fff3e0', BELL.pad.x, top + 0.01, BELL.pad.z);
    flat(g, painted('htl-tag', 96, 160, paintTag), 0.09, 0.15, BELL.pad.x, top + 0.021, BELL.pad.z);
    deskPhone(g, 0.22, top, -0.02, -0.3);
    handset(g).position.set(0.235, top + 0.075, -0.06);
    // In use: the guest's case on the captain's right, the tag and its stub, the guest, the bell's ring.
    const use = group(g);
    out.inUse = use;
    const hx = BELL.pad.x + BELL.handle[0];
    const hz = BELL.pad.z + BELL.handle[2];
    const caseG = suitcase(use, '#90a4ae');
    caseG.position.set(hx, 0.625, hz);
    caseG.rotation.y = Math.PI / 2;
    const tagTex = painted('htl-tag', 96, 160, paintTag);
    const onCase = group(use, hx + 0.06, 0.55, hz);
    rod(onCase, new THREE.Vector3(-0.06, 0.07, 0), new THREE.Vector3(0, 0.04, 0), 0.0025, '#c62828');
    picture(onCase, tagTex, 0.05, 0.085, 0.005, 0, 0, '#ffffff', Math.PI / 2);
    const tagHand = group(use);
    picture(tagHand, tagTex, 0.05, 0.085, 0, 0, 0);
    const stub = part(use, box(0.045, 0.004, 0.035), '#fff3e0', 0, 0, 0, { outline: false });
    const bizman = guest(use, BUSINESS, 0, 0.88, Math.PI);
    const dingRing = part(use, ring(0.06, 0.003), '#fff59d', BELL.pad.x + BELL.bell[0], top + 0.08, BELL.pad.z + BELL.bell[2], { rx: Math.PI / 2, outline: false, material: glow('#fff59d') });
    const padAt = marker(g, BELL.pad.x, BELL.pad.y, BELL.pad.z);
    const s = standAt(g, BELL.stand.x, BELL.stand.z, 0, 'tagBag', padAt);
    out.spots = { htlTagLuggage: s, '*': s };
    out.work = padAt;
    out.animate = (t) => {
      const ph = phaseOf(padAt);
      const yaw = hotelSpotYaw('tagBag', t, ph);
      s.at.rotation.y = yaw;
      const f = pieceFrame(BELL.pad, BELL.stand, yaw, heightAt(s));
      const st = tagAt(f, t, ph);
      onCase.visible = st.tag === 'case';
      tagHand.visible = st.tag === 'hand';
      if (st.r) tagHand.position.copy(st.r);
      tagHand.rotation.set(0, yaw, 0);
      const rest = bizman.arm(null);
      const give = f.o(...BELL.give).add(new THREE.Vector3(0, -0.02, 0.09));
      const hand = st.reach > 0 ? bizman.arm(rest.clone().lerp(give, st.reach)) : rest;
      stub.visible = st.stub !== 'pad';
      if (st.stub === 'hand' && st.mid) stub.position.copy(st.mid);
      else stub.position.copy(hand).add(new THREE.Vector3(0, 0.01, 0));
      bizman.head.rotation.x = 0.15 + 0.25 * st.reach;
      dingRing.visible = st.ding;
      dingRing.scale.setScalar(1 + 0.5 * ((t * 3) % 1));
    };
  },

  /**
   * The luggage cart: a bellman's birdcage cart — a deck carpeted in red inside a brass rim on four
   * casters, brass arches at both ends joined by the hanging rail (a garment bag on it), a duffel on
   * the deck, the push bar at one end. Taking a guest's bags (wheelCart): the case lifted off the floor
   * onto the deck, the bar taken in both hands and the cart wheeled out across the lobby, swung round
   * and wheeled back, the case set down again — walked, the cart going with them.
   */
  luggageCart(g, _W, _D, _c, _def, _ctx, out) {
    const cartModel = (p: THREE.Object3D) => {
      part(p, rbox(1.1, 0.05, 0.6, 0.02), BRASS, 0, 0.19, 0);
      part(p, rbox(1.04, 0.025, 0.54, 0.01), CARPET_RED, 0, 0.22, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(p, sx * 0.45, sz * 0.22, 0.05);
      for (const x of [-0.52, 0.52]) {
        for (const z of [-0.27, 0.27]) rod(p, new THREE.Vector3(x, 0.2, z), new THREE.Vector3(x, 1.7, z), 0.014, BRASS);
        rod(p, new THREE.Vector3(x, 1.7, -0.27), new THREE.Vector3(x, 1.84, 0), 0.014, BRASS);
        rod(p, new THREE.Vector3(x, 1.7, 0.27), new THREE.Vector3(x, 1.84, 0), 0.014, BRASS);
        part(p, ball(0.03), BRASS, x, 1.86, 0, { outline: false });
      }
      rod(p, new THREE.Vector3(-0.52, 1.8, 0), new THREE.Vector3(0.52, 1.8, 0), 0.013, BRASS);
      for (const z of [-0.2, 0.2]) rod(p, new THREE.Vector3(-0.52, 0.98, z), new THREE.Vector3(-0.62, 0.98, z), 0.012, BRASS);
      rod(p, new THREE.Vector3(-0.62, 0.98, -0.24), new THREE.Vector3(-0.62, 0.98, 0.24), 0.016, BRASS);
      for (const z of [-0.12, 0.12]) part(p, cyl(0.02, 0.02, 0.1, 10), '#212121', -0.62, 0.98, z, { rx: Math.PI / 2, outline: false });
      // The garment bag on its hanger, the duffel on the deck.
      part(p, ring(0.025, 0.004, Math.PI), '#9e9e9e', 0.25, 1.77, 0, { outline: false });
      part(p, rbox(0.46, 0.8, 0.1, 0.04), '#283593', 0.25, 1.32, 0);
      part(p, box(0.012, 0.74, 0.104), '#9fa8da', 0.25, 1.32, 0, { outline: false });
      part(p, rbox(0.42, 0.22, 0.26, 0.09), '#5d4037', 0.28, 0.345, 0.02);
      part(p, box(0.2, 0.02, 0.27), '#3e2723', 0.28, 0.46, 0.02, { outline: false });
    };
    const idle = group(g);
    out.idle = idle;
    cartModel(idle);
    const use = group(g);
    out.inUse = use;
    const rig = group(use);
    cartModel(rig);
    const caseG = suitcase(rig, '#7fa7b7');
    caseG.rotation.y = Math.PI / 2;
    const work = marker(g, -0.62, 0.98, 0);
    const s = standAt(rig, CART.stand.x, CART.stand.z, Math.PI / 2, 'wheelCart', work);
    out.spots = { deliverLuggage: s, '*': s };
    out.work = work;
    out.animate = (t) => {
      const ph = phaseOf(work);
      const f = pieceFrame(new THREE.Vector3(), CART.stand, Math.PI / 2, heightAt(s));
      const st = cartAt(f, t, ph);
      rig.position.x = st.x;
      rig.rotation.y = st.turn;
      caseG.position.copy(st.handle);
    };
  },

  /**
   * The hotel bed: a king on a dark plinth under a tall channel-tufted headboard with a brass reading
   * light either side, four pillows and a plum bolster, a white duvet draped over its sides, the plum
   * runner across its foot with a pair of towel swans on it, a chocolate before the pillows. Making the
   * room up (makeBed): at the foot, the duvet (left in a heap) taken by its edge, snapped up and out
   * over the bed so it billows down flat, smoothed with both hands, its foot tucked in crouched down;
   * walked round to the side, the pillow lifted, plumped against the chest and set back, a chocolate
   * put before it; walked back round to the foot and the swans set on the runner, a look over it all.
   */
  hotelBed(g, _W, _D, _c, _def, _ctx, out) {
    const top = BED.top;
    part(g, rbox(1.86, 0.28, 1.92, 0.03), '#3e2723', 0, 0.16, 0.02);
    part(g, rbox(1.8, 0.28, 1.86, 0.08), '#ffffff', 0, top - 0.14, 0.04);
    // The headboard, its channels, the lights either side.
    part(g, rbox(2.0, 1.25, 0.1, 0.04), TAUPE, 0, 1.0, -0.95);
    for (let i = 0; i < 9; i++) part(g, box(0.012, 1.15, 0.01), shade(TAUPE, 0.8), -0.88 + i * 0.22, 1.0, -0.897, { outline: false });
    for (const sx of [-1, 1]) {
      rod(g, new THREE.Vector3(sx * 0.86, 1.5, -0.89), new THREE.Vector3(sx * 0.86, 1.5, -0.78), 0.008, BRASS);
      part(g, new THREE.CylinderGeometry(0.035, 0.06, 0.09, 16, 1, true), BRASS, sx * 0.86, 1.47, -0.76).userData.ownGeometry = true;
      glowing(g, cyl(0.05, 0.05, 0.005, 14), '#fff3c4', sx * 0.86, 1.43, -0.76);
    }
    // The back pillows, the left sleeping pillow, the bolster (the right pillow's drawn made or being made).
    for (const sx of [-1, 1]) part(g, rbox(0.72, 0.44, 0.14, 0.06), '#ffffff', sx * 0.45, top + 0.24, -0.82, { rx: -0.22 });
    part(g, rbox(0.62, 0.36, 0.14, 0.06), '#fdfdfb', -0.45, top + 0.16, -0.62, { rx: -0.38 });
    part(g, cyl(0.08, 0.08, 0.6, 16), PLUM, 0, top + 0.13, -0.47, { rz: Math.PI / 2 });

    /** The duvet over the mattress, shaped each time it's told how made the bed is. */
    const duvet = (parent: THREE.Object3D) => {
      const geom = new THREE.PlaneGeometry(2.04, 1.62, 22, 18).rotateX(-Math.PI / 2).translate(0, 0, 0.2);
      const base = (geom.attributes.position.array as Float32Array).slice();
      const mesh = new THREE.Mesh(geom, new THREE.MeshToonMaterial({ color: LINEN_W, side: THREE.DoubleSide }));
      mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      const pos = geom.attributes.position;
      const shape = (st: { spread: number; lift: number; billow: number; creased: number; tucked: number }, t: number) => {
        const q = 1 - st.spread;
        for (let i = 0; i < pos.count; i++) {
          const bx = base[i * 3];
          const bz = base[i * 3 + 2];
          const zN = (bz + 0.61) / 1.62;
          let x = bx;
          let z = bz;
          let y = top + 0.05;
          const d = Math.abs(x) - 0.91;
          if (d > 0) {
            x = Math.sign(x) * 0.93;
            y -= d * 1.9;
          }
          const dz = z - 0.95;
          if (dz > 0) {
            z = 0.97 - dz * 0.7 * st.tucked;
            y -= dz * 2.4;
          }
          y += 0.018 * st.creased * Math.sin(bx * 11 + bz * 3) * Math.sin(bz * 9);
          if (q > 0) {
            z += (0.55 + zN * 0.4 - z) * q;
            x *= 1 - 0.12 * q;
            y += q * (0.04 + 0.12 * (0.5 + 0.5 * Math.sin(bx * 6 + bz * 13)) * (0.5 + 0.5 * Math.sin(bz * 7 + 1)));
          }
          const tip = zN ** 3;
          y += st.lift * tip;
          z -= st.lift * 0.3 * tip;
          y += st.billow * Math.sin(Math.PI * zN) * (0.6 + 0.4 * Math.sin(t * 7 - zN * 6));
          pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;
        geom.computeVertexNormals();
      };
      return shape;
    };
    const runner = (parent: THREE.Object3D) => {
      part(parent, box(1.86, 0.012, 0.42), PLUM, 0, top + 0.062, 0.62, { outline: false });
      for (const sx of [-1, 1]) part(parent, box(0.012, 0.22, 0.42), PLUM, sx * 0.935, top - 0.05, 0.62, { outline: false });
      part(parent, box(1.86, 0.014, 0.03), GOLD, 0, top + 0.063, 0.43, { outline: false });
    };
    const towelSwans = (parent: THREE.Object3D) => {
      const sw = group(parent);
      for (const sx of [-1, 1]) {
        const b = group(sw, sx * 0.1, 0, 0, sx * 0.35);
        part(b, ball(0.09), '#ffffff', 0, 0.05, 0).scale.set(0.8, 0.55, 1.25);
        for (let i = 0; i < 5; i++) {
          const k = i / 4;
          part(b, ball(0.028 - 0.004 * k), '#ffffff', -sx * 0.02 * Math.sin(k * 3), 0.08 + 0.17 * k, 0.07 + 0.03 * Math.sin(k * Math.PI), { outline: false });
        }
        part(b, ball(0.03), '#ffffff', -sx * 0.005, 0.27, 0.11);
        part(b, new THREE.ConeGeometry(0.012, 0.04, 8), '#ff8f00', -sx * 0.005, 0.265, 0.15, { rx: Math.PI / 2, outline: false });
      }
      return sw;
    };
    const pillowAt = (parent: THREE.Object3D) => part(parent, rbox(0.62, 0.36, 0.14, 0.06), '#fdfdfb', 0.45, top + 0.16, -0.62, { rx: -0.38 });
    const chocolate = (parent: THREE.Object3D) => {
      const c = group(parent);
      part(c, box(0.06, 0.014, 0.05), GOLD, 0, 0.007, 0);
      part(c, box(0.062, 0.015, 0.012), '#7f1d1d', 0, 0.007, 0, { outline: false });
      return c;
    };
    const CHOC = new THREE.Vector3(0.5, top + 0.065, -0.45);
    const SWAN = new THREE.Vector3(0, top + 0.07, 0.66);
    // Made (as it's left).
    const idle = group(g);
    out.idle = idle;
    duvet(idle)({ spread: 1, lift: 0, billow: 0, creased: 0, tucked: 1 }, 0);
    runner(idle);
    pillowAt(idle);
    towelSwans(idle).position.copy(SWAN);
    chocolate(idle).position.copy(CHOC);
    // Being made.
    const use = group(g);
    out.inUse = use;
    const shape = duvet(use);
    const run = group(use);
    runner(run);
    const pillow = pillowAt(use);
    const swans = towelSwans(use);
    const choc = chocolate(use);
    const work = marker(g, 0, top, 0);
    const s = standAt(g, BED.foot.x, BED.foot.z, BED.foot.yaw, 'makeBed', work);
    out.spots = { makeUpRoom: s, '*': s };
    out.work = work;
    out.animate = (t) => {
      const ph = phaseOf(work);
      const st = bedAt(t, ph);
      s.at.position.set(st.spot.x, 0, st.spot.z);
      s.at.rotation.y = st.spot.yaw;
      shape(st, t);
      const h = bedHands(pieceFrame(new THREE.Vector3(0, top, 0), st.spot, st.spot.yaw, heightAt(s)), t, ph);
      const mid = h.l && h.r ? h.l.clone().lerp(h.r, 0.5) : null;
      if (st.pillow === 'hand' && mid) {
        pillow.position.copy(mid);
        pillow.rotation.set(0, st.spot.yaw, 0);
      } else if (st.pillow === 'askew') {
        pillow.position.set(0.3, top + 0.12, -0.42);
        pillow.rotation.set(-1.35, 0.5, 0.3);
      } else {
        pillow.position.set(0.45, top + 0.16, -0.62);
        pillow.rotation.set(-0.38, 0, 0);
      }
      choc.visible = st.choco !== 'none';
      if (st.choco === 'hand' && h.r) choc.position.copy(h.r).add(new THREE.Vector3(0, -0.015, 0));
      else choc.position.copy(CHOC);
      run.visible = st.creased === 0 && st.tucked >= 1;
      swans.visible = st.swan !== 'none';
      if (st.swan === 'hand' && mid) swans.position.copy(mid).add(new THREE.Vector3(0, -0.06, 0));
      else swans.position.copy(SWAN);
    };
  },

  /**
   * The minibar: a walnut console with a glass-doored fridge lit inside (생수, 맥주, 콜라 on the top
   * shelf, juices below), a drawer with its brass pull; on top, a capsule coffee machine, a kettle,
   * cups on saucers, a snack tray and the price card (미니바); tumblers and wine glasses on a shelf on
   * the wall above. Restocking it (restock): crouched to it, the door swung open with the left hand
   * and held, a drink taken from the restock caddy on the floor and stood in its place, three times
   * over; the door shut, the card ticked off, the snack tray set straight.
   */
  minibar(g, _W, _D, _c, _def, _ctx, out) {
    const topY = 0.82;
    // The carcass: a solid cupboard on the right, the fridge's open box on the left.
    part(g, rbox(0.46, topY, 0.5, 0.015), WALNUT, 0.23, topY / 2, -0.23);
    part(g, box(0.02, topY, 0.5), WALNUT, -0.45, topY / 2, -0.23);
    part(g, box(0.44, 0.06, 0.5), WALNUT, -0.23, 0.03, -0.23);
    part(g, box(0.44, 0.2, 0.5), WALNUT, -0.23, topY - 0.1, -0.23);
    part(g, rbox(0.94, 0.03, 0.52, 0.01), shade(WALNUT, 1.15), 0, topY + 0.015, -0.23);
    // Inside the fridge: lit, two wire shelves, juices on the lower.
    part(g, box(0.42, 0.56, 0.01), '#e3f2fd', -0.23, 0.34, -0.46, { outline: false, material: glow('#e8f4fd') });
    for (const y of [0.2, 0.4]) part(g, box(0.42, 0.01, 0.42), CHROME, -0.23, y, -0.24, { outline: false });
    const drink = (p: THREE.Object3D, kind: number) => {
      const d = group(p);
      if (kind === 0) {
        glass(d, cyl(0.025, 0.025, 0.14, 12), 0, 0.07, 0);
        part(d, cyl(0.022, 0.022, 0.1, 12), '#b3e5fc', 0, 0.055, 0, { outline: false });
        part(d, cyl(0.012, 0.012, 0.02, 10), '#1565c0', 0, 0.15, 0, { outline: false });
        part(d, box(0.051, 0.03, 0.051), '#1565c0', 0, 0.08, 0, { outline: false });
      } else {
        part(d, cyl(0.028, 0.028, 0.12, 14), kind === 1 ? '#2e7d32' : '#c62828', 0, 0.06, 0);
        part(d, cyl(0.022, 0.028, 0.012, 14), CHROME, 0, 0.126, 0, { outline: false });
        part(d, box(0.04, 0.03, 0.057), kind === 1 ? '#ffd54f' : '#ffffff', 0, 0.07, 0, { outline: false });
      }
      return d;
    };
    for (const [i, col] of ['#ff9800', '#fdd835', '#8bc34a'].entries()) {
      glass(g, cyl(0.03, 0.03, 0.15, 12), -0.36 + i * 0.12, 0.28, -0.25);
      part(g, cyl(0.027, 0.027, 0.11, 12), col, -0.36 + i * 0.12, 0.265, -0.25, { outline: false });
    }
    const slot = (i: number) => new THREE.Vector3(MINI.shelf.x + MINI.slots[i][0], 0.405, MINI.shelf.z + MINI.slots[i][2]);
    // The cupboard: the drawer, the door below, their pulls; the label.
    part(g, rbox(0.42, 0.24, 0.015, 0.006), WALNUT_L, 0.23, 0.62, 0.025);
    part(g, rbox(0.42, 0.44, 0.015, 0.006), WALNUT_L, 0.23, 0.25, 0.025);
    part(g, box(0.12, 0.014, 0.02), BRASS, 0.23, 0.66, 0.04, { outline: false });
    part(g, box(0.014, 0.12, 0.02), BRASS, 0.08, 0.3, 0.04, { outline: false });
    label(g, 'MINI BAR', 0.16, 0.035, 0.23, 0.58, 0.034, WALNUT_L, GOLD);
    // On top: the coffee machine, the kettle, two cups, the tea box, the snack tray, the price card.
    part(g, rbox(0.14, 0.24, 0.24, 0.03), '#212121', -0.33, topY + 0.15, -0.3);
    part(g, box(0.08, 0.02, 0.08), CHROME, -0.33, topY + 0.04, -0.2, { outline: false });
    part(g, cyl(0.055, 0.065, 0.18, 16), '#eceff1', -0.12, topY + 0.12, -0.33);
    part(g, rbox(0.03, 0.12, 0.03, 0.01), '#212121', -0.06, topY + 0.13, -0.33);
    for (const [x, z] of [[-0.14, -0.14], [-0.04, -0.12]]) {
      part(g, cyl(0.045, 0.04, 0.008, 16), '#ffffff', x, topY + 0.035, z, { outline: false });
      part(g, cyl(0.032, 0.026, 0.06, 14), '#ffffff', x, topY + 0.07, z);
    }
    part(g, rbox(0.16, 0.06, 0.08, 0.01), '#6d4c41', 0.06, topY + 0.06, -0.38);
    const trayAt = new THREE.Vector3(MINI.shelf.x + MINI.tray[0], topY + 0.03, MINI.shelf.z + MINI.tray[2]);
    part(g, rbox(0.26, 0.02, 0.15, 0.008), WALNUT_L, trayAt.x, trayAt.y + 0.01, trayAt.z);
    part(g, rbox(0.08, 0.1, 0.03, 0.01), '#ff7043', trayAt.x - 0.07, trayAt.y + 0.07, trayAt.z, { rx: -0.2 });
    glass(g, cyl(0.03, 0.03, 0.07, 12), trayAt.x + 0.02, trayAt.y + 0.055, trayAt.z);
    part(g, cyl(0.026, 0.026, 0.04, 12), '#a1887f', trayAt.x + 0.02, trayAt.y + 0.04, trayAt.z, { outline: false });
    part(g, rbox(0.04, 0.012, 0.11, 0.004), '#5d4037', trayAt.x + 0.09, trayAt.y + 0.026, trayAt.z, { ry: 0.3 });
    const cardAtV = new THREE.Vector3(MINI.shelf.x + MINI.card[0], topY + 0.032, MINI.shelf.z + MINI.card[2]);
    flat(g, painted('htl-rates', 160, 200, paintRates), 0.1, 0.125, cardAtV.x, cardAtV.y, cardAtV.z, 0.15);
    // The glass shelf on the wall above.
    part(g, rbox(0.7, 0.025, 0.16, 0.008), WALNUT, 0, 1.25, -0.42);
    for (let i = 0; i < 4; i++) glass(g, cyl(0.03, 0.026, 0.09, 12), -0.25 + i * 0.1, 1.31, -0.42);
    for (let i = 0; i < 2; i++) {
      glass(g, new THREE.SphereGeometry(0.035, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0.17 + i * 0.1, 1.41, -0.42, undefined, Math.PI);
      part(g, cyl(0.004, 0.004, 0.1, 6), '#e0f2f1', 0.17 + i * 0.1, 1.31, -0.42, { outline: false });
    }
    /** The fridge's glass door, hung on its left. */
    const door = (parent: THREE.Object3D) => {
      const d = group(parent, MINI.hinge.x, 0, MINI.hinge.z);
      const w = MINI.door;
      for (const [x, y, bw, bh] of [[w / 2, 0.075, w, 0.03], [w / 2, 0.595, w, 0.03], [0.012, 0.335, 0.024, 0.55], [w - 0.012, 0.335, 0.024, 0.55]] as const) part(d, box(bw, bh, 0.03), '#263238', x, y, 0.0);
      glass(d, box(w - 0.04, 0.5, 0.006), w / 2, 0.335, 0);
      part(d, box(0.012, 0.18, 0.02), CHROME, w - 0.04, MINI.handleY, 0.03);
      return d;
    };
    const idle = group(g);
    out.idle = idle;
    door(idle);
    for (let i = 0; i < 3; i++) drink(idle, i).position.copy(slot(i));
    const use = group(g);
    out.inUse = use;
    const swing = door(use);
    const placed = [0, 1, 2].map((i) => drink(use, i));
    const inHand = [0, 1, 2].map((i) => drink(use, i));
    // The restock caddy on the floor beside them.
    const caddy = group(use, 0.42, 0, 0.45);
    part(caddy, box(0.3, 0.012, 0.24), '#546e7a', 0, 0.006, 0);
    for (const [x, z, w, d] of [[0, 0.115, 0.3, 0.01], [0, -0.115, 0.3, 0.01], [0.145, 0, 0.01, 0.24], [-0.145, 0, 0.01, 0.24]] as const) part(caddy, box(w, 0.22, d), '#78909c', x, 0.11, z);
    for (let i = 0; i < 6; i++) drink(caddy, i % 3).position.set(-0.09 + (i % 3) * 0.09, 0.012, i < 3 ? -0.05 : 0.05);
    const shelf = marker(g, MINI.shelf.x, MINI.shelf.y, MINI.shelf.z);
    const s = standAt(g, MINI.stand.x, MINI.stand.z, Math.PI, 'restock', shelf);
    out.spots = { restockMinibar: s, '*': s };
    out.work = shelf;
    out.animate = (t) => {
      const ph = phaseOf(shelf);
      const st = minibarAt(t, ph);
      swing.rotation.y = -st.door;
      placed.forEach((d, i) => {
        d.visible = i < st.placed;
        d.position.copy(slot(i));
      });
      const h = minibarHands(pieceFrame(MINI.shelf, MINI.stand, Math.PI, heightAt(s)), t, ph);
      inHand.forEach((d, i) => {
        d.visible = st.held === i && !!h.r;
        if (d.visible) d.position.copy(h.r!).add(new THREE.Vector3(0, -0.07, 0));
      });
    };
  },

  /**
   * The linen shelf: chrome wire shelving — folded sheets and pillowcases, white towels and bath
   * towels, grey blankets on top, rolls and amenity boxes in bins on the bottom, each shelf's lip
   * labelled (시트, 수건, 담요) — with a laminate folding ledge pulled out at waist height. Folding the
   * linen (foldLinen): a towel taken from the laundry basket beside it, shaken out held up by two
   * corners, laid on the ledge, folded in half and in four, put on the towel stack and patted flat.
   * Shared with the care home's linen room; anything else there is written up on a clipboard.
   */
  linenShelf(g, _W, _D, _c, _def, _ctx, out) {
    for (const x of [-0.43, 0.43]) for (const z of [-0.45, -0.03]) part(g, cyl(0.012, 0.012, 1.85, 8), CHROME, x, 0.925, z, { outline: false });
    const levels = [0.15, 0.55, 1.12, 1.6];
    for (const y of levels) {
      part(g, rbox(0.9, 0.02, 0.44, 0.005), CHROME, 0, y, -0.24);
      for (let i = 0; i < 8; i++) part(g, box(0.004, 0.022, 0.42), '#b0bec5', -0.4 + i * 0.115, y + 0.001, -0.24, { outline: false });
    }
    // The ledge and its brackets.
    part(g, rbox(0.86, 0.025, 0.42, 0.008), '#e6dccd', 0, LINEN.ledge.y - 0.0125, 0.19);
    for (const x of [-0.38, 0.38]) rod(g, new THREE.Vector3(x, LINEN.ledge.y - 0.25, -0.03), new THREE.Vector3(x, LINEN.ledge.y - 0.03, 0.34), 0.008, CHROME);
    // What's on the shelves.
    towelStack(g, -0.22, 0.56, -0.24, 4, 0.36, 0.3, '#ffffff');
    towelStack(g, 0.2, 0.56, -0.24, 5, 0.3, 0.22, '#f5f5f5');
    towelStack(g, LINEN.ledge.x + LINEN.stack[0], 1.13, LINEN.ledge.z + LINEN.stack[2], 4, 0.28, 0.21);
    towelStack(g, 0.2, 1.13, -0.24, 3, 0.36, 0.28, '#ffffff');
    towelStack(g, -0.2, 1.61, -0.24, 3, 0.38, 0.32, '#90a4ae');
    towelStack(g, 0.22, 1.61, -0.24, 2, 0.38, 0.32, '#b0bec5');
    for (const x of [-0.22, 0.22]) {
      part(g, rbox(0.38, 0.22, 0.36, 0.02), '#cfd8dc', x, 0.27, -0.24);
      for (let i = 0; i < 3; i++) part(g, cyl(0.045, 0.045, 0.09, 12), '#ffffff', x - 0.1 + i * 0.1, 0.42, -0.24);
    }
    for (const [x, y, s] of [[-0.22, 0.55, '시트'], [0.2, 0.55, '베개 커버'], [-0.25, 1.12, '수건'], [0.2, 1.12, '바스 타월'], [0, 1.6, '담요']] as Array<[number, number, string]>) label(g, s, 0.18, 0.035, x, y - 0.025, -0.015, '#ffffff', '#37474f');
    // In use: the laundry basket beside it, the towel being folded, the clipboard for anything else.
    const use = group(g);
    out.inUse = use;
    const basket = group(use, 0.62, 0, 0.42);
    part(basket, cyl(0.2, 0.17, 0.58, 18, ), '#d7ccc8', 0, 0.29, 0);
    const br = seeded(17);
    for (let i = 0; i < 7; i++) part(basket, ball(0.07), '#ffffff', -0.1 + br() * 0.2, 0.58 + br() * 0.05, -0.1 + br() * 0.2, { outline: false }).scale.set(1.2, 0.6, 1);
    const towel = towelRig(use, LINEN.ledge);
    const clip = group(use, 0.15, LINEN.ledge.y, 0.2);
    part(clip, rbox(0.23, 0.01, 0.31, 0.006), '#8d6e63', 0, 0.005, 0, { ry: 0.1 });
    part(clip, box(0.2, 0.004, 0.27), '#ffffff', 0, 0.012, 0.01, { ry: 0.1, outline: false });
    const ledgeAt = marker(g, LINEN.ledge.x, LINEN.ledge.y, LINEN.ledge.z);
    const clipAt = marker(g, 0.15, LINEN.ledge.y + 0.02, 0.21);
    const spots: Record<string, Spot> = {
      foldLinens: standAt(g, LINEN.stand.x, LINEN.stand.z, Math.PI, 'foldLinen', ledgeAt),
      '*': standAt(g, LINEN.stand.x, LINEN.stand.z, Math.PI, 'write', clipAt),
    };
    out.spots = spots;
    out.work = ledgeAt;
    const stackTop = new THREE.Vector3(LINEN.ledge.x + LINEN.stack[0], LINEN.ledge.y + LINEN.stack[1], LINEN.ledge.z + LINEN.stack[2]);
    out.animate = (t) => {
      const now = nowAt(spots, t) ?? '*';
      const folding = now !== '*';
      clip.visible = !folding;
      basket.visible = folding;
      const st = towelAt(false, pieceFrame(LINEN.ledge, LINEN.stand, Math.PI, heightAt(spots[now])), t, phaseOf(ledgeAt));
      towel.show(folding ? st : { ...st, show: 'bin' }, stackTop, t);
    };
  },

  /**
   * The elevator hall: two cars behind brushed steel doors in steel surrounds, set in a stone wall,
   * each with its floor shown in amber above (an arrow lit going up), the brass call plate between
   * them under the floor directory, ELEVATOR over all. Showing a guest to the lift (escort): the call
   * button pressed, waited at with the hands folded as the floors count down, the doors opening on the
   * lit car, the guest shown in with an open hand — a businessman with his case, who steps in — and a
   * bow as the doors close.
   */
  htlElevatorBank(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(2.0, 2.8, 0.1, 0.01), '#d7ccc8', 0, 1.4, -0.45);
    for (let i = 0; i < 5; i++) part(g, box(2.0, 0.006, 0.004), '#bcaaa4', 0, 0.55 * (i + 1), -0.398, { outline: false });
    const cars = [-0.52, 0.52];
    for (const c of cars) {
      for (const sx of [-1, 1]) part(g, rbox(0.07, 2.24, 0.06, 0.01), STEEL, c + sx * 0.43, 1.12, -0.37);
      part(g, rbox(0.93, 0.08, 0.06, 0.01), STEEL, c, 2.26, -0.37);
      // The car inside: lit walls, a mirror, the rail.
      part(g, box(0.8, 2.18, 0.01), '#f3e3c3', c, 1.09, -0.395, { outline: false, material: glow('#f6e7c8') });
      part(g, box(0.5, 1.1, 0.004), '#cfe3ec', c, 1.45, -0.389, { outline: false });
      rod(g, new THREE.Vector3(c - 0.3, 0.92, -0.385), new THREE.Vector3(c + 0.3, 0.92, -0.385), 0.01, BRASS);
      part(g, box(0.8, 0.01, 0.04), '#8d6e63', c, 0.005, -0.38, { outline: false });
      part(g, rbox(0.24, 0.12, 0.03, 0.008), '#0d0d0d', c, 2.44, -0.39);
    }
    // Car B, shut, at the 3rd floor.
    for (const sx of [-1, 1]) {
      part(g, box(0.39, 2.16, 0.02), '#b0bec5', cars[1] + sx * 0.197, 1.08, -0.37);
    }
    picture(g, floorTex(3, false), 0.2, 0.1, cars[1], 2.44, -0.374);
    // The call plate, the directory, the sign.
    part(g, rbox(0.1, 0.22, 0.015, 0.006), BRASS, 0, LIFT.button.y, -0.393);
    part(g, ball(0.016), '#fff8e1', 0, LIFT.button.y + 0.04, -0.385, { outline: false });
    part(g, ball(0.016), '#fff8e1', 0, LIFT.button.y - 0.04, -0.385, { outline: false });
    picture(g, painted('htl-dir', 160, 240, paintDirectory), 0.14, 0.21, 0, 1.6, -0.393);
    label(g, 'ELEVATOR  엘리베이터', 0.9, 0.08, 0, 2.66, -0.395, '#d7ccc8', '#5d4037');
    /** Car A's doors, opened by `k` (0–1): each leaf folds back into its side. */
    const doors = (parent: THREE.Object3D) => {
      const leaves = [-1, 1].map((sx) => {
        const leaf = group(parent, cars[0] + sx * 0.39, 0, -0.37);
        part(leaf, box(0.39, 2.16, 0.02), '#b0bec5', -sx * 0.195, 1.08, 0);
        part(leaf, box(0.004, 2.1, 0.022), '#90a4ae', -sx * 0.385, 1.08, 0, { outline: false });
        return leaf;
      });
      return (k: number) => leaves.forEach((l) => (l.scale.x = Math.max(0.06, 1 - 0.94 * k)));
    };
    const idle = group(g);
    out.idle = idle;
    doors(idle)(0);
    picture(idle, floorTex(1, false), 0.2, 0.1, cars[0], 2.44, -0.374);
    const use = group(g);
    out.inUse = use;
    const open = doors(use);
    const floorShown = picture(use, floorTex(7, false), 0.2, 0.1, cars[0], 2.44, -0.374);
    const upLit = glowing(use, ball(0.017), '#ffb300', 0, LIFT.button.y + 0.04, -0.384);
    const bizman = guest(use, BUSINESS, cars[0], 0.7, Math.PI);
    const roller = suitcase(bizman.root, '#455a64', 0.85);
    roller.position.set(-0.3, 0.55, 0.05);
    const button = marker(g, LIFT.button.x, LIFT.button.y, LIFT.button.z);
    const s = standAt(g, LIFT.stand.x, LIFT.stand.z, LIFT.stand.yaw, 'escort', button);
    out.spots = { htlEscortGuest: s, '*': s };
    out.work = button;
    out.animate = (t) => {
      const st = liftAt(t, phaseOf(button));
      open(st.open);
      (floorShown.material as THREE.MeshBasicMaterial).map = floorTex(st.floor, st.open > 0.5);
      upLit.visible = st.guest !== null && st.open < 0.05;
      bizman.root.visible = st.guest !== null;
      if (st.guest !== null) bizman.root.position.z = st.guest;
    };
  },

  /**
   * The lobby's centrepiece: a round marble table on a fluted walnut column and brass plinth, a wide
   * stone bowl of white and blush peonies, hydrangea, trailing phalaenopsis and cherry-blossom branches
   * reaching up, a little welcome card; over it, a crystal chandelier of two tiers of candle lights
   * hung with drops, on its chain from the ceiling.
   */
  htlCenterpiece(g) {
    part(g, cyl(0.42, 0.46, 0.06, 32), BRASS, 0, 0.03, 0);
    part(g, cyl(0.2, 0.26, 0.7, 24), WALNUT, 0, 0.41, 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      part(g, box(0.02, 0.66, 0.02), shade(WALNUT, 1.2), Math.sin(a) * 0.225, 0.41, Math.cos(a) * 0.225, { ry: a, outline: false });
    }
    part(g, cyl(0.66, 0.66, 0.05, 40), MARBLE, 0, 0.785, 0);
    part(g, cyl(0.665, 0.665, 0.012, 40), BRASS, 0, 0.756, 0, { outline: false });
    const r = seeded(23);
    for (let i = 0; i < 6; i++) part(g, box(0.25 + r() * 0.4, 0.001, 0.004), MARBLE_V, -0.3 + r() * 0.6, 0.811, -0.3 + r() * 0.6, { ry: r() * 3, outline: false });
    // The bowl and the flowers.
    part(g, cyl(0.24, 0.15, 0.22, 24), '#e0d8cc', 0, 0.92, 0);
    part(g, cyl(0.23, 0.23, 0.02, 24), '#5d4037', 0, 1.02, 0, { outline: false });
    const blooms = ['#ffffff', '#fce4ec', '#f8bbd0', '#ffffff', '#fff3e0', '#f48fb1'];
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.08 + r() * 0.24;
      const y = 1.08 + (0.32 - d) * 0.5 + r() * 0.06;
      part(g, ball(0.045 + r() * 0.03), blooms[i % blooms.length], Math.cos(a) * d, y, Math.sin(a) * d, { outline: false });
    }
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.2 + r() * 0.12;
      part(g, ball(0.05), '#558b2f', Math.cos(a) * d, 1.06 + r() * 0.05, Math.sin(a) * d, { outline: false }).scale.set(1.4, 0.4, 0.8);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      part(g, ball(0.06), '#c5cae9', Math.cos(a) * 0.17, 1.1, Math.sin(a) * 0.17, { outline: false });
    }
    // Orchid sprays arching out and down; blossom branches up.
    for (let s = 0; s < 3; s++) {
      const a = (s / 3) * Math.PI * 2 + 1;
      for (let k = 0; k < 6; k++) {
        const u = k / 5;
        part(g, ball(0.022), '#ffffff', Math.cos(a) * (0.22 + 0.2 * u), 1.18 + 0.05 * Math.sin(u * Math.PI) - 0.15 * u * u, Math.sin(a) * (0.22 + 0.2 * u), { outline: false }).scale.set(1, 0.6, 1);
      }
    }
    for (let b = 0; b < 5; b++) {
      const a = (b / 5) * Math.PI * 2 + r();
      const tip = new THREE.Vector3(Math.cos(a) * (0.25 + r() * 0.15), 1.75 + r() * 0.25, Math.sin(a) * (0.25 + r() * 0.15));
      rod(g, new THREE.Vector3(Math.cos(a) * 0.05, 1.05, Math.sin(a) * 0.05), tip, 0.008, '#4e342e');
      for (let k = 0; k < 7; k++) {
        const u = 0.35 + 0.65 * (k / 6);
        part(g, ball(0.02 + r() * 0.012), r() < 0.6 ? '#f8bbd0' : '#fce4ec', tip.x * u + (r() - 0.5) * 0.06, 1.05 + (tip.y - 1.05) * u, tip.z * u + (r() - 0.5) * 0.06, { outline: false });
      }
    }
    const card = group(g, 0, 0.81, 0.48);
    part(card, box(0.16, 0.1, 0.004), '#fffaf0', 0, 0.05, 0, { rx: -0.25 });
    label(card, '환영합니다', 0.14, 0.03, 0, 0.06, 0.004, '#fffaf0', '#8d6e63').rotation.x = -0.25;
    // The chandelier: the chain, the column, two tiers of lights, the drops.
    const C = 2.55;
    rod(g, new THREE.Vector3(0, C + 0.1, 0), new THREE.Vector3(0, 3.0, 0), 0.008, BRASS);
    part(g, cyl(0.1, 0.1, 0.03, 18), BRASS, 0, 2.99, 0);
    part(g, cyl(0.03, 0.05, 0.4, 12), BRASS, 0, C - 0.05, 0);
    part(g, ball(0.06), BRASS, 0, C - 0.27, 0);
    const crystal = new THREE.MeshToonMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.75 });
    for (const [rad, y, n] of [[0.48, C - 0.18, 10], [0.28, C + 0.05, 6]] as const) {
      part(g, ring(rad, 0.012), BRASS, 0, y, 0, { rx: Math.PI / 2, outline: false });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = Math.cos(a) * rad;
        const z = Math.sin(a) * rad;
        rod(g, new THREE.Vector3(0, y - 0.05, 0), new THREE.Vector3(x, y, z), 0.007, BRASS);
        part(g, cyl(0.026, 0.02, 0.03, 10), BRASS, x, y + 0.02, z, { outline: false });
        part(g, cyl(0.011, 0.011, 0.07, 8), '#fffdf5', x, y + 0.07, z, { outline: false });
        glowing(g, ball(0.022), '#fff3c4', x, y + 0.12, z);
        for (const k of [0.33, 0.66]) {
          const xa = Math.cos(a + (k * Math.PI * 2) / n) * rad;
          const za = Math.sin(a + (k * Math.PI * 2) / n) * rad;
          part(g, new THREE.OctahedronGeometry(0.018), '#e8f6ff', xa, y - 0.06, za, { outline: false, material: crystal }).scale.set(1, 1.8, 1);
        }
      }
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(g, new THREE.OctahedronGeometry(0.02), '#e8f6ff', Math.cos(a) * 0.14, C - 0.36 - (i % 2) * 0.05, Math.sin(a) * 0.14, { outline: false, material: crystal }).scale.set(1, 2, 1);
    }
    part(g, new THREE.OctahedronGeometry(0.04), '#e8f6ff', 0, C - 0.42, 0, { outline: false, material: crystal }).scale.set(1, 2, 1);
  },

  /**
   * The lobby lounge's sofa: aubergine velvet, a channel-tufted back, round bolsters, a gold and a sage
   * cushion, brass feet, a walnut tray on its right arm. Guests wait on it. A welcome tea's brought them
   * on a silver tray (welcomeTea): offered with a slight bow, the cup set on the arm's tray beside a
   * plate of 약과, talked through their stay, a bow; a complaint's heard out stood before it, noted down.
   */
  htlLoungeSofa(g, W, _D, _c, _def, _ctx, out) {
    for (const sx of [-1, 1]) for (const z of [-0.33, 0.28]) part(g, cyl(0.022, 0.012, 0.12, 8), BRASS, sx * (W / 2 - 0.1), 0.06, z, { outline: false });
    part(g, rbox(W - 0.06, 0.18, 0.76, 0.04), PLUM, 0, 0.21, -0.03);
    for (const x of [-0.41, 0.41]) part(g, rbox(0.8, 0.13, 0.62, 0.05), shade(PLUM, 1.08), x, 0.365, 0.02);
    part(g, rbox(W - 0.06, 0.5, 0.18, 0.06), PLUM, 0, 0.62, -0.34, { rx: -0.12 });
    for (let i = 0; i < 9; i++) part(g, box(0.012, 0.42, 0.01), shade(PLUM, 0.75), -0.8 + i * 0.2, 0.63, -0.245, { rx: -0.12, outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.18, 0.34, 0.76, 0.05), PLUM, sx * 0.9, 0.47, -0.03);
      part(g, cyl(0.075, 0.075, 0.42, 16), shade(PLUM, 1.15), sx * 0.73, 0.5, -0.12, { rx: Math.PI / 2 });
    }
    part(g, rbox(0.34, 0.3, 0.1, 0.05), GOLD, -0.45, 0.6, -0.2, { rx: -0.25, rz: 0.1 });
    part(g, rbox(0.34, 0.3, 0.1, 0.05), '#a5c49a', 0.45, 0.6, -0.2, { rx: -0.25, rz: -0.1 });
    const armTray = new THREE.Vector3(0.88, 0.655, 0.05);
    part(g, rbox(0.24, 0.02, 0.38, 0.008), WALNUT, armTray.x, armTray.y, armTray.z);
    // The welcome tea: the tray in the hand, the cup, the 약과.
    const tea = group(g);
    tea.visible = false;
    const tray = group(tea);
    part(tray, cyl(0.17, 0.17, 0.012, 24), CHROME, 0, 0, 0);
    part(tray, ring(0.17, 0.006), STEEL, 0, 0.008, 0, { rx: Math.PI / 2, outline: false });
    part(tray, cyl(0.045, 0.06, 0.08, 14), '#ffffff', -0.06, 0.045, 0.05);
    part(tray, cyl(0.01, 0.006, 0.05, 8), '#ffffff', -0.11, 0.05, 0.05, { rz: 1.0, outline: false });
    const cup = group(tea);
    part(cup, cyl(0.045, 0.04, 0.008, 16), '#ffffff', 0, 0.004, 0, { outline: false });
    part(cup, cyl(0.032, 0.025, 0.055, 14), '#ffffff', 0, 0.035, 0);
    part(cup, cyl(0.028, 0.028, 0.004, 14), '#c8a26a', 0, 0.061, 0, { outline: false });
    const yakgwa = group(g, armTray.x, armTray.y + 0.01, armTray.z - 0.1);
    yakgwa.visible = false;
    part(yakgwa, cyl(0.06, 0.05, 0.01, 16), '#ffffff', 0, 0.005, 0, { outline: false });
    for (const [x, z] of [[-0.02, 0], [0.02, 0.01], [0, -0.02]]) part(yakgwa, cyl(0.022, 0.022, 0.015, 8), '#a0522d', x, 0.017, z, { outline: false });
    const trayAt = marker(g, armTray.x, armTray.y, armTray.z);
    const spots: Record<string, Spot> = {
      'social:welcomeGuest': standAt(g, LOUNGE.tea.x, LOUNGE.tea.z, Math.PI, 'welcomeTea', trayAt),
      'social:resolveComplaint': standAt(g, 0, 0.8, Math.PI, 'meeting'),
    };
    out.spots = spots;
    out.animate = (t) => {
      const serving = nowAt(spots, t) === 'social:welcomeGuest';
      tea.visible = yakgwa.visible = serving;
      if (!serving) return;
      const s = spots['social:welcomeGuest'];
      const st = teaAt(pieceFrame(trayAt.position, LOUNGE.tea, Math.PI, heightAt(s)), t, phaseOf(trayAt));
      const h = st.hands;
      if (h.l && h.r) tray.position.copy(st.cup === 'tray' ? h.l.clone().lerp(h.r, 0.5) : h.l).add(new THREE.Vector3(0, -0.02, 0));
      if (st.cup === 'tray') cup.position.copy(tray.position).add(new THREE.Vector3(0.06, 0.012, -0.04));
      else if (st.cup === 'hand' && h.r) cup.position.copy(h.r).add(new THREE.Vector3(0, -0.03, 0));
      else cup.position.set(armTray.x, armTray.y + 0.01, armTray.z + 0.08);
    };
  },

  /**
   * The 조식 뷔페: a walnut buffet under a marble top and a sneeze guard on chrome posts — two roll-top
   * chafing dishes over their burners (scrambled eggs; sausages and bacon), the rice warmer and the
   * 미역국 kettle with its ladle and the kimchi bowls before them, plates stacked, orange juice and milk
   * in their dispensers, a tent card before each (스크램블 에그…), the hours on its front. Setting it
   * (buffet): the first dish's lid rolled back (the eggs steaming), the food set straight with tongs,
   * the lid rolled shut, its card stood straight, the top wiped down along its edge.
   */
  htlBuffet(g, W, _D, _c, _def, _ctx, out) {
    const topY = 0.89;
    part(g, rbox(W - 0.06, topY - 0.04, 0.6, 0.02), WALNUT, 0, (topY - 0.04) / 2, -0.02);
    for (let i = 0; i < 12; i++) part(g, box(0.03, topY - 0.16, 0.01), shade(WALNUT, 1.18), -0.82 + i * 0.15, 0.43, 0.285, { outline: false });
    part(g, rbox(0.9, 0.16, 0.012, 0.004), '#2b2118', 0, 0.62, 0.29);
    label(g, 'BREAKFAST  조식', 0.72, 0.07, 0, 0.65, 0.297, '#2b2118', GOLD);
    label(g, '06:30 – 10:00', 0.4, 0.045, 0, 0.58, 0.297, '#2b2118', '#efe3c8');
    part(g, rbox(W, 0.04, 0.64, 0.01), MARBLE, 0, topY - 0.02, -0.02);
    veins(g, W, 0.64, 0, topY, -0.02, 29);
    for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) part(g, cyl(0.012, 0.012, 0.55, 8), CHROME, x, topY + 0.275, 0.2, { outline: false });
    glass(g, box(W - 0.06, 0.22, 0.01), 0, topY + 0.5, 0.17, undefined, -0.45);
    /** A roll-top chafing dish at x: its stand, burner, pan of food; its lid (returned) hinged at the back. */
    const chafer = (p: THREE.Object3D, x: number, food: 'egg' | 'sausage', lid: boolean) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(p, cyl(0.006, 0.006, 0.08, 6), CHROME, x + sx * 0.2, topY + 0.04, -0.02 + sz * 0.14, { outline: false });
      part(p, rbox(0.44, 0.012, 0.32, 0.004), CHROME, x, topY + 0.08, -0.02, { outline: false });
      part(p, cyl(0.03, 0.03, 0.04, 10), '#37474f', x, topY + 0.02, -0.02);
      part(p, rbox(0.42, 0.07, 0.3, 0.01), STEEL, x, topY + 0.1, -0.02);
      const r = seeded(food === 'egg' ? 41 : 43);
      for (let i = 0; i < 14; i++) {
        const fx = x - 0.17 + r() * 0.34;
        const fz = -0.14 + r() * 0.24;
        if (food === 'egg') part(p, ball(0.03), '#ffd54f', fx, topY + 0.135, fz, { outline: false }).scale.set(1.2, 0.5, 1);
        else part(p, cyl(0.014, 0.014, 0.09, 8), i % 3 ? '#8d4a2b' : '#c0705a', fx, topY + 0.14, fz, { rz: Math.PI / 2, ry: r() * 3, outline: false });
      }
      if (!lid) return undefined;
      return rollTop(p, x);
    };
    const rollTop = (p: THREE.Object3D, x: number) => {
      const l = group(p, x, BUF.pivot.y, BUF.pivot.z);
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 18, 1, true, 0, Math.PI), new THREE.MeshToonMaterial({ color: STEEL, side: THREE.DoubleSide }));
      shell.userData.ownGeometry = shell.userData.ownMaterial = true;
      shell.rotation.z = Math.PI / 2;
      shell.position.set(0, -0.04, 0.16);
      l.add(shell);
      for (const sx of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.CircleGeometry(0.17, 18, 0, Math.PI), shell.material);
        cap.userData.ownGeometry = true;
        cap.rotation.y = Math.PI / 2;
        cap.position.set(sx * 0.21, -0.04, 0.16);
        l.add(cap);
      }
      const hz = BUF.handle.z - BUF.pivot.z;
      const hy = BUF.handle.y - BUF.pivot.y;
      rod(l, new THREE.Vector3(-0.08, hy, hz), new THREE.Vector3(0.08, hy, hz), 0.008, CHROME);
      return l;
    };
    const ax = BUF.handle.x;
    chafer(g, ax, 'egg', false);
    chafer(g, -0.05, 'sausage', false);
    rollTop(g, -0.05).rotation.x = -1.2;
    // The rice warmer, the soup kettle and its ladle, the kimchi bowls.
    part(g, cyl(0.13, 0.12, 0.22, 20), '#eceff1', 0.4, topY + 0.11, -0.16);
    part(g, cyl(0.135, 0.135, 0.03, 20), STEEL, 0.4, topY + 0.235, -0.16);
    part(g, cyl(0.11, 0.1, 0.26, 20), '#37474f', 0.4, topY + 0.13, 0.08);
    part(g, cyl(0.112, 0.112, 0.02, 20), '#263238', 0.4, topY + 0.27, 0.08);
    rod(g, new THREE.Vector3(0.43, topY + 0.27, 0.08), new THREE.Vector3(0.52, topY + 0.38, 0.12), 0.006, CHROME);
    for (let i = 0; i < 3; i++) {
      part(g, cyl(0.045, 0.03, 0.04, 14), '#ffffff', 0.2 + i * 0.1, topY + 0.02, 0.2);
      part(g, cyl(0.04, 0.04, 0.012, 14), '#d84315', 0.2 + i * 0.1, topY + 0.037, 0.2, { outline: false });
    }
    // Plates, the juice and the milk.
    for (let i = 0; i < 8; i++) part(g, cyl(0.12, 0.1, 0.012, 22), '#ffffff', 0.78, topY + 0.006 + i * 0.013, 0.12, { outline: i === 7 });
    for (const [z, col] of [[-0.22, '#ffa726'], [-0.05, '#fafafa']] as const) {
      glass(g, cyl(0.07, 0.07, 0.3, 16), 0.78, topY + 0.2, z);
      part(g, cyl(0.065, 0.065, 0.2, 16), col, 0.78, topY + 0.15, z, { outline: false });
      part(g, cyl(0.072, 0.072, 0.02, 16), CHROME, 0.78, topY + 0.36, z);
      part(g, box(0.03, 0.02, 0.04), CHROME, 0.78, topY + 0.06, z + 0.08, { outline: false });
    }
    // Tent cards.
    for (const [x, s] of [[ax, '스크램블 에그'], [-0.05, '소시지 · 베이컨'], [0.4, '쌀밥 · 미역국'], [0.78, '주스 · 우유']] as Array<[number, string]>) {
      const c = group(g, x, topY, 0.24);
      part(c, box(0.16, 0.06, 0.004), '#fffaf0', 0, 0.03, 0, { rx: -0.3 });
      label(c, s, 0.15, 0.03, 0, 0.032, 0.003, '#fffaf0', '#5d4037').rotation.x = -0.3;
    }
    // The first dish's lid: shut while it's left, rolled back as it's set; the flames; the steam; tongs and cloth.
    const idle = group(g);
    out.idle = idle;
    rollTop(idle, ax);
    const use = group(g);
    out.inUse = use;
    const lid = rollTop(use, ax);
    for (const x of [ax, -0.05]) glowing(use, new THREE.ConeGeometry(0.02, 0.05, 8), '#ff8f00', x, topY + 0.065, -0.02);
    const steam = [0, 1, 2, 3].map(() => part(use, ball(0.03), '#ffffff', 0, 0, 0, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }) }));
    const tongs = group(use);
    for (const sx of [-1, 1]) part(tongs, box(0.008, 0.004, 0.2), CHROME, sx * 0.008, 0, -0.08, { ry: sx * 0.04, outline: false });
    const cloth = part(use, rbox(0.12, 0.02, 0.08, 0.01), '#ffffff', 0, 0, 0);
    const handle = marker(g, BUF.handle.x, BUF.handle.y, BUF.handle.z);
    const s = standAt(g, BUF.stand.x, BUF.stand.z, Math.PI, 'buffet', handle);
    out.spots = { htlSetBuffet: s, '*': s };
    out.work = handle;
    out.animate = (t) => {
      const ph = phaseOf(handle);
      const st = buffetAt(t, ph);
      lid!.rotation.x = -st.lid;
      steam.forEach((m, i) => {
        const k = (t * 0.4 + i / 4) % 1;
        m.visible = st.lid > 0.6;
        m.position.set(ax - 0.1 + (i % 2) * 0.2 + 0.03 * Math.sin(t + i), topY + 0.16 + 0.3 * k, -0.04 + 0.04 * Math.cos(t * 1.3 + i));
        m.scale.setScalar(0.6 + k);
      });
      const h = buffetHands(pieceFrame(BUF.handle, BUF.stand, Math.PI, heightAt(s)), t, ph);
      tongs.visible = st.tongs && !!h.r;
      if (h.r) {
        tongs.position.copy(h.r);
        tongs.rotation.set(0.5, Math.PI, 0);
        cloth.position.copy(h.r).add(new THREE.Vector3(0, -0.012, 0));
      }
      cloth.visible = st.cloth;
    };
  },

  /**
   * The housekeeping cart: a black three-shelf cart on casters — sheets and towels folded on its
   * shelves, rolls and bottled water below, the amenity caddy (shampoo, conditioner, body wash, lotion)
   * on top, a yellow laundry bag hung at one end for what comes off the beds and a canvas basket of
   * clean towels at the other, 객실 정비중 hung on its front. Stocking it (foldCart): a towel taken from
   * the basket, shaken out, folded in four on the cart's top and stacked.
   */
  htlHousekeepingCart(g, _W, _D, _c, _def, _ctx, out) {
    const x0 = -0.75;
    const x1 = 0.45;
    const cx = (x0 + x1) / 2;
    for (const x of [x0, x1]) for (const z of [-0.24, 0.2]) {
      part(g, cyl(0.014, 0.014, HKC.top.y - 0.08, 8), '#263238', x, (HKC.top.y + 0.08) / 2, z, { outline: false });
      caster(g, x, z, 0.04);
    }
    for (const y of [0.12, 0.5, HKC.top.y - 0.015]) part(g, rbox(x1 - x0 + 0.06, 0.03, 0.5, 0.01), '#37474f', cx, y, -0.02);
    // The shelves: sheets, towels; rolls and water below.
    towelStack(g, -0.5, 0.515, -0.02, 4, 0.36, 0.3);
    towelStack(g, -0.08, 0.515, -0.02, 5, 0.28, 0.21);
    towelStack(g, 0.25, 0.515, -0.02, 3, 0.28, 0.21, '#f5f5f5');
    for (let i = 0; i < 6; i++) part(g, cyl(0.05, 0.05, 0.1, 12), '#ffffff', -0.6 + (i % 3) * 0.11, 0.185, -0.1 + Math.floor(i / 3) * 0.12);
    for (let i = 0; i < 6; i++) {
      glass(g, cyl(0.03, 0.03, 0.2, 10), 0.05 + (i % 3) * 0.08, 0.235, -0.1 + Math.floor(i / 3) * 0.1);
      part(g, cyl(0.012, 0.012, 0.02, 8), '#1565c0', 0.05 + (i % 3) * 0.08, 0.345, -0.1 + Math.floor(i / 3) * 0.1, { outline: false });
    }
    // The amenity caddy on top.
    const caddyX = -0.64;
    part(g, rbox(0.2, 0.05, 0.16, 0.01), '#eceff1', caddyX, HKC.top.y + 0.025, -0.08);
    ['#81c784', '#64b5f6', '#ffb74d', '#f06292'].forEach((col, i) => {
      part(g, cyl(0.016, 0.016, 0.09, 10), col, caddyX - 0.06 + (i % 2) * 0.12, HKC.top.y + 0.07, -0.12 + Math.floor(i / 2) * 0.08);
      part(g, cyl(0.008, 0.008, 0.015, 8), '#ffffff', caddyX - 0.06 + (i % 2) * 0.12, HKC.top.y + 0.122, -0.12 + Math.floor(i / 2) * 0.08, { outline: false });
    });
    // The laundry bag, the clean-towel basket.
    part(g, rbox(0.03, 0.03, 0.46, 0.01), '#263238', -0.93, 0.93, -0.02);
    part(g, rbox(0.3, 0.62, 0.42, 0.08), '#fbc02d', -0.92, 0.6, -0.02);
    part(g, rbox(0.3, 0.42, 0.4, 0.06), '#efebe9', 0.7, 0.6, -0.02);
    const br = seeded(57);
    for (let i = 0; i < 6; i++) part(g, ball(0.07), '#ffffff', 0.62 + br() * 0.16, 0.8 + br() * 0.04, -0.14 + br() * 0.24, { outline: false }).scale.set(1.2, 0.6, 1);
    // The sign on its front.
    rod(g, new THREE.Vector3(-0.35, HKC.top.y - 0.02, 0.23), new THREE.Vector3(-0.35, HKC.top.y - 0.12, 0.235), 0.003, '#9e9e9e');
    part(g, rbox(0.32, 0.12, 0.008, 0.004), '#1a237e', -0.35, HKC.top.y - 0.18, 0.24);
    label(g, '객실 정비중', 0.28, 0.05, -0.35, HKC.top.y - 0.165, 0.245, '#1a237e', '#ffffff');
    label(g, 'HOUSEKEEPING', 0.26, 0.03, -0.35, HKC.top.y - 0.215, 0.245, '#1a237e', '#ffe082');
    // In use: the towel being folded.
    const use = group(g);
    out.inUse = use;
    const towel = towelRig(use, HKC.top);
    const topAt = marker(g, HKC.top.x, HKC.top.y, HKC.top.z);
    const s = standAt(g, HKC.stand.x, HKC.stand.z, Math.PI, 'foldCart', topAt);
    out.spots = { htlStockCart: s, '*': s };
    out.work = topAt;
    const stackTop = new THREE.Vector3(HKC.top.x + HKC.stack[0], HKC.top.y + HKC.stack[1], HKC.top.z + HKC.stack[2]);
    out.animate = (t) => towel.show(towelAt(true, pieceFrame(HKC.top, HKC.stand, Math.PI, heightAt(s)), t, phaseOf(topAt)), stackTop, t);
  },

  /**
   * The hotel's front (2026-11-04, the layout audit), stood on the tile at its right end and drawn out to the left: a deep bronze
   * canopy hung off the building 3.4 m up, from past the door over the kerb where cars pull in, on four slim posts along the wall
   * (two flanking the door, none on the road side), its fascia lit with the hotel's name in gold, downlights under it; on the ground
   * the red carpet from the kerb to the door and the drop-off bay marked out (정차 구역 · DROP OFF).
   */
  htlPorteCochere(g) {
    const H = 3.4;
    // In the piece's frame: x from -8.5 to 0.45 (the door's path is x -4), z from -0.5 (the wall) to 2.0 (out over the kerb).
    const x0 = -8.5;
    const x1 = 0.45;
    const z0 = -0.5;
    const z1 = 2.0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const BRONZE = '#3e2723';
    // A bronze frame under a glass roof (so the lobby still shows from above), the deep fascia along its front.
    part(g, box(x1 - x0, 0.16, 0.12), BRONZE, cx, H, z0 + 0.06);
    for (let i = 0; i <= 6; i++) part(g, box(0.1, 0.16, z1 - z0), BRONZE, x0 + 0.05 + i * ((x1 - x0 - 0.1) / 6), H, cz);
    glass(g, box(x1 - x0 - 0.1, 0.02, z1 - z0 - 0.1), cx, H + 0.09, cz);
    part(g, box(x1 - x0 + 0.04, 0.42, 0.08), '#2b1d19', cx, H + 0.02, z1 + 0.02);
    label(g, `${HOTEL_EN} · ${HOTEL}`, 4.4, 0.3, -4, H + 0.02, z1 + 0.065, 'none', GOLD);
    for (const x of [-8, -6.5, -4, -2.5, -0.5]) glowing(g, cyl(0.08, 0.08, 0.02, 12), '#fff8e1', x, H - 0.1, z1 - 0.05);
    // The posts along the wall: two flanking the door.
    for (const x of [x0 + 0.3, -5.25, -2.75, x1 - 0.25]) {
      part(g, cyl(0.07, 0.07, H, 12), BRONZE, x, H / 2, z0 + 0.25);
      part(g, cyl(0.16, 0.16, 0.05, 14), BRASS, x, 0.025, z0 + 0.25);
      part(g, cyl(0.09, 0.09, 0.04, 12), BRASS, x, 1.0, z0 + 0.25);
    }
    // The red carpet from the kerb to the door.
    part(g, box(0.9, 0.01, 2.4), CARPET_RED, -4, 0.005, 0.7, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.04, 0.012, 2.4), GOLD, -4 + sx * 0.45, 0.006, 0.7, { outline: false });
    // The drop-off bay.
    for (const z of [0.3, 1.95]) part(g, box(4.2, 0.006, 0.06), '#ffffff', -1.7, 0.004, z, { outline: false });
    for (let i = 0; i < 7; i++) part(g, box(0.5, 0.006, 0.08), '#ffeb3b', -3.4 + i * 0.6, 0.004, 1.12, { ry: 0.6, outline: false });
    // The bay's sign on its post, at the kerb end of the posts.
    part(g, rbox(0.6, 0.36, 0.03, 0.01), '#1a237e', x1 - 0.25, 2.1, z0 + 0.34);
    label(g, '정차 구역', 0.5, 0.12, x1 - 0.25, 2.17, z0 + 0.36, 'none', '#ffffff');
    label(g, 'DROP OFF', 0.46, 0.09, x1 - 0.25, 2.03, z0 + 0.36, 'none', '#ffeb3b');
  },
};
