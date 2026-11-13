import * as THREE from 'three';
import type { Motion } from '../activity';
import type { HeldTool } from '../handTool';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, caster, glass, glowing, label, litScreen, painted, picture, ring, seeded, text, type Paint } from './doctor';
import * as CW from './careWorkerMotion';

/**
 * The 요양원 drawn as itself (2026-10-27 workplace pipeline, at the user's request): warm and
 * dignified, a home where the people being cared for are always there, in their beds and at the day
 * room's table, and are treated gently. The electric care bed with its resident (asleep under the
 * blanket, or sat up awake), raised to the carer's waist for care, its near rail let down, the
 * backrest run up with the pendant; the meal cart with the 죽 warmer and the covered trays, a
 * resident in a wheelchair at a little table helped to eat; the walking rail along the wall with
 * its marked lane, a resident walked along it with a walker or stood up to it from the wheelchair.
 * And what it was missing (workFurniture/careWorker.ts): the medication cart (each resident's
 * drawer, the 요일 pill box, the blood pressure monitor on its side shelf), the 생활실 activity table
 * (화투 on the green blanket, colouring), the 노래 교실 corner, the 추억의 사진관 memory wall, the
 * care station with its nurse call panel, and a spare wheelchair.
 *
 * The home (햇살요양원), its residents and its staff are made up. The carer's hands and the resident's
 * go by one clock (careWorkerMotion.ts), so the resident rolls as the carer pushes, opens their mouth
 * for the spoon, takes the cup handed to them.
 */

const HOME = '햇살요양원';
const TEAL = '#00897b';
const OAK = '#d9bf94';
const OAK_DARK = '#a8875e';
const PAPER = '#fbfaf5';
const SHEET = '#f4f7f8';
const FRAME = '#cfd8dc';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vp = (p: CW.P, dy = 0) => new THREE.Vector3(p[0], p[1] + dy, p[2]);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const frac = (x: number) => ((x % 1) + 1) % 1;

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
/** A spot from the motions' table, and what's done there; `work` is the piece's clock mark. */
function spotAt(g: THREE.Object3D, s: CW.SpotAt, how: 'sit' | 'stand', motion: Motion, work?: THREE.Object3D): Spot {
  const sp = spot(g, how, s.x, s.y, s.z, s.yaw, how === 'sit' ? s.y : undefined);
  sp.work = work;
  sp.motion = motion;
  return sp;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Which of a piece's uses is going on now (the spot a dweller's been posed at just now, the latest). */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const tmp = new THREE.Vector3();
const phaseOf = (m: THREE.Object3D) => CW.carePhase(m.getWorldPosition(tmp));
/** Eases a value towards a target over a fraction of a second. */
const ease = (cur: number, to: number, dt: number, rate = 4) => cur + (to - cur) * (1 - Math.exp(-dt * rate));

/** A cylinder stretched between two points each frame (an arm, a leg, a tube). */
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
/** A sheet lying flat on a top, readable from +z (turned `ry` about the vertical). */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A lit part with a material of its own (its colour changes, its visibility flashes). */
function ownGlow(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** Steam off the 죽 warmer (see-through, shared). */
const STEAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false });
/** Points something's +z along a direction (in its parent's frame). */
const aim = (o: THREE.Object3D, dir: THREE.Vector3) => o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());

// ---------------------------------------------------------------------------------------------
// People drawn in: the residents (in bed, in a wheelchair, at the table, walking), a senior carer.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'perm' | 'grey' | 'bun' | 'bald' | 'short';
  skin?: string;
  shoes?: string;
  glasses?: boolean;
  /** Stripes across the top (a 생활복's). */
  stripe?: string;
  /** A cardigan over it. */
  cardigan?: string;
  /** A carer's name badge. */
  badge?: string;
}
const SKIN = '#ecc6a3';
const LOOKS = {
  soonja: { top: '#f8d7e3', stripe: '#efb6c8', bottom: '#c7a3b5', hair: '#d6d3cf', hairdo: 'perm', shoes: '#f5f5f5' } as Look,
  youngchul: { top: '#d6e9f8', stripe: '#a9cbe8', bottom: '#8fa3b5', hair: '#e2e2e2', hairdo: 'bald', glasses: true, shoes: '#eceff1' } as Look,
  malsoon: { top: '#e3f0d3', stripe: '#bcd9a2', bottom: '#9aa58a', hair: '#c9c6c0', hairdo: 'bun', shoes: '#f5f5f5' } as Look,
  bokrye: { top: '#efe6f6', bottom: '#6d5e7a', hair: '#a8a4a0', hairdo: 'perm', cardigan: '#9575cd', glasses: true, shoes: '#6d4c41' } as Look,
  mansuk: { top: '#efe8df', bottom: '#5d5d66', hair: '#dcdcdc', hairdo: 'grey', cardigan: '#8d6e63', shoes: '#4e342e' } as Look,
  geumja: { top: '#fff1d6', stripe: '#f3d29b', bottom: '#8d7b68', hair: '#bdbab4', hairdo: 'perm', shoes: '#795548' } as Look,
  senior: { top: '#4db6ac', bottom: '#4db6ac', hair: '#3b2a20', hairdo: 'short', skin: '#f1cfb0', shoes: '#fafafa', badge: '방미경' } as Look,
};

interface Fig {
  root: THREE.Group;
  upper: THREE.Group;
  head: THREE.Group;
  /** Sat (1) or stood (0), on a seat this high; leant forward; walking (0–1) at this point of the stride; knees drawn up. */
  pose(sit: number, seat?: number, lean?: number, walk?: number, stride?: number, kneeUp?: number): void;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  mouth(open: number): void;
  eyes(shut: boolean): void;
  /** The left arm's sleeve pushed up to the elbow (the next time it's posed). */
  sleeveL(up: boolean): void;
}
/**
 * Someone drawn in, built stood with the feet at the origin facing +z (turn and move `root`; for
 * someone lying, root.rotation.x = -π/2 and `upper` turns at the hips for a backrest). The legs and
 * arms are worked out each pose, so they sit, stand up, walk, lie.
 */
