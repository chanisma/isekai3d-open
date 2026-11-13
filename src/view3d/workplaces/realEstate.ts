import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { CR, CT, FM, KC, LB, LW, MEET, MP, RD, RG, TC, reNow, rePhase } from './realEstateMotion';
import type { ReMotion, ReNow } from './realEstateMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 부동산 사무소 drawn as itself (2026-11-01 workplace pipeline, at the user's request), the made-up
 * 새길공인중개사 of a made-up 푸른동. Agents' desks with a printer and a seal, a cork board of listing cards and a
 * district map with its pins at the back; a table where the contract is explained and sealed, a flat cut open in a
 * model, a land-register terminal and a key cabinet; a window of cards facing the street, a tea corner for clients,
 * the company car and a board on the pavement in front.
 *
 * Everything that moves follows the scripts in realEstateMotion.ts. Every name, address and price is made up.
 */

const BRAND = '새길공인중개사';
const NAVY = '#27496d';
const NAVY_D = '#1b3550';
const AMBER = '#f0a93b';
const OAK = '#a1785a';
const OAK_D = '#7b5a40';
const CORK = '#c9a06d';
const INK = '#2a2f36';
const PAPER = '#fbfaf5';
const RED = '#c62828';
const GLASS_C = '#cfe6f2';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

/** Made-up listings: kind, block, price. */
const LISTINGS: Array<[string, string, string]> = [
  ['전세', '은행나무 102동', '2억 4,000'],
  ['월세', '솔내빌라 301호', '500 / 45'],
  ['매매', '푸른마을 7단지', '3억 8,500'],
  ['전세', '하늘채 오피스텔', '1억 6,000'],
  ['월세', '다솜원룸 203호', '300 / 38'],
  ['매매', '새봄상가 1층', '4억 2,000'],
  ['전세', '강변빌 5층', '1억 9,500'],
  ['월세', '달빛주택 2층', '1,000 / 55'],
  ['매매', '느티마을 3단지', '5억 1,000'],
  ['전세', '꿈터아파트 8동', '2억 7,000'],
  ['월세', '샛별원룸 104호', '200 / 34'],
  ['매매', '단비빌라 202호', '2억 3,000'],
];
const KIND_C: Record<string, string> = { 전세: '#1e88e5', 월세: '#43a047', 매매: '#e53935' };

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
const place = (m: THREE.Object3D, p: V) => m.position.set(p[0], p[1], p[2]);
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  m.visible = !!(p ?? home);
  if (p) place(m, p);
  else if (home) place(m, home);
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function pane(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, opacity = 0.24, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: GLASS_C, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; set: (t: THREE.Texture | null) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t) => {
      if (!t || mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
function standAt(g: THREE.Object3D, motion: ReMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: ReMotion, y: number, z: number): Spot {
  const s = spot(g, 'sit', 0, y, z, Math.PI, 0);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: ReNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? reNow(sp.motion as ReMotion, t, rePhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  return (paint: (c: CanvasRenderingContext2D) => void): THREE.Texture | null => {
    if (typeof document === 'undefined') return null;
    if (!tex) {
      const can = document.createElement('canvas');
      can.width = w;
      can.height = h;
      ctx = can.getContext('2d');
      tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (ctx) paint(ctx);
    tex.needsUpdate = true;
    return tex;
  };
}

/** A listing card: its kind in colour, a little plan, the block and the price. */
const cardTex = (i: number, sold = false) =>
  painted(`reCard${i}${sold ? 'x' : ''}`, 128, 96, (c) => {
    const [kind, name, price] = LISTINGS[i % LISTINGS.length];
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 96);
    c.fillStyle = KIND_C[kind];
    c.fillRect(0, 0, 128, 24);
    text(c, kind, 8, 13, 16, '#ffffff');
    text(c, price, 122, 13, 13, '#ffffff', 'right');
    text(c, name, 64, 40, 13, INK, 'center');
    c.strokeStyle = '#78909c';
    c.lineWidth = 2;
    c.strokeRect(22, 52, 84, 36);
    c.beginPath();
    c.moveTo(58, 52);
    c.lineTo(58, 74);
    c.moveTo(58, 74);
    c.lineTo(106, 74);
    c.stroke();
    if (sold) {
      c.save();
      c.translate(64, 56);
      c.rotate(-0.28);
      c.strokeStyle = RED;
      c.lineWidth = 4;
      c.strokeRect(-48, -16, 96, 32);
      text(c, '계약완료', 0, 1, 19, RED, 'center');
      c.restore();
    }
  });
const contractTex = (seed: number, title = '부동산 임대차 계약서') =>
  painted(`reContract${seed}${title}`, 180, 250, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 180, 250);
    text(c, title, 90, 18, 14, INK, 'center');
    c.fillStyle = '#90a4ae';
    c.fillRect(12, 32, 156, 1);
    text(c, '소재지  푸른동 12-3', 12, 46, 11, INK);
    text(c, '보증금  금 이억사천만원', 12, 62, 11, INK);
    const r = seeded(seed + 7);
    for (let i = 0; i < 9; i++) {
      c.fillStyle = '#b0bec5';
      c.fillRect(12, 78 + i * 13, 90 + r() * 66, 3);
    }
    text(c, '임대인', 16, 212, 11, INK);
    text(c, '임차인', 100, 212, 11, INK);
    c.fillStyle = '#cfd8dc';
    c.fillRect(14, 222, 66, 1);
    c.fillRect(98, 222, 66, 1);
  });
const registerTex = (key: string, gap: boolean) =>
  painted(`reReg${key}`, 180, 250, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 180, 250);
    text(c, '등기사항전부증명서', 90, 18, 13, INK, 'center');
    text(c, gap ? '【갑구】 소유권' : '【을구】 소유권 외', 10, 44, 12, NAVY);
    c.strokeStyle = '#90a4ae';
    c.strokeRect(8, 56, 164, 150);
    for (let i = 1; i < 5; i++) {
      c.fillStyle = '#cfd8dc';
      c.fillRect(8, 56 + i * 30, 164, 1);
    }
    (gap ? ['소유권이전  단비 씨', '2019  매매', '가압류 없음'] : ['근저당권 설정', '채권최고액 1억 2천', '은행나무 신용협회']).forEach((s, i) => text(c, s, 14, 72 + i * 30, 11, INK));
  });

function sheetOf(g: THREE.Object3D, tex: THREE.Texture, w = 0.18, h = 0.25): THREE.Group {
  const s = group(g);
  picture(s, tex, w, h, 0, 0.002, 0, '#ffffff', 0, -Math.PI / 2);
  part(s, box(w, 0.002, h), PAPER, 0, 0, 0, { outline: false });
  return s;
}
function upright(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number): THREE.Group {
  const s = group(g);
  picture(s, tex, w, h, 0, 0, 0.002);
  part(s, box(w, h, 0.002), PAPER, 0, 0, 0, { outline: false });
  return s;
}
function penMesh(g: THREE.Object3D, color = '#1565c0'): THREE.Group {
  const p = group(g);
  part(p, cyl(0.006, 0.006, 0.13, 6), color, 0, 0.04, 0, { rz: 0.55, ry: 0.4, outline: false });
  return p;
}
/** A round wooden seal, its red face down. */
function sealMesh(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, cyl(0.016, 0.016, 0.07, 12), '#6d4c41', 0, 0.04, 0);
  part(s, ball(0.019), '#5d4037', 0, 0.08, 0, { outline: false });
  part(s, cyl(0.017, 0.017, 0.006, 12), RED, 0, 0.003, 0, { outline: false });
  return s;
}
function inkPad(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.05, 0.05, 0.022, 16), BLACK, x, y + 0.011, z);
  part(g, cyl(0.04, 0.04, 0.004, 16), '#b71c1c', x, y + 0.024, z, { outline: false });
}
function handset(g: THREE.Object3D): THREE.Group {
  const h = group(g);
  part(h, rbox(0.04, 0.18, 0.035, 0.012), BLACK, 0, 0, 0);
  part(h, rbox(0.05, 0.05, 0.05, 0.012), BLACK, 0, 0.08, 0.008, { outline: false });
  part(h, rbox(0.05, 0.05, 0.05, 0.012), BLACK, 0, -0.08, 0.008, { outline: false });
  return h;
}
/** A swivel chair whose back is to +z (or -z), its seat's top at 0.47. */
function officeChair(g: THREE.Object3D, x: number, z: number, back = 1, color = NAVY) {
  part(g, cyl(0.025, 0.025, 0.34, 8), STEEL, x, 0.24, z);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(g, box(0.22, 0.022, 0.035), BLACK, x + Math.cos(a) * 0.11, 0.06, z - Math.sin(a) * 0.11, { ry: a });
    part(g, ball(0.024), BLACK, x + Math.cos(a) * 0.22, 0.026, z - Math.sin(a) * 0.22, { outline: false });
  }
  part(g, rbox(0.42, 0.06, 0.42, 0.03), color, x, 0.44, z);
  part(g, rbox(0.4, 0.44, 0.05, 0.03), color, x, 0.76, z + back * 0.2, { rx: back * -0.08 });
}
/** A plain wooden chair, its seat's top at 0.47. */
function woodChair(g: THREE.Object3D, x: number, z: number, back: number) {
  part(g, rbox(0.42, 0.05, 0.4, 0.015), OAK, x, 0.445, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.035, 0.42, 0.035), OAK_D, x + sx * 0.17, 0.21, z + sz * 0.16);
  part(g, rbox(0.4, 0.34, 0.03, 0.012), OAK, x, 0.72, z + back * 0.18);
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

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  wife: { top: '#c78a6b', bottom: '#4e4a44', hair: '#2b1b10' },
  husband: { top: '#5c6bc0', bottom: '#37474f', hair: '#1a1a1a', skin: '#eac09a' },
  older: { top: '#8d6e63', bottom: '#4e4a44', hair: '#c8c8c8', skin: '#eac09a' },
  boss: { top: '#5d4037', bottom: '#2f2f35', hair: '#2b1b10', skin: '#f8d9c0' },
  mate: { top: '#ff8a65', bottom: '#3e4551', hair: '#5b3a1e', skin: '#eac09a' },
  young: { top: '#4db6ac', bottom: '#37474f', hair: '#1a1a1a', skin: '#c99a6e' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender?: 'female' | 'male', seat?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const dy = seat === undefined ? 0 : seat + 0.07 - 0.84;
  for (const sx of [-1, 1]) {
    if (seat === undefined) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    } else {
      rod(root, v3(sx * 0.09, seat + 0.07, -0.02), v3(sx * 0.1, seat + 0.06, 0.36), 0.056, look.bottom);
      rod(root, v3(sx * 0.1, seat + 0.06, 0.36), v3(sx * 0.1, 0.08, 0.4), 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.1, 0.035, 0.44);
    }
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88 + dy, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11 + dy, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37 + dy, 0, { outline: false });
  const head = group(root, 0, 1.51 + dy, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31 + dy, 0);
    const restAt = v3(sx * 0.23, 0.82 + dy, 0.05);
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
  const opts: FigureOptions = seat === undefined ? { gender } : { gender, seat, floor: 0 };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}

