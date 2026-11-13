import { ALREADY_SOLVING, SHARED_KIND, adEffects, ageAllows, chooseAutonomous, chooseSideSocial, needsServed, pressingNeeds, rankOptions, remainingScore, topChoices } from './autonomy';
import { CAREER_BY_ID, DEMOTE_AT, FIRE_AT, FULL_DAY_SHARE, MISSED_WORK_PENALTY, PROMOTE_AT, TONES, WEEKDAYS, chooseBranch, levelOf, meetsNeeds, needsText, nextLevelOf, shiftPerformance, topLevelOf, PERF_PACE } from './careers';
import { workDrive } from './workDrive';
import { COLLEAGUE_FACES, colleagueHome, colleaguesFor } from './colleagues';
import { COLLEAGUE_NEED_FLOOR, JOY_BY_ID, drawGoal, listenShare, seedBond, shiftJoy, shiftWorries } from './colleagueLife';
import { STARS, STAR_BY_ID, STAR_ID, starTownie, starsOfCareer } from './stars';
import { EPISODE_BUFF, EPISODE_GAP, FREE_DEFAULT, episodeRequest, gameKeyOf, readEpisode, type EpisodeOpen, type EpisodeOutline, type EpisodeScene } from './episodes';
import { FAIL_LEARN, TROUBLES, hardDayChance, troubleChance, workNeed, workSkillOf, workSuccess, type Trouble } from './workTrouble';
import { SKILL_PROFILES, jobSkill } from './careerSkills';
import { POWER_CUT_AFTER, WARNING_AFTER, WATER_CUT_AFTER, billAmount, newEconomy, objectValue, type Economy, type Utility } from './economy';
import { BROKEN_AT, CLEAN_RATE, DIRTY_AT, DIRT_PER_USE, ELECTRONICS, SOILABLE, TVS, WEARABLE, WEAR_CHANCE, WEAR_PER_USE, getDef, repairTime, shockChance } from './catalog';
import { HAIR_COLORS, CHILD_SKILLS, CHILD_SKILL_OF, MINOR_SKILLS, TODDLER_MAX_SKILL, TODDLER_SKILLS, TODDLER_SKILL_OF, DISCOURAGE_COST, DISTRESS_LEVEL, MAX_QUEUE, MAX_SKILL, NEED_INFO, NEED_KEYS, NO_SKILLS, SHIRT_COLORS, SKILL_INFO, SPEEDS, streakMultiplier, LEARN, levelCost, routineFactor, START_MONEY, START_TIME, SKIN_COLORS, TRAVERSAL_COST, ULTRA_SPEED, WALK_SPEED, WORK_DECAY, WORK_NEED_FLOOR } from './constants';
import { distTo, nearest, pathTo, routeFrom, type DistMap, type Links } from './path';
import { SKILL_EMOTION, EMOTIONS, BUFFS, CONDITION_BUFF_IDS, allNeedsBuff, environmentBuff, isEnvironmentBuff, computeEmotion, needBuff, skillGainMultiplier, type EmotionState } from './emotions';
import { addSentiment, contextScore, sentimentContext, friendStage, newRelationship, refusesAffection, tickRelationship, trackDelta, type FriendStage, type Relationship, type Tier } from './relationships';
import { GROUP_LINGER, GROUP_RADIUS, LISTENER_SHARE, SIDE_RANGE, fightWinChance, socialFits, SOCIALS, SOCIAL_BY_ID, relKey, socialBlocker } from './socials';
import { MAX_TRAITS, REMOVED_BUFFS, REMOVED_TRAITS, TRAITS, TRAIT_BY_ID, conflictsWith, drawTraits, hasTrait, traitBuffReplacement, traitBuffWeight, traitFitsAge, traitNeedMul, traitsOf } from './traits';
import { TIPS } from './tips';
import { AREA_TRAITS, ASPIRATION_BY_ID, ASP_AREAS, COMPLETION_BONUS, areaOfActivity, aspirationsFor, goalMet, type AspArea } from './aspirations';
import { TYPE_ACTIVITIES, typesOf } from './careerTypes';
import { EVENT_COST, GOAL_SCORE, PARTY_COST, PARTY_GUESTS, newBirthday, newDate, newDinner, newParty, partyMedal, partyName, partyProgress, type Party, type PartyGoalKind } from './party';
import { OUTING_MINUTES, VENUE_BY_ID, venueOpen } from './venues';
import { UPGRADE_BY_ID, hasUpgrade, hygieneMultiplier } from './upgrades';
import { COLLECTION_BY_ID, rollItem } from './collections';
import { CONFIDANT_FRIENDSHIP, FACED_RESILIENCE, FEAR_BY_ID, FEAR_GROW_DAYS, FEAR_LEVEL_LABEL, MAX_FEARS, MAX_FEAR_LEVEL, MONEY_SAFE, RESILIENCE_SHARE, TALK_SHARE, fearBuffScale, fearDrag, fearLevel, fearOdds, type FearId } from './fears';
import { nextBite, rollCatch } from './fishing';
import { BUILD_RATE, FLIGHT_MINUTES, rollAdventure } from './rocket';
import { DRINK_TIERS, drinkBuff, drinkQuality, drinkTier } from './drinks';
import { FOOD_BUFFS, dishQuality, mealBuff } from './food';
import { paintingQuality, paintingValue } from './painting';
import { BURGLAR_COOLDOWN, BURGLAR_FIRST_DAY, BURGLAR_FITNESS, BURGLAR_NIGHTLY_CHANCE, MAX_STOLEN, POLICE_AFTER, STEALABLE, STEAL_TIME } from './burglar';
import { ACTIVITIES, DISLIKE_STRONG, MAX_DISLIKES, MAX_LIKES, MISS_AFTER, MISS_STRONG_AFTER, activityOf, dislikeTimes, randomPreferences, socialGainMul, socialLiking } from './preferences';
import { growPlant, harvestValue, newPlant, REGROW_FROM, ripe } from './garden';
import { ROYALTY_DEVIATION, ROYALTY_HOUR, STARS_LABEL, bookFinishChance, bookStars, bookTitle, readerShare, royaltyDays, royaltyOn, royaltyPerDay } from './books';
import { MOP_TIME, PUDDLE_DRIES_AFTER, PUDDLE_ENV, SHOWER_PUDDLE_CHANCE } from './puddles';
import { FLOOR_BY_ID, WALL_BY_ID, type Room } from './decor';
import { DAILY_FADE, EARN_MINUTES, LOT_TRAIT_BY_ID, LOT_TRAIT_SKILL_MUL, livedTraits, traitFor, traitsBuiltBy, traitsBuiltByHabit } from './lotTraits';
import { EMPTY_LOT, PLAN_BY_ID, STARTER, STARTER_LOT, type LotPlan, type Tenure, autoWindows, doorstepOf, exitOf, legacyPaint, lotInfoOf, planObjects, planPaint, planTiles, planWindows, streetEndsOf, type LotInfo, type Paint } from './lots';
import { BABY_STAGES, INFANT_TRAITS, BABY_DECAY, CHILD_FORBIDDEN, LABOR_LENGTH, LIFESPANS, NEGLECT_LIMIT, POTTY_TRAINED, PREGNANCY_LENGTH, TODDLER_ALLOWED, TODDLER_DECAY, TRY_FOR_BABY_CHANCE, isYoung } from './babies';
import { ALARM_RADIUS, BRIGADE_AFTER, EXTINGUISH_TIME, FIRE_RETRY, FIRST_SPREAD, MAX_FIRES, NEIGHBOUR_CALLS_AFTER, PANIC_TIME, SPREAD_EVERY, cookingFireChance, cookingSteps } from './fire';
import { DOOR_WAIT, GUEST_LEAVE_NEED, INVITE_DELAY, MAX_WALKERS, PIZZA_DELAY, PIZZA_PRICE, PIZZA_SERVINGS, VISIT_LENGTH, asleepAt, type Townie } from './visitors';
import { babyCarrier, guessGender, pickName, type Gender } from './gender';
import { isRomanceAsk, refusalDays, romanceAcceptance } from './romanceAcceptance';
import { needClient, needFriendship, needRomance, needReason, needSkill, needSpeaking, needWalk, needWork } from './needEffects';
import { MOOD_EFFECTS, moodClient, moodDecay, moodFallingOut, moodReason, moodWalk, moodWork } from './moodEffects';
import { CALL_RING, FOLLOW_UP, NEIGHBOUR_CALL_COOLDOWN, ageNeighbourhood, awayReason, castColours, giveEveryoneTraits, growBond, leaveStreet, neighbourFromDweller, pickAdviceCall, settleNeighbourhood, stepStreetBonds, welcomeNewcomer, whereabouts, type NeighbourEvent } from './neighbourhood';
import { DEEP_TALK_CHANCE, TALK_CHANCE, askWhatsUp, factsOf, fieldHeard, hearAboutJob, innerOf, learnOne, slipInner } from './dwellerKnowledge';
import { CHAIN_BOOST, STORE, WANT_BY_ID, WANT_COOLDOWN, cooldownKey, fillWants, fulfils, wantGuest, wantJobSkill, wantLabel, type ActiveWant, type WantEvent } from './wants';
import type { Action, BuffRoll, Job, JobSlot, Dir, GameState, LookPatch, SocialDef, SocialOutcome, InteractionDef, NeedKey, Needs, NewAction, P, PlacedObject, RunState, Dweller, DwellerSpec, SkillKey, Tile, WorkResult } from './types';
import { clamp, clockInfo, josa } from './util';
import { DEADLY_MOODS, DEADLY_MOOD_MINUTES, DEATHS, DYING_MINUTES, PLEAD_CHANCE, type DeathCause } from './deaths';
import { pickWoodwork, woodworkQuality, woodworkValue } from './woodwork';
import { SERVICES, SERVICE_DELAY, nextOpening, serviceBill, type ServiceKind } from './services';
import { FITFUL, LIE_IN, SICK_CHANCE, SICK_REST_MUL, WAKE_NEED, dayStart, restQuality, sleepDesire, wakeTime } from './sleep';
import { computeRooms, roomAt, setRooms, useRooms } from './gfx/house';
import { EVENT_AUTO_ANSWER, EVENT_BY_ID, EVENT_CHANCE, EVENT_DELAY, eventText, eventsFor, fieldNote, successChance } from './careerEvents';
import { workLayout } from './workplaceKit';
import { DUTY_FUN_BELOW, MIND_GAIN, MIND_SKILLS, badMoodFactor, curiosityBoost, isDuty, setbackFactor, streakCap, streakGrace } from './mind';
import { claimKnowledge, mergeKnowledge, newKnowledge, rememberAnswer, rememberThought, syncMerge, type PlayerKnowledge } from './knowledge';
import { WORK_LEARN, WORK_TONE_LEARN, forDweller, hasRelatedJob, homeCapNote, homePracticeFactor, workSkills } from './workGrowth';
import type { CareerEvent } from './careerEventKit';
import { LIFE_EVENT_LABEL, careerContextKey, careerRequest, exploreRequest, lifeRequest, remember, toCareerEvent, toThinkCard, type CloudPort, type LifeEvent } from './aiQuestions';
import { HONEST_CHOICE } from './eventValues';
import { colleagueAt, roleAt, workVariant, type WorkVariant } from './workRoles';
import { fitTask, stageLock, stageOf, type StageAt } from './workStages';
import { cleanPause } from './cleanroom';
import { CLIENT_ID_BASE, IDEAL_MOOD_BONUS, POINTS, WORKPLACES, clientName, dailyTasks, shiftDelta, workLotKey, workplaceOf, type ClientSpec, type WorkplaceDef } from './workplace';
import { LEVEL_TILES, MAP_H, MAP_W, accessOf, accessTiles, buildBlocked, canPlace, dims, flight, footprintTiles, frontTiles, idx, levelOf as floorOf, levelsOf, objectCenter, reachesFrom, type Blocked } from './world';
import { between, edgeKey, edgeLot, edgeTiles, faceKeys, gridBetween, lineEdges, type Side, type Walls } from './walls';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'bad';
  at: number;
  /** Game time it happened, for the notification log. */
  time?: number;
  /** The dweller it is about: their face shows, and clicking it selects them (참고 게임 primary_icon_response). */
  dwellerId?: number;
  /** 참고 게임 UiDialogNotification visual_type / urgency: a special moment or an urgent one; plain information otherwise. */
  look?: 'urgent' | 'moment';
}

/** A big moment shown across the middle of the screen for a few seconds (참고 게임 ui/screen_slam.py). */
export interface Slam {
  id: number;
  title: string;
  text: string;
  icon: string;
  at: number;
}

export interface NotifyOpts {
  dwellerId?: number;
  look?: Toast['look'];
  /** Slam it too: only for the selected dweller (참고 게임 active_dweller_only), unless it is the whole household's. */
  slam?: { title: string; icon: string; household?: boolean };
}

/** Bad news that needs the player now (ours, standing in for 참고 게임's per-notification URGENT tuning). */
const URGENT_MARK = /^(🚨|🔥|🦹|💀|⚠️)/;

export interface MenuOption {
  id: string;
  label: string;
  icon: string;
  disabled?: string;
  /** Said of it though it can be done (home study gone as far as it goes without a job). */
  note?: string;
  /** The pie-menu category it sits under (참고 게임 groups socials as Friendly, Funny, Romance…). */
  group?: string;
}

/** 참고 게임's social pie categories. */
const SOCIAL_GROUPS: Record<string, string> = { friendly: '😊 친근함', funny: '😄 재미', romance: '💕 로맨스', mischief: '😈 장난', mean: '😠 짓궂음' };
/** Socials that stay at the top of the menu: they're about the visit or the moment, not a mood. */
const TOP_LEVEL_SOCIALS = new Set(['joinConversation', 'welcome', 'askToLeave', 'confrontBurglar', 'askAboutCareer']);

const STEP = 0.5;
/** Path cost of climbing a flight of stairs (about four tiles' walk). */
const STAIR_COST = 4;
/** Minutes until leftovers go off. */
const FOOD_SPOILS_AFTER = 1440;


/** The gift a mastered child skill leaves (참고 게임 aspiration_Child_*_A3 -> trait_*Gifted). */
const CHILD_GIFTS: Partial<Record<SkillKey, string>> = { creativity: 'creativelyGifted', mental: 'mentallyGifted', motor: 'physicallyGifted', childSocial: 'sociallyGifted' };

/** Build mode's tools (참고 게임: wall, room, door, window, floor and terrain tools, and the sledgehammer). */
export type BuildTool = 'wall' | 'room' | 'door' | 'window' | 'remove' | 'floor' | 'path';
/** What a tile of wall, a door, demolition and a tile of floor cost (ours). */
/** Per tile; a room costs its new walls and floor at the wall and floor prices. */
export const BUILD_COST: Record<BuildTool, number> = { wall: 40, room: 0, door: 120, window: 100, remove: 0, floor: 15, path: 10 };
const FLOOR_TILES = new Set<Tile>(['wood', 'tile', 'carpet']);

/**
 * Activities another dweller can be asked to join, with what counts as joining in (참고 게임 rallyables:
 * GoThenWatchTV, InstrumentListen, PlayChess, Workout, DoHomework, ToysPlay, Bookshelf_Read,
 * Garden, JungleGym/MonkeyBars, BuildRocket, video games; eating together and fishing are ours).
 */
const JOIN_AS: Record<string, string[]> = {
  watch: ['watchTv', 'watch'],
  watchTv: ['watchTv', 'watch'],
  listen: ['listen', 'dance'],
  dance: ['dance', 'listen'],
  watchFish: ['watchFish'],
  playChess: ['playChess'],
  eat: ['eat'],
  read: ['read'],
  homework: ['homework'],
  playToys: ['playToys'],
  workout: ['workout'],
  playBars: ['playBars', 'hangBars'],
  hangBars: ['hangBars', 'playBars'],
  waterPlant: ['waterPlant', 'weedPlant'],
  weedPlant: ['weedPlant', 'waterPlant'],
  buildRocket: ['buildRocket'],
  game: ['game'],
  relax: ['relax'],
  fish: ['fish'],
  stargaze: ['stargaze'],
};
/** Why someone turns an invitation down for a need of their own. */
const NEED_EXCUSE: Partial<Record<NeedKey, string>> = { hunger: '배가 고프대요', energy: '너무 피곤하대요', bladder: '화장실이 급하대요', hygiene: '먼저 씻고 싶대요' };

/** A baby cries below this hunger or hygiene (ours), and wakes sleepers like 참고 게임's crying infant. */
const CRY_AT = 30;
const CRY_WAKE_CHANCE = 0.75;
const CRY_PING = 10;
/** A ghost comes out about once in this many night minutes per urn (ours). */
const GHOST_EVERY = 600;
/** The emotion each deadly mood calms when the Reaper relents. */
const DEATH_EMOTION: Partial<Record<DeathCause, string>> = { anger: 'angry', laughter: 'playful', embarrassment: 'embarrassed' };
/** A birthday cake's slices, and the odds of blowing out every candle at once (참고 게임 base_chance 50). */
const CAKE_SLICES = 8;
const CANDLE_SUCCESS = 0.5;
/** How fast doing what a trait loves refills its need, a minute (ours). */
const TRAIT_FILL = 3;
const OUTDOORS_FILL = 0.5;
const ROMANCE_FILL = 150;
const ADMIRE_FILL = 250;
const FAMILY_SOCIAL_FILL = 60;
/** A clumsy dweller's odds of a slip per workout or dance, and a neat dweller's of a cleaning frenzy (ours). */
const CLUMSY_SLIP = 0.15;
const NEAT_FRENZY = 0.2;
/** 참고 게임 commodity_Career_Homework fills from -100 to 100 at 2 a minute. */
const HOMEWORK_MINUTES = 100;
/** Before bed a dweller sees to the toilet below this bladder, and has a bite below this hunger (ours). */
const BEDTIME_BLADDER = 60;
const BEDTIME_HUNGER = 45;
/** The longest night's sleep (참고 게임 has no cap; ours stops a stuck sleeper). */
const NIGHT_SLEEP_CAP = 720;

/** Needs whose fixes 참고 게임 sees through to the end. */
const BODY_NEEDS: NeedKey[] = ['hunger', 'energy', 'bladder', 'hygiene'];
/** 참고 게임 MotivesNearFail exit conditions, on our 0..100 scale. */
const NEAR_FAIL: Array<[NeedKey, number]> = [['energy', 5], ['hunger', 2.5], ['bladder', 7.5]];

/** How far a shared activity's company counts, and who hears a rally (ours). */
const RALLY_RADIUS = 5;
/** How often a dweller starting a shared activity on their own asks others along (ours). */
const AUTO_RALLY_CHANCE = 0.3;
/** How a dweller asks someone along, by activity. */
const JOIN_LINE: Record<string, string> = {
  watch: 'TV 보자', watchTv: 'TV 보자', listen: '음악 듣자', dance: '춤추자', watchFish: '물고기 구경하자', playChess: '체스 두자',
  eat: '밥 먹자', read: '책 읽자', homework: '숙제하자', playToys: '장난감 갖고 놀자', workout: '운동하자', playBars: '정글짐에서 놀자',
  hangBars: '정글짐에서 놀자', waterPlant: '정원 가꾸자', weedPlant: '정원 가꾸자', buildRocket: '로켓 만들자', game: '게임하자',
  relax: '앉아서 좀 쉬자', fish: '낚시하자', stargaze: '별 보자',
};

/** A phone chat's length (ours). */
const PHONE_CALL_MINUTES = 30;

/** Minutes per chess turn, and the score that wins (참고 게임 Chess winning_score). */
const CHESS_TURN = 6;
const CHESS_WIN = 60;

/** Moodlets a good bed may leave on waking, 10% each (참고 게임 loot_Wakeup_HighQuality). */
const WAKE_FEELINGS = ['wakeInspired', 'wakeEnergized', 'wakeFocused', 'wakeFlirty', 'wakePlayful'];

export const MAX_HOUSEHOLD = 4;
/** 참고 게임 adoption_Picker_Phone payment_cost. */
export const ADOPTION_COST = 1000;

function fullNeeds(): Needs {
  return { hunger: 80, energy: 85, bladder: 70, hygiene: 80, fun: 70, social: 65 };
}

/** Socials that train empathy: listening, comforting, caring for the little ones (ours). */
const EMPATHY_SOCIALS = new Set(['deepTalk', 'hug', 'compliment', 'welcome', 'feedToddler', 'changeNappy', 'playWithToddler', 'teachWalk', 'teachTalk', 'pottyTrain']);

/** Competencies in daily life (ours): driving to work, a deferment, an insurance claim, first aid. */
const SELF_DRIVE_LEVEL = 4;
const DEFERMENT_LAW = 4;
const CLAIM_LAW = 3;
const FIRST_AID_LEVEL = 3;
const AUTO_FIRST_AID = 5;
const TREAT_LEVEL = 2;
const FIRST_AID_BASE = 0.2;
const FIRST_AID_PER = 0.06;
/** Moodlets first aid can see to: a burn from a fire, a shock from fixing electronics. */
const INJURIES = new Set(['singed', 'ouch']);
/** Minutes a question waits for the AI's card before looking again. */
const AI_CARD_WAIT = 30;
/** How often a walk-by, or a ring at the door, is a star's (Game.starAtLeisure). */
const STAR_WALKS_BY = 0.06;
const STAR_RINGS = 0.12;
/** Waking with less energy than this: not awake yet. */
const HALF_AWAKE = 45;
/** The same activity this many times running is a bore. */
const SAME_AGAIN = 3;
/** …with no more than this many minutes between. */
const SAME_AGAIN_WITHIN = 240;
/** Days at home before it gets to them. */
const STUCK_AT_HOME_DAYS = 3;
/** Going off work with less energy than this leaves the head foggy. */
const FOGGY_ENERGY = 25;
/** Minutes straight at something that wants a clear head before it takes hold. */
const DEEP_IN_IT = 45;
/** What someone uses behind a shut door (Game.bathroomsInUse), and what else in such a room waits for them. */
const BATH_FIXTURES = new Set(['toilet', 'pottyChair', 'shower', 'bathtub']);
const BATH_ROOMS_DEFS = new Set([...BATH_FIXTURES, 'sink']);
/** What someone hurt can't do (Game.injuryBlocker). */
const HEAVY_SKILLS = new Set<SkillKey>(['fitness', 'handiness', 'dancing']);
/** Minutes a visit to the hospital or pharmacy takes. */
const CARE_MINUTES = 120;
/** Chance a fight lost leaves them hurt. */
const BEATEN_HURT = 0.35;
/** How much slower someone hurt walks. */
const INJURED_WALK = 0.6;
/** Sleeping, a nap or a toddler's nap: rest that hunger, dirt or illness can spoil (sleep.ts). */
const SLEEPS = new Set(['sleep', 'nap', 'toddlerNap']);

export class Game {
  state: GameState;
  tiles: Tile[];
  /** The motion lab: every career stage's work and every alarm's answer can be tried (not saved). */
  stagesOpen = false;
  /** Dwellers who lost a retired career when the save loaded (told once the game starts). */
  private retiredJobs: string[] = [];
  /** When each dweller last found every flame out of reach (not saved). */
  private fireUnreachable = new Map<number, number>();
  /** The work lots followed dwellers are on right now, by dweller (workplace.ts), stepped along with home. */
  workGames = new Map<number, Game>();
  /** The land being built on before moving in (state.site), and on it, the home it belongs to. */
  siteGame: Game | null = null;
  owner: Game | null = null;
  /** A work lot's game: the home it was gone to from (its townies, for what's learnt about colleagues). */
  home: Game | null = null;
  version = 0;
  toasts: Toast[] = [];
  /** The screen slam showing, if any (not saved). */
  slam: Slam | null = null;
  /** The last 80 notifications, newest last (참고 게임's notification wall). */
  log: Toast[] = [];
  jobOffer: { dwellerId: number } | null = null;
  /** The way to the 스페이스기전 AI and the player's knowledge kept there, when the game runs in 스페이스기전 학생 (not saved). */
  cloud: CloudPort | null = null;
  /** Game minutes of play left today, from the arcade's coins (cloud/playPass.ts); null = no limit. Not saved. */
  playLeft: number | null = null;
  /** Game minutes played since the pass last looked. */
  played = 0;
  rng: () => number;
  private listeners = new Set<() => void>();
  private blockedCache: Blocked | null = null;
  private linksCache: Links | null = null;
  private linksCacheFor: Uint8Array | null = null;
  private emitTimer = 0;
  private toastSeq = 0;
  private speedBeforeModal = 1;

  constructor(state: GameState, rng: () => number = Math.random) {
    this.state = state;
    this.rng = rng;
    // The lot as data (lots.ts): its tiles, paint, windows and front door; older saves get the old house's.
    const home = !state.workplace;
    if (home) state.lot ??= { ...STARTER_LOT, frontDoor: { ...STARTER_LOT.frontDoor } };
    this.tiles = state.tiles && state.tiles.length % LEVEL_TILES === 0 && state.tiles.length > 0 ? state.tiles.slice() : planTiles(PLAN_BY_ID[state.lot?.id ?? ''] ?? STARTER);
    // A home has a floor above to build on (open air until built); older saves get one.
    if (home && this.tiles.length === LEVEL_TILES) this.tiles = [...this.tiles, ...new Array<Tile>(LEVEL_TILES).fill('void')];
    state.tiles = this.tiles.slice();
    if (!state.paint) {
      state.paint = legacyPaint(this.tiles, state.decor);
      delete state.decor;
    }
    // Walls on the lines between tiles (walls.ts): a plan, a work lot or an older save comes with
    // walls a tile thick, laid on the lines here.
    if (this.tiles.some((t) => t === 'wall' || t === 'door')) {
      state.windows ??= home && state.lot?.id === STARTER.id ? planWindows(STARTER, this.tiles) : autoWindows(this.tiles);
      this.layWallsOnLines();
    }
    delete state.windows;
    state.walls ??= {};
    setRooms(this.tiles, state.walls);
    // What was built here on moving in (older saves: what stands now), so building on adds to the home's value.
    if (state.lot) state.lot.structure ??= this.structureValue();
    // The old house drew its garden into the lawn: older saves get it as trees and bushes, where there's room.
    if (home && !state.yardPlanted) {
      state.yardPlanted = true;
      for (const t of STARTER.objects.filter((o) => o.defId === 'tree' || o.defId === 'bush'))
        if (canPlace(state, this.tiles, t.defId, t.x, t.y, t.dir)) state.objects.push({ ...t, uid: state.nextUid++ });
    }
    for (const s of state.dwellers) {
      // Saves from before emotions existed.
      s.buffs ??= [];
      s.emotion ??= 'fine';
      s.traits ??= [];
      // Traits taken out of the game (절도벽 and 속물, 2026-10-20, at the user's request) are let go, with their needs and moods.
      s.traits = s.traits.filter((id) => !REMOVED_TRAITS.has(id));
      if (s.traitNeeds) for (const id of REMOVED_TRAITS) delete s.traitNeeds[id];
      s.buffs = s.buffs.filter((b) => !REMOVED_BUFFS.has(b.id));
      // Grown-ups count their adult years from when we first see them.
      if (!s.age && !s.npc && s.bornAt === undefined) s.bornAt = state.time;
      // Saves from before fitness, painting and guitar.
      s.skills = { ...NO_SKILLS(), ...s.skills };
      // A career since taken out of the game: the dweller is let go (RETIRED_CAREERS).
      if (s.job && !CAREER_BY_ID[s.job.careerId]) {
        this.retiredJobs.push(s.name);
        s.job = null;
        if (s.away && !s.away.outing) s.away = null;
      }
      // Saves from before ladders were cut to fit the job: a dweller past the shared rungs gets a branch,
      // and anyone above the new top rung keeps the top.
      if (s.job) {
        const c = CAREER_BY_ID[s.job.careerId];
        if (s.job.branch !== undefined && !c.branches?.[s.job.branch]) s.job.branch = undefined;
        if (s.job.branchPick !== undefined && !c.branches?.[s.job.branchPick]) s.job.branchPick = undefined;
        if (s.job.branch === undefined && c.branches?.length && s.job.level >= c.levels.length) s.job.branch = s.job.branchPick ?? chooseBranch(c, s.skills);
        s.job.level = Math.min(s.job.level, topLevelOf(s.job));
      }
    }
    // A shift on a work lot that no longer exists, or a work event that no longer exists, is dropped.
    if (state.workSession) state.workSessions = [...(state.workSessions ?? []), state.workSession];
    delete state.workSession;
    state.workSessions = state.workSessions?.filter((w) => WORKPLACES[w.state.workplace?.careerId ?? '']);
    if (!state.workSessions?.length) delete state.workSessions;
    if (state.careerEvent && !state.careerEvent.ai && !EVENT_BY_ID[state.careerEvent.eventId]) state.careerEvent = undefined;
    // A key of its own, for what the game knows of the player kept on 스페이스기전 (aiQuestions.ts).
    state.key ??= Math.random().toString(36).slice(2, 10);
    // An aspiration taken out of the game (장난의 대가, at the user's request) is let go.
    for (const s of state.dwellers) if (s.aspiration && !ASPIRATION_BY_ID[s.aspiration.id]) s.aspiration = undefined;
    // Saves from when the answers were kept on each dweller: they were the player's all along.
    const kept = state.dwellers.flatMap((s) => (s.knowledge ? [s.knowledge] : []));
    if (kept.length) {
      state.player ??= mergeKnowledge(kept);
      for (const s of state.dwellers) delete s.knowledge;
    }
    if (state.player) claimKnowledge(state.player, state.key);
    this.dropStaleCareerEvent();
    state.economy ??= { ...newEconomy(), lastBillDay: clockInfo(state.time).day };
    // Saves from when there was a short lifespan grow old at the normal pace.
    if (!((state.lifespan ?? 'normal') in LIFESPANS)) state.lifespan = 'normal';
    // The neighbourhood as households that age with the game (neighbourhood.ts); older saves keep their six.
    if (!state.townies || state.townies.some((t) => t.home === undefined)) {
      const moved = new Set(state.dwellers.filter((x) => !x.npc).map((x) => x.name));
      state.townies = settleNeighbourhood(state.townies, rng, this.freeId(state), state.time, state.lifespan ?? 'normal', moved);
    }
    // The cast's own colours (older saves drew them at random, so the street looked different on each computer).
    if (state.townies) castColours(state.townies);
    for (const t of state.townies ?? []) if (t.traits) t.traits = t.traits.filter((id) => !REMOVED_TRAITS.has(id));
    if (state.townies) giveEveryoneTraits(state.townies, rng);
    // A star's likes, for those met before they had any (and one who has moved in).
    for (const p of [...(state.townies ?? []), ...state.dwellers] as Array<{ star?: string; likes?: string[]; dislikes?: string[] }>) {
      const star = p.star ? STAR_BY_ID[p.star] : undefined;
      if (star && !p.likes?.length) Object.assign(p, { likes: [...star.likes], dislikes: [...star.dislikes] });
    }
    // A save whose active dweller is gone (died with only a baby left, then the next one came) had the panel fail to open.
    if (!state.dwellers.some((s) => s.id === state.activeDwellerId && !s.npc)) {
      const next = state.dwellers.find((s) => !s.npc && s.age !== 'baby') ?? state.dwellers.find((s) => !s.npc);
      if (next) state.activeDwellerId = next.id;
    }
    // Saves from before the mailbox was a real object.
    if (home && !state.objects.some((o) => o.defId === 'mailbox')) {
      const box = STARTER.objects.find((o) => o.defId === 'mailbox')!;
      state.objects.push({ ...box, uid: state.nextUid++ });
    }
    // Genders for saves from before them: guessed from the name, else the outfit (gender.ts).
    for (const s of state.dwellers) if (!s.npc && !s.gender) s.gender = guessGender(s.name, (s as { outfit?: string }).outfit);
    // Saves from when a face could be worn in its own clothes (Dweller.ownClothes, gone 2026-10-23): dressed as they look.
    for (const s of state.dwellers) delete (s as { ownClothes?: boolean }).ownClothes;
    // Saves from when a job held one AI work card (`aiCard`): it waits with the others now.
    for (const s of state.dwellers)
      for (const job of [s.job, s.partTime]) {
        const old = job && (job as { aiCard?: NonNullable<Job['aiCards']>[number] }).aiCard;
        if (!job || !old) continue;
        job.aiCards = [...(job.aiCards ?? []), old];
        delete (job as { aiCard?: unknown }).aiCard;
      }
    // Saves from when the NPCs' characters were named by role (`npc_reaper_saja`, 2026-10-25 just `saja`).
    for (const s of [...state.dwellers, ...(state.townies ?? [])]) {
      const unrole = (k: string) => k.replace(/npc_(?:reaper|burglar|repair|boss|coworker|maid|nanny|client)_/g, '');
      if (s.face) s.face = unrole(s.face);
      if (s.hairFrom) s.hairFrom = unrole(s.hairFrom);
      if (s.closet) s.closet = s.closet.map(unrole);
      if (s.wear) s.wear = Object.fromEntries(Object.entries(s.wear).map(([p, k]) => [p, k && unrole(k)]));
    }
    // Saves from when pregnancy settings could be changed: back to the gender's own.
    for (const s of state.dwellers) delete (s as { canCarry?: boolean; canSire?: boolean }).canCarry, delete (s as { canSire?: boolean }).canSire;
    // The aspiration's area bonus (older saves, new games).
    for (const s of state.dwellers) if (!s.npc) this.syncAspirationBonus(s);
    // Saved while buy mode had stopped time: loaded in live mode, it runs again.
    if (state.pausedForBuy !== undefined) {
      if (state.speed === 0) state.speed = state.pausedForBuy;
      delete state.pausedForBuy;
    }
    for (const w of state.workSessions ?? []) this.workGames.set(w.dwellerId, Object.assign(new Game(w.state, rng), { home: this }));
    if (state.site) {
      this.siteGame = new Game(state.site, rng);
      this.siteGame.owner = this;
    }
    // Saves from before toddler beds (toddlers napped in the bassinet): one for each toddler.
    if (!state.workplace) for (const s of this.household()) if (s.age === 'toddler') this.toddlerBedFor(s);
    // Saves from before friendship/romance tracks stored a single number.
    for (const [k, v] of Object.entries(state.relationships as Record<string, Relationship | number>)) {
      if (typeof v === 'number') state.relationships[k] = { ...newRelationship(v, 0, state.time), since: undefined };
    }
    // Saves from before the first kiss was taken out of the game.
    for (const r of Object.values(state.relationships)) r.flags = r.flags.filter((f) => (f as string) !== 'firstKiss');
  }

  /** The home lot's front door and street (a work lot has the old house's). */
  get lot(): LotInfo {
    return this.state.lot ?? STARTER_LOT;
  }
  get paint(): Paint {
    return (this.state.paint ??= { floor: {}, wall: {} });
  }
  /** The walls, doors and windows on the edges between tiles (walls.ts). */
  get walls(): Walls {
    return (this.state.walls ??= {});
  }

  /**
   * What the lot's building is worth at the build tools' prices: its walls, doors and windows,
   * and its floors (참고 게임 counts what is built in a lot's value).
   */
  structureValue(): number {
    const edges = Object.values(this.walls).reduce((sum, k) => sum + (k === 'wall' ? BUILD_COST.wall : k === 'door' ? BUILD_COST.door : BUILD_COST.window), 0);
    return edges + this.tiles.filter((t) => FLOOR_TILES.has(t)).length * BUILD_COST.floor;
  }

  /** The home's value (참고 게임 lot value): its land and house as bought, and what has been built on it since. */
  get lotValue(): number {
    return Math.max(0, this.plan.value + this.structureValue() - (this.lot.structure ?? this.structureValue()));
  }

  /** The lot's walls a tile thick (a plan's, an old save's) set on the lines between tiles instead. */
  private layWallsOnLines() {
    const st = this.state;
    const lot = edgeLot(this.tiles, st.objects, this.paint, st.windows ?? []);
    this.tiles = lot.tiles;
    st.tiles = lot.tiles.slice();
    st.walls = lot.walls;
    st.paint = lot.paint;
    st.objects = lot.objects;
    delete st.windows;
  }
  /** Where dwellers leave the lot for work and outings. */
  get exitTile(): P {
    return exitOf(this.lot);
  }
  get streetEnds(): [P, P] {
    return streetEndsOf(this.lot);
  }
  /** Where visitors wait to be let in. */
  get doorstep(): P {
    return doorstepOf(this.lot, this.tiles);
  }

  /**
   * A room's name for the player, from what is in it (참고 게임 doesn't name rooms; ours reads the
   * furniture): a bathroom has a toilet or a bath, a bedroom a bed, a kitchen a stove or fridge.
   */
  roomName(room: Room): string {
    if (room === 'outside') return '바깥';
    const ids = new Set(this.state.objects.filter((o) => roomAt(Math.floor(objectCenter(o).x), Math.floor(objectCenter(o).y)) === room).map((o) => o.defId));
    const has = (...xs: string[]) => xs.some((x) => ids.has(x));
    if (has('toilet', 'shower', 'bathtub')) return '욕실';
    if (has('bed', 'doubleBed', 'deluxeBed', 'deluxeDoubleBed', 'crib', 'toddlerBed')) return '침실';
    if (has('stove', 'deluxeStove', 'fridge', 'deluxeFridge', 'kitchenSink')) return '부엌';
    if (has('sofa', 'tv', 'bigTv', 'armchair')) return '거실';
    if (has('computer', 'studyDesk', 'bookshelf')) return '서재';
    return '방';
  }

  /** The home's lot traits (lotTraits.ts): the plan's own, or as the household set them. */
  get lotTraits(): string[] {
    return this.state.lot ? (this.state.lot.traits ??= [...this.plan.traits]) : [];
  }

  /**
   * How much the home leans towards each lot trait (lotTraits.ts, earned by living, 2026-10-20). An
   * older save's traits, picked by hand before, start as earned and fade if not lived.
   */
  get lotAffinity(): Record<string, number> {
    const lot = this.state.lot;
    if (!lot) return {};
    if (!lot.affinity) {
      lot.affinity = {};
      for (const id of lot.traits ?? []) if (!this.plan.traits.includes(id)) lot.affinity[id] = EARN_MINUTES;
    }
    return lot.affinity;
  }

  /** A household member spent `minutes` on `skill` at home: the home leans towards its traits, and may take one on. */
  private noteLotPractice(dweller: Dweller, skill: SkillKey, minutes: number) {
    if (this.state.workplace || !this.state.lot || dweller.npc || dweller.away || minutes <= 0) return;
    const built = traitsBuiltBy(skill);
    if (!built.length) return;
    const aff = this.lotAffinity;
    for (const t of built) aff[t.id] = (aff[t.id] ?? 0) + minutes;
    this.refreshLotTraits(dweller);
  }

  /** The same for what's built by habit, not skill (a home that sleeps well, one that's kept tidy), with its mood. */
  private noteLotHabit(dweller: Dweller, interactionId: string, minutes: number) {
    if (this.state.workplace || !this.state.lot || dweller.npc || dweller.away || minutes <= 0) return;
    const built = traitsBuiltByHabit(interactionId);
    if (!built.length) return;
    const aff = this.lotAffinity;
    for (const t of built) {
      aff[t.id] = (aff[t.id] ?? 0) + minutes;
      if (this.lotTraits.includes(t.id) && !dweller.buffs.some((b) => b.id === t.buff)) this.addBuff(dweller, t.buff);
    }
    this.refreshLotTraits(dweller);
  }

  /** The home's traits from how it's lived in, with news of one gained or gone. */
  private refreshLotTraits(by?: Dweller) {
    const lot = this.state.lot;
    if (!lot) return;
    const had = this.lotTraits;
    const now = livedTraits(this.plan.traits, this.lotAffinity, had);
    if (now.join() === had.join()) return;
    lot.traits = now;
    for (const id of now.filter((x) => !had.includes(x))) {
      const t = LOT_TRAIT_BY_ID[id];
      const skills = t.skills.map((k) => SKILL_INFO[k].label).join('·');
      this.notify(`${t.icon} 집에서 ${skills}을(를) 꾸준히 해서 우리 집에 '${t.label}' 특성이 생겼어요! 이제 집에서 하면 1.5배 빨리 늘어요`, 'good', by ? { dwellerId: by.id } : undefined);
    }
    for (const id of had.filter((x) => !now.includes(x))) {
      const t = LOT_TRAIT_BY_ID[id];
      this.notify(`${t.icon} 한동안 집에서 하지 않아 '${t.label}' 특성이 옅어졌어요`, 'info');
    }
    this.emit();
  }

  /** Once a day the home's leanings fade a little (a trait no longer lived goes in time). */
  private stepLotTraits() {
    const lot = this.state.lot;
    if (!lot || this.state.workplace) return;
    const { day } = clockInfo(this.state.time);
    if (lot.affinityDay === day) return;
    if (lot.affinityDay !== undefined) {
      const aff = this.lotAffinity;
      for (const id of Object.keys(aff)) aff[id] = Math.round(aff[id] * Math.pow(DAILY_FADE, day - lot.affinityDay) * 10) / 10;
      this.refreshLotTraits();
    }
    lot.affinityDay = day;
  }

  /** The plan of the home the household lives in. */
  get plan(): LotPlan {
    return PLAN_BY_ID[this.lot.id] ?? STARTER;
  }

  /**
   * What moving to a home would come to (참고 게임 Move Household, For Rent): an owned home is sold
   * with its furniture at their value; a rented one gives back its deposit and the household's
   * own furniture is sold; the new home costs its price, or a week's rent as a deposit.
   */
  /**
   * What moving to a plan would come to. `take`: the household's furniture goes along into storage
   * (참고 게임 moves it into the household inventory) instead of being sold with the home; the garden and
   * the mailbox stay with the land either way.
   */
  homeOffer(planId: string, take = true, tenure: Tenure = 'own'): { plan: LotPlan; proceeds: number; cost: number; after: number; ok: boolean; reason?: string } {
    const plan = PLAN_BY_ID[planId];
    // Buying the home they rent (2026-10-20): the deposit back, nothing moved.
    const buyOut = planId === this.lot.id && tenure === 'own' && !!this.lot.rent;
    const proceeds = buyOut ? this.lot.deposit ?? 0 : this.saleProceeds(take);
    const cost = plan ? (tenure === 'rent' ? plan.rent : plan.price) ?? 0 : 0;
    const after = this.state.money + proceeds - cost;
    if (!plan) return { plan: STARTER, proceeds, cost, after, ok: false, reason: '없는 집이에요' };
    if (!plan.shell) return { plan, proceeds, cost, after, ok: false, reason: '빈 땅은 먼저 사서 집을 지은 뒤 이사해요' };
    if (tenure === 'rent' && !plan.rent) return { plan, proceeds, cost, after, ok: false, reason: '월세로 나온 집이 아니에요' };
    if (tenure === 'own' && !plan.price) return { plan, proceeds, cost, after, ok: false, reason: '팔지 않는 집이에요' };
    if (planId === this.lot.id && !buyOut) return { plan, proceeds, cost, after, ok: false, reason: '지금 사는 집이에요' };
    if (this.state.workplace) return { plan, proceeds, cost, after, ok: false, reason: '일터에서는 이사할 수 없어요' };
    if (this.state.fires?.length) return { plan, proceeds, cost, after, ok: false, reason: '불부터 꺼야 해요' };
    if (after < 0) return { plan, proceeds, cost, after, ok: false, reason: `§${-after} 모자라요` };
    return { plan, proceeds, cost, after, ok: true };
  }

  /** What leaving this home brings in: the home sold (a rented one's deposit back) and the furniture not taken along. */
  private saleProceeds(take: boolean): number {
    const furniture = this.state.objects.reduce((sum, o) => sum + (o.landlord || (take && this.portable(o)) ? 0 : objectValue(o)), 0);
    return (this.lot.rent ? this.lot.deposit ?? 0 : this.lotValue) + furniture;
  }

  /** Furniture that goes along on moving house (not the landlord's, not the garden or the mailbox). */
  private portable(o: PlacedObject): boolean {
    return !o.landlord && !['mailbox', 'tree', 'bush'].includes(o.defId);
  }

  /** Moves the household into another home: its walls, paint, furniture and street, everyone at home inside it; their own furniture into storage if `take`. */
  moveTo(planId: string, take = true, tenure: Tenure = 'own'): boolean {
    const offer = this.homeOffer(planId, take, tenure);
    if (!offer.ok) {
      this.notify(`🏠 이사할 수 없어요: ${offer.reason}`, 'bad');
      this.emit();
      return false;
    }
    const { plan } = offer;
    const from = this.plan.name;
    const st = this.state;
    st.money = offer.after;
    if (planId === this.lot.id) {
      // Bought from the landlord: theirs now, the walls and lot traits too.
      const { rent: _rent, deposit: _deposit, ...owned } = this.lot;
      st.lot = owned;
      st.objects = st.objects.map((o) => (o.landlord ? { ...o, landlord: undefined } : o));
      this.notify(`🏠 살던 「${plan.name}」을(를) §${plan.price}에 샀어요 (보증금 §${offer.proceeds}을 돌려받았어요). 이제 벽도 고치고 부지 특성도 고를 수 있어요`, 'good', { slam: { title: '우리 집이 생겼어요!', icon: '🏠', household: true } });
      this.emit();
      return true;
    }
    const packed = this.leaveHome(take);
    const tiles = planTiles(plan);
    this.tiles = tiles.length === LEVEL_TILES ? [...tiles, ...new Array<Tile>(LEVEL_TILES).fill('void')] : tiles;
    st.tiles = this.tiles.slice();
    st.paint = planPaint(plan, this.tiles);
    st.windows = planWindows(plan, this.tiles);
    st.lot = lotInfoOf(plan, tenure);
    st.yardPlanted = true;
    st.objects = planObjects(plan, this.household().length, st.nextUid).map((o) => (tenure === 'rent' ? { ...o, landlord: true } : o));
    st.nextUid += st.objects.length;
    this.layWallsOnLines();
    st.lot.structure = this.structureValue();
    this.arrive(plan.start);
    const how = tenure === 'rent' ? `월세 §${plan.rent}/주, 보증금 §${plan.rent}` : `§${plan.price}에 샀어요`;
    this.notify(`🏠 「${from}」에서 「${plan.name}」로 이사했어요 (${how}; 받은 돈 §${offer.proceeds})`, 'good', { slam: { title: '새 집으로 이사했어요!', icon: '🏠', household: true } });
    if (packed.length) this.notify(`📦 가구 ${packed.length}개를 보관함에 담아 왔어요. 구매 모드 → 📦 보관함에서 다시 놓을 수 있어요`, 'info');
    this.emit();
    return true;
  }

  /** Leaving this home: visitors go, everyone's plans start over, and the household's own furniture is packed into storage if `take`. */
  private leaveHome(take: boolean): PlacedObject[] {
    const st = this.state;
    st.dwellers = st.dwellers.filter((x) => !x.npc);
    for (const x of st.dwellers) {
      x.queue = [];
      x.run = null;
      x.engagedWith = null;
    }
    const packed = take ? st.objects.filter((o) => this.portable(o)).map((o) => ({ ...o, fresh: undefined })) : [];
    this.storage.push(...packed);
    return packed;
  }

  /** Settling into the new home: nothing left burning or spilt, everyone at home standing at `start`. */
  private arrive(start: P[]) {
    const st = this.state;
    st.fires = [];
    st.puddles = [];
    st.dishes = 0;
    st.food = [];
    st.party = undefined;
    this.household().forEach((x, i) => {
      if (x.away) return;
      const p = start[i % start.length];
      x.x = p.x;
      x.y = p.y;
    });
    this.economy.usage = { power: 0, water: 0 };
    setRooms(this.tiles, this.walls);
    this.invalidate();
  }

  /**
   * Buys bare land to build a home on before moving in (참고 게임: an empty lot is bought, built on in
   * build mode, then moved into). The household lives on where it is meanwhile; building there is
   * paid from the household's money.
   */
  buyLand(): boolean {
    if (this.owner || this.state.workplace) return false;
    if (this.state.site) {
      this.notify('이미 짓고 있는 땅이 있어요', 'bad');
      this.emit();
      return false;
    }
    if (this.state.money < EMPTY_LOT.price!) {
      this.notify(`돈이 부족해요 (§${EMPTY_LOT.price} 필요)`, 'bad');
      this.emit();
      return false;
    }
    this.state.money -= EMPTY_LOT.price!;
    this.state.site = landState(EMPTY_LOT, this.state);
    this.siteGame = new Game(this.state.site, this.rng);
    this.siteGame.owner = this;
    this.notify(`🏗️ 빈 땅을 샀어요 (−§${EMPTY_LOT.price}). 위쪽 🏗️ 새 땅 탭에서 집을 지은 뒤 이사해요`, 'good');
    this.emit();
    return true;
  }

  /** What the land being built on still needs before moving in: a room, and a front door into it from the street. */
  siteProblems(): string[] {
    const site = this.siteGame;
    if (!site) return ['짓고 있는 땅이 없어요'];
    const rooms = computeRooms(site.tiles, site.walls);
    const inside = rooms.map((r, i) => (r === 'outside' ? -1 : i)).filter((i) => i >= 0);
    if (!inside.length) return ['벽으로 둘러싼 방이 없어요'];
    if (!Object.keys(site.walls).some((k) => site.isFrontDoor(k))) return ['바깥벽에 정문이 없어요'];
    const map = routeFrom(site.blocked, 0, site.lot.streetY);
    if (!inside.some((i) => map.dist[i] >= 0)) return ['길에서 방으로 들어갈 수 없어요'];
    return [];
  }

  /** What moving into the house built would come to: this home sold (or its deposit back), the furniture not taken sold. */
  siteOffer(take = true): { proceeds: number; after: number; ok: boolean; reason?: string } {
    const proceeds = this.saleProceeds(take);
    const after = this.state.money + proceeds;
    const reason = this.state.workplace ? '일터에서는 이사할 수 없어요' : this.state.fires?.length ? '불부터 꺼야 해요' : this.siteProblems()[0];
    return { proceeds, after, ok: !reason, reason };
  }

  /** Moves the household into the house built on its land, its furniture packed into storage if `take`. */
  moveIntoSite(take = true): boolean {
    const offer = this.siteOffer(take);
    const site = this.siteGame;
    if (!offer.ok || !site) {
      this.notify(`🏠 아직 이사할 수 없어요: ${offer.reason}`, 'bad');
      this.emit();
      return false;
    }
    const from = this.plan.name;
    const st = this.state;
    st.money = offer.after;
    const packed = this.leaveHome(take);
    this.tiles = site.tiles.slice();
    st.tiles = this.tiles.slice();
    st.walls = { ...site.walls };
    st.paint = site.paint;
    st.lot = site.lot;
    st.yardPlanted = true;
    delete st.windows;
    // The land's furniture, numbered among the household's things.
    st.objects = site.state.objects.map((o) => ({ ...o, uid: st.nextUid++ }));
    delete st.site;
    this.siteGame = null;
    this.arrive([this.doorstep]);
    this.notify(`🏠 「${from}」에서 직접 지은 집으로 이사했어요 (받은 돈 §${offer.proceeds})`, 'good', { slam: { title: '새 집으로 이사했어요!', icon: '🏠', household: true } });
    if (packed.length) this.notify(`📦 가구 ${packed.length}개를 보관함에 담아 왔어요. 구매 모드 → 📦 보관함에서 다시 놓을 수 있어요`, 'info');
    this.emit();
    return true;
  }

  /** What land being built on sells for: the land and what's built on it, and the furniture put there. */
  get landSale(): number {
    return this.lotValue + this.state.objects.reduce((sum, o) => sum + (this.portable(o) ? objectValue(o) : 0), 0);
  }

  /** Sells the land being built on, with what was built and put there. */
  sellLand(): boolean {
    const site = this.siteGame;
    if (!site) return false;
    const value = site.landSale;
    this.state.money += value;
    delete this.state.site;
    this.siteGame = null;
    this.notify(`🏗️ 짓던 땅을 팔았어요 (+§${value})`, 'info');
    this.emit();
    return true;
  }

  static create(specs: DwellerSpec[], rng?: () => number, lifespan: 'normal' | 'off' = 'normal', planId: string | LotPlan = STARTER.id): Game {
    // The house the household moves into (lots.ts): a bed for everyone (extras for a third and fourth
    // dweller), and a second toilet for three or more (a busy toilet wears out fast). A plan of its own
    // can be given too (the 3D motion lab's).
    const plan = typeof planId === 'string' ? (PLAN_BY_ID[planId] ?? STARTER) : planId;
    // The household owns the home they start in (a new story: the studio flat, App.tsx).
    const objects = planObjects(plan, specs.length, 1);
    const uid = objects.length + 1;
    const tiles = planTiles(plan);
    const dwellers: Dweller[] = specs.map((spec, i) => ({
      id: i + 1,
      ...spec,
      ...plan.start[i % plan.start.length],
      needs: fullNeeds(),
      skills: NO_SKILLS(),
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: spec.traits ?? [],
      aspiration: spec.aspiration ? { id: spec.aspiration, milestone: 0, counters: {} } : undefined,
    }));
    // Housemates start on friendly terms.
    const relationships: Record<string, Relationship> = {};
    // A household starts out knowing each other: no day to wait before anything (`since` left out).
    for (const a of dwellers) for (const b of dwellers) if (a.id < b.id) relationships[relKey(a.id, b.id)] = { ...newRelationship(25, 0, START_TIME), since: undefined };
    return new Game(
      {
        version: 1,
        time: START_TIME,
        speed: 1,
        money: START_MONEY,
        dwellers,
        objects,
        relationships,
        activeDwellerId: dwellers[0]?.id ?? 1,
        freeWill: true,
        economy: newEconomy(),
        nextUid: uid,
        nextActionId: 1,
        lifespan,
        lot: lotInfoOf(plan),
        tiles,
        paint: planPaint(plan, tiles),
        windows: planWindows(plan, tiles),
        yardPlanted: true,
      },
      rng,
    );
  }

  // ---------- subscription (for React) ----------

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getVersion = () => this.version;

  emit() {
    for (const work of this.workGames.values()) work.emit();
    // Land being built on spends the household's money; what it spends shows at home.
    if (this.siteGame) this.siteGame.state.money = this.state.money;
    if (this.owner) {
      this.owner.state.money = this.state.money;
      this.owner.emit();
    }
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  notify(text: string, kind: Toast['kind'] = 'info', opts: NotifyOpts = {}) {
    const dwellerId = opts.dwellerId ?? this.aboutWhom(text);
    const look = opts.look ?? (kind === 'bad' && URGENT_MARK.test(text) ? 'urgent' : undefined);
    const toast: Toast = { id: ++this.toastSeq, text, kind, at: Date.now(), time: this.state.time, dwellerId, look };
    if (opts.slam && (opts.slam.household || dwellerId === undefined || dwellerId === this.state.activeDwellerId)) {
      this.slam = { id: toast.id, title: opts.slam.title, icon: opts.slam.icon, text, at: Date.now() };
    }
    this.toasts.push(toast);
    if (this.toasts.length > 30) this.toasts.shift();
    this.log.push(toast);
    if (this.log.length > 80) this.log.shift();
  }

  /** The household dweller a notification names first, if any. */
  private aboutWhom(text: string): number | undefined {
    let best: number | undefined;
    let at = Infinity;
    for (const s of this.state.dwellers) {
      if (s.npc) continue;
      const i = text.indexOf(s.name);
      if (i >= 0 && i < at) [best, at] = [s.id, i];
    }
    return best;
  }

  // ---------- lookups ----------

  get blocked(): Blocked {
    if (!this.blockedCache) this.blockedCache = buildBlocked(this.tiles, this.state.objects, this.walls);
    return this.blockedCache;
  }

  /** How many floors the lot has (a work lot one, a home two). */
  get levels(): number {
    return levelsOf(this.tiles);
  }

  /**
   * The ends of a flight of stairs: its foot (beside the tile in front of it) on its own floor,
   * and the head's place on the floor above, where dwellers come out.
   */
  stairEnds(o: PlacedObject): { foot: P; top: P } {
    const { w, h } = dims(getDef(o.defId), o.dir);
    const ends: Record<Dir, [P, P]> = {
      down: [{ x: o.x, y: o.y + h - 1 }, { x: o.x, y: o.y }],
      up: [{ x: o.x, y: o.y }, { x: o.x, y: o.y + h - 1 }],
      left: [{ x: o.x, y: o.y }, { x: o.x + w - 1, y: o.y }],
      right: [{ x: o.x + w - 1, y: o.y }, { x: o.x, y: o.y }],
    };
    const [foot, head] = ends[o.dir];
    return { foot, top: { x: head.x, y: head.y + MAP_H } };
  }

  /** Steps between floors, for the path search (참고 게임 stairs are routing portals). */
  get stairLinks(): Links {
    if (this.linksCache && this.linksCacheFor === this.blockedCache) return this.linksCache;
    const links: Links = new Map();
    const add = (a: number, b: number) => {
      if (!links.has(a)) links.set(a, []);
      links.get(a)!.push({ to: b, cost: STAIR_COST });
    };
    for (const o of this.state.objects) {
      if (o.defId !== 'stairs' || floorOf(o.y) + 1 >= this.levels) continue;
      const { foot, top } = this.stairEnds(o);
      add(idx(foot.x, foot.y), idx(top.x, top.y));
      add(idx(top.x, top.y), idx(foot.x, foot.y));
    }
    this.linksCache = links;
    this.linksCacheFor = this.blocked;
    return links;
  }

  /** The flight of stairs between where a dweller stands and a point on the other floor, if any. */
  stairsBetween(from: P, to: P): PlacedObject | undefined {
    const a = { x: Math.round(from.x), y: Math.round(from.y) };
    return this.state.objects.find((o) => {
      if (o.defId !== 'stairs') return false;
      const { foot, top } = this.stairEnds(o);
      return (foot.x === a.x && foot.y === a.y && top.x === to.x && top.y === to.y) || (top.x === a.x && top.y === a.y && foot.x === to.x && foot.y === to.y);
    });
  }

  /** How far it is up a flight (from the middle of its foot to the middle of its head), metres. */
  flightLength(dweller: P, to: P): number {
    const o = this.stairsBetween(dweller, to);
    if (!o) return 1;
    const { h, w } = dims(getDef(o.defId), o.dir);
    return Math.hypot(Math.max(w, h) - 1, 3) * 0.75;
  }

  /** Each flight's foot, stepped onto only from the tile in front of it (not over the side rails). */
  get stairGates(): Map<number, number> {
    const gates = new Map<number, number>();
    for (const o of this.state.objects) {
      if (o.defId !== 'stairs') continue;
      const { foot, front } = flight(o);
      if (front.x >= 0 && front.x < MAP_W && floorOf(front.y) === floorOf(foot.y)) gates.set(idx(foot.x, foot.y), idx(front.x, front.y));
    }
    return gates;
  }

  /** Call after the layout changes: drops the walk cache and makes walkers repath. */
  /** Bumped whenever the lot's layout changes (for the buy-mode checks' cache). */
  private layoutVersion = 0;
  private invalidate() {
    this.blockedCache = null;
    this.layoutVersion++;
    for (const s of this.state.dwellers) if (s.run?.phase === 'walking') this.stopRun(s);
  }

  dweller(id: number): Dweller | undefined {
    return this.state.dwellers.find((s) => s.id === id);
  }

  get activeDweller(): Dweller {
    return this.dweller(this.state.activeDwellerId) ?? this.state.dwellers[0];
  }

  object(uid: number): PlacedObject | undefined {
    return this.state.objects.find((o) => o.uid === uid);
  }

  interaction(obj: PlacedObject, id: string): InteractionDef | undefined {
    return getDef(obj.defId).interactions.find((i) => i.id === id);
  }

  /** The pair's relationship, created on first contact. */
  /**
   * The colleagues a dweller's 관계 tab lists (2026-11-01, at the user's request: everyone the household works
   * with was listed for each of them): those of their own job — a star or a work episode's people only if
   * theirs — and anyone else from work they've actually come to know. Reads without making a relationship.
   */
  colleaguesOf(dweller: Dweller): Townie[] {
    const own = new Set([dweller.job?.careerId, dweller.partTime?.careerId]);
    return (this.state.townies ?? []).filter((t) => {
      if (!t.workmate) return false;
      const rel = this.state.relationships[relKey(dweller.id, t.id)];
      if (rel && (Math.abs(rel.friend) >= 5 || Math.abs(rel.romance) >= 5 || rel.flags.length > 0)) return true;
      if (t.star) return this.state.starOwners?.[t.star] === dweller.id;
      if (t.episodeOf !== undefined) return t.episodeOf === dweller.id;
      return own.has(t.workmate.careerId);
    });
  }

  relationship(a: number, b: number): Relationship {
    const k = relKey(a, b);
    return (this.state.relationships[k] ??= newRelationship(0, 0, this.state.time));
  }

  /**
   * The people a dweller has a relationship with (2026-10-26, at the user's request, for the 관계 tab): anyone
   * in the game — family, a guest, a neighbour, a colleague, a star — with some friendship or romance
   * (|5| or more), a tie (partner, best friend, enemy …) or family, closest first. Strangers are left out.
   */
  relationsOf(dwellerId: number): Array<{ id: number; name: string; rel: Relationship; where: 'family' | 'here' | 'work' | 'street' }> {
    const out: Array<{ id: number; name: string; rel: Relationship; where: 'family' | 'here' | 'work' | 'street' }> = [];
    const me = this.dweller(dwellerId);
    for (const [k, rel] of Object.entries(this.state.relationships)) {
      const [a, b] = k.split('-').map(Number);
      if (a !== dwellerId && b !== dwellerId) continue;
      const id = a === dwellerId ? b : a;
      const s = this.dweller(id);
      const t = this.state.townies?.find((x) => x.id === id);
      if (!s && !t) continue;
      if (s && (s.npc?.role === 'burglar' || s.npc?.role === 'reaper' || s.npc?.role === 'service')) continue;
      const kin = !!(me && s && this.familyTie(me, s));
      if (!kin && Math.abs(rel.friend) < 5 && Math.abs(rel.romance) < 5 && !rel.flags.length) continue;
      const where = s && !s.npc ? 'family' : s ? 'here' : t?.workmate ? 'work' : 'street';
      out.push({ id, name: (s ?? t)!.name, rel, where });
    }
    const weight = (r: Relationship) => (r.flags.includes('married') || r.flags.includes('partner') || r.flags.includes('engaged') ? 300 : 0) + (r.flags.includes('bff') ? 150 : 0) + Math.abs(r.friend) + Math.abs(r.romance);
    return out.sort((x, y) => Number(y.where === 'family') - Number(x.where === 'family') || weight(y.rel) - weight(x.rel));
  }

  /** Friendship between two dwellers (-100..100). */
  rel(a: number, b: number): number {
    return this.relationship(a, b).friend;
  }

  get economy(): Economy {
    return (this.state.economy ??= newEconomy());
  }

  /** A utility that has been cut off for unpaid bills. */
  isCut(u: Utility): boolean {
    return this.economy.bill?.cut.includes(u) ?? false;
  }

  /** Why an interaction can't run because power or water is off, or null. */
  utilityBlocker(inter: InteractionDef): string | null {
    if (inter.utility?.power && this.isCut('power')) return '전기가 끊겼어요';
    if (inter.utility?.water && this.isCut('water')) return '물이 끊겼어요';
    return null;
  }

  /**
   * A drink for the mixer and one each for up to three dwellers nearby (the band's ingredients are
   * paid per glass), each feeling it as 참고 게임's drink moodlets say.
   */
  private serveDrinks(dweller: Dweller) {
    const tier = drinkTier(dweller.skills.mixology);
    const t = DRINK_TIERS[tier];
    const name = t.names[Math.floor(this.rng() * t.names.length)];
    const guests = this.state.dwellers
      .filter((s) => s !== dweller && !s.away && s.age !== 'baby' && s.age !== 'child' && Math.hypot(s.x - dweller.x, s.y - dweller.y) <= 6 && !this.isBusyOnObject(s))
      .slice(0, 3);
    const glasses = [dweller, ...guests].slice(0, 1 + Math.max(0, Math.floor(this.state.money / t.cost) - 1));
    for (const s of glasses) {
      this.state.money -= t.cost;
      const quality = drinkQuality(dweller.skills.mixology, tier, this.rng());
      const buff = drinkBuff(tier, quality);
      if (quality >= 31 && dweller.aspiration) {
        const counters = (dweller.aspiration.counters ??= {});
        counters.drinkOutstanding = (counters.drinkOutstanding ?? 0) + 1;
      }
      if (buff) this.addBuff(s, buff);
      this.addBuff(s, 'drinkCooldown');
    }
    if (this.state.party) {
      this.partyGoal('drinks', glasses.length);
      this.partyGoal('craftDrinks');
      if (glasses.length >= 2) this.partyGoal('drinkingTogether');
    }
    const who = glasses.length > 1 ? ` (${glasses.length}잔)` : '';
    this.notify(`🍹 ${josa(dweller.name, '이/가')} ${josa(name, '을/를')} 만들었어요${who}`, 'info');
  }

  /** 참고 게임 violin moodlets: soothing strings early, scintillating once good, a sad song when Sad. */
  private violinDone(dweller: Dweller) {
    const lvl = Math.floor(dweller.skills.violin);
    if (dweller.emotion === 'sad') this.addBuff(dweller, 'violinSadSong');
    else if (lvl >= 5) this.addBuff(dweller, 'scintillatingStrings');
    else if (lvl >= 2 && this.rng() < 0.5) this.addBuff(dweller, 'soothingStrings');
    if (lvl < 5) return;
    for (const s of this.state.dwellers) {
      if (s === dweller || s.away || s.age === 'baby' || Math.hypot(s.x - dweller.x, s.y - dweller.y) > 6) continue;
      this.addBuff(s, 'jazzedUp');
    }
  }

  /** A photo sold to a publication (참고 게임 photography_SellToPublication; prices ours). */
  private photoDone(dweller: Dweller) {
    const lvl = Math.floor(dweller.skills.photography);
    const value = 5 + lvl * 8 + Math.floor(this.rng() * 10);
    this.state.money += value;
    this.notify(`📸 ${josa(dweller.name, '이/가')} 찍은 사진을 잡지에 팔았어요 (+§${value})`, 'good');
  }

  /**
   * Chords for the player as skill grows, and a lift for anyone listening once they're good
   * (참고 게임 piano buffs; the skill bands are ours).
   */
  private pianoDone(dweller: Dweller) {
    const lvl = Math.floor(dweller.skills.piano);
    if (lvl >= 5) this.addBuff(dweller, 'killerChords');
    else if (lvl >= 2 && this.rng() < 0.5) this.addBuff(dweller, 'coolChords');
    if (lvl < 5) return;
    for (const s of this.state.dwellers) {
      if (s === dweller || s.away || s.age === 'baby' || Math.hypot(s.x - dweller.x, s.y - dweller.y) > 6) continue;
      this.addBuff(s, 'jazzedUp');
    }
  }

  // ---------- fears ----------

  hasFear(dweller: Dweller, id: FearId): boolean {
    return !!dweller.fears?.includes(id);
  }

  /** An object out in the dark (night, outside the house), for a fear of the dark (fears.ts). */
  nightOutside(obj: PlacedObject): boolean {
    const { minuteOfDay } = clockInfo(this.state.time);
    return (minuteOfDay >= 21 * 60 || minuteOfDay < 5 * 60) && roomAt(Math.round(obj.x), Math.round(obj.y)) === 'outside';
  }

  /** A bad moment may leave a fear behind (참고 게임 loot_Fear_*_Trigger). */
  maybeFear(dweller: Dweller, id: FearId) {
    if (dweller.npc || isYoung(dweller.age) && dweller.age !== 'teen') return;
    // Lived through again, a fear held may grow (as likely as it was to start).
    if (this.hasFear(dweller, id)) {
      if (this.rng() < FEAR_BY_ID[id].chance) this.growFear(dweller, id);
      return;
    }
    if ((dweller.fears?.length ?? 0) >= MAX_FEARS || dweller.buffs.some((b) => b.id === 'fearFaced')) return;
    if (this.rng() >= FEAR_BY_ID[id].chance) return;
    (dweller.fears ??= []).push(id);
    (dweller.fearLevel ??= {})[id] = 1;
    (dweller.fearSince ??= {})[id] = this.state.time;
    this.notify(`😨 ${josa(dweller.name, '이/가')} 새 두려움이 생겼어요: ${FEAR_BY_ID[id].label}`, 'bad');
  }

  /** A fear a rung stronger (fears.ts MAX_FEAR_LEVEL), at most once a day. */
  growFear(dweller: Dweller, id: FearId) {
    const level = fearLevel(dweller, id);
    if (!level || level >= MAX_FEAR_LEVEL) return;
    const since = dweller.fearSince?.[id];
    if (since !== undefined && this.state.time - since < 1440 && (dweller.fearLevel?.[id] ?? 1) > 1) return;
    (dweller.fearLevel ??= {})[id] = level + 1;
    (dweller.fearSince ??= {})[id] = this.state.time;
    this.notify(`😨 ${dweller.name}의 ${josa(FEAR_BY_ID[id].label, '이/가')} 커졌어요 (${FEAR_LEVEL_LABEL[level + 1]})`, 'bad', { dwellerId: dweller.id });
  }

  /** Steps towards facing a fear; at the goal it's gone (참고 게임 confrontation goal → remove_trait). */
  faceFear(dweller: Dweller, id: FearId, n = 1) {
    if (!this.hasFear(dweller, id)) return;
    const p = (dweller.fearProgress ??= {});
    p[id] = (p[id] ?? 0) + n;
    if (n > 0) (dweller.fearSince ??= {})[id] = this.state.time;
    if (p[id]! < FEAR_BY_ID[id].need) return;
    // The fear ladder (fears.ts): walked to the end, a strong fear comes down a rung and starts again.
    const level = fearLevel(dweller, id);
    if (level > 1) {
      p[id] = 0;
      (dweller.fearLevel ??= {})[id] = level - 1;
      this.addBuff(dweller, 'fearStepDown');
      this.notify(`🪜 ${dweller.name}의 ${josa(FEAR_BY_ID[id].label, '이/가')} 한 단계 가벼워졌어요 (${FEAR_LEVEL_LABEL[level - 1]})`, 'good', { dwellerId: dweller.id });
      return;
    }
    dweller.fears = dweller.fears!.filter((f) => f !== id);
    delete p[id];
    if (dweller.fearLevel) delete dweller.fearLevel[id];
    if (dweller.fearSince) delete dweller.fearSince[id];
    this.addBuff(dweller, 'fearFaced');
    dweller.fearsFaced = (dweller.fearsFaced ?? 0) + 1;
    this.notify(`💪 ${josa(dweller.name, '이/가')} 두려움을 극복했어요: ${FEAR_BY_ID[id].label}. 마음이 한층 단단해졌어요`, 'good');
    // What it leaves behind: a stronger heart (회복탄력성), which eases the rest a little too.
    this.gainSkill(dweller, 'resilience', FACED_RESILIENCE);
  }

  /** Part of the way through a fear, whatever its own measure (`share` of what facing it takes). */
  easeFear(dweller: Dweller, id: FearId, share: number) {
    this.faceFear(dweller, id, FEAR_BY_ID[id].need * share);
  }

  /**
   * Talking a fear over with someone close (docs/ref-game/16-fears.md: support from others): a
   * heart-to-heart that goes well with family or a good friend eases every fear a third, once a day.
   */
  private talkFearsOver(dweller: Dweller, t: Dweller) {
    if (!dweller.fears?.length || dweller.npc) return;
    if (!this.familyTie(dweller, t) && this.relationship(dweller.id, t.id).friend < CONFIDANT_FRIENDSHIP) return;
    const day = clockInfo(this.state.time).day;
    if (dweller.fearTalkDay === day) return;
    dweller.fearTalkDay = day;
    this.addBuff(dweller, 'fearShared');
    this.notify(`💬 ${josa(dweller.name, '이/가')} ${t.name}에게 걱정을 털어놓았어요. 마음이 조금 가벼워졌어요`, 'good', { dwellerId: dweller.id });
    for (const f of [...dweller.fears]) this.easeFear(dweller, f, TALK_SHARE);
  }

  /**
   * Hearing out what's worrying someone (2026-10-26, at the user's request): their fears ease by a
   * third, more from a listener good with people (listenShare), once a day; the listener learns from it.
   */
  private hearOut(dweller: Dweller, t: Dweller, great: boolean) {
    if (!t.fears?.length) return;
    const day = clockInfo(this.state.time).day;
    if (t.fearTalkDay === day) return;
    t.fearTalkDay = day;
    const before = t.fears.map((f) => FEAR_BY_ID[f].label).join(', ');
    const share = listenShare(dweller.skills, great);
    for (const f of [...t.fears]) this.easeFear(t, f, share);
    this.gainSkill(dweller, 'empathy', 0.3);
    // Heard out (fearShared): free will leaves them be for a while.
    this.addBuff(t, 'fearShared');
    if (!t.fears.length) t.buffs = t.buffs.filter((b) => b.id !== 'colleagueWorried');
    this.notify(`👂 ${josa(dweller.name, '이/가')} ${t.name}의 고민(${before})을 들어 주었어요. ${t.fears.length ? '마음이 조금 가벼워졌대요' : '걱정을 털어 냈어요'}`, 'good', { dwellerId: dweller.id });
  }

  /** Sharing in someone's good news: both glad of it, and it's been told. */
  private shareJoy(dweller: Dweller, t: Dweller) {
    const joy = t.joy ? JOY_BY_ID[t.joy] : undefined;
    if (!joy) return;
    t.joy = undefined;
    t.buffs = t.buffs.filter((b) => b.id !== 'colleagueGlad');
    this.faceFear(dweller, 'lonely');
    this.faceFear(t, 'lonely');
    this.notify(`🥳 ${josa(dweller.name, '이/가')} ${t.name}의 기쁜 일을 함께 기뻐했어요: ${joy.label}`, 'good', { dwellerId: dweller.id });
  }

  /** Lying down at night with a fear: a startling noise, the thought of burglars, tomorrow's failures. */
  private bedtimeFears(dweller: Dweller) {
    if (this.rng() < fearOdds(0.3, fearLevel(dweller, 'dark'))) this.addBuff(dweller, 'fearDarkStartled');
    if (this.hasFear(dweller, 'burgled')) {
      // A burglar alarm settles it (참고 게임 confrontation: buy an alarm).
      if (this.state.objects.some((o) => o.defId === 'burglarAlarm')) this.faceFear(dweller, 'burgled', FEAR_BY_ID.burgled.need);
      else if (this.rng() < fearOdds(0.25, fearLevel(dweller, 'burgled'))) this.addBuff(dweller, 'fearBurglar');
    }
    if (this.rng() < fearOdds(0.3, fearLevel(dweller, 'failure'))) this.addBuff(dweller, 'fearFailureWake');
    if (this.rng() < fearOdds(0.3, fearLevel(dweller, 'future'))) this.addBuff(dweller, 'fearFutureNight');
    if (this.rng() < fearOdds(0.3, fearLevel(dweller, 'family'))) this.addBuff(dweller, 'fearFamilyNight');
    // School tomorrow (fears.ts exam).
    if (dweller.job && CAREER_BY_ID[dweller.job.careerId].school && this.rng() < fearOdds(0.4, fearLevel(dweller, 'exam'))) this.addBuff(dweller, 'fearExamNight');
  }

  /** Fears that come with places and times: the dark outside, a crowd, a dead-end job. */
  private stepFears(dweller: Dweller, dt: number) {
    if (dweller.away) return;
    const { day, minuteOfDay } = clockInfo(this.state.time);
    const night = minuteOfDay >= 21 * 60 || minuteOfDay < 5 * 60;
    const outside = roomAt(Math.round(dweller.x), Math.round(dweller.y)) === 'outside';
    const asleep = ['sleep', 'nap', 'toddlerNap'].includes(this.performing(dweller)?.inter.id ?? '') || dweller.queue[0]?.kind === 'passout';
    if (night && outside && !asleep) {
      dweller.darkMinutes = (dweller.darkMinutes ?? 0) + dt;
      const nightOf = minuteOfDay < 5 * 60 ? day - 1 : day;
      // A real spell out in the dark, not a dash to the mailbox (ours: half an hour).
      if (dweller.darkMinutes >= 30 && dweller.fearNight !== nightOf) {
        dweller.fearNight = nightOf;
        if (this.hasFear(dweller, 'dark')) this.addBuff(dweller, 'fearDarkOutside');
        else if (this.rng() < 0.25) this.maybeFear(dweller, 'dark'); // 참고 게임 Trigger_Outside x0.25
      }
      this.faceFear(dweller, 'dark', dt);
    } else dweller.darkMinutes = 0;
    // Once a day: crowds at home, a job going nowhere, a dream gone stale.
    if (dweller.fearDay === day) return;
    dweller.fearDay = day;
    // Left alone, nothing done about it, a fear grows (fears.ts FEAR_GROW_DAYS: avoidance keeps it going).
    for (const f of [...(dweller.fears ?? [])]) {
      const since = (dweller.fearSince ??= {})[f] ??= this.state.time;
      if (this.state.time - since >= FEAR_GROW_DAYS * 1440) this.growFear(dweller, f);
    }
    const here = this.state.dwellers.filter((s) => !s.away && roomAt(Math.round(s.x), Math.round(s.y)) !== 'outside').length;
    if (here >= 6) {
      if (this.hasFear(dweller, 'crowded')) this.addBuff(dweller, here >= 8 ? 'fearCrowded2' : 'fearCrowded');
      else this.maybeFear(dweller, 'crowded');
    }
    if (dweller.job && !CAREER_BY_ID[dweller.job.careerId].school && this.state.time - (dweller.job.promotedAt ?? this.state.time) > 7 * 1440) this.maybeFear(dweller, 'deadEndJob');
    if (this.hasFear(dweller, 'unfulfilled')) this.addBuff(dweller, 'fearUnfulfilled');
    else if (dweller.aspiration && this.state.time - (dweller.aspiration.since ?? this.state.time) > 7 * 1440) this.maybeFear(dweller, 'unfulfilled');
    // Long lonely, or turned down: being left on one's own (docs/ref-game/16-fears.md).
    if (this.hasFear(dweller, 'lonely')) {
      if (dweller.needs.social < 50) this.addBuff(dweller, 'fearLonely');
    } else if (dweller.needs.social < 25 || dweller.buffs.some((b) => b.id === 'rejected')) this.maybeFear(dweller, 'lonely');
    // Turned down: afraid of reaching out again (rejection sensitivity, fears.ts).
    if (dweller.buffs.some((b) => b.id === 'rejected')) this.maybeFear(dweller, 'rejection');
    // No work and nothing in view: an unknown future (a teen with no dream and no job in mind too).
    const grown = !dweller.age || dweller.age === 'teen';
    if (grown && !this.hasFear(dweller, 'future') && this.rng() < 0.3) {
      const adrift = dweller.age === 'teen' ? !dweller.aspiration && !dweller.interestJobs?.length : !dweller.job && !dweller.partTime;
      if (adrift) this.maybeFear(dweller, 'future');
    }
    // Savings enough settle a money worry.
    if (this.hasFear(dweller, 'money') && this.state.money >= MONEY_SAFE) this.faceFear(dweller, 'money', FEAR_BY_ID.money.need);
  }

  /** A day's work or school done: how it went may plant a fear, or ease one (fears.ts). */
  private shiftFears(dweller: Dweller, school: boolean, delta: number) {
    if (school) {
      // A teen living with a parent, after a bad day at school: letting the family down.
      const parentHome = this.household().some((p) => !p.away && this.familyTie(dweller, p) === '부모');
      if (delta <= -10 && dweller.age === 'teen' && parentHome) this.maybeFear(dweller, 'family');
      if (delta >= 10) this.faceFear(dweller, 'family');
      // Test anxiety: a bad day at school may start it, a good one eases it.
      if (delta <= -10) this.maybeFear(dweller, 'exam');
      if (delta >= 10) this.faceFear(dweller, 'exam');
      return;
    }
    if (delta <= -10) this.maybeFear(dweller, 'failure');
    if (delta >= 10) this.faceFear(dweller, 'failure');
    // A good day doesn't feel earned to someone afraid of being found out, but it's evidence all the same.
    if (delta >= 10 && this.hasFear(dweller, 'imposter')) {
      if (this.rng() < fearOdds(0.6, fearLevel(dweller, 'imposter'))) this.addBuff(dweller, 'fearImposterLucky');
      this.faceFear(dweller, 'imposter');
    }
  }

  // ---------- collections ----------

  /** Adds a find to the household's collection; announces new ones and finished sets. */
  collect(dweller: Dweller, collectionId: string, itemId: string): boolean {
    const c = COLLECTION_BY_ID[collectionId];
    const item = c?.items.find((i) => i.id === itemId);
    if (!c || !item) return false;
    const have = ((this.state.collections ??= {})[collectionId] ??= []);
    if (have.includes(itemId)) return false;
    have.push(itemId);
    if (hasTrait(dweller.traits, 'geek')) this.addBuff(dweller, 'collectedSomething');
    const rare = item.rarity === 'rare' ? ' ✨희귀' : '';
    this.notify(`${c.icon} ${josa(dweller.name, '이/가')} 새 수집품을 찾았어요: ${item.name}${rare} (${c.name} ${have.length}/${c.items.length})`, 'good');
    if (have.length === c.items.length) {
      if (c.reward) this.state.money += c.reward;
      this.notify(`🏆 ${c.name} 수집을 완성했어요!${c.reward ? ` (+§${c.reward})` : ''}`, 'good');
    }
    return true;
  }

  /** Sells everything in the household inventory (참고 게임 sell from inventory). */
  sellInventory() {
    const items = this.state.inventory ?? [];
    if (!items.length) return;
    const total = items.reduce((s, i) => s + i.value, 0);
    this.state.money += total;
    this.state.inventory = [];
    this.notify(`💰 보관함의 물건 ${items.length}개를 §${total}에 팔았어요`, 'good');
    this.emit();
  }

  private findCollectible(dweller: Dweller, collectionId: string) {
    if (collectionId === 'crystals' || collectionId === 'metals') this.state.samples = (this.state.samples ?? 0) + 1;
    this.collect(dweller, collectionId, rollItem(collectionId, this.rng).id);
  }

  /** A bite on the line: a fish to sell, some junk or a bit of treasure (참고 게임 FishingLocation_Catch). */
  private landCatch(dweller: Dweller) {
    const c = rollCatch(Math.floor(dweller.skills.fishing), this.rng);
    if (c.kind === 'junk') {
      this.notify(`🥾 ${josa(dweller.name, '이/가')} ${josa(c.name, '을/를')} 낚았어요…`, 'info');
      return;
    }
    if (c.kind === 'treasure') {
      // 참고 게임 fishing treasure brings up crystals and metals (fishingData possible_treasures).
      if (this.rng() < 0.5) this.findCollectible(dweller, this.rng() < 0.5 ? 'crystals' : 'metals');
      this.state.money += c.value;
      this.notify(`💰 ${josa(dweller.name, '이/가')} 물속에서 보물을 건졌어요! (+§${c.value})`, 'good');
      return;
    }
    this.collect(dweller, 'fish', c.fish.id);
    this.state.money += c.fish.price;
    if (c.fish.level >= 7) this.addBuff(dweller, 'amazingCatch');
    else if (c.fish.level >= 4) this.addBuff(dweller, 'greatCatch');
    if (dweller.aspiration) {
      const counters = (dweller.aspiration.counters ??= {});
      counters.fishCaught = (counters.fishCaught ?? 0) + 1;
      if (c.fish.level >= 4) counters.bigFish = (counters.bigFish ?? 0) + 1;
    }
    this.notify(`🐟 ${josa(dweller.name, '이/가')} ${josa(c.fish.name, '을/를')} 낚아 팔았어요 (+§${c.fish.price})`, 'good');
  }

  // ---------- chess ----------

  /** Whoever is playing across the board from `dweller`. */
  chessOpponent(dweller: Dweller, obj: PlacedObject): Dweller | undefined {
    return this.state.dwellers.find((s) => s !== dweller && !s.away && this.performing(s)?.obj === obj && this.performing(s)?.inter.players);
  }

  /** Someone sits at the board without an opponent: free will may come and play them. */
  chessWaiting(obj: PlacedObject, dweller: Dweller): boolean {
    const at = this.state.dwellers.filter((s) => s !== dweller && !s.away && this.performing(s)?.obj === obj && this.performing(s)?.inter.players);
    return at.length === 1 && !this.state.dwellers.some((s) => s !== dweller && s !== at[0] && s.queue[0]?.kind === 'interact' && (s.queue[0] as { objectUid: number }).objectUid === obj.uid);
  }

  /** Asks the nearest free dweller at home to come and play (참고 게임 chess_PlayWithPicker). */
  private inviteToChess(dweller: Dweller, obj: PlacedObject, inter: InteractionDef) {
    const free = this.state.dwellers.filter((s) => {
      if (s === dweller || s.away || s.age === 'baby' || s.queue.some((a) => a.kind === 'interact' && a.objectUid === obj.uid)) return false;
      if (s.npc && (s.npc.role !== 'guest' || s.npc.leaving)) return false;
      const cur = s.queue[0];
      if (cur && (!cur.autonomous || this.isBusyOnObject(s))) return false;
      return NEED_KEYS.every((k) => s.needs[k] > 25);
    });
    const c = free.sort((a, b) => Math.hypot(a.x - dweller.x, a.y - dweller.y) - Math.hypot(b.x - dweller.x, b.y - dweller.y))[0];
    if (!c) return;
    this.releaseEngagement(c);
    this.clearQueue(c);
    this.push(c, { kind: 'interact', objectUid: obj.uid, interactionId: inter.id, autonomous: true });
    this.notify(`♟️ ${josa(dweller.name, '이/가')} ${c.name}에게 체스 한 판 두자고 했어요`, 'info');
  }

  /**
   * A turn's worth of points for `dweller` (참고 게임 Chess GameRules: 8-10 a turn plus 1 per Logic level,
   * first to 60 wins; a turn every CHESS_TURN minutes is ours). True when the game ended.
   */
  private playChessTurn(dweller: Dweller, opponent: Dweller, obj: PlacedObject, dt: number): boolean {
    const scores = (obj.chess ??= {});
    scores[dweller.id] = (scores[dweller.id] ?? 0) + ((8 + 2 * this.rng() + Math.floor(dweller.skills.logic)) * dt) / CHESS_TURN;
    if (scores[dweller.id] < CHESS_WIN) return false;
    obj.chess = undefined;
    this.addBuff(dweller, dweller.skills.logic >= 9 ? 'chessChampion' : 'chessWin');
    for (const p of [dweller, opponent]) {
      // 참고 게임 loot_Buff_Chess_Focused: Logic 6+ always, 3-5 one time in twenty.
      if (p.skills.logic >= 6) this.addBuff(p, 'chessFocusedMed');
      else if (p.skills.logic >= 3 && this.rng() < 0.05) this.addBuff(p, 'chessFocusedLow');
    }
    // 참고 게임 Chess_Social outcome: Rel_Gain_Small for the pair.
    const rel = this.relationship(dweller.id, opponent.id);
    rel.friend = clamp(rel.friend + trackDelta('friend', rel.friend, 'M'), -100, 100);
    this.notify(`🏆 ${josa(dweller.name, '이/가')} 체스에서 ${opponent.name}에게 이겼어요!`, 'good');
    this.finishAction(opponent);
    this.finishAction(dweller);
    return true;
  }

  /** The closest TV a sofa's watchers can see (within 6 tiles). */
  tvNear(obj: PlacedObject): PlacedObject | undefined {
    const c = objectCenter(obj);
    const d = (o: PlacedObject) => Math.hypot(objectCenter(o).x - c.x, objectCenter(o).y - c.y);
    return this.state.objects.filter((o) => TVS.has(o.defId) && d(o) <= 6).sort((a, b) => d(a) - d(b))[0];
  }

  /** How much faster an object fills Fun than a basic one; watching from a sofa goes by the TV. */
  funMultiplier(obj: PlacedObject, inter: InteractionDef): number {
    const src = inter.requires === 'tvNearby' ? this.tvNear(obj) : obj;
    return (src && getDef(src.defId).funMul) || 1;
  }

  isDirty(obj: PlacedObject): boolean {
    return (obj.dirt ?? 100) <= DIRTY_AT;
  }

  isBroken(obj: PlacedObject): boolean {
    return (obj.wear ?? 100) <= BROKEN_AT;
  }

  /**
   * Why the worker can't do another stage's work yet (workStages.ts), or null. Colleagues are past
   * every stage; only the worker's own ladder counts.
   */
  stageBlocker(dweller: Dweller, inter: InteractionDef): string | null {
    const wp = this.state.workplace;
    if (this.stagesOpen || !inter.workStage || !wp || wp.careerId !== inter.workStage.career || dweller.id !== wp.workerId) return null;
    return stageLock(inter.workStage, { stage: wp.stage ?? 0, branch: wp.branch });
  }

  /** Where someone on a work lot stands in the job: the worker's stage, a colleague's own (workRoles.ts); else nothing. */
  workAtOf(dweller: Dweller): Pick<StageAt, 'stage' | 'branch'> | null {
    const wp = this.state.workplace;
    if (!wp) return null;
    if (dweller.id === wp.workerId) return { stage: wp.stage ?? 0, branch: wp.branch };
    return dweller.npc?.rung ?? null;
  }

  /** What this station's work is at this dweller's level, where the career has such a thing (workRoles.ts). */
  workVariantOf(dweller: Dweller, inter: InteractionDef): WorkVariant | undefined {
    const wp = this.state.workplace;
    const at = wp && inter.requires === 'atWork' ? this.workAtOf(dweller) : null;
    return at ? workVariant(wp!.careerId, inter, at) : undefined;
  }

  meetsRequirement(dweller: Dweller, obj: PlacedObject, inter: InteractionDef): boolean {
    if (this.utilityBlocker(inter)) return false;
    if (inter.minSkill && Math.floor(dweller.skills[inter.minSkill[0]] ?? 0) < inter.minSkill[1]) return false;
    if (inter.special !== 'repair' && this.isBroken(obj)) return false;
    if (inter.workStage && (this.state.workplace?.careerId !== inter.workStage.career || this.stageBlocker(dweller, inter))) return false;
    if (inter.onlyAt && this.state.workplace?.careerId !== inter.onlyAt) return false;
    switch (inter.requires) {
      case undefined:
        return true;
      case 'unemployed':
        return dweller.age === 'teen' ? !dweller.partTime : !dweller.job;
      case 'employed':
        return dweller.age === 'teen' ? !!dweller.partTime : !!dweller.job;
      case 'hasDishes':
        return (this.state.dishes ?? 0) > 0;
      case 'broken':
        return this.isBroken(obj);
      case 'hasFood':
        return this.servingsLeft() > 0;
      case 'emptyPlanter':
        return !obj.plant;
      case 'thirsty':
        return !!obj.plant && obj.plant.water < 60;
      case 'weedy':
        return !!obj.plant && obj.plant.weeds >= 30;
      case 'ripe':
        return !!obj.plant && ripe(obj.plant);
      case 'billDue':
        return !!this.economy.bill && this.state.money >= this.economy.bill.amount;
      case 'student':
        // One assignment a school day, gone once it's done (참고 게임 Book_Homework: the book is used up).
        return !!dweller.job && !!CAREER_BY_ID[dweller.job.careerId]?.school && (dweller.job.task ?? 0) < 1;
      case 'child':
        return dweller.age === 'child' || dweller.age === 'toddler' || (hasTrait(dweller.traits, 'childish') && !dweller.npc);
      case 'toddlerHungry':
        return !obj.served && !isYoung(dweller.age) && this.state.dwellers.some((t) => t.age === 'toddler' && !t.away && t.needs.hunger < 70 && !this.toddlerAsleep(t));
      case 'highChairServed':
        return !!obj.served && dweller.age === 'toddler';
      case 'pottyReady':
        // Some teaching first (참고 게임 hidden potty levels), and not yet fully trained.
        return dweller.age === 'toddler' && dweller.skills.potty >= 1 && dweller.skills.potty < POTTY_TRAINED;
      case 'hasSample':
        // A slide to look at, taken from a rock found (참고 게임 MicroscopeSlide_Collect*); each is used up.
        return (this.state.samples ?? 0) > 0;
      case 'fireLit':
        return !!obj.lit;
      case 'fireOut':
        return !obj.lit;
      case 'cakeWanted':
        return !this.state.objects.some((o) => o.cake);
      case 'canAgeUp':
        // Candles still lit, and someone who can grow up (참고 게임 elders and babies don't blow them out).
        return !!obj.cake && !obj.cake.blown && !dweller.npc && dweller.age !== 'elder' && dweller.age !== 'baby' && (this.state.lifespan ?? 'normal') !== 'off';
      case 'cakeBlown':
        return !!obj.cake?.blown && obj.cake.slices > 0;
      case 'atWork':
        return !!this.state.workplace;
      case 'workAlarm':
        // A call-out is the worker's to answer (the colleagues keep the station going).
        return this.stagesOpen || (!!this.state.workplace?.alarm && dweller.id === this.state.workplace.workerId);
      case 'materialistic':
        // Only when the itch for new things is coming on (참고 게임 AdmireNeed below two thirds, ours).
        return hasTrait(dweller.traits, 'materialistic') && !dweller.npc && (dweller.traitNeeds?.materialistic ?? 450) < 300;
      case 'toddler':
        return dweller.age === 'toddler' && !this.babyIn(obj);
      case 'dirty':
        return (obj.dirt ?? 100) < 50;
      case 'rocketUnbuilt':
        return (obj.rocket ?? 0) < 100;
      case 'rocketReady':
        return (obj.rocket ?? 0) >= 100;
      case 'upgradable': {
        const u = inter.upgrade ? UPGRADE_BY_ID[inter.upgrade] : undefined;
        return !!u && !obj.upgrades?.includes(u.id) && dweller.skills.handiness >= u.level;
      }
      case 'night': {
        const h = clockInfo(this.state.time).minuteOfDay / 60;
        return h >= 20 || h < 5;
      }
      case 'hasBaby':
        return !!this.babyIn(obj) && dweller.age !== 'baby' && dweller.age !== 'child';
      case 'tvNearby':
        return !!this.tvNear(obj);
    }
  }

  usableSpots(obj: PlacedObject, inter: InteractionDef): P[] {
    const def = getDef(obj.defId);
    if (inter.players || accessOf(def) === 'sides') {
      // Opponents sit across the board from each other, on the table's left and right; so does someone at it alone (a sides piece's seats are there, its front may be against a wall).
      const across = obj.dir === 'down' || obj.dir === 'up';
      const sides = across
        ? [{ x: obj.x - 1, y: obj.y }, { x: obj.x + def.w, y: obj.y }]
        : [{ x: obj.x, y: obj.y - 1 }, { x: obj.x, y: obj.y + def.h }];
      const board = footprintTiles(def, obj.x, obj.y, obj.dir);
      return sides.filter((p) => this.onFloor(p, obj.y) && !this.blocked[idx(p.x, p.y)] && reachesFrom(this.walls, board, p));
    }
    // Free, and on the object's side of the walls.
    const fp = footprintTiles(def, obj.x, obj.y, obj.dir);
    const free = (p: P) => !this.blocked[idx(p.x, p.y)] && reachesFrom(this.walls, fp, p);
    const front = frontTiles(def, obj.x, obj.y, obj.dir, inter.range ?? 1).filter(free);
    if (front.length > 0 || (inter.pose !== 'on' && accessOf(def) !== 'any')) return front;
    // Sat or lain on from any side when the front is taken (a chair tucked under a table, a bed against
    // a wall), and what's done to such a piece too (a toilet repaired, a bed made) from wherever one stands.
    return accessTiles({ ...def, access: 'any' }, obj.x, obj.y, obj.dir, 1).filter(free);
  }

  /** A seat with a table right in front of it. */
  atTable(obj: PlacedObject): boolean {
    const def = getDef(obj.defId);
    return frontTiles(def, obj.x, obj.y, obj.dir, 1).some((p) => {
      const o = this.state.objects.find((t) => t.defId === 'diningTable' && footprintTiles(getDef(t.defId), t.x, t.y, t.dir).some((q) => q.x === p.x && q.y === p.y));
      return !!o;
    });
  }

  // ---------- food ----------

  servingsLeft(): number {
    return (this.state.food ?? []).reduce((n, f) => n + f.servings, 0);
  }

  /** Where cooked food sits: on the dining table if there is one, else on the stove. */
  foodSpot(): PlacedObject | undefined {
    return this.state.objects.find((o) => o.defId === 'diningTable') ?? this.state.objects.find((o) => getDef(o.defId).interactions.some((i) => i.id === 'cook'));
  }

  /**
   * What the household's kitchen adds to a dish: the best working fridge plus the best working
   * stove (참고 게임 applies each appliance's CookingQuality loot to the crafting process).
   */
  kitchenQuality(): number {
    const best = (kind: string) =>
      Math.max(0, ...this.state.objects.filter((o) => getDef(o.defId).interactions.some((i) => i.id === kind) && !this.isBroken(o)).map((o) => getDef(o.defId).cookingQuality ?? 0));
    return best('snack') + best('cook');
  }

  /** Takes a plate from the oldest dish; the eater will feel how good it was when done. */
  private takeServing(dweller: Dweller): boolean {
    const food = this.state.food ?? [];
    const dish = food[0];
    if (!dish) return false;
    dish.servings--;
    if (dish.servings <= 0) food.shift();
    dweller.meal = dish.buff ?? null;
    return true;
  }

  /**
   * Food left out spoils after a day (참고 게임 commodity_freshness); it gets thrown out with a
   * grumble. Spoiled leftovers are a household nuisance, not a hazard, in our version.
   */
  private stepFood() {
    const food = this.state.food;
    if (!food?.length) return;
    const fresh = food.filter((f) => this.state.time - f.madeAt < FOOD_SPOILS_AFTER);
    if (fresh.length === food.length) return;
    this.state.food = fresh;
    this.notify('🤢 남은 음식이 상해서 버렸어요', 'info');
  }

  /** The best free seat to eat at for `dweller`: closest, preferring a table; none if no seat is free. */
  private seatToEat(dweller: Dweller): PlacedObject | undefined {
    const map = this.routeFrom(dweller);
    let best: { obj: PlacedObject; score: number } | undefined;
    for (const obj of this.state.objects) {
      const inter = this.interaction(obj, 'eat');
      if (!inter || !this.hasRoom(obj, inter, dweller)) continue;
      const heading = this.state.dwellers.filter((s) => {
        const a = s.queue[0];
        return s !== dweller && a?.kind === 'interact' && a.objectUid === obj.uid;
      }).length;
      if (heading >= (getDef(obj.defId).seats ?? 1)) continue;
      const spot = nearest(map, this.usableSpots(obj, inter));
      if (!spot) continue;
      const score = (this.atTable(obj) ? 1.5 : 1) / (1 + distTo(map, spot));
      if (!best || score > best.score) best = { obj, score };
    }
    return best?.obj;
  }

  /** Plants grow while watered; one left dry for a day withers away. */
  private stepGarden(dt: number) {
    for (const o of this.state.objects) {
      if (!o.plant) continue;
      const wasRipe = ripe(o.plant);
      if (!growPlant(o.plant, dt)) {
        o.plant = undefined;
        this.notify('🥀 물을 못 줘서 화분의 식물이 시들어 죽었어요', 'bad');
      } else if (!wasRipe && ripe(o.plant)) this.notify('🍅 텃밭에 채소가 열렸어요! 수확하세요', 'good');
    }
  }

  /** A finished manuscript is published straight away and starts earning royalties. */
  private publishBook(dweller: Dweller) {
    if (this.rng() >= bookFinishChance(dweller.skills.writing, dweller.emotion === 'inspired')) {
      this.judgeWork(dweller, false, true);
      const why = ['이야기가 중간에 막혔어요', '다시 읽어 보니 마음에 들지 않아 원고를 접었어요', '결말을 정하지 못했어요'][Math.floor(this.rng() * 3)];
      this.notify(`📝 ${josa(dweller.name, '이/가')} 책을 끝내지 못했어요 — ${why}. 글쓰기 실력이 늘면 끝까지 쓸 수 있어요 (지금 약 ${Math.round(bookFinishChance(dweller.skills.writing) * 100)}%)`, 'info');
      return;
    }
    const n = (this.state.booksWritten = (this.state.booksWritten ?? 0) + 1) - 1;
    const stars = bookStars(dweller.skills.writing, this.rng());
    const perDay = royaltyPerDay(dweller.skills.writing, stars);
    const title = bookTitle(n);
    const { day, hour } = clockInfo(this.state.time);
    // The first cheque comes at the next 10 o'clock payday; how many follow is by the rating (books.ts).
    const days = royaltyDays(stars, this.state.lifespan ?? 'normal');
    (this.state.royalties ??= []).push({ title, author: dweller.name, authorId: dweller.id, stars, perDay, ...(days === null ? {} : { left: days }), fromDay: hour < ROYALTY_HOUR ? day : day + 1 });
    if (dweller.aspiration) {
      const counters = (dweller.aspiration.counters ??= {});
      if (stars === 'best') counters.bestseller = (counters.bestseller ?? 0) + 1;
    }
    this.judgeWork(dweller, stars === 'best' || stars >= 4, stars !== 'best' && stars <= 1);
    const lasts = days === null ? '오래도록 조금씩 줄며' : `${days}일 동안`;
    this.notify(`📚 ${josa(dweller.name, '이/가')} 「${title}」을 출판했어요 (${STARS_LABEL(stars)}, ${lasts} 매일 인세 약 §${perDay})`, 'good');
  }

  /**
   * Every morning at 10 each published book pays its royalty: for days by its rating, a
   * bestseller for good but less and less, and less each when many books share the readers (books.ts).
   */
  private payRoyalties() {
    const { day, hour } = clockInfo(this.state.time);
    const books = this.state.royalties?.filter((b) => (b.fromDay ?? 0) <= day);
    if (!books?.length || hour < ROYALTY_HOUR || this.state.lastRoyaltyDay === day) return;
    this.state.lastRoyaltyDay = day;
    const lifespan = this.state.lifespan ?? 'normal';
    const share = readerShare(books.length);
    let total = 0;
    for (const b of books) {
      total += Math.round(royaltyOn(b, day, lifespan) * share * (1 - ROYALTY_DEVIATION + 2 * ROYALTY_DEVIATION * this.rng()));
      if (b.left !== undefined) b.left--;
    }
    // A bestseller is let go once it pays under §1 a day (some seven adult lifetimes on).
    this.state.royalties = this.state.royalties!.filter((b) => (b.left === undefined ? royaltyOn(b, day + 1, lifespan) >= 1 : b.left > 0));
    this.state.money += total;
    this.notify(`📚 오늘의 인세 §${total} (책 ${books.length}권${share < 1 ? ' · 책이 많아 독자가 나뉘었어요' : ''})`, 'good');
  }

  /** A finished canvas goes straight to the gallery for its price. */
  private sellPainting(dweller: Dweller) {
    const skill = dweller.skills.painting;
    const quality = paintingQuality(skill, this.rng());
    const value = paintingValue(skill, quality, this.rng());
    this.state.money += value;
    if (quality >= 31 && dweller.aspiration) {
      const counters = (dweller.aspiration.counters ??= {});
      counters.paintOutstanding = (counters.paintOutstanding ?? 0) + 1;
    }
    const word = quality >= 31 ? '멋진 ' : quality <= -31 ? '서툰 ' : '';
    this.judgeWork(dweller, quality >= 31, quality <= -31);
    this.notify(`🎨 ${josa(dweller.name, '이/가')} ${word}그림을 완성해 §${value}에 팔았어요`, 'good');
  }

  /** Puts a meal on the table; the cook sits down to it and, for a family meal, calls the others. */
  private serveMeal(cook: Dweller, servings: number, gourmet = false) {
    // A gourmet recipe sits in a higher band (참고 게임 CraftingSkill_07 / _10) and is judged on Gourmet.
    const skill = Math.floor(gourmet ? cook.skills.gourmet : cook.skills.cooking);
    const quality = dishQuality(skill, this.rng(), this.kitchenQuality());
    const buff = mealBuff(gourmet ? (skill >= 7 ? 10 : 7) : skill, quality);
    (this.state.food ??= []).push({ servings, madeAt: this.state.time, cookId: cook.id, quality, buff });
    if (servings > 1 && this.state.party) {
      this.partyGoal('craftMeal');
      if (this.state.party.kind === 'dinner') this.partyGoal('callToMeal');
    }
    this.judgeWork(cook, buff === 'foodFantastic' || buff === 'foodGreat', buff === 'foodBad');
    if (buff === 'foodBad') {
      this.notify(`😖 ${cook.name}의 요리가 맛없게 됐어요…`, 'info');
      if (this.hasFear(cook, 'failure')) this.addBuff(cook, 'fearFailureCraft');
      else this.maybeFear(cook, 'failure');
    }
    else if (buff === 'foodFantastic' || buff === 'foodGreat') this.notify(`🌟 ${cook.name}의 요리가 훌륭하게 됐어요!`, 'good');
    const eaters = [cook];
    if (servings > 1) {
      this.notify(`🍽️ ${cook.name}: 밥 먹자! (${servings}인분)`, 'good');
      // 참고 게임 "call to meal": everyone home and free comes to the table.
      for (const s of this.state.dwellers) {
        if (s === cook || s.away || eaters.length >= servings || s.needs.hunger >= 80) continue;
        if (s.npc && (s.npc.role !== 'guest' || s.npc.leaving)) continue;
        if (s.age === 'baby' || s.age === 'toddler') continue;
        // In bed, on the toilet or in the shower they stay put; someone on the sofa comes over.
        const busy = this.isBusyOnObject(s) && !this.chattyActivity(s);
        if (s.queue.some((a) => !a.autonomous) || busy || s.engagedWith !== null) continue;
        eaters.push(s);
      }
    }
    for (const s of eaters) {
      const seat = this.seatToEat(s);
      if (!seat) continue;
      if (s !== cook && s.queue[0]?.autonomous) this.stopRun(s);
      if (s !== cook) s.queue = s.queue.filter((q) => !q.autonomous);
      s.queue.unshift({ id: this.state.nextActionId++, kind: 'interact', objectUid: seat.uid, interactionId: 'eat', autonomous: true });
    }
  }

  /**
   * Per-tile path costs for `dweller`: tiles in front of an object someone else is using are
   * discouraged, so walkers detour around a TV watcher instead of crossing the screen.
   */
  routingCosts(dweller: Dweller): Float32Array {
    const cost = new Float32Array(this.tiles.length).fill(TRAVERSAL_COST);
    const discourage = (spots: P[]) => spots.forEach((p) => (cost[idx(p.x, p.y)] = DISCOURAGE_COST));
    for (const f of this.state.fires ?? []) cost[idx(f.x, f.y)] = DISCOURAGE_COST * 5;
    for (const other of this.state.dwellers) {
      if (other === dweller || other.away) continue;
      const perf = this.performing(other);
      if (!perf) continue;
      discourage(this.usableSpots(perf.obj, perf.inter));
      if (perf.inter.requires === 'tvNearby') {
        const c = objectCenter(perf.obj);
        for (const tv of this.state.objects) {
          const t = objectCenter(tv);
          if (!TVS.has(tv.defId) || Math.hypot(t.x - c.x, t.y - c.y) > 6) continue;
          const watch = getDef('tv').interactions[0];
          discourage(this.usableSpots(tv, watch));
        }
      }
    }
    return cost;
  }

  /**
   * Tiles other dwellers stand on or are walking to. Like 참고 게임's find-good-location
   * defaults, destinations avoid both so dwellers don't pile onto one tile.
   */
  private claimedTiles(dweller: Dweller): Set<string> {
    const out = new Set<string>();
    for (const s of this.state.dwellers) {
      if (s === dweller || s.away) continue;
      out.add(`${Math.round(s.x)},${Math.round(s.y)}`);
      const goal = s.run?.spot ?? s.run?.path.at(-1);
      if (goal) out.add(`${goal.x},${goal.y}`);
    }
    return out;
  }

  /** Cheapest unclaimed candidate, falling back to the cheapest of all. */
  private nearestUnclaimed(dweller: Dweller, map: DistMap, candidates: P[]): P | null {
    const claimed = this.claimedTiles(dweller);
    return nearest(map, candidates.filter((p) => !claimed.has(`${p.x},${p.y}`))) ?? nearest(map, candidates);
  }

  /** Cheapest-path search from the dweller's current tile. */
  routeFrom(dweller: Dweller): DistMap {
    return routeFrom(this.blocked, Math.round(dweller.x), Math.round(dweller.y), this.routingCosts(dweller), this.stairLinks, this.stairGates);
  }

  socialSpots(target: Dweller): P[] {
    const tx = Math.round(target.x);
    const ty = Math.round(target.y);
    return [
      { x: tx + 1, y: ty },
      { x: tx - 1, y: ty },
      { x: tx, y: ty + 1 },
      { x: tx, y: ty - 1 },
    ].filter((p) => this.onFloor(p, ty) && !this.blocked[idx(p.x, p.y)] && !between(this.walls, { x: tx, y: ty }, p));
  }

  /** Whether a wall (or door) stands between two tiles side by side or corner to corner: no way straight across. */
  walledOff(a: P, b: P): boolean {
    const w = this.walls;
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1) return !!between(w, a, b);
    if (Math.abs(a.x - b.x) !== 1 || Math.abs(a.y - b.y) !== 1) return false;
    const c = { x: b.x, y: a.y };
    const d = { x: a.x, y: b.y };
    return (!!between(w, a, c) || !!between(w, c, b)) && (!!between(w, a, d) || !!between(w, d, b));
  }

  /** Whether a tile is on the lot and on the same floor as row `y`. */
  onFloor(p: P, y: number): boolean {
    return p.x >= 0 && p.y >= 0 && p.x < MAP_W && idx(p.x, p.y) < this.tiles.length && floorOf(p.y) === floorOf(y);
  }

  /** The dweller (other than `exceptId`) currently heading to or using an object. */
  objectUser(uid: number, exceptId?: number): Dweller | undefined {
    return this.state.dwellers.find((s) => {
      if (s.id === exceptId || s.away) return false;
      const a = s.queue[0];
      return a?.kind === 'interact' && a.objectUid === uid && s.run !== null;
    });
  }

  /**
   * Whether `dweller` can use `obj` for `inter` alongside everyone already on it (or, unless
   * `performingOnly`, heading to it). Watching and listening are open to all; a sofa seats one
   * per tile of its front (but a nap takes the whole thing); everything else is single-use.
   */
  hasRoom(obj: PlacedObject, inter: InteractionDef, dweller: Dweller, performingOnly = false): boolean {
    const users = this.state.dwellers.filter((s) => {
      const a = s.queue[0];
      return s !== dweller && !s.away && a?.kind === 'interact' && a.objectUid === obj.uid && (performingOnly ? s.run?.phase === 'performing' : s.run !== null);
    });
    if (users.length === 0) return true;
    const theirs = users.map((s) => {
      const a = s.queue[0];
      return a?.kind === 'interact' ? this.interaction(obj, a.interactionId) : undefined;
    });
    if (inter.shared) return theirs.every((i) => i?.shared);
    if (inter.players) return users.length < inter.players && theirs.every((i) => i?.id === inter.id);
    const seats = getDef(obj.defId).seats ?? 1;
    // A sofa nap takes the whole sofa; two can sleep in a double bed.
    const seated = (i?: InteractionDef) => i?.pose === 'on' && !(i.id === 'nap' && obj.defId === 'sofa');
    if (seats < 2 || !seated(inter) || !theirs.every(seated) || users.length >= seats) return false;
    // One dweller per seat: nobody else sitting down from the same tile.
    return users.every((s) => Math.round(s.x) !== Math.round(dweller.x) || Math.round(s.y) !== Math.round(dweller.y));
  }

  /** The footprint tile a seated dweller occupies: the seat in front of where they stood. */
  seatOf(dweller: Dweller, obj: PlacedObject): P {
    const def = getDef(obj.defId);
    if ((def.seats ?? 1) < 2) return objectCenter(obj);
    const tiles = footprintTiles(def, obj.x, obj.y, obj.dir);
    const seat = tiles.reduce((a, b) => (Math.hypot(a.x - dweller.x, a.y - dweller.y) <= Math.hypot(b.x - dweller.x, b.y - dweller.y) ? a : b));
    return { x: seat.x + 0.5, y: seat.y + 0.5 };
  }

  /** Current interaction a dweller is performing, if any. */
  performing(dweller: Dweller): { obj: PlacedObject; inter: InteractionDef } | null {
    const a = dweller.queue[0];
    if (a?.kind !== 'interact' || dweller.run?.phase !== 'performing') return null;
    const obj = this.object(a.objectUid);
    const inter = obj && this.interaction(obj, a.interactionId);
    return obj && inter ? { obj, inter } : null;
  }

  /** In bed, on the toilet, in the shower… — can't be interrupted for a chat. */
  isBusyOnObject(dweller: Dweller): boolean {
    const perf = this.performing(dweller);
    return perf?.inter.pose === 'on' || !!perf?.inter.offLot || dweller.queue[0]?.kind === 'passout';
  }

  actionLabel(a: Action): { label: string; icon: string } {
    switch (a.kind) {
      case 'interact': {
        const obj = this.object(a.objectUid);
        const inter = obj && this.interaction(obj, a.interactionId);
        const doer = inter?.withJob || this.state.workplace ? this.state.dwellers.find((s) => s.queue.includes(a)) : undefined;
        const level = inter && doer ? this.workVariantOf(doer, inter) : undefined;
        return inter ? { label: level?.label ?? (doer ? forDweller(inter, doer).label : inter.label), icon: level?.icon ?? inter.icon } : { label: '?', icon: '❔' };
      }
      case 'social': {
        const s = SOCIAL_BY_ID[a.socialId];
        const t = this.dweller(a.targetId);
        if (s?.join) return { label: `${t?.name ?? '?'}의 ${s.label}`, icon: s.icon };
        return { label: `${t?.name ?? '?'}에게 ${s?.label ?? '?'}`, icon: s?.icon ?? '💬' };
      }
      case 'goto':
        return { label: '이동하기', icon: '👣' };
      case 'work':
        return { label: '출근하기', icon: '🚗' };
      case 'passout':
        return { label: '기절', icon: '😵‍💫' };
      case 'panic':
        return { label: '패닉', icon: '😱' };
      case 'extinguish':
        return { label: '불 끄기', icon: '🧯' };
      case 'mop':
        return { label: '웅덩이 닦기', icon: '🧽' };
      case 'phone': {
        const t = this.state.townies?.find((x) => x.id === a.townieId);
        return { label: `${t?.name ?? '이웃'}에게 전화하기`, icon: '📱' };
      }
    }
  }

  actionProgress(dweller: Dweller): number {
    const a = dweller.queue[0];
    const r = dweller.run;
    if (!a || !r || r.phase !== 'performing') return 0;
    if (a.kind === 'interact') {
      const obj = this.object(a.objectUid);
      const inter = obj && this.interaction(obj, a.interactionId);
      if (!inter) return 0;
      if (inter.untilFull) return Math.max(r.elapsed / inter.duration, dweller.needs[inter.untilFull] / 100);
      return r.elapsed / this.durationOf(dweller, inter, obj);
    }
    if (a.kind === 'social') return r.elapsed / (SOCIAL_BY_ID[a.socialId]?.duration ?? 1);
    if (a.kind === 'passout') return dweller.needs.energy / 40;
    if (a.kind === 'panic') return r.elapsed / PANIC_TIME;
    if (a.kind === 'extinguish') return r.elapsed / EXTINGUISH_TIME;
    if (a.kind === 'mop') return r.elapsed / MOP_TIME;
    if (a.kind === 'phone') return r.elapsed / PHONE_CALL_MINUTES;
    return 0;
  }

  // ---------- main loop ----------

  /** Speed 3 jumps to ultra speed while every dweller is asleep or at work (참고 게임 super speed). */
  /** Everyone the player controls who's at home is asleep (or passed out), and someone is home. */
  allAsleep(): boolean {
    const home = this.household().filter((s) => !s.away && s.age !== 'baby');
    return home.length > 0 && home.every((s) => this.performing(s)?.inter.id === 'sleep' || s.queue[0]?.kind === 'passout');
  }

  isUltra(): boolean {
    if (this.state.speed !== 3 || this.workGames.size) return false;
    return this.household().every((s) => {
      if (s.away || s.age === 'baby') return true;
      const id = this.performing(s)?.inter.id;
      return id === 'sleep' || s.queue[0]?.kind === 'passout';
    });
  }

  // ---------- questions from the 스페이스기전 AI (aiQuestions.ts, docs/ref-game/08-knowledge.md §6) ----------

  /**
   * A work card for the event this shift brings, if none made before is waiting for it (`stockedCard`).
   * 스페이스기전 hands one not yet used before it makes three more (isekai3dCloud.ts). Never waited for.
   */
  private askCareerCard(dweller: Dweller, slot: JobSlot, fresh = false, then?: () => void) {
    const job = this.jobIn(dweller, slot);
    if (!this.cloud || this.owner || dweller.npc || !job) return;
    const key = careerContextKey(job);
    // Going on from the last answer, while the chain allows (cardChain): asked for anew.
    const follow = job.cardChain?.text && job.cardChain.answer ? { text: job.cardChain.text, answer: job.cardChain.answer } : undefined;
    this.cloud.careerCard(careerRequest(dweller, job, this.state.player, this.state.aiAvoid ?? [], this.state.key, follow), (id, raw) => {
      const now = this.jobIn(dweller, slot);
      if (!now || now.careerId !== job.careerId) return;
      const event = toCareerEvent(id, raw, { ...now, level: job.level });
      if (!event) {
        if (then) this.notify('🛠 받은 카드가 게임의 검사를 통과하지 못했어요', 'bad');
        return;
      }
      // A follow-up comes next; a new card draws how many may follow it (0–2, at the user's request).
      if (follow) {
        event.followUp = true;
        if (now.cardChain) now.cardChain = { left: now.cardChain.left };
      } else event.chainLeft = Math.floor(this.rng() * 3);
      // Kept until an event takes it, even if it came after this shift's (a few, the oldest let go); a follow-up first.
      if (!now.aiCards?.some((c) => c.id === id)) now.aiCards = (follow ? [{ id, key, event }, ...(now.aiCards ?? [])] : [...(now.aiCards ?? []), { id, key, event }]).slice(-6);
      then?.();
    }, fresh || !!follow);
  }

  /**
   * The AI's work card an event takes (oldest first): one made for this rung, else one made earlier
   * for another rung of the job at the same stage (입문, 전문, 리더) and not used; null if none.
   */
  private stockedCard(job: Job): NonNullable<Job['aiCards']>[number] | null {
    const cards = job.aiCards ?? [];
    const stage = stageOf(job).stage;
    const sameStage = (c: (typeof cards)[number]) => {
      const level = Number(c.key.split(':')[2]);
      return c.key.startsWith(`career:${job.careerId}:`) && Number.isInteger(level) && stageOf({ ...job, level }).stage === stage;
    };
    return cards.find((c) => c.key === careerContextKey(job)) ?? cards.find(sameStage) ?? null;
  }

  /** A question to think about, on one of life's big moments or what the player found in the career explorer. */
  private askThought(dweller: Dweller, kind: 'life' | 'explore', event?: LifeEvent) {
    if (!this.cloud || this.owner || dweller.npc) return;
    const req = kind === 'life' ? lifeRequest(dweller, event!, this.state.player, this.state.aiAvoid ?? [], this.state.key) : exploreRequest(dweller, this.state.player, this.state.aiAvoid ?? [], this.state.key);
    this.cloud.thought(req, (id, raw) => {
      const card = toThinkCard(raw);
      if (!card || !this.dweller(dweller.id)) return;
      this.state.thoughts = [...(this.state.thoughts ?? []), { id, kind, dwellerId: dweller.id, event, card, at: this.state.time }].slice(-3);
      this.state.aiAvoid = remember(this.state.aiAvoid, card.text);
      this.notify(`💭 ${josa(dweller.name, '와/과')} 함께 생각해 볼 질문이 왔어요 — 위쪽 💭 를 눌러 보세요`, 'info', { dwellerId: dweller.id });
      this.emit();
    });
  }

  /** 🛠 (a 스페이스기전 admin testing): this dweller's work card now, shown as soon as it comes. */
  devCareerCard(dwellerId: number) {
    const dweller = this.dweller(dwellerId);
    const slot: JobSlot | null = dweller?.job ? 'job' : dweller?.partTime ? 'partTime' : null;
    if (!dweller || !slot || !this.cloud) return this.notify('🛠 직업이 있는 캐릭터를 골라 주세요', 'info');
    // Three made now (what an admin tests), then the event with the first of them.
    this.askCareerCard(dweller, slot, true, () => {
      if (!this.state.careerEvent) this.startCareerEvent(dweller, slot);
    });
  }

  /** 🛠 (a 스페이스기전 admin testing): a question to think about now. */
  devThought(dwellerId: number, kind: 'life' | 'explore', event?: LifeEvent) {
    const dweller = this.dweller(dwellerId);
    if (dweller) this.askThought(dweller, kind, event);
  }

  /** The player's answer to a question to think about: an option, their own words, or neither (skipped). */
  answerThought(id: string, option: number | null, note?: string) {
    const t = this.state.thoughts?.find((x) => x.id === id);
    if (!t) return;
    this.state.thoughts = this.state.thoughts!.filter((x) => x !== t);
    const words = note?.trim().slice(0, 300) || undefined;
    if (option !== null || words) {
      rememberThought((this.state.player ??= newKnowledge()), this.state.time, {
        game: this.state.key,
        dwellerId: t.dwellerId,
        kind: t.kind,
        event: t.event,
        label: t.event ? LIFE_EVENT_LABEL[t.event] : '진로 탐색',
        question: t.card.text,
        option: option === null ? undefined : t.card.options[option],
        note: words,
      });
      this.cloud?.knowledgeChanged();
    }
    this.cloud?.answered(id, option, words);
    this.emit();
  }

  /** What 스페이스기전 keeps of the player (from every game and PC), merged into this game's (knowledge.ts syncMerge). */
  mergeRemoteKnowledge(remote: PlayerKnowledge | undefined) {
    if (!remote?.episodes) return;
    this.state.player = syncMerge(this.state.player ?? newKnowledge(), remote, this.state.time);
    this.emit();
  }

  // ---------- things that happen at work (careerEvents.ts) ----------

  /** Something comes up at work: the game waits for the player's answer, like a 참고 게임 chance card. */
  private startCareerEvent(dweller: Dweller, slot: JobSlot) {
    const job = this.jobIn(dweller, slot);
    if (!job) return;
    job.eventAt = undefined;
    // A card the 스페이스기전 AI made (aiQuestions.ts): for this rung, else one not yet used from
    // another rung at this stage; with none, the written ones.
    const ai = this.stockedCard(job);
    if (ai) {
      job.aiCards = job.aiCards!.filter((c) => c !== ai);
      this.state.careerEvent = { dwellerId: dweller.id, slot, eventId: ai.event.id, at: this.state.time, ai: ai.event, aiId: ai.id };
      this.state.aiAvoid = remember(this.state.aiAvoid, ai.event.text);
      this.speedBeforeModal = this.state.speed || 1;
      this.state.speed = 0;
      this.emit();
      return;
    }
    // Written cards are only for when the AI can't make one (2026-11-01, at the user's request): with it
    // at work, the question waits for its card a while, and the day goes without one rather than a written one.
    if (this.cloud?.canMakeCards?.() && !dweller.npc) {
      const shiftEnd = dweller.away?.until ?? this.state.time;
      if (this.state.time + AI_CARD_WAIT < shiftEnd) {
        job.eventAt = this.state.time + AI_CARD_WAIT;
        this.askCareerCard(dweller, slot);
      }
      return;
    }
    const pool = eventsFor(job.careerId, job.level, job.eventsSeen, this.state.time);
    if (pool.length === 0) return;
    // The job's own about half the time while any are left, else anything that happens at work.
    const own = pool.filter((e) => e.careers[0] !== '*');
    const from = own.length && this.rng() < 0.5 ? own : pool;
    const event = from[Math.floor(this.rng() * from.length)];
    (job.eventsSeen ??= {})[event.id] = this.state.time;
    this.state.careerEvent = { dwellerId: dweller.id, slot, eventId: event.id, at: this.state.time };
    this.speedBeforeModal = this.state.speed || 1;
    this.state.speed = 0;
    this.emit();
  }

  /** The event waiting for an answer, with its text filled in, and each answer's odds. */
  careerEventView() {
    const pending = this.state.careerEvent;
    if (!pending) return null;
    const event = pending.ai ?? EVENT_BY_ID[pending.eventId];
    const dweller = this.dweller(pending.dwellerId);
    const job = dweller && this.jobIn(dweller, pending.slot);
    if (!event || !dweller || !job) return null;
    const who = this.workerCopy(dweller);
    return {
      event,
      dweller,
      career: CAREER_BY_ID[job.careerId],
      text: eventText(event.text, dweller.name),
      // A task card's question, hints and example name the dweller too ({n:은/는}).
      task: event.task && {
        ask: eventText(event.task.ask, dweller.name),
        hints: event.task.hints.map((h) => eventText(h, dweller.name)),
        example: eventText(event.task.example, dweller.name),
      },
      choices: event.choices.map((raw) => {
        const c = { ...raw, skill: raw.skill && jobSkill(job.careerId, raw.skill, job.branch) };
        return { label: c.label, skill: c.skill, mood: c.mood, chance: successChance(c, who.skills, who.emotion) };
      }),
    };
  }

  /**
   * After an AI card is answered: while the chain allows, the next card goes on from it (the
   * situation and the answer kept for the next ask); else the next card is a new situation.
   */
  private chainAfter(job: Job, event: CareerEvent, answer: string): boolean {
    if (!event.id.startsWith('ai:')) return false;
    const left = event.followUp ? job.cardChain?.left ?? 0 : event.chainLeft ?? 0;
    job.cardChain = left > 0 ? { left: left - 1, text: event.text, answer } : undefined;
    return left > 0;
  }

  /** The answer's result on screen (`workResult`), time held until it's read; one the dweller gave by itself only goes in the log. */
  private showWorkResult(result: WorkResult | null) {
    if (result) this.state.workResult = result;
    if (!this.modalOpen()) this.state.speed = this.speedBeforeModal;
  }

  /** The result read: time goes on. */
  closeWorkResult() {
    if (!this.state.workResult) return;
    this.state.workResult = undefined;
    if (!this.modalOpen()) this.state.speed = this.speedBeforeModal;
    this.emit();
  }

  /**
   * A task card answered (2026-10-25): in the player's own words, or 모르겠어요 (`own` null). Thinking
   * it through counts a little (performance, the job's skill, focus); either way the example is
   * there to see, and the answer is kept on 스페이스기전 like any other.
   */
  answerCareerTask(own: string | null, byDweller = false) {
    const pending = this.state.careerEvent;
    const event = pending?.ai;
    if (!pending || !event?.task) return;
    this.state.careerEvent = undefined;
    const dweller = this.dweller(pending.dwellerId);
    const job = dweller && this.jobIn(dweller, pending.slot);
    const words = own?.trim().slice(0, 300) || null;
    let result: WorkResult | null = null;
    if (dweller && job) {
      const career = CAREER_BY_ID[job.careerId];
      result = { dwellerId: dweller.id, kind: 'task', title: `${career?.icon ?? ''} ${career?.name ?? ''}`.trim(), chose: words, example: eventText(event.task.example, dweller.name), perf: 0, ...(event.insight ? { insight: fieldNote(eventText(event.insight, dweller.name)) } : {}) };
      if (words && words.length >= 5) {
        const perf = 7;
        job.performance = clamp(job.performance + perf, -100, 100);
        job.shiftDelta = (job.shiftDelta ?? 0) + perf;
        const who = this.workerCopy(dweller);
        const main = SKILL_PROFILES[job.careerId]?.main ?? CAREER_BY_ID[job.careerId]?.skill;
        if (main) who.skills[main] = Math.min(MAX_SKILL, (who.skills[main] ?? 0) + 0.3);
        (this.workGames.get(dweller.id) ?? this).addBuff(who, 'storyFocused');
        this.notify(`💡 ${josa(dweller.name, '이/가')} 과제에 대한 생각을 냈어요 (성과 +${perf})`, 'good');
        Object.assign(result, { perf, buff: 'storyFocused', ...(main ? { skill: { key: main, amount: 0.3 } } : {}) });
      }
      if (this.chainAfter(job, event, words ?? '모르겠다고 했다')) result.next = 'card';
    }
    if (!byDweller && pending.aiId) this.cloud?.answered(pending.aiId, null, words ?? '모르겠어요');
    this.showWorkResult(byDweller ? null : result);
    this.emit();
  }

  /** The dweller as they are right now: the copy on the work lot during a followed shift. */
  private workerCopy(dweller: Dweller): Dweller {
    return this.workGames.get(dweller.id)?.dweller(dweller.id) || dweller;
  }

  /**
   * Answer the event: a gamble comes off with its chance (skill and mood, 참고 게임 weights), and the
   * outcome's performance, money, moodlet and skill go to the dweller.
   */
  answerCareerEvent(choice: number, byDweller = false) {
    const pending = this.state.careerEvent;
    if (!pending) return;
    this.state.careerEvent = undefined;
    const event = pending.ai ?? EVENT_BY_ID[pending.eventId];
    const dweller = this.dweller(pending.dwellerId);
    const job = dweller && this.jobIn(dweller, pending.slot);
    if (!event || !dweller || !job) {
      this.showWorkResult(null);
      return this.emit();
    }
    const raw = event.choices[choice] ?? event.choices[0];
    const c = { ...raw, skill: raw.skill && jobSkill(job.careerId, raw.skill, job.branch) };
    const who = this.workerCopy(dweller);
    const ok = !c.lose || this.rng() < successChance(c, who.skills, who.emotion);
    const out = ok ? c.win : c.lose!;
    // 회복탄력성: a setback costs less (mind.ts).
    const perf = out.perf < 0 ? Math.round(out.perf * setbackFactor(who.skills.resilience ?? 0)) : out.perf;
    job.performance = clamp(job.performance + perf, -100, 100);
    job.shiftDelta = (job.shiftDelta ?? 0) + perf;
    if (out.money) this.state.money = Math.max(0, this.state.money + out.money);
    for (const s of new Set([dweller, who])) {
      if (out.buff) (s === dweller ? this : this.workGames.get(dweller.id)!).addBuff(s, out.buff);
      if (out.skill) s.skills[out.skill] = Math.min(MAX_SKILL, s.skills[out.skill] + 0.5);
    }
    // The player's answer becomes part of what the game knows about the player (knowledge.ts); an
    // answer the dweller gave by itself is the dweller's own free will, and isn't kept.
    if (!byDweller && !dweller.npc) {
      rememberAnswer((this.state.player ??= newKnowledge()), this.state.time, {
        dwellerId: dweller.id,
        dwellerName: dweller.name,
        careerId: job.careerId,
        careerName: CAREER_BY_ID[job.careerId]?.name ?? job.careerId,
        level: job.level,
        eventId: event.id,
        situation: eventText(event.text, dweller.name),
        label: c.label,
        skill: c.skill,
        risky: !!c.lose,
        approach: c.approach,
        won: ok,
        perf: out.perf,
        honest: HONEST_CHOICE[event.id] === undefined ? undefined : HONEST_CHOICE[event.id] === choice,
        game: this.state.key,
      });
      this.cloud?.knowledgeChanged();
    }
    if (pending.aiId) this.cloud?.answered(pending.aiId, choice);
    const follows = this.chainAfter(job, event, c.label);
    const bits = [perf ? `성과 ${perf > 0 ? '+' : ''}${perf}` : '', out.money ? `§${out.money > 0 ? '+' : ''}${out.money}` : ''].filter(Boolean).join(', ');
    this.notify(`📋 ${eventText(out.text, dweller.name)}${bits ? ` (${bits})` : ''}`, out.perf >= 0 && (out.money ?? 0) >= 0 ? 'good' : 'bad');
    const career = CAREER_BY_ID[job.careerId];
    const insight = raw.insight ?? event.insight;
    this.showWorkResult(
      byDweller
        ? null
        : {
            dwellerId: dweller.id,
            kind: 'card',
            title: `${career?.icon ?? ''} ${career?.name ?? ''}`.trim(),
            chose: c.label,
            ...(c.lose ? { ok } : {}),
            text: eventText(out.text, dweller.name),
            ...(event.major ? { major: event.major } : {}),
            ...(insight ? { insight: fieldNote(eventText(insight, dweller.name)) } : {}),
            perf,
            ...(out.money ? { money: out.money } : {}),
            ...(out.skill ? { skill: { key: out.skill, amount: 0.5 } } : {}),
            ...(out.buff ? { buff: out.buff } : {}),
            ...(follows ? { next: 'card' as const } : {}),
          },
    );
    this.emit();
  }

  /** Nobody answered (no one at the controls): the dweller decides, going for the better bet (ours). */
  private autoAnswerCareerEvent() {
    const v = this.careerEventView();
    if (!v) {
      this.state.careerEvent = undefined;
      return;
    }
    if (v.event.task) return this.answerCareerTask(null, true);
    const worth = v.event.choices.map((c, i) => v.choices[i].chance * c.win.perf + (1 - v.choices[i].chance) * (c.lose?.perf ?? 0) + (c.win.money ?? 0) / 50);
    this.answerCareerEvent(worth.indexOf(Math.max(...worth)), true);
  }

  update(realDt: number) {
    let dt = Math.min(realDt, 0.1) * (this.isUltra() ? ULTRA_SPEED : SPEEDS[this.state.speed]);
    // Today's coins (cloud/playPass.ts): time runs only while there's play left, then stops. Sleep
    // is free (2026-10-20, at the user's request): while everyone the player controls who's home is
    // asleep, the night goes by without using any of it.
    if (this.playLeft !== null && !this.allAsleep()) {
      dt = Math.min(dt, this.playLeft);
      this.playLeft -= dt;
      this.played += dt;
      if (this.playLeft <= 0 && this.state.speed !== 0) {
        this.state.speed = 0;
        this.notify('⏳ 오늘 넣은 동전의 시간이 다 됐어요. 위쪽 «동전 넣기»를 누르면 오락기에서 동전을 넣고 이어서 할 수 있어요', 'info');
        this.emit();
      }
    }
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(STEP, remaining);
      this.step(step);
      remaining -= step;
    }
    this.emitTimer += realDt;
    if (this.emitTimer >= 0.1) {
      this.emitTimer = 0;
      this.emit();
    }
  }

  step(dt: number) {
    if (this.retiredJobs.length) {
      for (const name of this.retiredJobs) this.notify(`📦 ${josa(name, '이/가')} 다니던 직업이 게임에서 사라져 무직이 됐어요. 새 일자리를 찾아 주세요`, 'info');
      this.retiredJobs = [];
    }
    this.dropStaleCareerEvent();
    if (this.state.careerEvent && this.state.time - this.state.careerEvent.at >= EVENT_AUTO_ANSWER) this.autoAnswerCareerEvent();
    useRooms(this.tiles, this.walls);
    this.state.time += dt;
    if (this.state.workplace) return this.stepWorkLot(dt);
    // A work lot opened during this step starts on this step's time, so only those already open step along.
    const works = [...this.workGames];
    for (const dweller of [...this.state.dwellers]) this.stepDweller(dweller, dt);
    for (const [dwellerId, work] of works) {
      if (this.workGames.get(dwellerId) !== work) continue;
      work.step(dt);
      useRooms(this.tiles, this.walls);
      if (this.state.time >= work.state.workplace!.end) this.finishWorkplace(dwellerId, false);
    }
    this.stepNeighborhood();
    this.stepFire();
    this.payRoyalties();
    this.stepGarden(dt);
    if (this.state.puddles?.length) this.state.puddles = this.state.puddles.filter((p) => this.state.time - p.since < PUDDLE_DRIES_AFTER);
    this.stepRelationships(dt);
    this.stepBills();
    this.stepFood();
  }

  // ---------- wants ----------

  /** Days without going anywhere get to anyone old enough to go out. */
  private stepCabinFever(dweller: Dweller) {
    if (dweller.npc || this.state.workplace || dweller.age === 'baby' || dweller.age === 'toddler') return;
    if (dweller.away || dweller.lastOutAt === undefined) {
      dweller.lastOutAt = this.state.time;
      return;
    }
    if (this.state.time - dweller.lastOutAt >= STUCK_AT_HOME_DAYS * 1440) {
      this.addBuff(dweller, 'stuckAtHome');
      // Said once; it comes again if another three days go the same way.
      dweller.lastOutAt = this.state.time;
    }
  }

  private stepWants(dweller: Dweller) {
    if (dweller.wantFillAt === undefined || this.state.time >= dweller.wantFillAt) {
      dweller.wantFillAt = this.state.time + 60;
      fillWants(this, dweller);
      this.checkAspiration(dweller);
    }
    for (const w of [...(dweller.wants ?? [])]) if (fulfils(dweller, w, null, this)) this.completeWant(dweller, w);
  }

  /**
   * Advances the dweller's aspiration when every goal of the current milestone is met: milestone
   * points, a Confident moodlet, and a bonus with a big Happy moodlet when the track is done.
   */
  checkAspiration(dweller: Dweller) {
    const asp = dweller.aspiration;
    const def = asp && ASPIRATION_BY_ID[asp.id];
    if (!asp || !def) return;
    while (asp.milestone < def.milestones.length) {
      const m = def.milestones[asp.milestone];
      // Each goal pays its share as it's met (참고 게임 satisfaction_points per objective; growing up pays nothing).
      const paying = m.goals.filter((g) => g.kind !== 'grownUp').length;
      const share = Math.round(m.points / Math.max(1, paying));
      const met = m.goals.map((g) => goalMet(this, dweller, g));
      asp.paid ??= [];
      met.forEach((ok, i) => {
        if (!ok || asp.paid!.includes(i)) return;
        asp.paid!.push(i);
        if (m.goals[i].kind !== 'grownUp') dweller.satisfaction = (dweller.satisfaction ?? 0) + share;
      });
      if (!met.every(Boolean)) return;
      asp.milestone++;
      asp.paid = [];
      asp.since = this.state.time;
      this.faceFear(dweller, 'unfulfilled');
      if (asp.milestone === def.milestones.length) {
        dweller.satisfaction = (dweller.satisfaction ?? 0) + COMPLETION_BONUS;
        // A child's aspiration leaves its gift for life (참고 게임 aspiration_Child_*_A3 reward traits);
        // the others, their area's trait (참고 게임 AspirationTrack reward).
        const reward = def.reward ?? (def.area ? AREA_TRAITS[def.area].reward : undefined);
        if (reward && !dweller.traits.includes(reward)) {
          dweller.traits.push(reward);
          const gift = TRAITS.find((t) => t.id === reward);
          if (gift) this.notify(`🎁 ${josa(dweller.name, '이/가')} 「${gift.icon} ${gift.label}」 특성을 얻었어요!`, 'good');
        }
        this.addBuff(dweller, 'aspirationDone');
        this.notify(`🏆 ${josa(dweller.name, '이/가')} 「${def.label}」을(를) 모두 해냈어요! (+${COMPLETION_BONUS} 만족 포인트)`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: '열망을 모두 해냈어요!', icon: def.icon } });
        if (def.id === 'findMyself') this.suggestArea(dweller);
      } else {
        this.addBuff(dweller, 'milestoneReached');
        this.notify(`🏅 ${dweller.name}: 「${def.label}」 ${asp.milestone}단계 「${m.name ?? ''}」을(를) 해냈어요!`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: `열망 ${asp.milestone}단계!`, icon: '🏅' } });
      }
    }
  }

  /**
   * Changes the dweller's aspiration. Dreams change: what was done for the old one is kept (꿈의
   * 발자취), and coming back to it carries on where it was left (참고 게임 keeps a track's progress).
   */
  /**
   * Changing who someone is, in play (2026-11-01, at the user's request; the character screen): the
   * traits that can be picked, likes and dislikes. What they've earned stays: reward traits, a dream's own.
   */
  editMind(dwellerId: number, mind: { traits?: string[]; likes?: string[]; dislikes?: string[] }) {
    const dweller = this.dweller(dwellerId);
    if (!dweller) return;
    if (mind.traits) {
      const earned = dweller.traits.filter((t) => TRAIT_BY_ID[t]?.reward || (dweller.aspiration && ASPIRATION_BY_ID[dweller.aspiration.id]?.area && AREA_TRAITS[ASPIRATION_BY_ID[dweller.aspiration.id].area!]?.bonus === t));
      dweller.traits = [...new Set([...mind.traits.filter((t) => TRAIT_BY_ID[t]), ...earned])];
    }
    if (mind.likes) dweller.likes = mind.likes.slice(0, MAX_LIKES);
    if (mind.dislikes) dweller.dislikes = mind.dislikes.filter((d) => !mind.likes?.includes(d)).slice(0, MAX_DISLIKES);
    this.emit();
  }

  /** Giving up a dream for none: what they've done of it stays in the log. */
  clearAspiration(dwellerId: number) {
    const dweller = this.dweller(dwellerId);
    if (!dweller?.aspiration) return;
    (dweller.aspirationLog ??= {})[dweller.aspiration.id] = dweller.aspiration;
    dweller.aspiration = undefined;
    this.emit();
  }

  setAspiration(dwellerId: number, id: string) {
    const dweller = this.dweller(dwellerId);
    if (!dweller || !ASPIRATION_BY_ID[id]) return;
    const log = (dweller.aspirationLog ??= {});
    if (dweller.aspiration) log[dweller.aspiration.id] = dweller.aspiration;
    dweller.aspiration = log[id] ?? { id, milestone: 0, counters: {}, since: this.state.time };
    log[id] = dweller.aspiration;
    this.syncAspirationBonus(dweller);
    this.checkAspiration(dweller);
    this.emit();
  }

  /** The area's bonus trait goes with the aspiration chosen (참고 게임 primary_trait): changed with it, gone without one. */
  syncAspirationBonus(dweller: Dweller) {
    const def = dweller.aspiration && ASPIRATION_BY_ID[dweller.aspiration.id];
    const want = def?.area ? AREA_TRAITS[def.area].bonus : undefined;
    if (dweller.aspBonus === want) return;
    if (dweller.aspBonus) dweller.traits = dweller.traits.filter((t) => t !== dweller.aspBonus);
    dweller.aspBonus = want && !dweller.traits.includes(want) ? want : undefined;
    if (dweller.aspBonus) dweller.traits.push(dweller.aspBonus);
  }

  /** "나를 찾아가는 여행" done: the area the dweller spent most time in is suggested (picking stays the player's). */
  private suggestArea(dweller: Dweller) {
    const counts = Object.entries(dweller.areaCounts ?? {}).filter(([a]) => a !== 'explore');
    if (!counts.length) return;
    const [area] = counts.sort((a, b) => b[1] - a[1])[0];
    dweller.suggestedArea = area;
    const info = ASP_AREAS[area as AspArea];
    if (info) this.notify(`🧭 ${josa(dweller.name, '은/는')} ${info.icon} ${info.label}에 마음이 가장 많이 갔어요. 이 영역의 열망을 골라 봐도 좋고, 계속 찾아봐도 괜찮아요`, 'good');
  }

  /** A field looked at in the career explorer (for "세상 둘러보기"). */
  noteExplore(dwellerId: number, fieldId: string | undefined) {
    const dweller = this.dweller(dwellerId);
    if (!dweller || !fieldId) return;
    const seen = (dweller.explored ??= []);
    if (seen.includes(fieldId)) return;
    seen.push(fieldId);
    // Looking into what work there is eases an unknown future (fears.ts).
    this.faceFear(dweller, 'future');
    // Every third field looked at, a question for the player about what they're drawn to (aiQuestions.ts).
    if (seen.length % 3 === 0) this.askThought(dweller, 'explore');
    this.checkAspiration(dweller);
    this.emit();
  }

  /** Marks or unmarks a job as interesting (up to three; only shown, never a goal). */
  toggleInterestJob(dwellerId: number, careerId: string) {
    const dweller = this.dweller(dwellerId);
    if (!dweller) return;
    const list = (dweller.interestJobs ??= []);
    if (list.includes(careerId)) dweller.interestJobs = list.filter((x) => x !== careerId);
    else if (list.length < 3) {
      list.push(careerId);
      // A job in mind eases an unknown future (fears.ts).
      this.faceFear(dweller, 'future');
    }
    else this.notify('관심 직업은 3개까지 찜할 수 있어요. 하나를 빼고 다시 해 보세요', 'info');
    this.emit();
  }

  /** Counts something towards the dweller's aspiration, and the area and kind of work it belongs to. */
  private countActivity(dweller: Dweller, key: string, skill?: SkillKey) {
    if (dweller.npc) return;
    if (dweller.aspiration) {
      const counters = (dweller.aspiration.counters ??= {});
      counters[key] = (counters[key] ?? 0) + 1;
      this.wantEvent(dweller, { kind: 'counter', counter: key });
      for (const [type, ids] of Object.entries(TYPE_ACTIVITIES)) if (ids.includes(key.replace(/^social_/, ''))) this.wantEvent(dweller, { kind: 'counter', counter: `type_${type}` });
      for (const [type, ids] of Object.entries(TYPE_ACTIVITIES)) if (ids.includes(key.replace(/^social_/, ''))) counters[`type_${type}`] = (counters[`type_${type}`] ?? 0) + 1;
    }
    const area = areaOfActivity(key, skill);
    if (area) {
      dweller.areaCounts = { ...(dweller.areaCounts ?? {}), [area]: (dweller.areaCounts?.[area] ?? 0) + 1 };
      if (!(dweller.triedAreas ??= []).includes(area)) dweller.triedAreas.push(area);
    }
  }

  /** Tells a dweller's wants that something happened. */
  /** A guest is in: everyone at home wants something to do with them (wants.ts wantGuest). */
  private guestArrived(guest: Dweller) {
    for (const s of this.household()) if (!s.away && s.age !== 'baby' && s.age !== 'toddler') wantGuest(this, s, guest);
    this.emit();
  }

  wantEvent(dweller: Dweller, e: WantEvent) {
    for (const w of [...(dweller.wants ?? [])]) if (fulfils(dweller, w, e)) this.completeWant(dweller, w);
  }

  private completeWant(dweller: Dweller, w: ActiveWant) {
    const def = WANT_BY_ID[w.defId];
    dweller.wants = (dweller.wants ?? []).filter((x) => x !== w);
    if (!def) return;
    dweller.satisfaction = (dweller.satisfaction ?? 0) + def.score;
    dweller.wantCooldown = { ...(dweller.wantCooldown ?? {}), [cooldownKey(w)]: this.state.time + WANT_COOLDOWN };
    // Chaining: the next want from the same set is 1.5× likelier; other sets cool back down.
    dweller.wantChain = { [def.set]: CHAIN_BOOST };
    this.addBuff(dweller, 'wantFulfilled');
    this.notify(`✨ ${dweller.name}의 바람 달성: ${wantLabel(this, w)} (+${def.score} 만족 포인트)`, 'good');
  }

  refreshWants(dwellerId: number) {
    const dweller = this.dweller(dwellerId);
    if (!dweller) return;
    dweller.wants = [];
    fillWants(this, dweller);
    dweller.wantFillAt = this.state.time + 60;
    this.emit();
  }

  /** Why this can't be bought for this dweller now, besides the price (nothing to use it on). */
  rewardBlocker(dweller: Dweller, item: (typeof STORE)[number]): string | null {
    if (item.trait && dweller.traits.includes(item.trait)) return '이미 가졌어요';
    if (item.then === 'easeFear' && !dweller.fears?.length) return '두려움이 없어요';
    if (item.then === 'clearBad' && !dweller.buffs.some((b) => this.clearableBad(b.id))) return '털어 낼 기분이 없어요';
    if (item.then === 'mendRel' && !this.worstRelation(dweller)) return '사이 나쁜 사람이 없어요';
    if (item.then === 'retryLove' && !Object.entries(this.state.relationships).some(([k, r]) => k.split('-').map(Number).includes(dweller.id) && Object.values(r.refusedUntil ?? {}).some((t) => t > this.state.time))) return '기다리는 고백이 없어요';
    return null;
  }

  private clearableBad(id: string): boolean {
    const d = BUFFS[id];
    return !!d?.emotion && EMOTIONS[d.emotion].polarity === 'negative' && !CONDITION_BUFF_IDS.has(id) && d.weight < 10 && id !== 'injured';
  }

  private worstRelation(dweller: Dweller) {
    const mine = Object.entries(this.state.relationships).filter(([k, r]) => k.split('-').map(Number).includes(dweller.id) && r.friend < 0);
    return mine.sort((a, b) => a[1].friend - b[1].friend)[0]?.[1];
  }

  /** What buying does beyond a moodlet or a trait. */
  private storeEffect(dweller: Dweller, then: (typeof STORE)[number]['then']) {
    if (then === 'clearBad') {
      dweller.buffs = dweller.buffs.filter((b) => !this.clearableBad(b.id));
      dweller.emotion = this.emotionOf(dweller).emotion;
    }
    if (then === 'easeFear') {
      const id = dweller.fears?.[0];
      if (id) this.faceFear(dweller, id, Math.ceil(FEAR_BY_ID[id].need / 2));
    }
    if (then === 'mendRel') {
      const rel = this.worstRelation(dweller);
      if (rel) rel.friend = clamp(rel.friend + 30, -100, 100);
    }
    if (then === 'retryLove') {
      for (const [k, r] of Object.entries(this.state.relationships)) if (k.split('-').map(Number).includes(dweller.id)) delete r.refusedUntil;
    }
  }

  buyReward(dwellerId: number, itemId: string): boolean {
    const dweller = this.dweller(dwellerId);
    const item = STORE.find((i) => i.id === itemId);
    if (!dweller || !item) return false;
    if ((dweller.satisfaction ?? 0) < item.price || this.rewardBlocker(dweller, item)) return false;
    dweller.satisfaction = (dweller.satisfaction ?? 0) - item.price;
    if (item.buff) this.addBuff(dweller, item.buff);
    if (item.trait) dweller.traits = [...dweller.traits, item.trait];
    this.storeEffect(dweller, item.then);
    this.notify(`🎁 ${josa(dweller.name, '이/가')} ${josa(item.label, '을/를')} 얻었어요`, 'good');
    this.emit();
    return true;
  }

  // ---------- bills ----------

  /** Weekly bill every Monday 05:00; unpaid bills warn after a day and cut power, then water. */
  private stepBills() {
    const eco = this.economy;
    const { day, weekday, minuteOfDay } = clockInfo(this.state.time);
    if (weekday === 0 && minuteOfDay >= 300 && eco.lastBillDay !== day && day > 0) {
      eco.lastBillDay = day;
      // Someone who knows money keeps the household's costs down (ours): 2% a business level, at most 20%.
      const savvy = Math.min(10, Math.max(0, ...this.household().filter((h) => h.age !== 'child' && h.age !== 'toddler' && h.age !== 'baby').map((h) => Math.floor(h.skills.business ?? 0))));
      const thisWeek = Math.round(billAmount(this.state.objects, eco.usage, { value: this.lotValue, rent: this.lot.rent }) * (1 - 0.02 * savvy));
      const amount = thisWeek + (eco.bill?.amount ?? 0);
      eco.usage = { power: 0, water: 0 };
      eco.bill = { amount, issuedAt: this.state.time, warned: false, cut: eco.bill?.cut ?? [] };
      // Money worries (fears.ts): heavy at a bill, and a bill that can't be met may start one.
      for (const h of this.household().filter((x) => !x.age || x.age === 'teen' || x.age === 'elder')) {
        if (this.hasFear(h, 'money')) this.addBuff(h, 'fearMoneyBill');
        else if (this.state.money < amount) this.maybeFear(h, 'money');
      }
      this.notify(`📬 공과금 고지서가 왔어요: §${amount}${this.lot.rent ? ` (월세 §${this.lot.rent} 포함)` : ''}${savvy ? ` (가계 관리로 ${savvy * 2}% 절약)` : ''}. 이틀 안에 내지 않으면 전기가 끊겨요`, 'info');
    }
    const bill = eco.bill;
    if (!bill) return;
    const late = this.state.time - bill.issuedAt;
    // Someone at home who knows the law (4+) applies for a deferment: a day more before each cut (ours).
    const lawyer = this.household().find((h) => !isYoung(h.age) && Math.floor(h.skills.law ?? 0) >= DEFERMENT_LAW);
    const grace = lawyer ? 1440 : 0;
    if (late >= WARNING_AFTER && !bill.warned) {
      bill.warned = true;
      this.notify(
        lawyer
          ? `⚠️ 공과금 §${bill.amount}이 밀렸어요. ⚖️ ${josa(lawyer.name, '이/가')} 납부 유예를 신청해 하루를 더 벌었어요 (이틀 안에 내세요)`
          : `⚠️ 공과금 §${bill.amount}이 밀렸어요. 하루 안에 내지 않으면 전기가 끊겨요`,
        'bad',
      );
    }
    if (late >= POWER_CUT_AFTER + grace && !bill.cut.includes('power')) {
      bill.cut.push('power');
      this.notify('🔌 공과금을 내지 않아 전기가 끊겼어요', 'bad');
      for (const h of this.household().filter((x) => !x.age || x.age === 'elder')) this.maybeFear(h, 'money');
    }
    if (late >= WATER_CUT_AFTER + grace && !bill.cut.includes('water')) {
      bill.cut.push('water');
      this.notify('🚱 공과금을 내지 않아 물이 끊겼어요', 'bad');
    }
  }

  payBill(): boolean {
    const bill = this.economy.bill;
    if (!bill) return false;
    if (this.state.money < bill.amount) {
      this.notify(`돈이 부족해요 (§${bill.amount} 필요)`, 'bad');
      this.emit();
      return false;
    }
    this.state.money -= bill.amount;
    this.economy.bill = null;
    for (const h of this.household()) this.faceFear(h, 'money');
    this.notify(`공과금 §${bill.amount}을 냈어요${bill.cut.length ? '. 전기와 물이 다시 들어와요' : ''}`, 'good');
    this.emit();
    return true;
  }

  private meterUtility(inter: InteractionDef, dt: number, powerMul = 1) {
    const u = inter.utility;
    if (!u) return;
    const usage = this.economy.usage;
    if (u.power) usage.power += u.power * powerMul * dt;
    if (u.water) usage.water += u.water * dt;
  }

  private stepRelationships(dt: number) {
    // Sentiments fade (checked every in-game hour).
    if (Math.floor(this.state.time) % 60 === 0 && Math.floor(this.state.time - dt) % 60 !== 0) {
      for (const rel of Object.values(this.state.relationships)) if (rel.sentiments?.length) rel.sentiments = rel.sentiments.filter((s) => s.until > this.state.time);
    }
    const rank: Record<FriendStage, number> = { despised: 0, disliked: 1, acquaintance: 2, friend: 3, goodFriend: 4 };
    for (const [k, rel] of Object.entries(this.state.relationships)) {
      const [a, b] = k.split('-').map((n) => this.dweller(Number(n)));
      // Loyal dwellers' relationships cool at half speed.
      const loyal = Math.min(...[a, b].map((s) => traitsOf(s?.traits).reduce((m, t) => Math.min(m, t.relDecayMul ?? 1), 1)));
      const before = tickRelationship(rel, this.state.time, dt, loyal);
      if (rank[rel.stage] <= rank[before]) continue;
      if (!a || !b) continue;
      if (rel.stage === 'friend') {
        this.addBuff(a, 'newFriend');
        this.addBuff(b, 'newFriend');
        this.notify(`${josa(a.name, '와/과')} ${josa(b.name, '이/가')} 친구가 됐어요 🤝`, 'good');
      } else if (rel.stage === 'goodFriend') {
        this.notify(`${josa(a.name, '와/과')} ${josa(b.name, '은/는')} 이제 좋은 친구예요 💛`, 'good');
      }
    }
  }

  private stepDweller(dweller: Dweller, dt: number) {
    if (dweller.npc && this.stepNpc(dweller, dt)) return;
    if (dweller.dying) return this.stepDying(dweller);
    if (dweller.age === 'baby') return this.stepBaby(dweller, dt);
    this.stepPregnancy(dweller);
    this.stepAgeUp(dweller);
    if (!dweller.npc && (!dweller.age || dweller.age === 'teen' || dweller.age === 'elder')) this.stepFears(dweller, dt);
    if (!dweller.npc) this.stepWants(dweller);
    this.stepCabinFever(dweller);
    if (dweller.away) {
      this.decay(dweller, dt, WORK_DECAY);
      for (const k of ['hunger', 'energy', 'bladder'] as const) dweller.needs[k] = Math.max(dweller.needs[k], Math.min(WORK_NEED_FLOOR, dweller.needs[k] + dt));
      this.updateBuffs(dweller);
      if (dweller.away.outing) {
        this.outingTick(dweller, dt);
        if (this.state.time >= dweller.away.until) this.returnFromOuting(dweller);
        return;
      }
      this.workTick(dweller, dt);
      const shiftJob = this.jobIn(dweller, dweller.away.slot ?? 'job');
      if (shiftJob?.eventAt !== undefined && this.state.time >= shiftJob.eventAt && !this.state.careerEvent) this.startCareerEvent(dweller, dweller.away.slot ?? 'job');
      if (shiftJob?.episodeAt !== undefined && this.state.time >= shiftJob.episodeAt && !this.modalOpen()) {
        shiftJob.episodeAt = undefined;
        this.takeEpisode(dweller, dweller.away.slot ?? 'job');
      }
      // A shift played on the work lot ends there (finishWorkplace brings them home).
      if (this.state.time >= dweller.away.until && !this.workGames.has(dweller.id)) this.returnFromWork(dweller);
      return;
    }
    const perf = this.performing(dweller);
    this.decay(dweller, dt, this.toddlerDecay(dweller, perf?.inter.decayMul ?? (dweller.queue[0]?.kind === 'passout' ? { hunger: 0.5, bladder: 0.5 } : undefined)));
    if (dweller.age === 'toddler' && this.toddlerNeglected(dweller)) return;
    if (dweller.age === 'toddler') {
      this.babyCry(dweller, dt);
      this.stepToddlerTraits(dweller);
    }
    this.checkFailures(dweller);
    this.stepSickness(dweller, dt);
    this.updateBuffs(dweller);
    this.stepTraits(dweller, dt);
    this.stepLikes(dweller);
    this.stepMortality(dweller);
    if (dweller.dying) return;
    this.checkWork(dweller);

    if (dweller.engagedWith !== null) {
      const p = this.dweller(dweller.engagedWith);
      const pa = p?.queue[0];
      if (p && pa?.kind === 'social' && pa.targetId === dweller.id && p.run?.phase === 'performing') return;
      dweller.engagedWith = null;
    }

    this.respondToFire(dweller);
    this.checkCritical(dweller, dt);
    this.reconsider(dweller);
    this.stepSide(dweller, dt);

    if (dweller.queue.length === 0) {
      this.freeIfBoxedIn(dweller);
      dweller.idleTime += dt;
      if (this.state.freeWill && dweller.idleTime >= 2 && !this.listening(dweller)) {
        dweller.idleTime = 0;
        const choice = chooseAutonomous(this, dweller);
        if (choice) {
          this.beforeBed(dweller, choice);
          this.push(dweller, choice);
        }
        // Toddlers toddle about when there's nothing to play with (ours).
        else if (this.rng() < (dweller.age === 'toddler' ? 0.7 : 0.3)) this.wander(dweller);
        else dweller.idleTime = -4;
      }
      return;
    }
    dweller.idleTime = 0;
    this.runAction(dweller, dt);
  }

  private decay(dweller: Dweller, dt: number, mul?: Partial<Needs>) {
    for (const k of NEED_KEYS) {
      let m = mul?.[k] ?? 1;
      for (const b of dweller.buffs) m *= BUFFS[b.id]?.decayMul?.[k] ?? 1;
      m *= traitNeedMul(dweller.traits, 'decayMul', k);
      m *= moodDecay(dweller.emotion, k);
      // What living in this home does (lotTraits.ts).
      if (!dweller.npc && !dweller.away && !this.state.workplace) for (const id of this.lotTraits) m *= LOT_TRAIT_BY_ID[id]?.decayMul?.[k] ?? 1;
      // 참고 게임's hidden Energized / Pumped moodlets slow energy decay to 0.75 / 0.6.
      if (k === 'energy' && dweller.emotion === 'energized') m *= this.emotionOf(dweller).intensity >= 1 ? 0.6 : 0.75;
      dweller.needs[k] = clamp(dweller.needs[k] - NEED_INFO[k].decay * m * dt, 0, 100);
    }
  }

  // ---------- moodlets & emotions ----------

  /**
   * What would help or suits this mood, for the mood card (2026-11-01): what's really on this lot and open to
   * them. In a bad mood, what's made to clear it; in a good one, what it's good for.
   */
  moodHelps(dweller: Dweller): { title: string; labels: string[] } {
    const emotion = this.emotionOf(dweller).emotion;
    const bad = EMOTIONS[emotion].polarity === 'negative';
    const labels = new Set<string>();
    for (const obj of this.state.objects) {
      const open = new Map(this.objectMenu(dweller, obj).filter((o) => !o.disabled).map((o) => [o.id, o]));
      for (const inter of getDef(obj.defId).interactions) {
        const fits = bad ? inter.clears?.includes(emotion) : inter.moods?.includes(emotion) || (inter.skill && SKILL_EMOTION[inter.skill.key] === emotion);
        if (fits && open.has(inter.id)) labels.add(forDweller(inter, dweller).label);
      }
    }
    return { title: bad ? '풀어 주는 일' : '이 기분에 잘되는 일', labels: [...labels].slice(0, 4) };
  }

  emotionOf(dweller: Dweller): EmotionState {
    return computeEmotion(dweller.buffs, dweller.emotion, (id, w) => traitBuffWeight(dweller.traits, id, w) * fearBuffScale(dweller, id));
  }

  addBuff(dweller: Dweller, buffId: string) {
    const id = traitBuffReplacement(dweller.traits, buffId);
    if (!id) return;
    const def = BUFFS[id];
    if (!def) return;
    // 회복탄력성: bad moodlets pass sooner (mind.ts).
    const bad = def.emotion && EMOTIONS[def.emotion]?.polarity === 'negative' && !dweller.npc;
    const lasting = !dweller.npc && def.emotion ? (bad && dweller.traits.includes('mellowMind') ? 0.75 : !bad && EMOTIONS[def.emotion]?.polarity === 'positive' && dweller.traits.includes('sunnyMind') ? 1.25 : 1) : 1;
    const until = def.duration === undefined ? null : this.state.time + lasting * def.duration * (bad ? badMoodFactor(dweller.skills.resilience ?? 0) : 1);
    const existing = dweller.buffs.find((b) => b.id === id);
    if (existing) existing.until = until;
    else dweller.buffs.push({ id, until });
    dweller.emotion = this.emotionOf(dweller).emotion;
  }

  /** One roll over mutually exclusive outcomes; may grant nothing. */
  private rollBuff(dweller: Dweller, roll: BuffRoll | undefined) {
    if (!roll) return;
    let r = this.rng();
    for (const o of roll) {
      if (r < o.chance) return this.addBuff(dweller, o.id);
      r -= o.chance;
    }
  }

  /**
   * Decor ambience for a dweller: sum each emotion's scores from objects in the same room, keep the
   * strongest (참고 게임 environment score). Dirty dishes in the room count against it, +5 each.
   */
  environmentOf(dweller: Dweller): string | null {
    const room = roomAt(Math.round(dweller.x), Math.round(dweller.y));
    if (room === 'outside') return null;
    const scores: Partial<Record<Dweller['emotion'], number>> = {};
    let brokenInRoom = 0;
    for (const o of this.state.objects) {
      const c = objectCenter(o);
      if (roomAt(Math.floor(c.x), Math.floor(c.y)) !== room) continue;
      const env = getDef(o.defId).env;
      if (env) scores[env.emotion] = (scores[env.emotion] ?? 0) + env.score;
      if (this.isBroken(o)) brokenInRoom++;
      if (this.isDirty(o)) brokenInRoom++; // 참고 게임 DirtyState_Dirty: +5 as well
    }
    const dishSpot = this.dishSpot();
    let negative = 0;
    if (dishSpot) {
      const c = objectCenter(dishSpot);
      if (roomAt(Math.floor(c.x), Math.floor(c.y)) === room) negative = (this.state.dishes ?? 0) * 5;
    }
    negative += brokenInRoom * 5; // 참고 게임 BrokenState_Broken: +5 each
    negative += (this.state.puddles ?? []).filter((p) => roomAt(p.x, p.y) === room).length * PUDDLE_ENV;
    // Slobs don't mind a mess (참고 게임 Slob replaces dirty-surroundings moodlets).
    if (dweller.traits.includes('slob')) negative = 0;
    return environmentBuff(scores, negative);
  }

  /** Where dirty dishes pile up: the kitchen sink if there is one, else any sink. */
  dishSpot(): PlacedObject | undefined {
    return this.state.objects.find((o) => o.defId === 'kitchenSink') ?? this.state.objects.find((o) => o.defId === 'sink');
  }

  /**
   * Falling ill from being left filthy, starving or exhausted, and getting better (ours): it passes in
   * a day, faster for one who eats, washes and sleeps.
   */
  private stepSickness(dweller: Dweller, dt: number) {
    if (dweller.npc || dweller.age === 'baby' || dweller.dying) return;
    const n = dweller.needs;
    const sick = dweller.buffs.find((b) => b.id === 'sick');
    if (sick) {
      const resting = SLEEPS.has(this.performing(dweller)?.inter.id ?? '');
      if (resting && n.hunger >= 40 && n.hygiene >= 40 && sick.until !== null) sick.until -= (SICK_REST_MUL - 1) * dt;
      return;
    }
    const red = [n.hygiene < 0.5, n.hunger < 12.5, n.energy < 12.5].filter(Boolean).length;
    if (red && this.rng() < SICK_CHANCE * red * dt) {
      this.addBuff(dweller, 'sick');
      this.notify(`🌡️ ${josa(dweller.name, '이/가')} 몸살이 났어요. 잘 먹고 씻고 푹 자면 빨리 나아요`, 'bad');
    }
  }

  /** Hard times at home that weigh on the household (ours): power or water cut off, nothing to eat and no money. */
  private hardships(dweller: Dweller): string[] {
    if (dweller.npc || dweller.away || this.state.workplace) return [];
    const out: string[] = [];
    if (this.isCut('power')) out.push('powerCut');
    if (this.isCut('water')) out.push('waterCut');
    if (dweller.needs.hunger < 50 && this.servingsLeft() === 0 && this.state.money < 5) out.push('nothingToEat');
    return out;
  }

  /** Keeps need-driven moodlets in step with the needs, expires timed ones, re-derives emotion. */
  private updateBuffs(dweller: Dweller) {
    const wanted = new Set(
      [...NEED_KEYS.map((k) => needBuff(k, dweller.needs[k])), allNeedsBuff(dweller.needs), dweller.away ? null : this.environmentOf(dweller), ...this.hardships(dweller)]
        .map((id) => (id ? traitBuffReplacement(dweller.traits, id) : null))
        .filter((id): id is string => id !== null),
    );
    const conditional = (id: string) => CONDITION_BUFF_IDS.has(id) || isEnvironmentBuff(id);
    // A bad moodlet lived through to its end grows 회복탄력성 (mind.ts).
    const over = dweller.buffs.filter((b) => !conditional(b.id) && b.until !== null && b.until <= this.state.time);
    const recovered = over.filter((b) => {
      const e = BUFFS[b.id]?.emotion;
      return !!e && EMOTIONS[e].polarity === 'negative';
    }).length;
    dweller.buffs = dweller.buffs.filter((b) => (conditional(b.id) ? wanted.has(b.id) : b.until === null || b.until > this.state.time));
    if (recovered && !dweller.npc) this.gainSkill(dweller, 'resilience', MIND_GAIN.recovered * recovered);
    for (const id of wanted) if (!dweller.buffs.some((b) => b.id === id)) dweller.buffs.push({ id, until: null });
    dweller.emotion = this.emotionOf(dweller).emotion;
  }

  private applyEffects(dweller: Dweller, effects: Partial<Needs>, dt: number) {
    for (const k of NEED_KEYS) {
      const e = effects[k];
      if (e) dweller.needs[k] = clamp(dweller.needs[k] + e * dt, 0, 100);
    }
  }

  private checkFailures(dweller: Dweller) {
    const n = dweller.needs;
    // Failure outcomes follow 참고 게임 (docs/ref-game/02 §1.7), except hunger: we faint instead of dying.
    if (n.bladder <= 0) {
      n.bladder = 100;
      n.hygiene = 0;
      this.addBuff(dweller, 'peedSelf');
      this.addPuddle(Math.round(dweller.x), Math.round(dweller.y));
      this.notify(`${josa(dweller.name, '이/가')} 참지 못하고 실수를 했어요 😳`, 'bad');
    }
    if (n.energy <= 0 && this.performing(dweller)?.inter.id === 'swim' && !dweller.npc) {
      this.startDying(dweller, 'drown');
      return;
    }
    if (n.energy <= 0 && dweller.queue[0]?.kind !== 'passout') {
      this.passOut(dweller);
      this.notify(`${josa(dweller.name, '이/가')} 너무 피곤해서 기절했어요 😵‍💫`, 'bad');
    }
    // Nothing to eat and no money for food: say so before it's too late (ours).
    if (n.hunger < 20 && !dweller.npc && this.servingsLeft() === 0 && this.state.money < 5 && this.state.lastBrokeDay !== clockInfo(this.state.time).day) {
      this.state.lastBrokeDay = clockInfo(this.state.time).day;
      this.notify(`🚨 돈이 없어 먹을 것을 살 수 없어요! ${josa(dweller.name, '이/가')} 굶어 죽을 수도 있어요`, 'bad');
    }
    if (n.hunger <= 0 && !dweller.npc && dweller.age !== 'child' && dweller.age !== 'toddler') {
      this.startDying(dweller, 'hunger');
      return;
    }
    if (n.hunger <= 0 && dweller.queue[0]?.kind !== 'passout') {
      n.hunger = 62.5;
      this.addBuff(dweller, 'faintedFromHunger');
      this.passOut(dweller);
      this.notify(`${josa(dweller.name, '이/가')} 굶주려 쓰러졌다가 겨우 정신을 차렸어요 😵‍💫`, 'bad');
    }
    for (const k of NEED_KEYS) {
      if (n[k] < DISTRESS_LEVEL && !dweller.warned[k]) {
        dweller.warned[k] = true;
        this.notify(`${dweller.name}: ${NEED_INFO[k].icon} ${NEED_INFO[k].label} 욕구가 낮아요!`, 'bad');
      } else if (n[k] > 35) {
        dweller.warned[k] = false;
      }
    }
  }

  private passOut(dweller: Dweller) {
    this.clearQueue(dweller);
    this.releaseEngagement(dweller);
    this.push(dweller, { kind: 'passout', autonomous: false });
  }

  /** Free will overrides the queue when a vital need is about to fail. */
  private checkCritical(dweller: Dweller, dt: number) {
    dweller.critCooldown -= dt;
    if (dweller.critCooldown > 0 || !this.state.freeWill) return;
    dweller.critCooldown = 5;
    const cur = dweller.queue[0];
    if (cur && (cur.kind === 'work' || cur.kind === 'passout')) return;
    // Out on a call-out (or in the middle of answering one) there's no turning back for a snack.
    const answering = this.performing(dweller)?.inter;
    if (answering?.offLot || (answering?.requires === 'workAlarm' && (['bladder', 'energy', 'hunger'] as NeedKey[]).every((k) => dweller.needs[k] > 5))) return;
    const critical = (['bladder', 'energy', 'hunger'] as NeedKey[])
      .filter((k) => dweller.needs[k] < 12)
      .sort((a, b) => dweller.needs[a] - dweller.needs[b]);
    for (const need of critical) {
      if (dweller.queue.some((a) => this.actionHelps(a, need))) return;
      // Player orders are only overridden in a real emergency.
      if (cur && !cur.autonomous && dweller.needs[need] > 5) return;
      const choice = chooseAutonomous(this, dweller, need);
      if (!choice) continue;
      this.stopRun(dweller);
      dweller.queue = dweller.queue.filter((a) => !a.autonomous);
      dweller.queue.unshift({ ...choice, id: this.state.nextActionId++ } as Action);
      return;
    }
  }

  /**
   * Every 12–15 minutes, free will looks up from an autonomous activity. If a need has become
   * pressing that the activity doesn't help with, it switches when the best fix beats what is
   * left of the current activity (참고 게임's opportunity cost). Activities that already help a
   * pressing need (sleeping while tired) are left alone, so dwellers don't thrash.
   */
  private reconsider(dweller: Dweller) {
    const cur = dweller.queue[0];
    if (!this.state.freeWill || cur?.kind !== 'interact' || !cur.autonomous || dweller.run?.phase !== 'performing') return;
    if (dweller.reconsiderAt === undefined || dweller.reconsiderAt > this.state.time + 15) dweller.reconsiderAt = this.state.time + 12 + this.rng() * 3;
    if (this.state.time < dweller.reconsiderAt) return;
    dweller.reconsiderAt = this.state.time + 12 + this.rng() * 3;
    const perf = this.performing(dweller);
    // A night's sleep isn't second-guessed; it ends through its own exit conditions (참고 게임 bed_sleep).
    if (perf && this.nightSleep(dweller, perf.inter)) return;
    if (perf && this.guaranteed(dweller, perf.inter)) return;
    if (perf?.inter.offLot || perf?.inter.requires === 'workAlarm') return;
    const pressing = pressingNeeds(dweller);
    if (!perf || !pressing || needsServed(perf.obj.defId, perf.inter).some((k) => pressing.has(k))) return;
    const keep = remainingScore(dweller, perf.inter, dweller.run.elapsed);
    const solving = new Set(needsServed(perf.obj.defId, perf.inter));
    const options = rankOptions(this, dweller)
      .filter((c) => !(c.action.kind === 'interact' && c.action.objectUid === cur.objectUid && c.action.interactionId === cur.interactionId))
      .map((c) => ({ ...c, score: c.fills.some((k) => solving.has(k)) ? c.score * ALREADY_SOLVING : c.score }))
      .sort((a, b) => b.score - a.score);
    const best = topChoices(options)[0];
    if (!best || best.score <= keep) return;
    this.finishAction(dweller);
    dweller.queue.unshift({ ...best.action, id: this.state.nextActionId++ } as Action);
  }

  private actionHelps(a: Action, need: NeedKey): boolean {
    if (a.kind === 'passout') return need === 'energy';
    if (a.kind === 'social') return need === 'social';
    if (a.kind !== 'interact') return false;
    const obj = this.object(a.objectUid);
    const inter = obj && this.interaction(obj, a.interactionId);
    return !!inter && (adEffects(inter)[need] ?? 0) > 0;
  }

  private wander(dweller: Dweller) {
    const map = this.routeFrom(dweller);
    const options: P[] = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const d = map.dist[idx(x, y)];
        const t = this.tiles[idx(x, y)];
        if (d > 1 && d <= 10 && (t === 'wood' || t === 'carpet' || t === 'tile')) options.push({ x, y });
      }
    }
    const claimed = this.claimedTiles(dweller);
    const free = options.filter((p) => !claimed.has(`${p.x},${p.y}`));
    if (free.length === 0) return;
    const p = free[Math.floor(this.rng() * free.length)];
    this.push(dweller, { kind: 'goto', x: p.x, y: p.y, autonomous: true });
  }

  // ---------- action execution ----------

  private push(dweller: Dweller, a: NewAction) {
    dweller.queue.push({ ...a, id: this.state.nextActionId++ } as Action);
  }

  private runAction(dweller: Dweller, dt: number) {
    const a = dweller.queue[0];
    if (!dweller.run && !this.startAction(dweller, a)) {
      this.finishAction(dweller);
      return;
    }
    const r = dweller.run!;
    if (r.phase === 'walking') {
      if (a.kind === 'social') {
        const t = this.dweller(a.targetId);
        r.repath -= dt;
        r.wait += dt;
        if (!t || t.away || r.wait > 90) {
          this.finishAction(dweller);
          return;
        }
        const tt = { x: Math.round(t.x), y: Math.round(t.y) };
        if (r.repath <= 0 && (!r.targetTile || r.targetTile.x !== tt.x || r.targetTile.y !== tt.y)) {
          const wait = r.wait;
          if (!this.startAction(dweller, a)) {
            this.finishAction(dweller);
            return;
          }
          dweller.run!.wait = wait;
          dweller.run!.repath = 1;
          return;
        }
      }
      if (this.walk(dweller, r, dt)) this.onArrive(dweller, a, r);
    } else if (r.phase === 'waiting') {
      r.wait += dt;
      if (r.wait > (a.autonomous ? 20 : 60)) {
        if (!a.autonomous) this.notify(`${dweller.name}: 기다리다 지쳐서 포기했어요`, 'info');
        if (a.kind === 'interact') this.avoidObject(dweller, a.objectUid);
        this.finishAction(dweller);
      } else if (a.kind === 'social') {
        this.onArrive(dweller, a, r);
      } else {
        this.tryBegin(dweller, a, r);
      }
    } else {
      this.perform(dweller, a, r, dt);
    }
  }

  private startAction(dweller: Dweller, a: Action): boolean {
    const sx = Math.round(dweller.x);
    const sy = Math.round(dweller.y);
    const map = this.routeFrom(dweller);
    const begin = (dest: P | null, spot: P | null, extra: Partial<RunState> = {}): boolean => {
      let path: P[] = [];
      if (dest) {
        const p = pathTo(map, dest.x, dest.y);
        if (!p) return false;
        path = p;
        // Off-grid, step back onto the tile first, unless already heading straight for the next one
        // (going back would undo the step, and a dweller chasing a moving target would never get anywhere).
        const n = path[0];
        const onTheWay = !!n && ((n.y === sy && dweller.y === sy && (n.x - sx) * (dweller.x - sx) > 0) || (n.x === sx && dweller.x === sx && (n.y - sy) * (dweller.y - sy) > 0));
        if ((dweller.x !== sx || dweller.y !== sy) && !onTheWay) path.unshift({ x: sx, y: sy });
      }
      dweller.run = { phase: 'walking', path, spot, elapsed: 0, wait: 0, repath: 0, ...extra };
      return true;
    };
    const unreachable = () => {
      this.freeIfCutOff(dweller);
      if (!a.autonomous) this.notify(`${josa(dweller.name, '이/가')} 그곳에 갈 수 없어요`, 'bad');
      if (a.kind === 'interact') this.avoidObject(dweller, a.objectUid);
      return false;
    };

    switch (a.kind) {
      case 'interact': {
        const obj = this.object(a.objectUid);
        const inter = obj && this.interaction(obj, a.interactionId);
        if (!obj || !inter || !this.meetsRequirement(dweller, obj, inter)) return false;
        const spot = this.nearestUnclaimed(dweller, map, this.usableSpots(obj, inter));
        return spot ? begin(spot, spot) : unreachable();
      }
      case 'goto':
        return begin({ x: a.x, y: a.y }, null) || unreachable();
      case 'social': {
        const t = this.dweller(a.targetId);
        if (!t || t.away) return false;
        const tt = { x: Math.round(t.x), y: Math.round(t.y) };
        if (Math.abs(sx - tt.x) + Math.abs(sy - tt.y) === 1 && dweller.x === sx && dweller.y === sy) return begin(null, null, { targetTile: tt });
        const spot = this.nearestUnclaimed(dweller, map, this.socialSpots(t));
        return spot ? begin(spot, null, { targetTile: tt }) : unreachable();
      }
      case 'work':
        return begin(this.exitTile, null) || unreachable();
      case 'passout':
      case 'panic':
      case 'phone':
        dweller.run = { phase: 'performing', path: [], spot: null, elapsed: 0, wait: 0, repath: 0 };
        return true;
      case 'mop': {
        if (!this.puddleAt(a.x, a.y)) return false;
        if (sx === a.x && sy === a.y && dweller.x === sx && dweller.y === sy) return begin(null, null);
        return begin({ x: a.x, y: a.y }, null) || unreachable();
      }
      case 'extinguish': {
        const first = this.nearestFire(dweller, a);
        if (!first) return false;
        // The nearest flames first, then any others that can be reached.
        const fires = [first, ...(this.state.fires ?? []).filter((f) => f.x !== first.x || f.y !== first.y).sort((p, q) => Math.hypot(p.x - dweller.x, p.y - dweller.y) - Math.hypot(q.x - dweller.x, q.y - dweller.y))];
        for (const fire of fires) {
          const spots = this.fireSpots(fire);
          if (spots.some((p) => p.x === sx && p.y === sy) && dweller.x === sx && dweller.y === sy) {
            a.x = fire.x;
            a.y = fire.y;
            return begin(null, null);
          }
          const spot = this.nearestUnclaimed(dweller, map, spots);
          if (spot) {
            a.x = fire.x;
            a.y = fire.y;
            return begin(spot, null);
          }
        }
        // Cut off from every flame: get on with things for a while rather than standing frozen.
        this.fireUnreachable.set(dweller.id, this.state.time);
        return unreachable();
      }
    }
  }

  /** Runs whose path has been straightened from where the dweller stands (see straighten). */
  private straightened = new WeakSet<RunState>();

  /**
   * The rooms taken while someone's at the toilet or in the bath (2026-11-01, at the user's request):
   * a bathroom with a door. A washroom with several toilets (a workplace's stalls) stays open.
   */
  private bathroomsInUse(): Map<ReturnType<typeof roomAt>, number> {
    const taken = new Map<ReturnType<typeof roomAt>, number>();
    for (const s of this.state.dwellers) {
      const perf = !s.away ? this.performing(s) : null;
      if (!perf || !BATH_FIXTURES.has(perf.obj.defId)) continue;
      const room = roomAt(perf.obj.x, perf.obj.y);
      if (room === 'outside') continue;
      if (this.state.objects.filter((o) => o.defId === 'toilet' && roomAt(o.x, o.y) === room).length <= 1) taken.set(room, s.id);
    }
    return taken;
  }

  /** Why a dweller can't use this now because the room it's in is taken. */
  bathroomBlocker(dweller: Dweller, obj: PlacedObject): string | null {
    if (!BATH_ROOMS_DEFS.has(obj.defId)) return null;
    const by = this.bathroomsInUse().get(roomAt(obj.x, obj.y));
    return by !== undefined && by !== dweller.id && roomAt(Math.round(dweller.x), Math.round(dweller.y)) !== roomAt(obj.x, obj.y) ? '누가 욕실을 쓰고 있어요' : null;
  }

  /** Whether the next step would take a dweller through the door of a bathroom that's taken: they wait outside. */
  private heldAtBathroom(dweller: Dweller, r: RunState): boolean {
    const next = r.path[0];
    if (!next || (dweller.npc && dweller.npc.role !== 'guest' && dweller.npc.role !== 'coworker') || dweller.queue[0]?.kind === 'panic' || dweller.queue[0]?.kind === 'extinguish' || this.state.fires?.length) return false;
    const to = roomAt(Math.round(next.x), Math.round(next.y));
    if (to === 'outside' || to === roomAt(Math.round(dweller.x), Math.round(dweller.y))) return false;
    const by = this.bathroomsInUse().get(to);
    return by !== undefined && by !== dweller.id;
  }

  /** Stopped a moment on the way through a clean zone's way in: the suit going on or off, the air shower (cleanroom.ts). */
  private heldAtCleanroom(dweller: Dweller, r: RunState, dt: number): boolean {
    if (r.cleanWait !== undefined) {
      r.cleanWait -= dt;
      if (r.cleanWait > 0) return true;
      r.cleanWait = undefined;
      return false;
    }
    const next = r.path[0];
    const stop = next && cleanPause(this, dweller, next, r.cleanDone);
    if (!stop) return false;
    r.cleanDone = r.cleanDone ? 'both' : stop.at;
    r.cleanWait = stop.seconds;
    return true;
  }

  /** Moves along the path; returns true on arrival. */
  private walk(dweller: Dweller, r: RunState, dt: number): boolean {
    let budget = WALK_SPEED * dt * (dweller.age === 'elder' ? 0.8 : dweller.age === 'toddler' ? 0.55 : 1) * (dweller.injury ? INJURED_WALK : 1) * moodWalk(dweller.emotion) * needWalk(dweller);
    if (this.heldAtBathroom(dweller, r) || this.heldAtCleanroom(dweller, r, dt)) return false;
    if (!this.straightened.has(r)) this.straighten(dweller, r);
    while (budget > 0 && r.path.length > 0) {
      const next = r.path[0];
      // Up or down the stairs: the length of the flight walked, then out at the other end, on the other floor.
      if (floorOf(next.y) !== floorOf(Math.round(dweller.y))) {
        const len = this.flightLength(dweller, next);
        r.climb = (r.climb ?? 0) + budget;
        if (r.climb < len) {
          budget = 0;
          continue;
        }
        budget = r.climb - len;
        r.climb = undefined;
        dweller.x = next.x;
        dweller.y = next.y;
        r.path.shift();
        continue;
      }
      const dx = next.x - dweller.x;
      const dy = next.y - dweller.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        dweller.x = next.x;
        dweller.y = next.y;
        budget -= d;
        r.path.shift();
        this.straighten(dweller, r);
      } else {
        dweller.x += (dx / d) * budget;
        dweller.y += (dy / d) * budget;
        budget = 0;
      }
    }
    return r.path.length === 0;
  }

  /**
   * Dwellers walk straight across open floor, as in 참고 게임, not round the grid's corners: from where they
   * stand, the path's turns are skipped up to the furthest point ahead they can reach in a straight
   * line keeping clear of walls and furniture (a body's width either side) and of the floor others
   * are using. Done on setting off and at each point reached; through doors and up stairs they keep
   * to the path.
   */
  private straighten(dweller: Dweller, r: RunState) {
    this.straightened.add(r);
    if (r.path.length < 2) return;
    const floor = floorOf(Math.round(dweller.y));
    let cost: Float32Array | null = null;
    const gates = this.stairGates;
    while (r.path.length > 1) {
      const [a, b] = r.path;
      if (floorOf(a.y) !== floor || floorOf(b.y) !== floor) return;
      cost ??= this.routingCosts(dweller);
      if (!this.clearWalk(dweller.x, dweller.y, b.x, b.y, cost, gates)) return;
      r.path.shift();
    }
  }

  /** Whether a straight walk between two points (tile coordinates) stays on open floor all the way. */
  private clearWalk(x0: number, y0: number, x1: number, y1: number, cost: Float32Array, gates: Map<number, number>): boolean {
    const R = 0.3;
    const rows = this.tiles.length / MAP_W;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.1));
    const walls = this.blocked.walls;
    // Any wall, door or window between two tiles (straight on from one to the other).
    const parted = (ax: number, ay: number, bx: number, by: number) => !!walls && ((ax !== bx && gridBetween(walls, idx(ax, ay), idx(bx, ay))) || (ay !== by && gridBetween(walls, idx(bx, ay), idx(bx, by))) || (ay !== by && gridBetween(walls, idx(ax, ay), idx(ax, by))) || (ax !== bx && gridBetween(walls, idx(ax, by), idx(bx, by))));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      const cx = Math.round(x);
      const cy = Math.round(y);
      for (const [ox, oy] of [[-R, -R], [R, -R], [-R, R], [R, R]]) {
        const tx = Math.round(x + ox);
        const ty = Math.round(y + oy);
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= rows || floorOf(ty) !== floorOf(Math.round(y))) return false;
        const k = idx(tx, ty);
        if (this.blocked[k] || cost[k] > TRAVERSAL_COST || gates.has(k)) return false;
        // Not through a wall, and through a door only on the path itself.
        if (parted(cx, cy, tx, ty)) return false;
      }
    }
    return true;
  }

  private onArrive(dweller: Dweller, a: Action, r: RunState) {
    switch (a.kind) {
      case 'interact':
        r.phase = 'waiting';
        this.tryBegin(dweller, a, r);
        return;
      case 'goto':
        this.finishAction(dweller);
        return;
      case 'work':
        this.goToWork(dweller, a.slot ?? 'job');
        return;
      case 'passout':
        return;
      case 'extinguish':
      case 'mop':
        r.phase = 'performing';
        return;
      case 'social': {
        const t = this.dweller(a.targetId);
        if (!t || t.away) return this.finishAction(dweller);
        const gap = Math.hypot(t.x - dweller.x, t.y - dweller.y);
        // Not through a wall: on the other side of one, go round to them.
        const walled = this.walledOff({ x: Math.round(dweller.x), y: Math.round(dweller.y) }, { x: Math.round(t.x), y: Math.round(t.y) });
        if (gap > 1.5 || gap < 0.6 || walled) {
          r.targetTile = undefined; // target moved (or we're standing on top of them); repath next step
          r.path = [];
          r.repath = 0;
          r.phase = 'walking';
          return;
        }
        const social = SOCIAL_BY_ID[a.socialId];
        if (social?.join) {
          const group = this.convoOf(t);
          // The talk is just starting: wait a moment for it rather than give up.
          const starting =
            t.engagedWith !== null ||
            t.queue[0]?.kind === 'social' ||
            this.state.dwellers.some((s) => {
              const q = s.queue[0];
              return s !== dweller && q?.kind === 'social' && q.targetId === t.id;
            });
          if (group.length < 2 && starting) {
            r.phase = 'waiting';
            return;
          }
          if (group.length < 2 || group.includes(dweller)) {
            if (!a.autonomous) this.notify(`${josa(t.name, '은/는')} 지금 대화 중이 아니에요`, 'info');
            return this.finishAction(dweller);
          }
          r.outcome = this.socialOutcome(dweller, t, social, this.relationship(dweller.id, t.id));
          r.phase = 'performing';
          this.enterConvo(dweller, t);
          return;
        }
        // A toddler is simply picked up from whatever they were doing (unless asleep).
        if (social?.toddler && t.age === 'toddler' && t.engagedWith === null && !this.toddlerAsleep(t)) this.clearQueue(t);
        // Sat at something they'd chat over (the sofa, the TV, ours after 참고 게임): talked to where they
        // sit, staying put; anything else on an object (asleep, the toilet, the bath) keeps them busy.
        const sitsChatting = !!this.performing(t)?.inter.chatty && this.performing(t)?.inter.pose === 'on';
        const busy = t.engagedWith !== null || (this.isBusyOnObject(t) && !sitsChatting) || (t.queue[0]?.kind === 'social' && t.run?.phase === 'performing');
        if (!social || busy) {
          if (!a.autonomous) this.notify(`${josa(t.name, '은/는')} 지금 바빠요`, 'info');
          return this.finishAction(dweller);
        }
        const rel = this.relationship(dweller.id, t.id);
        const blocker = socialBlocker(social, rel, dweller, this.state.time);
        if (blocker) {
          if (!a.autonomous) this.notify(`${t.name}: ${josa(social.label, '은/는')} 아직 어색해요 (${blocker})`, 'info');
          return this.finishAction(dweller);
        }
        r.outcome = this.socialOutcome(dweller, t, social, rel);
        r.phase = 'performing';
        t.engagedWith = dweller.id;
        this.enterConvo(dweller, t);
        return;
      }
    }
  }

  private tryBegin(dweller: Dweller, a: Action, r: RunState) {
    if (a.kind !== 'interact') return;
    const obj = this.object(a.objectUid);
    const inter = obj && this.interaction(obj, a.interactionId);
    if (!obj || !inter) return this.finishAction(dweller);
    if (!this.hasRoom(obj, inter, dweller, true)) {
      r.phase = 'waiting';
      return;
    }
    if (inter.special === 'eat' && !this.takeServing(dweller)) {
      if (!a.autonomous) this.notify('먹을 음식이 없어요', 'info');
      return this.finishAction(dweller);
    }
    if (inter.cost) {
      if (this.state.money < inter.cost) {
        if (!a.autonomous) this.notify(`돈이 부족해요 (§${inter.cost} 필요)`, 'bad');
        return this.finishAction(dweller);
      }
      this.state.money -= inter.cost;
    }
    r.phase = 'performing';
    if (this.state.workplace && dweller.id === this.state.workplace.workerId) r.workFail = this.workWillFail(dweller, inter);
    dweller.convo = undefined; // busy with an object: out of the conversation
    // A toddler put down at bedtime sleeps the night through, as 참고 게임's bed_Sleep_Toddler does.
    if (inter.id === 'toddlerNap') r.night = sleepDesire(dweller, this.state.time) > 0;
    if (inter.serves && this.rng() < fearOdds(0.3, fearLevel(dweller, 'fire'))) this.addBuff(dweller, 'fearFire');
    if (FEAR_BY_ID.stage.about!.includes(inter.id) && this.rng() < fearOdds(0.5, fearLevel(dweller, 'stage'))) this.addBuff(dweller, 'fearStage');
    if (inter.id === 'sleep') this.bedtimeFears(dweller);
    const activity = activityOf(inter.id);
    if (activity && dweller.likes?.includes(activity.id)) {
      this.addBuff(dweller, `like_${activity.id}`);
      (dweller.likedAt ??= {})[activity.id] = this.state.time;
      dweller.buffs = dweller.buffs.filter((b) => b.id !== `miss_${activity.id}` && b.id !== `missBad_${activity.id}`);
    }
    if (activity && dweller.dislikes?.includes(activity.id)) {
      // Once more: counted (less pull next time), and from DISLIKE_STRONG times lately, the stronger moodlet.
      const done = (dweller.dislikedDone ??= {});
      const n = dislikeTimes(done[activity.id], this.state.time) + 1;
      done[activity.id] = { n, at: this.state.time };
      this.addBuff(dweller, n >= DISLIKE_STRONG ? `dislikeBad_${activity.id}` : `dislike_${activity.id}`);
    }
    if (inter.chatty) dweller.sideCheckAt = this.state.time + 2 + this.rng() * 3;
    if (inter.players && !this.chessOpponent(dweller, obj)) {
      obj.chess = undefined; // a fresh board
      this.inviteToChess(dweller, obj, inter);
    }
    this.rally(dweller, obj, inter, a.autonomous);
    // Sleeping in a free bed makes it this dweller's own.
    if ((inter.id === 'sleep' || inter.id === 'nap') && this.isBed(obj) && dweller.bedUid === undefined && this.canClaimBed(dweller, obj)) dweller.bedUid = obj.uid;
  }

  /**
   * Whether a night's sleep is over (참고 게임 bed_sleep exit conditions): up for the toilet or a meal
   * (sooner than 참고 게임 for the toilet, see WAKE_NEED);
   * up at the wake time once Energy is past half (wakeup_time_based, Energy 50); otherwise asleep
   * while the large sleep desire lasts, then a two-hour lie-in once Energy is full.
   */
  private sleepOver(dweller: Dweller, r: RunState): boolean {
    const now = this.state.time;
    if (dweller.needs.bladder < WAKE_NEED.bladder || dweller.needs.hunger < WAKE_NEED.hunger) return true;
    if (dweller.needs.energy >= 50 && now >= wakeTime(dweller, now)) return true;
    if (dweller.needs.energy < 100 || sleepDesire(dweller, now) === 3) {
      r.restedAt = undefined;
      return false;
    }
    r.restedAt ??= now;
    return now - r.restedAt >= LIE_IN;
  }

  /**
   * 참고 게임 keeps a running interaction "guaranteed" until it goes inertial, and autonomy can't boot a
   * guaranteed one: cooking, eating, a nap or the toilet carry on while they're doing their job.
   * Only another motive near failure lets go (ExitConditionList_MotivesNearFail: Energy -90,
   * Hunger -95, Bladder -85). Fun and hobbies stay open to second thoughts (ours).
   */
  private guaranteed(dweller: Dweller, inter: InteractionDef): boolean {
    const ad = adEffects(inter);
    const working = !!inter.serves || BODY_NEEDS.some((k) => (ad[k] ?? 0) >= 0.15 && dweller.needs[k] < 100);
    return working && !NEAR_FAIL.some(([k, v]) => dweller.needs[k] <= v && !((ad[k] ?? 0) > 0));
  }

  /** What `dweller` is doing (or about to) that someone else could join in on. */
  joinable(dweller: Dweller): { obj: PlacedObject; inter: InteractionDef } | null {
    const a = dweller.queue[0];
    if (a?.kind !== 'interact') return null;
    const obj = this.object(a.objectUid);
    const inter = obj && this.interaction(obj, a.interactionId);
    return obj && inter && JOIN_AS[inter.id] ? { obj, inter } : null;
  }

  /** Where `target` could join in: the same object or one of its kind close by, with room for them. */
  private joinSpot(target: Dweller, obj: PlacedObject, inter: InteractionDef): { obj: PlacedObject; inter: InteractionDef } | null {
    const ids = JOIN_AS[inter.id] ?? [];
    const c = objectCenter(obj);
    const map = this.routeFrom(target);
    const near = this.state.objects
      .map((o) => ({ o, d: Math.hypot(objectCenter(o).x - c.x, objectCenter(o).y - c.y) }))
      .filter(({ d }) => d <= 6)
      .sort((a, b) => a.d - b.d);
    for (const id of ids) {
      for (const { o } of near) {
        const i = this.interaction(o, id);
        if (!i || !ageAllows(target, i) || !this.meetsRequirement(target, o, i) || !this.hasRoom(o, i, target)) continue;
        if (i.players && o.uid !== obj.uid) continue; // a board game is played at the same board
        if (this.isBed(o)) continue;
        if (nearest(map, this.usableSpots(o, i))) return { obj: o, inter: i };
      }
    }
    return null;
  }

  /** Why `dweller` can't ask `target` to join right now, if they can't (shown greyed out in the menu). */
  joinBlocker(dweller: Dweller, target: Dweller): string | null {
    const job = this.joinable(dweller);
    if (!job) return '함께할 활동을 하고 있지 않아요';
    if (target.away) return '외출 중이에요';
    if (['sleep', 'nap', 'toddlerNap'].includes(this.performing(target)?.inter.id ?? '')) return '자고 있어요';
    if (target.queue.some((q) => q.kind === 'interact' && (JOIN_AS[job.inter.id] ?? []).includes(q.interactionId))) return '이미 함께하고 있어요';
    if (!this.joinSpot(target, job.obj, job.inter)) return '같이 할 자리가 없어요';
    return null;
  }

  /**
   * "Come and watch TV with me" (참고 게임 rallyables, asked by the player): the invited dweller decides for
   * themself. They say no when they're in the middle of something the player asked of them or on the
   * toilet, when a need of their own is pressing, when they dislike the activity, or simply when
   * they don't fancy it: half the time to begin with, more for friends, family and liked
   * activities, less for those they're on bad terms with or when angry or stressed (odds ours).
   */
  askToJoin(dwellerId: number, targetId: number): boolean {
    const dweller = this.dweller(dwellerId);
    const target = this.dweller(targetId);
    const job = dweller && this.joinable(dweller);
    if (!dweller || !target || !job) return false;
    const blocked = this.joinBlocker(dweller, target);
    const ask = `${job.inter.icon} ${dweller.name}: "${target.name}, 같이 ${JOIN_LINE[job.inter.id]}!"`;
    if (blocked) {
      this.notify(`${target.name}: ${blocked}`, 'info');
      this.emit();
      return false;
    }
    const no = (why: string) => {
      this.notify(`${ask} — ${josa(target.name, '은/는')} 거절했어요 (${why})`, 'info');
      this.emit();
      return false;
    };
    const cur = target.queue[0];
    if (cur && !cur.autonomous) return no('하던 일을 마저 하고 싶대요');
    if (this.isBusyOnObject(target)) return no('지금은 손을 뗄 수 없대요');
    const fills = adEffects(job.inter);
    const urgent = BODY_NEEDS.find((k) => target.needs[k] < 30 && !((fills[k] ?? 0) > 0));
    if (urgent) return no(NEED_EXCUSE[urgent]!);
    const activity = activityOf(job.inter.id);
    if (activity && target.dislikes?.includes(activity.id)) return no('별로 안 좋아한대요');
    const rel = this.relationship(dweller.id, target.id);
    let chance = 0.5 + rel.friend / 200;
    if (activity && target.likes?.includes(activity.id)) chance += 0.25;
    if (this.familyTie(dweller, target) || rel.flags.includes('partner') || rel.flags.includes('married')) chance += 0.15;
    if (target.emotion === 'angry' || target.emotion === 'stressed') chance -= 0.2;
    if (this.rng() > clamp(chance, 0.05, 0.95)) return no(rel.friend < 0 ? '같이 하기 싫대요' : '지금은 내키지 않는대요');
    const spot = this.joinSpot(target, job.obj, job.inter)!;
    this.releaseEngagement(target);
    this.clearQueue(target);
    this.push(target, { kind: 'interact', objectUid: spot.obj.uid, interactionId: spot.inter.id, autonomous: true });
    this.notify(`${ask} — ${target.name}: "좋아!"`, 'good');
    this.emit();
    return true;
  }

  /**
   * A bedtime routine: going to bed for the night, a dweller first uses the toilet and, if peckish,
   * eats what's served or has a snack, so the night isn't broken by either (ours; 참고 게임 leaves it to
   * the bed's exit conditions).
   */
  private beforeBed(dweller: Dweller, choice: NewAction) {
    if (choice.kind !== 'interact' || choice.interactionId !== 'sleep' || dweller.npc) return;
    const options = rankOptions(this, dweller);
    const pick = (ids: string[]) => options.find((c) => c.action.kind === 'interact' && ids.includes(c.action.interactionId))?.action;
    if (dweller.needs.hunger < BEDTIME_HUNGER) {
      const bite = pick(this.servingsLeft() > 0 ? ['eat'] : ['snack', 'quickMeal']);
      if (bite) this.push(dweller, bite);
    }
    if (dweller.needs.bladder < BEDTIME_BLADDER) {
      const toilet = this.state.objects
        .map((o) => ({ o, i: this.interaction(o, 'use') }))
        .filter(({ o, i }) => i && ageAllows(dweller, i) && this.meetsRequirement(dweller, o, i))
        .map(({ o }) => o)[0];
      if (toilet) this.push(dweller, { kind: 'interact', objectUid: toilet.uid, interactionId: 'use', autonomous: true });
    }
  }

  /**
   * What a dweller's traits do from minute to minute (참고 게임 Buff_Trait_* machinery): the hidden trait
   * needs run down and show their moodlet when low, the trait shows in idle moments every 2-8 hours,
   * and the company around them sparks trait moodlets (a roll every 10 minutes, ours).
   */
  private stepTraits(dweller: Dweller, dt: number) {
    const traits = traitsOf(dweller.traits);
    if (!traits.length || dweller.npc || dweller.age === 'baby' || dweller.age === 'toddler') return;
    const now = this.state.time;
    const perf = this.performing(dweller)?.inter.id;
    const asleep = perf === 'sleep' || perf === 'nap';
    const has = (id: string) => dweller.buffs.some((b) => b.id === id);
    const needs = (dweller.traitNeeds ??= {});
    const room = roomAt(Math.round(dweller.x), Math.round(dweller.y));
    for (const t of traits) {
      const n = t.need;
      if (!n) continue;
      let v = needs[t.id] ?? n.start[0] + this.rng() * (n.start[1] - n.start[0]);
      v -= n.decay * dt;
      if (perf && n.fills?.includes(perf)) v += TRAIT_FILL * dt;
      if (n.by === 'outdoors' && room === 'outside') v += OUTDOORS_FILL * dt;
      if (n.by === 'family' && this.familyAround(dweller)) v += TRAIT_FILL * dt;
      v = clamp(v, 0, n.max);
      if (t.id === 'insane' && v <= 0) {
        // 참고 게임 trait_Insane_Moods_Commodity_Failure: a random mood, and the commodity starts over.
        this.addBuff(dweller, ['insaneHappy', 'insaneSad', 'insaneAngry', 'insaneFlirty'][Math.floor(this.rng() * 4)]);
        v = n.max;
      } else if (v <= n.lowAt && !asleep) {
        const id = t.id === 'ambitious' && !dweller.job ? 'jobless' : n.lowBuff;
        if (!has(id)) this.addBuff(dweller, id);
      }
      if (n.highBuff && v >= (n.highAt ?? n.max) && !has(n.highBuff)) this.addBuff(dweller, n.highBuff);
      needs[t.id] = v;
    }
    if (dweller.traitIdleAt === undefined) dweller.traitIdleAt = now + 240 + this.rng() * 240; // 참고 게임 lock_out_time_initial
    else if (now >= dweller.traitIdleAt && !asleep) {
      const feelings = traits.flatMap((t) => (t.idleFeeling ? [t.idleFeeling] : []));
      if (feelings.length) this.addBuff(dweller, feelings[Math.floor(this.rng() * feelings.length)]);
      dweller.traitIdleAt = now + 120 + this.rng() * 360; // 참고 게임 lock_out_time 120-480
    }
    if (asleep || this.rng() > dt / 10) return;
    const around = this.state.dwellers.filter((o) => o !== dweller && !o.away && o.age !== 'baby' && roomAt(Math.round(o.x), Math.round(o.y)) === room && room !== 'outside');
    const talking = this.convoOf(dweller).filter((o) => o !== dweller);
    if (hasTrait(dweller.traits, 'bro') && talking.some((o) => hasTrait(o.traits, 'bro'))) this.addBuff(dweller, 'broLove');
    if (hasTrait(dweller.traits, 'evil') && around.some((o) => o.emotion === 'sad')) this.addBuff(dweller, 'evilNearMisery');
    if (hasTrait(dweller.traits, 'familyOriented') && this.familyAround(dweller)) this.addBuff(dweller, 'nearFamily');
    if (hasTrait(dweller.traits, 'grouch')) {
      // "Tired when there are many people": a crowd of three or more (ours).
      if (around.length >= 3) this.addBuff(dweller, 'peopleTireMe');
      else if (!around.length && !has('silenceUnderrated') && this.rng() < 0.1) this.addBuff(dweller, 'silenceUnderrated');
    }
    if (hasTrait(dweller.traits, 'hatesChildren') && !this.state.dwellers.some((o) => !o.away && (o.age === 'baby' || o.age === 'toddler' || o.age === 'child'))) this.addBuff(dweller, 'noKidsZone');
    // Commitment Issues: tied down too long to one job or one person (ours: after a week in a job; now and then when committed).
    if (hasTrait(dweller.traits, 'commitmentIssues') && this.rng() < 10 / 1440) {
      if (dweller.job && !CAREER_BY_ID[dweller.job.careerId]?.school && now - (dweller.jobSince ?? now) > 7 * 1440 && !has('trappedCareer')) this.addBuff(dweller, 'trappedCareer');
      const committed = this.state.dwellers.some((o) => o !== dweller && (['married', 'engaged', 'partner'] as const).some((f) => this.relationship(dweller.id, o.id).flags.includes(f)));
      if (committed && !has('trappedRelationship') && this.rng() < 0.5) this.addBuff(dweller, 'trappedRelationship');
    }
  }

  /**
   * Toddler traits (참고 게임 trait_Toddler_*): moods that come round on a clock, or when company, a
   * parent or something new to learn has been missing long enough (commodity_Trait_Toddler_*
   * minutes); a fussy toddler sulks when a need runs low and stresses whoever looks after them.
   */
  private stepToddlerTraits(dweller: Dweller) {
    const now = this.state.time;
    const last = (dweller.toddlerLast ??= { company: now, parents: now, learning: now, every: now });
    const engaged = dweller.engagedWith !== null || this.state.dwellers.some((s) => s.queue[0]?.kind === 'social' && (s.queue[0] as { targetId: number }).targetId === dweller.id);
    if (engaged) last.company = now;
    const parentHome = this.state.dwellers.some((s) => dweller.parents?.includes(s.id) && !s.away);
    if (parentHome) last.parents = now;
    const has = (id: string) => dweller.buffs.some((b) => b.id === id);
    for (const t of traitsOf(dweller.traits)) {
      const c = t.toddler;
      if (!c) continue;
      const since = now - ((c.kind === 'every' ? last.every : c.kind === 'noCompany' ? last.company : c.kind === 'noParents' ? last.parents : last.learning) ?? now);
      if (since < c.minutes || has(c.buff)) continue;
      // Independent toddlers are happy on their own only while the parents are out.
      if (c.kind === 'noParents' && parentHome) continue;
      this.addBuff(dweller, c.buff);
      if (c.kind === 'every') last.every = now;
    }
    if (hasTrait(dweller.traits, 'tFussy') && !has('fussyAnger') && NEED_KEYS.some((k) => k !== 'bladder' && dweller.needs[k] < 30) && this.rng() < 0.02) {
      this.addBuff(dweller, 'fussyAnger');
      const carer = this.state.dwellers.find((s) => s.queue[0]?.kind === 'social' && (s.queue[0] as { targetId: number }).targetId === dweller.id);
      if (carer) this.addBuff(carer, 'parentingStress');
    }
  }

  /** A liked activity not done for MISS_AFTER is missed (preferences.ts): a sad moodlet until it's done again, a sadder one after MISS_STRONG_AFTER. */
  private stepLikes(dweller: Dweller) {
    if (!dweller.likes?.length || dweller.npc || dweller.age === 'baby' || dweller.age === 'toddler') return;
    const at = (dweller.likedAt ??= {});
    for (const id of dweller.likes) {
      if (!ACTIVITIES.some((a) => a.id === id)) continue;
      at[id] ??= this.state.time;
      const since = this.state.time - at[id];
      if (since >= MISS_STRONG_AFTER) {
        if (!dweller.buffs.some((b) => b.id === `missBad_${id}`)) {
          dweller.buffs = dweller.buffs.filter((b) => b.id !== `miss_${id}`);
          this.addBuff(dweller, `missBad_${id}`);
        }
      } else if (since >= MISS_AFTER && !dweller.buffs.some((b) => b.id === `miss_${id}`)) this.addBuff(dweller, `miss_${id}`);
    }
  }

  /** A random personality trait that suits the new age and the ones the dweller has (up to MAX_TRAITS). */
  private randomTraitFor(dweller: Dweller, age: 'child' | 'teen') {
    if (traitsOf(dweller.traits).filter((t) => !t.reward).length >= MAX_TRAITS) return null;
    const options = TRAITS.filter((t) => !t.reward && traitFitsAge(t, age) && !dweller.traits.includes(t.id) && !conflictsWith(dweller.traits, t.id));
    const t = options[Math.floor(this.rng() * options.length)];
    if (t) dweller.traits.push(t.id);
    return t ?? null;
  }

  // ---------- death, the Grim Reaper and ghosts ----------

  /** A dweller starts to die: they stop where they are and the Grim Reaper comes (참고 게임 death interactions). */
  startDying(dweller: Dweller, cause: DeathCause) {
    if (dweller.dying || dweller.npc) return;
    this.releaseEngagement(dweller);
    this.clearQueue(dweller);
    dweller.run = null;
    dweller.dying = { cause, at: this.state.time, pleaded: [] };
    dweller.queue = [{ id: this.state.nextActionId++, kind: 'passout', autonomous: false }]; // lying where they fell
    this.spawnReaper(dweller);
    const plea = cause === 'oldAge' ? '' : ' 죽음의 신을 클릭해 살려달라고 빌어 보세요!';
    this.notify(`💀 ${josa(dweller.name, '이/가')} ${DEATHS[cause].dying}.${plea}`, 'bad');
  }

  /** The dying lie still until the Reaper takes them. */
  private stepDying(dweller: Dweller) {
    // A trained first-aider at home (medicine 5+) steps in by themselves a few minutes in (ours).
    if (this.state.time - dweller.dying!.at >= 3 && dweller.dying!.cause !== 'oldAge') {
      const medic = this.household().find((h) => h !== dweller && !h.away && !h.dying && !(isYoung(h.age) && h.age !== 'teen') && Math.floor(h.skills.medicine ?? 0) >= AUTO_FIRST_AID && !dweller.dying!.aided?.includes(h.id));
      if (medic) {
        this.firstAid(medic.id, dweller.id);
        if (!dweller.dying) return;
      }
    }
    if (this.state.time - dweller.dying!.at < DYING_MINUTES) return;
    const cause = dweller.dying!.cause;
    dweller.dying = undefined;
    dweller.queue = [];
    this.passAway(dweller, cause);
  }

  private spawnReaper(near: Dweller) {
    const id = 990;
    if (this.dweller(id)) return;
    for (const s of this.household()) if (s !== near && !s.away && s.age !== 'baby' && Math.hypot(s.x - near.x, s.y - near.y) <= 8) this.addBuff(s, 'sawReaper');
    const spot = this.socialSpots(near)[0] ?? { x: Math.round(near.x) + 1, y: Math.round(near.y) };
    this.state.dwellers.push({
      id,
      name: '죽음의 신',
      shirt: '#111111',
      skin: '#d7d7d7',
      hair: '#111111',
      x: spot.x,
      y: spot.y,
      needs: { hunger: 100, energy: 100, bladder: 100, hygiene: 100, fun: 100, social: 100 },
      skills: NO_SKILLS(),
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: [],
      npc: { role: 'reaper', until: this.state.time + DYING_MINUTES + 5 },
    });
  }

  /** Who is dying now, if anyone (the Reaper's business). */
  dyingDweller(): Dweller | undefined {
    return this.state.dwellers.find((s) => s.dying);
  }

  /** Why `dweller` can't plead with the Reaper for the dying one, if they can't. */
  pleadBlocker(dweller: Dweller): string | null {
    const d = this.dyingDweller();
    if (!d) return '데려갈 캐릭터가 없어요';
    if (d.dying!.cause === 'oldAge') return '노환은 되돌릴 수 없어요';
    if (d.dying!.pleaded.includes(dweller.id)) return '이미 빌었어요';
    if (dweller.npc || isYoung(dweller.age) && dweller.age !== 'teen') return '지금은 할 수 없어요';
    return null;
  }

  /** Why `dweller` can't give first aid to `target`, if they can't (ours). */
  firstAidBlocker(dweller: Dweller, target: Dweller): string | null {
    if (dweller.npc || (isYoung(dweller.age) && dweller.age !== 'teen')) return '지금은 할 수 없어요';
    const lvl = Math.floor(dweller.skills.medicine ?? 0);
    if (target.dying) {
      if (target.dying.cause === 'oldAge') return '노환은 되돌릴 수 없어요';
      if (target.dying.aided?.includes(dweller.id)) return '이미 응급처치를 했어요';
      if (lvl < FIRST_AID_LEVEL) return `의학·보건 ${FIRST_AID_LEVEL}레벨 필요`;
      return null;
    }
    if (!target.buffs.some((b) => INJURIES.has(b.id))) return '다친 데가 없어요';
    if (lvl < TREAT_LEVEL) return `의학·보건 ${TREAT_LEVEL}레벨 필요`;
    return null;
  }

  /**
   * First aid (ours): on a dying dweller, CPR and the like that brings them round with 20% + 6% a
   * medicine level (80% at 10); on a burn or a shock, the hurt is seen to straight away.
   */
  firstAid(dwellerId: number, targetId: number) {
    const dweller = this.dweller(dwellerId);
    const target = this.dweller(targetId);
    if (!dweller || !target) return;
    const blocked = this.firstAidBlocker(dweller, target);
    if (blocked) {
      this.notify(`🩺 ${blocked}`, 'info');
      this.emit();
      return;
    }
    const lvl = Math.floor(dweller.skills.medicine ?? 0);
    this.gainSkill(dweller, 'medicine', 0.3);
    if (!target.dying) {
      target.buffs = target.buffs.filter((b) => !INJURIES.has(b.id));
      this.gainSkill(dweller, 'empathy', 0.2);
      this.notify(`🩹 ${josa(dweller.name, '이/가')} ${target.name}의 상처를 치료했어요`, 'good');
      this.emit();
      return;
    }
    (target.dying.aided ??= []).push(dweller.id);
    if (this.rng() >= FIRST_AID_BASE + FIRST_AID_PER * lvl) {
      this.notify(`🩺 ${josa(dweller.name, '이/가')} ${target.name}에게 응급처치를 했지만 깨어나지 않아요…`, 'bad');
      this.emit();
      return;
    }
    this.revive(target, dweller);
    this.notify(`🩺 ${josa(dweller.name, '이/가')} 응급처치로 ${josa(target.name, '을/를')} 살려냈어요!`, 'good');
    this.emit();
  }

  /** Brought back from the brink: the Reaper leaves empty-handed. */
  private revive(d: Dweller, saver: Dweller) {
    const cause = d.dying!.cause;
    d.dying = undefined;
    d.queue = [];
    d.deadlyMoodSince = undefined;
    if (cause === 'hunger') d.needs.hunger = 30;
    if (cause === 'drown') d.needs.energy = 30;
    d.buffs = d.buffs.filter((b) => !['singed', 'shockWarning'].includes(b.id) && BUFFS[b.id]?.emotion !== DEATH_EMOTION[cause]);
    this.addBuff(d, 'spared');
    this.addBuff(saver, 'savedFromDeath');
    for (const r of this.state.dwellers.filter((s) => s.npc?.role === 'reaper')) this.sendHome(r, '');
  }

  /** Pleading for a life (참고 게임 grimReaper_Plead: 33% the Reaper relents). */
  pleadForLife(dwellerId: number) {
    const dweller = this.dweller(dwellerId);
    const d = this.dyingDweller();
    if (!dweller || !d) return;
    const blocked = this.pleadBlocker(dweller);
    if (blocked) {
      this.notify(`💀 ${blocked}`, 'info');
      this.emit();
      return;
    }
    d.dying!.pleaded.push(dweller.id);
    if (this.rng() >= PLEAD_CHANCE) {
      this.notify(`💀 ${josa(dweller.name, '이/가')} ${josa(d.name, '을/를')} 살려달라고 빌었지만 죽음의 신이 고개를 저어요`, 'bad');
      this.emit();
      return;
    }
    this.revive(d, dweller);
    this.notify(`🙏 죽음의 신이 마음을 바꿨어요! ${josa(d.name, '이/가')} 살아났어요`, 'good');
    this.emit();
  }

  /**
   * Too long at the top of Angry, Playful or Embarrassed kills (참고 게임 death_Anger / _Laughter /
   * _Embarrassment); elders who exercise themselves out die of exhaustion (death_ElderExhaustion).
   */
  private stepMortality(dweller: Dweller) {
    if (dweller.npc || dweller.dying || isYoung(dweller.age)) return;
    const st = this.emotionOf(dweller);
    const deadly = DEADLY_MOODS[st.emotion];
    const top = deadly && st.intensity >= (EMOTIONS[st.emotion].levels.length - 1);
    if (top) {
      if (dweller.deadlyMoodSince === undefined) {
        dweller.deadlyMoodSince = this.state.time;
        this.notify(`⚠️ ${josa(dweller.name, '이/가')} ${EMOTIONS[st.emotion].levels[st.intensity]} 상태예요! 오래 가면 목숨이 위험해요`, 'bad');
      } else if (this.state.time - dweller.deadlyMoodSince >= DEADLY_MOOD_MINUTES) {
        this.startDying(dweller, deadly!);
        return;
      }
    } else dweller.deadlyMoodSince = undefined;
    const ex = this.performing(dweller)?.inter.id;
    if (dweller.age === 'elder' && (ex === 'workout' || ex === 'swim') && dweller.needs.energy < 10) this.startDying(dweller, 'elderExhaustion');
  }

  /** At night the dead come back from their urns now and then as ghosts (참고 게임 ghosts of the household). */
  private stepGhosts(dt: number) {
    const h = clockInfo(this.state.time).minuteOfDay / 60;
    const night = h >= 21 || h < 5;
    for (const g of this.state.dwellers.filter((s) => s.npc?.role === 'ghost')) {
      if (!night && !g.npc!.leaving) this.sendHome(g, `👻 ${josa(g.name, '이/가')} 새벽이 되어 사라졌어요`);
    }
    if (!night) return;
    for (const d of this.state.dead ?? []) {
      const urn = d.urnUid !== undefined ? this.object(d.urnUid) : undefined;
      if (!urn || this.dweller(d.id) || this.rng() > dt / GHOST_EVERY) continue;
      this.state.dwellers.push({
        id: d.id,
        name: d.name,
        shirt: (DEATHS[d.cause] ?? DEATHS.oldAge).tint,
        skin: d.skin,
        hair: d.hair,
        x: urn.x,
        y: urn.y + 1,
        needs: { hunger: 100, energy: 100, bladder: 100, hygiene: 100, fun: 60, social: 40 },
        skills: NO_SKILLS(),
        queue: [],
        run: null,
        job: null,
        away: null,
        engagedWith: null,
        idleTime: 0,
        critCooldown: 0,
        warned: {},
        buffs: [],
        emotion: 'fine',
        traits: [],
        npc: { role: 'ghost', until: this.state.time + 360, ghostTint: (DEATHS[d.cause] ?? DEATHS.oldAge).tint },
      });
      for (const s of this.household()) if (!s.away && !['sleep', 'nap'].includes(this.performing(s)?.inter.id ?? '')) this.addBuff(s, 'sawGhost');
      this.notify(`👻 ${josa(d.name, '이/가')} 유령이 되어 나타났어요 (${(DEATHS[d.cause] ?? DEATHS.oldAge).label})`, 'info');
    }
  }

  /** Family in the same room (참고 게임 FamilyOriented NearFamily). */
  private familyAround(dweller: Dweller): boolean {
    const room = roomAt(Math.round(dweller.x), Math.round(dweller.y));
    return this.state.dwellers.some((o) => o !== dweller && !o.away && !!this.familyTie(dweller, o) && roomAt(Math.round(o.x), Math.round(o.y)) === room);
  }

  /** Fills a trait need straight to the top (a promotion for the ambitious, a purchase for the materialistic...). */
  private fillTraitNeed(dweller: Dweller, traitId: string, amount = Infinity) {
    const t = traitsOf(dweller.traits).find((x) => x.id === traitId);
    if (!t?.need) return;
    const needs = (dweller.traitNeeds ??= {});
    needs[traitId] = clamp((needs[traitId] ?? t.need.start[0]) + amount, 0, t.need.max);
  }

  /** Trait reactions to a social that landed. */
  private traitSocial(dweller: Dweller, t: Dweller, social: SocialDef) {
    for (const s of [dweller, t]) {
      if (social.category === 'romance') this.fillTraitNeed(s, 'romantic', ROMANCE_FILL);
      if (this.familyTie(dweller, t)) this.fillTraitNeed(s, 'familyOriented', FAMILY_SOCIAL_FILL);
    }
    if (social.id === 'joke' && hasTrait(t.traits, 'grouch')) this.addBuff(t, 'notFunny');
    if (social.category === 'friendly' && hasTrait(dweller.traits, 'good') && this.rng() < 0.25) this.addBuff(dweller, 'didGood');
    if (hasTrait(dweller.traits, 'bro') && hasTrait(t.traits, 'bro')) for (const s of [dweller, t]) this.addBuff(s, 'broLove');
    if (social.id === 'tryForBaby') for (const s of [dweller, t]) if (hasTrait(s.traits, 'hatesChildren')) this.addBuff(s, 'babyAnxiety');
  }

  /** Trait reactions to finishing an interaction. */
  private traitAfter(dweller: Dweller, inter: InteractionDef) {
    const has = (id: string) => dweller.buffs.some((b) => b.id === id);
    if (hasTrait(dweller.traits, 'clumsy') && ['workout', 'dance', 'playBars', 'hangBars'].includes(inter.id) && !has('sillyMe') && this.rng() < CLUMSY_SLIP) {
      this.addBuff(dweller, 'sillyMe');
      this.notify(`🤕 ${josa(dweller.name, '이/가')} 미끄러졌어요. 어머, 나 좀 봐!`, 'info');
    }
    if (inter.id === 'admireStuff') {
      this.fillTraitNeed(dweller, 'materialistic', ADMIRE_FILL);
      this.addBuff(dweller, 'justAdmired1');
    }
    if (hasTrait(dweller.traits, 'neat') && (inter.special === 'washDishes' || inter.special === 'clean') && this.rng() < NEAT_FRENZY) this.addBuff(dweller, 'cleaningFrenzy');
    if (inter.id === 'watch' || inter.id === 'watchTv') {
      if (hasTrait(dweller.traits, 'foodie') && !has('foodieTvCooldown') && this.rng() < 0.3) {
        this.addBuff(dweller, 'foodieInspired');
        this.addBuff(dweller, 'foodieTvCooldown');
      }
    }
  }

  /** A perfectionist's pride or shame in their work (참고 게임 Buff_Trait_Perfectionist_Outstanding / _Poor). */
  private judgeWork(dweller: Dweller, good: boolean, poor: boolean) {
    if (!hasTrait(dweller.traits, 'perfectionist')) return;
    if (good) this.addBuff(dweller, 'perfectWork');
    else if (poor) this.addBuff(dweller, 'poorWork');
  }

  /** Whether the dweller's shift or school day starts within this many minutes. */
  beforeShift(dweller: Dweller, minutes: number): boolean {
    const s = dayStart(dweller, this.state.time);
    return s.work && s.at - this.state.time <= minutes;
  }

  // ---------- workplaces (workplace.ts) ----------

  /**
   * The stars (stars.ts) who work beside this dweller in this job: a star of the field belongs to the first
   * of the household to work in it (one gone from the household lets them go), and comes along when
   * that dweller changes to another job of the field. One who moved in is family now, not at work.
   */
  starsFor(dweller: Dweller, careerId: string): Townie[] {
    const out: Townie[] = [];
    const townies = (this.state.townies ??= []);
    for (const star of starsOfCareer(careerId)) {
      const owners = (this.state.starOwners ??= {});
      const owner = owners[star.id];
      if (owner !== undefined && owner !== dweller.id && this.state.dwellers.some((s) => s.id === owner && !s.npc)) continue;
      if (this.state.dwellers.some((s) => s.id === STAR_ID[star.id])) continue;
      owners[star.id] = dweller.id;
      let t = townies.find((x) => x.star === star.id);
      if (!t) {
        t = starTownie(star, careerId, this.state.time);
        townies.push(t);
        this.notify(`🌟 ${dweller.name}의 직장에 ${star.title} ${josa(star.name, '이/가')} 있어요`, 'good');
      }
      if (t.workmate) Object.assign(t, { home: colleagueHome(careerId), workmate: { ...t.workmate, careerId }, job: { careerId, level: t.job?.level ?? 6 } });
      out.push(t);
    }
    return out;
  }

  // ---------- work episodes (episodes.ts) ----------

  /** The people at work in a dweller's job: their colleagues, the stars beside them, and whoever their season brought in. */
  private workPeople(dweller: Dweller, careerId: string): Townie[] {
    const def = WORKPLACES[careerId];
    if (!def) return [];
    const townies = (this.state.townies ??= []);
    const mates = colleaguesFor(def, townies, this.rng, this.state.time, (id) => this.state.dwellers.some((s) => s.id === id) || townies.some((t) => t.id === id), () => this.freeId());
    const season = this.jobIn(dweller, dweller.partTime?.careerId === careerId ? 'partTime' : 'job')?.episodeSeason;
    const guests = season ? townies.filter((t) => t.episodeOf === dweller.id && t.episodeKey?.startsWith(`${season}:`) && t.workmate?.careerId === careerId) : [];
    return [...mates, ...this.starsFor(dweller, careerId), ...guests];
  }

  private episodeRequest(dweller: Dweller, slot: JobSlot) {
    const job = this.jobIn(dweller, slot);
    return job ? episodeRequest(dweller, job, gameKeyOf(this.state.key, dweller.id), this.workPeople(dweller, job.careerId), this.state.relationships) : null;
  }

  /** The next scene written ahead, in the background (the server writes only when there's none waiting). */
  private fillEpisode(dweller: Dweller, slot: JobSlot) {
    const req = this.cloud?.episodes ? this.episodeRequest(dweller, slot) : null;
    if (req) this.cloud!.episodes!.fill(req);
  }

  /** The day's scene: the next one waiting on the server, or, with none ready, the day's card after all. */
  private takeEpisode(dweller: Dweller, slot: JobSlot) {
    const eps = this.cloud?.episodes;
    const req = eps ? this.episodeRequest(dweller, slot) : null;
    if (!req || !eps) return;
    const fallBack = () => {
      const job = this.jobIn(dweller, slot);
      if (job) job.episodeDay = clockInfo(this.state.time).day + 1;
      if (dweller.away && !dweller.away.outing && !this.state.careerEvent && job && eventsFor(job.careerId, job.level, job.eventsSeen, this.state.time).length) this.startCareerEvent(dweller, slot);
      eps.fill(req);
    };
    eps.take(
      req,
      (data) => {
        const read = readEpisode(data.outline, data.scene);
        if (!read || this.state.episode || !this.dweller(dweller.id)) return fallBack();
        this.openEpisode(dweller, slot, { ...data, ...read });
      },
      fallBack,
    );
  }

  /** A scene on screen: the people new to the story join the dweller's work, and time stops for the decision. */
  private openEpisode(dweller: Dweller, slot: JobSlot, data: { sceneId: string; episodeId: string; idx: number; outline: EpisodeOutline; scene: EpisodeScene }) {
    const job = this.jobIn(dweller, slot);
    if (!job) return;
    job.episodeSeason = data.episodeId;
    const townies = (this.state.townies ??= []);
    const added: Townie[] = [];
    data.outline.cast.forEach((c, i) => {
      const key = `${data.episodeId}:${c.key}`;
      if (!c.new || townies.some((t) => t.episodeKey === key)) return;
      const pick = <T,>(xs: readonly T[]) => xs[Math.floor(this.rng() * xs.length)];
      const t: Townie = {
        id: this.freeId(),
        name: c.name,
        gender: c.gender,
        face: pick(COLLEAGUE_FACES[c.gender]),
        shirt: pick(SHIRT_COLORS),
        skin: pick(SKIN_COLORS),
        hair: pick(HAIR_COLORS.slice(0, -1)),
        ...(() => { const traits = drawTraits(this.rng); return { traits, ...randomPreferences(this.rng, { traits, skill: CAREER_BY_ID[job.careerId]?.skill }) }; })(),
        role: c.role,
        home: colleagueHome(job.careerId),
        job: { careerId: job.careerId, level: 2 },
        stageStart: this.state.time,
        workmate: { careerId: job.careerId, slot: 200 + i },
        episodeOf: dweller.id,
        episodeKey: key,
      };
      townies.push(t);
      added.push(t);
    });
    // Followed to work: they walk in now, not only from the next shift.
    const work = this.workGames.get(dweller.id);
    const place = work?.state.workplace && workplaceOf(work.state.workplace.careerId, work.state.workplace.branch);
    if (work && place) {
      for (const t of added) {
        const s = coworkerDweller(t, place.skill, 0, work.state.workplace!.end);
        Object.assign(s, work.exitTile);
        work.state.dwellers.push(s);
        const key = relKey(dweller.id, s.id);
        work.state.relationships[key] ??= this.state.relationships[key] ?? newRelationship(10, 0, this.state.time);
      }
    }
    if (!this.modalOpen()) this.speedBeforeModal = this.state.speed || 1;
    this.state.episode = { dwellerId: dweller.id, slot, sceneId: data.sceneId, episodeId: data.episodeId, idx: data.idx, outline: data.outline, scene: data.scene };
    this.state.speed = 0;
    this.notify(`🎬 ${dweller.name}의 직장 이야기 「${data.outline.title}」 ${data.idx + 1}화`, 'info');
    this.emit();
  }

  /** Who a cast key is (`c<id>` a colleague or star, a new person by their place in the season). */
  episodeCastId(ep: EpisodeOpen, key: string): number | undefined {
    if (/^c\d+$/.test(key)) return Number(key.slice(1));
    return this.state.townies?.find((t) => t.episodeKey === `${ep.episodeId}:${key}`)?.id;
  }

  /**
   * The decision: one of the two choices, or the player's own words (which take the scene's own
   * effects for them, or a little good). It counts at once — performance, money, closeness to the
   * people in the scene, a mood — and the next scene is written ahead with it.
   */
  answerEpisode(choice: 0 | 1 | null, text?: string) {
    const ep = this.state.episode;
    if (!ep) return;
    const own = text?.trim().slice(0, 200) || null;
    if (!own && choice === null) return;
    this.state.episode = undefined;
    const dweller = this.dweller(ep.dwellerId);
    const job = dweller && this.jobIn(dweller, ep.slot);
    let result: WorkResult | null = null;
    if (dweller && job) {
      const free = ep.scene.free.effects;
      const e = own ? (free.perf || free.friend || free.mood ? free : FREE_DEFAULT) : ep.scene.choices[choice!].effects;
      job.performance = clamp(job.performance + e.perf, -100, 100);
      if (e.money) this.state.money = Math.max(0, this.state.money + e.money);
      // At work, the work lot keeps their relationships and mood until the shift ends.
      const where = this.workGames.get(dweller.id) ?? this;
      const who = where.dweller(dweller.id) ?? dweller;
      const friends: Array<{ name: string; n: number }> = [];
      for (const [key, n] of Object.entries(e.friend ?? {})) {
        const id = this.episodeCastId(ep, key);
        if (id === undefined) continue;
        where.relationship(dweller.id, id).friend = clamp(where.relationship(dweller.id, id).friend + n, -100, 100);
        friends.push({ name: ep.outline.cast.find((c) => c.key === key)?.name ?? '', n });
      }
      if (e.mood) where.addBuff(who, EPISODE_BUFF[e.mood]);
      const [lo, hi] = EPISODE_GAP;
      job.episodeDay = clockInfo(this.state.time).day + lo + Math.floor(this.rng() * (hi - lo + 1));
      if (ep.scene.final) job.episodeSeason = undefined;
      const perf = e.perf ? ` · 성과 ${e.perf > 0 ? '+' : ''}${e.perf}` : '';
      this.notify(ep.scene.final ? `🎬 「${ep.outline.title}」 시즌이 끝났어요${perf}` : `🎬 ${dweller.name}의 결정이 이야기를 바꿔요${perf}`, 'info');
      const picked = own ? undefined : ep.scene.choices[choice!];
      result = {
        dwellerId: dweller.id,
        kind: 'episode',
        title: `🎬 ${ep.outline.title} · ${ep.idx + 1}화`,
        chose: own ?? eventText(picked!.text, dweller.name),
        ...(picked?.result ? { text: eventText(picked.result, dweller.name) } : {}),
        perf: e.perf,
        ...(e.money ? { money: e.money } : {}),
        ...(e.mood ? { buff: EPISODE_BUFF[e.mood] } : {}),
        ...(friends.length ? { friends } : {}),
        next: ep.scene.final ? 'final' : 'scene',
      };
    }
    this.cloud?.episodes?.answer(ep.sceneId, own ? null : choice, own);
    this.showWorkResult(result);
    if (dweller) this.fillEpisode(dweller, ep.slot);
    this.emit();
  }

  /** The shift a dweller is playing on a work lot, if any. */
  sessionOf(dwellerId: number) {
    return this.state.workSessions?.find((w) => w.dwellerId === dwellerId);
  }

  /** Follow (or stop following) a dweller to work at each shift. */
  setFollowWork(dwellerId: number, follow: boolean, slot: JobSlot = 'job') {
    const dweller = this.dweller(dwellerId);
    const job = dweller && this.jobIn(dweller, slot);
    if (job) job.follow = follow;
    this.emit();
  }

  /** Builds the work lot for a shift: the building, the coworkers, and the worker (a copy, brought back at the end). */
  private startWorkplace(dweller: Dweller, slot: JobSlot, end: number) {
    if (this.workGames.has(dweller.id)) return;
    const def = workplaceOf(this.jobIn(dweller, slot)!.careerId, stageOf(this.jobIn(dweller, slot)).branch)!;
    // This game's colleagues there, drawn the first time (colleagues.ts).
    const townies = (this.state.townies ??= []);
    const mates = colleaguesFor(def, townies, this.rng, this.state.time, (id) => this.state.dwellers.some((s) => s.id === id) || townies.some((t) => t.id === id), () => this.freeId());
    const job = this.jobIn(dweller, slot);
    const state = workLotState(def, dweller, this.state, end, this.rng, { ...stageOf(job), level: job?.level }, [...mates, ...this.workPeople(dweller, def.careerId).filter((t) => !mates.includes(t))]);
    (this.state.workSessions ??= []).push({ dwellerId: dweller.id, slot, state });
    this.workGames.set(dweller.id, Object.assign(new Game(state, this.rng), { home: this }));
    useRooms(this.tiles, this.walls);
    this.notify(`${def.icon} ${josa(dweller.name, '이/가')} ${def.name}에 출근했어요! 근무지 화면에서 오늘의 업무를 해 보세요`, 'good');
  }

  /**
   * A work lot on its own, for looking round every workplace while the game is being made (ours):
   * a visitor stands in for the worker, the day starts at the job's first shift and runs a week.
   * Nothing here touches a save.
   */
  static workplaceTour(key: string, rng: () => number = Math.random, at: StageAt = { stage: 0 }): Game {
    // A branch's own lot (`career@branch`) is looked round as someone in that branch.
    const { careerId, branch } = workLotKey(key);
    if (branch !== undefined && at.branch === undefined) at = { ...at, stage: Math.max(1, at.stage) as StageAt['stage'], branch };
    const def = workplaceOf(careerId, branch)!;
    const home = Game.create([{ name: '견학생', shirt: '#26a69a', skin: '#f8d9c0', hair: '#2b1b10' }], rng, 'off');
    const visitor = home.state.dwellers[0];
    for (const k of Object.keys(visitor.skills) as SkillKey[]) visitor.skills[k] = 5;
    home.state.time = 1440 + (CAREER_BY_ID[careerId]?.levels[0].start ?? 9 * 60);
    home.state.speed = 1;
    const mates = colleaguesFor(def, [], rng, home.state.time, () => false, () => 0);
    return new Game(workLotState(def, visitor, home.state, home.state.time + 7 * 1440, rng, at, mates), rng);
  }

  /** A work lot runs only its people (no bills, visitors or neighbourhood). */
  private stepWorkLot(dt: number) {
    const wp = this.state.workplace!;
    for (const dweller of [...this.state.dwellers]) {
      // Clients keep themselves going; colleagues have needs of their own (2026-10-26: a break, the
      // restroom, a coffee, a chat), kept off the floor so a shift never goes badly for them.
      if (dweller.npc?.role === 'client') for (const k of NEED_KEYS) dweller.needs[k] = Math.max(dweller.needs[k], 60);
      else if (dweller.npc?.role === 'coworker') for (const k of NEED_KEYS) dweller.needs[k] = Math.max(dweller.needs[k], COLLEAGUE_NEED_FLOOR);
      this.stepDweller(dweller, dt);
    }
    const worker = this.dweller(wp.workerId);
    if (worker && EMOTIONS[worker.emotion].polarity === 'negative') wp.negative += dt;
    this.stepRelationships(dt);
    const def = workplaceOf(wp.careerId, wp.branch)!;
    this.stepTrouble(def, worker);
    // Colleagues finish a little before the worker and head home, changed out of their work clothes (colleagues.ts).
    if (this.state.time >= wp.end - COLLEAGUES_LEAVE) for (const s of [...this.state.dwellers]) if (s.npc?.role === 'coworker' && !s.npc.leaving) this.sendHome(s, '');
    const now = this.state.time;
    // People come in now and then, up to a few at a time, until shortly before closing.
    (def.clients ?? []).forEach((spec, i) => {
      const next = (wp.nextClient ??= []);
      next[i] ??= now + 5 + this.rng() * 25;
      if (now < next[i] || now > wp.end - 30) return;
      const here = this.state.dwellers.filter((s) => s.npc?.role === 'client' && !s.npc.leaving && spec.socials.includes(s.npc.wants ?? '')).length;
      if (here < spec.max) this.spawnClient(spec);
      next[i] = now + spec.every * (0.6 + 0.8 * this.rng());
    });
    this.colleaguesSeeToClients(def);
    // Call-outs: the first comes early enough to answer within the shift, the rest every few hours.
    // None for a worker below the call's stage or rung (a trainee pilot isn't sent on the route).
    const a = def.alarm && fitTask({ id: 'alarm', label: '', need: 1, count: 0, minStage: def.alarm.minStage, minLevel: def.alarm.minLevel }, { stage: wp.stage ?? 0, branch: wp.branch, level: wp.level }) ? def.alarm : undefined;
    if (a) {
      const gap = () => a.every[0] + this.rng() * (a.every[1] - a.every[0]);
      wp.nextAlarm ??= now + 20 + this.rng() * Math.min(a.every[0], Math.max(30, (wp.end - now) * 0.4));
      if (!wp.alarm && now >= wp.nextAlarm && now < wp.end - a.window) {
        wp.alarm = { until: now + a.window };
        this.notify(a.notice, 'bad');
        // The bell cuts into whatever free will had the worker doing, even sleep in the bunks (orders stand).
        if (worker) {
          // A colleague's chat ends too; the call comes first.
          this.releaseEngagement(worker);
          if (worker.queue[0]?.autonomous) this.stopRun(worker);
          worker.queue = worker.queue.filter((q) => !q.autonomous);
          worker.idleTime = Math.max(worker.idleTime, 2);
        }
      }
      // While a call waits, colleagues make way at whatever answers it (the one DJ booth, the one stage).
      if (wp.alarm) {
        for (const s of this.state.dwellers) {
          const head = s.queue[0];
          if (s.id === wp.workerId || head?.kind !== 'interact' || !head.autonomous) continue;
          const obj = this.object(head.objectUid);
          if (obj && getDef(obj.defId).interactions.some((i) => i.id === a.interaction)) {
            this.stopRun(s);
            s.queue = s.queue.filter((q) => q !== head);
          }
        }
      }
      const answering = worker?.queue.some((x) => x.kind === 'interact' && x.interactionId === a.interaction);
      if (wp.alarm && now >= wp.alarm.until && !answering) {
        wp.alarm = undefined;
        wp.points += POINTS.missedAlarm;
        wp.nextAlarm = now + gap();
        this.notify(a.missed, 'bad');
      }
    }
  }

  /**
   * Colleagues see to the people who come in too (2026-11-01, at the user's request: everyone stood by
   * while only the player's dweller served): each doing what the client came for, when the worker hasn't got to
   * them after a while, so the first of them are still the worker's. The boss runs the place, and doesn't.
   * What they do is theirs: no points or tasks for the worker, and no client lost for it.
   */
  private colleaguesSeeToClients(def: WorkplaceDef) {
    const now = this.state.time;
    const clients = this.state.dwellers.filter((s) => s.npc?.role === 'client' && !s.npc.leaving);
    for (const c of clients) {
      const npc = c.npc!;
      npc.arrived ??= now;
      if (npc.claimedBy !== undefined) {
        const mate = this.dweller(npc.claimedBy);
        if (mate?.queue.some((q) => q.kind === 'social' && q.targetId === c.id)) continue;
        npc.claimedBy = undefined;
      }
      const spec = (def.clients ?? []).find((x) => x.socials.includes(npc.wants ?? ''));
      if (!spec || !npc.wants || now - npc.arrived < spec.patience * MATES_STEP_IN) continue;
      if (this.state.dwellers.some((s) => s.queue[0]?.kind === 'social' && s.queue[0].targetId === c.id)) continue;
      const free = this.state.dwellers.filter((s) => s.npc?.role === 'coworker' && !s.npc.boss && !s.npc.leaving && !s.away && s.engagedWith === null && !s.queue.some((q) => !q.autonomous) && !clients.some((x) => x.npc!.claimedBy === s.id));
      // Someone whose level sees to this, if any is free (workRoles.ts); else whoever's nearest, as ever.
      const fitting = free.filter((s) => s.npc!.rung && roleAt(def.careerId, s.npc!.rung)?.socials?.includes(npc.wants!));
      const mate = (fitting.length ? fitting : free).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (!mate) continue;
      this.stopRun(mate);
      mate.queue = [];
      this.enqueue(mate.id, { kind: 'social', targetId: c.id, socialId: npc.wants, autonomous: true });
      npc.claimedBy = mate.id;
    }
  }

  /** Someone comes in to be seen to: a patient, a citizen with a report, a suspect, a customer (workplace.ts). */
  private spawnClient(spec: ClientSpec) {
    const wp = this.state.workplace!;
    const waiting = this.state.dwellers.filter((s) => s.npc?.role === 'client' && !s.npc.leaving && s.npc.to);
    const free = spec.spots.filter(([x, y]) => !waiting.some((s) => s.npc!.to!.x === x && s.npc!.to!.y === y));
    if (free.length === 0) return;
    const [x, y] = free[Math.floor(this.rng() * free.length)];
    wp.clients = (wp.clients ?? 0) + 1;
    // From the street, or from where the place's own way in is (an airport's baggage claim).
    const from = spec.enterAt ? { x: spec.enterAt[0], y: spec.enterAt[1] } : this.streetEnds[this.rng() < 0.5 ? 0 : 1];
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(this.rng() * xs.length)];
    this.state.dwellers.push({
      id: CLIENT_ID_BASE + wp.clients,
      name: `${clientName(this.rng)} (${spec.pets ? pick(spec.pets) + ' ' : ''}${spec.noun})`,
      shirt: pick(SHIRT_COLORS),
      skin: pick(SKIN_COLORS),
      hair: pick(HAIR_COLORS),
      x: from.x,
      y: from.y,
      age: spec.age,
      needs: { hunger: 80, energy: 80, bladder: 80, hygiene: 80, fun: 60, social: 60 },
      skills: NO_SKILLS(),
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: [],
      npc: { role: 'client', until: this.state.time + spec.patience, to: { x, y }, serves: wp.careerId, wants: pick(spec.socials) },
    });
  }

  /** A client goes: seen to, or tired of waiting (which the shift's performance feels). */
  private clientLeaves(dweller: Dweller, served: boolean, byMate = false) {
    const wp = this.state.workplace;
    if (!wp || dweller.npc?.role !== 'client' || dweller.npc.leaving) return;
    if (served && !byMate) wp.served = (wp.served ?? 0) + 1;
    else wp.points += POINTS.clientLeft;
    this.sendHome(dweller, served ? '' : `😤 ${josa(dweller.name, '이/가')} 기다리다 지쳐 돌아갔어요`);
  }

  /** A piece of the job finished: points, more in the ideal mood, and the day's tasks ticked off. */
  private workDone(dweller: Dweller, interactionId: string) {
    const wp = this.state.workplace!;
    const def = workplaceOf(wp.careerId, wp.branch)!;
    if (!def.work.includes(interactionId)) return;
    if (def.alarm?.interaction === interactionId && wp.alarm) {
      wp.alarm = undefined;
      wp.points += POINTS.alarm;
      wp.nextAlarm = this.state.time + def.alarm.every[0] + this.rng() * (def.alarm.every[1] - def.alarm.every[0]);
      this.notify(def.alarm.done, 'good');
    }
    const job = dweller.job;
    const ideal = job ? levelOf(job).mood ?? CAREER_BY_ID[job.careerId].emotion : undefined;
    wp.points += POINTS.work * (dweller.emotion === ideal ? IDEAL_MOOD_BONUS : 1);
    for (const t of wp.tasks) if (t.does?.includes(interactionId)) this.workTaskStep(t);
  }

  /**
   * Whether a piece of the job is going to go wrong (workTrouble.ts), rolled as it starts: the rung asks
   * for so much of its skill, and one short of it, or in a bad mood, gets it wrong more often.
   * Answering a call-out always comes off.
   */
  private workWillFail(dweller: Dweller, inter: InteractionDef): boolean {
    const wp = this.state.workplace!;
    const def = workplaceOf(wp.careerId, wp.branch)!;
    const raw = inter.skill?.key;
    if (!def?.work.includes(inter.id) || !raw || !dweller.job || def.alarm?.interaction === inter.id) return false;
    // The skill the job counts it as — the one trained by it, failing or not (2026-10-26).
    const key = workSkillOf(wp.careerId, raw, this.jobBranchAtWork(dweller));
    const ideal = levelOf(dweller.job).mood ?? CAREER_BY_ID[dweller.job.careerId]?.emotion;
    const lucky = dweller.buffs.some((b) => b.id === 'luckyDay') ? 0.1 : 0;
    return this.rng() >= Math.max(0.05, workSuccess(dweller.skills[key] ?? 0, workNeed(dweller.job.level), dweller.emotion, ideal) + needWork(dweller) + lucky);
  }

  /**
   * A piece of the job done: whether it came off (`workWillFail` as it started). One that went wrong
   * counts for nothing on the day's tasks — it shows there as a failure — and taught only a little.
   */
  private workAttempt(dweller: Dweller, inter: InteractionDef, failed: boolean): boolean {
    if (!failed) return true;
    const wp = this.state.workplace!;
    const key = workSkillOf(wp.careerId, inter.skill!.key, this.jobBranchAtWork(dweller));
    const skill = dweller.skills[key] ?? 0;
    const need = dweller.job ? workNeed(dweller.job.level) : 0;
    // Remembered (workTrouble.ts workSkillsShort), and wanted at once: the dweller wants to learn it.
    const fails = (dweller.workFails ??= {});
    fails[key] = { n: (fails[key]?.n ?? 0) + 1, at: this.state.time };
    wantJobSkill(this, dweller, key);
    for (const t of wp.tasks) if (t.does?.includes(inter.id) && t.count < t.need) t.failed = (t.failed ?? 0) + 1;
    wp.points -= 1;
    if (this.rng() < 0.5) this.addBuff(dweller, 'workSlip');
    const whyHard = needWork(dweller) <= moodWork(dweller.emotion) ? needReason(dweller) : null;
    const moodPart = whyHard && needWork(dweller) <= -0.05 ? ` · ${whyHard} 더 어려웠어요` : moodWork(dweller.emotion) <= -0.06 ? ` · ${MOOD_EFFECTS[dweller.emotion].because} 더 어려웠어요` : '';
    this.notify(`😖 ${this.workVariantOf(dweller, inter)?.label ?? inter.label}: 잘 되지 않았어요 (${SKILL_INFO[key].label} ${Math.floor(skill)} · 이 직급에 필요한 정도 ${Math.round(need)}${moodPart})`, 'bad');
    return false;
  }

  /** Something goes wrong at work now and then (workTrouble.ts TROUBLES), more for one out of their depth or coasting. */
  private stepTrouble(def: WorkplaceDef, worker: Dweller | undefined) {
    const wp = this.state.workplace!;
    const now = this.state.time;
    wp.nextTrouble ??= now + 60 + this.rng() * 90;
    if (now < wp.nextTrouble || now > wp.end - 30 || !worker?.job) return;
    wp.nextTrouble = now + 90 + this.rng() * 90;
    const main = SKILL_PROFILES[wp.careerId]?.main ?? CAREER_BY_ID[wp.careerId]?.skill;
    const coasting = workDrive(worker, this.hasFear(worker, 'deadEndJob')).tone === 'easy';
    if (this.rng() >= troubleChance(main ? worker.skills[main] ?? 0 : 0, workNeed(worker.job.level), coasting)) return;
    const t = this.pickTrouble(!!def.clients?.length);
    const text = t.texts[Math.floor(this.rng() * t.texts.length)];
    this.addBuff(worker, t.id);
    const boss = this.state.dwellers.find((s) => s.npc?.boss);
    const mates = this.state.dwellers.filter((s) => s.npc?.role === 'coworker' && !s.npc.boss);
    if (t.id === 'scolded') {
      wp.points -= 3;
      if (boss) this.relationship(worker.id, boss.id).friend -= 5;
    } else if (t.id === 'rushJob') {
      wp.tasks.push({ id: `rush${wp.tasks.length}`, label: '급한 일 처리하기', does: def.work.filter((w) => w !== def.alarm?.interaction), need: 2, count: 0, kind: 'urgent' });
    } else if (t.id === 'clashAtWork' && mates.length) {
      const mate = mates[Math.floor(this.rng() * mates.length)];
      this.relationship(worker.id, mate.id).friend -= 8;
    }
    this.notify(`${BUFFS[t.id].icon} ${text}`, 'bad');
  }

  private pickTrouble(clients: boolean): Trouble {
    const pool = TROUBLES.filter((t) => !t.clients || clients);
    return pool[Math.floor(this.rng() * pool.length)];
  }

  private workSocial(who: 'boss' | 'coworker') {
    const wp = this.state.workplace!;
    wp.points += POINTS[who];
    for (const t of wp.tasks) if (t.social === who) this.workTaskStep(t);
  }

  private workTaskStep(t: import('./workplace').WorkTask) {
    const wp = this.state.workplace!;
    if (t.count >= t.need) return;
    t.count++;
    if (t.count < t.need) return;
    wp.points += POINTS.task;
    this.notify(`✅ 업무 완료: ${t.label}`, 'good');
    if (wp.tasks.every((x) => x.count >= x.need)) {
      wp.points += POINTS.allTasks;
      const worker = this.dweller(wp.workerId);
      if (worker) this.gainSkill(worker, 'persistence', MIND_GAIN.allTasks);
      this.notify('🌟 오늘의 업무를 모두 끝냈어요! 성과가 크게 올라요', 'good');
    }
  }

  /** A followed dweller's shift, as their work lot reports it (for the work panel). */
  workStatus(dwellerId: number) {
    const work = this.workGames.get(dwellerId);
    const wp = work?.state.workplace;
    if (!work || !wp) return null;
    const dweller = this.dweller(wp.workerId);
    const job = dweller && this.jobIn(dweller, this.sessionOf(dwellerId)!.slot);
    const base = job ? levelOf(job).basePerf : 0;
    const waiting = work.state.dwellers.filter((s) => s.npc?.role === 'client' && !s.npc.leaving).length;
    return { def: workplaceOf(wp.careerId, wp.branch)!, stage: wp.stage ?? 0, branch: wp.branch, tasks: wp.tasks, points: Math.round(wp.points), delta: shiftDelta(wp.points, base, wp.negative), end: wp.end, alarm: !!wp.alarm, waiting, served: wp.served ?? 0 };
  }

  /**
   * The shift is over (or the dweller leaves early): the worker comes home with what happened at work,
   * performance from the shift's work, pay for the hours (leaving early costs as 참고 게임's does).
   */
  finishWorkplace(dwellerId: number, early: boolean) {
    const work = this.workGames.get(dwellerId);
    const session = this.sessionOf(dwellerId);
    if (!work || !session) return;
    const wp = work.state.workplace!;
    const dweller = this.dweller(session.dwellerId);
    const worker = work.dweller(wp.workerId);
    this.workGames.delete(dwellerId);
    this.state.workSessions = this.state.workSessions!.filter((w) => w !== session);
    if (!this.state.workSessions.length) delete this.state.workSessions;
    useRooms(this.tiles, this.walls);
    if (!dweller) return;
    if (worker) {
      for (const k of ['needs', 'skills', 'practice', 'tried', 'buffs', 'emotion', 'traitNeeds', 'aspiration', 'satisfaction', 'wants', 'traitIdleAt', 'workFails', 'dislikedDone', 'likedAt', 'knows', 'injury'] as const) (dweller as unknown as Record<string, unknown>)[k] = (worker as unknown as Record<string, unknown>)[k];
    }
    // Colleagues are remembered; the people who came in for the day are not.
    for (const [k, rel] of Object.entries(work.state.relationships)) if (!k.split('-').some((id) => Number(id) >= CLIENT_ID_BASE)) this.state.relationships[k] = rel;
    // Their worries as the shift left them (heard out, or still there), and good news not yet shared.
    for (const s of work.state.dwellers) {
      const t = s.npc?.role === 'coworker' ? this.state.townies?.find((x) => x.id === s.id) : undefined;
      if (!t) continue;
      const held = !!s.fears?.length;
      Object.assign(t, { fears: held ? [...s.fears!] : undefined, fearProgress: held ? { ...s.fearProgress } : undefined, fearLevel: held ? { ...s.fearLevel } : undefined, fearTalkDay: s.fearTalkDay, joy: s.joy });
    }
    const job = this.jobIn(dweller, session.slot);
    if (job) {
      // A team works better with a dweller who can lead (ours): +3% of the shift's points a leadership level.
      const delta = shiftDelta(wp.points * (1 + 0.03 * Math.floor(dweller.skills.leadership ?? 0)), levelOf(job).basePerf, wp.negative);
      job.performance = clamp(job.performance + delta, -100, 100);
      job.shiftDelta = delta;
    }
    const done = wp.tasks.filter((t) => t.count >= t.need).length;
    this.notify(`🏢 근무 결과: 업무 ${done}/${wp.tasks.length} 완료${early ? ' (일찍 퇴근)' : ''}`, done === wp.tasks.length ? 'good' : 'info');
    // The day's performance came from the work done (the rabbit-hole tally never ran); coming home
    // reports it, pays the hours and holds the evaluation as usual.
    this.returnFromWork(dweller, true);
  }

  /** Whether a visiting guest (not a party) is in the house. */
  hasGuest(): boolean {
    return !this.state.party && this.state.dwellers.some((s) => s.npc?.role === 'guest' && !s.npc.leaving);
  }

  /** How many others are already doing this kind of thing near an object (eating, watching TV…). */
  othersDoing(dweller: Dweller, obj: PlacedObject, kind: string): number {
    const c = objectCenter(obj);
    const radius = kind === 'eat' ? SIDE_RANGE + 0.5 : RALLY_RADIUS;
    return this.state.dwellers.filter((s) => {
      if (s === dweller || s.away) return false;
      const id = this.performing(s)?.inter.id;
      return !!id && SHARED_KIND[id] === kind && Math.hypot(s.x - c.x, s.y - c.y) <= radius;
    }).length;
  }

  /**
   * "Let's watch TV together" (참고 게임 rallyables_GoThenWatchTV, InstrumentListen…): the first to start
   * a shared activity on their own sometimes asks the household nearby along. Each decides for themself: only someone
   * free, not in need and willing comes (ours: half the time, more for close friends, never for
   * an activity they dislike), and only to a spot their own free will would take.
   */
  private rally(dweller: Dweller, obj: PlacedObject, inter: InteractionDef, autonomous: boolean) {
    const kind = SHARED_KIND[inter.id];
    if (!kind || kind === 'eat' || dweller.npc || isYoung(dweller.age) && dweller.age !== 'teen') return;
    // The player asks people along themselves (askToJoin); free will now and then does.
    if (!autonomous || this.rng() > AUTO_RALLY_CHANCE) return;
    if (this.othersDoing(dweller, obj, kind) > 0) return;
    const room = roomAt(Math.round(dweller.x), Math.round(dweller.y));
    const came: string[] = [];
    const declined: string[] = [];
    for (const s of this.household()) {
      if (s === dweller || s.away || s.age === 'baby' || s.age === 'toddler' || s.engagedWith !== null) continue;
      if (Math.hypot(s.x - dweller.x, s.y - dweller.y) > RALLY_RADIUS && roomAt(Math.round(s.x), Math.round(s.y)) !== room) continue;
      const cur = s.queue[0];
      if (cur && (!cur.autonomous || this.isBusyOnObject(s))) continue;
      if (s.queue.some((q) => q.kind === 'interact' && SHARED_KIND[q.interactionId] === kind)) continue;
      const activity = activityOf(inter.id);
      const rel = this.relationship(dweller.id, s.id);
      const willing = 0.5 + Math.max(0, rel.friend) / 200 + (activity && s.likes?.includes(activity.id) ? 0.25 : 0);
      const needy = NEED_KEYS.some((k) => k !== 'fun' && k !== 'social' && s.needs[k] < 30);
      const c = objectCenter(obj);
      const spot = rankOptions(this, s).find((o) => {
        if (o.action.kind !== 'interact' || SHARED_KIND[o.action.interactionId] !== kind) return false;
        const there = this.object(o.action.objectUid);
        return !!there && Math.hypot(objectCenter(there).x - c.x, objectCenter(there).y - c.y) <= RALLY_RADIUS;
      });
      if (!spot || needy || (activity && s.dislikes?.includes(activity.id)) || this.rng() > willing) {
        declined.push(s.name);
        continue;
      }
      this.releaseEngagement(s);
      this.clearQueue(s);
      this.push(s, spot.action);
      came.push(s.name);
    }
    if (!came.length && !declined.length) return;
    const join = came.length ? `${came.join(', ')} 함께해요` : '';
    const no = declined.length ? `${declined.join(', ')} 사양했어요` : '';
    this.notify(`${inter.icon} ${dweller.name}: "같이 ${JOIN_LINE[inter.id]}!" — ${[join, no].filter(Boolean).join(' · ')}`, 'info');
  }

  /** How long an interaction takes this dweller: repairs speed up with handiness. */
  durationOf(dweller: Dweller, inter: InteractionDef, obj?: PlacedObject): number {
    if (inter.id === 'toddlerNap' && dweller.run?.night) return NIGHT_SLEEP_CAP;
    // A repair picks up where it was left (참고 게임 keeps the repair progress on the object).
    return inter.special === 'repair' ? Math.max(5, repairTime(dweller.skills.handiness) - (obj?.repairDone ?? 0)) : inter.duration;
  }

  /** A night's sleep: an adult's bed, or a toddler's crib at bedtime. */
  private nightSleep(dweller: Dweller, inter: InteractionDef): boolean {
    return inter.id === 'sleep' || (inter.id === 'toddlerNap' && !!dweller.run?.night);
  }

  /** The dweller who owns a bed, if any. */
  isBed(obj: PlacedObject): boolean {
    return ['bed', 'doubleBed', 'deluxeBed', 'deluxeDoubleBed'].includes(obj.defId);
  }

  /** Slept in under covers, in pyjamas: a bed, or a toddler's (which no one claims as theirs). */
  sleptIn(obj: PlacedObject): boolean {
    return this.isBed(obj) || obj.defId === 'toddlerBed';
  }

  bedOwners(uid: number): Dweller[] {
    return this.state.dwellers.filter((s) => s.bedUid === uid);
  }

  /**
   * Whether `dweller` may sleep in this bed: their own, a free one, or the other half of a double bed
   * whose owner is their partner (참고 게임 couples share a double bed).
   */
  canClaimBed(dweller: Dweller, obj: PlacedObject): boolean {
    const owners = this.bedOwners(obj.uid);
    if (owners.includes(dweller) || owners.length === 0) return true;
    if (owners.length >= (getDef(obj.defId).seats ?? 1)) return false;
    return owners.every((o) => this.relationship(dweller.id, o.id).flags.some((f) => f === 'partner' || f === 'engaged' || f === 'married'));
  }

  bedOwner(uid: number): Dweller | undefined {
    return this.state.dwellers.find((s) => s.bedUid === uid);
  }

  private perform(dweller: Dweller, a: Action, r: RunState, dt: number) {
    switch (a.kind) {
      case 'interact': {
        const obj = this.object(a.objectUid);
        const inter = obj && this.interaction(obj, a.interactionId);
        if (!obj || !inter) return this.finishAction(dweller);
        if (this.utilityBlocker(inter)) {
          this.notify(`${dweller.name}: ${this.utilityBlocker(inter)}`, 'bad');
          return this.finishAction(dweller);
        }
        const funMul = this.funMultiplier(obj, inter);
        let effects = funMul === 1 || !(inter.effects.fun! > 0) ? inter.effects : { ...inter.effects, fun: inter.effects.fun! * funMul };
        // Better plumbing washes faster (참고 게임 FastHygiene x2 / FasterHygiene x3); a bidet freshens up.
        const wash = hygieneMultiplier(obj.upgrades);
        if (wash > 1 && (effects.hygiene ?? 0) > 0) effects = { ...effects, hygiene: effects.hygiene! * wash };
        if (hasUpgrade(obj.upgrades, 'bidet')) effects = { ...effects, hygiene: (effects.hygiene ?? 0) + 0.5 };
        if (inter.players) {
          const opponent = this.chessOpponent(dweller, obj);
          // Waiting for an opponent is just studying the board.
          if (!opponent) effects = { fun: (effects.fun ?? 0) / 2 };
          else if (this.playChessTurn(dweller, opponent, obj, dt)) return;
        }
        // Hungry, dirty or ill, sleep is fitful and gives back less energy (sleep.ts).
        if (SLEEPS.has(inter.id) && (effects.energy ?? 0) > 0) {
          const q = restQuality(dweller.needs, dweller.buffs.some((b) => b.id === 'sick'));
          // On what the night gives back over the energy spent lying there: a fitful one restores that much less.
          const spent = NEED_INFO.energy.decay;
          effects = { ...effects, energy: spent + (effects.energy! - spent) * q };
          if (q < FITFUL) r.fitful = (r.fitful ?? 0) + dt;
        }
        this.applyEffects(dweller, effects, dt);
        this.meterUtility(inter, dt, getDef(obj.defId).powerMul);
        // A good bed sleeps off stress, discomfort and daze faster (참고 게임 statistic_reduction_by_category).
        const rest = getDef(obj.defId).restfulness;
        if (rest && (inter.id === 'sleep' || inter.id === 'nap')) {
          for (const b of dweller.buffs) {
            const emo = BUFFS[b.id]?.emotion;
            if (b.until !== null && (emo === 'stressed' || emo === 'uncomfortable' || emo === 'dazed')) b.until -= (rest - 1) * dt;
          }
        }
        if (inter.baby) {
          const baby = this.babyIn(obj);
          if (!baby) return this.finishAction(dweller);
          this.applyEffects(baby, inter.baby, dt);
        }
        this.noteLotHabit(dweller, inter.id, dt);
        if (inter.skill && r.elapsed >= DEEP_IN_IT && SKILL_EMOTION[inter.skill.key] === 'focused' && !dweller.buffs.some((b) => b.id === 'deepInIt')) this.addBuff(dweller, 'deepInIt');
        if (inter.skill) {
          const card = inter.skill.key === 'videoGaming' && hasUpgrade(obj.upgrades, 'gamingSkill') ? 1.3 : 1;
          // On a work lot, the work trains what the job is about (careerSkills.ts jobSkill).
          const wp = this.state.workplace;
          const routine = inter.skill.rate === LEARN.chore;
          // This is what home practice is: away from a workplace and not a chore. It stops at the basics with no job for it, slows at the top with one, and a hobby slows with no job for it (workGrowth.ts).
          const home = !wp && !routine && !dweller.npc && dweller.age !== 'toddler' ? homePracticeFactor(inter.skill.key, Math.floor(dweller.skills[inter.skill.key] ?? 0), hasRelatedJob(dweller, inter.skill.key)) : 1;
          const rate = wp ? inter.skill.rate : forDweller(inter, dweller).rate ?? inter.skill.rate;
          this.gainSkill(dweller, wp ? jobSkill(wp.careerId, inter.skill.key, this.jobBranchAtWork(dweller)) : inter.skill.key, rate * dt * card * home * (r.workFail ? FAIL_LEARN : 1), routine);
          // Living it at home: the home leans towards the lot trait for it (lotTraits.ts).
          this.noteLotPractice(dweller, inter.skill.key, dt);
          // Practising the career's skill at home fills the daily-task meter (full in an hour).
          const career = dweller.job && CAREER_BY_ID[dweller.job.careerId];
          // For school only homework counts, and it takes 참고 게임's hundred minutes (commodity_Career_Homework
          // -100 → 100 at 2 a minute); a job's task fills in an hour of practice (ours).
          const counts = career && career.skill === inter.skill.key && (!career.school || inter.id === 'homework');
          if (dweller.job && counts && (dweller.job.task ?? 0) < 1) {
            dweller.job.task = Math.min(1, (dweller.job.task ?? 0) + dt / (career!.school ? HOMEWORK_MINUTES : 60));
            if (dweller.job.task >= 1) {
              this.wantEvent(dweller, { kind: 'task' });
              if (career!.school) {
                if (dweller.aspiration) {
                  const counters = (dweller.aspiration.counters ??= {});
                  for (const k of ['homework', `homework_${dweller.emotion}`]) counters[k] = (counters[k] ?? 0) + 1;
                }
                this.addBuff(dweller, 'homeworkDone');
                this.notify(`📚 ${josa(dweller.name, '이/가')} 오늘 숙제를 다 했어요!`, 'good');
                this.finishAction(dweller);
                return;
              }
            }
          }
        }
        r.elapsed += dt;
        if (inter.serves) {
          const steps = cookingSteps(inter.serves);
          const due = Math.min(steps, Math.floor((r.elapsed / inter.duration) * (steps + 1)));
          while ((r.steps ?? 0) < due) {
            r.steps = (r.steps ?? 0) + 1;
            if (!dweller.buffs.some((b) => b.id === 'recentFire') && this.rng() < cookingFireChance(dweller.skills.cooking)) {
              this.finishAction(dweller);
              this.ignite(obj, dweller);
              return;
            }
          }
        }
        if (inter.special === 'clean') {
          obj.dirt = Math.min(100, (obj.dirt ?? 100) + CLEAN_RATE * dt);
          if (obj.dirt >= 100) {
            this.finishAction(dweller);
            return;
          }
        }
        if (inter.id === 'buildRocket') {
          obj.rocket = Math.min(100, (obj.rocket ?? 0) + BUILD_RATE * dt);
          if (obj.rocket >= 100) {
            this.notify(`🚀 ${josa(dweller.name, '이/가')} 로켓선을 완성했어요! 우주 탐사를 떠날 수 있어요`, 'good');
            this.finishAction(dweller);
            return;
          }
        }
        if (inter.id === 'fish') {
          r.steps ??= nextBite(this.rng);
          if (r.elapsed >= r.steps) {
            this.landCatch(dweller);
            r.steps = r.elapsed + nextBite(this.rng);
          }
        }
        if (inter.special === 'repair' && ELECTRONICS.has(obj.defId) && r.elapsed >= this.durationOf(dweller, inter, obj) / 2 && !r.steps) {
          // Halfway through fixing electronics comes the moment of truth.
          r.steps = 1;
          if (this.rng() < shockChance(dweller.skills.handiness)) {
            this.finishAction(dweller);
            // Shocks hurt and daze, but never kill here (the player asked; 참고 게임 can die of a second shock).
            this.addBuff(dweller, 'ouch');
            this.addBuff(dweller, 'shockWarning');
            dweller.needs.hygiene = clamp(dweller.needs.hygiene - 20, 0, 100);
            this.notify(`⚡ ${josa(dweller.name, '이/가')} ${getDef(obj.defId).name}을 고치다 감전됐어요!`, 'bad');
            this.injure(dweller, 'shock');
            // Knocked down for a moment (`passout`: 20 minutes), not for long.
            this.push(dweller, { kind: 'passout', autonomous: false });
            return;
          }
        }
        const full = this.nightSleep(dweller, inter) ? this.sleepOver(dweller, r) : inter.untilFull && dweller.needs[inter.untilFull] >= 100;
        if (r.elapsed >= this.durationOf(dweller, inter, obj) || full) {
          const restless = SLEEPS.has(inter.id) && (r.fitful ?? 0) > r.elapsed / 3;
          const workFail = !!r.workFail;
          this.finishAction(dweller);
          if (inter.special === 'restyle' && a.look) this.restyle(dweller.id, a.look);
          this.onInteractionDone(dweller, inter, obj, workFail);
          this.traitAfter(dweller, inter);
          // Tossed and turned: no well-rested morning.
          if (restless) {
            dweller.buffs = dweller.buffs.filter((b) => b.id !== 'wellRested');
            this.addBuff(dweller, 'restlessNight');
          }
        }
        return;
      }
      case 'social': {
        const t = this.dweller(a.targetId);
        const social = SOCIAL_BY_ID[a.socialId];
        if (!t || !social || t.away || (!social.join && t.engagedWith !== dweller.id)) return this.finishAction(dweller);
        const mul = r.outcome === 'fail' ? 0.4 : 1;
        this.applyEffects(dweller, social.effects, dt * mul);
        this.keepConvo(dweller);
        if (!social.join) {
          this.applyEffects(t, social.toddler?.needs ?? social.effects, dt * mul);
          if (social.toddler?.skill) this.gainSkill(t, social.toddler.skill, (social.toddler.rate ?? 0) * dt);
          // The rest of the circle listens in (참고 게임: every group member runs the chat SI).
          for (const m of this.convoOf(dweller)) if (m !== dweller && m !== t && m.queue.length === 0) this.applyEffects(m, social.effects, dt * mul * LISTENER_SHARE);
        }
        // Socialising trains charisma a little (more for jokes and romance).
        this.gainSkill(dweller, 'charisma', LEARN.passing * dt, true);
        // Listening, comforting and looking after little ones train empathy; hosting trains leadership (ours).
        if (EMPATHY_SOCIALS.has(social.id)) this.gainSkill(dweller, 'empathy', LEARN.passing * dt, true);
        if (this.state.party && dweller.id === this.state.party.hostId && t.npc?.role === 'guest') this.gainSkill(dweller, 'leadership', LEARN.passing * dt, true);
        if (social.category === 'funny') this.gainSkill(dweller, 'comedy', LEARN.passing * dt, true);
        // Company at home makes it a sociable home (화기애애); jokes count for comedy too.
        this.noteLotPractice(dweller, social.category === 'funny' ? 'comedy' : 'charisma', dt);
        if (social.category === 'mischief') this.gainSkill(dweller, 'mischief', LEARN.passing * dt, true);
        r.elapsed += dt;
        if (r.elapsed >= social.duration) {
          this.finishAction(dweller);
          this.applySocialOutcome(dweller, t, social, r.outcome ?? 'ok');
        }
        return;
      }
      case 'panic':
        r.elapsed += dt;
        if (r.elapsed >= PANIC_TIME) this.finishAction(dweller);
        return;
      case 'phone': {
        // 참고 게임 phone "Call to Chat": a chat that fills Social without anyone coming over.
        this.applyEffects(dweller, { social: 1.0, fun: 0.3 }, dt);
        r.elapsed += dt;
        if (r.elapsed >= PHONE_CALL_MINUTES) {
          this.finishAction(dweller);
          this.wantEvent(dweller, { kind: 'phone', targetId: a.townieId });
          const rel = this.relationship(dweller.id, a.townieId);
          rel.friend = clamp(rel.friend + trackDelta('friend', rel.friend, 'M'), -100, 100);
        }
        return;
      }
      case 'mop':
        if (!this.puddleAt(a.x, a.y)) return this.finishAction(dweller);
        r.elapsed += dt;
        if (r.elapsed >= MOP_TIME) {
          this.finishAction(dweller);
          this.state.puddles = (this.state.puddles ?? []).filter((p) => p.x !== a.x || p.y !== a.y);
        }
        return;
      case 'extinguish': {
        if (!this.fireAt(a.x, a.y)) return this.finishAction(dweller);
        r.elapsed += dt;
        if (r.elapsed >= EXTINGUISH_TIME) {
          this.finishAction(dweller);
          this.putOut(a.x, a.y, dweller);
        }
        return;
      }
      case 'passout':
        // Knocked out by a burglar: down until the burglar has gone.
        if (a.knockedOut) {
          r.elapsed += dt;
          if (!this.state.dwellers.some((x) => x.npc?.role === 'burglar' && !x.npc.leaving)) {
            this.finishAction(dweller);
            this.notify(`😵‍💫 ${josa(dweller.name, '이/가')} 정신을 차렸어요`, 'info', { dwellerId: dweller.id });
          }
          return;
        }
        // 참고 게임: 20 minutes on the floor, +0.75/min on its -100..100 scale.
        dweller.needs.energy = clamp(dweller.needs.energy + 0.375 * dt, 0, 100);
        r.elapsed += dt;
        if (r.elapsed >= 20) {
          this.addBuff(dweller, 'cameTo');
          this.finishAction(dweller);
        }
        return;
      default:
        return;
    }
  }

  /**
   * How a social will land, decided up front like 참고 게임's test-based outcomes: the context score
   * (conversation mood, relationship, both emotions, charisma) plus a little noise against the
   * social's lines. Affection with a sad or angry dweller flops, and the same social a third time in
   * a row bores the other dweller.
   */
  socialOutcome(dweller: Dweller, t: Dweller, social: SocialDef, rel: Relationship): 'great' | 'ok' | 'fail' {
    const repeat = rel.recent?.socialId === social.id ? rel.recent.count + 1 : 1;
    rel.recent = { socialId: social.id, count: repeat };
    if (repeat >= 3 && social.fail > -999 && !social.work) return 'fail';
    if (social.affectionate && refusesAffection(t.emotion)) return 'fail';
    // Romance asked for: theirs to say yes or no (romanceAcceptance.ts); a yes isn't then taken back by the score.
    const asks = isRomanceAsk(social.id);
    if (asks && this.rng() >= this.romanceAnswer(dweller, t, social.id, rel).chance) return 'fail';
    const traitBonus = traitsOf(dweller.traits).reduce((s, tr) => s + (tr.socialBonus?.[social.category] ?? 0), 0);
    // Comedy skill makes jokes land (our stand-in for 참고 게임's comedy skill tests on funny socials).
    const comedyBonus = social.category === 'funny' ? Math.floor(dweller.skills.comedy) * 1.5 : 0;
    // Mischief skill makes pranks land the same way (ours, after 참고 게임's skill-gated mischief socials).
    const mischiefBonus = social.category === 'mischief' ? Math.floor(dweller.skills.mischief) * 1.5 : 0;
    // The job's own skill makes a piece of work with a client go well (ours).
    const workBonus = social.skillCheck ? Math.floor(dweller.skills[jobSkill(this.state.workplace?.careerId, social.skillCheck, this.jobBranchAtWork(dweller))]) * 2 + (social.work ? moodClient(dweller.emotion) + needClient(dweller) : 0) : 0;
    // Afraid of being judged, a group makes it a little harder (fears.ts).
    const judged = this.hasFear(dweller, 'judged') && this.convoOf(dweller).length >= 3 ? 2 : 0;
    const score =
      workBonus -
      judged +
      needSpeaking(dweller) +
      contextScore(social.category, rel, { emotion: dweller.emotion, charisma: dweller.skills.charisma, empathy: dweller.skills.empathy }, { emotion: t.emotion }) +
      sentimentContext(rel, dweller.id, social.category) +
      traitBonus +
      comedyBonus +
      mischiefBonus +
      (this.rng() - 0.5) * 8;
    if (score >= social.great) return 'great';
    if (score <= social.fail) return asks ? 'ok' : 'fail';
    return 'ok';
  }

  private romanceAnswer(dweller: Dweller, t: Dweller, socialId: string, rel: Relationship) {
    const answer = romanceAcceptance(socialId, rel, { id: dweller.id, emotion: dweller.emotion, charisma: dweller.skills.charisma, traits: dweller.traits, likes: dweller.likes, dislikes: dweller.dislikes }, { id: t.id, emotion: t.emotion, traits: t.traits, likes: t.likes, dislikes: t.dislikes }, this.onDate(dweller, t));
    const body = needRomance(dweller);
    const chance = Math.max(0.05, Math.min(0.95, answer.chance + body / 100));
    return { chance, against: body <= -10 ? needReason({ needs: { ...dweller.needs, hunger: 100, energy: 100, bladder: 100, fun: 100, social: 100 } }) ?? answer.against : answer.against };
  }

  /** What a word leaves in the one who heard it, beyond the outcome's own (docs/mood-moodlets.md). */
  private socialMoodlets(dweller: Dweller, t: Dweller, social: SocialDef, outcome: 'great' | 'ok' | 'fail', rel: Relationship) {
    if (outcome !== 'fail' && social.category === 'mischief') {
      // A fright is a fright; a trick stings half the time, and not one who's in the mood for it.
      if (social.id === 'scare') this.addBuff(t, 'frightened');
      else if (t.emotion !== 'playful' && this.rng() < 0.5) this.addBuff(t, 'prankedAngry');
    }
    if (outcome === 'fail' && (rel.recent?.count ?? 0) >= 3) this.addBuff(t, 'sameTalk');
    if (outcome !== 'fail' && social.id === 'kiss') {
      this.addBuff(dweller, 'sweetLinger');
      this.addBuff(t, 'sweetLinger');
    }
    if (outcome !== 'fail' && social.id === 'compliment' && rel.romance >= 25) this.addBuff(t, 'blushing');
  }

  private applySocialOutcome(dweller: Dweller, t: Dweller, social: SocialDef, outcome: 'great' | 'ok' | 'fail') {
    const party = this.state.party;
    if (party && outcome !== 'fail' && party.kind !== 'date') {
      if (dweller.id === party.hostId && t.npc?.role === 'guest') this.partyGoal(party.kind === 'dinner' ? 'hostChat' : 'hostSocials');
      if (social.id === 'joke') this.partyGoal('jokes');
      if (social.category === 'romance') this.partyGoal('flirts');
      if (social.id === 'deepTalk') this.partyGoal('stories');
      const celebrant = party.celebrantId;
      if (celebrant !== undefined && (dweller.id === celebrant || t.id === celebrant)) {
        this.partyGoal('chatCelebrant');
        if (social.id === 'compliment' && t.id === celebrant) this.partyGoal('complimentCelebrant');
        if (this.dweller(celebrant)?.emotion === 'happy') this.partyGoal('chatCelebrantHappy');
      }
    }
    if (party?.kind === 'date' && outcome !== 'fail' && this.onDate(dweller, t)) {
      this.partyGoal('dateSocials');
      const step: Partial<Record<string, PartyGoalKind>> = { joke: 'dateJoke', deepTalk: 'dateDeepTalk', flirt: 'dateFlirt', kiss: 'dateKiss', askPartner: 'dateKiss', hug: 'dateHug' };
      if (step[social.id]) this.partyGoal(step[social.id]!);
    }
    if (dweller.aspiration && outcome !== 'fail') {
      const counters = (dweller.aspiration.counters ??= {});
      counters[`social_${social.category}`] = (counters[`social_${social.category}`] ?? 0) + 1;
      this.countActivity(dweller, `social_${social.id}`, social.skillCheck);
    }
    if (outcome !== 'fail') this.learnFromTalk(dweller, t, social);
    const rel = this.relationship(dweller.id, t.id);
    const o: SocialOutcome = social.outcomes[outcome];
    // Both sides' liked or disliked topic and kind of person (preferences.ts): more or less friendship, and a moodlet each.
    const likeMul = socialGainMul(dweller, t, social.id);
    for (const [me, other] of [
      [dweller, t],
      [t, dweller],
    ] as const) {
      const { like, dislike } = socialLiking(me, other, social.id);
      for (const id of like) this.addBuff(me, `like_${id}`);
      for (const id of dislike) this.addBuff(me, `dislike_${id}`);
    }
    if (o.friend) {
      const d = trackDelta('friend', rel.friend, o.friend);
      rel.friend = clamp(rel.friend + (d > 0 ? d * likeMul * needFriendship(dweller) : d * moodFallingOut(dweller.emotion)), -100, 100);
    }
    if (o.romance) rel.romance = clamp(rel.romance + trackDelta('romance', rel.romance, o.romance), -100, 100);
    rel.lastChange = this.state.time;
    rel.stage = friendStage(rel.friend, rel.stage);
    for (const [k, v] of Object.entries(o.mood ?? {}) as Array<[keyof Relationship['mood'], number]>) rel.mood[k] = clamp(rel.mood[k] + v, -100, 100);
    for (const f of o.addFlags ?? []) {
      if (rel.flags.includes(f)) continue;
      rel.flags.push(f);
      (rel.since ??= {})[f] = this.state.time;
      if (f === 'enemy') rel.flags = rel.flags.filter((x) => x !== 'bff');
      const msg = {
        partner: `${josa(dweller.name, '와/과')} ${josa(t.name, '이/가')} 사귀기 시작했어요 💞`,
        engaged: `${josa(dweller.name, '와/과')} ${josa(t.name, '이/가')} 약혼했어요 💍`,
        married: `💒 ${josa(dweller.name, '와/과')} ${josa(t.name, '이/가')} 결혼했어요!`,
        bff: `${josa(dweller.name, '와/과')} ${josa(t.name, '은/는')} 이제 베프예요 🤞`,
        enemy: `${josa(dweller.name, '와/과')} ${josa(t.name, '은/는')} 원수가 됐어요 ⚔️`,
      }[f];
      this.notify(msg, f === 'enemy' ? 'bad' : 'good', f === 'enemy' ? { dwellerId: dweller.id } : { dwellerId: dweller.id, look: 'moment', slam: f === 'married' ? { title: '결혼을 축하해요!', icon: '💒' } : undefined });
    }
    this.rollBuff(dweller, o.actorBuff);
    this.rollBuff(t, o.targetBuff);
    this.socialMoodlets(dweller, t, social, outcome, rel);
    if (social.id === 'welcome' && t.npc && t.npc.role !== 'guest') {
      t.npc = { role: 'guest', until: this.state.time + VISIT_LENGTH };
      t.queue = [];
      t.run = null;
      this.notify(`🏠 ${josa(t.name, '이/가')} 놀러 왔어요`, 'good');
      this.guestArrived(t);
    }
    if (social.id === 'askToLeave' && t.npc?.role === 'guest') this.sendHome(t, `👋 ${josa(t.name, '이/가')} 돌아갔어요`);
    if (social.id === 'marry') this.onWedding(dweller, t);
    if (social.id === 'tryForBaby') this.tryForBaby(dweller, t);
    if (outcome !== 'fail') this.traitSocial(dweller, t, social);
    // At work: a word with the boss or a colleague counts (workplace.ts).
    const wp = this.state.workplace;
    if (wp && outcome !== 'fail' && dweller.id === wp.workerId && t.npc?.role === 'coworker') {
      this.workSocial(t.npc.boss ? 'boss' : 'coworker');
      // Mentoring (ours): the boss passes on the job's know-how, colleagues the everyday basics.
      const prof = SKILL_PROFILES[wp.careerId];
      if (prof) this.gainSkill(dweller, t.npc.boss ? prof.main : prof.base, t.npc.boss ? 0.5 : 0.25);
    }
    // Seeing to a client is a piece of the job, and they go on their way (a flop means trying again).
    if (wp && social.work && dweller.id === wp.workerId && t.npc?.role === 'client') {
      if (outcome === 'fail') this.notify(`😕 ${social.label}: 잘 되지 않았어요${moodClient(dweller.emotion) <= -3 ? ` (${MOOD_EFFECTS[dweller.emotion].because})` : ''}. 다시 해 보세요`, 'bad');
      else {
        this.workDone(dweller, social.id);
        if (outcome === 'great') wp.points += POINTS.great;
        this.clientLeaves(t, true);
      }
    }
    // A colleague seeing to them: they go on their way, however it went.
    if (wp && social.work && dweller.npc?.role === 'coworker' && t.npc?.role === 'client') this.clientLeaves(t, true, true);
    // A toddler taught something new (참고 게임 buff_Trait_Toddler_Inquisitive_LearnedSomethingNew).
    if (social.toddler?.skill && t.age === 'toddler') {
      (t.toddlerLast ??= {}).learning = this.state.time;
      if (hasTrait(t.traits, 'tInquisitive')) this.addBuff(t, 'learnedSomethingNew');
    }
    if (social.id === 'fight') this.settleFight(dweller, t);
    if (outcome !== 'fail' && social.id === 'deepTalk') {
      this.faceFear(dweller, 'judged');
      if (this.familyTie(dweller, t) === '부모') this.faceFear(dweller, 'family');
      this.talkFearsOver(dweller, t);
    }
    // Hearing someone's worry out (2026-10-26): a deep talk, or the social for it; good news shared.
    if (outcome !== 'fail' && (social.id === 'hearOut' || social.id === 'deepTalk')) this.hearOut(dweller, t, outcome === 'great');
    if (outcome !== 'fail' && social.id === 'shareJoy') this.shareJoy(dweller, t);
    // A good talk with someone friendly eases being left on one's own; asking about work, the future.
    if (outcome !== 'fail' && (social.category === 'friendly' || social.category === 'funny') && (this.familyTie(dweller, t) || this.relationship(dweller.id, t.id).friend >= 20)) this.faceFear(dweller, 'lonely');
    if (outcome !== 'fail' && social.id === 'askAboutCareer') this.faceFear(dweller, 'future');
    // Praise heard is evidence against being found out; reaching out and taken up, against rejection.
    if (outcome !== 'fail' && social.id === 'compliment') this.faceFear(t, 'imposter');
    if (FEAR_BY_ID.rejection.about!.includes(social.id)) {
      if (this.rng() < fearOdds(0.5, fearLevel(dweller, 'rejection'))) this.addBuff(dweller, 'fearRejectionNerves');
      if (outcome !== 'fail') this.faceFear(dweller, 'rejection');
    }
    if (outcome !== 'fail' && this.convoOf(dweller).length >= 3) {
      if (this.hasFear(dweller, 'crowded')) this.faceFear(dweller, 'crowded');
      if (this.hasFear(dweller, 'judged') && this.rng() < 0.3) this.addBuff(dweller, 'fearJudged');
    }
    if (outcome === 'fail' && social.category !== 'mean') this.maybeFear(dweller, 'judged');
    if (social.id === 'confrontBurglar' && t.npc?.role === 'burglar') this.confrontBurglar(dweller, t);
    this.leaveSentiments(dweller, t, social, outcome, o);
    if (social.id === 'askMoveIn') this.askMoveIn(dweller, t);
    const others = this.convoOf(dweller).filter((m) => m !== dweller && m !== t);
    if (social.join) {
      // Joining greets the whole circle.
      if (o.friend) for (const m of others) this.bumpFriend(dweller, m, o.friend, 1);
    } else if (outcome !== 'fail') {
      // Listeners warm a little to whoever spoke; a good social in a crowd of 3+ lifts everyone
      // (참고 게임 dweller_Chat basic_extras: buff on Actor, SocialGroupDwellers and TargetDweller at group size >= 3).
      for (const m of others) this.bumpFriend(m, dweller, 'S', 0.5);
      if (others.length > 0) for (const m of [dweller, t, ...others]) this.addBuff(m, 'groupChat');
    }
    if (outcome !== 'fail') this.wantEvent(dweller, { kind: 'social', id: social.id, targetId: t.id });
    for (const f of o.addFlags ?? []) {
      this.wantEvent(dweller, { kind: 'flag', flag: f, targetId: t.id });
      this.wantEvent(t, { kind: 'flag', flag: f, targetId: dweller.id });
    }
    if (outcome === 'fail' && refusalDays(social.id)) {
      // Turned down: asked again only after a while, and they say why, if it's plain.
      const rel = this.relationship(dweller.id, t.id);
      (rel.refusedUntil ??= {})[social.id] = this.state.time + refusalDays(social.id) * 1440;
      const why = this.romanceAnswer(dweller, t, social.id, rel).against;
      this.notify(`💔 ${josa(t.name, '이/가')} ${social.id === 'propose' ? '청혼을' : '고백을'} 거절했어요${why ? `: ${why}` : ''}`, 'bad', { dwellerId: dweller.id });
    } else if (outcome === 'fail' && social.fail > -999) {
      const why = moodReason(social.category, dweller, t, 'fail');
      this.notify(`${dweller.name}의 ${josa(social.label, '은/는')} 잘 안 통했어요… 😅${why ? ` (${why})` : ''}`, 'info');
    } else if (outcome === 'great' && !o.addFlags?.length && !social.toddler) {
      const why = moodReason(social.category, dweller, t, 'great');
      this.notify(`${dweller.name}의 ${josa(social.label, '이/가')} 제대로 통했어요! ✨${why ? ` (${why})` : ''}`, 'good');
    }
  }

  private bumpFriend(a: Dweller, b: Dweller, tier: Tier, scale: number) {
    const rel = this.relationship(a.id, b.id);
    rel.friend = clamp(rel.friend + trackDelta('friend', rel.friend, tier) * scale, -100, 100);
    rel.stage = friendStage(rel.friend, rel.stage);
    rel.lastChange = this.state.time;
  }

  // ---------- multitasking: socials on top of an activity ----------

  /** The light activity (sofa, TV, music, a snack) the dweller is in the middle of, if any. */
  chattyActivity(dweller: Dweller): { obj: PlacedObject; inter: InteractionDef } | null {
    const perf = this.performing(dweller);
    return perf?.inter.chatty ? perf : null;
  }

  /** The side social the dweller is part of, as speaker or listener. */
  sideSocialOf(dweller: Dweller): { speaker: Dweller; side: NonNullable<Dweller['side']> } | null {
    if (dweller.side) return { speaker: dweller, side: dweller.side };
    const speaker = this.state.dwellers.find((s) => s.side?.targetId === dweller.id);
    return speaker?.side ? { speaker, side: speaker.side } : null;
  }

  /** Two dwellers busy with light activities close by in the same room can talk without stopping. */
  canSideChat(dweller: Dweller, t: Dweller): boolean {
    if (dweller === t || dweller.away || t.away || !this.chattyActivity(dweller) || !this.chattyActivity(t)) return false;
    if (this.sideSocialOf(dweller) || this.sideSocialOf(t)) return false;
    if (Math.hypot(dweller.x - t.x, dweller.y - t.y) > SIDE_RANGE) return false;
    return roomAt(Math.round(dweller.x), Math.round(dweller.y)) === roomAt(Math.round(t.x), Math.round(t.y));
  }

  private startSide(dweller: Dweller, t: Dweller, social: SocialDef, autonomous: boolean) {
    const rel = this.relationship(dweller.id, t.id);
    const blocker = socialBlocker(social, rel, dweller, this.state.time);
    if (blocker) {
      if (!autonomous) this.notify(`${t.name}: ${josa(social.label, '은/는')} 아직 어색해요 (${blocker})`, 'info');
      return;
    }
    dweller.side = { targetId: t.id, socialId: social.id, elapsed: 0, outcome: this.socialOutcome(dweller, t, social, rel) };
    this.enterConvo(dweller, t);
  }

  /** Runs the dweller's side social, or every 12–15 minutes of a light activity looks for one (참고 게임 full-autonomy delay). */
  private stepSide(dweller: Dweller, dt: number) {
    const side = dweller.side;
    if (side) {
      const t = this.dweller(side.targetId);
      const social = SOCIAL_BY_ID[side.socialId];
      const together = t && !t.away && this.chattyActivity(dweller) && this.chattyActivity(t) && Math.hypot(dweller.x - t.x, dweller.y - t.y) <= SIDE_RANGE;
      if (!t || !social || !together) {
        dweller.side = undefined;
        return;
      }
      const mul = side.outcome === 'fail' ? 0.4 : 1;
      this.applyEffects(dweller, social.effects, dt * mul);
      this.applyEffects(t, social.effects, dt * mul);
      this.gainSkill(dweller, 'charisma', LEARN.passing * dt, true);
      if (EMPATHY_SOCIALS.has(social.id)) this.gainSkill(dweller, 'empathy', LEARN.passing * dt, true);
        if (social.category === 'funny') this.gainSkill(dweller, 'comedy', LEARN.passing * dt, true);
        if (social.category === 'mischief') this.gainSkill(dweller, 'mischief', LEARN.passing * dt, true);
      this.keepConvo(dweller);
      side.elapsed += dt;
      if (side.elapsed >= social.duration) {
        dweller.side = undefined;
        this.applySocialOutcome(dweller, t, social, side.outcome);
      }
      return;
    }
    if (!this.state.freeWill || !this.chattyActivity(dweller) || this.sideSocialOf(dweller)) return;
    if (dweller.sideCheckAt !== undefined && this.state.time < dweller.sideCheckAt) return;
    dweller.sideCheckAt = this.state.time + 12 + this.rng() * 3;
    const pick = chooseSideSocial(this, dweller);
    const t = pick && this.dweller(pick.targetId);
    if (pick && t) this.startSide(dweller, t, SOCIAL_BY_ID[pick.socialId], true);
  }

  // ---------- pregnancy, babies and growing up ----------

  /** How `b` is related to `a`, if they're family: parent, child or sibling (참고 게임 family bits). */
  familyTie(a: Dweller, b: Dweller): '부모' | '자녀' | '형제자매' | null {
    if (a.parents?.includes(b.id)) return '부모';
    if (b.parents?.includes(a.id)) return '자녀';
    if (a.parents?.some((p) => b.parents?.includes(p))) return '형제자매';
    return null;
  }

  /** The baby sleeping in a bassinet, if any. */
  babyIn(obj: PlacedObject): Dweller | undefined {
    if (obj.defId !== 'bassinet') return undefined;
    return this.state.dwellers.find((s) => s.age === 'baby' && s.bassinetUid === obj.uid);
  }

  /**
   * What a household dweller learns from talking to someone outside the household (dwellerKnowledge.ts,
   * after 참고 게임 DwellerKnowledge): "알아가기" one trait or like, "직업에 대해 묻기" the job, which also
   * counts as having looked into that field of work (aspirations).
   */
  private learnFromTalk(dweller: Dweller, t: Dweller, social: SocialDef) {
    if (dweller.npc || this.household().includes(t)) return;
    const townie = (this.home ?? this).state.townies?.find((x) => x.id === t.id);
    if (!townie) return;
    // A colleague's inner life (2026-10-26): asked about straight out, opened up in a heart-to-heart,
    // or let slip now and then in friendly talk.
    if (townie.workmate) {
      const inner = innerOf(townie, t.npc?.role === 'coworker' ? t : undefined);
      if (social.id === 'askWhatsUp') {
        this.notify(askWhatsUp(dweller, t.id, t.name, inner, this.relationship(dweller.id, t.id).friend, this.rng), 'info', { dwellerId: dweller.id });
        return;
      }
      const deep = social.id === 'deepTalk';
      if (deep || ((social.category === 'friendly' || social.category === 'funny') && this.rng() < TALK_CHANCE)) {
        const line = slipInner(dweller, t.id, t.name, inner, deep, this.rng);
        if (line) {
          this.notify(line, 'info', { dwellerId: dweller.id });
          if (!deep) return;
        }
      }
    }
    const facts = factsOf(t, townie);
    // 알아가기 always tells one thing; any other friendly talk now and then lets one slip (2026-10-20).
    const chance = social.id === 'getToKnow' ? 1 : social.id === 'deepTalk' ? DEEP_TALK_CHANCE : social.category === 'friendly' || social.category === 'funny' ? TALK_CHANCE : 0;
    if (social.id !== 'askAboutCareer') {
      if (chance <= 0 || this.rng() >= chance) return;
      const line = learnOne(dweller, t.id, facts, this.rng);
      if (line) this.notify(line, 'info', { dwellerId: dweller.id });
      return;
    }
    const line = hearAboutJob(dweller, t.id, facts);
    if (!line) return;
    this.notify(line, 'info', { dwellerId: dweller.id });
    this.noteExplore(dweller.id, fieldHeard(facts.careerId));
  }

  /** Big moments leave 참고 게임 sentiments behind (names as in the Korean game). */
  private leaveSentiments(dweller: Dweller, t: Dweller, social: SocialDef, outcome: 'great' | 'ok' | 'fail', o: SocialOutcome) {
    const rel = this.relationship(dweller.id, t.id);
    const now = this.state.time;
    if (social.id === 'deepTalk' && outcome === 'great') {
      addSentiment(rel, dweller.id, 'close', '좋은 시간을 보낸 후의 친밀감', now);
      addSentiment(rel, t.id, 'close', '좋은 시간을 보낸 후의 친밀감', now);
    }
    if (o.addFlags?.some((f) => f === 'partner' || f === 'engaged' || f === 'married')) {
      addSentiment(rel, dweller.id, 'enamored', '홀딱 반함', now);
      addSentiment(rel, t.id, 'enamored', '홀딱 반함', now);
    }
    if (social.id === 'insult' || social.id === 'argue') addSentiment(rel, t.id, 'furious', '격노함', now);
    if (social.category === 'romance' && outcome === 'fail' && o.actorBuff?.some((b) => b.id === 'rejected')) addSentiment(rel, dweller.id, 'hurt', '거절 때문에 낙담함', now);
  }

  /** Who won, a moodlet each, and something for anyone who watched. */
  private settleFight(dweller: Dweller, t: Dweller) {
    const won = this.rng() < fightWinChance(dweller, t);
    const [winner, loser] = won ? [dweller, t] : [t, dweller];
    this.addBuff(winner, 'wonFight');
    this.addBuff(loser, 'lostFight');
    if (this.rng() < BEATEN_HURT) this.injure(loser, 'beaten');
    addSentiment(this.relationship(winner.id, loser.id), loser.id, 'bitter', '싸움 후의 앙심', this.state.time);
    this.notify(`👊 ${josa(winner.name, '이/가')} ${loser.name}와의 싸움에서 이겼어요`, 'info');
    const reactions = ['sawFightHappy', 'sawFightEnergized', 'sawFightBored', 'sawFightInspired'];
    for (const s of this.state.dwellers) {
      if (s === dweller || s === t || s.away || s.age === 'baby' || Math.hypot(s.x - dweller.x, s.y - dweller.y) > 6) continue;
      this.addBuff(s, reactions[Math.floor(this.rng() * reactions.length)]);
    }
    const rel = this.relationship(dweller.id, t.id);
    if (rel.friend <= -70 && !rel.flags.includes('enemy')) {
      rel.flags = rel.flags.filter((f) => f !== 'bff');
      rel.flags.push('enemy');
      this.notify(`${josa(dweller.name, '와/과')} ${josa(t.name, '은/는')} 원수가 됐어요 ⚔️`, 'bad');
    }
  }

  private tryForBaby(dweller: Dweller, t: Dweller) {
    const expecting = this.household().filter((s) => s.pregnancy).length;
    if (dweller.pregnancy || t.pregnancy) return this.notify('이미 아기가 생겼어요', 'info');
    if (dweller.age === 'elder' || t.age === 'elder') return this.notify('노년에는 아기를 가질 수 없어요', 'info');
    if (isYoung(dweller.age) || isYoung(t.age)) return;
    if (this.household().length + expecting >= MAX_HOUSEHOLD || t.npc) return this.notify(`가족이 ${MAX_HOUSEHOLD}명이 넘으면 아기를 키울 수 없어요`, 'info');
    // Who carries the baby, after 참고 게임's gender options (gender.ts); a couple who can't may adopt.
    const carrier = babyCarrier(dweller, t);
    if (!carrier) return this.notify(`${josa(dweller.name, '와/과')} ${josa(t.name, '은/는')} 함께 아기를 가질 수 없어요. 휴대폰으로 입양할 수 있어요`, 'info');
    const other = carrier === t ? dweller : t;
    if (this.rng() < TRY_FOR_BABY_CHANCE) {
      carrier.pregnancy = { partnerId: other.id, since: this.state.time };
      this.addBuff(carrier, 'trimester1');
      this.notify(`🤰 ${josa(carrier.name, '이/가')} 아기를 가졌어요!`, 'good');
    } else {
      this.addBuff(dweller, 'notPregnant');
      this.addBuff(t, 'notPregnant');
      this.notify('이번에는 아기가 생기지 않았어요', 'info');
    }
  }

  /** Trimester moodlets as the pregnancy goes on, labour at the end, then the baby. */
  private stepPregnancy(dweller: Dweller) {
    const p = dweller.pregnancy;
    if (!p) return;
    const progress = (this.state.time - p.since) / PREGNANCY_LENGTH;
    const stage = progress >= 2 / 3 ? 'trimester3' : progress >= 1 / 3 ? 'trimester2' : 'trimester1';
    if (!dweller.buffs.some((b) => b.id === stage)) {
      dweller.buffs = dweller.buffs.filter((b) => !b.id.startsWith('trimester'));
      this.addBuff(dweller, stage);
    }
    if (progress < 1) return;
    if (p.laborAt === undefined) {
      p.laborAt = this.state.time;
      this.addBuff(dweller, 'inLabor');
      this.notify(`😣 ${josa(dweller.name, '이/가')} 진통을 시작했어요!`, 'bad');
      return;
    }
    if (this.state.time - p.laborAt >= LABOR_LENGTH) this.giveBirth(dweller);
  }

  private giveBirth(mother: Dweller) {
    const p = mother.pregnancy!;
    mother.pregnancy = undefined;
    mother.buffs = mother.buffs.filter((b) => !b.id.startsWith('trimester') && b.id !== 'inLabor');
    const father = this.dweller(p.partnerId);
    const bassinet = this.state.objects.find((o) => o.defId === 'bassinet' && !this.babyIn(o)) ?? this.placeNear('bassinet', mother);
    const parents = [mother, father ?? mother];
    const pick = <T,>(a: T, b: T) => (this.rng() < 0.5 ? a : b);
    const id = Math.max(...this.state.dwellers.map((s) => s.id), ...(this.state.townies ?? []).map((t) => t.id), 0) + 1;
    const baby: Dweller = {
      id,
      ...this.newbornGender(),
      shirt: '#fafafa',
      skin: pick(parents[0].skin, parents[1].skin),
      hair: pick(parents[0].hair, parents[1].hair),
      x: bassinet ? bassinet.x : mother.x,
      y: bassinet ? bassinet.y : mother.y,
      needs: { hunger: 90, energy: 90, bladder: 100, hygiene: 90, fun: 100, social: 90 },
      skills: NO_SKILLS(),
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: [],
      age: 'baby',
      bornAt: this.state.time,
      bassinetUid: bassinet?.uid,
      parents: [...new Set(parents.map((p) => p.id))],
    };
    this.state.dwellers.push(baby);
    for (const parent of new Set(parents)) {
      this.addBuff(parent, 'hadBaby');
      const rel = this.relationship(parent.id, baby.id);
      addSentiment(rel, parent.id, 'adoring', '완전한 기쁨', this.state.time);
      rel.friend = 40;
      rel.stage = friendStage(rel.friend, rel.stage);
    }
    this.notify(`👶 ${josa(mother.name, '이/가')} 아기 ${josa(baby.name, '을/를')} 낳았어요!`, 'good', { dwellerId: baby.id, look: 'moment', slam: { title: '아기가 태어났어요!', icon: '👶', household: true } });
    const parent = [mother, father].find((p) => p && !p.npc);
    if (parent) this.askThought(parent, 'life', 'childBorn');
  }

  /** Why `dweller` can't adopt right now, if they can't (참고 게임 adoption by phone: grown-ups, room in the household, §1000). */
  adoptBlocker(dweller: Dweller): string | null {
    if (dweller.npc || dweller.away || (dweller.age && dweller.age !== 'elder')) return '어른만 입양할 수 있어요';
    if (this.household().length + this.household().filter((s) => s.pregnancy).length >= MAX_HOUSEHOLD) return `가족이 ${MAX_HOUSEHOLD}명이에요`;
    if (this.state.money < ADOPTION_COST) return `§${ADOPTION_COST} 필요`;
    return null;
  }

  /**
   * Adopts a baby, a toddler or a child by phone (참고 게임 adoption_Picker_Phone → AdoptPickedChild: §1000,
   * "아이 입양" for the new parents). The child joins with a crib or a school place as their age needs.
   */
  adopt(dwellerId: number, age: 'baby' | 'toddler' | 'child') {
    const dweller = this.dweller(dwellerId);
    if (!dweller) return;
    const blocked = this.adoptBlocker(dweller);
    if (blocked) {
      this.notify(`🫂 ${blocked}`, 'info');
      this.emit();
      return;
    }
    this.state.money -= ADOPTION_COST;
    const partner = this.household().find((s) => s !== dweller && !isYoung(s.age) && ['married', 'partner', 'engaged'].some((f) => this.relationship(dweller.id, s.id).flags.includes(f as 'married')));
    const parents = partner ? [dweller, partner] : [dweller];
    const id = Math.max(...this.state.dwellers.map((s) => s.id), ...(this.state.townies ?? []).map((t) => t.id), 0) + 1;
    const crib = age !== 'baby' ? undefined : (this.state.objects.find((o) => o.defId === 'bassinet' && !this.babyIn(o) && !this.state.dwellers.some((s) => s.bassinetUid === o.uid)) ?? this.placeNear('bassinet', dweller));
    const kid: Dweller = {
      id,
      ...this.newbornGender(),
      shirt: SHIRT_COLORS[Math.floor(this.rng() * SHIRT_COLORS.length)],
      skin: SKIN_COLORS[Math.floor(this.rng() * SKIN_COLORS.length)],
      hair: HAIR_COLORS[Math.floor(this.rng() * HAIR_COLORS.length)],
      x: crib ? crib.x : this.exitTile.x,
      y: crib ? crib.y : this.exitTile.y,
      needs: { hunger: 90, energy: 90, bladder: 100, hygiene: 90, fun: 90, social: 90 },
      skills: NO_SKILLS(),
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: [],
      age,
      bornAt: this.state.time,
      bassinetUid: age === 'baby' ? crib?.uid : undefined,
      parents: parents.map((p) => p.id),
    };
    this.state.dwellers.push(kid);
    if (age === 'toddler') this.toddlerBedFor(kid);
    if (age === 'toddler') {
      const toddlerTraits = TRAITS.filter((t) => t.ages?.includes('toddler'));
      kid.traits = [toddlerTraits[Math.floor(this.rng() * toddlerTraits.length)].id];
    }
    if (age === 'child') {
      kid.job = { careerId: 'school', level: 2, performance: 0, lastWorkDay: clockInfo(this.state.time).day, tone: 'normal', task: 0 };
      this.randomTraitFor(kid, 'child');
      const childAsps = aspirationsFor('child');
      kid.aspiration = { id: childAsps[Math.floor(this.rng() * childAsps.length)].id, milestone: 0, counters: {}, since: this.state.time };
      Object.assign(kid, randomPreferences(this.rng, { traits: kid.traits, age: kid.age }));
    }
    for (const parent of parents) {
      this.addBuff(parent, 'adoptedChild');
      const rel = this.relationship(parent.id, kid.id);
      addSentiment(rel, parent.id, 'adoring', '완전한 기쁨', this.state.time);
      rel.friend = 40;
      rel.stage = friendStage(rel.friend, rel.stage);
    }
    const what = age === 'baby' ? '아기' : age === 'toddler' ? '유아' : '어린이';
    const bed = age === 'child' && !this.state.objects.some((o) => this.isBed(o) && this.canClaimBed(kid, o)) ? ' 침대를 하나 더 놓아 주세요.' : '';
    this.notify(`🫂 ${josa(dweller.name, '이/가')} ${what} ${josa(kid.name, '을/를')} 입양했어요! (−§${ADOPTION_COST})${bed}`, 'good', { dwellerId: kid.id, look: 'moment', slam: { title: '새 가족이 생겼어요!', icon: '🫂', household: true } });
    this.emit();
  }

  /**
   * A dweller with nothing to do, boxed in where they stand (furniture put down all round a bed they
   * got out of), steps out to the nearest tile they can walk from (참고 게임 resets a stuck dweller). Without
   * it they'd stand there, needs falling, until they starved.
   */
  private freeIfBoxedIn(dweller: Dweller) {
    if (dweller.away || dweller.age === 'baby' || dweller.npc) return;
    const [x, y] = [Math.round(dweller.x), Math.round(dweller.y)];
    const blocked = this.blocked;
    const floor = Math.floor(y / MAP_H);
    const free = (px: number, py: number) => px >= 0 && px < MAP_W && py >= 0 && Math.floor(py / MAP_H) === floor && idx(px, py) < blocked.length && !blocked[idx(px, py)];
    if (free(x, y) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => free(x + dx, y + dy))) return;
    const exit = this.exitTile;
    const reach = routeFrom(blocked, exit.x, exit.y, undefined, this.stairLinks, this.stairGates);
    let best: P | null = null;
    for (let py = floor * MAP_H; py < (floor + 1) * MAP_H; py++)
      for (let px = 0; px < MAP_W; px++) {
        if (!free(px, py) || reach.dist[idx(px, py)] < 0) continue;
        if (!best || Math.hypot(px - x, py - y) < Math.hypot(best.x - x, best.y - y)) best = { x: px, y: py };
      }
    if (best) Object.assign(dweller, best);
  }

  /**
   * A dweller who can't get back to the door from where they are (shut in a corner by furniture put
   * down since) is moved to the nearest tile that can: like being boxed in, but anywhere.
   */
  private freeIfCutOff(dweller: Dweller) {
    if (dweller.away || dweller.age === 'baby' || dweller.npc) return;
    const exit = this.exitTile;
    const reach = routeFrom(this.blocked, exit.x, exit.y, undefined, this.stairLinks, this.stairGates);
    const [x, y] = [Math.round(dweller.x), Math.round(dweller.y)];
    const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && x + dx < MAP_W && idx(x + dx, y + dy) < reach.dist.length && reach.dist[idx(x + dx, y + dy)] >= 0);
    if (near) return;
    const floor = Math.floor(y / MAP_H);
    let best: P | null = null;
    for (let py = floor * MAP_H; py < (floor + 1) * MAP_H; py++)
      for (let px = 0; px < MAP_W; px++) {
        if (reach.dist[idx(px, py)] < 0 || this.blocked[idx(px, py)]) continue;
        if (!best || Math.hypot(px - x, py - y) < Math.hypot(best.x - x, best.y - y)) best = { x: px, y: py };
      }
    if (best) Object.assign(dweller, best);
  }

  /**
   * Whether putting `defId` down there leaves every piece that could be got to before still within
   * reach from the door (a bed's side, the fridge's front), so nobody is shut in or out.
   */
  private keepsWayClear(defId: string, x: number, y: number, dir: Dir, ignoreUid?: number): boolean {
    return !this.cutOff(defId, x, y, dir, ignoreUid);
  }

  /**
   * What putting `defId` there would shut off from the door (a piece no one could get to any more),
   * or null if nothing (ours: buy mode won't let a sofa wall a dweller into a corner of the bedroom).
   */
  wayBlocker(defId: string, x: number, y: number, dir: Dir, ignoreUid?: number): string | null {
    const key = `${defId}|${x}|${y}|${dir}|${ignoreUid}|${this.layoutVersion}`;
    if (this.wayCache?.key === key) return this.wayCache.value;
    const shut = this.cutOff(defId, x, y, dir, ignoreUid);
    const value = shut ? `그 자리에 두면 ${josa(getDef(shut.defId).name, '이/가')} 막혀서 갈 수 없게 돼요` : null;
    this.wayCache = { key, value };
    return value;
  }
  private wayCache?: { key: string; value: string | null };

  private cutOff(defId: string, x: number, y: number, dir: Dir, ignoreUid?: number): PlacedObject | null {
    const exit = this.exitTile;
    const others = this.state.objects.filter((o) => o.uid !== ignoreUid);
    const reachable = (objects: PlacedObject[]) => {
      const blocked = buildBlocked(this.tiles, objects, this.walls);
      const map = routeFrom(blocked, exit.x, exit.y, undefined, this.stairLinks, this.stairGates);
      return (o: PlacedObject) => {
        const def = getDef(o.defId);
        const fp = footprintTiles(def, o.x, o.y, o.dir);
        return accessTiles(def, o.x, o.y, o.dir, 1).some((p) => p.x >= 0 && p.x < MAP_W && idx(p.x, p.y) < map.dist.length && map.dist[idx(p.x, p.y)] >= 0 && reachesFrom(this.walls, fp, p));
      };
    };
    const placed: PlacedObject = { uid: -1, defId, x, y, dir };
    const before = reachable(this.state.objects);
    const after = reachable([...others, placed]);
    // Unreachable where it goes only if it could be got to there before (a room with no door yet is fine to furnish).
    if (getDef(defId).interactions.length && !after(placed) && reachable(others)(placed)) return placed;
    return others.find((o) => getDef(o.defId).interactions.length && before(o) && !after(o)) ?? null;
  }

  /**
   * 참고 게임 drops a bassinet next to the new mum if the house has none free; ours does the same with a
   * toddler bed for a new toddler (`toddlerBedFor`), only where it keeps the way clear.
   */
  private placeNear(defId: 'bassinet' | 'toddlerBed', near: Dweller): PlacedObject | undefined {
    const spots: P[] = [];
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) spots.push({ x, y });
    // A bed goes against a wall (its head to it), not out in the middle of a room.
    const score = (p: P) => Math.hypot(p.x - near.x, p.y - near.y) + (defId === 'toddlerBed' && !this.walls[edgeKey(p.x, p.y, 'n') ?? ''] ? 8 : 0);
    spots.sort((a, b) => score(a) - score(b));
    for (const p of spots) {
      if (roomAt(p.x, p.y) === 'outside' || !this.canPlace(defId, p.x, p.y, 'down') || !this.keepsWayClear(defId, p.x, p.y, 'down')) continue;
      const obj: PlacedObject = { uid: this.state.nextUid++, defId, x: p.x, y: p.y, dir: 'down' };
      this.state.objects.push(obj);
      this.invalidate();
      return obj;
    }
    return undefined;
  }

  /**
   * A toddler bed for a toddler of the household when there are fewer than toddlers (ours: 참고 게임 leaves
   * it to the player, and a toddler with none sleeps on the floor), near them; false if none fits.
   */
  private toddlerBedFor(dweller: Dweller): boolean {
    const toddlers = this.household().filter((s) => s.age === 'toddler').length;
    const beds = this.state.objects.filter((o) => o.defId === 'toddlerBed').length;
    if (beds >= toddlers) return true;
    return !!this.placeNear('toddlerBed', dweller);
  }

  /** A baby just has needs: they run down, it sleeps when tired, cries when something's wrong. */
  /** A toddler in nappies doesn't hold it in (bladder stays put) but gets grubby faster. */
  private toddlerDecay(dweller: Dweller, mul?: Partial<Needs>): Partial<Needs> | undefined {
    if (dweller.age !== 'toddler') return mul;
    const m: Partial<Needs> = { ...(mul ?? {}) };
    for (const [k, v] of Object.entries(TODDLER_DECAY) as [keyof Needs, number][]) m[k] = (m[k] ?? 1) * v;
    if (dweller.skills.potty < POTTY_TRAINED) m.bladder = 0;
    return m;
  }

  toddlerAsleep(dweller: Dweller): boolean {
    return dweller.queue[0]?.kind === 'passout' || (dweller.queue[0]?.kind === 'interact' && dweller.queue[0].interactionId === 'toddlerNap');
  }

  /** Left hungry or dirty for too long, a toddler is taken away like a baby. True if they were. */
  private toddlerNeglected(dweller: Dweller): boolean {
    if (dweller.needs.hunger > 0 && dweller.needs.hygiene > 0) {
      dweller.neglectedSince = undefined;
      return false;
    }
    dweller.neglectedSince ??= this.state.time;
    if (this.state.time - dweller.neglectedSince <= NEGLECT_LIMIT) return false;
    this.state.dwellers = this.state.dwellers.filter((s) => s !== dweller);
    this.notify(`🚨 사회복지사가 와서 ${josa(dweller.name, '을/를')} 데려갔어요…`, 'bad');
    return true;
  }

  /**
   * A hungry or wet baby (or an awake toddler) cries until someone comes, and the crying wakes sleepers (참고 게임
   * broadcaster_Reaction_LoudNoises_BabyCrying: 75% per sleeper, with the 불쾌한 기상 moodlet).
   * 참고 게임 reaches 10 in line of sight; ours carries through the whole house, since a bassinet can stand
   * anywhere on our one-house lot. Only those old enough to look after a baby wake, a roll every
   * 10 minutes (ours).
   */
  private babyCry(baby: Dweller, dt: number) {
    const w = baby.warned as Record<string, boolean>;
    const awake = baby.age === 'baby' || !this.toddlerAsleep(baby);
    const t = baby.infantTrait;
    const cryAt = t === 'iCalm' ? CRY_AT - 10 : t === 'iIntense' ? CRY_AT + 10 : CRY_AT;
    const wetAt = t === 'iSensitive' ? CRY_AT + 15 : cryAt;
    const crying = awake && (baby.needs.hunger < cryAt || baby.needs.hygiene < wetAt || (t === 'iCautious' && baby.needs.social < CRY_AT));
    const tended = this.state.dwellers.some((s) =>
      s.queue.some((q) => (q.kind === 'interact' && baby.bassinetUid !== undefined && q.objectUid === baby.bassinetUid) || (q.kind === 'social' && q.targetId === baby.id)),
    );
    if (!crying) w.crying = false;
    if (!crying || tended) return;
    if (!w.crying) {
      w.crying = true;
      for (const s of this.household()) if (!s.away && hasTrait(s.traits, 'hatesChildren')) this.addBuff(s, 'cryingBabyHater'); // 참고 게임 buff_Infant_CryingBaby_HatesChildren
      this.notify(`👶 ${josa(baby.name, '이/가')} 울어요! ${baby.needs.hunger < CRY_AT ? '배가 고파요' : '기저귀를 갈아 줘야 해요'}`, 'bad');
    }
    if (this.rng() > dt / CRY_PING) return;
    let carer: Dweller | undefined;
    for (const s of this.household()) {
      if (isYoung(s.age) && s.age !== 'teen') continue;
      if (s.away || !['sleep', 'nap'].includes(this.performing(s)?.inter.id ?? '')) continue;
      if (this.rng() > CRY_WAKE_CHANCE) continue;
      this.finishAction(s);
      this.addBuff(s, 'rudeAwakening');
      this.notify(`😫 ${josa(s.name, '이/가')} 아기 울음소리에 깼어요`, 'info');
      carer ??= s;
    }
    // Ours: the first one up goes to the baby before back to bed (else a tired parent sleeps on
    // and the baby cries all night).
    if (carer) this.tendTo(carer, baby);
  }

  /** Puts seeing to the little one's lowest need at the front of the dweller's queue. */
  private tendTo(dweller: Dweller, kid: Dweller) {
    if (kid.age === 'baby') {
      if (kid.bassinetUid === undefined) return;
      const id = kid.needs.hunger <= kid.needs.hygiene ? 'feedBaby' : 'changeBaby';
      this.push(dweller, { kind: 'interact', objectUid: kid.bassinetUid, interactionId: id, autonomous: true });
    } else this.push(dweller, { kind: 'social', targetId: kid.id, socialId: kid.needs.hunger <= kid.needs.hygiene ? 'feedToddler' : 'changeNappy', autonomous: true });
  }

  private stepBaby(baby: Dweller, dt: number) {
    const bassinet = this.state.objects.find((o) => o.uid === baby.bassinetUid);
    if (bassinet) Object.assign(baby, { x: bassinet.x, y: bassinet.y });
    // Night is for sleeping between feeds (ours: from the small sleep desire, unless it's crying).
    const night = sleepDesire(baby, this.state.time) >= 2 && baby.needs.hunger >= CRY_AT && baby.needs.hygiene >= CRY_AT;
    const asleep = baby.needs.energy < 25 || night || (baby.needs.energy < 95 && baby.queue.length === 0 && (baby.warned as Record<string, boolean>).sleeping);
    (baby.warned as Record<string, boolean>).sleeping = asleep;
    if (baby.infantTrait === 'iSunny' && !asleep && this.rng() < dt / 360) this.addBuff(baby, 'infantSmile');
    for (const k of NEED_KEYS) {
      const rate = (BABY_DECAY[k] ?? 1) * (baby.infantTrait === 'iWiggly' && (k === 'hunger' || k === 'energy') ? 1.2 : 1);
      if (k === 'energy' && asleep) baby.needs.energy = clamp(baby.needs.energy + 0.2 * dt, 0, 100);
      else baby.needs[k] = clamp(baby.needs[k] - NEED_INFO[k].decay * rate * dt, 0, 100);
    }
    this.updateBuffs(baby);
    this.babyCry(baby, dt);
    const neglected = baby.needs.hunger <= 0 || baby.needs.hygiene <= 0;
    if (!neglected) baby.neglectedSince = undefined;
    else {
      baby.neglectedSince ??= this.state.time;
      if (this.state.time - baby.neglectedSince > NEGLECT_LIMIT) {
        this.state.dwellers = this.state.dwellers.filter((s) => s !== baby);
        this.notify(`🚨 사회복지사가 와서 ${josa(baby.name, '을/를')} 데려갔어요…`, 'bad');
        return;
      }
    }
    this.stepAgeUp(baby);
  }

  /**
   * Old age: the dweller leaves an urn where they were, the household grieves (family harder), and
   * control passes to someone else - or the story ends if nobody is left.
   */
  private passAway(dweller: Dweller, cause: DeathCause = 'oldAge') {
    const at = { x: Math.round(dweller.x), y: Math.round(dweller.y) };
    for (const r of this.state.dwellers.filter((s) => s.npc?.role === 'reaper')) this.sendHome(r, '');
    this.state.dwellers = this.state.dwellers.filter((s) => s !== dweller);
    for (const s of this.state.dwellers) {
      if (s.engagedWith === dweller.id) s.engagedWith = null;
      if (s.side?.targetId === dweller.id) s.side = undefined;
      const head = s.queue[0];
      if (head?.kind === 'social' && head.targetId === dweller.id) this.stopRun(s);
      s.queue = s.queue.filter((a) => !(a.kind === 'social' && a.targetId === dweller.id));
      if (s.age === 'baby') continue;
      const rel = this.relationship(s.id, dweller.id);
      if (!s.npc) this.addBuff(s, 'griefFamily');
      else if (rel.stage === 'friend' || rel.stage === 'goodFriend') this.addBuff(s, 'griefFriend');
      else this.addBuff(s, 'griefAcquaintance');
    }
    // Where they fell, or the nearest spot round it that doesn't shut anything off (a corner of
    // the bedroom walled in by an urn had the family unable to reach the computer).
    const spots = [at];
    for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) spots.push({ x: at.x + dx, y: at.y + dy });
    const spot = spots.find((p) => this.canPlace('urn', p.x, p.y, 'down') && this.keepsWayClear('urn', p.x, p.y, 'down'));
    let urnUid: number | undefined;
    if (spot) {
      urnUid = this.state.nextUid++;
      this.state.objects.push({ uid: urnUid, defId: 'urn', x: spot.x, y: spot.y, dir: 'down' });
      this.invalidate();
    }
    const child = this.state.dwellers.find((s) => !s.npc && s.parents?.includes(dweller.id) && s.age !== 'baby' && s.age !== 'toddler');
    if (!dweller.npc && child) this.askThought(child, 'life', 'parentDied');
    if (!dweller.npc) (this.state.dead ??= []).push({ id: dweller.id, name: dweller.name, skin: dweller.skin, hair: dweller.hair, shirt: dweller.shirt, cause, at: this.state.time, urnUid });
    this.notify(cause === 'oldAge' ? `🕊️ ${josa(dweller.name, '이/가')} 노환으로 평화롭게 세상을 떠났어요` : `🕊️ ${josa(dweller.name, '이/가')} 세상을 떠났어요 (${DEATHS[cause].label})`, 'bad');
    const left = this.household().filter((s) => s.age !== 'baby');
    if (this.state.activeDwellerId === dweller.id && left[0]) this.state.activeDwellerId = left[0].id;
    if (left.length === 0) this.notify('가족이 모두 세상을 떠났어요. 새 게임을 시작해 보세요', 'bad');
  }

  /** Babies grow into children after a few days (참고 게임 age span), with a birthday moodlet. */
  private stepAgeUp(dweller: Dweller) {
    const span = LIFESPANS[this.state.lifespan ?? 'normal'];
    const days = dweller.bornAt === undefined ? 0 : (this.state.time - dweller.bornAt) / 1440;
    if (!dweller.age && !dweller.npc && days >= span.adult && !dweller.away) {
      dweller.age = 'elder';
      dweller.bornAt = this.state.time;
      dweller.hair = '#cfcfcf';
      this.addBuff(dweller, 'grewUp');
      this.addBuff(dweller, 'becameElder');
      this.notify(`🎂 ${josa(dweller.name, '이/가')} 노년에 접어들었어요`, 'info', { dwellerId: dweller.id, look: 'moment', slam: { title: '생일 축하해요!', icon: '🎂' } });
      return;
    }
    if (dweller.age === 'elder' && days >= span.elder + (dweller.id % 5) * 0.4 && !dweller.away && !this.performing(dweller)) {
      this.startDying(dweller, 'oldAge');
      return;
    }
    if (dweller.age === 'toddler' && dweller.bornAt !== undefined && days >= span.toddler && !dweller.away) {
      dweller.age = 'child';
      dweller.bornAt = this.state.time;
      dweller.neglectedSince = undefined;
      this.addBuff(dweller, 'grewUp');
      dweller.job = { careerId: 'school', level: 2, performance: 0, lastWorkDay: clockInfo(this.state.time).day, tone: 'normal', task: 0 };
      // The toddler trait goes and a child's trait comes (참고 게임 asks for one at each age-up).
      dweller.traits = dweller.traits.filter((id) => !TRAITS.find((t) => t.id === id)?.ages?.includes('toddler'));
      const childTrait = this.randomTraitFor(dweller, 'child');
      const childAsps = aspirationsFor('child');
      const asp = childAsps[Math.floor(this.rng() * childAsps.length)];
      dweller.aspiration = { id: asp.id, milestone: 0, counters: {}, since: this.state.time };
      this.notify(`🎂 ${josa(dweller.name, '이/가')} 어린이로 자랐어요!${childTrait ? ` 새 특성: ${childTrait.icon} ${childTrait.label}.` : ''} 다음 평일부터 학교에 가요 🏫`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: '생일 축하해요!', icon: '🎂' } });
      return;
    }
    if (dweller.age === 'child' && dweller.bornAt !== undefined && days >= span.child && !dweller.away) {
      // Into the teens and on to high school, keeping the grade.
      dweller.age = 'teen';
      dweller.bornAt = this.state.time;
      // A child who mastered one of their skills keeps a gift for life (참고 게임 child aspiration rewards).
      const gifts = (Object.entries(CHILD_GIFTS) as [SkillKey, string][]).filter(([k, t]) => dweller.skills[k] >= MAX_SKILL && !dweller.traits.includes(t));
      for (const [, t] of gifts) dweller.traits.push(t);
      const giftText = gifts.map(([, t]) => TRAITS.find((x) => x.id === t)!).map((t) => ` ${t.icon} ${t.label}`).join(',');
      const teenTrait = this.randomTraitFor(dweller, 'teen');
      if (dweller.aspiration && ASPIRATION_BY_ID[dweller.aspiration.id]?.child) dweller.aspiration = undefined;
      const grade = dweller.job?.level ?? 2;
      dweller.job = { careerId: 'highSchool', level: grade, performance: 0, lastWorkDay: clockInfo(this.state.time).day, tone: 'normal', task: 0 };
      if (!dweller.likes?.length) Object.assign(dweller, randomPreferences(this.rng, { traits: dweller.traits, age: dweller.age }));
      this.addBuff(dweller, 'grewUp');
      this.notify(`🎂 ${josa(dweller.name, '이/가')} 청소년이 됐어요!${teenTrait ? ` 새 특성: ${teenTrait.icon} ${teenTrait.label}.` : ''} 이제 고등학교에 다녀요 🎓${giftText ? ` 어릴 때 갈고닦은 재능:${giftText}` : ''}`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: '생일 축하해요!', icon: '🎂' } });
      return;
    }
    if (dweller.age === 'teen' && dweller.bornAt !== undefined && days >= span.teen && !dweller.away) {
      dweller.age = undefined;
      dweller.partTime = null;
      dweller.bornAt = this.state.time;
      dweller.job = null;
      // A grown-up gets a personality trait to go with it (참고 게임 asks for one at each age-up).
      const options = TRAITS.filter((t) => !t.reward && traitFitsAge(t, undefined) && !dweller.traits.includes(t.id) && !conflictsWith(dweller.traits, t.id));
      const trait = options[Math.floor(this.rng() * options.length)];
      if (trait && traitsOf(dweller.traits).filter((t) => !t.reward).length < MAX_TRAITS) dweller.traits.push(trait.id);
      if (!dweller.likes?.length) Object.assign(dweller, randomPreferences(this.rng, { traits: dweller.traits, age: dweller.age }));
      this.addBuff(dweller, 'grewUp');
      this.notify(`🎂 ${josa(dweller.name, '이/가')} 어른이 됐어요!${trait ? ` 새 특성: ${trait.icon} ${trait.label}` : ''} 이제 직업을 구할 수 있어요`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: '생일 축하해요!', icon: '🎂' } });
      return;
    }
    if (dweller.age !== 'baby' || dweller.bornAt === undefined) return;
    const stage = BABY_STAGES[this.state.lifespan ?? 'normal'];
    const babyDays = (this.state.time - dweller.bornAt) / 1440;
    if (babyDays < stage.total) {
      // Out of the newborn days: an infant with a temperament of their own (참고 게임 trait_Infant_*).
      if (babyDays >= stage.newborn && !dweller.infant) {
        dweller.infant = true;
        const t = INFANT_TRAITS[Math.floor(this.rng() * INFANT_TRAITS.length)];
        dweller.infantTrait = t.id;
        this.notify(`👶 ${josa(dweller.name, '이/가')} 영아로 자랐어요! 기질: ${t.icon} ${t.label} (${t.desc})`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: '생일 축하해요!', icon: '🎂' } });
      }
      return;
    }
    const bassinet = this.state.objects.find((o) => o.uid === dweller.bassinetUid);
    const spot = bassinet ? this.usableSpots(bassinet, getDef('bassinet').interactions[0])[0] : undefined;
    dweller.age = 'toddler';
    dweller.bornAt = this.state.time;
    dweller.bassinetUid = undefined;
    dweller.shirt = SHIRT_COLORS[Math.floor(this.rng() * SHIRT_COLORS.length)];
    if (spot) Object.assign(dweller, spot);
    this.toddlerBedFor(dweller);
    this.addBuff(dweller, 'grewUp');
    const toddlerTraits = TRAITS.filter((t) => t.ages?.includes('toddler'));
    const tt = toddlerTraits[Math.floor(this.rng() * toddlerTraits.length)];
    dweller.traits = [...dweller.traits.filter((id) => !TRAITS.find((t) => t.id === id)?.ages?.includes('toddler')), tt.id];
    this.notify(`🎂 ${josa(dweller.name, '이/가')} 유아로 자랐어요! 성격: ${tt.icon} ${tt.label}. 밥 먹이고, 걷기·말·용변을 가르쳐 주세요 🧸`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: '생일 축하해요!', icon: '🎂' } });
  }

  // ---------- build mode: wallpaper and floors ----------

  /** Repaints one room's walls or floor with a preset, paid per room. */
  paintRoom(room: Room, part: 'wall' | 'floor', styleId: string): boolean {
    const style = part === 'wall' ? WALL_BY_ID[styleId] : FLOOR_BY_ID[styleId];
    if (!style || room === 'outside') return false;
    const cells = this.paintCells(room, part);
    const layer = this.paint[part];
    if (!cells.length || cells.every((i) => layer[i] === styleId)) return false;
    if (this.state.money < style.price) {
      this.notify(`돈이 부족해요 (§${style.price} 필요)`, 'bad');
      return false;
    }
    this.state.money -= style.price;
    for (const i of cells) layer[i] = styleId;
    this.notify(`🎨 ${this.roomName(room)} ${part === 'wall' ? '벽지' : '바닥'}를 「${style.label}」로 바꿨어요 (−§${style.price})`, 'info');
    this.emit();
    return true;
  }

  /** A room's floor tiles, or the faces of its walls (참고 게임 paints per tile and face; ours a room at a time). */
  private paintCells(room: Room, part: 'wall' | 'floor'): string[] {
    const cells: string[] = [];
    if (room === 'outside') return cells;
    for (let i = 0; i < this.tiles.length; i++) {
      const x = i % MAP_W;
      const y = Math.floor(i / MAP_W);
      if (roomAt(x, y) !== room) continue;
      if (part === 'floor') {
        if (FLOOR_TILES.has(this.tiles[i])) cells.push(String(i));
      } else for (const side of ['n', 'e', 's', 'w'] as Side[]) if (this.walls[edgeKey(x, y, side) ?? '']) cells.push(`${i}${side}`);
    }
    return cells;
  }

  /** The lot's paint with a room repainted, shown before paying for it (참고 게임 previews a paint on hover). */
  paintPreview(room: Room, part: 'wall' | 'floor', styleId: string): Paint {
    const layer = { ...this.paint[part] };
    for (const c of this.paintCells(room, part)) layer[c] = styleId;
    return { ...this.paint, [part]: layer };
  }

  /** Everyone at home who saw the fire may come away afraid of it. */
  private fireFright() {
    for (const s of this.household()) if (!s.away) this.maybeFear(s, 'fire');
  }

  // ---------- build mode: walls, doors, floors ----------

  /** Whether a tile tool (floor, path, taking floor up) can go on a tile; walls go on edges (`edgeProblem`). */
  canBuild(tool: BuildTool, x: number, y: number): boolean {
    // A rented home's walls are the landlord's (참고 게임 For Rent): wallpaper and furniture only.
    if (this.lot.rent) return false;
    const ly = y % MAP_H;
    const upper = floorOf(y) > 0;
    if (x < 1 || ly < 1 || x >= MAP_W - 1 || ly >= MAP_H - 1 || idx(x, y) >= this.tiles.length) return false;
    const t = this.tiles[idx(x, y)];
    const occupied = this.state.objects.some((o) => footprintTiles(getDef(o.defId), o.x, o.y, o.dir).some((p) => p.x === x && p.y === y));
    const someone = this.state.dwellers.some((s) => !s.away && Math.round(s.x) === x && Math.round(s.y) === y);
    const front = x === this.lot.frontDoor.x && y === this.lot.frontDoor.y;
    switch (tool) {
      case 'floor':
        // Upstairs, open air can be floored only where the floor below holds it up.
        return (t === 'grass' || (t === 'void' && upper && this.supported(x, y))) && !occupied;
      case 'path':
        return t === 'grass' && !upper && !occupied;
      case 'remove':
        // Floor or paving taken up back to lawn (open air upstairs), where nothing stands on it.
        return (FLOOR_TILES.has(t) || t === 'path') && !occupied && !someone && !front;
      case 'room':
        return this.roomPlan(x, y, x, y).ok;
      default:
        return false;
    }
  }

  /**
   * Why a wall, door or window can't go on an edge, or be taken off it (참고 게임 build mode: walls on
   * the lines, doors and windows in walls); null if it can.
   */
  edgeProblem(tool: 'wall' | 'door' | 'window' | 'remove', x: number, y: number, side: Side): string | null {
    if (this.lot.rent) return '월세 집은 구조를 바꿀 수 없어요';
    const key = edgeKey(x, y, side);
    if (!key || idx(x, y) >= this.tiles.length) return '부지 가장자리에는 지을 수 없어요';
    const kind = this.walls[key];
    const [a, b] = edgeTiles(key);
    switch (tool) {
      case 'wall': {
        if (kind) return '이미 벽이 있어요';
        const ta = this.tiles[idx(a.x, a.y)];
        const tb = this.tiles[idx(b.x, b.y)];
        if (ta === 'path' && tb === 'path') return '길을 막을 수는 없어요';
        if (!this.edgeSupported(key)) return '아래층이 받쳐 주는 곳에만 지을 수 있어요';
        // Nothing may stand across the line (a sofa two tiles long, a flight of stairs).
        const across = this.state.objects.find((o) => {
          const fp = footprintTiles(getDef(o.defId), o.x, o.y, o.dir);
          return fp.some((p) => p.x === a.x && p.y === a.y) && fp.some((p) => p.x === b.x && p.y === b.y);
        });
        if (across) return `${josa(getDef(across.defId).name, '이/가')} 걸쳐 있어요`;
        return null;
      }
      case 'door':
        if (!kind) return '벽에만 문을 달 수 있어요';
        return kind === 'door' ? '이미 문이 있어요' : null;
      case 'window':
        if (!kind) return '벽에만 창문을 낼 수 있어요';
        return kind === 'door' ? '문에는 창문을 낼 수 없어요' : null;
      case 'remove':
        if (!kind) return '허물 벽이 없어요';
        return this.isFrontDoor(key) ? '정문은 허물 수 없어요' : null;
    }
  }

  /** The front door: the door on the edge of the tile in front of it (`lot.frontDoor`). */
  private isFrontDoor(key: string): boolean {
    if (this.walls[key] !== 'door') return false;
    const f = this.lot.frontDoor;
    return edgeTiles(key).some((p) => p.x === f.x && p.y === f.y);
  }

  /** The wallpaper most of a room's walls have, for a wall newly built in it. */
  private paperOf(room: Room): string | undefined {
    if (room === 'outside') return undefined;
    const count = new Map<string, number>();
    for (const [face, style] of Object.entries(this.paint.wall)) {
      const i = parseInt(face, 10);
      if (roomAt(i % MAP_W, Math.floor(i / MAP_W)) === room) count.set(style, (count.get(style) ?? 0) + 1);
    }
    return [...count].sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  /**
   * Lays floor on tiles, each like the floor beside it on its side of the walls (the most of the
   * neighbours' kind and paint: a tile taken up and laid again matches its room), else oak. Tiles
   * next to floor go first, so a run laid at once follows on from the floor it starts at.
   */
  private layFloor(cells: number[]) {
    const left = new Set(cells);
    while (left.size) {
      let laid = false;
      for (const i of [...left]) {
        const x = i % MAP_W;
        const y = Math.floor(i / MAP_W);
        const votes = new Map<string, number>();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const p = { x: x + dx, y: y + dy };
          if (p.x < 0 || p.x >= MAP_W || p.y < 0 || floorOf(p.y) !== floorOf(y)) continue;
          const j = idx(p.x, p.y);
          if (left.has(j) || !FLOOR_TILES.has(this.tiles[j]) || between(this.walls, { x, y }, p)) continue;
          const k = `${this.tiles[j]}|${this.paint.floor[j] ?? ''}`;
          votes.set(k, (votes.get(k) ?? 0) + 1);
        }
        const best = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!best) continue;
        const [tile, style] = best.split('|');
        this.tiles[i] = tile as Tile;
        if (style) this.paint.floor[i] = style;
        else delete this.paint.floor[i];
        left.delete(i);
        laid = true;
      }
      if (laid) continue;
      // Nothing beside the rest: plain oak.
      for (const i of left) {
        this.tiles[i] = 'wood';
        delete this.paint.floor[i];
      }
      break;
    }
  }

  /** Puts up walls on edges (each face papered like the rest of its room). */
  private raiseWalls(keys: string[]) {
    for (const key of keys) {
      const [a, b] = edgeTiles(key);
      const [fa, fb] = faceKeys(key);
      const pa = this.paperOf(roomAt(a.x, a.y));
      const pb = this.paperOf(roomAt(b.x, b.y));
      if (pa) this.paint.wall[fa] = pa;
      if (pb) this.paint.wall[fb] = pb;
    }
    for (const key of keys) this.walls[key] = 'wall';
  }

  /** Takes walls down, doors and windows in them too, and their paper. */
  private takeDown(keys: string[]) {
    for (const key of keys) {
      delete this.walls[key];
      for (const face of faceKeys(key)) delete this.paint.wall[face];
    }
  }

  /** What dragging the remove tool along a line from one grid corner to another would take down: the walls on it (the front door stays). */
  removePlan(ax: number, ay: number, bx: number, by: number): { ok: boolean; edges: string[]; reason?: string } {
    if (this.lot.rent) return { ok: false, edges: [], reason: '월세 집은 구조를 바꿀 수 없어요' };
    const edges = (lineEdges(ax, ay, bx, by) ?? []).filter((k) => this.walls[k] && !this.isFrontDoor(k));
    return edges.length ? { ok: true, edges } : { ok: false, edges, reason: '허물 벽이 없어요' };
  }

  /** Takes down the walls along a line from one grid corner to another (free). */
  removeWalls(ax: number, ay: number, bx: number, by: number): boolean {
    const plan = this.removePlan(ax, ay, bx, by);
    if (!plan.ok) {
      this.notify(plan.reason ?? '허물 벽이 없어요', 'bad');
      this.emit();
      return false;
    }
    this.takeDown(plan.edges);
    this.layoutChanged();
    return true;
  }

  /** What the remove tool would do on an edge, for its label: what goes, or why not. */
  removeLabel(key: string): string {
    const kind = this.walls[key];
    if (!kind) return '허물 벽이 없어요';
    if (this.isFrontDoor(key)) return '정문은 허물 수 없어요';
    return kind === 'door' ? '🚪 문 떼기 (벽은 남아요)' : kind === 'window' ? '🪟 창문 빼기 (벽은 남아요)' : '🔨 벽 허물기';
  }

  /** After the walls or floors change: rooms, paths and the saved tiles follow. */
  private layoutChanged() {
    this.state.tiles = this.tiles.slice();
    setRooms(this.tiles, this.walls);
    this.invalidate();
    this.emit();
  }

  /**
   * Builds a wall, door or window on one edge, or takes it down, and pays for it (a window clicked
   * again comes out, free). Taking down a door or a window leaves the wall it was in (참고 게임); taking
   * down a wall takes it all.
   */
  buildEdge(tool: 'wall' | 'door' | 'window' | 'remove', x: number, y: number, side: Side): boolean {
    const problem = this.edgeProblem(tool, x, y, side);
    if (problem) {
      this.notify(problem, 'bad');
      this.emit();
      return false;
    }
    const key = edgeKey(x, y, side)!;
    if (tool === 'window' && this.walls[key] === 'window') {
      this.walls[key] = 'wall';
      this.layoutChanged();
      return true;
    }
    const cost = BUILD_COST[tool];
    if (this.state.money < cost) {
      this.notify(`돈이 부족해요 (§${cost} 필요)`, 'bad');
      this.emit();
      return false;
    }
    if (tool === 'remove' && this.walls[key] !== 'wall') this.walls[key] = 'wall';
    else if (tool === 'remove') this.takeDown([key]);
    else if (tool === 'wall') this.raiseWalls([key]);
    else this.walls[key] = tool;
    this.state.money -= cost;
    if (tool === 'door') this.adoptFrontDoor(key);
    this.layoutChanged();
    return true;
  }

  /**
   * On a lot with no front door yet (land built on from scratch), the first door put in an
   * outside wall is the front door: visitors wait outside it and it can't be taken down (ours;
   * 참고 게임 lets the player pick one).
   */
  private adoptFrontDoor(key: string) {
    if (!this.state.lot || Object.keys(this.walls).some((k) => this.isFrontDoor(k))) return;
    const outdoor = edgeTiles(key).find((p) => roomAt(p.x, p.y) === 'outside' && floorOf(p.y) === 0 && ['grass', 'path'].includes(this.tiles[idx(p.x, p.y)]));
    const inside = edgeTiles(key).find((p) => p !== outdoor && FLOOR_TILES.has(this.tiles[idx(p.x, p.y)]));
    if (!outdoor || !inside) return;
    this.state.lot.frontDoor = { ...outdoor };
    this.notify('🚪 이 문을 정문으로 정했어요. 손님이 이 문 앞에서 기다려요', 'info');
  }

  /**
   * What a straight wall from one corner of the grid to another would build (참고 게임's wall tool,
   * dragged along the lines): the edges that have no wall yet, and what they cost, or why not.
   */
  wallPlan(ax: number, ay: number, bx: number, by: number): { ok: boolean; cost: number; edges: string[]; reason?: string } {
    const none = { ok: false, cost: 0, edges: [] as string[] };
    if (this.lot.rent) return { ...none, reason: '월세 집은 구조를 바꿀 수 없어요' };
    const line = lineEdges(ax, ay, bx, by);
    if (!line) return { ...none, reason: '부지 가장자리에는 지을 수 없어요' };
    const edges = line.filter((k) => !this.walls[k]);
    if (!edges.length) return { ...none, reason: line.length ? '이미 벽이 있어요' : '끌어서 벽을 이어요' };
    for (const k of edges) {
      const [a, b] = edgeTiles(k);
      const side = b.x !== a.x ? 'e' : 's';
      const problem = this.edgeProblem('wall', a.x, a.y, side);
      if (problem) return { ...none, reason: problem };
    }
    return { ok: true, cost: edges.length * BUILD_COST.wall, edges };
  }

  /** Builds a straight wall from one grid corner to another and pays for it. */
  buildWalls(ax: number, ay: number, bx: number, by: number): boolean {
    const plan = this.wallPlan(ax, ay, bx, by);
    if (!plan.ok) {
      this.notify(plan.reason ?? '여기에는 벽을 세울 수 없어요', 'bad');
      this.emit();
      return false;
    }
    if (this.state.money < plan.cost) {
      this.notify(`돈이 부족해요 (§${plan.cost} 필요)`, 'bad');
      this.emit();
      return false;
    }
    this.raiseWalls(plan.edges);
    this.state.money -= plan.cost;
    this.layoutChanged();
    return true;
  }

  /**
   * What drawing a room from one corner tile to the other would do (참고 게임's room tool): walls on its
   * outline where there are none, floor inside where there is lawn. At least 2 × 2, a tile in from
   * the lot's edge, with no path inside and nothing standing across its outline.
   */
  roomPlan(ax: number, ay: number, bx: number, by: number): { ok: boolean; cost: number; walls: string[]; floors: number[]; reason?: string } {
    if (this.lot.rent) return { ok: false, cost: 0, walls: [], floors: [], reason: '월세 집은 구조를 바꿀 수 없어요' };
    const x0 = Math.min(ax, bx);
    const x1 = Math.max(ax, bx);
    const y0 = Math.min(ay, by);
    const y1 = Math.max(ay, by);
    const none = { ok: false, cost: 0, walls: [], floors: [] };
    if (x1 - x0 < 1 || y1 - y0 < 1) return { ...none, reason: '방은 2×2칸 이상이에요' };
    if (floorOf(y0) !== floorOf(y1) || idx(x1, y1) >= this.tiles.length) return { ...none, reason: '한 층 안에 지어요' };
    if (x0 < 1 || y0 % MAP_H < 1 || x1 >= MAP_W - 1 || y1 % MAP_H >= MAP_H - 1) return { ...none, reason: '부지 가장자리에는 지을 수 없어요' };
    const upper = floorOf(y0) > 0;
    const floors: number[] = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = idx(x, y);
        const t = this.tiles[i];
        if (t === 'path') return { ...none, reason: '방 안에 길이 있어요' };
        if (upper && t === 'void' && !this.supported(x, y)) return { ...none, reason: '아래층이 받쳐 주는 곳에만 지을 수 있어요' };
        if (t === 'grass' || t === 'void') floors.push(i);
      }
    const outline: Array<[number, number, Side]> = [];
    for (let x = x0; x <= x1; x++) outline.push([x, y0, 'n'], [x, y1, 's']);
    for (let y = y0; y <= y1; y++) outline.push([x0, y, 'w'], [x1, y, 'e']);
    const walls: string[] = [];
    for (const [x, y, side] of outline) {
      const key = edgeKey(x, y, side)!;
      if (this.walls[key]) continue;
      const problem = this.edgeProblem('wall', x, y, side);
      if (problem) return { ...none, reason: problem === '아래층이 받쳐 주는 곳에만 지을 수 있어요' ? problem : `벽 자리: ${problem}` };
      walls.push(key);
    }
    if (!walls.length && !floors.length) return { ...none, reason: '이미 있는 방이에요' };
    return { ok: true, cost: walls.length * BUILD_COST.wall + floors.length * BUILD_COST.floor, walls, floors };
  }

  /** Builds a room from one corner to the other and pays for it. */
  buildRoom(ax: number, ay: number, bx: number, by: number): boolean {
    const plan = this.roomPlan(ax, ay, bx, by);
    if (!plan.ok) {
      this.notify(plan.reason ?? '여기에는 방을 지을 수 없어요', 'bad');
      this.emit();
      return false;
    }
    if (this.state.money < plan.cost) {
      this.notify(`돈이 부족해요 (§${plan.cost} 필요)`, 'bad');
      this.emit();
      return false;
    }
    this.layFloor(plan.floors);
    this.raiseWalls(plan.walls);
    this.state.money -= plan.cost;
    this.notify(`🧱 방을 지었어요 (벽 ${plan.walls.length}칸, 바닥 ${plan.floors.length}칸, −§${plan.cost}). 문을 달아 드나들게 해 주세요`, 'info');
    this.layoutChanged();
    return true;
  }

  /** Builds with a tile tool on one tile and pays for it: floor, path, or floor and path taken up. */
  buildAt(tool: BuildTool, x: number, y: number): boolean {
    if (tool === 'room') return this.buildRoom(x, y, x, y);
    if (!this.canBuild(tool, x, y)) return false;
    const cost = BUILD_COST[tool];
    if (this.state.money < cost) {
      this.notify(`돈이 부족해요 (§${cost} 필요)`, 'bad');
      this.emit();
      return false;
    }
    const i = idx(x, y);
    if (tool === 'floor') this.layFloor([i]);
    else if (tool === 'path') this.tiles[i] = 'path';
    else {
      this.tiles[i] = floorOf(y) > 0 ? 'void' : 'grass';
      delete this.paint.floor[i];
    }
    this.state.money -= cost;
    this.layoutChanged();
    return true;
  }

  // ---------- puddles ----------

  puddleAt(x: number, y: number): boolean {
    return (this.state.puddles ?? []).some((p) => p.x === x && p.y === y);
  }

  addPuddle(x: number, y: number) {
    if (this.puddleAt(x, y) || this.blocked[idx(x, y)]) return;
    (this.state.puddles ??= []).push({ x, y, since: this.state.time });
  }

  // ---------- fire ----------

  fireAt(x: number, y: number): boolean {
    return (this.state.fires ?? []).some((f) => f.x === x && f.y === y);
  }

  private nearestFire(dweller: Dweller, a: { x: number; y: number }): P | undefined {
    if (this.fireAt(a.x, a.y)) return { x: a.x, y: a.y };
    const fires = this.state.fires ?? [];
    return fires.reduce<P | undefined>((best, f) => (!best || Math.hypot(f.x - dweller.x, f.y - dweller.y) < Math.hypot(best.x - dweller.x, best.y - dweller.y) ? f : best), undefined);
  }

  /** Free floor next to a burning tile to fight it from. */
  private fireSpots(f: P): P[] {
    return [
      { x: f.x + 1, y: f.y },
      { x: f.x - 1, y: f.y },
      { x: f.x, y: f.y + 1 },
      { x: f.x, y: f.y - 1 },
    ].filter((p) => this.onFloor(p, f.y) && !this.blocked[idx(p.x, p.y)] && !this.fireAt(p.x, p.y) && !between(this.walls, f, p));
  }

  /** Sets an object alight (a stove left to a novice cook, usually). */
  ignite(obj: PlacedObject, cook?: Dweller) {
    this.fireFright();
    const fresh = !this.state.fires?.length;
    this.state.fires = [...(this.state.fires ?? []), { x: obj.x, y: obj.y }];
    obj.wear = 0;
    if (fresh) {
      this.state.fireStartedAt = this.state.time;
      this.state.fireSpreadAt = this.state.time + FIRST_SPREAD;
      this.state.brigadeAt = undefined;
    }
    if (cook) this.addBuff(cook, 'recentFire');
    this.notify(`🔥 불이야! ${cook ? `${josa(cook.name, '이/가')} 요리하다 ` : ''}${getDef(obj.defId).name}에 불이 붙었어요`, 'bad');
    this.soundAlarm();
  }

  /** A smoke alarm near the flames wakes the house and calls the fire brigade. */
  private soundAlarm() {
    if (this.state.brigadeAt !== undefined) return;
    const fires = this.state.fires ?? [];
    const heard = this.state.objects.some((o) => o.defId === 'smokeAlarm' && fires.some((f) => Math.hypot(f.x - o.x, f.y - o.y) <= ALARM_RADIUS));
    if (!heard) return;
    this.state.brigadeAt = this.state.time + BRIGADE_AFTER;
    this.notify('🚨 화재경보기가 울려요! 소방서에 연락이 갔어요', 'bad');
    for (const s of this.household()) {
      const id = this.performing(s)?.inter.id;
      if (id === 'sleep' || id === 'nap') this.finishAction(s);
    }
  }

  /** Spreads the flames now and then, singeing anyone next to them; the brigade ends it all. */
  private stepFire() {
    const fires = this.state.fires;
    if (!fires?.length) return;
    const now = this.state.time;
    if (this.state.brigadeAt !== undefined && now >= this.state.brigadeAt) {
      this.state.fires = [];
      this.notify('🚒 소방관이 와서 불을 껐어요', 'good');
      this.fireOver();
      return;
    }
    // No smoke alarm: in time a neighbour sees the smoke and calls the brigade (ours; 참고 게임 needs the alarm).
    if (this.state.brigadeAt === undefined && now - (this.state.fireStartedAt ?? now) >= NEIGHBOUR_CALLS_AFTER) {
      this.state.brigadeAt = now + BRIGADE_AFTER;
      this.notify('🚨 연기를 본 이웃이 소방서에 신고했어요', 'bad');
    }
    if (now < (this.state.fireSpreadAt ?? Infinity)) return;
    this.state.fireSpreadAt = now + SPREAD_EVERY;
    if (fires.length >= MAX_FIRES) return;
    const indoor = (x: number, y: number) => ['wood', 'carpet', 'tile'].includes(this.tiles[idx(x, y)]);
    const options = fires
      .flatMap((f) => [
        { x: f.x + 1, y: f.y },
        { x: f.x - 1, y: f.y },
        { x: f.x, y: f.y + 1 },
        { x: f.x, y: f.y - 1 },
      ])
      .filter((p) => p.x >= 0 && p.y >= 0 && p.x < MAP_W && idx(p.x, p.y) < this.tiles.length && indoor(p.x, p.y) && !this.fireAt(p.x, p.y) && !fires.some((f) => between(this.walls, f, p)));
    if (options.length === 0) return;
    const p = options[Math.floor(this.rng() * options.length)];
    fires.push(p);
    for (const o of this.state.objects) if (footprintTiles(getDef(o.defId), o.x, o.y, o.dir).some((t) => t.x === p.x && t.y === p.y)) o.wear = 0;
    for (const s of this.state.dwellers) {
      if (s.away || Math.abs(Math.round(s.x) - p.x) + Math.abs(Math.round(s.y) - p.y) > 1) continue;
      // Caught by the flames twice over (참고 게임 fire_OnFire → death_Fire; ours: singed again while singed).
      if (s.buffs.some((b) => b.id === 'singed') && !s.npc && s.age !== 'baby') this.startDying(s, 'fire');
      else {
        this.addBuff(s, 'singed');
        this.injure(s, 'burn');
      }
    }
    this.notify('🔥 불이 번지고 있어요!', 'bad');
    this.soundAlarm();
  }

  private putOut(x: number, y: number, by: Dweller) {
    this.faceFear(by, 'fire', FEAR_BY_ID.fire.need);
    this.state.fires = (this.state.fires ?? []).filter((f) => f.x !== x || f.y !== y);
    if (this.state.fires.length > 0) return;
    this.notify(`🧯 ${josa(by.name, '이/가')} 불을 다 껐어요`, 'good');
    this.fireOver();
  }

  private fireOver() {
    this.state.fireSpreadAt = undefined;
    this.state.brigadeAt = undefined;
    for (const s of this.state.dwellers) {
      if (!s.buffs.some((b) => b.id === 'fireStressed')) continue;
      s.buffs = s.buffs.filter((b) => b.id !== 'fireStressed');
      this.addBuff(s, 'fireOver');
      s.queue = s.queue.filter((a) => a.kind !== 'extinguish' && a.kind !== 'panic');
      if (s.run && !s.queue.length) s.run = null;
    }
  }

  /**
   * Everyone at home reacts to a fire: guests flee, household members panic once and then (with
   * free will) fight it. Sleepers only notice if a smoke alarm wakes them.
   */
  private respondToFire(dweller: Dweller) {
    if (!this.state.fires?.length || dweller.away) return;
    if (dweller.npc && dweller.npc.role !== 'guest') return;
    const asleep = ['sleep', 'nap'].includes(this.performing(dweller)?.inter.id ?? '');
    if (asleep) return;
    if (!dweller.buffs.some((b) => b.id === 'fireStressed')) this.addBuff(dweller, 'fireStressed');
    if (dweller.npc) return this.sendHome(dweller, `😱 ${josa(dweller.name, '이/가')} 불을 보고 도망갔어요`);
    const head = dweller.queue[0];
    if (head && (head.kind === 'panic' || head.kind === 'extinguish' || head.kind === 'passout' || !head.autonomous)) return;
    // Can't get near the flames: free will carries on until it's time to try again.
    if (dweller.panickedAt === (this.state.fireStartedAt ?? 0) && this.state.time - (this.fireUnreachable.get(dweller.id) ?? -Infinity) < FIRE_RETRY) return;
    if (head) this.stopRun(dweller);
    dweller.queue = dweller.queue.filter((a) => !a.autonomous);
    const started = this.state.fireStartedAt ?? 0;
    if (dweller.panickedAt !== started) {
      dweller.panickedAt = started;
      dweller.queue.unshift({ id: this.state.nextActionId++, kind: 'panic', autonomous: true });
    } else if (this.state.freeWill && this.state.time - (this.fireUnreachable.get(dweller.id) ?? -Infinity) >= FIRE_RETRY) {
      const f = this.nearestFire(dweller, { x: -1, y: -1 });
      if (f) dweller.queue.unshift({ id: this.state.nextActionId++, kind: 'extinguish', x: f.x, y: f.y, autonomous: true });
    }
  }

  // ---------- the neighbourhood ----------

  /** An id no household dweller or neighbour has. */
  private freeId(state: GameState = this.state): number {
    // Colleagues keep their workplace's ids (800s and 2000s, colleagues.ts): new ids stay below those.
    const below = (id: number) => id < 800;
    return Math.max(100, ...state.dwellers.filter((x) => below(x.id)).map((x) => x.id), ...(state.townies ?? []).filter((t) => below(t.id)).map((t) => t.id)) + 1;
  }

  /**
   * Once a day the neighbourhood moves on (neighbourhood.ts): neighbours grow up, take jobs, are
   * promoted, retire; babies are born, the oldest pass away, empty houses get new families.
   */
  private stepNeighbourAges() {
    const { day, hour } = clockInfo(this.state.time);
    // Work lots have no neighbourhood of their own.
    // An emptied street goes on too: new families come to its empty houses. A work lot and land being
    // built on (no one living there) have no street of their own.
    if (hour < 7 || this.state.lastNeighbourhoodDay === day || !this.state.townies || this.state.workplace || !this.state.dwellers.length) return;
    this.state.lastNeighbourhoodDay = day;
    let next = this.freeId();
    const here = new Set(this.state.dwellers.map((x) => x.id));
    const events = ageNeighbourhood(this.state.townies, this.state.time, this.state.lifespan ?? 'normal', this.rng, () => next++, here, (this.state.streetBonds ??= {}));
    giveEveryoneTraits(this.state.townies, this.rng);
    events.push(...stepStreetBonds(this.state.townies, (this.state.streetBonds ??= {}), this.rng));
    this.tellStreetNews(events);
  }

  /** News from the street: a notification, the news list, and the reactions of those who care. */
  private tellStreetNews(events: NeighbourEvent[]) {
    for (const e of events) {
      (this.state.streetNews ??= []).push({ t: this.state.time, text: e.text });
      if (this.state.streetNews.length > 30) this.state.streetNews.shift();
      if ((e.kind === 'friends' || e.kind === 'bestFriends') && e.withId !== undefined) {
        // Friends of either are glad (참고 게임 NeighborhoodStories BecomingFriends: 다다익선!).
        for (const s of this.household()) {
          if (isYoung(s.age) && s.age !== 'teen' && s.age !== 'child') continue;
          if (Math.max(this.relationship(s.id, e.townieId).friend, this.relationship(s.id, e.withId).friend) >= 30) this.addBuff(s, 'neighboursFriends');
        }
      }
      if (e.kind === 'passed') {
        this.state.invites = this.state.invites?.filter((i) => i.townieId !== e.townieId);
        for (const s of this.household()) {
          if (s.age === 'baby' || s.age === 'toddler') continue;
          const f = this.relationship(s.id, e.townieId).friend;
          if (f >= 30) this.addBuff(s, 'griefFriend');
          else if (f >= 10) this.addBuff(s, 'griefAcquaintance');
        }
      }
      this.notify(e.text, 'info', { look: e.kind === 'born' || e.kind === 'promoted' ? 'moment' : undefined });
    }
  }

  /**
   * A neighbour phones to ask whether to get closer to another neighbour (참고 게임
   * dialogDramaNode_NeighborRelPhoneCall_Initial_Friendly, 72-hour cooldown); after a "yes" they
   * call back 12-36 hours later to say thanks (Followup_Friendly_FurtherFriendship). A call left
   * ringing for two hours goes unanswered. The friendly calls only: no matchmaking. The player's
   * answers shape the street only; they are not kept as knowledge of the player.
   */
  private stepAdviceCalls() {
    const call = this.state.neighbourCall;
    const now = this.state.time;
    if (call) {
      if (now >= call.at + CALL_RING) {
        // Unanswered: a "thanks" still means they got on; nobody hears it.
        if (call.phase === 'thanks') this.bondNeighbours(call.fromId, call.aboutId, 15);
        this.state.neighbourCall = undefined;
      }
      return;
    }
    const due = this.state.adviceFollowUp;
    if (due && now >= due.at) {
      this.state.adviceFollowUp = undefined;
      const dweller = this.dweller(due.dwellerId);
      const from = this.state.townies?.find((t) => t.id === due.fromId);
      if (dweller && !dweller.npc && from && this.state.townies?.some((t) => t.id === due.aboutId)) {
        this.state.neighbourCall = { phase: 'thanks', fromId: due.fromId, aboutId: due.aboutId, dwellerId: dweller.id, at: now };
        this.notify(`📱 ${josa(from.name, '이/가')} ${dweller.name}에게 다시 전화했어요`, 'info', { dwellerId: dweller.id });
      }
      return;
    }
    const { minuteOfDay } = clockInfo(now);
    const h = minuteOfDay / 60;
    if (h < 10 || h >= 20 || now < (this.state.lastAdviceCallAt ?? -Infinity) + NEIGHBOUR_CALL_COOLDOWN || this.rng() > 1 / (60 * 10)) return;
    const receivers = this.household().filter((s) => (!isYoung(s.age) || s.age === 'teen') && !s.away && !this.isBusyOnObject(s));
    if (!receivers.length) return;
    const friendOf = (t: Townie) => Math.max(...receivers.map((s) => this.relationship(s.id, t.id).friend));
    const pick = pickAdviceCall(this.state.townies ?? [], (this.state.streetBonds ??= {}), friendOf, (t) => whereabouts(t, now) === 'home', this.rng);
    if (!pick) return;
    const dweller = receivers.reduce((a, b) => (this.relationship(b.id, pick.from.id).friend > this.relationship(a.id, pick.from.id).friend ? b : a));
    this.state.lastAdviceCallAt = now;
    this.state.neighbourCall = { phase: 'ask', fromId: pick.from.id, aboutId: pick.about.id, dwellerId: dweller.id, at: now };
    this.notify(`📱 ${josa(pick.from.name, '이/가')} ${dweller.name}에게 전화했어요`, 'info', { dwellerId: dweller.id });
  }

  private bondNeighbours(aId: number, bId: number, by: number) {
    const a = this.state.townies?.find((t) => t.id === aId);
    const b = this.state.townies?.find((t) => t.id === bId);
    if (a && b) this.tellStreetNews(growBond(a, b, (this.state.streetBonds ??= {}), by));
  }

  /** What the ringing phone says, for the screen. */
  neighbourCallView() {
    const c = this.state.neighbourCall;
    if (!c) return null;
    const from = this.state.townies?.find((t) => t.id === c.fromId);
    const about = this.state.townies?.find((t) => t.id === c.aboutId);
    const dweller = this.dweller(c.dwellerId);
    if (!from || !about || !dweller) return null;
    const text =
      c.phase === 'ask'
        ? `${dweller.name}, 안녕하세요! ${josa(about.name, '와/과')} 좀 더 친하게 지내 보고 싶은데, 어떻게 생각하세요?`
        : `${josa(about.name, '와/과')} 어울려 보라고 해 줘서 고마워요. 덕분에 정말 즐거웠어요!`;
    const choices = c.phase === 'ask' ? ['꼭 그렇게 해 보세요!', '글쎄요, 잘 모르겠어요'] : ['잘됐네요!'];
    return { from, about, dweller, phase: c.phase, text, choices };
  }

  /** The player's answer to a neighbour's call (0 = the first choice). */
  answerNeighbourCall(choice: number) {
    const c = this.state.neighbourCall;
    if (!c) return;
    this.state.neighbourCall = undefined;
    const dweller = this.dweller(c.dwellerId);
    if (c.phase === 'ask') {
      if (choice === 0) {
        this.bondNeighbours(c.fromId, c.aboutId, 20);
        const [lo, hi] = FOLLOW_UP;
        this.state.adviceFollowUp = { fromId: c.fromId, aboutId: c.aboutId, dwellerId: c.dwellerId, at: this.state.time + lo + this.rng() * (hi - lo) };
      }
    } else {
      this.bondNeighbours(c.fromId, c.aboutId, 15);
      if (dweller) {
        this.addBuff(dweller, 'broughtTogether');
        const rel = this.relationship(dweller.id, c.fromId);
        rel.friend = clamp(rel.friend + 5, -100, 100);
      }
    }
    this.emit();
  }

  /** A newborn's or adopted child's gender, half and half, and a name to go with it. */
  private newbornGender(): { gender: 'female' | 'male'; name: string } {
    const gender = this.rng() < 0.5 ? 'female' : 'male';
    const taken = [...this.state.dwellers.map((s) => s.name), ...(this.state.townies ?? []).map((t) => t.name)];
    return { gender, name: pickName(gender, taken, this.rng()) };
  }

  /** The dwellers who live here (not townies on the lot). */
  household(): Dweller[] {
    return this.state.dwellers.filter((s) => !s.npc);
  }

  /** Everyone a household member could count as a friend: the rest of the household and the townies. */
  acquaintanceIds(dweller: Dweller): number[] {
    return [...this.household().map((s) => s.id), ...(this.state.townies ?? []).map((t) => t.id)].filter((id) => id !== dweller.id);
  }

  /**
   * A star (stars.ts) free right now, for a visit or passing by (2026-11-01, at the user's request): off
   * their shift by their job's hours (`whereabouts`), not here already. Anyone may see them go by;
   * they call only on a friend, the people they've come to know at work.
   */
  private starAtLeisure(visiting: boolean): Townie | undefined {
    const here = new Set(this.state.dwellers.map((s) => s.id));
    const known = (t: Townie) => this.household().some((s) => this.relationship(s.id, t.id).friend >= (visiting ? 15 : -100));
    const owned = STARS.map((s) => this.state.townies?.find((t) => t.star === s.id) ?? starTownie(s, s.careers[0], this.state.time));
    const free = owned.filter((t) => !here.has(t.id) && whereabouts(t, this.state.time) === 'home' && known(t));
    return free.length ? free[Math.floor(this.rng() * free.length)] : undefined;
  }

  /** Townies stroll past by day; once or twice a day one rings the doorbell. */
  private stepNeighborhood() {
    const { hour } = clockInfo(this.state.time);
    const npcs = this.state.dwellers.filter((s) => s.npc);
    this.state.nextWalkbyAt ??= this.state.time + 30 + this.rng() * 60;
    if (hour >= 7 && hour < 21 && this.state.time >= this.state.nextWalkbyAt) {
      this.state.nextWalkbyAt = this.state.time + 40 + this.rng() * 80;
      if (npcs.filter((s) => s.npc!.role === 'walkby').length < MAX_WALKERS) {
        const star = this.rng() < STAR_WALKS_BY ? this.starAtLeisure(false) : undefined;
        this.spawnTownie('walkby', star);
        if (star) this.notify(`✨ ${josa(star.name, '이/가')} 집 앞을 지나가요!`, 'info');
      }
    }
    this.stepParty();
    this.stepCalls();
    this.stepNeighbourAges();
    this.stepLotTraits();
    this.stepAdviceCalls();
    for (const inv of [...(this.state.invites ?? [])]) {
      if (this.state.time < inv.at) continue;
      this.state.invites = this.state.invites!.filter((i) => i !== inv);
      const townie = this.state.townies?.find((t) => t.id === inv.townieId);
      const dweller = townie && !this.dweller(townie.id) ? this.spawnTownie('doorbell', townie) : undefined;
      if (dweller) dweller.npc!.invited = true;
    }
    // Once a night, at one o'clock from day 3, a burglar may come (never twice within 참고 게임's 14-day cooldown).
    const { day } = clockInfo(this.state.time);
    if (hour === 1 && this.state.lastBurglarRollDay !== day) {
      this.state.lastBurglarRollDay = day;
      const cooled = this.state.time >= (this.state.burglarCooldownUntil ?? 0);
      if (cooled && day >= BURGLAR_FIRST_DAY && !this.state.dwellers.some((s) => s.npc) && this.rng() < BURGLAR_NIGHTLY_CHANCE) this.spawnBurglar();
    }
    if (this.state.policeAt !== undefined && this.state.time >= this.state.policeAt) {
      this.state.policeAt = undefined;
      const burglar = this.state.dwellers.find((s) => s.npc?.role === 'burglar');
      if (burglar) {
        this.returnStolen();
        for (const s of this.household()) if (!s.away && s.age !== 'baby') this.addBuff(s, 'policeWon');
        this.notify('👮 경찰이 와서 도둑을 붙잡았어요! 훔친 물건도 돌려받았어요', 'good');
        this.removeNpc(burglar);
      }
    }
    if (this.state.pizzaAt !== undefined && this.state.time >= this.state.pizzaAt) {
      this.state.pizzaAt = undefined;
      this.spawnDelivery();
    }
    this.stepServiceCalls();
    this.stepFireplaces(STEP);
    this.stepGhosts(STEP);
    this.state.nextDoorbellAt ??= this.state.time + 120 + this.rng() * 240;
    if (hour >= 10 && hour < 20 && this.state.time >= this.state.nextDoorbellAt) {
      this.state.nextDoorbellAt = this.state.time + 360 + this.rng() * 720;
      if (!npcs.some((s) => s.npc!.role !== 'walkby')) {
        const star = this.rng() < STAR_RINGS ? this.starAtLeisure(true) : undefined;
        this.spawnTownie('doorbell', star);
        if (star) this.notify(`✨ ${josa(star.name, '이/가')} 놀러 왔어요!`, 'good');
      }
    }
  }

  /**
   * Brings a townie onto the street at one end. Doorbell visitors favour people the household
   * already knows (참고 게임 weights its "with relationship" doorbell situation above the neighbour one).
   */
  private spawnTownie(role: 'walkby' | 'doorbell', who?: Townie): Dweller | undefined {
    const here = new Set(this.state.dwellers.map((s) => s.id));
    const expected = new Set((this.state.invites ?? []).map((i) => i.townieId));
    // A colleague (colleagues.ts) lives elsewhere: they only come round to a friend's.
    const known = (t: Townie) => !t.workmate || this.household().some((s) => this.relationship(s.id, t.id).friend >= 15);
    const pool = who ? [who] : (this.state.townies ?? []).filter((t) => !here.has(t.id) && !expected.has(t.id) && t.age !== 'baby' && known(t) && whereabouts(t, this.state.time) === 'home');
    if (pool.length === 0) return;
    const weight = (t: Townie) =>
      role === 'doorbell' ? 1 + this.household().reduce((m, s) => Math.max(m, this.relationship(s.id, t.id).friend), 0) / 25 : 1;
    let roll = this.rng() * pool.reduce((n, t) => n + weight(t), 0);
    const townie = pool.find((t) => (roll -= weight(t)) <= 0) ?? pool[0];
    const fromLeft = this.rng() < 0.5;
    const ends = this.streetEnds;
    const [start, end] = fromLeft ? ends : [ends[1], ends[0]];
    const dweller: Dweller = {
      ...townie,
      aspiration: undefined,
      ...start,
      needs: { hunger: 0, energy: 0, bladder: 0, hygiene: 0, fun: 0, social: 0 },
      // What they're good at comes along (and stays theirs if they move in).
      skills: { ...NO_SKILLS(), ...townie.skills },
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: townie.traits ?? [],
      npc: role === 'walkby' ? { role, until: this.state.time + 60, to: end } : { role, until: -1, to: this.doorstep },
    };
    for (const k of Object.keys(dweller.needs) as Array<keyof Dweller['needs']>) dweller.needs[k] = 55 + this.rng() * 35;
    this.state.dwellers.push(dweller);
    return dweller;
  }

  /**
   * Walkers, visitors at the door and departing guests are driven here; returns false for a guest
   * who is staying, so the usual needs and free will apply.
   */
  private stepNpc(dweller: Dweller, dt: number): boolean {
    const npc = dweller.npc!;
    if (npc.role === 'guest' && !npc.leaving) {
      const low = Object.values(dweller.needs).some((v) => v < GUEST_LEAVE_NEED);
      // A guest heads home at their own bedtime, or once nobody's up to keep them company (ours).
      const hosts = this.household().filter((s) => !s.away && s.age !== 'baby' && s.age !== 'toddler');
      const nobodyUp = !this.state.party && hosts.length > 0 && hosts.every((s) => ['sleep', 'nap'].includes(this.performing(s)?.inter.id ?? ''));
      if (this.state.time >= npc.until || low) this.sendHome(dweller, `👋 ${josa(dweller.name, '이/가')} 집으로 돌아갔어요`);
      else if (nobodyUp) this.sendHome(dweller, `👋 다들 잠들어서 ${josa(dweller.name, '이/가')} 조용히 돌아갔어요`);
      else if (!this.state.party && asleepAt(clockInfo(this.state.time).minuteOfDay)) this.sendHome(dweller, `👋 늦었다며 ${josa(dweller.name, '이/가')} 집으로 돌아갔어요`);
      // Children go home by eight and teens by ten (ours), party or not.
      else if ((dweller.age === 'child' && clockInfo(this.state.time).hour >= 20) || (dweller.age === 'teen' && clockInfo(this.state.time).hour >= 22)) this.sendHome(dweller, `👋 ${josa(dweller.name, '이/가')} 집에 갈 시간이라며 돌아갔어요`);
      else return false;
    }
    if (npc.role === 'burglar' && !npc.leaving) return this.stepBurglar(dweller, dt);
    // Someone stopping to talk to them: they wait for it to finish.
    const approached = this.household().some((s) => {
      const a = s.queue[0];
      return a?.kind === 'social' && a.targetId === dweller.id;
    });
    if (dweller.engagedWith !== null) {
      const p = this.dweller(dweller.engagedWith);
      const pa = p?.queue[0];
      if (!(p && pa?.kind === 'social' && pa.targetId === dweller.id && p.run?.phase === 'performing')) dweller.engagedWith = null;
    }
    if (!npc.leaving && (approached || dweller.engagedWith !== null)) {
      // Stop on a tile centre, not between two, so whoever is coming can stand next to them.
      if (dweller.x !== Math.round(dweller.x) || dweller.y !== Math.round(dweller.y)) {
        dweller.x = Math.round(dweller.x);
        dweller.y = Math.round(dweller.y);
        if (dweller.run) dweller.run = null;
      }
      return true;
    }
    const dest = npc.to;
    const there = dest && Math.round(dweller.x) === dest.x && Math.round(dweller.y) === dest.y && dweller.queue.length === 0;
    if (dest && !there) {
      if (dweller.queue.length === 0) dweller.queue.push({ id: this.state.nextActionId++, kind: 'goto', x: dest.x, y: dest.y, autonomous: false });
      this.runAction(dweller, dt);
      return true;
    }
    if (npc.leaving || npc.role === 'walkby') {
      this.removeNpc(dweller);
      return true;
    }
    if (npc.role === 'burglar') return this.stepBurglar(dweller, dt);
    if (npc.role === 'service') return this.stepService(dweller, dt);
    if (npc.role === 'coworker') return false;
    if (npc.role === 'client') {
      if (this.state.time >= npc.until) this.clientLeaves(dweller, false);
      return true;
    }
    if (npc.role === 'reaper') {
      if (!this.dyingDweller()) this.sendHome(dweller, '');
      return true;
    }
    if (npc.role === 'ghost') {
      if (this.state.time >= npc.until) this.sendHome(dweller, '');
      else if (!dweller.queue.length && this.rng() < 0.01) this.wander(dweller);
      if (dweller.queue.length) this.runAction(dweller, dt);
      return true;
    }
    // The pizza guy hands over the box and goes.
    if (npc.delivery) {
      (this.state.food ??= []).push({ servings: PIZZA_SERVINGS, madeAt: this.state.time, cookId: 0, quality: 0, buff: null });
      this.notify(`🍕 피자가 도착했어요! (${PIZZA_SERVINGS}인분)`, 'good');
      this.sendHome(dweller, '');
      return true;
    }
    // Invited townies let themselves in (참고 게임 invite-over implies the greeting).
    if (npc.invited) {
      dweller.npc = { role: 'guest', until: this.state.party ? Math.max(this.state.party.until, this.state.time + 60) : this.state.time + VISIT_LENGTH };
      this.notify(`🏠 ${josa(dweller.name, '이/가')} 초대받아 놀러 왔어요`, 'good');
      this.guestArrived(dweller);
      return true;
    }
    // At the door: ring once, then wait an hour to be let in.
    if (npc.until < 0) {
      npc.until = this.state.time + DOOR_WAIT;
      this.notify(`🔔 ${josa(dweller.name, '이/가')} 초인종을 눌렀어요 (클릭해서 들어오라고 하기)`, 'info');
    } else if (this.state.time >= npc.until) {
      this.sendHome(dweller, `🚶 ${josa(dweller.name, '이/가')} 기다리다 돌아갔어요`);
    }
    return true;
  }

  /**
   * Phones a townie to come over (참고 게임 phone_Invite_Over): they turn up at the door within the
   * hour and come straight in, unless they're already here or it's the middle of the night.
   */
  inviteOver(dwellerId: number, townieId: number) {
    const dweller = this.dweller(dwellerId);
    const townie = this.state.townies?.find((t) => t.id === townieId);
    if (!dweller || !townie || dweller.npc) return;
    if (this.dweller(townieId) || this.state.invites?.some((i) => i.townieId === townieId)) {
      this.notify(`${josa(townie.name, '은/는')} 이미 여기 있거나 오는 중이에요`, 'info');
    } else if (townie.age === 'baby') {
      this.notify(`👶 ${josa(townie.name, '은/는')} 아직 아기예요`, 'info');
    } else if (awayReason(townie, this.state.time)) {
      this.notify(`📞 ${josa(townie.name, '은/는')} 지금 ${awayReason(townie, this.state.time)}`, 'info');
    } else {
      const [lo, hi] = INVITE_DELAY;
      (this.state.invites ??= []).push({ townieId, at: this.state.time + lo + this.rng() * (hi - lo) });
      this.notify(`📞 ${dweller.name}: ${townie.name}에게 놀러 오라고 했어요`, 'good');
    }
    this.emit();
  }

  /**
   * A wedding: everyone around watches (참고 게임 WatchedWeddingHappy), and a townie spouse moves in
   * if there's room (참고 게임 asks "move in together?" right after).
   */
  private onWedding(dweller: Dweller, t: Dweller) {
    for (const s of this.state.dwellers) {
      if (s === dweller || s === t || s.away || (s.npc && s.npc.role !== 'guest')) continue;
      if (Math.hypot(s.x - dweller.x, s.y - dweller.y) <= 8) this.addBuff(s, 'sawWedding');
    }
    if (t.npc) this.moveIn(t);
  }

  /**
   * Asking a guest to move in (참고 게임 mixer_social_AskMoveIn: base 20% plus relationship). Ours adds
   * 60 for a partner or more, 40 for a good friend, 20 for a friend; a no blocks asking for two days.
   */
  private askMoveIn(dweller: Dweller, t: Dweller) {
    if (!t.npc) return;
    // Family can always come home; anyone else only if neither is taken (married to someone else, a parent …).
    const taken = this.familyTie(dweller, t) ? null : this.tiesBlocked(dweller, t);
    if (taken) return this.notify(`${josa(t.name, '은/는')} 함께 살 수 없어요: ${taken}`, 'info');
    if (this.household().length >= MAX_HOUSEHOLD) return this.notify(`가족이 ${MAX_HOUSEHOLD}명이라 더 들일 수 없어요`, 'info');
    const cooldown = this.state.moveInRefusedUntil?.[t.id] ?? 0;
    if (this.state.time < cooldown) return this.notify(`${josa(t.name, '은/는')} 아직 생각해 보고 있대요`, 'info');
    const rel = this.relationship(dweller.id, t.id);
    const romantic = rel.flags.some((f) => f === 'partner' || f === 'engaged' || f === 'married');
    const chance = Math.min(0.95, 0.2 + (romantic ? 0.6 : 0) + (rel.stage === 'goodFriend' ? 0.4 : rel.stage === 'friend' ? 0.2 : 0));
    if (this.rng() < chance) return this.moveIn(t);
    this.state.moveInRefusedUntil = { ...(this.state.moveInRefusedUntil ?? {}), [t.id]: this.state.time + 2880 };
    this.addBuff(dweller, 'rejected');
    this.notify(`😔 ${josa(t.name, '은/는')} 아직 함께 살 생각이 없대요`, 'info');
  }

  /** A townie joins the household for good. */
  private moveIn(t: Dweller) {
    if (this.household().length >= MAX_HOUSEHOLD) {
      this.notify(`가족이 ${MAX_HOUSEHOLD}명이라 ${josa(t.name, '은/는')} 함께 살 수 없어요`, 'info');
      return;
    }
    t.npc = undefined;
    t.queue = [];
    t.run = null;
    const was = this.state.townies?.find((x) => x.id === t.id);
    // Their life stage goes on from when it began on the street (without, they'd never grow old).
    t.bornAt ??= was?.stageStart ?? this.state.time;
    this.keepJobMovingIn(t, was);
    // What only made them a neighbour or a colleague (spread onto them when they came over).
    const rec = t as unknown as Record<string, unknown>;
    for (const k of ['workmate', 'home', 'role', 'stageStart', 'partnerId', 'married', 'datingSince', 'retiredFrom', 'episodeOf', 'episodeKey', 'goal']) delete rec[k];
    this.state.townies = (this.state.townies ?? []).filter((x) => x.id !== t.id);
    // Whoever they went out with on the street is single again; a newcomer may take an empty house.
    leaveStreet(this.state.townies, t.id);
    let next = this.freeId();
    const newcomer = welcomeNewcomer(this.state.townies, this.state.time, this.state.lifespan ?? 'normal', this.rng, () => next++);
    if (newcomer) this.tellStreetNews([newcomer]);
    this.state.invites = (this.state.invites ?? []).filter((i) => i.townieId !== t.id);
    this.addBuff(t, 'movedIn');
    const beds = this.state.objects.filter((o) => this.isBed(o)).reduce((n, o) => n + (getDef(o.defId).seats ?? 1), 0);
    const short = beds < this.household().length ? ' 침대를 하나 더 마련해 주세요 🛏️' : '';
    this.notify(`🏡 ${josa(t.name, '이/가')} 이제 가족이에요!${short}`, 'good');
  }

  /**
   * A job comes with them (2026-11-01: `spawnTownie` had put `job: null` and the record that held it
   * was dropped, so a colleague moving in stopped working). Performance starts over; the young go to
   * school, which nothing else would see to.
   */
  private keepJobMovingIn(t: Dweller, was: Townie | undefined) {
    const day = clockInfo(this.state.time).day;
    const c = was?.job ? CAREER_BY_ID[was.job.careerId] : undefined;
    if (c && !c.school) {
      const job: Dweller['job'] = { careerId: c.id, level: Math.max(0, was!.job!.level), performance: 0, lastWorkDay: day, tone: 'normal', task: 0, promotedAt: this.state.time };
      if (job.level >= c.levels.length && c.branches?.length) job.branch = chooseBranch(c, t.skills);
      if (c.partTime) t.partTime = job;
      else t.job = job;
      t.jobSince = this.state.time;
    }
    if ((t.age === 'child' || t.age === 'teen') && !t.job) t.job = { careerId: t.age === 'child' ? 'school' : 'highSchool', level: 2, performance: 0, lastWorkDay: day, tone: 'normal', task: 0 };
  }

  /** Why a household member can't move out now, if they can't. */
  moveOutBlocker(dweller: Dweller): string | null {
    if (dweller.npc) return '가족이 아니에요';
    if (dweller.age === 'baby' || dweller.age === 'toddler' || dweller.age === 'child') return '아직 혼자 살 수 없는 나이예요';
    if (dweller.age === 'teen') return '성인이 되면 독립할 수 있어요';
    if (this.state.workplace) return '직장에서는 할 수 없어요';
    if (this.state.party) return '파티 중이에요';
    if (dweller.away) return '외출에서 돌아온 뒤에 할 수 있어요';
    if (dweller.pregnancy) return '임신 중에는 할 수 없어요';
    if (dweller.dying) return '지금은 안 돼요';
    const left = this.household().filter((s) => s !== dweller);
    if (!left.some((s) => s.age !== 'baby' && s.age !== 'toddler' && s.age !== 'child' && s.age !== 'teen')) return '집에 남을 어른이 없어요';
    if (this.spouseOf(dweller) !== null && left.some((s) => s.id === this.spouseOf(dweller))) return '배우자와 같이 살고 있어요';
    if (left.some((s) => s.parents?.includes(dweller.id) && isYoung(s.age) && !left.some((p) => s.parents?.includes(p.id)))) return '돌봐야 할 아이가 있어요';
    return null;
  }

  /**
   * Living apart (2026-11-01, at the user's request): a household member goes to live on their own in
   * an empty house of the street (a new one if none is empty), an ordinary neighbour from then on. The id stays, so everything between
   * them and the family stays too, and they can be called, invited or asked back as anyone else.
   */
  moveOut(dwellerId: number) {
    const dweller = this.dweller(dwellerId);
    if (!dweller || this.moveOutBlocker(dweller)) return;
    this.stopRun(dweller);
    const townie = neighbourFromDweller(dweller, this.state.time, this.state.townies ?? []);
    (this.state.townies ??= []).push(townie);
    this.state.dwellers = this.state.dwellers.filter((s) => s !== dweller);
    for (const s of this.state.dwellers) {
      if (s.engagedWith === dweller.id) s.engagedWith = null;
      if (s.side?.targetId === dweller.id) s.side = undefined;
      const head = s.queue[0];
      if (head?.kind === 'social' && head.targetId === dweller.id) this.stopRun(s);
      s.queue = s.queue.filter((a) => !(a.kind === 'social' && a.targetId === dweller.id));
    }
    const left = this.household().filter((s) => s.age !== 'baby');
    if (this.state.activeDwellerId === dweller.id && left[0]) this.state.activeDwellerId = left[0].id;
    this.invalidate();
    this.notify(`🏠 ${josa(dweller.name, '이/가')} 독립해서 이웃이 됐어요. 전화로 부르거나 다시 함께 살자고 할 수 있어요`, 'good');
    this.emit();
  }

  // ---------- burglars ----------

  private spawnBurglar() {
    // Whoever's awake knows it at once.
    for (const s of this.household()) if (!s.away && s.age !== 'baby' && !['sleep', 'nap', 'toddlerNap'].includes(this.performing(s)?.inter.id ?? '')) this.addBuff(s, 'intruder');
    const [start] = this.streetEnds;
    const dweller: Dweller = {
      id: 990,
      name: '도둑',
      shirt: '#263238',
      skin: '#eac09a',
      hair: '#111111',

      ...start,
      needs: { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90 },
      skills: { ...NO_SKILLS(), fitness: BURGLAR_FITNESS },
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: [],
      npc: { role: 'burglar', until: this.state.time + 600 },
    };
    this.state.dwellers.push(dweller);
    this.state.stolen = [];
    this.state.burglarCooldownUntil = this.state.time + BURGLAR_COOLDOWN;
  }

  /** The most valuable thing left to take, or undefined. */
  private burglarTarget(): PlacedObject | undefined {
    return this.state.objects
      .filter((o) => STEALABLE.has(o.defId) && roomAt(o.x, o.y) !== 'outside')
      .sort((a, b) => getDef(b.defId).price - getDef(a.defId).price)[0];
  }

  /**
   * Walks in, bags the priciest valuables one by one, and slips away. Being seen sets off the
   * 'Burglar!' moodlet; a burglar alarm wakes the house and calls the police.
   */
  private stepBurglar(dweller: Dweller, dt: number): boolean {
    const npc = dweller.npc!;
    if (dweller.engagedWith !== null) return true; // in a fight
    const inside = roomAt(Math.round(dweller.x), Math.round(dweller.y)) !== 'outside';
    if (inside && this.state.policeAt === undefined && this.state.objects.some((o) => o.defId === 'burglarAlarm')) {
      this.state.policeAt = this.state.time + POLICE_AFTER;
      this.notify('🚨 도난 경보기가 울려요! 경찰을 불렀어요', 'bad');
      for (const s of this.household()) {
        const id = this.performing(s)?.inter.id;
        if (id === 'sleep' || id === 'nap') this.finishAction(s);
      }
    }
    if (inside) {
      for (const s of this.household()) {
        if (s.away || s.age === 'baby' || ['sleep', 'nap'].includes(this.performing(s)?.inter.id ?? '')) continue;
        if (roomAt(Math.round(s.x), Math.round(s.y)) !== 'outside' && !s.buffs.some((b) => b.id === 'burglarSpotted')) {
          this.addBuff(s, 'burglarSpotted');
          this.notify(`🦹 ${josa(s.name, '이/가')} 도둑을 발견했어요! (클릭해서 맞서기)`, 'bad');
        }
      }
    }
    const done = (this.state.stolen?.length ?? 0) >= MAX_STOLEN || this.state.time >= npc.until;
    let target = npc.target !== undefined ? this.state.objects.find((o) => o.uid === npc.target) : undefined;
    if (!target && !done) {
      target = this.burglarTarget();
      npc.target = target?.uid;
      npc.stealing = 0;
      if (target) {
        const spot = this.usableSpots(target, getDef(target.defId).interactions[0] ?? { range: 1 } as InteractionDef)[0];
        npc.to = spot;
        dweller.queue = [];
        dweller.run = null;
      }
    }
    if (!target || done) {
      this.burglarLeaves(dweller);
      return true;
    }
    const dest = npc.to;
    if (dest && (Math.round(dweller.x) !== dest.x || Math.round(dweller.y) !== dest.y || dweller.queue.length > 0)) {
      if (dweller.queue.length === 0) dweller.queue.push({ id: this.state.nextActionId++, kind: 'goto', x: dest.x, y: dest.y, autonomous: false });
      this.runAction(dweller, dt);
      return true;
    }
    npc.stealing = (npc.stealing ?? 0) + dt;
    if (npc.stealing >= STEAL_TIME) {
      this.state.objects = this.state.objects.filter((o) => o !== target);
      this.state.stolen = [...(this.state.stolen ?? []), target];
      this.invalidate();
      npc.target = undefined;
    }
    return true;
  }

  private burglarLeaves(dweller: Dweller) {
    const stolen = this.state.stolen ?? [];
    if (stolen.length) {
      const names = stolen.map((o) => getDef(o.defId).name).join(', ');
      this.notify(`🦹 도둑이 ${names}을(를) 훔쳐 갔어요…`, 'bad');
      for (const s of this.household()) if (s.age !== 'baby') {
        this.addBuff(s, 'stolenGoods');
        if (!isYoung(s.age)) this.addBuff(s, 'robbedAngry');
        this.maybeFear(s, 'burgled');
      }
      // Someone who knows the law (3+) files the police report and the insurance claim properly (ours):
      // a tenth of the value back a law level.
      const claimant = this.household().filter((h) => !isYoung(h.age)).sort((a, b) => (b.skills.law ?? 0) - (a.skills.law ?? 0))[0];
      const law = Math.floor(claimant?.skills.law ?? 0);
      if (claimant && law >= CLAIM_LAW) {
        const back = Math.round(stolen.reduce((sum, o) => sum + getDef(o.defId).price, 0) * Math.min(1, law / 10));
        this.state.money += back;
        this.notify(`⚖️ ${josa(claimant.name, '이/가')} 도난 신고와 보험 청구를 꼼꼼히 해서 §${back}을 돌려받았어요`, 'good');
      }
    }
    this.state.stolen = [];
    this.state.policeAt = undefined;
    // Still the burglar on the way out (same look, nothing to chat about), just leaving.
    dweller.npc = { ...dweller.npc!, leaving: true, to: this.streetEnds[0] };
    dweller.queue = [];
    dweller.run = null;
  }

  /** Puts stolen things back where they stood (or anywhere free nearby). */
  private returnStolen() {
    for (const o of this.state.stolen ?? []) {
      if (this.canPlace(o.defId, o.x, o.y, o.dir) && this.keepsWayClear(o.defId, o.x, o.y, o.dir)) this.state.objects.push(o);
      else this.state.money += getDef(o.defId).price; // the insurance pays when its spot is taken (or would shut something off)
    }
    this.state.stolen = [];
    this.invalidate();
  }

  /**
   * A grown-up squares up to the burglar: fitness decides, as in a fight (참고 게임 burglar fight buffs).
   * Each grown-up can try once (2026-10-20, at the user's request); one who loses is knocked out
   * where they stand until the burglar has gone, and the next can try.
   */
  private confrontBurglar(dweller: Dweller, burglar: Dweller) {
    if (!burglar.npc || burglar.npc.leaving) return;
    burglar.npc.fought = [...(burglar.npc.fought ?? []), dweller.id];
    if (this.rng() < fightWinChance(dweller, burglar)) {
      this.returnStolen();
      this.addBuff(dweller, 'heroicEffort');
      for (const s of this.household()) if (s !== dweller && !s.away && s.age !== 'baby') this.addBuff(s, 'returnedGoods');
      this.notify(`🦸 ${josa(dweller.name, '이/가')} 도둑을 쫓아냈어요!`, 'good');
      this.state.policeAt = undefined;
      // Still the burglar (same look, nothing to chat about), running off.
      burglar.npc = { ...burglar.npc, leaving: true, target: undefined, to: this.streetEnds[0] };
      burglar.queue = [];
      burglar.run = null;
    } else {
      this.addBuff(dweller, 'beatenByBurglar');
      this.clearQueue(dweller);
      this.releaseEngagement(dweller);
      this.push(dweller, { kind: 'passout', autonomous: false, knockedOut: true });
      this.injure(dweller, 'beaten');
      const left = this.household().filter((s) => !s.away && !isYoung(s.age) && s.age !== 'baby' && !burglar.npc!.fought!.includes(s.id) && s.queue[0]?.kind !== 'passout');
      this.notify(`🤕 ${josa(dweller.name, '이/가')} 도둑에게 져서 쓰러졌어요. 도둑이 떠나면 정신을 차려요${left.length ? ` (${left.map((s) => s.name).join(', ')}도 맞설 수 있어요)` : ''}`, 'bad', { dwellerId: dweller.id });
    }
  }

  /** Orders a large pizza on the phone (참고 게임 phone_HirePizzaDelivery): paid up front, here within the hour. */
  // ---------- parties ----------

  /** Now and then a friendly neighbour phones for a chat (참고 게임 NPC phone calls; odds ours). */
  private stepCalls() {
    const { day, minuteOfDay } = clockInfo(this.state.time);
    const h = minuteOfDay / 60;
    if (h < 10 || h >= 21 || this.state.lastCallDay === day || this.rng() > 1 / (60 * 8)) return;
    const friends = (this.state.townies ?? []).filter((t) => !this.dweller(t.id) && t.age !== 'baby' && whereabouts(t, this.state.time) === 'home' && this.household().some((s) => this.relationship(s.id, t.id).friend >= 15));
    if (!friends.length) return;
    const t = friends[Math.floor(this.rng() * friends.length)];
    const dweller = this.household()
      .filter((s) => !isYoung(s.age) || s.age === 'teen')
      .filter((s) => !s.away && this.relationship(s.id, t.id).friend >= 15 && (!s.queue[0] || s.queue[0].autonomous) && !this.isBusyOnObject(s))[0];
    if (!dweller) return;
    this.state.lastCallDay = day;
    this.releaseEngagement(dweller);
    this.clearQueue(dweller);
    this.push(dweller, { kind: 'phone', townieId: t.id, autonomous: true });
    this.notify(`📱 ${josa(t.name, '이/가')} ${dweller.name}에게 전화했어요`, 'info');
  }

  /** Calls a neighbour for a chat (참고 게임 phone "Call to Chat"). */
  callNeighbour(dwellerId: number, townieId: number) {
    const dweller = this.dweller(dwellerId);
    const t = this.state.townies?.find((x) => x.id === townieId);
    if (!dweller || !t || dweller.away || dweller.npc) return;
    const away = t.age === 'baby' ? '아직 아기예요' : awayReason(t, this.state.time);
    if (away) {
      this.notify(`📱 ${josa(t.name, '은/는')} 지금 ${away}`, 'info');
      this.emit();
      return;
    }
    this.enqueue(dweller.id, { kind: 'phone', townieId, autonomous: false });
  }

  /** Goes round to a neighbour's for a few hours (참고 게임 travel to a residential lot). */
  visitNeighbour(dwellerId: number, townieId: number) {
    const dweller = this.dweller(dwellerId);
    const t = this.state.townies?.find((x) => x.id === townieId);
    if (!dweller || !t || dweller.npc) return;
    const blocker = this.outingBlocker(dweller, 'park');
    if (blocker && !blocker.startsWith('영업시간')) {
      this.notify(`${dweller.name}: ${blocker}`, 'info');
      this.emit();
      return;
    }
    if (this.dweller(t.id) || t.age === 'baby' || awayReason(t, this.state.time)) {
      this.notify(`🏠 ${josa(t.name, '은/는')} 지금 ${awayReason(t, this.state.time) ?? '집에 없어요'}`, 'info');
      this.emit();
      return;
    }
    this.releaseEngagement(dweller);
    this.clearQueue(dweller);
    dweller.away = { until: this.state.time + OUTING_MINUTES, outing: 'visit', townieId };
    this.notify(`🏠 ${josa(dweller.name, '이/가')} ${t.name}네 집에 놀러 갔어요`, 'info');
    this.emit();
  }

  /** Why a party can't be thrown right now, if it can't. */
  partyBlocker(dweller: Dweller, kind: 'party' | 'birthday' | 'dinner' = 'party'): string | null {
    if (this.state.party) return '이미 파티 중이에요';
    if (dweller.away || dweller.npc || dweller.age === 'baby') return '지금은 열 수 없어요';
    // A child can have a birthday party (thrown for them); other events are for the older ones.
    if (kind === 'birthday' ? dweller.age === 'elder' || (this.state.lifespan ?? 'normal') === 'off' : dweller.age === 'child' || dweller.age === 'toddler') return kind === 'birthday' ? '더 나이 들 수 없어요' : '지금은 열 수 없어요';
    if (kind === 'birthday' && dweller.age === 'toddler') return '지금은 열 수 없어요';
    const h = clockInfo(this.state.time).minuteOfDay / 60;
    if (h < 10 || h >= 22) return '10시~22시에만 열 수 있어요';
    const cost = kind === 'party' ? PARTY_COST : EVENT_COST;
    if (this.state.money < cost) return `§${cost} 필요`;
    if (!(this.state.townies ?? []).some((t) => !this.dweller(t.id) && t.age !== 'baby' && whereabouts(t, this.state.time) === 'home')) return '집에 있는 이웃이 없어요';
    return null;
  }

  /** Throws a house party: pays the event, phones the neighbours, sets the goals (참고 게임 Situation_HouseParty). */
  throwParty(dwellerId: number, kind: 'party' | 'birthday' | 'dinner' = 'party') {
    const dweller = this.dweller(dwellerId);
    if (!dweller) return;
    const blocker = this.partyBlocker(dweller, kind);
    if (blocker) {
      this.notify(`🎉 ${blocker}`, 'info');
      this.emit();
      return;
    }
    this.countActivity(dweller, 'hostParty');
    this.state.money -= kind === 'party' ? PARTY_COST : EVENT_COST;
    this.state.party = kind === 'birthday' ? newBirthday(dweller.id, dweller.id, this.state.time, this.rng) : kind === 'dinner' ? newDinner(dweller.id, this.state.time, this.rng) : newParty(dweller.id, this.state.time, this.rng);
    const free = (this.state.townies ?? []).filter((t) => !this.dweller(t.id) && t.age !== 'baby' && whereabouts(t, this.state.time) === 'home' && !this.state.invites?.some((i) => i.townieId === t.id));
    for (const t of free.slice(0, PARTY_GUESTS)) (this.state.invites ??= []).push({ townieId: t.id, at: this.state.time + 15 + this.rng() * 30 });
    const icon = kind === 'birthday' ? '🎂' : kind === 'dinner' ? '🍽️' : '🎉';
    this.notify(`${icon} ${josa(dweller.name, '이/가')} ${partyName(kind)}를 열었어요! 주요 목표: ${this.state.party.goals[0].label}`, 'good');
    this.emit();
  }

  private partyGoal(kind: PartyGoalKind, n = 1) {
    const party = this.state.party;
    if (!party) return;
    const g = partyProgress(party, kind, n);
    if (g) this.notify(`🎯 파티 목표 달성: ${g.label} (+${GOAL_SCORE})`, 'good');
  }

  /** The two on a date, either way round. */
  onDate(a: Dweller, b: Dweller): boolean {
    const p = this.state.party;
    return p?.kind === 'date' && ((a.id === p.hostId && b.id === p.partnerId) || (b.id === p.hostId && a.id === p.partnerId));
  }

  /** Simultaneous dancing or listening, and the party's end with its medal. */
  private stepParty() {
    const party = this.state.party;
    if (!party) return;
    const doing = (id: string) => this.state.dwellers.filter((s) => !s.away && this.performing(s)?.inter.id === id).length;
    if (party.kind === 'date') {
      const pair = [this.dweller(party.hostId), this.dweller(party.partnerId!)];
      const both = (ids: string[]) => pair.every((s) => s && !s.away && ids.includes(this.performing(s)?.inter.id ?? ''));
      if (both(['dance'])) this.partyGoal('dateDance');
      if (both(['playChess'])) this.partyGoal('dateChess');
      if (both(['watch', 'watchTv'])) this.partyGoal('dateTv');
      if (this.state.time >= party.until) this.endDate(party);
      return;
    }
    if (doing('dance') >= 2) this.partyGoal('dancing');
    if (doing('listen') >= 2) this.partyGoal('listening');
    if (doing('game') + doing('playChess') >= 2) this.partyGoal('gaming');
    if (doing('eat') + doing('eatCake') >= 2) this.partyGoal('eatingTogether');
    if (doing('drinkCoffee') >= 2) this.partyGoal('drinkingTogether');
    const present = this.state.dwellers.filter((s) => !s.away && s.age !== 'baby' && (!s.npc || s.npc.role === 'guest'));
    if (present.filter((s) => s.emotion === 'playful').length >= 2) this.partyGoal('playful');
    if (present.filter((s) => s.emotion === 'happy').length >= 2) this.partyGoal('happyTogether');
    if (present.some((s) => this.convoOf(s).length >= 3)) this.partyGoal('chatTogether');
    const playing = doing('playGuitar') + doing('playPiano') + doing('playViolin');
    if (playing) this.partyGoal('instrument', Math.min(playing, 1) * STEP);
    const celebrant = party.celebrantId !== undefined ? this.dweller(party.celebrantId) : undefined;
    if (celebrant && this.performing(celebrant)?.inter.id === 'playChess' && this.chessOpponent(celebrant, this.performing(celebrant)!.obj)) this.partyGoal('gameWithCelebrant');
    if (this.state.time < party.until) return;
    this.state.party = undefined;
    const medal = partyMedal(party.score, party.kind);
    const host = this.dweller(party.hostId);
    if (medal) {
      if (host) this.addBuff(host, 'greatParty');
      for (const s of this.state.dwellers) if (s !== host && !s.away && s.age !== 'baby') this.addBuff(s, 'partyFun');
      if (host?.aspiration) host.satisfaction = (host.satisfaction ?? 0) + { gold: 300, silver: 150, bronze: 50 }[medal.id];
      this.notify(`🏅 ${partyName(party.kind)}가 끝났어요: ${medal.label}! (점수 ${party.score})`, 'good');
    } else {
      if (host) this.addBuff(host, 'worstParty');
      this.notify(`😞 ${partyName(party.kind)}가 끝났어요… 메달을 받지 못했어요 (점수 ${party.score})`, 'bad');
    }
    for (const s of this.state.dwellers) if (s.npc?.role === 'guest' && !s.npc.leaving) s.npc.until = Math.min(s.npc.until, this.state.time + 30);
  }

  // ---------- dates ----------

  /** Why `dweller` can't ask `target` on a date right now (참고 게임 needs a spark of romance first). */
  /**
   * A neighbour who isn't free for romance or to move in (2026-10-20, at the user's request): married
   * or with someone, or with children (a single parent, a grandparent). Null if free; else why.
   */
  spokenFor(t: { id: number }): string | null {
    const tw = this.state.townies?.find((x) => x.id === t.id);
    if (!tw) return null;
    if (tw.married) return '결혼한 사람이에요';
    if (tw.partnerId !== undefined) return '사귀는 사람이 있어요';
    const kids = (this.state.townies ?? []).some((k) => k.parents?.includes(tw.id));
    if (kids || (tw.role && /엄마|아빠|할머니|할아버지/.test(tw.role))) return '아이가 있는 사람이에요';
    return null;
  }

  /** Who a character is married to, if they're alive (a widow or widower is free again). */
  spouseOf(dweller: { id: number }): number | null {
    const alive = (id: number) => !!this.dweller(id) || !!this.state.townies?.some((t) => t.id === id);
    for (const [key, rel] of Object.entries(this.state.relationships)) {
      if (!rel.flags.includes('married')) continue;
      const [x, y] = key.split('-').map(Number);
      const other = x === dweller.id ? y : y === dweller.id ? x : null;
      if (other !== null && alive(other)) return other;
    }
    return null;
  }

  private genderOf(id: number): Gender | undefined {
    return this.dweller(id)?.gender ?? this.state.townies?.find((t) => t.id === id)?.gender;
  }

  /** Why `a` and `b` can't have romance or a date, if they can't: `tiesBlocked`, or they're of one gender (2026-11-01, at the user's request). */
  romanceBlocked(a: Dweller | { id: number }, b: Dweller | { id: number }): string | null {
    const tied = this.tiesBlocked(a, b);
    if (tied) return tied;
    const [ga, gb] = [this.genderOf(a.id), this.genderOf(b.id)];
    return ga && ga === gb ? '동성과는 로맨스를 할 수 없어요' : null;
  }

  /**
   * Why `a` and `b` can't be together, romance or moving in, if they can't (2026-10-20, at the
   * user's request): family never (parents, children, brothers and sisters); a married character only
   * with their spouse; a neighbour who's married, with someone or has children, with nobody new.
   */
  tiesBlocked(a: Dweller | { id: number }, b: Dweller | { id: number }): string | null {
    // 루미나 (stars.ts) is a friend at most.
    const friendOnly = STARS.find((s) => !s.playable && (STAR_ID[s.id] === a.id || STAR_ID[s.id] === b.id));
    if (friendOnly) return `${josa(friendOnly.name, '와/과')}는 친구로만 지낼 수 있어요`;
    const sa = this.dweller(a.id);
    const sb = this.dweller(b.id);
    if (sa && sb && this.familyTie(sa, sb)) return '가족이에요';
    const takenA = this.spokenFor(a);
    if (takenA) return takenA;
    const takenB = this.spokenFor(b);
    if (takenB) return takenB;
    const spouseA = this.spouseOf(a);
    if (spouseA !== null && spouseA !== b.id) return '결혼한 사람은 배우자와만 할 수 있어요';
    const spouseB = this.spouseOf(b);
    if (spouseB !== null && spouseB !== a.id) return '결혼한 사람이에요';
    return null;
  }

  dateBlocker(dweller: Dweller, targetId: number): string | null {
    if (this.state.party) return this.state.party.kind === 'date' ? '이미 데이트 중이에요' : '파티 중이에요';
    if (dweller.away || dweller.npc || isYoung(dweller.age)) return '지금은 안 돼요';
    const target = this.dweller(targetId);
    const townie = this.state.townies?.find((t) => t.id === targetId);
    if (!target && !townie) return '누군지 모르겠어요';
    if (!target && townie && awayReason(townie, this.state.time)) return `지금 ${awayReason(townie, this.state.time)}`;
    if (target && (target.away || isYoung(target.age) || (target.npc && target.npc.role !== 'guest'))) return '지금은 안 돼요';
    if (target && this.familyTie(dweller, target)) return '가족이에요';
    const taken = this.romanceBlocked(dweller, { id: targetId });
    if (taken) return taken;
    const rel = this.relationship(dweller.id, targetId);
    if (rel.romance < 10 && !rel.flags.includes('partner') && !rel.flags.includes('married')) return '로맨스 10 이상 필요';
    const h = clockInfo(this.state.time).minuteOfDay / 60;
    if (h < 10 || h >= 22) return '10시~22시에만 할 수 있어요';
    return null;
  }

  /** Asks someone on a date: a neighbour comes over, a housemate just starts (참고 게임 situation_Date). */
  askOnDate(dwellerId: number, targetId: number) {
    const dweller = this.dweller(dwellerId);
    if (!dweller) return;
    const blocker = this.dateBlocker(dweller, targetId);
    const name = this.dweller(targetId)?.name ?? this.state.townies?.find((t) => t.id === targetId)?.name ?? '';
    if (blocker) {
      this.notify(`💕 ${blocker}`, 'info');
      this.emit();
      return;
    }
    this.state.party = newDate(dweller.id, targetId, this.state.time, this.rng);
    this.addBuff(dweller, 'dateGlow');
    const dateOf = this.dweller(targetId);
    if (dateOf) this.addBuff(dateOf, 'dateGlow');
    if (!this.dweller(targetId) && !this.state.invites?.some((i) => i.townieId === targetId)) {
      (this.state.invites ??= []).push({ townieId: targetId, at: this.state.time + 15 + this.rng() * 30 });
    } else {
      const guest = this.dweller(targetId);
      if (guest?.npc) guest.npc.until = Math.max(guest.npc.until, this.state.party.until);
    }
    this.notify(`💕 ${josa(dweller.name, '이/가')} ${name}에게 데이트를 신청했어요!`, 'good');
    this.emit();
  }

  private endDate(date: Party) {
    this.state.party = undefined;
    const medal = partyMedal(date.score, 'date');
    const host = this.dweller(date.hostId);
    const partner = this.dweller(date.partnerId!);
    const name = partner?.name ?? this.state.townies?.find((t) => t.id === date.partnerId)?.name ?? '';
    if (medal) {
      for (const s of [host, partner]) if (s && !s.away) this.addBuff(s, 'specialBond');
      if (host && medal.id !== 'bronze') {
        const rel = this.relationship(host.id, date.partnerId!);
        rel.romance = clamp(rel.romance + trackDelta('romance', rel.romance, medal.id === 'gold' ? 'L' : 'M'), -100, 100);
      }
      this.notify(`💞 ${josa(name, '와/과')}의 데이트가 끝났어요: ${medal.label}! (점수 ${date.score})`, 'good');
    } else {
      if (host) this.addBuff(host, 'dateToForget');
      this.notify(`💔 ${josa(name, '와/과')}의 데이트가 끝났어요… 메달을 받지 못했어요 (점수 ${date.score})`, 'bad');
    }
    if (partner?.npc?.role === 'guest' && !partner.npc.leaving) partner.npc.until = Math.min(partner.npc.until, this.state.time + 30);
  }

  /**
   * Hurt badly (2026-11-01, at the user's request: till now only a mood): they go on with their day, not
   * laid out for long, but life is hard until a hospital or pharmacy sees to it (`injuryBlocker`, `walk`, `checkWork`).
   */
  private injure(dweller: Dweller, kind: NonNullable<Dweller['injury']>['kind']) {
    if (dweller.npc || dweller.age === 'baby' || dweller.injury) return;
    dweller.injury = { kind, since: this.state.time };
    this.addBuff(dweller, 'injured');
    this.notify(`🩹 ${josa(dweller.name, '이/가')} 다쳤어요. 외출 → 🏥 병원이나 💊 약국에서 치료받기 전에는 일하러 갈 수 없고 몸이 무거워요`, 'bad', { dwellerId: dweller.id });
  }

  private cure(dweller: Dweller) {
    const was = !!dweller.injury || dweller.buffs.some((b) => b.id === 'sick');
    dweller.injury = undefined;
    dweller.buffs = dweller.buffs.filter((b) => b.id !== 'injured' && b.id !== 'sick' && !INJURIES.has(b.id) && b.id !== 'shockWarning');
    if (was) this.notify(`🏥 ${josa(dweller.name, '이/가')} 치료를 받고 다 나았어요`, 'good', { dwellerId: dweller.id });
  }

  /** Why someone hurt can't do this, if so: what takes a sound body. */
  injuryBlocker(dweller: Dweller, inter: InteractionDef): string | null {
    if (!dweller.injury) return null;
    return inter.special === 'repair' || (inter.skill && HEAVY_SKILLS.has(inter.skill.key)) ? '다쳐서 할 수 없어요. 병원이나 약국에 먼저 가요' : null;
  }

  /** Why a dweller can't head out to a venue right now, if they can't. */
  outingBlocker(dweller: Dweller, venueId: string): string | null {
    const v = VENUE_BY_ID[venueId];
    if (!v) return '알 수 없는 곳이에요';
    if (dweller.away) return '외출 중이에요';
    if (dweller.age === 'baby') return '아기는 못 가요';
    if (dweller.injury && !v.care) return '다쳐서 병원이나 약국부터 가야 해요';
    if (v.care) {
      if (!dweller.injury && !dweller.buffs.some((b) => b.id === 'sick')) return '아픈 데가 없어요';
      // Going to be seen to comes before the bill and before a shift: nobody stays hurt for want of money.
      return venueOpen(v, clockInfo(this.state.time).minuteOfDay) ? null : `영업시간이 아니에요 (${v.hours[0]}시~${v.hours[1] % 24}시)`;
    }
    if (v.adultsOnly && (dweller.age === 'child' || dweller.age === 'teen')) return '어른만 갈 수 있어요';
    if (v.minSkill && Math.floor(dweller.skills[v.minSkill[0]] ?? 0) < v.minSkill[1]) return `${SKILL_INFO[v.minSkill[0]].label} ${v.minSkill[1]}레벨 필요`;
    if (!venueOpen(v, clockInfo(this.state.time).minuteOfDay)) return `영업시간이 아니에요 (${v.hours[0]}시~${v.hours[1] % 24}시)`;
    if (v.cost && this.state.money < v.cost) return `§${v.cost} 필요`;
    // Not when a shift or school day would start (or is under way) before they're back.
    const { weekday, minuteOfDay, day } = clockInfo(this.state.time);
    for (const slot of ['job', 'partTime'] as const) {
      const job = this.jobIn(dweller, slot);
      if (!job || job.lastWorkDay === day) continue;
      const lvl = levelOf(job);
      if (!(lvl.days ?? WEEKDAYS).includes(weekday)) continue;
      if (minuteOfDay + OUTING_MINUTES > lvl.start - 60 && minuteOfDay < lvl.end - 60) return CAREER_BY_ID[job.careerId].school ? '곧 학교에 가야 해요' : '곧 출근해야 해요';
    }
    return null;
  }

  /** Off to a community lot for a few hours (참고 게임 travel to a venue). */
  /**
   * Goes out; `look` is what a salon or clothes shop visit changes, put on when they come home, and
   * `spend` what the clothes bought there cost (paid on the way).
   */
  goOut(dwellerId: number, venueId: string, look?: LookPatch, spend = 0) {
    const dweller = this.dweller(dwellerId);
    if (!dweller || dweller.npc) return;
    const v = VENUE_BY_ID[venueId];
    const blocker = this.outingBlocker(dweller, venueId) ?? (spend > this.state.money ? `§${spend} 필요` : null);
    if (blocker || !v) {
      this.notify(`${dweller.name}: ${blocker}`, 'info');
      this.emit();
      return;
    }
    this.state.money -= (v.care ? Math.min(v.cost ?? 0, Math.max(0, this.state.money)) : v.cost ?? 0) + spend;
    this.releaseEngagement(dweller);
    this.clearQueue(dweller);
    dweller.away = { until: this.state.time + (v.care ? CARE_MINUTES : OUTING_MINUTES), outing: v.id, ...(look ? { restyle: look } : {}) };
    this.notify(`${v.icon} ${josa(dweller.name, '이/가')} ${v.name}에 갔어요`, 'info');
    this.emit();
  }

  private outingTick(dweller: Dweller, dt: number) {
    if (dweller.away?.outing === 'visit') {
      // An afternoon at a friend's: company and fun, and the friendship grows (ours).
      this.applyEffects(dweller, { social: 0.8, fun: 0.5 }, dt);
      if (this.rng() < dt / 45) {
        const rel = this.relationship(dweller.id, dweller.away.townieId!);
        rel.friend = clamp(rel.friend + trackDelta('friend', rel.friend, 'S'), -100, 100);
      }
      return;
    }
    const v = VENUE_BY_ID[dweller.away!.outing!];
    if (!v) return;
    this.applyEffects(dweller, v.effects, dt);
    if (v.skill) this.gainSkill(dweller, v.skill.key, v.skill.rate * dt, v.skill.rate === LEARN.chore);
    // The park's rock spawners turn up crystals and metals (참고 게임 collectible spawners; odds ours).
    if (v.id === 'park' && this.rng() < dt / 120) this.findCollectible(dweller, this.rng() < 0.5 ? 'crystals' : 'metals');
    // Townies about: now and then a chat that brings one of them a little closer.
    const townies = this.state.townies ?? [];
    if (v.mingle && townies.length && this.rng() < dt / v.mingle) {
      const t = townies[Math.floor(this.rng() * townies.length)];
      const rel = this.relationship(dweller.id, t.id);
      rel.friend = clamp(rel.friend + trackDelta('friend', rel.friend, 'S'), -100, 100);
    }
  }

  /** Off into space for a couple of hours (참고 게임 rocketShip_Explore). */
  private launchRocket(dweller: Dweller, obj: PlacedObject) {
    this.releaseEngagement(dweller);
    this.clearQueue(dweller);
    dweller.away = { until: this.state.time + FLIGHT_MINUTES, outing: 'space', rocketUid: obj.uid };
    if (dweller.aspiration) {
      const counters = (dweller.aspiration.counters ??= {});
      counters.rocketLaunch = (counters.rocketLaunch ?? 0) + 1;
    }
    this.notify(`🚀 ${josa(dweller.name, '이/가')} 우주로 날아갔어요!`, 'info');
  }

  private returnFromSpace(dweller: Dweller, rocketUid?: number) {
    const adv = rollAdventure(dweller.skills.rocketScience, this.rng);
    const rocket = this.state.objects.find((o) => o.uid === rocketUid);
    if (!adv) {
      this.addBuff(dweller, 'escapedCrash');
      if (rocket) rocket.rocket = 50;
      this.notify(`💥 ${josa(dweller.name, '이/가')} 불시착했어요! 로켓을 다시 손봐야 해요`, 'bad');
      return;
    }
    this.addBuff(dweller, adv.buff);
    this.state.money += adv.money;
    // 참고 게임 rocketShip_Explore loot: space rocks often, now and then an alien in a jar.
    if (this.rng() < 0.6) this.findCollectible(dweller, 'spaceRocks');
    if (this.rng() < 0.15) this.findCollectible(dweller, 'aliens');
    const pay = adv.money > 0 ? ` (+§${adv.money})` : adv.money < 0 ? ` (−§${-adv.money})` : '';
    this.notify(`🚀 ${josa(dweller.name, '이/가')} ${adv.text}${pay}`, adv.money < 0 || adv.id === 'alien' ? 'info' : 'good');
  }

  private returnFromOuting(dweller: Dweller) {
    if (dweller.away?.outing === 'visit') {
      const t = this.state.townies?.find((x) => x.id === dweller.away!.townieId);
      dweller.away = null;
      dweller.x = this.exitTile.x;
      dweller.y = this.exitTile.y;
      this.addBuff(dweller, 'goodTimes');
      this.notify(`🏠 ${josa(dweller.name, '이/가')} ${t?.name ?? '이웃'}네 집에서 돌아왔어요`, 'info');
      return;
    }
    if (dweller.away?.outing === 'space') {
      const uid = dweller.away.rocketUid;
      dweller.away = null;
      dweller.x = this.exitTile.x;
      dweller.y = this.exitTile.y;
      this.returnFromSpace(dweller, uid);
      return;
    }
    const v = VENUE_BY_ID[dweller.away!.outing!];
    const look = dweller.away!.restyle;
    dweller.away = null;
    dweller.x = this.exitTile.x;
    dweller.y = this.exitTile.y;
    if (look) this.restyle(dweller.id, look);
    if (!v) return;
    this.addBuff(dweller, v.buff);
    if (v.care) this.cure(dweller);
    this.wantEvent(dweller, { kind: 'interaction', id: '__outing' });
    if (v.care) this.wantEvent(dweller, { kind: 'interaction', id: '__cured' });
    // An outing counts towards aspirations; volunteering or a gig is a try at work ("세상 둘러보기").
    this.countActivity(dweller, `outing_${v.id}`);
    if (v.id === 'volunteer' || v.earn) this.countActivity(dweller, 'triedWork');
    this.checkAspiration(dweller);
    const pay = v.earn ? v.earn.base + v.earn.per * Math.floor(dweller.skills[v.earn.skill] ?? 0) : 0;
    this.state.money += pay;
    this.notify(`🏠 ${josa(dweller.name, '이/가')} ${v.name}에서 돌아왔어요${pay ? ` (+§${pay})` : ''}`, pay ? 'good' : 'info');
  }

  orderPizza(dwellerId: number) {
    const dweller = this.dweller(dwellerId);
    if (!dweller || dweller.npc) return;
    if (this.state.pizzaAt !== undefined || this.state.dwellers.some((s) => s.npc?.delivery)) {
      this.notify('피자가 이미 오고 있어요', 'info');
    } else if (this.state.money < PIZZA_PRICE) {
      this.notify(`돈이 부족해요 (§${PIZZA_PRICE} 필요)`, 'bad');
    } else {
      this.state.money -= PIZZA_PRICE;
      const [lo, hi] = PIZZA_DELAY;
      this.state.pizzaAt = this.state.time + lo + this.rng() * (hi - lo);
      this.notify(`📞 ${dweller.name}: 피자를 주문했어요 (−§${PIZZA_PRICE})`, 'info');
    }
    this.emit();
  }

  // ---------- hired help (참고 게임 ServiceNpcHireable) ----------

  /** Why this service can't be hired right now, if it can't. */
  serviceBlocker(kind: ServiceKind): string | null {
    const def = SERVICES[kind];
    if (this.state.serviceCalls?.some((c) => c.kind === kind) || this.state.dwellers.some((s) => s.npc?.service === kind && !s.npc.leaving)) return '이미 오는 중이거나 와 있어요';
    if (this.state.money < def.upFront) return `§${def.upFront} 필요`;
    if (kind === 'nanny' && !this.state.dwellers.some((s) => s.age === 'baby' || s.age === 'toddler')) return '돌볼 아기나 유아가 없어요';
    if (kind === 'repair' && !this.state.objects.some((o) => this.isBroken(o))) return '고장 난 물건이 없어요';
    return null;
  }

  /** Phones for help: paid up front, they come at the next opening (참고 게임 phone_HireMaid / _HireRepair / _HireNanny). */
  hireService(dwellerId: number, kind: ServiceKind) {
    const dweller = this.dweller(dwellerId);
    const def = SERVICES[kind];
    const blocked = this.serviceBlocker(kind);
    if (!dweller || dweller.npc) return;
    if (blocked) {
      this.notify(`${def.icon} ${def.name}: ${blocked}`, 'info');
      this.emit();
      return;
    }
    this.state.money -= def.upFront;
    const [lo, hi] = SERVICE_DELAY;
    const at = nextOpening(def, this.state.time + lo + this.rng() * (hi - lo));
    (this.state.serviceCalls ??= []).push({ kind, at });
    const when = at - this.state.time > 120 ? ` (${clockInfo(at).hour}시에 와요)` : '';
    this.notify(`📞 ${dweller.name}: ${def.name}를 불렀어요 (선불 §${def.upFront}, 시간당 §${def.hourly})${when}`, 'info');
    this.emit();
  }

  /** A maid every morning (참고 게임 recurring service), on or off. */
  setMaidDaily(on: boolean) {
    this.state.maidDaily = on;
    this.notify(on ? '🧹 가정부가 매일 오도록 했어요' : '🧹 가정부 정기 방문을 그만뒀어요', 'info');
    this.emit();
  }

  /** Sends the help home now, paying for the hours worked. */
  dismissService(uid: number) {
    const s = this.dweller(uid);
    if (s?.npc?.role === 'service' && !s.npc.leaving) this.finishService(s, '보냈어요');
  }

  private stepServiceCalls() {
    const now = this.state.time;
    const { day, minuteOfDay } = clockInfo(now);
    // The daily maid books herself each morning when the house needs it.
    if (this.state.maidDaily && this.state.lastMaidDay !== day && minuteOfDay >= SERVICES.maid.from * 60 && minuteOfDay < (SERVICES.maid.from + 1) * 60) {
      this.state.lastMaidDay = day;
      if (this.maidWork().length && !this.serviceBlocker('maid')) {
        this.state.money -= SERVICES.maid.upFront;
        (this.state.serviceCalls ??= []).push({ kind: 'maid', at: now + 10 });
      }
    }
    this.autoBabysitter();
    const due = this.state.serviceCalls?.filter((c) => c.at <= now) ?? [];
    if (!due.length) return;
    this.state.serviceCalls = this.state.serviceCalls!.filter((c) => c.at > now);
    for (const c of due) this.spawnService(c.kind, c.auto);
  }

  /**
   * 참고 게임 sends a babysitter when the last teen or grown-up leaves a baby or toddler at home (work,
   * school, an outing), billed by the hour, and she goes once one of them is back.
   */
  private autoBabysitter() {
    if (this.state.workplace) return;
    const home = this.household().filter((s) => !s.away);
    const little = home.some((s) => s.age === 'baby' || s.age === 'toddler');
    const minded = home.some((s) => !isYoung(s.age) || s.age === 'teen');
    const sitter = this.state.dwellers.find((s) => s.npc?.service === 'nanny' && !s.npc.leaving);
    if (sitter?.npc?.auto && minded && !sitter.queue.length) {
      this.finishService(sitter, '가족이 돌아왔어요');
      return;
    }
    if (!little || minded || sitter || this.state.serviceCalls?.some((c) => c.kind === 'nanny')) return;
    const def = SERVICES.nanny;
    this.state.money -= Math.min(def.upFront, Math.max(0, this.state.money));
    (this.state.serviceCalls ??= []).push({ kind: 'nanny', at: this.state.time + 10, auto: true });
    this.notify(`🍼 집에 아기를 돌볼 사람이 없어서 ${def.name}가 와요 (선불 §${def.upFront}, 시간당 §${def.hourly})`, 'info');
  }

  private spawnService(kind: ServiceKind, auto?: boolean) {
    const def = SERVICES[kind];
    const id = 950 + Object.keys(SERVICES).indexOf(kind);
    if (this.dweller(id)) return;
    const [start] = this.streetEnds;
    const skills = NO_SKILLS();
    skills.handiness = 10; // a professional: quick and never shocked
    this.state.dwellers.push({
      id,
      name: def.name,
      shirt: def.shirt,
      skin: '#eac09a',
      hair: '#3b2a1a',
      ...start,
      needs: { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90 },
      skills,
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: [],
      npc: { role: 'service', service: kind, until: this.state.time + def.maxStay, to: this.doorstep, auto },
    });
    this.notify(`${def.icon} ${def.name}가 도착했어요`, 'info');
  }

  /** Dirty dishes, grimy fixtures and puddles: the maid's list (참고 게임 maid_situation). */
  private maidWork(): NewAction[] {
    const work: NewAction[] = [];
    for (const o of this.state.objects) {
      for (const i of getDef(o.defId).interactions) {
        if (i.special === 'washDishes' && (this.state.dishes ?? 0) > 0) work.push({ kind: 'interact', objectUid: o.uid, interactionId: i.id, autonomous: true });
        if (i.special === 'clean' && this.isDirty(o)) work.push({ kind: 'interact', objectUid: o.uid, interactionId: i.id, autonomous: true });
      }
    }
    for (const p of this.state.puddles ?? []) work.push({ kind: 'mop', x: p.x, y: p.y, autonomous: true });
    return work;
  }

  /** Broken things: the repair technician's list. */
  private repairWork(): NewAction[] {
    return this.state.objects.flatMap((o) =>
      getDef(o.defId).interactions.filter((i) => i.special === 'repair' && this.isBroken(o)).map((i): NewAction => ({ kind: 'interact', objectUid: o.uid, interactionId: i.id, autonomous: true })),
    );
  }

  /** What the babysitter does next: the neediest baby or toddler first (참고 게임 nanny_situation roles). */
  private nannyWork(): NewAction | null {
    let best: { score: number; action: NewAction } | null = null;
    const consider = (score: number, action: NewAction) => {
      if (!best || score > best.score) best = { score, action };
    };
    for (const k of this.state.dwellers) {
      if (k.away) continue;
      if (k.age === 'baby') {
        const crib = this.state.objects.find((o) => o.uid === k.bassinetUid);
        if (!crib) continue;
        const care: Array<[string, number]> = [['feedBaby', k.needs.hunger], ['changeBaby', k.needs.hygiene], ['cuddleBaby', k.needs.social]];
        for (const [id, v] of care) if (v < 70) consider(100 - v, { kind: 'interact', objectUid: crib.uid, interactionId: id, autonomous: true });
      }
      if (k.age === 'toddler' && !this.toddlerAsleep(k)) {
        const care: Array<[string, number]> = [['feedToddler', k.needs.hunger], ['changeNappy', k.needs.hygiene], ['playWithToddler', k.needs.fun]];
        for (const [id, v] of care) if (v < 60) consider(100 - v, { kind: 'social', targetId: k.id, socialId: id, autonomous: true });
      }
    }
    return (best as { score: number; action: NewAction } | null)?.action ?? null;
  }

  /** The help at work: one job after another, then home with the bill (참고 게임 leaves once there's no more work). */
  private stepService(dweller: Dweller, dt: number): boolean {
    const npc = dweller.npc!;
    const def = SERVICES[npc.service!];
    npc.arrived ??= this.state.time;
    if (dweller.queue.length) {
      this.runAction(dweller, dt);
      return true;
    }
    if (this.state.time >= npc.until) return this.finishService(dweller, '정해진 시간이 끝났어요');
    const next = npc.service === 'maid' ? this.maidWork()[0] : npc.service === 'repair' ? this.repairWork()[0] : this.nannyWork();
    if (next) {
      this.push(dweller, next);
      return true;
    }
    // The babysitter waits for the next thing; the others are done (참고 게임 StaticCommodity_ServiceNpcNoMoreWork).
    if (npc.service === 'nanny') return true;
    return this.finishService(dweller, def.kind === 'repair' ? '다 고쳤어요' : '청소를 마쳤어요');
  }

  /** Off home, paying for the hours (참고 게임 bills by the hour on top of the up-front fee). */
  private finishService(dweller: Dweller, why: string): true {
    const def = SERVICES[dweller.npc!.service!];
    const bill = serviceBill(def, this.state.time - (dweller.npc!.arrived ?? this.state.time));
    const paid = Math.min(bill, Math.max(0, this.state.money));
    this.state.money -= paid;
    this.sendHome(dweller, `${def.icon} ${def.name}: ${why} (§${paid} 지불${paid < bill ? `, §${bill - paid} 못 줌` : ''})`);
    return true;
  }

  /** The delivery person: not a townie, just someone with a pizza box. */
  private spawnDelivery() {
    const id = 900 + Math.floor(this.rng() * 90);
    const [start] = this.streetEnds;
    const dweller: Dweller = {
      id,
      name: '피자 배달원',
      shirt: '#e53935',
      skin: '#eac09a',
      hair: '#2b1b10',
      ...start,
      needs: { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90 },
      skills: NO_SKILLS(),
      queue: [],
      run: null,
      job: null,
      away: null,
      engagedWith: null,
      idleTime: 0,
      critCooldown: 0,
      warned: {},
      buffs: [],
      emotion: 'fine',
      traits: [],
      npc: { role: 'doorbell', until: -1, to: this.doorstep, delivery: true },
    };
    this.state.dwellers.push(dweller);
  }

  /** Sends a townie off down the street. */
  private sendHome(dweller: Dweller, message: string) {
    if (!dweller.npc || dweller.npc.leaving) return;
    this.clearQueue(dweller);
    dweller.side = undefined;
    dweller.convo = undefined;
    const ends = this.streetEnds;
    const far = Math.abs(dweller.x - ends[0].x) < Math.abs(dweller.x - ends[1].x) ? ends[0] : ends[1];
    dweller.npc = { ...dweller.npc, leaving: true, to: far };
    if (message) this.notify(message, 'info');
  }

  /** Takes a townie off the lot and out of everyone's plans. */
  private removeNpc(dweller: Dweller) {
    this.state.dwellers = this.state.dwellers.filter((s) => s !== dweller);
    for (const s of this.state.dwellers) {
      if (s.engagedWith === dweller.id) s.engagedWith = null;
      if (s.side?.targetId === dweller.id) s.side = undefined;
      const head = s.queue[0];
      if (head?.kind === 'social' && head.targetId === dweller.id) this.stopRun(s);
      s.queue = s.queue.filter((a) => !(a.kind === 'social' && a.targetId === dweller.id));
    }
  }

  // ---------- conversation groups ----------

  /** The dweller's conversation group (including the dweller), or [] when they aren't in one. */
  convoOf(dweller: Dweller): Dweller[] {
    const c = dweller.convo;
    if (!c || c.until <= this.state.time || dweller.away) return [];
    const members = this.state.dwellers.filter(
      (s) => !s.away && s.convo?.id === c.id && s.convo.until > this.state.time && Math.hypot(s.x - dweller.x, s.y - dweller.y) <= GROUP_RADIUS,
    );
    return members.length >= 2 ? members : [];
  }

  /** Puts `dweller` into the target's group (or starts one) and keeps the whole circle together. */
  private enterConvo(dweller: Dweller, t: Dweller) {
    const now = this.state.time;
    const live = (s: Dweller) => (s.convo && s.convo.until > now ? s.convo.id : undefined);
    const id = live(t) ?? live(dweller) ?? (this.state.nextConvoId = (this.state.nextConvoId ?? 0) + 1);
    dweller.convo = { id, until: now + GROUP_LINGER };
    t.convo = { id, until: now + GROUP_LINGER };
    this.keepConvo(t);
  }

  /** Talking keeps the circle together: it lapses GROUP_LINGER minutes after the last social. */
  private keepConvo(dweller: Dweller) {
    for (const m of this.convoOf(dweller)) m.convo!.until = this.state.time + GROUP_LINGER;
  }

  /** An idle group member stays to listen while someone in the circle is talking, unless a need presses. */
  private listening(dweller: Dweller): boolean {
    const group = this.convoOf(dweller);
    if (group.length === 0 || pressingNeeds(dweller)) return false;
    return group.some((m) => {
      const a = m.queue[0];
      return m !== dweller && a?.kind === 'social' && m.run?.phase === 'performing' && group.some((x) => x.id === a.targetId);
    });
  }

  /**
   * The habits that grow the competencies of the mind (mind.ts): a duty done while fun still
   * called grows 절제력; something done for the very first time grows 호기심.
   */
  private habits(dweller: Dweller, inter: InteractionDef) {
    if (isDuty(inter) && dweller.needs.fun < DUTY_FUN_BELOW) this.gainSkill(dweller, 'selfControl', MIND_GAIN.duty);
    const tried = (dweller.tried ??= []);
    if (!tried.includes(inter.id)) {
      tried.push(inter.id);
      this.gainSkill(dweller, 'curiosity', MIND_GAIN.firstTry);
    }
  }

  /** Records that a skill was practised today; returns how many days running it has been. */
  private practiseToday(dweller: Dweller, key: SkillKey): number {
    const day = clockInfo(this.state.time).day;
    dweller.practice ??= {};
    const rec = dweller.practice[key];
    if (rec?.day === day) return rec.n;
    const firstToday = !Object.values(dweller.practice).some((r) => r?.day === day);
    // 끈기 5+ lets one day off go by without breaking the run (mind.ts).
    const n = rec && day - rec.day <= streakGrace(dweller.skills.persistence ?? 0) ? rec.n + 1 : 1;
    dweller.practice[key] = { day, n };
    // Keeping it up day after day is what grows 끈기.
    if (n >= 2 && firstToday) this.gainSkill(dweller, 'persistence', MIND_GAIN.streakDay);
    if (n === 3 || n === 7) this.notify(`🔥 ${dweller.name}의 ${SKILL_INFO[key].label} 연습이 ${n}일째 이어지고 있어요! 꾸준히 하면 더 빨리 늘어요 (+${Math.round((streakMultiplier(n) - 1) * 100)}%)`, 'good');
    return n;
  }

  /** The worker's branch on a work lot (the copy carries the job). */
  private jobBranchAtWork(dweller: Dweller): number | undefined {
    const wp = this.state.workplace;
    if (!wp || dweller.id !== wp.workerId) return undefined;
    return (dweller.job ?? dweller.partTime)?.branch;
  }

  /**
   * `routine` for what's learnt on the side of everyday life (`LEARN.chore`, `LEARN.passing`): it
   * comes every day anyway, so it neither earns nor keeps up the streak bonus (ours).
   */
  private gainSkill(dweller: Dweller, skill: keyof Dweller['skills'], amount: number, routine = false) {
    // Children learn their own four skills; grown-ups never pick those up.
    const key =
      dweller.age === 'toddler'
        ? TODDLER_SKILLS.has(skill)
          ? skill
          : TODDLER_SKILL_OF[skill] ?? TODDLER_SKILL_OF[CHILD_SKILL_OF[skill] ?? skill]
        : TODDLER_SKILLS.has(skill)
          ? undefined
          : dweller.age === 'child'
            ? CHILD_SKILLS.has(skill) || MIND_SKILLS.has(skill)
              ? skill
              : CHILD_SKILL_OF[skill]
            : CHILD_SKILLS.has(skill)
              ? undefined
              : skill;
    if (!key) return;
    const cap = TODDLER_SKILLS.has(key) || MINOR_SKILLS.has(key) ? TODDLER_MAX_SKILL : MAX_SKILL;
    // Emotions speed up or slow down learning (Focused ×1.4 for logic, Stressed ×0.8, …).
    amount *= skillGainMultiplier(this.emotionOf(dweller), key, traitsOf(dweller.traits).some((t) => t.sadFriendly));
    // Practising day after day pays (ours): +10% a day in a row, up to +50%.
    if (routine) amount *= routineFactor(Math.floor(dweller.skills[key]));
    if (!routine && !dweller.npc && !TODDLER_SKILLS.has(key) && !CHILD_SKILLS.has(key) && !MIND_SKILLS.has(key)) amount *= streakMultiplier(this.practiseToday(dweller, key), streakCap(dweller.skills.persistence ?? 0));
    // 호기심: a new skill's first levels come faster (mind.ts).
    if (!MIND_SKILLS.has(key)) amount *= curiosityBoost(dweller.skills.curiosity ?? 0, Math.floor(dweller.skills[key]));
    for (const t of traitsOf(dweller.traits)) amount *= t.skillMul?.[key] ?? 1;
    // Afraid of failing, a little less sinks in (fears.ts; not the mind's own competencies).
    if (amount > 0 && !MIND_SKILLS.has(key)) amount *= fearDrag(fearLevel(dweller, 'failure'));
    // The home's lot traits (참고 게임 zoneModifier_lotTrait_*): its skills ×1.5, and a mood while at them.
    if (amount > 0) amount *= needSkill(dweller, key) * (dweller.buffs.some((b) => b.id === 'studyDay') ? 1.5 : 1);
    const lotTrait = !this.state.workplace && !dweller.npc && !dweller.away ? traitFor(this.lotTraits, key) : undefined;
    if (lotTrait && amount > 0) {
      amount *= LOT_TRAIT_SKILL_MUL;
      if (!dweller.buffs.some((b) => b.id === lotTrait.buff)) this.addBuff(dweller, lotTrait.buff);
    }
    const before = Math.floor(dweller.skills[key]);
    dweller.skills[key] = Math.min(cap, dweller.skills[key] + amount / levelCost(before, TODDLER_SKILLS.has(key) || CHILD_SKILLS.has(key) || MIND_SKILLS.has(key)));
    const after = Math.floor(dweller.skills[key]);
    if (after > before) {
      this.faceFear(dweller, 'failure');
      if (key === 'fitness') this.faceFear(dweller, 'burgled');
      // A stronger heart: every fear eases a third.
      if (key === 'resilience') for (const f of [...(dweller.fears ?? [])]) this.easeFear(dweller, f, RESILIENCE_SHARE);
      this.wantEvent(dweller, { kind: 'skillUp', skill: key });
      // Starting something new grows 호기심.
      if (after === 1 && !MIND_SKILLS.has(key) && !dweller.npc) this.gainSkill(dweller, 'curiosity', MIND_GAIN.newSkill);
      if (!dweller.npc)
        this.notify(`${dweller.name}의 ${SKILL_INFO[key].label} 스킬이 ${after}레벨이 됐어요! 🎉`, 'good', after >= cap ? { dwellerId: dweller.id, look: 'moment', slam: { title: `${SKILL_INFO[key].label} 최고 레벨!`, icon: SKILL_INFO[key].icon } } : { dwellerId: dweller.id });
    }
  }

  /** A finished piece of woodwork, sold on the spot (woodwork.ts). */
  private finishWoodwork(dweller: Dweller) {
    const skill = dweller.skills.handiness;
    const recipe = pickWoodwork(skill, this.rng);
    const quality = woodworkQuality(skill, this.rng());
    const value = woodworkValue(recipe, quality);
    const materials = Math.ceil(recipe.price / 2); // 참고 게임 crafting_cost discount 0.5
    this.state.money -= Math.min(materials, Math.max(0, this.state.money));
    this.judgeWork(dweller, quality >= 31, quality <= -31);
    const word = quality >= 31 ? '멋진 ' : quality <= -31 ? '엉성한 ' : '';
    (this.state.inventory ??= []).push({ name: `${word}${recipe.name}`, value, maker: dweller.name });
    this.notify(`🪵 ${josa(dweller.name, '이/가')} ${word}${josa(recipe.name, '을/를')} 만들었어요 (재료비 §${materials}, 보관함에서 §${value}에 팔 수 있어요)`, 'good');
  }

  /**
   * A lit fireplace warms the room (참고 게임 Broadcaster_Fireplace_CozyFire: 아늑한 난로, ours within the
   * room) and now and then catches what stands too close in front (Broadcaster_Fireplace_CauseFire:
   * 0.5% each quarter hour for objects 1-2 tiles in front).
   */
  private stepFireplaces(dt: number) {
    for (const f of this.state.objects) {
      if (f.defId !== 'fireplace' || !f.lit) continue;
      const room = roomAt(Math.round(objectCenter(f).x), Math.round(objectCenter(f).y));
      if (this.rng() < dt / 10) {
        for (const s of this.state.dwellers) {
          if (s.away || s.age === 'baby' || roomAt(Math.round(s.x), Math.round(s.y)) !== room) continue;
          this.addBuff(s, 'cozyFire');
        }
      }
      if (this.rng() < (dt / 15) * 0.005) {
        const front = frontTiles(getDef(f.defId), f.x, f.y, f.dir, 2);
        const near = this.state.objects.find((o) => o !== f && footprintTiles(getDef(o.defId), o.x, o.y, o.dir).some((t) => front.some((p) => p.x === t.x && p.y === t.y)));
        if (near) this.ignite(near);
      }
    }
  }

  /** A birthday cake set down near the cook (참고 게임 crafts it onto a surface; ours on the floor nearby). */
  private placeCake(dweller: Dweller) {
    const cx = Math.round(dweller.x);
    const cy = Math.round(dweller.y);
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !this.canPlace('birthdayCake', cx + dx, cy + dy, 'down') || !this.keepsWayClear('birthdayCake', cx + dx, cy + dy, 'down')) continue;
          if (roomAt(cx + dx, cy + dy) === 'outside') continue;
          this.state.objects.push({ uid: this.state.nextUid++, defId: 'birthdayCake', x: cx + dx, y: cy + dy, dir: 'down', cake: { blown: false, slices: CAKE_SLICES } });
          this.invalidate();
          this.notify(`🎂 ${josa(dweller.name, '이/가')} 생일 케이크를 만들었어요! 케이크를 클릭해 촛불을 불어 보세요`, 'good');
          return;
        }
      }
    }
    this.notify('🎂 케이크를 놓을 자리가 없어요', 'bad');
  }

  /**
   * Blowing out the candles (참고 게임 BirthdayCake_BlowOutCandles: 50% success, else try again): the dweller
   * ages up on the spot, everyone around celebrates (buff_Object_BirthdayCake_Celebrate).
   */
  private blowCandles(dweller: Dweller, obj: PlacedObject) {
    if (!obj.cake || obj.cake.blown) return;
    if (this.rng() >= CANDLE_SUCCESS) {
      this.notify(`🕯️ ${josa(dweller.name, '이/가')} 촛불을 다 끄지 못했어요. 다시 불어 보세요!`, 'info');
      return;
    }
    obj.cake.blown = true;
    for (const s of this.state.dwellers) if (!s.away && s.age !== 'baby' && Math.hypot(s.x - dweller.x, s.y - dweller.y) <= 8) this.addBuff(s, 'birthdayCelebrate');
    if (this.state.party?.kind === 'birthday') this.partyGoal('blowCandles');
    this.notify(`🎂 ${josa(dweller.name, '이/가')} 촛불을 불어 껐어요! 생일 축하해요!`, 'good');
    this.ageUpNow(dweller);
  }

  /** Grows a dweller into their next life stage now, as a birthday cake does (참고 게임 age-up any time). */
  ageUpNow(dweller: Dweller): boolean {
    const span = LIFESPANS[this.state.lifespan ?? 'normal'];
    const days: Partial<Record<string, number>> = { toddler: span.toddler, child: span.child, teen: span.teen, adult: span.adult };
    const stage = dweller.age ?? 'adult';
    const d = days[stage];
    if (d === undefined || !Number.isFinite(d) || dweller.npc) return false;
    const before = dweller.age;
    dweller.bornAt = this.state.time - d * 1440 - 1;
    this.stepAgeUp(dweller);
    return dweller.age !== before;
  }

  private onInteractionDone(dweller: Dweller, inter: InteractionDef, obj: PlacedObject, workFail = false) {
    if (this.state.workplace && dweller.id === this.state.workplace.workerId && this.workAttempt(dweller, inter, workFail)) this.workDone(dweller, inter.id);
    // A stage or a speech (fears.ts stage): each time faces it a step; new to it, it may leave a fright.
    if (FEAR_BY_ID.stage.about!.includes(inter.id)) {
      if (this.hasFear(dweller, 'stage')) this.faceFear(dweller, 'stage');
      else if (inter.id !== 'speech' && inter.id !== 'presentationPractice' && (!inter.skill || (dweller.skills[inter.skill.key] ?? 0) < 4)) this.maybeFear(dweller, 'stage');
    }
    if (inter.id === 'homework') this.faceFear(dweller, 'exam');
    if (!dweller.npc) this.habits(dweller, inter);
    if (inter.special === 'bakeCake') this.placeCake(dweller);
    if (inter.special === 'serveHighChair') obj.served = true;
    if (inter.special === 'eatHighChair') obj.served = false;
    if (inter.special === 'usePotty') {
      // A try on the potty chair (참고 게임 commodity_Object_PottyChair_Confidence; odds ours: better with practice).
      if (this.rng() < 0.4 + 0.1 * dweller.skills.potty) this.gainSkill(dweller, 'potty', 0.3);
      else {
        this.addBuff(dweller, 'pottyAccident');
        dweller.needs.hygiene = clamp(dweller.needs.hygiene - 20, 0, 100);
      }
    }
    if (inter.special === 'woodwork') this.finishWoodwork(dweller);
    if (inter.special === 'translate') {
      // Freelance translation (ours): pay grows with the language.
      const pay = 20 + 15 * Math.floor(dweller.skills.language);
      this.state.money += pay;
      this.notify(`🌐 ${josa(dweller.name, '이/가')} 번역 일감을 마쳤어요! +§${pay}`, 'good');
    }
    if (inter.special === 'experiment' && this.rng() < 0.08 + 0.03 * Math.floor(dweller.skills.science)) {
      // Now and then an experiment turns up something worth a small prize (ours).
      const prize = 25 * Math.max(1, Math.floor(dweller.skills.science));
      this.state.money += prize;
      this.addBuff(dweller, 'scienceInspired');
      this.notify(`🔬 ${josa(dweller.name, '이/가')} 실험에서 흥미로운 결과를 얻었어요! 과학 경진대회 상금 +§${prize}`, 'good');
    }
    if (inter.special === 'analyze') {
      this.state.samples = Math.max(0, (this.state.samples ?? 0) - 1);
      if (this.rng() < 0.8) this.findCollectible(dweller, 'microscopePrints'); // 참고 게임 Loot_Microscope_* 80%
    }
    if (inter.special === 'lightFire') {
      obj.lit = true;
      this.notify(`🔥 ${josa(dweller.name, '이/가')} 벽난로에 불을 피웠어요`, 'info');
    }
    if (inter.special === 'putOutFire') obj.lit = false;
    if (inter.special === 'blowCandles') this.blowCandles(dweller, obj);
    if (inter.special === 'eatCake' && obj.cake) {
      obj.cake.slices--;
      if (this.state.party) {
        this.partyGoal('eatCake');
        this.partyGoal('eat');
      }
      if (obj.cake.slices <= 0) {
        this.state.objects = this.state.objects.filter((o) => o !== obj);
        this.invalidate();
      }
    }
    if (inter.id === 'drinkCoffee' && this.state.party) this.partyGoal('coffee');
    this.rollBuff(dweller, inter.buffs);
    if (SOILABLE.has(obj.defId) && inter.special !== 'clean' && inter.special !== 'repair' && inter.special !== 'upgrade') {
      // A grimy fixture is unpleasant to use, and every use leaves it a bit worse (참고 게임 Plumbing_UseDirty).
      if (this.isDirty(obj) && !dweller.traits.includes('slob')) this.addBuff(dweller, 'grossPlumbing');
      if (!hasUpgrade(obj.upgrades, 'lockDirt')) obj.dirt = Math.max(-100, (obj.dirt ?? 100) - DIRT_PER_USE);
    }
    if (inter.id === 'playPiano') this.pianoDone(dweller);
    if (inter.id === 'playViolin') this.violinDone(dweller);
    if (inter.id === 'takePhoto') this.photoDone(dweller);
    // 참고 게임 Telescope collection: star gazing can capture a space print.
    if (inter.id === 'stargaze' && this.rng() < 0.35) this.findCollectible(dweller, 'spacePrints');
    if (inter.id === 'launchRocket') this.launchRocket(dweller, obj);
    if (inter.special === 'eat' && this.state.party) this.partyGoal('eat');
    if (inter.id === 'mixDrink') this.serveDrinks(dweller);
    if (inter.id === 'drinkCoffee') {
      // A second cup on top of the first is too much (참고 게임 buff_Object_Coffee-Overload).
      const over = dweller.buffs.some((b) => b.id === 'caffeinated');
      this.addBuff(dweller, over ? 'caffeineOverload' : 'caffeinated');
      if (over) this.notify(`☕ ${josa(dweller.name, '이/가')} 커피를 너무 많이 마셨어요!`, 'info');
    }
    if (inter.id === 'sleep' && getDef(obj.defId).restfulness) {
      for (const id of WAKE_FEELINGS) if (this.rng() < 0.1) this.addBuff(dweller, id);
    }
    this.afterActivity(dweller, inter);
    this.wearObject(obj, inter, dweller);
    if (obj.defId === 'shower' && this.rng() < SHOWER_PUDDLE_CHANCE) {
      const spot = this.usableSpots(obj, inter)[0];
      if (spot) this.addPuddle(spot.x, spot.y);
    }
    this.countActivity(dweller, inter.countAs ?? inter.id, inter.skill?.key);
    if (inter.serves && inter.serves > 1) this.countActivity(dweller, 'serveMeal');
    if (dweller.aspiration) {
      const counters = (dweller.aspiration.counters ??= {});
      const key = inter.countAs ?? inter.id;
      // And in the mood it was done in, for goals like "while Inspired" (참고 게임 objective mood tests).
      counters[`${key}_${dweller.emotion}`] = (counters[`${key}_${dweller.emotion}`] ?? 0) + 1;
      if (inter.special === 'repair' || inter.special === 'upgrade') counters.fixes = (counters.fixes ?? 0) + 1;
      if (inter.special === 'water' || inter.special === 'weed') counters.tend = (counters.tend ?? 0) + 1;
    }
    if (inter.serves) {
      this.serveMeal(dweller, inter.serves, inter.id === 'cookGourmet');
      this.faceFear(dweller, 'fire');
    }
    if (inter.clears) {
      // Calming down washes ordinary moodlets of those emotions away (not a fire's 50).
      const gone = dweller.buffs.filter((b) => {
        const def = BUFFS[b.id];
        return def?.emotion && inter.clears!.includes(def.emotion) && def.weight < 10;
      });
      if (gone.length) {
        dweller.buffs = dweller.buffs.filter((b) => !gone.includes(b));
        dweller.emotion = this.emotionOf(dweller).emotion;
        this.notify(`😌 ${josa(dweller.name, '이/가')} 마음을 가라앉혔어요`, 'good');
      }
    }
    if (inter.id === 'paint') this.sellPainting(dweller);
    if (inter.special === 'payBills') this.payBill();
    if (inter.special === 'plant') obj.plant = newPlant();
    if (inter.special === 'water' && obj.plant) obj.plant.water = 100;
    if (inter.special === 'weed' && obj.plant) obj.plant.weeds = 0;
    if (inter.special === 'harvest' && obj.plant) {
      const value = harvestValue(dweller.skills.gardening, obj.plant, this.rng());
      this.state.money += value;
      obj.plant.growth = REGROW_FROM;
      this.notify(`🧺 ${josa(dweller.name, '이/가')} 수확한 채소를 §${value}에 팔았어요`, 'good');
    }
    if (inter.id === 'writeBook') this.publishBook(dweller);
    if (inter.special === 'eat') {
      // A new meal's moodlet replaces the last one (they share 참고 게임's food-buff slot).
      dweller.buffs = dweller.buffs.filter((b) => !(FOOD_BUFFS as readonly string[]).includes(b.id));
      if (dweller.meal) this.addBuff(dweller, dweller.meal);
      dweller.meal = undefined;
    }
    if (inter.leavesDish) this.state.dishes = Math.min(9, (this.state.dishes ?? 0) + 1);
    // A broom, a mop, a vacuum (homeFurniture.ts): the floors dry and clean, the fixtures brighter.
    if (inter.special === 'cleanHouse') {
      this.state.puddles = [];
      for (const o of this.state.objects) if (o.dirt !== undefined && o.dirt < 100) o.dirt = Math.min(100, o.dirt + 60);
      this.notify(`🧹 ${josa(dweller.name, '이/가')} 집을 깨끗이 치웠어요`, 'good');
    }
    if (inter.special === 'washDishes') {
      this.state.dishes = 0;
      this.notify(`${josa(dweller.name, '이/가')} 설거지를 끝냈어요 ✨`, 'good');
    }
    this.wantEvent(dweller, { kind: 'interaction', id: inter.id });
    for (const t of traitsOf(dweller.traits)) {
      const extra = t.onInteraction?.[inter.id];
      if (extra) this.addBuff(dweller, extra);
    }
    if (inter.special === 'findJob') {
      this.jobOffer = { dwellerId: dweller.id };
      this.speedBeforeModal = this.state.speed || 1;
      this.state.speed = 0;
    } else if (inter.special === 'quitJob' && dweller.age === 'teen' && dweller.partTime) {
      dweller.partTime = null;
      this.notify(`${josa(dweller.name, '이/가')} 아르바이트를 그만뒀어요`, 'info');
    } else if (inter.special === 'quitJob' && dweller.job) {
      dweller.job = null;
      if (dweller.age === 'elder') this.askThought(dweller, 'life', 'retired');
      this.notify(`${josa(dweller.name, '이/가')} 회사를 그만뒀어요`, 'info');
      if (hasTrait(dweller.traits, 'commitmentIssues')) this.addBuff(dweller, 'freedFromJob');
    }
  }

  /** Use wears plumbing and appliances down; repairing restores them. */
  private wearObject(obj: PlacedObject, inter: InteractionDef, dweller?: Dweller) {
    const def = getDef(obj.defId);
    if (inter.special === 'repair') {
      obj.wear = 100;
      delete obj.repairDone;
      this.notify(`🔧 ${josa(def.name, '을/를')} 고쳤어요`, 'good');
      return;
    }
    if (inter.special === 'upgrade') {
      const u = UPGRADE_BY_ID[inter.upgrade!];
      obj.upgrades = [...(obj.upgrades ?? []), u.id];
      this.notify(`🛠️ ${def.name}에 ${josa(u.label, '을/를')} 마쳤어요`, 'good');
      return;
    }
    // 참고 게임 Upgrade_Generic_LockBrokenness / LowerBrokenness (x0.5).
    if (hasUpgrade(obj.upgrades, 'lockWear')) return;
    const upgraded = hasUpgrade(obj.upgrades, 'lowerWear') ? 0.5 : 1;
    if (!WEARABLE.has(def.id) || this.rng() >= WEAR_CHANCE * (def.wearMul ?? 1) * upgraded) return;
    const wasBroken = this.isBroken(obj);
    obj.wear = Math.max(0, (obj.wear ?? 100) - WEAR_PER_USE);
    if (!wasBroken && this.isBroken(obj) && dweller) this.addBuff(dweller, 'brokeDown');
    if (!wasBroken && this.isBroken(obj)) this.notify(`💥 ${josa(def.name, '이/가')} 고장 났어요! 클릭해서 수리하세요`, 'bad');
  }

  private finishAction(dweller: Dweller) {
    this.stopRun(dweller);
    const done = dweller.queue.shift();
    // After a player order free will waits about 5 minutes before taking over (참고 게임).
    if (done && !done.autonomous && done.kind !== 'work' && dweller.queue.length === 0) dweller.idleTime = -3;
  }

  /** What finishing something leaves: the third time running is a bore; waking up tired, not awake yet. */
  private afterActivity(dweller: Dweller, inter: InteractionDef) {
    if (inter.id === 'sleep' && dweller.needs.energy < HALF_AWAKE && dweller.age !== 'baby') this.addBuff(dweller, 'halfAwake');
    // Only what's done for its own sake, not eating, washing or sleeping.
    if (!inter.skill && !((inter.effects?.fun ?? 0) > 0)) return;
    if (inter.untilFull) return;
    const last = dweller.lastDone;
    // Running, with no long break; and once said, it takes as many again.
    const running = last?.id === inter.id && this.state.time - last.at <= SAME_AGAIN_WITHIN;
    dweller.lastDone = { id: inter.id, n: running ? last.n + 1 : 1, at: this.state.time };
    if (dweller.lastDone.n >= SAME_AGAIN) {
      this.addBuff(dweller, 'sameAgain');
      dweller.lastDone.n = 0;
    }
  }

  /** Free will leaves an object alone for 15 minutes after failing to use it. */
  private avoidObject(dweller: Dweller, uid: number) {
    dweller.avoid = { ...(dweller.avoid ?? {}), [uid]: this.state.time + 15 };
  }

  /** Ends the current run (keeping the action in the queue) and frees any social partner. */
  private stopRun(dweller: Dweller) {
    const a = dweller.queue[0];
    // A repair left half done keeps its progress on the object.
    if (a?.kind === 'interact' && dweller.run?.phase === 'performing') {
      const obj = this.object(a.objectUid);
      if (obj && this.isBroken(obj) && this.interaction(obj, a.interactionId)?.special === 'repair') obj.repairDone = (obj.repairDone ?? 0) + dweller.run.elapsed;
    }
    if (a?.kind === 'social') {
      const t = this.dweller(a.targetId);
      if (t && t.engagedWith === dweller.id) t.engagedWith = null;
    }
    dweller.run = null;
  }

  private clearQueue(dweller: Dweller) {
    this.stopRun(dweller);
    dweller.queue = [];
  }

  private releaseEngagement(dweller: Dweller) {
    if (dweller.engagedWith === null) return;
    const p = this.dweller(dweller.engagedWith);
    if (p?.queue[0]?.kind === 'social') this.finishAction(p);
    dweller.engagedWith = null;
  }

  // ---------- careers ----------

  /** The job in a slot: the main job (or school), or a teen's part-time job. */
  jobIn(dweller: Dweller, slot: JobSlot): Job | null {
    return (slot === 'partTime' ? dweller.partTime : dweller.job) ?? null;
  }

  private checkWork(dweller: Dweller) {
    for (const slot of ['job', 'partTime'] as const) {
      const job = this.jobIn(dweller, slot);
      if (!job) continue;
      const lvl = levelOf(job);
      const { day, weekday, minuteOfDay } = clockInfo(this.state.time);
      if (!(lvl.days ?? WEEKDAYS).includes(weekday) || job.lastWorkDay === day) continue;
      // Hurt: a day off sick, said once, no shift (and nothing missed: it isn't their doing).
      if (dweller.injury && minuteOfDay >= lvl.start - 60 && minuteOfDay < lvl.end) {
        job.lastWorkDay = day;
        this.notify(`🩹 ${josa(dweller.name, '이/가')} 다쳐서 오늘은 ${CAREER_BY_ID[job.careerId].school ? '학교에' : '일하러'} 가지 못해요`, 'bad', { dwellerId: dweller.id });
        continue;
      }
      // A dweller who can drive (driving 4+) takes the car and leaves half an hour later than the carpool (ours).
      const drives = dweller.age !== 'teen' && Math.floor(dweller.skills.driving ?? 0) >= SELF_DRIVE_LEVEL;
      const lead = drives ? 30 : 60;
      if (minuteOfDay >= lvl.start - lead && minuteOfDay < lvl.end - 60) {
        // Got up for it with too little sleep.
        if (this.performing(dweller)?.inter.id === 'sleep' && dweller.needs.energy < HALF_AWAKE) this.addBuff(dweller, 'halfAwake');
        job.lastWorkDay = day;
        this.releaseEngagement(dweller);
        this.clearQueue(dweller);
        this.push(dweller, { kind: 'work', autonomous: false, slot });
        this.notify(drives ? `🚗 ${josa(dweller.name, '이/가')} 직접 운전해서 출근해요 (30분 여유)` : `${dweller.name}의 카풀이 도착했어요 🚗`, 'info');
        return;
      }
    }
  }

  private goToWork(dweller: Dweller, slot: JobSlot = 'job') {
    const job = this.jobIn(dweller, slot);
    this.finishAction(dweller);
    if (!job) return;
    const lvl = levelOf(job);
    const { day } = clockInfo(this.state.time);
    const start = day * 1440 + lvl.start;
    const end = day * 1440 + lvl.end;
    if (this.state.time >= end) return;
    if (this.state.time > start + 5) this.notify(`${josa(dweller.name, '이/가')} 지각했어요!`, 'bad');
    job.shiftStart = Math.max(start, this.state.time);
    job.shiftDelta = 0;
    // Every few days a scene of the job's drama (episodes.ts) in place of the day's card; the first
    // shift only has the season written ahead.
    const episodic = !dweller.npc && !CAREER_BY_ID[job.careerId].school && !!WORKPLACES[job.careerId] && !!this.cloud?.episodes;
    let episodeToday = false;
    if (episodic) {
      if (job.episodeDay === undefined) {
        job.episodeDay = day + 1;
        this.fillEpisode(dweller, slot);
      } else if (day >= job.episodeDay) episodeToday = true;
    }
    job.episodeAt = episodeToday && job.shiftStart + EVENT_DELAY < end ? job.shiftStart + EVENT_DELAY : undefined;
    // A card a working day, an hour in (참고 게임 chance cards), unless the day has its episode.
    const lvlIdx = job.level;
    job.eventAt =
      !episodeToday && !dweller.npc && !CAREER_BY_ID[job.careerId].school && this.rng() < EVENT_CHANCE && eventsFor(job.careerId, lvlIdx, job.eventsSeen, this.state.time).length > 0
        ? job.shiftStart + EVENT_DELAY
        : undefined;
    if (job.eventAt !== undefined && job.eventAt >= end) job.eventAt = undefined;
    if (job.eventAt !== undefined && (!this.stockedCard(job) || job.cardChain?.text)) this.askCareerCard(dweller, slot);
    this.clearQueue(dweller);
    dweller.away = { until: end, slot };
    dweller.x = this.exitTile.x;
    dweller.y = this.exitTile.y;
    // The first shift at a workplace asks whether to go along; after that the job's toggle decides.
    if (!WORKPLACES[job.careerId] || dweller.npc) return;
    if (job.follow === undefined) this.askFollow(dweller, slot);
    else if (job.follow) this.startWorkplace(dweller, slot, end);
  }

  /** Off to a first shift at a workplace: time stops while the player says whether to go along. */
  private askFollow(dweller: Dweller, slot: JobSlot) {
    if (this.state.followAsks?.some((a) => a.dwellerId === dweller.id && a.slot === slot)) return;
    if (!this.modalOpen()) this.speedBeforeModal = this.state.speed || 1;
    (this.state.followAsks ??= []).push({ dwellerId: dweller.id, slot });
    this.state.speed = 0;
    this.emit();
  }

  /**
   * The answer to "go along to work?": this once, not this time, or every shift from now on (which
   * turns the job's toggle on). Not going along every time leaves the toggle off, for the job tab to turn on later.
   */
  answerFollow(answer: 'once' | 'no' | 'always') {
    const ask = this.state.followAsks?.shift();
    if (!this.state.followAsks?.length) delete this.state.followAsks;
    const dweller = ask && this.dweller(ask.dwellerId);
    const job = dweller && this.jobIn(dweller, ask.slot);
    if (dweller && job) {
      job.follow = answer === 'always';
      if (answer !== 'no' && dweller.away && !dweller.away.outing && (dweller.away.slot ?? 'job') === ask.slot) this.startWorkplace(dweller, ask.slot, dweller.away.until);
    }
    if (!this.modalOpen()) this.state.speed = this.speedBeforeModal;
    this.emit();
  }

  /** A choice waiting on the player that holds time still (want ads, a work event, going along to work). */
  modalOpen(): boolean {
    return !!(this.jobOffer || this.state.careerEvent || this.state.followAsks?.length || this.state.episode || this.state.workResult);
  }

  /**
   * Performance builds up through the shift from the dweller's current emotion, like 참고 게임 checking
   * every 30 dweller minutes (docs/ref-game/05 §2.3). The work tone scales gains only.
   */
  private workTick(dweller: Dweller, dt: number) {
    if (this.workGames.has(dweller.id)) return;
    const job = this.jobIn(dweller, dweller.away?.slot ?? 'job');
    if (!job || job.shiftStart === undefined) return;
    const career = CAREER_BY_ID[job.careerId];
    const lvl = levelOf(job);
    const shift = lvl.end - lvl.start;
    // How hard they work follows who they are and how they're doing (workDrive.ts), not a button.
    job.tone = workDrive(dweller, this.hasFear(dweller, 'deadEndJob')).tone;
    const tone = TONES[job.tone];
    const { gain, loss } = shiftPerformance(job.level, lvl.mood ?? career.emotion, this.emotionOf(dweller), job.task ?? 0, lvl.basePerf);
    // A job that feels like a dead end gives a little less (fears.ts, after 참고 게임's performance penalty).
    // Test anxiety likewise at school (stronger fears take more: fearDrag).
    const passion = fearDrag(fearLevel(dweller, 'deadEndJob')) * (career.school ? fearDrag(fearLevel(dweller, 'exam')) : 1);
    const delta = ((gain * PERF_PACE * tone.multiplier * passion * (1 + 0.03 * Math.floor(dweller.skills.leadership ?? 0)) - loss) * dt) / shift;
    job.performance = clamp(job.performance + delta, -100, 100);
    job.shiftDelta = (job.shiftDelta ?? 0) + delta;
    // A day's work grows the job's competencies (workGrowth.ts): more pushing hard, less taking it easy.
    for (const [k, share] of workSkills(job)) this.gainSkill(dweller, k, WORK_LEARN * WORK_TONE_LEARN[job.tone ?? 'normal'] * share * dt);
    // Taking it easy is fun (참고 게임 +0.58/min on its scale); working hard wears fun down.
    if (job.tone === 'easy') dweller.needs.fun = clamp(dweller.needs.fun + 0.29 * dt, 0, 100);
    else if (job.tone === 'hard') dweller.needs.fun = clamp(dweller.needs.fun - 0.05 * dt, 0, 100);
  }

  /** Picks the branch a dweller will take at the next promotion out of the shared levels. */
  pickBranch(dwellerId: number, branch: number) {
    const job = this.dweller(dwellerId)?.job;
    if (job && job.branch === undefined && CAREER_BY_ID[job.careerId].branches?.[branch]) job.branchPick = branch;
    this.emit();
  }

  /** Home from a shift; `played` when it was played on the work lot (its own troubles came there). */
  private returnFromWork(dweller: Dweller, played = false) {
    if (dweller.needs.energy < FOGGY_ENERGY) this.addBuff(dweller, 'foggyHead');
    const slot = dweller.away?.slot ?? 'job';
    dweller.away = null;
    dweller.x = this.exitTile.x;
    dweller.y = this.exitTile.y;
    const job = this.jobIn(dweller, slot);
    if (!job) return;
    const career = CAREER_BY_ID[job.careerId];
    const lvl = levelOf(job);
    // Pay and the missed-day penalty depend on how much of the shift was worked (참고 게임 80% rule).
    const { day } = clockInfo(this.state.time - 1);
    const shiftStart = day * 1440 + lvl.start;
    const worked = clamp((this.state.time - (job.shiftStart ?? shiftStart)) / (lvl.end - lvl.start), 0, 1);
    const pay = Math.ceil(lvl.pay * Math.min(1, worked / FULL_DAY_SHARE));
    this.state.money += pay;
    if (worked < FULL_DAY_SHARE) job.performance = clamp(job.performance - MISSED_WORK_PENALTY, -100, 100);
    // Seeing a whole shift (or school day) through is a duty kept: 절제력 (mind.ts).
    else this.gainSkill(dweller, 'selfControl', MIND_GAIN.fullShift);
    // A day's work, by kind of work, for the "하고 싶은 일" aspirations (careerTypes.ts).
    if (!career.school && worked > 0) {
      for (const t of typesOf(career.id)) dweller.workDays = { ...(dweller.workDays ?? {}), [t]: (dweller.workDays?.[t] ?? 0) + 1 };
      this.countActivity(dweller, 'triedWork');
      this.checkAspiration(dweller);
    }
    const delta = Math.round(job.shiftDelta ?? 0);
    this.shiftFears(dweller, !!career.school, delta);
    if (career.school) this.notify(`🎒 ${josa(dweller.name, '이/가')} 학교에서 돌아왔어요 (오늘 성과 ${delta >= 0 ? '+' : ''}${delta})`, delta >= 0 ? 'good' : 'bad');
    else this.notify(`${josa(dweller.name, '이/가')} 퇴근했어요. §${pay} 벌었어요 💰 (오늘 성과 ${delta >= 0 ? '+' : ''}${delta})`, delta >= 0 ? 'good' : 'bad');
    if (job.tone === 'hard' && this.rng() < 0.5) this.addBuff(dweller, 'workStress');
    if (job.tone === 'easy' && this.rng() < 0.5) this.addBuff(dweller, 'workRelaxed');
    // A day worked out of sight wasn't all smooth (workTrouble.ts): now and then a hard one, more for one out of their depth.
    if (!played && !career.school && worked >= FULL_DAY_SHARE) {
      const main = SKILL_PROFILES[job.careerId]?.main ?? career.skill;
      const odds = hardDayChance(dweller.skills[main] ?? 0, workNeed(job.level), job.tone === 'easy', dweller.emotion);
      const roll = this.rng();
      if (roll < odds.hard) {
        const t = this.pickTrouble(!!WORKPLACES[job.careerId]?.clients?.length);
        this.addBuff(dweller, this.rng() < 0.5 ? t.id : 'hardDay');
        job.performance = clamp(job.performance - 4, -100, 100);
        this.notify(`😫 ${dweller.name}의 오늘 근무: ${t.texts[Math.floor(this.rng() * t.texts.length)]}`, 'bad');
      } else if (roll < odds.hard + odds.good) {
        this.addBuff(dweller, 'goodWorkDay');
        job.performance = clamp(job.performance + 3, -100, 100);
      }
    }
    job.task = 0;
    job.shiftStart = undefined;
    job.shiftDelta = 0;
    this.evaluateCareer(dweller, slot);
  }

  /** 참고 게임 evaluation after each shift: promote at 100 (with the skill), demote at -80, fire at -95. */
  private evaluateCareer(dweller: Dweller, slot: JobSlot = 'job') {
    const job = this.jobIn(dweller, slot);
    if (!job) return;
    const career = CAREER_BY_ID[job.careerId];
    const next = nextLevelOf(job, dweller.skills);
    if (next && job.performance >= PROMOTE_AT) {
      if (meetsNeeds(dweller.skills, levelOf(job))) {
        // Out of the shared levels, into a branch (참고 게임 asks; we pick the one the dweller suits).
        let branchNote = '';
        if (job.branch === undefined && career.branches?.length && job.level + 1 === career.levels.length) {
          job.branch = job.branchPick ?? chooseBranch(career, dweller.skills);
          branchNote = ` (${career.branches[job.branch].name} 계열)`;
        }
        job.level++;
        job.promotedAt = this.state.time;
        this.fillTraitNeed(dweller, 'ambitious');
        this.faceFear(dweller, 'deadEndJob');
        if (!career.school) this.maybeFear(dweller, 'imposter');
        job.performance = 0;
        job.warnedSkill = false;
        this.addBuff(dweller, 'promoted');
        this.wantEvent(dweller, { kind: 'promotion' });
        if (career.school) this.notify(`📚 ${dweller.name}의 성적이 올라 ${josa(next.title, '이/가')} 됐어요!`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: '성적이 올랐어요!', icon: '📚' } });
        else this.notify(`🎉 ${josa(dweller.name, '이/가')} ${next.title}(으)로 승진했어요!${branchNote} 일당 §${next.pay}`, 'good', { dwellerId: dweller.id, look: 'moment', slam: { title: '승진!', icon: career.icon } });
      } else if (!job.warnedSkill) {
        job.warnedSkill = true;
        this.notify(`${dweller.name}: 승진하려면 ${needsText(levelOf(job), (k) => SKILL_INFO[k].label)}이 필요해요`, 'info');
      }
      return;
    }
    if (job.performance > DEMOTE_AT) return;
    if (career.school && job.level === 0) {
      job.performance = DEMOTE_AT + 10; // F is as low as it goes; nobody gets expelled
      return;
    }
    if (job.performance <= FIRE_AT || job.level === 0) {
      if (slot === 'partTime') dweller.partTime = null;
      else dweller.job = null;
      this.addBuff(dweller, 'fired');
      this.notify(`${josa(dweller.name, '이/가')} 해고당했어요… 😢`, 'bad');
      this.maybeFear(dweller, 'future');
      return;
    }
    job.level--;
    if (job.level < career.levels.length) job.branch = undefined;
    job.performance = 0;
    this.addBuff(dweller, 'demoted');
    this.notify(`${josa(dweller.name, '이/가')} ${levelOf(job).title}(으)로 강등당했어요 📉`, 'bad');
  }

  /** A work event left over from a job the dweller no longer has (changed jobs, let go, grew up) is dropped. */
  private dropStaleCareerEvent() {
    const ce = this.state.careerEvent;
    if (!ce) return;
    const dweller = this.state.dwellers.find((s) => s.id === ce.dwellerId);
    const job = ce.slot === 'partTime' ? dweller?.partTime : dweller?.job;
    if (!job || !(ce.ai ?? EVENT_BY_ID[ce.eventId])?.careers.includes(job.careerId)) this.state.careerEvent = undefined;
  }

  acceptJob(dwellerId: number, careerId: string | null) {
    const dweller = this.dweller(dwellerId);
    if (dweller && careerId && CAREER_BY_ID[careerId]) {
      const career = CAREER_BY_ID[careerId];
      const job = { careerId, level: 0, performance: 0, lastWorkDay: clockInfo(this.state.time).day, tone: 'normal' as const, task: 0, promotedAt: this.state.time };
      const first = dweller.jobSince === undefined;
      this.faceFear(dweller, 'deadEndJob');
      this.faceFear(dweller, 'future', FEAR_BY_ID.future.need);
      if (!career.school) this.maybeFear(dweller, 'imposter');
      if (career.partTime) dweller.partTime = job;
      else dweller.job = job;
      dweller.jobSince = this.state.time;
      const lvl = career.levels[0];
      this.notify(`${josa(dweller.name, '이/가')} ${career.name} 분야의 ${lvl.title}(으)로 취직했어요! 내일부터 출근해요`, 'good', { dwellerId: dweller.id, look: 'moment' });
      if (first) this.askThought(dweller, 'life', 'firstJob');
    }
    this.jobOffer = null;
    this.dropStaleCareerEvent();
    this.state.speed = this.speedBeforeModal;
    this.emit();
  }

  // ---------- player commands ----------

  enqueue(dwellerId: number, a: NewAction) {
    const dweller = this.dweller(dwellerId);
    if (!dweller || dweller.away) return;
    if (dweller.queue[0]?.kind === 'passout') {
      this.notify(`${josa(dweller.name, '은/는')} 지금 정신을 잃은 상태예요`, 'info');
      return;
    }
    // Chatting with a neighbour from the sofa or the TV doesn't need anyone to get up.
    if (a.kind === 'social') {
      const t = this.dweller(a.targetId);
      const social = SOCIAL_BY_ID[a.socialId];
      if (t && social && !social.join && this.canSideChat(dweller, t)) {
        this.startSide(dweller, t, social, false);
        this.emit();
        return;
      }
    }
    // Player orders replace whatever free will was doing.
    if (dweller.queue[0]?.autonomous) this.stopRun(dweller);
    dweller.queue = dweller.queue.filter((q) => !q.autonomous);
    if (dweller.queue.length >= MAX_QUEUE) {
      this.notify('행동 대기열이 가득 찼어요', 'info');
      return;
    }
    this.push(dweller, a);
    this.emit();
  }

  cancel(dwellerId: number, actionId: number) {
    const dweller = this.dweller(dwellerId);
    if (!dweller) return;
    const i = dweller.queue.findIndex((a) => a.id === actionId);
    if (i < 0) return;
    const a = dweller.queue[i];
    if (a.kind === 'passout') return;
    if (a.kind === 'work' && dweller.job) {
      dweller.job.performance = clamp(dweller.job.performance - MISSED_WORK_PENALTY, -100, 100);
      this.notify(`${josa(dweller.name, '이/가')} 결근했어요. 업무 성과 -15`, 'bad');
    }
    if (i === 0) this.finishAction(dweller);
    else dweller.queue.splice(i, 1);
    this.emit();
  }

  objectMenu(dweller: Dweller, obj: PlacedObject): MenuOption[] {
    return getDef(obj.defId)
      // Show power/water-blocked and TV-less options greyed out rather than hiding them.
      .interactions.filter((inter) => !inter.moods || inter.moods.includes(dweller.emotion))
      .filter((inter) => dweller.age !== 'child' || !CHILD_FORBIDDEN.has(inter.id))
      .filter((inter) => dweller.age !== 'toddler' || TODDLER_ALLOWED.has(inter.id) || (inter.id === 'use' && dweller.skills.potty >= POTTY_TRAINED))

      .filter(
        (inter) =>
          inter.requires === 'tvNearby' ||
          inter.requires === 'night' ||
          (inter.requires === 'upgradable' && !obj.upgrades?.includes(inter.upgrade!)) ||
          this.utilityBlocker(inter) !== null ||
          (this.isBroken(obj) && inter.special !== 'repair') ||
          this.stageBlocker(dweller, inter) !== null ||
          this.meetsRequirement(dweller, obj, inter),
      )
      .map((inter) => {
        let disabled: string | undefined;
        if (this.injuryBlocker(dweller, inter)) disabled = this.injuryBlocker(dweller, inter)!;
        else if (this.bathroomBlocker(dweller, obj)) disabled = this.bathroomBlocker(dweller, obj)!;
        else if (this.utilityBlocker(inter)) disabled = this.utilityBlocker(inter)!;
        else if (inter.special !== 'repair' && this.isBroken(obj)) disabled = '고장 났어요';
        else if (inter.minSkill && Math.floor(dweller.skills[inter.minSkill[0]] ?? 0) < inter.minSkill[1]) disabled = `${SKILL_INFO[inter.minSkill[0]].label} ${inter.minSkill[1]}레벨 필요`;
        else if (this.stageBlocker(dweller, inter)) disabled = this.stageBlocker(dweller, inter)!;
        else if (inter.requires === 'upgradable' && !this.meetsRequirement(dweller, obj, inter)) disabled = `손재주 ${UPGRADE_BY_ID[inter.upgrade!].level}레벨 필요`;
        else if (inter.requires && !this.meetsRequirement(dweller, obj, inter)) disabled = inter.requires === 'night' ? '밤(20시~5시)에만 할 수 있어요' : '근처에 TV가 없어요';
        else if (inter.cost && this.state.money < inter.cost) disabled = `§${inter.cost} 필요`;
        const level = this.workVariantOf(dweller, inter);
        const label = this.state.workplace ? level?.label ?? inter.label : forDweller(inter, dweller).label;
        // Home practice gone as far as it goes without a job: it can still be done, and it says so.
        const homePractice = !this.state.workplace && !dweller.npc && dweller.age !== 'toddler' && inter.skill && inter.skill.rate !== LEARN.chore;
        const note = homePractice ? homeCapNote(dweller, inter.skill!.key) : undefined;
        return { id: inter.id, label: inter.cost ? `${label} (§${inter.cost})` : label, icon: level?.icon ?? inter.icon, disabled, ...(note ? { note } : {}) };
      });
  }

  socialMenu(dweller: Dweller, target: Dweller): MenuOption[] {
    // Toddlers babble but don't start conversations; children are too young to look after them.
    if (dweller.age === 'toddler' || (target.age === 'toddler' && (dweller.age === 'child' || !!dweller.npc))) return [];
    const rel = this.relationship(dweller.id, target.id);
    const group = this.convoOf(target);
    // A colleague come over as a guest: their worries and good news only once told, as at work.
    const colleague = !!target.npc && !!this.state.townies?.find((x) => x.id === target.id)?.workmate;
    if (target.npc?.role === 'reaper') {
      const d = this.dyingDweller();
      return d ? [{ id: '__plead', label: `${josa(d.name, '을/를')} 살려달라고 빌기`, icon: '🙏', disabled: this.pleadBlocker(dweller) ?? undefined }] : [];
    }
    const aid: MenuOption[] =
      !dweller.npc && !(isYoung(dweller.age) && dweller.age !== 'teen') && (target.dying || target.buffs.some((b) => INJURIES.has(b.id)))
        ? [{ id: '__firstAid', label: target.dying ? '응급처치하기' : '상처 치료해 주기', icon: '🩺', disabled: this.firstAidBlocker(dweller, target) ?? undefined }]
        : [];
    if (target.dying) return aid;
    const job = this.joinable(dweller);
    const invitable = !!job && !target.npc?.leaving && (!target.npc || target.npc.role === 'guest') && target.age !== 'baby';
    const join: MenuOption[] = invitable ? [{ id: '__join', label: `같이 하자고 하기 (${job!.inter.label})`, icon: job!.inter.icon, disabled: this.joinBlocker(dweller, target) ?? undefined }] : [];
    return [...aid, ...join, ...SOCIALS.map((s): MenuOption | null => {
      let disabled = socialBlocker(s, rel, dweller, this.state.time) ?? undefined;
      if (!socialFits(s, target, dweller, colleague)) return null;
      // Each grown-up squares up to a burglar once (children and teens keep out of it).
      if (s.id === 'confrontBurglar') {
        if (isYoung(dweller.age)) return null;
        if (target.npc?.fought?.includes(dweller.id)) disabled ??= '이미 맞섰어요';
      }
      // No romance with the young, nor within the family (참고 게임 blocks both).
      if ((isYoung(dweller.age) || isYoung(target.age) || this.familyTie(dweller, target)) && s.category === 'romance') return null;
      // Nor with a neighbour who's married, with someone, or has children; and they don't move in.
      if (s.category === 'romance' && this.romanceBlocked(dweller, target)) return null;
      const taken = s.id === 'askMoveIn' ? this.tiesBlocked(dweller, target) : null;
      if (taken && !this.familyTie(dweller, target)) disabled ??= taken;
      if (s.join) disabled = group.length < 2 ? '대화 중이 아니에요' : group.includes(dweller) ? '이미 같은 대화 중이에요' : undefined;
      if (s.id === 'askAboutCareer' || s.id === 'getToKnow') {
        const townie = this.state.townies?.find((x) => x.id === target.id);
        if (!townie || dweller.npc) return null;
        if (s.id === 'askAboutCareer' && !factsOf(target, townie).careerId) disabled ??= '일을 하지 않아요';
      }
      const pie = TOP_LEVEL_SOCIALS.has(s.id) || s.toddler || s.work ? undefined : SOCIAL_GROUPS[s.category];
      return { id: s.id, label: s.label, icon: s.icon, disabled, group: pie };
    }).filter((o): o is MenuOption => o !== null)];
  }

  setSpeed(speed: number) {
    if (this.modalOpen()) return;
    this.state.speed = clamp(speed, 0, SPEEDS.length - 1);
    this.emit();
  }

  /**
   * Changes a dweller's name or look (the edit window, ours; 참고 게임's Create a Dweller on a dweller in play), or
   * what the wardrobe, the mirror or the salon puts on. A name is kept to 1–8 letters.
   */
  restyle(dwellerId: number, patch: LookPatch) {
    const dweller = this.dweller(dwellerId);
    if (!dweller) return;
    const { name, ...look } = patch;
    const trimmed = name?.trim();
    if (trimmed) dweller.name = trimmed.slice(0, 8);
    // Cleared (no face, the face's own eyes): left out.
    const rec = dweller as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(look)) {
      if (v === undefined || v === '') delete rec[k];
      else rec[k] = v;
    }
    this.emit();
  }

  setActive(dwellerId: number) {
    const s = this.dweller(dwellerId);
    if (s && !s.npc && s.age !== 'baby') this.state.activeDwellerId = dwellerId;
    this.emit();
  }

  /** The guide's tip is done or passed (tips.ts). */
  tipDone(id: string) {
    const t = (this.state.tips ??= { on: true, done: [] });
    if (!t.done.includes(id)) t.done.push(id);
    this.emit();
  }

  /** Turns the guide on or off; turning on a guide already seen through starts it again. */
  setGuide(on: boolean) {
    const t = (this.state.tips ??= { on, done: [] });
    t.on = on;
    if (on && TIPS.every((x) => t.done.includes(x.id))) t.done = [];
    this.emit();
  }

  toggleFreeWill() {
    this.state.freeWill = !this.state.freeWill;
    this.emit();
  }

  // ---------- buy mode ----------

  canPlace(defId: string, x: number, y: number, dir: Dir, ignoreUid?: number): boolean {
    if (!canPlace(this.state, this.tiles, defId, x, y, dir, ignoreUid)) return false;
    if (defId !== 'stairs') return true;
    // Stairs need a floor above to lead to, room to step on at the foot, and the head's place upstairs free of walls.
    if (floorOf(y) + 1 >= this.levels) return false;
    const { foot, top } = this.stairEnds({ uid: 0, defId, x, y, dir });
    const before = frontTiles(getDef(defId), x, y, dir, 1).filter((p) => p.x === foot.x || p.y === foot.y);
    const upTile = this.tiles[idx(top.x, top.y)];
    return before.some((p) => !this.blocked[idx(p.x, p.y)]) && (FLOOR_TILES.has(upTile) || upTile === 'void');
  }

  /** Whether the floor below holds up this upstairs tile (a floor under it). */
  supported(x: number, y: number): boolean {
    if (floorOf(y) === 0) return true;
    return FLOOR_TILES.has(this.tiles[idx(x, y - MAP_H)]);
  }

  /** Whether an upstairs edge has something under it to stand on: a wall below, or floor either side. */
  private edgeSupported(key: string): boolean {
    const [a, b] = edgeTiles(key);
    if (floorOf(a.y) === 0) return true;
    const below = `${parseInt(key, 10) - LEVEL_TILES}${key.slice(-1)}`;
    return !!this.walls[below] || this.supported(a.x, a.y) || this.supported(b.x, b.y);
  }

  buy(defId: string, x: number, y: number, dir: Dir): boolean {
    const def = getDef(defId);
    if (this.state.money < def.price) {
      this.notify('돈이 부족해요', 'bad');
      return false;
    }
    if (!this.canPlace(defId, x, y, dir)) return false;
    const shut = this.wayBlocker(defId, x, y, dir);
    if (shut) {
      this.notify(shut, 'bad');
      return false;
    }
    this.state.money -= def.price;
    this.setDown({ uid: this.state.nextUid++, defId, x, y, dir, fresh: true });
    // A new thing for the house delights the materialistic (참고 게임 Buff_Trait_Materialistic_JustAdmired 1-3; price bands ours).
    for (const s of this.household()) {
      if (!hasTrait(s.traits, 'materialistic') || s.away) continue;
      this.fillTraitNeed(s, 'materialistic');
      this.addBuff(s, def.price >= 2000 ? 'justAdmired3' : def.price >= 500 ? 'justAdmired2' : 'justAdmired1');
    }
    this.invalidate();
    this.emit();
    return true;
  }

  /** Puts an object on the lot: a flight of stairs lays a landing at its top if there was only air. */
  private setDown(obj: PlacedObject) {
    this.state.objects.push(obj);
    if (obj.defId !== 'stairs') return;
    const { top } = this.stairEnds(obj);
    const i = idx(top.x, top.y);
    if (this.tiles[i] === 'void') {
      this.tiles[i] = 'wood';
      this.state.tiles = this.tiles.slice();
      setRooms(this.tiles, this.walls);
    }
  }

  /** The household's furniture put away (참고 게임 household inventory); on land being built on, the home's. */
  get storage(): PlacedObject[] {
    return this.owner ? this.owner.storage : (this.state.storage ??= []);
  }

  /** Takes one thing out of storage. */
  private unstore(obj: PlacedObject) {
    const s = this.storage;
    s.splice(s.indexOf(obj), 1);
  }

  /** Sets something from storage down on the lot, free (where it fits and blocks no way). */
  placeStored(uid: number, x: number, y: number, dir: Dir): boolean {
    const obj = this.storage.find((o) => o.uid === uid);
    if (!obj || !this.canPlace(obj.defId, x, y, dir)) return false;
    const shut = this.wayBlocker(obj.defId, x, y, dir);
    if (shut) {
      this.notify(shut, 'bad');
      this.emit();
      return false;
    }
    this.unstore(obj);
    // On land being built on, numbered among its own things (stored ones carry the home's numbers).
    this.setDown({ ...obj, uid: this.owner ? this.state.nextUid++ : obj.uid, x, y, dir });
    this.invalidate();
    this.emit();
    return true;
  }

  /** Puts a piece of furniture away into storage (not the landlord's, not while in use). */
  store(uid: number): boolean {
    const obj = this.object(uid);
    if (!obj) return false;
    if (this.isObjectBusy(uid)) {
      this.notify('누군가 사용 중이에요', 'bad');
      this.emit();
      return false;
    }
    if (obj.landlord) {
      this.notify('집주인 가구라 보관함에 넣을 수 없어요 (옮기는 것은 돼요)', 'bad');
      this.emit();
      return false;
    }
    this.removeObjectReferences(uid);
    this.state.objects = this.state.objects.filter((o) => o.uid !== uid);
    // From land being built on (numbered on its own), it's given one of the household's numbers.
    this.storage.push({ ...obj, uid: this.owner ? this.owner.state.nextUid++ : obj.uid, fresh: undefined });
    this.invalidate();
    this.notify(`📦 ${josa(getDef(obj.defId).name, '을/를')} 보관함에 넣었어요`, 'info');
    this.emit();
    return true;
  }

  /** Sells something in storage, at what it is worth now. */
  sellStored(uid: number): boolean {
    const obj = this.storage.find((o) => o.uid === uid);
    if (!obj) return false;
    this.unstore(obj);
    const refund = objectValue(obj);
    this.state.money += refund;
    this.notify(`${josa(getDef(obj.defId).name, '을/를')} 팔았어요 (+§${refund})`, 'info');
    this.emit();
    return true;
  }

  isObjectBusy(uid: number): boolean {
    return this.state.dwellers.some((s) => !s.away && s.queue[0]?.kind === 'interact' && (s.queue[0] as { objectUid: number }).objectUid === uid && s.run !== null);
  }

  sell(uid: number): boolean {
    const obj = this.object(uid);
    if (!obj) return false;
    if (this.isObjectBusy(uid)) {
      this.notify('누군가 사용 중이에요', 'bad');
      return false;
    }
    if (obj.landlord) {
      this.notify('집주인 가구라 팔 수 없어요 (옮기는 것은 돼요)', 'bad');
      this.emit();
      return false;
    }
    this.removeObjectReferences(uid);
    this.state.objects = this.state.objects.filter((o) => o.uid !== uid);
    const refund = objectValue(obj);
    this.state.money += refund;
    this.invalidate();
    this.notify(`${getDef(obj.defId).name}을(를) 팔았어요 (+§${refund})`, 'info');
    this.emit();
    return true;
  }

  /** Buy mode stops time (참고 게임 build and buy mode); the speed it had comes back on leaving. */
  enterBuyMode() {
    if (this.state.pausedForBuy !== undefined) return;
    this.state.pausedForBuy = this.state.speed;
    this.state.speed = 0;
    this.emit();
  }

  /**
   * Leaving buy mode settles new purchases at their depreciated value (참고 게임 20% once), and time
   * runs again as it did before (unless set going in buy mode already).
   */
  leaveBuyMode() {
    for (const o of this.state.objects) delete o.fresh;
    const before = this.state.pausedForBuy;
    if (before === undefined) return;
    delete this.state.pausedForBuy;
    if (this.state.speed === 0 && !this.modalOpen()) this.state.speed = before;
    this.emit();
  }

  move(uid: number, x: number, y: number, dir: Dir): boolean {
    const obj = this.object(uid);
    if (!obj || this.isObjectBusy(uid) || !this.canPlace(obj.defId, x, y, dir, uid)) return false;
    const shut = this.wayBlocker(obj.defId, x, y, dir, uid);
    if (shut) {
      this.notify(shut, 'bad');
      return false;
    }
    this.removeObjectReferences(uid);
    Object.assign(obj, { x, y, dir });
    this.invalidate();
    this.emit();
    return true;
  }

  private removeObjectReferences(uid: number) {
    for (const s of this.state.dwellers) {
      s.queue = s.queue.filter((a, i) => i === 0 || !(a.kind === 'interact' && a.objectUid === uid));
      const first = s.queue[0];
      if (first?.kind === 'interact' && first.objectUid === uid) this.finishAction(s);
    }
  }
}

/** How far through a client's patience (a share) colleagues step in, the worker not having got to them. */
const MATES_STEP_IN = 0.35;

/** Land bought to build on (lots.ts EMPTY_LOT): its lawn, trees and mailbox, no one living there, the household's money to build with. */
function landState(plan: LotPlan, home: GameState): GameState {
  const ground = planTiles(plan);
  const tiles = [...ground, ...new Array<Tile>(LEVEL_TILES).fill('void')];
  const objects = planObjects(plan, 0, 1);
  return {
    version: 1,
    time: home.time,
    speed: home.speed,
    money: home.money,
    dwellers: [],
    objects,
    relationships: {},
    activeDwellerId: -1,
    freeWill: false,
    economy: { ...newEconomy(), lastBillDay: clockInfo(home.time).day },
    nextUid: objects.length + 1,
    nextActionId: 1,
    lifespan: 'off',
    lot: { ...lotInfoOf(plan), structure: 0 },
    tiles,
    paint: planPaint(plan, tiles),
    walls: {},
    yardPlanted: true,
    townies: [],
  };
}

/** The state of a work lot: its building and decor, its people, and a copy of the worker. */
/** Minutes before the worker's shift ends that their colleagues leave for home. */
const COLLEAGUES_LEAVE = 20;

/** A work lot's windows: along its outside walls, but none in the rooms its `windowless` pieces stand in. */
export function workWindows(def: Pick<WorkplaceDef, 'windowless'>, tiles: Tile[], objects: Array<Omit<PlacedObject, 'uid'>>): number[] {
  const all = autoWindows(tiles);
  if (!def.windowless?.length) return all;
  const rooms = computeRooms(tiles);
  const shut = new Set<string>();
  for (const o of objects) {
    if (!def.windowless.includes(o.defId)) continue;
    for (const p of footprintTiles(getDef(o.defId), o.x, o.y, o.dir)) if (rooms[idx(p.x, p.y)] !== 'outside') shut.add(rooms[idx(p.x, p.y)]);
  }
  // A window's wall tile lies between the outside and one room, above or below it.
  return all.filter((i) => ![i - MAP_W, i + MAP_W].some((j) => j >= 0 && j < tiles.length && shut.has(rooms[j])));
}

function workLotState(def: WorkplaceDef, dweller: Dweller, home: GameState, end: number, rng: () => number, at: StageAt, mates: Townie[]): GameState {
  // The building with its restroom fitted, clear of where people stand (workplaceKit.ts).
  const fitted = workLayout(def);
  const tiles = fitted.tiles;
  const restroom = new Set(fitted.restrooms.flatMap((r) => r.cells));
  // Office floors by kind, and one wallpaper inside, laid per tile; the restroom tiled.
  const rooms = computeRooms(tiles);
  const paint: Paint = { floor: {}, wall: {} };
  tiles.forEach((t, i) => {
    const floor = restroom.has(i) ? 'aquaTile' : def.floors[t];
    if (floor && rooms[i] !== 'outside') paint.floor[i] = floor;
    const below = i + MAP_W;
    if (t === 'wall' && below < tiles.length && rooms[below] !== 'outside' && FLOOR_TILES.has(tiles[below])) paint.wall[i] = restroom.has(below) ? 'aquaTiles' : def.wall;
  });
  for (const [x0, y0, x1, y1, style] of def.ground ?? [])
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[idx(x, y)] === 'grass' || tiles[idx(x, y)] === 'path') paint.floor[idx(x, y)] = style;
  let uid = 1;
  const objects = fitted.objects.map((o) => ({ ...o, uid: uid++ }));
  const worker: Dweller = JSON.parse(JSON.stringify(dweller));
  Object.assign(worker, { away: null, queue: [], run: null, engagedWith: null, side: undefined, convo: undefined, x: 12, y: 13 });
  // This game's colleagues (colleagues.ts): their looks, face and traits; the boss where the workplace
  // puts one. Each comes in with their own day (colleagueLife.ts): a goal, maybe a worry or good news.
  for (const c of mates) {
    c.goal ??= drawGoal(rng);
    shiftWorries(c, rng);
    shiftJoy(c, rng);
  }
  const people = mates.map((c, i) => coworkerDweller(c, def.skill, i, end, rng));
  const relationships: Record<string, Relationship> = {};
  for (const p of people) {
    const key = relKey(dweller.id, p.id);
    relationships[key] = home.relationships[key] ?? newRelationship(10, 0, home.time);
  }
  // How the colleagues stand with each other: drawn the first time they work together, then kept.
  people.forEach((a, i) =>
    people.slice(i + 1).forEach((b) => {
      const key = relKey(a.id, b.id);
      if (!home.relationships[key]) {
        const seed = seedBond(rng, home.time);
        home.relationships[key] = newRelationship(seed.friend, seed.romance, home.time);
      }
      relationships[key] = home.relationships[key];
    }),
  );
  return {
    version: 1,
    time: home.time,
    speed: home.speed,
    money: 1_000_000,
    dwellers: [worker, ...people],
    objects,
    relationships,
    activeDwellerId: worker.id,
    freeWill: home.freeWill,
    economy: { ...newEconomy(), lastBillDay: clockInfo(home.time).day },
    nextUid: uid,
    nextActionId: 1,
    lifespan: 'off',
    tiles,
    paint,
    windows: workWindows(def, tiles, objects),
    townies: [],
    workplace: { careerId: def.careerId, workerId: dweller.id, tasks: dailyTasks(def, rng, at), points: 0, negative: 0, end, stage: at.stage, branch: at.branch, ...(at.level !== undefined ? { level: at.level } : {}) },
  };
}

/** A colleague (or a star, or someone a season brought in) at work on the lot until `end`, the `i`th standing along the room. */
function coworkerDweller(c: Townie, skill: SkillKey, i: number, end: number, rng: () => number = Math.random): Dweller {
  // Their needs are their own now (2026-10-26): they come in somewhere between rested and not.
  const start = () => 55 + Math.round(rng() * 40);
  const rung = colleagueAt(c);
  return {
    id: c.id,
    name: c.name,
    gender: c.gender,
    face: c.face,
    shirt: c.shirt,
    skin: c.skin,
    hair: c.hair,
    hairStyle: c.hairStyle,
    outfit: c.outfit,
    bottom: c.bottom,
    pants: c.pants,
    likes: c.likes,
    dislikes: c.dislikes,
    x: 4 + i * 3,
    y: 11,
    // Come in having talked on the way, and each going to their work in their own time: they all
    // started with too little `social` and decided together, so the day opened in talk (2026-11-01).
    needs: { hunger: start(), energy: start(), bladder: start(), hygiene: start(), fun: start() - 10, social: start() + 5 },
    skills: { ...NO_SKILLS(), [skill]: 5 + i, ...c.skills },
    ...(c.fears?.length ? { fears: [...c.fears], fearProgress: { ...c.fearProgress }, fearLevel: { ...c.fearLevel }, fearTalkDay: c.fearTalkDay } : {}),
    ...(c.joy ? { joy: c.joy } : {}),
    queue: [],
    run: null,
    job: null,
    away: null,
    engagedWith: null,
    idleTime: -rng() * 15,
    critCooldown: 0,
    warned: {},
    buffs: [
      ...(c.fears?.length ? [{ id: 'colleagueWorried', until: end }] : []),
      ...(c.joy ? [{ id: 'colleagueGlad', until: end }] : []),
    ] as Dweller['buffs'],
    emotion: 'fine',
    traits: c.traits ?? [],
    npc: { role: 'coworker', until: end, boss: !!c.workmate?.boss, ...(rung ? { rung } : {}) },
  };
}
