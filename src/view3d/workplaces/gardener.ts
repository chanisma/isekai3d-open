import * as THREE from 'three';
import type { BarOffset, Motion } from '../activity';
import { sceneClock } from '../sceneClock';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, WATER, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, text, type Paint } from './doctor';
import {
  BASKET, BUDGET, CAN, CLIMATE, GIFT, GRAFT, KOI, MISTC, REPOT, SOIL, SOW, STORM, SURVEY,
  basketRound, budgetRound, canRound, climateRound, gPhase, giftRound, graftRound, koiRound, mistCaseRound, repotRound, soilRound, sowRound, stormGrip, stormRound, surveyRound,
} from './gardenerMotion';

/**
 * The 식물원 온실 drawn as itself (2026-10-27 workplace pipeline, at the user's request): the rare-plant
 * case (a glass terrarium cabinet of orchids, a pitcher plant, ferns and jewel orchids, its front
 * pane slid open to mist them and look at a leaf through a loupe), the climate panel (temperature,
 * humidity and CO₂ on its touchscreen, the vent dial, the storm buttons and the big lever, the mist
 * header over it fogging while it's set), the potting bench (a plant tipped out of its nursery pot,
 * its roots teased loose, set into terracotta and firmed in with the thumbs; grafting with the knife
 * and tape; the soil mixed in the tub). And what the greenhouse was missing (workFurniture/gardener.ts):
 * the propagation shelf under its grow lights, the misting posts with their hanging baskets, the koi
 * pond and its waterfall, the visitors' bench, the plant-label sign, the watering-can tap and the gift
 * stand. The hands and the props keep the same clock (gardenerMotion.ts).
 */

const TERRA = '#c1693c';
const SOILC = '#4e342e';
const PEAT = '#6d4c41';
const ROOT = '#d7b98a';
const LEAF = '#4caf50';
const LEAF_DK = '#2e7d32';
const LEAF_LT = '#8bc34a';
const NURSERY = '#263238';
const CEDAR = '#b5835a';
const CEDAR_DK = '#8d6240';
const GALV = '#b0bec5';
const IRON = '#2f4f3a';
const STONE = '#9e9e9e';
const STONE_DK = '#757575';
const KOI_ORANGE = '#ff7043';
const MIST = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.33, depthWrite: false });
const POND = new THREE.MeshToonMaterial({ color: '#4fa9b8', transparent: true, opacity: 0.62, depthWrite: false });
const FALL = new THREE.MeshBasicMaterial({ color: '#d4f1f9', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
const DOME = new THREE.MeshToonMaterial({ color: '#e8f5e9', transparent: true, opacity: 0.28, depthWrite: false });

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const phaseAt = (s: Spot) => gPhase(s.at.getWorldPosition(tmp));
/** A standing spot at (x, z) facing `yaw`, with the work point and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, work: THREE.Object3D, motion: Motion): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
const UP = new THREE.Vector3(0, 1, 0);
const leftOf = (yaw: number) => new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
const fwdOf = (yaw: number) => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
/** Offsets (to a dweller's left, up, ahead of them) from a point, for a dweller facing `yaw`. */
function offsetter(P: THREE.Vector3, yaw: number) {
  const fwd = fwdOf(yaw);
  const left = leftOf(yaw);
  return (o: BarOffset, v = new THREE.Vector3()) => v.copy(P).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
}
const frac = (x: number) => ((x % 1) + 1) % 1;
/** Runs `tick` by the wall clock once a frame `m` is drawn (koi, a waterfall and timed mist go on whether or not anyone's at them). */
function always(m: THREE.Object3D, tick: (t: number) => void) {
  let last = -1;
  m.onBeforeRender = (renderer: THREE.WebGLRenderer) => {
    const f = renderer.info.render.frame;
    if (f === last) return;
    last = f;
    tick(sceneClock.now);
  };
}

// ---------------------------------------------------------------------------------------------
// Plants and pots.

/** A leaf from its base along heading `a` (round +y from +x towards +z), tipped up `tilt`, `len` long. */
function leaf(g: THREE.Object3D, x: number, y: number, z: number, a: number, tilt: number, len: number, color: string, wide = 0.42) {
  const dx = Math.cos(a) * Math.cos(tilt);
  const dz = Math.sin(a) * Math.cos(tilt);
  const m = part(g, ball(0.5), color, x + (dx * len) / 2, y + (Math.sin(tilt) * len) / 2, z + (dz * len) / 2, { outline: false, ry: -a, rz: tilt });
  m.scale.set(len, len * 0.1, len * wide);
  return m;
}
/** A leafy plant: leaves out from a point, upright to spreading. */
function bush(g: THREE.Object3D, x: number, y: number, z: number, len: number, seed: number, colors = [LEAF, LEAF_DK, LEAF_LT], n = 7, lo = 0.35, hi = 1.15) {
  const rnd = seeded(seed);
  for (let i = 0; i < n; i++) leaf(g, x, y, z, (i / n) * Math.PI * 2 + rnd() * 0.7, lo + rnd() * (hi - lo), len * (0.7 + rnd() * 0.5), colors[i % colors.length]);
}
/** A little flower: petals and a heart. */
function flower(g: THREE.Object3D, x: number, y: number, z: number, r: number, color: string, heart = '#fff59d') {
  part(g, ball(r), color, x, y, z, { outline: false }).scale.set(1, 0.45, 1);
  part(g, ball(r * 0.35), heart, x, y + r * 0.3, z, { outline: false });
}
/** A pot (its base at y): tapered, a rim, the soil `soil` of the way up. */
function pot(g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, color = TERRA, soil = 0.85): THREE.Group {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  g.add(p);
  part(p, cyl(r, r * 0.78, h, 16), color, 0, h / 2, 0);
  part(p, cyl(r * 1.08, r * 1.08, h * 0.16, 16), shade(color, 0.92), 0, h - h * 0.08, 0);
  part(p, cyl(r * 0.9, r * 0.9, 0.008, 14), SOILC, 0, h * soil, 0, { outline: false });
  return p;
}
/** A potted plant of some kind, its pot's base at y. */
function potted(g: THREE.Object3D, x: number, y: number, z: number, kind: 'leafy' | 'succulent' | 'cactus' | 'fern' | 'orchid' | 'flower', seed: number, r = 0.06, color = TERRA) {
  const h = r * 1.5;
  pot(g, x, y, z, r, h, color);
  const top = y + h * 0.85;
  switch (kind) {
    case 'succulent': {
      for (let ring2 = 0; ring2 < 2; ring2++)
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + ring2 * 0.4;
          part(g, cyl(0, r * 0.28, r * (0.9 - ring2 * 0.3), 6), ring2 ? '#a5d6a7' : '#81c784', x + Math.cos(a) * r * 0.35 * (1 - ring2 * 0.5), top + r * 0.25, z + Math.sin(a) * r * 0.35 * (1 - ring2 * 0.5), { outline: false, rx: Math.sin(a) * (1.1 - ring2 * 0.5), rz: -Math.cos(a) * (1.1 - ring2 * 0.5) });
        }
      break;
    }
    case 'cactus':
      part(g, cyl(r * 0.45, r * 0.5, r * 2, 10), '#558b2f', x, top + r, z);
      part(g, ball(r * 0.45), '#558b2f', x, top + r * 2, z);
      flower(g, x, top + r * 2.4, z, r * 0.25, '#f06292');
      break;
    case 'fern':
      bush(g, x, top, z, r * 3.2, seed, [LEAF_LT, LEAF, '#9ccc65'], 9, 0.25, 0.8);
      break;
    case 'orchid':
      orchid(g, x, top, z, seed, r / 0.06);
      break;
    case 'flower': {
      bush(g, x, top, z, r * 2, seed, [LEAF, LEAF_DK], 6, 0.4, 1);
      const rnd = seeded(seed + 3);
      const col = ['#f06292', '#ffd54f', '#ba68c8', '#ffffff'][seed % 4];
      for (let i = 0; i < 4; i++) flower(g, x + (rnd() - 0.5) * r * 1.4, top + r * (1 + rnd() * 0.6), z + (rnd() - 0.5) * r * 1.4, r * 0.3, col);
      break;
    }
    default:
      bush(g, x, top, z, r * 2.6, seed);
  }
}
/** A moth orchid: broad leaves low, a spike arching over with flowers along its end. */
function orchid(g: THREE.Object3D, x: number, y: number, z: number, seed: number, s = 1, color = '#fce4ec') {
  for (let i = 0; i < 4; i++) leaf(g, x, y, z, i * 1.6 + seed, 0.15, 0.16 * s, i % 2 ? LEAF_DK : '#388e3c', 0.5);
  const pts = [new THREE.Vector3(x, y, z), new THREE.Vector3(x + 0.01 * s, y + 0.18 * s, z), new THREE.Vector3(x + 0.05 * s, y + 0.3 * s, z + 0.02 * s), new THREE.Vector3(x + 0.12 * s, y + 0.33 * s, z + 0.04 * s)];
  for (let i = 1; i < pts.length; i++) rod(g, pts[i - 1], pts[i], 0.003 * s, '#6d8b3a');
  for (let i = 0; i < 5; i++) {
    const k = 0.35 + i * 0.16;
    const p = i < 2 ? pts[1].clone().lerp(pts[2], k * 1.6) : pts[2].clone().lerp(pts[3], (k - 0.5) * 1.6);
    flower(g, p.x, p.y - 0.015 * s, p.z + 0.015 * s, 0.022 * s, color, '#ad1457');
  }
}
/** Trailing stems hanging off a basket's rim (ivy and petunias). */
function trailing(g: THREE.Object3D, x: number, y: number, z: number, r: number, seed: number, flowers: string[]) {
  const rnd = seeded(seed);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.3;
    const len = 0.15 + rnd() * 0.25;
    const top = new THREE.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
    const bot = new THREE.Vector3(x + Math.cos(a) * (r + 0.05), y - len, z + Math.sin(a) * (r + 0.05));
    rod(g, top, bot, 0.004, '#558b2f');
    for (let k = 1; k <= 3; k++) {
      const p = top.clone().lerp(bot, k / 3.2);
      leaf(g, p.x, p.y, p.z, a + (k % 2 ? 0.6 : -0.6), -0.4, 0.05, k % 2 ? LEAF : LEAF_DK, 0.6);
    }
    if (i % 2 === 0) flower(g, bot.x, bot.y, bot.z, 0.025, flowers[i % flowers.length]);
  }
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2;
    flower(g, x + Math.cos(a) * r * 0.6, y + 0.03, z + Math.sin(a) * r * 0.6, 0.03, flowers[i % flowers.length]);
  }
  bush(g, x, y, z, 0.13, seed + 1, [LEAF, LEAF_DK], 6, 0.2, 0.7);
}
/** A sprouting seedling in a tray cell: a stalk and two seed leaves (bigger ones a true leaf too). */
function seedling(g: THREE.Object3D, x: number, y: number, z: number, s: number, a = 0) {
  rod(g, new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 0.03 * s, z), 0.0025, '#9ccc65');
  leaf(g, x, y + 0.03 * s, z, a, 0.3, 0.022 * s, LEAF_LT, 0.6);
  leaf(g, x, y + 0.03 * s, z, a + Math.PI, 0.3, 0.022 * s, LEAF_LT, 0.6);
  if (s > 1.3) leaf(g, x, y + 0.035 * s, z, a + Math.PI / 2, 1.0, 0.03 * s, LEAF, 0.5);
}
/** A seed tray (6 × 3 cells) with its base at y: its seedlings `s` grown (0 none). */
function seedTray(g: THREE.Object3D, x: number, y: number, z: number, s: number, seed: number, dome = false) {
  part(g, box(0.34, 0.05, 0.18), '#212121', x, y + 0.025, z);
  part(g, box(0.32, 0.006, 0.16), PEAT, x, y + 0.047, z, { outline: false });
  const rnd = seeded(seed);
  if (s > 0) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if (rnd() > 0.12) seedling(g, x - 0.1375 + i * 0.055, y + 0.05, z - 0.055 + j * 0.055, s * (0.8 + rnd() * 0.4), rnd() * 3);
  if (dome) glass(g, box(0.35, 0.09, 0.19), x, y + 0.095, z, DOME);
  // A white label stick.
  part(g, box(0.012, 0.05, 0.002), '#ffffff', x + 0.15, y + 0.07, z + 0.085, { outline: false });
}
/** A watering can: its body's base at the origin, the spout out along +x, the handle over the top towards -x. */
function wateringCan(g: THREE.Object3D, color: string, s = 1): THREE.Group {
  const c = new THREE.Group();
  g.add(c);
  part(c, cyl(0.085 * s, 0.09 * s, 0.19 * s, 18), color, 0, 0.095 * s, 0);
  part(c, cyl(0.06 * s, 0.06 * s, 0.01 * s, 14), shade(color, 0.8), 0, 0.19 * s, 0, { outline: false });
  rod(c, new THREE.Vector3(0.07 * s, 0.04 * s, 0), new THREE.Vector3(0.26 * s, 0.24 * s, 0), 0.012 * s, color);
  part(c, cyl(0.03 * s, 0.015 * s, 0.03 * s, 12), shade(color, 0.85), 0.27 * s, 0.25 * s, 0, { rz: -0.8 });
  part(c, ring(0.07 * s, 0.01 * s, Math.PI), shade(color, 0.9), -0.02 * s, 0.19 * s, 0, { outline: false });
  return c;
}

