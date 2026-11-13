import { describe, expect, it } from 'vitest';
import { Game } from './game';

describe('telescope (참고 게임 object_Telescope)', () => {
  it('stargazing waits for night; watching the neighbours works any time', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    expect([[3, 15], [6, 15], [16, 15]].some(([x, y]) => g.buy('telescope', x, y, 'down'))).toBe(true);
    const t = g.state.objects.find((o) => o.defId === 'telescope')!;
    const dweller = g.state.dwellers[0];
    g.state.time = Math.floor(g.state.time / 1440) * 1440 + 12 * 60;
    let menu = g.objectMenu(dweller, t);
    expect(menu.find((m) => m.id === 'stargaze')?.disabled).toContain('밤');
    expect(menu.find((m) => m.id === 'watchNeighbors')?.disabled).toBeUndefined();
    g.state.time += 10 * 60;
    menu = g.objectMenu(dweller, t);
    expect(menu.find((m) => m.id === 'stargaze')?.disabled).toBeUndefined();
  });
});
