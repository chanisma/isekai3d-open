import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { buildFigure, poseFigure, type Expr, type Figure, type FigureLook, type Stage } from '../dweller3d/figure';
import { ASANAS, type AsanaStep } from './asana';
import { figureSuit, vrmSuit, type CleanSuit } from './cleanSuit';
import { HANDLE_RADIUS, SHAPES, aimHand, correctTool, gripQuaternion, leanPen, penQuaternion, probe, unleanPen, type Grip, type HandShape, type HeldTool, type Side } from './handTool';

/**
 * A dweller's body in the 3D lot (docs/3d/01-view.md §4): a VRoid character posed live in its
 * normalised bones (after the walk test, tools/vroid-sprites/walk.ts in the 2D project), or our
 * shape figure where there's no character for them. The lot view says where the dweller is and what
 * they're doing each frame; the body eases between standing, walking, sitting and lying, and the
 * hands reach for whatever they're using (a two-bone reach for each arm: the keyboard, the pan,
 * the book in their hands), so dwellers and furniture meet.
 */
export type BodyPose =
  /** Standing or walking with the feet at `at`; `crouch` (0–1) squats down to something low; `pace` (m/s) walks on the spot (a treadmill). */
  | { kind: 'stand' | 'walk'; at: THREE.Vector3; yaw: number; crouch?: number; pace?: number }
  /** Sitting on a seat whose top is at `at` (its middle, floor height + seat height in y), facing `yaw`; in a bath the legs go out straight. */
  | { kind: 'sit'; at: THREE.Vector3; yaw: number; floor: number; legs?: 'out' | 'together' | 'cross' }
  /** Lying on the back with the top of the head at `head`, the body running from there along -`dir`. */
  | { kind: 'lie'; head: THREE.Vector3; dir: THREE.Vector3; floor: number }
  /** Flying face down in a skydiver's box (a wind tunnel, 2026-10-26): the middle of the body at `at`, the head towards `yaw`. */
  | { kind: 'fly'; at: THREE.Vector3; yaw: number; floor: number; kick?: number; tuck?: number }
  /**
   * A yoga or Pilates pose (2026-10-27, asana.ts) done at `at` (the middle of a mat, a reformer's
   * carriage) facing `yaw`, set down on `floor`: going from one asana to the next by `e` (0–1). On a
   * reformer the feet reach for its footbar at `feet`.
   */
  | { kind: 'asana'; at: THREE.Vector3; yaw: number; floor: number; from: AsanaStep; to: AsanaStep; e: number; feet?: THREE.Vector3 };

/** Where the hands go (world points; a hand left out hangs as the pose has it) and how the body bends to it. */
export interface Reach {
  l?: THREE.Vector3;
  r?: THREE.Vector3;
  /** Bending forward at the waist, radians. */
  lean?: number;
  /** The head bowed to look down at the hands, radians. */
  nod?: number;
  /** The forearms turned palm-down, radians (typing, playing the keys); 0 leaves the thumbs up. */
  palms?: number;
  /** How each hand closes: 0 open and flat, about 0.3 relaxed, 1 a fist round a handle. */
  grip?: { l?: number; r?: number };
  /** Fingers tapping (at a keyboard, on the keys). */
  tap?: boolean;
  /** A way of holding, for a hand with no tool in it (handTool.ts); else `grip` says how closed it is. */
  shape?: { l?: HandShape; r?: HandShape };
  /** A tool in the hands (handTool.ts): where its grips are takes the place of `l` and `r`, and it's kept in the hand. */
  hold?: HeldTool | null;
}

export interface BodyState {
  pose: BodyPose;
  reach?: Reach;
  expr: Expr;
  /** Eyes shut (asleep or passed out). */
  asleep: boolean;
  /** The one the player is controlling. */
  active: boolean;
  /** Where they look (the eyes of whoever they're talking with): the head turns there as far as a neck goes, the eyes the rest. */
  look?: THREE.Vector3;
  /** Turned round in the seat to look (at a desk, to someone come up beside it): the waist turns too. */
  waist?: boolean;
}

export interface Avatar {
  root: THREE.Object3D;
  /** Top of the head above the feet, metres, standing. */
  height: number;
  /** Where the head is now (for the name tag and the plumbob). */
  headTop(out: THREE.Vector3): THREE.Vector3;
  /** Between the eyes, now (what someone talking with them looks at). */
  eyes(out: THREE.Vector3): THREE.Vector3;
  update(s: BodyState, dt: number, t: number, camera: THREE.Camera): void;
  /** In a cleanroom suit or not (cleanSuit.ts); their own clothes come back exactly as they were. */
  setSuit?(on: boolean): void;
  dispose(): void;
}

const UP = new THREE.Vector3(0, 1, 0);
const ease = (k: number) => k * k * (3 - 2 * k);
/** How far the head turns (neck and head together) to look at someone, radians; further round, it turns back to the front. */
const GAZE_YAW = 1.0;
/** Turned at the waist too (in a desk chair), about as far again in all. */
const GAZE_WAIST = 1.65;
const GAZE_UP = 0.35;
const GAZE_DOWN = 0.55;
/** Seconds to sit down, and to sit and then lie back. */
const SIT_TIME = 0.7;
const LIE_TIME = 1.4;

/** How far the shown pose has got towards the one asked for: 0 standing … 1 there. */
interface Transit {
  kind: 'sit' | 'lie' | 'fly' | 'asana';
  k: number;
  /** Where they stood before sitting or lying, to ease from. */
  from: THREE.Vector3;
  fromYaw: number;
}

function lieQuat(dir: THREE.Vector3): THREE.Quaternion {
  const y = dir.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, UP).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, UP.clone()));
}

// ---- VRoid ----

type Euler3 = [number, number, number];
interface Frame {
  hip: THREE.Vector3;
  q: THREE.Quaternion;
  hy: number;
  bones: Partial<Record<VRMHumanBoneName, Euler3>>;
}
const BONES: VRMHumanBoneName[] = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot',
  'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand',
];
const FINGERS = ['Index', 'Middle', 'Ring', 'Little'] as const;
/** A hand at rest: the fingers a little curled. */
const RELAXED = 0.3;

/**
 * VRoid exports hair and skirts with no gravity and next to no drag (a skirt's 0.05): on a dweller
 * walking about they float and swing on every step. Hair, skirts and coat tails here hang a
 * little and settle: more drag, some gravity, a skirt stiffer too (the bust left alone).
 */
const SPRINGS: Array<[RegExp, { drag: number; gravity: number; stiffness: number }]> = [
  [/Hair/, { drag: 0.65, gravity: 0.15, stiffness: 0.7 }],
  [/Skirt/, { drag: 0.6, gravity: 0.12, stiffness: 1.0 }],
];
function calmSprings(vrm: VRM) {
  const springs = vrm.springBoneManager;
  if (!springs) return;
  for (const j of springs.joints) {
    const tune = SPRINGS.find(([re]) => re.test(j.bone.name))?.[1];
    if (!tune) continue;
    j.settings.dragForce = Math.max(j.settings.dragForce, tune.drag);
    j.settings.gravityPower = Math.max(j.settings.gravityPower, tune.gravity);
    j.settings.gravityDir.set(0, -1, 0);
    j.settings.stiffness = Math.max(j.settings.stiffness, tune.stiffness);
  }
}

/** What a skirt's spring bones need of their settings. */
export interface SpringJoint {
  bone: { name: string };
  settings: { dragForce: number; gravityPower: number; stiffness: number };
}
const DRY = new WeakMap<object, { dragForce: number; gravityPower: number; stiffness: number }>();
/**
 * A skirt in water: its flare would stand up out of the surface on someone swimming face down, so while they swim its bones are
 * let go and heavy (they hang down and lie on the body); out of the water they go back as they were.
 */
export function skirtInWater(joints: Iterable<SpringJoint>, wet: boolean) {
  for (const j of joints) {
    if (!/Skirt/.test(j.bone.name)) continue;
    const s = j.settings;
    if (wet) {
      if (!DRY.has(j)) DRY.set(j, { dragForce: s.dragForce, gravityPower: s.gravityPower, stiffness: s.stiffness });
      s.dragForce = 0.9;
      s.gravityPower = 2.4;
      s.stiffness = 0.2;
    } else {
      const was = DRY.get(j);
      if (was) Object.assign(s, was);
      DRY.delete(j);
    }
  }
}

