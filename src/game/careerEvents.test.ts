import { describe, expect, it } from 'vitest';
import { CAREER_EVENTS, EVENT_AUTO_ANSWER, EVENT_COOLDOWN, EVENT_DELAY, eventText, eventsFor, successChance } from './careerEvents';
import { CAREERS, CAREER_BY_ID, levelOf, topLevelOf } from './careers';
import { NO_SKILLS, SKILL_KEYS } from './constants';
import { BUFFS } from './emotions';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** A dweller about to start a shift in `careerId`, with every roll coming up "event". */
function worker(careerId: string) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.1);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  const dweller = g.state.dwellers[0];
  g.acceptJob(dweller.id, careerId);
  // Not asked to go along to work (a question of its own that holds time).
  dweller.job!.follow = false;
  const lvl = levelOf(dweller.job!);
  let day = Math.floor(g.state.time / 1440) + 1;
  while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
  g.state.time = day * 1440 + lvl.start - 61;
  dweller.job!.lastWorkDay = day - 1;
  return { g, dweller };
}

describe('things that happen at work (참고 게임 career chance cards, our own events)', () => {
  it('every working career has events at every rung of its ladder', () => {
    for (const c of CAREERS.filter((x) => !x.school)) {
      const top = topLevelOf({ careerId: c.id, level: 0, performance: 0, lastWorkDay: 0 });
      for (let level = 0; level <= top; level++) expect(eventsFor(c.id, level).length, `${c.id} level ${level}`).toBeGreaterThan(0);
    }
  });

  it('is written against real careers, skills and moodlets, two answers each', () => {
    const ids = new Set<string>();
    for (const e of CAREER_EVENTS) {
      expect(ids.has(e.id), e.id).toBe(false);
      ids.add(e.id);
      for (const c of e.careers) if (c !== '*') expect(CAREER_BY_ID[c], `${e.id}: ${c}`).toBeTruthy();
      expect(e.choices).toHaveLength(2);
      for (const ch of e.choices) {
        if (ch.skill) expect(SKILL_KEYS).toContain(ch.skill);
        for (const out of [ch.win, ch.lose]) if (out?.buff) expect(BUFFS[out.buff], `${e.id}: ${out.buff}`).toBeTruthy();
      }
      expect(eventText(e.text, '민준')).not.toMatch(/\{n/);
    }
    expect(CAREER_EVENTS.length).toBeGreaterThan(185);
  });

  it('a gamble comes off more often with the skill and the mood, as 참고 게임 weighs it', () => {
    const choice = CAREER_EVENTS[0].choices[0];
    const low = successChance(choice, NO_SKILLS(), 'fine');
    const high = successChance(choice, { ...NO_SKILLS(), [choice.skill!]: 8 }, choice.mood ?? 'fine');
    const sad = successChance(choice, NO_SKILLS(), 'sad');
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(sad);
    expect(high).toBeLessThan(1);
  });

  it('comes up an hour into a shift, pauses the game and pays out the answer', () => {
    const { g, dweller } = worker('doctor');
    g.state.speed = 1;
    run(g, 61 + 2);
    expect(dweller.away).toBeTruthy();
    expect(dweller.job!.eventAt).toBe(dweller.job!.shiftStart! + EVENT_DELAY);
    run(g, EVENT_DELAY + 1);
    expect(g.state.careerEvent).toBeTruthy();
    expect(g.state.speed).toBe(0);
    const view = g.careerEventView()!;
    expect(view.text).toContain('민준');
    const before = dweller.job!.performance;
    // The sure answer of the event, whichever it is.
    const sure = view.event.choices.findIndex((c) => !c.lose);
    g.answerCareerEvent(sure === -1 ? 1 : (sure as 0 | 1));
    expect(g.state.careerEvent).toBeUndefined();
    // Its result on screen, time held until it's read (2026-10-26).
    const r = g.state.workResult!;
    expect(r).toMatchObject({ dwellerId: dweller.id, kind: 'card', chose: view.choices[sure === -1 ? 1 : sure].label });
    expect(r.text?.length).toBeGreaterThan(0);
    expect(g.state.speed).toBe(0);
    g.closeWorkResult();
    expect(g.state.workResult).toBeUndefined();
    expect(g.state.speed).toBe(1);
    if (sure !== -1) expect(dweller.job!.performance).toBe(Math.max(-100, Math.min(100, before + view.event.choices[sure].win.perf)));
    // Seen once, it waits out its cooldown.
    expect(eventsFor('doctor', dweller.job!.level, dweller.job!.eventsSeen, g.state.time).some((e) => e.id === view.event.id)).toBe(false);
    expect(eventsFor('doctor', dweller.job!.level, dweller.job!.eventsSeen, g.state.time + EVENT_COOLDOWN).some((e) => e.id === view.event.id)).toBe(true);
  });

  it('drops an event from a job the dweller has since left', () => {
    const { g, dweller } = worker('doctor');
    g.state.speed = 1;
    run(g, 61 + 2 + EVENT_DELAY + 1);
    expect(g.state.careerEvent).toBeTruthy();
    g.acceptJob(dweller.id, 'farmer');
    expect(g.state.careerEvent).toBeUndefined();
  });

  it('left unanswered (nobody at the controls), the dweller answers for themselves', () => {
    const { g } = worker('baker');
    run(g, 61 + 2 + EVENT_DELAY + 1);
    expect(g.state.careerEvent).toBeTruthy();
    run(g, EVENT_AUTO_ANSWER + 1);
    expect(g.state.careerEvent).toBeUndefined();
  });
});
