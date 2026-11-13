import { SKILL_INFO } from './constants';

/**
 * What the game comes to know about the player (ours, at the user's request): not what the dwellers
 * live through — that is their own free will, and isn't kept — but how the person at the controls
 * answers the questions that come up at work, for questions that can later grow out of the
 * player's own way of thinking instead of a fixed list. One store per game, across all its dwellers.
 *
 * After two references (docs/ref-game/08-knowledge.md):
 * - 참고 게임 keeps no episodic memory; the nearest thing to "a choice becomes who you are" is its
 *   likes/dislikes discovery (the player's answer becomes a preference) and lifestyles (repeated
 *   behaviour turning into a soft trait, with hysteresis).
 * - Generative Agents (Park et al. 2023): a memory stream with an importance score, and
 *   reflections that cite their evidence.
 * Here: one episode per answer the player gave (scored by rules, not a model), counters, and rule
 * reflections that cite the answers they rest on. An answer the dweller gave by itself (no one at the
 * controls) is the dweller's, and isn't kept.
 */

export interface Episode {
  id: number;
  /** Game minute. */
  t: number;
  tags: string[];
  /** A short Korean sentence from a template (never a model's words). */
  txt: string;
  /** 1–10, from rules (GA's poignancy without the model). */
  imp: number;
  /** Stable across games and PCs (`<game>.<id>.<time>`), so the copy kept on 스페이스기전 merges without doubling. */
  uid?: string;
  /** Real time (ms), to put answers from several games in order. */
  at?: number;
  /**
   * What the player wrote in their own words to a question to think about. Theirs, their homeroom
   * teacher's and their grade head's to read (docs/ref-game/08-knowledge.md §6) — never sent to the AI.
   */
  note?: string;
}

export interface Insight {
  id: string;
  txt: string;
  /** The answers it rests on (GA reflections cite their evidence). */
  ev: number[];
  t: number;
  /**
   * Whose it is: none for what holds of the player in any job (bold or careful); a dweller for what
   * comes of that dweller's own work (a competency their answers lean on), never to be read for another.
   */
  dwellerId?: number;
  /** The game that dweller lives in (`GameState.key`): dwellers of other games share ids. */
  game?: string;
}

export interface PlayerKnowledge {
  v: 1;
  episodes: Episode[];
  insights: Insight[];
  /** Counters: 'card', 'card.risky', 'card.safe', 'card.won', 'card.lost', 'win.<skill>', 'career.<id>'. */
  tally: Record<string, number>;
  nextId: number;
  /** The last ten answers, newest last: 'r' a gamble, 's' a sure thing. */
  recent: string;
}

export const MAX_EPISODES = 120;
/** How fast an answer fades when it's time to make room (a day's factor). */
export const DAILY_FADE = 0.97;

export function newKnowledge(): PlayerKnowledge {
  return { v: 1, episodes: [], insights: [], tally: {}, nextId: 1, recent: '' };
}

const bump = (k: PlayerKnowledge, key: string, by = 1) => (k.tally[key] = (k.tally[key] ?? 0) + by);

/** One answer the player gave at work, as the event and its outcome tell it. */
export interface AnswerRecord {
  dwellerId: number;
  dwellerName: string;
  careerId: string;
  careerName: string;
  level: number;
  eventId: string;
  /** The situation, already filled in with the dweller's name. */
  situation: string;
  label: string;
  /** The competency the answer leaned on (a gamble), if any. */
  skill?: string;
  risky: boolean;
  won: boolean;
  perf: number;
  /** For an honesty dilemma (eventValues.ts): whether the honest answer was picked. */
  honest?: boolean;
  /** The game it was in (`GameState.key`). */
  game?: string;
  /** How the answer went about it, on the AI's three-answer cards (careerEventKit.ts Approach). */
  approach?: 'self' | 'together' | 'safe';
}

/**
 * Importance by rules: 4 for an answer, +2 for a big swing (|performance| ≥ 20), +1 the first time
 * at a new career or rung, +1 for a gamble that came off on a competency for the first time; 1..10.
 */
export function importance(k: PlayerKnowledge, a: AnswerRecord): number {
  let imp = 4;
  if (Math.abs(a.perf) >= 20) imp += 2;
  if (!k.episodes.some((e) => e.tags.includes(`career:${a.careerId}`) && e.tags.includes(`lvl:${a.level}`))) imp += 1;
  if (a.risky && a.won && a.skill && !k.tally[`win.${a.skill}`]) imp += 1;
  return Math.max(1, Math.min(10, imp));
}

