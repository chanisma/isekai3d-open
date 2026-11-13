import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glowing, label, painted, picture, ring, seeded, text } from './doctor';
import * as BK from './bankerMotion';

/**
 * The 은행 지점 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a branch of the
 * made-up 한결은행 in its teal and gold, stone counters and walnut. The 창구 — a run of low counters,
 * each with its acrylic screen and the tray under it, the 대기번호 display on top calling the next
 * number, the teller's screen, keys, 통장 프린터, 지폐 계수기, cash drawer, 도장 and 인주, the 시재표,
 * the signature pad and the brochures on the customer's ledge, the teller's chair behind and the
 * 상담 의자 in front (the customer waits sat in it and is seen to there: the teller sat behind the
 * window facing them). The 여신 심사 desk with its applicant's chair across (the applicant drawn in
 * while their file's reviewed), the dealing terminal's four screens, the PB 상담 desk (a VIP drawn in
 * at the alarm, tea set out), and the round 금고 door that swings out on its hinge as it's opened.
 * And what the branch was missing (workFurniture/banker.ts): the 번호표 발권기, the 365 자동화코너,
 * the 서류 작성대 and the 금리 안내 전광판.
 *
 * The bank, its products and everyone in it are made up. What's on the counters goes by the same
 * clock as the hands (bankerMotion.ts): the passbook's in the printer when the hands feed it, the
 * stamp comes down as the hand does, the vault door swings as it's pulled.
 */

const BANK = '한결은행';
const BRAND = '#0f7a68';
const BRAND_D = '#0a5a4c';
const GOLD = '#d4a640';
const NAVY = '#1d2f4f';
const STONE = '#f1ece2';
const STONE_D = '#d9d1c2';
const WALNUT = '#6f4e37';
const WALNUT_D = '#563a28';
const NOTE50 = '#e8c46a';
const NOTE10 = '#9ccc65';
const PAPER = '#fbfaf6';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

/** The acrylic screen at a window, a vault's glass. */
const PANE = new THREE.MeshToonMaterial({ color: '#e3f2f8', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });

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
/** A spot sat at (the seat's top `y`, the floor `drop` below), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, drop = y): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, drop);
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
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
/** Which of a piece's uses is going on now (the spot a dweller's been posed at just now). */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (posed(s, t) && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const phaseOf = (m: THREE.Object3D) => BK.bkPhase(m.getWorldPosition(tmp));
/** A lit part with a material of its own, to be recoloured. */
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A picture whose texture is swapped (a display's number, a pad's signature). */
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; set: (t: THREE.Texture) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t) => {
      if (mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
/** A picture lying flat, its top away from +z, turned `ry` about the upright. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.set(-Math.PI / 2, ry, 0, 'YXZ');
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

// ---------------------------------------------------------------------------------------------
// People drawn in: an applicant across the 여신 desk, a VIP at the PB desk, a grandmother at the ATM.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'bob' | 'perm' | 'grey';
  skin?: string;
  shoes?: string;
  glasses?: boolean;
  tie?: string;
  /** A jacket over the top (open at the front). */
  jacket?: string;
  pearls?: boolean;
  /** A handbag on the arm. */
  bag?: string;
}
const SKIN = '#f1c9a5';
const LOOKS = {
  applicant: { top: '#eceff1', bottom: '#37474f', hair: '#2b1b10', hairdo: 'short', jacket: '#5d6d7e', shoes: '#3e2723' } as Look,
  vip: { top: '#fafafa', bottom: '#3a3a40', hair: '#b0b0b0', hairdo: 'grey', jacket: '#3a3a40', tie: '#8e2430', glasses: true, shoes: '#1a1a1a' } as Look,
  vipLady: { top: '#f3e5f5', bottom: '#4a3b52', hair: '#3b2a20', hairdo: 'bob', jacket: '#7b5e8c', pearls: true, shoes: '#2b2b30', bag: '#8d2b3a' } as Look,
  grandma: { top: '#e6d7c3', bottom: '#5d4f63', hair: '#c9c4bd', hairdo: 'perm', jacket: '#a1887f', shoes: '#5d4037', bag: '#6d4c41' } as Look,
};
interface Figure {
  root: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
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
      const ankle = v3(sx * 0.1, Math.max(0.1, sh - 0.3), 0.46);
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
  if (look.jacket) {
    for (const sx of [-1, 1]) part(root, rbox(0.13, 0.47, 0.226, 0.05), look.jacket, sx * 0.11, torsoY - 0.01, tz);
    part(root, rbox(0.35, 0.46, 0.1, 0.05), look.jacket, 0, torsoY - 0.01, tz - 0.065);
  }
  if (look.pearls) for (let k = 0; k < 9; k++) part(root, ball(0.012), '#fafafa', Math.sin((k / 8 - 0.5) * 2.2) * 0.07, torsoY + 0.2 - Math.cos((k / 8 - 0.5) * 2.2) * 0.05, tz + 0.108, { outline: false });
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'bob':
      part(head, ball(0.122), look.hair, 0, 0.025, -0.03);
      for (const sx of [-1, 1]) part(head, rbox(0.05, 0.16, 0.14, 0.025), look.hair, sx * 0.1, -0.03, -0.02);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    case 'perm':
      part(head, ball(0.118), look.hair, 0, 0.035, -0.03);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        part(head, ball(0.045), look.hair, Math.cos(a) * 0.09, 0.07 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.08, { outline: false });
      }
      break;
    case 'grey':
      part(head, ball(0.116), look.hair, 0, 0.03, -0.035);
      part(head, rbox(0.19, 0.04, 0.05, 0.02), look.hair, 0.01, 0.08, 0.07, { rx: -0.3, rz: 0.1 });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#37474f', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.112, { outline: false });
  }
  if (look.bag) {
    const bagY = sat ? sh + 0.1 : 0.78;
    part(root, rbox(0.22, 0.16, 0.08, 0.03), look.bag, sat ? 0 : -0.24, bagY, sat ? 0.22 : 0.02);
  }
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = sat ? v3(sx * 0.11, sh + 0.16, 0.24) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.jacket ?? look.top);
    const lower = limb(root, 0.035, look.jacket ?? look.top);
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

// ---------------------------------------------------------------------------------------------
// Pictures.

