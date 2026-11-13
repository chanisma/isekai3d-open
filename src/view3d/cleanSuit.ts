import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { toon } from './toon';

/**
 * The cleanroom suit (2026-11-01, the 반도체 팹), made from the body it goes on: no file of its own, since a character pack can't
 * be asked for one. A VRoid body's whole skin is copied and reshaped into a baggy one-piece, the same for any body: the torso is
 * laid on one straight section from crotch to chest (bust and waist gone), legs and arms on wide tubes round their bones, gathered at
 * wrist and ankle, and all of it stays bound to the same bones, so it moves as the body does and fits any age or gender. Gloves, boots,
 * thin soles and fold shadows are colours on that mesh; zip, seam, cuffs, badge and pocket ride on it, skinned. The hood, mask and neck
 * flap, measured from the face, are skinned to head, neck and chest. Clothes, hair and body are only hidden, nothing about them changed,
 * so taking it off is showing them again. Built once for a body, the first time.
 */

// Cool on purpose: the sun is warm (#fff3dc in lot3d.ts) and a plain white under it reads cream. A touch of blue in the cloth cancels that.
const WHITE = '#edf4fd';
const FOLD = '#b4c2d2';
const CUFF = '#d3deea';
const SEAM = '#9fb0c2';
const ZIP = '#2f3944';
const GLOVE = '#7f9fd8';
const BOOT = '#cfe2f6';
const SOLE = '#86a9cf';
const MASK = '#5f9fdc';
const RIM = '#7f8f9f';
const LINE = '#3c4450';
/** Lifts the shadow bands, cool, so the cloth's dark side is blue-grey and not the floor's colour. */
const GLOW = '#1a222c';
/** Where the shape comes from the normal alone, metres on a grown-up: what has no tube or section. */
const ROOM = { torso: 0, thigh: 0, shin: 0, upperArm: 0, foreArm: 0, neck: 0.012, hand: 0.0025, foot: 0.014 };
type Region = keyof typeof ROOM;

const REGION_BONES: Array<[Region, VRMHumanBoneName[]]> = [
  ['thigh', ['leftUpperLeg', 'rightUpperLeg']],
  ['shin', ['leftLowerLeg', 'rightLowerLeg']],
  ['foot', ['leftFoot', 'rightFoot', 'leftToes', 'rightToes']],
  ['upperArm', ['leftUpperArm', 'rightUpperArm']],
  ['foreArm', ['leftLowerArm', 'rightLowerArm']],
  ['neck', ['neck', 'head']],
  ['hand', ['leftHand', 'rightHand', ...(['left', 'right'] as const).flatMap((s) => (['Thumb', 'Index', 'Middle', 'Ring', 'Little'] as const).flatMap((f) => (f === 'Thumb' ? (['Metacarpal', 'Proximal', 'Distal'] as const) : (['Proximal', 'Intermediate', 'Distal'] as const)).map((j) => `${s}${f}${j}` as VRMHumanBoneName)))]],
];

const matsOf = (m: THREE.Mesh) => [m.material].flat() as THREE.Material[];
const named = (m: THREE.Mesh, re: RegExp) => matsOf(m).some((x) => re.test(x.name));
const BODY = /Body_\d+_SKIN/;
const FACE = /Face|Eye|Brow|Mouth/;
const NOT_WORN = /Face|Eye|Brow|Mouth/;
/** What a suit goes over: all but the face. */
const hides = (m: THREE.Mesh) => !named(m, NOT_WORN) || /^Hair/.test(m.name);

interface Soft {
  position: Float32Array;
  normal: Float32Array;
  skinIndex: Uint16Array;
  skinWeight: Float32Array;
  color: Float32Array;
  index: number[];
}

/** Welded, area-weighted smooth normals: a mesh's seams (split for its texture) don't open when it's pushed out. */
function weld(pos: ArrayLike<number>, count: number): { of: Int32Array; n: number } {
  const key = new Map<string, number>();
  const of = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    const k = `${Math.round(pos[3 * i] * 2000)},${Math.round(pos[3 * i + 1] * 2000)},${Math.round(pos[3 * i + 2] * 2000)}`;
    let w = key.get(k);
    if (w === undefined) key.set(k, (w = key.size));
    of[i] = w;
  }
  return { of, n: key.size };
}

/** What each of a skeleton's bones is part of, by the humanoid's names; a bone of no region is the torso's. */
function regions(vrm: VRM, skeleton: THREE.Skeleton): Array<Region> {
  const of = new Map<THREE.Object3D, Region>();
  for (const [region, names] of REGION_BONES)
    for (const name of names) {
      const b = vrm.humanoid.getRawBoneNode(name);
      if (b) of.set(b, region);
    }
  return skeleton.bones.map((b) => of.get(b) ?? 'torso');
}

/** A bone from the rest pose, in the mesh's own frame (where the geometry is). */
function restOf(mesh: THREE.SkinnedMesh, bone: THREE.Object3D | null | undefined): THREE.Vector3 | null {
  const i = bone ? mesh.skeleton.bones.indexOf(bone as THREE.Bone) : -1;
  if (i < 0) return null;
  const inv = mesh.skeleton.boneInverses[i];
  return new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(inv).invert().premultiply(new THREE.Matrix4().copy(mesh.bindMatrix).invert()));
}

