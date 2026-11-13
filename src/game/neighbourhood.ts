import { BOTTOMS, HAIR_STYLES, PANTS_COLORS } from './looks';
import { BABY_STAGES, LIFESPANS, type Lifespan } from './babies';
import { CAREER_BY_ID, levelsOf, WEEKDAYS } from './careers';
import { babyCarrier, guessGender, pickName, roleFor, type Gender } from './gender';
import { HAIR_COLORS, SHIRT_COLORS, SKIN_COLORS } from './constants';
import { randomPreferences } from './preferences';
import { clockInfo, formatClock, josa } from './util';
import { asleepAt, type Townie } from './visitors';
import type { Dweller } from './types';
import { withSkills } from './townieSkills';
import { drawTraits } from './traits';

/**
 * The neighbourhood as households (ours, after 참고 게임's townie households): families with children,
 * teens and grandparents as well as grown-ups, each grown-up with a real job and its hours, so the
 * people next door are out at work or at school when they would be, and the household's children
 * have friends their own age. The first six keep the ids and looks of the old neighbours.
 */
/** The houses on the street; each is called after its eldest grown-up (houseName). */
export const NEIGHBOR_HOUSES: Array<{ id: string; icon: string }> = [
  { id: 'h1', icon: '🏡' },
  { id: 'h2', icon: '🏠' },
  { id: 'h3', icon: '🏘️' },
  { id: 'h4', icon: '🪴' },
  { id: 'h5', icon: '🏢' },
  // Room for the street to grow (2026-10-20): grown-up children leaving home, newly-weds, newcomers.
  { id: 'h6', icon: '🏚️' },
  { id: 'h7', icon: '🏕️' },
  { id: 'h8', icon: '🏬' },
];

type Member = Pick<Townie, 'name' | 'gender' | 'traits' | 'age' | 'home' | 'role' | 'job' | 'retiredFrom' | 'hairStyle' | 'outfit'> & {
  /** Their colours: the same in every game (ours: at the user's request, the street looked different on another computer). */
  shirt: string;
  skin: string;
  hair: string;
};

