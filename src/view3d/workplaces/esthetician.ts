import { frontDesk } from './frontDesk';
import { neighbourShop, shopFront } from './shopFront';
import * as THREE from 'three';
import { FACIAL_STEAMER, SKIN_TABLET, facialRound, skinScanRound, toolPhase, type BarOffset, type Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox, toon } from '../toon';
import { BLACK, CHROME, WATER, caster, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';

/**
 * The 에스테틱 drawn as itself (2026-10-27 workplace pipeline, at the user's request: a facial should
 * look like a facial): the facial bed with the client lying under the blanket in a headband, the
 * therapist sat on the stool at the head — the steamer's arm swung in over the face, the face
 * massaged with both hands, the mask painted on from the bowl — or the client face down in the
 * cradle for a back massage, a magnifier lamp over it all; the 3D skin analyser with its imaging dome
 * a client leans into, the ampoule bar, and what the 피부관리실 was missing
 * (workFurniture/esthetician.ts): the hot-towel cabinet, the skin consultation desk with its
 * skin-scan screen and the soft chair across it (a client sat in it has the cheek scanned with the
 * handheld probe, or is talked with over a cup of tea), the welcome-tea table, the home-care shelf and
 * the changing screen.
 */

const ROSE_GOLD = '#d4a28c';
const SKIN = '#f3cfb3';
const HAIR = '#3a2a22';
const TOWEL = '#fbfaf7';
const UPH = '#efdcd6';
const BLANKET = '#e7c6cf';
const BAND = '#f6c3d0';
const OAK = '#c9a37a';
const CREAM = '#f4ede4';
const LINEN = '#ece2d2';
const CLAY = '#9fcf9a';
const GOLD = '#e2b85a';
const STEAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
const SHELL = new THREE.MeshToonMaterial({ color: '#f7f7f7', gradientMap: gradient, side: THREE.DoubleSide });
const BOUCLE = new THREE.MeshToonMaterial({ color: CREAM, gradientMap: gradient, side: THREE.DoubleSide });

const tmp = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const phaseAt = (s: Spot) => toolPhase(s.at.getWorldPosition(tmp));
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
/** Points `o` (its +z) from `from` towards `to`, in its parent's frame. */
function aim(o: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  o.position.copy(from);
  const d = to.clone().sub(from);
  if (d.lengthSq() > 1e-8) o.quaternion.setFromUnitVectors(Z, d.normalize());
}
/** A standing spot at (x, z) turned to face a point. */
function facing(g: THREE.Object3D, x: number, z: number, to: THREE.Vector3): Spot {
  return spot(g, 'stand', x, 0, z, Math.atan2(to.x - x, to.z - z));
}
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** A round therapist's stool on castors (its seat's top at `h`). */
function stool(g: THREE.Object3D, x: number, z: number, h: number, color = '#f1e4dc'): THREE.Group {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  g.add(s);
  starBase(s, 0, 0, 0.22, '#d6d0ca');
  part(s, cyl(0.022, 0.022, h - 0.2, 10), CHROME, 0, 0.1 + (h - 0.2) / 2, 0, { outline: false });
  part(s, cyl(0.19, 0.18, 0.08, 20), color, 0, h - 0.04, 0);
  part(s, ring(0.185, 0.008), ROSE_GOLD, 0, h - 0.07, 0, { rx: Math.PI / 2, outline: false });
  return s;
}
/** Wisps of steam rising from a point (drawn in `g`'s frame, along `dir`), moved by `t`. */
function steamPuffs(g: THREE.Object3D, n: number, size = 0.025) {
  const root = new THREE.Group();
  g.add(root);
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(ball(size), STEAM);
    m.renderOrder = 3;
    root.add(m);
    puffs.push(m);
  }
  return {
    root,
    /** Spread along from `from` by `len` in `dir`, swaying. */
    move(t: number, from: THREE.Vector3, dir: THREE.Vector3, len: number) {
      puffs.forEach((m, i) => {
        const f = (t * 0.7 + i / n) % 1;
        m.position.copy(from).addScaledVector(dir, f * len);
        m.position.x += 0.015 * Math.sin(t * 2 + i * 1.7);
        m.position.z += 0.015 * Math.cos(t * 1.6 + i);
        m.scale.setScalar(0.5 + f * 1.3);
      });
    },
  };
}
/** A fan brush for the mask, its +z from the hand to the bristles. */
function fanBrush(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.005, 0.004, 0.11, 8), '#f5f0eb', 0, 0, 0.045, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.006, 0.005, 0.02, 8), ROSE_GOLD, 0, 0, 0.105, { rx: Math.PI / 2, outline: false });
  part(root, box(0.045, 0.004, 0.03), '#fafafa', 0, 0, 0.128, { outline: false });
  part(root, box(0.045, 0.0045, 0.01), CLAY, 0, 0, 0.14, { outline: false });
  return root;
}
/** A silicone mask bowl, the clay in it. */
function maskBowl(g: THREE.Object3D, clay = CLAY): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, cyl(0.055, 0.04, 0.04, 18), '#f8bbd0', 0, 0.02, 0);
  part(root, cyl(0.048, 0.048, 0.004, 18), clay, 0, 0.034, 0, { outline: false });
  return root;
}

// ---------------------------------------------------------------------------------------------
// What's painted.

const paintSkinMap: Paint = (c) => {
  c.fillStyle = '#f7f9fb';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#5d8a7a';
  c.fillRect(0, 0, 384, 26);
  text(c, '3D 피부 분석 · SKIN SCOPE', 10, 14, 13, '#ffffff');
  text(c, '촬영 3/3 · 일반광 · UV · 편광', 374, 14, 10, '#e0f2f1', 'right', false);
  // The face, front, with the zones lit up.
  const face = (x: number) => {
    c.fillStyle = '#f3d3bd';
    c.beginPath();
    c.ellipse(x, 130, 48, 62, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3a2a22';
    c.beginPath();
    c.ellipse(x, 86, 52, 30, 0, Math.PI, Math.PI * 2);
    c.fill();
  };
  face(70);
  c.globalAlpha = 0.55;
  const spots: Array<[number, number, number, string]> = [
    [70, 98, 18, '#ffca28'],
    [48, 136, 14, '#ef5350'],
    [92, 136, 14, '#ef5350'],
    [70, 140, 8, '#42a5f5'],
    [70, 170, 10, '#ab47bc'],
  ];
  for (const [x, y, r, k] of spots) {
    c.fillStyle = k;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  const rnd = seeded(5);
  c.fillStyle = '#8d6e63';
  for (let i = 0; i < 26; i++) c.fillRect(46 + rnd() * 48, 118 + rnd() * 40, 2, 2);
  text(c, '정면', 70, 208, 11, '#546e7a', 'center', false);
  // The scores.
  const rows: Array<[string, number, string]> = [
    ['모공', 62, '#ffca28'],
    ['주름', 34, '#8d6e63'],
    ['색소', 48, '#ab47bc'],
    ['홍조', 71, '#ef5350'],
    ['유분', 66, '#ffa726'],
    ['수분', 38, '#42a5f5'],
  ];
  rows.forEach(([s, v, k], i) => {
    const y = 48 + i * 30;
    text(c, s, 140, y, 12, '#37474f');
    c.fillStyle = '#e3e8ec';
    c.fillRect(180, y - 6, 150, 12);
    c.fillStyle = k;
    c.fillRect(180, y - 6, (150 * v) / 100, 12);
    text(c, `${v}`, 360, y, 12, '#37474f', 'right');
  });
  text(c, '피부 타입: 수분 부족형 복합성', 140, 236, 12, '#5d8a7a');
};
const paintCaseAtlas: Paint = (c) => {
  c.fillStyle = '#fbfaf8';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#8e6b7d';
  c.fillRect(0, 0, 384, 26);
  text(c, '피부 질환 사례집 · 여드름 / 색소 / 홍조', 10, 14, 13, '#ffffff');
  const cases: Array<[string, string, string]> = [
    ['면포성 여드름', '#e8b9a5', '#c96f5b'],
    ['구진 · 농포', '#e8b9a5', '#d84a3a'],
    ['기미 (표피형)', '#e9c3a7', '#a1724e'],
    ['안면 홍조', '#efc1b5', '#e57373'],
  ];
  cases.forEach(([s, base, k], i) => {
    const x = 12 + (i % 2) * 186;
    const y = 36 + Math.floor(i / 2) * 108;
    c.fillStyle = base;
    c.fillRect(x, y, 80, 80);
    const rnd = seeded(11 + i);
    c.fillStyle = k;
    for (let j = 0; j < 14; j++) {
      c.beginPath();
      c.arc(x + 8 + rnd() * 64, y + 8 + rnd() * 64, 2 + rnd() * (i === 2 ? 9 : 4), 0, Math.PI * 2);
      c.fill();
    }
    text(c, s, x + 88, y + 14, 12, '#3e2723');
    text(c, i < 2 ? '관리: 진정 · 압출 금지' : i === 2 ? '관리: 미백 앰플 · 자외선' : '관리: 쿨링 · 저자극', x + 88, y + 36, 10, '#6d4c41', 'left', false);
    text(c, '→ 피부과 연계', x + 88, y + 56, 10, '#c62828', 'left', false);
  });
};
const paintReport: Paint = (c) => {
  c.fillStyle = '#fbf8f6';
  c.fillRect(0, 0, 384, 240);
  c.fillStyle = '#7d9c8c';
  c.fillRect(0, 0, 384, 26);
  text(c, '피부 진단 리포트 · 고객 상담', 10, 14, 13, '#ffffff');
  // The radar of the skin's state.
  const cx = 86;
  const cy = 128;
  const keys = ['수분', '유분', '탄력', '민감', '색소', '모공'];
  const vals = [0.4, 0.7, 0.6, 0.75, 0.5, 0.65];
  c.strokeStyle = '#cfd8dc';
  for (const r of [25, 50, 70]) {
    c.beginPath();
    keys.forEach((_, i) => {
      const a = (i / keys.length) * Math.PI * 2 - Math.PI / 2;
      c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    });
    c.closePath();
    c.stroke();
  }
  c.fillStyle = 'rgba(125,156,140,0.5)';
  c.beginPath();
  keys.forEach((s, i) => {
    const a = (i / keys.length) * Math.PI * 2 - Math.PI / 2;
    c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * 70 * vals[i], cy + Math.sin(a) * 70 * vals[i]);
    text(c, s, cx + Math.cos(a) * 84, cy + Math.sin(a) * 84, 10, '#455a64', 'center', false);
  });
  c.closePath();
  c.fill();
  // The programme.
  text(c, '맞춤 관리 프로그램 (4주)', 190, 46, 13, '#3e2723');
  const steps = ['1주 · 진정 관리 + 쿨링 팩', '2주 · 수분 앰플 + 고주파', '3주 · 각질 정리 + 모델링 팩', '4주 · 미백 앰플 + 재진단'];
  steps.forEach((s, i) => {
    c.fillStyle = ['#e0f2f1', '#e3f2fd', '#fff8e1', '#fce4ec'][i];
    c.fillRect(186, 62 + i * 34, 188, 28);
    text(c, s, 194, 76 + i * 34, 11, '#37474f', 'left', false);
  });
  text(c, '홈케어: 저자극 토너 · 수분 크림', 190, 210, 11, '#7d9c8c');
};
const paintTablet: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 256);
  c.fillStyle = '#7d9c8c';
  c.fillRect(0, 0, 192, 24);
  text(c, '피부 측정', 96, 13, 12, '#ffffff', 'center');
  // The magnified skin under the probe.
  c.fillStyle = '#efc9b0';
  c.beginPath();
  c.arc(96, 92, 56, 0, Math.PI * 2);
  c.fill();
  const rnd = seeded(3);
  c.strokeStyle = '#d7a88a';
  for (let i = 0; i < 18; i++) {
    c.beginPath();
    const x = 50 + rnd() * 92;
    const y = 50 + rnd() * 84;
    c.moveTo(x, y);
    c.lineTo(x + 14 * (rnd() - 0.5), y + 14 * (rnd() - 0.5));
    c.stroke();
  }
  c.fillStyle = '#a0715a';
  for (let i = 0; i < 14; i++) c.fillRect(56 + rnd() * 80, 58 + rnd() * 70, 3, 3);
  text(c, '수분 38%', 20, 176, 14, '#1e88e5');
  text(c, '유분 66%', 20, 200, 14, '#fb8c00');
  text(c, '탄력 58', 20, 224, 14, '#43a047');
  text(c, 'T존', 172, 176, 11, '#78909c', 'right', false);
};
const paintClientCard: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 256);
  text(c, '피부 상담 카드', 96, 20, 15, '#7d9c8c', 'center');
  const rows = ['이름 / 연락처', '피부 고민', '사용 중인 화장품', '알레르기 · 시술 이력', '관리 희망 사항'];
  rows.forEach((s, i) => {
    text(c, s, 12, 52 + i * 42, 11, '#5d4037', 'left', false);
    c.fillStyle = '#e0e0e0';
    c.fillRect(12, 64 + i * 42, 168, 1);
  });
  c.strokeStyle = '#455a64';
  c.beginPath();
  c.moveTo(20, 62);
  c.bezierCurveTo(40, 54, 60, 66, 90, 58);
  c.stroke();
};
const paintTemp: Paint = (c) => {
  c.fillStyle = '#1a0d05';
  c.fillRect(0, 0, 128, 48);
  text(c, '80°C', 64, 25, 24, '#ffab40', 'center');
};
const paintMembership: Paint = (c) => {
  c.fillStyle = '#fbf6ee';
  c.fillRect(0, 0, 256, 192);
  c.fillStyle = '#c9a36a';
  c.fillRect(0, 0, 256, 30);
  text(c, '윤기 스킨 회원권', 128, 16, 15, '#ffffff', 'center');
  const rows: Array<[string, string]> = [
    ['기초 관리 10회', '55만원'],
    ['수분 집중 10회', '75만원'],
    ['리프팅 10회', '99만원'],
    ['VIP 연간 회원', '300만원'],
  ];
  rows.forEach(([a, b], i) => {
    text(c, a, 14, 52 + i * 32, 13, '#4e342e', 'left', false);
    text(c, b, 242, 52 + i * 32, 13, '#8e6b4a', 'right');
  });
  text(c, '+ 홈케어 키트 증정', 128, 180, 11, '#c62828', 'center');
};
const paintSheetMasks: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 128);
  const k = ['#b2dfdb', '#f8bbd0', '#fff59d', '#c5cae9', '#dcedc8'];
  const s = ['시카', '로즈', '비타', '히알', '녹차'];
  for (let i = 0; i < 5; i++) {
    c.fillStyle = k[i];
    c.fillRect(4 + i * 50, 4, 46, 120);
    text(c, s[i], 27 + i * 50, 40, 13, '#37474f', 'center');
    text(c, 'MASK', 27 + i * 50, 70, 9, '#607d8b', 'center', false);
  }
};

