import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function newGame() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
  g.state.freeWill = false;
  return g;
}

/** Fun gained and power used playing games for 30 minutes on a computer of the given model. */
function play(defId: string) {
  const g = newGame();
  const dweller = g.state.dwellers[0];
  const pc = g.state.objects.find((o) => o.defId === 'computer')!;
  pc.defId = defId;
  dweller.needs.fun = 10;
  const power = g.economy.usage.power;
  g.enqueue(dweller.id, { kind: 'interact', objectUid: pc.uid, interactionId: 'game', autonomous: false });
  run(g, 30);
  return { fun: dweller.needs.fun - 10, power: g.economy.usage.power - power };
}

describe('quality tiers (참고 게임 autonomy_modifiers)', () => {
  it('a high-end computer is more fun and draws less power', () => {
    const basic = play('computer');
    const high = play('gamingComputer');
    expect(high.fun).toBeGreaterThan(basic.fun * 1.6);
    expect(high.power).toBeLessThan(basic.power * 0.6);
  });

  it('watching from the sofa follows the quality of the TV', () => {
    const g = newGame();
    const sofa = g.state.objects.find((o) => g.objectMenu(g.state.dwellers[0], o).some((m) => m.id === 'watchTv'))!;
    const watch = g.objectMenu(g.state.dwellers[0], sofa).find((m) => m.id === 'watchTv')!;
    const inter = g.interaction(sofa, watch.id)!;
    expect(g.funMultiplier(sofa, inter)).toBe(1);
    g.state.objects.find((o) => o.defId === 'tv')!.defId = 'bigTv';
    expect(g.funMultiplier(sofa, inter)).toBe(2.24);
  });
});
