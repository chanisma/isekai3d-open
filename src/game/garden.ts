import { clamp } from './util';

/**
 * Gardening after 참고 게임 (docs/ref-game/05 §1.11): a plant's growth commodity climbs from 0 to 100
 * at 0.017 a minute (commodity_Gardening_Growth), about 98 hours, while it has water. Ours dries out
 * in a day, weeds creep in over two (each halves growth while it's overgrown), and a plant left
 * dry for a day dies. Once grown it fruits; picking the harvest sells it and starts the next crop.
 */
export const GROWTH_PER_MINUTE = 0.017006804 / 100;
/** Share of growth a fruiting plant needs to fruit again after a harvest (ours). */
export const REGROW_FROM = 0.75;
export const WATER_PER_MINUTE = 100 / 1440;
export const WEEDS_PER_MINUTE = 100 / 2880;
export const DIES_AFTER_DRY = 1440;

export interface Plant {
  growth: number;
  water: number;
  weeds: number;
  dryFor?: number;
}

export function newPlant(): Plant {
  return { growth: 0, water: 100, weeds: 0 };
}

export function ripe(p: Plant): boolean {
  return p.growth >= 1;
}

/** Advances a plant by `dt` minutes; returns false once it has withered. */
export function growPlant(p: Plant, dt: number): boolean {
  p.water = clamp(p.water - WATER_PER_MINUTE * dt, 0, 100);
  p.weeds = clamp(p.weeds + WEEDS_PER_MINUTE * dt, 0, 100);
  if (p.water <= 0) {
    p.dryFor = (p.dryFor ?? 0) + dt;
    return p.dryFor < DIES_AFTER_DRY;
  }
  p.dryFor = 0;
  const speed = p.weeds >= 70 ? 0.5 : 1;
  p.growth = Math.min(1, p.growth + GROWTH_PER_MINUTE * speed * dt);
  return true;
}

/** What a harvest sells for: more with gardening skill and a well-kept plant (ours). */
export function harvestValue(skill: number, p: Plant, roll: number): number {
  const care = p.weeds < 30 ? 1.2 : p.weeds < 70 ? 1 : 0.8;
  return Math.round((25 + 15 * Math.floor(skill)) * care * (0.9 + 0.2 * roll));
}