const logo = (c: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  // 한결은행's mark: a gold ring round a teal wave.
  c.fillStyle = GOLD;
  c.beginPath();
  c.arc(x, y, s, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = BRAND;
  c.beginPath();
  c.arc(x, y, s * 0.72, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#ffffff';
  c.lineWidth = s * 0.22;
  c.beginPath();
  c.moveTo(x - s * 0.5, y + s * 0.1);
  c.quadraticCurveTo(x - s * 0.2, y - s * 0.4, x, y + s * 0.05);
  c.quadraticCurveTo(x + s * 0.2, y + s * 0.45, x + s * 0.5, y - s * 0.15);
  c.stroke();
};
const tellerScreenTex = painted('bkTellerScreen', 256, 160, (c) => {
  c.fillStyle = '#eef3f2';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = BRAND;
  c.fillRect(0, 0, 256, 24);
  text(c, `${BANK} 창구단말 · 입출금`, 8, 12, 13, '#ffffff');
  const row = (k: string, v: string, y: number, vc = '#263238') => {
    c.fillStyle = '#cfd8dc';
    c.fillRect(8, y - 9, 70, 18);
    text(c, k, 12, y, 11, '#37474f');
    c.fillStyle = '#ffffff';
    c.fillRect(82, y - 9, 166, 18);
    text(c, v, 86, y, 12, vc);
  };
  row('계좌번호', '1002-***-482913', 40);
  row('성명', '김 ○ ○', 62);
  row('거래구분', '현금 출금', 84);
  row('거래금액', '₩ 300,000', 106, '#c62828');
  row('잔액', '₩ 2,415,880', 128);
  c.fillStyle = BRAND;
  c.fillRect(176, 140, 72, 16);
  text(c, '거래 실행', 212, 148, 11, '#ffffff', 'center');
});
const numTexes = new Map<string, THREE.Texture>();
/** The 대기번호 display: the window's number in green, the number called in red (bright as it's called). */
function numTex(win: number, num: number, flash: boolean): THREE.Texture {
  const key = `${win}|${num}|${flash}`;
  let t = numTexes.get(key);
  if (!t) {
    t = painted(`bkNum|${key}`, 192, 48, (c) => {
      c.fillStyle = flash ? '#2a0606' : '#0b0b0b';
      c.fillRect(0, 0, 192, 48);
      text(c, `${win}번`, 30, 25, 20, '#69f0ae', 'center');
      text(c, '▶', 66, 25, 16, '#69f0ae', 'center');
      text(c, String(num).padStart(4, '0'), 134, 26, 36, flash ? '#ff8a80' : '#ff3d2e', 'center');
    });
    numTexes.set(key, t);
  }
  return t;
}
const plateTexes = new Map<number, THREE.Texture>();
function plateTex(win: number): THREE.Texture {
  let t = plateTexes.get(win);
  if (!t) {
    t = painted(`bkPlate|${win}`, 256, 96, (c) => {
      c.fillStyle = BRAND;
      c.fillRect(0, 0, 256, 96);
      c.fillStyle = GOLD;
      c.fillRect(0, 86, 256, 10);
      logo(c, 34, 42, 22);
      text(c, `${win}번 창구`, 150, 34, 30, '#ffffff', 'center');
      text(c, win % 3 === 0 ? '상담 · 대출' : '입출금 · 빠른창구', 150, 68, 17, '#e0f2f1', 'center');
    });
    plateTexes.set(win, t);
  }
  return t;
}
const ledTexes = new Map<number, THREE.Texture>();
/** The 지폐 계수기's count. */
function ledTex(n: number): THREE.Texture {
  let t = ledTexes.get(n);
  if (!t) {
    t = painted(`bkLed|${n}`, 64, 24, (c) => {
      c.fillStyle = '#0d1a0d';
      c.fillRect(0, 0, 64, 24);
      text(c, String(n).padStart(3, '0'), 32, 13, 18, '#76ff03', 'center');
    });
    ledTexes.set(n, t);
  }
  return t;
}
const sigTexes: THREE.Texture[] = [0, 1, 2, 3, 4].map((k) =>
  painted(`bkSig|${k}`, 128, 80, (c) => {
    c.fillStyle = '#e8f0f2';
    c.fillRect(0, 0, 128, 80);
    text(c, '서명해 주세요', 64, 12, 11, '#546e7a', 'center');
    c.strokeStyle = '#90a4ae';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(14, 62);
    c.lineTo(114, 62);
    c.stroke();
    if (k > 0) {
      c.strokeStyle = '#1a237e';
      c.lineWidth = 2.5;
      c.beginPath();
      const r = seeded(7);
      c.moveTo(20, 54);
      for (let i = 0; i < k * 6; i++) c.lineTo(20 + i * 3.6, 40 + 16 * Math.sin(i * 1.3) * r());
      c.stroke();
    }
  }),
);
const slipTex = painted('bkSlip', 96, 128, (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 96, 128);
  c.fillStyle = '#c8e6c9';
  c.fillRect(0, 0, 96, 22);
  text(c, '출금전표', 48, 12, 14, '#1b5e20', 'center');
  c.strokeStyle = '#a5d6a7';
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(6, 36 + i * 15);
    c.lineTo(90, 36 + i * 15);
    c.stroke();
  }
  text(c, '₩ 300,000', 48, 52, 12, '#263238', 'center');
});
const ledgerTex = painted('bkLedger', 96, 128, (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 96, 128);
  text(c, '시재표', 48, 12, 13, '#263238', 'center');
  c.strokeStyle = '#b0bec5';
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.moveTo(6, 26 + i * 14);
    c.lineTo(90, 26 + i * 14);
    c.stroke();
  }
  ['5만원', '1만원', '5천원', '1천원', '합계'].forEach((s, i) => text(c, s, 8, 33 + i * 14, 9, '#455a64'));
});
const flyerTex = painted('bkFlyer', 96, 128, (c) => {
  c.fillStyle = '#fff8e1';
  c.fillRect(0, 0, 96, 128);
  c.fillStyle = BRAND;
  c.fillRect(0, 0, 96, 30);
  text(c, '한결 첫적금', 48, 15, 13, '#ffffff', 'center');
  text(c, '연', 22, 62, 14, '#c62828', 'center');
  text(c, '4.0%', 58, 62, 26, '#c62828', 'center');
  text(c, '특판 한정', 48, 92, 12, '#5d4037', 'center');
  text(c, '12개월 · 월 50만원', 48, 110, 9, '#5d4037', 'center');
});
const rateSheetTex = painted('bkRateSheet', 192, 256, (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 192, 256);
  c.fillStyle = BRAND;
  c.fillRect(0, 0, 192, 34);
  text(c, '예금 · 대출 금리 안내', 96, 17, 15, '#ffffff', 'center');
  const rows: Array<[string, string]> = [['정기예금 12개월', '3.45%'], ['자유적금', '3.80%'], ['주택담보대출', '4.12%~'], ['전세자금대출', '3.95%~'], ['신용대출', '5.30%~']];
  rows.forEach(([k, v], i) => {
    const y = 58 + i * 32;
    text(c, k, 12, y, 13, '#37474f');
    text(c, v, 180, y, 15, i < 2 ? '#1565c0' : '#c62828', 'right');
    c.strokeStyle = '#e0e0e0';
    c.beginPath();
    c.moveTo(10, y + 15);
    c.lineTo(182, y + 15);
    c.stroke();
  });
  text(c, '고객 확인 서명 ____________', 96, 236, 11, '#455a64', 'center');
});
const applicationTex = painted('bkApplication', 192, 256, (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 192, 256);
  text(c, '여신거래 신청서', 96, 20, 16, '#263238', 'center');
  c.strokeStyle = '#90a4ae';
  c.strokeRect(10, 36, 172, 150);
  ['신청인', '대출과목', '신청금액', '기간', '상환방법', '담보'].forEach((k, i) => {
    const y = 50 + i * 24;
    text(c, k, 16, y, 11, '#455a64');
    c.beginPath();
    c.moveTo(10, y + 12);
    c.lineTo(182, y + 12);
    c.stroke();
  });
  text(c, '₩ 50,000,000', 120, 98, 12, '#263238');
  c.strokeRect(124, 200, 56, 44);
  text(c, '승인', 152, 210, 10, '#455a64', 'center');
});
const creditTex = painted('bkCredit', 256, 160, (c) => {
  c.fillStyle = '#f4f7f6';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 256, 22);
  text(c, '여신심사 시스템 · 신용평가 조회', 8, 11, 11, '#ffffff');
  // The score gauge.
  c.lineWidth = 12;
  c.strokeStyle = '#cfd8dc';
  c.beginPath();
  c.arc(64, 100, 44, Math.PI, Math.PI * 2);
  c.stroke();
  c.strokeStyle = '#43a047';
  c.beginPath();
  c.arc(64, 100, 44, Math.PI, Math.PI * 1.8);
  c.stroke();
  text(c, '812점', 64, 92, 16, '#2e7d32', 'center');
  text(c, '2등급', 64, 116, 11, '#455a64', 'center');
  const row = (k: string, v: string, y: number, col = '#263238') => {
    text(c, k, 128, y, 11, '#546e7a');
    text(c, v, 248, y, 12, col, 'right');
  };
  row('연소득', '4,850만원', 44);
  row('DSR', '34.2%', 66, '#2e7d32');
  row('기존 대출', '1,200만원', 88);
  row('연체 이력', '없음', 110, '#2e7d32');
  row('한도', '5,000만원', 132, '#c62828');
});
const candleTex = painted('bkCandles', 256, 160, (c) => {
  c.fillStyle = '#0e1621';
  c.fillRect(0, 0, 256, 160);
  text(c, '종합지수  2,684.15  ▲12.40', 8, 12, 12, '#ff5252');
  c.strokeStyle = '#1e2a38';
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(0, 30 + i * 26);
    c.lineTo(256, 30 + i * 26);
    c.stroke();
  }
  const r = seeded(11);
  let y = 110;
  for (let i = 0; i < 24; i++) {
    const up = r() > 0.45;
    const h = 6 + r() * 16;
    const x = 8 + i * 10;
    c.fillStyle = up ? '#ff5252' : '#448aff';
    c.fillRect(x, up ? y - h : y, 6, h);
    c.fillRect(x + 2.5, (up ? y - h : y) - 4, 1, h + 8);
    y = Math.max(40, Math.min(140, y + (up ? -h * 0.6 : h * 0.5)));
  }
});
const bookTex = painted('bkOrderBook', 256, 160, (c) => {
  c.fillStyle = '#0e1621';
  c.fillRect(0, 0, 256, 160);
  text(c, '호가 · 체결', 8, 12, 12, '#cfd8dc');
  for (let i = 0; i < 6; i++) {
    const y = 30 + i * 11;
    c.fillStyle = '#1a3a6b';
    c.fillRect(128 - 20 - i * 9, y - 5, 20 + i * 9, 9);
    text(c, (71800 + (6 - i) * 100).toLocaleString(), 136, y, 10, '#448aff');
  }
  for (let i = 0; i < 6; i++) {
    const y = 98 + i * 11;
    c.fillStyle = '#6b1a1a';
    c.fillRect(128, y - 5, 18 + i * 8, 9);
    text(c, (71700 - i * 100).toLocaleString(), 60, y, 10, '#ff5252');
  }
});
const yieldTex = painted('bkYield', 256, 160, (c) => {
  c.fillStyle = '#0e1621';
  c.fillRect(0, 0, 256, 160);
  text(c, '금리 · 채권', 8, 12, 12, '#cfd8dc');
  const rows: Array<[string, string, boolean]> = [['국고채 3년', '3.214', true], ['국고채 10년', '3.452', false], ['CD 91일', '3.580', true], ['회사채 AA-', '4.012', false], ['기준금리', '3.25', true]];
  rows.forEach(([k, v, up], i) => {
    const y = 36 + i * 24;
    text(c, k, 10, y, 12, '#b0bec5');
    text(c, `${v} ${up ? '▲' : '▼'}`, 246, y, 13, up ? '#ff5252' : '#448aff', 'right');
  });
});
const newsTex = painted('bkNews', 256, 160, (c) => {
  c.fillStyle = '#101820';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#ffb300';
  c.fillRect(0, 0, 256, 20);
  text(c, '속보 · 마켓 뉴스', 8, 10, 11, '#101820');
  ['반도체 수출 석 달째 증가', '기준금리 동결 전망 우세', '원화 강세 이어져', '2차전지 업종 반등', '외국인 순매수 전환'].forEach((s, i) => text(c, `· ${s}`, 10, 36 + i * 24, 12, '#eceff1'));
});
const portfolioTex = painted('bkPortfolio', 192, 128, (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 192, 128);
  text(c, '자산 포트폴리오', 96, 12, 12, '#263238', 'center');
  const parts: Array<[number, string]> = [[0.4, BRAND], [0.25, '#1565c0'], [0.2, GOLD], [0.15, '#8e24aa']];
  let a = -Math.PI / 2;
  for (const [k, col] of parts) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(56, 72);
    c.arc(56, 72, 40, a, a + k * Math.PI * 2);
    c.fill();
    a += k * Math.PI * 2;
  }
  ['예금 40%', '채권 25%', '금 20%', '펀드 15%'].forEach((s, i) => {
    c.fillStyle = parts[i][1];
    c.fillRect(108, 40 + i * 20, 10, 10);
    text(c, s, 124, 46 + i * 20, 11, '#37474f');
  });
});
const reportTex = painted('bkReport', 128, 176, (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 128, 176);
  c.fillStyle = GOLD;
  c.fillRect(0, 150, 128, 6);
  logo(c, 64, 44, 18);
  text(c, '자산관리 보고서', 64, 92, 13, '#ffffff', 'center');
  text(c, 'PB센터', 64, 116, 11, '#e0e0e0', 'center');
});
const kioskTex = painted('bkKiosk', 160, 128, (c) => {
  c.fillStyle = '#f4f8f7';
  c.fillRect(0, 0, 160, 128);
  c.fillStyle = BRAND;
  c.fillRect(0, 0, 160, 22);
  text(c, '번호표를 뽑아 주세요', 80, 11, 12, '#ffffff', 'center');
  const btn = (s: string, x: number, y: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, 70, 44);
    text(c, s, x + 35, y + 22, 13, '#ffffff', 'center');
  };
  btn('입출금', 6, 30, BRAND);
  btn('상담·대출', 84, 30, '#1565c0');
  btn('외환', 6, 80, '#8e24aa');
  btn('기업', 84, 80, '#ef6c00');
});
const atmTex = painted('bkAtmScreen', 160, 120, (c) => {
  c.fillStyle = '#e8f3f1';
  c.fillRect(0, 0, 160, 120);
  c.fillStyle = BRAND;
  c.fillRect(0, 0, 160, 20);
  text(c, '원하시는 거래를 선택하세요', 80, 10, 10, '#ffffff', 'center');
  ['예금 출금', '예금 입금', '계좌 이체', '잔액 조회'].forEach((s, i) => {
    c.fillStyle = '#ffffff';
    c.fillRect(i % 2 ? 84 : 6, 28 + Math.floor(i / 2) * 44, 70, 36);
    text(c, s, (i % 2 ? 84 : 6) + 35, 46 + Math.floor(i / 2) * 44, 12, '#263238', 'center');
  });
});
const billTex = painted('bkBillScreen', 160, 120, (c) => {
  c.fillStyle = '#f3eefa';
  c.fillRect(0, 0, 160, 120);
  c.fillStyle = '#5e35b1';
  c.fillRect(0, 0, 160, 20);
  text(c, '통장정리 · 공과금 납부', 80, 10, 10, '#ffffff', 'center');
  text(c, '통장을 넣어 주세요', 80, 56, 13, '#37474f', 'center');
  text(c, '지로 · 세금 · 관리비', 80, 88, 11, '#5e35b1', 'center');
});
const boardTex = painted('bkRateBoard', 512, 256, (c) => {
  c.fillStyle = '#070a0f';
  c.fillRect(0, 0, 512, 256);
  c.fillStyle = BRAND_D;
  c.fillRect(0, 0, 512, 40);
  logo(c, 26, 20, 14);
  text(c, `${BANK} 오늘의 금리`, 50, 21, 20, '#ffffff');
  text(c, '2026. 10. 27', 500, 21, 16, '#ffe082', 'right');
  const rows: Array<[string, string, string]> = [['정기예금', '12개월', '3.45'], ['자유적금', '12개월', '3.80'], ['청년도약', '60개월', '4.50'], ['주택담보', '변동', '4.12'], ['신용대출', '최저', '5.30']];
  rows.forEach(([k, p, v], i) => {
    const y = 64 + i * 32;
    text(c, k, 14, y, 18, '#ffd54f');
    text(c, p, 130, y, 15, '#b0bec5');
    text(c, `${v}%`, 300, y, 22, i < 3 ? '#69f0ae' : '#ff8a80', 'right');
  });
  c.fillStyle = '#121a26';
  c.fillRect(324, 52, 178, 168);
  text(c, '호출 번호', 413, 72, 16, '#b0bec5', 'center');
});
const tickerTex = painted('bkTicker', 1024, 40, (c) => {
  c.fillStyle = '#050505';
  c.fillRect(0, 0, 1024, 40);
  text(c, `${BANK}을 찾아 주셔서 감사합니다  ·  수사기관과 금융기관은 전화로 돈을 요구하지 않습니다  ·  번호표를 뽑고 잠시 기다려 주세요  ·`, 8, 21, 20, '#ff9800');
});
const boardNumTexes = new Map<number, THREE.Texture>();
function boardNum(num: number, win: number): THREE.Texture {
  const key = num * 10 + win;
  let t = boardNumTexes.get(key);
  if (!t) {
    t = painted(`bkBoardNum|${key}`, 192, 128, (c) => {
      c.fillStyle = '#121a26';
      c.fillRect(0, 0, 192, 128);
      text(c, String(num).padStart(4, '0'), 96, 50, 52, '#ff3d2e', 'center');
      text(c, `${win}번 창구로 오세요`, 96, 104, 18, '#69f0ae', 'center');
    });
    boardNumTexes.set(key, t);
  }
  return t;
}

