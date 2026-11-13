import type { Game } from './game';
import type { RelFlag } from './relationships';
import type { EmotionKey, ObjectDef, Dweller, SkillKey } from './types';
import { SKILL_INFO } from './constants';
import { ASPIRATIONS, ASPIRATION_BY_ID, ASPIRATION_SET_BOOST, goalMet } from './aspirations';
import { CATALOG_BY_ID } from './catalog';
import { WORK_TYPES } from './careerTypes';
import { EMOTIONS } from './emotions';
import { ACTIVITIES, PREFERENCE_BY_ID, TRAIT_LIKES } from './preferences';
import { TRAIT_BY_ID } from './traits';
import { nextLevelOf } from './careers';
import { workSkillsShort } from './workTrouble';
import { clockInfo, josa } from './util';

/**
 * Wants (whims) and satisfaction points after 참고 게임 (docs/ref-game/04 §4), made over on 2026-11-01 at the
 * user's request (docs/wants-store-mood-research.md): a need is what the body wants, a want what this person
 * does. No wants for needs; three places, each with its part. The dream's: the next real step of the
 * aspiration. Their own: what they like, what their traits lean to, a fear to face. The moment's: how they
 * feel, what's just happened, the people about. Each says why (`ActiveWant.why`). Fulfilling one pays its
 * score in satisfaction points with a short Happy moodlet, and makes the next from its set 1.5× likelier.
 */

export type WantSet = 'dream' | 'like' | 'fear' | 'mood' | 'event' | 'skills' | 'friend' | 'romance' | 'partner' | 'career' | 'trait' | 'guest';
/** The three places a dweller's wants fill. */
export type WantRole = 'dream' | 'self' | 'now';

export type WantGoal =
  | { kind: 'counter'; counter: string }
  | { kind: 'phone' }
  | { kind: 'own'; defId: string }
  | { kind: 'interaction'; ids: string[] }
  | { kind: 'social'; ids: string[] }
  | { kind: 'flag'; flag: RelFlag }
  | { kind: 'skillUp'; skill: SkillKey }
  | { kind: 'promotion' }
  | { kind: 'task' };

export interface WantDef {
  id: string;
  set: WantSet;
  icon: string;
  /** `{t}` is replaced with the target dweller's name. */
  label: string;
  score: number;
  goal: WantGoal;
  needsTarget?: boolean;
}

export interface ActiveWant {
  defId: string;
  targetId?: number;
  since: number;
  role?: WantRole;
  /** Why they want it, in a few words: «요리를 좋아해서». */
  why?: string;
}

export type WantEvent =
  | { kind: 'interaction'; id: string }
  | { kind: 'social'; id: string; targetId: number }
  | { kind: 'flag'; flag: RelFlag; targetId: number }
  | { kind: 'skillUp'; skill: SkillKey }
  | { kind: 'promotion' }
  | { kind: 'task' }
  | { kind: 'counter'; counter: string }
  | { kind: 'phone'; targetId: number };

const skillWant = (skill: SkillKey): WantDef => ({
  id: `skill_${skill}`,
  set: 'skills',
  icon: SKILL_INFO[skill].icon,
  label: `${SKILL_INFO[skill].label} 스킬 레벨 올리기`,
  score: 50,
  goal: { kind: 'skillUp', skill },
});

/** A skill the dweller's work needs and they're short of (workTrouble.ts workSkillsShort; 2026-10-26). */
const jobSkillWant = (skill: SkillKey): WantDef => ({
  id: `jobSkill_${skill}`,
  set: 'career',
  icon: SKILL_INFO[skill].icon,
  label: `일에 필요한 ${SKILL_INFO[skill].label} 키우기`,
  score: 75,
  goal: { kind: 'skillUp', skill },
});

