import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { getDef } from '../../game/catalog';
import type { Built, Spot } from '../parts';
import { buildFurniture } from '../furniture3d';
import { BK, CH, HF_MOTIONS, PAINT_N, PT, chessNow, hfNow, paintBeat, paintPlan, scopeAim, scopeEye, type HfMotion } from './hobbyMotion';

const IDS = ['telescope', 'chessTable', 'mirror', 'clothesCabinet', 'treadmill', 'easel', 'violin', 'guitar', 'camera', 'planter', 'bookshelf'];
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
/** A part by name, not the piece itself (its root has the piece's id for a name). */
const named = (o: THREE.Object3D, name: string) => {
  let found: THREE.Object3D | undefined;
  for (const c of o.children) found ??= c.name === name ? c : c.getObjectByName(name);
  return found!;
};
/** Says a spot's being used, as its pose does each frame. */
const pose = (s: Spot, t: number, began: number, H = 1.6) => {
  s.at.userData.hfBegan = began;
  s.at.userData.hfLast = t;
  s.at.userData.height = H;
};
const motions = [...HF_MOTIONS].filter((m) => m !== 'hfChess') as Array<Exclude<HfMotion, 'hfChess'>>;

describe('the hobbies', () => {
  test('every piece stays within its footprint, near enough, and keeps its triangles moderate', () => {
    for (const id of IDS) {
      const def = getDef(id);
      const b = build(id, id === 'mirror');
      const box = new THREE.Box3();
      for (const c of b.root.children) if (c !== b.inUse) box.expandByObject(c);
      expect(box.min.x, id).toBeGreaterThan(-def.w / 2 - 0.08);
      expect(box.max.x, id).toBeLessThan(def.w / 2 + 0.08);
      expect(box.min.z, id).toBeGreaterThan(-def.h / 2 - 0.08);
      expect(box.max.z, id).toBeLessThan(def.h / 2 + 0.14);
      expect(tris(b.root), id).toBeLessThan(22000);
    }
  });

  test('every stood-up interaction of each has its own place, with its own motion, and nothing else is taken over', () => {
    for (const id of ['telescope', 'mirror', 'clothesCabinet', 'easel', 'violin', 'guitar', 'camera', 'planter', 'bookshelf']) {
      const b = build(id);
      const ids = getDef(id).interactions.map((i) => i.id);
      // The catalog's own; what every piece gets from the game (repair, admire, upgrades) stays the family's.
      for (const k of Object.keys(b.spots!)) expect(ids, `${id}: ${k}`).toContain(k);
      for (const i of getDef(id).interactions) if (!/^(repair|admire|upgrade|clean)/.test(i.id)) expect(b.spots![i.id], `${id}: ${i.id}`).toBeDefined();
      expect(b.spots!['*'], id).toBeUndefined();
      expect(b.work, id).toBeDefined();
      for (const s of Object.values(b.spots!)) expect(HF_MOTIONS.has(s.motion as string), id).toBe(true);
    }
  });

  test('chess is sat at from each side, by side, for a game and for pondering', () => {
    const b = build('chessTable');
    expect(Object.keys(b.spots!).sort()).toEqual(['playChess:l', 'playChess:r', 'ponder:l', 'ponder:r']);
    expect(b.spots!['playChess:l'].at.position.x).toBeCloseTo(-CH.seat);
    expect(b.spots!['playChess:r'].at.position.x).toBeCloseTo(CH.seat);
    expect(getDef('chessTable').interactions.find((i) => i.id === 'playChess')!.players).toBe(2);
  });

  test('a game of chess moves its pieces; the board is the same set of men, and alone a try is taken back', () => {
    const b = build('chessTable');
    const l = b.spots!['playChess:l'];
    const r = b.spots!['playChess:r'];
    const men = () => {
      const out: THREE.Object3D[] = [];
      b.root.traverse((o) => o.name === 'chessPiece' && out.push(o));
      return out;
    };
    expect(men().length).toBe(32);
    const before = men().map((m) => m.position.clone());
    let held = 0;
    for (let t = 10; t < 80; t += 0.1) {
      pose(l, t, 10);
      pose(r, t, 10);
      b.away!(false, t);
      if (l.held || r.held) held++;
      for (const s of [l, r]) if (s.held) expect(s.held.tool.name).toBe('chessPiece');
    }
    expect(held).toBeGreaterThan(100);
    const moved = men().filter((m, i) => m.position.distanceTo(before[i]) > 0.01);
    expect(moved.length).toBeGreaterThan(8);
    for (const m of men()) for (const x of m.position.toArray()) expect(Number.isFinite(x)).toBe(true);
    for (const side of [-1, 1]) {
      const n = chessNow(side, null, 1.6, 3);
      for (const x of [...n.l, ...n.r]) expect(Number.isFinite(x)).toBe(true);
    }
  });

  test('the stools are tucked in until someone sits', () => {
    const b = build('chessTable');
    const stools: THREE.Object3D[] = [];
    b.root.traverse((o) => o.name === 'stool' && stools.push(o));
    expect(stools.length).toBe(2);
    expect(Math.abs(stools[0].position.x)).toBeCloseTo(CH.tuck);
    const l = b.spots!['ponder:l'];
    for (let t = 1; t < 5; t += 0.05) {
      pose(l, t, 1);
      b.away!(false, t);
    }
    expect(stools[0].position.x).toBeCloseTo(-CH.seat, 1);
    expect(stools[1].position.x).toBeCloseTo(CH.tuck, 1);
  });

  test('every beat of every motion is finite, for any size of dweller, all through and a long way on', () => {
    for (const m of motions) {
      for (const H of [1.1, 1.3, 1.6, 1.85]) {
        for (let u = 0; u <= 1; u += 0.013) {
          const n = hfNow(m, u, H, 1000 + u * 37, { glass: -0.1, book: BK.cookbook, picture: 5 });
          for (const p of [n.l, n.r, n.st, n.tool ?? [0, 0, 0], n.sub ?? [0, 0, 0], n.subAxis ?? [0, 1, 0]]) for (const x of p) expect(Number.isFinite(x), `${m} at ${u}`).toBe(true);
          for (const x of [n.turn, n.crouch, n.lean, n.nod]) expect(Number.isFinite(x), m).toBe(true);
          if (n.q) expect(Math.abs(n.q.length() - 1), m).toBeLessThan(1e-6);
          expect(n.crouch, m).toBeGreaterThanOrEqual(0);
          expect(n.crouch, m).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  test('a held tool stays within an arm of the shoulders on the hand it goes in, once it is off its rest', () => {
    const shoulderToHand = 0.76;
    for (const m of motions) {
      for (let u = 0.12; u <= 0.88; u += 0.01) {
        const n = hfNow(m, u, 1.6, u * 30, { glass: -0.1, book: BK.read });
        if (!n.hold || !n.tool || n.resting) continue;
        const d = Math.hypot(n.tool[0] - n.st[0], n.tool[1] - 1.3, n.tool[2] - n.st[1]);
        expect(d, `${m} at ${u.toFixed(2)}`).toBeLessThan(shoulderToHand);
      }
    }
  });

  test('the telescope tips and turns, and its eyepiece stays where a stooped eye comes to it', () => {
    const star = scopeAim('hfStar', 0.1);
    const spy = scopeAim('hfSpy', 0.1);
    expect(star.alt).toBeGreaterThan(0.6);
    expect(spy.alt).toBeLessThan(0.15);
    for (const a of [star, spy]) {
      const e = scopeEye(1.6, a.alt, a.az);
      expect(e[1]).toBeGreaterThan(1.15);
      expect(e[1]).toBeLessThan(1.5);
    }
    const b = build('telescope');
    const tube = named(b.root, 'tube');
    const s = b.spots!.watchNeighbors;
    for (let t = 1; t < 6; t += 0.05) {
      pose(s, t, 1);
      b.away!(false, t);
    }
    expect(tube.rotation.x).toBeLessThan(0.2);
    b.spots!.watchNeighbors.at.userData.hfLast = -100;
    for (let t = 20; t < 26; t += 0.05) b.away!(false, t);
    expect(tube.rotation.x).toBeGreaterThan(0.7);
  });

  test('the wardrobe swings its doors out, one each way, with clothes behind them and the styler left to the interaction', () => {
    const b = build('clothesCabinet');
    expect(b.doors!.map((d) => d.userData.swing).sort()).toEqual([-1, 1]);
    const inter = getDef('clothesCabinet').interactions.find((i) => i.id === 'changeClothes')!;
    expect(inter.special).toBe('restyle');
    expect(inter.restyle).toBe('clothes');
    const s = b.spots!.changeClothes;
    pose(s, 1.5, 0.3);
    b.away!(false, 1.5);
    expect(s.held?.tool.name).toBe('outfit');
  });

  test('the belt runs, the walker keeps their footing and the console has a screen for the power', () => {
    const b = build('treadmill');
    expect(b.animate).toBeDefined();
    expect(b.screen).toBeDefined();
    for (const t of [0, 1, 100, 1e6]) b.animate!(t);
  });

  test('a painting goes on stroke by stroke, the plan always there, the brush with the palette', () => {
    for (let i = -3; i < 9; i++) {
      const p = paintPlan(i);
      expect(p.length, `picture ${i}`).toBeGreaterThanOrEqual(PAINT_N);
      for (const st of p) for (const x of [st.x0, st.y0, st.x1, st.y1, st.w]) expect(Number.isFinite(x)).toBe(true);
    }
    expect(paintBeat(0).done).toBe(0);
    expect(paintBeat(0.5).done).toBeGreaterThan(20);
    expect(paintBeat(1).done).toBeLessThanOrEqual(PAINT_N);
    expect(paintBeat(1).finished).toBe(1);
    let last = 0;
    for (let u = 0; u <= 1; u += 0.001) {
      const d = paintBeat(u).done;
      expect(d).toBeGreaterThanOrEqual(last);
      last = d;
    }
    const b = build('easel');
    const s = b.spots!.paint;
    for (let t = 1; t < 50; t += 0.2) {
      pose(s, t, 1);
      b.away!(false, t);
    }
    pose(s, 20, 1);
    b.away!(false, 20);
    // The brush in the right hand; the palette on the left, not tied to it.
    expect(s.held?.tool.name).toBe('brush');
    expect(s.held?.grips.right?.shape).toBe('pen');
    expect(s.held?.grips.left).toBeUndefined();
    expect(s.held?.free?.left).toBeDefined();
    expect(named(b.root, 'palette').children.some((c) => c.name === 'brush')).toBe(false);
    // Wherever the brush goes on the canvas, it's within the right arm of where they stand.
    for (let u = 0.06; u < 0.93; u += 0.002) {
      const n = hfNow('hfPaint', u, 1.6, u * 45, { picture: 2 });
      expect(Math.hypot(n.tool![0] - (n.st[0] + 0.17), n.tool![1] - (1.3 - 0.37 * n.crouch), n.tool![2] - n.st[1]), `at ${u.toFixed(3)}`).toBeLessThan(0.52);
    }
  });

  test('the instruments lie where they\'re kept and are taken up in both hands', () => {
    for (const [id, inter, tool] of [['violin', 'playViolin', 'violin'], ['guitar', 'playGuitar', 'guitar']] as const) {
      const b = build(id);
      const s = b.spots![inter];
      const i0 = named(b.root, tool).position.clone();
      pose(s, 12, 1);
      b.away!(false, 12);
      expect(s.held?.tool.name).toBe(tool);
      expect(s.held?.grips.left).toBeDefined();
      expect(named(b.root, tool).position.distanceTo(i0)).toBeGreaterThan(0.2);
      // Let go of: back where it's kept.
      s.at.userData.hfLast = -100;
      b.away!(false, 40);
      expect(s.held).toBeNull();
      expect(named(b.root, tool).position.distanceTo(i0)).toBeLessThan(1e-6);
    }
  });

  test('the instruments are the sizes they should be, and the bow keeps within the right arm', () => {
    const size = (id: string, name: string) => {
      const t = named(build(id).root, name);
      t.position.set(0, 0, 0);
      t.quaternion.identity();
      t.updateWorldMatrix(true, true);
      const box3 = new THREE.Box3();
      for (const c of t.children) if (c.name !== 'bow' && c.type !== 'Group') box3.expandByObject(c);
      return box3.max.y - box3.min.y;
    };
    expect(size('violin', 'violin')).toBeGreaterThan(0.54);
    expect(size('violin', 'violin')).toBeLessThan(0.62);
    expect(size('guitar', 'guitar')).toBeGreaterThan(0.9);
    expect(size('guitar', 'guitar')).toBeLessThan(1.02);
    for (let t = 0; t < 30; t += 0.05) {
      const n = hfNow('hfViolin', 0.5, 1.6, t);
      const frog = new THREE.Vector3(...n.sub!).applyQuaternion(n.q!).add(new THREE.Vector3(...n.tool!));
      expect(Math.hypot(frog.x - (n.st[0] + 0.17), frog.y - 1.3, frog.z - n.st[1])).toBeLessThan(0.46);
    }
  });

  test('the camera comes off the tripod to the eye and back, its strap going with it', () => {
    const b = build('camera');
    const s = b.spots!.takePhoto;
    const c = named(b.root, 'camera');
    const home = c.position.clone();
    let top = 0;
    for (let t = 1; t < 21; t += 0.1) {
      pose(s, t, 1);
      b.away!(false, t);
      top = Math.max(top, c.position.y);
    }
    expect(top).toBeGreaterThan(1.35);
    s.at.userData.hfLast = -100;
    b.away!(false, 40);
    expect(c.position.distanceTo(home)).toBeLessThan(1e-6);
  });

  test('a planter is empty until it\'s sown, grows by stages, thirsts and weeds over', () => {
    const b = build('planter') as Built & { plant: NonNullable<Built['plant']> };
    const roots: THREE.Object3D[] = [];
    b.root.traverse((o) => o.name === 'plant' && roots.push(o));
    expect(roots.length).toBe(3);
    const visible = (o: THREE.Object3D) => {
      let v = true;
      for (let p: THREE.Object3D | null = o; p; p = p.parent) v = v && p.visible;
      return v;
    };
    const shown = (o: THREE.Object3D) => {
      let n = 0;
      o.traverse((c) => (c as THREE.Mesh).isMesh && visible(c) && n++);
      return n;
    };
    b.plant(undefined, 0);
    expect(visible(roots[0])).toBe(false);
    b.plant({ growth: 0.1, water: 80, weeds: 0 }, 1);
    const seedling = shown(roots[0]);
    b.plant({ growth: 0.5, water: 80, weeds: 0 }, 2);
    const leafy = shown(roots[0]);
    b.plant({ growth: 0.8, water: 80, weeds: 0 }, 3);
    const flower = shown(roots[0]);
    b.plant({ growth: 1, water: 80, weeds: 0 }, 4);
    const ripe = shown(roots[0]);
    expect(seedling).toBeGreaterThan(0);
    expect(leafy).toBeGreaterThan(seedling);
    expect(flower).toBeGreaterThan(leafy);
    expect(ripe).toBeGreaterThan(leafy);
    // Weeds show from 30, as the game's `weedy` does, and droop comes with thirst.
    const tufts: THREE.Object3D[] = [];
    b.root.traverse((o) => o.name === 'weedTuft' && tufts.push(o));
    b.plant({ growth: 0.5, water: 80, weeds: 0 }, 5);
    expect(tufts.some((t) => t.visible)).toBe(false);
    b.plant({ growth: 0.5, water: 10, weeds: 40 }, 6);
    expect(tufts.some((t) => t.visible)).toBe(true);
    expect(roots[0].rotation.x).toBeGreaterThan(0.05);
    expect(PT.plants.length).toBe(3);
  });

  test('a can, a packet, a weed and a fruit go through the hand at the planter, and the can pours only in its pour', () => {
    const b = build('planter');
    const map: Array<[string, number, string]> = [['waterPlant', 1.5, 'wateringCan'], ['plantSeeds', 3, 'seedPacket'], ['weedPlant', 0.9, 'pulledWeed'], ['harvest', 0.8, 'pickedFruit']];
    for (const [id, at, name] of map) {
      const s = b.spots![id];
      pose(s, 100 + at, 100);
      b.away!(false, 100 + at);
      expect(s.held?.tool.name, id).toBe(name);
      s.at.userData.hfLast = -100;
      b.away!(false, 200);
      expect(s.held, id).toBeNull();
    }
  });

  test('the book taken down is of the kind the interaction reads, and the gap it leaves goes with it', () => {
    const b = build('bookshelf');
    const ids = Object.keys(BK);
    expect(new Set(ids.map((i) => BK[i].kind)).size).toBe(ids.length);
    const tool = named(b.root, 'book');
    for (const id of ids) {
      const s = b.spots![id];
      expect(s.at.userData.book).toBe(BK[id]);
      expect(s.at.userData.hfSeconds).toBe(BK[id].seconds);
      const t = 500;
      pose(s, t, t - BK[id].seconds * 0.5);
      b.away!(false, t);
      expect(tool.visible, id).toBe(true);
      expect(s.held?.tool).toBe(tool);
      s.at.userData.hfLast = -100;
      b.away!(false, t + 100);
      expect(tool.visible, id).toBe(false);
    }
  });

  test('all of them run with nobody there, and from a long way on, without throwing', () => {
    for (const id of IDS) {
      for (const wall of [true, false]) {
        const b = build(id, wall);
        for (let t = 0; t < 40; t += 0.37) {
          b.away?.(false, t);
          b.animate?.(t);
          b.plant?.(undefined, t);
        }
        b.away?.(false, 1e6);
        b.animate?.(1e6);
        for (const s of Object.values(b.spots ?? {})) {
          pose(s, 1e6, 0);
          b.away?.(false, 1e6);
          s.at.userData.hfLast = -1;
          expect(() => b.away?.(false, 1e6 + 1)).not.toThrow();
        }
      }
    }
  });
});
