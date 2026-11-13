import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('toddlers (참고 게임 toddler stage)', () => {
  it('are fed and taught by grown-ups, even when busy playing', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '하늘', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      ],
      () => 0.5,
    );
    g.state.freeWill = false;
    const [a, t] = g.state.dwellers;
    t.age = 'toddler';
    t.bornAt = g.state.time;
    t.needs.hunger = 20;
    const sofa = g.state.objects.find((o) => g.objectMenu(t, o).some((m) => m.id === 'relax'))!;
    g.enqueue(t.id, { kind: 'interact', objectUid: sofa.uid, interactionId: 'relax', autonomous: false });
    run(g, 5);
    g.enqueue(a.id, { kind: 'social', targetId: t.id, socialId: 'feedToddler', autonomous: false });
    run(g, 25);
    expect(t.needs.hunger).toBeGreaterThan(60);
    g.enqueue(a.id, { kind: 'social', targetId: t.id, socialId: 'teachTalk', autonomous: false });
    run(g, 25);
    expect(t.skills.talk).toBeGreaterThan(0);
    expect(a.skills.talk).toBe(0);
  });

  it('sleep the night through in the crib, and a hungry toddler wakes the grown-ups', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '하늘', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      ],
      () => 0.5,
    );
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a, t] = g.state.dwellers;
    t.age = 'toddler';
    t.bornAt = g.state.time;
    g.state.time = Math.floor(g.state.time / 1440) * 1440 + 1440 * 3 + 21.5 * 60;
    g.state.money = 10000;
    let placed = false;
    for (let y = 2; y < 16 && !placed; y++) for (let x = 2; x < 24 && !placed; x++) placed = g.buy('toddlerBed', x, y, 'down');
    const crib = g.state.objects.find((o) => getDef(o.defId).interactions.some((i) => i.id === 'toddlerNap'))!;
    t.needs.energy = 40;
    t.needs.hunger = 100;
    g.enqueue(t.id, { kind: 'interact', objectUid: crib.uid, interactionId: 'toddlerNap', autonomous: false });
    run(g, 6 * 60); // 03:30: long past a two-hour nap, still asleep
    expect(g.performing(t)?.inter.id).toBe('toddlerNap');
    // Hungry and awake, the toddler cries and a sleeping grown-up gets up.
    const bed = g.state.objects.find((o) => g.isBed(o))!;
    g.enqueue(a.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'sleep', autonomous: false });
    run(g, 10);
    t.needs.hunger = 7; // wakes hungry
    g.rng = () => 0.01; // the crying is heard
    run(g, 60);
    expect(g.toasts.some((x) => x.text.includes('울어요'))).toBe(true);
    expect(a.buffs.some((b) => b.id === 'rudeAwakening')).toBe(true);
  });

  it('get a 참고 게임 toddler trait, eat from a high chair and practise on a potty chair', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '하늘', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      ],
      () => 0.3,
    );
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    g.state.money = 10000;
    const [a, t] = g.state.dwellers;
    t.age = 'toddler';
    t.bornAt = g.state.time;
    t.traits = ['tClingy'];
    t.parents = [a.id];
    const place = (id: string) => {
      for (let y = 2; y < 16; y++) for (let x = 2; x < 24; x++) if (g.buy(id, x, y, 'down')) return g.state.objects.find((o) => o.defId === id)!;
      throw new Error(id);
    };
    const chair = place('highChair');
    const potty = place('pottyChair');
    t.needs.hunger = 30;
    g.enqueue(a.id, { kind: 'interact', objectUid: chair.uid, interactionId: 'serveHighChair', autonomous: false });
    run(g, 20);
    expect(chair.served).toBe(true);
    g.enqueue(t.id, { kind: 'interact', objectUid: chair.uid, interactionId: 'eatHighChair', autonomous: false });
    for (let i = 0; i < 120 && chair.served; i++) run(g, 1);
    expect(t.needs.hunger).toBeGreaterThan(55);
    expect(chair.served).toBe(false);
    expect(g.objectMenu(t, potty).find((o) => o.id === 'usePotty')?.disabled ?? 'hidden').toBeTruthy();
    t.skills.potty = 1.5;
    g.enqueue(t.id, { kind: 'interact', objectUid: potty.uid, interactionId: 'usePotty', autonomous: false });
    run(g, 20);
    expect(t.skills.potty).toBeGreaterThan(1.5);
    // A clingy toddler misses their parent when they've been out a while (참고 게임: 450 minutes).
    a.away = { until: g.state.time + 600 };
    run(g, 470);
    expect(t.buffs.some((b) => b.id === 'wheresMamaDada')).toBe(true);
  });
});
