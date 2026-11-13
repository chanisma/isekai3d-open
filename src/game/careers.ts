import { TS4_CAREERS } from './careerData';
import { MOD_CAREERS } from './careerMods';
import { KOREA_CAREERS } from './careersKorea';
import { withProfile } from './careerSkills';
import { EMOTIONS, type EmotionState } from './emotions';
import type { EmotionKey, Job, SkillKey } from './types';

export interface CareerLevel {
  title: string;
  pay: number;
  /** Minute of day; `end` may run past midnight (참고 게임 night shifts). */
  start: number;
  end: number;
  /** Days worked, 0 = Monday (참고 게임 work_schedule days_available); weekdays if left out. */
  days?: number[];
  /** Performance a full shift earns before emotions (참고 게임 base_performance 60 → 5 by level). */
  basePerf: number;
  /** The level's ideal mood, if it differs from the career's (참고 게임 ideal_mood per level). */
  mood?: EmotionKey;
  /** Skills needed to be promoted out of this level (참고 게임 career level aspiration objectives). */
  needs?: Array<[SkillKey, number]>;
}

/** A career's second half: 참고 게임 splits most careers into two branches after the first levels. */
export interface CareerBranch {
  id: string;
  name: string;
  levels: CareerLevel[];
}

export const WEEKDAYS = [0, 1, 2, 3, 4];

export type WorkTone = 'easy' | 'normal' | 'hard';

/** 참고 게임 career tones: Take It Easy earns nothing, Work Hard earns ×1.5 (gains only). */
export const TONES: Record<WorkTone, { label: string; icon: string; multiplier: number }> = {
  // Not chosen any more but the dweller's own doing (workDrive.ts), so coasting still gets a little done (참고 게임: 0).
  easy: { label: '대충 하기', icon: '😌', multiplier: 0.3 },
  normal: { label: '평소대로', icon: '🙂', multiplier: 1 },
  hard: { label: '열심히', icon: '💪', multiplier: 1.5 },
};

/**
 * How much of a shift's performance gain counts (ours, 2026-10-25, at the user's request — dwellers were
 * promoted about every second working day): about half, so the first promotions take four or five
 * days and the later ones longer (참고 게임's base performance already falls with the level). Losses count
 * in full. The same pace applies to a shift played on the work lot (workplace.ts shiftDelta).
 */
export const PERF_PACE = 0.55;

/** 참고 게임 evaluation lines (careers/career_tuning defaults). */
export const PROMOTE_AT = 100;
export const DEMOTE_AT = -80;
export const FIRE_AT = -95;
/** Working less than this share of a shift is a missed day (참고 게임 full_work_day_percent). */
export const FULL_DAY_SHARE = 0.8;
export const MISSED_WORK_PENALTY = 15;
/** The daily-task meter's full bonus (참고 게임 career benefit commodity curve tops out at +20). */
export const DAILY_TASK_BONUS = 20;

/**
 * Performance gained and lost over a full shift in the current emotion (참고 게임 tested_metrics,
 * docs/ref-game/05 §2.3): any good emotion helps (+10/+20 at the first levels, +5/+10 later), the
 * career's ideal emotion counts again, bad emotions cost 4/8/12 by intensity.
 */
export function shiftPerformance(level: number, idealEmotion: EmotionKey, mood: EmotionState, task: number, basePerf: number): { gain: number; loss: number } {
  let gain = basePerf + DAILY_TASK_BONUS * Math.min(1, task);
  let loss = 0;
  const polarity = EMOTIONS[mood.emotion].polarity;
  if (polarity === 'positive') {
    const bonus = (level <= 2 ? [10, 20] : [5, 10])[Math.min(mood.intensity, 1)];
    gain += bonus;
    if (mood.emotion === idealEmotion) gain += bonus;
  } else if (polarity === 'negative') {
    loss = [4, 8, 12][Math.min(mood.intensity, 2)];
  }
  return { gain, loss };
}

