import type { ObjectDef } from '../types';

/**
 * New furniture for the 시청 의원 사무실 (2026-10-27 workplace pipeline, at the user's request): what
 * a 시의원's office and the council chamber have besides the staff desks, the podium and the council
 * desks — the member's own desk under the 태극기 and the city flag, the briefing backdrop the podium
 * stands in front of for the press, the district map with its pins and the 현안 stuck on it, the
 * 민원 상담 창구 in the lobby where constituents sit across from staff, and the cabinet the 민원
 * files are kept in. The city (새솔시) and everyone on the nameplates are made up; nothing belongs
 * to a party. Drawn in view3d/workplaces/politician.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'polMemberDesk', name: '의원 집무 책상', price: 0, w: 2, h: 1, icon: '🏛️', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'polReviewDocs', label: '결재 서류 검토하기', icon: '🖋️', duration: 25, effects: { fun: -0.03 }, skill: { key: 'leadership', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'polPressBackdrop', name: '브리핑 백드롭', price: 0, w: 3, h: 1, icon: '📸', color: '#1a3a6b', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'polDistrictMap', name: '지역구 현안 지도', price: 0, w: 2, h: 1, icon: '🗺️', color: '#e8f0e0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'polDistrictPlan', label: '지역구 현안 짚어 보기', icon: '📍', duration: 20, effects: { fun: 0.03 }, skill: { key: 'leadership', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'polPetitionDesk', name: '민원 상담 창구', price: 0, w: 2, h: 1, icon: '🗂️', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'polLogComplaint', label: '민원 접수 기록하기', icon: '📝', duration: 20, effects: { social: 0.1 }, skill: { key: 'empathy', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A civic group's signature stand on the pavement (2026-11-04, the branch lots): a pop-up canopy over a folding table, the
    // group's banner on its valance, the petition and its sheets on clipboards, leaflets, a picket leaning on a leg. Signatures
    // are gathered at it, and when something happens a statement is read out in front of it to the press.
    id: 'actSignBooth', name: '서명 운동 부스', price: 0, w: 2, h: 1, icon: '✍️', color: '#ef6c00', category: 'skill', unlisted: true,
    interactions: [
      { id: 'actCollectSign', label: '서명 받으며 취지 알리기', icon: '✍️', duration: 25, effects: { social: 0.15 }, skill: { key: 'empathy', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'actStreetCampaign', label: '거리 긴급 기자 회견하기', icon: '📣', duration: 40, effects: { social: 0.3, energy: -0.15 }, skill: { key: 'charisma', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'polPetitionCabinet', name: '민원 서류함', price: 0, w: 1, h: 1, icon: '🗄️', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'polFilePetitions', label: '민원 서류 정리하기', icon: '🗄️', duration: 15, effects: { fun: -0.03 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The 연단 without the council's emblem and name, for a briefing room or a press line elsewhere (2026-11-05).
  {
    id: 'pressPodium', name: '브리핑 연단', price: 0, w: 1, h: 1, icon: '🎤', color: '#3e2723', category: 'skill', unlisted: true,
    interactions: [
      { id: 'giveSpeech', label: '연설하기', icon: '🎤', duration: 30, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'pressConference', label: '기자 회견하기', icon: '📢', duration: 40, effects: { social: 0.3, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  // The chamber's 의장석 (2026-11-05, the layout audit): the raised dais at the head of the 본회의장, the 의장's high-backed chair
  // and desk with the gavel in the middle, the 사무국장's and the 의사담당's seats a step down on either side, the council's emblem
  // and the 태극기 on the panelled wall behind. Members' desks face it, the 발언대 stands below it.
  { id: 'polSpeakerDais', name: '의장석', price: 0, w: 3, h: 2, icon: '🏛️', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
  // Out front of the council building (2026-11-05, the layout audit): the name stone of 새솔시의회 and the three flagpoles, the
  // 태극기, the city's flag and the council's.
  { id: 'polCouncilSign', name: '시의회 표지석·게양대', price: 0, w: 3, h: 1, icon: '🏛️', color: '#9e9e9e', category: 'decor', unlisted: true, interactions: [] },
];
