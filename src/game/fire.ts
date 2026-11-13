/**
 * Kitchen fires after 참고 게임 (docs/ref-game/05 §1.7). Each cooking step can start one
 * (Loot_Fire_TestHomestyleCooking: 3% at cooking level 0-1, 1.5% at 2, 0.5% at 3-4, never from 5),
 * and a cook who just had a fire is spared for two days (Buff_Fire_RecentFire, 2880 min). A fire
 * first spreads after 30 minutes and then every 13 (FireService FIRE_SPREAD_*). Dwellers panic, then
 * put it out; a smoke alarm within 10 tiles (FIRE_ALARM_ACTIVATION_RADIUS) wakes everyone and
 * brings the fire brigade. Unlike 참고 게임, nobody dies: getting too close only singes.
 */

export function cookingFireChance(skill: number): number {
  const level = Math.floor(skill);
  if (level <= 1) return 0.03;
  if (level === 2) return 0.015;
  if (level <= 4) return 0.005;
  return 0;
}

/** Cooking steps a recipe takes (참고 게임 _num_turns: single 3, family 4). */
export function cookingSteps(serves: number): number {
  return serves > 1 ? 4 : 3;
}

export const FIRST_SPREAD = 30;
export const SPREAD_EVERY = 13;
export const MAX_FIRES = 8;
export const ALARM_RADIUS = 10;
/** Minutes of beating at the flames to put one tile out (ours). */
export const EXTINGUISH_TIME = 5;
/** Minutes of panic before a dweller gets a grip (ours). */
export const PANIC_TIME = 4;
/** Minutes after the alarm goes off until the fire brigade has it out (ours). */
export const BRIGADE_AFTER = 30;
/** Without a smoke alarm, minutes until a neighbour sees the smoke and calls the brigade (ours). */
export const NEIGHBOUR_CALLS_AFTER = 120;
/** Minutes a dweller who can't get near any of the flames gets on with things before trying again (ours). */
export const FIRE_RETRY = 20;
