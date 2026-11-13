import { describe, expect, it } from 'vitest';
import { rankOptions } from './autonomy';
import { Game } from './game';
import { TRAITS, conflictsWith, traitFitsAge } from './traits';

function household(traits: string[][], rng: () => number = () => 0.5) {
  const g = Game.create(
    traits.map((t, i) => ({ name: ['민준', '서연', '지우'][i], shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', traits: t })),
    rng,
  );
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

const has = (dweller: { buffs: { id: string }[] }, id: string) => dweller.buffs.some((b) => b.id === id);

describe("참고 게임's personality traits", () => {
  it('has the full 참고 게임 set, with their ages and conflicts', () => {
    const personality = TRAITS.filter((t) => !t.reward);
    expect(personality.length).toBeGreaterThanOrEqual(37);
    expect(conflictsWith(['neat'], 'slob')).toBe(true);
    expect(conflictsWith(['good'], 'evil')).toBe(true);
    expect(traitFitsAge(TRAITS.find((t) => t.id === 'ambitious')!, 'teen')).toBe(false);
    expect(traitFitsAge(TRAITS.find((t) => t.id === 'genius')!, 'child')).toBe(true);
  });

  it('a creative dweller grows bored without making things, and painting puts it right', () => {
    const g = household([['creative']]);
    const dweller = g.state.dwellers[0];
    dweller.traitNeeds = { creative: 41 };
    run(g, 30);
    expect(has(dweller, 'uncreative')).toBe(true);
    const easel = g.state.objects.find((o) => o.defId === 'easel');
    if (easel) {
      g.enqueue(dweller.id, { kind: 'interact', objectUid: easel.uid, interactionId: 'paint', autonomous: false });
      run(g, 60);
      expect(dweller.traitNeeds!.creative).toBeGreaterThan(41);
    }
  });

  it('shows itself in idle moments (참고 게임 Idle_Trait_*: Feeling moodlets)', () => {
    const g = household([['selfAssured']]);
    const dweller = g.state.dwellers[0];
    run(g, 9 * 60);
    expect(has(dweller, 'feelingConfident')).toBe(true);
  });

  it('a materialistic dweller loves a new purchase', () => {
    const g = household([['materialistic']]);
    const dweller = g.state.dwellers[0];
    g.state.money = 10000;
    let placed = false;
    for (let y = 2; y < 16 && !placed; y++) for (let x = 2; x < 24 && !placed; x++) placed = g.buy('paintingMaster', x, y, 'down');
    expect(placed).toBe(true);
    expect(has(dweller, 'justAdmired2')).toBe(true);
  });

  it('an art lover is drawn to paintings and inspired by them', () => {
    const g = household([['artLover'], []]);
    const [lover, other] = g.state.dwellers;
    g.state.money = 10000;
    let placed = false;
    for (let y = 2; y < 16 && !placed; y++) for (let x = 2; x < 24 && !placed; x++) placed = g.buy('paintingLandscape', x, y, 'down');
    const view = (s: typeof lover) => rankOptions(g, s).find((c) => c.action.kind === 'interact' && c.action.interactionId === 'viewArt')?.score ?? 0;
    lover.needs.fun = other.needs.fun = 40;
    // Drawn, but under a like (traits softened 2026-10-26: TRAIT_CEIL).
    expect(view(lover)).toBeGreaterThan(view(other) * 1.5);
    const art = g.state.objects.find((o) => o.defId === 'paintingLandscape')!;
    g.enqueue(lover.id, { kind: 'interact', objectUid: art.uid, interactionId: 'viewArt', autonomous: false });
    run(g, 30);
    expect(has(lover, 'artLoverInspired')).toBe(true);
  });

  it('a grouch finds jokes unfunny, and childish grown-ups may play with toys', () => {
    const g = household([['goofball'], ['grouch'], ['childish']], () => 0.01);
    const [a, b, c] = g.state.dwellers;
    Object.assign(b, { x: a.x + 1, y: a.y });
    g.relationship(a.id, b.id).friend = 50;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'joke', autonomous: false });
    run(g, 20);
    expect(has(b, 'notFunny')).toBe(true);
    g.state.money = 10000;
    let placed = false;
    for (let y = 2; y < 16 && !placed; y++) for (let x = 2; x < 24 && !placed; x++) placed = g.buy('toyBox', x, y, 'down');
    const box = g.state.objects.find((o) => o.defId === 'toyBox');
    if (box) expect(g.objectMenu(c, box).some((o) => o.id === 'playToys' && !o.disabled)).toBe(true);
  });
});
