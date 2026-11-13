import type { ObjectDef } from '../types';

/**
 * New furniture for the tech company (2026-10-27 workplace pipeline, at the user's request): what the
 * 기술 회사 was missing to feel like a Korean IT company's floor (판교) — a sit-stand desk worked at on
 * one's feet, the server room's corner of racks with its pull-out console, the team's scrum board of
 * sticky notes with the sprint's burndown, a phone-booth pod for calls, the hackathon table of
 * stickered laptops and pizza, and the lounge's beanbags. Kept apart from the office (salaryperson's
 * suits and paper) and the game studio (gameDeveloper's purple rigs and figures). The ids start
 * `tech` so no other workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'techStandingDesk', name: '스탠딩 데스크', price: 0, w: 1, h: 1, icon: '🧍', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'techStandCode', label: '스탠딩 데스크에서 코딩하기', icon: '⌨️', duration: 35, effects: { fun: -0.03, energy: -0.02 }, skill: { key: 'programming', rate: 1 / 95 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'techServerRack', name: '서버실 랙', price: 0, w: 2, h: 1, icon: '🗄️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'techCheckServer', label: '서버 상태 점검하기', icon: '📈', duration: 20, effects: { fun: -0.05 }, skill: { key: 'programming', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'techSwapDisk', label: '고장 난 디스크 교체하기', icon: '💾', duration: 15, effects: { fun: -0.03 }, skill: { key: 'handiness', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'techScrumBoard', name: '스크럼 보드', price: 0, w: 2, h: 1, icon: '🗂️', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'techDailyScrum', shared: true, chatty: true, label: '데일리 스크럼 하기', icon: '🧍', duration: 15, effects: { social: 0.4 }, skill: { key: 'charisma', rate: 1 / 220 }, range: 2, requires: 'atWork', pose: 'front' },
      { id: 'techMoveTicket', label: '칸반 티켓 옮기기', icon: '📌', duration: 10, effects: { fun: 0.03 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'techPhoneBooth', name: '폰부스', price: 0, w: 1, h: 1, icon: '📞', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'techVideoCall', label: '폰부스에서 화상 회의하기', icon: '🎧', duration: 25, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'techHackathonTable', name: '해커톤 테이블', price: 0, w: 2, h: 1, icon: '🍕', color: '#ffb300', category: 'skill', unlisted: true,
    interactions: [
      { id: 'techHackathon', label: '해커톤 프로토타입 만들기', icon: '🚀', duration: 40, effects: { fun: 0.1, energy: -0.03 }, skill: { key: 'programming', rate: 1 / 85 }, requires: 'atWork', pose: 'front' },
      { id: 'techPizzaSlice', chatty: true, label: '피자 한 조각 먹기', icon: '🍕', duration: 15, effects: { hunger: 2, fun: 0.1 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'techBeanbagLounge', name: '빈백 라운지', price: 0, w: 2, h: 1, icon: '🛋️', color: '#26a69a', category: 'decor', unlisted: true,
    interactions: [
      { id: 'techBeanbagRest', chatty: true, label: '빈백에 파묻혀 쉬기', icon: '😌', duration: 20, effects: { energy: 0.08, fun: 0.15 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The floor's front (2026-11-05, the layout audit: in from the street was the open office itself): past the lift hall and the
  // glass door, the reception desk under the company's logo wall; the building's sign out on the pavement.
  { id: 'techReception', name: '네오바이트 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#1f2a44', category: 'decor', unlisted: true, interactions: [] },
  { id: 'techLogoWall', name: '회사 로고 벽', price: 0, w: 2, h: 1, icon: '💻', color: '#00a99d', category: 'decor', unlisted: true, interactions: [] },
  { id: 'techTowerSign', name: '판교 오피스 빌딩 간판', price: 0, w: 1, h: 1, icon: '🏢', color: '#1f2a44', category: 'decor', unlisted: true, interactions: [] },
];
