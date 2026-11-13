import { CAREER_BY_ID, levelsOf } from './careers';
import type { WorkplaceDef } from './workplace';
import { stageOf, type StageAt, type WorkStage } from './workStages';

/**
 * Levels at work (docs/workplaces/PIPELINE.md 직장의 수준 차이, 2026-11-02, the user's pilot on three careers):
 * the workplace exists to raise what the player knows of a job, and a workplace holds people at several
 * levels, each doing work that shows it. By career and stage (the stages of workStages.ts `stageOf`, so the
 * rungs are the career's own): the titles, what the level is given, what it may judge, who it goes to when
 * stuck, and which of the workplace's work it does. A career not listed here is untouched by all of this.
 *
 * Two things follow from the table. A colleague has a rung that fits (`placeColleague`: derived from the
 * slot and their id, so an old save's colleagues get theirs on the next shift, with no new field), chooses
 * the work of it, and wears its title. And the same station asks something different of each level
 * (`variants`): 입문 does a defined check, 전문 judges the cause, 리더 decides; past 입문 the junior's work
 * isn't locked away but becomes a senior's (`seniors`).
 *
 * The content comes from the sources noted per career. What couldn't be confirmed was left out (see each note).
 */

export type RoleKey = 'junior' | 'common' | 'branch0' | 'branch1' | 'branch2' | 'lead0' | 'lead1';
/** Which version of a station's work: 입문, 실무, 전문, 리더. */
export type VariantTier = 'entry' | 'practice' | 'expert' | 'lead';

export interface WorkRole {
  /** 직함: exactly the career's rungs at this stage (a test holds them to the ladder). */
  titles: string[];
  /** 맡는 일. */
  tasks: string[];
  /** 판단할 수 있는 것. */
  judges: string[];
  /** 막히면 누구에게. */
  asks: string;
  /** The work of this level: interaction ids at the workplace. */
  does: string[];
  /** The people who come in this level may see to (the workplace's client socials). */
  socials?: string[];
}

export interface WorkVariant {
  label: string;
  icon?: string;
  /** Drawn at another use's place on the same piece (its pose and beats); only where that already reads right. */
  spotAs?: string;
}

export interface CareerRoles {
  /** Where this came from, and what was left out. */
  source: string;
  roles: Partial<Record<RoleKey, WorkRole>>;
  /** A rung's name on the name tag, where it's too long or has a plainer everyday name. */
  short?: Record<string, string>;
  /** Rungs that work elsewhere, so aren't drawn as colleagues on this lot (a 장학사 is at the education office). */
  elsewhere?: string[];
  /** People who work here off the ladder, by what they do: a coworker's `staff`. */
  staff?: Record<string, Omit<WorkRole, 'titles' | 'socials'>>;
  /** Where one rung's job differs from its row's (a student beside an intern; a 교감 beside a 장학사). */
  rungs?: Record<string, Partial<Omit<WorkRole, 'titles'>>>;
  /** The same station at each level, by interaction id. */
  variants: Record<string, Partial<Record<VariantTier, WorkVariant>>>;
  /** The junior's stage action, past 입문: not locked, this instead. */
  seniors: Record<string, WorkVariant>;
}

