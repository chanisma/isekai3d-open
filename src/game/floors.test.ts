import { describe, expect, it } from 'vitest';
import { roomAt } from './gfx/house';
import { Game } from './game';
import { edgeKey } from './walls';
import { LEVEL_TILES, MAP_H, idx } from './world';

const fresh = () => {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
  g.state.money = 50000;
  return g;
};
const up = (y: number) => y + MAP_H;

describe('a floor above (참고 게임 floors and stairs)', () => {
  it('gives a home a second floor of open air, and older saves too', () => {
    const g = fresh();
    expect(g.levels).toBe(2);
    expect(g.tiles.length).toBe(LEVEL_TILES * 2);
    expect(g.tiles[idx(10, up(10))]).toBe('void');
    const old = JSON.parse(JSON.stringify(g.state));
    old.tiles = old.tiles.slice(0, LEVEL_TILES);
    expect(new Game(old).levels).toBe(2);
  });

  it('builds upstairs only where the floor below holds it up', () => {
    const g = fresh();
    // Over the bedroom: fine. Over the lawn: not.
    expect(g.canBuild('floor', 5, up(4))).toBe(true);
    expect(g.canBuild('floor', 5, up(16))).toBe(false);
    expect(g.roomPlan(2, up(9), 9, up(13)).ok).toBe(true);
    expect(g.roomPlan(2, up(12), 9, up(17)).ok).toBe(false);
    expect(g.buildRoom(2, up(9), 9, up(13))).toBe(true);
    expect(g.tiles[idx(5, up(11))]).toBe('wood');
    expect(g.walls[edgeKey(2, up(9), 'w')!]).toBe('wall');
    expect(roomAt(5, up(11))).not.toBe('outside');
    // Taken up again, upstairs floor goes back to open air, not lawn.
    expect(g.buildAt('remove', 5, up(11))).toBe(true);
    expect(g.tiles[idx(5, up(11))]).toBe('void');
  });

  it('climbs the stairs to use something upstairs', () => {
    const g = fresh();
    expect(g.buildRoom(2, up(9), 9, up(13))).toBe(true);
    expect(g.buildEdge('door', 9, up(11), 'e')).toBe(true);
    // Stairs along the living room under the new room upstairs: foot at (4,11), coming out at (7,11) upstairs.
    g.state.objects = g.state.objects.filter((o) => !(o.x >= 3 && o.x <= 8 && o.y >= 9 && o.y <= 13));
    expect(g.canPlace('stairs', 4, 11, 'left')).toBe(true);
    expect(g.buy('stairs', 4, 11, 'left')).toBe(true);
    // An armchair upstairs to go and sit in.
    expect(g.buy('armchair', 7, up(10), 'down')).toBe(true);
    const dweller = g.state.dwellers[0];
    Object.assign(dweller, { x: 12, y: 11 });
    const chair = g.state.objects.find((o) => o.defId === 'armchair' && o.y >= MAP_H)!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: chair.uid, interactionId: 'relax', autonomous: false });
    for (let i = 0; i < 400 && Math.round(dweller.y) < MAP_H; i++) g.update(0.5);
    expect(Math.round(dweller.y)).toBeGreaterThanOrEqual(MAP_H);
    expect(Math.abs(dweller.x - 7)).toBeLessThan(3);
  });

  it('lets stairs go only where there is a floor above and room at the foot', () => {
    const g = fresh();
    // On the floor above there is no floor above that.
    expect(g.buildRoom(2, up(9), 9, up(13))).toBe(true);
    expect(g.canPlace('stairs', 5, up(10), 'down')).toBe(false);
  });
});
