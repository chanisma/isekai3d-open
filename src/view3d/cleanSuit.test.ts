import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { VRM } from '@pixiv/three-vrm';
import { figureSuit, vrmSuit } from './cleanSuit';

/** A little body with the bones and material names a VRoid export has: arms, legs, a torso, a head, its clothes and hair apart. */
function fakeVrm(height = 1.5) {
  const scene = new THREE.Group();
  const names = ['hips', 'chest', 'neck', 'head', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftHand'];
  const ys: Record<string, number> = { hips: 0.55, chest: 0.72, neck: 0.8, head: 0.85, leftUpperLeg: 0.5, leftLowerLeg: 0.28, leftFoot: 0.06, leftHand: 0.5 };
  const bones = names.map((n) => {
    const b = new THREE.Bone();
    b.name = n;
    b.position.y = ys[n] * height;
    scene.add(b);
    return b;
  });
  scene.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const mesh = (name: string, material: string, geom: THREE.BufferGeometry, bone: number, y: number) => {
    const g = geom.clone();
    g.translate(0, y, 0);
    const n = g.attributes.position.count;
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0).map((_, i) => (i % 4 ? 0 : bone)), 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, i) => (i % 4 ? 0 : 1)), 4));
    const mat = new THREE.MeshToonMaterial();
    mat.name = material;
    const m = new THREE.SkinnedMesh(g, mat);
    m.name = name;
    m.bind(skeleton, new THREE.Matrix4());
    scene.add(m);
    return m;
  };
  const body = mesh('Body', 'N00_000_00_Body_00_SKIN', new THREE.BoxGeometry(0.3, height * 0.8, 0.2, 2, 12, 2), 1, height * 0.5);
  const parts = {
    body,
    face: mesh('Face', 'N00_000_00_Face_00_SKIN', new THREE.SphereGeometry(0.11 * height, 12, 8), 3, height * 0.9),
    iris: mesh('Iris', 'N00_000_00_EyeIris_00_EYE', new THREE.BoxGeometry(0.1, 0.02, 0.01), 3, height * 0.91),
    hair: mesh('Hair001', 'N00_000_Hair_00_HAIR', new THREE.SphereGeometry(0.13 * height, 8, 6), 3, height * 0.93),
    top: mesh('Top', 'N00_005_01_Tops_01_CLOTH', new THREE.BoxGeometry(0.34, 0.4, 0.24), 1, height * 0.65),
    shoes: mesh('Shoe', 'N00_002_01_Shoes_01_CLOTH', new THREE.BoxGeometry(0.1, 0.06, 0.2), 6, 0.03),
    gone: mesh('OldTop', 'N00_009_01_Tops_01_CLOTH', new THREE.BoxGeometry(0.2, 0.2, 0.2), 1, height * 0.6),
  };
  parts.gone.visible = false;
  body.geometry.userData.wholeBody = body.geometry.index!.array;
  const humanoid = {
    getRawBoneNode: (n: string) => bones[names.indexOf(n)] ?? null,
    normalizedRestPose: { hips: { position: [0, ys.hips * height, 0] } },
  };
  return { vrm: { scene, humanoid, meta: { metaVersion: '1' } } as unknown as VRM, parts, height };
}

function snapshot(o: THREE.Object3D) {
  const out: Array<[string, boolean, unknown, unknown]> = [];
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh && c.parent?.name !== 'cleanSuit') out.push([c.uuid, c.visible, m.material, m.geometry]);
  });
  return out;
}

describe('the cleanroom suit', () => {
  for (const h of [1.5, 0.9]) {
    it(`on a body ${h} tall: only the suit and the face show, the suit on the same bones, and off it all comes back as it was`, () => {
      const { vrm, parts } = fakeVrm(h);
      const before = snapshot(vrm.scene);
      const suit = vrmSuit(vrm);
      expect(snapshot(vrm.scene)).toEqual(before);
      const group = vrm.scene.getObjectByName('cleanSuit')!;
      expect(group.visible).toBe(false);
      suit.show(true);
      expect(group.visible).toBe(true);
      for (const hiddenPart of [parts.body, parts.hair, parts.top, parts.shoes, parts.gone]) expect(hiddenPart.visible).toBe(false);
      expect(parts.face.visible).toBe(true);
      expect(parts.iris.visible).toBe(true);
      const worn: THREE.SkinnedMesh[] = [];
      group.traverse((c) => ((c as THREE.SkinnedMesh).isSkinnedMesh ? worn.push(c as THREE.SkinnedMesh) : undefined));
      expect(worn.length).toBeGreaterThan(3);
      const bodyBones = new Set<THREE.Object3D>(parts.body.skeleton.bones);
      for (const m of worn) for (const b of m.skeleton.bones) expect(bodyBones.has(b)).toBe(true);
      for (const m of worn) expect(Array.from(m.geometry.attributes.position.array as Float32Array).every(Number.isFinite)).toBe(true);
      suit.show(false);
      expect(snapshot(vrm.scene)).toEqual(before);
      expect(parts.gone.visible).toBe(false);
      // Again, the same.
      suit.show(true);
      suit.show(false);
      expect(snapshot(vrm.scene)).toEqual(before);
    });
  }

  it('the hood is open at the eyes and covers the mouth and the top of the head', () => {
    const { vrm, parts } = fakeVrm();
    vrmSuit(vrm);
    const eyes = new THREE.Box3().setFromBufferAttribute(parts.iris.geometry.attributes.position as THREE.BufferAttribute);
    const c = eyes.getCenter(new THREE.Vector3());
    let hood: THREE.SkinnedMesh | undefined;
    vrm.scene.getObjectByName('cleanSuit')!.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh && m.skeleton.bones.length === 3 && !hood) hood = m;
    });
    expect(hood).toBeTruthy();
    const ray = new THREE.Raycaster();
    const g = hood!.geometry;
    const plain = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    plain.updateMatrixWorld(true);
    const hits = (y: number) => {
      ray.set(new THREE.Vector3(0, y, 1), new THREE.Vector3(0, 0, -1));
      return ray.intersectObject(plain).filter((h) => h.point.z > 0).length;
    };
    expect(hits(c.y)).toBe(0);
    expect(hits(c.y - 0.1)).toBeGreaterThan(0);
    expect(hits(c.y + 0.11)).toBeGreaterThan(0);
  });

  it('on the drawn figure: white, gloved, the hair away; off, every material and part as it was', () => {
    const root = new THREE.Group();
    const head = new THREE.Group();
    root.add(head);
    const mat = (c: string) => new THREE.MeshToonMaterial({ color: c });
    const skinBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat('#f1c9a5'));
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat('#222222'));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#111111'));
    head.add(skinBall, hair, eye);
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), mat('#ff0000'));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat('#f1c9a5'));
    root.add(shirt, hand);
    const was = [skinBall, hair, eye, shirt, hand].map((m) => [m.material, m.visible]);
    const suit = figureSuit(root, head, [eye], '#f1c9a5');
    suit.show(true);
    expect((shirt.material as THREE.MeshToonMaterial).color.getHexString()).toBe('edf4fd');
    expect((hand.material as THREE.MeshToonMaterial).color.getHexString()).toBe('7f9fd8');
    expect(hair.visible).toBe(false);
    expect(eye.visible).toBe(true);
    expect(skinBall.visible).toBe(true);
    expect(head.getObjectByName('cleanHood')!.visible).toBe(true);
    suit.show(false);
    expect([skinBall, hair, eye, shirt, hand].map((m) => [m.material, m.visible])).toEqual(was);
    expect(head.getObjectByName('cleanHood')!.visible).toBe(false);
  });
});