function figure(parent: THREE.Object3D, look: Look): Fig {
  const root = group(parent);
  root.rotation.order = 'XYZ';
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#8d6e63';
  const sleeve = look.cardigan ?? look.top;
  const legs = [1, -1].map((sx) => ({ sx, thigh: limb(root, 0.062, look.bottom), shin: limb(root, 0.052, look.bottom), shoe: part(root, rbox(0.095, 0.07, 0.21, 0.03), shoes, 0, 0, 0) }));
  const pelvis = part(root, rbox(0.31, 0.16, 0.24, 0.06), look.bottom, 0, 0.85, 0);
  const upper = group(root, 0, 0.84, 0);
  part(upper, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 0.27, 0);
  if (look.stripe) for (let i = 0; i < 4; i++) part(upper, box(0.346, 0.024, 0.216), look.stripe, 0, 0.1 + i * 0.1, 0, { outline: false });
  if (look.cardigan) {
    for (const sx of [-1, 1]) part(upper, rbox(0.13, 0.44, 0.226, 0.05), look.cardigan, sx * 0.11, 0.26, 0);
    for (let i = 0; i < 4; i++) part(upper, ball(0.011), '#f5f0e6', 0.05, 0.4 - i * 0.09, 0.114, { outline: false });
  }
  if (look.badge) {
    label(upper, look.badge, 0.08, 0.026, -0.09, 0.4, 0.107, '#ffffff', '#00695c');
    part(upper, box(0.004, 0.06, 0.004), '#ffffff', 0.08, 0.36, 0.106, { outline: false });
  }
  part(upper, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.53, 0, { outline: false });
  const head = group(upper, 0, 0.67, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  const eyesM = [1, -1].map((sx) => part(head, box(0.022, 0.016, 0.006), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false }));
  for (const sx of [-1, 1]) part(head, ball(0.018), '#f2a7a0', sx * 0.065, -0.03, 0.088, { outline: false }).scale.set(1, 0.6, 0.4);
  const mouthM = part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'perm': {
      // The 뽀글 perm: tight curls all over.
      part(head, ball(0.118), look.hair, 0, 0.035, -0.025);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        part(head, ball(0.045), look.hair, Math.cos(a) * 0.08, 0.08 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.07, { outline: false });
      }
      part(head, ball(0.05), look.hair, 0, 0.12, -0.01, { outline: false });
      break;
    }
    case 'bun':
      // Grey hair drawn back into a 쪽, a 비녀 through it.
      part(head, ball(0.116), look.hair, 0, 0.028, -0.03);
      part(head, ball(0.052), look.hair, 0, 0.0, -0.13);
      part(head, cyl(0.006, 0.006, 0.16, 6), '#6d4c41', 0, 0.0, -0.135, { rz: Math.PI / 2, outline: false });
      break;
    case 'bald':
      part(head, ball(0.05), look.hair, 0.095, -0.0, -0.035, { outline: false });
      part(head, ball(0.05), look.hair, -0.095, -0.0, -0.035, { outline: false });
      part(head, ball(0.075), look.hair, 0, -0.02, -0.07, { outline: false });
      break;
    case 'grey':
      part(head, ball(0.117), look.hair, 0, 0.02, -0.035);
      part(head, ball(0.1), skin, 0, 0.05, 0.022, { outline: false });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
      part(head, rbox(0.06, 0.16, 0.06, 0.03), look.hair, 0, -0.03, -0.12, { rx: 0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#5d4037', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#5d4037', 0, 0.002, 0.112, { outline: false });
  }
  let sitNow = 0;
  let bareL = false;
  const m4 = new THREE.Matrix4();
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 0.47, 0);
    const upperArm = limb(upper, 0.042, sleeve);
    const fore = limb(upper, 0.035, sleeve);
    const hand = part(upper, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    const cuffEnd = new THREE.Vector3();
    let bare: ReturnType<typeof limb> | null = null;
    let cuff: ReturnType<typeof limb> | null = null;
    let bareMesh: THREE.Object3D | null = null;
    let cuffMesh: THREE.Object3D | null = null;
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
      if (sx > 0 && (bareL || bare)) {
        if (!bare) {
          bare = limb(upper, 0.037, skin);
          bareMesh = upper.children[upper.children.length - 1];
          cuff = limb(upper, 0.046, sleeve);
          cuffMesh = upper.children[upper.children.length - 1];
        }
        bareMesh!.visible = cuffMesh!.visible = bareL;
        bare(elbow, loc);
        cuff!(elbow, cuffEnd.copy(elbow).lerp(loc, 0.14));
      }
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  const hip = new THREE.Vector3();
  const knee = new THREE.Vector3();
  const ankle = new THREE.Vector3();
  const pose = (sit: number, seat = 0.46, lean = 0, walk = 0, stride = 0, kneeUp = 0) => {
    sitNow = sit;
    const hipY = mix(0.84, seat + 0.07, sit);
    const hz = mix(0, -0.03, sit);
    pelvis.position.set(0, hipY + 0.01, hz);
    upper.position.set(0, hipY, hz);
    upper.rotation.x = lean;
    for (const L of legs) {
      const ph = stride + (L.sx > 0 ? 0 : Math.PI);
      const sw = Math.sin(ph) * walk;
      const lift = Math.max(0, Math.cos(ph)) * walk;
      hip.set(L.sx * 0.09, hipY, hz);
      knee.set(L.sx * 0.09, 0.47 + 0.03 * lift, 0.03 + 0.06 * sw + 0.04 * lift);
      ankle.set(L.sx * 0.09, 0.08 + 0.05 * lift, 0.01 + 0.12 * sw);
      knee.lerp(v3(L.sx * 0.1, seat + 0.06 + kneeUp, 0.36 - 0.1 * kneeUp), sit);
      ankle.lerp(v3(L.sx * 0.1, Math.max(0.07, seat + 0.06 - 0.4), 0.4 - 0.08 * kneeUp), sit);
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
    mouth: (open) => {
      mouthM.scale.set(1 - 0.3 * open, 1 + 3.2 * open, 1);
    },
    eyes: (shut) => eyesM.forEach((e) => e.scale.set(1, shut ? 0.22 : 1, 1)),
    sleeveL: (up) => {
      bareL = up;
    },
  };
}
/** A resident sat in a chair or wheelchair (the seat's top `seat` high) at (x, z), turned `ry`. */
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
// Things the residents use: a wheelchair, a walker, a cup with a straw, a gait belt.

/** A wheelchair facing +z (the seat's top at 0.48), its frame and its seat in these colours. */
function wheelchair(parent: THREE.Object3D, x: number, z: number, ry: number, frame = '#78909c', seat = '#37474f'): THREE.Group {
  const c = group(parent, x, 0, z, ry);
  const s = 0.48;
  // The big wheels with their push rims, the little castors in front.
  for (const sx of [-1, 1]) {
    const w = group(c, sx * 0.3, 0.29, -0.06, Math.PI / 2);
    part(w, ring(0.27, 0.022), '#2b2b30', 0, 0, 0);
    part(w, ring(0.235, 0.008), CHROME, 0, 0, sx * 0.03);
    part(w, cyl(0.03, 0.03, 0.06, 12), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
    for (let i = 0; i < 6; i++) part(w, box(0.006, 0.5, 0.006), '#b0bec5', 0, 0, 0, { rz: (i / 6) * Math.PI, outline: false });
    caster(c, sx * 0.22, 0.25, 0.05);
    // The side frame: down from the armrest to the castor, along under the seat.
    rod(c, v3(sx * 0.24, s - 0.04, -0.2), v3(sx * 0.24, s - 0.04, 0.24), 0.012, frame);
    rod(c, v3(sx * 0.24, s - 0.04, 0.24), v3(sx * 0.22, 0.12, 0.25), 0.012, frame);
    rod(c, v3(sx * 0.24, s - 0.04, 0.2), v3(sx * 0.19, 0.12, 0.38), 0.011, frame);
    part(c, rbox(0.1, 0.012, 0.13, 0.004), '#455a64', sx * 0.13, 0.11, 0.4);
    // The back posts up to the push handles, the armrests.
    rod(c, v3(sx * 0.23, 0.2, -0.22), v3(sx * 0.23, 0.92, -0.26), 0.013, frame);
    part(c, cyl(0.02, 0.02, 0.1, 10), '#2b2b30', sx * 0.23, 0.93, -0.31, { rx: Math.PI / 2 });
    part(c, rbox(0.06, 0.04, 0.3, 0.02), '#2b2b30', sx * 0.25, 0.68, -0.03);
    rod(c, v3(sx * 0.25, s - 0.04, 0.1), v3(sx * 0.25, 0.66, 0.1), 0.01, frame);
  }
  // The sling seat with its cushion, the sling back.
  part(c, rbox(0.46, 0.05, 0.44, 0.02), seat, 0, s - 0.025, 0.0);
  part(c, rbox(0.44, 0.38, 0.03, 0.02), seat, 0, 0.71, -0.23, { rx: -0.08 });
  return c;
}
/** A walker (보행기) facing +z: the U frame, front wheels, grey grips at the back corners (0.86 high). */
function walker(parent: THREE.Object3D): THREE.Group {
  const w = group(parent);
  for (const sx of [-1, 1]) {
    rod(w, v3(sx * 0.25, 0.86, -0.05), v3(sx * 0.27, 0.05, -0.08), 0.011, STEEL);
    rod(w, v3(sx * 0.25, 0.86, 0.22), v3(sx * 0.27, 0.08, 0.25), 0.011, STEEL);
    rod(w, v3(sx * 0.25, 0.86, -0.05), v3(sx * 0.25, 0.86, 0.22), 0.011, STEEL);
    part(w, cyl(0.016, 0.016, 0.11, 10), '#616161', sx * 0.25, 0.87, -0.02, { rx: Math.PI / 2 });
    part(w, cyl(0.022, 0.022, 0.04, 8), '#9e9e9e', sx * 0.27, 0.02, -0.08, { outline: false });
    part(w, cyl(0.045, 0.045, 0.025, 14), '#424242', sx * 0.27, 0.045, 0.25, { rz: Math.PI / 2 });
  }
  rod(w, v3(-0.25, 0.7, 0.22), v3(0.25, 0.7, 0.22), 0.011, STEEL);
  rod(w, v3(-0.26, 0.35, 0.235), v3(0.26, 0.35, 0.235), 0.009, STEEL);
  return w;
}
/** A 빨대컵 (two handles, a lid, a bendy straw), its foot at the origin. */
function sippyCup(parent: THREE.Object3D): THREE.Group {
  const c = group(parent);
  part(c, cyl(0.036, 0.03, 0.1, 14), '#b3e5fc', 0, 0.05, 0);
  part(c, cyl(0.038, 0.038, 0.02, 14), '#4fc3f7', 0, 0.105, 0);
  for (const sx of [-1, 1]) part(c, ring(0.022, 0.006, Math.PI), '#4fc3f7', sx * 0.045, 0.06, 0, { rz: sx * -Math.PI / 2 });
  part(c, cyl(0.004, 0.004, 0.06, 6), '#ffffff', 0, 0.14, 0.0, { outline: false });
  part(c, cyl(0.004, 0.004, 0.035, 6), '#ffffff', 0, 0.17, 0.014, { rx: 0.9, outline: false });
  return c;
}
/** A gait belt round someone's middle (on their `upper`). */
function gaitBelt(f: Fig) {
  part(f.upper, rbox(0.37, 0.055, 0.235, 0.03), '#1e88e5', 0, 0.075, 0);
  part(f.upper, box(0.06, 0.04, 0.01), CHROME, 0, 0.075, 0.12, { outline: false });
}
/** A paper cup. */
const paperCup = (g: THREE.Object3D, x = 0, y = 0, z = 0) => part(g, cyl(0.03, 0.022, 0.07, 12), '#fafafa', x, y + 0.035, z);

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the papers and the signs.

const FILL = (c: CanvasRenderingContext2D, w: number, h: number, bg: string) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
};
/** Handwriting: a wavy line of ink. */
function scribble(c: CanvasRenderingContext2D, x: number, y: number, w: number, r: () => number, color = '#37474f') {
  c.strokeStyle = color;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(x, y);
  for (let i = 0; i < w; i += 4) c.lineTo(x + i, y + Math.sin(i * 0.7 + r() * 6) * 1.6);
  c.stroke();
}
/** A heart drawn on a canvas. */
function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  c.fill();
}
/** Someone in a photo: a head and shoulders. */
function photoPerson(c: CanvasRenderingContext2D, x: number, y: number, s: number, top: string, hair: string, skin = '#e8c4a0') {
  c.fillStyle = top;
  c.beginPath();
  c.ellipse(x, y + s * 1.4, s * 1.1, s * 0.9, 0, Math.PI, 0);
  c.fill();
  c.fillRect(x - s * 1.1, y + s * 1.4, s * 2.2, s * 1.2);
  c.fillStyle = skin;
  c.beginPath();
  c.arc(x, y, s * 0.62, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = hair;
  c.beginPath();
  c.arc(x, y - s * 0.12, s * 0.64, Math.PI * 1.05, Math.PI * 1.95);
  c.fill();
}
/** A family photo (the one on the headboard, the ones on the wall): `kind` picks the scene. */
function photoTex(kind: number): THREE.Texture {
  return painted(`cwPhoto|${kind}`, 128, 100, (c) => {
    const r = seeded(31 + kind);
    switch (kind) {
      case 0: {
        // 1965 결혼식: black and white, the bride in her veil, the groom.
        FILL(c, 128, 100, '#d8d4cc');
        c.fillStyle = '#b9b4aa';
        c.fillRect(0, 62, 128, 38);
        photoPerson(c, 48, 38, 16, '#f5f5f5', '#333333', '#cfc8bd');
        c.fillStyle = 'rgba(255,255,255,0.75)';
        c.beginPath();
        c.ellipse(48, 40, 22, 30, 0, Math.PI * 1.1, Math.PI * 1.9 + Math.PI);
        c.fill();
        photoPerson(c, 82, 34, 16, '#2b2b2b', '#1a1a1a', '#cfc8bd');
        c.fillStyle = '#ffffff';
        c.fillRect(78, 54, 8, 14);
        break;
      }
      case 1: {
        // 1978 해운대: a young couple on the beach, the sea behind.
        FILL(c, 128, 100, '#cfe3e8');
        c.fillStyle = '#7fb3c8';
        c.fillRect(0, 38, 128, 22);
        c.fillStyle = '#e8d3a8';
        c.fillRect(0, 60, 128, 40);
        photoPerson(c, 50, 44, 12, '#e57373', '#2b1b10');
        photoPerson(c, 76, 42, 12, '#ffffff', '#1a1a1a');
        c.fillStyle = '#f9a825';
        c.beginPath();
        c.arc(108, 16, 8, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case 2: {
        // 1982 우리 가족: parents and three children in front of the house.
        FILL(c, 128, 100, '#e6d9c3');
        c.fillStyle = '#a1887f';
        c.fillRect(14, 10, 100, 40);
        c.fillStyle = '#5d4037';
        c.beginPath();
        c.moveTo(8, 14);
        c.lineTo(64, 0);
        c.lineTo(120, 14);
        c.fill();
        photoPerson(c, 34, 52, 11, '#5d6d7e', '#1a1a1a');
        photoPerson(c, 94, 52, 11, '#b5838d', '#2b1b10');
        photoPerson(c, 52, 66, 7, '#fdd835', '#1a1a1a');
        photoPerson(c, 66, 66, 7, '#e53935', '#1a1a1a');
        photoPerson(c, 80, 68, 6, '#42a5f5', '#1a1a1a');
        break;
      }
      case 3: {
        // 1995 회갑 잔치: in 한복 behind the table piled with food.
        FILL(c, 128, 100, '#f3e2c7');
        c.fillStyle = '#c62828';
        c.fillRect(0, 0, 128, 20);
        text(c, '축 회갑', 64, 10, 11, '#ffeb3b', 'center');
        photoPerson(c, 46, 42, 12, '#81c784', '#d0d0d0');
        photoPerson(c, 80, 42, 12, '#f48fb1', '#cfcfcf');
        c.fillStyle = '#8d6e63';
        c.fillRect(10, 66, 108, 34);
        for (let i = 0; i < 7; i++) {
          c.fillStyle = ['#ff7043', '#ffca28', '#8bc34a', '#ec407a', '#fff3e0', '#ab47bc', '#ffa726'][i];
          c.beginPath();
          c.ellipse(20 + i * 15, 66, 6, 8, 0, Math.PI, 0);
          c.fill();
        }
        break;
      }
      case 4: {
        // 1970 모내기: planting rice in the paddy, a basket on the bank.
        FILL(c, 128, 100, '#cfe0c3');
        c.fillStyle = '#9ccc65';
        c.fillRect(0, 50, 128, 50);
        c.strokeStyle = '#558b2f';
        c.lineWidth = 2;
        for (let i = 0; i < 10; i++)
          for (let j = 0; j < 4; j++) {
            c.beginPath();
            c.moveTo(6 + i * 13, 60 + j * 10);
            c.lineTo(8 + i * 13, 54 + j * 10);
            c.stroke();
          }
        photoPerson(c, 70, 40, 10, '#fafafa', '#2b1b10');
        c.fillStyle = '#fafafa';
        c.beginPath();
        c.arc(70, 30, 9, Math.PI, 0);
        c.fill();
        break;
      }
      default: {
        // 2026 생신 잔치 at the home: residents and carers round a cake.
        FILL(c, 128, 100, '#fff8e1');
        for (let i = 0; i < 6; i++) {
          c.fillStyle = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043'][i];
          c.beginPath();
          c.moveTo(i * 22, 0);
          c.lineTo(i * 22 + 22, 0);
          c.lineTo(i * 22 + 11, 12);
          c.fill();
        }
        photoPerson(c, 30, 40, 10, '#f8bbd0', '#d6d3cf');
        photoPerson(c, 64, 36, 10, '#4db6ac', '#3b2a20');
        photoPerson(c, 98, 40, 10, '#bbdefb', '#e2e2e2');
        c.fillStyle = '#ffffff';
        c.fillRect(46, 68, 36, 20);
        c.fillStyle = '#f48fb1';
        c.fillRect(46, 66, 36, 5);
        c.fillStyle = '#ffeb3b';
        for (let i = 0; i < 3; i++) c.fillRect(54 + i * 9, 58, 2, 8);
        break;
      }
    }
    // A little film grain.
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(80,60,40,${0.04 + r() * 0.05})`;
      c.fillRect(r() * 128, r() * 100, 1.5, 1.5);
    }
  });
}
const PHOTO_CAPTIONS = ['1965 결혼식', '1978 해운대', '1982 우리 가족', '1995 회갑 잔치', '1970 모내기', '2026 생신 잔치'];

const paintCareRecord: Paint = (c) => {
  FILL(c, 320, 200, '#f4f8f7');
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 320, 26);
  text(c, '장기요양 급여 제공 기록', 10, 13, 12, '#ffffff');
  text(c, '2026.10.27', 310, 13, 10, '#b2dfdb', 'right', false);
  const head = ['어르신', '식사', '배설', '체위 변경', '투약'];
  const xs = [10, 92, 146, 196, 262];
  head.forEach((h, i) => text(c, h, xs[i], 40, 10, '#00695c'));
  const rows: Array<[string, string, string, string, string]> = [
    ['101 김순자', '죽식 2/3', '정상', '10:00 ✓', '✓'],
    ['101 박영철', '일반식 전량', '정상', '—', '✓'],
    ['102 이말순', '죽식 1/2', '기저귀', '12:00 ✓', '✓'],
    ['103 정만석', '일반식 전량', '정상', '—', '·'],
  ];
  rows.forEach((r, i) => {
    c.fillStyle = i % 2 ? '#ffffff' : '#e0f2f1';
    c.fillRect(4, 52 + i * 26, 312, 24);
    r.forEach((s, j) => text(c, s, xs[j], 64 + i * 26, 10, '#263238', 'left', false));
  });
  c.fillStyle = '#26a69a';
  c.fillRect(214, 168, 98, 24);
  text(c, '기록 저장', 263, 180, 11, '#ffffff', 'center');
};
const paintLogSheet: Paint = (c) => {
  FILL(c, 128, 170, PAPER);
  text(c, '돌봄 일지', 64, 12, 11, TEAL, 'center');
  c.fillStyle = '#b2dfdb';
  c.fillRect(6, 22, 116, 1);
  const r = seeded(9);
  for (let i = 0; i < 9; i++) {
    c.fillStyle = '#e0e0e0';
    c.fillRect(8, 34 + i * 14, 112, 1);
    if (i < 7) scribble(c, 10, 30 + i * 14, 60 + r() * 45, r, '#1a237e');
  }
};
const paintMedLog: Paint = (c) => {
  FILL(c, 128, 170, PAPER);
  c.fillStyle = '#5c6bc0';
  c.fillRect(0, 0, 128, 20);
  text(c, '투약 기록지', 64, 10, 11, '#ffffff', 'center');
  const names = ['김순자', '박영철', '이말순', '최복례', '정만석', '오금자'];
  names.forEach((n, i) => {
    const y = 34 + i * 20;
    c.fillStyle = '#e0e0e0';
    c.fillRect(4, y + 9, 120, 1);
    text(c, n, 8, y, 9, '#263238', 'left', false);
    for (let j = 0; j < 3; j++) {
      c.strokeStyle = '#9fa8da';
      c.strokeRect(60 + j * 21, y - 6, 14, 12);
      if (i < 4 || j < 2) text(c, '✓', 67 + j * 21, y, 10, '#e53935', 'center');
    }
  });
  text(c, '아침 · 점심 · 저녁', 92, 160, 8, '#7986cb', 'center', false);
};
const paintDietChart: Paint = (c) => {
  FILL(c, 110, 140, PAPER);
  c.fillStyle = '#ef6c00';
  c.fillRect(0, 0, 110, 20);
  text(c, '오늘의 식단', 55, 10, 11, '#ffffff', 'center');
  const rows: Array<[string, string, string]> = [['일반식', '쌀밥 · 미역국', '#43a047'], ['죽식', '흰죽 · 계란찜', '#fb8c00'], ['다진식', '다진 나물 · 생선살', '#8e24aa'], ['연하식', '점도 증진 · 물김치', '#1e88e5']];
  rows.forEach(([k, v, col], i) => {
    c.fillStyle = col;
    c.fillRect(6, 28 + i * 27, 4, 20);
    text(c, k, 14, 33 + i * 27, 9, col);
    text(c, v, 14, 45 + i * 27, 8, '#424242', 'left', false);
  });
};
const paintWhiteboard: Paint = (c) => {
  FILL(c, 220, 140, '#fdfdfd');
  text(c, '오늘의 특이 사항', 110, 14, 13, '#c62828', 'center');
  c.fillStyle = '#e0e0e0';
  c.fillRect(10, 26, 200, 1);
  const lines = ['101 김순자 어르신 · 식사량 확인', '103 정만석 어르신 · 낙상 주의!', '14:00 박영철 어르신 보호자 면회', '15:00 노래 교실 (생활실)', '목욕 · 102호 오전'];
  lines.forEach((s, i) => text(c, s, 12, 42 + i * 20, 10, i === 1 ? '#c62828' : '#1a237e', 'left', false));
};
const paintLyrics: Paint = (c) => {
  const g = c.createLinearGradient(0, 0, 0, 180);
  g.addColorStop(0, '#1a237e');
  g.addColorStop(1, '#4a148c');
  c.fillStyle = g;
  c.fillRect(0, 0, 320, 180);
  // Hills and flowers behind the words.
  c.fillStyle = '#2e7d32';
  c.beginPath();
  c.ellipse(80, 190, 140, 50, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = '#388e3c';
  c.beginPath();
  c.ellipse(260, 196, 130, 46, 0, Math.PI, 0);
  c.fill();
  for (let i = 0; i < 12; i++) {
    c.fillStyle = ['#f48fb1', '#fff176', '#ffffff'][i % 3];
    c.beginPath();
    c.arc(14 + i * 27, 158 + (i % 2) * 8, 4, 0, Math.PI * 2);
    c.fill();
  }
  text(c, '♪ 우리 동네 봄나들이', 160, 22, 15, '#fff59d', 'center');
  text(c, '노래 교실 · 작사 작곡 햇살요양원', 160, 42, 9, '#c5cae9', 'center', false);
  text(c, '꽃 피는 마을 길을 손잡고 걸어요', 160, 86, 17, '#ffffff', 'center');
  text(c, '다 함께 웃으며 노래 불러요', 160, 122, 17, '#ffffff', 'center');
};
function bpTex(mmHg: number, done: boolean): THREE.Texture {
  return painted(`cwBp|${mmHg}|${done}`, 96, 64, (c) => {
    FILL(c, 96, 64, '#c5d6a8');
    if (done) {
      text(c, '128', 60, 16, 18, '#1b2a10', 'right');
      text(c, '82', 60, 38, 18, '#1b2a10', 'right');
      text(c, 'SYS', 66, 16, 7, '#33421e', 'left', false);
      text(c, 'DIA', 66, 38, 7, '#33421e', 'left', false);
      heart(c, 14, 55, 4, '#33421e');
      text(c, '72', 40, 56, 10, '#1b2a10', 'right');
    } else if (mmHg > 0) {
      text(c, String(mmHg), 70, 28, 22, '#1b2a10', 'right');
      text(c, 'mmHg', 74, 48, 8, '#33421e', 'left', false);
    } else text(c, '- - -', 48, 30, 14, '#5b6b3e', 'center');
  });
}
/** A 화투 card's face (`m`: which month's flowers), or its red back. */
function hwatuTex(m: number): THREE.Texture {
  return painted(`cwHwatu|${m}`, 48, 76, (c) => {
    if (m < 0) {
      FILL(c, 48, 76, '#b71c1c');
      c.strokeStyle = '#7f0000';
      c.lineWidth = 3;
      c.strokeRect(4, 4, 40, 68);
      return;
    }
    FILL(c, 48, 76, '#1a1a1a');
    c.fillStyle = '#fafafa';
    c.fillRect(2, 2, 44, 72);
    switch (m) {
      case 0:
        // 송학: the pine, the crane, the red sun.
        c.fillStyle = '#c62828';
        c.beginPath();
        c.arc(30, 22, 11, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#2e7d32';
        for (const [x, y] of [[10, 52], [22, 58], [34, 54], [16, 44]]) {
          c.beginPath();
          c.ellipse(x, y, 10, 6, 0, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#1a1a1a';
        c.beginPath();
        c.ellipse(26, 40, 8, 5, -0.4, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        break;
      case 1:
        // 매조: the red plum blossom on its branch.
        c.strokeStyle = '#3e2723';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(6, 70);
        c.quadraticCurveTo(20, 40, 42, 12);
        c.stroke();
        c.fillStyle = '#d81b60';
        for (const [x, y] of [[14, 52], [22, 40], [30, 28], [38, 18], [26, 50]]) {
          c.beginPath();
          c.arc(x, y, 4, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case 2:
        // 벚꽃: cherry blossom over the curtain.
        c.fillStyle = '#f8bbd0';
        for (let i = 0; i < 8; i++) {
          c.beginPath();
          c.arc(8 + (i % 4) * 11, 10 + Math.floor(i / 4) * 12, 5, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#c62828';
        c.fillRect(4, 44, 40, 26);
        c.fillStyle = '#ffca28';
        c.fillRect(4, 44, 40, 3);
        break;
      case 3:
        // 공산: the full moon over the hill, the red sky.
        c.fillStyle = '#e53935';
        c.fillRect(2, 2, 44, 40);
        c.fillStyle = '#fffde7';
        c.beginPath();
        c.arc(24, 24, 12, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#1a1a1a';
        c.beginPath();
        c.ellipse(24, 60, 26, 22, 0, Math.PI, 0);
        c.fill();
        break;
      case 4:
        // 국진: a yellow chrysanthemum.
        c.fillStyle = '#fbc02d';
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          c.beginPath();
          c.ellipse(24 + Math.cos(a) * 8, 30 + Math.sin(a) * 8, 6, 3, a, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#e65100';
        c.beginPath();
        c.arc(24, 30, 5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#2e7d32';
        c.fillRect(22, 40, 3, 30);
        break;
      default:
        // 단풍: red maple leaves.
        c.fillStyle = '#d84315';
        for (const [x, y] of [[14, 16], [32, 24], [18, 38], [34, 48], [16, 60]]) {
          c.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
            c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
            c.lineTo(x + Math.cos(a + 0.6) * 3, y + Math.sin(a + 0.6) * 3);
          }
          c.fill();
        }
    }
  });
}
/** A colouring sheet (무궁화 or 모란), coloured in as far as `done` (0–1). */
function coloringTex(kind: number, done: number): THREE.Texture {
  return painted(`cwColor|${kind}|${done}`, 120, 90, (c) => {
    FILL(c, 120, 90, '#ffffff');
    text(c, kind ? '모란꽃' : '무궁화', 60, 9, 9, '#757575', 'center');
    const petals = 5;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
      c.beginPath();
      c.ellipse(60 + Math.cos(a) * 16, 50 + Math.sin(a) * 16, 15, 10, a, 0, Math.PI * 2);
      if (i / petals < done) {
        c.fillStyle = kind ? '#f06292' : '#ce93d8';
        c.fill();
      }
      c.strokeStyle = '#424242';
      c.lineWidth = 1.5;
      c.stroke();
    }
    c.beginPath();
    c.arc(60, 50, 6, 0, Math.PI * 2);
    c.fillStyle = done > 0.5 ? (kind ? '#ffd54f' : '#c2185b') : '#ffffff';
    c.fill();
    c.stroke();
    // Leaves.
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.ellipse(60 + sx * 34, 74, 12, 5, sx * 0.4, 0, Math.PI * 2);
      if (done > 0.8) {
        c.fillStyle = '#81c784';
        c.fill();
      }
      c.stroke();
    }
  });
}
const paintBirthdays: Paint = (c) => {
  FILL(c, 120, 150, '#fff3e0');
  c.fillStyle = '#ef6c00';
  c.fillRect(0, 0, 120, 24);
  text(c, '10월 생신 어르신', 60, 12, 11, '#ffffff', 'center');
  c.fillStyle = '#ffffff';
  c.fillRect(38, 40, 44, 26);
  c.fillStyle = '#f48fb1';
  c.fillRect(38, 38, 44, 6);
  c.fillStyle = '#ffca28';
  for (let i = 0; i < 4; i++) c.fillRect(44 + i * 10, 30, 2, 8);
  ['김순자 어르신 (10.3)', '정만석 어르신 (10.19)', '오금자 어르신 (10.27)'].forEach((s, i) => text(c, s, 60, 86 + i * 18, 9, '#5d4037', 'center', false));
  text(c, '생신 축하드려요!', 60, 140, 10, '#d84315', 'center');
};

// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// What personal care brings to a bed, and to the bath: drawn to be held, each named for the probe.

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP_Y = new THREE.Vector3(0, 1, 0);
const WATER = new THREE.MeshBasicMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.38, depthWrite: false });
/** A hand laid on something flat, palm down: the fingers go along the tool's -x with its own turn, the thumb over to the side. */
const flatGrip = (side: 'left' | 'right') => ({ at: v(0, 0, 0), axis: v(0, 0, side === 'left' ? -1 : 1), palm: v(0, -1, 0), shape: 'flat' as const, radius: 0.012 });
const pinch = { at: v(0, 0, 0), axis: v(1, 0, 0), shape: 'pinch' as const, radius: 0.006 };
function named(g: THREE.Object3D, name: string): THREE.Group {
  const r = new THREE.Group();
  r.name = name;
  g.add(r);
  return r;
}
/** Puts a tool where a moment says, turned as it says. */
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const upV = new THREE.Vector3();
function poseTool(tool: THREE.Object3D, now: CW.CwNow) {
  tool.visible = true;
  tool.position.set(now.toolAt[0], now.toolAt[1], now.toolAt[2]);
  q1.setFromUnitVectors(UP_Y, upV.set(now.toolUp[0], now.toolUp[1], now.toolUp[2]).normalize());
  tool.quaternion.copy(q1).multiply(q2.setFromAxisAngle(UP_Y, now.toolYaw));
}

/**
 * The folding screen on the bed's far side (it stands clear of the camera's view of the bed), the over-bed
 * table with what each job needs on it, the covered pail by the carer's left hand, the towel laid under
 * the arm, and what the hands take up. Made the first time a bed needs them (most never do).
 */
function personalCare(use: THREE.Object3D) {
  const root = group(use);
  // The folding screen: three cloth panels in oak frames, set a little zigzag.
  const screen = group(root, -0.62, 0, -0.1);
  for (let i = 0; i < 3; i++) {
    const p = group(screen, 0, 0, -0.5 + i * 0.5, i === 1 ? 0.14 : -0.14);
    part(p, box(0.012, 1.3, 0.46), '#dcebe0', 0, 0.82, 0);
    for (const z of [-0.235, 0.235]) part(p, box(0.03, 1.46, 0.024), OAK_DARK, 0, 0.75, z);
    for (const y of [0.17, 1.47]) part(p, box(0.03, 0.024, 0.46), OAK_DARK, 0, y, 0, { outline: false });
  }
  // The over-bed table: its top reaches in over the bed from a column at the near side.
  const table = group(root, CW.OVER.x, 0, CW.OVER.washZ);
  part(table, rbox(0.5, 0.025, 0.42, 0.01), '#e7d9bf', 0, CW.OVER.y - 0.013, 0);
  part(table, cyl(0.02, 0.02, CW.OVER.y - 0.1, 10), STEEL, 0.24, (CW.OVER.y - 0.1) / 2 + 0.07, 0.14);
  part(table, rbox(0.06, 0.03, 0.36, 0.01), FRAME, 0.24, 0.06, 0.04);
  for (const z of [-0.12, 0.2]) caster(table, 0.24, z, 0.03);

  // For a change, on the table: the glove box, the wipes, clean pads, a hand towel, hand gel.
  const changeKit = group(root);
  const H = CW.CHANGE_HOME;
  const T = CW.OVER.y;
  part(changeKit, rbox(0.16, 0.08, 0.1, 0.008), '#bbdefb', H.glove[0], T + 0.04, H.glove[2]);
  label(changeKit, '장갑', 0.1, 0.035, H.glove[0], T + 0.04, H.glove[2] + 0.052, '#ffffff', '#1565c0');
  part(changeKit, rbox(0.17, 0.05, 0.1, 0.02), '#f5f5f5', H.wipe[0], T + 0.025, H.wipe[2]);
  label(changeKit, '물티슈', 0.11, 0.03, H.wipe[0], T + 0.026, H.wipe[2] + 0.052, '#e1f5fe', '#0277bd');
  for (let i = 0; i < 3; i++) part(changeKit, rbox(0.26, 0.02, 0.16, 0.006), '#ffffff', H.pad[0], T + 0.012 + i * 0.021, H.pad[2]);
  part(changeKit, box(0.26, 0.002, 0.03), '#90caf9', H.pad[0], T + 0.074, H.pad[2], { outline: false });
  part(changeKit, rbox(0.16, 0.03, 0.11, 0.01), '#fff8e1', H.towel[0], T + 0.015, H.towel[2]);
  part(changeKit, cyl(0.028, 0.032, 0.09, 12), '#c8e6c9', H.gel[0], T + 0.045, H.gel[2]);
  part(changeKit, cyl(0.008, 0.008, 0.03, 8), '#43a047', H.gel[0], T + 0.1, H.gel[2], { outline: false });

  // For a wash: the steel basin, folded dry towels, the soap, a cloth on the rim.
  const washKit = group(root);
  const Ba = CW.BASIN;
  part(washKit, cyl(0.15, 0.115, 0.085, 22), CHROME, Ba[0], T + 0.043, Ba[2]);
  part(washKit, ring(0.15, 0.006), '#b0bec5', Ba[0], T + 0.086, Ba[2], { rx: Math.PI / 2, outline: false });
  part(washKit, cyl(0.138, 0.138, 0.004, 22), '#a5dcef', Ba[0], T + 0.078, Ba[2], { outline: false });
  const steam = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(ball(0.035), STEAM);
    washKit.add(m);
    return m;
  });
  const W = CW.WASH_TOWELS;
  for (let i = 0; i < 2; i++) part(washKit, rbox(0.2, 0.03, 0.14, 0.012), i ? '#fff8e1' : '#ffe0b2', W[0], T + 0.016 + i * 0.03, W[2]);
  part(washKit, rbox(0.1, 0.02, 0.07, 0.01), '#eceff1', W[0] - 0.2, T + 0.012, W[2] + 0.04);
  part(washKit, rbox(0.075, 0.025, 0.05, 0.012), '#f8bbd0', W[0] - 0.2, T + 0.032, W[2] + 0.04, { outline: false });
  const clothRest = part(washKit, rbox(0.1, 0.02, 0.12, 0.008), '#d9f0f7', Ba[0] - 0.12, T + 0.092, Ba[2] + 0.02, { rz: 0.2 });
  // Under the arm, on the blanket.
  const armTowel = part(root, rbox(0.17, 0.014, 0.42, 0.006), '#ffffff', 0.31, CW.ARM_HAND[1] - 0.05, -0.36, { ry: 0.08 });

  // The covered pail, a clean liner showing under the lid when it's up.
  const pailAt = CW.PAIL;
  const pail = group(root, pailAt[0], 0, pailAt[2]);
  part(pail, cyl(0.13, 0.11, pailAt[1] - 0.04, 18), '#b0bec5', 0, (pailAt[1] - 0.04) / 2, 0);
  part(pail, ring(0.13, 0.009), '#fafafa', 0, pailAt[1] - 0.038, 0, { rx: Math.PI / 2, outline: false });
  label(pail, '수거함', 0.12, 0.04, 0, 0.52, 0.128, '#eceff1', '#37474f');
  part(pail, box(0.1, 0.012, 0.06), '#546e7a', 0, 0.015, 0.14);
  const lid = group(pail, 0, pailAt[1] - 0.03, -0.13);
  part(lid, cyl(0.135, 0.135, 0.022, 18), '#78909c', 0, 0.011, 0.13);
  part(lid, box(0.06, 0.018, 0.02), '#37474f', 0, 0.026, 0.13, { outline: false });

  // What's taken up.
  const glove = named(root, 'gloveHeld');
  part(glove, rbox(0.05, 0.008, 0.09, 0.003), '#90caf9', 0, 0, 0, { outline: false });
  const oldPad = named(root, 'oldPadRolled');
  part(oldPad, cyl(0.04, 0.04, 0.19, 12), '#e4dfd2', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const wipe = named(root, 'wipeSheet');
  part(wipe, rbox(0.1, 0.004, 0.1, 0.001), '#fdfdfd', 0, 0, 0, { outline: false });
  const newPad = named(root, 'newPadFolded');
  part(newPad, rbox(0.26, 0.016, 0.14, 0.005), '#ffffff', 0, 0, 0, { outline: false });
  part(newPad, box(0.26, 0.002, 0.03), '#90caf9', 0, 0.009, 0, { outline: false });
  const towel = named(root, 'dryTowel');
  part(towel, rbox(0.17, 0.016, 0.12, 0.006), '#fff8e1', 0, 0, 0, { outline: false });
  const cloth = named(root, 'washCloth');
  const clothFlat = part(cloth, rbox(0.17, 0.014, 0.12, 0.005), '#d9f0f7', 0, 0, 0, { outline: false });
  const clothTwist = part(cloth, cyl(0.022, 0.022, 0.19, 8), '#d9f0f7', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const drips = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(ball(0.007), WATER);
    root.add(m);
    return m;
  });
  const tools: Partial<Record<CW.CwTool, THREE.Object3D>> = { glove, oldPad, wipe, newPad, towel, cloth };

  return {
    /** Shows it for a moment (null: put away), and says what's in the hands. */
    show(now: CW.CwNow | null, m: string, t: number): HeldTool | null {
      root.visible = !!now;
      for (const o of Object.values(tools)) if (o) o.visible = false;
      drips.forEach((d) => (d.visible = false));
      if (!now) return null;
      const washing = m === 'cwWash';
      table.position.z = washing ? CW.OVER.washZ : CW.OVER.changeZ;
      changeKit.visible = !washing;
      washKit.visible = washing;
      pail.visible = !washing;
      lid.rotation.x = now.lid ? -1.1 : 0;
      armTowel.visible = now.armTowel;
      clothRest.visible = now.tool !== 'cloth';
      steam.forEach((s, i) => {
        const u = frac(t * 0.22 + i / 3);
        s.position.set(Ba[0] + 0.05 * Math.sin(t * 0.7 + i * 2), T + 0.1 + u * 0.26, Ba[2] + 0.04 * Math.cos(t * 0.6 + i));
        s.scale.setScalar(0.6 + u);
      });
      const tool = now.tool ? tools[now.tool] : undefined;
      if (!tool) return null;
      poseTool(tool, now);
      const wrung = now.beat === 'wring';
      if (now.tool === 'cloth') {
        clothFlat.visible = !wrung;
        clothTwist.visible = wrung;
        if (wrung)
          drips.forEach((d, i) => {
            const u = frac(t * 1.5 + i / 3);
            d.visible = true;
            d.position.set(now.toolAt[0] + 0.02 * (i - 1), now.toolAt[1] - 0.02 - u * 0.09, now.toolAt[2] + 0.03 - 0.03 * i);
          });
      }
      if (wrung)
        return { tool, lead: 'right', grips: { right: { at: v(0.06, 0, 0), axis: v(1, 0, 0), shape: 'power', radius: 0.024 }, left: { at: v(-0.06, 0, 0), axis: v(1, 0, 0), shape: 'power', radius: 0.024 } } };
      if (now.tool === 'cloth' || now.tool === 'towel') {
        if (now.beat === 'wet') return { tool, lead: 'right', grips: { right: pinch } };
        return { tool, lead: now.lead, grips: { [now.lead]: flatGrip(now.lead) } };
      }
      return { tool, lead: 'left', grips: { left: pinch } };
    },
  };
}

/** The hand shower, its grip at the origin on the handle, the water going along its +y. */
function handShower(g: THREE.Object3D, name: string) {
  const s = named(g, name);
  part(s, cyl(0.016, 0.018, 0.15, 12), '#eceff1', 0, -0.03, 0, { outline: false });
  part(s, cyl(0.052, 0.03, 0.035, 18), CHROME, 0, 0.06, 0, { outline: false });
  part(s, cyl(0.046, 0.046, 0.004, 18), '#90a4ae', 0, 0.079, 0, { outline: false });
  return s;
}
const paintBathTiles: Paint = (c) => {
  FILL(c, 256, 256, '#e8f4f6');
  c.strokeStyle = '#c3d8de';
  c.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    c.beginPath();
    c.moveTo(i * 32, 0);
    c.lineTo(i * 32, 256);
    c.moveTo(0, i * 32);
    c.lineTo(256, i * 32);
    c.stroke();
  }
};
const paintBathFloor: Paint = (c) => {
  FILL(c, 256, 170, '#d5e3e6');
  c.strokeStyle = '#b4c8cd';
  c.lineWidth = 2;
  for (let i = 0; i <= 12; i++) {
    c.beginPath();
    c.moveTo(i * 22, 0);
    c.lineTo(i * 22, 170);
    c.stroke();
  }
  for (let i = 0; i <= 8; i++) {
    c.beginPath();
    c.moveTo(0, i * 22);
    c.lineTo(256, i * 22);
    c.stroke();
  }
};
const paintBathMat: Paint = (c) => {
  FILL(c, 128, 150, '#4db6ac');
  c.fillStyle = '#b2dfdb';
  for (let y = 8; y < 150; y += 14) for (let x = 8 + ((y / 14) % 2) * 7; x < 128; x += 14) {
    c.beginPath();
    c.arc(x, y, 3.2, 0, Math.PI * 2);
    c.fill();
  }
};
const BATH_LOOK: Look = { top: '#e8f1f5', bottom: '#e8f1f5', hair: '#d6d3cf', hairdo: 'perm', shoes: '#90caf9' };

let bedCount = 0;
let mealCount = 0;
let railCount = 0;
let medCount = 0;
let actCount = 0;
const BED_FOLK: Array<{ look: Look; name: string; awake: boolean; blanket: string }> = [
  { look: LOOKS.soonja, name: '김순자', awake: false, blanket: '#f6c9a8' },
  { look: LOOKS.youngchul, name: '박영철', awake: true, blanket: '#b9d7c8' },
  { look: LOOKS.malsoon, name: '이말순', awake: false, blanket: '#d5c6e6' },
];

export const BUILDERS: Record<string, Builder> = {
  // The 재가 방문 요양's pieces (2026-11-04, the branch lots).
  cwHomeBathAid(g, W, D) {
    cwHomeBathAid(g, W, D);
  },
  cwAidShelf(g, W, D) {
    cwAidShelf(g, W, D);
  },
  /**
   * The 면회실's stand by the door through to the care side (2026-11-04, the layout audit): a small oak lectern with the
   * visitors' book open on it and a pen on its cord, the pump bottle of hand gel on a steel post beside it, and the notice
   * behind: 면회 전 손 소독 · 방문 기록, the visiting hours under it.
   */
  cwVisitorDesk(g) {
    // The lectern.
    part(g, rbox(0.46, 0.92, 0.36, 0.02), OAK, -0.1, 0.46, -0.08);
    part(g, rbox(0.52, 0.03, 0.42, 0.01), OAK_DARK, -0.1, 0.935, -0.06, { rx: 0.12 });
    // The book, open, its lines; the pen on its cord.
    const book = new THREE.Group();
    book.position.set(-0.1, 0.96, -0.05);
    book.rotation.x = 0.12;
    g.add(book);
    for (const sx of [-1, 1]) part(book, box(0.17, 0.012, 0.24), PAPER, sx * 0.09, 0.006, 0);
    part(book, box(0.006, 0.014, 0.24), '#8d6e63', 0, 0.007, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(book, box(0.3, 0.0015, 0.003), '#b0bec5', 0, 0.0135, -0.09 + i * 0.035, { outline: false });
    part(book, cyl(0.006, 0.006, 0.13, 6), '#1e88e5', 0.12, 0.02, 0.07, { rz: Math.PI / 2, ry: 0.4, outline: false });
    // The hand gel on its post.
    part(g, cyl(0.12, 0.13, 0.02, 16), STEEL, 0.3, 0.01, 0.05);
    part(g, cyl(0.016, 0.016, 0.98, 8), STEEL, 0.3, 0.5, 0.05, { outline: false });
    part(g, rbox(0.16, 0.03, 0.16, 0.01), STEEL, 0.3, 1.0, 0.05);
    part(g, cyl(0.04, 0.045, 0.16, 14), '#e3f2fd', 0.3, 1.095, 0.05);
    part(g, cyl(0.012, 0.012, 0.05, 8), '#ffffff', 0.3, 1.2, 0.05, { outline: false });
    part(g, box(0.06, 0.012, 0.012), '#ffffff', 0.32, 1.225, 0.05, { outline: false });
    label(g, '손 소독', 0.07, 0.035, 0.3, 1.1, 0.1, '#ffffff', '#1565c0');
    // The notice behind.
    part(g, rbox(0.6, 0.42, 0.02, 0.01), '#ffffff', 0, 1.5, -0.42);
    label(g, '면회 전 손 소독 · 방문 기록', 0.54, 0.09, 0, 1.63, -0.405, TEAL, '#ffffff');
    label(g, '면회 시간 10:00 ~ 17:00', 0.46, 0.06, 0, 1.5, -0.405, '#ffffff', '#37474f');
    label(g, HOME, 0.3, 0.05, 0, 1.38, -0.405, '#ffffff', TEAL);
  },
  /**
   * The care bed (전동 요양 침대): a steel base on locking castors and a lifting deck, a two-part
   * mattress whose backrest runs up on its hinge, warm wood head and foot boards (the resident's
   * name card and a 낙상 주의 sticker on the foot), half rails along both sides, the hand pendant
   * hung on the near rail, the red call button clipped by the pillow, a family photo on the
   * headboard, a fall sensor mat on the floor at the side. And its resident, always there: asleep
   * under the blanket, or sat up a little and awake.
   *
   * Giving care (assistCare): the bed raised to the carer's waist and the near rail let down; a hand
   * on the shoulder, the backrest run up with the pendant, a drink held to the lips through the
   * straw, the resident's hand held in both hands, the blanket smoothed as it goes back down.
   * Turning (turnPatient): the blanket folded to the waist, the arm laid across, rolled gently away
   * onto the side with a hand on the shoulder and the hip, the wedge pillow tucked in behind, eased
   * back onto it, covered again. A fall (fallResponse): the bed empty and low, the mat and the call
   * lamp flashing red, the resident sat on the floor beside it and the carer crouched by them, asking,
   * feeling the arm and the knee, holding their hand, rubbing their back. Watching a senior's care
   * (the trainee's): stood at the foot with a notebook while 방미경 선생님 holds the resident's hand.
   */
  careBed(g, _W, _D, _c, _def, _ctx, out) {
    const n = bedCount++;
    const folk = BED_FOLK[n % BED_FOLK.length];
    const B = CW.BED;
    // The base: castors, the frame, the lift's housing.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        caster(g, sx * 0.36, sz * 0.86, 0.045);
        part(g, box(0.035, 0.08, 0.035), FRAME, sx * 0.36, 0.14, sz * 0.86, { outline: false });
        part(g, box(0.06, 0.02, 0.025), '#ef5350', sx * 0.36 + sx * 0.03, 0.12, sz * 0.86, { outline: false });
      }
    for (const sx of [-1, 1]) part(g, box(0.05, 0.05, 1.8), FRAME, sx * 0.36, 0.2, 0);
    for (const sz of [-1, 1]) part(g, box(0.76, 0.05, 0.05), FRAME, 0, 0.2, sz * 0.86);
    part(g, rbox(0.34, 0.12, 0.24, 0.03), '#eceff1', 0, 0.28, 0.15);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.06, 0.2, 0.06), '#b0bec5', sx * 0.28, 0.32, sz * 0.5);
    // The deck that lifts, and everything on it.
    const deck = group(g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(deck, box(0.045, 0.24, 0.045), '#90a4ae', sx * 0.28, 0.28, sz * 0.5, { outline: false });
    part(deck, box(0.86, 0.04, 1.84), FRAME, 0, B.top - 0.16, 0);
    // The legs' half of the mattress, the backrest's half on its hinge.
    part(deck, rbox(0.84, 0.14, 1.12, 0.05), SHEET, 0, B.top - 0.07, B.hinge + 0.56);
    const back = group(deck, 0, B.top, B.hinge);
    part(back, rbox(0.84, 0.14, 0.76, 0.05), SHEET, 0, -0.07, -0.38);
    part(back, box(0.86, 0.035, 0.72), FRAME, 0, -0.16, -0.38);
    part(back, rbox(0.5, 0.065, 0.3, 0.03), '#ffffff', 0, 0.03, -0.6);
    part(back, box(0.48, 0.004, 0.004), '#cfd8dc', 0, 0.064, -0.6, { outline: false });
    // The call button on its cord, clipped by the pillow.
    part(back, rbox(0.05, 0.03, 0.08, 0.012), '#eceff1', -0.33, 0.02, -0.46);
    part(back, cyl(0.014, 0.014, 0.01, 10), '#e53935', -0.33, 0.038, -0.45, { outline: false });
    // The blanket: over the legs, and over the chest (folded down for a turn) with the sheet turned over its edge.
    const BL = folk.blanket;
    const legsCover = group(deck);
    part(legsCover, rbox(0.86, 0.06, 1.14, 0.03), BL, 0, B.top + 0.19, B.hinge + 0.57);
    // Over the feet, which stand up under it.
    part(legsCover, rbox(0.42, 0.14, 0.3, 0.06), BL, 0, B.top + 0.22, B.hinge + 0.84);
    part(legsCover, box(0.02, 0.27, 1.12), BL, -0.43, B.top + 0.07, B.hinge + 0.57, { outline: false });
    // The near edge, on a hinge at the top: held up a little for hands to go under it.
    const flap = group(legsCover, 0.43, B.top + 0.205, B.hinge + 0.57);
    part(flap, box(0.02, 0.27, 1.12), BL, 0, -0.135, 0, { outline: false });
    part(legsCover, box(0.86, 0.27, 0.02), BL, 0, B.top + 0.07, B.hinge + 1.13, { outline: false });
    const chest = group(back);
    part(chest, rbox(0.86, 0.045, 0.42, 0.02), BL, 0, 0.24, -0.21);
    part(chest, rbox(0.86, 0.05, 0.1, 0.02), '#ffffff', 0, 0.25, -0.42);
    for (const sx of [-1, 1]) part(chest, box(0.02, 0.26, 0.42), BL, sx * 0.43, 0.11, -0.21, { outline: false });
    const roll = part(back, cyl(0.055, 0.055, 0.86, 12), BL, 0, 0.22, 0.02, { rz: Math.PI / 2 });
    // The boards: the head (with the photo and the call lamp), the foot with the name card.
    part(deck, rbox(0.94, 0.62, 0.05, 0.025), OAK, 0, B.top + 0.12, -0.97);
    part(deck, rbox(0.94, 0.06, 0.07, 0.03), OAK_DARK, 0, B.top + 0.44, -0.97);
    const frame = group(deck, -0.24, B.top + 0.33, -0.94);
    part(frame, rbox(0.17, 0.14, 0.015, 0.005), '#8d6e63', 0, 0, 0);
    picture(frame, photoTex(n % 2 ? 2 : 1), 0.14, 0.11, 0, 0, 0.009);
    part(deck, cyl(0.03, 0.03, 0.02, 14), '#eceff1', 0.3, B.top + 0.36, -0.94, { rx: Math.PI / 2 });
    const lampOn = glowing(deck, cyl(0.022, 0.022, 0.01, 14), '#ff1744', 0.3, B.top + 0.36, -0.928, Math.PI / 2);
    part(deck, rbox(0.94, 0.42, 0.05, 0.025), OAK, 0, B.top + 0.02, 0.97);
    part(deck, rbox(0.94, 0.06, 0.07, 0.03), OAK_DARK, 0, B.top + 0.24, 0.97);
    part(deck, rbox(0.3, 0.1, 0.01, 0.004), '#ffffff', -0.15, B.top + 0.06, 0.998);
    label(deck, `${folk.name} 어르신`, 0.27, 0.07, -0.15, B.top + 0.06, 1.004, '#ffffff', '#00695c');
    label(deck, '낙상 주의', 0.14, 0.05, 0.25, B.top + 0.06, 0.998, '#ffd54f', '#bf360c');
    // The side rails: the far one fixed; the near one slides down while care is given.
    const railAt = (parent: THREE.Object3D, sx: number) => {
      const r = group(parent, sx * B.rail, 0, -0.36);
      for (const y of [0.05, 0.32]) part(r, rbox(0.03, 0.03, 0.86, 0.012), '#e0e0e0', 0, B.top + y, 0);
      for (const z of [-0.4, 0, 0.4]) part(r, box(0.022, 0.27, 0.022), '#bdbdbd', 0, B.top + 0.185, z, { outline: false });
      glass(r, box(0.01, 0.2, 0.76), 0, B.top + 0.185, 0);
      return r;
    };
    railAt(deck, -1);
    const nearRail = railAt(deck, 1);
    // The hand pendant on the near rail, on its curly cord.
    const pendant = (parent: THREE.Object3D) => {
      const p = group(parent);
      part(p, rbox(0.05, 0.12, 0.025, 0.012), '#f5f5f5', 0, 0, 0);
      for (let i = 0; i < 3; i++) {
        part(p, cyl(0.007, 0.007, 0.004, 8), '#90caf9', -0.012, 0.035 - i * 0.03, 0.014, { rx: Math.PI / 2, outline: false });
        part(p, cyl(0.007, 0.007, 0.004, 8), '#ffcc80', 0.012, 0.035 - i * 0.03, 0.014, { rx: Math.PI / 2, outline: false });
      }
      return p;
    };
    const hung = pendant(nearRail);
    hung.position.set(0.035, B.top + 0.22, 0.35);
    hung.rotation.y = Math.PI / 2;
    for (let i = 0; i < 5; i++) part(nearRail, ring(0.012, 0.003), '#eeeeee', 0.04, B.top + 0.14 - i * 0.02, 0.35, { outline: false });
    // The fall sensor mat at the near side (red while a fall's being seen to).
    part(g, rbox(0.5, 0.012, 0.9, 0.006), '#90a4ae', 0.76, 0.006, -0.2);
    part(g, box(0.46, 0.002, 0.86), '#b0bec5', 0.76, 0.013, -0.2, { outline: false });
    label(g, '낙상 감지 매트', 0.3, 0.05, 0.76, 0.015, 0.18, '#ffd54f', '#37474f').rotation.set(-Math.PI / 2, 0, 0);
    const matRed = ownGlow(g, box(0.47, 0.004, 0.87), '#ff5252', 0.76, 0.016, -0.2, 0.7);

    // The resident in the bed.
    const res = figure(deck, folk.look);
    res.root.rotation.x = -Math.PI / 2;
    res.root.position.set(0, B.top + B.lift, B.hinge + 0.84);
    res.head.position.z = 0.06;
    res.head.rotation.x = 0.18;
    // The same resident sat on the floor after a fall, and the senior carer for the trainee to watch.
    const use = group(g);
    out.inUse = use;
    const fallen = figure(use, folk.look);
    fallen.root.position.set(CW.FLOOR_SIT.x, 0, CW.FLOOR_SIT.z);
    fallen.root.rotation.y = CW.FLOOR_SIT.yaw;
    fallen.pose(1, 0, -0.18, 0, 0, 0.14);
    const senior = figure(use, LOOKS.senior);
    senior.root.position.set(CW.CARE_AT.x, 0, CW.CARE_AT.z);
    senior.root.rotation.y = CW.CARE_AT.yaw;
    senior.upper.rotation.x = 0.28;
    // What the carer's hands hold: the pendant, the straw cup, the wedge pillow, the notebook.
    const held = pendant(use);
    const cup = sippyCup(use);
    const wedge = part(use, cyl(0.15, 0.15, 0.5, 3), '#80cbc4', 0, 0, 0, { rz: Math.PI / 2 });
    const notebook = group(use);
    part(notebook, rbox(0.13, 0.012, 0.18, 0.004), '#ffb74d', 0, 0, 0);
    part(notebook, box(0.12, 0.004, 0.17), PAPER, 0, 0.008, 0, { outline: false });

    // Spots: stood at the side for care and turning, crouched at the side by a fall, at the foot to watch.
    const mark = marker(g, 0, 0.6, 0);
    const spots: Record<string, Spot> = {
      assistCare: spotAt(g, CW.CARE_AT, 'stand', 'cwCare', mark),
      xwChangeBrief: spotAt(g, CW.CHANGE_AT, 'stand', 'cwChange', mark),
      xwBedBath: spotAt(g, CW.WASH_AT, 'stand', 'cwWash', mark),
      turnPatient: spotAt(g, CW.TURN_AT, 'stand', 'cwTurn', mark),
      fallResponse: spotAt(g, CW.FALL_AT, 'stand', 'cwFall', mark),
      careWorker_observeCare: spotAt(g, CW.OBSERVE_AT, 'stand', 'cwObserve', mark),
      '*': spotAt(g, CW.CARE_AT, 'stand', 'cwCare', mark),
    };
    out.spots = spots;
    out.work = mark;

    const idleBack = folk.awake ? 0.42 : 0.12;
    const cur = { back: idleBack, roll: 0, lift: 0, rail: 0, flap: 0 };
    let personal: ReturnType<typeof personalCare> | null = null;
    let last = -1;
    /** A point given in the bed's frame for the raised deck, in the deck's own frame. */
    const onDeck = (p: CW.P) => vp(p, -B.raise);
    out.animate = (t) => {
      const dt = last < 0 ? 0.016 : Math.min(0.1, Math.max(0, t - last));
      last = t;
      const now = nowAt(spots, t);
      const m = now ? spots[now].motion : null;
      const ph = phaseOf(mark);
      // What the bed and its resident are doing.
      let backTo = idleBack;
      let rollTo = 0;
      let lift = 0;
      let railDown = 0;
      let chestUp = true;
      let wedgeOn = false;
      let headTurn = folk.awake ? 0.25 : 0.1;
      let talk = 0;
      let asleep = !folk.awake;
      let handL: CW.P = CW.onBody(cur.back, cur.roll, 0.07, 0.12, 0.17);
      const handR: CW.P = CW.onBody(cur.back, cur.roll, -0.07, 0.12, 0.17);
      const inBed = m !== 'cwFall';
      use.visible = !!m;
      held.visible = cup.visible = wedge.visible = notebook.visible = false;
      fallen.root.visible = senior.root.visible = false;
      hung.visible = true;
      let key: CW.Key | null = null;
      if (m) key = CW.careKeyOf(m as CW.CareMotion, t, ph).key;
      const pc = m === 'cwChange' || m === 'cwWash' ? CW.cwNow(m, t, ph) : null;
      if (pc && !personal) personal = personalCare(use);
      if (pc) {
        backTo = pc.back;
        rollTo = pc.roll;
        lift = 1;
        railDown = 1;
        asleep = false;
        headTurn = pc.headTurn;
        talk = pc.talk;
        handL = pc.nearHand;
      }
      const heldNow = personal ? personal.show(pc, m as string, t) : null;
      for (const [id, s] of Object.entries(spots)) s.held = id === now ? heldNow : null;
      if (m === 'cwCare') {
        const b = CW.careBeat(t, ph);
        backTo = CW.careBack(b);
        lift = 1;
        railDown = 1;
        asleep = false;
        headTurn = 0.2 + 0.35 * CW.amountOf(b, 'hold') + 0.25 * CW.amountOf(b, 'greet');
        talk = CW.amountOf(b, 'hold') + 0.5 * CW.amountOf(b, 'greet');
        if (CW.remoteHeld(b) && key) {
          held.visible = true;
          hung.visible = false;
          held.position.copy(vp(key.l, 0.02));
          held.rotation.set(-0.5, Math.PI / 2, 0);
        }
        if (CW.cupHeld(b) && key) {
          cup.visible = true;
          cup.position.copy(vp(CW.careCup(cur.back), -0.06));
          handL = CW.add3(CW.careCup(cur.back), [0.02, -0.03, 0.05]);
        }
        if (CW.amountOf(b, 'hold') > 0.4) handL = CW.HELD_HAND;
      } else if (m === 'cwTurn') {
        const b = CW.turnBeat(t, ph);
        backTo = 0;
        rollTo = CW.turnRoll(b);
        lift = 1;
        railDown = 1;
        asleep = false;
        chestUp = CW.chestCovered(b);
        wedgeOn = CW.wedgeIn(b);
        headTurn = 0.1;
        if (CW.armCrossed(b)) handL = CW.onBody(0, cur.roll, -0.03, 0.37, 0.15);
      } else if (m === 'cwFall') {
        fallen.root.visible = true;
        lift = 0;
        backTo = 0;
        const b = CW.fallBeat(t, ph);
        fallen.head.rotation.y = -0.6;
        fallen.head.rotation.x = 0.1;
        fallen.armR(CW.amountOf(b, 'hold') > 0.4 || CW.amountOf(b, 'check') > 0.6 ? vp(CW.FALL_HAND) : null);
        fallen.armL(v3(CW.FLOOR_SIT.x + 0.05, 0.07, CW.FLOOR_SIT.z - 0.22));
        fallen.mouth(0.4 * Math.max(0, Math.sin(t * 7)) * CW.amountOf(b, 'ask'));
      } else if (m === 'cwObserve') {
        senior.root.visible = true;
        backTo = 0.5;
        lift = 1;
        railDown = 1;
        asleep = false;
        headTurn = 0.5;
        talk = 0.6;
        handL = CW.HELD_HAND;
        senior.armL(vp(CW.add3(CW.HELD_HAND, [0.03, 0.035, 0.04])));
        senior.armR(vp(CW.add3(CW.HELD_HAND, [0.02, -0.03, -0.03])));
        senior.head.rotation.x = 0.3 + 0.08 * Math.max(0, Math.sin(t * 2.6)) ** 4;
        if (key) {
          notebook.visible = true;
          notebook.position.copy(vp(CW.notebookAt(key)));
          notebook.rotation.set(0.5, Math.PI, 0);
        }
      }
      // Ease the bed and the resident into it.
      cur.back = ease(cur.back, backTo, dt, 3);
      cur.roll = m === 'cwTurn' || m === 'cwChange' ? ease(cur.roll, rollTo, dt, 10) : ease(cur.roll, 0, dt, 3);
      cur.flap = ease(cur.flap, pc?.flap ?? 0, dt, 6);
      // The blanket rides up over hips turned on their side; it's held clear of hands under the near edge.
      legsCover.position.y = 0.07 * Math.min(1, Math.abs(cur.roll) / 0.5);
      flap.rotation.z = 0.7 * cur.flap;
      cur.lift = ease(cur.lift, lift, dt, 2.5);
      cur.rail = ease(cur.rail, railDown, dt, 4);
      deck.position.y = cur.lift * B.raise;
      back.rotation.x = cur.back;
      nearRail.position.y = -0.3 * cur.rail;
      chest.visible = chestUp;
      roll.visible = !chestUp;
      // The chest blanket sits higher over someone half turned.
      chest.position.y = 0.06 * Math.min(1, Math.abs(cur.roll)) - (m === 'cwWash' ? 0.04 : 0);
      // The resident: in the bed (or not), the backrest under them, rolled.
      res.root.visible = inBed;
      res.upper.rotation.x = cur.back;
      res.root.rotation.y = cur.roll;
      res.head.rotation.y = headTurn;
      res.eyes((asleep && Math.sin(t * 0.3 + n) < 0.95) || !!pc?.eyesShut);
      res.mouth(talk * 0.5 * Math.max(0, Math.sin(t * 6.5 + n)));
      // Breathing: the chest rises and falls.
      res.upper.scale.set(1, 1, 1 + 0.025 * Math.sin(t * 1.6 + n));
      res.sleeveL(!!pc?.sleeveUp);
      res.armL(onDeck(handL));
      res.armR(onDeck(handR));
      if (wedgeOn) {
        wedge.visible = true;
        const w = CW.wedgeAt(cur.roll);
        wedge.position.set(w[0] + 0.02, w[1] - 0.02 + (cur.lift - 1) * B.raise, w[2]);
        wedge.rotation.set(0, 0, Math.PI / 2 + cur.roll);
      }
      // A fall: the mat and the headboard's call lamp flash.
      const flash = m === 'cwFall' && Math.sin(t * 9) > 0;
      matRed.visible = flash;
      lampOn.visible = flash;
    };
  },

  /**
   * The meal cart (식사 카트) and a resident's table: a stainless trolley — covered 식판 trays on its
   * shelves, each with the resident's name and diet (죽식 · 다진식 · 일반식), the 죽 warmer, bowls
   * and spoons, a water jug and the day's diet chart on top — and beside it a little over-bed table
   * slid over a wheelchair, the tray on it under a dome cover, a stool for the carer at its corner.
   *
   * Helping a resident eat (serveMealCart): sat on the stool turned to her (오금자 어르신, in her
   * wheelchair), the bib tucked in, the 죽 scooped, blown on, held to her lips and waited on while she
   * chews, the straw cup held with her while she drinks, her mouth dabbed with the napkin. A soft diet
   * made up (the 시설 branch's): stood at the cart, 죽 ladled from the warmer, stirred smooth, the
   * name card set on the tray, checked against the chart.
   */
  mealCart(g, W, _D, _c, _def, _ctx, out) {
    const n = mealCount++;
    // A 1-wide cart (an older save's) draws just the trolley.
    const wide = W > 1.5;
    const C = CW.MEAL.cart;
    const cx = wide ? C.x : 0;
    const cz = C.z;
    const cart = group(g, cx, 0, cz);
    const hw = C.w / 2;
    const hd = C.d / 2;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(cart, box(0.025, C.top - 0.09, 0.025), STEEL, sx * (hw - 0.015), (C.top + 0.09) / 2, sz * (hd - 0.015), { outline: false });
        caster(cart, sx * (hw - 0.05), sz * (hd - 0.05), 0.04);
      }
    for (const y of [0.18, 0.56, C.top]) {
      part(cart, rbox(C.w, 0.02, C.d, 0.008), CHROME, 0, y - 0.01, 0);
      for (const sz of [-1, 1]) part(cart, box(C.w, 0.03, 0.01), STEEL, 0, y + 0.012, sz * (hd - 0.005), { outline: false });
    }
    // The push handle at the left end.
    for (const sz of [-1, 1]) rod(cart, v3(-hw, C.top - 0.02, sz * 0.15), v3(-hw - 0.08, C.top + 0.05, sz * 0.15), 0.012, STEEL);
    part(cart, cyl(0.018, 0.018, 0.34, 10), '#455a64', -hw - 0.08, C.top + 0.05, 0, { rx: Math.PI / 2 });
    // Covered trays on the shelves, each with its name and diet.
    const TAGS: Array<[string, string]> = [['죽식', '김순자'], ['일반식', '박영철'], ['다진식', '이말순'], ['연하식', '최복례']];
    TAGS.forEach(([diet, who], i) => {
      const y = i < 2 ? 0.19 : 0.57;
      const x = (i % 2 ? 1 : -1) * 0.15;
      part(cart, rbox(0.28, 0.02, 0.38, 0.01), '#d6dbdf', x, y + 0.01, 0);
      part(cart, new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#eceff1', x, y + 0.02, 0, { outline: false }).scale.set(1, 0.7, 1.3);
      label(cart, `${diet} ${who}`, 0.17, 0.04, x, y + 0.04, hd + 0.003, ['#fb8c00', '#43a047', '#8e24aa', '#1e88e5'][i], '#ffffff');
    });
    // On top: the 죽 warmer (its lid opens for the ladle), the bowl being filled on a tray, bowls, spoons, water.
    const pot = CW.PREP.pot;
    const local = (p: CW.P): CW.P => [p[0] - cx, p[1], p[2] - cz];
    const pl = local(pot);
    part(cart, cyl(0.11, 0.1, 0.19, 18), CHROME, pl[0], C.top + 0.095, pl[2]);
    part(cart, cyl(0.112, 0.112, 0.012, 18), STEEL, pl[0], C.top + 0.17, pl[2], { outline: false });
    const juk = part(cart, cyl(0.1, 0.1, 0.006, 18), '#fbf6e9', pl[0], C.top + 0.17, pl[2], { outline: false });
    label(cart, '죽', 0.06, 0.05, pl[0], C.top + 0.09, pl[2] + 0.106, '#e3e7ea', '#e65100');
    const lid = group(cart, pl[0], C.top + 0.19, pl[2] - 0.11);
    part(lid, cyl(0.115, 0.115, 0.02, 18), STEEL, 0, 0, 0.11);
    part(lid, cyl(0.02, 0.02, 0.03, 10), BLACK, 0, 0.02, 0.11);
    const steam: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      steam.push(part(cart, ball(0.035), '#ffffff', pl[0] + (i - 1) * 0.03, C.top + 0.26 + i * 0.05, pl[2], { outline: false, shadow: false, material: STEAM }));
    }
    const bl = local(CW.PREP.bowl);
    part(cart, rbox(0.3, 0.015, 0.22, 0.008), '#d6dbdf', bl[0], C.top + 0.008, bl[2]);
    part(cart, cyl(0.055, 0.04, 0.05, 16), '#fafafa', bl[0], C.top + 0.04, bl[2]);
    const filled = part(cart, cyl(0.05, 0.05, 0.006, 16), '#f6efdc', bl[0], C.top + 0.062, bl[2], { outline: false });
    const card = group(cart, local(CW.PREP.card)[0], C.top + 0.02, local(CW.PREP.card)[2]);
    label(card, '죽식 · 김순자', 0.1, 0.035, 0, 0.02, 0, '#fff3e0', '#e65100');
    for (let i = 0; i < 3; i++) part(cart, cyl(0.055, 0.04, 0.045, 16), '#fafafa', -0.04, C.top + 0.025 + i * 0.03, -0.17);
    part(cart, cyl(0.04, 0.035, 0.09, 12), '#a1887f', 0.12, C.top + 0.045, -0.17);
    for (let i = 0; i < 4; i++) part(cart, cyl(0.004, 0.004, 0.14, 6), CHROME, 0.11 + (i % 2) * 0.02, C.top + 0.11, -0.17 + (i - 1.5) * 0.012, { rz: 0.15 * (i - 1.5), outline: false });
    glass(cart, cyl(0.045, 0.04, 0.2, 14), 0.25, C.top + 0.1, -0.15);
    part(cart, cyl(0.04, 0.035, 0.16, 14), '#b3e5fc', 0.25, C.top + 0.08, -0.15, { outline: false });
    // The diet chart hung on the front.
    const ch = local(CW.PREP.chart);
    part(cart, rbox(0.13, 0.17, 0.008, 0.004), '#8d6e63', ch[0], ch[1], hd + 0.008);
    picture(cart, painted('cwDietChart', 110, 140, paintDietChart), 0.115, 0.15, ch[0], ch[1] - 0.005, hd + 0.013);
    // The ladle: hung on the warmer's rim, or in the hand.
    const ladle = group(g);
    part(ladle, cyl(0.007, 0.007, 0.3, 8), CHROME, 0, -0.15, 0, { outline: false });
    part(ladle, new THREE.SphereGeometry(0.04, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), CHROME, 0, -0.3, 0);
    const hungLadle = group(cart, pl[0] + 0.08, C.top + 0.36, pl[2] + 0.05);
    part(hungLadle, cyl(0.007, 0.007, 0.3, 8), CHROME, 0, -0.1, 0, { rz: 0.4, outline: false });

    const mark = marker(g, 0, 0.9, 0);
    if (!wide) {
      const prep: CW.SpotAt = { ...CW.PREP_AT, x: 0 };
      const s = spotAt(g, prep, 'stand', 'cwPrep', mark);
      out.spots = { '*': s };
      return;
    }

    // The resident's table (an over-bed table slid over the wheelchair), the carer's stool, the wheelchair.
    const T = CW.MEAL.table;
    const tb = group(g, T.x, 0, T.z);
    part(tb, rbox(T.w, 0.03, T.d, 0.012), OAK, 0, T.top - 0.015, 0);
    part(tb, box(T.w - 0.02, 0.01, 0.01), OAK_DARK, 0, T.top - 0.028, T.d / 2, { outline: false });
    part(tb, box(0.05, T.top - 0.08, 0.05), '#b0bec5', T.w / 2 - 0.04, (T.top - 0.08) / 2 + 0.06, 0);
    part(tb, rbox(0.06, 0.04, 0.56, 0.015), '#90a4ae', T.w / 2 - 0.04, 0.06, -0.05);
    for (const sz of [-1, 1]) caster(tb, T.w / 2 - 0.04, -0.05 + sz * 0.25, 0.03);
    const R = CW.MEAL.res;
    wheelchair(g, R.x, R.z, R.yaw, '#78909c', '#5d4037');
    const stool = group(g, CW.FEED_AT.x, 0, CW.FEED_AT.z);
    part(stool, cyl(0.17, 0.17, 0.06, 18), '#ffb74d', 0, CW.FEED_AT.y - 0.03, 0);
    part(stool, cyl(0.025, 0.025, CW.FEED_AT.y - 0.08, 10), CHROME, 0, (CW.FEED_AT.y - 0.08) / 2 + 0.03, 0, { outline: false });
    part(stool, cyl(0.16, 0.18, 0.03, 18), '#90a4ae', 0, 0.015, 0);
    // The meal on its tray: 흰죽 with a drop of sesame oil, 계란찜, 다진 나물, 물김치, the spoon, the cup, a napkin.
    const bw = CW.MEAL.bowl;
    part(g, rbox(0.36, 0.015, 0.26, 0.008), '#d6dbdf', bw[0] + 0.08, T.top + 0.008, bw[2] + 0.02);
    part(g, cyl(0.06, 0.045, 0.05, 16), '#fafafa', bw[0], T.top + 0.03, bw[2]);
    const bowlJuk = part(g, cyl(0.055, 0.055, 0.006, 16), '#f6efdc', bw[0], T.top + 0.05, bw[2], { outline: false });
    part(g, ball(0.012), '#c8a14a', bw[0] + 0.01, T.top + 0.054, bw[2], { outline: false }).scale.set(1.4, 0.2, 1);
    part(g, cyl(0.04, 0.032, 0.04, 14), '#fafafa', bw[0] + 0.14, T.top + 0.03, bw[2] - 0.05);
    part(g, cyl(0.036, 0.036, 0.008, 14), '#ffd54f', bw[0] + 0.14, T.top + 0.048, bw[2] - 0.05, { outline: false });
    part(g, cyl(0.04, 0.032, 0.035, 14), '#fafafa', bw[0] + 0.14, T.top + 0.028, bw[2] + 0.06);
    part(g, cyl(0.036, 0.036, 0.008, 14), '#7cb342', bw[0] + 0.14, T.top + 0.044, bw[2] + 0.06, { outline: false });
    part(g, cyl(0.04, 0.032, 0.035, 14), '#fafafa', bw[0] + 0.24, T.top + 0.028, bw[2] + 0.0);
    part(g, cyl(0.036, 0.036, 0.008, 14), '#ef9a9a', bw[0] + 0.24, T.top + 0.044, bw[2], { outline: false });
    const spoonRest = part(g, box(0.02, 0.006, 0.15), CHROME, bw[0] + 0.0, T.top + 0.02, bw[2] + 0.1, { ry: 0.3, outline: false });
    part(g, rbox(0.12, 0.008, 0.12, 0.004), '#ffffff', CW.MEAL.cup[0] - 0.08, T.top + 0.005, CW.MEAL.cup[2] + 0.04);
    const cup = sippyCup(g);
    const cover = part(g, new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#eceff1', bw[0] + 0.08, T.top + 0.015, bw[2] + 0.02);
    cover.scale.set(1.15, 0.6, 0.9);
    label(g, '오금자 어르신 · 죽식', 0.2, 0.04, T.x, T.top - 0.03, T.z + T.d / 2 + 0.004, '#fff3e0', '#e65100');

    // In use: the resident (her bib on), the spoon, the napkin.
    const use = group(g);
    out.inUse = use;
    const res = seated(use, LOOKS.geumja, R.x, R.z, R.yaw, R.seat);
    part(res.upper, rbox(0.3, 0.3, 0.02, 0.02), '#ffffff', 0, 0.3, 0.115);
    part(res.upper, box(0.28, 0.02, 0.022), '#80cbc4', 0, 0.44, 0.115, { outline: false });
    const spoon = group(use);
    part(spoon, box(0.016, 0.006, 0.13), CHROME, 0, 0, 0.04, { outline: false });
    part(spoon, new THREE.SphereGeometry(0.022, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), CHROME, 0, 0.0, 0.12).scale.set(1, 0.5, 1.4);
    const onSpoon = part(spoon, ball(0.017), '#f6efdc', 0, 0.006, 0.12, { outline: false });
    onSpoon.scale.set(1, 0.45, 1.3);
    const napkin = part(use, rbox(0.08, 0.01, 0.08, 0.004), '#ffffff', 0, 0, 0);

    const spots: Record<string, Spot> = {
      serveMealCart: spotAt(g, CW.FEED_AT, 'sit', 'cwFeed', mark),
      careWorker_softMeals: spotAt(g, CW.PREP_AT, 'stand', 'cwPrep', mark),
      '*': spotAt(g, CW.FEED_AT, 'sit', 'cwFeed', mark),
    };
    out.spots = spots;
    out.work = mark;
    const cupRest = vp(CW.MEAL.cup);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = now ? spots[now].motion : null;
      const ph = phaseOf(mark);
      const feeding = m === 'cwFeed';
      const prepping = m === 'cwPrep';
      use.visible = feeding;
      cover.visible = !feeding;
      spoonRest.visible = !feeding;
      // The warmer opens, steams, gives up its ladle while the soft diet's made up.
      lid.rotation.x = prepping ? -1.3 : 0;
      steam.forEach((s, i) => {
        s.visible = prepping;
        s.position.y = C.top + 0.24 + frac(t * 0.4 + i / 3) * 0.2;
        s.scale.setScalar(0.6 + frac(t * 0.4 + i / 3));
      });
      juk.visible = true;
      ladle.visible = false;
      hungLadle.visible = true;
      filled.visible = card.visible = false;
      if (prepping) {
        const b = CW.prepBeat(t, ph);
        const k = CW.careKeyOf('cwPrep', t, ph).key;
        if (CW.ladleHeld(b)) {
          ladle.visible = true;
          hungLadle.visible = false;
          ladle.position.copy(vp(k.l, 0.02));
          ladle.rotation.set(b.from === 'pour' ? 0.9 : 0.15, 0, 0);
        }
        filled.visible = CW.bowlFilled(b);
        card.visible = b.from === 'check' || (b.from === 'card' && b.p > 0.5);
      }
      cup.position.copy(cupRest);
      if (!feeding) return;
      const b = CW.feedBeat(t, ph);
      const k = CW.careKeyOf('cwFeed', t, ph).key;
      const lean = CW.feedLean(b);
      res.pose(1, R.seat, lean);
      const mouth = CW.mealMouth(lean);
      // She opens for the spoon, chews after.
      const open = CW.amountOf(b, 'feed') * (b.from === 'feed' && b.p > 0.2 && b.p < 0.7 ? 1 : 0.3);
      const chew = CW.amountOf(b, 'wait') * Math.max(0, Math.sin(t * 9)) * 0.5;
      res.mouth(Math.max(open, chew, 0.4 * CW.cupUp(b)));
      res.head.rotation.x = 0.05 + 0.08 * CW.amountOf(b, 'wait') * Math.max(0, Math.sin(t * 1.2));
      // The cup: lifted from the table to her lips, her hands round it.
      const up = CW.cupUp(b);
      const atMouth = vp(CW.add3(mouth, [0, -0.16, 0.06]));
      cup.position.lerpVectors(cupRest, atMouth, up);
      if (up > 0.3) {
        res.armL(atMouth.clone().add(v3(0.05, 0.05, 0)));
        res.armR(atMouth.clone().add(v3(-0.05, 0.05, 0)));
      } else {
        res.armL(v3(R.x + 0.14, CW.MEAL.table.top + 0.02, CW.MEAL.table.z - CW.MEAL.table.d / 2 + 0.06));
        res.armR(v3(R.x - 0.14, CW.MEAL.table.top + 0.02, CW.MEAL.table.z - CW.MEAL.table.d / 2 + 0.06));
      }
      // The spoon in the carer's right hand, pointed at the bowl, at her lips, or up to blow on.
      const hand = vp(k.r);
      spoon.position.copy(hand);
      const tip = CW.amountOf(b, 'feed') > 0.5 ? vp(mouth) : CW.amountOf(b, 'blow') > 0.5 ? hand.clone().add(v3(0, 0.12, 0.02)) : vp(CW.MEAL.bowl);
      aim(spoon, tip.sub(hand));
      spoon.visible = !CW.napkinUp(b) && up < 0.5;
      onSpoon.visible = CW.spoonFull(b);
      bowlJuk.visible = true;
      napkin.visible = CW.napkinUp(b);
      napkin.position.copy(hand);
    };
    void n;
  },

  /**
   * The walking rail (보행 손잡이): a round wooden handrail on steel brackets along the wall with a
   * bumper below it, '보행 연습 · 천천히, 함께 걸어요' over it, and a non-slip green lane on the floor
   * marked 0 · 1 · 2 m with footprints; a walker parked at its end.
   *
   * Walking with a resident (walkWithElder): 정만석 어르신 with his walker and a gait belt, walked
   * the length of the lane and back at his pace, the carer at his side a little behind — a hand at the
   * belt, a hand under the elbow — faced to him while he turns the walker at each end, a breath
   * before setting off again. Practising standing up (the 재가 branch's): his wheelchair faced to the
   * rail; talked through it, the brakes put on, both hands on the belt, up together, his hands to the
   * rail, stood a while, lowered back down, a thumbs up.
   */
  walkingRail(g, W, _D, _c, _def, _ctx, out) {
    railCount++;
    const R = CW.RAIL;
    const hw = Math.min(R.x1, W / 2 - 0.02);
    // The rail on its brackets, its ends turned back to the wall; a bumper below.
    part(g, cyl(0.026, 0.026, hw * 2, 14), '#c8a26e', 0, R.y, R.z, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) {
      rod(g, v3(sx * hw, R.y, R.z), v3(sx * (hw + 0.0), R.y - 0.08, R.z - 0.06), 0.026, '#c8a26e');
      part(g, cyl(0.04, 0.04, 0.02, 14), STEEL, sx * hw, R.y - 0.08, -0.485, { rx: Math.PI / 2 });
    }
    for (let x = -hw + 0.3; x < hw - 0.1; x += 0.6) {
      part(g, cyl(0.03, 0.03, 0.015, 12), STEEL, x, R.y - 0.06, -0.49, { rx: Math.PI / 2 });
      rod(g, v3(x, R.y - 0.06, -0.485), v3(x, R.y - 0.03, R.z), 0.009, STEEL);
    }
    part(g, rbox(hw * 2, 0.1, 0.03, 0.012), '#a5d6a7', 0, 0.32, -0.475);
    // The sign over it.
    part(g, rbox(0.86, 0.2, 0.02, 0.01), '#ffffff', 0, 1.42, -0.488);
    label(g, '보행 연습 구간', 0.6, 0.08, 0, 1.46, -0.476, '#ffffff', TEAL);
    label(g, '천천히, 함께 걸어요', 0.6, 0.06, 0, 1.38, -0.476, '#ffffff', '#5d4037');
    for (const sx of [-1, 1]) {
      const fx = group(g, sx * 0.55, 1.42, -0.476);
      part(fx, ball(0.05), sx > 0 ? '#ffb74d' : '#81c784', 0, 0, 0, { outline: false }).scale.set(1, 1, 0.2);
    }
    // The lane: green, its distance marks, footprints along it.
    part(g, box(hw * 2, 0.006, 0.56), '#c5e1a5', 0, 0.003, -0.05);
    for (const [i, s] of ['0m', '1m', '2m'].entries()) {
      const x = -0.8 + i * 0.8;
      part(g, box(0.02, 0.008, 0.5), '#fafafa', x, 0.006, -0.05, { outline: false });
      label(g, s, 0.12, 0.06, x + 0.1, 0.008, 0.16, '#c5e1a5', '#33691e').rotation.set(-Math.PI / 2, 0, 0);
    }
    for (let i = 0; i < 6; i++) part(g, rbox(0.05, 0.004, 0.11, 0.02), '#9ccc65', -0.7 + i * 0.28, 0.008, -0.1 + (i % 2) * 0.12, { outline: false });

    // The walker parked at the end while nobody's walking.
    const idle = group(g);
    out.idle = idle;
    const parked = walker(idle);
    parked.position.set(hw - 0.2, 0, 0.18);
    parked.rotation.y = -Math.PI / 2;

    // In use: the resident walking (with his own walker), or sat in his wheelchair at the rail.
    const use = group(g);
    out.inUse = use;
    const walkRes = figure(use, LOOKS.mansuk);
    gaitBelt(walkRes);
    const frame = walker(use);
    const standRes = figure(use, LOOKS.mansuk);
    gaitBelt(standRes);
    const chair = wheelchair(use, CW.WC_AT.x, CW.WC_AT.z, CW.WC_AT.yaw);

    const mark = marker(g, 0, 0.9, 0);
    const walkSpot = spotAt(g, { x: -R.walk, y: 0, z: R.carerZ, yaw: Math.PI / 2 }, 'stand', 'cwWalk', mark);
    const spots: Record<string, Spot> = {
      walkWithElder: walkSpot,
      careWorker_homeTransfer: spotAt(g, CW.TRANSFER_AT, 'stand', 'cwTransfer', mark),
      '*': walkSpot,
    };
    out.spots = spots;
    out.work = mark;
    const grip = (w: THREE.Group, sx: number) => v3(sx * 0.25, 0.88, -0.02).applyAxisAngle(UP, w.rotation.y).add(w.position);
    out.animate = (t) => {
      const ph = phaseOf(mark);
      // The walk's spot goes along with them.
      const w = CW.walkAt(t, ph);
      walkSpot.at.position.set(w.cx, 0, R.carerZ);
      walkSpot.at.rotation.y = w.cyaw;
      const now = nowAt(spots, t);
      const m = now ? spots[now].motion : null;
      const walking = m === 'cwWalk';
      const standing = m === 'cwTransfer';
      walkRes.root.visible = frame.visible = walking;
      standRes.root.visible = chair.visible = standing;
      if (walking) {
        walkRes.root.position.set(w.x, 0, R.resZ);
        walkRes.root.rotation.y = w.yaw;
        const pace = w.beat === 'walk' ? 1 : w.beat === 'turn' ? 0.5 : 0;
        walkRes.pose(0, 0.46, 0.2, pace, w.stride);
        frame.position.copy(v3(0, 0, 0.32).applyAxisAngle(UP, w.yaw)).add(walkRes.root.position);
        frame.rotation.y = w.yaw;
        walkRes.armL(grip(frame, 1));
        walkRes.armR(grip(frame, -1));
        walkRes.head.rotation.x = w.beat === 'walk' ? 0.3 : 0.05;
        walkRes.head.rotation.y = w.beat === 'rest' ? 0.4 * (w.dir > 0 ? -1 : 1) : 0;
        walkRes.mouth(w.beat === 'rest' ? 0.4 * Math.max(0, Math.sin(t * 6)) : 0);
      }
      if (standing) {
        const b = CW.transferBeat(t, ph);
        const sit = CW.transferSit(b);
        standRes.root.position.set(CW.WC_AT.x, 0, CW.transferZ(sit));
        standRes.root.rotation.y = CW.WC_AT.yaw;
        standRes.pose(sit, CW.WC_AT.seat, CW.transferLean(b));
        // The hands: on the armrests sat, reaching for the rail as they rise, holding it stood.
        const onRail = 1 - sit;
        const rest = (sx: number) => v3(CW.WC_AT.x - sx * 0.25, 0.7, CW.WC_AT.z - 0.05);
        const rail = (sx: number) => v3(CW.WC_AT.x - sx * 0.22, R.y + 0.01, R.z + 0.02);
        standRes.armL(onRail > 0.4 ? rail(1) : rest(1));
        standRes.armR(onRail > 0.4 ? rail(-1) : rest(-1));
        standRes.head.rotation.x = 0.15;
        standRes.head.rotation.y = CW.amountOf(b, 'explain') > 0.5 || CW.amountOf(b, 'praise') > 0.5 ? -0.5 : 0;
        standRes.mouth(CW.amountOf(b, 'praise') * 0.5);
      }
    };
  },

  /**
   * The medication cart (투약 카트): white, a grid of pastel drawers each with a resident's room and
   * name, a blue work top with a rail round it — the 요일 pill box (a lid a dose), a stack of paper
   * cups, the water jug, the hand sanitiser, the 투약 기록지 on a clipboard — and a fold-out shelf
   * at its side with the blood pressure monitor and its cuff. A resident in a wheelchair beside it.
   *
   * The medicine (cwGiveMeds): 최복례 어르신's drawer pulled open, her packet taken out, held up and
   * her name read off it with her, torn open, tipped into the little cup in her palm, the water handed
   * to her while she swallows, ticked off. A blood pressure (cwCheckBp): stood at her left side, the
   * cuff wrapped round her arm, the monitor's start pressed, her hand held while it pumps up and the
   * numbers fall, read off, told to her with a pat on the hand, the cuff off again.
   */
  cwMedCart(g, _W, _D, _c, _def, _ctx, out) {
    const n = medCount++;
    const C = CW.MED.cart;
    const cart = group(g, C.x, 0, C.z);
    const hw = C.w / 2;
    const hd = C.d / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(cart, sx * (hw - 0.06), sz * (hd - 0.06), 0.045);
    part(cart, rbox(C.w, 0.8, C.d, 0.03), '#f5f7f8', 0, 0.52, 0);
    part(cart, rbox(C.w + 0.03, 0.03, C.d + 0.03, 0.012), '#7986cb', 0, C.top - 0.015, 0);
    for (const sx of [-1, 1]) part(cart, box(0.012, 0.05, C.d), '#5c6bc0', sx * (hw + 0.005), C.top + 0.02, 0, { outline: false });
    part(cart, box(C.w, 0.05, 0.012), '#5c6bc0', 0, C.top + 0.02, -hd - 0.005, { outline: false });
    // The drawers: two columns of five, each a resident's (the top right one slides out).
    const WHO = ['101 김순자', '101 박영철', '102 이말순', '102 최복례', '103 정만석', '103 오금자', '104 한정희', '104 서옥분', '105 문덕수', '105 윤춘자'];
    const COLS = ['#ffe0b2', '#c8e6c9', '#bbdefb', '#f8bbd0', '#e1bee7'];
    const drawer = group(cart, 0, 0, 0);
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 2; col++) {
        const x = (col ? 1 : -1) * 0.15;
        const y = 0.79 - row * 0.15;
        const isHers = row === 0 && col === 1;
        const host = isHers ? drawer : cart;
        part(host, rbox(0.28, 0.13, 0.02, 0.01), COLS[(row + col) % COLS.length], x, y, hd + 0.01);
        part(host, rbox(0.1, 0.018, 0.02, 0.008), '#78909c', x, y + 0.035, hd + 0.025);
        label(host, WHO[row * 2 + col], 0.2, 0.04, x, y - 0.02, hd + 0.021, '#ffffff', '#37474f');
        if (isHers) part(drawer, box(0.26, 0.11, 0.3), '#eceff1', x, y, hd - 0.15, { outline: false });
      }
    for (let i = 0; i < 3; i++) part(drawer, rbox(0.05, 0.012, 0.07, 0.004), '#ffffff', 0.15 - 0.07 + i * 0.07, 0.86, hd - 0.12);
    // On top: the 요일 pill box, paper cups, the water jug, the sanitiser, the clipboard.
    const box7 = group(cart, -0.12, C.top, -0.08);
    part(box7, rbox(0.3, 0.035, 0.16, 0.008), '#ffffff', 0, 0.018, 0);
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    days.forEach((d, i) => {
      for (let j = 0; j < 3; j++) part(box7, box(0.034, 0.008, 0.042), ['#ffcc80', '#a5d6a7', '#90caf9'][j], -0.13 + i * 0.043, 0.04, -0.05 + j * 0.05, { outline: false });
      label(box7, d, 0.03, 0.022, -0.13 + i * 0.043, 0.02, 0.082, '#ffffff', i > 4 ? '#e53935' : '#37474f');
    });
    for (let i = 0; i < 5; i++) paperCup(cart, -0.25, C.top + i * 0.012, 0.12);
    glass(cart, cyl(0.045, 0.04, 0.2, 14), 0.24, C.top + 0.1, -0.14);
    part(cart, cyl(0.04, 0.035, 0.15, 14), '#b3e5fc', 0.24, C.top + 0.075, -0.14, { outline: false });
    part(cart, cyl(0.03, 0.03, 0.12, 12), '#e1f5fe', 0.1, C.top + 0.06, -0.18);
    part(cart, cyl(0.006, 0.006, 0.05, 6), '#ffffff', 0.1, C.top + 0.145, -0.18, { outline: false });
    const clip = group(g, CW.MED.clip[0], C.top + 0.003, CW.MED.clip[2]);
    part(clip, rbox(0.16, 0.008, 0.22, 0.004), '#8d6e63', 0, 0, 0);
    flat(clip, painted('cwMedLog', 128, 170, paintMedLog), 0.14, 0.19, 0, 0.006, 0.0);
    part(clip, box(0.06, 0.012, 0.015), CHROME, 0, 0.01, -0.1, { outline: false });
    // The push handle; a bin at the side.
    for (const sz of [-1, 1]) rod(cart, v3(-hw, C.top - 0.05, sz * 0.15), v3(-hw - 0.07, C.top, sz * 0.15), 0.012, '#5c6bc0');
    part(cart, cyl(0.016, 0.016, 0.34, 10), '#3949ab', -hw - 0.07, C.top, 0, { rx: Math.PI / 2 });
    part(cart, cyl(0.08, 0.07, 0.22, 14), '#90a4ae', -hw - 0.06, 0.5, 0.12);
    // The fold-out side shelf with the blood pressure monitor, its cuff and tube.
    const bp = CW.MED.bp;
    part(g, rbox(0.2, 0.02, 0.3, 0.008), '#c5cae9', bp[0] + 0.0, bp[1] - 0.01, bp[2] + 0.02);
    rod(g, v3(C.x + hw, bp[1] - 0.25, bp[2] - 0.1), v3(bp[0] + 0.08, bp[1] - 0.02, bp[2] - 0.1), 0.008, CHROME);
    rod(g, v3(C.x + hw, bp[1] - 0.25, bp[2] + 0.12), v3(bp[0] + 0.08, bp[1] - 0.02, bp[2] + 0.12), 0.008, CHROME);
    const mon = group(g, bp[0], bp[1], bp[2], -0.4);
    part(mon, rbox(0.14, 0.07, 0.11, 0.02), '#fafafa', 0, 0.035, 0);
    part(mon, box(0.1, 0.05, 0.004), '#37474f', 0, 0.05, 0.058, { rx: -0.35, outline: false });
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.045), lcdMat(0, false));
    lcd.userData.ownGeometry = true;
    lcd.position.set(0, 0.052, 0.062);
    lcd.rotation.x = -0.35;
    mon.add(lcd);
    part(mon, cyl(0.012, 0.012, 0.01, 10), '#1e88e5', 0.045, 0.074, 0.03, { outline: false });
    label(mon, '혈압계', 0.06, 0.018, -0.03, 0.074, 0.03, '#fafafa', '#1e88e5').rotation.set(-Math.PI / 2, 0, 0);
    const cuffIdle = part(g, rbox(0.14, 0.03, 0.06, 0.01), '#283593', bp[0] + 0.02, bp[1] + 0.015, bp[2] + 0.13);
    const tube = limb(g, 0.005, '#cfd8dc');

    // The resident's wheelchair; she's there while she's seen to.
    const Rz = CW.MED.res;
    wheelchair(g, Rz.x, Rz.z, Rz.yaw, '#8d9aa6', '#6d4c41');
    const use = group(g);
    out.inUse = use;
    const res = seated(use, LOOKS.bokrye, Rz.x, Rz.z, Rz.yaw, Rz.seat);
    const cuff = part(res.upper, cyl(0.06, 0.06, 0.12, 14), '#283593', 0.2, 0.32, 0.0);
    const packet = group(use);
    part(packet, rbox(0.1, 0.008, 0.07, 0.003), '#ffffff', 0, 0, 0);
    label(packet, '최복례 · 아침', 0.08, 0.025, 0, 0.005, 0.0, '#ffffff', '#3949ab').rotation.set(-Math.PI / 2, 0, 0);
    const pillCup = group(use);
    part(pillCup, cyl(0.022, 0.016, 0.03, 12), '#fff59d', 0, 0.015, 0);
    for (let i = 0; i < 3; i++) part(pillCup, ball(0.007), ['#ffffff', '#ef9a9a', '#ffcc80'][i], (i - 1) * 0.008, 0.032, 0, { outline: false });
    const water = paperCup(use);
    void n;

    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = {
      cwGiveMeds: spotAt(g, CW.MEDS_AT, 'stand', 'cwMeds', mark),
      cwCheckBp: spotAt(g, CW.BP_AT, 'stand', 'cwBp', mark),
      '*': spotAt(g, CW.MEDS_AT, 'stand', 'cwMeds', mark),
    };
    out.spots = spots;
    out.work = mark;
    const monAt = v3(bp[0] + 0.07, bp[1] + 0.02, bp[2]);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = now ? spots[now].motion : null;
      const ph = phaseOf(mark);
      drawer.position.z = 0;
      packet.visible = pillCup.visible = water.visible = false;
      cuff.visible = false;
      cuffIdle.visible = true;
      lcd.material = lcdMat(0, false);
      tube(monAt, v3(bp[0] + 0.02, bp[1] + 0.03, bp[2] + 0.12));
      if (!m) return;
      res.head.rotation.y = 0;
      res.armL(null);
      res.armR(null);
      res.mouth(0);
      if (m === 'cwMeds') {
        const b = CW.medsBeat(t, ph);
        const k = CW.careKeyOf('cwMeds', t, ph).key;
        drawer.position.z = 0.17 * CW.drawerOut(b);
        if (CW.packetHeld(b)) {
          packet.visible = true;
          packet.position.copy(vp(k.l).lerp(vp(k.r), 0.5)).add(v3(0, 0.01, 0));
          packet.rotation.set(b.from === 'name' || b.from === 'tear' ? 1.2 : 0, Math.PI, 0);
        }
        // Her palm out with the little cup, then the water to her lips.
        const pills = CW.pillCup(b);
        const up = CW.waterUp(b);
        if (pills && up < 0.5) {
          pillCup.visible = true;
          pillCup.position.copy(vp(CW.MED_PALM, 0.01));
          res.armL(vp(CW.MED_PALM));
        }
        if (up > 0.2) {
          water.visible = true;
          const at = vp(CW.MED_MOUTH, -0.12).lerp(vp(k.r), 1 - up);
          water.position.copy(at);
          res.armL(at.clone().add(v3(0.0, 0.05, 0.04)));
          res.head.rotation.x = -0.15 * up;
        } else res.head.rotation.x = CW.amountOf(b, 'name') > 0.5 ? 0.05 : 0.15;
        res.mouth(CW.amountOf(b, 'name') * 0.4 * Math.max(0, Math.sin(t * 7)));
      } else {
        const b = CW.bpBeat(t, ph);
        const on = CW.cuffOn(b);
        cuff.visible = on;
        cuffIdle.visible = !on;
        const r = CW.bpReading(b);
        lcd.material = lcdMat(r.done ? 128 : Math.round(r.mmHg / 10) * 10, r.done);
        res.armL(vp(CW.BP_HAND));
        res.head.rotation.y = 0.5;
        res.head.rotation.x = 0.1;
        res.mouth(CW.amountOf(b, 'tell') * 0.3 * Math.max(0, Math.sin(t * 6)));
        if (on) tube(monAt, vp(CW.MED_ARM, 0.02));
      }
    };
  },

  /**
   * The 생활실 activity table: a long light-oak table with two residents at its far side (최복례
   * 어르신 in a chair, 박영철 어르신 in his wheelchair) and the carer's chair at its near side. On it
   * the green army blanket for 화투, cards laid out on it and the red-backed pile, colouring sheets
   * (무궁화, 모란) and an open box of 색연필, a plate of 귤.
   *
   * 화투 (cwPlayHwatu): sat across from them, a fan of cards in the hand, one picked, raised and
   * slapped down on the blanket (탁!), the pair taken to the pile, a laugh and a clap, their turns
   * watched while they slap theirs. Colouring (cwColoring): colouring the 무궁화 together, the sheet
   * held up to show, a finger along a resident's petals, a crayon handed across.
   */
  cwActivityTable(g, _W, _D, _c, _def, _ctx, out) {
    const n = actCount++;
    const A = CW.ACT;
    // The table.
    part(g, rbox(1.5, 0.04, 0.8, 0.02), OAK, 0, A.top - 0.02, 0);
    part(g, box(1.42, 0.06, 0.72), OAK_DARK, 0, A.top - 0.07, 0, { outline: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.03, 0.025, A.top - 0.04, 10), OAK_DARK, sx * 0.66, (A.top - 0.04) / 2, sz * 0.32, { outline: false });
    // The green blanket, the cards on it, the pile.
    part(g, rbox(A.mat.w, 0.012, A.mat.d, 0.005), '#5b6b2f', A.mat.x, A.top + 0.006, A.mat.z);
    const laid: Array<[number, number, number, number]> = [[-0.18, -0.12, 0, 0.1], [-0.06, -0.13, 2, -0.05], [0.07, -0.12, 3, 0.08], [0.18, -0.1, 4, -0.1], [-0.12, 0.13, 1, 0.05]];
    for (const [x, z, mth, ry] of laid) flat(g, hwatuTex(mth), 0.045, 0.07, A.mat.x + x, A.top + 0.0135, A.mat.z + z, ry);
    for (let i = 0; i < 6; i++) flat(g, hwatuTex(-1), 0.045, 0.07, A.mat.x + 0.19, A.top + 0.0135 + i * 0.002, A.mat.z + 0.13, 0.05 * i);
    // The colouring: the carer's sheet, theirs, the crayon box.
    const sheet = flat(g, coloringTex(0, 0.6), 0.2, 0.15, A.sheet[0], A.sheet[1], A.sheet[2], Math.PI);
    flat(g, coloringTex(1, 0.8), 0.2, 0.15, A.sheetA[0], A.sheetA[1], A.sheetA[2]);
    flat(g, coloringTex(0, 0.4), 0.2, 0.15, A.sheetB[0], A.sheetB[1], A.sheetB[2]);
    const crayons = group(g, -0.5, A.top, 0.2, 0.3);
    part(crayons, rbox(0.16, 0.02, 0.09, 0.005), '#ffeb3b', 0, 0.01, 0);
    const CR = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#ec407a'];
    CR.forEach((col, i) => part(crayons, cyl(0.005, 0.005, 0.08, 6), col, -0.06 + i * 0.017, 0.026, 0, { rx: Math.PI / 2, outline: false }));
    // A plate of 귤.
    part(g, cyl(0.1, 0.08, 0.015, 18), '#ffffff', 0.58, A.top + 0.008, 0.18);
    for (let i = 0; i < 4; i++) part(g, ball(0.035), '#fb8c00', 0.58 + Math.cos(i * 1.6) * 0.04, A.top + 0.045 + (i === 3 ? 0.04 : 0), 0.18 + Math.sin(i * 1.6) * 0.04);
    // The carer's chair at the near side, the residents' chair and wheelchair at the far side.
    const chairAt = (x: number, z: number, ry: number, fabric: string) => {
      const c = group(g, x, 0, z, ry);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.018, 0.015, 0.42, 8), OAK_DARK, sx * 0.19, 0.21, sz * 0.18, { outline: false });
      part(c, rbox(0.44, 0.05, 0.42, 0.02), fabric, 0, 0.44, 0);
      for (const sx of [-1, 1]) part(c, cyl(0.016, 0.016, 0.44, 8), OAK_DARK, sx * 0.19, 0.66, -0.19, { outline: false });
      part(c, rbox(0.42, 0.24, 0.05, 0.02), fabric, 0, 0.72, -0.2, { rx: -0.08 });
    };
    chairAt(CW.ACT_AT.x, CW.ACT_AT.z, Math.PI, '#a5d6a7');
    chairAt(A.resA.x, A.resA.z, 0, '#ffcc80');
    wheelchair(g, A.resB.x, A.resB.z, 0, '#78909c', '#37474f');
    const resA = seated(g, LOOKS.bokrye, A.resA.x, A.resA.z, 0, A.resA.seat);
    const resB = seated(g, LOOKS.youngchul, A.resB.x, A.resB.z, 0, A.resB.seat);

    // Cards in hands: a fan each, the carer's card, the one slapped down; the carer's crayon.
    const fan = (parent: THREE.Object3D, ry: number) => {
      const f = group(parent);
      const inner = group(f, 0, 0, 0, ry);
      for (let i = 0; i < 5; i++) {
        const c = picture(inner, hwatuTex(i % 6), 0.045, 0.07, (i - 2) * 0.018, 0.03 + Math.abs(i - 2) * -0.004, i * 0.001, '#ffffff', 0, 0);
        c.rotation.z = (2 - i) * 0.18;
        c.rotation.x = -0.35;
      }
      return f;
    };
    const use = group(g);
    out.inUse = use;
    const myFan = fan(use, 0);
    const fanA = fan(g, Math.PI);
    const fanB = fan(g, Math.PI);
    const inHand = picture(use, hwatuTex(5), 0.045, 0.07, 0, 0, 0);
    const down = flat(use, hwatuTex(5), 0.045, 0.07, 0, A.top + 0.016, 0);
    const crayon = part(use, cyl(0.006, 0.006, 0.09, 6), '#ec407a', 0, 0, 0, { outline: false });
    const crayonA = part(g, cyl(0.006, 0.006, 0.09, 6), '#8e24aa', 0, 0, 0, { outline: false });
    const crayonB = part(g, cyl(0.006, 0.006, 0.09, 6), '#43a047', 0, 0, 0, { outline: false });

    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = {
      cwPlayHwatu: spotAt(g, CW.ACT_AT, 'sit', 'cwHwatu', mark),
      cwColoring: spotAt(g, CW.ACT_AT, 'sit', 'cwColor', mark),
      '*': spotAt(g, CW.ACT_AT, 'sit', 'cwHwatu', mark),
    };
    out.spots = spots;
    out.work = mark;
    /** Where a resident's hand colours on their sheet. */
    const colorAt = (s: CW.P, t: number, k: number) => v3(s[0] + 0.03 * Math.sin(t * 5 + k), A.top + 0.03, s[2] + 0.02 * Math.cos(t * 3.7 + k));
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = now ? spots[now].motion : null;
      const ph = phaseOf(mark);
      const playing = m === 'cwHwatu';
      const coloring = m === 'cwColor';
      myFan.visible = playing;
      fanA.visible = fanB.visible = playing;
      inHand.visible = down.visible = crayon.visible = false;
      crayonA.visible = crayonB.visible = !playing;
      sheet.position.set(A.sheet[0], A.sheet[1], A.sheet[2]);
      sheet.rotation.set(-Math.PI / 2, Math.PI, 0);
      // The residents: they play or colour along; left be, she colours slowly and he dozes.
      const handA = v3(A.resA.x - 0.12, A.top + 0.12, A.resA.z + 0.36);
      const handB = v3(A.resB.x + 0.12, A.top + 0.12, A.resB.z + 0.36);
      resB.eyes(!m && Math.sin(t * 0.2 + n) > -0.3);
      resB.head.rotation.x = !m ? 0.3 + 0.05 * Math.sin(t * 0.5) : 0.15;
      resA.head.rotation.x = 0.3;
      if (playing) {
        const b = CW.hwatuBeat(t, ph);
        const k = CW.careKeyOf('cwHwatu', t, ph).key;
        myFan.position.copy(vp(k.l, 0.03));
        myFan.rotation.set(0, 0, 0);
        if (CW.cardInHand(b)) {
          inHand.visible = true;
          inHand.position.copy(vp(k.r, 0.04));
          inHand.rotation.set(-0.4, 0, 0);
        }
        if (CW.cardDown(b)) {
          down.visible = true;
          const p = CW.slapPoint(b.n);
          down.position.set(p[0], p[1] + 0.004, p[2]);
        }
        // Their fans held up; she slaps hers down while they're watched, he claps at the laugh.
        fanA.position.copy(handA).add(v3(0, 0.02, 0));
        fanB.position.copy(handB).add(v3(0, 0.02, 0));
        resA.armL(handA);
        resB.armR(handB);
        const watch = b.from === 'watch' ? b.p : -1;
        const slap = watch > 0.3 && watch < 0.6 ? Math.sin(((watch - 0.3) / 0.3) * Math.PI) : 0;
        resA.armR(v3(A.resA.x + 0.12, A.top + 0.03 + 0.25 * slap, A.resA.z + 0.5 - 0.05 * slap));
        const clap = CW.amountOf(b, 'laugh') * Math.max(0, Math.sin(t * 14));
        resB.armL(clap > 0.05 ? v3(A.resB.x - 0.02, 0.92, A.resB.z + 0.3) : v3(A.resB.x - 0.12, A.top + 0.03, A.resB.z + 0.42));
        if (clap > 0.05) resB.armR(v3(A.resB.x + 0.04, 0.92, A.resB.z + 0.3));
        resA.mouth(CW.amountOf(b, 'laugh') * 0.6);
        resB.mouth(CW.amountOf(b, 'laugh') * 0.6);
      } else {
        // Colouring (with the carer, or on their own).
        resA.armL(v3(A.sheetA[0] + 0.1, A.top + 0.02, A.sheetA[2] + 0.04));
        const pa = colorAt(A.sheetA, t * (m ? 1 : 0.4), 0);
        resA.armR(pa);
        crayonA.position.copy(pa).add(v3(0, 0.04, 0));
        crayonA.rotation.set(0.4, 0, 0.3);
        const pb = colorAt(A.sheetB, t, 2);
        resB.armR(coloring ? pb : null);
        resB.armL(null);
        crayonB.visible = coloring;
        crayonB.position.copy(pb).add(v3(0, 0.04, 0));
        crayonB.rotation.set(0.4, 0, -0.3);
        resA.mouth(0);
        resB.mouth(0);
        if (coloring) {
          const b = CW.colorBeat(t, ph);
          const k = CW.careKeyOf('cwColor', t, ph).key;
          crayon.visible = true;
          crayon.position.copy(vp(k.r, 0.035));
          crayon.rotation.set(0.5, 0, -0.2);
          const show = CW.sheetShown(b);
          if (show > 0.05) {
            const mid = vp(k.l).lerp(vp(k.r), 0.5).add(v3(0, 0.08, 0));
            sheet.position.lerpVectors(vp(A.sheet), mid, show);
            sheet.rotation.set(-Math.PI / 2 + (Math.PI / 2) * show, 0, 0);
            crayon.visible = false;
          }
          // The crayon handed across: he reaches for it.
          if (CW.crayonOut(b)) resB.armL(vp(k.r));
          resB.head.rotation.x = 0.35;
        }
      }
    };
  },

  /**
   * The 노래 교실 corner: a big screen on the wall with the words of the song over a spring hillside
   * (a karaoke wipe running along them while it's sung), the 노래방 machine on a low cabinet with its
   * song number lit and two microphones in their stand, a speaker on a stand each side, a basket of
   * maracas and the tambourine, '즐거운 노래 교실 ♪ 매주 화 · 목 오후 3시' along the top with an LED
   * strip, paper notes on the wall.
   *
   * Leading the song (cwSingAlong): stood before the screen facing the room, the tambourine shaken up
   * high, struck on the beat at the chest, both arms up swaying, the hands held out to everyone (다
   * 같이!).
   */
  cwSongCorner(g, _W, _D, _c, _def, _ctx, out) {
    // The cabinet, the machine, the microphones, the song book.
    part(g, rbox(1.1, 0.5, 0.36, 0.02), OAK, 0, 0.25, -0.3);
    for (const sx of [-1, 1]) part(g, box(0.5, 0.004, 0.004), OAK_DARK, sx * 0.27, 0.3, -0.118, { outline: false });
    part(g, rbox(0.42, 0.1, 0.3, 0.02), '#212121', -0.18, 0.55, -0.32);
    glowing(g, box(0.16, 0.04, 0.005), '#ff6f00', -0.24, 0.56, -0.168);
    label(g, '♪ 05823', 0.14, 0.03, -0.24, 0.56, -0.164, '#1a1a1a', '#ffab40');
    for (let i = 0; i < 4; i++) part(g, cyl(0.012, 0.012, 0.004, 10), ['#e53935', '#43a047', '#1e88e5', '#fdd835'][i], -0.06 + i * 0.03, 0.602, -0.22, { outline: false });
    part(g, rbox(0.22, 0.04, 0.3, 0.01), '#c62828', 0.22, 0.52, -0.32);
    label(g, '노래책', 0.12, 0.04, 0.22, 0.541, -0.32, '#c62828', '#ffffff').rotation.set(-Math.PI / 2, 0, 0);
    const micStand = group(g, 0.42, 0.5, -0.36);
    part(micStand, rbox(0.12, 0.03, 0.08, 0.01), '#424242', 0, 0.015, 0);
    for (const sx of [-1, 1]) {
      part(micStand, cyl(0.016, 0.012, 0.16, 10), sx > 0 ? '#212121' : '#9e9e9e', sx * 0.03, 0.1, 0, { rx: 0.15 });
      part(micStand, ball(0.03), sx > 0 ? '#616161' : '#e0e0e0', sx * 0.03, 0.19, 0.01);
    }
    // The screen on the wall.
    part(g, rbox(1.26, 0.76, 0.05, 0.015), '#111111', 0, 1.36, -0.465);
    out.screen = litScreen(g, painted('cwLyrics', 320, 180, paintLyrics), 1.2, 0.68, 0, 1.36, -0.435);
    const wipeMat = new THREE.MeshBasicMaterial({ color: '#ffd54f', transparent: true, opacity: 0.45, depthWrite: false });
    const wipe = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.08), wipeMat);
    wipe.userData.ownGeometry = wipe.userData.ownMaterial = true;
    g.add(wipe);
    // The speakers.
    for (const sx of [-1, 1]) {
      const s = group(g, sx * 0.84, 0, -0.3);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        rod(s, v3(0, 0.9, 0), v3(Math.sin(a) * 0.15, 0.0, Math.cos(a) * 0.15), 0.008, '#424242');
      }
      part(s, cyl(0.014, 0.014, 0.4, 8), '#424242', 0, 1.0, 0, { outline: false });
      part(s, rbox(0.24, 0.36, 0.22, 0.02), '#263238', 0, 1.32, 0);
      part(s, cyl(0.075, 0.075, 0.01, 16), '#455a64', 0, 1.27, 0.111, { rx: Math.PI / 2 });
      part(s, cyl(0.03, 0.03, 0.012, 12), '#90a4ae', 0, 1.42, 0.111, { rx: Math.PI / 2 });
    }
    // The banner and its LED strip, paper notes.
    part(g, rbox(1.5, 0.2, 0.02, 0.01), '#fff8e1', 0, 1.9, -0.488);
    label(g, '즐거운 노래 교실 ♪ 매주 화 · 목 오후 3시', 1.36, 0.12, 0, 1.9, -0.476, '#fff8e1', '#d84315');
    const led = ownGlow(g, box(1.46, 0.015, 0.01), '#ff80ab', 0, 1.79, -0.48);
    const NOTES: Array<[number, number, string]> = [[-0.85, 1.75, '#f48fb1'], [0.86, 1.72, '#81d4fa'], [-0.72, 0.95, '#fff176'], [0.74, 0.92, '#a5d6a7']];
    for (const [x, y, col] of NOTES) label(g, '♪', 0.1, 0.12, x, y, -0.488, col, '#5d4037');
    // The basket of rhythm instruments.
    part(g, cyl(0.12, 0.1, 0.1, 16), '#bcaaa4', 0.0, 0.55, -0.22);
    for (const sx of [-1, 1]) {
      part(g, ball(0.04), sx > 0 ? '#e53935' : '#fdd835', sx * 0.05, 0.64, -0.24);
      part(g, cyl(0.008, 0.008, 0.1, 6), '#6d4c41', sx * 0.05, 0.59, -0.24, { outline: false });
    }
    const tambourine = (parent: THREE.Object3D) => {
      const tb = group(parent);
      part(tb, cyl(0.1, 0.1, 0.04, 20, ), '#c62828', 0, 0, 0, { rx: Math.PI / 2 });
      part(tb, cyl(0.093, 0.093, 0.042, 20), '#fff8e1', 0, 0, 0, { rx: Math.PI / 2, outline: false });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        part(tb, cyl(0.016, 0.016, 0.008, 10), '#ffd54f', Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0, { rx: Math.PI / 2, outline: false });
      }
      return tb;
    };
    const idleTamb = tambourine(g);
    idleTamb.position.set(-0.02, 0.62, -0.2);
    idleTamb.rotation.set(-1.0, 0, 0);
    const use = group(g);
    out.inUse = use;
    const tamb = tambourine(use);

    const mark = marker(g, 0, 0.9, 0);
    const s = spotAt(g, CW.SING_AT, 'stand', 'cwSing', mark);
    out.spots = { cwSingAlong: s, '*': s };
    out.work = mark;
    out.animate = (t) => {
      const on = Math.abs(t - posedAt(s)) < 0.6;
      idleTamb.visible = !on;
      led.visible = on;
      wipe.visible = on;
      if (!on) return;
      const ph = phaseOf(mark);
      const k = CW.careKeyOf('cwSing', t, ph).key;
      const jingle = 0.03 * Math.sin(t * 40);
      tamb.position.copy(vp(k.r, 0.02)).add(v3(jingle, 0, 0));
      tamb.rotation.set(0.2, 0, 0.4 * Math.sin(t * CW.SONG_BPS * Math.PI));
      // The wipe runs along the line being sung, two lines in turn.
      const u = frac(t / 16);
      const line = u < 0.5 ? 0 : 1;
      const p = (u % 0.5) * 2;
      const w = 1.0 * p + 0.001;
      wipe.scale.set(w, 1, 1);
      wipe.position.set(-0.5 + w / 2, 1.36 + (line ? -0.08 : 0.12), -0.432);
      (led.material as THREE.MeshBasicMaterial).color.set(Math.sin(t * CW.SONG_BPS * Math.PI * 2) > 0 ? '#ff80ab' : '#80d8ff');
    };
  },

  /**
   * The memory wall (추억의 사진관): a cork board framed in dark wood with the residents' photos —
   * a black-and-white 1965 wedding, a 1978 day at 해운대, a family in front of their house, a 회갑
   * 잔치, planting rice, this year's birthday party at the home — each captioned, paper bunting and
   * carnations along it, the month's birthdays on a card, a ledge with flowers and an old radio.
   *
   * Talking over old photos (cwReminisce): stood at it with 정만석 어르신 and his cane; a finger to
   * his wedding photo (이때 몇 살이셨어요?), listening as he tells it (his finger on the photo), a
   * laugh, a hand on his back.
   */
  cwMemoryWall(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(1.92, 1.16, 0.05, 0.02), '#6d4c41', 0, 1.4, -0.47);
    part(g, box(1.8, 1.04, 0.01), '#c9a27a', 0, 1.4, -0.442);
    const cr = seeded(13);
    for (let i = 0; i < 50; i++) part(g, box(0.012, 0.012, 0.002), '#a9825a', -0.88 + cr() * 1.76, 0.9 + cr() * 1.0, -0.436, { outline: false });
    part(g, rbox(0.72, 0.12, 0.012, 0.01), '#fff8e1', 0, 1.86, -0.436);
    label(g, '추억의 사진관', 0.62, 0.1, 0, 1.86, -0.429, '#fff8e1', '#6d4c41');
    // The photos, each in its frame with its caption.
    const SPOTS: Array<[number, number, number]> = [[-0.08, 1.42, 0.0], [-0.62, 1.56, 0.06], [0.52, 1.6, -0.05], [-0.6, 1.1, -0.04], [0.14, 1.06, 0.03], [0.62, 1.16, 0.05]];
    const KIND = [0, 1, 2, 3, 4, 5];
    SPOTS.forEach(([x, y, rz], i) => {
      const f = group(g, x, y, -0.43);
      f.rotation.z = rz;
      const wide = i === 0 ? 1.25 : 1;
      part(f, rbox(0.28 * wide, 0.23 * wide, 0.015, 0.006), ['#3e2723', '#ffffff', '#8d6e63', '#c9a227', '#ffffff', '#f48fb1'][i], 0, 0, 0);
      picture(f, photoTex(KIND[i]), 0.24 * wide, 0.19 * wide, 0, 0, 0.009);
      label(f, PHOTO_CAPTIONS[i], 0.2, 0.04, 0, -0.15 * wide, 0.009, '#fffde7', '#5d4037');
      part(f, ball(0.012), '#e53935', 0, 0.12 * wide, 0.012, { outline: false });
    });
    // Bunting along the top, carnations in the corners.
    for (let i = 0; i < 12; i++) {
      const x = -0.82 + i * 0.15;
      const tri = part(g, cyl(0.045, 0.045, 0.005, 3), ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5'][i % 4], x, 1.74 - 0.02 * Math.sin((i / 11) * Math.PI), -0.432, { rx: Math.PI / 2, outline: false });
      tri.rotation.y = Math.PI / 2;
      tri.rotation.z = Math.PI;
    }
    for (const sx of [-1, 1]) {
      part(g, ball(0.045), '#e53935', sx * 0.84, 1.88, -0.43);
      part(g, ball(0.03), '#43a047', sx * 0.8, 1.84, -0.43, { outline: false });
    }
    // The birthday card.
    picture(g, painted('cwBirthdays', 120, 150, paintBirthdays), 0.2, 0.25, 0.85, 1.4, -0.435);
    // The ledge: a vase of flowers, an old radio, a little frame.
    part(g, rbox(1.6, 0.03, 0.15, 0.01), '#8d6e63', 0, 0.86, -0.41);
    part(g, cyl(0.04, 0.05, 0.14, 14), '#90caf9', -0.6, 0.94, -0.4);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      part(g, cyl(0.004, 0.004, 0.14, 6), '#558b2f', -0.6 + Math.cos(a) * 0.015, 1.06, -0.4 + Math.sin(a) * 0.015, { outline: false });
      part(g, ball(0.025), ['#f48fb1', '#fff176', '#ef5350', '#ce93d8', '#ffffff'][i], -0.6 + Math.cos(a) * 0.035, 1.14 + (i % 2) * 0.02, -0.4 + Math.sin(a) * 0.03);
    }
    const radio = group(g, 0.55, 0.875, -0.4);
    part(radio, rbox(0.26, 0.15, 0.1, 0.02), '#795548', 0, 0.075, 0);
    part(radio, box(0.12, 0.09, 0.004), '#d7ccc8', -0.05, 0.075, 0.051, { outline: false });
    for (let i = 0; i < 4; i++) part(radio, box(0.11, 0.004, 0.002), '#8d6e63', -0.05, 0.045 + i * 0.02, 0.054, { outline: false });
    for (const y of [0.05, 0.1]) part(radio, cyl(0.014, 0.014, 0.01, 10), '#3e2723', 0.08, y, 0.052, { rx: Math.PI / 2 });
    part(radio, cyl(0.003, 0.003, 0.2, 6), CHROME, 0.1, 0.24, 0.0, { rz: -0.3, outline: false });
    const mini = group(g, 0.1, 0.875, -0.4);
    part(mini, rbox(0.12, 0.15, 0.015, 0.006), '#c9a227', 0, 0.075, 0, { rx: -0.15 });
    picture(mini, photoTex(3), 0.1, 0.12, 0, 0.075, 0.009, '#ffffff', 0, -0.15);

    // In use: 정만석 어르신 with his cane.
    const use = group(g);
    out.inUse = use;
    const M = CW.MEM.res;
    const res = figure(use, LOOKS.mansuk);
    res.root.position.set(M.x, 0, M.z);
    res.root.rotation.y = M.yaw;
    const cane = group(use);
    part(cane, cyl(0.012, 0.012, 0.86, 8), '#5d4037', 0, 0.43, 0, { outline: false });
    part(cane, ring(0.04, 0.012, Math.PI), '#5d4037', 0.04, 0.86, 0, { outline: false });
    const caneAt = vp(CW.onMemResident(0.22, 0, 0.12));
    cane.position.copy(caneAt);
    cane.rotation.y = M.yaw;

    const mark = marker(g, 0, 0.9, 0);
    const s = spotAt(g, CW.MEM_AT, 'stand', 'cwRemember', mark);
    out.spots = { cwReminisce: s, '*': s };
    out.work = mark;
    out.animate = (t) => {
      if (Math.abs(t - posedAt(s)) >= 0.6) return;
      const ph = phaseOf(mark);
      const b = CW.memBeat(t, ph);
      res.armL(caneAt.clone().add(v3(0, 0.86, 0)));
      const telling = CW.amountOf(b, 'listen');
      res.armR(telling > 0.5 ? vp(CW.add3(CW.MEM.photo, [-0.06, -0.02, 0.1])) : null);
      res.head.rotation.y = CW.amountOf(b, 'laugh') + CW.amountOf(b, 'arm') > 0.5 ? -0.6 : 0;
      res.head.rotation.x = -0.15;
      res.mouth(Math.max(telling * 0.45 * Math.max(0, Math.sin(t * 6.5)), CW.amountOf(b, 'laugh') * 0.7));
    };
  },

  /**
   * The care station (간호 스테이션): a light-wood desk along the wall under the nurse call panel
   * (호출벨 표시반: a lamp a room, 101–106, the toilets, the bathroom, the day room) with the
   * interphone handset on its cradle beside it, the day's notes on a whiteboard (오늘의 특이 사항),
   * the monitor with the 장기요양 급여 제공 기록, the binders (투약 · 체위 변경 · 식사 · 배설 · 목욕 ·
   * 인수인계), the 돌봄 일지 and a pen, the call log.
   *
   * The care record (cwWriteCareLog): sat at the desk writing up the 돌봄 일지. The nurse call
   * (cwAnswerCall): stood at the panel — the flashing room found and its lamp pressed, the handset
   * lifted (네, 어르신, 바로 갈게요), hung up, the time written in the call log. Anything else: typed up
   * at the monitor.
   */
  cwCareStation(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.74;
    part(g, rbox(1.9, 0.035, 0.5, 0.012), OAK, 0, top - 0.0175, -0.24);
    part(g, rbox(0.4, top - 0.04, 0.46, 0.012), OAK_DARK, 0.72, (top - 0.04) / 2, -0.24);
    for (let i = 0; i < 3; i++) part(g, box(0.12, 0.012, 0.012), CHROME, 0.72, 0.2 + i * 0.2, 0.0, { outline: false });
    part(g, rbox(0.035, top - 0.04, 0.46, 0.01), OAK_DARK, -0.92, (top - 0.04) / 2, -0.24);
    part(g, box(1.4, 0.35, 0.015), OAK_DARK, -0.2, 0.45, -0.46, { outline: false });
    // The nurse call panel with its lamps (one flashing while it's answered), the interphone.
    const panel = group(g, 0.45, 1.43, -0.47);
    part(panel, rbox(0.7, 0.46, 0.05, 0.015), '#f5f0e6', 0, 0, 0);
    label(panel, '호출벨 표시반', 0.36, 0.05, 0, 0.19, 0.027, '#f5f0e6', TEAL);
    const ROOMS = ['101', '102', '103', '104', '105', '106', '화장실', '욕실', '생활실'];
    const lamps: THREE.Mesh[] = [];
    ROOMS.forEach((r, i) => {
      const x = (i % 3) * 0.2 - 0.2;
      const y = 0.07 - Math.floor(i / 3) * 0.12;
      part(panel, rbox(0.07, 0.05, 0.02, 0.008), '#cfd8dc', x, y, 0.03);
      const lit = glowing(panel, box(0.06, 0.04, 0.004), '#ff1744', x, y, 0.042);
      lit.visible = false;
      lamps.push(lit);
      label(panel, r, 0.08, 0.028, x, y - 0.045, 0.027, '#f5f0e6', '#37474f');
    });
    const CALLED = 4;
    const answered = glowing(panel, box(0.06, 0.04, 0.004), '#00e676', 0, -0.05, 0.042);
    answered.position.set((CALLED % 3) * 0.2 - 0.2, 0.07 - Math.floor(CALLED / 3) * 0.12, 0.042);
    const cr = CW.CALL.cradle;
    part(g, rbox(0.12, 0.2, 0.05, 0.015), '#eceff1', cr[0], cr[1], -0.47);
    const handset = (parent: THREE.Object3D) => {
      const h = group(parent);
      part(h, rbox(0.045, 0.18, 0.04, 0.018), '#eceff1', 0, 0, 0);
      part(h, cyl(0.025, 0.025, 0.03, 12), '#eceff1', 0, 0.08, 0.02, { rx: Math.PI / 2 });
      part(h, cyl(0.025, 0.025, 0.03, 12), '#eceff1', 0, -0.08, 0.02, { rx: Math.PI / 2 });
      return h;
    };
    const onCradle = handset(g);
    onCradle.position.set(cr[0], cr[1], -0.43);
    const cord = limb(g, 0.006, '#cfd8dc');
    // The whiteboard of the day's notes.
    part(g, rbox(0.72, 0.48, 0.02, 0.01), '#b0bec5', -0.45, 1.45, -0.488);
    picture(g, painted('cwWhiteboard', 220, 140, paintWhiteboard), 0.68, 0.44, -0.45, 1.45, -0.476);
    // The monitor and keyboard, the binders, the 돌봄 일지 and the call log.
    const mon = group(g, -0.62, top, -0.36);
    part(mon, rbox(0.2, 0.012, 0.14, 0.005), BLACK, 0, 0.006, 0);
    part(mon, box(0.035, 0.14, 0.025), BLACK, 0, 0.08, -0.01, { outline: false });
    part(mon, rbox(0.47, 0.3, 0.025, 0.01), BLACK, 0, 0.3, 0.01);
    out.screen = litScreen(mon, painted('cwCareRecord', 320, 200, paintCareRecord), 0.44, 0.27, 0, 0.3, 0.024);
    part(g, rbox(0.34, 0.016, 0.11, 0.006), '#37474f', -0.62, top + 0.008, -0.13);
    part(g, box(0.31, 0.004, 0.085), '#90a4ae', -0.62, top + 0.017, -0.13, { outline: false });
    const keys = marker(g, -0.62, top + 0.02, -0.13);
    const BIND: Array<[string, string]> = [['투약', '#5c6bc0'], ['체위 변경', '#26a69a'], ['식사·배설', '#ffa726'], ['목욕', '#42a5f5'], ['인수인계', '#ef5350']];
    BIND.forEach(([s, col], i) => {
      part(g, rbox(0.05, 0.3, 0.26, 0.008), col, -0.06 + i * 0.055, top + 0.15, -0.34);
      label(g, s, 0.045, 0.2, -0.06 + i * 0.055, top + 0.15, -0.209, col, '#ffffff');
    });
    const sheetAt = new THREE.Vector3(-0.32, top + 0.004, -0.12);
    part(g, rbox(0.18, 0.006, 0.24, 0.004), '#795548', sheetAt.x, top + 0.003, sheetAt.z);
    flat(g, painted('cwLogSheet', 128, 170, paintLogSheet), 0.16, 0.21, sheetAt.x, top + 0.0075, sheetAt.z);
    part(g, cyl(0.0045, 0.0045, 0.14, 6), '#1a237e', sheetAt.x + 0.12, top + 0.006, sheetAt.z, { rx: Math.PI / 2, outline: false });
    const sheet = marker(g, sheetAt.x, top + 0.01, sheetAt.z);
    const lg = CW.CALL.log;
    part(g, rbox(0.14, 0.008, 0.18, 0.004), '#fff59d', lg[0], top + 0.004, lg[2]);
    label(g, '호출 기록', 0.1, 0.025, lg[0], top + 0.009, lg[2] - 0.06, '#fff59d', '#5d4037').rotation.set(-Math.PI / 2, 0, 0);
    // A pen cup, the sanitiser, a desk calendar.
    part(g, cyl(0.03, 0.03, 0.09, 12), TEAL, 0.28, top + 0.045, -0.38);
    for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.13, 6), ['#1a237e', '#e53935', '#212121'][i], 0.27 + i * 0.01, top + 0.1, -0.38, { rz: (i - 1) * 0.15, outline: false });
    part(g, cyl(0.03, 0.03, 0.12, 12), '#e1f5fe', 0.4, top + 0.06, -0.4);
    part(g, rbox(0.12, 0.09, 0.05, 0.01), '#ffffff', 0.55, top + 0.045, -0.38, { rx: -0.3 });
    label(g, '10.27', 0.1, 0.05, 0.55, top + 0.05, -0.355, '#ffffff', '#c62828');
    // The desk chair.
    const LOG_AT: CW.SpotAt = { x: -0.32, y: 0.48, z: 0.36, yaw: Math.PI };
    const chair = group(g, LOG_AT.x, 0, LOG_AT.z + 0.04, Math.PI);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      rod(chair, v3(0, 0.1, 0), v3(Math.sin(a) * 0.26, 0.06, Math.cos(a) * 0.26), 0.016, BLACK);
      part(chair, ball(0.026), BLACK, Math.sin(a) * 0.26, 0.026, Math.cos(a) * 0.26, { outline: false });
    }
    part(chair, cyl(0.025, 0.025, 0.28, 10), CHROME, 0, 0.27, 0, { outline: false });
    part(chair, rbox(0.48, 0.09, 0.46, 0.04), '#4db6ac', 0, 0.435, 0);
    part(chair, rbox(0.46, 0.48, 0.08, 0.05), '#4db6ac', 0, 0.76, -0.23, { rx: -0.08 });

    // In use: the handset at the ear.
    const use = group(g);
    out.inUse = use;
    const inHand = handset(use);
    const mark = marker(g, 0, 0.9, 0);
    const write = spotAt(g, LOG_AT, 'sit', 'write', sheet);
    const call = spotAt(g, CW.CALL_AT, 'stand', 'cwCall', mark);
    const type = spotAt(g, LOG_AT, 'sit', 'type', keys);
    out.spots = { cwWriteCareLog: write, cwAnswerCall: call, '*': type };
    out.work = sheet;
    const cradleAt = v3(cr[0], cr[1] - 0.06, -0.45);
    out.animate = (t) => {
      const on = Math.abs(t - posedAt(call)) < 0.6;
      let up = false;
      let flashing = false;
      if (on) {
        const ph = phaseOf(mark);
        const b = CW.callBeat(t, ph);
        const k = CW.careKeyOf('cwCall', t, ph).key;
        up = CW.handsetUp(b);
        flashing = CW.callFlashing(b);
        if (up) {
          inHand.position.copy(vp(k.r, 0.03));
          inHand.rotation.set(0.2, Math.PI / 2, 0.3);
        }
      }
      lamps[CALLED].visible = flashing && Math.sin(t * 10) > 0;
      answered.visible = on && !flashing;
      inHand.visible = up;
      onCradle.visible = !up;
      cord(cradleAt, up ? inHand.position.clone().add(v3(0, -0.08, 0)) : cradleAt.clone().add(v3(0, -0.12, 0.02)));
    };
  },

  /**
   * A spare wheelchair (공용 휠체어) parked ready: grey frame, a brown sling, a knitted blanket folded
   * on the seat, its number on the back.
   */
  /**
   * The 목욕실 (3 × 2): a wet corner against tiled back and left walls, its floor sloped to a drain, a teal
   * non-slip mat, a white shower chair with armrests and rubber feet, grab rails along both walls, the mixer
   * with its 38℃ read-out and the hand shower on its bar; a curtain on a ceiling rail half drawn between that
   * and the dry side, where the towels hang and the fresh robe waits on a bench; a stand of big towels by the carer.
   *
   * Helping with a bath (cwBathAssist): the resident (never anything but covered: a robe to the ankles, a wrap
   * over the shoulders and lap, bath shoes) sits facing the carer, who tells her, runs the water, tries it on
   * their own wrist, goes over her feet and then over the shoulder of the wrap, steam rising, turns it off,
   * and brings a big towel round her shoulders. Kept from the camera by nothing: the open side faces it.
   */
  cwBathRoom(g, _W, _D, _c, _def, _ctx, out) {
    const wallH = 1.95;
    part(g, rbox(2.96, 0.03, 1.96, 0.01), '#d5e3e6', 0, 0.015, 0);
    flat(g, painted('cwBathFloor', 256, 170, paintBathFloor), 2.9, 1.9, 0, 0.032, 0);
    part(g, cyl(0.06, 0.06, 0.006, 16), STEEL, -0.2, 0.034, 0.32, { outline: false });
    flat(g, painted('cwBathMat', 128, 150, paintBathMat), 1.05, 1.2, -0.45, 0.036, -0.32);
    // The walls: tiled faces (in front of the wall's real front), a darker band at the foot.
    part(g, box(2.96, wallH, 0.06), '#dceaed', 0, wallH / 2, -0.97);
    picture(g, painted('cwBathTiles', 256, 256, paintBathTiles), 2.92, wallH - 0.04, 0, wallH / 2, -0.938);
    part(g, box(0.06, wallH, 1.96), '#dceaed', -1.45, wallH / 2, 0);
    picture(g, painted('cwBathTiles', 256, 256, paintBathTiles), 1.92, wallH - 0.04, -1.418, wallH / 2, 0, '#ffffff', Math.PI / 2);
    label(g, '목욕실', 0.46, 0.13, 0.95, 1.76, -0.934, '#00897b', '#ffffff');
    label(g, '미끄럼 주의', 0.3, 0.09, -0.1, 1.58, -0.934, '#ffd54f', '#bf360c');
    glowing(g, cyl(0.1, 0.1, 0.02, 18), '#fff4d6', -0.35, 1.8, -0.93, Math.PI / 2);
    // The grab rails, on standoffs.
    const rail = '#eeeeee';
    rod(g, v3(-1.2, 0.84, -0.89), v3(0.25, 0.84, -0.89), 0.017, rail);
    rod(g, v3(0.25, 0.84, -0.89), v3(0.25, 1.4, -0.89), 0.017, rail);
    for (const x of [-1.2, -0.5, 0.25]) part(g, cyl(0.022, 0.022, 0.05, 10), STEEL, x, 0.84, -0.915, { rx: Math.PI / 2, outline: false });
    rod(g, v3(-1.38, 0.84, -0.75), v3(-1.38, 0.84, 0.5), 0.017, rail);
    for (const z of [-0.75, 0.5]) part(g, cyl(0.022, 0.022, 0.05, 10), STEEL, -1.4, 0.84, z, { rz: Math.PI / 2, outline: false });
    // The mixer with its read-out, the riser bar with the hook.
    const M = CW.BATH.mixer;
    part(g, rbox(0.26, 0.09, 0.05, 0.015), CHROME, M[0], M[1], -0.91);
    for (const sx of [-1, 1]) part(g, cyl(0.022, 0.03, 0.05, 12), sx < 0 ? '#ef5350' : CHROME, M[0] + sx * 0.14, M[1], -0.89, { rx: Math.PI / 2 });
    label(g, '38℃', 0.09, 0.05, M[0], M[1] + 0.09, -0.92, '#102027', '#69f0ae');
    const Hk = CW.BATH.hook;
    rod(g, v3(Hk[0], 1.05, -0.92), v3(Hk[0], 1.7, -0.92), 0.012, CHROME);
    part(g, rbox(0.05, 0.04, 0.04, 0.01), '#eceff1', Hk[0], Hk[1], -0.915);
    // The shower chair, its back to +x, as CW.BATH.chair faces -x.
    const C = CW.BATH.chair;
    const chair = group(g, C.x, 0, C.z, C.yaw);
    part(chair, rbox(0.46, 0.04, 0.42, 0.018), '#fafafa', 0, C.seat - 0.02, 0);
    for (let i = 0; i < 3; i++) part(chair, cyl(0.012, 0.012, 0.042, 8), '#b0bec5', -0.1 + i * 0.1, C.seat - 0.02, 0.06, { outline: false });
    part(chair, rbox(0.44, 0.3, 0.035, 0.014), '#fafafa', 0, C.seat + 0.26, -0.21);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        rod(chair, v3(sx * 0.2, C.seat - 0.03, sz * 0.18), v3(sx * 0.23, 0.05, sz * 0.2), 0.012, STEEL);
        part(chair, cyl(0.022, 0.022, 0.05, 8), '#455a64', sx * 0.23, 0.03, sz * 0.2, { outline: false });
      }
      rod(chair, v3(sx * 0.24, C.seat + 0.2, -0.2), v3(sx * 0.24, C.seat + 0.2, 0.16), 0.014, STEEL);
      rod(chair, v3(sx * 0.24, C.seat - 0.02, 0.16), v3(sx * 0.24, C.seat + 0.2, 0.16), 0.012, STEEL);
      part(chair, rbox(0.05, 0.03, 0.26, 0.012), '#b0bec5', sx * 0.24, C.seat + 0.215, -0.03);
    }
    // The curtain: a ceiling rail between the wet side and the dry, half drawn from the back wall, in pleats.
    rod(g, v3(0.55, wallH + 0.04, -0.93), v3(0.55, wallH + 0.04, 0.93), 0.014, CHROME);
    part(g, box(0.03, 0.03, 0.03), STEEL, 0.55, wallH + 0.02, 0.93, { outline: false });
    for (let i = 0; i < 9; i++) part(g, box(0.05, 1.72, 0.1), i % 2 ? '#b2dfdb' : '#c8e6e1', 0.55 + (i % 2 ? 0.02 : -0.02), wallH - 0.86 + 0.04, -0.88 + i * 0.1, { outline: false });
    // The dry side: towels on a rail, a shelf of soap, the bench with a fresh robe, a laundry basket.
    rod(g, v3(0.78, 1.3, -0.9), v3(1.38, 1.3, -0.9), 0.012, CHROME);
    for (let i = 0; i < 2; i++) part(g, box(0.24, 0.5, 0.03), i ? '#ffe0b2' : '#ffffff', 0.92 + i * 0.3, 1.06, -0.89);
    part(g, rbox(0.62, 0.025, 0.14, 0.008), '#eceff1', 1.08, 1.52, -0.88);
    for (let i = 0; i < 3; i++) part(g, cyl(0.03, 0.035, 0.14, 12), ['#f8bbd0', '#b3e5fc', '#c8e6c9'][i], 0.88 + i * 0.2, 1.605, -0.87);
    part(g, rbox(0.72, 0.05, 0.36, 0.015), OAK, 1.05, 0.42, 0.1);
    for (const sx of [-1, 1]) part(g, box(0.05, 0.4, 0.3), OAK_DARK, 1.05 + sx * 0.28, 0.2, 0.1);
    part(g, rbox(0.46, 0.09, 0.28, 0.035), '#e8f1f5', 1.0, 0.49, 0.1);
    part(g, cyl(0.2, 0.17, 0.42, 18), '#d7ccc8', 0.95, 0.24, 0.72);
    part(g, ring(0.2, 0.012), '#a1887f', 0.95, 0.45, 0.72, { rx: Math.PI / 2, outline: false });
    // The big towels' stand, by the carer.
    const S = CW.BATH.stack;
    part(g, rbox(0.34, 0.03, 0.3, 0.01), '#eceff1', S[0], S[1] - 0.09, S[2]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) rod(g, v3(S[0] + a * 0.14, S[1] - 0.1, S[2] + b * 0.12), v3(S[0] + a * 0.15, 0.04, S[2] + b * 0.13), 0.01, STEEL);
    const stack = [0, 1, 2].map((i) => part(g, rbox(0.3, 0.055, 0.26, 0.018), i === 2 ? '#fff3e0' : '#ffffff', S[0], S[1] - 0.05 + i * 0.05, S[2], { outline: false }));
    // The hand shower on its hook, and in the hand; its hose.
    const onHook = handShower(g, 'showerOnHook');
    onHook.position.set(Hk[0], Hk[1], Hk[2]);
    onHook.quaternion.setFromUnitVectors(UP_Y, v3(0, -0.5, 0.85).normalize());
    const use = group(g);
    out.inUse = use;
    const hoseA = limb(g, 0.008, '#b0bec5');
    const hoseB = limb(g, 0.008, '#b0bec5');
    const showerTool = handShower(use, 'handShower');
    const spray = new THREE.Mesh(cyl(0.075, 0.03, 0.34, 14), WATER);
    spray.position.y = 0.25;
    showerTool.add(spray);
    const drops = [0, 1, 2, 3, 4].map(() => {
      const d = new THREE.Mesh(ball(0.008), WATER);
      showerTool.add(d);
      return d;
    });
    const bigTowel = named(use, 'bigTowel');
    part(bigTowel, rbox(0.42, 0.05, 0.26, 0.02), '#fff3e0', 0, 0, 0, { outline: false });
    // The resident: robe and wrap over all of her, her hands and her face out.
    const res = seated(use, BATH_LOOK, C.x, C.z, C.yaw, C.seat);
    const WRAP = '#d9e9ef';
    part(res.upper, rbox(0.42, 0.5, 0.28, 0.09), WRAP, 0, 0.25, 0);
    part(res.upper, cyl(0.075, 0.095, 0.08, 14), WRAP, 0, 0.52, 0, { outline: false });
    part(res.root, rbox(0.4, 0.09, 0.5, 0.035), WRAP, 0, C.seat + 0.12, 0.17);
    part(res.root, rbox(0.38, 0.4, 0.07, 0.03), WRAP, 0, C.seat - 0.14, 0.4);
    const towelOn = group(res.upper);
    part(towelOn, rbox(0.5, 0.24, 0.34, 0.09), '#fff3e0', 0, 0.42, -0.01);
    part(towelOn, rbox(0.2, 0.3, 0.05, 0.02), '#fff3e0', 0.13, 0.28, 0.14, { rz: -0.15 });
    part(towelOn, rbox(0.2, 0.3, 0.05, 0.02), '#fff3e0', -0.13, 0.28, 0.14, { rz: 0.15 });
    const steam = [0, 1, 2, 3, 4, 5].map(() => {
      const m = new THREE.Mesh(ball(0.07), STEAM);
      use.add(m);
      return m;
    });
    const mark = marker(g, C.x, 0.6, C.z);
    const main = spotAt(g, CW.BATH_AT, 'stand', 'cwBath', mark);
    const spots: Record<string, Spot> = { cwBathAssist: main, '*': main };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const here = Math.abs(t - posedAt(main)) < 0.6;
      use.visible = here;
      main.held = null;
      const a = v3(M[0] + 0.1, M[1] - 0.04, -0.9);
      const end = new THREE.Vector3();
      if (!here) {
        onHook.visible = true;
        stack[2].visible = true;
        end.set(Hk[0], Hk[1] - 0.05, -0.85);
        hoseA(a, v3((a.x + end.x) / 2, a.y - 0.25, -0.86));
        hoseB(v3((a.x + end.x) / 2, a.y - 0.25, -0.86), end);
        return;
      }
      const now = CW.cwNow('cwBath', t, phaseOf(mark));
      stack[2].visible = now.tool !== 'bigTowel' && !now.towelOn;
      const s = now.tool === 'shower';
      onHook.visible = !s;
      showerTool.visible = s;
      bigTowel.visible = now.tool === 'bigTowel';
      spray.visible = s && now.spray;
      drops.forEach((d, i) => {
        d.visible = s && now.spray;
        const u = frac(t * 2.1 + i / 5);
        d.position.set(0.05 * Math.sin(i * 2.4) * (0.4 + u), 0.1 + u * 0.32, 0.05 * Math.cos(i * 2.4) * (0.4 + u));
      });
      if (s) {
        poseTool(showerTool, now);
        end.set(0, -0.1, 0).applyQuaternion(showerTool.quaternion).add(showerTool.position);
        main.held = { tool: showerTool, lead: now.lead, grips: { [now.lead]: { at: v(0, -0.03, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.017 } } };
      } else {
        end.set(Hk[0], Hk[1] - 0.05, -0.85);
        if (now.tool === 'bigTowel') {
          poseTool(bigTowel, now);
          main.held = { tool: bigTowel, lead: 'right', grips: { right: { at: v(-0.14, 0.025, 0), axis: v(1, 0, 0), palm: v(0, -1, 0), shape: 'flat', radius: 0.012 }, left: { at: v(0.14, 0.025, 0), axis: v(-1, 0, 0), palm: v(0, -1, 0), shape: 'flat', radius: 0.012 } } };
        }
      }
      const mid = v3((a.x + end.x) / 2, Math.min(a.y, end.y) - 0.2, (a.z + end.z) / 2);
      hoseA(a, mid);
      hoseB(mid, end);
      towelOn.visible = now.towelOn;
      res.head.rotation.y = now.headTurn;
      res.head.rotation.x = 0.05;
      res.mouth(now.talk * 0.5 * Math.max(0, Math.sin(t * 6.5)));
      res.eyes(now.eyesShut);
      steam.forEach((m, i) => {
        m.visible = now.steam > 0.1;
        const u = frac(t * 0.18 + i / 6);
        m.position.set(C.x - 0.3 + 0.45 * Math.sin(i * 2.1), 0.7 + u * 1.15, C.z + 0.3 * Math.cos(i * 1.7) + 0.1);
        m.scale.setScalar((0.8 + 1.4 * u) * now.steam);
      });
    };
  },

  cwWheelchair(g, _W, _D, _c, _def, _ctx) {
    const c = wheelchair(g, 0, 0.02, 0, '#8d9aa6', '#5d4037');
    part(c, rbox(0.36, 0.08, 0.3, 0.03), '#ce93d8', 0, 0.53, 0.02);
    part(c, box(0.36, 0.01, 0.3), '#f3e5f5', 0, 0.565, 0.02, { outline: false });
    label(c, `공용 휠체어 3`, 0.24, 0.05, 0, 0.75, -0.25, '#ffffff', '#37474f', Math.PI);
    label(c, HOME, 0.2, 0.04, 0, 0.69, -0.25, '#ffffff', TEAL, Math.PI);
  },
};

/** The blood pressure monitor's screen face for a reading (one material each, shared). */
const lcdMats = new Map<string, THREE.MeshBasicMaterial>();
function lcdMat(mmHg: number, done: boolean): THREE.MeshBasicMaterial {
  const key = `${mmHg}|${done}`;
  let m = lcdMats.get(key);
  if (!m) lcdMats.set(key, (m = new THREE.MeshBasicMaterial({ map: bpTex(mmHg, done) })));
  return m;
}

// ---------------------------------------------------------------------------------------------
// The 재가 방문 요양's pieces (2026-11-04, the branch lots: workFurniture/careWorker.ts).

/**
 * 안전 손잡이 욕실 (2 × 1): the client's toilet with an L-shaped grab rail on the wall beside it and a fold-down rail on the other side,
 * and the shower chair on a non-slip mat, the hand shower on its rail above it, a grab bar along the wall.
 */
function cwHomeBathAid(g: THREE.Group, W: number, D: number) {
  const zb = -D / 2;
  // The toilet.
  const tx = -W / 2 + 0.45;
  part(g, rbox(0.36, 0.42, 0.18, 0.04), '#fafafa', tx, 0.4, zb + 0.12);
  part(g, rbox(0.34, 0.36, 0.44, 0.12), '#fafafa', tx, 0.2, zb + 0.4);
  part(g, rbox(0.36, 0.04, 0.46, 0.14), '#eceff1', tx, 0.41, zb + 0.41);
  // The grab rails.
  part(g, cyl(0.018, 0.018, 0.6, 8), CHROME, tx - 0.3, 0.75, zb + 0.35, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.018, 0.018, 0.5, 8), CHROME, tx - 0.3, 0.95, zb + 0.06, { outline: false });
  part(g, cyl(0.018, 0.018, 0.5, 8), CHROME, tx + 0.3, 0.68, zb + 0.35, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.02, 0.02, 0.62, 8), CHROME, tx + 0.3, 0.38, zb + 0.06, { outline: false });
  // The mat and the shower chair.
  const cx = W / 2 - 0.45;
  part(g, box(0.7, 0.01, 0.7), '#4db6ac', cx, 0.005, 0, { outline: false });
  part(g, rbox(0.42, 0.05, 0.38, 0.04), '#fafafa', cx, 0.45, 0.02);
  part(g, rbox(0.42, 0.3, 0.04, 0.03), '#fafafa', cx, 0.65, -0.17);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.015, 0.02, 0.44, 8), STEEL, cx + sx * 0.17, 0.22, 0.02 + sz * 0.15, { outline: false });
  // The hand shower, the long grab bar.
  part(g, cyl(0.012, 0.012, 0.9, 8), CHROME, cx + 0.2, 1.3, zb + 0.04, { outline: false });
  part(g, cyl(0.03, 0.02, 0.16, 10), CHROME, cx + 0.2, 1.6, zb + 0.08, { rx: 0.5, outline: false });
  part(g, cyl(0.02, 0.02, 0.7, 8), CHROME, cx - 0.05, 0.85, zb + 0.06, { rz: Math.PI / 2, outline: false });
  label(g, '안전 손잡이', 0.42, 0.1, tx, 1.18, zb + 0.02, '#00897b', '#ffffff');
}

/**
 * 복지용구 전시대 (2 × 1): a low white platform of welfare aids for families to see and try, each with its tag: a four-legged cane, a
 * folding walker, a pressure cushion, a bath seat; the board of what the long-term care insurance pays for behind.
 */
function cwAidShelf(g: THREE.Group, W: number, D: number) {
  part(g, rbox(W - 0.1, 0.2, D - 0.2, 0.03), '#eceff1', 0, 0.1, 0);
  // The cane.
  const x1 = -W / 2 + 0.3;
  part(g, cyl(0.015, 0.015, 0.85, 8), STEEL, x1, 0.62, 0, { outline: false });
  part(g, box(0.12, 0.03, 0.03), BLACK, x1 + 0.04, 1.05, 0, { outline: false });
  part(g, box(0.14, 0.02, 0.14), STEEL, x1, 0.21, 0, { outline: false });
  // The walker.
  const x2 = -0.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.012, 0.012, 0.8, 8), CHROME, x2 + sx * 0.2, 0.6, sz * 0.18, { outline: false });
  for (const sx of [-1, 1]) part(g, cyl(0.015, 0.015, 0.4, 8), CHROME, x2 + sx * 0.2, 1.0, 0, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.012, 0.012, 0.4, 8), CHROME, x2, 0.95, -0.18, { rz: Math.PI / 2, outline: false });
  // The cushion and the bath seat.
  part(g, rbox(0.36, 0.08, 0.36, 0.04), '#5c6bc0', 0.3, 0.25, 0);
  part(g, rbox(0.3, 0.05, 0.26, 0.04), '#fafafa', W / 2 - 0.28, 0.42, 0);
  for (const sx of [-1, 1]) part(g, cyl(0.012, 0.012, 0.2, 6), STEEL, W / 2 - 0.28 + sx * 0.12, 0.3, 0, { outline: false });
  // The tags; the board behind.
  ([[x1, '지팡이'], [x2, '보행기'], [0.3, '방석'], [W / 2 - 0.28, '목욕의자']] as const).forEach(([x, s]) => label(g, s, 0.28, 0.08, x, 0.1, (D - 0.2) / 2 + 0.005, '#ffffff', '#37474f'));
  label(g, '복지용구 · 장기요양 급여', 1.2, 0.18, 0, 1.35, -D / 2 + 0.03, '#00897b', '#ffffff');
}