const smooth = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/** A round of cloth about a bone: its radius along it (t, 0 at the bone's start), from how far out the skin was there. */
interface Tube {
  a: THREE.Vector3;
  b: THREE.Vector3;
  radius(t: number, skin: number): number;
}
/** The straight section the torso's laid on, and the bones' tubes (by the skeleton's index). */
interface Fit {
  tubes: Map<number, Tube>;
  Rx: number;
  Rz: number;
  cz: number;
  /** The depth and middle it comes down to at the crotch, to meet the thighs with no shelf. */
  lowRz: number;
  lowCz: number;
  crotch: number;
  chest: number;
  neck: number;
  cuffs: Array<[THREE.Vector3, THREE.Vector3, number]>;
  joints: THREE.Vector3[];
}

/** The cloth over a body: a copy of its whole skin, reshaped into the suit and coloured. */
function clothOver(vrm: VRM, body: THREE.SkinnedMesh, scale: number, lift: number): { soft: Soft; fit: Fit | null } {
  const g = body.geometry;
  const src = g.attributes.position;
  const count = src.count;
  const bones = body.skeleton.bones;
  const headBone = bones.indexOf(vrm.humanoid.getRawBoneNode('head') as THREE.Bone);
  const onHead = (i: number) => {
    let w = 0;
    for (let k = 0; k < 4; k++) if (g.attributes.skinIndex.getComponent(i, k) === headBone) w += g.attributes.skinWeight.getComponent(i, k);
    return w > 0.9;
  };
  // What a body's skin has of the head (under the hair) is under the hood: no cloth there to come through it.
  const all = (g.userData.wholeBody as ArrayLike<number> | undefined) ?? g.index!.array;
  const index: number[] = [];
  for (let t = 0; t + 2 < all.length; t += 3) if (!(onHead(all[t]) && onHead(all[t + 1]) && onHead(all[t + 2]))) index.push(all[t], all[t + 1], all[t + 2]);
  const { of, n } = weld(src.array as ArrayLike<number>, count);
  const skinI = g.attributes.skinIndex;
  const skinW = g.attributes.skinWeight;
  const kinds = regions(vrm, body.skeleton);

  // A bust's spring bones would throw a suit about: what's on them goes on the bone they hang from.
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  for (let i = 0; i < count; i++)
    for (let k = 0; k < 4; k++) {
      let b = skinI.getComponent(i, k);
      if (/Bust/.test(bones[b]?.name ?? '')) {
        const up = bones.indexOf(bones[b].parent as THREE.Bone);
        if (up >= 0) b = up;
      }
      skinIndex[4 * i + k] = b;
      skinWeight[4 * i + k] = skinW.getComponent(i, k);
    }

  // Each welded point: where it was, one vertex of it for its bones, and how much of a foot and a hand it is.
  const P = new Float32Array(n * 3);
  const rep = new Int32Array(n);
  const room = new Float32Array(n);
  const foot = new Float32Array(n);
  const hand = new Float32Array(n);
  const torso = new Float32Array(n);
  const posOf = src.array as ArrayLike<number>;
  for (let i = count - 1; i >= 0; i--) {
    const w = of[i];
    rep[w] = i;
    for (let a = 0; a < 3; a++) P[3 * w + a] = posOf[3 * i + a];
  }
  for (let w = 0; w < n; w++) {
    room[w] = foot[w] = hand[w] = torso[w] = 0;
    for (let k = 0; k < 4; k++) {
      const weight = skinWeight[4 * rep[w] + k];
      if (!weight) continue;
      const kind = kinds[skinIndex[4 * rep[w] + k]];
      room[w] += weight * ROOM[kind];
      if (kind === 'foot') foot[w] += weight;
      if (kind === 'hand') hand[w] += weight;
      if (kind === 'torso') torso[w] += weight;
    }
  }

  const fit = fitOf(vrm, body, P, torso, n, scale);
  // Each point goes where its bones' shapes put it, in the shares it's on them: so the shapes meet at the joints and nothing tears.
  const Q = new Float32Array(n * 3);
  const here = new THREE.Vector3();
  const to = new THREE.Vector3();
  const sum = new THREE.Vector3();
  for (let w = 0; w < n; w++) {
    here.set(P[3 * w], P[3 * w + 1], P[3 * w + 2]);
    sum.set(0, 0, 0);
    let got = 0;
    for (let k = 0; k < 4; k++) {
      const weight = skinWeight[4 * rep[w] + k];
      if (!weight) continue;
      const b = skinIndex[4 * rep[w] + k];
      if (fit) shaped(fit, b, kinds[b], here, scale, to);
      else to.copy(here);
      sum.addScaledVector(to, weight);
      got += weight;
    }
    if (got > 0) sum.divideScalar(got);
    else sum.copy(here);
    Q[3 * w] = sum.x;
    Q[3 * w + 1] = sum.y;
    Q[3 * w + 2] = sum.z;
  }
  P.set(Q);

  // A few passes of smoothing over all but hands and feet: the shapes run into one another with no ridge, as cloth would.
  const links: Array<Set<number>> = Array.from({ length: n }, () => new Set());
  for (let t = 0; t + 2 < index.length; t += 3) {
    const [a, b, c] = [of[index[t]], of[index[t + 1]], of[index[t + 2]]];
    links[a].add(b).add(c);
    links[b].add(a).add(c);
    links[c].add(a).add(b);
  }
  for (let pass = 0; pass < 3; pass++) {
    Q.set(P);
    for (let w = 0; w < n; w++) {
      const on = 1 - Math.min(1, hand[w] + foot[w]);
      if (on < 0.05 || !links[w].size) continue;
      const m = [0, 0, 0];
      for (const o of links[w]) for (let a = 0; a < 3; a++) m[a] += P[3 * o + a];
      for (let a = 0; a < 3; a++) Q[3 * w + a] = P[3 * w + a] + 0.5 * on * (m[a] / links[w].size - P[3 * w + a]);
    }
    P.set(Q);
  }

  // Standing on heels (wearOnBase raised the whole body): the boot's underside comes down to the floor, the top of the foot where it was.
  let footMin = Infinity;
  let ankle = -Infinity;
  for (let w = 0; w < n; w++)
    if (foot[w] > 0.5) {
      footMin = Math.min(footMin, P[3 * w + 1]);
      ankle = Math.max(ankle, P[3 * w + 1]);
    }
  if (lift > 0 && ankle > footMin) for (let w = 0; w < n; w++) if (foot[w] > 0.3) P[3 * w + 1] -= lift * (1 - smooth(P[3 * w + 1], footMin, ankle));

  // The normals of what that left, welded.
  const N = new Float32Array(n * 3);
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let t = 0; t + 2 < index.length; t += 3) {
    const [a, b, c] = [of[index[t]], of[index[t + 1]], of[index[t + 2]]];
    ab.set(P[3 * b] - P[3 * a], P[3 * b + 1] - P[3 * a + 1], P[3 * b + 2] - P[3 * a + 2]);
    ac.set(P[3 * c] - P[3 * a], P[3 * c + 1] - P[3 * a + 1], P[3 * c + 2] - P[3 * a + 2]);
    ab.cross(ac);
    for (const v of [a, b, c]) {
      N[3 * v] += ab.x;
      N[3 * v + 1] += ab.y;
      N[3 * v + 2] += ab.z;
    }
  }
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const [white, fold, glove, boot, sole] = [WHITE, FOLD, GLOVE, BOOT, SOLE].map((c) => new THREE.Color(c));
  const col = new THREE.Color();
  const soleTop = footMin - lift + 0.012 * scale;
  const reach = 0.075 * scale;
  for (let i = 0; i < count; i++) {
    const w = of[i];
    const len = Math.hypot(N[3 * w], N[3 * w + 1], N[3 * w + 2]) || 1;
    const nx = N[3 * w] / len;
    let ny = N[3 * w + 1] / len;
    const nz = N[3 * w + 2] / len;
    // A boot's foot doesn't go through the floor.
    if (foot[w] > 0.3 && ny < 0) ny = 0;
    const r = room[w] * scale;
    const [x, y, z] = [P[3 * w], P[3 * w + 1], P[3 * w + 2]];
    position[3 * i] = x + nx * r;
    position[3 * i + 1] = y + ny * r;
    position[3 * i + 2] = z + nz * r;
    normal[3 * i] = nx;
    normal[3 * i + 1] = N[3 * w + 1] / len;
    normal[3 * i + 2] = nz;
    if (hand[w] > 0.5) col.copy(glove);
    else if (foot[w] > 0.3) col.copy(y < soleTop ? sole : boot);
    else {
      col.copy(white);
      // Folds, soft, where a baggy suit creases: at the elbows, knees, hips and armpits, in bands across the limb.
      if (fit) {
        let crease = 0;
        for (const j of fit.joints) {
          const d = Math.hypot(x - j.x, y - j.y, z - j.z);
          if (d < reach * 1.8) crease = Math.max(crease, Math.exp(-((d / reach) ** 2)) * (0.55 + 0.45 * Math.sin((x + y * 1.6 + z * 0.7) * 95)));
        }
        col.lerp(fold, Math.max(0, crease) * 0.8);
      }
    }
    color[3 * i] = col.r;
    color[3 * i + 1] = col.g;
    color[3 * i + 2] = col.b;
  }
  return { soft: { position, normal, skinIndex, skinWeight, color, index }, fit };
}

