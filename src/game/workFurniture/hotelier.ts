import type { ObjectDef } from '../types';

/**
 * New furniture for the 호텔 (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * hotel's lobby, rooms and breakfast corner have besides the front desk, the concierge and the bed —
 * the bell desk where luggage is tagged and kept, the elevator hall guests are shown to, the lobby's
 * flower centrepiece under its chandelier, the lounge sofas guests wait on (a welcome tea brought to
 * them), the 조식 뷔페 with its chafing dishes and the housekeeping cart parked in the room being made
 * up. The hotel (호텔 라온) is made up. Drawn in view3d/workplaces/hotelier.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'htlBellDesk', name: '벨 데스크', price: 0, w: 1, h: 1, icon: '🛎️', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'htlTagLuggage', label: '짐 보관표 붙이기', icon: '🏷️', duration: 15, effects: { social: 0.1 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'htlElevatorBank', name: '엘리베이터 홀', price: 0, w: 2, h: 1, icon: '🛗', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'htlEscortGuest', label: '엘리베이터로 모셔다드리기', icon: '🛗', duration: 15, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'htlCenterpiece', name: '로비 플라워 센터피스', price: 0, w: 2, h: 2, icon: '💐', color: '#f8bbd0', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'htlLoungeSofa', name: '로비 라운지 소파', price: 0, w: 2, h: 1, icon: '🛋️', color: '#5d4a6b', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'htlBuffet', name: '조식 뷔페', price: 0, w: 2, h: 1, icon: '🍳', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'htlSetBuffet', label: '조식 뷔페 세팅하기', icon: '🍳', duration: 20, effects: { fun: -0.03 }, skill: { key: 'cooking', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'htlHousekeepingCart', name: '하우스키핑 카트', price: 0, w: 2, h: 1, icon: '🧺', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'htlStockCart', label: '하우스키핑 카트 채우기', icon: '🧺', duration: 15, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The hotel's front (2026-11-04, the layout audit): the canopy over the door and the kerb where cars drop guests, its posts along
  // the wall, the hotel's name on it. Stood on the tile at its right end; the rest is drawn out to the left over the path.
  { id: 'htlPorteCochere', name: '호텔 정문 캐노피', price: 0, w: 1, h: 1, icon: '🏨', color: '#3e2723', category: 'decor', unlisted: true, interactions: [] },
];
