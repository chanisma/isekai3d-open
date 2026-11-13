import { EVENT_COOLDOWN, type CareerEvent, type EventChoice } from './careerEventKit';
import { EMOTIONS } from './emotions';
import type { EmotionKey, SkillKey } from './types';
import { josa } from './util';
import { EVENTS_BASE } from './careerEventsBase';
import { EVENTS_COMMON } from './careerEventsCommon';
import { EVENTS_EP } from './careerEventsEp';
import { EVENTS_JOBS } from './careerEventsJobs';
import { EVENTS_KOREA } from './careerEventsKorea';
import { EVENTS_MOD } from './careerEventsMod';

/**
 * Things that happen at work, after 참고 게임's career chance cards (AdventureMoment
 * career_*_ChanceCard_*, run by the work interaction's adventure in si_Career_*): an hour into
 * a shift (`timing at_beginning offset 60`) the starter moment picks "nothing" with weight 3 or a
 * card with weight 1, so about one shift in four brings one. The card fits the career level
 * (`user_level` bounds) and isn't seen again for six days (`dweller_specific_cooldown` 144 h). Each
 * card asks a question with two answers; an answer's results are weighed by skill and mood tests
 * (`weight_multiplier` 2 for the skill, 1.5 for the mood) and pay out job performance in 참고 게임's
 * sizes (loot_JobPerformance_Gain small 7 / medium 15 / large 25, Loss small -10 / medium -20).
 * 참고 게임's card texts are EA's; every event here is our own, written for each career.
 */

export * from './careerEventKit';

export const CAREER_EVENTS: CareerEvent[] = [...EVENTS_BASE, ...EVENTS_EP, ...EVENTS_MOD, ...EVENTS_JOBS, ...EVENTS_KOREA, ...EVENTS_COMMON];
export const EVENT_BY_ID: Record<string, CareerEvent> = Object.fromEntries(CAREER_EVENTS.map((e) => [e.id, e]));

/** The events that can come up for a career at a level, leaving out the ones seen lately. */
export function eventsFor(careerId: string, level: number, seen: Record<string, number> = {}, now = 0): CareerEvent[] {
  // (`*`: what happens at any job, not at school.)
  const all = CAREER_EVENTS.filter((e) => (e.careers.includes(careerId) || (e.careers[0] === '*' && careerId !== 'school' && careerId !== 'highSchool')) && level >= e.minLevel && level <= e.maxLevel);
  const fresh = all.filter((e) => now - (seen[e.id] ?? -Infinity) >= EVENT_COOLDOWN);
  // A card a day can run through a rung's cards inside the cooldown: then the ones seen longest ago come back first.
  return fresh.length ? fresh : [...all].sort((a, b) => (seen[a.id] ?? 0) - (seen[b.id] ?? 0)).slice(0, 3);
}

/**
 * Chance a gamble comes off: 참고 게임 weighs the success result against the failure result, the skill
 * test doubling success and the mood multiplying it by 1.5 (we also let a weak skill or a bad mood
 * count against it, ours).
 */
export function successChance(choice: EventChoice, skills: Record<SkillKey, number>, emotion: EmotionKey): number {
  if (!choice.skill || !choice.lose) return 1;
  const need = choice.need ?? 4;
  const lvl = skills[choice.skill] ?? 0;
  let w = lvl >= need ? 2 : lvl >= need / 2 ? 1 : 0.6;
  if (choice.mood && emotion === choice.mood) w *= 1.5;
  else if (EMOTIONS[emotion]?.polarity === 'negative') w *= 0.7;
  return w / (w + 1);
}

/** The event's text with the dweller's name put in (and the right particles after it). */
export function eventText(text: string, name: string): string {
  return (
    text
      // The particle written twice («{n:은/는}/는», «{n}은/는»; 2026-10-26, AI scenes written before the server fixed it): one place.
      .replace(/\{n(?::(?:이\/가|을\/를|은\/는|와\/과))?\}(?:은\/는|는\/은|\/는|\/은)/g, '{n:은/는}')
      .replace(/\{n(?::(?:이\/가|을\/를|은\/는|와\/과))?\}(?:이\/가|가\/이|\/가|\/이)/g, '{n:이/가}')
      .replace(/\{n(?::(?:이\/가|을\/를|은\/는|와\/과))?\}(?:을\/를|를\/을|\/를|\/을)/g, '{n:을/를}')
      .replace(/\{n(?::(?:이\/가|을\/를|은\/는|와\/과))?\}(?:와\/과|과\/와|\/과|\/와)/g, '{n:와/과}')
      .replace(/\{n(?::(이\/가|을\/를|은\/는|와\/과))?\}/g, (_m, pair?: '이/가' | '을/를' | '은/는' | '와/과') => (pair ? josa(name, pair) : name))
  );
}
