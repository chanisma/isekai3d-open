import * as THREE from 'three';
import type { BarOffset, Motion } from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, caster, glass, glowing, label, litScreen, painted, picture, seeded, text, type Paint } from './doctor';
import { oilKit } from './workExtraKits';
import { bayFront, bayWall } from './firefighter';
import { HANG, LEVER, hangPick, hangRound, impactRound, leverRound, lugNut, mechPhase, obdRound, underCarRound } from './mechanicMotion';

/**
 * The car repair shop drawn as itself (2026-10-27 workplace pipeline, at the user's request: a 카센터
 * should read as one, and working under a car should look like it). The two-post lift with a car on
 * its arms — lowered at rest, taken up overhead for work underneath (the mechanic stood under it,
 * arms up, ratcheting the oil pan's drain plug while the oil runs into the caddy's funnel, an LED bar
 * lit under the sills), just off the ground for a tyre (crouched at the front wheel with the impact
 * gun, the wheel off and back on), down with the bonnet up for a tow-in (steam off the radiator, a
 * light hung from the bonnet), with the driver's door open for the OBD scanner (plugged under the
 * dash, read on a tablet), and sat in at the wheel for a test run; the scan cart with the live data;
 * the tool wall with every tool's outline painted on the pegboard; the parts racks; and what the shop
 * was missing (workFurniture/mechanic.ts): the tyre changer and the balancer, the oil caddy, the
 * rolling tool chest, the 정비 접수 desk, and the customers' lounge — waiting chairs where the 차 주인
 * is shown the 견적서 or the worn part, the coffee vending machine and the TV.
 * The tool wall and the parts racks are other trades' too (a plumber's, a welder's), so nothing on
 * them is only a mechanic's.
 */

const LIFT_YELLOW = '#f2b705';
const RUBBER = '#1f1f22';
const TYRE = '#262629';
const OIL = '#5a3b12';
const RED = '#c62828';
const PAPER = '#fbfaf5';
const NAVY = '#263a5a';

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const tmp = new THREE.Vector3();
const phaseAt = (s: Spot) => mechPhase(s.at.getWorldPosition(tmp));
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D | undefined, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
/** Where an offset in the mechanic's frame (from `W`, facing `yaw`) is, in the piece's frame. */
function framer(W: THREE.Vector3, yaw: number) {
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return (o: BarOffset, v = new THREE.Vector3()) => v.copy(W).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
}
/** Points `o` (its +z) from `from` towards `to`, in its parent's frame. */
function aim(o: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  o.position.copy(from);
  const d = to.clone().sub(from);
  if (d.lengthSq() > 1e-8) o.quaternion.setFromUnitVectors(Z, d.normalize());
}
/** A unit-long rod (a hose, a lever, a stream) stretched from `a` to `b` each frame. */
function stretch(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  m.position.copy(a).add(b).multiplyScalar(0.5);
  const d = b.clone().sub(a);
  m.scale.set(1, Math.max(d.length(), 1e-4), 1);
  if (d.lengthSq() > 1e-10) m.quaternion.setFromUnitVectors(UP, d.normalize());
}
const unitRod = (g: THREE.Object3D, r: number, color: string) => part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false });
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** Steps `v` towards `to` at `rate` a second. */
const towards = (v: number, to: number, rate: number, dt: number) => (Math.abs(to - v) <= rate * dt ? to : v + Math.sign(to - v) * rate * dt);
/** Puffs of steam or exhaust: soft, see-through, fading by shrinking. */
const PUFF = new THREE.MeshBasicMaterial({ color: '#eef2f4', transparent: true, opacity: 0.55, depthWrite: false });
const SMOKE = new THREE.MeshBasicMaterial({ color: '#b0b6bb', transparent: true, opacity: 0.45, depthWrite: false });

// ---------------------------------------------------------------------------------------------
// What's painted: the screens, the forms, the signs.

const paintDiag: Paint = (c) => {
  c.fillStyle = '#10161c';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 512, 28);
  text(c, '차량 종합 진단 · OBD-II', 10, 15, 14, '#ffffff');
  text(c, '12가 3456 · 중형 세단 2.0', 502, 15, 12, '#bbdefb', 'right');
  // The fault codes.
  c.fillStyle = '#3a1418';
  c.fillRect(8, 36, 236, 104);
  text(c, '고장 코드 (DTC) 2건', 16, 50, 13, '#ff8a80');
  text(c, 'P0301', 16, 76, 15, '#ffeb3b');
  text(c, '1번 실린더 실화 감지', 76, 76, 12, '#ffffff', 'left', false);
  text(c, 'P0171', 16, 104, 15, '#ffeb3b');
  text(c, '연료 시스템 희박 (뱅크1)', 76, 104, 12, '#ffffff', 'left', false);
  text(c, '확정 · 경고등 ON', 16, 128, 11, '#ff8a80', 'left', false);
  // The live data.
  const rows: Array<[string, string]> = [
    ['엔진 회전수', '780 rpm'],
    ['냉각수 온도', '92 ℃'],
    ['흡입 공기량', '3.4 g/s'],
    ['단기 연료 보정', '+12.5 %'],
    ['배터리 전압', '14.1 V'],
  ];
  rows.forEach(([k, v], i) => {
    c.fillStyle = i % 2 ? '#18222b' : '#1d2a35';
    c.fillRect(252, 36 + i * 21, 252, 21);
    text(c, k, 260, 47 + i * 21, 12, '#b0bec5', 'left', false);
    text(c, v, 496, 47 + i * 21, 12, '#69f0ae', 'right');
  });
  // The rpm trace, stuttering where the cylinder misses.
  c.fillStyle = '#0b1015';
  c.fillRect(8, 148, 496, 134);
  c.strokeStyle = '#263238';
  for (let i = 1; i < 4; i++) {
    c.beginPath();
    c.moveTo(8, 148 + i * 33);
    c.lineTo(504, 148 + i * 33);
    c.stroke();
  }
  c.strokeStyle = '#4fc3f7';
  c.lineWidth = 2;
  c.beginPath();
  for (let x = 0; x < 496; x += 4) {
    const miss = x % 124 > 100 ? 26 : 0;
    const y = 214 + 10 * Math.sin(x * 0.12) + miss;
    if (x === 0) c.moveTo(8 + x, y);
    else c.lineTo(8 + x, y);
  }
  c.stroke();
  text(c, 'RPM', 14, 160, 11, '#4fc3f7');
  c.fillStyle = '#1565c0';
  c.fillRect(8, 290, 120, 24);
  c.fillRect(136, 290, 120, 24);
  c.fillStyle = '#e53935';
  c.fillRect(384, 290, 120, 24);
  text(c, '센서 데이터', 68, 302, 12, '#ffffff', 'center');
  text(c, '부품 테스트', 196, 302, 12, '#ffffff', 'center');
  text(c, '고장 코드 소거', 444, 302, 12, '#ffffff', 'center');
};
const paintJobs: Paint = (c) => {
  c.fillStyle = '#f4f6f8';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#37474f';
  c.fillRect(0, 0, 512, 30);
  text(c, '오늘의 작업 배정', 12, 16, 15, '#ffffff');
  text(c, '입고 7대 · 출고 4대', 500, 16, 12, '#cfd8dc', 'right');
  c.fillStyle = '#cfd8dc';
  c.fillRect(8, 38, 496, 24);
  ['작업대', '차량', '작업 내용', '담당', '상태'].forEach((h, i) => text(c, h, [16, 92, 196, 360, 440][i], 50, 12, '#263238'));
  const rows: Array<[string, string, string, string, string, string]> = [
    ['리프트 1', '12가 3456', '실화 점검 · 점화플러그', '피도훈', '진행 중', '#fb8c00'],
    ['리프트 2', '58나 1204', '타이어 4본 교체', '민서준', '대기', '#90a4ae'],
    ['진단', '33다 7781', '엔진 경고등 진단', '나', '진행 중', '#fb8c00'],
    ['리프트 1', '07라 5512', '엔진오일 · 필터', '피도훈', '완료', '#43a047'],
    ['출고', '91마 3320', '브레이크 패드', '강태훈', '출고 대기', '#1e88e5'],
  ];
  rows.forEach(([a, b, d, e, s, col], i) => {
    c.fillStyle = i % 2 ? '#ffffff' : '#eceff1';
    c.fillRect(8, 64 + i * 44, 496, 44);
    text(c, a, 16, 86 + i * 44, 12, '#37474f');
    text(c, b, 92, 86 + i * 44, 12, '#263238', 'left', false);
    text(c, d, 196, 86 + i * 44, 12, '#263238', 'left', false);
    text(c, e, 360, 86 + i * 44, 12, '#263238', 'left', false);
    c.fillStyle = col;
    c.fillRect(436, 74 + i * 44, 64, 24);
    text(c, s, 468, 86 + i * 44, 11, '#ffffff', 'center');
  });
};
const paintTablet: Paint = (c) => {
  c.fillStyle = '#0f1419';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 256, 20);
  text(c, 'OBD 스캐너 · 연결됨', 8, 11, 10, '#ffffff');
  c.fillStyle = '#69f0ae';
  c.beginPath();
  c.arc(244, 10, 4, 0, Math.PI * 2);
  c.fill();
  // Two gauges and the codes.
  for (const [x, v, k] of [[64, 0.32, '회전수'], [192, 0.62, '수온']] as const) {
    c.strokeStyle = '#37474f';
    c.lineWidth = 8;
    c.beginPath();
    c.arc(x, 78, 34, Math.PI * 0.8, Math.PI * 2.2);
    c.stroke();
    c.strokeStyle = '#4fc3f7';
    c.beginPath();
    c.arc(x, 78, 34, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * v));
    c.stroke();
    text(c, k, x, 82, 11, '#ffffff', 'center');
  }
  c.fillStyle = '#3a1418';
  c.fillRect(8, 122, 240, 46);
  text(c, '고장 코드 2건  P0301 · P0171', 14, 136, 11, '#ffeb3b');
  text(c, '1번 실린더 실화 감지', 14, 156, 10, '#ffffff', 'left', false);
};
const paintIntake: Paint = (c) => {
  c.fillStyle = '#f5f7f9';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#c62828';
  c.fillRect(0, 0, 512, 30);
  text(c, '정비 접수 · 견적', 12, 16, 15, '#ffffff');
  text(c, '접수번호 1027-014', 500, 16, 12, '#ffcdd2', 'right');
  const rows: Array<[string, string]> = [
    ['차량번호', '12가 3456'],
    ['차종', '중형 세단 2.0 가솔린 (2019)'],
    ['주행거리', '84,213 km'],
    ['고객 요청', '시동 시 떨림, 엔진 경고등 점등'],
  ];
  rows.forEach(([k, v], i) => {
    c.fillStyle = i % 2 ? '#ffffff' : '#eef1f4';
    c.fillRect(8, 38 + i * 30, 496, 30);
    text(c, k, 18, 53 + i * 30, 12, '#78909c');
    text(c, v, 120, 53 + i * 30, 13, '#263238', 'left', false);
  });
  c.fillStyle = '#ffebee';
  c.fillRect(8, 162, 496, 24);
  ['항목', '수량', '금액'].forEach((h, i) => text(c, h, [18, 330, 496][i], 174, 12, '#b71c1c', i === 2 ? 'right' : 'left'));
  const items: Array<[string, string, string]> = [
    ['점화플러그 교환', '4', '48,000'],
    ['점화코일 (1번)', '1', '65,000'],
    ['스로틀 바디 클리닝', '1', '30,000'],
    ['공임', '', '40,000'],
  ];
  items.forEach(([a, n, p], i) => {
    text(c, a, 18, 200 + i * 22, 12, '#263238', 'left', false);
    text(c, n, 334, 200 + i * 22, 12, '#263238', 'left', false);
    text(c, p, 496, 200 + i * 22, 12, '#263238', 'right', false);
  });
  c.fillStyle = '#263238';
  c.fillRect(8, 290, 496, 24);
  text(c, '합계 (VAT 포함)', 18, 302, 12, '#ffffff');
  text(c, '200,300원', 496, 302, 13, '#ffeb3b', 'right');
};
const paintQuote: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 192, 256);
  text(c, '견 적 서', 96, 22, 18, '#212121', 'center');
  c.fillStyle = '#212121';
  c.fillRect(56, 34, 80, 2);
  text(c, '12가 3456  귀하', 12, 50, 10, '#37474f');
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.moveTo(10, 64 + i * 20);
    c.lineTo(182, 64 + i * 20);
    c.stroke();
  }
  const rows: Array<[string, string]> = [
    ['점화플러그', '48,000'],
    ['점화코일', '65,000'],
    ['스로틀 클리닝', '30,000'],
    ['공임', '40,000'],
    ['부가세', '18,300'],
  ];
  rows.forEach(([a, p], i) => {
    text(c, a, 14, 75 + i * 20, 10, '#263238', 'left', false);
    text(c, p, 178, 75 + i * 20, 10, '#263238', 'right', false);
  });
  text(c, '합계', 14, 176, 11, '#b71c1c');
  text(c, '200,300원', 178, 176, 12, '#b71c1c', 'right');
  text(c, '○○자동차정비', 120, 226, 10, '#37474f', 'center');
  c.strokeStyle = '#d32f2f';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(166, 226, 13, 0, Math.PI * 2);
  c.stroke();
  text(c, '인', 166, 227, 11, '#d32f2f', 'center');
};
const paintMenu: Paint = (c) => {
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 192, 256);
  text(c, '정비 요금 안내', 96, 22, 15, '#ffca28', 'center');
  const rows: Array<[string, string]> = [
    ['엔진오일 교환', '45,000~'],
    ['타이어 교체(1본)', '15,000~'],
    ['휠 얼라인먼트', '40,000'],
    ['휠 밸런스', '20,000'],
    ['브레이크 패드', '60,000~'],
    ['배터리 교체', '90,000~'],
    ['에어컨 가스', '50,000'],
  ];
  rows.forEach(([a, p], i) => {
    text(c, a, 12, 52 + i * 27, 11, '#ffffff', 'left', false);
    text(c, p, 182, 52 + i * 27, 11, '#80deea', 'right');
  });
  text(c, '부품값 별도 · 카드 가능', 96, 242, 10, '#b0bec5', 'center', false);
};
const paintVending: Paint = (c) => {
  c.fillStyle = '#b71c1c';
  c.fillRect(0, 0, 256, 320);
  // The big picture of a cup of coffee, steam over it.
  const gr = c.createLinearGradient(0, 0, 0, 200);
  gr.addColorStop(0, '#5d4037');
  gr.addColorStop(1, '#2b1a12');
  c.fillStyle = gr;
  c.fillRect(14, 14, 228, 186);
  c.fillStyle = '#f5f0e6';
  c.beginPath();
  c.moveTo(88, 96);
  c.lineTo(168, 96);
  c.lineTo(158, 178);
  c.lineTo(98, 178);
  c.closePath();
  c.fill();
  c.fillStyle = '#c62828';
  c.fillRect(94, 124, 68, 22);
  c.fillStyle = '#8d5a3b';
  c.beginPath();
  c.ellipse(128, 96, 40, 8, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.lineWidth = 3;
  for (const x of [114, 130, 146]) {
    c.beginPath();
    c.moveTo(x, 84);
    c.bezierCurveTo(x - 8, 70, x + 8, 58, x, 44);
    c.stroke();
  }
  text(c, '커피', 128, 28 + 8, 22, '#ffe082', 'center');
  text(c, 'COFFEE', 128, 192, 12, '#ffe082', 'center');
  // The menu.
  const items = ['밀크커피', '블랙커피', '고급커피', '율무차', '코코아', '녹차'];
  items.forEach((s, i) => {
    const x = 14 + (i % 2) * 116;
    const y = 212 + Math.floor(i / 2) * 34;
    c.fillStyle = '#fff8e1';
    c.fillRect(x, y, 110, 28);
    text(c, s, x + 8, y + 14, 12, '#4e342e');
    text(c, '400', x + 102, y + 14, 11, '#c62828', 'right');
  });
};
const paintBaseball: Paint = (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 288);
  gr.addColorStop(0, '#2e7d32');
  gr.addColorStop(1, '#1b5e20');
  c.fillStyle = gr;
  c.fillRect(0, 0, 512, 288);
  // The infield from behind the pitcher.
  c.fillStyle = '#b8865b';
  c.beginPath();
  c.moveTo(256, 120);
  c.lineTo(400, 230);
  c.lineTo(256, 300);
  c.lineTo(112, 230);
  c.closePath();
  c.fill();
  c.fillStyle = '#ffffff';
  for (const [x, y] of [[256, 128], [392, 228], [120, 228]]) c.fillRect(x - 6, y - 4, 12, 8);
  c.fillStyle = '#c49a6c';
  c.beginPath();
  c.ellipse(256, 210, 26, 10, 0, 0, Math.PI * 2);
  c.fill();
  // The pitcher, the batter far off.
  c.fillStyle = '#eeeeee';
  c.fillRect(250, 168, 12, 34);
  c.fillStyle = '#0d47a1';
  c.beginPath();
  c.arc(256, 164, 7, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#9e9e9e';
  c.fillRect(250, 112, 7, 16);
  // The score bug.
  c.fillStyle = 'rgba(0,0,0,0.75)';
  c.fillRect(12, 12, 210, 54);
  text(c, '서울', 22, 27, 13, '#ffffff');
  text(c, '3', 98, 27, 14, '#ffeb3b');
  text(c, '부산', 22, 51, 13, '#ffffff');
  text(c, '2', 98, 51, 14, '#ffeb3b');
  text(c, '7회말', 160, 27, 13, '#ffffff', 'center');
  text(c, '1아웃 · 2-1', 160, 51, 11, '#b0bec5', 'center', false);
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0, 252, 512, 36);
  text(c, 'LIVE  프로야구 중계', 16, 270, 13, '#ff5252');
};
/** The balancer's read-outs: idle, counting while it spins, the weights to fit, then OK. */
const balance = (a: string, b: string, col = '#ff3d00'): Paint => (c) => {
  c.fillStyle = '#111111';
  c.fillRect(0, 0, 256, 96);
  text(c, 'IN', 32, 18, 12, '#9e9e9e', 'center');
  text(c, 'OUT', 224, 18, 12, '#9e9e9e', 'center');
  text(c, a, 64, 60, 40, col, 'center');
  text(c, b, 192, 60, 40, col, 'center');
};
const paintCaution: Paint = (c) => {
  c.fillStyle = '#ffd600';
  c.fillRect(0, 0, 256, 64);
  c.fillStyle = '#111111';
  for (let x = -64; x < 256; x += 32) {
    c.beginPath();
    c.moveTo(x, 64);
    c.lineTo(x + 16, 64);
    c.lineTo(x + 32, 48);
    c.lineTo(x + 16, 48);
    c.closePath();
    c.fill();
  }
  text(c, '리프트 작동 중 접근 금지', 128, 24, 18, '#111111', 'center');
};
const paintPegboard: Paint = (c) => {
  c.fillStyle = '#9ea7ad';
  c.fillRect(0, 0, 256, 128);
  c.fillStyle = '#5d666c';
  for (let y = 6; y < 128; y += 12) for (let x = 6; x < 256; x += 12) c.fillRect(x, y, 3, 3);
};