export interface Career {
  id: string;
  name: string;
  icon: string;
  /** The skill the daily task practises. */
  skill: SkillKey;
  /** Going to work in this emotion boosts performance (참고 게임 ideal mood of the first level). */
  emotion: EmotionKey;
  levels: CareerLevel[];
  /** Branches that continue after `levels` (참고 게임 Track2/Track3). */
  branches?: CareerBranch[];
  /** Grade school: children are enrolled automatically, earn nothing and can't be expelled. */
  school?: boolean;
  /** A teen's after-school job. */
  partTime?: boolean;
  /** Not in the base game: what it was made after (expansion packs, career mods; careerMods.ts). */
  inspired?: string;
}

const h = (n: number) => n * 60;

/**
 * Careers taken out of the game because they aren't real jobs (the user's call): 참고 게임's criminal
 * and the ghost hunter. Dwellers who had one are let go when a save loads.
 */
export const RETIRED_CAREERS = new Set(['criminal', 'ghostHunter']);

/** New titles for 참고 게임 rungs that read as fantasy, keeping their pay, hours and skills (ours). */
type Needs = Array<Array<[SkillKey, number]> | undefined>;
const REALISTIC: Record<string, { name?: string; icon?: string; titles?: string[]; needs?: Needs; branches?: Array<{ name?: string; titles: string[]; needs?: Needs; hours?: [number, number] }> }> = {
  // Space ranger and space smuggler become a space scientist and a mission commander.
  astronaut: {
    titles: ['인턴 직원', '우주선 정비 보조', '로켓 기술자', '관제실 책임자', '저궤도 전문가', '우주비행사 후보생', '우주비행사'],
    branches: [
      { name: '우주 과학자', titles: ['궤도 연구 과학자', '우주 정거장 수석 과학자', '행성 탐사 책임 과학자'] },
      { name: '임무 지휘관', titles: ['우주 비행 교관', '임무 지휘관', '우주국 국장'] },
    ],
  },
  // A spy film's agent becomes an intelligence officer; the villain track becomes cyber security.
  secretAgent: {
    name: '정보 요원',
    icon: '🗂️',
    titles: ['정보국 사무직원', '정보 분석가', '정보 관리관', '현장 정보관', '선임 정보관', '수석 정보관', '정보 팀장'],
    branches: [
      { name: '해외 정보관', titles: ['해외 주재 정보관', '해외 정보 지부장', '해외 정보 총괄관'] },
      {
        name: '사이버 보안 전문가',
        titles: ['사이버 위협 분석관', '사이버 보안 팀장', '사이버 안보 센터장', '국가 사이버 안보 책임자'],
        needs: [[['logic', 8], ['programming', 2]], [['logic', 10], ['programming', 4]], [['logic', 10], ['programming', 6]], undefined],
      },
    ],
  },
  // A tech career climbs by writing software, not by playing games: the pro gamer track becomes a
  // software engineer's, the "entrepreneur genius" a startup founder's, and video games give way to logic.
  tech: {
    titles: ['기술 지원 상담원', 'QA 테스터', '주니어 개발자', '개발자', '선임 개발자', '개발 팀장'],
    needs: [undefined, [['programming', 2]], [['programming', 3], ['logic', 2]], [['programming', 4], ['logic', 3]], [['programming', 5], ['logic', 4]], [['programming', 6], ['logic', 5]]],
    branches: [
      {
        name: '소프트웨어 엔지니어',
        // Office hours, where the pro gamer played into the night.
        hours: [10, 18],
        titles: ['시니어 소프트웨어 엔지니어', '스태프 엔지니어', '수석 아키텍트', '최고 기술 책임자(CTO)'],
        needs: [[['programming', 7], ['logic', 6]], [['programming', 8], ['logic', 7]], [['programming', 9], ['logic', 8]], undefined],
      },
      { name: '스타트업 창업가', titles: ['IT 컨설턴트', '스타트업 공동 창업자', '스타트업 대표', 'IT 기업 대표'] },
    ],
  },
  // The rest keep 참고 게임's ladders and skills; only the titles that no real workplace uses change.
  athletic: {
    titles: ['구단 연습생', '육성 선수', '2군 선수', '1군 후보 선수'],
    branches: [
      { titles: ['1군 신인 선수', '주전 선수', '올스타 선수', '국가대표 선수', '리그 MVP', '명예의 전당 헌액 선수'] },
      // One way up, trainer to athlete (2026-10-26, at the user's request: trainer and bodybuilder took turns).
      { name: '피트니스', titles: ['개인 트레이너', '스타 트레이너', '프로 보디빌더', '전국 대회 입상자', '국가대표 보디빌더', '세계 대회 챔피언'] },
    ],
  },
  sales: {
    titles: ['우편물 담당', '영업 보조', '영업 사원', '영업 대리', '지역 영업 과장', '영업 부장'],
    branches: [
      { titles: ['영업 이사', '부사장', '대표이사', '그룹 회장'] },
      { titles: ['투자 심사역', '헤지펀드 매니저', '사모펀드 파트너', '벤처캐피털 대표'] },
    ],
  },
  culinary: {
    titles: ['설거지 담당', '주방 보조', '출장 요리 보조', '바 보조', '라인 쿡'],
    branches: [
      // A 파티시에 is another trade, not a rung between 팀장 and 부주방장 (2026-10-26).
      { titles: ['출장 요리 팀장', '스테이션 셰프', '부주방장', '주방장', '총괄 셰프'] },
      { name: '바텐더', titles: ['바텐더', '헤드 바텐더', '바 매니저', '음료 총괄 디렉터', '칵테일 바 오너'] },
    ],
  },
  entertainer: {
    titles: ['아마추어 공연자', '오디션 지망생', '무명 공연자', '오프닝 무대 공연자'],
    branches: [
      { titles: ['광고 음악 작곡가', '세션 연주자', '전문 피아니스트', '교향악단 단원', '교향악단 수석 연주자', '콘서트 피아니스트'] },
      { titles: ['개그 작가', '신인 코미디언', '인기 코미디언', '행사 전문 코미디언', '스탠드업 코미디언', '단독 투어 코미디언'] },
    ],
  },
  painter: {
    titles: ['화실 조수', '미술학원 강사', '무명 화가', '수채화가', '신진 작가', '전업 작가'],
    branches: [
      { name: '전업 화가', titles: ['갤러리 전속 작가', '개인전 작가', '중견 화가', '미술관 초대 작가'] },
      { name: '미술 기획자', titles: ['미술 비평가', '미술품 감정사', '큐레이터', '갤러리 대표'] },
    ],
  },
  writer: {
    branches: [
      { titles: ['단편 소설가', '장편 소설가', '인기 작가', '베스트셀러 작가', '문학상 수상 작가'] },
      { titles: ['사회부 기자', '탐사 보도 기자', '데스크 (차장)', '편집국장', '논설주간'] },
    ],
  },
  styleInfluencer: {
    titles: ['빈티지 의류 리뷰어', '중고 의류 위탁 판매원', '패션 에디터 보조', '스타일링 칼럼니스트', '패션 칼럼니스트'],
    branches: [
      { name: '패션 인플루언서', titles: ['패션 블로거', '패션 인플루언서', '브랜드 협업 인플루언서', '패션 매거진 커버 모델', '패션 아이콘'] },
      { titles: ['개인 스타일리스트', '방송 스타일리스트', '셀럽 전담 스타일리스트', '패션쇼 스타일링 디렉터', '스타일링 에이전시 대표'] },
    ],
  },
  // Part-time jobs: no two rungs share a name, and no teenager drives an excavator.
  babysitter: { titles: ['초보 베이비시터', '베이비시터', '어린이집 보조 교사'] },
  manualLabor: { titles: ['잔디 깎기 알바', '조경 보조', '공사 현장 보조'] },
};

