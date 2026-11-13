import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { getDef } from '../../game/catalog';
import { motionOf, spotPose } from '../activity';
import { VrmAvatar } from '../avatar';
import { buildFurniture, kindOf } from '../furniture3d';
import type { ToolProbe } from '../handTool';

/*
 * The lab probe without a browser (2026-11-02): the real VrmAvatar, its real arm solving and its real grips, on a skeleton with the
 * bone positions of the shipped characters (read from their .vrm files), driving the real piece through the same calls the lot view
 * makes each frame. What comes out is what tools/handshot.mjs reads from `__toolProbe`. No meshes, so no picture: only where the hand is.
 */
type P = readonly [number, number, number];
export interface Skeleton {
  name: string;
  /** Top of the head, what `avatar.height` measures. */
  height: number;
  /** Rest positions in the model's frame, the left side only (the right mirrors it). */
  bones: Record<string, P>;
}
const SIDED = ['UpperLeg', 'LowerLeg', 'Foot', 'Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'MiddleProximal'];
const PARENT: Record<string, string | null> = { hips: null, spine: 'hips', chest: 'spine', upperChest: 'chest', neck: 'upperChest', head: 'neck', UpperLeg: 'hips', LowerLeg: 'UpperLeg', Foot: 'LowerLeg', Shoulder: 'upperChest', UpperArm: 'Shoulder', LowerArm: 'UpperArm', Hand: 'LowerArm', MiddleProximal: 'Hand' };

/** The shortest grown-up body we ship, with the shortest arm. */
export const HANA: Skeleton = {
  name: 'hana',
  height: 1.595,
  bones: { hips: [0, 0.91, 0.004], spine: [0, 0.963, 0.009], chest: [0, 1.075, -0.005], upperChest: [0, 1.184, -0.006], neck: [0, 1.322, 0.002], head: [0, 1.395, 0.002], UpperLeg: [0.077, 0.87, 0.005], LowerLeg: [0.077, 0.517, 0.005], Foot: [0.077, 0.102, 0.008], Shoulder: [0.022, 1.294, 0.001], UpperArm: [0.109, 1.294, 0.001], LowerArm: [0.329, 1.294, 0.001], Hand: [0.544, 1.294, 0.001], MiddleProximal: [0.61, 1.301, 0.003] },
};
/** The tallest. */
export const JUNHO: Skeleton = {
  name: 'junho',
  height: 1.8,
  bones: { hips: [0, 1.051, 0.004], spine: [0, 1.11, 0.01], chest: [0, 1.234, -0.005], upperChest: [0, 1.354, -0.007], neck: [0, 1.507, 0.001], head: [0, 1.599, 0.001], UpperLeg: [0.085, 1.007, 0.005], LowerLeg: [0.085, 0.619, 0.005], Foot: [0.085, 0.162, 0.008], Shoulder: [0.025, 1.476, 0], UpperArm: [0.15, 1.476, 0], LowerArm: [0.37, 1.476, 0], Hand: [0.62, 1.476, 0], MiddleProximal: [0.693, 1.484, 0.003] },
};

/** A VRM with nothing but its normalised bones, which is all of it the arms look at. */
function fakeVrm(sk: Skeleton): VRM {
  const scene = new THREE.Group();
  // Something for the height to measure.
  const span = new THREE.Mesh(new THREE.BoxGeometry(0.01, sk.height, 0.01));
  span.position.y = sk.height / 2;
  scene.add(span);
  const nodes: Record<string, THREE.Object3D> = {};
  const rest = (name: string): THREE.Vector3 => {
    const side = /^(left|right)/.exec(name)?.[1];
    const key = side ? name.slice(side.length) : name;
    const p = sk.bones[key];
    return new THREE.Vector3(side === 'right' ? -p[0] : p[0], p[1], p[2]);
  };
  const add = (name: string, parent: string | null) => {
    const n = new THREE.Object3D();
    n.name = name;
    n.position.copy(rest(name));
    if (parent) n.position.sub(rest(parent));
    (parent ? nodes[parent] : scene).add(n);
    nodes[name] = n;
  };
  for (const name of ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head']) add(name, PARENT[name]);
  for (const side of ['left', 'right']) for (const key of SIDED) add(`${side}${key}`, PARENT[key]!.length && SIDED.includes(PARENT[key]!) ? `${side}${PARENT[key]}` : PARENT[key]);
  const get = (name: string) => nodes[name] ?? null;
  return { scene, meta: { metaVersion: '1' }, humanoid: { getNormalizedBoneNode: get, getRawBoneNode: get, resetNormalizedPose: () => {}, normalizedHumanBones: {} }, update: () => {} } as unknown as VRM;
}

export interface Measured {
  probe: Record<string, ToolProbe>;
  /** Seconds run. */
  seconds: number;
}

/**
 * Someone working at a piece for `seconds`, frame by frame as the lot view does it, and the probe at the end. `key` is the interaction
 * (the same id the piece's spots go by).
 */
export function workAt(defId: string, key: string, sk: Skeleton, seconds: number, opts: { seek?: boolean; onFrame?: (t: number, probe: Record<string, ToolProbe>) => void } = {}): Measured {
  const def = getDef(defId);
  const scene = new THREE.Scene();
  const built = buildFurniture(def, { againstWall: false });
  scene.add(built.root);
  scene.updateMatrixWorld(true);
  const spot = built.spots?.[key] ?? built.spots?.['*'];
  if (!spot) throw new Error(`no spot ${key} on ${defId}`);
  const av = new VrmAvatar(fakeVrm(sk), 1);
  const camera = new THREE.PerspectiveCamera();
  const g = globalThis as unknown as { __toolProbe?: Record<string, ToolProbe> };
  g.__toolProbe = {};
  const dt = 1 / 60;
  const use = motionOf(key, kindOf(def), false);
  // `seek`: as handshot.mjs moves the clock on, 0.3 s every other frame, the body's own easing left behind.
  let frame = 0;
  for (let t = 0; t < seconds; t += opts.seek && frame % 2 === 0 ? 0.3 : dt) {
    frame++;
    scene.updateMatrixWorld(true);
    built.animate?.(t);
    built.away?.(false, t);
    const { pose, doing } = spotPose(spot, use, av.height, t, 1);
    av.update({ pose, expr: 'neutral', asleep: false, active: false, reach: doing.reach }, dt, t, camera);
    opts.onFrame?.(t, g.__toolProbe);
  }
  const probe = g.__toolProbe;
  g.__toolProbe = undefined;
  return { probe, seconds };
}
