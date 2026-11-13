import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { newParty, partyMedal, partyProgress } from './party';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('house party (참고 게임 Situation_HouseParty)', () => {
  it('scores goals into medals', () => {
    const p = newParty(1, 0, () => 0);
    expect(p.goals.map((g) => g.kind)).toEqual(['hostSocials', 'dancing', 'jokes', 'eat']);
    for (let i = 0; i < 8; i++) partyProgress(p, 'hostSocials');
    expect(p.score).toBe(100);
    expect(partyMedal(p.score)?.id).toBe('bronze');
    partyProgress(p, 'jokes', 2);
    partyProgress(p, 'dancing');
    expect(partyMedal(p.score)?.id).toBe('silver');
    partyProgress(p, 'eat', 4);
    expect(partyMedal(p.score)?.id).toBe('gold');
  });

  it('brings the neighbours over and ends with a verdict', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const host = g.state.dwellers[0];
    g.state.time = Math.floor(g.state.time / 1440) * 1440 + 1440 + 14 * 60;
    const money = g.state.money;
    g.throwParty(host.id);
    expect(g.state.party).toBeDefined();
    expect(g.state.money).toBe(money - 100);
    run(g, 90);
    expect(g.state.dwellers.filter((s) => s.npc?.role === 'guest').length).toBeGreaterThan(0);
    run(g, 200);
    expect(g.state.party).toBeUndefined();
    expect(g.toasts.some((t) => t.text.includes('하우스 파티가 끝났어요'))).toBe(true);
  });
});
