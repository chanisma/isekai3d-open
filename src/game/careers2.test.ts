import { describe, expect, it } from 'vitest';
import { CAREER_BY_ID, chooseBranch, levelOf, levelsOf, meetsNeeds, nextLevelOf } from './careers';
import { NO_SKILLS } from './constants';
import { Game } from './game';

describe('참고 게임 career ladders', () => {
  it('have ten levels across the shared rungs and a branch, with 참고 게임 titles and schedules', () => {
    const c = CAREER_BY_ID.culinary;
    expect(c.levels.length).toBe(5);
    expect(c.branches?.map((b) => b.name)).toEqual(['고급 요리사', '바텐더']);
    expect(levelsOf(c, 0).length).toBe(10);
    expect(c.levels[0].title).toBe('설거지 담당');
    // 출장요리사: Sunday, Monday, Thursday-Saturday from 15:00 for 8 hours (ours 0 = Monday).
    expect(c.levels[2].days).toEqual([0, 3, 4, 5, 6]);
    expect(c.levels[2].start).toBe(15 * 60);
    expect(c.levels[2].end).toBe(23 * 60);
  });

  it('asks for skills to leave a level, and picks the branch the dweller suits', () => {
    const astro = CAREER_BY_ID.astronaut;
    // The competency profile: an astronaut climbs on science (careerSkills.ts).
    const skills = { ...NO_SKILLS(), science: 1 };
    expect(meetsNeeds(skills, astro.levels[1])).toBe(false);
    skills.science = 2;
    expect(meetsNeeds(skills, astro.levels[1])).toBe(true);
    const writer = CAREER_BY_ID.writer;
    expect(writer.branches![chooseBranch(writer, { ...NO_SKILLS(), writing: 7, charisma: 3 })].name).toBe('저널리스트');
    expect(writer.branches![chooseBranch(writer, { ...NO_SKILLS(), writing: 7, logic: 3 })].name).toBe('작가');
  });

  it('promotes into a branch after the shared levels', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'writer');
    const job = dweller.job!;
    job.level = CAREER_BY_ID.writer.levels.length - 1;
    dweller.skills.writing = 6;
    dweller.skills.empathy = 4;
    dweller.skills.charisma = 4;
    expect(nextLevelOf(job, dweller.skills)?.title).toBe('사회부 기자');
    job.performance = 100;
    (g as unknown as { evaluateCareer(s: typeof dweller): void }).evaluateCareer(dweller);
    expect(job.branch).toBe(1);
    expect(levelOf(job).title).toBe('사회부 기자');
  });
});
