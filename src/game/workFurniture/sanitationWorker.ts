import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 청소 차고지 (2026-11-01 workplace pipeline, at the user's request): what a Korean municipal depot has before
 * dawn besides its trucks and sorting belts. The route board and the gear lockers at the back of the yard, wheelie bins and
 * street bags, the 대형 폐기물 slab, a sweeper's cart, a 제설함 of sand, yard lamps, and the crew's urn of barley tea. Names on
 * signs (달빛구, its routes) are made up. Drawn in view3d/workplaces/sanitationWorker.ts (with sanitationWorkerMotion.ts).
 */
const job = (id: string, label: string, icon: string, duration: number, effects: InteractionDef['effects'], key: NonNullable<InteractionDef['skill']>['key'], rate: number): InteractionDef => ({
  id,
  label,
  icon,
  duration,
  effects,
  skill: { key, rate: 1 / rate },
  requires: 'atWork',
  pose: 'front',
});

export const OBJECTS: ObjectDef[] = [
  {
    id: 'snRouteBoard', name: '노선 배차판', price: 0, w: 2, h: 1, icon: '🗺️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [job('snCheckRoute', '오늘 노선 배차 확인하기', '🗺️', 15, { fun: -0.03 }, 'logic', 150)],
  },
  {
    id: 'snLocker', name: '장비·조끼 보관함', price: 0, w: 3, h: 1, icon: '🦺', color: '#607d8b', category: 'skill', unlisted: true,
    interactions: [job('snGearUp', '조끼·장갑 챙기기', '🦺', 12, { energy: -0.03 }, 'fitness', 170)],
  },
  {
    id: 'snBinRow', name: '봉투 집하장', price: 0, w: 3, h: 1, icon: '🗑️', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [job('snStackBags', '종량제 봉투 모아 쌓기', '🗑️', 20, { energy: -0.15, hygiene: -0.1 }, 'fitness', 110)],
  },
  {
    id: 'snBulkYard', name: '대형 폐기물 보관장', price: 0, w: 3, h: 1, icon: '🛋️', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [job('snTagBulk', '대형 폐기물 스티커 확인하기', '🛋️', 15, { fun: -0.03 }, 'logic', 150)],
  },
  {
    id: 'snStreetCart', name: '가로 청소 수레', price: 0, w: 2, h: 1, icon: '🧹', color: '#ef6c00', category: 'skill', unlisted: true,
    interactions: [
      job('snSweepStreet', '빗자루로 거리 쓸기', '🧹', 25, { energy: -0.15, hygiene: -0.05 }, 'fitness', 100),
      job('snPickLitter', '집게로 꽁초 줍기', '🧹', 15, { energy: -0.08, hygiene: -0.05 }, 'fitness', 130),
    ],
  },
  {
    id: 'snSandBox', name: '제설함', price: 0, w: 2, h: 1, icon: '🦺', color: '#fbc02d', category: 'skill', unlisted: true,
    interactions: [job('snShovelSand', '제설 모래 퍼 담기', '🦺', 20, { energy: -0.2 }, 'fitness', 100)],
  },
  {
    id: 'snTeaUrn', name: '보리차 통', price: 0, w: 1, h: 1, icon: '🍵', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [{ id: 'snDrinkTea', label: '따뜻한 보리차 한잔', icon: '🍵', duration: 15, effects: { energy: 0.1, fun: 0.05 }, requires: 'atWork', pose: 'front' }],
  },
  { id: 'snLamp', name: '차고지 등', price: 0, w: 1, h: 1, icon: '💡', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  // The yard's fence and gates, the bays' lines and the sorting roof (2026-11-04, the layout audit), all drawn from the lot's corner tile.
  { id: 'snYardFence', name: '차고지 울타리·출입문', price: 0, w: 1, h: 1, icon: '🚧', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // The 재활용 선별장's pieces (2026-11-04, the branch lots). The tipping hopper the collection lorries back up to; the belt that lifts the
  // load to the hand-sorting platform upstairs; the chutes under the platform, a bay a material; the baler and its stacked bales; the
  // weighbridge house at the gate, where each lorry is weighed in and out; the bin for lithium batteries pulled off the belt, with its
  // extinguisher and sand, for when one smoulders.
  {
    id: 'rcHopper', name: '투입 호퍼', price: 0, w: 3, h: 2, icon: '♻️', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [job('rcCheckLoad', '반입 쓰레기 성상 확인하기', '🔎', 20, { hygiene: -0.1 }, 'science', 120)],
  },
  { id: 'rcConveyor', name: '선별 컨베이어', price: 0, w: 4, h: 1, icon: '♻️', color: '#455a64', category: 'decor', unlisted: true, interactions: [] },
  { id: 'rcDropBays', name: '재질별 낙하 칸', price: 0, w: 4, h: 1, icon: '♻️', color: '#78909c', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'rcBaler', name: '베일 압축기', price: 0, w: 2, h: 2, icon: '🧱', color: '#f9a825', category: 'skill', unlisted: true,
    interactions: [job('rcBale', '압축 베일 묶어 내기', '🧱', 25, { energy: -0.15 }, 'handiness', 110)],
  },
  { id: 'rcBales', name: '압축 베일 더미', price: 0, w: 2, h: 1, icon: '🧱', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'rcScaleHouse', name: '계근소', price: 0, w: 2, h: 1, icon: '⚖️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [job('rcWeighTruck', '수거 차량 계근하기', '⚖️', 15, { fun: -0.03 }, 'logic', 150)],
  },
  {
    id: 'rcBatteryBin', name: '폐배터리 분리함', price: 0, w: 1, h: 1, icon: '⚡', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [{ id: 'rcBatteryFire', label: '연기 나는 배터리 꺼내 불 끄기', icon: '🧯', duration: 30, effects: { energy: -0.2 }, skill: { key: 'fitness', rate: 1 / 80 }, requires: 'workAlarm', pose: 'front' }],
  },
];
