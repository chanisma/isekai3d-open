import type { InteractionDef, NeedKey, ObjectDef, SkillKey } from './types';

/** Work-lot furniture for the everyday Korean jobs (workplaceKorea.ts); none of it is for sale. */

type Effects = Partial<Record<NeedKey, number>>;

/** Work done at a station: counts on any work lot, raises a skill at 1/rate a minute. */
const work = (id: string, label: string, icon: string, duration: number, effects: Effects, skill?: SkillKey, rate = 100): InteractionDef => ({
  id,
  label,
  icon,
  duration,
  effects,
  ...(skill ? { skill: { key: skill, rate: 1 / rate } } : {}),
  requires: 'atWork',
  pose: 'front',
});
/** The answer to a call-out (only while one is on). */
const alarm = (id: string, label: string, icon: string, duration: number, effects: Effects, skill: SkillKey, rate = 60): InteractionDef => ({
  ...work(id, label, icon, duration, effects, skill, rate),
  requires: 'workAlarm',
});
/** Off the lot for a while (a round, a call-out): the dweller leaves and comes back. */
const away = (i: InteractionDef): InteractionDef => ({ ...i, offLot: true });

const station = (id: string, name: string, w: number, h: number, icon: string, color: string, interactions: InteractionDef[]): ObjectDef => ({
  id,
  name,
  price: 0,
  w,
  h,
  icon,
  color,
  category: 'skill',
  unlisted: true,
  interactions,
});