// ---------------------------------------------------------------------------------------------
// What lies on a teller's counter and moves with the hands: the passbook, the bills, the 신분증, the
// slip and its stamp mark, the stamp in the hand, a signature on the pad. Shared by the window (its
// own uses) and the 상담 의자 (seeing to the customer sat in it, drawn a tile in front of it).

interface CounterProps {
  apply(s: BK.TellerNow | null): void;
}
function counterProps(g: THREE.Object3D, ownStamp: boolean): CounterProps {
  const top = BK.TW.top;
  // The passbook: shut (teal, the gold mark) or open on its pages.
  const book = group(g);
  const shut = group(book);
  part(shut, rbox(0.09, 0.012, 0.13, 0.004), BRAND, 0, 0.006, 0);
  part(shut, ball(0.012), GOLD, 0, 0.013, -0.02, { outline: false }).scale.set(1, 0.2, 1);
  const open = group(book);
  part(open, box(0.18, 0.006, 0.13), PAPER, 0, 0.003, 0);
  part(open, box(0.004, 0.008, 0.13), BRAND, 0, 0.004, 0, { outline: false });
  for (let i = 0; i < 4; i++) part(open, box(0.07, 0.002, 0.004), '#78909c', 0.045, 0.007, -0.04 + i * 0.025, { outline: false });
  book.visible = false;
  // The bills in a fan.
  const bills = group(g);
  for (let i = 0; i < 4; i++) part(bills, box(0.15, 0.003, 0.07), i % 2 ? NOTE50 : shade(NOTE50, 0.94), 0, i * 0.004, 0, { ry: (i - 1.5) * 0.08, outline: false });
  bills.visible = false;
  const card = group(g);
  part(card, rbox(0.085, 0.004, 0.054, 0.002), '#e3f2fd', 0, 0.002, 0);
  part(card, box(0.022, 0.002, 0.028), '#90a4ae', -0.024, 0.005, 0, { outline: false });
  card.visible = false;
  const slip = group(g);
  place(slip, BK.TW.slip);
  flat(slip, slipTex, 0.1, 0.13, 0, 0.002, 0);
  const mark = glowing(slip, cyl(0.016, 0.016, 0.001, 16), '#d32f2f', 0.02, 0.0035, 0.03);
  slip.visible = false;
  // The stamp in the hand (the window keeps its own on the pad; the chair's shows only in the hand).
  const stamp = group(g);
  part(stamp, cyl(0.016, 0.02, 0.012, 12), '#b71c1c', 0, 0.006, 0, { outline: false });
  part(stamp, cyl(0.014, 0.017, 0.06, 12), '#8d6e63', 0, 0.042, 0);
  part(stamp, ball(0.02), '#6d4c41', 0, 0.08, 0);
  const rest: V = [0.45, top + 0.01, 0.2];
  place(stamp, rest);
  stamp.visible = ownStamp;
  // The signature written on the pad as they sign.
  const sig = swapPic(g, 0.16, 0.1, BK.TW.pad[0], BK.TW.pad[1] + 0.022, BK.TW.pad[2], Math.PI, -Math.PI / 2);
  sig.set(sigTexes[0]);
  sig.mesh.visible = false;
  return {
    apply(s) {
      book.visible = !!s?.book;
      if (s?.book) {
        place(book, s.book);
        shut.visible = !s.bookOpen;
        open.visible = s.bookOpen;
        // Fed into the printer it stands on its edge, slot-first.
        book.rotation.set(0, 0, 0);
      }
      bills.visible = !!s?.bills;
      if (s?.bills) place(bills, s.bills);
      card.visible = !!s?.card;
      if (s?.card) place(card, s.card);
      slip.visible = !!s?.slip;
      mark.visible = !!s?.stamped;
      if (s?.stamp) {
        stamp.visible = true;
        place(stamp, s.stamp);
      } else {
        stamp.visible = ownStamp;
        place(stamp, rest);
      }
      const k = s ? Math.round(s.sign * 4) : 0;
      sig.mesh.visible = k > 0;
      sig.set(sigTexes[k]);
    },
  };
}

/** A banker's swivel chair, its seat's top `seat` high, facing +z (turn the group). */
function swivel(g: THREE.Object3D, seat = 0.47, color = NAVY, tall = false) {
  part(g, cyl(0.035, 0.035, seat - 0.1, 8), BLACK, 0, (seat - 0.1) / 2 + 0.04, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(g, box(0.04, 0.03, 0.26), BLACK, Math.sin(a) * 0.12, 0.05, Math.cos(a) * 0.12, { ry: a, outline: false });
    part(g, ball(0.025), BLACK, Math.sin(a) * 0.24, 0.025, Math.cos(a) * 0.24, { outline: false });
  }
  part(g, rbox(0.46, 0.08, 0.44, 0.04), color, 0, seat - 0.04, 0);
  part(g, rbox(0.44, tall ? 0.7 : 0.46, 0.07, 0.04), color, 0, seat + (tall ? 0.42 : 0.3), -0.22, { rx: -0.08 });
  if (tall) part(g, rbox(0.3, 0.14, 0.08, 0.04), shade(color, 0.85), 0, seat + 0.82, -0.25);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.05, 0.03, 0.26, 0.012), BLACK, sx * 0.25, seat + 0.2, -0.02);
    part(g, box(0.025, 0.18, 0.025), BLACK, sx * 0.25, seat + 0.1, -0.12, { outline: false });
  }
}
/** A visitor's chair (four legs, padded), its seat's top `seat` high, facing +z. */
function guestChair(g: THREE.Object3D, color: string, seat = 0.46, arms = false) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.014, seat - 0.04, 8), CHROME, sx * 0.19, (seat - 0.04) / 2, sz * 0.18, { outline: false });
  part(g, rbox(0.46, 0.08, 0.44, 0.04), color, 0, seat - 0.04, 0);
  part(g, rbox(0.46, 0.44, 0.07, 0.04), color, 0, seat + 0.26, -0.21, { rx: -0.1 });
  for (const sx of [-1, 1]) rod(g, v3(sx * 0.19, seat - 0.06, -0.18), v3(sx * 0.19, seat + 0.1, -0.22), 0.014, CHROME);
  if (arms)
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, 0.04, 0.34, 0.015), shade(color, 0.8), sx * 0.24, seat + 0.2, -0.02);
      rod(g, v3(sx * 0.24, seat - 0.02, 0.1), v3(sx * 0.24, seat + 0.18, 0.1), 0.012, CHROME);
    }
}

// =============================================================================================
// The 창구 (tellerWindow).

/**
 * One window of the counter, turned so its front faces the staff side: the teller sits at the front
 * facing in, the customer across on the 상담 의자 a tile behind. On the customer's side the teal front
 * with the window's plate (which window it is, from where it stands), the stone ledge with its gold
 * edge, the brochure stand and a pen on its chain, the signature pad; the acrylic screen with its
 * speaking holes and the steel tray through under it, the 대기번호 display on top. On the teller's
 * desk the screen and keys, the 통장 프린터, the 지폐 계수기 (hopper, LED, pocket), the cash drawer, the
 * 호출 button, the 도장 and 인주, the pile of banded bundles and the 시재표.
 *
 * processTransaction (bkTeller): the number called, passbook and slip from the tray, printed,
 * keyed, stamped, cash from the drawer counted, all back in the tray. countCash (bkCount): a brick
 * through the counter, banded, piled, written up. Anything else (studying the products) is read sat
 * there.
 */
