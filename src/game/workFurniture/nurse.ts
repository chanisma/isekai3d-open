import type { ObjectDef } from '../types';

/**
 * New furniture for the hospital's ward (2026-10-26 workplace pipeline, at the user's request): what
 * the nurses' side of the hospital was missing to feel like a ward — the nurses' station with its
 * call-bell panel, the medication cart wheeled round on the rounds, an IV pole with its pump, the
 * clean-linen cart, a hand-hygiene basin by the ward door and a wheelchair parked ready. The ids
 * start `ns` (the nurse's) so no other workplace's can clash with them. Drawn in
 * src/view3d/workplaces/nurse.ts; the shared hospital pieces are in workplaces/doctor.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // 간호사실: a long counter, high on the visitors' side, the charting desk and the call panel behind it.
    id: 'nsNurseStation', name: '간호사 스테이션', price: 0, w: 3, h: 1, icon: '🏥', color: '#4db6ac', category: 'skill', unlisted: true,
    interactions: [
      { id: 'nsNursingNotes', label: '간호 기록 작성하기', icon: '📝', duration: 25, effects: { fun: -0.05 }, skill: { key: 'medicine', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'nsAnswerCall', label: '환자 호출벨 응답하기', icon: '🔔', duration: 10, effects: { energy: -0.05 }, skill: { key: 'empathy', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The medication cart for the round: a drawer for each patient, the laptop of the drug chart on top.
    id: 'nsMedCabinetCart', name: '투약 카트', price: 0, w: 1, h: 1, icon: '💊', color: '#4fc3f7', category: 'skill', unlisted: true,
    interactions: [
      { id: 'nsMedRound', label: '투약 카트 준비하기', icon: '💊', duration: 15, effects: { fun: -0.05 }, skill: { key: 'medicine', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A drip stand with its infusion pump, beside a bed.
    id: 'nsIvPole', name: '수액 걸대', price: 0, w: 1, h: 1, icon: '💧', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'nsHangIv', label: '수액 교체하기', icon: '💧', duration: 10, effects: { fun: -0.05 }, skill: { key: 'medicine', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // Clean sheets, gowns and towels on a covered rolling rack, a soiled-linen bag at its end.
    id: 'nsLinenRack', name: '린넨 카트', price: 0, w: 1, h: 1, icon: '🧺', color: '#90caf9', category: 'skill', unlisted: true,
    interactions: [
      { id: 'nsSortLinen', label: '린넨 정리하기', icon: '🧺', duration: 15, effects: { hygiene: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A small hand-wash basin on the wall, the gel and the six steps of hand hygiene over it.
    id: 'nsHandSink', name: '손 위생 세면대', price: 0, w: 1, h: 1, icon: '🧼', color: '#e0f7fa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'nsWashHands', label: '손 위생 6단계 지키기', icon: '🧼', duration: 5, effects: { hygiene: 0.25 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'nsWheelchair', name: '휠체어', price: 0, w: 1, h: 1, icon: '🦽', color: '#1565c0', category: 'decor', unlisted: true, interactions: [] },
  // The lift hall's lifts (2026-11-04, the layout audit): a ward is reached by lift. Two steel doors in the wall, the floor shown over each, the call buttons between.
  { id: 'nsElevator', name: '병동 승강기', price: 0, w: 2, h: 1, icon: '🛗', color: '#b0bec5', category: 'decor', unlisted: true, interactions: [] },
];