function realistic(c: Career): Career {
  const r = REALISTIC[c.id];
  if (!r) return c;
  const retitle = (levels: CareerLevel[], titles?: string[], needs?: Needs, hours?: [number, number]) =>
    levels.map((l, i) => ({ ...l, title: titles?.[i] ?? l.title, ...(needs ? { needs: needs[i] } : {}), ...(hours ? { start: h(hours[0]), end: h(hours[1]), days: [0, 1, 2, 3, 4] } : {}) }));
  return {
    ...c,
    name: r.name ?? c.name,
    icon: r.icon ?? c.icon,
    levels: retitle(c.levels, r.titles, r.needs),
    branches: c.branches?.map((b, i) => ({ ...b, name: r.branches?.[i]?.name ?? b.name, levels: retitle(b.levels, r.branches?.[i]?.titles, r.branches?.[i]?.needs, r.branches?.[i]?.hours) })),
  };
}

export const CAREERS: Career[] = [
  // 참고 게임 GradeSchool_Track: grades F to A, weekdays from 8 for 7 hours, base performance 25, ideal
  // mood Focused, homework feeding performance. Children start at C.
  {
    id: 'school',
    name: '초등학교',
    icon: '🏫',
    skill: 'logic',
    emotion: 'focused',
    school: true,
    levels: ['F', 'D', 'C', 'B', 'A'].map((g) => ({ title: `${g} 등급 초등학생`, pay: 0, start: h(8), end: h(15), basePerf: 25 })),
  },
  // 참고 게임 HighSchool_Track: the same grades, weekdays from 8 for 7 hours, base performance 10.
  {
    id: 'highSchool',
    name: '고등학교',
    icon: '🎓',
    skill: 'logic',
    emotion: 'focused',
    school: true,
    levels: ['F', 'D', 'C', 'B', 'A'].map((g) => ({ title: `${g} 등급 고등학생`, pay: 0, start: h(8), end: h(15), basePerf: 10 })),
  },
  // Every job's ladder asks for the competencies of its field (careerSkills.ts).
  ...[...TS4_CAREERS.filter((c) => !RETIRED_CAREERS.has(c.id)).map(realistic), ...MOD_CAREERS, ...KOREA_CAREERS].map(withProfile),
];

