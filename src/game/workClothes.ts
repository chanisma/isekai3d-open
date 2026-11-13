import { CAREER_BY_ID } from './careers';
import type { GameState, Job, Dweller } from './types';
import { stageOf, type WorkStage } from './workStages';

/**
 * Work clothes (ours, at the user's request, 2026-10-25; 참고 게임 gives every career level an outfit,
 * we only give one where the job really wears one in Korea, docs/3d/04-work-clothes.md). A set of
 * clothes is shared by every job that wears it (a nurse's and a radiographer's scrubs are one mesh,
 * coloured apart), and a job's rank can change it (a resident in scrubs, a specialist in a white coat;
 * a police detective in plain clothes). A job where a suit is only the dress code wears the dweller's own
 * formal wear (`suit`), not a uniform of ours. Worn on the work lot (the worker by their rank, their
 * coworkers by the same, the boss as a leader).
 */
export interface WorkClothes {
  id: string;
  label: string;
  /**
   * The garment set whose pieces are put on, or `formal` for the dweller's own formal wear. Its file is
   * `<gender>-<stage>-npc_garment_<id>.vrm` (each id cut for its job, prototypes/CAREER-COLLECTION.md),
   * else `…_<set>.vrm`; with neither the dweller stays in their own clothes.
   */
  set: string | 'formal';
  /** The pieces the set has (a gown has no bottoms of its own). */
  pieces: Array<'tops' | 'bottoms' | 'shoes'>;
  /** Colours for its pieces (the set's own where none). */
  tint?: { tops?: string; bottoms?: string; shoes?: string };
}

const SCRUBS: WorkClothes['pieces'] = ['tops', 'bottoms', 'shoes'];
/** Work clothes come without shoes (the sets have none yet): one's own go with them. */
const NO_SHOES: WorkClothes['pieces'] = ['tops', 'bottoms'];
const clothes = (id: string, label: string, set: string, tint?: WorkClothes['tint'], pieces = NO_SHOES): WorkClothes => ({ id, label, set, pieces, ...(tint ? { tint } : {}) });