// ---------------------------------------------------------------------------------------------
// Tools.

/** A combination spanner along +y (the ring at the top, the open jaw at the bottom), its middle at the origin. */
function spanner(g: THREE.Object3D, len = 0.2, color = CHROME): THREE.Group {
  const s = new THREE.Group();
  g.add(s);
  part(s, box(0.018, len - 0.05, 0.006), color, 0, 0, 0, { outline: false });
  part(s, cyl(0.018, 0.018, 0.008, 12), color, 0, len / 2 - 0.02, 0, { rx: Math.PI / 2, outline: false });
  part(s, cyl(0.008, 0.008, 0.01, 6), '#5f6a72', 0, len / 2 - 0.02, 0, { rx: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) part(s, box(0.008, 0.03, 0.006), color, sx * 0.012, -len / 2 + 0.018, 0, { rz: sx * 0.2, outline: false });
  return s;
}
/** A screwdriver along +y (the handle up), its middle at the origin. */
function screwdriver(g: THREE.Object3D, color = '#d32f2f'): THREE.Group {
  const s = new THREE.Group();
  g.add(s);
  part(s, cyl(0.016, 0.014, 0.1, 10), color, 0, 0.05, 0, { outline: false });
  part(s, cyl(0.004, 0.004, 0.12, 6), CHROME, 0, -0.06, 0, { outline: false });
  return s;
}
/** A hammer, the handle along +y, the head across the top. */
function hammer(g: THREE.Object3D): THREE.Group {
  const s = new THREE.Group();
  g.add(s);
  part(s, cyl(0.012, 0.014, 0.24, 8), '#8d6e63', 0, -0.02, 0, { outline: false });
  part(s, box(0.1, 0.03, 0.03), '#455a64', 0, 0.1, 0);
  return s;
}
/** Pliers, the handles down. */
function pliers(g: THREE.Object3D): THREE.Group {
  const s = new THREE.Group();
  g.add(s);
  for (const sx of [-1, 1]) {
    part(s, box(0.014, 0.12, 0.008), '#1565c0', sx * 0.016, -0.05, 0, { rz: sx * 0.12, outline: false });
    part(s, box(0.01, 0.07, 0.008), '#78909c', sx * 0.005, 0.05, 0, { rz: -sx * 0.06, outline: false });
  }
  return s;
}
/** The tool for an outline on the wall (by its slot): a spanner, a screwdriver, a hammer, pliers, a long spanner. */
function wallTool(g: THREE.Object3D, slot: number): THREE.Group {
  switch (slot % 5) {
    case 0:
      return spanner(g, 0.22);
    case 1:
      return screwdriver(g, '#e53935');
    case 2:
      return hammer(g);
    case 3:
      return pliers(g);
    default:
      return spanner(g, 0.3, '#b0bec5');
  }
}
/** A ratchet: the head at the origin, the handle along +z. */
function ratchet(g: THREE.Object3D): THREE.Group {
  const r = new THREE.Group();
  g.add(r);
  part(r, cyl(0.022, 0.022, 0.03, 12), CHROME, 0, 0, 0);
  part(r, cyl(0.012, 0.012, 0.04, 8), '#5f6a72', 0, 0.03, 0, { outline: false });
  part(r, box(0.018, 0.012, 0.2), CHROME, 0, 0, 0.11, { outline: false });
  part(r, rbox(0.026, 0.024, 0.09, 0.01), BLACK, 0, 0, 0.17);
  return r;
}
/** An impact gun: the nose (its socket) at the origin, the body back along -z, the grip down at the back. */
function impactGun(g: THREE.Object3D): THREE.Group {
  const k = new THREE.Group();
  g.add(k);
  part(k, cyl(0.016, 0.016, 0.04, 10), '#5f6a72', 0, 0, -0.02, { rx: Math.PI / 2 });
  part(k, cyl(0.04, 0.045, 0.1, 14), '#263238', 0, 0, -0.09, { rx: Math.PI / 2 });
  part(k, rbox(0.07, 0.08, 0.08, 0.02), '#ff6f00', 0, 0.005, -0.17);
  part(k, rbox(0.04, 0.1, 0.045, 0.015), BLACK, 0, -0.075, -0.17, { rx: 0.25 });
  part(k, box(0.012, 0.025, 0.01), RED, 0, -0.04, -0.14, { outline: false });
  return k;
}

// ---------------------------------------------------------------------------------------------
// The car on the lift.

const CAR = { len: 2.86, wide: 1.36, r: 0.3, wx: 0.58, wz: 0.92, floor: 0.2, seat: 0.48 };
const CAR_COLORS = ['#e9edf0', '#1f4e8c', '#9a1b1b', '#3a3f45'];
/** A wheel at the hub (its axle along x), the rim's face to `side` (+1 the car's left); its five nuts on lugNut's circle. */
function wheel(g: THREE.Object3D, x: number, y: number, z: number, side: number): THREE.Group {
  const w = new THREE.Group();
  w.position.set(x, y, z);
  g.add(w);
  part(w, cyl(CAR.r, CAR.r, 0.2, 26), TYRE, 0, 0, 0, { rz: Math.PI / 2 });
  part(w, cyl(CAR.r - 0.035, CAR.r - 0.035, 0.205, 26), '#333338', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(w, cyl(0.19, 0.19, 0.02, 22), '#c9d1d6', side * 0.095, 0, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 5 + Math.PI / 5;
    part(w, box(0.012, 0.15, 0.034), '#aeb8bf', side * 0.106, Math.sin(a) * 0.1, Math.cos(a) * 0.1, { rx: -a + Math.PI / 2, outline: false });
  }
  part(w, cyl(0.04, 0.04, 0.02, 14), '#90a4ae', side * 0.11, 0, 0, { rz: Math.PI / 2, outline: false });
  for (let k = 0; k < 5; k++) {
    const n = lugNut(k);
    part(w, cyl(0.009, 0.009, 0.018, 6), '#eceff1', side * 0.112, n.up, n.side, { rz: Math.PI / 2, outline: false });
  }
  return w;
}
interface CarParts {
  root: THREE.Group;
  bonnet: THREE.Group;
  door: THREE.Group;
  wheels: THREE.Group[];
  lights: THREE.Mesh[];
  /** The drain plug on the oil pan's underside, the front-left wheel's face, the OBD port, the steering wheel, an engine bay point. */
  plug: THREE.Object3D;
  plugMesh: THREE.Mesh;
  oilCap: THREE.Mesh;
  hub: THREE.Object3D;
  obd: THREE.Object3D;
  wheelAt: THREE.Object3D;
  bay: THREE.Object3D;
  /** Where the bonnet's light hangs (on the bonnet). */
  hood: THREE.Group;
}
/**
 * A four-door saloon, nose to +z, standing on its wheels at y = 0 in its own frame: the body (its
 * sides, sills, the boot and the front wings over the engine bay), the bonnet hinged at the
 * windscreen, the engine under it (cover, oil cap, battery, coolant tank, air box), the cabin you
 * can see into (seats, dash, the steering wheel, the OBD port under it), the driver's door (the car's
 * left, +x) hinged at its front, the oil pan and its drain plug underneath, a brake disc behind the
 * front-left wheel, lamps and number plates.
 */
function buildCar(g: THREE.Object3D, color: string): CarParts {
  const root = new THREE.Group();
  g.add(root);
  const L = CAR.len;
  const hw = CAR.wide / 2;
  const dark = '#22262a';
  // The floor pan and the sills.
  part(root, box(CAR.wide - 0.1, 0.05, L - 0.2), '#3b4045', 0, CAR.floor, 0, { outline: false });
  for (const sx of [-1, 1]) part(root, rbox(0.08, 0.13, 1.18, 0.02), color, sx * (hw - 0.04), 0.27, -0.05);
  // The boot (rear), and the rear doors' panels.
  part(root, rbox(CAR.wide, 0.5, 0.6, 0.08), color, 0, 0.5, -L / 2 + 0.3);
  part(root, rbox(CAR.wide - 0.04, 0.05, 0.42, 0.02), color, 0, 0.77, -L / 2 + 0.36, { rx: 0.08 });
  for (const sx of [-1, 1]) {
    part(root, box(0.05, 0.48, 0.62), color, sx * (hw - 0.025), 0.52, -0.52);
    part(root, box(0.012, 0.02, 0.07), CHROME, sx * hw, 0.62, -0.32, { outline: false });
  }
  // The wings over the front wheels, the bumper and grille, the bay's floor and its firewall.
  for (const sx of [-1, 1]) part(root, box(0.05, 0.46, 0.86), color, sx * (hw - 0.025), 0.52, 0.99);
  part(root, rbox(CAR.wide, 0.34, 0.16, 0.06), color, 0, 0.4, L / 2 - 0.08);
  part(root, rbox(0.7, 0.12, 0.02, 0.02), dark, 0, 0.5, L / 2 + 0.002);
  part(root, box(0.9, 0.06, 0.03), '#2f3439', 0, 0.28, L / 2);
  part(root, box(CAR.wide - 0.12, 0.04, 0.86), '#2f3439', 0, 0.3, 0.98, { outline: false });
  part(root, box(CAR.wide - 0.12, 0.48, 0.04), '#2f3439', 0, 0.52, 0.55, { outline: false });
  // The wheels' arches (dark behind each tyre) and the wheels.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(root, cyl(CAR.r + 0.05, CAR.r + 0.05, 0.02, 22), '#141517', sx * (hw + 0.002), CAR.r, sz * CAR.wz, { rz: Math.PI / 2, outline: false });
  const wheels = [
    wheel(root, CAR.wx, CAR.r, CAR.wz, 1),
    wheel(root, -CAR.wx, CAR.r, CAR.wz, -1),
    wheel(root, CAR.wx, CAR.r, -CAR.wz, 1),
    wheel(root, -CAR.wx, CAR.r, -CAR.wz, -1),
  ];
  // Behind the front-left wheel: the hub's studs, the brake disc and its red calliper.
  part(root, cyl(0.16, 0.16, 0.022, 20), '#9aa1a6', CAR.wx - 0.04, CAR.r, CAR.wz, { rz: Math.PI / 2 });
  part(root, cyl(0.07, 0.07, 0.04, 14), '#6d757b', CAR.wx - 0.01, CAR.r, CAR.wz, { rz: Math.PI / 2 });
  part(root, rbox(0.06, 0.11, 0.07, 0.02), RED, CAR.wx - 0.04, CAR.r + 0.12, CAR.wz - 0.08, { rx: 0.6 });
  for (let k = 0; k < 5; k++) {
    const n = lugNut(k);
    part(root, cyl(0.006, 0.006, 0.05, 6), '#b0bec5', CAR.wx + 0.03, CAR.r + n.up, CAR.wz + n.side, { rz: Math.PI / 2, outline: false });
  }
  // The engine: block, cover, oil cap, battery, coolant tank, air box, radiator.
  part(root, rbox(0.56, 0.3, 0.42, 0.04), '#4a5056', 0.02, 0.5, 0.96);
  part(root, rbox(0.5, 0.06, 0.34, 0.03), '#2e3338', 0.02, 0.68, 0.96);
  label(root, '2.0 MPi', 0.16, 0.04, 0.02, 0.713, 0.96, '#2e3338', '#ef5350').rotation.x = -Math.PI / 2;
  const oilCap = part(root, cyl(0.03, 0.03, 0.03, 12), '#fdd835', 0.16, 0.72, 0.86);
  part(root, rbox(0.2, 0.18, 0.14, 0.02), '#1e1f22', -0.42, 0.45, 0.72);
  part(root, cyl(0.016, 0.016, 0.02, 8), RED, -0.36, 0.55, 0.72, { outline: false });
  glass(root, rbox(0.12, 0.12, 0.1, 0.02), 0.44, 0.52, 0.7);
  part(root, box(0.1, 0.06, 0.08), '#f48fb1', 0.44, 0.49, 0.7, { outline: false });
  part(root, rbox(0.24, 0.12, 0.2, 0.03), '#1e1f22', -0.38, 0.6, 1.14);
  part(root, box(CAR.wide - 0.2, 0.32, 0.04), '#59626a', 0, 0.48, 1.3, { outline: false });
  const bay = marker(root, 0.12, 0.72, 1.14);
  // Underneath: the oil pan and its drain plug, the exhaust down the middle.
  part(root, rbox(0.42, 0.08, 0.36, 0.02), '#5b6168', 0.06, 0.15, 0.96);
  const plugMesh = part(root, cyl(0.016, 0.016, 0.02, 6), '#cfd8dc', 0.18, 0.1, 1.0);
  const plug = marker(root, 0.18, 0.1, 1.0);
  rod(root, new THREE.Vector3(-0.1, 0.16, 0.7), new THREE.Vector3(-0.15, 0.15, -L / 2 + 0.05), 0.03, '#7a7f84');
  part(root, cyl(0.035, 0.035, 0.1, 12), '#9ea4a9', -0.15, 0.15, -L / 2 + 0.02, { rx: Math.PI / 2 });
  // The cabin: the seats, the dash and the wheel, the OBD port under it.
  for (const sx of [-1, 1]) {
    const x = sx * 0.3;
    part(root, rbox(0.44, 0.12, 0.46, 0.05), '#3e3e44', x, CAR.seat - 0.06, 0.04);
    part(root, rbox(0.44, 0.58, 0.12, 0.05), '#3e3e44', x, CAR.seat + 0.28, -0.24, { rx: -0.18 });
    part(root, rbox(0.24, 0.14, 0.1, 0.04), '#3e3e44', x, CAR.seat + 0.66, -0.32, { rx: -0.18 });
  }
  part(root, rbox(CAR.wide - 0.2, 0.42, 0.14, 0.05), '#3e3e44', 0, 0.62, -0.72, { rx: -0.2 });
  part(root, rbox(CAR.wide - 0.14, 0.2, 0.3, 0.05), '#2b2e33', 0, 0.78, 0.44);
  picture(root, painted('mec-cluster', 128, 48, (c) => {
    c.fillStyle = '#05080a';
    c.fillRect(0, 0, 128, 48);
    c.strokeStyle = '#4fc3f7';
    c.lineWidth = 3;
    for (const x of [32, 96]) {
      c.beginPath();
      c.arc(x, 30, 18, Math.PI, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = '#ffa000';
    c.fillRect(58, 30, 10, 8);
  }), 0.24, 0.09, 0.3, 0.87, 0.3, '#ffffff', Math.PI, 0).rotation.set(-0.5, Math.PI, 0);
  const steer = new THREE.Group();
  steer.position.set(0.3, 0.86, 0.3);
  steer.rotation.x = -1.1;
  root.add(steer);
  part(steer, new THREE.TorusGeometry(0.15, 0.018, 8, 24), BLACK, 0, 0, 0).userData.ownGeometry = true;
  part(steer, cyl(0.045, 0.045, 0.03, 12), '#3b3f44', 0, 0, 0, { rx: Math.PI / 2 });
  rod(root, new THREE.Vector3(0.3, 0.86, 0.3), new THREE.Vector3(0.3, 0.8, 0.44), 0.02, BLACK);
  const wheelAt = marker(root, 0.3, 0.86, 0.3);
  part(root, rbox(0.06, 0.03, 0.03, 0.01), BLACK, 0.52, 0.5, 0.38);
  const obd = marker(root, 0.52, 0.5, 0.36);
  // The glasshouse: the roof, the pillars, the screens and the rear doors' glass.
  part(root, rbox(1.16, 0.05, 0.98, 0.04), color, 0, 1.22, -0.21);
  for (const sx of [-1, 1]) {
    rod(root, new THREE.Vector3(sx * 0.62, 0.78, 0.55), new THREE.Vector3(sx * 0.57, 1.21, 0.27), 0.025, color);
    rod(root, new THREE.Vector3(sx * 0.63, 0.78, -0.2), new THREE.Vector3(sx * 0.58, 1.21, -0.2), 0.03, color);
    rod(root, new THREE.Vector3(sx * 0.63, 0.78, -0.84), new THREE.Vector3(sx * 0.57, 1.21, -0.68), 0.035, color);
    glass(root, box(0.012, 0.38, 0.56), sx * 0.61, 0.98, -0.5);
  }
  const shield = glass(root, box(1.12, 0.52, 0.012), 0, 1.0, 0.41);
  shield.rotation.x = -0.65;
  const back = glass(root, box(1.1, 0.46, 0.012), 0, 1.0, -0.77);
  back.rotation.x = 0.75;
  // The lamps and the plates.
  const lights: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    lights.push(glowing(root, rbox(0.26, 0.08, 0.03, 0.02), '#fffde7', sx * 0.46, 0.6, L / 2 - 0.005));
    part(root, rbox(0.28, 0.1, 0.03, 0.02), '#d50000', sx * 0.46, 0.64, -L / 2 + 0.005);
  }
  for (const m of lights) m.material = new THREE.MeshBasicMaterial({ color: '#b8bfc4' });
  for (const m of lights) m.userData.ownMaterial = true;
  label(root, '12가 3456', 0.34, 0.08, 0, 0.36, L / 2 + 0.012, '#ffffff', '#111111');
  label(root, '12가 3456', 0.34, 0.08, 0, 0.5, -L / 2 - 0.012, '#ffffff', '#111111', Math.PI);
  // The bonnet on its hinge at the screen; under it the work light's clip.
  const bonnet = new THREE.Group();
  bonnet.position.set(0, 0.76, 0.56);
  root.add(bonnet);
  part(bonnet, rbox(CAR.wide - 0.02, 0.04, 0.88, 0.04), color, 0, 0, 0.44, { rx: 0.05 });
  const hood = new THREE.Group();
  hood.position.set(0, -0.04, 0.5);
  bonnet.add(hood);
  // The driver's door (the car's left), hinged at its front, its window and mirror on it.
  const door = new THREE.Group();
  door.position.set(hw - 0.025, 0, 0.55);
  root.add(door);
  part(door, box(0.05, 0.48, 0.74), color, 0, 0.52, -0.37);
  part(door, box(0.03, 0.44, 0.7), '#3e3e44', -0.035, 0.52, -0.37, { outline: false });
  part(door, box(0.012, 0.02, 0.08), CHROME, 0.028, 0.62, -0.6, { outline: false });
  glass(door, box(0.012, 0.38, 0.6), -0.02, 0.98, -0.4);
  part(door, rbox(0.06, 0.07, 0.11, 0.02), color, 0.06, 0.82, -0.04);
  // The other side's front door, shut.
  part(root, box(0.05, 0.48, 0.74), color, -(hw - 0.025), 0.52, 0.18);
  glass(root, box(0.012, 0.38, 0.6), -(hw - 0.045), 0.98, 0.15);
  part(root, rbox(0.06, 0.07, 0.11, 0.02), color, -(hw + 0.035), 0.82, 0.51);
  const hub = marker(root, CAR.wx + 0.11, CAR.r, CAR.wz);
  return { root, bonnet, door, wheels, lights, plug, plugMesh, oilCap, hub, obd, wheelAt, bay, hood };
}

// ---------------------------------------------------------------------------------------------
// Small pieces shared by the shop's furniture.

/** A paper cup of vending-machine coffee (its foot at the origin). */
function paperCup(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.032, 0.024, 0.08, 12), '#f5f0e6', x, y + 0.04, z);
  part(g, cyl(0.03, 0.03, 0.004, 12), '#6d4c41', x, y + 0.077, z, { outline: false });
  part(g, cyl(0.0325, 0.0325, 0.02, 12), RED, x, y + 0.05, z, { outline: false });
}
/** A clipboard (its middle at the origin, the face to +z) with a painted sheet. */
function clipboard(g: THREE.Object3D, tex: THREE.Texture, w = 0.2, h = 0.27): THREE.Group {
  const c = new THREE.Group();
  g.add(c);
  part(c, rbox(w + 0.02, h + 0.03, 0.008, 0.004), '#8d6e63', 0, 0, -0.004);
  picture(c, tex, w, h, 0, -0.008, 0.002);
  part(c, rbox(0.07, 0.025, 0.012, 0.004), STEEL, 0, h / 2 + 0.002, 0.004);
  return c;
}

let liftCount = 0;

export const BUILDERS: Record<string, Builder> = {
  /**
   * The two-post lift (2주식 리프트, 2 × 3): yellow posts on black base plates either side, a beam
   * across the top with the hydraulic line, the carriages riding up the posts with the four swing arms
   * and their rubber pads under the sills, a caution band on the floor, and a saloon on the arms (a
   * different one on each lift, 12가 3456 on its plates). At rest the car is down on its wheels; in
   * use it goes up or comes down to what's being done:
   * - Engine work underneath (repairEngine; the default): taken right up overhead, an LED bar lit
   *   under the sills, the oil caddy rolled under the pan with its funnel raised. Stood under it, arms
   *   up, eyes up: the ratchet worked round on the drain plug, the last turns by the fingers, the plug
   *   drawn out and the oil running down into the funnel while it's held aside, then back in.
   * - A tyre (changeTires): lifted just off the floor; crouched at the front-left wheel with the
   *   impact gun on each nut in turn, the gun put down, the wheel drawn off and set down against the
   *   leg, a look at the brake disc, the wheel lifted back on and the nuts run tight; its air hose
   *   trails to the post.
   * - A tow-in (emergencyRepair): down, the bonnet up with a work light hung under it and steam coming
   *   off the radiator; stood at the nose leaning into the bay, tinkering.
   * - The OBD scanner (mecObdScan): down, the driver's door open; crouched at the sill plugging the VCI
   *   into the port under the dash, then up reading the live data and the codes on the tablet.
   * - A test run (mechanic_testDrive): sat at the wheel, steering, the engine running (the body
   *   trembling, the headlamps on, exhaust from the tailpipe).
   */
  carLift(g, W, D, _c, _def, _ctx, out) {
    const n = liftCount++;
    const px = W / 2 - 0.08;
    const pz = -0.42;
    const topY = 3.0;
    // The floor: the caution band round the bay, the base plates and the posts.
    for (const sx of [-1, 1]) part(g, box(0.06, 0.006, D - 0.1), '#fbc02d', sx * (W / 2 - 0.03), 0.003, 0, { outline: false });
    part(g, box(W - 0.06, 0.006, 0.06), '#fbc02d', 0, 0.003, D / 2 - 0.03, { outline: false });
    picture(g, painted('mec-caution', 256, 64, paintCaution), 0.9, 0.22, 0, 0.005, D / 2 - 0.2, '#ffffff', 0, -Math.PI / 2);
    for (const sx of [-1, 1]) {
      part(g, box(0.4, 0.02, 0.42), BLACK, sx * px, 0.01, pz);
      part(g, rbox(0.2, topY, 0.24, 0.02), LIFT_YELLOW, sx * px, topY / 2, pz);
      part(g, box(0.06, topY - 0.3, 0.12), '#c99700', sx * (px - 0.1), topY / 2, pz, { outline: false });
      // The control box on the right post, the hydraulic pump on the left.
      if (sx > 0) {
        part(g, rbox(0.14, 0.22, 0.1, 0.02), '#eceff1', px - 0.02, 1.15, pz + 0.17);
        glowing(g, cyl(0.02, 0.02, 0.01, 10), '#43a047', px - 0.05, 1.2, pz + 0.225, Math.PI / 2);
        glowing(g, cyl(0.02, 0.02, 0.01, 10), '#e53935', px + 0.01, 1.2, pz + 0.225, Math.PI / 2);
        label(g, '상승 · 하강', 0.12, 0.03, px - 0.02, 1.08, pz + 0.222, '#eceff1', '#37474f');
      } else {
        part(g, rbox(0.26, 0.34, 0.24, 0.03), '#1565c0', -px - 0.06, 0.3, pz + 0.28);
        part(g, cyl(0.06, 0.06, 0.1, 14), '#90a4ae', -px - 0.06, 0.52, pz + 0.28);
      }
    }
    part(g, rbox(W - 0.06, 0.14, 0.2, 0.02), LIFT_YELLOW, 0, topY + 0.07, pz);
    rod(g, new THREE.Vector3(-px, topY - 0.02, pz + 0.12), new THREE.Vector3(px, topY - 0.02, pz + 0.12), 0.012, BLACK);
    label(g, 'MAX 4,000kg', 0.36, 0.08, 0, topY + 0.07, pz + 0.101, LIFT_YELLOW, '#111111');

    // What rides up and down: the car, the carriages and their arms.
    const rise = new THREE.Group();
    g.add(rise);
    const car = buildCar(rise, CAR_COLORS[n % CAR_COLORS.length]);
    const pads: Array<[number, number]> = [[0.5, 0.42], [0.5, -0.62]];
    for (const sx of [-1, 1]) {
      part(rise, rbox(0.12, 0.42, 0.2, 0.02), '#d4a200', sx * (px - 0.14), 0.24, pz);
      for (const [x, z] of pads) {
        rod(rise, new THREE.Vector3(sx * (px - 0.16), 0.1, pz), new THREE.Vector3(sx * x, 0.1, z), 0.035, '#d4a200');
        part(rise, cyl(0.06, 0.06, 0.06, 14), RUBBER, sx * x, 0.145, z);
      }
    }

    // In use: the caddy under the pan, the LED bar under the sills, the impact gun and its hose, the
    // tablet and the VCI, steam off the radiator, exhaust, the ratchet, the oil.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const caddy = new THREE.Group();
    caddy.position.set(0.34, 0, 1.02);
    use.add(caddy);
    part(caddy, cyl(0.22, 0.22, 0.42, 20), '#ffb300', 0, 0.3, 0);
    for (let i = 0; i < 4; i++) caster(caddy, Math.cos(i * 1.57 + 0.78) * 0.17, Math.sin(i * 1.57 + 0.78) * 0.17);
    const funnelPole = part(caddy, cyl(0.022, 0.022, 1, 10), CHROME, 0, 0.5, 0, { outline: false });
    const funnel = new THREE.Group();
    caddy.add(funnel);
    part(funnel, new THREE.CylinderGeometry(0.22, 0.05, 0.16, 20, 1, true), '#ffb300', 0, 0.08, 0).userData.ownGeometry = true;
    part(funnel, cyl(0.2, 0.2, 0.01, 20), '#3a2a12', 0, 0.12, 0, { outline: false });
    label(caddy, '폐유', 0.16, 0.06, 0, 0.36, 0.222, '#ffb300', '#111111');
    const tray = new THREE.Group();
    tray.position.set(0.0, 0.53, 0.0);
    caddy.add(tray);
    const restRatchet = ratchet(tray);
    restRatchet.position.set(-0.1, 0.0, -0.08);
    restRatchet.rotation.y = 0.6;
    const ledBar = new THREE.Group();
    use.add(ledBar);
    part(ledBar, box(0.05, 0.03, 0.9), '#37474f', 0, 0, 0);
    glowing(ledBar, box(0.035, 0.008, 0.86), '#fffef0', 0, -0.018, 0);
    const hand = ratchet(use);
    const oilRun = unitRod(use, 0.007, OIL);
    const gun = impactGun(use);
    const hose = [unitRod(use, 0.012, '#f9a825'), unitRod(use, 0.012, '#f9a825')];
    const tablet = new THREE.Group();
    use.add(tablet);
    part(tablet, rbox(0.26, 0.18, 0.02, 0.012), '#263238', 0, 0, -0.01);
    picture(tablet, painted('mec-tablet', 256, 176, paintTablet), 0.235, 0.16, 0, 0, 0.001);
    const vci = new THREE.Group();
    use.add(vci);
    part(vci, rbox(0.05, 0.035, 0.08, 0.01), '#1565c0', 0, 0, -0.04);
    const vciLed = glowing(vci, ball(0.006), '#69f0ae', 0, 0.02, -0.05);
    const steam = [0, 1, 2, 3].map(() => part(use, ball(0.09), '#eef2f4', 0, 0, 0, { outline: false, shadow: false, material: PUFF }));
    const smoke = [0, 1, 2].map(() => part(use, ball(0.07), '#b0b6bb', 0, 0, 0, { outline: false, shadow: false, material: SMOKE }));
    const hoodLight = new THREE.Group();
    car.hood.add(hoodLight);
    part(hoodLight, rbox(0.4, 0.04, 0.06, 0.015), '#ff6f00', 0, -0.03, 0);
    glowing(hoodLight, box(0.36, 0.006, 0.04), '#fffde7', 0, -0.054, 0);

    // The spots: under it, at the wheel, at the nose, at the door, in the driver's seat.
    const under = () => spot(g, 'stand', car.plug.position.x - 0.1, 0, car.plug.position.z - 0.42, 0);
    const tyreAt = () => spot(g, 'stand', CAR.wx + 0.11 + 0.47, 0, CAR.wz, -Math.PI / 2);
    const obdYaw = Math.atan2(car.obd.position.x - 1.0, car.obd.position.z - 0.0);
    const spots: Record<string, Spot> = {
      repairEngine: at(under(), car.plug, 'underCar'),
      changeTires: at(tyreAt(), car.hub, 'impactWrench'),
      emergencyRepair: at(spot(g, 'stand', 0.1, 0, CAR.len / 2 + 0.2, Math.PI), car.bay, 'tinker'),
      mecObdScan: at(spot(g, 'stand', 1.0, 0, 0.0, obdYaw), car.obd, 'obdScan'),
      mechanic_testDrive: at(spot(car.root, 'sit', 0.3, CAR.seat, 0.06, 0, CAR.seat), car.wheelAt, 'steer'),
      '*': at(under(), car.plug, 'underCar'),
    };
    // The oil change (xwOilChange): its own round and props (workExtraMotion.ts, workExtraKits.ts).
    const oil = oilKit(g, use, { root: car.root, plugMesh: car.plugMesh, plugHome: car.plug.position, cap: car.oilCap });
    spots.xwOilChange = oil.spot;
    out.spots = spots;
    out.work = car.bay;
    const HIGH = 1.62;
    const LOW = 0.1;
    const goal = { h: 0, bonnet: 0, door: 0 };
    let h = 0;
    let lid = 0;
    let open = 0;
    let last = -1;
    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    const hosePost = new THREE.Vector3(px - 0.1, 0.05, pz + 0.15);
    const seats = car.wheels.map((wh) => wh.position.clone());
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const kind = now === '*' ? 'repairEngine' : now;
      goal.h = kind === 'repairEngine' ? HIGH : kind === 'changeTires' ? LOW : 0;
      goal.bonnet = kind === 'emergencyRepair' ? 1 : 0;
      goal.door = kind === 'mecObdScan' ? 1 : 0;
      if (kind === 'xwOilChange') {
        const O = oil.update(t, h);
        if (O) {
          goal.h = O.n.lift > 0.5 ? HIGH : 0;
          goal.bonnet = O.n.bonnet;
        }
      } else oil.reset();
      const working = Math.abs(h - goal.h) < 0.02;
      // Under it.
      const underNow = kind === 'repairEngine';
      caddy.visible = ledBar.visible = underNow;
      hand.visible = oilRun.visible = false;
      if (kind !== 'xwOilChange') car.plugMesh.position.copy(car.plug.position);
      if (underNow) {
        ledBar.position.set(-0.32, h + 0.13, 0.15);
        const top = h + 0.1 - 0.16;
        funnelPole.scale.y = Math.max(0.2, top - 0.5);
        funnelPole.position.y = 0.5 + funnelPole.scale.y / 2;
        funnel.position.y = top - 0.12;
        const sp = spots[now!];
        const k = underCarRound(t, phaseAt(sp));
        const W0 = car.plug.position.clone().setY(car.plug.position.y + h);
        const F = framer(W0, 0);
        restRatchet.visible = !k.ratchet || !working;
        hand.visible = k.ratchet && working;
        if (hand.visible) aim(hand, F({ side: 0, up: -0.012, ahead: 0 }, v), F(k.r, w));
        if (working) car.plugMesh.position.copy(F(k.plug, v)).setY(v.y - h);
        oilRun.visible = working && k.oil > 0.02;
        if (oilRun.visible) {
          const from = car.plug.position.clone().setY(car.plug.position.y + h - 0.01);
          const to = new THREE.Vector3(caddy.position.x - 0.08, h + 0.1 - 0.16 - 0.1, caddy.position.z - 0.04);
          stretch(oilRun, from, to);
          oilRun.scale.x = oilRun.scale.z = 0.4 + 0.6 * k.oil;
        }
      }
      // At the wheel.
      const tyreNow = kind === 'changeTires';
      gun.visible = tyreNow;
      for (const s of hose) s.visible = tyreNow;
      car.wheels.forEach((wh, i) => wh.position.copy(seats[i]));
      if (tyreNow) {
        const sp = spots[now!];
        const k = impactRound(working ? t : 0, phaseAt(sp));
        const W0 = car.hub.position.clone().setY(car.hub.position.y + h);
        const yaw = -Math.PI / 2;
        const F = framer(W0, yaw);
        const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        gun.position.copy(F(k.gun, v));
        gun.quaternion.setFromUnitVectors(Z, fwd);
        if (!k.held) {
          gun.rotateZ(Math.PI / 2);
          gun.position.y = 0.05;
        } else if (k.buzz) gun.position.x += 0.003 * Math.sin(t * 95);
        // The wheel moves with the hands, in the car's frame.
        car.wheels[0].position.copy(seats[0]).add(F(k.wheel, v).sub(W0));
        if (k.off) car.wheels[0].position.y = Math.max(car.wheels[0].position.y, CAR.r - h + 0.005);
        // The air hose: from the grip down to the floor and back to the post.
        const grip = gun.localToWorld(new THREE.Vector3(0, -0.12, -0.17));
        g.worldToLocal(grip);
        const floor = new THREE.Vector3((grip.x + hosePost.x) / 2 + 0.15, 0.03, (grip.z + hosePost.z) / 2 + 0.1);
        stretch(hose[0], grip, floor);
        stretch(hose[1], floor, hosePost);
      }
      // The tow-in.
      const towNow = kind === 'emergencyRepair';
      hoodLight.visible = towNow;
      steam.forEach((p, i) => {
        p.visible = towNow && lid > 0.8;
        const u = ((t * 0.35 + i / steam.length) % 1 + 1) % 1;
        p.position.set(0.05 + 0.12 * Math.sin(i * 2.1 + t * 0.6), h + 0.62 + u * 0.9, CAR.len / 2 - 0.25 + 0.06 * Math.cos(i));
        p.scale.setScalar(0.5 + 1.4 * u);
        p.scale.multiplyScalar(1 - u * 0.6);
      });
      // The scanner.
      const obdNow = kind === 'mecObdScan';
      tablet.visible = vci.visible = obdNow;
      if (obdNow) {
        const sp = spots[now!];
        const k = obdRound(working && open > 0.9 ? t : 0, phaseAt(sp));
        const W0 = car.obd.position.clone().setY(car.obd.position.y + h);
        const F = framer(W0, obdYaw);
        const fwd = new THREE.Vector3(Math.sin(obdYaw), 0, Math.cos(obdYaw));
        tablet.position.copy(F(k.tablet, v));
        // The screen turned up to the face (its +z back towards the mechanic, tipped back).
        tablet.quaternion.setFromUnitVectors(Z, fwd.clone().negate());
        tablet.rotateX(-0.75);
        vci.position.copy(F(k.dongle, v));
        vci.quaternion.setFromUnitVectors(Z, fwd.clone().negate());
        vciLed.visible = k.plugged && Math.sin(t * 8) > -0.3;
      }
      // The test run: the body trembles with the engine, lamps on, exhaust.
      const driveNow = kind === 'mechanic_testDrive';
      car.root.position.y = driveNow ? 0.004 * Math.sin(t * 47) + 0.003 * Math.sin(t * 13) : 0;
      car.root.rotation.z = driveNow ? 0.004 * Math.sin(t * 7) : 0;
      for (const m of car.lights) (m.material as THREE.MeshBasicMaterial).color.set(driveNow ? '#fffde7' : '#b8bfc4');
      smoke.forEach((p, i) => {
        p.visible = driveNow;
        const u = ((t * 0.8 + i / smoke.length) % 1 + 1) % 1;
        p.position.set(-0.15 - 0.05 * u, h + 0.15 + u * 0.25, -CAR.len / 2 - 0.05 - u * 0.5);
        p.scale.setScalar(0.4 + 1.2 * u);
      });
    };
    // Every frame (in use or not): the lift goes up or down to where it's wanted, the bonnet and door with it.
    out.away = (_out, t) => {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, t - last));
      last = t;
      if (!use.visible) {
        goal.h = goal.bonnet = goal.door = 0;
        oil.reset();
        // Put back as it was: the wheel on, the plug in, the engine off.
        car.wheels.forEach((wh, i) => wh.position.copy(seats[i]));
        car.plugMesh.position.copy(car.plug.position);
        car.root.position.y = car.root.rotation.z = 0;
        for (const m of car.lights) (m.material as THREE.MeshBasicMaterial).color.set('#b8bfc4');
      }
      // The bonnet and the door shut before the car goes up.
      lid = towards(lid, goal.bonnet, 1.6, dt);
      open = towards(open, goal.door, 1.8, dt);
      if (lid < 0.02 && open < 0.02) h = towards(h, goal.h, 0.5, dt);
      rise.position.y = h;
      car.bonnet.rotation.x = -1.15 * THREE.MathUtils.smoothstep(lid, 0, 1);
      car.door.rotation.y = -1.0 * THREE.MathUtils.smoothstep(open, 0, 1);
    };
  },

  /**
   * The scan cart (차량 진단기): a steel cart on castors, a rugged laptop open on its top with the
   * diagnostic software — the car, its two fault codes (P0301 실화), the live data and the stuttering
   * rpm trace — the VCI on its hook with its cable coiled, the report printer, a battery tester and the
   * service manuals on the shelf under. Diagnosing (runDiagnostics): stood at it typing; assigning the
   * day's jobs (lead): the same, with the 작업 배정 board on the screen.
   */
  diagnosticComputer(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.92;
    const cw = 0.72;
    const cd = 0.5;
    const z0 = -0.12;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      caster(g, sx * (cw / 2 - 0.05), z0 + sz * (cd / 2 - 0.05));
      rod(g, new THREE.Vector3(sx * (cw / 2 - 0.03), 0.1, z0 + sz * (cd / 2 - 0.03)), new THREE.Vector3(sx * (cw / 2 - 0.03), top, z0 + sz * (cd / 2 - 0.03)), 0.016, '#37474f');
    }
    for (const y of [0.16, 0.52, top - 0.02]) part(g, rbox(cw, 0.03, cd, 0.01), y > 0.9 ? '#455a64' : '#cfd8dc', 0, y, z0);
    // The push handle at the back.
    rod(g, new THREE.Vector3(-cw / 2 + 0.05, top + 0.1, z0 - cd / 2 - 0.04), new THREE.Vector3(cw / 2 - 0.05, top + 0.1, z0 - cd / 2 - 0.04), 0.014, BLACK);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * (cw / 2 - 0.05), top, z0 - cd / 2 + 0.02), new THREE.Vector3(sx * (cw / 2 - 0.05), top + 0.1, z0 - cd / 2 - 0.04), 0.012, BLACK);
    // The laptop: its base with the keys and the lid up, in a rugged frame.
    const lx = -0.04;
    part(g, rbox(0.44, 0.03, 0.3, 0.02), '#ff6f00', lx, top + 0.015, z0 + 0.05);
    part(g, box(0.38, 0.004, 0.14), '#263238', lx, top + 0.032, z0 + 0.09, { outline: false });
    part(g, box(0.1, 0.004, 0.06), '#37474f', lx, top + 0.032, z0 + 0.17, { outline: false });
    const lid = new THREE.Group();
    lid.position.set(lx, top + 0.03, z0 - 0.1);
    lid.rotation.x = -0.25;
    g.add(lid);
    part(lid, rbox(0.44, 0.3, 0.025, 0.02), '#ff6f00', 0, 0.15, -0.01);
    const screen = litScreen(lid, painted('mec-diag', 512, 320, paintDiag), 0.39, 0.245, 0, 0.15, 0.004);
    out.screen = screen;
    const diagTex = painted('mec-diag', 512, 320, paintDiag);
    const jobsTex = painted('mec-jobs', 512, 320, paintJobs);
    const keysAt = marker(g, lx, top + 0.04, z0 + 0.1);
    // The VCI on its hook and its cable coiled; the printer; the battery tester.
    part(g, rbox(0.06, 0.1, 0.035, 0.01), '#1565c0', cw / 2 + 0.02, top - 0.12, z0 + 0.1);
    glowing(g, ball(0.006), '#69f0ae', cw / 2 + 0.04, top - 0.08, z0 + 0.1);
    part(g, new THREE.TorusGeometry(0.07, 0.008, 6, 20), BLACK, cw / 2 + 0.01, top - 0.28, z0 + 0.1, { ry: Math.PI / 2 }).userData.ownGeometry = true;
    part(g, rbox(0.16, 0.08, 0.16, 0.02), '#eceff1', 0.26, top + 0.04, z0 - 0.08);
    part(g, box(0.1, 0.002, 0.08), PAPER, 0.26, top + 0.08, z0 + 0.02, { rx: -0.4, outline: false });
    part(g, rbox(0.18, 0.1, 0.12, 0.02), '#fdd835', -0.15, 0.58, z0);
    part(g, rbox(0.07, 0.06, 0.005, 0.005), '#263238', -0.15, 0.6, z0 + 0.061, { outline: false });
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(-0.15 + sx * 0.04, 0.63, z0 + 0.03), new THREE.Vector3(-0.05 + sx * 0.06, 0.55, z0 + 0.2), 0.006, sx < 0 ? BLACK : RED);
    // The manuals on the bottom shelf.
    const r = seeded(4);
    for (let i = 0; i < 6; i++) part(g, box(0.05, 0.26, 0.2), ['#1565c0', '#c62828', '#2e7d32', '#37474f'][i % 4], -0.28 + i * 0.055, 0.31, z0 + 0.0, { rz: (r() - 0.5) * 0.06 });
    label(g, '정비 지침서', 0.2, 0.04, 0.2, 0.32, z0 + cd / 2 + 0.002, '#cfd8dc', '#37474f');
    const stand = () => spot(g, 'stand', lx, 0, z0 + 0.6, Math.PI);
    const spots: Record<string, Spot> = {
      runDiagnostics: at(stand(), keysAt, 'type'),
      mechanic_assignJobs: at(stand(), keysAt, 'type'),
      '*': at(stand(), keysAt, 'type'),
    };
    out.spots = spots;
    out.work = keysAt;
    out.animate = (t) => {
      const mat = screen.material as THREE.MeshBasicMaterial;
      const want = nowAt(spots, t) === 'mechanic_assignJobs' ? jobsTex : diagTex;
      if (mat.map !== want) {
        mat.map = want;
        mat.needsUpdate = true;
      }
    };
  },

  /**
   * The tool wall (공구 벽, 2 wide, on the wall): a grey pegboard in a red steel frame, every tool
   * hung on its own outline (spanners in sizes, screwdrivers, hammers, pliers, a torque wrench, a
   * level), a ledge under it with a few left out, a sign. Putting the tools back (organizeTools):
   * stood at it, each tool off the ledge, looked over, slid onto its hook over its outline. Learning
   * the tools, planning, assigning the crew: stood pointing along the board. Mending a thing: at the
   * ledge.
   */
  toolWall(g, W, D, c, _def, _ctx, out) {
    const bw = W - 0.12;
    const bh = 1.0;
    const y0 = 1.32;
    const zb = -D / 2 + 0.04;
    part(g, rbox(bw + 0.08, bh + 0.08, 0.04, 0.01), c, 0, y0, zb);
    picture(g, painted('mec-peg', 256, 128, paintPegboard), bw, bh, 0, y0, zb + 0.021, '#c9ced2');
    label(g, '공구는 제자리에!', 0.44, 0.07, 0, y0 + bh / 2 + 0.08, zb + 0.022, c, '#ffffff');
    part(g, rbox(bw + 0.08, 0.09, 0.03, 0.01), c, 0, y0 + bh / 2 + 0.08, zb);
    // The ledge under the board.
    const ly = y0 + HANG.ledge;
    part(g, rbox(bw, 0.03, 0.16, 0.008), '#78909c', 0, ly, zb + 0.08);
    for (const sx of [-1, 1]) part(g, box(0.03, 0.12, 0.14), '#546e7a', sx * (bw / 2 - 0.1), ly - 0.07, zb + 0.07, { outline: false });
    const face = zb + 0.025;
    const outline = (x: number, y: number, w: number, h: number) => part(g, box(w, h, 0.002), '#3c4247', x, y, face + 0.001, { outline: false });
    const hook = (x: number, y: number) => part(g, cyl(0.005, 0.005, 0.05, 6), CHROME, x, y, face + 0.025, { rx: Math.PI / 2, outline: false });
    // The rows of always-there tools: spanners graded along the top, screwdrivers, a torque wrench, a level.
    for (let i = 0; i < 8; i++) {
      const x = -bw / 2 + 0.12 + i * 0.07;
      const len = 0.14 + i * 0.012;
      if (x > -0.05) break;
      outline(x, y0 + 0.4 - len / 2, 0.03, len + 0.01);
      hook(x, y0 + 0.4);
      spanner(g, len).position.set(x, y0 + 0.4 - len / 2, face + 0.008);
    }
    for (let i = 0; i < 6; i++) {
      const x = 0.5 + i * 0.06;
      outline(x, y0 + 0.36, 0.034, 0.2);
      screwdriver(g, ['#e53935', '#fdd835', '#1e88e5'][i % 3]).position.set(x, y0 + 0.36, face + 0.012);
    }
    part(g, box(0.36, 0.05, 0.03), '#ffca28', 0.62, y0 - 0.3, face + 0.015);
    for (const x of [0.52, 0.62, 0.72]) glowing(g, box(0.03, 0.02, 0.005), '#76ff03', x, y0 - 0.3, face + 0.031);
    // The outlines this wall's tools come back to, and the tools on them.
    const W0 = new THREE.Vector3(0, y0, face);
    const yaw = Math.PI;
    const F = framer(W0, yaw);
    const homes = HANG.slots.map((s, i) => {
      const p = F(s);
      outline(p.x, p.y - 0.08, 0.06, 0.2);
      hook(p.x, p.y);
      const tool = wallTool(g, i);
      tool.position.set(p.x, p.y - 0.09, face + 0.014);
      return tool;
    });
    // In use: the one in hand, and a couple left on the ledge.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const moving = HANG.slots.map((_, i) => {
      const m = wallTool(use, i);
      m.visible = false;
      return m;
    });
    for (const [x, i] of [[0.42, 0], [0.55, 3]] as const) {
      const m = wallTool(g, i);
      m.position.set(x, ly + 0.03, zb + 0.09);
      m.rotation.set(-Math.PI / 2, 0, 1.2);
    }
    const boardAt = marker(g, 0, y0, face);
    const ledgeAt = marker(g, -0.2, ly + 0.03, zb + 0.1);
    const stand = () => spot(g, 'stand', 0, 0, face + 0.45, yaw);
    const spots: Record<string, Spot> = {
      organizeTools: at(stand(), boardAt, 'hangTool'),
      mechanic_learnTools: at(stand(), boardAt, 'board'),
      manualLabor_learnTools: at(stand(), boardAt, 'board'),
      welder_assignCrew: at(stand(), boardAt, 'board'),
      fishFarmer_planSeason: at(stand(), boardAt, 'board'),
      sanitationWorker_repairBins: at(stand(), ledgeAt, 'tinker'),
      '*': at(stand(), boardAt, 'hangTool'),
    };
    out.spots = spots;
    out.work = boardAt;
    const v = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const hanging = now === 'organizeTools' || now === '*';
      moving.forEach((m) => (m.visible = false));
      homes.forEach((m) => (m.visible = true));
      if (!hanging) return;
      const k = hangRound(t, phaseAt(spots[now!]));
      homes[k.slot].visible = k.hung;
      const m = moving[k.slot];
      m.visible = !k.hung;
      m.position.copy(F(k.tool, v));
      if (k.held) {
        // Carried by the handle, hanging a little from the fist.
        m.position.y -= 0.06;
        m.rotation.set(0, 0, 0.2 * Math.sin(t * 2));
      } else {
        // Lying on the ledge.
        m.position.set(F(hangPick(k.n), v).x, ly + 0.03, zb + 0.09);
        m.rotation.set(-Math.PI / 2, 0, 1.2);
      }
    };
  },

  /**
   * The parts rack (부품 선반): a boltless steel rack, grey uprights and orange beams, four shelves
   * of numbered blue bins and labelled cartons, a coil of hose, a 재고표 clipboard on its hook.
   * Sorting (sortParts): stood at it reaching into one shelf and another; a quote or an estimate
   * worked out (견적): stood writing on the clipboard against the rack.
   */
  partsShelf(g, W, D, _c, _def, ctx, out) {
    const w = W - 0.1;
    const d = ctx.againstWall ? 0.5 : 0.56;
    const zc = ctx.againstWall ? -D / 2 + d / 2 + 0.02 : 0;
    const levels = [0.12, 0.55, 0.98, 1.41];
    const height = 1.86;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      part(g, box(0.04, height, 0.04), '#607d8b', sx * (w / 2 - 0.02), height / 2, zc + sz * (d / 2 - 0.02));
      part(g, box(0.06, 0.01, 0.06), '#455a64', sx * (w / 2 - 0.02), 0.005, zc + sz * (d / 2 - 0.02), { outline: false });
    }
    const r = seeded(11);
    levels.forEach((y, li) => {
      part(g, box(w, 0.02, d - 0.04), '#b0bec5', 0, y, zc);
      for (const sz of [-1, 1]) part(g, box(w, 0.05, 0.02), '#ef6c00', 0, y + 0.01, zc + sz * (d / 2 - 0.02));
      if (li === 0) {
        // Cartons on the bottom.
        for (const [x, bw, bh, lab] of [[-0.22, 0.38, 0.3, '부품 B-07'], [0.2, 0.42, 0.26, '부품 B-08']] as const) {
          part(g, box(bw, bh, d - 0.1), '#c8a27a', x, y + 0.01 + bh / 2, zc);
          part(g, box(bw, 0.03, 0.003), '#e0c9a6', x, y + 0.01 + bh - 0.04, zc + (d - 0.1) / 2 + 0.001, { outline: false });
          label(g, lab, 0.16, 0.05, x, y + 0.12, zc + (d - 0.1) / 2 + 0.003, '#ffffff', '#37474f');
        }
        return;
      }
      if (li === 3) {
        // Cartons of filters, a coil of hose.
        for (let i = 0; i < 3; i++) part(g, box(0.18, 0.18, 0.2), i === 1 ? '#1565c0' : '#eceff1', -w / 2 + 0.14 + i * 0.2, y + 0.1, zc + 0.06);
        part(g, new THREE.TorusGeometry(0.13, 0.03, 8, 20), '#263238', w / 2 - 0.18, y + 0.04, zc, { rx: Math.PI / 2 }).userData.ownGeometry = true;
        return;
      }
      // Bins: open-fronted blue bins with their number labels and what's in them.
      const n = 4;
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (w / n) * (i + 0.5);
        const bw = w / n - 0.03;
        part(g, box(bw, 0.18, d - 0.08), '#1e5aa8', x, y + 0.1, zc);
        part(g, box(bw - 0.02, 0.06, 0.02), '#2a6dc4', x, y + 0.05, zc + (d - 0.08) / 2 + 0.005, { outline: false });
        label(g, `${'ABCD'[li]}-${String(i + 1 + li * 4).padStart(2, '0')}`, bw - 0.04, 0.04, x, y + 0.14, zc + (d - 0.08) / 2 + 0.002, '#ffffff', '#263238');
        for (let j = 0; j < 3; j++) part(g, li === 1 ? cyl(0.018, 0.018, 0.03, 6) : rbox(0.05, 0.03, 0.04, 0.01), li === 1 ? '#b0bec5' : '#90a4ae', x + (r() - 0.5) * (bw - 0.08), y + 0.2, zc + (r() - 0.5) * 0.2, { outline: false });
      }
    });
    // The stock sheet on its hook at the right end.
    const sheet = painted('mec-stock', 192, 256, (cx) => {
      cx.fillStyle = PAPER;
      cx.fillRect(0, 0, 192, 256);
      text(cx, '재고 관리표', 96, 20, 15, '#263238', 'center');
      for (let i = 0; i < 10; i++) {
        cx.fillStyle = i % 2 ? '#ffffff' : '#eceff1';
        cx.fillRect(8, 36 + i * 20, 176, 20);
        text(cx, `A-${String(i + 1).padStart(2, '0')}`, 14, 46 + i * 20, 10, '#37474f');
        text(cx, `${(i * 7) % 13 + 2}`, 176, 46 + i * 20, 10, i === 3 ? '#d32f2f' : '#263238', 'right');
      }
    });
    const hung = clipboard(g, sheet, 0.17, 0.23);
    hung.position.set(w / 2 + 0.005, 1.2, zc + 0.05);
    hung.rotation.y = Math.PI / 2;
    // In use: the clipboard in hand for a quote; where the hands reach on the shelves.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const held = clipboard(use, painted('mec-quote', 192, 256, paintQuote), 0.17, 0.23);
    const front = zc + d / 2;
    held.position.set(-0.05, 1.08, front + 0.22);
    held.rotation.set(-0.9, 0, 0.1);
    const reach = marker(g, 0, levels[2] + 0.12, front - 0.08);
    const writeAt = marker(g, -0.05, 1.09, front + 0.22);
    const stand = () => spot(g, 'stand', 0, 0, front + 0.5, Math.PI);
    const spots: Record<string, Spot> = {
      sortParts: at(stand(), reach, 'rummage'),
      mechanic_quotePrices: at(stand(), writeAt, 'write'),
      plumber_estimateCosts: at(stand(), writeAt, 'write'),
      '*': at(stand(), reach, 'rummage'),
    };
    out.spots = spots;
    out.work = reach;
    const order = [2, 1, 2, 3, 1];
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const writing = now === 'mechanic_quotePrices' || now === 'plumber_estimateCosts';
      held.visible = writing;
      hung.visible = !writing;
      if (!writing) {
        // From shelf to shelf, a bin and the next.
        const i = Math.floor(t / 4.5 + phaseAt(spots[now ?? '*']) * 5);
        const li = order[((i % order.length) + order.length) % order.length];
        reach.position.set(((i * 0.37) % 1 - 0.5) * (w - 0.3), levels[li] + 0.12, front - 0.08);
      }
    };
  },

  // -------------------------------------------------------------------------------------------
  // New for the shop (workFurniture/mechanic.ts).

  /**
   * The tyre changer (타이어 탈착기): a red cabinet with its pedals, a wheel clamped flat on the
   * turntable by its four jaws, the column at the back with the arm and the mount head over the
   * rim's far edge, the bead breaker's arm and blade at the side, the inflation gauge, a stack of new
   * tyres beside it. Fitting a tyre (mecMountTire): stood at the front, both hands levering the bead
   * down over the head with the tyre lever, then the pedal down and the table turning while the left
   * hand presses the tyre's wall; the lever lifted out.
   */
  mecTireChanger(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.78;
    part(g, rbox(0.7, top - 0.04, 0.62, 0.04), RED, 0, (top - 0.04) / 2, -0.06);
    part(g, rbox(0.72, 0.04, 0.64, 0.01), '#37474f', 0, top - 0.02, -0.06);
    label(g, 'TIRE CHANGER', 0.36, 0.06, 0, 0.5, 0.252, RED, '#ffffff');
    // The pedals at the front foot.
    const pedals = [-0.14, 0, 0.14].map((x) => part(g, rbox(0.09, 0.03, 0.14, 0.01), '#212121', x, 0.04, 0.3));
    // The turntable and its jaws, the wheel clamped flat.
    const table = new THREE.Group();
    table.position.set(0, top, -0.04);
    g.add(table);
    part(table, cyl(0.3, 0.3, 0.04, 26), '#263238', 0, 0.02, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      part(table, rbox(0.06, 0.05, 0.12, 0.01), '#9e9e9e', Math.sin(a) * 0.18, 0.06, Math.cos(a) * 0.18, { ry: a });
    }
    const wheelTop = top + 0.04 + 0.2;
    part(table, cyl(0.3, 0.3, 0.2, 26), TYRE, 0, 0.14, 0);
    part(table, cyl(0.265, 0.265, 0.205, 26), '#333338', 0, 0.14, 0, { outline: false });
    part(table, cyl(0.19, 0.19, 0.21, 22), '#c9d1d6', 0, 0.14, 0, { outline: false });
    part(table, cyl(0.05, 0.05, 0.22, 12), '#78909c', 0, 0.14, 0, { outline: false });
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      part(table, box(0.03, 0.006, 0.14), '#aeb8bf', Math.sin(a) * 0.1, 0.247, Math.cos(a) * 0.1, { ry: a, outline: false });
    }
    // The column, the arm and the mount head.
    const cz = -0.4;
    part(g, rbox(0.14, 1.4, 0.14, 0.02), RED, 0, 0.7 + top * 0.3, cz);
    part(g, rbox(0.1, 0.1, 0.46, 0.02), '#424242', 0, 1.42, cz + 0.2);
    rod(g, new THREE.Vector3(0, 1.4, -0.21), new THREE.Vector3(0, wheelTop + 0.05, -0.21), 0.025, CHROME);
    part(g, rbox(0.07, 0.06, 0.08, 0.015), '#212121', 0, wheelTop + 0.04, -0.21);
    // The bead breaker at the side, the gauge on the column.
    rod(g, new THREE.Vector3(0.36, 0.3, -0.1), new THREE.Vector3(0.44, 0.78, -0.3), 0.025, '#424242');
    part(g, rbox(0.03, 0.18, 0.12, 0.01), '#9e9e9e', 0.44, 0.38, -0.02);
    part(g, cyl(0.045, 0.045, 0.02, 16), '#eceff1', 0.0, 1.05, cz + 0.075, { rx: Math.PI / 2 });
    part(g, box(0.004, 0.035, 0.004), RED, 0.01, 1.05, cz + 0.087, { rz: -0.6, outline: false });
    // New tyres stacked beside it.
    for (let i = 0; i < 3; i++) part(g, cyl(0.24, 0.24, 0.17, 22), TYRE, -0.32, 0.09 + i * 0.175, 0.3, { outline: i === 2 }).scale.set(0.55, 1, 0.55);
    // The tyre lever: stood against the column at rest, in the hands in use.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    rod(idle, new THREE.Vector3(0.12, 0.05, cz + 0.12), new THREE.Vector3(0.1, 0.62, cz + 0.06), 0.012, CHROME);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const lever = unitRod(use, 0.012, CHROME);
    const grip = part(use, cyl(0.018, 0.018, 0.1, 10), '#1565c0', 0, 0, 0, { outline: false });
    const workAt = marker(g, 0, wheelTop, -0.04);
    const yaw = Math.PI;
    const sp = at(spot(g, 'stand', 0, 0, 0.62, yaw), workAt, 'tyreLever');
    const spots: Record<string, Spot> = { mecMountTire: sp, '*': sp };
    out.spots = spots;
    out.work = workAt;
    const F = framer(workAt.position.clone(), yaw);
    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    let spun = 0;
    let last = 0;
    out.animate = (t) => {
      const k = leverRound(t, phaseAt(sp));
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      if (k.spin) spun += dt * 2.6;
      table.rotation.y = spun;
      pedals[1].position.y = k.spin ? 0.025 : 0.04;
      const tip = F(LEVER.head, v);
      const h = F(k.handle, w);
      stretch(lever, tip, h);
      grip.position.copy(h);
      grip.quaternion.copy(lever.quaternion);
    };
  },

  /**
   * The wheel balancer (휠 밸런서): a blue cabinet with its weight tray (clip-on weights in their
   * compartments), the read-outs on a mast (IN / OUT), a wheel on the shaft facing whoever stands at
   * it and the guard over it on its hinge. Balancing (mecBalanceWheel): the guard comes down, the
   * wheel spins up (the read-outs counting), stops, the guard goes up, the grams to fit come up, and a
   * weight's clipped to the rim (OK).
   */
  mecWheelBalancer(g, _W, _D, _c, _def, _ctx, out) {
    const cz = -0.22;
    part(g, rbox(0.64, 0.82, 0.48, 0.04), '#1565c0', 0, 0.41, cz);
    part(g, rbox(0.66, 0.08, 0.5, 0.02), '#cfd8dc', 0, 0.86, cz);
    for (let i = 0; i < 8; i++) part(g, box(0.06, 0.02, 0.08), '#90a4ae', -0.27 + i * 0.077, 0.9, cz + 0.1, { outline: false });
    for (let i = 0; i < 8; i++) part(g, box(0.04, 0.012, 0.02), '#b0bec5', -0.27 + i * 0.077, 0.912, cz + 0.1 - 0.02 + (i % 2) * 0.02, { outline: false });
    // The read-outs on the mast.
    rod(g, new THREE.Vector3(0, 0.9, cz - 0.18), new THREE.Vector3(0, 1.25, cz - 0.18), 0.025, '#37474f');
    part(g, rbox(0.5, 0.2, 0.06, 0.02), '#263238', 0, 1.32, cz - 0.16, { rx: -0.2 });
    const idleTex = painted('mec-bal-idle', 256, 96, balance('- - -', '- - -', '#616161'));
    const spinTex = painted('mec-bal-spin', 256, 96, balance('8 8', '8 8'));
    const readTex = painted('mec-bal-read', 256, 96, balance('15', '05'));
    const okTex = painted('mec-bal-ok', 256, 96, balance('0', 'OK', '#00e676'));
    const display = picture(g, idleTex, 0.42, 0.16, 0, 1.325, cz - 0.125, '#ffffff', 0, -0.2);
    // The shaft out of the cabinet's front and the wheel on it.
    rod(g, new THREE.Vector3(0, 0.55, cz + 0.24), new THREE.Vector3(0, 0.55, 0.28), 0.025, CHROME);
    const wheelG = new THREE.Group();
    wheelG.position.set(0, 0.55, 0.12);
    g.add(wheelG);
    part(wheelG, cyl(0.3, 0.3, 0.2, 26), TYRE, 0, 0, 0, { rx: Math.PI / 2 });
    part(wheelG, cyl(0.19, 0.19, 0.02, 22), '#c9d1d6', 0, 0, 0.095, { rx: Math.PI / 2 });
    for (let i = 0; i < 5; i++) part(wheelG, box(0.034, 0.15, 0.012), '#aeb8bf', Math.sin((i * Math.PI * 2) / 5) * 0.1, Math.cos((i * Math.PI * 2) / 5) * 0.1, 0.106, { rz: -(i * Math.PI * 2) / 5, outline: false });
    part(wheelG, cyl(0.045, 0.045, 0.06, 12), '#455a64', 0, 0, 0.13, { rx: Math.PI / 2 });
    const weight = part(wheelG, box(0.06, 0.015, 0.02), '#9e9e9e', 0, 0.185, 0.1, { outline: false });
    // The guard on its hinge at the back.
    const guard = new THREE.Group();
    guard.position.set(0, 0.92, cz + 0.2);
    g.add(guard);
    part(guard, new THREE.CylinderGeometry(0.36, 0.36, 0.3, 20, 1, true, -Math.PI / 2, Math.PI), '#90a4ae', 0, -0.28, 0.12, { rx: Math.PI / 2, rz: Math.PI / 2 }).userData.ownGeometry = true;
    const workAt = marker(g, 0, 0.85, 0.16);
    const sp = at(spot(g, 'stand', 0, 0, 0.64, Math.PI), workAt, 'tinker');
    out.spots = { mecBalanceWheel: sp, '*': sp };
    out.work = workAt;
    guard.rotation.x = -1.2;
    weight.visible = false;
    out.animate = (t) => {
      const u = ((t / 10 + phaseAt(sp)) % 1 + 1) % 1;
      const down = THREE.MathUtils.smoothstep(u, 0.02, 0.12) * (1 - THREE.MathUtils.smoothstep(u, 0.55, 0.65));
      guard.rotation.x = -1.2 * (1 - down);
      const spinning = u > 0.12 && u < 0.52;
      wheelG.rotation.z = spinning ? t * 30 : 0.4 * THREE.MathUtils.smoothstep(u, 0.6, 0.8);
      weight.visible = u > 0.82;
      const mat = display.material as THREE.MeshBasicMaterial;
      const want = spinning ? spinTex : u < 0.12 ? idleTex : u < 0.84 ? readTex : okTex;
      if (mat.map !== want) {
        mat.map = want;
        mat.needsUpdate = true;
      }
    };
  },

  /**
   * The oil drain caddy (폐유 회수기) by its waste-oil drum: a yellow tank on castors, its funnel
   * telescoped down, the sight tube up its side, the drain hose from its valve to the drum's bung,
   * 폐유 painted on both. Emptying it (mecEmptyOil): crouched at the valve, turning it, the level in
   * the sight tube going down.
   */
  mecOilCaddy(g, _W, _D, _c, _def, _ctx, out) {
    const cx = 0.16;
    const cz = 0.02;
    part(g, cyl(0.22, 0.22, 0.46, 20), '#ffb300', cx, 0.33, cz);
    part(g, cyl(0.2, 0.2, 0.02, 20), '#3a2a12', cx, 0.565, cz, { outline: false });
    for (let i = 0; i < 4; i++) caster(g, cx + Math.cos(i * 1.57 + 0.78) * 0.17, cz + Math.sin(i * 1.57 + 0.78) * 0.17);
    rod(g, new THREE.Vector3(cx, 0.56, cz), new THREE.Vector3(cx, 0.9, cz), 0.022, CHROME);
    part(g, new THREE.CylinderGeometry(0.2, 0.05, 0.14, 20, 1, true), '#ffb300', cx, 0.97, cz).userData.ownGeometry = true;
    label(g, '폐유 WASTE OIL', 0.3, 0.06, cx, 0.38, cz + 0.222, '#ffb300', '#111111');
    // The sight tube and its level.
    glass(g, cyl(0.012, 0.012, 0.36, 8), cx + 0.15, 0.34, cz + 0.16);
    const level = part(g, cyl(0.009, 0.009, 1, 8), OIL, cx + 0.15, 0.3, cz + 0.16, { outline: false });
    // The valve at the foot and its handle.
    part(g, cyl(0.025, 0.025, 0.08, 10), '#9e9e9e', cx - 0.08, 0.16, cz + 0.22, { rx: Math.PI / 2 });
    const handle = part(g, box(0.1, 0.012, 0.012), RED, cx - 0.08, 0.16, cz + 0.27);
    // The drum and its bung, the hose over to it.
    const dx = -0.24;
    const dz = -0.2;
    part(g, cyl(0.2, 0.2, 0.62, 20), NAVY, dx, 0.31, dz);
    for (const y of [0.15, 0.46]) part(g, cyl(0.205, 0.205, 0.025, 20), '#1a2a42', dx, y, dz, { outline: false });
    part(g, cyl(0.03, 0.03, 0.03, 10), '#9e9e9e', dx + 0.08, 0.63, dz + 0.04);
    label(g, '폐유', 0.16, 0.06, dx, 0.3, dz + 0.202, NAVY, '#ffffff');
    rod(g, new THREE.Vector3(cx - 0.08, 0.16, cz + 0.3), new THREE.Vector3(cx - 0.2, 0.2, cz + 0.32), 0.016, BLACK);
    rod(g, new THREE.Vector3(cx - 0.2, 0.2, cz + 0.32), new THREE.Vector3(dx + 0.12, 0.7, dz + 0.16), 0.016, BLACK);
    rod(g, new THREE.Vector3(dx + 0.12, 0.7, dz + 0.16), new THREE.Vector3(dx + 0.08, 0.64, dz + 0.04), 0.016, BLACK);
    // An absorbent pad on the floor under the valve.
    part(g, box(0.3, 0.006, 0.24), '#eceff1', cx - 0.06, 0.003, cz + 0.3, { outline: false });
    const valveAt = marker(g, cx - 0.08, 0.2, cz + 0.27);
    const sp = at(spot(g, 'stand', cx - 0.08, 0, cz + 0.72, Math.PI), valveAt, 'tinker');
    out.spots = { mecEmptyOil: sp, '*': sp };
    out.work = valveAt;
    const setLevel = (k: number) => {
      level.scale.y = 0.04 + 0.3 * k;
      level.position.y = 0.17 + level.scale.y / 2;
    };
    setLevel(0.8);
    out.animate = (t) => {
      const u = ((t / 14 + phaseAt(sp)) % 1 + 1) % 1;
      setLevel(0.8 - 0.75 * THREE.MathUtils.smoothstep(u, 0.1, 0.85));
      handle.rotation.y = u > 0.06 && u < 0.88 ? -Math.PI / 2 : 0;
    };
  },

  /**
   * The rolling tool chest (공구 카트): a red cabinet on castors, seven drawers with chrome bars, the
   * top box with its lid up and a tray of sockets, a magnetic dish of bolts, a rag over the handle.
   * Getting the job's tools (mecPrepTools): the top drawer out, rummaging in its spanners.
   */
  mecToolChest(g, _W, _D, c, _def, _ctx, out) {
    const cw = 0.74;
    const cd = 0.46;
    const z0 = -0.1;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * (cw / 2 - 0.06), z0 + sz * (cd / 2 - 0.06), 0.045);
    part(g, rbox(cw, 0.82, cd, 0.03), c, 0, 0.53, z0);
    const fz = z0 + cd / 2;
    const rows = [0.86, 0.78, 0.7, 0.6, 0.48, 0.36, 0.22];
    rows.forEach((y, i) => {
      if (i === 0) return;
      part(g, box(cw - 0.06, 0.004, 0.004), '#7f1010', 0, y + 0.045, fz + 0.002, { outline: false });
      part(g, box(cw - 0.16, 0.014, 0.02), CHROME, 0, y + 0.02, fz + 0.012);
    });
    // The top drawer: slides out while in use, spanners laid in its foam.
    const drawer = new THREE.Group();
    g.add(drawer);
    part(drawer, box(cw - 0.06, 0.07, cd - 0.06), '#7f1010', 0, rows[0], z0);
    part(drawer, box(cw - 0.1, 0.004, cd - 0.1), '#212121', 0, rows[0] + 0.036, z0, { outline: false });
    for (let i = 0; i < 7; i++) {
      const s = spanner(drawer, 0.16 + i * 0.012);
      s.rotation.x = -Math.PI / 2;
      s.position.set(-0.26 + i * 0.085, rows[0] + 0.04, z0);
    }
    part(drawer, box(cw - 0.06, 0.07, 0.02), c, 0, rows[0], fz);
    part(drawer, box(cw - 0.16, 0.014, 0.02), CHROME, 0, rows[0] + 0.02, fz + 0.012);
    // The top box: its lid up, a socket tray inside, a magnetic dish and a rag.
    part(g, rbox(cw - 0.02, 0.22, cd - 0.04, 0.02), c, 0, 1.05, z0);
    const lid = new THREE.Group();
    lid.position.set(0, 1.16, z0 - cd / 2 + 0.02);
    lid.rotation.x = -1.7;
    g.add(lid);
    part(lid, rbox(cw - 0.02, 0.03, cd - 0.04, 0.015), c, 0, 0, cd / 2 - 0.02);
    for (let i = 0; i < 10; i++) part(g, cyl(0.014, 0.014, 0.03, 8), CHROME, -0.28 + i * 0.062, 1.17, z0 + 0.08, { outline: false });
    part(g, cyl(0.07, 0.06, 0.02, 16), '#9e9e9e', 0.22, 1.17, z0 - 0.08);
    for (let i = 0; i < 4; i++) part(g, cyl(0.008, 0.008, 0.02, 6), '#616161', 0.2 + (i % 2) * 0.03, 1.185, z0 - 0.09 + (i > 1 ? 0.03 : 0), { outline: false });
    part(g, box(0.04, 0.3, 0.04), CHROME, cw / 2 + 0.03, 0.85, z0, { outline: false });
    part(g, box(0.012, 0.2, 0.14), '#e0e0e0', cw / 2 + 0.06, 0.74, z0 + 0.0, { rz: 0.05 });
    label(g, 'TOOLS', 0.16, 0.04, 0, 1.08, z0 + cd / 2 - 0.018, c, '#ffffff');
    const drawerAt = marker(g, 0, rows[0] + 0.05, fz + 0.12);
    const sp = at(spot(g, 'stand', 0, 0, fz + 0.5, Math.PI), drawerAt, 'rummage');
    out.spots = { mecPrepTools: sp, '*': sp };
    out.work = drawerAt;
    // Out while it's rummaged in, back in after (told every frame).
    out.away = (_o, t) => {
      const want = t - posedAt(sp) < 0.6 ? 0.28 : 0;
      drawer.position.z += (want - drawer.position.z) * 0.15;
    };
  },

  /**
   * The service desk (정비 접수 데스크, 2 wide, the staff side its front): a grey desk with the
   * customers' ledge across its back — its red face with 정비 접수 and the price list stood on it —
   * the monitor with the job card (차량번호, 주행거리, 고객 요청, the estimate), the 견적서 form
   * printed and laid by the keyboard, the car keys on their tagged hooks in a little cabinet, the card
   * terminal, a cup of pens, the chair. Writing up a quote (mecWriteQuote): sat, writing on the 견적서.
   */
  mecReceptionDesk(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.1;
    const top = 0.75;
    part(g, rbox(w, top, 0.5, 0.02), '#cfd8dc', 0, top / 2, -0.1);
    part(g, rbox(w + 0.02, 0.03, 0.56, 0.01), '#eceff1', 0, top + 0.01, -0.08);
    // The ledge to the customers (the back), its face to them with the shop's sign.
    const lz = -D / 2 + 0.07;
    part(g, rbox(w, 1.08, 0.08, 0.02), RED, 0, 0.54, lz);
    part(g, rbox(w + 0.04, 0.035, 0.24, 0.01), '#eceff1', 0, 1.095, lz + 0.04);
    label(g, '정비 접수 · 견적', 0.8, 0.12, 0, 0.74, lz - 0.041, RED, '#ffffff', Math.PI);
    label(g, 'CAR SERVICE', 0.5, 0.06, 0, 0.58, lz - 0.041, RED, '#ffcdd2', Math.PI);
    // The price list in its stand on the ledge, facing the customers.
    part(g, box(0.2, 0.26, 0.012), '#263238', -0.55, 1.25, lz + 0.03, { rx: 0.15 });
    picture(g, painted('mec-menu', 192, 256, paintMenu), 0.18, 0.24, -0.55, 1.25, lz + 0.022, '#ffffff', Math.PI, -0.15);
    // A bell and business cards on the ledge.
    part(g, cyl(0.04, 0.05, 0.03, 14), '#ffca28', 0.55, 1.13, lz + 0.05);
    part(g, rbox(0.09, 0.02, 0.06, 0.005), '#ffffff', 0.4, 1.12, lz + 0.05);
    // The desk top: monitor, keyboard, the quote form, the key cabinet, the card terminal, pens.
    const mz = -0.22;
    part(g, rbox(0.16, 0.012, 0.12, 0.004), BLACK, 0.15, top + 0.026, mz);
    part(g, box(0.03, 0.22, 0.025), BLACK, 0.15, top + 0.14, mz - 0.02, { outline: false });
    part(g, rbox(0.52, 0.33, 0.03, 0.01), BLACK, 0.15, top + 0.4, mz - 0.01);
    out.screen = litScreen(g, painted('mec-intake', 512, 320, paintIntake), 0.48, 0.3, 0.15, top + 0.4, mz + 0.008);
    part(g, rbox(0.4, 0.018, 0.13, 0.006), '#37474f', 0.15, top + 0.034, 0.0);
    const form = picture(g, painted('mec-quote', 192, 256, paintQuote), 0.2, 0.27, -0.32, top + 0.027, 0.04, '#ffffff', 0, -Math.PI / 2);
    form.rotation.set(-Math.PI / 2, 0, 0.12);
    rod(g, new THREE.Vector3(-0.22, top + 0.03, 0.08), new THREE.Vector3(-0.2, top + 0.03, -0.06), 0.005, '#1e88e5');
    const kx = -w / 2 + 0.12;
    part(g, rbox(0.2, 0.3, 0.06, 0.01), '#eceff1', kx, top + 0.18, -0.3);
    for (let i = 0; i < 6; i++) {
      const x = kx - 0.06 + (i % 3) * 0.06;
      const y = top + 0.27 - Math.floor(i / 3) * 0.12;
      part(g, cyl(0.004, 0.004, 0.02, 6), CHROME, x, y, -0.26, { rx: Math.PI / 2, outline: false });
      part(g, box(0.012, 0.05, 0.006), BLACK, x, y - 0.035, -0.255, { outline: false });
      part(g, box(0.03, 0.025, 0.003), ['#fff59d', '#80deea', '#ffab91'][i % 3], x, y - 0.075, -0.255, { outline: false });
    }
    part(g, rbox(0.08, 0.04, 0.14, 0.01), '#263238', 0.6, top + 0.035, -0.05, { rx: 0.2 });
    part(g, cyl(0.035, 0.035, 0.1, 12), '#90a4ae', 0.62, top + 0.05, -0.28);
    // The chair on the staff side, the papers' place where the pen goes.
    const seatY = 0.48;
    const cz = 0.42;
    const chair = new THREE.Group();
    chair.position.set(-0.25, 0, cz);
    chair.rotation.y = Math.PI;
    g.add(chair);
    part(chair, cyl(0.035, 0.035, 0.38, 8), BLACK, 0, 0.22, 0, { outline: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      rod(chair, new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.04, Math.cos(a) * 0.24), 0.015, BLACK);
    }
    part(chair, rbox(0.46, 0.08, 0.44, 0.04), '#37474f', 0, seatY - 0.04, 0);
    part(chair, rbox(0.44, 0.48, 0.06, 0.04), '#37474f', 0, seatY + 0.3, -0.21);
    const formAt = marker(g, -0.3, top + 0.03, 0.04);
    const sp = at(spot(g, 'sit', -0.25, seatY, cz, Math.PI, seatY), formAt, 'write');
    out.spots = { mecWriteQuote: sp, '*': sp };
    out.seat = marker(g, -0.25, seatY, cz);
    out.work = formAt;
  },

  /**
   * The customers' waiting chair (고객 대기 의자): a padded black seat and back on a chrome sled frame
   * with arms. Whoever's brought their car in waits in it. Explaining the repair (explainRepair): stood
   * at the chair's side holding out the worn brake pad that came off their car; the quote
   * (estimateQuote): holding out the 견적서 on its clipboard, a finger going to the total.
   */
  mecWaitSeat(g, _W, _D, _c, _def, _ctx, out) {
    const seatY = 0.46;
    for (const sx of [-1, 1]) {
      rod(g, new THREE.Vector3(sx * 0.24, 0.02, 0.24), new THREE.Vector3(sx * 0.24, 0.02, -0.22), 0.014, CHROME);
      rod(g, new THREE.Vector3(sx * 0.24, 0.02, 0.24), new THREE.Vector3(sx * 0.24, seatY - 0.06, 0.2), 0.014, CHROME);
      rod(g, new THREE.Vector3(sx * 0.24, 0.02, -0.22), new THREE.Vector3(sx * 0.24, 0.9, -0.26), 0.014, CHROME);
      rod(g, new THREE.Vector3(sx * 0.24, 0.64, 0.18), new THREE.Vector3(sx * 0.24, 0.64, -0.24), 0.014, CHROME);
      part(g, rbox(0.06, 0.03, 0.3, 0.012), BLACK, sx * 0.24, 0.66, -0.02);
    }
    part(g, rbox(0.46, 0.08, 0.44, 0.04), '#2b2b30', 0, seatY - 0.04, 0);
    part(g, rbox(0.44, 0.44, 0.07, 0.04), '#2b2b30', 0, seatY + 0.26, -0.22, { rx: -0.08 });
    for (let i = 0; i < 3; i++) part(g, box(0.4, 0.006, 0.004), '#3d3d44', 0, seatY + 0.12 + i * 0.12, -0.18, { outline: false });
    out.seat = marker(g, 0, seatY, 0.03);
    const showAt = marker(g, 0.24, 1.0, 0.18);
    const stand = () => spot(g, 'stand', 0.56, 0, 0.14, -Math.PI / 2);
    const spots: Record<string, Spot> = {
      'social:explainRepair': at(stand(), showAt, 'bookShow'),
      'social:estimateQuote': at(stand(), showAt, 'bookShow'),
    };
    out.spots = spots;
    const held = new THREE.Group();
    held.position.copy(showAt.position);
    held.rotation.set(-0.15, -Math.PI / 2 + 0.35, 0);
    g.add(held);
    const quote = clipboard(held, painted('mec-quote', 192, 256, paintQuote), 0.17, 0.23);
    const pad = new THREE.Group();
    held.add(pad);
    // The worn pad: its steel backing plate and what's left of the friction, scored; a new one beside.
    part(pad, rbox(0.14, 0.06, 0.012, 0.005), '#5f6a72', -0.04, 0, 0);
    part(pad, rbox(0.12, 0.045, 0.004, 0.003), '#3e2f26', -0.04, 0, 0.008);
    part(pad, rbox(0.14, 0.06, 0.012, 0.005), '#5f6a72', 0.07, 0.04, -0.01, { rz: 0.2 });
    part(pad, rbox(0.12, 0.045, 0.016, 0.003), '#7a5a46', 0.07, 0.04, 0.004, { rz: 0.2 });
    quote.visible = pad.visible = false;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      quote.visible = now === 'social:estimateQuote';
      pad.visible = now === 'social:explainRepair';
      held.rotation.z = 0.04 * wave(t, 0.2);
    };
  },

  /**
   * The coffee vending machine (커피 자판기): tall and red, its face a big lit picture of a cup of
   * coffee with the menu buttons under it (밀크커피, 블랙커피, 율무차…, 400원 each), the coin slot and
   * the note reader, the price read-out, the cup hatch at waist height. A coffee (mecVendingCoffee):
   * the hatch lit and a cup in it, drunk stood at the machine.
   */
  mecVendingMachine(g, _W, D, _c, _def, _ctx, out) {
    const z0 = -D / 2 + 0.36;
    part(g, rbox(0.72, 1.8, 0.66, 0.03), '#b71c1c', 0, 0.9, z0);
    const fz = z0 + 0.331;
    picture(g, painted('mec-vending', 256, 320, paintVending), 0.5, 0.62, -0.06, 1.28, fz);
    // The coin slot, the note reader, the read-out, the return lever.
    part(g, rbox(0.14, 0.42, 0.02, 0.01), '#212121', 0.27, 1.25, fz);
    part(g, box(0.008, 0.04, 0.005), CHROME, 0.27, 1.38, fz + 0.012, { outline: false });
    part(g, box(0.09, 0.012, 0.005), '#ffca28', 0.27, 1.26, fz + 0.012, { outline: false });
    glowing(g, box(0.1, 0.035, 0.004), '#ff1744', 0.27, 1.15, fz + 0.012);
    label(g, '400', 0.07, 0.025, 0.27, 1.15, fz + 0.015, '#1a0000', '#ff5252');
    part(g, box(0.05, 0.02, 0.02), CHROME, 0.27, 1.08, fz + 0.015);
    // The cup hatch.
    part(g, rbox(0.24, 0.24, 0.03, 0.02), '#212121', -0.06, 0.7, fz);
    part(g, box(0.2, 0.2, 0.004), '#3a2a20', -0.06, 0.7, fz + 0.017, { outline: false });
    part(g, rbox(0.72, 0.4, 0.02, 0.01), '#8e1414', 0, 0.22, fz - 0.005);
    part(g, rbox(0.26, 0.02, 0.1, 0.008), '#212121', -0.06, 0.59, fz + 0.04);
    label(g, '따뜻한 커피 한 잔', 0.48, 0.07, 0, 0.3, fz + 0.007, '#8e1414', '#ffe082');
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    glowing(use, box(0.2, 0.2, 0.004), '#ffe0b2', -0.06, 0.7, fz + 0.019);
    paperCup(use, -0.06, 0.6, fz + 0.05);
    const sp = at(spot(g, 'stand', -0.06, 0, fz + 0.45, Math.PI), undefined, 'drink');
    out.spots = { mecVendingCoffee: sp, '*': sp };
    out.work = marker(g, -0.06, 0.7, fz);
  },

  /**
   * The lounge TV (대기실 TV, 2 wide, against the wall): a big flat screen on a low cabinet showing
   * the baseball (서울 3 : 2 부산, 7회말), a rack of car magazines and a box of tissues beside, a
   * sign that the car will be ready within the hour.
   */
  mecLoungeTv(g, W, D) {
    const w = W - 0.2;
    const zc = -D / 2 + 0.25;
    part(g, rbox(w, 0.42, 0.4, 0.02), '#5d4037', 0, 0.21, zc);
    for (const sx of [-1, 1]) part(g, box(w / 2 - 0.06, 0.3, 0.004), '#4e342e', sx * (w / 4), 0.21, zc + 0.201, { outline: false });
    part(g, rbox(0.3, 0.02, 0.2, 0.01), BLACK, 0, 0.43, zc - 0.03);
    part(g, box(0.06, 0.18, 0.04), BLACK, 0, 0.52, zc - 0.05, { outline: false });
    part(g, rbox(1.3, 0.76, 0.05, 0.015), BLACK, 0, 1.0, zc - 0.05);
    picture(g, painted('mec-tv', 512, 288, paintBaseball), 1.24, 0.7, 0, 1.0, zc - 0.023);
    // Magazines in a rack at one end, tissues at the other.
    const r = seeded(8);
    for (let i = 0; i < 4; i++) part(g, box(0.18, 0.24, 0.012), ['#1e88e5', '#e53935', '#43a047', '#fdd835'][i], w / 2 - 0.18 + (r() - 0.5) * 0.02, 0.55, zc + 0.12 - i * 0.03, { rx: -0.2 });
    label(g, '월간 자동차', 0.14, 0.03, w / 2 - 0.18, 0.62, zc + 0.14, '#1e88e5', '#ffffff');
    part(g, rbox(0.2, 0.08, 0.11, 0.01), '#e1f5fe', -w / 2 + 0.2, 0.46, zc + 0.05);
    part(g, box(0.06, 0.04, 0.03), '#ffffff', -w / 2 + 0.2, 0.51, zc + 0.05, { outline: false });
    part(g, box(0.2, 0.12, 0.01), '#ffffff', -w / 2 + 0.45, 0.48, zc + 0.12, { rx: -0.2 });
    label(g, '수리 중 잠시만 기다려 주세요', 0.19, 0.05, -w / 2 + 0.45, 0.49, zc + 0.127, '#ffffff', '#c62828');
  },

  /** The bays' walls to the lot (2026-11-05, the layout audit: the bays open on the forecourt): brick, set to their inner face. */
  mecBayWallSide(g, W, D) {
    bayWall(g, W, D, 1);
  },
  mecBayWallBack(g, W, D) {
    bayWall(g, W, D, 1);
  },
  /** The bays' open front: three openings, one before each lift, the shutters rolled up, the shop's name on the header. */
  mecBayFront(g) {
    bayFront(g, 2, [1.9, 6.5, 11.5, 15.9], [[2.1, 6.3], [6.7, 11.3], [11.7, 15.7]], '한길카센터');
  },

  /**
   * The tyre rack behind the bays (타이어 적재대, 2 wide, against the wall; 2026-11-05, the layout audit): a steel frame of two
   * shelves with tyres stood on their treads in a row, a stack of four on the floor at one end, a chalked tag for whose car they are.
   */
  mecTyreRack(g, W, D) {
    const w = W - 0.12;
    const zc = -D / 2 + 0.3;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, 1.7, 0.05), '#455a64', sx * (w / 2), 0.85, zc + sz * 0.24, { outline: false });
    for (const y of [0.12, 0.9]) part(g, box(w, 0.04, 0.52), '#546e7a', 0, y, zc);
    part(g, box(w, 0.04, 0.52), '#546e7a', 0, 1.68, zc);
    const r = seeded(17);
    for (const y of [0.14, 0.92])
      for (let i = 0; i < 6; i++) {
        const x = -w / 2 + 0.16 + i * ((w - 0.32) / 5);
        if (y > 0.5 && i > 4) continue;
        part(g, new THREE.TorusGeometry(0.27, 0.1, 8, 20), TYRE, x, y + 0.37, zc + (r() - 0.5) * 0.04, { ry: Math.PI / 2, outline: false });
      }
    label(g, '12가 3456 · 겨울용', 0.3, 0.06, -w / 2 + 0.3, 1.5, zc + 0.4, '#ffffff', '#263238');
  },

  /** Two blue waste-oil drums (폐유 드럼) on a spill tray, a funnel on one, the 지정폐기물 notice on the wall behind. */
  mecOilDrums(g, _W, D) {
    const zc = -D / 2 + 0.36;
    part(g, rbox(0.86, 0.08, 0.6, 0.02), '#fbc02d', 0, 0.04, zc);
    for (const x of [-0.2, 0.2]) {
      part(g, cyl(0.19, 0.19, 0.86, 18), '#2e5e8c', x, 0.51, zc);
      for (const y of [0.28, 0.72]) part(g, cyl(0.195, 0.195, 0.03, 18), '#244b70', x, y, zc, { outline: false });
    }
    part(g, new THREE.CylinderGeometry(0.14, 0.03, 0.14, 16, 1, true), '#ffb300', -0.2, 1.0, zc).userData.ownGeometry = true;
    picture(g, painted('mec-oilNotice', 256, 160, (c) => {
      c.fillStyle = '#fff8e1';
      c.fillRect(0, 0, 256, 160);
      c.fillStyle = '#e65100';
      c.fillRect(0, 0, 256, 44);
      text(c, '지정폐기물 보관', 128, 23, 26, '#ffffff', 'center');
      text(c, '폐유 · 폐필터', 128, 78, 24, '#3e2723', 'center');
      text(c, '화기 엄금', 128, 122, 26, '#c62828', 'center');
    }), 0.5, 0.31, 0, 1.5, -D / 2 + 0.02);
  },

  /**
   * The shop's sign pole on the forecourt by the street (정비소 간판 기둥): a steel post with the lit sign board on top, both
   * faces lettered with the made-up name and what's done, as a 카센터's sign reads from the road.
   */
  mecSignPole(g) {
    part(g, box(0.5, 0.06, 0.5), '#9e9e9e', 0, 0.03, 0);
    part(g, cyl(0.07, 0.08, 3.2, 12), '#90a4ae', 0, 1.6, 0);
    part(g, rbox(1.3, 0.9, 0.18, 0.03), '#eceff1', 0, 3.6, 0);
    const face = painted('mec-sign', 320, 220, (c) => {
      c.fillStyle = RED;
      c.fillRect(0, 0, 320, 220);
      c.fillStyle = '#ffffff';
      c.fillRect(10, 10, 300, 110);
      text(c, '한길카센터', 160, 66, 46, RED, 'center');
      text(c, '엔진 · 타이어 · 오일', 160, 152, 28, '#ffffff', 'center');
      text(c, '종합 정비', 160, 194, 26, '#ffe082', 'center');
    });
    for (const s of [-1, 1]) {
      const p = picture(g, face, 1.22, 0.82, 0, 3.6, s * 0.095);
      if (s < 0) p.rotation.y = Math.PI;
    }
  },
};