export const CAREER_BY_ID: Record<string, Career> = Object.fromEntries(CAREERS.map((c) => [c.id, c]));

/** Fields the want ads sort careers into (ours). */
export const CAREER_FIELDS: Array<{ id: string; label: string; icon: string; careers: string[] }> = [
  { id: 'medical', label: '의료·보건', icon: '🩺', careers: ['doctor', 'nurse', 'dentist', 'pharmacist', 'vet', 'therapist', 'physicalTherapist', 'occupationalTherapist', 'labTechnician', 'radiographer', 'paramedic', 'koreanMedicine', 'dietitian', 'optician'] },
  { id: 'public', label: '공공·안전', icon: '🏛️', careers: ['police', 'firefighter', 'military', 'politician', 'diplomat', 'secretAgent', 'lawyer', 'civilServant', 'mailCarrier', 'correctionsOfficer', 'coastGuard', 'customsOfficer', 'sanitationWorker'] },
  { id: 'welfare', label: '사회복지·돌봄', icon: '🤝', careers: ['socialWorker', 'careWorker', 'childcareTeacher', 'disabilitySupport', 'youthCounselor'] },
  { id: 'science', label: '교육·연구', icon: '🔬', careers: ['teacher', 'scientist', 'astronaut', 'engineer', 'conservationist', 'architect', 'academyTutor', 'kindergartenTeacher', 'musicTeacher', 'drivingInstructor', 'yogaInstructor', 'meteorologist', 'semiconductor', 'roboticist', 'librarian'] },
  { id: 'business', label: '경영·금융', icon: '💼', careers: ['sales', 'banker', 'accountant', 'salaryperson', 'realEstate', 'insuranceAgent', 'callCenter'] },
  { id: 'it', label: 'IT·디자인', icon: '💻', careers: ['tech', 'graphicDesigner', 'interiorDecorator', 'socialMedia', 'streamer', 'gameDeveloper', 'dataCenter', 'aiResearcher', 'selfDriving'] },
  { id: 'arts', label: '예술·창작', icon: '🎨', careers: ['painter', 'writer', 'webtoonArtist', 'photographer', 'fashionDesigner', 'styleInfluencer', 'critic', 'filmmaker', 'interpreter'] },
  { id: 'media', label: '방송·공연', icon: '🎤', careers: ['entertainer', 'actor', 'singer', 'dancer', 'dj', 'tvHost', 'model', 'announcer', 'voiceActor'] },
  { id: 'service', label: '서비스·생활', icon: '🛎️', careers: ['culinary', 'baker', 'hairStylist', 'tattooArtist', 'hotelier', 'mortician', 'toymaker', 'convenienceManager', 'nailArtist', 'esthetician', 'makeupArtist', 'bodyguard', 'securityGuard', 'tourGuide', 'weddingPlanner'] },
  { id: 'transport', label: '운송·물류', icon: '🚚', careers: ['pilot', 'courier', 'busDriver', 'taxiDriver', 'subwayDriver', 'seafarer', 'flightAttendant'] },
  { id: 'trades', label: '설치·정비·건설', icon: '🔧', careers: ['mechanic', 'electrician', 'plumber', 'carpenter', 'welder', 'wallpaperer', 'elevatorTech', 'greenEnergy'] },
  { id: 'sports', label: '스포츠', icon: '🏅', careers: ['athletic', 'proGamer', 'extremeAthlete'] },
  { id: 'agri', label: '농림어업', icon: '🌾', careers: ['farmer', 'smartFarmer', 'gardener', 'fisher', 'fishFarmer', 'haenyeo', 'forester'] },
];

