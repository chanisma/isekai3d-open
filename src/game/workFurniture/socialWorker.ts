import type { ObjectDef } from '../types';

/**
 * New furniture for the 종합사회복지관 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean community welfare centre has besides the case desks, the donation shelves, the 경로식당's
 * serving counter and the van — the 프로그램 안내 board in the lobby, the seniors' corner with its
 * 바둑판 and 장기판, the after-school 공부방 table, and the stand where the volunteers sign in. The
 * centre (새솔종합사회복지관) and everyone on its nameplates are made up. Drawn in
 * view3d/workplaces/socialWorker.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'swProgramNotice', name: '복지관 프로그램 안내판', price: 0, w: 2, h: 1, icon: '📌', color: '#c8a46e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swPostProgram', label: '프로그램 안내문 붙이기', icon: '📌', duration: 15, effects: { fun: 0.03 }, skill: { key: 'writing', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'swBadukCorner', name: '어르신 바둑·장기 쉼터', price: 0, w: 2, h: 1, icon: '♟️', color: '#c49a5a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swPlayBaduk', label: '어르신과 바둑 두기', icon: '♟️', duration: 30, effects: { social: 0.3, fun: 0.15 }, skill: { key: 'empathy', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'swStudyNook', name: '방과후 공부방 책상', price: 0, w: 2, h: 1, icon: '✏️', color: '#ffe082', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swTutorKids', label: '아이들 숙제 봐 주기', icon: '✏️', duration: 30, effects: { social: 0.25, energy: -0.05 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'swVolunteerSignIn', name: '자원봉사자 접수대', price: 0, w: 1, h: 1, icon: '🙋', color: '#66bb6a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swGreetVolunteers', label: '자원봉사자 맞이하기', icon: '🙋', duration: 15, effects: { social: 0.2 }, skill: { key: 'leadership', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // 2026-11-05, the layout audit: the centre's pole sign on the pavement.
  { id: 'swCentreSign', name: '복지관 간판', price: 0, w: 1, h: 1, icon: '🤝', color: '#2e7d32', category: 'decor', unlisted: true, interactions: [] },
];
