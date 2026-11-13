import type { ObjectDef } from '../types';

/**
 * New furniture for the 작업치료실 (2026-10-27 workplace pipeline, at the user's request): what a
 * rehabilitation hospital's OT room has besides the fine-motor tables, the training kitchen, the
 * sensory mat and the play mat — the splint table where a thermoplastic hand splint is moulded on the
 * patient's forearm, the mirror box for mirror therapy, the ADL room (a bed, a transfer pole and a mock
 * bathroom) for dressing and standing up, the cognitive table (화투 pairs, a puzzle, the clock drawn)
 * and the assessment cabinet (the grip dynamometer, the goniometer, the test kits). Drawn in
 * view3d/workplaces/occupationalTherapist.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'otSplintTable', name: '손 보조기 제작 테이블', price: 0, w: 2, h: 1, icon: '🩹', color: '#dcc7a1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'otMakeSplint', label: '맞춤 손 보조기 만들기', icon: '🩹', duration: 35, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'otMirrorBox', name: '거울 치료 테이블', price: 0, w: 1, h: 1, icon: '🪞', color: '#b39ddb', category: 'skill', unlisted: true,
    interactions: [
      { id: 'otMirrorTherapy', label: '거울 치료하기', icon: '🪞', duration: 30, effects: { social: 0.15 }, skill: { key: 'medicine', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'otAdlRoom', name: '일상생활 훈련실 (침실·화장실)', price: 0, w: 2, h: 2, icon: '🛏️', color: '#80cbc4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'otAdlTransfer', label: '옷 입기·일어서기 훈련하기', icon: '🧦', duration: 30, effects: { energy: -0.1, social: 0.15 }, skill: { key: 'empathy', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'otCognitiveTable', name: '인지 재활 테이블', price: 0, w: 2, h: 1, icon: '🃏', color: '#c9a27a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'otCognitive', label: '인지 훈련 진행하기', icon: '🃏', duration: 30, effects: { fun: 0.15, social: 0.1 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'otAssessCabinet', name: '평가 도구장', price: 0, w: 1, h: 1, icon: '📐', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'otCheckTools', label: '평가 도구 점검하기', icon: '📐', duration: 15, effects: { fun: -0.02 }, skill: { key: 'medicine', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The hospital's pole sign on the pavement, the 재활센터 under its name (2026-11-05, the layout audit).
  { id: 'otStreetSign', name: '재활병원 간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#f57c00', category: 'decor', unlisted: true, interactions: [] },
];