const ARMS_DOWN: Frame['bones'] = {
  leftUpperArm: [0, 0, -1.25], rightUpperArm: [0, 0, 1.25],
  leftLowerArm: [0, -0.15, 0], rightLowerArm: [0, 0.15, 0],
  leftHand: [0, 0, -0.1], rightHand: [0, 0, 0.1],
};

/** Thigh, knee and ankle angles for a leg reaching a foot `dy` below and `dz` in front of the hip joint, foot flat. */
export function legReach(thigh: number, shin: number, dy: number, dz: number): Euler3[] {
  const d = THREE.MathUtils.clamp(Math.hypot(dy, dz), Math.abs(thigh - shin) + 0.01, thigh + shin - 0.001);
  const toFoot = Math.atan2(dz, dy);
  const lift = Math.acos(THREE.MathUtils.clamp((thigh * thigh + d * d - shin * shin) / (2 * thigh * d), -1, 1));
  const bend = Math.PI - Math.acos(THREE.MathUtils.clamp((thigh * thigh + shin * shin - d * d) / (2 * thigh * shin), -1, 1));
  const up = toFoot + lift;
  return [[-up, 0, 0], [bend, 0, 0], [up - bend, 0, 0]];
}

function blend(a: Frame, b: Frame, k: number): Frame {
  const e = ease(THREE.MathUtils.clamp(k, 0, 1));
  const bones: Frame['bones'] = {};
  for (const n of BONES) {
    const p = a.bones[n] ?? [0, 0, 0];
    const q = b.bones[n] ?? [0, 0, 0];
    bones[n] = [p[0] + (q[0] - p[0]) * e, p[1] + (q[1] - p[1]) * e, p[2] + (q[2] - p[2]) * e];
  }
  return { hip: a.hip.clone().lerp(b.hip, e), q: a.q.clone().slerp(b.q, e), hy: a.hy + (b.hy - a.hy) * e, bones };
}

/**
 * Blends two frames turning each bone the shortest way (2026-10-27, the asanas): a turn written one
 * way in one pose and the other way round in the next (an arm overhead) doesn't swing round the back.
 */
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const eu = new THREE.Euler();
function blendQ(a: Frame, b: Frame, k: number): Frame {
  const e = ease(THREE.MathUtils.clamp(k, 0, 1));
  const bones: Frame['bones'] = {};
  for (const n of BONES) {
    qa.setFromEuler(eu.set(...(a.bones[n] ?? [0, 0, 0])));
    qb.setFromEuler(eu.set(...(b.bones[n] ?? [0, 0, 0])));
    eu.setFromQuaternion(qa.slerp(qb, e));
    bones[n] = [eu.x, eu.y, eu.z];
  }
  return { hip: a.hip.clone().lerp(b.hip, e), q: a.q.clone().slerp(b.q, e), hy: a.hy + (b.hy - a.hy) * e, bones };
}

/** What a body in an asana rests on (bones, and how far their joint is above what they rest on, m): toes, ankles, knees, hands, seat, back, brow. */
const RESTS: Array<[VRMHumanBoneName, number]> = [
  ['leftToes', 0.039], ['rightToes', 0.039], ['leftFoot', 0.055], ['rightFoot', 0.055], ['leftLowerLeg', 0.055], ['rightLowerLeg', 0.055],
  ['leftHand', 0.03], ['rightHand', 0.03], ['leftUpperLeg', 0.075], ['rightUpperLeg', 0.075], ['hips', 0.1], ['chest', 0.11], ['head', 0.09],
];
const ASANA_TIME = 1.2;

export class VrmAvatar implements Avatar {
  root: THREE.Object3D;
  height: number;
  private hipsY: number;
  private body: { thigh: number; shin: number; drop: number; ankle: number; hx: number; hz: number; top: number };
  /** How far one round of the walk goes. */
  readonly stride: number;
  private phase = 0;
  private walk = 0;
  private yaw = 0;
  private pos = new THREE.Vector3();
  private last = new THREE.Vector3();
  private transit: Transit | null = null;
  private blinkAt = 1 + Math.random() * 3;
  private placed = false;
  /** Just put somewhere: hair and skirt settle there at once instead of swinging in from the file's pose. */
  private settle = false;
  /** The last sitting or lying frame, to get up from. */
  private held: Frame | null = null;
  /** The held frame is an asana's: got up from turning each bone the shortest way. */
  private heldTurns = false;
  private crouch = 0;
  /** Each hand's reach as shown: how far it's taken over from the pose, and where it's going. */
  private arms = {
    left: { w: 0, at: new THREE.Vector3(), onTool: 0, forearm: new THREE.Vector3(0, 0, 1), gripAt: new THREE.Vector3(), radius: HANDLE_RADIUS, pen: false },
    right: { w: 0, at: new THREE.Vector3(), onTool: 0, forearm: new THREE.Vector3(0, 0, 1), gripAt: new THREE.Vector3(), radius: HANDLE_RADIUS, pen: false },
  };
  private bend = { lean: 0, nod: 0, palms: 0 };
  /** How closed each hand is as shown (relaxed by default: a hand at rest is never quite straight). */
  private grip = { left: RELAXED, right: RELAXED };
  /** Each finger's and thumb joint's curl as shown, eased from one way of holding to the next. */
  private curl = {
    left: { fingers: [RELAXED, RELAXED, RELAXED, RELAXED], thumb: [0, 0, 0], oppose: 0 },
    right: { fingers: [RELAXED, RELAXED, RELAXED, RELAXED], thumb: [0, 0, 0], oppose: 0 },
  };

