import { topLevelOf } from './careers';
import { TYPE_ACTIVITIES, WORK_TYPES, type WorkType } from './careerTypes';
import { CHILD_SKILLS, SKILL_INFO, TODDLER_SKILLS } from './constants';
import type { Game } from './game';
import { MIND_SKILLS } from './mind';
import type { RelFlag } from './relationships';
import type { Dweller, SkillKey } from './types';
import type { WantSet } from './wants';

/**
 * Aspirations: things a dweller wants to do with their life (ours, at the user's request:
 * docs/ref-game/10-aspirations.md). Built on 참고 게임's AspirationTrack (docs/ref-game/04 §4.1): milestones
 * of objectives, satisfaction points for each objective as it is met (참고 게임 `satisfaction_points`),
 * an age gate ("어른 되기", 참고 게임 objective_*_A2_1) where a step needs one, and the track's want set
 * offered more often. Aspirations are named by what one does rather than who one becomes, grouped
 * into areas of life after the Aspiration Index (growth, relationships, community, health…), with
 * one for those who don't know yet, and kinds of work after Holland's types instead of job titles.
 * A dweller may change their aspiration at any time without losing what they did (kept per aspiration).
 */

export type AspGoal =
  | { kind: 'friends'; count: number; stage: 'friend' | 'goodFriend' }
  | { kind: 'flag'; flag: RelFlag }
  | { kind: 'romance'; atLeast: number }
  | { kind: 'skill'; skill: SkillKey; level: number }
  | { kind: 'count'; counter: string; n: number; label: string }
  | { kind: 'money'; amount: number }
  | { kind: 'job' }
  | { kind: 'careerLevel'; level: number | 'top' }
  | { kind: 'own'; defId: string; label: string }
  | { kind: 'met'; count: number }
  | { kind: 'friendsAged'; count: number; age: 'child' | 'grownUp' }
  | { kind: 'schoolGrade'; grade: number }
  // Ours, for the doing-aspirations:
  | { kind: 'grownUp' }
  | { kind: 'anySkill'; level: number }
  | { kind: 'areasTried'; count: number }
  | { kind: 'explored'; count: number }
  | { kind: 'triedWork' }
  | { kind: 'typeSkill'; type: WorkType; level: number }
  | { kind: 'typeWork'; type: WorkType; days: number };

export interface Milestone {
  /** The step's name (what the dweller is doing by then). */
  name?: string;
  points: number;
  goals: AspGoal[];
}

/** Areas of life the aspirations are sorted into (after the Aspiration Index and career education). */
export type AspArea = 'explore' | 'grow' | 'make' | 'together' | 'help' | 'health' | 'nature' | 'work';
export const ASP_AREAS: Record<AspArea, { label: string; icon: string; desc: string }> = {
  explore: { label: '나를 찾아가기', icon: '🧭', desc: '아직 꿈이 없어도 괜찮아요. 해 보면서 찾아요' },
  grow: { label: '배우고 성장하기', icon: '🌱', desc: '궁금한 것을 알아 가며 자라요' },
  make: { label: '만들고 표현하기', icon: '🎨', desc: '손과 마음으로 무언가를 만들어요' },
  together: { label: '함께하기', icon: '🤝', desc: '소중한 사람들과 가까워져요' },
  help: { label: '돕고 나누기', icon: '💛', desc: '누군가에게 힘이 되어 줘요' },
  health: { label: '건강하게 살기', icon: '💪', desc: '몸과 마음을 돌봐요' },
  nature: { label: '자연과 함께하기', icon: '🌿', desc: '자연 속에서 키우고 기다려요' },
  work: { label: '일하고 이루기', icon: '💼', desc: '하고 싶은 일을 해 보고 꾸준히 이어 가요' },
};

/** The trait an area gives while one of its aspirations is chosen, and the one for life when it is done (참고 게임 primary_trait, reward). */
export const AREA_TRAITS: Record<AspArea, { bonus: string; reward: string }> = {
  explore: { bonus: 'aspOpenMind', reward: 'aspKnowSelf' },
  grow: { bonus: 'aspEagerLearner', reward: 'aspSharer' },
  make: { bonus: 'aspMuse', reward: 'aspCraftsman' },
  together: { bonus: 'aspWarmHeart', reward: 'aspLastingBonds' },
  help: { bonus: 'aspHelper', reward: 'aspKindHands' },
  health: { bonus: 'aspVitality', reward: 'aspSteady' },
  nature: { bonus: 'aspNaturalist', reward: 'aspCalmNature' },
  work: { bonus: 'aspDiligent', reward: 'aspFulfilled' },
};

export interface AspirationDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
  area?: AspArea;
  wantSet: WantSet;
  milestones: Milestone[];
  /** A child's aspiration (참고 게임 aspiration_Child_*), and the trait its last milestone gives. */
  child?: boolean;
  reward?: string;
}

const POINTS = [75, 300, 400, 750];
export const COMPLETION_BONUS = 1000;
/** The aspiration's want set is this much likelier (참고 게임 activated priority 6 vs. a base of 2). */
export const ASPIRATION_SET_BOOST = 3;

