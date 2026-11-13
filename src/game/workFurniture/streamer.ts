import type { ObjectDef } from '../types';

/**
 * New furniture for the streaming house (2026-10-27 workplace pipeline, at the user's request): what
 * the 스트리밍 하우스 was missing — the live dashboard on the wall (viewers, the donation goal, the
 * house's four rooms on air or not), the channel's neon sign, the ASMR talk booth with its dummy-head
 * mic, the merch shelf where the goods are packed for fans, the collab camera set facing the lounge
 * sofa, and the green-screen studio's costume rack for skits. The ids start `st` (the streamer's)
 * so no other workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'stDashboard', name: '방송 상황판', price: 0, w: 2, h: 1, icon: '📊', color: '#1a1033', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stCheckStats', label: '시청자 지표 확인하기', icon: '📊', duration: 20, effects: { fun: -0.02 }, skill: { key: 'programming', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'stNeonBoard', name: '채널 네온 사인', price: 0, w: 2, h: 1, icon: '✨', color: '#ff4fa3', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'stAsmrBooth', name: 'ASMR 토크 부스', price: 0, w: 2, h: 1, icon: '🎧', color: '#d7b9a0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stAsmrStream', label: 'ASMR 방송하기', icon: '🎧', duration: 35, effects: { fun: 0.2, social: 0.2 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'stMerchShelf', name: '굿즈 진열장', price: 0, w: 2, h: 1, icon: '🧸', color: '#ffd54f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stPackMerch', label: '팬 굿즈 포장하기', icon: '📦', duration: 20, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'stCollabCam', name: '합방 촬영 세트', price: 0, w: 1, h: 1, icon: '🎥', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stCollabSetup', label: '합방 카메라 세팅하기', icon: '🎥', duration: 15, effects: { fun: 0.05 }, skill: { key: 'photography', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'stCostumeRack', name: '콩트 의상 행거', price: 0, w: 2, h: 1, icon: '👗', color: '#8e24aa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stPickCostume', label: '콩트 의상 고르기', icon: '🎭', duration: 15, effects: { fun: 0.2 }, skill: { key: 'comedy', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
