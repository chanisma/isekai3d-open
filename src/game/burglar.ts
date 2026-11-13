/**
 * Burglars after 참고 게임's situation_Burglar (docs/ref-game/04 §4.8): a night-time visitor who takes
 * up to 4 objects (maximum_objects_to_steal), then can't come back for 14 days
 * (buff_Burglar_Hidden_VisitCooldown, 20160 minutes). A burglar alarm calls the police; a dweller
 * can also confront the burglar. Odds, timings and what counts as worth stealing are ours.
 */
export const MAX_STOLEN = 4;
export const BURGLAR_COOLDOWN = 20160;
/** The first day a burglar can come, counted from 0 (3일차; ours, so a new family settles in first). */
export const BURGLAR_FIRST_DAY = 2;
/** Chance of a break-in on a given night once the cooldown is over (ours). */
export const BURGLAR_NIGHTLY_CHANCE = 0.12;
/** Minutes to bag one object (ours). */
export const STEAL_TIME = 12;
/** Minutes from the alarm to the police arriving (ours). */
export const POLICE_AFTER = 20;
/** What a burglar goes for: portable valuables. */
export const STEALABLE = new Set(['tv', 'bigTv', 'computer', 'gamingComputer', 'stereo', 'aquarium', 'guitar', 'piano', 'violin', 'camera', 'telescope', 'easel', 'paintingLandscape', 'paintingAbstract', 'posterPop', 'paintingMaster', 'treadmill']);
/** The burglar's fitness for a fight with a dweller who confronts them (ours). */
export const BURGLAR_FITNESS = 3;
