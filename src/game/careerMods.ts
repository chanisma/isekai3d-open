import type { Career, CareerLevel } from './careers';
import type { EmotionKey, SkillKey } from './types';

/**
 * Careers the base game doesn't have, made after 참고 게임's expansion-pack careers (Get to Work,
 * City Living, Get Famous, Seasons, Discover University, Island Living, StrangerVille, Eco
 * Lifestyle, Snowy Escape, Dream Home Decorator, Cats & Dogs, Life & Death) and the jobs career
 * mods commonly add (nurse, police, firefighter, teacher, architect, fashion, photography, salon,
 * pilot). The installed game has none of this tuning, so the ladders, pay, hours and skills are ours, built the way the
 * 참고 게임 careers are: shared first levels, then two branches, base performance 60 down to 6, pay of
 * the same order (§70–120 at the bottom). Unlike 참고 게임 the length follows the job: ten levels with
 * real ranks where the job has a long formal ladder (doctor, police, banker…), eight for most, six
 * or seven for trades and stage work, which top out sooner and lower (§950–1300).
 */

/** A level: title, pay a shift, from and to (hours; past 24 runs into the next day), days (0 = Monday), ideal mood, skills to leave it. */
type Row = [string, number, number, number, number[], EmotionKey, Array<[SkillKey, number]>?];

const WK = [0, 1, 2, 3, 4];
/** 참고 게임 base_performance by level, 60 at the bottom to 6 at the top. */
const BASE = [60, 50, 40, 30, 20, 15, 10, 8, 7, 6];

/** Base performance for rung i of an n-rung ladder: 참고 게임's ten steps, skipped through evenly on a shorter one. */
function perfAt(i: number, n: number) {
  // A ladder longer than 참고 게임's ten: one step more, still 60 down to 6.
  if (n === BASE.length + 1) return [60, 50, 40, 30, 25, 20, 15, 10, 8, 7, 6][i];
  return BASE[n >= BASE.length ? Math.min(i, BASE.length - 1) : Math.round((i * (BASE.length - 1)) / (n - 1))];
}

function rungs(rows: Row[], offset: number, n: number): CareerLevel[] {
  return rows.map(([title, pay, from, to, days, mood, needs], i) => ({
    title,
    pay,
    start: Math.round(from * 60),
    end: Math.round(to * 60),
    days,
    basePerf: perfAt(offset + i, n),
    mood,
    ...(needs ? { needs } : {}),
  }));
}

function career(id: string, name: string, icon: string, skill: SkillKey, emotion: EmotionKey, inspired: string, shared: Row[], branches: Array<[string, string, Row[]]>): Career {
  return {
    id,
    name,
    icon,
    skill,
    emotion,
    inspired,
    levels: rungs(shared, 0, shared.length + Math.max(...branches.map(([, , rows]) => rows.length))),
    branches: branches.map(([bid, bname, rows]) => ({ id: bid, name: bname, levels: rungs(rows, shared.length, shared.length + rows.length) })),
  };
}