export const WANTS: WantDef[] = [
  // Skills
  skillWant('cooking'),
  skillWant('logic'),
  skillWant('charisma'),
  skillWant('fitness'),
  skillWant('painting'),
  skillWant('guitar'),
  skillWant('writing'),
  skillWant('handiness'),
  skillWant('gardening'),
  skillWant('comedy'),
  skillWant('piano'),
  skillWant('mixology'),
  skillWant('mischief'),
  skillWant('videoGaming'),
  skillWant('fishing'),
  skillWant('rocketScience'),
  skillWant('programming'),
  skillWant('violin'),
  skillWant('gourmet'),
  skillWant('photography'),
  skillWant('dancing'),
  skillWant('singing'),
  skillWant('djMixing'),
  skillWant('empathy'),
  skillWant('leadership'),
  skillWant('medicine'),
  skillWant('science'),
  skillWant('law'),
  skillWant('business'),
  skillWant('language'),
  skillWant('driving'),
  // Friends (참고 게임 whimSet_Friend: chat with 25)
  { id: 'chatWith', set: 'friend', icon: '💬', label: '{t}와 수다 떨기', score: 25, goal: { kind: 'social', ids: ['chat', 'deepTalk'] }, needsTarget: true },
  { id: 'jokeWith', set: 'friend', icon: '😂', label: '{t}에게 농담하기', score: 25, goal: { kind: 'social', ids: ['joke'] }, needsTarget: true },
  { id: 'complimentTo', set: 'friend', icon: '🌟', label: '{t} 칭찬하기', score: 25, goal: { kind: 'social', ids: ['compliment'] }, needsTarget: true },
  { id: 'hugWith', set: 'friend', icon: '🤗', label: '{t}와 포옹하기', score: 25, goal: { kind: 'social', ids: ['hug'] }, needsTarget: true },
  { id: 'deepTalkWith', set: 'friend', icon: '🫂', label: '{t}와 깊은 대화 나누기', score: 35, goal: { kind: 'social', ids: ['deepTalk'] }, needsTarget: true },
  { id: 'becomeBff', set: 'friend', icon: '🤞', label: '{t}와 베프 되기', score: 100, goal: { kind: 'flag', flag: 'bff' }, needsTarget: true },
  // Romance
  { id: 'flirtWith', set: 'romance', icon: '😉', label: '{t}에게 추파 던지기', score: 25, goal: { kind: 'social', ids: ['flirt'] }, needsTarget: true },
  { id: 'goSteady', set: 'romance', icon: '💞', label: '{t}와 사귀기', score: 100, goal: { kind: 'flag', flag: 'partner' }, needsTarget: true },
  // Partners
  { id: 'kissPartner', set: 'partner', icon: '🥰', label: '{t}에게 애정표현하기', score: 25, goal: { kind: 'social', ids: ['kiss'] }, needsTarget: true },
  { id: 'getEngaged', set: 'partner', icon: '💍', label: '{t}와 약혼하기', score: 150, goal: { kind: 'flag', flag: 'engaged' }, needsTarget: true },
  // A guest in the house (2026-10-26, at the user's request, ours): things to do with them while they're here.
  { id: 'guestChat', set: 'guest', icon: '☕', label: '{t}와 수다 떨기', score: 25, goal: { kind: 'social', ids: ['chat', 'joinConversation', 'deepTalk'] }, needsTarget: true },
  { id: 'guestGetToKnow', set: 'guest', icon: '🔍', label: '{t}에 대해 알아가기', score: 25, goal: { kind: 'social', ids: ['getToKnow'] }, needsTarget: true },
  { id: 'guestJoke', set: 'guest', icon: '😂', label: '{t}에게 농담하기', score: 25, goal: { kind: 'social', ids: ['joke'] }, needsTarget: true },
  { id: 'guestCompliment', set: 'guest', icon: '🌟', label: '{t} 칭찬하기', score: 25, goal: { kind: 'social', ids: ['compliment'] }, needsTarget: true },
  { id: 'guestDeepTalk', set: 'guest', icon: '🫂', label: '{t}와 깊은 대화 나누기', score: 35, goal: { kind: 'social', ids: ['deepTalk'] }, needsTarget: true },
  { id: 'guestHug', set: 'guest', icon: '🤗', label: '{t}와 포옹하기', score: 25, goal: { kind: 'social', ids: ['hug'] }, needsTarget: true },
  { id: 'guestFlirt', set: 'guest', icon: '😉', label: '{t}에게 추파 던지기', score: 25, goal: { kind: 'social', ids: ['flirt'] }, needsTarget: true },
  // Career
  { id: 'dailyTask', set: 'career', icon: '📋', label: '오늘의 과제 끝내기', score: 50, goal: { kind: 'task' } },
  { id: 'getPromoted', set: 'career', icon: '📈', label: '승진하기', score: 200, goal: { kind: 'promotion' } },
  // Traits
  { id: 'trait_read', set: 'trait', icon: '📖', label: '책 읽기', score: 25, goal: { kind: 'interaction', ids: ['read', 'cookbook'] } },
  { id: 'trait_joke', set: 'trait', icon: '🤡', label: '누군가에게 농담하기', score: 25, goal: { kind: 'social', ids: ['joke'] } },
  { id: 'trait_cook', set: 'trait', icon: '🍲', label: '맛있는 요리 해 먹기', score: 25, goal: { kind: 'interaction', ids: ['cook', 'cookFamily'] } },
  { id: 'trait_nap', set: 'trait', icon: '😪', label: '낮잠 자기', score: 25, goal: { kind: 'interaction', ids: ['nap'] } },
  { id: 'trait_dance', set: 'trait', icon: '💃', label: '춤추기', score: 25, goal: { kind: 'interaction', ids: ['dance'] } },
  { id: 'trait_game', set: 'trait', icon: '🎮', label: '혼자 게임하기', score: 25, goal: { kind: 'interaction', ids: ['game'] } },
  { id: 'trait_compliment', set: 'trait', icon: '🌟', label: '누군가를 칭찬하기', score: 25, goal: { kind: 'social', ids: ['compliment'] } },
  { id: 'trait_insult', set: 'trait', icon: '😠', label: '누군가를 모욕하기', score: 25, goal: { kind: 'social', ids: ['insult'] } },
  // Their own: what they like (`LIKE_WANTS`), a fear to face.
  { id: 'fear_cook', set: 'fear', icon: '🍳', label: '겁내지 말고 요리해 보기', score: 75, goal: { kind: 'interaction', ids: ['cook', 'cookFamily', 'grill'] } },
  { id: 'fear_open', set: 'fear', icon: '🫂', label: '속마음 털어놓기', score: 75, goal: { kind: 'social', ids: ['deepTalk'] } },
  { id: 'fear_group', set: 'fear', icon: '👥', label: '여럿이 있는 대화에 끼어 보기', score: 75, goal: { kind: 'social', ids: ['joinConversation'] } },
  { id: 'fear_reach', set: 'fear', icon: '💬', label: '친한 사람과 이야기하기', score: 75, goal: { kind: 'social', ids: ['chat', 'deepTalk', 'hug'] } },
  { id: 'fear_future', set: 'fear', icon: '🧭', label: '다른 사람의 일에 대해 물어보기', score: 75, goal: { kind: 'social', ids: ['askAboutCareer'] } },
  { id: 'fear_exam', set: 'fear', icon: '📝', label: '미리 숙제 해 두기', score: 75, goal: { kind: 'interaction', ids: ['homework'] } },
  { id: 'fear_heart', set: 'fear', icon: '💗', label: '용기 내서 마음 전하기', score: 100, goal: { kind: 'social', ids: ['askBff', 'askPartner', 'compliment'] } },
  // The moment: how they feel, what's just happened.
  { id: 'mood_talk', set: 'mood', icon: '🫂', label: '누군가에게 털어놓기', score: 50, goal: { kind: 'social', ids: ['deepTalk', 'hug', 'chat'] } },
  { id: 'mood_rest', set: 'mood', icon: '🛋️', label: '잠깐 쉬면서 마음 가라앉히기', score: 25, goal: { kind: 'interaction', ids: ['relax', 'nap', 'listen', 'bdRestAnma'] } },
  { id: 'mood_letOff', set: 'mood', icon: '🥊', label: '몸을 움직여서 풀기', score: 50, goal: { kind: 'interaction', ids: ['workout', 'doPullUps', 'liftWeights', 'practiceDefense', 'showerCold'] } },
  { id: 'mood_out', set: 'mood', icon: '🚪', label: '바람 쐬러 외출하기', score: 50, goal: { kind: 'interaction', ids: ['__outing'] } },
  { id: 'mood_flirt', set: 'mood', icon: '💗', label: '좋아하는 사람에게 다가가기', score: 50, goal: { kind: 'social', ids: ['flirt', 'kiss', 'compliment'] } },
  { id: 'mood_playful', set: 'mood', icon: '😜', label: '누군가를 웃겨 보기', score: 25, goal: { kind: 'social', ids: ['joke', 'fakeBadNews', 'scare'] } },
  { id: 'mood_share', set: 'mood', icon: '🌟', label: '좋은 기분 나누기', score: 25, goal: { kind: 'social', ids: ['compliment', 'chat', 'hug'] } },
  { id: 'event_cure', set: 'event', icon: '🏥', label: '병원이나 약국 다녀오기', score: 50, goal: { kind: 'interaction', ids: ['__cured'] } },
  { id: 'event_dinner', set: 'event', icon: '🍽️', label: '가족 저녁 차리기', score: 50, goal: { kind: 'interaction', ids: ['cookFamily', 'grillFamily'] } },
  // People who aren't here.
  { id: 'callFriend', set: 'friend', icon: '📱', label: '{t}에게 전화하기', score: 50, goal: { kind: 'phone' }, needsTarget: true },
  // The dream's: steps with no skill or count of their own (`dreamWants`).
  { id: 'dream_meet', set: 'dream', icon: '🤝', label: '사람들과 더 가까워지기', score: 75, goal: { kind: 'social', ids: ['chat', 'getToKnow', 'deepTalk', 'compliment', 'joke'] } },
  { id: 'dream_friend', set: 'dream', icon: '🤞', label: '친구와 깊은 이야기 나누기', score: 75, goal: { kind: 'social', ids: ['deepTalk', 'askBff'] } },
  { id: 'dream_love', set: 'dream', icon: '💞', label: '마음에 둔 사람과 가까워지기', score: 75, goal: { kind: 'social', ids: ['flirt', 'kiss', 'askPartner', 'propose'] } },
  { id: 'dream_job', set: 'dream', icon: '💼', label: '일자리 알아보기', score: 75, goal: { kind: 'interaction', ids: ['findJob'] } },
  { id: 'dream_homework', set: 'dream', icon: '📖', label: '숙제 끝내기', score: 75, goal: { kind: 'interaction', ids: ['homework'] } },
  { id: 'trait_chat', set: 'trait', icon: '🎉', label: '누군가와 수다 떨기', score: 25, goal: { kind: 'social', ids: ['chat', 'deepTalk'] } },
];

