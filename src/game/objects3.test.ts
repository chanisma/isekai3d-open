import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { Game } from './game';
import { WOODWORK, pickWoodwork, woodworkValue } from './woodwork';

function setup(defId: string) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  g.state.money = 20000;
  g.state.time = (Math.floor(g.state.time / 1440) + 1) * 1440 + 14 * 60;
  // Somewhere the dweller can reach: the nearest free spot that has a reachable use spot.
  const dweller = g.state.dwellers[0];
  const spots: Array<[number, number]> = [];
  for (let y = 1; y < 17; y++) for (let x = 1; x < 25; x++) spots.push([x, y]);
  spots.sort((a, b) => Math.hypot(a[0] - dweller.x, a[1] - dweller.y) - Math.hypot(b[0] - dweller.x, b[1] - dweller.y));
  for (const [x, y] of spots) {
    if (!g.buy(defId, x, y, 'down')) continue;
    const obj = g.state.objects.find((o) => o.defId === defId)!;
    const inter = g.objectMenu(dweller, obj)[0];
    if (inter && g.usableSpots(obj, getDef(defId).interactions[0]).length) return { g, dweller, obj };
    g.sell(obj.uid);
  }
  throw new Error('nowhere to put ' + defId);
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('pool, woodworking, microscope, grill and fireplace (참고 게임 objects)', () => {
  it('woodworking follows 참고 게임 recipes: unlocked by Handiness, outstanding work sells for double', () => {
    expect(WOODWORK.find((r) => r.name === '드래곤 조각품')).toMatchObject({ level: 3, price: 40 });
    expect(pickWoodwork(0, () => 0).name).toBe('칼 꽂이');
    const dragon = WOODWORK.find((r) => r.id === 'dragon')!;
    expect(woodworkValue(dragon, 40)).toBe(2 * woodworkValue(dragon, 0));
    const { g, dweller, obj } = setup('woodworkingTable');
    g.enqueue(dweller.id, { kind: 'interact', objectUid: obj.uid, interactionId: 'woodwork', autonomous: false });
    run(g, 75);
    // The piece goes to the household inventory, to be sold by the player.
    expect(g.state.inventory?.[0]?.name).toContain('칼 꽂이');
    const money = g.state.money;
    g.sellInventory();
    expect(g.state.money).toBeGreaterThan(money);
    expect(g.state.inventory).toEqual([]);
    expect(dweller.skills.handiness).toBeGreaterThan(0);
  });

  it('a swim is fun, trains Fitness and leaves a happy moodlet', () => {
    const { g, dweller, obj } = setup('pool');
    dweller.needs.fun = 30;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: obj.uid, interactionId: 'swim', autonomous: false });
    run(g, 60);
    expect(dweller.needs.fun).toBeGreaterThan(50);
    expect(dweller.skills.fitness).toBeGreaterThan(0);
    expect(dweller.buffs.some((b) => b.id === 'relaxingSwim')).toBe(true);
  });

  it('the microscope needs a sample, then turns up 현미경 사진', () => {
    const { g, dweller, obj } = setup('microscope');
    expect(g.objectMenu(dweller, obj).find((o) => o.id === 'analyze')?.disabled ?? 'hidden').toBeTruthy();
    g.state.samples = 1;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: obj.uid, interactionId: 'analyze', autonomous: false });
    run(g, 20);
    expect((g.state.collections?.microscopePrints ?? []).length).toBe(1);
  });

  it('the grill puts hot dogs on the table', () => {
    const { g, dweller, obj } = setup('grill');
    g.enqueue(dweller.id, { kind: 'interact', objectUid: obj.uid, interactionId: 'grillFamily', autonomous: false });
    run(g, 45);
    expect(g.servingsLeft()).toBeGreaterThanOrEqual(3);
  });

  it('a lit fireplace makes the room cozy', () => {
    const { g, dweller, obj } = setup('fireplace');
    g.enqueue(dweller.id, { kind: 'interact', objectUid: obj.uid, interactionId: 'lightFire', autonomous: false });
    run(g, 15);
    expect(obj.lit).toBe(true);
    g.rng = () => 0.01; // the cozy glow reaches the room
    run(g, 5);
    expect(g.state.dwellers.some((s) => s.buffs.some((b) => b.id === 'cozyFire'))).toBe(true);
    g.enqueue(dweller.id, { kind: 'interact', objectUid: obj.uid, interactionId: 'putOutFire', autonomous: false });
    run(g, 15);
    expect(obj.lit).toBe(false);
  });
});
