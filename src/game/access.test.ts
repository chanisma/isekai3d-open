import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { Game } from './game';
import { accessOf, accessTiles } from './world';

const empty = () => {
  const g = Game.create([{ name: '하나', shirt: '#1e88e5', skin: '#eac09a', hair: '#5b3a1e' }], () => 0.5);
  g.state.objects = [];
  g.state.dwellers[0].x = 22;
  g.state.dwellers[0].y = 12;
  return g;
};

describe('where furniture is used from', () => {
  it('tells front, any side and two sides apart from the interactions', () => {
    expect(accessOf(getDef('fridge'))).toBe('front');
    expect(accessOf(getDef('diningChair'))).toBe('any');
    expect(accessOf(getDef('bed'))).toBe('any');
    expect(accessOf(getDef('toilet'))).toBe('any');
    expect(accessOf(getDef('chessTable'))).toBe('sides');
  });

  it('lets a chair tuck under a table and a bed stand against a wall', () => {
    const g = empty();
    expect(g.canPlace('diningTable', 18, 11, 'down')).toBe(true);
    g.state.objects.push({ uid: 900, defId: 'diningTable', x: 18, y: 11, dir: 'down' });
    // The chair faces the table: its front is taken, but it can be sat on from the side.
    expect(g.canPlace('diningChair', 18, 10, 'down')).toBe(true);
    // Bed and toilet with their front against the wall above the living room.
    expect(g.canPlace('bed', 3, 9, 'up')).toBe(true);
    expect(g.canPlace('toilet', 8, 9, 'up')).toBe(true);
  });

  it('still wants room in front of a fridge or a stove', () => {
    const g = empty();
    expect(g.canPlace('fridge', 3, 9, 'up')).toBe(false);
    expect(g.canPlace('fridge', 3, 9, 'down')).toBe(true);
  });

  it('sits dwellers on a tucked-in chair from the side', () => {
    const g = empty();
    g.state.objects.push({ uid: 900, defId: 'diningTable', x: 18, y: 11, dir: 'down' }, { uid: 901, defId: 'diningChair', x: 18, y: 10, dir: 'down' });
    (g as unknown as { invalidate(): void }).invalidate();
    const chair = g.state.objects[1];
    const spots = g.usableSpots(chair, getDef('diningChair').interactions[0]);
    expect(spots.length).toBeGreaterThan(0);
    expect(spots.every((p) => !(p.x === 18 && p.y === 11))).toBe(true);
    expect(accessTiles(getDef('chessTable'), 10, 10, 'down').map((p) => `${p.x},${p.y}`)).toEqual(['9,10', '11,10']);
  });
});
