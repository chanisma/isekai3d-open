import * as THREE from 'three';

/**
 * A tool held in the hand (2026-11-01, a pilot on the cleaning tools and a few workplaces): the piece says where the
 * tool is and where on it the hands go, the body's arms solve for that, and the tool is then put right
 * by whatever the arm could really do, so what's held stays in the hand. The swing-and-twist split comes
 * from ossos (sketchpunklabs, MIT): the arm's direction first, then its turn about its own length.
 *
 * VRM hand bones at rest: the fingers along +x on the left hand and -x on the right, the thumb side +z,
 * the palm -y (both hands).
 */
export type Side = 'left' | 'right';
export type HandShape = 'power' | 'pen' | 'pinch' | 'flat' | 'trigger' | 'cradle';

/** How far each finger curls (index to little) and each thumb joint turns, for a way of holding. */
export const SHAPES: Record<HandShape, { fingers: readonly [number, number, number, number]; thumb: readonly [number, number, number]; oppose: number }> = {
  /** Round a handle: a broom, a knife, a screwdriver. */
  power: { fingers: [0.72, 0.76, 0.8, 0.84], thumb: [0.3, 0.55, 0.6], oppose: 0.75 },
  /** A pen or a brush between the thumb and the first two fingers, the others tucked. */
  pen: { fingers: [0.5, 0.62, 0.85, 0.95], thumb: [0.45, 0.55, 0.45], oppose: 0.85 },
  /** Something small between the thumb and the first finger. */
  pinch: { fingers: [0.55, 0.28, 0.22, 0.22], thumb: [0.4, 0.5, 0.4], oppose: 0.55 },
  /** Open on a cloth, a tray. */
  flat: { fingers: [0.05, 0.05, 0.06, 0.08], thumb: [0.1, 0.1, 0.1], oppose: 0.05 },
  /** The first finger out on a trigger, the rest round the body of it. */
  trigger: { fingers: [0.5, 0.8, 0.85, 0.9], thumb: [0.35, 0.55, 0.5], oppose: 0.7 },
  /** Round something big, not closed on it. */
  cradle: { fingers: [0.2, 0.22, 0.25, 0.28], thumb: [0.15, 0.15, 0.15], oppose: 0.25 },
};

/** Where a hand goes on a tool, in the tool's own frame. */
export interface Grip {
  /** The point the palm closes on. */
  at: THREE.Vector3;
  /** The way along the handle the thumb side of the fist points. */
  axis: THREE.Vector3;
  /** The way the palm faces, for a tool with a right way up (a knife); left out on a round handle, the hand turning on it to suit the arm. */
  palm?: THREE.Vector3;
  shape: HandShape;
  /** How thick what's held is here, metres (left out, a broom handle's): the hand opens round it. */
  radius?: number;
  /** On a handle a hand can move along: if the arm won't get to `at`, it holds nearer the leading hand. */
  slide?: boolean;
  /**
   * What writes on a page below it (a pen): how far along `axis` from `at` its tip is (negative: back along it). The tool's then
   * leaned back to the hand as a pen in a writing hand is, about its tip, whatever turn the script gave it (`leanPen`).
   */
  writes?: number;
}

/**
 * The left hand under a board held to be read (a tablet, a clipboard, an open book), which faces +z in a group turned `tilt` towards
 * whoever holds it. `at` is in the middle of the board's thickness, as `palmOf` wants it (it stands the palm off by the radius), a little below
 * its centre; the palm faces the board and the fingers run up its back away from them, the thumb out to their left, for someone facing -z.
 * `behind`: how far back of the group's origin the back of something thick is. Measured in the tool's own frame, not the tilted group's.
 */
export function boardGrip(tilt: number, { x = 0, down = 0.03, behind = 0 }: { x?: number; down?: number; behind?: number } = {}): Grip {
  const turn = (v: THREE.Vector3) => v.applyAxisAngle(new THREE.Vector3(1, 0, 0), -tilt);
  return { at: turn(new THREE.Vector3(x, -down, -behind)), axis: new THREE.Vector3(-1, 0, 0), palm: turn(new THREE.Vector3(0, 0, 1)), shape: 'flat', radius: 0.01 };
}

/** The handle the ways of holding are shaped for, metres. */
export const HANDLE_RADIUS = 0.014;

/** A tool in someone's hands this frame. */
export interface HeldTool {
  tool: THREE.Object3D;
  grips: Partial<Record<Side, Grip>>;
  /** The hand the tool follows; the other then finds its grip on the tool where it now is. */
  lead: Side;
  /**
   * A point on the tool that stays put (a broom's head on the floor): if the hand can't get to the
   * grip the tool swings about this. Left out, the whole tool moves to the hand.
   */
  anchor?: THREE.Vector3;
  /** Still in its place: the hands go to it but don't move it (reaching to take it). */
  resting?: boolean;
  /** How the body goes with the work. */
  lean?: number;
  nod?: number;
  /** Where a hand that isn't on the tool goes (world), and how it's held there. */
  free?: Partial<Record<Side, THREE.Vector3>>;
  freeShape?: HandShape;
}

