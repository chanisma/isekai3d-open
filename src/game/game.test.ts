import { describe, expect, it } from 'vitest';
import { adEffects, chooseAutonomous, efficiency, rankOptions, topChoices, urgency } from './autonomy';
import { Game } from './game';
import { pathTo, routeFrom } from './path';
import type { Dweller } from './types';
import { josa } from './util';
import { buildBlocked, buildTiles, frontTiles } from './world';
import { getDef } from './catalog';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame() {
  return Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
}

/** Advances game time by `minutes` in fixed steps. */
function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function setNeeds(dweller: Dweller, v: number) {
  for (const k of Object.keys(dweller.needs) as (keyof Dweller['needs'])[]) dweller.needs[k] = v;
}

describe('world & pathfinding', () => {
  it('routes from the living room into the bathroom through the door', () => {
    const tiles = buildTiles();
    const map = routeFrom(buildBlocked(tiles, []), 12, 11);
    const path = pathTo(map, 12, 4);
    expect(path).not.toBeNull();
    expect(path!.some((p) => p.x === 12 && p.y === 8)).toBe(true);
  });

  it('walks straight across open floor, not round the corners of the grid', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    for (const s of g.state.dwellers) s.queue = [];
    // Across the open living room, from one corner to the other.
    dweller.x = 3;
    dweller.y = 10;
    g.state.dwellers[1].x = 22;
    g.state.dwellers[1].y = 13;
    g.enqueue(dweller.id, { kind: 'goto', x: 12, y: 13, autonomous: false });
    const seen: Array<[number, number]> = [];
    for (let i = 0; i < 40 && dweller.queue.length; i++) {
      g.step(0.05);
      seen.push([dweller.x, dweller.y]);
    }
    // Part way there it's off the grid's lines both ways (going diagonally), and it gets there.
    expect(seen.some(([x, y]) => x % 1 > 0.1 && x % 1 < 0.9 && y % 1 > 0.1 && y % 1 < 0.9)).toBe(true);
    for (let i = 0; i < 200 && dweller.queue.length; i++) g.step(0.05);
    expect([dweller.x, dweller.y]).toEqual([12, 13]);
  });

  it('rejects placement across walls, on the path and on other objects', () => {
    const g = newGame();
    expect(g.canPlace('diningTable', 9, 5, 'down')).toBe(false); // across the bedroom's wall
    expect(g.canPlace('plant', 12, 14, 'down')).toBe(false); // the path at the front door
    expect(g.canPlace('plant', 8, 9, 'down')).toBe(false); // TV
    expect(g.canPlace('plant', 20, 12, 'down')).toBe(true);
  });
});

describe('routing costs', () => {
  it('detours around the tiles in front of a TV someone is watching', () => {
    const g = newGame();
    g.state.freeWill = false;
    const [walker, watcher] = g.state.dwellers;
    g.sell(g.state.objects.find((o) => o.defId === 'sofa')!.uid); // open a detour along the bottom row
    const tv = g.state.objects.find((o) => o.defId === 'tv')!;
    g.enqueue(watcher.id, { kind: 'interact', objectUid: tv.uid, interactionId: 'watch', autonomous: false });
    run(g, 10);
    expect(g.performing(watcher)?.inter.id).toBe('watch');

    walker.x = 5;
    walker.y = 11;
    const path = pathTo(g.routeFrom(walker), 12, 11)!;
    const inFrontOfTv = (p: { x: number; y: number }) => (p.x === 8 || p.x === 9) && p.y >= 10 && p.y <= 12;
    expect(path.some(inFrontOfTv)).toBe(false);

    // With nobody watching, the straight line is cheapest again.
    g.cancel(watcher.id, watcher.queue[0].id);
    expect(pathTo(g.routeFrom(walker), 12, 11)!.some(inFrontOfTv)).toBe(true);
  });
});

