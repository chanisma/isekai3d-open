/**
 * Fishing after 참고 게임 (fishingLocation_GoFishing_Spot, FishingLocation_Catch, fishingData_*):
 * the Fishing skill (낚시, Focused) grows at the StandardPeriodic rate while casting; every 10-40
 * minutes a bite (lock_out_time) lands a fish, junk or treasure at weights 7 : 2 : 1. Better
 * anglers reach rarer fish. 참고 게임 keeps fish prices and sizes in object definitions we can't read,
 * so the species list, tiers and prices below are ours (Korean common names).
 */
export interface FishDef {
  id: string;
  name: string;
  /** Fishing level needed to hook it (ours). */
  level: number;
  price: number;
}

export const FISH: FishDef[] = [
  { id: 'minnow', name: '피라미', level: 0, price: 4 },
  { id: 'perch', name: '농어', level: 0, price: 8 },
  { id: 'goldfish', name: '금붕어', level: 1, price: 10 },
  { id: 'tilapia', name: '틸라피아', level: 2, price: 12 },
  { id: 'bass', name: '배스', level: 3, price: 18 },
  { id: 'trout', name: '송어', level: 4, price: 22 },
  { id: 'catfish', name: '메기', level: 5, price: 28 },
  { id: 'koi', name: '비단잉어', level: 6, price: 40 },
  { id: 'salmon', name: '연어', level: 7, price: 55 },
  { id: 'sturgeon', name: '철갑상어', level: 9, price: 90 },
];

export const CATCH_WEIGHTS = { fish: 7, junk: 2, treasure: 1 };
export const JUNK = ['낡은 장화', '빈 깡통', '엉킨 낚싯줄'];

export type Catch = { kind: 'fish'; fish: FishDef } | { kind: 'junk'; name: string } | { kind: 'treasure'; value: number };

export function rollCatch(level: number, rng: () => number): Catch {
  const total = CATCH_WEIGHTS.fish + CATCH_WEIGHTS.junk + CATCH_WEIGHTS.treasure;
  const r = rng() * total;
  if (r < CATCH_WEIGHTS.junk) return { kind: 'junk', name: JUNK[Math.floor(rng() * JUNK.length)] };
  if (r < CATCH_WEIGHTS.junk + CATCH_WEIGHTS.treasure) return { kind: 'treasure', value: 20 + Math.floor(rng() * 40) };
  const pool = FISH.filter((f) => f.level <= level);
  // Rarer fish come less often: weight falls with each tier above the novice ones (ours).
  const weights = pool.map((f) => 1 / (1 + f.level * 0.4));
  let x = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i];
    if (x <= 0) return { kind: 'fish', fish: pool[i] };
  }
  return { kind: 'fish', fish: pool[pool.length - 1] };
}

/** Minutes until the next bite (참고 게임 lock_out_time 10-40). */
export function nextBite(rng: () => number): number {
  return 10 + rng() * 30;
}