const X = new THREE.Vector3();
const Y = new THREE.Vector3();
const Z = new THREE.Vector3();
const M = new THREE.Matrix4();

/** How the handle lies across a closed hand: off square to the fingers, towards their tips. */
export const HANDLE_SLANT = 0.5;

/**
 * The hand bone's turn in the world for a grip: the thumb side along `axis`, the palm towards `palm`
 * (or, on a round handle, the fingers carrying on the way the forearm goes, as far as the handle lets them).
 */
export function gripQuaternion(side: Side, axis: THREE.Vector3, palm: THREE.Vector3 | undefined, forearm: THREE.Vector3, fallback: THREE.Vector3, out = new THREE.Quaternion()): THREE.Quaternion {
  Z.copy(axis).normalize();
  const sign = side === 'left' ? 1 : -1;
  if (palm) {
    // Palm is bone -y: the frame follows from it the same for either hand.
    X.crossVectors(Z, palm);
  } else {
    // The way the fingers point: as the forearm goes, the fallback always a little in it so a handle
    // lying along the forearm turns the hand smoothly and never leaves it with no way to point.
    X.copy(forearm).addScaledVector(Z, -forearm.dot(Z));
    Y.copy(fallback).addScaledVector(Z, -fallback.dot(Z));
    X.addScaledVector(Y, 0.3);
    if (X.lengthSq() < 1e-6) X.set(Z.y, Z.z, Z.x).addScaledVector(Z, -(Z.y * Z.x + Z.z * Z.y + Z.x * Z.z));
    // Bone +x is the fingers on the left hand, away from them on the right.
    X.normalize().multiplyScalar(sign);
  }
  X.normalize();
  Y.crossVectors(Z, X);
  out.setFromRotationMatrix(M.makeBasis(X, Y, Z));
  // The handle runs slantwise over the palm: from a thumb square to the fingers, tipped round -y.
  return out.multiply(new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -sign * HANDLE_SLANT));
}

/**
 * The hand's turn for a pen, which isn't held like a handle: the fingers go the way the forearm does, slanted
 * towards the tip, the thumb side up and rolled in a little, so the hand rests on its little-finger side
 * and the pen lies along the first finger. `axis` may run either way: the tip is the end away from the arm, and down.
 */
export function penQuaternion(side: Side, axis: THREE.Vector3, forearm: THREE.Vector3, out = new THREE.Quaternion()): THREE.Quaternion {
  const way = forearm.clone().normalize();
  const tip = axis.clone().normalize();
  if (tip.dot(way) * 0.6 - tip.y < 0) tip.negate();
  const fingers = way.multiplyScalar(0.5).addScaledVector(tip, 0.85).normalize();
  Z.set(0, 1, 0).addScaledVector(fingers, -fingers.y);
  if (Z.lengthSq() < 1e-4) Z.set(1, 0, 0).addScaledVector(fingers, -fingers.x);
  Z.normalize();
  const sign = side === 'left' ? 1 : -1;
  // Towards the palm, across from the thumb side: for either hand, in towards the other.
  Y.crossVectors(fingers, Z).multiplyScalar(sign);
  const roll = 0.35;
  const thumb = Z.clone().multiplyScalar(Math.cos(roll)).addScaledVector(Y, Math.sin(roll));
  X.copy(fingers).multiplyScalar(sign);
  Y.crossVectors(thumb, X);
  return out.setFromRotationMatrix(M.makeBasis(X, Y, thumb));
}

/**
 * Turns a hand to `goal` (world) on the end of a forearm already pointed where it goes: the part of
 * the turn about the forearm's own length goes in the forearm, as the arm's two bones really share it,
 * and the wrist bends the rest. `w` blends in from the pose there was.
 */
export function aimHand(lower: THREE.Object3D, hand: THREE.Object3D, goal: THREE.Quaternion, w: number, share = 0.8) {
  lower.updateWorldMatrix(true, false);
  const lowerQ = lower.getWorldQuaternion(new THREE.Quaternion());
  const rel = lowerQ.clone().invert().multiply(goal);
  const along = hand.position.clone().normalize();
  // Twist: the part of the relative turn about the forearm.
  const d = rel.x * along.x + rel.y * along.y + rel.z * along.z;
  const twist = new THREE.Quaternion(along.x * d, along.y * d, along.z * d, rel.w);
  if (twist.lengthSq() < 1e-8) twist.identity();
  else twist.normalize();
  lower.quaternion.multiply(new THREE.Quaternion().slerp(twist, share * w));
  lower.updateWorldMatrix(false, false);
  const local = lower.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(goal);
  hand.quaternion.slerp(local, w);
  hand.updateWorldMatrix(false, false);
}