function tellerWindow(g: THREE.Group, out: Built) {
  const TW = BK.TW;
  const T = TW.top;
  // The counter: the teal front, the stone top across the tile, the panels under it.
  part(g, rbox(1.0, T - 0.05, 0.05, 0.01), BRAND, 0, (T - 0.05) / 2, TW.front + 0.025);
  part(g, box(1.0, 0.08, 0.054), BRAND_D, 0, 0.04, TW.front + 0.026, { outline: false });
  part(g, box(1.0, 0.02, 0.054), GOLD, 0, T - 0.11, TW.front + 0.026, { outline: false });
  part(g, rbox(1.0, 0.04, 0.72, 0.01), STONE, 0, T - 0.02, -0.1);
  part(g, box(1.0, 0.012, 0.012), GOLD, 0, T - 0.03, TW.front - 0.006, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.03, T - 0.04, 0.68), STONE_D, sx * 0.485, (T - 0.04) / 2, -0.1);
  part(g, rbox(0.26, 0.58, 0.44, 0.01), STONE_D, 0.355, 0.29, 0.0);
  const plate = swapPic(g, 0.5, 0.19, 0, 0.5, TW.front - 0.003, Math.PI);
  plate.set(plateTex(1));
  // The cash drawer under the top (slides out to the teller), its trays of notes.
  const drawer = group(g, 0.3, 0.66, 0);
  part(drawer, rbox(0.3, 0.09, 0.42, 0.01), '#b0a898', 0, 0, 0.04);
  part(drawer, box(0.24, 0.02, 0.012), CHROME, -0.05, 0.03, 0.255, { outline: false });
  ([[NOTE50, -0.09], [NOTE10, -0.03], ['#ffab91', 0.03], ['#90caf9', 0.09]] as const).forEach(([col, x]) => part(drawer, box(0.05, 0.03, 0.12), col, x, 0.03, 0.17, { outline: false }));
  // The acrylic screen: posts and a top bar, the pane over the tray's gap, the speaking holes.
  for (const sx of [-1, 1]) part(g, rbox(0.025, 0.62, 0.025, 0.008), CHROME, sx * 0.44, T + 0.31, TW.screenZ);
  part(g, box(0.9, 0.025, 0.025), CHROME, 0, T + 0.62, TW.screenZ);
  part(g, box(0.86, 0.52, 0.006), '#e3f2f8', 0, T + 0.34, TW.screenZ, { material: PANE, outline: false, shadow: false });
  for (let i = 0; i < 7; i++) part(g, ring(0.008 + i * 0.006, 0.0015), '#90a4ae', 0, 1.1, TW.screenZ - 0.004, { outline: false });
  // The tray through under it.
  part(g, rbox(0.3, 0.012, 0.2, 0.004), STEEL, TW.tray[0], T + 0.006, TW.tray[2]);
  part(g, box(0.3, 0.02, 0.006), STEEL, TW.tray[0], T + 0.014, TW.tray[2] - 0.1, { outline: false });
  // The 대기번호 display on top, on two stems.
  for (const sx of [-1, 1]) rod(g, v3(sx * 0.16, T + 0.63, TW.screenZ), v3(sx * 0.16, 1.41, TW.screenZ), 0.008, CHROME);
  part(g, rbox(0.5, 0.15, 0.07, 0.02), BLACK, 0, 1.48, TW.screenZ);
  const disp = swapPic(g, 0.46, 0.115, 0, 1.48, TW.screenZ - 0.036, Math.PI);
  label(g, BANK, 0.2, 0.05, 0, 1.48, TW.screenZ + 0.036, BLACK, '#80cbc4');
  // The customer's ledge: the brochure stand, a pen on its chain, the signature pad.
  part(g, box(0.1, 0.005, 0.05), '#cfd8dc', -0.34, T + 0.003, -0.38, { outline: false });
  const fly = picture(g, flyerTex, 0.09, 0.12, -0.34, T + 0.07, -0.37, '#ffffff', Math.PI);
  fly.rotation.x = 0.2;
  part(g, cyl(0.022, 0.026, 0.02, 12), '#455a64', -0.14, T + 0.01, -0.38);
  rod(g, v3(-0.13, T + 0.012, -0.36), v3(-0.02, T + 0.008, -0.34), 0.005, '#1565c0');
  for (let i = 0; i < 5; i++) part(g, ring(0.008, 0.0015), '#9e9e9e', -0.12 + i * 0.008, T + 0.02, -0.38, { outline: false });
  part(g, rbox(0.2, 0.02, 0.14, 0.008), '#37474f', TW.pad[0], TW.pad[1] + 0.0, TW.pad[2]);
  const padFace = swapPic(g, 0.16, 0.1, TW.pad[0], TW.pad[1] + 0.0115, TW.pad[2], Math.PI, -Math.PI / 2);
  padFace.set(sigTexes[0]);
  rod(g, v3(TW.pad[0] + 0.12, T + 0.01, TW.pad[2]), v3(TW.pad[0] + 0.12, T + 0.01, TW.pad[2] + 0.06), 0.004, '#212121');
  // The teller's screen and keys.
  part(g, cyl(0.07, 0.08, 0.012, 16), BLACK, -0.05, T + 0.006, -0.12);
  rod(g, v3(-0.05, T, -0.12), v3(-0.05, 0.92, -0.12), 0.015, BLACK);
  part(g, rbox(0.42, 0.27, 0.03, 0.01), BLACK, -0.05, 1.03, -0.11);
  const scr = picture(g, tellerScreenTex, 0.38, 0.235, -0.05, 1.03, -0.094);
  part(g, rbox(0.36, 0.02, 0.12, 0.006), '#2f3440', TW.keys[0], T + 0.01, TW.keys[2]);
  for (let i = 0; i < 4; i++) part(g, box(0.32, 0.004, 0.018), '#5c6370', TW.keys[0], T + 0.022, TW.keys[2] - 0.04 + i * 0.026, { outline: false });
  part(g, rbox(0.06, 0.02, 0.1, 0.02), '#2f3440', TW.keys[0] + 0.24, T + 0.01, TW.keys[2] + 0.02);
  // The 통장 프린터, its slot and lamp.
  part(g, rbox(0.3, 0.14, 0.24, 0.02), '#dcd6c8', TW.slot[0], T + 0.07, -0.05);
  part(g, box(0.2, 0.014, 0.01), BLACK, TW.slot[0], TW.slot[1], TW.slot[2] + 0.001, { outline: false });
  part(g, box(0.24, 0.008, 0.07), '#bdb5a6', TW.slot[0], TW.slot[1] - 0.025, TW.slot[2] + 0.03, { outline: false });
  label(g, '통장', 0.07, 0.03, TW.slot[0] - 0.1, T + 0.115, TW.slot[2] + 0.002, '#dcd6c8', '#5d4037');
  const lamp = ownLit(g, box(0.02, 0.012, 0.004), '#1b5e20', TW.slot[0] + 0.11, T + 0.115, TW.slot[2] + 0.002);
  // The 지폐 계수기: its body, the hopper on top, the pocket in front, the count.
  part(g, rbox(0.18, 0.15, 0.22, 0.02), '#eceff1', TW.hopper[0], T + 0.075, 0.0);
  part(g, rbox(0.15, 0.008, 0.1, 0.004), '#b0bec5', TW.hopper[0], TW.hopper[1] - 0.03, TW.hopper[2], { rx: 0.5 });
  for (const sx of [-1, 1]) part(g, box(0.006, 0.05, 0.1), '#90a4ae', TW.hopper[0] + sx * 0.08, TW.hopper[1] - 0.02, TW.hopper[2], { rx: 0.5, outline: false });
  part(g, box(0.15, 0.006, 0.08), '#90a4ae', TW.pocket[0], TW.pocket[1] - 0.02, TW.pocket[2], { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.006, 0.05, 0.08), '#90a4ae', TW.pocket[0] + sx * 0.08, TW.pocket[1], TW.pocket[2], { outline: false });
  const led = swapPic(g, 0.08, 0.03, TW.hopper[0], T + 0.12, 0.111);
  led.set(ledTex(0));
  const inHopper = part(g, box(0.14, 0.04, 0.07), NOTE50, TW.hopper[0], TW.hopper[1] - 0.005, TW.hopper[2], { rx: 0.5, outline: false });
  const inPocket = part(g, box(0.14, 0.04, 0.07), NOTE50, TW.pocket[0], TW.pocket[1] - 0.017, TW.pocket[2], { outline: false });
  // The brick of notes on its way through, and its 띠지.
  const brick = group(g);
  part(brick, rbox(0.15, 0.035, 0.07, 0.004), NOTE50, 0, 0, 0);
  const band = part(brick, box(0.03, 0.038, 0.074), '#fafafa', 0, 0, 0, { outline: false });
  brick.visible = false;
  // The pile of banded bundles.
  const pile = [0, 1, 2, 3, 4].map((i) => {
    const b = group(g, TW.stack[0], T + 0.018 + i * 0.03, TW.stack[2], (i % 2) * 0.06 - 0.03);
    part(b, rbox(0.15, 0.028, 0.07, 0.004), NOTE50, 0, 0, 0);
    part(b, box(0.03, 0.03, 0.074), '#fafafa', 0, 0, 0, { outline: false });
    return b;
  });
  // The 시재표 on its clipboard, the 호출 button, the 인주.
  part(g, rbox(0.12, 0.008, 0.16, 0.003), '#8d6e63', TW.ledger[0], T + 0.004, TW.ledger[2]);
  flat(g, ledgerTex, 0.1, 0.13, TW.ledger[0], T + 0.009, TW.ledger[2]);
  part(g, rbox(0.1, 0.03, 0.07, 0.01), '#37474f', TW.call[0], T + 0.015, TW.call[2]);
  const callCap = ownLit(g, cyl(0.02, 0.02, 0.012, 14), '#2e7d32', TW.call[0] - 0.02, T + 0.034, TW.call[2]);
  label(g, '호출', 0.04, 0.02, TW.call[0] + 0.025, T + 0.031, TW.call[2] + 0.036, '#37474f', '#ffffff');
  part(g, cyl(0.04, 0.04, 0.02, 16), '#b71c1c', TW.ink[0], T + 0.01, TW.ink[2]);
  glowing(g, cyl(0.032, 0.032, 0.002, 16), '#e53935', TW.ink[0], T + 0.021, TW.ink[2]);
  const props = counterProps(g, true);
  // The teller's chair, out over the front.
  const ch = group(g, 0, 0, TW.seat[2] + 0.06, Math.PI);
  swivel(ch, TW.seat[1] - 0.01);
  // The uses.
  const work = marker(g, TW.keys[0], TW.keys[1], TW.keys[2]);
  const book = marker(g, TW.book[0], TW.book[1], TW.book[2]);
  const spots: Record<string, Spot> = {
    processTransaction: sitAt(g, TW.seat[0], TW.seat[1], TW.seat[2], Math.PI, 'bkTeller', work),
    countCash: sitAt(g, TW.seat[0], TW.seat[1], TW.seat[2], Math.PI, 'bkCount', work),
    '*': sitAt(g, TW.seat[0], TW.seat[1], TW.seat[2], Math.PI, 'read', book),
  };
  out.spots = spots;
  out.work = work;
  out.screen = scr;
  let win = 0;
  let called = 0;
  let lastRound = -1;
  out.away = (_o, t) => {
    if (!win) {
      // Which window this is: numbered along the counter by where it stands.
      const p = g.getWorldPosition(tmp);
      win = 1 + (((Math.floor(p.x + 0.5) + Math.floor(p.z + 0.5)) % 6) + 6) % 6;
      plate.set(plateTex(win));
      called = 120 + win * 7;
    }
    const now = nowAt(spots, t);
    const ph = phaseOf(work);
    let drawn: BK.TellerNow | null = null;
    let flash = false;
    let count: BK.CountNow | null = null;
    if (now === 'processTransaction') {
      drawn = BK.tellerAt('bkTeller', t, ph);
      if (drawn.b.n !== lastRound && drawn.calling) {
        lastRound = drawn.b.n;
        called++;
      }
      flash = drawn.calling && Math.sin(t * 12) > -0.2;
    } else if (now === 'countCash') count = BK.countAt(t, ph);
    props.apply(drawn);
    disp.set(numTex(win, called, flash));
    (callCap.material as THREE.MeshBasicMaterial).color.set(flash ? '#b9f6ca' : '#2e7d32');
    (lamp.material as THREE.MeshBasicMaterial).color.set(drawn?.printing && Math.sin(t * 14) > 0 ? '#76ff03' : '#1b5e20');
    const dOpen = drawn?.drawer ?? count?.drawer ?? 0;
    drawer.position.z = TW.drawerOut * dOpen;
    // The counter at work.
    brick.visible = !!count?.brick;
    if (count?.brick) place(brick, count.brick);
    band.visible = !!count?.banded;
    inHopper.visible = !!count && count.hopper > 0.02;
    inHopper.scale.y = Math.max(0.05, count?.hopper ?? 0);
    inPocket.visible = !!count && count.pocket > 0.02;
    inPocket.scale.y = Math.max(0.05, count?.pocket ?? 0);
    if (count?.running) inHopper.position.x = TW.hopper[0] + 0.004 * Math.sin(t * 60);
    led.set(ledTex(count ? count.count : 0));
    const n = count ? count.pile : 2;
    pile.forEach((b, i) => (b.visible = i < n));
    ch.position.z = TW.seat[2] + 0.06 + (now ? -0.02 : 0.08);
  };
}

// =============================================================================================
// The 상담 의자 (bkCounterChair).

/**
 * The chair a customer sits on at a window, turned to the counter a tile in front of it: chrome legs,
 * a teal cushion and rounded back, the wire basket beside it for their bag (as every Korean bank
 * has). The customer waits sat in it, and is seen to there (waitSeats.ts, lot3d socialSpot): opening
 * an account (openAccount, bkOpen) — the 신분증 off the tray, keyed, the pad turned to them and their
 * signature written on it, a new passbook printed, stamped and given — or the rates talked through
 * (loanConsult, bkConsult): the rate sheet turned round and slid to them, a pen down its lines, the
 * calculator. The teller sits behind the window for both, facing them across it.
 */
function counterChair(g: THREE.Group, out: Built) {
  const TW = BK.TW;
  guestChair(g, BRAND, 0.46, true);
  out.seat = marker(g, 0, 0.46, 0.0);
  // The bag basket.
  const bk = group(g, 0.4, 0, 0.12);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(bk, cyl(0.008, 0.008, 0.36, 6), CHROME, sx * 0.1, 0.18, sz * 0.08, { outline: false });
  part(bk, box(0.22, 0.006, 0.18), '#b0bec5', 0, 0.2, 0, { outline: false });
  for (let i = 0; i < 4; i++) part(bk, box(0.22, 0.004, 0.004), CHROME, 0, 0.26 + i * 0.03, 0.09, { outline: false });
  for (let i = 0; i < 4; i++) part(bk, box(0.22, 0.004, 0.004), CHROME, 0, 0.26 + i * 0.03, -0.09, { outline: false });
  // What's out on the counter while the customer's seen to (a tile in front, in the window's frame).
  const fr = group(g, 0, 0, 1);
  const props = counterProps(fr, false);
  const sheet = group(fr);
  flat(sheet, rateSheetTex, 0.16, 0.22, 0, 0.002, 0);
  sheet.visible = false;
  const calc = group(fr, 0.08 + BK.CONSULT.calc[0], TW.top + 0.01, -0.08 + BK.CONSULT.calc[2]);
  part(calc, rbox(0.09, 0.014, 0.13, 0.006), '#37474f', 0, 0, 0);
  const calcLcd = ownLit(calc, box(0.07, 0.002, 0.025), '#9ccc65', 0, 0.008, -0.04);
  for (let i = 0; i < 12; i++) part(calc, box(0.016, 0.004, 0.014), '#eceff1', -0.025 + (i % 3) * 0.025, 0.009, -0.005 + Math.floor(i / 3) * 0.02, { outline: false });
  calc.visible = false;
  const seatAt = (motion: Motion, w: THREE.Object3D) => sitAt(g, TW.seat[0], TW.seat[1], TW.seat[2] + 1, Math.PI, motion, w);
  const keys = marker(g, TW.keys[0], TW.keys[1], TW.keys[2] + 1);
  const paper = marker(g, 0.08, TW.top + 0.03, -0.08 + 1);
  const spots: Record<string, Spot> = {
    'social:openAccount': seatAt('bkOpen', keys),
    'social:loanConsult': seatAt('bkConsult', paper),
  };
  out.spots = spots;
  const show = (t: number) => {
    const now = nowAt(spots, t);
    props.apply(now === 'social:openAccount' ? BK.tellerAt('bkOpen', t, phaseOf(keys)) : null);
    const c = now === 'social:loanConsult' ? BK.consultAt(t, phaseOf(paper)) : null;
    sheet.visible = calc.visible = !!c;
    if (c) {
      // Turned round to them and slid to the tray.
      sheet.position.set(0.08, TW.top + 0.004, -0.08 - 0.1 * c.turned);
      sheet.rotation.y = Math.PI * c.turned;
      (calcLcd.material as THREE.MeshBasicMaterial).color.set(c.calc && Math.sin(t * 9) > 0 ? '#c5e1a5' : '#9ccc65');
    }
  };
  out.away = (_o, t) => show(t);
}

