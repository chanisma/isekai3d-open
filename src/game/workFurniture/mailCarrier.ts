import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 우체국 (2026-11-01 workplace pipeline, at the user's request): what a Korean neighbourhood post office
 * has besides its pigeonhole frames, counter, scale and red motorbike. In the sorting room the 묶음대 and the 배달 구역 지도; in the
 * parcel room the roller line and the cage trolley; in the lobby the 번호표 발권기, the 기재대 and the 사서함 wall; out the front a
 * 우체통 and the row of house boxes the walk-out round goes along. The branch (새말우체국), its routes and addresses are made up.
 * Drawn in view3d/workplaces/mailCarrier.ts (with mailCarrierMotion.ts).
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
  {
    id: 'mpBundleTable', name: '우편 묶음대', price: 0, w: 2, h: 1, icon: '✉️', color: '#dbc8a0', category: 'skill', unlisted: true,
    interactions: [job('mpBundleMail', '배달 순서대로 묶기', '✉️', 20, { fun: -0.05 }, 'logic', 130)],
  },
  {
    id: 'mpRollerLine', name: '소포 롤러 컨베이어', price: 0, w: 3, h: 1, icon: '📦', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('mpRollParcel', '소포 구분하기', '📦', 20, { energy: -0.1 }, 'logic', 130)],
  },
  {
    id: 'mpCageTrolley', name: '운반 카고', price: 0, w: 1, h: 1, icon: '🛒', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [job('mpLoadCage', '카고에 소포 싣기', '🛒', 20, { energy: -0.2 }, 'fitness', 110)],
  },
  {
    id: 'mpRouteMap', name: '배달 구역 지도', price: 0, w: 2, h: 1, icon: '🗺️', color: '#f6efd9', category: 'skill', unlisted: true,
    interactions: [job('mpStudyMap', '구역 지도에 새 주소 표시하기', '🗺️', 15, { fun: -0.03 }, 'logic', 140)],
  },
  {
    id: 'mpPoBoxes', name: '사서함', price: 0, w: 2, h: 1, icon: '🔐', color: '#c9a24a', category: 'skill', unlisted: true,
    interactions: [job('mpFillBox', '사서함에 우편 넣기', '🔐', 15, { energy: -0.05 }, 'logic', 150)],
  },
  {
    id: 'mpWritingDesk', name: '기재대', price: 0, w: 2, h: 1, icon: '💌', color: '#ece6d6', category: 'skill', unlisted: true,
    interactions: [job('mpRestockForms', '봉투·송장 채우기', '💌', 10, { fun: -0.03 }, 'logic', 170)],
  },
  {
    id: 'mpTicketMachine', name: '번호표 발권기', price: 0, w: 1, h: 1, icon: '🔢', color: '#d32f2f', category: 'skill', unlisted: true,
    interactions: [job('mpFillTickets', '번호표 용지 갈기', '🔢', 10, { fun: -0.03 }, 'logic', 170)],
  },
  {
    id: 'mpMailbox', name: '우체통', price: 0, w: 1, h: 1, icon: '📮', color: '#d32f2f', category: 'skill', unlisted: true,
    interactions: [job('mpEmptyMailbox', '우체통 수거하기', '📮', 15, { energy: -0.05 }, 'fitness', 150)],
  },
  {
    id: 'mpStreetBoxes', name: '골목 우편함', price: 0, w: 2, h: 1, icon: '📮', color: '#b86b4a', category: 'skill', unlisted: true,
    interactions: [job('mpWalkRound', '걸어서 골목 우편 돌리기', '📮', 30, { energy: -0.15, fun: 0.05 }, 'fitness', 100)],
  },
  // The 우체국 as one is (2026-11-05, the layout audit): the loading dock's shutter, the 소형 화물차 the parcels go out in, the front.
  { id: 'mpShutter', name: '하역장 셔터', price: 0, w: 1, h: 1, icon: '🚪', color: '#d32f2f', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'mpPostVan', name: '우편 소형 화물차', price: 0, w: 2, h: 4, icon: '🚚', color: '#d32f2f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'mpFront', name: '우체국 정면·간판', price: 0, w: 1, h: 1, icon: '🏤', color: '#d32f2f', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