/** Moves or swings `tool` so its `from` point (world) is at `to` (world); `anchor` (the tool's frame) stays where it is. */
export function correctTool(tool: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, anchor?: THREE.Vector3) {
  const parent = tool.parent;
  if (!parent) return;
  parent.updateWorldMatrix(true, false);
  if (!anchor) {
    const moved = tool.getWorldPosition(new THREE.Vector3()).add(to).sub(from);
    tool.position.copy(parent.worldToLocal(moved));
  } else {
    const pin = tool.localToWorld(anchor.clone());
    const a = from.clone().sub(pin);
    const b = to.clone().sub(pin);
    if (a.lengthSq() < 1e-6 || b.lengthSq() < 1e-6) return;
    const turn = new THREE.Quaternion().setFromUnitVectors(a.normalize(), b.normalize());
    const parentQ = parent.getWorldQuaternion(new THREE.Quaternion());
    const worldQ = tool.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn);
    tool.quaternion.copy(parentQ.clone().invert().multiply(worldQ));
    tool.updateWorldMatrix(false, false);
    const after = tool.localToWorld(anchor.clone());
    const moved = tool.getWorldPosition(new THREE.Vector3()).add(pin).sub(after);
    tool.position.copy(parent.worldToLocal(moved));
  }
  tool.updateWorldMatrix(false, false);
}

/** A writing pen's angle off the upright, radians: 37°, so 53° up from the page. */
export const PEN_LEAN = 0.65;

/** Stands a leaned pen as the script had it, if the script hasn't turned it since (a pen whose root only ever gets a position). */
export function unleanPen(tool: THREE.Object3D) {
  const ud = tool.userData as { penLeant?: THREE.Quaternion; penBase?: THREE.Quaternion };
  if (ud.penLeant && ud.penBase && ud.penLeant.equals(tool.quaternion)) tool.quaternion.copy(ud.penBase);
  ud.penLeant = ud.penBase = undefined;
}

/**
 * Leans a pen back from its tip towards `shoulder` (world), the tip staying where it is, for a grip that `writes`. Scripts set
 * where the tip goes and mostly stand the pen nearly upright. Only on a page below it: a pen at a wall or lying flat, going in or
 * out of the hand, leans as far as it's upright. Call once a frame after the script has placed the tool: it undoes its own last
 * turn first, so it never adds up on a tool the script only moves.
 */
export function leanPen(tool: THREE.Object3D, grip: Grip, shoulder: THREE.Vector3) {
  if (!grip.writes || !tool.parent) return;
  unleanPen(tool);
  tool.updateWorldMatrix(true, false);
  const base = tool.quaternion.clone();
  // The tip, and the way from it up the pen, in the world.
  const tip = tool.localToWorld(grip.at.clone().addScaledVector(grip.axis, grip.writes));
  const gripAt = tool.localToWorld(grip.at.clone());
  const up = gripAt.clone().sub(tip);
  const len = up.length();
  if (len < 1e-4) return;
  up.divideScalar(len);
  const w = THREE.MathUtils.smoothstep(up.y, 0.55, 0.8);
  if (w <= 0) return;
  const toHand = shoulder.clone().sub(tip).setY(0);
  if (toHand.lengthSq() < 1e-4) return;
  toHand.normalize();
  const want = new THREE.Vector3(0, Math.cos(PEN_LEAN), 0).addScaledVector(toHand, Math.sin(PEN_LEAN));
  // Through `correctTool`: `at` swung about the tip, however the tool's parent is turned.
  correctTool(tool, gripAt, tip.clone().addScaledVector(up.lerp(want, w).normalize(), len), grip.at.clone().addScaledVector(grip.axis, grip.writes));
  (tool.userData as { penBase?: THREE.Quaternion }).penBase = base;
  (tool.userData as { penLeant?: THREE.Quaternion }).penLeant = tool.quaternion.clone();
}

/**
 * Stands a long tool with its `tip` (the tool's frame) at `at`, its +y along `up` (both in the frame of
 * its parent), spun `spin` about its own length.
 */
export function poseTool(tool: THREE.Object3D, tip: THREE.Vector3, at: THREE.Vector3, up: THREE.Vector3, spin = 0) {
  tool.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, up.clone().normalize());
  if (spin) tool.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, spin));
  tool.position.copy(at).sub(tip.clone().applyQuaternion(tool.quaternion));
}

/** A dev probe (the lab script reads it): how far the shown palm was from each grip, the worst seen per tool. */
export interface ToolProbe {
  /** Frames with the hands settled on the tool. */
  frames: number;
  /** Metres, worst seen with the tool in the hand (not while reaching for it or letting go). */
  left: number;
  right: number;
  /** Metres, totals over the frames, for the average. */
  leftSum: number;
  rightSum: number;
  /** How high the anchor got above the floor (a head off the floor), metres, worst seen. */
  anchorDrift: number;
}
export function probe(name: string): ToolProbe | null {
  const g = globalThis as unknown as { __toolProbe?: Record<string, ToolProbe> };
  if (!g.__toolProbe) return null;
  return (g.__toolProbe[name] ??= { frames: 0, left: 0, right: 0, leftSum: 0, rightSum: 0, anchorDrift: 0 });
}