/** The cast. The first six are the old neighbours (ids 101-106), in their old order. */
export const CAST: Member[] = [
  { name: '도윤', gender: 'male', traits: ['outgoing', 'active'], home: 'h1', role: '아빠', job: { careerId: 'firefighter', level: 2 }, shirt: '#1e88e5', skin: '#f1c9a5', hair: '#1a1a1a' },
  { name: '수아', gender: 'female', traits: ['bookworm', 'loner'], home: 'h2', role: '엄마', job: { careerId: 'librarian', level: 2 }, shirt: '#8e24aa', skin: '#fde7da', hair: '#2b1b10' },
  { name: '시우', gender: 'male', traits: ['goofball', 'glutton'], home: 'h3', role: '아빠', job: { careerId: 'culinary', level: 1 }, shirt: '#fb8c00', skin: '#dcae7f', hair: '#2b1b10' },
  { name: '예린', gender: 'female', traits: ['cheerful', 'loyal'], home: 'h1', role: '엄마', job: { careerId: 'teacher', level: 2 }, shirt: '#f06292', skin: '#f8d9c0', hair: '#5b3a1e' },
  { name: '태오', gender: 'male', traits: ['hotHeaded', 'lazy'], home: 'h4', role: '손자', job: { careerId: 'mechanic', level: 1 }, shirt: '#e53935', skin: '#eac09a', hair: '#1a1a1a' },
  { name: '다은', gender: 'female', traits: ['gloomy', 'bookworm'], home: 'h5', role: '혼자 살아요', job: { careerId: 'nurse', level: 1 }, shirt: '#546e7a', skin: '#f8d9c0', hair: '#2b1b10' },
  { name: '하준', gender: 'male', traits: ['active', 'goofball'], age: 'child', home: 'h1', role: '아들', hairStyle: 'short', outfit: 'tee', shirt: '#43a047', skin: '#f8d9c0', hair: '#1a1a1a' },
  { name: '지호', gender: 'male', traits: ['geek', 'loner'], age: 'teen', home: 'h2', role: '아들', job: { careerId: 'barista', level: 0 }, hairStyle: 'wolf', outfit: 'tee', shirt: '#00897b', skin: '#fde7da', hair: '#2b1b10' },
  { name: '서윤', gender: 'female', traits: ['creative', 'bookworm'], age: 'child', home: 'h3', role: '딸', hairStyle: 'long', outfit: 'dress', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
  { name: '영자', gender: 'female', traits: ['familyOriented', 'neat'], age: 'elder', home: 'h4', role: '할머니', retiredFrom: 'farmer', hairStyle: 'bun', outfit: 'dress', shirt: '#546e7a', skin: '#eac09a', hair: '#b0b0b0' },
];

/** The cast's own colours on the neighbours they play (older saves drew them at random). */
export function castColours(townies: Townie[]) {
  CAST.forEach((m, i) => {
    const t = i < 6 ? townies.find((x) => x.id === 101 + i && x.name === m.name) : townies.find((x) => x.name === m.name && x.home === m.home);
    // Grown old, they keep the grey hair it brought.
    if (t) Object.assign(t, { shirt: m.shirt, skin: m.skin, hair: t.age === 'elder' && m.age !== 'elder' ? t.hair : m.hair });
  });
}

const looks = (rng: () => number, m: Pick<Member, 'name' | 'age' | 'hairStyle' | 'outfit'> & Partial<Pick<Member, 'shirt' | 'skin' | 'hair'>>) => {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
  // Drawn even for the cast (who have their own colours), so the street's other draws stay as they were.
  const shirt = pick(SHIRT_COLORS);
  const skin = pick(SKIN_COLORS);
  const hair = m.age === 'elder' ? HAIR_COLORS[HAIR_COLORS.length - 1] : pick(HAIR_COLORS);
  return {
    shirt: m.shirt ?? shirt,
    skin: m.skin ?? skin,
    hair: m.hair ?? hair,
    hairStyle: m.hairStyle ?? pick(HAIR_STYLES.map(([h]) => h)),
    outfit: m.outfit ?? pick(['tee', 'tee', 'dress', 'hoodie', 'shirt', 'sweater', 'jacket', 'overalls'] as const),
    // Bottoms by name, so the street's random draws stay as they were.
    ...extras(m.name),
  };
}

/** A bottom and its colour, settled by a name (no draw from the game's dice). */
function extras(name: string) {
  let h = 7;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { bottom: BOTTOMS[h % BOTTOMS.length][0], pants: PANTS_COLORS[(h >> 3) % PANTS_COLORS.length] };
}

/**
 * The neighbourhood for a game, old or new: the old six get their household, job and place; the
 * rest of the cast moves in with ids after every id in use. Neighbours who have since moved in
 * with the player's household (a wedding) stay moved.
 */
export function settleNeighbourhood(townies: Townie[] | undefined, rng: () => number, firstFreeId: number, now = 0, lifespan: Lifespan = 'normal', moved: Set<string> = new Set()): Townie[] {
  const out: Townie[] = (townies ?? []).map((t) => ({ ...t }));
  // After every id in use, the old six's included (a new game has none yet, but they take 101-106).
  let next = Math.max(firstFreeId, 101 + 6, ...out.map((t) => t.id + 1));
  CAST.forEach((m, i) => {
    const old = i < 6 ? out.find((t) => t.id === 101 + i) : out.find((t) => t.name === m.name && t.home === m.home);
    if (old) {
      old.home ??= m.home;
      old.role ??= m.role;
      old.gender ??= m.gender;
      old.age ??= m.age;
      if (!old.job && !old.retiredFrom) {
        old.job = m.job;
        old.retiredFrom = m.retiredFrom;
      }
      old.stageStart ??= startedAgo(old.age, now, lifespan, rng);
      return;
    }
    // A new game starts with everyone; an old one gains the newcomers (not someone who moved in).
    if (i < 6 && townies) return;
    if (moved.has(m.name)) return;
    out.push({ id: i < 6 ? 101 + i : next++, name: m.name, gender: m.gender, traits: m.traits, age: m.age, home: m.home, role: m.role, job: m.job, retiredFrom: m.retiredFrom, stageStart: startedAgo(m.age, now, lifespan, rng), ...looks(rng, m), ...randomPreferences(rng, { traits: m.traits, age: m.age, skill: m.job ? CAREER_BY_ID[m.job.careerId]?.skill : undefined }) });
  });
  // Anyone else (a family that moved in before genders) gets one from their role or name.
  for (const t of out) t.gender ??= t.role && /엄마|딸|할머니|손녀/.test(t.role) ? 'female' : t.role && /아빠|아들|할아버지|손자/.test(t.role) ? 'male' : guessGender(t.name, t.outfit);
  // What each is good at (an old save's neighbours get theirs here).
  for (const t of out) t.skills = withSkills(t);
  linkFamilies(out);
  return out;
}

export type Whereabouts = 'home' | 'work' | 'school' | 'asleep';

/** The level of a neighbour's job (the first track's), for its title and hours. */
export function townieLevel(t: Townie) {
  const career = t.job && CAREER_BY_ID[t.job.careerId];
  if (!career) return undefined;
  const levels = levelsOf(career, t.job!.branch ?? 0);
  return levels[Math.min(t.job!.level, levels.length - 1)];
}

/** Whether `minute` of `day` falls in a shift, including one that began the day before and runs past midnight. */
function inShift(start: number, end: number, days: number[], day: number, minute: number): boolean {
  const weekday = ((day % 7) + 7) % 7;
  if (days.includes(weekday) && minute >= start && minute < Math.min(end, 1440)) return true;
  const yesterday = (weekday + 6) % 7;
  return end > 1440 && days.includes(yesterday) && minute < end - 1440;
}

/**
 * Where a neighbour is at `time`: asleep at night, at school on weekdays 8-15 (children and
 * teens), at work in their job's hours, otherwise at home.
 */
export function whereabouts(t: Townie, time: number): Whereabouts {
  const { day, minuteOfDay } = clockInfo(time);
  const lvl = townieLevel(t);
  // A night shift beats the night: someone at work isn't asleep.
  if (lvl && inShift(lvl.start, lvl.end, lvl.days ?? WEEKDAYS, day, minuteOfDay)) return 'work';
  if (asleepAt(minuteOfDay) || ((t.age === 'child') && minuteOfDay >= 21 * 60)) return 'asleep';
  if ((t.age === 'child' || t.age === 'teen') && day % 7 < 5 && minuteOfDay >= 8 * 60 && minuteOfDay < 15 * 60) return 'school';
  return 'home';
}

/** When they will be back, for "17:00까지". */
export function backAt(t: Townie, time: number): string | undefined {
  const where = whereabouts(t, time);
  if (where === 'school') return formatClock(15 * 60);
  if (where === 'asleep') return formatClock(t.age === 'child' ? 7 * 60 : 6 * 60 + 30);
  if (where !== 'work') return undefined;
  const lvl = townieLevel(t)!;
  return formatClock(lvl.end % 1440);
}

export const WHEREABOUTS_LABEL: Record<Whereabouts, string> = { home: '집에 있음', work: '일하는 중', school: '학교에 있음', asleep: '자는 중' };

/** Why a neighbour can't be reached right now, if they can't (ours: 참고 게임 townies away at work don't come either). */
export function awayReason(t: Townie, time: number): string | null {
  const where = whereabouts(t, time);
  if (where === 'home') return null;
  return `${WHEREABOUTS_LABEL[where]}이에요 (${backAt(t, time)}까지)`;
}

export function ageLabel(t: Townie): string {
  return t.age === 'child' ? '어린이' : t.age === 'teen' ? '청소년' : t.age === 'elder' ? '노인' : '어른';
}

// ---------- the years going by (ours, after 참고 게임 townies ageing along with the household) ----------

/** Days a neighbour spends in each life stage: the household's lifespan setting (babies.ts). */
export function stageDays(age: Townie['age'], lifespan: Lifespan): number {
  const ls = LIFESPANS[lifespan];
  if (age === 'baby') return BABY_STAGES[lifespan].total + ls.toddler;
  if (age === 'child') return ls.child;
  if (age === 'teen') return ls.teen;
  if (age === 'elder') return ls.elder;
  return ls.adult;
}

/** A stage begun some way back, so the street doesn't all grow up on the same day. */
function startedAgo(age: Townie['age'], now: number, lifespan: Lifespan, rng: () => number): number {
  const days = stageDays(age, lifespan);
  // Grown-ups start early in their stage and the old at its start, so the first weeks aren't farewells.
  const share = age === 'elder' ? 0 : !age ? 0.5 : 0.8;
  return now - Math.floor((Number.isFinite(days) ? days : 30) * share * rng() * 1440);
}

const hasBatchim = (name: string) => {
  const c = name.charCodeAt(name.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0;
};

/** "도윤이네", "수아네": the house called after its eldest grown-up, or after anyone in it. */
export function houseName(houseId: string, townies: Townie[]): string {
  const rank = (t: Townie) => (t.age === 'elder' ? 0 : !t.age ? 1 : t.age === 'teen' ? 2 : 3);
  const head = townies.filter((t) => t.home === houseId).sort((a, b) => rank(a) - rank(b) || a.id - b.id)[0];
  if (!head) return '빈집';
  return `${head.name}${hasBatchim(head.name) ? '이네' : '네'}`;
}

/** Jobs a grown-up neighbour takes on: everyday work people see around them (ours). */
export const NEIGHBOUR_JOBS = ['teacher', 'nurse', 'police', 'firefighter', 'librarian', 'culinary', 'mechanic', 'baker', 'busDriver', 'socialWorker', 'pharmacist', 'mailCarrier', 'tech', 'farmer', 'graphicDesigner', 'civilServant', 'careWorker', 'hairStylist', 'accountant', 'dentist'];
const TEEN_JOBS = ['barista', 'fastFood', 'retail'];

export type NeighbourEventKind = 'grewUp' | 'job' | 'promoted' | 'retired' | 'born' | 'passed' | 'movedIn' | 'friends' | 'bestFriends' | 'dating' | 'married' | 'leftHome';
export interface NeighbourEvent {
  kind: NeighbourEventKind;
  townieId: number;
  /** The other one, for news about two neighbours. */
  withId?: number;
  icon: string;
  text: string;
}

/** Most people the street holds. */
export const STREET_MAX = 24;
/** The street's own people: not the colleagues kept with them (colleagues.ts), who live elsewhere. */
export const onStreet = (townies: Townie[]) => townies.filter((t) => !t.workmate);
/** Below this many, an empty house gets a family from elsewhere (ours); above it, the street grows by itself. */
export const STREET_TARGET = 12;
/** Most people in one house. */
export const HOUSE_MAX = 5;
/** A family with both parents: odds of a baby each day (ours: about once a month). */
export const BIRTH_CHANCE = 0.03;
/** A grown-up's odds of a promotion each day (ours: about every 25 days). */
export const PROMOTION_CHANCE = 0.04;
/** An empty house's odds of a new family each day (ours). */
export const MOVE_IN_CHANCE = 0.25;

const STAGE_NAME: Record<string, string> = { child: '어린이가', teen: '청소년이', adult: '어른이', elder: '노인이' };

/**
 * One day in the neighbourhood: neighbours grow into their next life stage when its days are up
 * (a teen may take a part-time job, a new grown-up a job, the old retire), grown-ups are now and
 * then promoted, a family may have a baby, the oldest pass away at the end of old age (never while
 * on the lot), and an empty house now and then gets a new family. Mutates `townies` and returns
 * what happened, for the news.
 */
export function ageNeighbourhood(townies: Townie[], now: number, lifespan: Lifespan, rng: () => number, nextId: () => number, here: Set<number>, bonds?: Record<string, number>): NeighbourEvent[] {
  const ev: NeighbourEvent[] = [];
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length) % xs.length];
  const say = (kind: NeighbourEventKind, t: Townie, icon: string, text: string) => ev.push({ kind, townieId: t.id, icon, text: `${icon} ${text}` });
  const jobs = NEIGHBOUR_JOBS.filter((id) => CAREER_BY_ID[id]);
  for (const t of [...townies]) {
    // Colleagues (colleagues.ts) live off the street: they keep their age and post while they're colleagues.
    if (t.workmate) continue;
    const days = stageDays(t.age, lifespan);
    t.stageStart ??= now;
    if (Number.isFinite(days) && now - t.stageStart >= days * 1440) {
      if (t.age === 'elder') {
        if (here.has(t.id)) continue;
        townies.splice(townies.indexOf(t), 1);
        widow(townies, t.id);
        say('passed', t, '🕊️', `이웃 ${josa(t.name, '이/가')} 오랜 삶을 마치고 세상을 떠났어요`);
        continue;
      }
      const next: Townie['age'] = t.age === 'baby' ? 'child' : t.age === 'child' ? 'teen' : t.age === 'teen' ? undefined : 'elder';
      t.age = next;
      t.stageStart = now;
      say('grewUp', t, '🎂', `이웃 ${josa(t.name, '이/가')} ${STAGE_NAME[next ?? 'adult']} 됐어요`);
      if (next === 'teen' && rng() < 0.5) {
        t.job = { careerId: pick(TEEN_JOBS), level: 0 };
        say('job', t, '🧋', `${josa(t.name, '이/가')} ${CAREER_BY_ID[t.job.careerId].name} 일을 시작했어요`);
      } else if (next === undefined) {
        t.job = { careerId: pick(jobs), level: 0 };
        say('job', t, '💼', `${josa(t.name, '이/가')} ${CAREER_BY_ID[t.job.careerId].name} 일을 시작했어요`);
      } else if (next === 'elder' && t.job) {
        t.retiredFrom = t.job.careerId;
        t.job = undefined;
        say('retired', t, '🏖️', `${josa(t.name, '이/가')} ${CAREER_BY_ID[t.retiredFrom].name} 일에서 은퇴했어요`);
      }
      continue;
    }
    if (!t.age && t.job && !CAREER_BY_ID[t.job.careerId]?.partTime && rng() < PROMOTION_CHANCE) {
      const levels = levelsOf(CAREER_BY_ID[t.job.careerId], 0);
      if (t.job.level < levels.length - 1) {
        t.job.level++;
        say('promoted', t, '📈', `이웃 ${josa(t.name, '이/가')} ${levels[t.job.level].title}(으)로 승진했어요`);
      }
    }
  }
  const used = new Set(townies.map((t) => t.name));
  // A name that goes with the gender (gender.ts).
  const freshName = (g: Gender) => {
    const name = pickName(g, [...used], rng());
    used.add(name);
    return name;
  };
  const gender = (): Gender => (rng() < 0.5 ? 'female' : 'male');
  for (const h of housesOf(townies)) {
    const members = townies.filter((t) => t.home === h.id);
    // A baby comes to a married couple at home together who can have one (참고 게임 gender options,
    // gender.ts), up to three of their own.
    const couple = members.map((a) => [a, members.find((b) => b.id === a.partnerId && b.married)] as const).find(([a, b]) => b && a.id < b.id && !a.age && !b.age && babyCarrier(a, b));
    const theirs = couple ? members.filter((k) => k.parents?.includes(couple[0].id) && k.parents.includes(couple[1]!.id)).length : 0;
    if (couple && theirs < 3 && members.length < HOUSE_MAX && onStreet(townies).length < STREET_MAX && rng() < BIRTH_CHANCE) {
      const g = gender();
      const name = freshName(g);
      const baby: Townie = { id: nextId(), name, gender: g, age: 'baby', home: h.id, role: roleFor('child', g), parents: [couple[0].id, couple[1]!.id], stageStart: now, traits: [], ...looks(rng, { name }), ...randomPreferences(rng) };
      townies.push(baby);
      say('born', baby, '👶', `${houseName(h.id, townies)}에 아기 ${josa(name, '이/가')} 태어났어요`);
    }
    if (!members.length && townies.length < STREET_TARGET && rng() < MOVE_IN_CHANCE) {
      const family: Townie[] = [];
      const add = (age: Townie['age'], g: Gender) => {
        const traits = drawTraits(rng, age);
        const t: Townie = { id: nextId(), name: freshName(g), gender: g, age, home: h.id, role: roleFor(age ? 'child' : 'parent', g), stageStart: startedAgo(age, now, lifespan, rng), traits: traits, ...looks(rng, { name: '', age }), ...randomPreferences(rng, { traits: traits, age: age }) };
        if (!age) t.job = { careerId: pick(jobs), level: Math.floor(rng() * 3) };
        family.push(t);
      };
      const first = gender();
      add(undefined, first);
      if (rng() < 0.6) add(undefined, first === 'female' ? 'male' : 'female');
      const [a, b] = family;
      if (b) marry(a, b);
      else a.role = ALONE;
      const kids = Math.floor(rng() * 3);
      for (let k = 0; k < kids; k++) add(rng() < 0.6 ? 'child' : 'teen', gender());
      for (const k of family.slice(b ? 2 : 1)) k.parents = b ? [a.id, b.id] : [a.id];
      townies.push(...family);
      say('movedIn', family[0], '📦', `빈집에 ${houseName(h.id, townies)} 가족 ${family.length}명이 이사 왔어요`);
    }
  }
  // Love, weddings and leaving home (streetLife below).
  ev.push(...stepStreetLife(townies, now, lifespan, rng, nextId, freshName, here, bonds));
  // Everyone's skills keep up with a birthday, a new job or a promotion (townieSkills.ts).
  for (const t of townies) t.skills = withSkills(t);
  return ev;
}

