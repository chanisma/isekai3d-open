import { SKILL_INFO } from './constants';
import type { RelFlag, Relationship } from './relationships';
import type { Known } from './dwellerKnowledge';
import type { SkillKey, SocialDef } from './types';
import { WORK_SOCIALS } from './workplace';

/**
 * Socials, modelled on representative 참고 게임 mixers (docs/ref-game/04 §2.5): each has a
 * context category and score lines, and three outcomes whose relationship changes use 참고 게임's
 * diminishing gain tiers. Milestone socials (first kiss, asking out, proposing, best friends)
 * need relationship thresholds and are player-only.
 */
/** A conversation group holds while its members stay this close (참고 게임 SocialGroup chat max_radius 4 m). */
export const GROUP_RADIUS = 4;
/** Minutes a group outlasts its last social. */
export const GROUP_LINGER = 20;
/** How far apart two dwellers can be to chat without leaving what they're doing (sofa to armchair). */
export const SIDE_RANGE = 2.5;
/** Share of a social's need gain that the rest of the group gets from listening. */
export const LISTENER_SHARE = 0.5;

/**
 * Free will's appetite for approaching someone already in a conversation of `size` dwellers
 * (참고 게임 dweller_Chat _party_size_weight_tuning: 0→1, 1→1, 2→0.5, 3+→0). Dwellers drift into a pair's
 * chat now and then but leave bigger circles alone; the player can still walk a fourth in.
 */
export function partySizeWeight(size: number): number {
  return size <= 1 ? 1 : size === 2 ? 0.5 : 0;
}

/**
 * Whether `social` makes sense with `target`: welcoming is for townies outside, asking to leave for guests.
 * With the `actor`: a colleague's worry is heard out, and their good news shared, by a household dweller
 * only once they've been told of it (dwellerKnowledge.ts, 2026-10-26); colleagues know each other's.
 * `colleague`: the target works with the household (a townie with a workmate) though not at work now
 * (come over as a guest).
 */
export function socialFits(
  social: SocialDef,
  target: { id?: number; npc?: { role: string; delivery?: boolean; leaving?: boolean; serves?: string; wants?: string; claimedBy?: number }; age?: string; fears?: string[]; joy?: string },
  actor?: { id?: number; npc?: unknown; knows?: Record<number, Known> },
  colleague = false,
): boolean {
  if (target.npc?.delivery) return false; // the pizza guy is working
  if (social.worried && !target.fears?.length) return false;
  if (social.joyful && !target.joy) return false;
  const guarded = !!actor && !actor.npc && (target.npc?.role === 'coworker' || colleague) && target.id !== undefined;
  const told = guarded ? actor!.knows?.[target.id!] : undefined;
  if (guarded && social.worried && !target.fears!.some((f) => told?.worries?.includes(f as never))) return false;
  if (guarded && social.joyful && told?.joy !== target.joy) return false;
  if (social.asks) return guarded;
  // The people who come in to a workplace are there for the job, and for what they came for.
  const npc = target.npc;
  // A colleague already seeing to them has them: nobody else starts on them.
  if (npc?.claimedBy !== undefined && npc.claimedBy !== actor?.id) return false;
  if (social.work) return npc?.role === 'client' && !npc.leaving && social.work.includes(npc.serves ?? '') && (npc.wants ?? social.id) === social.id;
  if (npc?.role === 'client') return false;
  // A toddler can be fed, changed, taught and played with, and nothing else.
  if (!!social.toddler !== (target.age === 'toddler')) return false;
  const role = target.npc?.role;
  if (social.visitor === 'outside') return role === 'doorbell' || role === 'walkby';
  if (social.visitor === 'guest') return role === 'guest';
  // Squaring up to a burglar still at it; one on the way out is left to go (and is never chatted with).
  if (social.visitor === 'burglar') return role === 'burglar' && !npc?.leaving;
  if (role === 'burglar') return false;
  return true;
}

/** Chance the one who starts a fight wins it: fitness tells, hot heads hit harder (ours). */
export function fightWinChance(attacker: { skills: { fitness: number }; traits: string[] }, defender: { skills: { fitness: number }; traits: string[] }): number {
  const edge = 0.06 * (attacker.skills.fitness - defender.skills.fitness) + (attacker.traits.includes('hotHeaded') ? 0.1 : 0) - (defender.traits.includes('hotHeaded') ? 0.1 : 0);
  return Math.max(0.1, Math.min(0.9, 0.5 + edge));
}