  constructor(readonly vrm: VRM, readonly scale: number) {
    // A VRM 0 model faces -Z: rotateVRM0 turned its scene, but the scene's turn is where the dweller's facing
    // goes (every frame), so the half turn moves a level in (the stars' VRoid Hub files, 2026-10-25).
    if (vrm.meta?.metaVersion === '0') {
      vrm.scene.rotation.set(0, 0, 0);
      const flip = new THREE.Group();
      flip.name = 'vrm0Flip';
      flip.rotation.y = Math.PI;
      for (const c of [...vrm.scene.children]) flip.add(c);
      vrm.scene.add(flip);
      vrm.scene.updateMatrixWorld(true);
    }
    this.root = vrm.scene;
    vrm.scene.scale.setScalar(scale);
    vrm.humanoid.resetNormalizedPose();
    calmSprings(vrm);
    vrm.update(0);
    const box3 = new THREE.Box3().setFromObject(vrm.scene);
    this.height = box3.max.y - box3.min.y;
    const at = (bone: VRMHumanBoneName) => vrm.humanoid.getRawBoneNode(bone)!.getWorldPosition(new THREE.Vector3());
    const hipsNode = vrm.humanoid.getNormalizedBoneNode('hips')!;
    const [hipW, upperLeg, lowerLeg, foot] = (['hips', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot'] as const).map(at);
    // Measured in the model's own units (the scale is applied to the whole scene).
    const k = 1 / scale;
    this.body = {
      thigh: upperLeg.distanceTo(lowerLeg) * k,
      shin: lowerLeg.distanceTo(foot) * k,
      drop: (hipW.y - upperLeg.y) * k,
      ankle: foot.y * k,
      hx: hipsNode.position.x,
      hz: hipsNode.position.z,
      top: (box3.max.y - hipW.y) * k,
    };
    this.hipsY = hipsNode.position.y;
    this.stride = 1.35 * (this.height / 1.6);
  }

  private suit: CleanSuit | null = null;
  private suited = false;
  setSuit(on: boolean) {
    if (on === this.suited) return;
    this.suited = on;
    if (on) this.suit ??= vrmSuit(this.vrm);
    this.suit?.show(on);
  }

  headTop(out: THREE.Vector3) {
    const head = this.vrm.humanoid.getNormalizedBoneNode('head');
    if (!head) return out.copy(this.pos).setY(this.pos.y + this.height);
    head.getWorldPosition(out);
    return out.setY(out.y + 0.22 * this.scale);
  }

  eyes(out: THREE.Vector3) {
    const head = this.vrm.humanoid.getNormalizedBoneNode('head');
    if (!head) return out.copy(this.pos).setY(this.pos.y + this.height - 0.12);
    head.getWorldPosition(out);
    return out.setY(out.y + 0.07 * this.scale);
  }

  private set(bone: VRMHumanBoneName, x: number, y: number, z: number) {
    this.vrm.humanoid.getNormalizedBoneNode(bone)?.rotation.set(x, y, z);
  }

  /** One frame of the walk blended with standing by `w` (from walk.ts). */
  private walkPose(t: number) {
    const w = this.walk;
    const p = this.phase;
    const s = Math.sin(p);
    const c = Math.cos(p);
    const breathe = Math.sin(t * 1.6) * 0.015;
    const thighL = -0.42 * s * w;
    const thighR = 0.42 * s * w;
    const kneeL = (0.75 * Math.max(0, c) ** 1.5 + 0.08) * w;
    const kneeR = (0.75 * Math.max(0, -c) ** 1.5 + 0.08) * w;
    this.set('leftUpperLeg', thighL - 0.04 * w, 0, 0);
    this.set('rightUpperLeg', thighR - 0.04 * w, 0, 0);
    this.set('leftLowerLeg', kneeL, 0, 0);
    this.set('rightLowerLeg', kneeR, 0, 0);
    this.set('leftFoot', -(thighL + kneeL) * 0.7 - 0.15 * Math.max(0, c) * w, 0, 0);
    this.set('rightFoot', -(thighR + kneeR) * 0.7 - 0.15 * Math.max(0, -c) * w, 0, 0);
    this.set('hips', 0, 0.1 * s * w, 0.03 * c * w);
    this.set('spine', 0.04 * w + breathe, -0.06 * s * w, -0.02 * c * w);
    this.set('chest', breathe, -0.06 * s * w, 0);
    this.set('neck', -0.02 * w, 0.04 * s * w, 0);
    this.set('head', 0, 0, 0);
    const hips = this.vrm.humanoid.getNormalizedBoneNode('hips');
    if (hips) hips.position.y = this.hipsY + (0.025 * Math.cos(2 * p) - 0.02) * w;
    this.set('leftUpperArm', 0.38 * s * w, 0, -1.25 + 0.02 * Math.sin(t * 1.6));
    this.set('rightUpperArm', -0.38 * s * w, 0, 1.25 - 0.02 * Math.sin(t * 1.6));
    this.set('leftLowerArm', 0, -0.15 - 0.25 * Math.max(0, -s) * w, 0);
    this.set('rightLowerArm', 0, 0.15 + 0.25 * Math.max(0, s) * w, 0);
    this.set('leftHand', 0, 0, -0.1);
    this.set('rightHand', 0, 0, 0.1);
  }

  /** Squats down by `c` (0–1): knees forward, hips lowered, feet where they stand. */
  private squat(c: number) {
    const b = this.body;
    const legs = b.thigh + b.shin;
    const joint = legs * (1 - 0.5 * c);
    const [up, low, foot] = legReach(b.thigh, b.shin, joint, 0.1 * c);
    for (const side of ['left', 'right'] as const) {
      this.set(`${side}UpperLeg`, up[0], 0, side === 'left' ? 0.08 * c : -0.08 * c);
      this.set(`${side}LowerLeg`, low[0], 0, 0);
      this.set(`${side}Foot`, foot[0], 0, 0);
    }
    const hips = this.vrm.humanoid.getNormalizedBoneNode('hips');
    if (hips) hips.position.y = this.hipsY - (legs - joint);
  }

  /** Bends the body and sends the hands where the pose asks (each eased in and out). */
  private applyReach(r: Reach | undefined, dt: number) {
    const h = this.vrm.humanoid;
    const bend = this.bend;
    // Tools aren't aimed for a VRM 0 body: its rig is turned for the update (see `mirror` in update),
    // so a turn worked out here wouldn't be the turn shown. Its hands go to the grips as any reach does.
    const hold = r?.hold ?? null;
    const aiming = this.vrm.meta?.metaVersion !== '0';
    bend.lean = THREE.MathUtils.damp(bend.lean, hold?.lean ?? r?.lean ?? 0, 6, dt);
    bend.nod = THREE.MathUtils.damp(bend.nod, hold?.nod ?? r?.nod ?? 0, 6, dt);
    bend.palms = THREE.MathUtils.damp(bend.palms, r?.palms ?? 0, 6, dt);
    const add = (bone: VRMHumanBoneName, x: number) => {
      const n = h.getNormalizedBoneNode(bone);
      if (n) n.rotation.x += x;
    };
    add('spine', bend.lean * 0.55);
    add('chest', bend.lean * 0.45);
    add('neck', bend.nod * 0.45);
    add('head', bend.nod * 0.55);
    this.vrm.scene.updateMatrixWorld(true);
    this.leanPens(hold);
    // The hand the tool follows goes first: the other finds its grip on the tool where that leaves it.
    const order: readonly Side[] = hold?.lead === 'right' ? ['right', 'left'] : ['left', 'right'];
    for (const side of order) {
      const grip = hold?.grips[side];
      const free = hold?.free?.[side];
      const arm = this.arms[side];
      const shape = grip?.shape ?? (free ? hold?.freeShape : undefined) ?? (side === 'left' ? r?.shape?.l : r?.shape?.r);
      arm.onTool = THREE.MathUtils.damp(arm.onTool, grip ? 1 : 0, 8, dt);
      arm.radius = grip?.radius ?? HANDLE_RADIUS;
      arm.pen = grip?.shape === 'pen';
      let goal = free ?? (side === 'left' ? r?.l : r?.r);
      let aim: THREE.Quaternion | null = null;
      if (grip && hold) {
        const placed = this.gripGoal(side, hold, grip);
        goal = placed.wrist;
        if (aiming) aim = placed.q;
      }
      if (goal) {
        if (arm.w < 0.02) arm.at.copy(goal);
        // On a tool the hand keeps up with it exactly (once it's got there); elsewhere it eases along.
        else arm.at.lerp(goal, THREE.MathUtils.lerp(1 - Math.exp(-22 * dt), 1, arm.onTool * arm.onTool));
      }
      arm.w = THREE.MathUtils.damp(arm.w, goal ? 1 : 0, 7, dt);
      if (arm.w > 0.002) this.reachArm(side, arm.at, ease(Math.min(1, arm.w)), aim ? 0 : bend.palms);
      if (aim) this.aimHandTo(side, aim, ease(Math.min(1, arm.onTool)));
      this.keepForearm(side);
      // What's held stays in the hand the arm has really got there.
      if (hold && grip && aiming && side === hold.lead && !hold.resting) this.keepTool(side, hold, grip, arm.onTool);
      const want = (side === 'left' ? r?.grip?.l : r?.grip?.r) ?? RELAXED;
      this.grip[side] = THREE.MathUtils.damp(this.grip[side], want, 9, dt);
      this.closeHand(side, this.grip[side], r?.tap ? this.clockT : undefined, shape, dt);
    }
  }

  /** The pen last leaned, to stand it as it was once it's out of the hand. */
  private leaned: THREE.Object3D | null = null;

  /** A pen writing on what's below it leans back to the hand, its tip staying where the script put it (handTool.ts). */
  private leanPens(hold: HeldTool | null) {
    if (this.leaned && this.leaned !== hold?.tool) {
      unleanPen(this.leaned);
      this.leaned = null;
    }
    if (!hold) return;
    for (const side of ['right', 'left'] as const) {
      const grip = hold.grips[side];
      if (!grip?.writes) continue;
      const shoulder = this.vrm.humanoid.getNormalizedBoneNode(`${side}UpperArm`);
      if (!shoulder) continue;
      if (hold.resting) unleanPen(hold.tool);
      else leanPen(hold.tool, grip, shoulder.getWorldPosition(new THREE.Vector3()));
      this.leaned = hold.tool;
    }
  }

  /** Where on the hand a handle sits, from the wrist in the hand bone's frame (world size). */
  private palmOf(side: Side): THREE.Vector3 {
    const h = this.vrm.humanoid;
    const middle = h.getNormalizedBoneNode(`${side}MiddleProximal`);
    const hand = h.getNormalizedBoneNode(`${side}Hand`);
    const len = middle ? middle.position.length() : 0.09;
    const s = hand?.getWorldScale(new THREE.Vector3()).x ?? 1;
    // Under the knuckles, where the closed fingers meet round a handle.
    return new THREE.Vector3(side === 'left' ? len * s : -len * s, -0.027 * this.scale - (this.arms[side].radius - HANDLE_RADIUS), 0);
  }

  /** Where what's held meets the hand, from the wrist in the hand bone's frame; a pen, between the thumb's tip and the first finger. */
  private gripPoint(side: Side): THREE.Vector3 {
    const palm = this.palmOf(side);
    if (!this.arms[side].pen) return palm;
    return new THREE.Vector3(palm.x * 1.3, -0.022 * this.scale, 0.016 * this.scale);
  }

  /** Where the wrist has to be, and how the hand has to be turned, for a grip on a tool as it is now. */
  private gripGoal(side: Side, hold: HeldTool, grip: Grip): { wrist: THREE.Vector3; q: THREE.Quaternion } {
    hold.tool.updateWorldMatrix(true, false);
    const toolQ = hold.tool.getWorldQuaternion(new THREE.Quaternion());
    const local = this.slidGrip(side, hold, grip);
    this.arms[side].gripAt.copy(local);
    const point = hold.tool.localToWorld(local.clone());
    const axis = grip.axis.clone().applyQuaternion(toolQ);
    const palm = grip.palm?.clone().applyQuaternion(toolQ);
    const body = this.vrm.scene.getWorldQuaternion(new THREE.Quaternion());
    const fallback = new THREE.Vector3(0, -1, 0).applyQuaternion(body);
    const q = grip.shape === 'pen' ? penQuaternion(side, axis, this.arms[side].forearm) : gripQuaternion(side, axis, palm, this.arms[side].forearm, fallback);
    return { wrist: point.sub(this.gripPoint(side).applyQuaternion(q)), q };
  }

  /**
   * Where on the handle the hand that follows really goes: as asked if the arm gets there, else slid
   * along towards the leading hand just as far as it takes (a short arm on a long broom), keeping a
   * hand's breadth from it.
   */
  private slidGrip(side: Side, hold: HeldTool, grip: Grip): THREE.Vector3 {
    const lead = hold.grips[hold.lead];
    if (side === hold.lead || !lead || !grip.slide) return grip.at.clone();
    const h = this.vrm.humanoid;
    const up = h.getNormalizedBoneNode(`${side}UpperArm`);
    const lo = h.getNormalizedBoneNode(`${side}LowerArm`);
    const hand = h.getNormalizedBoneNode(`${side}Hand`);
    if (!up || !lo || !hand) return grip.at.clone();
    const s = up.getWorldPosition(new THREE.Vector3());
    const elbow = lo.getWorldPosition(new THREE.Vector3());
    const reach = (s.distanceTo(elbow) + elbow.distanceTo(hand.getWorldPosition(new THREE.Vector3()))) * 0.97;
    const gap = lead.at.distanceTo(grip.at);
    const most = gap > 0.1 ? 1 - 0.1 / gap : 0;
    const at = (k: number) => grip.at.clone().lerp(lead.at, k);
    const near = (k: number) => hold.tool.localToWorld(at(k)).distanceTo(s) <= reach;
    if (near(0)) return grip.at.clone();
    let out = 0;
    let inside = most;
    for (let i = 0; i < 7; i++) {
      const mid = (out + inside) / 2;
      if (near(mid)) inside = mid;
      else out = mid;
    }
    return at(inside);
  }

  private aimHandTo(side: Side, goal: THREE.Quaternion, w: number) {
    const h = this.vrm.humanoid;
    const lo = h.getNormalizedBoneNode(`${side}LowerArm`);
    const hand = h.getNormalizedBoneNode(`${side}Hand`);
    if (lo && hand && w > 0.002) aimHand(lo, hand, goal, w);
  }

  /** Remembers the way the forearm goes as shown, for how the next frame's hand closes on a round handle. */
  private keepForearm(side: Side) {
    const h = this.vrm.humanoid;
    const lo = h.getNormalizedBoneNode(`${side}LowerArm`);
    const hand = h.getNormalizedBoneNode(`${side}Hand`);
    if (!lo || !hand) return;
    const d = hand.getWorldPosition(new THREE.Vector3()).sub(lo.getWorldPosition(new THREE.Vector3()));
    if (d.lengthSq() > 1e-6) this.arms[side].forearm.copy(d.normalize());
  }

  /** The palm as shown, in the world. */
  private palmNow(side: Side): THREE.Vector3 | null {
    const hand = this.vrm.humanoid.getNormalizedBoneNode(`${side}Hand`);
    if (!hand) return null;
    const palm = this.gripPoint(side);
    hand.updateWorldMatrix(true, false);
    return palm.applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())).add(hand.getWorldPosition(new THREE.Vector3()));
  }