// ---------- friendships on the street and neighbours' calls (참고 게임 NeighborhoodStories, NeighborRelPhoneCall) ----------

/** How close two neighbours are with each other (0-100), kept by pair. */
export const bondKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
/** 참고 게임's friendship stages for a neighbour pair's news: friends at 35, best friends at 70 (04 §1.3). */
export const STREET_FRIENDS = 35;
export const STREET_BEST = 70;

/** Children and teens make friends among themselves, grown-ups and the old among themselves (ours). */
export function sameCrowd(a: Townie, b: Townie): boolean {
  const young = (t: Townie) => t.age === 'child' || t.age === 'teen';
  return young(a) === young(b);
}

/**
 * A day of friendships on the street (참고 게임 NeighborhoodStories RelationshipUpdates: neighbours
 * becoming friends and best friends, told as news; ours leaves out the falling-outs and the
 * romances): one or two pairs from different houses get to know each other better.
 */
export function stepStreetBonds(townies: Townie[], bonds: Record<string, number>, rng: () => number): NeighbourEvent[] {
  const ev: NeighbourEvent[] = [];
  const grown = onStreet(townies).filter((t) => t.age !== 'baby');
  const rolls = 1 + (rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < rolls && grown.length > 1; i++) {
    const a = grown[Math.floor(rng() * grown.length) % grown.length];
    const others = grown.filter((b) => b !== a && b.home !== a.home && sameCrowd(a, b));
    if (!others.length) continue;
    const b = others[Math.floor(rng() * others.length) % others.length];
    ev.push(...growBond(a, b, bonds, 10 + Math.floor(rng() * 16)));
  }
  return ev;
}