/** The suit's shape on this body, measured from it. */
function fitOf(vrm: VRM, body: THREE.SkinnedMesh, P: Float32Array, torso: Float32Array, n: number, scale: number): Fit | null {
  const raw = (b: VRMHumanBoneName) => vrm.humanoid.getRawBoneNode(b);
  const rest = (b: VRMHumanBoneName) => restOf(body, raw(b));
  const hips = rest('hips');
  const neckAt = rest('neck');
  if (!hips || !neckAt) return null;
  const crotch = rest('leftUpperLeg')?.y ?? hips.y - 0.08 * scale;
  const chest = crotch + (neckAt.y - crotch) * 0.72;
  // The widest and deepest the torso gets anywhere from crotch to chest: one section for all of it, so nothing shows through and nothing goes in.
  let [mx, z0, z1] = [0, Infinity, -Infinity];
  for (let w = 0; w < n; w++) {
    const y = P[3 * w + 1];
    if (torso[w] < 0.6 || y < crotch - 0.03 * scale || y > chest) continue;
    mx = Math.max(mx, Math.abs(P[3 * w]));
    z0 = Math.min(z0, P[3 * w + 2]);
    z1 = Math.max(z1, P[3 * w + 2]);
  }
  if (!Number.isFinite(z0)) return null;
  const Rx = mx + 0.04 * scale;
  const Rz = Math.max((z1 - z0) / 2 + 0.035 * scale, Rx * 0.72);
  const tubes = new Map<number, Tube>();
  const cuffs: Fit['cuffs'] = [];
  const joints: THREE.Vector3[] = [];
  const add = (bone: VRMHumanBoneName, a: THREE.Vector3 | null, b: THREE.Vector3 | null, radius: Tube['radius']) => {
    const i = body.skeleton.bones.indexOf(raw(bone) as THREE.Bone);
    if (i >= 0 && a && b) tubes.set(i, { a, b, radius });
  };
  for (const side of ['left', 'right'] as const) {
    const [hip, knee, ank] = [rest(`${side}UpperLeg`), rest(`${side}LowerLeg`), rest(`${side}Foot`)];
    const [sh, el, wr] = [rest(`${side}UpperArm`), rest(`${side}LowerArm`), rest(`${side}Hand`)];
    // Out to the torso's own side at the top, and wide enough on the inside to meet the other leg down to the knee.
    const top = Math.max(0.1 * scale, Rx - Math.abs(hip?.x ?? 0));
    const atKnee = Math.max(top * 0.85, Math.abs(knee?.x ?? 0) + 0.004 * scale);
    const atShin = atKnee * 0.82;
    add(`${side}UpperLeg`, hip, knee, (t) => top + (atKnee - top) * t);
    add(`${side}LowerLeg`, knee, ank, (t, skin) => (t < 0.8 ? atKnee + (atShin - atKnee) * (t / 0.8) : t < 0.86 ? atShin + (skin + 0.008 * scale - atShin) * ((t - 0.8) / 0.06) : skin + 0.012 * scale));
    const up = 0.066 * scale;
    const mid = 0.06 * scale;
    const fore = 0.064 * scale;
    add(`${side}UpperArm`, sh, el, (t) => up + (mid - up) * t);
    add(`${side}LowerArm`, el, wr, (t, skin) => (t < 0.74 ? mid + (fore - mid) * (t / 0.74) : t < 0.88 ? fore + (skin + 0.006 * scale - fore) * ((t - 0.74) / 0.14) : skin + 0.006 * scale));
    if (knee && ank) cuffs.push([knee, ank, 0.86]);
    if (el && wr) cuffs.push([el, wr, 0.88]);
    for (const j of [knee, el, hip]) if (j) joints.push(j);
    if (sh) joints.push(new THREE.Vector3(sh.x, sh.y - 0.05 * scale, sh.z));
  }
  const legTop = Math.max(0.1 * scale, Rx - Math.abs(rest('leftUpperLeg')?.x ?? 0));
  return { tubes, Rx, Rz, cz: (z0 + z1) / 2, lowRz: Math.min(Rz, legTop * 1.12), lowCz: rest('leftUpperLeg')?.z ?? hips.z, crotch, chest, neck: neckAt.y, cuffs, joints };
}

