import { describe, expect, it } from 'vitest';
import { pressingNeeds, rankOptions } from './autonomy';
import { Game } from './game';
import type { Needs } from './types';

function seeded(seed = 3) {
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
  return g;
}

const full = (): Needs => ({ hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90 });

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('need pre-filter', () => {
  it('lets everything compete when nothing is pressing', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    dweller.needs = full();
    expect(pressingNeeds(dweller)).toBeNull();
  });

  it('focuses on the most urgent needs', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    dweller.needs = { ...full(), bladder: 10, fun: 30 };
    expect([...pressingNeeds(dweller)!]).toEqual(['bladder']);
    const options = rankOptions(g, dweller);
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => o.fills.includes('bladder'))).toBe(true);
  });
});

describe('reconsidering while busy', () => {
  it('drops a hobby to eat once hunger becomes pressing', () => {
    const g = newGame();
    const [dweller, other] = g.state.dwellers;
    other.away = { until: 1e9 }; // keep the other dweller out of the way
    dweller.needs = full();
    const shelf = g.state.objects.find((o) => o.defId === 'bookshelf')!;
    g.state.freeWill = true;
    // An autonomous read, then hunger drops below the pressing line (but above the 12% emergency).
    dweller.queue.push({ id: 999, kind: 'interact', objectUid: shelf.uid, interactionId: 'read', autonomous: true });
    run(g, 18); // walk to the bookshelf and start reading
    expect(g.performing(dweller)?.inter.id).toBe('read');
    dweller.needs.hunger = 16;
    run(g, 16);
    const cur = dweller.queue[0];
    const fixesHunger = cur?.kind === 'interact' && (g.interaction(g.object(cur.objectUid)!, cur.interactionId)?.effects.hunger ?? 0) > 0;
    expect(fixesHunger).toBe(true);
  });

  it("leaves player orders alone", () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    dweller.needs = full();
    const shelf = g.state.objects.find((o) => o.defId === 'bookshelf')!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: shelf.uid, interactionId: 'read', autonomous: false });
    run(g, 18);
    dweller.needs.hunger = 16;
    run(g, 16);
    expect(g.performing(dweller)?.inter.id).toBe('read');
  });
});

describe('failed objects', () => {
  it('skips an object for 15 minutes after it could not be reached', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    const fridge = g.state.objects.find((o) => o.defId === 'fridge')!;
    // Wall the dweller in so nothing is reachable.
    const blocked = g.blocked;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blocked[(dweller.y + dy) * 26 + (dweller.x + dx)] = 1;
    dweller.queue.push({ id: 998, kind: 'interact', objectUid: fridge.uid, interactionId: 'snack', autonomous: true });
    g.step(0.5);
    expect(dweller.avoid?.[fridge.uid]).toBeGreaterThan(g.state.time);
  });
});