/** Brings two neighbours closer, with news when they become friends or best friends. */
export function growBond(a: Townie, b: Townie, bonds: Record<string, number>, by: number): NeighbourEvent[] {
  const key = bondKey(a.id, b.id);
  const before = bonds[key] ?? 0;
  const after = Math.min(100, before + by);
  bonds[key] = after;
  const pair = `${josa(a.name, '와/과')} ${josa(b.name, '이/가')}`;
  if (before < STREET_BEST && after >= STREET_BEST) return [{ kind: 'bestFriends', townieId: a.id, withId: b.id, icon: '💛', text: `💛 이웃 ${pair} 절친이 됐어요` }];
  if (before < STREET_FRIENDS && after >= STREET_FRIENDS) return [{ kind: 'friends', townieId: a.id, withId: b.id, icon: '🤝', text: `🤝 이웃 ${pair} 친구가 됐어요` }];
  return [];
}

/** 참고 게임 dialogDramaNode_NeighborRelPhoneCall: 72 hours between calls; the thank-you comes 12-36 hours later. */
export const NEIGHBOUR_CALL_COOLDOWN = 72 * 60;
export const FOLLOW_UP: [number, number] = [12 * 60, 36 * 60];
/** How long a call rings before it counts as unanswered (ours). */
export const CALL_RING = 120;

