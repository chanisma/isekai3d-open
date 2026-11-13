import { clamp } from './util';

/**
 * Paintings after 참고 게임's PaintingRecipe (docs/ref-game/05 §1.8): quality -44 + 11 per painting
 * level plus how the session went, and a sale price scaled by quality (Poor 0.7-0.9, Normal
 * 0.9-1.1, Outstanding 1.1-1.3). 참고 게임 takes the base price from the canvas object; ours grows
 * with skill instead.
 */
export function paintingQuality(skill: number, roll: number): number {
  return clamp(-44 + 11 * Math.floor(skill) + (-10 + roll * 30), -50, 50);
}

export function paintingValue(skill: number, quality: number, roll: number): number {
  const base = 15 * Math.pow(1 + Math.floor(skill), 1.6);
  const [lo, hi] = quality <= -31 ? [0.7, 0.9] : quality >= 31 ? [1.1, 1.3] : [0.9, 1.1];
  return Math.round(base * (lo + (hi - lo) * roll));
}
