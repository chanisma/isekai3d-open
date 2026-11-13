import { BOND_LABEL, GOAL_BY_ID, JOY_BY_ID, bondOf } from './colleagueLife';
import { FEAR_BY_ID } from './fears';
import type { Relationship } from './relationships';
import { careerRequest } from './aiQuestions';
import { CAREER_BY_ID, levelOf } from './careers';
import { STAR_BY_ID } from './stars';
import { TRAIT_BY_ID } from './traits';
import type { Job, Dweller } from './types';
import type { Townie } from './visitors';

/**
 * Work episodes (ours, 2026-10-25, at the user's request and interview — docs/ref-game/08-knowledge.md §7):
 * every few game days of work, a dweller's shift has a scene of their job's drama in place of the day's
 * question card. A season is 3–5 scenes that 스페이스기전's AI writes as a drama writer would — its own
 * theme, cast from the dweller's colleagues (and the stars beside them, stars.ts) plus up to two new
 * people — one scene at a time, each after the last decision (isekai3d-episode). A scene is a
 * conversation with people at work and one decision: two choices, or the player's own words. The
 * decision moves the story on, and counts at once: work performance, money, how close the dweller is to
 * whoever was in the scene, and a mood.
 *
 * Each working dweller has their own season for their job (the server keeps it by the save's key and the
 * dweller). What's written stays on the server, so a scene made while the game was closed comes the next
 * time; one shown and not answered comes back. At most two scenes a real day; with no connection the
 * season waits and the day has its question card as before.
 */

/** Game days between a dweller's episode scenes: two or three (`episodeGap`). */
export const EPISODE_GAP: [number, number] = [2, 3];
export const EPISODE_MOODS = ['happy', 'confident', 'focused', 'inspired', 'sad', 'angry', 'embarrassed', 'stressed'] as const;
export type EpisodeMood = (typeof EPISODE_MOODS)[number];
/** The moodlet a decision's mood leaves (emotions.ts). */
export const EPISODE_BUFF: Record<EpisodeMood, string> = {
  happy: 'storyHappy',
  confident: 'storyProud',
  focused: 'storyFocused',
  inspired: 'storyInspired',
  sad: 'storySad',
  angry: 'storyAngry',
  embarrassed: 'storyEmbarrassed',
  stressed: 'storyTense',
};

export interface EpisodeEffects {
  perf: number;
  money?: number;
  friend?: Record<string, number>;
  mood?: EpisodeMood;
}
export interface EpisodeCast {
  key: string;
  name: string;
  role: string;
  gender: 'female' | 'male';
  new: boolean;
}
export interface EpisodeOutline {
  title: string;
  genre: string;
  logline: string;
  cast: EpisodeCast[];
  beats: string[];
  ending: string;
}
export interface EpisodeScene {
  title: string;
  place: string;
  lines: Array<{ who: string; text: string }>;
  question: string;
  /** Each with what happens at once when it's chosen (`result`, 2026-10-26; scenes before then have none). */
  choices: Array<{ text: string; result?: string; effects: EpisodeEffects }>;
  free: { effects: EpisodeEffects };
  final: boolean;
}

/** A scene on screen (GameState.episode): whose, which, and what it says. */
export interface EpisodeOpen {
  dwellerId: number;
  slot: 'job' | 'partTime';
  sceneId: string;
  episodeId: string;
  idx: number;
  outline: EpisodeOutline;
  scene: EpisodeScene;
}

/** The save's key and the dweller, as the server keeps a dweller's seasons. */
export const gameKeyOf = (key: string | undefined, dwellerId: number) => `${(key ?? 'game').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'game'}:${dwellerId}`;

