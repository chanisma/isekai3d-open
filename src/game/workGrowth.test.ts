import { describe, expect, it } from 'vitest';
import { CAREER_BY_ID, levelOf } from './careers';
import { SKILL_PROFILES } from './careerSkills';
import { Game } from './game';
import { WORK_LEARN, homePracticeFactor, workSkills } from './workGrowth';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('growing at work and at home (workGrowth.ts)', () => {
  it("a day's work grows the job's own competencies: main half, base and the stage's quarter each", () => {
    const p = SKILL_PROFILES.doctor;
    const junior = workSkills({ careerId: 'doctor', level: 0 });
    expect(Object.fromEntries(junior)).toEqual({ [p.main]: 0.5, [p.base]: 0.5 });
    const c = CAREER_BY_ID.doctor;
    const expert = Object.fromEntries(workSkills({ careerId: 'doctor', level: c.levels.length, branch: 0 }));
    expect(expert[p.main]).toBeCloseTo(0.5 + (p.branches[0].skill === p.main ? 0.25 : 0));
    expect(Object.values(expert).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    // School isn't a job's experience (homework is its practice).
    expect(workSkills({ careerId: 'school', level: 0 })).toEqual([]);
  });

  it('a shift away from home grows them; before, it grew none', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'doctor');
    const lvl = levelOf(dweller.job!);
    let day = Math.floor(g.state.time / 1440) + 1;
    while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
    g.state.time = day * 1440 + lvl.start - 61;
    dweller.job!.lastWorkDay = day - 1;
    const main = SKILL_PROFILES.doctor.main;
    const before = dweller.skills[main];
    g.state.speed = 1;
    run(g, 61 + (lvl.end - lvl.start) + 30);
    expect(dweller.away).toBeNull();
    // About half a shift's light practice, at level 0's cost (2), give or take mood and the first-levels boost.
    const expected = (WORK_LEARN * 0.5 * (lvl.end - lvl.start)) / 2;
    expect(dweller.skills[main] - before).toBeGreaterThan(expected * 0.5);
    expect(dweller.skills[main] - before).toBeLessThan(expected * 3);
  });

  it('practising a career competency at home slows past the middle levels; hobbies and the mind do not', () => {
    expect(homePracticeFactor('medicine', 5, true)).toBe(1);
    expect(homePracticeFactor('medicine', 6, true)).toBe(0.5);
    expect(homePracticeFactor('charisma', 8)).toBe(0.3);
    expect(homePracticeFactor('guitar', 9, true)).toBe(1);
    expect(homePracticeFactor('persistence', 9)).toBe(1);
  });
});
