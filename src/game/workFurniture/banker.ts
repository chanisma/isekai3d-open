import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 은행 지점 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean bank branch has besides its windows, 여신 desks, dealing terminals, the PB desk and the
 * vault — the 상담 의자 a customer sits on at the window (with its basket for the bag), the 번호표
 * 발권기 by the door, the 365 자동화코너 (an ATM and the 통장정리·공과금 machine), the 서류 작성대
 * with its pens on chains and the 돋보기, and the 금리 안내 전광판 over the waiting chairs that
 * calls the numbers. The bank (한결은행) is made up. Drawn in view3d/workplaces/banker.ts (with
 * bankerMotion.ts).
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
  // Sat on by the customer at the window while they wait and while they're seen to (waitSeats.ts).
  { id: 'bkCounterChair', name: '창구 상담 의자', price: 0, w: 1, h: 1, icon: '🪑', color: '#0f7a68', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'bkTicketKiosk', name: '번호표 발권기', price: 0, w: 1, h: 1, icon: '🔢', color: '#0f7a68', category: 'skill', unlisted: true,
    interactions: [job('bkGuideTicket', '번호표 뽑아 안내하기', '🔢', 10, { social: 0.15 }, 'charisma', 150)],
  },
  {
    id: 'bkAtm', name: '365 자동화코너', price: 0, w: 2, h: 1, icon: '💳', color: '#0f7a68', category: 'skill', unlisted: true,
    interactions: [
      job('bkRefillAtm', 'ATM 현금 카세트 채우기', '💵', 20, { fun: -0.05 }, 'logic', 140),
      job('bkHelpAtm', '어르신 ATM 이용 도와드리기', '💳', 15, { social: 0.25 }, 'charisma', 120),
    ],
  },
  {
    id: 'bkFormDesk', name: '서류 작성대', price: 0, w: 2, h: 1, icon: '📝', color: '#e8e2d6', category: 'skill', unlisted: true,
    interactions: [job('bkRestockForms', '전표·서식 채워 넣기', '📝', 10, { fun: -0.03 }, 'logic', 170)],
  },
  { id: 'bkRateBoard', name: '금리 안내 전광판', price: 0, w: 2, h: 1, icon: '💱', color: '#1d2f4f', category: 'decor', unlisted: true, interactions: [] },
];
