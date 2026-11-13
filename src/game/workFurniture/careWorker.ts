import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 요양원 (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * care home has besides its care beds, meal cart and walking rail — the medication cart (each
 * resident's drawer, the blood pressure monitor), the 생활실 activity table (화투 on the green
 * blanket, colouring), the 노래 교실 corner, the 추억의 사진관 memory wall, the care station under the
 * nurse call panel, and a spare wheelchair. The home (햇살요양원) and everyone in it are made up.
 * Drawn in view3d/workplaces/careWorker.ts (with careWorkerMotion.ts).
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
  {
    id: 'cwMedCart', name: '투약 카트', price: 0, w: 2, h: 1, icon: '💊', color: '#7986cb', category: 'skill', unlisted: true,
    interactions: [
      job('cwGiveMeds', '어르신 약 챙겨 드리기', '💊', 20, { social: 0.1 }, 'medicine', 120),
      job('cwCheckBp', '혈압 재 드리기', '🩺', 15, { social: 0.1 }, 'medicine', 140),
    ],
  },
  {
    id: 'cwActivityTable', name: '생활실 활동 테이블', price: 0, w: 2, h: 2, icon: '🃏', color: '#d9bf94', category: 'skill', unlisted: true,
    interactions: [
      job('cwPlayHwatu', '어르신들과 화투 치기', '🃏', 30, { social: 0.3, fun: 0.2 }, 'empathy', 120),
      job('cwColoring', '함께 색칠 공부하기', '🖍️', 25, { social: 0.2, fun: 0.15 }, 'painting', 150),
    ],
  },
  {
    id: 'cwSongCorner', name: '노래 교실 코너', price: 0, w: 2, h: 1, icon: '🎵', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [job('cwSingAlong', '어르신들과 노래 부르기', '🎵', 25, { fun: 0.3, social: 0.2 }, 'singing', 120)],
  },
  {
    id: 'cwMemoryWall', name: '추억의 사진관 벽', price: 0, w: 2, h: 1, icon: '🖼️', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [job('cwReminisce', '사진 보며 옛이야기 나누기', '🖼️', 20, { social: 0.3 }, 'empathy', 120)],
  },
  {
    id: 'cwCareStation', name: '간호 스테이션', price: 0, w: 2, h: 1, icon: '🔔', color: '#00897b', category: 'skill', unlisted: true,
    interactions: [
      job('cwWriteCareLog', '돌봄 기록 쓰기', '📝', 20, { fun: -0.05 }, 'writing', 140),
      job('cwAnswerCall', '호출벨 응답하기', '🔔', 10, { energy: -0.03 }, 'charisma', 150),
    ],
  },
  {
    id: 'cwBathRoom', name: '목욕실', price: 0, w: 3, h: 2, icon: '🚿', color: '#b2dfdb', category: 'skill', unlisted: true,
    interactions: [job('cwBathAssist', '목욕 도와드리기', '🚿', 30, { social: 0.2 }, 'charisma', 100)],
  },
  { id: 'cwWheelchair', name: '공용 휠체어', price: 0, w: 1, h: 1, icon: '🦽', color: '#8d9aa6', category: 'decor', unlisted: true, interactions: [] },
  // The 재가 방문 요양's pieces (2026-11-04, the branch lots). In the client's home, the bathroom fitted for them: grab rails by the
  // toilet, a shower chair on a non-slip mat; at the centre, the welfare aids shown to families (a cane, a walker, a cushion, a bath seat).
  {
    id: 'cwHomeBathAid', name: '안전 손잡이 욕실', price: 0, w: 2, h: 1, icon: '🛁', color: '#b2dfdb', category: 'skill', unlisted: true,
    interactions: [job('cwHomeBathe', '목욕 의자에 앉혀 씻겨 드리기', '🛁', 30, { social: 0.2 }, 'charisma', 100)],
  },
  { id: 'cwAidShelf', name: '복지용구 전시대', price: 0, w: 2, h: 1, icon: '🦯', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  // The 면회실's stand by the door to the care side (2026-11-04, the layout audit): the visitors' book, the hand gel, the notice.
  { id: 'cwVisitorDesk', name: '방문객 기록대 · 손 소독기', price: 0, w: 1, h: 1, icon: '🧴', color: '#d9bf94', category: 'decor', unlisted: true, interactions: [] },
];