describe('autonomy', () => {
  it('heads for the toilet when bladder is nearly empty', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    setNeeds(dweller, 90);
    dweller.needs.bladder = 5;
    const a = chooseAutonomous(g, dweller);
    expect(a?.kind).toBe('interact');
    const obj = a && a.kind === 'interact' ? g.object(a.objectUid) : undefined;
    expect(obj?.defId).toBe('toilet');
  });

  it('ignores physical needs above 37.5% but always wants a little fun', () => {
    expect(urgency('hunger', 50)).toBe(0);
    expect(urgency('bladder', 20)).toBeGreaterThan(urgency('bladder', 30));
    expect(urgency('bladder', 5)).toBeGreaterThan(urgency('bladder', 20));
    expect(urgency('fun', 95)).toBeGreaterThan(0);
  });

  it('reports the free-will shortlist with odds that sum to 1', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    dweller.needs.hunger = 10;
    const top = topChoices(rankOptions(g, dweller));
    expect(top.length).toBeGreaterThan(0);
    expect(top.length).toBeLessThanOrEqual(5);
    expect(top.reduce((s, c) => s + c.chance, 0)).toBeCloseTo(1);
    const best = top[0].action;
    expect(best.kind === 'interact' && adEffects(g.interaction(g.object(best.objectUid)!, best.interactionId)!).hunger).toBeGreaterThan(0);
  });

  it('discounts short activities more than long ones for the same walk', () => {
    expect(efficiency(600, 16)).toBeGreaterThan(0.95); // sleep barely cares about the walk
    expect(efficiency(12, 16)).toBeLessThan(0.6); // a snack across the house is much less appealing
    expect(efficiency(12, 0)).toBe(1);
  });

  it('keeps a free-willed household alive for two days', () => {
    const g = newGame();
    run(g, 2 * 1440);
    for (const s of g.state.dwellers) {
      expect(s.needs.hunger).toBeGreaterThan(0);
      expect(s.needs.energy).toBeGreaterThan(0);
    }
  });

  it('gets through bill week on its own: bills paid, nobody goes hungry for long', () => {
    const g = newGame();
    let starving = 0;
    for (let t = 0; t < 10 * 1440; t += 0.5) {
      g.step(0.5);
      for (const s of g.household()) if (!s.away && s.needs.hunger <= 0) starving += 0.5;
    }
    expect(g.isCut('power')).toBe(false);
    expect(g.isCut('water')).toBe(false);
    expect(starving).toBeLessThan(120);
  });
});

describe('player actions', () => {
  it('eats a snack, paying for it and filling hunger', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    g.state.freeWill = false;
    dweller.needs.hunger = 30;
    const fridge = g.state.objects.find((o) => o.defId === 'fridge')!;
    const money = g.state.money;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: fridge.uid, interactionId: 'snack', autonomous: false });
    run(g, 40);
    expect(dweller.queue).toHaveLength(0);
    expect(dweller.needs.hunger).toBeGreaterThan(45);
    expect(g.state.money).toBe(money - 5);
  });

  it('chatting raises the relationship and social need of both dwellers', () => {
    const g = newGame();
    g.state.freeWill = false;
    const [a, b] = g.state.dwellers;
    a.needs.social = 20;
    b.needs.social = 20;
    const before = g.relationship(a.id, b.id).friend;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
    run(g, 40);
    expect(g.relationship(a.id, b.id).friend).toBeGreaterThan(before);
    expect(a.needs.social).toBeGreaterThan(40);
    expect(b.needs.social).toBeGreaterThan(40);
    expect(b.engagedWith).toBeNull();
  });

  it('walks up to a free side of the target, not onto another dweller', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
        { name: '지아', shirt: '#43a047', skin: '#c99a6e', hair: '#a0522d' },
      ],
      seeded(),
    );
    g.state.freeWill = false;
    const [a, b, c] = g.state.dwellers;
    Object.assign(a, { x: 5, y: 11 });
    Object.assign(b, { x: 12, y: 11 });
    Object.assign(c, { x: 11, y: 11 }); // already on b's nearest side
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
    g.step(0.5);
    const goal = a.run!.path.at(-1)!;
    expect(goal).not.toEqual({ x: 11, y: 11 });
    expect(Math.abs(goal.x - 12) + Math.abs(goal.y - 11)).toBe(1);
  });

  it('refuses a hug when the relationship is too low', () => {
    const g = newGame();
    g.state.freeWill = false;
    const [a, b] = g.state.dwellers;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'hug', autonomous: false });
    run(g, 30);
    expect(g.toasts.some((t) => t.text.includes('우정 35 이상 필요'))).toBe(true);
    expect(a.buffs.some((x) => x.id === 'warmHug')).toBe(false);
  });
});