// =============================================================================================
// 중개사 책상 (realtorDesk, 1 × 1): a short oak desk, its chair in front, knees free under it.

function realtorDesk(g: THREE.Group, out: Built) {
  const top = RD.top;
  part(g, rbox(0.96, 0.04, 0.68, 0.012), OAK, 0, top - 0.02, -0.14);
  for (const sx of [-1, 1]) part(g, box(0.04, top - 0.04, 0.62), OAK_D, sx * 0.44, (top - 0.04) / 2, -0.14);
  part(g, box(0.86, 0.34, 0.02), OAK_D, 0, top - 0.24, -0.45);
  // A low screen at the back with a name plate and the day's listings, the stacks and the tray.
  part(g, box(0.96, 0.32, 0.03), '#b7c7c0', 0, top + 0.16, -0.47);
  label(g, '공인중개사', 0.34, 0.07, -0.3, top + 0.24, -0.453, NAVY, '#ffffff');
  const tones = ['#ef5350', '#42a5f5', '#66bb6a', '#ffb74d'];
  tones.forEach((k, i) => part(g, rbox(0.03, 0.2, 0.1, 0.004), k, -0.44 + i * 0.035, top + 0.1, -0.39));
  // The screen, the keyboard, a mouse, the phone, the printer with its out-tray, the seal and its pad.
  const mon = group(g, RD.screen[0], RD.screen[1], RD.screen[2]);
  part(mon, rbox(0.48, 0.3, 0.025, 0.012), BLACK, 0, 0, 0);
  part(g, cyl(0.02, 0.06, 0.13, 8), BLACK, RD.screen[0], top + 0.07, RD.screen[2] - 0.02);
  const screen = swapPic(mon, 0.44, 0.26, 0, 0, 0.014);
  const liveS = live(280, 166);
  const paintScreen = (mode: 'idle' | 'draft' | 'search' | 'learn', n: Record<string, number>) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = '#f7fafb';
    c.fillRect(0, 0, 280, 166);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 280, 26);
    if (mode === 'draft') {
      text(c, '임대차 계약서 작성', 140, 14, 15, '#ffffff', 'center');
      const L = ['소재지  푸른동 12-3', '임대인  단비 씨', '임차인  솔내 씨', '보증금  2억 4,000만', '기간  2년', '특약  도배 후 입주'];
      const show = Math.floor((n.lines ?? 0) * L.length + 0.001);
      L.forEach((s, i) => i < show && text(c, s, 14, 44 + i * 20, 14, INK));
    } else if (mode === 'search') {
      text(c, '매물 검색 — 푸른동 · 전세', 140, 14, 15, '#ffffff', 'center');
      const off = Math.floor((n.scroll ?? 0) * 3);
      for (let i = 0; i < 5; i++) {
        const [kind, name, price] = LISTINGS[(i + off) % LISTINGS.length];
        const on = (n.pick ?? 0) > 0.5 && i === 2;
        if (on) {
          c.fillStyle = '#fff3cd';
          c.fillRect(6, 34 + i * 26, 268, 24);
        }
        text(c, kind, 12, 46 + i * 26, 13, KIND_C[kind]);
        text(c, name, 52, 46 + i * 26, 13, INK);
        text(c, price, 270, 46 + i * 26, 13, INK, 'right');
      }
    } else if (mode === 'learn') {
      text(c, '등기부 보는 법 3강', 140, 14, 15, '#ffffff', 'center');
      ['표제부: 어떤 집인가', '갑구: 누구 집인가', '을구: 빚이 있는가'].forEach((s, i) => text(c, s, 16, 60 + i * 30, 15, i === 2 ? RED : INK));
    } else {
      text(c, BRAND, 140, 14, 15, '#ffffff', 'center');
      LISTINGS.slice(0, 4).forEach(([kind, name, price], i) => {
        text(c, kind, 12, 46 + i * 28, 13, KIND_C[kind]);
        text(c, name, 52, 46 + i * 28, 13, INK);
        text(c, price, 270, 46 + i * 28, 13, INK, 'right');
      });
    }
  };
  const idle = live(280, 166);
  const idleTex = idle(paintScreen('idle', {}));
  screen.set(idleTex);
  part(g, rbox(0.32, 0.018, 0.12, 0.006), '#37474f', RD.keys[0], top + 0.012, RD.keys[2]);
  part(g, rbox(0.06, 0.025, 0.09, 0.012), BLACK, RD.mouse[0], top + 0.014, RD.mouse[2]);
  part(g, rbox(0.14, 0.035, 0.19, 0.01), BLACK, RD.phone[0], top + 0.018, RD.phone[2]);
  const phone = handset(g);
  phone.rotation.x = Math.PI / 2;
  part(g, rbox(0.26, 0.16, 0.26, 0.02), '#cfd8dc', 0.33, top + 0.08, -0.25);
  part(g, box(0.18, 0.004, 0.14), PAPER, 0.33, top + 0.02, -0.06, { outline: false });
  inkPad(g, 0.1, top, -0.08);
  const mySeal = sealMesh(g);
  mySeal.position.set(0.18, top, -0.08);
  officeChair(g, 0, RD.seatZ, 1);
  // What the work brings out.
  const notes = sheetOf(g, contractTex(1, '매물 메모'));
  const page = sheetOf(g, contractTex(2));
  const ticks = [0, 1, 2].map((i) => part(page, box(0.03, 0.002, 0.008), '#2e7d32', 0.05, 0.004, -0.06 + i * 0.05, { outline: false, ry: -0.5 }));
  const pen = penMesh(g);
  const book = group(g);
  part(book, box(0.48, 0.03, 0.3), '#1e4e6e', 0, 0.01, 0);
  picture(book, contractTex(3, '등기부 읽기'), 0.22, 0.28, -0.12, 0.028, 0, '#ffffff', 0, -Math.PI / 2);
  const right = swapPic(book, 0.22, 0.28, 0.12, 0.028, 0, 0, -Math.PI / 2);
  const leafA = registerTex('A', true);
  const leafB = registerTex('B', false);
  right.set(leafA);
  const hl = part(book, box(0.17, 0.001, 0.02), '#ffee58', 0.12, 0.03, -0.02, { outline: false });
  const marker1 = group(g);
  part(marker1, cyl(0.012, 0.012, 0.12, 8), '#fdd835', 0, 0.05, 0, { rz: 0.55, outline: false });
  const sheetA = sheetOf(g, registerTex('C', true));
  const sheetB = sheetOf(g, registerTex('D', false));
  const circle = part(sheetB, cyl(0.045, 0.045, 0.002, 18), '#ef5350', -0.01, 0.003, -0.05, { outline: false });
  circle.scale.z = 0.3;
  const noteLine = part(sheetB, box(0.11, 0.001, 0.01), RED, 0, 0.004, 0.07, { outline: false });
  const sticky = group(g);
  part(sticky, box(0.07, 0.07, 0.002), '#fff176', 0, 0, 0, { outline: false });
  const stuck = part(mon, box(0.07, 0.07, 0.002), '#fff176', 0.19, -0.08, 0.018, { outline: false });
  const spots: Record<string, Spot> = {
    draftContract: seatAt(g, 'reDraft', RD.seatY, RD.seatZ),
    searchListings: seatAt(g, 'reSearch', RD.seatY, RD.seatZ),
    realEstate_learnRegistry: seatAt(g, 'reLearn', RD.seatY, RD.seatZ),
    realEstate_checkRights: seatAt(g, 'reRights', RD.seatY, RD.seatZ),
  };
  spots['*'] = spots.draftContract;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const draft = now === 'draftContract';
    const search = now === 'searchListings';
    const learn = now === 'realEstate_learnRegistry';
    const rights = now === 'realEstate_checkRights';
    at(phone, search ? P.phone : null, RD.phone);
    at(notes, draft ? P.notes : null);
    at(page, draft ? P.page : null);
    ticks.forEach((m, i) => (m.visible = (n.ticks ?? 0) * 3 > i + 0.4));
    at(pen, draft || rights ? P.pen : null);
    at(book, learn ? P.book : null);
    right.set((n.page ?? 0) > 0.5 ? leafB : leafA);
    hl.visible = (n.marked ?? 0) > 0.05;
    hl.scale.x = Math.max(0.02, n.marked ?? 0);
    at(marker1, learn ? P.hl : null);
    at(sheetA, rights ? P.sheetA : null);
    at(sheetB, rights ? P.sheetB : null);
    circle.visible = (n.circled ?? 0) > 0.1;
    circle.scale.x = 0.4 + 0.6 * (n.circled ?? 0);
    noteLine.visible = (n.noted ?? 0) > 0.3;
    at(sticky, search ? P.sticky : null);
    if (sticky.visible) sticky.rotation.y = 0;
    stuck.visible = search && (n.noted ?? 0) > 0.5;
    if (draft || search || learn) screen.set(liveS(paintScreen(draft ? 'draft' : search ? 'search' : 'learn', n)));
    else screen.set(idleTex);
  });
  out.work = marker(g, RD.keys[0], top + 0.03, RD.keys[2]);
}