  /** Puts the tool right by what the lead arm really did: short of the grip, the tool comes to the hand. */
  private keepTool(side: Side, hold: HeldTool, grip: Grip, on: number) {
    const palm = this.palmNow(side);
    if (!palm || on < 0.02) return;
    const from = hold.tool.localToWorld(grip.at.clone());
    correctTool(hold.tool, from, from.clone().lerp(palm, on), hold.anchor);
  }

  /** For the lab: how far the palm as finally shown is from each grip on the tool as finally placed. */
  private probeTool(hold: HeldTool) {
    const sides = (['left', 'right'] as const).filter((side) => hold.grips[side]);
    // Only with every hand settled on it: reaching for it and letting go aren't holding it.
    if (!(globalThis as { __toolProbe?: unknown }).__toolProbe || hold.resting || !sides.every((side) => this.arms[side].onTool > 0.995 && this.arms[side].w > 0.995)) return;
    const p = probe(hold.tool.name || 'tool');
    if (!p) return;
    p.frames++;
    hold.tool.updateWorldMatrix(true, false);
    for (const side of sides) {
      const palm = this.palmNow(side);
      if (!palm) continue;
      const gap = palm.distanceTo(hold.tool.localToWorld(this.arms[side].gripAt.clone()));
      ((globalThis as unknown as { __handAt?: Record<string, number[]> }).__handAt ??= {})[side] = palm.toArray();
      ((globalThis as unknown as { __handAt?: Record<string, number[]> }).__handAt ??= {}).body = this.vrm.scene.getWorldPosition(new THREE.Vector3()).toArray();
      p[side] = Math.max(p[side], gap);
      p[side === 'left' ? 'leftSum' : 'rightSum'] += gap;
    }
    if (hold.anchor) {
      const y = Math.abs(hold.tool.localToWorld(hold.anchor.clone()).y - (hold.tool.parent?.getWorldPosition(new THREE.Vector3()).y ?? 0));
      p.anchorDrift = Math.max(p.anchorDrift, y);
    }
  }

  /**
   * Curls a hand's fingers by `c` (0 flat … 1 a fist), each joint a little more than the one
   * before and the little finger more than the first, the thumb in across the palm; or to a way of
   * holding (`shape`). Tapping at time `tap` lifts and drops the fingers one after another.
   */
  private closeHand(side: Side, c: number, tap: number | undefined, shape: HandShape | undefined, dt: number) {
    const h = this.vrm.humanoid;
    // Fingers point along +x on the left hand, -x on the right: curling towards the palm turns them the opposite ways about z.
    const k = side === 'left' ? -1 : 1;
    const shown = this.curl[side];
    const held = shape && SHAPES[shape];
    // Round something thicker the fingers don't close as far.
    const open = 1 - (this.arms[side].radius - HANDLE_RADIUS) * 9;
    FINGERS.forEach((f, i) => {
      shown.fingers[i] = THREE.MathUtils.damp(shown.fingers[i], held ? held.fingers[i] * open : c + i * 0.05, 9, dt);
      const lift = tap === undefined ? 0 : 0.35 * Math.max(0, Math.sin(tap * 13 + i * 1.9 + (side === 'left' ? 0 : 2.3)));
      const curl = Math.max(0, shown.fingers[i] - lift);
      h.getNormalizedBoneNode(`${side}${f}Proximal`)?.rotation.set(0, 0, k * curl * 1.25);
      h.getNormalizedBoneNode(`${side}${f}Intermediate`)?.rotation.set(0, 0, k * curl * 1.45);
      h.getNormalizedBoneNode(`${side}${f}Distal`)?.rotation.set(0, 0, k * curl * 0.9);
    });
    const thumb = held ? held.thumb : [c * 0.45, c * 0.55, c * 0.6];
    shown.oppose = THREE.MathUtils.damp(shown.oppose, held ? held.oppose : 0, 9, dt);
    (['ThumbMetacarpal', 'ThumbProximal', 'ThumbDistal'] as const).forEach((joint, i) => {
      shown.thumb[i] = THREE.MathUtils.damp(shown.thumb[i], thumb[i], 9, dt);
      // The base of the thumb also comes round in front of the palm (+x on either hand), to close on what's held.
      h.getNormalizedBoneNode(`${side}${joint}`)?.rotation.set(i === 0 ? shown.oppose : 0, -k * shown.thumb[i], 0);
    });
  }

