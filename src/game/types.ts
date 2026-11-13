export type NeedKey = 'hunger' | 'energy' | 'bladder' | 'hygiene' | 'fun' | 'social';
export type Needs = Record<NeedKey, number>;
export type SkillKey = 'cooking' | 'logic' | 'charisma' | 'fitness' | 'painting' | 'guitar' | 'writing' | 'handiness' | 'gardening' | 'comedy' | 'piano' | 'mixology' | 'creativity' | 'mental' | 'motor' | 'childSocial' | 'mischief' | 'videoGaming' | 'talk' | 'imagination' | 'movement' | 'potty' | 'thinking' | 'fishing' | 'rocketScience' | 'programming' | 'violin' | 'gourmet' | 'photography' | 'dancing' | 'singing' | 'djMixing'
  // Competencies a career rests on that 참고 게임 has no skill for (ours; careerSkills.ts).
  | 'empathy' | 'leadership' | 'medicine' | 'science' | 'law' | 'business' | 'language' | 'driving'
  // Competencies of the mind, grown by habits (ours; mind.ts).
  | 'selfControl' | 'persistence' | 'resilience' | 'curiosity';
export type Dir = 'down' | 'up' | 'left' | 'right';
/** Where a dweller is with an aspiration: the step, counters for counted goals, the goals already rewarded. */
export interface AspirationState {
  id: string;
  milestone: number;
  counters?: Record<string, number>;
  since?: number;
  /** Goals of the current step already paid their points (참고 게임 points per objective). */
  paid?: number[];
}
import type { WorkTone } from './careers';
import type { Economy } from './economy';
import type { ActiveWant, WantSet } from './wants';
import type { ConversationMood, RelFlag, Relationship, SocialCategory, Tier } from './relationships';

/** 'void' is open air on an upper floor (nothing built there yet). */
/** A lot's tile. 'wall' and 'door' are the old walls a tile thick: plans are drawn with them, and walls.ts edgeLot lays them on the lines. */
/** 'water' is a harbour's or the sea's, on a work lot (2026-11-04): outdoors, drawn as water, never walked on. */
export type Tile = 'grass' | 'wall' | 'door' | 'wood' | 'carpet' | 'tile' | 'path' | 'void' | 'water';
export type EmotionKey =
  | 'fine'
  | 'happy'
  | 'confident'
  | 'energized'
  | 'flirty'
  | 'focused'
  | 'inspired'
  | 'playful'
  | 'sad'
  | 'angry'
  | 'bored'
  | 'embarrassed'
  | 'stressed'
  | 'uncomfortable'
  | 'dazed'
  | 'scared';

export interface ActiveBuff {
  id: string;
  /** Game minute it expires; null while a need-driven moodlet's condition holds. */
  until: number | null;
}

/** Mutually exclusive moodlet outcomes: one roll, each option taking `chance` of the range. */
export type BuffRoll = Array<{ id: string; chance: number }>;

export interface P {
  x: number;
  y: number;
}

export type Requirement = 'tvNearby' | 'unemployed' | 'employed' | 'hasDishes' | 'broken' | 'hasFood' | 'hasBaby' | 'student' | 'child' | 'billDue' | 'emptyPlanter' | 'thirsty' | 'weedy' | 'ripe' | 'night' | 'dirty' | 'upgradable' | 'toddler' | 'rocketUnbuilt' | 'rocketReady' | 'materialistic' | 'cakeWanted' | 'canAgeUp' | 'cakeBlown' | 'hasSample' | 'fireLit' | 'fireOut' | 'toddlerHungry' | 'highChairServed' | 'pottyReady' | 'atWork' | 'workAlarm';

