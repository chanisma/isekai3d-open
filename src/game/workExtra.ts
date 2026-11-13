import { getDef } from './catalog';
import type { WorkTask, WorkplaceDef } from './workplace';

/**
 * Work a job can't be known without that its lot didn't have yet (2026-11-02, at the user's request: a
 * census of all the workplaces, docs/workplaces/PIPELINE.md 빠진 행동). Each is done on a piece the lot has
 * and looks like another use of it (`like`: its place, pose and motion), so it's only added where that
 * reads right; it takes that use's skill and needs too. Only on this career's lot (`onlyAt`), since many
 * pieces are shared. On the day's list as one of the extras, from `minLevel` where it's licensed work.
 */
export interface ExtraWork {
  career: string;
  piece: string;
  like: string;
  id: string;
  label: string;
  icon: string;
  task: string;
  minLevel?: number;
  /** Drawn in its own right: the piece's builder has a spot and a motion under this id, so it doesn't borrow `like`'s (it still takes its skill and needs). */
  own?: boolean;
}

export const EXTRA_WORK: ExtraWork[] = [
  { career: 'culinary', piece: 'culinaryDishPit', like: 'culinaryWashDishes', id: 'xwCloseKitchen', label: '주방 마감 청소하기', icon: '🧽', task: '주방 마감 청소', own: true },
  { career: 'baker', piece: 'doughTable', like: 'kneadDough', id: 'xwCloseBakery', label: '마감 청소하기', icon: '🧽', task: '마감 청소', own: true },
  { career: 'doctor', piece: 'hospitalBed', like: 'drDrawBlood', id: 'xwDressWound', label: '수술 부위 소독하기', icon: '🩹', task: '환자 상처 소독', minLevel: 1, own: true },
  { career: 'doctor', piece: 'hospitalBed', like: 'drDrawBlood', id: 'xwFamilyTalk', label: '보호자에게 설명하기', icon: '💬', task: '보호자 설명', minLevel: 2, own: true },
  { career: 'doctor', piece: 'medStation', like: 'writeChart', id: 'xwPrescribe', label: '처방 입력하기', icon: '💊', task: '처방 입력', minLevel: 2 },
  { career: 'nurse', piece: 'nsNurseStation', like: 'nsNursingNotes', id: 'xwHandover', label: '근무 교대 인수인계하기', icon: '📋', task: '근무 교대 인수인계' },
  { career: 'nurse', piece: 'hospitalBed', like: 'makeHospitalBed', id: 'xwTurnPatient', label: '환자 체위 변경하기', icon: '🛏️', task: '환자 체위 변경', own: true },
  { career: 'police', piece: 'poLostShelf', like: 'poSortLost', id: 'xwLostProperty', label: '분실물 접수하기', icon: '📦', task: '분실물 접수', own: true },
  { career: 'police', piece: 'poPrintScanner', like: 'poScanCard', id: 'xwFingerprint', label: '지문 대조하기', icon: '🔍', task: '지문 대조', own: true },
  { career: 'firefighter', piece: 'ffInspectBoard', like: 'ffCheckHydrant', id: 'xwFireInspection', label: '소방 시설 점검 기록하기', icon: '🧯', task: '소방 시설 점검 기록', own: true },
  { career: 'firefighter', piece: 'ffInspectBoard', like: 'ffCheckHydrant', id: 'xwSafetyClass', label: '주민 소방 안전 교육 준비하기', icon: '🧯', task: '소방 안전 교육 준비', own: true },
  { career: 'teacher', piece: 'teacherDesk', like: 'planLesson', id: 'xwSchoolRecord', label: '생활기록부 쓰기', icon: '📘', task: '생활기록부 쓰기', minLevel: 1, own: true },
  { career: 'teacher', piece: 'teacherDesk', like: 'teacher_homeroom', id: 'xwCallParent', label: '학부모와 전화 상담하기', icon: '📞', task: '학부모 전화 상담', minLevel: 1, own: true },
  { career: 'teacher', piece: 'clsNoticeBoard', like: 'clsPraiseChart', id: 'xwClassDuty', label: '급식·청소 당번 정하기', icon: '🧹', task: '급식·청소 당번 정하기', minLevel: 1, own: true },
  { career: 'hairStylist', piece: 'salonStation', like: 'cleanStation', id: 'xwSweepHair', label: '바닥 머리카락 쓸기', icon: '🧹', task: '바닥 머리카락 쓸기', own: true },
  { career: 'pilot', piece: 'opsDesk', like: 'fileFlightPlan', id: 'xwAtcCalls', label: '관제 교신 절차 확인하기', icon: '🎧', task: '관제 교신 연습' },
  { career: 'politician', piece: 'speechPodium', like: 'giveSpeech', id: 'xwAssemblyQuestion', label: '본회의에서 질의하기', icon: '🏛️', task: '본회의 질의' },
  { career: 'military', piece: 'flagPole', like: 'drillMarch', id: 'xwRollCall', label: '아침 점호 받기', icon: '📣', task: '아침 점호', own: true },
  { career: 'military', piece: 'miGuardPost', like: 'miPostHandover', id: 'xwGuardDuty', label: '경계 근무 서며 상황 보고하기', icon: '🔦', task: '경계 근무', own: true },
  { career: 'military', piece: 'miMaintBench', like: 'miCleanRifle', id: 'xwFieldStrip', label: '소총 분해 결합하기', icon: '🔧', task: '소총 분해 결합', own: true },
  { career: 'military', piece: 'miFiringRange', like: 'miZeroRifle', id: 'miShootTraining', label: '사격 훈련하기', icon: '🎯', task: '사격 훈련', own: true },
  { career: 'military', piece: 'miMarchRoute', like: 'miCheckRuck', id: 'miRuckMarch', label: '군장 행군하기', icon: '🎒', task: '군장 행군', own: true },
  { career: 'gardener', piece: 'gardenBed', like: 'tendBeds', id: 'xwPestCheck', label: '병충해 살피고 방제하기', icon: '🐛', task: '병충해 방제', own: true },
  { career: 'salaryperson', piece: 'officeDesk', like: 'writeReport', id: 'xwApproval', label: '결재 올리기', icon: '🖋️', task: '결재 올리기' },
  { career: 'salaryperson', piece: 'officeDesk', like: 'crunchNumbers', id: 'xwWorkMail', label: '업무 메일 처리하기', icon: '📧', task: '업무 메일 처리' },
  { career: 'diplomat', piece: 'diplomatDesk', like: 'translateDocs', id: 'xwConsular', label: '재외국민 민원 처리하기', icon: '📄', task: '재외국민 민원 처리' },
  { career: 'mechanic', piece: 'carLift', like: 'repairEngine', id: 'xwOilChange', label: '엔진오일 교환하기', icon: '🛢️', task: '엔진오일 교환', own: true },
  { career: 'farmer', piece: 'cropField', like: 'tendCrops', id: 'xwPestControl', label: '병해충 방제하기', icon: '🐛', task: '병해충 방제', own: true },
  { career: 'barista', piece: 'espressoMachine', like: 'pullEspresso', id: 'xwCleanMachine', label: '머신 청소하기', icon: '🧽', task: '머신 청소', own: true },
  { career: 'barista', piece: 'cafeCounter', like: 'barista_shiftSchedule', id: 'xwOrderBeans', label: '원두·우유 발주하기', icon: '📦', task: '원두·우유 발주', own: true },
  { career: 'retail', piece: 'checkoutCounter', like: 'ringUp', id: 'xwReturns', label: '교환·반품 처리하기', icon: '🔄', task: '교환·반품 처리' },
  { career: 'correctionsOfficer', piece: 'gjRoundPost', like: 'gjRoundLog', id: 'xwHeadCount', label: '수용자 인원 점검하기', icon: '🔢', task: '수용자 인원 점검' },
  { career: 'careWorker', piece: 'careBed', like: 'assistCare', id: 'xwChangeBrief', label: '기저귀 갈아 드리기', icon: '🧷', task: '기저귀 교체' },
  { career: 'careWorker', piece: 'careBed', like: 'assistCare', id: 'xwBedBath', label: '몸 닦아 드리기', icon: '🧼', task: '몸 닦아 드리기' },
  { career: 'childcareTeacher', piece: 'ccLunchCart', like: 'ccSetLunchCart', id: 'xwLunchTime', label: '점심 배식 지도하기', icon: '🍚', task: '점심 배식 지도', own: true },
  { career: 'childcareTeacher', piece: 'ccChangingTable', like: 'ccCleanChangeTable', id: 'xwChangeDiaper', label: '기저귀 갈아 주기', icon: '🧷', task: '기저귀 갈아 주기', own: true },
  { career: 'academyTutor', piece: 'tutorDesk', like: 'academyTutor_gradeQuizzes', id: 'xwAttendanceText', label: '출결 확인하고 학부모 문자 보내기', icon: '📱', task: '출결·학부모 문자' },
  { career: 'kindergartenTeacher', piece: 'kgHealthDesk', like: 'kgHealthLog', id: 'xwMorningWelcome', label: '등원 맞이하고 건강 살피기', icon: '🌡️', task: '등원 맞이', own: true },
  { career: 'kindergartenTeacher', piece: 'kgRestMats', like: 'kgSetMats', id: 'kgNapTime', label: '휴식 시간 지도하기', icon: '😴', task: '휴식 시간 지도', own: true },
  { career: 'carpenter', piece: 'finishingTable', like: 'finishFurniture', id: 'xwSanding', label: '사포질하기', icon: '🪵', task: '사포질', own: true },
  { career: 'nailArtist', piece: 'nailTable', like: 'doManicure', id: 'xwSoakOff', label: '젤 제거하고 큐티클 정리하기', icon: '💅', task: '젤 제거·큐티클 정리', own: true },
];

/** Puts it on its pieces, in the lot's work and among the day's extras (once, at load; after the stage actions, which some look like). */
export function installExtraWork(workplaces: Record<string, WorkplaceDef>) {
  for (const x of EXTRA_WORK) {
    const wp = workplaces[x.career];
    const def = getDef(x.piece);
    if (!wp || def.interactions.some((i) => i.id === x.id)) continue;
    const like = def.interactions.find((i) => i.id === x.like);
    if (!like) throw new Error(`${x.id}: ${x.piece} has no ${x.like}`);
    const { workStage: _, ...rest } = like;
    def.interactions.push({ ...rest, id: x.id, label: x.label, icon: x.icon, onlyAt: x.career, ...(x.own ? {} : { drawnAs: x.like }) });
    wp.work.push(x.id);
    const t: WorkTask = { id: x.id, label: x.task, does: [x.id], need: 1, count: 0, ...(x.minLevel ? { minLevel: x.minLevel } : {}) };
    wp.extra.push(t);
  }
}
