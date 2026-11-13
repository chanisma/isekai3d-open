import { describe, expect, it } from 'vitest';
import { DEADLY_MOOD_MINUTES, DYING_MINUTES } from './deaths';
import { Game } from './game';

function household(rng: () => number = () => 0.5) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    rng,
  );
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('death, the Grim Reaper and ghosts (참고 게임 death_*, grimReaper_Plead, trait_ghost_*)', () => {
  it('a grown-up starves to death, the Reaper comes, and leaves an urn and a ghost record', () => {
    const g = household();
    const [a, b] = g.state.dwellers;
    a.needs.hunger = 0;
    run(g, 1);
    expect(a.dying?.cause).toBe('hunger');
    expect(g.state.dwellers.some((s) => s.npc?.role === 'reaper')).toBe(true);
    expect(g.pleadBlocker(b)).toBeNull();
    run(g, DYING_MINUTES + 2);
    expect(g.state.dwellers.includes(a)).toBe(false);
    expect(g.state.dead?.[0]).toMatchObject({ name: '민준', cause: 'hunger' });
    expect(g.state.objects.some((o) => o.defId === 'urn')).toBe(true);
    expect(b.buffs.some((x) => x.id === 'griefFamily')).toBe(true);
  });

  it('pleading with the Reaper can save a life (참고 게임: one in three)', () => {
    const g = household(() => 0.2);
    const [a, b] = g.state.dwellers;
    g.startDying(a, 'fire');
    g.pleadForLife(b.id);
    expect(a.dying).toBeUndefined();
    expect(a.buffs.some((x) => x.id === 'spared')).toBe(true);
    expect(b.buffs.some((x) => x.id === 'savedFromDeath')).toBe(true);
  });

  it("can't plead against old age, and only once each", () => {
    const g = household(() => 0.9);
    const [a, b] = g.state.dwellers;
    g.startDying(a, 'anger');
    g.pleadForLife(b.id);
    expect(a.dying).toBeDefined();
    expect(g.pleadBlocker(b)).toBe('이미 빌었어요');
    a.dying = { cause: 'oldAge', at: g.state.time, pleaded: [] };
    expect(g.pleadBlocker(b)).toBe('노환은 되돌릴 수 없어요');
  });

  it('too long at the top of Angry kills, after a warning', () => {
    const g = household();
    const [a] = g.state.dwellers;
    // Four rows' worth of anger: weight 8, past 참고 게임's top Angry threshold (7).
    for (let i = 0; i < 4; i++) a.buffs.push({ id: 'argued', until: g.state.time + 999 } as never);
    run(g, 5);
    expect(g.toasts.some((t) => t.text.includes('목숨이 위험해요'))).toBe(true);
    run(g, DEADLY_MOOD_MINUTES);
    expect(a.dying?.cause).toBe('anger');
  });

  it('the dead come back from their urn at night as ghosts', () => {
    const g = household(() => 0.0001);
    const [a] = g.state.dwellers;
    g.startDying(a, 'drown');
    run(g, DYING_MINUTES + 2);
    g.state.time = Math.floor(g.state.time / 1440) * 1440 + 1440 + 22 * 60;
    run(g, 5);
    const ghost = g.state.dwellers.find((s) => s.npc?.role === 'ghost');
    expect(ghost?.name).toBe('민준');
    expect(ghost?.id).toBe(a.id); // the same dweller, so relationships carry on
  });

  it('a shock while repairing only hurts, never kills', () => {
    const g = household(() => 0);
    const [a] = g.state.dwellers;
    const tv = g.state.objects.find((o) => o.defId === 'tv');
    if (!tv) return;
    tv.wear = 0;
    a.buffs.push({ id: 'shockWarning', until: g.state.time + 180 } as never);
    g.enqueue(a.id, { kind: 'interact', objectUid: tv.uid, interactionId: 'repair', autonomous: false });
    run(g, 120);
    expect(a.dying).toBeUndefined();
    expect(g.state.dwellers.includes(a)).toBe(true);
  });
});
