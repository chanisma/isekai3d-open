import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 한의원 (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * medicine clinic has besides its treatment beds, 약장, 탕전기 and pulse desks — the infrared lamp
 * (적외선 치료기) on its long arm over a bed, the cupping and 뜸 cart with its UV sterilizer, the
 * pouch packer the decoction goes into, the 약연 · 작두 corner on a low 평상, the 동의보감 bookcase
 * with the acupuncture figure, and the 대추차 table in the waiting room. The clinic (백초한의원) is
 * made up. Drawn in view3d/workplaces/koreanMedicine.ts (with koreanMedicineMotion.ts).
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
    id: 'kmHeatLamp', name: '적외선 치료기', price: 0, w: 1, h: 1, icon: '💡', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [job('kmHeatTherapy', '적외선 치료기 맞춰 주기', '💡', 10, { fun: 0.02 }, 'medicine', 150)],
  },
  {
    id: 'kmCupCart', name: '부항 · 뜸 카트', price: 0, w: 1, h: 1, icon: '🫙', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('kmPrepCups', '부항컵 소독하고 뜸 준비하기', '🫙', 20, { fun: -0.05 }, 'handiness', 130)],
  },
  {
    id: 'kmPouchPacker', name: '한약 파우치 포장기', price: 0, w: 1, h: 1, icon: '📦', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [job('kmPackPouches', '한약 파우치 포장하기', '📦', 20, { fun: -0.05 }, 'cooking', 130)],
  },
  {
    id: 'kmHerbGrinder', name: '약연 · 작두 자리', price: 0, w: 2, h: 1, icon: '🪵', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      job('kmCutHerbs', '작두로 약재 썰기', '🔪', 25, { energy: -0.1 }, 'gardening', 120),
      job('kmGrindHerbs', '약연으로 약재 갈기', '⚙️', 25, { energy: -0.1 }, 'gardening', 120),
    ],
  },
  {
    id: 'kmDonguiShelf', name: '동의보감 책장', price: 0, w: 2, h: 1, icon: '📚', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [job('kmReadDongui', '동의보감 찾아 읽기', '📖', 25, { fun: 0.05 }, 'medicine', 110)],
  },
  {
    id: 'kmTeaStand', name: '대추차 다과대', price: 0, w: 1, h: 1, icon: '🍵', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [job('kmServeTea', '대기 환자에게 대추차 내기', '🍵', 10, { social: 0.15 }, 'charisma', 150)],
  },
  // The clinic's pole sign on the pavement (2026-11-05, the layout audit).
  { id: 'kmStreetSign', name: '한의원 간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#6d4c41', category: 'decor', unlisted: true, interactions: [] },
];
