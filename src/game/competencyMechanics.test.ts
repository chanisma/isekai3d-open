import { describe, expect, it } from 'vitest';
import { streakMultiplier } from './constants';
import { billAmount } from './economy';
import { getDef } from './catalog';
import { Game } from './game';
import { levelOf } from './careers';

const dwellers = () => [{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }];
type Private = {
  practiseToday(s: unknown, k: string): number;
  gainSkill(s: unknown, k: string, a: number): void;
  onInteractionDone(s: unknown, i: unknown, o: unknown): void;
  stepBills(): void;
  checkWork(s: unknown): void;
  returnFromOuting(s: unknown): void;
  burglarLeaves(s: unknown): void;
  stepDying(s: unknown): void;
};

describe('competency mechanics (ours)', () => {
  it('rewards practising day after day, up to half again, and starts over after a day off', () => {
    expect(streakMultiplier(1)).toBe(1);
    expect(streakMultiplier(2)).toBeCloseTo(1.1);
    expect(streakMultiplier(6)).toBeCloseTo(1.5);
    expect(streakMultiplier(30)).toBeCloseTo(1.5);
    const g = Game.create(dwellers(), () => 0.5);
    const dweller = g.state.dwellers[0];
    const p = g as unknown as Private;
    expect(p.practiseToday(dweller, 'medicine')).toBe(1);
    expect(p.practiseToday(dweller, 'medicine')).toBe(1);
    g.state.time += 1440;
    expect(p.practiseToday(dweller, 'medicine')).toBe(2);
    g.state.time += 1440;
    expect(p.practiseToday(dweller, 'medicine')).toBe(3);
    g.state.time += 2 * 1440;
    expect(p.practiseToday(dweller, 'medicine')).toBe(1);
    // The streak makes the same practice count for more.
    const fresh = Game.create(dwellers(), () => 0.5);
    const a = fresh.state.dwellers[0];
    (fresh as unknown as Private).gainSkill(a, 'law', 0.5);
    const once = a.skills.law;
    a.skills.law = 0;
    a.practice = { law: { day: Math.floor(fresh.state.time / 1440) - 1, n: 5 } };
    (fresh as unknown as Private).gainSkill(a, 'law', 0.5);
    expect(a.skills.law).toBeCloseTo(once * 1.5, 5);
  });

  it('pays for translation work once the language is good enough', () => {
    const g = Game.create(dwellers(), () => 0.5);
    const dweller = g.state.dwellers[0];
    const pc = g.state.objects.find((o) => o.defId === 'computer')!;
    const gig = getDef('computer').interactions.find((i) => i.id === 'translateGig')!;
    dweller.skills.language = 2;
    expect(g.meetsRequirement(dweller, pc, gig)).toBe(false);
    dweller.skills.language = 3;
    expect(g.meetsRequirement(dweller, pc, gig)).toBe(true);
    const before = g.state.money;
    (g as unknown as Private).onInteractionDone(dweller, gig, pc);
    expect(g.state.money - before).toBe(20 + 15 * 3);
  });

  it('keeps the bills down when someone at home knows money', () => {
    const run = (business: number) => {
      const g = Game.create(dwellers(), () => 0.5);
      g.state.dwellers[0].skills.business = business;
      const eco = g.state.economy!;
      eco.usage = { power: 300, water: 200 };
      eco.lastBillDay = 0;
      g.state.time = 7 * 1440 + 6 * 60;
      const expected = billAmount(g.state.objects, eco.usage);
      (g as unknown as Private).stepBills();
      return { bill: eco.bill!.amount, expected };
    };
    const none = run(0);
    expect(none.bill).toBe(none.expected);
    const savvy = run(5);
    expect(savvy.bill).toBe(Math.round(savvy.expected * 0.9));
  });

  it('starts every new home with a study desk', () => {
    const g = Game.create(dwellers(), () => 0.5);
    expect(g.state.objects.some((o) => o.defId === 'studyDesk')).toBe(true);
  });

  it('lets a dweller who drives (4+) take the car to work half an hour later than the carpool', () => {
    const at = (driving: number, minutesBefore: number) => {
      const g = Game.create(dwellers(), () => 0.5);
      const dweller = g.state.dwellers[0];
      g.acceptJob(dweller.id, 'salaryperson');
      dweller.skills.driving = driving;
      const start = levelOf(dweller.job!).start;
      g.state.time = 7 * 1440 + start - minutesBefore;
      (g as unknown as Private).checkWork(dweller);
      return dweller.queue.some((a) => a.kind === 'work');
    };
    expect(at(0, 45)).toBe(true);
    expect(at(4, 45)).toBe(false);
    expect(at(4, 30)).toBe(true);
  });

  it('pays a delivery gig by driving, for those who can drive', () => {
    const g = Game.create(dwellers(), () => 0.5);
    const dweller = g.state.dwellers[0];
    g.state.time = 7 * 1440 + 12 * 60;
    dweller.skills.driving = 2;
    expect(g.outingBlocker(dweller, 'deliveryGig')).toContain('운전');
    dweller.skills.driving = 5;
    expect(g.outingBlocker(dweller, 'deliveryGig')).toBeNull();
    dweller.away = { until: g.state.time, outing: 'deliveryGig' };
    const before = g.state.money;
    (g as unknown as Private).returnFromOuting(dweller);
    expect(g.state.money - before).toBe(30 + 12 * 5);
  });

  it('wins a day of grace on the bills and an insurance payout with the law', () => {
    const g = Game.create(dwellers(), () => 0.5);
    const dweller = g.state.dwellers[0];
    dweller.skills.law = 5;
    const eco = g.state.economy!;
    eco.bill = { amount: 300, issuedAt: g.state.time, warned: false, cut: [] };
    g.state.time += 48 * 60 + 10;
    (g as unknown as Private).stepBills();
    expect(eco.bill.cut).not.toContain('power');
    g.state.time += 1440;
    (g as unknown as Private).stepBills();
    expect(eco.bill.cut).toContain('power');
    // A burglary: half the value back at law 5.
    const tv = g.state.objects.find((o) => o.defId === 'tv')!;
    g.state.stolen = [tv];
    const thief = { ...dweller, id: 777, npc: { role: 'burglar', until: g.state.time + 60 } };
    g.state.dwellers.push(thief as never);
    const before = g.state.money;
    (g as unknown as Private).burglarLeaves(thief);
    expect(g.state.money - before).toBe(Math.round(getDef('tv').price * 0.5));
  });

  it('brings the dying round with first aid, by itself at medicine 5, and sees to burns', () => {
    const g = Game.create([...dwellers(), { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' }], () => 0.1);
    const [a, b] = g.state.dwellers;
    b.skills.medicine = 5;
    g.startDying(a, 'hunger');
    expect(a.dying).toBeTruthy();
    g.state.time += 5;
    (g as unknown as Private).stepDying(a);
    expect(a.dying).toBeUndefined();
    expect(a.buffs.some((x) => x.id === 'spared')).toBe(true);
    // Burns: anyone with medicine 2 can see to them.
    a.buffs.push({ id: 'singed', until: g.state.time + 60 } as never);
    expect(g.socialMenu(b, a).some((o) => o.id === '__firstAid' && !o.disabled)).toBe(true);
    g.firstAid(b.id, a.id);
    expect(a.buffs.some((x) => x.id === 'singed')).toBe(false);
  });
});