type Step = [string, AspGoal[]];
const ms = (steps: Step[]): Milestone[] => steps.map(([name, goals], i) => ({ name, points: POINTS[i], goals }));
const c = (counter: string, n: number, label: string): AspGoal => ({ kind: 'count', counter, n, label });
const sk = (skill: SkillKey, level: number): AspGoal => ({ kind: 'skill', skill, level });
const GROWN: AspGoal = { kind: 'grownUp' };

/** "하고 싶은 일 해 보기", one for each kind of work (Holland's six types). */
function workAspiration(type: WorkType, id: string, icon: string, things: string): AspirationDef {
  const t = WORK_TYPES[type];
  return {
    id,
    label: `${t.label} 해 보기`,
    icon,
    desc: `${t.desc}. ${things}`,
    area: 'work',
    wantSet: 'career',
    milestones: ms([
      ['생활에서 해 보기', [c(`type_${type}`, 5, `${t.label}에 가까운 활동`), { kind: 'areasTried', count: 2 }]],
      ['필요한 힘 기르기', [{ kind: 'typeSkill', type, level: 3 }, sk('curiosity', 2)]],
      ['일터에서 해 보기', [{ kind: 'typeWork', type, days: 3 }, { kind: 'typeSkill', type, level: 4 }]],
      ['꾸준히 이어 가기', [{ kind: 'typeWork', type, days: 20 }, { kind: 'typeSkill', type, level: 6 }, sk('persistence', 4)]],
    ]),
  };
}

