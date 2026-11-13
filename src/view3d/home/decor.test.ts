import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { getDef } from '../../game/catalog';
import { FLOOR_H } from '../house3d';
import { buildFurniture, kindOf } from '../furniture3d';
import { BUILDERS } from './decor';

const IDS = ['lamp', 'paintingLandscape', 'paintingAbstract', 'posterPop', 'paintingMaster', 'plant', 'tree', 'bush', 'smokeAlarm', 'burglarAlarm', 'mailbox', 'urn', 'stairs'];
const build = (id: string, againstWall = true) => buildFurniture(getDef(id), { againstWall });
const tris = (o: THREE.Object3D) => {
  let n = 0;
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh || m.userData.ink) return;
    const g = m.geometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return n;
};
const meshes = (o: THREE.Object3D) => {
  let n = 0;
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh && !c.userData.ink) n++;
  });
  return n;
};
/** A tree's every look (they come round in turn). */
const looks = (id: string, n = 3) => Array.from({ length: n }, () => build(id));

describe('the decor', () => {
  test('all are drawn here, and each is cheap', () => {
    for (const id of IDS) {
      expect(BUILDERS[id], id).toBeDefined();
      for (const wall of [true, false]) {
        for (const b of id === 'tree' || id === 'bush' || id === 'plant' ? looks(id).concat(build(id, wall)) : [build(id, wall)]) {
          const cap = id === 'stairs' || id === 'urn' ? 800 : 650;
          expect(tris(b.root), id).toBeLessThan(cap);
          // Mostly one or two merged meshes: a mesh is a draw call, and its outline another.
          expect(meshes(b.root), id).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  test('copies share their geometry and pictures instead of making new ones', () => {
    const mesh = (r: THREE.Object3D) => {
      const out: THREE.Mesh[] = [];
      r.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && !c.userData.ink) out.push(c as THREE.Mesh);
      });
      return out;
    };
    for (const id of ['paintingLandscape', 'paintingMaster', 'burglarAlarm', 'smokeAlarm']) {
      const [a, b] = [mesh(build(id).root), mesh(build(id).root)];
      expect(a.length, id).toBe(b.length);
      a.forEach((m, i) => {
        expect(m.geometry, id).toBe(b[i].geometry);
        expect(m.material, id).toBe(b[i].material);
      });
    }
  });

  test('stays near its footprint (a tree and a bush spread over theirs)', () => {
    for (const id of IDS) {
      if (id === 'tree' || id === 'bush') continue;
      const def = getDef(id);
      const b = build(id);
      const box = new THREE.Box3();
      for (const c of b.root.children) box.expandByObject(c);
      expect(box.min.x, id).toBeGreaterThan(-def.w / 2 - 0.02);
      expect(box.max.x, id).toBeLessThan(def.w / 2 + 0.02);
      expect(box.min.z, id).toBeGreaterThan(-def.h / 2 - 0.02);
      expect(box.max.z, id).toBeLessThan(def.h / 2 + 0.02);
    }
    for (const b of looks('tree')) expect(new THREE.Box3().setFromObject(b.root).max.y).toBeLessThan(3.4);
    for (const b of looks('bush')) expect(new THREE.Box3().setFromObject(b.root).max.y).toBeLessThan(0.8);
  });

  test('the lamp hands lot3d.ts a glow of its own to colour', () => {
    const [a, b] = [build('lamp'), build('lamp')];
    expect((a.glow!.material as THREE.MeshBasicMaterial).isMeshBasicMaterial).toBe(true);
    expect(a.glow!.material).not.toBe(b.glow!.material);
    expect(a.glow!.userData.ownMaterial).toBe(true);
  });

  test('paintings hang where they did, the picture in front of everything behind it, and stay looked at from the front', () => {
    expect(kindOf(getDef('paintingMaster'))).toBe('art');
    expect(kindOf(getDef('burglarAlarm'))).toBe('alarm');
    expect(kindOf(getDef('smokeAlarm'))).toBe('alarm');
    for (const id of ['paintingLandscape', 'paintingAbstract', 'posterPop', 'paintingMaster']) {
      const def = getDef(id);
      expect(def.interactions.map((i) => i.id), id).toContain('viewArt');
      const b = build(id);
      // Flat on the wall, facing out, the same height, with no spot of its own: the viewer's pose is the family's.
      expect(b.spots, id).toBeUndefined();
      expect(b.body.min.z, id).toBeLessThan(-def.h / 2 + 0.03);
      expect(b.body.max.z, id).toBeLessThan(-def.h / 2 + 0.2);
      expect((b.body.min.y + b.body.max.y) / 2, id).toBeGreaterThan(1.4);
      expect((b.body.min.y + b.body.max.y) / 2, id).toBeLessThan(1.75);
      let pic: THREE.Mesh | undefined;
      let frame: THREE.Mesh | undefined;
      b.root.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh || m.userData.ink) return;
        if ((m.geometry as THREE.PlaneGeometry).type === 'PlaneGeometry') pic = m;
        else if (m.geometry.boundingBox && m.geometry.boundingBox.getSize(new THREE.Vector3()).x > 0.5) frame = m;
      });
      expect(pic, id).toBeDefined();
      expect(frame, id).toBeDefined();
      // In front of the backing, not in front of the frame's face.
      const box = new THREE.Box3().setFromObject(frame!);
      expect(pic!.position.z, id).toBeLessThan(box.max.z);
      expect(pic!.position.z, id).toBeGreaterThan(box.min.z + 0.004);
    }
  });

  test('stairs climb in the same steps to the same height', () => {
    const def = getDef('stairs');
    const b = build('stairs', false);
    expect(kindOf(def)).toBe('stairs');
    expect(def.walkable).toBe(true);
    // The flight's top at the floor above.
    const steps = Math.round(FLOOR_H / 0.18);
    const pos: number[] = [];
    b.root.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!m.isMesh) return;
      const box = new THREE.Box3().setFromObject(m);
      // The solid's top, sampling at the landing.
      pos.push(box.max.y);
    });
    expect(Math.max(...pos)).toBeGreaterThan(FLOOR_H);
    expect(steps).toBe(17);
    // Each tread's top is its step's top: the vertices at the tread's level sit on a rise's multiple.
    const mesh = b.root.children[0] as THREE.Mesh;
    const p = mesh.geometry.attributes.position;
    const tops = new Set<number>();
    for (let i = 0; i < p.count; i++) {
      const [x, z] = [p.getX(i) + mesh.position.x, p.getZ(i) + mesh.position.z];
      if (Math.abs(x) < 0.47 && Math.abs(x) > 0.44 && z > -def.h / 2) tops.add(Math.round((p.getY(i) + mesh.position.y) * 1000));
    }
    for (let i = 1; i <= steps; i++) expect(tops.has(Math.round(((FLOOR_H / steps) * i) * 1000)), `step ${i}`).toBe(true);
  });

  test('the mailbox and the urn keep their uses, and show them', () => {
    expect(getDef('mailbox').interactions.map((i) => i.id)).toEqual(['payBills']);
    expect(getDef('urn').interactions.map((i) => i.id)).toEqual(['mourn']);
    const m = build('mailbox');
    expect(m.inUse).toBeDefined();
    expect(m.idle).toBeDefined();
    expect(m.work).toBeDefined();
    expect(m.body.max.y).toBeLessThan(1.3);
    const u = build('urn');
    expect(u.inUse).toBeDefined();
    expect(u.work).toBeDefined();
    expect(u.body.max.y).toBeGreaterThan(0.9);
  });
});
