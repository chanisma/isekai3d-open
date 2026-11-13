import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { billAmount } from './economy';
import { computeRooms } from './gfx/house';
import { Game } from './game';
import { LOT_PLANS } from './lots';
import { routeFrom } from './path';
import { accessTiles, canPlace, idx } from './world';

const specs = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `심${i}`, shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }));

describe('the homes on offer (lots.ts)', () => {
  for (const plan of LOT_PLANS)
    it(`${plan.name}: furniture fits, every room and every thing can be reached from the front door`, () => {
      const g = Game.create(specs(4), () => 0.5, 'normal', plan.id);
      // Each object stands on proper floor and clear of the others.
      for (const o of g.state.objects) {
        const others = { ...g.state, dwellers: [], objects: g.state.objects.filter((x) => x.uid !== o.uid) };
        const fits = canPlace(others, g.tiles, o.defId, o.x, o.y, o.dir);
        expect(fits, `${o.defId} at ${o.x},${o.y} ${o.dir}`).toBe(true);
      }
      const door = g.doorstep;
      const map = routeFrom(g.blocked, door.x, door.y, undefined, g.stairLinks);
      for (const o of g.state.objects) {
        const def = getDef(o.defId);
        if (!def.interactions.length) continue;
        const ok = accessTiles(def, o.x, o.y, o.dir, 1).some((p) => map.dist[idx(p.x, p.y)] >= 0);
        expect(ok, `${o.defId} at ${o.x},${o.y} can be used`).toBe(true);
      }
      const rooms = computeRooms(g.tiles, g.walls);
      const seen = new Map<string, boolean>();
      rooms.forEach((r, i) => {
        if (r === 'outside' || g.tiles[i] === 'wall' || g.tiles[i] === 'door') return;
        seen.set(r, (seen.get(r) ?? false) || map.dist[i] >= 0);
      });
      for (const [r, reached] of seen) expect(reached, `room ${r}`).toBe(true);
      // Everyone starts on a free tile.
      for (const s of g.state.dwellers) expect(g.blocked[idx(s.x, s.y)], `${s.name} at ${s.x},${s.y}`).toBe(0);
      // Somewhere to sleep for at least two (but on bare land, where the household builds its own).
      const beds = g.state.objects.filter((o) => /bed/i.test(o.defId) && o.defId !== 'bedside').reduce((n, o) => n + (getDef(o.defId).seats ?? 1), 0);
      if (plan.shell) expect(beds).toBeGreaterThanOrEqual(2);
      expect(plan.price !== undefined || plan.rent !== undefined).toBe(true);
    });
});

