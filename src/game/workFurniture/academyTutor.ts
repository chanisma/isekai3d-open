import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 입시학원 (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * cram school has besides its 교탁, its 질문 책상 and its 인강 camera — the lecture room's long
 * whiteboards and its two-seat desks (the front row sat at by the pupils who come in, the back rows
 * full of drawn classmates taking notes), the 자습실's partitioned carrels, the 인강 studio's
 * 전자칠판, the 수능 D-day and 성적 게시판, the 상담 table where parents hear the 배치표, the copier
 * that prints the 모의고사, and the 교재 shelf in the lobby. The 학원 (한빛입시학원) and everyone in it
 * are made up. Drawn in view3d/workplaces/academyTutor.ts (with academyTutorMotion.ts).
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
  { id: 'atLectureBoard', name: '강의실 화이트보드', price: 0, w: 2, h: 1, icon: '📋', color: '#fafafa', category: 'decor', unlisted: true, interactions: [] },
  { id: 'atLectureDesk', name: '2인용 강의 책상', price: 0, w: 2, h: 1, icon: '📓', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  { id: 'atClassRow', name: '수강생 뒷줄 책상', price: 0, w: 2, h: 2, icon: '✏️', color: '#cfd8dc', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'atStudyCarrel', name: '자습실 칸막이 책상', price: 0, w: 1, h: 1, icon: '📖', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [job('atSuperviseStudy', '자습실 감독하기', '🤫', 15, { fun: -0.05 }, 'charisma', 140)],
  },
  { id: 'atStudioBoard', name: '인강 스튜디오 전자칠판', price: 0, w: 3, h: 1, icon: '🖥️', color: '#263238', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'atDdayBoard', name: '수능 D-day 성적 게시판', price: 0, w: 2, h: 1, icon: '📅', color: '#1a237e', category: 'skill', unlisted: true,
    interactions: [job('atPostScores', '모의고사 성적 게시하기', '📌', 15, { fun: 0.05 }, 'logic', 150)],
  },
  {
    id: 'atConsultTable', name: '입시 상담 테이블', price: 0, w: 2, h: 2, icon: '🗂️', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [job('atAdmissionConsult', '입시 배치표 상담하기', '🗂️', 30, { social: 0.3 }, 'charisma', 100)],
  },
  {
    id: 'atExamPrinter', name: '모의고사 인쇄기', price: 0, w: 1, h: 1, icon: '🖨️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [job('atPrintExams', '모의고사 인쇄하기', '🖨️', 20, { fun: -0.05 }, 'logic', 150)],
  },
  { id: 'atWorkbookShelf', name: '교재·문제집 진열장', price: 0, w: 2, h: 1, icon: '📚', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
  // The A-frame sign on the pavement by the door (2026-11-05, the layout audit: the 학원 is two floors of a 상가 on the street).
  { id: 'atStreetSign', name: '학원 입간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#1f3a68', category: 'decor', unlisted: true, interactions: [] },
];