// =============================================================================================
// 매물 게시판 (listingBoard, 2 × 1): a framed cork board on a ledge, cards in rows, a sheet of sums.

function listingBoard(g: THREE.Group, out: Built, W: number) {
  part(g, box(W - 0.04, 1.26, 0.05), OAK_D, 0, 1.4, -0.33);
  part(g, box(W - 0.14, 1.14, 0.02), CORK, 0, 1.4, LB.z - 0.02, { outline: false });
  const r = seeded(13);
  for (let i = 0; i < 90; i++) part(g, box(0.012, 0.012, 0.001), '#a57f4f', -0.88 + r() * 1.76, 0.88 + r() * 1.04, LB.z - 0.008, { outline: false });
  // Feet and a ledge with a tin of pins, the stack of new cards.
  for (const sx of [-1, 1]) part(g, box(0.06, 0.8, 0.06), OAK_D, sx * (W / 2 - 0.1), 0.4, -0.33);
  part(g, box(W - 0.04, 0.03, 0.26), OAK, 0, LB.ledge, -0.2);
  label(g, '오늘의 매물', 0.74, 0.1, 0, 2.08, -0.3, NAVY, '#ffffff');
  part(g, box(0.8, 0.13, 0.03), NAVY_D, 0, 2.08, -0.32);
  // The cards, all but the two in the chart's place; the one to go kept apart.
  let idx = 0;
  for (let j = 0; j < LB.rows; j++)
    for (let i = 0; i < LB.cols; i++) {
      const x = LB.x(i);
      const y = LB.y(j);
      idx++;
      if (i === 1 && j === 1) continue;
      if (i === 3 && j !== 0) continue;
      const c = upright(g, cardTex(idx), 0.34, 0.255);
      c.position.set(x, y, LB.face);
      part(g, ball(0.012), ['#e53935', '#1e88e5', '#fdd835'][idx % 3], x, y + 0.11, LB.face + 0.012, { outline: false });
    }
  const sold = upright(g, cardTex(5), 0.34, 0.255);
  const stampedIn = upright(g, cardTex(5, true), 0.34, 0.255);
  const fresh = upright(g, cardTex(9), 0.34, 0.255);
  const slot: V = [LB.x(1), LB.y(1), LB.face];
  const cardBack = part(g, ball(0.012), '#e53935', slot[0], slot[1] + 0.11, LB.face + 0.012, { outline: false });
  // A flat card on the ledge once it's been stamped.
  const stack = group(g, LB.newStack[0], LB.newStack[1] - 0.01, LB.newStack[2]);
  for (let i = 0; i < 5; i++) part(stack, box(0.3, 0.004, 0.2), i % 2 ? '#fff' : '#fdf2d8', 0.0, i * 0.005, 0, { outline: false });
  part(g, cyl(0.05, 0.05, 0.05, 12), STEEL, 0.34, LB.ledge + 0.04, -0.18);
  const seal = sealMesh(g);
  // The chart: a sheet of bars drawn in with a marker.
  const chartS = swapPic(g, 0.34, 0.46, LB.chart[0], LB.chart[1], LB.face);
  const blank = painted('reChartBlank', 170, 230, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 170, 230);
    text(c, '수익성 분석', 85, 18, 15, NAVY, 'center');
    c.fillStyle = '#90a4ae';
    c.fillRect(22, 190, 130, 2);
    c.fillRect(22, 40, 2, 150);
  });
  chartS.set(blank);
  const liveC = live(170, 230);
  const clip = group(g);
  part(clip, box(0.2, 0.27, 0.012), '#8d6e63', 0, 0, 0);
  part(clip, box(0.18, 0.24, 0.002), PAPER, 0, -0.01, 0.008, { outline: false });
  part(clip, box(0.08, 0.02, 0.012), STEEL, 0, 0.125, 0.008, { outline: false });
  const sums = [0, 1, 2, 3].map((i) => part(clip, box(0.13, 0.008, 0.001), '#37474f', 0, 0.07 - i * 0.04, 0.0095, { outline: false }));
  const pen = penMesh(g);
  const mk = group(g);
  part(mk, cyl(0.012, 0.012, 0.12, 8), '#1e88e5', 0, 0.05, 0.01, { rz: 0.5, outline: false });
  // The colleagues at the meeting.
  const a = person(g, LOOKS.mate, MEET.a[0], MEET.a[1], Math.PI + 0.45, 'female');
  const b = person(g, LOOKS.young, MEET.b[0], MEET.b[1], Math.PI - 0.6, 'male');
  const spots: Record<string, Spot> = { updateListings: standAt(g, 'reBoard'), realEstate_feasibility: standAt(g, 'reFeasible'), realEstate_agentMeeting: standAt(g, 'reMeeting') };
  spots['*'] = spots.updateListings;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const board = now === 'updateListings';
    const feas = now === 'realEstate_feasibility';
    const meet = now === 'realEstate_agentMeeting';
    // The old card in its slot, off it in the hand, flat on the ledge to be stamped.
    const hand = board ? P.card : null;
    const marked = (n.marked ?? 0) > 0.5;
    if (board && (n.fresh ?? 0) > 0.5) {
      sold.visible = false;
      stampedIn.visible = false;
      fresh.visible = true;
      place(fresh, slot);
    } else if (board && P.fresh) {
      fresh.visible = true;
      place(fresh, P.fresh);
      sold.visible = false;
      stampedIn.visible = false;
    } else {
      fresh.visible = false;
      const showing = hand ?? (board && (n.gone ?? 0) > 0.5 ? null : slot);
      const flat = !!hand && hand[1] < 1.0;
      sold.visible = !!showing && !marked;
      stampedIn.visible = !!showing && marked;
      const m = marked ? stampedIn : sold;
      if (showing) place(m, showing);
      m.rotation.x = flat ? -Math.PI / 2 : 0;
    }
    // Stamped and laid aside on the ledge it stays there until the round's over.
    if (board && P.kept) {
      stampedIn.visible = true;
      place(stampedIn, P.kept);
      stampedIn.rotation.x = -Math.PI / 2;
    }
    cardBack.visible = !board || (n.gone ?? 0) < 0.5 || (n.fresh ?? 0) > 0.5;
    at(seal, board ? P.stampIt : null);
    at(clip, feas ? P.clip : null);
    sums.forEach((m, i) => (m.visible = (n.sums ?? 0) * 4 > i + 0.2));
    at(pen, feas ? P.pen : null);
    at(mk, feas ? P.marker : null);
    if (feas) {
      const bars = n.bars ?? 0;
      const line = n.line ?? 0;
      chartS.set(liveC((c) => {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, 170, 230);
        text(c, '수익성 분석', 85, 18, 15, NAVY, 'center');
        c.fillStyle = '#90a4ae';
        c.fillRect(22, 190, 130, 2);
        c.fillRect(22, 40, 2, 150);
        for (let i = 0; i < 3; i++) {
          const f = Math.max(0, Math.min(1, bars - i));
          c.fillStyle = ['#90caf9', '#64b5f6', '#1e88e5'][i];
          c.fillRect(36 + i * 38, 190 - (50 + i * 40) * f, 28, (50 + i * 40) * f);
        }
        if (line > 0) {
          c.strokeStyle = RED;
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(30, 150);
          c.lineTo(30 + 120 * line, 150 - 100 * line);
          c.stroke();
        }
      }));
    } else chartS.set(blank);
    // The meeting: heads to the board, one answers.
    for (const f of [a, b]) f.root.visible = meet;
    if (meet) {
      a.head.rotation.x = (n.nodding ?? 0) * 0.14 * Math.sin(t * 3);
      b.head.rotation.x = (n.nodding ?? 0) * 0.12 * Math.sin(t * 3.4);
      a.armR((n.asking ?? 0) > 0.5 ? v3(MEET.a[0] + 0.1, 1.5, MEET.a[1] - 0.1) : null);
      b.armL(null);
    }
  });
  out.work = marker(g, -0.25, 1.38, LB.face);
}

// =============================================================================================
// 동네 지도 (reDistrictMap, 3 × 1): a made-up district in its frame, pins and a station.

const mapTex = () =>
  painted('reMap', 900, 420, (c) => {
    c.fillStyle = '#e9efe0';
    c.fillRect(0, 0, 900, 420);
    // The river, the park, blocks of houses.
    c.strokeStyle = '#8fc6e4';
    c.lineWidth = 34;
    c.beginPath();
    c.moveTo(-10, 360);
    c.bezierCurveTo(250, 290, 420, 400, 910, 300);
    c.stroke();
    c.fillStyle = '#b4d7a0';
    c.fillRect(70, 40, 150, 90);
    text(c, '푸른공원', 145, 86, 18, '#3d7a35', 'center');
    const r = seeded(31);
    for (let y = 26; y < 270; y += 42)
      for (let x = 240; x < 880; x += 62) {
        c.fillStyle = r() > 0.75 ? '#f2d7a8' : '#d9d9cf';
        c.fillRect(x, y, 48, 30);
      }
    c.strokeStyle = '#ffffff';
    c.lineWidth = 12;
    for (const x of [234, 430, 680]) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 330);
      c.stroke();
    }
    for (const y of [150, 270]) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(900, y);
      c.stroke();
    }
    text(c, '은행나무길', 330, 150, 18, '#546e7a', 'center');
    text(c, '솔내로', 560, 270, 18, '#546e7a', 'center');
    text(c, '푸른동', 560, 110, 34, 'rgba(39,73,109,0.55)', 'center');
    text(c, '솔내동', 330, 215, 30, 'rgba(39,73,109,0.45)', 'center');
    text(c, '달빛강', 160, 334, 20, '#2f7fa8', 'center');
    c.fillStyle = '#3949ab';
    c.fillRect(800, 180, 62, 26);
    text(c, '푸른역', 831, 193, 15, '#ffffff', 'center');
  });