/** Who might call to ask about getting closer to whom: a friend at home, about someone they don't know well yet. */
export function pickAdviceCall(townies: Townie[], bonds: Record<string, number>, friendOf: (t: Townie) => number, home: (t: Townie) => boolean, rng: () => number): { from: Townie; about: Townie } | null {
  const callers = onStreet(townies).filter((t) => t.age !== 'baby' && t.age !== 'child' && home(t) && friendOf(t) >= 15);
  if (!callers.length) return null;
  const from = callers[Math.floor(rng() * callers.length) % callers.length];
  const abouts = onStreet(townies).filter((t) => t !== from && t.age !== 'baby' && sameCrowd(from, t) && (bonds[bondKey(from.id, t.id)] ?? 0) < STREET_FRIENDS);
  if (!abouts.length) return null;
  return { from, about: abouts[Math.floor(rng() * abouts.length) % abouts.length] };
}

// ---------- love, weddings, leaving home: the street goes on for generations (2026-10-20) ----------
//
// At the user's request (the street ran out of parents: neighbours never married, and grown-up
// children never had families of their own). Ours, after 참고 게임's townie households in spirit:
//  · single grown-ups from different houses who've become close friends may start going out, and
//    a couple going out may marry; the newly-weds set up home together (`settleCouple`)
//  · a single grown-up may meet someone from elsewhere, who marries them and comes to live here
//  · a grown-up child may leave home for an empty house
//  · births come to married couples (ageNeighbourhood), so the street's children grow up to be parents