export const ASPIRATIONS: AspirationDef[] = [
  // ---- 🧭 나를 찾아가기 ----
  {
    id: 'findMyself',
    label: '나를 찾아가는 여행',
    icon: '🧭',
    desc: '아직 꿈이 없어도 괜찮아요. 여러 가지를 해 보면서 내가 좋아하는 걸 찾아요. 마지막에 잘 맞는 꿈을 추천해 줘요',
    area: 'explore',
    wantSet: 'skills',
    milestones: ms([
      ['이것저것 해 보기', [{ kind: 'areasTried', count: 3 }]],
      ['좋아하는 것 찾기', [{ kind: 'anySkill', level: 3 }, sk('curiosity', 2)]],
      ['세상 둘러보기', [{ kind: 'explored', count: 3 }, { kind: 'triedWork' }]],
      ['나에게 맞는 것 알기', [{ kind: 'areasTried', count: 5 }, sk('persistence', 2)]],
    ]),
  },
  // ---- 🌱 배우고 성장하기 ----
  {
    id: 'readWorld',
    label: '책 속 세상 여행하기',
    icon: '📚',
    desc: '책을 읽으며 가 보지 못한 곳과 만나 보지 못한 사람을 만나요',
    area: 'grow',
    wantSet: 'skills',
    milestones: ms([
      ['책과 친해지기', [c('read', 3, '책 읽기'), c('outing_library', 1, '도서관 가기')]],
      ['꾸준히 읽기', [c('read', 10, '책 읽기'), sk('logic', 3), sk('persistence', 1)]],
      ['읽고 생각하기', [c('read', 20, '책 읽기'), sk('writing', 3), sk('curiosity', 3)]],
      ['책 속 세상의 여행자', [c('read', 40, '책 읽기'), sk('logic', 6)]],
    ]),
  },
  {
    id: 'exploreSky',
    label: '밤하늘과 우주 탐구하기',
    icon: '🔭',
    desc: '별을 보고, 현미경을 들여다보고, 언젠가 로켓을 쏘아 올려요',
    area: 'grow',
    wantSet: 'skills',
    milestones: ms([
      ['별 바라보기', [c('stargaze', 3, '망원경으로 별 보기')]],
      ['원리 알아보기', [sk('science', 3), c('research', 3, '현미경으로 연구하기')]],
      ['더 멀리', [sk('rocketScience', 3), c('stargaze', 10, '망원경으로 별 보기'), sk('curiosity', 3)]],
      ['우주로', [sk('science', 6), c('rocketLaunch', 1, '로켓 발사하기')]],
    ]),
  },
  {
    // Was "컴퓨터 고수" (id kept for older saves).
    id: 'computerWhiz',
    label: '나만의 게임·앱 만들어 보기',
    icon: '💻',
    desc: '게임을 즐기는 데서 그치지 않고, 직접 만들어 봐요',
    area: 'grow',
    wantSet: 'skills',
    milestones: ms([
      ['게임 즐기기', [sk('videoGaming', 2), c('game', 3, '컴퓨터 게임 하기')]],
      ['코딩 배우기', [sk('programming', 3), c('study', 10, '프로그래밍 공부')]],
      ['만들어 보기', [sk('programming', 6), sk('videoGaming', 5), sk('persistence', 3)]],
      ['내가 만든 세상', [sk('programming', 8), sk('logic', 5)]],
    ]),
  },
  {
    id: 'newLanguage',
    label: '새로운 언어로 세상과 이야기하기',
    icon: '🌐',
    desc: '다른 나라 말을 배워 더 많은 사람과 이야기해요',
    area: 'grow',
    wantSet: 'skills',
    milestones: ms([
      ['첫걸음', [c('studyLanguage', 3, '외국어 공부하기')]],
      ['말해 보기', [sk('language', 3), c('onlineLanguage', 3, '화상 회화 하기')]],
      ['쓸모 있게', [sk('language', 5), c('translateGig', 2, '번역 일감 해 보기'), sk('persistence', 3)]],
      ['세상과 이야기하기', [sk('language', 8), sk('curiosity', 4)]],
    ]),
  },
  // ---- 🎨 만들고 표현하기 ----
  {
    // Was "탁월한 화가".
    id: 'painter',
    label: '내 그림으로 전시회 열기',
    icon: '🎨',
    desc: '그림을 그리고, 미술관에서 배우고, 언젠가 사람들 앞에 내 그림을 걸어요',
    area: 'make',
    wantSet: 'skills',
    milestones: ms([
      ['그려 보기', [c('paint', 3, '그림 완성하기'), c('outing_museum', 1, '미술관 가기')]],
      ['나만의 그림', [sk('painting', 4), c('paint', 8, '그림 완성하기'), sk('persistence', 2)]],
      ['마음을 담기', [sk('painting', 6), c('paintOutstanding', 2, '뛰어난 그림 완성하기')]],
      ['전시회', [sk('painting', 8), c('paint', 25, '그림 완성하기')]],
    ]),
  },
  {
    // Was "베스트셀러 작가".
    id: 'author',
    label: '한 권의 책 펴내기',
    icon: '✍️',
    desc: '내 이야기를 끝까지 써서 세상에 내놓아요',
    area: 'make',
    wantSet: 'skills',
    milestones: ms([
      ['써 보기', [c('writeBook', 1, '책 펴내기'), c('read', 3, '책 읽기')]],
      ['끝까지 쓰기', [sk('writing', 4), c('writeBook', 3, '책 펴내기'), sk('selfControl', 2)]],
      ['다듬기', [sk('writing', 6), c('writeBook', 6, '책 펴내기')]],
      ['많은 사람이 읽는 책', [sk('writing', 8), c('bestseller', 1, '베스트셀러 쓰기')]],
    ]),
  },
  {
    // Was "음악 천재".
    id: 'musician',
    label: '기타로 사람들 마음 울리기',
    icon: '🎸',
    desc: '좋아하는 노래를 연주하다 보면, 언젠가 듣는 사람의 마음이 움직여요',
    area: 'make',
    wantSet: 'skills',
    milestones: ms([
      ['음악과 친해지기', [c('playGuitar', 5, '기타 연주하기'), c('listen', 4, '음악 듣기')]],
      ['매일 연습하기', [sk('guitar', 4), sk('persistence', 2)]],
      ['내 소리 찾기', [sk('guitar', 6), c('playGuitar', 25, '기타 연주하기')]],
      ['마음을 울리는 연주', [sk('guitar', 9), sk('resilience', 3)]],
    ]),
  },
  {
    // Was "마스터 셰프".
    id: 'masterChef',
    label: '가족에게 맛있는 밥 차려 주기',
    icon: '🍳',
    desc: '내가 만든 음식으로 가족과 친구를 행복하게 해요',
    area: 'make',
    wantSet: 'skills',
    milestones: ms([
      ['요리 시작', [c('cook', 5, '요리하기')]],
      ['함께 먹기', [sk('cooking', 4), c('serveMeal', 3, '여럿이 먹을 식사 차리기')]],
      ['솜씨 늘리기', [sk('cooking', 6), c('cook', 20, '요리하기'), sk('selfControl', 2)]],
      ['우리 집 셰프', [sk('cooking', 8), c('serveMeal', 15, '여럿이 먹을 식사 차리기')]],
    ]),
  },
  {
    // Was "음료 혼합의 달인".
    id: 'mixologist',
    label: '특별한 음료로 대접하기',
    icon: '🍹',
    desc: '과일과 재료를 섞어 손님을 기쁘게 할 음료를 만들어요',
    area: 'make',
    wantSet: 'skills',
    milestones: ms([
      ['섞어 보기', [c('mixDrink', 5, '음료 만들기')]],
      ['맛 내기', [sk('mixology', 4), c('hostParty', 1, '모임 열기')]],
      ['나만의 레시피', [sk('mixology', 7), c('mixDrink', 20, '음료 만들기')]],
      ['최고의 한 잔', [sk('mixology', 10), c('drinkOutstanding', 5, '뛰어난 음료 만들기')]],
    ]),
  },
  {
    // Was "스타 코미디언".
    id: 'comedian',
    label: '사람들을 웃게 하기',
    icon: '😄',
    desc: '내 이야기로 누군가의 하루를 즐겁게 만들어요',
    area: 'make',
    wantSet: 'friend',
    milestones: ms([
      ['웃음 나누기', [c('social_funny', 10, '재미있는 대화'), sk('comedy', 2)]],
      ['연습하기', [c('practiceComedy', 5, '거울 앞 코미디 연습'), sk('comedy', 4)]],
      ['무대에 서듯', [sk('comedy', 6), c('practiceComedy', 15, '거울 앞 코미디 연습'), sk('resilience', 3)]],
      ['모두의 웃음', [sk('comedy', 9), { kind: 'friends', count: 3, stage: 'friend' }]],
    ]),
  },
  {
    // Was "괴팍한 천재".
    id: 'nerdBrain',
    label: '손으로 고치고 만들기',
    icon: '🔨',
    desc: '고장 난 물건을 고치고, 나무로 쓸모 있는 것을 만들어요',
    area: 'make',
    wantSet: 'skills',
    milestones: ms([
      ['고쳐 보기', [c('fixes', 1, '고치거나 업그레이드하기'), sk('handiness', 2)]],
      ['만들어 보기', [c('woodwork', 2, '목공으로 만들기'), sk('handiness', 4)]],
      ['솜씨 쌓기', [c('fixes', 8, '고치거나 업그레이드하기'), sk('handiness', 6), sk('persistence', 3)]],
      ['우리 동네 맥가이버', [sk('handiness', 8), c('woodwork', 10, '목공으로 만들기')]],
    ]),
  },
  // ---- 🤝 함께하기 ----
  {
    // Was "세상의 친구".
    id: 'popularity',
    label: '어디서나 친구 만들기',
    icon: '🤝',
    desc: '처음 만난 사람과도 웃으며 이야기하고, 오래가는 친구를 만들어요',
    area: 'together',
    wantSet: 'friend',
    milestones: ms([
      ['먼저 다가가기', [{ kind: 'met', count: 3 }, { kind: 'friends', count: 1, stage: 'friend' }]],
      ['이야기 나누기', [sk('charisma', 3), c('social_deepTalk', 3, '깊은 대화 나누기')]],
      ['더 가까워지기', [{ kind: 'friends', count: 1, stage: 'goodFriend' }, { kind: 'friends', count: 3, stage: 'friend' }]],
      ['평생 친구', [{ kind: 'flag', flag: 'bff' }, sk('empathy', 4)]],
    ]),
  },
  {
    // Was "소울메이트".
    id: 'soulmate',
    label: '평생의 짝과 함께하기',
    icon: '💞',
    desc: '서로 아끼는 사람을 만나 함께 삶을 꾸려요',
    area: 'together',
    wantSet: 'romance',
    milestones: ms([
      ['마음 열기', [{ kind: 'romance', atLeast: 25 }]],
      ['함께하기', [{ kind: 'flag', flag: 'partner' }, sk('empathy', 2)]],
      ['약속하기', [{ kind: 'flag', flag: 'engaged' }, GROWN]],
      ['오래도록', [{ kind: 'romance', atLeast: 80 }, { kind: 'flag', flag: 'married' }]],
    ]),
  },
  {
    id: 'warmFamily',
    label: '따뜻한 가족 꾸리기',
    icon: '🏡',
    desc: '함께 밥 먹고, 이야기 나누고, 서로 안아 주는 가족을 만들어요',
    area: 'together',
    wantSet: 'friend',
    milestones: ms([
      ['함께 먹기', [c('serveMeal', 3, '여럿이 먹을 식사 차리기'), c('social_deepTalk', 2, '깊은 대화 나누기')]],
      ['마음 표현하기', [c('social_hug', 5, '안아 주기'), c('social_compliment', 5, '칭찬하기')]],
      ['서로 기대기', [{ kind: 'friends', count: 2, stage: 'goodFriend' }, sk('empathy', 4)]],
      ['따뜻한 집', [c('serveMeal', 15, '여럿이 먹을 식사 차리기'), sk('empathy', 6)]],
    ]),
  },
  // ---- 💛 돕고 나누기 ----
  {
    id: 'volunteerHeart',
    label: '봉사로 마음 나누기',
    icon: '🙌',
    desc: '내 시간을 조금 나누어 누군가의 하루를 돕고, 그 기쁨을 알아 가요',
    area: 'help',
    wantSet: 'friend',
    milestones: ms([
      ['처음 나서기', [c('outing_volunteer', 1, '봉사 활동 하기')]],
      ['다시 가기', [c('outing_volunteer', 3, '봉사 활동 하기'), sk('empathy', 3)]],
      ['꾸준히 나누기', [c('outing_volunteer', 6, '봉사 활동 하기'), sk('persistence', 3)]],
      ['나눔이 일상인 사람', [c('outing_volunteer', 12, '봉사 활동 하기'), sk('empathy', 6)]],
    ]),
  },
  {
    id: 'careHands',
    label: '아픈 사람을 돌보는 손 되기',
    icon: '🩹',
    desc: '몸에 대해 배우고 응급처치를 익혀, 다친 사람 곁에서 침착하게 도와요',
    area: 'help',
    wantSet: 'skills',
    milestones: ms([
      ['몸 알아 가기', [c('learnAnatomy', 3, '인체 모형으로 공부하기')]],
      ['응급처치 익히기', [sk('medicine', 3), c('firstAidPractice', 3, '응급처치 연습하기')]],
      ['곁을 지키기', [sk('medicine', 5), sk('empathy', 4), c('outing_volunteer', 2, '봉사 활동 하기')]],
      ['믿음직한 손', [sk('medicine', 8), sk('resilience', 4)]],
    ]),
  },
  {
    id: 'listenFriend',
    label: '친구의 고민 들어 주기',
    icon: '👂',
    desc: '힘든 친구 곁에서 끝까지 들어 주고, 따뜻한 말을 건네요',
    area: 'help',
    wantSet: 'friend',
    milestones: ms([
      ['귀 기울이기', [c('social_deepTalk', 3, '깊은 대화 나누기')]],
      ['마음 알아주기', [sk('empathy', 3), c('social_hug', 5, '안아 주기')]],
      ['곁에 있어 주기', [{ kind: 'friends', count: 1, stage: 'goodFriend' }, c('social_deepTalk', 15, '깊은 대화 나누기')]],
      ['기댈 수 있는 사람', [{ kind: 'flag', flag: 'bff' }, sk('empathy', 6)]],
    ]),
  },
  // ---- 💪 건강하게 살기 ----
  {
    // Was "보디빌더".
    id: 'bodybuilder',
    label: '튼튼한 몸 만들기',
    icon: '💪',
    desc: '꾸준히 운동해서 어제보다 조금 더 강한 몸을 만들어요',
    area: 'health',
    wantSet: 'skills',
    milestones: ms([
      ['움직이기', [c('workout', 10, '운동하기')]],
      ['습관 만들기', [sk('fitness', 4), sk('persistence', 2)]],
      ['한계 넘기', [sk('fitness', 6), c('workout', 30, '운동하기')]],
      ['튼튼한 몸', [sk('fitness', 9), sk('selfControl', 4)]],
    ]),
  },
  {
    id: 'mindBody',
    label: '몸과 마음 돌보기',
    icon: '🧘',
    desc: '잘 자고, 걷고, 쉬면서 힘든 날에도 다시 일어서는 법을 배워요',
    area: 'health',
    wantSet: 'skills',
    milestones: ms([
      ['쉬어 가기', [c('outing_park', 2, '공원 산책하기'), c('sleep', 7, '푹 자기')]],
      ['움직이기', [c('workout', 5, '운동하기'), sk('resilience', 2)]],
      ['균형 잡기', [c('outing_gym', 3, '헬스장 가기'), sk('resilience', 4), sk('selfControl', 3)]],
      ['단단한 마음', [sk('fitness', 5), sk('resilience', 6)]],
    ]),
  },
  // ---- 🌿 자연과 함께하기 ----
  {
    // Was "프리랜서 식물학자".
    id: 'botanist',
    label: '텃밭에서 먹거리 키우기',
    icon: '🌱',
    desc: '씨앗을 심고 물을 주며, 자라기를 기다려 거둬요',
    area: 'nature',
    wantSet: 'skills',
    milestones: ms([
      ['씨앗 심기', [c('plantSeeds', 3, '씨앗 심기'), c('tend', 5, '물 주기·잡초 뽑기')]],
      ['돌보기', [sk('gardening', 4), c('harvest', 5, '수확하기'), sk('persistence', 2)]],
      ['풍성한 텃밭', [sk('gardening', 6), c('harvest', 15, '수확하기')]],
      ['초록 손', [sk('gardening', 9), c('cook', 10, '요리하기')]],
    ]),
  },
  {
    // Was "낚시 전문가".
    id: 'angler',
    label: '고요한 연못에서 낚시하기',
    icon: '🎣',
    desc: '조용히 기다리는 법을 배우며 물고기를 낚아요',
    area: 'nature',
    wantSet: 'skills',
    milestones: ms([
      ['첫 입질', [c('fishCaught', 5, '물고기 낚기')]],
      ['기다리기', [sk('fishing', 3), sk('selfControl', 2)]],
      ['월척', [sk('fishing', 6), c('bigFish', 3, '월척 낚기')]],
      ['연못과 친구', [sk('fishing', 9), c('fishCaught', 40, '물고기 낚기')]],
    ]),
  },
  // ---- 💼 일하고 이루기 ----
  workAspiration('R', 'workR', '🔧', '고치고, 만들고, 기르고, 운전하는 일이 모두 여기에 속해요'),
  workAspiration('I', 'workI', '🔬', '실험하고, 연구하고, 원인을 찾는 일이 모두 여기에 속해요'),
  workAspiration('A', 'workA', '🎨', '그리고, 쓰고, 연주하고, 연기하는 일이 모두 여기에 속해요'),
  workAspiration('S', 'workS', '🤝', '가르치고, 돌보고, 상담하는 일이 모두 여기에 속해요'),
  workAspiration('E', 'workE', '📣', '계획을 세워 사람을 이끌고, 설득하고, 사업을 꾸리는 일이 모두 여기에 속해요'),
  workAspiration('C', 'workC', '🗂️', '돈과 자료와 규칙을 꼼꼼하게 다루는 일이 모두 여기에 속해요'),
  {
    // Was "출세 가도".
    id: 'careerClimber',
    label: '일터에서 실력 인정받기',
    icon: '📈',
    desc: '맡은 일을 꾸준히 잘 해내서, 더 큰 일을 맡게 돼요',
    area: 'work',
    wantSet: 'career',
    milestones: ms([
      ['일 시작하기', [{ kind: 'job' }]],
      ['맡은 일 해내기', [{ kind: 'careerLevel', level: 1 }, sk('persistence', 2)]],
      ['믿고 맡기는 사람', [GROWN, { kind: 'careerLevel', level: 3 }, sk('selfControl', 3)]],
      ['인정받는 실력', [{ kind: 'careerLevel', level: 'top' }]],
    ]),
  },
  {
    // Was "부자 되기".
    id: 'fortune',
    label: '차곡차곡 모아 넉넉하게 살기',
    icon: '💰',
    desc: '버는 만큼 아껴 모아, 걱정 없이 하고 싶은 걸 할 수 있게 돼요',
    area: 'work',
    wantSet: 'career',
    milestones: ms([
      ['모으기 시작', [{ kind: 'money', amount: 3000 }]],
      ['아끼는 습관', [{ kind: 'money', amount: 6000 }, sk('selfControl', 2)]],
      ['든든한 살림', [{ kind: 'money', amount: 12000 }, sk('business', 3)]],
      ['넉넉한 삶', [{ kind: 'money', amount: 25000 }]],
    ]),
  },
  // ---- Children (참고 게임 aspiration_Child_Creativity/Mental/Motor/Social_A1-A3: objectives from the
  // game; where our game has no such thing the objective is ours, marked so). Named by what the
  // child does, as the others.
  {
    id: 'childCreativity',
    label: '마음껏 그리고 상상하기',
    icon: '🖍️',
    desc: '창의력을 키워요. 다 이루면 창의적 재능을 얻어요',
    wantSet: 'skills',
    child: true,
    reward: 'creativelyGifted',
    milestones: ms([
      // 참고 게임 "놀이 테이블 갖기"(장난감 상자 for us) and "영감 받은 상태에서 그림 2점"(inspired play for us).
      ['상상 놀이', [{ kind: 'own', defId: 'toyBox', label: '장난감 상자 갖기' }, c('playToys_inspired', 2, '영감 받은 상태에서 장난감 놀기')]],
      ['꿈꾸기', [sk('creativity', 5), c('playToys', 5, '장난감 가지고 놀기')]],
      // 참고 게임 also asks for every activity-table drawing, which we don't have.
      ['마음껏 표현하기', [c('playPiano', 3, '악기 연주하기'), sk('creativity', 10)]],
    ]),
  },
  {
    id: 'childMental',
    label: '궁금한 건 다 알아보기',
    icon: '🧠',
    desc: '사고력을 키워요. 다 이루면 사고력 재능을 얻어요',
    wantSet: 'skills',
    child: true,
    reward: 'mentallyGifted',
    milestones: ms([
      ['생각하는 놀이', [c('playChess', 3, '체스 시합 하기'), c('read', 3, '책 읽기')]],
      ['꼬마 과학자', [sk('mental', 5), c('homework_focused', 2, '집중한 상태로 숙제 완료하기')]],
      // 참고 게임 also asks for emotion potions, which we don't have.
      ['궁금증 해결사', [{ kind: 'schoolGrade', grade: 4 }, sk('mental', 10)]],
    ]),
  },
  {
    id: 'childMotor',
    label: '신나게 뛰어놀기',
    icon: '🤸',
    desc: '민첩성을 키워요. 다 이루면 신체 재능을 얻어요',
    wantSet: 'skills',
    child: true,
    reward: 'physicallyGifted',
    milestones: ms([
      ['힘차게 놀기', [c('playBars_playful', 1, '장난스러운 상태일 때 정글짐에서 놀기'), sk('motor', 2)]],
      // 참고 게임 typing practice; jungle gym play for us.
      ['날쌔게 움직이기', [sk('motor', 5), c('playBars', 5, '정글짐에서 놀기')]],
      // 구름 사다리 → our jungle gym hang-out.
      ['동네 놀이터 대장', [c('hangBars', 3, '정글짐에 걸터앉기'), sk('motor', 10)]],
    ]),
  },
  {
    id: 'childSocial',
    label: '친구들과 어울리기',
    icon: '🦋',
    desc: '사교력을 키워요. 다 이루면 사교적 재능을 얻어요',
    wantSet: 'friend',
    child: true,
    reward: 'sociallyGifted',
    milestones: ms([
      ['먼저 말 걸기', [{ kind: 'friends', count: 1, stage: 'friend' }, { kind: 'met', count: 3 }]],
      ['단짝 만들기', [sk('childSocial', 5), { kind: 'flag', flag: 'bff' }]],
      ['모두와 어울리기', [{ kind: 'friendsAged', count: 2, age: 'grownUp' }, sk('childSocial', 10)]],
    ]),
  },
];