export const KOREA_OBJECTS: ObjectDef[] = [
  // ---- 주민센터 (행정 공무원) ----
  station('civilCounter', '민원 창구', 1, 1, '🪪', '#90a4ae', [
    work('issueCertificate', '증명서 발급하기', '🪪', 15, { social: 0.2 }, 'logic', 120),
    work('processPermit', '인허가 서류 처리하기', '📑', 35, { fun: -0.05 }, 'writing', 90),
    alarm('rushCounter', '밀린 민원 처리하기', '🔢', 40, { energy: -0.15 }, 'logic'),
  ]),
  // ---- 우체국 (집배원) ----
  station('mailSorter', '우편 분류대', 2, 1, '✉️', '#ef5350', [work('sortMail', '우편물 분류하기', '✉️', 25, { fun: -0.05 }, 'logic', 120)]),
  station('parcelScale', '소포 저울', 1, 1, '⚖️', '#b0bec5', [work('weighParcel', '소포 무게 재기', '📦', 10, { energy: -0.05 }, 'logic', 200)]),
  station('postCounter', '우체국 창구', 2, 1, '🏤', '#e53935', [work('servePostCounter', '창구 업무 보기', '🏤', 25, { social: 0.3 }, 'charisma', 110)]),
  station('mailScooter', '우편 배달 오토바이', 2, 1, '🛵', '#d32f2f', [
    away(work('deliverRoute', '우편 배달 돌기', '🛵', 60, { energy: -0.25, fun: 0.1 }, 'fitness', 90)),
    away(alarm('expressDelivery', '긴급 등기 배달하기', '📮', 45, { energy: -0.2 }, 'fitness')),
    work('mpLoadBike', '오토바이에 우편 싣기', '🛵', 15, { energy: -0.1 }, 'fitness', 150),
  ]),
  // ---- 교정시설 (교정공무원) ----
  station('cctvConsole', '보안 관제 콘솔', 2, 1, '📹', '#263238', [
    work('monitorCells', '수용동 관제하기', '📹', 30, { fun: -0.05 }, 'logic', 100),
    alarm('respondDisturbance', '소란 현장 대응하기', '🚨', 40, { energy: -0.2 }, 'charisma'),
  ]),
  station('visitBooth', '접견실 칸막이', 2, 2, '🪟', '#78909c', [work('superviseVisit', '접견 입회하기', '👀', 30, { social: 0.1 }, 'charisma', 120)]),
  station('counselTable', '교화 상담 테이블', 2, 2, '🗒️', '#8d6e63', [work('counselInmate', '수용자 상담하기', '🗒️', 30, { social: 0.3 }, 'charisma', 90), work('gjLetter', '가족 편지 쓰기 도와주기', '✉️', 24, { social: 0.25 }, 'empathy', 100)]),
  // ---- 해양경찰 파출소 ----
  station('radarConsole', '해상 레이더', 1, 1, '📡', '#1b5e20', [work('monitorRadar', '해상 레이더 감시하기', '📡', 30, { fun: -0.05 }, 'logic', 100)]),
  station('rescueGear', '구조 장비함', 1, 1, '🛟', '#ff6f00', [work('checkRescueGear', '구조 장비 점검하기', '🛟', 20, { fun: -0.05 }, 'handiness', 110)]),
  station('divingTank', '잠수 훈련 수조', 2, 2, '🤿', '#4fc3f7', [work('diveTraining', '잠수 훈련하기', '🤿', 40, { energy: -0.3, hygiene: 0.2 }, 'fitness', 70)]),
  station('patrolBoat', '경비정', 2, 1, '🚤', '#0d47a1', [
    away(work('seaPatrol', '해상 순찰 나가기', '🚤', 60, { energy: -0.15, fun: 0.1 }, 'fishing', 120)),
    away(alarm('seaRescue', '조난 구조 출동하기', '🆘', 60, { energy: -0.3 }, 'fitness')),
    // At the helm in the wheelhouse before it puts out (2026-10-27 workplace pipeline): the engines, the instruments, the lights.
    work('cgBoatCheck', '출항 전 경비정 점검하기', '⚓', 25, { fun: -0.03 }, 'driving', 130),
  ]),
  // The 연안구조정 moored at the quay before the station (2026-11-04, the layout audit): an S-65 class boat, 15 m by 4. Diving practice
  // is done off it in the water before the quay, not in a tank in the station.
  station('cgRescueBoat', '연안구조정', 15, 4, '🚤', '#eceff1', [
    away(work('seaPatrol', '해상 순찰 나가기', '🚤', 60, { energy: -0.15, fun: 0.1 }, 'fishing', 120)),
    away(alarm('seaRescue', '조난 구조 출동하기', '🆘', 60, { energy: -0.3 }, 'fitness')),
    work('cgBoatCheck', '출항 전 구조정 점검하기', '⚓', 25, { fun: -0.03 }, 'driving', 130),
    away(work('diveTraining', '부두 앞 바다에서 잠수 훈련하기', '🤿', 40, { energy: -0.3, hygiene: 0.2 }, 'fitness', 70)),
  ]),
  // ---- 공항 세관 (관세 공무원) ----
  station('baggageXray', '수하물 엑스레이', 2, 1, '🧳', '#546e7a', [work('scanBaggage', '수하물 판독하기', '🔍', 25, { fun: -0.05 }, 'logic', 90)]),
  station('inspectionTable', '세관 검사대', 2, 1, '🛃', '#90a4ae', [
    work('inspectLuggage', '여행 가방 검사하기', '🧳', 25, { energy: -0.05 }, 'handiness', 110),
    alarm('suspiciousCargo', '수상한 화물 정밀 검사', '🚩', 45, { energy: -0.15 }, 'logic'),
  ]),
  station('customsDesk', '통관 서류 데스크', 1, 1, '📋', '#607d8b', [work('reviewDeclaration', '수입 신고서 심사하기', '📋', 30, { fun: -0.05 }, 'logic', 100)]),
  // ---- 청소 차고지 (환경미화원) ----
  station('garbageTruck', '청소차', 5, 2, '🚛', '#2e7d32', [
    away(work('collectRoute', '쓰레기 수거 돌기', '🚛', 60, { energy: -0.25, hygiene: -0.3 }, 'fitness', 90)),
    away(alarm('stormCleanup', '태풍 뒤 긴급 청소', '🌀', 60, { energy: -0.3, hygiene: -0.3 }, 'fitness')),
    work('snLoadBags', '봉투 싣고 압착하기', '🗑️', 25, { energy: -0.2, hygiene: -0.15 }, 'fitness', 100),
    work('snCheckGate', '테일게이트 점검하기', '🔦', 18, { fun: -0.03 }, 'handiness', 130),
  ]),
  station('recycleSorter', '재활용 선별대', 4, 1, '♻️', '#43a047', [work('sortRecycling', '재활용품 선별하기', '♻️', 30, { hygiene: -0.15 }, 'handiness', 110)]),
  station('washBay', '장비 세척대', 1, 1, '🚿', '#4dd0e1', [work('washEquipment', '장비 세척하기', '🧽', 20, { hygiene: -0.05 }, 'handiness', 150)]),
  // ---- 종합사회복지관 (사회복지사) ----
  station('caseDesk', '사례관리 책상', 1, 1, '📂', '#8d6e63', [
    work('manageCase', '사례 관리하기', '📂', 35, { fun: -0.05 }, 'logic', 90),
    work('writeCaseNote', '상담 기록 쓰기', '📝', 25, { fun: -0.05 }, 'writing', 110),
  ]),
  station('donationShelf', '후원 물품 선반', 1, 1, '📦', '#ffb74d', [work('sortDonations', '후원 물품 정리하기', '📦', 20, { energy: -0.05 }, 'logic', 200)]),
  station('mealServiceCounter', '경로식당 배식대', 2, 1, '🍚', '#a1887f', [work('serveSeniorMeal', '어르신 식사 배식하기', '🍚', 30, { social: 0.3 }, 'cooking', 120)]),
  station('welfareVan', '복지관 차량', 2, 1, '🚐', '#43a047', [away(alarm('checkOnElder', '어르신 댁 방문하기', '🏠', 50, { social: 0.3, energy: -0.1 }, 'charisma'))]),
  // ---- 요양원 (요양보호사) ----
  station('careBed', '요양 침대', 1, 2, '🛏️', '#b2dfdb', [
    work('assistCare', '돌봄 드리기', '🤲', 30, { social: 0.3 }, 'charisma', 100),
    work('turnPatient', '자세 바꿔 드리기', '🔄', 15, { energy: -0.1 }, 'fitness', 140),
    alarm('fallResponse', '낙상 알림 대응하기', '🔔', 30, { energy: -0.1 }, 'charisma'),
  ]),
  station('mealCart', '식사 카트', 2, 1, '🍲', '#ffcc80', [work('serveMealCart', '식사 도와드리기', '🍲', 25, { social: 0.2 }, 'cooking', 120)]),
  station('walkingRail', '보행 손잡이', 2, 1, '🦯', '#bcaaa4', [work('walkWithElder', '산책 보조하기', '🚶', 30, { energy: -0.1, social: 0.2 }, 'fitness', 120)]),
  // ---- 국공립 어린이집 (보육교사) ----
  station('blockMat', '블록 놀이 매트', 2, 1, '🧱', '#ffe082', [work('buildBlocks', '블록 놀이 지도하기', '🧱', 25, { fun: 0.3 }, 'logic', 120)]),
  // ---- 장애인 복지관 (활동지원사) ----
  station('sensoryMat', '감각 통합 매트', 2, 1, '🌈', '#ce93d8', [work('sensoryProgram', '감각 프로그램 진행하기', '🌈', 30, { social: 0.2, fun: 0.2 }, 'charisma', 100)]),
  station('workshopBench', '보호작업장 작업대', 2, 1, '🧰', '#a1887f', [work('assembleCraft', '작업 활동 지도하기', '🧰', 30, { fun: 0.05 }, 'handiness', 110)]),
  station('parallelBars', '보행 훈련 평행봉', 2, 1, '🦿', '#b0bec5', [work('walkTraining', '보행 훈련 돕기', '🦿', 25, { energy: -0.15 }, 'fitness', 110)]),
  station('adaptiveKitchen', '일상 훈련 주방', 2, 1, '🍳', '#80cbc4', [work('dailySkills', '일상생활 훈련하기', '🍳', 30, { fun: 0.1 }, 'cooking', 110)]),
  station('supportVan', '복지관 송영 차량', 2, 1, '🚐', '#1e88e5', [away(alarm('escortOuting', '외출 동행하기', '🚐', 50, { energy: -0.15, social: 0.2 }, 'charisma'))]),
  // ---- 청소년수련관 (청소년지도사) ----
  station('activityMat', '체육 활동 매트', 2, 1, '🤸', '#4fc3f7', [work('leadActivity', '체육 활동 지도하기', '🤸', 30, { energy: -0.2, fun: 0.3 }, 'fitness', 90)]),
  station('pingpongTable', '탁구대', 2, 1, '🏓', '#2e7d32', [work('playPingPong', '탁구 지도하기', '🏓', 25, { fun: 0.4, energy: -0.1 }, 'fitness', 110)]),
  station('programDesk', '프로그램 기획 책상', 1, 1, '🗓️', '#90a4ae', [work('planProgram', '프로그램 기획하기', '🗓️', 30, { fun: 0.05 }, 'writing', 100)]),
  station('youthCounselDesk', '청소년 상담 책상', 1, 1, '💬', '#9575cd', [work('counselYouth', '청소년 상담하기', '💬', 30, { social: 0.3 }, 'charisma', 90)]),
  station('youthBus', '수련관 버스', 2, 1, '🚌', '#fb8c00', [away(alarm('leadCamp', '캠프 인솔하기', '🏕️', 60, { energy: -0.2, fun: 0.3 }, 'fitness'))]),
  // ---- 재활센터 (물리치료사) ----
  station('therapyTable', '치료 베드', 1, 2, '🛏️', '#4db6ac', [
    work('manualTherapy', '도수 치료하기', '👐', 30, { energy: -0.1 }, 'handiness', 100),
    work('applyHeatPack', '온열 치료하기', '♨️', 20, { fun: 0.05 }, 'logic', 140),
    alarm('urgentRehab', '수술 직후 재활 치료', '🚑', 40, { energy: -0.15 }, 'fitness'),
  ]),
  station('exerciseBall', '재활 운동 기구', 1, 1, '🏐', '#ff8a65', [work('guideExercise', '운동 치료 지도하기', '🏋️', 30, { energy: -0.15 }, 'fitness', 100)]),
  // ---- 작업치료실 ----
  station('fineMotorTable', '손 기능 훈련 테이블', 2, 1, '✋', '#ffcc80', [
    work('handTraining', '손 기능 훈련하기', '✋', 30, { fun: 0.05 }, 'handiness', 100),
    alarm('urgentAssessment', '급한 발달 평가하기', '📋', 40, { energy: -0.1 }, 'logic'),
  ]),
  // ---- 진단검사센터 (임상병리사) ----
  station('analyzerMachine', '자동 분석기', 2, 1, '🩸', '#eceff1', [
    work('runBloodTest', '혈액 검사 돌리기', '🩸', 25, { fun: -0.05 }, 'logic', 100),
    alarm('statSample', '응급 검체 검사하기', '⚡', 35, { energy: -0.15 }, 'logic'),
  ]),
  station('microscopeBench', '현미경 검사대', 1, 1, '🔬', '#90a4ae', [work('examineSlides', '슬라이드 판독하기', '🔬', 30, { fun: 0.05 }, 'logic', 90)]),
  station('centrifugeUnit', '원심분리기', 1, 1, '🌀', '#b0bec5', [work('spinSamples', '검체 원심분리하기', '🌀', 15, { fun: -0.05 }, 'handiness', 150)]),
  station('sampleFridge', '검체 냉장고', 1, 1, '🧊', '#e3f2fd', [work('organizeSamples', '검체 정리하기', '🧊', 15, { fun: -0.05 }, 'logic', 180)]),
  // ---- 영상의학센터 (방사선사) ----
  station('xrayMachine', '엑스레이 촬영기', 2, 1, '🩻', '#cfd8dc', [work('takeXray', '엑스레이 촬영하기', '🩻', 20, { fun: -0.05 }, 'logic', 110)]),
  station('ctScanner', 'CT 스캐너', 2, 2, '🌀', '#fafafa', [
    work('runCtScan', 'CT 촬영하기', '🌀', 30, { fun: -0.05 }, 'logic', 90),
    alarm('urgentScan', '응급 CT 촬영하기', '🚨', 35, { energy: -0.15 }, 'logic'),
  ]),
  station('mriScanner', 'MRI', 2, 2, '🧲', '#e0e0e0', [work('runMriScan', 'MRI 촬영하기', '🧲', 40, { fun: -0.05 }, 'logic', 80)]),
  station('linacMachine', '방사선 치료기', 2, 2, '☢️', '#e1f5fe', [work('radiationTherapy', '방사선 치료하기', '☢️', 35, { fun: -0.05 }, 'logic', 90)]),
  // ---- 119 안전센터 (응급구조사) ----
  station('cprManikin', '심폐소생술 마네킹', 1, 1, '🫀', '#ef9a9a', [work('cprTraining', '심폐소생술 훈련하기', '🫀', 25, { energy: -0.2 }, 'fitness', 90)]),
  station('medKitShelf', '구급 장비 선반', 1, 1, '🧰', '#ef5350', [work('restockMedKit', '구급 장비 정비하기', '🧰', 20, { fun: -0.05 }, 'handiness', 130)]),
  station('dispatchDesk', '출동 지령 단말', 1, 1, '📟', '#455a64', [work('reviewDispatch', '출동 기록 정리하기', '📟', 25, { fun: -0.05 }, 'writing', 110)]),
  station('ambulance', '구급차', 2, 1, '🚑', '#fafafa', [away(alarm('emergencyDispatch', '응급 출동하기', '🚑', 60, { energy: -0.3 }, 'fitness'))]),
  // ---- 한의원 (한의사) ----
  station('acupunctureBed', '침 치료 베드', 1, 2, '🪡', '#a1887f', [
    work('acupuncture', '침 치료하기', '🪡', 30, { fun: 0.05 }, 'handiness', 90),
    work('cupping', '부항 치료하기', '🫙', 20, { fun: 0.05 }, 'handiness', 120),
    alarm('acuteBackPain', '급성 요통 치료하기', '🤕', 40, { energy: -0.1 }, 'handiness'),
  ]),
  station('herbCabinet', '약재장', 2, 1, '🌿', '#6d4c41', [work('prepareHerbs', '한약 조제하기', '🌿', 30, { fun: 0.05 }, 'gardening', 90)]),
  station('herbDecoctor', '탕전기', 1, 1, '♨️', '#bcaaa4', [work('brewHerbalMed', '한약 달이기', '♨️', 25, { fun: -0.05 }, 'cooking', 130)]),
  station('pulseDesk', '진맥 책상', 1, 1, '🫳', '#8d6e63', [work('pulseDiagnosis', '진맥하기', '🫳', 20, { social: 0.2 }, 'logic', 100)]),
  // ---- 단체급식실 (영양사) ----
  station('menuDesk', '식단 책상', 1, 1, '📋', '#aed581', [
    work('planMenu', '식단 짜기', '📋', 30, { fun: 0.05 }, 'cooking', 90),
    work('calcNutrition', '영양 계산하기', '🧮', 25, { fun: -0.05 }, 'logic', 110),
  ]),
  station('bulkCooker', '대형 조리기', 2, 1, '🍲', '#90a4ae', [work('checkCooking', '조리 점검하기', '🍲', 20, { hygiene: -0.05 }, 'cooking', 110)]),
  station('servingLine', '배식대', 2, 1, '🍱', '#b0bec5', [work('superviseServing', '배식 관리하기', '🍱', 30, { social: 0.2 }, 'charisma', 120)]),
  station('hygieneStation', '위생 점검대', 1, 1, '🧪', '#4dd0e1', [
    work('hygieneCheck', '위생 점검하기', '🧪', 20, { fun: -0.05 }, 'logic', 130),
    alarm('hygieneInspection', '위생 검사 대응하기', '🧾', 40, { energy: -0.1 }, 'logic'),
  ]),
  station('foodStorage', '식재료 창고 선반', 1, 1, '🥬', '#c5e1a5', [work('checkInventory', '식재료 검수하기', '🥬', 20, { fun: -0.05 }, 'cooking', 150)]),
  // ---- 안경원 (안경사) ----
  station('eyeTestChart', '시력 검사기', 2, 1, '👁️', '#90caf9', [work('eyeExam', '시력 검사하기', '👁️', 20, { social: 0.2 }, 'logic', 100)]),
  station('lensEdger', '렌즈 가공기', 1, 1, '⚙️', '#78909c', [
    work('cutLenses', '렌즈 가공하기', '⚙️', 25, { fun: 0.05 }, 'handiness', 100),
    alarm('rushGlasses', '급한 안경 만들기', '👓', 35, { energy: -0.1 }, 'handiness'),
  ]),
  station('frameDisplay', '안경테 진열장', 2, 1, '👓', '#d7ccc8', [work('arrangeFrames', '안경테 진열하기', '👓', 15, { fun: 0.05 }, 'painting', 150)]),
  station('fittingTable', '안경 피팅 테이블', 2, 1, '🔧', '#a1887f', [work('adjustFrames', '안경 맞춰 주기', '🔧', 15, { social: 0.2 }, 'handiness', 120)]),
  // ---- 입시학원 (학원 강사) ----
  station('lecturePodium', '강의 교탁', 1, 1, '🎤', '#5d4037', [
    work('lectureClass', '강의하기', '📚', 45, { social: 0.3, energy: -0.1 }, 'charisma', 80),
    alarm('examCramming', '시험 직전 특강하기', '📝', 45, { energy: -0.2 }, 'charisma'),
  ]),
  station('tutorDesk', '첨삭 책상', 1, 1, '✏️', '#8d6e63', [
    work('gradeEssays', '첨삭하기', '✏️', 30, { fun: -0.05 }, 'writing', 90),
    work('prepareHandouts', '교재 만들기', '📄', 30, { fun: 0.05 }, 'writing', 100),
  ]),
  station('lectureCamera', '인강 촬영 장비', 1, 1, '🎥', '#263238', [work('recordLecture', '인터넷 강의 찍기', '🎥', 40, { fun: 0.2 }, 'charisma', 90)]),
  // ---- 유치원 ----
  station('recitalStage', '학예회 무대', 2, 1, '🎭', '#ec407a', [
    work('leadRecital', '율동 지도하기', '💃', 30, { fun: 0.3, energy: -0.1 }, 'charisma', 100),
    alarm('recitalRehearsal', '학예회 리허설하기', '🎭', 40, { fun: 0.3, energy: -0.15 }, 'charisma'),
  ]),
  station('sandTable', '모래 놀이대', 2, 1, '⏳', '#ffe0b2', [work('sandPlay', '모래 놀이 지도하기', '⏳', 25, { fun: 0.3, hygiene: -0.1 }, 'painting', 120)]),
  // ---- 음악학원 ----
  // 2 × 2 (2026-10-27): a baby grand's case runs back from the keys, the pupil's bench and the teacher's chair in front.
  station('lessonPiano', '레슨용 그랜드 피아노', 2, 2, '🎹', '#212121', [
    work('giveLesson', '피아노 레슨하기', '🎹', 40, { social: 0.2, fun: 0.2 }, 'piano', 80),
    alarm('competitionLesson', '콩쿠르 대비 레슨하기', '🏆', 45, { energy: -0.15 }, 'piano'),
  ]),
  station('theoryDesk', '음악 이론 책상', 1, 1, '🎼', '#8d6e63', [work('teachTheory', '음악 이론 가르치기', '🎼', 25, { social: 0.2 }, 'piano', 110)]),
  // ---- 운전면허학원 ----
  station('drivingCar', '연수용 차량', 2, 1, '🚗', '#fdd835', [work('teachParking', '주차 연습 지도하기', '🅿️', 30, { social: 0.2 }, 'logic', 90)]),
  station('trafficCone', '기능 코스 라바콘', 1, 1, '🚧', '#ff7043', [work('setupCourse', '코스 정비하기', '🚧', 15, { energy: -0.1 }, 'fitness', 150)]),
  station('roadTestCar', '도로 연수 차량', 2, 1, '🚙', '#1565c0', [away(work('roadTraining', '도로 연수 나가기', '🛣️', 60, { energy: -0.1, social: 0.2 }, 'logic', 90))]),
  station('examBooth', '기능 검정 부스', 1, 1, '📋', '#90a4ae', [alarm('superviseExam', '기능 시험 감독하기', '📋', 40, { fun: -0.05 }, 'logic')]),
  // ---- 요가·필라테스 스튜디오 ----
  station('yogaMat', '요가 매트', 2, 1, '🧘', '#9575cd', [
    work('leadYogaClass', '요가 수업하기', '🧘', 45, { energy: -0.1, fun: 0.2 }, 'fitness', 80),
    work('guideStretch', '스트레칭 지도하기', '🙆', 20, { fun: 0.1 }, 'fitness', 120),
    alarm('corporateClass', '단체 수업 진행하기', '🏢', 45, { energy: -0.2 }, 'fitness'),
  ]),
  station('reformer', '필라테스 리포머', 2, 1, '🛠️', '#bcaaa4', [work('pilatesSession', '필라테스 개인 레슨', '🤸', 40, { energy: -0.15 }, 'fitness', 90)]),
  // ---- 택배 물류센터 (택배 기사) ----
  station('conveyorBelt', '분류 컨베이어', 3, 1, '📦', '#78909c', [work('sortParcels', '택배 분류하기', '📦', 30, { energy: -0.2 }, 'fitness', 100)]),
  station('parcelCage', '택배 롤테이너', 1, 1, '🗃️', '#90a4ae', [work('stackParcels', '택배 쌓기', '🗃️', 20, { energy: -0.2 }, 'fitness', 120)]),
  station('scannerDesk', '송장 스캐너', 1, 1, '🏷️', '#455a64', [work('scanWaybills', '송장 스캔하기', '🏷️', 20, { fun: -0.05 }, 'logic', 140)]),
  station('deliveryTruck', '택배 차량', 2, 1, '🚚', '#fafafa', [
    away(work('deliverParcels', '택배 배송 돌기', '🚚', 60, { energy: -0.25, fun: 0.05 }, 'fitness', 90)),
    away(alarm('sameDayDelivery', '당일 특급 배송하기', '⚡', 45, { energy: -0.2 }, 'fitness')),
    // Loading it at the open back before a round (2026-10-27 workplace pipeline).
    work('cxLoadTruck', '택배 상차하기', '📦', 20, { energy: -0.2 }, 'fitness', 110),
  ]),
  // ---- 버스 차고지 (버스 기사) ----
  // As long as it's drawn (2026-10-27 workplace pipeline): dwellers walk round a bus, not through it.
  station('cityBus', '시내버스', 2, 11, '🚌', '#43a047', [
    away(work('driveRoute', '노선 운행하기', '🚌', 60, { energy: -0.15, social: 0.2 }, 'logic', 90)),
    work('inspectBus', '차량 점검하기', '🔧', 20, { fun: -0.05 }, 'handiness', 140),
    away(alarm('extraRun', '출퇴근 증편 운행하기', '⏰', 50, { energy: -0.2 }, 'logic')),
  ]),
  station('farebox', '요금 정산기', 1, 1, '💳', '#546e7a', [work('settleFares', '요금 정산하기', '💳', 15, { fun: -0.05 }, 'logic', 160)]),
  station('routeBoard', '노선 안내판', 1, 1, '🗺️', '#1565c0', [work('studyRoute', '노선 숙지하기', '🗺️', 20, { fun: -0.05 }, 'logic', 120)]),
  // ---- 택시 차고지 (택시 기사) ----
  station('taxiCab', '택시', 2, 1, '🚕', '#fdd835', [
    away(work('pickUpFares', '손님 태우러 돌기', '🚕', 60, { social: 0.3, energy: -0.1 }, 'charisma', 90)),
    away(alarm('airportCall', '공항 콜 운행하기', '✈️', 60, { energy: -0.15 }, 'logic')),
    work('txCheckMeter', '미터기·표시등 점검하기', '🧾', 15, { fun: -0.03 }, 'driving', 150),
  ]),
  station('navTerminal', '콜 단말기', 1, 1, '📱', '#263238', [work('checkCalls', '콜 확인하기', '📱', 15, { fun: 0.05 }, 'logic', 150)]),
  // ---- 지하철 승무사업소 (지하철 기관사) ----
  station('trainSimulator', '운전 시뮬레이터', 2, 1, '🎛️', '#37474f', [work('simDrive', '운전 모의 훈련하기', '🎛️', 30, { fun: 0.1 }, 'logic', 90)]),
  station('controlPanel', '관제 패널', 2, 1, '🖥️', '#1a237e', [
    work('monitorTrains', '열차 운행 감시하기', '🚇', 30, { fun: -0.05 }, 'logic', 100),
    alarm('signalFault', '신호 장애 대응하기', '🚦', 40, { energy: -0.15 }, 'logic'),
  ]),
  station('crewDesk', '승무 일지 책상', 1, 1, '📒', '#607d8b', [work('writeCrewLog', '승무 일지 쓰기', '📒', 20, { fun: -0.05 }, 'writing', 130)]),
  station('subwayTrain', '출고 열차', 2, 1, '🚇', '#90a4ae', [away(work('runTrain', '열차 운행하기', '🚇', 60, { energy: -0.15 }, 'logic', 80))]),
  // The train in at the platform (2026-11-04, the layout audit): a car and a half beside the screen doors, the cab at the platform's end
  // where the driver takes it over; a fault on the line is answered from the cab on the radio, as 관제 directs.
  station('sbPlatformTrain', '승강장 열차', 22, 3, '🚇', '#90a4ae', [
    away(work('runTrain', '열차 운행하기', '🚇', 60, { energy: -0.15 }, 'logic', 80)),
    alarm('signalFault', '신호 장애 때 관제 지시대로 조치하기', '🚦', 40, { energy: -0.15 }, 'logic'),
  ]),
  // ---- 해운 항만 사무소 (항해사) ----
  station('shipBridge', '선교 조타 시뮬레이터', 2, 1, '⚓', '#0d47a1', [work('navigationDrill', '항해 훈련하기', '⚓', 30, { fun: 0.1 }, 'logic', 90)]),
  station('chartTable', '해도 테이블', 2, 1, '🗺️', '#a1887f', [work('plotCourse', '항로 계획하기', '🧭', 30, { fun: 0.05 }, 'logic', 100)]),
  station('cargoPlanner', '적하 계획 단말', 1, 1, '🏗️', '#455a64', [work('planCargo', '적하 계획 짜기', '🏗️', 25, { fun: -0.05 }, 'logic', 120)]),
  // The ship at the quay (2026-11-04, the layout audit): its bridge's console (the helm and autopilot, radar, ECDIS and VHF along the
  // windows), where the watch is kept and a typhoon's departure commanded; the gangway, where whoever comes aboard is checked.
  station('sfHelmConsole', '선교 조타 콘솔', 4, 1, '⚓', '#263238', [
    work('sfStandWatch', '항해 당직 서기', '⚓', 30, { fun: -0.03 }, 'logic', 90),
    alarm('stormDeparture', '태풍 피항 지휘하기', '🌀', 60, { energy: -0.25 }, 'logic'),
  ]),
  station('sfGangway', '현문 사다리', 1, 1, '🪜', '#90a4ae', [work('boardShip', '현문에서 승선자 확인하기', '🪜', 20, { social: 0.1 }, 'logic', 110)]),
  station('cargoTender', '통선', 2, 1, '🛥️', '#0277bd', [
    away(work('boardShip', '본선 승선 점검하기', '🛥️', 60, { energy: -0.15 }, 'fishing', 110)),
    away(alarm('stormDeparture', '태풍 피항 지휘하기', '🌀', 60, { energy: -0.25 }, 'logic')),
  ]),
  // ---- 전기 공사 업체 (전기기사) ----
  station('wiringBoard', '공사 중 벽 속 배선', 2, 1, '🔌', '#90a4ae', [work('wirePanel', '배선 작업하기', '🔌', 30, { fun: 0.05 }, 'handiness', 90)]),
  station('switchboard', '분전반', 1, 1, '⚡', '#78909c', [work('inspectPanel', '분전반 점검하기', '⚡', 20, { fun: -0.05 }, 'logic', 120)]),
  station('cableReel', '전선 드럼', 1, 1, '🧵', '#ff7043', [work('cutCable', '전선 재단하기', '✂️', 15, { energy: -0.05 }, 'handiness', 150)]),
  station('circuitDesk', '회로 설계 책상', 1, 1, '📐', '#607d8b', [work('drawCircuit', '회로 설계하기', '📐', 30, { fun: -0.05 }, 'logic', 100)]),
  station('serviceVan', '전기 공사 차량', 2, 1, '🚐', '#ffb300', [
    away(work('siteInstall', '현장 시공 나가기', '🏗️', 60, { energy: -0.2 }, 'handiness', 90)),
    away(alarm('blackoutCall', '정전 긴급 출동하기', '🔦', 50, { energy: -0.2 }, 'handiness')),
  ]),
  // ---- 설비 업체 (배관공) ----
  station('pipeBench', '배관 작업대', 2, 1, '🔧', '#8d6e63', [work('cutPipes', '배관 자르고 잇기', '🔧', 30, { energy: -0.1 }, 'handiness', 90)]),
  station('leakDetector', '누수 탐지기', 1, 1, '💧', '#4fc3f7', [work('testLeak', '누수 탐지 연습하기', '💧', 20, { fun: 0.05 }, 'logic', 120)]),
  station('boilerUnit', '보일러 수리대', 1, 1, '🔥', '#bdbdbd', [work('repairBoiler', '보일러 수리하기', '🔥', 30, { energy: -0.1 }, 'handiness', 100)]),
  station('plumbingVan', '설비 출장 차량', 2, 1, '🚐', '#1e88e5', [
    work('pbLoadVan', '출동 짐 싣고 점검하기', '🧰', 15, { energy: -0.05 }, 'handiness', 170),
    away(work('serviceCall', '출장 수리 나가기', '🧰', 60, { energy: -0.2 }, 'handiness', 90)),
    away(alarm('burstPipe', '동파 배관 긴급 출동', '🧊', 50, { energy: -0.2 }, 'handiness')),
  ]),
  // ---- 목공소 (목수) ----
  station('carpentryBench', '목공 작업대', 2, 1, '🪚', '#a1887f', [
    work('cutWood', '목재 재단하기', '🪚', 25, { energy: -0.1 }, 'handiness', 100),
    work('joinWood', '짜맞춤하기', '🪵', 35, { fun: 0.1 }, 'handiness', 80),
    work('planeBoard', '대패질하기', '🪵', 25, { energy: -0.1, fun: 0.05 }, 'handiness', 100),
    alarm('rushFurniture', '급한 맞춤 가구 만들기', '🪑', 45, { energy: -0.2 }, 'handiness'),
  ]),
  station('tableSaw', '테이블 쏘', 1, 1, '⚙️', '#78909c', [work('sawBoards', '판재 켜기', '⚙️', 20, { energy: -0.1 }, 'handiness', 120)]),
  station('lumberRack', '목재 선반', 1, 1, '🪵', '#8d6e63', [work('selectLumber', '목재 고르기', '🪵', 15, { fun: 0.05 }, 'logic', 160)]),
  station('finishingTable', '마감 도장대', 2, 1, '🎨', '#d7ccc8', [work('finishFurniture', '오일 마감하기', '🖌️', 30, { fun: 0.1 }, 'painting', 100)]),
  // ---- 조선소 용접장 (용접공) ----
  station('weldingBooth', '용접 부스', 2, 1, '🔥', '#455a64', [
    work('weldSeam', '용접하기', '🔥', 35, { energy: -0.15, hygiene: -0.15 }, 'handiness', 80),
    alarm('urgentWeld', '진수 전 긴급 보수 용접', '⚓', 45, { energy: -0.25, hygiene: -0.2 }, 'handiness'),
  ]),
  station('steelPlates', '강판 더미', 2, 1, '🔩', '#90a4ae', [work('cutSteel', '강판 절단하기', '🔩', 25, { energy: -0.15 }, 'handiness', 110)]),
  station('grinderStation', '그라인더 작업대', 1, 1, '💥', '#616161', [work('grindWelds', '용접부 다듬기', '💥', 20, { hygiene: -0.1 }, 'handiness', 130)]),
  station('inspectionRig', '비파괴 검사기', 1, 1, '🔍', '#26a69a', [work('inspectWeld', '용접 검사하기', '🔍', 25, { fun: -0.05 }, 'logic', 110)]),
  // ---- 인테리어 시공 현장 (도배·타일) ----
  station('wallpaperTable', '도배 풀칠대', 2, 1, '🧻', '#f5f5f5', [work('pasteWallpaper', '벽지 풀칠하기', '🧻', 20, { hygiene: -0.05 }, 'handiness', 140)]),
  station('tileSaw', '타일 절단기', 1, 1, '🔪', '#78909c', [work('cutTiles', '타일 자르기', '🔪', 20, { energy: -0.05 }, 'handiness', 130)]),
  station('mockWall', '시공 중인 벽', 2, 1, '🧱', '#ffe0b2', [
    work('hangWallpaper', '도배하기', '🖼️', 35, { fun: 0.1 }, 'painting', 90),
    work('layTiles', '타일 붙이기', '🧱', 35, { energy: -0.1 }, 'handiness', 90),
    alarm('moveInDeadline', '이사 전날 마감 시공', '📦', 45, { energy: -0.2 }, 'handiness'),
  ]),
  // ---- 승강기 서비스센터 (승강기 정비원) ----
  station('elevatorMockup', '승강기 (점검 중)', 2, 2, '🛗', '#b0bec5', [work('practiceRepair', '도어·안전장치 점검하기', '🛗', 35, { fun: 0.05 }, 'handiness', 90)]),
  station('motorBench', '권상기', 2, 1, '⚙️', '#607d8b', [work('serviceMotor', '권상기 정비하기', '⚙️', 30, { energy: -0.1 }, 'handiness', 100)]),
  station('partsCabinet', '부품함', 1, 1, '🗄️', '#90a4ae', [work('orderParts', '부품 정리하기', '🗄️', 15, { fun: -0.05 }, 'logic', 160)]),
  station('monitorDesk', '원격 감시 단말', 1, 1, '🖥️', '#263238', [work('remoteMonitor', '원격 감시하기', '🖥️', 25, { fun: -0.05 }, 'logic', 110), work('etTrapCall', '갇힘 신고 응대하기', '🆘', 20, { energy: -0.05 }, 'charisma', 110)]),
  station('elevatorVan', '승강기 서비스 차량', 2, 1, '🚐', '#43a047', [
    work('etLoadVan', '점검 장비 싣기', '🧰', 15, { energy: -0.08 }, 'handiness', 170),
    away(work('routineCheck', '정기 점검 나가기', '🛠️', 60, { energy: -0.15 }, 'handiness', 90)),
    away(alarm('trappedRescue', '갇힘 구출 출동하기', '🆘', 45, { energy: -0.2 }, 'handiness')),
  ]),
  // ---- 어항 (어부) ----
  station('fishingBoat', '어선', 2, 1, '🚤', '#1565c0', [
    work('fhReadyBoat', '출항 준비하기', '⚓', 20, { energy: -0.08 }, 'fishing', 150),
    away(work('goFishingTrip', '조업 나가기', '🎣', 60, { energy: -0.25, fun: 0.1 }, 'fishing', 70)),
    away(alarm('fishRun', '고등어 떼 쫓아 출항하기', '🐟', 60, { energy: -0.3 }, 'fishing')),
  ]),
  // A 연안어선 alongside the quay (2026-11-04, the layout audit; a 9.77톤 boat is about 19 m by 4): the wheelhouse aft, the working deck
  // forward with the net hauler at the starboard rail, the hold's hatch.
  station('fhBoat', '연안어선', 16, 4, '🚤', '#1565c0', [
    work('fhReadyBoat', '출항 준비하기', '⚓', 20, { energy: -0.08 }, 'fishing', 150),
    away(work('goFishingTrip', '조업 나가기', '🎣', 60, { energy: -0.25, fun: 0.1 }, 'fishing', 70)),
    away(alarm('fishRun', '고등어 떼 쫓아 출항하기', '🐟', 60, { energy: -0.3 }, 'fishing')),
  ]),
  station('netRack', '그물 손질대', 2, 1, '🕸️', '#8d6e63', [work('mendNets', '그물 손질하기', '🕸️', 30, { fun: -0.05 }, 'handiness', 110)]),
  station('fishCrates', '어상자', 1, 1, '🐟', '#4fc3f7', [work('sortCatch', '어획물 선별하기', '🐟', 20, { hygiene: -0.1 }, 'fishing', 100)]),
  station('fishAuction', '위판대', 2, 1, '🔔', '#90a4ae', [work('sellAtAuction', '위판하기', '🔔', 25, { social: 0.3 }, 'charisma', 110)]),
  // ---- 양식장 (양식업자) ----
  station('fishTank', '양식 수조', 2, 2, '🐠', '#0288d1', [
    work('feedFish', '사료 주기', '🐠', 20, { fun: 0.05 }, 'fishing', 90),
    work('checkWater', '수질 검사하기', '🧪', 20, { fun: -0.05 }, 'logic', 110),
    alarm('oxygenAlarm', '산소 부족 대응하기', '🫧', 35, { energy: -0.15 }, 'fishing'),
  ]),
  station('shellLine', '전복 사육조', 2, 1, '🐚', '#4dd0e1', [work('tendShellfish', '전복 돌보기', '🐚', 25, { hygiene: -0.05 }, 'fishing', 100)]),
  station('waterSensor', '수질 센서 단말', 1, 1, '📟', '#263238', [work('monitorSensors', '센서 감시하기', '📟', 20, { fun: -0.05 }, 'programming', 130)]),
  station('harvestNet', '출하 작업대', 2, 1, '🧺', '#b0bec5', [work('harvestFish', '출하 작업하기', '🧺', 30, { energy: -0.2 }, 'fitness', 110)]),
  // ---- 해녀의 집 (해녀) ----
  station('diveSpot', '물질 포인트', 2, 1, '🤿', '#0277bd', [
    work('freeDive', '물질하기', '🤿', 40, { energy: -0.3, hygiene: 0.2 }, 'fishing', 70),
    alarm('seasonOpen', '소라 채취 개시 물질', '🐚', 45, { energy: -0.3 }, 'fishing'),
  ]),
  station('bulteok', '불턱', 2, 1, '🔥', '#6d4c41', [work('warmUp', '불턱에서 몸 녹이기', '🔥', 20, { energy: 0.2, social: 0.3 }, 'charisma', 200)]),
  station('catchTable', '해산물 손질대', 2, 1, '🦪', '#b0bec5', [work('cleanSeafood', '해산물 손질하기', '🦪', 25, { hygiene: -0.1 }, 'cooking', 110)]),
  station('tewakRack', '테왁·망사리 정리대', 1, 1, '🟠', '#ff7043', [work('repairGear', '물질 장비 손질하기', '🧵', 20, { fun: -0.05 }, 'handiness', 130)]),
  // ---- 국유림 관리소 (산림 기술자) ----
  station('saplingBed', '묘목 포트', 2, 1, '🌱', '#7cb342', [work('plantSaplings', '묘목 심기', '🌱', 30, { energy: -0.15, hygiene: -0.1 }, 'gardening', 90)]),
  station('thinningSite', '숲가꾸기 구역', 2, 1, '🌲', '#2e7d32', [work('thinTrees', '숲가꾸기 하기', '🪓', 35, { energy: -0.25 }, 'fitness', 100)]),
  station('fireWatchTower', '산불 감시탑', 1, 1, '🗼', '#8d6e63', [work('watchForFire', '산불 감시하기', '🔭', 30, { fun: -0.05 }, 'logic', 110)]),
  station('trailSign', '숲길 안내판', 1, 1, '🪧', '#a1887f', [work('maintainTrail', '숲길 정비하기', '🥾', 25, { energy: -0.15 }, 'fitness', 120)]),
  station('forestTruck', '산림 진화 차량', 2, 1, '🚒', '#e53935', [work('fgCheckTruck', '진화 차량 점검하기', '🚒', 20, { energy: -0.08 }, 'fitness', 130), away(alarm('wildfireCall', '산불 진화 출동하기', '🔥', 60, { energy: -0.3, hygiene: -0.3 }, 'fitness'))]),
  // ---- 편의점 (편의점 점장) ----
  station('storeCounter', '편의점 계산대', 2, 1, '🏪', '#43a047', [
    work('ringUpStore', '계산하기', '🧾', 15, { social: 0.2 }, 'charisma', 130),
    alarm('lunchRush', '점심 피크 계산하기', '🍙', 40, { energy: -0.15 }, 'charisma'),
  ]),
  station('snackShelf', '상품 진열대', 2, 1, '🍫', '#ffcc80', [
    work('restockStore', '상품 진열하기', '📦', 20, { energy: -0.1 }, 'fitness', 150),
    work('checkSellBy', '유통기한 점검하기', '📅', 15, { fun: -0.05 }, 'logic', 150),
  ]),
  station('drinkCooler', '음료 냉장고', 1, 1, '🥤', '#4fc3f7', [work('stockDrinks', '음료 채우기', '🥤', 15, { energy: -0.05 }, 'fitness', 160)]),
  station('deliveryPOS', '택배 접수기', 1, 1, '📦', '#78909c', [work('acceptStoreParcel', '택배 접수하기', '📦', 10, { social: 0.1 }, 'logic', 180)]),
  station('orderTablet', '발주 단말', 1, 1, '📲', '#263238', [work('placeOrder', '발주 넣기', '📲', 20, { fun: -0.05 }, 'logic', 110)]),
  // ---- 보험 지점 (보험설계사) ----
  station('agentDesk', '설계 책상', 1, 1, '🛡️', '#90a4ae', [
    work('designPlan', '보장 설계하기', '📊', 30, { fun: -0.05 }, 'logic', 100),
    work('callClients', '고객 관리 전화하기', '📞', 20, { social: 0.3 }, 'charisma', 110),
  ]),
  station('consultBooth', '상담 부스', 2, 1, '🤝', '#5d4037', [
    work('insuranceConsult', '보험 상담하기', '🤝', 30, { social: 0.3 }, 'charisma', 90),
    alarm('bigContract', '대형 계약 상담하기', '💼', 45, { energy: -0.15 }, 'charisma'),
  ]),
  // ---- 고객센터 (콜센터 상담원) ----
  station('callBooth', '상담석', 1, 1, '🎧', '#b0bec5', [
    work('answerCalls', '상담 전화 받기', '🎧', 30, { social: 0.3, fun: -0.1 }, 'charisma', 90),
    work('writeCallNote', '상담 이력 남기기', '⌨️', 15, { fun: -0.05 }, 'writing', 140),
  ]),
  station('qaDesk', '상담 품질 모니터링석', 1, 1, '📋', '#607d8b', [work('reviewCalls', '상담 녹취 검토하기', '📋', 25, { fun: -0.05 }, 'logic', 110)]),
  station('callBoard', '콜 현황판', 2, 1, '📈', '#1a237e', [
    work('checkQueue', '대기 콜 확인하기', '📈', 10, { fun: -0.05 }, 'logic', 200),
    alarm('callSurge', '콜 폭주 대응하기', '🚨', 40, { energy: -0.2 }, 'charisma'),
  ]),
  // ---- 네일숍 (네일 아티스트) ----
  station('nailTable', '네일 테이블', 2, 1, '💅', '#f8bbd0', [
    work('doManicure', '젤 네일 시술하기', '💅', 35, { fun: 0.1 }, 'handiness', 90),
    work('nailArt', '네일 아트 그리기', '🎨', 30, { fun: 0.3 }, 'painting', 80),
    alarm('weddingNails', '웨딩 네일 시술하기', '💍', 40, { energy: -0.1 }, 'painting'),
  ]),
  station('polishShelf', '컬러 진열장', 1, 1, '🧴', '#f48fb1', [work('arrangePolish', '컬러 정리하기', '🧴', 15, { fun: 0.1 }, 'painting', 160)]),
  station('pedicureChair', '페디큐어 의자', 1, 1, '🦶', '#ce93d8', [work('doPedicure', '페디큐어 시술하기', '🦶', 35, { fun: -0.05 }, 'handiness', 100)]),
  // ---- 에스테틱 (피부관리사) ----
  station('facialBed', '관리 베드', 1, 2, '💆', '#fce4ec', [
    work('doFacial', '얼굴 관리하기', '💆', 35, { fun: 0.05 }, 'handiness', 90),
    work('massageTherapy', '마사지하기', '👐', 30, { energy: -0.1 }, 'fitness', 110),
    alarm('vipSpa', 'VIP 예약 관리하기', '👑', 45, { energy: -0.15 }, 'charisma'),
  ]),
  station('skinAnalyzer', '피부 진단기', 1, 1, '🔍', '#b2ebf2', [work('analyzeSkin', '피부 진단하기', '🔍', 15, { fun: 0.05 }, 'logic', 130)]),
  station('serumShelf', '앰플 조제대', 1, 1, '🧪', '#f8bbd0', [work('mixSerum', '맞춤 앰플 조제하기', '🧪', 20, { fun: 0.05 }, 'logic', 120)]),
  // ---- 메이크업 숍 (메이크업 아티스트) ----
  station('makeupStation', '메이크업 화장대', 2, 1, '💄', '#f8bbd0', [
    work('applyMakeup', '메이크업 하기', '💄', 35, { fun: 0.2 }, 'painting', 80),
    alarm('brideMakeup', '신부 메이크업하기', '👰', 45, { energy: -0.15 }, 'painting'),
  ]),
  station('cosmeticCart', '메이크업 도구 카트', 1, 1, '🖌️', '#e1bee7', [work('washMakeupBrushes', '브러시 세척하기', '🖌️', 15, { hygiene: -0.05 }, 'handiness', 160)]),
  station('specialFxTable', '특수 분장 작업대', 2, 1, '🎭', '#8d6e63', [work('specialEffects', '특수 분장 연습하기', '🎭', 35, { fun: 0.3 }, 'handiness', 90)]),
  // ---- 경호 업체 (경호원) ----
  station('sparringMat', '호신술 매트', 2, 1, '🥋', '#37474f', [work('practiceDefense', '호신술 훈련하기', '🥋', 30, { energy: -0.25, fun: 0.1 }, 'fitness', 80)]),
  station('routeMapTable', '경호 동선 테이블', 2, 1, '🗺️', '#455a64', [work('planRoute', '경호 동선 짜기', '🗺️', 30, { fun: -0.05 }, 'logic', 100)]),
  station('radioRack', '무전기 충전대', 1, 1, '📻', '#212121', [work('checkRadios', '무전 장비 점검하기', '📻', 15, { fun: -0.05 }, 'handiness', 160)]),
  station('escortCar', '경호 차량', 2, 1, '🚗', '#212121', [
    away(work('escortVIP', '수행 경호 나가기', '🕶️', 60, { energy: -0.15, social: 0.1 }, 'fitness', 90)),
    away(alarm('eventSecurity', '긴급 행사 경호하기', '🎤', 60, { energy: -0.25 }, 'fitness')),
  ]),
  // ---- 빌딩 보안실 (보안요원) ----
  station('securityMonitor', '보안 모니터', 2, 1, '🖥️', '#263238', [work('watchCameras', 'CCTV 관제하기', '📹', 30, { fun: -0.05 }, 'logic', 100)]),
  station('keyCabinet', '열쇠함', 1, 1, '🔑', '#8d6e63', [
    work('manageKeys', '출입 키 관리하기', '🔑', 15, { fun: -0.05 }, 'logic', 160),
    away(work('buildingPatrol', '건물 순찰 돌기', '🔦', 45, { energy: -0.15 }, 'fitness', 110)),
  ]),
  station('patrolLog', '순찰 일지 데스크', 1, 1, '📒', '#607d8b', [work('writePatrolLog', '순찰 일지 쓰기', '📒', 15, { fun: -0.05 }, 'writing', 150)]),
  station('alarmPanel', '방범·화재 경보반', 2, 1, '🚨', '#c62828', [
    work('testAlarms', '경보 설비 점검하기', '🔧', 20, { fun: -0.05 }, 'handiness', 130),
    alarm('intrusionAlert', '침입 경보 대응하기', '🚨', 40, { energy: -0.15 }, 'fitness'),
  ]),
  // ---- 승무원 브리핑 센터 (항공 승무원) ----
  station('cabinMockup', '객실 모형', 6, 3, '💺', '#90a4ae', [
    work('cabinService', '기내 서비스 연습하기', '🍽️', 30, { social: 0.2 }, 'empathy', 90),
    work('cabinAnnounce', '기내 방송 연습하기', '🎙️', 15, { social: 0.1 }, 'language', 130),
    work('faCalmPassenger', '불안한 승객 달래기', '🫂', 20, { social: 0.2 }, 'empathy', 100),
  ]),
  station('evacSlide', '비상 탈출 슬라이드', 5, 2, '🛝', '#ffb300', [work('evacDrill', '비상 탈출 훈련하기', '🛝', 30, { energy: -0.2, fun: 0.1 }, 'leadership', 100)]),
  station('safetyDemoKit', '안전 시범 장비', 3, 2, '🦺', '#ff7043', [work('safetyDemo', '안전 시범 연습하기', '🦺', 20, { fun: -0.05 }, 'medicine', 120)]),
  // The crew bus to the aircraft (2026-11-05, the layout audit: was a gate booth on the lawn).
  station('crewGate', '크루 버스', 5, 2, '🚌', '#17325c', [
    away(work('workFlight', '비행 근무 나가기', '✈️', 90, { energy: -0.2, social: 0.2 }, 'empathy', 80)),
    away(alarm('standbyFlight', '대기 승무원 긴급 비행', '🛫', 60, { energy: -0.2 }, 'empathy')),
  ]),
  // ---- 녹음 스튜디오 (성우) ----
  station('dubbingBooth', '더빙 부스', 2, 1, '🎙️', '#37474f', [
    work('dubCharacter', '캐릭터 더빙하기', '🎭', 40, { fun: 0.3 }, 'charisma', 80),
    alarm('urgentDub', '급한 재녹음하기', '🔴', 40, { energy: -0.15 }, 'charisma'),
  ]),
  station('scriptStand', '대본 보면대', 1, 1, '📜', '#8d6e63', [work('studyScript', '대본 분석하기', '📜', 20, { fun: -0.05 }, 'empathy', 120)]),
  station('voiceMirror', '발성 연습 거울', 1, 1, '🗣️', '#b0bec5', [work('voiceWarmup', '발성 연습하기', '🗣️', 15, { fun: 0.05 }, 'charisma', 130)]),
  station('narrationDesk', '내레이션 데스크', 1, 1, '🎧', '#455a64', [work('recordNarration', '내레이션 녹음하기', '🎧', 30, { fun: 0.05 }, 'writing', 100)]),
  // ---- 방송국 아나운서실 (아나운서) ----
  station('anchorDesk', '앵커 데스크', 2, 1, '📺', '#0d47a1', [
    work('readHeadlines', '뉴스 진행하기', '📺', 35, { social: 0.2 }, 'charisma', 80),
    alarm('breakingNews', '속보 전하기', '🚨', 40, { energy: -0.15 }, 'logic'),
  ]),
  station('prompterDesk', '원고 데스크', 1, 1, '📝', '#607d8b', [work('editScript', '방송 원고 다듬기', '📝', 25, { fun: -0.05 }, 'writing', 110)]),
  station('pronunciationShelf', '표준 발음 자료함', 1, 1, '📖', '#795548', [work('drillPronunciation', '발음 연습하기', '🗣️', 15, { fun: -0.05 }, 'charisma', 140)]),
  station('onAirBooth', '라디오 온에어 부스', 2, 1, '🔴', '#c62828', [work('hostRadioShow', '라디오 진행하기', '📻', 40, { social: 0.4, fun: 0.2 }, 'empathy', 90)]),
  // ---- 기상청 예보실 (기상캐스터·예보관) ----
  station('forecastWall', '예보 상황판', 2, 1, '🗺️', '#0277bd', [
    work('analyzeChart', '일기도 분석하기', '🗺️', 30, { fun: -0.05 }, 'science', 90),
    alarm('severeWeather', '기상 특보 발표하기', '⛈️', 40, { energy: -0.15 }, 'science'),
  ]),
  station('modelTerminal', '수치 예보 단말', 1, 1, '💻', '#263238', [work('runModel', '수치 예보 돌리기', '💻', 30, { fun: -0.05 }, 'programming', 100)]),
  station('balloonLauncher', '기상 관측 장비', 1, 1, '🎈', '#eceff1', [work('launchBalloon', '고층 관측하기', '🎈', 20, { fun: 0.1 }, 'science', 130)]),
  station('weatherSet', '날씨 방송 세트', 2, 1, '🌤️', '#4fc3f7', [work('presentWeather', '날씨 전하기', '🌤️', 25, { social: 0.2 }, 'charisma', 100)]),
  // ---- 게임 회사 (게임 개발자) ----
  station('devStation', '개발용 PC', 1, 1, '⌨️', '#263238', [
    work('codeGameplay', '게임 기능 만들기', '⌨️', 45, { fun: -0.05 }, 'programming', 90),
    alarm('hotfix', '긴급 패치하기', '🔥', 45, { energy: -0.2 }, 'programming'),
  ]),
  station('playtestBooth', '플레이 테스트석', 1, 1, '🎮', '#7e57c2', [work('playtestBuild', '빌드 테스트하기', '🎮', 30, { fun: 0.4 }, 'videoGaming', 90)]),
  station('levelBoard', '레벨 설계 보드', 2, 1, '🧩', '#5c6bc0', [work('designLevel', '레벨 설계하기', '🧩', 35, { fun: 0.2 }, 'writing', 90)]),
  station('bugBoard', '버그 관리판', 1, 1, '🐞', '#e53935', [work('triageBugs', '버그 분류하기', '🐞', 20, { fun: -0.05 }, 'logic', 120)]),
  // ---- 통번역 사무소 (통번역가) ----
  station('interpretBooth', '동시통역 부스', 2, 1, '🎧', '#455a64', [
    work('practiceInterpret', '통역 연습하기', '🎧', 35, { fun: -0.05 }, 'language', 85),
    alarm('urgentInterpret', '긴급 회의 통역하기', '🌐', 45, { energy: -0.2 }, 'language'),
  ]),
  station('translationDesk', '번역 책상', 1, 1, '📄', '#8d6e63', [work('translateDoc', '문서 번역하기', '📄', 40, { fun: -0.05 }, 'writing', 90)]),
  station('glossaryShelf', '용어집 서가', 1, 1, '📚', '#6d4c41', [work('buildGlossary', '용어집 정리하기', '📚', 20, { fun: -0.05 }, 'logic', 130)]),
  // ---- 시립 도서관 (사서) ----
  station('circulationDesk', '대출 반납 데스크', 2, 1, '📚', '#a1887f', [
    work('checkoutBooks', '대출 반납 처리하기', '📚', 15, { social: 0.2 }, 'charisma', 140),
    alarm('fieldTripClass', '단체 견학 안내하기', '🏫', 45, { energy: -0.15 }, 'charisma'),
  ]),
  station('catalogStation', '목록 작업 PC', 1, 1, '🖥️', '#546e7a', [work('catalogBooks', '책 분류·목록 만들기', '🏷️', 30, { fun: -0.05 }, 'logic', 100)]),
  station('libraryStacks', '도서관 서가', 2, 1, '📖', '#6d4c41', [work('shelveBooks', '책 정리하기', '📖', 20, { energy: -0.05 }, 'logic', 150)]),
  station('storyRug', '독서 프로그램 공간', 2, 1, '🧸', '#ffcc80', [work('readingProgram', '독서 프로그램 진행하기', '🧸', 35, { social: 0.3, fun: 0.2 }, 'charisma', 100)]),
  station('scanStation', '고문서 스캐너', 1, 1, '🖨️', '#78909c', [work('digitizeArchive', '자료 디지털화하기', '🖨️', 30, { fun: -0.05 }, 'programming', 110)]),
  // ---- 여행사 (여행 가이드) ----
  station('itineraryDesk', '여행 일정 책상', 1, 1, '🗓️', '#00897b', [work('draftItinerary', '여행 일정 짜기', '🗓️', 30, { fun: 0.05 }, 'business', 100)]),
  station('travelMap', '관광 지도', 2, 1, '🗺️', '#4db6ac', [work('studySites', '관광지 해설 공부하기', '🏯', 25, { fun: 0.1 }, 'language', 110)]),
  station('tourBus', '관광버스', 2, 1, '🚌', '#26a69a', [
    work('tgBoarding', '깃발 들고 탑승 안내하기', '🚩', 22, { social: 0.2, energy: -0.05 }, 'charisma', 110),
    away(work('leadTour', '관광 안내 나가기', '🚩', 90, { energy: -0.2, social: 0.3, fun: 0.2 }, 'empathy', 80)),
    away(alarm('vipTour', '단체 관광객 긴급 안내', '🚩', 60, { energy: -0.2 }, 'charisma')),
  ]),
  // ---- 웨딩 컨설팅 (웨딩플래너) ----
  station('weddingConsult', '웨딩 상담 테이블', 2, 1, '💍', '#f8bbd0', [work('consultCouple', '예비 부부 상담하기', '💍', 30, { social: 0.3 }, 'charisma', 90)]),
  station('budgetDesk', '예산 관리 책상', 1, 1, '🧾', '#90a4ae', [work('planBudget', '결혼식 예산 짜기', '🧾', 25, { fun: -0.05 }, 'business', 100)]),
  station('decorSample', '장식 샘플 테이블', 2, 1, '💐', '#f48fb1', [work('styleCeremony', '식장 장식 구상하기', '💐', 30, { fun: 0.3 }, 'painting', 90)]),
  // The planner's go-bag for the 웨딩홀 (2026-11-05, the layout audit: was an arch on the lawn out front).
  station('ceremonyArch', '본식 출장 준비대', 2, 1, '💒', '#fafafa', [
    away(work('runCeremony', '결혼식 진행 돕기', '💒', 90, { energy: -0.2, social: 0.3 }, 'leadership', 80)),
    away(alarm('weddingDay', '본식 긴급 진행하기', '💒', 60, { energy: -0.25 }, 'charisma')),
  ]),
];