  /**
   * Turns one arm so its hand gets to `target` (or as near as it reaches), elbow down and out:
   * the upper arm and forearm are each turned the shortest way from how they lie in the rest pose,
   * then the forearm about its length by `palms`; `w` blends from the pose there was.
   */
  private reachArm(side: 'left' | 'right', target: THREE.Vector3, w: number, palms: number) {
    const h = this.vrm.humanoid;
    const up = h.getNormalizedBoneNode(`${side}UpperArm`);
    const lo = h.getNormalizedBoneNode(`${side}LowerArm`);
    const hand = h.getNormalizedBoneNode(`${side}Hand`);
    if (!up || !lo || !hand || !up.parent) return;
    const S = up.getWorldPosition(new THREE.Vector3());
    const a = S.distanceTo(lo.getWorldPosition(new THREE.Vector3()));
    const b = lo.getWorldPosition(new THREE.Vector3()).distanceTo(hand.getWorldPosition(new THREE.Vector3()));
    const d = target.clone().sub(S);
    const len = THREE.MathUtils.clamp(d.length(), Math.abs(a - b) + 0.01, a + b - 0.002);
    const dir = d.normalize();
    const body = this.vrm.scene.getWorldQuaternion(new THREE.Quaternion());
    const out = new THREE.Vector3(side === 'left' ? 1 : -1, 0, 0).applyQuaternion(body);
    const pole = new THREE.Vector3(0, -1, 0).applyQuaternion(body).addScaledVector(out, 0.7).addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(body), 0.3);
    const perp = pole.addScaledVector(dir, -pole.dot(dir));
    if (perp.lengthSq() < 1e-6) perp.set(0, -1, 0);
    perp.normalize();
    const cosA = THREE.MathUtils.clamp((a * a + len * len - b * b) / (2 * a * len), -1, 1);
    const elbow = S.clone().addScaledVector(dir, a * cosA).addScaledVector(perp, a * Math.sqrt(1 - cosA * cosA));
    const toLocal = (q: THREE.Quaternion, v: THREE.Vector3) => v.applyQuaternion(q.invert());
    const q1 = new THREE.Quaternion().setFromUnitVectors(lo.position.clone().normalize(), toLocal(up.parent.getWorldQuaternion(new THREE.Quaternion()), elbow.clone().sub(S).normalize()));
    up.quaternion.slerp(q1, w);
    up.updateMatrixWorld(true);
    const rest = hand.position.clone().normalize();
    const reach = S.clone().addScaledVector(dir, len);
    const q2 = new THREE.Quaternion().setFromUnitVectors(rest, toLocal(up.getWorldQuaternion(new THREE.Quaternion()), reach.sub(lo.getWorldPosition(new THREE.Vector3())).normalize()));
    if (palms) q2.multiply(new THREE.Quaternion().setFromAxisAngle(rest, side === 'left' ? palms : -palms));
    lo.quaternion.slerp(q2, w);
    lo.updateMatrixWorld(true);
  }

  private yawQ(yaw: number) {
    return new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  }

  private standFrame(at: THREE.Vector3, yaw: number): Frame {
    const b = this.body;
    const q = this.yawQ(yaw);
    const off = new THREE.Vector3(b.hx, this.hipsY, b.hz).multiplyScalar(this.scale).applyQuaternion(q);
    return { hip: at.clone().add(off), q, hy: this.hipsY, bones: ARMS_DOWN };
  }

  /** Sitting back on a seat whose top is at `at`, thighs over it, feet flat in front (or legs out along a bath), hands in the lap. */
  private sitFrame(at: THREE.Vector3, yaw: number, floorY: number, legsOut = false, together = false): Frame {
    const b = this.body;
    const q = this.yawQ(yaw);
    const seat = (at.y - floorY) / this.scale;
    const joint = seat + 0.07;
    const [up, low, foot] = legsOut ? legReach(b.thigh, b.shin, 0.06, (b.thigh + b.shin) * 0.97) : legReach(b.thigh, b.shin, joint - b.ankle, b.thigh * (together ? 1.08 : 1.3));
    const back = new THREE.Vector3(0, 0, -0.1).applyQuaternion(q);
    return {
      hip: new THREE.Vector3(at.x, floorY + (joint + b.drop) * this.scale, at.z).add(back),
      q,
      hy: joint + b.drop,
      bones: {
        leftUpperLeg: [up[0], 0, together ? -.075 : .04], rightUpperLeg: [up[0], 0, together ? .075 : -.04],
        leftLowerLeg: low, rightLowerLeg: low, leftFoot: foot, rightFoot: foot,
        spine: [-0.08, 0, 0], chest: [-0.04, 0, 0], neck: [0.06, 0, 0], head: [0.04, 0, 0],
        leftUpperArm: [-0.5, 0, -1.35], rightUpperArm: [-0.5, 0, 1.35],
        leftLowerArm: [0, -0.95, 0], rightLowerArm: [0, 0.95, 0],
        leftHand: [0, 0, -0.1], rightHand: [0, 0, 0.1],
      },
    };
  }

  /**
   * Sitting cross-legged on a cushion whose top is at `at` (2026-10-26, a meditation mat): the hips
   * on its middle, the thighs out and forward with the knees down by the mat, the shins folded in
   * and crossed (the left in front, its foot under the right knee; the right foot tucked under the
   * left thigh), the back upright. The angles were solved for a VRoid leg (thigh 0.42, shin 0.40):
   * from the hip, the knees come to (±0.31, -0.13, 0.25) and the feet to (∓0.09, -0.17, 0.27) and
   * (±0.07, -0.16, 0.13); a cushion top about 0.16 up puts the knees and feet just over the mat.
   */
  private crossFrame(at: THREE.Vector3, yaw: number, floorY: number): Frame {
    const b = this.body;
    const q = this.yawQ(yaw);
    const joint = (at.y - floorY) / this.scale + 0.07;
    const back = new THREE.Vector3(0, 0, -0.03).applyQuaternion(q);
    return {
      hip: new THREE.Vector3(at.x, floorY + (joint + b.drop) * this.scale, at.z).add(back),
      q,
      hy: joint + b.drop,
      bones: {
        leftUpperLeg: [-2.55, 0.75, 1.5], rightUpperLeg: [-2.15, -0.65, -1.25],
        leftLowerLeg: [2.3, 0, 0], rightLowerLeg: [2.6, 0, 0], leftFoot: [0.2, 0, 0], rightFoot: [0.05, 0, 0],
        spine: [0.02, 0, 0], chest: [-0.02, 0, 0], neck: [0.04, 0, 0], head: [0.06, 0, 0],
        leftUpperArm: [-0.5, 0, -1.35], rightUpperArm: [-0.5, 0, 1.35],
        leftLowerArm: [0, -0.95, 0], rightLowerArm: [0, 0.95, 0],
        leftHand: [0, 0, -0.1], rightHand: [0, 0, 0.1],
      },
    };
  }

  /** Lying on the back, head at `head`, arms at the sides. */
  private lieFrame(head: THREE.Vector3, dir: THREE.Vector3): Frame {
    const b = this.body;
    const d = dir.clone().normalize();
    const hip = head.clone().addScaledVector(d, -(b.top + 0.03) * this.scale);
    hip.y = head.y + 0.11 * this.scale;
    return {
      hip,
      q: lieQuat(d),
      hy: this.hipsY,
      bones: {
        leftUpperLeg: [-0.04, 0, 0.03], rightUpperLeg: [-0.02, 0, -0.03],
        leftLowerLeg: [0.06, 0, 0], rightLowerLeg: [0.03, 0, 0], leftFoot: [0.9, 0, 0.1], rightFoot: [0.85, 0, -0.1],
        spine: [0.06, 0, 0], neck: [0.3, 0, 0], head: [0.2, 0.15, 0],
        leftUpperArm: [-0.08, 0, -1.3], rightUpperArm: [-0.08, 0, 1.3],
        leftLowerArm: [0, -0.25, 0], rightLowerArm: [0, 0.25, 0],
        leftHand: [0, 0, -0.1], rightHand: [0, 0, 0.1],
      },
    };
  }

  /**
   * Flying belly to earth in the box (2026-10-26): the body level and face down, the head along `yaw`,
   * the back arched and the chin up to look ahead, the knees bent so the shins rise behind, the legs
   * a little apart, the elbows bent (the hands are put out beside the head by the reach).
   */
  private flyFrame(mid: THREE.Vector3, yaw: number, kick?: number, tuck = 0): Frame {
    const b = this.body;
    const q = this.yawQ(yaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    // The hips a little behind the middle (the head and the bent knees about as far from it either way).
    const hip = mid.clone().addScaledVector(fwd, -0.2 * b.top * this.scale);
    // A swimmer's legs lie out behind and kick from the hips, under the water; a skydiver's knees are bent up.
    const swim = kick !== undefined;
    // Turning at a wall they tuck: the knees drawn down under them, the kick stopped, the feet in (about a sixth off their length).
    const up = swim ? (-0.06 + 0.16 * kick) * (1 - tuck) - 1.2 * tuck : 0.12;
    const down = swim ? (-0.06 - 0.16 * kick) * (1 - tuck) - 1.2 * tuck : 0.12;
    const shin = swim ? 0.1 + 1.5 * tuck : 1.45;
    const foot = swim ? 0.9 : 0.55;
    return {
      hip,
      q,
      hy: this.hipsY,
      bones: {
        hips: [-0.06, 0, 0], spine: [-0.16, 0, 0], chest: [-0.1, 0, 0], neck: [-0.35, 0, 0], head: [-0.3, 0, 0],
        leftUpperLeg: [up, 0, swim ? 0.06 : 0.24], rightUpperLeg: [down, 0, swim ? -0.06 : -0.24],
        leftLowerLeg: [shin, 0, 0], rightLowerLeg: [shin, 0, 0], leftFoot: [foot, 0, 0], rightFoot: [foot, 0, 0],
        leftUpperArm: [0, 0, 0.25], rightUpperArm: [0, 0, -0.25],
        leftLowerArm: [0, 0, 1.3], rightLowerArm: [0, 0, -1.3],
        leftHand: [0, 0, 0], rightHand: [0, 0, 0],
      },
    };
  }

  /** An asana (asana.ts) done at `at` facing `yaw` (turned by the step's turn), the hips put where it says; set down on what it's done on afterwards. */
  private asanaFrame(s: AsanaStep, at: THREE.Vector3, yaw: number, floorY: number): Frame {
    const a = ASANAS[s.key];
    const q = this.yawQ(yaw + s.turn);
    const hip = new THREE.Vector3(a.hip[0], 0, a.hip[2]).multiplyScalar(this.scale).applyQuaternion(q).add(at);
    hip.y = floorY + a.hip[1] * this.scale;
    return { hip, q, hy: this.hipsY, bones: a.bones };
  }

  /** How far the body as posed has to come up (or down) to rest on `floorY`: its lowest resting point on it. */
  private groundOn(floorY: number): number {
    const h = this.vrm.humanoid;
    // A VRM 0 model's bones are turned as written only once mirrored (as in update): measured so.
    const flip = this.vrm.meta?.metaVersion === '0' ? Object.values(h.normalizedHumanBones).map((b) => b.node) : [];
    const mirror = () => flip.forEach((n) => n.rotation.set(-n.rotation.x, n.rotation.y, -n.rotation.z));
    mirror();
    this.vrm.scene.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    let low = Infinity;
    for (const [bone, above] of RESTS) {
      const n = h.getNormalizedBoneNode(bone);
      if (n) low = Math.min(low, n.getWorldPosition(p).y - above * this.scale);
    }
    mirror();
    return low === Infinity ? 0 : floorY - low;
  }

  /**
   * On a reformer (asana.ts `bar`): each leg bent or stretched so its foot is on the footbar at `feet`
   * as the carriage runs out and in under the body, by `w` (0 as posed … 1 on the bar). Worked out in
   * the body's own frame (as the poses are written, for a VRM 0 model too), the hip to the bar.
   */
  private barLegs(feet: THREE.Vector3, hipAt: THREE.Vector3, q: THREE.Quaternion, w: number) {
    if (w < 0.01) return;
    const h = this.vrm.humanoid;
    const b = this.body;
    const hips = h.getNormalizedBoneNode('hips');
    if (!hips) return;
    const v0 = this.vrm.meta?.metaVersion === '0';
    const frame = q.clone().multiply(new THREE.Quaternion().setFromEuler(hips.rotation));
    const back = frame.clone().invert();
    for (const side of ['left', 'right'] as const) {
      const up = h.getNormalizedBoneNode(`${side}UpperLeg`);
      const lo = h.getNormalizedBoneNode(`${side}LowerLeg`);
      const foot = h.getNormalizedBoneNode(`${side}Foot`);
      if (!up || !lo || !foot) continue;
      const off = up.position.clone();
      if (v0) off.set(-off.x, off.y, -off.z);
      const joint = off.clone().multiplyScalar(this.scale).applyQuaternion(frame).add(hipAt);
      const goal = feet.clone().addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(frame), off.x * this.scale);
      const d = goal.sub(joint).applyQuaternion(back).divideScalar(this.scale);
      const [thigh, knee, ankle] = legReach(b.thigh, b.shin, -d.y, d.z);
      const mix = (n: THREE.Object3D, x: number) => n.rotation.set(n.rotation.x + (x - n.rotation.x) * w, n.rotation.y * (1 - w), n.rotation.z * (1 - w));
      mix(up, thigh[0]);
      mix(lo, knee[0]);
      // On the balls of the feet, the heels lifted a little.
      mix(foot, ankle[0] + 0.2);
    }
  }

  private applyFrame(f: Frame, breathe: number) {
    const h = this.vrm.humanoid;
    for (const n of BONES) {
      const r = f.bones[n] ?? [0, 0, 0];
      h.getNormalizedBoneNode(n)?.rotation.set(r[0] + (n === 'chest' ? breathe : 0), r[1], r[2]);
    }
    const hips = h.getNormalizedBoneNode('hips');
    if (hips) hips.position.y = f.hy;
    const b = this.body;
    const root = f.hip.clone().sub(new THREE.Vector3(b.hx, f.hy, b.hz).multiplyScalar(this.scale).applyQuaternion(f.q));
    this.vrm.scene.position.copy(root);
    this.vrm.scene.quaternion.copy(f.q);
  }

  /** The head's turn towards `look` as shown (eased), radians: round to their left, and up. */
  private gaze = { yaw: 0, pitch: 0 };
  private eyeTarget = new THREE.Object3D();

  /**
   * Turns the head to look at `look`: up to GAZE_YAW round (the neck a little under half, the head
   * the rest) and a little up or down, the eyes making up what's left. Someone further round than a
   * neck turns (behind them) isn't craned round to: the head eases back to the front. With `waist`
   * (turned round in a desk chair) the spine and chest take a share as well, up to GAZE_WAIST.
   */
  private applyGaze(look: THREE.Vector3 | undefined, lying: boolean, waist: boolean, dt: number, camera: THREE.Camera) {
    const h = this.vrm.humanoid;
    const most = waist ? GAZE_WAIST : GAZE_YAW;
    let yaw = 0;
    let pitch = 0;
    if (look && !lying) {
      this.vrm.scene.updateMatrixWorld(true);
      const d = look.clone().sub(this.eyes(new THREE.Vector3()));
      d.applyQuaternion(h.getNormalizedBoneNode('hips')!.getWorldQuaternion(new THREE.Quaternion()).invert());
      const round = Math.atan2(d.x, d.z);
      const k = 1 - THREE.MathUtils.smoothstep(Math.abs(round), most + 0.3, most + 0.9);
      yaw = THREE.MathUtils.clamp(round, -most, most) * k;
      pitch = THREE.MathUtils.clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -GAZE_DOWN, GAZE_UP) * k;
    }
    this.gaze.yaw = THREE.MathUtils.damp(this.gaze.yaw, yaw, 4, dt);
    this.gaze.pitch = THREE.MathUtils.damp(this.gaze.pitch, pitch, 4, dt);
    // The neck and head turn as far as GAZE_YAW; past that (in a chair) the spine and chest take the rest.
    const upper = THREE.MathUtils.clamp(this.gaze.yaw, -GAZE_YAW, GAZE_YAW);
    const lower = this.gaze.yaw - upper;
    const turn: Array<[VRMHumanBoneName, number, number]> = [['spine', lower * 0.5, 0], ['chest', lower * 0.5, 0], ['neck', upper * 0.45, 0.45], ['head', upper * 0.55, 0.55]];
    for (const [bone, y, share] of turn) {
      const n = h.getNormalizedBoneNode(bone);
      if (!n) continue;
      n.rotation.y += y;
      n.rotation.x -= this.gaze.pitch * share;
    }
    if (this.vrm.lookAt) {
      if (look && !lying) this.eyeTarget.position.copy(look);
      this.vrm.lookAt.target = look && !lying ? this.eyeTarget : camera;
    }
  }

  /** The clock, for tapping fingers. */
  private clockT = 0;
  /** In the water, swimming (see skirtInWater). */
  private wet = false;

  update(s: BodyState, dt: number, t: number, camera: THREE.Camera) {
    const p = s.pose;
    this.clockT = t;
    const wet = p.kind === 'fly' && p.kick !== undefined;
    if (wet !== this.wet) {
      this.wet = wet;
      const springs = this.vrm.springBoneManager;
      if (springs) skirtInWater(springs.joints, wet);
    }
    if (p.kind === 'sit' || p.kind === 'lie' || p.kind === 'fly' || p.kind === 'asana') {
      if (!this.transit || this.transit.kind !== p.kind) {
        // Fresh on the lot (a loaded game, a dweller just come in): already sitting or lying.
        const fresh = !this.placed;
        this.transit = { kind: p.kind, k: fresh ? 1 : 0, from: fresh ? (p.kind === 'lie' ? p.head.clone() : p.at.clone()).setY(p.floor) : this.pos.clone(), fromYaw: this.yaw };
        if (fresh) this.settle = true;
        this.placed = true;
      }
      const tr = this.transit;
      tr.k = Math.min(1, tr.k + dt / (p.kind === 'sit' ? SIT_TIME : p.kind === 'asana' ? ASANA_TIME : LIE_TIME));
      const stand = this.standFrame(tr.from, tr.fromYaw);
      let f: Frame;
      this.heldTurns = p.kind === 'asana';
      if (p.kind === 'asana') {
        // From one asana into the next, each bone the shortest way round; then set down on the mat (or the carriage).
        const pose = blendQ(this.asanaFrame(p.from, p.at, p.yaw, p.floor), this.asanaFrame(p.to, p.at, p.yaw, p.floor), p.e);
        f = blendQ(stand, pose, tr.k);
        this.applyFrame(f, Math.sin(t * 1.3) * 0.02);
        const dy = this.groundOn(p.floor);
        f.hip.y += dy;
        this.vrm.scene.position.y += dy;
        const bar = (ASANAS[p.from.key].bar ? 1 - p.e : 0) + (ASANAS[p.to.key].bar ? p.e : 0);
        if (p.feet) this.barLegs(p.feet, f.hip, f.q, bar * ease(tr.k));
      } else if (p.kind === 'sit') f = blend(stand, p.legs === 'cross' ? this.crossFrame(p.at, p.yaw, p.floor) : this.sitFrame(p.at, p.yaw, p.floor, p.legs === 'out', p.legs === 'together'), tr.k);
      // Lifted off the floor by the air, tipping forward onto the belly.
      else if (p.kind === 'fly') f = blend(stand, this.flyFrame(p.at, p.yaw, p.kick, p.tuck), tr.k);
      else {
        const lie = this.lieFrame(p.head, p.dir);
        // Sit on the edge first (facing across it), then swing the legs up and lie back.
        const sit = this.sitFrame(lie.hip.clone().setY(p.head.y), Math.atan2(p.dir.z, -p.dir.x), p.floor);
        f = tr.k < 0.5 ? blend(stand, sit, tr.k * 2) : blend(sit, lie, tr.k * 2 - 1);
      }
      if (p.kind !== 'asana') this.applyFrame(f, Math.sin(t * (p.kind === 'lie' ? 1.1 : 1.6)) * 0.02);
      this.held = f;
      this.walk = 0;
      this.pos.copy(tr.from);
      this.yaw = tr.fromYaw;
    } else {
      const target = p.at;
      // Far off (a dweller come in, put somewhere new): straight there. A storey up a flight is climbed.
      if (!this.placed || Math.hypot(target.x - this.pos.x, target.z - this.pos.z) > 2.5 || Math.abs(target.y - this.pos.y) > 3.5) {
        this.pos.copy(target);
        this.last.copy(target);
        this.yaw = p.yaw;
        this.placed = true;
        this.settle = true;
        this.held = null;
      }
      // Follow where they are, stepping (not sliding) over to a spot they're asked to stand on.
      const before = this.pos.clone();
      this.last.copy(target);
      const gap = Math.hypot(target.x - this.pos.x, target.z - this.pos.z);
      // On a flight (or just off it) they go at the climb's pace, not ahead of it.
      const climbing = Math.abs(target.y - this.pos.y) > 0.25;
      if (gap > 1e-5) {
        const step = gap * (1 - Math.exp(-(climbing ? 6 : 18) * dt));
        const k = (p.kind === 'walk' ? step : Math.min(step, 1.4 * dt)) / gap;
        this.pos.x += (target.x - this.pos.x) * k;
        this.pos.z += (target.z - this.pos.z) * k;
      }
      // Up and down a flight the height eases (the game steps between floors at once).
      this.pos.y = Math.abs(target.y - this.pos.y) < 3.5 ? THREE.MathUtils.damp(this.pos.y, target.y, 6, dt) : target.y;
      const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
      const diff = Math.atan2(Math.sin(p.yaw - this.yaw), Math.cos(p.yaw - this.yaw));
      this.yaw += THREE.MathUtils.clamp(diff, -9 * dt, 9 * dt);
      const walking = p.kind === 'walk' || moved > 0.25 * dt;
      this.walk = THREE.MathUtils.damp(this.walk, walking ? 1 : 0, 8, dt);
      this.phase += ((moved + (p.pace ?? 0) * dt) / this.stride) * Math.PI * 2;
      if (!walking && this.walk < 0.02) this.phase = Math.round(this.phase / Math.PI) * Math.PI;
      // Getting up: from the seat (or the bed) back onto their feet, then on with the walk.
      if (this.transit) {
        this.transit.k -= dt / SIT_TIME;
        if (this.transit.k <= 0 || !this.held) this.transit = null;
      }
      this.crouch = THREE.MathUtils.damp(this.crouch, p.crouch ?? 0, 6, dt);
      if (this.transit && this.held) this.applyFrame((this.heldTurns ? blendQ : blend)(this.standFrame(this.pos, this.yaw), this.held, this.transit.k), 0);
      else {
        this.held = null;
        this.walkPose(t);
        if (this.crouch > 0.01) this.squat(this.crouch);
        this.vrm.scene.position.copy(this.pos);
        this.vrm.scene.quaternion.setFromAxisAngle(UP, this.yaw);
      }
    }
    this.applyReach(s.reach, dt);
    if (s.reach?.hold) this.probeTool(s.reach.hold);
    this.applyGaze(s.look, p.kind === 'lie' || p.kind === 'fly' || p.kind === 'asana' || s.asleep, !!s.waist, dt, camera);
    const e = this.vrm.expressionManager;
    if (e) {
      if (t > this.blinkAt + 0.16) this.blinkAt = t + 2 + Math.random() * 4;
      const blink = t > this.blinkAt ? Math.sin(((t - this.blinkAt) / 0.16) * Math.PI) : 0;
      e.setValue('blink', s.asleep ? 1 : Math.max(0, blink));
      e.setValue('happy', !s.asleep && s.expr === 'smile' ? 0.45 : 0);
      e.setValue('sad', !s.asleep && s.expr === 'frown' ? 0.5 : 0);
      e.setValue('relaxed', !s.asleep && s.expr === 'neutral' && (p.kind === 'sit' || p.kind === 'lie') ? 0.35 : 0);
    }
    // A VRM 0 model's normalized bones turn the other way about X and Z (three-vrm's own retargeting
    // flips them): the pose, written as for VRM 1, is turned for the update and back after.
    const flip = this.vrm.meta?.metaVersion === '0' ? Object.values(this.vrm.humanoid.normalizedHumanBones).map((b) => b.node) : [];
    const mirror = () => flip.forEach((n) => n.rotation.set(-n.rotation.x, n.rotation.y, -n.rotation.z));
    mirror();
    this.vrm.update(dt);
    mirror();
    if (this.settle) {
      // A second of the springs' own time with the body held still: they hang where they come to rest.
      this.settle = false;
      const springs = this.vrm.springBoneManager;
      if (springs) for (let i = 0; i < 60; i++) springs.update(1 / 60);
    }
  }

  dispose() {
    this.root.removeFromParent();
    VrmDispose(this.vrm);
  }
}