// ---------------------------------------------------------------------------------------------
// The bed's client, lying (the bed's frame: the head to +z on the cradle, the feet to -z).

/** The face lying up: its middle's top (where the hands go) and the head's middle. */
const HEAD = v3(0, 0.8, 0.7);
const FACE = v3(0, 0.89, 0.7);

/** A head lying face up on the cradle, the crown to +z: the eyes shut, the hair under it, a terry band round the hairline. */
function headUp(g: THREE.Object3D, band = BAND) {
  const H = HEAD;
  part(g, ball(0.09), SKIN, H.x, H.y, H.z).scale.set(0.92, 1, 1.05);
  part(g, ball(0.097), HAIR, H.x, H.y - 0.018, H.z + 0.022).scale.set(1, 0.85, 1.05);
  part(g, rbox(0.22, 0.02, 0.12, 0.008), HAIR, H.x, 0.742, H.z + 0.12);
  for (const sx of [-1, 1]) {
    part(g, ball(0.018), SKIN, sx * 0.084, H.y - 0.005, H.z);
    // Shut eyes, brows, a touch of colour on the cheeks.
    part(g, box(0.024, 0.004, 0.004), '#3e2723', sx * 0.032, H.y + 0.083, H.z, { outline: false });
    part(g, box(0.028, 0.004, 0.005), '#4e342e', sx * 0.034, H.y + 0.08, H.z + 0.03, { outline: false });
  }
  part(g, ball(0.017), shade(SKIN, 0.95), 0, H.y + 0.092, H.z - 0.012, { outline: false });
  part(g, box(0.03, 0.004, 0.007), '#c97b84', 0, H.y + 0.077, H.z - 0.048, { outline: false });
  // The band round the hairline and its knot on top.
  part(g, ring(0.09, 0.024), band, H.x, H.y, H.z + 0.048, { outline: false });
  part(g, ball(0.03), band, H.x, H.y + 0.07, H.z + 0.07).scale.set(1.4, 0.7, 0.8);
}

/**
 * Lying face up under a blanket to the chest, the top wrapped in a towel, the bare shoulders out (a
 * facial). `wrap` the towel round the chest, `cover` the blanket.
 */
function lyingUp(g: THREE.Object3D, cover = BLANKET, wrap = TOWEL, band = BAND): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  headUp(root, band);
  rod(root, v3(0, 0.785, 0.63), v3(0, 0.775, 0.5), 0.045, SKIN);
  for (const sx of [-1, 1]) part(root, ball(0.062), SKIN, sx * 0.18, 0.772, 0.43);
  part(root, rbox(0.42, 0.13, 0.26, 0.06), wrap, 0, 0.77, 0.37);
  // The blanket over the body: chest, hips, legs, the feet up under its end; its folded top edge.
  part(root, rbox(0.62, 0.15, 0.36, 0.06), cover, 0, 0.775, 0.14);
  part(root, rbox(0.62, 0.14, 0.42, 0.06), cover, 0, 0.77, -0.24);
  part(root, rbox(0.58, 0.1, 0.46, 0.045), cover, 0, 0.75, -0.66);
  part(root, rbox(0.36, 0.14, 0.12, 0.05), cover, 0, 0.78, -0.86);
  part(root, rbox(0.64, 0.035, 0.08, 0.015), TOWEL, 0, 0.85, 0.32);
  // The hands folded on the blanket.
  for (const sx of [-1, 1]) part(root, ball(0.034), SKIN, sx * 0.05, 0.86, -0.04 + sx * 0.02).scale.set(1, 0.6, 1.3);
  return root;
}

