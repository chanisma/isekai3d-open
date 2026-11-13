import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { restQuality } from './sleep';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function home() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  const dweller = g.state.dwellers[0];
  const bed = g.state.objects.find((o) => o.defId === 'bed')!;
  return { g, dweller, bed };
}

/** A night in bed from low energy, with the needs given; what energy and moodlets it ends with. */
function night(needs: Partial<typeof Game.prototype.state.dwellers[0]['needs']>) {
  const { g, dweller, bed } = home();
  Object.assign(dweller.needs, { energy: 10, bladder: 100, ...needs });
  g.enqueue(dweller.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'sleep', autonomous: false });
  run(g, 360);
  return { energy: dweller.needs.energy, buffs: () => dweller.buffs.map((b) => b.id), g, dweller };
}

describe('hard times', () => {
  it('hungry, dirty or ill, a dweller sleeps fitfully and gets back less energy', () => {
    expect(restQuality({ hunger: 80, hygiene: 80, bladder: 80, energy: 0, fun: 50, social: 50 }, false)).toBe(1);
    const poor = restQuality({ hunger: 10, hygiene: 0, bladder: 80, energy: 0, fun: 50, social: 50 }, false);
    expect(poor).toBeLessThan(0.6);
    expect(restQuality({ hunger: 10, hygiene: 0, bladder: 10, energy: 0, fun: 50, social: 50 }, true)).toBeGreaterThanOrEqual(0.4);
    const good = night({ hunger: 90, hygiene: 90 });
    const bad = night({ hunger: 14, hygiene: 0 });
    expect(bad.energy).toBeLessThan(good.energy - 15);
  });

  it('a restless night leaves no well-rested morning', () => {
    const { g, dweller, bed } = home();
    Object.assign(dweller.needs, { energy: 60, bladder: 100, hunger: 14, hygiene: 0 });
    g.enqueue(dweller.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'nap', autonomous: false });
    run(g, 240);
    expect(dweller.buffs.some((b) => b.id === 'restlessNight')).toBe(true);
    expect(dweller.buffs.some((b) => b.id === 'wellRested')).toBe(false);
  });

  it('power or water cut off, or nothing to eat and no money, weighs on the household', () => {
    const { g, dweller } = home();
    g.economy.bill = { amount: 300, issuedAt: g.state.time, warned: true, cut: ['power', 'water'] };
    run(g, 1);
    expect(dweller.buffs.map((b) => b.id)).toEqual(expect.arrayContaining(['powerCut', 'waterCut']));
    g.economy.bill = null;
    g.state.money = 0;
    dweller.needs.hunger = 30;
    run(g, 1);
    const ids = dweller.buffs.map((b) => b.id);
    expect(ids).not.toContain('powerCut');
    expect(ids).toContain('nothingToEat');
  });

  it('left filthy and starving a dweller can fall ill, and gets better sooner fed, washed and asleep', () => {
    const { g, dweller, bed } = home();
    g.rng = () => 0;
    Object.assign(dweller.needs, { hygiene: 0, hunger: 10 });
    run(g, 1);
    const sick = dweller.buffs.find((b) => b.id === 'sick')!;
    expect(sick).toBeDefined();
    const until = sick.until!;
    Object.assign(dweller.needs, { hygiene: 90, hunger: 90, energy: 20, bladder: 100 });
    g.enqueue(dweller.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'sleep', autonomous: false });
    run(g, 120);
    expect(sick.until!).toBeLessThan(until - 120);
  });
});