function districtMap(g: THREE.Group, out: Built, W: number) {
  const face = MP.face;
  part(g, box(W - 0.02, 1.42, 0.05), NAVY_D, 0, 1.36, -0.32);
  picture(g, mapTex(), W - 0.14, 1.3, 0, 1.36, face - 0.012);
  part(g, box(W - 0.14, 1.3, 0.01), '#e9efe0', 0, 1.36, face - 0.025, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.06, 0.66, 0.06), NAVY_D, sx * (W / 2 - 0.1), 0.33, -0.32);
  part(g, box(W - 0.04, 0.03, 0.26), OAK, 0, 0.66 + 0.02, -0.22);
  // Pins already there and a legend.
  const r = seeded(77);
  for (let i = 0; i < 14; i++) {
    const x = -1.25 + r() * 2.5;
    const y = 0.95 + r() * 0.85;
    const col = ['#e53935', '#1e88e5', '#43a047'][i % 3];
    part(g, ball(0.018), col, x, y, face + 0.02, { outline: false });
    part(g, cyl(0.003, 0.003, 0.03, 4), STEEL, x, y, face + 0.005, { rx: Math.PI / 2, outline: false });
  }
  const leg = painted('reLegend', 200, 100, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 200, 100);
    [['전세', '#1e88e5'], ['월세', '#43a047'], ['매매', '#e53935']].forEach(([s, k], i) => {
      c.fillStyle = k;
      c.beginPath();
      c.arc(24, 20 + i * 30, 9, 0, Math.PI * 2);
      c.fill();
      text(c, s, 46, 21 + i * 30, 19, INK);
    });
  });
  picture(g, leg, 0.34, 0.17, 1.15, 0.84, face + 0.002);
  // The ledge: cards and a tin of pins.
  part(g, cyl(0.06, 0.06, 0.05, 12), '#90a4ae', MP.tin[0], 0.72, MP.tin[2]);
  const lie = sheetOf(g, cardTex(3), 0.2, 0.15);
  lie.position.set(MP.ledge[0], 0.71, MP.ledge[2]);
  const carried = upright(g, cardTex(3), 0.16, 0.12);
  const pin = group(g);
  part(pin, ball(0.02), '#e53935', 0, 0, 0, { outline: false });
  const placed = MP.newPins.map(([x, y]) => part(g, ball(0.024), '#e53935', x, y, face + 0.02, { outline: false }));
  const station = part(g, ball(0.024), '#3949ab', MP.station[0], MP.station[1], face + 0.02, { outline: false });
  const string = part(g, box(1, 0.006, 0.004), '#e53935', 0, 0, face + 0.024, { outline: false });
  const spots: Record<string, Spot> = { reMapPins: standAt(g, 'reMap') };
  spots['*'] = spots.reMapPins;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const on = now === 'reMapPins';
    at(carried, on ? P.card : null);
    lie.visible = !on || !P.card;
    at(pin, on ? P.pin : null);
    placed.forEach((m, i) => (m.visible = !on || (n.pins ?? 0) > i + 0.5));
    station.visible = true;
    const s = on ? n.string ?? 0 : 0;
    string.visible = s > 0.02;
    if (s > 0.02) {
      const [ax, ay] = MP.newPins[2];
      const [bx, by] = MP.station;
      const dx = (bx - ax) * s;
      const dy = (by - ay) * s;
      string.position.set(ax + dx / 2, ay + dy / 2, face + 0.024);
      string.scale.x = Math.hypot(dx, dy);
      string.rotation.z = Math.atan2(dy, dx);
    }
  });
  out.work = marker(g, 0, 1.3, face);
}

// =============================================================================================
// 매물 열쇠함 (reKeyCabinet, 1 × 1): a grey cabinet on a slim stand; hooks, tags, a log on a shelf.

function keyCabinet(g: THREE.Group, out: Built) {
  part(g, box(0.86, 0.82, 0.32), '#78909c', 0, 1.42, -0.28);
  part(g, box(0.8, 0.76, 0.002), '#eceff1', 0, 1.42, KC.face - 0.012, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.05, 1.0, 0.05), '#546e7a', sx * 0.38, 0.5, -0.32);
  // The shelf with the log.
  part(g, box(0.78, 0.03, 0.34), OAK, 0, 0.86, -0.2);
  const log = sheetOf(g, contractTex(5, '열쇠 대장'), 0.26, 0.3);
  log.position.set(KC.log[0], 0.88, KC.log[2]);
  const lines = [0, 1, 2].map((i) => part(log, box(0.17, 0.001, 0.008), '#1565c0', 0, 0.004, -0.02 + i * 0.05, { outline: false }));
  const logPen = penMesh(g);
  // Rows of hooks and coloured tags with made-up blocks.
  const r = seeded(9);
  const names = ['101', '102', '201', '301', '솔내', '달빛', '샛별', '단비', '꿈터', '강변', '느티', '새봄'];
  let n = 0;
  for (const y of [1.66, 1.5, 1.34, 1.18])
    for (let i = 0; i < 6; i++) {
      const x = -0.3 + i * 0.12;
      part(g, cyl(0.004, 0.004, 0.012, 5), CHROME, x, y + 0.04, KC.face - 0.006, { rx: Math.PI / 2, outline: false });
      if (Math.abs(x - KC.key[0]) < 0.02 && y === 1.34) continue;
      if (r() > 0.82) continue;
      part(g, ball(0.012), '#d4af37', x, y + 0.02, KC.face, { outline: false });
      const tone = ['#ef5350', '#42a5f5', '#66bb6a', '#ffb74d'][n % 4];
      label(g, names[n % names.length], 0.085, 0.045, x, y - 0.025, KC.face + 0.002, tone, '#ffffff');
      n++;
    }
  const key = group(g);
  part(key, box(0.09, 0.05, 0.004), '#ef5350', 0, -0.05, 0, { outline: false });
  part(key, cyl(0.012, 0.012, 0.004, 10), '#d4af37', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(key, box(0.008, 0.04, 0.003), '#d4af37', 0, 0.025, 0, { outline: false });
  // The door, its window, the lock.
  const door = group(g, -0.42, 1.42, -0.08);
  part(door, box(0.84, 0.8, 0.02), '#90a4ae', 0.42, 0, 0);
  part(door, box(0.5, 0.4, 0.004), GLASS_C, 0.42, 0.1, 0.012, { outline: false });
  label(door, '매물 열쇠', 0.34, 0.08, 0.42, -0.26, 0.012, NAVY, '#ffffff');
  part(door, cyl(0.016, 0.016, 0.02, 8), '#37474f', 0.76, -0.1, 0.018, { rx: Math.PI / 2 });
  const spots: Record<string, Spot> = { reTakeKey: standAt(g, 'reKey') };
  spots['*'] = spots.reTakeKey;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const k = N?.n ?? {};
    const on = now === 'reTakeKey';
    door.rotation.y = -(on ? k.open ?? 0 : 0) * 1.7;
    at(key, on ? P.key : null, on && (k.gone ?? 0) > 0.5 ? undefined : KC.key);
    if (on && (k.gone ?? 0) > 0.5 && !P.key) key.visible = false;
    lines.forEach((m, i) => (m.visible = (on ? k.lines ?? 0 : 0) * 3 > i + 0.1));
    at(logPen, on ? P.pen : null);
  });
  out.work = marker(g, KC.key[0], KC.key[1], KC.key[2]);
}

// =============================================================================================
// 등기부 조회 단말 (reRegistryTerminal, 1 × 1): a standing counter with screen and printer.

function registryTerminal(g: THREE.Group, out: Built) {
  const top = RG.top;
  part(g, rbox(0.96, 0.04, 0.72, 0.012), '#eceff1', 0, top - 0.02, -0.08);
  part(g, box(0.9, top - 0.04, 0.5), NAVY, 0, (top - 0.04) / 2, -0.18);
  label(g, '등기부 조회', 0.5, 0.1, 0, 0.6, 0.075, NAVY, '#ffffff');
  const mon = group(g, RG.screen[0], RG.screen[1], RG.screen[2]);
  part(mon, rbox(0.52, 0.34, 0.03, 0.012), BLACK, 0, 0, 0);
  part(g, cyl(0.022, 0.06, 0.13, 8), BLACK, RG.screen[0], top + 0.07, RG.screen[2] - 0.02);
  const screen = swapPic(mon, 0.48, 0.3, 0, 0, 0.017);
  const paintS = (n: Record<string, number>) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = '#f5f8fb';
    c.fillRect(0, 0, 288, 180);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 288, 28);
    text(c, '등기부등본 열람', 144, 15, 15, '#ffffff', 'center');
    const s = n.stage ?? 0;
    const addr = '푸른동 12-3 은행나무 102동';
    text(c, s < 1 ? addr.slice(0, Math.ceil(s * addr.length)) : addr, 14, 54, 14, INK);
    c.strokeStyle = '#90a4ae';
    c.strokeRect(10, 40, 268, 28);
    if (s >= 1 && s < 2) {
      c.fillStyle = '#cfd8dc';
      c.fillRect(14, 90, 260, 14);
      c.fillStyle = '#1e88e5';
      c.fillRect(14, 90, 260 * (s - 1), 14);
      text(c, '발급 중…', 144, 124, 14, INK, 'center');
    } else if (s >= 2) {
      text(c, '갑구  소유권 이상 없음', 14, 94, 14, '#2e7d32');
      text(c, '을구  근저당 1건', 14, 124, 14, (n.flagged ?? 0) > 0.3 ? RED : INK);
      if ((n.checked ?? 0) > 0.5) text(c, '확인 완료', 274, 156, 15, NAVY, 'right');
    }
  };
  const idleL = live(288, 180);
  const liveS = live(288, 180);
  const idleT = idleL(paintS({ stage: 0 }));
  screen.set(idleT);
  part(g, rbox(0.34, 0.018, 0.12, 0.006), '#37474f', RG.keys[0], top + 0.012, RG.keys[2]);
  part(g, rbox(0.26, 0.18, 0.28, 0.02), '#cfd8dc', 0.32, top + 0.09, -0.16);
  part(g, box(0.18, 0.004, 0.14), PAPER, 0.32, top + 0.03, RG.outfeed[2], { outline: false });
  const led = ownLit(g, ball(0.01), '#1a3a22', 0.4, top + 0.14, -0.02);
  inkPad(g, RG.stamp[0] + 0.1, top - 0.02, RG.stamp[2]);
  const seal = sealMesh(g);
  const sheet = sheetOf(g, registerTex('E', false));
  const flagged = part(sheet, cyl(0.05, 0.05, 0.002, 18), '#ef5350', 0, 0.004, -0.05, { outline: false });
  flagged.scale.z = 0.3;
  const okMark = part(sheet, cyl(0.02, 0.02, 0.002, 12), RED, 0.05, 0.004, 0.07, { outline: false });
  const pen = penMesh(g, RED);
  part(g, rbox(0.2, 0.02, 0.28, 0.006), '#b0bec5', -0.36, top + 0.01, 0.08);
  const spots: Record<string, Spot> = { reCheckRegistry: standAt(g, 'reRegistry') };
  spots['*'] = spots.reCheckRegistry;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const on = now === 'reCheckRegistry';
    setLit(led, (n.printing ?? 0) > 0.5 ? '#66ff99' : '#1a3a22');
    at(sheet, on ? P.sheet : null);
    sheet.rotation.x = on && P.sheet && P.sheet[1] > 1.05 ? 1.2 : 0;
    flagged.visible = (n.flagged ?? 0) > 0.1;
    okMark.visible = (n.checked ?? 0) > 0.5;
    at(pen, on ? P.pen : null);
    at(seal, on ? P.seal : null, RG.stamp);
    if (on) screen.set(liveS(paintS(n)));
    else screen.set(idleT);
  });
  out.work = marker(g, RG.keys[0], top + 0.03, RG.keys[2]);
}