/** Every set of work clothes, by id: one mesh can be several of these, coloured apart. */
export const WORK_CLOTHES: Record<string, WorkClothes> = {
  suit: { id: 'suit', label: '정장 (자기 정장)', set: 'formal', pieces: SCRUBS },
  // 병원: 수술복 한 벌을 색만 바꿔 여러 직업이 입어요.
  scrubsNurse: clothes('scrubsNurse', '간호사 근무복', 'scrubs', { tops: '#9cc8e6', bottoms: '#9cc8e6' }),
  scrubsNurseLead: clothes('scrubsNurseLead', '수간호사 근무복', 'scrubs', { tops: '#2f4f7f', bottoms: '#2f4f7f' }),
  scrubsSurgery: clothes('scrubsSurgery', '수술복', 'scrubs', { tops: '#5f9e8f', bottoms: '#5f9e8f' }),
  scrubsResident: clothes('scrubsResident', '전공의 근무복', 'scrubs', { tops: '#3d5a80', bottoms: '#3d5a80' }),
  scrubsClinic: clothes('scrubsClinic', '진료 보조 근무복', 'scrubs', { tops: '#c9b6e4', bottoms: '#c9b6e4' }),
  scrubsCare: clothes('scrubsCare', '요양·재활 근무복', 'scrubs', { tops: '#f2b8a0', bottoms: '#5b6170' }),
  // Over one's own trousers or skirt.
  whiteCoat: clothes('whiteCoat', '흰 가운', 'whitecoat', undefined, ['tops']),
  // 주방·위생
  chef: clothes('chef', '조리복', 'chef'),
  hygiene: clothes('hygiene', '위생복', 'chef', { bottoms: '#f4f4f4' }),
  // 제복: 근무복 셔츠 + 바지 한 벌을 기관마다 색으로 나눠요.
  police: clothes('police', '경찰 근무복', 'service', { tops: '#8fb3d9', bottoms: '#1f2a44' }),
  coastGuard: clothes('coastGuard', '해양경찰 근무복', 'service', { tops: '#b9cbe0', bottoms: '#1b2638' }),
  corrections: clothes('corrections', '교정 근무복', 'service', { tops: '#c7c9b8', bottoms: '#2e3a2e' }),
  customs: clothes('customs', '세관 근무복', 'service', { tops: '#d9dde6', bottoms: '#22283a' }),
  busDriver: clothes('busDriver', '버스 기사 유니폼', 'service', { tops: '#e8eef5', bottoms: '#2b2f3a' }),
  security: clothes('security', '경비 제복', 'service', { tops: '#3a3f4b', bottoms: '#22252c' }),
  fireChief: clothes('fireChief', '소방 근무복', 'service', { tops: '#d6c9a8', bottoms: '#2b2b33' }),
  tactical: clothes('tactical', '특공·기동 활동복', 'tactical', { tops: '#1f2633', bottoms: '#1f2633' }),
  fireActive: clothes('fireActive', '소방 활동복', 'tactical', { tops: '#e07a2e', bottoms: '#2a2f3a' }),
  ems: clothes('ems', '구급대 활동복', 'tactical', { tops: '#2f5d9e', bottoms: '#2f5d9e' }),
  combat: clothes('combat', '전투복', 'combat'),
  // 운송: 재킷형 제복 한 벌(모자)을 조종사·기관사·항해사가 색으로 나눠요.
  captain: clothes('captain', '조종사 제복', 'captain'),
  railway: clothes('railway', '기관사 제복', 'captain', { tops: '#23324f', bottoms: '#23324f' }),
  mariner: clothes('mariner', '선원 제복', 'captain', { tops: '#f2f2f2', bottoms: '#1c2540' }),
  cabinCrew: clothes('cabinCrew', '객실 승무원 유니폼', 'cabin'),
  cabinPurser: clothes('cabinPurser', '사무장 유니폼', 'cabin', { tops: '#3b3f5c' }),
  flightSuit: clothes('flightSuit', '비행복', 'flightsuit', { tops: '#4a6fa5', bottoms: '#4a6fa5' }),
  // 현장 작업복: 한 벌을 일마다 색으로 나눠요.
  workwear: clothes('workwear', '작업복', 'workwear', { tops: '#3b4a5c', bottoms: '#3b4a5c' }),
  hiVis: clothes('hiVis', '형광 작업복', 'workwear', { tops: '#e9ff3a', bottoms: '#2b3340' }),
  delivery: clothes('delivery', '배송 유니폼', 'workwear', { tops: '#c8102e', bottoms: '#2b2b2b' }),
  postal: clothes('postal', '집배원 유니폼', 'workwear', { tops: '#d7262e', bottoms: '#1f2a44' }),
  // 매장 유니폼
  crew: clothes('crew', '매장 유니폼', 'crew'),
  hotelStaff: clothes('hotelStaff', '호텔 유니폼', 'hotel'),
  judge: clothes('judge', '법복', 'judgerobe', undefined, ['tops']),
  wetsuit: clothes('wetsuit', '해녀복', 'wetsuit'),
  schoolUniform: clothes('schoolUniform', '교복', 'gijeon'),
};

/**
 * The role cuts (prototypes/career-roles.json, 2026-10-25): a job's own version of a set (an ER nurse's
 * utility tunic, a fire suppression turnout, a barista's apron), its file `npc_garment_<id>`; colours and
 * pieces its base's where it brings none.
 */
