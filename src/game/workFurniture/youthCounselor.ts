import type { InteractionDef, ObjectDef } from '../types';

const job = (id: string, label: string, icon: string, skill: NonNullable<InteractionDef['skill']>['key']): InteractionDef => ({
  id, label, icon, duration: 25, effects: { social: 0.2, fun: 0.1 }, skill: { key: skill, rate: 1 / 120 }, requires: 'atWork', pose: 'front',
});

/** 청소년수련관: 동아리, 학습 지원, 접수를 위한 직장 전용 가구. */
export const OBJECTS: ObjectDef[] = [
  { id: 'ycBandCorner', name: '밴드 연습 코너', w: 3, h: 2, price: 0, unlisted: true, category: 'skill', color: '#526f84', icon: '🎵',
    interactions: [job('ycCoachBand', '밴드 합주 박자 지도하기', '🎵', 'charisma')] },
  { id: 'ycClubBoard', name: '동아리 소식 게시판', w: 2, h: 1, price: 0, unlisted: true, category: 'skill', color: '#e9b765', icon: '📋',
    interactions: [job('ycPostClubs', '동아리 모집 안내 붙이기', '📋', 'writing')] },
  { id: 'ycStudyNook', name: '방과후 자습 코너', w: 2, h: 1, price: 0, unlisted: true, category: 'skill', color: '#81a897', icon: '📚',
    interactions: [job('ycStudySupport', '자기 주도 학습 계획 돕기', '📚', 'empathy')] },
  { id: 'ycSignupDesk', name: '프로그램 신청 안내대', w: 2, h: 1, price: 0, unlisted: true, category: 'skill', color: '#e89b48', icon: '📝',
    interactions: [job('ycRegisterProgram', '프로그램 신청 안내하기', '📝', 'charisma')] },
];