// =============================================================================================
// 계약 상담 테이블 (reConsultTable, 3 × 2): an oak table, a couple across from the agent.

function consultTable(g: THREE.Group, out: Built, W: number) {
  const top = CT.top;
  part(g, rbox(W - 0.5, 0.05, 0.66, 0.02), OAK, 0, top - 0.025, -0.01);
  part(g, rbox(W - 0.62, 0.012, 0.48, 0.004), '#24513f', 0, top + 0.004, -0.01, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.06, top - 0.05, 0.06), OAK_D, sx * (W / 2 - 0.4), (top - 0.05) / 2, -0.01 + sz * 0.26);
  // A low panel with the office's name stands behind the clients, a small desk flag, a lamp.
  part(g, box(W - 0.3, 0.44, 0.05), OAK_D, 0, 0.22, -0.97);
  label(g, BRAND, 1.0, 0.16, 0, 0.26, -0.94, NAVY, '#ffffff');
  part(g, cyl(0.07, 0.09, 0.03, 14), BLACK, -1.02, top + 0.015, -0.18);
  part(g, cyl(0.012, 0.012, 0.3, 8), BLACK, -1.02, top + 0.16, -0.18);
  part(g, cyl(0.05, 0.11, 0.1, 14), AMBER, -1.02, top + 0.34, -0.18);
  // Pieces that stand on it: a folder pile, a tissue box, two cups, a calculator, the pad and the seal.
  for (let i = 0; i < 3; i++) part(g, rbox(0.24, 0.018, 0.32, 0.004), ['#27496d', '#d9c9a8', '#f4f1ea'][i], CT.pile[0], top + 0.012 + i * 0.018, CT.pile[2]);
  part(g, rbox(0.1, 0.02, 0.16, 0.006), BLACK, 0.74, top + 0.012, 0.16);
  part(g, box(0.08, 0.002, 0.03), '#c5e1a5', 0.74, top + 0.024, 0.11, { outline: false });
  for (const [x, z] of [[-0.62, -0.22], [0.66, -0.22]] as const) {
    part(g, cyl(0.035, 0.03, 0.07, 12), '#efe9de', x, top + 0.04, z);
    part(g, cyl(0.03, 0.03, 0.002, 12), '#a67b4b', x, top + 0.073, z, { outline: false });
  }
  inkPad(g, CT.pad[0], top, CT.pad[2]);
  const seal = sealMesh(g);
  // The chairs: the agent's, near; two for the clients, far.
  officeChair(g, 0, CT.seatZ, 1);
  woodChair(g, -0.36, CT.clientZ, -1);
  woodChair(g, 0.42, CT.clientZ, -1);
  const wife = person(g, LOOKS.wife, -0.36, CT.clientZ, 0, 'female', 0.47);
  const husband = person(g, LOOKS.husband, 0.42, CT.clientZ, 0, 'male', 0.47);
  // Always on the table: the contract in the middle.
  const con = sheetOf(g, contractTex(6));
  con.position.set(CT.pile[0], top + 0.05, CT.pile[2]);
  const flip = group(g);
  const leafPic = upright(flip, contractTex(7), 0.18, 0.25);
  leafPic.position.y = 0;
  const pg2 = contractTex(8, '특약 사항');
  const pgA = contractTex(6);
  const pageTop = swapPic(con, 0.18, 0.25, 0, 0.005, 0, 0, -Math.PI / 2);
  pageTop.set(pgA);
  const hl = part(con, box(0.13, 0.001, 0.018), '#ffee58', 0, 0.007, 0.02, { outline: false });
  // What ends up on it: signatures, seals, the copy passed over.
  const sign = part(con, box(0.05, 0.001, 0.012), '#1565c0', 0.05, 0.007, 0.09, { outline: false, ry: 0.25 });
  const myRed = part(con, cyl(0.017, 0.017, 0.001, 12), RED, 0.08, 0.008, 0.04, { outline: false });
  const theirRed = part(con, cyl(0.017, 0.017, 0.001, 12), RED, -0.05, 0.008, 0.09, { outline: false });
  const copy = sheetOf(g, contractTex(9));
  const cSeal = sealMesh(g);
  const clientPen = penMesh(g);
  const spots: Record<string, Spot> = { reExplainContract: seatAt(g, 'reExplain', CT.seatY, CT.seatZ), reSealContract: seatAt(g, 'reSeal', CT.seatY, CT.seatZ) };
  spots['*'] = spots.reExplainContract;
  const wifeHand = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const expl = now === 'reExplainContract';
    const seal_ = now === 'reSealContract';
    const on = expl || seal_;
    wife.root.visible = husband.root.visible = on;
    at(con, on ? P.sheet : null, [CT.pile[0], top + 0.05, CT.pile[2]]);
    // The turning leaf.
    const tu = n.turn ?? 0;
    flip.visible = expl && tu > 0.02 && tu < 0.98;
    if (flip.visible && P.sheet) {
      place(flip, P.sheet);
      flip.rotation.set(-Math.PI / 2 + (tu - 0.5) * 2.2, 0, 0);
    }
    pageTop.set((n.page ?? 0) > 0.5 ? pg2 : pgA);
    hl.visible = expl && (n.marked ?? 0) > 0.1;
    hl.scale.x = Math.max(0.02, n.marked ?? 0);
    sign.visible = seal_ && (n.signed ?? 0) > 0.3;
    sign.scale.x = Math.max(0.1, n.signed ?? 0);
    myRed.visible = seal_ && (n.mine ?? 0) > 0.5;
    theirRed.visible = seal_ && (n.theirs ?? 0) > 0.5;
    at(seal, seal_ ? P.seal : null, CT.seal);
    at(copy, seal_ ? P.copy : null);
    // The clients: listening, asking, signing, sealing, shaking.
    const signing = (n.signing ?? 0) > 0.5;
    const cs = n.cStamping ?? 0;
    const shake = (n.shaking ?? 0) > 0.5;
    if (on) {
      const tilt = (n.listen ?? 0) * 0.28;
      wife.head.rotation.x = tilt + (n.nod ?? 0) * 0.14 * Math.sin(t * 3);
      husband.head.rotation.x = tilt * 0.9 + (n.nod ?? 0) * 0.14 * Math.sin(t * 2.6 + 1);
      husband.head.rotation.y = (n.ask ?? 0) > 0.5 ? 0.15 : -0.08;
      wife.head.rotation.y = 0.1;
      if (expl && (n.ask ?? 0) > 0.5) {
        wife.armR(v3(-0.14 + 0.04 * Math.sin(t * 2), top + 0.1, -0.08));
        wife.armL(null);
      } else wife.armR(v3(-0.3, top + 0.04, -0.26));
      if (!signing && cs <= 0) wife.armL(v3(-0.44, top + 0.04, -0.26));
      husband.armL(v3(0.34, top + 0.04, -0.26));
      husband.armR(v3(0.5, top + 0.04, -0.26));
      if (signing) {
        wifeHand.set(CT.client[0] + 0.05 + 0.05 * Math.sin(t * 7), top + 0.03, CT.client[2] + 0.09);
        wife.armR(wifeHand);
        wife.head.rotation.x = 0.4;
        at(clientPen, [wifeHand.x, wifeHand.y, wifeHand.z]);
      } else clientPen.visible = false;
      if (cs > 0) {
        const dn = Math.abs(cs - 0.5) < 0.05;
        const y = dn ? top + 0.018 : top + 0.09 * (1 + Math.sin(cs * Math.PI) * 0.2);
        const seal2: V = [CT.client[0] - 0.05, y, CT.client[2] + 0.09];
        at(cSeal, seal2);
        wife.armR(v3(seal2[0], seal2[1] + 0.09, seal2[2]));
        wife.head.rotation.x = 0.36;
      } else at(cSeal, CT.cSeal);
      if (shake) {
        husband.armR(v3(CT.shake[0], CT.shake[1] + 0.018 * (n.shake ?? 0), CT.shake[2]));
        husband.head.rotation.x = -0.05;
      }
    } else {
      clientPen.visible = false;
      cSeal.visible = false;
    }
  });
  out.work = marker(g, CT.mid[0], top + 0.03, CT.mid[2]);
}

