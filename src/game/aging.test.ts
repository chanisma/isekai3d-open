import { describe, expect, it } from 'vitest';
import { LIFESPANS } from './babies';
import { Game } from './game';

function family(lifespan: 'normal' | 'off') {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    undefined,
    lifespan,
  );
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

describe('ageing', () => {
  it('turns an adult into an elder after the lifespan, then old age comes', () => {
    const g = family('normal');
    const [a, b] = g.state.dwellers;
    a.bornAt = g.state.time - LIFESPANS.normal.adult * 1440;
    g.step(0.5);
    expect(a.age).toBe('elder');
    expect(a.hair).toBe('#cfcfcf');
    g.setActive(a.id);
    a.bornAt = g.state.time - (LIFESPANS.normal.elder + 3) * 1440;
    g.step(0.5);
    // The Grim Reaper comes for them (참고 게임 death_OldAge), and takes them a little later.
    expect(a.dying?.cause).toBe('oldAge');
    for (let t = 0; t < 30; t += 0.5) g.step(0.5);
    expect(g.state.dwellers.includes(a)).toBe(false);
    expect(g.state.objects.some((o) => o.defId === 'urn')).toBe(true);
    expect(b.buffs.some((x) => x.id === 'griefFamily')).toBe(true);
    expect(g.state.activeDwellerId).toBe(b.id);
  });

  it('keeps grown-ups as they are with ageing off', () => {
    const g = family('off');
    const [a] = g.state.dwellers;
    a.bornAt = g.state.time - 500 * 1440;
    g.step(0.5);
    expect(a.age).toBeUndefined();
  });
});

describe('elders', () => {
  it('can still flirt with their partner', () => {
    const g = family('normal');
    const [a, b] = g.state.dwellers;
    a.age = 'elder';
    expect(g.socialMenu(a, b).some((o) => o.id === 'flirt')).toBe(true);
  });
});