/** Where a bone's shape puts a point of the skin. */
function shaped(fit: Fit, bone: number, kind: Region, p: THREE.Vector3, scale: number, out: THREE.Vector3) {
  const tube = fit.tubes.get(bone);
  if (tube) {
    const axis = TMP_A.subVectors(tube.b, tube.a);
    const L2 = Math.max(1e-6, axis.lengthSq());
    const t = THREE.MathUtils.clamp(TMP_B.subVectors(p, tube.a).dot(axis) / L2, 0, 1);
    const on = TMP_B.copy(tube.a).addScaledVector(axis, t);
    const away = TMP_A.subVectors(p, on);
    const skin = away.length();
    if (skin < 1e-4) return out.copy(p);
    return out.copy(on).addScaledVector(away, Math.max(skin + 0.004 * scale, tube.radius(t, skin)) / skin);
  }
  if (kind !== 'torso') return out.copy(p);
  // Above the chest it goes back to following the shoulders, a little off them.
  const on = 1 - smooth(p.y, fit.chest, fit.neck);
  const up = smooth(p.y, fit.crotch, fit.crotch + (fit.chest - fit.crotch) * 0.6);
  const cz = THREE.MathUtils.lerp(fit.lowCz, fit.cz, up);
  const Rz = THREE.MathUtils.lerp(fit.lowRz, fit.Rz, up);
  const dx = p.x;
  const dz = p.z - cz;
  const len = Math.hypot(dx, dz);
  if (len < 1e-3) return out.copy(p);
  const [ux, uz] = [dx / len, dz / len];
  const R = 1 / Math.sqrt((ux / fit.Rx) ** 2 + (uz / Rz) ** 2);
  const reach = THREE.MathUtils.lerp(len + 0.02 * scale, Math.max(R, len + 0.006 * scale), on);
  return out.set(ux * reach, p.y, cz + uz * reach);
}
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();

function geometryOf(s: Soft, push = 0): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const pos = push ? s.position.slice() : s.position;
  if (push) for (let i = 0; i < pos.length; i++) pos[i] += s.normal[i] * push;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(s.normal, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(s.skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(s.skinWeight, 4));
  g.setAttribute('color', new THREE.BufferAttribute(s.color, 3));
  g.setIndex(s.index);
  return g;
}

const clothMaterial = (side: THREE.Side = THREE.FrontSide) => {
  const m = toon('#ffffff').clone();
  m.vertexColors = true;
  m.emissive = new THREE.Color(GLOW);
  m.side = side;
  return m;
};
const lineMaterial = () => new THREE.MeshBasicMaterial({ color: LINE, side: THREE.BackSide });

/** A mesh on a body's own bones and in its frame, with the dark line round it the rest of the figure has. */
function bound(group: THREE.Group, s: Soft, body: { skeleton: THREE.Skeleton; bindMatrix: THREE.Matrix4 }, material: THREE.Material, line = 0.0035) {
  const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, shadow: boolean) => {
    const m = new THREE.SkinnedMesh(geometry, mat);
    m.frustumCulled = false;
    m.castShadow = shadow;
    m.bind(body.skeleton, body.bindMatrix);
    group.add(m);
    return m;
  };
  add(geometryOf(s), material, true);
  if (line) add(geometryOf(s, line), lineMaterial(), false);
}

