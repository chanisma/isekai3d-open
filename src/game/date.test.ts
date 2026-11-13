import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { newDate, openGoals, partyProgress } from './party';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('dates (참고 게임 situation_Date)', () => {
  it('opens chained goals one step at a time', () => {
    const d = newDate(1, 2, 0, () => 0);
    expect(openGoals(d).map((g) => g.kind)).toEqual(['dateSocials', 'dateDance', 'dateFlirt']);
    expect(partyProgress(d, 'dateKiss')).toBeNull(); // not yet: flirting first
    partyProgress(d, 'dateFlirt', 3);
    expect(openGoals(d).map((g) => g.kind)).toContain('dateKiss');
    expect(partyProgress(d, 'dateKiss')?.kind).toBe('dateKiss');
  });

  it('needs a spark, and ends with a verdict', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      ],
      () => 0.5,
    );
    const [a, b] = g.state.dwellers;
    g.state.time = Math.floor(g.state.time / 1440) * 1440 + 1440 + 14 * 60;
    expect(g.dateBlocker(a, b.id)).toBe('로맨스 10 이상 필요');
    g.relationship(a.id, b.id).romance = 30;
    g.askOnDate(a.id, b.id);
    expect(g.state.party?.kind).toBe('date');
    run(g, 370);
    expect(g.state.party).toBeUndefined();
    expect(g.toasts.some((t) => t.text.includes('데이트가 끝났어요'))).toBe(true);
  });
});