/** Close friends (street bond) who might start going out (ours; 참고 게임 friends at 35, good friends at 70). */
export const STREET_DATE = 50;
/** A pair of close single neighbours' odds of starting to go out, each day. */
export const DATE_CHANCE = 0.05;
/** A couple going out (at least `ENGAGE_DAYS` days)'s odds of marrying, each day. */
export const WED_CHANCE = 0.06;
export const ENGAGE_DAYS = 5;
/** A single grown-up's odds of marrying someone from elsewhere, each day, once settled in their adult life. */
export const OUTSIDE_LOVE = 0.015;
/** A grown-up child's odds of leaving home for an empty house, each day. */
export const LEAVE_HOME = 0.012;
const ALONE = '혼자 살아요';

const grownUp = (t: Townie) => !t.age;
const single = (t: Townie) => grownUp(t) && t.partnerId === undefined;

/** Family by blood: a parent and child, or brothers and sisters (sharing a parent). */
export function related(a: Townie, b: Townie): boolean {
  if (a.parents?.includes(b.id) || b.parents?.includes(a.id)) return true;
  return !!a.parents?.some((p) => b.parents?.includes(p));
}

function marry(a: Townie, b: Townie) {
  a.partnerId = b.id;
  b.partnerId = a.id;
  a.married = b.married = true;
  a.role = roleFor('parent', a.gender ?? 'female');
  b.role = roleFor('parent', b.gender ?? 'female');
}

/** Someone died: their partner is on their own again. */
function widow(townies: Townie[], id: number) {
  for (const p of townies.filter((x) => x.partnerId === id)) {
    p.partnerId = undefined;
    p.married = undefined;
  }
}

/** Someone left the street (moved in with the player's household): whoever they went out with or married is single again. */
export function leaveStreet(townies: Townie[], id: number) {
  widow(townies, id);
}

/** Who moves along with a grown-up: their children who live with them. */
function dependants(townies: Townie[], t: Townie): Townie[] {
  return townies.filter((k) => k.home === t.home && k.age && k.parents?.includes(t.id));
}

const emptyHouse = (townies: Townie[]) => NEIGHBOR_HOUSES.find((h) => !townies.some((t) => t.home === h.id));

/**
 * A newly-wed couple's home: where one of them already keeps house (alone or with their children),
 * the other moves in with theirs; if both live with others, into an empty house together; failing
 * that, into whichever of their houses has room. False if there's nowhere (they keep going out).
 */
function settleCouple(townies: Townie[], a: Townie, b: Townie): boolean {
  const party = (t: Townie) => [t, ...dependants(townies, t)];
  const keepsHouse = (t: Townie) => townies.filter((x) => x.home === t.home).every((x) => party(t).includes(x));
  const size = (h?: string) => townies.filter((x) => x.home === h).length;
  const moveTo = (who: Townie[], h: string) => who.forEach((x) => (x.home = h));
  if (a.home === b.home) return true;
  for (const [host, guest] of [
    [a, b],
    [b, a],
  ] as const) {
    if (keepsHouse(host) && keepsHouse(guest) && size(host.home) + party(guest).length <= HOUSE_MAX) {
      moveTo(party(guest), host.home!);
      return true;
    }
  }
  const free = emptyHouse(townies);
  if (free && party(a).length + party(b).length <= HOUSE_MAX) {
    moveTo([...party(a), ...party(b)], free.id);
    return true;
  }
  for (const [host, guest] of [
    [a, b],
    [b, a],
  ] as const) {
    if (size(host.home) + party(guest).length <= HOUSE_MAX) {
      moveTo(party(guest), host.home!);
      return true;
    }
  }
  return false;
}

