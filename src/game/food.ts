import { clamp } from './util';

/**
 * Food quality after 참고 게임 (docs/ref-game/05 §1.6): a dish's quality is -30 + 15 per cooking
 * level plus how the cooking steps went, on a -50..50 scale read as Poor (-31 and below), Normal
 * or Outstanding (31 and up). The moodlet from eating it depends on that and on which band the
 * cook's skill was in (참고 게임 loot_Buff_FoodBuffs: CraftingSkill_01/04/07/10).
 */

export const FOOD_BUFFS = ['foodBad', 'foodGood', 'foodTasty', 'foodFantastic', 'foodGreat'] as const;

/** A basic fridge and stove (참고 게임 CookingQuality_3: 5.5 each); our step roll already assumes them. */
export const BASIC_KITCHEN = 11;

/**
 * Quality of a dish from the cook's skill level, a roll for how the steps went and what better
 * appliances add over basic ones (`kitchen` = fridge + stove cookingQuality).
 */
export function dishQuality(skill: number, roll: number, kitchen = BASIC_KITCHEN): number {
  const steps = -10 + roll * 30 + (kitchen - BASIC_KITCHEN); // our stand-in for 참고 게임's per-step crafting outcomes
  return clamp(-30 + 15 * Math.floor(skill) + steps, -50, 50);
}

/** The moodlet a dish leaves: none for ordinary food from a novice. */
export function mealBuff(skill: number, quality: number): string | null {
  if (quality <= -31) return 'foodBad';
  const band = skill >= 10 ? 3 : skill >= 7 ? 2 : skill >= 4 ? 1 : 0;
  const tier = band + (quality >= 31 ? 2 : 1); // 1..5
  return [null, null, 'foodGood', 'foodTasty', 'foodFantastic', 'foodGreat'][tier];
}