/** Kept out of WANTS (its skill wants are offered for every skill); offered only for what work needs. */
export const JOB_SKILL_WANTS: WantDef[] = (Object.keys(SKILL_INFO) as SkillKey[]).map(jobSkillWant);
/** What they like doing: one for each activity. */
const LIKE_WANTS: WantDef[] = ACTIVITIES.map((a) => ({ id: `like_${a.id}`, set: 'like', icon: a.icon, label: `${a.label} 하기`, score: 50, goal: { kind: 'interaction', ids: a.interactions } }));
/** An aspiration's steps as wants: one for each thing counted, each skill to raise, each thing to own. */
const DREAM_WANTS: WantDef[] = [
  ...(Object.keys(SKILL_INFO) as SkillKey[]).map((k): WantDef => ({ id: `dream_skill_${k}`, set: 'dream', icon: SKILL_INFO[k].icon, label: `꿈을 위해 ${SKILL_INFO[k].label} 키우기`, score: 75, goal: { kind: 'skillUp', skill: k } })),
  ...ASPIRATIONS.flatMap((a) => a.milestones.flatMap((m) => m.goals.flatMap((g): WantDef[] => (g.kind === 'count' ? [{ id: `dream_${g.counter}`, set: 'dream', icon: a.icon, label: g.label, score: 75, goal: { kind: 'counter', counter: g.counter } }] : g.kind === 'own' ? [{ id: `dream_own_${g.defId}`, set: 'dream', icon: a.icon, label: `${g.label} 마련하기`, score: 100, goal: { kind: 'own', defId: g.defId } }] : [])))),
];
export const WANT_BY_ID: Record<string, WantDef> = Object.fromEntries([...WANTS, ...JOB_SKILL_WANTS, ...LIKE_WANTS, ...DREAM_WANTS].map((w) => [w.id, w]));