// ---------------------------------------------------------------------------------------------
// Puffs of mist.

/** A jet of mist puffs: `fire(t, from, dir, on)` sends them out along `dir` from `from` (in the parent's frame). */
function mistJet(parent: THREE.Object3D, n = 6, size = 0.035) {
  const puffs = Array.from({ length: n }, (_, i) => {
    const m = new THREE.Mesh(ball(size), MIST);
    m.renderOrder = 3;
    m.visible = false;
    m.userData.k = (i * 0.618) % 1;
    parent.add(m);
    return m;
  });
  return (t: number, from: THREE.Vector3, dir: THREE.Vector3, on: number, reach = 0.3, rate = 1.4) => {
    for (const [i, m] of puffs.entries()) {
      m.visible = on > 0.03;
      if (!m.visible) continue;
      const k = frac(t * rate + (m.userData.k as number));
      m.position.copy(from).addScaledVector(dir, k * reach);
      m.position.x += Math.sin(i * 2.1 + t) * 0.03 * k;
      m.position.z += Math.cos(i * 1.7 + t) * 0.03 * k;
      m.position.y -= 0.05 * k * k;
      m.scale.setScalar(on * (0.4 + 1.8 * k) * (1 - k * k * k));
    }
  };
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens and the signs.

const paintClimate = (frame: number): Paint => (c) => {
  c.fillStyle = '#0f1f17';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#2e7d32';
  c.fillRect(0, 0, 384, 30);
  text(c, '온실 환경 제어 · 열대관', 10, 16, 15, '#ffffff');
  text(c, frame === 2 ? '미스트 가동' : '자동 운전', 374, 16, 12, frame === 2 ? '#b3e5fc' : '#c8e6c9', 'right');
  const tile = (x: number, y: number, name: string, val: string, sub: string, col: string) => {
    c.fillStyle = '#1b3326';
    c.fillRect(x, y, 116, 70);
    text(c, name, x + 8, y + 14, 12, '#a5d6a7', 'left', false);
    text(c, val, x + 8, y + 40, 24, col);
    text(c, sub, x + 8, y + 60, 10, '#81c784', 'left', false);
  };
  tile(8, 38, '온도', '24.6℃', '목표 25.0℃', '#ffcc80');
  tile(134, 38, '습도', frame === 2 ? '74%' : '72%', `목표 ${frame === 0 ? 70 : 80}%`, '#81d4fa');
  tile(260, 38, 'CO₂', '460', 'ppm', '#e6ee9c');
  // The humidity target slider.
  c.fillStyle = '#1b3326';
  c.fillRect(8, 116, 368, 56);
  text(c, '습도 목표', 16, 132, 12, '#a5d6a7');
  c.fillStyle = '#37474f';
  c.fillRect(20, 152, 300, 6);
  const at = 20 + 300 * (frame === 0 ? 0.5 : 0.75);
  c.fillStyle = '#4fc3f7';
  c.fillRect(20, 152, at - 20, 6);
  c.beginPath();
  c.arc(at, 155, 9, 0, Math.PI * 2);
  c.fillStyle = frame === 1 ? '#ffffff' : '#b3e5fc';
  c.fill();
  text(c, `${frame === 0 ? 70 : 80}%`, 360, 155, 14, '#ffffff', 'right');
  // The vents, the shades, the mist line.
  const row = (x: number, name: string, val: string, on: boolean) => {
    c.fillStyle = on ? '#2e7d32' : '#263238';
    c.fillRect(x, 182, 116, 30);
    text(c, `${name} ${val}`, x + 58, 197, 12, '#ffffff', 'center');
  };
  row(8, '천창', '30%', true);
  row(134, '차광막', '50%', true);
  row(260, '미스트', frame === 2 ? 'ON' : '대기', frame === 2);
  c.fillStyle = frame === 1 ? '#455a64' : '#1b5e20';
  c.fillRect(270, 222, 106, 26);
  text(c, frame === 2 ? '✓ 설정 완료' : '확인', 323, 235, 13, '#ffffff', 'center');
  text(c, '일사량 380 W/㎡ · 외기 11℃', 10, 235, 11, '#81c784', 'left', false);
};
const paintStorm: Paint = (c) => {
  c.fillStyle = '#1a0d0d';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#c62828';
  c.fillRect(0, 0, 384, 40);
  text(c, '⚠ 호우 경보 · 시간당 45mm', 192, 21, 19, '#ffffff', 'center');
  const items: Array<[string, string]> = [['천창 닫기', '닫힘'], ['차광막 내리기', '완료'], ['배수 펌프', '가동'], ['예비 전원', '대기']];
  items.forEach(([a, b], i) => {
    c.fillStyle = i < 3 ? '#2e3b2e' : '#3b2e2e';
    c.fillRect(12, 52 + i * 46, 360, 38);
    text(c, `${i < 3 ? '✓' : '…'} ${a}`, 24, 71 + i * 46, 16, '#ffffff');
    text(c, b, 360, 71 + i * 46, 16, i < 3 ? '#a5d6a7' : '#ffcc80', 'right');
  });
};
const paintBudget: Paint = (c) => {
  c.fillStyle = '#f4f8f4';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#2e7d32';
  c.fillRect(0, 0, 384, 30);
  text(c, '월간 운영 예산 · 직원 배치', 10, 16, 15, '#ffffff');
  const bars: Array<[string, number, string]> = [['난방·전기', 0.82, '#ef6c00'], ['인건비', 0.66, '#1565c0'], ['식물 구입', 0.4, '#2e7d32'], ['관수·자재', 0.3, '#00838f']];
  bars.forEach(([n, v, col], i) => {
    text(c, n, 12, 52 + i * 30, 12, '#37474f');
    c.fillStyle = '#e0e0e0';
    c.fillRect(90, 44 + i * 30, 160, 16);
    c.fillStyle = col;
    c.fillRect(90, 44 + i * 30, 160 * v, 16);
    text(c, `${Math.round(v * 100)}%`, 258, 52 + i * 30, 12, '#37474f', 'left', false);
  });
  c.fillStyle = '#ffffff';
  c.fillRect(8, 168, 368, 80);
  text(c, '오늘 배치', 16, 182, 12, '#2e7d32');
  const rota = ['나혜원 · 열대관', '송이삭 · 분갈이실', '배꽃님 · 꽃집'];
  rota.forEach((r, i) => text(c, r, 16 + (i % 2) * 180, 206 + Math.floor(i / 2) * 24, 13, '#263238', 'left', false));
};
const paintSign: Paint = (c) => {
  c.fillStyle = '#f3ead8';
  c.fillRect(0, 0, 512, 352);
  c.fillStyle = '#33691e';
  c.fillRect(0, 0, 512, 56);
  text(c, '열대 식물관 · Tropical House', 20, 30, 24, '#ffffff');
  const plants: Array<[string, string, string]> = [
    ['몬스테라', 'Monstera deliciosa', '멕시코 열대우림 · 잎에 구멍이 뚫려요'],
    ['극락조화', 'Strelitzia reginae', '남아프리카 · 새 머리 모양 꽃'],
    ['네펜테스', 'Nepenthes', '보르네오 · 벌레를 잡는 주머니'],
    ['호접란', 'Phalaenopsis', '동남아시아 · 나비를 닮은 꽃'],
  ];
  plants.forEach(([ko, la, note], i) => {
    const y = 76 + i * 66;
    c.fillStyle = ['#66bb6a', '#ff8f00', '#8d6e63', '#ec407a'][i];
    c.beginPath();
    c.arc(44, y + 22, 20, 0, Math.PI * 2);
    c.fill();
    text(c, ko, 78, y + 10, 20, '#1b5e20');
    text(c, la, 190, y + 10, 15, '#5d4037', 'left', false);
    text(c, note, 78, y + 36, 14, '#4e342e', 'left', false);
  });
  c.fillStyle = '#212121';
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i * 7 + j * 3) % 5 < 2 || i === 0 || j === 0) c.fillRect(440 + i * 9, 280 + j * 9, 9, 9);
};
const paintGiftBoard: Paint = (c) => {
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 384, 160);
  text(c, '식물원 기념품', 192, 28, 26, '#fff9c4', 'center');
  text(c, '다육이 미니 화분 · 5,000원', 24, 72, 18, '#ffffff', 'left', false);
  text(c, '미니 테라리움 · 15,000원', 24, 102, 18, '#ffffff', 'left', false);
  text(c, '씨앗 봉투 · 3,000원', 24, 132, 18, '#ffffff', 'left', false);
};
const paintPacket: Paint = (c) => {
  c.fillStyle = '#fff8e1';
  c.fillRect(0, 0, 128, 192);
  c.fillStyle = '#f06292';
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.arc(64 + Math.cos(i * 1.26) * 22, 70 + Math.sin(i * 1.26) * 22, 16, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#ffd54f';
  c.beginPath();
  c.arc(64, 70, 12, 0, Math.PI * 2);
  c.fill();
  text(c, '백일홍 씨앗', 64, 140, 18, '#33691e', 'center');
  text(c, '파종 4–5월', 64, 168, 13, '#5d4037', 'center', false);
};

// ---------------------------------------------------------------------------------------------
// The kits that move (each built twice: at rest for when nobody's there, and moving in use).

/** The repot at the potting bench (repotRound): the plant, its old pot, the new pot's soil, a handful. */
function repotKit(parent: THREE.Object3D, P: THREE.Vector3, yaw: number) {
  const root = new THREE.Group();
  parent.add(root);
  const off = offsetter(P, yaw);
  const L = leftOf(yaw);
  const plant = new THREE.Group();
  root.add(plant);
  const tight = part(plant, cyl(0.05, 0.04, 0.11, 14), SOILC, 0, 0, 0);
  const roots = new THREE.Group();
  plant.add(roots);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rod(roots, new THREE.Vector3(Math.cos(a) * 0.035, -0.04, Math.sin(a) * 0.035), new THREE.Vector3(Math.cos(a + 0.4) * 0.07, -0.085, Math.sin(a + 0.4) * 0.07), 0.003, ROOT);
  }
  // A calathea: striped leaves up on stalks.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tip = new THREE.Vector3(Math.cos(a) * 0.05, 0.16 + (i % 2) * 0.04, Math.sin(a) * 0.05);
    rod(plant, new THREE.Vector3(0, 0.055, 0), tip, 0.003, '#7cb342');
    leaf(plant, tip.x, tip.y, tip.z, a, 0.9, 0.13, i % 2 ? '#558b2f' : '#2e7d32', 0.5);
  }
  const old = new THREE.Group();
  root.add(old);
  part(old, cyl(0.062, 0.048, 0.13, 16), NURSERY, 0, 0, 0);
  part(old, cyl(0.066, 0.066, 0.012, 16), NURSERY, 0, 0.06, 0, { outline: false });
  const B = off(REPOT.B);
  pot(root, B.x, P.y, B.z, 0.085, 0.15, TERRA, 0.15);
  const soil = part(root, cyl(0.077, 0.077, 0.012, 16), SOILC, B.x, P.y, B.z, { outline: false });
  const clump = part(root, ball(0.025), PEAT, 0, 0, 0, { outline: false });
  return (k: ReturnType<typeof repotRound>) => {
    off(k.ball, plant.position);
    plant.quaternion.setFromAxisAngle(L, -k.tip);
    off(k.pot, old.position);
    old.quaternion.setFromAxisAngle(L, -k.potTip);
    roots.visible = k.loose;
    tight.scale.set(k.loose ? 1.12 : 1, 1, k.loose ? 1.12 : 1);
    soil.position.y = P.y + 0.02 + 0.12 * k.soil;
    clump.visible = k.handful;
    if (clump.visible) off(k.r, clump.position).y -= 0.025;
  };
}

