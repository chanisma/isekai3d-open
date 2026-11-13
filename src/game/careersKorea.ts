import type { Career, CareerLevel } from './careers';
import { MINOR_SKILLS } from './constants';
import type { EmotionKey, SkillKey } from './types';

/**
 * Everyday Korean jobs the game didn't have yet (ours): picked from the job fields the career list
 * left empty when set against 한국고용직업분류 (public service, welfare and care, health, education
 * services, transport, the trades, fishing and forestry, sales and services), with real Korean
 * ranks where the job has them (공무원 9급 서기보…, 우정직, 교정직, 해양경찰 계급). No game data
 * exists for these, so ladders, pay and hours are ours, built like careerMods.ts: shared rungs,
 * then two branches, base performance 60 down to 6 spread over the ladder.
 */

const WK = [0, 1, 2, 3, 4];
/** 참고 게임 base_performance by level, 60 at the bottom to 6 at the top. */
const BASE = [60, 50, 40, 30, 20, 15, 10, 8, 7, 6];
const perfAt = (i: number, n: number) => BASE[n >= BASE.length ? Math.min(i, BASE.length - 1) : Math.round((i * (BASE.length - 1)) / (n - 1))];

export interface JobSpec {
  /** Main skill (the career's) and the second skill the shared rungs ask for. */
  skills: [SkillKey, SkillKey];
  shared: string[];
  /** Branch id, name, titles (all branches the same length) and the second skill it asks for. */
  branches: Array<[string, string, string[], SkillKey]>;
  /** Shift hours (past 24 runs into the next day) and days (0 = Monday). */
  hours: [number, number];
  days?: number[];
  /** Pay a shift at the bottom and at the top. */
  pay: [number, number];
}

/**
 * A ladder from a spec: pay climbs evenly (by ratio) from the bottom to the top, the main skill asked
 * for climbs from 2 to 10 over the middle rungs and the second skill from 2 to 7; the bottom and top
 * rungs ask for nothing.
 */
export function job(id: string, name: string, icon: string, emotion: EmotionKey, inspired: string, spec: JobSpec): Career {
  const s = spec.shared.length;
  const n = s + spec.branches[0][2].length;
  for (const b of spec.branches) if (s + b[2].length !== n) throw new Error(`${id}: branches differ in length`);
  const [main, second] = spec.skills;
  const cap = (k: SkillKey, v: number) => Math.min(v, MINOR_SKILLS.has(k) ? 5 : 10);
  const rung = (title: string, k: number, other: SkillKey): CareerLevel => {
    const needs: Array<[SkillKey, number]> = [];
    if (k > 0 && k < n - 1) {
      needs.push([main, cap(main, Math.round(2 + ((k - 1) * 8) / Math.max(1, n - 3)))]);
      if (k >= 2) needs.push([other, cap(other, Math.round(2 + ((k - 2) * 5) / Math.max(1, n - 4)))]);
    }
    return {
      title,
      pay: Math.round(spec.pay[0] * (spec.pay[1] / spec.pay[0]) ** (k / (n - 1))),
      start: Math.round(spec.hours[0] * 60),
      end: Math.round(spec.hours[1] * 60),
      days: spec.days ?? WK,
      basePerf: perfAt(k, n),
      mood: emotion,
      ...(needs.length ? { needs } : {}),
    };
  };
  return {
    id,
    name,
    icon,
    skill: main,
    emotion,
    inspired,
    levels: spec.shared.map((t, k) => rung(t, k, second)),
    branches: spec.branches.map(([bid, bname, titles, other]) => ({ id: bid, name: bname, levels: titles.map((t, k) => rung(t, s + k, other)) })),
  };
}