describe('households', () => {
  it('gives a four-dweller household a reachable bed each and lets everyone settle into their own', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
        { name: '지우', shirt: '#43a047', skin: '#c99a6e', hair: '#a0522d' },
        { name: '하은', shirt: '#8e24aa', skin: '#8d5524', hair: '#111111' },
      ],
      seeded(7),
    );
    const beds = g.state.objects.filter((o) => o.defId === 'bed');
    expect(beds).toHaveLength(4);
    const route = routeFrom(buildBlocked(buildTiles(), g.state.objects), 11, 11);
    for (const bed of beds) {
      expect(frontTiles(getDef('bed'), bed.x, bed.y, bed.dir).some((f) => pathTo(route, f.x, f.y))).toBe(true);
    }
    run(g, 3 * 1440);
    const owned = g.state.dwellers.map((s) => s.bedUid).filter((u) => u !== undefined);
    expect(new Set(owned).size).toBe(owned.length);
    expect(owned.length).toBeGreaterThanOrEqual(3);
  });
});

describe('careers', () => {
  it('goes to work on the next weekday and comes back paid', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'culinary'); // Monday 08:00 → starts Tuesday 09:00–17:00
    const money = g.state.money;
    run(g, 1440 - 60); // Tuesday 07:00
    expect(dweller.away).toBeNull();
    run(g, 120); // carpool at 08:00
    expect(dweller.away).not.toBeNull();
    run(g, 9 * 60); // past 17:00
    expect(dweller.away).toBeNull();
    expect(g.state.money).toBeGreaterThanOrEqual(money + 60 - 50); // pay minus any autonomous spending
    expect(g.toasts.some((t) => t.text.includes('퇴근'))).toBe(true);
  });
});

describe('buy mode', () => {
  it('buys and sells objects with a 20% loss', () => {
    const g = newGame();
    const money = g.state.money;
    expect(g.buy('plant', 20, 12, 'down')).toBe(true);
    expect(g.state.money).toBe(money - 60);
    const plant = g.state.objects.at(-1)!;
    g.leaveBuyMode(); // full refund only while still in buy mode
    expect(g.sell(plant.uid)).toBe(true);
    expect(g.state.money).toBe(money - 60 + 48);
  });
});

describe("changing a dweller's look", () => {
  it('the edit window renames and restyles straight away; cleared fields are left out', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    g.restyle(dweller.id, { name: '  도윤이 ', face: 'jiho', eyes: '#2f6fae', outfit: 'shirt' });
    expect([dweller.name, dweller.face, dweller.eyes, dweller.outfit]).toEqual(['도윤이', 'jiho', '#2f6fae', 'shirt']);
    g.restyle(dweller.id, { name: '   ', face: '', eyes: '' });
    expect(dweller.name).toBe('도윤이');
    expect('face' in dweller || 'eyes' in dweller).toBe(false);
  });

  it('the wardrobe puts on the clothes picked, once the dweller gets there', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    const spots: Array<[number, number]> = [[20, 12], [18, 12], [20, 14], [16, 12], [22, 12], [18, 14]];
    expect(spots.some(([x, y]) => g.buy('clothesCabinet', x, y, 'down'))).toBe(true);
    g.leaveBuyMode();
    const cab = g.state.objects.at(-1)!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: cab.uid, interactionId: 'changeClothes', autonomous: false, look: { outfit: 'hoodie', shirt: '#43a047' } });
    expect(dweller.outfit).not.toBe('hoodie');
    run(g, 60);
    expect([dweller.outfit, dweller.shirt]).toEqual(['hoodie', '#43a047']);
    expect(dweller.buffs.some((b) => b.id === 'newLook')).toBe(true);
  });
});

