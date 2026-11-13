import { CONFIDANT_FRIENDSHIP, fearPull, supportPull } from './fears';
import { knownInner } from './dwellerKnowledge';
import { DESIRE_CURVES, LEARN, MAX_SKILL, NEED_KEYS, TODDLER_MAX_SKILL, WALK_SPEED } from './constants';
import { dutyWeight, isDuty } from './mind';
import { needsPutOffDuty } from './needEffects';
import { ELECTRONICS, getDef } from './catalog';
import { EMOTION_NEED_DRIVE, SKILL_EMOTION } from './emotions';
import { distTo, nearest } from './path';
import { relationshipUtility, sentimentAppeal, type Relationship } from './relationships';
import { SOCIALS, SOCIAL_BY_ID, partySizeWeight, socialBlocker, socialFits } from './socials';
import { helpPull } from './colleagueLife';
import { GUEST_FORBIDDEN } from './visitors';
import { CHILD_FORBIDDEN, isYoung } from './babies';
import { MOP_TIME } from './puddles';
import { traitCareDrive, traitDrive, traitNeedMul, traitSocialDrive } from './traits';
import { CAREER_BY_ID, levelOf, nextLevelOf } from './careers';
import { POTTY_TRAINED, TODDLER_ALLOWED } from './babies';
import { openGoals } from './party';
import { LIKE_MULTIPLIER, activityOf, dislikePull, dislikeTimes, missedPull, socialPull } from './preferences';
import { WANT_BY_ID } from './wants';
import { aspTargets, aspirationPull, type AspTargets } from './aspirations';
import { allowedWork } from './workRoles';
import { recentWorkFails, workSkillsShort } from './workTrouble';
import { hasRelatedJob, homePracticeFactor } from './workGrowth';
import { SLEEP_DESIRE_MUL, EXHAUSTED_ENERGY, WAKE_NEED, sleepDesire } from './sleep';
import type { Game } from './game';
import type { InteractionDef, NeedKey, Needs, NewAction, Dweller, SocialDef } from './types';

/** Below this nothing is worth doing and the dweller idles or wanders. */
const MIN_SCORE = 0.5;
/**
 * How many of the best-scoring options free will draws from. 참고 게임 tunes 10 for a big
 * world; our lot has far fewer objects, so 5 keeps choices sensible.
 */
const TOP_CHOICES = 5;
/** Options under this share of the best score are dropped (참고 게임 halves its threshold each pass). */
const RELATIVE_CUT = 0.5;
/** Needs within this share of the most urgent one are worked on first (참고 게임 tunes 0.51). */
const NEED_VARIANCE = 0.51;
/** Below this urgency no need is pressing and every option competes freely. */
const PRESSING = 0.4;
/** Options that fix a need the current activity is already fixing count for a quarter (참고 게임). */
export const ALREADY_SOLVING = 0.25;
/** Free will's extra pull towards the job's skill until today's practice is done (ours). */
const JOB_PRACTICE = 1.5;
/**
 * The dweller's own leanings together — traits, likes and dislikes, aspiration — kept within one range
 * (2026-10-26, ours: each has its own size, a like the most, then traits, then the aspiration; together
 * they never outweigh needs past this). Needs still come first: these scale an activity's appeal.
 */
export const PERSONAL_MAX = 4;
export const PERSONAL_MIN = 0.05;
export function personalPull(...parts: number[]): number {
  return Math.min(PERSONAL_MAX, Math.max(PERSONAL_MIN, parts.reduce((m, p) => m * p, 1)));
}
/** Practising a skill that went wrong at work lately (ours, 2026-10-26). */
export const WORK_FAIL_PULL = 1.3;
/** A party host's pull towards guests (ours, standing in for 참고 게임's party host role). */
const PARTY_HOST_SOCIAL = 2;
const PARTY_HOST_BONUS = 2;
const PARTY_GOAL_PULL = 1.5;
/** Score multiplier for activities that suit the current emotion (참고 게임 uses 1.4 for skills). */
const EMOTION_MATCH = 1.4;

/** Peak urgency, keeping curve desire (0..1) on the same scale as the skill bonus and MIN_SCORE. */
const DESIRE_SCALE = 8;

