import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { getDef } from '../../game/catalog';
import { motionOf, spotPose } from '../activity';
import { buildFurniture, kindOf, type Built } from '../furniture3d';
import { PROGRAMMES, SONGS, paintKaraoke, paintTv, type Painter } from './play';
import { BARS, FISH_N, POND, POOL, PG_MOTIONS, SWIMMER, hangFeet, pgAngleNow, pgBarsNow, pgFishAt, pgMove, pgSwimAt, rungX } from './playMotion';

const NEW = ['tv', 'bigTv', 'stereo', 'karaoke', 'aquarium', 'pond', 'monkeyBars', 'pool'];
const ALL = [...NEW, 'djBooth', 'toyBox'];
const build = (id: string) => {
  const b = buildFurniture(getDef(id), { againstWall: true });
  b.root.updateMatrixWorld(true);
  return b;
};
const named = (o: THREE.Object3D, name: string) => o.getObjectByName(name)!;
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
/** What lot3d.ts does to Built.screen. */
const setOn = (b: Built, on: boolean) => (b.screen!.material as THREE.MeshBasicMaterial).color.set(on ? '#d6f0ff' : '#2a3140');

/** A canvas as strict as a real one: a negative radius or a bad number throws. */
function strict(): Painter {
  const num = (...xs: unknown[]) => {
    for (const x of xs) if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`bad number ${String(x)}`);
  };
  return {
    save() {},
    restore() {},
    scale: num,
    fillRect: num,
    beginPath() {},
    arc(x: number, y: number, r: number, a: number, e: number) {
      num(x, y, r, a, e);
      if (r < 0) throw new Error('negative radius');
    },
    fill() {},
    stroke() {},
    moveTo: num,
    lineTo: num,
    rect: num,
    clip() {},
    closePath() {},
    fillText(s: string, x: number, y: number) {
      if (typeof s !== 'string' || s.includes('undefined')) throw new Error(`bad text ${s}`);
      num(x, y);
    },
    measureText: (s: string) => ({ width: s.length * 8 }) as TextMetrics,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'middle',
    globalAlpha: 1,
  } as unknown as Painter;
}

