/**
 * Handiness upgrades after 참고 게임 (docs/ref-game/05 §1.19): `*_Upgrade_*` interactions gated by a
 * Handiness level, each flipping an Upgrade_* object state whose effect is:
 * LowerBrokenness wear x0.5, LockBrokenness never breaks, LockDirtiness never gets grimy,
 * FastHygiene Hygiene x2, FasterHygiene x3, LockHygiene (bidet). Names are the Korean game's.
 * 참고 게임 also wants upgrade parts; we charge for them instead.
 */
export type UpgradeEffect = 'lowerWear' | 'lockWear' | 'lockDirt' | 'hygiene2' | 'hygiene3' | 'bidet' | 'gamingSkill';

export interface UpgradeDef {
  id: string;
  label: string;
  objects: string[];
  level: number;
  effect: UpgradeEffect;
}

const PLUMBING_SINKS = ['sink', 'kitchenSink'];
const SCREENS = ['tv', 'bigTv', 'stereo'];

export const UPGRADES: UpgradeDef[] = [
  { id: 'toiletSelfClean', label: '자동 세척 기능 추가', objects: ['toilet'], level: 7, effect: 'lockDirt' },
  { id: 'superiorFlush', label: '강력 물내림 기능 추가', objects: ['toilet'], level: 7, effect: 'lowerWear' },
  { id: 'bidet', label: '비데 기능 추가', objects: ['toilet'], level: 7, effect: 'bidet' },
  { id: 'showerSelfClean', label: '자동 세척 벽 코팅 기능 추가', objects: ['shower'], level: 7, effect: 'lockDirt' },
  { id: 'showerFlow', label: '수량 조절기 추가', objects: ['shower'], level: 7, effect: 'hygiene2' },
  { id: 'massageJets', label: '진동 마사지 제트 분사기 추가', objects: ['shower'], level: 7, effect: 'hygiene3' },
  { id: 'tubSelfClean', label: '자동 세척 추가', objects: ['bathtub'], level: 7, effect: 'lockDirt' },
  { id: 'tubFaucet', label: '튼튼한 수도꼭지 추가', objects: ['bathtub'], level: 7, effect: 'lowerWear' },
  { id: 'tubCoating', label: '클린 코팅 추가', objects: ['bathtub'], level: 7, effect: 'hygiene3' },
  { id: 'sinkSelfClean', label: '자동 세척 기능 추가', objects: PLUMBING_SINKS, level: 7, effect: 'lockDirt' },
  { id: 'sinkFaucet', label: '튼튼한 수도꼭지 추가', objects: PLUMBING_SINKS, level: 7, effect: 'lowerWear' },
  { id: 'soapDispenser', label: '자동 물비누통 추가', objects: ['sink'], level: 7, effect: 'hygiene2' },
  { id: 'fridgeDoor', label: '강화 문 추가', objects: ['fridge', 'deluxeFridge'], level: 10, effect: 'lowerWear' },
  { id: 'steelFridge', label: '강철 냉장고 추가', objects: ['fridge', 'deluxeFridge'], level: 10, effect: 'lockWear' },
  { id: 'betterParts', label: '부품 개선', objects: SCREENS, level: 8, effect: 'lowerWear' },
  { id: 'plumbobWiring', label: '파이락시움 배선 추가', objects: SCREENS, level: 9, effect: 'lockWear' },
  { id: 'eccRam', label: 'ECC RAM 추가', objects: ['computer', 'gamingComputer'], level: 8, effect: 'lowerWear' },
  // 참고 게임 upgrade_Computer_GamingSkill_Completed: Video Gaming skill gain x1.3.
  { id: 'videoCard', label: '비디오 카드 업그레이드', objects: ['computer', 'gamingComputer'], level: 9, effect: 'gamingSkill' },
  { id: 'telescopeBrace', label: '망원경 중심축 보강하기', objects: ['telescope'], level: 8, effect: 'lowerWear' },
  { id: 'telescopeAlloy', label: '망원경 중심축 특수 합금 강화하기', objects: ['telescope'], level: 9, effect: 'lockWear' },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** Minutes an upgrade takes (참고 게임 telescope upgrades: 120) and what the parts cost (ours). */
export const UPGRADE_TIME = 120;
export const UPGRADE_COST = 100;

export function hasUpgrade(upgrades: string[] | undefined, effect: UpgradeEffect): boolean {
  return (upgrades ?? []).some((id) => UPGRADE_BY_ID[id]?.effect === effect);
}

/** How much faster a fixture washes a dweller (FastHygiene x2, FasterHygiene x3). */
export function hygieneMultiplier(upgrades: string[] | undefined): number {
  return hasUpgrade(upgrades, 'hygiene3') ? 3 : hasUpgrade(upgrades, 'hygiene2') ? 2 : 1;
}