// =============================================================================================
// The 여신 심사 desk (loanDesk).

/**
 * A loan officer's desk: walnut top on stone panels with a modesty panel across the middle, the
 * credit screen turned to the officer, the keys, the application file open on its binder, the
 * calculator, the 도장 and 인주, the in/out trays and the nameplate facing the applicant's chair
 * across at the back. Reviewing a file (reviewLoan, bkReview) the applicant's drawn in that chair: the
 * pages leafed, a finger down one, the calculator, the 도장 onto 승인, the application turned round
 * and slid to them (they sign), notes written. The credit report (creditReport) is typed up at the
 * screen, the chair rolled over to the keys.
 */
function loanDesk(g: THREE.Group, out: Built) {
  const LD = BK.LD;
  const T = LD.top;
  part(g, rbox(0.98, 0.04, 0.62, 0.01), WALNUT, 0, T - 0.02, -0.04);
  part(g, box(0.98, 0.01, 0.62), WALNUT_D, 0, T - 0.045, -0.04, { outline: false });
  for (const sx of [-1, 1]) part(g, rbox(0.04, T - 0.05, 0.58, 0.01), STONE_D, sx * 0.46, (T - 0.05) / 2, -0.04);
  part(g, box(0.9, 0.5, 0.02), STONE_D, 0, 0.42, -0.06, { outline: false });
  part(g, box(0.28, 0.05, 0.03), WALNUT_D, 0, T + 0.025, -0.31);
  label(g, '기업여신 심사', 0.26, 0.045, 0, T + 0.025, -0.326, WALNUT_D, '#ffe082', Math.PI);
  // The screen and keys.
  const mon = group(g, -0.28, T, -0.22, 0.3);
  part(mon, cyl(0.07, 0.08, 0.012, 16), BLACK, 0, 0.006, 0);
  rod(mon, v3(0, 0, 0), v3(0, 0.18, 0), 0.015, BLACK);
  part(mon, rbox(0.4, 0.26, 0.03, 0.01), BLACK, 0, 0.28, 0.01);
  const scr = picture(mon, creditTex, 0.36, 0.225, 0, 0.28, 0.027);
  part(g, rbox(0.3, 0.02, 0.11, 0.006), '#2f3440', LD.keys[0], T + 0.01, LD.keys[2]);
  for (let i = 0; i < 3; i++) part(g, box(0.27, 0.004, 0.018), '#5c6370', LD.keys[0], T + 0.022, LD.keys[2] - 0.03 + i * 0.028, { outline: false });
  // The trays at the back right, the files in them.
  for (let k = 0; k < 2; k++) {
    part(g, rbox(0.26, 0.012, 0.32, 0.004), '#455a64', 0.32, T + 0.01 + k * 0.08, -0.18);
    for (let i = 0; i < 3; i++) part(g, box(0.22, 0.008, 0.28), ['#fff59d', '#b3e5fc', '#ffccbc'][(i + k) % 3], 0.32, T + 0.022 + k * 0.08 + i * 0.01, -0.18, { outline: false });
  }
  for (const sx of [-1, 1]) part(g, box(0.008, 0.09, 0.32), '#455a64', 0.32 + sx * 0.13, T + 0.055, -0.18, { outline: false });
  // The application file: its binder open, the left pages, the right page that's turned.
  part(g, rbox(0.44, 0.012, 0.3, 0.004), '#1a237e', LD.file[0], T + 0.006, LD.file[2]);
  part(g, box(0.2, 0.012, 0.28), PAPER, LD.file[0] - 0.105, T + 0.016, LD.file[2], { outline: false });
  const right = group(g, LD.file[0] + 0.105, T + 0.017, LD.file[2]);
  flat(right, applicationTex, 0.2, 0.27, 0, 0.002, 0);
  const stampMark = glowing(right, cyl(0.016, 0.016, 0.001, 16), '#d32f2f', 0.058, 0.004, 0.1);
  const leaf = group(g, LD.file[0], T + 0.02, LD.file[2]);
  part(leaf, box(0.2, 0.002, 0.27), PAPER, 0.1, 0, 0, { outline: false });
  leaf.visible = false;
  // The application turned round to the applicant.
  const app = group(g);
  flat(app, applicationTex, 0.2, 0.27, 0, 0.002, 0);
  app.visible = false;
  // The calculator, the 인주 and 도장, the pen.
  part(g, rbox(0.1, 0.014, 0.14, 0.006), '#37474f', LD.calc[0], T + 0.007, LD.calc[2]);
  part(g, box(0.07, 0.002, 0.025), '#9ccc65', LD.calc[0], T + 0.015, LD.calc[2] - 0.045, { outline: false });
  for (let i = 0; i < 12; i++) part(g, box(0.017, 0.004, 0.015), '#eceff1', LD.calc[0] - 0.026 + (i % 3) * 0.026, T + 0.016, LD.calc[2] - 0.01 + Math.floor(i / 3) * 0.022, { outline: false });
  part(g, cyl(0.04, 0.04, 0.02, 16), '#b71c1c', LD.ink[0], T + 0.01, LD.ink[2]);
  glowing(g, cyl(0.032, 0.032, 0.002, 16), '#e53935', LD.ink[0], T + 0.021, LD.ink[2]);
  const stamp = group(g);
  part(stamp, cyl(0.014, 0.017, 0.06, 12), '#8d6e63', 0, 0.03, 0);
  part(stamp, ball(0.018), '#6d4c41', 0, 0.065, 0);
  const stampRest: V = [LD.ink[0] + 0.08, T + 0.002, LD.ink[2] + 0.02];
  place(stamp, stampRest);
  rod(g, v3(0.14, T + 0.006, 0.2), v3(0.22, T + 0.006, 0.16), 0.006, '#263238');
  // The officer's chair, and the applicant's across at the back.
  const ch = group(g, 0, 0, 0.62, Math.PI);
  swivel(ch, 0.47, '#37474f');
  const guest = group(g, 0, 0, -0.74);
  guestChair(guest, '#78909c');
  const applicant = person(g, LOOKS.applicant, 0, -0.72, 0, 0.46);
  applicant.root.visible = false;
  // The uses.
  const file = marker(g, LD.file[0], LD.file[1], LD.file[2]);
  const keys = marker(g, LD.keys[0], LD.keys[1], LD.keys[2]);
  const review = sitAt(g, LD.seat[0], LD.seat[1], LD.seat[2], Math.PI, 'bkReview', file);
  const spots: Record<string, Spot> = {
    reviewLoan: review,
    creditReport: sitAt(g, -0.14, LD.seat[1], LD.seat[2], Math.PI, 'type', keys),
    '*': sitAt(g, LD.seat[0], LD.seat[1], LD.seat[2], Math.PI, 'bkReview', file),
  };
  out.spots = spots;
  out.work = file;
  out.screen = scr;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const r = now === 'reviewLoan' || now === '*' ? BK.reviewAt(t, phaseOf(file)) : null;
    ch.position.x = now === 'creditReport' ? -0.14 : 0;
    ch.position.z = now ? 0.6 : 0.68;
    leaf.visible = !!r && r.flip > 0.01 && r.flip < 0.99;
    if (r) leaf.rotation.z = r.flip * Math.PI;
    if (r?.stamp) place(stamp, r.stamp);
    else place(stamp, stampRest);
    stampMark.visible = !!r?.stamped;
    const turned = r?.turned ?? 0;
    right.visible = turned < 0.05;
    app.visible = turned >= 0.05;
    if (app.visible) {
      app.position.set(LD.file[0] + 0.105 * (1 - turned), T + 0.02, LD.file[2] + (LD.across[2] - LD.file[2]) * turned);
      app.rotation.y = Math.PI * turned;
    }
    // The applicant waits with their hands in their lap; signs what's slid across to them.
    applicant.root.visible = now === 'reviewLoan';
    if (applicant.root.visible) {
      const signing = turned > 0.9 && r && r.b.from === 'turn' && r.b.u > 0.45;
      applicant.armR(signing ? v3(-0.03 + 0.03 * Math.sin(t * 5), T + 0.03, LD.across[2] - 0.06) : null);
      applicant.armL(turned > 0.5 ? v3(0.1, T + 0.02, LD.across[2] - 0.1) : null);
    }
  };
}

// =============================================================================================
// The 금융 단말기 (tradingTerminal).

/**
 * A dealing desk (the investment side; the 영업 본부 has one too): four screens on one arm (the index
 * chart in red and blue candles, the order book, the rates, the news wire), the keys, the mouse on
 * its pad, the dealing phone with its button panel and handset, a notepad, a tumbler. Watching the
 * market (monitorMarket, and the other uses sat there; bkTrade): the mouse across the charts, the
 * keys, a hand up to a screen, the handset to the ear with notes jotted. The screens light while
 * it's used.
 */
function tradingTerminal(g: THREE.Group, out: Built) {
  const TT = BK.TT;
  const T = 0.74;
  part(g, rbox(0.98, 0.04, 0.66, 0.01), '#4a4f57', 0, T - 0.02, -0.05);
  part(g, box(0.98, 0.012, 0.012), '#9e9e9e', 0, T - 0.02, 0.28, { outline: false });
  for (const sx of [-1, 1]) part(g, rbox(0.04, T - 0.04, 0.6, 0.01), '#3a3f47', sx * 0.46, (T - 0.04) / 2, -0.05);
  part(g, box(0.9, 0.36, 0.02), '#3a3f47', 0, 0.5, -0.34, { outline: false });
  part(g, rbox(0.2, 0.42, 0.42, 0.02), '#263238', -0.32, 0.22, -0.1);
  glowing(g, box(0.01, 0.01, 0.004), '#40c4ff', -0.25, 0.38, 0.112);
  // The monitor arm and its four screens.
  part(g, cyl(0.08, 0.1, 0.02, 16), BLACK, 0, T + 0.01, -0.32);
  rod(g, v3(0, T, -0.32), v3(0, 1.62, -0.32), 0.02, '#424242');
  part(g, box(0.9, 0.03, 0.03), '#424242', 0, 1.21, -0.31, { outline: false });
  const texes = [candleTex, bookTex, yieldTex, newsTex];
  const screens: THREE.Mesh[] = [];
  [[-0.22, 1.06], [0.22, 1.06], [-0.22, 1.36], [0.22, 1.36]].forEach(([x, y], i) => {
    const s = group(g, x, y, -0.27, x < 0 ? 0.16 : -0.16);
    part(s, rbox(0.43, 0.27, 0.03, 0.008), BLACK, 0, 0, 0);
    screens.push(picture(s, texes[i], 0.4, 0.245, 0, 0, 0.017, '#55606e'));
  });
  // The keys, the mouse, the dealing phone, the notepad, the tumbler, the nameplate.
  part(g, rbox(0.38, 0.02, 0.12, 0.006), '#2f3440', TT.keys[0], T + 0.01, TT.keys[2]);
  for (let i = 0; i < 4; i++) part(g, box(0.34, 0.004, 0.018), '#5c6370', TT.keys[0], T + 0.022, TT.keys[2] - 0.04 + i * 0.026, { outline: false });
  part(g, box(0.2, 0.004, 0.18), '#1e2228', TT.mouse[0], T + 0.002, TT.mouse[2], { outline: false });
  part(g, rbox(0.05, 0.025, 0.08, 0.02), '#1e2228', TT.mouse[0], T + 0.015, TT.mouse[2]);
  part(g, rbox(0.2, 0.05, 0.18, 0.01), '#37474f', TT.cradle[0], T + 0.025, TT.cradle[2] + 0.02, { rx: -0.2 });
  for (let i = 0; i < 12; i++) part(g, box(0.025, 0.006, 0.02), i % 4 === 0 ? '#ffb300' : '#cfd8dc', TT.cradle[0] - 0.06 + (i % 4) * 0.04, T + 0.054, TT.cradle[2] + 0.05 + Math.floor(i / 4) * 0.025 - 0.02, { rx: -0.2, outline: false });
  const handset = group(g);
  part(handset, rbox(0.05, 0.03, 0.2, 0.015), '#263238', 0, 0, 0);
  for (const sz of [-1, 1]) part(handset, rbox(0.055, 0.04, 0.05, 0.015), '#263238', 0, -0.012, sz * 0.08);
  const cradleAt: V = [TT.cradle[0] - 0.02, T + 0.07, TT.cradle[2] - 0.04];
  place(handset, cradleAt);
  part(g, box(0.12, 0.006, 0.16), '#fff59d', TT.pad[0], T + 0.003, TT.pad[2], { outline: false });
  for (let i = 0; i < 4; i++) part(g, box(0.08, 0.002, 0.003), '#5d4037', TT.pad[0] - 0.01, T + 0.007, TT.pad[2] - 0.05 + i * 0.025, { outline: false });
  part(g, cyl(0.035, 0.03, 0.15, 14), '#b0bec5', 0.42, T + 0.075, -0.12);
  // The chair.
  const ch = group(g, 0, 0, 0.64, Math.PI);
  swivel(ch, 0.47, '#263238');
  const keys = marker(g, TT.keys[0], TT.keys[1], TT.keys[2]);
  const trade = sitAt(g, TT.seat[0], TT.seat[1], TT.seat[2], Math.PI, 'bkTrade', keys);
  const spots: Record<string, Spot> = { monitorMarket: trade, '*': sitAt(g, TT.seat[0], TT.seat[1], TT.seat[2], Math.PI, 'bkTrade', keys) };
  out.spots = spots;
  out.work = keys;
  let lit = false;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    if (!!now !== lit) {
      lit = !!now;
      for (const s of screens) (s.material as THREE.MeshBasicMaterial).color.set(lit ? '#ffffff' : '#55606e');
    }
    ch.position.z = now ? 0.62 : 0.7;
    const tr = now ? BK.tradeAt(t, phaseOf(keys)) : null;
    const H = (spots[now ?? 'monitorMarket'].at.userData.height as number | undefined) ?? 1.6;
    if (tr && tr.phone > 0.02) {
      const ear = BK.earAt(H);
      handset.position.set(cradleAt[0] + (ear[0] - cradleAt[0]) * tr.phone, cradleAt[1] + (ear[1] - cradleAt[1]) * tr.phone, cradleAt[2] + (ear[2] - cradleAt[2]) * tr.phone);
      handset.rotation.set(-0.3 * tr.phone, 0, 1.3 * tr.phone);
    } else {
      place(handset, cradleAt);
      handset.rotation.set(0, 0, 0);
    }
  };
}