/** What's sent for a scene to be written: the job, the dweller (no name), and the people at work. */
export function episodeRequest(dweller: Dweller, job: Job, gameKey: string, people: Townie[], rels: Record<string, Pick<Relationship, 'friend' | 'romance'>> = {}) {
  const c = careerRequest(dweller, job, undefined, []).context.career;
  const cast = people.slice(0, 6);
  // How the people at work stand with each other (colleagueLife.ts), for the writer.
  const bonds = (t: Townie) =>
    cast.flatMap((m) => {
      const rel = m.id !== t.id ? rels[t.id < m.id ? `${t.id}-${m.id}` : `${m.id}-${t.id}`] : undefined;
      const kind = rel && bondOf(rel);
      return kind ? [`${m.name.split(' ')[0]}: ${BOND_LABEL[kind]}`] : [];
    });
  return {
    gameKey,
    career: { id: job.careerId, label: CAREER_BY_ID[job.careerId]?.name ?? job.careerId, levelLabel: levelOf(job)?.title ?? '', stage: c.stage.label, ...(c.branch ? { branch: c.branch } : {}), work: c.stageWork, dailyPay: levelOf(job)?.pay ?? 0 },
    dweller: { traits: dweller.traits.map((t) => TRAIT_BY_ID[t]?.label).filter((x): x is string => !!x).slice(0, 6), emotion: dweller.emotion, gender: dweller.gender ?? '' },
    cast: cast.map((t) => ({
      id: t.id,
      name: t.name.split(' ')[0],
      role: t.star ? STAR_BY_ID[t.star]?.title ?? t.role ?? '동료' : t.role ?? '동료',
      gender: t.gender === 'male' ? 'male' : 'female',
      traits: (t.traits ?? []).map((x) => TRAIT_BY_ID[x]?.label).filter((x): x is string => !!x).slice(0, 3),
      ...(t.star ? { persona: STAR_BY_ID[t.star]?.persona } : {}),
      ...(t.goal && GOAL_BY_ID[t.goal] ? { goal: GOAL_BY_ID[t.goal].label } : {}),
      ...(t.fears?.length ? { worry: t.fears.map((f) => FEAR_BY_ID[f].label).join(', ') } : {}),
      ...(t.joy && JOY_BY_ID[t.joy] ? { joy: JOY_BY_ID[t.joy].label } : {}),
      ...(bonds(t).length ? { bonds: bonds(t) } : {}),
    })),
  };
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
};

function effects(raw: unknown, keys: Set<string>): EpisodeEffects {
  const e = (raw ?? {}) as Record<string, unknown>;
  const out: EpisodeEffects = { perf: num(e.perf, -10, 10) };
  const money = num(e.money, -2000, 2000);
  if (money) out.money = money;
  if (e.friend && typeof e.friend === 'object') {
    const f: Record<string, number> = {};
    for (const [k, v] of Object.entries(e.friend as Record<string, unknown>)) if (keys.has(k) && num(v, -15, 15)) f[k] = num(v, -15, 15);
    if (Object.keys(f).length) out.friend = f;
  }
  if (EPISODE_MOODS.includes(e.mood as EpisodeMood)) out.mood = e.mood as EpisodeMood;
  return out;
}

/** The server's outline and scene, checked again (the game doesn't trust it); null if they won't do. */
export function readEpisode(rawOutline: unknown, rawScene: unknown): { outline: EpisodeOutline; scene: EpisodeScene } | null {
  const o = (rawOutline ?? {}) as Record<string, unknown>;
  const s = (rawScene ?? {}) as Record<string, unknown>;
  const title = str(o.title, 30);
  const cast = (Array.isArray(o.cast) ? o.cast : []).flatMap((c: Record<string, unknown>) => {
    const key = str(c?.key, 10);
    const name = str(c?.name, 14);
    return key && name ? [{ key, name, role: str(c.role, 12) ?? '', gender: c.gender === 'male' ? ('male' as const) : ('female' as const), new: !!c.new }] : [];
  });
  if (!title || !cast.length) return null;
  const keys = new Set(cast.map((c) => c.key));
  const lines = (Array.isArray(s.lines) ? s.lines : []).flatMap((l: Record<string, unknown>) => {
    const who = str(l?.who, 10);
    const text = str(l?.text, 160);
    return who && text && (who === 'me' || who === 'narration' || keys.has(who)) ? [{ who, text }] : [];
  });
  const choices = (Array.isArray(s.choices) ? s.choices : []).flatMap((c: Record<string, unknown>) => {
    const text = str(c?.text, 50);
    const result = str(c?.result, 160);
    return text ? [{ text, ...(result ? { result } : {}), effects: effects(c.effects, keys) }] : [];
  });
  const question = str(s.question, 100);
  if (lines.length < 2 || choices.length !== 2 || !question) return null;
  return {
    outline: { title, genre: str(o.genre, 16) ?? '', logline: str(o.logline, 120) ?? '', cast, beats: (Array.isArray(o.beats) ? o.beats : []).map((b) => String(b).slice(0, 80)), ending: str(o.ending, 80) ?? '' },
    scene: { title: str(s.title, 30) ?? title, place: str(s.place, 24) ?? '', lines, question, choices, free: { effects: effects((s.free as Record<string, unknown> | undefined)?.effects, keys) }, final: !!s.final },
  };
}

/** The player's own words: a decision with no effects of its own takes these (a little good, nothing more). */
export const FREE_DEFAULT: EpisodeEffects = { perf: 2 };
