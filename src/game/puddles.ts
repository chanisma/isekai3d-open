/**
 * Puddles after 참고 게임 (docs/ref-game/02 §4.4): a bladder accident always leaves one
 * (loot_BladderFailure_PuddleChance 100), a shower one time in seven (loot_ShowerTub_PuddleChance:
 * none 6 : small 1), and they dry out on their own (commodity_Object_Puddle_Evaporation, 1 per
 * minute) unless someone mops them up first.
 */
export const SHOWER_PUDDLE_CHANCE = 1 / 7;
/** Minutes until a puddle has dried (ours: about two thirds of the evaporation commodity's range). */
export const PUDDLE_DRIES_AFTER = 720;
/** Minutes of mopping per puddle (ours). */
export const MOP_TIME = 5;
/** Each puddle counts against the room's environment like a dirty dish (ours). */
export const PUDDLE_ENV = 5;