/** Grafting (graftRound): the stock's top, the knife, the scion, the tape. */
function graftKit(parent: THREE.Object3D, P: THREE.Vector3, yaw: number) {
  const root = new THREE.Group();
  parent.add(root);
  const off = offsetter(P, yaw);
  const J = off(GRAFT.J);
  pot(root, P.x, P.y, P.z, 0.05, 0.09, NURSERY);
  rod(root, new THREE.Vector3(P.x, P.y + 0.08, P.z), J, 0.006, '#795548');
  leaf(root, P.x, P.y + 0.13, P.z, 0.5, 0.5, 0.06, LEAF, 0.5);
  // The top that's cut off (its base at the join).
  const top = new THREE.Group();
  root.add(top);
  rod(top, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.12, 0), 0.005, '#795548');
  for (let i = 0; i < 3; i++) leaf(top, 0, 0.05 + i * 0.03, 0, i * 2.1, 0.5, 0.07, i % 2 ? LEAF : LEAF_DK, 0.5);
  const lying = off({ side: 0.12, up: 0.012, ahead: -0.12 });
  // The scion: a twig with two buds.
  const scion = new THREE.Group();
  root.add(scion);
  rod(scion, new THREE.Vector3(0, -0.01, 0), new THREE.Vector3(0, 0.1, 0), 0.0055, '#8d6e63');
  for (let i = 0; i < 2; i++) part(scion, ball(0.008), '#9ccc65', 0.005 * (i ? 1 : -1), 0.04 + i * 0.04, 0, { outline: false });
  // The knife: a wooden handle, the blade down from the hand.
  const knife = new THREE.Group();
  root.add(knife);
  part(knife, box(0.018, 0.06, 0.012), '#a1887f', 0, 0.02, 0);
  part(knife, box(0.004, 0.06, 0.016), CHROME, 0, -0.035, 0.002, { outline: false });
  const roll = part(root, cyl(0.022, 0.022, 0.018, 14), '#c5e1a5', 0, 0, 0, { rx: Math.PI / 2 });
  const band = part(root, cyl(0.011, 0.011, 0.05, 10), '#dcedc8', J.x, J.y, J.z, { outline: false });
  const knifeRest = off(GRAFT.knife);
  const tapeRest = off(GRAFT.tape);
  const tray = off(GRAFT.tray);
  return (k: ReturnType<typeof graftRound>) => {
    if (k.cut) {
      top.position.copy(lying);
      top.rotation.set(0, yaw, Math.PI / 2);
    } else {
      top.position.copy(J);
      top.rotation.set(0, 0, 0);
    }
    const hand = off(k.r);
    if (k.knife) {
      knife.position.copy(hand);
      knife.rotation.set(0, yaw, 0.2);
    } else {
      knife.position.copy(knifeRest);
      knife.rotation.set(Math.PI / 2, yaw + 0.4, 0);
    }
    if (k.scion === 'hand') {
      scion.position.copy(hand).y -= 0.05;
      scion.rotation.set(0, 0, 0);
    } else if (k.scion === 'on') {
      scion.position.copy(J);
      scion.rotation.set(0, 0, 0);
    } else {
      scion.position.copy(tray).y += 0.01;
      scion.rotation.set(0, yaw, Math.PI / 2);
    }
    if (k.tapeRoll) roll.position.copy(hand);
    else roll.position.copy(tapeRest);
    band.visible = k.tape > 0.02;
    band.scale.y = Math.max(0.05, k.tape);
    band.position.y = J.y - 0.025 + 0.025 * k.tape;
  };
}

