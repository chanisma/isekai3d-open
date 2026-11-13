import type { ObjectDef } from '../types';

/**
 * New furniture for the animal hospital (2026-10-27 workplace pipeline, at the user's request): what
 * the 동물병원 was missing to feel like one — its own operating table, sized for a dog or a cat with
 * the anaesthesia machine at its head (the hospital's is for people), an X-ray table with the patient
 * laid in a foam trough under the tube, a raised bathing tub for the in-patients, the shelf of
 * prescription diets and supplies in the waiting room, a walk-on scale by the front desk and the
 * vaccination chart on the waiting-room wall. The ids start `vt` (the vet's; the operating table
 * says so in full) so no other workplace's can clash with them. Drawn in src/view3d/workplaces/vet.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // The same work as the hospital's table (the 응급 수술 call finds it by its interaction).
    id: 'vetSurgeryTable', name: '동물 수술대', price: 0, w: 2, h: 1, icon: '🩺', color: '#80cbc4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'performSurgery', label: '수술 집도하기', icon: '🔪', duration: 90, effects: { fun: -0.05, energy: -0.1 }, skill: { key: 'handiness', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
      { id: 'emergencySurgery', label: '응급 수술하기', icon: '🚑', duration: 60, effects: { energy: -0.15 }, skill: { key: 'handiness', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'vtXrayTable', name: '동물 엑스레이 촬영대', price: 0, w: 2, h: 1, icon: '🩻', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vtTakeXray', label: '엑스레이 촬영하기', icon: '🩻', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'vtGroomTub', name: '목욕 욕조', price: 0, w: 2, h: 1, icon: '🛁', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vtBathPet', label: '입원 동물 목욕시키기', icon: '🛁', duration: 20, effects: { fun: 0.2, hygiene: -0.1 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'vtFoodShelf', name: '처방 사료 진열장', price: 0, w: 2, h: 1, icon: '🦴', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vtStockFood', label: '처방 사료·용품 정리하기', icon: '🦴', duration: 15, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'vtScale', name: '반려동물 체중계', price: 0, w: 1, h: 1, icon: '⚖️', color: '#4db6ac', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vtWeighPet', label: '체중 재고 기록하기', icon: '⚖️', duration: 10, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'vtVaccineBoard', name: '예방접종 안내판', price: 0, w: 2, h: 1, icon: '📋', color: '#81c784', category: 'decor', unlisted: true, interactions: [] },
  // The 동물병원 laid out as one (2026-11-04, the layout audit): the treatment room's oxygen cage (the ICU kennel a breathless patient
  // lies in, its oxygen read off the panel); the isolation ward's kennel, yellow-taped, with the gown and gloves on their hook, for a
  // parvo or distemper case kept away from the others; the grooming table with its arm and noose; the autoclave the surgical packs are
  // sterilised in; the cats' carrier shelf that screens their side of the waiting room from the dogs'; the pet ambulance out front.
  {
    id: 'vtOxygenCage', name: '산소 입원장', price: 0, w: 1, h: 1, icon: '💨', color: '#b2dfdb', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vtCheckOxygen', label: '산소 농도·호흡 확인하기', icon: '💨', duration: 15, effects: { fun: 0.05 }, skill: { key: 'medicine', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'vtIsoKennel', name: '격리 입원장', price: 0, w: 1, h: 1, icon: '🧤', color: '#fff176', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vtIsoCare', label: '보호구 입고 격리 동물 돌보기', icon: '🧤', duration: 25, effects: { hygiene: -0.1 }, skill: { key: 'medicine', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'vtGroomTable', name: '미용 테이블', price: 0, w: 2, h: 1, icon: '✂️', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vtGroomPet', label: '털 깎고 발톱 다듬기', icon: '✂️', duration: 30, effects: { fun: 0.15 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'vtAutoclave', name: '고압 멸균기', price: 0, w: 1, h: 1, icon: '♨️', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vtSterilize', label: '수술 기구 멸균하기', icon: '♨️', duration: 15, effects: { fun: -0.05 }, skill: { key: 'medicine', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'vtCatShelf', name: '고양이 이동장 선반', price: 0, w: 2, h: 1, icon: '🐱', color: '#bcaaa4', category: 'decor', unlisted: true, interactions: [] },
  { id: 'vtPetVan', name: '동물 이송 차량', price: 0, w: 2, h: 1, icon: '🚐', color: '#e0f2f1', category: 'decor', unlisted: true, interactions: [] },
  // The 야생동물구조센터's pieces (2026-11-04, the branch lots). The flight cage in the back yard, long and netted, where a mended owl or
  // hawk flies its lengths before it's let go; the pens for deer and raccoon dogs, fenced and screened so they don't get used to people;
  // the rescue van with its carriers and nets, which goes out when a hurt animal is reported.
  {
    id: 'wrFlightCage', name: '맹금류 비행 재활장', price: 0, w: 10, h: 3, icon: '🦅', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wrFlightTrain', label: '맹금류 비행 훈련 살피기', icon: '🦅', duration: 35, effects: { fun: 0.1 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'wrPen', name: '포유류 계류장', price: 0, w: 3, h: 2, icon: '🦝', color: '#795548', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'wrRescueVan', name: '야생동물 구조 차량', price: 0, w: 2, h: 1, icon: '🚐', color: '#558b2f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wrRescueRun', label: '다친 야생동물 구조 출동하기', icon: '🚐', duration: 60, effects: { energy: -0.25 }, skill: { key: 'fitness', rate: 1 / 70 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
];
