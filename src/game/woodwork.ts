import { clamp } from './util';

/**
 * Woodworking after 참고 게임's recipe_Woodwork_* tuning: Korean names, the Handiness level each
 * unlocks at (skill_test lower_bound) and _retail_price. Materials cost half the price
 * (crafting_cost discount 0.5); an outstanding piece sells for double, a poor one for half
 * (simoleon_value_modifiers_map). Finished pieces go to the household inventory to sell, as in 참고 게임.
 */
export interface WoodworkRecipe {
  id: string;
  name: string;
  level: number;
  price: number;
}

export const WOODWORK: WoodworkRecipe[] = [
  { id: 'knifeblock', name: '칼 꽂이', level: 0, price: 10 },
  { id: 'horse', name: '말 조각품', level: 1, price: 20 },
  { id: 'angry', name: '분노의 조각품', level: 2, price: 15 },
  { id: 'flirty', name: '유혹적인 조각품', level: 2, price: 15 },
  { id: 'playful', name: '장난스러운 조각품', level: 2, price: 15 },
  { id: 'sad', name: '슬픈 조각품', level: 2, price: 15 },
  { id: 'barstool', name: '바 스툴', level: 2, price: 30 },
  { id: 'rabbit', name: '토끼 조각품', level: 3, price: 40 },
  { id: 'elephant', name: '코끼리 조각품', level: 3, price: 40 },
  { id: 'dragon', name: '드래곤 조각품', level: 3, price: 40 },
  { id: 'endTable', name: '협탁', level: 4, price: 105 },
  { id: 'bear', name: '큰 곰 조각상', level: 5, price: 100 },
  { id: 'lumberjack', name: '큰 나무꾼 조각상', level: 5, price: 120 },
  { id: 'chair', name: '식탁 의자', level: 6, price: 90 },
  { id: 'table', name: '식탁', level: 6, price: 315 },
  { id: 'bathtub', name: '욕조', level: 9, price: 755 },
  { id: 'toilet', name: '변기', level: 10, price: 375 },
];

/** What a woodworker makes: one of the three priciest pieces their skill allows (ours). */
export function pickWoodwork(skill: number, rng: () => number): WoodworkRecipe {
  const open = WOODWORK.filter((r) => r.level <= Math.floor(skill)).sort((a, b) => b.price - a.price).slice(0, 3);
  return open[Math.floor(rng() * open.length)];
}

/** Craft quality -50..50, like a painting's (ours: 참고 게임's crafting quality curve is not readable). */
export function woodworkQuality(skill: number, roll: number): number {
  return clamp(-40 + 10 * Math.floor(skill) + (-10 + roll * 30), -50, 50);
}

/** The sale price: retail, ×2 when outstanding and ×0.5 when poor (참고 게임 simoleon_value_modifiers_map). */
export function woodworkValue(recipe: WoodworkRecipe, quality: number): number {
  const mul = quality >= 31 ? 2 : quality <= -31 ? 0.5 : 1;
  return Math.max(1, Math.round(recipe.price * mul));
}
