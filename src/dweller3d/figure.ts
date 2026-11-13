import * as THREE from 'three';
import { addShirtPrint } from '../view3d/shirtPrint';

/**
 * The 3D dweller (docs/ref-game/13-dweller3d.md): our own, built from simple shapes in the drawn figure's
 * proportions (a big round head, a short body, stubby limbs), with caps, balls and tails for hair,
 * dark eyes with a glint, blush and a mouth for each expression, and clothes as shells over the
 * body. Every colour and part comes from the dweller's own look. It's only the fallback for when
 * there's no VRoid character (the build, or none of their stage): kept simple, not extended.
 */
export type Stage = 'toddler' | 'child' | 'teen' | 'adult' | 'elder';
export type Expr = 'smile' | 'neutral' | 'frown';
export type Pose = 'stand' | 'walk' | 'sit' | 'lie';
export type Hair3D = 'short' | 'long' | 'bun' | 'curly' | 'buzz' | 'ponytail' | 'twintails' | 'bob' | 'spiky' | 'braids' | 'crop' | 'wolf';
/** Tops: the everyday ones, and what outfit changes put on (pyjamas, sportswear, bare for the bath, a suit). */
export type Top3D = 'tee' | 'dress' | 'hoodie' | 'sweater' | 'shirt' | 'jacket' | 'overalls' | 'uniform' | 'pajama' | 'sport' | 'bare' | 'suit';
export type Bottom3D = 'pants' | 'shorts' | 'skirt' | 'towel';

export interface FigureLook {
  gender: 'female' | 'male';
  stage: Stage;
  skin: string;
  hair: string;
  hairStyle: Hair3D;
  /** Whose hair a VRoid character wears (vrmLooks.ts `hairsFor`); the shape figure goes by the style. */
  hairFrom?: string;
  /** The VRoid clothes worn, each a character's piece (vrmLooks.ts `garmentsFor`). */
  wear?: Partial<Record<'tops' | 'bottoms' | 'shoes', string>>;
  top: Top3D;
  shirt: string;
  shirtPrint?: import('../game/shirtPrint').ShirtPrint;
  bottom: Bottom3D;
  pants: string;
  /** Shoe colour, or bare feet. */
  shoes: string | null;
  /** The colour picked for a VRoid character's shoes (`Dweller.shoeColor`); as they come if none. */
  shoeTint?: string;
}

/** Proportions by life stage (ours): the young have shorter legs and bodies under the same round head. */
const BUILD: Record<Stage, { leg: number; torso: number; head: number; arm: number }> = {
  toddler: { leg: 0.55, torso: 0.72, head: 1.0, arm: 0.65 },
  child: { leg: 0.78, torso: 0.84, head: 0.97, arm: 0.8 },
  teen: { leg: 0.95, torso: 0.95, head: 0.96, arm: 0.95 },
  adult: { leg: 1, torso: 1, head: 0.95, arm: 1 },
  elder: { leg: 0.97, torso: 1, head: 0.95, arm: 1 },
};

const LEG = 0.22;
const HEAD_R = 0.235;
const INK = '#2a1d24';

export interface Figure {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Group;
  mouths: Record<Expr, THREE.Object3D>;
  eyes: THREE.Object3D[];
  hipY: number;
  headY: number;
  /** Top of the head (hair and hats included) when standing, in model units. */
  height: number;
  dispose(): void;
}

const shadeHex = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

/** What each top looks like: sleeve length and the colour of the body under any extra parts. */
const SLEEVES: Record<Top3D, 'long' | 'short' | 'none'> = {
  tee: 'short',
  dress: 'short',
  hoodie: 'long',
  sweater: 'long',
  shirt: 'short',
  jacket: 'long',
  overalls: 'short',
  uniform: 'long',
  pajama: 'long',
  sport: 'none',
  bare: 'none',
  suit: 'long',
};

