import type { EmotionKey, SkillKey } from './types';

/** Types and helpers the career events are written with (careerEvents.ts). */

/** What an answer does: a line of text, job performance and perhaps money, a moodlet or some skill. */
export interface EventOutcome {
  text: string;
  perf: number;
  money?: number;
  buff?: string;
  skill?: SkillKey;
}

/**
 * The way an answer goes about it (ours, for the AI's three-answer cards): on one's own skill, with
 * other people, or by the rules and the safe road. Never shown; what the player picks is kept
 * (knowledge.ts) to learn how they like to go about things.
 */
export type Approach = 'self' | 'together' | 'safe';

export interface EventChoice {
  label: string;
  approach?: Approach;
  /** A gamble: the skill and the mood that make it come off. Without them the answer is sure. */
  skill?: SkillKey;
  mood?: EmotionKey;
  /** Skill level at which the gamble is likely to work. */
  need?: number;
  /** How it usually goes in the field, after this answer (`fieldNote`); else the event's. */
  insight?: string;
  win: EventOutcome;
  lose?: EventOutcome;
}

export interface CareerEvent {
  id: string;
  careers: string[];
  /** Career levels (0-based) it can come up at. */
  minLevel: number;
  maxLevel: number;
  /** {n} is the dweller's name, {n:이/가} with its particle. */
  text: string;
  /** Two for the written cards; three (one each way) for the AI's. */
  choices: EventChoice[];
  /** An AI card about a fact from the job's university major (e.g. 간호학): the major's name. */
  major?: string;
  /**
   * An AI task card (2026-10-25): a real piece of the day's work to think through, answered in the
   * player's own words (or 모르겠어요) — the question, hints that lead the way, and one example
   * answer shown after. Such a card has no choices.
   */
  task?: { ask: string; hints: string[]; example: string };
  /** An AI card that goes on from the last one's answer (`followUp`), or, for a new one, how many may follow it (0–2, drawn when it came). */
  followUp?: boolean;
  chainLeft?: number;
  /**
   * How it usually goes in the field, shown after the answer as `현장에서는 보통 …` (ours, 2026-11-02, the
   * user's: docs/workplaces/PIPELINE.md 직장의 수준 차이). Soft, from research, not a verdict: no answer is marked wrong by it.
   */
  insight?: string;
}

/** The line as it's shown, whether or not the text (an AI's) already opens that way. */
export const fieldNote = (insight: string) => `현장에서는 보통 ${insight.trim().replace(/^현장에서는\s*(보통\s*)?/, '')}`;

/**
 * A card every working day (ours, 2026-10-25, at the user's request — "at least one question a game
 * day"; 참고 게임's starter weights were nothing 3, a card 1). A day a work episode plays takes its place.
 */
export const EVENT_CHANCE = 1;
/** Minutes into the shift (참고 게임 offset_time 60). */
export const EVENT_DELAY = 60;
/** The same event won't come back for a month (at the user's request, 2026-11-01: the same question kept coming; six days until then) (ours; in 참고 게임 only the Shady cards have a 144 h dweller_specific_cooldown). */
export const EVENT_COOLDOWN = 720 * 60;
/** Left unanswered this long (no one playing), the dweller answers for themselves. */
export const EVENT_AUTO_ANSWER = 60;

// ---- helpers for writing the events ----

/** Levels the events are for: the early ones up to the fourth rung, the later ones from the fifth. */
export const EARLY: [number, number] = [0, 4];
export const LATE: [number, number] = [4, 99];
export const ANY: [number, number] = [0, 99];

/** A gamble on a skill and a mood: 참고 게임 medium gain or loss, large with `big`. */
export function risky(label: string, skill: SkillKey, mood: EmotionKey | undefined, win: string, lose: string, opts: { big?: boolean; need?: number; money?: number; skillUp?: boolean } = {}): EventChoice {
  return {
    label,
    skill,
    mood,
    need: opts.need,
    win: { text: win, perf: opts.big ? 25 : 15, buff: 'careerWin', money: opts.money, skill: opts.skillUp ? skill : undefined },
    lose: { text: lose, perf: opts.big ? -20 : -10, buff: 'careerOops' },
  };
}

/** A safe answer with a sure (usually small) result. */
export function steady(label: string, text: string, perf = 0, extra: { money?: number; buff?: string; skill?: SkillKey } = {}): EventChoice {
  return { label, win: { text, perf, ...extra } };
}

export function ev(id: string, careers: string | string[], levels: [number, number], text: string, a: EventChoice, b: EventChoice, insight?: string): CareerEvent {
  return { id, careers: Array.isArray(careers) ? careers : [careers], minLevel: levels[0], maxLevel: levels[1], text, choices: [a, b], ...(insight ? { insight } : {}) };
}