/** The aspirations a dweller of this age can pick (참고 게임: children have their own). */
export function aspirationsFor(age: string | undefined): AspirationDef[] {
  return ASPIRATIONS.filter((a) => (age === 'child') === !!a.child);
}

export const ASPIRATION_BY_ID: Record<string, AspirationDef> = Object.fromEntries(ASPIRATIONS.map((a) => [a.id, a]));

/**
 * Which area an activity belongs to, for "trying things in different areas" (ours): by the skill it
 * trains, socials and outings by what they are.
 */
export function areaOfActivity(id: string, skill?: SkillKey): AspArea | null {
  if (id === 'outing_volunteer' || ['readStory', 'checkHomework', 'feedToddler', 'firstAidPractice'].includes(id)) return 'help';
  if (id.startsWith('social_') || id === 'hostParty') return 'together';
  if (['outing_park', 'outing_gym', 'sleep'].includes(id)) return 'health';
  if (['outing_library', 'outing_museum'].includes(id)) return 'grow';
  if (!skill) return null;
  if (['fitness'].includes(skill)) return 'health';
  if (['gardening', 'fishing'].includes(skill)) return 'nature';
  if (['empathy', 'medicine'].includes(skill)) return 'help';
  if (['charisma', 'comedy'].includes(skill)) return 'together';
  if (['logic', 'science', 'programming', 'rocketScience', 'language', 'law', 'business', 'videoGaming'].includes(skill)) return 'grow';
  if (['painting', 'writing', 'guitar', 'piano', 'violin', 'singing', 'dancing', 'djMixing', 'cooking', 'gourmet', 'mixology', 'photography', 'handiness'].includes(skill)) return 'make';
  if (['leadership', 'driving'].includes(skill)) return 'work';
  return null;
}