export function buildFigure(look: FigureLook): Figure {
  const geos: THREE.BufferGeometry[] = [];
  const mats = new Map<string, THREE.Material>();
  const mat = (c: string) => {
    let m = mats.get(c);
    if (!m) mats.set(c, (m = new THREE.MeshLambertMaterial({ color: c })));
    return m;
  };
  const keep = <G extends THREE.BufferGeometry>(g: G) => (geos.push(g), g);
  const mesh = (g: THREE.BufferGeometry, c: string) => new THREE.Mesh(keep(g), mat(c));
  const sphere = (r: number, c: string, w = 20, h = 14) => mesh(new THREE.SphereGeometry(r, w, h), c);
  const capsule = (r: number, len: number, c: string) => mesh(new THREE.CapsuleGeometry(r, len, 6, 14), c);
  const box = (w: number, h: number, d: number, c: string) => mesh(new THREE.BoxGeometry(w, h, d), c);
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => (o.position.set(x, y, z), o);

  const b = BUILD[look.stage];
  const male = look.gender === 'male';
  const legLen = LEG * b.leg;
  const hipY = legLen + 0.08;
  const torsoLen = 0.1 * b.torso;
  const torsoY = hipY + 0.12 + torsoLen / 2 - 0.02;
  const shoulderY = torsoY + torsoLen / 2 + 0.04;
  const headR = HEAD_R * b.head;
  const headY = shoulderY + headR * 0.95;
  const top = look.top;
  const dress = top === 'dress';
  const skirt = dress ? look.shirt : look.bottom === 'skirt' ? look.pants : look.bottom === 'towel' ? '#fafafa' : null;
  const bodyColor = top === 'bare' ? look.skin : look.shirt;

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  /** A limb hanging from a pivot: skin, clothing over its top part, a shoe or hand at the end. */
  const limb = (len: number, r: number, cover: { color: string; part: number } | null, end: { color: string; foot: boolean; cuff?: string }) => {
    const pivot = new THREE.Group();
    const m = at(capsule(r, len, look.skin), 0, -len / 2 - r * 0.4, 0);
    pivot.add(m);
    if (cover && cover.part > 0) {
      if (cover.part >= 1) m.material = mat(cover.color);
      else {
        const h = (len + r) * cover.part;
        pivot.add(at(mesh(new THREE.CylinderGeometry(r * 1.18, r * 1.25, h, 14), cover.color), 0, -h / 2 + r * 0.2, 0));
      }
    }
    if (end.cuff) {
      const c = at(mesh(new THREE.TorusGeometry(r * 1.05, r * 0.32, 6, 14), end.cuff), 0, -len + r * 0.2, 0);
      c.rotation.x = Math.PI / 2;
      pivot.add(c);
    }
    const t = sphere(r * (end.foot ? 1.25 : 1.05), end.color, 14, 10);
    if (end.foot) {
      t.scale.set(1, 0.7, 1.5);
      t.position.set(0, -len - r * 0.6, r * 0.4);
    } else t.position.set(0, -len - r * 0.55, 0);
    pivot.add(t);
    return pivot;
  };

  // Legs: trousers, shorts, or bare under a skirt or dress.
  const legCover = skirt ? null : { color: look.pants, part: look.bottom === 'shorts' ? 0.45 : 1 };
  const foot = { color: look.shoes ?? look.skin, foot: true };
  const legL = limb(legLen, 0.05, legCover, foot);
  const legR = limb(legLen, 0.05, legCover, foot);
  legL.position.set(-0.065, hipY, 0);
  legR.position.set(0.065, hipY, 0);
  body.add(legL, legR);

  // Body: a rounded torso, a little broader for men.
  const torso = at(capsule(0.125, torsoLen, bodyColor), 0, torsoY, 0);
  torso.scale.set(male ? 1.06 : 0.97, 1, 0.8);
  body.add(torso);
  const print = top === 'tee' && look.shirtPrint ? addShirtPrint(torso, look.shirtPrint, { centerX: 0, centerY: 0, width: 0.24, height: 0.23, front: 1 }) : undefined;
  const front = 0.125 * 0.8;
  if (skirt) {
    const skirtH = 0.2 * b.leg + 0.02;
    const s = at(mesh(new THREE.CylinderGeometry(0.12, look.bottom === 'towel' && !dress ? 0.16 : 0.2, skirtH, 24, 1, true), skirt), 0, hipY + 0.06 - skirtH / 2, 0);
    (s.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
    body.add(s);
  } else body.add(at(mesh(new THREE.CylinderGeometry(0.125, 0.13, 0.08, 20), look.pants), 0, hipY + 0.03, 0));

  // Details of each top.
  const neckY = shoulderY + 0.005;
  if (top === 'sweater' || top === 'pajama') {
    const hem = at(mesh(new THREE.TorusGeometry(0.118, 0.016, 8, 24), shadeHex(look.shirt, 0.85)), 0, torsoY - torsoLen / 2 - 0.07, 0);
    hem.rotation.x = Math.PI / 2;
    hem.scale.set(male ? 1.06 : 0.97, 0.8, 1);
    const collar = at(mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 20), shadeHex(look.shirt, 0.85)), 0, neckY, 0);
    collar.rotation.x = Math.PI / 2;
    body.add(hem, collar);
    if (top === 'pajama') for (const y of [0.02, -0.03]) body.add(at(sphere(0.011, '#ffffff', 8, 6), 0, torsoY + y, front + 0.005));
  }
  if (top === 'hoodie') {
    const hood = at(mesh(new THREE.TorusGeometry(0.075, 0.035, 10, 20), shadeHex(look.shirt, 0.92)), 0, neckY + 0.005, -0.03);
    hood.rotation.x = Math.PI / 2 - 0.35;
    const pocket = at(box(0.13, 0.05, 0.02, shadeHex(look.shirt, 0.88)), 0, torsoY - 0.05, front);
    body.add(hood, pocket);
    for (const s of [-1, 1]) body.add(at(capsule(0.004, 0.04, '#f5f5f5'), s * 0.025, torsoY + 0.03, front + 0.01));
  }
  if (top === 'shirt' || top === 'uniform' || top === 'suit') {
    for (const s of [-1, 1]) {
      const c = at(mesh(new THREE.ConeGeometry(0.03, 0.05, 3), '#ffffff'), s * 0.03, neckY - 0.015, front - 0.01);
      c.rotation.set(Math.PI, 0, s * 0.6);
      body.add(c);
    }
    if (top === 'shirt') for (const y of [0.03, -0.01, -0.05]) body.add(at(sphere(0.009, shadeHex(look.shirt, 0.6), 8, 6), 0, torsoY + y, front + 0.008));
  }
  if (top === 'jacket' || top === 'uniform' || top === 'suit') {
    // An open front showing what is under it, and a tie for the uniform and the suit.
    const inner = at(box(0.05, torsoLen + 0.13, 0.02, top === 'jacket' ? '#f2f2f2' : '#ffffff'), 0, torsoY - 0.005, front - 0.002);
    body.add(inner);
    if (top !== 'jacket') {
      const tie = at(box(0.022, torsoLen + 0.08, 0.01, top === 'uniform' ? '#c62828' : '#37474f'), 0, torsoY - 0.01, front + 0.01);
      body.add(tie);
    }
  }
  if (top === 'overalls') {
    body.add(at(box(0.12, 0.09, 0.02, look.pants), 0, torsoY - 0.025, front));
    for (const s of [-1, 1]) {
      const strap = at(box(0.022, 0.13, 0.02, look.pants), s * 0.05, torsoY + 0.05, front - 0.01);
      strap.rotation.x = -0.15;
      body.add(strap, at(sphere(0.01, '#ffd54f', 8, 6), s * 0.05, torsoY + 0.015, front + 0.012));
    }
  }
  if (top === 'sport') {
    const stripe = at(box(0.012, torsoLen + 0.18, 0.012, '#ffffff'), 0.09, torsoY, front - 0.02);
    body.add(stripe);
  }

  // Arms: sleeves as the top has them, hands at the end.
  const armLen = 0.15 * b.arm;
  const sleeves = SLEEVES[top];
  const sleeve = sleeves === 'none' ? null : { color: look.shirt, part: sleeves === 'long' ? 1 : 0.42 };
  const cuff = top === 'sweater' || top === 'hoodie' ? shadeHex(look.shirt, 0.85) : top === 'uniform' || top === 'suit' ? '#ffffff' : undefined;
  const hand = { color: look.skin, foot: false, cuff };
  const armL = limb(armLen, 0.04, sleeve, hand);
  const armR = limb(armLen, 0.04, sleeve, hand);
  const shoulderX = male ? 0.165 : 0.155;
  armL.position.set(-shoulderX, shoulderY, 0);
  armR.position.set(shoulderX, shoulderY, 0);
  body.add(armL, armR);

  // Head and face.
  const head = new THREE.Group();
  head.position.y = headY;
  const skull = sphere(headR, look.skin, 24, 16);
  skull.scale.set(1, 0.96, 0.95);
  head.add(skull);
  for (const s of [-1, 1]) head.add(at(sphere(0.04 * b.head, look.skin, 12, 8), s * (headR - 0.01), -0.02, 0));
  const eyes: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const eye = at(sphere(0.032, INK, 12, 10), s * 0.085 * b.head, -0.01, headR - 0.012);
    eye.scale.set(0.85, 1.25, 0.45);
    const glint = at(new THREE.Mesh(keep(new THREE.SphereGeometry(0.011, 8, 6)), new THREE.MeshBasicMaterial({ color: '#ffffff' })), 0.012, 0.016, 0.02);
    eye.add(glint);
    head.add(eye);
    eyes.push(eye);
    if (!male) {
      const lash = at(mesh(new THREE.CapsuleGeometry(0.006, 0.03, 4, 6), INK), s * 0.093 * b.head, 0.036, headR - 0.016);
      lash.rotation.z = Math.PI / 2 + s * 0.25;
      head.add(lash);
    }
    const blush = at(new THREE.Mesh(keep(new THREE.CircleGeometry(0.03, 16)), new THREE.MeshBasicMaterial({ color: '#f08a8a', transparent: true, opacity: 0.45 })), s * 0.14 * b.head, -0.065, headR - 0.05);
    blush.lookAt(blush.position.clone().multiplyScalar(2));
    blush.scale.set(1, 0.6, 1);
    head.add(blush);
  }
  const lip = mat('#8a3b3b');
  const smile = new THREE.Mesh(keep(new THREE.TorusGeometry(0.03, 0.007, 6, 14, Math.PI)), lip);
  smile.rotation.z = Math.PI;
  const frown = new THREE.Mesh(keep(new THREE.TorusGeometry(0.026, 0.007, 6, 14, Math.PI)), lip);
  frown.position.y = -0.02;
  const neutral = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.006, 0.03, 4, 8)), lip);
  neutral.rotation.z = Math.PI / 2;
  const mouths: Record<Expr, THREE.Object3D> = { smile, frown, neutral };
  for (const m of Object.values(mouths)) {
    m.position.set(0, m.position.y - 0.085, headR - 0.01);
    head.add(m);
  }
  const hairTop = hair(head, look, headR, (g, c = look.hair) => mesh(g, c));
  body.add(head);

  return {
    root,
    body,
    legL,
    legR,
    armL,
    armR,
    head,
    mouths,
    eyes,
    hipY,
    headY,
    height: headY + Math.max(headR * 1.05, hairTop),
    dispose() {
      print?.();
      for (const g of geos) g.dispose();
      for (const m of mats.values()) m.dispose();
    },
  };
}