describe('nobody stuck', () => {
  it('a dweller boxed in where they stand steps out to the nearest free tile', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    const bed = g.state.objects.find((o) => g.isBed(o))!;
    Object.assign(dweller, { x: bed.x, y: bed.y, queue: [], run: null });
    // Plants all round the bed, where there's room.
    for (let y = bed.y - 1; y <= bed.y + 3; y++) for (let x = bed.x - 1; x <= bed.x + 2; x++) if (g.canPlace('plant', x, y, 'down')) g.state.objects.push({ uid: g.state.nextUid++, defId: 'plant', x, y, dir: 'down' });
    (g as unknown as { invalidate(): void }).invalidate();
    g.step(0.5);
    const blocked = (g as unknown as { blocked: Uint8Array }).blocked;
    expect(blocked[(Math.round(dweller.y)) * 26 + Math.round(dweller.x)]).toBe(0);
  });

  it('a new bassinet is never put where it shuts a bed in', () => {
    const g = newGame();
    const [mum] = g.state.dwellers;
    const bed = g.state.objects.find((o) => g.isBed(o))!;
    Object.assign(mum, { x: bed.x, y: bed.y });
    const reach = () => {
      const p = g.routeFrom({ ...mum, x: g.exitTile.x, y: g.exitTile.y } as Dweller);
      return g.state.objects.filter((o) => g.isBed(o)).every((b) => [[b.x - 1, b.y], [b.x + 1, b.y], [b.x, b.y + 2], [b.x - 1, b.y + 1], [b.x + 1, b.y + 1]].some(([x, y]) => p.dist[y * 26 + x] >= 0));
    };
    expect(reach()).toBe(true);
    g.state.money = 5000;
    g.adopt(mum.id, 'baby');
    expect(g.state.objects.some((o) => o.defId === 'bassinet')).toBe(true);
    expect(reach()).toBe(true);
  });

  it("buy mode won't put something where it shuts another piece off from the door", () => {
    const g = newGame();
    g.state.money = 5000;
    const notes: string[] = [];
    const notify = g.notify.bind(g);
    g.notify = (text, kind, opts) => (notes.push(text), notify(text, kind, opts));
    // In front of the study desk in the starter house.
    expect(g.wayBlocker('treadmill', 18, 10, 'down')).toContain('공부 책상');
    expect(g.buy('treadmill', 18, 10, 'down')).toBe(false);
    expect(notes.at(-1)).toContain('갈 수 없게 돼요');
    expect(g.buy('treadmill', 20, 10, 'down')).toBe(true);
  });

  it('someone relaxing on the sofa can be talked to, staying sat', () => {
    const g = newGame();
    g.state.freeWill = false;
    const [a, b] = g.state.dwellers;
    const sofa = g.state.objects.find((o) => o.defId === 'sofa')!;
    g.enqueue(b.id, { kind: 'interact', objectUid: sofa.uid, interactionId: 'relax', autonomous: false });
    run(g, 20);
    expect(g.performing(b)?.inter.id).toBe('relax');
    Object.assign(a, { x: 3, y: 9 });
    const before = g.relationship(a.id, b.id).friend;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
    run(g, 8);
    expect(a.run?.phase).toBe('performing');
    expect(g.performing(b)?.inter.id).toBe('relax');
    run(g, 40);
    expect(g.relationship(a.id, b.id).friend).toBeGreaterThan(before);
  });
});

describe('josa', () => {
  it('picks particles by final consonant', () => {
    expect(josa('민준', '이/가')).toBe('민준이');
    expect(josa('서연', '은/는')).toBe('서연은');
    expect(josa('지아', '이/가')).toBe('지아가');
  });
});

describe('loading a save whose active dweller is gone', () => {
  it('makes another of the household the active one', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }, { name: '서연', shirt: '#e53935', skin: '#f8d9c0', hair: '#2b1b10' }]);
    const old = JSON.parse(JSON.stringify(g.state));
    old.dwellers = old.dwellers.filter((s: Dweller) => s.id !== old.activeDwellerId);
    const back = new Game(old);
    expect(back.state.dwellers.some((s) => s.id === back.state.activeDwellerId)).toBe(true);
  });
});