export interface InteractionDef {
  id: string;
  label: string;
  icon: string;
  /**
   * Many dwellers can do this with the same object at once (참고 게임 watch/listen interactions reserve a
   * spot to stand, not the object).
   */
  shared?: boolean;
  /**
   * A game for this many dwellers, played from either side of the object (참고 게임 GameRules
   * players_per_game, e.g. chess 2).
   */
  players?: number;
  /** Done sitting on a stool or bench in front of the object. */
  seated?: boolean;
  /** The handiness upgrade this installs (upgrades.ts). */
  upgrade?: string;
  /** Free will leaves it alone while the dweller has this moodlet (참고 게임 cooldown buffs). */
  cooldownBuff?: string;
  /**
   * Light enough to chat on top of (참고 게임 attention cost: eating 0.25, TV and music 0.5, sitting
   * and chatting 0; any pair stays under the 1.24 at which its multitasking dice starts to fail).
   */
  chatty?: boolean;
  /** Game minutes (upper bound when `untilFull` is set). */
  duration: number;
  untilFull?: NeedKey;
  /** Need change per game minute while performing. */
  effects: Partial<Needs>;
  /** Multiplier on natural need decay while performing (e.g. sleeping slows hunger). */
  decayMul?: Partial<Needs>;
  skill?: { key: SkillKey; rate: number };
  /**
   * Job education done at home (2026-11-01, the user's): what it's called and how fast it teaches for a dweller whose job
   * rests on this skill (workGrowth.ts hasRelatedJob). `label` and `skill.rate` are what it is without the job.
   */
  withJob?: { label: string; rate: number };
  cost?: number;
  /** Defaults to true. */
  autonomous?: boolean;
  special?: 'findJob' | 'quitJob' | 'washDishes' | 'repair' | 'eat' | 'payBills' | 'plant' | 'water' | 'weed' | 'harvest' | 'clean' | 'upgrade' | 'bakeCake' | 'blowCandles' | 'eatCake' | 'woodwork' | 'analyze' | 'lightFire' | 'putOutFire' | 'serveHighChair' | 'eatHighChair' | 'usePotty' | 'translate' | 'experiment' | 'restyle' | 'cleanHouse';
  /** A `restyle`: what of the look the player picks before the dweller goes (ours; 참고 게임's dresser and mirror). */
  restyle?: 'clothes' | 'hair';
  /** Baby care: need change per minute for the baby in the bassinet while it runs. */
  baby?: Partial<Needs>;
  /** Cooking: servings of food it puts out when done (참고 게임 recipes: single 1, family 4, group 8). */
  serves?: number;
  /**
   * What free will expects from it when the payoff comes later (참고 게임 false advertisement):
   * cooking advertises the hunger the meal will fill.
   */
  advertise?: Partial<Needs>;
  /** Only offered while the dweller feels one of these (참고 게임 emotional interactions). */
  moods?: EmotionKey[];
  /** Moodlets of these emotions are washed away when it's done (calming down, a cold shower). */
  clears?: EmotionKey[];
  /** Aspiration counter to bump instead of the interaction's own id. */
  countAs?: string;
  /** Eating leaves a dirty dish behind. */
  leavesDish?: boolean;
  /** 'on' draws the dweller on top of the object (bed, toilet); 'front' keeps them on the use tile. */
  pose: 'front' | 'on';
  /** How many tiles in front of the object count as use spots. Defaults to 1. */
  range?: number;
  requires?: Requirement;
  /** A skill level needed before it can be done (ours: e.g. translation work needs a language). */
  minSkill?: [SkillKey, number];
  /** Work for one job at one stage of its ladder (workStages.ts): 0 입문, 1 전문 (in a branch), 2 리더. */
  workStage?: { career: string; stage: 0 | 1 | 2; branch?: number };
  /** Only on this career's lot, at any stage (workExtra.ts): the piece may be in other lots too. */
  onlyAt?: string;
  /** Looks like this other use of the same piece: its place, pose and motion (workExtra.ts). */
  drawnAs?: string;
  /** Done away from the lot (a patrol, a call-out, a flight): the dweller isn't drawn while it runs. */
  offLot?: boolean;
  /** Moodlet granted when the interaction finishes. */
  buffs?: BuffRoll;
  /** Utility units drawn per minute while in use (power and/or water). */
  utility?: { power?: number; water?: number };
}

export type Category = 'comfort' | 'kitchen' | 'bathroom' | 'fun' | 'skill' | 'decor';

export interface ObjectDef {
  id: string;
  name: string;
  price: number;
  /** Footprint when facing 'down'. */
  w: number;
  h: number;
  icon: string;
  color: string;
  category: Category;
  interactions: InteractionDef[];
  /** Not sold in buy mode (made in the game, like a birthday cake). */
  unlisted?: boolean;
  /** Flat on the floor (a rug): walked over, and furniture stands on it (`canPlace`). With `walkable`. */
  flat?: boolean;
  /** Drawn as this other def (a workplace's piece sold for the house, homeFurniture.ts). */
  lookOf?: string;
  /** Decor aura: adds `score` to `emotion` for dwellers in the same room (참고 게임 environment score). */
  env?: { emotion: EmotionKey; score: number };
  /**
   * How fast sleeping here wears off Stressed, Uncomfortable and Dazed moodlets (참고 게임 bed tuning
   * statistic_reduction_by_category: none on basic beds, 2 / 3.5 / 4.5 on better ones).
   */
  restfulness?: number;
  /**
   * What a fridge or stove adds to the quality of a dish made with it (참고 게임
   * commodity_Quality_FridgeAndStove_CookingQuality_N: 5.5 for basic models up to 13 for the best).
   */
  cookingQuality?: number;
  /**
   * Quality-tier multipliers after 참고 게임 autonomy_modifiers / lot_statistic_modifiers, relative to our
   * basic model: how much faster it fills Fun, how fast it wears out and how much power it draws.
   */
  funMul?: number;
  wearMul?: number;
  powerMul?: number;
  /** Dwellers that can sit on it side by side, one per tile of its front (참고 게임 sofa parts). */
  seats?: number;
  /**
   * Where it is used from (참고 게임 routing constraints: a fridge or stove from the front, a chair, bed
   * or toilet from any side, a chess table from its two sides). Left out, it follows from the
   * interactions (world.ts accessOf).
   */
  access?: 'front' | 'any' | 'sides';
  /** Walked over rather than around (stairs). */
  walkable?: boolean;
}

