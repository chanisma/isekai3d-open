import type { Needs, SkillKey } from './types';
import { LEARN } from './constants';

/**
 * Outings to the neighbourhood's community lots, after 참고 게임's venues (venue_park, venue_gym,
 * venue_library, venue_museum; Korean names from the game; 참고 게임's bar left out, at the user's request). 참고 게임 travels there and the
 * dweller uses the lot's objects; we send the dweller off for a few hours, like work, and fold what they'd
 * do there into needs, a skill and a moodlet on the way home. Effects and hours are ours.
 */
export interface VenueDef {
  id: string;
  name: string;
  icon: string;
  /** Need change per minute while there. */
  effects: Partial<Needs>;
  skill?: { key: SkillKey; rate: number };
  /** Moodlet brought home. */
  buff: string;
  /** Hours it is open: [from, to) with to past 24 wrapping into the next day. */
  hours: [number, number];
  cost?: number;
  adultsOnly?: boolean;
  /** Townies to chat with there: minutes between small friendship gains. */
  mingle?: number;
  /** A skill level needed to go (ours: a delivery gig needs a driver). */
  minSkill?: [SkillKey, number];
  /** Where a hurt or sick dweller is treated (Game.goOut): open to them whatever else is due, and paid as far as the money goes. */
  care?: boolean;
  /** Pay brought home: base plus so much a level of the skill (ours). */
  earn?: { skill: SkillKey; base: number; per: number };
}

export const OUTING_MINUTES = 180;

export const VENUES: VenueDef[] = [
  { id: 'park', name: '공원', icon: '🌳', effects: { fun: 0.5, social: 0.5, energy: -0.03 }, skill: { key: 'fitness', rate: LEARN.light }, buff: 'freshAir', hours: [6, 22], mingle: 40 },
  { id: 'gym', name: '헬스장', icon: '🏋️', effects: { fun: 0.15, energy: -0.08, hygiene: -0.12 }, skill: { key: 'fitness', rate: LEARN.practice }, buff: 'pumpedUp', hours: [6, 24], mingle: 90 },
  { id: 'library', name: '도서관', icon: '📚', effects: { fun: 0.35 }, skill: { key: 'logic', rate: LEARN.practice }, buff: 'stimulatingRead', hours: [8, 20] },
  { id: 'museum', name: '미술관', icon: '🖼️', effects: { fun: 0.6, social: 0.2 }, skill: { key: 'painting', rate: LEARN.light }, buff: 'artInspired', hours: [9, 21], mingle: 90 },
  // Ours: volunteering at the community welfare centre, and a driving range for grown-ups.
  { id: 'volunteer', name: '봉사 활동', icon: '🤝', effects: { fun: 0.25, social: 0.6, energy: -0.04 }, skill: { key: 'empathy', rate: LEARN.practice }, buff: 'volunteerGlow', hours: [9, 18], mingle: 50 },
  { id: 'deliveryGig', name: '배달 대행 아르바이트', icon: '🛵', effects: { fun: 0.1, energy: -0.08, social: 0.1 }, skill: { key: 'driving', rate: LEARN.chore }, buff: 'drivePractice', hours: [11, 23], adultsOnly: true, minSkill: ['driving', 3], earn: { skill: 'driving', base: 30, per: 12 } },
  { id: 'drivingRange', name: '운전 연습장', icon: '🚗', effects: { fun: 0.3, energy: -0.03 }, skill: { key: 'driving', rate: LEARN.practice }, buff: 'drivePractice', hours: [9, 21], cost: 20, adultsOnly: true },
  // Ours: a hair salon, where the player picks the new hair before they go (Dweller.away.restyle).
  // Ours: a clothes shop, where the player picks the clothes before they go; what the dweller hasn't got is paid for then.
  { id: 'clothesShop', name: '옷가게', icon: '🛍️', effects: { fun: 0.35, social: 0.2 }, buff: 'newClothes', hours: [10, 21], mingle: 90 },
  { id: 'salon', name: '미용실', icon: '💇', effects: { fun: 0.2, hygiene: 0.2 }, buff: 'freshHair', hours: [10, 20], cost: 60, mingle: 90 },
  // Ours (2026-11-01): where the hurt and the sick get better. A hospital is always open; a pharmacy costs less.
  { id: 'hospital', name: '병원', icon: '🏥', effects: { energy: 0.1 }, buff: 'treated', hours: [0, 24], cost: 150, care: true },
  { id: 'pharmacy', name: '약국', icon: '💊', effects: { energy: 0.05 }, buff: 'treated', hours: [8, 22], cost: 50, care: true },
];

export const VENUE_BY_ID: Record<string, VenueDef> = Object.fromEntries(VENUES.map((v) => [v.id, v]));

export function venueOpen(v: VenueDef, minuteOfDay: number): boolean {
  const h = minuteOfDay / 60;
  const [a, b] = v.hours;
  return (h >= a && h < Math.min(b, 24)) || (b > 24 && h < b - 24);
}