/** Each trait's want set (참고 게임 trait whim_set). */
const TRAIT_WANTS: Record<string, string[]> = {
  bookworm: ['trait_read'],
  gloomy: ['trait_read'],
  goofball: ['trait_joke'],
  glutton: ['trait_cook'],
  lazy: ['trait_nap'],
  active: ['trait_dance'],
  loner: ['trait_game'],
  cheerful: ['trait_compliment'],
  hotHeaded: ['trait_insult'],
  outgoing: ['trait_chat'],
};

const SET_PRIORITY: Record<WantSet, number> = { dream: 6, event: 10, guest: 8, mood: 5, like: 4, fear: 3, romance: 4, skills: 2, career: 3, partner: 3, trait: 3, friend: 2 };
/** Which sets fill each place. */
const ROLE_SETS: Record<WantRole, WantSet[]> = {
  dream: ['dream', 'career', 'skills'],
  self: ['like', 'trait', 'fear'],
  now: ['event', 'guest', 'mood', 'friend', 'romance', 'partner'],
};
const ROLES: WantRole[] = ['dream', 'self', 'now'];
const WHY_BY_SET: Partial<Record<WantSet, string>> = { career: '일을 잘하고 싶어서', skills: '조금씩 늘고 있어서', friend: '가까운 사이라서', romance: '마음이 가서', partner: '사랑하는 사이라서', guest: '손님이 와서' };

/** A fear, and what facing it would be. */
const FEAR_WANTS: Partial<Record<string, string>> = { fire: 'fear_cook', judged: 'fear_open', crowded: 'fear_group', lonely: 'fear_reach', future: 'fear_future', family: 'fear_open', exam: 'fear_exam', rejection: 'fear_heart' };
/** What a mood turns to. */
const MOOD_WANTS: Partial<Record<EmotionKey, string[]>> = {
  happy: ['mood_share'],
  confident: ['mood_share'],
  energized: ['like_fitness', 'like_dancing'],
  flirty: ['mood_flirt'],
  focused: ['like_studying', 'like_reading', 'like_chess'],
  inspired: ['like_painting', 'like_writing', 'like_guitar', 'like_piano'],
  playful: ['mood_playful'],
  sad: ['mood_talk', 'mood_rest'],
  angry: ['mood_letOff', 'mood_rest'],
  bored: ['mood_out'],
  embarrassed: ['mood_rest', 'mood_talk'],
  stressed: ['mood_rest', 'mood_out'],
  uncomfortable: ['mood_rest'],
  dazed: ['mood_rest'],
  scared: ['mood_talk'],
};
/** What's just happened, by the moodlet it left, and what's said for it. */
const EVENT_WANTS: Record<string, [string, string]> = {
  rejected: ['mood_talk', '거절당해서'],
  griefFamily: ['mood_talk', '슬픈 일을 겪어서'],
  griefFriend: ['mood_talk', '슬픈 일을 겪어서'],
  scolded: ['mood_rest', '지적을 받아서'],
  stolenGoods: ['mood_talk', '도둑을 맞아서'],
  fired: ['dream_job', '일을 잃어서'],
  injured: ['event_cure', '몸을 다쳐서'],
  sick: ['event_cure', '몸이 아파서'],
};
/** What takes a sound body: not wanted by someone worn out or hurt. */
const HEAVY = new Set(['like_fitness', 'like_swimming', 'like_dancing', 'mood_letOff']);

export const WANT_SLOTS = 3;
/** Wants left unfulfilled this long are swapped for fresh ones (our choice). */
export const WANT_LIFETIME = 1440;
/** A fulfilled want isn't offered again for a day (참고 게임 `_cooldown` 1440). */
export const WANT_COOLDOWN = 1440;
/** 참고 게임 chaining_whimset_chance_multiplier. */
export const CHAIN_BOOST = 1.5;