/** Quads as a soft mesh, each with its colour and each point on its bones. */
class Strip {
  position: number[] = [];
  normal: number[] = [];
  skinIndex: number[] = [];
  skinWeight: number[] = [];
  color: number[] = [];
  index: number[] = [];
  private tmp = new THREE.Color();
  point(p: THREE.Vector3, n: THREE.Vector3, color: string, bones: [number, number?, number?, number?], weights: [number, number?, number?, number?]): number {
    const c = this.tmp.set(color);
    this.position.push(p.x, p.y, p.z);
    this.normal.push(n.x, n.y, n.z);
    this.color.push(c.r, c.g, c.b);
    for (let k = 0; k < 4; k++) {
      this.skinIndex.push(bones[k] ?? 0);
      this.skinWeight.push(weights[k] ?? 0);
    }
    return this.position.length / 3 - 1;
  }
  quad(a: number, b: number, c: number, d: number) {
    this.index.push(a, b, c, a, c, d);
  }
  soft(): Soft {
    return { position: new Float32Array(this.position), normal: new Float32Array(this.normal), skinIndex: new Uint16Array(this.skinIndex), skinWeight: new Float32Array(this.skinWeight), color: new Float32Array(this.color), index: this.index };
  }
}

/** What rides on the cloth, on the bones of the cloth under it: the zip, waist seam, cuffs, badge and pocket. */
function trimOf(cloth: Soft, fit: Fit | null, front: number, hip: number, neck: number, scale: number): Soft {
  const s = new Strip();
  const count = cloth.position.length / 3;
  const near = (x: number, y: number) => {
    let best = -1;
    let score = Infinity;
    for (let i = 0; i < count; i++) {
      if ((cloth.position[3 * i + 2] - (fit?.cz ?? 0)) * front < 0) continue;
      const d = Math.hypot(cloth.position[3 * i] - x, cloth.position[3 * i + 1] - y);
      if (d < score) (score = d), (best = i);
    }
    return best;
  };
  const skin = (i: number) => [[cloth.skinIndex[4 * i], cloth.skinIndex[4 * i + 1], cloth.skinIndex[4 * i + 2], cloth.skinIndex[4 * i + 3]] as [number, number, number, number], [cloth.skinWeight[4 * i], cloth.skinWeight[4 * i + 1], cloth.skinWeight[4 * i + 2], cloth.skinWeight[4 * i + 3]] as [number, number, number, number]] as const;
  const out = new THREE.Vector3(0, 0, front);
  const quad = (a: number, b: number, c: number, d: number) => (front > 0 ? s.quad(a, b, c, d) : s.quad(a, d, c, b));
  // The zip: from the crotch to the neck, a dark line.
  const low = fit ? fit.crotch - 0.03 * scale : hip;
  const rows = 20;
  let last: [number, number] | null = null;
  for (let j = 0; j <= rows; j++) {
    const y = low + ((neck - low) * j) / rows;
    const i = near(0, y);
    if (i < 0) continue;
    const [b, w] = skin(i);
    const z = cloth.position[3 * i + 2] + front * 0.005;
    const half = 0.0055 * scale;
    const a = s.point(new THREE.Vector3(-half, y, z), out, ZIP, b, w);
    const c = s.point(new THREE.Vector3(half, y, z), out, ZIP, b, w);
    if (last) quad(last[0], last[1], c, a);
    last = [a, c];
  }
  // A flat patch on the chest.
  const patch = (x: number, y: number, hw: number, hh: number, color: string, off: number) => {
    const i = near(x, y);
    if (i < 0) return;
    const [b, w] = skin(i);
    const z = cloth.position[3 * i + 2] + front * off;
    const [p0, p1, p2, p3] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([dx, dy]) => s.point(new THREE.Vector3(x + dx, y + dy, z), out, color, b, w));
    quad(p0, p1, p2, p3);
  };
  const by = low + (neck - low) * 0.74;
  const bx = 0.08 * scale;
  // The badge on one side; on the other a pocket with its flap and a seam round it.
  patch(front * bx, by, 0.036 * scale, 0.015 * scale, '#1f2d5c', 0.006);
  patch(-front * bx, by - 0.02 * scale, 0.042 * scale, 0.05 * scale, SEAM, 0.005);
  patch(-front * bx, by - 0.02 * scale, 0.038 * scale, 0.046 * scale, WHITE, 0.0058);
  patch(-front * bx, by + 0.018 * scale, 0.042 * scale, 0.012 * scale, CUFF, 0.0066);
  // A band round the cloth where a plane across a bone's axis cuts it, on the bones of what it's over.
  const band = (a: THREE.Vector3, b: THREE.Vector3, t0: number, h: number, color: string, within: number, up: number) => {
    const axis = b.clone().sub(a);
    const L = axis.length();
    if (L < 1e-3) return;
    axis.divideScalar(L);
    const u = new THREE.Vector3(1, 0, 0).addScaledVector(axis, -axis.x);
    if (u.lengthSq() < 0.01) u.set(0, 0, 1).addScaledVector(axis, -axis.z);
    u.normalize();
    const v = axis.clone().cross(u);
    const BINS = 20;
    const reach = new Float32Array(BINS);
    const who = new Int32Array(BINS).fill(-1);
    const c = a.clone().addScaledVector(axis, t0 * L);
    const d = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      d.set(cloth.position[3 * i] - c.x, cloth.position[3 * i + 1] - c.y, cloth.position[3 * i + 2] - c.z);
      if (Math.abs(d.dot(axis)) > up) continue;
      const [x, y] = [d.dot(u), d.dot(v)];
      const r = Math.hypot(x, y);
      if (r > within) continue;
      const bin = Math.floor(((Math.atan2(y, x) / (Math.PI * 2) + 1) % 1) * BINS) % BINS;
      if (r > reach[bin]) (reach[bin] = r), (who[bin] = i);
    }
    for (let k = 0; k < BINS * 2; k++) {
      const i = k % BINS;
      if (who[i] >= 0) continue;
      const j = (i + BINS - 1) % BINS;
      if (who[j] >= 0) (who[i] = who[j]), (reach[i] = reach[j]);
    }
    if (who[0] < 0) return;
    const ring: Array<[number, number]> = [];
    for (let k = 0; k < BINS; k++) {
      const th = ((k + 0.5) / BINS) * Math.PI * 2;
      const dir = u.clone().multiplyScalar(Math.cos(th)).addScaledVector(v, Math.sin(th));
      const r = reach[k] + 0.0045 * scale;
      const [bo, we] = skin(who[k]);
      const at = c.clone().addScaledVector(dir, r);
      ring.push([s.point(at.clone().addScaledVector(axis, -h), dir, color, bo, we), s.point(at.clone().addScaledVector(axis, h), dir, color, bo, we)]);
    }
    for (let k = 0; k < BINS; k++) {
      const [p, q] = [ring[k], ring[(k + 1) % BINS]];
      s.quad(p[0], q[0], q[1], p[1]);
    }
  };
  if (fit) {
    for (const [a, b, t] of fit.cuffs) band(a, b, t, 0.016 * scale, CUFF, 0.13 * scale, 0.03 * scale);
    const waist = new THREE.Vector3(0, hip, fit.cz);
    band(waist, new THREE.Vector3(0, neck, fit.cz), 0.2, 0.0045 * scale, SEAM, fit.Rx * 1.3, 0.035 * scale);
  }
  return s.soft();
}

