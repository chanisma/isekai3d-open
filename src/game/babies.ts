import type { NeedKey } from './types';

/**
 * Babies after 참고 게임 (docs/ref-game/04 §4.7). Trying for a baby can make the partner pregnant;
 * the pregnancy commodity fills at 0.016667 a minute to 100 (PREGNANCY_RATE), so about 100 hours,
 * through three trimester moodlets and labour. The baby lives in a bassinet for three days and is
 * fed, changed and cuddled there; left to starve or sit dirty too long, the social worker takes it.
 * Then it grows up into a child.
 */
export const PREGNANCY_LENGTH = 100 * 60;
/** Minutes of labour before the baby arrives (ours). */
export const LABOR_LENGTH = 30;
/** Chance that trying for a baby works (ours; 참고 게임 rolls it on its WooHoo outcome). */
export const TRY_FOR_BABY_CHANCE = 0.5;
/**
 * Days in the bassinet before growing into a toddler: a newborn for the first day, then an infant
 * (참고 게임 2023 AgingTransition: baby age_normal 1, infant age_normal 5; age_fast 0.5 and 2.5).
 */
export const BABY_DAYS = 6;
export const NEWBORN_DAYS = 1;
/** By lifespan: newborn days and newborn + infant days. */
export const BABY_STAGES = { normal: { newborn: 1, total: 6 }, off: { newborn: 1, total: 6 } } as const;

/**
 * 참고 게임's infant traits (trait_Infant_*, one at random on leaving the newborn days). The game's
 * effects live in infant care tuning we don't model; ours give each a small, matching twist.
 */
export const INFANT_TRAITS: Array<{ id: string; label: string; icon: string; desc: string }> = [
  { id: 'iCalm', label: '차분함', icon: '😌', desc: '잘 보채지 않아요' },
  { id: 'iCautious', label: '소심함', icon: '🫣', desc: '관심을 오래 원해요' },
  { id: 'iIntense', label: '요란함', icon: '😫', desc: '조금만 불편해도 울어요' },
  { id: 'iSensitive', label: '예민함', icon: '🥺', desc: '기저귀가 조금만 젖어도 울어요' },
  { id: 'iSunny', label: '천사', icon: '😊', desc: '자주 방긋 웃어요' },
  { id: 'iWiggly', label: '활달함', icon: '🤸', desc: '금방 지치고 금방 배고파요' },
];
/** Days as a child before growing up (참고 게임 child age_normal 14; we skip the teen years). */
export const CHILD_DAYS = 14;

/**
 * Days per life stage by lifespan (참고 게임 AgingTransition age_normal): child 14, teen 21, young adult
 * + adult 28 + 42, elder 14 before old age takes them (we add up to two days of chance, like 참고 게임's
 * death roll). 'off' keeps grown-ups as they are. 참고 게임's short lifespan was taken out at the user's
 * request.
 */
export const LIFESPANS = {
  normal: { toddler: 7, child: 14, teen: 21, adult: 70, elder: 14 },
  off: { toddler: 7, child: 14, teen: 21, adult: Infinity, elder: Infinity },
} as const;
export type Lifespan = keyof typeof LIFESPANS;
export const LIFESPAN_LABEL: Record<Lifespan, string> = { normal: '보통', off: '나이 들지 않음' };
/** Minutes a baby can go without food or a clean nappy before the social worker comes (ours). */
export const NEGLECT_LIMIT = 12 * 60;

/** How fast a baby's needs run down compared with an adult's (ours). */
export const BABY_DECAY: Partial<Record<NeedKey, number>> = { hunger: 1.6, hygiene: 1.4, social: 1.5, energy: 1.2, bladder: 0, fun: 0 };

/** Things a child can't do: cook, light fires, fix or wash up, hunt for jobs (참고 게임 child restrictions). */
/** Too young for romance (and for the adults' world of jobs). */
export function isYoung(age?: string): boolean {
  return age === 'baby' || age === 'toddler' || age === 'child' || age === 'teen';
}

/**
 * Toddlers after 참고 게임 (agingTransition_Human_Toddler: 7 days normal, 3.5 fast): they toddle
 * about, play and nap on their own, but need an older dweller to feed them, change them and teach them
 * to walk, talk and use the potty. Until potty training sticks (Potty 3) they wear nappies.
 */
export const TODDLER_ALLOWED = new Set(['playToys', 'toddlerNap', 'nap', 'listen', 'dance', 'watch', 'watchTv', 'relax', 'eatHighChair', 'usePotty']);
/** Potty level at which a toddler uses the toilet instead of a nappy (ours). */
export const POTTY_TRAINED = 3;
/** Needs run faster for a toddler in nappies (ours, like BABY_DECAY). */
export const TODDLER_DECAY: Partial<Record<NeedKey, number>> = { hunger: 1.3, hygiene: 1.1 };

export const CHILD_FORBIDDEN = new Set(['cookGourmet', 'buildRocket', 'launchRocket', 'drinkCoffee', 'mixDrink', 'cook', 'cookFamily', 'repair', 'washDishes', 'findJob', 'quitJob', 'workout', 'study', 'tutorial', 'practiceRomance', 'gussyUp', 'writeBook']);