export interface PlacedObject {
  uid: number;
  defId: string;
  x: number;
  y: number;
  dir: Dir;
  /** Bought during the current buy-mode visit: sells back at full price. */
  fresh?: boolean;
  /** Came with a rented home: the landlord's, so it can be moved but not sold (lots.ts). */
  landlord?: boolean;
  /** Condition 0..100 for plumbing and appliances; broken at 30 or below (참고 게임 Brokenness). */
  wear?: number;
  /** Minutes of repair already done on it (a repair left half done picks up here). */
  repairDone?: number;
  /** How clean a fixture is, -100..100 (참고 게임 commodity_dirtiness, starts at 100; dirty at -50). */
  dirt?: number;
  /** A high chair with a toddler's meal set out (참고 게임 HighChair_CleanAndServeFood). */
  served?: boolean;
  /** A fireplace burning (참고 게임 Fireplace_Light / _PutOut). */
  lit?: boolean;
  /** A birthday cake: candles still lit until blown out, then slices left to eat. */
  cake?: { blown: boolean; slices: number };
  /** How far a rocket ship is built, 0..100 (rocket.ts). */
  rocket?: number;
  /** Handiness upgrades installed (ids from upgrades.ts). */
  upgrades?: string[];
  /** What's growing in a planter. */
  plant?: import('./garden').Plant;
  /** Points each player has in the chess game on this table (참고 게임 Chess progress). */
  chess?: Record<number, number>;
}

export interface SocialOutcome {
  friend?: Tier;
  romance?: Tier;
  addFlags?: RelFlag[];
  actorBuff?: BuffRoll;
  targetBuff?: BuffRoll;
  /** Nudges to the pair's conversation mood. */
  mood?: Partial<ConversationMood>;
}

export interface SocialRequirement {
  /** A skill level the actor needs (참고 게임 skill-gated socials, e.g. Mischief 3). */
  skill?: { key: SkillKey; level: number };
  friendMin?: number;
  friendMax?: number;
  romanceMin?: number;
  /** Any of these flags also unlocks the social (e.g. partners may always hug). */
  orFlags?: RelFlag[];
  flags?: RelFlag[];
  notFlags?: RelFlag[];
  /** Only a couple (dating, engaged or married), ours: affection waits until they're going out. */
  together?: boolean;
  /** Days since the pair met or reached a stage (`Relationship.since`), ours: no rushing it. */
  after?: { since: RelFlag | 'met'; days: number };
}

export interface SocialDef {
  id: string;
  label: string;
  icon: string;
  duration: number;
  /** Need change per minute for both dwellers (40% of it on a flop). */
  effects: Partial<Needs>;
  category: SocialCategory;
  /** Context score at or above which it lands well, and at or below which it flops. */
  great: number;
  fail: number;
  outcomes: { great: SocialOutcome; ok: SocialOutcome; fail: SocialOutcome };
  requires?: SocialRequirement;
  /**
   * Toddler care, done by an older dweller to a toddler (참고 게임 teach to walk / talk, potty training,
   * feeding): what it does to the toddler per minute instead of `effects`, and the skill it teaches.
   */
  toddler?: { needs?: Partial<Needs>; skill?: SkillKey; rate?: number };
  /** Affectionate socials flop when the target is sad or angry. */
  affectionate?: boolean;
  /** Defaults to true; milestone and mean socials are player-only. */
  autonomous?: boolean;
  /** Emotion that makes free will reach for this social more often. */
  emotion?: EmotionKey;
  /** Steps into the target's conversation group instead of addressing the target alone. */
  join?: boolean;
  /** Only for a townie at the door or passing by ('outside'), or for a guest ('guest'). */
  visitor?: 'outside' | 'guest' | 'burglar';
  /** A piece of the job (workplace.ts): only for the people who come in to these careers' workplaces. */
  work?: string[];
  /** Only towards someone carrying a worry (a fear): hearing it out (colleagueLife.ts). */
  worried?: boolean;
  /** Only towards someone with good news: sharing in it (colleagueLife.ts). */
  joyful?: boolean;
  /** Only from a household dweller to a colleague: asking what's up (dwellerKnowledge.ts askWhatsUp). */
  asks?: boolean;
  /** A skill that makes it land better (each level +2 on the context score, ours). */
  skillCheck?: SkillKey;
}

