import { clamp } from './util';

/**
 * Mixed drinks after 참고 게임's bar (docs/ref-game/05 §1.15). Recipes come in three skill bands
 * (CraftingSkill_01/04/07); a drink's quality is -15 + 20 per Mixology level above the band's
 * floor plus how the steps went, read as Poor / Normal / Outstanding like food. The moodlet
 * depends on band and quality (참고 게임 loot_Buff_Drink). Names are the Korean game's.
 */
export interface DrinkTier {
  floor: number;
  /** What the ingredients cost (참고 게임 crafting_cost flat_fee, halved for our money). */
  cost: number;
  names: string[];
}

export const DRINK_TIERS: DrinkTier[] = [
  { floor: 0, cost: 6, names: ['주스 온 더 락', '스위트 스파이시', '꿍쾅', '스크루 드라이버', '리지포트'] },
  { floor: 4, cost: 11, names: ['어두운 돌풍', '바다 스플래시'] },
  { floor: 7, cost: 19, names: ['무성영화', '이세계마폴리탄', '선셋 밸리', '사워 펀치'] },
];

/** The best band a mixer of this level knows. */
export function drinkTier(skill: number): number {
  return skill >= 7 ? 2 : skill >= 4 ? 1 : 0;
}

export function drinkQuality(skill: number, tier: number, roll: number): number {
  const steps = -10 + roll * 30; // our stand-in for 참고 게임's per-step crafting outcomes, as for food
  return clamp(-15 + 20 * (Math.floor(skill) - DRINK_TIERS[tier].floor) + steps, -50, 50);
}

/** 참고 게임 loot_Buff_Drink: a better band and a better pour make a better moodlet. */
export function drinkBuff(tier: number, quality: number): string | null {
  const q = quality <= -31 ? 0 : quality >= 31 ? 2 : 1;
  const step = tier + q; // 0..4
  return [tier === 0 ? 'drinkOdd' : null, null, 'drinkSweet', 'drinkCool', 'drinkTasty'][step] ?? null;
}
