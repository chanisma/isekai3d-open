import { LIFESPANS, type Lifespan } from './babies';
import { clamp } from './util';

/**
 * Books after 참고 게임's writing skill and RoyaltyTracker (docs/ref-game/05 §1.9): a published book
 * pays royalties every morning at 10, give or take 20% (payment_deviation_percent). The daily
 * amount is by star rating (1 star 26, 2 stars 35, 3 stars 52, bestseller 65) times a
 * writing-level factor (2-5: 1, 6-8: 2.93, 9+: 5.2). Ours pays 30%, so a book doesn't out-earn a
 * career.
 *
 * How long a book pays is ours (2026-10-20, at the user's request — books piled up and royalties
 * grew without end): by its rating, measured against the life stages (babies.ts LIFESPANS). A
 * 1-star book sells for 3 days, 2 stars for a toddler's stage (7), 3 stars for a child's (14); a
 * bestseller keeps selling for good, its royalty halving over an adult's whole stage (70 days).
 * 참고 게임 pays every book for 20 days.
 * And readers are only so many: past ROYALTY_READERS books paying at once, each pays less, so
 * the day's total grows with the square root of the books, not with the books.
 */
export const ROYALTY_HOUR = 10;
export const ROYALTY_DEVIATION = 0.2;
/** Books that can pay in full on the same day (ours). */
export const ROYALTY_READERS = 4;
/**
 * Raw quality (before 참고 게임's ±50 cap) a bestseller takes (ours): only a writing-10 writer gets
 * there, about one book in four. Below the cap, 31+ is 3 stars as in 참고 게임.
 */
export const BESTSELLER_AT = 78;
const SCALE = 0.3;

export type Stars = 1 | 2 | 3 | 'best';

/**
 * Whether a writing session's draft comes to a book at all (ours, 2026-10-25, at the user's request —
 * every session made one): a beginner abandons most drafts, a writing-10 writer nearly none. An
 * inspired writer gets a little further. The practice counts either way.
 */
export function bookFinishChance(skill: number, inspired = false): number {
  return clamp(0.2 + 0.072 * Math.floor(skill) + (inspired ? 0.1 : 0), 0.2, 0.97);
}

/** Quality from writing level plus how the draft went, read off as a star rating. */
export function bookStars(skill: number, roll: number): Stars {
  const raw = -44 + 11 * Math.floor(skill) + (-10 + roll * 30);
  if (raw >= BESTSELLER_AT) return 'best';
  const quality = clamp(raw, -50, 50);
  if (quality >= 31) return 3;
  if (quality > -31) return 2;
  return 1;
}

export function royaltyPerDay(skill: number, stars: Stars): number {
  const base = { 1: 26, 2: 35, 3: 52, best: 65 }[stars];
  const level = Math.floor(skill);
  const factor = level >= 9 ? 5.2 : level >= 6 ? 2.93 : 1;
  return Math.round(base * factor * SCALE);
}

/** Days of the life cycle a book's royalty is measured by: an adult's stage, the normal one where ageing is off. */
function lifeScale(lifespan: Lifespan): number {
  const adult = LIFESPANS[lifespan].adult;
  return Number.isFinite(adult) ? adult / LIFESPANS.normal.adult : 1;
}

/** Mornings a book pays, by rating; null for a bestseller, which pays for good (getting less). */
export function royaltyDays(stars: Stars, lifespan: Lifespan = 'normal'): number | null {
  if (stars === 'best') return null;
  const n = LIFESPANS.normal;
  const days = { 1: 3, 2: n.toddler, 3: n.child }[stars];
  return Math.max(1, Math.round(days * lifeScale(lifespan)));
}

/** Days over which a bestseller's royalty halves. */
export function bestsellerHalfLife(lifespan: Lifespan = 'normal'): number {
  return LIFESPANS.normal.adult * lifeScale(lifespan);
}

export interface RoyaltyBook {
  perDay: number;
  /** Mornings still to pay; none for a bestseller (it pays for good). */
  left?: number;
  fromDay?: number;
  stars?: Stars;
}

/** What the book pays on `day` before the day's luck and the readers' share. */
export function royaltyOn(book: RoyaltyBook, day: number, lifespan: Lifespan = 'normal'): number {
  if (book.left !== undefined) return book.perDay;
  return book.perDay * 0.5 ** (Math.max(0, day - (book.fromDay ?? day)) / bestsellerHalfLife(lifespan));
}

/** Each book's share when `paying` books pay on the same day. */
export function readerShare(paying: number): number {
  return paying <= ROYALTY_READERS ? 1 : Math.sqrt(ROYALTY_READERS / paying);
}

/** How long a book still pays, for the panel: '3일 남음', or a bestseller's '계속 (지금 하루 §40)'. */
export function royaltyLeftText(book: RoyaltyBook, day: number, lifespan: Lifespan = 'normal'): string {
  if (book.left !== undefined) return `${book.left}일 남음`;
  return `계속 · 지금 하루 약 §${Math.round(royaltyOn(book, day, lifespan))}`;
}

export const STARS_LABEL = (stars: Stars) => (stars === 'best' ? '베스트셀러' : '★'.repeat(stars));

const TITLES = ['비 오는 날의 고양이', '마지막 기차', '푸른 정원의 비밀', '심오한 토스트', '별을 세는 밤', '잃어버린 레시피', '거울 속의 나', '이웃집 라마'];

export function bookTitle(n: number): string {
  return TITLES[n % TITLES.length] + (n >= TITLES.length ? ` ${Math.floor(n / TITLES.length) + 1}` : '');
}
