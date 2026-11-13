import type { ObjectDef } from '../types';

/**
 * New furniture for the nightclub (2026-10-27 workplace pipeline, at the user's request): what the
 * 나이트클럽 was missing — the LED wall behind the booth, the lit dance floor with the light truss
 * over it (walked on: the crowd dances on it), the fog machine by the booth, the club's bar, the VIP
 * booth and the producer's desk in the back room. The ids start `nc` (the nightclub's) so no other
 * workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  { id: 'ncLedWall', name: 'LED 비주얼 월', price: 0, w: 4, h: 1, icon: '🖥️', color: '#14141c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ncDanceFloor', name: 'LED 댄스 플로어', price: 0, w: 10, h: 4, icon: '🕺', color: '#202030', category: 'decor', unlisted: true, interactions: [], walkable: true },
  {
    id: 'ncFogMachine', name: '포그 머신', price: 0, w: 1, h: 1, icon: '🌫️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ncFogBlast', label: '포그·조명 연출하기', icon: '🌫️', duration: 10, effects: { fun: 0.2 }, skill: { key: 'djMixing', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ncBar', name: '클럽 바', price: 0, w: 4, h: 2, icon: '🍸', color: '#1b1b24', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ncBarBreak', label: '바에서 목 축이기', icon: '🥤', duration: 15, effects: { fun: 0.15, social: 0.1, energy: 0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ncVipBooth', name: 'VIP 부스', price: 0, w: 3, h: 2, icon: '🥂', color: '#4a148c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ncVipToast', label: 'VIP 테이블 인사하기', icon: '🥂', duration: 15, effects: { social: 0.3, fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ncProducerDesk', name: '프로듀싱 책상', price: 0, w: 2, h: 1, icon: '🎹', color: '#212121', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ncMakeEdit', label: '리믹스 에디트 만들기', icon: '💻', duration: 30, effects: { fun: 0.2 }, skill: { key: 'djMixing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The door and the room round the floor (2026-11-05, the layout audit): the ID and entry desk, the cloakroom counter, the standing
  // tables round the dance floor, the queue's posts on the pavement and the neon over the door. Set dressing.
  { id: 'ncDoorDesk', name: '신분증 확인·입장 카운터', price: 0, w: 2, h: 1, icon: '🪪', color: '#1b1b24', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ncCoatCheck', name: '물품 보관소', price: 0, w: 2, h: 1, icon: '🧥', color: '#26262e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ncHighTable', name: '스탠딩 테이블', price: 0, w: 1, h: 1, icon: '🍸', color: '#26262e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ncQueueRope', name: '입장 대기 줄 펜스', price: 0, w: 2, h: 1, icon: '🚧', color: '#b71c1c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ncNeonSign', name: '클럽 네온 간판', price: 0, w: 2, h: 1, icon: '✨', color: '#1b1b24', category: 'decor', unlisted: true, interactions: [] },
];
