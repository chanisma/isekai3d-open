import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { SKILL_PROFILES } from './careerSkills';
import { settleNeighbourhood } from './neighbourhood';
import { factsOf, hearAboutJob, knownShare, learnOne } from './dwellerKnowledge';
import { townieSkills, withSkills } from './townieSkills';

const rng = () => 0.5;

describe("neighbours' competencies", () => {
  it('every neighbour has some, by their age and job, the same on every load', () => {
    const street = settleNeighbourhood(undefined, rng, 107);
    for (const t of street) {
      if (t.age === 'baby') continue;
      expect(Object.values(t.skills ?? {}).some((v) => v >= 1)).toBe(true);
      const p = t.job && SKILL_PROFILES[t.job.careerId];
      if (p) expect(t.skills![p.main]).toBeGreaterThanOrEqual(2.5);
    }
    const again = settleNeighbourhood(JSON.parse(JSON.stringify(street)), rng, 107);
    expect(again.map((t) => t.skills)).toEqual(street.map((t) => t.skills));
  });

  it('only ever go up: a promotion raises the job competency, nothing is lost', () => {
    const [t] = settleNeighbourhood(undefined, rng, 107).filter((x) => x.job && SKILL_PROFILES[x.job.careerId]);
    const main = SKILL_PROFILES[t.job!.careerId].main;
    const before = townieSkills(t)[main]!;
    t.skills = { ...t.skills, writing: 9 };
    t.job = { ...t.job!, level: t.job!.level + 3 };
    const after = withSkills(t);
    expect(after[main]!).toBeGreaterThan(before);
    expect(after.writing).toBe(9);
  });

  it('come along when they visit, and stay theirs when they move in', () => {
    const g = Game.create([{ name: '하린', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], rng);
    const t = g.state.townies!.find((x) => !x.age)!;
    const dweller = (g as unknown as { spawnTownie(role: string, who?: unknown): { skills: Record<string, number>; id: number } }).spawnTownie('doorbell', t)!;
    for (const [k, v] of Object.entries(t.skills ?? {})) expect(dweller.skills[k]).toBe(v);
    (g as unknown as { moveIn(s: unknown): void }).moveIn(dweller);
    const member = g.household().find((s) => s.id === t.id)!;
    expect(Object.values(member.skills).some((v) => v >= 1)).toBe(true);
  });
});

describe('getting to know a neighbour, competencies too', () => {
  it('learns their strengths one at a time, until everything is known', () => {
    const g = Game.create([{ name: '하린', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], rng);
    const [me] = g.household();
    const t = g.state.townies!.find((x) => !x.age && x.job)!;
    const facts = factsOf(t, t);
    expect(facts.skills.length).toBeGreaterThan(0);
    expect(knownShare(me, t.id, facts).known).toBe(0);
    let lines = 0;
    let r = 0;
    while (learnOne(me, t.id, facts, () => (r = (r + 0.37) % 1))) lines++;
    expect(lines).toBe(facts.traits.length + facts.likes.length + facts.skills.length);
    expect(Object.keys(me.knows![t.id].skills ?? {}).length).toBe(facts.skills.length);
    // Asking about their job tells the job, and how good they are at its main competency.
    hearAboutJob(me, t.id, facts);
    expect(knownShare(me, t.id, facts)).toEqual({ known: knownShare(me, t.id, facts).all, all: knownShare(me, t.id, facts).all });
  });
});