export const KOREA_CAREERS: Career[] = [
  // ---- 공공·행정 ----
  job('civilServant', '행정 공무원', '🏛️', 'focused', '국가·지방 공무원 일반행정직 (공무원임용령 직급)', {
    skills: ['logic', 'writing'],
    shared: ['시보 공무원 (9급)', '서기보 (9급)', '서기 (8급)', '주사보 (7급)'],
    branches: [
      ['Civil_Admin', '일반 행정', ['주사 (6급)', '사무관 (5급)', '서기관 (4급)', '부이사관 (3급)', '이사관 (2급)', '관리관 (1급)'], 'charisma'],
      ['Civil_Policy', '정책 기획', ['정책 주무관 (6급)', '정책 사무관 (5급)', '정책 과장 (서기관)', '정책 국장 (부이사관)', '기획조정실장 (이사관)', '차관보 (관리관)'], 'writing'],
    ],
    hours: [9, 18],
    pay: [85, 1250],
  }),
  job('mailCarrier', '집배원', '📮', 'energized', '우정사업본부 우정직 공무원·집배원', {
    skills: ['fitness', 'charisma'],
    shared: ['우편 분류 보조', '계약 집배원', '집배원 (우정 9급)', '선임 집배원 (우정 8급)'],
    branches: [
      ['Mail_Delivery', '집배', ['집배팀장 (우정 7급)', '집배실장 (우정 6급)', '우편물류센터 관리자', '우편집중국장'], 'logic'],
      ['Mail_Window', '우체국 창구', ['우편 창구 주무관', '우체국 금융 주무관', '우체국 팀장', '우체국장'], 'logic'],
    ],
    hours: [8, 17],
    pay: [80, 1000],
  }),
  job('correctionsOfficer', '교정공무원', '🔐', 'focused', '법무부 교정직 공무원 (교도·교사·교위·교감·교정관)', {
    skills: ['fitness', 'charisma'],
    shared: ['교정직 교육생', '교도', '교사', '교위'],
    branches: [
      ['Corr_Security', '보안 교정', ['교감', '보안과장 (교정관)', '보안 담당 서기관', '교도소 부소장', '교도소장', '지방교정청장'], 'logic'],
      ['Corr_Rehab', '교화·사회복귀', ['교화 담당 교감', '사회복귀과장 (교정관)', '교육교화 서기관', '심리치료센터장', '교화 담당 부이사관', '교정본부 교정정책단장'], 'writing'],
    ],
    hours: [8, 18],
    pay: [90, 1250],
  }),
  job('coastGuard', '해양경찰', '⚓', 'confident', '해양경찰청 경찰공무원 (순경~치안감)', {
    skills: ['fitness', 'logic'],
    shared: ['해양경찰교육원 교육생', '순경', '경장', '경사'],
    branches: [
      ['Coast_Rescue', '구조·안전', ['구조대원 (경위)', '구조대장 (경감)', '구조안전과장 (경정)', '해양경찰서장 (총경)', '지방해경청 차장 (경무관)', '지방해양경찰청장 (치안감)'], 'handiness'],
      ['Coast_Patrol', '경비함정', ['항해팀장 (경위)', '경비함정 부함장 (경감)', '경비함정 함장 (경정)', '대형 함정 함장 (총경)', '해역방어사령관 (경무관)', '경비국장 (치안감)'], 'fishing'],
    ],
    hours: [8, 20],
    days: [0, 2, 4],
    pay: [90, 1350],
  }),
  job('customsOfficer', '관세 공무원', '🛃', 'focused', '관세청 관세직 공무원', {
    skills: ['logic', 'charisma'],
    shared: ['세관 실습생', '관세서기보 (9급)', '관세서기 (8급)', '관세주사보 (7급)'],
    branches: [
      ['Customs_Inspect', '통관 검사', ['통관 검사관 (6급)', '검사과장 (5급)', '통관국장 (4급)', '세관장 (3급)', '본부세관장 (2급)', '관세청 차장 (1급)'], 'handiness'],
      ['Customs_Invest', '조사·밀수 단속', ['조사관 (6급)', '조사계장 (5급)', '조사국장 (4급)', '밀수 단속 총괄 (3급)', '본부세관 조사국장 (2급)', '조사감시국장 (1급)'], 'fitness'],
    ],
    hours: [8, 17],
    pay: [85, 1250],
  }),
  job('sanitationWorker', '환경미화원', '🧹', 'energized', '지자체 환경공무관(환경미화원)', {
    skills: ['fitness', 'handiness'],
    shared: ['환경미화 보조', '환경미화원', '선임 환경미화원'],
    branches: [
      ['Sanit_Field', '현장 작업', ['수거 차량 운전원', '작업 반장', '청소 작업 팀장'], 'charisma'],
      ['Sanit_Recycle', '자원순환', ['선별장 작업원', '자원순환센터 주임', '자원순환센터장'], 'logic'],
    ],
    hours: [5, 13],
    pay: [85, 800],
  }),
  // ---- 사회복지·돌봄 ----
  job('socialWorker', '사회복지사', '🤝', 'happy', '사회복지사 국가자격 · 종합사회복지관·사회복지 전담 공무원', {
    skills: ['charisma', 'logic'],
    shared: ['사회복지 실습생', '사회복지사 (계약직)', '사회복지사', '선임 사회복지사'],
    branches: [
      ['Social_Community', '지역사회 복지', ['사례관리 팀장', '복지관 부장', '복지관 사무국장', '종합사회복지관장'], 'writing'],
      ['Social_Public', '사회복지 공무원', ['사회복지주사 (6급)', '사회복지사무관 (5급)', '복지정책 과장', '복지국장'], 'logic'],
    ],
    hours: [9, 18],
    pay: [80, 1050],
  }),
  job('careWorker', '요양보호사', '👵', 'happy', '요양보호사 국가자격 · 노인요양시설·재가 장기요양기관', {
    skills: ['charisma', 'cooking'],
    shared: ['요양보호사 실습생', '요양보호사', '선임 요양보호사'],
    branches: [
      ['Care_Facility', '시설 요양', ['요양 팀장', '요양원 사무국장', '요양원장'], 'logic'],
      ['Care_Home', '재가 방문 요양', ['방문 요양 팀장', '재가 센터 관리책임자', '재가 장기요양기관 대표'], 'fitness'],
    ],
    hours: [8, 17],
    pay: [80, 800],
  }),
  job('childcareTeacher', '보육교사', '👶', 'playful', '보육교사 국가자격 · 국공립 어린이집', {
    skills: ['charisma', 'painting'],
    shared: ['보육 실습생', '보조 보육교사', '보육교사', '담임 보육교사'],
    branches: [
      ['Child_Class', '반 운영', ['주임 보육교사', '원감', '어린이집 원장'], 'logic'],
      ['Child_Special', '특수 보육', ['장애아 전문 보육교사', '특수 보육 주임', '장애아 전문 어린이집 원장'], 'writing'],
    ],
    hours: [8, 17],
    pay: [80, 850],
  }),
  job('disabilitySupport', '장애인 활동지원사', '♿', 'happy', '장애인활동지원사 · 장애인복지관·주간보호센터·보호작업장', {
    skills: ['charisma', 'fitness'],
    shared: ['활동지원사 교육생', '활동지원사', '선임 활동지원사'],
    branches: [
      ['Support_Daily', '일상 지원', ['주간보호센터 팀장', '장애인 주간보호센터장', '장애인복지관장'], 'logic'],
      ['Support_Work', '직업 재활', ['직업재활 교사', '보호작업장 팀장', '장애인 보호작업장 원장'], 'handiness'],
    ],
    hours: [9, 18],
    pay: [80, 850],
  }),
  job('youthCounselor', '청소년지도사', '🧭', 'energized', '청소년지도사 국가자격(1~3급) · 청소년수련관·청소년상담복지센터', {
    skills: ['charisma', 'fitness'],
    shared: ['청소년지도사 실습생', '청소년지도사 (3급)', '청소년지도사 (2급)', '청소년지도사 (1급)'],
    branches: [
      ['Youth_Center', '수련시설', ['수련관 팀장', '청소년수련관 부관장', '청소년수련관장'], 'logic'],
      ['Youth_Counsel', '청소년 상담', ['청소년 상담사', '상담복지센터 팀장', '청소년상담복지센터장'], 'writing'],
    ],
    hours: [12, 21],
    pay: [80, 900],
  }),
  // ---- 보건·의료 ----
  job('physicalTherapist', '물리치료사', '🦵', 'focused', '물리치료사 국가면허 · 병원 재활의학과·스포츠 재활', {
    skills: ['fitness', 'logic'],
    shared: ['물리치료 실습생', '물리치료사', '선임 물리치료사', '주임 물리치료사'],
    branches: [
      ['PT_Clinic', '병원 재활', ['물리치료 팀장', '재활치료실장', '재활의학센터 부장', '재활센터장'], 'charisma'],
      ['PT_Sports', '스포츠 재활', ['스포츠 재활 트레이너', '프로팀 재활 코치', '국가대표팀 재활 트레이너', '스포츠 재활센터 대표'], 'handiness'],
    ],
    hours: [9, 18],
    pay: [85, 1050],
  }),
  job('occupationalTherapist', '작업치료사', '🧩', 'happy', '작업치료사 국가면허 · 재활병원·아동발달센터', {
    skills: ['handiness', 'charisma'],
    shared: ['작업치료 실습생', '작업치료사', '선임 작업치료사', '주임 작업치료사'],
    branches: [
      ['OT_Rehab', '신체 재활', ['작업치료 팀장', '재활치료실장', '재활센터장'], 'logic'],
      ['OT_Child', '아동 발달', ['아동 발달 작업치료사', '발달센터 팀장', '아동발달센터장'], 'painting'],
    ],
    hours: [9, 18],
    pay: [85, 950],
  }),
  job('labTechnician', '임상병리사', '🧪', 'focused', '임상병리사 국가면허 · 진단검사의학과·검사센터·질병관리청', {
    skills: ['logic', 'handiness'],
    shared: ['임상병리 실습생', '임상병리사', '선임 임상병리사', '주임 임상병리사'],
    branches: [
      ['Lab_Clinical', '진단검사', ['진단검사 팀장', '진단검사의학과 실장', '검사센터장'], 'charisma'],
      ['Lab_Research', '연구·검역', ['임상시험 연구원', '검역 연구사', '질병관리청 연구관'], 'writing'],
    ],
    hours: [8, 17],
    pay: [85, 1000],
  }),
  job('radiographer', '방사선사', '☢️', 'focused', '방사선사 국가면허 · 영상의학과·방사선종양학과', {
    skills: ['logic', 'handiness'],
    shared: ['방사선 실습생', '방사선사', '선임 방사선사', '주임 방사선사'],
    branches: [
      ['Radio_Imaging', '영상 검사', ['CT·MRI 전문 방사선사', '영상의학과 팀장', '영상의학과 실장'], 'charisma'],
      ['Radio_Therapy', '방사선 치료', ['방사선 치료사', '방사선종양학과 팀장', '방사선 치료실장'], 'writing'],
    ],
    hours: [8, 17],
    pay: [85, 1000],
  }),
  job('paramedic', '응급구조사', '🚑', 'confident', '응급구조사 1·2급 · 119 구급대·권역응급의료센터', {
    skills: ['fitness', 'logic'],
    shared: ['응급구조 교육생', '응급구조사 2급', '응급구조사 1급', '선임 응급구조사'],
    branches: [
      ['Para_Fire', '119 구급대', ['구급대원 (소방교)', '구급팀장 (소방장)', '구급대장 (소방위)', '119 구급센터장'], 'charisma'],
      ['Para_Hospital', '병원 응급실', ['응급실 응급구조사', '응급의료센터 팀장', '응급의료센터 실장', '권역응급의료센터 운영실장'], 'handiness'],
    ],
    hours: [8, 20],
    days: [0, 2, 4],
    pay: [90, 1100],
  }),
  job('koreanMedicine', '한의사', '🌿', 'focused', '한의사 면허 · 한의원·한방병원·한국한의학연구원', {
    skills: ['logic', 'gardening'],
    shared: ['한의대 실습생', '한방병원 인턴', '한방병원 레지던트', '한의사', '전문 한의사'],
    branches: [
      ['KM_Clinic', '한의원 개원', ['봉직 한의사', '부원장 한의사', '한의원 원장', '한방병원 진료부장', '한방병원장'], 'charisma'],
      ['KM_Research', '한의학 연구', ['한의학 연구원', '한약 연구 책임자', '한의학 교수', '한의학연구원 부장', '한국한의학연구원장'], 'writing'],
    ],
    hours: [9, 18],
    pay: [95, 1450],
  }),
  job('dietitian', '영양사', '🥗', 'focused', '영양사 국가면허 · 단체급식·병원 임상영양', {
    skills: ['cooking', 'logic'],
    shared: ['영양사 실습생', '영양사', '선임 영양사'],
    branches: [
      ['Diet_Food', '단체 급식', ['급식 팀장', '급식 운영 매니저', '급식 사업부장'], 'charisma'],
      ['Diet_Clinic', '임상 영양', ['임상영양사', '영양팀장', '영양부장'], 'writing'],
    ],
    hours: [7, 16],
    pay: [80, 850],
  }),
  job('optician', '안경사', '👓', 'focused', '안경사 국가면허 · 안경원', {
    skills: ['handiness', 'charisma'],
    shared: ['안경원 직원', '안경사', '선임 안경사'],
    branches: [
      ['Opt_Shop', '안경원 운영', ['안경원 실장', '안경원 원장', '안경 체인 대표'], 'logic'],
      ['Opt_Lens', '콘택트렌즈·시기능', ['콘택트렌즈 전문 안경사', '시기능 훈련 전문가', '시기능 연구소장'], 'logic'],
    ],
    hours: [10, 19],
    pay: [80, 850],
  }),
  // ---- 교육 서비스 ----
  job('academyTutor', '학원 강사', '📚', 'focused', '입시·보습학원 강사 · 인터넷 강의', {
    skills: ['charisma', 'writing'],
    shared: ['학원 조교', '보조 강사', '전임 강사', '인기 강사'],
    branches: [
      ['Tutor_Lecture', '입시 강의', ['학원 대표 강사', '인터넷 강의 강사', '일타 강사'], 'logic'],
      ['Tutor_Owner', '학원 운영', ['교무 실장', '학원 부원장', '학원 원장'], 'logic'],
    ],
    hours: [14, 22],
    pay: [80, 1150],
  }),
  job('kindergartenTeacher', '유치원 교사', '🧸', 'playful', '유치원 정교사 자격 · 공립·사립 유치원', {
    skills: ['charisma', 'painting'],
    shared: ['유치원 실습생', '기간제 유치원 교사', '유치원 교사', '담임 유치원 교사'],
    branches: [
      ['Kinder_Public', '공립 유치원', ['수석 교사', '원감', '유치원 원장', '유아교육 장학관'], 'logic'],
      ['Kinder_Private', '사립 유치원', ['부장 교사', '사립 유치원 원감', '사립 유치원 원장', '유치원 법인 이사장'], 'writing'],
    ],
    hours: [8, 17],
    pay: [85, 1000],
  }),
  job('musicTeacher', '음악학원 강사', '🎹', 'inspired', '피아노·실용음악 학원 강사', {
    skills: ['piano', 'charisma'],
    shared: ['음악학원 보조 강사', '피아노 강사', '선임 피아노 강사'],
    branches: [
      ['Music_Academy', '학원 운영', ['교무 주임', '음악학원 부원장', '음악학원 원장'], 'logic'],
      ['Music_Strings', '현악·실용음악', ['바이올린·기타 강사', '실용음악 전임 강사', '실용음악학원 원장'], 'violin'],
    ],
    hours: [13, 21],
    pay: [80, 850],
  }),
  job('drivingInstructor', '운전 강사', '🚗', 'focused', '자동차운전 전문학원 강사·기능검정원', {
    skills: ['logic', 'charisma'],
    shared: ['운전학원 사무 보조', '운전 강사 연수생', '운전 강사'],
    branches: [
      ['Drive_Teach', '도로 연수', ['선임 운전 강사', '기능 검정원', '운전학원 교무과장'], 'fitness'],
      ['Drive_School', '학원 운영', ['운전학원 부원장', '운전학원 원장', '운전학원 법인 대표'], 'writing'],
    ],
    hours: [9, 18],
    pay: [80, 850],
  }),
  job('yogaInstructor', '요가·필라테스 강사', '🧘', 'happy', '요가·필라테스 강사 · 스튜디오', {
    skills: ['fitness', 'charisma'],
    shared: ['요가 수련생', '보조 강사', '요가 강사'],
    branches: [
      ['Yoga_Teach', '전문 강사', ['필라테스 전문 강사', '강사 교육 트레이너', '마스터 트레이너'], 'logic'],
      ['Yoga_Studio', '스튜디오 운영', ['스튜디오 매니저', '요가 스튜디오 원장', '요가·필라테스 체인 대표'], 'logic'],
    ],
    hours: [11, 20],
    pay: [75, 850],
  }),
  // ---- 운송·물류 ----
  job('courier', '택배 기사', '📦', 'energized', '택배 배송 기사·물류센터', {
    skills: ['fitness', 'logic'],
    shared: ['물류센터 상하차 알바', '택배 분류원', '택배 기사'],
    branches: [
      ['Courier_Route', '배송', ['베테랑 택배 기사', '배송 구역 팀장', '택배 대리점장'], 'charisma'],
      ['Courier_Hub', '물류 관리', ['물류센터 주임', '물류센터 관리자', '물류센터장'], 'logic'],
    ],
    hours: [8, 18],
    pay: [80, 900],
  }),
  job('busDriver', '버스 기사', '🚌', 'focused', '시내·광역·고속버스 운전기사', {
    skills: ['logic', 'charisma'],
    shared: ['버스 운전 연수생', '마을버스 기사', '시내버스 기사'],
    branches: [
      ['Bus_Route', '노선 운행', ['광역버스 기사', '고속버스 기사', '버스 운행 관리 팀장'], 'fitness'],
      ['Bus_Ops', '운수 관리', ['배차 담당', '운수 관리 과장', '버스회사 상무'], 'writing'],
    ],
    hours: [6, 15],
    pay: [85, 900],
  }),
  job('taxiDriver', '택시 기사', '🚕', 'happy', '법인·개인택시 운전기사', {
    skills: ['charisma', 'logic'],
    shared: ['택시 운전 자격 연수생', '법인 택시 기사', '베테랑 법인 택시 기사'],
    branches: [
      ['Taxi_Own', '개인택시', ['개인택시 기사', '모범택시 기사', '개인택시 조합 이사'], 'logic'],
      ['Taxi_Corp', '택시 회사', ['배차 팀장', '택시 회사 전무', '택시 회사 대표'], 'writing'],
    ],
    hours: [18, 28],
    pay: [80, 850],
  }),
  job('subwayDriver', '지하철 기관사', '🚇', 'focused', '도시철도 운영사 기관사·관제사', {
    skills: ['logic', 'fitness'],
    shared: ['철도 운영 교육생', '역무원', '차장', '부기관사'],
    branches: [
      ['Subway_Drive', '운전', ['기관사', '선임 기관사', '운전 지도 교관', '승무사업소장'], 'charisma'],
      ['Subway_Control', '관제', ['관제사', '선임 관제사', '관제 팀장', '종합관제소장'], 'writing'],
    ],
    hours: [7, 16],
    pay: [90, 1100],
  }),
  job('seafarer', '항해사', '🚢', 'confident', '해기사(항해사) 면허 · 해운사·도선사', {
    skills: ['logic', 'fishing'],
    shared: ['해양대 실습생', '갑판원', '3등 항해사', '2등 항해사'],
    branches: [
      ['Sea_Captain', '선장', ['1등 항해사', '선장', '대형선 선장', '선단장'], 'charisma'],
      ['Sea_Pilot', '도선·해운', ['해운사 운항 감독', '도선사 수습', '도선사', '도선사회 회장'], 'writing'],
    ],
    hours: [8, 20],
    days: [0, 2, 4],
    pay: [90, 1400],
  }),
  // ---- 설치·정비·건설 ----
  job('electrician', '전기기사', '🔌', 'focused', '전기기능사·산업기사·기사·기능장·기술사 (국가기술자격)', {
    skills: ['handiness', 'logic'],
    shared: ['전기 공사 보조', '전기기능사', '전기산업기사', '전기기사'],
    branches: [
      ['Elec_Site', '현장 시공', ['현장 반장', '전기 공사 소장', '전기기능장'], 'fitness'],
      ['Elec_Design', '설계·감리', ['전기 감리원', '전기 설계 팀장', '전기기술사'], 'writing'],
    ],
    hours: [8, 17],
    pay: [85, 1050],
  }),
  job('plumber', '배관공', '🚿', 'energized', '배관기능사·기능장 · 설비 업체', {
    skills: ['handiness', 'fitness'],
    shared: ['설비 보조', '배관기능사', '숙련 배관공'],
    branches: [
      ['Plumb_Repair', '누수·수리', ['누수 탐지 전문가', '설비 수리 반장', '설비 업체 대표'], 'logic'],
      ['Plumb_Build', '건축 설비', ['설비 현장 반장', '설비 공사 소장', '배관기능장'], 'logic'],
    ],
    hours: [8, 17],
    pay: [80, 900],
  }),
  job('carpenter', '목수', '🪚', 'focused', '건축목공·가구제작 기능사 · 목공소·가구 공방', {
    skills: ['handiness', 'painting'],
    shared: ['목공 조공', '목공 기능공', '숙련 목수'],
    branches: [
      ['Carp_Build', '건축 목공', ['내장 목공', '목공 반장', '목공 현장 소장', '목공 명장'], 'logic'],
      ['Carp_Furniture', '가구 공방', ['가구 제작자', '수제 가구 장인', '원목 가구 공방장', '가구 브랜드 대표'], 'charisma'],
    ],
    hours: [8, 17],
    pay: [80, 950],
  }),
  job('welder', '용접공', '🔥', 'focused', '용접기능사·기능장 · 조선소·플랜트', {
    skills: ['handiness', 'fitness'],
    shared: ['용접 보조', '용접기능사', '숙련 용접공'],
    branches: [
      ['Weld_Ship', '조선소 용접', ['선박 용접 반장', '조선소 직장', '용접기능장'], 'logic'],
      ['Weld_Special', '특수 용접', ['배관 특수 용접사', '수중 용접사', '용접 검사 기술사'], 'writing'],
    ],
    hours: [8, 17],
    pay: [85, 1000],
  }),
  job('wallpaperer', '도배·타일 시공자', '🧱', 'happy', '도배기능사·타일기능사 · 인테리어 시공', {
    skills: ['handiness', 'painting'],
    shared: ['도배 보조', '도배기능사', '숙련 도배사'],
    branches: [
      ['Wall_Paper', '도배', ['도배 반장', '도배 팀장', '도배·인테리어 업체 대표'], 'charisma'],
      ['Wall_Tile', '타일', ['타일 기능사', '타일 반장', '타일 시공 업체 대표'], 'logic'],
    ],
    hours: [8, 17],
    pay: [80, 850],
  }),
  job('elevatorTech', '승강기 정비원', '🛗', 'focused', '승강기기능사·기능장 · 승강기 유지보수·한국승강기안전공단', {
    skills: ['handiness', 'logic'],
    shared: ['승강기 정비 보조', '승강기기능사', '승강기 정비원', '선임 정비원'],
    branches: [
      ['Elev_Field', '현장 정비', ['정비 팀장', '지역 서비스센터장', '승강기기능장'], 'fitness'],
      ['Elev_Inspect', '검사·안전', ['승강기 안전 검사원', '검사 팀장', '안전공단 지사장'], 'writing'],
    ],
    hours: [8, 17],
    pay: [85, 950],
  }),
  // ---- 농림어업 ----
  job('fisher', '어부', '🎣', 'energized', '연근해 어선 어업 · 수협 위판장', {
    skills: ['fishing', 'fitness'],
    shared: ['어선 견습 선원', '선원', '숙련 선원'],
    branches: [
      ['Fish_Boat', '연안 어업', ['갑판장', '어선 선장', '선단 선주'], 'logic'],
      ['Fish_Market', '수산 유통', ['위판장 중매인', '수산물 유통 팀장', '수협 조합장'], 'charisma'],
    ],
    hours: [4, 13],
    pay: [80, 950],
  }),
  job('fishFarmer', '양식업자', '🐟', 'focused', '어류·패류·해조류 양식업 · 어촌계', {
    skills: ['fishing', 'logic'],
    shared: ['양식장 일꾼', '양식 기술자', '양식장 관리인'],
    branches: [
      ['Farm_Fish', '어류 양식', ['광어 양식장 주인', '스마트 양식장 대표', '수산 양식 법인 대표'], 'programming'],
      ['Farm_Shell', '패류·해조류', ['전복 양식장 주인', '김·미역 양식 대표', '어촌계장'], 'charisma'],
    ],
    hours: [6, 15],
    pay: [80, 950],
  }),
  job('haenyeo', '해녀', '🤿', 'energized', '제주 해녀 (유네스코 인류무형문화유산) · 하군·중군·상군·대상군', {
    skills: ['fishing', 'fitness'],
    shared: ['해녀학교 수강생', '애기해녀', '하군 해녀'],
    branches: [
      ['Haenyeo_Dive', '물질', ['중군 해녀', '상군 해녀', '대상군 해녀'], 'logic'],
      ['Haenyeo_Culture', '해녀 문화', ['해녀 체험 강사', '해녀박물관 해설사', '어촌계 해녀회장'], 'charisma'],
    ],
    hours: [8, 14],
    pay: [75, 850],
  }),
  job('forester', '산림 기술자', '🌲', 'focused', '산림기능사·산림기사 · 국유림관리소·자연휴양림', {
    skills: ['gardening', 'fitness'],
    shared: ['숲가꾸기 작업원', '산림기능사', '산림기사'],
    branches: [
      ['Forest_Field', '산림 현장', ['산림보호원', '산불 진화대장', '산림 사업 팀장', '국유림관리소장'], 'logic'],
      ['Forest_Eco', '숲 해설·치유', ['숲해설가', '산림치유지도사', '휴양림 관리 팀장', '자연휴양림장'], 'charisma'],
    ],
    hours: [8, 17],
    pay: [80, 950],
  }),
  // ---- 판매·서비스 ----
  job('convenienceManager', '편의점 점장', '🏪', 'happy', '편의점 점장·가맹점주·본사 영업관리(SV)', {
    skills: ['charisma', 'logic'],
    shared: ['편의점 아르바이트', '편의점 매니저', '편의점 점장'],
    branches: [
      ['Store_Owner', '가맹점 운영', ['가맹점주', '다점포 경영주', '지역 대표 경영주'], 'logic'],
      ['Store_HQ', '본사 영업', ['영업 관리자 (SV)', '지역 영업 팀장', '본사 영업부장'], 'writing'],
    ],
    hours: [9, 18],
    pay: [75, 900],
  }),
  job('insuranceAgent', '보험설계사', '🛡️', 'confident', '보험설계사·손해사정사·언더라이터 · 보험 지점', {
    skills: ['charisma', 'logic'],
    shared: ['보험설계사 교육생', '보험설계사', '우수 설계사', '팀장 설계사'],
    branches: [
      ['Ins_Sales', '영업', ['MDRT 설계사', '지점장', '지역단장', '영업 본부장'], 'writing'],
      ['Ins_Claims', '보상·심사', ['손해사정사', '보상 팀장', '언더라이터', '보상 부장'], 'logic'],
    ],
    hours: [9, 18],
    pay: [80, 1150],
  }),
  job('callCenter', '콜센터 상담원', '📞', 'happy', '고객센터 상담원 · 고객경험(CX) 매니저 (한국직업사전 신규 등재)', {
    skills: ['charisma', 'logic'],
    shared: ['상담 교육생', '상담원', '선임 상담원'],
    branches: [
      ['CC_Lead', '상담 관리', ['상담 품질(QA) 팀장', '센터 실장', '고객센터장'], 'logic'],
      ['CC_CX', '고객 경험', ['VOC 분석가', '고객경험(CX) 매니저', 'CX 팀장'], 'writing'],
    ],
    hours: [9, 18],
    pay: [75, 850],
  }),
  job('nailArtist', '네일 아티스트', '💅', 'inspired', '미용사(네일) 국가자격 · 네일숍', {
    skills: ['painting', 'handiness'],
    shared: ['네일숍 보조', '네일리스트', '숙련 네일리스트'],
    branches: [
      ['Nail_Art', '네일 아트', ['네일 아티스트', '네일 아트 강사', '네일 아카데미 원장'], 'charisma'],
      ['Nail_Shop', '네일숍 운영', ['네일숍 실장', '네일숍 원장', '네일 브랜드 대표'], 'logic'],
    ],
    hours: [11, 20],
    pay: [75, 850],
  }),
  job('esthetician', '피부관리사', '💆', 'happy', '미용사(피부) 국가자격 · 에스테틱', {
    skills: ['charisma', 'handiness'],
    shared: ['에스테틱 보조', '피부관리사', '숙련 피부관리사'],
    branches: [
      ['Esth_Care', '피부 관리', ['피부관리 실장', '메디컬 스킨케어 전문가', '에스테틱 교육 강사'], 'logic'],
      ['Esth_Shop', '에스테틱 운영', ['에스테틱 부원장', '에스테틱 원장', '스킨케어 브랜드 대표'], 'logic'],
    ],
    hours: [11, 20],
    pay: [75, 850],
  }),
  job('makeupArtist', '메이크업 아티스트', '💄', 'inspired', '미용사(메이크업) 국가자격 · 웨딩·방송 분장', {
    skills: ['painting', 'charisma'],
    shared: ['메이크업 어시스턴트', '메이크업 아티스트', '선임 메이크업 아티스트'],
    branches: [
      ['Mu_Bridal', '웨딩·뷰티', ['웨딩 메이크업 실장', '뷰티숍 부원장', '메이크업 숍 원장', '뷰티 아카데미 대표'], 'logic'],
      ['Mu_Media', '방송·무대', ['방송 메이크업 아티스트', '드라마 분장 팀장', '특수 분장사', '방송사 분장 실장'], 'handiness'],
    ],
    hours: [9, 18],
    pay: [80, 950],
  }),
  job('bodyguard', '경호원', '🕶️', 'confident', '신변보호사·경호 경비 업체', {
    skills: ['fitness', 'logic'],
    shared: ['신변보호 교육생', '경호원', '선임 경호원'],
    branches: [
      ['Guard_VIP', 'VIP 경호', ['수행 경호원', '경호 팀장', '경호 실장', '경호 업체 대표'], 'charisma'],
      ['Guard_Event', '행사·공연 경호', ['행사 경호 요원', '공연 경호 팀장', '행사 보안 총괄', '경호 경비 법인 대표'], 'charisma'],
    ],
    hours: [9, 19],
    pay: [85, 1050],
  }),
  job('securityGuard', '보안요원', '🏢', 'focused', '시설 경비·보안 관제', {
    skills: ['fitness', 'logic'],
    shared: ['보안 교육생', '보안요원', '선임 보안요원'],
    branches: [
      ['Sec_Site', '시설 경비', ['경비 반장', '보안 팀장', '시설 보안 실장'], 'charisma'],
      ['Sec_Tech', '보안 관제', ['CCTV 관제 요원', '통합 관제 팀장', '보안 관제센터장'], 'programming'],
    ],
    hours: [20, 30],
    pay: [80, 850],
  }),
  // ---- 학생들이 많이 꿈꾸는 직업 (2순위) ----
  job('flightAttendant', '항공 승무원', '🛫', 'confident', '객실 승무원·사무장·객실 훈련 교관', {
    skills: ['empathy', 'language'],
    shared: ['승무원 교육생', '인턴 승무원', '객실 승무원', '선임 승무원'],
    branches: [
      ['FA_Purser', '객실 관리', ['부사무장', '사무장', '선임 사무장', '캐빈 매니저'], 'leadership'],
      ['FA_Safety', '안전·교육', ['안전 담당 승무원', '객실 훈련 교관', '안전 품질 팀장', '객실 훈련원장'], 'medicine'],
    ],
    hours: [6, 16],
    days: [0, 1, 3, 4, 6],
    pay: [85, 1100],
  }),
  job('voiceActor', '성우', '🎙️', 'inspired', '방송사 공채 성우·더빙·내레이션', {
    skills: ['charisma', 'empathy'],
    shared: ['성우 지망생', '방송사 공채 성우', '전속 성우'],
    branches: [
      ['VA_Dub', '애니·게임 더빙', ['조연 성우', '주연 성우', '인기 캐릭터 성우', '더빙 연출가'], 'comedy'],
      ['VA_Narr', '내레이션·광고', ['광고 성우', '다큐멘터리 내레이터', '간판 내레이터', '오디오 콘텐츠 제작자'], 'writing'],
    ],
    hours: [10, 19],
    pay: [70, 1100],
  }),
  job('announcer', '아나운서', '📺', 'confident', '방송사 아나운서·앵커·라디오 진행자', {
    skills: ['charisma', 'writing'],
    shared: ['아나운서 지망생', '수습 아나운서', '아나운서'],
    branches: [
      ['Ann_News', '뉴스', ['뉴스 리포터 아나운서', '주말 뉴스 앵커', '메인 뉴스 앵커', '아나운서 국장'], 'logic'],
      ['Ann_Radio', '교양·라디오', ['교양 프로그램 진행자', '라디오 DJ', '간판 진행자', '명예 아나운서'], 'empathy'],
    ],
    hours: [6, 15],
    pay: [85, 1200],
  }),
  job('meteorologist', '기상캐스터·예보관', '🌦️', 'focused', '기상청 예보관·방송 기상캐스터 · 기상기사 국가자격', {
    skills: ['science', 'logic'],
    shared: ['기상 관측 인턴', '기상 관측원', '기상 분석원'],
    branches: [
      ['Met_Caster', '기상캐스터', ['기상캐스터', '메인 기상캐스터', '기상 전문 기자', '기상 해설위원'], 'charisma'],
      ['Met_Forecast', '예보관', ['예보관', '선임 예보관', '예보분석관', '국가기상센터장'], 'programming'],
    ],
    hours: [7, 16],
    pay: [85, 1050],
  }),
  job('smartFarmer', '스마트팜 운영자', '🌱', 'focused', '실내 수직농장·식물공장의 재배사와 환경 제어 운영자 · 시설원예기사 국가자격', {
    skills: ['gardening', 'programming'],
    shared: ['스마트팜 주니어 재배사', '스마트팜 재배사', '스마트팜 운영 매니저'],
    branches: [
      ['SF_Grow', '재배', ['재배 전문가', '작물 레시피 연구원', '재배 팀장', '농장장'], 'science'],
      ['SF_System', '시스템', ['환경 제어 담당', '자동화 엔지니어', '시스템 팀장', '기술 이사'], 'logic'],
    ],
    hours: [7, 16],
    pay: [95, 1100],
  }),
  job('semiconductor', '반도체 엔지니어', '🔬', 'focused', '반도체 공정·장비 엔지니어 · 반도체 팹', {
    skills: ['logic', 'programming'],
    // Engineers are hired into their field, and a line operator is another track, not a rung towards engineer (2026-11-02, at the user's request).
    shared: ['팹 실습 인턴'],
    branches: [
      ['SC_Process', '공정 엔지니어', ['신입 공정 엔지니어', '주니어 공정 엔지니어', '공정 엔지니어', '선임 공정 엔지니어', '수율 책임 엔지니어', '공정 기술 총괄'], 'science'],
      ['SC_Equip', '장비 엔지니어', ['신입 장비 엔지니어', '주니어 장비 엔지니어', '장비 엔지니어', '선임 장비 엔지니어', '장비 기술 파트장', '팹 설비 총괄'], 'handiness'],
    ],
    hours: [8, 17],
    pay: [95, 1200],
  }),
  job('aiResearcher', '인공지능 연구원', '🤖', 'focused', '인공지능 모델 연구원·서비스 엔지니어 · 인공지능 연구소', {
    skills: ['programming', 'logic'],
    shared: ['연구 인턴', '데이터 라벨링 담당', '주니어 연구원'],
    branches: [
      ['AR_Model', '모델 연구', ['모델 연구원', '선임 연구원', '책임 연구원', '연구소장'], 'science'],
      ['AR_Service', '서비스', ['서비스 엔지니어', '선임 서비스 엔지니어', '서비스 품질 팀장', '서비스 총괄'], 'writing'],
    ],
    hours: [10, 19],
    pay: [100, 1350],
  }),
  job('selfDriving', '자율주행 엔지니어', '🚗', 'focused', '인지 소프트웨어·시험 주행 엔지니어 · 자율주행차 개발 센터', {
    skills: ['programming', 'logic'],
    shared: ['자율주행 인턴', '데이터 라벨링 담당', '주니어 엔지니어'],
    branches: [
      ['SD_Perception', '인지 소프트웨어', ['인지 엔지니어', '선임 인지 엔지니어', '인지 팀장', '자율주행 기술 총괄'], 'science'],
      ['SD_TestDrive', '시험 주행', ['시험 주행 엔지니어', '선임 시험 엔지니어', '시험 주행 팀장', '시험·안전 총괄'], 'handiness'],
    ],
    hours: [9, 18],
    pay: [100, 1300],
  }),
  job('dataCenter', '데이터센터 엔지니어', '🖥️', 'focused', '서버 운영·시설(전력·냉각) 엔지니어 · 데이터센터', {
    skills: ['programming', 'handiness'],
    shared: ['데이터센터 실습생', '현장 기사', '야간 관제 담당'],
    branches: [
      ['DC_Server', '서버 운영', ['서버 엔지니어', '선임 서버 엔지니어', '서버 운영 파트장', '데이터센터 운영 총괄'], 'logic'],
      ['DC_Power', '전력·냉각', ['시설 엔지니어', '선임 시설 엔지니어', '전력·냉각 파트장', '데이터센터 시설 총괄'], 'science'],
    ],
    hours: [21, 30],
    pay: [95, 1200],
  }),
  job('roboticist', '로봇 엔지니어', '🦿', 'focused', '산업용·서비스 로봇 엔지니어 · 로봇 연구소', {
    skills: ['handiness', 'programming'],
    shared: ['로봇 연구 인턴', '조립 기술자', '주니어 로봇 엔지니어'],
    branches: [
      ['RL_Industrial', '산업용 로봇', ['산업용 로봇 엔지니어', '선임 로봇 엔지니어', '자동화 라인 파트장', '제조 로봇 총괄'], 'logic'],
      ['RL_Service', '서비스 로봇', ['서비스 로봇 엔지니어', '선임 서비스 로봇 엔지니어', '서비스 로봇 파트장', '서비스 로봇 총괄'], 'science'],
    ],
    hours: [9, 18],
    pay: [95, 1250],
  }),
  job('greenEnergy', '친환경 에너지 기술자', '☀️', 'focused', '신재생에너지 발전설비 기사 · 태양광·풍력 발전 단지', {
    skills: ['handiness', 'logic'],
    shared: ['발전 단지 실습생', '정비 보조 기술자', '주니어 설비 기술자'],
    branches: [
      ['GE_Solar', '태양광', ['태양광 운영 기술자', '선임 태양광 기술자', '태양광 단지 파트장', '태양광 사업 총괄'], 'science'],
      ['GE_Wind', '풍력', ['풍력 터빈 기술자', '선임 풍력 기술자', '풍력 정비 파트장', '풍력 사업 총괄'], 'fitness'],
    ],
    hours: [8, 17],
    pay: [85, 1150],
  }),
  job('gameDeveloper', '게임 개발자', '🕹️', 'inspired', '게임 프로그래머·게임 기획자 · 게임 회사', {
    skills: ['programming', 'videoGaming'],
    shared: ['게임 개발 인턴', '주니어 개발자', '게임 개발자'],
    branches: [
      ['GD_Prog', '게임 프로그래머', ['클라이언트 프로그래머', '엔진 프로그래머', '리드 프로그래머', '테크니컬 디렉터'], 'logic'],
      ['GD_Design', '게임 기획', ['레벨 디자이너', '시스템 기획자', '리드 기획자', '게임 디렉터'], 'writing'],
    ],
    hours: [10, 19],
    pay: [90, 1300],
  }),
  job('interpreter', '통번역가', '🌐', 'focused', '통역사·번역가 · 통번역대학원', {
    skills: ['language', 'writing'],
    shared: ['통번역대학원생', '프리랜서 번역가', '전문 통번역사'],
    branches: [
      ['Int_Conf', '회의 통역', ['순차 통역사', '동시 통역사', '국제회의 통역사', '통번역 에이전시 대표'], 'charisma'],
      ['Int_Trans', '전문 번역', ['기술·법률 번역가', '출판 번역가', '번역 감수 전문가', '번역 연구소장'], 'logic'],
    ],
    hours: [9, 18],
    pay: [80, 1150],
  }),
  job('librarian', '사서', '📚', 'focused', '사서 자격·공공도서관·전문도서관', {
    skills: ['logic', 'writing'],
    shared: ['도서관 실습생', '사서보', '2급 정사서', '1급 정사서'],
    branches: [
      ['Lib_Public', '공공 도서관', ['독서 프로그램 담당', '자료봉사 팀장', '분관장', '도서관장'], 'charisma'],
      ['Lib_Digital', '디지털 자료', ['디지털 아카이브 사서', '정보 검색 전문가', '데이터 큐레이터', '국가 전자도서관 책임자'], 'programming'],
    ],
    hours: [9, 18],
    days: [1, 2, 3, 4, 5],
    pay: [75, 850],
  }),
  job('tourGuide', '여행 가이드', '🗺️', 'happy', '관광통역안내사·국외여행인솔자 국가자격 · 여행사', {
    skills: ['charisma', 'language'],
    shared: ['여행사 인턴', '가이드 보조', '관광 가이드'],
    branches: [
      ['TG_Lead', '현지 안내·인솔', ['관광통역안내사', '국외여행인솔자', '선임 인솔자', '전문 해설 가이드'], 'empathy'],
      ['TG_Agency', '여행 상품 기획', ['여행 상품 기획자', '여행사 팀장', '여행사 본부장', '여행사 대표'], 'business'],
    ],
    hours: [8, 18],
    days: [2, 3, 4, 5, 6],
    pay: [70, 850],
  }),
  job('weddingPlanner', '웨딩플래너', '💒', 'happy', '웨딩 컨설팅 업체·웨딩홀', {
    skills: ['charisma', 'business'],
    shared: ['웨딩 어시스턴트', '주니어 웨딩플래너', '웨딩플래너'],
    branches: [
      ['WP_Style', '웨딩 스타일링', ['웨딩 스타일리스트', '연출 실장', '수석 웨딩 디렉터', '웨딩 스타일링 대표'], 'painting'],
      ['WP_Firm', '웨딩 컨설팅 경영', ['수석 웨딩플래너', '컨설팅 팀장', '웨딩홀 지배인', '웨딩 컨설팅 대표'], 'leadership'],
    ],
    hours: [10, 19],
    days: [2, 3, 4, 5, 6],
    pay: [70, 900],
  }),
];
