import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 댄스 스튜디오 (2026-10-31 workplace pipeline, at the user's request): what a working
 * dance studio has besides its mirrors, barre and stage. The sprung floor taped for spacing, a sound desk
 * with a count display, a stretching corner, a rack of costumes and pointe shoes, a bench where the week's
 * video is gone through, a crash mat for lifts and the seats of the house. Drawn in
 * view3d/workplaces/dancer.ts (with dancerMotion.ts).
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
  { id: 'dnSprungFloor', name: '스프링 마루', price: 0, w: 11, h: 4, icon: '🪵', color: '#d9b37c', category: 'decor', unlisted: true, interactions: [], walkable: true },
  { id: 'dnHouseSeats', name: '객석', price: 0, w: 3, h: 1, icon: '💺', color: '#7a1730', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'dnSoundDesk', name: '사운드 데스크', price: 0, w: 2, h: 1, icon: '🎚️', color: '#2f2a28', category: 'skill', unlisted: true,
    interactions: [
      job('dnCueMusic', '음악 큐·카운트 잡기', '🎚️', 20, { fun: 0.05 }, 'dancing', 140),
      job('dnFreestyle', '음악 틀고 프리스타일', '🕺', 25, { fun: 0.3, energy: -0.15, hygiene: -0.1 }, 'dancing', 90),
    ],
  },
  {
    id: 'dnStretchCorner', name: '스트레칭 코너', price: 0, w: 2, h: 2, icon: '🧘', color: '#6a4c93', category: 'skill', unlisted: true,
    interactions: [
      job('dnFoamRoll', '폼롤러로 몸 풀기', '🧘', 20, { energy: 0.05 }, 'fitness', 140),
      job('dnSplitStretch', '다리 찢기 스트레칭', '🤸', 20, { energy: -0.05 }, 'fitness', 120),
    ],
  },
  {
    id: 'dnCostumeRack', name: '슈즈·의상 랙', price: 0, w: 2, h: 1, icon: '🩰', color: '#c2185b', category: 'skill', unlisted: true,
    interactions: [
      job('dnTiePointe', '토슈즈 길들이고 묶기', '🩰', 20, { fun: 0.05 }, 'dancing', 150),
      job('dnFitCostume', '공연 의상 맞추기', '👗', 15, { fun: 0.1 }, 'charisma', 180),
    ],
  },
  {
    id: 'dnVideoBench', name: '영상 리뷰 벤치', price: 0, w: 2, h: 1, icon: '🎬', color: '#6a1b9a', category: 'skill', unlisted: true,
    interactions: [job('dnVideoReview', '리허설 영상 돌려 보기', '🎬', 25, { fun: 0.1 }, 'dancing', 120)],
  },
  {
    id: 'dnLiftMat', name: '리프트 연습 매트', price: 0, w: 3, h: 2, icon: '🤸', color: '#1e6fb8', category: 'skill', unlisted: true,
    interactions: [job('dnPartnerLift', '파트너 리프트 연습하기', '🤸', 30, { fun: 0.2, energy: -0.2, hygiene: -0.1 }, 'dancing', 80)],
  },
  /**
   * The studio's own showcase (2026-11-05, the layout audit): a studio has no theatre inside, so the 정기 공연 and the
   * monthly 쇼케이스 are danced on a low portable riser at one end of the big practice room, under a few lamps on stands,
   * the folding seats set out before it. The same rehearsal and show as the stage's (performStage), drawn without the
   * proscenium, the wings and the curtain.
   */
  {
    id: 'dnShowcaseRiser', name: '쇼케이스 무대', price: 0, w: 5, h: 3, icon: '🎭', color: '#3a3440', category: 'skill', unlisted: true,
    interactions: [
      { id: 'rehearseStage', label: '쇼케이스 리허설하기', icon: '🎭', duration: 30, effects: { fun: 0.2, energy: -0.15 }, skill: { key: 'dancing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'performShow', label: '쇼케이스 공연하기', icon: '🌟', duration: 45, effects: { fun: 0.4, energy: -0.25 }, skill: { key: 'dancing', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  // The lobby (2026-11-05, the layout audit): the class timetable and notices on the wall, the shoe cubbies by the door
  // (dance shoes on, street shoes off), and the A-frame sign on the pavement.
  { id: 'dnTimetable', name: '수업 시간표 게시판', price: 0, w: 2, h: 1, icon: '🗓️', color: '#f3e5f5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dnShoeRack', name: '신발장', price: 0, w: 2, h: 1, icon: '🩰', color: '#8d6e4f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dnStreetSign', name: '댄스 스튜디오 입간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#c2185b', category: 'decor', unlisted: true, interactions: [] },
];