describe('moving house (참고 게임 Move Household, For Rent)', () => {
  it('sells the owned home and moves into a rented studio, paying a deposit', () => {
    const g = Game.create(specs(2), () => 0.5);
    const money = g.state.money;
    // Furniture sold with the home (not taken along).
    const offer = g.homeOffer('studio', false, 'rent');
    expect(offer.ok).toBe(true);
    expect(offer.proceeds).toBeGreaterThan(8000);
    expect(offer.cost).toBe(220);
    expect(g.moveTo('studio', false, 'rent')).toBe(true);
    expect(g.state.money).toBe(money + offer.proceeds - 220);
    expect(g.state.lot).toMatchObject({ id: 'studio', rent: 220, deposit: 220 });
    expect(g.state.objects.every((o) => o.landlord)).toBe(true);
    // A renter can't touch the walls, and can't sell the landlord's sofa.
    expect(g.canBuild('wall', 12, 11)).toBe(false);
    expect(g.roomPlan(9, 10, 12, 13).ok).toBe(false);
    const sofa = g.state.objects.find((o) => o.defId === 'sofa')!;
    expect(g.sell(sofa.uid)).toBe(false);
    // The bill is the rent and the utilities, not property tax.
    expect(billAmount(g.state.objects, { power: 0, water: 0 }, { rent: 220 })).toBe(220);
    for (const s of g.household()) expect(g.blocked[idx(Math.round(s.x), Math.round(s.y))]).toBe(0);
  });

  it('needs the money to buy, and takes the deposit back when moving on', () => {
    const g = Game.create(specs(2), () => 0.5);
    expect(g.homeOffer('family').ok).toBe(false);
    expect(g.homeOffer('starter').ok).toBe(false);
    expect(g.moveTo('loft', true, 'rent')).toBe(true);
    g.state.money = 40000;
    const before = g.state.money;
    const offer = g.homeOffer('family');
    expect(offer.proceeds).toBe(550); // the deposit; the furniture was the landlord's
    expect(g.moveTo('family')).toBe(true);
    expect(g.state.money).toBe(before + 550 - 32000);
    expect(g.state.lot?.rent).toBeUndefined();
    expect(g.levels).toBe(2);
    expect(g.canBuild('floor', 3, 15 + 18)).toBe(false); // over the lawn
  });

  it('rents or buys any home, buys the one rented, and a new story starts owning the studio', () => {
    const start = Game.create(specs(1), () => 0.5, 'normal', 'studio');
    expect(start.state.lot).toMatchObject({ id: 'studio' });
    expect(start.state.lot?.rent).toBeUndefined();
    expect(start.state.objects.some((o) => o.landlord)).toBe(false);
    const g = Game.create(specs(2), () => 0.5);
    g.state.money = 60000;
    for (const id of ['studio', 'cottage', 'family', 'loft']) {
      expect(g.homeOffer(id, true, 'rent').ok).toBe(true);
      expect(g.homeOffer(id, true, 'own').ok).toBe(true);
    }
    expect(g.homeOffer('emptyLot', true, 'rent').ok).toBe(false);
    expect(g.moveTo('cottage', true, 'rent')).toBe(true);
    expect(g.state.lot?.rent).toBe(450);
    // Bought from the landlord: the deposit back, the price paid, nothing moved.
    const money = g.state.money;
    const objects = g.state.objects.length;
    const buy = g.homeOffer('cottage', true, 'own');
    expect(buy.ok).toBe(true);
    expect(buy.proceeds).toBe(450);
    expect(g.moveTo('cottage', true, 'own')).toBe(true);
    expect(g.state.money).toBe(money + 450 - 18000);
    expect(g.state.lot?.rent).toBeUndefined();
    expect(g.state.objects.length).toBe(objects);
    expect(g.state.objects.some((o) => o.landlord)).toBe(false);
    expect(g.homeOffer('cottage', true, 'own').ok).toBe(false);
  });
});

describe('furniture taken along on moving house (참고 게임 household inventory)', () => {
  it('packs the household furniture into storage, sets it down again free, and sells or stores from buy mode', () => {
    const g = Game.create(specs(2), () => 0.5);
    g.state.money = 50000;
    expect(g.buy('aquarium', 3, 16, 'down')).toBe(true);
    const mine = g.state.objects.filter((o) => !['mailbox', 'tree', 'bush'].includes(o.defId)).length;
    // Taken along, the furniture isn't paid for: the home alone is.
    const keep = g.homeOffer('cottage', true);
    const sell = g.homeOffer('cottage', false);
    expect(sell.proceeds).toBeGreaterThan(keep.proceeds);
    expect(keep.proceeds).toBeGreaterThanOrEqual(g.lotValue);
    expect(g.moveTo('cottage', true)).toBe(true);
    expect(g.storage.length).toBe(mine);
    expect(g.storage.some((o) => o.defId === 'aquarium')).toBe(true);
    // Set down again, free.
    const money = g.state.money;
    const tank = g.storage.find((o) => o.defId === 'aquarium')!;
    expect(g.placeStored(tank.uid, 5, 10, 'down')).toBe(true);
    expect(g.state.money).toBe(money);
    expect(g.state.objects.some((o) => o.uid === tank.uid && o.x === 5 && o.y === 10)).toBe(true);
    expect(g.storage.some((o) => o.uid === tank.uid)).toBe(false);
    // Put away again from the lot, and sold from storage.
    expect(g.store(tank.uid)).toBe(true);
    expect(g.state.objects.some((o) => o.uid === tank.uid)).toBe(false);
    expect(g.sellStored(tank.uid)).toBe(true);
    expect(g.state.money).toBeGreaterThan(money);
    // Kept in the save.
    const again = new Game(JSON.parse(JSON.stringify(g.state)));
    expect(again.storage.length).toBe(mine - 1);
  });

  it('sells the furniture with the home when not taken, and never packs the landlord\'s', () => {
    const g = Game.create(specs(2), () => 0.5);
    expect(g.moveTo('studio', false, 'rent')).toBe(true);
    expect(g.storage).toEqual([]);
    g.state.money = 40000;
    expect(g.moveTo('cottage', true)).toBe(true);
    expect(g.storage).toEqual([]);
  });
});