export type Action =
  | { id: number; kind: 'interact'; objectUid: number; interactionId: string; autonomous: boolean; look?: LookPatch }
  | { id: number; kind: 'goto'; x: number; y: number; autonomous: boolean }
  | { id: number; kind: 'social'; targetId: number; socialId: string; autonomous: boolean }
  | { id: number; kind: 'work'; autonomous: false; slot?: JobSlot }
  /** Fainted: from exhaustion (20 minutes), or `knockedOut` by a burglar until the burglar has gone. */
  | { id: number; kind: 'passout'; autonomous: false; knockedOut?: boolean }
  | { id: number; kind: 'panic'; autonomous: boolean }
  | { id: number; kind: 'extinguish'; x: number; y: number; autonomous: boolean }
  | { id: number; kind: 'mop'; x: number; y: number; autonomous: boolean }
  | { id: number; kind: 'phone'; townieId: number; autonomous: boolean };

/** An action before the game assigns it an id (distributes over the union). */
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;
export type NewAction = WithoutId<Action>;

export interface RunState {
  phase: 'walking' | 'waiting' | 'performing';
  path: P[];
  spot: P | null;
  elapsed: number;
  wait: number;
  repath: number;
  targetTile?: P;
  /** How a social is going to land, decided when it starts. */
  outcome?: 'great' | 'ok' | 'fail';
  /** Seconds left of a stop in a clean zone's way in, and which stops this walk has had (cleanroom.ts). */
  cleanWait?: number;
  cleanDone?: 'robe' | 'shower' | 'both';
  /** Metres climbed up (or down) the flight of stairs to the next point, while on it. */
  climb?: number;
  /** Cooking steps already rolled for a kitchen fire. */
  steps?: number;
  /** When a sleeper's night was done and the lie-in began (참고 게임 WakeupInXHours). */
  restedAt?: number;
  /** Minutes of this sleep that were fitful (sleep.ts restQuality). */
  fitful?: number;
  /** A toddler's crib nap that began at bedtime: their night's sleep (참고 게임 bed_Sleep_Toddler). */
  night?: boolean;
  /** A piece of the job that's going wrong (workTrouble.ts), decided when it starts: it learns less and counts for nothing. */
  workFail?: boolean;
}

/** Which job a shift belongs to: the main one (or school), or a teen's part-time job. */
export type JobSlot = 'job' | 'partTime';

export interface Job {
  /** Go along to the workplace with the dweller at the start of each shift (workplace.ts); left unset until asked at the first shift. */
  follow?: boolean;
  careerId: string;
  /** Rung on the career ladder: the shared levels first, then the branch's. */
  level: number;
  /** When the dweller last got this job or a promotion (for the dead-end-job fear). */
  promotedAt?: number;
  /** Which branch the dweller went into (index into the career's branches). */
  branch?: number;
  /** The branch the player picked ahead of time (참고 게임 asks at the promotion). */
  branchPick?: number;
  /** -100..100; promotion at 100, demotion at -80, fired at -95 (참고 게임). */
  performance: number;
  lastWorkDay: number;
  warnedSkill?: boolean;
  /** How hard to work this shift. */
  tone?: WorkTone;
  /** Daily-task meter 0..1, filled by practising the career skill at home, spent at work. */
  task?: number;
  /** Arrival time and performance change of the current shift. */
  shiftStart?: number;
  shiftDelta?: number;
  /** When this shift's event comes up, and when each event was last seen (careerEvents.ts). */
  eventAt?: number;
  eventsSeen?: Record<string, number>;
  /** Work episodes (episodes.ts): the game day the next scene is due, when this shift's comes up, and the season under way. */
  episodeDay?: number;
  episodeAt?: number;
  episodeSeason?: string;
  /**
   * Work cards the 스페이스기전 AI made that haven't come up yet, oldest first (aiQuestions.ts): the
   * next event takes one of these before another is asked for (`stockedCard`).
   */
  aiCards?: Array<{ id: string; key: string; event: import('./careerEventKit').CareerEvent }>;
  /**
   * Work cards that follow on from the last answer (2026-10-25, at the user's request): how many more
   * may follow, and the situation and answer the next one goes on from (sent once, then cleared).
   */
  cardChain?: { left: number; text?: string; answer?: string };
}