/** Remembers an answer: the episode, the counters, and the insights it may bring. */
export function rememberAnswer(k: PlayerKnowledge, now: number, a: AnswerRecord): Episode {
  const imp = importance(k, a);
  bump(k, 'card');
  bump(k, a.risky ? 'card.risky' : 'card.safe');
  bump(k, a.won ? 'card.won' : 'card.lost');
  bump(k, `career.${a.careerId}`);
  if (a.risky && a.won && a.skill) bump(k, `win.${a.skill}`);
  if (a.honest !== undefined) bump(k, a.honest ? 'honest.yes' : 'honest.no');
  k.recent = (k.recent + (a.risky ? 'r' : 's')).slice(-10);
  const situation = a.situation.length > 30 ? `${a.situation.slice(0, 29)}…` : a.situation;
  const id = k.nextId++;
  const ep: Episode = {
    id,
    t: now,
    uid: `${a.game ?? 'local'}.${id}.${Date.now().toString(36)}`,
    at: Date.now(),
    tags: [...(a.game ? [`game:${a.game}`] : []), ...(a.approach ? [`approach:${a.approach}`] : []), `dweller:${a.dwellerId}`, `career:${a.careerId}`, `lvl:${a.level}`, `ev:${a.eventId}`, a.risky ? 'choice:risky' : 'choice:safe', a.won ? 'won' : 'lost', ...(a.skill ? [`skill:${a.skill}`] : []), ...(a.honest === undefined ? [] : [a.honest ? 'value:honest' : 'value:expedient'])],
    txt: `${a.dwellerName}·${a.careerName}: ${situation} → '${a.label}' (${a.won ? '잘 풀림' : '잘 안 풀림'})`,
    imp,
  };
  k.episodes.push(ep);
  trim(k, now);
  reflect(k, now);
  return ep;
}

/** Keeps the store small: the least worth (importance × a fade by age) goes first. */
export function trim(k: PlayerKnowledge, now: number) {
  if (k.episodes.length <= MAX_EPISODES) return;
  const worth = (e: Episode) => e.imp * DAILY_FADE ** ((now - e.t) / 1440);
  k.episodes = [...k.episodes]
    .sort((a, b) => worth(b) - worth(a))
    .slice(0, MAX_EPISODES)
    .sort((a, b) => a.id - b.id);
}

/** Korean words for the competencies in insight sentences. */
const SKILL_WORD: Partial<Record<string, string>> = {
  charisma: '말솜씨', logic: '꼼꼼한 판단력', empathy: '공감하는 마음', leadership: '리더십', fitness: '체력', writing: '글솜씨', programming: '디지털 실력',
  medicine: '의학 지식', science: '과학 지식', law: '법 지식', business: '경영 감각', language: '외국어 실력', driving: '운전 실력', handiness: '손재주',
  painting: '미적 감각', cooking: '요리 솜씨', gardening: '자연을 아는 힘', fishing: '바다를 아는 힘', photography: '사진 실력', comedy: '유머',
};

/**
 * Rule reflections on how the player answers (like 참고 게임 lifestyles: on at a clear lead, off once
 * it fades), each citing the answers it rests on:
 * - 7 of the last 10 answers gambles → bold; 7 sure things → careful (off at 5 or fewer);
 * - three gambles won on one competency → the player trusts it, and it pays.
 */
