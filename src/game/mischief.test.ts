import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { SOCIAL_BY_ID, socialBlocker } from './socials';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('mischief (참고 게임 Mischief skill)', () => {
  it('pranks build the skill, cost a little friendship and unlock with skill', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      ],
      () => 0.5,
    );
    g.state.freeWill = false;
    const [a, b] = g.state.dwellers;
    const rel = g.relationship(a.id, b.id);
    rel.friend = 30;
    expect(socialBlocker(SOCIAL_BY_ID.pretendSlapped, rel, a)).toBe('장난 3레벨 필요');
    a.skills.mischief = 3;
    expect(socialBlocker(SOCIAL_BY_ID.pretendSlapped, rel, a)).toBeNull();
    a.skills.mischief = 0;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'fakeBadNews', autonomous: false });
    run(g, 20);
    expect(a.skills.mischief).toBeGreaterThan(0);
    expect(rel.friend).toBeLessThan(30);
  });
});
