import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 진단검사센터 (2026-11-01, workplace pipeline): the pieces the lab was missing. A hatch where a courier brings samples, a
 * pipetting bench, a blood-culture cabinet, a cold store of reagents, a desk that checks results and phones a critical value through,
 * a bin for infectious waste, and the lab's rules on a stand. Drawn in view3d/workplaces/labTechnician.ts (with
 * labTechnicianMotion.ts), which also redoes the analyser, centrifuge, microscope bench and sample fridge. The lab's name on its signs is made up.
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
    id: 'ltReception', name: '검체 접수창', price: 0, w: 2, h: 1, icon: '🧪', color: '#00838f', category: 'skill', unlisted: true,
    interactions: [job('ltReceive', '이송된 검체 바코드 찍어 접수하기', '🧪', 22, { fun: -0.03 }, 'logic', 130), job('ltLabelCheck', '라벨 안 맞는 검체 가려내기', '🔍', 18, { fun: -0.03 }, 'logic', 110)],
  },
  { id: 'ltPipetteBench', name: '분주대', price: 0, w: 2, h: 1, icon: '🧪', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('ltPipette', '피펫으로 검체 나눠 담기', '🧪', 28, { fun: -0.03 }, 'handiness', 100)] },
  { id: 'ltIncubator', name: '혈액 배양기', price: 0, w: 2, h: 1, icon: '🌡️', color: '#b0bec5', category: 'skill', unlisted: true, interactions: [job('ltCulture', '양성 신호 배양병 꺼내 확인하기', '🌡️', 24, { fun: -0.03 }, 'medicine', 100)] },
  { id: 'ltReagentStore', name: '시약 보관고', price: 0, w: 2, h: 1, icon: '🧊', color: '#e3f2fd', category: 'skill', unlisted: true, interactions: [job('ltReagent', '시약 유효기간 확인하고 앞으로 옮기기', '🧊', 18, { fun: -0.03 }, 'logic', 150)] },
  {
    id: 'ltVerifyDesk', name: '결과 확인 책상', price: 0, w: 3, h: 1, icon: '🖥️', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [job('ltVerify', '검사 결과 확인하고 승인하기', '🖥️', 26, { fun: -0.03 }, 'logic', 90), job('ltCritical', '위험 수치 전화로 바로 알리기', '📞', 22, { energy: -0.05 }, 'medicine', 80)],
  },
  { id: 'ltBioBin', name: '감염성 폐기물함', price: 0, w: 1, h: 1, icon: '🗑️', color: '#f9a825', category: 'skill', unlisted: true, interactions: [job('ltDispose', '쓴 검체 폐기물함에 버리기', '🗑️', 10, { fun: -0.03 }, 'handiness', 240)] },
  { id: 'ltLabSign', name: '검사실 수칙 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#005662', category: 'decor', unlisted: true, interactions: [] },
  // A blood-draw desk (2026-11-04, the layout audit): the outpatients' 채혈실 is a row of these, the patient's arm out on the cushion across it, the tubes, the
  // tourniquet and the sharps box on the phlebotomist's side.
  { id: 'ltDrawDesk', name: '채혈대', price: 0, w: 1, h: 1, icon: '🩸', color: '#e0f2f1', category: 'decor', unlisted: true, interactions: [] },
  // The 공항검역소's pieces (2026-11-04, the branch lots). A class II biological safety cabinet, its glass sash half down, where a sample
  // that may carry a germ is opened (the pharmaceutical lab's cell room has one too). The 열화상 검역대: the thermal camera on its
  // tripod over the arrivals' lane, the screen showing each face's temperature, the desk where a fever is checked again.
  { id: 'bioSafetyCabinet', name: '생물안전작업대', price: 0, w: 2, h: 1, icon: '🧫', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('bscWork', '생물안전작업대에서 시료 다루기', '🧫', 30, { fun: -0.03 }, 'science', 100)] },
  {
    id: 'qrThermalGate', name: '열화상 검역대', price: 0, w: 2, h: 1, icon: '🌡️', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      job('qrScreen', '열화상 카메라로 입국자 발열 살피기', '🌡️', 25, { fun: -0.03 }, 'logic', 120),
      { ...job('qrIsolateTraveler', '고열 입국자 격리실로 안내하기', '🚨', 40, { energy: -0.15 }, 'medicine', 60), requires: 'workAlarm' },
    ],
  },
];
