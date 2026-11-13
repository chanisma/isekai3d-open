import type { P, DwellerSpec, SkillKey } from './types';

/**
 * The neighbourhood, after 참고 게임's ambient situations (docs/ref-game/04 §4.5): townies stroll past
 * the lot in the daytime (WalkbyAmbientSituation), now and then one rings the doorbell and waits
 * an hour to be let in (WalkbyRingDoorBellSituation, wait_for_invitation_delay 60), and a guest
 * who is welcomed stays for up to four hours (GreetedNPCVisitingPlayerSituation, duration 240).
 * 참고 게임 tunes 3-15 walkers for a whole street; our one lot shows at most two at a time.
 */

export interface Townie extends DwellerSpec {
  id: number;
  /** Adult if left out. A baby stays at home and isn't met yet. */
  age?: 'baby' | 'child' | 'teen' | 'elder';
  /** Game minute this life stage began (neighbourhood.ts ages them as the household's dwellers age). */
  stageStart?: number;
  /** The household they live in (neighbourhood.ts NEIGHBOR_HOUSES). */
  home?: string;
  /** Who they are at home: 엄마, 아들, 할머니 … */
  role?: string;
  /** Their job: a career and a level of its first track (a teen's part-time job too). */
  job?: { careerId: string; level: number; branch?: number };
  /** The job an elder retired from. */
  retiredFrom?: string;
  /** What they're good at (townieSkills.ts): kept up with their age and job, theirs if they move in. */
  skills?: Partial<Record<SkillKey, number>>;
  /** Who they go out with, or are married to (neighbourhood.ts streetLife). */
  partnerId?: number;
  married?: boolean;
  /** Since when they've been going out (game minutes). */
  datingSince?: number;
  /** Their parents' ids, for families that go on (and not dating family). */
  parents?: number[];
  /** Someone's colleague (colleagues.ts): which workplace, their place in its list, and whether they're the boss. Off the street. */
  workmate?: { careerId: string; slot: number; boss?: boolean; staff?: string };
  /** One of the stars (stars.ts), kept with whoever they work beside. */
  star?: string;
  /** Someone a work episode brought in (episodes.ts): whose story, and their place in it («<season>:<key>»). */
  episodeOf?: number;
  episodeKey?: string;
  /** A colleague's own goal at work (colleagueLife.ts COLLEAGUE_GOALS). */
  goal?: string;
  /** A colleague's worries (fears that go with work, colleagueLife.ts), and how far through each. */
  fears?: import('./fears').FearId[];
  fearProgress?: Partial<Record<import('./fears').FearId, number>>;
  fearLevel?: Partial<Record<import('./fears').FearId, number>>;
  /** The day someone last heard their worries out (once a day). */
  fearTalkDay?: number;
  /** Good news they came in with today, to be shared (colleagueLife.ts COLLEAGUE_JOYS). */
  joy?: string;
}

export const TOWNIE_ID_BASE = 101;
/** Minutes a welcomed guest stays (참고 게임 visit situation duration). */
export const VISIT_LENGTH = 240;
/** Minutes a visitor waits at the door to be let in (참고 게임 wait_for_invitation_delay). */
export const DOOR_WAIT = 60;
/** Invited townies turn up this many minutes after the call, give or take (참고 게임 allows up to 120). */
export const INVITE_DELAY: [number, number] = [20, 60];
/** Townies are asleep and won't come over between 23:30 and 06:30 (참고 게임 phone_Invite_Over). */
export function asleepAt(minuteOfDay: number): boolean {
  return minuteOfDay >= 23 * 60 + 30 || minuteOfDay < 6 * 60 + 30;
}
/** 참고 게임 ServiceNpc_PizzaDelivery: §25 up front for a large pizza (recipe_Food_Pizza_Cheese, 8 servings). */
export const PIZZA_PRICE = 25;
export const PIZZA_SERVINGS = 8;
/** Minutes until the pizza turns up (ours). */
export const PIZZA_DELAY: [number, number] = [40, 70];
/** Most townies strolling past at once. */
export const MAX_WALKERS = 2;
/** Guests head home when any need drops this low. */
export const GUEST_LEAVE_NEED = 20;

/** The street along the bottom of the lot, and the tile in front of the front door. */
export const STREET_Y = 16;
export const STREET_ENDS: [P, P] = [
  { x: 0, y: STREET_Y },
  { x: 25, y: STREET_Y },
];
export const DOORSTEP: P = { x: 12, y: 15 };

/** Things a guest won't do in someone else's home (참고 게임 visitors don't cook, sleep or clean). */
export const GUEST_FORBIDDEN = new Set(['sleep', 'nap', 'cook', 'cookFamily', 'washDishes', 'repair', 'findJob', 'quitJob', 'study', 'cookbook', 'speech', 'shower', 'takeBath', 'bubbleBath']);