export function wantLabel(game: Game, w: ActiveWant): string {
  const def = WANT_BY_ID[w.defId];
  if (!def) return '';
  const name = w.targetId !== undefined ? (game.dweller(w.targetId)?.name ?? game.state.townies?.find((t) => t.id === w.targetId)?.name ?? '') : '';
  // Pick the right particle after the target's name.
  return def.label
    .replace('{t}와', josa(name, '와/과'))
    .replace('{t}에게', `${name}에게`)
    .replace('{t}', name);
}

const getDef = (id: string): Pick<ObjectDef, 'interactions'> => CATALOG_BY_ID[id] ?? { interactions: [] };
const isYoungForCooking = (s: Dweller) => s.age === 'child' || s.age === 'toddler';

function key(defId: string, targetId?: number): string {
  return targetId === undefined ? defId : `${defId}@${targetId}`;
}

/** The dream's next step: for each goal of this step not yet met, the want that goes towards it. */
function dreamWants(game: Game, dweller: Dweller): string[] {
  const asp = dweller.aspiration;
  const def = asp && ASPIRATION_BY_ID[asp.id];
  const m = def?.milestones[asp!.milestone];
  if (!m) return [];
  const skillUnder = (keys: SkillKey[], level: number) => keys.filter((k) => Math.floor(dweller.skills[k] ?? 0) < level).map((k) => `dream_skill_${k}`);
  return m.goals.flatMap((g) => {
    if (goalMet(game, dweller, g)) return [];
    switch (g.kind) {
      case 'count':
        return [`dream_${g.counter}`];
      case 'skill':
        return [`dream_skill_${g.skill}`];
      case 'typeSkill':
        return skillUnder(WORK_TYPES[g.type].skills, g.level).slice(0, 2);
      case 'anySkill': {
        const best = (Object.keys(SKILL_INFO) as SkillKey[]).filter((k) => (dweller.skills[k] ?? 0) >= 1 && Math.floor(dweller.skills[k]) < g.level).sort((a, b) => dweller.skills[b] - dweller.skills[a]);
        return best.slice(0, 2).map((k) => `dream_skill_${k}`);
      }
      case 'own':
        return [`dream_own_${g.defId}`];
      case 'friends':
      case 'met':
      case 'friendsAged':
        return ['dream_meet'];
      case 'flag':
        return g.flag === 'bff' ? ['dream_friend'] : ['dream_love'];
      case 'romance':
        return ['dream_love'];
      case 'job':
        return ['dream_job'];
      case 'careerLevel':
      case 'typeWork':
        return dweller.job ? ['dailyTask', 'getPromoted'] : ['dream_job'];
      case 'money':
        return dweller.job ? ['dailyTask'] : ['dream_job'];
      case 'schoolGrade':
        return ['dream_homework'];
      default:
        return [];
    }
  });
}

/** Every interaction there is on this lot, for what can be wanted here. */
function doableHere(game: Game): Set<string> {
  const out = new Set(['__outing', '__cured']);
  for (const o of game.state.objects) for (const i of getDef(o.defId).interactions) out.add(i.id);
  return out;
}

