import type { ObjectDef } from '../types';

/**
 * New furniture for the general hospital (2026-10-26 workplace pipeline, at the user's request):
 * what the wards, the exam rooms and the theatre were missing — an ultrasound cart beside an exam
 * bed, a patient monitor with its drips at each ward bed, the surgeons' scrub sink, the anaesthesia
 * machine at the head of the operating table and the waiting list on the lobby wall. The ids start
 * `dr` (the doctor's) so no other workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'drUltrasound', name: '초음파 진단기', price: 0, w: 1, h: 1, icon: '🖥️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drReadUltrasound', label: '초음파 영상 판독하기', icon: '🖥️', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'drBedsideMonitor', name: '환자 감시 모니터', price: 0, w: 1, h: 1, icon: '📈', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drCheckMonitor', label: '환자 모니터 확인하기', icon: '📈', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'drScrubSink', name: '수술실 손 세척대', price: 0, w: 2, h: 1, icon: '🧼', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drScrubIn', label: '수술 전 손 소독하기', icon: '🧼', duration: 10, effects: { hygiene: 0.3 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'drAnesthesiaCart', name: '마취기', price: 0, w: 1, h: 1, icon: '💉', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  { id: 'drTreatCart', name: '처치 카트', price: 0, w: 1, h: 1, icon: '🩹', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  { id: 'drQueueBoard', name: '진료 대기 현황판', price: 0, w: 2, h: 1, icon: '📺', color: '#00897b', category: 'decor', unlisted: true, interactions: [] },
  // A hospital's waiting seat on its steel beam (2026-11-04, the layout audit, in place of a dining chair): the corridor's, and the patient's at a blood-draw desk.
  { id: 'drWaitSeat', name: '병원 대기 의자', price: 0, w: 1, h: 1, icon: '💺', color: '#4f8fc0', category: 'decor', unlisted: true, interactions: [] },
  // The outpatients' front desk (2026-11-04, the layout audit): a long counter, the patients' ledge in front, the clerks' screens behind.
  { id: 'drReception', name: '외래 접수·수납', price: 0, w: 3, h: 1, icon: '🧾', color: '#00897b', category: 'decor', unlisted: true, interactions: [] },
  // The endoscopy room (2026-11-04, the layout audit): the patient lies on their left side on the narrow table, the scope's tower at its head, the
  // scopes washed and disinfected in their own machine after each one.
  // Long side to the front, where the endoscopist stands at the patient's head (its left end), the tower beside it.
  {
    id: 'drScopeTable', name: '내시경 검사대', price: 0, w: 2, h: 1, icon: '🛏️', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drEndoscopy', label: '위내시경 검사하기', icon: '🔭', duration: 30, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'drEndoTower', name: '내시경 장비', price: 0, w: 1, h: 1, icon: '🔭', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drEndoReport', label: '내시경 사진 보며 소견 쓰기', icon: '📝', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'drScopeWasher', name: '내시경 세척기', price: 0, w: 1, h: 1, icon: '🧼', color: '#cfd8dc', category: 'decor', unlisted: true, interactions: [] },
];