function VrmDispose(vrm: VRM) {
  vrm.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
}

// ---- The shape figure ----

/** Our own figure, a grown-up about 1 unit tall, at a dweller's height. */
const FIGURE_SCALE: Record<Stage, number> = { toddler: 1.3, child: 1.42, teen: 1.5, adult: 1.55, elder: 1.52 };

export class ShapeAvatar implements Avatar {
  root = new THREE.Group();
  height: number;
  private fig: Figure;
  private holder = new THREE.Group();
  private pos = new THREE.Vector3();
  private last = new THREE.Vector3();
  private yaw = 0;
  private phase = 0;
  private placed = false;
  private k: number;

  constructor(readonly look: FigureLook) {
    this.fig = buildFigure(look);
    this.k = FIGURE_SCALE[look.stage];
    this.holder.scale.setScalar(this.k);
    this.holder.add(this.fig.root);
    this.root.add(this.holder);
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    this.height = this.fig.height * this.k;
  }

  private suit: CleanSuit | null = null;
  private suited = false;
  setSuit(on: boolean) {
    if (on === this.suited) return;
    this.suited = on;
    if (on) this.suit ??= figureSuit(this.fig.root, this.fig.head, this.fig.eyes, this.look.skin);
    this.suit?.show(on);
  }

  headTop(out: THREE.Vector3) {
    this.fig.head.getWorldPosition(out);
    return out.setY(out.y + 0.3 * this.k);
  }