/** Every want this dweller could be offered right now, by set. */
export function candidates(game: Game, dweller: Dweller): Map<WantSet, ActiveWant[]> {
  const out = new Map<WantSet, ActiveWant[]>();
  const here = doableHere(game);
  const worn = dweller.needs.energy < 25 || !!dweller.injury;
  const add = (defId: string, targetId?: number, why?: string) => {
    const def = WANT_BY_ID[defId];
    if (!def || (dweller.wantCooldown?.[key(defId, targetId)] ?? 0) > game.state.time) return;
    if (dweller.wants?.some((w) => w.defId === defId && w.targetId === targetId)) return;
    // Nothing they can't do here or can't stand; nothing heavy when worn out.
    if (def.goal.kind === 'interaction' && !def.goal.ids.some((id) => here.has(id))) return;
    if (HEAVY.has(defId) && worn) return;
    if (defId.startsWith('like_') && dweller.dislikes?.includes(defId.slice(5))) return;
    const list = out.get(def.set) ?? [];
    if (list.some((w) => w.defId === defId && w.targetId === targetId)) return;
    list.push({ defId, targetId, since: game.state.time, why: why ?? WHY_BY_SET[def.set] });
    out.set(def.set, list);
  };
  // The dream.
  const dream = dweller.aspiration ? ASPIRATION_BY_ID[dweller.aspiration.id] : undefined;
  for (const id of dreamWants(game, dweller)) add(id, undefined, dream ? `${dream.label}: 다음 단계` : undefined);
  for (const w of WANTS) if (w.goal.kind === 'skillUp' && (dweller.skills[w.goal.skill] ?? 0) >= 1 && dweller.skills[w.goal.skill] < 10) add(w.id);
  if (dweller.job) {
    add('dailyTask');
    if (nextLevelOf(dweller.job)) add('getPromoted');
    for (const k of workSkillsShort(dweller, game.state.time)) if (dweller.skills[k] < 10) add(`jobSkill_${k}`);
  }
  // Their own.
  for (const id of dweller.likes ?? []) {
    if (!PREFERENCE_BY_ID[id] || PREFERENCE_BY_ID[id].kind !== 'activity') continue;
    const missed = dweller.buffs.some((b) => b.id === `miss_${id}` || b.id === `missBad_${id}`);
    add(`like_${id}`, undefined, missed ? `${PREFERENCE_BY_ID[id].label}을(를) 오래 못 해서` : `${PREFERENCE_BY_ID[id].label}을(를) 좋아해서`);
    if (missed) add(`like_${id}`);
  }
  for (const t of dweller.traits) {
    const label = TRAIT_BY_ID[t]?.label;
    const why = label ? `${label} 성격이라서` : undefined;
    for (const id of TRAIT_WANTS[t] ?? []) add(id, undefined, why);
    for (const a of TRAIT_LIKES[t] ?? []) add(`like_${a}`, undefined, why);
  }
  for (const f of dweller.fears ?? []) if (FEAR_WANTS[f]) add(FEAR_WANTS[f]!, undefined, '두려움을 넘어서고 싶어서');
  // The moment.
  const feel = EMOTIONS[dweller.emotion]?.levels[0];
  for (const id of MOOD_WANTS[dweller.emotion] ?? []) add(id, undefined, `${feel} 기분이라서`);
  for (const b of dweller.buffs) if (EVENT_WANTS[b.id]) add(EVENT_WANTS[b.id][0], undefined, EVENT_WANTS[b.id][1]);
  const hour = clockInfo(game.state.time).minuteOfDay / 60;
  if (hour >= 16 && hour < 20 && game.household().length >= 2 && !isYoungForCooking(dweller)) add('event_dinner', undefined, '저녁 시간이라서');
  // The people about.
  for (const other of game.household().filter((s) => s.age !== 'baby')) {
    if (other.id === dweller.id) continue;
    const rel = game.relationship(dweller.id, other.id);
    if (rel.flags.includes('enemy')) continue;
    add('chatWith', other.id);
    add('jokeWith', other.id);
    add('complimentTo', other.id);
    if (rel.friend >= 35 || rel.flags.includes('partner')) add('hugWith', other.id);
    if (rel.friend >= 35) add('deepTalkWith', other.id);
    if (rel.friend >= 70 && !rel.flags.includes('bff')) add('becomeBff', other.id);
    const together = rel.flags.includes('partner') || rel.flags.includes('engaged');
    const mayLove = !game.romanceBlocked(dweller, other);
    if (!together && rel.romance >= 10 && mayLove) {
      add('flirtWith', other.id);
      if (rel.romance >= 35) add('goSteady', other.id);
    }
    if (together) {
      add('kissPartner', other.id);
      if (!rel.flags.includes('engaged')) add('getEngaged', other.id);
    }
  }
  // Friends who live elsewhere, the more so if it's been a while.
  if (dweller.age !== 'toddler') {
    for (const r of game.relationsOf(dweller.id)) {
      if ((r.where !== 'street' && r.where !== 'work') || r.rel.friend < 15 || r.rel.flags.includes('enemy')) continue;
      add('callFriend', r.id, game.state.time - r.rel.lastChange > 3 * 1440 ? '연락한 지 오래돼서' : '가까운 사이라서');
    }
  }
  for (const g of game.state.dwellers) if (g.npc?.role === 'guest' && !g.away) for (const id of guestWants(game, dweller, g)) add(id, g.id);
  return out;
}

/** What a dweller could want to do with a guest: as close as they are, and romance only where it may be. */
function guestWants(game: Game, dweller: Dweller, guest: Dweller): string[] {
  if (dweller.age === 'baby' || dweller.age === 'toddler' || guest.age === 'baby' || guest.age === 'toddler') return [];
  const rel = game.relationship(dweller.id, guest.id);
  if (rel.flags.includes('enemy')) return [];
  const ids = ['guestChat', 'guestJoke', 'guestCompliment'];
  if (rel.friend < 35) ids.push('guestGetToKnow');
  else ids.push('guestDeepTalk', 'guestHug');
  const young = (s: Dweller) => s.age === 'child' || s.age === 'teen';
  if (rel.romance >= 10 && !game.romanceBlocked(dweller, guest) && !young(dweller) && !young(guest)) ids.push('guestFlirt');
  return ids;
}

/**
 * A guest has come in (invited, or let in at the door): something to do with them goes into the dweller's
 * wants now, in place of the oldest other want if the slots are full (motives stay).
 */
export function wantGuest(game: Game, dweller: Dweller, guest: Dweller) {
  dweller.wants ??= [];
  if (dweller.wants.some((w) => w.targetId === guest.id)) return;
  const ids = guestWants(game, dweller, guest).filter((id) => (dweller.wantCooldown?.[key(id, guest.id)] ?? 0) <= game.state.time);
  if (!ids.length) return;
  if (dweller.wants.length >= WANT_SLOTS) {
    const drop = [...dweller.wants].sort((a, b) => Number(b.role === 'now') - Number(a.role === 'now') || a.since - b.since)[0];
    if (!drop) return;
    dweller.wants = dweller.wants.filter((w) => w !== drop);
  }
  dweller.wants.push({ defId: ids[Math.floor(game.rng() * ids.length)], targetId: guest.id, since: game.state.time, role: 'now', why: '손님이 와서' });
}

