import type { InteractionDef, ObjectDef } from '../types';

const lesson = (id: string, label: string, icon: string, key: NonNullable<InteractionDef['skill']>['key']): InteractionDef => ({
  id, label, icon, duration: 25, requires: 'atWork', pose: 'front',
  effects: { fun: 0.2, social: 0.15 }, skill: { key, rate: 1 / 120 },
});

/** 유치원: daily curriculum, independent arrival, inquiry and safety practice.
 * The fictional class name belongs to its cubby labels, never to the workplace name. */
export const OBJECTS: ObjectDef[] = [
  { id: 'kgNuriBoard', name: '누리과정 · 오늘의 하루', w: 2, h: 1, price: 0, unlisted: true, category: 'skill', icon: '🗓️', color: '#69a996',
    interactions: [lesson('kgMorningCircle', '날씨·날짜와 하루 일과 나누기', '🗓️', 'charisma')] },
  { id: 'kgCubbies', name: '별나래반 이름표 신발장', w: 2, h: 1, price: 0, unlisted: true, category: 'decor', icon: '🧸', color: '#dfbb87', interactions: [] },
  { id: 'kgNatureDesk', name: '씨앗과 곤충 자연 관찰대', w: 2, h: 1, price: 0, unlisted: true, category: 'skill', icon: '🌱', color: '#81a86e',
    interactions: [lesson('kgObserveNature', '돋보기로 새싹 관찰하기', '🌱', 'logic')] },
  { id: 'kgSafetyCorner', name: '멈추고 살피는 안전 교실', w: 2, h: 2, price: 0, unlisted: true, category: 'skill', icon: '🚦', color: '#f2bf55',
    interactions: [lesson('kgPracticeSafety', '횡단보도 안전 약속 연습하기', '🚦', 'empathy')] },
  { id: 'kgHealthDesk', name: '등원 건강 살피기 책상', w: 2, h: 1, price: 0, unlisted: true, category: 'skill', icon: '🌡️', color: '#d7f0e8',
    interactions: [lesson('kgHealthLog', '건강 살피기 명단 정리하기', '📋', 'empathy')] },
  { id: 'kgRestMats', name: '휴식 매트 · 조명 · 음악', w: 3, h: 1, price: 0, unlisted: true, category: 'skill', icon: '😴', color: '#bfdcd2',
    interactions: [lesson('kgSetMats', '휴식 매트 펴고 정리하기', '😴', 'empathy')] },
];