/** Mixing the soil (soilRound): the perlite bag and its stream, the trowel, a handful. */
function soilKit(parent: THREE.Object3D, P: THREE.Vector3, yaw: number) {
  const root = new THREE.Group();
  parent.add(root);
  const off = offsetter(P, yaw);
  const F = fwdOf(yaw);
  const bag = new THREE.Group();
  root.add(bag);
  part(bag, box(0.14, 0.16, 0.07), '#fafafa', 0, 0, 0);
  label(bag, '펄라이트', 0.12, 0.04, 0, 0.02, 0.036, '#1565c0', '#ffffff');
  part(bag, box(0.12, 0.012, 0.06), '#eeeeee', 0, 0.085, 0, { outline: false });
  const stream = Array.from({ length: 6 }, () => part(root, ball(0.012), '#ffffff', 0, 0, 0, { outline: false }));
  const trowel = new THREE.Group();
  root.add(trowel);
  part(trowel, cyl(0.012, 0.012, 0.09, 8), '#2e7d32', 0, 0.03, 0);
  part(trowel, box(0.05, 0.09, 0.006), CHROME, 0, -0.06, 0.004);
  const clump = part(root, ball(0.03), PEAT, 0, 0, 0, { outline: false });
  const bagRest = off(SOIL.bag);
  const trowelRest = off(SOIL.trowel);
  const mouth = new THREE.Vector3();
  return (k: ReturnType<typeof soilRound>, t: number) => {
    if (k.bagHeld) {
      off(k.l, bag.position);
      bag.quaternion.setFromAxisAngle(F, k.bagTip);
    } else {
      bag.position.copy(bagRest).y += 0.07;
      bag.quaternion.identity();
      bag.rotateY(yaw);
    }
    mouth.set(0, 0.09, 0).applyQuaternion(bag.quaternion).add(bag.position);
    stream.forEach((s, i) => {
      s.visible = k.pouring;
      if (!s.visible) return;
      const f = frac(t * 2.2 + i / 6);
      s.position.copy(mouth).lerp(new THREE.Vector3(P.x, P.y, P.z), f);
    });
    if (k.trowel) {
      off(k.r, trowel.position);
      trowel.rotation.set(0, yaw, 0);
      trowel.rotateX(0.5);
    } else {
      trowel.position.copy(trowelRest).y += 0.012;
      trowel.rotation.set(Math.PI / 2, yaw + 0.3, 0);
    }
    clump.visible = k.handful > 0.05;
    if (clump.visible) {
      off(k.r, clump.position).y -= 0.02;
      clump.scale.setScalar(k.handful);
    }
  };
}

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /**
   * The rare-plant case: a black-steel glass cabinet on a cupboard, a moss bed and a cork back, a
   * glass shelf; a moth orchid, a Venus flytrap, ferns and a pitcher plant hanging below, jewel
   * orchids, a begonia and air plants on driftwood above; LED strips under the roof, a fogger in its
   * dish, the hygrometer reading out on the post. The front's right pane slides behind the left to
   * mist the plants with the hand sprayer (off its hook on the side) and look at a leaf through a
   * loupe, or to measure the orchid's spike with a folding rule and write it up on the clipboard.
   */
  rarePlantCase(g, _W, _D, _c, _def, _ctx, out) {
    const cw = 0.86;
    const cd = 0.56;
    const cz = -0.08;
    const front = cz + cd / 2;
    const base = 0.74;
    const roof = 1.98;
    part(g, rbox(cw, base - 0.04, cd, 0.02), '#37474f', 0, (base - 0.04) / 2, cz);
    part(g, box(0.004, base - 0.14, 0.004), '#263238', 0, base / 2, front + 0.001, { outline: false });
    for (const x of [-0.05, 0.05]) part(g, box(0.02, 0.06, 0.02), CHROME, x, base * 0.6, front + 0.01);
    label(g, '희귀 식물 보존 케이스', 0.5, 0.06, 0, base - 0.12, front + 0.003, '#1b5e20', '#ffffff');
    // The bed inside: soil, moss mounds, the cork back.
    part(g, box(cw - 0.04, 0.04, cd - 0.04), SOILC, 0, base + 0.0, cz);
    for (const [x, z] of [[-0.3, -0.1], [0.05, -0.2], [0.3, 0.05], [-0.1, 0.08]]) part(g, ball(0.07), '#7cb342', x, base + 0.02, cz + z, { outline: false }).scale.set(1.3, 0.35, 1);
    part(g, box(cw - 0.04, roof - base - 0.04, 0.02), '#6d4c41', 0, (roof + base) / 2, cz - cd / 2 + 0.02);
    for (let i = 0; i < 6; i++) part(g, ball(0.05), '#689f38', -0.32 + i * 0.13, base + 0.3 + (i % 3) * 0.35, cz - cd / 2 + 0.035, { outline: false }).scale.set(1, 1.3, 0.4);
    // The frame, the glass, the shelf, the lights.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.025, roof - base, 0.025), BLACK, sx * (cw / 2), (roof + base) / 2, cz + sz * (cd / 2));
    part(g, box(cw + 0.03, 0.04, cd + 0.03), BLACK, 0, roof, cz);
    for (const sx of [-1, 1]) glass(g, box(0.006, roof - base, cd), sx * (cw / 2), (roof + base) / 2, cz);
    glass(g, box(cw - 0.04, 0.012, cd - 0.06), 0, 1.32, cz);
    part(g, box(cw - 0.02, 0.015, 0.02), BLACK, 0, 1.32, front - 0.02);
    glowing(g, box(cw - 0.12, 0.012, 0.03), '#fffde7', 0, roof - 0.03, cz + 0.05);
    glowing(g, box(cw - 0.12, 0.01, 0.025), '#fffde7', 0, 1.305, cz + 0.05);
    // The lower shelf: the orchid (measured), a flytrap, ferns; the pitcher plant hung under the glass shelf.
    pot(g, 0.28, base + 0.02, 0.0, 0.05, 0.08, '#fafafa');
    orchid(g, 0.28, base + 0.09, 0.0, 1.2, 1.25);
    pot(g, 0.04, base + 0.02, 0.02, 0.045, 0.06, '#8d6e63');
    for (let i = 0; i < 5; i++) {
      const a = i * 1.25;
      const p = new THREE.Vector3(0.04 + Math.cos(a) * 0.035, base + 0.1, 0.02 + Math.sin(a) * 0.035);
      part(g, ball(0.016), '#c0392b', p.x, p.y, p.z, { outline: false }).scale.set(1, 0.5, 0.7);
      part(g, ball(0.015), '#9ccc65', p.x, p.y + 0.008, p.z, { outline: false }).scale.set(1, 0.4, 0.7);
    }
    bush(g, -0.28, base + 0.02, -0.02, 0.2, 8, [LEAF_LT, LEAF, '#9ccc65'], 9, 0.2, 0.8);
    // Nepenthes in its hanging basket.
    part(g, cyl(0.06, 0.045, 0.06, 12), CEDAR_DK, -0.12, 1.18, cz + 0.02);
    rod(g, new THREE.Vector3(-0.12, 1.21, cz + 0.02), new THREE.Vector3(-0.12, 1.31, cz + 0.02), 0.003, BLACK);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6;
      const x = -0.12 + Math.cos(a) * 0.08;
      const z = cz + 0.02 + Math.sin(a) * 0.08;
      leaf(g, -0.12, 1.2, cz + 0.02, a, 0.1, 0.12, LEAF, 0.4);
      rod(g, new THREE.Vector3(x, 1.18, z), new THREE.Vector3(x, 1.06 - (i % 2) * 0.05, z), 0.002, '#7cb342');
      part(g, cyl(0.018, 0.012, 0.07, 10), i % 2 ? '#c62828' : '#9e9d24', x, 1.02 - (i % 2) * 0.05, z);
      part(g, ball(0.017), '#ad1457', x, 1.06 - (i % 2) * 0.05, z, { outline: false }).scale.set(1, 0.25, 1);
    }
    // The upper shelf: jewel orchids, a begonia, an anthurium, air plants on driftwood.
    pot(g, -0.28, 1.33, -0.02, 0.045, 0.06, '#eceff1');
    bush(g, -0.28, 1.38, -0.02, 0.11, 21, ['#3e2723', '#4a148c', '#311b92'], 6, 0.2, 0.6);
    pot(g, 0.0, 1.33, -0.05, 0.05, 0.07, TERRA);
    bush(g, 0.0, 1.39, -0.05, 0.13, 22, ['#558b2f', '#33691e'], 6, 0.3, 0.8);
    for (let i = 0; i < 6; i++) part(g, ball(0.008), '#e0e0e0', -0.04 + (i % 3) * 0.04, 1.42 + Math.floor(i / 3) * 0.02, -0.03, { outline: false });
    pot(g, 0.28, 1.33, -0.02, 0.045, 0.065, BLACK);
    bush(g, 0.28, 1.39, -0.02, 0.12, 23, [LEAF_DK, LEAF], 5, 0.5, 1.1);
    part(g, ball(0.03), '#d50000', 0.3, 1.52, 0.0, { outline: false }).scale.set(1, 1.2, 0.3);
    rod(g, new THREE.Vector3(-0.35, 1.62, cz - 0.1), new THREE.Vector3(0.2, 1.7, cz - 0.05), 0.012, '#a1887f');
    for (let i = 0; i < 3; i++) bush(g, -0.25 + i * 0.18, 1.66 + i * 0.015, cz - 0.08, 0.06, 30 + i, ['#b0bec5', '#cfd8dc'], 8, -0.3, 0.9);
    // The fogger in its dish, the hygrometer on the post.
    part(g, cyl(0.06, 0.05, 0.03, 14), '#cfd8dc', 0.32, base + 0.035, cz - 0.18);
    const fog = mistJet(g, 5, 0.04);
    picture(g, painted('ghHygro', 128, 64, (c) => {
      c.fillStyle = '#102027';
      c.fillRect(0, 0, 128, 64);
      text(c, '습도 85%', 64, 22, 20, '#80deea', 'center');
      text(c, '24.0℃', 64, 48, 18, '#ffcc80', 'center');
    }), 0.1, 0.05, cw / 2 + 0.005, 1.55, front - 0.03, '#ffffff', Math.PI / 2);
    // The left pane, fixed in front; the right one slides behind it.
    const paneL = glass(g, box(cw / 2, roof - base - 0.04, 0.008), -cw / 4, (roof + base) / 2, front - 0.005);
    void paneL;
    const slider = new THREE.Group();
    slider.position.set(cw / 4, 0, front - 0.02);
    g.add(slider);
    glass(slider, box(cw / 2, roof - base - 0.04, 0.008), 0, (roof + base) / 2, 0);
    part(slider, box(0.02, 0.12, 0.02), CHROME, -cw / 4 + 0.04, 1.1, 0.015);
    // The sprayer's hook on the right side.
    part(g, box(0.04, 0.012, 0.04), CHROME, cw / 2 + 0.02, 0.93, 0.07);
    always(slider.children[0], (t) => fog(t, new THREE.Vector3(0.32, base + 0.06, cz - 0.18), new THREE.Vector3(-0.6, 0.25, 0.3).normalize(), 0.8, 0.35, 0.25));

    const yaw = Math.PI;
    const P = new THREE.Vector3(0.2, 0.93, 0.02);
    const off = offsetter(P, yaw);
    const work = marker(g, P.x, P.y, P.z);
    const kit = (parent: THREE.Object3D) => {
      const root = new THREE.Group();
      parent.add(root);
      const sprayer = new THREE.Group();
      root.add(sprayer);
      part(sprayer, cyl(0.03, 0.032, 0.12, 12), '#b2dfdb', 0, -0.08, 0);
      part(sprayer, box(0.03, 0.04, 0.05), '#00897b', 0, -0.005, 0.01);
      part(sprayer, cyl(0.006, 0.006, 0.03, 8), '#004d40', 0, 0.005, 0.045, { rx: Math.PI / 2 });
      const loupe = new THREE.Group();
      root.add(loupe);
      part(loupe, ring(0.025, 0.005), '#212121', 0, 0.03, 0, { outline: false });
      glass(loupe, cyl(0.024, 0.024, 0.004, 16), 0, 0.03, 0, undefined, Math.PI / 2);
      part(loupe, cyl(0.006, 0.006, 0.06, 8), '#212121', 0, -0.02, 0);
      const clip = new THREE.Group();
      root.add(clip);
      const board = part(clip, box(0.2, 0.28, 0.008), '#a1887f', 0, 0, 0);
      board.rotation.x = 0.9;
      const sheet = part(board, box(0.18, 0.25, 0.002), '#ffffff', 0, -0.01, -0.005, { outline: false });
      for (let i = 0; i < 6; i++) part(sheet, box(0.13, 0.004, 0.001), '#90a4ae', -0.01, 0.08 - i * 0.03, -0.002, { outline: false });
      part(board, box(0.06, 0.02, 0.012), CHROME, 0, 0.13, -0.006);
      const pen = part(root, cyl(0.004, 0.004, 0.12, 6), '#1565c0', 0, 0, 0, { rx: 0.4 });
      const rule = part(root, box(0.022, 0.45, 0.004), '#fdd835', 0, 0, 0);
      for (let i = 0; i < 9; i++) part(rule, box(0.012, 0.003, 0.002), '#212121', -0.004, -0.2 + i * 0.05, 0.003, { outline: false });
      const puffs = mistJet(root, 6, 0.03);
      const hook = off(MISTC.hook);
      const nozzle = new THREE.Vector3();
      return (which: 'mist' | 'survey' | null, t: number, ph: number) => {
        slider.position.x = which ? THREE.MathUtils.lerp(slider.position.x, -cw / 4 + 0.02, 0.15) : cw / 4;
        if (which === 'survey') {
          const k = surveyRound(t, ph);
          sprayer.position.copy(hook).y -= 0.0;
          sprayer.rotation.set(0, Math.PI / 2, 0);
          loupe.visible = false;
          clip.visible = true;
          off(k.l, clip.position);
          clip.rotation.set(0, yaw, 0);
          const hand = off(k.r);
          rule.visible = k.rule;
          if (k.rule) rule.position.copy(hand).y -= 0.22;
          pen.visible = !k.rule;
          pen.position.copy(hand).y -= 0.03;
          puffs(t, nozzle, UP, 0);
          return;
        }
        const k = mistCaseRound(which ? t : 0, which ? ph : 0);
        clip.visible = false;
        rule.visible = false;
        pen.visible = false;
        if (which && k.sprayer) {
          off(k.r, sprayer.position);
          sprayer.rotation.set(0, yaw, 0);
        } else {
          sprayer.position.copy(hook);
          sprayer.rotation.set(0, Math.PI / 2, 0);
        }
        nozzle.set(0, 0.005, 0.06).applyEuler(sprayer.rotation).add(sprayer.position);
        puffs(t, nozzle, fwdOf(yaw).add(new THREE.Vector3(0, -0.1, 0)).normalize(), which ? k.puff : 0, 0.25, 2.2);
        loupe.visible = !!which && k.loupe;
        if (loupe.visible) {
          off(k.l, loupe.position);
          loupe.rotation.set(0, yaw, 0);
        }
      };
    };
    const idle = new THREE.Group();
    g.add(idle);
    kit(idle)(null, 0, 0);
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const show = kit(use);
    const spots: Record<string, Spot> = {
      studySpecimens: standAt(g, 0.12, 0.6, yaw, work, 'mistCase'),
      gardener_plantSurvey: standAt(g, 0.12, 0.6, yaw, work, 'plantSurvey'),
    };
    spots['*'] = spots.studySpecimens;
    out.spots = spots;
    out.work = work;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const which = now === 'gardener_plantSurvey' ? 'survey' : 'mist';
      show(which, t, phaseAt(which === 'survey' ? spots.gardener_plantSurvey : spots.studySpecimens));
    };
  },

  /**
   * The greenhouse climate panel: a grey steel cabinet with the touchscreen (temperature, humidity
   * against its target slider, CO₂, the vents, the shades, the mist line), four lit buttons for a
   * storm (vents, shades, drains, pump), the vent dial and a big red-handled lever; the sensor box on
   * its arm, an amber beacon on top, and the mist header up over it whose nozzles fog the house while
   * it's set (stronger once the new humidity's confirmed). In a storm the screen goes red with the
   * checklist, the buttons light one by one, the lever comes down and the beacon turns.
   */
  greenhouseControl(g, _W, _D, _c, _def, _ctx, out) {
    const bz = -0.14;
    const fz = bz + 0.16;
    part(g, box(0.76, 0.1, 0.36), '#455a64', 0, 0.05, bz);
    part(g, rbox(0.72, 1.62, 0.32, 0.02), '#eceff1', 0, 0.91, bz);
    part(g, box(0.004, 0.75, 0.002), '#b0bec5', 0, 0.5, fz + 0.001, { outline: false });
    label(g, '온실 환경 제어반', 0.42, 0.06, 0, 1.6, fz + 0.002, '#2e7d32', '#ffffff');
    part(g, box(0.48, 0.34, 0.02), '#263238', 0, 1.35, fz + 0.005);
    const screen = litScreen(g, painted('ghClimate0', 384, 256, paintClimate(0)), 0.44, 0.3, 0, 1.35, fz + 0.017);
    out.screen = screen;
    const frames = [0, 1, 2].map((f) => painted(`ghClimate${f}`, 384, 256, paintClimate(f)));
    const storm = painted('ghStormScreen', 384, 256, paintStorm);
    const budget = painted('ghBudgetScreen', 384, 256, paintBudget);
    // The storm buttons, their names; the vent dial; the lever.
    const names = ['천창', '차광', '배수', '펌프'];
    const cols = ['#43a047', '#1e88e5', '#fb8c00', '#e53935'];
    const buttons = names.map((n, i) => {
      const x = -0.12 + i * 0.08;
      part(g, cyl(0.026, 0.026, 0.012, 14), '#37474f', x, 1.15, fz + 0.006, { rx: Math.PI / 2 });
      label(g, n, 0.06, 0.022, x, 1.11, fz + 0.002, '#eceff1', '#263238');
      const cap = part(g, cyl(0.02, 0.02, 0.02, 14), shade(cols[i], 0.55), x, 1.15, fz + 0.016, { rx: Math.PI / 2, outline: false });
      return { cap, col: cols[i] };
    });
    const dial = new THREE.Group();
    dial.position.set(0.15, 1.04, fz + 0.012);
    g.add(dial);
    part(dial, cyl(0.032, 0.035, 0.024, 16), '#212121', 0, 0, 0, { rx: Math.PI / 2 });
    part(dial, box(0.006, 0.026, 0.006), '#ffffff', 0, 0.014, 0.014, { outline: false });
    label(g, '환기', 0.05, 0.02, 0.15, 0.99, fz + 0.002, '#eceff1', '#263238');
    const pivot = new THREE.Vector3(0.3, 1.15, fz + 0.04);
    part(g, box(0.06, 0.08, 0.04), '#78909c', pivot.x, pivot.y, fz + 0.02);
    const lever = new THREE.Group();
    lever.position.copy(pivot);
    g.add(lever);
    part(lever, box(0.018, 0.18, 0.018), '#90a4ae', 0, 0.09, 0);
    part(lever, cyl(0.022, 0.022, 0.06, 12), '#c62828', 0, 0.18, 0, { rz: Math.PI / 2 });
    // Beacon, sensor box, the mist header.
    const beacon = part(g, cyl(0.04, 0.04, 0.07, 14), '#6d4c00', -0.25, 1.76, bz, { outline: true });
    part(g, cyl(0.045, 0.045, 0.015, 14), '#37474f', -0.25, 1.725, bz);
    rod(g, new THREE.Vector3(0.25, 1.72, bz), new THREE.Vector3(0.25, 2.38, bz), 0.018, GALV);
    rod(g, new THREE.Vector3(-0.65, 2.38, bz), new THREE.Vector3(0.65, 2.38, bz), 0.016, GALV);
    const nozzles: THREE.Vector3[] = [];
    for (let i = 0; i < 5; i++) {
      const x = -0.6 + i * 0.3;
      part(g, cyl(0.012, 0.008, 0.035, 8), '#37474f', x, 2.35, bz + 0.01);
      nozzles.push(new THREE.Vector3(x, 2.33, bz + 0.02));
    }
    rod(g, new THREE.Vector3(0.25, 1.95, bz), new THREE.Vector3(0.45, 1.95, bz), 0.01, GALV);
    for (let i = 0; i < 4; i++) part(g, cyl(0.05, 0.05, 0.02, 12), '#fafafa', 0.48, 1.88 + i * 0.025, bz);
    label(g, '온습도 센서', 0.12, 0.025, 0.48, 1.83, bz + 0.055, '#fafafa', '#455a64');

    const yaw = Math.PI;
    const P = new THREE.Vector3(0, 1.35, fz + 0.02);
    const off = offsetter(P, yaw);
    const work = marker(g, P.x, P.y, P.z);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const jets = nozzles.map(() => mistJet(use, 4, 0.05));
    const tablet = new THREE.Group();
    use.add(tablet);
    const slab = part(tablet, box(0.22, 0.15, 0.01), '#212121', 0, 0, 0);
    slab.rotation.x = -1.1;
    picture(slab, budget, 0.2, 0.13, 0, 0, 0.006);
    const spots: Record<string, Spot> = {
      adjustClimate: standAt(g, 0, 0.44, yaw, work, 'climatePanel'),
      stormPrep: standAt(g, 0, 0.44, yaw, work, 'stormPanel'),
      gardener_gardenBudget: standAt(g, 0, 0.44, yaw, work, 'budgetTablet'),
    };
    spots['*'] = spots.adjustClimate;
    out.spots = spots;
    out.work = work;
    const mat = screen.material as THREE.MeshBasicMaterial;
    const down = new THREE.Vector3(0, -1, 0.35).normalize();
    out.animate = (t) => {
      const now = nowAt(spots, t) ?? 'adjustClimate';
      let mist = 0.35;
      let leverAt = 0;
      let lit = 0;
      tablet.visible = now === 'gardener_gardenBudget';
      if (now === 'stormPrep') {
        const k = stormRound(t, phaseAt(spots.stormPrep));
        mat.map = storm;
        leverAt = k.lever;
        lit = k.lit;
        mist = 0;
        (beacon.material as THREE.MeshToonMaterial).color.set(Math.sin(t * 9) > 0 ? '#ffb300' : '#6d4c00');
      } else {
        (beacon.material as THREE.MeshToonMaterial).color.set('#6d4c00');
        if (now === 'gardener_gardenBudget') {
          const k = budgetRound(t, phaseAt(spots.gardener_gardenBudget));
          mat.map = budget;
          off(k.l, tablet.position);
          tablet.rotation.set(0, yaw, 0);
        } else {
          const k = climateRound(t, phaseAt(spots.adjustClimate));
          mat.map = frames[k.frame];
          dial.rotation.z = -k.dial;
          mist = k.frame === 2 ? 1 : 0.35;
        }
      }
      lever.rotation.x = leverAt * STORM.swing;
      buttons.forEach((b, i) => (b.cap.material as THREE.MeshToonMaterial).color.set(i < lit ? b.col : shade(b.col, 0.55)));
      nozzles.forEach((n, i) => jets[i](t + i * 0.37, n, down, mist, 0.45, 1.1));
    };
    // The button caps light by their own materials.
    for (const b of buttons) b.cap.material = (b.cap.material as THREE.MeshToonMaterial).clone();
    for (const b of buttons) b.cap.userData.ownMaterial = true;
    beacon.material = (beacon.material as THREE.MeshToonMaterial).clone();
    beacon.userData.ownMaterial = true;
    void stormGrip;
    void CLIMATE;
  },

  /**
   * The potting bench: a cedar top on legs, a pegboard back with the trowel, the hand fork, the
   * secateurs, a dibber and a ball of twine, a shelf of terracotta pots stacked up, bags of 배양토 and
   * 마사토 under it with a can; the galvanized soil tub let into the middle of the top. At the left a
   * plant is repotted (repotRound), at the tub the soil's mixed (soilRound), at the right a seedling's
   * grafted (graftRound).
   */
  pottingBench(g, W, D, _c, _def, _ctx, out) {
    const top = 0.86;
    const d = 0.62;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.06, top - 0.04, 0.06), CEDAR_DK, sx * (W / 2 - 0.06), (top - 0.04) / 2, sz * (d / 2 - 0.05));
    for (let i = 0; i < 5; i++) part(g, box(W - 0.04, 0.035, d / 5 - 0.006), i % 2 ? CEDAR : shade(CEDAR, 0.95), 0, top - 0.018, -d / 2 + d / 10 + (i * d) / 5);
    part(g, box(W - 0.12, 0.025, d - 0.1), CEDAR_DK, 0, 0.18, 0);
    // The back: pegboard and tools; the pot shelf.
    part(g, box(W, 0.62, 0.03), '#d7ccc8', 0, top + 0.31, -d / 2 + 0.015);
    for (let i = 0; i < 18; i++) for (let j = 0; j < 5; j++) part(g, box(0.008, 0.008, 0.002), '#8d6e63', -0.85 + i * 0.1, top + 0.08 + j * 0.11, -d / 2 + 0.031, { outline: false });
    part(g, box(W, 0.025, 0.18), CEDAR, 0, top + 0.62, -d / 2 + 0.1);
    for (let s = 0; s < 3; s++) for (let i = 0; i < 4 - s; i++) pot(g, -0.7 + s * 0.6, top + 0.635 + i * 0.05, -d / 2 + 0.1, 0.06 - s * 0.01, 0.09 - s * 0.01, TERRA, 0.2);
    // Tools on the pegboard: trowel, hand fork, secateurs, dibber, twine.
    const hang = -d / 2 + 0.045;
    part(g, cyl(0.012, 0.012, 0.1, 8), '#2e7d32', -0.5, top + 0.47, hang);
    part(g, box(0.05, 0.1, 0.005), CHROME, -0.5, top + 0.37, hang);
    part(g, cyl(0.012, 0.012, 0.1, 8), '#c62828', -0.35, top + 0.47, hang);
    for (let i = 0; i < 3; i++) part(g, box(0.006, 0.09, 0.006), CHROME, -0.37 + i * 0.02, top + 0.37, hang);
    for (const s of [-1, 1]) part(g, box(0.016, 0.09, 0.01), '#d32f2f', -0.18 + s * 0.012, top + 0.44, hang, { rz: s * 0.15 });
    part(g, box(0.012, 0.06, 0.004), CHROME, -0.18, top + 0.37, hang);
    part(g, cyl(0.01, 0.004, 0.15, 8), CEDAR_DK, 0.02, top + 0.4, hang);
    part(g, cyl(0.04, 0.04, 0.06, 14), '#d7b98a', 0.2, top + 0.42, hang + 0.01, { rx: Math.PI / 2 });
    label(g, '분갈이 작업대', 0.36, 0.05, 0.6, top + 0.48, hang - 0.012, '#33691e', '#ffffff');
    // Soil bags and a can below.
    for (const [x, n, col] of [[-0.6, '배양토 50L', '#2e7d32'], [-0.2, '마사토', '#795548']] as Array<[number, string, string]>) {
      part(g, rbox(0.34, 0.24, 0.24, 0.05), col, x, 0.32, 0.0);
      label(g, n, 0.22, 0.05, x, 0.34, 0.121, '#ffffff', col);
    }
    wateringCan(g, '#43a047').position.set(0.45, 0.193, 0.02);
    // The soil tub in the middle of the top, its mix flecked with perlite.
    const tubX = -0.13;
    const tubZ = 0.08;
    part(g, cyl(0.16, 0.14, 0.11, 20), GALV, tubX, top + 0.055, tubZ);
    part(g, ring(0.16, 0.008), '#90a4ae', tubX, top + 0.11, tubZ, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.15, 0.15, 0.01, 20), SOILC, tubX, top + 0.07, tubZ, { outline: false });
    const rnd = seeded(5);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 0.13;
      part(g, ball(0.006), '#fafafa', tubX + Math.cos(a) * r, top + 0.076, tubZ + Math.sin(a) * r, { outline: false });
    }
    // The scion tray on the right: damp paper, the cut scions.
    part(g, box(0.16, 0.02, 0.1), '#eceff1', 0.82, top + 0.01, 0.06);
    for (let i = 0; i < 4; i++) rod(g, new THREE.Vector3(0.76, top + 0.025, 0.03 + i * 0.02), new THREE.Vector3(0.88, top + 0.025, 0.03 + i * 0.02), 0.005, '#8d6e63');
    void D;

    const yaw = Math.PI;
    const Pr = new THREE.Vector3(-0.5, top, 0.08);
    const Pm = new THREE.Vector3(tubX, top + 0.07, tubZ);
    const Pg = new THREE.Vector3(0.55, top, 0.08);
    const wr = marker(g, Pr.x, Pr.y, Pr.z);
    const wm = marker(g, Pm.x, Pm.y, Pm.z);
    const wg = marker(g, Pg.x, Pg.y, Pg.z);
    const kits = (parent: THREE.Object3D) => ({ repot: repotKit(parent, Pr, yaw), soil: soilKit(parent, Pm, yaw), graft: graftKit(parent, Pg, yaw) });
    const idle = new THREE.Group();
    g.add(idle);
    const rest = kits(idle);
    rest.repot(repotRound(0, 0));
    rest.soil(soilRound(0, 0), 0);
    rest.graft(graftRound(0, 0));
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const live = kits(use);
    const spots: Record<string, Spot> = {
      repotPlants: standAt(g, Pr.x, 0.5, yaw, wr, 'repot'),
      gardener_soilStudy: standAt(g, Pm.x, 0.5, yaw, wm, 'mixSoil'),
      graftPlants: standAt(g, Pg.x, 0.5, yaw, wg, 'graft'),
    };
    spots['*'] = spots.repotPlants;
    out.spots = spots;
    out.work = wr;
    out.animate = (t) => {
      const at0 = nowAt(spots, t);
      const now = !at0 || at0 === '*' ? 'repotPlants' : at0;
      live.repot(now === 'repotPlants' ? repotRound(t, phaseAt(spots.repotPlants)) : repotRound(0, 0));
      live.soil(now === 'gardener_soilStudy' ? soilRound(t, phaseAt(spots.gardener_soilStudy)) : soilRound(0, 0), t);
      live.graft(now === 'graftPlants' ? graftRound(t, phaseAt(spots.graftPlants)) : graftRound(0, 0));
    };
  },

  /**
   * The propagation shelf: a three-tier chrome wire rack against the wall, magenta LED grow bars under
   * each tier lighting the trays (some under clear domes, the seedlings bigger tier by tier), a timer
   * reading 16시간; a fresh tray at the front of the middle tier where four holes are poked, seeds
   * dropped in from the packet and the tray misted (sowRound).
   */
  ghPropagationShelf(g, W, _D, _c, _def, _ctx, out) {
    const d = 0.48;
    const z0 = -0.5 + d / 2 + 0.02;
    const tiers = [0.35, 0.95, 1.55];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.014, 1.9, 8), CHROME, sx * (W / 2 - 0.06), 0.95, z0 + sz * (d / 2 - 0.02));
    for (const [ti, y] of tiers.entries()) {
      part(g, box(W - 0.1, 0.012, d), STEEL, 0, y - 0.006, z0);
      for (let i = 0; i < 12; i++) part(g, box(0.004, 0.006, d), '#90a4ae', -W / 2 + 0.12 + i * 0.16, y + 0.002, z0, { outline: false });
      // The grow bars over this tier, lit.
      const over = (tiers[ti + 1] ?? 2.1) - 0.04;
      for (const z of [-0.1, 0.08]) {
        part(g, box(W - 0.2, 0.025, 0.04), '#37474f', 0, over + 0.01, z0 + z);
        glowing(g, box(W - 0.24, 0.006, 0.03), ti === 1 ? '#ff4fd8' : '#e040fb', 0, over - 0.004, z0 + z);
      }
      // The trays.
      const xs = [-0.7, -0.35, 0.35, 0.7];
      xs.forEach((x, i) => seedTray(g, x, y, z0 + (i % 2 ? -0.08 : 0.02), ti + (i % 2) * 0.5, ti * 10 + i, ti === 0 && i < 2));
      if (ti !== 1) seedTray(g, 0, y, z0, ti + 0.8, ti * 10 + 7, ti === 0);
    }
    part(g, box(W - 0.06, 0.03, 0.03), CHROME, 0, 2.07, z0);
    // The timer by the post.
    part(g, box(0.08, 0.1, 0.04), '#eceff1', -W / 2 + 0.16, 1.3, z0 + d / 2 - 0.02);
    glowing(g, box(0.05, 0.02, 0.002), '#76ff03', -W / 2 + 0.16, 1.32, z0 + d / 2 + 0.001);
    label(g, '광주기 16시간', 0.16, 0.035, -0.55, tiers[1] - 0.03, z0 + d / 2 + 0.002, '#4a148c', '#ffffff');
    // The working tray: its cells, holes and seeds.
    const yaw = Math.PI;
    const P = new THREE.Vector3(0, tiers[1] + 0.047, 0.06);
    part(g, box(0.34, 0.05, 0.18), '#212121', P.x, tiers[1] + 0.025, P.z);
    part(g, box(0.32, 0.006, 0.16), PEAT, P.x, P.y, P.z, { outline: false });
    const off = offsetter(P, yaw);
    const work = marker(g, P.x, P.y, P.z);
    const kit = (parent: THREE.Object3D) => {
      const root = new THREE.Group();
      parent.add(root);
      const holes = [0, 1, 2, 3].map(() => part(root, cyl(0.01, 0.01, 0.004, 10), '#3e2723', 0, 0, 0, { outline: false }));
      const seeds = [0, 1, 2, 3].map(() => {
        const s = new THREE.Group();
        root.add(s);
        for (let j = 0; j < 3; j++) part(s, ball(0.003), '#d7ccc8', (j - 1) * 0.004, 0, 0, { outline: false });
        return s;
      });
      [0, 1, 2, 3].forEach((i) => {
        const c = off(SOW.cell(i));
        holes[i].position.copy(c).y += 0.002;
        seeds[i].position.copy(c).y += 0.005;
      });
      const packet = new THREE.Group();
      root.add(packet);
      part(packet, box(0.07, 0.1, 0.004), '#fff8e1', 0, 0, 0);
      picture(packet, painted('ghSeedPacket', 128, 192, paintPacket), 0.066, 0.096, 0, 0, 0.003);
      const mister = new THREE.Group();
      root.add(mister);
      part(mister, cyl(0.022, 0.024, 0.09, 10), '#e1f5fe', 0, -0.06, 0);
      part(mister, box(0.022, 0.03, 0.035), '#0288d1', 0, -0.005, 0.008);
      const puffs = mistJet(root, 5, 0.025);
      const packetRest = off(SOW.packet);
      const misterRest = off(SOW.mister);
      const nozzle = new THREE.Vector3();
      return (k: ReturnType<typeof sowRound>, t: number) => {
        holes.forEach((h, i) => (h.visible = i < k.holes));
        seeds.forEach((s, i) => (s.visible = i < k.seeds));
        if (k.packet) {
          off(k.l, packet.position);
          packet.rotation.set(-0.3, yaw, 0);
        } else {
          packet.position.copy(packetRest).y += 0.004;
          packet.rotation.set(-Math.PI / 2, 0, yaw + 0.3);
        }
        if (k.mister) {
          off(k.r, mister.position);
          mister.rotation.set(0, yaw, 0);
        } else {
          mister.position.copy(misterRest).y += 0.105;
          mister.rotation.set(0, yaw, 0);
        }
        nozzle.set(0, 0, 0.03).applyEuler(mister.rotation).add(mister.position);
        puffs(t, nozzle, fwdOf(yaw).add(new THREE.Vector3(0, -0.8, 0)).normalize(), k.mister ? k.puff : 0, 0.18, 2.2);
      };
    };
    const idle = new THREE.Group();
    g.add(idle);
    kit(idle)(sowRound(0, 0), 0);
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const show = kit(use);
    const sow = standAt(g, 0, 0.44, yaw, work, 'sowSeeds');
    out.spots = { ghSowSeeds: sow, '*': sow };
    out.work = work;
    out.animate = (t) => show(sowRound(t, phaseAt(sow)), t);
  },

  /**
   * A misting post down the aisle: a galvanized pole on a round footing, four fogging nozzles on a
   * cross at the top that puff on their timer, two arms hanging coir baskets of ivy and petunias on
   * chains; a hose bib at its foot and the hose wand on its hook, taken down to water the front basket
   * (basketRound) — the rose over it, the water running and dripping through, the basket lifted to
   * feel its weight.
   */
  ghMistPost(g, _W, _D, _c, _def, _ctx, out) {
    part(g, cyl(0.16, 0.18, 0.08, 18), STONE, 0, 0.04, 0);
    part(g, cyl(0.035, 0.04, 2.4, 12), GALV, 0, 1.24, 0);
    part(g, ball(0.04), GALV, 0, 2.45, 0);
    const heads: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const end = new THREE.Vector3(Math.cos(a) * 0.22, 2.36, Math.sin(a) * 0.22);
      rod(g, new THREE.Vector3(0, 2.36, 0), end, 0.008, GALV);
      part(g, cyl(0.01, 0.006, 0.03, 8), '#37474f', end.x, end.y - 0.02, end.z);
      heads.push(end.clone().setY(end.y - 0.04));
    }
    // The arms and their baskets.
    const baskets: THREE.Group[] = [];
    for (const s of [1, -1]) {
      rod(g, new THREE.Vector3(0, 1.98, 0), new THREE.Vector3(0, 1.98, s * 0.27), 0.012, IRON);
      part(g, ring(0.018, 0.004), IRON, 0, 1.96, s * 0.27, { outline: false });
      const b = new THREE.Group();
      b.position.set(0, 1.62, s * 0.25);
      g.add(b);
      part(b, cyl(0.16, 0.1, 0.12, 16), '#8d6e63', 0, 0, 0);
      part(b, ring(0.16, 0.008), IRON, 0, 0.06, 0, { rx: Math.PI / 2, outline: false });
      part(b, cyl(0.15, 0.15, 0.01, 16), SOILC, 0, 0.05, 0, { outline: false });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        rod(b, new THREE.Vector3(Math.cos(a) * 0.155, 0.06, Math.sin(a) * 0.155), new THREE.Vector3(0, 0.34, s * 0.02), 0.003, '#616161');
      }
      trailing(b, 0, 0.06, 0, 0.13, s > 0 ? 3 : 4, s > 0 ? ['#e040fb', '#ffffff', '#f06292'] : ['#ff7043', '#ffd54f', '#ffffff']);
      baskets.push(b);
    }
    // The hose bib at the foot, the hose up to the wand.
    part(g, box(0.05, 0.05, 0.05), '#b87333', 0, 0.3, 0.05);
    part(g, cyl(0.02, 0.02, 0.04, 8), '#d32f2f', 0, 0.34, 0.07, { rx: Math.PI / 2 });
    part(g, box(0.03, 0.02, 0.04), CHROME, -0.06, 1.07, 0.04);
    label(g, '자동 미스트 · 30분마다', 0.2, 0.035, 0, 0.75, 0.042, '#eceff1', '#37474f');
    const timerMist = heads.map(() => mistJet(g, 4, 0.06));
    always(g.children[1], (t) => {
      const on = frac(t / 40) < 0.14 ? Math.sin((frac(t / 40) / 0.14) * Math.PI) : 0;
      heads.forEach((h, i) => timerMist[i](t + i * 0.3, h, new THREE.Vector3(h.x, -2.5, h.z).normalize(), on, 0.5, 0.9));
    });

    const yaw = Math.PI;
    const P = new THREE.Vector3(0, 1.62, 0.25);
    const off = offsetter(P, yaw);
    const work = marker(g, P.x, P.y, P.z);
    const kit = (parent: THREE.Object3D) => {
      const root = new THREE.Group();
      parent.add(root);
      const lance = part(root, cyl(0.009, 0.009, 1, 8), '#2e7d32', 0, 0, 0);
      const rose = part(root, cyl(0.035, 0.02, 0.04, 12), '#1b5e20', 0, 0, 0);
      const grip = part(root, cyl(0.016, 0.016, 0.12, 8), '#fbc02d', 0, 0, 0);
      const hose = part(root, cyl(0.008, 0.008, 1, 8), '#388e3c', 0, 0, 0, { outline: false });
      const bib = new THREE.Vector3(0, 0.3, 0.08);
      const water = Array.from({ length: 6 }, () => {
        const m = new THREE.Mesh(cyl(0.004, 0.004, 0.08, 6), WATER);
        root.add(m);
        return m;
      });
      const drips = Array.from({ length: 4 }, () => {
        const m = new THREE.Mesh(ball(0.008), WATER);
        root.add(m);
        return m;
      });
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const span = (m: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) => {
        m.position.copy(from).lerp(to, 0.5);
        m.scale.set(1, from.distanceTo(to), 1);
        m.quaternion.setFromUnitVectors(UP, tmp.copy(to).sub(from).normalize());
      };
      return (k: ReturnType<typeof basketRound>, t: number, used: boolean) => {
        off(k.hand, a);
        off(k.head, b);
        span(lance, a, b);
        rose.position.copy(b);
        rose.quaternion.copy(lance.quaternion);
        grip.position.copy(a);
        grip.quaternion.copy(lance.quaternion);
        span(hose, bib, a);
        water.forEach((w, i) => {
          w.visible = used && k.water;
          if (w.visible) w.position.set(b.x + Math.sin(i * 2.3) * 0.02, b.y - 0.02 - frac(t * 3 + i / 6) * 0.12, b.z + Math.cos(i * 1.9) * 0.02);
        });
        drips.forEach((d, i) => {
          d.visible = used && k.u > 0.25 && k.u < 0.75;
          if (d.visible) d.position.set(P.x + (i - 1.5) * 0.04, P.y - 0.07 - frac(t * 1.4 + i * 0.27) * 1.4, P.z + Math.sin(i) * 0.04);
        });
        const front = baskets[0];
        front.position.y = 1.62 + 0.04 * k.lift;
        front.rotation.y = 0.3 * k.lift;
      };
    };
    const idle = new THREE.Group();
    g.add(idle);
    kit(idle)(basketRound(0, 0), 0, false);
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const show = kit(use);
    const water = standAt(g, 0, 0.68, yaw, work, 'waterBasket');
    out.spots = { ghWaterBaskets: water, '*': water };
    out.work = work;
    out.animate = (t) => show(basketRound(t, phaseAt(water)), t, true);
    void BASKET;
  },

  /**
   * The koi pond: a ring of grey stones round dark water, a rock waterfall in the back corner whose
   * sheet falls and splashes, lily pads with a lotus, ferns and a stone lantern at the back; five koi
   * (orange, white and gold) circle under the surface. Fed from the front rim (koiRound): the pellets
   * fly out over the water, the koi crowd in and come up to them; crouched at the edge the fingers
   * trailed in the water and rings spreading.
   */
  ghKoiPond(g, W, D, _c, _def, _ctx, out) {
    const wy = 0.3;
    part(g, cyl(0.88, 0.85, 0.06, 32), '#263238', 0, 0.03, 0.02);
    const surface = new THREE.Mesh(cyl(0.86, 0.86, 0.01, 32), POND);
    surface.position.set(0, wy, 0.02);
    surface.renderOrder = 2;
    g.add(surface);
    part(g, cyl(0.84, 0.84, wy - 0.06, 32), '#2f5d62', 0, 0.06 + (wy - 0.06) / 2, 0.02, { outline: false });
    const rnd = seeded(77);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const r = 0.9 + rnd() * 0.04;
      const s = part(g, rbox(0.26, 0.38 + rnd() * 0.06, 0.2, 0.08), i % 3 ? STONE : STONE_DK, Math.cos(a) * r, 0.2, 0.02 + Math.sin(a) * r * 0.98, { ry: -a });
      s.scale.set(1, 1, 1);
    }
    // Flat stepping stone at the front middle (where the feeding's done from).
    part(g, rbox(0.4, 0.42, 0.24, 0.06), '#bdbdbd', 0, 0.21, 0.92);
    // The waterfall in the back-left corner.
    const fx = -0.55;
    const fz = -0.55;
    for (let i = 0; i < 6; i++) part(g, rbox(0.34 - i * 0.04, 0.18, 0.3 - i * 0.03, 0.07), i % 2 ? STONE_DK : STONE, fx + (i % 2) * 0.05, 0.38 + i * 0.13, fz - (i % 3) * 0.03, { ry: i * 0.5 });
    part(g, rbox(0.2, 0.04, 0.18, 0.02), STONE, fx + 0.12, 0.95, fz + 0.08);
    const sheet = new THREE.Mesh(box(0.14, 0.62, 0.01), FALL);
    sheet.position.set(fx + 0.14, 0.64, fz + 0.18);
    sheet.renderOrder = 3;
    g.add(sheet);
    const splash = mistJet(g, 6, 0.04);
    // Lily pads and a lotus; ferns and a stone lantern behind.
    for (const [x, z, r] of [[0.3, -0.2, 0.12], [0.45, 0.05, 0.09], [-0.2, 0.3, 0.1], [0.15, -0.45, 0.08]]) {
      part(g, cyl(r, r, 0.006, 16, ), '#558b2f', x, wy + 0.008, z, { outline: false });
    }
    flower(g, 0.3, wy + 0.04, -0.2, 0.05, '#f8bbd0', '#ffeb3b');
    bush(g, 0.6, 0.42, -0.62, 0.35, 12, [LEAF_LT, LEAF], 10, 0.3, 1.0);
    bush(g, -0.75, 0.42, 0.2, 0.28, 13, [LEAF, LEAF_DK], 8, 0.3, 1.0);
    part(g, cyl(0.07, 0.09, 0.3, 6), '#bdbdbd', 0.3, 0.55, -0.82);
    part(g, box(0.18, 0.12, 0.18), '#9e9e9e', 0.3, 0.76, -0.82);
    glowing(g, box(0.1, 0.07, 0.185), '#ffe082', 0.3, 0.76, -0.82);
    part(g, cyl(0, 0.16, 0.1, 6), '#9e9e9e', 0.3, 0.87, -0.82);
    label(g, '비단잉어 연못 · 먹이 주지 마세요', 0.34, 0.05, 0.42, 0.36, 1.045, '#33691e', '#ffffff');
    // The koi.
    const colours: Array<[string, string]> = [[KOI_ORANGE, '#ffffff'], ['#ffffff', '#e53935'], ['#ffca28', '#ffffff'], [KOI_ORANGE, '#212121'], ['#fafafa', '#ff7043']];
    const koi = colours.map(([body, spot2]) => {
      const f = new THREE.Group();
      g.add(f);
      const b = part(f, ball(0.05), body, 0, 0, 0, { outline: false });
      b.scale.set(0.7, 0.55, 2.1);
      part(f, ball(0.025), spot2, 0, 0.018, 0.02, { outline: false }).scale.set(1, 0.4, 1.4);
      const tail = part(f, box(0.06, 0.004, 0.05), body, 0, 0, -0.12, { outline: false });
      f.userData.tail = tail;
      return f;
    });
    let feed: { until: number; spots: THREE.Vector3[] } = { until: -1, spots: [] };
    const centre = new THREE.Vector3(0, wy - 0.05, 0);
    const prev = koi.map(() => new THREE.Vector3());
    always(surface, (t) => {
      sheet.scale.y = 1 + 0.03 * Math.sin(t * 13);
      splash(t, new THREE.Vector3(fx + 0.14, wy + 0.02, fz + 0.22), new THREE.Vector3(0.2, 0.6, 0.4).normalize(), 0.6, 0.18, 1.8);
      const feeding = sceneClock.now < feed.until;
      koi.forEach((f, i) => {
        const a = t * (0.25 + i * 0.04) + i * 1.3;
        const r = 0.35 + 0.18 * Math.sin(t * 0.13 + i * 2);
        const target = feeding && feed.spots.length ? feed.spots[i % feed.spots.length].clone().add(new THREE.Vector3(Math.cos(a * 3) * 0.06, -0.06, Math.sin(a * 3) * 0.06)) : centre.clone().add(new THREE.Vector3(Math.cos(a) * r, -0.04 * (i % 2), Math.sin(a) * r * 0.9));
        prev[i].copy(f.position);
        f.position.lerp(target, feeding ? 0.05 : 0.2);
        const dir = tmp.copy(f.position).sub(prev[i]);
        if (dir.lengthSq() > 1e-8) f.rotation.y = Math.atan2(dir.x, dir.z);
        f.rotation.x = feeding ? -0.35 : 0;
        (f.userData.tail as THREE.Object3D).rotation.y = 0.4 * Math.sin(t * 6 + i);
      });
    });

    const yaw = Math.PI;
    const P = new THREE.Vector3(0, 0.42, 0.92);
    const off = offsetter(P, yaw);
    const work = marker(g, P.x, P.y, P.z);
    const kit = (parent: THREE.Object3D) => {
      const root = new THREE.Group();
      parent.add(root);
      const tub = new THREE.Group();
      root.add(tub);
      part(tub, cyl(0.04, 0.035, 0.08, 12), '#ff7043', 0, -0.03, 0);
      part(tub, cyl(0.042, 0.042, 0.012, 12), '#ffffff', 0, 0.015, 0, { outline: false });
      const pellets = [0, 1, 2].map(() => Array.from({ length: 4 }, () => part(root, ball(0.007), '#8d6e63', 0, 0, 0, { outline: false })));
      const ripples = [0, 1, 2, 3].map(() => part(root, ring(0.05, 0.003), '#e0f7fa', 0, wy + 0.012, 0, { rx: Math.PI / 2, outline: false }));
      const from = new THREE.Vector3();
      const land = new THREE.Vector3();
      return (k: ReturnType<typeof koiRound>, t: number, used: boolean) => {
        if (k.tubOnRim) tub.position.copy(off(KOI.rimTub)).y += 0.04;
        else off(k.l, tub.position);
        pellets.forEach((ps, i) => {
          off(KOI.land(i), land);
          ps.forEach((p, j) => {
            const show = used && (i < k.toss || (i === k.toss && k.fly >= 0) || (k.toss < 0 && k.u < 0.66));
            p.visible = show;
            if (!show) return;
            const jitter = new THREE.Vector3((j - 1.5) * 0.025, 0, Math.sin(j * 2) * 0.03);
            if (i === k.toss && k.fly >= 0) {
              off(k.release, from);
              p.position.copy(from).lerp(land, k.fly).add(jitter.clone().multiplyScalar(k.fly));
              p.position.y += Math.sin(k.fly * Math.PI) * 0.18;
            } else p.position.copy(land).add(jitter);
          });
        });
        ripples.forEach((r, i) => {
          const life = frac(t * 0.8 + i * 0.25);
          r.visible = used && (k.dip || k.u < 0.66);
          if (!r.visible) return;
          if (k.dip) off(k.r, r.position);
          else off(KOI.land(i % 3), r.position);
          r.position.y = wy + 0.012;
          r.scale.setScalar(0.4 + life * 2.2);
        });
      };
    };
    const idle = new THREE.Group();
    g.add(idle);
    kit(idle)(koiRound(0, 0), 0, false);
    // At rest the food tub waits on the rim.
    off(KOI.rimTub, idle.children[0].children[0].position).y += 0.04;
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const show = kit(use);
    const feedSpot = standAt(g, 0, 1.28, yaw, work, 'feedKoi');
    out.spots = { ghFeedKoi: feedSpot, '*': feedSpot };
    out.work = work;
    out.animate = (t) => {
      const k = koiRound(t, phaseAt(feedSpot));
      show(k, t, true);
      feed = { until: k.feeding || k.dip ? sceneClock.now + 0.3 : -1, spots: k.dip ? [off(bo2(k.r))] : [0, 1, 2].map((i) => off(KOI.land(i))) };
      for (const s of feed.spots) s.y = wy;
    };
    void W;
    void D;
  },

  /**
   * A garden bench for visitors facing the koi: slatted teak on dark-green cast-iron ends with scrolled
   * arms, a brass plate on the back rail. Sat on by visitors waiting (a sofa: a place a tile).
   */
  ghBenchSofa(g, W, _D, _c, _def, _ctx, out) {
    const seat = 0.42;
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.08);
      part(g, box(0.05, seat, 0.06), IRON, x, seat / 2, 0.16);
      part(g, box(0.05, 0.85, 0.06), IRON, x, 0.425, -0.22);
      part(g, box(0.05, 0.05, 0.42), IRON, x, 0.62, -0.02);
      part(g, ball(0.035), IRON, x, 0.62, 0.2);
      part(g, box(0.05, 0.04, 0.44), IRON, x, seat - 0.04, -0.03);
    }
    for (let i = 0; i < 5; i++) part(g, box(W - 0.16, 0.025, 0.07), i % 2 ? '#a1887f' : '#b08968', 0, seat - 0.01, -0.2 + i * 0.09);
    for (let i = 0; i < 3; i++) part(g, box(W - 0.16, 0.08, 0.025), i % 2 ? '#a1887f' : '#b08968', 0, seat + 0.14 + i * 0.12, -0.24, { rx: -0.12 });
    part(g, box(0.18, 0.04, 0.004), '#d4af37', 0, seat + 0.26, -0.22);
    label(g, '후원회 기증 · 2019', 0.16, 0.03, 0, seat + 0.26, -0.216, '#d4af37', '#4e342e');
    void out;
  },

  /**
   * The plant-label sign by the path: a slanted board on two oak posts telling the tropical house's
   * plants (monstera, bird-of-paradise, pitcher plant, moth orchid) with their Latin names and a QR
   * code; at its foot a low bed of ferns and calatheas each with its white name stake.
   */
  ghLabelSign(g, _W, _D, _c, _def, _ctx, out) {
    for (const sx of [-1, 1]) part(g, box(0.07, 1.25, 0.07), '#6d4c41', sx * 0.32, 0.625, -0.25);
    const board = new THREE.Group();
    board.position.set(0, 1.12, -0.22);
    board.rotation.x = -0.35;
    g.add(board);
    part(board, box(0.78, 0.56, 0.04), '#5d4037', 0, 0, 0);
    picture(board, painted('ghSignBoard', 512, 352, paintSign), 0.72, 0.5, 0, 0, 0.021);
    part(board, box(0.84, 0.05, 0.08), '#4e342e', 0, 0.3, 0.01);
    // The bed at its foot, the name stakes.
    part(g, rbox(0.86, 0.16, 0.42, 0.04), CEDAR_DK, 0, 0.08, 0.15);
    part(g, box(0.8, 0.02, 0.36), SOILC, 0, 0.16, 0.15, { outline: false });
    const names = ['칼라테아', '아디안텀', '필로덴드론'];
    names.forEach((n, i) => {
      const x = -0.27 + i * 0.27;
      bush(g, x, 0.17, 0.1, 0.18, 40 + i, i === 1 ? [LEAF_LT, '#9ccc65'] : [LEAF_DK, LEAF, '#33691e'], 7, 0.3, 1.0);
      part(g, box(0.008, 0.12, 0.008), '#fafafa', x + 0.08, 0.22, 0.3);
      label(g, n, 0.1, 0.035, x + 0.08, 0.3, 0.305, '#ffffff', '#1b5e20');
    });
    void out;
  },

  /**
   * The watering-can tap: a galvanized trough on legs with a grate in it, a board behind with the brass
   * tap and its cross handle, a hose reel on the side; cans lined up on the shelf underneath and one
   * under the tap, filled (canRound): the handle held, the tap turned, the water running in and the
   * level rising, the full can lifted to feel it.
   */
  ghWaterTap(g, _W, _D, _c, _def, _ctx, out) {
    const rim = 0.72;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, rim, 0.04), STEEL, sx * 0.38, rim / 2, -0.05 + sz * 0.22);
    part(g, box(0.84, 0.2, 0.5), GALV, 0, rim - 0.1, -0.05);
    part(g, box(0.78, 0.01, 0.44), '#455a64', 0, rim - 0.01, -0.05, { outline: false });
    for (let i = 0; i < 8; i++) part(g, box(0.012, 0.012, 0.42), '#78909c', -0.28 + i * 0.08, 0.62, -0.05, { outline: false });
    part(g, box(0.8, 0.02, 0.44), STEEL, 0, 0.2, -0.05);
    wateringCan(g, '#e53935', 0.9).position.set(-0.25, 0.21, -0.05);
    wateringCan(g, GALV, 0.9).position.set(0.15, 0.21, -0.08);
    part(g, box(0.9, 1.3, 0.04), '#8d6e63', 0, 0.65 + 0.4, -0.34);
    // The tap.
    rod(g, new THREE.Vector3(0, 1.08, -0.32), new THREE.Vector3(0, 1.08, -0.02), 0.016, '#b87333');
    rod(g, new THREE.Vector3(0, 1.08, -0.02), new THREE.Vector3(0, 1.01, 0.03), 0.014, '#b87333');
    const handle = new THREE.Group();
    handle.position.set(0, 1.11, -0.03);
    g.add(handle);
    part(handle, box(0.1, 0.012, 0.012), '#d32f2f', 0, 0, 0);
    part(handle, box(0.012, 0.012, 0.1), '#d32f2f', 0, 0, 0);
    part(handle, cyl(0.008, 0.008, 0.04, 8), '#b87333', 0, -0.02, 0);
    // The hose reel on its side.
    part(g, cyl(0.16, 0.16, 0.12, 20), '#2e7d32', 0.48, 0.95, -0.2, { rz: Math.PI / 2 });
    part(g, cyl(0.17, 0.17, 0.01, 20), '#263238', 0.42, 0.95, -0.2, { rz: Math.PI / 2 });
    label(g, '물뿌리개는 쓰고 제자리에', 0.4, 0.05, 0, 1.5, -0.318, '#eceff1', '#37474f');

    const yaw = Math.PI;
    const P = new THREE.Vector3(0, 0.84, 0.05);
    const off = offsetter(P, yaw);
    const work = marker(g, P.x, P.y, P.z);
    const kit = (parent: THREE.Object3D) => {
      const root = new THREE.Group();
      parent.add(root);
      const can = wateringCan(root, '#43a047');
      // The handle to the gardener's left (its spout to their right).
      can.rotation.y = 0;
      const level = part(can, cyl(0.078, 0.078, 0.006, 14), '#4fc3f7', 0, 0.02, 0, { outline: false });
      const stream = new THREE.Mesh(cyl(0.006, 0.006, 1, 8), WATER);
      root.add(stream);
      return (k: ReturnType<typeof canRound>, t: number) => {
        can.position.set(P.x, 0.62 + 0.12 * k.lift, P.z);
        level.visible = k.fill > 0.02;
        level.position.y = 0.02 + 0.16 * k.fill;
        stream.visible = k.flow;
        const top = 1.0;
        const bot = 0.62 + 0.02 + 0.16 * k.fill;
        stream.position.set(0, (top + bot) / 2, 0.03);
        stream.scale.set(1 + 0.15 * Math.sin(t * 20), top - bot, 1);
        handle.rotation.y = k.tap * 1.6;
      };
    };
    const idle = new THREE.Group();
    g.add(idle);
    kit(idle)(canRound(0, 0), 0);
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const show = kit(use);
    const fill = standAt(g, 0, 0.5, yaw, work, 'fillCan');
    out.spots = { ghFillCans: fill, '*': fill };
    out.work = work;
    out.animate = (t) => show(canRound(t, phaseAt(fill)), t);
    void CAN;
    void off;
  },

  /**
   * The gift stand in the lobby: three stepped wooden tiers of little potted succulents and cacti,
   * mini terrariums in jars and air plants in shells, price tags on each; a chalkboard of prices on
   * top and a basket of seed packets. A restock crate on the bottom tier; a pot lifted out of it, set
   * in the gap on the middle tier and turned to face out, and a price tag stuck on (giftRound).
   */
  ghGiftStand(g, W, _D, _c, _def, _ctx, out) {
    const tiers: Array<[number, number]> = [[0.45, 0.25], [0.75, 0.0], [1.05, -0.25]];
    for (const [y, z] of tiers) {
      part(g, box(W - 0.06, 0.03, 0.25), CEDAR, 0, y - 0.015, z);
      part(g, box(W - 0.06, y - 0.03, 0.02), CEDAR_DK, 0, (y - 0.03) / 2, z + 0.115);
    }
    for (const sx of [-1, 1]) part(g, box(0.03, 1.05, 0.76), CEDAR_DK, sx * (W / 2 - 0.03), 0.525, 0);
    const kinds: Array<'succulent' | 'cactus' | 'flower'> = ['succulent', 'cactus', 'succulent', 'flower'];
    const colours = [TERRA, '#fafafa', '#90caf9', '#ffcc80', '#a5d6a7'];
    for (const [ti, [y, z]] of tiers.entries()) {
      for (let i = 0; i < 7; i++) {
        const x = -0.75 + i * 0.25;
        if (ti === 1 && i === 3) continue; // the gap that's restocked
        if (ti === 0 && i >= 5) continue; // the crate
        if ((i + ti) % 4 === 3 && ti === 2) {
          glass(g, cyl(0.05, 0.05, 0.12, 14), x, y + 0.06, z);
          part(g, cyl(0.045, 0.045, 0.03, 14), '#8d6e63', x, y + 0.015, z, { outline: false });
          bush(g, x, y + 0.03, z, 0.05, i, [LEAF, LEAF_LT], 5, 0.4, 1);
          continue;
        }
        potted(g, x, y, z, kinds[(i + ti) % 4], i * 3 + ti, 0.04, colours[(i + ti) % colours.length]);
        part(g, box(0.04, 0.02, 0.002), '#fff59d', x, y + 0.03, z + 0.045, { outline: false });
      }
    }
    // Air plants in shells, the seed-packet basket, the board on top.
    for (let i = 0; i < 3; i++) {
      part(g, ball(0.04), '#fff3e0', -0.5 + i * 0.12, 0.47, 0.32, { outline: false }).scale.set(1, 0.5, 0.8);
      bush(g, -0.5 + i * 0.12, 0.48, 0.32, 0.05, 60 + i, ['#b0bec5', '#cfd8dc'], 7, 0.2, 1.0);
    }
    part(g, cyl(0.1, 0.08, 0.08, 14), '#c8a27a', 0.75, 1.09, -0.25);
    for (let i = 0; i < 5; i++) part(g, box(0.05, 0.08, 0.003), ['#f06292', '#ffd54f', '#81c784', '#ba68c8', '#4fc3f7'][i], 0.7 + i * 0.025, 1.15, -0.25 + (i % 2) * 0.02, { rz: (i - 2) * 0.15 });
    part(g, box(0.62, 0.36, 0.03), '#5d4037', -0.1, 1.42, -0.32);
    picture(g, painted('ghGiftBoard', 384, 160, paintGiftBoard), 0.58, 0.32, -0.1, 1.42, -0.303);
    for (const sx of [-1, 1]) part(g, box(0.03, 0.4, 0.03), '#5d4037', -0.1 + sx * 0.28, 1.22, -0.33);
    // The restock crate on the bottom tier at the right; the tag roll at the left.
    const crateX = 0.62;
    part(g, box(0.36, 0.1, 0.22), '#d7a86e', crateX, 0.5, 0.25);
    for (let i = 0; i < 2; i++) potted(g, crateX + 0.06 + i * 0.09, 0.46, 0.22 + (i % 2) * 0.04, 'succulent', 70 + i, 0.035);
    part(g, cyl(0.03, 0.03, 0.025, 12), '#fff59d', -0.4, 0.47, 0.24, { rx: Math.PI / 2 });

    const yaw = Math.PI;
    const P = new THREE.Vector3(0, 0.75, 0.0);
    const off = offsetter(P, yaw);
    const work = marker(g, P.x, P.y, P.z);
    const kit = (parent: THREE.Object3D) => {
      const root = new THREE.Group();
      parent.add(root);
      const plant = new THREE.Group();
      root.add(plant);
      potted(plant, 0, -0.05, 0, 'succulent', 99, 0.04, '#f8bbd0');
      const tag = part(plant, box(0.04, 0.02, 0.002), '#fff59d', 0, -0.02, 0.045, { outline: false });
      const held = part(root, box(0.04, 0.02, 0.002), '#fff59d', 0, 0, 0, { outline: false });
      return (k: ReturnType<typeof giftRound>) => {
        off(k.potAt, plant.position);
        plant.rotation.y = k.pot === 'shelf' ? 0 : 0.6;
        tag.visible = k.tag;
        held.visible = k.tagInHand;
        if (held.visible) off(k.l, held.position);
      };
    };
    const idle = new THREE.Group();
    g.add(idle);
    kit(idle)(giftRound(0, 0));
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const show = kit(use);
    const stock = standAt(g, 0.18, 0.55, yaw, work, 'stockPots');
    out.spots = { ghStockGifts: stock, '*': stock };
    out.work = work;
    out.animate = (t) => show(giftRound(t, phaseAt(stock)));
    void GIFT;
  },
  ghGlassHouse(g, W, D) {
    glassHouse(g, W, D, '열대 식물 전시 온실', true);
  },
  ghGrowHouse(g, W, D) {
    glassHouse(g, W, D, '재배 온실 · 관계자 외 출입 금지', false);
  },
};

