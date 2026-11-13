import type { ObjectDef } from '../types';

/**
 * New furniture for the 해양경찰 파출소 (2026-10-27 workplace pipeline, at the user's request): what a
 * coast guard station has besides its radar, rescue gear, dive tank and patrol boat — the dive gear
 * rack (BCDs on their tanks, regulators, masks and fins), a wetsuit drying rack with its rinse tub,
 * the VHF radio desk keeping watch on channel 16, the 관할 해역 상황판 (the coast, the patrol
 * sectors, the fishing boats; all made up), a rescue drone on its launch pad, and the quay's life ring
 * throwing drill (a float out in the water to throw to). Drawn in view3d/workplaces/coastGuard.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // A steel rack: three BCDs hung on their tanks, regulators coiled on hooks, masks and fins on the shelf, a tank on its own with a gauge.
    id: 'cgDiveRack', name: '잠수 장비 거치대', price: 0, w: 2, h: 1, icon: '🤿', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cgGearUp', label: '잠수 장비 착용하기', icon: '🤿', duration: 20, effects: { energy: -0.05 }, skill: { key: 'fitness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
      { id: 'cgRegCheck', label: '호흡기 점검하기', icon: '🫧', duration: 20, effects: { fun: -0.03 }, skill: { key: 'handiness', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A drying rail of wetsuits on hangers with a blue rinse tub, a hose on its reel and fins and boots drying under it.
    id: 'cgWetsuitRack', name: '잠수복 건조대', price: 0, w: 2, h: 1, icon: '🧥', color: '#1e88e5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cgRinseSuit', label: '잠수복 헹궈 널기', icon: '🚿', duration: 20, effects: { hygiene: -0.05 }, skill: { key: 'handiness', rate: 1 / 170 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The radio desk: two VHF sets with their handsets, a speaker, the channel 16 watch screen, the radio log; a chair.
    id: 'cgVhfDesk', name: 'VHF 무선 통신대', price: 0, w: 2, h: 1, icon: '📻', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cgVhfWatch', label: '조난 채널 16 청취하기', icon: '🎧', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'cgVhfCall', label: '어선과 무선 교신하기', icon: '📻', duration: 20, effects: { social: 0.1 }, skill: { key: 'charisma', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A wall chart of the station's waters: the coast, the islands, the patrol sectors, the fishing boats as magnets, the weather.
    id: 'cgSeaMap', name: '관할 해역 상황판', price: 0, w: 2, h: 1, icon: '🗺️', color: '#0d47a1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cgSectorBrief', shared: true, chatty: true, label: '순찰 해역 브리핑하기', icon: '🗺️', duration: 30, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 110 }, range: 2, requires: 'atWork', pose: 'front' },
      { id: 'cgMarkVessel', label: '어선 위치 표시하기', icon: '📍', duration: 20, effects: { fun: -0.03 }, skill: { key: 'logic', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A rescue drone on its launch case-pad with the controller, spare batteries charging and a rescue tube to drop.
    id: 'cgDroneStation', name: '구조 드론 스테이션', price: 0, w: 2, h: 1, icon: '🛸', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cgDroneDrill', label: '구조 드론 비행 훈련하기', icon: '🛸', duration: 30, effects: { fun: 0.1 }, skill: { key: 'driving', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The quay's drill berth: a life ring on its stand with its line, a float out on the water to throw to.
    id: 'cgRingDrill', name: '구명환 투척 훈련장', price: 0, w: 2, h: 2, icon: '🛟', color: '#ff6f00', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cgRingThrow', label: '구명환 투척 훈련하기', icon: '🛟', duration: 25, effects: { energy: -0.1 }, skill: { key: 'fitness', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The quay's edge along the water (2026-11-04, the layout audit; the fisher's and the seafarer's lots use it too): the coping, a
  // bollard every few metres, tyre fenders hung over the side, an iron ladder down to the water. Flat; only drawn.
  { id: 'hbQuayEdge', name: '안벽 가장자리', price: 0, w: 26, h: 1, icon: '⚓', color: '#8f8b82', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // The 경비함 at the 전용부두 (2026-11-04, the branch lots): her grey hull drawn round the deck, anchored at the bow's first deck tile (flat; only
  // drawn), and at her stern the fast boat on its davit, which is lowered and goes out to board the illegal fishing boats.
  { id: 'cgPatrolHull', name: '경비함 선체', price: 0, w: 1, h: 1, icon: '🚢', color: '#78909c', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  {
    id: 'cgRhibDavit', name: '고속단정 · 대빗', price: 0, w: 3, h: 2, icon: '🚤', color: '#ff6f00', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cgIntercept', label: '고속단정으로 불법 조업 단속 나가기', icon: '🚤', duration: 60, effects: { energy: -0.3 }, skill: { key: 'fitness', rate: 1 / 60 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
];