export const WORK_ROLES: Record<string, CareerRoles> = {
  semiconductor: {
    source:
      '공정 신입의 일과 부서 배치(직무 인터뷰 1건: 2022, 한 사람의 경험), 공정 엔지니어의 장비·생산팀 조율과 설비 쪽 과제(직무 교육 소개 페이지: 홍보성), 공정·설비 엔지니어의 일(제조사 뉴스룸 인터뷰 2017), 엔지니어와 오퍼레이터의 구분(취업 커뮤니티 답변). 전반적으로 근거가 약하다. 빠진 것: 공식 직업 자료, 오퍼레이터의 세부 권한, 로트 홀드 결재, 회사마다 다른 직급 이름. 수율 책임 엔지니어, 파트장, 총괄의 이름과 일은 근거 없이 게임에서 정한 것이다.',
    staff: {
      '라인 오퍼레이터': {
        tasks: ['웨이퍼 통을 받아 설비에 넣고 꺼내요', '세정, 코팅, 노광 설비가 도는 것을 지켜봐요', '이상이 보이면 엔지니어에게 알려요'],
        judges: ['설비가 정해진 대로 도는지', '엔지니어에게 알릴 일인지'],
        asks: '담당 엔지니어',
        does: ['fbFoup', 'fbWet', 'fbCoat', 'fbExpose'],
      },
    },
    short: { '수율 책임 엔지니어': '수율 책임자', '주니어 공정 엔지니어': '주니어 공정', '주니어 장비 엔지니어': '주니어 장비' },
    roles: {
      junior: {
        titles: ['팹 실습 인턴', '신입 공정 엔지니어', '신입 장비 엔지니어'],
        tasks: ['입사 교육을 받고 맡을 공정이나 장비에 배치돼요', '선임 곁에서 불량을 판독하고 데이터를 읽는 법을 익혀요'],
        judges: ['기준 안인지 밖인지', '선임에게 알릴 일인지'],
        asks: '선임 엔지니어',
        does: ['fbDefect', 'fbGas', 'fbYield', 'semiconductor_learnDefect'],
      },
      common: {
        titles: ['주니어 공정 엔지니어', '주니어 장비 엔지니어'],
        tasks: ['맡은 공정의 조건과 데이터를 매일 살펴요', '이상이 보이면 자료를 모아 선임과 함께 원인을 찾아요'],
        judges: ['데이터가 평소와 다른지', '어떤 자료를 더 모아야 할지'],
        asks: '선임 엔지니어',
        does: ['fbDefect', 'fbYield', 'fbYieldAlarm', 'semiconductor_learnDefect'],
      },
      branch0: {
        titles: ['공정 엔지니어', '선임 공정 엔지니어'],
        tasks: ['신제품을 양산할 수 있게 공정을 최적화해요', '수율과 품질을 높이려고 공정 조건을 표준화해요', '장비 엔지니어, 생산팀과 일을 조율해요'],
        judges: ['장비 조건, 재료, 앞 공정 중 어디가 원인에 가까운지', '레시피 조건을 어떻게 바꿔 시험할지'],
        asks: '수율 책임 엔지니어, 설계 쪽 담당자',
        does: ['fbRecipe', 'semiconductor_tuneOverlay', 'fbDefect', 'fbYield', 'fbYieldAlarm', 'semiconductor_learnDefect'],
      },
      branch1: {
        titles: ['장비 엔지니어', '선임 장비 엔지니어'],
        tasks: ['장비를 정비하고 다시 돌리기 전에 시험해요', '생산성을 떨어뜨리는 장비와 원인을 찾아 보고해요', '설비 알람이 울리면 해결해요'],
        judges: ['멈춘 장비의 원인이 어느 부품에 있는지', '정비 뒤 다시 돌려도 되는지'],
        asks: '장비 기술 파트장, 장비 업체',
        does: ['fbTeach', 'fbChamber', 'fbReticle', 'fbGas', 'semiconductor_fixRobot', 'semiconductor_learnDefect'],
      },
      lead0: {
        titles: ['수율 책임 엔지니어', '공정 기술 총괄'],
        tasks: ['수율 회의를 이끌어요', '어느 공정부터 손볼지 정해요'],
        judges: ['어느 문제부터 사람과 시간을 쓸지', '납기와 품질 사이에서 어떻게 할지'],
        asks: '팹 책임자, 다른 부서 책임자',
        does: ['semiconductor_leadYield', 'fbYield', 'fbDefect', 'fbRecipe'],
      },
      lead1: {
        titles: ['장비 기술 파트장', '팹 설비 총괄'],
        tasks: ['장비 정비 계획과 인력을 맡아요', '수율 회의에서 장비 쪽을 책임져요'],
        judges: ['어느 장비를 먼저 세우고 고칠지', '부품과 정비 일정을 어떻게 잡을지'],
        asks: '팹 책임자, 장비 업체',
        does: ['semiconductor_leadYield', 'fbYield', 'fbChamber', 'fbTeach'],
      },
    },
    rungs: {
      '팹 실습 인턴': {
        tasks: ['엔지니어 곁에서 라인과 방진 절차를 익혀요', '정해 준 불량 사진을 판독표와 맞춰 봐요'],
        judges: ['혼자 정하지 않고 담당 엔지니어에게 물어요'],
        asks: '담당 엔지니어',
        does: ['fbGown', 'fbShower', 'fbDefect', 'semiconductor_learnDefect'],
      },
      '신입 장비 엔지니어': { does: ['fbGas', 'fbTeach', 'semiconductor_learnDefect'] },
      '주니어 장비 엔지니어': {
        tasks: ['맡은 장비의 생산성을 매일 살펴요', '설비 알람이 울리면 선임과 함께 해결해요'],
        judges: ['장비가 평소와 다른지', '바로 세워야 할 일인지 선임에게 물을지'],
        does: ['fbGas', 'fbTeach', 'fbChamber', 'fbDefect'],
      },
    },
    variants: {
      fbDefect: {
        entry: { label: '판독표대로 불량 표시하기' },
        expert: { label: '불량 위치로 원인 장비 좁히기', icon: '🧭' },
        lead: { label: '불량 보고 웨이퍼 처리 정하기', icon: '🧭' },
      },
      fbYield: {
        entry: { label: '수율 숫자 확인해 올리기' },
        expert: { label: '수율이 떨어진 원인 따져 보기', icon: '🧭' },
        lead: { label: '어느 공정부터 손볼지 정하기', icon: '🧭', spotAs: 'semiconductor_leadYield' },
      },
      fbRecipe: {
        expert: { label: '레시피 조건 바꿔 시험하기', icon: '🧭' },
        lead: { label: '새 레시피 쓸지 정하기', icon: '🧭' },
      },
    },
    seniors: { semiconductor_learnDefect: { label: '후배 불량 판독 봐주기', icon: '🤝' } },
  },

  doctor: {
    source:
      '전문의 수련 규정 제2조, 전공의법(지도전문의), 2024년 통신사 기사(인턴은 소독·채혈·수술 준비·환자 명단 관리, 레지던트는 입원 환자 관리·차트·수술 보조, 연차가 쌓이면 외래와 작은 수술, 전임의는 전문의 뒤 1~2년 세부 전공 수련·외래·입원과 전원 결정·교수 대신 집도), 의료 전문지(과장은 임기 있는 보직, 병원장 임기: 2011~2019년 기사). 빠진 것: 치료 내용은 쓰지 않는다. 조교수·부교수·교수의 직무 차이, 수석 레지던트의 공식 역할은 확인하지 못해 같은 줄로 두거나 연차가 쌓인 레지던트의 일로만 썼다. 과장과 병원장을 교수 위 칸에 둔 것은 게임의 단순화이다. 내과 전공의 수련에 상부 내시경이 들어간 것은 2017년부터(의료 전문지 기사); 연차별 건수는 확인하지 못했다. 내시경 세척·소독은 내시경실 간호사의 일이라 의사의 일로 넣지 않았다.',
    short: { '외과 레지던트': '외과 전공의', '내과 레지던트': '내과 전공의', '외과 수석 레지던트': '외과 수석 전공의', '내과 수석 레지던트': '내과 수석 전공의' },
    roles: {
      junior: {
        titles: ['의대 실습생', '인턴'],
        tasks: ['여러 과를 돌며 수련해요', '소독, 채혈, 수술 준비, 환자 명단 관리를 맡아요'],
        judges: ['위 연차에게 바로 알릴 일인지'],
        asks: '위 연차 전공의, 지도전문의',
        does: ['drDrawBlood', 'xwDressWound', 'drPatientList', 'drPrepTheatre', 'drScrubIn', 'drCheckMonitor', 'doctor_roundsNotes'],
        socials: ['examinePatient'],
      },
      common: {
        titles: ['외과 레지던트', '외과 수석 레지던트', '내과 레지던트', '내과 수석 레지던트'],
        tasks: ['전공 과에서 입원 환자를 돌보고 차트를 써요', '당직을 서요'],
        judges: ['연차에 맞는 범위의 처치', '위 연차나 전문의에게 보고할 일인지'],
        asks: '위 연차 전공의, 지도전문의',
        does: ['writeChart', 'xwPrescribe', 'xwFamilyTalk', 'reviewLabs', 'readXray', 'drCheckMonitor', 'doctor_wardDuty', 'doctor_roundsNotes'],
        socials: ['examinePatient'],
      },
      branch0: {
        titles: ['외과 전문의', '외과 전임의', '외과 조교수', '외과 부교수', '외과 교수'],
        tasks: ['외래에서 환자를 보고 수술을 집도해요', '전공의를 지도해요'],
        judges: ['수술할지와 수술 계획', '입원과 전원, 다른 과와 상의할 일'],
        asks: '과장, 같은 분야 교수',
        does: ['performSurgery', 'drScrubIn', 'doctor_suturePractice', 'readXray', 'writeChart', 'xwFamilyTalk', 'doctor_roundsNotes'],
        socials: ['examinePatient', 'diagnosePatient'],
      },
      branch1: {
        titles: ['내과 전문의', '내과 전임의', '내과 조교수', '내과 부교수', '내과 교수'],
        tasks: ['외래와 병동에서 환자의 진단과 치료를 맡아요', '전공의를 지도해요'],
        judges: ['진단과 치료 계획', '입원과 전원, 다른 과와 상의할 일'],
        asks: '과장, 같은 분야 교수, 다른 과',
        does: ['doctor_chronicCare', 'drEndoscopy', 'drEndoReport', 'reviewLabs', 'readXray', 'drReadUltrasound', 'writeChart', 'xwFamilyTalk', 'doctor_roundsNotes'],
        socials: ['examinePatient', 'diagnosePatient'],
      },
      lead0: {
        titles: ['외과 과장', '병원장'],
        tasks: ['교수가 임기 동안 맡는 보직으로 과를 꾸려요', '증례 회의를 이끌고 환자도 계속 봐요'],
        judges: ['의견이 갈리는 증례의 방향', '과의 일과 사람을 어떻게 나눌지'],
        asks: '다른 과 과장, 병원장',
        does: ['doctor_caseConference', 'performSurgery', 'drScrubIn', 'readXray', 'writeChart'],
      },
      lead1: {
        titles: ['내과 과장', '병원장'],
        tasks: ['교수가 임기 동안 맡는 보직으로 과를 꾸려요', '증례 회의를 이끌고 환자도 계속 봐요'],
        judges: ['의견이 갈리는 증례의 방향', '과의 일과 사람을 어떻게 나눌지'],
        asks: '다른 과 과장, 병원장',
        does: ['doctor_caseConference', 'doctor_chronicCare', 'drEndoscopy', 'readXray', 'reviewLabs', 'writeChart'],
      },
    },
    rungs: {
      '의대 실습생': {
        tasks: ['지도교수 곁에서 회진과 진료를 보며 배워요', '병력 듣기를 연습해요'],
        judges: ['면허 전이라 혼자 정하지 않고 지도교수에게 물어요'],
        asks: '지도교수, 전공의',
        does: ['doctor_roundsNotes'],
        socials: ['examinePatient'],
      },
      // A surgical resident is in theatre; a medical one learns procedures instead (2026-11-04, at the user's request: 내과 read as if it
      // had the surgeons' work). Upper endoscopy has been in the 내과 residents' training since 2017 (의료 전문지); in which year and how
      // many wasn't confirmed, so the resident writes the reports and the senior resident scopes under supervision.
      '외과 레지던트': {
        tasks: ['외과 병동 입원 환자를 돌보고 차트를 써요', '당직을 서고 수술에 들어가 보조해요'],
        does: ['writeChart', 'xwPrescribe', 'xwFamilyTalk', 'reviewLabs', 'readXray', 'drCheckMonitor', 'drScrubIn', 'doctor_wardDuty', 'doctor_roundsNotes'],
      },
      '내과 레지던트': {
        tasks: ['내과 병동 입원 환자를 돌보고 차트를 써요', '당직을 서고, 위 연차 곁에서 내시경 같은 시술을 배워요'],
        does: ['writeChart', 'xwPrescribe', 'xwFamilyTalk', 'reviewLabs', 'readXray', 'drCheckMonitor', 'drReadUltrasound', 'drEndoReport', 'doctor_wardDuty', 'doctor_roundsNotes'],
      },
      '외과 수석 레지던트': {
        tasks: ['입원 환자를 맡고 외래 진료도 해요', '작은 수술은 직접 집도하기도 해요'],
        does: ['writeChart', 'xwFamilyTalk', 'reviewLabs', 'readXray', 'drScrubIn', 'performSurgery', 'doctor_wardDuty', 'doctor_roundsNotes'],
        socials: ['examinePatient', 'diagnosePatient'],
      },
      '내과 수석 레지던트': {
        tasks: ['입원 환자를 맡고 외래 진료도 해요', '지도 아래 위내시경을 직접 하고, 아래 연차의 일을 함께 살펴요'],
        does: ['writeChart', 'xwFamilyTalk', 'reviewLabs', 'readXray', 'drReadUltrasound', 'drEndoscopy', 'drEndoReport', 'doctor_wardDuty', 'doctor_roundsNotes'],
        socials: ['examinePatient', 'diagnosePatient'],
      },
      '외과 전임의': { tasks: ['전문의가 된 뒤 1~2년 세부 전공을 수련해요', '외래를 보고 교수 대신 수술을 집도하기도 해요'] },
      '내과 전임의': { tasks: ['전문의가 된 뒤 1~2년 세부 전공을 수련해요', '외래와 입원 환자를 보고 입원과 전원을 정해요'] },
      병원장: {
        tasks: ['임기 동안 병원 운영 전체를 맡아요', '부원장과 보직자들과 병원을 꾸려 가요'],
        judges: ['병원 운영의 방향', '보직을 누구에게 맡길지'],
        asks: '병원 이사회나 운영진',
      },
    },
    variants: {
      readXray: {
        entry: { label: '영상이 그 환자 것인지 확인하기' },
        practice: { label: '영상 판독해 소견 쓰기' },
        expert: { label: '영상과 증상 맞춰 원인 따져 보기', icon: '🧭' },
        lead: { label: '증례 모아 방향 정하기', icon: '🧭', spotAs: 'doctor_caseConference' },
      },
      writeChart: {
        entry: { label: '지시와 경과 빠짐없이 기록하기', spotAs: 'doctor_roundsNotes' },
        expert: { label: '경과 보고 진단 다시 따져 보기', icon: '🧭' },
        lead: { label: '협진·퇴원 여부 정하기', icon: '🧭' },
      },
      drEndoscopy: {
        practice: { label: '지도받으며 위내시경 하기' },
        expert: { label: '위내시경 하며 조직 검사할 곳 정하기', icon: '🧭' },
        lead: { label: '어려운 내시경 시술 맡아 하기', icon: '🧭' },
      },
      reviewLabs: {
        entry: { label: '검사 수치 범위 확인하기' },
        expert: { label: '검사 결과로 원인 좁히기', icon: '🧭' },
        lead: { label: '더 검사할지 정하기', icon: '🧭' },
      },
    },
    seniors: { doctor_roundsNotes: { label: '후배 회진 기록 검토하기', icon: '🤝' } },
  },

  teacher: {
    source:
      '초·중등교육법 제19조(보직교사는 자격이 아니라 교무를 분담하는 직책), 제20조(교장, 교감, 수석교사, 교사의 임무), 교육공무원법 제29조의4(수석교사 4년마다 재심사, 임기 중 교장·교감 자격 취득 불가: 2016년 판 사본), 수석교사 활동과 수업 50% 경감(2022 기고), 전직 규정(2026 인사 실무 연재), 장학사의 공문 업무(2000 현직 기고: 오래됨), 학생생활지도 고시와 교육부 안내. 빠진 것: 장학관·교육장의 직무 조항, 기간제의 구체적 권한, 부장의 종류(교장이 정함). 1급과 2급은 자격 차이로, 하는 일의 차이는 확인하지 못했다. 교육 전문직과 학교 사이의 전직은 실제로 있으나 게임에 넣지 않았다. 대학 교수는 교사의 승진 경로가 아니어서 뺐다.',
    elsewhere: ['장학사', '장학관', '교육장'],
    roles: {
      junior: {
        titles: ['교생 실습생', '기간제 교사', '2급 정교사'],
        tasks: ['수업과 생활지도를 맡고 담임을 하기도 해요', '선배 수업을 보며 익혀요'],
        judges: ['우리 반 학생에게 조언할지 주의를 줄지', '선배나 부장과 상의할 일인지'],
        asks: '학년 부장, 선배 교사',
        does: ['teachLesson', 'planLesson', 'gradePapers', 'checkHomework', 'clsTakeAttendance', 'clsPraiseChart', 'xwSchoolRecord', 'xwCallParent', 'xwClassDuty', 'teacher_observeClass'],
        socials: ['answerQuestion', 'praiseStudent', 'tutorStudent'],
      },
      common: {
        titles: ['1급 정교사', '부장 교사'],
        tasks: ['수업과 담임을 맡고 생활지도를 해요', '우리 반과 맡은 일을 스스로 꾸려 가요'],
        judges: ['우리 반에 맞는 수업 방법', '상담으로 풀지 교감과 상의할지'],
        asks: '부장, 교감',
        does: ['teachLesson', 'planLesson', 'gradePapers', 'checkHomework', 'clsTakeAttendance', 'clsPlayVideo', 'teacher_homeroom', 'xwSchoolRecord', 'xwCallParent', 'xwClassDuty', 'teacher_observeClass'],
        socials: ['answerQuestion', 'praiseStudent', 'tutorStudent'],
      },
      branch1: {
        titles: ['장학사'],
        tasks: ['교육청에서 학교에 보낼 공문을 쓰고 보고를 모아요', '학교를 찾아 장학 지도를 하고 수업을 함께 살펴요'],
        judges: ['학교의 계획에 어떤 도움이 필요한지', '위로 보고할 일인지'],
        asks: '장학관, 교육장',
        does: ['teacher_reviewSchools', 'teacher_officialDoc', 'planLesson', 'gradePapers', 'edVisitPlan'],
      },
      branch2: {
        titles: ['수석교사'],
        tasks: ['수업을 절반 정도로 줄여 맡으며 계속 가르쳐요', '동료 교사의 수업을 돕고 신임 교사와 교생을 지도해요', '공개 수업을 하고 연수와 교과 연구를 이끌어요'],
        judges: ['수업 방법을 어떻게 고칠지 함께 찾기', '어떤 연수와 자료가 필요한지'],
        asks: '교장',
        does: ['teacher_coachTeachers', 'teacher_openLesson', 'teachLesson', 'planLesson', 'teacher_observeClass'],
        socials: ['answerQuestion', 'praiseStudent', 'tutorStudent'],
      },
      lead0: {
        titles: ['교감', '교장'],
        tasks: ['교무를 총괄하고 교직원을 지도·감독해요', '어려운 민원의 책임을 지고 학생도 교육해요'],
        judges: ['학교 교육의 방향', '민원을 어떻게 처리할지'],
        asks: '교육지원청',
        does: ['teacher_facultyMeeting', 'teacher_schoolPlan', 'planLesson', 'teacher_observeClass'],
      },
      lead1: {
        titles: ['장학관', '교육장'],
        tasks: ['교육청의 장학 업무를 이끌어요', '지역 학교들의 교육 방향을 잡아요'],
        judges: ['어느 학교와 사업에 먼저 힘을 쓸지'],
        asks: '교육장, 교육감',
        does: ['teacher_districtPlan', 'teacher_reviewSchools', 'planLesson'],
      },
    },
    rungs: {
      '교생 실습생': {
        tasks: ['지도 교사의 수업을 보고 배워요', '지도 교사 아래에서 수업을 해 봐요'],
        judges: ['혼자 정하지 않고 지도 교사에게 물어요'],
        asks: '지도 교사',
        does: ['teacher_observeClass', 'clsTakeAttendance', 'planLesson'],
        socials: ['answerQuestion', 'praiseStudent'],
      },
      '부장 교사': {
        tasks: ['수업을 하면서 학교 일 한 부문을 나눠 맡아요', '부서 선생님들의 일을 조율해요'],
        judges: ['맡은 부문의 일을 어떻게 나눌지', '교감과 상의할 일인지'],
        asks: '교감',
        does: ['teacher_officialDoc', 'teachLesson', 'planLesson', 'gradePapers', 'teacher_homeroom', 'teacher_observeClass'],
      },
      교감: {
        tasks: ['교장을 도와 교무를 관리해요', '교장이 없을 때 직무를 대신하고 학생도 교육해요'],
        judges: ['학교 일을 어떻게 나눌지', '교장에게 올릴 일인지'],
        asks: '교장',
      },
      장학관: { tasks: ['교육청에서 장학사의 일을 이끌어요', '과를 맡아 학교 교육 계획을 함께 잡기도 해요'], asks: '교육장' },
      교육장: {
        tasks: ['교육지원청을 이끌어요', '지역 학교의 교육을 살펴요'],
        judges: ['지역 교육의 방향'],
        asks: '교육감',
      },
    },
    variants: {
      gradePapers: {
        entry: { label: '채점 기준표대로 채점하기' },
        practice: { label: '우리 반 오답 경향 살피기' },
        expert: { label: '평가 결과로 부족한 까닭 따져 보기', icon: '🧭' },
        lead: { label: '학교 평가 계획 정하기', icon: '🧭', spotAs: 'teacher_facultyMeeting' },
      },
      planLesson: {
        entry: { label: '지도안 양식대로 수업안 쓰기' },
        practice: { label: '우리 반에 맞게 수업 고치기' },
        expert: { label: '수업이 왜 안 통했는지 따져 보기', icon: '🧭' },
        lead: { label: '학교 교육 과정 방향 정하기', icon: '🧭' },
      },
      teachLesson: {
        entry: { label: '지도안대로 수업하기' },
        practice: { label: '반 분위기 보며 수업하기' },
        expert: { label: '수업 방법 바꿔 가며 가르치기', icon: '🧭' },
        lead: { label: '공개 수업 방향 정하기', icon: '🧭', spotAs: 'teacher_observeClass' },
      },
    },
    seniors: { teacher_observeClass: { label: '후배 수업 보고 조언하기', icon: '🤝' } },
  },
};