/** What's inside a mesh by the triangles it uses (its vertices can be a whole file's). */
function boxOf(meshes: THREE.Mesh[]): THREE.Box3 {
  const b = new THREE.Box3();
  const p = new THREE.Vector3();
  for (const m of meshes) {
    const pos = m.geometry.attributes.position;
    const idx = m.geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i++) b.expandByPoint(p.fromBufferAttribute(pos, idx ? idx.getX(i) : i));
  }
  return b;
}

/**
 * The hood and mask: a shell round the head as measured, open in a slit at the eyes, its lower edge a cowl over the neck.
 * Rows and columns are laid along the slit's edges, so it's a clean line and not a stair.
 */
function hoodOver(head: THREE.Box3, eyes: THREE.Box3 | null, neckY: number, chestY: number, front: number, bones: { head: number; neck: number; chest: number }): Soft {
  const c = head.getCenter(new THREE.Vector3());
  const size = head.getSize(new THREE.Vector3());
  const a = size.x / 2 + 0.025;
  const b = size.y / 2 + 0.03;
  // Close over the nose, so the brow of the slit doesn't shade the eyes from a camera above; roomy behind, where the head's rounder than an ellipse.
  const dFront = size.z / 2 + 0.008;
  const dBack = size.z / 2 + 0.03;
  const depth = (cos: number) => (cos > 0 ? dFront : dBack);
  const eyeC = eyes ? eyes.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, c.y, 0);
  const eyeH = eyes ? eyes.getSize(new THREE.Vector3()) : new THREE.Vector3(size.x * 0.6, size.y * 0.12, 0);
  // Up to the brows.
  const hi = Math.min(c.y + b * 0.8, eyes ? eyes.max.y + eyeH.y * 1.3 : eyeC.y + eyeH.y);
  const lo = Math.max(c.y - b * 0.7, eyes ? eyes.min.y - eyeH.y * 0.35 : eyeC.y - eyeH.y);
  const ringAt = (y: number) => Math.sqrt(Math.max(0.02, 1 - ((y - c.y) / b) ** 2));
  const sinOpen = Math.min(0.96, (eyeH.x / 2 + 0.018) / (a * ringAt((hi + lo) / 2)));
  const open = Math.asin(sinOpen);
  const RIM_W = 0.07;

  // Heights: over the crown down to the chin, then in to the neck and out over the collar.
  const chin = c.y - b * 0.86;
  const ys = new Set<number>([hi + 0.012, hi, lo, lo - 0.012]);
  for (let i = 0; i <= 12; i++) ys.add(c.y + b * Math.cos((i / 12) * Math.PI * 0.86));
  const rows = [...ys].filter((y) => y >= chin - 1e-6).sort((p, q) => q - p);
  const neck = Math.min(neckY, chin - 0.012);
  // In at the neck, then the flap out over the shoulders, its hem a collar band.
  const flap = Math.min(chestY, neck - 0.03);
  const under = [{ y: (chin + neck) / 2, k: 0.66 }, { y: neck, k: 0.62 }, { y: flap, k: 1.02 }, { y: flap - 0.035, k: 1.28 }, { y: flap - 0.05, k: 1.34 }];
  const hemY = flap - 0.035;
  const SEAM_W = 0.06;
  const angles = new Set<number>([-open - RIM_W, -open, open, open + RIM_W, -Math.PI, -Math.PI + SEAM_W, Math.PI - SEAM_W]);
  const AROUND = 28;
  for (let i = 0; i < AROUND; i++) {
    const th = -Math.PI + (i / AROUND) * Math.PI * 2;
    if ((Math.abs(th) < open + RIM_W + 0.03 && Math.abs(th) > open - 0.03) || Math.abs(th) > Math.PI - SEAM_W - 0.03) continue;
    angles.add(th);
  }
  const ths = [...angles].sort((p, q) => p - q);
  const s = new Strip();
  const point = (y: number, th: number, k: number) => new THREE.Vector3(c.x + a * k * Math.sin(th), y, c.z + front * depth(Math.cos(th)) * k * Math.cos(th));
  const weights = (y: number): { b: [number, number]; w: [number, number] } => {
    if (y >= chin) return { b: [bones.head, bones.neck], w: [1, 0] };
    if (y > neck) return { b: [bones.head, bones.neck], w: [0.5, 0.5] };
    if (y === neck) return { b: [bones.neck, bones.chest], w: [0.8, 0.2] };
    return { b: [bones.chest, bones.neck], w: [1, 0] };
  };
  const rowsAll = [...rows.map((y) => ({ y, k: ringAt(y) })), ...under];
  for (let j = 0; j + 1 < rowsAll.length; j++) {
    const [r0, r1] = [rowsAll[j], rowsAll[j + 1]];
    const mid = (r0.y + r1.y) / 2;
    for (let i = 0; i < ths.length; i++) {
      const [t0, t1] = [ths[i], i + 1 < ths.length ? ths[i + 1] : ths[0] + Math.PI * 2];
      const mt = (t0 + t1) / 2;
      const inOpen = Math.abs(mt) < open && mid < hi && mid > lo;
      if (inOpen) continue;
      const nearEyes = Math.abs(mt) < open + RIM_W && mid < hi + 0.012 && mid > lo - 0.012;
      const onMask = mid < lo && Math.abs(mt) < open + 0.42 && mid > chin - 0.01;
      const onSeam = Math.abs(mt) > Math.PI - SEAM_W || Math.abs(mt - Math.PI * 2) < SEAM_W;
      const color = nearEyes ? RIM : onMask ? MASK : mid < hemY ? CUFF : onSeam ? SEAM : WHITE;
      // A mask stands off the hood, on its own.
      const proud = onMask ? 1.03 : 1;
      const put = (r: { y: number; k: number }, th: number) => {
        const p = point(r.y, th, r.k * proud);
        const dz = depth(Math.cos(th));
        const n = new THREE.Vector3((p.x - c.x) / (a * a), r.y >= chin ? (p.y - c.y) / (b * b) : 0, (p.z - c.z) / (dz * dz)).normalize();
        const on = weights(r.y);
        return s.point(p, n, color, on.b, on.w);
      };
      const [p00, p01, p11, p10] = [put(r0, t0), put(r0, t1), put(r1, t1), put(r1, t0)];
      front > 0 ? s.quad(p00, p10, p11, p01) : s.quad(p00, p01, p11, p10);
    }
  }
  return s.soft();
}

