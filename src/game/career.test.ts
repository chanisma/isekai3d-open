import { describe, expect, it } from 'vitest';
import { shiftPerformance } from './careers';
import { POWER_CUT_AFTER, billAmount, homeValue, propertyTax } from './economy';
import { Game } from './game';

function seeded(seed = 9) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** Up to just before Tuesday's carpool, then rested and fed (free will is off, so nobody sleeps or eats): how hard they work follows how they're doing (workDrive.ts). */
function toShift(game: Game) {
  run(game, 1440 - 90);
  for (const s of game.state.dwellers) s.needs = { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90 };
  return 1440 - 90;
}

const mood = (emotion: 'fine' | 'focused' | 'happy' | 'sad', intensity = 0) => ({ emotion, weight: 1, intensity });

describe('shift performance', () => {
  it('follows 참고 게임: base, good-emotion bonus, ideal emotion twice, daily task', () => {
    expect(shiftPerformance(0, 'focused', mood('fine'), 0, 60)).toEqual({ gain: 60, loss: 0 });
    expect(shiftPerformance(0, 'focused', mood('happy'), 0, 60).gain).toBe(70);
    expect(shiftPerformance(0, 'focused', mood('focused'), 1, 60).gain).toBe(100); // 60 + 10 + 10 + 20
    expect(shiftPerformance(0, 'focused', mood('focused', 1), 0, 60).gain).toBe(100); // 60 + 20 + 20
    expect(shiftPerformance(3, 'focused', mood('focused'), 0, 30).gain).toBe(40); // later levels: +5 each
    expect(shiftPerformance(0, 'focused', mood('sad', 1), 0, 60).loss).toBe(8);
  });

  it('builds up during the shift and pays on return', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'culinary'); // Monday 08:00 → works Tuesday 09:00–17:00 (참고 게임 보조 접시닦이)
    const money = g.state.money;
    run(g, 1440 + 40 - toShift(g)); // Tuesday 08:40: carpool came at 08:00
    expect(dweller.away).not.toBeNull();
    run(g, 5 * 60);
    expect(dweller.job!.performance).toBeGreaterThan(10);
    run(g, 5 * 60);
    expect(dweller.away).toBeNull();
    expect(g.state.money).toBeGreaterThanOrEqual(money + 60);
    expect(dweller.job!.performance).toBeGreaterThanOrEqual(30); // a full shift counts about half (PERF_PACE)
  });

  it('taking it easy earns little; slacking into the red gets you fired at the first level', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'culinary');
    dweller.traits = ['lazy']; // a lazy dweller coasts (workDrive.ts)
    dweller.job!.performance = -99;
    run(g, 1440 + 9 * 60 + 30 - toShift(g));
    expect(dweller.job).toBeNull();
    expect(dweller.buffs.some((b) => b.id === 'fired')).toBe(true);
  });

  it('promotes at 100 with the skill, resetting performance', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'culinary');
    dweller.skills.cooking = 2;
    dweller.job!.performance = 99;
    // (No card to answer on the way: an answer can take performance down.)
    for (let left = 1440 + 9 * 60 + 30 - toShift(g); left > 0; left--) {
      if (dweller.job!.eventAt !== undefined) dweller.job!.eventAt = undefined;
      run(g, 1);
    }
    expect(dweller.job!.level).toBe(1);
    expect(dweller.job!.performance).toBeLessThan(60);
  });

  it('practising the career skill at home fills the daily task', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'tech');
    dweller.needs = { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90 };
    const pc = g.state.objects.find((o) => o.defId === 'computer')!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: pc.uid, interactionId: 'study', autonomous: false });
    run(g, 75);
    expect(dweller.job!.task).toBeGreaterThan(0.8);
  });
});

describe('bills', () => {
  it('taxes home value in 참고 게임 brackets', () => {
    expect(propertyTax(10000)).toBeCloseTo(180);
    expect(propertyTax(30000)).toBeCloseTo(630); // 참고 게임 doc example
  });

  it('arrives on Monday at 05:00 and cuts power after two days unpaid', () => {
    const g = newGame();
    const expected = billAmount(g.state.objects, { power: 0, water: 0 });
    expect(expected).toBeGreaterThan(100);
    expect(homeValue(g.state.objects)).toBeGreaterThan(8000);
    g.state.burglarCooldownUntil = 1e9; // no break-ins to change the home's value
    // Ten days with free will off: keep them fed, this is about the bills.
    const runFed = (minutes: number) => {
      for (let t = 0; t < minutes; t += 0.5) {
        for (const s of g.household()) s.needs.hunger = Math.max(s.needs.hunger, 60);
        g.step(0.5);
      }
    };
    runFed(6 * 1440 + (24 * 60 - 8 * 60) + 5 * 60 + 1); // next Monday 05:00
    expect(g.economy.bill?.amount).toBeGreaterThanOrEqual(expected);
    runFed(48 * 60 + 1);
    expect(g.isCut('power')).toBe(true);
    const tv = g.state.objects.find((o) => o.defId === 'tv')!;
    expect(g.objectMenu(g.state.dwellers[0], tv)[0].disabled).toBe('전기가 끊겼어요');
    g.state.money = 10000;
    expect(g.payBill()).toBe(true);
    expect(g.isCut('power')).toBe(false);
  });

  it('refunds new purchases in full until you leave buy mode', () => {
    const g = newGame();
    const before = g.state.money;
    g.buy('plant', 20, 12, 'down');
    const plant = g.state.objects.at(-1)!;
    g.sell(plant.uid);
    expect(g.state.money).toBe(before);
    g.buy('plant', 20, 12, 'down');
    g.leaveBuyMode();
    g.sell(g.state.objects.at(-1)!.uid);
    expect(g.state.money).toBe(before - 60 + 48);
  });
});

describe('ultra speed', () => {
  it('kicks in at speed 3 when everyone is asleep or at work', () => {
    const g = newGame();
    g.state.speed = 3;
    expect(g.isUltra()).toBe(false);
    for (const s of g.state.dwellers) s.away = { until: 1e9 };
    expect(g.isUltra()).toBe(true);
  });

  it('free will pays the bills at the mailbox before the power goes off', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }]);
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    g.economy.bill = { amount: 120, issuedAt: g.state.time, warned: false, cut: [] };
    const money = g.state.money;
    let cut = false;
    for (let t = 0; t < POWER_CUT_AFTER && g.economy.bill; t += 0.5) {
      g.step(0.5);
      cut ||= g.isCut('power');
    }
    expect(g.economy.bill).toBeNull();
    expect(cut).toBe(false);
    expect(g.state.money).toBeLessThan(money);
  });
});