const ROLES: Array<[string, string, string, WorkClothes['tint']?]> = [
  ['doctorClinic', '의사 · 외래 진료', 'whiteCoat'],
  ['doctorTheatre', '의사 · 수술실', 'scrubsSurgery'],
  ['nurseER', '간호사 · 응급실', 'scrubsNurse', { tops: '#366681', bottoms: '#273e55' }],
  ['nurseOR', '간호사 · 수술실', 'scrubsSurgery'],
  ['nurseWardLead', '간호사 · 병동 책임자', 'scrubsNurseLead'],
  ['dentistClinic', '치과의사 · 진료', 'whiteCoat'],
  ['pharmacistDispense', '약사 · 조제', 'whiteCoat'],
  ['labBench', '임상병리사 · 검사실', 'whiteCoat'],
  ['scientistBench', '과학자 · 실험실', 'whiteCoat'],
  ['vetClinic', '수의사 · 진료', 'scrubsClinic', { tops: '#4e817b', bottoms: '#314e51' }],
  ['rehabTherapist', '물리치료사 · 재활', 'scrubsCare', { tops: '#dce5e2', bottoms: '#354e59' }],
  ['policeTraffic', '경찰 · 교통 근무', 'police'],
  ['policeCommand', '경찰 · 지휘 근무', 'police', { tops: '#283b54', bottoms: '#25334b' }],
  ['fireSuppression', '소방 · 화재 진압', 'fireActive', { tops: '#bba379', bottoms: '#9d8969' }],
  ['fireMountain', '소방 · 산악 구조', 'fireActive'],
  ['fireWater', '소방 · 수난 구조', 'wetsuit'],
  ['fireAir', '소방 · 항공 구조', 'flightSuit', { tops: '#c25f32', bottoms: '#434b53' }],
  ['paramedicField', '구급대 · 현장 출동', 'ems'],
  ['bakerBench', '제빵사 · 반죽·제조', 'chef'],
  ['chefExecutive', '셰프 · 주방 총괄', 'chef'],
  ['baristaApron', '바리스타 · 음료 제조', 'crew', { tops: '#3b4d46', bottoms: '#343e3b' }],
  ['fastFoodCounter', '패스트푸드 · 카운터', 'crew', { tops: '#973f39', bottoms: '#363a40' }],
  ['retailFloor', '판매직 · 매장 응대', 'hotelStaff', { tops: '#48545f', bottoms: '#303b45' }],
  ['hotelBell', '호텔 · 벨 서비스', 'hotelStaff'],
  ['hotelFrontDesk', '호텔 · 프런트', 'hotelStaff'],
  ['mechanicService', '정비사 · 차량 정비', 'workwear', { tops: '#39516a', bottoms: '#39516a' }],
  ['electricianSite', '전기기사 · 현장 시공', 'workwear'],
  ['plumberRepair', '배관공 · 설비 수리', 'workwear', { tops: '#4e6768', bottoms: '#394a4e' }],
  ['welderWorkshop', '용접공 · 작업장', 'workwear', { tops: '#4e514e', bottoms: '#3d403e' }],
  ['carpenterFurniture', '목수 · 가구 공방', 'workwear', { tops: '#727667', bottoms: '#524e42' }],
  ['wallpaperFinish', '도배·타일 · 실내 시공', 'workwear', { tops: '#ddd8c9', bottoms: '#9a9587' }],
  ['elevatorField', '승강기 · 유지보수', 'workwear', { tops: '#41505e', bottoms: '#303b47' }],
  ['sanitationRoute', '환경미화 · 수거 작업', 'hiVis'],
  ['foresterField', '산림 · 현장 작업', 'workwear', { tops: '#657151', bottoms: '#444c3b' }],
];
for (const [id, label, base, tint] of ROLES) {
  const b = WORK_CLOTHES[base];
  WORK_CLOTHES[id] = { ...b, id, label, ...(tint ?? b.tint ? { tint: tint ?? b.tint } : {}) };
}

/** A rule for a career: the clothes worn from these rungs (all when none given), the first that fits. */
export interface WorkRule {
  /** The job's stage (입문, 전문, 리더: workStages.ts). */
  stage?: WorkStage[];
  /** The branch (index into the career's branches). */
  branch?: number;
  /** Rungs counted on the whole ladder, from (inclusive). */
  from?: number;
  /** Only these rungs (on the whole ladder): a post one rung is (산악 구조대원, 응급실 간호사, 벨맨). */
  levels?: number[];
  /** The clothes, or null for their own. */
  wear: string | null;
}

const all = (wear: string): WorkRule[] => [{ wear }];

/**
 * Which careers wear what, by rank (ours, docs/3d/04-work-clothes.md). A career not here wears its
 * own clothes: offices where people dress as they like (developers, designers, teachers…) and work
 * where there's no common uniform.
 */