/** The old cast's families (no partner or parent ids yet): a house's 엄마 and 아빠 are married, its 아들·딸 theirs. */
function linkFamilies(townies: Townie[]) {
  for (const h of housesOf(townies)) {
    const members = townies.filter((t) => t.home === h.id);
    const mum = members.filter((t) => grownUp(t) && t.role === '엄마');
    const dad = members.filter((t) => grownUp(t) && t.role === '아빠');
    if (mum.length === 1 && dad.length === 1 && mum[0].partnerId === undefined && dad[0].partnerId === undefined) {
      mum[0].partnerId = dad[0].id;
      dad[0].partnerId = mum[0].id;
      mum[0].married = dad[0].married = true;
    }
    const parents = [...mum, ...dad];
    for (const k of members) if (!k.parents && (k.role === '아들' || k.role === '딸') && parents.length) k.parents = parents.map((p) => p.id);
  }
}

export function stepStreetLife(townies: Townie[], now: number, lifespan: Lifespan, rng: () => number, nextId: () => number, freshName: (g: Gender) => string, here: Set<number>, bonds?: Record<string, number>): NeighbourEvent[] {
  const ev: NeighbourEvent[] = [];
  const say = (kind: NeighbourEventKind, t: Townie, icon: string, text: string, withId?: number) => ev.push({ kind, townieId: t.id, withId, icon, text: `${icon} ${text}` });
  const pair = (a: Townie, b: Townie) => `${josa(a.name, '와/과')} ${josa(b.name, '이/가')}`;
  const byId = (id: number | undefined) => townies.find((x) => x.id === id);
  const adultDays = (t: Townie) => (now - (t.stageStart ?? now)) / 1440;

  // Couples going out may marry, and set up home together.
  for (const a of onStreet(townies)) {
    const b = byId(a.partnerId);
    if (!b || a.married || a.id > b.id || (now - (a.datingSince ?? now)) / 1440 < ENGAGE_DAYS || rng() >= WED_CHANCE) continue;
    if (!settleCouple(townies, a, b)) continue;
    marry(a, b);
    say('married', a, '💍', `이웃 ${pair(a, b)} 결혼했어요`, b.id);
  }
  // Close single friends may start going out (not family, both grown up and single).
  if (bonds) {
    const singles = onStreet(townies).filter(single);
    for (let i = 0; i < singles.length; i++)
      for (let j = i + 1; j < singles.length; j++) {
        const [a, b] = [singles[i], singles[j]];
        if (a.partnerId !== undefined || b.partnerId !== undefined || related(a, b) || a.gender === b.gender) continue;
        if ((bonds[bondKey(a.id, b.id)] ?? 0) < STREET_DATE || rng() >= DATE_CHANCE) continue;
        a.partnerId = b.id;
        b.partnerId = a.id;
        a.datingSince = b.datingSince = now;
        say('dating', a, '💕', `이웃 ${pair(a, b)} 사귀기 시작했어요`, b.id);
      }
  }
  // A single grown-up a while into their adult life may meet someone from elsewhere, who marries
  // them and moves to the street (so a family of their own can come).
  if (onStreet(townies).length < STREET_MAX) {
    for (const a of onStreet(townies).filter((t) => single(t) && adultDays(t) >= 6)) {
      if (rng() >= OUTSIDE_LOVE) continue;
      const g: Gender = a.gender === 'male' ? 'female' : 'male';
      const traits = drawTraits(rng);
      const b: Townie = { id: nextId(), name: freshName(g), gender: g, home: a.home, stageStart: startedAgo(undefined, now, lifespan, rng), traits: traits, ...looks(rng, { name: '' }), ...randomPreferences(rng, { traits: traits, age: undefined }) };
      b.job = { careerId: NEIGHBOUR_JOBS[Math.floor(rng() * NEIGHBOUR_JOBS.length) % NEIGHBOUR_JOBS.length], level: Math.floor(rng() * 3) };
      // Where they'll live: with them if they keep house, else together in an empty house, else
      // in with their family if there's room; nowhere, and the match comes to nothing.
      const members = townies.filter((x) => x.home === a.home);
      const party = [a, ...dependants(townies, a)];
      const keeps = members.every((x) => party.includes(x));
      const free = emptyHouse(townies);
      if (keeps && members.length < HOUSE_MAX) b.home = a.home;
      else if (free && party.length < HOUSE_MAX) {
        for (const x of party) x.home = free.id;
        b.home = free.id;
      } else if (members.length < HOUSE_MAX) b.home = a.home;
      else continue;
      townies.push(b);
      marry(a, b);
      say('married', a, '💍', `이웃 ${josa(a.name, '이/가')} 다른 동네에서 만난 ${josa(b.name, '와/과')} 결혼했어요. ${josa(b.name, '이/가')} 새 이웃이 됐어요`, b.id);
      break;
    }
  }
  // A grown-up child, single and settled, may leave home for an empty house.
  for (const a of onStreet(townies).filter((t) => single(t) && t.parents?.some((p) => byId(p)?.home === t.home) && adultDays(t) >= 10 && !here.has(t.id))) {
    const free = emptyHouse(townies);
    if (!free || rng() >= LEAVE_HOME) continue;
    a.home = free.id;
    a.role = ALONE;
    say('leftHome', a, '🏠', `이웃 ${josa(a.name, '이/가')} 독립해서 빈집으로 이사했어요`);
  }
  // Grandparents under the same roof as their grandchildren are called so; someone left on their own lives alone.
  for (const h of housesOf(townies)) {
    const members = townies.filter((t) => t.home === h.id);
    for (const t of members) {
      const grandkids = members.filter((k) => k.age && k.parents?.some((p) => byId(p)?.parents?.includes(t.id)));
      if (grandkids.length) t.role = roleFor('grandparent', t.gender ?? 'female');
    }
    if (members.length === 1 && grownUp(members[0]) && members[0].partnerId === undefined) members[0].role = ALONE;
  }
  return ev;
}