// =============================================================================================
// The PB 상담 desk (vipDesk).

/**
 * The private-banking desk in the VIP room: a walnut executive desk with a gold edge and a leather
 * top, the tall leather chair behind it, a leather armchair across for the client; on it the
 * portfolio folder and a tablet with the allocation, the bound 자산관리 보고서, a pen stand, the PB
 * nameplate and an orchid (the 축하 난 every branch office has). At the VIP alarm (vipBanking,
 * bkConsult) the client's drawn in the armchair and the tea set's out: the portfolio turned round to
 * them, a pen down it, the calculator, an open hand as it's explained, where to sign. The report
 * (prepareVipReport, and the other uses at the desk) is written up sat there.
 */
function vipDesk(g: THREE.Group, out: Built) {
  const T = 0.75;
  part(g, rbox(0.98, 0.05, 0.64, 0.012), WALNUT, 0, T - 0.025, -0.04);
  part(g, box(0.98, 0.012, 0.012), GOLD, 0, T - 0.03, 0.28, { outline: false });
  part(g, box(0.98, 0.012, 0.012), GOLD, 0, T - 0.03, -0.36, { outline: false });
  part(g, box(0.7, 0.004, 0.4), '#3e2723', 0, T + 0.002, -0.02, { outline: false });
  for (const sx of [-1, 1]) part(g, rbox(0.3, T - 0.06, 0.58, 0.012), WALNUT_D, sx * 0.34, (T - 0.06) / 2, -0.04);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) part(g, box(0.06, 0.012, 0.006), GOLD, sx * 0.34, 0.2 + k * 0.18, 0.252, { outline: false });
  part(g, box(0.38, 0.5, 0.02), WALNUT_D, 0, 0.44, -0.3, { outline: false });
  // On the desk.
  const folder = group(g, 0, T + 0.006, 0.0);
  part(folder, rbox(0.3, 0.01, 0.24, 0.004), '#4e342e', 0, 0, 0);
  flat(folder, portfolioTex, 0.24, 0.16, 0, 0.007, 0);
  const tab = group(g, -0.24, T + 0.006, 0.08, 0.2);
  part(tab, rbox(0.2, 0.012, 0.14, 0.008), BLACK, 0, 0, 0);
  flat(tab, portfolioTex, 0.18, 0.12, 0, 0.0065, 0);
  const rep = group(g, 0.22, T + 0.006, 0.1, -0.1);
  part(rep, rbox(0.15, 0.014, 0.2, 0.004), NAVY, 0, 0, 0);
  flat(rep, reportTex, 0.13, 0.18, 0, 0.0075, 0);
  part(g, rbox(0.12, 0.03, 0.06, 0.01), '#212121', 0.36, T + 0.015, -0.2);
  for (const sx of [-1, 1]) rod(g, v3(0.36 + sx * 0.025, T + 0.03, -0.2), v3(0.36 + sx * 0.04, T + 0.14, -0.23), 0.005, GOLD);
  label(g, 'PB센터 팀장', 0.2, 0.045, -0.05, T + 0.03, -0.34, '#3e2723', '#ffe082', Math.PI);
  part(g, box(0.22, 0.05, 0.02), '#3e2723', -0.05, T + 0.025, -0.33, { outline: false });
  // The orchid in its pot, a red ribbon.
  const orchid = group(g, -0.38, T, -0.22);
  part(orchid, cyl(0.06, 0.05, 0.12, 14), '#fafafa', 0, 0.06, 0);
  part(orchid, box(0.02, 0.1, 0.004), '#c62828', 0.0, 0.08, 0.062, { outline: false });
  for (let i = 0; i < 5; i++) part(orchid, box(0.02, 0.004, 0.16), '#2e7d32', 0, 0.13, 0, { ry: i * 0.6, rx: 0.3, outline: false });
  rod(orchid, v3(0, 0.12, 0), v3(0.02, 0.42, 0.02), 0.004, '#33691e');
  for (let i = 0; i < 4; i++) part(orchid, ball(0.022), '#f8bbd0', 0.02 + i * 0.025, 0.42 - i * 0.04, 0.03, { outline: false });
  // The tea set (out for a VIP): a pot and two cups on saucers.
  const tea = group(g);
  part(tea, cyl(0.045, 0.05, 0.08, 14), '#eceff1', 0.38, T + 0.045, 0.02);
  part(tea, ball(0.015), '#eceff1', 0.38, T + 0.095, 0.02);
  for (const [x, z] of [[0.2, -0.2], [0.2, 0.2]] as const) {
    part(tea, cyl(0.04, 0.04, 0.006, 14), '#eceff1', x, T + 0.004, z);
    part(tea, cyl(0.028, 0.022, 0.05, 14), '#eceff1', x, T + 0.03, z);
    glowing(tea, cyl(0.025, 0.025, 0.002, 14), '#c8a46b', x, T + 0.054, z);
  }
  tea.visible = false;
  // The chairs: the PB's tall leather one, the client's armchair across.
  const ch = group(g, 0, 0, 0.62, Math.PI);
  swivel(ch, 0.48, '#3e2723', true);
  const arm = group(g, 0, 0, -0.76);
  guestChair(arm, '#5d4037', 0.46, true);
  const vip = person(g, LOOKS.vip, 0, -0.74, 0, 0.46);
  vip.root.visible = false;
  const lady = person(g, LOOKS.vipLady, 0, -0.74, 0, 0.46);
  lady.root.visible = false;
  // The uses.
  const paper = marker(g, 0, T + 0.02, 0.0);
  const repAt = marker(g, 0.18, T + 0.02, 0.1);
  const spots: Record<string, Spot> = {
    vipBanking: sitAt(g, 0, 0.48, 0.56, Math.PI, 'bkConsult', paper),
    prepareVipReport: sitAt(g, 0.06, 0.48, 0.56, Math.PI, 'write', repAt),
    '*': sitAt(g, 0, 0.48, 0.56, Math.PI, 'write', paper),
  };
  out.spots = spots;
  out.work = paper;
  let visit = -1;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    ch.position.z = now ? 0.6 : 0.68;
    const c = now === 'vipBanking' ? BK.consultAt(t, phaseOf(paper)) : null;
    tea.visible = !!c;
    // A gentleman one visit, a lady the next.
    if (c && visit < 0) visit = Math.floor(t / 600) % 2;
    if (!c) visit = -1;
    const who = visit === 1 ? lady : vip;
    vip.root.visible = !!c && who === vip;
    lady.root.visible = !!c && who === lady;
    folder.rotation.y = c ? Math.PI * c.turned : 0;
    folder.position.z = c ? -0.1 * c.turned : 0;
    if (c) {
      const reach = c.b.from === 'sign' || (c.b.from === 'point' && c.b.u > 0.5);
      who.armR(reach ? v3(-0.05, T + 0.03, -0.18) : null);
      who.armL(c.b.from === 'talk' ? v3(0.18, T + 0.06, -0.2) : null);
    }
  };
}

// =============================================================================================
// The 금고 (vaultDoor).

const vaultFrameGeom = (() => {
  const s = new THREE.Shape();
  s.moveTo(-1, -1.125);
  s.lineTo(1, -1.125);
  s.lineTo(1, 1.125);
  s.lineTo(-1, 1.125);
  s.lineTo(-1, -1.125);
  const hole = new THREE.Path();
  hole.absarc(BK.VT.mid[0], BK.VT.mid[1] - 1.125, BK.VT.r + 0.02, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const geom = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false, curveSegments: 40 });
  geom.translate(0, 0, -0.07);
  return geom;
})();
/**
 * The vault: a steel wall with a round opening, a round door a hand's breadth thick hung at its right
 * on two great hinges, the spoked wheel in its middle, the combination dial and the plate, the
 * locking bolts round its edge. Behind, lit when it's open: shelves of 5만원 and 1만원 bricks, the
 * 대여금고 boxes in rows of numbered doors, gold bars; outside the yellow line, the 관계자 외 출입금지
 * sign, the time lock, a camera. Checking it (auditVault, bkVault): the wheel spun, a step aside and
 * the door pulled (it swings out by its own weight), the shelves counted off on a clipboard, a 대여금고
 * box drawn out and pushed home, signed for, swung shut and locked.
 */