export interface Dweller {
  id: number;
  name: string;
  /** Woman or man (gender.ts, after 참고 게임 Create a Dweller), for life; older saves get one guessed. */
  gender?: import('./gender').Gender;
  shirt: string;
  shirtPrint?: import('./shirtPrint').ShirtPrint | null;
  skin: string;
  hair: string;
  /** The rest of the look from Create a Dweller (looks.ts). */
  hairStyle?: HairStyle;
  /** Whose hair the VRoid character wears (a character's name in models/, `hairsFor`); left out = by `hairStyle`. */
  hairFrom?: string;
  /** The 3D clothes they own (`piece@gender-stage-name`, vrmLooks.ts `garmentsFor`), bought at the clothes shop; their face's own are theirs anyway. */
  closet?: string[];
  /** The 3D clothes they have on, each a character's piece by `gender-stage-name`; left out = by `outfit`/`bottom`. */
  wear?: Wear;
  outfit?: Outfit;
  bottom?: Bottom;
  pants?: string;
  /** The shoes' colour (a 3D character's shoes as they come if none). */
  shoeColor?: string;
  /** The VRoid face playing them (a character's name in models/, e.g. `hana`); left out = picked by id. */
  face?: string;
  /** Eye colour (3D); left out = the face's own. */
  eyes?: string;
  /**
   * Colours for the other parts of their top and bottom (3D: a jacket's shirt, a dress's collar),
   * in the order the edit window shows them; '' leaves one as it is. `shirt` and `pants` are the
   * biggest part's.
   */
  tints?: { tops?: string[]; bottoms?: string[] };
  x: number;
  y: number;
  needs: Needs;
  skills: Record<SkillKey, number>;
  /** The last day each skill was practised and how many days running (ours: steady practice pays). */
  practice?: Partial<Record<SkillKey, { day: number; n: number }>>;
  queue: Action[];
  run: RunState | null;
  job: Job | null;
  away: { until: number; slot?: JobSlot; outing?: string; rocketUid?: number; townieId?: number; restyle?: LookPatch } | null;
  /** A teen's after-school job, next to school in `job` (참고 게임 teen part-time careers). */
  partTime?: Job | null;
  /** Id of the dweller currently socialising with this one (this dweller's own queue is paused). */
  engagedWith: number | null;
  idleTime: number;
  critCooldown: number;
  warned: Partial<Record<NeedKey, boolean>>;
  buffs: ActiveBuff[];
  emotion: EmotionKey;
  /**
   * A townie on the lot rather than a household member: strolling past, waiting at the door to
   * be let in, or visiting as a guest until `until`.
   */
  npc?: { role: 'walkby' | 'doorbell' | 'guest' | 'burglar' | 'service' | 'reaper' | 'ghost' | 'coworker' | 'client'; /** A colleague in the pilot's careers: their stage and title at work (workRoles.ts). Missing from a shift saved before it, or for anyone else: they work as they always did. */ rung?: import('./workRoles').ColleagueRung; /** A client: the colleague on their way to see to them. */ claimedBy?: number; ghostTint?: string; serves?: string; wants?: string; boss?: boolean; until: number; to?: P; leaving?: boolean; invited?: boolean; delivery?: boolean; target?: number; stealing?: number; /** Household members who've squared up to this burglar (each adult once). */ fought?: number[]; service?: import('./services').ServiceKind; arrived?: number; auto?: boolean };
  /**
   * Hurt badly (2026-11-01, at the user's request): a shock, a burn, a beating. Stays until seen to at
   * a hospital or pharmacy (Game.injure, venues.ts `care`): slower, tired sooner, no work or heavy doing.
   */
  injury?: { kind: 'shock' | 'burn' | 'beaten'; since: number };
  /** What they finished last, and how many times running (Game.afterActivity). */
  lastDone?: { id: string; n: number; at: number };
  /** Game minute they last came home from anywhere (Game.stepCabinFever). */
  lastOutAt?: number;
  /** The dweller's parents' ids, for family ties (참고 게임 family relationship bits). */
  parents?: number[];
  /** Dying: the cause, when it began, and who has pleaded with the Grim Reaper (참고 게임 death interactions). */
  dying?: { cause: import('./deaths').DeathCause; at: number; pleaded: number[]; aided?: number[] };
  /** Since when the dweller has been at the top of a deadly emotion (참고 게임 Enraged / Hysterical / Mortified). */
  deadlyMoodSince?: number;
  /** Toddler trait clocks: when they last had company, a parent around, or learnt something. */
  toddlerLast?: { company?: number; parents?: number; learning?: number; every?: number };
  /** Hidden trait needs (참고 게임 commodity_Trait_*), by trait id. */
  traitNeeds?: Record<string, number>;
  /** When the dweller's traits next show in an idle moment (참고 게임 Idle_Trait_* lock-out). */
  traitIdleAt?: number;
  /** When the dweller started their current job, for Commitment Issues. */
  jobSince?: number;
  /** Life stage: babies live in a bassinet, children are smaller and can't do everything. Default adult. */
  age?: 'baby' | 'toddler' | 'child' | 'teen' | 'elder';
  /** When the dweller was born or last aged up. */
  bornAt?: number;
  /** Past the newborn days (참고 게임 infant), and the infant's trait. */
  infant?: boolean;
  infantTrait?: string;
  /** A baby's bassinet, and when its hunger or hygiene first hit bottom. */
  bassinetUid?: number;
  neglectedSince?: number;
  /** Expecting: who with, since when, and when labour started. */
  pregnancy?: { partnerId: number; since: number; laborAt?: number };
  /** The fire (its start time) this dweller has already panicked about. */
  panickedAt?: number;
  /** Moodlet the plate being eaten will leave, set when the dweller takes a serving. */
  meal?: string | null;
  /** A social running on top of the current activity, e.g. chatting from the sofa (참고 게임 multitasking). */
  side?: { targetId: number; socialId: string; elapsed: number; outcome: 'great' | 'ok' | 'fail' };
  /** When free will next looks for someone to chat with without leaving the current activity. */
  sideCheckAt?: number;
  /** Conversation group (참고 게임 SocialGroup): members share an id that lapses a while after the last social. */
  convo?: { id: number; until: number };
  likes?: string[];
  dislikes?: string[];
  /** When each liked activity was last done (preferences.ts MISS_AFTER); from when the like was first looked at. */
  likedAt?: Record<string, number>;
  /** How often each disliked activity has been done lately, and when last (preferences.ts dislikeTimes). */
  dislikedDone?: Record<string, { n: number; at: number }>;
  /** Work that went wrong, by the skill it wanted, and when last (workTrouble.ts workSkillsShort). */
  workFails?: Partial<Record<SkillKey, { n: number; at: number }>>;
  /** Fears the dweller has picked up (fears.ts), and how far they've got facing each. */
  fears?: import('./fears').FearId[];
  fearProgress?: Partial<Record<import('./fears').FearId, number>>;
  /** How strong each is (1–3, fears.ts fearLevel), and when it was last touched — done about, or grown. */
  fearLevel?: Partial<Record<import('./fears').FearId, number>>;
  fearSince?: Partial<Record<import('./fears').FearId, number>>;
  /** How many fears they've overcome, and the day they last talked one over (fears.ts). */
  fearsFaced?: number;
  fearTalkDay?: number;
  /** Good news a colleague came in with, to be shared (colleagueLife.ts JOY_BY_ID). */
  joy?: string;
  /** Day of the last daily fear check and of the last night's dark roll. */
  fearDay?: number;
  fearNight?: number;
  /** Minutes spent outside in the dark in one go. */
  darkMinutes?: number;
  /** The bed this dweller sleeps in; free will leaves other dwellers' beds alone (참고 게임 use_only). */
  bedUid?: number;
  /** Personality trait ids (up to 3). */
  traits: string[];
  /** Objects free will skips until the given game minute (after failing to use them). */
  avoid?: Record<number, number>;
  /** Next game minute free will reconsiders an autonomous activity in progress. */
  reconsiderAt?: number;
  /** Chosen aspiration, the milestone being worked on (0..3, 4 = done) and goal counters. */
  aspiration?: AspirationState;
  /** Every aspiration the dweller has had, as far as they got (꿈의 발자취; picking one again carries on). */
  aspirationLog?: Record<string, AspirationState>;
  /** Areas of life the dweller has tried something in, and how often (aspirations.ts areaOfActivity). */
  triedAreas?: string[];
  areaCounts?: Record<string, number>;
  /** Career fields looked at in the career explorer. */
  explored?: string[];
  /** Days worked, by kind of work (careerTypes.ts). */
  workDays?: Partial<Record<import('./careerTypes').WorkType, number>>;
  /** Up to three jobs the player has marked as interesting for this dweller (no goal hangs on them). */
  interestJobs?: string[];
  /** What the dweller has learnt about others, by their id (dwellerKnowledge.ts, after 참고 게임 DwellerKnowledge). */
  knows?: Record<number, import('./dwellerKnowledge').Known>;
  /** The bonus trait the current aspiration's area gives (taken back when it changes). */
  aspBonus?: string;
  /** The area "나를 찾아가는 여행" found the dweller enjoys most. */
  suggestedArea?: string;
  /** Every interaction the dweller has ever done (호기심 grows from the first time; mind.ts). */
  tried?: string[];
  /** Older saves only: answers at work were kept per dweller before they were the player's (GameState.player). */
  knowledge?: import('./knowledge').PlayerKnowledge;
  /** Want slots, satisfaction points and want bookkeeping. */
  wants?: ActiveWant[];
  satisfaction?: number;
  wantCooldown?: Record<string, number>;
  wantChain?: Partial<Record<WantSet, number>>;
  wantFillAt?: number;
}