function sampleCurve(points: Array<[number, number]>, x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

/** How badly a dweller wants to raise need `k` at value v (0..100), read off that need's desire curve. */
export function urgency(k: NeedKey, v: number): number {
  return DESIRE_SCALE * sampleCurve(DESIRE_CURVES[k], v);
}

export function needsScore(dweller: Dweller, effects: Partial<Needs>, duration: number): number {
  const needs = dweller.needs;
  const drive = EMOTION_NEED_DRIVE[dweller.emotion];
  let score = 0;
  for (const k of NEED_KEYS) {
    const e = effects[k] ?? 0;
    if (e > 0) score += Math.min(e * duration, 100 - needs[k]) * urgency(k, needs[k]) * (drive?.[k] ?? 1) * traitNeedMul(dweller.traits, 'needDrive', k);
    else if (e < 0) score += e * duration * 0.05;
  }
  return score;
}

/**
 * Urge to tidy up dirty dishes, standing in for 참고 게임's StaticCommodity_Tidy: grows with the pile,
 * doubles while Uncomfortable, and Slobs never feel it (참고 게임 Slob tidy ×0).
 */
export function tidyScore(dweller: Dweller, dishes: number): number {
  if (dishes <= 0 || dweller.traits.includes('slob')) return 0;
  return dishes * 0.8 * (dweller.emotion === 'uncomfortable' ? 2 : 1);
}

/** What an interaction promises to free will: its real effects, or what it advertises instead. */
export function adEffects(inter: InteractionDef): Partial<Needs> {
  return inter.advertise ?? inter.effects;
}

/** A seat at a table makes a better place to eat (참고 게임 posture scoring: surface bonus). */
const TABLE_BONUS = 1.5;

/** At bedtime and in the small hours a bed calls even a rested dweller (ours, on top of 참고 게임's desire buffs). */
const NIGHT_PULL: Partial<Record<number, number>> = { 2: 1.5, 3: 6 };
const NIGHT_COOKING = 0.3;
const MORNING_WASH = 1.5;

/** How much less a bed appeals while a guest is over (ours). */
const HOSTING_BED = 0.3;

/** Below this, a dweller has a bite before turning in rather than wake hungry (ours). */
const BEDTIME_HUNGER = 45;

/** Ways to make food, which lose their appeal while a meal is already served (ours). */
const FOOD_MAKING = new Set(['cook', 'cookFamily', 'cookGourmet', 'grill', 'grillFamily', 'quickMeal', 'snack']);
const SERVED_FIRST = 0.4;

/**
 * Company makes a place nicer: a seat by others eating, a spot where others watch TV or listen
 * to music. Each one there adds a share, up to a cap (ours: a soft pull, never a rule).
 */
export const SHARED_KIND: Record<string, string> = { eat: 'eat', watch: 'tv', watchTv: 'tv', listen: 'music', dance: 'music', watchFish: 'fish' };
const COMPANY_BONUS = { eat: 0.4, other: 0.3 };
const COMPANY_CAP = { eat: 2.2, other: 1.9 };

/**
 * A family meal is worth it when others are home and hungry: each one adds half again, against
 * a 0.6 base for the longer, pricier cook (our stand-in for 참고 게임's recipe picker).
 */
export function familyMealAppeal(game: Game, dweller: Dweller): number {
  const hungry = game.state.dwellers.filter((s) => s !== dweller && !s.away && (!s.npc || s.npc.role === 'guest') && s.needs.hunger < 60).length;
  return 0.6 * (1 + 0.5 * hungry);
}

/**
 * How much a toddler needs this bit of care: feeding and changing by how low they are (like baby
 * care), teaching while the skill has room and the toddler is otherwise all right (ours).
 */
export function toddlerCareScore(toddler: Dweller, social: SocialDef): number {
  const t = social.toddler!;
  let score = needsScore(toddler, t.needs ?? {}, social.duration) * 2.5;
  // A hungry or messy toddler fusses until someone comes (ours).
  const needs = Object.keys(t.needs ?? {}) as (keyof Dweller['needs'])[];
  if (needs.some((k) => k !== 'social' && k !== 'fun' && toddler.needs[k] < 35)) score += 3;
  if (t.skill && toddler.skills[t.skill] < TODDLER_MAX_SKILL) score += NEED_KEYS.every((k) => toddler.needs[k] > 35) ? 1.2 : 0.3;
  return score;
}

/** Whether this dweller may do this at all: guests, children and toddlers each have things they can't. */
export function ageAllows(dweller: Dweller, inter: InteractionDef): boolean {
  if (dweller.npc && dweller.npc.role !== 'coworker' && GUEST_FORBIDDEN.has(inter.id)) return false;
  if (dweller.age === 'child' && CHILD_FORBIDDEN.has(inter.id)) return false;
  if (dweller.age === 'toddler' && !TODDLER_ALLOWED.has(inter.id) && !(inter.id === 'use' && dweller.skills.potty >= POTTY_TRAINED)) return false;
  return true;
}

/** The "advertisement" an interaction makes to a particular dweller. */
export function interactionScore(dweller: Dweller, inter: InteractionDef, dishes = 0, game?: Game, funMul = 1): number {
  if (inter.special === 'washDishes') return tidyScore(dweller, dishes);
  // Bills in the mailbox (참고 게임 StaticCommodity_PayBills, ad 2). Ours nags more as the bill ages, a
  // step every 12 hours, and a lot once the power is off, so it gets paid before the cut.
  if (inter.special === 'payBills') {
    const bill = game?.economy.bill;
    const hours = bill && game ? (game.state.time - bill.issuedAt) / 60 : 0;
    return 2 * (1 + hours / 12) * (game?.isCut('power') || game?.isCut('water') ? 4 : 1);
  }
  // Plants calling for care nag like chores (참고 게임 gardening tend interactions advertise to free will).
  if (inter.special === 'water' || inter.special === 'weed' || inter.special === 'harvest') return 2 + (dweller.traits.includes('slob') ? 0 : 0.5);
  // A broken appliance nags at a dweller like a mess does (our stand-in for 참고 게임's repair urge).
  // A grimy toilet or sink nags like dirty dishes; slobs barely notice (참고 게임 clean autonomy).
  if (inter.special === 'clean') return dweller.traits.includes('slob') ? 0.2 : 2 * (dweller.emotion === 'uncomfortable' ? 2 : 1);
  if (inter.special === 'repair') return dweller.traits.includes('slob') ? 0.5 : 2.5 * (dweller.emotion === 'uncomfortable' ? 2 : 1);
  const ad = adEffects(inter);
  const effects = funMul !== 1 && (ad.fun ?? 0) > 0 ? { ...ad, fun: ad.fun! * funMul } : ad;
  let score = needsScore(dweller, effects, inter.duration);
  // Emotional interactions call to the dweller who feels that way (참고 게임 commodity_Emotion_Autonomy_*).
  if (inter.moods?.includes(dweller.emotion)) score = (score + 1.5) * EMOTION_MATCH;
  // Practising is its own reward only for pure skill activities; eating isn't a hobby.
  const fillsNeed = NEED_KEYS.some((k) => (effects[k] ?? 0) > 0.5);
  // (Home practice gone as far as it goes without a job isn't its own reward any more: workGrowth.ts.)
  const stopped = !!inter.skill && !game?.state.workplace && inter.skill.rate !== LEARN.chore && homePracticeFactor(inter.skill.key, Math.floor(dweller.skills[inter.skill.key] ?? 0), hasRelatedJob(dweller, inter.skill.key)) === 0;
  if (inter.skill && !fillsNeed && !stopped && dweller.skills[inter.skill.key] < MAX_SKILL) {
    const content = NEED_KEYS.every((k) => dweller.needs[k] > 60);
    score += 1.5 + (content ? 1.5 : 0);
    if (dweller.emotion === SKILL_EMOTION[inter.skill.key]) score *= EMOTION_MATCH;
  }
  return score;
}

/**
 * Share of the trip spent actually doing the activity: duration / (duration + walk time).
 * A long walk barely matters for an 8-hour sleep but halves a quick snack.
 */
export function efficiency(duration: number, pathCost: number): number {
  return duration / (duration + pathCost / WALK_SPEED);
}

/** What a social with someone is wanted for (2026-10-26, ours): a want of the dweller's for it, and a guest's for the household they came to. */
export const WANT_SOCIAL_PULL = 1.4;
export const GUEST_HOST_PULL = 1.6;

export function visitPull(dweller: Dweller, other: Dweller, socialId: string): number {
  const wanted = (dweller.wants ?? []).some((w) => {
    const goal = WANT_BY_ID[w.defId]?.goal;
    return w.targetId === other.id && goal?.kind === 'social' && goal.ids.includes(socialId);
  });
  const host = dweller.npc?.role === 'guest' && !other.npc;
  return (wanted ? WANT_SOCIAL_PULL : 1) * (host ? GUEST_HOST_PULL : 1);
}

/**
 * A social's appeal: the needs it fills, scaled by how much the dweller likes this person (참고 게임 relationship
 * utility), and by the dweller's liked or disliked topics and the kind of person `other` is (preferences.ts).
 */
export function socialScore(dweller: Dweller, social: SocialDef, rel: Relationship, other?: Dweller, asp?: AspTargets | null): number {
  // The dweller's own leanings together (personalPull): traits, liked topics and people, the aspiration.
  const own = personalPull(traitSocialDrive(dweller.traits, social.id, social.category), socialPull(dweller, other, social.id), aspirationPull(asp ?? null, `social_${social.id}`, social.skillCheck));
  // Someone good with people sees a worry to hear out, or good news to share, and goes to it (×1–3).
  // Asking a colleague what's up: drawn by a face that shows something not yet told (dwellerKnowledge.ts).
  const asking = social.asks && other && (() => {
    const k = knownInner(dweller, other.id, { worries: other.fears ?? [], joy: other.joy });
    return k.unknownWorry || k.unknownJoy;
  })();
  const helping =
    (social.worried && other?.fears?.length && !other.buffs.some((b) => b.id === 'fearShared')) || (social.joyful && other?.joy) || asking ? helpPull(dweller.skills) : social.worried || social.asks ? 0.3 : 1;
  // Fears (fears.ts): what they're about kept away from or met; a fear on one's mind seeks a confidant.
  const fear = fearPull(dweller, social.id) * (social.id === 'deepTalk' && rel.friend >= CONFIDANT_FRIENDSHIP ? supportPull(dweller) : 1);
  const score = needsScore(dweller, social.effects, social.duration) * relationshipUtility(rel) * own * sentimentAppeal(rel, dweller.id, social.category) * helping * fear;
  return social.emotion && social.emotion === dweller.emotion ? score * EMOTION_MATCH : score;
}

export interface Candidate {
  score: number;
  action: NewAction;
  /** Needs this option raises. */
  fills: NeedKey[];
  /** A colleague's station work: whether it's the work of their level (workRoles.ts). */
  fit?: boolean;
}

/**
 * The needs free will works on first: those within 51% of the most urgent one (참고 게임's
 * motive pre-filter). Null when nothing is pressing, so fun, friends and skills compete freely.
 */
export function pressingNeeds(dweller: Dweller): Set<NeedKey> | null {
  const drive = EMOTION_NEED_DRIVE[dweller.emotion];
  const scores = NEED_KEYS.map((k) => [k, urgency(k, dweller.needs[k]) * (drive?.[k] ?? 1) * traitNeedMul(dweller.traits, 'needDrive', k)] as const);
  const top = Math.max(...scores.map(([, u]) => u));
  if (top < PRESSING) return null;
  return new Set(scores.filter(([, u]) => u >= top * NEED_VARIANCE).map(([k]) => k));
}

function fills(effects: Partial<Needs>): NeedKey[] {
  return NEED_KEYS.filter((k) => (effects[k] ?? 0) > 0);
}

/**
 * The needs an interaction goes towards. Fixing a broken object goes towards what the object is
 * for: with the fridge and stove burnt out, repairing them is the way to a meal (ours; 참고 게임 lets a
 * hungry dweller keep at a repair, whose progress the object keeps).
 */
export function needsServed(defId: string, inter: InteractionDef): NeedKey[] {
  if (inter.special !== 'repair') return fills(adEffects(inter));
  return [...new Set(getDef(defId).interactions.filter((i) => i.special !== 'repair').flatMap((i) => fills(adEffects(i))))];
}

/** What is left of an activity already under way, to weigh against switching (opportunity cost). */
export function remainingScore(dweller: Dweller, inter: InteractionDef, elapsed: number): number {
  return interactionScore(dweller, { ...inter, duration: Math.max(0, inter.duration - elapsed) });
}

/**
 * Every reachable interaction and social, scored by how much it would satisfy the dweller's
 * current needs, discounted by the walk there. Best first. When some needs are pressing,
 * only options that fix them are offered (falling back to everything if none can).
 */
export function rankOptions(game: Game, dweller: Dweller, onlyNeed?: NeedKey): Candidate[] {
  const map = game.routeFrom(dweller);
  const cands: Candidate[] = [];
  // What work asks of the dweller that they haven't got, and what went wrong there lately (workTrouble.ts).
  const workShort = new Set(workSkillsShort(dweller, game.state.time));
  const workFailed = new Set(recentWorkFails(dweller, game.state.time));
  // The aspiration's unmet goals, worked out only if something asks.
  let aspDone = false;
  let aspT: AspTargets | null = null;
  const asp = () => (aspDone ? aspT : ((aspDone = true), (aspT = aspTargets(game, dweller))));
  // The work a colleague's level does, in the pilot's careers (workRoles.ts); null for anyone else.
  const allowed = dweller.npc?.role === 'coworker' && game.state.workplace ? allowedWork(game.state.workplace.careerId, dweller.npc.rung) : null;

  for (const obj of game.state.objects) {
    const def = getDef(obj.defId);
    for (const inter of def.interactions) {
      if (inter.autonomous === false) continue;
      if (!ageAllows(dweller, inter)) continue;
      if (inter.moods && !inter.moods.includes(dweller.emotion)) continue;
      if (onlyNeed && !((adEffects(inter)[onlyNeed] ?? 0) > 0)) continue;
      if (!game.meetsRequirement(dweller, obj, inter)) continue;
      if (game.injuryBlocker(dweller, inter) || game.bathroomBlocker(dweller, obj)) continue;
      if (inter.cooldownBuff && dweller.buffs.some((b) => b.id === inter.cooldownBuff)) continue;
      // Free will only puts a dweller to bed for the night when the sleep schedule allows it, or when
      // exhausted (참고 게임 bed_Autonomous_Sleep tests: a sleep desire buff or Energy_Exhausted).
      const desire = dweller.npc ? 0 : sleepDesire(dweller, game.state.time);
      if (inter.id === 'sleep' && !dweller.npc && !desire && dweller.needs.energy >= EXHAUSTED_ENERGY) continue;
      // Not straight into bed with a full bladder, only to get up again (ours).
      if (inter.id === 'sleep' && dweller.needs.bladder < WAKE_NEED.bladder + 5) continue;
      // Bedtime is for a proper night's sleep, not a nap (ours).
      if (inter.id === 'nap' && desire >= 2) continue;
      // Free will scrubs a fixture once it's actually grimy (참고 게임 Dirty_Dirty), not at the first smudge.
      if (inter.special === 'clean' && !game.isDirty(obj)) continue;
      // Free will doesn't set up a game alone; it joins someone waiting at the board.
      if (inter.players && !game.chessWaiting(obj, dweller)) continue;
      if (inter.cost && game.state.money < inter.cost) continue;
      // Badly shocked, nobody goes back to fixing electronics of their own accord (참고 게임 Dazed; ours).
      if (inter.special === 'repair' && ELECTRONICS.has(obj.defId) && dweller.buffs.some((b) => b.id === 'shockWarning')) continue;
      // Free will doesn't spend the last of the money on materials for a hobby (ours).
      if (inter.special === 'woodwork' && game.state.money < 500) continue;
      if (!game.hasRoom(obj, inter, dweller)) continue;
      if ((dweller.avoid?.[obj.uid] ?? 0) > game.state.time) continue;
      // Each dweller sleeps in their own bed (참고 게임 use_only).
      if (game.isBed(obj) && !game.canClaimBed(dweller, obj)) continue;
      const spot = nearest(map, game.usableSpots(obj, inter));
      if (!spot) continue;
      let base = interactionScore(dweller, inter, game.state.dishes ?? 0, game, game.funMultiplier(obj, inter));
      // Looking after the baby is scored by how badly the baby needs it.
      if (inter.baby) {
        const baby = game.babyIn(obj);
        base = baby && dweller.age !== 'child' ? needsScore(baby, inter.baby, inter.duration) * 1.5 + needsScore(dweller, inter.effects, inter.duration) : 0;
      }
      if ((inter.serves ?? 1) > 1) base *= familyMealAppeal(game, dweller);
      // Feeding a hungry toddler at the high chair is scored like feeding them by hand (ours).
      if (inter.special === 'serveHighChair') {
        const hungriest = Math.min(...game.state.dwellers.filter((t) => t.age === 'toddler' && !t.away).map((t) => t.needs.hunger));
        base = ((100 - hungriest) / 20) * traitCareDrive(dweller.traits);
      }
      if (inter.special === 'usePotty') base += 1;
      if (inter.baby) base *= traitCareDrive(dweller.traits);
      const activity = activityOf(inter.id);
      // Liked: more the longer it's gone undone; disliked: less the more it's been done lately.
      const liking =
        activity && dweller.likes?.includes(activity.id)
          ? LIKE_MULTIPLIER * missedPull(game.state.time - (dweller.likedAt?.[activity.id] ?? game.state.time))
          : activity && dweller.dislikes?.includes(activity.id)
            ? dislikePull(dislikeTimes(dweller.dislikedDone?.[activity.id], game.state.time))
            : 1;
      base *= personalPull(traitDrive(dweller.traits, inter.id), liking, aspirationPull(asp(), inter.countAs ?? inter.id, inter.skill?.key));
      // Practising the job's skill counts for the next shift (our stand-in for 참고 게임's career whims).
      const career = dweller.job && CAREER_BY_ID[dweller.job.careerId];
      // Fears (fears.ts fearPull): kept away from what they're about, or, with a strong heart, met.
      if (dweller.fears?.length) {
        const practice = !!inter.skill && !NEED_KEYS.some((k) => (adEffects(inter)[k] ?? 0) > 0.5);
        const jobPractice = !!career && !!inter.skill && inter.skill.key === career.skill;
        base *= fearPull(dweller, inter.id, ...(practice ? ['practice'] : []), ...(jobPractice ? ['jobPractice'] : []), ...(game.nightOutside(obj) ? ['nightOutside'] : []));
      }
      if (career && inter.skill) {
        // So does a skill the next promotion is waiting on (ours: free will keeps a career moving).
        const key = inter.skill.key;
        const need = levelOf(dweller.job!).needs?.find(([k]) => k === key)?.[1];
        const blocked = need !== undefined && dweller.skills[key] < need && !!nextLevelOf(dweller.job!);
        const task = key === career.skill && (!career.school || inter.id === 'homework') && (dweller.job!.task ?? 0) < 1;
        // And one work needs at this rung that the dweller is short of; more after it went wrong (2026-10-26).
        if (task || blocked || workShort.has(key)) base *= JOB_PRACTICE;
        if (blocked && dweller.job!.performance >= 80) base *= JOB_PRACTICE;
        if (workFailed.has(key)) base *= WORK_FAIL_PULL;
      }
      if (inter.special === 'eat' && game.atTable(obj)) base *= TABLE_BONUS;
      // 절제력: duties weigh a little more (mind.ts; a nudge, never an order).
      if (!dweller.npc && isDuty(inter)) base *= dutyWeight(dweller.skills.selfControl ?? 0) * (needsPutOffDuty(dweller) ? 0.3 : 1);
      // A want of theirs leans them towards it (ours): a nudge, the player's to act on.
      if (!dweller.npc && (dweller.wants ?? []).some((w) => { const g = WANT_BY_ID[w.defId]?.goal; return g?.kind === 'interaction' && g.ids.includes(inter.id); })) base *= WANT_SOCIAL_PULL;
      // At work, what's still on the day's list pulls (ours, like party goals).
      const wp = game.state.workplace;
      if (wp && dweller.id === wp.workerId && wp.tasks.some((t) => t.count < t.need && t.does?.includes(inter.id))) base += PARTY_GOAL_PULL;
      // Colleagues are at work too: their stations come before a chat.
      if (wp && dweller.npc?.role === 'coworker' && inter.requires === 'atWork') base += PARTY_GOAL_PULL * 0.5;
      // A call-out comes before anything else that isn't urgent (ours).
      if (inter.requires === 'workAlarm') base += PARTY_GOAL_PULL * 10;
      if ((inter.id === 'sleep' || inter.id === 'toddlerNap') && desire) base = base * SLEEP_DESIRE_MUL[desire] + (NIGHT_PULL[desire] ?? 0);
      // With a friend over, bed waits unless the dweller is worn out or it's the small hours (ours).
      if ((inter.id === 'sleep' || inter.id === 'nap') && !dweller.npc && desire !== 3 && dweller.needs.energy >= EXHAUSTED_ENERGY && game.hasGuest()) base *= HOSTING_BED;
      // Supper comes first, so the night isn't broken by hunger (ours).
      if (inter.id === 'sleep' && dweller.needs.energy >= EXHAUSTED_ENERGY && dweller.needs.hunger < BEDTIME_HUNGER) base *= 0.4;
      if (FOOD_MAKING.has(inter.id) && game.servingsLeft() > 0) base *= SERVED_FIRST;
      // In the small hours a bite will do; nobody starts a proper meal at 3am (ours).
      if (desire === 3 && (inter.serves ?? 0) >= 1) base *= NIGHT_COOKING;
      // Washing up before work or school (ours: 참고 게임 leaves it to the hygiene motive).
      if (!dweller.npc && dweller.needs.hygiene < 60 && (adEffects(inter).hygiene ?? 0) >= 1 && game.beforeShift(dweller, 180)) base *= MORNING_WASH;
      const kind = SHARED_KIND[inter.id];
      if (kind) {
        const company = game.othersDoing(dweller, obj, kind);
        const k = kind === 'eat' ? 'eat' : 'other';
        if (company) base *= Math.min(COMPANY_CAP[k], 1 + COMPANY_BONUS[k] * company);
      }
      // Hosting a party: less time alone with a book or a hobby (참고 게임 party roles steer the host to guests).
      if (game.state.party && !dweller.npc && inter.skill && !inter.chatty) base *= 0.25;
      // Party goals still open pull everyone towards them (참고 게임 party roles favour eating, drinking, music).
      const open = game.state.party ? openGoals(game.state.party).map((g) => g.kind) : [];
      // The birthday cake isn't made or blown out by free will outside a birthday party (참고 게임 StaticCommodity_MakeBirthdayCake comes with the event).
      if ((inter.id === 'bakeCake' || inter.id === 'blowCandles') && game.state.party?.kind !== 'birthday') continue;
      if (inter.id === 'blowCandles' && dweller.id !== game.state.party?.celebrantId) continue;
      if (open.length) {
        // The cake is the heart of a birthday (참고 게임 roles gather everyone for it): made early, candles out once it's there (ours: strong pulls).
        if (open.includes('blowCandles') && inter.id === 'bakeCake' && !dweller.npc) base += PARTY_GOAL_PULL * 4;
        if (open.includes('blowCandles') && inter.id === 'blowCandles') base += PARTY_GOAL_PULL * 8;
        if (open.includes('eatCake') && inter.id === 'eatCake') base += PARTY_GOAL_PULL;
        if ((open.includes('callToMeal') || open.includes('craftMeal')) && (inter.serves ?? 1) > 1 && !dweller.npc && dweller.id === game.state.party!.hostId) base += PARTY_GOAL_PULL * 2;
        if (open.includes('craftDrinks') && inter.id === 'mixDrink') base += PARTY_GOAL_PULL;
        if (open.includes('eat') && (inter.serves ?? 1) > 1 && !dweller.npc && game.servingsLeft() === 0) base += PARTY_GOAL_PULL;
        if (open.includes('eat') && inter.special === 'eat') base *= 1.5;
        if (open.includes('drinks') && inter.id === 'mixDrink') base += PARTY_GOAL_PULL;
        if ((open.includes('dancing') && inter.id === 'dance') || (open.includes('listening') && inter.id === 'listen')) base += PARTY_GOAL_PULL;
        const dating = game.state.party?.kind === 'date' && (dweller.id === game.state.party.hostId || dweller.id === game.state.party.partnerId);
        if (dating && ((open.includes('dateDance') && inter.id === 'dance') || (open.includes('dateChess') && inter.id === 'playChess') || (open.includes('dateTv') && (inter.id === 'watch' || inter.id === 'watchTv')))) base += PARTY_GOAL_PULL * 2;
      }
      if (base <= 0) continue;
      // A quick errand like paying the bills shouldn't lose out just for being short.
      const duration = inter.special === 'payBills' ? Math.max(inter.duration, 15) : inter.duration;
      cands.push({
        score: base * efficiency(duration, distTo(map, spot)),
        action: { kind: 'interact', objectUid: obj.uid, interactionId: inter.id, autonomous: true },
        fills: needsServed(obj.defId, inter),
        ...(allowed && inter.requires === 'atWork' ? { fit: allowed.has(inter.id) } : {}),
      });
    }
  }

  // Puddles nag like dirty dishes do (참고 게임 StaticCommodity_MopPuddles), guests leave them be.
  const puddles = game.state.puddles ?? [];
  if (!onlyNeed && !dweller.npc && puddles.length) {
    for (const p of puddles) {
      // A wet floor is grosser than a dirty plate, and a mop-up is quick: three times the dish urge (ours).
      const base = tidyScore(dweller, puddles.length) * 3;
      if (base <= 0) break;
      cands.push({
        score: base * efficiency(MOP_TIME, distTo(map, p)),
        action: { kind: 'mop', x: p.x, y: p.y, autonomous: true },
        fills: [],
      });
    }
  }

  if (!onlyNeed || onlyNeed === 'social') {
    const myGroup = game.convoOf(dweller);
    const groupsSeen = new Set<number>();
    for (const other of game.state.dwellers) {
      if (other.id === dweller.id || other.away || other.npc?.leaving || other.age === 'baby' || other.npc?.role === 'burglar' || other.npc?.role === 'service' || other.npc?.role === 'reaper' || other.dying) continue;
      if (dweller.age === 'toddler' || (other.age === 'toddler' && (dweller.age === 'child' || dweller.npc))) continue;
      // Townies outside are only for household members to greet; guests mingle with whoever is in.
      if ((dweller.npc || other.npc?.role === 'walkby') && other.npc && other.npc.role !== 'guest') continue;
      // Approaching someone in a conversation: 참고 게임's party-size weight, relationship averaged
      // over the circle (autonomy_modes relationship_scoring). Members of our own circle are just mixers.
      const theirGroup = myGroup.includes(other) ? [] : game.convoOf(other);
      const partyWeight = partySizeWeight(theirGroup.length);
      if (theirGroup.length >= 2 && partyWeight > 0 && !groupsSeen.has(other.convo!.id)) {
        groupsSeen.add(other.convo!.id);
        const spot = nearest(map, theirGroup.flatMap((m) => game.socialSpots(m)));
        const chat = SOCIAL_BY_ID.chat;
        // Afraid of a crowd or of being judged, a circle is kept clear of (fears.ts).
        const base = (theirGroup.reduce((sum, m) => sum + socialScore(dweller, chat, game.relationship(dweller.id, m.id), m, asp()), 0) / theirGroup.length) * fearPull(dweller, 'joinConversation');
        const host = spot && theirGroup.reduce((a, b) => (Math.hypot(a.x - spot.x, a.y - spot.y) <= Math.hypot(b.x - spot.x, b.y - spot.y) ? a : b));
        const hosting = (game.state.party?.kind !== 'date' && !!game.state.party && !dweller.npc && theirGroup.some((m) => m.npc?.role === 'guest')) || theirGroup.some((m) => game.onDate(dweller, m));
        if (spot && host && base > 0)
          cands.push({
            score: (hosting ? base * PARTY_HOST_SOCIAL + PARTY_HOST_BONUS : base) * partyWeight * efficiency(chat.duration, distTo(map, spot)),
            action: { kind: 'social', targetId: host.id, socialId: 'joinConversation', autonomous: true },
            fills: fills(chat.effects),
          });
      }
      // Someone mid-social is spoken for until they finish (their circle can still be joined).
      const talking = other.queue[0]?.kind === 'social' && other.run?.phase === 'performing';
      const pickUp = other.age === 'toddler' && !game.toddlerAsleep(other);
      if (other.engagedWith !== null || talking || (game.isBusyOnObject(other) && !pickUp)) continue;
      // Nobody stops the worker for a chat while a call-out is waiting.
      if (game.state.workplace?.alarm && other.id === game.state.workplace.workerId) continue;
      const spot = nearest(map, game.socialSpots(other));
      if (!spot) continue;
      const rel = game.relationship(dweller.id, other.id);
      for (const social of autonomousSocials(rel, isYoung(dweller.age) || isYoung(other.age) || !!game.romanceBlocked(dweller, other), dweller.emotion === 'angry', dweller)) {
        if (!socialFits(social, other, dweller, !!other.npc && !!game.state.townies?.find((x) => x.id === other.id)?.workmate)) continue;
        // The people who come in are the worker's job, and pull like the day's tasks (ours).
        if (social.work) {
          if (dweller.id !== game.state.workplace?.workerId) continue;
          cands.push({
            score: (socialScore(dweller, social, rel, other, asp()) + PARTY_GOAL_PULL * 2) * efficiency(social.duration, distTo(map, spot)),
            action: { kind: 'social', targetId: other.id, socialId: social.id, autonomous: true },
            fills: fills(social.effects),
          });
          continue;
        }
        // At the door the only sensible thing is to let them in.
        if (other.npc?.role === 'doorbell' && social.id !== 'welcome') continue;
        // Letting someone in is worth the visit it starts, so it scores like a chat.
        const scored = social.id === 'welcome' ? SOCIAL_BY_ID.chat : social;
        if (social.toddler) {
          const care = toddlerCareScore(other, social) * traitCareDrive(dweller.traits);
          if (care > 0)
            cands.push({
              score: care * efficiency(social.duration, distTo(map, spot)),
              action: { kind: 'social', targetId: other.id, socialId: social.id, autonomous: true },
              fills: [],
            });
          continue;
        }
        const hostingGuest =
          (game.state.party?.kind !== 'date' && !!game.state.party && !dweller.npc && other.npc?.role === 'guest' && social.category !== 'mean') ||
          (game.onDate(dweller, other) && social.category !== 'mean' && social.category !== 'mischief');
        const plain = hostingGuest ? socialScore(dweller, scored, rel, other, asp()) * PARTY_HOST_SOCIAL + PARTY_HOST_BONUS : socialScore(dweller, scored, rel, other, asp());
        const base = plain * visitPull(dweller, other, social.id);
        if (base <= 0) continue;
        cands.push({
          score: base * partyWeight * efficiency(scored.duration, distTo(map, spot)),
          action: { kind: 'social', targetId: other.id, socialId: social.id, autonomous: true },
          fills: fills(scored.effects),
        });
      }
    }
  }

  // Their level's work while a station for it is free; with none, whatever's there, as ever, rather than standing about.
  if (allowed && cands.some((c) => c.fit)) {
    // At work they work (2026-11-02, at the user's request): a break now and then, and the toilet or a meal when it's pressing. Nobody naps or settles down with a novel on shift.
    const free = onBreak(dweller.id, game.state.time);
    const body = pressingNeeds(dweller);
    for (let i = cands.length - 1; i >= 0; i--) {
      const c = cands[i];
      if (c.fit) continue;
      const urgent = !!body && c.fills.some((k) => (k === 'bladder' || k === 'hunger') && body.has(k));
      if (c.fit === false || !(free || urgent) || (c.action.kind === 'interact' && ON_SHIFT_NEVER.has(c.action.interactionId))) cands.splice(i, 1);
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const pressing = onlyNeed ? null : pressingNeeds(dweller);
  if (!pressing) return cands;
  const focused = cands.filter((c) => c.fills.some((k) => pressing.has(k)));
  return focused.length > 0 ? focused : cands;
}

/** Socials free will may start on its own: romance needs a spark, kisses a partner. */
function autonomousSocials(rel: Relationship, young = false, angry = false, actor?: Dweller): SocialDef[] {
  const together = rel.flags.includes('partner') || rel.flags.includes('engaged');
  return SOCIALS.filter((social) => {
    if (social.join || social.autonomous === false || socialBlocker(social, rel, actor)) return false;
    // Pranks are for a playful mood (참고 게임 mischief socials are mostly reached for when Playful).
    if (social.category === 'mischief' && actor?.emotion !== 'playful') return false;
    if (young && social.category === 'romance') return false;
    // Only an angry dweller goes looking for trouble.
    if (social.category === 'mean' && !angry) return false;
    if (social.category === 'romance' && rel.romance < 10 && !together) return false;
    return social.id !== 'kiss' || together;
  });
}

/**
 * A social to run on top of a light activity (참고 게임 multitasking): dwellers on the sofa, at the TV or
 * by the stereo chat with a neighbour doing the same, without getting up. Drawn like any other
 * free-will choice from the best few by score.
 */
export function chooseSideSocial(game: Game, dweller: Dweller): { targetId: number; socialId: string } | null {
  const cands: Array<{ score: number; targetId: number; socialId: string }> = [];
  const t = aspTargets(game, dweller);
  for (const other of game.state.dwellers) {
    if (!game.canSideChat(dweller, other)) continue;
    const rel = game.relationship(dweller.id, other.id);
    for (const social of autonomousSocials(rel, isYoung(dweller.age) || isYoung(other.age) || !!game.romanceBlocked(dweller, other), false, dweller)) {
      if (!socialFits(social, other, dweller, !!other.npc && !!game.state.townies?.find((x) => x.id === other.id)?.workmate) || social.work) continue;
      const score = socialScore(dweller, social, rel, other, t);
      if (score >= MIN_SCORE) cands.push({ score, targetId: other.id, socialId: social.id });
    }
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.score - a.score);
  const top = cands.filter((c) => c.score >= cands[0].score * RELATIVE_CUT).slice(0, TOP_CHOICES);
  let roll = game.rng() * top.reduce((s, c) => s + c.score, 0);
  for (const c of top) {
    roll -= c.score;
    if (roll <= 0) return { targetId: c.targetId, socialId: c.socialId };
  }
  return { targetId: top[0].targetId, socialId: top[0].socialId };
}

/** The options free will actually draws from, with each one's chance of being picked. */
export function topChoices(cands: Candidate[]): Array<Candidate & { chance: number }> {
  const best = cands[0]?.score ?? 0;
  const top = cands.filter((c) => c.score >= MIN_SCORE && c.score >= best * RELATIVE_CUT).slice(0, TOP_CHOICES);
  const total = top.reduce((s, c) => s + c.score, 0);
  return top.map((c) => ({ ...c, chance: c.score / total }));
}

/** A colleague's breaks: 20 minutes in every 2½ hours, each at their own time. */
const BREAK_EVERY = 150;
const BREAK_FOR = 20;
export const onBreak = (id: number, time: number) => (time + id * 37) % BREAK_EVERY < BREAK_FOR;
const ON_SHIFT_NEVER = new Set(['nap', 'sleep', 'read', 'readLogic', 'readPsychology']);

/**
 * Dwellers-style free will: draw among the best few options, weighted by score.
 * With `onlyNeed`, returns the single best option that raises that need.
 */
export function chooseAutonomous(game: Game, dweller: Dweller, onlyNeed?: NeedKey): NewAction | null {
  const cands = rankOptions(game, dweller, onlyNeed);
  if (cands.length === 0 || cands[0].score < MIN_SCORE) return null;
  if (onlyNeed) return cands[0].action;

  const top = topChoices(cands);
  let roll = game.rng();
  for (const c of top) {
    roll -= c.chance;
    if (roll <= 0) return c.action;
  }
  return top[0].action;
}