type MeshOf = (g: THREE.BufferGeometry, c?: string) => THREE.Mesh;

/** The hair on the head; returns how high above the head's centre it reaches. */
function hair(head: THREE.Group, look: FigureLook, r: number, mesh: MeshOf): number {
  const add = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0) => (o.position.set(x, y, z), head.add(o), o);
  const cap = (rr: number, theta: number, tilt: number) => {
    const m = mesh(new THREE.SphereGeometry(rr, 28, 18, 0, Math.PI * 2, 0, Math.PI * theta));
    m.rotation.x = tilt;
    return add(m);
  };
  /** A shell round the back and sides of the head, open at the face, down to `theta` of the way. */
  const shell = (rr: number, theta: number) => add(mesh(new THREE.SphereGeometry(rr, 28, 18, Math.PI * 0.82, Math.PI * 1.36, 0, Math.PI * theta)));
  const ball = (rad: number) => mesh(new THREE.SphereGeometry(rad, 14, 10));
  const style = look.hairStyle;
  if (style === 'buzz') {
    cap(r + 0.008, 0.46, -0.35);
    return r;
  }
  cap(r + 0.018, 0.56, -0.42);
  if (style !== 'spiky') add(mesh(new THREE.SphereGeometry(r + 0.02, 24, 12, Math.PI * 0.62, Math.PI * 0.76, Math.PI * 0.18, Math.PI * 0.2)));
  let up = r + 0.02;
  const band = '#e57373';
  switch (style) {
    case 'long': {
      const back = add(mesh(new THREE.SphereGeometry(r + 0.02, 24, 16)), 0, -0.13, -0.13);
      back.scale.set(1.0, 1.4, 0.5);
      // Locks falling beside the face to the shoulders, so it reads as long from the front too.
      for (const s of [-1, 1]) add(mesh(new THREE.CapsuleGeometry(0.05, 0.17, 6, 12)), s * r * 0.86, -0.12, 0.0);
      break;
    }
    case 'bob':
      shell(r + 0.05, 0.7);
      break;
    case 'bun':
      add(ball(0.085), 0, r + 0.005, -0.08);
      up = r + 0.09;
      break;
    case 'curly':
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2;
        add(ball(0.075), Math.cos(a) * r * 0.85, 0.08 + Math.abs(Math.sin(a)) * 0.04, Math.sin(a) * r * 0.85 - 0.03);
      }
      up = r + 0.06;
      break;
    case 'ponytail': {
      add(mesh(new THREE.SphereGeometry(0.03, 10, 8), band), 0, 0.03, -r - 0.005);
      const tail = add(mesh(new THREE.CapsuleGeometry(0.045, 0.16, 6, 12)), 0, -0.07, -r - 0.05);
      tail.rotation.x = 0.35;
      break;
    }
    case 'twintails':
      for (const s of [-1, 1]) {
        add(mesh(new THREE.SphereGeometry(0.026, 10, 8), band), s * (r - 0.01), 0.05, -0.05);
        const tail = add(mesh(new THREE.CapsuleGeometry(0.04, 0.15, 6, 12)), s * (r + 0.04), -0.06, -0.06);
        tail.rotation.z = s * 0.35;
      }
      break;
    case 'braids':
      shell(r + 0.025, 0.55);
      // Two braids over the shoulders, in front, ending in a band.
      for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) add(ball(0.034 - i * 0.002), s * (r * 0.8 + i * 0.004), -0.08 - i * 0.045, 0.02 + i * 0.01);
        add(mesh(new THREE.SphereGeometry(0.02, 10, 8), band), s * (r * 0.82), -0.31, 0.07);
      }
      break;
    case 'spiky':
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const spike = add(mesh(new THREE.ConeGeometry(0.045, 0.11, 8)), Math.cos(a) * r * 0.45, r * 0.85, Math.sin(a) * r * 0.45 - 0.02);
        spike.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      }
      add(mesh(new THREE.ConeGeometry(0.05, 0.08, 8)), 0, r * 0.55, r * 0.7).rotation.x = 1.2;
      up = r + 0.1;
      break;
  }
  return up;
}

