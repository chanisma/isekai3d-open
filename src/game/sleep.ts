import { WEEKDAYS, levelOf } from './careers';
import type { Needs, Dweller } from './types';

/**
 * 참고 게임's sleep_schedule (object_dweller tuning): a dweller grows sleepy by the hours left before their
 * next shift or school day, or before 8:00 (toddlers 7:00) when there's none. 0 = no desire,
 * 1 = buff_AllowSleepDesire, 2 = buff_SmallSleepDesire, 3 = buff_LargeSleepDesire.
 */
export type SleepDesire = 0 | 1 | 2 | 3;

/** How the desire buffs scale the pull of a bed (참고 게임 Energy autonomy modifiers: Small 1.15, Large 1.34). */
export const SLEEP_DESIRE_MUL: Record<SleepDesire, number> = { 0: 1, 1: 1, 2: 1.15, 3: 1.34 };

/**
 * Hours before the day starts that each desire begins; the large desire ends 3 hours before.
 * Adults and toddlers' are 참고 게임's. Children have no override in 참고 게임 (they'd get the adults' and stay
 * up till midnight), so ours put children to bed from about 9 and toddlers from about 8.
 */
const WINDOWS = {
  adult: { allow: 12, small: 10, large: 8 },
  child: { allow: 13, small: 12, large: 11 },
  toddler: { allow: 12, small: 11.5, large: 11 },
};
const LARGE_ENDS = 3;

/** 참고 게임 default_work_time: the hour a dweller with no shift that day plans to be up. */
export const DEFAULT_WAKE_HOUR = 8;
export const TODDLER_WAKE_HOUR = 7;

/**
 * Energy low enough that a bed calls whatever the hour (참고 게임 Buff_Motives_Energy_Exhausted, which
 * permits autonomous sleep outside the schedule; our Exhausted moodlet starts at the same mark).
 */
export const EXHAUSTED_ENERGY = 12.5;

/** A worker wakes this long before the shift, to wash and eat before the carpool (ours). */
export const WAKE_BEFORE_SHIFT = 90;

/** After the night's sleep is done, a dweller lies in this long before getting up (참고 게임 buff_Dweller_WakeupInXHoursHidden, 120 minutes). */
export const LIE_IN = 120;

/**
 * Waking need levels. 참고 게임's bed exit is at Bladder -85 (our 7.5), which leaves a dweller sleeping for
 * hours with Has To Pee; ours gets up when that moodlet starts, pops to the toilet and goes back
 * to bed. Hunger wakes at the 참고 게임-like low mark (ours).
 */
export const WAKE_NEED = { bladder: 25, hunger: 8 };

/**
 * When the dweller's day starts next: the earliest shift or school day within the next 24 hours,
 * otherwise the default hour. `work` says whether it's a real start time to be ready for.
 */
export function dayStart(dweller: Dweller, now: number): { at: number; work: boolean } {
  const day = Math.floor(now / 1440);
  let best = Infinity;
  for (const job of [dweller.job, dweller.partTime]) {
    if (!job) continue;
    const lvl = levelOf(job);
    for (const d of [day, day + 1]) {
      const at = d * 1440 + lvl.start;
      if (at > now && at - now <= 1440 && at < best && (lvl.days ?? WEEKDAYS).includes(d % 7)) best = at;
    }
  }
  if (best < Infinity) return { at: best, work: true };
  const hour = dweller.age === 'toddler' ? TODDLER_WAKE_HOUR : DEFAULT_WAKE_HOUR;
  let at = day * 1440 + hour * 60;
  if (at <= now) at += 1440;
  return { at, work: false };
}

/** The sleep desire buff the dweller would have right now. */
export function sleepDesire(dweller: Dweller, now: number): SleepDesire {
  const w = dweller.age === 'toddler' ? WINDOWS.toddler : dweller.age === 'child' ? WINDOWS.child : WINDOWS.adult;
  const h = (dayStart(dweller, now).at - now) / 60;
  if (h > w.allow || h <= LARGE_ENDS) return 0;
  if (h <= w.large) return 3;
  if (h <= w.small) return 2;
  return 1;
}

/** The time a sleeper wants to be up by: before the shift, or at the default hour. */
export function wakeTime(dweller: Dweller, now: number): number {
  const s = dayStart(dweller, now);
  return s.work ? s.at - WAKE_BEFORE_SHIFT : s.at;
}

/**
 * How restful sleep is, 1 = sound (ours; 참고 게임 lets a starving, filthy dweller sleep as soundly as any):
 * an empty stomach, dirt, a full bladder or a fever make it fitful, and energy comes back slower.
 */
export function restQuality(n: Needs, sick: boolean): number {
  let q = 1;
  if (n.hunger < 12.5) q *= 0.6;
  else if (n.hunger < 25) q *= 0.85;
  if (n.hygiene < 5) q *= 0.8;
  else if (n.hygiene < 25) q *= 0.9;
  if (n.bladder < 25) q *= 0.85;
  if (sick) q *= 0.75;
  return Math.max(0.4, q);
}

/** Below this, a stretch of sleep counts as fitful; a night fitful for over a third is a restless one. */
export const FITFUL = 0.85;

/**
 * Chance a minute of falling ill (몸살) for each need left in the red: filthy, starving or exhausted
 * (ours; about even odds over a day with one of them, sooner with more).
 */
export const SICK_CHANCE = 0.0005;
/** While sick, eating, washing and sleeping it off: how much faster it passes. */
export const SICK_REST_MUL = 3;