/** The careers in the pilot. */
export const hasWorkRoles = (careerId: string) => !!WORK_ROLES[careerId];
/** Whether a career's junior work stays open past 입문, as the senior's version. */
export const hasSeniorWork = (careerId: string) => !!WORK_ROLES[careerId] && Object.keys(WORK_ROLES[careerId].seniors).length > 0;

/** The table's row for a stage. */
export function roleKeyOf(at: Pick<StageAt, 'stage' | 'branch'>): RoleKey {
  if (at.stage === 0) return 'junior';
  if (at.stage === 2) return at.branch === 1 ? 'lead1' : 'lead0';
  if (at.branch === undefined) return 'common';
  return at.branch === 2 ? 'branch2' : at.branch === 1 ? 'branch1' : 'branch0';
}

/** What a stage's row says, with what's different for one rung when it's known. */
export function roleAt(careerId: string, at: Pick<StageAt, 'stage' | 'branch'> & { rung?: string }): WorkRole | undefined {
  const row = WORK_ROLES[careerId]?.roles[roleKeyOf(at)];
  const own = at.rung ? WORK_ROLES[careerId].rungs?.[at.rung] ?? WORK_ROLES[careerId].staff?.[at.rung] : undefined;
  return row && own ? { ...row, ...own } : row;
}