// 유리 온실 (2026-11-05, the layout audit): the garden's glasshouses, walked into, held by their footprint's middle.
const PANE = new THREE.MeshBasicMaterial({ color: '#dff3f1', transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
const ROOF_PANE = new THREE.MeshBasicMaterial({ color: '#e8f7f5', transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
const ALU = '#e4e9ea';

/**
 * A Venlo glasshouse: glass walls on a low brick plinth with white aluminium bars every metre, a run of ridged roof bays
 * across the short side with their roof vents propped open, the gutters between them, double doors in the middle of the
 * front with the house's name over them, and a back door. The public one has its name in green; the growers' house is
 * plainer and says it is not for visitors. Low pieces stand inside it as the beds and benches.
 */
function glassHouse(g: THREE.Group, W: number, D: number, sign: string, show: boolean) {
  const hw = W / 2 - 0.06;
  const hd = D / 2 - 0.06;
  const H = 2.7;
  const plinth = 0.4;
  const doorW = 1.4;
  // The plinth and the walls, the front split for the doors.
  const wall = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.05) return;
    const ry = Math.atan2(-(z1 - z0), x1 - x0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    part(g, box(len, plinth, 0.14), '#a65b45', mx, plinth / 2, mz, { ry });
    part(g, box(len, H - plinth, 0.012), '#dff3f1', mx, (H + plinth) / 2, mz, { ry, material: PANE, outline: false, shadow: false });
    part(g, box(len, 0.06, 0.07), ALU, mx, H, mz, { ry, outline: false });
    const n = Math.max(1, Math.round(len));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      part(g, box(0.05, H - plinth, 0.06), ALU, x0 + (x1 - x0) * t, (H + plinth) / 2, z0 + (z1 - z0) * t, { ry, outline: false });
    }
    part(g, box(len, 0.035, 0.05), ALU, mx, 1.5, mz, { ry, outline: false });
  };
  wall(-hw, -hd, hw, -hd);
  wall(-hw, -hd, -hw, hd);
  wall(hw, -hd, hw, hd);
  wall(-hw, hd, -doorW / 2, hd);
  wall(doorW / 2, hd, hw, hd);
  // The doors, opened back against the glass; the name over them.
  for (const s of [-1, 1]) {
    const leaf = group(g, (s * doorW) / 2, 0, hd);
    leaf.rotation.y = s * 1.9;
    part(leaf, box(doorW / 2, 2.1, 0.012), '#dff3f1', (-s * doorW) / 4, 1.05, 0, { material: PANE, outline: false, shadow: false });
    part(leaf, box(0.05, 2.1, 0.05), ALU, 0, 1.05, 0, { outline: false });
    part(leaf, box(0.05, 2.1, 0.05), ALU, (-s * doorW) / 2, 1.05, 0, { outline: false });
  }
  part(g, box(doorW + 0.1, 0.08, 0.08), ALU, 0, 2.15, hd, { outline: false });
  label(g, sign, Math.min(3.2, W * 0.4), 0.3, 0, 2.42, hd + 0.05, show ? '#2e7d32' : '#eceff1', show ? '#ffffff' : '#37474f');
  // The roof: ridged bays across the width, each two sloped panes, the vents propped open on the sunny side.
  const bays = Math.max(1, Math.round(W / 3.2));
  const bw = (2 * hw) / bays;
  const rise = 0.9;
  const slope = Math.hypot(bw / 2, rise);
  const tilt = Math.atan2(rise, bw / 2);
  for (let b = 0; b < bays; b++) {
    const cx = -hw + bw * (b + 0.5);
    for (const s of [-1, 1]) {
      part(g, box(slope, 0.01, 2 * hd), '#e8f7f5', cx + (s * bw) / 4, H + rise / 2, 0, { rz: -s * tilt, material: ROOF_PANE, outline: false, shadow: false });
      for (let z = -hd; z <= hd + 0.01; z += (2 * hd) / Math.max(1, Math.round(2 * hd))) part(g, box(slope, 0.03, 0.04), ALU, cx + (s * bw) / 4, H + rise / 2, z, { rz: -s * tilt, outline: false });
    }
    part(g, box(0.06, 0.06, 2 * hd), ALU, cx, H + rise, 0, { outline: false });
    part(g, box(0.12, 0.06, 2 * hd), '#b0bec5', -hw + bw * b, H, 0, { outline: false });
    for (const z of [-hd * 0.5, hd * 0.5]) {
      const vent = group(g, cx, H + rise, z);
      vent.rotation.z = -tilt + 0.35;
      part(vent, box(bw / 2 - 0.1, 0.012, 0.9), '#e8f7f5', bw / 4, 0, 0, { material: ROOF_PANE, outline: false, shadow: false });
      part(vent, box(bw / 2 - 0.1, 0.03, 0.04), ALU, bw / 4, 0, 0.45, { outline: false });
    }
  }
  part(g, box(0.12, 0.06, 2 * hd), '#b0bec5', hw, H, 0, { outline: false });
  // Shade screens drawn halfway under the roof, and the back door.
  part(g, box(2 * hw - 0.2, 0.01, hd), '#f5f5f0', 0, H - 0.1, -hd / 2, { material: ROOF_PANE, outline: false, shadow: false });
  part(g, box(0.9, 2.0, 0.03), ALU, hw * 0.6, 1.0, -hd - 0.01, { outline: false });
}

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** A copy of an offset (for koi chasing the fingers). */
const bo2 = (o: BarOffset): BarOffset => ({ side: o.side, up: o.up, ahead: o.ahead });
void SURVEY;
void BUDGET;
void glow;