export const SOCIALS: SocialDef[] = [
  {
    id: 'chat',
    label: '수다 떨기',
    icon: '💬',
    duration: 25,
    effects: { social: 1.6, fun: 0.3 },
    category: 'friendly',
    great: 10,
    fail: -10,
    outcomes: {
      great: { friend: 'M', mood: { friendly: 10 }, actorBuff: [{ id: 'deepConnection', chance: 0.3 }], targetBuff: [{ id: 'deepConnection', chance: 0.3 }] },
      ok: { friend: 'S', mood: { friendly: 5 } },
      fail: { friend: '-S', mood: { friendly: -10, awkward: -10 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  // Learning about someone (참고 게임 mixer_Social_GetToKnow_Friendly_STC: score ≥10 Rel_Gain_Medium,
  // ≤−10 a flop; dwellerKnowledge.ts tells one trait or like when it goes well).
  {
    id: 'getToKnow',
    label: '알아가기',
    icon: '🔍',
    duration: 15,
    effects: { social: 1.4, fun: 0.2 },
    category: 'friendly',
    great: 10,
    fail: -10,
    outcomes: {
      great: { friend: 'M', mood: { friendly: 8 } },
      ok: { friend: 'S', mood: { friendly: 4 } },
      fail: { friend: '-S', mood: { awkward: -8 }, actorBuff: [{ id: 'awkward', chance: 0.5 }] },
    },
  },
  // Asking about someone's work (참고 게임 mixer_social_AskAboutCareer_friendly_STC → know_other_dwellers_career);
  // ours: they say what the job is and why its main competency matters. Player-directed, so it is
  // the student who goes and asks.
  {
    id: 'askAboutCareer',
    label: '직업에 대해 묻기',
    icon: '💼',
    duration: 20,
    effects: { social: 1.3, fun: 0.2 },
    category: 'friendly',
    great: 10,
    fail: -15,
    autonomous: false,
    outcomes: {
      great: { friend: 'S', mood: { friendly: 6 } },
      ok: { friend: 'S', mood: { friendly: 3 } },
      fail: { friend: '-S', mood: { awkward: -6 } },
    },
  },
  {
    // Hearing someone's worry out (2026-10-26, at the user's request): only towards someone carrying
    // a fear; it eases it (more from someone good with people, colleagueLife.ts listenShare).
    id: 'hearOut',
    label: '고민 들어주기',
    icon: '👂',
    duration: 25,
    effects: { social: 1.4 },
    category: 'friendly',
    great: 12,
    fail: -12,
    worried: true,
    skillCheck: 'empathy',
    requires: { friendMin: -10 },
    outcomes: {
      great: { friend: 'M', mood: { friendly: 15 }, targetBuff: [{ id: 'fearShared', chance: 1 }] },
      ok: { friend: 'S', mood: { friendly: 8 } },
      fail: { friend: '-S', mood: { awkward: -10 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    // Sharing in someone's good news (2026-10-26, at the user's request: joys as well as worries).
    id: 'shareJoy',
    label: '기쁜 일 함께 기뻐하기',
    icon: '🥳',
    duration: 15,
    effects: { social: 1.6, fun: 0.8 },
    category: 'friendly',
    great: 8,
    fail: -15,
    joyful: true,
    skillCheck: 'charisma',
    requires: { friendMin: -10 },
    outcomes: {
      great: { friend: 'M', mood: { friendly: 15, fun: 15 }, actorBuff: [{ id: 'joyShared', chance: 1 }], targetBuff: [{ id: 'joyShared', chance: 1 }] },
      ok: { friend: 'S', mood: { friendly: 8, fun: 8 }, targetBuff: [{ id: 'joyShared', chance: 1 }] },
      fail: { friend: '-S', mood: { awkward: -10 } },
    },
  },
  {
    // Asking a colleague what's up (2026-10-26, at the user's request): what shows on their face, and
    // what's behind it — good news, a worry (if they trust the dweller), a need, what they're after.
    id: 'askWhatsUp',
    label: '무슨 일 있는지 묻기',
    icon: '❔',
    duration: 15,
    effects: { social: 1.2 },
    category: 'friendly',
    great: 10,
    fail: -12,
    asks: true,
    skillCheck: 'empathy',
    requires: { friendMin: -20 },
    outcomes: {
      great: { friend: 'S', mood: { friendly: 6 } },
      ok: { friend: 'S', mood: { friendly: 3 } },
      fail: { friend: '-S', mood: { awkward: -6 } },
    },
  },
  {
    id: 'deepTalk',
    label: '깊은 대화 나누기',
    icon: '🫂',
    duration: 30,
    effects: { social: 1.8, fun: 0.2 },
    category: 'friendly',
    great: 15,
    fail: -10,
    requires: { friendMin: 35 },
    outcomes: {
      great: { friend: 'M', mood: { friendly: 15 }, actorBuff: [{ id: 'deepConnection', chance: 1 }], targetBuff: [{ id: 'deepConnection', chance: 1 }] },
      ok: { friend: 'S', mood: { friendly: 5 } },
      fail: { friend: '-S', mood: { awkward: -15 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    id: 'joke',
    label: '농담하기',
    icon: '😂',
    duration: 12,
    effects: { social: 1.2, fun: 1.0 },
    category: 'funny',
    emotion: 'playful',
    great: 15,
    fail: -5,
    outcomes: {
      great: { friend: 'S', mood: { fun: 15 }, actorBuff: [{ id: 'goodJoke', chance: 1 }], targetBuff: [{ id: 'goodJoke', chance: 1 }] },
      ok: { friend: 'S', mood: { fun: 5 } },
      fail: { friend: '-S', mood: { fun: -10 }, actorBuff: [{ id: 'awkward', chance: 1 }], targetBuff: [{ id: 'dullHumor', chance: 1 }] },
    },
  },
  {
    id: 'compliment',
    label: '칭찬하기',
    icon: '🌟',
    duration: 8,
    effects: { social: 1.5 },
    category: 'friendly',
    emotion: 'confident',
    great: 15,
    fail: -7,
    outcomes: {
      great: { friend: 'M', mood: { friendly: 10 }, targetBuff: [{ id: 'flattered', chance: 1 }] },
      ok: { friend: 'S', targetBuff: [{ id: 'flattered', chance: 0.5 }] },
      fail: { friend: '-S', actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    id: 'hug',
    label: '포옹하기',
    icon: '🤗',
    duration: 6,
    effects: { social: 3 },
    category: 'friendly',
    affectionate: true,
    great: 15,
    fail: -10,
    requires: { friendMin: 35, orFlags: ['partner', 'engaged'] },
    outcomes: {
      great: { friend: 'M', actorBuff: [{ id: 'warmHug', chance: 1 }], targetBuff: [{ id: 'warmHug', chance: 1 }] },
      ok: { friend: 'S', actorBuff: [{ id: 'warmHug', chance: 1 }], targetBuff: [{ id: 'warmHug', chance: 1 }] },
      fail: { friend: '-S', mood: { awkward: -10 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    id: 'flirt',
    label: '추파 던지기',
    icon: '😉',
    duration: 10,
    effects: { social: 1.2, fun: 0.3 },
    category: 'romance',
    emotion: 'flirty',
    great: 15,
    fail: -5,
    requires: { notFlags: ['enemy'] },
    outcomes: {
      great: { friend: 'S', romance: 'S', mood: { romance: 15 }, targetBuff: [{ id: 'flirtyMood', chance: 1 }] },
      ok: { friend: 'S', romance: 'S', mood: { romance: 5 } },
      fail: { friend: '-S', romance: '-S', mood: { awkward: -20 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    // 참고 게임's kiss, as affection between a couple (ours: the game has no first kiss; it comes after
    // they've started going out).
    id: 'kiss',
    label: '애정표현',
    icon: '🥰',
    duration: 5,
    effects: { social: 2 },
    category: 'romance',
    affectionate: true,
    great: 15,
    fail: -5,
    requires: { together: true },
    outcomes: {
      great: { romance: 'M', mood: { romance: 15 }, actorBuff: [{ id: 'flirtyMood', chance: 1 }], targetBuff: [{ id: 'flirtyMood', chance: 1 }] },
      ok: { romance: 'S', mood: { romance: 5 } },
      fail: { romance: '-S', mood: { awkward: -20 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    id: 'askPartner',
    label: '사귀자고 하기',
    icon: '💞',
    duration: 8,
    effects: { social: 1.5 },
    category: 'romance',
    autonomous: false,
    great: 10,
    fail: -10,
    // Ours: friends first, and not the day they met.
    requires: { romanceMin: 40, friendMin: 30, notFlags: ['partner', 'engaged', 'enemy'], after: { since: 'met', days: 1 } },
    outcomes: {
      great: { romance: 'H', addFlags: ['partner'], actorBuff: [{ id: 'newPartner', chance: 1 }], targetBuff: [{ id: 'newPartner', chance: 1 }] },
      ok: { romance: 'L', addFlags: ['partner'], actorBuff: [{ id: 'newPartner', chance: 1 }], targetBuff: [{ id: 'newPartner', chance: 1 }] },
      fail: { romance: '-M', actorBuff: [{ id: 'rejected', chance: 1 }] },
    },
  },
  {
    id: 'propose',
    label: '청혼하기',
    icon: '💍',
    duration: 10,
    effects: { social: 1.5 },
    category: 'romance',
    autonomous: false,
    great: 15,
    fail: -10,
    requires: { flags: ['partner'], notFlags: ['engaged'], romanceMin: 60, after: { since: 'partner', days: 3 } },
    outcomes: {
      great: { romance: 'H', addFlags: ['engaged'], actorBuff: [{ id: 'gotEngaged', chance: 1 }], targetBuff: [{ id: 'gotEngaged', chance: 1 }] },
      ok: { romance: 'L', addFlags: ['engaged'], actorBuff: [{ id: 'gotEngaged', chance: 1 }], targetBuff: [{ id: 'gotEngaged', chance: 1 }] },
      fail: { romance: '-L', actorBuff: [{ id: 'rejected', chance: 1 }] },
    },
  },
  {
    id: 'askBff',
    label: '베프 하자고 하기',
    icon: '🤞',
    duration: 8,
    effects: { social: 1.5 },
    category: 'friendly',
    autonomous: false,
    great: 15,
    fail: -999, // 참고 게임's "ask to be best friends" has no failure outcome
    requires: { friendMin: 80, notFlags: ['bff', 'enemy'] },
    outcomes: {
      great: { friend: 'M', addFlags: ['bff'], actorBuff: [{ id: 'newBff', chance: 1 }], targetBuff: [{ id: 'newBff', chance: 1 }] },
      ok: { friend: 'S', addFlags: ['bff'], actorBuff: [{ id: 'newBff', chance: 1 }], targetBuff: [{ id: 'newBff', chance: 1 }] },
      fail: { friend: 'S', addFlags: ['bff'] },
    },
  },
  // Mischief (참고 게임 mixer_social_*_mischief_skills, Korean names): a little fun at the target's
  // expense. Success costs some friendship (Rel_Loss_Small) and pleases the prankster.
  {
    id: 'fakeBadNews',
    label: '가짜로 나쁜 소식 전하기',
    icon: '😈',
    duration: 8,
    effects: { social: 0.8, fun: 0.6 },
    category: 'mischief',
    emotion: 'playful',
    great: 12,
    fail: -6,
    outcomes: {
      great: { friend: '-S', mood: { fun: 5 }, actorBuff: [{ id: 'meanMischief', chance: 1 }] },
      ok: { friend: '-S' },
      fail: { friend: '-M', mood: { friendly: -10 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    id: 'scare',
    label: '겁주기',
    icon: '👻',
    duration: 6,
    effects: { social: 0.8, fun: 0.6 },
    category: 'mischief',
    emotion: 'playful',
    great: 12,
    fail: -6,
    outcomes: {
      great: { friend: '-S', mood: { fun: 5 }, actorBuff: [{ id: 'meanMischief', chance: 1 }] },
      ok: { friend: '-S' },
      fail: { friend: '-M', mood: { friendly: -10 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    id: 'falseConfidence',
    label: '거짓 자신감 고취하기',
    icon: '😏',
    duration: 8,
    effects: { social: 0.8, fun: 0.6 },
    category: 'mischief',
    emotion: 'playful',
    requires: { skill: { key: 'mischief', level: 2 } },
    great: 12,
    fail: -6,
    outcomes: {
      great: { friend: '-S', actorBuff: [{ id: 'meanMischief', chance: 1 }] },
      ok: { friend: '-S' },
      fail: { friend: '-M', actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    // 참고 게임 PretendToBeSlapped: the one prank that brings the pair closer (Rel_Gain_Small).
    id: 'pretendSlapped',
    label: '찰싹 맞는 척하기',
    icon: '🤕',
    duration: 6,
    effects: { social: 1.0, fun: 0.8 },
    category: 'mischief',
    emotion: 'playful',
    requires: { skill: { key: 'mischief', level: 3 } },
    great: 10,
    fail: -8,
    outcomes: {
      great: { friend: 'S', mood: { fun: 10 }, actorBuff: [{ id: 'meanMischief', chance: 1 }] },
      ok: { friend: 'S', mood: { fun: 5 } },
      fail: { friend: '-S', actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  {
    id: 'noxiousCloud',
    label: '유독 가스',
    icon: '💨',
    duration: 6,
    effects: { social: 0.6, fun: 0.8 },
    category: 'mischief',
    emotion: 'playful',
    requires: { skill: { key: 'mischief', level: 5 } },
    great: 12,
    fail: -6,
    outcomes: {
      great: { friend: '-S', mood: { fun: 5 }, actorBuff: [{ id: 'meanMischief', chance: 1 }] },
      ok: { friend: '-S' },
      fail: { friend: '-M', mood: { friendly: -10 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
  // Toddler care (참고 게임 Korean names: 걷기 가르치기, 말 가르치기, 용변 훈련하기; feeding and nappies
  // are 참고 게임's high chair and changing table, folded into socials here).
  {
    id: 'feedToddler',
    label: '밥 먹여주기',
    icon: '🥣',
    duration: 15,
    effects: { social: 0.4 },
    toddler: { needs: { hunger: 4, social: 0.6 } },
    category: 'friendly',
    great: -50,
    fail: -999,
    outcomes: { great: { friend: 'S' }, ok: { friend: 'S' }, fail: {} },
  },
  {
    id: 'changeNappy',
    label: '기저귀 갈아주기',
    icon: '🧷',
    duration: 8,
    effects: { hygiene: -0.1 },
    toddler: { needs: { hygiene: 9, bladder: 9 } },
    category: 'friendly',
    great: -50,
    fail: -999,
    outcomes: { great: {}, ok: {}, fail: {} },
  },
  {
    id: 'teachWalk',
    label: '걷기 가르치기',
    icon: '🚶',
    duration: 20,
    effects: { social: 0.5, fun: 0.2 },
    toddler: { needs: { social: 0.8, fun: 0.6 }, skill: 'movement', rate: 1 / 40 },
    category: 'friendly',
    great: -50,
    fail: -999,
    outcomes: { great: { friend: 'S' }, ok: { friend: 'S' }, fail: {} },
  },
  {
    id: 'teachTalk',
    label: '말 가르치기',
    icon: '🗣️',
    duration: 20,
    effects: { social: 0.6 },
    toddler: { needs: { social: 1.0 }, skill: 'talk', rate: 1 / 40 },
    category: 'friendly',
    great: -50,
    fail: -999,
    outcomes: { great: { friend: 'S', targetBuff: [{ id: 'learnedWords', chance: 0.6 }] }, ok: { friend: 'S' }, fail: {} },
  },
  {
    id: 'pottyTrain',
    label: '용변 훈련하기',
    icon: '🚽',
    duration: 20,
    effects: { social: 0.3 },
    toddler: { needs: { bladder: 3, social: 0.4 }, skill: 'potty', rate: 1 / 40 },
    category: 'friendly',
    great: -50,
    fail: -999,
    outcomes: { great: { friend: 'S' }, ok: { friend: 'S' }, fail: {} },
  },
  {
    id: 'playWithToddler',
    label: '같이 놀아주기',
    icon: '🧩',
    duration: 20,
    effects: { social: 0.6, fun: 0.6 },
    toddler: { needs: { fun: 1.4, social: 1.0 }, skill: 'thinking', rate: 1 / 60 },
    category: 'friendly',
    great: -50,
    fail: -999,
    outcomes: { great: { friend: 'M' }, ok: { friend: 'S' }, fail: {} },
  },
  {
    id: 'insult',
    label: '모욕하기',
    icon: '😠',
    duration: 8,
    effects: { social: 0.4, fun: -0.4 },
    category: 'mean',
    autonomous: false,
    great: 15,
    fail: -999,
    outcomes: {
      great: { friend: '-L', romance: '-S', mood: { friendly: -30 }, targetBuff: [{ id: 'argued', chance: 1 }] },
      ok: { friend: '-M', mood: { friendly: -20 }, targetBuff: [{ id: 'argued', chance: 1 }] },
      fail: { friend: '-M', targetBuff: [{ id: 'argued', chance: 1 }] },
    },
  },
  {
    // Angry dwellers pick arguments on their own (참고 게임 mean socials ride the Angry emotion's autonomy).
    id: 'argue',
    label: '말다툼하기',
    icon: '😤',
    duration: 12,
    effects: { social: 0.6, fun: -0.2 },
    category: 'mean',
    emotion: 'angry',
    great: 999,
    fail: -999,
    outcomes: {
      great: {},
      ok: { friend: '-M', mood: { friendly: -25 }, actorBuff: [{ id: 'argued', chance: 1 }], targetBuff: [{ id: 'argued', chance: 1 }] },
      fail: {},
    },
  },
  {
    // 참고 게임 mixer_social_Fight_targeted_mean; the winner is decided by fitness (ours: see fightWinChance).
    id: 'fight',
    label: '싸우기',
    icon: '👊',
    duration: 10,
    effects: { fun: 0.2 },
    category: 'mean',
    emotion: 'angry',
    great: 999,
    fail: -999,
    requires: { friendMax: 0 },
    outcomes: { great: {}, ok: { friend: '-L', mood: { friendly: -40 } }, fail: {} },
  },
  {
    id: 'declareEnemy',
    label: '원수 선언',
    icon: '⚔️',
    duration: 6,
    effects: { social: 0.3 },
    category: 'mean',
    autonomous: false,
    great: 999,
    fail: -999,
    requires: { friendMax: -70, notFlags: ['enemy'] },
    outcomes: {
      great: { friend: '-M', addFlags: ['enemy'] },
      ok: { friend: '-M', addFlags: ['enemy'], actorBuff: [{ id: 'argued', chance: 1 }], targetBuff: [{ id: 'argued', chance: 1 }] },
      fail: { friend: '-M', addFlags: ['enemy'] },
    },
  },
  {
    id: 'marry',
    label: '결혼하기',
    icon: '💒',
    duration: 30,
    effects: { social: 1.2, fun: 0.6 },
    category: 'romance',
    autonomous: false,
    great: 999,
    fail: -999,
    requires: { flags: ['engaged'], notFlags: ['married'], after: { since: 'engaged', days: 2 } },
    outcomes: {
      great: {},
      ok: { romance: 'M', addFlags: ['married'], actorBuff: [{ id: 'justMarried', chance: 1 }], targetBuff: [{ id: 'justMarried', chance: 1 }] },
      fail: {},
    },
  },
  {
    id: 'askMoveIn',
    label: '함께 살자고 하기',
    icon: '🏡',
    duration: 8,
    effects: { social: 0.8 },
    category: 'friendly',
    autonomous: false,
    great: 999,
    fail: -999,
    visitor: 'guest',
    outcomes: { great: {}, ok: {}, fail: {} },
  },
  {
    id: 'tryForBaby',
    label: '아기 갖기',
    icon: '💕',
    duration: 30,
    effects: { social: 1.2, fun: 1.0 },
    category: 'romance',
    autonomous: false,
    great: 999,
    fail: -999,
    // Ours: a baby comes after the wedding.
    requires: { flags: ['married'] },
    outcomes: { great: {}, ok: { romance: 'M', mood: { romance: 10 } }, fail: {} },
  },
  {
    id: 'confrontBurglar',
    label: '도둑과 맞서기',
    icon: '👊',
    duration: 8,
    effects: {},
    category: 'mean',
    autonomous: false,
    great: 999,
    fail: -999,
    visitor: 'burglar',
    outcomes: { great: {}, ok: {}, fail: {} },
  },
  {
    id: 'welcome',
    label: '들어오라고 하기',
    icon: '🚪',
    duration: 3,
    effects: { social: 1 },
    category: 'friendly',
    great: 999,
    fail: -999,
    visitor: 'outside',
    outcomes: { great: {}, ok: { friend: 'S' }, fail: {} },
  },
  {
    id: 'askToLeave',
    label: '돌아가 달라고 하기',
    icon: '👋',
    duration: 2,
    effects: {},
    category: 'mean',
    great: 999,
    fail: -999,
    visitor: 'guest',
    autonomous: false,
    outcomes: { great: {}, ok: { friend: '-S' }, fail: {} },
  },
  {
    id: 'joinConversation',
    label: '대화에 끼기',
    icon: '🙋',
    duration: 6,
    effects: { social: 1.2, fun: 0.2 },
    category: 'friendly',
    great: 5,
    fail: -15,
    join: true,
    outcomes: {
      great: { friend: 'S', mood: { friendly: 5 } },
      ok: { friend: 'S' },
      fail: { friend: '-S', mood: { awkward: -10 }, actorBuff: [{ id: 'awkward', chance: 1 }] },
    },
  },
];

SOCIALS.push(...WORK_SOCIALS);

export const SOCIAL_BY_ID: Record<string, SocialDef> = Object.fromEntries(SOCIALS.map((s) => [s.id, s]));

export function relKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

const SINCE_LABEL: Record<RelFlag | 'met', string> = { met: '알게 된 지', partner: '사귄 지', engaged: '약혼한 지', married: '결혼한 지', bff: '베프가 된 지', enemy: '원수가 된 지' };

/** How long until `days` have passed since `at`, as 일 and 시간, or null if they have. */
function waitLeft(at: number | undefined, days: number, now: number): string | null {
  if (at === undefined) return null;
  const left = at + days * 1440 - now;
  if (left <= 0) return null;
  const [d, h] = [Math.floor(left / 1440), Math.ceil((left % 1440) / 60)];
  return [d ? `${d}일` : '', h ? `${h}시간` : ''].filter(Boolean).join(' ') || '1시간';
}

/**
 * Why a social can't be used with this relationship yet, or null if it can; `now` (game minutes)
 * for the ones that wait on time (`after`), which go unchecked without it.
 */
export function socialBlocker(s: SocialDef, rel: Relationship, actor?: { skills: Record<SkillKey, number> }, now?: number): string | null {
  const r = s.requires;
  const refused = now !== undefined ? rel.refusedUntil?.[s.id] : undefined;
  if (refused !== undefined && refused > now!) return `거절당한 지 얼마 안 됐어요 (${Math.ceil((refused - now!) / 1440)}일 뒤에 다시)`;
  if (!r) return null;
  if (r.skill && actor && actor.skills[r.skill.key] < r.skill.level) return `${SKILL_INFO[r.skill.key].label} ${r.skill.level}레벨 필요`;
  if (r.notFlags?.includes('partner') && (rel.flags.includes('partner') || rel.flags.includes('engaged'))) return '이미 연인이에요';
  if (r.notFlags?.includes('married') && rel.flags.includes('married')) return '이미 결혼했어요';
  if (r.notFlags?.includes('engaged') && (rel.flags.includes('engaged') || rel.flags.includes('married'))) return '이미 약혼했어요';
  if (r.notFlags?.includes('bff') && rel.flags.includes('bff')) return '이미 베프예요';
  if (r.notFlags?.includes('enemy') && rel.flags.includes('enemy')) return '원수 사이예요';
  if (r.orFlags?.some((f) => rel.flags.includes(f))) return null;
  for (const f of r.flags ?? []) {
    if (!rel.flags.includes(f)) return f === 'partner' ? '연인 사이여야 해요' : f === 'engaged' ? '약혼이 먼저예요' : f === 'married' ? '결혼한 사이여야 해요' : '조건이 맞지 않아요';
  }
  if (r.together && !rel.flags.some((f) => f === 'partner' || f === 'engaged' || f === 'married')) return '사귀는 사이여야 해요';
  if (r.friendMin !== undefined && rel.friend < r.friendMin) return `우정 ${r.friendMin} 이상 필요`;
  if (r.friendMax !== undefined && rel.friend > r.friendMax) return `우정 ${r.friendMax} 이하일 때만`;
  if (r.romanceMin !== undefined && rel.romance < r.romanceMin) return `로맨스 ${r.romanceMin} 이상 필요`;
  if (r.after && now !== undefined) {
    const left = waitLeft(rel.since?.[r.after.since], r.after.days, now);
    if (left) return `${SINCE_LABEL[r.after.since]} ${r.after.days}일이 지나야 해요 (${left} 남음)`;
  }
  return null;
}
