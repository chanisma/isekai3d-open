import type { InteractionDef, ObjectDef } from '../types';

const job = (id: string, label: string, icon: string,
  key: NonNullable<InteractionDef['skill']>['key'], duration = 30): InteractionDef => ({
  id, label, icon, duration, requires: 'atWork', pose: 'front',
  effects: { social: 0.15, fun: 0.05 }, skill: { key, rate: 1 / 100 },
});

export const OBJECTS: ObjectDef[] = [
  { id: 'thCounselPair', name: '개인 상담 안락의자 세트', w: 3, h: 2,
    price: 0, unlisted: true, category: 'skill', icon: '🧠', color: '#8da79c',
    interactions: [
      job('thListen', '감정 카드로 개인 상담하기', '💬', 'empathy'),
      job('thReframe', '생각 기록지 함께 살펴보기', '📝', 'empathy', 35),
    ] },
  { id: 'thGroupCircle', name: '집단 상담 원형 좌석', w: 3, h: 3,
    price: 0, unlisted: true, category: 'skill', icon: '💬', color: '#c8a787',
    interactions: [job('thGroup', '마음 나눔 집단 진행하기', '💬', 'leadership', 35)] },
  // The centre's reception desk (2026-11-05, the layout audit, was a self-check kiosk with nobody at it): staffed, the first visit's
  // questionnaire on its tablet, the appointment slip printed for the next session.
  { id: 'thIntakeKiosk', name: '상담 접수대', w: 2, h: 1,
    price: 0, unlisted: true, category: 'skill', icon: '📋', color: '#99b5b1',
    interactions: [job('thIntake', '자가 점검과 상담 접수 안내하기', '📋', 'empathy', 25)] },
  // The centre's small nameplate sign by the door (2026-11-05, the layout audit): an upstairs-type centre keeps its sign small.
  { id: 'thStreetSign', name: '상담센터 명판', price: 0, unlisted: true, category: 'decor', icon: '🪧', color: '#47675f', w: 1, h: 1, interactions: [] },
];
