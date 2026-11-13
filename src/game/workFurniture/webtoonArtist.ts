import type { ObjectDef } from '../types';

/**
 * New furniture for the webtoon studio (웹툰 스튜디오; 2026-10-27 workplace pipeline, at the user's
 * request): what a Korean studio running a weekly serial was missing — the serial's schedule board
 * with the episodes going through 콘티 · 선화 · 채색 · 후보정 · 업로드 and the deadline counting down,
 * the board of 캐릭터 설정화 (the leads turned round, their expressions, their colours), the monitor
 * where the episode's ranking, likes and readers' comments come in live, the printer the 원고 is run
 * off on to be proofed in red, the signing table in the lobby with the 단행본 stacked up, and the
 * heroine's life-size standee. The ids start `wtn`.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'wtnDeadlineBoard', name: '연재 일정 보드', price: 0, w: 2, h: 1, icon: '📅', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wtnCheckSchedule', label: '연재 일정 점검하기', icon: '📅', duration: 15, effects: { energy: -0.03 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wtnCharacterBoard', name: '캐릭터 설정화 보드', price: 0, w: 2, h: 1, icon: '🎨', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wtnCharacterSheet', label: '캐릭터 표정 설정화 그리기', icon: '🙂', duration: 25, effects: { fun: 0.15 }, skill: { key: 'painting', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wtnCommentMonitor', name: '독자 반응 모니터', price: 0, w: 1, h: 1, icon: '📈', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wtnCheckRanking', label: '실시간 순위·댓글 확인하기', icon: '📈', duration: 10, effects: { fun: 0.1 }, skill: { key: 'empathy', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wtnProofPrinter', name: '원고 출력 프린터', price: 0, w: 1, h: 1, icon: '🖨️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wtnPrintProof', label: '원고 출력해 교정 보기', icon: '🖨️', duration: 15, effects: { fun: 0.02 }, skill: { key: 'writing', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wtnSigningTable', name: '사인회 테이블', price: 0, w: 2, h: 1, icon: '✒️', color: '#283593', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wtnSignCopies', label: '단행본 사인본 만들기', icon: '✒️', duration: 20, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 220 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'wtnStandee', name: '캐릭터 등신대', price: 0, w: 1, h: 1, icon: '🧍', color: '#f48fb1', category: 'decor', unlisted: true, interactions: [] },
  // The studio's framed posters and the cot for deadline nights (2026-11-05, the layout audit).
  { id: 'wtnPosterFrames', name: '작품 포스터 액자', price: 0, w: 2, h: 1, icon: '🖼️', color: '#212121', category: 'decor', unlisted: true, interactions: [] },
  { id: 'wtnCot', name: '간이침대', price: 0, w: 2, h: 1, icon: '🛏️', color: '#455a64', category: 'decor', unlisted: true, interactions: [] },
];