  eyes(out: THREE.Vector3) {
    this.fig.head.getWorldPosition(out);
    return out.setY(out.y + 0.12 * this.k);
  }

  update(s: BodyState, dt: number, t: number) {
    const p = s.pose;
    const expr = s.asleep ? 'neutral' : s.expr;
    if (p.kind === 'lie') {
      poseFigure(this.fig, 'lie', t * 12, expr, this.look.stage);
      // On the back, head at the origin, feet along +z before turning so they point along -dir.
      this.fig.root.rotation.set(-Math.PI / 2, 0, 0);
      this.fig.root.position.set(0, 0.1, this.fig.headY);
      this.root.position.copy(p.head).add(p.dir.clone().normalize().multiplyScalar(-0.1 * this.k));
      this.root.rotation.set(0, Math.atan2(-p.dir.x, -p.dir.z), 0);
      this.pos.copy(p.head);
      return;
    }
    if (p.kind === 'fly') {
      // Face down, the head along yaw: the standing figure tipped forward about its middle.
      poseFigure(this.fig, 'stand', t * 4, expr, this.look.stage);
      this.fig.root.rotation.set(Math.PI / 2, 0, 0);
      this.fig.root.position.set(0, 0, -this.fig.headY / 2);
      this.root.position.copy(p.at);
      this.root.rotation.set(0, p.yaw, 0);
      this.pos.copy(p.at);
      this.yaw = p.yaw;
      return;
    }
    this.fig.root.rotation.set(0, 0, 0);
    this.fig.root.position.set(0, 0, 0);
    if (p.kind === 'sit') {
      poseFigure(this.fig, 'sit', t * 12, expr, this.look.stage);
      // The figure sits with its seat 0.17 units up; raise it onto the seat.
      this.root.position.copy(p.at).setY(p.at.y - 0.17 * this.k);
      this.root.rotation.set(0, p.yaw, 0);
      this.pos.copy(p.at);
      this.yaw = p.yaw;
      return;
    }
    if (!this.placed || Math.hypot(p.at.x - this.pos.x, p.at.z - this.pos.z) > 2.5 || Math.abs(p.at.y - this.pos.y) > 3.5) {
      this.pos.copy(p.at);
      this.last.copy(p.at);
      this.yaw = p.yaw;
      this.placed = true;
    }
    const moved = Math.hypot(p.at.x - this.last.x, p.at.z - this.last.z) + (p.kind === 'asana' ? 0 : (p.pace ?? 0)) * dt;
    this.last.copy(p.at);
    this.pos.lerp(p.at, 1 - Math.exp(-18 * dt));
    this.pos.y = THREE.MathUtils.damp(this.pos.y, p.at.y, 6, dt);
    const diff = Math.atan2(Math.sin(p.yaw - this.yaw), Math.cos(p.yaw - this.yaw));
    this.yaw += THREE.MathUtils.clamp(diff, -9 * dt, 9 * dt);
    this.phase += (moved / (0.9 * this.k * 0.6)) * Math.PI;
    poseFigure(this.fig, p.kind === 'walk' ? 'walk' : 'stand', p.kind === 'walk' ? this.phase : t * 4, expr, this.look.stage);
    this.root.position.copy(this.pos);
    this.root.rotation.set(0, this.yaw, 0);
  }

