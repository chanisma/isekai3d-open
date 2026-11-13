import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { venueOpen, VENUE_BY_ID } from './venues';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function at(g: Game, hour: number) {
  g.state.time = Math.floor(g.state.time / 1440) * 1440 + 1440 + hour * 60;
}

describe('outings (참고 게임 venues)', () => {
  it('a gym trip builds fitness and comes home pumped', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    at(g, 10);
    g.goOut(dweller.id, 'gym');
    expect(dweller.away?.outing).toBe('gym');
    run(g, 200);
    expect(dweller.away).toBeNull();
    expect(dweller.skills.fitness).toBeGreaterThan(0);
    expect(dweller.buffs.some((b) => b.id === 'pumpedUp')).toBe(true);
  });

  it('the salon: the hair picked before going, put on coming home', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', hairStyle: 'short' }], () => 0.5);
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    const money = g.state.money;
    at(g, 11);
    g.goOut(dweller.id, 'salon', { hairStyle: 'curly', hair: '#c2185b' });
    expect(g.state.money).toBe(money - VENUE_BY_ID.salon.cost!);
    expect(dweller.hairStyle).toBe('short');
    run(g, 200);
    expect(dweller.away).toBeNull();
    expect([dweller.hairStyle, dweller.hair]).toEqual(['curly', '#c2185b']);
    expect(dweller.buffs.some((b) => b.id === 'freshHair')).toBe(true);
  });

  it('keeps hours and age limits', () => {
    // Open past midnight: hours wrap into the next day.
    const late = { ...VENUE_BY_ID.park, hours: [17, 26] as [number, number] };
    expect(venueOpen(late, 23 * 60)).toBe(true);
    expect(venueOpen(late, 1 * 60)).toBe(true);
    expect(venueOpen(late, 12 * 60)).toBe(false);
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const dweller = g.state.dwellers[0];
    at(g, 3);
    expect(g.outingBlocker(dweller, 'library')).toContain('영업시간');
    at(g, 12);
    dweller.age = 'teen';
    expect(g.outingBlocker(dweller, 'drivingRange')).toBe('어른만 갈 수 있어요');
  });

  it('not when work would start before the dweller is back', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'culinary');
    // Monday 7:00, shift at 9:00.
    g.state.time = 7 * 1440 + 7 * 60;
    dweller.job!.lastWorkDay = -1;
    expect(g.outingBlocker(dweller, 'park')).toBe('곧 출근해야 해요');
  });
  it('the clothes shop: the clothes are paid for on the way and theirs when they come home', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const dweller = g.state.dwellers[0];
    const money = g.state.money;
    at(g, 11);
    const wear = { tops: 'male-adult-taeo', shoes: 'male-adult-junho' };
    g.goOut(dweller.id, 'clothesShop', { wear, outfit: 'jacket', closet: ['tops@male-adult-taeo', 'shoes@male-adult-junho'] }, 160);
    expect(g.state.money).toBe(money - 160);
    run(g, 200);
    expect(dweller.wear).toEqual(wear);
    expect(dweller.closet).toEqual(['tops@male-adult-taeo', 'shoes@male-adult-junho']);
    expect(dweller.buffs.some((b) => b.id === 'newClothes')).toBe(true);
    // Not with more than there is.
    at(g, 12);
    g.goOut(dweller.id, 'clothesShop', {}, g.state.money + 1);
    expect(dweller.away).toBeNull();
  });
});
