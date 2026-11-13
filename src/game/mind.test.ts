import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { streakMultiplier } from './constants';
import { BUFFS } from './emotions';
import { Game } from './game';
import { badMoodFactor, dutyWeight, streakCap } from './mind';

const dwellers = () => [{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }];
type Private = {
  onInteractionDone(s: unknown, i: unknown, o: unknown): void;
  practiseToday(s: unknown, k: string): number;
  updateBuffs(s: unknown): void;
  gainSkill(s: unknown, k: string, n: number): void;
};

describe('competencies of the mind (ours)', () => {
  it('grows 절제력 from duties done while fun still calls, and 호기심 from first tries', () => {
    const g = Game.create(dwellers(), () => 0.5);
    const dweller = g.state.dwellers[0];
    const p = g as unknown as Private;
    const desk = g.state.objects.find((o) => o.defId === 'studyDesk')!;
    const study = getDef('studyDesk').interactions.find((i) => i.id === 'studyMedicine')!;
    dweller.needs.fun = 90;
    p.onInteractionDone(dweller, study, desk);
    expect(dweller.skills.selfControl).toBe(0);
    expect(dweller.skills.curiosity).toBeGreaterThan(0);
    const curious = dweller.skills.curiosity;
    dweller.needs.fun = 30;
    p.onInteractionDone(dweller, study, desk);
    expect(dweller.skills.selfControl).toBeGreaterThan(0);
    // The second time is no first try.
    expect(dweller.skills.curiosity).toBe(curious);
  });

  it('grows 끈기 from days in a row, and lets a persistent dweller miss a day', () => {
    const g = Game.create(dwellers(), () => 0.5);
    const dweller = g.state.dwellers[0];
    const p = g as unknown as Private;
    p.practiseToday(dweller, 'logic');
    g.state.time += 1440;
    p.practiseToday(dweller, 'logic');
    expect(dweller.skills.persistence).toBeGreaterThan(0);
    g.state.time += 2 * 1440;
    expect(p.practiseToday(dweller, 'logic')).toBe(1);
    dweller.skills.persistence = 5;
    g.state.time += 2 * 1440;
    expect(p.practiseToday(dweller, 'logic')).toBe(2);
    expect(streakMultiplier(30, streakCap(10))).toBeCloseTo(1.8);
    expect(streakMultiplier(30)).toBeCloseTo(1.5);
  });

  it('makes bad moodlets pass sooner with 회복탄력성, which grows from living through them', () => {
    const g = Game.create(dwellers(), () => 0.5);
    const dweller = g.state.dwellers[0];
    const bad = Object.entries(BUFFS).find(([, d]) => d.emotion === 'sad' && d.duration)![0];
    g.addBuff(dweller, bad);
    const plain = dweller.buffs.find((b) => b.id === bad)!.until! - g.state.time;
    dweller.buffs = dweller.buffs.filter((b) => b.id !== bad);
    dweller.skills.resilience = 10;
    g.addBuff(dweller, bad);
    const tough = dweller.buffs.find((b) => b.id === bad)!.until! - g.state.time;
    expect(tough).toBeCloseTo(plain * badMoodFactor(10));
    dweller.skills.resilience = 0;
    g.state.time += plain + 1;
    (g as unknown as Private).updateBuffs(dweller);
    expect(dweller.skills.resilience).toBeGreaterThan(0);
  });

  it('only nudges free will towards duties', () => {
    expect(dutyWeight(0)).toBe(1);
    expect(dutyWeight(10)).toBeCloseTo(1.4);
  });

  it('lets children grow them too, as 참고 게임 children grow character values', () => {
    const g = Game.create(dwellers(), () => 0.5);
    const dweller = g.state.dwellers[0];
    dweller.age = 'child';
    (g as unknown as Private).gainSkill(dweller, 'persistence', 1);
    expect(dweller.skills.persistence).toBeGreaterThan(0);
  });
});