export function reflect(k: PlayerKnowledge, now: number) {
  const set = (id: string, on: boolean, txt: string, ev: number[]) => {
    const had = k.insights.find((i) => i.id === id);
    if (on && !had) k.insights.push({ id, txt, ev, t: now });
    if (on && had) had.ev = ev;
    if (!on && had) k.insights = k.insights.filter((i) => i !== had);
  };
  const last = (tag: string, extra?: string) =>
    k.episodes
      .filter((e) => e.tags.includes(tag) && (!extra || e.tags.includes(extra)))
      .slice(-5)
      .map((e) => e.id);
  const n = k.recent.length;
  if (n >= 5) {
    const r = [...k.recent].filter((c) => c === 'r').length / n;
    if (r >= 0.7) set('style.risky', true, '어려운 상황에서 과감한 선택을 하는 편이에요', last('choice:risky'));
    else if (r <= 0.5) set('style.risky', false, '', []);
    if (1 - r >= 0.7) set('style.careful', true, '신중하고 안전한 방법을 고르는 편이에요', last('choice:safe'));
    else if (1 - r <= 0.5) set('style.careful', false, '', []);
  }
  // How the player goes about things, on the three-answer cards: on their own, or with others (the
  // last ten such answers, five at least; on at 60%, off at 40%).
  const ways = k.episodes.filter((e) => e.tags.some((t) => t.startsWith('approach:'))).slice(-10);
  if (ways.length >= 5) {
    const share = (w: string) => ways.filter((e) => e.tags.includes(`approach:${w}`)).length / ways.length;
    const ev = (w: string) => ways.filter((e) => e.tags.includes(`approach:${w}`)).slice(-5).map((e) => e.id);
    if (share('together') >= 0.6) set('way.together', true, '혼자보다 다른 사람과 함께 풀어 가는 쪽을 고르는 편이에요', ev('together'));
    else if (share('together') <= 0.4) set('way.together', false, '', []);
    if (share('self') >= 0.6) set('way.self', true, '맡은 일은 먼저 스스로 해결해 보려는 편이에요', ev('self'));
    else if (share('self') <= 0.4) set('way.self', false, '', []);
  }
  // 정직 (known of the player, in any job): the last ten honesty dilemmas, three at least.
  const dilemmas = k.episodes.filter((e) => e.tags.includes('value:honest') || e.tags.includes('value:expedient')).slice(-10);
  if (dilemmas.length >= 3) {
    const h = dilemmas.filter((e) => e.tags.includes('value:honest')).length / dilemmas.length;
    const ev = (tag: string) => dilemmas.filter((e) => e.tags.includes(tag)).slice(-5).map((e) => e.id);
    if (h >= 0.7) set('value.honest', true, '손해를 보더라도 정직하고 옳은 쪽을 고르는 편이에요', ev('value:honest'));
    else if (h <= 0.5) set('value.honest', false, '', []);
    if (h <= 0.3) set('value.practical', true, '상황에 따라 현실적인 쪽을 택하기도 해요', ev('value:expedient'));
    else if (h >= 0.5) set('value.practical', false, '', []);
  }
  // Per dweller, never across them: three gambles won on one competency in that dweller's own work.
  k.insights = k.insights.filter((i) => !(i.id.startsWith('good.') && i.dwellerId === undefined));
  const wins = new Map<string, number[]>();
  for (const e of k.episodes) {
    if (!e.tags.includes('choice:risky') || !e.tags.includes('won')) continue;
    const game = e.tags.find((t) => t.startsWith('game:'))?.slice(5) ?? '';
    const dweller = e.tags.find((t) => t.startsWith('dweller:'));
    const skill = e.tags.find((t) => t.startsWith('skill:'));
    if (!dweller || !skill) continue;
    const key = `${game}|${dweller.slice('dweller:'.length)}|${skill.slice(6)}`;
    wins.set(key, [...(wins.get(key) ?? []), e.id]);
  }
  for (const [key, ev] of wins) {
    if (ev.length < 3) continue;
    const [game, dwellerId, skill] = key.split('|');
    const word = SKILL_WORD[skill] ?? SKILL_INFO[skill as keyof typeof SKILL_INFO]?.label ?? skill;
    const id = `good.${game ? `${game}.` : ''}${dwellerId}.${skill}`;
    if (!k.insights.some((i) => i.id === id)) k.insights.push({ id, txt: `${word}을(를) 믿고 고른 답이 여러 번 통했어요`, ev: ev.slice(-5), t: now, dwellerId: Number(dwellerId), ...(game ? { game } : {}) });
  }
  k.insights = k.insights.slice(-16);
}

/**
 * What may be read when a question is made for one dweller in one job: that dweller's own answers in that
 * job (never another dweller's, nor the same dweller's other jobs), that dweller's insights, and what holds of
 * the player in any job. Dweller A's work never colours a question for dweller B.
 */
export function knowledgeFor(k: PlayerKnowledge | undefined, dwellerId: number, careerId: string, game?: string): { episodes: Episode[]; insights: Insight[] } {
  if (!k) return { episodes: [], insights: [] };
  // Dwellers of other games share ids: with a game given, only that game's (§6).
  const here = (tags: string[]) => !game || tags.includes(`game:${game}`);
  return {
    episodes: k.episodes.filter((e) => here(e.tags) && e.tags.includes(`dweller:${dwellerId}`) && e.tags.includes(`career:${careerId}`)),
    insights: k.insights.filter((i) => i.dwellerId === undefined || (i.dwellerId === dwellerId && (!game || i.game === game))),
  };
}