/**
 * What an answer at work came to (2026-10-26, at the user's request: a work card, a task card and an
 * episode's decision each show their result, not only a line in the log): what was chosen, whether a
 * gamble came off and what happened, and what it changed.
 */
export interface WorkResult {
  dwellerId: number;
  kind: 'card' | 'task' | 'episode';
  /** The job's icon and name, or the season's title. */
  title: string;
  /** What the player chose or wrote; null for 모르겠어요. */
  chose: string | null;
  /** A gamble: whether it came off (none for a sure answer). */
  ok?: boolean;
  /** What happened, the dweller named. */
  text?: string;
  /** A task card's example answer. */
  example?: string;
  /** A 전공 지식 card's major. */
  major?: string;
  /** A line on how it usually goes in the field (`fieldNote`): never says the answer was right or wrong. */
  insight?: string;
  perf: number;
  money?: number;
  skill?: { key: SkillKey; amount: number };
  buff?: string;
  friends?: Array<{ name: string; n: number }>;
  /** What comes of it next: the next card goes on from it, the next scene, or the season ended. */
  next?: 'card' | 'scene' | 'final';
}

export interface GameState {
  /** What the game has come to know about the player from their answers at work (knowledge.ts). */
  player?: import('./knowledge').PlayerKnowledge;
  /** This game's own key, telling its dwellers from other games' in what's kept on 스페이스기전 (aiQuestions.ts). */
  key?: string;
  /** Questions to think about from the 스페이스기전 AI, waiting for the player (aiQuestions.ts). */
  thoughts?: import('./aiQuestions').Thought[];
  /** The last AI questions' first words, so the next ones don't repeat them. */
  aiAvoid?: string[];
  /** The guide for a first game (tips.ts): whether it shows, and the tips done or passed. */
  tips?: { on: boolean; done: string[] };
  version: 1;
  /** Game minutes since day 0 (Monday) 00:00. */
  time: number;
  speed: number;
  money: number;
  dwellers: Dweller[];
  objects: PlacedObject[];
  relationships: Record<string, Relationship>;
  activeDwellerId: number;
  freeWill: boolean;
  economy?: Economy;
  /** Dirty dishes waiting by the sink. */
  dishes?: number;
  /** Cooked food waiting to be eaten: servings left, when it was made and by whom. */
  food?: Array<{ servings: number; madeAt: number; cookId: number; quality?: number; buff?: string | null }>;
  nextConvoId?: number;
  /** The neighbourhood's townies (household ids are 1..4, townies 101 and up). */
  townies?: import('./visitors').Townie[];
  nextWalkbyAt?: number;
  /**
   * Published books paying royalties each morning (books.ts): per-day amount, payments left (none
   * for a bestseller, which pays for good, halving over an adult's stage), and the rating.
   */
  royalties?: Array<{ title: string; author: string; authorId?: number; perDay: number; left?: number; fromDay?: number; stars?: 1 | 2 | 3 | 'best' }>;
  lastRoyaltyDay?: number;
  booksWritten?: number;
  /** The phone's stock app (stocks.ts): shares held at real prices, orders waiting for a real close, the starred list. */
  stocks?: import('./stocks').StockState;
  /** Old saves' wallpaper and flooring per named room; carried into `paint` when loaded (lots.ts legacyPaint). */
  decor?: import('./decor').HouseDecor;
  /** Wallpaper and flooring per tile (lots.ts). */
  paint?: import('./lots').Paint;
  /** Old saves' wall tiles with a window in them; carried into `walls` when loaded (walls.ts edgeLot). */
  windows?: number[];
  /** Walls, doors and windows on the edges between tiles (walls.ts). */
  walls?: import('./walls').Walls;
  /** The home lot: which plan, its front door and its street (lots.ts). Left out on a work lot. */
  lot?: import('./lots').LotInfo;
  /** The old house's garden has been set out as trees and bushes (older saves get it once). */
  yardPlanted?: boolean;
  /** Puddles on the floor and when each formed (they dry up after a while). */
  puddles?: Array<{ x: number; y: number; since: number }>;
  /** Burning tiles, when the current fire started and when it next spreads. */
  fires?: P[];
  fireStartedAt?: number;
  fireSpreadAt?: number;
  /** Whether a smoke alarm heard this fire, and when the brigade arrives. */
  brigadeAt?: number;
  /** How fast dwellers age (참고 게임 lifespan setting); 'off' stops ageing past childhood. */
  lifespan?: 'normal' | 'off';
  /** Townies who turned down moving in, until when they won't be asked again. */
  moveInRefusedUntil?: Record<number, number>;
  /** Burglary: no break-ins until this time, objects taken tonight, and when the police arrive. */
  burglarCooldownUntil?: number;
  lastBurglarRollDay?: number;
  stolen?: PlacedObject[];
  policeAt?: number;
  /** A pizza on its way: when the delivery person sets off. */
  pizzaAt?: number;
  /** Hired help on the way, and a maid booked to come every day (참고 게임 recurring service). */
  /** `auto`: the babysitter called because no one was left at home with the little ones. */
  serviceCalls?: Array<{ kind: import('./services').ServiceKind; at: number; auto?: boolean }>;
  /** Shifts being played on work lots (workplace.ts), one a dweller at work: who, which job slot, and the work lot itself. */
  workSessions?: Array<{ dwellerId: number; slot: JobSlot; state: GameState }>;
  /** Saves from before more than one work lot (2026-10-25): the one shift then, moved into workSessions on load. */
  workSession?: { dwellerId: number; slot: JobSlot; state: GameState };
  /** Whose each star is (stars.ts): the first dweller of the household to work in their field, by star id. */
  starOwners?: Record<string, number>;
  /** Dwellers off to their first shift at a workplace, waiting for the player to say whether to go along (workplace.ts). */
  followAsks?: Array<{ dwellerId: number; slot: JobSlot }>;
  /** Something happening at work that waits for the player's answer (careerEvents.ts). */
  careerEvent?: { dwellerId: number; slot: JobSlot; eventId: string; at: number; ai?: import('./careerEventKit').CareerEvent; aiId?: string };
  /** A work episode's scene on screen, waiting for the decision (episodes.ts). */
  episode?: import('./episodes').EpisodeOpen;
  /** What the player's answer at work came to, on screen until they've read it (time waits). */
  workResult?: WorkResult;
  /** On a work lot: what the shift is about (workplace.ts WorkInfo). */
  workplace?: import('./workplace').WorkInfo;
  /** The day the household was last warned it can't afford food. */
  lastBrokeDay?: number;
  /** Household members who have died, for their ghosts (참고 게임 urns keep them). */
  dead?: import('./deaths').DeadDweller[];
  /** Things the household has made, waiting to be sold (참고 게임 household inventory). */
  inventory?: Array<{ name: string; value: number; maker: string }>;
  /** Furniture put away, to be set down again free (참고 게임 household inventory): taken along on moving house, or put away in buy mode. */
  storage?: PlacedObject[];
  /** The speed the game ran at before buy mode stopped it (참고 게임 stops time in build and buy mode); put back on leaving. */
  pausedForBuy?: number;
  /** Land bought to build a home on before moving in (Game.buyLand): its own lot, with no one living there yet. */
  site?: GameState;
  /** Microscope slides from rocks found (참고 게임 MicroscopeSlide_Collect*), used up by analysing. */
  samples?: number;
  maidDaily?: boolean;
  lastMaidDay?: number;
  /** Townies who said yes on the phone, and when they'll be at the door. */
  invites?: Array<{ townieId: number; at: number }>;
  /** The lot's tiles: floors, lawn, path and open air upstairs (old saves': walls and doors too). */
  tiles?: Tile[];
  /** Collectibles the household has found, by collection (collections.ts). */
  collections?: Record<string, string[]>;
  /** Day a neighbour last phoned the household. */
  lastCallDay?: number;
  /** The last day the neighbourhood moved on (neighbourhood.ts). */
  lastNeighbourhoodDay?: number;
  /** How close neighbours are with each other, by pair (neighbourhood.ts bondKey). */
  streetBonds?: Record<string, number>;
  /** The street's news, newest last. */
  streetNews?: Array<{ t: number; text: string }>;
  /** A neighbour on the phone asking for advice, or calling back to say thanks (참고 게임 NeighborRelPhoneCall). */
  neighbourCall?: { phase: 'ask' | 'thanks'; fromId: number; aboutId: number; dwellerId: number; at: number };
  /** The thank-you call to come, after a "yes". */
  adviceFollowUp?: { fromId: number; aboutId: number; dwellerId: number; at: number };
  lastAdviceCallAt?: number;
  /** A house party under way (party.ts). */
  party?: import('./party').Party;
  nextDoorbellAt?: number;
  nextUid: number;
  nextActionId: number;
}