export function goalLabel(g: AspGoal): string {
  switch (g.kind) {
    case 'friends':
      return `${g.stage === 'friend' ? '친구' : '좋은 친구'} ${g.count}명`;
    case 'flag':
      return { partner: '연인 사귀기', engaged: '약혼하기', married: '결혼하기', bff: '베프 1명', enemy: '원수 만들기' }[g.flag];
    case 'romance':
      return `로맨스 ${g.atLeast} 이상`;
    case 'skill':
      return `${SKILL_INFO[g.skill].label} ${g.level}레벨`;
    case 'count':
      return `${g.label} ${g.n}회`;
    case 'money':
      return `§${g.amount.toLocaleString()} 모으기`;
    case 'job':
      return '일 시작하기 (청소년은 아르바이트)';
    case 'careerLevel':
      return g.level === 'top' ? '최고 직급 달성' : `${g.level + 1}단계 직급 달성`;
    case 'own':
      return g.label;
    case 'met':
      return `새로운 사람 ${g.count}명 만나기`;
    case 'friendsAged':
      return `${g.age === 'child' ? '다른 어린이' : '어른'} ${g.count}명과 친구 되기`;
    case 'schoolGrade':
      return `학교에서 "${['F', 'D', 'C', 'B', 'A'][g.grade]}" 등급 달성하기`;
    case 'grownUp':
      return '어른 되기';
    case 'anySkill':
      return `아무 스킬이나 ${g.level}레벨`;
    case 'areasTried':
      return `서로 다른 ${g.count}개 영역의 활동 해 보기`;
    case 'explored':
      return `진로 탐색에서 ${g.count}개 분야 살펴보기`;
    case 'triedWork':
      return '일이나 봉사 활동 한 번 해 보기';
    case 'typeSkill':
      return `${WORK_TYPES[g.type].label}에 필요한 역량 하나 ${g.level}레벨`;
    case 'typeWork':
      return `${WORK_TYPES[g.type].label}의 일터에서 ${g.days}일 일하기`;
  }
}