// =============================================================================================
// 아파트 평면 모형 (reFloorModel, 2 × 1): a flat in foam board, cut open; the roof comes off.

function floorModel(g: THREE.Group, out: Built, W: number) {
  const top = FM.top;
  part(g, rbox(W - 0.06, 0.05, 0.9, 0.012), '#f4f1ea', 0, top - 0.025, -0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.03, 0.022, top - 0.05, 8), OAK_D, sx * (W / 2 - 0.12), (top - 0.05) / 2, -0.02 + sz * 0.36);
  label(g, '은행나무 102동 84㎡', 0.8, 0.09, 0, top - 0.03, 0.435, NAVY, '#ffffff');
  // The plinth, walls in foam board, rooms with little furniture and a lamp each.
  const mx = 0;
  const mz = -0.08;
  const f = top + 0.012;
  part(g, box(1.28, 0.024, 0.62), '#dfe6dd', mx, f, mz);
  const wall = (x: number, z: number, w: number, d: number, h = 0.12) => part(g, box(w, h, d), '#fbfbf6', mx + x, f + 0.012 + h / 2, mz + z);
  wall(0, -0.29, 1.22, 0.012);
  wall(0, 0.29, 1.22, 0.012);
  wall(-0.61, 0, 0.012, 0.58);
  wall(0.61, 0, 0.012, 0.58);
  wall(-0.04, -0.13, 0.012, 0.3);
  wall(0.28, 0.0, 0.66, 0.012);
  wall(-0.34, 0.0, 0.54, 0.012);
  // 거실: sofa and table; 방: bed; 주방: counter, table; 욕실: tub.
  part(g, box(0.28, 0.035, 0.1), '#7da7ca', mx - 0.28, f + 0.03, mz - 0.22);
  part(g, box(0.15, 0.022, 0.09), '#a1785a', mx - 0.28, f + 0.024, mz - 0.1);
  part(g, box(0.22, 0.03, 0.15), '#f8bbd0', mx + 0.24, f + 0.03, mz - 0.17);
  part(g, box(0.22, 0.012, 0.03), '#ffffff', mx + 0.24, f + 0.05, mz - 0.23, { outline: false });
  part(g, box(0.42, 0.045, 0.055), '#b0bec5', mx - 0.32, f + 0.034, mz + 0.23);
  part(g, box(0.13, 0.03, 0.09), OAK, mx - 0.28, f + 0.03, mz + 0.1);
  part(g, box(0.17, 0.035, 0.08), '#e0f7fa', mx + 0.42, f + 0.03, mz + 0.2);
  part(g, box(0.22, 0.012, 0.15), '#c8e6c9', mx + 0.14, f + 0.018, mz + 0.14);
  const lights = FM.rooms.map(([x, z]) => {
    const m = ownLit(g, ball(0.018), '#efe8d2', x, f + 0.135, z);
    return m;
  });
  // The roof, a sheet of clear acrylic with a rim, lifted by its handles.
  const roof = group(g, 0, FM.hingeY, FM.hingeZ);
  const lidBody = group(roof, 0, 0, FM.lidLen / 2);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.01, 0.6), new THREE.MeshBasicMaterial({ color: GLASS_C, transparent: true, opacity: 0.36, depthWrite: false }));
  lid.userData.ownGeometry = lid.userData.ownMaterial = true;
  lidBody.add(lid);
  for (const sx of [-1, 1]) part(lidBody, box(0.02, 0.018, 0.6), '#90a4ae', sx * 0.63, 0, 0, { outline: false });
  for (const sz of [-1, 1]) part(lidBody, box(1.26, 0.018, 0.02), '#90a4ae', 0, 0, sz * 0.3, { outline: false });
  // Sun lamp on its stalk, and a pointer stick.
  const sun = group(g);
  ownLit(sun, ball(0.04), '#ffd54f', 0, 0, 0);
  part(sun, cyl(0.008, 0.008, 0.12, 6), BLACK, 0, -0.08, 0, { outline: false });
  const shadow = part(g, box(0.3, 0.001, 0.3), '#fff59d', 0, f + 0.016, mz, { outline: false });
  const stick = group(g);
  part(stick, cyl(0.005, 0.005, 0.3, 6), '#6d4c41', 0, 0.14, 0.05, { rx: 0.35, outline: false });
  const client = person(g, LOOKS.older, 1.18, 0.22, -Math.PI / 2 + 0.35, 'female');
  // Small brochures on the near corner.
  for (let i = 0; i < 3; i++) part(g, rbox(0.15, 0.008, 0.2, 0.003), ['#fff3e0', '#e3f2fd', '#e8f5e9'][i], 0.72, top + 0.006 + i * 0.008, 0.28);
  const spots: Record<string, Spot> = { reShowModel: standAt(g, 'reModel') };
  spots['*'] = spots.reShowModel;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const on = now === 'reShowModel';
    roof.rotation.x = -(on ? n.lid ?? 0 : 0) * FM.lidOpen;
    at(sun, on ? P.sun : null);
    shadow.visible = on && (n.sunOn ?? 0) > 0.5;
    if (shadow.visible) shadow.position.x = mx - 0.45 + (n.sun ?? 0) * 0.9;
    at(stick, on ? P.stick : null);
    const room = on ? n.room ?? -1 : -1;
    lights.forEach((m, i) => setLit(m, Math.round(room) === i ? '#ffeb3b' : '#efe8d2'));
    client.root.visible = on;
    if (on) {
      client.head.rotation.x = 0.34 + (n.nod ?? 0) * 0.14 * Math.sin(t * 3);
      client.armR(null);
      client.armL((n.nod ?? 0) > 0.5 ? v3(1.03, 1.0, 0.1) : null);
    }
  });
  out.work = marker(g, 0, top + 0.14, 0);
}

// =============================================================================================
// 손님 차 코너 (reTeaCorner, 3 × 1): a counter, a kettle, a shelf of cups; a low table and a guest.

function teaCorner(g: THREE.Group, out: Built) {
  const top = TC.top;
  const cx = -0.5;
  part(g, rbox(1.9, 0.04, 0.72, 0.012), '#efe6d6', cx, top - 0.02, -0.08);
  part(g, box(1.84, top - 0.04, 0.6), OAK, cx, (top - 0.04) / 2, -0.12);
  for (let i = 0; i < 3; i++) {
    const x = cx - 0.6 + i * 0.6;
    part(g, box(0.56, top - 0.14, 0.012), shade(OAK, 0.88), x, (top - 0.04) / 2, 0.185);
    part(g, ball(0.014), '#d4af37', x + 0.2, 0.55, 0.2, { outline: false });
  }
  // The wall shelf with tins and cups; a framed note.
  part(g, box(1.8, 0.03, 0.2), OAK_D, cx, 1.48, -0.34);
  for (let i = 0; i < 6; i++) part(g, cyl(0.05, 0.05, 0.12, 12), ['#a5d6a7', '#ffcc80', '#ce93d8', '#ef9a9a', '#90caf9', '#d7ccc8'][i], cx - 0.7 + i * 0.28, 1.56, -0.34);
  label(g, '오늘의 차 · 보리차 · 유자차', 0.9, 0.1, cx, 1.3, -0.4, '#fbf6e9', '#6d4c41');
  part(g, box(0.96, 0.13, 0.02), OAK_D, cx, 1.3, -0.42);
  part(g, cyl(0.06, 0.07, 0.03, 14), '#37474f', TC.kettle[0], top + 0.015, TC.kettle[2]);
  // The kettle, the tray with two cups, the water bottle, biscuits.
  const kettle = group(g);
  part(kettle, cyl(0.06, 0.08, 0.15, 14), CHROME, 0, 0.09, 0);
  part(kettle, ball(0.012), BLACK, 0, 0.18, 0, { outline: false });
  part(kettle, cyl(0.012, 0.02, 0.1, 8), CHROME, 0.08, 0.12, 0, { rz: -0.9, outline: false });
  part(kettle, box(0.02, 0.1, 0.03), BLACK, -0.09, 0.11, 0);
  const hotLed = ownLit(kettle, ball(0.01), '#3a1818', -0.02, 0.05, 0.07);
  const steam = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(ball(0.02), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
    m.userData.ownMaterial = true;
    m.position.set(0.14, 0.2 + i * 0.05, 0);
    kettle.add(m);
    return m;
  });
  const tray = group(g);
  part(tray, rbox(0.38, 0.016, 0.24, 0.008), '#6d4c41', 0, 0, 0);
  for (const sx of [-1, 1]) part(tray, box(0.008, 0.024, 0.24), '#5d4037', sx * 0.19, 0.016, 0, { outline: false });
  const dx = TC.cups[0][0] - TC.tray[0];
  const dx2 = TC.cups[1][0] - TC.tray[0];
  const cup = (x: number) => {
    part(tray, cyl(0.035, 0.028, 0.06, 12), '#f7f2e6', x, 0.038, -0.03);
    const tea = part(tray, cyl(0.031, 0.031, 0.002, 12), '#c49a4a', x, 0.062, -0.03, { outline: false });
    return tea;
  };
  const teas = [cup(dx), cup(dx2)];
  // The pour's thin stream.
  const stream = part(g, cyl(0.004, 0.004, 1, 5), '#d7ccc8', 0, 0, 0, { outline: false });
  // Water dispenser, cups in a stack.
  part(g, rbox(0.22, 0.24, 0.24, 0.02), '#e3f2fd', 0.18, top + 0.12, -0.26);
  part(g, cyl(0.1, 0.1, 0.28, 14), '#90caf9', 0.18, top + 0.38, -0.26);
  for (let i = 0; i < 5; i++) part(g, cyl(0.03, 0.026, 0.05, 10), '#efe9de', -1.26, top + 0.02 + i * 0.02, -0.25);
  // The guest's corner: a round table, a chair and a plant.
  const tb = TC.table;
  part(g, cyl(0.28, 0.28, 0.03, 18), OAK, tb[0], tb[1] - 0.023, tb[2]);
  part(g, cyl(0.03, 0.05, tb[1] - 0.04, 8), OAK_D, tb[0], (tb[1] - 0.04) / 2, tb[2]);
  part(g, cyl(0.16, 0.18, 0.02, 14), OAK_D, tb[0], 0.012, tb[2]);
  woodChair(g, TC.guest[0] + 0.14, TC.guest[1], -1);
  const guest = person(g, LOOKS.older, TC.guest[0] + 0.14, TC.guest[1], 0, 'male', 0.47);
  const spots: Record<string, Spot> = { reServeTea: standAt(g, 'reTea') };
  spots['*'] = spots.reServeTea;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const on = now === 'reServeTea';
    at(kettle, on ? P.kettle : null, TC.kettle);
    const tilt = n.tilt ?? 0;
    kettle.rotation.z = -tilt * 0.9;
    setLit(hotLed, (n.hot ?? 0) > 0.5 ? '#ff5252' : '#3a1818');
    const hot = (n.hot ?? 0) > 0.5;
    steam.forEach((m, i) => {
      m.visible = hot;
      m.position.y = 0.2 + ((t * 0.3 + i * 0.3) % 1) * 0.3;
    });
    at(tray, on ? P.tray : null, TC.tray);
    teas.forEach((m, i) => (m.visible = (n.fill ?? 0) * 2 > i + 0.4));
    stream.visible = tilt > 0.5;
    if (stream.visible && P.kettle) {
      const i = Math.round(n.which ?? 0);
      const x = TC.cups[i][0];
      const y0 = P.kettle[1] + 0.05;
      const y1 = top + 0.06;
      stream.position.set(x, (y0 + y1) / 2, TC.cups[i][1] + 0.01);
      stream.scale.y = y0 - y1;
    }
    guest.root.visible = on;
    if (on) {
      const served = (n.served ?? 0) > 0.5;
      guest.head.rotation.y = 0.3;
      guest.head.rotation.x = (n.gratitude ?? 0) * 0.3 * Math.sin(t * 3) ** 2;
      guest.armR(served ? v3(tb[0] + 0.1, tb[1] + 0.06, tb[2] - 0.06) : null);
    }
  });
  out.work = marker(g, TC.kettle[0], top + 0.1, TC.kettle[2]);
}

