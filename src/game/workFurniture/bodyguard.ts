import type { ObjectDef } from '../types';

/**
 * New furniture for the 경호 업체 (2026-10-27 workplace pipeline, at the user's request): what a
 * close-protection firm has besides the sparring mats, the planning table, the radio rack and the
 * escort car — the 상황실's command desk under a wall of CCTV feeds with the radio base, the
 * briefing screen with the day's VIP schedule (the VIP and the firm are made up), the suit lockers
 * (the black suit, the ties, the sunglasses) and a walk-through metal-detector gate with a tray
 * table to practise screening at. Drawn in view3d/workplaces/bodyguard.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // The 상황실: a wall of CCTV feeds over a desk with a keyboard, a PTZ joystick, the radio base and a gooseneck mic.
    id: 'bgCommandDesk', name: '경호 상황실 데스크', price: 0, w: 2, h: 1, icon: '🖥️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bgWatchCctv', label: '현장 CCTV 모니터링하기', icon: '📹', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'bgRadioRelay', label: '경호팀 무전 교신하기', icon: '📻', duration: 20, effects: { social: 0.1 }, skill: { key: 'charisma', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A big screen with the day's VIP schedule, the route and the risk level; a clicker on the cabinet under it.
    id: 'bgBriefScreen', name: 'VIP 일정 브리핑 스크린', price: 0, w: 2, h: 1, icon: '📺', color: '#1c2833', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bgScheduleBrief', shared: true, chatty: true, label: 'VIP 일정 브리핑하기', icon: '🗓️', duration: 30, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 110 }, range: 2, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A tall steel locker: the black suit and white shirts on hangers, ties on a rack, sunglasses and an earpiece on the shelf, a mirror in the door.
    id: 'bgSuitLocker', name: '경호 수트 로커', price: 0, w: 1, h: 1, icon: '👔', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bgSuitUp', label: '경호 복장 갖추기', icon: '🕶️', duration: 15, effects: { fun: 0.05 }, skill: { key: 'charisma', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A walk-through metal detector (a training mannequin stood at its exit) and a tray table with a handheld wand.
    id: 'bgMetalGate', name: '금속 탐지 게이트', price: 0, w: 2, h: 1, icon: '🚪', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bgScreeningDrill', label: '검색대 훈련하기', icon: '🔍', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
      { id: 'bgTrayCheck', label: '소지품 바구니 검색하기', icon: '🧺', duration: 15, effects: { fun: -0.03 }, skill: { key: 'logic', rate: 1 / 170 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // 2026-11-05, the layout audit: the firm's name on the reception's back wall, and its pole sign on the pavement.
  { id: 'bgLogoWall', name: '회사 로고 벽', price: 0, w: 2, h: 1, icon: '🛡️', color: '#212121', category: 'decor', unlisted: true, interactions: [] },
  { id: 'bgFrontSign', name: '경호 업체 간판', price: 0, w: 1, h: 1, icon: '🛡️', color: '#212121', category: 'decor', unlisted: true, interactions: [] },
];