export const WORK_DRESS: Record<string, WorkRule[]> = {
  // 병원
  doctor: [
    // 외과: 전문의부터 수술실 복장, 과장·병원장은 외래 가운. 내과는 전문의부터 외래 가운, 그 아래는 전공의 근무복.
    { branch: 0, stage: [2], wear: 'doctorClinic' },
    { branch: 0, from: 4, wear: 'doctorTheatre' },
    { from: 4, wear: 'doctorClinic' },
    { wear: 'scrubsResident' },
  ],
  nurse: [
    { branch: 0, stage: [2], wear: 'suit' },
    { branch: 0, wear: 'nurseWardLead' },
    // 전문 간호사 갈래: 응급실 간호사는 응급실 복장, 수술실·마취 전문 간호사는 수술실 복장.
    { branch: 1, levels: [4], wear: 'nurseER' },
    { branch: 1, levels: [6, 9], wear: 'nurseOR' },
    { wear: 'scrubsNurse' },
  ],
  dentist: [{ stage: [0], wear: 'scrubsClinic' }, { wear: 'dentistClinic' }],
  koreanMedicine: all('whiteCoat'),
  pharmacist: [{ branch: 1, wear: 'scientistBench' }, { stage: [2], wear: 'suit' }, { wear: 'pharmacistDispense' }],
  vet: [{ branch: 1, wear: null }, { stage: [2], wear: 'whiteCoat' }, { wear: 'vetClinic' }],
  labTechnician: [{ branch: 1, stage: [2], wear: 'suit' }, { wear: 'labBench' }],
  radiographer: all('scrubsClinic'),
  physicalTherapist: [{ branch: 1, wear: null }, { wear: 'rehabTherapist' }],
  occupationalTherapist: all('scrubsCare'),
  careWorker: [{ stage: [2], wear: null }, { wear: 'scrubsCare' }],
  paramedic: [{ branch: 1, wear: 'scrubsClinic' }, { wear: 'paramedicField' }],
  scientist: [{ stage: [2], wear: 'suit' }, { wear: 'scientistBench' }],
  // 제복
  police: [
    // 순경·경장은 교통 근무, 형사는 사복, 시도경찰청장·수사부장은 지휘 근무복, 특공대는 활동복.
    { branch: 0, stage: [1], wear: null },
    { branch: 0, stage: [2], wear: 'policeCommand' },
    { branch: 1, wear: 'tactical' },
    { levels: [1, 2], wear: 'policeTraffic' },
    { wear: 'police' },
  ],
  firefighter: [
    // 화재 진압대는 방화복, 서장·본부장은 근무복. 구조대: 산악·수난·항공 구조대원은 그 구조복.
    { branch: 0, stage: [2], wear: 'fireChief' },
    { branch: 0, wear: 'fireSuppression' },
    { branch: 1, levels: [5], wear: 'fireMountain' },
    { branch: 1, levels: [6], wear: 'fireWater' },
    { branch: 1, levels: [7], wear: 'fireAir' },
    { wear: 'fireActive' },
  ],
  coastGuard: all('coastGuard'),
  correctionsOfficer: all('corrections'),
  customsOfficer: [{ branch: 1, stage: [1], wear: null }, { wear: 'customs' }],
  military: all('combat'),
  securityGuard: all('security'),
  // 운송
  pilot: [{ branch: 1, wear: 'flightSuit' }, { stage: [0], from: 2, wear: 'captain' }, { stage: [1, 2], wear: 'captain' }],
  flightAttendant: [{ branch: 0, wear: 'cabinPurser' }, { wear: 'cabinCrew' }],
  astronaut: [{ branch: 1, stage: [2], wear: 'suit' }, { wear: 'flightSuit' }],
  subwayDriver: all('railway'),
  seafarer: [{ branch: 1, wear: 'suit' }, { wear: 'mariner' }],
  busDriver: [{ branch: 1, wear: null }, { wear: 'busDriver' }],
  mailCarrier: [{ stage: [2], wear: 'suit' }, { wear: 'postal' }],
  courier: [{ branch: 1, wear: null }, { wear: 'delivery' }],
  // 주방·매장
  culinary: [{ branch: 1, wear: null }, { branch: 0, stage: [2], wear: 'chefExecutive' }, { wear: 'chef' }],
  baker: [{ branch: 1, stage: [2], wear: null }, { wear: 'bakerBench' }],
  dietitian: [{ branch: 1, wear: 'whiteCoat' }, { wear: 'hygiene' }],
  fastFood: all('fastFoodCounter'),
  barista: all('baristaApron'),
  retail: all('retailFloor'),
  convenienceManager: [{ stage: [0], wear: 'crew' }],
  hotelier: [{ levels: [0], wear: 'hotelBell' }, { levels: [1], wear: 'hotelFrontDesk' }, { levels: [2, 3], wear: 'hotelStaff' }, { wear: 'suit' }],
  // 현장
  mechanic: [{ branch: 1, stage: [2], wear: null }, { wear: 'mechanicService' }],
  electrician: [{ branch: 1, wear: null }, { wear: 'electricianSite' }],
  plumber: all('plumberRepair'),
  welder: all('welderWorkshop'),
  elevatorTech: all('elevatorField'),
  carpenter: [{ branch: 1, wear: 'carpenterFurniture' }, { wear: 'workwear' }],
  wallpaperer: all('wallpaperFinish'),
  manualLabor: all('hiVis'),
  sanitationWorker: [{ branch: 1, stage: [2], wear: null }, { wear: 'sanitationRoute' }],
  forester: [{ branch: 1, wear: null }, { wear: 'foresterField' }],
  haenyeo: [{ branch: 1, wear: null }, { wear: 'wetsuit' }],
  // 정장이 복장 규정인 일: 자기 정장(겹치는 옷이라 따로 만들지 않아요)
  lawyer: [{ branch: 0, from: 5, wear: 'judge' }, { wear: 'suit' }],
  banker: all('suit'),
  accountant: all('suit'),
  sales: [{ from: 1, wear: 'suit' }],
  salaryperson: [{ branch: 0, wear: 'suit' }],
  diplomat: all('suit'),
  politician: [{ branch: 0, wear: 'suit' }],
  insuranceAgent: all('suit'),
  realEstate: all('suit'),
  mortician: [{ branch: 1, wear: 'whiteCoat' }, { wear: 'suit' }],
  bodyguard: all('suit'),
  secretAgent: all('suit'),
  // 학교
  highSchool: all('schoolUniform'),
};

