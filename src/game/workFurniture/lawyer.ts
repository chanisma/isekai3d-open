import type { ObjectDef } from '../types';

/**
 * New furniture for the law firm and the courtroom (2026-10-27 workplace pipeline, at the user's
 * request): what 로펌과 법정 was missing to read as a Korean courtroom — the counsel tables of the
 * 원고 and the 피고 facing each other across the well with their nameplates, the witness stand in the
 * middle facing the bench, the 참여관's desk under the bench where papers are filed, the gallery's
 * benches behind the bar rail — and as a firm: the managing partner's desk, the case-file shelving
 * and a table for consulting clients. The ids start `lw` (the lawyer's) so no other workplace's can
 * clash with them. Drawn in src/view3d/workplaces/lawyer.ts.
 */
const counsel = (id: string, name: string, color: string): ObjectDef => ({
  id, name, price: 0, w: 2, h: 1, icon: '🗂️', color, category: 'skill', unlisted: true,
  interactions: [
    { id: 'lwSortExhibits', label: '증거 서류 정리하기', icon: '🗂️', duration: 25, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
  ],
});

export const OBJECTS: ObjectDef[] = [
  counsel('lwPlaintiffTable', '원고석', '#8d6e63'),
  counsel('lwDefenseTable', '피고석', '#8d6e63'),
  {
    id: 'lwWitnessStand', name: '증인석', price: 0, w: 1, h: 1, icon: '🙋', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'lwExamineWitness', label: '증인 신문하기', icon: '🙋', duration: 30, effects: { social: 0.2, energy: -0.05 }, skill: { key: 'charisma', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lwClerkDesk', name: '참여관석', price: 0, w: 2, h: 1, icon: '📄', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'lwFileBriefs', label: '법원에 서면 제출하기', icon: '📄', duration: 15, effects: { fun: -0.05 }, skill: { key: 'law', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'lwGalleryBench', name: '방청석', price: 0, w: 2, h: 1, icon: '🪑', color: '#795548', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'lwPartnerDesk', name: '대표 변호사 책상', price: 0, w: 2, h: 1, icon: '🖋️', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'lwReviewContract', label: '자문 계약서 검토하기', icon: '🖋️', duration: 30, effects: { fun: -0.05 }, skill: { key: 'law', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lwCaseFiles', name: '사건 기록 서고', price: 0, w: 2, h: 1, icon: '🗄️', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'lwPullRecords', label: '사건 기록 찾아오기', icon: '🗄️', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lwConsultTable', name: '상담 테이블', price: 0, w: 2, h: 2, icon: '🤝', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'lwSignRetainer', label: '수임 계약 맺기', icon: '🤝', duration: 25, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The firm and the court as two places (2026-11-05, the layout audit). The firm's reception: the desk inside the glass door with
  // the receptionist's chair, and the logo wall behind it with the firm's name and its lawyers' fields.
  { id: 'lwReception', name: '로펌 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
  { id: 'lwFirmSign', name: '로펌 로고 벽', price: 0, w: 2, h: 1, icon: '⚖️', color: '#37474f', category: 'decor', unlisted: true, interactions: [] },
  // The court's entrance: the walk-through arch everyone comes in under, and the board outside the courtroom with the day's cases.
  { id: 'lwSecurityGate', name: '법원 출입 검색대', price: 0, w: 1, h: 1, icon: '🚪', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true },
  { id: 'lwDocketBoard', name: '법정 개정 안내판', price: 0, w: 2, h: 1, icon: '📋', color: '#263238', category: 'decor', unlisted: true, interactions: [] },
];
