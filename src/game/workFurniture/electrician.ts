import type { InteractionDef, ObjectDef } from '../types';

const job = (id: string, label: string, icon: string, skill: 'handiness' | 'logic' | 'charisma', duration = 30): InteractionDef => ({
  id, label, icon, duration, requires: 'atWork', pose: 'front',
  skill: { key: skill, rate: 1 / 110 }, effects: { fun: 0.05, energy: -0.05 },
});

/** Names on the equipment are fictional; the workplace keeps its original name. */
export const OBJECTS: ObjectDef[] = [
  { id: 'elCeilingRig', name: '사다리·천장 조명 배선', w: 2, h: 2, price: 0, icon: '💡', color: '#ffbb32', category: 'skill', unlisted: true,
    interactions: [job('elFitLight', '천장 매입등 설치하기', '💡', 'handiness', 35)] },
  { id: 'elTestBench', name: '절연·계측 시험대', w: 2, h: 1, price: 0, icon: '🔌', color: '#607d8b', category: 'skill', unlisted: true,
    interactions: [job('elInsulation', '절연 저항 측정하기', '🔌', 'logic'), job('elClamp', '클램프 미터로 전류 확인하기', '⚡', 'logic')] },
  { id: 'elSafetyWall', name: '공구·보호구 점검 벽', w: 2, h: 1, price: 0, icon: '🧰', color: '#e6b642', category: 'skill', unlisted: true,
    interactions: [job('elPreparePpe', '안전모·절연장갑·잠금표 점검하기', '🧰', 'handiness')] },
  { id: 'elMeterPanel', name: '계량기함', w: 1, h: 1, price: 0, icon: '⚡', color: '#c4cfd3', category: 'skill', unlisted: true,
    interactions: [job('elMeterCheck', '계량기 결선과 검침 확인하기', '⚡', 'logic')] },
  { id: 'elQuoteDesk', name: '전기 공사 상담대', w: 2, h: 2, price: 0, icon: '📐', color: '#d0ab78', category: 'skill', unlisted: true,
    interactions: [job('quoteJob', '공사 견적 상담하기', '📐', 'charisma'), job('explainWork', '도면으로 공사 설명하기', '🔌', 'charisma')] },
];
