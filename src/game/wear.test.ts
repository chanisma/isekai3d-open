import { describe, expect, it } from 'vitest';
import { repairTime } from './catalog';
import { Game } from './game';
import { rankOptions } from './autonomy';

function seeded(seed = 17) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('wear and repair', () => {
  it('wears appliances down with use until they break', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    const sink = g.state.objects.find((o) => o.defId === 'sink')!;
    for (let i = 0; i < 30 && !g.isBroken(sink); i++) {
      g.enqueue(dweller.id, { kind: 'interact', objectUid: sink.uid, interactionId: 'wash', autonomous: false });
      run(g, 20);
    }
    expect(g.isBroken(sink)).toBe(true);
    expect(g.toasts.some((t) => t.text.includes('고장 났어요'))).toBe(true);
  });

  it('a broken object cannot be used, sours its room and can be repaired', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    const fridge = g.state.objects.find((o) => o.defId === 'fridge')!;
    fridge.wear = 20;
    const menu = g.objectMenu(dweller, fridge);
    expect(menu.find((m) => m.id === 'snack')?.disabled).toBe('고장 났어요');
    expect(menu.find((m) => m.id === 'repair')?.disabled).toBeUndefined();
    g.enqueue(dweller.id, { kind: 'interact', objectUid: fridge.uid, interactionId: 'repair', autonomous: false });
    run(g, 20);
    // In the kitchen: broken fridge and stove (+5 each) plus a dish (+5) pass the 11 line.
    g.state.objects.find((o) => o.defId === 'stove')!.wear = 20;
    g.state.dishes = 1;
    expect(g.environmentOf(dweller)).toBe('env_bad_1');
    g.state.dishes = 0;
    g.state.objects.find((o) => o.defId === 'stove')!.wear = 100;
    run(g, 120); // 참고 게임 repair time at handiness 1
    expect(g.isBroken(fridge)).toBe(false);
    expect(fridge.wear).toBe(100);
  });

  it('free will gets round to repairs', () => {
    const g = newGame();
    g.state.freeWill = true;
    const tv = g.state.objects.find((o) => o.defId === 'tv')!;
    tv.wear = 10;
    for (const s of g.state.dwellers) s.skills.handiness = 10;
    // Whoever's shocked is hurt, and gets to the hospital before trying again (Game.injure); this is about free will.
    for (let left = 12 * 60; left > 0 && g.isBroken(tv); left -= 10) {
      for (const s of g.state.dwellers) if (s.injury) s.injury = undefined;
      run(g, 10);
    }
    expect(g.isBroken(tv)).toBe(false);
  });
});

describe('bed ownership', () => {
  it('a hungry dweller with the kitchen burnt out keeps at the repair, which keeps its progress', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    g.state.dwellers[1].away = { until: g.state.time + 9999, slot: 'job' } as never;
    for (const o of g.state.objects) if (o.defId === 'fridge' || o.defId === 'stove') o.wear = 0;
    dweller.needs.hunger = 8;
    // Fixing the fridge or the stove is the way to a meal: it's what free will offers for hunger.
    const offered = rankOptions(g, dweller);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((c) => c.action.kind === 'interact' && c.action.interactionId === 'repair')).toBe(true);
    // Repair time already spent stays on the object.
    const stove = g.state.objects.find((o) => o.defId === 'stove')!;
    const inter = g.interaction(stove, 'repair')!;
    stove.repairDone = 60;
    expect(g.durationOf(dweller, inter, stove)).toBe(repairTime(dweller.skills.handiness) - 60);
  });

  it('sleeping in a free bed claims it, and free will keeps others out', () => {
    const g = newGame();
    const [a, b] = g.state.dwellers;
    const [bed1] = g.state.objects.filter((o) => o.defId === 'bed');
    g.enqueue(a.id, { kind: 'interact', objectUid: bed1.uid, interactionId: 'nap', autonomous: false });
    run(g, 30);
    expect(a.bedUid).toBe(bed1.uid);
    expect(g.bedOwner(bed1.uid)).toBe(a);
    // b, exhausted, picks the other bed on its own.
    g.state.freeWill = true;
    a.away = { until: 1e9 };
    b.needs.energy = 5;
    run(g, 40);
    const cur = b.queue[0];
    expect(cur?.kind === 'interact' && cur.objectUid !== bed1.uid).toBe(true);
  });

  it('repairs faster with handiness, and electronics can shock a novice', () => {
    expect(repairTime(1)).toBe(120);
    expect(repairTime(10)).toBe(40);
    const g = newGame();
    const dweller = g.state.dwellers[0];
    const tv = g.state.objects.find((o) => o.defId === 'tv')!;
    tv.wear = 10;
    g.rng = () => 0; // the shock roll lands
    g.enqueue(dweller.id, { kind: 'interact', objectUid: tv.uid, interactionId: 'repair', autonomous: false });
    run(g, 80);
    expect(g.isBroken(tv)).toBe(true);
    expect(dweller.buffs.some((b) => b.id === 'ouch')).toBe(true);
    expect(dweller.skills.handiness).toBeGreaterThan(0);
  });
});
