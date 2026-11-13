import { describe, expect, it } from 'vitest';
import { LABOR_LENGTH, PREGNANCY_LENGTH } from './babies';
import { Game } from './game';
import { SERVICES, nextOpening, serviceOpen } from './services';

function household(n = 1) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ].slice(0, n),
    () => 0.5,
  );
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  g.state.money = 5000;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

const day = (g: Game, hour: number) => (g.state.time = (Math.floor(g.state.time / 1440) + 1) * 1440 + hour * 60);

describe('hired help (참고 게임 ServiceNpcHireable)', () => {
  it('keeps 참고 게임 hours: the maid from 10 to 4, the repairman from 8 to 2 at night', () => {
    expect(serviceOpen(SERVICES.maid, 9 * 60)).toBe(false);
    expect(serviceOpen(SERVICES.maid, 11 * 60)).toBe(true);
    expect(serviceOpen(SERVICES.repair, 1 * 60)).toBe(true);
    expect(serviceOpen(SERVICES.repair, 5 * 60)).toBe(false);
    expect(nextOpening(SERVICES.maid, 2 * 1440 + 20 * 60)).toBe(3 * 1440 + 10 * 60);
  });

  it('the maid comes, washes up and cleans, then leaves with the hourly bill', () => {
    const g = household();
    day(g, 10);
    g.state.dishes = 3;
    const toilet = g.state.objects.find((o) => o.defId === 'toilet')!;
    toilet.dirt = -80;
    const money = g.state.money;
    g.hireService(g.state.dwellers[0].id, 'maid');
    expect(g.state.money).toBe(money - 40);
    run(g, 240);
    expect(g.state.dishes ?? 0).toBe(0);
    expect(g.isDirty(toilet)).toBe(false);
    expect(g.state.dwellers.some((s) => s.npc?.service === 'maid' && !s.npc.leaving)).toBe(false);
    expect(g.state.money).toBeLessThan(money - 40);
    expect(g.toasts.some((t) => t.text.includes('가정부') && t.text.includes('지불'))).toBe(true);
  });

  it('the repair technician fixes what is broken, without a shock', () => {
    const g = household();
    day(g, 9);
    const tv = g.state.objects.find((o) => o.defId === 'tv') ?? g.state.objects.find((o) => g.objectMenu(g.state.dwellers[0], o).some((m) => m.id === 'repair'));
    const broken = g.state.objects.find((o) => o.defId === 'shower')!;
    broken.wear = 10;
    expect(g.isBroken(broken)).toBe(true);
    g.hireService(g.state.dwellers[0].id, 'repair');
    run(g, 240);
    expect(g.isBroken(broken)).toBe(false);
    expect(tv === undefined || !g.toasts.some((t) => t.text.includes('감전'))).toBe(true);
  });

  it('the babysitter feeds a hungry baby and stays until sent home', () => {
    const g = household(2);
    const [a, b] = g.state.dwellers;
    b.pregnancy = { partnerId: a.id, since: g.state.time - PREGNANCY_LENGTH };
    run(g, LABOR_LENGTH + 2);
    const baby = g.state.dwellers.find((s) => s.age === 'baby')!;
    baby.needs.hunger = 20;
    g.hireService(a.id, 'nanny');
    run(g, 120);
    expect(baby.needs.hunger).toBeGreaterThan(50);
    const nanny = g.state.dwellers.find((s) => s.npc?.service === 'nanny')!;
    expect(nanny.npc!.leaving).toBeFalsy();
    g.dismissService(nanny.id);
    expect(nanny.npc!.leaving).toBe(true);
  });

  it('comes by herself when everyone goes out leaving the baby, and goes once they are back', () => {
    const g = household(2);
    const [a, b] = g.state.dwellers;
    b.pregnancy = { partnerId: a.id, since: g.state.time - PREGNANCY_LENGTH };
    run(g, LABOR_LENGTH + 2);
    const baby = g.state.dwellers.find((s) => s.age === 'baby')!;
    day(g, 10);
    const money = g.state.money;
    g.goOut(a.id, 'park');
    g.goOut(b.id, 'park');
    run(g, 60);
    const sitter = g.state.dwellers.find((s) => s.npc?.service === 'nanny');
    expect(sitter?.npc?.leaving).toBeFalsy();
    expect(g.state.money).toBeLessThan(money);
    baby.needs.hunger = 20;
    run(g, 60);
    expect(baby.needs.hunger).toBeGreaterThan(50);
    run(g, 600);
    expect(a.away || b.away).toBeFalsy();
    expect(g.state.dwellers.some((s) => s.npc?.service === 'nanny' && !s.npc.leaving)).toBe(false);
    expect(g.toasts.some((t) => t.text.includes('가족이 돌아왔어요'))).toBe(true);
  });
});
