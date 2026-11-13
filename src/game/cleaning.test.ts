import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('dirty fixtures (참고 게임 commodity_dirtiness)', () => {
  it('use soils a toilet until it is gross; cleaning brings it back', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.99);
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    const toilet = g.state.objects.find((o) => o.defId === 'toilet')!;
    const use = g.objectMenu(dweller, toilet).find((m) => m.id !== 'clean' && m.id !== 'repair' && !m.disabled)!;
    expect(g.objectMenu(dweller, toilet).find((m) => m.id === 'clean')).toBeUndefined();
    toilet.dirt = -45;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: toilet.uid, interactionId: use.id, autonomous: false });
    run(g, 30);
    expect(g.isDirty(toilet)).toBe(true);
    expect(g.environmentOf(dweller)).not.toBe('env_good_1');
    g.enqueue(dweller.id, { kind: 'interact', objectUid: toilet.uid, interactionId: use.id, autonomous: false });
    dweller.needs.bladder = 10;
    run(g, 30);
    expect(dweller.buffs.some((b) => b.id === 'grossPlumbing')).toBe(true);
    g.enqueue(dweller.id, { kind: 'interact', objectUid: toilet.uid, interactionId: 'clean', autonomous: false });
    run(g, 40);
    expect(toilet.dirt).toBe(100);
  });
});