/** The kind of work a "하고 싶은 일 해 보기" aspiration is about (its goals name it), if it's one. */
export function aspirationWorkType(def: AspirationDef): WorkType | undefined {
  for (const m of def.milestones) for (const g of m.goals) if (g.kind === 'typeSkill' || g.kind === 'typeWork') return g.type;
  return undefined;
}

/** Progress text like "1/10" for goals counted up, else null. */
export function goalProgress(dweller: Dweller, g: AspGoal): string | null {
  if (g.kind === 'count') return `${Math.min(dweller.aspiration?.counters?.[g.counter] ?? 0, g.n)}/${g.n}`;
  if (g.kind === 'areasTried') return `${Math.min(dweller.triedAreas?.length ?? 0, g.count)}/${g.count}`;
  if (g.kind === 'explored') return `${Math.min(dweller.explored?.length ?? 0, g.count)}/${g.count}`;
  if (g.kind === 'typeWork') return `${Math.min(dweller.workDays?.[g.type] ?? 0, g.days)}/${g.days}`;
  return null;
}

/** Skills that count for "any skill" (not the mind's, not toddlers' or children's). */
const plainSkill = (k: SkillKey) => !MIND_SKILLS.has(k) && !TODDLER_SKILLS.has(k) && !CHILD_SKILLS.has(k);

