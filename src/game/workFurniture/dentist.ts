import type { ObjectDef } from '../types';

/**
 * New furniture for the dental clinic (2026-10-27 workplace pipeline, at the user's request): what
 * the 치과 was missing to feel like one — the front desk where patients check in and book their next
 * visit, a panoramic X-ray machine in the first treatment room, a chairside intraoral scanner by the
 * surgery's chair (the digital impression beside the lab bench's plaster one), a giant tooth with its
 * toothbrush in the waiting room for showing how to brush, and the smile board on the waiting-room
 * wall. The ids start `dt` (the dentist's) so no other workplace's can clash with them. Drawn in
 * src/view3d/workplaces/dentist.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'dtFrontDesk', name: '치과 접수대', price: 0, w: 2, h: 1, icon: '🗓️', color: '#4dd0e1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dtCheckIn', label: '환자 접수·예약 잡기', icon: '🗓️', duration: 15, effects: { fun: -0.05, social: 0.05 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dtPanoXray', name: '파노라마 엑스레이', price: 0, w: 1, h: 1, icon: '🩻', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dtTakePanorama', label: '파노라마 촬영하기', icon: '🩻', duration: 15, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dtOralScanner', name: '구강 스캐너', price: 0, w: 1, h: 1, icon: '📡', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dtScanTeeth', label: '구강 스캔으로 본뜨기', icon: '📡', duration: 20, effects: { fun: 0.1 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dtToothModel', name: '대형 치아 모형', price: 0, w: 1, h: 1, icon: '🦷', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dtBrushingLesson', label: '올바른 양치법 알려주기', icon: '🪥', duration: 15, effects: { fun: 0.1, social: 0.15 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'dtSmileBoard', name: '치아 건강 안내판', price: 0, w: 2, h: 1, icon: '😁', color: '#4dd0e1', category: 'decor', unlisted: true, interactions: [] },
  // The clinic as it is (2026-11-05, the layout audit): the low partition between the chairs of the open 진료실, frosted glass over a
  // white panel, so each patient is out of the next one's sight but the staff see over it; and the clinic's pole sign on the pavement.
  { id: 'dtPartition', name: '진료 체어 칸막이', price: 0, w: 1, h: 2, icon: '🪟', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  // The 상담실's table (2026-11-06): a plain white table with the treatment plan and a tooth model on it, not a dining table laid for a meal.
  { id: 'dtConsultTable', name: '상담 테이블', price: 0, w: 2, h: 1, icon: '🦷', color: '#f5f5f5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dtStreetSign', name: '치과 간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#00838f', category: 'decor', unlisted: true, interactions: [] },
];