/** A career's field (teen part-time jobs and anything unlisted fall under '기타'). */
export function fieldOf(careerId: string) {
  return CAREER_FIELDS.find((f) => f.careers.includes(careerId));
}

/** The levels of a career as one ladder: the shared first levels, then the chosen branch. */
export function levelsOf(career: Career, branch?: number): CareerLevel[] {
  const b = branch === undefined ? undefined : career.branches?.[branch];
  return b ? [...career.levels, ...b.levels] : career.levels;
}

/** The level a job is at. */
export function levelOf(job: Job): CareerLevel {
  const career = CAREER_BY_ID[job.careerId];
  const ladder = levelsOf(career, job.branch);
  return ladder[Math.min(job.level, ladder.length - 1)];
}

/** The next rung up: in the branch, or (before one is picked) the first rung the dweller would branch into. */
export function nextLevelOf(job: Job, skills?: Record<SkillKey, number>): CareerLevel | undefined {
  const career = CAREER_BY_ID[job.careerId];
  const ladder = levelsOf(career, job.branch);
  if (job.level + 1 < ladder.length) return ladder[job.level + 1];
  if (job.branch === undefined && career.branches?.length && job.level + 1 === career.levels.length) {
    return career.branches[job.branchPick ?? (skills ? chooseBranch(career, skills) : 0)].levels[0];
  }
  return undefined;
}

/** The top rung of a job's career, in its branch (or the longest branch before choosing). */
export function topLevelOf(job: Job): number {
  const career = CAREER_BY_ID[job.careerId];
  if (job.branch !== undefined || !career.branches?.length) return levelsOf(career, job.branch).length - 1;
  return career.levels.length + Math.max(...career.branches.map((b) => b.levels.length)) - 1;
}

/** Whether the dweller has the skills a level asks for before promotion. */
export function meetsNeeds(skills: Record<SkillKey, number>, level: CareerLevel): boolean {
  return (level.needs ?? []).every(([k, v]) => Math.floor(skills[k]) >= v);
}

/**
 * The days a level works, as shown (2026-10-26, at the user's request: the job tab said 월–금 for
 * every job, the busking singer's 금–일 too): a run of days as 금–일, else the days one by one, 매일.
 */
export function daysText(days: number[] = WEEKDAYS): string {
  const d = [...new Set(days)].filter((x) => x >= 0 && x < 7).sort((a, b) => a - b);
  if (d.length === 7) return '매일';
  const name = (x: number) => '월화수목금토일'[x];
  const run = d.length >= 3 && d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  return run ? `${name(d[0])}–${name(d[d.length - 1])}` : d.map(name).join('·');
}

/** The skills a level asks for, as shown to the player. */
export function needsText(level: CareerLevel, label: (k: SkillKey) => string): string {
  return (level.needs ?? []).map(([k, v]) => `${label(k)} ${v}레벨`).join(', ');
}

/**
 * Which branch a dweller heads into: the one whose first rung their skills suit best (참고 게임 lets the
 * player choose; free will needs an answer).
 */
export function chooseBranch(career: Career, skills: Record<SkillKey, number>): number {
  const fit = (b: CareerBranch) => (b.levels[0].needs ?? []).reduce((s, [k, v]) => s + Math.min(1, skills[k] / v), 0);
  let best = 0;
  (career.branches ?? []).forEach((b, i) => {
    if (fit(b) > fit(career.branches![best])) best = i;
  });
  return best;
}