/** The clothes a job is worn in (`WORK_DRESS`), null for one's own. */
export function workClothesFor(job: Pick<Job, 'careerId' | 'level' | 'branch'> | null | undefined, at = stageOf(job)): WorkClothes | null {
  const rules = job && WORK_DRESS[job.careerId];
  if (!rules) return null;
  const rule = rules.find((r) => (!r.stage || r.stage.includes(at.stage)) && (r.branch === undefined || r.branch === job.branch) && (r.from === undefined || job.level >= r.from) && (!r.levels || r.levels.includes(job.level)));
  return (rule?.wear && WORK_CLOTHES[rule.wear]) || null;
}

/**
 * What a dweller on a work lot wears (null off one, or when the job has no work clothes): the worker by
 * their rank, a coworker by the same, the boss as the career's leader.
 */
export function workWear(state: GameState, s: Dweller): WorkClothes | null {
  const w = state.workplace;
  if (!w || state.time >= w.end) return null;
  const worker = state.dwellers.find((x) => x.id === w.workerId);
  const job = worker?.job ?? null;
  if (s.id === w.workerId) return workClothesFor(job && job.careerId === w.careerId ? job : { careerId: w.careerId, level: 0 }, { stage: w.stage ?? 0, branch: w.branch });
  // Colleagues go home in their own clothes (colleagues.ts).
  if (s.npc?.role !== 'coworker' || s.npc.leaving) return null;
  const c = CAREER_BY_ID[w.careerId];
  // A rung of that rank, for a rule counted by rung: the branch's last for the boss, the worker's for the rest.
  const branch = w.branch ?? job?.branch;
  const top = (c?.levels.length ?? 0) + (branch !== undefined ? c?.branches?.[branch]?.levels.length ?? 0 : 0) - 1;
  const level = s.npc.boss ? top : job?.careerId === w.careerId ? job.level : 0;
  return workClothesFor({ careerId: w.careerId, level, branch: s.npc.boss ? branch : w.branch }, { stage: s.npc.boss ? 2 : w.stage ?? 0, branch: s.npc.boss ? branch : w.branch });
}