/**
 * Free will's lean towards what the aspiration asks (2026-10-26, at the user's request — measured, an
 * aspiration had made no difference to what a dweller chose): what the current step's unmet goals count
 * (×ASP_GOAL_PULL), and otherwise anything in the aspiration's area of life (×ASP_AREA_PULL). Like
 * 참고 게임, where the aspiration's whims are offered more, this stays under a trait and a like.
 */
export const ASP_GOAL_PULL = 1.4;
export const ASP_AREA_PULL = 1.15;

export interface AspTargets {
  /** Counters the step still needs (interaction ids, `social_<id>`, `outing_<id>`). */
  keys: Set<string>;
  skills: Set<SkillKey>;
  anySkill: boolean;
  area?: AspArea;
}

/** What the dweller's aspiration is after now (worked out once per look at free will). */
export function aspTargets(game: Game, dweller: Dweller): AspTargets | null {
  const st = dweller.aspiration;
  const def = st && ASPIRATION_BY_ID[st.id];
  if (!st || !def || dweller.npc) return null;
  const t: AspTargets = { keys: new Set(), skills: new Set(), anySkill: false, area: def.area };
  for (const g of def.milestones[st.milestone]?.goals ?? []) {
    if (goalMet(game, dweller, g)) continue;
    if (g.kind === 'count') {
      t.keys.add(g.counter);
      const type = g.counter.startsWith('type_') ? (g.counter.slice(5) as WorkType) : null;
      for (const id of (type && TYPE_ACTIVITIES[type]) || []) t.keys.add(id).add(`social_${id}`);
    } else if (g.kind === 'skill') t.skills.add(g.skill);
    else if (g.kind === 'typeSkill') for (const k of WORK_TYPES[g.type].skills) t.skills.add(k);
    else if (g.kind === 'anySkill') t.anySkill = true;
  }
  return t;
}

