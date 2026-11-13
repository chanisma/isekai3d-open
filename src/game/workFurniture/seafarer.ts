import type { ObjectDef } from '../types';

/**
 * New furniture for the 해운 항만 사무소 (2026-10-27 workplace pipeline, at the user's request): what a
 * shipping company's harbour office has besides the bridge simulators, the chart tables, the stowage
 * planners, the radar and the rescue gear — the port's VTS traffic screen with its VHF desk, the
 * weather fax and the forecast board, a container ship's model in its glass case for the lobby, a
 * pair of mooring bitts with a line on them to practise on, and the ship's bell rung at the change of
 * the watch. The company (한바다해운), its ships and the port (한바다항) are made up. Drawn in
 * view3d/workplaces/seafarer.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'sfVtsBoard', name: '항만 VTS 관제 화면', price: 0, w: 2, h: 1, icon: '🛰️', color: '#0b2740', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sfVtsWatch', label: '선박 통항 관제하기', icon: '🛰️', duration: 25, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sfWeatherFax', name: '기상 팩스 · 예보판', price: 0, w: 1, h: 1, icon: '🌀', color: '#d8d2c0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sfCheckWeather', label: '해상 기상 확인하기', icon: '🌀', duration: 15, effects: { fun: -0.03 }, skill: { key: 'logic', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // Set dressing for the lobby: the company's flagship in miniature.
    id: 'sfShipModel', name: '컨테이너선 모형', price: 0, w: 2, h: 1, icon: '🚢', color: '#1f3a5f', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'sfMooringBitt', name: '계류 비트 · 로프', price: 0, w: 1, h: 1, icon: '🪢', color: '#3e4a3f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sfTieKnot', label: '계류줄 묶기 연습하기', icon: '🪢', duration: 20, effects: { energy: -0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sfShipBell', name: '선종', price: 0, w: 1, h: 1, icon: '🔔', color: '#c9a227', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sfRingBell', label: '당직 교대 종 치기', icon: '🔔', duration: 8, effects: { fun: 0.05 }, skill: { key: 'charisma', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The ship's hull round the deck (held by its corner tile and drawn from there, as it runs round the bridge's walls), the cargo
  // hold's hatch covers, the mooring winch at the stern.
  { id: 'sfHull', name: '선체', price: 0, w: 1, h: 1, icon: '🚢', color: '#1f3a5f', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'sfHatch', name: '화물창 해치 덮개', price: 0, w: 8, h: 4, icon: '📦', color: '#c62828', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sfWinch', name: '계류 윈치', price: 0, w: 2, h: 1, icon: '⚙️', color: '#455a64', category: 'decor', unlisted: true, interactions: [] },
];