/** Lying face down, the face in the cradle: the bare back oiled for a massage, a towel from the waist down. */
function lyingDown(g: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  g.add(root);
  part(root, ball(0.09), SKIN, 0, 0.79, 0.76);
  part(root, ball(0.098), HAIR, 0, 0.815, 0.765).scale.set(1, 0.85, 1.05);
  part(root, ball(0.045), HAIR, 0, 0.9, 0.775);
  part(root, ring(0.092, 0.022), BAND, 0, 0.8, 0.725, { outline: false });
  rod(root, v3(0, 0.79, 0.68), v3(0, 0.785, 0.56), 0.047, SKIN);
  // The back: the shoulders, the blades either side of the spine, the waist.
  part(root, rbox(0.42, 0.15, 0.52, 0.07), SKIN, 0, 0.775, 0.28);
  part(root, box(0.012, 0.004, 0.42), shade(SKIN, 0.85), 0, 0.851, 0.27, { outline: false });
  for (const sx of [-1, 1]) {
    part(root, ball(0.07), shade(SKIN, 0.97), sx * 0.09, 0.82, 0.42, { outline: false }).scale.set(1, 0.45, 1.1);
    part(root, ball(0.066), SKIN, sx * 0.19, 0.77, 0.48);
    rod(root, v3(sx * 0.22, 0.765, 0.47), v3(sx * 0.25, 0.745, 0.14), 0.042, SKIN);
    rod(root, v3(sx * 0.25, 0.745, 0.14), v3(sx * 0.255, 0.735, -0.12), 0.036, SKIN);
    part(root, ball(0.036), SKIN, sx * 0.255, 0.73, -0.16).scale.set(0.8, 0.6, 1.3);
    // The soles of the feet up past the towel's end.
    part(root, rbox(0.08, 0.1, 0.06, 0.025), SKIN, sx * 0.08, 0.77, -0.92);
  }
  // A sheen of oil on the back.
  glowing(root, box(0.12, 0.002, 0.2), '#fff3e6', 0.06, 0.853, 0.18);
  // The towel over the hips and the legs.
  part(root, rbox(0.52, 0.15, 0.42, 0.06), TOWEL, 0, 0.775, -0.12);
  part(root, rbox(0.48, 0.11, 0.56, 0.05), TOWEL, 0, 0.755, -0.6);
  return root;
}

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /**
   * The facial bed (관리 베드): a long cushioned bed in blush upholstery on its white hydraulic pedestal,
   * a white towel sheet over it, the separate head cushion with its face cradle at the room end; the
   * facial steamer on its rolling stand at the head with a tray of bowls, toners and cotton, its arm
   * parked along the bed; a magnifier lamp on the other side; the therapist's stool tucked under the
   * head. Idle, towels folded on it and a bolster. In use the client lies under the blanket, a terry
   * band round the hairline: for a facial (and a VIP's, in gold, or a trainee lying in for the
   * lesson) the therapist sits on the stool at the head — the steamer's arm swung in over the face by
   * its handle and steaming, the face massaged with both hands, a green clay mask painted on from the
   * bowl with the fan brush; for a massage the client lies face down in the cradle, a towel over the
   * hips, and the therapist stands at the side, palms on the oiled back. A junior watching stands on
   * the steamer's side.
   */
  facialBed(g, _W, D, _c, _def, _ctx, out) {
    const TOP = 0.7;
    const L = D - 0.14;
    // The pedestal and the bed's frame.
    part(g, rbox(0.5, 0.06, 0.92, 0.025), '#e7e1db', 0, 0.03, -0.05);
    part(g, rbox(0.34, 0.44, 0.66, 0.06), '#f6f3ef', 0, 0.28, -0.05);
    part(g, box(0.36, 0.02, 0.68), ROSE_GOLD, 0, 0.46, -0.05, { outline: false });
    part(g, rbox(0.12, 0.03, 0.08, 0.012), '#b0aaa4', 0.24, 0.03, 0.34);
    part(g, rbox(0.7, 0.07, L, 0.03), '#ece4db', 0, 0.535, 0);
    // The body cushion with its sheet, and the head cushion with the cradle.
    part(g, rbox(0.68, 0.13, L - 0.3, 0.05), UPH, 0, TOP - 0.065, -0.15);
    part(g, box(0.66, 0.006, L - 0.36), TOWEL, 0, TOP + 0.002, -0.15, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.004, 0.006, L - 0.34), shade(UPH, 0.82), sx * 0.341, TOP - 0.065, -0.15, { outline: false });
    part(g, rbox(0.4, 0.11, 0.28, 0.05), UPH, 0, TOP - 0.06, 0.78);
    part(g, ring(0.075, 0.03), shade(UPH, 0.9), 0, TOP + 0.0, 0.77, { rx: Math.PI / 2 });

    // The steamer on its stand at the head (the client's left), the tray of bowls and toners on its post.
    const S = FACIAL_STEAMER;
    const P = v3(FACE.x - S.side, FACE.y + S.up, FACE.z - S.ahead);
    starBase(g, P.x, P.z, 0.2, '#e0dbd6');
    part(g, cyl(0.02, 0.02, P.y - 0.34, 10), CHROME, P.x, 0.1 + (P.y - 0.34) / 2, P.z, { outline: false });
    part(g, cyl(0.15, 0.15, 0.02, 22), '#fafafa', P.x, 0.76, P.z);
    part(g, ring(0.15, 0.008), ROSE_GOLD, P.x, 0.773, P.z, { rx: Math.PI / 2, outline: false });
    for (const [i, k] of ['#ffffff', '#f8bbd0'].entries()) {
      const a = 1.9 + i * 0.9;
      part(g, cyl(0.04, 0.03, 0.035, 14), k, P.x + Math.sin(a) * 0.09, 0.79, P.z + Math.cos(a) * 0.09);
    }
    part(g, cyl(0.022, 0.024, 0.13, 12), '#c8e6c9', P.x + 0.08, 0.835, P.z - 0.06);
    part(g, cyl(0.008, 0.008, 0.03, 8), BLACK, P.x + 0.08, 0.915, P.z - 0.06, { outline: false });
    part(g, cyl(0.03, 0.03, 0.05, 14), '#ffffff', P.x + 0.1, 0.795, P.z + 0.04);
    for (let i = 0; i < 3; i++) part(g, cyl(0.022, 0.022, 0.004, 12), '#ffffff', P.x + 0.1, 0.823 + i * 0.005, P.z + 0.04, { outline: false });
    // The heater and its glass water jar, the arm's knuckle on top.
    part(g, cyl(0.075, 0.085, 0.09, 18), '#f5f5f5', P.x, P.y - 0.26, P.z);
    glowing(g, box(0.03, 0.012, 0.004), '#66bb6a', P.x, P.y - 0.26, P.z - 0.084);
    glass(g, cyl(0.065, 0.065, 0.14, 18), P.x, P.y - 0.145, P.z);
    part(g, cyl(0.058, 0.058, 0.08, 18), '#b3e5fc', P.x, P.y - 0.17, P.z, { material: WATER, outline: false });
    part(g, cyl(0.07, 0.07, 0.03, 18), '#f5f5f5', P.x, P.y - 0.06, P.z);
    part(g, ball(0.03), CHROME, P.x, P.y, P.z);
    const arm = new THREE.Group();
    arm.position.copy(P);
    arm.rotation.y = S.out;
    g.add(arm);
    rod(arm, v3(0, 0, 0), v3(0, 0.05, 0.22), 0.013, CHROME);
    rod(arm, v3(0, 0.05, 0.22), v3(0, -0.02, S.arm), 0.013, CHROME);
    part(arm, ball(0.022), '#f5f5f5', 0, -0.035, S.arm);
    part(arm, cyl(0.032, 0.022, 0.1, 14), '#f5f5f5', 0, -0.1, S.arm);
    part(arm, cyl(0.02, 0.02, 0.006, 12), '#cfd8dc', 0, -0.152, S.arm, { outline: false });
    const puffs = steamPuffs(arm, 6, 0.022);
    puffs.root.visible = false;
    // The magnifier lamp on the other side, its lens over the chest.
    const mx = -0.47;
    const mz = 0.97;
    starBase(g, mx, mz, 0.18, '#e0dbd6');
    part(g, cyl(0.016, 0.016, 1.0, 10), '#f5f5f5', mx, 0.6, mz, { outline: false });
    rod(g, v3(mx, 1.1, mz), v3(-0.36, 1.42, 0.72), 0.014, '#f5f5f5');
    rod(g, v3(-0.36, 1.42, 0.72), v3(-0.2, 1.32, 0.5), 0.012, '#f5f5f5');
    const lens = new THREE.Group();
    lens.position.set(-0.16, 1.3, 0.46);
    lens.rotation.set(Math.PI / 2 - 0.25, 0, 0.2);
    g.add(lens);
    part(lens, ring(0.1, 0.022), '#f5f5f5', 0, 0, 0);
    glass(lens, new THREE.CircleGeometry(0.09, 24), 0, 0, 0);
    const lensOn = new THREE.Group();
    lens.add(lensOn);
    part(lensOn, ring(0.088, 0.006), '#fffbe6', 0, 0, -0.012, { outline: false, shadow: false, material: glow('#fffbe6') });

    // Idle: towels folded on it, the bolster, the stool tucked under the head.
    const idle = new THREE.Group();
    g.add(idle);
    part(idle, rbox(0.36, 0.07, 0.28, 0.03), TOWEL, 0, TOP + 0.04, -0.25);
    part(idle, rbox(0.3, 0.05, 0.24, 0.025), BLANKET, 0, TOP + 0.1, -0.25);
    part(idle, rbox(0.14, 0.06, 0.1, 0.025), BAND, 0, TOP + 0.15, -0.25);
    part(idle, cyl(0.07, 0.07, 0.5, 16), '#f1e4dc', 0, TOP + 0.07, -0.6, { rz: Math.PI / 2 });
    stool(idle, 0, 1.06, 0.55);
    out.idle = idle;

    // In use.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const up = lyingUp(use);
    const vip = lyingUp(use, '#ead7ad', '#fffaf0', '#f3e2b3');
    const trainee = lyingUp(use, '#b8d3c0', '#fbfaf7', '#ffffff');
    const down = lyingDown(use);
    const stoolOut = stool(use, 0, 1.2, 0.55);
    const stoolIn = stool(use, 0, 1.06, 0.55);
    // VIP: a bowl of rose petals and a candle on the tray.
    const vipKit = new THREE.Group();
    use.add(vipKit);
    part(vipKit, cyl(0.05, 0.035, 0.03, 16), '#ffffff', P.x - 0.05, 0.79, P.z + 0.1);
    for (let i = 0; i < 6; i++) part(vipKit, ball(0.012), '#e57373', P.x - 0.05 + Math.cos(i) * 0.025, 0.81, P.z + 0.1 + Math.sin(i) * 0.025, { outline: false }).scale.set(1, 0.4, 1);
    part(vipKit, cyl(0.02, 0.02, 0.04, 12), '#fff8e1', P.x - 0.11, 0.79, P.z - 0.03);
    glowing(vipKit, ball(0.008), '#ffb74d', P.x - 0.11, 0.818, P.z - 0.03);
    // The massage oil on the tray.
    const oil = new THREE.Group();
    use.add(oil);
    part(oil, cyl(0.025, 0.028, 0.12, 12), '#ffe082', P.x - 0.06, 0.83, P.z + 0.09);
    part(oil, cyl(0.01, 0.01, 0.04, 8), '#5d4037', P.x - 0.06, 0.91, P.z + 0.09, { outline: false });
    // The mask on the face, part by part (forehead, the cheeks, the chin), and the bowl and brush.
    const coats: THREE.Mesh[] = [];
    const coatAt: Array<[number, number, number, number, number, number, number]> = [
      [0, HEAD.y + 0.078, HEAD.z + 0.05, 1.15, 0.65, 0, 0.5],
      [0.05, HEAD.y + 0.07, HEAD.z - 0.022, 0.75, 0.75, 0.55, 0],
      [-0.05, HEAD.y + 0.07, HEAD.z - 0.022, 0.75, 0.75, -0.55, 0],
      [0, HEAD.y + 0.063, HEAD.z - 0.07, 0.8, 0.55, 0, -0.6],
    ];
    const coatGroup = new THREE.Group();
    use.add(coatGroup);
    for (const [x, y, z, sx, sz, rz, rx] of coatAt) {
      const m = part(coatGroup, ball(0.04), CLAY, x, y, z, { outline: false, rz, rx });
      m.userData.size = [sx, sz];
      coats.push(m);
    }
    const bowl = maskBowl(use);
    const brush = fanBrush(use);
    const goldBowl = maskBowl(use, GOLD);
    const off = (o: BarOffset, v = new THREE.Vector3()) => v.set(FACE.x - o.side, FACE.y + o.up, FACE.z - o.ahead);
    const faceAt = marker(g, FACE.x, FACE.y, FACE.z);
    const backAt = marker(g, 0, 0.855, 0.15);
    // Sat at the head; stood at the side for the back; a junior watching from the steamer's side.
    const sat = (motion: Motion) => at(spot(g, 'sit', 0, 0.55, 1.2, Math.PI, 0.55), faceAt, motion);
    const spots: Record<string, Spot> = {
      '*': sat('facial'),
      vipSpa: sat('facial'),
      esthetician_trainTherapist: sat('facial'),
      massageTherapy: at(spot(g, 'stand', -0.5, 0, 0.12, Math.PI / 2), backAt, 'bodyMassage'),
      esthetician_observeCare: at(facing(g, 0.64, 0.3, FACE), faceAt, 'meeting'),
    };
    out.spots = spots;
    out.work = faceAt;
    const nozzle = v3(0, -0.16, S.arm);
    const downward = v3(0, -1, 0);
    out.animate = (t) => {
      const used = nowAt(spots, t);
      lensOn.visible = used !== null;
      const now = used ?? '*';
      const facial = now === '*' || now === 'vipSpa' || now === 'esthetician_trainTherapist';
      const massage = now === 'massageTherapy';
      up.visible = now === '*' || now === 'esthetician_observeCare';
      vip.visible = now === 'vipSpa';
      trainee.visible = now === 'esthetician_trainTherapist';
      down.visible = massage;
      vipKit.visible = now === 'vipSpa';
      oil.visible = massage;
      stoolOut.visible = facial;
      stoolIn.visible = !facial;
      let steam = 0;
      let coat = [0, 0, 0, 0];
      let tools = false;
      if (facial) {
        const k = facialRound(t, phaseAt(spots[now]));
        steam = k.steam;
        coat = k.coat;
        tools = k.brush;
        if (tools) {
          const b = now === 'vipSpa' ? goldBowl : bowl;
          off(k.bowl, b.position).y -= 0.035;
          aim(brush, off(k.r), off(k.tip));
        }
      } else if (now === 'esthetician_observeCare') {
        steam = 1;
        coat = [1, 1, 1, 1];
      }
      bowl.visible = tools && now !== 'vipSpa';
      goldBowl.visible = tools && now === 'vipSpa';
      brush.visible = tools;
      const mat = toon(now === 'vipSpa' ? GOLD : CLAY);
      coats.forEach((m, i) => {
        const c = coat[i];
        m.visible = !massage && c > 0.02;
        m.material = mat;
        const [sx, sz] = m.userData.size as [number, number];
        m.scale.set(sx * (0.3 + 0.7 * c), 0.2, sz * (0.3 + 0.7 * c));
      });
      arm.rotation.y = S.out + (S.in - S.out) * steam;
      puffs.root.visible = steam > 0.9;
      if (puffs.root.visible) puffs.move(t, nozzle, downward, 0.12);
    };
  },

  /**
   * The 3D skin analyser (피부 진단기): a white cabinet on castors and on it the imaging dome open to
   * one side, the camera at its back and a ring of flash LEDs round it, the chin rest and the forehead
   * bar at its rim; the monitor on its arm showing the face mapped by zone (pores, wrinkles, pigment,
   * redness, oil, moisture) and the scores; a pull-out shelf with the keyboard. In use a client sits
   * on the stool beside it, leant into the dome with the chin on the rest, the flashes going off in
   * turn while the therapist works the keyboard; cases are studied on the same screen from the atlas.
   */
  skinAnalyzer(g, _W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.3;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * 0.2, z + sz * 0.16, 0.03);
    part(g, rbox(0.5, 0.64, 0.42, 0.03), '#fafafa', 0, 0.4, z);
    part(g, box(0.46, 0.012, 0.012), '#7d9c8c', 0, 0.62, z + 0.212, { outline: false });
    part(g, rbox(0.44, 0.18, 0.012, 0.006), '#f1f1f1', 0, 0.4, z + 0.212);
    part(g, box(0.12, 0.012, 0.02), CHROME, 0, 0.46, z + 0.222, { outline: false });
    label(g, 'SKIN SCOPE 3D', 0.3, 0.05, 0, 0.25, z + 0.212, '#fafafa', '#5d8a7a');
    part(g, rbox(0.52, 0.04, 0.44, 0.015), '#eceff1', 0, 0.74, z);
    // The dome, open to +x, its camera and the flashes inside, the chin rest and the forehead bar.
    const dc = v3(0, 1.0, z);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 26, 14, -Math.PI / 2, Math.PI), SHELL);
    dome.userData.ownGeometry = true;
    dome.position.copy(dc);
    dome.castShadow = true;
    g.add(dome);
    part(g, ring(0.24, 0.014), '#cfd8dc', dc.x, dc.y, dc.z, { ry: Math.PI / 2 });
    part(g, rbox(0.2, 0.06, 0.2, 0.02), '#eceff1', 0, 0.79, z);
    part(g, cyl(0.045, 0.045, 0.06, 16), BLACK, dc.x - 0.2, dc.y, dc.z, { rz: Math.PI / 2 });
    part(g, cyl(0.03, 0.03, 0.004, 16), '#3949ab', dc.x - 0.168, dc.y, dc.z, { rz: Math.PI / 2, outline: false });
    const flash = new THREE.Group();
    g.add(flash);
    const flashes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const y = dc.y + Math.sin(a) * 0.13;
      const zz = dc.z + Math.cos(a) * 0.13;
      part(g, box(0.008, 0.035, 0.035), '#e0e0e0', dc.x - 0.19, y, zz, { outline: false });
      flashes.push(glowing(flash, box(0.006, 0.026, 0.026), '#ffffff', dc.x - 0.185, y, zz));
    }
    rod(g, v3(0.07, 0.8, z), v3(0.07, 0.89, z), 0.008, CHROME);
    part(g, ring(0.035, 0.01, Math.PI), '#90a4ae', 0.07, 0.89, z, { ry: Math.PI / 2, rz: Math.PI });
    for (const sz of [-1, 1]) rod(g, v3(0.07, 0.8, z + sz * 0.13), v3(0.07, 1.13, z + sz * 0.13), 0.006, CHROME);
    rod(g, v3(0.07, 1.13, z - 0.13), v3(0.07, 1.13, z + 0.13), 0.012, '#90a4ae');
    // The monitor on its arm, turned to whoever stands at the front, and the keyboard shelf.
    rod(g, v3(-0.22, 0.76, z - 0.15), v3(-0.22, 1.36, z - 0.15), 0.016, '#cfd8dc');
    rod(g, v3(-0.22, 1.36, z - 0.15), v3(-0.12, 1.4, z + 0.1), 0.014, '#cfd8dc');
    const mon = new THREE.Group();
    mon.position.set(-0.1, 1.42, z + 0.14);
    mon.rotation.set(-0.12, 0.15, 0);
    g.add(mon);
    part(mon, rbox(0.42, 0.29, 0.03, 0.01), '#fafafa', 0, 0, 0);
    const tMap = painted('est-skinmap', 384, 256, paintSkinMap);
    const tAtlas = painted('est-atlas', 384, 256, paintCaseAtlas);
    const screen = litScreen(mon, tMap, 0.39, 0.26, 0, 0, 0.016);
    out.screen = screen;
    part(g, rbox(0.4, 0.02, 0.16, 0.008), '#eceff1', -0.04, 0.8, z + 0.3);
    for (const sx of [-1, 1]) part(g, box(0.012, 0.012, 0.16), CHROME, sx * 0.17, 0.785, z + 0.23, { outline: false });
    part(g, rbox(0.28, 0.012, 0.1, 0.004), '#ffffff', -0.07, 0.816, z + 0.3);
    part(g, rbox(0.05, 0.015, 0.07, 0.01), '#ffffff', 0.12, 0.818, z + 0.3);
    const keys = marker(g, -0.07, 0.83, z + 0.3);
    // In use: the client sat beside it, leant into the dome, the chin on the rest.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const client = new THREE.Group();
    use.add(client);
    const cx = 0.5;
    stool(client, cx, z, 0.5, '#e8dccb');
    part(client, rbox(0.3, 0.14, 0.34, 0.06), '#78909c', cx - 0.02, 0.58, z);
    part(client, rbox(0.32, 0.46, 0.22, 0.08), '#d7ccc8', cx - 0.12, 0.82, z, { rz: 0.55 });
    const sh = v3(0.27, 0.99, z);
    rod(client, sh, v3(0.17, 1.0, z), 0.045, SKIN);
    const hd = new THREE.Group();
    hd.position.set(0.12, 1.0, z);
    hd.rotation.y = -Math.PI / 2;
    client.add(hd);
    part(hd, ball(0.09), SKIN, 0, 0, 0).scale.set(0.92, 1.05, 1);
    part(hd, ball(0.096), HAIR, 0, 0.024, -0.016).scale.set(1, 0.9, 1);
    part(hd, ball(0.045), HAIR, 0, 0.03, -0.1);
    part(hd, ring(0.093, 0.012, Math.PI), BAND, 0, 0.02, 0.03, { rx: -0.3, outline: false });
    for (const sx of [-1, 1]) {
      part(hd, box(0.022, 0.004, 0.004), '#3e2723', sx * 0.032, 0.0, 0.084, { outline: false });
      part(hd, ball(0.017), SKIN, sx * 0.084, -0.005, 0);
      // The thighs and shins, the hands on the knees.
      const knee = v3(0.29, 0.53, z + sx * 0.1);
      rod(client, v3(cx - 0.02, 0.57, z + sx * 0.09), knee, 0.055, '#78909c');
      rod(client, knee, v3(0.3, 0.08, z + sx * 0.1), 0.045, '#78909c');
      part(client, rbox(0.14, 0.07, 0.08, 0.025), '#fafafa', 0.26, 0.035, z + sx * 0.1);
      const elbow = v3(0.33, 0.76, z + sx * 0.17);
      rod(client, v3(sh.x + 0.03, sh.y - 0.03, z + sx * 0.16), elbow, 0.035, '#d7ccc8');
      rod(client, elbow, v3(0.31, 0.58, z + sx * 0.1), 0.03, SKIN);
    }
    const spots: Record<string, Spot> = {
      '*': at(spot(g, 'stand', -0.06, 0, z + 0.66, Math.PI), keys, 'type'),
      esthetician_studySkin: at(spot(g, 'stand', -0.1, 0, z + 0.7, Math.PI), keys, 'read'),
    };
    out.spots = spots;
    out.work = keys;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const study = now === 'esthetician_studySkin';
      client.visible = !study;
      (screen.material as THREE.MeshBasicMaterial).map = study ? tAtlas : tMap;
      // Three flashes every few seconds: plain light, UV, polarised.
      const u = (t % 3.2) / 3.2;
      const shot = study ? -1 : u < 0.06 ? 0 : u > 0.12 && u < 0.18 ? 1 : u > 0.24 && u < 0.3 ? 2 : -1;
      flash.visible = shot >= 0;
      const k = shot === 1 ? '#b388ff' : shot === 2 ? '#e1f5fe' : '#ffffff';
      for (const m of flashes) m.material = glow(k);
    };
  },

  /**
   * The ampoule bar (앰플 조제대): a white counter with rose-gold pulls, a marble top, and behind it a
   * mirrored back on which three glass shelves of ampoules stand in rows (vitamin C, hyaluronic acid,
   * peptide, cica, each labelled), the sign over them. On the counter a base-essence pump, a glass
   * beaker with a stirring rod, the droppers in their rack, a pocket scale and a tray of empty amber
   * bottles with blank labels; the membership price list in its stand. In use the custom serum is
   * mixed in the beaker, a dropper over it dripping; the membership plans are drawn up on the price
   * list with a calculator.
   */
  serumShelf(g, _W, D, _c, _def, _ctx, out) {
    const d = 0.46;
    const z = -D / 2 + d / 2 + 0.02;
    const zf = z + d / 2;
    const top = 0.9;
    part(g, rbox(0.9, top - 0.04, d - 0.03, 0.02), '#fbf8f6', 0, (top - 0.04) / 2, z - 0.01);
    for (let i = 0; i < 2; i++) {
      part(g, rbox(0.4, 0.38, 0.014, 0.008), '#f3ece8', -0.21 + i * 0.42, 0.4, zf - 0.02);
      part(g, box(0.1, 0.012, 0.02), ROSE_GOLD, -0.21 + i * 0.42, 0.55, zf - 0.008, { outline: false });
    }
    part(g, rbox(0.94, 0.04, d + 0.02, 0.012), '#f4f1ee', 0, top - 0.02, z);
    // The mirrored back with its glass shelves of ampoules.
    part(g, box(0.9, 1.0, 0.03), '#e9e3dd', 0, top + 0.5, -D / 2 + 0.03);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.82), toon('#dbe9ee', '#4c6670'));
    mirror.userData.ownGeometry = true;
    mirror.position.set(0, top + 0.47, -D / 2 + 0.047);
    g.add(mirror);
    label(g, '맞춤 앰플 바 · AMPOULE', 0.6, 0.08, 0, top + 0.95, -D / 2 + 0.05, '#7d9c8c', '#ffffff');
    const kinds: Array<[string, string]> = [
      ['비타C', '#ffb74d'],
      ['히알루론', '#81d4fa'],
      ['펩타이드', '#ce93d8'],
      ['시카', '#a5d6a7'],
    ];
    for (let s = 0; s < 3; s++) {
      const y = top + 0.14 + s * 0.26;
      glass(g, box(0.82, 0.012, 0.16), 0, y, -D / 2 + 0.12);
      glowing(g, box(0.8, 0.005, 0.008), '#fff8e1', 0, y + 0.235, -D / 2 + 0.07);
      for (let i = 0; i < 8; i++) {
        const x = -0.35 + i * 0.1;
        const [, k] = kinds[(i + s) % 4];
        part(g, cyl(0.018, 0.02, 0.09, 10), s === 2 ? '#8d5a2b' : k, x, y + 0.052, -D / 2 + 0.12);
        part(g, cyl(0.008, 0.012, 0.035, 8), s === 2 ? '#212121' : '#ffffff', x, y + 0.115, -D / 2 + 0.12, { outline: false });
      }
    }
    kinds.forEach(([s, k], i) => label(g, s, 0.15, 0.04, -0.3 + i * 0.2, top + 0.12, -D / 2 + 0.2, k, '#ffffff'));
    // On the counter: the essence pump, the droppers, the scale, the empty bottles.
    part(g, cyl(0.04, 0.045, 0.2, 14), '#ffffff', -0.36, top + 0.1, z - 0.1);
    rod(g, v3(-0.36, top + 0.2, z - 0.1), v3(-0.36, top + 0.25, z - 0.1), 0.008, CHROME);
    part(g, box(0.05, 0.012, 0.014), CHROME, -0.34, top + 0.255, z - 0.1, { outline: false });
    part(g, rbox(0.16, 0.03, 0.06, 0.01), '#eceff1', 0.3, top + 0.015, z - 0.12);
    for (let i = 0; i < 4; i++) {
      part(g, cyl(0.004, 0.004, 0.09, 6), '#e3f2fd', 0.25 + i * 0.035, top + 0.07, z - 0.12, { outline: false });
      part(g, ball(0.01), BLACK, 0.25 + i * 0.035, top + 0.12, z - 0.12, { outline: false });
    }
    part(g, rbox(0.12, 0.02, 0.12, 0.008), '#cfd8dc', 0.32, top + 0.01, z + 0.06);
    for (let i = 0; i < 3; i++) {
      part(g, cyl(0.017, 0.019, 0.07, 10), '#8d5a2b', 0.13 + i * 0.045, top + 0.035, z + 0.12);
      part(g, box(0.026, 0.026, 0.002), '#ffffff', 0.13 + i * 0.045, top + 0.035, z + 0.14, { outline: false });
    }
    // The beaker and its rod.
    const bx = -0.08;
    const bz = z + 0.05;
    glass(g, cyl(0.045, 0.045, 0.11, 16), bx, top + 0.055, bz);
    const serum = part(g, cyl(0.04, 0.04, 0.05, 16), '#ffe0b2', bx, top + 0.03, bz, { outline: false });
    rod(g, v3(bx + 0.02, top + 0.02, bz), v3(bx + 0.05, top + 0.16, bz - 0.01), 0.003, '#e3f2fd');
    const beakerAt = marker(g, bx, top + 0.12, bz);
    // The membership price list in its stand.
    const list = new THREE.Group();
    list.position.set(-0.3, top + 0.01, z + 0.1);
    list.rotation.x = -0.35;
    g.add(list);
    part(list, box(0.2, 0.15, 0.01), '#d4b483', 0, 0.075, 0);
    picture(list, painted('est-membership', 256, 192, paintMembership), 0.19, 0.142, 0, 0.075, 0.006);
    // In use: a dropper dripping into the beaker; for the plans, a calculator and the cards out.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const mix = new THREE.Group();
    use.add(mix);
    part(mix, cyl(0.004, 0.004, 0.09, 6), '#e3f2fd', bx, top + 0.17, bz, { outline: false });
    part(mix, ball(0.011), BLACK, bx, top + 0.22, bz, { outline: false });
    const drop = part(mix, ball(0.005), '#ffb74d', bx, top + 0.12, bz, { outline: false });
    const plan = new THREE.Group();
    use.add(plan);
    part(plan, rbox(0.08, 0.012, 0.12, 0.006), '#37474f', -0.12, top + 0.006, z + 0.13);
    glowing(plan, box(0.06, 0.002, 0.025), '#b2dfdb', -0.12, top + 0.013, z + 0.1);
    for (let i = 0; i < 3; i++) part(plan, rbox(0.085, 0.004, 0.055, 0.002), ['#c9a36a', '#212121', '#f8bbd0'][i], 0.06 + i * 0.02, top + 0.004 + i * 0.004, z + 0.14, { ry: 0.2 * i });
    const planAt = marker(g, -0.05, top + 0.02, z + 0.14);
    const spots: Record<string, Spot> = {
      '*': at(spot(g, 'stand', bx, 0, zf + 0.34, Math.PI), beakerAt, 'stir'),
      esthetician_planMembership: at(spot(g, 'stand', -0.1, 0, zf + 0.34, Math.PI), planAt, 'write'),
    };
    out.spots = spots;
    out.work = beakerAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      mix.visible = now !== 'esthetician_planMembership';
      plan.visible = now === 'esthetician_planMembership';
      const f = (t * 0.9) % 1;
      drop.position.y = top + 0.12 - f * 0.07;
      drop.visible = f < 0.85;
      // The serum deepens as the drops go in.
      serum.material = toon(mix.visible && now ? '#ffb74d' : '#ffe0b2');
    };
  },

  /**
   * The hot-towel cabinet (핫타월 온장고) on its cupboard: a white steel box with a glass door hung at
   * the left, two racks of rolled white towels inside lit warm while it's on, the temperature reading
   * 80°C, the tongs in their holder on top beside a stack of folded face towels; a basket for the used
   * ones on the floor. The door swings open to take a towel out with the tongs, steam curling out.
   */
  estTowelCabinet(g, _W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.24;
    part(g, rbox(0.56, 0.7, 0.42, 0.02), OAK, 0, 0.35, z);
    part(g, rbox(0.52, 0.5, 0.012, 0.006), shade(OAK, 0.92), 0, 0.38, z + 0.212);
    part(g, box(0.1, 0.014, 0.02), ROSE_GOLD, 0, 0.6, z + 0.222, { outline: false });
    const by = 0.7;
    const h = 0.46;
    const zf = z + 0.19;
    part(g, rbox(0.52, h, 0.38, 0.02), '#f5f5f5', 0, by + h / 2, z);
    // Inside: the dark back, two racks of rolled towels, the warm light.
    part(g, box(0.44, h - 0.08, 0.01), '#cfc8c2', 0, by + h / 2, z - 0.16, { outline: false });
    const warm = new THREE.Group();
    g.add(warm);
    for (let r = 0; r < 2; r++) {
      const y = by + 0.1 + r * 0.17;
      part(g, box(0.44, 0.008, 0.3), CHROME, 0, y - 0.045, z, { outline: false });
      for (let i = 0; i < 5; i++) part(g, cyl(0.04, 0.04, 0.26, 12), TOWEL, -0.17 + i * 0.085, y, z - 0.01, { rx: Math.PI / 2 });
      glowing(warm, box(0.42, 0.006, 0.006), '#ffb74d', 0, y + 0.07, z - 0.14);
    }
    // The control strip and its reading.
    part(g, box(0.48, 0.07, 0.01), '#37474f', 0, by + h - 0.045, zf + 0.002, { outline: false });
    const disp = litScreen(g, painted('est-temp', 128, 48, paintTemp), 0.11, 0.04, -0.12, by + h - 0.045, zf + 0.01);
    out.screen = disp;
    glowing(g, cyl(0.008, 0.008, 0.004, 8), '#66bb6a', 0.16, by + h - 0.045, zf + 0.01, Math.PI / 2);
    label(g, '핫타월', 0.12, 0.035, 0.05, by + h - 0.045, zf + 0.01, '#37474f', '#ffffff');
    // The door, hung at the left.
    const hinge = new THREE.Group();
    hinge.position.set(-0.25, 0, zf);
    hinge.userData.swing = -1;
    g.add(hinge);
    const dh = h - 0.12;
    part(hinge, rbox(0.5, dh, 0.02, 0.008), '#eeeeee', 0.25, by + dh / 2 + 0.02, 0.008);
    glass(hinge, box(0.42, dh - 0.07, 0.006), 0.25, by + dh / 2 + 0.02, 0.02);
    part(hinge, rbox(0.025, 0.14, 0.03, 0.01), CHROME, 0.46, by + dh / 2 + 0.02, 0.03);
    out.doors = [hinge];
    // On top: the tongs in their cup, the folded face towels.
    part(g, cyl(0.03, 0.03, 0.1, 12), '#eceff1', 0.18, by + h + 0.05, z - 0.08);
    for (const s of [-1, 1]) rod(g, v3(0.18, by + h + 0.06, z - 0.08), v3(0.18 + s * 0.012, by + h + 0.24, z - 0.07), 0.005, CHROME);
    for (let i = 0; i < 4; i++) part(g, rbox(0.22, 0.03, 0.16, 0.012), i % 2 ? '#fbe9e7' : TOWEL, -0.1, by + h + 0.016 + i * 0.032, z);
    // The basket for the used ones.
    part(g, cyl(0.15, 0.12, 0.26, 18), '#c8a27a', 0.38, 0.13, zf + 0.12);
    part(g, rbox(0.18, 0.06, 0.16, 0.03), TOWEL, 0.38, 0.27, zf + 0.12);
    // In use: the warm light on, steam from the open door.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    use.add(warm);
    const puffs = steamPuffs(use, 5, 0.03);
    const inside = marker(g, 0, by + 0.27, z + 0.05);
    out.work = inside;
    out.spots = { '*': at(spot(g, 'stand', 0.04, 0, zf + 0.46, Math.PI), inside, 'rummage') };
    const from = v3(0.05, by + 0.3, zf + 0.04);
    const dir = v3(0.1, 1, 0.3).normalize();
    out.animate = (t) => puffs.move(t, from, dir, 0.35);
  },

  /**
   * The skin consultation desk (피부 상담 데스크): a white desk on rose-gold legs, the therapist's
   * side at its front with a soft white chair. On it the monitor with the client's skin report (the
   * radar of moisture, oil, elasticity…, the four-week programme), the keyboard, a tablet turned to the
   * client across the desk with the skin seen through the probe, the handheld scanner in its lit dock,
   * the skin-type chart in its acrylic stand, a round mirror, a tray of sample tubes, tissues, flowers
   * and the consultation card with a pen. The programme is drawn up sat at the keyboard.
   */
  estConsultDesk(g, W, D, _c, _def, _ctx, out) {
    const d = 0.64;
    const z = -D / 2 + d / 2 + 0.02;
    const top = 0.74;
    part(g, rbox(W - 0.1, 0.04, d, 0.015), '#fbfaf8', 0, top, z);
    part(g, box(W - 0.14, 0.012, 0.01), OAK, 0, top - 0.012, z + d / 2 - 0.004, { outline: false });
    part(g, rbox(0.42, 0.14, d - 0.08, 0.01), '#f4f1ee', W / 2 - 0.35, top - 0.1, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.012, top - 0.02, 8), ROSE_GOLD, sx * (W / 2 - 0.12), (top - 0.02) / 2, z + sz * (d / 2 - 0.06), { outline: false });
    // The monitor, turned to the therapist (+z), the keyboard and the mouse.
    const mon = new THREE.Group();
    mon.position.set(-0.08, top + 0.27, z - 0.12);
    mon.rotation.y = -0.35;
    g.add(mon);
    part(mon, rbox(0.5, 0.32, 0.025, 0.01), '#fafafa', 0, 0, 0);
    part(mon, box(0.05, 0.2, 0.03), '#e0e0e0', 0, -0.17, -0.03, { outline: false });
    part(g, rbox(0.18, 0.012, 0.14, 0.006), '#e0e0e0', -0.08, top + 0.026, z - 0.15);
    out.screen = litScreen(mon, painted('est-report', 384, 240, paintReport), 0.47, 0.29, 0, 0.01, 0.014);
    part(g, rbox(0.36, 0.014, 0.12, 0.005), '#ffffff', -0.45, top + 0.027, z + 0.15);
    part(g, rbox(0.05, 0.018, 0.08, 0.012), '#ffffff', -0.2, top + 0.029, z + 0.16);
    const keys = marker(g, -0.45, top + 0.04, z + 0.15);
    // The tablet on its stand turned to the client across the desk (-z), the scanner in its dock.
    const tab = new THREE.Group();
    tab.position.set(-0.72, top + 0.12, z - 0.14);
    tab.rotation.set(-0.3, Math.PI, 0, 'YXZ');
    g.add(tab);
    part(tab, rbox(0.17, 0.23, 0.012, 0.01), BLACK, 0, 0, 0);
    picture(tab, painted('est-tablet', 192, 256, paintTablet), 0.15, 0.2, 0, 0, 0.007);
    part(g, box(0.06, 0.1, 0.06), '#e0e0e0', -0.72, top + 0.05, z - 0.1, { outline: false });
    part(g, rbox(0.08, 0.03, 0.1, 0.012), '#f5f5f5', 0.3, top + 0.035, z + 0.12);
    glowing(g, box(0.06, 0.004, 0.006), '#4fc3f7', 0.3, top + 0.052, z + 0.17);
    const probe = new THREE.Group();
    probe.position.set(0.3, top + 0.05, z + 0.12);
    probe.rotation.x = -1.2;
    g.add(probe);
    part(probe, cyl(0.016, 0.014, 0.15, 12), '#fafafa', 0, 0.075, 0);
    part(probe, cyl(0.02, 0.016, 0.02, 12), '#90a4ae', 0, 0.16, 0);
    glowing(probe, cyl(0.014, 0.014, 0.004, 12), '#80deea', 0, 0.172, 0);
    // The skin-type chart, the mirror, the samples, tissues, flowers, the card and pen.
    const chart = new THREE.Group();
    chart.position.set(0.62, top + 0.02, z - 0.2);
    chart.rotation.y = Math.PI - 0.3;
    g.add(chart);
    glass(chart, box(0.16, 0.22, 0.008), 0, 0.11, 0);
    picture(chart, painted('est-types', 192, 256, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 192, 256);
      text(c, '피부 타입', 96, 22, 18, '#7d9c8c', 'center');
      const k = ['#e3f2fd', '#fff8e1', '#fce4ec', '#e8f5e9'];
      ['건성', '지성', '민감성', '복합성'].forEach((s, i) => {
        c.fillStyle = k[i];
        c.fillRect(12, 44 + i * 52, 168, 44);
        text(c, s, 96, 66 + i * 52, 16, '#37474f', 'center');
      });
    }), 0.14, 0.2, 0, 0.11, 0.006);
    const mx = -0.4;
    part(g, cyl(0.06, 0.07, 0.015, 16), ROSE_GOLD, mx, top + 0.03, z - 0.22);
    rod(g, v3(mx, top + 0.03, z - 0.22), v3(mx, top + 0.12, z - 0.22), 0.006, ROSE_GOLD);
    part(g, ring(0.08, 0.008), ROSE_GOLD, mx, top + 0.2, z - 0.22);
    const mir = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), toon('#dbe9ee', '#4c6670'));
    mir.userData.ownGeometry = true;
    mir.position.set(mx, top + 0.2, z - 0.225);
    mir.rotation.y = Math.PI;
    g.add(mir);
    part(g, rbox(0.2, 0.02, 0.1, 0.008), '#f5f5f5', 0.58, top + 0.03, z + 0.12);
    for (let i = 0; i < 4; i++) part(g, cyl(0.012, 0.012, 0.08, 8), ['#f8bbd0', '#b2dfdb', '#fff59d', '#ffffff'][i], 0.51 + i * 0.045, top + 0.05, z + 0.12, { rx: Math.PI / 2 - 0.3 });
    part(g, rbox(0.14, 0.07, 0.1, 0.015), '#ffffff', 0.84, top + 0.055, z + 0.1);
    part(g, ball(0.03), '#ffffff', 0.84, top + 0.1, z + 0.1, { outline: false }).scale.set(1, 0.8, 0.6);
    part(g, cyl(0.035, 0.03, 0.12, 12), '#e1f5fe', 0.86, top + 0.08, z - 0.2);
    for (let i = 0; i < 5; i++) part(g, ball(0.024), ['#ffffff', '#f8bbd0', '#c5e1a5', '#ffffff', '#f48fb1'][i], 0.86 + Math.cos(i * 1.3) * 0.035, top + 0.18 + (i % 2) * 0.03, z - 0.2 + Math.sin(i * 1.3) * 0.035);
    picture(g, painted('est-card', 192, 256, paintClientCard), 0.15, 0.2, 0.07, top + 0.024, z + 0.12, '#ffffff', 0, -Math.PI / 2);
    rod(g, v3(0.16, top + 0.026, z + 0.04), v3(0.17, top + 0.026, z + 0.18), 0.005, BLACK);
    // The therapist's chair at the front.
    const cz = z + d / 2 + 0.3;
    const seat = 0.48;
    const sx = -0.45;
    starBase(g, sx, cz, 0.24, '#e0dbd6');
    part(g, cyl(0.025, 0.025, seat - 0.2, 10), CHROME, sx, 0.1 + (seat - 0.2) / 2, cz, { outline: false });
    part(g, rbox(0.46, 0.08, 0.44, 0.04), '#f7f3ef', sx, seat - 0.04, cz);
    part(g, rbox(0.44, 0.46, 0.08, 0.04), '#f7f3ef', sx, seat + 0.3, cz + 0.22, { rx: 0.08 });
    out.seat = marker(g, sx, seat, cz);
    out.work = keys;
    out.spots = { '*': at(spot(g, 'sit', sx, seat, cz, Math.PI, seat), keys, 'type') };
  },

  /**
   * The client's chair (고객 의자): a soft tub armchair in cream bouclé on oak legs, a sage cushion. A
   * client sat in it has the skin scanned (the therapist stood at their right with the handheld probe
   * to the cheek, the forehead, the nose and the chin, the tablet in the other hand reading out the
   * moisture and the oil) or is talked with over a cup of tea set down on the chair's arm.
   */
  estClientChair(g, _W, _D, _c, _def, _ctx, out) {
    const seatY = 0.46;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.014, 0.2, 8), OAK, sx * 0.22, 0.1, sz * 0.2, { rz: sx * 0.08, rx: -sz * 0.08, outline: false });
    part(g, rbox(0.62, 0.22, 0.56, 0.08), CREAM, 0, 0.3, 0.0);
    part(g, rbox(0.48, 0.08, 0.44, 0.04), '#f8f3ec', 0, seatY - 0.04, 0.04);
    // The rounded back and arms.
    // Open at the front (+z): the wall from 0.55 rad round the back to the other side.
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.3, 0.42, 22, 1, true, 0.55, Math.PI * 2 - 1.1), BOUCLE);
    back.userData.ownGeometry = true;
    back.position.set(0, seatY + 0.16, -0.0);
    back.castShadow = true;
    g.add(back);
    part(g, ring(0.3, 0.05, Math.PI * 2 - 1.1), CREAM, 0, seatY + 0.37, 0, { rx: Math.PI / 2, rz: Math.PI / 2 + 0.55 });
    part(g, rbox(0.3, 0.26, 0.08, 0.04), '#b8cdb0', 0, seatY + 0.2, -0.17, { rx: -0.15 });
    out.seat = marker(g, 0, seatY, 0.04);
    // Where a sat dweller's face is, about; their near cheek, at the chair's -x.
    const F = v3(0, seatY + 0.73, 0.1);
    const cheek = v3(-0.06, seatY + 0.71, 0.14);
    const faceAt = marker(g, F.x, F.y, F.z);
    const cheekAt = marker(g, cheek.x, cheek.y, cheek.z);
    const spots: Record<string, Spot> = {
      'social:skinConsult': at(facing(g, -0.5, 0.3, cheek), cheekAt, 'skinScan'),
      'social:relaxChat': at(facing(g, -0.46, 0.5, F), faceAt, 'talk'),
    };
    out.spots = spots;
    // The probe and the tablet for a skin scan.
    const scan = new THREE.Group();
    scan.visible = false;
    g.add(scan);
    const probe = new THREE.Group();
    scan.add(probe);
    part(probe, cyl(0.015, 0.013, 0.13, 12), '#fafafa', 0, 0, 0.065, { rx: Math.PI / 2 });
    part(probe, cyl(0.019, 0.015, 0.02, 12), '#90a4ae', 0, 0, 0.135, { rx: Math.PI / 2 });
    glowing(probe, cyl(0.013, 0.013, 0.004, 12), '#80deea', 0, 0, 0.147, Math.PI / 2);
    const tablet = new THREE.Group();
    tablet.rotation.order = 'YXZ';
    scan.add(tablet);
    part(tablet, rbox(0.17, 0.23, 0.012, 0.01), BLACK, 0, 0, 0);
    picture(tablet, painted('est-tablet', 192, 256, paintTablet), 0.15, 0.2, 0, 0, 0.007);
    const yaw = spots['social:skinConsult'].at.rotation.y;
    const fwd = v3(Math.sin(yaw), 0, Math.cos(yaw));
    const left = v3(Math.cos(yaw), 0, -Math.sin(yaw));
    const off = (o: BarOffset, v = new THREE.Vector3()) => v.copy(cheek).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
    off(SKIN_TABLET, tablet.position);
    tablet.rotation.set(-0.85, yaw + Math.PI, 0);
    // A cup of tea on the arm for a chat, steaming.
    const tea = new THREE.Group();
    tea.visible = false;
    g.add(tea);
    part(tea, cyl(0.06, 0.06, 0.008, 16), '#ffffff', 0.27, seatY + 0.42, 0.05);
    part(tea, cyl(0.035, 0.03, 0.05, 14), '#ffffff', 0.27, seatY + 0.45, 0.05);
    part(tea, cyl(0.031, 0.031, 0.004, 14), '#c5a25a', 0.27, seatY + 0.473, 0.05, { outline: false });
    const puffs = steamPuffs(tea, 3, 0.012);
    const cup = v3(0.27, seatY + 0.48, 0.05);
    const tip = new THREE.Vector3();
    const hand = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      scan.visible = now === 'social:skinConsult';
      tea.visible = now === 'social:relaxChat';
      if (scan.visible) {
        const k = skinScanRound(t, phaseAt(spots['social:skinConsult']));
        aim(probe, off(k.r, hand), off(k.tip, tip));
      }
      if (tea.visible) puffs.move(t, cup, UP, 0.12);
    };
  },

  /**
   * The welcome-tea table (웰컴 티 테이블) between the soft chairs: a round oak side table, on it a
   * tray with the white teapot, two cups on saucers, three glass caddies of loose tea (camomile,
   * rooibos, jujube), a little sand timer, a dish of 다식, and a vase of dried eucalyptus. The tea is
   * brewed standing over it: the lid lifted and the leaves stirred, the timer turned, steam rising.
   */
  estTeaTable(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.6;
    part(g, cyl(0.06, 0.12, 0.04, 16), OAK, 0, 0.02, 0);
    part(g, cyl(0.03, 0.03, top - 0.05, 10), OAK, 0, top / 2, 0, { outline: false });
    part(g, cyl(0.32, 0.32, 0.035, 28), OAK, 0, top, 0);
    part(g, rbox(0.42, 0.02, 0.28, 0.01), '#f4ede4', 0, top + 0.028, 0.02);
    // The teapot.
    part(g, ball(0.07), '#fafafa', -0.08, top + 0.1, 0.04).scale.set(1, 0.8, 1);
    part(g, cyl(0.035, 0.04, 0.02, 12), '#fafafa', -0.08, top + 0.16, 0.04);
    part(g, ball(0.012), '#c9a37a', -0.08, top + 0.18, 0.04);
    rod(g, v3(-0.02, top + 0.09, 0.04), v3(0.04, top + 0.14, 0.04), 0.01, '#fafafa');
    part(g, ring(0.04, 0.008, Math.PI), '#fafafa', -0.15, top + 0.1, 0.04, { rz: Math.PI / 2 });
    // The cups on their saucers.
    const cups: THREE.Vector3[] = [];
    for (const [x, zz] of [[0.1, 0.1], [0.12, -0.06]]) {
      part(g, cyl(0.05, 0.05, 0.006, 14), '#ffffff', x, top + 0.042, zz);
      part(g, cyl(0.03, 0.025, 0.045, 12), '#ffffff', x, top + 0.066, zz);
      part(g, cyl(0.027, 0.027, 0.004, 12), '#c9873f', x, top + 0.086, zz, { outline: false });
      cups.push(v3(x, top + 0.09, zz));
    }
    // The caddies, the timer, the 다식, the vase.
    for (let i = 0; i < 3; i++) {
      glass(g, cyl(0.025, 0.025, 0.08, 12), -0.22 + i * 0.06, top + 0.06, -0.18);
      part(g, cyl(0.02, 0.02, 0.04, 12), ['#ffe082', '#bf6f3a', '#8d3b2a'][i], -0.22 + i * 0.06, top + 0.04, -0.18, { outline: false });
      part(g, cyl(0.026, 0.026, 0.012, 12), OAK, -0.22 + i * 0.06, top + 0.106, -0.18);
    }
    const timer = new THREE.Group();
    timer.position.set(0.2, top + 0.02, -0.18);
    g.add(timer);
    for (const y of [0, 0.08]) part(timer, cyl(0.022, 0.022, 0.008, 10), OAK, 0, y, 0);
    glass(timer, cyl(0.004, 0.017, 0.035, 10), 0, 0.058, 0);
    glass(timer, cyl(0.017, 0.004, 0.035, 10), 0, 0.022, 0);
    const sand = part(timer, cyl(0.012, 0.003, 0.02, 10), '#e6c58f', 0, 0.015, 0, { outline: false });
    part(g, cyl(0.07, 0.05, 0.015, 16), '#d7ccc8', 0.0, top + 0.026, -0.2);
    for (let i = 0; i < 5; i++) part(g, cyl(0.014, 0.014, 0.012, 8), ['#f8bbd0', '#fff59d', '#c5e1a5', '#f8bbd0', '#ffffff'][i], Math.cos(i * 1.25) * 0.035, top + 0.04, -0.2 + Math.sin(i * 1.25) * 0.035, { outline: false });
    part(g, cyl(0.03, 0.04, 0.14, 12), '#d7ccc8', 0.24, top + 0.09, 0.12);
    for (let i = 0; i < 4; i++) rod(g, v3(0.24, top + 0.15, 0.12), v3(0.24 + Math.sin(i * 1.6) * 0.08, top + 0.34, 0.12 + Math.cos(i * 1.6) * 0.06), 0.004, '#8fa88a');
    for (let i = 0; i < 10; i++) part(g, ball(0.012), '#9fb89a', 0.24 + Math.sin(i * 0.9) * 0.05, top + 0.2 + i * 0.013, 0.12 + Math.cos(i * 0.9) * 0.04, { outline: false }).scale.set(1, 0.4, 1);
    // In use: steam off the cups and the pot, the sand running.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const steams = cups.map(() => steamPuffs(use, 3, 0.012));
    const potSteam = steamPuffs(use, 3, 0.015);
    const potAt = marker(g, -0.08, top + 0.2, 0.04);
    out.work = potAt;
    out.spots = { '*': at(spot(g, 'stand', -0.02, 0, 0.5, Math.PI), potAt, 'stir') };
    const spout = v3(0.045, top + 0.15, 0.04);
    out.animate = (t) => {
      steams.forEach((s, i) => s.move(t + i * 0.4, cups[i], UP, 0.12));
      potSteam.move(t, spout, UP, 0.15);
      sand.scale.y = 0.3 + 0.7 * ((t * 0.05) % 1);
    };
  },

  /**
   * The home-care shelf (홈케어 제품 진열장): a tall oak-and-white wall unit under the shop's sign, four
   * lit shelves of its own line — toners, the dropper serums in amber, cream jars, sunscreens, the
   * sheet masks fanned in a stand, gift sets in boxes with ribbons at the bottom, price tags and a
   * 원장 추천 card — and at waist height a tester ledge with a small mirror and cotton. Restocked from a
   * carton on the floor.
   */
  estRetailShelf(g, W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.2;
    const w = W - 0.16;
    part(g, rbox(w, 1.95, 0.36, 0.02), '#fbf8f4', 0, 0.975, z);
    for (const sx of [-1, 1]) part(g, box(0.04, 1.95, 0.37), OAK, sx * (w / 2 - 0.02), 0.975, z, { outline: false });
    part(g, box(w - 0.08, 1.6, 0.01), '#efe6dc', 0, 1.05, z - 0.165, { outline: false });
    label(g, '윤기 스킨 · HOME CARE', 0.9, 0.11, 0, 1.87, z + 0.185, '#7d9c8c', '#ffffff');
    // The cupboard and the gift sets on it.
    part(g, rbox(w - 0.06, 0.38, 0.02, 0.01), '#f3ece4', 0, 0.21, z + 0.18);
    for (const sx of [-1, 1]) part(g, box(0.12, 0.012, 0.02), ROSE_GOLD, sx * 0.25, 0.32, z + 0.195, { outline: false });
    const rnd = seeded(31);
    const shelves = [0.48, 0.9, 1.2, 1.5];
    shelves.forEach((y, s) => {
      glass(g, box(w - 0.1, 0.012, 0.3), 0, y, z);
      glowing(g, box(w - 0.12, 0.006, 0.01), '#fff8e1', 0, y + (s === 0 ? 0.4 : 0.28), z + 0.13);
      const n = 11;
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 0.14 + (i * (w - 0.28)) / (n - 1);
        if (s === 0) {
          // Gift sets.
          if (i % 3 === 2) continue;
          const k = ['#f8bbd0', '#c5e1a5', '#fff3e0'][i % 3];
          part(g, rbox(0.14, 0.12, 0.2, 0.01), k, x + 0.03, y + 0.066, z + 0.02);
          part(g, box(0.02, 0.122, 0.202), '#c62828', x + 0.03, y + 0.066, z + 0.02, { outline: false });
        } else if (s === 1) {
          // Toners and sunscreens.
          if (i % 2) {
            part(g, cyl(0.03, 0.03, 0.18, 12), ['#e1f5fe', '#ffffff', '#fce4ec'][i % 3], x, y + 0.096, z + 0.02);
            part(g, cyl(0.018, 0.018, 0.03, 10), ROSE_GOLD, x, y + 0.2, z + 0.02, { outline: false });
          } else part(g, rbox(0.05, 0.14, 0.03, 0.012), ['#fff59d', '#ffffff'][i % 2], x, y + 0.08, z + 0.03);
        } else if (s === 2) {
          // The dropper serums.
          part(g, cyl(0.02, 0.022, 0.09, 10), '#8d5a2b', x, y + 0.051, z + 0.03);
          part(g, cyl(0.009, 0.014, 0.045, 8), i % 2 ? '#ffffff' : BLACK, x, y + 0.118, z + 0.03, { outline: false });
        } else {
          // Cream jars.
          part(g, cyl(0.035, 0.035, 0.045, 14), ['#ffffff', '#f8bbd0', '#e0f2f1'][i % 3], x, y + 0.03, z + 0.03);
          part(g, cyl(0.037, 0.037, 0.018, 14), ROSE_GOLD, x, y + 0.06, z + 0.03, { outline: false });
        }
        if (s > 0) part(g, box(0.05, 0.02, 0.003), rnd() > 0.85 ? '#e53935' : '#ffffff', x, y - 0.002, z + 0.153, { outline: false });
      }
    });
    // The sheet masks in their stand on the second shelf's end, the director's pick card.
    picture(g, painted('est-sheetmasks', 256, 128, paintSheetMasks), 0.3, 0.15, w / 2 - 0.26, 1.33, z + 0.14);
    label(g, '원장 추천', 0.12, 0.04, -w / 2 + 0.2, 1.24, z + 0.16, '#c62828', '#ffffff');
    // The tester ledge at waist height, with its mirror and cotton.
    part(g, rbox(w - 0.1, 0.03, 0.16, 0.01), '#f4f1ee', 0, 0.72, z + 0.25);
    for (let i = 0; i < 6; i++) part(g, cyl(0.016, 0.018, 0.08, 10), ['#e1f5fe', '#8d5a2b', '#ffffff', '#fff59d', '#f8bbd0', '#8d5a2b'][i], -0.4 + i * 0.12, 0.775, z + 0.26);
    part(g, cyl(0.06, 0.06, 0.012, 16), ROSE_GOLD, 0.42, 0.74, z + 0.25);
    const mir = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), toon('#dbe9ee', '#4c6670'));
    mir.userData.ownGeometry = true;
    mir.position.set(0.42, 0.83, z + 0.25);
    g.add(mir);
    part(g, ring(0.072, 0.008), ROSE_GOLD, 0.42, 0.83, z + 0.25, { outline: false });
    label(g, '테스터', 0.12, 0.035, -0.2, 0.715, z + 0.332, '#7d9c8c', '#ffffff');
    // In use: a carton of stock on the floor in front.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    part(use, rbox(0.36, 0.24, 0.26, 0.01), '#c8a27a', 0.35, 0.12, z + 0.55);
    for (let i = 0; i < 4; i++) part(use, cyl(0.022, 0.024, 0.1, 10), '#8d5a2b', 0.28 + (i % 2) * 0.12, 0.27, z + 0.5 + Math.floor(i / 2) * 0.1);
    const shelf = marker(g, 0.0, 1.22, z + 0.06);
    out.work = shelf;
    out.spots = { '*': at(spot(g, 'stand', 0.0, 0, z + 0.62, Math.PI), shelf, 'rummage') };
  },

  /**
   * The changing corner (탈의 가림막): a three-panel folding screen of oak frames and cream linen set in
   * a zig-zag, a waffle robe over its top and a towel on a hook, and in front a low oak stand with the
   * gowns and towels folded on it, the slippers below in pairs. The gowns are folded and stacked
   * there.
   */
  estChangingScreen(g, _W, D, _c, _def, _ctx, out) {
    const z = -D / 2 + 0.2;
    const ph = 1.65;
    const pw = 0.33;
    const angles = [0.5, -0.5, 0.5];
    let x = -0.45;
    const tops: THREE.Vector3[] = [];
    angles.forEach((a, i) => {
      const panel = new THREE.Group();
      panel.position.set(x, 0, z + (i % 2 ? 0.08 : 0));
      panel.rotation.y = a;
      g.add(panel);
      for (const sx of [0, pw]) part(panel, box(0.03, ph, 0.03), OAK, sx, ph / 2 + 0.03, 0);
      for (const y of [0.1, ph]) part(panel, box(pw, 0.03, 0.03), OAK, pw / 2, y, 0);
      part(panel, box(pw - 0.03, ph - 0.12, 0.008), LINEN, pw / 2, ph / 2 + 0.05, 0, { outline: false });
      for (let k = 0; k < 3; k++) part(panel, box(pw - 0.03, 0.006, 0.01), shade(LINEN, 0.9), pw / 2, 0.45 + k * 0.4, 0, { outline: false });
      const end = v3(x + Math.cos(a) * pw, ph, panel.position.z - Math.sin(a) * pw);
      tops.push(end);
      x = end.x;
    });
    // The robe draped over the middle panel's top, the towel on its hook.
    const rx = (tops[0].x + tops[1].x) / 2 - 0.08;
    part(g, rbox(0.34, 0.05, 0.1, 0.02), '#f8d7df', rx, ph + 0.04, z + 0.06, { ry: -0.5 });
    part(g, rbox(0.3, 0.55, 0.04, 0.02), '#f8d7df', rx, ph - 0.25, z + 0.13, { ry: -0.5 });
    part(g, rbox(0.04, 0.4, 0.04, 0.02), '#f3c4cf', rx - 0.06, ph - 0.25, z + 0.18, { ry: -0.5 });
    part(g, rbox(0.2, 0.3, 0.03, 0.012), TOWEL, tops[2].x - 0.08, ph - 0.3, tops[2].z + 0.05, { ry: 0.5 });
    // The stand of gowns and towels, the slippers.
    const sx = 0.22;
    const sz = z + 0.42;
    for (const dx of [-0.18, 0.18]) for (const dz of [-0.12, 0.12]) part(g, box(0.03, 0.5, 0.03), OAK, sx + dx, 0.25, sz + dz);
    for (const y of [0.15, 0.5]) part(g, rbox(0.42, 0.025, 0.3, 0.01), OAK, sx, y, sz);
    for (let i = 0; i < 3; i++) part(g, rbox(0.3, 0.045, 0.22, 0.015), i === 1 ? '#f8d7df' : TOWEL, sx, 0.535 + i * 0.047, sz);
    for (let i = 0; i < 4; i++) part(g, cyl(0.045, 0.045, 0.16, 12), TOWEL, sx - 0.12 + i * 0.08, 0.21, sz, { rx: Math.PI / 2 });
    for (let i = 0; i < 2; i++)
      for (const s of [-1, 1]) part(g, rbox(0.08, 0.025, 0.2, 0.012), i ? '#f5f5f5' : '#f8d7df', -0.25 + i * 0.22 + s * 0.05, 0.013, z + 0.6);
    const stack = marker(g, sx, 0.66, sz);
    out.work = stack;
    out.spots = { '*': at(spot(g, 'stand', sx, 0, sz + 0.45, Math.PI), stack, 'scrub') };
  },
  // The street front, the front desk and the unit next door (2026-11-05, the layout audit; shopFront.ts, frontDesk.ts).
  estShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 19, door: 12, name: '채윤 스킨케어', sub: '피부관리 · 바디케어', bg: '#efe6dc', fg: '#8d6e63', awning: '#bcaaa4', frame: '#a1887f', posters: [['첫 방문 피부 진단', '#ffffff', '#8d6e63', 5.5], ['회원권 상담', '#fce4ec', '#ad1457', 15.5]], solid: [[17, 18]] });
  },
  estReception(g, W, D) {
    frontDesk(g, W, D, { name: '채윤 스킨케어', body: '#f3ece4', top: '#bcaaa4', fg: '#8d6e63', bg: '#f3ece4', flowers: '#f8bbd0' });
  },
  estNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '늘봄 약국', color: '#2e7d32', wall: '#e3ebe6' });
  },
};
