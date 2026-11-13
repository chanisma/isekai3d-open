import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function setup() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    () => 0.5,
  );
  g.state.freeWill = false;
  expect(g.buy('chessTable', 12, 11, 'down')).toBe(true);
  const table = g.state.objects.find((o) => o.defId === 'chessTable')!;
  return { g, table };
}

describe('chess (참고 게임 Chess GameRules)', () => {
  it('starting a game invites someone; the first to 60 points wins', () => {
    const { g, table } = setup();
    const [a, b] = g.state.dwellers;
    for (const s of g.state.dwellers) for (const k of Object.keys(s.needs) as (keyof typeof s.needs)[]) s.needs[k] = 90;
    a.skills.logic = 9;
    g.enqueue(a.id, { kind: 'interact', objectUid: table.uid, interactionId: 'playChess', autonomous: false });
    run(g, 20);
    expect(g.toasts.some((t) => t.text.includes('체스 한 판'))).toBe(true);
    expect(g.chessOpponent(a, table)).toBe(b);
    run(g, 60);
    // Logic 9 scores 18 a turn against 9: the champion wins in under 4 turns.
    expect(a.buffs.some((x) => x.id === 'chessChampion')).toBe(true);
    expect(a.buffs.some((x) => x.id === 'chessFocusedMed')).toBe(true);
    expect(g.relationship(a.id, b.id).friend).toBeGreaterThan(0);
    expect(table.chess).toBeUndefined();
  });

  it('free will only joins a dweller already waiting at the board', () => {
    const { g, table } = setup();
    const [a, b] = g.state.dwellers;
    expect(g.chessWaiting(table, b)).toBe(false);
    g.enqueue(a.id, { kind: 'interact', objectUid: table.uid, interactionId: 'ponder', autonomous: false });
    run(g, 10);
    expect(g.chessWaiting(table, b)).toBe(false);
  });
});
