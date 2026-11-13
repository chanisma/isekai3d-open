import type { ObjectDef } from '../types';

/**
 * New furniture for the 빌딩 보안실 (2026-10-27 workplace pipeline, at the user's request): what a
 * building's security and fire-control room (보안실 · 방재실) has besides the CCTV consoles, the key
 * cabinet, the patrol log desks and the intruder alarm panels — the lobby's visitor desk where a 방문증
 * is issued, the speed gate it opens, the fire alarm control panel (방재 수신기, the 자동화재탐지설비's
 * P형 수신기), the radios' charging rack, the lost-and-found shelf and a patrol checkpoint's reader on
 * the wall. The building (한빛타워) and every name are made up. Drawn in view3d/workplaces/securityGuard.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // The guard stands behind it (its front), the visitors come up to its back across the counter.
    id: 'sgVisitorDesk', name: '방문객 안내 데스크', price: 0, w: 2, h: 1, icon: '🪪', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sgIssueBadge', label: '방문증 발급하기', icon: '🪪', duration: 15, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sgSpeedGate', name: '스피드게이트', price: 0, w: 2, h: 1, icon: '🚧', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sgGateCheck', label: '출입 게이트 점검하기', icon: '🚧', duration: 10, effects: { fun: -0.03 }, skill: { key: 'handiness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sgFirePanel', name: '방재 수신기', price: 0, w: 2, h: 1, icon: '🧯', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sgFireCheck', label: '화재 수신기 점검하기', icon: '🧯', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sgRadioDock', name: '무전기 충전 랙', price: 0, w: 1, h: 1, icon: '📻', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sgRadioCheck', label: '무전 교신 점검하기', icon: '📻', duration: 10, effects: { social: 0.05 }, skill: { key: 'charisma', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sgLostFound', name: '분실물 보관함', price: 0, w: 1, h: 1, icon: '🧳', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sgLogLostItem', label: '분실물 접수하기', icon: '🧳', duration: 15, effects: { fun: -0.03 }, skill: { key: 'writing', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sgCheckpoint', name: '순찰 체크포인트', price: 0, w: 1, h: 1, icon: '📍', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sgTagCheckpoint', label: '순찰 지점 확인하기', icon: '📍', duration: 10, effects: { energy: -0.05 }, skill: { key: 'fitness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // 2026-11-05, the layout audit: the car park's entrance (the booth, the boom across the ramp) and the tower's pole sign on the pavement.
  { id: 'sgParkingGate', name: '주차장 차단기·경비 부스', price: 0, w: 2, h: 1, icon: '🚧', color: '#f9a825', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sgTowerSign', name: '빌딩 간판', price: 0, w: 1, h: 1, icon: '🏢', color: '#1f2d3d', category: 'decor', unlisted: true, interactions: [] },
];
