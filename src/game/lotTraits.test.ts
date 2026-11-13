import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { EARN_MINUTES, LOT_TRAITS, MAX_LOT_TRAITS } from './lotTraits';

const one = (plan = 'starter') => Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5, 'normal', plan);

describe('lot traits (참고 게임 zoneModifier_lotTrait_*)', () => {
  it("learns the trait's skills half again as fast at home, with a mood", () => {
    const plain = one();
    plain.state.lot!.traits = [];
    const homey = one();
    expect(homey.lotTraits).toEqual(['homey']);
    const [a] = plain.household();
    const [b] = homey.household();
    (plain as unknown as { gainSkill(s: unknown, k: string, n: number): void }).gainSkill(a, 'cooking', 0.4);
    (homey as unknown as { gainSkill(s: unknown, k: string, n: number): void }).gainSkill(b, 'cooking', 0.4);
    expect(b.skills.cooking / a.skills.cooking).toBeCloseTo(1.5, 5);
    expect(b.buffs.some((x) => x.id === 'lotHomey')).toBe(true);
    expect(a.buffs.some((x) => x.id === 'lotHomey')).toBe(false);
  });

  it('are earned by living, not picked: practice at home builds a trait, which fades if not lived', () => {
    const g = one();
    type P = { noteLotPractice(s: unknown, k: string, m: number): void; stepLotTraits(): void };
    const p = g as unknown as P;
    const [dweller] = g.household();
    const builtIn = [...g.lotTraits];
    // Not there yet: four hours of science at home is a leaning, not a trait.
    p.noteLotPractice(dweller, 'logic', 240);
    expect(g.lotTraits).not.toContain('scienceLair');
    expect(g.lotAffinity.scienceLair).toBe(240);
    // Ten hours, and the home is a science lair.
    p.noteLotPractice(dweller, 'rocketScience', EARN_MINUTES - 240);
    expect(g.lotTraits).toContain('scienceLair');
    expect(g.toasts.some((x) => x.text.includes('과학 연구실'))).toBe(true);
    // Never more than three; the home's own traits stay.
    p.noteLotPractice(dweller, 'fitness', EARN_MINUTES);
    p.noteLotPractice(dweller, 'painting', EARN_MINUTES);
    p.noteLotPractice(dweller, 'piano', EARN_MINUTES);
    expect(g.lotTraits.length).toBe(MAX_LOT_TRAITS);
    for (const id of builtIn) expect(g.lotTraits).toContain(id);
    // Days without it: the leaning fades and the trait goes.
    const before = g.lotTraits.filter((id) => !builtIn.includes(id));
    for (let d = 1; d <= 12; d++) {
      g.state.time += 1440;
      p.stepLotTraits();
    }
    expect(g.lotTraits.filter((id) => before.includes(id))).toEqual([]);
    for (const id of builtIn) expect(g.lotTraits).toContain(id);
    // Renters live in it too: they earn traits the same way.
    const r = one();
    expect(r.moveTo('studio', true, 'rent')).toBe(true);
    (r as unknown as P).noteLotPractice(r.household()[0], 'cooking', EARN_MINUTES);
    expect(r.lotTraits).toContain('homey');
    // Every trait names skills and a moodlet.
    for (const t of LOT_TRAITS) expect(t.skills.length + (t.habits?.length ?? 0)).toBeGreaterThan(0);
  });

  it("keeps an older save's hand-picked traits as earned, to fade if not lived", () => {
    const g = one();
    g.state.lot!.traits = [...g.plan.traits, 'freshAir'];
    g.state.lot!.affinity = undefined;
    expect(g.lotAffinity.freshAir).toBe(EARN_MINUTES);
  });

  it("moves to the new home's traits", () => {
    const g = one();
    expect(g.moveTo('studio')).toBe(true);
    expect(g.lotTraits).toEqual(['fastInternet']);
  });
});