// =============================================================================================
// 매물 안내 창 (reListingWindow, 3 × 1): low on purpose; placed turned up, its street side is what the room's
// camera sees. Cards fill it with their text to the street (-z), blank to the room (+z).

function listingWindow(g: THREE.Group, out: Built, W: number) {
  const zc = LW.face;
  part(g, box(W - 0.04, 0.36, 0.3), NAVY, 0, 0.18, -0.26);
  // Frame.
  for (const sx of [-1, 0, 1]) part(g, box(0.05, 1.08, 0.08), NAVY_D, sx * (W / 2 - 0.05), 0.9, zc);
  part(g, box(W - 0.06, 0.05, 0.08), NAVY_D, 0, 1.42, zc);
  pane(g, W - 0.16, 1.0, 0, 0.9, zc + 0.03);
  pane(g, W - 0.16, 1.0, 0, 0.9, zc - 0.03);
  // Street-side: name band on the plinth and the top; the room sees the blank backs.
  label(g, `${BRAND} · 매물 안내`, 1.5, 0.16, 0, 0.2, -0.413, NAVY, '#ffffff', Math.PI);
  label(g, '전세 · 월세 · 매매 상담', 1.2, 0.12, 0, 0.18, -0.108, '#fbfaf5', NAVY);
  const rows = [1.14, 0.85, 0.56];
  let idx = 0;
  const makeCard = (i: number, x: number, y: number): THREE.Group => {
    const c = group(g, x, y, zc);
    const t = picture(c, cardTex(i), 0.42, 0.26, 0, 0, -0.004, '#ffffff', Math.PI);
    t.userData.front = true;
    part(c, box(0.42, 0.26, 0.002), '#f7f5ee', 0, 0, 0.003, { outline: false });
    part(c, box(0.3, 0.006, 0.001), '#cfd8dc', 0, 0.06, 0.005, { outline: false });
    return c;
  };
  for (const y of rows)
    for (let i = 0; i < 6; i++) {
      idx++;
      const x = -1.15 + i * 0.46;
      if (Math.abs(x - LW.slot[0]) < 0.1 && y === rows[1]) continue;
      makeCard(idx, x, y);
    }
  const old = makeCard(7, LW.slot[0], LW.slot[1]);
  const fresh = makeCard(10, LW.slot[0], LW.slot[1]);
  const cloth = group(g);
  part(cloth, rbox(0.11, 0.09, 0.02, 0.008), '#ffb300', 0, 0, 0);
  // New cards in a tray on the plinth's room side, a bottle of glass spray.
  const stack = group(g, LW.stack[0], LW.stack[1] - 0.05, LW.stack[2]);
  for (let i = 0; i < 4; i++) part(stack, box(0.28, 0.004, 0.2), i % 2 ? '#fff' : '#fdf2d8', 0, i * 0.006, 0, { outline: false });
  part(g, cyl(0.03, 0.035, 0.12, 8), '#4fc3f7', -1.3, 0.42, -0.18);
  const spots: Record<string, Spot> = { reChangeWindow: standAt(g, 'reWindow') };
  spots['*'] = spots.reChangeWindow;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const on = now === 'reChangeWindow';
    if (on && (n.fresh ?? 0) > 0.5) {
      old.visible = false;
      fresh.visible = true;
      place(fresh, LW.slot);
    } else if (on) {
      at(old, P.old, (n.gone ?? 0) > 0.5 ? undefined : LW.slot);
      at(fresh, P.fresh);
    } else {
      at(old, LW.slot);
      fresh.visible = false;
    }
    at(cloth, on ? P.cloth : null);
  });
  out.work = marker(g, LW.slot[0], LW.slot[1], LW.slot[2]);
}

// =============================================================================================
// 계약서 보관장 (reRecordWall, 3 × 1): binders by year, a licence in its frame, a safe, a clock.

function recordWall(g: THREE.Group, W: number) {
  const H = 2.0;
  part(g, box(W - 0.04, H, 0.04), OAK_D, 0, H / 2, -0.46);
  for (const sx of [-1, 0, 1]) part(g, box(0.04, H, 0.44), OAK, sx * (W / 2 - 0.04) * (sx === 0 ? 0 : 1), H / 2, -0.26);
  for (const y of [0.02, 0.48, 0.94, 1.4, 1.98]) part(g, box(W - 0.04, 0.03, 0.44), OAK, 0, y, -0.26);
  const r = seeded(53);
  const years = ['2019', '2020', '2021', '2022', '2023', '2024'];
  for (let row = 1; row <= 3; row++) {
    const y = [0.48, 0.94, 1.4][row - 1];
    for (let i = 0; i < 20; i++) {
      const x = -1.4 + i * 0.14;
      if (Math.abs(x) < 0.04) continue;
      if (row === 2 && x > 0.5) continue;
      const tone = ['#27496d', '#1b3550', '#7b5a40', '#546e7a'][Math.floor(r() * 4)];
      part(g, box(0.12, 0.34, 0.3), tone, x, y + 0.19, -0.26);
      label(g, years[(row + i) % 6], 0.09, 0.05, x, y + 0.2, -0.108, '#fbfaf5', INK);
    }
  }
  // The licence and the rate table on the open bay.
  const lic = painted('reLicence', 200, 260, (c) => {
    c.fillStyle = '#fbf7e8';
    c.fillRect(0, 0, 200, 260);
    c.strokeStyle = '#c9a24a';
    c.lineWidth = 6;
    c.strokeRect(8, 8, 184, 244);
    text(c, '중개사무소', 100, 48, 22, INK, 'center');
    text(c, '등록증', 100, 80, 26, INK, 'center');
    text(c, BRAND, 100, 130, 17, NAVY, 'center');
    text(c, '대표 방윤주', 100, 160, 16, INK, 'center');
    c.fillStyle = RED;
    c.beginPath();
    c.arc(150, 216, 18, 0, Math.PI * 2);
    c.fill();
  });
  picture(g, lic, 0.32, 0.42, 0.95, 1.2, -0.3);
  part(g, box(0.36, 0.46, 0.02), '#c9a24a', 0.95, 1.2, -0.31);
  // A small safe under them.
  part(g, rbox(0.56, 0.42, 0.38, 0.02), '#455a64', 0.78, 0.26, -0.26);
  part(g, cyl(0.05, 0.05, 0.02, 14), CHROME, 0.78, 0.28, -0.06, { rx: Math.PI / 2 });
  // A wall clock above.
  part(g, cyl(0.12, 0.12, 0.03, 20), '#fafafa', 0, 1.74, -0.1, { rx: Math.PI / 2 });
  part(g, box(0.01, 0.08, 0.004), BLACK, 0, 1.78, -0.08, { outline: false });
}

// =============================================================================================
// 매물 입간판 (reYardSign, 1 × 1): a folding board on the pavement.

function yardSign(g: THREE.Group) {
  const face = painted('reYardFace', 200, 280, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 200, 280);
    c.fillStyle = AMBER;
    c.fillRect(0, 0, 200, 60);
    text(c, '급매물 안내', 100, 31, 26, '#ffffff', 'center');
    LISTINGS.slice(0, 3).forEach(([k, n, p], i) => {
      text(c, k, 12, 90 + i * 58, 18, KIND_C[k]);
      text(c, n, 12, 112 + i * 58, 13, INK);
      text(c, p, 190, 90 + i * 58, 16, INK, 'right');
    });
    c.fillStyle = NAVY;
    c.fillRect(0, 248, 200, 32);
    text(c, BRAND, 100, 265, 17, '#ffffff', 'center');
  });
  const leaf = (sz: number) => {
    const m = group(g, 0, 0, sz * 0.1);
    m.rotation.x = sz * -0.14;
    part(m, box(0.56, 0.92, 0.02), NAVY, 0, 0.5, 0);
    picture(m, face, 0.5, 0.84, 0, 0.5, sz * 0.012, '#ffffff', sz > 0 ? 0 : Math.PI);
  };
  leaf(1);
  leaf(-1);
  part(g, box(0.5, 0.03, 0.03), '#37474f', 0, 0.97, 0);
}

