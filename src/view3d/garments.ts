import type { Bottom, Outfit as Top } from '../game/types';
import type { Stage } from '../dweller3d/figure';
import type { ModelInfo } from './vrm';

/**
 * The garment sets made for the game (prototypes/README.md): each set's VRM, clothes only, in models/
 * as `<gender>-<stage>-npc_garment_<id>.vrm` (models/README.md: a role nobody plays, so no dweller is shown
 * as one, and the student program's character pack and server carry it). Their pieces are put on a
 * character by bone name (vrmDress `loadWearing`), on the full body (`@base`).
 *
 * Since 2026-10-25 (at the user's request) they are clothes like any other: bought at the clothes
 * shop, a piece or the whole set at once, and worn from the wardrobe (vrmLooks `garmentsFor`). A
 * design either gender can wear (a coat and trousers, a varsity jacket) is cut once and worn by both
 * (`fit` without a gender); dresses and skirts are women's. The robe is the bath's, and not for sale.
 */
export interface GarmentSet {
  id: string;
  label: string;
  /** Who it is cut for: a size per gender and stage (the robe), or one fit. */
  file: (gender: 'female' | 'male', stage: Stage) => string;
  /** Who can wear it: its gender and stage (no gender: either). */
  fit?: { gender?: 'female' | 'male'; stage?: Stage };
  /** What its pieces are, as the wardrobe names clothes; no bottom under a dress. Not set: not clothes to buy (the robe). */
  top?: Top;
  bottom?: Bottom;
  /** A line for the shop. */
  about?: string;
}

/** A set cut once, on a character of `at` (`gender-stage`). */
const one = (at: string, id: string) => () => `${at}-npc_garment_${id}.vrm`;
const women = { gender: 'female', stage: 'adult' } as const;
const adults = { stage: 'adult' } as const;

export const GARMENT_SETS: GarmentSet[] = [
  { id: 'robe', label: 'ROBE 샤워가운', file: (g, s) => `${g}-${s}-npc_garment_robe.vrm` },
  { id: 'gijeon', label: '샘플고 교복', file: one('female-teen', 'gijeon'), fit: { gender: 'female', stage: 'teen' }, top: 'uniform', bottom: 'skirt', about: '네이비 카디건 · 회색 플리츠 치마' },
  { id: 'tailor', label: 'TAILOR', file: one('male-adult', 'tailor'), fit: adults, top: 'jacket', bottom: 'pants', about: '차콜 롱코트 · 아이보리 바지 · 로퍼' },
  { id: 'meridian', label: 'MERIDIAN', file: one('male-adult', 'meridian'), fit: adults, top: 'jacket', bottom: 'pants', about: '퍼널넥 크롭 재킷 · 와이드 슬랙스' },
  { id: 'city', label: 'CITY CLUB', file: one('male-adult', 'cityclub'), fit: adults, top: 'jacket', bottom: 'pants', about: '바시티 재킷 · 크림 바지 · 로퍼' },
  { id: 'offduty', label: 'OFF DUTY', file: one('male-adult', 'offduty'), fit: adults, top: 'tee', bottom: 'shorts', about: '오버핏 상의 · 반바지 · 스니커즈' },
  { id: 'rue', label: 'RUE', file: one('female-adult', 'rue'), fit: women, top: 'jacket', bottom: 'skirt', about: '스웨이드 재킷 · 미니스커트' },
  { id: 'cozy', label: 'COZY', file: one('female-adult', 'cozy'), fit: women, top: 'sweater', bottom: 'skirt', about: '오버핏 니트 · 플리츠 미니' },
  { id: 'eclipse', label: 'ECLIPSE', file: one('female-adult', 'eclipse'), fit: women, top: 'shirt', bottom: 'skirt', about: '네이비 상의 · 실버 플레어 스커트' },
  { id: 'aurelia', label: 'AURELIA', file: one('female-adult', 'aurelia'), fit: women, top: 'jacket', bottom: 'skirt', about: '샴페인 크롭 재킷 · 버건디 롱스커트' },
  { id: 'maison', label: 'MAISON', file: one('female-adult', 'maison'), fit: women, top: 'jacket', bottom: 'skirt', about: '아이보리 재킷 · 차콜 미디스커트' },
  { id: 'elan', label: 'ÉLAN', file: one('female-adult', 'elan'), fit: women, top: 'jacket', bottom: 'skirt', about: '플럼 재킷 · 펜슬스커트 · 메리제인' },
  { id: 'nocturne', label: 'NOCTURNE', file: one('female-adult', 'nocturne'), fit: women, top: 'dress', about: '오프숄더 롱드레스' },
];

/** The set a file is (`npc_garment_<id>`), if any. */
export function setOfFile(file: string): GarmentSet | undefined {
  return GARMENT_SETS.find((g) => (['female', 'male'] as const).some((gender) => (['toddler', 'child', 'teen', 'adult', 'elder'] as const).some((st) => g.file(gender, st) === file)));
}

/** The set a character file is, for one of `gender` and `stage` to wear (none when it isn't theirs to wear). */
export function setFor(m: ModelInfo, gender: 'female' | 'male', stage: Stage): GarmentSet | undefined {
  const set = m.kept === 'garment' ? setOfFile(m.file) : undefined;
  return set && set.top && fitsSet(set, gender, stage) && set.file(gender, stage) === m.file ? set : undefined;
}

/** Whether one of this gender and stage can wear the set. */
export function fitsSet(set: GarmentSet, gender: 'female' | 'male', stage: Stage): boolean {
  return !set.fit || ((!set.fit.gender || set.fit.gender === gender) && (!set.fit.stage || set.fit.stage === stage));
}
