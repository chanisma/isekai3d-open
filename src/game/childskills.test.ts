import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function setup() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '하늘', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    () => 0.5,
  );
  g.state.freeWill = false;
  const [adult, kid] = g.state.dwellers;
  kid.age = 'child';
  return { g, adult, kid };
}

describe('child skills (참고 게임 statistic_Skill_Child_*)', () => {
  it('toys teach Creativity and grown-up skills turn into child ones', () => {
    const { g, kid } = setup();
    expect([[12, 11], [14, 12], [5, 12]].some(([x, y]) => g.buy('toyBox', x, y, 'down'))).toBe(true);
    const box = g.state.objects.find((o) => o.defId === 'toyBox')!;
    g.enqueue(kid.id, { kind: 'interact', objectUid: box.uid, interactionId: 'playToys', autonomous: false });
    run(g, 40);
    expect(kid.skills.creativity).toBeGreaterThan(0);
    // Chess teaches a child Mental, not Logic.
    expect(g.buy('chessTable', 9, 11, 'down')).toBe(true);
    const table = g.state.objects.find((o) => o.defId === 'chessTable')!;
    g.enqueue(kid.id, { kind: 'interact', objectUid: table.uid, interactionId: 'ponder', autonomous: false });
    run(g, 50);
    expect(kid.skills.mental).toBeGreaterThan(0);
    expect(kid.skills.logic).toBe(0);
  });

  it('monkey bars are for children and build Motor', () => {
    const { g, adult, kid } = setup();
    g.state.money = 5000;
    expect([[3, 15], [6, 15], [16, 15], [2, 17]].some(([x, y]) => g.buy('monkeyBars', x, y, 'down'))).toBe(true);
    const bars = g.state.objects.find((o) => o.defId === 'monkeyBars')!;
    expect(g.objectMenu(adult, bars).every((m) => m.disabled)).toBe(true);
    g.rng = () => 0.1;
    g.enqueue(kid.id, { kind: 'interact', objectUid: bars.uid, interactionId: 'playBars', autonomous: false });
    run(g, 60);
    expect(kid.skills.motor).toBeGreaterThan(0);
    expect(kid.buffs.some((b) => b.id === 'monkeyKing')).toBe(true);
  });

  it('a mastered child skill becomes a gift for life (참고 게임 *Gifted traits, x1.25)', () => {
    const { g, kid } = setup();
    kid.bornAt = g.state.time - 1e6;
    kid.skills.creativity = 10;
    g.step(0.5);
    expect(kid.age).toBe('teen');
    expect(kid.traits).toContain('creativelyGifted');
    expect(g.toasts.some((t) => t.text.includes('창의적 재능'))).toBe(true);
  });
});
