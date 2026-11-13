/**
 * Gender, after 참고 게임's Create a Dweller: every dweller is a woman or a man (dweller_info_types Gender), chosen
 * when they're made and kept for life, which gives the family its words (엄마·아빠, 딸·아들,
 * 언니·오빠·누나·형) and who can have a baby: 참고 게임's pregnancy settings at their defaults
 * (trait_GenderOptions_Pregnancy_CanBeImpregnated / _CanImpregnate), a woman carries, a man
 * fathers, and an elder does neither (ours, at the user's request: the settings aren't offered).
 * Looks stay free of it (any hair, any outfit); romance is between a woman and a man (Game.romanceBlocked, at the user's request).
 */
export type Gender = 'female' | 'male';

export const GENDER_LABEL: Record<Gender, string> = { female: '여성', male: '남성' };

interface Gendered {
  gender?: Gender;
  /** Life stage (types.ts Age; left out = a grown-up). */
  age?: string;
}

/** Whether a dweller can carry a baby: a woman, not yet old. */
export const canCarry = (s: Gendered) => s.gender === 'female' && s.age !== 'elder';
/** Whether a dweller can father a baby: a man, not yet old. */
export const canSire = (s: Gendered) => s.gender === 'male' && s.age !== 'elder';

/** Who of the two would carry their baby: the one asked if they can, else the one asking; or nobody. */
export function babyCarrier<T extends Gendered>(asker: T, asked: T): T | null {
  if (canCarry(asked) && canSire(asker)) return asked;
  if (canCarry(asker) && canSire(asked)) return asker;
  return null;
}

/** Names that read as a girl's or a boy's (ours), for babies, newcomers and the dice. */
export const GIRL_NAMES = ['서연', '하은', '서윤', '지아', '하린', '수아', '지유', '채원', '다은', '예린', '소율', '유나', '하윤', '아린', '은서', '민서'];
export const BOY_NAMES = ['민준', '도윤', '시우', '예준', '주원', '건우', '우진', '선우', '연우', '현우', '태오', '서준', '도현', '은우', '이안', '하준'];

export function namesFor(g: Gender | undefined): string[] {
  return g === 'female' ? GIRL_NAMES : g === 'male' ? BOY_NAMES : [...GIRL_NAMES, ...BOY_NAMES];
}

export function pickName(g: Gender | undefined, taken: readonly string[], roll: number): string {
  const free = namesFor(g).filter((n) => !taken.includes(n));
  const pool = free.length ? free : namesFor(g);
  return pool[Math.floor(roll * pool.length) % pool.length];
}

/** For a save from before genders: the name's usual reading, else the outfit (ours). */
export function guessGender(name: string, outfit?: string): Gender {
  if (GIRL_NAMES.includes(name)) return 'female';
  if (BOY_NAMES.includes(name)) return 'male';
  return outfit === 'dress' ? 'female' : 'male';
}

/**
 * What `self` calls a family member `other` (for the relationship list): a parent 엄마/아빠, a
 * child 딸/아들, a sibling by who is older and who is speaking (언니·오빠 for a girl, 누나·형 for
 * a boy, 여동생·남동생 for the younger).
 */
export function kinWord(tie: '부모' | '자녀' | '형제자매', self: Gendered & { bornAt?: number }, other: Gendered & { bornAt?: number }): string {
  const g = other.gender;
  if (!g) return tie;
  if (tie === '부모') return g === 'female' ? '엄마' : '아빠';
  if (tie === '자녀') return g === 'female' ? '딸' : '아들';
  const otherOlder = (other.bornAt ?? 0) < (self.bornAt ?? 0);
  if (!otherOlder) return g === 'female' ? '여동생' : '남동생';
  if (self.gender === 'female') return g === 'female' ? '언니' : '오빠';
  return g === 'female' ? '누나' : '형';
}

/** A neighbour's household role by gender: the grown-ups' and the children's words (neighbourhood.ts). */
export function roleFor(kind: 'parent' | 'child' | 'grandparent' | 'grandchild', g: Gender): string {
  if (kind === 'parent') return g === 'female' ? '엄마' : '아빠';
  if (kind === 'child') return g === 'female' ? '딸' : '아들';
  if (kind === 'grandparent') return g === 'female' ? '할머니' : '할아버지';
  return g === 'female' ? '손녀' : '손자';
}
