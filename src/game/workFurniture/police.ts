import type { ObjectDef } from '../types';

/**
 * New furniture for the police station (2026-10-26 workplace pipeline, at the user's request): what a
 * station was missing to feel like one — the squad room's case board and radio desk, the holding
 * cell and the interrogation room's own table and chairs, the training room's gear locker, and the
 * lobby's wanted posters. Drawn in src/view3d/workplaces/police.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // A cork board of the case under way: suspects' photos tied together with red string, a map.
    id: 'policeCaseBoard', name: '사건 수사 보드', price: 0, w: 2, h: 1, icon: '📌', color: '#b08a5a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'policeCaseMeeting', shared: true, chatty: true, label: '수사 회의 참석하기', icon: '🗣️', duration: 40, effects: { social: 0.4 }, skill: { key: 'logic', rate: 1 / 200 }, range: 2, requires: 'atWork', pose: 'front' },
      { id: 'policePinClues', label: '수사 보드 정리하기', icon: '📌', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The station's radio desk: the district map, the CCTV, the 112 calls coming in.
    id: 'policeDispatchConsole', name: '112 상황 데스크', price: 0, w: 2, h: 1, icon: '📻', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'policeMonitorDispatch', label: '112 신고 모니터링하기', icon: '📻', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A barred holding cell with a steel bench (유치장), looked in on now and then.
    id: 'policeHoldingCell', name: '유치장', price: 0, w: 2, h: 2, icon: '🔒', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'policeCheckCell', label: '유치장 점검하기', icon: '🔒', duration: 10, effects: {}, skill: { key: 'fitness', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The interrogation room's steel table: a cuff ring on the suspect's side, a lamp, a recorder.
    id: 'policeInterrogationTable', name: '조사실 테이블', price: 0, w: 2, h: 1, icon: '🕵️', color: '#8d9399', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    // Its bolted-down steel chairs (sat on by suspects while they wait, and by the officer).
    id: 'policeInterrogationChair', name: '조사실 의자', price: 0, w: 1, h: 1, icon: '🪑', color: '#607d8b', category: 'comfort', unlisted: true,
    interactions: [{ id: 'relax', chatty: true, label: '앉아서 쉬기', icon: '😌', duration: 20, effects: { energy: 0.06, fun: 0.1 }, pose: 'on' }],
  },
  {
    // The training room's open locker of gear: vest, helmet, baton, shield.
    id: 'policeGearLocker', name: '경찰 장비함', price: 0, w: 1, h: 1, icon: '🦺', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'policeCheckGear', label: '장비 점검하기', icon: '🦺', duration: 15, effects: { fun: -0.05 }, skill: { key: 'fitness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The lobby's notice board: wanted posters, a missing child, the voice-phishing warning.
    id: 'policeWantedBoard', name: '공개수배 게시판', price: 0, w: 2, h: 1, icon: '📰', color: '#5d4037', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    // The lobby's lost-property shelf: tagged bags and boxes by month, the intake counter with its ledger.
    id: 'poLostShelf', name: '분실물 보관 선반', price: 0, w: 2, h: 1, icon: '📦', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'poSortLost', label: '보관 분실물 정리하기', icon: '📦', duration: 20, effects: { fun: -0.05 }, skill: { key: 'law', rate: 1 / 170 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The print scanner: a bench with a flatbed scanner, a monitor with two made-up prints side by side.
    id: 'poPrintScanner', name: '지문 대조기', price: 0, w: 2, h: 1, icon: '🔍', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'poScanCard', label: '지문 카드 스캔해 등록하기', icon: '🔍', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The 경찰특공대 기지's pieces (2026-11-04, the branch lots). The rappel tower in the yard, roped from its top platform; the detection
  // dogs' kennel runs; the bomb squad's suit on its stand beside the disposal robot and the portable X-ray; the team's black tactical
  // vehicle, which goes out when a siege is reported.
  {
    id: 'swatRappelTower', name: '레펠 훈련탑', price: 0, w: 2, h: 2, icon: '🧗', color: '#5d6d7e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swatRappel', label: '레펠 하강 훈련하기', icon: '🧗', duration: 30, effects: { energy: -0.25 }, skill: { key: 'fitness', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'swatK9Kennel', name: '탐지견 견사', price: 0, w: 3, h: 1, icon: '🐕', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swatK9Train', label: '탐지견과 폭발물 수색 훈련하기', icon: '🐕', duration: 30, effects: { fun: 0.1, energy: -0.1 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'swatEodRig', name: '폭발물 처리 장비', price: 0, w: 2, h: 1, icon: '🦺', color: '#556b2f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swatEodDrill', label: '방호복 입고 폭발물 처리 훈련하기', icon: '🦺', duration: 35, effects: { energy: -0.2 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'swatVan', name: '특공대 전술 차량', price: 0, w: 3, h: 1, icon: '🚐', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swatDeploy', label: '인질 농성 현장으로 출동하기', icon: '🚨', duration: 60, effects: { energy: -0.3 }, skill: { key: 'fitness', rate: 1 / 60 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  // The base redone (2026-11-04, the layout audit): the armoury's locked steel rifle cabinet, where each member's weapon is signed out
  // and checked; the bomb squad's X-ray reading desk, where a suspect package's film is read before it's touched; the detection dogs'
  // gear shelf (leads, harnesses, the training aids, the feed); the kill house's steel silhouette targets; the compound's fence and
  // gate along the street.
  {
    id: 'swatArmoryRack', name: '총기 보관함', price: 0, w: 2, h: 1, icon: '🔐', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'policeCheckGear', label: '장비 점검하기', icon: '🦺', duration: 15, effects: { fun: -0.05 }, skill: { key: 'fitness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'swatXrayDesk', name: '폭발물 X-ray 판독대', price: 0, w: 2, h: 1, icon: '🩻', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'swatEodDrill', label: '방호복 입고 폭발물 처리 훈련하기', icon: '🦺', duration: 35, effects: { energy: -0.2 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'swatK9GearShelf', name: '탐지견 장비 선반', price: 0, w: 2, h: 1, icon: '🐕', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
  { id: 'swatSteelTarget', name: '철판 표적', price: 0, w: 1, h: 1, icon: '🎯', color: '#546e7a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'swatCompoundFence', name: '특공대 담장·정문', price: 0, w: 1, h: 1, icon: '🚧', color: '#78909c', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // 2026-11-05, the layout audit: the station's car park (the patrol cars' marked bays, '경찰 차량 전용' on the asphalt) and its pole sign.
  { id: 'poCarPark', name: '순찰차 주차장', price: 0, w: 6, h: 6, icon: '🅿️', color: '#455a64', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'poStationSign', name: '경찰서 간판', price: 0, w: 1, h: 1, icon: '🚓', color: '#1a237e', category: 'decor', unlisted: true, interactions: [] },
];
