import type { ObjectDef } from '../types';

/**
 * New furniture for the accounting firm (2026-10-27 workplace pipeline, at the user's request): what
 * 회계법인 was missing to read as a Korean firm in 결산·세무 season — the 세무 신고 마감 board where
 * each client's magnet is moved along as their return goes in, the document scanner the clients'
 * receipts are fed through, the table the 전표 and 증빙 are sorted and bound at, the corner where a
 * client is taken through their year-end figures on the big screen, and the front counter under
 * the firm's name. The ids start `acc` (the accountant's) so no other workplace's can clash with
 * them. Drawn in src/view3d/workplaces/accountant.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'accDeadlineBoard', name: '세무 신고 마감 보드', price: 0, w: 2, h: 1, icon: '📅', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'accCheckDeadlines', label: '신고 마감 현황 정리하기', icon: '📅', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'accScanner', name: '증빙 스캐너', price: 0, w: 1, h: 1, icon: '🖨️', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'accScanReceipts', label: '영수증·증빙 스캔하기', icon: '🧾', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'accSortingTable', name: '전표 정리 테이블', price: 0, w: 2, h: 1, icon: '🗂️', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'accSortVouchers', label: '전표·증빙 분류해 철하기', icon: '🗂️', duration: 25, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'accClientTable', name: '고객 상담 테이블', price: 0, w: 2, h: 2, icon: '📊', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'accExplainResults', label: '고객사에 결산 결과 설명하기', icon: '📊', duration: 30, effects: { social: 0.2, energy: -0.05 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'accReception', name: '회계법인 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
];