/** The player's answer to a question to think about (aiQuestions.ts): a picked option or their own words. */
export interface ThoughtRecord {
  game?: string;
  dwellerId: number;
  kind: 'life' | 'explore';
  /** Life's big moment it came from (aiQuestions.ts LifeEvent). */
  event?: string;
  /** Its label in Korean. */
  label: string;
  question: string;
  /** The option picked (its words), if one was. */
  option?: string;
  /** Their own words, if they wrote any (never sent to the AI). */
  note?: string;
}

/** Remembers an answer to a question to think about. No rule insight comes of these (yet). */
export function rememberThought(k: PlayerKnowledge, now: number, a: ThoughtRecord): Episode {
  bump(k, 'thought');
  bump(k, `thought.${a.kind}`);
  const id = k.nextId++;
  const q = a.question.length > 30 ? `${a.question.slice(0, 29)}…` : a.question;
  const note = a.note?.trim().slice(0, 300);
  const ep: Episode = {
    id,
    t: now,
    uid: `${a.game ?? 'local'}.${id}.${Date.now().toString(36)}`,
    at: Date.now(),
    tags: [...(a.game ? [`game:${a.game}`] : []), `dweller:${a.dwellerId}`, `q:${a.kind}`, ...(a.event ? [`event:${a.event}`] : []), note ? 'answer:own' : 'answer:option'],
    txt: `생각 질문(${a.label}): ${q} → ${a.option ? `'${a.option}'` : '직접 씀'}`,
    imp: a.kind === 'life' ? 6 : 5,
    ...(note ? { note } : {}),
  };
  k.episodes.push(ep);
  trim(k, now);
  return ep;
}

/** Answers kept from before games had a key: theirs, from this game (§6). */
export function claimKnowledge(k: PlayerKnowledge, game: string) {
  for (const e of k.episodes) {
    if (!e.tags.some((t) => t.startsWith('game:'))) e.tags.unshift(`game:${game}`);
    e.uid ??= `${game}.${e.id}`;
  }
  for (const i of k.insights) if (i.dwellerId !== undefined) i.game ??= game;
}

/**
 * This game's copy and the one kept on 스페이스기전 (from every game and PC), as one: every answer once
 * (by `uid`), in real-time order, renumbered; counters at the larger of the two (each copy holds
 * all it has seen, the trimmed ones too, so adding would count twice); insights made afresh.
 */
export function syncMerge(local: PlayerKnowledge, remote: PlayerKnowledge | undefined, now: number): PlayerKnowledge {
  if (!remote?.episodes) return local;
  const byUid = new Map<string, Episode>();
  for (const e of [...remote.episodes, ...local.episodes]) byUid.set(e.uid ?? `?${e.id}.${e.t}`, e);
  const all = [...byUid.values()].sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  const k = newKnowledge();
  for (const e of all) k.episodes.push({ ...e, id: k.nextId++ });
  for (const key of new Set([...Object.keys(local.tally), ...Object.keys(remote.tally ?? {})])) k.tally[key] = Math.max(local.tally[key] ?? 0, remote.tally?.[key] ?? 0);
  k.recent = all
    .filter((e) => e.tags.includes('choice:risky') || e.tags.includes('choice:safe'))
    .map((e) => (e.tags.includes('choice:risky') ? 'r' : 's'))
    .join('')
    .slice(-10);
  trim(k, now);
  reflect(k, now);
  return k;
}

/**
 * Stores from older saves (kept on each dweller before it was the player's) merged into one, in time
 * order, numbered afresh.
 */
export function mergeKnowledge(stores: PlayerKnowledge[]): PlayerKnowledge {
  const k = newKnowledge();
  const all = stores.flatMap((s) => s.episodes).sort((a, b) => a.t - b.t);
  for (const e of all) k.episodes.push({ ...e, id: k.nextId++ });
  for (const s of stores) for (const [key, n] of Object.entries(s.tally)) bump(k, key, n);
  k.recent = all
    .map((e) => (e.tags.includes('choice:risky') ? 'r' : 's'))
    .join('')
    .slice(-10);
  if (all.length) {
    trim(k, all[all.length - 1].t);
    reflect(k, all[all.length - 1].t);
  }
  return k;
}

/** The store's size in a save (characters of JSON). */
export const knowledgeSize = (k: PlayerKnowledge | undefined) => (k ? JSON.stringify(k).length : 0);
