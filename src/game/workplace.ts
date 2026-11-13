import type { PlacedObject, SkillKey, SocialDef, Tile } from './types';
import { PERF_PACE } from './careers';
import { boss, building, chat, farmTiles, gated, o, patch, task, up, upstairs, workSocial } from './workplaceKit';
import { KOREA_SOCIALS, KOREA_WORKPLACES } from './workplaceKorea';
import { installExtraWork } from './workExtra';
import { MAP_W } from './world';
import { MORE_BRANCH_LOTS } from './branchLots';
import { shopUnit } from './shopUnit';
import { installStageActions, stageTasks, type StageAt, type WorkStage } from './workStages';

/**
 * Workplaces you can follow a dweller to (참고 게임 has none for these careers in the base game; this
 * follows the Get to Work expansion's active careers and Zerbu's "Go to Work" mod: a work lot with
 * workstations, coworkers and a boss, a list of the day's tasks and a performance meter that the
 * shift's work fills). Everything here is ours unless marked.
 */

/** Something to do on a work lot, and how it counts. */
export interface WorkTask {
  id: string;
  label: string;
  /** Interactions that count, or a social with a coworker or the boss. */
  does?: string[];
  social?: 'coworker' | 'boss';
  need: number;
  count: number;
  /** Tries that went wrong (workTrouble.ts): shown, never counted towards `need`. */
  failed?: number;
  /** What the task is about (workStages.ts TASK_KIND). */
  kind?: import('./workStages').TaskKind;
  /**
   * Who it's for (2026-10-26, at the user's request; workStages.ts fitTask): from this stage, from this
   * rung (licensed work isn't for the unlicensed first rungs), only in this branch. Below it, `instead`
   * (an entry task that fits) or nothing.
   */
  minStage?: WorkStage;
  minLevel?: number;
  branch?: number;
  instead?: WorkTask;
}

export interface CoworkerSpec {
  name: string;
  shirt: string;
  skin: string;
  hair: string;
  boss?: boolean;
  /** Someone who works here off the job's ladder, by what they do (workRoles.ts `staff`): a fab's line operator isn't on the way to engineer. */
  staff?: string;
}

/**
 * People who come to the workplace to be seen to (Get to Work's patients and suspects, the salon's
 * and studio's customers in the mods): each comes for one of `socials`, waits at one of `spots`
 * and goes once the worker has seen to them, or gives up after `patience` minutes (ours).
 */
export interface ClientSpec {
  noun: string;
  socials: string[];
  spots: Array<[number, number]>;
  max: number;
  /** Minutes between arrivals, roughly. */
  every: number;
  patience: number;
  age?: 'child' | 'teen';
  /** The animal they bring along (the vet's clients), shown with their name. */
  pets?: string[];
  /**
   * Where they come in, when it isn't the street (2026-11-06): an airport's arriving travellers come down into the baggage claim from
   * passport control, not in off the road. They leave by the street as everyone does.
   */
  enterAt?: [number, number];
}

/** A call-out (fire, emergency call, flight): announced now and then, answered at an object, missed if left too long (ours). */
export interface AlarmSpec {
  notice: string;
  /** What's said when it's answered, and when it's left too long. */
  done: string;
  missed: string;
  interaction: string;
  /** Minutes between calls (min, max). */
  every: [number, number];
  /** Minutes the call waits to be answered. */
  window: number;
  /** Not called for a worker below this stage or rung (a trainee pilot isn't sent on the route; 2026-10-26). */
  minStage?: WorkStage;
  minLevel?: number;
}

export interface WorkplaceDef {
  careerId: string;
  name: string;
  icon: string;
  tiles: () => Tile[];
  objects: Array<Omit<PlacedObject, 'uid'>>;
  coworkers: CoworkerSpec[];
  /** The day's tasks: always these, plus one of `extra` (Get to Work daily tasks). */
  tasks: WorkTask[];
  extra: WorkTask[];
  /**
   * A branch's own tasks and extras in place of `tasks` and `extra`, where its work is another job's
   * (the judge's, the bartender's, the investor's; 2026-10-26, at the user's request). By branch index.
   */
  branchTasks?: Array<WorkTask[] | undefined>;
  branchExtra?: Array<WorkTask[] | undefined>;
  /** Interactions that are the job (each finished one counts towards performance). */
  work: string[];
  skill: SkillKey;
  /** Floors by floor tile, and the walls (decor.ts style ids). */
  floors: Partial<Record<Tile, string>>;
  wall: string;
  clients?: ClientSpec[];
  alarm?: AlarmSpec;
  /** A clean zone, entered only through an air shower and worn a suit in (cleanroom.ts). */
  cleanroom?: CleanroomSpec;
  /**
   * Pieces whose rooms have no windows (2026-11-04, the layout audit): studios, booths, scan rooms, cleanrooms and control rooms are
   * closed rooms, for sound, light, shielding or cleanliness. By piece, so it follows the room wherever the piece is.
   */
  windowless?: string[];
  /**
   * Restrooms built into the plan, by their inside (x0, y0, x1, y1), each walled with its door and a toilet and a sink in it (2026-11-04, the
   * layout audit): a ward's rooms have their own. The first is the staff's. A lot that names them gets no restroom fitted.
   */
  restrooms?: Array<[number, number, number, number]>;
  /** Ground laid outdoors over the grass, by rectangle (x0, y0, x1, y1) and its decor.ts GROUND_STYLES id: a yard, a quay, an apron. Later ones over earlier. */
  ground?: Array<[number, number, number, number, string]>;
  /**
   * A branch that works somewhere else, its own lot by branch index (2026-11-04, at the user's choice: a subway 관제사 works at the
   * 종합관제센터, not the 승무사업소). Same career; its own building, people, tasks and call-out.
   */
  branchLots?: Partial<Record<number, WorkplaceDef>>;
}

export interface CleanroomSpec {
  /** A tile of each room of the zone (walled and doored off from all else); the shower's among them. */
  zone: Array<[number, number]>;
  /** The tile everyone going in or out must cross, where the jets are. */
  shower: { x: number; y: number };
  /** Where the suit goes on and comes off: the tile before the shower's outer door. */
  robe: { x: number; y: number };
}

/** Work points: a finished piece of work, a task done, the whole list done, a word with the boss or a colleague. */
export const POINTS = { work: 4, task: 6, allTasks: 15, boss: 3, coworker: 1, great: 2, alarm: 10, missedAlarm: -4, clientLeft: -2 };
/** Work done in the career's ideal emotion counts half as much again (참고 게임 ideal mood). */
export const IDEAL_MOOD_BONUS = 1.5;
/** Turning a shift's points into job performance: half the level's base for showing up, plus the points. */
export function shiftDelta(points: number, basePerf: number, negativeMinutes: number): number {
  return Math.round((basePerf * 0.5 + points) * PERF_PACE - negativeMinutes * 0.05);
}


export const WORK_SOCIALS: SocialDef[] = [
  workSocial('examinePatient', '진찰하기', '🩺', ['doctor'], 'logic', 25),
  workSocial('diagnosePatient', '진단 내리기', '📋', ['doctor'], 'logic', 20),
  workSocial('giveShot', '주사 놓기', '💉', ['nurse'], 'logic', 10),
  workSocial('checkVitals', '활력 징후 재기', '🌡️', ['nurse'], 'logic', 15),
  workSocial('comfortPatient', '환자 안심시키기', '🤗', ['nurse'], 'charisma', 15),
  workSocial('takeStatement', '진술 받기', '📝', ['police'], 'logic', 20),
  workSocial('interrogate', '용의자 심문하기', '🕵️', ['police'], 'charisma', 30),
  workSocial('answerQuestion', '질문 받아 주기', '✋', ['teacher', 'academyTutor'], 'charisma', 15),
  workSocial('praiseStudent', '학생 칭찬하기', '🌟', ['teacher', 'academyTutor', 'musicTeacher'], 'charisma', 10),
  workSocial('tutorStudent', '보충 지도하기', '📖', ['teacher'], 'logic', 25),
  workSocial('consultClient', '의뢰인 상담하기', '💼', ['lawyer'], 'charisma', 25),
  workSocial('prepTestimony', '증언 준비시키기', '🗣️', ['lawyer'], 'logic', 20),
  workSocial('presentDesign', '설계안 발표하기', '📊', ['architect'], 'charisma', 25),
  workSocial('hearRequests', '요구 사항 듣기', '👂', ['architect'], 'logic', 15),
  workSocial('examinePet', '반려동물 진찰하기', '🐾', ['vet'], 'logic', 20),
  workSocial('vaccinatePet', '예방 접종하기', '💉', ['vet'], 'logic', 10),
  workSocial('adviseOwner', '보호자 상담하기', '💬', ['vet'], 'charisma', 15),
  workSocial('takeMeasurements', '치수 재기', '📏', ['fashionDesigner'], 'handiness', 15),
  workSocial('fitClient', '가봉하기', '🪡', ['fashionDesigner'], 'painting', 25),
  workSocial('styleConsult', '스타일 상담하기', '💬', ['fashionDesigner', 'styleInfluencer'], 'charisma', 15),
  workSocial('portraitShoot', '인물 사진 찍어 주기', '📸', ['photographer'], 'photography', 30),
  workSocial('directPose', '포즈 지도하기', '🧍', ['photographer'], 'charisma', 15),
  workSocial('cutHair', '머리 자르기', '✂️', ['hairStylist'], 'painting', 30),
  workSocial('dyeHair', '염색하기', '🎨', ['hairStylist'], 'painting', 40),
  workSocial('styleHair', '드라이·스타일링', '💨', ['hairStylist'], 'charisma', 20),
  workSocial('signAutograph', '사인해 주기', '✍️', ['actor', 'singer', 'webtoonArtist', 'athletic', 'entertainer', 'writer', 'proGamer'], 'charisma', 10),
  workSocial('fanSelfie', '팬과 사진 찍기', '🤳', ['actor', 'singer', 'webtoonArtist', 'athletic', 'proGamer'], 'charisma', 10),
  workSocial('hearComplaint', '민원 듣기', '👂', ['politician'], 'charisma', 15),
  workSocial('persuadeVoter', '지지 호소하기', '🗳️', ['politician'], 'charisma', 20),
  workSocial('interviewChef', '셰프 인터뷰하기', '🎤', ['critic'], 'writing', 25),
  workSocial('interviewArtist', '작가 인터뷰하기', '🎨', ['critic'], 'writing', 25),
  workSocial('pitchCampaign', '광고 제안하기', '💼', ['socialMedia'], 'charisma', 25),
  workSocial('negotiateDeal', '협찬 조건 협상하기', '🤝', ['socialMedia'], 'charisma', 20),
  workSocial('giveTour', '정원 안내하기', '🌳', ['gardener'], 'charisma', 20),
  workSocial('recommendFlowers', '꽃 추천하기', '💐', ['gardener'], 'gardening', 15),
  workSocial('reviewSpecs', '설계 사양 협의하기', '📐', ['engineer'], 'logic', 20),
  workSocial('ecoEducation', '환경 교육하기', '🌍', ['conservationist'], 'charisma', 20),
  workSocial('answerNature', '자연 질문 답해 주기', '🐢', ['conservationist'], 'gardening', 15),
  workSocial('designConsult', '디자인 상담하기', '🏠', ['interiorDecorator'], 'charisma', 25),
  workSocial('presentMoodBoard', '시안 보여 주기', '🖼️', ['interiorDecorator'], 'painting', 20),
  workSocial('businessMeeting', '거래처 미팅하기', '🤝', ['salaryperson'], 'charisma', 25),
  workSocial('closeDeal', '계약 성사시키기', '✍️', ['salaryperson'], 'charisma', 30),
  workSocial('consoleFamily', '유족 위로하기', '🕯️', ['mortician'], 'charisma', 25),
  workSocial('guideFamily', '장례 절차 안내하기', '📋', ['mortician'], 'logic', 20),
  workSocial('hypeCrowd', '분위기 띄우기', '🙌', ['dj'], 'charisma', 15),
  workSocial('takeRequest', '신청곡 받기', '🎶', ['dj'], 'djMixing', 15),
  workSocial('teachDanceClass', '댄스 레슨 해 주기', '💃', ['dancer'], 'dancing', 25),
  workSocial('correctPosture', '자세 교정해 주기', '🧘', ['dancer'], 'dancing', 15),
  workSocial('cultureExchange', '문화 교류하기', '🎎', ['diplomat'], 'charisma', 20),
  workSocial('negotiateTreaty', '조약 문안 협의하기', '📜', ['diplomat'], 'logic', 25),
  workSocial('collabStream', '합방하기', '🎮', ['streamer'], 'comedy', 25),
  workSocial('shoutout', '응원 멘트 해 주기', '📣', ['streamer'], 'charisma', 10),
  workSocial('coachBeginner', '초보자 지도하기', '🧗', ['extremeAthlete'], 'fitness', 20),
  workSocial('safetyBrief', '안전 교육하기', '⛑️', ['extremeAthlete'], 'logic', 15),
  workSocial('talkTherapy', '심리 상담하기', '🛋️', ['therapist'], 'charisma', 30),
  workSocial('cbtSession', '인지 행동 치료하기', '🧠', ['therapist'], 'logic', 30),
  workSocial('auditionActor', '오디션 보기', '🎭', ['filmmaker'], 'charisma', 20),
  workSocial('directActor', '연기 지도하기', '🎬', ['filmmaker'], 'writing', 25),
  workSocial('castingMeeting', '캐스팅 미팅하기', '📋', ['model'], 'charisma', 25),
  workSocial('brandPitch', '브랜드 담당자 만나기', '💼', ['model'], 'charisma', 20),
  workSocial('demoToy', '장난감 시연하기', '🪀', ['toymaker'], 'charisma', 15),
  workSocial('takeToyOrder', '맞춤 주문 받기', '📝', ['toymaker'], 'handiness', 15),
  workSocial('recommendBread', '빵 추천하기', '🥖', ['baker'], 'cooking', 15),
  workSocial('takeCakeOrder', '케이크 주문 받기', '🎂', ['baker'], 'charisma', 20),
  workSocial('dentalCheckup', '치아 검진하기', '🦷', ['dentist'], 'logic', 20),
  workSocial('scaling', '스케일링하기', '🪥', ['dentist'], 'handiness', 25),
  workSocial('braceAdjust', '교정기 조정하기', '😁', ['dentist'], 'handiness', 20),
  workSocial('medConsult', '복약 지도하기', '💊', ['pharmacist'], 'charisma', 15),
  workSocial('recommendOTC', '일반약 추천하기', '🩹', ['pharmacist'], 'logic', 15),
  workSocial('openAccount', '계좌 개설 상담', '🏦', ['banker'], 'charisma', 15),
  workSocial('loanConsult', '대출 상담하기', '💰', ['banker'], 'logic', 20),
  workSocial('taxAdvice', '절세 상담하기', '🧾', ['accountant'], 'logic', 20),
  workSocial('auditInterview', '감사 인터뷰하기', '🔍', ['accountant'], 'charisma', 25),
  workSocial('showListings', '매물 소개하기', '🏠', ['realEstate'], 'charisma', 20),
  workSocial('negotiatePrice', '가격 협상하기', '🤝', ['realEstate'], 'charisma', 25),
  workSocial('explainRepair', '수리 내역 설명하기', '🔧', ['mechanic'], 'charisma', 15),
  workSocial('estimateQuote', '견적 내기', '📋', ['mechanic'], 'handiness', 20),
  workSocial('sellProduce', '농산물 팔기', '🥕', ['farmer'], 'charisma', 15),
  workSocial('farmTour', '농장 체험 안내', '🌾', ['farmer'], 'gardening', 20),
  workSocial('presentDraft', '시안 발표하기', '🖼️', ['graphicDesigner'], 'charisma', 20),
  workSocial('gatherFeedback', '피드백 듣기', '👂', ['graphicDesigner'], 'painting', 15),
  workSocial('welcomeGuest', '손님 맞이하기', '🛎️', ['hotelier'], 'charisma', 15),
  workSocial('resolveComplaint', '불만 해결하기', '🙇', ['hotelier'], 'charisma', 25),
  workSocial('tattooConsult', '도안 상담하기', '✏️', ['tattooArtist'], 'painting', 20),
  workSocial('tattooWork', '타투 시술하기', '🖋️', ['tattooArtist'], 'painting', 40),
  workSocial('interviewGuest', '게스트 인터뷰', '🎤', ['tvHost'], 'charisma', 25),
  workSocial('warmUpAudience', '방청객 분위기 띄우기', '👏', ['tvHost'], 'comedy', 15),
  workSocial('explainSpace', '우주 이야기 들려주기', '🪐', ['astronaut'], 'logic', 20),
  workSocial('astronautPhoto', '기념사진 찍어 주기', '📸', ['astronaut'], 'charisma', 10),
  workSocial('pitchProduct', '제품 소개하기', '📦', ['sales'], 'charisma', 20),
  workSocial('negotiateDeal', '단가 협상하기', '🤝', ['sales'], 'charisma', 25),
  workSocial('crowdWork', '관객과 즉석 토크', '😂', ['entertainer'], 'comedy', 15),
  workSocial('debriefSource', '협력관 면담하기', '🕵️', ['secretAgent'], 'charisma', 25),
  workSocial('shareIntel', '정보 공유 회의', '🗂️', ['secretAgent'], 'logic', 20),
  workSocial('interviewSource', '취재원 인터뷰', '🎙️', ['writer'], 'writing', 25),
  workSocial('recommendOutfit', '코디 추천하기', '👗', ['styleInfluencer'], 'writing', 20),
  workSocial('serveCoffee', '커피 내주기', '☕', ['barista'], 'mixology', 10),
  workSocial('recommendDrink', '음료 추천하기', '🧋', ['barista'], 'charisma', 10),
  workSocial('serveMeal', '음식 내주기', '🍔', ['fastFood'], 'charisma', 10),
  workSocial('apologizeOrder', '주문 실수 사과하기', '🙏', ['fastFood'], 'charisma', 15),
  workSocial('helpFindSize', '사이즈 찾아 주기', '📏', ['retail'], 'charisma', 15),
  workSocial('suggestStyle', '어울리는 옷 추천하기', '👚', ['retail'], 'charisma', 15),
  workSocial('playWithChild', '같이 놀아 주기', '🧸', ['babysitter', 'childcareTeacher', 'kindergartenTeacher'], 'charisma', 20),
  workSocial('helpWashHands', '손 씻기 도와주기', '🧼', ['babysitter', 'childcareTeacher', 'kindergartenTeacher'], 'charisma', 10),
  workSocial('showGardenPlan', '정원 계획 보여 주기', '🗺️', ['manualLabor'], 'gardening', 15),
  workSocial('hearRequest', '요청 사항 듣기', '👂', ['manualLabor'], 'charisma', 10),
  ...KOREA_SOCIALS,
];


/**
 * The doctor's hospital on two floors (2026-11-04, the layout audit, replacing the one-floor plan where the theatre shared a room with
 * the ward beds and medicine had no procedures). A resident's day goes conference, rounds, outpatients, procedures, theatre; the
 * endoscopy room is internal medicine's. Downstairs, outpatients: the 외과 and 내과 consulting rooms (the ultrasound at the
 * internist's couch), the endoscopy room (its table and tower, the scope washer, a bed to come round on), the staff restroom, and
 * the waiting hall with the front desk, the number board, the rows of seats and the stairs. Upstairs, past the 수술부 door, the
 * changing room, the theatre and, in the corridor before it, the scrub sinks; the recovery room and the sterile store; on the
 * ward side a four-bed room for rounds, the on-call room and the conference room where the morning's images are read.
 */
const doctorTiles = () => [
  ...building(
    [[2, 2, 6, 7, 'tile'], [8, 2, 12, 7, 'tile'], [14, 2, 20, 7, 'tile'], [22, 5, 23, 7, 'tile'], [2, 9, 23, 13, 'carpet']],
    [[4, 8], [10, 8], [15, 8], [22, 8], [12, 14]],
  ),
  ...patch(
    upstairs(
      [
        [2, 2, 4, 6, 'tile'], [6, 2, 13, 6, 'tile'], [15, 2, 23, 6, 'wood'], [2, 8, 23, 9, 'tile'],
        [2, 11, 7, 13, 'tile'], [9, 11, 13, 13, 'tile'], [15, 11, 17, 13, 'carpet'], [19, 11, 23, 13, 'carpet'],
      ],
      [[3, 7], [9, 7], [19, 7], [5, 10], [11, 10], [16, 10], [23, 10]],
    ),
    // The 수술부 door across the corridor.
    [[14, 8, 'door'], [14, 9, 'wall']],
  ),
];
const doctorObjects = [
  // 외과 and 내과 consulting rooms: the computer, the light box, the couch; dressings in one, the ultrasound in the other; the patient's seat.
  o('medStation', 2, 2), o('xrayViewer', 3, 2), o('drTreatCart', 6, 2), o('hospitalBed', 6, 4), o('drWaitSeat', 2, 5, 'right'),
  o('medStation', 8, 2), o('xrayViewer', 9, 2), o('hospitalBed', 12, 4), o('drUltrasound', 11, 4, 'left'), o('drWaitSeat', 8, 5, 'right'),
  // The endoscopy room: the tower at the table's head, the washer, the recovery bed and its monitor.
  o('drEndoTower', 15, 3), o('drScopeTable', 16, 4), o('drScopeWasher', 18, 2), o('hospitalBed', 20, 4), o('drBedsideMonitor', 20, 3, 'left'), o('drTreatCart', 14, 6),
  o('toilet', 23, 5, 'left'), o('sink', 23, 7, 'left'),
  // The waiting hall: the stairs, the front desk, the number board, two rows of seats.
  o('stairs', 18, 9, 'left'), o('drReception', 5, 10), o('drQueueBoard', 12, 9),
  o('drWaitSeat', 14, 11, 'up'), o('drWaitSeat', 15, 11, 'up'), o('drWaitSeat', 16, 11, 'up'), o('drWaitSeat', 17, 11, 'up'),
  o('drWaitSeat', 14, 13, 'up'), o('drWaitSeat', 15, 13, 'up'), o('drWaitSeat', 16, 13, 'up'), o('drWaitSeat', 17, 13, 'up'),
  o('drWaitSeat', 19, 13, 'up'), o('drWaitSeat', 20, 13, 'up'), o('drWaitSeat', 21, 13, 'up'), o('plant', 2, 13), o('plant', 23, 13),
  // Upstairs. The changing room's lockers; the theatre (the table, the anaesthesia machine at its head, the instruments, the cabinet); the scrub sinks before its door.
  up('gjLockers', 2, 2), up('gjLockers', 4, 4, 'left'),
  up('surgeryTable', 9, 4), up('drAnesthesiaCart', 11, 4), up('drTreatCart', 8, 3), up('medCabinet', 6, 2),
  up('drScrubSink', 7, 8),
  // Recovery, two monitored beds; the sterile store.
  up('hospitalBed', 2, 12, 'up'), up('drBedsideMonitor', 3, 13, 'up'), up('hospitalBed', 6, 12, 'up'), up('drBedsideMonitor', 7, 13, 'up'),
  up('medCabinet', 9, 13, 'up'), up('medCabinet', 10, 13, 'up'), up('drTreatCart', 13, 13),
  // The four-bed room for rounds.
  up('nsHandSink', 15, 2), up('hospitalBed', 16, 2), up('drBedsideMonitor', 17, 2), up('hospitalBed', 18, 2), up('nsIvPole', 19, 2), up('hospitalBed', 20, 2), up('drBedsideMonitor', 21, 2), up('hospitalBed', 22, 2),
  // The on-call room, where the residents also eat; the conference room, its seats in a row facing the images on the wall.
  up('studyDesk', 15, 11), up('bed', 17, 12, 'up'), up('fridge', 15, 13, 'up'), up('coffeeMaker', 16, 13, 'up'),
  up('xrayViewer', 20, 11), up('salMeetingChair', 19, 13, 'up'), up('salMeetingChair', 20, 13, 'up'), up('salMeetingChair', 21, 13, 'up'), up('salMeetingChair', 22, 13, 'up'), up('salMeetingChair', 23, 13, 'up'),
];
const DOCTOR_SPOTS: Array<[number, number]> = [[5, 4], [11, 5], [15, 12], [17, 12], [20, 12], [21, 12]];

/**
 * A slice of a ward (2026-11-04, the layout audit, replacing the outpatient lobby the nurse shared with the doctor): a ward is
 * reached from the lift, not off the street through a waiting room, and is its rooms along a corridor with the nurses' station
 * on it. A real one has 40–50 beds round a station core; this is one side of it. Along the back the rooms: two four-bed rooms
 * (two beds a side facing across the aisle, the room's own restroom by the door, the two back to back), a two-bed room and a
 * single room, their windows outside. Across the corridor the station, open to it, its counter's high side to the corridor and
 * the medicines prepared behind it (cabinet, cart, basin, linen); the staff restroom in its corner; the lift hall, closed off
 * from the ward by its door; the treatment room; the staff room. Korean rules: at most four beds a room, a restroom in each.
 */
const nurseTiles = () =>
  patch(
    building(
      [
        [2, 2, 7, 6, 'wood'], [9, 2, 14, 6, 'wood'], [16, 2, 19, 6, 'wood'], [21, 2, 23, 6, 'wood'],
        [2, 8, 23, 9, 'tile'], [2, 10, 10, 13, 'tile'], [12, 11, 14, 13, 'tile'], [16, 11, 18, 13, 'tile'], [20, 11, 23, 13, 'carpet'],
      ],
      [[3, 7], [13, 7], [17, 7], [22, 7], [13, 10], [16, 10], [21, 10], [12, 14]],
    ),
    [
      // The four-bed rooms' restrooms, back to back across their party wall.
      [6, 4, 'wall'], [7, 4, 'door'], [5, 5, 'wall'], [5, 6, 'wall'],
      [9, 4, 'door'], [10, 4, 'wall'], [11, 5, 'wall'], [11, 6, 'wall'],
      // The staff restroom in the station's corner.
      [2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door'],
    ],
  );
const nurseObjects = [
  // Four-bed room: two beds on each side of the aisle, the drip stand between the back two, the basin by the restroom.
  o('hospitalBed', 2, 2), o('hospitalBed', 4, 2), o('hospitalBed', 2, 5, 'up'), o('hospitalBed', 4, 5, 'up'), o('nsIvPole', 3, 2), o('nsHandSink', 7, 2),
  o('toilet', 6, 6, 'up'), o('sink', 7, 6, 'up'),
  o('hospitalBed', 14, 2), o('hospitalBed', 12, 2), o('hospitalBed', 14, 5, 'up'), o('hospitalBed', 12, 5, 'up'), o('nsIvPole', 13, 2), o('nsHandSink', 9, 2),
  o('toilet', 10, 6, 'up'), o('sink', 9, 6, 'up'),
  // Two-bed room; the single room, its patient on a monitor.
  o('hospitalBed', 16, 2), o('hospitalBed', 18, 2), o('nsIvPole', 17, 2), o('nsHandSink', 19, 2),
  o('nsIvPole', 21, 2), o('hospitalBed', 22, 2), o('drBedsideMonitor', 23, 2),
  // The station: the counter on the corridor, behind it the charting computer, the medicine cabinet, the cart, the basin and the linen.
  o('nsNurseStation', 5, 10), o('medStation', 6, 13, 'up'), o('medCabinet', 7, 13, 'up'), o('nsMedCabinetCart', 8, 13, 'up'), o('nsHandSink', 9, 13, 'up'), o('nsLinenRack', 10, 13, 'up'),
  o('toilet', 2, 12, 'right'), o('sink', 2, 13, 'right'),
  // The lift hall: the lifts, a wheelchair waiting.
  o('nsElevator', 14, 11, 'left'), o('nsWheelchair', 12, 11, 'right'),
  // Treatment room: a bed, its drip stand, the basin.
  o('hospitalBed', 18, 11), o('nsIvPole', 17, 11), o('nsHandSink', 16, 13, 'right'),
  // Staff room.
  o('coffeeMaker', 23, 11, 'left'), o('fridge', 23, 12, 'left'), o('sofa', 20, 13, 'up'),
];


export const WORKPLACES: Record<string, WorkplaceDef> = {
  tech: {
    careerId: 'tech',
    name: '기술 회사',
    icon: '💻',
    // 네오바이트's floor of an office tower in 판교 (2026-11-05, the layout audit, replacing a lone building on a lawn whose street
    // door opened straight among the developers' desks, with the server racks standing in the open office, its middle empty, one
    // meeting room and the restroom inside the lounge). In from the street is the floor's lift hall; through the company's glass
    // door (the card reader), the reception: the desk under the logo wall where a visitor gets a pass, a sofa to wait on, the
    // floor's restroom off it. From there into the open office: the teams' islands of desks pushed together, the desks along the
    // back wall with two raised to stand at, the scrum board on the wall, the phone booths, the hackathon table; the server and
    // network room shut off in its corner behind its own door (most of the servers are in the cloud: two racks for the office and
    // the test kit). Off the office the big meeting room with its screen and whiteboard, a small one for four beside it, and the
    // lounge and pantry (the coffee, the water, the fridge, the beanbags).
    tiles: () =>
      patch(
        building(
          [[2, 2, 16, 9, 'carpet'], [18, 2, 23, 5, 'wood'], [18, 7, 23, 9, 'wood'], [2, 11, 7, 13, 'tile'], [9, 11, 13, 13, 'tile'], [15, 11, 23, 13, 'wood']],
          [[17, 3], [17, 8], [5, 10], [14, 12], [16, 10], [12, 14]],
        ),
        [
          // The server room in the office's corner.
          [4, 2, 'wall'], [4, 3, 'door'], [2, 4, 'wall'], [3, 4, 'wall'], [4, 4, 'wall'], [2, 2, 'tile'], [3, 2, 'tile'], [2, 3, 'tile'], [3, 3, 'tile'],
          // The floor's restroom off the reception.
          [21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 13, 'wall'], [21, 12, 'door'], [22, 12, 'tile'], [23, 12, 'tile'], [22, 13, 'tile'], [23, 13, 'tile'],
        ],
      ),
    restrooms: [[22, 12, 23, 13]],
    windowless: ['techServerRack'],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the building's sign out on the pavement.
      o('bldLift', 11, 11), o('plant', 9, 13), o('techTowerSign', 10, 15),
      // The reception: the logo wall, the desk, the sofa; the restroom.
      o('techLogoWall', 19, 11), o('techReception', 17, 12, 'right'), o('sofa', 19, 13, 'up'), o('plant', 15, 11), o('plant', 15, 13),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // The server room.
      o('techServerRack', 2, 2),
      // The open office: the back wall's desks and the standing desks; three islands; the scrum board, the booths, the hackathon table.
      o('workstation', 6, 2), o('workstation', 7, 2), o('workstation', 8, 2), o('workstation', 9, 2), o('techStandingDesk', 11, 2), o('techStandingDesk', 12, 2), o('plant', 16, 2),
      o('workstation', 6, 5, 'up'), o('workstation', 7, 5, 'up'), o('workstation', 8, 5, 'up'), o('workstation', 6, 6), o('workstation', 7, 6), o('workstation', 8, 6),
      o('workstation', 11, 5, 'up'), o('workstation', 12, 5, 'up'), o('workstation', 13, 5, 'up'), o('workstation', 11, 6), o('workstation', 12, 6), o('workstation', 13, 6),
      o('workstation', 10, 9, 'up'), o('workstation', 11, 9, 'up'), o('workstation', 12, 9, 'up'), o('workstation', 13, 9, 'up'),
      o('techScrumBoard', 2, 6, 'right'), o('techPhoneBooth', 16, 5, 'left'), o('techPhoneBooth', 16, 6, 'left'), o('techHackathonTable', 6, 9, 'up'), o('plant', 2, 9), o('plant', 15, 9),
      // The big meeting room: the table, the whiteboard, the screen.
      o('salMeetingTable', 19, 4), o('salMeetingChair', 19, 3), o('salMeetingChair', 20, 3), o('salMeetingChair', 21, 3),
      o('salMeetingChair', 19, 5, 'up'), o('salMeetingChair', 20, 5, 'up'), o('whiteboard', 23, 2, 'left'), o('projector', 23, 5, 'left'),
      // The small meeting room for four.
      o('salMeetingTable', 19, 9), o('salMeetingChair', 19, 8), o('salMeetingChair', 20, 8), o('salMeetingChair', 21, 8), o('salMeetingChair', 22, 9, 'left'), o('projector', 23, 7, 'left'),
      // The lounge and pantry.
      o('coffeeMaker', 2, 11), o('salWaterCooler', 3, 11), o('fridge', 6, 11), o('techBeanbagLounge', 2, 13, 'up'), o('sofa', 5, 13, 'up'),
    ],
    coworkers: [
      { name: '김지훈 팀장', shirt: '#37474f', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '박서윤', shirt: '#7e57c2', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '이도현', shirt: '#26a69a', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    tasks: [
      { id: 'code', label: '코드 작성하기', does: ['writeCode', 'techStandCode'], need: 2, count: 0 },
      { id: 'meeting', label: '회의 참석하기', does: ['attendMeeting', 'salTableMeeting', 'techDailyScrum', 'techVideoCall'], need: 1, count: 0 },
      chat(2),
    ],
    extra: [
      { id: 'bugs', label: '버그 수정하기', does: ['fixBugs'], need: 1, count: 0 },
      boss('팀장에게 진행 상황 보고하기'),
      { id: 'mail', label: '업무 메일 확인하기', does: ['checkMail'], need: 2, count: 0 },
      task('server', '서버 상태 점검하기', ['techCheckServer', 'techSwapDisk']),
      task('kanban', '칸반 보드 정리하기', ['techMoveTicket']),
      task('hackathon', '해커톤 프로토타입 만들기', ['techHackathon']),
    ],
    work: ['writeCode', 'fixBugs', 'checkMail', 'attendMeeting', 'salTableMeeting', 'techStandCode', 'techCheckServer', 'techSwapDisk', 'techDailyScrum', 'techMoveTicket', 'techVideoCall', 'techHackathon'],
    skill: 'programming',
    floors: { carpet: 'slateStone', wood: 'walnutWood', tile: 'aquaTile' },
    wall: 'navyWainscot',
  },
  culinary: {
    careerId: 'culinary',
    name: '레스토랑 주방',
    icon: '🍳',
    // A restaurant as it is (2026-11-04, the layout audit, replacing a street door that opened into the kitchen, a kitchen of half the
    // building and a dining room of eight seats). The dining room is at the front, the street door into it: the host's stand, the
    // tables, the bar the bartenders work, the guests' restroom away from the kitchen. The kitchen is behind (a quarter of the floor is
    // the rule of thumb), worked one way: in at the back door from the alley to the cold and dry store, the hand basin, the range and
    // the stock pot under the hood, the prep tables, the pass where the head chef calls the orders out to the floor; the dirty plates
    // come back by the other side of the servers' door to the dish pit. The staff's changing and rest room off the kitchen.
    tiles: () =>
      patch(
        building(
          [[2, 4, 5, 7, 'tile'], [7, 4, 17, 7, 'tile'], [19, 4, 23, 7, 'wood'], [2, 9, 23, 13, 'wood']],
          [[6, 5], [18, 5], [15, 8], [12, 14]],
        ),
        [
          ...Array.from({ length: 26 * 3 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']),
          ...Array.from({ length: 24 }, (_, i): [number, number, 'wall'] => [1 + i, 3, 'wall']),
          [3, 3, 'door' as 'wall'],
          [21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 13, 'wall'], [21, 12, 'door' as 'wall'],
        ],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 0, 25, 2, 'asphalt']],
    objects: [
      // The store: the dry shelves, the fridges.
      o('culinaryDryRack', 2, 4), o('fridge', 4, 4), o('fridge', 5, 4),
      // The kitchen: the hand basin, the stock pot and the range under the hood; the prep tables; the pass; the dish pit by the servers' door.
      o('kitchenSink', 7, 4), o('culinaryStockRange', 8, 4), o('lineStove', 9, 4), o('lineStove', 10, 4), o('lineStove', 11, 4), o('fridge', 13, 4),
      o('prepCounter', 8, 6, 'up'), o('prepCounter', 10, 6, 'up'), o('servingPass', 13, 7, 'left'), o('culinaryDishPit', 16, 7, 'up'),
      // The staff room.
      o('coffeeMaker', 19, 4), o('gjLockers', 21, 4), o('sofa', 19, 7, 'up'),
      // The dining room: the host's stand by the door, the tables, the bar.
      o('culinaryHostStand', 14, 13, 'up'),
      o('diningTable', 2, 10), o('diningChair', 2, 11, 'up'), o('diningChair', 3, 11, 'up'),
      o('diningTable', 5, 10), o('diningChair', 5, 9), o('diningChair', 6, 9), o('diningChair', 5, 11, 'up'), o('diningChair', 6, 11, 'up'),
      o('diningTable', 8, 10), o('diningChair', 8, 9), o('diningChair', 9, 9), o('diningChair', 8, 11, 'up'), o('diningChair', 9, 11, 'up'),
      o('diningTable', 11, 10), o('diningChair', 11, 9), o('diningChair', 12, 9), o('diningChair', 11, 11, 'up'), o('diningChair', 12, 11, 'up'),
      o('diningTable', 16, 10), o('diningChair', 16, 9), o('diningChair', 17, 9), o('diningChair', 16, 11, 'up'), o('diningChair', 17, 11, 'up'),
      o('bar', 20, 9), o('plant', 2, 13), o('lamp', 23, 9),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
    ],
    coworkers: [
      { name: '최수아 셰프', shirt: '#fafafa', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '정하준', shirt: '#ef5350', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '윤예린', shirt: '#ffb74d', skin: '#c99a6e', hair: '#a0522d' },
    ],
    tasks: [
      { id: 'orders', label: '주문 요리 만들기', does: ['cookOrder'], need: 3, count: 0 },
      { id: 'prep', label: '재료 손질하기', does: ['prepIngredients', 'culinaryMakeStock'], need: 2, count: 0 },
      chat(1),
    ],
    extra: [
      { id: 'plate', label: '요리 플레이팅하기', does: ['plateDish'], need: 2, count: 0 },
      boss('셰프에게 맛 평가받기'),
      { id: 'tasting', label: '맛 보기', does: ['tasteDish'], need: 2, count: 0 },
      task('dishes', '설거지하기', ['culinaryWashDishes'], 2),
    ],
    // The bartender branch mixes at the bar instead of cooking to order (2026-10-26, at the user's request).
    branchTasks: [undefined, [task('cocktails', '칵테일 만들기', ['mixCocktail'], 3), task('prep', '가니시 재료 손질하기', ['prepIngredients']), chat(1)]],
    branchExtra: [undefined, [boss('셰프에게 신메뉴 음료 평가받기'), { id: 'tasting', label: '맛 보기', does: ['tasteDish'], need: 2, count: 0 }]],
    work: ['cookOrder', 'prepIngredients', 'plateDish', 'tasteDish', 'mixCocktail', 'culinaryMakeStock', 'culinaryWashDishes', 'culinaryCheckStock'],
    skill: 'cooking',
    floors: { tile: 'monoTile', wood: 'oakWood' },
    wall: 'redBrick',
  },
  painter: {
    careerId: 'painter',
    name: '화실',
    icon: '🎨',
    // A painter's studio with its own small gallery on the street (2026-11-05, the layout audit, replacing a studio whose gallery was
    // reached only through the studio, three paintings in an empty room, and no store or drying rack). As a real 화실 in a converted
    // shop: the big studio behind the street door, under its windows, the easels in an arc round the still life, the crit wall, the
    // art books and the brush sink on the back wall, the drawing tables and the framing bench down the front. The gallery is in the
    // front corner with its own door on the street, so visitors never cross the studio: the hung walls with their captions, a
    // sculpture on its plinth, a bench; the studio opens onto it from the side. Behind it the store, the paint and canvas on shelves
    // and the rack the wet canvases dry in; the kitchenette and the restroom beyond. The A-board on the pavement points to the gallery.
    tiles: () => building([[2, 2, 14, 13, 'wood'], [16, 2, 19, 7, 'tile'], [21, 2, 23, 4, 'carpet'], [22, 6, 23, 7, 'tile'], [16, 9, 23, 13, 'carpet']], [[15, 4], [20, 3], [23, 5], [15, 11], [19, 14], [12, 14]]),
    restrooms: [[22, 6, 23, 7]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The studio: the easels round the still life, the taboret between; the back wall; the tables down the front.
      o('pntStillLife', 8, 5), o('studioEasel', 5, 7), o('studioEasel', 7, 8), o('studioEasel', 9, 8), o('studioEasel', 11, 7), o('studioEasel', 3, 5), o('pntPaintCart', 8, 8),
      // The 관장's own big canvas by the window, its taboret beside it.
      o('studioEasel', 12, 5), o('pntPaintCart', 13, 5), o('armchair', 12, 9, 'left'),
      o('pntCritWall', 3, 2), o('bookshelf', 6, 2), o('bookshelf', 7, 2), o('paintingAbstract', 10, 2), o('pntBrushSink', 13, 2), o('plant', 14, 2),
      o('sketchTable', 3, 12), o('sketchTable', 6, 12), o('pntFramingTable', 9, 12), o('lamp', 2, 9), o('plant', 14, 13),
      // The store: canvas, paint, the drying racks.
      o('pntCanvasRack', 16, 2), o('pntSupplyShelf', 18, 2), o('pntDryingRack', 19, 4, 'left'), o('pntDryingRack', 16, 7, 'up'),
      // The kitchenette; the restroom.
      o('coffeeMaker', 21, 2), o('fridge', 22, 2), o('sofa', 21, 4, 'up'),
      o('toilet', 22, 7, 'right'), o('sink', 22, 6, 'right'),
      // The gallery: the big paintings on the end wall, the hung walls of small works with their captions, the plinth and the bench.
      o('paintingMaster', 23, 9, 'left'), o('pntGalleryWall', 23, 10, 'left'), o('paintingLandscape', 23, 12, 'left'),
      o('pntGalleryWall', 17, 9), o('pntGalleryWall', 20, 9), o('pntGalleryWall', 16, 12, 'right'), o('pntPlinth', 18, 11), o('pntGalleryBench', 20, 12, 'up'), o('plant', 23, 13),
      // The pavement: the A-board.
      o('pntSign', 21, 15),
    ],
    coworkers: [
      { name: '한지윤 관장', shirt: '#8d6e63', skin: '#eac09a', hair: '#5b3a1e', boss: true },
      { name: '오세진', shirt: '#5c6bc0', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '신유나', shirt: '#ec407a', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    tasks: [
      { id: 'commission', label: '의뢰 작품 그리기', does: ['paintCommission'], need: 1, count: 0 },
      { id: 'sketch', label: '스케치하기', does: ['sketch'], need: 2, count: 0 },
      { id: 'inspire', label: '작품 감상하며 영감 얻기', does: ['viewArt'], need: 2, count: 0 },
    ],
    // 미술 기획자 looks at and places others' work rather than painting to commission (2026-10-26).
    branchTasks: [undefined, [task('inspire', '소장 작품 살펴보며 평가하기', ['viewArt'], 2), task('sketch', '전시 배치 구상 스케치하기', ['sketch']), task('frame', '작품 액자 작업하기', ['pntFrameWork'])]],
    // The studio's chores (2026-10-27): brushes cleaned at the table or washed at the sink, paint mixed
    // at the taboret, canvas stretched, the still life set up.
    extra: [
      boss('관장님께 작품 보여 드리기'), chat(2), task('clean', '붓 정리하기', ['cleanBrushes', 'pntWashBrushes']), task('mix', '물감 조색하기', ['pntMixPaint']),
      task('canvas', '캔버스 짜기', ['pntStretchCanvas']), task('still', '정물 배치하기', ['pntArrangeStillLife']),
    ],
    work: ['paintCommission', 'sketch', 'viewArt', 'cleanBrushes', 'pntWashBrushes', 'pntMixPaint', 'pntStretchCanvas', 'pntFrameWork', 'pntArrangeStillLife'],
    skill: 'painting',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  doctor: {
    careerId: 'doctor',
    name: '종합병원',
    icon: '🏥',
    windowless: ['surgeryTable'],
    tiles: doctorTiles,
    objects: doctorObjects,
    restrooms: [[22, 5, 23, 7]],
    coworkers: [
      { name: '강민호 과장', shirt: '#eceff1', skin: '#eac09a', hair: '#9e9e9e', boss: true },
      { name: '권유찬 간호사', shirt: '#80cbc4', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '임태윤', shirt: '#90caf9', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    clients: [{ noun: '환자', socials: ['examinePatient', 'diagnosePatient'], spots: DOCTOR_SPOTS, max: 3, every: 45, patience: 150 }],
    // The 의대 실습생 takes histories rather than diagnosing (2026-10-26, at the user's request);
    // surgery is the 외과 branch's, every day, and nobody else's.
    // By rung (2026-11-02, workRoles.ts): a student listens, an intern draws blood and prepares, a resident has the ward and the charts, an older one diagnoses too.
    tasks: [
      gated(task('patients', '환자 진찰·진단하기', ['examinePatient', 'diagnosePatient'], 3), { minLevel: 3 }, gated(task('patients', '입원 환자 진찰하기', ['examinePatient'], 3), { minLevel: 2 }, gated(task('patients', '환자 채혈·병력 듣기', ['drDrawBlood', 'examinePatient'], 3), { minLevel: 1 }, task('patients', '환자 문진·병력 듣기 연습', ['examinePatient'], 3)))),
      gated(task('charts', '진료 기록 작성하기', ['writeChart'], 2), { minLevel: 2 }, gated(task('list', '환자 명단 정리하기', ['drPatientList']), { minLevel: 1 })),
      gated(task('labs', '검사 결과 확인하기', ['reviewLabs', 'drCheckMonitor']), { minLevel: 2 }, gated(task('prep', '수술 기구 준비·손 소독하기', ['drPrepTheatre', 'drScrubIn'], 2), { minLevel: 1 })),
      chat(1),
    ],
    extra: [gated(task('xray', '영상 판독하기 (엑스레이·초음파)', ['readXray', 'drReadUltrasound']), { minLevel: 2 }), gated(boss('과장님께 환자 상태 보고하기'), { minLevel: 2 }, boss('지도 선생님께 환자 소식 알리기')), gated(task('monitor', '환자 모니터 확인하기', ['drCheckMonitor'], 2), { minLevel: 1 })],
    branchTasks: [
      [task('patients', '환자 진찰·진단하기', ['examinePatient', 'diagnosePatient'], 2), task('surgery', '수술 집도하기', ['performSurgery']), task('charts', '진료 기록 작성하기', ['writeChart'], 2)],
      [task('patients', '환자 진찰·진단하기', ['examinePatient', 'diagnosePatient'], 3), task('scope', '위내시경 검사하기', ['drEndoscopy']), task('labs', '검사 결과·환자 모니터 확인하기', ['reviewLabs', 'drCheckMonitor']), task('charts', '진료 기록 작성하기', ['writeChart'], 2)],
    ],
    // The surgeons scrub in at the theatre's sink (2026-10-26 workplace pipeline); the internists scope and write it up (2026-11-04).
    branchExtra: [
      [task('scrub', '수술 전 손 소독하기', ['drScrubIn']), task('xray', '영상 판독하기 (엑스레이·초음파)', ['readXray', 'drReadUltrasound']), boss('과장님께 환자 상태 보고하기'), chat(2)],
      [task('xray', '영상 판독하기 (엑스레이·초음파)', ['readXray', 'drReadUltrasound']), task('endoReport', '내시경 소견 쓰기', ['drEndoReport']), boss('과장님께 환자 상태 보고하기'), chat(2)],
    ],
    work: ['examinePatient', 'diagnosePatient', 'writeChart', 'reviewLabs', 'readXray', 'performSurgery', 'prepareMeds', 'drReadUltrasound', 'drCheckMonitor', 'drScrubIn', 'drDrawBlood', 'drPatientList', 'drPrepTheatre', 'drEndoscopy', 'drEndoReport'],
    skill: 'logic',
    floors: { tile: 'creamTile', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'aquaTiles',
  },
  nurse: {
    careerId: 'nurse',
    name: '종합병원 병동',
    icon: '🏥',
    tiles: nurseTiles,
    objects: nurseObjects,
    restrooms: [[2, 12, 3, 13], [6, 5, 7, 6], [9, 5, 10, 6]],
    coworkers: [
      { name: '문혜진 수간호사', shirt: '#4db6ac', skin: '#f8d9c0', hair: '#5b3a1e', boss: true },
      { name: '조은비', shirt: '#80cbc4', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '백승우', shirt: '#80deea', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // Inpatients, each by their bed.
    clients: [{ noun: '환자', socials: ['giveShot', 'checkVitals', 'comfortPatient'], spots: [[3, 4], [13, 4], [17, 4], [22, 4]], max: 3, every: 35, patience: 150 }],
    // The 간호학과 실습생 gives no injections (2026-10-26, at the user's request).
    tasks: [gated(task('care', '주사 놓기·활력 징후 재기', ['giveShot', 'checkVitals'], 3), { minLevel: 1 }, task('care', '활력 징후 재기', ['checkVitals'], 3)), task('meds', '약 준비하기', ['prepareMeds', 'nsMedRound'], 2), task('beds', '병상 정리하기', ['makeHospitalBed'])],
    extra: [task('comfort', '환자 안심시키기', ['comfortPatient']), chat(2), boss('수간호사님께 인수인계하기'), task('restock', '의료 물품·린넨 정리하기', ['restockSupplies', 'nsSortLinen']), task('notes', '간호 기록 작성하기', ['nsNursingNotes', 'writeChart']), task('call', '환자 호출벨 응답하기', ['nsAnswerCall'], 2), gated(task('iv', '수액 교체하기', ['nsHangIv']), { minLevel: 1 }), task('hygiene', '손 위생 지키기', ['nsWashHands'], 2)],
    work: ['giveShot', 'checkVitals', 'comfortPatient', 'prepareMeds', 'makeHospitalBed', 'restockSupplies', 'writeChart', 'nsNursingNotes', 'nsAnswerCall', 'nsMedRound', 'nsHangIv', 'nsSortLinen', 'nsWashHands'],
    skill: 'charisma',
    floors: { tile: 'creamTile', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'aquaTiles',
  },
  police: {
    careerId: 'police',
    name: '경찰서',
    icon: '🚓',
    // A 경찰서 as one is (2026-11-05, the layout audit, replacing a one-storey house on a lawn that mixed a 지구대 and a 경찰서: the cell
    // and the interrogation room in one 4 × 5 room, the evidence table in the chief's office, the 112 desk among the detectives' and the
    // patrol car on the grass). Downstairs, as in newer stations, the 민원실 at the front door (the desks where a report is taken, the
    // seats, lost property, the wanted board, the visitors' restroom, the stairs up), and behind it the 형사과: the detectives' desks
    // facing over the aisle, the case board, the 팀장's desk; off it the 진술녹화실, a closed room with the steel table, and down its own
    // corridor the 유치장, two cells and the watch desk, its own door onto the car park for bringing people in. Upstairs the
    // 112 종합상황실 where calls are taken and passed to the patrols, the 과장실, the evidence store with the forensic table and the
    // print scanner, the 장비실 (the arms locker, the gear, the lockers) and a 체력단련실. The patrol cars stand in their marked bays
    // beside the building, the station's sign with its blue lamp on the pavement.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 11, 7, 'carpet'], [13, 2, 17, 5, 'tile'], [13, 7, 17, 7, 'tile'], [2, 9, 13, 13, 'tile'], [15, 9, 17, 13, 'tile']],
          [[4, 8], [12, 3], [12, 7], [15, 8], [18, 11], [12, 14]],
        ),
        [
          // The car park east of the building.
          ...Array.from({ length: 6 * 14 }, (_, i): [number, number, 'grass'] => [19 + (i % 6), 1 + Math.floor(i / 6), 'grass']),
          // The visitors' restroom in the 민원실's corner, its door in its own wall.
          [2, 11, 'door'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall'],
        ],
      ),
      ...patch(
        upstairs(
          [[2, 2, 8, 7, 'carpet'], [10, 2, 13, 7, 'wood'], [15, 2, 17, 7, 'tile'], [2, 9, 17, 10, 'tile'], [2, 12, 8, 13, 'tile'], [10, 12, 17, 13, 'wood']],
          [[5, 8], [13, 8], [16, 8], [5, 11], [13, 11]],
        ),
        Array.from({ length: 6 * 15 }, (_, i): [number, number, 'void'] => [19 + (i % 6), Math.floor(i / 6), 'void']),
      ),
    ],
    restrooms: [[2, 12, 3, 13]],
    windowless: ['policeInterrogationTable'],
    ground: [[19, 7, 24, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The 민원실: the desks where reports are taken, lost property, the wanted board, the seats, the stairs up.
      o('policeDesk', 5, 9), o('policeDesk', 7, 9), o('poLostShelf', 2, 9), o('policeWantedBoard', 13, 11, 'left'),
      o('drWaitSeat', 5, 13, 'up'), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 8, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('plant', 10, 13),
      o('stairs', 9, 9, 'left'),
      o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'),
      // The 형사과: the desks facing over the aisle, the case board, the 팀장's desk, the files, the coffee.
      o('policeDesk', 3, 2), o('policeDesk', 5, 2), o('policeDesk', 7, 2), o('policeDesk', 3, 5, 'up'), o('policeDesk', 5, 5, 'up'), o('policeDesk', 7, 5, 'up'),
      o('policeCaseBoard', 9, 2), o('policeDesk', 10, 5, 'left'), o('coffeeMaker', 2, 2), o('archiveShelf', 8, 7, 'up'), o('plant', 11, 2),
      // The 진술녹화실: the steel table, the detective's chair behind it, the two across.
      o('policeInterrogationTable', 15, 3), o('policeInterrogationChair', 15, 2), o('policeInterrogationChair', 15, 4, 'up'), o('policeInterrogationChair', 16, 4, 'up'),
      // The 유치장 down its corridor: two cells, the watch desk.
      o('policeHoldingCell', 16, 9), o('policeHoldingCell', 16, 12, 'up'), o('policeDesk', 15, 13, 'up'), o('plant', 17, 7),
      // Upstairs. The 112 종합상황실: the call desks.
      up('policeDispatchConsole', 3, 2), up('policeDispatchConsole', 6, 2), up('officeDesk', 4, 6, 'up'), up('plant', 8, 7),
      // The 과장실.
      up('policeDesk', 12, 2), up('bookshelf', 10, 2), up('sofa', 10, 6, 'up'), up('plant', 10, 7),
      // The evidence store: the forensic table, the sealed shelves, the print scanner.
      up('evidenceTable', 15, 2), up('archiveShelf', 17, 4, 'left'), up('archiveShelf', 17, 5, 'left'), up('poPrintScanner', 15, 6, 'right'),
      // The 장비실: the arms locker, the gear locker, the officers' lockers.
      up('swatArmoryRack', 2, 12), up('policeGearLocker', 6, 13, 'up'), up('clsLockers', 7, 13, 'up'),
      // The 체력단련실.
      up('treadmill', 10, 12, 'right'), up('treadmill', 10, 13, 'right'), up('trainingDummy', 16, 12, 'left'), up('plant', 14, 13),
      // The car park: the marked bays, the patrol cars nosed out to the street; the station's sign.
      o('poCarPark', 19, 8), o('patrolCar', 20, 9, 'left'), o('patrolCar', 22, 9, 'left'), o('tree', 20, 2), o('tree', 23, 3), o('bush', 19, 5),
      o('poStationSign', 14, 15),
    ],
    coworkers: [
      { name: '황보석 반장', shirt: '#1a237e', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '남궁현', shirt: '#283593', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '차유리', shirt: '#3949ab', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    clients: [
      // Reporters on the 민원실's seats; a suspect in the 진술녹화실, by the chairs across the table.
      { noun: '신고자', socials: ['takeStatement'], spots: [[5, 12], [6, 12], [8, 12]], max: 2, every: 70, patience: 120 },
      { noun: '용의자', socials: ['interrogate'], spots: [[14, 4], [17, 4]], max: 1, every: 150, patience: 240 },
    ],
    alarm: { notice: '🚨 112 신고가 들어왔어요! 순찰차로 출동하세요', done: '🚓 신고 사건을 해결하고 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 순찰팀이 대신 나갔어요 (성과 감소)', interaction: 'respondCall', every: [150, 300], window: 60 },
    tasks: [task('report', '사건 보고서 작성하기', ['fileReport'], 2), task('patrol', '순찰 나가기', ['patrol']), task('statement', '시민 진술 받기', ['takeStatement'])],
    extra: [task('evidence', '증거 분석하기', ['analyzeEvidence']), task('interrogate', '용의자 심문하기', ['interrogate']), task('drill', '체포술 훈련하기', ['arrestDrill'], 2), boss('반장님께 수사 보고하기'), task('call', '신고 출동하기', ['respondCall']), task('dispatch', '112 신고 모니터링하기', ['policeMonitorDispatch']), task('caseMeeting', '수사 회의 참석하기', ['policeCaseMeeting', 'policePinClues']), task('lostSort', '보관 분실물 정리하기', ['poSortLost']), task('printScan', '지문 카드 등록하기', ['poScanCard'])],
    work: ['fileReport', 'searchRecords', 'analyzeEvidence', 'arrestDrill', 'patrol', 'respondCall', 'takeStatement', 'interrogate', 'policeMonitorDispatch', 'policeCaseMeeting', 'policePinClues', 'policeCheckCell', 'policeCheckGear', 'poSortLost', 'poScanCard'],
    skill: 'fitness',
    floors: { carpet: 'slateStone', wood: 'walnutWood', tile: 'monoTile' },
    wall: 'navyWainscot',
  },
  firefighter: {
    careerId: 'firefighter',
    name: '소방서',
    icon: '🚒',
    // The engine bay: two pumpers nosed to their red roll-up doors on the street wall, the turnout
    // gear racks, hose racks, the air compressor and the rescue tool shelf along the back wall, the
    // dispatch terminal and the duty board at the sides; the training room with its drill tower above
    // the crew lounge with its bunks (2026-10-26 workplace pipeline: workFurniture/firefighter.ts).
    // 2026-11-04, the vehicles' way out: the pumpers used to stop at shut shutters in the street wall and vanish into it. The bay is
    // now open to the street in front of them, the shutters rolled up under the header, and each pulls 8 m straight out onto the
    // street; its walls on the lot's edge and beside the openings are pieces (a wall between the open bay and the lot isn't drawn).
    // 2026-11-05, the layout audit (a drill tower in a room, the bunks in the lounge beside the dining table, no office to take the
    // call in, one storey): a 119안전센터 as one is built. The bay as above, its name over the openings. Beside it, downstairs, the
    // 상황실 where the call comes in (the dispatch terminal, the duty board) and the 대기실 with the kitchen table, the restroom and
    // the stairs; upstairs the 숙직실 with the bunks and the 체력단련실. The 훈련탑 stands out in the yard on the east, three floors
    // of concrete with the drill rig at its foot and the hoses hung from its top to dry.
    tiles: () => [
      ...patch(building([[15, 2, 19, 5, 'wood'], [15, 7, 16, 9, 'carpet'], [15, 10, 19, 13, 'carpet'], [18, 7, 19, 8, 'tile']], [[14, 4], [14, 10], [16, 6], [17, 8], [20, 11]]), [
        ...Array.from({ length: 14 * 14 }, (_, i): [number, number, 'grass'] => [1 + (i % 14), 1 + Math.floor(i / 14), 'grass']).filter(([x, y]) => x <= 13 || y === 1 || y === 14),
        // The yard east of the building.
        ...Array.from({ length: 4 * 14 }, (_, i): [number, number, 'grass'] => [21 + (i % 4), 1 + Math.floor(i / 4), 'grass']),
        [17, 7, 'wall'], [17, 9, 'wall'], [18, 9, 'wall'], [19, 9, 'wall'],
      ]),
      ...patch(upstairs([[15, 2, 19, 7, 'carpet'], [15, 9, 19, 13, 'wood']], [[17, 8]]), Array.from({ length: 26 * 15 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']).filter(([x]) => x < 14 || x > 20)),
    ],
    restrooms: [[18, 7, 19, 8]],
    ground: [[1, 1, 14, 14, 'concrete'], [2, 15, 10, 17, 'concrete'], [21, 1, 24, 14, 'concrete']],
    objects: [
      o('ffBayWallSide', 1, 1), o('ffBayWallBack', 2, 1), o('ffBayWallFront', 10, 14), o('ffBayWallFront', 13, 14), o('ffBayFront', 2, 14),
      o('gearLocker', 3, 2), o('gearLocker', 4, 2), o('gearLocker', 5, 2), o('hoseRack', 7, 2), o('hoseRack', 8, 2), o('ffAirCompressor', 10, 2), o('ffRescueToolRack', 12, 2),
      o('ffInspectBoard', 2, 5, 'right'),
      o('fireTruck', 3, 8), o('fireTruck', 7, 8),
      // The 상황실: the dispatch terminal, the duty board.
      o('ffDispatchDesk', 16, 2), o('ffDutyBoard', 18, 2), o('plant', 15, 2),
      // The 대기실: the coffee and the fridge, the kitchen table, the stairs up; the restroom.
      o('coffeeMaker', 15, 11, 'right'), o('fridge', 15, 12, 'right'),
      o('diningTable', 17, 11), o('diningChair', 17, 10), o('diningChair', 18, 10),
      o('stairs', 15, 13, 'right'), o('plant', 15, 7),
      o('toilet', 19, 7, 'left'), o('sink', 19, 8, 'left'),
      // The yard: the 훈련탑, the drill rig at its foot.
      o('ffDrillTower', 21, 2), o('fireDrill', 22, 5),
      // Upstairs: the 숙직실's bunks; the 체력단련실.
      up('bed', 15, 2), up('bed', 17, 2), up('bed', 19, 2), up('plant', 15, 7),
      up('treadmill', 16, 9), up('treadmill', 18, 9),
    ],
    coworkers: [
      { name: '왕대철 대장', shirt: '#b71c1c', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '유하늘', shirt: '#e53935', skin: '#f8d9c0', hair: '#a0522d' },
      { name: '표준혁', shirt: '#ef6c00', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    alarm: { notice: '🚨 화재 신고! 소방차로 출동하세요', done: '🚒 불을 끄고 무사히 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 소방대가 대신 나갔어요 (성과 감소)', interaction: 'respondFire', every: [150, 300], window: 45 },
    tasks: [task('fire', '화재 출동하기', ['respondFire']), task('truck', '소방차 점검하기', ['inspectTruck']), task('drill', '소방 훈련하기', ['fireDrill'], 2)],
    extra: [task('hose', '호스 정리하기', ['rollHose'], 2), task('gear', '장비 점검하기', ['checkGear', 'ffFillAir', 'ffCheckRescueTools']), chat(2), boss('대장님께 출동 보고하기'), task('log', '출동 일지 쓰기', ['ffWriteLog']), task('briefing', '교대 근무 브리핑하기', ['ffShiftBriefing']), task('hydrant', '소화전함 점검하기', ['ffCheckHydrant'])],
    work: ['respondFire', 'inspectTruck', 'fireDrill', 'rollHose', 'checkGear', 'ffWriteLog', 'ffFillAir', 'ffCheckRescueTools', 'ffShiftBriefing', 'ffCheckHydrant'],
    skill: 'fitness',
    floors: { tile: 'slateStone', wood: 'oakWood', carpet: 'lilacCarpet' },
    wall: 'redBrick',
  },
  teacher: {
    careerId: 'teacher',
    name: '초등학교 교실',
    icon: '🏫',
    // A 초등학교 behind its 운동장 (2026-11-05, the layout audit, replacing a building straight off the street with a class of six
    // desks, a staff room with a sofa and a coffee machine and one toilet at the corridor's end). From the street through the
    // 정문, past the 배움터지킴이실, across the 운동장 with the 조회대 and the flagpole at its head, into the 현관 where the shoes
    // go in the 신발장; the corridor runs along the north side of the floor and the classrooms face the 운동장. Downstairs the
    // classroom: the board and the TV on the front wall, the 교탁, the teacher's desk in the front corner, sixteen desks in
    // columns facing the board, the lockers and the class notice board on the back wall, a front and a back door off the
    // corridor; the boys' and the girls' restrooms; the 보건실. Upstairs the 교무실 (the desks facing in an island, the 교감's
    // desk at its head, the 학사일정 board, the copier and the water) and the 상담실 where parents are seen.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 23, 2, 'tile'], [2, 4, 13, 8, 'wood'], [15, 4, 17, 8, 'tile'], [19, 4, 20, 5, 'tile'], [22, 4, 23, 5, 'tile'], [19, 7, 23, 8, 'carpet']],
          [[3, 3], [12, 3], [16, 3], [19, 3], [22, 3], [18, 8], [16, 9]],
        ),
        // The 운동장 between the building and the street.
        Array.from({ length: 24 * 5 }, (_, i): [number, number, 'grass'] => [1 + (i % 24), 10 + Math.floor(i / 24), 'grass']),
      ),
      ...patch(
        upstairs([[2, 2, 23, 2, 'tile'], [2, 4, 13, 8, 'carpet'], [15, 4, 17, 8, 'tile'], [19, 4, 23, 8, 'carpet']], [[3, 3], [12, 3], [16, 3], [20, 3]]),
        // Only the building has a floor above.
        Array.from({ length: 24 * 5 }, (_, i): [number, number, 'void'] => [1 + (i % 24), 10 + Math.floor(i / 24), 'void']),
      ),
    ],
    restrooms: [[19, 4, 20, 5], [22, 4, 23, 5]],
    // A Korean school's 운동장 is bare earth.
    ground: [[0, 15, 25, 17, 'concrete'], [1, 10, 24, 14, 'soil']],
    objects: [
      // The classroom. The front wall: the TV, the board, the teacher's desk in the corner; the 교탁 before the board.
      o('clsClassTv', 2, 4, 'right'), o('chalkboard', 2, 5, 'right'), o('teacherDesk', 2, 8, 'right'), o('clsLectern', 4, 5, 'left'),
      // Sixteen desks in four columns facing the board.
      o('studentDesk', 5, 4, 'right'), o('studentDesk', 5, 5, 'right'), o('studentDesk', 5, 6, 'right'), o('studentDesk', 5, 7, 'right'),
      o('studentDesk', 7, 4, 'right'), o('studentDesk', 7, 5, 'right'), o('studentDesk', 7, 6, 'right'), o('studentDesk', 7, 7, 'right'),
      o('studentDesk', 9, 4, 'right'), o('studentDesk', 9, 5, 'right'), o('studentDesk', 9, 6, 'right'), o('studentDesk', 9, 7, 'right'),
      o('studentDesk', 11, 4, 'right'), o('studentDesk', 11, 5, 'right'), o('studentDesk', 11, 6, 'right'), o('studentDesk', 11, 7, 'right'),
      // The back wall: the class notice board, the lockers.
      o('clsNoticeBoard', 13, 4, 'left'), o('clsLockers', 13, 6, 'left'), o('plant', 13, 8),
      // The 현관: the 신발장, the stairs up; the 보건실.
      o('mtShoeRack', 15, 5, 'right'), o('plant', 15, 8), o('stairs', 17, 4, 'down'),
      o('bed', 22, 7, 'right'), o('medCabinet', 23, 8, 'left'), o('officeDesk', 19, 7),
      // The boys' and the girls' restrooms.
      o('toilet', 20, 4, 'left'), o('sink', 20, 5, 'left'), o('toilet', 23, 4, 'left'), o('sink', 23, 5, 'left'),
      // The 운동장: the 조회대 and the flagpole; the fence, the 정문 and the 지킴이실 on the street.
      o('clsMorningStand', 6, 10), o('flagPole', 9, 10), o('plant', 2, 10), o('plant', 23, 10),
      o('clsSchoolGate', 0, 14), o('clsGuardBooth', 14, 14),
      // Upstairs. The 교무실: the desks facing in an island, the 교감's desk at its head, the 학사일정 board, the copier, the water, the binders.
      up('teacherDesk', 3, 6, 'right'),
      up('teacherDesk', 5, 6, 'up'), up('teacherDesk', 6, 6, 'up'), up('teacherDesk', 7, 6, 'up'), up('teacherDesk', 5, 7), up('teacherDesk', 6, 7), up('teacherDesk', 7, 7),
      up('whiteboard', 5, 4), up('archiveShelf', 2, 4), up('archiveShelf', 2, 8, 'right'), up('copier', 13, 5, 'left'), up('salWaterCooler', 13, 7, 'left'),
      up('diningTable', 10, 7), up('diningChair', 10, 8, 'up'), up('diningChair', 11, 8, 'up'), up('plant', 13, 8),
      // The upstairs hall; the 상담실.
      up('plant', 15, 8), up('sofa', 20, 8, 'up'), up('armchair', 19, 6, 'right'), up('armchair', 23, 6, 'left'), up('bookshelf', 19, 4), up('plant', 23, 4),
    ],
    coworkers: [
      { name: '윤정숙 교감', shirt: '#6d4c41', skin: '#f8d9c0', hair: '#9e9e9e', boss: true },
      { name: '배수빈 선생님', shirt: '#ba68c8', skin: '#eac09a', hair: '#2b1b10' },
      { name: '고태호 선생님', shirt: '#4caf50', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    clients: [{ noun: '학생', socials: ['answerQuestion', 'praiseStudent', 'tutorStudent'], spots: [[6, 4], [8, 5], [10, 6], [12, 7], [6, 7], [10, 4]], max: 4, every: 30, patience: 200, age: 'child' }],
    // A student teacher teaches under their supervising teacher, and marks nothing of their own; a 부장 has a part of the school's work (2026-11-02).
    tasks: [
      gated(task('lesson', '수업하기', ['teachLesson', 'clsPlayVideo'], 2), { minLevel: 1 }, task('lesson', '지도 교사 아래 수업해 보기', ['teachLesson'])),
      task('students', '학생 질문·칭찬·보충 지도', ['answerQuestion', 'praiseStudent', 'tutorStudent'], 3),
      gated(task('grade', '시험지 채점하기', ['gradePapers']), { minLevel: 1 }, task('attendance', '출석 부르기', ['clsTakeAttendance'])),
      gated(task('part', '맡은 부문의 공문 처리하기', ['teacher_officialDoc']), { minLevel: 4 }),
    ],
    // 교감·교장 and 장학사 review plans and results instead of teaching a class (2026-10-26); 장학사 write the letters; 수석교사 teach about half as much and help colleagues (2026-11-02).
    branchTasks: [
      [task('plan', '학교 교육 계획 검토하기', ['planLesson'], 2), task('grade', '학력 평가 결과 검토하기', ['gradePapers'])],
      [task('doc', '학교에 보낼 공문 쓰기', ['teacher_officialDoc'], 2), task('plan', '학교 교육 계획 검토하기', ['planLesson'])],
      [task('lesson', '수업하기', ['teachLesson', 'clsPlayVideo']), task('open', '공개 수업하기', ['teacher_openLesson']), task('students', '학생 질문·칭찬·보충 지도', ['answerQuestion', 'praiseStudent', 'tutorStudent'], 2)],
    ],
    branchExtra: [[boss('교장 선생님께 교무 보고하기'), task('homework', '과제 운영 점검하기', ['checkHomework']), chat(2)], [boss('교육장님께 장학 결과 보고하기'), task('homework', '과제 운영 점검하기', ['checkHomework']), chat(2)], undefined],
    extra: [task('plan', '수업 계획 세우기', ['planLesson']), task('homework', '숙제 검사하기', ['checkHomework'], 2), task('attendance', '출석 부르기', ['clsTakeAttendance']), task('sticker', '칭찬 스티커 붙여 주기', ['clsPraiseChart']), boss('교감 선생님께 학급 보고하기'), chat(2)],
    work: ['teachLesson', 'gradePapers', 'planLesson', 'checkHomework', 'answerQuestion', 'praiseStudent', 'tutorStudent', 'clsTakeAttendance', 'clsPlayVideo', 'clsPraiseChart', 'teacher_openLesson', 'teacher_officialDoc'],
    skill: 'charisma',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'mintDots',
  },
  lawyer: {
    careerId: 'lawyer',
    name: '로펌과 법정',
    icon: '⚖️',
    // A law firm and the court across the way (2026-11-05, the layout audit, replacing one building on a lawn where the courtroom
    // opened off the firm's lobby, the lawyers' desks stood in one open room and the library shared a room with the restroom). On
    // the left the office building the firm takes two floors of: downstairs, inside the glass door, the reception (the desk, the
    // logo wall, the sofa where clients wait, the stairs, the restroom), the consultation room and the meeting room off a short
    // corridor, and the 자료실 of law reports and case files behind; upstairs, each lawyer's own room along the back (the partner's
    // the biggest), the secretaries' desks before their doors and the associates' and the paralegal's desks in the open, the copier
    // by the stairs. On the right the court's building, a lawyer's walk away: in at its door under the security arch, the hall with
    // the day's cases on the board and seats to wait on, and the courtroom laid out as a Korean one (2026-10-27): the bench with
    // the 참여관석 under it, the 원고 and 피고 tables facing each other across the well, the witness stand in the middle, the
    // podiums, and the gallery behind the bar, the gap in it the way in.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 10, 3, 'wood'], [2, 5, 4, 8, 'carpet'], [6, 5, 6, 8, 'tile'], [8, 5, 10, 8, 'carpet'], [2, 10, 10, 13, 'tile'], [2, 12, 3, 13, 'tile'], [14, 2, 23, 9, 'wood'], [14, 11, 23, 13, 'tile']],
          [[6, 4], [5, 8], [7, 8], [6, 9], [6, 14], [4, 13], [18, 10], [18, 14]],
        ),
        [...Array.from({ length: 15 }, (_, y): [number, number, 'grass'] => [12, y, 'grass']), [2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall']],
      ),
      ...patch(
        upstairs(
          [[2, 2, 4, 5, 'carpet'], [6, 2, 7, 5, 'carpet'], [9, 2, 10, 5, 'carpet'], [2, 7, 10, 10, 'carpet'], [6, 12, 10, 13, 'tile']],
          [[3, 6], [7, 6], [10, 6], [10, 11]],
        ),
        Array.from({ length: 26 * 15 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']).filter(([x, y]) => x >= 12 && y <= 14),
      ),
    ],
    restrooms: [[2, 12, 3, 13]],
    ground: [[0, 15, 25, 17, 'concrete'], [12, 0, 12, 14, 'concrete']],
    objects: [
      // The firm, downstairs. The 자료실: law reports along the wall, the case files.
      o('lawLibrary', 2, 2), o('lawLibrary', 3, 2), o('lawLibrary', 4, 2), o('lawLibrary', 5, 2), o('lwCaseFiles', 7, 2), o('lwCaseFiles', 9, 2),
      // The consultation room; the meeting room.
      o('lwConsultTable', 3, 5), o('salMeetingChair', 2, 5, 'right'),
      o('salMeetingTable', 9, 5, 'left'), o('salMeetingChair', 8, 5, 'right'), o('salMeetingChair', 10, 5, 'left'),
      // The reception: the logo wall, the desk, the sofa, the stairs up; the restroom.
      o('lwFirmSign', 8, 10), o('lwReception', 8, 11), o('plant', 5, 10), o('plant', 2, 10), o('sofa', 5, 12, 'up'), o('stairs', 7, 13, 'left'),
      o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
      // Upstairs: the partner's room, the two lawyers' rooms; the secretaries' and associates' desks; the copier by the stairs.
      up('lwPartnerDesk', 2, 4), up('bookshelf', 4, 2), up('bookshelf', 2, 2),
      up('lawDesk', 6, 4), up('lawLibrary', 6, 2), up('lawDesk', 9, 4), up('lawLibrary', 9, 2),
      up('officeDesk', 4, 7), up('officeDesk', 8, 7), up('lawDesk', 2, 9), up('lawDesk', 3, 9), up('lawDesk', 5, 9), up('plant', 9, 10),
      up('copier', 6, 13, 'up'),
      // The court. Its hall: the security arch inside the door, the board of the day's cases, the seats.
      o('lwSecurityGate', 18, 13), o('lwDocketBoard', 21, 11), o('drWaitSeat', 14, 13, 'up'), o('drWaitSeat', 15, 13, 'up'), o('drWaitSeat', 22, 13, 'up'), o('drWaitSeat', 23, 13, 'up'), o('plant', 14, 11),
      // The courtroom.
      o('judgeBench', 18, 2), o('lwClerkDesk', 18, 3), o('lwPlaintiffTable', 15, 4, 'left'), o('lwDefenseTable', 22, 4, 'right'), o('lwWitnessStand', 18, 5),
      o('courtPodium', 17, 6), o('courtPodium', 20, 6),
      o('lwGalleryBench', 14, 9, 'up'), o('lwGalleryBench', 16, 9, 'up'), o('lwGalleryBench', 20, 9, 'up'), o('lwGalleryBench', 22, 9, 'up'),
      o('plant', 14, 2), o('plant', 23, 2),
    ],
    coworkers: [
      { name: '한승철 대표', shirt: '#212121', skin: '#eac09a', hair: '#9e9e9e', boss: true },
      { name: '진소연 변호사', shirt: '#455a64', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '마동휘 변호사', shirt: '#37474f', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // On the reception's sofa, or across the table in the consultation room.
    clients: [{ noun: '의뢰인', socials: ['consultClient', 'prepTestimony'], spots: [[7, 12], [5, 11], [2, 6]], max: 2, every: 70, patience: 150 }],
    alarm: { notice: '⚖️ 곧 재판이 열려요! 법정 변론대로 가세요', done: '⚖️ 재판을 잘 마쳤어요! 성과가 크게 올라요', missed: '⌛ 재판에 늦어 다른 변호사가 대신 출석했어요 (성과 감소)', interaction: 'attendTrial', every: [180, 320], window: 60 },
    tasks: [task('brief', '소송 서류 작성하기', ['draftBrief'], 2), task('clients', '의뢰인 상담하기', ['consultClient', 'prepTestimony', 'lwSignRetainer'], 2), task('research', '판례 조사하기', ['researchCases'])],
    // The 법률 사무원 doesn't go to court (2026-10-26, at the user's request).
    // In court the 법률 사무원 files papers but doesn't examine witnesses (2026-10-27).
    extra: [
      gated(task('trial', '재판 출석하기', ['attendTrial']), { minLevel: 1 }),
      gated(task('witness', '증인 신문하기', ['lwExamineWitness']), { minLevel: 1 }),
      task('argue', '변론 연습하기', ['argueCase']),
      boss('대표님께 사건 보고하기'),
      task('review', '사건 기록 검토하기', ['reviewCase', 'lwPullRecords'], 2),
      task('file', '법원에 서면 제출하기', ['lwFileBriefs']),
      task('exhibits', '증거 서류 정리하기', ['lwSortExhibits']),
      task('contract', '자문 계약서 검토하기', ['lwReviewContract']),
    ],
    // A judge meets no clients and drafts no briefs: verdicts, hearings, the record (2026-10-26).
    branchTasks: [[task('verdict', '판결문 쓰기', ['reviewVerdict'], 2), task('trial', '재판 진행하기', ['attendTrial']), task('review', '사건 기록 검토하기', ['reviewCase'], 2)], undefined],
    branchExtra: [[task('research', '판례 조사하기', ['researchCases']), boss('부장판사님과 사건 논의하기')], undefined],
    work: ['draftBrief', 'reviewCase', 'researchCases', 'argueCase', 'attendTrial', 'reviewVerdict', 'consultClient', 'prepTestimony', 'lwSortExhibits', 'lwExamineWitness', 'lwFileBriefs', 'lwReviewContract', 'lwPullRecords', 'lwSignRetainer'],
    skill: 'charisma',
    floors: { carpet: 'lilacCarpet', wood: 'walnutWood', tile: 'monoTile' },
    wall: 'oakWainscot',
  },
  architect: {
    careerId: 'architect',
    name: '건축 사무소',
    icon: '📐',
    // A 건축사사무소 on a floor of a 근린생활 building (2026-11-05, the layout audit, replacing a lone building whose studio was four
    // drawing boards and two computers with a toilet stood in the middle of it, the coffee in the lobby where clients wait, the
    // plotter in the studio's gangway and the van parked on the lawn). In from the street the floor's lift hall and its restroom;
    // through the glass door the reception (the desk, the hard hats by the way out to the site) and the meeting room where the
    // 건축주 is shown the scheme round the table and the site model. On the right the studio: everyone at a CAD desk with two
    // screens, in an island and a row, one big table for drawing by hand, the pin-up wall where renderings are criticised, and
    // the 소장's office in its corner; the pantry behind it. On the left the model workshop, the print room with the plotter and
    // the materials library below it, and the drawing archive at the back. The site van in its bay out front.
    tiles: () =>
      patch(
        building(
          [[2, 2, 7, 5, 'wood'], [2, 7, 7, 9, 'tile'], [9, 2, 14, 5, 'carpet'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'wood'], [2, 11, 7, 13, 'carpet'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'wood']],
          [[5, 6], [8, 8], [5, 10], [10, 10], [10, 6], [15, 9], [20, 10], [14, 12], [12, 14]],
        ),
        [
          [20, 2, 'wall'], [20, 3, 'wall'], [20, 4, 'door'], [20, 5, 'wall'], [20, 6, 'wall'], [21, 6, 'wall'], [22, 6, 'wall'], [23, 6, 'wall'],
          ...Array.from({ length: 12 }, (_, i): [number, number, 'carpet'] => [21 + (i % 3), 2 + Math.floor(i / 3), 'carpet']),
        ],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The reception, the hard hats by the way out; the meeting room: the table, the site model.
      o('lobbyDesk', 12, 7), o('archGearRack', 9, 9, 'up'), o('plant', 9, 7),
      o('salMeetingTable', 11, 3), o('salMeetingChair', 11, 2),
      o('salMeetingChair', 11, 4, 'up'), o('salMeetingChair', 12, 4, 'up'), o('salMeetingChair', 13, 4, 'up'), o('archSiteModel', 9, 2, 'right'),
      // The studio: the CAD desks, the drawing table, the pin-up wall.
      o('cadStation', 16, 4, 'up'), o('cadStation', 17, 4, 'up'), o('cadStation', 18, 4, 'up'), o('cadStation', 16, 5), o('cadStation', 17, 5), o('cadStation', 18, 5),
      o('cadStation', 17, 8, 'up'), o('cadStation', 18, 8, 'up'), o('cadStation', 19, 8, 'up'),
      o('draftingTable', 21, 9, 'up'), o('archPinupBoard', 22, 7), o('plant', 16, 2),
      // The 소장's office.
      o('officeDesk', 22, 3), o('bookshelf', 23, 2), o('armchair', 21, 5, 'right'), o('plant', 23, 5),
      // The model workshop; the print room; the drawing archive.
      o('modelTable', 3, 3), o('modelTable', 6, 3), o('lamp', 2, 2),
      o('archPlotter', 2, 7), o('archMaterialLibrary', 6, 7),
      o('archiveShelf', 2, 11), o('archiveShelf', 3, 11), o('archiveShelf', 6, 11), o('archiveShelf', 2, 13, 'up'), o('archiveShelf', 3, 13, 'up'), o('archiveShelf', 6, 13, 'up'),
      // The pantry.
      o('coffeeMaker', 18, 11), o('salWaterCooler', 19, 11), o('fridge', 18, 13, 'up'), o('diningTable', 21, 12), o('diningChair', 21, 13, 'up'), o('diningChair', 22, 13, 'up'),
      // Out front: the site van in its bay.
      o('siteVan', 15, 15),
    ],
    coworkers: [
      { name: '정우진 소장', shirt: '#263238', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '하예솔', shirt: '#ff8a65', skin: '#f8d9c0', hair: '#a0522d' },
      { name: '구민재', shirt: '#7986cb', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // At the meeting room's table.
    clients: [{ noun: '건축주', socials: ['presentDesign', 'hearRequests'], spots: [[12, 2], [10, 4]], max: 2, every: 90, patience: 180 }],
    alarm: { notice: '🏗️ 공사 현장에서 확인 요청이 왔어요! 현장 차량으로 출발하세요', done: '🏗️ 현장 점검을 마치고 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 현장 확인이 늦어 소장님이 대신 다녀왔어요 (성과 감소)', interaction: 'siteVisit', every: [200, 320], window: 60 },
    tasks: [task('blueprint', '설계도 그리기', ['draftBlueprint'], 2), task('model', '건축 모형 만들기', ['buildModel']), task('client', '건축주 응대하기', ['presentDesign', 'hearRequests'])],
    extra: [
      task('render', '3D 설계하기', ['renderDesign']), task('site', '공사 현장 점검하기', ['siteVisit']), task('sketch', '입면 스케치하기', ['sketchFacade'], 2), boss('소장님께 설계 검토받기'),
      // The plotter, the materials library, the pin-up wall, the site model and the gear rack (2026-10-27 workplace pipeline).
      task('plot', '도면 출력하기', ['archPlotDrawings']), task('materials', '마감재 샘플 고르기', ['archPickMaterials']), task('pinup', '핀업 크리틱 하기', ['archPinupCrit', 'archPinRendering']),
      task('siteModel', '대지 모형으로 배치 검토하기', ['archSiteStudy', 'archPresentScheme']), task('gear', '현장 안전 장비 점검하기', ['archGearUp']),
    ],
    work: ['draftBlueprint', 'sketchFacade', 'renderDesign', 'buildModel', 'siteVisit', 'presentDesign', 'hearRequests', 'archPlotDrawings', 'archPickMaterials', 'archPinupCrit', 'archPinRendering', 'archSiteStudy', 'archPresentScheme', 'archGearUp'],
    skill: 'logic',
    floors: { wood: 'walnutWood', carpet: 'sageCarpet', tile: 'slateStone' },
    wall: 'creamPlain',
  },
  vet: {
    careerId: 'vet',
    name: '동물병원',
    icon: '🐾',
    // A neighbourhood animal hospital on two floors (2026-11-04, the layout audit, replacing the people's clinic plan with two copied
    // exam rooms, and the operating table, X-ray table, bath and kennels all in one room). In from the street the waiting room is split:
    // the dogs' side on the left with its benches and the vaccination chart, the front desk and the scale by it in the middle, the
    // cats' side on the right behind the carrier shelf, quieter, with the diets and the customers' restroom. Behind it the two exam
    // rooms (one the cats' own) open off the waiting room in front and off the staff corridor behind, to the treatment room: the
    // treatment table and the ultrasound, the oxygen cage, the drip, the medicine cabinets, the 조제실 in its corner (a vet hospital
    // must have one), the staff stairs. Off the treatment room the X-ray room behind its shielded walls and the theatre (the table,
    // the anaesthesia machine, the scrub sink; its autoclave in the prep room behind). Upstairs the wards, kept apart: the dogs', the
    // cats' (its cages along one wall so none faces another) and the isolation ward with its own door, gown and hand basin; the grooming
    // room, the hotel, the director's office and the staff room with its restroom. The pet ambulance at the kerb.
    tiles: () => [
      ...patch(
        building(
          [
            [2, 2, 10, 2, 'tile'], [2, 4, 5, 7, 'tile'], [7, 4, 10, 7, 'tile'], [12, 2, 18, 7, 'tile'], [20, 2, 23, 5, 'tile'], [20, 7, 23, 10, 'tile'],
            [2, 9, 18, 13, 'wood'], [20, 12, 21, 13, 'tile'], [23, 12, 23, 13, 'tile'],
          ],
          [[11, 2], [3, 3], [8, 3], [4, 8], [9, 8], [17, 8], [19, 5], [19, 7], [23, 11], [19, 12], [12, 14]],
        ),
        // The 조제실 in the treatment room's corner.
        [[16, 2, 'wall'], [16, 3, 'wall'], [16, 4, 'wall'], [17, 4, 'door'], [18, 4, 'wall']],
      ),
      ...patch(
        upstairs(
          [
            [2, 2, 7, 5, 'tile'], [9, 2, 10, 5, 'tile'], [14, 2, 18, 5, 'tile'], [20, 2, 23, 5, 'tile'], [12, 3, 12, 6, 'tile'], [2, 7, 23, 7, 'tile'],
            [2, 9, 6, 13, 'tile'], [8, 9, 11, 13, 'carpet'], [13, 9, 23, 13, 'wood'],
          ],
          [[5, 6], [10, 6], [16, 6], [21, 6], [4, 8], [10, 8], [15, 8]],
        ),
        // The staff restroom in the staff room's corner.
        [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
      ),
    ],
    restrooms: [[20, 12, 21, 13], [22, 30, 23, 31]],
    windowless: ['vtXrayTable', 'vetSurgeryTable'],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The staff corridor behind the exam rooms.
      o('plant', 2, 2),
      // The dogs' exam room and the cats' own: the table, the computer, the cabinet, the owner's chair.
      o('vetTable', 2, 5, 'right'), o('medStation', 5, 4, 'left'), o('medCabinet', 2, 4, 'right'), o('drWaitSeat', 5, 6, 'left'),
      o('vetTable', 7, 5, 'right'), o('medStation', 10, 4, 'left'), o('medCabinet', 7, 4, 'right'), o('drWaitSeat', 10, 6, 'left'),
      // The treatment room: the stairs up; the cabinets and the oxygen cage; the treatment table, the ultrasound, the drip, the basin.
      o('stairs', 12, 3, 'up'), o('medCabinet', 13, 2), o('vtOxygenCage', 14, 2), o('medCabinet', 15, 2),
      o('vetTable', 13, 5), o('drUltrasound', 16, 5), o('nsIvPole', 15, 7, 'up'), o('nsHandSink', 16, 7, 'up'),
      // The 조제실.
      o('dispensingTable', 17, 2),
      // The X-ray room; the theatre: the table, the anaesthesia machine at its head, the cabinet, the cart, the scrub sink; the autoclave.
      o('vtXrayTable', 21, 2),
      o('vetSurgeryTable', 21, 8), o('drAnesthesiaCart', 23, 8), o('medCabinet', 23, 7, 'left'), o('drScrubSink', 20, 10, 'up'),
      o('vtAutoclave', 23, 13, 'up'),
      // The waiting room. The dogs' side: the benches, the vaccination chart.
      o('drWaitSeat', 2, 10, 'right'), o('drWaitSeat', 2, 11, 'right'), o('drWaitSeat', 2, 12, 'right'), o('drWaitSeat', 5, 13, 'up'), o('drWaitSeat', 6, 13, 'up'),
      o('vtVaccineBoard', 5, 9), o('plant', 2, 13),
      // The front desk and the scale; the diets; the cats' side behind the carrier shelf; the restroom.
      o('drReception', 9, 10), o('vtScale', 8, 10), o('vtFoodShelf', 13, 9),
      o('vtCatShelf', 14, 12, 'right'), o('drWaitSeat', 16, 13, 'up'), o('drWaitSeat', 17, 13, 'up'), o('drWaitSeat', 18, 10, 'left'),
      o('toilet', 21, 12, 'left'), o('sink', 21, 13, 'left'),
      // At the kerb.
      o('vtPetVan', 15, 15),
      // Upstairs. The dogs' ward: six kennels, the basin, the cabinet.
      up('kennel', 2, 2), up('kennel', 3, 2), up('kennel', 4, 2), up('kennel', 5, 2), up('kennel', 6, 2), up('kennel', 7, 2), up('nsHandSink', 2, 5, 'up'), up('medCabinet', 7, 5, 'up'),
      // The cats' ward: four kennels in a row along one wall, none facing another.
      up('kennel', 9, 2, 'right'), up('kennel', 9, 3, 'right'), up('kennel', 9, 4, 'right'), up('kennel', 9, 5, 'right'),
      // The grooming room; the isolation ward, the basin at its door.
      up('vtGroomTub', 14, 2), up('vtGroomTable', 17, 2),
      up('nsHandSink', 20, 5, 'up'), up('vtIsoKennel', 22, 2), up('vtIsoKennel', 23, 2),
      // The hotel; the director's office; the staff room and its restroom.
      up('kennel', 2, 9), up('kennel', 3, 9), up('kennel', 5, 9), up('vtFoodShelf', 2, 13, 'up'),
      up('archiveShelf', 11, 9), up('officeDesk', 9, 11), up('sofa', 10, 13, 'up'), up('plant', 8, 13),
      up('coffeeMaker', 13, 9), up('fridge', 14, 9), up('gjLockers', 19, 9), up('diningTable', 17, 11), up('diningChair', 17, 10), up('diningChair', 18, 10), up('diningChair', 17, 12, 'up'), up('diningChair', 18, 12, 'up'),
      up('sofa', 13, 13, 'up'), up('toilet', 23, 13, 'left'), up('sink', 23, 12, 'left'),
    ],
    coworkers: [
      { name: '송다정 원장', shirt: '#81c784', skin: '#f8d9c0', hair: '#5b3a1e', boss: true },
      { name: '엄지훈', shirt: '#a5d6a7', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '류보라', shirt: '#c5e1a5', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // Dogs and their owners on the dogs' side and in the first exam room; cats, and the small animals that want quiet, on the other
    // (each shown with its animal: 🐶 보호자, 🐱 보호자).
    clients: [
      { noun: '보호자', socials: ['examinePet', 'vaccinatePet', 'adviseOwner'], spots: [[4, 6], [3, 10], [3, 11], [3, 12], [5, 12], [6, 12]], max: 2, every: 50, patience: 150, pets: ['🐶'] },
      { noun: '보호자', socials: ['examinePet', 'vaccinatePet', 'adviseOwner'], spots: [[9, 6], [16, 12], [17, 12], [17, 10]], max: 1, every: 60, patience: 150, pets: ['🐱', '🐰', '🐹', '🦜'] },
    ],
    alarm: { notice: '🚑 교통사고 난 강아지가 실려 왔어요! 처치실을 거쳐 수술실로', done: '🚑 응급 수술이 성공했어요! 성과가 크게 올라요', missed: '⌛ 응급 환자를 다른 수의사가 맡았어요 (성과 감소)', interaction: 'emergencySurgery', every: [200, 360], window: 60, minStage: 1 },
    // The 동물병원 보조 cleans and looks after the animals, no examining or vaccinating; surgery is from
    // the licensed vets of 실무 on, the call too (2026-10-26, at the user's request).
    tasks: [
      gated(task('pets', '반려동물 진찰·접종하기', ['examinePet', 'vaccinatePet'], 3), { minLevel: 1 }, task('clean', '진료대 소독하기', ['disinfectTable'], 2)),
      task('kennel', '입원 동물 돌보기', ['feedAnimals', 'vtBathPet'], 2),
      gated(task('chart', '진료 기록 작성하기', ['writeChart']), { minLevel: 1 }, task('restock', '의료 물품 정리하기', ['restockSupplies', 'vtStockFood'])),
    ],
    // The X-ray table, the scale, the bath and the diet shelf (2026-10-27 workplace pipeline).
    extra: [
      task('advise', '보호자 상담하기', ['adviseOwner']), gated(task('surgery', '응급 수술하기', ['emergencySurgery']), { minStage: 1 }), task('clean', '진료대 소독하기', ['disinfectTable']), boss('원장님께 진료 보고하기'),
      gated(task('xray', '엑스레이 촬영하기', ['vtTakeXray']), { minLevel: 1 }), task('weigh', '내원 동물 체중 재기', ['vtWeighPet'], 2), task('bath', '입원 동물 목욕시키기', ['vtBathPet']), task('stock', '처방 사료·용품 정리하기', ['vtStockFood']),
      // The rooms the hospital was laid out into (2026-11-04, the layout audit): the oxygen cage, the isolation ward, the grooming
      // room, the autoclave; the ultrasound, the drip and the 조제실 for the licensed vets.
      task('oxygen', '산소 입원장 환자 살피기', ['vtCheckOxygen']), task('iso', '보호구 입고 격리 동물 돌보기', ['vtIsoCare', 'nsWashHands']), task('groom', '미용·호텔 동물 미용하기', ['vtGroomPet']), task('sterilize', '수술 기구 멸균하기', ['vtSterilize']),
      gated(task('ultra', '초음파 검사하기', ['drReadUltrasound']), { minLevel: 1 }), gated(task('iv', '입원 동물 수액 걸기', ['nsHangIv']), { minLevel: 1 }), gated(task('dispense', '처방약 조제하기', ['dispenseMeds']), { minLevel: 1 }),
    ],
    work: [
      'examinePet', 'vaccinatePet', 'adviseOwner', 'feedAnimals', 'writeChart', 'reviewLabs', 'disinfectTable', 'emergencySurgery', 'performSurgery', 'prepareMeds', 'restockSupplies', 'vtTakeXray', 'vtWeighPet', 'vtBathPet', 'vtStockFood',
      'vtCheckOxygen', 'vtIsoCare', 'nsWashHands', 'vtGroomPet', 'vtSterilize', 'drReadUltrasound', 'nsHangIv', 'dispenseMeds',
    ],
    skill: 'logic',
    floors: { tile: 'aquaTile', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'mintDots',
  },
  fashionDesigner: {
    careerId: 'fashionDesigner',
    name: '패션 아틀리에',
    icon: '✂️',
    // A designer's atelier on the street (2026-11-05, the layout audit, replacing a building on a lawn entered down a corridor with
    // two chairs and the coffee, a runway standing in the showroom and design, pattern-cutting and sewing all in one room). As a
    // made-to-measure atelier with its own label: the showroom behind the shop window, the mannequins in the glass, the rail of the
    // season's looks, the hanging rails, the fitting corner and the curtained fitting room, the consultation table and a sofa.
    // Behind it the design room (the drawing tables, the mood board, the computers), and the pattern and sample room: the cutting
    // tables, the line of industrial machines, the steam press and the dress forms, the fabric store walled off at its end, the
    // finished samples on their rail. The staff room with the coffee and the restroom off it. A show is staged at its venue; the
    // looks leave from here, checked on the rail in their running order.
    tiles: () =>
      patch(
        building(
          [[2, 2, 8, 7, 'wood'], [10, 2, 23, 7, 'wood'], [2, 9, 13, 13, 'carpet'], [15, 9, 23, 13, 'tile']],
          [[9, 4], [5, 8], [11, 8], [17, 8], [12, 14]],
        ),
        [[20, 2, 'wall'], [20, 3, 'door'], [20, 4, 'wall'], [20, 5, 'wall'], [21, 5, 'wall'], [22, 5, 'wall'], [23, 5, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The design room: the drawing tables, the mood board, the computers.
      o('fdDrawingTable', 2, 2), o('moodBoard', 4, 2), o('designDesk', 7, 2), o('designDesk', 8, 2), o('fdDrawingTable', 3, 5, 'up'), o('bookshelf', 2, 7, 'up'), o('plant', 8, 7),
      // The pattern and sample room: the machines and the press along the back, the cutting tables, the dress forms; the fabric store; the samples' rail.
      o('sewingMachine', 11, 2), o('sewingMachine', 13, 2), o('fdMateMachine', 15, 2), o('fdSteamPress', 18, 2),
      o('fabricTable', 11, 5), o('fabricTable', 14, 5), o('fdDressForm', 17, 5), o('fdDressForm', 19, 5),
      o('fdFabricRack', 21, 2), o('fdFabricRack', 21, 4, 'up'),
      o('wardrobeRack', 21, 6),
      // The showroom: the hanging rail and the season's looks along the back, the fitting corner, the curtained fitting room, the consultation table, the sofa, the mannequins in the window.
      o('wardrobeRack', 2, 9), o('fdShowRail', 6, 9), o('fdFittingCorner', 12, 9), o('fittingRoom', 13, 12, 'left'),
      o('salMeetingTable', 6, 12), o('salMeetingChair', 6, 11), o('salMeetingChair', 8, 11), o('salMeetingChair', 5, 12, 'right'), o('salMeetingChair', 9, 12, 'left'),
      o('sofa', 2, 11, 'right'), o('mannequin', 2, 13, 'right'), o('windowMannequin', 10, 13, 'up'), o('windowMannequin', 11, 13, 'up'), o('plant', 9, 9),
      // The staff room; the restroom.
      o('coffeeMaker', 15, 9), o('fridge', 16, 9), o('sofa', 15, 13, 'up'), o('diningTable', 18, 11), o('diningChair', 18, 12, 'up'), o('diningChair', 19, 12, 'up'), o('plant', 21, 9),
      o('wardrobeRack', 19, 9),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // The street front.
      o('fdShopFront', 1, 15),
    ],
    coworkers: [
      { name: '서은채 디렉터', shirt: '#880e4f', skin: '#f8d9c0', hair: '#1a1a1a', boss: true },
      { name: '나예림', shirt: '#f48fb1', skin: '#eac09a', hair: '#a0522d' },
      { name: '도현수', shirt: '#9575cd', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    clients: [{ noun: '고객', socials: ['takeMeasurements', 'fitClient', 'styleConsult'], spots: [[12, 11], [5, 13], [9, 13]], max: 2, every: 60, patience: 160 }],
    alarm: { notice: '👗 패션쇼장으로 보낼 룩이 곧 출고돼요! 쇼 레일에서 라인업을 점검하세요', done: '👗 룩이 순서대로 완벽하게 쇼장에 갔어요! 성과가 크게 올라요', missed: '⌛ 점검이 늦어 디렉터님이 대신 출고했어요 (성과 감소)', interaction: 'fdShowLineup', every: [200, 320], window: 60 },
    tasks: [task('sew', '옷 바느질하기', ['sewGarment'], 2), task('clients', '고객 치수 재기·가봉하기', ['takeMeasurements', 'fitClient', 'styleConsult', 'fdFitMeasure', 'fdFitPin'], 2), task('design', '디자인 스케치하기', ['designSketch'])],
    // The MD plans and shows the range rather than sewing it (2026-10-26).
    branchTasks: [undefined, [task('mannequin', '매장 마네킹 연출하기', ['dressMannequin'], 2), task('clients', '고객 스타일 상담', ['styleConsult'], 2), task('design', '상품 기획 스케치하기', ['designSketch'])]],
    extra: [task('fabric', '원단 재단하기', ['cutFabric'], 2), task('mannequin', '마네킹 피팅·드레이핑하기', ['dressMannequin', 'fdDrape']), task('finish', '옷 다리고 룩 점검하기', ['fdPress', 'fdIronSeam', 'fdCheckLook']), task('pick', '원단 고르기', ['fdPickFabric']), task('show', '패션쇼 출고 룩 점검하기', ['fdShowLineup']), boss('디렉터님께 컬렉션 보여 드리기')],
    work: ['sewGarment', 'alterGarment', 'cutFabric', 'designSketch', 'dressMannequin', 'fdShowLineup', 'takeMeasurements', 'fitClient', 'styleConsult', 'fdDrape', 'fdPress', 'fdIronSeam', 'fdPickFabric', 'fdFitMeasure', 'fdFitPin', 'fdCheckLook'],
    skill: 'painting',
    floors: { wood: 'oakWood', carpet: 'lilacCarpet', tile: 'creamTile' },
    wall: 'roseStripes',
  },
  photographer: {
    careerId: 'photographer',
    windowless: ['photoBackdrop'],
    name: '사진 스튜디오',
    icon: '📷',
    // A neighbourhood 사진관 in a row of shops (2026-11-05, the layout audit, replacing a building on a lawn with a corridor of a lobby
    // and no counter, a darkroom with the toilet built into it, no changing room and a window in the shooting room). As a real one:
    // behind the glass front, the counter where a sitting is booked and paid for, the sample frames on the wall, the sofa where the
    // shots are picked on the big monitor. Off the lobby the changing and make-up room (the vanity, the curtained changing booths,
    // the rental outfits in their closet) and through it, or from the lobby, the shooting room with no windows, the light under
    // control: the paper sweep, the lights, the sitter's stool, the reflector, the camera, the props, the product table in its
    // corner. The retouching room off the shooting room, the staff's kitchenette and the restroom. The scooter at the kerb for
    // shoots outside.
    tiles: () =>
      building(
        [[2, 2, 13, 8, 'wood'], [15, 2, 23, 5, 'carpet'], [15, 7, 20, 10, 'tile'], [22, 7, 23, 10, 'carpet'], [2, 10, 13, 13, 'tile'], [15, 12, 20, 13, 'wood'], [22, 12, 23, 13, 'tile']],
        [[8, 9], [14, 4], [14, 7], [14, 10], [21, 8], [14, 12], [21, 12], [12, 14]],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The shooting room: the sweep, the lights, the stool, the reflector, the camera; the props; the product table.
      o('photoBackdrop', 6, 2), o('studioLight', 5, 3), o('studioLight', 10, 3), o('phPosingStool', 7, 4), o('phReflector', 9, 5, 'left'), o('studioCamera', 7, 7),
      o('phPropShelf', 2, 4, 'right'), o('phProductTable', 11, 6), o('lamp', 2, 8),
      // The retouching room: the editing stations, the photo printer.
      o('photoEditStation', 16, 2), o('photoEditStation', 18, 2), o('photoEditStation', 20, 2), o('largePrinter', 21, 5, 'up'), o('plant', 23, 2),
      // The changing and make-up room; the closet of rental outfits.
      o('enVanity', 16, 7), o('fittingRoom', 19, 7), o('fittingRoom', 20, 7), o('sofa', 16, 10, 'up'),
      o('wardrobeRack', 23, 7, 'left'), o('wardrobeRack', 23, 9, 'left'),
      // The lobby: the counter, the select monitor and its sofa, the sample frames.
      o('phCounter', 9, 12), o('phSelectMonitor', 5, 10), o('sofa', 5, 12, 'up'), o('phSampleWall', 2, 11, 'right'), o('plant', 13, 13),
      // The kitchenette; the restroom.
      o('coffeeMaker', 16, 12), o('fridge', 17, 12), o('sofa', 19, 13, 'up'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // The street: the glass front; the scooter.
      o('phShopFront', 1, 15), o('pressScooter', 16, 15),
    ],
    coworkers: [
      { name: '백도윤 실장', shirt: '#424242', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '윤슬기', shirt: '#26c6da', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '탁현우', shirt: '#ffa726', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    clients: [{ noun: '촬영 손님', socials: ['portraitShoot', 'directPose'], spots: [[6, 4], [8, 4], [7, 12]], max: 2, every: 60, patience: 160 }],
    alarm: { notice: '📰 현장 촬영 요청이 들어왔어요! 스쿠터를 타고 출발하세요', done: '📸 현장 사진을 잔뜩 찍어 왔어요! 성과가 크게 올라요', missed: '⌛ 촬영 요청을 다른 작가가 가져갔어요 (성과 감소)', interaction: 'coverEvent', every: [200, 320], window: 60 },
    tasks: [task('portraits', '손님 촬영하기', ['portraitShoot', 'directPose'], 2), task('edit', '사진 보정하기', ['editPhotos'], 2), task('products', '제품 사진 찍기', ['shootProducts', 'phStyleProduct'])],
    // The 사진 기자 goes out to the news, no studio customers (2026-10-26).
    branchTasks: [[task('field', '현장 취재 촬영 나가기', ['coverEvent']), task('edit', '보도 사진 고르고 보정하기', ['editPhotos'], 2), task('test', '장비 테스트 촬영하기', ['testShots'])], undefined],
    extra: [task('lights', '조명·반사판 세팅하기', ['setUpLights', 'phAngleReflector']), task('standin', '조명 테스트 대역 앉아 주기', ['phStandIn']), task('field', '현장 촬영 나가기', ['coverEvent']), task('set', '소품 고르고 세트 꾸미기', ['phPickProps', 'arrangeSet'], 2), task('select', '손님과 사진 셀렉하기', ['phShotSelect']), boss('실장님께 포트폴리오 보여 드리기')],
    work: ['portraitShoot', 'directPose', 'editPhotos', 'shootProducts', 'testShots', 'setUpLights', 'arrangeSet', 'coverEvent', 'phStandIn', 'phStyleProduct', 'phAngleReflector', 'phPickProps', 'phShotSelect'],
    skill: 'photography',
    floors: { wood: 'walnutWood', carpet: 'slateStone', tile: 'monoTile' },
    wall: 'lavenderStripes',
  },
  hairStylist: {
    careerId: 'hairStylist',
    name: '헤어 살롱',
    icon: '💇',
    // A 미용실 in a row of shops (2026-11-05, the layout audit, replacing a building on a lawn entered through a corridor of a lobby
    // and one door, a sofa in the middle of the salon floor and the only toilet in the staff room). As a real one, one open room seen
    // whole from the glass door with the 사인볼 turning outside: the waiting sofa and the tea by the window, the product shelves, the
    // reception counter by the door; the styling chairs in two rows, each at its mirror, the trolleys and the perm processors between;
    // behind the first row's mirrors the shampoo basins along the back wall with the towel steamer. Off the floor the 염색 조제실 with
    // the colour bar, the staff room, and the customers' restroom. The snack bar next door.
    tiles: () =>
      shopUnit(
        17,
        2,
        [[2, 3, 13, 11, 'tile'], [2, 12, 13, 13, 'wood'], [15, 3, 16, 5, 'tile'], [15, 7, 16, 10, 'wood'], [15, 12, 16, 13, 'tile']],
        [[14, 4], [14, 9], [14, 13], [12, 14]],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 0, 25, 1, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The shampoo basins and the towel steamer along the back wall.
      o('shampooSink', 2, 3), o('shampooSink', 4, 3), o('shampooSink', 6, 3), o('hsTowelSteamer', 8, 3), o('plant', 13, 3),
      // The styling chairs in two rows at their mirrors, the trolleys and the processors between.
      o('salonStation', 3, 7), o('hsTrolley', 4, 7), o('salonStation', 5, 7), o('salonStation', 7, 7), o('hsProcessor', 8, 7), o('salonStation', 9, 7), o('salonStation', 11, 7), o('hsTrolley', 12, 7),
      o('salonStation', 3, 10), o('hsProcessor', 4, 10), o('salonStation', 5, 10), o('salonStation', 7, 10), o('hsTrolley', 8, 10), o('salonStation', 9, 10), o('salonStation', 11, 10),
      // By the window and the door: the product shelves, the waiting sofa and the tea, the reception counter.
      o('productShelf', 2, 12, 'right'), o('productShelf', 2, 13, 'right'), o('sofa', 4, 13, 'up'), o('hsTeaTable', 6, 13, 'up'), o('diningChair', 7, 13, 'up'),
      o('salonCounter', 13, 11, 'up'), o('plant', 11, 13),
      // The colour room; the staff room; the restroom.
      o('hsColorBar', 15, 3), o('coffeeMaker', 15, 7), o('fridge', 16, 7), o('sofa', 15, 10, 'up'),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The street: the front and the pole; the snack bar next door.
      o('hsShopFront', 1, 15), o('hsNeighbor', 18, 2),
    ],
    coworkers: [
      { name: '채미란 원장', shirt: '#6a1b9a', skin: '#f8d9c0', hair: '#c62828', boss: true },
      { name: '주하나', shirt: '#ec407a', skin: '#eac09a', hair: '#f9a825' },
      { name: '오태민', shirt: '#26a69a', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    clients: [{ noun: '손님', socials: ['cutHair', 'dyeHair', 'styleHair'], spots: [[3, 8], [5, 8], [7, 8], [9, 8], [11, 8], [3, 11], [5, 11], [9, 11], [4, 12], [8, 13]], max: 3, every: 35, patience: 150 }],
    alarm: { notice: '💐 VIP 손님 예약 시간이에요! 스타일링 자리로 가세요', done: '💐 VIP 손님이 아주 만족했어요! 성과가 크게 올라요', missed: '⌛ VIP 손님을 원장님이 대신 맡았어요 (성과 감소)', interaction: 'vipStyling', every: [200, 320], window: 60 },
    // The 샴푸 스태프 shampoos, dries and styles, no cutting yet (2026-10-26, at the user's request).
    tasks: [gated(task('hair', '손님 머리 하기', ['cutHair', 'dyeHair', 'styleHair'], 3), { minLevel: 1 }, task('hair', '샴푸하고 드라이하기', ['shampooHair', 'styleHair'], 2)), task('dye', '염색약 조제하기', ['mixDye']), task('station', '자리 정리하기', ['cleanStation'])],
    extra: [task('vip', 'VIP 손님 스타일링', ['vipStyling']), task('products', '헤어 제품 진열하기', ['restockProducts']), task('book', '예약 관리하기', ['bookAppointments']), task('shampoo', '샴푸·두피 케어하기', ['shampooHair', 'hsScalpCare']), task('perm', '파마 준비하기', ['hsPrepRods', 'hsSetProcessor']), task('tea', '대기 손님께 차 내기', ['hsServeTea']), boss('원장님께 오늘 매출 보고하기')],
    work: ['cutHair', 'dyeHair', 'styleHair', 'mixDye', 'washTowels', 'cleanStation', 'sharpenScissors', 'vipStyling', 'restockProducts', 'bookAppointments', 'shampooHair', 'hsScalpCare', 'hsColorChart', 'hsSetProcessor', 'hsPrepRods', 'hsServeTea'],
    skill: 'charisma',
    floors: { tile: 'creamTile', wood: 'oakWood' },
    wall: 'roseStripes',
  },
  pilot: {
    careerId: 'pilot',
    name: '항공사 운항 센터',
    icon: '✈️',
    // An airline's crew office at its airport (2026-11-04, the layout audit, replacing a briefing room beside two full flight
    // simulators, which stand in their own training centre, with a toy aeroplane on the lawn). A crew reports in through the
    // fit-to-fly and breath check (no one logs on for work without it), plans with dispatch at the counter, briefs at the
    // table under the weather wall, then the whole crew in the joint briefing room; the lounge with the fleet board, the
    // changing room and the restroom. The ramp door opens on the stand: the aircraft's nose at its stop bar, the jet bridge to
    // its front door, the yellow lead-in line and the red line no vehicle crosses while it comes in.
    tiles: () =>
      patch(
        building(
          [[2, 8, 7, 13, 'carpet'], [9, 8, 16, 13, 'carpet'], [18, 8, 23, 10, 'tile'], [18, 12, 20, 13, 'wood'], [22, 12, 23, 13, 'tile']],
          [[8, 10], [17, 9], [17, 12], [21, 12], [16, 7], [12, 14]],
        ),
        Array.from({ length: 26 * 7 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).concat(
          Array.from({ length: 24 }, (_, i): [number, number, 'grass'] => [1 + i, 7, 'wall'] as unknown as [number, number, 'grass']),
          [[16, 7, 'door' as 'grass']],
        ),
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 0, 25, 6, 'concrete']],
    objects: [
      // The stand.
      o('plApronMarks', 12, 0), o('plGateAircraft', 15, 0), o('plJetBridge', 21, 4),
      // The briefing area: dispatch at the counter, the weather wall, the briefing table, the fit-to-fly check by the way in.
      o('opsDesk', 9, 8), o('plWxWall', 12, 8), o('briefingTable', 12, 10), o('plFitKiosk', 9, 13, 'up'),
      // The lounge.
      o('plFleetBoard', 2, 8), o('sofa', 2, 13, 'up'), o('fridge', 6, 13, 'up'), o('coffeeMaker', 7, 13, 'up'), o('salWaterCooler', 7, 8),
      // The joint briefing room, the crew in a row before the board; the changing room; the restroom.
      o('whiteboard', 19, 8), o('salMeetingChair', 18, 10, 'up'), o('salMeetingChair', 19, 10, 'up'), o('salMeetingChair', 20, 10, 'up'), o('salMeetingChair', 21, 10, 'up'), o('salMeetingChair', 22, 10, 'up'),
      o('plCrewRoom', 18, 13, 'up'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
    ],
    coworkers: [
      { name: '홍성철 기장', shirt: '#0d47a1', skin: '#eac09a', hair: '#9e9e9e', boss: true },
      { name: '김하율 부기장', shirt: '#1565c0', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서도아 승무원', shirt: '#c62828', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    alarm: { notice: '✈️ 탑승이 시작됐어요! 탑승구에서 운항을 나가세요', done: '✈️ 무사히 착륙해 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 탑승 마감에 늦어 대체 조종사가 비행했어요 (성과 감소)', interaction: 'flyRoute', every: [240, 360], window: 60, minStage: 1 },
    // Flying the route is from 부기장 (실무) on; the 운항 관리 보조 and the 비행 훈련생 train and plan (2026-10-26).
    tasks: [gated(task('flight', '운항 나가기', ['flyRoute']), { minStage: 1 }, task('check', '비행 전 외부 점검 따라 하기', ['preflightCheck'])), task('briefing', '비행 브리핑하기', ['flightBriefing']), task('plan', '비행 계획서 제출하기', ['fileFlightPlan'])],
    extra: [task('weather', '항로 기상 확인하기', ['plWeatherBrief'], 2), task('suit', '제복·비행 가방 갖추기', ['plSuitUp']), task('fit', '건강·피로·음주 점검하기', ['plFitCheck']), task('check', '비행 전 외부 점검하기', ['preflightCheck']), chat(2), boss('기장님께 운항 보고하기')],
    work: ['flyRoute', 'fileFlightPlan', 'plWeatherBrief', 'flightBriefing', 'preflightCheck', 'plSuitUp', 'plFitCheck'],
    branchLots: {
      // The special flying branch (2026-11-04, at the user's choice: air ambulance, display and test pilots don't report to an airline's
      // crew office): a helicopter base by its pad. The doctor helicopter on the pad, the base's ops room with the weather and the
      // briefing table, the simulator room (a test pilot's work is rehearsed there first), the crew room and the restroom.
      1: {
        careerId: 'pilot',
        name: '헬기·비행시험 기지',
        icon: '🚁',
        tiles: () =>
          patch(
            building(
              [[2, 8, 9, 13, 'tile'], [11, 8, 16, 13, 'tile'], [18, 8, 23, 10, 'carpet'], [18, 12, 20, 13, 'wood'], [22, 12, 23, 13, 'tile']],
              [[10, 10], [17, 9], [17, 12], [21, 12], [5, 7], [12, 14]],
            ),
            Array.from({ length: 26 * 7 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).concat(
              Array.from({ length: 24 }, (_, i): [number, number, 'grass'] => [1 + i, 7, 'wall'] as unknown as [number, number, 'grass']),
              [[5, 7, 'door' as 'grass']],
            ),
          ),
        restrooms: [[22, 12, 23, 13]],
        ground: [[0, 0, 25, 6, 'concrete']],
        objects: [
          o('plHelipad', 1, 0), o('plHelicopter', 2, 2),
          o('opsDesk', 2, 8), o('plWxWall', 6, 8), o('briefingTable', 4, 10),
          o('flightSimulator', 12, 9),
          o('plFitKiosk', 18, 8), o('sofa', 18, 10, 'up'), o('fridge', 23, 9, 'left'), o('coffeeMaker', 23, 8, 'left'),
          o('plCrewRoom', 18, 13, 'up'),
          o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        ],
        coworkers: [
          { name: '강하늘 운항팀장', shirt: '#b71c1c', skin: '#eac09a', hair: '#5b3a1e', boss: true },
          { name: '오아린 조종사', shirt: '#c62828', skin: '#f8d9c0', hair: '#1a1a1a' },
          { name: '박서진 정비사', shirt: '#37474f', skin: '#c99a6e', hair: '#2b1b10' },
        ],
        alarm: { notice: '🚁 응급 환자 이송 요청! 닥터헬기로 출동하세요', done: '🚁 환자를 병원까지 무사히 이송했어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 기지가 이송했어요 (성과 감소)', interaction: 'flyRoute', every: [240, 360], window: 45 },
        tasks: [task('flight', '출동 비행하기', ['flyRoute']), task('check', '비행 전 외부 점검하기', ['preflightCheck']), task('dweller', '시뮬레이터로 비행 절차 연습하기', ['simTraining'])],
        extra: [task('weather', '항로 기상 확인하기', ['plWeatherBrief'], 2), task('plan', '비행 계획서 제출하기', ['fileFlightPlan']), task('drill', '비상 절차 훈련하기', ['emergencyDrill']), task('fit', '건강·피로·음주 점검하기', ['plFitCheck']), task('briefing', '비행 브리핑하기', ['flightBriefing']), boss('운항팀장님께 보고하기')],
        work: ['flyRoute', 'preflightCheck', 'simTraining', 'emergencyDrill', 'plWeatherBrief', 'fileFlightPlan', 'plFitCheck', 'flightBriefing', 'plSuitUp'],
        skill: 'fitness',
        floors: { tile: 'aquaTile', carpet: 'slateStone', wood: 'walnutWood' },
        wall: 'navyWainscot',
      },
    },
    skill: 'logic',
    floors: { carpet: 'slateStone', tile: 'aquaTile', wood: 'walnutWood' },
    wall: 'navyWainscot',
  },
  scientist: {
    careerId: 'scientist',
    name: '과학 연구소',
    icon: '🔬',
    // One lab's part of a floor of a 연구동 in a government-funded institute's campus (2026-11-05, the layout audit, replacing a lone
    // building on a lawn with an 'invention workshop' and an 'experiment control room' that labs don't have, no researchers'
    // office and no instrument room, the gas cylinders on a workshop wall, the coffee and the sofa in the lobby at the lab's door,
    // and the restroom beside it). In from the street the gates and the front desk. On the left the 전실 where the lab is gone
    // into: the lab coats, the goggles and the drench shower's station, the hand basin, the lockers, and the gas cabinet against
    // the lab's wall, piped through it. The lab itself: the fume hoods and the wall benches along the back, two islands of benches,
    // the safety shower. Off the lab the instrument room (the centrifuge and the spectrometer, the microscope, the instrument PC
    // that runs the long experiment, the -80℃ freezer, the prototype bench and the 3D printer); and from it the researchers'
    // office where the papers and the reports are written (the desks in an island, the director's desk, the chalkboard of
    // equations, the papers on the shelf), with its tea corner and the restroom at its end.
    tiles: () =>
      patch(
        building(
          [[2, 2, 12, 8, 'tile'], [14, 2, 23, 5, 'tile'], [16, 7, 23, 13, 'wood'], [2, 10, 7, 13, 'tile'], [9, 10, 14, 13, 'carpet']],
          [[5, 9], [8, 11], [15, 11], [13, 4], [19, 6], [12, 14]],
        ),
        // The restroom at the end of the office.
        [[21, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'wall'], [22, 11, 'door']],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lobby: the gates and the front desk; the institute's sign by the path.
      o('sgSpeedGate', 9, 12), o('sciReception', 13, 12, 'up'), o('plant', 9, 10), o('sciLabSign', 10, 15),
      // The 전실: the gas cabinet against the lab's wall, the lab coats and goggles, the lockers, the hand basin.
      o('fbChemCabinet', 2, 10), o('sciSafetyCorner', 6, 10), o('clsLockers', 2, 13, 'up'), o('nsHandSink', 7, 13, 'up'),
      // The lab: the fume hoods and the wall benches; two islands of benches; the safety shower.
      o('sciFumeHood', 2, 2), o('sciFumeHood', 4, 2), o('chemistryBench', 7, 2), o('chemistryBench', 9, 2), o('plant', 12, 2),
      o('chemistryBench', 3, 5, 'up'), o('chemistryBench', 5, 5, 'up'), o('chemistryBench', 3, 6), o('chemistryBench', 5, 6),
      o('chemistryBench', 8, 5, 'up'), o('chemistryBench', 10, 5, 'up'), o('chemistryBench', 8, 6), o('fbSpillStation', 2, 8, 'up'), o('lamp', 12, 8),
      // The instrument room.
      o('plant', 14, 2), o('sciInstrumentBench', 15, 2), o('fbMicroscope', 17, 2), o('labControl', 19, 2), o('specimenFreezer', 22, 2), o('specimenFreezer', 23, 2),
      o('inventionBench', 20, 5, 'up'), o('sci3dPrinter', 23, 5, 'up'),
      // The researchers' office: the island of desks, the director's desk, the chalkboard, the papers; the tea corner.
      o('bookshelf', 16, 7), o('bookshelf', 17, 7), o('formulaBoard', 20, 7), o('researchDesk', 23, 8, 'left'),
      o('researchDesk', 17, 9, 'up'), o('researchDesk', 18, 9, 'up'), o('researchDesk', 17, 10), o('researchDesk', 18, 10),
      o('coffeeMaker', 16, 13, 'up'), o('sofa', 18, 13, 'up'), o('fridge', 20, 13, 'up'),
      o('toilet', 22, 13, 'up'), o('sink', 23, 13, 'up'),
    ],
    coworkers: [
      { name: '노경수 소장', shirt: '#eceff1', skin: '#eac09a', hair: '#9e9e9e', boss: true },
      { name: '함소희 연구원', shirt: '#b2ebf2', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '변재원 연구원', shirt: '#c5cae9', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    alarm: { notice: '💥 실험 장치에서 이상 신호가 감지됐어요! 제어반으로 가세요', done: '🔬 실험 장치를 안정시켰어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 실험이 망가졌어요 (성과 감소)', interaction: 'stabilizeExperiment', every: [200, 320], window: 60 },
    tasks: [task('experiment', '실험하기', ['runExperiment', 'sciHoodSynthesis'], 2), task('invent', '발명품 만들기', ['buildPrototype']), task('paper', '논문 쓰기', ['writePaper'])],
    // The 이론 물리학자 works on paper, not at the bench (2026-10-26).
    branchTasks: [undefined, [task('formula', '수식 유도하기', ['deriveFormula'], 2), task('paper', '논문 쓰기', ['writePaper'], 2), task('monitor', '실험 데이터 검토하기', ['monitorExperiment'])]],
    branchExtra: [undefined, [task('samples', '시료 분석 결과 검토하기', ['analyzeSamples', 'sciReadSpectrum']), boss('소장님께 연구 결과 보고하기'), chat(2)]],
    extra: [task('samples', '시료 분석하기', ['analyzeSamples', 'sciRunCentrifuge', 'sciReadSpectrum'], 2), task('formula', '수식 유도하기', ['deriveFormula']), task('monitor', '실험 데이터 모니터링', ['monitorExperiment']), boss('소장님께 실험 결과 보고하기')],
    work: ['runExperiment', 'analyzeSamples', 'deriveFormula', 'storeSamples', 'buildPrototype', 'tinkerParts', 'monitorExperiment', 'stabilizeExperiment', 'writePaper', 'sciHoodSynthesis', 'sciRunCentrifuge', 'sciReadSpectrum', 'sciGearUp', 'sciPrintPart'],
    skill: 'logic',
    floors: { tile: 'aquaTile', wood: 'oakWood', carpet: 'sageCarpet' },
    wall: 'aquaTiles',
  },
  actor: {
    careerId: 'actor',
    windowless: ['filmSet'],
    name: '영화 촬영장',
    icon: '🎬',
    // A film studio's sound stage on a shoot day (2026-11-05, the layout audit, replacing a hall on a lawn with windows and an
    // ordinary door, a lobby inside the entrance where the fans sat waiting and an empty yard). A real one is a windowless,
    // soundproofed shed: the set built inside under the lights (the alley, the green cove beside it), the camera before the set and
    // behind it the video village where the director and the script supervisor watch the monitors, the cast chairs, the touch-up
    // chair and the crash mat. The loading door opens wide onto the yard where the lighting and grip truck has backed up and the
    // actors' vans wait; the 밥차 is on the street for lunch. Nobody comes in off the street: the staff door and the security
    // desk, the corridor with the day's call sheet, the dressing room, the costume room and the actors' waiting room (the script
    // table, the coffee, the sofa) off it, the restroom at its end. The fans wait outside the gate, behind the line on the pavement.
    tiles: () =>
      patch(
        building(
          [[2, 2, 13, 9, 'carpet'], [15, 2, 16, 3, 'tile'], [15, 5, 16, 10, 'tile'], [12, 11, 16, 13, 'tile'], [18, 2, 23, 5, 'wood'], [18, 7, 23, 8, 'wood'], [18, 10, 23, 13, 'wood']],
          [[5, 10], [6, 10], [14, 7], [11, 12], [15, 4], [17, 5], [17, 8], [17, 11], [12, 14]],
        ),
        // The yard before the loading door: open ground, not the shed.
        Array.from({ length: 10 * 4 }, (_, i): [number, number, 'grass'] => [1 + (i % 10), 11 + Math.floor(i / 10), 'grass']),
      ),
    restrooms: [[15, 2, 16, 3]],
    ground: [[0, 11, 10, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The stage: the lights, the alley set, the green cove; the touch-up chair and the crash mat to one side; the camera before
      // the set and the video village behind it; the cast chairs.
      o('studioLight', 5, 2), o('filmSet', 6, 2), o('studioLight', 9, 2), o('acGreen', 10, 2), o('studioLight', 13, 5),
      o('acTouchUp', 3, 3), o('stuntMat', 2, 6, 'right'), o('movieCamera', 7, 5), o('acVillage', 6, 8, 'up'), o('acCastChairs', 10, 9, 'up'), o('lamp', 2, 9),
      // The restroom; the corridor's call sheet; the staff door's security desk.
      o('toilet', 15, 2), o('sink', 16, 2),
      o('fmScheduleBoard', 16, 6, 'left'), o('sgVisitorDesk', 13, 11), o('plant', 16, 13),
      // The dressing room's mirrors and its sofa; the costume room; the actors' waiting room.
      o('plant', 18, 2), o('makeupMirror', 19, 2), o('makeupMirror', 21, 2), o('makeupMirror', 23, 2), o('sofa', 21, 5, 'up'),
      o('acCostume', 19, 7), o('wardrobeRack', 22, 7),
      o('coffeeMaker', 20, 10), o('fridge', 21, 10), o('sofa', 23, 10, 'left'), o('scriptTable', 20, 12), o('diningChair', 19, 12, 'right'), o('diningChair', 22, 12, 'left'),
      // The yard: the actors' vans, the grip truck backed up beside the loading door. On the street the 밥차 and, at the gate, the fans' line.
      o('acStarVan', 2, 12, 'left'), o('acGripTruck', 7, 12, 'left'), o('acStarVan', 9, 12, 'left'),
      o('acFoodTruck', 3, 16), o('acFanLine', 14, 15),
    ],
    coworkers: [
      { name: '마준혁 감독', shirt: '#212121', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '설하윤 배우', shirt: '#f06292', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '권태오 배우', shirt: '#4db6ac', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // Outside the gate, behind the line on the pavement.
    clients: [{ noun: '팬', socials: ['signAutograph', 'fanSelfie'], spots: [[14, 16], [15, 16], [16, 16]], max: 2, every: 60, patience: 120 }],
    alarm: { notice: '🎬 촬영 들어갑니다! 세트장으로 가세요', done: '🎬 컷! 한 번에 오케이가 났어요! 성과가 크게 올라요', missed: '⌛ 촬영에 늦어 대역이 대신 섰어요 (성과 감소)', interaction: 'filmScene', every: [180, 300], window: 60 },
    tasks: [task('rehearse', '장면 리허설하기', ['rehearseScene'], 2), task('script', '대본 읽기', ['readScript', 'acWaitLines', 'acTableRead']), task('makeup', '분장·의상 챙기기', ['getMakeup', 'acTouchUpMakeup', 'acCostumeFit'])],
    extra: [task('film', '촬영하기', ['filmScene', 'acWatchTake']), task('stunt', '액션 연습하기', ['practiceStunt', 'acGreenFight']), task('fans', '팬 서비스하기', ['signAutograph', 'fanSelfie'], 2), boss('감독님과 장면 상의하기')],
    work: ['rehearseScene', 'filmScene', 'reviewTakes', 'practiceStunt', 'getMakeup', 'practiceExpressions', 'readScript', 'acTableRead', 'acWatchTake', 'acWaitLines', 'acCostumeFit', 'acTouchUpMakeup', 'acGreenFight', 'signAutograph', 'fanSelfie'],
    skill: 'charisma',
    floors: { wood: 'walnutWood', carpet: 'slateStone', tile: 'monoTile' },
    wall: 'navyWainscot',
  },
  politician: {
    careerId: 'politician',
    name: '시의회',
    icon: '🏛️',
    // A 시의회 청사 (2026-11-05, the layout audit, at the user's word that the office wasn't laid out as one: replacing a lawn with
    // a building of four rooms, a "chamber" of eight dining chairs and a press backdrop in one, a restroom in its corner and a lobby
    // where constituents sat at a counter in a corridor). Downstairs the members' floor, as a council's 의원 사무실 floor is: off the
    // corridor the 의원실, entered through the staff's room (the 보좌진 desks, the district map, the files, a chair for a visitor
    // waiting on the member) into the member's own room behind (the desk under the flags, the shelves, the sofa where guests are
    // met); the small meeting room; the pantry and the restroom. In front, the entrance hall with its desk and the stairs, and the
    // 민원 상담실 beside it where constituents sit across from staff. Upstairs the council's floor: the 본회의장 (the 의장석 on its
    // dais, the 발언대 below it, the members' desks in rows facing it, the 방청석 at the back, entered from the hall behind), the
    // 상임위원회 회의실 with its desks in a U, and the 브리핑룸 where the press is met. The name stone and the flags out front.
    tiles: () => [
      ...building(
        [[2, 2, 7, 6, 'carpet'], [9, 2, 16, 6, 'carpet'], [18, 2, 23, 6, 'wood'], [2, 8, 23, 8, 'tile'], [2, 10, 8, 13, 'tile'], [10, 10, 16, 13, 'tile'], [18, 10, 20, 13, 'tile'], [22, 10, 23, 11, 'tile']],
        [[8, 4], [12, 7], [20, 7], [12, 9], [19, 9], [22, 9], [9, 11], [12, 14]],
      ),
      ...patch(
        upstairs(
          [[2, 2, 14, 10, 'carpet'], [16, 2, 16, 10, 'tile'], [18, 2, 23, 5, 'wood'], [18, 7, 23, 10, 'carpet'], [2, 12, 23, 13, 'tile']],
          [[8, 11], [4, 11], [12, 11], [15, 4], [16, 11], [17, 3], [17, 8]],
        ),
        [],
      ),
    ],
    restrooms: [[22, 10, 23, 11]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The member's own room: the desk under the flags, the shelves, the sofa and armchair where guests are met.
      o('bookshelf', 2, 2), o('bookshelf', 7, 2), o('polMemberDesk', 4, 3), o('sofa', 2, 5, 'right'), o('armchair', 4, 6, 'left'), o('plant', 7, 6),
      // The staff's room: the 보좌진 desks, the district map, the files, the copier, a chair for the visitor waiting on the member.
      o('campaignDesk', 10, 4), o('campaignDesk', 11, 4), o('campaignDesk', 13, 4), o('campaignDesk', 14, 4), o('polDistrictMap', 15, 2), o('whiteboard', 11, 2),
      o('polPetitionCabinet', 9, 6, 'up'), o('copier', 16, 6, 'left'), o('salMeetingChair', 16, 4, 'left'), o('plant', 9, 2),
      // The small meeting room.
      o('salMeetingTable', 19, 4), o('salMeetingChair', 19, 3), o('salMeetingChair', 20, 3), o('salMeetingChair', 21, 3), o('salMeetingChair', 19, 5, 'up'), o('salMeetingChair', 20, 5, 'up'), o('salMeetingChair', 21, 5, 'up'), o('whiteboard', 23, 3, 'left'),
      // The 민원 상담실: staff behind the desk, constituents on the chairs across it, others waiting; the 민원 files.
      o('polPetitionDesk', 5, 11, 'up'), o('diningChair', 5, 12, 'up'), o('diningChair', 6, 12, 'up'), o('polPetitionCabinet', 2, 10), o('drWaitSeat', 2, 13, 'up'), o('drWaitSeat', 3, 13, 'up'), o('plant', 8, 13),
      // The entrance hall: the desk, the stairs up to the council's floor.
      o('sgVisitorDesk', 14, 10), o('stairs', 13, 13, 'left'), o('plant', 16, 10),
      // The pantry; the restroom.
      o('coffeeMaker', 18, 10), o('fridge', 20, 10), o('salWaterCooler', 18, 13, 'right'),
      o('toilet', 23, 11, 'left'), o('sink', 23, 10, 'left'),
      // Out front: the name stone and the flags.
      o('polCouncilSign', 14, 15),
      // Upstairs, the 본회의장: the 의장석 on its dais, the 발언대 below it, the members' desks in rows facing it, the 방청석 behind.
      up('polSpeakerDais', 7, 2), up('speechPodium', 8, 4),
      up('debateTable', 2, 6), up('debateTable', 4, 6), up('debateTable', 10, 6), up('debateTable', 12, 6),
      up('debateTable', 2, 8), up('debateTable', 4, 8), up('debateTable', 10, 8), up('debateTable', 12, 8),
      up('lwGalleryBench', 2, 10, 'up'), up('lwGalleryBench', 5, 10, 'up'), up('lwGalleryBench', 10, 10, 'up'), up('lwGalleryBench', 13, 10, 'up'), up('plant', 14, 2), up('plant', 2, 2),
      // The 상임위원회 회의실: the chair's desk at the head, the members' down either side, the officials' chairs across the foot.
      up('debateTable', 20, 3, 'up'), up('debateTable', 19, 3, 'left'), up('debateTable', 22, 3, 'right'), up('salMeetingChair', 19, 5, 'up'), up('salMeetingChair', 20, 5, 'up'),
      // The 브리핑룸: the backdrop, the podium, the press's chairs.
      up('polPressBackdrop', 19, 7), up('pressPodium', 20, 8), up('diningChair', 19, 10, 'up'), up('diningChair', 20, 10, 'up'), up('diningChair', 21, 10, 'up'), up('diningChair', 22, 10, 'up'),
    ],
    coworkers: [
      { name: '도상훈 의원', shirt: '#1a237e', skin: '#eac09a', hair: '#9e9e9e', boss: true },
      { name: '임채윤 비서관', shirt: '#5c6bc0', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '강도경 보좌관', shirt: '#78909c', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // In the 민원 상담실: across the desk from staff, or waiting their turn.
    clients: [{ noun: '민원인', socials: ['hearComplaint', 'persuadeVoter'], spots: [[5, 13], [6, 13], [3, 12]], max: 2, every: 60, patience: 150 }],
    alarm: { notice: '🎤 기자 회견이 잡혔어요! 2층 브리핑룸 연단으로 가세요', done: '🎤 기자 회견을 멋지게 해냈어요! 성과가 크게 올라요', missed: '⌛ 기자 회견에 늦어 대변인이 대신 나섰어요 (성과 감소)', interaction: 'pressConference', every: [200, 320], window: 60 },
    tasks: [task('calls', '유권자에게 전화하기', ['callVoters'], 2), task('voters', '민원 듣기·지지 호소', ['hearComplaint', 'persuadeVoter', 'polLogComplaint'], 2), task('policy', '정책 문서 작성하기', ['draftPolicy'])],
    // An elected member up to 장관 works on 민원 and policy, an activist on citizens' voices and campaigns;
    // neither rings round voters (2026-10-26).
    branchTasks: [
      [task('voters', '민원 듣기·지지 호소', ['hearComplaint', 'persuadeVoter', 'polLogComplaint'], 2), task('policy', '정책 문서 작성하기', ['draftPolicy']), task('debate', '의정 토론 준비하기', ['debatePractice'])],
      [task('voters', '시민 목소리 듣기', ['hearComplaint', 'polLogComplaint'], 2), task('policy', '정책 제안서 쓰기', ['draftPolicy'], 2), task('speech', '캠페인 연설하기', ['giveSpeech'])],
    ],
    extra: [task('speech', '연설하기', ['giveSpeech']), task('press', '기자 회견하기', ['pressConference']), task('debate', '토론 연습하기', ['debatePractice']), task('district', '지역구 현안·민원 서류 챙기기', ['polDistrictPlan', 'polFilePetitions']), task('sign', '결재 서류 검토하기', ['polReviewDocs']), boss('의원님께 일정 보고하기')],
    work: ['callVoters', 'draftPolicy', 'giveSpeech', 'pressConference', 'debatePractice', 'hearComplaint', 'persuadeVoter', 'polReviewDocs', 'polDistrictPlan', 'polLogComplaint', 'polFilePetitions'],
    skill: 'charisma',
    floors: { carpet: 'lilacCarpet', wood: 'walnutWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  critic: {
    careerId: 'critic',
    windowless: ['photoBackdrop'],
    name: '잡지사 편집국',
    icon: '🍷',
    // A magazine's 편집국 on a floor of an office building (2026-11-05, the layout audit, replacing a lone building on a lawn with a
    // tasting room where a chef served the critics and a wine cellar, a corridor lobby got up as a gallery of plinths and paintings
    // where the interviews were done, the editor-in-chief's desk among the others and the restroom in the tasting room). Critics
    // eat, look and listen out at the restaurants, galleries and halls; at the office they write, plan the issue and shoot. In from
    // the street the floor's lift hall and its restroom; through the glass door the reception, short (its desk, the wall of past
    // covers, this month's issue on its rack), with the meeting room off it where the issue is planned and guests are interviewed
    // across the recorder. On the right the 편집실: the editors' desks pushed together in an island, the flat plan of the next issue
    // on the wall, the light table where the shoot's pictures are picked, the planning board, and the editor-in-chief's glass room
    // in its corner; the pantry behind it. On the left, down a short corridor, the small windowless studio (the backdrop, a plinth
    // for the work lent for its shoot, the lights), a food magazine's test kitchen (the counter, the stove, the table where the
    // dishes are tasted, the wine) and the 자료실 of back issues.
    tiles: () =>
      patch(
        building(
          [[2, 2, 5, 5, 'wood'], [2, 7, 5, 9, 'tile'], [7, 2, 7, 9, 'tile'], [9, 2, 14, 5, 'carpet'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'carpet'], [2, 11, 7, 13, 'carpet'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'wood']],
          [[6, 3], [6, 8], [8, 8], [7, 10], [9, 6], [15, 8], [10, 10], [20, 10], [14, 12], [12, 14]],
        ),
        [[20, 2, 'wall'], [20, 3, 'door'], [20, 4, 'wall'], [20, 5, 'wall'], [21, 5, 'wall'], [22, 5, 'wall'], [23, 5, 'wall']],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The reception: the desk, the wall of past covers, this month's rack.
      o('lobbyDesk', 10, 7), o('critCoverWall', 13, 7), o('critMagazineRack', 14, 9, 'left'),
      // The meeting room: the planning table; the interview chairs either side of the recorder.
      o('salMeetingTable', 11, 3), o('salMeetingChair', 11, 2), o('salMeetingChair', 12, 2), o('salMeetingChair', 10, 3, 'right'), o('plant', 14, 5),
      o('critInterviewChair', 11, 5, 'right'), o('critRecorderTable', 12, 5), o('critInterviewChair', 13, 5, 'left'),
      // The 편집실: the flat plan, the island of editors' desks, the light table, the planning board, the copier.
      o('critProofBoard', 16, 2),
      o('editorDesk', 17, 4, 'up'), o('editorDesk', 18, 4, 'up'), o('editorDesk', 19, 4, 'up'), o('editorDesk', 17, 5), o('editorDesk', 18, 5), o('editorDesk', 19, 5),
      o('critLightTable', 21, 7), o('whiteboard', 18, 9, 'up'), o('copier', 16, 9, 'up'), o('bookshelf', 23, 9, 'up'), o('plant', 23, 6),
      // The editor-in-chief's glass room.
      o('officeDesk', 22, 2), o('bookshelf', 23, 2), o('armchair', 23, 4, 'left'), o('plant', 21, 4),
      // The pantry.
      o('coffeeMaker', 18, 11), o('salWaterCooler', 19, 11), o('fridge', 18, 13, 'up'), o('diningTable', 21, 12), o('diningChair', 21, 13, 'up'), o('diningChair', 22, 13, 'up'),
      // The studio: the backdrop, the plinth for the work being shot, the lights.
      o('photoBackdrop', 2, 2), o('studioLight', 5, 2), o('artPedestal', 3, 4), o('studioLight', 2, 5, 'up'),
      // The test kitchen: the fridge, the counter, the stove; the tasting table, the wine and the decanting trolley.
      o('fridge', 2, 7), o('prepCounter', 3, 7), o('stove', 5, 7),
      o('wineRack', 2, 9, 'up'), o('tastingTable', 3, 9, 'up'), o('critWineTrolley', 5, 9, 'up'),
      // The 자료실: the back issues.
      o('archiveShelf', 2, 11), o('archiveShelf', 3, 11), o('archiveShelf', 5, 11), o('archiveShelf', 6, 11),
      o('archiveShelf', 2, 13, 'up'), o('archiveShelf', 3, 13, 'up'), o('archiveShelf', 4, 13, 'up'), o('bookshelf', 6, 13, 'up'), o('plant', 7, 13),
    ],
    coworkers: [
      { name: '여민서 편집장', shirt: '#4a148c', skin: '#f8d9c0', hair: '#1a1a1a', boss: true },
      { name: '공태식 기자', shirt: '#8d6e63', skin: '#eac09a', hair: '#2b1b10' },
      { name: '모아라 기자', shirt: '#ffb74d', skin: '#c99a6e', hair: '#a0522d' },
    ],
    // Interviewed in the meeting room, across the recorder.
    clients: [{ noun: '인터뷰 손님', socials: ['interviewChef', 'interviewArtist'], spots: [[11, 4], [13, 4]], max: 1, every: 90, patience: 150 }],
    alarm: { notice: '⏰ 원고 마감이 다가와요! 편집 데스크에서 원고를 넘기세요', done: '📰 마감 직전에 원고를 넘겼어요! 성과가 크게 올라요', missed: '⌛ 마감을 놓쳐 원고가 다음 호로 밀렸어요 (성과 감소)', interaction: 'fileReview', every: [200, 320], window: 60 },
    tasks: [task('review', '리뷰 쓰기', ['writeReview'], 2), task('taste', '시식·작품 감정하기', ['tasteCourse', 'appraiseArt'], 2), task('interview', '인터뷰하기', ['interviewChef', 'interviewArtist'])],
    extra: [task('deadline', '마감 원고 넘기기', ['fileReview']), task('wine', '와인 테이스팅·디캔팅', ['rateWine', 'critDecantWine']), task('layout', '다음 호 지면·화보 고르기', ['critLayoutPages', 'critPickPhotos']), task('archive', '지난 호·경쟁지 살펴보기', ['readArchive', 'critBrowseIssues']), boss('편집장님께 원고 검토받기')],
    work: ['writeReview', 'researchTrends', 'fileReview', 'tasteCourse', 'rateWine', 'appraiseArt', 'readArchive', 'critLayoutPages', 'critPickPhotos', 'critDecantWine', 'critBrowseIssues', 'interviewChef', 'interviewArtist'],
    skill: 'writing',
    floors: { carpet: 'sageCarpet', wood: 'oakWood', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  socialMedia: {
    careerId: 'socialMedia',
    windowless: ['streamingSetup', 'smShortsSet'],
    name: '크리에이터 스튜디오',
    icon: '📱',
    // A creators' company (an MCN's studio floor) in an office building (2026-11-05, the layout audit, replacing a lone building on a
    // lawn with windows in the live room and the shooting room, the restroom in the corner of the live room, the sponsors' gifts on a
    // shelf there, and the unboxing filmed in a corridor lobby where the advertisers waited on kitchen chairs). In from the street
    // the floor's lift hall and its restroom; through the glass door a short entrance with its desk, the meeting room off it where
    // an advertiser's campaign is pitched and the deal talked over in front of the screen. On the right the office where the content
    // is planned and cut: the planners' desks pushed together under the trend board and the live reaction monitor, the editing
    // stations along the wall, the 팀장's desk facing them, the coffee; the live room behind it, windowless and soundproofed, two
    // streaming desks. On the left the shooting studio, windowless too: the photo wall, the short-form set between the lights, the
    // unboxing table, a sofa for talk content; and off it the store of props and the sponsors' products waiting to be shot.
    tiles: () =>
      building(
        [[2, 2, 7, 9, 'wood'], [9, 2, 14, 5, 'carpet'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'carpet'], [2, 11, 7, 13, 'tile'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'carpet']],
        [[8, 8], [5, 10], [11, 6], [15, 8], [10, 10], [20, 10], [14, 12], [12, 14]],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The entrance: its desk.
      o('officeDesk', 12, 8, 'up'), o('plant', 14, 9), o('plant', 9, 7),
      // The meeting room: the table, the chairs, the screen the campaign is shown on.
      o('salMeetingTable', 11, 3), o('salMeetingChair', 11, 2), o('salMeetingChair', 12, 2), o('salMeetingChair', 10, 3, 'right'), o('projector', 14, 5, 'left'),
      // The office: the trend board and the reaction monitor, the island of planners' desks, the editing stations, the 팀장's desk.
      o('trendBoard', 16, 2), o('smReactionWall', 19, 2), o('plant', 23, 2),
      o('contentDesk', 17, 4, 'up'), o('contentDesk', 18, 4, 'up'), o('contentDesk', 19, 4, 'up'), o('contentDesk', 17, 5), o('contentDesk', 18, 5), o('contentDesk', 19, 5),
      o('videoEditStation', 23, 4, 'left'), o('videoEditStation', 23, 5, 'left'), o('contentDesk', 18, 7),
      o('coffeeMaker', 16, 9, 'up'), o('salWaterCooler', 17, 9, 'up'), o('plant', 23, 9),
      // The live room: two streaming desks.
      o('streamingSetup', 18, 11), o('streamingSetup', 22, 11), o('studioLight', 23, 13, 'up'), o('lamp', 18, 13),
      // The shooting studio: the photo wall, the short-form set between the lights, the unboxing table, the sofa.
      o('selfieWall', 2, 2), o('studioLight', 4, 2), o('smShortsSet', 5, 2), o('studioLight', 7, 2),
      o('smUnboxTable', 3, 6), o('studioLight', 6, 6), o('sofa', 2, 9, 'up'),
      // The store: the sponsors' products and the props.
      o('smPrShelf', 2, 11), o('smPrShelf', 2, 13, 'up'), o('smPrShelf', 5, 13, 'up'),
    ],
    coworkers: [
      { name: '진다솜 팀장', shirt: '#ff4081', skin: '#f8d9c0', hair: '#7b1fa2', boss: true },
      { name: '허윤재', shirt: '#00e5ff', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '조아린', shirt: '#ffd740', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // At the meeting room's table.
    clients: [{ noun: '광고주', socials: ['pitchCampaign', 'negotiateDeal'], spots: [[10, 2], [13, 2]], max: 1, every: 90, patience: 150 }],
    alarm: { notice: '🔥 게시물이 화제가 됐어요! 방송 장비로 라이브를 켜세요', done: '📈 라이브 시청자가 폭발했어요! 성과가 크게 올라요', missed: '⌛ 화제가 식기 전에 라이브를 못 켰어요 (성과 감소)', interaction: 'trendingLive', every: [180, 300], window: 45 },
    tasks: [task('content', '콘텐츠 기획하기', ['planContent'], 2), task('stream', '라이브 방송하기', ['liveStream']), task('edit', '영상 편집하기', ['editVideo'])],
    extra: [
      task('comments', '댓글·반응 관리하기', ['replyComments', 'smCheckReaction'], 2), task('shorts', '숏폼·셀카 콘텐츠 찍기', ['selfieShoot', 'smShootChallenge', 'smShootInfo']),
      task('unbox', '협찬 제품 언박싱 찍기', ['smUnboxing']), task('ads', '광고주 응대하기', ['pitchCampaign', 'negotiateDeal']), boss('팀장님께 조회수 보고하기'),
    ],
    work: ['planContent', 'replyComments', 'editVideo', 'liveStream', 'trendingLive', 'selfieShoot', 'analyzeMetrics', 'pitchCampaign', 'negotiateDeal', 'smShootChallenge', 'smShootInfo', 'smUnboxing', 'smCheckReaction'],
    skill: 'charisma',
    floors: { carpet: 'lilacCarpet', wood: 'walnutWood', tile: 'monoTile' },
    wall: 'lavenderStripes',
  },
  military: {
    careerId: 'military',
    name: '군 기지',
    icon: '🎖️',
    // A company's corner of a battalion's post (2026-11-05, the layout audit, replacing a 10 m range along the back fence that fired
    // towards the yard and the block, a mess of a home fridge, a coffee maker and one table, no 행정반 or 무기고, rifles cleaned in the
    // maintenance room, three beds scattered round a room with the toilet in its corner, and the truck in the middle of the yard). In at
    // the gate past the guard post, which faces the gate lane; the motor pool's concrete beside it, the truck in its bay, the tool racks
    // and the march's staging point. The parade square round the flag, the assault course and the bar at its foot. The range is pushed
    // to the west fence, firing north into its berm with earth walls down its sides, the flag that goes up while it's in use and its
    // warning; its ten tiles stand for the 25 m of a zeroing range, as its board says. The company's barracks on two floors: downstairs
    // the 행정반 (the duty desk, the map table, the radio, the files), the 무기고 with its own door, the rifles locked in their racks and
    // the ledger, the cleaning bench outside it, and the shared washroom (the showers, the toilet); upstairs the 생활관, eight beds in a
    // row along the wall with a 관물대 at each foot, and the 휴게실 (the TV, the books). The mess is the battalion's, not on the lot.
    tiles: () => [
      ...patch(building([[16, 2, 23, 6, 'wood'], [16, 8, 23, 8, 'tile'], [16, 10, 17, 13, 'tile'], [19, 10, 23, 13, 'tile']], [[15, 8], [18, 7], [15, 11], [19, 9]]), [
        // The yard, west of the barracks.
        ...Array.from({ length: 14 * 14 }, (_, i): [number, number, 'grass'] => [1 + (i % 14), 1 + Math.floor(i / 14), 'grass']),
        // The toilet off the washroom, its door in its own wall.
        [21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 13, 'wall'], [21, 12, 'door'],
      ]),
      ...patch(
        upstairs([[16, 2, 23, 6, 'wood'], [16, 8, 23, 9, 'tile'], [16, 11, 23, 13, 'carpet']], [[19, 7], [18, 10]]),
        Array.from({ length: 15 * 15 }, (_, i): [number, number, 'void'] => [i % 15, Math.floor(i / 15), 'void']),
      ),
    ],
    restrooms: [[22, 12, 23, 13]],
    objects: [
      o('miBaseGround', 0, 0),
      // The range at the west fence, firing north; the parade square, the flag, the assault course, the bar.
      o('miFiringRange', 0, 1), o('flagPole', 6, 2), o('obstacleCourse', 3, 10), o('pullUpBar', 9, 10),
      // The motor pool by the gate: the truck in its bay, the tool racks, the march's staging point; the guard post facing the gate lane.
      o('armyTruck', 4, 13), o('gearRack', 2, 12, 'right'), o('gearRack', 2, 13, 'right'), o('miMarchRoute', 7, 14), o('miGuardPost', 13, 13, 'left'),
      // The cleaning bench outside the 무기고's door.
      o('miMaintBench', 13, 9, 'right'),
      // The 행정반: the duty desks, the radio, the files, the map table.
      o('officeDesk', 17, 2), o('officeDesk', 19, 2), o('radioStation', 21, 2), o('archiveShelf', 23, 2), o('mapTable', 20, 4), o('plant', 16, 6), o('plant', 23, 6),
      // The 무기고: the locked racks, a gear rack.
      o('miArmsRack', 17, 10, 'left'), o('miArmsRack', 17, 12, 'left'), o('gearRack', 16, 13, 'up'),
      // The washroom: the showers, the toilet.
      o('shower', 23, 10, 'left'), o('shower', 20, 13, 'up'), o('shower', 19, 13, 'up'), o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
      o('stairs', 20, 8, 'left'),
      // Upstairs. The 생활관: eight beds along the wall, the 관물대s across the aisle.
      ...[16, 17, 18, 19, 20, 21, 22, 23].map((x) => up('bed', x, 2)),
      ...[16, 17, 18, 20, 21, 22, 23].map((x) => up('miBunkLocker', x, 6, 'up')),
      // The 휴게실.
      up('bookshelf', 16, 11), up('bookshelf', 17, 11), up('tv', 20, 11), up('sofa', 20, 13, 'up'), up('armchair', 22, 13, 'up'), up('plant', 23, 13), up('plant', 16, 9),
    ],
    coworkers: [
      { name: '석강철 중대장', shirt: '#33691e', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '편지호 병장', shirt: '#558b2f', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '태하람 상병', shirt: '#689f38', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    alarm: { notice: '🚁 긴급 작전 명령! 군용 트럭으로 출동하세요', done: '🎖️ 작전을 완수하고 귀환했어요! 성과가 크게 올라요', missed: '⌛ 집결이 늦어 다른 부대가 출동했어요 (성과 감소)', interaction: 'deployMission', every: [200, 320], window: 45 },
    tasks: [task('course', '장애물 코스 달리기', ['runObstacles'], 2), task('gear', '장비 정비하기', ['maintainGear']), task('drill', '제식 훈련하기', ['drillMarch'])],
    extra: [task('plan', '작전 계획 세우기', ['planMission']), task('radio', '무전 교신하기', ['radioComms'], 2), task('mission', '작전 출동하기', ['deployMission']), task('zero', '영점 사격 조정하기', ['miZeroRifle']), task('handover', '초소 근무 교대하기', ['miPostHandover']), task('ruckCheck', '군장 결속 점검하기', ['miCheckRuck']), task('cleanRifle', '총기 수입하기', ['miCleanRifle']), boss('중대장님께 보고하기')],
    work: ['runObstacles', 'doPullUps', 'drillMarch', 'maintainGear', 'planMission', 'radioComms', 'deployMission', 'miZeroRifle', 'miPostHandover', 'miCheckRuck', 'miCleanRifle'],
    skill: 'fitness',
    floors: { tile: 'slateStone', wood: 'walnutWood', carpet: 'sageCarpet' },
    wall: 'oakWainscot',
  },
  gardener: {
    careerId: 'gardener',
    name: '식물원 온실',
    icon: '🌷',
    // A 식물원 as Korea's are (2026-11-05, the layout audit, replacing a walled room called a greenhouse with a koi pond inside
    // it, a lawn round it, the flower shop behind the greenhouse and the restroom in the potting shed): mostly garden, with the
    // glasshouse in it. In from the road through the entrance pavilion, the ticket and information desk, the gift stand and the
    // flower counter, the visitors' restroom; out of its side door into the garden. The beds along the front walk, the koi pond
    // and its benches under the trees in the middle, and at the back the display glasshouse, glass all round, the tropical beds
    // and the rare-plant cases inside it with the misting posts and the climate panel by the door. Behind the pavilion, out of
    // the visitors' way, the gardeners' side: the potting shed (the bench, the tap, the tools), the propagation glasshouse where
    // the seed trays sprout, and the staff room off the shed.
    tiles: () =>
      patch(
        building(
          [[12, 11, 19, 13, 'tile'], [21, 11, 23, 13, 'wood'], [20, 6, 23, 9, 'wood']],
          [[12, 14], [11, 12], [22, 10], [19, 7], [23, 5]],
        ),
        [
          ...Array.from({ length: 10 * 14 }, (_, i): [number, number, 'grass'] => [1 + (i % 10), 1 + Math.floor(i / 10), 'grass']),
          ...Array.from({ length: 8 * 9 }, (_, i): [number, number, 'grass'] => [11 + (i % 8), 1 + Math.floor(i / 8), 'grass']),
          ...Array.from({ length: 6 * 4 }, (_, i): [number, number, 'grass'] => [19 + (i % 6), 1 + Math.floor(i / 6), 'grass']),
          // The visitors' restroom in the pavilion's corner.
          [17, 12, 'wall'], [17, 13, 'door'], [18, 11, 'wall'], [19, 11, 'wall'],
        ],
      ),
    restrooms: [[18, 12, 19, 13]],
    ground: [[1, 1, 10, 7, 'slateStone'], [0, 8, 18, 8, 'slateStone'], [0, 11, 10, 12, 'slateStone'], [12, 1, 13, 9, 'slateStone'], [19, 1, 24, 4, 'soil'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The display glasshouse: the beds along the back, the rare-plant cases on the island, the misting posts, the side beds,
      // the climate panel by the door, the label sign, a palm.
      o('ghGlassHouse', 1, 1),
      o('gardenBed', 2, 1), o('gardenBed', 5, 1), o('gardenBed', 8, 1), o('tree', 10, 1),
      o('ghMistPost', 2, 4), o('ghMistPost', 9, 4), o('rarePlantCase', 5, 4), o('rarePlantCase', 6, 4),
      o('gardenBed', 1, 6, 'up'), o('gardenBed', 7, 6, 'up'), o('greenhouseControl', 10, 6, 'left'), o('ghLabelSign', 4, 6, 'up'),
      // The garden: the koi pond under the trees with its benches, the beds along the front walk, shrubs.
      o('ghKoiPond', 15, 3), o('ghBenchSofa', 15, 6, 'up'), o('ghBenchSofa', 17, 3, 'left'), o('tree', 11, 1), o('tree', 18, 0), o('tree', 14, 1), o('bush', 17, 7), o('bush', 11, 7),
      o('gardenBed', 1, 9), o('gardenBed', 5, 9), o('gardenBed', 8, 9), o('tree', 0, 9),
      o('gardenBed', 1, 13, 'up'), o('gardenBed', 4, 13, 'up'), o('gardenBed', 7, 13, 'up'), o('bush', 10, 13), o('bush', 0, 13), o('gardenBed', 15, 8), o('tree', 18, 5),
      // The hedge along the road: the garden is entered through the pavilion.
      ...Array.from({ length: 11 }, (_, i) => o('bush', i, 14)),
      // The entrance pavilion: the ticket and information desk, the gift stand, the flower counter; the restroom.
      o('fgDesk', 12, 11), o('ghGiftStand', 14, 11), o('flowerTable', 14, 13, 'up'),
      o('toilet', 19, 13, 'left'), o('sink', 19, 12, 'left'),
      // The gardeners' side: the propagation house (the shelf under its lights, the seed benches); the potting shed (the bench,
      // the tap, the tools, the barrow); the staff room.
      o('ghGrowHouse', 19, 1), o('ghPropagationShelf', 20, 1), o('seedlingNursery', 22, 1), o('ghMistPost', 20, 3),
      o('pottingBench', 20, 6), o('wheelbarrow', 22, 6), o('ghWaterTap', 21, 9, 'up'), o('toolWall', 23, 8, 'left'),
      o('coffeeMaker', 21, 11), o('fridge', 23, 11), o('sofa', 21, 13, 'up'),
    ],
    coworkers: [
      { name: '나혜원 원장', shirt: '#2e7d32', skin: '#f8d9c0', hair: '#5b3a1e', boss: true },
      { name: '송이삭', shirt: '#9ccc65', skin: '#eac09a', hair: '#a0522d' },
      { name: '배꽃님', shirt: '#f48fb1', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // In the glasshouse, by the koi pond, on the front walk, at the flower counter.
    clients: [{ noun: '방문객', socials: ['giveTour', 'recommendFlowers'], spots: [[3, 5], [7, 5], [16, 5], [2, 10], [6, 12], [13, 12]], max: 2, every: 50, patience: 150 }],
    alarm: { notice: '🌧️ 폭우 경보! 온실 제어반에서 대비하세요', done: '🌱 폭우에도 식물들이 무사해요! 성과가 크게 올라요', missed: '⌛ 대비가 늦어 화단 일부가 망가졌어요 (성과 감소)', interaction: 'stormPrep', every: [200, 320], window: 60 },
    tasks: [task('beds', '화단 가꾸기', ['tendBeds'], 2), task('repot', '분갈이하기', ['repotPlants']), task('visitors', '방문객 응대하기', ['giveTour', 'recommendFlowers'], 2)],
    // The florist arranges and wraps flowers rather than tending beds (2026-10-26).
    branchTasks: [undefined, [task('arrange', '꽃꽂이하기', ['arrangeFlowers'], 2), task('bouquet', '꽃다발 포장하기', ['wrapBouquet']), task('visitors', '손님께 꽃 추천하기', ['giveTour', 'recommendFlowers'], 2)]],
    branchExtra: [undefined, [task('repot', '분갈이하기', ['repotPlants']), boss('대표님께 오늘 주문 보고하기'), task('graft', '접목하기', ['graftPlants'])]],
    extra: [task('arrange', '꽃꽂이하기', ['arrangeFlowers']), task('prune', '가지치기', ['pruneShrubs'], 2), task('graft', '접목하기', ['graftPlants']), task('sow', '씨앗 파종하기', ['ghSowSeeds']), task('water', '행잉 바스켓·물뿌리개 챙기기', ['ghWaterBaskets', 'ghFillCans'], 2), task('koi', '연못 잉어 돌보기', ['ghFeedKoi']), task('gift', '기념품 화분 진열하기', ['ghStockGifts']), boss('원장님께 식물 상태 보고하기')],
    work: ['tendBeds', 'pruneShrubs', 'studySpecimens', 'adjustClimate', 'stormPrep', 'arrangeFlowers', 'wrapBouquet', 'repotPlants', 'graftPlants', 'giveTour', 'recommendFlowers', 'ghSowSeeds', 'ghWaterBaskets', 'ghFeedKoi', 'ghFillCans', 'ghStockGifts', 'plantSeedlings', 'organizeTools'],
    skill: 'gardening',
    floors: { tile: 'creamTile', wood: 'oakWood' },
    wall: 'oakWainscot',
  },
  engineer: {
    careerId: 'engineer',
    name: '엔지니어링 연구소',
    icon: '⚙️',
    // A manufacturer's 기업부설연구소 (2026-11-05, the layout audit, replacing a lone building on a lawn with the CAD desks among the
    // soldering benches and the robot cell, an EMC chamber the size of a cupboard among three server racks, a production line's
    // control panel in the staff room, and a lobby of two kitchen chairs). In from the street the lobby: the speed gates and the
    // front desk where a supplier's engineer gets a pass and is taken to the meeting room (the prototype review table, the
    // screen, the whiteboard); the small pantry and the restroom off it on the staff's side. Beyond the gates the design office,
    // its own room for the quiet, the dust and the static (the CAD desks in an island, the leader's desks, the block diagram and
    // the whiteboard), and the lab (the parts kanban, the soldering and the scope benches, the robot benches, the durability rig,
    // the caged robot cell, the prototyping corner), and off the lab the EMC chamber, a shielded room lined with absorbers, and a
    // small server room of two racks for the firmware builds and the model training.
    tiles: () =>
      patch(
        building(
          [[2, 2, 9, 8, 'carpet'], [11, 2, 19, 8, 'tile'], [21, 2, 23, 5, 'tile'], [21, 7, 23, 8, 'tile'], [2, 10, 7, 13, 'tile'], [9, 10, 16, 13, 'tile'], [18, 10, 23, 13, 'wood']],
          [[9, 9], [13, 9], [20, 4], [20, 8], [8, 11], [17, 11], [12, 14]],
        ),
        // The restroom in the pantry's corner.
        [[3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall'], [2, 11, 'door']],
      ),
    restrooms: [[2, 12, 3, 13]],
    windowless: ['engEmcChamber', 'serverRack'],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lobby: the gates, the front desk; the lab's name by the path.
      o('sgSpeedGate', 9, 12), o('sgSpeedGate', 13, 12), o('engReception', 15, 12, 'up'), o('plant', 16, 10), o('engLabSign', 10, 15),
      // The pantry and the restroom.
      o('fridge', 5, 10), o('salWaterCooler', 6, 10), o('coffeeMaker', 7, 10), o('sofa', 5, 13, 'up'), o('plant', 7, 13),
      o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'),
      // The design office: the block diagram, the whiteboard, the CAD island, the leader's desks.
      o('engBlockBoard', 3, 2), o('whiteboard', 6, 2), o('plant', 9, 2), o('plant', 2, 8),
      o('cadStation', 3, 5, 'up'), o('cadStation', 4, 5, 'up'), o('cadStation', 5, 5, 'up'), o('cadStation', 3, 6), o('cadStation', 4, 6), o('cadStation', 5, 6),
      o('cadStation', 8, 5, 'left'), o('cadStation', 8, 6, 'left'),
      // The lab: the kanban, the soldering and scope benches, the durability rig along the back; the robot benches; the robot cell; the prototyping corner.
      o('engKanbanRack', 11, 2), o('circuitStation', 13, 2), o('engScopeBench', 14, 2), o('circuitStation', 15, 2), o('testRig', 17, 2), o('plant', 19, 2),
      o('robotBench', 12, 5, 'up'), o('robotBench', 15, 5, 'up'), o('engRobotCell', 18, 5), o('engFabCorner', 11, 8, 'up'), o('lamp', 16, 8),
      // The EMC chamber: the chamber's table, antenna and analyser in the absorber-lined room.
      o('engEmcChamber', 21, 2), o('engAbsorberWall', 23, 5),
      // The server room.
      o('serverRack', 22, 7), o('serverRack', 23, 7),
      // The meeting room: the review table, the screen, the whiteboard.
      o('salMeetingTable', 19, 12), o('salMeetingChair', 19, 11), o('salMeetingChair', 20, 11), o('salMeetingChair', 21, 11),
      o('salMeetingChair', 18, 12, 'right'), o('whiteboard', 23, 10, 'left'), o('projector', 23, 13, 'left'),
    ],
    coworkers: [
      { name: '모태성 팀장', shirt: '#455a64', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '은서준', shirt: '#ff7043', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '육다인', shirt: '#5c6bc0', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // In the meeting room, at the table.
    clients: [{ noun: '협력 업체 담당자', socials: ['reviewSpecs'], spots: [[18, 13], [20, 10]], max: 1, every: 100, patience: 150 }],
    alarm: { notice: '📡 인증 시험소에서 시제품이 전자파 기준을 넘었대요! EMC 챔버로 가서 원인을 찾으세요', done: '📡 노이즈 원인을 찾아 대책을 세웠어요! 성과가 크게 올라요', missed: '⌛ 대책이 늦어 인증 일정이 밀렸어요 (성과 감소)', interaction: 'engEmcFix', every: [200, 320], window: 60 },
    tasks: [task('robot', '로봇 조립하기', ['assembleRobot'], 2), task('firmware', '펌웨어 디버깅하기', ['debugFirmware']), task('test', '내구성 시험하기', ['stressTest'])],
    extra: [task('circuit', '회로 납땜하기', ['solderCircuit'], 2), task('cad', '3D 설계하기', ['renderDesign']), task('specs', '협력 업체와 사양 협의', ['reviewSpecs']), task('measure', '신호 측정·EMC 시험', ['engProbeSignal', 'engEmcTest']), task('teach', '로봇 티칭하기', ['engTeachRobot']), task('proto', '시제품 출력하기', ['engPrintPrototype']), task('diagram', '블록도 정리하기', ['engBlockDiagram']), task('parts', '칸반 부품 챙기기', ['engPickParts']), boss('팀장님께 개발 일정 보고하기')],
    work: ['assembleRobot', 'calibrateSensors', 'solderCircuit', 'stressTest', 'renderDesign', 'debugFirmware', 'engEmcFix', 'reviewSpecs', 'engProbeSignal', 'engTeachRobot', 'engPrintPrototype', 'engPickParts', 'engBlockDiagram', 'engEmcTest'],
    skill: 'logic',
    floors: { tile: 'slateStone', carpet: 'slateStone' },
    wall: 'navyWainscot',
  },
  conservationist: {
    careerId: 'conservationist',
    name: '생태 연구 센터',
    icon: '🌿',
    // A 생태 연구 센터 as the councils' and the national institutes' are (2026-11-05, the layout audit, replacing one building on a
    // lawn with the seedling benches indoors, a corridor of a lobby with three chairs, the restroom in the specimen room and the
    // recycling in the staff room). The field is half the work, so half the lot is outside: the wetland behind the field-gear store,
    // its pond ringed with reeds, the observation deck the school groups stand on and the logger that measures the water; behind
    // the building the 묘포장, the tunnel where native plants are raised from seed and the open beds they harden off in. The
    // gear store has its own door to the road and the survey car parked on the bay before it, so the boots and nets go straight
    // from the car to the racks. In the building the public side is in front: the lobby with its desk, the restroom and the stairs,
    // and the 전시·교육실 where the classes sit before the stream tank and the board; the lab, the researchers' side, is reached
    // by its own door. Upstairs the researchers' office (the camera-trap desk), the herbarium and sample store, and the staff room.
    tiles: () => [
      ...patch(
        building(
          [[9, 5, 16, 9, 'wood'], [18, 5, 23, 9, 'tile'], [9, 11, 23, 13, 'tile']],
          [[12, 14], [8, 12], [12, 10], [20, 10]],
        ),
        [
          ...Array.from({ length: 7 * 14 }, (_, i): [number, number, 'grass'] => [1 + (i % 7), 1 + Math.floor(i / 7), 'grass']),
          ...Array.from({ length: 17 * 3 }, (_, i): [number, number, 'grass'] => [8 + (i % 17), 1 + Math.floor(i / 17), 'grass']),
          // The pond, its corners left to the reeds.
          ...Array.from({ length: 6 * 6 }, (_, i): [number, number, 'water'] => [1 + (i % 6), 1 + Math.floor(i / 6), 'water']).filter(([x, y]) => !((x === 1 || x === 6) && (y === 1 || y === 6))),
          // The field-gear store: its walls, the door to the road and the door to the yard.
          ...Array.from({ length: 6 }, (_, i): [number, number, 'wall'] => [i, 9, 'wall']),
          ...Array.from({ length: 6 }, (_, i): [number, number, 'wall'] => [i, 14, 'wall']),
          ...Array.from({ length: 4 }, (_, i): [number, number, 'wall'] => [0, 10 + i, 'wall']),
          ...Array.from({ length: 4 }, (_, i): [number, number, 'wall'] => [5, 10 + i, 'wall']),
          ...Array.from({ length: 16 }, (_, i): [number, number, 'tile'] => [1 + (i % 4), 10 + Math.floor(i / 4), 'tile']),
          [2, 14, 'door'], [5, 12, 'door'],
          // The restroom off the lobby.
          [21, 12, 'wall'], [21, 13, 'door'], [22, 11, 'wall'], [23, 11, 'wall'],
        ],
      ),
      ...patch(
        upstairs([[9, 5, 16, 9, 'carpet'], [18, 5, 23, 9, 'tile'], [9, 11, 23, 13, 'wood']], [[12, 10], [20, 10]]),
        [
          ...Array.from({ length: 7 * 14 }, (_, i): [number, number, 'void'] => [1 + (i % 7), 1 + Math.floor(i / 7), 'void']),
          ...Array.from({ length: 17 * 3 }, (_, i): [number, number, 'void'] => [8 + (i % 17), 1 + Math.floor(i / 17), 'void']),
        ],
      ),
    ],
    restrooms: [[22, 12, 23, 13]],
    ground: [[8, 0, 24, 3, 'soil'], [6, 9, 7, 14, 'soil'], [0, 15, 25, 17, 'concrete'], [3, 15, 7, 15, 'asphalt']],
    objects: [
      // The wetland: the reeds round the pond, the observation deck, the logger and its gauge.
      o('ecoReeds', 1, 1), o('ecoReeds', 6, 1), o('ecoReeds', 1, 6), o('ecoReeds', 6, 6),
      o('ecoDeck', 2, 7), o('ecoSamplePoint', 3, 0, 'up'), o('tree', 24, 3), o('tree', 0, 8),
      // The 묘포장: the tunnel's benches, the open beds hardening off.
      o('ecoPolyTunnel', 14, 0), o('seedlingNursery', 15, 0), o('seedlingNursery', 18, 0), o('seedlingNursery', 21, 0),
      o('seedlingNursery', 9, 1), o('seedlingNursery', 11, 1), o('wheelbarrow', 24, 1),
      // The field-gear store: the boots and nets, the lockers, the wash sink, the shelf; the recycling by its yard door.
      o('ecoFieldRack', 1, 10), o('icGearLocker', 3, 10), o('sink', 1, 13, 'up'), o('gearRack', 4, 13, 'up'), o('recycleStation', 7, 13, 'left'),
      // The survey car on its bay before the store.
      o('ecoJeep', 4, 15),
      // The 전시·교육실: the stream tank, the display, the board, the class's chairs.
      o('aquarium', 9, 5), o('ecoStreamDisplay', 11, 5), o('whiteboard', 14, 5), o('plant', 16, 9),
      o('diningChair', 10, 8, 'up'), o('diningChair', 11, 8, 'up'), o('diningChair', 13, 8, 'up'), o('diningChair', 14, 8, 'up'),
      // The lab: the water test benches, the live tanks, the microscope and the freezer.
      o('waterTestBench', 18, 5), o('waterTestBench', 20, 5), o('specimenTank', 22, 5), o('specimenTank', 23, 5),
      o('microscopeBench', 23, 7, 'left'), o('specimenFreezer', 23, 9, 'left'),
      // The lobby: the desk, the seats, the stairs; the restroom.
      o('fgDesk', 14, 11), o('drWaitSeat', 9, 13, 'up'), o('drWaitSeat', 10, 13, 'up'), o('plant', 9, 11), o('stairs', 16, 13, 'left'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // Upstairs. The researchers' office: the desks, the camera-trap desk, the files.
      up('researchDesk', 10, 5), up('researchDesk', 12, 5), up('researchDesk', 10, 8, 'up'), up('researchDesk', 12, 8, 'up'), up('ecoCameraDesk', 14, 5), up('archiveShelf', 9, 7, 'right'), up('whiteboard', 15, 9, 'up'),
      // The herbarium and sample store.
      up('ecoHerbarium', 18, 5), up('specimenFreezer', 20, 5), up('specimenFreezer', 21, 5), up('archiveShelf', 22, 5), up('archiveShelf', 23, 5), up('archiveShelf', 23, 8, 'left'),
      // The staff room.
      up('coffeeMaker', 9, 11), up('fridge', 14, 11), up('diningTable', 11, 12), up('diningChair', 11, 13, 'up'), up('diningChair', 12, 13, 'up'), up('sofa', 21, 13, 'up'), up('plant', 23, 11),
    ],
    coworkers: [
      { name: '서하늘 센터장', shirt: '#2e7d32', skin: '#eac09a', hair: '#5b3a1e', boss: true },
      { name: '맹지후', shirt: '#8bc34a', skin: '#f8d9c0', hair: '#1a1a1a' },
      { name: '단비', shirt: '#4fc3f7', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // The class in the 전시·교육실.
    clients: [{ noun: '견학 학생', socials: ['ecoEducation', 'answerNature'], spots: [[10, 7], [11, 7], [13, 7]], max: 3, every: 50, patience: 150, age: 'child' }],
    alarm: { notice: '🛢️ 해안 오염 신고! 현장 차량으로 출동하세요', done: '🌊 해안을 깨끗이 정화했어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 오염이 퍼졌어요 (성과 감소)', interaction: 'cleanupMission', every: [200, 320], window: 60 },
    tasks: [task('water', '수질 검사하기', ['testWater'], 2), task('seedlings', '묘목·식물 표본 돌보기', ['plantSeedlings', 'ecoMountPlant']), task('species', '하천 생물 관찰하기', ['monitorSpecies', 'ecoReviewCamera'])],
    extra: [task('survey', '현장 조사 준비·출동하기', ['fieldSurvey', 'ecoCheckGear', 'ecoLoadSurveyGear', 'ecoLoadCleanupGear']), task('recycle', '재활용 분류하기', ['sortRecycling'], 2), task('education', '견학 준비·학생 교육하기', ['ecoEducation', 'answerNature', 'ecoPrepareTour'], 2), boss('센터장님께 조사 보고하기')],
    work: ['testWater', 'logData', 'plantSeedlings', 'monitorSpecies', 'feedSpecies', 'sortRecycling', 'fieldSurvey', 'cleanupMission', 'ecoEducation', 'answerNature', 'ecoCheckGear', 'ecoReviewCamera', 'ecoMountPlant', 'ecoPrepareTour', 'ecoLoadSurveyGear', 'ecoLoadCleanupGear'],
    skill: 'gardening',
    floors: { tile: 'aquaTile', wood: 'oakWood' },
    wall: 'mintDots',
  },
  interiorDecorator: {
    careerId: 'interiorDecorator',
    name: '인테리어 디자인 스튜디오',
    icon: '🛋️',
    // An interior design office in a row of shops (2026-11-05, the layout audit, replacing a building on a lawn whose clients waited
    // on chairs in a corridor of a lobby, with the material samples at the far end of a huge studio of two CAD desks, and the van on
    // the grass). As a real 인테리어 사무소: behind the glass front the consultation room, where the client comes in: the two
    // consultation tables, and round them the sample walls the materials are chosen from (tiles and flooring, the paint colours,
    // the fabric and wallpaper rolls, the lighting samples), a staged corner of a room, the sample table. Behind it the designers'
    // studio, the CAD desks in two islands, the mood board, the plotter, the model table and the head's desk; the material store
    // beyond, the staff room with the restroom off it. The site van is parked at the kerb.
    tiles: () =>
      patch(
        building(
          [[2, 2, 17, 7, 'wood'], [19, 2, 23, 7, 'tile'], [2, 9, 13, 13, 'carpet'], [15, 9, 23, 13, 'tile']],
          [[10, 8], [18, 4], [16, 8], [12, 14]],
        ),
        [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The consultation room: the sample walls, the tables, the staged corner, the sample table.
      o('materialLibrary', 2, 9), o('materialLibrary', 3, 9), o('materialLibrary', 4, 9), o('idColourWall', 5, 9), o('idFabricRack', 7, 9), o('idLightingWall', 13, 11, 'left'),
      o('showroomSet', 11, 9), o('idConsultChair', 5, 11), o('idConsultChair', 8, 11), o('sampleTable', 2, 13, 'up'), o('plant', 13, 13),
      // The studio: the CAD desks in two islands, the mood board and the plotter, the model table, the head's desk.
      o('moodBoard', 2, 2), o('largePrinter', 6, 2), o('bookshelf', 10, 2), o('plant', 17, 2),
      o('cadStation', 3, 4, 'up'), o('cadStation', 4, 4, 'up'), o('cadStation', 5, 4, 'up'), o('cadStation', 3, 5), o('cadStation', 4, 5), o('cadStation', 5, 5),
      o('cadStation', 8, 4, 'up'), o('cadStation', 9, 4, 'up'), o('cadStation', 8, 5), o('cadStation', 9, 5),
      o('idModelTable', 13, 4), o('officeDesk', 16, 5, 'left'), o('lamp', 2, 7),
      // The material store.
      o('archiveShelf', 19, 2), o('archiveShelf', 20, 2), o('archiveShelf', 21, 2), o('idFabricRack', 22, 2), o('materialLibrary', 23, 5, 'left'), o('materialLibrary', 23, 6, 'left'),
      // The staff room; the restroom.
      o('coffeeMaker', 17, 9), o('fridge', 18, 9), o('sofa', 15, 13, 'up'), o('diningTable', 18, 11), o('diningChair', 18, 12, 'up'), o('diningChair', 19, 12, 'up'), o('plant', 21, 9),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // The street: the glass front; the van at the kerb.
      o('idShopFront', 1, 15), o('decorVan', 2, 16),
    ],
    coworkers: [
      { name: '연수정 실장', shirt: '#6d4c41', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '반지원', shirt: '#ffab91', skin: '#eac09a', hair: '#a0522d' },
      { name: '탁세린', shirt: '#b39ddb', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    clients: [{ noun: '의뢰인', socials: ['designConsult', 'presentMoodBoard'], spots: [[6, 13], [9, 13]], max: 2, every: 70, patience: 160 }],
    alarm: { notice: '🏠 리모델링 공개 날이에요! 현장 차량으로 출발하세요', done: '🏠 집주인이 감동해서 울었어요! 성과가 크게 올라요', missed: '⌛ 공개 행사에 늦어 실장님이 대신 진행했어요 (성과 감소)', interaction: 'revealDay', every: [200, 320], window: 60 },
    tasks: [task('materials', '소재·색상 고르기', ['chooseMaterials', 'idMatchPalette', 'idCompareFabric'], 2), task('moodboard', '무드보드 만들기', ['makeMoodBoard']), task('clients', '의뢰인 상담하기', ['designConsult', 'presentMoodBoard', 'idDesignConsult', 'idPresentBoard'])],
    extra: [task('stage', '쇼룸·조명 연출하기', ['stageRoom', 'idTestLighting']), task('render', '공간 설계하기', ['renderDesign', 'idPlanLayout']), task('reveal', '공개 현장 준비·방문하기', ['revealDay', 'idLoadReveal']), boss('실장님께 시안 검토받기')],
    work: ['chooseMaterials', 'makeMoodBoard', 'arrangeSamples', 'stageRoom', 'renderDesign', 'revealDay', 'designConsult', 'presentMoodBoard', 'idMatchPalette', 'idTestLighting', 'idPlanLayout', 'idCompareFabric', 'idDesignConsult', 'idPresentBoard', 'idLoadReveal'],
    skill: 'painting',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'roseStripes',
  },
  salaryperson: {
    careerId: 'salaryperson',
    name: '대기업 사무실',
    icon: '💼',
    // The company's own tower, two floors of it shown (2026-11-05, the layout audit, replacing a lone building on a lawn with six
    // identical desks, kitchen chairs to wait on, one walled meeting room and the toilet cut into its corner). Downstairs, the
    // lobby: in from the street the reception under the 한결그룹 name, the speed gates on the way to the lifts and the stairs, a
    // coffee corner and a lounge where people are met, the building's restroom, and the 접견실 either side of the lift hall where
    // a visitor from another firm is seen without going upstairs (one round a table, one with a sofa). Upstairs, a team floor: two
    // teams, each an island of desks pushed together with its 부장's desk at the head of it facing the team, the team's whiteboard;
    // the glass meeting room off the lift hall with its screen and whiteboard, the 상무's office, the pantry (water, coffee,
    // fridge, a sofa) with the floor's restroom and the copy room (the copier, the supply cabinet and shredder) off it.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 8, 6, 'carpet'], [10, 3, 16, 6, 'tile'], [18, 2, 23, 6, 'carpet'], [2, 8, 23, 13, 'tile']],
          [[5, 7], [11, 7], [20, 7], [21, 12], [12, 14]],
        ),
        [[21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 13, 'wall']],
      ),
      ...upstairs(
        [[2, 2, 8, 6, 'wood'], [10, 3, 16, 6, 'tile'], [18, 2, 23, 6, 'carpet'], [2, 8, 15, 13, 'carpet'], [17, 8, 23, 10, 'wood'], [17, 12, 20, 13, 'carpet'], [22, 12, 23, 13, 'tile']],
        [[5, 7], [11, 7], [17, 5], [16, 9], [20, 11], [22, 11]],
      ),
    ],
    restrooms: [[22, 12, 23, 13], [22, 30, 23, 31]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lobby: the reception, the speed gates to the lift hall, the coffee corner, the lounge; the building's restroom.
      o('salReceptionDesk', 15, 8), o('sgSpeedGate', 9, 8), o('sgSpeedGate', 12, 8),
      o('coffeeMaker', 2, 8), o('fridge', 3, 8), o('diningTable', 3, 12), o('diningChair', 3, 13, 'up'), o('diningChair', 4, 13, 'up'), o('plant', 2, 10),
      o('diningTable', 6, 12), o('diningChair', 6, 13, 'up'), o('diningChair', 7, 13, 'up'), o('diningTable', 6, 9), o('diningChair', 6, 10, 'up'), o('diningChair', 7, 10, 'up'),
      o('sofa', 9, 12, 'up'), o('armchair', 11, 12, 'left'),
      o('sofa', 17, 13, 'up'), o('armchair', 16, 11, 'right'), o('plant', 14, 13), o('plant', 23, 8),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // The lift hall and the stairs.
      o('bldLift', 10, 3), o('bldLift', 13, 3), o('stairs', 12, 6, 'left'), o('plant', 16, 3),
      // The 접견실: round a table; on a sofa.
      o('salMeetingTable', 3, 4), o('salMeetingChair', 3, 3), o('salMeetingChair', 4, 3), o('salMeetingChair', 5, 3),
      o('salMeetingChair', 3, 5, 'up'), o('salMeetingChair', 4, 5, 'up'), o('salMeetingChair', 5, 5, 'up'), o('plant', 8, 2),
      o('sofa', 20, 2), o('armchair', 19, 4, 'right'), o('armchair', 22, 4, 'left'), o('plant', 23, 2), o('plant', 18, 2),
      // Upstairs. The lift hall.
      up('bldLift', 10, 3), up('bldLift', 13, 3), up('plant', 16, 3),
      // The team floor: each team's island with its 부장's desk at its head; the copier, the supply cabinet.
      up('officeDesk', 3, 9, 'left'), up('officeDesk', 4, 9, 'up'), up('officeDesk', 5, 9, 'up'), up('officeDesk', 6, 9, 'up'), up('officeDesk', 4, 10), up('officeDesk', 5, 10), up('officeDesk', 6, 10),
      up('officeDesk', 9, 9, 'left'), up('officeDesk', 10, 9, 'up'), up('officeDesk', 11, 9, 'up'), up('officeDesk', 12, 9, 'up'), up('officeDesk', 10, 10), up('officeDesk', 11, 10), up('officeDesk', 12, 10),
      up('officeDesk', 4, 13, 'up'), up('officeDesk', 5, 13, 'up'), up('officeDesk', 6, 13, 'up'), up('officeDesk', 9, 13, 'up'), up('officeDesk', 10, 13, 'up'), up('officeDesk', 11, 13, 'up'),
      up('whiteboard', 14, 13, 'up'), up('plant', 2, 13), up('plant', 15, 8),
      // The glass meeting room: the table, the screen at its head, the whiteboard.
      up('salMeetingTable', 19, 4), up('salMeetingChair', 19, 3), up('salMeetingChair', 20, 3), up('salMeetingChair', 21, 3),
      up('salMeetingChair', 19, 5, 'up'), up('salMeetingChair', 20, 5, 'up'), up('salMeetingChair', 21, 5, 'up'), up('projector', 23, 4, 'left'), up('whiteboard', 22, 2),
      // The 상무's office.
      up('officeDesk', 5, 3), up('bookshelf', 2, 2), up('bookshelf', 3, 2), up('sofa', 2, 6, 'up'), up('armchair', 4, 6, 'up'), up('plant', 8, 2),
      // The pantry, the copy room, the floor's restroom.
      up('salWaterCooler', 18, 8), up('coffeeMaker', 19, 8), up('fridge', 20, 8), up('sofa', 17, 10, 'up'), up('plant', 23, 8),
      up('salSupplyCabinet', 17, 13, 'up'), up('copier', 19, 13, 'up'),
      up('toilet', 23, 13, 'left'), up('sink', 23, 12, 'left'),
    ],
    coworkers: [
      { name: '남궁철 부장', shirt: '#263238', skin: '#eac09a', hair: '#757575', boss: true },
      { name: '하수민 대리', shirt: '#90a4ae', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '변성우 주임', shirt: '#5c6bc0', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // In the 접견실 downstairs: at the table, by the sofa.
    clients: [{ noun: '거래처 손님', socials: ['businessMeeting', 'closeDeal'], spots: [[2, 3], [6, 5], [20, 3]], max: 1, every: 90, patience: 150 }],
    alarm: { notice: '📊 갑자기 임원 보고가 잡혔어요! 회의실 프로젝터로 가세요', done: '📊 임원 보고를 무사히 마쳤어요! 성과가 크게 올라요', missed: '⌛ 보고에 늦어 과장님이 대신 들어갔어요 (성과 감소)', interaction: 'executiveReport', every: [200, 320], window: 60 },
    tasks: [task('report', '보고서 작성하기', ['writeReport'], 2), task('excel', '엑셀 자료 정리하기', ['crunchNumbers']), task('meeting', '회의 참석하기', ['attendMeeting', 'salTableMeeting'])],
    extra: [task('copies', '복사하기', ['makeCopies'], 2), task('client', '거래처 응대하기', ['businessMeeting', 'closeDeal']), task('exec', '임원 보고하기', ['executiveReport']), boss('부장님께 결재받기'), task('shred', '서류 파쇄·비품 정리하기', ['salShredDocs', 'salStockSupplies'])],
    work: ['writeReport', 'crunchNumbers', 'makeCopies', 'attendMeeting', 'salTableMeeting', 'rehearsePresentation', 'executiveReport', 'businessMeeting', 'closeDeal', 'salShredDocs', 'salStockSupplies'],
    skill: 'charisma',
    floors: { carpet: 'slateStone', tile: 'monoTile', wood: 'oakWood' },
    wall: 'navyWainscot',
  },
  mortician: {
    careerId: 'mortician',
    name: '장례식장',
    icon: '⚱️',
    // A floor of a 장례식장 (2026-11-04, the layout audit, replacing a 빈소 with rows of chairs like a chapel and a toilet in its
    // corner, the 접객실 two tables in the lobby, and the preparation room off the 빈소 with no cold store or hearse). A Korean
    // funeral hall is let by the 빈소: each a set of the 분향실 (the altar banked in chrysanthemums, the 상주's place beside it, the
    // floor before it bare, for mourners stand to offer incense and bow, and wreaths round the walls), the 접객실 through from it,
    // bigger, where mourners are given a meal at its tables, and the 상주's rest room with its shower and bedding. Here one set, on
    // the corridor with the 부의금 desk at the 분향실's door, the wreaths sent lining it and another 빈소's door at its end; the
    // lobby with the 빈소 board and the restroom. Apart from all that, the staff's side: the 안치실 (the cold chambers) that the
    // hearse backs up to through its own door from the yard, the 염습·입관실 beside it, and the family's viewing room with its
    // window onto the 입관; the office where funerals are planned with the family, its door to the yard.
    tiles: () =>
      patch(
        building(
          [
            [2, 2, 6, 6, 'carpet'], [8, 2, 14, 6, 'wood'], [16, 2, 19, 6, 'tile'], [21, 2, 23, 6, 'tile'],
            [2, 8, 10, 9, 'carpet'], [12, 8, 14, 9, 'wood'], [16, 8, 18, 9, 'carpet'], [2, 11, 12, 13, 'tile'], [14, 11, 18, 13, 'wood'],
          ],
          [[7, 4], [4, 7], [9, 7], [13, 7], [15, 8], [20, 4], [22, 7], [8, 10], [13, 12], [19, 12], [12, 14]],
        ),
        [
          // The restroom in the lobby's corner.
          [2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door'],
          // The yard the hearse comes into.
          ...Array.from({ length: 5 * 7 }, (_, i): [number, number, 'grass'] => [20 + (i % 5), 8 + Math.floor(i / 5), 'grass']),
        ],
      ),
    restrooms: [[2, 12, 3, 13]],
    ground: [[20, 8, 25, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The 분향실: the altar between wreaths, the 상주's place beside it, the floor before it bare; wreaths round the walls.
      o('wreathStand', 2, 2), o('memorialAltar', 3, 2), o('wreathStand', 6, 2), o('morMournerPlace', 6, 5, 'left'), o('wreathStand', 2, 4, 'right'), o('wreathStand', 2, 6, 'right'), o('wreathStand', 6, 6, 'left'),
      // The 접객실: tables laid for mourners; the fridge and the urn for the drinks.
      o('morMealTable', 9, 3), o('diningChair', 9, 2), o('diningChair', 10, 2), o('diningChair', 9, 4, 'up'),
      o('morMealTable', 12, 3), o('diningChair', 12, 2), o('diningChair', 13, 2), o('diningChair', 12, 4, 'up'),
      o('morMealTable', 10, 6, 'up'), o('diningChair', 12, 6, 'left'),
      o('coffeeMaker', 14, 5, 'left'), o('fridge', 14, 6, 'left'),
      // The corridor: the 부의금 desk at the 분향실's door, the wreaths sent, the next 빈소's door at the end.
      o('morGuestDesk', 5, 9, 'up'), o('wreathStand', 2, 8, 'right'), o('wreathStand', 2, 9, 'right'), o('wreathStand', 7, 9, 'up'), o('morSuiteDoor', 10, 8, 'left'),
      // The 상주's rest room: the bedding, the shower, the wardrobe.
      o('bed', 12, 9, 'right'), o('clothesCabinet', 12, 8, 'right'), o('shower', 14, 9),
      // The viewing room: the window onto the 입관, a seat.
      o('morViewWindow', 17, 8), o('drWaitSeat', 18, 9, 'up'),
      // The 염습·입관실: the table, the 수의 table, the cabinet, the basin.
      o('nsHandSink', 16, 2), o('prepTable', 17, 4), o('morShroudCabinet', 19, 2), o('morShroudTable', 16, 6, 'up'),
      // The 안치실: two banks of cold chambers.
      o('morColdChamber', 21, 2), o('morColdChamber', 23, 3, 'left'),
      // The lobby: the 빈소 board, a sofa and an armchair, the urns shown, the restroom.
      o('morInfoKiosk', 6, 11), o('sofa', 6, 13, 'up'), o('armchair', 8, 13, 'up'), o('urn', 9, 13, 'up'), o('plant', 11, 11), o('toilet', 2, 12, 'right'), o('sink', 3, 12),
      // The office: two desks where funerals are planned, the family's chairs, the files, the coffee.
      o('funeralDesk', 15, 11), o('funeralDesk', 17, 11), o('archiveShelf', 18, 11), o('diningChair', 16, 13, 'up'), o('diningChair', 17, 13, 'up'), o('coffeeMaker', 14, 13, 'up'),
      // The yard: the hearse backed up to the 안치실's door.
      o('morHearse', 21, 9),
    ],
    coworkers: [
      { name: '엄정숙 대표', shirt: '#212121', skin: '#f8d9c0', hair: '#9e9e9e', boss: true },
      { name: '고요한 지도사', shirt: '#37474f', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '심가은', shirt: '#424242', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // In the 접객실, the lobby and the office.
    clients: [{ noun: '유족', socials: ['consoleFamily', 'guideFamily'], spots: [[8, 2], [14, 2], [6, 12], [8, 12], [16, 12]], max: 2, every: 70, patience: 180 }],
    alarm: { notice: '🕯️ 추모식이 곧 시작돼요! 추모 제단 앞으로 가세요', done: '🕯️ 추모식을 경건하게 마쳤어요. 성과가 크게 올라요', missed: '⌛ 추모식에 늦어 대표님이 대신 진행했어요 (성과 감소)', interaction: 'leadMemorial', every: [200, 320], window: 60 },
    tasks: [task('family', '유족 위로·안내하기', ['consoleFamily', 'guideFamily'], 2), task('altar', '제단 꾸미기', ['arrangeAltar']), task('plan', '장례 일정 세우기', ['planFuneral'])],
    extra: [task('memorial', '추모식 진행하기', ['leadMemorial']), task('eulogy', '추도사 쓰기', ['writeEulogy']), task('casket', '관·수의 준비하기', ['prepareCasket', 'morPrepareShroud']), task('wreath', '조화 정리하기', ['arrangeWreath'], 2), task('guests', '조문객 맞이하기', ['morGreetMourners'], 2), task('meal', '접객실 상 차리기', ['morSetMealTable']), task('notice', '빈소 안내판 정리하기', ['morPostNotice']), task('supplies', '장례용품 챙기기', ['morCheckSupplies'])],
    work: ['arrangeAltar', 'leadMemorial', 'arrangeWreath', 'prepareCasket', 'tidyPrepRoom', 'planFuneral', 'writeEulogy', 'consoleFamily', 'guideFamily', 'morGreetMourners', 'morPostNotice', 'morSetMealTable', 'morPrepareShroud', 'morCheckSupplies'],
    skill: 'charisma',
    floors: { carpet: 'lilacCarpet', tile: 'creamTile', wood: 'walnutWood' },
    wall: 'creamPlain',
  },
  dj: {
    careerId: 'dj',
    name: '나이트클럽',
    icon: '🎧',
    // A club on a busy street's ground floor (2026-11-05, the layout audit, replacing a hall on a lawn with windows, the bar in a
    // corridor walled off from the floor, the VIP lounge a room of its own that couldn't see the floor and the only restroom in the
    // staff room). As one in 홍대 or 강남 is: the queue along its posts on the pavement under the neon, in at the door past the desk
    // where IDs are checked and the entry paid, the cloakroom counter, the guests' restroom; the foyer opens straight into the one
    // dark hall. There the booth stands before the LED wall between the speaker stacks, the fog machine and the records beside the
    // decks, the lit floor before it; the bar along the left wall where drinks are ordered in the music, the VIP booths along the
    // right at the floor's edge, standing tables round it. Behind the hall the backstage: the DJs' room (the producing desk, the
    // fridge, the sofa) and below it the staff's lockers and stores, with the staff restroom.
    tiles: () =>
      patch(
        building(
          [[2, 2, 18, 9, 'carpet'], [9, 10, 15, 10, 'carpet'], [2, 11, 15, 13, 'tile'], [20, 2, 23, 9, 'wood'], [17, 11, 23, 13, 'tile']],
          [[19, 6], [21, 10], [4, 13], [21, 13], [12, 14]],
        ),
        [
          // The guests' restroom off the foyer; the staff's in the corner of the stores.
          [2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'],
          [22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'],
        ],
      ),
    windowless: ['ncDanceFloor', 'ncProducerDesk'],
    restrooms: [[22, 12, 23, 13], [2, 12, 3, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The booth out from the back wall, the DJ behind it facing the floor: the LED wall behind them, a speaker stack either side
      // of it and in the corners, the fog machine and the record crate beside the decks; the lit dance floor (walked on) under its
      // light truss.
      o('clubSpeaker', 2, 2), o('clubSpeaker', 6, 2), o('ncLedWall', 7, 2), o('clubSpeaker', 11, 2), o('clubSpeaker', 15, 2),
      o('ncFogMachine', 6, 3), o('djBooth', 8, 3), o('recordCrate', 10, 3), o('ncDanceFloor', 5, 5),
      // The bar along the left wall, the VIP booths along the right at the floor's edge, the standing tables round it.
      o('ncBar', 2, 4, 'right'), o('ncVipBooth', 17, 2, 'left'), o('ncVipBooth', 17, 7, 'left'),
      o('ncHighTable', 2, 9), o('ncHighTable', 6, 9), o('ncHighTable', 15, 5), o('ncHighTable', 15, 8),
      // The foyer: the ID and entry desk by the door, the cloakroom counter; the guests' restroom.
      o('ncDoorDesk', 14, 11, 'left'), o('ncCoatCheck', 7, 13, 'up'), o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
      // Backstage: the DJs' room.
      o('ncProducerDesk', 20, 2), o('coffeeMaker', 22, 2), o('fridge', 23, 2), o('sofa', 23, 4, 'left'), o('recordCrate', 20, 7, 'right'),
      // The staff's lockers and the stores; the staff restroom.
      o('clsLockers', 17, 11), o('sgRoadCases', 17, 13, 'up'), o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // Out front: the neon over the door, the queue's posts.
      o('ncNeonSign', 9, 15), o('ncQueueRope', 13, 16),
    ],
    coworkers: [
      { name: '차도윤 사장', shirt: '#212121', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '유리아 바텐더', shirt: '#ad1457', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '강태산 경호원', shirt: '#263238', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // On the floor, and at the VIP booths' edge.
    clients: [{ noun: '클럽 손님', socials: ['hypeCrowd', 'takeRequest'], spots: [[6, 6], [8, 6], [11, 6], [13, 6], [7, 8], [12, 8], [16, 4], [16, 8]], max: 4, every: 25, patience: 120 }],
    alarm: { notice: '🔥 피크 타임! DJ 부스에서 무대를 달구세요', done: '🔥 클럽이 떠나갈 듯 환호해요! 성과가 크게 올라요', missed: '⌛ 피크 타임을 놓쳐 분위기가 식었어요 (성과 감소)', interaction: 'peakTimeSet', every: [150, 240], window: 45 },
    tasks: [task('set', '클럽 공연하기', ['playSet'], 2), task('crowd', '손님 분위기 띄우기', ['hypeCrowd', 'takeRequest'], 3), task('records', '음반 고르기', ['digRecords'])],
    extra: [task('peak', '피크 타임 공연', ['peakTimeSet']), task('sound', '음향·포그 점검하기', ['checkSound', 'ncFogBlast']), task('mix', '음악 믹싱하기', ['mixTracks', 'ncMakeEdit']), task('vip', 'VIP 테이블 챙기기', ['ncVipToast']), boss('사장님과 오늘 무대 이야기하기')],
    work: ['playSet', 'peakTimeSet', 'mixTracks', 'checkSound', 'digRecords', 'hypeCrowd', 'takeRequest', 'ncFogBlast', 'ncMakeEdit', 'ncVipToast'],
    skill: 'djMixing',
    floors: { wood: 'walnutWood', carpet: 'lilacCarpet', tile: 'monoTile' },
    wall: 'navyWainscot',
  },
  dancer: {
    careerId: 'dancer',
    name: '댄스 스튜디오',
    icon: '💃',
    // A dance studio in a 상가 on the street (2026-11-05, the layout audit, replacing a building on a lawn with a little theatre,
    // stage and seats, in the room beside the practice room, the showers, the costumes, the coffee and the sofa all in one room
    // and a lobby that was a corridor of two chairs). As a real 댄스 학원 or company studio: in off the pavement (the A-frame sign)
    // to a small lobby, the desk by the door where classes are signed up for and attendance taken, the timetable on the wall, the
    // shoe cubbies (street shoes off), a sofa to wait on, the restroom. Straight on, the big practice room: a wall of mirrors and
    // the open floor before it, the barre, the sound desk and the stretching corner along the walls; no theatre, the monthly
    // showcase is danced on a low riser at the room's far end under lamps on stands, the folding seats set out before it. Down
    // the corridor the small studio for private lessons and small groups (its own mirrors, the lift mat, the video bench), the
    // changing room (lockers, two showers, the shoes and costumes) and the teachers' office (the desk, the coffee, the sofa).
    tiles: () =>
      patch(
        building(
          [[2, 2, 15, 9, 'wood'], [17, 2, 23, 6, 'wood'], [17, 8, 17, 13, 'tile'], [19, 8, 23, 10, 'tile'], [19, 12, 23, 13, 'carpet'], [2, 11, 15, 13, 'tile']],
          [[9, 10], [16, 13], [17, 7], [18, 9], [18, 12], [12, 14]],
        ),
        [[2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door']],
      ),
    restrooms: [[2, 12, 3, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The big practice room: the mirrors and the open floor before them; the showcase riser at the far end, the folding seats
      // set out before it; the stretching corner, the barre, the sound desk and the stereo along the walls.
      o('plant', 2, 2), o('danceMirror', 3, 2), o('danceMirror', 5, 2), o('danceMirror', 7, 2), o('danceMirror', 9, 2),
      o('dnShowcaseRiser', 11, 2), o('dnHouseSeats', 10, 7, 'up'), o('dnHouseSeats', 13, 7, 'up'), o('dnHouseSeats', 10, 9, 'up'), o('dnHouseSeats', 13, 9, 'up'),
      o('dnStretchCorner', 2, 6, 'right'), o('balletBarre', 3, 9, 'up'), o('dnSoundDesk', 6, 9, 'up'), o('stereo', 8, 9, 'up'),
      // The small studio: its mirrors, the video bench, the lift mat against the wall.
      o('danceMirror', 17, 2), o('danceMirror', 19, 2), o('danceMirror', 21, 2), o('plant', 23, 2), o('dnVideoBench', 18, 6, 'up'), o('dnLiftMat', 21, 5, 'up'),
      // The changing room: the lockers, the showers, the shoes and costumes.
      o('clsLockers', 19, 8), o('clsLockers', 21, 8), o('shower', 23, 8), o('shower', 23, 10), o('dnCostumeRack', 20, 10, 'up'),
      // The teachers' office.
      o('officeDesk', 20, 12), o('coffeeMaker', 23, 12, 'left'), o('sofa', 22, 13, 'up'),
      // The lobby: the timetable, the desk by the door, the shoe cubbies, a sofa; the restroom.
      o('dnTimetable', 8, 13, 'up'), o('lobbyDesk', 13, 11), o('dnShoeRack', 10, 13, 'up'), o('sofa', 6, 13, 'up'),
      o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
      // On the pavement: the sign.
      o('dnStreetSign', 10, 15),
    ],
    coworkers: [
      { name: '백설아 단장', shirt: '#880e4f', skin: '#f8d9c0', hair: '#1a1a1a', boss: true },
      { name: '도하람', shirt: '#ff4081', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '여준서', shirt: '#7c4dff', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // On the floor before the mirrors.
    clients: [{ noun: '수강생', socials: ['teachDanceClass', 'correctPosture'], spots: [[4, 4], [6, 4], [8, 4], [5, 6], [7, 6]], max: 3, every: 40, patience: 150 }],
    alarm: { notice: '🎭 공연 시작 10분 전! 무대로 가세요', done: '🎭 기립 박수가 쏟아졌어요! 성과가 크게 올라요', missed: '⌛ 공연에 늦어 대역 댄서가 무대에 섰어요 (성과 감소)', interaction: 'performShow', every: [180, 300], window: 45 },
    tasks: [task('choreo', '안무 연습하기', ['practiceChoreo'], 2), task('class', '레슨하기', ['teachDanceClass', 'correctPosture'], 2), task('stretch', '스트레칭하기', ['stretchRoutine', 'dnFoamRoll', 'dnSplitStretch'])],
    extra: [task('stage', '무대 리허설하기', ['rehearseStage']), task('show', '공연하기', ['performShow']), task('freestyle', '음악에 맞춰 춤추기', ['dance', 'dnFreestyle']), task('music', '음악 큐 잡기', ['dnCueMusic']), task('video', '리허설 영상 돌려 보기', ['dnVideoReview']), task('lift', '파트너 리프트 연습하기', ['dnPartnerLift']), task('dress', '토슈즈·의상 챙기기', ['dnTiePointe', 'dnFitCostume']), boss('단장님께 안무 보여 드리기')],
    work: ['practiceChoreo', 'stretchRoutine', 'rehearseStage', 'performShow', 'dance', 'teachDanceClass', 'correctPosture', 'dnCueMusic', 'dnFreestyle', 'dnFoamRoll', 'dnSplitStretch', 'dnTiePointe', 'dnFitCostume', 'dnVideoReview', 'dnPartnerLift'],
    skill: 'dancing',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'roseStripes',
  },
  singer: {
    careerId: 'singer',
    name: '녹음 스튜디오와 공연장',
    icon: '🎤',
    windowless: ['sgShowcaseStage', 'recordingMic', 'mixingConsole'],
    // A music company's building (2026-11-05, the layout audit, at the user's request for a far better one; replacing one building
    // where a small stage with a karaoke machine, a booth as big as its control room with two mics, and a lobby of dining chairs
    // round a fan-sign table were all together). Downstairs the company's showcase hall, where a debut or a comeback is first sung
    // to the press and the fans: the stage with its LED wall, truss and flown speakers, its wings masked in black, the quick-change
    // rack in one and the stage manager's cue board in the other; the house's two rows of seats with the aisle down the middle and
    // the FOH console at the back of it; the lobby with the box office and the MD booth, the poster wall, the fan-sign table and the
    // restroom. Behind the stage-right wing a narrow backstage corridor runs from the wing to the artists' own door on the street,
    // and off it what a hall's backstage has: the dressing room (the mirrors, the costume rail, the tea for the throat, the sofa),
    // the production office (the desks, the run sheet on the board, the copier), the stairwell up to the company's floor, and the
    // equipment store with the road cases and a guitar. Upstairs the company's floor along one
    // corridor: the dance practice room with its wall of mirrors and the bench where the practice video is gone over, the in-house
    // recording studio (a control room, the console turned to the glass, and a small vocal booth beyond it), the vocal lesson room
    // with its piano, the songwriter's room, and the trainees' lounge.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 15, 9, 'carpet'], [2, 11, 15, 13, 'tile'], [17, 2, 17, 13, 'tile'], [19, 2, 23, 5, 'wood'], [19, 7, 23, 8, 'carpet'], [18, 10, 22, 10, 'tile'], [19, 12, 23, 13, 'tile']],
          [[4, 10], [13, 10], [16, 3], [18, 3], [18, 7], [16, 12], [18, 12], [12, 14], [17, 14]],
        ),
        [[2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door']],
      ),
      ...upstairs(
        [[2, 2, 11, 6, 'wood'], [13, 2, 19, 6, 'carpet'], [21, 2, 23, 5, 'carpet'], [2, 8, 23, 8, 'tile'], [2, 10, 6, 13, 'wood'], [8, 10, 11, 13, 'carpet'], [13, 10, 23, 13, 'carpet']],
        [[6, 7], [16, 7], [20, 4], [4, 9], [9, 9], [15, 9]],
      ),
    ],
    restrooms: [[2, 12, 3, 13]],
    objects: [
      // The stage; the quick-change rack in the stage-left wing, the stage manager's cue board in the stage-right one.
      o('sgShowcaseStage', 4, 2), o('mdBackstageRack', 2, 2), o('tsCueBoard', 14, 2),
      // The house: two rows of seats either side of the aisle, the FOH console at the back of it.
      ...[3, 4, 5, 6, 7, 10, 11, 12, 13, 14].flatMap((x) => [o('sgHallSeat', x, 6, 'up'), o('sgHallSeat', x, 8, 'up')]),
      o('enSoundConsole', 8, 9, 'up'),
      // The lobby: the poster wall, the box office and MD booth, the fan-sign table, a sofa; the restroom.
      o('enPosterWall', 14, 11), o('sgBoxOffice', 8, 11), o('sgFanSignTable', 6, 13, 'up'), o('sofa', 14, 13, 'up'),
      o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
      // Off the backstage corridor. The dressing room: the mirrors, the costume rail, the sofa, the tea for the throat.
      o('enVanity', 19, 2), o('sgDressingTable', 21, 2), o('dnCostumeRack', 23, 4, 'left'), o('sofa', 19, 5, 'up'), o('vaTeaCorner', 21, 5, 'up'),
      // The production office: the desks, the run sheet on the board, the copier.
      o('officeDesk', 20, 7), o('officeDesk', 21, 7), o('whiteboard', 22, 7), o('copier', 23, 8, 'left'),
      // The stairwell; the equipment store: the road cases (in-ears, mics, cables, the spare monitors), a guitar.
      o('stairs', 19, 10, 'left'),
      o('sgRoadCases', 19, 13, 'up'), o('sgRoadCases', 21, 13, 'up'), o('guitar', 23, 13, 'up'),
      // Upstairs. The dance practice room: the mirror wall, the speakers, the bench where the practice video is gone over.
      up('danceMirror', 2, 2), up('danceMirror', 4, 2), up('danceMirror', 6, 2), up('danceMirror', 8, 2), up('danceMirror', 10, 2),
      up('clubSpeaker', 2, 6, 'up'), up('clubSpeaker', 11, 6, 'up'), up('dnVideoBench', 8, 6, 'up'),
      // The recording studio: the control room's console turned to the glass, the gold records, the producer's sofa, the lyric desk;
      // the vocal booth beyond the glass, its mic and its foam.
      up('sgControlWindow', 19, 2, 'left'), up('mixingConsole', 17, 2, 'left'), up('sgGoldRecords', 13, 2), up('lyricDesk', 13, 4, 'right'), up('sofa', 14, 6, 'up'), up('clubSpeaker', 18, 6, 'up'),
      up('sgBoothWindow', 21, 2, 'right'), up('recordingMic', 22, 2), up('sgFoamWall', 21, 5, 'up'),
      // The vocal lesson room and the songwriter's room.
      up('vocalPiano', 2, 10), up('clubSpeaker', 6, 10), up('sofa', 2, 13, 'up'), up('plant', 6, 13),
      up('clubSpeaker', 8, 10), up('ncProducerDesk', 10, 10), up('lyricDesk', 8, 13, 'up'),
      // The trainees' lounge: the sofa, the coffee and the water, the schedule board, the manager's desk.
      up('sofa', 13, 13, 'up'), up('coffeeMaker', 16, 10), up('salWaterCooler', 17, 10), up('whiteboard', 22, 13, 'up'), up('officeDesk', 18, 13, 'up'), up('plant', 13, 10),
    ],
    coworkers: [
      { name: '탁민혁 프로듀서', shirt: '#311b92', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '은하율 보컬 트레이너', shirt: '#ec407a', skin: '#f8d9c0', hair: '#a0522d' },
      { name: '서진우 엔지니어', shirt: '#546e7a', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // Fans in the house's seats before the showcase.
    clients: [{ noun: '팬', socials: ['signAutograph', 'fanSelfie'], spots: [[3, 7], [5, 7], [7, 7], [10, 7], [12, 7], [14, 7]], max: 3, every: 60, patience: 120 }],
    alarm: { notice: '🎤 쇼케이스가 곧 시작돼요! 1층 무대로 가세요', done: '🎤 앙코르가 끊이지 않아요! 성과가 크게 올라요', missed: '⌛ 공연에 늦어 게스트 가수가 대신 올랐어요 (성과 감소)', interaction: 'liveConcert', every: [180, 300], window: 45 },
    tasks: [task('record', '녹음하기', ['recordVocals'], 2), task('warmup', '발성 연습하기', ['vocalWarmup']), task('lyrics', '작사하기', ['writeLyrics'])],
    extra: [
      task('soundcheck', '무대 리허설하기', ['soundcheck', 'enSoundCheck']), task('concert', '라이브 공연하기', ['liveConcert']), task('choreo', '안무 연습하기', ['practiceChoreo', 'dnVideoReview']),
      task('prep', '무대 준비 · 의상 갈아입기', ['sgStagePrep', 'enPreShow', 'mdQuickChange']), task('throat', '목 관리하기', ['vaTea']), task('mix', '녹음본 모니터링', ['mixAlbum']),
      task('fans', '팬 서비스하기', ['signAutograph', 'fanSelfie', 'sgFanSign'], 2), boss('프로듀서님께 녹음본 들려드리기'),
    ],
    work: ['recordVocals', 'vocalWarmup', 'writeLyrics', 'soundcheck', 'liveConcert', 'mixAlbum', 'signAutograph', 'fanSelfie', 'sgFanSign', 'sgStagePrep', 'enSoundCheck', 'practiceChoreo', 'dnVideoReview', 'enPreShow', 'mdQuickChange', 'vaTea'],
    skill: 'singing',
    floors: { wood: 'walnutWood', carpet: 'lilacCarpet', tile: 'creamTile' },
    wall: 'navyWainscot',
  },
  diplomat: {
    careerId: 'diplomat',
    name: '외교부 청사',
    icon: '🌐',
    // Two floors of a big government building (2026-11-05, the layout audit, replacing a little building on a lawn whose street door
    // opened straight onto a lobby with the reception buffet always laid out and kitchen chairs where the foreign delegations
    // waited, five desks scattered round one office with the pouch safe on its wall, the interpreters' booth standing in a corner
    // of the summit hall and a negotiating table of three a side). As the real 청사: out front the flags and the stone with the
    // ministry's name; in at the door, nobody gets past the security line without going through it, the visitors' desk where the
    // 방문증 is issued, the bag scanner and the walk-through detector, and the speed gates staff badge through; beyond it the lift
    // and the stairs. The ground floor holds what guests come for: the VIP 접견실 where a delegation is met by protocol and waits
    // (two sofas across the tea tables, the flags), the 회담장 next door (the table lengthened to four a side with the nameplates
    // and table flags, our side nearer the door, the signing table with its backdrop at one end, the interpreters' glass-fronted
    // booth at the far end looking down the table), and a small 연회장 opened for receptions. Upstairs the 과 where the work is done:
    // the desks pushed together in two islands under the world clocks, the 과장's desk at their head looking down them, the
    // 대사's office, the 보안 문서실 behind its own door (the pouch safe, the locked cabinets, the files, the shredder), the pantry
    // and the copy room.
    tiles: () => [
      ...patch(
        building(
          // The 회담장 wraps round the interpreters' booth room in its corner (2026-11-06).
          [[2, 2, 7, 7, 'carpet'], [9, 2, 19, 7, 'carpet'], [20, 6, 23, 7, 'carpet'], [21, 2, 23, 4, 'carpet'], [2, 9, 5, 13, 'wood'], [7, 9, 23, 13, 'tile']],
          [[8, 4], [7, 8], [12, 8], [6, 10], [12, 14], [23, 5]],
        ),
        [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
      ),
      ...upstairs(
        [[2, 2, 17, 7, 'carpet'], [19, 2, 23, 7, 'carpet'], [2, 9, 5, 13, 'tile'], [7, 9, 23, 10, 'tile'], [7, 12, 14, 13, 'wood'], [16, 12, 23, 13, 'tile']],
        [[12, 8], [21, 8], [6, 10], [10, 11], [19, 11]],
      ),
    ],
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // Out front: the flags and the stone.
      o('dpFlagRow', 8, 15), o('dpGovSign', 14, 15),
      // The security line: the visitors' desk, the bag scanner, the walk-through detector, the speed gates; the restroom.
      o('sgVisitorDesk', 7, 12), o('dpBagScanner', 9, 12), o('lwSecurityGate', 11, 12), o('sgSpeedGate', 12, 12), o('sgSpeedGate', 14, 12),
      o('sgSpeedGate', 16, 12), o('sgSpeedGate', 18, 12), o('plant', 20, 12),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // Past it: the lift and the stairs.
      o('bldLift', 9, 9), o('stairs', 16, 9, 'left'), o('plant', 21, 9), o('plant', 23, 9),
      // The VIP 접견실: the flags, two sofas across the tea tables.
      o('flagStand', 2, 2), o('flagStand', 6, 2), o('sofa', 3, 3), o('hsTeaTable', 3, 4, 'left'), o('hsTeaTable', 4, 4, 'right'), o('sofa', 3, 5, 'up'), o('plant', 7, 2), o('plant', 2, 7),
      // The 회담장: the signing table and its backdrop; the negotiating table, lengthened to four a side, the foreign delegation's
      // chairs on its far side (they wait sat in the outer ones, and are talked with from the chair facing them), ours on the near
      // side; our flags behind us. At the far end the interpreters' booth, built into the wall as a real one is (2026-11-06): its
      // window in the wall looking down the table, the booth in its own room behind, walked into from the hall's corner.
      o('dpSigningTable', 9, 2),
      o('negotiationTable', 14, 4), o('dpTableWing', 17, 4),
      ...[14, 15, 16, 17].flatMap((x) => [o('dpDelegateChair', x, 3), o('dpDelegateChair', x, 5, 'up')]),
      o('flagStand', 15, 7, 'up'), o('dpBoothGlass', 19, 2, 'left'), o('dpBoothInWall', 21, 2), o('plant', 9, 7), o('plant', 21, 7),
      // The 연회장, laid out for a reception.
      o('receptionBuffet', 2, 9), o('ncHighTable', 3, 12), o('ncHighTable', 5, 13), o('plant', 5, 9),
      // Upstairs. The 과: the world clocks, two islands of desks, the 과장's desk at their head; the files.
      up('dpWorldClocks', 6, 2), up('bookshelf', 2, 2), up('plant', 17, 2),
      ...[3, 4, 5, 8, 9, 10].flatMap((x) => [up('diplomatDesk', x, 4, 'up'), up('diplomatDesk', x, 5)]),
      up('diplomatDesk', 13, 4, 'right'), up('whiteboard', 15, 7, 'up'), up('archiveShelf', 2, 7, 'up'), up('archiveShelf', 3, 7, 'up'), up('plant', 17, 7),
      // The 대사's office.
      up('diplomatDesk', 21, 3), up('flagStand', 19, 2), up('bookshelf', 23, 2), up('sofa', 19, 7, 'up'), up('armchair', 23, 6, 'left'),
      // The 보안 문서실: the pouch safe, the locked cabinets, the files, the shredder.
      up('dpPouchSafe', 2, 9), up('dpSecureCabinet', 3, 9), up('dpSecureCabinet', 4, 9), up('archiveShelf', 2, 13, 'up'), up('archiveShelf', 3, 13, 'up'), up('shredder', 5, 13, 'up'),
      // The lift; the pantry; the copy room.
      up('bldLift', 9, 9), up('plant', 23, 9),
      up('coffeeMaker', 7, 12), up('salWaterCooler', 8, 12), up('fridge', 14, 12), up('sofa', 11, 13, 'up'),
      up('copier', 16, 12), up('shredder', 17, 12), up('archiveShelf', 21, 12), up('archiveShelf', 22, 12), up('archiveShelf', 23, 12),
    ],
    coworkers: [
      { name: '권세라 대사', shirt: '#1a237e', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '장해온 서기관', shirt: '#37474f', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '로하진 통역관', shirt: '#6d4c41', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // Met by protocol and waiting in the 접견실, then at the negotiating table.
    clients: [{ noun: '외국 대표단', socials: ['cultureExchange', 'negotiateTreaty'], spots: [[2, 3], [5, 5], [13, 3], [18, 3]], max: 2, every: 70, patience: 160 }],
    alarm: { notice: '🌐 긴급 정상 회담이 열려요! 회담장 테이블로 가세요', done: '🤝 회담이 합의로 끝났어요! 성과가 크게 올라요', missed: '⌛ 회담에 늦어 차관이 대신 들어갔어요 (성과 감소)', interaction: 'emergencySummit', every: [200, 320], window: 60 },
    tasks: [task('translate', '외교 문서 번역·통역하기', ['translateDocs', 'dpInterpret'], 2), task('talks', '실무 협상하기', ['conductTalks']), task('delegates', '대표단 응대하기', ['cultureExchange', 'negotiateTreaty'], 2)],
    extra: [task('summit', '긴급 정상 회담', ['emergencySummit']), task('analysis', '정세 분석하기', ['studyRegion']), task('reception', '리셉션 주최하기', ['hostReception']), task('signing', '협정 서명식', ['dpSignTreaty']), task('pouch', '외교 행낭 챙기기', ['dpSealPouch']), boss('대사님께 보고하기')],
    work: ['translateDocs', 'studyRegion', 'conductTalks', 'emergencySummit', 'adjustFlags', 'hostReception', 'cultureExchange', 'negotiateTreaty', 'dpSignTreaty', 'dpInterpret', 'dpSealPouch'],
    skill: 'charisma',
    floors: { carpet: 'sageCarpet', wood: 'walnutWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  streamer: {
    careerId: 'streamer',
    windowless: ['gamingRig', 'stAsmrBooth', 'greenScreen', 'mukbangTable'],
    name: '스트리밍 하우스',
    icon: '🕹️',
    // A creators' studio on a floor of a building in town, as an MCN's is (2026-11-05, the layout audit, replacing a building on a lawn
    // with four streaming desks open in one room, windows in the studios and the restroom in the middle between the big room and the
    // lounge). Live, a mic picks up the next desk, so each streamer has a small room of their own with the door shut: three along the
    // back, foam on the wall behind the rig, the ON AIR light outside each in the corridor, and the ASMR booth in the same row. The shared
    // studios have no windows: the chroma-key studio with its lights and the skit costumes, and the mukbang kitchen studio. The editors
    // work in a room of their own under the live dashboard. In off the street, the lounge with the channel's neon, the merch shelf and
    // the sofa where a collab guest sits for the camera; the equipment store beside it; the restroom at the far end of the corridor.
    tiles: () =>
      building(
        [
          [2, 2, 4, 5, 'carpet'], [6, 2, 8, 5, 'carpet'], [10, 2, 12, 5, 'carpet'], [14, 2, 15, 5, 'carpet'], [17, 2, 23, 5, 'tile'],
          [2, 7, 20, 8, 'tile'], [22, 7, 23, 8, 'tile'], [2, 10, 4, 13, 'tile'], [6, 10, 13, 13, 'wood'], [15, 10, 18, 13, 'carpet'], [20, 10, 23, 13, 'tile'],
        ],
        [[3, 6], [7, 6], [11, 6], [14, 6], [19, 6], [21, 7], [8, 9], [16, 9], [20, 9], [5, 12], [12, 14]],
      ),
    restrooms: [[22, 7, 23, 8]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The streamers' rooms: the foam on the back wall, the rig; the ON AIR light by each door in the corridor. The ASMR booth.
      o('sgFoamWall', 2, 2), o('gamingRig', 3, 3), o('sgFoamWall', 6, 2), o('gamingRig', 7, 3), o('sgFoamWall', 10, 2), o('gamingRig', 11, 3), o('stAsmrBooth', 14, 2),
      o('tsOnAirSign', 4, 7), o('tsOnAirSign', 8, 7), o('tsOnAirSign', 12, 7), o('tsOnAirSign', 15, 7),
      // The chroma-key studio: the screen between its lights, the skit costumes.
      o('studioLight', 17, 3), o('greenScreen', 19, 2), o('studioLight', 22, 3), o('stCostumeRack', 22, 5, 'up'),
      // The restroom at the corridor's end.
      o('toilet', 23, 8, 'left'), o('sink', 23, 7, 'left'),
      // The equipment store: cases of cameras, lights and mics.
      o('sgRoadCases', 2, 10), o('sgRoadCases', 2, 13, 'up'), o('studioLight', 4, 13, 'up'),
      // The lounge: the channel's neon, the merch shelf, the collab camera turned to the sofa, the coffee.
      o('stNeonBoard', 10, 10), o('stMerchShelf', 12, 10), o('stCollabCam', 6, 11), o('sofa', 7, 13, 'up'), o('coffeeMaker', 13, 12, 'left'), o('plant', 6, 13),
      // The editing room: the editors' computers under the live dashboard.
      o('videoEditStation', 15, 10), o('videoEditStation', 17, 10), o('videoEditStation', 15, 13, 'up'), o('stDashboard', 17, 13, 'up'),
      // The mukbang kitchen studio: the cooker and the fridge, the table before the camera light.
      o('stove', 21, 10), o('fridge', 22, 10), o('mukbangTable', 21, 12), o('studioLight', 20, 13, 'up'), o('lamp', 23, 10),
    ],
    coworkers: [
      { name: '마예린 매니저', shirt: '#ff6f00', skin: '#f8d9c0', hair: '#5b3a1e', boss: true },
      { name: '탁준', shirt: '#00b8d4', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '봄이', shirt: '#f48fb1', skin: '#c99a6e', hair: '#a0522d' },
    ],
    // On the lounge's sofa before the collab camera.
    clients: [{ noun: '합방 손님', socials: ['collabStream', 'shoutout'], spots: [[7, 12], [8, 12]], max: 1, every: 90, patience: 150 }],
    alarm: { notice: '💸 대형 후원이 터졌어요! 게임 방송 장비로 리액션하세요', done: '💸 시청자들이 열광했어요! 성과가 크게 올라요', missed: '⌛ 리액션 타이밍을 놓쳤어요 (성과 감소)', interaction: 'donationEvent', every: [150, 260], window: 30 },
    tasks: [task('stream', '게임 방송하기', ['streamGame'], 2), task('chat', '채팅 읽어 주기', ['readChat']), task('edit', '영상 편집하기', ['editVideo'])],
    extra: [task('mukbang', '먹방 하기', ['mukbangStream']), task('skit', '콩트 촬영하기', ['filmSkit']), task('collab', '합방하기', ['collabStream', 'shoutout']), task('asmr', 'ASMR 방송하기', ['stAsmrStream']), task('merch', '팬 굿즈 포장하기', ['stPackMerch']), boss('매니저님과 콘텐츠 회의하기')],
    work: ['streamGame', 'readChat', 'donationEvent', 'editVideo', 'mukbangStream', 'filmSkit', 'collabStream', 'shoutout', 'stCheckStats', 'stAsmrStream', 'stPackMerch', 'stCollabSetup', 'stPickCostume'],
    skill: 'videoGaming',
    floors: { carpet: 'lilacCarpet', wood: 'oakWood', tile: 'monoTile' },
    wall: 'lavenderStripes',
  },
  extremeAthlete: {
    careerId: 'extremeAthlete',
    name: '익스트림 스포츠 센터',
    icon: '🪂',
    // A climbing gym with a skate park out of doors (2026-11-05, the layout audit, replacing one hall where climbing, a halfpipe and a
    // trampoline were mixed, a 2 × 2 wind tunnel with the toilet in its room, the staff's coffee and fridge among the visitors' chairs
    // and a plane on the lawn with no runway). Two sports, each where it's done: indoors the climbing hall, the lead and top-rope
    // walls along its back and the bouldering walls over their mats, a bench to rest on; out the side door the park on its concrete,
    // the mini ramp and the fun box with its rail, fenced, its gate on the pavement. The lobby inside the street door: the rental
    // counter facing it, the helmets and harnesses on their racks, the bench; off it the safety-briefing room where first-timers
    // watch the video and are shown the harness before they climb, and the stairs up to the changing room with its showers and the
    // restroom, the staff room and the gear room, where ropes are checked and rigs packed. A jump is made at the airfield: the team's
    // van takes the skydivers there from its bay by the park, straight out onto the street.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 13, 7, 'wood'], [2, 9, 5, 13, 'carpet'], [7, 9, 13, 13, 'tile']],
          [[12, 14], [10, 8], [6, 11], [14, 4]],
        ),
        // The park and the van's bay: open air east of the hall.
        Array.from({ length: 10 * 14 }, (_, i): [number, number, 'grass'] => [15 + (i % 10), 1 + Math.floor(i / 10), 'grass']),
      ),
      ...patch(
        upstairs([[2, 9, 7, 10, 'tile'], [2, 12, 3, 13, 'tile'], [5, 12, 7, 13, 'carpet'], [9, 9, 13, 13, 'wood']], [[2, 11], [8, 10], [8, 12]]),
        // Over the climbing hall and the park, open air.
        [
          ...Array.from({ length: 24 * 7 }, (_, i): [number, number, 'void'] => [1 + (i % 24), 1 + Math.floor(i / 24), 'void']),
          ...Array.from({ length: 10 * 7 }, (_, i): [number, number, 'void'] => [15 + (i % 10), 8 + Math.floor(i / 10), 'void']),
        ],
      ),
    ],
    restrooms: [[2, 30, 3, 31]],
    ground: [[15, 1, 21, 14, 'concrete'], [22, 5, 25, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The climbing hall: the rope walls, the bouldering walls over their mats, the helmet rack, the rest bench.
      o('climbingWall', 2, 2), o('climbingWall', 5, 2), o('exHelmetRack', 8, 2), o('exBoulderWall', 9, 2), o('exBoulderWall', 12, 5, 'left'), o('rxWaitBench', 2, 7, 'up'),
      // The safety-briefing room: the video, a rack to show the harness on, the chairs.
      o('exReplayScreen', 2, 9), o('exHelmetRack', 5, 9), o('diningChair', 2, 12, 'up'), o('diningChair', 3, 12, 'up'), o('diningChair', 5, 12, 'up'),
      // The lobby: the rental counter facing the door, the racks of rental helmets and harnesses, the bench, the stairs.
      o('exRentalCounter', 10, 12, 'up'), o('exHelmetRack', 7, 9), o('exHelmetRack', 8, 9), o('rxWaitBench', 7, 13, 'up'), o('plant', 12, 9), o('stairs', 13, 9, 'down'),
      // The skate park: the mini ramp, the fun box and rail, the fence; the team's van in its bay.
      o('exParkFence', 15, 1), o('skateRamp', 16, 2), o('exFunBox', 16, 6), o('skateRamp', 17, 10), o('rxWaitBench', 21, 5, 'left'), o('exCrewVan', 23, 9, 'left'),
      // Upstairs. The changing room and its showers; the restroom; the staff room; the gear room.
      up('shower', 2, 9), up('shower', 3, 9), up('athLockers', 4, 9), up('athLockers', 6, 9),
      up('toilet', 2, 13, 'up'), up('sink', 3, 13, 'up'),
      up('coffeeMaker', 5, 12, 'right'), up('sofa', 5, 13, 'up'), up('fridge', 7, 13, 'up'),
      up('gearBench', 10, 9), up('exHelmetRack', 9, 13, 'up'), up('archiveShelf', 9, 9), up('treadmill', 11, 12),
    ],
    coworkers: [
      { name: '한바람 코치', shirt: '#e65100', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '도윤슬', shirt: '#00c853', skin: '#f8d9c0', hair: '#a0522d' },
      { name: '석하늘', shirt: '#2962ff', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // First-timers in the briefing room and at the walls, and at the park.
    clients: [{ noun: '체험객', socials: ['coachBeginner', 'safetyBrief'], spots: [[3, 11], [6, 5], [8, 5], [18, 5]], max: 2, every: 60, patience: 150 }],
    alarm: { notice: '🪂 날씨가 완벽해요! 비행장에서 점프할 수 있어요. 팀 승합차로 가세요', done: '🪂 완벽하게 착지했어요! 성과가 크게 올라요', missed: '⌛ 승합차가 다른 선수만 태우고 떠났어요 (성과 감소)', interaction: 'skydiveJump', every: [200, 320], window: 45 },
    tasks: [task('climb', '암벽 오르기', ['climbWall', 'exBoulderProblem'], 2), task('gear', '낙하산 접기', ['packParachute']), task('coach', '체험객 지도하기', ['coachBeginner', 'safetyBrief', 'exRentGear'], 2)],
    extra: [task('skate', '스케이트보드 묘기', ['skateTricks']), task('jump', '스카이다이빙 점프', ['skydiveJump']), task('ropes', '로프·안전 장비 점검', ['checkRopes', 'exGearUp'], 2), task('replay', '훈련 영상 분석하기', ['exReviewReplay']), boss('코치님께 훈련 기록 보여 드리기')],
    work: ['climbWall', 'skateTricks', 'packParachute', 'checkRopes', 'workout', 'skydiveJump', 'coachBeginner', 'safetyBrief', 'exBoulderProblem', 'exRentGear', 'exGearUp', 'exReviewReplay'],
    skill: 'fitness',
    floors: { wood: 'oakWood', tile: 'slateStone', carpet: 'sageCarpet' },
    wall: 'creamPlain',
  },
  therapist: {
    careerId: 'therapist',
    name: '심리 상담 센터',
    icon: '🧠',
    // A 심리상담센터 on an upper floor of an office block (2026-11-05, the layout audit, replacing a building on a lawn whose biggest
    // room was the group room with the sand tray in it, one counselling room, a self-check kiosk with nobody at the desk and no test
    // room). As a real one it is mostly small rooms with the door shut: in from the lift lobby (the small nameplate), the reception
    // desk where the first visit's questionnaire is filled in and the next session booked, the quiet waiting room with its sofas set
    // so nobody faces anybody, the fish; off it the test room (a desk, the client's chair, the test materials) and the restroom. A
    // quiet corridor behind runs past three counselling rooms of about 3 평, each with its two armchairs set at an angle, the table,
    // the tissues and the clock; the play therapy room (the sand tray, the shelves of figures, the toy box, a low chair); at its end
    // the one group room (the circle of chairs, the mats) and the counsellors' office with the crisis line, its restroom.
    tiles: () =>
      patch(
        building(
          [
            [2, 2, 4, 4, 'carpet'], [6, 2, 8, 4, 'carpet'], [10, 2, 12, 4, 'carpet'], [14, 2, 18, 4, 'wood'], [2, 6, 18, 6, 'wood'], [20, 2, 23, 6, 'carpet'],
            [2, 8, 12, 13, 'carpet'], [14, 8, 16, 10, 'wood'], [14, 12, 15, 13, 'tile'], [18, 8, 23, 13, 'wood'],
          ],
          [[12, 14], [3, 5], [7, 5], [11, 5], [16, 5], [19, 6], [12, 7], [18, 7], [13, 9], [13, 12]],
        ),
        [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
      ),
    restrooms: [[22, 12, 23, 13], [14, 12, 15, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // Three counselling rooms, the armchairs at an angle in each.
      o('thCounselPair', 2, 2), o('thCounselPair', 6, 2), o('thCounselPair', 10, 2),
      // The play therapy room: the sand tray, the shelves of figures, the toy box, a low chair.
      o('sandTray', 14, 2), o('toyShelf', 15, 2), o('toyShelf', 16, 2), o('toyBox', 18, 2), o('diningChair', 18, 4, 'left'),
      // The group room: the circle, the mats; the corridor's plant.
      o('thGroupCircle', 20, 2), o('meditationMat', 21, 6, 'up'), o('plant', 23, 2), o('plant', 2, 6),
      // The waiting room: the reception desk by the door, the sofas set apart, the fish.
      o('thIntakeKiosk', 9, 12, 'up'), o('sofa', 2, 9, 'right'), o('sofa', 4, 13, 'up'), o('aquarium', 6, 8), o('bookshelf', 9, 8), o('salWaterCooler', 7, 13, 'up'), o('plant', 2, 12), o('plant', 11, 8),
      // The test room: the desk, the client's chair, the test materials.
      o('notesDesk', 15, 8), o('drWaitSeat', 15, 10, 'up'), o('archiveShelf', 16, 8),
      // The restroom.
      o('toilet', 15, 12, 'left'), o('sink', 15, 13, 'left'),
      // The counsellors' office: the desks, the crisis line, the books, the coffee, a sofa; its restroom.
      o('notesDesk', 19, 8), o('notesDesk', 20, 8), o('notesDesk', 21, 8), o('crisisPhone', 23, 9, 'left'), o('bookshelf', 18, 11, 'right'), o('coffeeMaker', 18, 13, 'right'), o('sofa', 20, 11), o('plant', 23, 10),
      o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
      // The nameplate by the door.
      o('thStreetSign', 14, 15),
    ],
    coworkers: [
      { name: '온다정 센터장', shirt: '#8d6e63', skin: '#f8d9c0', hair: '#5b3a1e', boss: true },
      { name: '이해솔 상담사', shirt: '#a5d6a7', skin: '#eac09a', hair: '#2b1b10' },
      { name: '모은결 상담사', shirt: '#b39ddb', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // On the waiting room's sofas, and at the test room's desk.
    clients: [{ noun: '내담자', socials: ['talkTherapy', 'cbtSession'], spots: [[3, 9], [4, 12], [5, 12], [16, 10]], max: 2, every: 70, patience: 180 }],
    alarm: { notice: '📞 위기 상담 전화가 왔어요! 상담 전화기로 가세요', done: '📞 위기의 내담자가 안정을 찾았어요. 성과가 크게 올라요', missed: '⌛ 전화를 늦게 받아 다른 상담사가 연결됐어요 (성과 감소)', interaction: 'crisisCall', every: [180, 300], window: 30 },
    // The 상담 인턴 does intake interviews, one a day, not a full caseload (2026-10-26, at the user's request).
    tasks: [gated(task('sessions', '상담하기', ['talkTherapy', 'cbtSession', 'thListen', 'thReframe'], 3), { minLevel: 1 }, task('sessions', '초기 면접하기', ['talkTherapy', 'thIntake'])), task('notes', '상담 기록 정리하기', ['writeNotes']), task('study', '사례 연구하기', ['studyCase'])],
    extra: [task('crisis', '위기 상담 전화', ['crisisCall']), task('meditation', '명상 지도하기', ['leadMeditation']), task('play', '놀이 치료 준비하기', ['prepPlayTherapy']), task('group', '마음 나눔 집단 진행하기', ['thGroup']), boss('센터장님과 사례 회의하기')],
    work: ['writeNotes', 'studyCase', 'crisisCall', 'leadMeditation', 'prepPlayTherapy', 'talkTherapy', 'cbtSession', 'thListen', 'thReframe', 'thGroup', 'thIntake'],
    skill: 'charisma',
    floors: { carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'mintDots',
  },
  filmmaker: {
    careerId: 'filmmaker',
    windowless: ['screeningScreen', 'fmAdrBooth'],
    name: '영화 제작사',
    icon: '🎥',
    // A film production company on two floors of an office building (2026-11-05, the layout audit, replacing a building on a lawn
    // whose office had a film camera on its dolly and a test set beside the writers' desks, an ADR booth in a room with the sofa and
    // the coffee, no meeting room or producer's office, a screening room with windows and a lobby of chairs in a row). A real 제작사
    // doesn't shoot in its office (that's the studio and the location) and does its final mix at a post house; it develops, casts
    // and checks the cut. Downstairs off the lift lobby with the posters: the small screening room, dark and windowless, its seats in
    // rows; the audition room (the casting table the director and the casting director sit behind, the tripod camera and a light on
    // the actor's mark), the actors waiting on chairs at its door in the corridor; the pantry, the store of props and costume
    // references, the restroom and the stairs. Upstairs the production office (the writers' and producers' desks, the shoot
    // schedule), the meeting room where the script is read and the storyboard argued over, the producer's office, the editing room
    // with the ADR booth behind its glass, and the library of scripts and references.
    tiles: () => [
      ...building(
        [[2, 2, 9, 7, 'carpet'], [11, 2, 17, 7, 'wood'], [19, 2, 23, 7, 'tile'], [2, 9, 12, 13, 'tile'], [14, 9, 23, 10, 'tile'], [14, 12, 20, 13, 'tile'], [22, 12, 23, 13, 'tile']],
        [[6, 8], [14, 8], [21, 8], [13, 10], [16, 11], [23, 11], [12, 14]],
      ),
      ...upstairs(
        [[2, 2, 11, 7, 'wood'], [13, 7, 13, 10, 'tile'], [14, 9, 23, 10, 'tile'], [15, 2, 19, 7, 'wood'], [21, 2, 23, 7, 'wood'], [2, 9, 4, 13, 'carpet'], [6, 9, 11, 13, 'carpet'], [15, 12, 23, 13, 'wood']],
        [[12, 7], [17, 8], [21, 8], [5, 11], [12, 10], [16, 11]],
      ),
    ],
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The screening room: the screen, two rows of seats either side of the aisle.
      o('screeningScreen', 4, 2),
      o('fmCinemaSeat', 3, 5, 'up'), o('fmCinemaSeat', 4, 5, 'up'), o('fmCinemaSeat', 5, 5, 'up'), o('fmCinemaSeat', 7, 5, 'up'), o('fmCinemaSeat', 8, 5, 'up'),
      o('fmCinemaSeat', 3, 7, 'up'), o('fmCinemaSeat', 4, 7, 'up'), o('fmCinemaSeat', 5, 7, 'up'), o('fmCinemaSeat', 7, 7, 'up'), o('fmCinemaSeat', 8, 7, 'up'),
      // The audition room: the casting table and the chairs behind it, the actor's mark with the backdrop, the tripod camera, a light.
      o('diningChair', 12, 3), o('diningChair', 13, 3), o('diningChair', 14, 3), o('mdCastingTable', 12, 4),
      o('fmCastingCorner', 11, 6, 'up'), o('studioCamera', 15, 5, 'left'), o('studioLight', 16, 3), o('plant', 17, 7),
      // The pantry.
      o('coffeeMaker', 19, 2), o('fridge', 20, 2), o('salWaterCooler', 23, 2), o('sofa', 22, 7, 'up'), o('plant', 19, 7),
      // The lift lobby: the lift, the posters of the company's films, the reception.
      o('bldLift', 2, 10, 'right'), o('fmPosterWall', 8, 9), o('sgVisitorDesk', 5, 13, 'up'), o('plant', 12, 9),
      // The corridor: the actors' chairs at the audition room's door, the stairs up.
      o('fmAuditionChair', 15, 9), o('fmAuditionChair', 17, 9), o('fmAuditionChair', 18, 9), o('stairs', 19, 10, 'left'),
      // The store of props and costume references; the restroom.
      o('fmCostumeRack', 14, 12), o('sgRoadCases', 17, 13, 'up'), o('archiveShelf', 20, 12, 'left'),
      o('toilet', 23, 13, 'left'), o('sink', 22, 13, 'up'),
      // Upstairs, the production office: the writers' desks in two rows, the shoot schedule, the files, the copier.
      up('screenplayDesk', 3, 2), up('screenplayDesk', 4, 2), up('screenplayDesk', 6, 2), up('screenplayDesk', 7, 2),
      up('screenplayDesk', 3, 5), up('screenplayDesk', 4, 5), up('screenplayDesk', 6, 5), up('screenplayDesk', 7, 5),
      up('fmScheduleBoard', 9, 2), up('archiveShelf', 11, 4, 'left'), up('copier', 9, 7, 'up'),
      // The meeting room: the table and its chairs, the storyboard wall, the whiteboard.
      up('salMeetingTable', 15, 4), up('salMeetingChair', 15, 3), up('salMeetingChair', 16, 3), up('salMeetingChair', 17, 3),
      up('salMeetingChair', 15, 5, 'up'), up('salMeetingChair', 16, 5, 'up'), up('salMeetingChair', 17, 5, 'up'),
      up('storyboardWall', 19, 3, 'left'), up('whiteboard', 18, 7, 'up'),
      // The producer's office.
      up('bookshelf', 21, 2), up('officeDesk', 22, 4), up('bookshelf', 23, 2), up('sofa', 22, 7, 'up'),
      // The ADR booth behind its glass; the editing room.
      up('fmAdrBooth', 2, 10), up('sgBoothWindow', 4, 12, 'left'),
      up('sgControlWindow', 6, 12, 'right'), up('editingSuite', 7, 9), up('editingSuite', 10, 9),
      // The library of scripts and references.
      up('archiveShelf', 18, 12), up('archiveShelf', 19, 12), up('archiveShelf', 20, 12), up('bookshelf', 21, 12), up('plant', 23, 13),
    ],
    coworkers: [
      { name: '나영길 제작자', shirt: '#3e2723', skin: '#eac09a', hair: '#9e9e9e', boss: true },
      { name: '편세윤 촬영감독', shirt: '#455a64', skin: '#f8d9c0', hair: '#1a1a1a' },
      { name: '구다온 편집기사', shirt: '#7e57c2', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // Waiting on the chairs at the audition room's door.
    clients: [{ noun: '오디션 배우', socials: ['auditionActor', 'directActor'], spots: [[15, 10], [17, 10]], max: 2, every: 60, patience: 150 }],
    alarm: { notice: '🎞️ 시사회 시간이에요! 상영관 스크린 앞으로 가세요', done: '🎞️ 시사회가 끝나고 박수가 쏟아졌어요! 성과가 크게 올라요', missed: '⌛ 시사회에 늦어 제작자가 대신 무대에 섰어요 (성과 감소)', interaction: 'hostPremiere', every: [200, 320], window: 60 },
    tasks: [task('script', '시나리오 쓰기', ['writeScreenplay'], 2), task('storyboard', '콘티 그리기', ['drawStoryboard']), task('edit', '영화 편집하기', ['editFilm'])],
    extra: [task('audition', '오디션 보기', ['auditionActor', 'directActor', 'fmReviewHeadshots'], 2), task('premiere', '시사회 진행하기', ['hostPremiere']), task('grade', '색 보정하기', ['colorGrade']), task('prep', '촬영 준비하기', ['fmCallSheet', 'fmCheckProps']), task('adr', '후시 녹음하기', ['fmRecordAdr']), boss('제작자님과 예산 회의하기')],
    // No shooting at the office (2026-11-05, the layout audit): the camera on its dolly and the test set (reviewTakes, fmBlockScene) went.
    work: ['writeScreenplay', 'drawStoryboard', 'editFilm', 'colorGrade', 'reviewDailies', 'hostPremiere', 'auditionActor', 'directActor', 'fmReviewHeadshots', 'fmCallSheet', 'fmCheckProps', 'fmRecordAdr', 'fmWatchCut'],
    skill: 'writing',
    floors: { carpet: 'slateStone', tile: 'monoTile', wood: 'walnutWood' },
    wall: 'navyWainscot',
  },
  model: {
    careerId: 'model',
    name: '모델 에이전시',
    icon: '👠',
    // A 모델 에이전시 on a floor of an office building (2026-11-05, the layout audit, replacing a building on a lawn with a show runway
    // between two rows of seats in its hall, no office, a "gym" of treadmills mixed up with a shower, a fridge and a toilet, and the
    // coffee machine in the lobby). As a real one: in from the street under the agency's canopy, the lobby with the front desk, the wall
    // of the agency's models' comp cards and a sofa; off it the managers' office (the desks, the schedule board, the profile books and
    // the comp card printer, where the models' work is booked), the casting room (the table the casting directors sit behind, the
    // model on the X in front of it), the changing room (the vanities, the rack, the fitting podium, a shower) and the pantry with the
    // restroom. Behind the office the walking room: a taped line along each mirror wall, the backstage rack for quick changes and one
    // treadmill; behind the changing room the small profile studio (the paper sweep, two lights, the props shelf).
    tiles: () =>
      building(
        [
          [2, 2, 9, 6, 'wood'], [11, 2, 16, 6, 'carpet'], [18, 2, 23, 6, 'tile'],
          [2, 8, 10, 13, 'carpet'], [12, 8, 16, 13, 'wood'], [18, 8, 23, 10, 'tile'], [18, 12, 20, 13, 'tile'], [22, 12, 23, 13, 'tile'],
        ],
        [[6, 7], [13, 7], [18, 7], [11, 10], [17, 9], [17, 12], [21, 13], [12, 14]],
      ),
    restrooms: [[22, 12, 23, 13]],
    windowless: ['posingSpot'],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The walking room: a line along each mirror wall, the backstage rack, the treadmill.
      o('catwalk', 2, 2), o('mdBackstageRack', 7, 2), o('treadmill', 9, 2), o('catwalk', 2, 6, 'up'), o('plant', 9, 6),
      // The casting room: the casting directors' chairs behind the table, the model's X in front.
      o('diningChair', 12, 3), o('diningChair', 13, 3), o('diningChair', 14, 3), o('mdCastingTable', 12, 4), o('plant', 16, 6),
      // The profile studio.
      o('studioLight', 18, 2), o('posingSpot', 19, 2), o('studioLight', 21, 2), o('phPropShelf', 23, 2, 'left'), o('makeupMirror', 23, 6, 'left'),
      // The managers' office: the desks, the schedule board, the profile books, the comp printer, the head's desk.
      o('officeDesk', 3, 9), o('officeDesk', 4, 9), o('officeDesk', 7, 9), o('officeDesk', 8, 9),
      o('whiteboard', 2, 11, 'right'), o('archiveShelf', 2, 13, 'right'), o('mdCompPrinter', 5, 13, 'up'), o('officeDesk', 9, 12, 'up'), o('plant', 10, 13),
      // The lobby: the comp card wall, the front desk, the sofa.
      o('mdCompBoard', 14, 8), o('plant', 16, 8), o('mdReception', 14, 11, 'up'), o('sofa', 14, 13, 'up'),
      // The changing room; the pantry; the restroom.
      o('makeupMirror', 19, 8), o('makeupMirror', 20, 8), o('wardrobeRack', 21, 8), o('shower', 23, 8), o('mdFittingPodium', 19, 10, 'up'),
      o('coffeeMaker', 19, 12), o('fridge', 20, 12), o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
      // The street: the canopy and the building's sign.
      o('mdStreetSign', 10, 15),
    ],
    coworkers: [
      { name: '라희원 실장', shirt: '#212121', skin: '#f8d9c0', hair: '#1a1a1a', boss: true },
      { name: '서도연 모델', shirt: '#fafafa', skin: '#eac09a', hair: '#a0522d' },
      { name: '강이안 모델', shirt: '#9e9e9e', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // Behind the casting table, in the casting room.
    clients: [{ noun: '캐스팅 디렉터', socials: ['castingMeeting', 'brandPitch'], spots: [[12, 2], [13, 2], [14, 2]], max: 1, every: 80, patience: 150 }],
    // The show itself is at the venue; the agency calls the model in for the last rehearsal of the walk.
    alarm: { notice: '👠 오늘 저녁 쇼 직전 리허설! 워킹 연습실로 가세요', done: '👠 리허설을 완벽하게 마쳤어요! 성과가 크게 올라요', missed: '⌛ 리허설에 늦어 다른 모델이 쇼에 섰어요 (성과 감소)', interaction: 'walkFashionShow', every: [200, 320], window: 45 },
    tasks: [task('walk', '워킹 연습하기', ['catwalkPractice'], 2), task('pose', '포즈 연습하기', ['practicePoses']), task('workout', '운동하기', ['workout'])],
    extra: [task('show', '쇼 직전 워킹 리허설', ['walkFashionShow']), task('profile', '프로필 촬영하기', ['portfolioShoot', 'mdPrintComps']), task('casting', '캐스팅 미팅', ['castingMeeting', 'brandPitch', 'mdGoSee']), task('fitting', '피팅 받기', ['tryOutfits', 'mdMeasure']), task('backstage', '백스테이지 준비하기', ['mdQuickChange', 'getMakeup']), boss('실장님께 스케줄 확인받기')],
    work: ['catwalkPractice', 'walkFashionShow', 'practicePoses', 'portfolioShoot', 'tryOutfits', 'getMakeup', 'practiceExpressions', 'workout', 'castingMeeting', 'brandPitch', 'mdGoSee', 'mdMeasure', 'mdQuickChange', 'mdPrintComps'],
    skill: 'charisma',
    floors: { wood: 'oakWood', carpet: 'lilacCarpet', tile: 'monoTile' },
    wall: 'creamPlain',
  },
  toymaker: {
    careerId: 'toymaker',
    name: '장난감 공방',
    icon: '🧸',
    // A toy workshop in a street-front shop unit (2026-11-04, the layout audit, replacing a workshop with the saw beside the sewing and
    // a toilet among the benches, behind a corridor "shop" of waiting chairs and a sofa). The shop is at the front: the window display
    // either side of the door, the shelves on the walls, a display table to pick toys up from, the order and demo counter, the class
    // table where children make something, the till by the door. Behind it, seen from the shop, the workroom where the toys are
    // painted, sewn and wired: the paint bench and the drying rack, the sewing table, the soldering and the smart-toy bench. The saw
    // and the carving bench are shut in their own small room off it, for the dust and the noise. On the right: the play-test room,
    // the packing and store room with the parcel shelves, the small staff room with its restroom.
    tiles: () =>
      building(
        [[2, 2, 5, 7, 'wood'], [7, 2, 15, 7, 'wood'], [2, 9, 15, 13, 'carpet'], [17, 2, 23, 5, 'carpet'], [17, 7, 23, 9, 'wood'], [17, 11, 20, 13, 'wood'], [22, 12, 23, 13, 'tile']],
        [[6, 5], [12, 8], [16, 4], [16, 7], [19, 10], [16, 12], [21, 12], [12, 14]],
      ),
    restrooms: [[22, 12, 23, 13]],
    objects: [
      // The wood room: the scroll saw and the carving bench, behind a door.
      o('tmScrollSaw', 2, 2), o('toyWorkbench', 2, 5),
      // The workroom: the paint bench, the sewing, the soldering; the smart-toy bench and the drying rack.
      o('toyWorkbench', 8, 2), o('plushTable', 11, 2), o('circuitStation', 14, 2), o('tmRobotBench', 8, 5), o('tmDryingRack', 11, 5),
      // The shop: shelves, the order and demo counter, the display table, the class table, the window, the till.
      o('toyShelf', 2, 10, 'right'), o('toyShelf', 2, 11, 'right'), o('toyShelf', 15, 9, 'left'), o('toyShelf', 15, 10, 'left'),
      o('tmCustomerChair', 5, 10), o('tmCustomerChair', 6, 10), o('tmDisplayTable', 10, 10),
      o('craftTable', 6, 12, 'up'), o('diningChair', 6, 13, 'up'), o('diningChair', 7, 13, 'up'),
      o('tmShopWindow', 2, 13, 'up'), o('tmShopWindow', 9, 13, 'up'), o('checkoutCounter', 14, 12, 'left'),
      // The play-test room; the packing and store room; the staff room and its restroom.
      o('playtestMat', 18, 3), o('toyBox', 21, 2), o('plant', 23, 5),
      o('wrapStation', 18, 7), o('cvParcelRack', 21, 7), o('cvParcelRack', 22, 9, 'up'),
      o('coffeeMaker', 17, 11), o('fridge', 18, 11), o('sofa', 17, 13, 'up'),
      o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
    ],
    coworkers: [
      { name: '조목수 공방장', shirt: '#795548', skin: '#eac09a', hair: '#9e9e9e', boss: true },
      { name: '나인형', shirt: '#f48fb1', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '하솜', shirt: '#81d4fa', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // At the order and demo counter, and by the class table.
    clients: [{ noun: '어린이 손님', socials: ['demoToy', 'takeToyOrder'], spots: [[5, 11], [6, 11], [8, 13]], max: 3, every: 50, patience: 150, age: 'child' }],
    alarm: { notice: '🎁 크리스마스 대량 주문이 들어왔어요! 포장대로 가세요', done: '🎁 주문을 제시간에 다 보냈어요! 성과가 크게 올라요', missed: '⌛ 주문이 밀려 배송이 늦어졌어요 (성과 감소)', interaction: 'rushOrder', every: [200, 320], window: 60 },
    tasks: [task('carve', '나무 장난감 깎기', ['carveToy', 'tmCutBlank'], 2), task('paint', '장난감 색칠하기', ['paintToy', 'tmCheckFinish']), task('plush', '봉제 인형 만들기', ['sewPlush'])],
    extra: [task('test', '장난감 놀이 테스트', ['playtestToys', 'tmTuneToy']), task('rush', '긴급 주문 처리', ['rushOrder']), task('kids', '어린이 손님 응대', ['demoToy', 'takeToyOrder', 'tmDemoToy', 'tmTakeOrder'], 2), boss('공방장님께 신제품 보여 드리기')],
    work: ['carveToy', 'paintToy', 'sewPlush', 'solderCircuit', 'playtestToys', 'wrapGifts', 'rushOrder', 'arrangeToys', 'demoToy', 'takeToyOrder', 'tmCutBlank', 'tmCheckFinish', 'tmTuneToy', 'tmDemoToy', 'tmTakeOrder'],
    skill: 'handiness',
    floors: { wood: 'oakWood', carpet: 'lilacCarpet' },
    wall: 'mintDots',
  },
  baker: {
    careerId: 'baker',
    name: '베이커리',
    icon: '🥐',
    // A 동네 빵집 in a row of shops on the street (2026-11-05, the layout audit, replacing a building on a lawn whose bakehouse was four
    // times its corridor of a shop, behind a blind wall and one door). The unit's front is glass, with the sign and the awning over it
    // and the stationer's next door. In through the glass door the shop is half the floor: the 평대 of loaves by the window where the
    // trays and tongs are taken, the bread rack on the side wall, the packing counter with the till (계산대) and the bread and cake
    // cases facing the door, the staff behind them, a café table under the bakehouse glass and the customers' restroom. Behind the counter the bakehouse
    // the other half, seen through the glass over the 평대, with the staff's way through by the till: the proofer and the three deck
    // ovens along the back, the rack trolley of cooling trays by the last, the dough fridge and the sink; the benches with the mixer
    // between them and the slicer at their end. Off it the cake room (the decorating table and the cake fridge) and the dry store with
    // the flour sacks, the fridge and freezer and the staff's lockers.
    tiles: () =>
      shopUnit(
        19,
        1,
        [[2, 2, 13, 8, 'tile'], [15, 2, 18, 4, 'tile'], [15, 6, 18, 7, 'tile'], [2, 9, 18, 13, 'wood']],
        [[14, 3], [14, 7], [16, 13], [12, 14]],
        [[16, 11, 'wall'], [17, 11, 'wall'], [18, 11, 'wall'], [16, 12, 'wall'], [17, 12, 'tile'], [18, 12, 'tile'], [17, 13, 'tile'], [18, 13, 'tile']],
      ),
    restrooms: [[17, 12, 18, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The bakehouse: the proofer, the deck ovens, the cooling rack, the sink, the dough fridge; the benches, the mixer, the slicer;
      // the glass to the shop, open by the till.
      o('bkProofer', 2, 2), o('bakeryOven', 3, 2), o('bakeryOven', 4, 2), o('bakeryOven', 5, 2), o('bkCoolingRack', 6, 2), o('kitchenSink', 8, 2), o('bkCoolingRack', 10, 2), o('fridge', 12, 2),
      o('doughTable', 3, 5), o('bkMixer', 6, 5), o('doughTable', 8, 5), o('bkSlicer', 10, 5),
      o('bkGlassWall', 2, 8), o('bkGlassWall', 4, 8), o('bkGlassWall', 6, 8), o('bkGlassWall', 8, 8), o('bkGlassWall', 10, 8),
      // The dry store and the lockers; the cake room.
      o('fridge', 15, 2), o('fridge', 16, 2), o('bkFlourStore', 17, 2), o('gjLockers', 17, 4, 'up'),
      o('decorTable', 16, 6), o('fridge', 18, 6),
      // The shop: the counter and the cases facing the door, the 평대 by the window, the bread rack, the café table; the restroom.
      o('bkCheckout', 12, 10, 'up'), o('displayCase', 14, 10, 'up'),
      o('bkBreadIsland', 3, 12, 'up'), o('bkBreadIsland', 6, 12, 'up'), o('bkBreadIsland', 9, 12, 'up'), o('displayCase', 2, 9, 'right'),
      o('displayCase', 16, 10, 'up'), o('diningTable', 9, 9), o('diningChair', 9, 10, 'up'), o('diningChair', 10, 10, 'up'), o('plant', 2, 13),
      o('toilet', 18, 13, 'left'), o('sink', 18, 12, 'left'),
      // The street: the front, the stationer's next door.
      o('bkShopFront', 1, 15), o('bkNeighbor', 20, 6),
    ],
    coworkers: [
      { name: '방미소 사장', shirt: '#fafafa', skin: '#f8d9c0', hair: '#5b3a1e', boss: true },
      { name: '하다온', shirt: '#ffe0b2', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '채윤슬', shirt: '#f8bbd0', skin: '#c99a6e', hair: '#a0522d' },
    ],
    // Customers at the bread case, the 평대 and the till.
    clients: [{ noun: '빵집 손님', socials: ['recommendBread', 'takeCakeOrder'], spots: [[3, 10], [8, 11], [13, 11], [15, 11], [5, 13]], max: 3, every: 30, patience: 120 }],
    alarm: { notice: '🎂 급한 맞춤 케이크 주문! 데코 테이블에서 완성하세요', done: '🎂 손님이 케이크를 보고 감탄했어요! 성과가 크게 올라요', missed: '⌛ 케이크를 제시간에 못 끝냈어요 (성과 감소)', interaction: 'customCakeRush', every: [180, 300], window: 60 },
    tasks: [task('bread', '빵 굽기', ['bakeBread'], 2), task('dough', '반죽하기', ['kneadDough', 'bkMixDough']), task('customers', '빵집 손님 응대', ['recommendBread', 'takeCakeOrder'], 2)],
    extra: [
      task('cake', '케이크 데코레이션', ['decorateCake']), task('rush', '맞춤 케이크 완성', ['customCakeRush']), task('display', '진열대 채우기', ['arrangeDisplay'], 2),
      task('proof', '발효 확인하고 쿠프 내기', ['bkProofCheck', 'bkScoreLoaves'], 2), task('cool', '빵 식히고 식빵 썰기', ['bkCoolRack', 'bkSliceBread'], 2), task('pack', '포장·계산', ['bkPackCheckout']),
      boss('사장님께 신메뉴 맛보여 드리기'),
    ],
    work: ['bakeBread', 'kneadDough', 'shapePastry', 'decorateCake', 'customCakeRush', 'arrangeDisplay', 'recommendBread', 'takeCakeOrder', 'bkScoreLoaves', 'bkMixDough', 'bkProofCheck', 'bkCoolRack', 'bkSliceBread', 'bkPackCheckout'],
    skill: 'cooking',
    floors: { tile: 'creamTile', wood: 'oakWood' },
    wall: 'roseStripes',
  },
  dentist: {
    careerId: 'dentist',
    name: '치과',
    icon: '🦷',
    // A neighbourhood 치과의원 in a street-front unit (2026-11-05, the layout audit, replacing a building on a lawn with three closed
    // rooms of one chair each, the panoramic X-ray loose in a corner, sterilizers scattered among the chairs, the lab bench beside the
    // surgery chair and the only toilet in the staff room). As a real one: off the pavement into the waiting room, the front desk
    // facing it (check-in, payment, the next booking), the seats, the giant tooth and the smile board; off it the 상담실 where the
    // coordinator goes over the treatment plan and the bill on the screen, the patients' restroom and the lead-lined 파노라마실.
    // Through the door behind the desk the open 진료실: three unit chairs side by side, a low partition between each, the computer
    // at each chair's left, the light box and the supply cabinet along the back. Behind it a back corridor to the 소독실 (two
    // autoclaves and the wash sink), the small 기공실 (the bench for models and the shelf of boxes for the outside dental lab, where
    // most work goes) and the 수술실 for implants with its own chair and scanner; the staff room with the lockers at the end.
    tiles: () =>
      building(
        [
          [2, 2, 11, 7, 'tile'], [13, 2, 15, 4, 'tile'], [17, 2, 19, 4, 'tile'], [21, 2, 23, 4, 'tile'], [13, 6, 23, 6, 'tile'],
          [2, 9, 4, 13, 'carpet'], [6, 9, 16, 13, 'wood'], [18, 9, 19, 10, 'tile'], [18, 12, 19, 13, 'tile'], [21, 8, 23, 13, 'wood'],
        ],
        [[12, 14], [8, 8], [12, 6], [14, 5], [17, 5], [21, 5], [22, 7], [5, 11], [17, 10], [17, 12]],
      ),
    restrooms: [[18, 9, 19, 10]],
    windowless: ['dtPanoXray'],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The open 진료실: three chairs, the computer at each one's left, a partition between them; the light box, the cart, the basin and the supplies along the back.
      o('medStation', 2, 2), o('dentalChair', 3, 2), o('dtPartition', 5, 2), o('medStation', 6, 2), o('dentalChair', 7, 2), o('dtPartition', 9, 2), o('medStation', 10, 2), o('dentalChair', 11, 2),
      o('xrayViewer', 2, 7, 'up'), o('drTreatCart', 5, 7), o('nsHandSink', 6, 7, 'up'), o('medCabinet', 9, 7, 'up'), o('plant', 11, 7),
      // Off the back corridor: the 소독실, the 기공실 with the outside lab's boxes, the 수술실.
      o('sterilizer', 13, 2), o('sterilizer', 14, 2), o('nsHandSink', 15, 2),
      o('dentalLabBench', 17, 2), o('cvParcelRack', 19, 2, 'left'),
      o('medStation', 21, 2), o('dentalChair', 22, 2), o('dtOralScanner', 23, 2), o('plant', 23, 6),
      // The 상담실: the table, the patient's chairs, the coordinator's screen.
      o('dtConsultTable', 2, 11), o('diningChair', 2, 12, 'up'), o('diningChair', 3, 12, 'up'), o('medStation', 4, 9, 'left'),
      // The waiting room: the front desk under the door to the 진료실, the seats, the fish, the smile board, the giant tooth.
      o('dtFrontDesk', 10, 10, 'up'), o('aquarium', 6, 9), o('dtSmileBoard', 13, 9), o('dtToothModel', 15, 9), o('plant', 12, 9),
      o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 8, 13, 'up'), o('drWaitSeat', 9, 13, 'up'),
      o('drWaitSeat', 14, 13, 'up'), o('drWaitSeat', 15, 13, 'up'), o('drWaitSeat', 16, 13, 'up'),
      // The 파노라마실; the restroom.
      o('dtPanoXray', 19, 13, 'left'),
      o('toilet', 19, 9, 'left'), o('sink', 19, 10, 'left'),
      // The staff room: the coffee, the fridge, the sofa, the lockers.
      o('coffeeMaker', 23, 9, 'left'), o('fridge', 23, 10, 'left'), o('sofa', 21, 10, 'right'), o('clsLockers', 21, 13, 'up'), o('plant', 23, 13),
      // The sign on the pavement.
      o('dtStreetSign', 9, 15),
    ],
    coworkers: [
      { name: '윤치훈 원장', shirt: '#eceff1', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '서미소 위생사', shirt: '#b2dfdb', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '한도윤 기공사', shirt: '#90caf9', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // By the chairs, and in the waiting room.
    clients: [{ noun: '환자', socials: ['dentalCheckup', 'scaling', 'braceAdjust'], spots: [[4, 3], [8, 3], [10, 3], [7, 12], [9, 12], [15, 12]], max: 3, every: 40, patience: 150 }],
    alarm: { notice: '😖 급성 치통 환자가 왔어요! 진료 의자로 가세요', done: '😁 통증이 싹 가셨대요! 성과가 크게 올라요', missed: '⌛ 대기가 길어져 다른 의사가 응급 환자를 맡았어요 (성과 감소)', interaction: 'emergencyTooth', every: [180, 300], window: 45, minLevel: 1 },
    // The 치과 진료 보조 readies the chair and assists, no scaling or adjusting (2026-10-26, at the user's request).
    tasks: [
      gated(task('patients', '환자 진료하기', ['dentalCheckup', 'scaling', 'braceAdjust'], 3), { minLevel: 1 }, task('chair', '진료 의자 준비·석션 보조하기', ['prepareChair'], 2)),
      task('sterilize', '기구 소독하기', ['sterilizeTools'], 2),
      gated(task('mold', '치아 본뜨기', ['makeDentalMold', 'dtScanTeeth']), { minLevel: 1 }, task('restock', '진료 재료 정리하기', ['restockSupplies'])),
    ],
    extra: [
      task('xray', '엑스레이 촬영·판독하기', ['readXray', 'dtTakePanorama']),
      task('reception', '환자 접수·예약 잡기', ['dtCheckIn']),
      task('brushing', '양치법 알려주기', ['dtBrushingLesson']),
      gated(task('chart', '진료 기록 작성하기', ['writeChart']), { minLevel: 1 }),
      gated(task('emergency', '응급 치료하기', ['emergencyTooth']), { minLevel: 1 }),
      boss('원장님께 진료 보고하기'),
    ],
    work: ['dentalCheckup', 'scaling', 'braceAdjust', 'sterilizeTools', 'makeDentalMold', 'prepareChair', 'emergencyTooth', 'readXray', 'writeChart', 'restockSupplies', 'dtTakePanorama', 'dtScanTeeth', 'dtCheckIn', 'dtBrushingLesson'],
    skill: 'logic',
    floors: { tile: 'aquaTile', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'aquaTiles',
  },
  pharmacist: {
    careerId: 'pharmacist',
    name: '약국',
    icon: '💊',
    // A 약국 on the street (2026-11-05, the layout audit, replacing a building on a lawn whose stock room was as big as the
    // dispensary, the shop a strip at the front and the dispensary a room away behind a wall and a door). As a real one, the shop
    // and the dispensary are most of it. In off the pavement, past the green 약 sign, the shop: the 일반약 walls and shelves either
    // side of the way to the counter, the bench by the window, the blood-pressure chair and the 건강기능식품 in the corner. The long
    // counter faces the door, where the prescription is handed in and the medicine explained; it stands in the line of the
    // dispensary's glass, so the pharmacist turns from the counter to the dispensing tables in two steps and the customer sees the
    // work being done. Behind it the dispensary: the drawer walls, the automatic packer, the medicine fridge, the ointment bench
    // and the cabinet along the back, the two dispensing tables, the prescription terminal, the 약국장's desk where the insurance
    // claims are sent; the gap the staff go through at the
    // counter's end. Off it the small stock room (the shelves, the wholesaler's cartons) and the staff room with its restroom.
    tiles: () =>
      patch(
        building(
          [[2, 2, 17, 8, 'tile'], [2, 9, 17, 13, 'wood'], [18, 12, 23, 13, 'wood'], [19, 2, 23, 4, 'tile'], [19, 6, 23, 10, 'carpet']],
          [[12, 14], [18, 3], [18, 7]],
        ),
        [
          // The dispensary's front: glass and the counter, the staff's way through at its end.
          [2, 8, 'wall'], [3, 8, 'wall'], [4, 8, 'wall'], [5, 8, 'wall'], [15, 8, 'wall'], [16, 8, 'wall'], [17, 8, 'wall'],
          // The staff restroom.
          [21, 8, 'wall'], [22, 8, 'wall'], [23, 8, 'wall'], [21, 9, 'door'], [21, 10, 'wall'],
        ],
      ),
    restrooms: [[22, 9, 23, 10]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The dispensary: the back wall, the dispensing tables and the terminal.
      o('rxDrawerWall', 2, 2), o('rxDrawerWall', 5, 2), o('rxPacker', 8, 2), o('rxMedFridge', 10, 2), o('rxCompoundBench', 11, 2), o('medCabinet', 13, 2), o('rxDrawerWall', 14, 2), o('plant', 17, 2),
      o('dispensingTable', 4, 5), o('dispensingTable', 8, 5), o('rxCheckTerminal', 11, 5), o('officeDesk', 15, 5), o('plant', 17, 5),
      // The counter in the dispensary's front, facing the door.
      o('rxCounterWing', 6, 8, 'up'), o('pharmacyCounter', 9, 8, 'up'), o('rxCounterWing', 11, 8, 'up'),
      // The shop: the 일반약 walls and shelves along the way in, the bench by the window; the blood-pressure chair and the 건강기능식품 in the corner.
      o('rxOtcWall', 2, 9, 'right'), o('rxOtcWall', 17, 9, 'left'), o('pharmacyShelf', 6, 12), o('pharmacyShelf', 7, 12), o('pharmacyShelf', 8, 12), o('pharmacyShelf', 15, 12), o('pharmacyShelf', 16, 12),
      o('rxWaitBench', 2, 13, 'up'), o('rxBpChair', 19, 12), o('pharmacyShelf', 22, 12), o('pharmacyShelf', 23, 12),
      // The stock room.
      o('pharmacyShelf', 20, 2), o('pharmacyShelf', 21, 2), o('pharmacyShelf', 22, 2), o('pharmacyShelf', 23, 2), o('rxDelivery', 22, 4, 'up'),
      // The staff room and its restroom.
      o('sofa', 20, 6), o('fridge', 22, 6), o('coffeeMaker', 23, 6), o('clsLockers', 19, 10, 'up'),
      o('toilet', 23, 9, 'left'), o('sink', 23, 10, 'left'),
      // The sign on the pavement.
      o('rxStreetSign', 14, 15),
    ],
    coworkers: [
      { name: '진하람 약국장', shirt: '#fafafa', skin: '#eac09a', hair: '#5b3a1e', boss: true },
      { name: '도은솔 약사', shirt: '#e8f5e9', skin: '#f8d9c0', hair: '#1a1a1a' },
      { name: '변주원', shirt: '#81c784', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // At the counter, and at the blood-pressure chair.
    clients: [{ noun: '손님', socials: ['medConsult', 'recommendOTC'], spots: [[8, 9], [10, 9], [12, 9], [21, 13]], max: 3, every: 30, patience: 120 }],
    alarm: { notice: '📞 응급실에서 급한 처방이 들어왔어요! 조제대로 가세요', done: '💊 제시간에 약을 보냈어요! 성과가 크게 올라요', missed: '⌛ 조제가 늦어 다른 약국에서 처리했어요 (성과 감소)', interaction: 'urgentPrescription', every: [180, 300], window: 45, minLevel: 1 },
    // Dispensing and checking prescriptions are a pharmacist's: the 약국 보조원 takes them in and
    // keeps the stock (2026-10-26, at the user's request).
    tasks: [
      gated(task('dispense', '조제하기', ['dispenseMeds', 'rxRunPacker', 'rxMixOintment'], 2), { minLevel: 1 }, task('intake', '처방전 접수·약품 정리하기', ['organizeStock', 'rxFillDrawers', 'rxCheckDelivery'], 2)),
      task('customers', '손님 복약 지도', ['medConsult', 'recommendOTC', 'rxExplainMeds', 'rxTakeBp'], 3),
      gated(task('check', '처방전 검토하기', ['checkPrescription', 'rxLookupDrugs']), { minLevel: 1 }, task('expiry', '유통기한 점검하기', ['checkExpiry', 'rxCheckFridge'])),
    ],
    extra: [task('stock', '재고 정리하기', ['organizeStock', 'rxFaceOtc', 'rxCheckDelivery']), task('expiry', '유통기한 점검하기', ['checkExpiry', 'rxCheckFridge']), gated(task('urgent', '응급 처방 조제', ['urgentPrescription']), { minLevel: 1 }), boss('약국장님께 보고하기')],
    work: ['dispenseMeds', 'urgentPrescription', 'checkPrescription', 'organizeStock', 'checkExpiry', 'prepareMeds', 'restockSupplies', 'medConsult', 'recommendOTC', 'rxFillDrawers', 'rxRunPacker', 'rxMixOintment', 'rxCheckFridge', 'rxLookupDrugs', 'rxFaceOtc', 'rxTakeBp', 'rxCheckDelivery', 'rxExplainMeds'],
    skill: 'logic',
    floors: { tile: 'creamTile', wood: 'oakWood', carpet: 'sageCarpet' },
    wall: 'mintDots',
  },
  banker: {
    careerId: 'banker',
    name: '은행 지점',
    icon: '🏦',
    // A bank branch as it is (2026-11-04, the layout audit, replacing a hall squeezed into a strip beside a big back office with the
    // vault in the VIP room). An average branch is 330–660 ㎡ with 10–15 staff. The banking hall takes the front: the ticket machine
    // by the door (a number per kind of business), the seats facing the counter, the forms desk, the rate board. The counter runs
    // across it: the quick windows nearest the door, then the low seated counters where a loan is talked over across the desk, and
    // the PB room off the hall. Behind the counter the staff's desks and the officer's terminal, the vault door in the back wall;
    // behind that the manager's office, the staff room, the restroom and the records room. The 365 corner has its own street door,
    // open after hours.
    tiles: () =>
      patch(
        building(
          [[2, 2, 7, 4, 'carpet'], [9, 2, 16, 4, 'wood'], [18, 3, 19, 4, 'tile'], [21, 2, 23, 4, 'tile'], [5, 6, 23, 13, 'carpet'], [2, 6, 4, 9, 'carpet'], [2, 11, 4, 13, 'tile'], [19, 10, 23, 13, 'wood']],
          [[5, 5], [12, 5], [18, 5], [22, 5], [18, 12], [3, 14], [12, 14]],
        ),
        [
          ...Array.from({ length: 4 }, (_, i): [number, number, 'wall'] => [18 + (i % 2), 2, 'wall']),
          [2, 10, 'wall'], [3, 10, 'wall'], [4, 10, 'wall'], [5, 10, 'wall'], [5, 11, 'wall'], [5, 12, 'wall'], [5, 13, 'wall'],
          [18, 9, 'wall'], [19, 9, 'wall'], [20, 9, 'wall'], [21, 9, 'wall'], [22, 9, 'wall'], [23, 9, 'wall'], [18, 10, 'wall'], [18, 11, 'wall'], [18, 13, 'wall'],
        ],
      ),
    restrooms: [[18, 3, 19, 4]],
    objects: [
      // The manager's office; the staff room; the restroom; the records room.
      o('vipDesk', 4, 2), o('armchair', 6, 3, 'left'), o('bookshelf', 2, 2),
      o('sofa', 9, 4, 'up'), o('fridge', 14, 2), o('coffeeMaker', 15, 2), o('gjLockers', 11, 2),
      o('toilet', 19, 4, 'left'), o('sink', 19, 3, 'left'),
      o('archiveShelf', 21, 2), o('archiveShelf', 23, 2),
      // Behind the counter: the staff's desks, the officer's terminal, the vault door in the back wall.
      o('officeDesk', 7, 6), o('officeDesk', 9, 6), o('tradingTerminal', 14, 6), o('vaultDoor', 20, 6),
      // The counter: the quick windows nearest the door, then the low counters for loans, each with the customer's chair.
      o('tellerWindow', 6, 9, 'up'), o('tellerWindow', 7, 9, 'up'), o('tellerWindow', 8, 9, 'up'), o('tellerWindow', 9, 9, 'up'), o('tellerWindow', 10, 9, 'up'),
      o('bkCounterChair', 6, 10, 'up'), o('bkCounterChair', 8, 10, 'up'), o('bkCounterChair', 10, 10, 'up'),
      o('loanDesk', 14, 9, 'up'), o('loanDesk', 16, 9, 'up'), o('bkCounterChair', 14, 10, 'up'), o('bkCounterChair', 16, 10, 'up'),
      // The hall: the ticket machine by the door, the seats facing the counter, the forms desk, the rate board.
      o('bkTicketKiosk', 11, 13, 'up'), o('drWaitSeat', 6, 12, 'up'), o('drWaitSeat', 7, 12, 'up'), o('drWaitSeat', 8, 12, 'up'), o('drWaitSeat', 9, 12, 'up'),
      o('bkFormDesk', 14, 12), o('bkRateBoard', 16, 13, 'up'), o('plant', 17, 10),
      // The PB room; the 365 corner by its own door; a corner of the staff area.
      o('vipDesk', 21, 11), o('armchair', 21, 13, 'up'), o('plant', 23, 10),
      o('bkAtm', 2, 11), o('plant', 2, 6),
    ],
    coworkers: [
      { name: '금도윤 지점장', shirt: '#263238', skin: '#eac09a', hair: '#757575', boss: true },
      { name: '노하은 대리', shirt: '#1565c0', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '석진우 주임', shirt: '#546e7a', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // At the windows (sat in the 상담 의자, seen to across the counter), and one in the waiting chairs.
    clients: [{ noun: '은행 고객', socials: ['openAccount', 'loanConsult'], spots: [[6, 11], [8, 11], [14, 11], [16, 11]], max: 3, every: 35, patience: 120 }],
    alarm: { notice: '💼 VIP 고객이 예고 없이 방문했어요! PB실로 가세요', done: '💼 VIP 고객이 큰 예금을 맡겼어요! 성과가 크게 올라요', missed: '⌛ 기다리다 지친 VIP 고객이 다른 은행으로 갔어요 (성과 감소)', interaction: 'vipBanking', every: [200, 320], window: 45 },
    tasks: [task('teller', '창구 업무 처리', ['processTransaction'], 2), task('customers', '고객 상담', ['openAccount', 'loanConsult'], 2), task('loan', '대출 서류 심사', ['reviewLoan'])],
    branchLots: {
      // Investment banking is at head office, not a branch (2026-11-04, the same choice as the subway's, the pilot's and the realtor's):
      // the IB floor, the analysts' and associates' desks in rows with their terminals, the deal room where a deal is worked over,
      // the managing director's office where a client is seen, the pantry and the restroom, the reception.
      1: {
        careerId: 'banker',
        name: '투자금융 본부',
        icon: '📈',
        tiles: () =>
          patch(
            building([[2, 2, 15, 13, 'carpet'], [17, 2, 23, 7, 'wood'], [17, 9, 23, 13, 'tile']], [[16, 5], [16, 11], [12, 14]]),
            [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
          ),
        restrooms: [[22, 12, 23, 13]],
        objects: [
          o('tradingTerminal', 3, 2), o('tradingTerminal', 4, 2), o('tradingTerminal', 5, 2), o('tradingTerminal', 7, 2), o('tradingTerminal', 8, 2), o('tradingTerminal', 9, 2),
          o('loanDesk', 3, 6), o('loanDesk', 4, 6), o('loanDesk', 5, 6), o('loanDesk', 7, 6), o('loanDesk', 8, 6),
          o('whiteboard', 12, 2), o('salMeetingTable', 11, 9), o('salMeetingChair', 11, 8), o('salMeetingChair', 12, 8), o('salMeetingChair', 13, 8),
          o('salMeetingChair', 11, 10, 'up'), o('salMeetingChair', 12, 10, 'up'), o('salMeetingChair', 13, 10, 'up'), o('plant', 2, 13),
          o('vipDesk', 20, 3), o('armchair', 22, 5, 'left'), o('bookshelf', 23, 2),
          o('coffeeMaker', 17, 9), o('fridge', 18, 9), o('sofa', 17, 13, 'up'),
          o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
          o('officeDesk', 13, 13, 'up'),
        ],
        coworkers: [
          { name: '설지안 IB 본부장', shirt: '#1c2a3a', skin: '#eac09a', hair: '#2b1b10', boss: true },
          { name: '배준서 VP', shirt: '#263238', skin: '#f8d9c0', hair: '#1a1a1a' },
          { name: '모하린 애널리스트', shirt: '#37474f', skin: '#c99a6e', hair: '#5b3a1e' },
        ],
        alarm: { notice: '💼 고객사가 인수 건으로 급히 찾아왔어요! 본부장실로 가세요', done: '💼 고객사가 딜을 맡기기로 했어요! 성과가 크게 올라요', missed: '⌛ 답이 늦어 고객사가 다른 증권사와 갔어요 (성과 감소)', interaction: 'vipBanking', every: [200, 320], window: 45 },
        tasks: [task('market', '시장 동향 분석하기', ['monitorMarket'], 2), task('credit', '기업 신용 분석하기', ['creditReport']), task('report', '투자 보고서 쓰기', ['prepareVipReport'])],
        extra: [task('deal', '딜 회의', ['attendMeeting']), boss('본부장님께 딜 진행 보고'), task('loan', '인수 금융 서류 심사', ['reviewLoan'])],
        work: ['monitorMarket', 'creditReport', 'prepareVipReport', 'vipBanking', 'reviewLoan', 'attendMeeting'],
        skill: 'logic',
        floors: { carpet: 'slateStone', wood: 'walnutWood', tile: 'creamTile' },
        wall: 'navyWainscot',
      },
    },
    extra: [
      task('cash', '시재 맞추기', ['countCash']), task('vault', '금고 점검하기', ['auditVault']), task('vip', 'VIP 자산 상담', ['vipBanking']), boss('지점장님께 실적 보고'),
      task('lobby', '객장 고객 안내하기', ['bkGuideTicket', 'bkHelpAtm'], 2), task('atm', 'ATM 현금 채우기', ['bkRefillAtm']), task('forms', '전표·서식 채워 넣기', ['bkRestockForms']),
    ],
    work: ['processTransaction', 'countCash', 'reviewLoan', 'creditReport', 'monitorMarket', 'auditVault', 'vipBanking', 'prepareVipReport', 'openAccount', 'loanConsult', 'bkGuideTicket', 'bkHelpAtm', 'bkRefillAtm', 'bkRestockForms'],
    skill: 'logic',
    floors: { carpet: 'slateStone', wood: 'walnutWood', tile: 'creamTile' },
    wall: 'navyWainscot',
  },
  accountant: {
    careerId: 'accountant',
    name: '회계법인',
    icon: '🧮',
    // A 회계법인 on a floor of an office building (2026-11-05, the layout audit, replacing a lone building on a lawn whose toilet was
    // in the corner of the meeting room, whose meeting table and waiting chairs were a kitchen table and kitchen chairs with the
    // coffee maker among them, and which had no partner's office and no pantry). In from the street is the floor's lift hall (the
    // lifts, the floor's restroom off it); through the firm's glass door, the reception (its desk, a sofa to wait on) with the glass
    // meeting room where clients are seen behind it, and the two teams either side: 감사 on the left, the deadline board on its wall,
    // the desks pushed together in an island and the senior's desk facing it, the 자료실 behind with the files, the 전표 table, the
    // scanner, the copier and the shredder; 세무 on the right, its island, the senior's desk and the whiteboard where the work is
    // shared out, the partner's office in its corner, and the pantry behind (the coffee, the water, the fridge, a table).
    tiles: () =>
      patch(
        building(
          [[2, 2, 7, 9, 'carpet'], [9, 2, 14, 5, 'carpet'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'carpet'], [2, 11, 7, 13, 'tile'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'wood']],
          [[8, 8], [5, 10], [10, 10], [11, 6], [15, 8], [20, 10], [14, 12], [12, 14]],
        ),
        [
          [20, 2, 'wall'], [20, 3, 'wall'], [20, 4, 'door'], [20, 5, 'wall'], [20, 6, 'wall'], [21, 6, 'wall'], [22, 6, 'wall'], [23, 6, 'wall'],
          ...Array.from({ length: 12 }, (_, i): [number, number, 'wood'] => [21 + (i % 3), 2 + Math.floor(i / 3), 'wood']),
        ],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The reception and the sofa; the glass meeting room for clients.
      o('accReception', 12, 7), o('sofa', 13, 9, 'up'), o('plant', 9, 7),
      o('accClientTable', 11, 3), o('salMeetingChair', 10, 3, 'right'), o('salMeetingChair', 10, 4, 'right'), o('salMeetingChair', 13, 3, 'left'), o('salMeetingChair', 13, 4, 'left'), o('plant', 14, 2),
      // 감사: the deadline board, the island of desks, the senior's desk facing it.
      o('accDeadlineBoard', 2, 2), o('plant', 7, 2),
      o('accountingDesk', 3, 4, 'up'), o('accountingDesk', 4, 4, 'up'), o('accountingDesk', 5, 4, 'up'), o('accountingDesk', 3, 5), o('accountingDesk', 4, 5), o('accountingDesk', 5, 5),
      o('accountingDesk', 4, 8, 'up'), o('plant', 2, 9),
      // The 자료실: the files, the copier, the 전표 table, the scanner, the shredder.
      o('archiveShelf', 2, 11), o('archiveShelf', 3, 11), o('archiveShelf', 6, 11),
      o('copier', 2, 13, 'up'), o('accSortingTable', 3, 13, 'up'), o('accScanner', 6, 13, 'up'), o('shredder', 7, 13, 'up'),
      // 세무: the island, the senior's desk, the whiteboard.
      o('accountingDesk', 17, 4, 'up'), o('accountingDesk', 18, 4, 'up'), o('accountingDesk', 17, 5), o('accountingDesk', 18, 5),
      o('accountingDesk', 19, 8, 'left'), o('whiteboard', 21, 9, 'up'), o('plant', 19, 2), o('plant', 16, 9),
      // The partner's office.
      o('officeDesk', 22, 3), o('bookshelf', 23, 2), o('armchair', 21, 5, 'right'), o('plant', 23, 5),
      // The pantry.
      o('coffeeMaker', 18, 11), o('salWaterCooler', 19, 11), o('fridge', 18, 13, 'up'), o('diningTable', 21, 12), o('diningChair', 21, 13, 'up'), o('diningChair', 22, 13, 'up'),
    ],
    coworkers: [
      { name: '정세윤 파트너', shirt: '#37474f', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '구민서 회계사', shirt: '#78909c', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '하준영 회계사', shirt: '#90a4ae', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // On the reception's sofa, or at the glass meeting room's table.
    clients: [{ noun: '고객사 담당자', socials: ['taxAdvice', 'auditInterview'], spots: [[13, 8], [9, 3], [9, 4]], max: 2, every: 70, patience: 150 }],
    alarm: { notice: '⏰ 세금 신고 마감 2시간 전! 회계 책상에서 마무리하세요', done: '🧾 마감 직전 신고 완료! 성과가 크게 올라요', missed: '⌛ 마감을 넘겨 가산세가 붙었어요 (성과 감소)', interaction: 'deadlineFiling', every: [200, 320], window: 60 },
    tasks: [task('books', '장부 대조하기', ['reconcileBooks'], 2), task('tax', '세무 신고서 작성', ['prepareTaxReturn']), task('clients', '고객사 상담', ['taxAdvice', 'auditInterview'])],
    extra: [
      task('meeting', '회의 참석하기', ['attendMeeting']), task('archive', '지난 자료 찾기', ['readArchive']), task('deadline', '마감 신고 처리', ['deadlineFiling']), boss('파트너님께 검토받기'),
      task('vouchers', '증빙 스캔·전표 정리', ['accScanReceipts', 'accSortVouchers'], 2), task('board', '신고 마감 현황 정리', ['accCheckDeadlines']), task('results', '고객사 결산 설명', ['accExplainResults']),
    ],
    work: ['reconcileBooks', 'prepareTaxReturn', 'deadlineFiling', 'shredDocs', 'attendMeeting', 'readArchive', 'taxAdvice', 'auditInterview', 'accCheckDeadlines', 'accScanReceipts', 'accSortVouchers', 'accExplainResults'],
    skill: 'logic',
    floors: { carpet: 'slateStone', tile: 'monoTile', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  realEstate: {
    careerId: 'realEstate',
    name: '부동산 사무소',
    icon: '🏠',
    // A 공인중개사사무소 as it is (2026-11-04, the layout audit, replacing an office four times the size with a staged model room): one
    // unit of a row of shops, about 15평, the next units beside it, the street in front with the agency's car and its sign out on
    // the pavement. Through the glass front the listing window, the customers' sofa, the contract table and two agents' desks; on
    // the back wall the district map, the keys, the contract files and the five papers the law has posted where customers see them;
    // behind, the listings board, the registry terminal and the tea, and the restroom. Viewings are at the property, by car.
    tiles: () =>
      patch(
        building([[3, 10, 12, 13, 'wood'], [3, 7, 9, 8, 'tile'], [11, 7, 12, 8, 'tile']], [[6, 9], [11, 9], [12, 14]]),
        [
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !(x >= 2 && x <= 13 && y >= 6 && y <= 14)),
          ...Array.from({ length: 12 }, (_, i): [number, number, 'wall'] => [2 + i, 6, 'wall']),
          ...Array.from({ length: 8 }, (_, i): [number, number, 'wall'] => [2, 7 + i, 'wall']),
          ...Array.from({ length: 8 }, (_, i): [number, number, 'wall'] => [13, 7 + i, 'wall']),
          [10, 7, 'wall'], [10, 8, 'wall'],
        ],
      ),
    restrooms: [[11, 7, 12, 8]],
    ground: [[0, 0, 25, 5, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      o('reNeighborShop', 14, 6), o('reNeighborFlorist', 19, 6),
      // The office: the back wall; the desks, the contract table, the sofa and the listing window at the glass.
      o('reDistrictMap', 3, 10), o('reKeyCabinet', 7, 10), o('reRecordWall', 8, 10), o('reLegalBoard', 12, 10),
      o('reConsultTable', 3, 12, 'up'), o('reListingWindow', 6, 13, 'up'), o('realtorDesk', 10, 12), o('realtorDesk', 11, 12), o('sofa', 12, 11, 'left'),
      // Behind: the tea and the listings board; the restroom.
      o('reTeaCorner', 3, 7), o('listingBoard', 7, 7), o('reRegistryTerminal', 9, 7),
      o('toilet', 12, 8, 'left'), o('sink', 12, 7, 'left'),
      // Out front: the car, the sign.
      o('realtorCar', 16, 15), o('reYardSign', 9, 15),
    ],
    coworkers: [
      { name: '방윤주 대표', shirt: '#5d4037', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '오세린 중개사', shirt: '#ff8a65', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '곽도현', shirt: '#4db6ac', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    clients: [{ noun: '집 구하는 손님', socials: ['showListings', 'negotiatePrice'], spots: [[11, 11]], max: 1, every: 50, patience: 150 }],
    alarm: { notice: '🏡 집 보러 가자는 손님 전화! 회사 차로 출발하세요', done: '🏡 손님이 집을 마음에 들어 했어요! 성과가 크게 올라요', missed: '⌛ 늦어서 손님이 다른 중개소와 갔어요 (성과 감소)', interaction: 'propertyTour', every: [180, 300], window: 45 },
    tasks: [task('contract', '계약서 작성·설명하기', ['draftContract', 'reExplainContract', 'reSealContract']), task('clients', '손님 응대', ['showListings', 'negotiatePrice', 'reServeTea'], 2), task('listings', '매물 찾고 확인하기', ['searchListings', 'reCheckRegistry', 'reMapPins'], 2)],
    extra: [task('board', '매물 게시판·창 정리', ['updateListings', 'reChangeWindow']), task('tour', '현장 안내 준비·나가기', ['propertyTour', 'reTakeKey', 'reReadyTour']), boss('대표님께 계약 보고')],
    work: ['draftContract', 'searchListings', 'updateListings', 'propertyTour', 'showListings', 'negotiatePrice', 'reExplainContract', 'reSealContract', 'reMapPins', 'reTakeKey', 'reCheckRegistry', 'reServeTea', 'reChangeWindow', 'reReadyTour'],
    branchLots: {
      // The development branch (2026-11-04, the same choice as the subway's and the pilot's: a developer isn't at a neighbourhood
      // agency) at its 분양 홍보관: the hall with the reception and the site's model, the sales tables and the waiting sofas; the
      // furnished model unit, staged; the project office (the desks, the feasibility board); the restroom; the car for site visits.
      1: {
        careerId: 'realEstate',
        name: '분양 홍보관',
        icon: '🏙️',
        tiles: () =>
          patch(
            building([[2, 9, 15, 13, 'tile'], [17, 2, 23, 13, 'wood'], [2, 2, 15, 7, 'carpet']], [[16, 11], [8, 8], [12, 14]]),
            [[13, 2, 'wall'], [13, 4, 'wall'], [14, 4, 'wall'], [15, 4, 'wall'], [13, 3, 'door']],
          ),
        restrooms: [[14, 2, 15, 3]],
        ground: [[0, 15, 25, 17, 'concrete']],
        objects: [
          o('reFloorModel', 7, 11), o('reConsultTable', 2, 11, 'up'), o('reConsultTable', 11, 11, 'up'), o('sofa', 14, 9, 'left'), o('plant', 2, 9),
          o('showroomSet', 19, 5), o('sofa', 18, 9, 'up'), o('armchair', 22, 9, 'left'), o('plant', 23, 2), o('lamp', 17, 2),
          o('realtorDesk', 3, 2), o('realtorDesk', 5, 2), o('realtorDesk', 7, 2), o('listingBoard', 9, 2), o('whiteboard', 3, 6, 'up'), o('coffeeMaker', 11, 2), o('fridge', 11, 5, 'right'),
          o('toilet', 15, 2, 'left'), o('sink', 15, 3, 'left'),
          o('realtorCar', 17, 15),
        ],
        coworkers: [
          { name: '나다온 홍보관장', shirt: '#37474f', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
          { name: '오시우 분양 상담사', shirt: '#8d6e63', skin: '#eac09a', hair: '#5b3a1e' },
          { name: '한도윤 사업 PM', shirt: '#546e7a', skin: '#c99a6e', hair: '#1a1a1a' },
        ],
        clients: [{ noun: '분양 상담 손님', socials: ['showListings', 'negotiatePrice'], spots: [[13, 9], [13, 10]], max: 2, every: 50, patience: 150 }],
        alarm: { notice: '🏗️ 사업 부지 답사 일정이에요! 회사 차로 출발하세요', done: '🏗️ 부지를 둘러보고 사업 계획을 다듬었어요! 성과가 크게 올라요', missed: '⌛ 답사에 늦어 일정이 미뤄졌어요 (성과 감소)', interaction: 'propertyTour', every: [180, 300], window: 45 },
        tasks: [task('sales', '분양 상담하기', ['showListings', 'negotiatePrice'], 2), task('model', '단지 모형으로 설명하기', ['reShowModel']), task('plan', '사업 자료 검토하기', ['searchListings', 'draftContract'])],
        extra: [task('staging', '모델하우스 연출하기', ['stageRoom']), task('board', '분양 현황판 정리', ['updateListings']), task('tour', '부지 답사 준비', ['propertyTour', 'reReadyTour']), boss('홍보관장님께 보고')],
        work: ['showListings', 'negotiatePrice', 'reShowModel', 'searchListings', 'draftContract', 'stageRoom', 'updateListings', 'propertyTour', 'reReadyTour'],
        skill: 'charisma',
        floors: { tile: 'creamTile', wood: 'oakWood', carpet: 'sageCarpet' },
        wall: 'creamPlain',
      },
    },
    skill: 'charisma',
    floors: { carpet: 'sageCarpet', wood: 'oakWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  mechanic: {
    careerId: 'mechanic',
    name: '자동차 정비소',
    icon: '🔧',
    // A roadside 카센터 (2026-11-04, the layout audit, replacing a repair bay walled in on every side behind a corridor lounge, its cars
    // with no way in or out): the single-storey shop stands back from the street behind its paved forecourt, the sign pole at its
    // edge. Its three bays open straight onto the forecourt, each lift's car nose-out in front of its own opening (the shutters
    // rolled up), so a car comes off the street, across the forecourt and onto the lift, and drives straight out again. At the back
    // of the bays the tool wall, the scan cart, the tyre rack, the waste-oil drums, and the tyre changer and balancer by the third
    // bay; the tool chest and the oil caddy between the lifts. Beside the bays, with its own door on the forecourt, the office where
    // the car is booked in at the 정비 접수 desk and the owner waits on the chairs facing the TV, a door through to the bays and the
    // restroom in its corner; behind it the parts room, opening off the bays. The staff room with its sofa is gone: the mechanics
    // have the office's coffee.
    tiles: () =>
      patch(
        building([[17, 2, 23, 3, 'tile'], [17, 5, 23, 9, 'wood'], [22, 5, 23, 6, 'tile']], [[16, 3], [16, 8], [18, 10], [22, 7]]),
        [
          // The forecourt in front, where the building used to run on to the street.
          ...Array.from({ length: 24 * 4 }, (_, i): [number, number, 'grass'] => [1 + (i % 24), 11 + Math.floor(i / 24), 'grass']),
          // The bays: open to the forecourt, their walls to the lot and their front pieces (the piers, the shutters rolled up).
          ...Array.from({ length: 15 * 10 }, (_, i): [number, number, 'grass'] => [1 + (i % 15), 1 + Math.floor(i / 15), 'grass']),
          // The restroom in the office's corner.
          [21, 5, 'wall'], [21, 6, 'wall'], [21, 7, 'wall'], [23, 7, 'wall'],
        ],
      ),
    restrooms: [[22, 5, 23, 6]],
    ground: [[1, 1, 15, 10, 'concrete'], [0, 11, 25, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The bays' walls and open front.
      o('mecBayWallSide', 1, 1), o('mecBayWallBack', 2, 1), o('mecBayFront', 2, 10),
      // The bays: three lifts nose-out to their openings; the tool chest and the oil caddy between them.
      o('carLift', 3, 6), o('carLift', 8, 6), o('carLift', 13, 6), o('mecToolChest', 6, 6), o('mecOilCaddy', 11, 6),
      // The back of the bays: the tool wall, the scan cart, the tyre rack, the waste oil, the tyre machines by the third bay.
      o('toolWall', 2, 2), o('diagnosticComputer', 5, 2), o('mecTyreRack', 7, 2), o('mecOilDrums', 10, 2), o('mecTireChanger', 13, 2), o('mecWheelBalancer', 15, 2),
      // The parts room.
      o('partsShelf', 18, 2), o('partsShelf', 20, 2), o('partsShelf', 22, 2),
      // The office: the TV and the vending machine, the chairs facing them, the 정비 접수 desk; the restroom.
      o('mecLoungeTv', 17, 5), o('mecVendingMachine', 19, 5), o('mecWaitSeat', 17, 7, 'up'), o('mecWaitSeat', 18, 7, 'up'), o('mecReceptionDesk', 20, 8), o('plant', 23, 9),
      o('toilet', 22, 5), o('sink', 23, 5),
      // The sign pole on the forecourt.
      o('mecSignPole', 22, 13),
    ],
    coworkers: [
      { name: '강태훈 공장장', shirt: '#37474f', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '피도훈', shirt: '#1565c0', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '민서준', shirt: '#ef6c00', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // In the office, by the waiting chairs.
    clients: [{ noun: '차 주인', socials: ['explainRepair', 'estimateQuote'], spots: [[17, 6], [18, 6]], max: 2, every: 50, patience: 150 }],
    alarm: { notice: '🚗 고장 차량이 견인돼 들어왔어요! 리프트로 가세요', done: '🚗 차가 다시 시동이 걸렸어요! 성과가 크게 올라요', missed: '⌛ 수리가 늦어 손님이 차를 다른 곳으로 옮겼어요 (성과 감소)', interaction: 'emergencyRepair', every: [180, 300], window: 60 },
    tasks: [task('engine', '엔진 수리하기', ['repairEngine']), task('tires', '타이어 교체하기', ['changeTires', 'mecMountTire'], 2), task('diag', '차량 진단하기', ['runDiagnostics', 'mecObdScan'])],
    extra: [task('quote', '손님 응대', ['explainRepair', 'estimateQuote'], 2), task('parts', '부품 정리하기', ['sortParts']), task('emergency', '긴급 수리', ['emergencyRepair']), task('estimate', '견적서 쓰기', ['mecWriteQuote']), task('balance', '휠 밸런스 맞추기', ['mecBalanceWheel']), task('oil', '폐유 비우기', ['mecEmptyOil']), task('tools', '공구 챙기고 정리하기', ['mecPrepTools', 'organizeTools']), boss('공장장님께 작업 보고')],
    work: ['repairEngine', 'changeTires', 'emergencyRepair', 'runDiagnostics', 'organizeTools', 'sortParts', 'explainRepair', 'estimateQuote', 'mecObdScan', 'mecMountTire', 'mecBalanceWheel', 'mecEmptyOil', 'mecPrepTools', 'mecWriteQuote'],
    skill: 'handiness',
    floors: { tile: 'slateStone', wood: 'oakWood' },
    wall: 'redBrick',
  },
  farmer: {
    careerId: 'farmer',
    name: '농장',
    icon: '🌾',
    // A 밭농사 농가 (2026-11-05, the layout audit, replacing nine flower-box beds on a lawn, a cold frame for a greenhouse and the
    // packing room inside the house). The field is bare earth, the beds in long mulched rows with the drip line along them and a
    // furrow to walk between each; along its side the 농로 the tractor goes up and down. Beside it a 단동 비닐하우스 at its real
    // size, beds down either side of the walk. Across the yard from them the 작업장: the packing tables, the seed shelf, the
    // tools and the cold store's door. The house (the kitchen, the table, the restroom inside) is apart from the work. Toward the
    // road the seedling cold frame, the compost and the farm stand at the roadside, the pepper rack drying in the yard.
    tiles: () =>
      patch(
        building([[18, 2, 23, 5, 'tile'], [18, 10, 23, 13, 'wood']], [[20, 6], [19, 9]]),
        [
          ...Array.from({ length: 16 * 14 }, (_, i): [number, number, 'grass'] => [1 + (i % 16), 1 + Math.floor(i / 16), 'grass']),
          ...Array.from({ length: 8 * 2 }, (_, i): [number, number, 'grass'] => [17 + (i % 8), 7 + Math.floor(i / 8), 'grass']),
          [21, 12, 'wall'], [21, 13, 'door'], [22, 11, 'wall'], [23, 11, 'wall'],
        ],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 0, 11, 14, 'soil'], [12, 0, 16, 10, 'soil'], [12, 11, 16, 14, 'concrete'], [17, 7, 25, 8, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The field: four rows of mulched beds, a furrow between each; the tractor at the foot of the 농로.
      o('cropField', 1, 1), o('cropField', 4, 1), o('cropField', 7, 1),
      o('cropField', 1, 3), o('cropField', 4, 3), o('cropField', 7, 3),
      o('cropField', 1, 5), o('cropField', 4, 5), o('cropField', 7, 5),
      o('cropField', 1, 7), o('cropField', 4, 7), o('cropField', 7, 7),
      o('tractor', 10, 9),
      // The 비닐하우스: beds down either side of the walk; its water tank and pump by the door.
      o('fmPolyHouse', 12, 0), o('cropField', 12, 1, 'right'), o('cropField', 12, 5, 'right'), o('cropField', 16, 1, 'left'), o('cropField', 16, 5, 'left'),
      o('fmWaterTank', 12, 11),
      // The 작업장: the seed shelf, the cold store, the packing tables, the tools.
      o('seedShelf', 18, 2), o('vfColdStore', 22, 2), o('packingTable', 18, 4), o('packingTable', 20, 4), o('fmToolShed', 23, 4, 'left'),
      // The house: the kitchen and the table; the restroom inside.
      o('fridge', 23, 10, 'left'), o('coffeeMaker', 20, 10), o('diningTable', 18, 12), o('diningChair', 18, 11), o('diningChair', 18, 13, 'up'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // Toward the road: the seedling cold frame, the compost, the farm stand; the pepper rack in the yard.
      o('fmGreenhouse', 1, 11), o('fmCompost', 5, 12), o('farmStand', 8, 13), o('fmPepperRack', 14, 13),
    ],
    coworkers: [
      { name: '황보람 농장주', shirt: '#558b2f', skin: '#eac09a', hair: '#5b3a1e', boss: true },
      { name: '심여름', shirt: '#9ccc65', skin: '#f8d9c0', hair: '#a0522d' },
      { name: '고은비', shirt: '#ffb74d', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // At the farm stand by the road.
    clients: [{ noun: '농산물 손님', socials: ['sellProduce', 'farmTour'], spots: [[7, 14], [10, 14], [10, 13]], max: 2, every: 50, patience: 120 }],
    alarm: { notice: '⛈️ 우박 예보! 밭으로 가서 작물을 덮으세요', done: '🌱 작물을 무사히 지켜 냈어요! 성과가 크게 올라요', missed: '⌛ 늦어서 일부 작물이 상했어요 (성과 감소)', interaction: 'coverCrops', every: [180, 300], window: 60 },
    tasks: [task('tend', '작물 돌보기', ['tendCrops'], 2), task('harvest', '수확하기', ['harvestCrops']), task('pack', '농산물 포장·저온 입고', ['packProduce', 'vfStockCold'])],
    extra: [task('plow', '트랙터로 밭 갈기', ['plowField']), task('market', '가판대 손님 응대', ['sellProduce', 'farmTour', 'fmSellProduce', 'fmGuideTour'], 2), task('cover', '우박 대비하기', ['coverCrops']), task('seedlings', '다음 작기 준비', ['fmSowTray', 'fmTurnCompost']), task('irrigate', '점적 관수 점검', ['fmIrrigate']), task('dryPeppers', '고추 말리기', ['fmDryPeppers']), boss('농장주님께 작황 보고')],
    work: ['tendCrops', 'harvestCrops', 'coverCrops', 'plowField', 'packProduce', 'sortSeeds', 'arrangeStand', 'sellProduce', 'farmTour', 'fmSellProduce', 'fmGuideTour', 'fmSowTray', 'fmTurnCompost', 'fmIrrigate', 'fmDryPeppers', 'vfStockCold'],
    skill: 'gardening',
    floors: { wood: 'oakWood', tile: 'slateStone' },
    wall: 'oakWainscot',
  },
  graphicDesigner: {
    careerId: 'graphicDesigner',
    name: '디자인 스튜디오',
    icon: '🎨',
    // A small design studio on the ground floor of a neighbourhood office building (2026-11-05, the layout audit, replacing a building
    // on a lawn whose lobby of waiting chairs, an idol poster and the toilet took half its width, with the coffee and the sofa in the
    // print room and a kitchen table for meetings). In from the street the building's lift hall, its tenant board outside, the
    // restroom off it; through the studio's glass door the work shelf under the studio's name, and the open design floor: the crit
    // wall, the type specimens, the mood board and the whiteboard on the back wall, the desks pushed together in two islands, the
    // director's desk, the sketch and mock-up tables at the front. Off it the print room (the large-format printer, the daylight
    // booth, the paper samples, the cutter, the rack the proofs dry on), the meeting room with the presentation screen and an office
    // table, and the 탕비 corner where the coffee and the sofa are. The 자료실 of past work and samples opens off the meeting room.
    tiles: () =>
      building(
        [[2, 2, 14, 9, 'wood'], [16, 2, 23, 4, 'tile'], [16, 6, 23, 9, 'carpet'], [2, 11, 7, 13, 'tile'], [9, 11, 14, 13, 'tile'], [16, 12, 17, 13, 'tile'], [19, 11, 23, 13, 'wood']],
        [[15, 3], [15, 8], [5, 10], [12, 10], [15, 12], [21, 10], [12, 14]],
      ),
    restrooms: [[16, 12, 17, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The design floor: the walls along the back, the two islands of desks, the director's desk; the work shelf by the door; the tables in front.
      o('dgCritWall', 2, 2), o('dgTypeWall', 6, 2), o('moodBoard', 9, 2), o('whiteboard', 11, 2), o('plant', 14, 2),
      o('designDesk', 3, 5, 'up'), o('designDesk', 4, 5, 'up'), o('designDesk', 3, 6), o('designDesk', 4, 6),
      o('designDesk', 7, 5, 'up'), o('designDesk', 8, 5, 'up'), o('designDesk', 7, 6), o('designDesk', 8, 6),
      o('designDesk', 13, 4, 'left'), o('bookshelf', 14, 6, 'left'),
      o('sketchTable', 3, 9, 'up'), o('dgMockTable', 6, 9, 'up'), o('dgPortfolio', 13, 9, 'up'), o('plant', 2, 7),
      // The print room: the printer, the daylight booth and the paper samples along the back; the cutter and the proof rack.
      o('largePrinter', 16, 2), o('dgViewBooth', 19, 2), o('dgSwatchShelf', 21, 2), o('dgCutter', 17, 4, 'up'), o('dgPrintRack', 20, 4, 'up'), o('plant', 23, 4),
      // The meeting room: the screen on the end wall, the office table and its chairs.
      o('dgClientScreen', 23, 6, 'left'), o('salMeetingTable', 18, 7), o('salMeetingChair', 18, 6), o('salMeetingChair', 19, 6),
      o('salMeetingChair', 18, 8, 'up'), o('salMeetingChair', 19, 8, 'up'), o('salMeetingChair', 20, 8, 'up'),
      // The 탕비 corner.
      o('coffeeMaker', 2, 11), o('fridge', 3, 11), o('sofa', 2, 13, 'up'), o('diningTable', 5, 12), o('diningChair', 5, 13, 'up'), o('diningChair', 6, 13, 'up'),
      // The lift hall and the floor's restroom; the tenant board out front.
      o('bldLift', 13, 11), o('plant', 9, 13),
      o('toilet', 17, 13, 'left'), o('sink', 17, 12, 'left'),
      o('dgFrontSign', 14, 15),
      // The 자료실: past work and samples.
      o('archiveShelf', 19, 11), o('archiveShelf', 20, 11), o('archiveShelf', 22, 11), o('archiveShelf', 23, 11), o('bookshelf', 19, 13, 'up'), o('bookshelf', 20, 13, 'up'), o('plant', 23, 13),
    ],
    coworkers: [
      { name: '채윤아 디렉터', shirt: '#212121', skin: '#f8d9c0', hair: '#c62828', boss: true },
      { name: '민하늘', shirt: '#26c6da', skin: '#eac09a', hair: '#2b1b10' },
      { name: '도예린', shirt: '#ffca28', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    clients: [{ noun: '클라이언트', socials: ['presentDraft', 'gatherFeedback'], spots: [[17, 6], [17, 8], [21, 8]], max: 2, every: 70, patience: 150 }],
    alarm: { notice: '🚨 클라이언트가 오늘 안에 수정해 달래요! 디자인 PC로 가세요', done: '🎨 수정본이 단번에 통과됐어요! 성과가 크게 올라요', missed: '⌛ 수정이 늦어 클라이언트가 실망했어요 (성과 감소)', interaction: 'rushRevision', every: [180, 300], window: 60 },
    tasks: [task('layout', '레이아웃 디자인', ['designLayout'], 2), task('retouch', '이미지 보정하기', ['retouchImage']), task('client', '클라이언트 미팅', ['presentDraft', 'gatherFeedback'])],
    extra: [task('sketch', '아이디어 스케치', ['sketch']), task('moodboard', '무드보드 만들기', ['makeMoodBoard']), task('rush', '긴급 수정 작업', ['rushRevision']), task('critique', '포스터 벽 크리틱', ['dgPinUp']), task('typeface', '서체 고르기', ['dgStudyType']), task('swatch', '색과 종이 고르기', ['dgPickSwatch']), task('mockup', '패키지 목업 만들기', ['dgMakeMock']), task('deck', '발표 화면으로 시안 설명', ['dgPresentDeck']), task('proofs', '시안 출력·색 교정', ['printProofs', 'dgCheckProof']), boss('디렉터님께 시안 검토받기')],
    work: ['designLayout', 'retouchImage', 'rushRevision', 'printProofs', 'sketch', 'makeMoodBoard', 'attendMeeting', 'presentDraft', 'gatherFeedback', 'dgPinUp', 'dgStudyType', 'dgPickSwatch', 'dgMakeMock', 'dgPresentDeck', 'dgCheckProof'],
    skill: 'painting',
    floors: { wood: 'oakWood', carpet: 'lilacCarpet', tile: 'monoTile' },
    wall: 'creamPlain',
  },
  webtoonArtist: {
    careerId: 'webtoonArtist',
    name: '웹툰 스튜디오',
    icon: '📚',
    // A webtoon studio on the ground floor of an office building (2026-11-05, the layout audit, replacing a building on a lawn whose
    // lobby was a signing hall with a standee and a queue of chairs, readers come in to be signed for, and the toilet fitted into
    // the corner of the drawing room). In from the street the building's lift hall with the floor's restroom off it; through the
    // studio's door a small 현관, the shoe rack and the parcels left by the courier. The drawing room: the assistants' pen-display
    // desks in two rows back to back, the author's and the main assistant's desks by the window, the serial's schedule board and
    // the proof printer on the back wall, the 콘티 and 설정화 boards and the framed posters on the front. Off it the meeting room
    // where the editor and the story writer sit with the author, the 탕비실 (coffee, fridge, snacks, a table); off the 현관 the 자료실
    // of reference books and the readers' comments on a screen, and through it the rest room with the sofa and the cot for
    // deadline nights. Signings are at bookshops and fairs, not here.
    tiles: () =>
      patch(
        building(
          [[2, 2, 14, 9, 'wood'], [16, 2, 23, 5, 'carpet'], [16, 7, 23, 9, 'wood'], [2, 11, 8, 13, 'tile'], [10, 11, 14, 13, 'tile'], [16, 12, 17, 13, 'tile'], [19, 11, 23, 13, 'carpet']],
          [[15, 4], [15, 9], [5, 10], [12, 10], [15, 12], [21, 10], [12, 14]],
        ),
        [[10, 7, 'wall'], [11, 7, 'wall'], [12, 7, 'door'], [13, 7, 'wall'], [14, 7, 'wall'], [10, 8, 'wall'], [10, 9, 'wall']],
      ),
    restrooms: [[16, 12, 17, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The drawing room: the assistants' desks back to back, the author's by the window; the boards, the printer, the posters.
      o('drawingTabletDesk', 3, 2), o('drawingTabletDesk', 4, 2), o('drawingTabletDesk', 5, 2), o('drawingTabletDesk', 3, 6, 'up'), o('drawingTabletDesk', 4, 6, 'up'), o('drawingTabletDesk', 5, 6, 'up'),
      o('wtnDeadlineBoard', 7, 2), o('wtnProofPrinter', 9, 2), o('drawingTabletDesk', 12, 2), o('drawingTabletDesk', 13, 2), o('plant', 14, 2), o('bookshelf', 14, 5, 'left'),
      o('storyboardWall', 2, 9, 'up'), o('wtnCharacterBoard', 6, 9, 'up'), o('wtnPosterFrames', 8, 9, 'up'), o('lamp', 9, 5),
      // The 현관: the parcels, the shoe rack.
      o('cvParcelRack', 11, 8, 'right'), o('ccCubbies', 13, 8),
      // The meeting room: the table, the story writer's desks.
      o('salMeetingTable', 18, 3), o('salMeetingChair', 18, 2), o('salMeetingChair', 19, 2), o('salMeetingChair', 18, 4, 'up'), o('salMeetingChair', 19, 4, 'up'), o('salMeetingChair', 20, 4, 'up'),
      o('plotDesk', 22, 2), o('plotDesk', 23, 4, 'left'), o('whiteboard', 16, 2, 'right'),
      // The 자료실: the reference books, the readers' comments.
      o('bookshelf', 17, 7), o('bookshelf', 18, 7), o('bookshelf', 19, 7), o('bookshelf', 20, 7), o('wtnCommentMonitor', 22, 7), o('armchair', 17, 9, 'up'), o('archiveShelf', 23, 9, 'left'),
      // The 탕비실.
      o('coffeeMaker', 2, 11), o('fridge', 3, 11), o('gdSnackBar', 2, 13, 'up'), o('diningTable', 6, 12), o('diningChair', 6, 13, 'up'), o('diningChair', 7, 13, 'up'),
      // The lift hall and the floor's restroom.
      o('bldLift', 13, 11), o('plant', 10, 13),
      o('toilet', 17, 13, 'left'), o('sink', 17, 12, 'left'),
      // The rest room: the sofa, the cot.
      o('sofa', 19, 13, 'up'), o('wtnCot', 23, 11, 'left'), o('plant', 19, 11),
    ],
    coworkers: [
      { name: '여은하 편집자', shirt: '#5c6bc0', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '도현지', shirt: '#f48fb1', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '마윤서', shirt: '#81c784', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    alarm: { notice: '⏰ 연재 마감 2시간 전! 작업 책상으로 가세요', done: '📚 마감 성공! 이번 화 댓글 반응이 뜨거워요. 성과가 크게 올라요', missed: '⌛ 마감을 놓쳐 휴재 공지가 올라갔어요 (성과 감소)', interaction: 'deadlineUpload', every: [180, 300], window: 60 },
    tasks: [task('episode', '원고 그리기', ['drawEpisode'], 2), task('color', '채색하기', ['colorPanels']), task('plot', '스토리 구상하기', ['writePlot'])],
    extra: [
      task('storyboard', '콘티 그리기', ['drawStoryboard']), task('schedule', '연재 일정 점검하기', ['wtnCheckSchedule']), task('upload', '마감 원고 업로드', ['deadlineUpload']),
      task('design', '캐릭터 설정화 그리기', ['wtnCharacterSheet']), task('proof', '원고 교정 보기', ['wtnPrintProof']), task('ranking', '독자 반응 확인하기', ['wtnCheckRanking']), boss('편집자님과 회의하기'),
    ],
    work: ['drawEpisode', 'colorPanels', 'deadlineUpload', 'writePlot', 'drawStoryboard', 'wtnCheckSchedule', 'wtnCharacterSheet', 'wtnCheckRanking', 'wtnPrintProof'],
    skill: 'painting',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'lavenderStripes',
  },
  hotelier: {
    careerId: 'hotelier',
    name: '호텔',
    icon: '🏨',
    // A city hotel on two floors (2026-11-04, the layout audit, replacing a lobby reached down a corridor past the breakfast buffet,
    // the front desk at its far end, a toilet standing in the middle of it and a suite opening off it). A hotel's ground floor is its
    // lobby: under the canopy where cars drop guests, in at the door, the front desk straight ahead with the back office behind it,
    // the bell desk and the luggage by the door, the concierge and the lifts beside the desk, the lounge; the breakfast restaurant
    // off the lobby; the guests' restrooms down a short corridor of their own. Behind the scenes the staff room and the locker room
    // with the service stairs. The rooms are upstairs, along the corridor from the lifts: three rooms of the same plan (the bed, the
    // wardrobe, the minibar, the TV, the shower and basin), a family room, a suite, and the floor's linen pantry where the
    // housekeepers fill their carts, the service stairs coming up into it.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 8, 7, 'wood'], [10, 2, 13, 7, 'tile'], [15, 2, 18, 7, 'tile'], [20, 2, 23, 7, 'tile'], [2, 9, 17, 13, 'carpet'], [19, 9, 23, 13, 'tile']],
          [[5, 8], [11, 8], [14, 4], [19, 5], [18, 11], [12, 14]],
        ),
        // The guests' restrooms off their corridor.
        [[21, 9, 'wall'], [21, 10, 'door'], [21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'door'], [21, 13, 'wall']],
      ),
      ...upstairs(
        [[2, 2, 6, 6, 'carpet'], [8, 2, 12, 6, 'carpet'], [14, 2, 18, 6, 'carpet'], [20, 2, 23, 6, 'tile'], [2, 8, 23, 9, 'carpet'], [2, 11, 8, 13, 'carpet'], [10, 11, 17, 13, 'carpet'], [19, 10, 23, 13, 'carpet']],
        [[4, 7], [10, 7], [16, 7], [21, 7], [5, 10], [13, 10]],
      ),
    ],
    restrooms: [[22, 9, 23, 10], [22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The breakfast restaurant: the buffet, two tables, the coffee.
      o('htlBuffet', 2, 2), o('htlBuffet', 4, 2), o('coffeeMaker', 7, 2), o('plant', 8, 2),
      o('diningTable', 3, 5), o('diningChair', 3, 4), o('diningChair', 4, 4), o('diningChair', 3, 6, 'up'), o('diningChair', 4, 6, 'up'),
      o('diningTable', 6, 5), o('diningChair', 6, 4), o('diningChair', 7, 4), o('diningChair', 6, 6, 'up'), o('diningChair', 7, 6, 'up'),
      // The back office behind the front desk: the desks, the files.
      o('officeDesk', 10, 2), o('officeDesk', 11, 2), o('officeDesk', 12, 2), o('archiveShelf', 13, 2), o('plant', 13, 7),
      // The staff room.
      o('fridge', 18, 2), o('coffeeMaker', 15, 2), o('diningTable', 16, 4), o('diningChair', 18, 4, 'left'), o('diningChair', 16, 5, 'up'), o('diningChair', 17, 5, 'up'), o('sofa', 15, 7, 'up'),
      // The locker room and the service stairs.
      o('stairs', 23, 3, 'up'), o('gjLockers', 20, 7, 'up'), o('clothesCabinet', 22, 2), o('linenShelf', 20, 3, 'right'),
      // The lobby: the front desk facing the door, the concierge and the lifts beside it; the bell desk and the luggage by the door; the lounge.
      o('frontDesk', 12, 9), o('conciergeDesk', 15, 9), o('htlElevatorBank', 16, 9), o('htlBellDesk', 14, 13, 'up'), o('luggageCart', 15, 13, 'up'),
      o('htlCenterpiece', 8, 11), o('htlLoungeSofa', 3, 13, 'up'), o('armchair', 2, 11, 'right'), o('armchair', 5, 12, 'left'), o('aquarium', 2, 9), o('paintingLandscape', 7, 9), o('plant', 17, 13), o('plant', 9, 9),
      // The guests' restrooms.
      o('plant', 19, 13), o('toilet', 23, 9, 'left'), o('sink', 23, 10, 'left'), o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // Outside: the canopy over the door and the drop-off.
      o('htlPorteCochere', 16, 15),
      // Upstairs. Three rooms of one plan: the bed, the lamp, the wardrobe, the minibar, an armchair, the TV, the shower and basin.
      up('hotelBed', 2, 2), up('lamp', 4, 2), up('clothesCabinet', 5, 2), up('minibar', 6, 2), up('armchair', 6, 4, 'left'), up('tv', 5, 6, 'up'), up('shower', 2, 6), up('sink', 3, 6, 'up'),
      up('hotelBed', 11, 2), up('lamp', 10, 2), up('clothesCabinet', 9, 2), up('minibar', 8, 2), up('armchair', 8, 4, 'right'), up('tv', 8, 6, 'up'), up('shower', 12, 6), up('sink', 11, 6, 'up'),
      up('hotelBed', 14, 2), up('lamp', 16, 2), up('clothesCabinet', 17, 2), up('minibar', 18, 2), up('armchair', 18, 4, 'left'), up('tv', 17, 6, 'up'), up('shower', 14, 6), up('sink', 15, 6, 'up'),
      // The linen pantry: the shelves, the housekeeping cart; the service stairs come up in its corner.
      up('linenShelf', 20, 2), up('linenShelf', 21, 2), up('htlHousekeepingCart', 20, 5, 'right'),
      // The corridor: a housekeeping cart at work; the lift hall.
      up('htlHousekeepingCart', 7, 8), up('htlElevatorBank', 20, 13, 'up'), up('plant', 23, 10), up('sofa', 22, 13, 'up'),
      // The family room.
      up('hotelBed', 2, 11), up('lamp', 4, 11), up('clothesCabinet', 6, 11), up('minibar', 8, 11), up('armchair', 8, 13, 'left'),
      // The suite: the bed, the minibar, the dining table, the lounge sofa and an armchair.
      up('hotelBed', 16, 11), up('minibar', 15, 11), up('diningTable', 10, 11), up('diningChair', 10, 12, 'up'), up('htlLoungeSofa', 12, 13, 'up'), up('armchair', 14, 13, 'up'),
    ],
    coworkers: [
      { name: '여지수 총지배인', shirt: '#212121', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '문하진', shirt: '#b71c1c', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '백소라', shirt: '#fafafa', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // In the lobby's lounge.
    clients: [{ noun: '투숙객', socials: ['welcomeGuest', 'resolveComplaint'], spots: [[3, 11], [5, 13], [6, 12]], max: 3, every: 40, patience: 120 }],
    alarm: { notice: '👑 VIP 투숙객 도착! 프런트 데스크로 가세요', done: '👑 VIP가 최고의 호텔이라고 칭찬했어요! 성과가 크게 올라요', missed: '⌛ VIP 응대가 늦어 불만이 접수됐어요 (성과 감소)', interaction: 'vipCheckIn', every: [180, 300], window: 45 },
    tasks: [task('checkin', '체크인 처리', ['checkInGuests'], 2), task('guests', '투숙객 응대', ['welcomeGuest', 'resolveComplaint'], 2), task('room', '객실 정비', ['makeUpRoom'])],
    extra: [
      task('concierge', '관광 일정 짜 주기', ['planItinerary']), task('luggage', '짐 옮기기', ['deliverLuggage', 'htlTagLuggage', 'htlEscortGuest']), task('vip', 'VIP 체크인', ['vipCheckIn']),
      task('housekeeping', '객실 비품 채우기', ['restockMinibar', 'foldLinens', 'htlStockCart']), task('breakfast', '조식 뷔페 세팅', ['htlSetBuffet']), boss('총지배인님께 보고'),
    ],
    work: ['checkInGuests', 'answerPhone', 'vipCheckIn', 'planItinerary', 'deliverLuggage', 'makeUpRoom', 'restockMinibar', 'foldLinens', 'welcomeGuest', 'resolveComplaint', 'htlTagLuggage', 'htlEscortGuest', 'htlSetBuffet', 'htlStockCart'],
    skill: 'charisma',
    floors: { carpet: 'lilacCarpet', tile: 'creamTile', wood: 'walnutWood' },
    wall: 'oakWainscot',
  },
  tattooArtist: {
    careerId: 'tattooArtist',
    name: '타투 스튜디오',
    icon: '🖋️',
    // A 타투 스튜디오 in a row of shops (2026-11-05, the layout audit, replacing a building on a lawn: a corridor of a waiting room with
    // the consultation table squeezed in a corner, three chairs open side by side in one big room, a sterilisation room half its size
    // and the only toilet in the staff room). As a real one, smaller: through the door (by appointment, the blinds down) the front
    // room where the design is settled, the flash wall over the consultation table with its portfolio books, the artist's stencil
    // desk and the practice arm, the waiting sofa, the counter where the aftercare is explained and paid; the customers' restroom off
    // it. Behind, the work room: three booths along the back wall, a curtain between each, the client in the chair laid out for the
    // part being worked on, windowless; off it the small sterilisation room with the two autoclaves and the ink and sterile shelf.
    // The record shop next door.
    tiles: () =>
      shopUnit(
        17,
        4,
        [[2, 5, 13, 8, 'wood'], [15, 5, 16, 8, 'tile'], [2, 10, 16, 13, 'wood']],
        [[14, 6], [12, 9], [14, 13], [12, 14]],
        [[14, 11, 'wall'], [15, 11, 'wall'], [16, 11, 'wall'], [14, 12, 'wall'], [15, 12, 'tile'], [16, 12, 'tile'], [15, 13, 'tile'], [16, 13, 'tile']],
      ),
    restrooms: [[15, 12, 16, 13]],
    windowless: ['tattooChair'],
    ground: [[0, 0, 25, 3, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The booths, a curtain between each; the sterilisation room.
      o('tattooChair', 3, 5), o('ptCurtain', 5, 5), o('tattooChair', 7, 5), o('ptCurtain', 9, 5), o('tattooChair', 11, 5), o('lamp', 13, 5),
      o('sterilizer', 15, 5), o('sterilizer', 16, 5), o('ttInkShelf', 15, 8, 'up'),
      // The front room: the flash wall over the consultation table, the stencil desk, the practice arm, the sofa, the counter.
      o('flashWall', 2, 10), o('ttStencilTable', 5, 10), o('ttPracticeBench', 9, 10), o('plant', 16, 10),
      o('ttConsultTable', 2, 12, 'up'), o('sofa', 5, 13, 'up'), o('ttAftercareCounter', 9, 12, 'up'),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The street: the front; the record shop next door.
      o('ttShopFront', 1, 15), o('ttNeighbor', 18, 4),
    ],
    coworkers: [
      { name: '나도현 대표', shirt: '#212121', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '은하린', shirt: '#4a148c', skin: '#f8d9c0', hair: '#c62828' },
      { name: '구태오', shirt: '#37474f', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // In the booths beside the chairs, and on the waiting sofa.
    clients: [{ noun: '타투 손님', socials: ['tattooConsult', 'tattooWork'], spots: [[4, 6], [8, 6], [12, 6], [5, 12], [7, 13]], max: 2, every: 50, patience: 150 }],
    alarm: { notice: '🎨 라이브 시연 시간이에요! 시술 의자로 가세요', done: '🎨 관객들이 감탄했어요! 성과가 크게 올라요', missed: '⌛ 시연에 늦어 다른 작가가 무대에 섰어요 (성과 감소)', interaction: 'liveTattooDemo', every: [200, 320], window: 45 },
    tasks: [task('tattoo', '타투 시술', ['tattooWork'], 2), task('consult', '도안 상담', ['tattooConsult', 'ttPortfolioTalk']), task('flash', '도안 그리기', ['drawFlash', 'ttTraceStencil'])],
    extra: [task('sterilize', '장비 소독하기', ['sterilizeTools', 'ttLoadAutoclave'], 2), task('prep', '시술대 준비하기', ['prepareStation', 'ttThermalCopy', 'ttCheckInk']), task('demo', '라이브 시연', ['liveTattooDemo']), task('aftercare', '시술 후 관리 안내하기', ['ttAftercareTalk']), task('practice', '실리콘 팔로 연습하기', ['ttPracticeSkin']), boss('대표님께 작품 보여 드리기')],
    work: ['tattooWork', 'tattooConsult', 'drawFlash', 'sterilizeTools', 'prepareStation', 'liveTattooDemo', 'ttTraceStencil', 'ttThermalCopy', 'ttCheckInk', 'ttLoadAutoclave', 'ttPortfolioTalk', 'ttAftercareTalk', 'ttPracticeSkin'],
    skill: 'painting',
    floors: { wood: 'walnutWood', tile: 'monoTile' },
    wall: 'redBrick',
  },
  tvHost: {
    careerId: 'tvHost',
    windowless: ['talkShowSet', 'newsDesk', 'tsControlDesk', 'radioBooth'],
    name: '방송국 스튜디오',
    icon: '🎙️',
    // A broadcaster's TV studio floor (2026-11-05, the layout audit, replacing a hall on a lawn with windows in the studio, one door
    // straight in from a lobby that had the restroom in it, and the control desk in the radio booth's room where the studio couldn't be
    // seen). In past the lobby's security gate and desk to the corridor, never straight onto the floor. The studio is a windowless,
    // soundproofed room behind its door with the ON AIR light: the talk show's set and its game corner, the news corner on the other
    // side with its own backdrop, the audience's bench, the cameras, the floor manager's board, the writers' table and the cue-card
    // desk. The control room (부조정실) is beside it with a window onto the floor: the monitor wall, the cue sheet and the vision mixer
    // the PD and the technical director call the show from. The 보이는 라디오 booth is a small room of its own, the restroom at the
    // corridor's end, and the make-up and green room where the guests are briefed.
    tiles: () =>
      building(
        [[2, 2, 12, 9, 'carpet'], [14, 2, 18, 6, 'carpet'], [20, 2, 23, 6, 'carpet'], [14, 8, 20, 8, 'tile'], [14, 9, 15, 13, 'tile'], [2, 11, 12, 13, 'tile'], [22, 8, 23, 9, 'tile'], [17, 10, 21, 13, 'wood'], [22, 11, 23, 13, 'wood']],
        [[13, 8], [16, 7], [20, 7], [21, 8], [16, 11], [13, 12], [12, 14]],
      ),
    restrooms: [[22, 8, 23, 9]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The talk show (2026-10-26, at the user's request): the guests sit on the set's own sofa (its left and middle front tiles, from
      // the spots in front), the lights stand out front either side, and the camera faces the set (a camera's lens is at its back), its
      // operator behind it. The applause sign; the game corner's buzzer desk before the set; the audience's bench behind.
      o('plant', 2, 2), o('talkShowSet', 3, 2), o('tsApplauseSign', 6, 2), o('studioLight', 2, 5), o('studioLight', 6, 4), o('tsBuzzerDesk', 3, 6, 'up'), o('tsAudienceBench', 2, 8, 'up'),
      // The news corner, its own backdrop between it and the talk show; its pedestal camera; the film camera on the talk show.
      o('anNewsSet', 8, 2), o('newsDesk', 9, 3), o('plant', 12, 2), o('movieCamera', 7, 6), o('tsPedestalCam', 10, 6),
      // The floor manager's board, the writers' table, the cue-card desk; the window into the control room.
      o('tsCueBoard', 8, 7), o('tsScriptTable', 8, 9, 'up'), o('cueCardTable', 12, 9, 'left'), o('sgBoothWindow', 12, 4, 'left'),
      // The control room: the monitor wall, the cue sheet, the vision mixer.
      o('anMonitorWall', 14, 2), o('anRundownBoard', 17, 2), o('tsControlDesk', 14, 4),
      // The radio booth; the restroom.
      o('radioBooth', 21, 2), o('plant', 23, 2),
      o('toilet', 23, 9, 'left'), o('sink', 23, 8, 'left'),
      // The corridor: the ON AIR light by the studio's door.
      o('tsOnAirSign', 14, 9, 'right'),
      // The make-up and green room: the mirrors, the guests' corner where they're briefed, the coffee, the sofa.
      o('makeupMirror', 18, 10), o('makeupMirror', 19, 10), o('makeupMirror', 20, 10), o('coffeeMaker', 21, 10), o('tsGreenBrief', 21, 12, 'up'), o('sofa', 17, 13, 'up'),
      // The lobby: the security gate by the corridor's door, the visitors' desk, the seats.
      o('sgSpeedGate', 11, 11, 'left'), o('sgVisitorDesk', 5, 13, 'up'), o('drWaitSeat', 8, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('plant', 2, 13),
    ],
    coworkers: [
      { name: '방준석 PD', shirt: '#263238', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '이소리 작가', shirt: '#ec407a', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '조명훈 감독', shirt: '#455a64', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // On the set's sofa, or on the green room's.
    clients: [{ noun: '게스트', socials: ['interviewGuest', 'warmUpAudience'], spots: [[3, 4], [4, 4], [17, 12], [18, 12]], max: 2, every: 60, patience: 150 }],
    alarm: { notice: '🔴 생방송 1분 전! 스튜디오 세트로 가세요', done: '🔴 생방송이 순조롭게 끝났어요! 시청률도 대박! 성과가 크게 올라요', missed: '⌛ 생방송에 늦어 대타 진행자가 들어갔어요 (성과 감소)', interaction: 'goLive', every: [180, 300], window: 30, minLevel: 1 },
    // The 방송국 FD prepares cue cards and gives the cues; hosting is from 리포터 on (2026-10-26, at the user's request).
    tasks: [gated(task('rehearse', '진행 리허설', ['rehearseShow'], 2), { minLevel: 1 }, task('cue', '큐카드 준비·현장 큐 주기', ['prepareCueCards'], 2)), task('guests', '게스트 응대', ['interviewGuest', 'warmUpAudience', 'tsWarmUp', 'tsBriefGuest'], 2), task('news', '뉴스 원고 연습', ['readNews'])],
    extra: [task('cue', '큐카드 준비하기', ['prepareCueCards', 'tsGiveCue']), task('camera', '카메라 구도 맞추기', ['tsFrameShot']), task('script', '대본 다듬기', ['tsPunchUp', 'tsReadThrough']), task('gallery', '부조정실 방송 점검', ['tsSwitchShots', 'tsCheckAir']), task('buzzer', '부저 점검하기', ['tsTestBuzzer']), gated(task('game', '게임 코너 진행', ['tsRunGame']), { minLevel: 1 }), gated(task('radio', '라디오 진행', ['hostRadio']), { minLevel: 1 }), gated(task('live', '생방송 진행', ['goLive']), { minLevel: 1 }), boss('PD님과 큐시트 회의')],
    work: ['rehearseShow', 'goLive', 'readNews', 'prepareCueCards', 'hostRadio', 'reviewTakes', 'getMakeup', 'interviewGuest', 'warmUpAudience', 'tsFrameShot', 'tsGiveCue', 'tsWarmUp', 'tsRunGame', 'tsTestBuzzer', 'tsSwitchShots', 'tsCheckAir', 'tsPunchUp', 'tsReadThrough', 'tsBriefGuest'],
    skill: 'charisma',
    floors: { wood: 'walnutWood', carpet: 'slateStone', tile: 'monoTile' },
    wall: 'navyWainscot',
  },
  astronaut: {
    careerId: 'astronaut',
    windowless: ['missionConsole', 'asBigCentrifuge'],
    name: '우주 센터',
    icon: '🚀',
    // The astronauts' building of a space centre, laid out again for its space (2026-11-05, the layout audit, at the user's request,
    // after the 2026-11-04 plan left a big empty training floor with a small mock-up and rig along its walls, a 2 × 2 centrifuge in a
    // half-empty room, and mission control crowded into one corner over an empty gallery). Out front on the campus plaza the
    // launch-vehicle display and the tracking antenna. Downstairs, the halls at their real scale, as at an astronaut training centre:
    // the training hall with the full-size station module and the spacecraft mock-up side by side along the back, the low-gravity
    // rig, the robotic-arm trainer and the survival corner before them, the suit-fitting rack; the neutral-buoyancy pool hall, the
    // pool with its gantry crane and a module mock-up on the bottom, the test conductor's desk by it; the centrifuge hall, filled by
    // a centrifuge with a long arm, and its control room off the pool hall's corridor. The visitors' lobby: the security desk and
    // the gate, the suit and the press and school-visit wall, the seats, the stairs up to the gallery and the restroom. Upstairs
    // mission control, dark and without windows: the ground-track wall, two tiers of consoles and the flight director's behind them,
    // then the glass and the visitors' gallery; the research room with the desks and the glovebox; the crew room for the briefings,
    // with the treadmill.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 12, 7, 'tile'], [14, 2, 23, 7, 'tile'], [2, 9, 13, 13, 'carpet'], [15, 9, 20, 13, 'tile'], [22, 9, 23, 13, 'carpet']],
          [[13, 4], [7, 8], [15, 8], [22, 8], [14, 11], [12, 14]],
        ),
        [[2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door']],
      ),
      ...upstairs([[2, 2, 13, 13, 'carpet'], [15, 2, 23, 6, 'tile'], [15, 8, 23, 13, 'carpet']], [[14, 4], [14, 11], [19, 7]]),
    ],
    restrooms: [[2, 12, 3, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The campus plaza: the launch-vehicle display, the tracking antenna.
      o('asLaunchDisplay', 3, 15), o('asDishAntenna', 22, 15, 'left'),
      // The training hall: the station module and the spacecraft mock-up along the back, the fitting rack; the low-gravity rig, the
      // arm trainer and the survival corner before them.
      o('asModuleMockup', 2, 2), o('spacecraftMockup', 8, 2), o('asSuitRack', 11, 2), o('asLowGravRig', 2, 5), o('asArmTrainer', 6, 6), o('asSurvivalCorner', 9, 5),
      // The pool hall: the pool, the test conductor's desk.
      o('asNbPool', 15, 2), o('officeDesk', 23, 3, 'left'), o('plant', 23, 6),
      // The centrifuge hall, and its control room.
      o('asBigCentrifuge', 16, 9, 'left'), o('officeDesk', 23, 10, 'left'), o('officeDesk', 23, 12, 'left'), o('plant', 23, 13),
      // The lobby: the security desk and the gate, the suit on show, the press and school-visit wall, the visitors' seats, the stairs.
      o('lobbyDesk', 9, 9), o('sgSpeedGate', 5, 10), o('spacesuitDisplay', 2, 9), o('asPressWall', 3, 9),
      o('drWaitSeat', 13, 11, 'left'), o('drWaitSeat', 13, 12, 'left'), o('stairs', 8, 13, 'right'),
      o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
      // Upstairs. Mission control: the ground-track wall, two tiers of consoles facing it, the flight director's behind them.
      up('asGroundTrack', 4, 2), up('missionConsole', 3, 4), up('missionConsole', 5, 4), up('missionConsole', 7, 4), up('missionConsole', 9, 4),
      up('missionConsole', 4, 6), up('missionConsole', 6, 6), up('missionConsole', 8, 6), up('missionConsole', 6, 8), up('plant', 12, 2),
      // The glass and the visitors' gallery behind it.
      up('asGalleryGlass', 2, 10), up('lwGalleryBench', 3, 12, 'up'), up('lwGalleryBench', 6, 12, 'up'), up('lwGalleryBench', 10, 12, 'up'),
      // The research room.
      up('researchDesk', 15, 2), up('researchDesk', 16, 2), up('asGlovebox', 20, 2), up('whiteboard', 22, 2), up('plant', 23, 6),
      // The crew room: the briefing board and table, the sofa, the coffee, the treadmill.
      up('whiteboard', 16, 8), up('salMeetingTable', 18, 10), up('salMeetingChair', 18, 9), up('salMeetingChair', 19, 9), up('salMeetingChair', 18, 11, 'up'), up('salMeetingChair', 19, 11, 'up'), up('sofa', 16, 13, 'up'), up('coffeeMaker', 20, 13, 'up'), up('fridge', 21, 13, 'up'), up('treadmill', 23, 8), up('plant', 15, 13),
    ],
    coworkers: [
      { name: '배정민 비행 책임자', shirt: '#0d47a1', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '설지아 연구원', shirt: '#eceff1', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '추강민 교관', shirt: '#ef6c00', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // In the lobby, by the visitors' seats.
    clients: [{ noun: '견학 온 학생', socials: ['explainSpace', 'astronautPhoto'], spots: [[12, 11], [12, 12]], max: 2, every: 70, patience: 120, age: 'child' }],
    alarm: { notice: '🛰️ 궤도 위성에서 이상 신호! 관제 콘솔로 가세요', done: '🛰️ 이상 신호를 바로잡았어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 위성 임무가 하루 미뤄졌어요 (성과 감소)', interaction: 'resolveAnomaly', every: [200, 320], window: 45 },
    tasks: [task('monitor', '발사 데이터 모니터링', ['monitorLaunch'], 2), task('dock', '도킹 절차 훈련', ['dockingDrill']), task('gforce', '중력 가속도 훈련', ['gForceTraining'])],
    extra: [task('visitors', '견학 학생 안내', ['explainSpace', 'astronautPhoto'], 2), task('paper', '연구 논문 쓰기', ['writePaper']), task('anomaly', '이상 신호 대응', ['resolveAnomaly']), task('suit', '우주복·헬멧 점검', ['checkSpacesuit', 'asFitSuit', 'asCarryHelmet']), task('lowg', '저중력 훈련', ['asLowWalk', 'asLowSample']), task('arm', '로봇팔 훈련', ['asArmCapture', 'asArmBerth']), task('science', '궤도 과학 실험', ['asGloveCrystal', 'asGloveFluid']), task('survival', '생존 훈련', ['asShelter', 'asSignal']), task('press', '언론·견학 응대', ['asPress', 'asCards']), boss('비행 책임자께 보고')],
    work: ['monitorLaunch', 'stationComms', 'resolveAnomaly', 'dockingDrill', 'evaDrill', 'gForceTraining', 'checkSpacesuit', 'writePaper', 'workout', 'explainSpace', 'astronautPhoto', 'asFitSuit', 'asCarryHelmet', 'asLowWalk', 'asLowSample', 'asArmCapture', 'asArmBerth', 'asGloveCrystal', 'asGloveFluid', 'asShelter', 'asSignal', 'asPress', 'asCards'],
    skill: 'logic',
    floors: { tile: 'slateStone', carpet: 'slateStone' },
    wall: 'navyWainscot',
  },
  athletic: {
    careerId: 'athletic',
    name: '스포츠 구단 훈련장',
    icon: '🏅',
    // A club's training ground (2026-11-05, the layout audit, replacing one building on a lawn where every drill was done indoors on
    // a three-tile sprint strip, fans waited on dining chairs in the lobby and the bus stood on the grass): most of the lot is the
    // ground itself, a corner of a grass pitch behind its fence with a full-size goal, the boxes in front of it, the agility grid
    // and the sprint lane up the touchline from the blocks, the substitutes' bench by the clubhouse. The gate on the street has its
    // guard booth and barrier; fans meet the players only at the fence outside on a 사인회 day. The coach waits on its paved bay
    // inside the gate, nose to the street. The clubhouse has two floors: downstairs the locker room opening straight onto the pitch
    // (the lockers, the showers, the board for a short team talk), the physio room with its tables, the ice bath and the restroom,
    // and the players' entrance with the trophy cabinet and the stairs; upstairs the video analysis room (the screen, the tactics
    // board, the players on their bench), the weight room and the players' dining room.
    tiles: () => [
      ...patch(
        building(
          [[17, 2, 23, 4, 'wood'], [17, 6, 23, 9, 'tile'], [17, 11, 23, 13, 'wood']],
          [[16, 3], [18, 5], [19, 10], [16, 12], [18, 14], [21, 8]],
        ),
        [
          // The ground is open air up to the clubhouse's west wall.
          ...Array.from({ length: 15 * 14 }, (_, i): [number, number, 'grass'] => [1 + (i % 15), 1 + Math.floor(i / 15), 'grass']),
          // The restroom in the physio room's corner.
          [21, 7, 'wall'], [22, 7, 'wall'], [23, 7, 'wall'], [21, 9, 'wall'],
        ],
      ),
      ...patch(
        upstairs([[17, 2, 23, 5, 'carpet'], [17, 7, 23, 9, 'wood'], [17, 11, 23, 13, 'tile']], [[20, 6], [18, 10]]),
        Array.from({ length: 15 * 14 }, (_, i): [number, number, 'void'] => [1 + (i % 15), 1 + Math.floor(i / 15), 'void']),
      ),
    ],
    restrooms: [[22, 8, 23, 9]],
    ground: [[12, 5, 15, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The ground: its fence, the pitch's lines, the goal, the agility grid, the sprint lane's blocks, the bench by the touchline.
      o('athGroundFence', 0, 0), o('athPitch', 1, 1), o('athGoal', 3, 1), o('athAgility', 6, 8), o('sprintTrack', 1, 10, 'right'), o('rxWaitBench', 13, 2, 'left'),
      // The gate: the guard booth with its barrier; the coach on its bay, nose to the street.
      o('athGateBooth', 11, 14), o('teamBus', 13, 9, 'left'),
      // The locker room: the players' lockers, the showers, the water, the board for a short talk.
      o('athLockers', 17, 2), o('athLockers', 19, 2), o('athLockers', 22, 4, 'up'), o('athHydration', 21, 2), o('shower', 22, 2), o('shower', 23, 2), o('tacticsBoard', 20, 4, 'up'),
      // The physio room: the two tables, the ice bath, the ice machine; the restroom.
      o('physioTable', 17, 6), o('physioTable', 19, 6), o('athIceBath', 17, 9, 'up'), o('fridge', 23, 6, 'left'),
      o('toilet', 23, 8, 'left'), o('sink', 23, 9, 'left'),
      // The players' entrance: the trophy cabinet, the stairs.
      o('athTrophyCase', 21, 11), o('stairs', 20, 13, 'left'), o('posterPop', 23, 11), o('plant', 17, 13),
      // Upstairs. The video analysis room: the analyst's desk, the screen, the tactics board, the players on their bench.
      up('officeDesk', 17, 2), up('athMatchScreen', 19, 2), up('tacticsBoard', 21, 2), up('athTeamBench', 19, 4, 'up'), up('diningChair', 22, 4, 'up'), up('diningChair', 23, 4, 'up'), up('plant', 23, 2),
      // The weight room.
      up('weightRack', 17, 7), up('pullUpBar', 19, 7), up('weightRack', 21, 7), up('treadmill', 23, 7), up('athHydration', 17, 9, 'up'), up('weightRack', 20, 9, 'up'),
      // The players' dining room.
      up('diningTable', 19, 11), up('diningChair', 21, 11, 'left'), up('fridge', 22, 11), up('coffeeMaker', 23, 11), up('sofa', 17, 13, 'up'), up('salWaterCooler', 19, 13, 'up'),
    ],
    coworkers: [
      { name: '탁성훈 감독', shirt: '#1b5e20', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '모재현 선수', shirt: '#c62828', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '남궁하윤 코치', shirt: '#283593', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // On a 사인회 day, at the fence on the pavement outside.
    clients: [{ noun: '팬', socials: ['signAutograph', 'fanSelfie'], spots: [[5, 15], [7, 15], [9, 15]], max: 2, every: 60, patience: 120 }],
    alarm: { notice: '📣 경기 출전 명단에 올랐어요! 구단 버스로 경기장에 가세요', done: '🏆 경기에서 활약했어요! 성과가 크게 올라요', missed: '⌛ 늦어서 출전 명단에서 빠졌어요 (성과 감소)', interaction: 'playMatch', every: [200, 320], window: 45 },
    tasks: [task('sprint', '스프린트·민첩성 훈련', ['sprintDrill', 'athLadder'], 2), task('weights', '웨이트 트레이닝', ['liftWeights']), task('tactics', '작전 분석', ['studyPlays'])],
    extra: [task('fans', '팬 서비스', ['signAutograph', 'fanSelfie'], 2), task('physio', '회복 관리 (물리 치료·냉탕)', ['getPhysio', 'athIceBath']), task('kit', '물병·라커룸 준비', ['athFillBottles', 'athTidyLockers']), task('match', '경기 출전', ['playMatch']), boss('감독님과 면담하기')],
    // 피트니스 trains bodies, its own and members'; no team tactics or league matches (2026-10-26).
    branchTasks: [undefined, [task('weights', '웨이트 트레이닝', ['liftWeights'], 2), task('pullups', '턱걸이 훈련', ['doPullUps']), task('sprint', '유산소 훈련', ['sprintDrill', 'athLadder'])]],
    branchExtra: [undefined, [task('fans', '팬 서비스', ['signAutograph', 'fanSelfie'], 2), task('physio', '회복 관리 (물리 치료·냉탕)', ['getPhysio', 'athIceBath']), boss('관장님과 면담하기')]],
    work: ['sprintDrill', 'liftWeights', 'studyPlays', 'getPhysio', 'playMatch', 'doPullUps', 'workout', 'signAutograph', 'fanSelfie', 'athLadder', 'athIceBath', 'athFillBottles', 'athTidyLockers', 'athLoadKit'],
    skill: 'fitness',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  sales: {
    careerId: 'sales',
    name: '영업 본부',
    icon: '💼',
    // A sales division on a floor of an office building (2026-11-05, the layout audit, replacing a lone building on a lawn whose
    // toilet stood in the middle of the contract room beside a stock-trading terminal, with the coffee in a corridor lobby of
    // waiting chairs and no teams or team leaders). In from the street the floor's lift hall and its restroom; through the glass
    // door the reception, short, with the meeting room for customers right by it (the presentation screen, the contract table).
    // Either side a sales team: the 1팀 on the left under the results board and the morning huddle board, the 2팀 on the right
    // with the whiteboard and the copier, each its desks pushed together in an island and its 팀장's desk at the head of it; the
    // sample and brochure room behind the 1팀, the pantry behind the 2팀. Out front, the company car the visits are made in.
    tiles: () =>
      building(
        [[2, 2, 7, 9, 'carpet'], [9, 2, 14, 5, 'carpet'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'carpet'], [2, 11, 7, 13, 'tile'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'wood']],
        [[8, 8], [5, 10], [10, 10], [10, 6], [15, 9], [20, 10], [14, 12], [12, 14]],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The reception; the meeting room for customers.
      o('lobbyDesk', 12, 7), o('plant', 9, 7),
      o('salesPresentation', 9, 2), o('contractTable', 13, 2), o('salMeetingChair', 12, 2, 'right'), o('salMeetingChair', 13, 5, 'up'), o('plant', 14, 5),
      // The 1팀: the results board, the huddle board, the island, the 팀장's desk at its head.
      o('salesLeaderboard', 2, 2), o('salesHuddleBoard', 5, 2),
      o('salesPhoneDesk', 3, 5, 'up'), o('salesPhoneDesk', 4, 5, 'up'), o('salesPhoneDesk', 5, 5, 'up'), o('salesPhoneDesk', 3, 6), o('salesPhoneDesk', 4, 6), o('salesPhoneDesk', 5, 6),
      o('salesPhoneDesk', 6, 5, 'right'), o('plant', 2, 9),
      // The 2팀: the island, the 팀장's desk, the whiteboard, the copier.
      o('salesPhoneDesk', 18, 4, 'up'), o('salesPhoneDesk', 19, 4, 'up'), o('salesPhoneDesk', 20, 4, 'up'), o('salesPhoneDesk', 18, 5), o('salesPhoneDesk', 19, 5), o('salesPhoneDesk', 20, 5),
      o('salesPhoneDesk', 21, 4, 'right'), o('salesPhoneDesk', 19, 8, 'up'), o('salesPhoneDesk', 20, 8, 'up'), o('salesPhoneDesk', 21, 8, 'up'), o('whiteboard', 17, 9, 'up'), o('copier', 23, 7, 'left'), o('plant', 16, 2), o('plant', 23, 2),
      // The sample and brochure room.
      o('sampleShelf', 2, 11), o('sampleShelf', 3, 11), o('sampleShelf', 6, 11), o('salesBrochureCounter', 2, 13, 'up'), o('archiveShelf', 6, 13, 'up'),
      // The pantry.
      o('coffeeMaker', 18, 11), o('salWaterCooler', 19, 11), o('fridge', 18, 13, 'up'), o('diningTable', 21, 12), o('diningChair', 21, 13, 'up'), o('diningChair', 22, 13, 'up'),
      // Out front: the company car.
      o('salesCompanyCar', 16, 15),
    ],
    coworkers: [
      { name: '윤태석 본부장', shirt: '#263238', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '차은비 대리', shirt: '#d81b60', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '노승현 과장', shirt: '#546e7a', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    // In the meeting room by the reception.
    clients: [{ noun: '거래처 담당자', socials: ['pitchProduct', 'negotiateDeal'], spots: [[12, 3], [12, 5]], max: 2, every: 60, patience: 150 }],
    alarm: { notice: '🤝 큰 거래처가 계약하러 왔어요! 계약 테이블로 가세요', done: '🤝 대형 계약 체결! 성과가 크게 올라요', missed: '⌛ 기다리다 지친 거래처가 경쟁사와 계약했어요 (성과 감소)', interaction: 'closeDeal', every: [200, 320], window: 45 },
    tasks: [task('calls', '영업 전화 돌리기', ['coldCall'], 2), task('clients', '거래처 상담', ['pitchProduct', 'negotiateDeal'], 2), task('proposal', '제안서 쓰기', ['writeProposal'])],
    // 경영자 up to 그룹 회장 runs meetings and contracts, the investor watches markets; neither cold-calls (2026-10-26).
    branchTasks: [
      [task('meeting', '경영 회의 참석', ['attendMeeting']), task('clients', '거래처 상담', ['pitchProduct', 'negotiateDeal'], 2), task('contract', '계약서 검토', ['reviewContract'])],
      // The investor works at their own lot (sales@1, the VC firm), with its own tasks.
      undefined,
    ],
    extra: [task('meeting', '영업 회의 참석', ['attendMeeting', 'salesMorningHuddle']), task('samples', '제품 샘플 준비', ['prepareSamples', 'salesPrepareVisit']), task('deal', '대형 계약 체결', ['closeDeal']), task('presentation', '고객 제안 발표', ['salesPresentProduct']), task('record', '수주 실적 등록', ['salesRecordDeal']), boss('본부장님께 실적 보고')],
    work: ['coldCall', 'writeProposal', 'closeDeal', 'reviewContract', 'prepareSamples', 'makeCopies', 'attendMeeting', 'pitchProduct', 'negotiateDeal', 'salesMorningHuddle', 'salesPrepareVisit', 'salesPresentProduct', 'salesRecordDeal'],
    skill: 'charisma',
    floors: { carpet: 'slateStone', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  entertainer: {
    careerId: 'entertainer',
    windowless: ['clubStage'],
    name: '코미디 클럽 공연장',
    icon: '🎤',
    // A stand-up club on a 대학로 street (2026-11-05, the layout audit, replacing a building on a lawn with windows in the hall,
    // the mic apart from the stage, a few rows scattered, the dressing room reached only through the lobby and the writers' room,
    // and the only restroom in the dressing room). As a 소극장 is: the posters on the street wall by the door; in to the lobby, the
    // box office, the bar where the drink that comes with the ticket is poured, the poster wall, the audience's restroom. The one
    // dark hall: the stage at the far end with its own mic, the piano beside it, the little tables in rows, every chair turned to
    // the stage, the front row of chairs at its lip, the sound and light console at the back by the door. Behind the stage the
    // backstage door to the green room (the bulb-lit vanity, the mirror, the night's running order, the corner with a mic where
    // a set is run through, tea and the sofa), and past it the club's office (the writers' desks, the table where the bits are
    // gone over, the box office's books), with its own door from the lobby for the staff: no performer crosses the house.
    tiles: () =>
      patch(
        building(
          [[2, 2, 15, 9, 'carpet'], [17, 2, 23, 7, 'wood'], [17, 9, 23, 13, 'wood'], [2, 11, 15, 13, 'tile']],
          [[6, 10], [16, 7], [20, 8], [16, 12], [12, 14]],
        ),
        [[2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door']],
      ),
    restrooms: [[2, 12, 3, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The hall: the stage and the piano at the far end; the tables in rows facing it, the front row of chairs at its lip; the
      // console at the back.
      o('clubStage', 14, 4, 'left'), o('piano', 15, 2, 'left'), o('lamp', 15, 8),
      o('enHouseRow', 5, 2, 'right'), o('enHouseRow', 7, 2, 'right'), o('enHouseRow', 9, 2, 'right'),
      o('enHouseRow', 3, 6, 'right'), o('enHouseRow', 5, 6, 'right'), o('enHouseRow', 7, 6, 'right'), o('enHouseRow', 9, 6, 'right'),
      o('diningChair', 11, 2, 'right'), o('diningChair', 11, 3, 'right'), o('diningChair', 11, 4, 'right'), o('diningChair', 11, 6, 'right'), o('diningChair', 11, 7, 'right'), o('diningChair', 11, 8, 'right'),
      o('enSoundConsole', 2, 4, 'right'), o('lamp', 2, 2),
      // The green room: the vanity, the mirror, the running order, tea, the practice mic, the sofa.
      o('enVanity', 17, 2), o('mirror', 19, 2), o('enSetlistCork', 20, 2), o('coffeeMaker', 22, 2), o('fridge', 23, 2),
      o('standupMic', 23, 5, 'left'), o('armchair', 17, 5, 'right'), o('sofa', 18, 7, 'up'),
      // The club's office: the writers' desks, the bits table, the box office's books.
      o('jokeDesk', 17, 9), o('jokeDesk', 18, 9), o('bookshelf', 22, 9), o('plant', 23, 9),
      o('salMeetingTable', 19, 11), o('salMeetingChair', 19, 12, 'up'), o('salMeetingChair', 20, 12, 'up'), o('salMeetingChair', 21, 12, 'up'), o('officeDesk', 23, 12, 'left'),
      // The lobby: the box office by the door, the poster wall, the bar; the audience's restroom.
      o('enTicketBooth', 13, 11), o('enPosterWall', 8, 11), o('enBarCounter', 7, 13, 'up'),
      o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
      // On the street wall by the door: the posters.
      o('enPosterWall', 14, 15),
    ],
    coworkers: [
      { name: '엄태주 대표', shirt: '#311b92', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '설하나 피아니스트', shirt: '#212121', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '반지후 코미디언', shirt: '#fbc02d', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // In the front row at the stage's lip.
    clients: [{ noun: '관객', socials: ['crowdWork', 'signAutograph'], spots: [[12, 2], [12, 4], [12, 6], [12, 8]], max: 3, every: 50, patience: 120 }],
    alarm: { notice: '🎤 메인 공연 5분 전! 무대로 가세요', done: '👏 관객이 기립 박수를 보냈어요! 성과가 크게 올라요', missed: '⌛ 무대에 늦어 다른 공연자가 대신 올랐어요 (성과 감소)', interaction: 'headlineShow', every: [200, 320], window: 30 },
    tasks: [task('rehearse', '무대 리허설', ['rehearseSet', 'enSoundCheck'], 2), task('jokes', '개그 대본 쓰기', ['writeJokes', 'enSetlistSort']), task('music', '피아노 연습', ['playPiano'])],
    // The musician plays, the comedian writes and does stand-up (2026-10-26).
    branchTasks: [
      [task('rehearse', '무대 리허설', ['rehearseSet', 'enSoundCheck'], 2), task('music', '피아노 연습', ['playPiano'], 2)],
      [task('rehearse', '무대 리허설', ['rehearseSet', 'enSoundCheck'], 2), task('jokes', '개그 대본 쓰기', ['writeJokes', 'enSetlistSort']), task('mic', '스탠드업 연습', ['tellJokes'])],
    ],
    extra: [task('mic', '스탠드업 연습', ['tellJokes']), task('audience', '관객 응대', ['crowdWork', 'signAutograph'], 2), task('show', '메인 공연', ['headlineShow']), boss('대표님과 공연 회의')],
    work: ['rehearseSet', 'headlineShow', 'tellJokes', 'writeJokes', 'playPiano', 'practiceComedy', 'crowdWork', 'signAutograph', 'enBarDebrief', 'enPreShow', 'enSetlistSort', 'enSoundCheck'],
    skill: 'comedy',
    floors: { wood: 'walnutWood', carpet: 'lilacCarpet', tile: 'monoTile' },
    wall: 'redBrick',
  },
  secretAgent: {
    careerId: 'secretAgent',
    windowless: ['situationWall', 'icDocSafe'],
    name: '정보 분석센터',
    icon: '🗂️',
    // A secure analysis site (2026-11-05, the layout audit, replacing an office on a lawn walked into from the street, with a
    // waiting room's chairs in the lobby, a training mat and a restroom in the situation room and a sink among the files). Public
    // knowledge of such places is thin, so the plan follows what is said of them: a fenced forecourt behind the gate, its barrier
    // and the guard booth; a plain building with no name on it. In at its door the narrow 출입 통제 room, the badge desk and the
    // phone lockers, nothing more; off it, still outside the secure line, the room where people from partner agencies are met.
    // Through the secure door the hall with the stairs and the field-gear locker; the analysts' room (the desks, the cork board,
    // the signals seat, the shredder); the situation room and the vault beyond it, neither with windows. Upstairs the gym with
    // the mat and the treadmills, the lounge behind it, the restroom.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 8, 9, 'carpet'], [10, 2, 14, 5, 'tile'], [10, 7, 14, 9, 'tile'], [16, 2, 19, 5, 'carpet'], [21, 2, 23, 5, 'tile'], [16, 7, 23, 9, 'carpet']],
          [[9, 3], [15, 3], [12, 6], [12, 10], [15, 8], [20, 3]],
        ),
        [
          ...Array.from({ length: 22 * 3 }, (_, i): [number, number, 'grass'] => [2 + (i % 22), 11 + Math.floor(i / 22), 'grass']),
          ...Array.from({ length: 5 }, (_, i): [number, number, 'grass'] => [10 + i, 14, 'grass']),
        ],
      ),
      ...patch(
        upstairs(
          [[2, 2, 9, 5, 'wood'], [2, 7, 9, 9, 'carpet'], [11, 2, 14, 5, 'tile'], [13, 7, 14, 8, 'tile']],
          [[10, 3], [5, 6], [13, 6]],
        ),
        Array.from({ length: 26 * 15 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']).filter(([x, y]) => x >= 16 || y >= 11),
      ),
    ],
    restrooms: [[13, 25, 14, 26]],
    ground: [[1, 11, 24, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The fence, the gate and the booth round the forecourt.
      o('icPerimeter', 2, 13),
      // The 출입 통제 room: the badge desk, the phone lockers.
      o('icBadgeDesk', 10, 7), o('icPhoneLocker', 13, 7),
      // The room for partner agencies' people.
      o('salMeetingTable', 18, 9), o('salMeetingChair', 18, 8), o('salMeetingChair', 20, 8), o('plant', 23, 7),
      // The secure hall: the stairs, the field-gear locker.
      o('stairs', 11, 2, 'left'), o('icGearLocker', 13, 5, 'up'),
      // The analysts' room.
      o('icEvidenceBoard', 3, 2), o('icSignalDesk', 7, 2), o('intelDesk', 3, 5), o('intelDesk', 4, 5), o('intelDesk', 6, 5), o('intelDesk', 7, 5), o('intelDesk', 3, 8), o('intelDesk', 4, 8), o('shredder', 8, 8, 'left'), o('plant', 2, 2),
      // The situation room; the vault.
      o('cyberTerminal', 16, 2), o('situationWall', 17, 2), o('cyberTerminal', 19, 2), o('icBriefTable', 16, 4),
      o('archiveShelf', 21, 2), o('archiveShelf', 22, 2), o('icDocSafe', 23, 2), o('shredder', 23, 5, 'left'),
      // Upstairs: the gym; the lounge; the restroom.
      up('icDefenseMat', 3, 3), up('treadmill', 7, 2), up('treadmill', 8, 2),
      up('sofa', 2, 9, 'up'), up('coffeeMaker', 8, 7), up('fridge', 9, 7), up('salWaterCooler', 9, 9, 'left'),
      up('toilet', 14, 8, 'left'), up('sink', 14, 7, 'left'),
    ],
    coworkers: [
      { name: '도태준 팀장', shirt: '#212121', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '서은재 분석관', shirt: '#546e7a', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '임하람 정보관', shirt: '#37474f', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // In the room off the 출입 통제 room, outside the secure line.
    clients: [{ noun: '협력 기관 담당자', socials: ['debriefSource', 'shareIntel'], spots: [[17, 8], [21, 8]], max: 2, every: 80, patience: 150 }],
    alarm: { notice: '🚨 사이버 공격 징후 포착! 상황실 대형 화면으로 가세요', done: '🛡️ 공격을 초기에 막아 냈어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 피해 보고서를 쓰게 됐어요 (성과 감소)', interaction: 'crisisResponse', every: [200, 320], window: 45 },
    tasks: [task('analyze', '첩보 분석하기', ['analyzeIntel'], 2), task('brief', '정보 보고서 작성', ['writeBriefing']), task('situation', '상황 모니터링', ['monitorSituation'])],
    extra: [task('partners', '협력 기관 면담', ['debriefSource', 'shareIntel'], 2), task('trace', '해킹 시도 추적', ['traceHacker']), task('crisis', '긴급 상황 대응', ['crisisResponse']), task('board', '단서 보드 정리', ['icPinThread', 'icReviewBoard']), task('signal', '암호 신호 해독', ['icDecodeSignal']), task('secure', '보안 문서 관리', ['icFileSecret', 'shredDocs']), task('meeting', '작전 회의', ['icConveneTeam']), task('door', '출입·장비 관리', ['icIssueBadge', 'icCheckKit']), boss('팀장님께 정보 보고')],
    work: ['analyzeIntel', 'writeBriefing', 'monitorSituation', 'crisisResponse', 'traceHacker', 'shredDocs', 'readArchive', 'debriefSource', 'shareIntel', 'icPinThread', 'icReviewBoard', 'icDecodeSignal', 'icFileSecret', 'icConveneTeam', 'icIssueBadge', 'icCheckKit', 'icSparTraining'],
    skill: 'logic',
    floors: { carpet: 'slateStone', tile: 'monoTile', wood: 'oakWood' },
    wall: 'navyWainscot',
  },
  writer: {
    careerId: 'writer',
    name: '출판사 편집국',
    icon: '📝',
    // A publisher's 편집부 on a floor of an office building, as in 마포 (2026-11-05, the layout audit, replacing a lone building on a
    // lawn with a lobby where readers and sources waited on kitchen chairs by a table of new books, the writers' desks in a row down
    // the middle of the floor, no meeting room or chief editor's office, and the toilet in the middle of the library). Nobody waits
    // in a publisher's lobby: authors write at home and come in for meetings. In from the street the floor's lift hall and its
    // restroom; through the glass door a small reception (its desk, the shelf of the house's new books) with the meeting room off
    // it, where the editor goes over the proofs with an author round the table, sources are interviewed and the editorial meeting
    // is held. On the right the 편집부: the editors' desks pushed together in an island, the manuscripts and proofs on them, the
    // deadline board for the season's books, the copier, the trolley of galleys, and the 주간's office in its corner; the pantry
    // behind. On the left the design room where the pages are set (the typesetting desk, the designers' desks), a small writing
    // room off it with two desks where a visiting author works out a book's structure with the editor, and the 자료실 of the
    // house's back list behind.
    tiles: () =>
      patch(
        building(
          [[2, 2, 7, 5, 'carpet'], [2, 7, 7, 9, 'carpet'], [9, 2, 14, 5, 'wood'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'carpet'], [2, 11, 7, 13, 'wood'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'tile']],
          [[5, 6], [8, 8], [5, 10], [11, 6], [15, 8], [10, 10], [20, 10], [14, 12], [12, 14]],
        ),
        [[20, 2, 'wall'], [20, 3, 'wall'], [20, 4, 'door'], [20, 5, 'wall'], [20, 6, 'wall'], [21, 6, 'wall'], [22, 6, 'wall'], [23, 6, 'wall']],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The reception: its desk, the house's new books.
      o('officeDesk', 12, 8, 'up'), o('wrtNewReleaseTable', 9, 7), o('bookshelf', 14, 7), o('plant', 14, 9),
      // The meeting room: the proof table the proofs are gone over at, its chairs, the whiteboard.
      o('proofTable', 11, 3), o('salMeetingChair', 11, 2), o('salMeetingChair', 12, 2), o('salMeetingChair', 13, 3, 'left'),
      o('whiteboard', 9, 2, 'right'), o('plant', 14, 5),
      // The 편집부: the deadline board, the island of editors' desks, the galleys, the copier.
      o('wrtDeadlineBoard', 16, 2), o('plant', 19, 2),
      o('writingDesk', 16, 4, 'up'), o('writingDesk', 17, 4, 'up'), o('writingDesk', 18, 4, 'up'), o('writingDesk', 16, 5), o('writingDesk', 17, 5), o('writingDesk', 18, 5),
      o('wrtProofCart', 21, 7), o('bookshelf', 22, 7), o('bookshelf', 23, 7), o('copier', 16, 9, 'up'), o('plant', 23, 9),
      // The 주간's office.
      o('officeDesk', 22, 2), o('bookshelf', 23, 2), o('armchair', 23, 5, 'left'), o('plant', 21, 5),
      // The pantry.
      o('coffeeMaker', 18, 11), o('salWaterCooler', 19, 11), o('fridge', 18, 13, 'up'), o('diningTable', 21, 12), o('diningChair', 21, 13, 'up'), o('diningChair', 22, 13, 'up'),
      // The writing room: two desks for structuring a book, the shelves, an armchair.
      o('bookshelf', 2, 2), o('plotDesk', 3, 2), o('plotDesk', 6, 2), o('bookshelf', 7, 2), o('armchair', 2, 5, 'right'), o('plant', 7, 5),
      // The design room: the typesetting desk, the designers' desks, the shelves.
      o('wrtLayoutDesk', 3, 7), o('officeDesk', 4, 7), o('officeDesk', 6, 7), o('plant', 7, 7), o('bookshelf', 2, 9, 'up'), o('bookshelf', 3, 9, 'up'), o('plant', 7, 9),
      // The 자료실: the back list.
      o('bookshelf', 2, 11), o('bookshelf', 3, 11), o('bookshelf', 6, 11), o('bookshelf', 2, 13, 'up'), o('bookshelf', 3, 13, 'up'), o('bookshelf', 5, 13, 'up'), o('bookshelf', 6, 13, 'up'),
    ],
    coworkers: [
      { name: '나윤희 편집장', shirt: '#4e342e', skin: '#f8d9c0', hair: '#9e9e9e', boss: true },
      { name: '봉지석 기자', shirt: '#1565c0', skin: '#eac09a', hair: '#1a1a1a' },
      { name: '안소담 편집자', shirt: '#ad1457', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // Authors and sources come in for a meeting, at the meeting room's table.
    clients: [{ noun: '방문객', socials: ['interviewSource', 'signAutograph'], spots: [[10, 2], [13, 4]], max: 2, every: 70, patience: 150 }],
    alarm: { notice: '📰 마감 직전 특종 제보! 집필 책상에서 기사로 쓰세요', done: '📰 특종 기사가 1면에 실렸어요! 성과가 크게 올라요', missed: '⌛ 다른 매체가 먼저 보도했어요 (성과 감소)', interaction: 'breakingStory', every: [200, 320], window: 45 },
    tasks: [task('manuscript', '원고 쓰기', ['writeManuscript'], 2), task('article', '기사 쓰기', ['writeArticle']), task('proof', '교정 보기', ['proofread', 'wrtCheckLayout'])],
    extra: [task('plot', '다음 작품 구상', ['writePlot']), task('visitors', '취재원·독자 만나기', ['interviewSource', 'signAutograph'], 2), task('scoop', '특종 기사 쓰기', ['breakingStory']), task('schedule', '마감 일정 챙기기', ['wrtCheckDeadlines', 'wrtArrangeBooks']), boss('편집장님께 원고 넘기기')],
    work: ['writeManuscript', 'writeArticle', 'breakingStory', 'proofread', 'writePlot', 'makeCopies', 'interviewSource', 'signAutograph', 'wrtCheckDeadlines', 'wrtCheckLayout', 'wrtArrangeBooks'],
    skill: 'writing',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  styleInfluencer: {
    careerId: 'styleInfluencer',
    name: '스타일 스튜디오',
    icon: '👗',
    // A fashion influencer's and stylist's studio in a shop unit on a 성수 back street (2026-11-05, the layout audit, replacing a
    // building on a lawn with a corridor lobby of four waiting chairs and the editing desk in it, and the dressing room in one with the
    // staff's coffee, sofa and toilet). As a real one: through the glass door, its big window lighting the floor, the studio itself:
    // the lookbook set against the back wall between two lights, the racks and the dress form, the shoe and bag wall and the outfit
    // mirror, the photo wall and the unboxing table by the window, a small table where a client talks the styling over. At the back,
    // off the studio, the fitting and make-up room with its curtain, the planning room where the columns are written and the videos
    // cut (the desks side by side, the trend board), with the pantry off it; the shelf room of the brands' PR packages and the
    // restroom. The vintage shop next door.
    tiles: () =>
      shopUnit(
        17,
        3,
        [[2, 4, 5, 6, 'carpet'], [7, 4, 12, 6, 'carpet'], [14, 4, 16, 6, 'tile'], [2, 8, 13, 13, 'wood'], [15, 8, 16, 10, 'wood'], [15, 12, 16, 13, 'tile']],
        [[3, 7], [10, 7], [13, 5], [14, 9], [14, 13], [12, 14]],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 0, 25, 2, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The fitting and make-up room; the planning room; the pantry.
      o('makeupMirror', 2, 4), o('makeupMirror', 3, 4), o('siSteamer', 4, 4), o('ptCurtain', 5, 4),
      o('styleDesk', 7, 4), o('styleDesk', 8, 4), o('contentDesk', 9, 4), o('contentDesk', 10, 4), o('trendBoard', 11, 4),
      o('coffeeMaker', 15, 4), o('fridge', 16, 4), o('sofa', 15, 6, 'up'),
      // The studio: the set between its lights, the racks and the dress forms, the shoe wall and the mirror, the photo wall and the
      // unboxing table at the window, the client's table.
      o('mannequin', 2, 8), o('lookbookSet', 5, 8), o('wardrobeRack', 11, 8), o('plant', 13, 8), o('studioLight', 4, 9), o('studioLight', 8, 9),
      o('siOotdMirror', 2, 10, 'right'), o('siShoeWall', 2, 12, 'right'), o('wardrobeRack', 13, 10, 'left'), o('mannequin', 13, 12, 'left'),
      o('selfieWall', 4, 13, 'up'), o('siUnboxTable', 7, 13, 'up'), o('diningTable', 9, 13, 'up'), o('diningChair', 9, 12), o('diningChair', 10, 12),
      // The PR shelf room; the restroom.
      o('smPrShelf', 15, 8), o('plant', 16, 10), o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The street: the front; the vintage shop next door.
      o('siShopFront', 1, 15), o('siNeighbor', 18, 3),
    ],
    coworkers: [
      { name: '권세라 실장', shirt: '#880e4f', skin: '#f8d9c0', hair: '#1a1a1a', boss: true },
      { name: '유하율 포토그래퍼', shirt: '#212121', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '진다온 에디터', shirt: '#f8bbd0', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // At the client's table.
    clients: [{ noun: '스타일링 의뢰인', socials: ['styleConsult', 'recommendOutfit'], spots: [[8, 12], [11, 12]], max: 2, every: 60, patience: 150 }],
    alarm: { notice: '📸 브랜드 협찬 촬영 시간! 룩북 세트로 가세요', done: '📸 협찬 화보 반응이 폭발적이에요! 성과가 크게 올라요', missed: '⌛ 촬영에 늦어 브랜드가 다른 인플루언서를 골랐어요 (성과 감소)', interaction: 'sponsoredShoot', every: [200, 320], window: 45 },
    tasks: [task('column', '패션 칼럼 쓰기', ['writeStyleColumn'], 2), task('lookbook', '룩북 촬영', ['shootLookbook']), task('clients', '스타일링 상담', ['styleConsult', 'recommendOutfit'])],
    extra: [
      task('outfits', '코디 기획하기', ['planOutfits']), task('trend', '트렌드 분석', ['analyzeMetrics']), task('sponsor', '협찬 촬영', ['sponsoredShoot']),
      task('prep', '촬영 의상 준비', ['siSteamOutfit', 'siMatchAccessories', 'dressMannequin'], 2), task('ootd', '오늘의 착장 올리기', ['siOotdShoot']), task('unbox', '협찬품 언박싱', ['siUnboxPr']),
      boss('실장님과 기획 회의'),
    ],
    work: ['writeStyleColumn', 'planOutfits', 'shootLookbook', 'sponsoredShoot', 'tryOutfits', 'dressMannequin', 'selfieShoot', 'analyzeMetrics', 'planContent', 'replyComments', 'getMakeup', 'styleConsult', 'recommendOutfit', 'siOotdShoot', 'siSteamOutfit', 'siMatchAccessories', 'siUnboxPr'],
    skill: 'writing',
    floors: { wood: 'walnutWood', carpet: 'lilacCarpet', tile: 'monoTile' },
    wall: 'lavenderStripes',
  },
  barista: {
    careerId: 'barista',
    name: '카페',
    icon: '☕',
    // A café on the ground floor of a row of shops (2026-11-05, the layout audit, replacing a building on a lawn entered through a
    // corridor of chairs, its counter in the far corner, its only restroom in the staff room). Through the glass front and its door the
    // café is one room: on the right, in sight of the door, the counter as you come to it (the cake case, the till, the pickup), the
    // staff behind it and the back bar along the wall (the drinks counter, two espresso machines, the milk fridge, the bar sink); the
    // seats fill the rest (banquettes along the back wall, tables in the middle and along the glass) with the self bar by the pickup and
    // the customers' restroom off the room. Behind the bar the store: the grinder, the shelves of beans and cups, the milk fridge and
    // the staff's lockers. Out on the pavement the A-board and a table either side of the door; the florist's next door.
    tiles: () =>
      shopUnit(
        18,
        1,
        [[2, 2, 12, 13, 'wood'], [13, 8, 17, 13, 'tile'], [14, 2, 17, 6, 'tile']],
        [[16, 7], [3, 4], [12, 14]],
        [[4, 2, 'wall'], [4, 3, 'wall'], [2, 4, 'wall'], [4, 4, 'wall'], [2, 2, 'tile'], [3, 2, 'tile'], [2, 3, 'tile'], [3, 3, 'tile']],
      ),
    restrooms: [[2, 2, 3, 3]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The counter as you come in: the pickup, the till, the cake case; the back bar behind the staff.
      o('baristaPickup', 14, 9, 'right'), o('cafeCounter', 14, 10, 'right'), o('baristaCakeCase', 14, 12, 'right'), o('baristaSelfBar', 12, 8, 'right'),
      o('baristaBackBar', 17, 8, 'left'), o('espressoMachine', 17, 10, 'left'), o('espressoMachine', 17, 11, 'left'), o('fridge', 17, 12, 'left'), o('kitchenSink', 17, 13, 'left'),
      // The store behind the bar.
      o('beanRoaster', 14, 2), o('baristaStockShelf', 15, 2), o('fridge', 17, 2), o('gjLockers', 14, 6, 'up'), o('diningChair', 17, 5, 'left'),
      // The seats: banquettes on the back wall, tables in the middle and at the glass; the restroom.
      o('sofa', 6, 2), o('diningTable', 6, 3), o('diningChair', 6, 4, 'up'), o('diningChair', 7, 4, 'up'),
      o('sofa', 9, 2), o('diningTable', 9, 3), o('diningChair', 9, 4, 'up'), o('diningChair', 10, 4, 'up'), o('plant', 12, 2),
      o('diningTable', 3, 7), o('diningChair', 3, 8, 'up'), o('diningChair', 4, 8, 'up'), o('diningTable', 7, 7), o('diningChair', 7, 8, 'up'), o('diningChair', 8, 8, 'up'),
      o('diningTable', 3, 12), o('diningChair', 3, 13, 'up'), o('diningChair', 4, 13, 'up'), o('diningTable', 6, 12), o('diningChair', 6, 13, 'up'), o('diningChair', 7, 13, 'up'),
      o('diningTable', 9, 12), o('diningChair', 9, 13, 'up'), o('diningChair', 10, 13, 'up'),
      o('toilet', 2, 2, 'right'), o('sink', 2, 3, 'right'),
      // The street: the front, the A-board, the terrace tables; the florist's next door.
      o('baristaShopFront', 1, 15), o('baristaSign', 11, 15), o('diningTable', 8, 15), o('diningChair', 8, 16, 'up'), o('diningChair', 9, 16, 'up'),
      o('diningTable', 14, 15), o('diningChair', 14, 16, 'up'), o('diningChair', 15, 16, 'up'), o('baristaNeighbor', 19, 6),
    ],
    coworkers: [
      { name: '김건우 점장', shirt: '#4e342e', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '추예린', shirt: '#a1887f', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '빈도윤', shirt: '#6d4c41', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    clients: [{ noun: '카페 손님', socials: ['serveCoffee', 'recommendDrink'], spots: [[8, 4], [5, 8], [9, 8], [5, 13], [8, 13]], max: 3, every: 30, patience: 90 }],
    alarm: { notice: '☕ 단체 주문 20잔이 들어왔어요! 에스프레소 머신으로 가세요', done: '☕ 단체 주문을 제시간에 다 냈어요! 성과가 크게 올라요', missed: '⌛ 주문이 밀려 손님들이 돌아갔어요 (성과 감소)', interaction: 'groupOrder', every: [100, 160], window: 40 },
    // A four-hour shift: one of each is a day's work.
    tasks: [task('espresso', '에스프레소 추출', ['pullEspresso']), task('orders', '주문 받기', ['takeOrders', 'baristaCallOrder']), task('customers', '손님 응대', ['serveCoffee', 'recommendDrink'])],
    extra: [task('latte', '라테 아트', ['latteArt']), task('iced', '아이스 음료 만들기', ['baristaIcedDrink']), task('beans', '원두 분쇄하기', ['grindBeans']), task('display', '디저트 진열', ['arrangeDisplay']), task('selfBar', '셀프바 정리', ['baristaTidySelfBar']), boss('점장님께 마감 보고')],
    work: ['pullEspresso', 'latteArt', 'groupOrder', 'takeOrders', 'grindBeans', 'arrangeDisplay', 'serveCoffee', 'recommendDrink', 'baristaIcedDrink', 'baristaCallOrder', 'baristaTidySelfBar'],
    skill: 'mixology',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'redBrick',
  },
  fastFood: {
    careerId: 'fastFood',
    name: '패스트푸드점',
    icon: '🍔',
    // A city-centre burger store (2026-11-04, the layout audit, replacing a drive-through window inside a back room, two tables and a
    // corridor lobby). In from the street the store is one room: the kiosks by the door and the delivery riders' shelf, the order and
    // pickup counters across it, and the seats (more than half the floor), the tray return, the customers' restroom. Behind the counter
    // the kitchen line, in the order a burger is made: the two-sided grill, the assembly table, the fryers (a basket for each item), the
    // drinks, the hand basin where the crew wash every half hour. Off the kitchen the walk-in fridge and the stock, and the crew room.
    // No drive-through: that's a roadside store's.
    tiles: () =>
      patch(
        building(
          [[2, 2, 15, 7, 'tile'], [2, 8, 23, 13, 'wood'], [17, 2, 19, 6, 'tile'], [21, 2, 23, 6, 'carpet']],
          [[16, 4], [20, 4], [12, 14]],
        ),
        [
          ...Array.from({ length: 9 }, (_, i): [number, number, 'wall'] => [16 + i, 7, 'wall']),
          [22, 11, 'wall'], [23, 11, 'wall'], [21, 11, 'wall'], [21, 13, 'wall'], [21, 12, 'door'],
        ],
      ),
    restrooms: [[22, 12, 23, 13]],
    objects: [
      // The kitchen line along the back wall: grill, assembly, fryers, drinks; the hand basin.
      o('grillTop', 3, 2), o('grillTop', 4, 2), o('prepCounter', 6, 2), o('fryer', 9, 2), o('fryer', 10, 2), o('ffDrinkTower', 12, 2), o('nsHandSink', 15, 2),
      // The counters across the store.
      o('burgerCounter', 5, 7, 'up'), o('burgerCounter', 8, 7, 'up'), o('ffPickupCounter', 11, 7, 'up'),
      // The stock room and walk-in fridge; the crew room.
      o('fridge', 17, 2), o('fridge', 18, 2), o('ffMopBucket', 19, 6, 'up'),
      o('coffeeMaker', 21, 2), o('gjLockers', 22, 2), o('sofa', 21, 6, 'up'),
      // The seats, the tray return; the kiosks and the riders' shelf by the door; the restroom.
      o('ffTrayTable', 3, 9, 'up'), o('diningChair', 3, 10, 'up'), o('diningChair', 4, 10, 'up'),
      o('ffTrayTable', 6, 9, 'up'), o('diningChair', 6, 10, 'up'), o('diningChair', 7, 10, 'up'),
      o('ffTrayTable', 3, 12, 'up'), o('diningChair', 3, 13, 'up'), o('diningChair', 4, 13, 'up'),
      o('ffTrayTable', 6, 12, 'up'), o('diningChair', 6, 13, 'up'), o('diningChair', 7, 13, 'up'),
      o('ffTrayTable', 17, 9, 'up'), o('diningChair', 17, 10, 'up'), o('diningChair', 18, 10, 'up'),
      o('ffTrayTable', 20, 9, 'up'), o('diningChair', 20, 10, 'up'), o('diningChair', 21, 10, 'up'),
      o('ffTrayTable', 17, 12, 'up'), o('diningChair', 17, 13, 'up'), o('diningChair', 18, 13, 'up'),
      o('trashStation', 15, 9), o('ffKiosk', 10, 13, 'up'), o('ffKiosk', 14, 13, 'up'), o('ffRiderShelf', 15, 12, 'left'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
    ],
    coworkers: [
      { name: '마성진 매니저', shirt: '#c62828', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '표지안', shirt: '#ffca28', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '함우진', shirt: '#e53935', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // At the tables.
    clients: [{ noun: '손님', socials: ['serveMeal', 'apologizeOrder'], spots: [[5, 10], [8, 10], [5, 13], [19, 10], [19, 13]], max: 3, every: 30, patience: 80 }],
    alarm: { notice: '🍔 점심 피크에 주문이 밀려들어요! 그릴로 가세요', done: '🍔 주문을 순식간에 다 냈어요! 성과가 크게 올라요', missed: '⌛ 주문이 밀려 손님들이 화가 났어요 (성과 감소)', interaction: 'rushHour', every: [100, 160], window: 40 },
    // A four-hour shift: one of each is a day's work.
    tasks: [task('grill', '버거 굽기', ['grillBurgers']), task('fries', '감자튀김 튀기기', ['fryFries']), task('customers', '손님 응대', ['serveMeal', 'apologizeOrder'])],
    extra: [task('trays', '테이블 정리하기', ['clearTrays', 'ffWipeTable', 'ffMopFloor']), task('prep', '재료 손질', ['prepIngredients']), task('counter', '주문 내주기', ['serveTray', 'ffCallOrder', 'ffHelpKiosk']), task('drinks', '음료 뽑기', ['ffPourDrinks']), task('delivery', '배달 넘기기', ['ffRiderHandoff']), boss('매니저님께 마감 보고')],
    work: ['grillBurgers', 'fryFries', 'rushHour', 'serveTray', 'clearTrays', 'prepIngredients', 'serveMeal', 'apologizeOrder', 'ffHelpKiosk', 'ffCallOrder', 'ffPourDrinks', 'ffRiderHandoff', 'ffWipeTable', 'ffMopFloor'],
    skill: 'cooking',
    floors: { tile: 'creamTile' },
    wall: 'creamPlain',
  },
  retail: {
    careerId: 'retail',
    name: '옷가게',
    icon: '🛍️',
    // A clothes shop on the street, one unit of a row (2026-11-05, the layout audit, replacing a building on a lawn entered through a
    // corridor that held the window display, the fitting rooms inside the stock room, the till in the far corner and a sofa in the staff
    // room). Through the glass door the shop is one room: the window display and its mannequins inside the glass where the street sees
    // them, the sale board out on the pavement; the till with the bag shelf behind it by the door; the cubes along the side and back
    // walls, the rails and the folding table in the middle, the accessories; the fitting rooms along the far wall. Staff only, behind
    // doors in the back wall: the stock room (the boxes being unpacked and tagged, the rail of new stock, the steamer) and the small
    // staff room (lockers, a table and chair, the coffee) with the restroom. The shoe shop next door.
    tiles: () =>
      shopUnit(
        19,
        1,
        [[2, 2, 10, 4, 'tile'], [12, 2, 15, 4, 'tile'], [17, 3, 18, 4, 'tile'], [2, 6, 18, 13, 'wood']],
        [[6, 5], [15, 5], [16, 4], [12, 14]],
      ),
    restrooms: [[17, 3, 18, 4]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The stock room; the staff room; the restroom.
      o('rtStockBoxes', 2, 2), o('rtStockBoxes', 4, 2), o('wardrobeRack', 7, 2), o('rtSteamer', 10, 2), o('rtStockBoxes', 2, 4, 'up'),
      o('gjLockers', 12, 2), o('coffeeMaker', 14, 2), o('fridge', 15, 2), o('diningTable', 12, 4), o('diningChair', 14, 4, 'left'),
      o('toilet', 18, 3, 'left'), o('sink', 18, 4, 'left'),
      // The shop: the cubes on the walls, the rails, the folding table, the accessories, the fitting rooms; the till by the door;
      // the window display inside the glass.
      o('clothesShelf', 2, 6, 'right'), o('clothesShelf', 2, 7, 'right'), o('clothesShelf', 2, 8, 'right'), o('clothesShelf', 2, 9, 'right'),
      o('clothesShelf', 7, 6), o('clothesShelf', 8, 6), o('clothesShelf', 9, 6), o('clothesShelf', 10, 6), o('wardrobeRack', 11, 6), o('plant', 16, 6),
      o('rtGarmentRail', 4, 8), o('rtGarmentRail', 8, 8), o('rtFoldTable', 8, 10), o('rtAccessoryStand', 12, 9), o('mannequin', 15, 8), o('rtGarmentRail', 17, 11, 'left'),
      o('fittingRoom', 18, 6, 'left'), o('fittingRoom', 18, 7, 'left'), o('fittingRoom', 18, 8, 'left'),
      o('rtBagShelf', 14, 10), o('checkoutCounter', 14, 12, 'up'),
      o('rtWindowDisplay', 3, 13, 'up'), o('windowMannequin', 7, 13, 'up'), o('windowMannequin', 9, 13, 'up'), o('plant', 2, 13),
      // The street: the front, the sale board; the shoe shop next door.
      o('rtShopFront', 1, 15), o('rtSaleSign', 14, 15), o('rtNeighbor', 20, 6),
    ],
    coworkers: [
      { name: '곽보미 점장', shirt: '#6a1b9a', skin: '#f8d9c0', hair: '#2b1b10', boss: true },
      { name: '태윤슬', shirt: '#26a69a', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '용시후', shirt: '#5c6bc0', skin: '#c99a6e', hair: '#1a1a1a' },
    ],
    clients: [{ noun: '쇼핑 손님', socials: ['helpFindSize', 'suggestStyle'], spots: [[3, 8], [9, 7], [6, 9], [9, 11], [15, 13]], max: 3, every: 35, patience: 90 }],
    alarm: { notice: '🏷️ 타임 세일 시작! 손님이 몰려요, 계산대로 가세요', done: '🏷️ 줄을 금세 줄였어요! 매출 대박! 성과가 크게 올라요', missed: '⌛ 계산 줄이 길어 손님들이 그냥 나갔어요 (성과 감소)', interaction: 'flashSale', every: [100, 160], window: 40 },
    // A four-hour shift: one of each is a day's work.
    tasks: [task('fold', '옷 개어 진열하기', ['foldClothes', 'rtSquareStacks']), task('till', '계산하기', ['ringUp']), task('customers', '손님 응대', ['helpFindSize', 'suggestStyle'])],
    extra: [task('restock', '재고 채우기', ['restockShelves', 'rtTagStock', 'rtSteam']), task('fitting', '피팅룸 챙기기', ['tidyFittingRoom', 'rtPassSize']), task('mannequin', '마네킹 옷 갈아입히기', ['dressMannequin', 'rtDressWindow']), task('floor', '매장 정돈하기', ['rtTidyRail', 'rtArrangeAcc']), boss('점장님께 마감 보고')],
    work: ['foldClothes', 'restockShelves', 'ringUp', 'flashSale', 'tidyFittingRoom', 'dressMannequin', 'tryOutfits', 'helpFindSize', 'suggestStyle', 'rtSquareStacks', 'rtTagStock', 'rtSteam', 'rtPassSize', 'rtDressWindow', 'rtTidyRail', 'rtArrangeAcc'],
    skill: 'charisma',
    floors: { wood: 'oakWood', carpet: 'lilacCarpet', tile: 'creamTile' },
    wall: 'lavenderStripes',
  },
  babysitter: {
    careerId: 'babysitter',
    name: '돌봄 가정과 단지 놀이터',
    icon: '🧸',
    // Where a part-time babysitter (아이돌보미, 하원 시터) really works (2026-11-05, the layout audit, at the user's request; replacing
    // the 어린이집 that was the 보육교사's in all but name, with its big playroom, nap room and a corridor lobby of chairs): from four
    // in the afternoon, when the 어린이집 van drops the child at the 단지's gate, until the parents are home. On the left the 단지
    // playground, where the other sitters and grandparents wait by the benches: the play structure, the swings, the sandpit; the
    // yellow van at the kerb. On the right the family's flat on the ground floor: the 현관 with the shoes and the bag hooks; the
    // bathroom off the living room; the living room with the folding play mat between the TV and the sofa, the toy kitchen and the
    // child's desk, and the kitchen end with the counter where the snack is got ready, the low table, the high chair and the desk
    // where the 알림장 is read and the note for the parents written; the child's room with the floor bedding for the nap, the
    // picture-book corner, the changing table and the height chart; the parents' bedroom.
    tiles: () =>
      patch(
        building(
          [[12, 2, 16, 6, 'carpet'], [18, 2, 23, 6, 'wood'], [12, 8, 13, 9, 'tile'], [12, 11, 13, 13, 'tile'], [15, 8, 23, 13, 'wood']],
          [[16, 7], [19, 7], [14, 9], [14, 12], [12, 14]],
        ),
        Array.from({ length: 140 }, (_, i): [number, number, Tile] => [1 + (i % 10), 1 + Math.floor(i / 10), 'grass']),
      ),
    restrooms: [[12, 8, 13, 9]],
    objects: [
      // The playground: the play structure, the swings, the sandpit, the benches; the 어린이집 van at the kerb.
      o('ccPlayStructure', 2, 2), o('bsSwing', 7, 2), o('ccSandbox', 2, 7), o('plant', 9, 8), o('plant', 1, 13),
      o('ghBenchSofa', 5, 13, 'up'), o('ghBenchSofa', 8, 13, 'up'),
      o('ccShuttleVan', 3, 16, 'up'),
      // The child's room: the floor bedding, the picture books, the changing table, the toy box, the height chart.
      o('napMats', 12, 2), o('bookshelf', 14, 2), o('storyCorner', 15, 2), o('bsNappyStation', 12, 6, 'up'), o('toyBox', 13, 6, 'up'), o('bsFamilyWall', 16, 4, 'left'),
      // The parents' bedroom.
      o('bookshelf', 18, 2), o('doubleBed', 21, 2), o('lamp', 23, 2), o('plant', 23, 6),
      // The bathroom.
      o('toilet', 12, 8, 'right'), o('sink', 12, 9, 'right'),
      // The 현관: shoes, the bag hooks.
      o('bsEntry', 12, 11),
      // The living room: the TV, the play mat, the sofa, the toy kitchen, the child's desk.
      o('bigTv', 17, 8), o('bsPlayMat', 16, 10), o('sofa', 17, 13, 'up'), o('bsPlayKitchen', 15, 13, 'up'), o('craftTable', 19, 10, 'right'),
      // The kitchen end: the sink, the snack counter, the fridge; the low table, the high chair, the 알림장 desk.
      o('kitchenSink', 21, 8), o('snackCounter', 22, 8), o('fridge', 23, 8), o('bsSnackTable', 21, 11), o('highChair', 23, 10), o('bsNoteDesk', 23, 13, 'up'),
    ],
    coworkers: [
      { name: '윤서 어머니', shirt: '#f06292', skin: '#f8d9c0', hair: '#5b3a1e', boss: true },
      { name: '옆 동 시터 이모님', shirt: '#aed581', skin: '#eac09a', hair: '#2b1b10' },
      { name: '서준 할머니', shirt: '#ffb74d', skin: '#c99a6e', hair: '#9e9e9e' },
    ],
    // The child and a friend from the playground: at the play structure and the sandpit, then on the mat and at the low table.
    clients: [{ noun: '어린이', socials: ['playWithChild', 'helpWashHands'], spots: [[3, 6], [5, 8], [15, 10], [20, 12]], max: 2, every: 40, patience: 120, age: 'child' }],
    alarm: { notice: '😢 낮잠에서 깬 아이가 울어요! 아이 방으로 가세요', done: '😊 아이가 다시 새근새근 잠들었어요! 성과가 크게 올라요', missed: '⌛ 한참 울다 잠이 다 깨 버렸어요 (성과 감소)', interaction: 'sootheCrying', every: [100, 160], window: 30 },
    // A four-hour shift: one of each is a day's work.
    tasks: [task('story', '동화 읽어 주기', ['readStory']), task('craft', '만들기 · 소꿉놀이', ['craftWithKids', 'bsPretendPlay']), task('kids', '아이 돌보기', ['playWithChild', 'helpWashHands'])],
    extra: [
      task('arrive', '하원 차량 마중 · 현관 맞이', ['ccShuttleCheck', 'bsGreetChild']), task('play', '놀이터에서 놀아 주기', ['bsPushSwing', 'ccWatchOutdoor', 'ccSandPlay']), task('snack', '간식 준비 · 먹이기', ['prepareSnack', 'bsServeSnack']),
      task('nap', '낮잠 재우기', ['settleNap']), task('soothe', '우는 아이 달래기', ['sootheCrying']), task('note', '알림장 읽고 부모님께 메모 남기기', ['bsWriteNote']), task('nappy', '기저귀 갈 준비', ['bsRestockNappies']),
      boss('어머니께 오늘 하루 전해 드리기'),
    ],
    work: ['readStory', 'craftWithKids', 'settleNap', 'sootheCrying', 'prepareSnack', 'playWithChild', 'helpWashHands', 'bsPretendPlay', 'bsServeSnack', 'bsGreetChild', 'bsWriteNote', 'bsRestockNappies', 'ccShuttleCheck', 'bsPushSwing', 'ccWatchOutdoor', 'ccSandPlay'],
    skill: 'charisma',
    floors: { carpet: 'sageCarpet', tile: 'creamTile', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  manualLabor: {
    careerId: 'manualLabor',
    name: '조경 공사 현장',
    icon: '🦺',
    // A landscaping site behind its hoarding (2026-11-04, the layout audit, replacing an open lawn with things scattered on it and a
    // house with a living room and kitchen beside it: a site has no permanent building). The one way in is from the street, by the
    // safety board where the morning talk is held, over the wheel wash. Inside the gate is the yard: the aggregate bays, the stacked
    // materials, the wheelbarrows, the trees waiting to go in. Further in, the work in its order: the excavator digging out at the
    // back, staked and lined; the path being paved; the beds planted, and the lawn edged with the one mower (a site lays turf more
    // than it mows). At the back are the office container, and the rest container with its toilet, the tool crib and the tool wall
    // beside it.
    tiles: () => {
      const t = farmTiles().map((v): Tile => (v === 'wall' || v === 'door' || v === 'wood' || v === 'tile' ? 'grass' : v));
      const set = (x: number, y: number, v: Tile) => (t[y * MAP_W + x] = v);
      for (let x = 16; x <= 24; x++) (set(x, 1, 'wall'), set(x, 4, 'wall'));
      for (let y = 2; y <= 3; y++) {
        set(16, y, 'wall'), set(21, y, 'wall'), set(24, y, 'wall');
        for (let x = 17; x <= 20; x++) set(x, y, 'wood');
        for (let x = 22; x <= 23; x++) set(x, y, 'tile');
      }
      set(18, 4, 'door'), set(22, 4, 'door');
      return t;
    },
    restrooms: [[22, 2, 23, 3]],
    ground: [[0, 15, 25, 17, 'concrete'], [10, 12, 14, 14, 'concrete']],
    objects: [
      o('mlSiteFence', 0, 0),
      // At the back: the office and rest containers, the tool crib and wall.
      o('mlSiteOffice', 11, 1), o('coffeeMaker', 17, 2), o('sofa', 19, 2), o('toilet', 23, 3, 'left'), o('sink', 23, 2, 'left'),
      o('mlToolCrib', 16, 5), o('toolWall', 19, 5),
      // The work: digging out at the back, staked; the path being paved; the beds planted and the lawn edged.
      o('mlExcavator', 2, 2), o('mlSurveyLine', 6, 2), o('mlPavingBed', 6, 5), o('gardenBed', 2, 8), o('gardenBed', 5, 8), o('gardenBed', 8, 8), o('lawnMower', 12, 6),
      // The yard inside the gate: trees waiting, aggregate, materials, barrows; the safety board by the way in.
      o('mlTreeYard', 16, 8), o('mlSoilHeap', 20, 9), o('materialPile', 20, 11), o('materialPile', 23, 11), o('wheelbarrow', 18, 11), o('wheelbarrow', 14, 9),
      o('mlSafetyBoard', 8, 13, 'up'),
    ],
    coworkers: [
      { name: '최강수 현장 소장', shirt: '#ff8f00', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '한바다', shirt: '#fdd835', skin: '#f8d9c0', hair: '#5b3a1e' },
      { name: '오들판', shirt: '#7cb342', skin: '#c99a6e', hair: '#2b1b10' },
    ],
    // The client looking round the work.
    clients: [{ noun: '집주인', socials: ['showGardenPlan', 'hearRequest'], spots: [[12, 11], [9, 10]], max: 1, every: 70, patience: 120 }],
    alarm: { notice: '⛈️ 소나기 예보! 자재 더미에 덮개를 씌우세요', done: '⛈️ 자재를 무사히 지켜 냈어요! 성과가 크게 올라요', missed: '⌛ 시멘트 포대가 젖어 버렸어요 (성과 감소)', interaction: 'coverMaterials', every: [100, 160], window: 40 },
    // A four-hour shift: one of each is a day's work.
    tasks: [task('mow', '잔디 깎기', ['mowLawn']), task('beds', '화단 가꾸기', ['tendBeds', 'pruneShrubs']), task('haul', '흙 나르기', ['haulSoil'])],
    extra: [task('bricks', '벽돌 쌓기', ['stackBricks']), task('tools', '공구 정리하기', ['organizeTools']), task('cover', '자재 덮기', ['coverMaterials']), task('paving', '경계석·보도블록 깔기', ['mlLayPaving']), task('trees', '나무 심기', ['mlPlantTree']), task('digger', '굴착기 터파기', ['mlDigTrench']), task('survey', '측량과 수평 맞추기', ['mlStakeOut']), task('talk', '작업 전 안전 회의', ['mlToolboxTalk']), task('log', '작업 일보 쓰기', ['mlDailyLog']), task('crib', '공구 점검', ['mlCheckTools']), task('gravel', '자갈 체 치기', ['mlShovelGravel']), boss('현장 소장님께 보고')],
    work: ['mowLawn', 'tendBeds', 'pruneShrubs', 'haulSoil', 'stackBricks', 'coverMaterials', 'organizeTools', 'showGardenPlan', 'hearRequest', 'mlLayPaving', 'mlPlantTree', 'mlDigTrench', 'mlStakeOut', 'mlToolboxTalk', 'mlDailyLog', 'mlCheckTools', 'mlShovelGravel'],
    skill: 'gardening',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  proGamer: {
    careerId: 'proGamer',
    name: 'e스포츠 게임단 연습실',
    icon: '🎮',
    // A team house (2026-11-05, the layout audit, replacing a hall on a lawn with a match-day stage booth, a treadmill and a
    // physio bed among the practice PCs and a lobby of chairs where fans came in to wait). As a pro team's 사옥 is: the street door
    // to a lobby behind security, the club's logo wall and the cabinet of cups, the security desk and the speed gate; no fans
    // inside, they wait at the door on the pavement now and then. Through it the practice room, dark and windowless: the 1군's
    // five PCs along one wall and the 2군's in the row behind, the coach's replay screen at the end, the stream set and the gear
    // bench; the analysis room, where the coaches go over replays on two screens round a meeting table and the draft is argued at
    // the magnet board; the small gym and physio room, walled off (the treadmills, the wrist corner); the team's kitchen and
    // lounge where the players eat and rest. The players' dorm is in a flat nearby, as most are; the stage is at the arena.
    tiles: () =>
      patch(
        building(
          [[2, 2, 12, 8, 'carpet'], [14, 2, 18, 8, 'carpet'], [20, 2, 23, 8, 'wood'], [2, 10, 15, 13, 'tile'], [17, 10, 23, 13, 'wood']],
          [[8, 9], [15, 9], [21, 9], [16, 10], [12, 14]],
        ),
        [[2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door']],
      ),
    restrooms: [[2, 12, 3, 13]],
    windowless: ['scrimStation'],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The practice room: the 1군's five PCs along the top wall, the 2군's in a row behind them, the coaches walking between; the
      // coach's replay screen, the stream set, the gear bench.
      o('scrimStation', 3, 2), o('scrimStation', 4, 2), o('scrimStation', 5, 2), o('scrimStation', 6, 2), o('scrimStation', 7, 2), o('replayScreen', 9, 2), o('plant', 12, 2),
      o('scrimStation', 3, 5), o('scrimStation', 4, 5), o('scrimStation', 5, 5), o('scrimStation', 6, 5), o('scrimStation', 7, 5),
      o('egStreamDesk', 12, 4, 'left'), o('egGearBench', 10, 8, 'up'), o('plant', 2, 8),
      // The analysis room: two replay screens and the draft board, the meeting table.
      o('replayScreen', 14, 2), o('egDraftBoard', 16, 2), o('plant', 18, 2), o('replayScreen', 18, 7, 'left'),
      o('salMeetingTable', 15, 4), o('salMeetingChair', 14, 4, 'right'), o('salMeetingChair', 15, 5, 'up'), o('salMeetingChair', 16, 5, 'up'), o('salMeetingChair', 17, 5, 'up'),
      // The gym and physio room.
      o('treadmill', 20, 2), o('treadmill', 22, 2), o('egPhysio', 22, 6),
      // The lobby: the cups, the logo wall, the speed gate, the security desk; the restroom.
      o('plant', 2, 10), o('egTrophyWall', 5, 10), o('egLogoWall', 9, 10), o('sgSpeedGate', 10, 12), o('lobbyDesk', 13, 12),
      o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
      // The kitchen and lounge.
      o('coffeeMaker', 22, 10), o('fridge', 23, 10), o('diningTable', 19, 12), o('diningChair', 19, 11), o('diningChair', 20, 11), o('diningChair', 19, 13, 'up'), o('diningChair', 20, 13, 'up'), o('sofa', 22, 13, 'up'),
      // Out front: the team van, in the road's near lane, clear to drive off to the right.
      o('teamVan', 17, 16),
    ],
    coworkers: [
      { name: '연태민 감독', shirt: '#311b92', skin: '#eac09a', hair: '#1a1a1a', boss: true },
      { name: '하이든 선수', shirt: '#d50000', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '류세찬 코치', shirt: '#263238', skin: '#c99a6e', hair: '#5b3a1e' },
    ],
    // Fans don't come in: now and then a few wait at the door on the pavement.
    clients: [{ noun: '팬', socials: ['signAutograph', 'fanSelfie'], spots: [[9, 15], [10, 15], [14, 15]], max: 2, every: 70, patience: 120 }],
    alarm: { notice: '🏆 리그 경기 출전! 게임단 차량으로 경기장에 가세요', done: '🏆 경기에서 이겼어요! 성과가 크게 올라요', missed: '⌛ 늦어서 다른 선수가 대신 출전했어요 (성과 감소)', interaction: 'leagueMatch', every: [200, 320], window: 45 },
    tasks: [task('scrim', '스크림 연습', ['scrimPractice'], 2), task('replay', '경기 영상 분석', ['reviewReplay']), task('solo', '개인 랭크 연습', ['soloQueue'])],
    extra: [task('fans', '팬 서비스', ['signAutograph', 'fanSelfie'], 2), task('workout', '체력 운동', ['workout']), task('match', '리그 경기 출전', ['leagueMatch']), task('draft', '밴픽 전략 정리', ['egPlanDraft', 'egDraftDebate']), task('stream', '팬 방송', ['egFanStream']), task('sponsor', '후원사 일정·우승컵 관리', ['egSponsorShoot', 'egPolishCup']), task('wrist', '손목 관리', ['egWristCare', 'egHandDrill']), task('gear', '장비 점검', ['egTuneKeyboard', 'egMeasureSens']), boss('감독님과 피드백 면담')],
    work: ['scrimPractice', 'soloQueue', 'reviewReplay', 'leagueMatch', 'workout', 'signAutograph', 'fanSelfie', 'egPlanDraft', 'egDraftDebate', 'egFanStream', 'egSponsorShoot', 'egPolishCup', 'egWristCare', 'egHandDrill', 'egTuneKeyboard', 'egMeasureSens'],
    skill: 'videoGaming',
    floors: { carpet: 'slateStone', tile: 'monoTile', wood: 'walnutWood' },
    wall: 'navyWainscot',
  },
  // The everyday Korean jobs' lots (workplaceKorea.ts); kept last so the coworker ids above don't move.
  ...KOREA_WORKPLACES,
};
// Branch lots kept in their own files (branchLots.ts), joined to their careers' lots.
for (const [id, lots] of Object.entries(MORE_BRANCH_LOTS)) WORKPLACES[id].branchLots = { ...WORKPLACES[id].branchLots, ...lots };
installStageActions(WORKPLACES);
installExtraWork(WORKPLACES);

/** Where a job is worked: its branch's own lot where it has one, else the career's. */
export function workplaceOf(careerId: string, branch?: number): WorkplaceDef | undefined {
  const def = WORKPLACES[careerId];
  return (branch !== undefined && def?.branchLots?.[branch]) || def;
}

/** Every work lot by key (`career`, or `career@branch` for a branch's own), for looking round and checking them all. */
export const ALL_WORK_LOTS: Record<string, WorkplaceDef> = Object.fromEntries(
  Object.entries(WORKPLACES).flatMap(([id, def]) => [
    [id, def] as const,
    ...Object.entries(def.branchLots ?? {}).map(([b, lot]) => [`${id}@${b}`, lot!] as const),
  ]),
);
/** A lot key's career and branch. */
export function workLotKey(key: string): { careerId: string; branch?: number } {
  const [careerId, b] = key.split('@');
  return b === undefined ? { careerId } : { careerId, branch: Number(b) };
}


/** Names for the people who come in (ours). */
const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송'];
const GIVEN = ['민준', '서연', '지호', '하은', '도윤', '수아', '예준', '지우', '시우', '하린', '주원', '유나', '건우', '채원', '현우', '소율'];
export function clientName(rng: () => number): string {
  return SURNAMES[Math.floor(rng() * SURNAMES.length)] + GIVEN[Math.floor(rng() * GIVEN.length)];
}

/** The day's tasks, fresh: the fixed ones and one extra. */
export function dailyTasks(def: WorkplaceDef, rng: () => number, at: StageAt = { stage: 0 }): WorkTask[] {
  return stageTasks(def, rng, at);
}

/** Stable ids for the people at work, so the friendships carry over from one day to the next. */
/**
 * The order the coworker ids were handed out in. Kept as it was (retired workplaces keep their
 * slot) so saved friendships stay with the same colleagues; new workplaces go on the end.
 */
const COWORKER_ORDER = 'tech culinary painter doctor nurse police firefighter teacher lawyer architect vet fashionDesigner photographer hairStylist pilot scientist actor politician critic socialMedia military gardener engineer conservationist interiorDecorator salaryperson mortician dj dancer singer ghostHunter diplomat streamer extremeAthlete therapist filmmaker model toymaker baker'.split(' ');

export function coworkerId(careerId: string, i: number): number {
  let k = COWORKER_ORDER.indexOf(careerId);
  if (k < 0) k = COWORKER_ORDER.length + Object.keys(WORKPLACES).indexOf(careerId);
  // The first three keep their old ids (saved friendships); the rest sit clear of townies and services.
  return (k < 3 ? 800 : 2000) + k * 10 + i;
}

/** People who come in for the worker get ids from here up; nobody remembers them after the shift. */
export const CLIENT_ID_BASE = 5000;

/** What a work lot remembers about the shift (kept on the work lot's own state). */
export interface WorkInfo {
  careerId: string;
  workerId: number;
  tasks: WorkTask[];
  points: number;
  /** Minutes worked in a negative mood (they drag performance down). */
  negative: number;
  end: number;
  /** When the next client is due, how many have come and been seen to; the call-out waiting to be answered. */
  nextClient?: number[];
  clients?: number;
  served?: number;
  nextAlarm?: number;
  alarm?: { until: number };
  /** When the next stretch of the shift may bring trouble (workTrouble.ts). */
  nextTrouble?: number;
  /** The worker's stage on the ladder and branch (workStages.ts), for the stage's work, and rung. */
  stage?: WorkStage;
  branch?: number;
  level?: number;
}
