import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 부동산 사무소 (2026-11-01 workplace pipeline, at the user's request): what a neighbourhood
 * office has besides desks. A consultation table where the contract is explained and sealed, a district map with its
 * pins, a key cabinet, a floor-plan model of a flat, a terminal for the land register, a window of listing cards on
 * the street, a tea corner for clients; a wall of contract files and a board on the pavement for dressing. Drawn in
 * view3d/workplaces/realEstate.ts (with realEstateMotion.ts). All names, addresses and prices are made up.
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
    id: 'reConsultTable', name: '계약 상담 테이블', price: 0, w: 3, h: 2, icon: '🤝', color: '#a1785a', category: 'skill', unlisted: true,
    interactions: [
      job('reExplainContract', '계약서 조항 설명하기', '📝', 25, { social: 0.2 }, 'charisma', 90),
      job('reSealContract', '계약서에 도장 찍기', '🤝', 20, { social: 0.25, fun: 0.1 }, 'charisma', 100),
    ],
  },
  { id: 'reDistrictMap', name: '동네 지도', price: 0, w: 3, h: 1, icon: '🗺️', color: '#cfe3c8', category: 'skill', unlisted: true, interactions: [job('reMapPins', '지도에 매물 핀 꽂기', '📌', 15, { fun: 0.05 }, 'logic', 150)] },
  { id: 'reKeyCabinet', name: '매물 열쇠함', price: 0, w: 1, h: 1, icon: '🔑', color: '#78909c', category: 'skill', unlisted: true, interactions: [job('reTakeKey', '매물 열쇠 챙기고 대장 쓰기', '🔑', 10, { fun: -0.02 }, 'logic', 200)] },
  { id: 'reFloorModel', name: '아파트 평면 모형', price: 0, w: 2, h: 1, icon: '🏠', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('reShowModel', '평면 모형으로 집 설명하기', '🏠', 20, { social: 0.15 }, 'charisma', 110)] },
  { id: 'reRegistryTerminal', name: '등기부 조회 단말', price: 0, w: 1, h: 1, icon: '💻', color: '#90a4ae', category: 'skill', unlisted: true, interactions: [job('reCheckRegistry', '등기부등본 떼어 확인하기', '📄', 20, { fun: -0.05 }, 'logic', 110)] },
  { id: 'reTeaCorner', name: '손님 차 코너', price: 0, w: 3, h: 1, icon: '🍵', color: '#bcaaa4', category: 'skill', unlisted: true, interactions: [job('reServeTea', '손님께 차 내어 드리기', '🍵', 12, { social: 0.2 }, 'charisma', 180)] },
  { id: 'reListingWindow', name: '매물 안내 창', price: 0, w: 3, h: 1, icon: '🪟', color: '#fff8e1', category: 'skill', unlisted: true, interactions: [job('reChangeWindow', '창에 붙인 매물 카드 바꾸기', '🪧', 15, { fun: -0.02 }, 'logic', 170)] },
  { id: 'reRecordWall', name: '계약서 보관장', price: 0, w: 3, h: 1, icon: '🗄️', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
  { id: 'reYardSign', name: '매물 입간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#ffb300', category: 'decor', unlisted: true, interactions: [] },
  // The row of shops the agency is a unit of (2026-11-04, the layout audit), and the papers it must post where customers see them.
  { id: 'reNeighborShop', name: '이웃 세탁소', price: 0, w: 5, h: 8, icon: '🏪', color: '#d7dde2', category: 'decor', unlisted: true, interactions: [] },
  { id: 'reNeighborFlorist', name: '이웃 꽃집', price: 0, w: 5, h: 8, icon: '🏪', color: '#e6d8c3', category: 'decor', unlisted: true, interactions: [] },
  { id: 'reLegalBoard', name: '게시 의무 액자', price: 0, w: 1, h: 1, icon: '📜', color: '#6d4c41', category: 'decor', unlisted: true, interactions: [] },
];