export interface CleanSuit {
  show(on: boolean): void;
}

/** A body's suit, hidden till asked for. */
export function vrmSuit(vrm: VRM): CleanSuit {
  const meshes: THREE.Mesh[] = [];
  vrm.scene.traverse((o) => ((o as THREE.Mesh).isMesh ? meshes.push(o as THREE.Mesh) : undefined));
  const skinned = meshes.filter((m) => (m as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh[];
  const bodies = skinned.filter((m) => named(m, BODY) && !m.name.endsWith('(body)'));
  const group = new THREE.Group();
  group.name = 'cleanSuit';
  group.visible = false;
  const front = vrm.meta?.metaVersion === '0' ? -1 : 1;
  const faces = meshes.filter((m) => named(m, FACE) && !named(m, /_CLOTH|HAIR/i));
  const head = faces.length ? boxOf(faces) : null;

  const raw = (b: VRMHumanBoneName) => vrm.humanoid.getRawBoneNode(b);
  const body = bodies[0];
  // A body that isn't whole (a file whose clothes cut it, no record of what was there): what it wears, whitened, goes over the gaps.
  const whole = !!body && (!!body.geometry.userData.wholeBody || torsoTriangles(body, restOf(body, raw('hips')), restOf(body, raw('neck'))) > 150);
  const worn = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  if (!whole) {
    const plain = toon(WHITE);
    for (const m of skinned) if (hides(m) && !/^Hair/.test(m.name) && !named(m, /HAIR/i)) worn.set(m, matsOf(m).map(() => plain));
  }
  // Their height, as a share of a grown-up's: how deep the cloth is on them.
  const topY = head ? head.max.y : 1.5;
  const scale = THREE.MathUtils.clamp(topY / 1.55, 0.55, 1.1);

  // Raised by a pair of heels (wearOnBase): the boots still to the floor.
  const restHips = vrm.humanoid.normalizedRestPose.hips?.position?.[1];
  const rawHips = body ? restOf(body, raw('hips'))?.y : undefined;
  const lift = restHips !== undefined && rawHips !== undefined ? THREE.MathUtils.clamp(restHips - rawHips, 0, 0.2) : 0;
  for (const b of bodies) {
    const { soft, fit } = clothOver(vrm, b, scale, lift);
    bound(group, soft, b, clothMaterial());
    if (b === body) {
      const hip = restOf(b, raw('hips'))?.y ?? 0.8;
      const neck = restOf(b, raw('neck'))?.y ?? 1.3;
      bound(group, trimOf(soft, fit, front, hip, neck - 0.015 * scale, scale), b, clothMaterial(THREE.DoubleSide), 0);
    }
  }

  // The hood, on a skeleton of its own three bones (a body's skin needn't have the head).
  const hb = raw('head');
  const nb = raw('neck');
  const cb = raw('upperChest') ?? raw('chest') ?? raw('spine');
  const having = (bone: THREE.Object3D | null) => skinned.find((m) => bone && m.skeleton.bones.includes(bone as THREE.Bone));
  const [hm, nm, cm] = [having(hb), having(nb) ?? having(hb), having(cb) ?? having(nb)];
  if (head && hb && nb && cb && hm && nm && cm) {
    const inv = (m: THREE.SkinnedMesh, bone: THREE.Object3D) => {
      const i = m.skeleton.bones.indexOf(bone as THREE.Bone);
      return (i >= 0 ? m.skeleton.boneInverses[i] : new THREE.Matrix4().copy(bone.matrixWorld).invert()).clone();
    };
    const skeleton = new THREE.Skeleton([hb, nb, cb] as THREE.Bone[], [inv(hm, hb), inv(nm, nb), inv(cm, cb)]);
    const iris = faces.filter((m) => named(m, /EyeIris/));
    const neckY = restOf(nm, nb)?.y ?? head.min.y - 0.03;
    const chestY = neckY - 0.05 * scale;
    const hood = hoodOver(head, iris.length ? boxOf(iris) : null, neckY, chestY, front, { head: 0, neck: 1, chest: 2 });
    bound(group, hood, { skeleton, bindMatrix: hm.bindMatrix }, clothMaterial(THREE.DoubleSide));
  }

  // By the meshes it goes with: the VRM 0 turn, the scene's scale.
  (body?.parent ?? faces[0]?.parent ?? vrm.scene).add(group);
  group.updateMatrixWorld(true);

  let hidden: THREE.Mesh[] = [];
  const kept = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  return {
    show(on) {
      group.visible = on;
      if (on) {
        // Whatever's showing now, which may not be what was at the last time.
        hidden = meshes.filter((m) => m.visible && hides(m) && !worn.has(m));
        for (const m of hidden) m.visible = false;
        for (const [m, mats] of worn) {
          kept.set(m, m.material);
          m.material = mats;
        }
      } else {
        for (const m of hidden) m.visible = true;
        hidden = [];
        for (const [m, mats] of kept) m.material = mats;
        kept.clear();
      }
    },
  };
}

function torsoTriangles(body: THREE.SkinnedMesh, hip: THREE.Vector3 | null, neck: THREE.Vector3 | null): number {
  if (!hip || !neck) return 0;
  const g = body.geometry;
  const pos = g.attributes.position;
  const idx = g.index;
  if (!idx) return 0;
  let n = 0;
  for (let t = 0; t + 2 < idx.count; t += 3) {
    const y = pos.getY(idx.getX(t));
    if (y > hip.y && y < neck.y - 0.02 && Math.abs(pos.getX(idx.getX(t))) < 0.12) n++;
  }
  return n;
}

// ---- The shape figure (with no character for them) ----

/** The figure painted white, gloved, its hair put away, and a hood and mask on its head group; its eyes and face under the slit. */
export function figureSuit(root: THREE.Object3D, head: THREE.Object3D, eyes: THREE.Object3D[], skin: string): CleanSuit {
  const white = toon(WHITE);
  const glove = toon(GLOVE);
  const skinHex = new THREE.Color(skin).getHexString();
  const isSkin = (m: THREE.Mesh) => matsOf(m).some((x) => (x as THREE.MeshToonMaterial).color?.getHexString() === skinHex);
  const inEyes = (o: THREE.Object3D) => {
    for (let u: THREE.Object3D | null = o; u; u = u.parent) if (eyes.includes(u)) return true;
    return false;
  };
  const headParts: THREE.Mesh[] = [];
  head.traverse((o) => ((o as THREE.Mesh).isMesh ? headParts.push(o as THREE.Mesh) : undefined));
  const face = headParts.find((m) => isSkin(m) && !inEyes(m));
  let r = 0.12;
  const c = new THREE.Vector3();
  if (face) {
    face.geometry.computeBoundingSphere();
    r = face.geometry.boundingSphere!.radius * Math.max(...face.scale.toArray()) * 1.1;
    c.copy(face.position);
  }
  const hood = new THREE.Group();
  hood.visible = false;
  hood.name = 'cleanHood';
  hood.position.copy(c);
  const cloth = new THREE.MeshToonMaterial({ color: WHITE, side: THREE.DoubleSide, gradientMap: white.gradientMap });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16, Math.PI / 2 + 0.72, Math.PI * 2 - 1.44), cloth);
  const brow = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 6, Math.PI / 2 - 0.74, 1.48, 0, 1.15), cloth);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(r * 0.99, 18, 8, Math.PI / 2 - 0.8, 1.6, 1.62, 0.92), new THREE.MeshToonMaterial({ color: MASK, side: THREE.DoubleSide, gradientMap: white.gradientMap }));
  hood.add(shell, brow, mask);
  head.add(hood);

  const body: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !headParts.includes(m) && m.parent !== hood) body.push(m);
  });
  // Of the head only the skin behind the slit and the eyes stay: the hair and whatever's drawn on the face go under the hood.
  const under = headParts.filter((m) => m !== face && !inEyes(m));
  const was = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  let hidden: THREE.Mesh[] = [];
  return {
    show(on) {
      hood.visible = on;
      if (on) {
        for (const m of body) {
          was.set(m, m.material);
          m.geometry.computeBoundingSphere();
          // A hand: skin-coloured and small.
          m.material = isSkin(m) && m.geometry.boundingSphere!.radius < 0.07 ? glove : white;
        }
        hidden = under.filter((m) => m.visible);
        for (const m of hidden) m.visible = false;
      } else {
        for (const [m, mat] of was) m.material = mat;
        was.clear();
        for (const m of hidden) m.visible = true;
        hidden = [];
      }
    },
  };
}
