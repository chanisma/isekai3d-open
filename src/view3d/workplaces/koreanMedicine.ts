import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, caster, glass, glowing, label, litScreen, painted, picture, ring, text, type Paint } from './doctor';
import * as KM from './koreanMedicineMotion';
import { pavementSign } from './dentist';

/**
 * The 한의원 drawn as itself (2026-10-27 workplace pipeline, at the user's request): warm walnut,
 * hanji and brass. The treatment bed (침 치료 베드) with its face cradle, paper sheet and 온열 dial,
 * a patient lying face down in a gown open at the back — needles in, cups on, or resting — the needle
 * tray beside them; the 약장, a wall of little drawers each labelled in hanji with its herb (당귀
 * 當歸, 천궁 川芎…) over a worktop with five 약포지 papers and the scale; the pressure 탕전기 with its
 * wheeled lid, gauge, sight glass and panel, the herb bag and the measuring jug beside it; the pulse
 * desk with its 맥침 pillow, a patient on a stool at its end, the chart and the 사상체질 card. And
 * what it was missing (workFurniture/koreanMedicine.ts): the infrared lamp on its long arm over a
 * bed, the cupping and 뜸 cart with its UV sterilizer, the pouch packer, the 약연 · 작두 corner on a
 * low 평상, the 동의보감 bookcase with the acupuncture figure, and the 대추차 table for the waiting
 * room.
 *
 * The clinic (백초한의원) and everyone in it are made up. The doctor's hands and what's on the pieces
 * go by one clock (koreanMedicineMotion.ts): a needle shows as the guide tube lifts off, a drawer
 * slides as it's pulled, the scale reads what was scooped. Moving parts are drawn twice — at rest in
 * `idle` and moving in `inUse` — so nothing's left half-open when the work stops.
 */

const CLINIC = '백초한의원';
const WALNUT = '#5d4037';
const WALNUT_D = '#3e2723';
const WOOD = '#8d6e63';
const OAK = '#c49a6c';
const HANJI = '#f1e6c8';
const PAPER = '#fbf7ec';
const BRASS = '#c9a43a';
const LEATHER = '#b98a5e';
const TOWEL = '#f7f1e8';
const SKIN = '#ecc6a3';
const DECOCTION = '#4a2c17';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vp = (p: KM.P, dy = 0) => new THREE.Vector3(p[0], p[1] + dy, p[2]);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
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
/** A spot from the motions' table, and what's done there; `work` is the piece's clock mark (or where the hands go). */
function spotAt(g: THREE.Object3D, s: KM.SpotAt, how: 'sit' | 'stand', motion: Motion, work?: THREE.Object3D, cross = false): Spot {
  const p = spot(g, how, s.x, s.y, s.z, s.yaw, how === 'sit' ? s.y : undefined);
  p.work = work;
  p.motion = motion;
  if (cross) p.legs = 'cross';
  return p;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Which of a piece's uses is going on now (the spot a dweller's been posed at just now, the latest). */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const tmp = new THREE.Vector3();
const phaseOf = (m: THREE.Object3D) => KM.kmPhase(m.getWorldPosition(tmp));
/** A cylinder stretched between two points each frame (an arm, a leg, a stream). */
function limb(g: THREE.Object3D, r: number, color: string, material?: THREE.Material): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false, ...(material ? { material } : {}) });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** A sheet lying flat on a top, readable from +z (turned `ry` about the vertical). */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A lit part with a material of its own (it's shown and hidden, or recoloured). */
function ownGlow(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const STEAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.42, depthWrite: false });
const SMOKE = new THREE.MeshBasicMaterial({ color: '#d7d2cc', transparent: true, opacity: 0.5, depthWrite: false });
const WARM = new THREE.MeshBasicMaterial({ color: '#ff6e40', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
const CLEAR = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.45, depthWrite: false });
const BROTH = new THREE.MeshBasicMaterial({ color: '#6d3d1c', transparent: true, opacity: 0.85 });
const WATERY = new THREE.MeshBasicMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.65, depthWrite: false });
const UV = new THREE.MeshBasicMaterial({ color: '#b388ff', transparent: true, opacity: 0.55, depthWrite: false });
/** A brass corner plate (장석). */
const plate = (g: THREE.Object3D, x: number, y: number, z: number, s = 0.05) => part(g, box(s, s, 0.006), BRASS, x, y, z, { outline: false });
/** Puffs rising off a point, `n` of them, `k` how strong (0 none), drifting up over `rise`. */
function puffs(g: THREE.Object3D, n: number, mat: THREE.Material, size: number): (at: KM.P, t: number, k: number, rise?: number) => void {
  const bs = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(ball(size), mat);
    g.add(m);
    return m;
  });
  return (at, t, k, rise = 0.3) => {
    bs.forEach((m, i) => {
      const u = (t * 0.6 + i / n) % 1;
      m.visible = k > 0.02;
      m.position.set(at[0] + 0.03 * Math.sin(u * 7 + i), at[1] + u * rise, at[2] + 0.02 * Math.cos(u * 5 + i));
      const s = (0.5 + u * 1.5) * Math.min(1, k * 1.5) * (1 - u * 0.5);
      m.scale.setScalar(Math.max(0.001, s));
    });
  };
}

// ---------------------------------------------------------------------------------------------
// People drawn in: the patients (face down on a bed, sat at the desk).

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'perm' | 'short' | 'grey' | 'bob';
  skin?: string;
  shoes?: string;
  glasses?: boolean;
  /** A treatment gown open at the back (the needles and cups go there). */
  openBack?: boolean;
  cardigan?: string;
}
const LOOKS = {
  kim: { top: '#cfe3d8', bottom: '#7d8f86', hair: '#4a4a4a', hairdo: 'short', openBack: true, shoes: SKIN } as Look,
  lee: { top: '#f0d9e0', bottom: '#8d7b83', hair: '#3b2a20', hairdo: 'perm', openBack: true, shoes: SKIN, skin: '#f1cfb0' } as Look,
  park: { top: '#cfe3d8', bottom: '#6d7f8d', hair: '#1a1a1a', hairdo: 'short', openBack: true, shoes: SKIN, skin: '#e6bd96' } as Look,
  granny: { top: '#efe6f6', bottom: '#6d5e7a', hair: '#bdb8b2', hairdo: 'perm', cardigan: '#9575cd', glasses: true, shoes: '#6d4c41' } as Look,
  office: { top: '#e3edf5', bottom: '#37474f', hair: '#222222', hairdo: 'short', glasses: true, shoes: '#3e2723', skin: '#f1cfb0' } as Look,
  student: { top: '#ffcc80', bottom: '#455a64', hair: '#2b1b10', hairdo: 'bob', shoes: '#eceff1' } as Look,
};

interface Fig {
  root: THREE.Group;
  upper: THREE.Group;
  head: THREE.Group;
  /** Sat (1) or stood/lying straight (0), on a seat this high, leant forward. */
  pose(sit: number, seat?: number, lean?: number): void;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  mouth(open: number): void;
  eyes(shut: boolean): void;
  tongue(out: number): void;
}
/**
 * Someone drawn in, built stood with the feet at the origin facing +z (turn and move `root`). The
 * arms and legs are worked out each pose, so they sit, lie, lay a wrist on the pillow.
 */