/** What of a dweller's look the edit window, the wardrobe, the mirror or the salon changes. */
export type LookPatch = Partial<Pick<Dweller, 'name' | 'skin' | 'hair' | 'hairStyle' | 'hairFrom' | 'closet' | 'wear' | 'outfit' | 'shirt' | 'bottom' | 'pants' | 'shoeColor' | 'face' | 'eyes' | 'tints' | 'shirtPrint'>>;

/** Hair styles (looks.ts); the drawn figure shows the newer ones as the nearest of its first five. */
export type HairStyle = 'short' | 'long' | 'bun' | 'curly' | 'buzz' | 'ponytail' | 'twintails' | 'bob' | 'spiky' | 'braids' | 'crop' | 'wolf';
/** Tops; a dress covers the bottoms too. The drawn figure shows any top but a dress as a tee. */
export type Wear = Partial<Record<'tops' | 'bottoms' | 'shoes', string>>;
export type Outfit = 'tee' | 'dress' | 'hoodie' | 'sweater' | 'shirt' | 'jacket' | 'overalls' | 'uniform';
export type Bottom = 'pants' | 'shorts' | 'skirt';

export interface DwellerSpec {
  name: string;
  gender?: import('./gender').Gender;
  shirt: string;
  shirtPrint?: import('./shirtPrint').ShirtPrint | null;
  skin: string;
  hair: string;
  hairStyle?: HairStyle;
  outfit?: Outfit;
  /** Trousers, shorts or a skirt, and their colour (looks.ts); left out = trousers in navy. */
  bottom?: Bottom;
  pants?: string;
  /** The shoes' colour (a 3D character's shoes as they come if none). */
  shoeColor?: string;
  face?: string;
  eyes?: string;
  tints?: Dweller['tints'];
  /** The 3D look picked in character creation (Dweller's fields of the same names). */
  hairFrom?: string;
  wear?: Dweller['wear'];
  closet?: string[];
  /** Activities the dweller likes and dislikes (ids from preferences.ts). */
  likes?: string[];
  dislikes?: string[];
  traits?: string[];
  aspiration?: string;
}
