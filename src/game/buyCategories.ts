import { CATALOG } from './catalog';
import { HOME_BUY } from './homeFurniture';
import type { Needs, ObjectDef, SkillKey } from './types';

/**
 * The buy catalog's two ways of browsing, after 참고 게임's buy mode: by room ("방별") and by what a thing
 * is for ("기능별 아이템"). The function groups follow 참고 게임's BuyCategory flags (build_buy.py:
 * APPLIANCES, ELECTRONICS, ENTERTAINMENT, PLUMBING, DECOR, KIDS, STORAGE, COMFORT, SURFACE) plus
 * the client's lighting, activities-and-skills and misc tabs; Korean names from Strings_KOR_KR
 * where it has them (가전 제품, 전자 제품, 배관, 장식, 수납, 조명). Which object goes where is ours.
 */
export type BuyFn = 'comfort' | 'surface' | 'appliance' | 'plumbing' | 'electronics' | 'fun' | 'lighting' | 'decor' | 'storage' | 'kids' | 'activity' | 'misc';
export type BuyRoom = 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'study' | 'kids' | 'outdoor';

export const BUY_FNS: Record<BuyFn, { label: string; icon: string }> = {
  comfort: { label: '앉기·눕기', icon: '🛋️' },
  surface: { label: '표면', icon: '🪑' },
  appliance: { label: '가전 제품', icon: '🔌' },
  plumbing: { label: '배관', icon: '🚿' },
  electronics: { label: '전자 제품', icon: '📺' },
  fun: { label: '오락', icon: '🎲' },
  lighting: { label: '조명', icon: '💡' },
  decor: { label: '장식', icon: '🖼️' },
  storage: { label: '수납', icon: '📚' },
  kids: { label: '아이 용품', icon: '🧸' },
  activity: { label: '활동·역량', icon: '🎓' },
  misc: { label: '기타', icon: '🔔' },
};

export const BUY_ROOMS: Record<BuyRoom, { label: string; icon: string }> = {
  bedroom: { label: '침실', icon: '🛏️' },
  bathroom: { label: '욕실', icon: '🛁' },
  kitchen: { label: '주방·식당', icon: '🍳' },
  living: { label: '거실', icon: '🛋️' },
  study: { label: '공부방', icon: '📖' },
  kids: { label: '아이방', icon: '🧸' },
  outdoor: { label: '야외', icon: '🌳' },
};

const E = (fn: BuyFn, ...rooms: BuyRoom[]) => ({ fn, rooms });

export const OBJECT_BUY: Record<string, { fn: BuyFn; rooms: BuyRoom[] }> = {
  bed: E('comfort', 'bedroom'),
  doubleBed: E('comfort', 'bedroom'),
  deluxeBed: E('comfort', 'bedroom'),
  deluxeDoubleBed: E('comfort', 'bedroom'),
  sofa: E('comfort', 'living'),
  armchair: E('comfort', 'living', 'study'),
  diningChair: E('comfort', 'kitchen'),
  diningTable: E('surface', 'kitchen'),
  studyDesk: E('surface', 'study', 'kids', 'bedroom'),
  fridge: E('appliance', 'kitchen'),
  deluxeFridge: E('appliance', 'kitchen'),
  stove: E('appliance', 'kitchen'),
  deluxeStove: E('appliance', 'kitchen'),
  coffeeMaker: E('appliance', 'kitchen'),
  grill: E('appliance', 'outdoor'),
  toilet: E('plumbing', 'bathroom'),
  shower: E('plumbing', 'bathroom'),
  bathtub: E('plumbing', 'bathroom'),
  sink: E('plumbing', 'bathroom'),
  kitchenSink: E('plumbing', 'kitchen'),
  tv: E('electronics', 'living', 'bedroom'),
  bigTv: E('electronics', 'living'),
  stereo: E('electronics', 'living', 'bedroom'),
  computer: E('electronics', 'study', 'bedroom'),
  gamingComputer: E('electronics', 'study', 'bedroom'),
  camera: E('electronics', 'study'),
  karaoke: E('fun', 'living'),
  djBooth: E('fun', 'living'),
  businessBoardGame: E('fun', 'living', 'study'),
  pool: E('fun', 'outdoor'),
  lamp: E('lighting', 'living', 'bedroom', 'study'),
  paintingLandscape: E('decor', 'living', 'bedroom', 'study'),
  paintingAbstract: E('decor', 'living', 'bedroom', 'study'),
  posterPop: E('decor', 'bedroom', 'kids'),
  paintingMaster: E('decor', 'living'),
  aquarium: E('decor', 'living', 'study'),
  plant: E('decor', 'living', 'bedroom', 'kitchen', 'study', 'outdoor'),
  tree: E('decor', 'outdoor'),
  stairs: E('misc', 'living'),
  bush: E('decor', 'outdoor'),
  mirror: E('decor', 'bedroom', 'bathroom'),
  clothesCabinet: E('storage', 'bedroom', 'kids'),
  urn: E('decor', 'living'),
  bookshelf: E('storage', 'study', 'living', 'kids'),
  bassinet: E('kids', 'kids', 'bedroom'),
  toddlerBed: E('kids', 'kids', 'bedroom'),
  toyBox: E('kids', 'kids'),
  monkeyBars: E('kids', 'outdoor'),
  highChair: E('kids', 'kitchen', 'kids'),
  pottyChair: E('kids', 'bathroom', 'kids'),
  telescope: E('activity', 'outdoor', 'study'),
  chessTable: E('activity', 'living', 'study'),
  bar: E('activity', 'kitchen', 'living'),
  treadmill: E('activity', 'living', 'outdoor'),
  easel: E('activity', 'study', 'living'),
  piano: E('activity', 'living'),
  violin: E('activity', 'living', 'study'),
  guitar: E('activity', 'living', 'bedroom'),
  rocketShip: E('activity', 'outdoor'),
  pond: E('activity', 'outdoor'),
  planter: E('activity', 'outdoor'),
  woodworkingTable: E('activity', 'study', 'outdoor'),
  homeToolBench: E('activity', 'study', 'outdoor'),
  microscope: E('activity', 'study'),
  anatomyModel: E('activity', 'study'),
  chemistrySet: E('activity', 'study'),
  drivingSim: E('activity', 'study'),
  planningBoard: E('activity', 'study'),
  smokeAlarm: E('misc', 'kitchen'),
  burglarAlarm: E('misc', 'living'),
  mailbox: E('misc', 'outdoor'),
  fireplace: E('misc', 'living'),
  ...HOME_BUY,
};

export const BUYABLE: ObjectDef[] = CATALOG.filter((d) => !d.unlisted);

/** What an object does for a dweller, for the item card (참고 게임's buy-mode product tooltip). */
export function objectSummary(d: ObjectDef): { needs: Array<keyof Needs>; skills: SkillKey[]; uses: string[] } {
  const needs = new Set<keyof Needs>();
  const skills = new Set<SkillKey>();
  for (const i of d.interactions) {
    for (const [k, v] of Object.entries(i.effects ?? {})) if ((v as number) > 0) needs.add(k as keyof Needs);
    // Keeping it up (repairing, upgrading) is on most things and isn't what the piece is for.
    if (i.skill && i.id !== 'repair' && !i.id.startsWith('upgrade_')) skills.add(i.skill.key);
  }
  return { needs: [...needs], skills: [...skills], uses: [...new Set(d.interactions.map((i) => i.label))] };
}