/**
 * Work went wrong for want of a skill: wanting to learn it goes into the dweller's wants now, in place of
 * the oldest other want if the slots are full (motives and guests stay).
 */
export function wantJobSkill(game: Game, dweller: Dweller, skill: SkillKey) {
  const id = `jobSkill_${skill}`;
  dweller.wants ??= [];
  if (!WANT_BY_ID[id] || dweller.wants.some((w) => w.defId === id) || (dweller.skills[skill] ?? 0) >= 10) return;
  if (dweller.wants.length >= WANT_SLOTS) {
    const drop = dweller.wants.filter((w) => WANT_BY_ID[w.defId]?.set !== 'guest').sort((a, b) => Number(b.role === 'dream') - Number(a.role === 'dream') || a.since - b.since)[0];
    if (!drop) return;
    dweller.wants = dweller.wants.filter((w) => w !== drop);
  }
  dweller.wants.push({ defId: id, since: game.state.time, role: 'dream', why: '일하다 막혀서' });
}

/**
 * Fills the places empty: each role picks a set by priority (×chain boost, ×the aspiration's set boost), then a
 * want in it. One of each set, so the three say different things; a role with nothing left takes from the others.
 */
export function fillWants(game: Game, dweller: Dweller) {
  dweller.wants ??= [];
  // A guest's wants go when the guest does.
  dweller.wants = dweller.wants.filter(
    (w) => WANT_BY_ID[w.defId] && game.state.time - w.since < WANT_LIFETIME && (WANT_BY_ID[w.defId].set !== 'guest' || game.dweller(w.targetId ?? -1)?.npc?.role === 'guest'),
  );
  const pool = candidates(game, dweller);
  const aspirationSet = dweller.aspiration ? ASPIRATION_BY_ID[dweller.aspiration.id]?.wantSet : undefined;
  const pick = (allowed: WantSet[] | null): ActiveWant | null => {
    const used = new Set(dweller.wants!.map((w) => WANT_BY_ID[w.defId].set));
    const sets = [...pool.entries()].filter(([s, list]) => list.length > 0 && !used.has(s) && (!allowed || allowed.includes(s)));
    if (!sets.length) return null;
    const weights = sets.map(([s]) => SET_PRIORITY[s] * (dweller.wantChain?.[s] ?? 1) * (s === aspirationSet ? ASPIRATION_SET_BOOST : 1));
    let roll = game.rng() * weights.reduce((a, b) => a + b, 0);
    let chosen = sets[0];
    for (let i = 0; i < sets.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        chosen = sets[i];
        break;
      }
    }
    const [set, list] = chosen;
    pool.set(set, []);
    return list[Math.floor(game.rng() * list.length)];
  };
  for (const role of ROLES) {
    if (dweller.wants.length >= WANT_SLOTS || dweller.wants.some((w) => w.role === role)) continue;
    // The dream's place is the dream's, while it has a next step; the job or a skill under way only if not.
    const want = role === 'dream' && pool.get('dream')?.length ? pick(['dream']) : pick(ROLE_SETS[role]);
    if (want) dweller.wants.push({ ...want, role });
  }
  // A place with nothing of its own takes from the others, and keeps its name.
  for (const role of ROLES) {
    if (dweller.wants.length >= WANT_SLOTS || dweller.wants.some((w) => w.role === role)) continue;
    const want = pick(null);
    if (want) dweller.wants.push({ ...want, role });
  }
}

/** Whether an event (or how things stand, with `game`) fulfils a want. */
export function fulfils(_dweller: Dweller, w: ActiveWant, e: WantEvent | null, game?: Game): boolean {
  const goal = WANT_BY_ID[w.defId]?.goal;
  if (!goal) return false;
  if (goal.kind === 'own') return !!game?.state.objects.some((o) => o.defId === goal.defId);
  if (!e) return false;
  const targetOk = (t: number) => w.targetId === undefined || w.targetId === t;
  switch (goal.kind) {
    case 'interaction':
      return e.kind === 'interaction' && goal.ids.includes(e.id);
    case 'social':
      return e.kind === 'social' && goal.ids.includes(e.id) && targetOk(e.targetId);
    case 'flag':
      return e.kind === 'flag' && e.flag === goal.flag && targetOk(e.targetId);
    case 'skillUp':
      return e.kind === 'skillUp' && e.skill === goal.skill;
    case 'promotion':
      return e.kind === 'promotion';
    case 'task':
      return e.kind === 'task';
    case 'counter':
      return e.kind === 'counter' && e.counter === goal.counter;
    case 'phone':
      return e.kind === 'phone' && targetOk(e.targetId);
  }
}

export function cooldownKey(w: ActiveWant): string {
  return key(w.defId, w.targetId);
}