/** Puts the figure in a pose: standing (breathing), a step of the walk, sitting, or lying asleep. */
export function poseFigure(f: Figure, pose: Pose, phase: number, expr: Expr, stage: Stage) {
  const sw = pose === 'walk' ? Math.sin(phase) : 0;
  f.body.position.set(0, pose === 'walk' ? Math.abs(Math.sin(phase)) * 0.02 : Math.sin(phase * 0.25) * 0.004, 0);
  f.body.rotation.set(stage === 'elder' ? 0.07 : 0, 0, 0);
  f.legL.rotation.set(pose === 'sit' ? -Math.PI / 2 : -0.55 * sw, 0, 0);
  f.legR.rotation.set(pose === 'sit' ? -Math.PI / 2 : 0.55 * sw, 0, 0);
  f.armL.rotation.set(0.45 * sw, 0, -0.12);
  f.armR.rotation.set(-0.45 * sw, 0, 0.12);
  if (pose === 'sit') {
    f.armL.rotation.x = f.armR.rotation.x = -0.5;
    f.body.position.y = -(f.hipY - 0.17);
  }
  if (pose === 'lie') {
    f.armL.rotation.set(0, 0, -0.06);
    f.armR.rotation.set(0, 0, 0.06);
  }
  const shut = pose === 'lie';
  for (const e of f.eyes) e.scale.set(0.85, shut ? 0.18 : 1.25, 0.45);
  for (const [k, m] of Object.entries(f.mouths)) m.visible = k === (shut ? 'neutral' : expr);
}
