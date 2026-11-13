import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('piano (참고 게임 Piano skill)', () => {
  it('practising builds the skill; a good player lifts the room', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      ],
      () => 0.5,
    );
    g.state.freeWill = false;
    expect([[11, 11], [12, 12], [5, 12]].some(([x, y]) => g.buy('piano', x, y, 'down'))).toBe(true);
    const piano = g.state.objects.find((o) => o.defId === 'piano')!;
    const [a, b] = g.state.dwellers;
    g.enqueue(a.id, { kind: 'interact', objectUid: piano.uid, interactionId: 'playPiano', autonomous: false });
    run(g, 60);
    expect(a.skills.piano).toBeGreaterThan(0);
    a.skills.piano = 6;
    b.x = piano.x + 1;
    b.y = piano.y + 2;
    g.enqueue(a.id, { kind: 'interact', objectUid: piano.uid, interactionId: 'playPiano', autonomous: false });
    run(g, 60);
    expect(a.buffs.some((x) => x.id === 'killerChords')).toBe(true);
    expect(b.buffs.some((x) => x.id === 'jazzedUp')).toBe(true);
  });
});
