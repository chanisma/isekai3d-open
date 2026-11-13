import type { InteractionDef, ObjectDef } from '../types';

const job = (id: string, label: string, icon: string, key: NonNullable<InteractionDef['skill']>['key'], duration = 25): InteractionDef => ({
  id, label, icon, duration, requires: 'atWork', pose: 'front', skill: { key, rate: 1 / 110 }, effects: { fun: 0.1 },
});

/** 물여울 is the fictional watershed on the props. The workplace remains 생태 연구 센터. */
export const OBJECTS: ObjectDef[] = [
  { id: 'ecoFieldRack', name: '현장 조사 장비걸이', w: 2, h: 1, price: 0, icon: '🧭', color: '#607d58', category: 'skill', unlisted: true,
    interactions: [job('ecoCheckGear', '장화·뜰채·쌍안경 점검하기', '🧭', 'handiness')] },
  { id: 'ecoCameraDesk', name: '무인카메라 판독대', w: 2, h: 1, price: 0, icon: '📷', color: '#41685c', category: 'skill', unlisted: true,
    interactions: [job('ecoReviewCamera', '무인카메라 관찰 기록 판독하기', '📷', 'science', 30)] },
  { id: 'ecoHerbarium', name: '압화 표본장', w: 2, h: 1, price: 0, icon: '🌿', color: '#b1946d', category: 'skill', unlisted: true,
    interactions: [job('ecoMountPlant', '식물 표본 고정하고 채집지 기록하기', '🌿', 'gardening', 30)] },
  { id: 'ecoStreamDisplay', name: '우리 하천 생태 교육판', w: 2, h: 1, price: 0, icon: '🐟', color: '#479c91', category: 'skill', unlisted: true,
    interactions: [job('ecoPrepareTour', '하천 생물 견학 자료 준비하기', '🐟', 'science', 20)] },
  // The 해양 생물학자 branch's coastal research institute (2026-11-04, the layout audit). Its research boat at the quay (out to sample,
  // and out at once when a red tide or a heatwave in the water is warned of); the CTD winch on the quay edge that lowers the sensor and
  // the water bottles; the seawater plant that pumps the sea in through sand filters, UV and the chiller to the tanks; the round rearing
  // tanks in the tank hall; the wet lab's measuring and dissecting board; the nets and pots on the quay; the lobby's sea-life display.
  { id: 'mrResearchBoat', name: '연안 연구선', w: 12, h: 3, price: 0, icon: '🚢', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mrSampleCruise', label: '연구선 타고 정점 채집 나가기', icon: '🚢', duration: 60, effects: { energy: -0.2, fun: 0.1 }, skill: { key: 'fishing', rate: 1 / 70 }, requires: 'atWork', offLot: true, pose: 'front' },
      { id: 'mrUrgentSampling', label: '적조 해역 긴급 채수 나가기', icon: '🌊', duration: 60, effects: { energy: -0.25 }, skill: { key: 'fishing', rate: 1 / 60 }, requires: 'workAlarm', offLot: true, pose: 'front' },
      job('mrBoatCheck', '출항 전 연구선 장비 점검하기', '🔧', 'handiness', 20),
    ] },
  { id: 'mrCtdDavit', name: 'CTD 윈치 크레인', w: 2, h: 1, price: 0, icon: '🏗️', color: '#f9a825', category: 'skill', unlisted: true,
    interactions: [job('mrCastCtd', 'CTD·채수기 내려 수층 재기', '🌡️', 'science', 25)] },
  { id: 'mrSeawaterPlant', name: '해수 여과·살균 설비', w: 2, h: 1, price: 0, icon: '💧', color: '#4f8fa3', category: 'skill', unlisted: true,
    interactions: [job('mrCheckSeawater', '취수 펌프·여과기·UV 점검하기', '💧', 'handiness', 20)] },
  { id: 'mrRoundTank', name: '원형 사육 수조', w: 2, h: 2, price: 0, icon: '🐠', color: '#5aa7b8', category: 'skill', unlisted: true,
    interactions: [job('mrFeedTank', '사육 개체 먹이 주고 상태 보기', '🐠', 'fishing', 20)] },
  { id: 'mrMeasureBoard', name: '어체 측정·해부대', w: 2, h: 1, price: 0, icon: '📏', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('mrMeasureFish', '어체 길이·무게 재고 해부하기', '📏', 'fishing', 30)] },
  { id: 'mrNetPile', name: '채집망·통발 더미', w: 2, h: 1, price: 0, icon: '🕸️', color: '#6d8b74', category: 'decor', unlisted: true, interactions: [] },
  { id: 'mrExhibit', name: '바다 생태 전시판', w: 2, h: 1, price: 0, icon: '🐟', color: '#1e6f8f', category: 'skill', unlisted: true,
    interactions: [job('mrPrepareExhibit', '바다 생물 전시·견학 자료 준비하기', '🐟', 'science', 20)] },
  // The centre's grounds (2026-11-05, the layout audit, replacing a lawn): the wetland's observation deck at the pond's edge,
  // clumps of reeds and cattails round the water, the sampling point with its staff gauge and logger, and the nursery's tunnel.
  { id: 'ecoDeck', name: '습지 관찰 데크', w: 4, h: 1, price: 0, icon: '🌿', color: '#a07a52', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'ecoReeds', name: '갈대·부들', w: 1, h: 1, price: 0, icon: '🌾', color: '#8d9a5b', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ecoSamplePoint', name: '수질 측정 지점', w: 1, h: 1, price: 0, icon: '💧', color: '#41685c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ecoPolyTunnel', name: '자생식물 증식 하우스', w: 10, h: 3, price: 0, icon: '🌱', color: '#dfeee4', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
