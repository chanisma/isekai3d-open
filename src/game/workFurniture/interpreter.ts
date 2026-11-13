import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 통번역 사무소 (2026-11-01): what it was missing to feel real. A colleague's desk, a board of terms, the meeting table the booths
 * look over (where consecutive interpreting happens with a pad), a notary counter with a real seal, a practice corner with a
 * recorder and the firm's sign. Drawn in view3d/workplaces/interpreter.ts (with interpreterMotion.ts). The firm is made up,
 * and foreign words appear only as an invented script.
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
  { id: 'ipMateDesk', name: '동료 번역 책상', price: 0, w: 1, h: 1, icon: '📄', color: '#c9a87e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ipTermBoard', name: '용어 게시판', price: 0, w: 2, h: 1, icon: '📋', color: '#c9a26f', category: 'skill', unlisted: true, interactions: [job('ipPinTerm', '새 용어 카드 써서 붙이기', '📋', 20, { fun: -0.03 }, 'language', 110)] },
  { id: 'ipMeetingTable', name: '순차 통역 회의 탁자', price: 0, w: 3, h: 2, icon: '🤝', color: '#7a5a3f', category: 'skill', unlisted: true, interactions: [job('ipConsecutive', '메모하며 순차 통역하기', '📝', 32, { social: 0.2, fun: -0.05 }, 'language', 80)] },
  { id: 'ipNotaryCounter', name: '번역 공증 카운터', price: 0, w: 2, h: 1, icon: '📄', color: '#efe6d4', category: 'skill', unlisted: true, interactions: [job('ipNotarise', '번역 공증 서류 대조하고 도장 찍기', '📄', 24, { fun: -0.04 }, 'logic', 120)] },
  { id: 'ipPracticeCorner', name: '통역 연습 코너', price: 0, w: 2, h: 1, icon: '🎧', color: '#6f7a80', category: 'skill', unlisted: true, interactions: [job('ipRecord', '내 통역 녹음해서 다시 듣기', '🎧', 28, { fun: -0.03 }, 'language', 90)] },
  { id: 'ipOfficeSign', name: '사무소 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#17706a', category: 'decor', unlisted: true, interactions: [] },
];