function vaultDoor(g: THREE.Group, out: Built) {
  const VT = BK.VT;
  const [mx, my] = VT.mid;
  const faceZ = VT.hinge[1] - VT.thick / 2 - 0.02;
  // The wall and its round opening.
  const wall = part(g, vaultFrameGeom, '#8f9aa3', 0, 1.125, faceZ - 0.07);
  wall.castShadow = true;
  part(g, new THREE.TorusGeometry(VT.r + 0.03, 0.035, 10, 48), '#6f7a83', mx, my, faceZ + 0.005);
  // Inside.
  const back = -0.48;
  const inZ = faceZ - 0.14;
  part(g, box(1.6, 1.5, 0.02), '#cfc6b4', 0.1, 1.1, back);
  part(g, box(1.6, 0.02, inZ - back), '#9e9e9e', 0.1, 0.36, (inZ + back) / 2, { outline: false });
  const light = ownLit(g, box(0.9, 0.02, 0.04), '#5d5340', mx, 1.7, inZ - 0.04);
  // The cash shelves (centre right), each with its bricks.
  for (let k = 0; k < 3; k++) {
    const y = 0.72 + k * 0.28;
    part(g, box(0.62, 0.015, 0.22), STEEL, 0.33, y, back + 0.12, { outline: false });
    for (let i = 0; i < 5; i++) part(g, rbox(0.1, 0.07, 0.16, 0.006), (i + k) % 3 === 0 ? NOTE10 : NOTE50, 0.1 + i * 0.11, y + 0.043, back + 0.12);
  }
  // The gold.
  for (let i = 0; i < 6; i++) part(g, rbox(0.1, 0.035, 0.05, 0.006), '#f9c74f', 0.16 + (i % 3) * 0.11, 0.56 + Math.floor(i / 3) * 0.036, back + 0.1 + (i % 2) * 0.02);
  // The 대여금고: rows of small numbered doors (one drawn out in use).
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 3; c++) {
      const x = -0.36 + c * 0.11;
      const y = 0.68 + r * 0.16;
      part(g, rbox(0.1, 0.14, 0.02, 0.005), '#b8a882', x, y, inZ - 0.05);
      part(g, cyl(0.008, 0.008, 0.01, 8), GOLD, x + 0.03, y, inZ - 0.038, { rx: Math.PI / 2, outline: false });
    }
  const boxOut = group(g, VT.box[0], VT.box[1], VT.box[2]);
  part(boxOut, rbox(0.1, 0.12, 0.3, 0.006), '#c9b98f', 0, 0, -0.15);
  part(boxOut, box(0.06, 0.012, 0.012), GOLD, 0, 0, 0.004, { outline: false });
  // The door, hung at the right.
  const hinge = group(g, VT.hinge[0], 0, VT.hinge[1]);
  const door = group(hinge, -VT.r - 0.0, my, 0);
  part(door, cyl(VT.r, VT.r, VT.thick, 48), '#b9c2c9', 0, 0, 0, { rx: Math.PI / 2 });
  part(door, new THREE.TorusGeometry(VT.r - 0.08, 0.02, 8, 48), '#9aa4ac', 0, 0, VT.thick / 2);
  part(door, new THREE.TorusGeometry(VT.r - 0.22, 0.012, 8, 48), '#9aa4ac', 0, 0, VT.thick / 2);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    part(door, cyl(0.03, 0.03, 0.1, 10), CHROME, Math.cos(a) * (VT.r + 0.03), Math.sin(a) * (VT.r + 0.03), 0, { rz: a + Math.PI / 2, outline: false });
  }
  const wheel = group(door, 0, 0, VT.thick / 2 + 0.06);
  part(wheel, cyl(0.05, 0.05, 0.1, 16), CHROME, 0, 0, -0.03, { rx: Math.PI / 2 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(wheel, v3(0, 0, 0.01), v3(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.01), 0.014, CHROME);
    part(wheel, ball(0.03), BLACK, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.01, { outline: false });
  }
  // The combination dial, the plate.
  part(door, cyl(0.07, 0.07, 0.03, 24), BLACK, -0.36, 0.22, VT.thick / 2 + 0.015, { rx: Math.PI / 2 });
  part(door, cyl(0.05, 0.05, 0.035, 24), CHROME, -0.36, 0.22, VT.thick / 2 + 0.02, { rx: Math.PI / 2 });
  label(door, `${BANK} 금고`, 0.32, 0.07, 0, -0.38, VT.thick / 2 + 0.003, GOLD, '#3e2723');
  // The pull handle near the left edge.
  const hx = VT.handle[0] + VT.r;
  const hy = VT.handle[1] - my;
  for (const dy of [-0.1, 0.1]) rod(door, v3(hx, hy + dy, VT.thick / 2), v3(hx, hy + dy, VT.handle[2]), 0.012, CHROME);
  rod(door, v3(hx, hy - 0.11, VT.handle[2]), v3(hx, hy + 0.11, VT.handle[2]), 0.016, CHROME);
  // The hinges.
  for (const dy of [-0.3, 0.3]) {
    part(g, rbox(0.14, 0.18, 0.2, 0.02), '#6f7a83', VT.hinge[0] + 0.04, my + dy, VT.hinge[1] - 0.04);
    part(g, cyl(0.035, 0.035, 0.24, 12), CHROME, VT.hinge[0], my + dy, VT.hinge[1]);
  }
  // Outside: the yellow line, the sign, the time lock, the camera.
  part(g, box(1.9, 0.004, 0.06), '#fdd835', 0, 0.002, 0.42, { outline: false });
  for (let i = 0; i < 9; i++) part(g, box(0.08, 0.005, 0.06), BLACK, -0.85 + i * 0.21, 0.003, 0.42, { ry: 0.6, outline: false });
  label(g, '관계자 외 출입금지', 0.42, 0.09, -0.72, 1.95, faceZ + 0.003, '#c62828', '#ffffff');
  part(g, rbox(0.16, 0.22, 0.06, 0.01), '#455a64', -0.82, 1.35, faceZ + 0.03);
  label(g, 'TIME LOCK', 0.12, 0.03, -0.82, 1.42, faceZ + 0.061, '#455a64', '#ffffff');
  glowing(g, box(0.06, 0.025, 0.004), '#ff5252', -0.82, 1.32, faceZ + 0.062);
  part(g, ball(0.06), '#eceff1', 0.82, 2.08, faceZ + 0.06);
  part(g, ball(0.035), BLACK, 0.82, 2.05, faceZ + 0.1, { outline: false });
  // The clipboard on its hook, taken down to check.
  const clip = group(g);
  part(clip, rbox(0.18, 0.24, 0.01, 0.004), '#8d6e63', 0, 0, 0);
  part(clip, box(0.15, 0.2, 0.002), PAPER, 0, -0.01, 0.006, { outline: false });
  part(clip, rbox(0.08, 0.03, 0.015, 0.005), CHROME, 0, 0.11, 0.008);
  const hook: V = [-0.86, 1.0, faceZ + 0.02];
  place(clip, hook);
  // The use: the spot walks (bankerMotion vaultAt).
  const work = marker(g, BK.VT_WHEEL[0], BK.VT_WHEEL[1], BK.VT_WHEEL[2]);
  const check = standAt(g, 0.12, 0.66, Math.PI, 'bkVault', work);
  out.spots = { auditVault: check, '*': check };
  out.work = work;
  let swing = 0;
  out.away = (_o, t) => {
    const busy = posed(check, t);
    const s = busy ? BK.vaultAt(t, phaseOf(work)) : null;
    // Out of use it eases shut.
    swing = s ? s.door : swing * 0.9;
    hinge.rotation.y = swing;
    wheel.rotation.z = s ? -s.wheel : wheel.rotation.z * 0.9;
    boxOut.position.z = VT.box[2] + 0.25 * (s?.box ?? 0);
    (light.material as THREE.MeshBasicMaterial).color.set(swing > 0.2 ? '#fff3c4' : '#5d5340');
    if (s) {
      check.at.position.set(s.x, 0, s.z);
      check.at.rotation.y = s.yaw;
    } else {
      check.at.position.set(0.12, 0, 0.66);
      check.at.rotation.y = Math.PI;
    }
    const H = (check.at.userData.height as number | undefined) ?? 1.6;
    if (s?.clip) {
      const c = BK.clipAt(s.x, s.z, H);
      clip.position.set(c[0], c[1], c[2]);
      clip.rotation.set(-1.0, 0, 0);
    } else {
      place(clip, hook);
      clip.rotation.set(0, 0, 0);
    }
  };
}

// =============================================================================================
// What the branch was missing.

/**
 * The 번호표 발권기 by the door: a slim teal pedestal with the bank's mark, the touch screen tipped
 * back (입출금 · 상담·대출 · 외환 · 기업), the ticket slot with a ticket out, the 대기 인원 count on top.
 * Seeing a customer to a number (bkGuideTicket): the screen pressed for them and the ticket printed
 * and torn off, again and again as they come in.
 */
function ticketKiosk(g: THREE.Group, out: Built) {
  part(g, rbox(0.5, 0.05, 0.42, 0.01), '#9e9e9e', 0, 0.025, -0.1);
  part(g, rbox(0.42, 1.2, 0.3, 0.04), BRAND, 0, 0.65, -0.12);
  part(g, box(0.36, 0.9, 0.004), '#e0f2f1', 0, 0.55, 0.032, { outline: false });
  const mark = painted('bkKioskMark', 128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    logo(c, 64, 64, 44);
  });
  picture(g, mark, 0.16, 0.16, 0, 0.62, 0.036);
  label(g, BANK, 0.26, 0.05, 0, 0.44, 0.036, '#e0f2f1', BRAND_D);
  // The screen, tipped back.
  const head = group(g, 0, 1.27, -0.06);
  head.rotation.x = -0.45;
  part(head, rbox(0.44, 0.34, 0.06, 0.02), '#263238', 0, 0, 0);
  const scr = picture(head, kioskTex, 0.38, 0.29, 0, 0, 0.032);
  // The slot and the ticket.
  part(g, rbox(0.2, 0.05, 0.04, 0.01), '#263238', 0, 1.02, 0.04);
  const ticket = group(g, 0, 1.0, 0.06);
  part(ticket, box(0.08, 0.002, 0.11), '#fafafa', 0, 0, 0.055, { outline: false });
  const tnum = painted('bkTicketNum', 64, 96, (c) => {
    c.fillStyle = '#fafafa';
    c.fillRect(0, 0, 64, 96);
    text(c, BANK, 32, 12, 9, BRAND, 'center');
    text(c, '0132', 32, 46, 20, '#263238', 'center');
    text(c, '대기 3명', 32, 78, 9, '#546e7a', 'center');
  });
  flat(ticket, tnum, 0.075, 0.1, 0, 0.002, 0.055, Math.PI);
  label(g, '번호표 뽑는 곳', 0.36, 0.07, 0, 1.56, -0.12, BRAND_D, '#ffffff');
  part(g, rbox(0.4, 0.1, 0.04, 0.01), BRAND_D, 0, 1.56, -0.15);
  const work = marker(g, 0, 1.25, 0.04);
  const guide = standAt(g, 0.12, 0.58, Math.PI + 0.25, 'type', work);
  out.spots = { bkGuideTicket: guide, '*': guide };
  out.work = work;
  out.screen = scr;
  out.away = (_o, t) => {
    // Printed out over a few seconds, torn off, the next one coming.
    const k = posed(guide, t) ? Math.min(1, (((t / 4.5) % 1) + 1) % 1 / 0.6) : 0.5;
    ticket.scale.z = 0.2 + 0.8 * k;
  };
}

/**
 * The 365 자동화코너 against the wall: a teal header (365 · 한결 자동화코너), two machines in their
 * stone surround with a frosted divider — the ATM (its screen, card slot, keypad, the cash shutter,
 * the receipt) and the 통장정리·공과금 machine (the passbook slot, the bill reader) — the 보이스피싱
 * notice between them, a bin. Refilling the ATM (bkRefillAtm): its front swings open on the left and
 * the cash cassettes are slid in. Helping a grandmother through it (bkHelpAtm): she's drawn at the
 * ATM, the banker beside her pressing the screen for her.
 */