const TIER: Record<WorkStage, VariantTier> = { 0: 'entry', 1: 'expert', 2: 'lead' };

/**
 * What an interaction is at this level, or nothing where it's as written: the senior's version of a
 * junior's action, else the station's own for this level. 실무 without its own takes 전문's: it has left the check behind.
 */
export function workVariant(careerId: string, inter: { id: string; workStage?: { stage: number } }, at: Pick<StageAt, 'stage' | 'branch'>): WorkVariant | undefined {
  const roles = WORK_ROLES[careerId];
  if (!roles) return undefined;
  if (at.stage > 0 && roles.seniors[inter.id]) return roles.seniors[inter.id];
  const v = roles.variants[inter.id];
  if (!v) return undefined;
  if (at.stage === 1 && at.branch === undefined) return v.practice ?? v.expert;
  return v[TIER[at.stage]];
}

/** A rung's name as the tag shows it. */
export function shortTitle(careerId: string, title: string): string {
  return WORK_ROLES[careerId]?.short?.[title] ?? title;
}

/** `한도윤 · 전공의`: a colleague's tag at work. */
export const colleagueTag = (name: string, title: string) => `${name} · ${title}`;

// ---- colleagues ----

/** Same id, same number (an id is all an old save's colleague is known by). */
function mix(id: number): number {
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The rung of a colleague: the boss's own by the title in their name (강민호 과장 → 외과 과장); the others
 * spread by their place among the non-bosses, so a workplace always has someone new beside someone
 * further on: the first 입문 (past the very first rung, as ever), the next 실무 or a branch's 전문.
 */
export function colleagueRung(careerId: string, nonBossIndex: number, id: number, bossName?: string): { level: number; branch?: number } | null {
  const career = CAREER_BY_ID[careerId];
  if (!career || !WORK_ROLES[careerId] || !career.branches?.length) return null;
  const shared = career.levels.length;
  const h = mix(id);
  if (bossName !== undefined) {
    const full = bossName.trim().split(/\s+/).slice(1).join(' ');
    const last = full.split(' ').pop() ?? '';
    const rungs = career.branches.flatMap((b, branch) => b.levels.map((l, i) => ({ title: l.title, level: shared + i, branch })));
    const found = rungs.find((r) => r.title === full) ?? rungs.find((r) => last && r.title.endsWith(last));
    if (found) return { level: found.level, branch: found.branch };
    return { level: shared + career.branches[0].levels.length - 1, branch: 0 };
  }
  // Every rung of the career, with the branch it's in: a branch can start before 전문.
  const all: Array<{ level: number; branch?: number }> = [
    ...career.levels.map((_, level) => ({ level })),
    ...career.branches.flatMap((b, branch) => b.levels.map((_, i) => ({ level: shared + i, branch }))),
  ];
  const at = (r: { level: number; branch?: number }) => stageOf({ careerId, ...r });
  if (nonBossIndex % 2 === 0) {
    const juniors = all.filter((r) => r.level > 0 && at(r).stage === 0);
    return juniors.length ? juniors[h % juniors.length] : { level: 0 };
  }
  const practice = all.filter((r) => { const a = at(r); return a.stage === 1 && a.branch === undefined; });
  if (practice.length && (h & 1) === 0) return practice[(h >>> 1) % practice.length];
  const away = new Set(WORK_ROLES[careerId].elsewhere);
  const experts = all.filter((r) => { const a = at(r); return a.stage === 1 && a.branch !== undefined && !away.has(levelsOf(career, r.branch)[r.level].title); });
  return experts[(h >>> 1) % experts.length];
}

type Colleague = { id: number; job?: { careerId: string; level: number; branch?: number }; workmate?: { careerId: string; slot: number; boss?: boolean; staff?: string }; star?: unknown; episodeOf?: number };

/**
 * Puts a colleague on the rung that fits (drawn or from an old save, whose levels were random and of the
 * shared ladder only; the same answer every time, so it's safe each shift). Other careers: nothing changes.
 */
export function placeColleague(def: WorkplaceDef, t: Colleague) {
  if (!t.workmate || t.star || t.episodeOf !== undefined) return;
  const spec = def.coworkers[t.workmate.slot];
  if (!spec || spec.staff) return;
  const nonBoss = def.coworkers.slice(0, t.workmate.slot).filter((c) => !c.boss).length;
  const rung = colleagueRung(def.careerId, nonBoss, t.id, spec.boss ? spec.name : undefined);
  if (rung) t.job = { careerId: def.careerId, ...rung };
}

/** What a colleague brings to the lot: their stage (a boss runs the place, whatever their rung's stage), and the title for the tag (a boss's is in their name). */
export interface ColleagueRung {
  stage: WorkStage;
  branch?: number;
  title?: string;
  /** The rung's full name, for what's different about it (`WorkRole` by `rungs`). */
  rung?: string;
}

export function colleagueAt(t: Colleague): ColleagueRung | undefined {
  const careerId = t.workmate?.careerId;
  if (!careerId || !WORK_ROLES[careerId] || t.star || t.episodeOf !== undefined || !t.job || t.job.careerId !== careerId) return undefined;
  if (t.workmate!.staff) return { stage: 0, title: t.workmate!.staff, rung: t.workmate!.staff };
  const at = stageOf(t.job);
  const rung = levelsOf(CAREER_BY_ID[careerId], t.job.branch)[t.job.level];
  if (t.workmate!.boss) return { stage: 2, ...(t.job.branch !== undefined ? { branch: t.job.branch } : {}), ...(rung ? { rung: rung.title } : {}) };
  return { stage: at.stage, ...(at.branch !== undefined ? { branch: at.branch } : {}), ...(rung ? { title: shortTitle(careerId, rung.title), rung: rung.title } : {}) };
}

const ALLOWED = new Map<string, Set<string>>();
/** The stations' work this colleague's level does, or null for no such thing (other careers, an old save's shift under way). */
export function allowedWork(careerId: string, rung: ColleagueRung | undefined): ReadonlySet<string> | null {
  if (!rung) return null;
  const role = roleAt(careerId, rung);
  if (!role) return null;
  const key = `${careerId}:${roleKeyOf(rung)}:${rung.rung ?? ''}`;
  let set = ALLOWED.get(key);
  if (!set) ALLOWED.set(key, (set = new Set(role.does)));
  return set;
}