/** The pull on one activity: `key` is what it counts as (an interaction's countAs or id, `social_<id>`). */
export function aspirationPull(t: AspTargets | null, key: string, skill?: SkillKey): number {
  if (!t) return 1;
  if (t.keys.has(key) || (skill && (t.skills.has(skill) || t.anySkill))) return ASP_GOAL_PULL;
  return t.area && areaOfActivity(key, skill) === t.area ? ASP_AREA_PULL : 1;
}

export function goalMet(game: Game, dweller: Dweller, g: AspGoal): boolean {
  const others = game.acquaintanceIds(dweller).map((id) => game.relationship(dweller.id, id));
  const job = dweller.job ?? dweller.partTime;
  switch (g.kind) {
    case 'friends': {
      const ok = others.filter((r) => (g.stage === 'friend' ? r.stage === 'friend' || r.stage === 'goodFriend' : r.stage === 'goodFriend'));
      return ok.length >= g.count;
    }
    case 'flag':
      return others.some((r) => r.flags.includes(g.flag));
    case 'romance':
      return others.some((r) => r.romance >= g.atLeast);
    case 'skill':
      return Math.floor(dweller.skills[g.skill] ?? 0) >= g.level;
    case 'count':
      return (dweller.aspiration?.counters?.[g.counter] ?? 0) >= g.n;
    case 'money':
      return game.state.money >= g.amount;
    case 'job':
      // A teen's part-time job counts.
      return !!dweller.job || !!dweller.partTime;
    case 'careerLevel': {
      if (!job) return false;
      const top = topLevelOf(job);
      return job.level >= (g.level === 'top' ? top : Math.min(g.level, top));
    }
    case 'own':
      return game.state.objects.some((o) => o.defId === g.defId);
    case 'met':
      return others.filter((r) => r.friend !== 0 || r.romance !== 0).length >= g.count;
    case 'friendsAged': {
      const ids = game.acquaintanceIds(dweller).filter((id) => {
        const r = game.relationship(dweller.id, id);
        if (r.stage !== 'friend' && r.stage !== 'goodFriend') return false;
        const o = game.dweller(id);
        const young = o ? o.age === 'child' || o.age === 'toddler' || o.age === 'teen' : false;
        return g.age === 'child' ? young : !young;
      });
      return ids.length >= g.count;
    }
    case 'schoolGrade':
      return !!dweller.job && dweller.job.careerId === 'school' && dweller.job.level >= g.grade;
    case 'grownUp':
      return !dweller.age || dweller.age === 'elder';
    case 'anySkill':
      return (Object.keys(dweller.skills) as SkillKey[]).some((k) => plainSkill(k) && Math.floor(dweller.skills[k]) >= g.level);
    case 'areasTried':
      return (dweller.triedAreas?.length ?? 0) >= g.count;
    case 'explored':
      return (dweller.explored?.length ?? 0) >= g.count;
    case 'triedWork':
      return (dweller.aspiration?.counters?.triedWork ?? 0) >= 1;
    case 'typeSkill':
      return WORK_TYPES[g.type].skills.some((k) => Math.floor(dweller.skills[k] ?? 0) >= g.level);
    case 'typeWork':
      return (dweller.workDays?.[g.type] ?? 0) >= g.days;
  }
}