function atmCorner(g: THREE.Group, out: Built) {
  part(g, box(2.0, 2.3, 0.06), STONE_D, 0, 1.15, -0.47);
  part(g, rbox(2.0, 0.28, 0.1, 0.02), BRAND, 0, 2.15, -0.42);
  part(g, box(2.0, 0.03, 0.104), GOLD, 0, 2.0, -0.42, { outline: false });
  label(g, `365  ${BANK} 자동화코너`, 1.4, 0.16, 0, 2.15, -0.368, BRAND, '#ffffff');
  part(g, box(0.02, 1.7, 0.5), '#e0e0e0', 0, 0.95, -0.2, { material: PANE, outline: false, shadow: false });
  part(g, box(0.03, 1.7, 0.03), CHROME, 0, 0.95, 0.05);
  const machine = (x: number, atm: boolean) => {
    const m = group(g, x, 0, -0.22);
    const body = atm ? '#eceff1' : '#ede7f6';
    // Solid above, a cabinet below (the ATM's cassettes behind its front).
    part(m, rbox(0.66, 0.83, 0.5, 0.03), body, 0, 1.035, 0);
    part(m, rbox(0.66, 0.28, 0.5, 0.02), body, 0, 0.14, 0);
    for (const sx of [-1, 1]) part(m, box(0.02, 0.36, 0.5), body, sx * 0.32, 0.45, 0);
    part(m, box(0.64, 0.36, 0.02), shade(body, 0.7), 0, 0.45, -0.24, { outline: false });
    if (!atm) part(m, rbox(0.64, 0.34, 0.025, 0.01), '#e3dcef', 0, 0.45, 0.255);
    part(m, rbox(0.66, 0.1, 0.52, 0.02), atm ? BRAND : '#5e35b1', 0, 1.5, 0);
    // The sloping console.
    const con = group(m, 0, 1.0, 0.27);
    con.rotation.x = -0.35;
    part(con, rbox(0.6, 0.4, 0.06, 0.02), '#cfd8dc', 0, 0.12, 0);
    const scr = picture(con, atm ? atmTex : billTex, 0.36, 0.27, 0, 0.16, 0.032);
    for (let i = 0; i < 12; i++) part(con, rbox(0.03, 0.025, 0.01, 0.005), '#90a4ae', 0.2 + (i % 3) * 0.035, 0.05 + Math.floor(i / 3) * 0.035, 0.032, { outline: false });
    part(m, rbox(0.12, 0.03, 0.03, 0.01), BLACK, -0.2, 0.92, 0.26);
    part(m, box(0.3, 0.05, 0.02), '#37474f', 0, 0.78, 0.255, { outline: false });
    part(m, box(0.12, 0.01, 0.02), BLACK, 0.2, 0.92, 0.26, { outline: false });
    label(m, atm ? '입·출금' : '통장정리 · 공과금', 0.3, 0.05, 0, 1.5, 0.262, atm ? BRAND : '#5e35b1', '#ffffff');
    return { m, scr };
  };
  const atm = machine(-0.5, true);
  machine(0.5, false);
  // The ATM's front, hinged at its left, over the cassettes.
  const fasciaHinge = group(atm.m, -0.33, 0.45, 0.255);
  part(fasciaHinge, rbox(0.64, 0.34, 0.025, 0.01), '#dfe5e8', 0.32, 0, 0);
  label(fasciaHinge, '관리자', 0.12, 0.035, 0.52, 0.12, 0.014, '#dfe5e8', '#607d8b');
  for (let i = 0; i < 4; i++) part(atm.m, rbox(0.13, 0.26, 0.36, 0.01), '#78909c', -0.22 + i * 0.145, 0.45, 0.04);
  for (let i = 0; i < 4; i++) label(atm.m, i < 2 ? '5만원' : '1만원', 0.1, 0.035, -0.22 + i * 0.145, 0.52, 0.222, '#78909c', i < 2 ? '#ffe082' : '#c5e1a5');
  // The notice between, a bin.
  const notice = painted('bkPhishing', 96, 128, (c) => {
    c.fillStyle = '#fff3e0';
    c.fillRect(0, 0, 96, 128);
    c.fillStyle = '#e65100';
    c.fillRect(0, 0, 96, 28);
    text(c, '보이스피싱 주의', 48, 14, 12, '#ffffff', 'center');
    ['전화로 이체를', '요구하면', '100% 사기!', '가까운 지점에', '먼저 문의하세요'].forEach((s, i) => text(c, s, 48, 44 + i * 17, 10, i === 2 ? '#c62828' : '#4e342e', 'center'));
  });
  picture(g, notice, 0.18, 0.24, 0, 1.5, -0.43);
  part(g, cyl(0.1, 0.09, 0.3, 14), '#78909c', 0.9, 0.15, 0.22);
  // The grandmother at the ATM.
  const granny = person(g, LOOKS.grandma, -0.5, 0.6, Math.PI);
  granny.root.visible = false;
  const cassette = marker(g, -0.5, 0.48, 0.15);
  const screenAt = marker(g, -0.45, 1.14, 0.12);
  const refill = standAt(g, -0.5, 0.66, Math.PI, 'rummage', cassette);
  const help = standAt(g, 0.12, 0.6, Math.PI + 0.55, 'type', screenAt);
  out.spots = { bkRefillAtm: refill, bkHelpAtm: help, '*': refill };
  out.work = screenAt;
  out.screen = atm.scr;
  let open = 0;
  out.away = (_o, t) => {
    const refilling = posed(refill, t);
    open = THREE.MathUtils.lerp(open, refilling ? 1 : 0, 0.08);
    fasciaHinge.rotation.y = -1.7 * open;
    const helping = posed(help, t);
    granny.root.visible = helping;
    if (helping) {
      const tap = Math.sin(t * 0.8) > 0.3;
      granny.armR(tap ? v3(-0.5, 1.12, 0.18) : null);
      granny.armL(v3(-0.32, 0.9, 0.5));
    }
  };
}

/**
 * The 서류 작성대: a stone writing counter at standing height with a teal kick and a slanted top, the
 * rack of form pockets along the back (입금표 · 출금표 · 송금의뢰서 · 제신고서, each with its pad), the
 * pens on their coiled chains, the 돋보기 on its stand and the reading glasses in their tray, the 작성
 * 예시 under the glass, the 보이스피싱 notice. Restocking it (bkRestockForms): the pockets filled up
 * from a fresh pack.
 */
function formDesk(g: THREE.Group, out: Built) {
  const T = 1.0;
  part(g, rbox(1.9, T - 0.08, 0.5, 0.02), STONE_D, 0, (T - 0.08) / 2, -0.15);
  part(g, box(1.9, 0.1, 0.504), BRAND_D, 0, 0.05, -0.15, { outline: false });
  part(g, box(1.9, 0.02, 0.504), GOLD, 0, T - 0.2, -0.15, { outline: false });
  part(g, rbox(1.94, 0.04, 0.56, 0.01), STONE, 0, T - 0.04, -0.12, { rx: 0.08 });
  // The rack of pockets.
  part(g, rbox(1.9, 0.36, 0.08, 0.01), BRAND, 0, T + 0.2, -0.38);
  const forms: Array<[string, string]> = [['입금표', '#c8e6c9'], ['출금표', '#ffcdd2'], ['송금의뢰서', '#bbdefb'], ['제신고서', '#fff9c4']];
  const pads: THREE.Object3D[] = [];
  forms.forEach(([s, col], i) => {
    const x = -0.72 + i * 0.48;
    part(g, rbox(0.36, 0.2, 0.06, 0.008), '#e0f2f1', x, T + 0.15, -0.32);
    const pad = part(g, box(0.3, 0.16, 0.02), col, x, T + 0.17, -0.335, { outline: false });
    pads.push(pad);
    label(g, s, 0.3, 0.05, x, T + 0.3, -0.336, BRAND, '#ffffff');
  });
  // The pens on chains.
  for (const x of [-0.6, 0, 0.6]) {
    part(g, cyl(0.025, 0.03, 0.025, 12), '#455a64', x, T - 0.005, -0.25);
    rod(g, v3(x + 0.02, T - 0.0, -0.22), v3(x + 0.1, T - 0.008, -0.08), 0.006, '#1565c0');
    for (let i = 0; i < 6; i++) part(g, ring(0.01, 0.0018), '#9e9e9e', x + 0.01, T + 0.005, -0.24 + i * 0.012, { outline: false });
  }
  // The 작성 예시 under the glass.
  const sample = painted('bkSample', 128, 96, (c) => {
    c.fillStyle = '#fffde7';
    c.fillRect(0, 0, 128, 96);
    text(c, '작성 예시', 64, 12, 12, '#c62828', 'center');
    ['계좌번호: 1002-123-456789', '금액: 일금 삼십만원정', '성명: 홍 길 동 (인)'].forEach((s, i) => text(c, s, 8, 36 + i * 20, 10, '#37474f'));
  });
  flat(g, sample, 0.26, 0.19, -0.3, T - 0.015, -0.1);
  part(g, box(0.28, 0.003, 0.21), '#e3f2f8', -0.3, T - 0.012, -0.1, { material: PANE, outline: false, shadow: false });
  // The 돋보기 and the reading glasses.
  part(g, cyl(0.04, 0.05, 0.02, 14), '#37474f', 0.4, T, -0.18);
  rod(g, v3(0.4, T, -0.18), v3(0.42, T + 0.18, -0.1), 0.008, '#37474f');
  part(g, ring(0.06, 0.008), '#37474f', 0.42, T + 0.22, -0.08, { rx: -0.6 });
  part(g, cyl(0.058, 0.058, 0.004, 20), '#e3f2f8', 0.42, T + 0.22, -0.08, { rx: Math.PI / 2 - 0.6, material: PANE, outline: false });
  part(g, rbox(0.16, 0.03, 0.08, 0.01), '#8d6e63', 0.72, T + 0.0, -0.2);
  for (const sx of [-1, 1]) part(g, ring(0.022, 0.003), '#5d4037', 0.72 + sx * 0.035, T + 0.035, -0.2, { rx: -Math.PI / 2 });
  label(g, '돋보기', 0.1, 0.03, 0.72, T + 0.03, -0.158, '#8d6e63', '#ffffff');
  const work = marker(g, -0.24, T + 0.17, -0.3);
  const fill = standAt(g, -0.24, 0.58, Math.PI, 'rummage', work);
  out.spots = { bkRestockForms: fill, '*': fill };
  out.work = work;
  out.away = (_o, t) => {
    const busy = posed(fill, t);
    pads.forEach((p, i) => (p.scale.y = busy ? 0.4 + 0.6 * Math.min(1, ((t * 0.25 + i * 0.3) % 1.6) / 1.2) : 1));
  };
}

/**
 * The 금리 안내 전광판 on the wall over the waiting chairs: a black LED board in a teal frame — the
 * day's rates in yellow and green (정기예금, 자유적금, 청년도약, 주택담보, 신용대출), the 호출 번호 panel
 * calling the next number to its window, and the orange ticker running along the bottom. The number
 * on it goes up by itself every half minute or so.
 */
function rateBoard(g: THREE.Group, out: Built) {
  const z = -0.44;
  part(g, rbox(1.96, 1.06, 0.08, 0.02), BRAND_D, 0, 1.95, z);
  part(g, box(1.98, 0.02, 0.09), GOLD, 0, 1.43, z, { outline: false });
  picture(g, boardTex, 1.84, 0.82, 0, 2.02, z + 0.042);
  const num = swapPic(g, 0.64, 0.43, 0.57, 1.99, z + 0.044);
  const tick = picture(g, tickerTex, 1.84, 0.1, 0, 1.53, z + 0.042);
  const map = (tick.material as THREE.MeshBasicMaterial).map;
  if (map) map.repeat.set(0.5, 1);
  for (const sx of [-1, 1]) rod(g, v3(sx * 0.8, 2.48, z), v3(sx * 0.8, 2.7, z), 0.012, CHROME);
  let last = '';
  out.away = (_o, t) => {
    const n = Math.floor(t / 34);
    const key = `${n}`;
    if (key !== last) {
      last = key;
      num.set(boardNum(128 + (n % 60), 1 + (n % 3)));
    }
    if (map) map.offset.x = (t * 0.03) % 1;
  };
}

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /** The 창구: see tellerWindow(). */
  tellerWindow(g, _W, _D, _c, _def, _ctx, out) {
    tellerWindow(g, out);
  },
  /** The 창구 상담 의자: see counterChair(). */
  bkCounterChair(g, _W, _D, _c, _def, _ctx, out) {
    counterChair(g, out);
  },
  /** The 여신 심사 desk: see loanDesk(). */
  loanDesk(g, _W, _D, _c, _def, _ctx, out) {
    loanDesk(g, out);
  },
  /** The dealing desk: see tradingTerminal(). */
  tradingTerminal(g, _W, _D, _c, _def, _ctx, out) {
    tradingTerminal(g, out);
  },
  /** The PB 상담 desk: see vipDesk(). */
  vipDesk(g, _W, _D, _c, _def, _ctx, out) {
    vipDesk(g, out);
  },
  /** The vault: see vaultDoor(). */
  vaultDoor(g, _W, _D, _c, _def, _ctx, out) {
    vaultDoor(g, out);
  },
  /** The 번호표 발권기: see ticketKiosk(). */
  bkTicketKiosk(g, _W, _D, _c, _def, _ctx, out) {
    ticketKiosk(g, out);
  },
  /** The 365 자동화코너: see atmCorner(). */
  bkAtm(g, _W, _D, _c, _def, _ctx, out) {
    atmCorner(g, out);
  },
  /** The 서류 작성대: see formDesk(). */
  bkFormDesk(g, _W, _D, _c, _def, _ctx, out) {
    formDesk(g, out);
  },
  /** The 금리 안내 전광판: see rateBoard(). */
  bkRateBoard(g, _W, _D, _c, _def, _ctx, out) {
    rateBoard(g, out);
  },
};
