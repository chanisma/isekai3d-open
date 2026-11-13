import type { ObjectDef } from '../types';

/**
 * New furniture for the funeral hall (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 장례식장 has besides its 빈소 altar and wreaths — the 상주 자리 beside the altar where the chief
 * mourner stands to receive condolences, the 조객 접수대 at the door with its guest book (방명록) and
 * condolence box (부의함), the lit 빈소 안내 board in the lobby, the 접객실 tables laid for mourners,
 * and in the preparation room the table where the 수의 (the hemp shroud) is laid out and folded, and
 * the cabinet of 수의 boxes, 명정 and cloths. Drawn in view3d/workplaces/mortician.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // Set dressing: the chief mourner's place beside the altar (a mat, the armbands, the 상장 staff).
    id: 'morMournerPlace', name: '상주 자리', price: 0, w: 1, h: 1, icon: '🙏', color: '#212121', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'morGuestDesk', name: '조객 접수대', price: 0, w: 2, h: 1, icon: '📖', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'morGreetMourners', label: '조문객 맞이하기', icon: '📖', duration: 15, effects: { social: 0.1 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'morInfoKiosk', name: '빈소 안내 전광판', price: 0, w: 1, h: 1, icon: '🪧', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'morPostNotice', label: '빈소 안내 정보 올리기', icon: '🪧', duration: 10, effects: { fun: -0.03 }, skill: { key: 'writing', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'morMealTable', name: '접객실 상', price: 0, w: 2, h: 1, icon: '🍲', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'morSetMealTable', label: '조문객 상 차리기', icon: '🍲', duration: 20, effects: { fun: 0.03 }, skill: { key: 'cooking', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'morShroudTable', name: '수의 준비대', price: 0, w: 2, h: 1, icon: '🧵', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'morPrepareShroud', label: '수의 준비하기', icon: '🧵', duration: 30, effects: { fun: -0.03 }, skill: { key: 'handiness', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'morShroudCabinet', name: '장례용품장', price: 0, w: 1, h: 1, icon: '📦', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'morCheckSupplies', label: '장례용품 챙기기', icon: '📦', duration: 12, effects: { fun: -0.03 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The staff's side and the corridor as they are (2026-11-04, the layout audit): the 안치실's cold chambers, the hearse that brings the
  // dead in and takes them to the 발인, the viewing room's window onto the 입관, and another 빈소's door along the corridor.
  { id: 'morColdChamber', name: '안치 냉장고', price: 0, w: 3, h: 1, icon: '🧊', color: '#cfd8dc', category: 'decor', unlisted: true, interactions: [] },
  { id: 'morHearse', name: '운구차', price: 0, w: 2, h: 4, icon: '🚐', color: '#212121', category: 'decor', unlisted: true, interactions: [] },
  { id: 'morViewWindow', name: '입관 참관창', price: 0, w: 2, h: 1, icon: '🪟', color: '#b0bec5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'morSuiteDoor', name: '다른 빈소 출입문', price: 0, w: 1, h: 1, icon: '🚪', color: '#4e342e', category: 'decor', unlisted: true, interactions: [] },
];