/**
 * Nobody grown past a baby goes without traits (2026-11-01, at the user's request): a baby of the
 * street on growing up, and anyone an older save made without. Likes they have stay; none, they're drawn too.
 */
export function giveEveryoneTraits(townies: Townie[], rng: () => number) {
  for (const t of townies) {
    if (t.age === 'baby' || t.traits?.length) continue;
    t.traits = drawTraits(rng, t.age);
    if (!t.likes?.length) Object.assign(t, randomPreferences(rng, { traits: t.traits, age: t.age, skill: t.job ? CAREER_BY_ID[t.job.careerId]?.skill : undefined }));
  }
}

/**
 * The street's houses with any built for someone moving out when none stood empty (`extra…`, 2026-11-01,
 * at the user's request: leaving home never waits on a house). Such a house is there while someone lives in it.
 */
export const housesOf = (townies: Townie[]): Array<{ id: string; icon: string }> => [
  ...NEIGHBOR_HOUSES,
  ...[...new Set(townies.map((t) => t.home).filter((h): h is string => !!h?.startsWith('extra')))].map((id) => ({ id, icon: '🏡' })),
];

/** An empty house, or a new one. */
function homeForOneMore(townies: Townie[]): string {
  const free = emptyHouse(townies);
  if (free) return free.id;
  let n = 1;
  while (townies.some((t) => t.home === `extra${n}`)) n++;
  return `extra${n}`;
}

/** A household member as the neighbour they become on moving out (`Game.moveOut`): the same person and id, in an empty house. */
export function neighbourFromDweller(s: Dweller, now: number, townies: Townie[]): Townie {
  const job = s.job && !CAREER_BY_ID[s.job.careerId]?.school ? { careerId: s.job.careerId, level: s.job.level } : undefined;
  return {
    id: s.id,
    name: s.name,
    gender: s.gender,
    shirt: s.shirt,
    skin: s.skin,
    hair: s.hair,
    hairStyle: s.hairStyle,
    hairFrom: s.hairFrom,
    wear: s.wear,
    closet: s.closet,
    outfit: s.outfit,
    bottom: s.bottom,
    pants: s.pants,
    shoeColor: s.shoeColor,
    face: s.face,
    eyes: s.eyes,
    tints: s.tints,
    shirtPrint: s.shirtPrint,
    traits: s.traits,
    likes: s.likes,
    dislikes: s.dislikes,
    ...(s.age === 'elder' ? { age: 'elder' as const } : {}),
    stageStart: s.bornAt ?? now,
    home: homeForOneMore(townies),
    role: ALONE,
    ...(job ? { job } : {}),
    skills: s.skills,
    ...(s.parents ? { parents: s.parents } : {}),
  };
}

/** Someone left the street (moved in with the player's household): a newcomer takes an empty house, if there is one. */
export function welcomeNewcomer(townies: Townie[], now: number, lifespan: Lifespan, rng: () => number, nextId: () => number): NeighbourEvent | null {
  const free = emptyHouse(townies);
  if (!free || onStreet(townies).length >= STREET_MAX) return null;
  const used = new Set(townies.map((t) => t.name));
  const g: Gender = rng() < 0.5 ? 'female' : 'male';
  const name = pickName(g, [...used], rng());
  const traits = drawTraits(rng);
  const t: Townie = { id: nextId(), name, gender: g, home: free.id, role: ALONE, stageStart: startedAgo(undefined, now, lifespan, rng), traits: traits, ...looks(rng, { name }), ...randomPreferences(rng, { traits: traits, age: undefined }) };
  t.job = { careerId: NEIGHBOUR_JOBS[Math.floor(rng() * NEIGHBOUR_JOBS.length) % NEIGHBOUR_JOBS.length], level: Math.floor(rng() * 3) };
  t.skills = withSkills(t);
  townies.push(t);
  return { kind: 'movedIn', townieId: t.id, icon: '📦', text: `📦 빈집에 새 이웃 ${josa(name, '이/가')} 이사 왔어요` };
}