export const MOD_CAREERS: Career[] = [
  // The specialty is chosen at residency, not after it; 과장 and 병원장 are posts given to professors, and a 병원장 comes from any department (2026-11-02, at the user's request).
  career('doctor', '의사', '🩺', 'logic', 'focused', 'Get to Work 의사 · 의료 직업 모드', [
    ['의대 실습생', 98, 9, 17, WK, 'focused'],
    ['인턴', 140, 8, 16, WK, 'focused', [['logic', 2]]],
  ], [
    ['Doctor_Surgeon', '외과', [
      ['외과 레지던트', 205, 7, 17, [0, 1, 2, 3, 5], 'focused', [['logic', 3], ['handiness', 2]]],
      ['외과 수석 레지던트', 290, 7, 17, WK, 'focused', [['logic', 4], ['handiness', 3]]],
      ['외과 전문의', 390, 8, 17, WK, 'confident', [['logic', 5], ['handiness', 4]]],
      ['외과 전임의', 520, 7, 16, [0, 1, 2, 3], 'focused', [['logic', 6], ['handiness', 4]]],
      ['외과 조교수', 690, 7, 16, [0, 1, 2, 3], 'focused', [['logic', 7], ['handiness', 5]]],
      ['외과 부교수', 900, 7, 15, [0, 1, 2, 3], 'focused', [['logic', 8], ['handiness', 6]]],
      ['외과 교수', 1040, 7, 15, [0, 1, 2, 3], 'focused', [['logic', 8], ['handiness', 7]]],
      ['외과 과장', 1180, 8, 15, [0, 1, 2, 3], 'confident', [['logic', 9], ['charisma', 6]]],
      ['병원장', 1520, 9, 15, [0, 1, 2, 3], 'confident'],
    ]],
    ['Doctor_Diagnostician', '내과', [
      ['내과 레지던트', 205, 7, 17, [0, 1, 2, 3, 5], 'focused', [['logic', 3], ['charisma', 2], ['handiness', 1]]],
      ['내과 수석 레지던트', 290, 9, 17, WK, 'focused', [['logic', 4], ['charisma', 3], ['handiness', 2]]],
      ['내과 전문의', 390, 9, 17, WK, 'confident', [['logic', 5], ['charisma', 4], ['handiness', 2]]],
      ['내과 전임의', 500, 9, 17, WK, 'focused', [['logic', 6], ['charisma', 5], ['handiness', 3]]],
      ['내과 조교수', 660, 9, 17, WK, 'focused', [['logic', 7], ['charisma', 6], ['handiness', 3]]],
      ['내과 부교수', 860, 9, 16, WK, 'focused', [['logic', 8], ['charisma', 7], ['handiness', 3]]],
      ['내과 교수', 990, 9, 16, WK, 'focused', [['logic', 8], ['charisma', 7], ['handiness', 3]]],
      ['내과 과장', 1120, 9, 16, [0, 1, 2, 3], 'confident', [['logic', 9], ['charisma', 8]]],
      ['병원장', 1450, 10, 16, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('nurse', '간호사', '🩹', 'charisma', 'happy', '간호사 직업 모드 (Delimaci 등)', [
    ['간호학과 실습생', 82, 7, 15, WK, 'happy'],
    ['신규 간호사', 115, 7, 15, WK, 'focused', [['charisma', 2]]],
    ['일반 간호사', 210, 19, 31, [0, 2, 4], 'focused', [['charisma', 3], ['logic', 2]]],
    ['경력 간호사', 280, 7, 19, [1, 3, 5], 'happy', [['charisma', 4], ['logic', 3]]],
  ], [
    ['Nurse_Manager', '간호 관리자', [
      ['책임 간호사', 350, 7, 17, WK, 'happy', [['charisma', 5], ['logic', 4]]],
      ['수간호사', 450, 7, 16, WK, 'confident', [['charisma', 6], ['logic', 5]]],
      ['간호 팀장', 580, 8, 17, WK, 'confident', [['charisma', 7], ['logic', 6]]],
      ['간호부장', 760, 8, 16, WK, 'confident', [['charisma', 8], ['writing', 4]]],
      ['간호이사', 980, 9, 16, WK, 'confident', [['charisma', 9], ['writing', 5]]],
      ['간호부원장', 1260, 9, 16, [0, 1, 2, 3], 'confident'],
    ]],
    // Ranks, the ward in brackets (2026-10-26, at the user's request: 응급실 → 중환자실 → 수술실 were posts, not ranks).
    ['Nurse_Specialist', '전문 간호사', [
      ['임상 간호사 (응급실)', 360, 19, 31, [0, 2, 4], 'focused', [['logic', 5], ['fitness', 3]]],
      ['숙련 간호사 (중환자실)', 470, 19, 31, [1, 3, 5], 'focused', [['logic', 6], ['fitness', 4]]],
      ['전담 간호사 (수술실)', 610, 7, 19, [0, 2, 4], 'focused', [['logic', 7], ['handiness', 3]]],
      ['전문 간호사 수련생', 790, 7, 17, WK, 'focused', [['logic', 8], ['handiness', 4]]],
      ['전문 간호사', 1010, 8, 17, [0, 1, 2, 3], 'confident', [['logic', 9], ['charisma', 6]]],
      ['마취 전문 간호사', 1320, 8, 16, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('police', '경찰관', '👮', 'fitness', 'confident', 'Get to Work 탐정 · 경찰 직업 모드', [
    ['중앙경찰학교 교육생', 90, 8, 16, WK, 'energized'],
    ['순경', 132, 8, 16, WK, 'confident', [['fitness', 2]]],
    ['경장', 195, 14, 22, [1, 2, 3, 4, 5], 'confident', [['fitness', 3], ['logic', 2]]],
    ['경사', 265, 8, 17, [0, 1, 3, 4, 5], 'confident', [['fitness', 4], ['charisma', 2]]],
  ], [
    ['Police_Detective', '형사', [
      ['형사 (경위)', 350, 9, 17, WK, 'focused', [['logic', 4], ['charisma', 3]]],
      ['강력팀장 (경감)', 470, 10, 19, WK, 'focused', [['logic', 5], ['charisma', 4]]],
      ['수사과장 (경정)', 620, 10, 19, WK, 'focused', [['logic', 6], ['charisma', 5]]],
      ['경찰서장 (총경)', 810, 9, 17, WK, 'confident', [['logic', 7], ['charisma', 6]]],
      ['수사부장 (경무관)', 1040, 9, 17, WK, 'confident', [['logic', 8], ['charisma', 7]]],
      ['시도경찰청장 (치안감)', 1350, 9, 16, [0, 1, 2, 3], 'confident'],
    ]],
    ['Police_SWAT', '특공대', [
      ['기동대원', 360, 8, 18, [0, 2, 4, 5], 'energized', [['fitness', 5]]],
      ['경찰특공대원', 480, 8, 18, [0, 2, 4, 5], 'energized', [['fitness', 6], ['handiness', 3]]],
      ['특공대 저격요원', 640, 8, 17, [0, 2, 4, 5], 'focused', [['fitness', 7], ['logic', 5]]],
      ['특공대 팀장', 830, 8, 17, [0, 2, 4, 5], 'confident', [['fitness', 8], ['charisma', 5]]],
      ['특공대 제대장', 1060, 8, 16, [0, 2, 4], 'confident', [['fitness', 9], ['charisma', 6]]],
      ['경찰특공대장', 1380, 9, 16, [0, 2, 4], 'confident'],
    ]],
  ]),
  career('firefighter', '소방관', '🚒', 'fitness', 'energized', '소방관 직업 모드', [
    ['소방학교 교육생', 85, 8, 16, WK, 'energized'],
    ['소방사 시보', 135, 8, 20, [0, 2, 4], 'energized', [['fitness', 2]]],
    ['소방사', 205, 20, 32, [1, 3, 5], 'energized', [['fitness', 3], ['handiness', 2]]],
    ['소방교', 275, 8, 20, [0, 3, 5], 'confident', [['fitness', 4], ['handiness', 3]]],
  ], [
    ['Firefighter_Suppression', '화재 진압대', [
      ['진압대원 (소방장)', 365, 8, 20, [0, 2, 4], 'energized', [['fitness', 5], ['handiness', 4]]],
      ['진압팀장 (소방위)', 480, 8, 20, [1, 3, 5], 'energized', [['fitness', 6], ['handiness', 5]]],
      ['119안전센터장 (소방경)', 630, 8, 20, [0, 3, 5], 'confident', [['fitness', 7], ['charisma', 4]]],
      ['소방서 과장 (소방령)', 820, 8, 18, [0, 2, 4], 'confident', [['fitness', 8], ['charisma', 5]]],
      ['소방서장 (소방정)', 1050, 9, 17, WK, 'confident', [['charisma', 7], ['logic', 5]]],
      ['소방본부장 (소방준감)', 1360, 9, 16, [0, 1, 2, 3], 'confident'],
    ]],
    ['Firefighter_Rescue', '구조대', [
      ['구조대원', 370, 8, 20, [0, 2, 4], 'energized', [['fitness', 5], ['logic', 3]]],
      ['산악 구조대원', 490, 8, 20, [1, 3, 5], 'energized', [['fitness', 6], ['logic', 4]]],
      ['수난 구조대원', 640, 8, 20, [0, 3, 5], 'energized', [['fitness', 7], ['logic', 5]]],
      ['항공 구조대원', 830, 8, 20, [1, 3, 5], 'focused', [['fitness', 8], ['logic', 6]]],
      ['구조대장', 1060, 8, 18, [0, 2, 4], 'confident', [['fitness', 9], ['charisma', 5]]],
      ['특수구조단장', 1380, 9, 17, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('teacher', '교사', '🍎', 'charisma', 'happy', '교사 직업 모드 · Discover University 교육', [
    ['교생 실습생', 80, 7.5, 15.5, WK, 'happy'],
    ['기간제 교사', 122, 7.5, 15.5, WK, 'happy', [['charisma', 2]]],
    ['2급 정교사', 182, 7.5, 16, WK, 'happy', [['charisma', 3], ['logic', 2]]],
    ['1급 정교사', 252, 7.5, 16.5, WK, 'focused', [['charisma', 4], ['logic', 3]]],
    ['부장 교사', 340, 7.5, 16.5, WK, 'confident', [['charisma', 5], ['writing', 3]]],
  ], [
    // The paths past 부장 교사 are really three, of different lengths; a professor's isn't one of them (2026-11-02, at the user's request).
    ['Teacher_School', '학교 관리직', [
      ['교감', 790, 8, 17, WK, 'confident', [['charisma', 8], ['writing', 6]]],
      ['교장', 1010, 8, 17, WK, 'confident'],
    ]],
    ['Teacher_Administration', '교육 전문직', [
      ['장학사', 610, 9, 18, WK, 'confident', [['charisma', 6], ['writing', 4]]],
      ['장학관', 810, 9, 18, WK, 'confident', [['charisma', 8], ['writing', 6]]],
      ['교육장', 1100, 9, 18, WK, 'confident'],
    ]],
    ['Teacher_Master', '수석교사', [
      ['수석교사', 470, 7.5, 16.5, WK, 'inspired'],
    ]],
  ]),
  career('lawyer', '변호사', '⚖️', 'charisma', 'confident', 'Discover University 법률 · 변호사 직업 모드', [
    ['법률 사무원', 110, 9, 17, WK, 'focused'],
    ['로스쿨 실무 수습생', 152, 9, 17, WK, 'focused', [['logic', 2]]],
    ['수습 변호사', 225, 9, 18, WK, 'confident', [['logic', 3], ['charisma', 2]]],
    ['소속 변호사', 315, 9, 18, WK, 'confident', [['logic', 4], ['charisma', 3]]],
    ['선임 변호사', 425, 9, 18, WK, 'confident', [['charisma', 5], ['writing', 3]]],
  ], [
    ['Lawyer_Judge', '판사', [
      // A 재판연구원 is a new lawyer's first post, not one after 선임 변호사 (2026-10-26, at the user's request).
      ['경력 법관 (신임 판사)', 560, 9, 17, WK, 'focused', [['logic', 6], ['writing', 4]]],
      ['지방법원 판사', 730, 9, 17, WK, 'focused', [['logic', 7], ['writing', 5]]],
      ['부장판사', 930, 9, 16, WK, 'confident', [['logic', 8], ['writing', 6]]],
      ['고등법원 부장판사', 1180, 9, 16, [0, 1, 2, 3], 'confident', [['logic', 9], ['writing', 7]]],
      ['법원장', 1500, 10, 16, [0, 1, 2, 3], 'confident'],
    ]],
    ['Lawyer_Partner', '로펌 파트너', [
      ['파트너 변호사', 600, 8, 19, WK, 'confident', [['charisma', 6], ['logic', 5]]],
      ['시니어 파트너', 790, 8, 19, WK, 'confident', [['charisma', 7], ['logic', 6]]],
      ['그룹장 파트너', 1000, 8, 18, [0, 1, 2, 3, 4, 5], 'confident', [['charisma', 8], ['logic', 7]]],
      ['경영 파트너', 1290, 9, 18, WK, 'confident', [['charisma', 9], ['writing', 6]]],
      ['로펌 대표 변호사', 1680, 9, 17, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('architect', '건축가', '📐', 'logic', 'inspired', 'Eco Lifestyle 토목 설계사 · 건축가 직업 모드', [
    ['설계 보조', 95, 9, 17, WK, 'focused'],
    ['설계 사원', 140, 9, 17, WK, 'focused', [['logic', 2]]],
    ['설계 대리', 208, 9, 18, WK, 'inspired', [['logic', 3], ['painting', 2]]],
    ['건축사', 298, 9, 18, WK, 'inspired', [['logic', 4], ['painting', 3]]],
    ['프로젝트 건축사', 410, 9, 18, WK, 'inspired', [['logic', 5], ['handiness', 3]]],
  ], [
    ['Architect_Design', '디자인 건축가', [
      ['설계 실장', 545, 10, 19, WK, 'inspired', [['painting', 5], ['logic', 6]]],
      ['수석 건축가', 710, 10, 19, WK, 'inspired', [['painting', 6], ['logic', 7]]],
      ['디자인 디렉터', 910, 10, 18, WK, 'inspired', [['painting', 7], ['charisma', 5]]],
      ['파트너 건축가', 1160, 11, 18, [0, 1, 2, 3], 'inspired', [['painting', 8], ['charisma', 6]]],
      ['건축사사무소 대표', 1520, 11, 17, [0, 1, 2, 3], 'inspired'],
    ]],
    ['Architect_Urban', '도시 설계자', [
      ['도시계획 엔지니어', 530, 9, 17, WK, 'focused', [['logic', 6], ['handiness', 4]]],
      ['도시설계 팀장', 690, 9, 17, WK, 'focused', [['logic', 7], ['handiness', 5]]],
      ['도시계획 부장', 880, 9, 17, WK, 'confident', [['logic', 8], ['charisma', 5]]],
      ['도시계획 본부장', 1120, 9, 16, WK, 'confident', [['logic', 9], ['charisma', 6]]],
      ['총괄 계획가', 1460, 10, 16, [0, 1, 2, 3], 'inspired'],
    ]],
  ]),
  career('vet', '수의사', '🐾', 'logic', 'happy', 'Cats & Dogs 동물병원 · 수의사 직업 모드', [
    // One path: 동물보건사 (a licence of its own) is gone from between the 보조 and the vet student (2026-10-26).
    ['동물병원 보조', 80, 9, 17, WK, 'happy'],
    ['수의대 실습생', 115, 9, 17, [1, 2, 3, 4, 5], 'happy', [['logic', 2]]],
    ['인턴 수의사', 175, 9, 18, [1, 2, 3, 4, 5], 'focused', [['logic', 3], ['charisma', 2]]],
    ['수의 레지던트', 245, 8, 18, WK, 'focused', [['logic', 4], ['charisma', 3]]],
  ], [
    ['Vet_Clinic', '임상 수의사', [
      ['진료 수의사', 340, 9, 18, [1, 2, 3, 4, 5], 'focused', [['logic', 5], ['charisma', 4]]],
      ['외과 수의사', 455, 8, 17, WK, 'focused', [['logic', 6], ['handiness', 4]]],
      ['선임 수의사', 600, 9, 17, WK, 'happy', [['logic', 7], ['handiness', 5]]],
      ['진료 과장', 780, 9, 17, WK, 'confident', [['logic', 8], ['charisma', 6]]],
      ['동물병원 부원장', 1000, 10, 17, [0, 1, 2, 3], 'confident', [['logic', 9], ['charisma', 7]]],
      ['동물병원 원장', 1300, 10, 16, [0, 1, 2, 3], 'confident'],
    ]],
    ['Vet_Wildlife', '야생동물 수의사', [
      ['야생동물 재활사', 330, 7, 15, WK, 'energized', [['logic', 5], ['fitness', 3]]],
      ['야생동물 수의사', 440, 7, 15, WK, 'energized', [['logic', 6], ['fitness', 4]]],
      ['동물원 수의사', 590, 8, 16, [1, 2, 3, 4, 5], 'happy', [['logic', 7], ['gardening', 3]]],
      ['해양동물 수의사', 770, 7, 15, WK, 'energized', [['logic', 8], ['fishing', 4]]],
      ['동물원 진료팀장', 980, 8, 16, [0, 1, 2, 3], 'confident', [['logic', 9], ['charisma', 6]]],
      ['야생동물구조센터장', 1280, 9, 16, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('fashionDesigner', '패션 디자이너', '✂️', 'painting', 'inspired', '패션 디자이너 직업 모드 · Moschino 스터프', [
    ['디자인실 어시스턴트', 85, 10, 18, WK, 'inspired'],
    ['패턴사', 122, 10, 18, WK, 'inspired', [['painting', 2]]],
    ['주니어 디자이너', 182, 10, 18, WK, 'focused', [['painting', 3], ['handiness', 2]]],
    ['디자이너', 262, 10, 19, WK, 'inspired', [['painting', 4], ['charisma', 2]]],
  ], [
    ['Fashion_Couture', '오트 쿠튀르', [
      ['수석 디자이너', 480, 10, 19, WK, 'inspired', [['painting', 6], ['handiness', 4]]],
      ['디자인 실장', 650, 11, 19, WK, 'inspired', [['painting', 7], ['charisma', 4]]],
      ['크리에이티브 디렉터', 850, 11, 19, [0, 1, 2, 3], 'confident', [['painting', 8], ['charisma', 5]]],
      ['디자이너 브랜드 대표', 1250, 12, 18, [0, 1, 2, 3], 'inspired'],
    ]],
    ['Fashion_Brand', '패션 MD', [
      ['브랜드 MD', 350, 9, 18, WK, 'focused', [['charisma', 4], ['logic', 3]]],
      ['MD 팀장', 470, 9, 18, WK, 'confident', [['charisma', 5], ['logic', 4]]],
      ['브랜드 매니저', 630, 9, 18, WK, 'confident', [['charisma', 6], ['photography', 4]]],
      ['패션 사업부장', 1150, 9, 17, WK, 'confident'],
    ]],
  ]),
  career('photographer', '사진작가', '📷', 'photography', 'inspired', 'Get Famous · 사진작가 직업 모드', [
    ['사진관 보조', 76, 10, 18, [1, 2, 3, 4, 5], 'happy'],
    ['촬영 어시스턴트', 112, 10, 18, [1, 2, 3, 4, 5], 'inspired', [['photography', 2]]],
    ['사진작가', 172, 10, 18, [3, 4, 5, 6], 'happy', [['photography', 3], ['charisma', 2]]],
    ['스튜디오 사진작가', 245, 10, 18, [1, 2, 3, 4, 5], 'inspired', [['photography', 4], ['painting', 2]]],
  ], [
    ['Photographer_Journalist', '사진 기자', [
      ['사진 기자', 335, 8, 17, WK, 'focused', [['photography', 5], ['writing', 3]]],
      ['선임 사진 기자', 585, 8, 17, WK, 'focused', [['writing', 5], ['charisma', 4]]],
      ['사진부 데스크', 960, 9, 17, [0, 1, 2, 3], 'confident', [['writing', 7], ['charisma', 6]]],
      ['사진부장', 1150, 10, 16, [0, 1, 2, 3], 'confident'],
    ]],
    ['Photographer_Art', '패션·화보 사진가', [
      ['패션 사진작가', 435, 11, 19, [1, 2, 3, 4, 5], 'inspired', [['painting', 4], ['charisma', 3]]],
      ['화보 전문 사진작가', 575, 11, 19, [1, 2, 3, 4, 5], 'inspired', [['painting', 5], ['charisma', 4]]],
      ['개인전 사진작가', 755, 12, 19, [2, 3, 4, 5], 'inspired', [['painting', 6], ['charisma', 5]]],
      ['사진 스튜디오 대표', 1200, 12, 18, [2, 3, 4, 5], 'inspired'],
    ]],
  ]),
  career('hairStylist', '미용사', '💇', 'charisma', 'happy', '미용사·살롱 직업 모드 · Spa Day', [
    ['샴푸 스태프', 70, 10, 18, [1, 2, 3, 4, 5], 'happy'],
    ['인턴 미용사', 102, 10, 19, [1, 2, 3, 4, 5], 'happy', [['charisma', 2]]],
    ['헤어 디자이너', 162, 10, 19, [1, 2, 3, 4, 5], 'inspired', [['charisma', 3], ['painting', 2]]],
  ], [
    ['Stylist_Salon', '살롱 원장', [
      ['헤어 실장', 320, 10, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 5], ['logic', 3]]],
      ['부원장', 430, 10, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 6], ['logic', 4]]],
      ['미용실 원장', 950, 10, 18, [1, 2, 3, 4], 'confident'],
    ]],
    ['Stylist_Celebrity', '셀럽 스타일리스트', [
      ['방송 헤어 스타일리스트', 330, 6, 15, [0, 2, 4, 5], 'inspired', [['painting', 4], ['charisma', 5]]],
      ['셀럽 전담 스타일리스트', 580, 9, 18, [0, 2, 4, 5], 'inspired', [['painting', 6], ['charisma', 7]]],
      ['패션쇼 헤어 감독', 950, 10, 19, [0, 2, 4, 5], 'inspired'],
    ]],
  ]),
  career('pilot', '파일럿', '✈️', 'logic', 'focused', '파일럿·항공사 직업 모드', [
    ['운항 관리 보조', 110, 9, 17, WK, 'focused'],
    ['비행 훈련생', 160, 8, 16, WK, 'focused', [['logic', 2]]],
    ['부기장', 265, 6, 18, [0, 2, 4], 'focused', [['logic', 3], ['handiness', 2]]],
    ['선임 부기장', 400, 6, 18, [1, 3, 5], 'confident', [['logic', 4], ['handiness', 3]]],
  ], [
    ['Pilot_Airline', '민항기 기장', [
      ['기장', 560, 6, 18, [0, 2, 4], 'focused', [['logic', 5], ['charisma', 3]]],
      ['국제선 기장', 700, 6, 18, [1, 3, 5], 'focused', [['logic', 6], ['charisma', 4]]],
      ['대형기 기장', 880, 7, 18, [0, 2, 4], 'confident', [['logic', 7], ['charisma', 5]]],
      ['교관 기장', 1080, 8, 17, WK, 'confident', [['logic', 8], ['charisma', 6]]],
      ['운항 승무팀장', 1340, 9, 17, [0, 1, 2, 3], 'confident', [['logic', 9], ['charisma', 7]]],
      ['운항 본부장', 1680, 9, 16, [0, 1, 2, 3], 'confident'],
    ]],
    ['Pilot_Aerobatic', '특수 비행 조종사', [
      ['항공 촬영 조종사', 540, 10, 18, [2, 3, 5, 6], 'energized', [['fitness', 4], ['handiness', 4]]],
      ['닥터헬기 조종사', 690, 7, 17, WK, 'energized', [['fitness', 5], ['handiness', 5]]],
      ['에어쇼 곡예 비행사', 870, 7, 17, WK, 'confident', [['fitness', 6], ['rocketScience', 2]]],
      ['시험 비행 조종사', 1080, 10, 18, [2, 3, 5, 6], 'confident', [['fitness', 7], ['rocketScience', 4]]],
      ['수석 시험 비행 조종사', 1360, 8, 17, [0, 1, 2, 3], 'energized', [['rocketScience', 6], ['logic', 8]]],
      ['비행시험 팀장', 1700, 9, 17, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  // ---- After the expansion packs' own careers (all ours: none of their tuning is installed) ----
  career('scientist', '과학자', '🔬', 'logic', 'focused', 'Get to Work 과학자', [
    ['실험실 조교', 100, 9, 17, WK, 'focused'],
    ['연구 보조원', 145, 9, 17, WK, 'focused', [['logic', 2]]],
    ['연구원', 210, 9, 18, WK, 'focused', [['logic', 3], ['handiness', 2]]],
    ['박사후 연구원', 300, 9, 18, WK, 'inspired', [['logic', 4], ['handiness', 3]]],
    ['선임 연구원', 410, 10, 18, WK, 'inspired', [['logic', 5], ['handiness', 4]]],
  ], [
    ['Scientist_Inventor', '응용 연구자', [
      ['시제품 개발 연구원', 540, 10, 19, WK, 'inspired', [['handiness', 5], ['logic', 6]]],
      ['책임 연구원', 700, 10, 19, WK, 'inspired', [['handiness', 6], ['logic', 7]]],
      ['수석 연구원', 900, 10, 18, [0, 1, 2, 3], 'inspired', [['handiness', 7], ['rocketScience', 3]]],
      ['연구소장', 1170, 10, 18, [0, 1, 2, 3], 'confident', [['handiness', 8], ['charisma', 5]]],
      ['연구원장', 1500, 11, 17, [0, 1, 2, 3], 'inspired'],
    ]],
    ['Scientist_Theorist', '이론 물리학자', [
      ['이론물리 연구원', 520, 9, 17, WK, 'focused', [['logic', 6], ['writing', 4]]],
      ['양자물리 책임연구원', 680, 9, 17, WK, 'focused', [['logic', 7], ['writing', 5]]],
      ['우주론 연구 단장', 880, 20, 28, [0, 1, 2, 3], 'focused', [['logic', 8], ['rocketScience', 4]]],
      ['기초과학연구원 부원장', 1130, 10, 17, [0, 1, 2, 3], 'confident', [['logic', 9], ['writing', 7]]],
      ['석학 연구위원', 1480, 10, 16, [0, 1, 2, 3], 'inspired'],
    ]],
  ]),
  career('actor', '배우', '🎬', 'charisma', 'confident', 'Get Famous 배우', [
    ['엑스트라', 75, 10, 18, [1, 2, 3, 4, 5], 'confident'],
    ['단역 배우', 110, 10, 18, [1, 2, 3, 4, 5], 'playful', [['charisma', 2]]],
    ['조연 배우', 180, 11, 20, [2, 3, 4, 5, 6], 'confident', [['charisma', 3], ['comedy', 2]]],
  ], [
    ['Actor_Film', '영화배우', [
      ['주연 배우', 380, 9, 19, [2, 3, 4, 5, 6], 'confident', [['charisma', 5], ['comedy', 4]]],
      ['인기 배우', 500, 9, 19, [2, 3, 4, 5, 6], 'confident', [['charisma', 6], ['comedy', 5]]],
      ['흥행 배우', 660, 10, 19, [2, 3, 4, 5], 'confident', [['charisma', 7], ['comedy', 6]]],
      ['톱스타', 870, 10, 19, [2, 3, 4, 5], 'confident', [['charisma', 8], ['comedy', 7]]],
      ['국민 배우', 1600, 12, 18, [3, 4, 5], 'confident'],
    ]],
    ['Actor_Stage', '뮤지컬 배우', [
      ['앙상블 배우', 360, 13, 22, [2, 3, 4, 5, 6], 'energized', [['charisma', 5], ['fitness', 3]]],
      ['뮤지컬 조연', 480, 13, 22, [2, 3, 4, 5, 6], 'energized', [['charisma', 6], ['piano', 3]]],
      ['뮤지컬 주연', 640, 14, 23, [2, 3, 4, 5, 6], 'confident', [['charisma', 7], ['piano', 4]]],
      ['뮤지컬 스타', 840, 14, 23, [2, 3, 4, 5], 'confident', [['charisma', 8], ['fitness', 5]]],
      ['뮤지컬 연출 겸 배우', 1350, 15, 22, [3, 4, 5], 'confident'],
    ]],
  ]),
  career('politician', '정치가', '🏛️', 'charisma', 'confident', 'City Living 정치가', [
    ['선거 운동원', 85, 9, 17, WK, 'confident'],
    ['의원 비서', 125, 9, 17, WK, 'confident', [['charisma', 2]]],
    ['정책 보좌관', 190, 9, 18, WK, 'focused', [['charisma', 3], ['writing', 2]]],
    ['시의원', 280, 9, 18, WK, 'confident', [['charisma', 4], ['logic', 3]]],
  ], [
    ['Politician_Politician', '정치인', [
      ['광역의원', 380, 9, 18, WK, 'confident', [['charisma', 5], ['logic', 4]]],
      ['국회의원', 510, 9, 18, WK, 'confident', [['charisma', 6], ['writing', 4]]],
      ['재선 국회의원', 670, 9, 18, WK, 'confident', [['charisma', 7], ['writing', 5]]],
      ['상임위원장', 880, 9, 19, [0, 1, 2, 3, 4, 5], 'confident', [['charisma', 8], ['logic', 6]]],
      ['원내대표', 1150, 9, 18, WK, 'confident', [['charisma', 9], ['logic', 7]]],
      ['장관', 1650, 9, 17, WK, 'confident'],
    ]],
    ['Politician_Activist', '사회 운동가', [
      ['시민단체 정책위원', 350, 10, 18, WK, 'happy', [['charisma', 5], ['writing', 3]]],
      ['캠페인 팀장', 470, 10, 18, WK, 'inspired', [['charisma', 6], ['writing', 4]]],
      ['시민단체 사무국장', 620, 10, 18, WK, 'confident', [['charisma', 7], ['writing', 5]]],
      ['시민단체 사무총장', 800, 10, 18, [0, 1, 2, 3, 5], 'confident', [['charisma', 8], ['writing', 6]]],
      ['시민단체 상임대표', 1050, 10, 17, [0, 1, 2, 3], 'confident', [['charisma', 9], ['writing', 7]]],
      ['국가인권위원', 1400, 10, 16, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('critic', '평론가', '🍷', 'writing', 'inspired', 'City Living 평론가', [
    ['블로그 리뷰어', 70, 10, 17, WK, 'inspired'],
    ['칼럼 보조', 105, 10, 17, WK, 'focused', [['writing', 2]]],
    ['신문 리뷰어', 165, 10, 18, WK, 'inspired', [['writing', 3], ['charisma', 2]]],
    ['칼럼니스트', 240, 11, 19, WK, 'inspired', [['writing', 4], ['charisma', 3]]],
  ], [
    ['Critic_Food', '음식 평론가', [
      ['맛집 칼럼니스트', 340, 11, 20, [1, 2, 3, 4, 5], 'happy', [['writing', 5], ['cooking', 4]]],
      ['음식 평론가', 460, 12, 21, [1, 2, 3, 4, 5], 'happy', [['writing', 6], ['gourmet', 2]]],
      ['레스토랑 가이드 평가원', 600, 12, 21, [1, 2, 3, 4, 5], 'confident', [['writing', 7], ['gourmet', 3]]],
      ['수석 음식 평론가', 1150, 13, 20, [3, 4, 5], 'confident'],
    ]],
    ['Critic_Art', '미술 평론가', [
      ['전시 리뷰어', 330, 10, 18, WK, 'inspired', [['writing', 5], ['painting', 3]]],
      ['미술 평론가', 450, 10, 18, WK, 'inspired', [['writing', 6], ['painting', 4]]],
      ['큐레이터', 590, 10, 18, [1, 2, 3, 4, 5], 'inspired', [['writing', 7], ['painting', 5]]],
      ['미술관 학예실장', 1150, 11, 17, [1, 2, 3, 4], 'inspired'],
    ]],
  ]),
  career('socialMedia', '소셜 미디어', '📱', 'charisma', 'playful', 'City Living 소셜 미디어', [
    ['SNS 운영 인턴', 75, 10, 18, WK, 'playful'],
    ['콘텐츠 에디터', 115, 10, 18, WK, 'inspired', [['charisma', 2]]],
    ['SNS 마케터', 175, 10, 18, WK, 'playful', [['charisma', 3], ['writing', 2]]],
  ], [
    ['SocialMedia_Personality', '크리에이터', [
      ['신인 크리에이터', 350, 12, 20, [0, 1, 2, 4, 5], 'playful', [['comedy', 4], ['charisma', 5]]],
      ['인플루언서', 470, 12, 20, [0, 1, 2, 4, 5], 'playful', [['comedy', 5], ['photography', 3]]],
      ['파워 인플루언서', 630, 13, 21, [0, 2, 4, 5], 'playful', [['comedy', 6], ['photography', 4]]],
      ['구독자 100만 크리에이터', 830, 13, 21, [0, 2, 4, 5], 'confident', [['comedy', 7], ['charisma', 7]]],
      ['톱 크리에이터', 1300, 14, 20, [2, 4, 5], 'playful'],
    ]],
    ['SocialMedia_PR', '홍보 전문가', [
      ['홍보 담당자', 360, 9, 18, WK, 'confident', [['charisma', 5], ['writing', 3]]],
      ['홍보 팀장', 480, 9, 18, WK, 'confident', [['charisma', 6], ['writing', 4]]],
      ['브랜드 전략 매니저', 640, 9, 18, WK, 'focused', [['charisma', 7], ['logic', 4]]],
      ['홍보 이사', 840, 9, 18, WK, 'confident', [['charisma', 8], ['writing', 6]]],
      ['홍보 대행사 대표', 1250, 10, 17, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('military', '군인', '🎖️', 'fitness', 'confident', 'StrangerVille 군인', [
    ['사관 후보생', 90, 6, 14, WK, 'energized'],
    ['소위', 130, 6, 14, WK, 'energized', [['fitness', 2]]],
    ['중위', 195, 6, 16, WK, 'confident', [['fitness', 3], ['logic', 2]]],
    ['대위', 270, 6, 16, WK, 'confident', [['fitness', 4], ['charisma', 2]]],
  ], [
    ['Military_Officer', '지휘관', [
      ['소령', 360, 7, 17, WK, 'confident', [['charisma', 4], ['logic', 4]]],
      ['중령', 470, 7, 17, WK, 'confident', [['charisma', 5], ['logic', 5]]],
      ['대령', 620, 7, 17, WK, 'confident', [['charisma', 6], ['logic', 6]]],
      ['준장', 810, 8, 17, WK, 'focused', [['charisma', 7], ['logic', 7]]],
      ['소장', 1050, 8, 17, WK, 'confident', [['charisma', 8], ['logic', 8]]],
      ['중장', 1450, 9, 17, [0, 1, 2, 3], 'confident'],
    ]],
    ['Military_Covert', '특수 작전', [
      ['특전 중대장', 370, 6, 18, [0, 2, 4], 'energized', [['fitness', 5], ['handiness', 3]]],
      ['특전 작전장교', 490, 6, 18, [0, 2, 4], 'focused', [['fitness', 6], ['logic', 4]]],
      ['특전 대대장', 640, 20, 32, [1, 3, 5], 'focused', [['fitness', 7], ['mischief', 3]]],
      ['특수작전 참모', 830, 6, 18, [0, 2, 4], 'confident', [['fitness', 8], ['logic', 6]]],
      ['특전 여단장', 1080, 7, 17, WK, 'confident', [['fitness', 9], ['charisma', 6]]],
      ['특수전 사령관', 1450, 8, 16, [0, 2, 4], 'focused'],
    ]],
  ]),
  career('gardener', '정원사', '🌷', 'gardening', 'happy', 'Seasons 정원사', [
    ['정원 관리 보조', 70, 8, 16, WK, 'happy'],
    ['정원 관리사', 105, 8, 16, WK, 'happy', [['gardening', 2]]],
    ['조경 기사', 165, 8, 17, [1, 2, 3, 4, 5], 'energized', [['gardening', 3], ['handiness', 2]]],
    ['선임 정원사', 240, 8, 17, [1, 2, 3, 4, 5], 'happy', [['gardening', 4], ['logic', 2]]],
  ], [
    ['Gardener_Botanist', '식물학자', [
      ['식물 연구원', 330, 9, 17, WK, 'focused', [['gardening', 5], ['logic', 3]]],
      ['식물학자', 450, 9, 17, WK, 'focused', [['gardening', 6], ['logic', 4]]],
      ['식물원 연구실장', 780, 9, 17, WK, 'confident', [['gardening', 8], ['writing', 5]]],
      ['식물원장', 1100, 10, 17, [0, 1, 2, 3], 'confident'],
    ]],
    ['Gardener_Florist', '플로리스트', [
      ['꽃집 플로리스트', 320, 9, 17, [1, 2, 3, 4, 5], 'happy', [['gardening', 5], ['painting', 3]]],
      ['웨딩 플로리스트', 430, 9, 17, [2, 3, 4, 5, 6], 'happy', [['gardening', 6], ['painting', 4]]],
      ['플라워 디자이너', 580, 10, 18, [2, 3, 4, 5, 6], 'inspired', [['gardening', 7], ['painting', 5]]],
      ['플라워 숍 대표', 1050, 10, 17, [2, 3, 4, 5], 'inspired'],
    ]],
  ]),
  career('engineer', '엔지니어', '⚙️', 'logic', 'focused', 'Discover University 엔지니어', [
    ['엔지니어링 인턴', 100, 9, 17, WK, 'focused'],
    ['주니어 엔지니어', 145, 9, 17, WK, 'focused', [['logic', 2]]],
    ['엔지니어', 210, 9, 18, WK, 'focused', [['logic', 3], ['handiness', 2]]],
    ['선임 엔지니어', 300, 9, 18, WK, 'focused', [['logic', 4], ['handiness', 3]]],
    ['수석 엔지니어', 410, 9, 18, WK, 'confident', [['logic', 5], ['programming', 3]]],
  ], [
    ['Engineer_Computer', '컴퓨터 공학자', [
      ['하드웨어 엔지니어', 540, 10, 19, WK, 'focused', [['programming', 5], ['logic', 6]]],
      ['시스템 아키텍트', 700, 10, 19, WK, 'focused', [['programming', 6], ['logic', 7]]],
      ['AI 연구 리드', 900, 10, 19, WK, 'inspired', [['programming', 7], ['logic', 8]]],
      ['기술 연구소장', 1160, 10, 18, [0, 1, 2, 3], 'confident', [['programming', 8], ['charisma', 5]]],
      ['최고 기술 책임자(CTO)', 1500, 11, 17, [0, 1, 2, 3], 'inspired'],
    ]],
    ['Engineer_Mechanical', '기계 공학자', [
      ['기계설계 엔지니어', 530, 8, 17, WK, 'focused', [['handiness', 5], ['logic', 6]]],
      ['로봇 엔지니어', 690, 8, 17, WK, 'inspired', [['handiness', 6], ['logic', 7]]],
      ['항공우주 엔지니어', 890, 8, 17, WK, 'focused', [['handiness', 7], ['rocketScience', 4]]],
      ['설계 팀장', 1140, 9, 17, [0, 1, 2, 3], 'confident', [['handiness', 8], ['rocketScience', 6]]],
      ['엔지니어링 이사', 1480, 9, 16, [0, 1, 2, 3], 'inspired'],
    ]],
  ]),
  career('conservationist', '자연 보호 활동가', '🌿', 'gardening', 'energized', 'Island Living 자연 보호 활동가', [
    ['환경단체 인턴', 70, 8, 16, WK, 'energized'],
    ['현장 조사원', 110, 8, 16, WK, 'energized', [['gardening', 2]]],
    ['생태 조사원', 170, 8, 17, WK, 'focused', [['gardening', 3], ['fishing', 2]]],
    ['환경 감시원', 245, 8, 17, WK, 'energized', [['gardening', 4], ['logic', 2]]],
  ], [
    ['Conservationist_Manager', '환경 관리자', [
      ['환경 정책 담당', 340, 9, 17, WK, 'focused', [['logic', 4], ['charisma', 3]]],
      ['환경 관리관', 460, 9, 17, WK, 'focused', [['logic', 5], ['charisma', 4]]],
      ['국립공원 사무소장', 610, 8, 17, WK, 'confident', [['logic', 6], ['charisma', 5]]],
      ['지방환경청장', 1100, 9, 17, WK, 'confident'],
    ]],
    ['Conservationist_Marine', '해양 생물학자', [
      ['해양 연구원', 340, 7, 16, WK, 'energized', [['fishing', 4], ['logic', 3]]],
      ['해양 생물학자', 460, 7, 16, WK, 'focused', [['fishing', 5], ['logic', 4]]],
      ['해양 보전 전문가', 600, 7, 16, WK, 'energized', [['fishing', 6], ['logic', 5]]],
      ['해양 연구소장', 1100, 8, 16, WK, 'confident'],
    ]],
  ]),
  career('interiorDecorator', '인테리어 디자이너', '🛋️', 'painting', 'inspired', 'Dream Home Decorator 인테리어 디자이너', [
    ['인테리어 보조', 80, 10, 18, WK, 'inspired'],
    ['컬러 코디네이터', 120, 10, 18, WK, 'inspired', [['painting', 2]]],
    ['인테리어 디자이너', 185, 10, 18, WK, 'inspired', [['painting', 3], ['charisma', 2]]],
    ['선임 디자이너', 265, 10, 19, WK, 'confident', [['painting', 4], ['handiness', 2]]],
  ], [
    ['Decorator_Residential', '주거 공간 디자이너', [
      ['주택 리모델링 디자이너', 360, 9, 18, WK, 'inspired', [['painting', 5], ['handiness', 3]]],
      ['하우스 스타일리스트', 480, 9, 18, WK, 'inspired', [['painting', 6], ['handiness', 4]]],
      ['고급 주거 디자이너', 640, 10, 18, WK, 'inspired', [['painting', 7], ['charisma', 4]]],
      ['디자인 스튜디오 대표', 1150, 10, 18, [0, 1, 2, 3], 'confident'],
    ]],
    ['Decorator_Commercial', '상업 공간 디자이너', [
      ['매장 디자이너', 350, 9, 18, WK, 'focused', [['painting', 5], ['logic', 3]]],
      ['호텔 인테리어 디자이너', 470, 9, 18, WK, 'inspired', [['painting', 6], ['logic', 4]]],
      ['공간 브랜딩 디렉터', 630, 9, 18, WK, 'confident', [['painting', 7], ['charisma', 5]]],
      ['상업 공간 총괄 이사', 1150, 9, 18, WK, 'confident'],
    ]],
  ]),
  career('salaryperson', '회사원', '💼', 'charisma', 'focused', 'Snowy Escape 회사원', [
    ['신입 사원', 95, 9, 18, WK, 'focused'],
    ['사원', 135, 9, 18, WK, 'focused', [['logic', 2]]],
    ['주임', 195, 9, 19, WK, 'focused', [['logic', 3], ['charisma', 2]]],
    ['대리', 275, 9, 19, WK, 'confident', [['logic', 3], ['charisma', 3]]],
  ], [
    ['Salaryperson_Manager', '관리직', [
      ['과장', 380, 9, 19, WK, 'confident', [['charisma', 4], ['logic', 4]]],
      ['차장', 500, 9, 19, WK, 'confident', [['charisma', 5], ['logic', 5]]],
      ['부장', 660, 9, 19, WK, 'confident', [['charisma', 6], ['writing', 4]]],
      ['상무', 860, 9, 18, WK, 'confident', [['charisma', 7], ['writing', 5]]],
      ['전무', 1120, 9, 18, WK, 'confident', [['charisma', 8], ['logic', 7]]],
      ['대표이사', 1550, 9, 17, WK, 'confident'],
    ]],
    ['Salaryperson_Expert', '전문직', [
      ['선임', 370, 9, 18, WK, 'focused', [['logic', 4], ['programming', 3]]],
      ['책임', 490, 9, 18, WK, 'focused', [['logic', 5], ['programming', 4]]],
      ['수석', 650, 9, 18, WK, 'focused', [['logic', 6], ['writing', 4]]],
      ['마스터', 850, 9, 18, WK, 'focused', [['logic', 7], ['writing', 5]]],
      ['전문위원', 1100, 10, 17, [0, 1, 2, 3], 'confident', [['logic', 8], ['writing', 6]]],
      ['사내 펠로우', 1450, 10, 16, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('mortician', '장의사', '⚱️', 'charisma', 'focused', 'Life & Death 장의사', [
    ['장례식장 보조', 85, 9, 17, WK, 'focused'],
    ['장례지도사 견습', 125, 9, 17, WK, 'focused', [['charisma', 2]]],
    ['장례지도사', 190, 9, 18, [0, 1, 2, 4, 5], 'focused', [['charisma', 3], ['handiness', 2]]],
    ['선임 장례지도사', 270, 9, 18, [0, 1, 2, 4, 5], 'confident', [['charisma', 4], ['writing', 2]]],
  ], [
    ['Mortician_Director', '장례 지도자', [
      ['장례 의전 실장', 370, 9, 18, [0, 1, 2, 4, 5], 'confident', [['charisma', 5], ['writing', 3]]],
      ['장례식장 운영 팀장', 490, 9, 18, WK, 'confident', [['charisma', 6], ['writing', 4]]],
      ['장례식장 대표', 650, 9, 18, WK, 'confident', [['charisma', 7], ['logic', 4]]],
      ['추모공원 원장', 1100, 9, 17, WK, 'confident'],
    ]],
    // 검시조사관 are police officers, another job: the branch stays with the dead's care (2026-10-26).
    ['Mortician_Examiner', '염습·복원', [
      ['염습사', 360, 8, 17, WK, 'focused', [['handiness', 4], ['logic', 3]]],
      ['시신 복원사', 480, 8, 17, WK, 'focused', [['handiness', 5], ['logic', 4]]],
      ['수석 염습사', 640, 8, 17, WK, 'focused', [['logic', 6], ['handiness', 6]]],
      ['장례 교육원장', 1080, 9, 17, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  // ---- After career mods (verified: Kawaiistacie Showtime; adeepindigo; KiaraDwellers4Mods; RojaCat). All ours. ----
  career('dj', 'DJ', '🎧', 'djMixing', 'playful', 'Kawaiistacie Showtime 모드 DJ (Get Together DJ 믹싱 스킬)', [
    ['보조 DJ', 80, 20, 26, [3, 4, 5], 'playful'],
    ['클럽 레지던트 DJ', 190, 21, 27, [3, 4, 5, 6], 'playful', [['djMixing', 3], ['charisma', 2]]],
    ['인기 클럽 DJ', 275, 21, 28, [3, 4, 5, 6], 'confident', [['djMixing', 4], ['charisma', 3]]],
  ], [
    ['DJ_Festival', '페스티벌 DJ', [
      ['페스티벌 DJ', 380, 18, 26, [4, 5, 6], 'playful', [['djMixing', 5], ['charisma', 4]]],
      ['메인 스테이지 DJ', 500, 18, 26, [4, 5, 6], 'playful', [['djMixing', 6], ['charisma', 5]]],
      ['헤드라이너 DJ', 1100, 20, 27, [4, 5, 6], 'confident'],
    ]],
    ['DJ_Producer', '음악 프로듀서', [
      ['비트 메이커', 360, 12, 20, WK, 'inspired', [['djMixing', 5], ['piano', 3]]],
      ['음악 프로듀서', 480, 12, 20, WK, 'inspired', [['djMixing', 6], ['piano', 4]]],
      ['레이블 대표', 1100, 11, 19, WK, 'confident'],
    ]],
  ]),
  career('dancer', '댄서', '💃', 'dancing', 'energized', 'Kawaiistacie Showtime 모드 댄서 (Get Together 춤 스킬)', [
    ['댄스 연습생', 75, 14, 20, WK, 'energized'],
    ['백업 댄서', 115, 15, 22, [1, 2, 3, 4, 5], 'energized', [['dancing', 2]]],
    ['무대 댄서', 180, 15, 22, [1, 2, 3, 4, 5], 'energized', [['dancing', 3], ['fitness', 2]]],
  ], [
    ['Dancer_Stage', '무용수', [
      ['군무 무용수', 370, 13, 21, [1, 2, 3, 4, 5], 'energized', [['dancing', 5], ['fitness', 4]]],
      ['솔리스트', 490, 13, 21, [1, 2, 3, 4, 5], 'energized', [['dancing', 6], ['fitness', 5]]],
      ['수석 무용수', 1000, 13, 21, [2, 3, 4, 5], 'confident'],
    ]],
    ['Dancer_Choreographer', '안무가', [
      ['보조 안무가', 360, 11, 19, WK, 'inspired', [['dancing', 5], ['charisma', 3]]],
      ['안무가', 480, 11, 19, WK, 'inspired', [['dancing', 6], ['charisma', 4]]],
      ['안무 감독', 1000, 12, 20, WK, 'confident'],
    ]],
  ]),
  career('singer', '가수', '🎤', 'singing', 'confident', 'Kawaiistacie Showtime 모드 가수 (City Living 노래 스킬)', [
    ['버스킹 가수', 70, 16, 21, [4, 5, 6], 'confident'],
    ['보컬 연습생', 175, 13, 21, WK, 'focused', [['singing', 3], ['charisma', 2]]],
    ['신인 가수', 260, 12, 21, [1, 2, 3, 4, 5], 'confident', [['singing', 4], ['charisma', 3]]],
  ], [
    ['Singer_Pop', '팝스타', [
      ['인기 가수', 370, 12, 21, [1, 2, 3, 4, 5], 'confident', [['singing', 5], ['charisma', 4]]],
      ['음원 차트 1위 가수', 500, 12, 21, [1, 2, 3, 4, 5], 'confident', [['singing', 6], ['dancing', 3]]],
      ['국민 가수', 1300, 14, 22, [3, 4, 5, 6], 'confident'],
    ]],
    ['Singer_Opera', '성악가', [
      ['합창단원', 350, 13, 21, WK, 'inspired', [['singing', 5], ['piano', 3]]],
      ['오페라 조역', 470, 14, 22, [1, 2, 3, 4, 5], 'inspired', [['singing', 6], ['piano', 4]]],
      ['오페라 주역 가수', 1000, 14, 22, [2, 3, 4, 5], 'inspired'],
    ]],
  ]),
  career('diplomat', '외교관', '🌐', 'charisma', 'confident', 'adeepindigo 국제관계(International Relations) 모드', [
    ['외교관 후보자', 95, 9, 17, WK, 'focused'],
    ['3등 서기관', 140, 9, 17, WK, 'focused', [['charisma', 2]]],
    ['2등 서기관', 205, 9, 18, WK, 'confident', [['charisma', 3], ['writing', 2]]],
    ['1등 서기관', 290, 9, 18, WK, 'confident', [['charisma', 4], ['logic', 3]]],
  ], [
    ['Diplomat_Ambassador', '대사', [
      ['참사관', 400, 9, 18, WK, 'confident', [['charisma', 5], ['writing', 4]]],
      ['공사참사관', 520, 9, 18, WK, 'confident', [['charisma', 6], ['writing', 5]]],
      ['공사', 690, 9, 18, WK, 'confident', [['charisma', 7], ['logic', 5]]],
      ['총영사', 900, 9, 18, WK, 'confident', [['charisma', 8], ['logic', 6]]],
      ['대사', 1170, 9, 18, WK, 'confident', [['charisma', 9], ['logic', 7]]],
      ['외교부 차관', 1600, 10, 17, [0, 1, 2, 3], 'confident'],
    ]],
    ['Diplomat_International', '국제기구 전문가', [
      ['국제기구 초급 전문가', 380, 9, 17, WK, 'focused', [['logic', 5], ['writing', 4]]],
      ['국제기구 정책관', 500, 9, 17, WK, 'focused', [['logic', 6], ['writing', 5]]],
      ['국제기구 과장', 660, 9, 18, WK, 'confident', [['logic', 7], ['charisma', 6]]],
      ['국제기구 국장', 860, 9, 18, WK, 'confident', [['logic', 8], ['charisma', 7]]],
      ['국제기구 사무차장보', 1150, 9, 17, WK, 'confident', [['logic', 9], ['charisma', 8]]],
      ['국제기구 사무차장', 1550, 10, 17, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('streamer', '스트리머', '🕹️', 'videoGaming', 'playful', 'adeepindigo DwellersTuber 모드', [
    ['신입 스트리머', 70, 16, 22, [0, 1, 2, 4, 5], 'playful'],
    ['파트너 스트리머', 170, 17, 23, [0, 1, 2, 4, 5], 'playful', [['videoGaming', 3], ['charisma', 2]]],
    ['인기 스트리머', 250, 17, 24, [0, 1, 2, 4, 5], 'confident', [['videoGaming', 4], ['comedy', 2]]],
  ], [
    ['Streamer_Gaming', '게임 스트리머', [
      ['게임 전문 스트리머', 360, 17, 24, [0, 1, 2, 4, 5], 'focused', [['videoGaming', 5], ['charisma', 4]]],
      ['e스포츠 캐스터', 640, 14, 22, [2, 3, 4, 5], 'confident', [['videoGaming', 7], ['charisma', 6]]],
      ['플랫폼 간판 스트리머', 1050, 18, 24, [0, 2, 4, 5], 'playful'],
    ]],
    ['Streamer_Variety', '버라이어티 크리에이터', [
      ['먹방 크리에이터', 350, 17, 23, [0, 1, 2, 4, 5], 'playful', [['comedy', 4], ['cooking', 3]]],
      ['예능 크리에이터', 630, 14, 22, [0, 1, 2, 4, 5], 'playful', [['comedy', 6], ['charisma', 5]]],
      ['구독자 100만 크리에이터', 1050, 14, 21, [0, 2, 4, 5], 'playful'],
    ]],
  ]),
  career('extremeAthlete', '익스트림 스포츠 선수', '🪂', 'fitness', 'energized', 'adeepindigo Xtreme 직업 모드', [
    ['레저 강사 보조', 75, 8, 16, WK, 'energized'],
    ['아마추어 익스트림 선수', 115, 10, 18, [1, 2, 3, 4, 5], 'energized', [['fitness', 2]]],
    ['프로 익스트림 선수', 260, 9, 18, [1, 2, 4, 5, 6], 'confident', [['fitness', 4], ['logic', 2]]],
  ], [
    ['Extreme_Sky', '스카이다이버', [
      ['스카이다이빙 강사', 370, 9, 17, [1, 2, 4, 5, 6], 'energized', [['fitness', 5], ['logic', 4]]],
      ['프로 윙슈트 선수', 490, 9, 17, [1, 2, 4, 5, 6], 'energized', [['fitness', 6], ['logic', 5]]],
      ['스카이다이빙 학교 대표', 1000, 9, 18, [4, 5, 6], 'confident'],
    ]],
    ['Extreme_Mountain', '산악 등반가', [
      ['산악 가이드', 360, 7, 17, [1, 2, 4, 5, 6], 'energized', [['fitness', 5], ['logic', 4]]],
      ['고산 등반가', 640, 6, 18, [2, 4, 6], 'energized', [['fitness', 7], ['logic', 6]]],
      ['원정대장', 1000, 7, 17, [1, 3, 5], 'confident'],
    ]],
  ]),
  career('therapist', '심리 상담사', '🧠', 'charisma', 'focused', '심리 상담사(Therapist) 직업 모드', [
    ['상담 인턴', 80, 9, 17, WK, 'happy'],
    ['상담 수련생', 120, 9, 17, WK, 'focused', [['charisma', 2]]],
    ['심리 상담사', 185, 10, 18, WK, 'focused', [['charisma', 3], ['logic', 2]]],
    ['전문 상담사', 270, 10, 19, WK, 'focused', [['charisma', 4], ['logic', 3]]],
  ], [
    ['Therapist_Clinical', '임상 심리학자', [
      ['임상심리사', 380, 9, 18, WK, 'focused', [['logic', 5], ['charisma', 4]]],
      ['임상심리 전문가', 500, 9, 18, WK, 'focused', [['logic', 6], ['charisma', 5]]],
      ['정신건강 연구원', 660, 9, 17, WK, 'focused', [['logic', 7], ['writing', 4]]],
      ['심리 클리닉 원장', 1100, 10, 18, WK, 'confident'],
    ]],
    ['Therapist_Family', '가족·아동 상담가', [
      ['아동 상담사', 360, 12, 20, WK, 'happy', [['charisma', 5], ['logic', 4]]],
      ['놀이 치료사', 480, 12, 20, WK, 'happy', [['charisma', 6], ['painting', 3]]],
      ['가족 상담 전문가', 640, 12, 20, WK, 'happy', [['charisma', 7], ['painting', 4]]],
      ['청소년 상담센터장', 1100, 11, 19, WK, 'confident'],
    ]],
  ]),
  career('filmmaker', '영화감독', '🎥', 'writing', 'inspired', 'KiaraDwellers4Mods 영화 제작자(Filmmaker) 모드', [
    ['연출부 막내', 75, 8, 18, WK, 'energized'],
    ['조감독', 120, 8, 18, WK, 'focused', [['writing', 2]]],
    ['단편 영화 감독', 185, 10, 19, WK, 'inspired', [['writing', 3], ['photography', 2]]],
    ['독립 영화 감독', 270, 10, 20, WK, 'inspired', [['writing', 4], ['photography', 3]]],
  ], [
    ['Filmmaker_Feature', '상업 영화 감독', [
      ['장편 영화 감독', 380, 9, 19, WK, 'inspired', [['writing', 5], ['charisma', 4]]],
      ['흥행 감독', 500, 9, 19, WK, 'confident', [['writing', 6], ['charisma', 5]]],
      ['대작 영화 감독', 670, 8, 20, [0, 1, 2, 3, 4, 5], 'confident', [['writing', 7], ['charisma', 6]]],
      ['천만 관객 감독', 1350, 10, 19, WK, 'inspired'],
    ]],
    ['Filmmaker_Documentary', '다큐멘터리 감독', [
      ['다큐멘터리 PD', 360, 8, 18, WK, 'focused', [['writing', 5], ['photography', 4]]],
      ['탐사 다큐 감독', 480, 8, 18, WK, 'focused', [['writing', 6], ['photography', 5]]],
      ['자연 다큐 감독', 640, 6, 18, [1, 3, 5], 'energized', [['writing', 7], ['fitness', 4]]],
      ['국제 영화제 수상 감독', 1100, 10, 18, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('model', '모델', '👠', 'charisma', 'confident', '모델(Modeling) 직업 모드', [
    ['신인 모델', 70, 10, 18, [1, 2, 3, 4, 5], 'confident'],
    ['피팅 모델', 110, 10, 18, [1, 2, 3, 4, 5], 'confident', [['charisma', 2], ['fitness', 2]]],
    ['패션 모델', 260, 9, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 4], ['fitness', 4]]],
  ], [
    ['Model_Runway', '런웨이 모델', [
      ['컬렉션 런웨이 모델', 370, 10, 20, [1, 2, 3, 4, 5], 'confident', [['fitness', 5], ['charisma', 5]]],
      ['톱 모델', 650, 11, 20, [2, 3, 4, 5], 'confident', [['fitness', 7], ['charisma', 7]]],
      ['슈퍼모델', 1200, 11, 20, [2, 3, 4, 5], 'confident'],
    ]],
    ['Model_Commercial', '광고·화보 모델', [
      ['화보 모델', 360, 9, 18, [1, 2, 3, 4, 5], 'inspired', [['charisma', 5], ['photography', 3]]],
      ['뷰티 브랜드 모델', 640, 9, 18, [1, 2, 3, 4, 5], 'confident', [['charisma', 7], ['photography', 5]]],
      ['글로벌 앰버서더', 1150, 10, 18, [1, 2, 3, 4], 'confident'],
    ]],
  ]),
  career('toymaker', '장난감 제작자', '🧸', 'handiness', 'playful', 'RojaCat 장난감 제작자(Toymaker) 모드', [
    ['장난감 조립공', 110, 9, 17, WK, 'focused', [['handiness', 2]]],
    ['장난감 디자이너', 175, 9, 17, WK, 'playful', [['handiness', 3], ['painting', 2]]],
    ['수석 장난감 디자이너', 255, 9, 18, WK, 'inspired', [['handiness', 4], ['painting', 3]]],
  ], [
    ['Toymaker_Artisan', '장난감 장인', [
      ['목공 장난감 작가', 360, 9, 17, WK, 'inspired', [['handiness', 5], ['painting', 4]]],
      ['인형 작가', 480, 9, 17, WK, 'inspired', [['handiness', 6], ['painting', 5]]],
      ['장난감 공방 대표', 950, 10, 17, WK, 'confident'],
    ]],
    ['Toymaker_Tech', '스마트 토이 개발자', [
      ['전자 장난감 개발자', 360, 9, 18, WK, 'focused', [['programming', 3], ['handiness', 5]]],
      ['로봇 장난감 엔지니어', 480, 9, 18, WK, 'focused', [['programming', 4], ['logic', 5]]],
      ['스마트 토이 개발 팀장', 950, 9, 18, WK, 'inspired'],
    ]],
  ]),
  career('baker', '제빵사', '🥐', 'cooking', 'happy', 'adeepindigo 프리랜서 셰프 모드 · Get to Work 제빵', [
    ['베이커리 보조', 70, 5, 13, [1, 2, 3, 4, 5], 'happy'],
    ['제빵 견습생', 110, 5, 13, [1, 2, 3, 4, 5], 'focused', [['cooking', 2]]],
    ['제빵사', 175, 5, 14, [1, 2, 3, 4, 5], 'happy', [['cooking', 3], ['charisma', 2]]],
  ], [
    ['Baker_Patissier', '파티시에', [
      ['파티시에', 370, 7, 16, [1, 2, 3, 4, 5], 'inspired', [['cooking', 5], ['painting', 3]]],
      ['수석 파티시에', 650, 7, 16, [2, 3, 4, 5], 'inspired', [['cooking', 7], ['gourmet', 4]]],
      ['제과 명장', 1000, 8, 16, [1, 2, 3, 4], 'inspired'],
    ]],
    ['Baker_Owner', '베이커리 사장', [
      ['베이커리 매니저', 360, 6, 15, [1, 2, 3, 4, 5], 'confident', [['cooking', 5], ['charisma', 4]]],
      ['동네 빵집 사장', 480, 6, 15, [1, 2, 3, 4, 5], 'happy', [['cooking', 6], ['logic', 4]]],
      ['베이커리 체인 대표', 1000, 8, 17, WK, 'confident'],
    ]],
  ]),
  // ---- Everyday jobs after Midnitetech's career megapack (job ideas only; all ours) ----
  career('dentist', '치과의사', '🦷', 'logic', 'focused', 'Midnitetech 치과의사(Dentist) 모드', [
    ['치과 진료 보조', 85, 9, 17, WK, 'focused'],
    ['치의학 실습생', 125, 9, 17, WK, 'focused', [['logic', 2]]],
    ['치과 인턴', 200, 9, 18, WK, 'focused', [['logic', 3], ['handiness', 2]]],
    ['일반 치과의사', 290, 9, 18, WK, 'confident', [['logic', 4], ['handiness', 3]]],
  ], [
    ['Dentist_Ortho', '교정 전문의', [
      ['교정과 전공의', 400, 9, 18, WK, 'focused', [['handiness', 4], ['logic', 5]]],
      ['교정과 전문의', 520, 9, 18, WK, 'focused', [['handiness', 5], ['logic', 6]]],
      ['교정과 과장', 680, 10, 18, WK, 'confident', [['handiness', 6], ['charisma', 4]]],
      ['교정 치과 원장', 880, 10, 18, [0, 1, 2, 3], 'confident', [['handiness', 7], ['charisma', 5]]],
      ['교정학 부교수', 1150, 10, 17, [0, 1, 2, 3], 'focused', [['handiness', 8], ['logic', 8]]],
      ['교정학 교수', 1550, 10, 16, [0, 1, 2, 3], 'confident'],
    ]],
    ['Dentist_Surgeon', '구강외과의', [
      ['구강외과 전공의', 410, 8, 18, WK, 'focused', [['handiness', 5], ['logic', 5]]],
      ['임플란트 전문의', 530, 8, 18, WK, 'focused', [['handiness', 6], ['logic', 6]]],
      ['구강악안면외과 전문의', 700, 8, 17, WK, 'focused', [['handiness', 7], ['logic', 7]]],
      ['구강외과 과장', 900, 9, 17, WK, 'confident', [['handiness', 8], ['charisma', 5]]],
      ['치과병원 진료부장', 1180, 9, 16, [0, 1, 2, 3], 'confident', [['handiness', 9], ['logic', 8]]],
      ['치과병원장', 1600, 10, 16, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('pharmacist', '약사', '💊', 'logic', 'focused', 'Midnitetech 약사(Pharmacist) 모드', [
    ['약국 보조원', 80, 9, 18, [0, 1, 2, 3, 4, 5], 'happy'],
    ['약대 실습생', 120, 9, 18, WK, 'focused', [['logic', 2]]],
    ['근무 약사', 190, 9, 19, [0, 1, 2, 3, 4, 5], 'focused', [['logic', 3], ['charisma', 2]]],
    ['관리 약사', 270, 9, 19, [0, 1, 2, 3, 4, 5], 'confident', [['logic', 4], ['charisma', 3]]],
  ], [
    ['Pharmacist_Community', '약국 경영', [
      ['약국장', 500, 9, 19, [0, 1, 2, 3, 4, 5], 'happy', [['charisma', 5], ['logic', 6]]],
      ['대형 약국장', 650, 9, 18, WK, 'confident', [['charisma', 6], ['logic', 6]]],
      ['약국 체인 본부장', 850, 9, 18, WK, 'confident', [['charisma', 7], ['logic', 7]]],
      ['약국 체인 대표', 1100, 10, 17, [0, 1, 2, 3], 'confident'],
    ]],
    ['Pharmacist_Research', '제약 연구원', [
      ['신약 연구원', 390, 9, 18, WK, 'focused', [['logic', 5], ['writing', 3]]],
      ['임상시험 책임자', 520, 9, 18, WK, 'focused', [['logic', 6], ['writing', 4]]],
      ['제약 연구소장', 690, 9, 18, WK, 'focused', [['logic', 7], ['writing', 5]]],
      ['신약 개발 본부장', 1200, 9, 17, WK, 'confident'],
    ]],
  ]),
  career('banker', '은행원', '🏦', 'logic', 'focused', 'Midnitetech 은행(Banking) 모드', [
    ['은행 인턴', 90, 9, 16, WK, 'happy'],
    ['행원', 130, 9, 17, WK, 'focused', [['logic', 2]]],
    ['대출 담당 행원', 195, 9, 18, WK, 'focused', [['logic', 3], ['charisma', 2]]],
    ['대리', 275, 9, 18, WK, 'confident', [['logic', 4], ['charisma', 3]]],
  ], [
    ['Banker_Branch', '지점장', [
      ['과장', 380, 9, 18, WK, 'confident', [['charisma', 5], ['logic', 4]]],
      ['차장', 500, 9, 18, WK, 'confident', [['charisma', 6], ['logic', 5]]],
      ['부지점장', 660, 9, 18, WK, 'confident', [['charisma', 7], ['logic', 6]]],
      ['지점장', 860, 9, 18, WK, 'confident', [['charisma', 8], ['logic', 7]]],
      ['지역 본부장', 1150, 9, 17, WK, 'confident', [['charisma', 9], ['logic', 8]]],
      ['부행장', 1600, 10, 17, [0, 1, 2, 3], 'confident'],
    ]],
    ['Banker_Investment', '투자 은행가', [
      ['투자 애널리스트', 400, 7, 18, WK, 'focused', [['logic', 5], ['writing', 3]]],
      ['어소시에이트', 530, 7, 18, WK, 'focused', [['logic', 6], ['writing', 4]]],
      ['VP (부장급)', 700, 7, 18, WK, 'confident', [['logic', 7], ['charisma', 5]]],
      ['디렉터 (이사)', 920, 8, 18, WK, 'confident', [['logic', 8], ['charisma', 6]]],
      ['매니징 디렉터 (전무)', 1200, 8, 17, WK, 'confident', [['logic', 9], ['charisma', 7]]],
      ['IB 부문 대표', 1650, 9, 17, [0, 1, 2, 3], 'focused'],
    ]],
  ]),
  career('accountant', '회계사', '🧮', 'logic', 'focused', 'Midnitetech 회계(Accounting) 모드', [
    ['경리 사원', 85, 9, 17, WK, 'focused'],
    ['회계 보조원', 125, 9, 17, WK, 'focused', [['logic', 2]]],
    ['수습 회계사', 195, 9, 18, WK, 'focused', [['logic', 3], ['writing', 2]]],
    ['공인회계사', 280, 9, 18, WK, 'confident', [['logic', 4], ['writing', 3]]],
  ], [
    ['Accountant_Audit', '감사 전문가', [
      ['감사 시니어', 390, 9, 18, WK, 'focused', [['logic', 5], ['charisma', 3]]],
      ['감사 매니저', 510, 9, 19, WK, 'focused', [['logic', 6], ['charisma', 4]]],
      ['시니어 매니저', 670, 9, 19, WK, 'focused', [['logic', 7], ['charisma', 5]]],
      ['감사 파트너', 870, 9, 18, WK, 'confident', [['logic', 8], ['charisma', 6]]],
      ['시니어 파트너', 1150, 9, 17, WK, 'confident', [['logic', 9], ['charisma', 7]]],
      ['회계법인 대표', 1550, 10, 17, [0, 1, 2, 3], 'focused'],
    ]],
    ['Accountant_Tax', '세무 전문가', [
      ['세무 시니어', 380, 9, 18, WK, 'focused', [['logic', 5], ['writing', 4]]],
      ['세무 매니저', 500, 9, 18, WK, 'focused', [['logic', 6], ['writing', 5]]],
      ['세무 시니어 매니저', 650, 9, 18, WK, 'focused', [['logic', 7], ['writing', 6]]],
      ['세무 파트너', 850, 9, 18, WK, 'confident', [['logic', 8], ['charisma', 5]]],
      ['조세 본부장', 1120, 9, 17, WK, 'confident', [['logic', 9], ['charisma', 6]]],
      ['세무법인 대표', 1500, 10, 17, [0, 1, 2, 3], 'focused'],
    ]],
  ]),
  career('realEstate', '부동산 중개인', '🏠', 'charisma', 'confident', 'Midnitetech 부동산(RealEstate) 모드', [
    ['중개 보조원', 75, 10, 18, [1, 2, 3, 4, 5], 'happy'],
    ['소속 공인중개사', 115, 10, 18, [1, 2, 3, 4, 5], 'confident', [['charisma', 2]]],
    ['선임 공인중개사', 185, 10, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 3], ['logic', 2]]],
  ], [
    ['RealEstate_Residential', '주거 전문 중개인', [
      ['아파트 전문 중개사', 370, 10, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 5], ['logic', 4]]],
      ['고급 주택 전문 중개사', 490, 10, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 6], ['logic', 5]]],
      ['개업 공인중개사', 650, 10, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 7], ['logic', 6]]],
      ['부동산 중개법인 대표', 1150, 10, 18, [1, 2, 3, 4], 'confident'],
    ]],
    ['RealEstate_Developer', '부동산 개발', [
      ['상가 전문 중개사', 380, 9, 18, WK, 'focused', [['logic', 5], ['charisma', 4]]],
      ['개발 컨설턴트', 500, 9, 18, WK, 'focused', [['logic', 6], ['charisma', 5]]],
      ['개발 사업 PM', 670, 9, 18, WK, 'focused', [['logic', 7], ['handiness', 4]]],
      ['디벨로퍼 대표', 1150, 9, 17, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('mechanic', '자동차 정비사', '🔧', 'handiness', 'focused', 'Midnitetech 정비소(AutoShop) 모드', [
    ['정비 견습생', 75, 8, 17, [0, 1, 2, 3, 4, 5], 'energized'],
    ['정비사', 115, 8, 17, [0, 1, 2, 3, 4, 5], 'focused', [['handiness', 2]]],
    ['숙련 정비사', 180, 8, 17, [0, 1, 2, 3, 4, 5], 'focused', [['handiness', 3], ['logic', 2]]],
  ], [
    ['Mechanic_Racing', '튜닝·레이싱 정비사', [
      ['튜닝 정비사', 360, 10, 19, [1, 2, 3, 4, 5], 'focused', [['handiness', 5], ['logic', 4]]],
      ['레이싱팀 정비사', 480, 10, 19, [2, 3, 4, 5, 6], 'energized', [['handiness', 6], ['logic', 5]]],
      ['레이싱팀 수석 정비사', 640, 10, 19, [2, 3, 4, 5, 6], 'focused', [['handiness', 7], ['logic', 6]]],
      ['레이싱팀 기술 감독', 1100, 10, 18, [3, 4, 5, 6], 'confident'],
    ]],
    ['Mechanic_Owner', '정비소 경영', [
      ['정비 반장', 350, 8, 18, WK, 'confident', [['handiness', 5], ['charisma', 3]]],
      ['정비 공장장', 470, 8, 18, WK, 'confident', [['handiness', 6], ['charisma', 4]]],
      ['정비소 대표', 620, 8, 18, WK, 'confident', [['charisma', 5], ['logic', 5]]],
      ['정비 프랜차이즈 대표', 1050, 9, 18, WK, 'confident'],
    ]],
  ]),
  career('farmer', '농부', '🌾', 'gardening', 'happy', 'Midnitetech 농부(CropFarmer) 모드', [
    ['농장 일손', 70, 6, 14, [0, 1, 2, 3, 4, 5], 'energized'],
    ['작물 재배사', 170, 6, 15, [0, 1, 2, 3, 4, 5], 'happy', [['gardening', 3], ['fitness', 2]]],
    ['농장 관리인', 245, 6, 15, [0, 1, 2, 3, 4, 5], 'happy', [['gardening', 4], ['handiness', 2]]],
  ], [
    ['Farmer_Organic', '친환경 농부', [
      ['친환경 농장주', 450, 6, 15, [0, 1, 2, 3, 4, 5], 'happy', [['gardening', 6], ['logic', 3]]],
      ['스마트팜 운영자', 600, 7, 15, WK, 'focused', [['gardening', 7], ['programming', 3]]],
      ['영농조합법인 대표', 950, 7, 15, WK, 'confident'],
    ]],
    ['Farmer_Orchard', '과수원·와이너리', [
      ['과수원 주인', 440, 6, 15, [0, 1, 2, 3, 4, 5], 'happy', [['gardening', 6], ['fitness', 4]]],
      ['와이너리 운영자', 590, 8, 16, [1, 2, 3, 4, 5], 'inspired', [['gardening', 7], ['mixology', 3]]],
      ['농산물 수출 기업 대표', 950, 8, 16, WK, 'confident'],
    ]],
  ]),
  career('graphicDesigner', '그래픽 디자이너', '🎨', 'painting', 'inspired', 'Midnitetech 그래픽 디자인(GraphicDesign) 모드', [
    ['디자인 인턴', 85, 10, 18, WK, 'inspired'],
    ['주니어 디자이너', 125, 10, 18, WK, 'inspired', [['painting', 2]]],
    ['그래픽 디자이너', 190, 10, 19, WK, 'inspired', [['painting', 3], ['programming', 2]]],
    ['선임 디자이너', 275, 10, 19, WK, 'focused', [['painting', 4], ['programming', 3]]],
  ], [
    ['Graphic_Brand', '브랜드 디자이너', [
      ['브랜드 디자이너', 380, 10, 19, WK, 'inspired', [['painting', 5], ['charisma', 3]]],
      ['아트 디렉터', 500, 10, 19, WK, 'inspired', [['painting', 6], ['charisma', 4]]],
      ['크리에이티브 디렉터', 670, 10, 19, WK, 'confident', [['painting', 7], ['charisma', 5]]],
      ['디자인 스튜디오 대표', 1150, 10, 18, [0, 1, 2, 3], 'confident'],
    ]],
    ['Graphic_Digital', 'UX·모션 디자이너', [
      ['UI/UX 디자이너', 390, 10, 19, WK, 'focused', [['programming', 4], ['painting', 5]]],
      ['모션 그래픽 디자이너', 510, 10, 19, WK, 'inspired', [['programming', 5], ['painting', 6]]],
      ['프로덕트 디자인 리드', 680, 10, 19, WK, 'focused', [['programming', 6], ['painting', 7]]],
      ['최고 디자인 책임자(CDO)', 1160, 10, 18, [0, 1, 2, 3], 'confident'],
    ]],
  ]),
  career('webtoonArtist', '웹툰 작가', '📚', 'painting', 'inspired', 'Midnitetech 만화·그래픽 노블(ComicsGraphicNovels) 모드', [
    ['웹툰 어시스턴트', 70, 11, 19, WK, 'inspired'],
    ['신인 웹툰 작가', 175, 12, 20, WK, 'inspired', [['painting', 3], ['writing', 2]]],
    ['연재 작가', 255, 12, 21, WK, 'inspired', [['painting', 4], ['writing', 3]]],
  ], [
    ['Webtoon_Story', '인기 웹툰 작가', [
      ['인기 연재 작가', 370, 12, 21, WK, 'inspired', [['writing', 5], ['painting', 5]]],
      ['드라마 원작 작가', 650, 12, 20, WK, 'confident', [['writing', 7], ['charisma', 4]]],
      ['웹툰 스튜디오 대표', 1100, 11, 19, WK, 'confident'],
    ]],
    ['Webtoon_Art', '작화가·일러스트레이터', [
      ['작화 전문 작가', 360, 12, 20, WK, 'focused', [['painting', 5], ['photography', 2]]],
      ['일러스트레이터', 470, 12, 20, WK, 'inspired', [['painting', 6], ['photography', 3]]],
      ['애니메이션 원화 감독', 1060, 11, 19, WK, 'focused'],
    ]],
  ]),
  career('hotelier', '호텔리어', '🏨', 'charisma', 'happy', 'Midnitetech 호텔(Hotel) 모드', [
    ['벨맨', 75, 7, 15, [0, 1, 2, 4, 5], 'energized'],
    ['프런트 직원', 115, 7, 15, [0, 1, 2, 4, 5], 'happy', [['charisma', 2]]],
    ['컨시어지', 180, 14, 22, [1, 2, 3, 5, 6], 'happy', [['charisma', 3], ['logic', 2]]],
    ['객실 매니저', 260, 8, 17, [0, 1, 2, 4, 5], 'confident', [['charisma', 4], ['logic', 3]]],
  ], [
    ['Hotelier_Manager', '호텔 경영', [
      ['프런트 오피스 매니저', 370, 8, 17, [0, 1, 2, 4, 5], 'confident', [['charisma', 5], ['logic', 4]]],
      ['객실 부장', 490, 8, 18, [0, 1, 2, 4, 5], 'confident', [['charisma', 6], ['logic', 5]]],
      ['부총지배인', 650, 8, 18, WK, 'confident', [['charisma', 7], ['logic', 6]]],
      ['총지배인', 860, 9, 18, WK, 'confident', [['charisma', 8], ['logic', 7]]],
      ['호텔 체인 지역 총괄', 1150, 9, 17, [0, 1, 2, 3], 'confident', [['charisma', 9], ['logic', 8]]],
      ['호텔 체인 대표이사', 1550, 10, 17, [0, 1, 2, 3], 'happy'],
    ]],
    ['Hotelier_Events', '연회·식음료', [
      ['연회 매니저', 360, 12, 21, [2, 3, 4, 5, 6], 'happy', [['charisma', 5], ['cooking', 3]]],
      ['레스토랑 지배인', 480, 12, 21, [2, 3, 4, 5, 6], 'happy', [['charisma', 6], ['cooking', 4]]],
      ['식음료 부장', 640, 10, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 7], ['mixology', 4]]],
      ['식음료 이사', 840, 10, 19, [1, 2, 3, 4, 5], 'confident', [['charisma', 8], ['logic', 6]]],
      ['리조트 총지배인', 1100, 10, 18, [0, 1, 2, 3], 'confident', [['charisma', 9], ['logic', 7]]],
      ['리조트 대표', 1480, 10, 17, [0, 1, 2, 3], 'happy'],
    ]],
  ]),
  career('tattooArtist', '타투이스트', '🖋️', 'painting', 'inspired', 'Midnitetech 바디 아티스트(BodyArtist) 모드', [
    ['타투숍 견습생', 70, 12, 20, [1, 2, 3, 4, 5], 'inspired'],
    ['타투이스트', 175, 12, 21, [1, 2, 3, 4, 5], 'inspired', [['painting', 3], ['handiness', 2]]],
    ['숙련 타투이스트', 255, 12, 21, [1, 2, 3, 4, 5], 'confident', [['painting', 4], ['handiness', 3]]],
  ], [
    ['Tattoo_Art', '아트 타투이스트', [
      ['커스텀 타투 아티스트', 360, 12, 21, [1, 2, 3, 4, 5], 'inspired', [['painting', 5], ['handiness', 4]]],
      ['인기 타투 아티스트', 480, 12, 21, [1, 2, 3, 4, 5], 'inspired', [['painting', 6], ['handiness', 5]]],
      ['타투 스튜디오 대표', 950, 12, 20, [2, 3, 4, 5], 'confident'],
    ]],
    ['Tattoo_Beauty', '뷰티 타투 전문가', [
      ['반영구 화장 전문가', 350, 10, 19, [1, 2, 3, 4, 5], 'focused', [['handiness', 4], ['painting', 5]]],
      ['뷰티 타투 강사', 620, 10, 18, WK, 'confident', [['handiness', 6], ['charisma', 5]]],
      ['반영구 아카데미 원장', 950, 10, 18, WK, 'confident'],
    ]],
  ]),
  career('tvHost', '방송 진행자', '🎙️', 'charisma', 'confident', 'Midnitetech 토크쇼 진행자(TalkShowHost) 모드', [
    ['방송국 FD', 80, 9, 18, WK, 'energized'],
    ['리포터', 120, 9, 18, WK, 'confident', [['charisma', 2]]],
    ['라디오 DJ', 185, 18, 24, [0, 1, 2, 3, 4], 'playful', [['charisma', 3], ['comedy', 2]]],
    ['프로그램 진행자', 270, 12, 21, WK, 'confident', [['charisma', 4], ['comedy', 3]]],
  ], [
    ['TvHost_TalkShow', '예능·토크쇼 MC', [
      ['아침 토크쇼 진행자', 380, 6, 14, WK, 'happy', [['charisma', 5], ['comedy', 4]]],
      ['예능 MC', 500, 13, 22, [2, 3, 4, 5, 6], 'playful', [['charisma', 6], ['comedy', 5]]],
      ['심야 토크쇼 진행자', 660, 17, 25, [0, 1, 2, 3], 'playful', [['charisma', 7], ['comedy', 6]]],
      ['국민 MC', 1300, 13, 21, [2, 3, 4, 5], 'confident'],
    ]],
    ['TvHost_News', '뉴스 앵커', [
      ['주말 뉴스 앵커', 380, 15, 22, [4, 5, 6], 'focused', [['charisma', 5], ['writing', 3]]],
      ['메인 뉴스 앵커', 510, 15, 22, WK, 'focused', [['charisma', 6], ['writing', 4]]],
      ['시사 프로그램 앵커', 680, 14, 22, WK, 'confident', [['charisma', 7], ['writing', 5]]],
      ['보도국장', 1250, 9, 18, WK, 'confident'],
    ]],
  ]),
  // E-sports is a sport of its own, not a rung on a software career (참고 게임 had pro gaming as the tech
  // guru's branch; ours splits it off): trainee to first team, then the player's or the coaching track.
  career('proGamer', '프로게이머', '🎮', 'videoGaming', 'focused', '참고 게임 기술 전문가의 프로게이머 갈래(TechGuru_Track2_Gaming)를 독립 직업으로 · 한국 e스포츠 게임단', [
    ['아마추어 랭커', 70, 14, 20, WK, 'focused'],
    ['게임단 연습생', 110, 13, 21, [0, 1, 2, 3, 4, 5], 'focused', [['videoGaming', 3]]],
    ['2군 선수', 180, 13, 21, [0, 1, 2, 3, 4, 5], 'focused', [['videoGaming', 4], ['logic', 2]]],
    ['1군 선수', 270, 13, 22, [1, 2, 3, 4, 5, 6], 'confident', [['videoGaming', 6], ['logic', 3]]],
  ], [
    ['ProGamer_Player', '선수', [
      ['주전 선수', 380, 13, 22, [1, 2, 3, 4, 5, 6], 'confident', [['videoGaming', 7], ['fitness', 2]]],
      ['팀 에이스', 520, 13, 22, [1, 2, 3, 4, 5, 6], 'confident', [['videoGaming', 8], ['charisma', 3]]],
      ['국가대표 선수', 720, 13, 21, [1, 2, 3, 4, 5], 'confident', [['videoGaming', 9], ['charisma', 4]]],
      ['세계 대회 우승 선수', 1150, 13, 21, [1, 2, 3, 4, 5], 'confident'],
    ]],
    ['ProGamer_Coach', '코칭 스태프', [
      ['전력 분석관', 360, 11, 20, WK, 'focused', [['logic', 5], ['videoGaming', 6]]],
      ['코치', 480, 12, 21, [1, 2, 3, 4, 5], 'focused', [['charisma', 4], ['logic', 6]]],
      ['수석 코치', 650, 12, 21, [1, 2, 3, 4, 5], 'confident', [['charisma', 5], ['logic', 7]]],
      ['감독', 1000, 12, 20, [1, 2, 3, 4, 5], 'confident'],
    ]],
  ]),
];