describe('play and media at home', () => {
  test('every new piece stays within its footprint, near enough, and keeps its triangles moderate', () => {
    for (const id of NEW) {
      const def = getDef(id);
      const b = build(id);
      const box = new THREE.Box3();
      for (const c of b.root.children) if (c !== b.inUse) box.expandByObject(c);
      expect(box.min.x, id).toBeGreaterThan(-def.w / 2 - 0.08);
      expect(box.max.x, id).toBeLessThan(def.w / 2 + 0.08);
      expect(box.min.z, id).toBeGreaterThan(-def.h / 2 - 0.08);
      expect(box.max.z, id).toBeLessThan(def.h / 2 + 0.14);
      expect(tris(b.root), id).toBeLessThan(26000);
    }
  });

  test('a big TV is plainly the better one, and both stay TVs', () => {
    expect(kindOf(getDef('tv'))).toBe('tv');
    expect(kindOf(getDef('bigTv'))).toBe('tv');
    const w = (id: string) => new THREE.Box3().setFromObject(named(build(id).root, 'picture')).getSize(new THREE.Vector3()).x;
    expect(w('bigTv')).toBeGreaterThan(w('tv') + 0.3);
    expect(build('bigTv').root.getObjectByName('halo')).toBeDefined();
    expect(build('tv').root.getObjectByName('halo')).toBeUndefined();
  });

  test('a TV lights only when lot3d.ts says it is on (sat on the sofa too)', () => {
    for (const id of ['tv', 'bigTv']) {
      const b = build(id);
      const pic = named(b.root, 'picture');
      setOn(b, false);
      b.away!(false, 5);
      expect(pic.visible).toBe(false);
      setOn(b, true);
      b.away!(false, 6);
      expect(pic.visible).toBe(true);
      setOn(b, false);
      b.away!(false, 7);
      expect(pic.visible).toBe(false);
    }
  });

  test('every interaction of every piece has its own place, and what a piece is fixed for goes where it always did', () => {
    const want: Record<string, string[]> = { tv: ['watch', 'tvWorkout'], bigTv: ['watch', 'tvWorkout'], stereo: ['listen', 'dance', 'dancePractice'], karaoke: ['singKaraoke'], aquarium: ['watchFish'], pond: ['fish'], monkeyBars: ['playBars', 'hangBars'] };
    for (const [id, inter] of Object.entries(want)) {
      const b = build(id);
      for (const i of inter) expect(getDef(id).interactions.some((x) => x.id === i), `${id} ${i}`).toBe(true);
      for (const i of inter) expect(PG_MOTIONS.has(b.spots![i].motion as string), `${id} ${i}`).toBe(true);
      expect(b.spots!['*'], id).toBeUndefined();
    }
    const swim = build('pool');
    for (const lane of [-1, 0, 1]) expect(swim.spots![`on:swim:${lane}`].motion).toBe('pgSwim');
    expect(swim.seatMotion).toEqual({ swim: 'pgTread' });
    expect(motionOf('swim', 'water', true)).toBe('lap');
  });

  test('the override pieces (the DJ booth, the toy box) are their workplaces and still work', () => {
    const dj = build('djBooth');
    expect(dj.spots!.mixTracks).toBeDefined();
    const box = build('toyBox');
    expect(box.spots!.playToys).toBeDefined();
    for (let t = 100; t < 140; t += 0.4) {
      dj.spots!.mixTracks.at.userData.posedAt = t;
      dj.animate?.(t);
      box.spots!.playToys.at.userData.posedAt = t;
      box.away?.(false, t);
    }
  });

  test('all of them run with nobody there, and from a long way on, without throwing', () => {
    for (const id of ALL) {
      const b = build(id);
      for (let t = 0; t < 40; t += 0.37) {
        b.seated?.([], false, t, []);
        b.away?.(false, t);
        b.animate?.(t);
      }
      b.away?.(false, 1e6);
    }
  });

  test('pictures painted every frame never throw, at any time, on any channel, even wound far on or back', () => {
    const c = strict();
    const times = [-3000, -1.7, 0, 0.01, 3.3, 10.999, 11, 66, 999.9, 1e5, 1e7];
    for (let i = 0; i < 400; i++) times.push(i * 0.37);
    for (const t of times) {
      for (const n of [-7, -1, 0, 1, 2, 3, 4, 5, 6, 13, 1e6]) {
        paintTv(c, 320, 180, n, false, t, 0.1, false);
        paintTv(c, 512, 288, n, false, t, 4, true);
      }
      paintTv(c, 320, 180, 0, true, t, 1, false);
      paintKaraoke(c, 320, 200, t);
    }
    expect(PROGRAMMES.length).toBeGreaterThan(4);
    for (const s of SONGS) expect(s.lines.length).toBe(SONGS[0].lines.length);
  });

  test('a stereo moves its cones and its needles only when it is on', () => {
    const b = build('stereo');
    const cone = named(b.root, 'cone');
    const needle = named(b.root, 'needle');
    const plat = named(b.root, 'platter');
    setOn(b, false);
    let t = 10;
    for (let i = 0; i < 80; i++) b.away!(false, (t += 0.05));
    const still = [cone.position.z, needle.rotation.z];
    b.away!(false, (t += 0.05));
    expect(cone.position.z).toBeCloseTo(still[0], 3);
    expect(needle.rotation.z).toBeCloseTo(still[1], 2);
    setOn(b, true);
    const seen = new Set<number>();
    const spun = plat.rotation.y;
    for (let i = 0; i < 80; i++) {
      b.away!(false, (t += 0.05));
      seen.add(Math.round(cone.position.z * 1e4));
    }
    expect(seen.size).toBeGreaterThan(8);
    expect(plat.rotation.y).not.toBe(spun);
  });

  test('karaoke: two mics go to the first two singers, a third claps, and the mics go back after', () => {
    const b = build('karaoke');
    const s = b.spots!.singKaraoke;
    const rest = named(b.root, 'mic1').position.clone();
    setOn(b, true);
    let t = 50;
    for (let i = 0; i < 30; i++) {
      t += 0.05;
      b.away!(false, t);
      for (const seed of [11, 22, 33]) {
        const hold = spotPose(s, 'sing', 1.6, t, seed).doing.reach!.hold;
        if (seed === 33) expect(hold ?? null).toBeNull();
        else {
          expect(hold!.tool.name).toBe(seed === 11 ? 'mic1' : 'mic2');
          const at = hold!.tool.position;
          expect(at.y).toBeGreaterThan(1.05);
          expect(at.y).toBeLessThan(1.5);
        }
      }
    }
    setOn(b, false);
    for (let i = 0; i < 30; i++) b.away!(false, (t += 0.1));
    expect(named(b.root, 'mic1').position.distanceTo(rest)).toBeLessThan(1e-6);
  });

  test('a TV remote goes in the first watcher\'s hand only, and the others stand clear', () => {
    const b = build('tv');
    const s = b.spots!.watch;
    const t = 9;
    const p1 = spotPose(s, 'still', 1.6, t, 1);
    const p2 = spotPose(s, 'still', 1.6, t, 2);
    expect(p1.doing.reach!.hold!.tool.name).toBe('remote');
    expect(p2.doing.reach!.hold ?? null).toBeNull();
    const at = (p: { pose: unknown }) => (p.pose as { at: THREE.Vector3 }).at;
    expect(at(p1).distanceTo(at(p2))).toBeGreaterThan(0.5);
  });

  test('the fish really swim, inside the glass', () => {
    const b = build('aquarium');
    const first = named(b.root, 'fish');
    b.away!(false, 1);
    const a = first.position.clone();
    b.away!(false, 3);
    expect(first.position.distanceTo(a)).toBeGreaterThan(0.02);
    for (let i = 0; i < FISH_N; i++)
      for (let t = 0; t < 200; t += 0.7) {
        const f = pgFishAt(i, t);
        expect(Math.abs(f.x), `fish ${i}`).toBeLessThan(0.84);
        expect(f.z).toBeLessThan(0.28);
        expect(f.y).toBeGreaterThan(0.7);
        expect(f.y).toBeLessThan(1.28);
      }
  });

  test('an angler holds the rod through a round: cast, the float on the water, a catch; the rod back after', () => {
    const b = build('pond');
    const s = b.spots!.fish;
    const R = named(b.root, 'rod');
    const rest = R.position.clone();
    const float = named(b.root, 'float');
    const caught = named(b.root, 'caught');
    let t = 100;
    let sawFloatLow = false;
    let sawCaught = false;
    let sawHeld = false;
    for (let i = 0; i < 520; i++) {
      t += 0.05;
      spotPose(s, 'tinker', 1.6, t, 1);
      b.away!(false, t);
      if (s.held && !s.held.resting) sawHeld = true;
      if (float.visible && Math.abs(float.position.y - POND.water) < 0.05) sawFloatLow = true;
      if (caught.visible) sawCaught = true;
      for (const x of R.position.toArray()) expect(Number.isFinite(x)).toBe(true);
    }
    expect(sawHeld).toBe(true);
    expect(sawFloatLow).toBe(true);
    expect(sawCaught).toBe(true);
    for (let i = 0; i < 40; i++) b.away!(false, (t += 0.1));
    expect(s.held).toBeNull();
    expect(R.position.distanceTo(rest)).toBeLessThan(1e-6);
    expect(float.visible).toBe(false);
  });

  test('every beat of angling is in reach and finite, whatever their size', () => {
    for (const H of [1.15, 1.6, 1.85]) {
      for (let u = 0; u < 1; u += 0.005) {
        const n = pgAngleNow(u, H, u * 24);
        const shoulder: [number, number, number] = [POND.stX + 0.17 * (H / 1.6), 0.82 * H, POND.st];
        const d = Math.hypot(n.grip[0] - shoulder[0], n.grip[1] - shoulder[1], n.grip[2] - shoulder[2]);
        if (u > 0.08) expect(d, `H ${H} at ${u.toFixed(3)}`).toBeLessThan(0.6 * (H / 1.6) + 0.12);
        for (const x of [...n.grip, ...n.dir]) expect(Number.isFinite(x)).toBe(true);
      }
    }
  });

  test('children really hang from the bars: feet off the ground, hands on the rungs, then down and back', () => {
    for (const H of [1.15, 1.25, 1.35]) {
      let hung = 0;
      for (let u = 0; u < 1; u += 0.004) {
        const n = pgBarsNow(u, H);
        if (n.hanging) {
          hung++;
          expect(n.y, `feet at ${u.toFixed(3)}`).toBeGreaterThanOrEqual(hangFeet(H) - 1e-6 - 0.2);
          expect(n.y).toBeGreaterThan(0.05);
          for (const h of [n.l!, n.r!]) expect(h[1]).toBeGreaterThan(BARS.y - 0.15);
          const shoulderY = n.y + 0.82 * H;
          for (const h of [n.l!, n.r!]) expect(Math.hypot(h[0] - n.x, h[1] - shoulderY), `reach ${H} at ${u.toFixed(3)}`).toBeLessThan(0.62 * H);
        }
        expect(Math.abs(n.x)).toBeLessThan(1);
      }
      expect(hung).toBeGreaterThan(100);
    }
    expect(pgBarsNow(0.09, 1.15).r![0]).toBeCloseTo(rungX(0), 1);
  });

  test('the bars sit up high enough and the perch sits on them', () => {
    const b = build('monkeyBars');
    const box = new THREE.Box3().setFromObject(b.root);
    expect(box.max.y).toBeGreaterThan(BARS.y);
    const s = b.spots!.hangBars;
    const p = spotPose(s, 'lap', 1.15, 3, 1);
    expect(p.pose.kind).toBe('sit');
    const seat = (p.pose as { at: THREE.Vector3 }).at;
    expect(seat.y).toBeCloseTo(BARS.y + 0.02, 2);
    const play = spotPose(b.spots!.playBars, 'tinker', 1.15, 0.3 * 20, 1);
    expect((play.pose as { at: THREE.Vector3 }).at.y).toBeGreaterThan(0.05);
  });

  test('a pool has moving water, and swimmers stay in it, face down at its level', () => {
    const b = build('pool');
    const water = named(b.root, 'water') as THREE.Mesh;
    const pos = water.geometry.attributes.position;
    b.away!(false, 2);
    const y = pos.getY(40);
    b.away!(false, 3);
    expect(pos.getY(40)).not.toBe(y);
    for (const lane of [-1, 0, 1]) {
      const s = b.spots![`on:swim:${lane}`];
      for (let t = 0; t < 60; t += 0.3) {
        // The whole body inside at every moment, crown to toes, a short swimmer or a tall one, and the reach stopped by the wall.
        for (const k of [0.85, 1, 1.1]) {
          const a = pgSwimAt(lane, t, k);
          const fx = Math.sin(a.heading);
          const fz = Math.cos(a.heading);
          const ahead = SWIMMER.ahead * k;
          const behind = (SWIMMER.behind - SWIMMER.tucked * a.tuck) * k;
          for (const [e, label] of [[ahead, 'crown'], [-behind, 'toes']] as Array<[number, string]>) {
            expect(Math.abs(a.x + fx * e), `${label} x ${lane} ${k} ${t}`).toBeLessThanOrEqual(POOL.x);
            expect(Math.abs(a.z + fz * e), `${label} z ${lane} ${k} ${t}`).toBeLessThanOrEqual(POOL.z);
          }
          // Going one way along a length, it heads along the pool; a stroke is never a teleport.
          const b = pgSwimAt(lane, t + 0.05, k);
          expect(Math.hypot(b.x - a.x, b.z - a.z), `speed ${lane} ${k} ${t}`).toBeLessThan(0.05);
        }
        const p = spotPose(s, 'lap', 1.6, t, lane + 5);
        expect(p.pose.kind).toBe('fly');
        const at = (p.pose as { at: THREE.Vector3 }).at;
        expect(Math.abs(at.y - POOL.mid)).toBeLessThan(0.05);
        for (const h of [p.doing.reach!.l!, p.doing.reach!.r!]) {
          expect(Number.isFinite(h.x + h.y + h.z)).toBe(true);
          const q = b.root.worldToLocal(h.clone());
          expect(Math.abs(q.x), `hand x ${t}`).toBeLessThanOrEqual(POOL.x);
          expect(Math.abs(q.z), `hand z ${t}`).toBeLessThanOrEqual(POOL.z);
        }
      }
    }
  });

  test('the teacher stays in reason on the clock the follower uses', () => {
    for (let t = -40; t < 80; t += 0.21) {
      const m = pgMove(t);
      for (const x of [...m.l, ...m.r, m.crouch, m.lean, m.side]) expect(Number.isFinite(x)).toBe(true);
      expect(m.crouch).toBeLessThanOrEqual(0.7);
    }
  });
});