/**
 * The reward store, made over on 2026-11-01 (docs/wants-store-mood-research.md): what's worth saving for
 * in four kinds, priced from what a dweller earns (measured, see the doc). `then` is what buying does
 * beyond a moodlet or a trait (Game.buyReward).
 */
export type StoreTab = 'mood' | 'mind' | 'life' | 'trait';
export const STORE_TABS: Record<StoreTab, { label: string; icon: string; desc: string }> = {
  mood: { label: '기분', icon: '🧪', desc: '지금 기분을 바꿔요' },
  mind: { label: '마음', icon: '💭', desc: '마음의 짐을 덜어요' },
  life: { label: '삶', icon: '✨', desc: '하루나 관계를 도와요' },
  trait: { label: '평생 특성', icon: '🏅', desc: '평생 가는 특성이에요' },
};
export interface StoreItem {
  id: string;
  tab: StoreTab;
  label: string;
  icon: string;
  price: number;
  buff?: string;
  trait?: string;
  then?: 'clearBad' | 'easeFear' | 'mendRel' | 'retryLove';
  desc: string;
}

export const STORE: StoreItem[] = [
  { id: 'potionHappy', tab: 'mood', label: '행복의 물약', icon: '🧪', price: 150, buff: 'potionHappy', desc: '4시간 동안 행복해요' },
  { id: 'potionFocus', tab: 'mood', label: '집중의 물약', icon: '🧪', price: 200, buff: 'potionFocus', desc: '4시간 동안 집중해요' },
  { id: 'potionInspired', tab: 'mood', label: '영감의 물약', icon: '🧪', price: 200, buff: 'potionInspired', desc: '4시간 동안 영감이 샘솟아요' },
  { id: 'potionConfident', tab: 'mood', label: '자신감의 물약', icon: '🧪', price: 200, buff: 'potionConfident', desc: '4시간 동안 자신감이 넘쳐요' },
  { id: 'potionEnergized', tab: 'mood', label: '활력의 물약', icon: '🧪', price: 200, buff: 'potionEnergized', desc: '4시간 동안 활기차요' },
  { id: 'potionPlayful', tab: 'mood', label: '장난의 물약', icon: '🧪', price: 150, buff: 'potionPlayful', desc: '4시간 동안 장난기가 돌아요' },
  { id: 'potionFlirty', tab: 'mood', label: '설렘의 물약', icon: '🧪', price: 200, buff: 'potionFlirty', desc: '4시간 동안 마음이 설레요' },
  { id: 'clearBad', tab: 'mood', label: '기분 씻어 내기', icon: '🫧', price: 250, then: 'clearBad', desc: '나쁜 일에서 온 기분을 털어 내요 (욕구 때문인 것은 그대로)' },
  { id: 'easeFear', tab: 'mind', label: '두려움 다독이기', icon: '🕯️', price: 300, then: 'easeFear', desc: '가장 큰 두려움을 한 걸음 넘어서요' },
  { id: 'retryLove', tab: 'mind', label: '다시 용기 내기', icon: '💌', price: 400, then: 'retryLove', desc: '거절당한 뒤 기다리는 시간을 없애요' },
  { id: 'studyDay', tab: 'life', label: '집중 학습의 날', icon: '📚', price: 400, buff: 'studyDay', desc: '하루 동안 모든 스킬이 1.5배 빨리 늘어요' },
  { id: 'luckyDay', tab: 'life', label: '일이 잘 풀리는 날', icon: '✨', price: 500, buff: 'luckyDay', desc: '하루 동안 업무 성공이 10% 올라요' },
  { id: 'mendRel', tab: 'life', label: '화해의 편지', icon: '💌', price: 600, then: 'mendRel', desc: '가장 사이가 나쁜 사람과의 우정이 30 올라요' },
  { id: 'mellowMind', tab: 'trait', label: '단단한 마음', icon: '🪨', price: 2000, trait: 'mellowMind', desc: '나쁜 기분이 25% 빨리 지나가요' },
  { id: 'sunnyMind', tab: 'trait', label: '오래가는 기쁨', icon: '☀️', price: 2000, trait: 'sunnyMind', desc: '좋은 기분이 25% 오래가요' },
  { id: 'independent', tab: 'trait', label: '독립적', icon: '🦅', price: 2500, trait: 'independent', desc: '사교 욕구가 절반 속도로 줄어요' },
  { id: 'antiseptic', tab: 'trait', label: '청결 체질', icon: '✨', price: 2500, trait: 'antiseptic', desc: '위생 욕구가 절반 속도로 줄어요' },
  { id: 'hardlyHungry', tab: 'trait', label: '소식가', icon: '🥢', price: 3000, trait: 'hardlyHungry', desc: '배고픔이 절반 속도로 줄어요' },
  { id: 'seldomSleepy', tab: 'trait', label: '잠 없는 체질', icon: '🌙', price: 3000, trait: 'seldomSleepy', desc: '에너지가 절반 속도로 줄어요' },
  { id: 'steelBladder', tab: 'trait', label: '강철 방광', icon: '🛡️', price: 3500, trait: 'steelBladder', desc: '생리현상 욕구가 줄지 않아요' },
];