function figure(parent: THREE.Object3D, look: Look): Fig {
  const root = group(parent);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#8d6e63';
  const sleeve = look.cardigan ?? look.top;
  const legs = [1, -1].map((sx) => ({ sx, thigh: limb(root, 0.062, look.bottom), shin: limb(root, 0.052, look.bottom), shoe: part(root, rbox(0.095, 0.07, 0.21, 0.03), shoes, 0, 0, 0) }));
  const pelvis = part(root, rbox(0.31, 0.16, 0.24, 0.06), look.bottom, 0, 0.85, 0);
  const upper = group(root, 0, 0.84, 0);
  part(upper, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 0.27, 0);
  if (look.openBack) {
    // The gown's back open from the shoulder blades to the waist, its ties hanging.
    part(upper, rbox(0.19, 0.4, 0.02, 0.008), skin, 0, 0.28, -0.098, { outline: false });
    for (const y of [0.14, 0.3]) for (const sx of [-1, 1]) part(upper, box(0.05, 0.008, 0.004), look.top, sx * 0.11, y, -0.108, { outline: false });
  }
  if (look.cardigan) {
    for (const sx of [-1, 1]) part(upper, rbox(0.13, 0.44, 0.226, 0.05), look.cardigan, sx * 0.11, 0.26, 0);
    for (let i = 0; i < 4; i++) part(upper, ball(0.011), '#f5f0e6', 0.05, 0.4 - i * 0.09, 0.114, { outline: false });
  }
  part(upper, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.53, 0, { outline: false });
  const head = group(upper, 0, 0.67, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  const eyesM = [1, -1].map((sx) => part(head, box(0.022, 0.016, 0.006), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false }));
  for (const sx of [-1, 1]) part(head, ball(0.018), '#f2a7a0', sx * 0.065, -0.03, 0.088, { outline: false }).scale.set(1, 0.6, 0.4);
  const mouthM = part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
  const tongueM = part(head, rbox(0.03, 0.01, 0.04, 0.005), '#e57373', 0, -0.058, 0.1, { outline: false, rx: 0.3 });
  tongueM.visible = false;
  switch (look.hairdo) {
    case 'perm':
      part(head, ball(0.118), look.hair, 0, 0.035, -0.025);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        part(head, ball(0.045), look.hair, Math.cos(a) * 0.08, 0.08 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.07, { outline: false });
      }
      part(head, ball(0.05), look.hair, 0, 0.12, -0.01, { outline: false });
      break;
    case 'grey':
      part(head, ball(0.117), look.hair, 0, 0.02, -0.035);
      part(head, ball(0.1), skin, 0, 0.05, 0.022, { outline: false });
      break;
    case 'bob':
      part(head, ball(0.121), look.hair, 0, 0.02, -0.025);
      part(head, rbox(0.25, 0.14, 0.18, 0.06), look.hair, 0, -0.04, -0.03);
      part(head, rbox(0.21, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#5d4037', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#5d4037', 0, 0.002, 0.112, { outline: false });
  }
  let sitNow = 0;
  const m4 = new THREE.Matrix4();
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 0.47, 0);
    const upperArm = limb(upper, 0.042, sleeve);
    const fore = limb(upper, 0.035, look.openBack ? look.top : sleeve);
    const hand = part(upper, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) {
        root.updateMatrix();
        upper.updateMatrix();
        m4.multiplyMatrices(root.matrix, upper.matrix).invert();
        loc.copy(to).applyMatrix4(m4);
      } else loc.set(sx * mix(0.23, 0.11, sitNow), mix(-0.02, 0.09, sitNow), mix(0.05, 0.27, sitNow));
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
      upperArm(shoulder, elbow);
      fore(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  const hip = new THREE.Vector3();
  const knee = new THREE.Vector3();
  const ankle = new THREE.Vector3();
  const pose = (sit: number, seat = 0.46, lean = 0) => {
    sitNow = sit;
    const hipY = mix(0.84, seat + 0.07, sit);
    const hz = mix(0, -0.03, sit);
    pelvis.position.set(0, hipY + 0.01, hz);
    upper.position.set(0, hipY, hz);
    upper.rotation.x = lean;
    for (const L of legs) {
      hip.set(L.sx * 0.09, hipY, hz);
      knee.set(L.sx * 0.09, 0.47, 0.03).lerp(v3(L.sx * 0.1, seat + 0.06, 0.36), sit);
      ankle.set(L.sx * 0.09, 0.08, 0.01).lerp(v3(L.sx * 0.1, Math.max(0.07, seat + 0.06 - 0.4), 0.4), sit);
      L.thigh(hip, knee);
      L.shin(knee, ankle);
      L.shoe.position.set(ankle.x, ankle.y - 0.035, ankle.z + 0.05);
    }
  };
  pose(0);
  armL(null);
  armR(null);
  return {
    root,
    upper,
    head,
    pose,
    armL,
    armR,
    mouth: (open) => mouthM.scale.set(1 - 0.3 * open, 1 + 3.2 * open, 1),
    eyes: (shut) => eyesM.forEach((e) => e.scale.set(1, shut ? 0.22 : 1, 1)),
    tongue: (out) => {
      tongueM.visible = out > 0.15;
      tongueM.position.z = 0.09 + 0.03 * out;
      mouthM.scale.set(1, 1 + 2.5 * out, 1);
    },
  };
}
/** A patient lying face down on a bed (its mattress top `top`), the hands along their sides. */
function lyingDown(parent: THREE.Object3D, look: Look): Fig {
  const f = figure(parent, look);
  f.root.rotation.order = 'YXZ';
  f.root.rotation.set(Math.PI / 2, Math.PI, 0);
  f.root.position.set(0, KM.BED.top + KM.BED.up, KM.BED.feet);
  f.pose(0);
  f.armL(v3(-0.235, KM.BED.top + 0.07, -0.04));
  f.armR(v3(0.235, KM.BED.top + 0.07, -0.04));
  // Face down in the cradle, eyes shut.
  f.eyes(true);
  return f;
}
/** A seated patient at (x, z) turned `ry` on a seat this high, hands in the lap. */
function seated(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat: number): Fig {
  const f = figure(parent, look);
  f.root.position.set(x, 0, z);
  f.root.rotation.y = ry;
  f.pose(1, seat);
  f.armL(null);
  f.armR(null);
  return f;
}

// ---------------------------------------------------------------------------------------------
// The tools: a needle, a guide tube, a cup, the pump gun, a 뜸 cone.

/** A fine needle standing in the skin: the shaft and the coiled handle (its foot at the origin). */
function needle(parent: THREE.Object3D): THREE.Group {
  const n = group(parent);
  part(n, cyl(0.0018, 0.0018, 0.032, 5), '#e0e4e8', 0, 0.016, 0, { outline: false, shadow: false });
  part(n, cyl(0.0048, 0.0048, 0.024, 6), '#d4a84a', 0, 0.044, 0, { outline: false, shadow: false });
  part(n, ball(0.0052), '#d4a84a', 0, 0.057, 0, { outline: false, shadow: false });
  return n;
}
/** A cupping cup on the skin (its rim at the origin), the skin drawn up into it, its blue valve. */
function cup(parent: THREE.Object3D, r = 0.034): { g: THREE.Group; dome: THREE.Mesh } {
  const g = group(parent);
  const body = new THREE.Mesh(cyl(r * 0.85, r, 0.06, 14), CLEAR);
  body.position.y = 0.03;
  body.renderOrder = 2;
  g.add(body);
  part(g, ring(r, 0.003), '#b3cde0', 0, 0.002, 0, { rx: Math.PI / 2, outline: false });
  part(g, cyl(r * 0.85, r * 0.85, 0.006, 14), '#cfe3f0', 0, 0.062, 0, { outline: false });
  part(g, cyl(0.007, 0.007, 0.018, 8), '#1e88e5', 0, 0.074, 0, { outline: false });
  part(g, cyl(0.011, 0.011, 0.006, 10), '#1565c0', 0, 0.085, 0, { outline: false });
  const dome = part(g, ball(r * 0.8), '#efb7a6', 0, 0, 0, { outline: false });
  dome.scale.set(1, 0.01, 1);
  return { g, dome };
}
/** The cupping pump gun (its nozzle at the origin, pointing down). */
function pumpGun(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  part(g, cyl(0.012, 0.009, 0.05, 10), '#263238', 0, 0.025, 0, { outline: false });
  part(g, rbox(0.03, 0.04, 0.1, 0.012), '#1565c0', 0, 0.06, -0.03);
  part(g, rbox(0.024, 0.1, 0.03, 0.01), '#0d47a1', 0, 0.02, -0.07, { rx: 0.3 });
  part(g, rbox(0.012, 0.07, 0.016, 0.005), '#90a4ae', 0, 0.02, -0.035, { rx: 0.2, outline: false });
  return g;
}
/** A 뜸 cone on its paper base (its foot at the origin); `tip` glows once it's lit. */
function moxaCone(parent: THREE.Object3D): { g: THREE.Group; tip: THREE.Mesh } {
  const g = group(parent);
  part(g, cyl(0.022, 0.022, 0.004, 12), '#f5efe0', 0, 0.002, 0, { outline: false });
  part(g, cyl(0.004, 0.016, 0.03, 10), '#8d7b5a', 0, 0.019, 0, { outline: false });
  const tip = glowing(g, ball(0.007), '#ff7043', 0, 0.035, 0);
  return { g, tip };
}

// ---------------------------------------------------------------------------------------------
// What's painted on the drawers, the papers and the screens.

const FILL = (c: CanvasRenderingContext2D, w: number, h: number, bg: string) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
};
/** The 약장's herbs, row by row from the top left (the hanja under each name). */
const HERB_NAMES: Array<[string, string]> = [
  ['당귀', '當歸'], ['천궁', '川芎'], ['감초', '甘草'], ['황기', '黃芪'], ['인삼', '人蔘'], ['백출', '白朮'], ['복령', '茯苓'], ['숙지황', '熟地黃'], ['작약', '芍藥'], ['계지', '桂枝'], ['생강', '生薑'], ['대추', '大棗'],
  ['진피', '陳皮'], ['반하', '半夏'], ['맥문동', '麥門冬'], ['오미자', '五味子'], ['산약', '山藥'], ['구기자', '枸杞子'], ['갈근', '葛根'], ['마황', '麻黃'], ['시호', '柴胡'], ['황금', '黃芩'], ['길경', '桔梗'], ['행인', '杏仁'],
  ['두충', '杜仲'], ['우슬', '牛膝'], ['독활', '獨活'], ['강활', '羌活'], ['방풍', '防風'], ['형개', '荊芥'], ['박하', '薄荷'], ['산사', '山楂'], ['신곡', '神麯'], ['맥아', '麥芽'], ['향부자', '香附子'], ['목향', '木香'],
  ['사인', '砂仁'], ['육계', '肉桂'], ['택사', '澤瀉'], ['목단피', '牧丹皮'], ['산수유', '山茱萸'], ['지모', '知母'], ['황백', '黃柏'], ['치자', '梔子'], ['연교', '連翹'], ['금은화', '金銀花'], ['창출', '蒼朮'], ['후박', '厚朴'],
  ['지실', '枳實'], ['원지', '遠志'], ['산조인', '酸棗仁'], ['용안육', '龍眼肉'], ['백지', '白芷'], ['세신', '細辛'], ['천마', '天麻'], ['하수오', '何首烏'], ['녹용', '鹿茸'], ['홍화', '紅花'], ['도인', '桃仁'], ['익모초', '益母草'],
  ['애엽', '艾葉'], ['결명자', '決明子'], ['의이인', '薏苡仁'], ['차전자', '車前子'], ['패모', '貝母'], ['오약', '烏藥'], ['소엽', '蘇葉'], ['곽향', '藿香'], ['저령', '豬苓'], ['황련', '黃連'], ['대황', '大黃'], ['목통', '木通'],
  ['상백피', '桑白皮'], ['전호', '前胡'], ['천문동', '天門冬'], ['생지황', '生地黃'], ['현삼', '玄蔘'], ['단삼', '丹蔘'], ['울금', '鬱金'], ['강황', '薑黃'], ['오수유', '吳茱萸'], ['소회향', '小茴香'], ['정향', '丁香'], ['비파엽', '枇杷葉'],
];
/** The herbs in the drawers that are opened (the prescription's three, the one that's learnt). */
const PRESCRIBED: Array<[string, string]> = [['당귀', '當歸'], ['천궁', '川芎'], ['감초', '甘草']];
const LEARNT: [string, string] = ['황기', '黃芪'];
/** Each herb's colour in the drawer and on the papers. */
const HERB_COLOR = ['#c99e6a', '#8a6d4b', '#e6c860'];
const LEARN_COLOR = '#e3cf98';
/** The drawer at column `c`, row `r` (from the bottom) and its herb. */
function herbAt(c: number, r: number): [string, string] {
  const i = KM.HERB_DRAWERS.findIndex(([hc, hr]) => hc === c && hr === r);
  if (i >= 0) return PRESCRIBED[i];
  if (c === KM.LEARN_DRAWER[0] && r === KM.LEARN_DRAWER[1]) return LEARNT;
  const k = (KM.CAB.rows - 1 - r) * KM.CAB.cols + c;
  const n = HERB_NAMES[k % HERB_NAMES.length];
  // The three and the learnt one are in their own drawers; elsewhere a neighbour's herb stands in.
  return PRESCRIBED.some((p) => p[0] === n[0]) || n[0] === LEARNT[0] ? HERB_NAMES[(k + 40) % HERB_NAMES.length] : n;
}
/** One drawer's front: the wood, the hanji label with the herb's name and hanja, the brass ring. */
function drawCell(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, name: [string, string], tone: number) {
  const g = Math.round(96 + tone * 18);
  c.fillStyle = `rgb(${g + 18},${Math.round(g * 0.68)},${Math.round(g * 0.48)})`;
  c.fillRect(x + 3, y + 3, w - 6, h - 6);
  c.strokeStyle = 'rgba(40,20,10,0.55)';
  c.lineWidth = 3;
  c.strokeRect(x + 3, y + 3, w - 6, h - 6);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fillRect(x + 5, y + 5, w - 10, 4);
  // The label.
  const lw = w * 0.74;
  const lh = h * 0.46;
  const lx = x + (w - lw) / 2;
  const ly = y + h * 0.12;
  c.fillStyle = '#f1e6c8';
  c.fillRect(lx, ly, lw, lh);
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 1.5;
  c.strokeRect(lx, ly, lw, lh);
  text(c, name[0], x + w / 2, ly + lh * 0.38, name[0].length > 2 ? 21 : 25, '#3e2723', 'center');
  text(c, name[1], x + w / 2, ly + lh * 0.8, 13, '#8d2e2e', 'center', false);
  // The ring pull on its brass plate.
  const cx = x + w / 2;
  const cy = y + h * 0.78;
  c.fillStyle = '#c9a43a';
  c.beginPath();
  c.arc(cx, cy - 4, 7, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#a0812a';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(cx, cy + 4, 9, 0, Math.PI);
  c.stroke();
}
/** The 약장's wall of small drawers (the opened ones left dark: their drawers are real). */
const drawerFace = () =>
  painted('kmDrawerFace', 1536, 720, (c) => {
    FILL(c, 1536, 720, '#3e2723');
    const C = KM.CAB;
    const cw = 1536 / C.cols;
    const ch = 720 / C.rows;
    const open = [...KM.HERB_DRAWERS, KM.LEARN_DRAWER];
    for (let r = 0; r < C.rows; r++)
      for (let col = 0; col < C.cols; col++) {
        const x = col * cw;
        const y = (C.rows - 1 - r) * ch;
        if (open.some(([oc, or]) => oc === col && or === r)) {
          c.fillStyle = '#1b0f0a';
          c.fillRect(x + 3, y + 3, cw - 6, ch - 6);
          continue;
        }
        drawCell(c, x, y, cw, ch, herbAt(col, r), ((col * 7 + r * 3) % 5) / 4);
      }
  });
/** The base's bigger drawers (the bulk herbs), three rows of six. */
const baseFace = () =>
  painted('kmBaseFace', 1200, 480, (c) => {
    FILL(c, 1200, 480, '#3e2723');
    const names: Array<[string, string]> = [['감초', '甘草'], ['대추', '大棗'], ['생강', '生薑'], ['황기', '黃芪'], ['당귀', '當歸'], ['갈근', '葛根'], ['백출', '白朮'], ['복령', '茯苓'], ['진피', '陳皮'], ['산약', '山藥'], ['의이인', '薏苡仁'], ['결명자', '決明子'], ['애엽', '艾葉'], ['구기자', '枸杞子'], ['오미자', '五味子'], ['맥문동', '麥門冬'], ['계피', '桂皮'], ['산사', '山楂']];
    for (let r = 0; r < 3; r++) for (let col = 0; col < 6; col++) drawCell(c, col * 200, r * 160, 200, 160, names[r * 6 + col], ((col * 5 + r * 2) % 4) / 3);
  });
const paintSlip: Paint = (c) => {
  FILL(c, 256, 192, '#fffdf6');
  c.strokeStyle = '#c62828';
  c.lineWidth = 3;
  c.strokeRect(6, 6, 244, 180);
  text(c, '처 방 전', 128, 26, 22, '#c62828', 'center');
  text(c, '김OO 님 · 5첩', 128, 54, 15, '#37474f', 'center', false);
  const rows = ['당귀 當歸 …… 8g', '천궁 川芎 …… 6g', '감초 甘草 …… 4g'];
  rows.forEach((s, i) => text(c, s, 24, 86 + i * 28, 17, '#3e2723'));
  text(c, CLINIC, 236, 172, 13, '#8d6e63', 'right', false);
  c.strokeStyle = '#c62828';
  c.beginPath();
  c.arc(212, 150, 14, 0, Math.PI * 2);
  c.stroke();
};
const scaleTex = (g: number) =>
  painted(`kmScale|${g.toFixed(1)}`, 128, 48, (c) => {
    FILL(c, 128, 48, '#a5d6a7');
    text(c, `${g.toFixed(1)} g`, 118, 26, 30, '#1b3a1d', 'right');
  });
const paintDecPanel: Paint = (c) => {
  FILL(c, 256, 128, '#102027');
  text(c, '탕전 중', 14, 24, 22, '#ffb74d');
  text(c, '100℃', 242, 24, 22, '#ff8a65', 'right');
  text(c, '남은 시간 01:58', 14, 62, 20, '#e0f7fa');
  text(c, '압력 0.8 bar · 120cc × 45포', 14, 98, 15, '#80deea', 'left', false);
};
const paintPackPanel: Paint = (c) => {
  FILL(c, 256, 128, '#0d2a1a');
  text(c, '자동 포장', 14, 24, 20, '#a5d6a7');
  text(c, '120 cc', 242, 24, 20, '#fff59d', 'right');
  text(c, '12 / 45 포', 14, 66, 28, '#e8f5e9');
  text(c, '실링 온도 180℃', 14, 104, 15, '#81c784', 'left', false);
};
const paintPouch: Paint = (c) => {
  FILL(c, 96, 128, '#c8b28a');
  c.fillStyle = '#fffaf0';
  c.fillRect(10, 36, 76, 60);
  text(c, '백초', 48, 54, 18, '#5d4037', 'center');
  text(c, '한의원', 48, 76, 15, '#5d4037', 'center');
  text(c, '1일 3회', 48, 110, 13, '#3e2723', 'center', false);
};
const paintChart: Paint = (c) => {
  FILL(c, 256, 320, '#fffdf6');
  text(c, '진 료 기 록', 128, 26, 22, '#3e2723', 'center');
  c.fillStyle = '#8d6e63';
  c.fillRect(16, 44, 224, 2);
  const rows: Array<[string, string]> = [['주소증', '피로 · 소화불량'], ['맥진', '침세 沈細'], ['설진', '담홍 박백태'], ['복진', '심하비'], ['체질', '소음인'], ['처방', '보중익기탕 가감']];
  rows.forEach(([k, v], i) => {
    text(c, k, 20, 74 + i * 38, 17, '#8d2e2e');
    text(c, v, 100, 74 + i * 38, 17, '#37474f', 'left', false);
  });
};
const paintEmr: Paint = (c) => {
  FILL(c, 320, 200, '#f5f1e8');
  c.fillStyle = '#6d4c41';
  c.fillRect(0, 0, 320, 30);
  text(c, `${CLINIC} 진료 차트`, 12, 16, 16, '#fff8e1');
  text(c, '김OO (54) 남', 12, 50, 16, '#3e2723');
  text(c, '맥: 침세 · 설: 담홍', 12, 78, 15, '#37474f', 'left', false);
  text(c, '침: 신수 · 대장수 · 위중', 12, 104, 15, '#37474f', 'left', false);
  text(c, '부항 6 · 적외선 15분', 12, 130, 15, '#37474f', 'left', false);
  c.fillStyle = '#a1887f';
  c.fillRect(12, 156, 130, 28);
  text(c, '처방 입력', 77, 170, 15, '#ffffff', 'center');
};
const paintSasang: Paint = (c) => {
  FILL(c, 256, 256, '#fff8e7');
  text(c, '사상체질', 128, 24, 22, '#5d4037', 'center');
  const q: Array<[string, string, number, number]> = [['태양인', '#ef9a9a', 16, 48], ['소양인', '#ffcc80', 132, 48], ['태음인', '#a5d6a7', 16, 150], ['소음인', '#90caf9', 132, 150]];
  for (const [s, col, x, y] of q) {
    c.fillStyle = col;
    c.fillRect(x, y, 108, 92);
    text(c, s, x + 54, y + 46, 22, '#3e2723', 'center');
  }
};
const paintSheet: Paint = (c) => {
  FILL(c, 256, 320, '#ffffff');
  text(c, '생활 습관 안내', 128, 26, 20, '#3e2723', 'center');
  c.strokeStyle = '#6d4c41';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(128, 120, 56, 0, Math.PI * 2);
  c.moveTo(72, 120);
  c.lineTo(184, 120);
  c.moveTo(128, 64);
  c.lineTo(128, 176);
  c.stroke();
  text(c, '따뜻한 음식 ○', 24, 222, 17, '#2e7d32');
  text(c, '찬 음료 ×', 24, 252, 17, '#c62828');
  text(c, '저녁 산책 30분', 24, 282, 17, '#37474f', 'left', false);
};
const paintLeaflet: Paint = (c) => {
  FILL(c, 128, 176, '#fffaf0');
  c.fillStyle = '#558b2f';
  c.fillRect(0, 0, 128, 34);
  text(c, '소음인 식단', 64, 18, 16, '#ffffff', 'center');
  ['찹쌀 · 닭고기', '생강차 · 대추차', '찬 음식 피하기'].forEach((s, i) => text(c, s, 10, 60 + i * 34, 13, '#37474f', 'left', false));
};
const paintTeaSign: Paint = (c) => {
  FILL(c, 256, 128, '#fff8e1');
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 4;
  c.strokeRect(6, 6, 244, 116);
  text(c, '따뜻한 대추차', 128, 44, 26, '#8d2e2e', 'center');
  text(c, '드시면서 기다려 주세요', 128, 86, 18, '#5d4037', 'center', false);
};
const paintChartPoster: Paint = (c) => {
  FILL(c, 160, 320, '#fbf3df');
  text(c, '經穴圖', 80, 22, 20, '#5d4037', 'center');
  c.fillStyle = '#e8cfb0';
  c.beginPath();
  c.arc(80, 70, 22, 0, Math.PI * 2);
  c.fill();
  c.fillRect(56, 92, 48, 100);
  c.fillRect(34, 96, 18, 90);
  c.fillRect(108, 96, 18, 90);
  c.fillRect(58, 192, 18, 100);
  c.fillRect(84, 192, 18, 100);
  c.strokeStyle = '#c62828';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(80, 50);
  c.lineTo(80, 290);
  c.moveTo(66, 100);
  c.lineTo(66, 290);
  c.moveTo(94, 100);
  c.lineTo(94, 290);
  c.stroke();
  c.fillStyle = '#1a237e';
  for (let i = 0; i < 14; i++) {
    c.beginPath();
    c.arc(i % 2 ? 66 : 94, 108 + i * 13, 2.5, 0, Math.PI * 2);
    c.fill();
  }
};

// ---------------------------------------------------------------------------------------------

let bedCount = 0;
let lampCount = 0;
let deskCount = 0;
let decCount = 0;
const BED_FOLK: Array<{ look: Look; idle: 'needles' | 'cups' | 'empty'; heat: string }> = [
  { look: LOOKS.kim, idle: 'needles', heat: '#ffb74d' },
  { look: LOOKS.lee, idle: 'cups', heat: '#ffb74d' },
  { look: LOOKS.park, idle: 'empty', heat: '#5d4037' },
];

export const BUILDERS: Record<string, Builder> = {
  // The clinic's pole sign on the pavement (2026-11-05, the layout audit).
  kmStreetSign: pavementSign('kmStreetSign', '🌿', '백초|한의원', ['침 · 뜸 · 부항', '한약 처방 · 원내 탕전', '진료 9:30 ~ 19:00'], '#6d4c41'),
  /**
   * The treatment bed (침 치료 베드): a walnut frame with an open shelf under it (a rattan basket for
   * the patient's things, a folded blanket), a padded leatherette top with a face cradle at the head,
   * a paper sheet run down it off the roll at the foot, a bolster under the ankles, the 온열 dial
   * with its orange light on the side, slippers left on the floor. Its patient, at rest: lying with
   * needles in under the infrared lamp, or with cups on, or the bed made up and empty.
   *
   * Acupuncture: stood at the side by their middle, the points felt for down the spine, swabbed,
   * six needles tapped in through the guide tube, one turned, two behind the knees, a word at the
   * shoulder, left a while, taken out one by one with cotton. Cupping: six cups set on and pumped,
   * waited on, let go, the back wiped. An acute back pain: the low back pressed (the patient's hand
   * goes to it), four needles in, three 뜸 cones set and lit (smoke rising), a calming hand.
   */
  acupunctureBed(g, _W, _D, _c, _def, _ctx, out) {
    const n = bedCount++;
    const folk = BED_FOLK[n % BED_FOLK.length];
    const B = KM.BED;
    const T = B.top;
    // The frame: legs, aprons, the shelf underneath and what's on it.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.07, T - 0.08, 0.07, 0.015), WALNUT, sx * 0.31, (T - 0.08) / 2, sz * 0.86);
    for (const sx of [-1, 1]) part(g, rbox(0.04, 0.14, 1.78, 0.012), WALNUT_D, sx * 0.33, T - 0.15, 0);
    for (const sz of [-1, 1]) part(g, rbox(0.66, 0.14, 0.04, 0.012), WALNUT_D, 0, T - 0.15, sz * 0.89);
    part(g, box(0.6, 0.02, 1.68), WALNUT, 0, 0.16, 0);
    // A rattan basket for the patient's things, a folded blanket.
    const basket = group(g, 0.05, 0.17, -0.35);
    part(basket, rbox(0.4, 0.14, 0.3, 0.03), '#c8a165', 0, 0.07, 0);
    for (let i = 0; i < 4; i++) part(basket, box(0.402, 0.008, 0.302), '#a07c45', 0, 0.025 + i * 0.03, 0, { outline: false });
    part(basket, rbox(0.3, 0.06, 0.2, 0.02), '#5c6bc0', 0.02, 0.15, 0.0);
    part(g, rbox(0.42, 0.1, 0.34, 0.03), '#e6d6c3', 0.0, 0.22, 0.4);
    part(g, box(0.43, 0.006, 0.35), '#d4bfa5', 0.0, 0.25, 0.4, { outline: false });
    // The padded top: the main pad, the face cradle round its hole at the head.
    part(g, rbox(B.w, 0.1, 1.55, 0.04), LEATHER, 0, T - 0.05, 0.175);
    for (const sx of [-1, 1]) part(g, rbox(0.27, 0.1, 0.35, 0.04), LEATHER, sx * 0.225, T - 0.05, -0.775);
    part(g, rbox(0.2, 0.1, 0.12, 0.03), LEATHER, 0, T - 0.05, -0.89);
    part(g, box(0.18, 0.02, 0.23), '#2b1d16', 0, T - 0.09, -0.715, { outline: false });
    // The paper sheet, off its roll at the foot.
    part(g, box(0.52, 0.004, 1.5), PAPER, 0, T + 0.002, 0.2, { outline: false });
    part(g, box(0.17, 0.004, 0.26), PAPER, 0, T + 0.002, -0.89, { outline: false });
    part(g, cyl(0.04, 0.04, 0.56, 14), PAPER, 0, T - 0.06, 0.95, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, box(0.02, 0.08, 0.06), STEEL, sx * 0.29, T - 0.07, 0.93, { outline: false });
    // The ankle bolster.
    part(g, cyl(0.045, 0.045, 0.5, 14), '#8d5a3b', 0, T + 0.045, 0.78, { rz: Math.PI / 2 });
    // The 온열 dial and its light on the room side.
    part(g, rbox(0.03, 0.08, 0.14, 0.01), '#efebe9', 0.36, T - 0.15, 0.55);
    part(g, cyl(0.022, 0.022, 0.015, 12), '#424242', 0.378, T - 0.15, 0.58, { rz: Math.PI / 2 });
    glowing(g, ball(0.008), folk.heat, 0.38, T - 0.13, 0.51);
    label(g, '온열', 0.06, 0.025, 0.377, T - 0.11, 0.55, '#efebe9', '#bf360c', Math.PI / 2);
    label(g, `${n % 3 + 1}번 베드`, 0.2, 0.05, 0, T - 0.15, 0.913, '#efe3c4', '#4e342e');
    // Slippers left by the bed.
    for (const dx of [-0.06, 0.06]) part(g, rbox(0.09, 0.03, 0.22, 0.03), '#d7b98e', 0.5 + dx, 0.015, 0.68);

    // ---- At rest: the patient as they lie waiting or being treated (not while it's used).
    const idle = group(g);
    out.idle = idle;
    /** A towel over the hips and thighs, hanging down either side. */
    const towel = (parent: THREE.Object3D) => {
      part(parent, rbox(0.46, 0.03, 0.32, 0.012), TOWEL, 0, T + 0.228, 0.15, { rx: 0.146 });
      for (const sx of [-1, 1]) part(parent, box(0.012, 0.13, 0.3), TOWEL, sx * 0.24, T + 0.15, 0.15, { outline: false });
      part(parent, box(0.462, 0.012, 0.02), '#e9c9b4', 0, T + 0.25, 0.01, { outline: false });
    };
    if (folk.idle === 'empty') {
      // Made up: a towel folded on it, a little pillow for the chest.
      part(idle, rbox(0.34, 0.07, 0.26, 0.03), TOWEL, 0, T + 0.035, 0.3);
      part(idle, box(0.345, 0.004, 0.06), '#e9c9b4', 0, T + 0.072, 0.3, { outline: false });
      part(idle, rbox(0.4, 0.07, 0.24, 0.035), '#e8e0d0', 0, T + 0.035, -0.4);
    } else {
      const f = lyingDown(idle, folk.look);
      f.head.rotation.y = 0.15;
      towel(idle);
      if (folk.idle === 'needles') for (let i = 0; i < 8; i++) needle(idle).position.copy(vp(KM.NEEDLE_PTS[i]));
      else
        KM.CUP_PTS.forEach((pt) => {
          const c = cup(idle);
          c.g.position.copy(vp(pt));
          c.dome.scale.set(1, 0.55, 1);
        });
    }

    // ---- In use: the patient, the tray and everything handled.
    const use = group(g);
    out.inUse = use;
    const pat = lyingDown(use, folk.look);
    towel(use);
    // The needle tray beside the thigh: a kidney dish, the needle box, alcohol cotton, the 뜸 dish.
    const tray = group(use, KM.TRAY[0], KM.TRAY[1], KM.TRAY[2]);
    part(tray, rbox(0.16, 0.014, 0.12, 0.03), CHROME, 0, 0.0, 0);
    part(tray, rbox(0.06, 0.02, 0.04, 0.005), '#ffffff', -0.035, 0.016, -0.03);
    part(tray, box(0.061, 0.004, 0.02), '#1e88e5', -0.035, 0.027, -0.03, { outline: false });
    part(tray, cyl(0.018, 0.018, 0.03, 12), '#eceff1', 0.045, 0.022, -0.025);
    part(tray, ball(0.012), '#ffffff', 0.045, 0.04, -0.025, { outline: false });
    const trayCones = [0, 1, 2].map(() => moxaCone(tray));
    trayCones.forEach((c, i) => c.g.position.set(-0.04 + i * 0.03, 0.008, 0.03));
    const trayGun = pumpGun(tray);
    trayGun.position.set(0.04, 0.02, 0.03);
    trayGun.rotation.set(Math.PI / 2, 0, 0);
    // Eight needles (back and knees), four for the low back, six cups, three 뜸 cones.
    const needles = KM.NEEDLE_PTS.map((pt) => {
      const m = needle(use);
      m.position.copy(vp(pt));
      return m;
    });
    const lowNeedles = KM.LOW_PTS.map((pt) => {
      const m = needle(use);
      m.position.copy(vp(pt));
      return m;
    });
    const cups = KM.CUP_PTS.map((pt) => {
      const c = cup(use);
      c.g.position.copy(vp(pt));
      return c;
    });
    const cones = KM.MOXA_PTS.map((pt) => {
      const c = moxaCone(use);
      c.g.position.copy(vp(pt));
      return c;
    });
    const smoke = KM.MOXA_PTS.map(() => puffs(use, 4, SMOKE, 0.012));
    // In the hands: the guide tube, a cotton ball, the pump gun, the tweezers, the incense stick, a towel.
    const tube = part(use, cyl(0.0045, 0.0045, 0.05, 8), '#d6eaf8', 0, 0, 0, { outline: false });
    const cotton = part(use, ball(0.013), '#ffffff', 0, 0, 0, { outline: false });
    const gun = pumpGun(use);
    const tweezers = group(use);
    for (const sx of [-1, 1]) part(tweezers, box(0.003, 0.002, 0.09), STEEL, sx * 0.004, 0, -0.045, { ry: sx * 0.05, outline: false });
    const incense = group(use);
    part(incense, cyl(0.0025, 0.0025, 0.14, 5), '#6d4c41', 0, 0.07, 0, { outline: false });
    const incenseTip = glowing(incense, ball(0.004), '#ff5722', 0, 0, 0);
    const wipeTowel = part(use, rbox(0.14, 0.02, 0.1, 0.01), '#a5d6a7', 0, 0, 0);
    const handCone = moxaCone(use);
    const dish = group(use);
    part(dish, cyl(0.045, 0.035, 0.012, 16), '#fafafa', 0, 0, 0);
    const dishCones = [0, 1, 2].map((i) => {
      const c = moxaCone(dish);
      c.g.position.set(-0.02 + i * 0.02, 0.006, (i % 2) * 0.015);
      c.tip.visible = false;
      return c;
    });

    const mark = marker(g, 0, 0.7, 0);
    const spots: Record<string, Spot> = {
      acupuncture: spotAt(g, KM.BED_AT, 'stand', 'kmNeedle', mark),
      cupping: spotAt(g, KM.BED_AT, 'stand', 'kmCup', mark),
      acuteBackPain: spotAt(g, KM.BED_AT, 'stand', 'kmBack', mark),
      '*': spotAt(g, KM.BED_AT, 'stand', 'kmNeedle', mark),
    };
    out.spots = spots;
    out.work = mark;
    const restL = v3(-0.235, T + 0.07, -0.04);
    const restR = v3(0.235, T + 0.07, -0.04);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = (now ? spots[now].motion : 'kmNeedle') as KM.KmMotion;
      const ph = phaseOf(mark);
      const key = KM.kmKeyOf(m, t, ph).key;
      needles.forEach((x) => (x.visible = false));
      lowNeedles.forEach((x) => (x.visible = false));
      cups.forEach((c) => (c.g.visible = false));
      cones.forEach((c) => (c.g.visible = false));
      for (const s of smoke) s([0, 0, 0], t, 0);
      tube.visible = cotton.visible = gun.visible = tweezers.visible = incense.visible = wipeTowel.visible = handCone.g.visible = dish.visible = false;
      trayGun.visible = true;
      trayCones.forEach((c) => (c.g.visible = m !== 'kmBack'));
      pat.armR(restR);
      pat.armL(restL);
      pat.head.rotation.set(0, 0.1, 0);
      // Breathing: the back rises and falls.
      pat.upper.scale.set(1, 1, 1 + 0.02 * Math.sin(t * 1.5 + n));
      if (m === 'kmNeedle') {
        const b = KM.needleBeat(t, ph);
        needles.forEach((x, i) => (x.visible = KM.needleIn(b, i)));
        if (b.from.startsWith('in') || b.from.startsWith('knee')) {
          tube.visible = b.p < 0.9;
          tube.position.copy(vp(KM.tubeAt(key), 0.025));
        }
        if (b.from === 'swab') {
          cotton.visible = true;
          cotton.position.copy(vp(key.r, -0.015));
        }
        if (b.from === 'out' && b.p < 0.75) {
          cotton.visible = true;
          cotton.position.copy(vp(key.l, -0.018));
        }
        if (b.from === 'ask') pat.head.rotation.y = 0.45;
      } else if (m === 'kmCup') {
        const b = KM.cupBeat(t, ph);
        cups.forEach((c, i) => {
          const on = KM.cupOn(b, i);
          c.g.visible = on > 0;
          c.dome.scale.set(1, Math.max(0.01, 0.75 * on), 1);
        });
        if (KM.gunHeld(b)) {
          gun.visible = true;
          trayGun.visible = false;
          gun.position.copy(vp(key.r, -0.075));
        }
        if (b.from === 'wipe') {
          wipeTowel.visible = true;
          wipeTowel.position.copy(vp(key.r, -0.02));
        }
        if (b.from === 'check') pat.head.rotation.y = 0.45;
      } else if (m === 'kmBack') {
        const b = KM.backBeat(t, ph);
        lowNeedles.forEach((x, i) => (x.visible = KM.lowNeedleIn(b, i)));
        cones.forEach((c, i) => {
          const s = KM.moxaOn(b, i);
          c.g.visible = s.on;
          c.tip.visible = s.lit;
          smoke[i](KM.add(KM.MOXA_PTS[i], [0, 0.04, 0]), t + i * 0.3, s.lit ? 1 : 0, 0.25);
        });
        if (b.from.startsWith('in')) {
          tube.visible = b.p < 0.9;
          tube.position.copy(vp(KM.tubeAt(key), 0.025));
        }
        if (b.from === 'swab' || b.from === 'out') {
          cotton.visible = true;
          cotton.position.copy(vp(b.from === 'swab' ? key.r : key.l, -0.016));
        }
        if (KM.tweezersHeld(b)) {
          tweezers.visible = true;
          tweezers.position.copy(vp(key.r, -0.05));
          tweezers.rotation.set(-1.2, Math.PI / 2, 0);
          if (b.from === 'moxa') {
            dish.visible = true;
            dish.position.copy(vp(key.l, -0.03));
            dishCones.forEach((c, i) => (c.g.visible = i >= Math.floor(b.p * 3 + 0.45)));
            const u = (b.p * 3) % 1;
            handCone.g.visible = u < 0.55;
            handCone.g.position.copy(vp(key.r, -0.075));
            handCone.tip.visible = false;
          }
        }
        if (KM.incenseHeld(b)) {
          incense.visible = true;
          incense.position.copy(vp(key.r, -0.1));
          incense.rotation.set(0.5, 0, -0.4);
          incenseTip.visible = true;
        }
        // Sore: the near hand goes to the low back while it's pressed for, the head lifts and settles.
        const pain = KM.backPain(b);
        if (b.from === 'press') pat.armR(v3(0.14, KM.BACK + 0.03, -0.02));
        pat.head.rotation.set(-0.18 * pain * (0.6 + 0.4 * Math.sin(t * 2.2)), b.from === 'calm' ? 0.45 : 0.1, 0);
      }
    };
  },

  /**
   * The 약장: a walnut base of bigger drawers with a worktop, and over it the tower of 84 little
   * drawers each labelled in hanji with its herb and its hanja, brass corner plates, the 百草堂 board
   * on top. On the worktop five 약포지 papers in a row, the digital scale with its stainless pan, the
   * prescription slip, a stack of folded 첩, jars of 구기자 and 대추, a brass mortar.
   *
   * Making up a prescription: stood at the worktop, the slip read, three drawers pulled in turn, a
   * handful scooped into the pan, weighed (the scale reads 40 g), shared out over the papers, the
   * drawer pushed back; then each paper folded into a 첩. Learning a herb (the 입문's): a drawer
   * pulled, a pinch looked at and smelt, found in the 본초학 book in the other hand.
   */
  herbCabinet(g, W, _D, _c, _def, _ctx, out) {
    const C = KM.CAB;
    const wide = W > 1.5;
    const s = wide ? 1 : 0.5;
    const body = group(g);
    body.scale.set(s, 1, 1);
    // The base and its drawers, the worktop.
    part(body, rbox(1.96, 0.86, 0.64, 0.02), WALNUT, 0, 0.43, -0.18);
    picture(body, baseFace(), 1.9, 0.78, 0, 0.45, C.front + 0.002);
    part(body, rbox(2.0, 0.04, 0.68, 0.012), WALNUT_D, 0, C.top - 0.02, -0.17);
    part(body, box(1.98, 0.06, 0.62), WALNUT_D, 0, 0.03, -0.18);
    // The drawer tower, its face, its posts and cornice, the board on top.
    part(body, rbox(1.96, 1.02, 0.34, 0.02), WALNUT, 0, C.top + 0.51, -0.33);
    picture(body, drawerFace(), C.cols * C.cellW, C.rows * C.cellH, 0, C.y0 + (C.rows * C.cellH) / 2, C.face + 0.002);
    for (const sx of [-1, 1]) part(body, rbox(0.035, 1.02, 0.36, 0.01), WALNUT_D, sx * 0.975, C.top + 0.51, -0.33);
    part(body, rbox(2.04, 0.08, 0.42, 0.02), WALNUT_D, 0, C.top + 1.06, -0.32);
    part(body, rbox(0.6, 0.15, 0.03, 0.01), WALNUT_D, 0, C.top + 1.2, -0.2);
    label(body, '百 草 堂', 0.54, 0.11, 0, C.top + 1.2, -0.184, '#3e2723', '#e6c35c');
    // Brass corner plates on the base and the tower.
    for (const sx of [-1, 1]) {
      for (const y of [0.06, 0.82]) plate(body, sx * 0.95, y, C.front + 0.004);
      for (const y of [C.top + 0.06, C.top + 0.98]) plate(body, sx * 0.955, y, C.face + 0.004, 0.04);
    }
    // On the worktop: the scale, the papers, the slip, the folded 첩, the jars, a brass mortar.
    const scale = group(g, KM.PAN[0] * s, C.top, KM.PAN[2]);
    part(scale, rbox(0.2, 0.04, 0.2, 0.015), '#f5f5f5', 0, 0.02, 0);
    part(scale, cyl(0.07, 0.07, 0.008, 18), STEEL, 0, 0.044, 0, { outline: false });
    part(scale, rbox(0.12, 0.035, 0.012, 0.004), '#455a64', 0, 0.022, 0.104, { rx: -0.3 });
    const lcd = new THREE.MeshBasicMaterial({ map: scaleTex(0) });
    const lcdM = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.028), lcd);
    lcdM.userData.ownGeometry = lcdM.userData.ownMaterial = true;
    lcdM.position.set(0, 0.023, 0.111);
    lcdM.rotation.x = -0.3;
    scale.add(lcdM);
    label(scale, '전자저울', 0.07, 0.016, -0.0, 0.03, 0.101, '#f5f5f5', '#546e7a');
    /** The stainless pan (its foot at the origin) with herbs in it. */
    const makePan = (parent: THREE.Object3D) => {
      const p = group(parent);
      part(p, cyl(0.075, 0.05, 0.035, 18), CHROME, 0, 0.0175, 0);
      const herb = part(p, cyl(0.065, 0.045, 0.018, 16), HERB_COLOR[0], 0, 0.028, 0, { outline: false });
      return { p, herb };
    };
    const papers = KM.PAPERS.map((p) => {
      const m = part(g, box(0.105, 0.002, 0.105), PAPER, p[0] * s, p[1], p[2], { ry: Math.PI / 4, outline: false });
      return m;
    });
    void papers;
    flat(g, painted('kmSlip', 256, 192, paintSlip), 0.13, 0.1, KM.SLIP[0] * s, KM.SLIP[1] + 0.001, KM.SLIP[2]);
    /** A folded 첩: the paper packet tied with a red thread. */
    const packet = (parent: THREE.Object3D, x: number, y: number, z: number, ry = 0) => {
      const p = group(parent, x, y, z, ry);
      part(p, rbox(0.1, 0.03, 0.075, 0.01), '#f6f0e0', 0, 0.015, 0);
      part(p, box(0.004, 0.032, 0.077), '#c62828', 0, 0.015, 0, { outline: false });
      return p;
    };
    for (let i = 0; i < 4; i++) packet(g, KM.PACKETS[0] * s, C.top + i * 0.03, KM.PACKETS[2], (i % 2) * 0.12);
    // Jars of 구기자 and 대추, a brass mortar and pestle.
    for (const [jx, col] of [[-0.9, '#c62828'], [-0.8, '#6d1b1b']] as Array<[number, string]>) {
      part(g, cyl(0.04, 0.04, 0.008, 14), BRASS, jx * s, C.top + 0.13, 0.02, { outline: false });
      for (let i = 0; i < 6; i++) part(g, ball(0.014), col, jx * s + Math.cos(i * 1.7) * 0.02, C.top + 0.02 + (i % 3) * 0.025, 0.02 + Math.sin(i * 1.7) * 0.02, { outline: false });
      glass(g, cyl(0.038, 0.038, 0.12, 14), jx * s, C.top + 0.06, 0.02);
    }
    part(g, cyl(0.05, 0.04, 0.06, 14), BRASS, 0.92 * s, C.top + 0.03, -0.05);
    part(g, cyl(0.01, 0.014, 0.12, 8), BRASS, 0.94 * s, C.top + 0.09, -0.06, { rz: 0.4, outline: false });

    const cellAt = (cr: [number, number]) => KM.cellAt(cr[0], cr[1]);
    /** A real drawer at a cell (its front at the origin when shut), its herb inside. */
    const drawer = (parent: THREE.Object3D, cr: [number, number], name: [string, string], herb: string) => {
      const p = cellAt(cr);
      const d = group(parent, p[0] * s, p[1], p[2]);
      part(d, rbox(C.cellW - 0.012, C.cellH - 0.012, 0.02, 0.004), '#7a5039', 0, 0, 0.0);
      label(d, `${name[0]} ${name[1]}`, C.cellW * 0.74, C.cellH * 0.32, 0, 0.022, 0.011, HANJI, '#3e2723');
      part(d, box(0.03, 0.02, 0.004), BRASS, 0, -0.02, 0.012, { outline: false });
      part(d, ring(0.011, 0.0025), BRASS, 0, -0.035, 0.016, { outline: false });
      part(d, box(C.cellW - 0.03, C.cellH - 0.035, 0.17), '#a1785a', 0, -0.006, -0.095);
      part(d, box(C.cellW - 0.045, 0.02, 0.15), herb, 0, 0.02, -0.095, { outline: false });
      return d;
    };
    // At rest: every drawer shut, the pan empty on the scale.
    const idle = group(g);
    out.idle = idle;
    KM.HERB_DRAWERS.forEach((cr, i) => drawer(idle, cr, PRESCRIBED[i], HERB_COLOR[i]));
    drawer(idle, KM.LEARN_DRAWER, LEARNT, LEARN_COLOR);
    const idlePan = makePan(idle);
    idlePan.p.position.set(KM.PAN[0] * s, KM.PAN[1] - 0.025, KM.PAN[2]);
    idlePan.herb.visible = false;
    // In use: the drawers that slide, the pan that's lifted, the heaps on the papers, the folded 첩.
    const use = group(g);
    out.inUse = use;
    const live = KM.HERB_DRAWERS.map((cr, i) => drawer(use, cr, PRESCRIBED[i], HERB_COLOR[i]));
    const learnD = drawer(use, KM.LEARN_DRAWER, LEARNT, LEARN_COLOR);
    const pan = makePan(use);
    const heaps = KM.PAPERS.map((pp) =>
      HERB_COLOR.map((col, i) => {
        const h = part(use, ball(0.04 - i * 0.006), col, pp[0] * s + (i - 1) * 0.012, pp[1] + 0.006 + i * 0.008, pp[2] + (i === 1 ? 0.012 : -0.006), { outline: false });
        h.scale.set(1, 0.32, 1);
        return h;
      }),
    );
    const folds = KM.PAPERS.map((pp) => packet(use, pp[0] * s, pp[1], pp[2], 0.1));
    const sheets = KM.PAPERS.map((pp) => part(use, box(0.107, 0.003, 0.107), PAPER, pp[0] * s, pp[1] + 0.001, pp[2], { ry: Math.PI / 4, outline: false }));
    const fistful = group(use);
    for (let i = 0; i < 5; i++) part(fistful, box(0.022, 0.006, 0.014), HERB_COLOR[0], Math.cos(i * 1.3) * 0.012, (i % 2) * 0.006, Math.sin(i * 1.3) * 0.012, { ry: i, outline: false });
    const fistMats = fistful.children.map((c) => c as THREE.Mesh);
    const pinch = group(use);
    for (let i = 0; i < 3; i++) part(pinch, box(0.018, 0.004, 0.012), LEARN_COLOR, i * 0.006 - 0.006, 0, 0, { ry: i * 0.8, outline: false });
    // The 본초학 book, open in the left hand.
    const book = group(use);
    part(book, box(0.2, 0.012, 0.14), '#2e7d32', 0, 0, 0);
    for (const sx of [-1, 1]) part(book, box(0.092, 0.012, 0.13), '#fbf6e8', sx * 0.048, 0.008, 0, { rz: -sx * 0.06, outline: false });
    for (let i = 0; i < 4; i++) part(book, box(0.07, 0.002, 0.006), '#8d6e63', 0.05, 0.016, -0.04 + i * 0.025, { outline: false });
    part(book, box(0.05, 0.002, 0.04), LEARN_COLOR, -0.05, 0.016, 0.0, { outline: false });

    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      prepareHerbs: spotAt(g, KM.HERB_AT, 'stand', 'kmHerbs', mark),
      koreanMedicine_learnHerbs: spotAt(g, KM.HERB_AT, 'stand', 'kmLearn', mark),
      '*': spotAt(g, KM.HERB_AT, 'stand', 'kmHerbs', mark),
    };
    out.spots = spots;
    out.work = mark;
    let shown = '';
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = (now ? spots[now].motion : 'kmHerbs') as KM.KmMotion;
      const ph = phaseOf(mark);
      const key = KM.kmKeyOf(m, t, ph).key;
      live.forEach((d) => (d.position.z = KM.CAB.face));
      learnD.position.z = KM.CAB.face;
      fistful.visible = pinch.visible = book.visible = false;
      pan.p.visible = true;
      pan.herb.visible = false;
      pan.p.position.set(KM.PAN[0] * s, KM.PAN[1] - 0.025, KM.PAN[2]);
      pan.p.rotation.set(0, 0, 0);
      heaps.forEach((hs) => hs.forEach((h) => (h.visible = false)));
      folds.forEach((f) => (f.visible = false));
      sheets.forEach((sh) => (sh.visible = true));
      let grams = 0;
      if (m === 'kmHerbs') {
        const b = KM.herbBeat(t, ph);
        live.forEach((d, i) => (d.position.z = KM.CAB.face + KM.drawerOut(b, i) * KM.CAB.out));
        heaps.forEach((hs, k) => hs.forEach((h, i) => (h.visible = KM.heapOn(b, i, k) && !KM.folded(b, k))));
        folds.forEach((f, k) => (f.visible = KM.folded(b, k)));
        sheets.forEach((sh, k) => (sh.visible = !KM.folded(b, k)));
        const pn = KM.panOf(b);
        if (pn.herb >= 0) {
          pan.herb.visible = true;
          (pan.herb as THREE.Mesh).material = (heaps[0][pn.herb] as THREE.Mesh).material;
          pan.herb.scale.set(1, Math.max(0.05, pn.amount), 1);
        }
        if (pn.lifted) {
          pan.p.position.copy(vp(key.r, -0.05));
          pan.p.position.x -= 0.02;
          pan.p.rotation.set(0, 0, 0.6);
        }
        if (KM.handful(b)) {
          fistful.visible = true;
          fistful.position.copy(vp(key.r, -0.02));
          const i = Number(b.from[b.from.length - 1]);
          fistMats.forEach((f) => (f.material = (heaps[0][i] as THREE.Mesh).material));
        }
        grams = KM.scaleReads(b);
      } else if (m === 'kmLearn') {
        const b = KM.learnBeat(t, ph);
        learnD.position.z = KM.CAB.face + KM.learnOut(b) * KM.CAB.out;
        book.visible = true;
        book.position.copy(vp(KM.LEARN_BOOK));
        book.rotation.set(0.75, 0, 0);
        if (KM.pinchHeld(b)) {
          pinch.visible = true;
          pinch.position.copy(vp(key.r, 0.0));
        }
      }
      const want = grams.toFixed(1);
      if (want !== shown) {
        shown = want;
        lcd.map = scaleTex(grams);
        lcd.needsUpdate = true;
      }
    };
  },

  /**
   * The 탕전기: a stainless pressure tank on its stand — the domed lid on a hinge at the back with
   * its hand wheel, the pressure gauge on its pipe, the steam vent, a sight glass showing the
   * decoction, the drain valve, the control panel on its front (lit while it runs: 탕전 중 100℃,
   * 남은 시간) — and at its side a little shelf with the cloth herb bag and the measuring jug.
   *
   * Brewing: stood at it, the wheel turned and the lid swung up, the herb bag lowered in, water
   * poured from the jug, the lid shut and wheeled tight, the panel set, the gauge watched as the
   * vent steams. A sample for research (the 연구 branch's): crouched at the drain with a beaker,
   * held to the light, swirled, written up. A research meeting led stood beside it.
   */
  herbDecoctor(g, _W, _D, _c, _def, _ctx, out) {
    const n = decCount++;
    const D = KM.DEC;
    // The stand and the tank.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      part(g, box(0.035, 0.32, 0.035), STEEL, D.cx + Math.cos(a) * 0.2, 0.16, D.cz + Math.sin(a) * 0.2, { outline: false });
      part(g, cyl(0.03, 0.03, 0.015, 10), BLACK, D.cx + Math.cos(a) * 0.2, 0.008, D.cz + Math.sin(a) * 0.2, { outline: false });
    }
    part(g, cyl(0.24, 0.24, 0.02, 24), STEEL, D.cx, 0.12, D.cz, { outline: false });
    part(g, cyl(D.r, 0.13, 0.1, 24), CHROME, D.cx, 0.29, D.cz);
    part(g, cyl(D.r, D.r, 0.66, 28), CHROME, D.cx, 0.67, D.cz);
    for (const y of [0.42, 0.7, 0.96]) part(g, cyl(D.r + 0.004, D.r + 0.004, 0.012, 28), STEEL, D.cx, y, D.cz, { outline: false });
    // The sight glass up its side, the decoction showing.
    glass(g, cyl(0.014, 0.014, 0.42, 10), D.cx - 0.2, 0.68, D.cz + 0.17);
    part(g, cyl(0.009, 0.009, 0.3, 8), DECOCTION, D.cx - 0.2, 0.62, D.cz + 0.17, { outline: false });
    for (const y of [0.46, 0.9]) part(g, box(0.04, 0.025, 0.03), STEEL, D.cx - 0.2, y, D.cz + 0.17, { outline: false });
    // The panel on its front.
    part(g, rbox(0.26, 0.18, 0.05, 0.015), '#eceff1', D.panel[0], D.panel[1], D.panel[2] - 0.02);
    const screen = litScreen(g, painted('kmDecPanel', 256, 128, paintDecPanel), 0.16, 0.08, D.panel[0] - 0.03, D.panel[1] + 0.02, D.panel[2] + 0.006);
    out.screen = screen;
    for (const [i, col] of ['#43a047', '#fdd835', '#e53935'].entries()) part(g, cyl(0.012, 0.012, 0.012, 10), col, D.panel[0] + 0.08, D.panel[1] + 0.05 - i * 0.04, D.panel[2] + 0.008, { rx: Math.PI / 2, outline: false });
    label(g, '가압 탕전기 KM-30', 0.22, 0.035, D.cx, 0.92, D.cz + D.r + 0.004, '#eceff1', '#37474f');
    label(g, `${CLINIC} 원내탕전`, 0.2, 0.03, D.cx, 0.5, D.cz + D.r + 0.004, '#fff8e1', '#6d4c41');
    // The drain valve and its lever.
    part(g, cyl(0.022, 0.022, 0.1, 10), STEEL, D.drain[0], D.drain[1], D.drain[2] - 0.03, { rx: Math.PI / 2 });
    part(g, cyl(0.014, 0.01, 0.05, 10), STEEL, D.drain[0], D.drain[1] - 0.03, D.drain[2] + 0.02, { outline: false });
    // The gauge on its pipe, the steam vent at the back.
    rod(g, v3(D.cx + D.r - 0.02, 0.9, D.gauge[2]), v3(D.gauge[0], 0.94, D.gauge[2]), 0.012, STEEL);
    rod(g, v3(D.gauge[0], 0.94, D.gauge[2]), v3(D.gauge[0], D.gauge[1] - 0.04, D.gauge[2]), 0.012, STEEL);
    part(g, cyl(0.05, 0.05, 0.025, 20), CHROME, D.gauge[0], D.gauge[1], D.gauge[2], { rx: Math.PI / 2 });
    const face = painted('kmGauge', 96, 96, (c) => {
      FILL(c, 96, 96, '#ffffff');
      c.strokeStyle = '#37474f';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(48, 52, 36, Math.PI * 0.75, Math.PI * 2.25);
      c.stroke();
      c.strokeStyle = '#e53935';
      c.lineWidth = 5;
      c.beginPath();
      c.arc(48, 52, 32, Math.PI * 1.9, Math.PI * 2.25);
      c.stroke();
      text(c, 'bar', 48, 74, 14, '#37474f', 'center', false);
    });
    picture(g, face, 0.08, 0.08, D.gauge[0], D.gauge[1], D.gauge[2] + 0.014);
    rod(g, v3(D.cx - D.r + 0.03, 0.88, D.vent[2] + 0.04), v3(D.vent[0], 0.92, D.vent[2]), 0.013, STEEL);
    rod(g, v3(D.vent[0], 0.92, D.vent[2]), v3(D.vent[0], D.vent[1] - 0.03, D.vent[2]), 0.013, STEEL);
    part(g, cyl(0.022, 0.016, 0.04, 10), STEEL, D.vent[0], D.vent[1] - 0.02, D.vent[2], { outline: false });
    // The side shelf with the herb bag and the jug.
    part(g, rbox(0.2, 0.02, 0.36, 0.006), CHROME, -0.37, 0.86, 0.02);
    rod(g, v3(-0.37, 0.85, -0.12), v3(D.cx - 0.2, 0.6, D.cz - 0.05), 0.008, STEEL);
    rod(g, v3(-0.37, 0.85, 0.16), v3(D.cx - 0.2, 0.6, D.cz + 0.12), 0.008, STEEL);
    /** The cloth herb bag (면포 주머니), its foot at the origin. */
    const herbBag = (parent: THREE.Object3D) => {
      const b = group(parent);
      const sack = part(b, ball(0.075), '#e8dcc0', 0, 0.065, 0);
      sack.scale.set(1, 0.9, 0.85);
      part(b, cyl(0.02, 0.035, 0.04, 10), '#e8dcc0', 0, 0.14, 0, { outline: false });
      part(b, ring(0.022, 0.004), '#8d6e63', 0, 0.135, 0, { rx: Math.PI / 2, outline: false });
      return b;
    };
    /** The measuring jug, its foot at the origin; `water` its contents. */
    const jug = (parent: THREE.Object3D) => {
      const j = group(parent);
      const w = new THREE.Mesh(cyl(0.05, 0.045, 0.12, 14), WATERY);
      w.position.y = 0.06;
      j.add(w);
      glass(j, cyl(0.055, 0.05, 0.16, 14), 0, 0.08, 0);
      part(j, ring(0.035, 0.007, Math.PI), '#90a4ae', 0.06, 0.09, 0, { rz: -Math.PI / 2, outline: false });
      for (let i = 0; i < 4; i++) part(j, box(0.02, 0.003, 0.002), '#1565c0', 0, 0.04 + i * 0.03, 0.054, { outline: false });
      return j;
    };
    /** The lid on its hinge (opened `a` radians). */
    const lid = (parent: THREE.Object3D) => {
      const l = group(parent, D.hinge[0], D.hinge[1], D.hinge[2]);
      const zc = D.cz - D.hinge[2];
      part(l, cyl(D.r + 0.01, D.r + 0.01, 0.04, 28), CHROME, 0, -0.02, zc);
      const dome = part(l, ball(D.r * 0.95), CHROME, 0, -0.02, zc);
      dome.scale.set(1, 0.28, 1);
      part(l, cyl(0.012, 0.012, 0.1, 8), STEEL, 0, 0.08, zc, { outline: false });
      const wheel = group(l, 0, D.wheel[1] - D.hinge[1], zc);
      part(wheel, ring(0.09, 0.009), '#b71c1c', 0, 0, 0, { rx: Math.PI / 2 });
      for (let i = 0; i < 4; i++) part(wheel, box(0.18, 0.012, 0.012), STEEL, 0, 0, 0, { ry: (i * Math.PI) / 4, outline: false });
      part(l, rbox(0.08, 0.05, 0.05, 0.01), STEEL, 0, -0.01, 0.0);
      part(l, rbox(0.08, 0.025, 0.04, 0.01), '#263238', 0, 0.0, zc + D.r + 0.01);
      return { l, wheel };
    };
    // At rest: the lid shut, the bag and the jug on the shelf.
    const idle = group(g);
    out.idle = idle;
    lid(idle);
    part(idle, box(0.012, 0.012, 0.08), '#e53935', D.drain[0] + 0.03, D.drain[1] + 0.02, D.drain[2]);
    herbBag(idle).position.set(D.bag[0], 0.87, D.bag[2]);
    jug(idle).position.set(D.jug[0], 0.87, D.jug[2]);
    // In use.
    const use = group(g);
    out.inUse = use;
    const L = lid(use);
    const bag = herbBag(use);
    const theJug = jug(use);
    const stream = limb(use, 0.008, '#b3e5fc', WATERY);
    const streamM = use.children[use.children.length - 1];
    const brew = new THREE.Mesh(cyl(D.r - 0.02, D.r - 0.02, 0.01, 24), BROTH);
    brew.position.set(D.cx, D.top - 0.06, D.cz);
    use.add(brew);
    const bagIn = part(use, ball(0.08), '#c9b48a', D.cx - 0.02, D.top - 0.05, D.cz + 0.02, { outline: false });
    bagIn.scale.set(1, 0.5, 1);
    const needleG = group(use, D.gauge[0], D.gauge[1], D.gauge[2] + 0.018);
    part(needleG, box(0.004, 0.032, 0.003), '#e53935', 0, 0.014, 0, { outline: false });
    const steam = puffs(use, 6, STEAM, 0.03);
    const burst = puffs(use, 5, STEAM, 0.05);
    const lever = part(use, box(0.012, 0.012, 0.08), '#e53935', D.drain[0] + 0.03, D.drain[1] + 0.02, D.drain[2]);
    // The research: a beaker, a clipboard.
    const beaker = group(use);
    glass(beaker, cyl(0.035, 0.035, 0.1, 14), 0, 0.05, 0);
    const fill = new THREE.Mesh(cyl(0.031, 0.031, 1, 14), BROTH);
    beaker.add(fill);
    const drip = part(use, cyl(0.004, 0.004, 0.12, 6), DECOCTION, D.drain[0], D.drain[1] - 0.1, D.drain[2] + 0.045, { outline: false });
    const board = group(use);
    part(board, rbox(0.2, 0.012, 0.26, 0.006), '#8d6e63', 0, 0, 0);
    flat(board, painted('kmLabNote', 256, 320, (c) => {
      FILL(c, 256, 320, '#ffffff');
      text(c, '탕액 분석', 128, 26, 22, '#3e2723', 'center');
      ['Brix 3.2°', 'pH 5.1', '추출 120cc / 첩', '색도 · 향 양호'].forEach((s2, i) => text(c, s2, 20, 80 + i * 50, 20, '#37474f', 'left', false));
    }), 0.18, 0.23, 0, 0.007, 0);
    void n;

    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = {
      brewHerbalMed: spotAt(g, KM.DEC_AT, 'stand', 'kmBrew', mark),
      koreanMedicine_herbResearch: spotAt(g, KM.DEC_AT, 'stand', 'kmSample', mark),
      koreanMedicine_researchMeeting: spotAt(g, { x: -0.3, y: 0, z: 0.66, yaw: Math.PI * 0.85 }, 'stand', 'gesture'),
      '*': spotAt(g, KM.DEC_AT, 'stand', 'kmBrew', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = (now ? spots[now].motion : 'kmBrew') as Motion;
      const ph = phaseOf(mark);
      L.l.rotation.x = 0;
      bag.visible = theJug.visible = streamM.visible = bagIn.visible = beaker.visible = drip.visible = board.visible = false;
      brew.visible = false;
      lever.rotation.y = 0;
      let heat = 0.5;
      let burstK = 0;
      if (m === 'kmBrew') {
        const b = KM.brewBeat(t, ph);
        const key = KM.kmKeyOf('kmBrew', t, ph).key;
        const open = KM.lidOpen(b);
        L.l.rotation.x = -1.75 * open;
        L.wheel.rotation.y = b.from === 'open' || b.from === 'close' ? t * 2.4 : 0;
        const where = KM.bagWhere(b);
        bag.visible = true;
        if (where === 'shelf') bag.position.set(D.bag[0], 0.87, D.bag[2]);
        else if (where === 'hand') bag.position.copy(vp(key.l, -0.16));
        else bag.visible = false;
        bagIn.visible = where === 'in' && open > 0.3;
        brew.visible = open > 0.3 && b.from !== 'bag';
        theJug.visible = true;
        if (KM.jugHeld(b)) {
          theJug.position.copy(vp(key.l, -0.1));
          theJug.rotation.set(0, 0, KM.pouring(b) ? 1.1 : 0.2);
        } else {
          theJug.position.set(D.jug[0], 0.87, D.jug[2]);
          theJug.rotation.set(0, 0, 0);
        }
        if (KM.pouring(b)) {
          streamM.visible = true;
          const lip = vp(key.l, -0.02);
          lip.x += 0.07;
          stream(lip, v3(lip.x + 0.01, D.top - 0.05, lip.z));
        }
        heat = KM.brewHeat(b);
        burstK = open > 0.6 ? 0.6 : 0;
      } else if (m === 'kmSample') {
        const b = KM.sampleBeat(t, ph);
        const key = KM.kmKeyOf('kmSample', t, ph).key;
        beaker.visible = b.from !== 'note' || b.e > 0;
        beaker.position.copy(vp(KM.beakerAt(key)));
        const f = KM.beakerFill(b);
        fill.visible = f > 0.02;
        fill.scale.set(1, Math.max(0.001, 0.085 * f), 1);
        fill.position.y = 0.005 + 0.0425 * f;
        const v = KM.valveOpen(b);
        lever.rotation.y = 1.2 * v;
        drip.visible = v > 0.5;
        if (b.from === 'note') {
          board.visible = true;
          board.position.copy(vp(key.l, -0.02));
          board.rotation.set(0.9, Math.PI, 0);
        }
      }
      // The gauge's needle and the vent's steam.
      needleG.rotation.z = 1.9 - 3.0 * Math.min(1, heat + 0.02 * Math.sin(t * 3));
      steam(D.vent, t, heat, 0.35);
      burst([D.cx, D.top + 0.05, D.cz], t * 0.7, burstK, 0.3);
    };
  },

  /**
   * The pulse desk (진맥 책상): a walnut desk with a pedestal of drawers, the red brocade 맥침 on its
   * right end, the chart, a small monitor with the clinic's chart software, the 사상체질 card, a
   * brush pot, the doctor's wooden chair at its front and the patient's round stool at its end —
   * a patient sat on it at one desk (a grandmother, at rest), waiting.
   *
   * Taking the pulse (sat): asking how they've been, three fingers on the left wrist laid on the
   * pillow, eyes shut, then the right; the tongue looked at as they show it; the chart written.
   * The lifestyle talk: a drawing on a sheet turned to them, the leaflet handed across, nodding.
   * Prescribing written on the chart; the budget typed up on the monitor's keyboard.
   */
  pulseDesk(g, _W, _D, _c, _def, _ctx, out) {
    const n = deskCount++;
    const K = KM.DESK;
    // The desk: top, legs, a pedestal on the doctor's left, a carved apron at the back.
    part(g, rbox(K.w, 0.04, K.d, 0.012), WALNUT, 0, K.top - 0.02, K.cz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.045, K.top - 0.04, 0.045, 0.01), WALNUT_D, sx * (K.w / 2 - 0.04), (K.top - 0.04) / 2, K.cz + sz * (K.d / 2 - 0.04));
    part(g, rbox(0.26, K.top - 0.1, K.d - 0.06, 0.01), WALNUT, -0.28, (K.top - 0.04) / 2 + 0.03, K.cz);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.22, 0.16, 0.006), '#6d4c41', -0.28, 0.16 + i * 0.19, K.cz + K.d / 2 - 0.028, { outline: false });
      part(g, box(0.06, 0.012, 0.012), BRASS, -0.28, 0.2 + i * 0.19, K.cz + K.d / 2 - 0.02, { outline: false });
    }
    part(g, rbox(K.w - 0.08, 0.12, 0.02, 0.008), WALNUT_D, 0, K.top - 0.1, K.cz - K.d / 2 + 0.03);
    for (let i = 0; i < 5; i++) part(g, box(0.06, 0.06, 0.006), '#8d6e63', -0.3 + i * 0.15, K.top - 0.1, K.cz - K.d / 2 + 0.018, { rz: Math.PI / 4, outline: false });
    // The 맥침 (pulse pillow): red brocade with a gold band.
    const P = KM.PILLOW;
    part(g, rbox(0.17, 0.05, 0.1, 0.025), '#8e2430', P[0], P[1] + 0.025, P[2]);
    part(g, box(0.172, 0.052, 0.02), '#e6c35c', P[0], P[1] + 0.025, P[2], { outline: false });
    part(g, rbox(0.22, 0.006, 0.14, 0.004), '#efe3c4', P[0], P[1] + 0.003, P[2], { outline: false });
    // The chart, the monitor and keyboard, the 사상체질 card, a brush pot, the needle case, a teacup.
    flat(g, painted('kmChart', 256, 320, paintChart), 0.17, 0.21, KM.CHART[0], KM.CHART[1] + 0.002, KM.CHART[2]);
    part(g, rbox(0.19, 0.008, 0.23, 0.004), '#8d6e63', KM.CHART[0], KM.CHART[1], KM.CHART[2]);
    part(g, box(0.06, 0.012, 0.02), STEEL, KM.CHART[0], KM.CHART[1] + 0.01, KM.CHART[2] - 0.1, { outline: false });
    const mon = group(g, -0.28, K.top, -0.28, 0.35);
    part(mon, rbox(0.12, 0.012, 0.09, 0.004), BLACK, 0, 0.006, 0);
    part(mon, box(0.025, 0.12, 0.02), BLACK, 0, 0.07, -0.01);
    part(mon, rbox(0.3, 0.2, 0.025, 0.008), BLACK, 0, 0.21, 0);
    const screen = litScreen(mon, painted('kmEmr', 320, 200, paintEmr), 0.27, 0.17, 0, 0.21, 0.014);
    out.screen = screen;
    const kb = group(g, -0.3, K.top, -0.08, 0.2);
    part(kb, rbox(0.26, 0.015, 0.09, 0.004), '#eceff1', 0, 0.008, 0);
    for (let r = 0; r < 3; r++) part(kb, box(0.23, 0.004, 0.018), '#cfd8dc', 0, 0.017, -0.025 + r * 0.025, { outline: false });
    const card = group(g, 0.05, K.top, -0.32, 0);
    part(card, box(0.16, 0.16, 0.006), WALNUT_D, 0, 0.09, -0.004, { rx: -0.18 });
    picture(card, painted('kmSasang', 256, 256, paintSasang), 0.14, 0.14, 0, 0.09, 0.0, '#ffffff', 0, -0.18);
    part(g, cyl(0.03, 0.03, 0.09, 12), '#455a64', 0.2, K.top + 0.045, -0.3);
    for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.12, 6), ['#3e2723', '#c62828', '#1565c0'][i], 0.19 + i * 0.01, K.top + 0.12, -0.3, { rz: (i - 1) * 0.15, outline: false });
    part(g, rbox(0.1, 0.02, 0.035, 0.008), BRASS, 0.2, K.top + 0.01, 0.07, { ry: 0.3 });
    part(g, cyl(0.03, 0.025, 0.05, 12), '#f5f0e6', -0.38, K.top + 0.025, 0.02);
    part(g, cyl(0.027, 0.027, 0.004, 12), '#a1672d', -0.38, K.top + 0.048, 0.02, { outline: false });
    // The doctor's chair, its back to the room; the patient's stool.
    const D = KM.DOC_AT;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.018, 0.018, D.y - 0.03, 8), WALNUT_D, sx * 0.18, (D.y - 0.03) / 2, D.z + sz * 0.17, { outline: false });
    part(g, rbox(0.44, 0.05, 0.42, 0.02), WALNUT, 0, D.y - 0.025, D.z);
    part(g, rbox(0.4, 0.04, 0.38, 0.02), '#8e2430', 0, D.y + 0.005, D.z, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.03, 0.42, 0.03), WALNUT_D, sx * 0.19, D.y + 0.2, D.z + 0.2);
    part(g, rbox(0.42, 0.14, 0.03, 0.01), WALNUT, 0, D.y + 0.36, D.z + 0.2);
    const S = KM.PATIENT;
    part(g, cyl(0.17, 0.17, 0.05, 18), WALNUT, S.x, S.seat - 0.025, S.z);
    part(g, cyl(0.15, 0.15, 0.02, 18), '#8e2430', S.x, S.seat + 0.005, S.z, { outline: false });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, v3(S.x + Math.cos(a) * 0.11, S.seat - 0.04, S.z + Math.sin(a) * 0.11), v3(S.x + Math.cos(a) * 0.15, 0.0, S.z + Math.sin(a) * 0.15), 0.014, WALNUT_D);
    }

    // At rest: a patient waiting at one desk (hands in her lap), none at the other.
    const idle = group(g);
    out.idle = idle;
    if (n % 2 === 0) {
      const w = seated(idle, LOOKS.granny, S.x, S.z, S.yaw, S.seat);
      w.head.rotation.y = 0.3;
    }
    // In use: the patient (whoever's at this desk today) and what's handed over.
    const use = group(g);
    out.inUse = use;
    const pat = seated(use, n % 2 === 0 ? LOOKS.granny : LOOKS.office, S.x, S.z, S.yaw, S.seat);
    const sheet = flat(use, painted('kmSheet', 256, 320, paintSheet), 0.16, 0.2, KM.SHEET[0], KM.SHEET[1] + 0.003, KM.SHEET[2], -Math.PI / 2);
    const leaflet = group(use);
    flat(leaflet, painted('kmLeaflet', 128, 176, paintLeaflet), 0.09, 0.124, 0, 0, 0, -Math.PI / 2);
    const pen = part(use, cyl(0.004, 0.004, 0.13, 6), '#263238', 0, 0, 0, { outline: false });

    const work = marker(g, KM.CHART[0], KM.CHART[1] + 0.02, KM.CHART[2]);
    const keys = marker(g, -0.3, K.top + 0.02, -0.08);
    const mark = marker(g, 0, 0.8, 0);
    const spots: Record<string, Spot> = {
      pulseDiagnosis: spotAt(g, D, 'sit', 'kmPulse', mark),
      koreanMedicine_lifestyleCounsel: spotAt(g, D, 'sit', 'kmCounsel', mark),
      koreanMedicine_prescribe: spotAt(g, D, 'sit', 'write', work),
      koreanMedicine_clinicBudget: spotAt(g, { ...D, yaw: Math.PI - 0.2 }, 'sit', 'type', keys),
      '*': spotAt(g, D, 'sit', 'kmPulse', mark),
    };
    out.spots = spots;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = (now ? spots[now].motion : 'kmPulse') as Motion;
      const ph = phaseOf(mark);
      pat.root.visible = m !== 'type';
      sheet.visible = leaflet.visible = pen.visible = false;
      pat.armL(null);
      pat.armR(null);
      pat.head.rotation.set(0, 0.25, 0);
      pat.tongue(0);
      pat.mouth(0);
      pat.eyes(Math.sin(t * 1.3 + n) > 0.96);
      if (m === 'kmPulse') {
        const b = KM.pulseBeat(t, ph);
        const at = KM.patientAt(b);
        // The wrist laid on the pillow, the hand past it, palm up.
        if (at.wrist === 'l') pat.armL(vp(KM.add(KM.WRIST_L, [-0.06, -0.012, 0.0])));
        if (at.wrist === 'r') pat.armR(vp(KM.add(KM.WRIST_R, [-0.06, -0.012, 0.0])));
        pat.head.rotation.set(at.wrist ? 0.15 : 0, 0.25 + 0.4 * at.tongue + (at.wrist ? 0.2 : 0), 0);
        pat.tongue(at.tongue);
        pat.mouth(at.talk * 0.5 * Math.max(0, Math.sin(t * 6.5 + n)));
        if (b.from === 'note') {
          const key = KM.kmKeyOf('kmPulse', t, ph).key;
          pen.visible = true;
          pen.position.copy(vp(key.r, 0.04));
          pen.rotation.set(0.5, 0, 0.3);
        }
      } else if (m === 'kmCounsel') {
        const b = KM.counselBeat(t, ph);
        const key = KM.kmKeyOf('kmCounsel', t, ph).key;
        sheet.visible = true;
        pat.head.rotation.set(0.2 * KM.amountOf(b, 'draw'), 0.35, 0);
        pat.mouth(KM.amountOf(b, 'nod') * 0.4 * Math.max(0, Math.sin(t * 6 + n)));
        if (b.from === 'draw') {
          pen.visible = true;
          pen.position.copy(vp(key.r, 0.04));
          pen.rotation.set(0.5, 0, 0.3);
        }
        if (b.from === 'hand') {
          leaflet.visible = true;
          const got = b.p > 0.55;
          leaflet.position.copy(vp(KM.LEAFLET));
          leaflet.rotation.set(0.6, 0, 0);
          if (got) pat.armL(vp(KM.add(KM.LEAFLET, [0.05, 0, 0.02])));
        }
        if (b.from === 'nod') {
          leaflet.visible = true;
          // On her lap, read.
          const lap = v3(S.x - 0.22, S.seat + 0.2, S.z + 0.02);
          leaflet.position.copy(lap);
          leaflet.rotation.set(0.9, -Math.PI / 2, 0);
          pat.armL(lap.clone().add(v3(0, 0.0, 0.05)));
          pat.armR(lap.clone().add(v3(0, 0.0, -0.05)));
          pat.head.rotation.set(0.35, 0.1, 0);
        }
      }
    };
  },

  // =============================================================================================
  // The new pieces.

  /**
   * The infrared lamp (적외선 치료기): a five-castor base, a white pole, a long jointed arm out over
   * the bed beside it, and the domed head with its glowing red element, a grille, a handle and a
   * timer knob; a faint warm cone of light under it. On while a patient lies under it (and while
   * it's set), off over an empty bed.
   *
   * Setting it: stood at its side, the head taken in both hands and tipped to the back, the timer
   * turned, a palm held under it to feel the warmth, a look at the timer.
   */
  kmHeatLamp(g, _W, _D, _c, _def, _ctx, out) {
    const n = lampCount++;
    const on = BED_FOLK[n % BED_FOLK.length].idle !== 'empty';
    const [px, pz] = KM.LAMP.pole;
    const H = KM.LAMP.head;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      rod(g, v3(px, 0.1, pz), v3(px + Math.sin(a) * 0.24, 0.06, pz + Math.cos(a) * 0.24), 0.016, '#eceff1');
      part(g, ball(0.026), BLACK, px + Math.sin(a) * 0.24, 0.026, pz + Math.cos(a) * 0.24, { outline: false });
    }
    part(g, cyl(0.05, 0.06, 0.1, 14), '#eceff1', px, 0.1, pz);
    part(g, cyl(0.02, 0.02, 1.22, 10), '#f5f5f5', px, 0.72, pz);
    part(g, rbox(0.1, 0.14, 0.08, 0.02), '#eceff1', px, 0.95, pz + 0.03);
    label(g, 'IR', 0.05, 0.03, px, 0.97, pz + 0.072, '#eceff1', '#c62828');
    part(g, ball(0.035), '#b0bec5', px, 1.34, pz);
    const elbow = v3(0.3, 1.66, -0.06);
    const mount = v3(H[0], H[1] + 0.2, H[2]);
    rod(g, v3(px, 1.34, pz), elbow, 0.016, '#eceff1');
    part(g, ball(0.03), '#b0bec5', elbow.x, elbow.y, elbow.z, { outline: false });
    rod(g, elbow, mount, 0.016, '#eceff1');
    rod(g, mount, v3(H[0], H[1] + 0.1, H[2]), 0.014, '#b0bec5');
    // The head (it tips about its mount).
    const head = group(g, H[0], H[1] + 0.1, H[2]);
    part(head, cyl(0.08, 0.2, 0.13, 24), '#eceff1', 0, -0.09, 0);
    part(head, ring(0.2, 0.012), '#b0bec5', 0, -0.155, 0, { rx: Math.PI / 2 });
    part(head, cyl(0.17, 0.17, 0.01, 24), '#4e1a12', 0, -0.13, 0, { outline: false });
    for (let i = 0; i < 5; i++) part(head, box(0.34, 0.004, 0.006), '#9e9e9e', 0, -0.152, -0.12 + i * 0.06, { outline: false });
    part(head, rbox(0.08, 0.03, 0.03, 0.012), '#9e9e9e', -0.17, -0.12, -0.04);
    part(head, cyl(0.022, 0.022, 0.02, 12), '#424242', -0.05, -0.02, 0.04);
    label(head, '적외선 치료기', 0.12, 0.026, 0, -0.085, 0.138, '#eceff1', '#c62828');
    /** The element lit, and the warm light under it. */
    const lit = (parent: THREE.Object3D) => {
      glowing(parent, cyl(0.16, 0.16, 0.012, 24), '#ff5722', 0, -0.135, 0);
      glowing(parent, cyl(0.1, 0.1, 0.014, 20), '#ffab40', 0, -0.137, 0);
      const cone = new THREE.Mesh(cyl(0.19, 0.34, 0.55, 24), WARM);
      cone.position.y = -0.42;
      parent.add(cone);
    };
    const glowIdle = group(head);
    if (on) lit(glowIdle);
    out.idle = glowIdle;
    const glowUse = group(head);
    lit(glowUse);
    out.inUse = glowUse;
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = { '*': spotAt(g, KM.LAMP_AT, 'stand', 'kmLamp', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const b = KM.lampBeat(t, phaseOf(mark));
      head.rotation.x = KM.lampTilt(b);
    };
  },

  /**
   * The cupping and 뜸 cart (부항 · 뜸 카트): a stainless two-shelf trolley — on top a tray of
   * cupping cups in three sizes, the pump gun, a wooden box of 뜸 cones, a white dish, a jar of
   * alcohol cotton with tweezers, incense sticks in a holder, rolled towels, and at the back the UV
   * sterilizer, violet behind its glass door (lit while it's used); below, more towels, the yellow
   * sharps bin and boxes of disposable needles.
   *
   * Getting ready: a cup wiped round with alcohol cotton and put into the sterilizer through its
   * door; 뜸 cones pinched out of the box onto the dish; the towels squared.
   */
  kmCupCart(g, _W, _D, _c, _def, _ctx, out) {
    const C = KM.CART;
    const cw = 0.62;
    const cd = 0.44;
    const cz = -0.06;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, box(0.022, C.top - 0.08, 0.022), STEEL, sx * (cw / 2 - 0.02), (C.top + 0.08) / 2, cz + sz * (cd / 2 - 0.02), { outline: false });
        caster(g, sx * (cw / 2 - 0.05), cz + sz * (cd / 2 - 0.05), 0.035);
      }
    for (const y of [0.24, C.top]) {
      part(g, rbox(cw, 0.02, cd, 0.006), CHROME, 0, y - 0.01, cz);
      for (const sz of [-1, 1]) part(g, box(cw, 0.025, 0.008), STEEL, 0, y + 0.01, cz + sz * (cd / 2 - 0.004), { outline: false });
    }
    rod(g, v3(-cw / 2 - 0.04, C.top - 0.05, cz - 0.15), v3(-cw / 2 - 0.04, C.top - 0.05, cz + 0.15), 0.012, STEEL);
    for (const sz of [-1, 1]) rod(g, v3(-cw / 2 + 0.01, C.top - 0.05, cz + sz * 0.15), v3(-cw / 2 - 0.04, C.top - 0.05, cz + sz * 0.15), 0.01, STEEL);
    label(g, '부항 · 뜸', 0.18, 0.05, 0, C.top - 0.08, cz + cd / 2 + 0.006, '#eceff1', '#6d4c41');
    // The cups' tray.
    const tr = group(g, C.tray[0], C.top, C.tray[2]);
    part(tr, rbox(0.24, 0.015, 0.18, 0.01), CHROME, 0, 0.008, 0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cup(tr, [0.026, 0.032, 0.038][i]).g.position.set(-0.075 + j * 0.075, 0.016, -0.055 + i * 0.055);
    const gunAt = pumpGun(g);
    gunAt.position.set(0.0, C.top + 0.02, 0.13);
    gunAt.rotation.set(Math.PI / 2, 0, 0.4);
    // The 뜸 box, the dish, the cotton jar, the incense, the towels.
    const mb = group(g, C.moxaBox[0], C.top, C.moxaBox[2]);
    part(mb, rbox(0.14, 0.05, 0.12, 0.008), WOOD, 0, 0.025, 0);
    part(mb, box(0.12, 0.004, 0.1), '#d7c7a1', 0, 0.051, 0, { outline: false });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) moxaCone(mb).g.position.set(-0.045 + i * 0.03, 0.052, -0.03 + j * 0.03);
    part(mb, rbox(0.14, 0.012, 0.12, 0.006), WOOD, 0, 0.1, -0.08, { rx: -1.2 });
    label(mb, '쑥뜸', 0.07, 0.03, 0, 0.026, 0.062, '#efe3c4', '#33691e');
    part(g, cyl(0.06, 0.05, 0.015, 18), '#fafafa', C.dish[0], C.top + 0.008, C.dish[2]);
    const jar = group(g, -0.23, C.top, -0.12);
    glass(jar, cyl(0.04, 0.04, 0.1, 14), 0, 0.05, 0);
    for (let i = 0; i < 5; i++) part(jar, ball(0.016), '#ffffff', Math.cos(i * 1.4) * 0.018, 0.02 + (i % 3) * 0.02, Math.sin(i * 1.4) * 0.018, { outline: false });
    part(jar, cyl(0.042, 0.042, 0.012, 14), STEEL, 0, 0.105, 0, { outline: false });
    label(jar, '알콜솜', 0.06, 0.02, 0, 0.05, 0.042, '#ffffff', '#1565c0');
    part(g, cyl(0.02, 0.02, 0.05, 10), '#795548', 0.27, C.top + 0.025, -0.12);
    for (let i = 0; i < 3; i++) part(g, cyl(0.002, 0.002, 0.14, 5), '#6d4c41', 0.265 + i * 0.006, C.top + 0.09, -0.12, { rz: (i - 1) * 0.12, outline: false });
    for (let i = 0; i < 3; i++) part(g, cyl(0.03, 0.03, 0.14, 12), i === 1 ? '#a5d6a7' : TOWEL, C.towels[0] - 0.035 + (i % 2) * 0.07, C.top + 0.03 + (i === 2 ? 0.055 : 0), C.towels[2], { rx: Math.PI / 2 });
    // Below: towels, the sharps bin, needle boxes.
    part(g, rbox(0.24, 0.14, 0.18, 0.02), TOWEL, -0.15, 0.32, cz);
    part(g, rbox(0.16, 0.16, 0.14, 0.02), '#fdd835', 0.14, 0.33, cz);
    part(g, rbox(0.165, 0.025, 0.145, 0.01), '#e53935', 0.14, 0.42, cz);
    label(g, '손상성 폐기물', 0.13, 0.03, 0.14, 0.34, cz + 0.071, '#fdd835', '#b71c1c');
    for (let i = 0; i < 2; i++) part(g, rbox(0.1, 0.05, 0.07, 0.008), '#e3f2fd', 0.14, 0.26 + i * 0.0, cz - 0.12 + i * 0.0, { outline: false });
    // The UV sterilizer: its box, the violet inside, the cups on its rack, its door.
    const st = group(g, C.steri[0], C.top, C.steri[2]);
    part(st, rbox(0.46, 0.26, 0.15, 0.015), '#fafafa', 0, 0.13, 0);
    part(st, box(0.4, 0.004, 0.11), STEEL, 0, 0.1, 0.005, { outline: false });
    for (let i = 0; i < 4; i++) cup(st, 0.03).g.position.set(-0.15 + i * 0.1, 0.104, 0.005);
    const uv = new THREE.Mesh(box(0.4, 0.004, 0.1), UV);
    uv.position.set(0, 0.23, 0.005);
    st.add(uv);
    glowing(st, ball(0.006), '#7c4dff', 0.19, 0.03, 0.076);
    label(st, 'UV 살균기', 0.1, 0.022, -0.15, 0.03, 0.076, '#fafafa', '#5e35b1');
    /** The door, hinged at its foot. */
    const door = (parent: THREE.Object3D) => {
      const d = group(parent, 0, 0.045, 0.076);
      glass(d, box(0.42, 0.17, 0.006), 0, 0.09, 0);
      part(d, box(0.42, 0.012, 0.01), '#9e9e9e', 0, 0.18, 0.0, { outline: false });
      part(d, box(0.1, 0.012, 0.02), '#616161', 0, 0.165, 0.01, { outline: false });
      return d;
    };
    const idle = group(st);
    out.idle = idle;
    door(idle);
    // In use: the door that opens, the violet light on, the cart's things in hand, the cones set out.
    const both = group(g);
    out.inUse = both;
    const use = group(both, C.steri[0], C.top, C.steri[2]);
    const liveDoor = door(use);
    ownGlow(use, box(0.39, 0.15, 0.004), '#b388ff', 0, 0.13, -0.05, 0.35);
    const hands = group(both);
    const heldCup = cup(hands);
    const swab = part(hands, ball(0.014), '#ffffff', 0, 0, 0, { outline: false });
    const dishCones = [0, 1, 2, 3, 4].map((i) => {
      const c = moxaCone(hands);
      c.g.position.set(C.dish[0] - 0.03 + (i % 3) * 0.03, C.top + 0.016, C.dish[2] - 0.015 + Math.floor(i / 3) * 0.03);
      c.tip.visible = false;
      return c;
    });
    const handCone = moxaCone(hands);
    handCone.tip.visible = false;
    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = { '*': spotAt(g, KM.CART_AT, 'stand', 'kmPrep', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = KM.prepBeat(t, ph);
      const key = KM.kmKeyOf('kmPrep', t, ph).key;
      liveDoor.rotation.x = 1.3 * KM.steriOpen(b);
      heldCup.g.visible = KM.cupInHand(b);
      heldCup.g.position.copy(vp(key.l, -0.04));
      swab.visible = b.from === 'wipe';
      swab.position.copy(vp(key.r));
      const k = KM.conesSet(b);
      dishCones.forEach((c, i) => (c.g.visible = i < k));
      handCone.g.visible = b.from === 'moxa' && (b.p * 5.5) % 1 < 0.6;
      handCone.g.position.copy(vp(key.r, -0.03));
    };
  },

  /**
   * The pouch packer (한약 파우치 포장기): a stainless cabinet with the decoction tank on its top
   * (a sight tube showing the dark brown level, the hose in from the 탕전기), the sealing head on
   * its front with a slanted chute down to a tray where the sealed pouches land, the panel (lit:
   * 120cc · 12 / 45 포), and a carton on its top filling up with pouches, the clinic's label on them.
   *
   * Packing: the start pressed; a pouch slides down the chute and is caught, held up to check the
   * seal, squeezed, laid in the carton; the carton's label smoothed down.
   */
  kmPouchPacker(g, _W, _D, _c, _def, _ctx, out) {
    const K = KM.PACK;
    const bz = -0.08;
    part(g, rbox(0.62, 0.95, 0.46, 0.02), CHROME, 0, 0.475, bz);
    part(g, box(0.6, 0.05, 0.44), STEEL, 0, 0.025, bz, { outline: false });
    part(g, box(0.004, 0.6, 0.42), STEEL, 0.0, 0.4, bz + 0.002, { outline: false });
    label(g, '한약 자동 포장기', 0.26, 0.045, -0.12, 0.66, bz + 0.232, '#eceff1', '#37474f');
    // The tank on top, its sight tube and the hose.
    part(g, cyl(0.14, 0.14, 0.3, 20), CHROME, -0.14, 1.1, -0.14);
    part(g, cyl(0.145, 0.145, 0.025, 20), STEEL, -0.14, 1.26, -0.14);
    part(g, cyl(0.03, 0.03, 0.04, 10), STEEL, -0.14, 1.29, -0.14, { outline: false });
    glass(g, cyl(0.012, 0.012, 0.26, 8), -0.02, 1.1, -0.03);
    part(g, cyl(0.008, 0.008, 0.16, 8), DECOCTION, -0.02, 1.05, -0.03, { outline: false });
    rod(g, v3(-0.26, 1.2, -0.14), v3(-0.38, 1.24, -0.28), 0.02, '#cfd8dc');
    rod(g, v3(-0.38, 1.24, -0.28), v3(-0.44, 0.9, -0.36), 0.02, '#cfd8dc');
    // The sealing head, the chute, the tray at its foot with pouches in it.
    part(g, rbox(0.3, 0.1, 0.12, 0.02), '#eceff1', K.chuteTop[0], 0.93, 0.16);
    part(g, box(0.24, 0.012, 0.02), '#ff7043', K.chuteTop[0], 0.89, 0.22, { outline: false });
    const chute = new THREE.Vector3().subVectors(vp(K.chuteFoot), vp(K.chuteTop));
    const chuteM = part(g, box(0.18, 0.008, chute.length() + 0.06), STEEL, (K.chuteTop[0] + K.chuteFoot[0]) / 2, (K.chuteTop[1] + K.chuteFoot[1]) / 2 - 0.01, (K.chuteTop[2] + K.chuteFoot[2]) / 2);
    const slope = Math.atan2(K.chuteTop[1] - K.chuteFoot[1], K.chuteFoot[2] - K.chuteTop[2]);
    chuteM.rotation.x = slope;
    for (const sx of [-1, 1]) {
      const side = part(g, box(0.008, 0.04, chute.length() + 0.06), STEEL, K.chuteTop[0] + sx * 0.09, (K.chuteTop[1] + K.chuteFoot[1]) / 2 + 0.01, (K.chuteTop[2] + K.chuteFoot[2]) / 2, { outline: false });
      side.rotation.x = slope;
    }
    part(g, rbox(0.3, 0.06, 0.2, 0.01), CHROME, K.chuteFoot[0], K.chuteFoot[1] - 0.04, K.chuteFoot[2] - 0.02);
    const pouchTex = painted('kmPouch', 96, 128, paintPouch);
    /** A sealed pouch lying flat (its middle at the origin). */
    const pouch = (parent: THREE.Object3D) => {
      const p = group(parent);
      part(p, rbox(0.1, 0.012, 0.14, 0.004), '#c8b28a', 0, 0, 0);
      flat(p, pouchTex, 0.09, 0.12, 0, 0.0065, 0);
      part(p, box(0.1, 0.004, 0.012), '#a68e62', 0, 0.007, -0.07, { outline: false });
      return p;
    };
    for (let i = 0; i < 3; i++) {
      const p = pouch(g);
      p.position.set(K.chuteFoot[0] - 0.06 + i * 0.05, K.chuteFoot[1] - 0.005 + i * 0.012, K.chuteFoot[2] - 0.03);
      p.rotation.y = (i - 1) * 0.3;
    }
    // The panel.
    part(g, rbox(0.17, 0.13, 0.03, 0.01), '#37474f', K.panel[0], K.panel[1], bz + 0.235);
    const screen = litScreen(g, painted('kmPackPanel', 256, 128, paintPackPanel), 0.13, 0.065, K.panel[0], K.panel[1] + 0.02, bz + 0.252);
    out.screen = screen;
    for (const [i, col] of ['#43a047', '#e53935'].entries()) part(g, cyl(0.012, 0.012, 0.012, 10), col, K.panel[0] - 0.03 + i * 0.06, K.panel[1] - 0.04, bz + 0.252, { rx: Math.PI / 2, outline: false });
    // The carton on top, pouches standing in it.
    const ct = group(g, K.carton[0], 0.95, K.carton[2]);
    part(ct, box(0.22, 0.16, 0.2), '#c8a165', 0, 0.08, 0);
    part(ct, box(0.2, 0.002, 0.18), '#8d6e42', 0, 0.15, 0, { outline: false });
    for (const sx of [-1, 1]) part(ct, box(0.004, 0.08, 0.2), '#c8a165', sx * 0.13, 0.19, 0, { rz: sx * 0.6 });
    for (let i = 0; i < 6; i++) part(ct, rbox(0.012, 0.13, 0.1, 0.004), '#c8b28a', -0.08 + i * 0.03, 0.12, -0.02);
    label(ct, `${CLINIC} · 1일 3회 식후 30분`, 0.2, 0.04, 0, 0.07, 0.101, '#fff8e1', '#5d4037');
    // In use: the pouch on its way.
    const use = group(g);
    out.inUse = use;
    const live = pouch(use);
    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = { '*': spotAt(g, KM.PACK_AT, 'stand', 'kmPack', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = KM.packBeat(t, ph);
      const key = KM.kmKeyOf('kmPack', t, ph).key;
      const w = KM.pouchWhere(b);
      live.visible = w.chute >= 0;
      if (w.held) {
        live.position.copy(vp(KM.mixP(key.l, key.r, 0.5), -0.02));
        live.rotation.set(1.3, 0, 0);
      } else if (w.chute >= 0) {
        live.position.copy(vp(KM.mixP(K.chuteTop, K.chuteFoot, w.chute), 0.01));
        live.rotation.set(w.chute < 1 ? slope : 0, 0, 0);
      }
    };
  },

  /**
   * The 약연 · 작두 corner: a low walnut 평상 with two 방석 cushions, back to back — at the left the
   * 작두 (herb cutter: a heavy board, the iron blade on its hinge, the wooden handle) with roots to
   * feed it and a 소쿠리 of cut slices; at the right the cast-iron 약연 (a boat-shaped trough and its
   * wheel on a wooden axle) with powder in its groove, a brass bowl and a brush; baskets of dried
   * herbs along the back.
   *
   * Sat cross-legged on a cushion: at the 작두 the handle lifted and brought down in a steady
   * rhythm, the left hand feeding the root under the blade, the slices swept into the basket; at the
   * 약연 the wheel rolled up and down the trough with both hands on its axle, the powder brushed out.
   */
  kmHerbGrinder(g, _W, _D, _c, _def, _ctx, out) {
    const G = KM.GRIND;
    // The 평상 and its cushions.
    part(g, rbox(1.94, 0.06, 0.9, 0.015), OAK, 0, G.top - 0.03, 0);
    for (let i = 0; i < 6; i++) part(g, box(1.94, 0.002, 0.004), '#a57c4f', 0, G.top + 0.001, -0.37 + i * 0.15, { outline: false });
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) part(g, rbox(0.06, G.top - 0.06, 0.06, 0.01), WALNUT, sx * 0.9, (G.top - 0.06) / 2, sz * 0.38);
    part(g, box(1.9, 0.06, 0.02), WALNUT, 0, G.top - 0.09, 0.43);
    for (const [s, col] of [[KM.CUT_AT, '#8e2430'], [KM.GRIND_AT, '#1e5f74']] as Array<[KM.SpotAt, string]>) {
      part(g, rbox(0.34, 0.045, 0.4, 0.02), col, s.x, G.top + 0.022, s.z);
      part(g, box(0.3, 0.002, 0.36), '#efe3c4', s.x, G.top + 0.046, s.z, { outline: false });
      part(g, box(0.26, 0.003, 0.32), col, s.x, G.top + 0.047, s.z, { outline: false });
    }
    // Baskets of dried herbs along the back.
    for (const [x, col] of [[-0.35, '#d9b27c'], [0.0, '#e6c860'], [0.35, '#8a6d4b']] as Array<[number, string]>) {
      part(g, cyl(0.15, 0.12, 0.05, 18), '#c8a165', x, G.top + 0.025, -0.3);
      for (let i = 0; i < 7; i++) part(g, box(0.05, 0.01, 0.03), col, x + Math.cos(i * 2.1) * 0.07, G.top + 0.055 + (i % 2) * 0.01, -0.3 + Math.sin(i * 2.1) * 0.06, { ry: i, outline: false });
    }
    // The 작두: its board, the hinge, the roots, the basket of slices.
    const Kn = G.knife;
    part(g, rbox(0.15, Kn.base - G.top, 0.68, 0.015), '#6d4c41', Kn.x, (Kn.base + G.top) / 2, Kn.hinge - 0.3);
    part(g, box(0.05, 0.08, 0.05), '#424242', Kn.x, Kn.base + 0.03, Kn.hinge);
    part(g, box(0.004, 0.01, 0.55), '#9e9e9e', Kn.x + 0.03, Kn.base + 0.002, Kn.hinge - 0.3, { outline: false });
    for (let i = 0; i < 3; i++) part(g, cyl(0.014, 0.012, 0.2, 8), '#a1887f', Kn.x + 0.12 + i * 0.01, Kn.base - 0.06 + i * 0.026, 0.28 + i * 0.03, { rz: Math.PI / 2, ry: 0.2 * i });
    part(g, cyl(0.13, 0.11, 0.04, 18), '#c8a165', -0.48, G.top + 0.02, 0.28);
    for (let i = 0; i < 9; i++) part(g, cyl(0.014, 0.014, 0.005, 10), '#d7b98e', -0.48 + Math.cos(i * 1.9) * 0.06, G.top + 0.045 + (i % 3) * 0.004, 0.28 + Math.sin(i * 1.9) * 0.05, { outline: false });
    /** The blade on its hinge (lifted `a` radians: rotation.x). */
    const blade = (parent: THREE.Object3D) => {
      const b = group(parent, Kn.x, Kn.base + 0.03, Kn.hinge);
      part(b, box(0.012, 0.07, Kn.len - 0.1), '#455a64', 0, -0.01, -(Kn.len - 0.1) / 2);
      part(b, box(0.013, 0.012, Kn.len - 0.1), '#cfd8dc', 0, -0.045, -(Kn.len - 0.1) / 2, { outline: false });
      part(b, cyl(0.022, 0.022, 0.16, 10), '#8d6e63', 0, 0.0, -Kn.len + 0.04, { rx: Math.PI / 2 });
      return b;
    };
    // The 약연: its trough, the powder, the bowl and the brush.
    const Y = G.yakyeon;
    part(g, rbox(0.46, 0.08, 0.17, 0.03), '#3e3a39', Y.x, G.top + 0.05, Y.z);
    for (const sx of [-1, 1]) part(g, rbox(0.08, 0.06, 0.16, 0.02), '#3e3a39', Y.x + sx * 0.22, G.top + 0.1, Y.z, { rz: -sx * 0.4 });
    part(g, box(0.38, 0.004, 0.05), '#1b1918', Y.x, G.top + 0.091, Y.z, { outline: false });
    part(g, box(0.3, 0.004, 0.04), '#c9a77a', Y.x, G.top + 0.094, Y.z, { outline: false });
    part(g, cyl(0.06, 0.045, 0.05, 16), BRASS, Y.x + 0.02, G.top + 0.025, Y.z - 0.22);
    part(g, cyl(0.05, 0.05, 0.01, 16), '#c9a77a', Y.x + 0.02, G.top + 0.045, Y.z - 0.22, { outline: false });
    part(g, rbox(0.03, 0.012, 0.09, 0.005), WOOD, Y.x - 0.12, G.top + 0.006, Y.z - 0.2, { ry: 0.5 });
    /** The wheel on its axle (rolled: rotation.z). */
    const wheel = (parent: THREE.Object3D) => {
      const w = group(parent, Y.x, Y.y, Y.z);
      part(w, cyl(Y.r, Y.r, 0.03, 20), '#4e4a48', 0, 0, 0, { rx: Math.PI / 2 });
      part(w, cyl(Y.r * 0.45, Y.r * 0.45, 0.034, 12), '#6d6866', 0, 0, 0, { rx: Math.PI / 2, outline: false });
      part(w, cyl(0.014, 0.014, 0.34, 8), '#8d6e63', 0, 0, 0, { rx: Math.PI / 2 });
      for (const sz of [-1, 1]) part(w, cyl(0.02, 0.02, 0.07, 8), '#6d4c41', 0, 0, sz * 0.14, { rx: Math.PI / 2 });
      return w;
    };
    const idle = group(g);
    out.idle = idle;
    blade(idle).rotation.x = 0.45;
    wheel(idle);
    const use = group(g);
    out.inUse = use;
    const liveBlade = blade(use);
    const liveWheel = wheel(use);
    const mark = marker(g, 0, 0.5, 0);
    const spots: Record<string, Spot> = {
      kmCutHerbs: spotAt(g, KM.CUT_AT, 'sit', 'kmCut', mark, true),
      kmGrindHerbs: spotAt(g, KM.GRIND_AT, 'sit', 'kmGrind', mark, true),
      '*': spotAt(g, KM.CUT_AT, 'sit', 'kmCut', mark, true),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const now = nowAt(spots, t);
      const cutting = !now || spots[now].motion === 'kmCut';
      liveBlade.rotation.x = cutting ? KM.knifeLift(t, ph) : 0.45;
      const w = KM.wheelAt(t, ph);
      liveWheel.position.x = cutting ? Y.x : w.x;
      liveWheel.rotation.z = cutting ? 0 : w.turn;
    };
  },

  /**
   * The 동의보감 bookcase: a walnut 책장 with brass fittings and two cupboard doors below — the
   * thread-bound 東醫寶鑑 volumes stacked flat on the top shelf, the textbooks (본초학, 방제학,
   * 침구학, 상한론, 황제내경…) upright on the next, specimen jars of 인삼, 녹용 and 구기자 on the
   * third; the acupuncture figure (동인형) and an orchid on top, the 經穴圖 chart hung at its side.
   *
   * Looking something up: stood at it reading the volume taken down.
   */
  kmDonguiShelf(g, W, _D, _c, _def, _ctx, out) {
    const wide = W > 1.5;
    const w = wide ? 1.86 : 0.9;
    const z = -0.3;
    const d = 0.36;
    part(g, rbox(w, 1.84, d, 0.02), WALNUT, 0, 0.92, z);
    part(g, box(w - 0.08, 1.46, 0.01), WALNUT_D, 0, 1.13, z + d / 2 - 0.02, { outline: false });
    part(g, rbox(w + 0.06, 0.06, d + 0.04, 0.015), WALNUT_D, 0, 1.87, z);
    // The shelves.
    for (const y of [0.42, 0.82, 1.22]) part(g, box(w - 0.06, 0.03, d - 0.04), WALNUT, 0, y, z + 0.01);
    // The cupboard doors below, with brass hinges and a round lock plate.
    for (const sx of [-1, 1]) {
      part(g, rbox(w / 2 - 0.05, 0.34, 0.02, 0.01), '#6d4c41', sx * (w / 4), 0.22, z + d / 2 + 0.005);
      for (const y of [0.1, 0.34]) plate(g, sx * (w / 2 - 0.04), y, z + d / 2 + 0.018, 0.04);
    }
    part(g, cyl(0.04, 0.04, 0.006, 16), BRASS, 0, 0.24, z + d / 2 + 0.018, { rx: Math.PI / 2, outline: false });
    part(g, box(0.02, 0.06, 0.01), BRASS, 0, 0.24, z + d / 2 + 0.024, { outline: false });
    // The 동의보감 stacks: thread-bound, yellow-brown, a white title slip on each.
    const n = wide ? 4 : 2;
    for (let s = 0; s < n; s++) {
      const x = -w / 2 + 0.2 + s * ((w - 0.4) / Math.max(1, n - 1));
      for (let i = 0; i < 5; i++) {
        const y = 1.24 + i * 0.03;
        part(g, rbox(0.2, 0.026, 0.28, 0.004), i % 2 ? '#d9b97e' : '#cfae6e', x + (i % 2) * 0.006, y + 0.013, z + 0.02, { ry: (i % 3) * 0.03 });
        part(g, box(0.004, 0.027, 0.28), '#6d4c41', x - 0.098, y + 0.013, z + 0.02, { outline: false });
      }
      label(g, '東醫寶鑑', 0.05, 0.13, x + 0.05, 1.391, z + 0.02, '#fbf7ec', '#3e2723').rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    }
    label(g, '동의보감 · 허준 (1610)', 0.34, 0.05, 0, 1.3, z + d / 2 + 0.004, '#efe3c4', '#4e342e');
    // The textbooks, upright.
    const titles: Array<[string, string]> = [['본초학', '#2e7d32'], ['방제학', '#6a1b9a'], ['침구학', '#c62828'], ['상한론', '#1565c0'], ['황제내경', '#4e342e'], ['한방내과학', '#00695c'], ['사상의학', '#ef6c00'], ['경혈학', '#283593'], ['진단학', '#5d4037'], ['한방부인과', '#ad1457'], ['추나의학', '#37474f'], ['약리학', '#558b2f']];
    const count = wide ? titles.length : 6;
    for (let i = 0; i < count; i++) {
      const [s, col] = titles[i];
      const x = -w / 2 + 0.1 + i * ((w - 0.2) / count);
      const h = 0.26 + ((i * 7) % 4) * 0.02;
      part(g, box(0.05, h, 0.22), col, x, 0.835 + h / 2, z + 0.02);
      label(g, s, h * 0.8, 0.034, x, 0.835 + h / 2, z + 0.131, col, '#fff8e1').rotation.set(0, 0, Math.PI / 2);
    }
    // Specimen jars.
    const jars: Array<[string, string]> = [['인삼', '#e6c88e'], ['녹용', '#a1665e'], ['구기자', '#c62828'], ['대추', '#6d1b1b'], ['감초', '#e6c860']];
    for (let i = 0; i < (wide ? 5 : 3); i++) {
      const [s, col] = jars[i];
      const x = -w / 2 + 0.2 + i * ((w - 0.4) / Math.max(1, (wide ? 5 : 3) - 1));
      for (let j = 0; j < 5; j++) part(g, ball(0.02), col, x + Math.cos(j * 1.7) * 0.025, 0.47 + (j % 3) * 0.03, z + 0.02 + Math.sin(j * 1.7) * 0.025, { outline: false });
      glass(g, cyl(0.055, 0.055, 0.16, 16), x, 0.515, z + 0.02);
      part(g, cyl(0.058, 0.058, 0.02, 16), WALNUT_D, x, 0.605, z + 0.02, { outline: false });
      label(g, s, 0.07, 0.025, x, 0.5, z + 0.077, '#fbf7ec', '#3e2723');
    }
    // On top: the 동인형 (acupuncture figure) on its stand, an orchid.
    const fig = group(g, wide ? -0.55 : -0.2, 1.9, z + 0.02);
    part(fig, cyl(0.07, 0.08, 0.03, 16), WALNUT_D, 0, 0.015, 0);
    for (const sx of [-1, 1]) part(fig, cyl(0.016, 0.014, 0.2, 8), '#e8cfa8', sx * 0.025, 0.13, 0);
    part(fig, rbox(0.1, 0.17, 0.06, 0.03), '#e8cfa8', 0, 0.31, 0);
    part(fig, ball(0.04), '#e8cfa8', 0, 0.44, 0);
    for (const sx of [-1, 1]) part(fig, cyl(0.012, 0.01, 0.17, 8), '#e8cfa8', sx * 0.07, 0.3, 0, { rz: sx * 0.15 });
    for (const sx of [-1, 0, 1]) part(fig, box(0.003, 0.32, 0.003), '#c62828', sx * 0.02, 0.24, 0.031, { outline: false });
    for (let i = 0; i < 8; i++) part(fig, ball(0.005), '#1a237e', (i % 2 ? 1 : -1) * 0.02, 0.1 + i * 0.04, 0.033, { outline: false });
    if (wide) {
      const pot = group(g, 0.55, 1.9, z + 0.02);
      part(pot, cyl(0.07, 0.05, 0.1, 14), '#eceff1', 0, 0.05, 0);
      for (let i = 0; i < 6; i++) part(pot, box(0.012, 0.004, 0.24), '#2e7d32', 0, 0.14, 0, { ry: i * 0.55, rx: 0.5, outline: false });
      for (let i = 0; i < 3; i++) part(pot, ball(0.02), '#f8bbd0', -0.06 + i * 0.05, 0.28 + (i % 2) * 0.03, 0.05, { outline: false });
    }
    // The 經穴圖 chart hung on its right side.
    part(g, rbox(0.012, 0.6, 0.32, 0.004), WALNUT_D, w / 2 + 0.008, 1.3, z);
    picture(g, painted('kmPointChart', 160, 320, paintChartPoster), 0.28, 0.56, w / 2 + 0.016, 1.3, z, '#ffffff', Math.PI / 2);
    const mark = marker(g, 0.3, 1.0, 0.1);
    const spots: Record<string, Spot> = { '*': spotAt(g, { x: 0.32, y: 0, z: 0.62, yaw: 0.35 }, 'stand', 'read', mark) };
    out.spots = spots;
  },

  /**
   * The 대추차 table in the waiting room: a little walnut table with a shelf under it, the stainless
   * urn (대추차, its tap and lever) on a stand, a stack of paper cups, a bowl of dried 대추, a
   * basket of 쌍화차 sticks, a tissue box and a tent card asking people to help themselves.
   *
   * Pouring for someone waiting: a cup off the stack, held under the tap as the lever's pressed,
   * held out to them; the table wiped.
   */
  kmTeaStand(g, _W, _D, _c, _def, _ctx, out) {
    const T = KM.TEA;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.04, T.top - 0.03, 0.04, 0.01), WALNUT_D, sx * 0.31, (T.top - 0.03) / 2, -0.05 + sz * 0.19);
    part(g, rbox(0.7, 0.035, 0.46, 0.012), WALNUT, 0, T.top - 0.017, -0.05);
    part(g, box(0.64, 0.02, 0.4), WALNUT, 0, 0.18, -0.05);
    part(g, rbox(0.3, 0.12, 0.2, 0.01), '#d7b98e', 0.12, 0.25, -0.05);
    label(g, '대추차 리필', 0.2, 0.04, 0.12, 0.26, 0.052, '#d7b98e', '#6d1b1b');
    // The urn on its stand, its tap and lever.
    part(g, rbox(0.2, 0.06, 0.2, 0.01), '#eceff1', T.tap[0], T.top + 0.03, -0.08);
    part(g, cyl(0.1, 0.1, 0.3, 20), CHROME, T.tap[0], T.top + 0.21, -0.08);
    part(g, cyl(0.104, 0.104, 0.03, 20), '#424242', T.tap[0], T.top + 0.375, -0.08);
    part(g, ball(0.02), '#424242', T.tap[0], T.top + 0.4, -0.08, { outline: false });
    part(g, cyl(0.012, 0.012, 0.07, 8), '#424242', T.tap[0], T.tap[1], T.tap[2] - 0.03, { rx: Math.PI / 2 });
    part(g, cyl(0.008, 0.008, 0.025, 8), '#424242', T.tap[0], T.tap[1] - 0.015, T.tap[2], { outline: false });
    part(g, box(0.02, 0.05, 0.012), '#212121', T.tap[0], T.tap[1] + 0.03, T.tap[2] - 0.01, { outline: false });
    label(g, '대추차', 0.12, 0.05, T.tap[0], T.top + 0.24, 0.022, '#8e2430', '#fff8e1');
    // The cups, the 대추 bowl, the 쌍화차 basket, the tissues, the card.
    for (let i = 0; i < 6; i++) part(g, cyl(0.032, 0.025, 0.06, 12), '#fafafa', T.cups[0], T.top + 0.03 + i * 0.018, T.cups[2], { outline: i === 5 });
    part(g, cyl(0.07, 0.05, 0.04, 16), '#eceff1', 0.2, T.top + 0.02, 0.1);
    for (let i = 0; i < 7; i++) part(g, ball(0.017), '#7b1f1f', 0.2 + Math.cos(i * 1.8) * 0.035, T.top + 0.04 + (i % 2) * 0.012, 0.1 + Math.sin(i * 1.8) * 0.03, { outline: false });
    part(g, rbox(0.12, 0.05, 0.08, 0.01), '#c8a165', 0.0, T.top + 0.025, 0.1);
    for (let i = 0; i < 5; i++) part(g, box(0.012, 0.09, 0.05), i % 2 ? '#c62828' : '#6d4c41', -0.04 + i * 0.02, T.top + 0.07, 0.1, { outline: false });
    part(g, rbox(0.12, 0.07, 0.07, 0.01), '#e3f2fd', 0.24, T.top + 0.035, -0.18);
    const tent = group(g, -0.2, T.top, 0.11, 0.2);
    for (const sz of [-1, 1]) part(tent, box(0.18, 0.1, 0.003), '#fff8e1', 0, 0.045, sz * 0.02, { rx: sz * 0.4, outline: false });
    picture(tent, painted('kmTeaSign', 256, 128, paintTeaSign), 0.17, 0.085, 0, 0.046, 0.04, '#ffffff', 0, -0.4);
    // In use: the cup, the stream.
    const use = group(g);
    out.inUse = use;
    const cupG = group(use);
    part(cupG, cyl(0.032, 0.025, 0.07, 12), '#fafafa', 0, 0.035, 0);
    const tea = part(cupG, cyl(0.029, 0.029, 0.004, 12), '#8d4b2b', 0, 0.01, 0, { outline: false });
    const stream = limb(use, 0.005, '#8d4b2b', BROTH);
    const streamM = use.children[use.children.length - 1];
    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = { '*': spotAt(g, KM.TEA_AT, 'stand', 'kmTea', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = KM.teaBeat(t, ph);
      const key = KM.kmKeyOf('kmTea', t, ph).key;
      cupG.visible = KM.teaCupHeld(b);
      cupG.position.copy(vp(key.r, -0.035));
      const f = KM.teaFill(b);
      tea.position.y = 0.01 + 0.05 * f;
      tea.visible = f > 0.05;
      streamM.visible = KM.teaPouring(b);
      if (streamM.visible) stream(v3(T.tap[0], T.tap[1] - 0.03, T.tap[2]), v3(T.tap[0], key.r[1] + 0.02, T.tap[2] + 0.0));
    };
  },
};