  dispose() {
    this.suit?.show(false);
    this.root.removeFromParent();
    this.fig.dispose();
  }
}

/** About how tall a character of each stage stands (m), for the stand-in while theirs loads. */
const STAND_IN_HEIGHT: Record<Stage, number> = { toddler: 0.85, child: 1.15, teen: 1.55, adult: 1.62, elder: 1.58 };

/**
 * Someone whose VRoid character is still on its way (2026-10-20, at the user's request: the shape
 * figure flashed up for a moment before each character came): a soft gold glow where they stand,
 * a slow ring at their feet — not a body, so nothing looks like it changed into someone else.
 */
export class LoadingAvatar implements Avatar {
  root = new THREE.Group();
  height: number;
  private glow: THREE.Mesh;
  private ring: THREE.Mesh;
  private pos = new THREE.Vector3();

  constructor(stage: Stage) {
    this.height = STAND_IN_HEIGHT[stage];
    const r = this.height * 0.12;
    this.glow = new THREE.Mesh(
      new THREE.CapsuleGeometry(r, this.height - 2 * r, 6, 16),
      new THREE.MeshBasicMaterial({ color: '#f6dd98', transparent: true, opacity: 0.18, depthWrite: false }),
    );
    this.glow.position.y = this.height / 2;
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(r * 2.2, 0.012, 6, 48),
      new THREE.MeshBasicMaterial({ color: '#d9b45f', transparent: true, opacity: 0.8, depthWrite: false }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.02;
    this.root.add(this.glow, this.ring);
  }

  headTop(out: THREE.Vector3) {
    return out.copy(this.pos).setY(this.pos.y + this.height);
  }

  eyes(out: THREE.Vector3) {
    return out.copy(this.pos).setY(this.pos.y + this.height - 0.12);
  }

  update(s: BodyState, _dt: number, t: number) {
    const p = s.pose;
    if (p.kind === 'lie') this.pos.copy(p.head).setY(p.floor);
    else if (p.kind === 'sit' || p.kind === 'fly') this.pos.copy(p.at).setY(p.floor);
    else this.pos.copy(p.at);
    this.root.position.copy(this.pos);
    // Breathing light, a ring turning slowly: something is coming, not something wrong.
    (this.glow.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 3));
    this.ring.rotation.z = t * 1.5;
    this.ring.scale.setScalar(1 + 0.08 * Math.sin(t * 3));
  }

  dispose() {
    this.root.removeFromParent();
    this.glow.geometry.dispose();
    (this.glow.material as THREE.Material).dispose();
    this.ring.geometry.dispose();
    (this.ring.material as THREE.Material).dispose();
  }
}