// =============================================================================================
// 회사 차 (realtorCar, 2 × 1): a small white hatchback with the office's name on its doors.

function realtorCar(g: THREE.Group, out: Built, W: number) {
  const L = W - 0.04;
  const bw = 0.9;
  const body = '#f2f4f5';
  part(g, rbox(L, 0.36, bw, 0.1), body, 0, 0.42, 0);
  part(g, rbox(L * 0.62, 0.32, bw - 0.08, 0.1), body, -0.1, 0.74, 0);
  // Bonnet, glass, roof rails and bumpers.
  part(g, rbox(L * 0.26, 0.05, bw - 0.1, 0.02), body, 0.68, 0.61, 0, { rz: -0.08 });
  const glass = '#31475a';
  part(g, box(0.04, 0.26, bw - 0.14), glass, 0.5, 0.75, 0, { rz: -0.28 });
  part(g, box(0.04, 0.24, bw - 0.14), glass, -0.71, 0.75, 0, { rz: 0.2 });
  for (const sz of [-1, 1]) {
    part(g, box(0.5, 0.2, 0.005), glass, 0.15, 0.76, sz * (bw / 2 - 0.035), { outline: false });
    part(g, box(0.5, 0.2, 0.005), glass, -0.38, 0.76, sz * (bw / 2 - 0.035), { outline: false });
    for (const x of [0.6, -0.6]) {
      part(g, cyl(0.17, 0.17, 0.11, 16), BLACK, x, 0.17, sz * (bw / 2 - 0.04), { rx: Math.PI / 2 });
      part(g, cyl(0.09, 0.09, 0.115, 12), CHROME, x, 0.17, sz * (bw / 2 - 0.04), { rx: Math.PI / 2, outline: false });
    }
  }
  part(g, box(0.05, 0.1, bw - 0.08), '#37474f', L / 2 - 0.005, 0.32, 0);
  part(g, box(0.05, 0.1, bw - 0.08), '#37474f', -L / 2 + 0.005, 0.32, 0);
  for (const sz of [-1, 1]) {
    part(g, rbox(0.03, 0.06, 0.15, 0.01), '#fff59d', L / 2, 0.46, sz * 0.31, { outline: false });
    part(g, rbox(0.03, 0.08, 0.13, 0.01), '#ef5350', -L / 2, 0.5, sz * 0.32, { outline: false });
  }
  part(g, box(0.18, 0.05, 0.005), '#fafafa', L / 2 + 0.001, 0.31, 0, { ry: Math.PI / 2, outline: false });
  // The doors on the near side, each a hinged panel with its window and the sign on it.
  const door = (hx: number, len: number, sign: boolean) => {
    const d = group(g, hx, 0, CR.side);
    part(d, rbox(len, 0.36, 0.025, 0.012), body, -len / 2, 0.46, 0);
    part(d, box(len - 0.06, 0.2, 0.012), glass, -len / 2, 0.76, 0, { outline: false });
    part(d, rbox(0.07, 0.02, 0.018, 0.008), '#90a4ae', -len + 0.07, 0.59, 0.014, { outline: false });
    if (sign) label(d, BRAND, len - 0.06, 0.09, -len / 2, 0.46, 0.014, '#ffffff', NAVY);
    // The dark of the inside, seen when it's open.
    part(g, box(len - 0.02, 0.56, 0.006), '#263238', hx - len / 2, 0.58, CR.side - 0.012, { outline: false });
    return d;
  };
  const rear = door(CR.rearHinge, 0.5, false);
  const front = door(CR.frontHinge, 0.48, true);
  // The client, a head beyond the back window once they're in.
  const inHead = part(rear, ball(0.075), '#1c2730', -0.25, 0.78, 0.008, { outline: false });
  inHead.scale.z = 0.08;
  const folder = group(g);
  part(folder, rbox(0.25, 0.32, 0.03, 0.01), NAVY, 0, 0, 0);
  label(folder, '매물 안내', 0.2, 0.05, 0, 0.08, 0.017, '#ffffff', NAVY);
  const mobile = group(g);
  part(mobile, rbox(0.075, 0.15, 0.012, 0.012), BLACK, 0, 0, 0);
  part(mobile, box(0.065, 0.13, 0.001), '#90caf9', 0, 0, 0.007, { outline: false });
  const client = person(g, LOOKS.wife, -1.5, 0.6, Math.PI / 2, 'female');
  const spots: Record<string, Spot> = { reReadyTour: standAt(g, 'reCar') };
  spots['*'] = spots.reReadyTour;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const on = now === 'reReadyTour';
    rear.rotation.y = (on ? n.rear ?? 0 : 0) * 1.05;
    front.rotation.y = (on ? n.front ?? 0 : 0) * 1.05;
    at(folder, on ? P.folder : null);
    at(mobile, on ? P.mobile : null);
    const here = on && (n.clientHere ?? 0) > 0.5;
    client.root.visible = here;
    if (here) {
      const k = n.client ?? 0;
      // Up the pavement to the open door, then in.
      const x = -1.5 + k * 1.12;
      const z = k < 0.78 ? 0.6 : 0.6 - (k - 0.78) * 0.9;
      client.root.position.set(x, 0, z);
      client.root.rotation.y = k < 0.78 ? Math.PI / 2 : Math.PI * 0.85;
    }
    inHead.visible = on && (n.seated ?? 0) > 0.5;
  });
  out.work = marker(g, CR.frontHandle[0], CR.frontHandle[1], CR.frontHandle[2]);
}

// =============================================================================================

// =============================================================================================
// A street of shops (2026-11-04, the layout audit): the agency is one unit of a row, its neighbours beside it; its legally posted
// papers on the wall.

const NOL = { outline: false };

/**
 * 이웃 가게 (5 × 8): the next unit along the row, a one-storey block whose front faces the street (+z): its shopfront glass and
 * door, the awning and the sign of a made-up laundry or florist; its sides plain.
 */
function neighbourShop(g: THREE.Group, W: number, D: number, which: number) {
  const H = 3.6;
  const wall = which ? '#e6d8c3' : '#d7dde2';
  part(g, box(W - 0.05, H, D - 0.05), wall, 0, H / 2, 0);
  const zf = D / 2 + 0.01;
  const glass = new THREE.Mesh(box(W - 1.0, 2.0, 0.04), new THREE.MeshToonMaterial({ color: '#9ec5d6', transparent: true, opacity: 0.55, depthWrite: false }));
  glass.position.set(-0.3, 1.25, zf);
  g.add(glass);
  part(g, box(W - 0.9, 0.08, 0.06), '#455a64', -0.3, 2.28, zf, NOL);
  part(g, box(0.9, 2.1, 0.06), '#455a64', W / 2 - 0.75, 1.05, zf, NOL);
  const awning = which ? '#2e7d32' : '#1565c0';
  part(g, box(W - 0.2, 0.08, 0.9), awning, 0, 2.6, zf + 0.42, { rx: 0.25 });
  for (let i = 0; i < 5; i++) part(g, box((W - 0.2) / 10, 0.081, 0.9), '#ffffff', -W / 2 + 0.1 + (i * 2 + 1.5) * ((W - 0.2) / 10), 2.601, zf + 0.42, { rx: 0.25, outline: false });
  label(g, which ? '새봄꽃집' : '한빛세탁소', W - 1.0, 0.55, 0, 3.3, zf + 0.02, awning, '#ffffff');
  part(g, box(W, 0.15, D), '#9e9e9e', 0, H + 0.07, 0, NOL);
}

/** 게시 의무 액자 (1 × 1): the five papers a 중개사무소 must post where customers see them, framed in a row on the wall. */
function legalBoard(g: THREE.Group, D: number) {
  const zb = -D / 2 + 0.03;
  const names = ['등록증', '요율표', '자격증', '보증 증명', '사업자등록증'];
  names.forEach((n, i) => {
    const x = (i % 3) * 0.3 - 0.3;
    const y = i < 3 ? 1.75 : 1.38;
    part(g, rbox(0.26, 0.32, 0.03, 0.01), '#6d4c41', x + (i < 3 ? 0 : 0.15), y, zb);
    label(g, n, 0.22, 0.27, x + (i < 3 ? 0 : 0.15), y, zb + 0.018, '#fbfaf6', '#37474f');
  });
}

export const BUILDERS: Record<string, Builder> = {
  reNeighborShop(g, W, D) {
    neighbourShop(g, W, D, 0);
  },
  reNeighborFlorist(g, W, D) {
    neighbourShop(g, W, D, 1);
  },
  reLegalBoard(g, _W, D) {
    legalBoard(g, D);
  },
  realtorDesk(g, _W, _D, _c, _def, _ctx, out) {
    realtorDesk(g, out);
  },
  listingBoard(g, W, _D, _c, _def, _ctx, out) {
    listingBoard(g, out, W);
  },
  realtorCar(g, W, _D, _c, _def, _ctx, out) {
    realtorCar(g, out, W);
  },
  reConsultTable(g, W, _D, _c, _def, _ctx, out) {
    consultTable(g, out, W);
  },
  reDistrictMap(g, W, _D, _c, _def, _ctx, out) {
    districtMap(g, out, W);
  },
  reKeyCabinet(g, _W, _D, _c, _def, _ctx, out) {
    keyCabinet(g, out);
  },
  reFloorModel(g, W, _D, _c, _def, _ctx, out) {
    floorModel(g, out, W);
  },
  reRegistryTerminal(g, _W, _D, _c, _def, _ctx, out) {
    registryTerminal(g, out);
  },
  reTeaCorner(g, _W, _D, _c, _def, _ctx, out) {
    teaCorner(g, out);
  },
  reListingWindow(g, W, _D, _c, _def, _ctx, out) {
    listingWindow(g, out, W);
  },
  reRecordWall(g, W) {
    recordWall(g, W);
  },
  reYardSign(g) {
    yardSign(g);
  },
};
