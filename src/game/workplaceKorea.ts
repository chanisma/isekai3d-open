import type { SocialDef } from './types';
import type { WorkplaceDef } from './workplace';
import { boss, building, chat, crew, gated, o, patch, task, up, upstairs, workSocial } from './workplaceKit';
import { shopUnit } from './shopUnit';

/**
 * Work lots for the everyday Korean jobs (careersKorea.ts; ours). They follow the same pattern as
 * workplace.ts: the job's stations, a boss and two colleagues, people who come in, one call-out.
 */

const YARD_SPOTS: Array<[number, number]> = [[11, 14], [13, 13], [6, 14]];

export const KOREA_SOCIALS: SocialDef[] = [
  workSocial('guideCivil', '민원 안내하기', '🙋', ['civilServant'], 'charisma', 15),
  workSocial('calmComplainant', '화난 민원인 달래기', '🙇', ['civilServant'], 'charisma', 25),
  workSocial('acceptParcel', '소포 접수하기', '📦', ['mailCarrier', 'courier'], 'charisma', 15),
  workSocial('explainPostage', '우편 요금 안내하기', '💌', ['mailCarrier'], 'logic', 10),
  workSocial('guideVisitor', '면회 안내하기', '🪪', ['correctionsOfficer'], 'charisma', 15),
  workSocial('checkBelongings', '소지품 검사하기', '🎒', ['correctionsOfficer'], 'logic', 15),
  workSocial('safetyBriefing', '안전 수칙 알려 주기', '🦺', ['coastGuard'], 'charisma', 15),
  workSocial('receiveReport', '신고 접수하기', '📞', ['coastGuard'], 'logic', 15),
  workSocial('askDeclaration', '신고 물품 묻기', '❓', ['customsOfficer'], 'charisma', 10),
  workSocial('explainDutyFree', '면세 한도 안내하기', '💳', ['customsOfficer'], 'logic', 15),
  workSocial('explainSorting', '분리배출 알려 주기', '♻️', ['sanitationWorker'], 'charisma', 15),
  workSocial('acceptBulkWaste', '대형 폐기물 접수하기', '🛋️', ['sanitationWorker'], 'charisma', 15),
  workSocial('listenToElder', '어르신 말벗 되기', '👂', ['socialWorker'], 'charisma', 20),
  workSocial('explainBenefits', '복지 혜택 안내하기', '📄', ['socialWorker'], 'logic', 15),
  workSocial('updateFamily', '어르신 근황 전하기', '📞', ['careWorker'], 'charisma', 15),
  workSocial('comfortFamily', '가족 위로하기', '🤗', ['careWorker'], 'charisma', 15),
  workSocial('talkToParent', '학부모 상담하기', '🫂', ['childcareTeacher', 'kindergartenTeacher'], 'charisma', 20),
  workSocial('assistDaily', '일상 활동 돕기', '🤝', ['disabilitySupport'], 'charisma', 20),
  workSocial('encourageUser', '응원하고 칭찬하기', '👏', ['disabilitySupport'], 'charisma', 10),
  workSocial('mentorTeen', '진로 고민 들어 주기', '🧭', ['youthCounselor'], 'charisma', 20),
  workSocial('cheerTeam', '동아리 활동 응원하기', '📣', ['youthCounselor'], 'charisma', 10),
  workSocial('assessPatient', '상태 평가하기', '📋', ['physicalTherapist'], 'logic', 15),
  workSocial('motivatePatient', '재활 격려하기', '💪', ['physicalTherapist', 'occupationalTherapist'], 'charisma', 10),
  workSocial('teachAdaptive', '보조 도구 사용법 알려 주기', '🦯', ['occupationalTherapist'], 'handiness', 20),
  workSocial('drawBlood', '채혈하기', '💉', ['labTechnician'], 'handiness', 10),
  workSocial('explainResults', '검사 안내하기', '📄', ['labTechnician'], 'logic', 10),
  workSocial('positionPatient', '촬영 자세 잡아 주기', '🧍', ['radiographer'], 'handiness', 10),
  workSocial('calmPatient', '긴장 풀어 주기', '😌', ['radiographer'], 'charisma', 10),
  workSocial('teachCpr', '심폐소생술 가르치기', '🫀', ['paramedic'], 'charisma', 20),
  workSocial('checkVitalsCitizen', '혈압 재 드리기', '🩺', ['paramedic'], 'logic', 10),
  workSocial('consultPatient', '문진하기', '📝', ['koreanMedicine'], 'logic', 15),
  workSocial('explainHerbal', '한약 복용법 안내하기', '🍵', ['koreanMedicine'], 'charisma', 10),
  workSocial('nutritionTalk', '영양 상담하기', '🥗', ['dietitian'], 'logic', 15),
  workSocial('surveyMeal', '식단 의견 듣기', '🗳️', ['dietitian'], 'charisma', 10),
  workSocial('recommendFrames', '안경테 추천하기', '🕶️', ['optician'], 'charisma', 15),
  workSocial('teachLensCare', '렌즈 관리법 알려 주기', '🧴', ['optician'], 'logic', 10),
  workSocial('consultParent', '입시 상담하기', '🎓', ['academyTutor'], 'charisma', 20),
  workSocial('tuneInstrument', '악기 상태 봐 주기', '🎻', ['musicTeacher'], 'piano', 10),
  workSocial('calmLearner', '긴장한 수강생 달래기', '😌', ['drivingInstructor'], 'charisma', 10),
  workSocial('explainRules', '교통 법규 설명하기', '🚦', ['drivingInstructor'], 'logic', 15),
  workSocial('alignPosture', '자세 교정해 주기', '🧍', ['yogaInstructor'], 'fitness', 15),
  workSocial('healthChat', '건강 상담하기', '💬', ['yogaInstructor'], 'charisma', 10),
  workSocial('handleClaim', '파손 접수 처리하기', '📝', ['courier'], 'charisma', 15),
  workSocial('giveDirections', '길 안내하기', '🧭', ['busDriver', 'taxiDriver', 'subwayDriver', 'securityGuard'], 'charisma', 10),
  workSocial('helpBoarding', '승하차 도와드리기', '🦽', ['busDriver'], 'fitness', 10),
  workSocial('smallTalkFare', '손님과 수다 떨기', '💬', ['taxiDriver'], 'charisma', 15),
  workSocial('announceDelay', '지연 안내하기', '📢', ['subwayDriver'], 'charisma', 10),
  workSocial('briefCrew', '선원 안전 교육하기', '🦺', ['seafarer'], 'charisma', 20),
  workSocial('negotiateFreight', '운임 협의하기', '💱', ['seafarer'], 'charisma', 20),
  workSocial('quoteJob', '견적 내기', '🧾', ['electrician', 'plumber', 'carpenter', 'wallpaperer', 'elevatorTech'], 'logic', 15),
  workSocial('explainWork', '작업 설명하기', '🗣️', ['electrician', 'plumber', 'welder', 'elevatorTech'], 'charisma', 15),
  workSocial('showSamples', '샘플 보여 주기', '🎨', ['carpenter', 'wallpaperer'], 'painting', 15),
  workSocial('reportProgress', '공정 보고하기', '📊', ['welder'], 'charisma', 15),
  workSocial('haggleFish', '생선값 흥정하기', '💰', ['fisher'], 'charisma', 15),
  workSocial('shareFishTip', '제철 생선 알려 주기', '🐟', ['fisher'], 'fishing', 10),
  workSocial('explainFarming', '양식 과정 설명하기', '🐠', ['fishFarmer'], 'charisma', 15),
  workSocial('sellFresh', '활어 판매하기', '🛒', ['fishFarmer'], 'charisma', 10),
  workSocial('tellHaenyeoStory', '해녀 이야기 들려주기', '🌊', ['haenyeo'], 'charisma', 20),
  workSocial('sellSeafood', '해산물 팔기', '🦪', ['haenyeo'], 'charisma', 10),
  workSocial('guideForest', '숲 해설하기', '🌳', ['forester'], 'gardening', 20),
  workSocial('warnHikers', '산불 조심 당부하기', '🚭', ['forester'], 'charisma', 10),
  workSocial('recommendDeal', '1+1 행사 알려 주기', '🏷️', ['convenienceManager'], 'charisma', 10),
  workSocial('helpFindItem', '물건 찾아 주기', '🔎', ['convenienceManager'], 'charisma', 10),
  workSocial('explainPolicy', '보장 내용 설명하기', '📄', ['insuranceAgent'], 'logic', 20),
  workSocial('buildRapport', '안부 나누기', '☕', ['insuranceAgent'], 'charisma', 15),
  workSocial('pickDesign', '디자인 골라 주기', '🎨', ['nailArtist'], 'painting', 15),
  workSocial('nailChat', '수다 떨며 시술하기', '💬', ['nailArtist'], 'charisma', 15),
  workSocial('skinConsult', '피부 상담하기', '🧴', ['esthetician'], 'logic', 15),
  workSocial('relaxChat', '편안하게 대화하기', '😌', ['esthetician'], 'charisma', 10),
  workSocial('colorMatch', '피부 톤 맞춰 주기', '🎨', ['makeupArtist'], 'painting', 15),
  workSocial('calmBride', '긴장한 신부 달래기', '👰', ['makeupArtist'], 'charisma', 10),
  workSocial('assessThreat', '위험 평가 상담하기', '🛡️', ['bodyguard'], 'logic', 20),
  workSocial('briefClient', '경호 계획 브리핑하기', '📋', ['bodyguard'], 'charisma', 15),
  workSocial('issuePass', '출입증 발급하기', '🪪', ['securityGuard'], 'logic', 10),
  workSocial('greetPassenger', '탑승객 맞이하기', '🙇', ['flightAttendant'], 'empathy', 10),
  workSocial('directorNote', '연출 의견 나누기', '🎬', ['voiceActor'], 'charisma', 15),
  workSocial('guestInterview', '게스트 인터뷰하기', '🎤', ['announcer'], 'charisma', 20),
  workSocial('explainForecast', '예보 설명하기', '🌦️', ['meteorologist'], 'science', 15),
  workSocial('vfExplainFarm', '수직농장 설명하기', '🌱', ['smartFarmer'], 'gardening', 15),
  workSocial('vfExplainData', '재배 기록 보여 주기', '📊', ['smartFarmer'], 'programming', 15),
  workSocial('arExplainDemo', '시연 설명하기', '💬', ['aiResearcher'], 'programming', 15),
  workSocial('arExplainLimit', '모델의 한계 설명하기', '🤔', ['aiResearcher'], 'logic', 15),
  workSocial('rlExplainDemo', '로봇 시연 설명하기', '🤖', ['roboticist'], 'programming', 15),
  workSocial('rlExplainSafety', '안전 구역 안내하기', '🚨', ['roboticist'], 'logic', 10),
  workSocial('geExplainSolar', '발전 원리 설명하기', '☀️', ['greenEnergy'], 'logic', 15),
  workSocial('geExplainSafety', '견학 안전 수칙 안내하기', '⛑️', ['greenEnergy'], 'charisma', 10),
  workSocial('hearPlayers', '플레이 후기 듣기', '🗒️', ['gameDeveloper'], 'videoGaming', 15),
  workSocial('clarifyTerms', '용어 확인하기', '❓', ['interpreter'], 'language', 15),
  workSocial('recommendBook', '책 추천하기', '📗', ['librarian'], 'charisma', 15),
  workSocial('findReference', '자료 찾아 주기', '🔎', ['librarian'], 'logic', 15),
  workSocial('recommendTrip', '여행지 추천하기', '🧳', ['tourGuide'], 'charisma', 15),
  workSocial('explainCustoms', '현지 문화 알려 주기', '🏯', ['tourGuide'], 'language', 15),
  workSocial('hearWishes', '꿈꾸는 결혼식 듣기', '💭', ['weddingPlanner'], 'empathy', 20),
  workSocial('showPortfolio', '포트폴리오 보여 주기', '📸', ['weddingPlanner'], 'painting', 15),
];

export const KOREA_WORKPLACES: Record<string, WorkplaceDef> = {
  civilServant: {
    careerId: 'civilServant',
    name: '주민센터',
    icon: '🏛️',
    // A 행정복지센터 as one is (2026-11-05, the layout audit, replacing a lobby walled off from the counters, the welfare booth and the
    // relief cage inside the meeting room, the restroom beside its table and a one-storey house on a lawn). Through the front door is
    // the 민원실, one big room: the waiting seats face the long counter, the number machine, the kiosk, the form stand and the notice
    // board by the door, a chair at each window; behind the counter the 주무관s' desks facing the hall, the 팀장's at the back wall
    // with the files, the mobile stacks and the copier. Off the hall the 동장실, the closed 복지 상담실 (personal details are talked
    // over behind a door), the visitors' restroom and the stairs. Upstairs the 회의실, the 주민자치 프로그램실 (the 노래 교실's piano,
    // the class tables), the 작은도서관, and the store of relief goods. The centre's sign on the pavement.
    tiles: () => [
      ...patch(
        building([[2, 2, 17, 13, 'tile'], [19, 2, 23, 6, 'carpet'], [19, 8, 23, 11, 'carpet'], [19, 13, 23, 13, 'tile']], [[18, 4], [18, 9], [18, 13], [12, 14]]),
        // The visitors' restroom in the hall's corner, its door in its own wall.
        [[2, 11, 'door'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall']],
      ),
      ...upstairs(
        [[2, 2, 10, 7, 'wood'], [12, 2, 23, 7, 'wood'], [2, 9, 23, 9, 'tile'], [19, 10, 23, 13, 'tile'], [2, 11, 9, 13, 'tile'], [11, 11, 17, 13, 'carpet']],
        [[6, 8], [17, 8], [5, 10], [14, 10]],
      ),
    ],
    restrooms: [[2, 12, 3, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // Behind the counter: the files and the 팀장's desk at the back wall, the mobile stacks, the copier, the coffee; the 주무관s' desks facing the hall.
      o('archiveShelf', 2, 2), o('archiveShelf', 3, 2), o('officeDesk', 9, 2), o('juRollStack', 13, 2), o('copier', 16, 2), o('coffeeMaker', 17, 2),
      o('officeDesk', 4, 5, 'up'), o('officeDesk', 6, 5, 'up'), o('officeDesk', 8, 5, 'up'), o('officeDesk', 10, 5, 'up'), o('plant', 2, 7), o('plant', 15, 7),
      // The long counter, its back to the hall, a chair at each window.
      o('civilCounter', 4, 8, 'up'), o('civilCounter', 5, 8, 'up'), o('civilCounter', 6, 8, 'up'), o('civilCounter', 7, 8, 'up'), o('civilCounter', 8, 8, 'up'),
      o('bkCounterChair', 4, 9, 'up'), o('bkCounterChair', 6, 9, 'up'), o('bkCounterChair', 8, 9, 'up'),
      // The hall: the seats facing the counter, the number machine, the guide board, the kiosk, the notice board and the form stand by the door.
      o('drWaitSeat', 5, 12, 'up'), o('drWaitSeat', 6, 12, 'up'), o('drWaitSeat', 7, 12, 'up'), o('drWaitSeat', 8, 12, 'up'), o('drWaitSeat', 9, 12, 'up'),
      o('juTicket', 11, 12, 'right'), o('juSign', 12, 9), o('juKiosk', 14, 13, 'up'), o('juNoticeBoard', 15, 13, 'up'), o('juFormStand', 14, 9), o('plant', 17, 11),
      // The visitors' restroom.
      o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'),
      // The 동장실; the 복지 상담실; the stairs.
      o('officeDesk', 21, 2), o('bookshelf', 23, 2), o('sofa', 20, 6, 'up'), o('armchair', 23, 5, 'left'), o('plant', 19, 2),
      o('juWelfareBooth', 21, 8), o('plant', 23, 11),
      o('stairs', 20, 13, 'left'),
      // Upstairs. The 회의실: the whiteboard, the table set out for the meeting.
      up('whiteboard', 3, 2), up('juMeetingPrep', 8, 2), up('salMeetingTable', 5, 5),
      up('salMeetingChair', 5, 4), up('salMeetingChair', 6, 4), up('salMeetingChair', 7, 4), up('salMeetingChair', 5, 6, 'up'), up('salMeetingChair', 6, 6, 'up'), up('salMeetingChair', 7, 6, 'up'), up('plant', 10, 7),
      // The 주민자치 프로그램실: the 노래 교실's piano, the class tables.
      up('piano', 13, 2), up('plant', 23, 2),
      up('diningTable', 15, 5), up('diningTable', 18, 5), up('diningTable', 21, 5),
      up('diningChair', 15, 6, 'up'), up('diningChair', 16, 6, 'up'), up('diningChair', 18, 6, 'up'), up('diningChair', 19, 6, 'up'), up('diningChair', 21, 6, 'up'), up('diningChair', 22, 6, 'up'),
      // The store of relief goods; the 작은도서관; a seat by the stairs.
      up('juReliefCage', 2, 11), up('juReliefCage', 7, 11), up('archiveShelf', 2, 13, 'up'), up('archiveShelf', 9, 13, 'up'),
      up('bookshelf', 11, 11), up('bookshelf', 12, 11), up('bookshelf', 13, 11), up('bookshelf', 15, 11), up('bookshelf', 16, 11), up('bookshelf', 17, 11),
      up('diningTable', 13, 13), up('diningChair', 12, 13, 'right'), up('diningChair', 15, 13, 'left'),
      up('sofa', 22, 10), up('plant', 19, 10),
      // The centre's sign on the pavement.
      o('juFrontSign', 10, 15),
    ],
    coworkers: crew(['한정우 팀장', '배소윤 주무관', '김태오 주무관'], ['#455a64', '#7986cb', '#90a4ae']),
    // At the windows, sat in the chair before each.
    clients: [{ noun: '민원인', socials: ['guideCivil', 'calmComplainant'], spots: [[4, 10], [6, 10], [8, 10]], max: 3, every: 40, patience: 120 }],
    alarm: { notice: '📢 민원인이 몰려 대기 번호가 30번을 넘었어요! 민원 창구로 가세요', done: '📢 대기 줄을 금세 줄였어요! 성과가 크게 올라요', missed: '⌛ 오래 기다린 민원인이 불만을 접수했어요 (성과 감소)', interaction: 'rushCounter', every: [180, 300], window: 45 },
    tasks: [task('cert', '증명서 발급', ['issueCertificate'], 2), task('permit', '인허가 서류 처리', ['processPermit']), task('civil', '민원인 응대', ['guideCivil', 'calmComplainant'])],
    extra: [task('report', '보고서 작성', ['writeReport']), task('archive', '지난 자료 찾기', ['readArchive']), task('rush', '밀린 민원 처리', ['rushCounter']), task('juHelp', '어르신 발급 돕기', ['juHelp', 'juFormHelp']), task('juCare', '복지 상담', ['juWelfare']), task('juRecord', '옛 기록 찾기', ['juFindRecord']), task('juRelief', '구호 물품 점검', ['juReliefCheck']), task('juTown', '마을 일 챙기기', ['juPostNotice', 'juMeetingSet', 'juFormStock']), boss('팀장님께 결재받기')],
    work: ['issueCertificate', 'processPermit', 'rushCounter', 'writeReport', 'crunchNumbers', 'makeCopies', 'readArchive', 'attendMeeting', 'guideCivil', 'calmComplainant', 'juHelp', 'juFormHelp', 'juFormStock', 'juWelfare', 'juPostNotice', 'juFindRecord', 'juReliefCheck', 'juMeetingSet'],
    skill: 'logic',
    floors: { tile: 'creamTile', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  mailCarrier: {
    careerId: 'mailCarrier',
    name: '우체국',
    icon: '📮',
    // A 우체국 on its street (2026-11-05, the layout audit, replacing a brick building on a lawn whose lobby was a corridor three tiles
    // deep, the windows in it facing up so the clerks sat on the customers' side, the bike parked on the grass by the front door and
    // a lamp and a plant in the sorting room). Through the glass doors under the red sign the 창구 hall is the front of the building:
    // the long counter across it, the windows (우편, 소포 with its scale, 예금) and the clerks behind, the number machine, the 기재대,
    // the 사서함 wall and the waiting seats in front. Behind the counter the staff side, its door into the sorting room: the 구분대 along
    // the back wall, the 묶음대, the 구역 지도; the parcel room beside it with the roller line and the cages, its two-bay shutter onto
    // the loading dock at the side, where the 집배 motorbikes stand nose to the street with room to ride straight out, and the 소형
    // 화물차 waits by the dock. The 집배원s' room and the restroom off the parcel room. Only the 우체통 is on the pavement.
    tiles: () =>
      patch(
        building(
          [[2, 2, 13, 6, 'carpet'], [15, 2, 17, 6, 'carpet'], [2, 8, 13, 13, 'tile'], [15, 8, 17, 10, 'wood'], [15, 12, 17, 13, 'tile']],
          // The staff side into the sorting room; sorting to parcels; the staff room and the restroom; the front door; the dock shutter.
          [[10, 7], [14, 4], [16, 7], [16, 11], [12, 14], [18, 3], [18, 4]],
        ),
        // The building ends at x 18; the loading dock beside it.
        Array.from({ length: 6 * 14 }, (_, i): [number, number, 'grass'] => [19 + (i % 6), 1 + Math.floor(i / 6), 'grass']),
      ),
    restrooms: [[15, 12, 17, 13]],
    ground: [[19, 0, 25, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The sorting room: the 구분대 along the back wall, the 구역 지도, the 묶음대, a cage.
      o('mailSorter', 2, 2), o('mailSorter', 4, 2), o('mailSorter', 6, 2), o('mpRouteMap', 8, 2), o('mpCageTrolley', 12, 2),
      o('mpBundleTable', 3, 5, 'up'), o('mpBundleTable', 6, 5, 'up'),
      // The parcel room: the roller line in from the dock, the cages.
      o('mpRollerLine', 15, 2), o('mpCageTrolley', 15, 6, 'up'), o('mpCageTrolley', 17, 6, 'up'),
      // The 집배원s' room; the restroom.
      o('coffeeMaker', 17, 8, 'left'), o('fridge', 17, 10, 'left'), o('sofa', 15, 9, 'right'),
      o('toilet', 17, 12, 'left'), o('sink', 17, 13, 'left'),
      // The 창구 hall: the counter across it, the windows facing the clerks behind (우편, 우편, 우편, 소포, 예금), the gate at its end.
      o('postCounter', 2, 9, 'up'), o('postCounter', 4, 9, 'up'), o('postCounter', 6, 9, 'up'), o('parcelScale', 8, 9, 'up'), o('officeDesk', 9, 9, 'up'),
      // In front of it: the 기재대, the waiting seats, the number machine, the 사서함 wall, the poster, a plant.
      o('mpWritingDesk', 2, 11, 'right'), o('drWaitSeat', 4, 13, 'up'), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 8, 13, 'up'),
      o('mpTicketMachine', 13, 12, 'left'), o('mpPoBoxes', 13, 9, 'left'), o('posterPop', 13, 13, 'left'), o('plant', 2, 13),
      // The loading dock: its shutter, the bikes nose to the street, the van parked behind them.
      o('mpShutter', 19, 2), o('mailScooter', 20, 7, 'left'), o('mailScooter', 22, 7, 'left'), o('mailScooter', 24, 7, 'left'), o('mpPostVan', 22, 1, 'down'),
      // The street: the front, the 우체통, the lane's house boxes the walk-out round goes along.
      o('mpFront', 1, 15), o('mpMailbox', 10, 15), o('mpStreetBoxes', 15, 15),
    ],
    coworkers: crew(['오성민 집배팀장', '나은별 주무관', '하도진 집배원'], ['#c62828', '#ef5350', '#e57373']),
    // In front of the windows, waiting on the seats for their number.
    clients: [{ noun: '우체국 손님', socials: ['acceptParcel', 'explainPostage'], spots: [[4, 12], [6, 12], [8, 12]], max: 2, every: 45, patience: 120 }],
    alarm: { notice: '📮 긴급 등기 우편이 들어왔어요! 오토바이로 배달 가세요', done: '📮 등기를 제시간에 전했어요! 성과가 크게 올라요', missed: '⌛ 등기 배달이 늦어 민원이 들어왔어요 (성과 감소)', interaction: 'expressDelivery', every: [180, 300], window: 45 },
    tasks: [task('sort', '우편물 분류', ['sortMail', 'mpBundleMail'], 2), task('route', '우편 배달', ['deliverRoute', 'mpWalkRound']), task('counter', '창구 업무', ['servePostCounter'])],
    extra: [task('weigh', '소포 처리', ['weighParcel', 'mpRollParcel', 'mpLoadCage']), task('load', '우편 싣고 걷기', ['mpLoadBike', 'mpEmptyMailbox', 'mpFillBox']), task('lobby', '창구 앞 챙기기', ['mpRestockForms', 'mpFillTickets', 'mpStudyMap']), task('customers', '손님 응대', ['acceptParcel', 'explainPostage'], 2), task('express', '긴급 등기 배달', ['expressDelivery']), boss('팀장님께 배달 보고')],
    work: ['sortMail', 'weighParcel', 'servePostCounter', 'deliverRoute', 'expressDelivery', 'acceptParcel', 'explainPostage', 'mpLoadBike', 'mpBundleMail', 'mpRollParcel', 'mpLoadCage', 'mpStudyMap', 'mpFillBox', 'mpRestockForms', 'mpFillTickets', 'mpEmptyMailbox', 'mpWalkRound', 'writeReport', 'crunchNumbers'],
    skill: 'fitness',
    floors: { tile: 'creamTile', wood: 'oakWood', carpet: 'monoTile' },
    wall: 'redBrick',
  },
  correctionsOfficer: {
    careerId: 'correctionsOfficer',
    name: '교정시설',
    icon: '🔐',
    // A 교도소 (2026-11-05, the layout audit, replacing one building on a lawn: the control room with a counselling table and a
    // restroom standing in it, and one room holding the visiting booths, a gate, an indoor "yard", the baking class, the nurse's
    // counter and a library cart; no cell block). On the street the gatehouse: the 민원실 where visitors book in, leave their things
    // in the lockers and wait, the 정문 hall with the search arch and the gate inside, and the 접견실 with its glass booths, which
    // visitors reach from the hall and inmates from the corridor behind. Inside the wall: the 중앙통제실 (the camera wall, the
    // consoles, the door panel, the records), the 의무실, the 직업훈련실's baking class, and the 운동장 out in the open behind the
    // 담장 and its 감시대. Upstairs the 수용동: the corridor with the 거실 either side, the officer's desk at its end with the book
    // cart, the rounds post, the counselling room by the stairs and the staff restroom.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 7, 5, 'tile'], [9, 2, 10, 5, 'tile'], [12, 2, 15, 5, 'tile'], [2, 7, 15, 8, 'tile'], [2, 10, 8, 13, 'carpet'], [10, 10, 13, 13, 'tile'], [15, 10, 23, 13, 'tile']],
          [[6, 6], [10, 6], [13, 6], [16, 8], [12, 9], [15, 9], [9, 12], [14, 12], [12, 14], [5, 14]],
        ),
        Array.from({ length: 7 * 7 }, (_, i): [number, number, 'grass'] => [17 + (i % 7), 2 + Math.floor(i / 7), 'grass']),
      ),
      ...patch(
        upstairs(
          [[2, 2, 6, 5, 'carpet'], [8, 2, 10, 5, 'wood'], [12, 2, 15, 5, 'wood'], [2, 7, 15, 8, 'tile'], [2, 10, 4, 13, 'wood'], [6, 10, 8, 13, 'wood'], [10, 10, 12, 13, 'wood'], [14, 10, 15, 11, 'tile']],
          [[6, 6], [9, 6], [13, 6], [3, 9], [7, 9], [11, 9], [14, 9]],
        ),
        Array.from({ length: 26 * 15 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']).filter(([x, y]) => x >= 17 && y <= 14),
      ),
    ],
    restrooms: [[14, 28, 15, 29]],
    ground: [[0, 15, 25, 17, 'concrete'], [17, 2, 23, 8, 'concrete']],
    objects: [
      // The 중앙통제실: the camera wall, the door panel, the consoles; the records.
      o('gjCctvWall', 2, 2), o('gjDoorPanel', 6, 2), o('cctvConsole', 2, 4), o('cctvConsole', 4, 4), o('archiveShelf', 7, 4, 'left'),
      // The 의무실; the 직업훈련실; the stairs up to the 수용동.
      o('gjMedCounter', 9, 2), o('gjWorkshop', 12, 2), o('stairs', 2, 7, 'right'), o('plant', 15, 7),
      // The 운동장 behind the 담장 and its 감시대.
      o('gjYard', 18, 2), o('gjPerimeter', 23, 2),
      // The 민원실: the booking desk, the lockers, the notice, the seats.
      o('gjLockers', 2, 10), o('officeDesk', 5, 10), o('gjSign', 7, 10), o('drWaitSeat', 2, 13, 'up'), o('drWaitSeat', 3, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('plant', 8, 13),
      // The 정문 hall: the gate inside, the search arch.
      o('gjGate', 10, 10), o('bgMetalGate', 13, 10, 'left'),
      // The 접견실's booths.
      o('visitBooth', 17, 10), o('visitBooth', 19, 10), o('visitBooth', 21, 10), o('plant', 23, 13),
      // Upstairs, the 수용동: the counselling room; the 거실 either side of the corridor; the officer's desk, the cart, the rounds post.
      up('counselTable', 3, 3), up('plant', 2, 2),
      up('gjCellKit', 8, 2), up('gjCellKit', 12, 2), up('gjCellKit', 2, 13, 'up'), up('gjCellKit', 6, 13, 'up'), up('gjCellKit', 10, 13, 'up'),
      up('officeDesk', 15, 7, 'left'), up('gjBookCart', 15, 8, 'left'), up('gjRoundPost', 8, 8, 'up'),
      up('toilet', 15, 11, 'left'), up('sink', 15, 10, 'left'),
    ],
    coworkers: crew(['주강혁 보안과장', '서다인 교위', '문태경 교사'], ['#263238', '#37474f', '#455a64']),
    // In the 민원실, waiting to be called to the 접견실.
    clients: [{ noun: '면회객', socials: ['guideVisitor', 'checkBelongings'], spots: [[2, 12], [3, 12], [7, 12]], max: 2, every: 60, patience: 120 }],
    alarm: { notice: '🚨 수용동에서 다툼이 났어요! 관제 콘솔로 가세요', done: '🛡️ 침착하게 상황을 정리했어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 사고 보고서를 썼어요 (성과 감소)', interaction: 'respondDisturbance', every: [200, 320], window: 30 },
    tasks: [task('monitor', '수용동 관제', ['monitorCells'], 2), task('visit', '접견 입회', ['superviseVisit']), task('counsel', '수용자 상담', ['counselInmate'])],
    extra: [task('visitors', '면회객 응대', ['guideVisitor', 'checkBelongings'], 2), task('report', '근무 일지 쓰기', ['writeReport']), task('disturbance', '소란 대응', ['respondDisturbance']), task('gjSecure', '문과 순찰 확인', ['gjDoors', 'gjGateRound', 'gjRoundLog', 'gjCellCheck']), task('gjTraining', '직업훈련 지도', ['gjBake', 'gjToolCheck']), task('gjCare', '수용자 돌보기', ['gjLetter', 'gjBooks', 'gjMedCheck']), task('gjYard', '운동 시간 살피기', ['gjYardWatch', 'gjYardTalk']), task('gjVisitors', '면회객 소지품 보관·검색', ['gjLockerGuide', 'bgTrayCheck']), boss('보안과장님께 근무 보고')],
    work: ['monitorCells', 'respondDisturbance', 'superviseVisit', 'counselInmate', 'writeReport', 'readArchive', 'guideVisitor', 'checkBelongings', 'gjLetter', 'gjDoors', 'gjGateRound', 'gjRoundLog', 'gjBake', 'gjToolCheck', 'gjBooks', 'gjYardWatch', 'gjYardTalk', 'gjMedCheck', 'gjLockerGuide', 'gjCellCheck', 'bgTrayCheck'],
    skill: 'fitness',
    floors: { tile: 'monoTile', carpet: 'slateStone', wood: 'oakWood' },
    wall: 'navyWainscot',
  },
  coastGuard: {
    careerId: 'coastGuard',
    name: '해양경찰 파출소',
    icon: '⚓',
    // A 해양경찰 파출소 on its quay (2026-11-04, the layout audit, replacing a building on a lawn beside a puddle with a boat in it, and
    // a diving tank and treadmill in the operations room). The 연안구조정 lies alongside the quay before the station, on its own at the
    // outer berth so it can put out at once; the quay's bollards, fenders and ladder, the drone pad and the life ring drill. In the
    // station the equipment room opens onto the quay; the office holds the radar, the VHF desk on channel 16 and the chart of the
    // station's waters, and the counter where fishing boats report going out and coming in; the crew room with the stairs and the
    // restroom. Upstairs, for a station that keeps watch round the clock, the duty room's bunks, the lounge with the treadmill, the shower.
    tiles: () => [
      ...patch(
        building(
          [[2, 8, 7, 13, 'tile'], [9, 8, 16, 13, 'tile'], [18, 8, 23, 13, 'wood']],
          [[4, 7], [8, 11], [17, 11], [21, 12], [12, 14]],
        ),
        [
          ...Array.from({ length: 26 * 7 }, (_, i): [number, number, 'water' | 'grass'] => [i % 26, Math.floor(i / 26), Math.floor(i / 26) <= 4 ? 'water' : 'grass']),
          ...Array.from({ length: 24 }, (_, i): [number, number, 'wall'] => [1 + i, 7, 'wall']),
          [4, 7, 'door'], [21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 13, 'wall'],
        ],
      ),
      ...patch(
        upstairs(
          [[2, 8, 8, 13, 'carpet'], [10, 8, 16, 13, 'wood'], [18, 8, 23, 13, 'tile']],
          [[9, 10], [17, 10], [21, 12]],
        ),
        [
          ...Array.from({ length: 26 * 7 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']),
          ...Array.from({ length: 24 }, (_, i): [number, number, 'wall'] => [1 + i, 7, 'wall']),
          [21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 13, 'wall'],
        ],
      ),
    ],
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 5, 25, 6, 'quayConcrete']],
    objects: [
      // The water and the quay: the rescue boat alongside; the quay's edge; the drone pad and the life ring drill at the quay's end.
      o('cgRescueBoat', 5, 1), o('hbQuayEdge', 0, 5), o('cgDroneStation', 19, 6, 'up'), o('cgRingDrill', 22, 5, 'left'),
      // The equipment room.
      o('rescueGear', 2, 8), o('rescueGear', 3, 8), o('cgDiveRack', 5, 8), o('cgWetsuitRack', 2, 13, 'up'),
      // The office: the radars, the VHF desk, the chart; the whiteboard; the counter and the seats before it.
      o('radarConsole', 9, 8), o('radarConsole', 10, 8), o('cgVhfDesk', 12, 8), o('cgSeaMap', 14, 8), o('whiteboard', 16, 12, 'left'),
      o('officeDesk', 11, 11, 'up'), o('officeDesk', 13, 11, 'up'), o('drWaitSeat', 10, 13, 'up'), o('drWaitSeat', 14, 13, 'up'), o('drWaitSeat', 15, 13, 'up'),
      // The crew room and its stairs; the restroom.
      o('stairs', 19, 8, 'right'), o('coffeeMaker', 18, 10, 'right'), o('sofa', 18, 13, 'up'), o('fridge', 20, 13, 'up'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // Upstairs: the duty room's bunks; the lounge and the treadmill; the shower.
      up('bed', 2, 9, 'right'), up('bed', 2, 12, 'right'), up('bed', 6, 9, 'right'), up('bed', 6, 12, 'right'),
      up('sofa', 11, 13, 'up'), up('treadmill', 15, 8), up('salWaterCooler', 10, 8),
      up('shower', 23, 13, 'left'),
    ],
    coworkers: crew(['강해원 파출소장', '이바다 경장', '윤파도 순경'], ['#0d47a1', '#1565c0', '#1e88e5']),
    // At the counter, reporting a boat going out or coming in.
    clients: [{ noun: '어민', socials: ['safetyBriefing', 'receiveReport'], spots: [[10, 12], [14, 12], [15, 12]], max: 2, every: 60, patience: 120 }],
    alarm: { notice: '🆘 어선 조난 신고! 연안구조정으로 출동하세요', done: '🆘 선원 모두 무사히 구조했어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 함정이 구조했어요 (성과 감소)', interaction: 'seaRescue', every: [200, 320], window: 30 },
    tasks: [task('radar', '해상 레이더 감시', ['monitorRadar'], 2), task('gear', '구조 장비 점검', ['checkRescueGear']), task('dive', '부두 앞 바다에서 잠수 훈련', ['diveTraining'])],
    extra: [
      task('patrol', '해상 순찰', ['seaPatrol']), task('fishers', '어민 응대', ['safetyBriefing', 'receiveReport'], 2), task('rescue', '조난 구조', ['seaRescue']),
      task('kit', '잠수 장비 점검', ['cgGearUp', 'cgRegCheck']), task('ring', '구명환 투척 훈련', ['cgRingThrow']), task('vhf', 'VHF 무선 당직', ['cgVhfWatch', 'cgVhfCall']), task('drone', '구조 드론 훈련', ['cgDroneDrill']),
      task('sector', '순찰 해역 브리핑', ['cgSectorBrief', 'cgMarkVessel']), task('boatCheck', '출항 전 구조정 점검', ['cgBoatCheck']), task('wetsuit', '잠수복 정리', ['cgRinseSuit']), boss('파출소장님께 보고'),
    ],
    work: ['monitorRadar', 'checkRescueGear', 'diveTraining', 'seaPatrol', 'seaRescue', 'attendMeeting', 'workout', 'safetyBriefing', 'receiveReport', 'cgGearUp', 'cgRegCheck', 'cgRingThrow', 'cgVhfWatch', 'cgVhfCall', 'cgDroneDrill', 'cgSectorBrief', 'cgMarkVessel', 'cgBoatCheck', 'cgRinseSuit'],
    skill: 'fitness',
    floors: { tile: 'monoTile', wood: 'oakWood' },
    wall: 'navyWainscot',
  },
  customsOfficer: {
    careerId: 'customsOfficer',
    name: '공항 세관',
    icon: '🛃',
    // An airport's 세관 검사장 (2026-11-05, the layout audit, replacing a building on a lawn whose travellers came in from the street
    // to wait on chairs in a lobby, with a short belt in a corner of a hall crammed with the X-rays, the dog and the seized-goods
    // cage). The way through runs north to south, as an arriving traveller's does: down from passport control into the 수하물
    // 수취장 with its two belts, the declaration stand and the detector dog's beat; then the customs line across the hall, the
    // green lane in the middle and on either side the X-rays with the inspection tables after them; the tax counter last before
    // the exit; and through the exit doors the 입국장 where people wait to meet them, the terminal's road outside. Behind the
    // 관계자 외 출입금지 door the staff side: the clearance office with the CCTV desk, the corridor, the seized-goods store and the
    // restroom. Travellers come in at the baggage claim, down from passport control (`enterAt`, 2026-11-06), and leave by the exit
    // and the road.
    tiles: () =>
      building(
        [[2, 2, 15, 9, 'carpet'], [2, 11, 15, 13, 'wood'], [17, 2, 23, 5, 'tile'], [17, 7, 23, 7, 'tile'], [17, 9, 20, 13, 'tile'], [22, 9, 23, 10, 'tile']],
        [[16, 3], [20, 6], [18, 8], [22, 8], [7, 10], [12, 10], [12, 14]],
      ),
    restrooms: [[22, 9, 23, 10]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The 수하물 수취장: the belts, the declaration stand, the detector dog's beat.
      o('cuCarousel', 3, 2), o('cuCarousel', 9, 2), o('cuFormStand', 14, 2), o('cuDogLane', 13, 4),
      // The customs line: the X-rays and the green lane between; the tables after the X-rays, the declarations desk, the tax counter.
      o('baggageXray', 2, 6), o('cuLaneGate', 6, 6), o('baggageXray', 10, 6), o('cuLimitBoard', 15, 6, 'left'),
      o('inspectionTable', 2, 8), o('customsDesk', 5, 8), o('inspectionTable', 10, 8), o('cuDutyCounter', 13, 8),
      // The 입국장: seats for those waiting to meet someone.
      o('drWaitSeat', 2, 13, 'up'), o('drWaitSeat', 3, 13, 'up'), o('drWaitSeat', 14, 13, 'up'), o('drWaitSeat', 15, 13, 'up'), o('plant', 15, 11),
      // The clearance office: the CCTV desk, the officers' desks, the board, the tariff books.
      o('cuMonitorDesk', 17, 2), o('customsDesk', 20, 2), o('customsDesk', 21, 2), o('customsDesk', 22, 2), o('whiteboard', 18, 5, 'up'), o('archiveShelf', 23, 4, 'left'), o('archiveShelf', 23, 5, 'left'),
      // The seized-goods store; the restroom.
      o('cuSeizedCage', 19, 10, 'left'), o('archiveShelf', 17, 10), o('plant', 17, 13),
      o('toilet', 23, 10, 'left'), o('sink', 23, 9, 'left'),
    ],
    coworkers: crew(['장세라 검사과장', '변우현 관세주사', '고은채 관세서기'], ['#1a237e', '#3949ab', '#5c6bc0']),
    // At the inspection tables and the tax counter.
    clients: [{ noun: '입국 여행객', socials: ['askDeclaration', 'explainDutyFree'], spots: [[3, 9], [11, 9], [14, 9]], max: 3, every: 40, patience: 100, enterAt: [7, 2] }],
    alarm: { notice: '🚩 엑스레이에 수상한 화물이 잡혔어요! 검사대로 가세요', done: '🚩 밀수품을 찾아냈어요! 성과가 크게 올라요', missed: '⌛ 검사가 늦어 화물이 통관돼 버렸어요 (성과 감소)', interaction: 'suspiciousCargo', every: [180, 300], window: 40 },
    tasks: [task('scan', '수하물 판독', ['scanBaggage'], 2), task('inspect', '여행 가방 검사', ['inspectLuggage']), task('declare', '수입 신고서 심사', ['reviewDeclaration'])],
    extra: [task('travellers', '여행객 응대', ['askDeclaration', 'explainDutyFree'], 2), task('archive', '통관 기록 찾기', ['readArchive']), task('cargo', '수상한 화물 검사', ['suspiciousCargo']), task('lanes', '녹색·적색 통로 안내', ['cuDirectLanes']), task('dog', '탐지견 순회', ['cuDogRound']), task('claim', '주인 없는 가방 확인', ['cuClaimCheck']), task('seized', '유치품 정리', ['cuLogSeized']), task('cctv', '입국장 관제', ['cuWatchCctv']), task('duty', '여행자 세금 계산', ['cuAssessDuty']), boss('과장님께 적발 보고')],
    work: ['scanBaggage', 'inspectLuggage', 'suspiciousCargo', 'reviewDeclaration', 'readArchive', 'attendMeeting', 'askDeclaration', 'explainDutyFree', 'cuDirectLanes', 'cuDogRound', 'cuClaimCheck', 'cuLogSeized', 'cuWatchCctv', 'cuAssessDuty'],
    skill: 'logic',
    floors: { tile: 'creamTile', carpet: 'slateStone', wood: 'aquaTile' },
    wall: 'creamPlain',
  },
  sanitationWorker: {
    careerId: 'sanitationWorker',
    name: '청소 차고지',
    icon: '🧹',
    // A ward's 청소차고지 before dawn (2026-11-04, the layout audit, replacing a lawn with the trucks parked side-on to the lot's edge and
    // a site office with a tool wall). The yard is paved and fenced, as a depot is; the two trucks stand in their lined bays nose to
    // the street, and the gateway in front of them is as wide as both, its folding gates folded back, so each pulls straight out on
    // its round. The wash bay stands by the second truck, the 제설함 beside it; one sorting belt under a lean-to at the back is the
    // depot's temporary sorting (the real sorting is the 선별장's, sanitationWorker@1); the 대형 폐기물 slab by the gate, where residents
    // bring things. The building is what the crews need after a dirty round: the equipment store off the yard, the changing room with
    // the vest and glove lockers, the showers and the restroom; the rest room with the morning's route board, the table and the urn
    // of 보리차. Out on the pavement the 종량제 bags are set out at the collection point for the round, the sweeper's cart beside.
    tiles: () =>
      patch(
        building(
          [[14, 2, 16, 7, 'tile'], [18, 2, 21, 7, 'wood'], [23, 2, 24, 4, 'tile'], [23, 6, 24, 7, 'tile'], [14, 9, 24, 13, 'wood']],
          [[13, 4], [19, 8], [22, 3], [22, 7], [13, 11]],
        ),
        [
          // The yard is open ground (its fence is a piece); the building is x13–25.
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !(x >= 13 && y >= 1 && y <= 14)),
          ...Array.from({ length: 14 }, (_, i): [number, number, 'wall'] => [25, 1 + i, 'wall']),
          [23, 5, 'wall'], [24, 5, 'wall'],
        ],
      ),
    restrooms: [[23, 6, 24, 7]],
    ground: [[0, 0, 13, 14, 'asphalt'], [14, 0, 25, 1, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      o('snYardFence', 0, 0),
      // The yard: the lamps; the sorting belt under its lean-to; the two trucks nose to the street, the wash bay and the 제설함 by the
      // second; the bulky-waste slab by the gate.
      o('snLamp', 3, 0), o('snLamp', 11, 0), o('snLamp', 0, 9, 'right'), o('recycleSorter', 7, 0),
      o('garbageTruck', 1, 3, 'right'), o('garbageTruck', 5, 3, 'right'), o('washBay', 8, 5, 'left'), o('snSandBox', 10, 5),
      o('snBulkYard', 9, 12),
      // The building: the equipment store (the tool wall, the sweepers' carts in at night); the changing room's lockers; the showers;
      // the restroom; the rest room (the route board, the table, the urn, the fridge and coffee, the sofa).
      o('toolWall', 14, 2),
      o('snLocker', 18, 2), o('snLocker', 21, 4, 'left'),
      o('shower', 23, 2), o('shower', 24, 2),
      o('toilet', 24, 7, 'left'), o('sink', 24, 6, 'left'),
      o('snRouteBoard', 15, 9), o('diningTable', 18, 11), o('diningChair', 18, 10), o('diningChair', 19, 10), o('diningChair', 18, 12, 'up'), o('diningChair', 19, 12, 'up'),
      o('snTeaUrn', 21, 9), o('coffeeMaker', 22, 9), o('fridge', 23, 9), o('sofa', 22, 13, 'up'),
      // The pavement: the collection point with the bags set out for the round, the sweeper's cart.
      o('snBinRow', 15, 15), o('snStreetCart', 20, 15),
    ],
    coworkers: crew(['박철민 반장', '유선희', '정만수'], ['#ef6c00', '#fb8c00', '#ffa726']),
    // Residents at the bulky-waste slab by the gate.
    clients: [{ noun: '주민', socials: ['explainSorting', 'acceptBulkWaste'], spots: [[8, 12], [9, 13], [11, 13]], max: 1, every: 70, patience: 120 }],
    alarm: { notice: '🌀 태풍이 지나간 거리에 쓰레기가 가득해요! 청소차로 출동하세요', done: '🌀 거리가 금세 깨끗해졌어요! 성과가 크게 올라요', missed: '⌛ 늦어서 주민 민원이 쏟아졌어요 (성과 감소)', interaction: 'stormCleanup', every: [150, 240], window: 40 },
    tasks: [task('collect', '쓰레기 수거', ['collectRoute']), task('sort', '재활용 선별', ['sortRecycling']), task('wash', '장비 세척', ['washEquipment'])],
    extra: [task('residents', '주민 응대', ['explainSorting', 'acceptBulkWaste']), task('tools', '공구 정리', ['organizeTools']), task('storm', '긴급 청소', ['stormCleanup']), task('load', '봉투 압착', ['snLoadBags']), task('gate', '테일게이트 점검', ['snCheckGate']), task('route', '노선 배차 확인', ['snCheckRoute']), task('gear', '조끼·장갑 챙기기', ['snGearUp']), task('stack', '봉투 모아 쌓기', ['snStackBags']), task('bulk', '대형 폐기물 확인', ['snTagBulk']), task('sweep', '거리 쓸기', ['snSweepStreet', 'snPickLitter']), task('sand', '제설 모래 준비', ['snShovelSand']), boss('반장님께 작업 보고')],
    work: ['collectRoute', 'stormCleanup', 'sortRecycling', 'washEquipment', 'organizeTools', 'explainSorting', 'acceptBulkWaste', 'snLoadBags', 'snCheckGate', 'snCheckRoute', 'snGearUp', 'snStackBags', 'snTagBulk', 'snSweepStreet', 'snPickLitter', 'snShovelSand'],
    skill: 'fitness',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  socialWorker: {
    careerId: 'socialWorker',
    name: '종합사회복지관',
    icon: '🤝',
    // A 종합사회복지관 as one is (2026-11-05, the layout audit, replacing a one-storey house on a lawn with no room to talk in private, a
    // 경로식당 of one four-seat table and no kitchen with the restroom in its corner, the 공부방 in the records room and a lobby of three
    // chairs). Downstairs: the lobby round the stairs, the volunteers' desk, the programme board and the seniors' sofas to rest on; the
    // two closed 상담실 off it, where a case is talked over in private; the 사무실 of the case workers' desks and the 관장's, the store of
    // donated goods and the food bank's fridge behind it; and the 경로식당, the biggest room, the kitchen across its back (the stoves, the
    // sinks, the fridges), the serving counter with the tray cart where the seniors queue, and rows of tables, the restroom off it.
    // Upstairs the 프로그램실 (the 노래 교실's piano, the board, the chairs in rows), the after-school 공부방, the 바둑 · 장기 room and the
    // meeting room the volunteers use; the rest of the roof open. The centre's van at the kerb, its sign on the pavement.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 10, 13, 'tile'], [12, 2, 18, 6, 'carpet'], [20, 2, 23, 6, 'tile'], [12, 8, 18, 13, 'wood'], [20, 8, 23, 9, 'carpet'], [20, 11, 23, 13, 'carpet']],
          [[11, 12], [18, 7], [19, 4], [19, 9], [19, 12], [12, 14]],
        ),
        // The restroom off the 경로식당, its door in its own wall.
        [[2, 11, 'door'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall']],
      ),
      ...patch(
        upstairs([[2, 2, 10, 6, 'wood'], [12, 2, 17, 6, 'carpet'], [19, 2, 23, 6, 'wood'], [2, 8, 23, 9, 'tile'], [2, 11, 10, 13, 'carpet']], [[6, 7], [16, 7], [22, 7], [3, 10]]),
        Array.from({ length: 13 * 4 }, (_, i): [number, number, 'void'] => [12 + (i % 13), 11 + Math.floor(i / 13), 'void']),
      ),
    ],
    restrooms: [[2, 12, 3, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The 경로식당's kitchen: the stoves, the sinks, the fridges; the serving counter and the tray cart where the queue starts.
      o('stove', 2, 2), o('stove', 3, 2), o('kitchenSink', 5, 2), o('kitchenSink', 6, 2), o('fridge', 9, 2), o('fridge', 10, 2),
      o('mealServiceCounter', 4, 4), o('mealServiceCounter', 7, 4), o('dtTrayStand', 3, 4),
      // Its tables in rows.
      o('diningTable', 3, 7), o('diningTable', 6, 7), o('diningTable', 9, 7),
      ...[3, 4, 6, 7, 9, 10].flatMap((x) => [o('diningChair', x, 6), o('diningChair', x, 8, 'up')]),
      o('diningTable', 5, 12), o('diningTable', 8, 12),
      ...[5, 6, 8, 9].flatMap((x) => [o('diningChair', x, 11), ...(x > 6 ? [o('diningChair', x, 13, 'up')] : [])]),
      o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'),
      // The 사무실: the case desks, the 관장's desk, the files, the board.
      o('caseDesk', 13, 2), o('caseDesk', 15, 2), o('caseDesk', 13, 5, 'up'), o('caseDesk', 15, 5, 'up'), o('officeDesk', 17, 2), o('archiveShelf', 12, 6, 'up'), o('whiteboard', 16, 5, 'up'),
      // The store of donated goods and the food bank's fridge.
      o('donationShelf', 20, 2), o('donationShelf', 21, 2), o('donationShelf', 22, 2), o('donationShelf', 23, 2), o('fridge', 23, 6, 'left'), o('plant', 20, 6),
      // The lobby: the stairs, the volunteers' desk, the programme board, the sofas.
      o('stairs', 13, 8, 'left'), o('swVolunteerSignIn', 14, 10), o('swProgramNotice', 12, 9, 'right'), o('sofa', 14, 13, 'up'), o('sofa', 16, 13, 'up'), o('plant', 18, 10),
      // The two 상담실: a table, the worker's chair and the client's.
      o('diningTable', 22, 8), o('diningChair', 23, 9, 'up'), o('armchair', 21, 8, 'right'),
      o('diningTable', 22, 12), o('diningChair', 23, 13, 'up'), o('armchair', 23, 11),
      // Upstairs. The 프로그램실: the piano, the board, the chairs in rows.
      up('piano', 2, 2), up('bookshelf', 7, 2), up('bookshelf', 8, 2), up('plant', 10, 2),
      ...[3, 4, 5, 7, 8, 9].map((x) => up('diningChair', x, 5, 'up')),
      // The after-school 공부방.
      up('swStudyNook', 13, 3), up('swStudyNook', 13, 5), up('bookshelf', 16, 2), up('bookshelf', 17, 2),
      // The 바둑 · 장기 room.
      up('swBadukCorner', 20, 3), up('armchair', 23, 3, 'left'), up('sofa', 20, 6, 'up'),
      // The volunteers' meeting room.
      up('salMeetingTable', 5, 12), up('salMeetingChair', 5, 11), up('salMeetingChair', 6, 11), up('salMeetingChair', 4, 12, 'right'), up('salMeetingChair', 8, 12, 'left'), up('plant', 10, 13),
      // The van at the kerb; the centre's sign.
      o('welfareVan', 15, 16), o('swCentreSign', 10, 15),
    ],
    coworkers: crew(['윤정희 관장', '조하나 사회복지사', '민경수 사회복지사'], ['#2e7d32', '#66bb6a', '#a5d6a7']),
    // Seniors at the 경로식당's tables, and in the 상담실.
    clients: [{ noun: '어르신', socials: ['listenToElder', 'explainBenefits'], spots: [[3, 9], [6, 9], [22, 9], [22, 13]], max: 2, every: 50, patience: 150 }],
    alarm: { notice: '📞 혼자 사는 어르신과 연락이 안 돼요! 복지관 차량으로 방문하세요', done: '🏠 어르신이 무사하셨어요. 필요한 지원도 연결했어요! 성과가 크게 올라요', missed: '⌛ 방문이 늦어져 걱정을 끼쳤어요 (성과 감소)', interaction: 'checkOnElder', every: [200, 320], window: 45 },
    tasks: [task('case', '사례 관리', ['manageCase'], 2), task('note', '상담 기록 쓰기', ['writeCaseNote']), task('elders', '어르신 상담', ['listenToElder', 'explainBenefits'])],
    extra: [task('meal', '경로식당 배식', ['serveSeniorMeal']), task('donations', '후원 물품 정리', ['sortDonations']), task('visit', '어르신 댁 방문', ['checkOnElder']), task('programs', '어르신 · 아이 프로그램', ['swPlayBaduk', 'swTutorKids']), task('volunteers', '자원봉사 · 프로그램 안내', ['swGreetVolunteers', 'swPostProgram']), boss('관장님께 사례 보고')],
    work: ['manageCase', 'writeCaseNote', 'sortDonations', 'serveSeniorMeal', 'checkOnElder', 'attendMeeting', 'readArchive', 'listenToElder', 'explainBenefits', 'swPlayBaduk', 'swTutorKids', 'swGreetVolunteers', 'swPostProgram'],
    skill: 'charisma',
    floors: { tile: 'creamTile', wood: 'oakWood', carpet: 'sageCarpet' },
    wall: 'creamPlain',
  },
  careWorker: {
    careerId: 'careWorker',
    name: '요양원',
    icon: '👵',
    // A 노인요양시설 in its own two-storey building (2026-11-04, the layout audit, replacing one big room with three beds, the care
    // station, the medicine cart and a bathing booth standing in the middle of it, and a lobby of waiting chairs). A care home lives
    // on its residents' floors: rooms of four beds at most (the law's limit) along a corridor with a handrail, the care station open
    // on the corridor where the call bell rings and the care log is kept, the medicine cart and cabinet behind it. Downstairs the
    // 공동생활실 where the residents eat at four-seat tables off the meal cart and spend the day (the TV, the 노래 교실 corner, the
    // memory wall, the activity table), the bathroom walled on its own (the shower chair, the rails, the towels), the laundry and
    // linen room, the office, the staff room, and at the door the 면회실: tables where families sit with their mother or father,
    // the visitors' book and the hand gel by the door through to the care side, the lift and the stairs. Upstairs four rooms of
    // four and two along the top, the corridor's rails, the station's bay, a two-bed room, a single room for the very ill and the
    // linen and sluice room. A bench and trees by the entrance.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 11, 8, 'wood'], [13, 2, 16, 5, 'tile'], [18, 2, 23, 5, 'tile'], [13, 7, 23, 8, 'tile'], [2, 10, 13, 13, 'tile'], [15, 10, 19, 13, 'carpet'], [21, 10, 23, 13, 'wood']],
          [[8, 9], [12, 7], [14, 6], [19, 6], [13, 9], [14, 11], [18, 9], [22, 9], [12, 14]],
        ),
        // The visitors' restroom in the 면회실's corner.
        [[3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall'], [2, 11, 'door']],
      ),
      ...upstairs(
        [[2, 2, 6, 6, 'wood'], [8, 2, 12, 6, 'wood'], [14, 2, 17, 6, 'wood'], [19, 2, 23, 6, 'wood'], [2, 8, 23, 9, 'tile'], [9, 10, 13, 13, 'tile'], [2, 11, 7, 13, 'wood'], [15, 11, 18, 13, 'wood'], [20, 11, 23, 13, 'tile']],
        [[6, 7], [12, 7], [17, 7], [23, 7], [5, 10], [18, 10], [21, 10]],
      ),
    ],
    restrooms: [[2, 12, 3, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The 공동생활실: the memory wall, the TV with two armchairs, the 노래 교실 corner, the activity table; two four-seat tables and the meal cart.
      o('cwMemoryWall', 2, 2), o('tv', 5, 2), o('cwSongCorner', 8, 2), o('plant', 11, 2), o('armchair', 5, 4, 'up'), o('armchair', 6, 4, 'up'), o('cwActivityTable', 9, 4),
      o('diningTable', 3, 6), o('diningChair', 3, 5), o('diningChair', 4, 5), o('diningChair', 3, 7, 'up'), o('diningChair', 4, 7, 'up'),
      o('diningTable', 6, 6), o('diningChair', 6, 5), o('diningChair', 7, 5), o('diningChair', 6, 7, 'up'), o('diningChair', 7, 7, 'up'),
      o('mealCart', 9, 8, 'up'), o('plant', 2, 8), o('lamp', 11, 5),
      // The bathroom: the bathing corner, the towels, the basin, a wheelchair to come and go in.
      o('cwBathRoom', 13, 2), o('linenShelf', 16, 2), o('nsHandSink', 13, 5, 'up'), o('cwWheelchair', 16, 5),
      // The laundry and linen room: the washer and dryer, the linen shelves, the folding table, the linen cart.
      o('pmLaundry', 18, 2), o('pmLaundry', 19, 2), o('linenShelf', 21, 2), o('linenShelf', 22, 2), o('linenShelf', 23, 2), o('diningTable', 20, 4), o('nsLinenRack', 23, 5, 'left'),
      // The corridor: the stairs, the lift.
      o('stairs', 14, 8, 'left'), o('nsElevator', 22, 7),
      // The 면회실: the visitors' book and hand gel by the door to the care side, two tables, a sofa by the entrance; the restroom.
      o('cwVisitorDesk', 12, 10), o('plant', 5, 10), o('plant', 11, 10),
      o('diningTable', 6, 12), o('diningChair', 6, 13, 'up'), o('diningChair', 7, 13, 'up'),
      o('diningTable', 9, 12), o('diningChair', 9, 11), o('diningChair', 9, 13, 'up'), o('diningChair', 10, 13, 'up'),
      o('sofa', 13, 12, 'left'), o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'),
      // The office: the desks, the files, the director's desk, the board.
      o('officeDesk', 15, 10), o('officeDesk', 16, 10), o('archiveShelf', 19, 10), o('officeDesk', 19, 12, 'left'), o('whiteboard', 16, 13, 'up'), o('plant', 15, 13),
      // The staff room.
      o('coffeeMaker', 21, 10), o('fridge', 23, 10), o('sofa', 21, 12, 'right'), o('gjLockers', 23, 12, 'left'),
      // By the entrance: a bench, trees.
      o('ghBenchSofa', 14, 15), o('tree', 9, 15), o('tree', 17, 15),
      // Upstairs. Rooms of four: two beds each side of the aisle, the wardrobe, the basin by the door.
      up('careBed', 2, 2), up('careBed', 4, 2), up('careBed', 2, 5, 'up'), up('careBed', 4, 5, 'up'), up('clothesCabinet', 6, 2, 'left'), up('nsHandSink', 6, 4, 'left'),
      up('careBed', 8, 2), up('careBed', 10, 2), up('careBed', 8, 5, 'up'), up('careBed', 10, 5, 'up'), up('clothesCabinet', 12, 2, 'left'), up('nsHandSink', 12, 4, 'left'),
      // A room of two, a wheelchair and a chair for visitors.
      up('careBed', 14, 2), up('clothesCabinet', 15, 2), up('careBed', 16, 2), up('cwWheelchair', 14, 5), up('armchair', 15, 5, 'up'),
      up('careBed', 19, 2), up('careBed', 21, 2), up('careBed', 19, 5, 'up'), up('careBed', 21, 5, 'up'), up('clothesCabinet', 23, 2, 'left'), up('nsHandSink', 23, 4, 'left'),
      // The corridor's handrails; the lift.
      up('walkingRail', 2, 8), up('walkingRail', 8, 8), up('walkingRail', 19, 8), up('nsElevator', 21, 8),
      // The care station's bay: the station on the corridor, the charting desk, the medicine cart and cabinet behind, the files, the basin.
      up('cwCareStation', 10, 10, 'up'), up('officeDesk', 9, 10), up('nsHandSink', 13, 10, 'left'), up('cwMedCart', 9, 13, 'up'), up('medCabinet', 12, 13, 'up'), up('archiveShelf', 13, 13, 'up'),
      // A room of two below the corridor.
      up('careBed', 2, 11, 'right'), up('careBed', 2, 13, 'right'), up('clothesCabinet', 7, 11, 'left'), up('cwWheelchair', 7, 13),
      // The single room.
      up('careBed', 15, 11), up('clothesCabinet', 16, 11), up('armchair', 17, 13, 'up'), up('plant', 18, 13),
      // The linen and sluice room.
      up('linenShelf', 22, 11), up('linenShelf', 23, 11), up('nsLinenRack', 20, 13, 'up'), up('kitchenSink', 22, 13, 'up'),
    ],
    coworkers: crew(['엄순자 원장', '방미경 요양보호사', '탁영호 요양보호사'], ['#00897b', '#4db6ac', '#80cbc4']),
    // At the 면회실's tables.
    clients: [{ noun: '면회 온 가족', socials: ['updateFamily', 'comfortFamily'], spots: [[5, 13], [8, 13], [11, 13]], max: 2, every: 70, patience: 120 }],
    alarm: { notice: '🔔 낙상 감지 알림이 울렸어요! 요양 침대로 가세요', done: '🔔 바로 살펴 다치신 데 없이 모셨어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 다른 선생님이 먼저 갔어요 (성과 감소)', interaction: 'fallResponse', every: [180, 300], window: 30 },
    tasks: [task('care', '돌봄 드리기', ['assistCare'], 2), task('meal', '식사 도와드리기', ['serveMealCart']), task('walk', '산책 보조', ['walkWithElder'])],
    extra: [
      task('turn', '자세 바꿔 드리기', ['turnPatient']), task('bath', '목욕 도와드리기', ['cwBathAssist']), task('linen', '시트 정리', ['foldLinens']), task('family', '가족 응대', ['updateFamily', 'comfortFamily']),
      task('meds', '투약 · 혈압 체크', ['cwGiveMeds', 'cwCheckBp']), task('program', '생활실 여가 프로그램', ['cwPlayHwatu', 'cwColoring', 'cwSingAlong', 'cwReminisce']), task('record', '돌봄 기록 · 호출벨 응답', ['cwWriteCareLog', 'cwAnswerCall']),
      boss('원장님께 돌봄 보고'),
    ],
    work: ['assistCare', 'turnPatient', 'fallResponse', 'serveMealCart', 'walkWithElder', 'foldLinens', 'updateFamily', 'comfortFamily', 'cwGiveMeds', 'cwCheckBp', 'cwPlayHwatu', 'cwColoring', 'cwSingAlong', 'cwReminisce', 'cwWriteCareLog', 'cwAnswerCall', 'cwBathAssist'],
    skill: 'charisma',
    floors: { tile: 'creamTile', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  childcareTeacher: {
    careerId: 'childcareTeacher',
    name: '국공립 어린이집',
    icon: '👶',
    // A 구립 어린이집 in its own two-storey building (2026-11-04, the layout audit, replacing the hall plan's one big playroom with
    // everything in it, a separate nap room, a staff kitchen with a sofa and no children's toilet, kitchen, office or playground).
    // A daycare is its classes by age, each a small room where the children play, eat and sleep on bedding laid on the heated
    // floor (no nap room), with a toilet next door; the babies' rooms are downstairs. Downstairs the 0세 and 1세 rooms with the
    // babies' toilet and changing table between them, the 2세 room, the corridor; the kitchen (lunch goes up to the rooms on the
    // cart), the director's office that is also the sick bay and where parents are seen, the entrance hall with its cubbies, the
    // attendance board, the stairs and the staff restroom. Upstairs the 3세 and 4·5세 rooms with the children's toilet between
    // them, the playroom with the indoor slide, the teachers' room, and the fire escape down the outside. The playground is
    // fenced beside the building, out of the hall's side door; the yellow shuttle van waits at the kerb.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 5, 6, 'carpet'], [7, 2, 8, 6, 'tile'], [10, 2, 13, 6, 'carpet'], [15, 2, 18, 6, 'carpet'], [2, 8, 18, 8, 'wood'], [2, 10, 5, 13, 'tile'], [7, 10, 10, 13, 'wood'], [12, 9, 18, 13, 'wood']],
          [[3, 7], [6, 4], [9, 4], [12, 7], [15, 7], [4, 9], [9, 9], [19, 9], [12, 14]],
        ),
        [
          ...Array.from({ length: 5 * 14 }, (_, i): [number, number, 'grass'] => [20 + (i % 5), 1 + Math.floor(i / 5), 'grass']),
          [17, 11, 'wall'], [18, 11, 'wall'], [16, 12, 'wall'], [16, 13, 'door'],
        ],
      ),
      ...patch(
        upstairs(
          [[2, 2, 6, 6, 'carpet'], [8, 2, 9, 6, 'tile'], [11, 2, 18, 6, 'carpet'], [2, 8, 18, 8, 'wood'], [12, 9, 18, 10, 'wood'], [2, 10, 10, 13, 'wood'], [12, 12, 18, 13, 'carpet']],
          [[4, 7], [7, 4], [10, 4], [14, 7], [5, 9], [12, 11], [1, 11]],
        ),
        Array.from({ length: 5 * 14 }, (_, i): [number, number, 'void'] => [20 + (i % 5), 1 + Math.floor(i / 5), 'void']),
      ),
    ],
    restrooms: [[17, 12, 18, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // 햇살반 (0세): the bedding cupboard, the mats on the floor, toys.
      o('ccBeddingCloset', 2, 2), o('toyBox', 5, 2), o('napMats', 2, 5), o('armchair', 5, 5, 'left'),
      // The babies' toilet between the two rooms: the changing table, the low potties.
      o('ccChangingTable', 7, 2), o('ccToddlerToilet', 7, 6, 'up'),
      // 꽃잎반 (1세): the story corner, the little sinks, the block mat.
      o('storyCorner', 10, 2), o('ccKidSink', 12, 2), o('blockMat', 10, 5), o('toyBox', 13, 6, 'up'),
      // 열매반 (2세): the craft table, the bedding cupboard, lunch at the table off the cart.
      o('craftTable', 15, 2), o('ccBeddingCloset', 17, 2), o('ccLunchCart', 16, 5, 'up'),
      // The kitchen: the counter, the range, the sink, the fridge, the serving hatch.
      o('prepCounter', 2, 10), o('lineStove', 5, 10), o('kitchenSink', 2, 13, 'up'), o('snackCounter', 3, 13, 'up'), o('fridge', 5, 12, 'left'),
      // The director's office and sick bay.
      o('officeDesk', 7, 10), o('medCabinet', 10, 10), o('archiveShelf', 10, 13, 'up'), o('diningTable', 7, 12, 'right'),
      // The entrance hall: the stairs, the attendance board, the cubbies and shoe shelf; the staff restroom.
      o('stairs', 13, 10, 'left'), o('ccAttendanceBoard', 12, 11, 'right'), o('ccCubbies', 13, 12),
      o('toilet', 18, 13, 'left'), o('sink', 18, 12, 'left'),
      // The playground inside its fence; the fire escape; the shuttle van at the kerb.
      o('ccPlayFence', 24, 1), o('ccPlayStructure', 21, 2), o('ccSandbox', 21, 8), o('plant', 24, 12),
      o('ccFireStair', 0, 10), o('ccShuttleVan', 3, 16, 'up'),
      // Upstairs. 별님반 (3세): the story corner, the mats, the bedding cupboard.
      up('storyCorner', 2, 2), up('toyBox', 6, 2), up('napMats', 2, 5), up('ccBeddingCloset', 5, 6, 'up'),
      // The children's toilet: the row of potties, the low sinks.
      up('ccToddlerToilet', 8, 2), up('ccKidSink', 8, 6, 'up'),
      // 하늘반 (4·5세): blocks, crafts, the play kitchen, the bedding cupboard.
      up('blockMat', 12, 2), up('craftTable', 15, 2), up('bsPlayKitchen', 17, 2), up('ccBeddingCloset', 17, 6, 'up'), up('toyBox', 11, 6, 'up'),
      // The playroom: the indoor slide, the piano, the toys.
      up('ccSlide', 3, 10), up('piano', 6, 10), up('toyBox', 10, 10),
      // The teachers' room: the meeting table, the desks.
      up('salMeetingChair', 13, 12, 'right'), up('salMeetingTable', 14, 12), up('teacherDesk', 18, 12, 'left'), up('teacherDesk', 18, 13, 'left'),
    ],
    coworkers: crew(['한소망 원장', '이새싹 선생님', '도담 선생님'], ['#ec407a', '#aed581', '#4fc3f7']),
    clients: [
      { noun: '어린이', socials: ['playWithChild', 'helpWashHands'], spots: [[4, 3], [12, 4], [15, 4], [22, 6], [22, 11]], max: 3, every: 40, patience: 120, age: 'child' },
      // Parents hand over and collect their child in the entrance hall, at the cubbies.
      { noun: '학부모', socials: ['talkToParent'], spots: [[14, 11], [15, 11]], max: 2, every: 120, patience: 90 },
    ],
    alarm: { notice: '😢 낮잠에서 깬 아이가 울어요! 햇살반으로 가세요', done: '😊 아이가 다시 새근새근 잠들었어요! 성과가 크게 올라요', missed: '⌛ 우는 소리에 다른 아이들도 다 깼어요 (성과 감소)', interaction: 'sootheCrying', every: [180, 300], window: 30 },
    tasks: [task('story', '동화 읽어 주기', ['readStory']), task('play', '놀이 지도', ['craftWithKids', 'buildBlocks', 'ccSpotSlide', 'ccWatchOutdoor'], 2), task('kids', '아이들 돌보기', ['playWithChild', 'helpWashHands', 'ccWashHands', 'ccPottyHelp'])],
    extra: [
      task('snack', '간식 준비', ['prepareSnack']), task('nap', '낮잠 재우기', ['settleNap', 'ccLayBedding']), task('parents', '학부모 상담', ['talkToParent']), task('arrive', '등원 맞이 · 하원 준비', ['ccTakeAttendance', 'ccTidyCubbies']),
      task('outdoor', '바깥 놀이', ['ccWatchOutdoor', 'ccSandPlay']), task('bus', '통학차량 하차 확인', ['ccShuttleCheck']), task('potty', '배변 · 기저귀', ['ccPottyHelp', 'ccCleanChangeTable']),
      boss('원장님께 하루 보고'),
    ],
    work: ['readStory', 'craftWithKids', 'buildBlocks', 'settleNap', 'sootheCrying', 'prepareSnack', 'ccWashHands', 'ccSpotSlide', 'ccTakeAttendance', 'ccTidyCubbies', 'ccCleanChangeTable', 'ccSetLunchCart', 'playWithChild', 'helpWashHands', 'talkToParent', 'ccPottyHelp', 'ccLayBedding', 'ccWatchOutdoor', 'ccSandPlay', 'ccShuttleCheck'],
    skill: 'charisma',
    floors: { carpet: 'lilacCarpet', tile: 'creamTile', wood: 'oakWood' },
    wall: 'lavenderStripes',
  },
  disabilitySupport: {
    careerId: 'disabilitySupport',
    name: '장애인 복지관',
    icon: '♿',
    // A 장애인 복지관 on two floors (2026-11-04, the layout audit, replacing one hall with the sensory mat, the workshop, the walking
    // bars and the kitchen all in it, a toilet only in the staff room, and the van on the grass). A 복지관 is a public building of
    // several floors, each with its accessible restroom and the lift, every programme in its own room. Outside, the drop-off under
    // its canopy where the centre's van lowers its lift by the door, the tactile paving to the door. Downstairs the lobby (the
    // information desk, the counselling desk, the wheelchair waiting space and seats, the tactile map, the lift and the stairs, the
    // wide accessible restroom with its door off the lobby); the 주간보호실 (the symbol board, the large-print reading corner, the
    // activity table, a sofa to rest on); the 생활훈련실 where cooking and eating are practised (the training kitchen, the
    // tables); the office, two rows of desks where the social workers and teachers keep their records, the planning board and a
    // table to talk at. Upstairs the 직업재활 workshop, the 재활치료실 (the walking bars, the treadmills, the mat), the
    // programme room (the art table, the accessible computers, the piano) and the darkened sensory room.
    tiles: () => [
      ...building(
        [[2, 2, 8, 8, 'carpet'], [10, 2, 15, 8, 'tile'], [17, 2, 23, 8, 'wood'], [2, 10, 19, 13, 'tile'], [21, 11, 23, 13, 'tile']],
        [[6, 9], [11, 9], [18, 9], [20, 12], [12, 14]],
      ),
      ...upstairs(
        [[2, 2, 10, 7, 'wood'], [12, 2, 17, 7, 'wood'], [19, 2, 23, 7, 'carpet'], [2, 9, 23, 10, 'tile'], [12, 11, 18, 13, 'tile'], [2, 12, 8, 13, 'carpet'], [20, 12, 23, 13, 'carpet']],
        [[6, 8], [14, 8], [21, 8], [5, 11], [21, 11]],
      ),
    ],
    windowless: ['sensoryMat'],
    restrooms: [[21, 11, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The 주간보호실: the symbol board, the reading corner, the activity table, the sofa and an armchair.
      o('dsAacWall', 2, 2), o('dsReadingNook', 5, 2), o('plant', 8, 2),
      o('diningTable', 5, 5), o('diningChair', 5, 4), o('diningChair', 6, 4), o('diningChair', 5, 6, 'up'), o('diningChair', 6, 6, 'up'),
      o('sofa', 2, 8, 'up'), o('armchair', 4, 8, 'up'), o('lamp', 8, 8),
      // The 생활훈련실: the training kitchen, the fridge, the sink, the cooker; two tables.
      o('adaptiveKitchen', 10, 2), o('fridge', 12, 2), o('kitchenSink', 13, 2), o('stove', 14, 2),
      o('diningTable', 11, 5), o('diningChair', 11, 4), o('diningChair', 12, 4), o('diningChair', 11, 6, 'up'), o('diningChair', 12, 6, 'up'),
      o('diningTable', 14, 5), o('diningChair', 14, 4), o('diningChair', 15, 4), o('diningChair', 14, 6, 'up'), o('diningChair', 15, 6, 'up'),
      // The office: two rows of desks, the planning board, the files, a table to talk at, the coffee.
      o('officeDesk', 17, 2), o('officeDesk', 18, 2), o('officeDesk', 19, 2), o('officeDesk', 17, 5, 'up'), o('officeDesk', 18, 5, 'up'), o('officeDesk', 19, 5, 'up'),
      o('whiteboard', 22, 2), o('archiveShelf', 23, 4, 'left'), o('diningTable', 21, 7), o('diningChair', 21, 6), o('diningChair', 22, 6), o('diningChair', 23, 7, 'left'), o('coffeeMaker', 17, 8, 'up'),
      // The lobby: the lift, the information desk facing the door, the counselling desk, the waiting seats and wheelchair space, the tactile map, the stairs.
      o('nsElevator', 2, 10), o('lobbyDesk', 13, 10), o('caseDesk', 19, 11, 'left'), o('diningChair', 17, 11, 'right'),
      o('drWaitSeat', 5, 13, 'up'), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('nsWheelchair', 9, 13, 'up'), o('dsAccessMap', 11, 13, 'up'),
      o('stairs', 14, 13, 'right'), o('plant', 2, 13),
      // The accessible restroom.
      o('toilet', 23, 13, 'left'), o('sink', 21, 11),
      // Outside: the drop-off canopy, the van at it.
      o('dsCanopy', 18, 15), o('supportVan', 15, 16),
      // Upstairs. The workshop: the benches in two rows, the lockers.
      up('workshopBench', 2, 2), up('workshopBench', 5, 2), up('workshopBench', 8, 2), up('workshopBench', 2, 5, 'up'), up('workshopBench', 8, 5, 'up'), up('clsLockers', 2, 7, 'up'),
      // The 재활치료실: the walking bars, two treadmills, the mat, a wheelchair.
      up('parallelBars', 12, 2), up('treadmill', 15, 2), up('treadmill', 16, 2), up('rugPlaymat', 12, 5), up('nsWheelchair', 17, 6),
      // The programme room: the art table, the computers, the piano.
      up('dsArtTherapy', 19, 2), up('dsAccessPc', 22, 2), up('piano', 19, 7, 'up'), up('plant', 23, 7),
      // The corridor's lift; the stair hall a place to wait between programmes (a sofa, armchairs, books).
      up('nsElevator', 2, 9),
      up('sofa', 12, 12, 'right'), up('armchair', 13, 11), up('armchair', 15, 11), up('bookshelf', 17, 11), up('bookshelf', 18, 11), up('plant', 18, 13),
      // The sensory room.
      up('sensoryMat', 2, 12), up('sensoryMat', 7, 12), up('lamp', 6, 12),
      // A counselling room upstairs.
      up('diningTable', 21, 13), up('armchair', 20, 13, 'right'), up('armchair', 23, 13, 'left'),
    ],
    coworkers: crew(['나은혜 센터장', '권바른 활동지원사', '고희망 재활교사'], ['#1565c0', '#42a5f5', '#90caf9']),
    // At the 주간보호실's table, and on the lobby's seats.
    clients: [{ noun: '이용자', socials: ['assistDaily', 'encourageUser'], spots: [[7, 4], [7, 6], [5, 12], [7, 12]], max: 2, every: 50, patience: 150 }],
    alarm: { notice: '🚐 이용자 병원 동행 요청이 왔어요! 송영 차량으로 가세요', done: '🚐 진료를 잘 마치고 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 동행이 늦어 진료 예약을 놓쳤어요 (성과 감소)', interaction: 'escortOuting', every: [200, 320], window: 45 },
    tasks: [task('program', '감각 · 미술 프로그램', ['sensoryProgram', 'dsArtTogether']), task('workshop', '작업 활동 지도', ['assembleCraft'], 2), task('users', '이용자 지원', ['assistDaily', 'encourageUser'])],
    extra: [task('walk', '보행 훈련', ['walkTraining']), task('kitchen', '일상생활 훈련', ['dailySkills']), task('comm', '의사소통 · 정보 지원', ['dsAacTalk', 'dsReadTogether', 'dsPcCoach']), task('access', '편의시설 점검', ['dsCheckAccess']), task('outing', '외출 동행', ['escortOuting']), boss('센터장님께 지원 보고')],
    work: ['sensoryProgram', 'assembleCraft', 'walkTraining', 'dailySkills', 'escortOuting', 'attendMeeting', 'assistDaily', 'encourageUser', 'dsAacTalk', 'dsReadTogether', 'dsPcCoach', 'dsArtTogether', 'dsCheckAccess'],
    skill: 'charisma',
    floors: { tile: 'creamTile', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  youthCounselor: {
    careerId: 'youthCounselor',
    name: '청소년수련관',
    icon: '🧭',
    // The 청소년수련관's floor of activity rooms (2026-11-05, the layout audit, replacing a building on a lawn with the ping-pong
    // tables, the piano, the band corner and the programme desks all in one hall, a counselling room like an office of two desks
    // with a study corner in it, a corridor lobby with the sign-up desk in its corner and a toilet only in the staff room). As a
    // real one: in at the door to the wide lobby, the 안내 데스크 facing the door where programmes are signed up for, the 동아리
    // board, the study corner and a sofa to hang about on, the restroom off it. Off the lobby the 체육활동실 (two ping-pong tables,
    // the mats, chairs along the wall); the soundproofed 밴드실, no windows, the drum kit and amps and the piano; the 청소년지도사
    // office with the programme desks. Through the office, past the counsellors, the two small 상담실, each with a door that
    // shuts, a sofa and an armchair facing it and the counsellor's desk in the corner. The centre's bus waits at the kerb.
    tiles: () =>
      patch(
        building(
          [[2, 2, 11, 8, 'wood'], [13, 2, 16, 8, 'wood'], [18, 2, 18, 8, 'tile'], [20, 2, 23, 4, 'carpet'], [20, 6, 23, 8, 'carpet'], [2, 10, 15, 13, 'tile'], [17, 10, 23, 13, 'wood']],
          [[6, 9], [15, 9], [16, 10], [18, 9], [19, 3], [19, 7], [12, 14], [13, 12]],
        ),
        // The restroom in the lobby's corner.
        [[13, 11, 'wall'], [14, 11, 'wall'], [15, 11, 'wall'], [13, 13, 'wall']],
      ),
    restrooms: [[14, 12, 15, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    windowless: ['ycBandCorner'],
    objects: [
      // The 체육활동실: two ping-pong tables, the mats, chairs along the wall.
      o('pingpongTable', 3, 3), o('pingpongTable', 8, 3), o('activityMat', 3, 6), o('activityMat', 8, 6), o('diningChair', 8, 8, 'up'), o('diningChair', 9, 8, 'up'), o('diningChair', 10, 8, 'up'), o('plant', 2, 2), o('plant', 11, 2),
      // The 밴드실: the drum kit and the amps, the piano.
      o('ycBandCorner', 13, 2), o('piano', 13, 5), o('plant', 13, 8),
      // The two 상담실: a sofa and an armchair facing it, the counsellor's desk in the corner.
      o('plant', 20, 2), o('armchair', 21, 2), o('youthCounselDesk', 23, 2), o('sofa', 21, 4, 'up'),
      o('plant', 20, 8), o('armchair', 21, 6), o('youthCounselDesk', 23, 6), o('sofa', 21, 8, 'up'),
      // The lobby: the 안내 데스크 facing the door, the 동아리 board, the study corner, the sofa; the restroom.
      o('ycSignupDesk', 10, 10), o('ycClubBoard', 2, 10), o('ycStudyNook', 7, 12, 'up'), o('sofa', 4, 13, 'up'), o('plant', 8, 10),
      o('toilet', 15, 12, 'left'), o('sink', 15, 13, 'left'),
      // The 청소년지도사 office: the programme desks, the files, the coffee.
      o('programDesk', 21, 10), o('programDesk', 22, 10), o('programDesk', 23, 10), o('archiveShelf', 23, 13, 'up'), o('coffeeMaker', 17, 13, 'up'), o('whiteboard', 19, 13, 'up'),
      o('youthBus', 15, 15),
    ],
    coworkers: crew(['강다온 관장', '서해솔 지도사', '여름빛 상담사'], ['#ef6c00', '#ffa726', '#7e57c2']),
    clients: [{ noun: '청소년', socials: ['mentorTeen', 'cheerTeam'], spots: [[8, 7], [10, 7], [4, 12], [5, 12], [22, 3]], max: 3, every: 40, patience: 120, age: 'teen' }],
    alarm: { notice: '🏕️ 캠프 출발 시간이에요! 수련관 버스로 가세요', done: '🏕️ 캠프를 즐겁게 마치고 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 출발이 늦어 다른 지도사가 인솔했어요 (성과 감소)', interaction: 'leadCamp', every: [200, 320], window: 40 },
    tasks: [task('activity', '체육 활동 지도', ['leadActivity', 'playPingPong'], 2), task('plan', '프로그램 기획 · 안내', ['planProgram', 'ycPostClubs', 'ycRegisterProgram']), task('youth', '청소년 만나기', ['mentorTeen', 'cheerTeam', 'ycStudySupport'])],
    extra: [task('counsel', '청소년 상담', ['counselYouth']), task('music', '밴드 동아리 지도', ['playPiano', 'ycCoachBand']), task('camp', '캠프 인솔', ['leadCamp']), boss('관장님께 프로그램 보고')],
    work: ['leadActivity', 'playPingPong', 'planProgram', 'counselYouth', 'playPiano', 'leadCamp', 'mentorTeen', 'cheerTeam', 'ycPostClubs', 'ycRegisterProgram', 'ycStudySupport', 'ycCoachBand'],
    skill: 'charisma',
    floors: { wood: 'oakWood', carpet: 'lilacCarpet', tile: 'creamTile' },
    wall: 'redBrick',
  },
  physicalTherapist: {
    careerId: 'physicalTherapist',
    name: '재활센터',
    icon: '🦵',
    // A 재활의학과 의원's floor on the street (2026-11-05, the layout audit, replacing a building on a lawn with three beds, the bars,
    // the treadmills and the balls all in one hall, no front desk and no changing room). As a real one, it is two rooms: in from the
    // pavement (the ramp, the sign) to the front desk where the patient checks in and pays, the waiting seats and the wheelchair;
    // the changing room to put on the 치료복 and the restroom off the waiting room. Through one door the 물리치료실: seven beds in
    // two rows, a curtain between each, the hot-pack heater at the end of the row and the ultrasound / 간섭파 corner, where the
    // hot pack, the electric and the manual therapy are done out of the next patient's sight. Through the other the 운동치료실: the
    // stall bars with the bands, the parallel bars, the treadmills, the balls, the training stairs and the mat table, open so the
    // therapist can see everyone. Off it, the therapists' office (the case board, the skeleton, the desks).
    tiles: () =>
      building(
        [[2, 2, 11, 7, 'tile'], [13, 2, 23, 7, 'wood'], [2, 9, 14, 13, 'wood'], [16, 9, 18, 10, 'tile'], [16, 12, 17, 13, 'tile'], [20, 9, 23, 13, 'carpet']],
        [[12, 14], [9, 8], [14, 8], [12, 4], [15, 9], [15, 12], [21, 8]],
      ),
    restrooms: [[16, 12, 17, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The 물리치료실: two rows of beds, a curtain between each; the hot-pack heater, the modality corner, the basin.
      o('ptHotPack', 2, 2), o('therapyTable', 3, 2), o('ptCurtain', 4, 2), o('therapyTable', 5, 2), o('ptCurtain', 6, 2), o('therapyTable', 7, 2), o('ptCurtain', 8, 2), o('therapyTable', 9, 2), o('ptModality', 10, 2),
      o('therapyTable', 3, 6, 'up'), o('ptCurtain', 4, 6), o('therapyTable', 5, 6, 'up'), o('ptCurtain', 6, 6), o('therapyTable', 7, 6, 'up'), o('nsHandSink', 11, 7, 'up'), o('plant', 2, 7),
      // The 운동치료실: the stall bars, the parallel bars, the treadmills, a ball; the balls and the stairs along the front, the mat table.
      o('ptStallBars', 13, 2), o('parallelBars', 16, 2), o('treadmill', 19, 2), o('treadmill', 20, 2), o('exerciseBall', 22, 2),
      o('exerciseBall', 15, 7, 'up'), o('ptStairs', 17, 7, 'up'), o('therapyTable', 23, 6, 'up'),
      // The waiting room: the front desk, the seats, the wheelchair.
      o('drReception', 10, 9), o('cwWheelchair', 2, 9), o('posterPop', 5, 9),
      o('drWaitSeat', 2, 13, 'up'), o('drWaitSeat', 3, 13, 'up'), o('drWaitSeat', 4, 13, 'up'), o('drWaitSeat', 5, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 8, 13, 'up'), o('plant', 14, 13),
      // The changing room; the patients' restroom.
      o('clsLockers', 17, 9), o('diningChair', 18, 10, 'left'),
      o('toilet', 17, 12, 'left'), o('sink', 17, 13, 'left'),
      // The therapists' office: the case board, the skeleton, the desks, the fridge and the coffee.
      o('whiteboard', 22, 9), o('officeDesk', 20, 12, 'right'), o('officeDesk', 20, 13, 'right'), o('fridge', 23, 11, 'left'), o('coffeeMaker', 23, 12, 'left'), o('ptSkeleton', 23, 13),
      // The sign on the pavement.
      o('ptStreetSign', 14, 15),
    ],
    coworkers: crew(['류재활 센터장', '배근육 물리치료사', '노관절 물리치료사'], ['#00838f', '#26a69a', '#4db6ac']),
    // By the beds, at the bars, in the waiting room.
    clients: [{ noun: '재활 환자', socials: ['assessPatient', 'motivatePatient'], spots: [[4, 4], [8, 4], [18, 4], [4, 12], [6, 12]], max: 2, every: 45, patience: 150 }],
    alarm: { notice: '🚑 수술 직후 환자의 재활 의뢰가 왔어요! 치료 베드로 가세요', done: '🦵 첫 재활을 잘 마쳤어요! 성과가 크게 올라요', missed: '⌛ 치료가 늦어져 다른 치료사가 맡았어요 (성과 감소)', interaction: 'urgentRehab', every: [180, 300], window: 40 },
    tasks: [task('manual', '도수 치료', ['manualTherapy'], 2), task('exercise', '운동 치료 지도', ['guideExercise', 'walkTraining', 'ptBandExercise', 'ptStairTraining']), task('patients', '환자 평가', ['assessPatient', 'motivatePatient'])],
    extra: [task('heat', '온열 · 전기 치료', ['applyHeatPack', 'ptPrepHotPack', 'ptUltrasound', 'ptIct']), task('meeting', '치료 회의', ['attendMeeting']), task('rehab', '수술 후 재활', ['urgentRehab']), boss('센터장님께 경과 보고')],
    work: ['manualTherapy', 'applyHeatPack', 'urgentRehab', 'guideExercise', 'walkTraining', 'workout', 'attendMeeting', 'assessPatient', 'motivatePatient', 'ptBandExercise', 'ptStairTraining', 'ptUltrasound', 'ptIct', 'ptPrepHotPack'],
    skill: 'fitness',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  occupationalTherapist: {
    careerId: 'occupationalTherapist',
    name: '작업치료실',
    icon: '🧩',
    // The 작업치료실 of a rehabilitation hospital (2026-11-05, the layout audit, replacing a building on a lawn with one room where
    // the children's sensory mats and the adults' kitchen and splint table were all mixed, no front desk and the only toilet in
    // the staff room). As in a real one the adults and the children are seen apart. From the street (the hospital's sign), the
    // waiting room with the front desk, room for wheelchairs and the wide accessible restroom. The adults' treatment room: the
    // hand-function tables with the patient across from the therapist, the splint table, the cognitive table, the mirror box,
    // the assessment cupboard; through it the ADL room, a kitchen and a bedroom-and-bathroom set where getting home again is
    // practised, a table to eat at and a wheelchair. The children's sensory integration room (the swing, the mats, the blocks)
    // is through the observation and parents' counselling room, where a parent watches and hears how it went; the therapists'
    // office with the case desks is off that.
    tiles: () =>
      building(
        [
          [2, 2, 10, 7, 'tile'], [12, 2, 16, 7, 'tile'], [18, 2, 23, 7, 'carpet'], [2, 9, 15, 13, 'wood'],
          [17, 9, 19, 10, 'carpet'], [17, 12, 19, 13, 'tile'], [21, 9, 23, 13, 'wood'],
        ],
        [[12, 14], [6, 8], [14, 8], [11, 5], [16, 9], [18, 8], [16, 12], [20, 9]],
      ),
    restrooms: [[17, 12, 19, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The adults' room: the hand tables with the patient's chairs across, the splint table, the cognitive table, the mirror box, the assessment cupboard.
      o('otAssessCabinet', 2, 2), o('fineMotorTable', 3, 4), o('diningChair', 3, 3), o('diningChair', 4, 3), o('otSplintTable', 7, 4), o('diningChair', 7, 3), o('fineMotorTable', 9, 4), o('diningChair', 9, 3),
      o('otCognitiveTable', 3, 7, 'up'), o('otMirrorBox', 8, 7, 'up'), o('plant', 10, 7),
      // The ADL room: the kitchen, the bedroom-and-bathroom set, a table to eat at, the wheelchair.
      o('adaptiveKitchen', 12, 2), o('otAdlRoom', 15, 2), o('diningTable', 15, 6), o('diningChair', 14, 6, 'right'), o('cwWheelchair', 12, 7),
      // The children's sensory integration room: the swing, the mats, the blocks, the toys.
      o('bsSwing', 19, 2), o('toyBox', 23, 2), o('sensoryMat', 21, 4), o('blockMat', 19, 6), o('plant', 23, 7),
      // The waiting room: the front desk, the wheelchair, the seats.
      o('drReception', 9, 9), o('cwWheelchair', 2, 9), o('posterPop', 4, 9),
      o('drWaitSeat', 3, 13, 'up'), o('drWaitSeat', 4, 13, 'up'), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('drWaitSeat', 10, 13, 'up'),
      o('toyBox', 2, 13, 'up'), o('bookshelf', 15, 11, 'left'), o('plant', 15, 13),
      // The observation and parents' counselling room.
      o('diningTable', 18, 10), o('diningChair', 17, 10, 'right'),
      // The accessible restroom.
      o('toilet', 19, 12, 'left'), o('sink', 19, 13, 'left'),
      // The therapists' office.
      o('caseDesk', 22, 9), o('caseDesk', 23, 9), o('bookshelf', 23, 12, 'left'), o('coffeeMaker', 21, 13, 'up'), o('fridge', 23, 13, 'left'),
      // The hospital's sign on the pavement.
      o('otStreetSign', 14, 15),
    ],
    coworkers: crew(['석다솜 실장', '예하람 작업치료사', '진소리 작업치료사'], ['#f57c00', '#ffb74d', '#ffe0b2']),
    // By the hand tables, and in the waiting room.
    clients: [{ noun: '환자·보호자', socials: ['teachAdaptive', 'motivatePatient'], spots: [[5, 3], [8, 3], [4, 12], [6, 12]], max: 2, every: 50, patience: 150 }],
    alarm: { notice: '🧩 급한 발달 평가 의뢰가 들어왔어요! 손 기능 훈련 테이블로 가세요', done: '🧩 평가를 꼼꼼히 마쳤어요! 성과가 크게 올라요', missed: '⌛ 평가가 늦어 보호자가 다음 날로 미뤘어요 (성과 감소)', interaction: 'urgentAssessment', every: [180, 300], window: 45 },
    tasks: [task('hand', '손 기능 훈련', ['handTraining', 'otMakeSplint', 'otMirrorTherapy'], 2), task('daily', '일상생활 훈련', ['dailySkills', 'otAdlTransfer']), task('clients', '보조 도구 교육', ['teachAdaptive', 'motivatePatient'])],
    extra: [task('sensory', '감각 통합 치료', ['sensoryProgram']), task('play', '놀이 치료', ['buildBlocks']), task('cognitive', '인지 재활', ['otCognitive']), task('notes', '치료 기록 정리', ['writeCaseNote', 'otCheckTools']), boss('실장님께 경과 보고')],
    work: ['handTraining', 'urgentAssessment', 'dailySkills', 'sensoryProgram', 'buildBlocks', 'manageCase', 'writeCaseNote', 'teachAdaptive', 'motivatePatient', 'otMakeSplint', 'otMirrorTherapy', 'otAdlTransfer', 'otCognitive', 'otCheckTools'],
    skill: 'handiness',
    floors: { carpet: 'sageCarpet', tile: 'creamTile', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  labTechnician: {
    careerId: 'labTechnician',
    windowless: ['analyzerMachine'],
    name: '진단검사센터',
    icon: '🧪',
    // A laboratory medicine department (2026-11-04, the layout audit, replacing blood drawn on dining chairs in an office lobby):
    // at the front the outpatients' 채혈실, a row of draw desks with the patient's seat at each, the number board and the waiting
    // seats; behind it, through one controlled door with its rules posted, the lab: the automated line of analysers along the
    // back wall, the reagent store, the centrifuge and the aliquoting bench, the slide microscopes and the verification desk,
    // the sample hatch from the draw room; off it microbiology (the culture incubator, its microscopes, the infectious waste)
    // and the blood bank (its fridges). The office with the records and the staff restroom beside the draw room.
    tiles: () =>
      patch(
        building(
          [[2, 2, 14, 7, 'tile'], [16, 2, 23, 4, 'tile'], [16, 6, 23, 7, 'tile'], [2, 9, 13, 13, 'carpet'], [15, 9, 23, 13, 'wood']],
          [[15, 3], [15, 6], [13, 8], [14, 12], [12, 14]],
        ),
        [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
      ),
    restrooms: [[22, 12, 23, 13]],
    objects: [
      // The lab: the automated line, reagents, centrifuge, aliquoting along the back; the microscopes and the verification desk an island in the middle; the sample hatch.
      o('analyzerMachine', 2, 2), o('analyzerMachine', 4, 2), o('analyzerMachine', 6, 2), o('ltReagentStore', 8, 2), o('centrifugeUnit', 10, 2), o('ltPipetteBench', 11, 2),
      o('microscopeBench', 3, 4), o('microscopeBench', 4, 4), o('ltVerifyDesk', 7, 4), o('ltReception', 11, 7, 'up'), o('ltLabSign', 14, 7, 'left'),
      // Microbiology; the blood bank.
      o('ltIncubator', 16, 2), o('microscopeBench', 19, 2), o('microscopeBench', 20, 2), o('ltBioBin', 23, 2),
      o('sampleFridge', 17, 6), o('sampleFridge', 18, 6), o('sampleFridge', 19, 6), o('centrifugeUnit', 21, 6),
      // The draw room: three desks, each with its patient's seat; the number board; the waiting seats.
      o('ltDrawDesk', 3, 10), o('drWaitSeat', 3, 11, 'up'), o('ltDrawDesk', 5, 10), o('drWaitSeat', 5, 11, 'up'), o('ltDrawDesk', 8, 10), o('drWaitSeat', 8, 11, 'up'),
      o('drQueueBoard', 10, 9), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('drWaitSeat', 10, 13, 'up'), o('drWaitSeat', 11, 13, 'up'),
      // The office: desks, the records, a sofa and the coffee.
      o('officeDesk', 16, 9), o('officeDesk', 18, 9), o('archiveShelf', 20, 9), o('archiveShelf', 21, 9), o('coffeeMaker', 15, 13, 'up'), o('sofa', 17, 13, 'up'), o('plant', 23, 9),
      o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
    ],
    coworkers: crew(['안정밀 실장', '도혈청 임상병리사', '김세포 임상병리사'], ['#5e35b1', '#7e57c2', '#b39ddb']),
    // Each at a draw desk's seat.
    clients: [{ noun: '채혈 환자', socials: ['drawBlood', 'explainResults'], spots: [[3, 12], [5, 12], [8, 12]], max: 2, every: 40, patience: 100 }],
    alarm: { notice: '🩸 응급실 긴급 검체가 도착했어요! 자동 분석기로 가세요', done: '⚡ 10분 만에 결과를 냈어요! 성과가 크게 올라요', missed: '⌛ 결과가 늦어 응급실이 다시 독촉했어요 (성과 감소)', interaction: 'statSample', every: [180, 300], window: 30 },
    tasks: [task('blood', '혈액 검사', ['runBloodTest'], 2), task('slides', '슬라이드 판독', ['examineSlides']), task('patients', '채혈·검사 안내', ['drawBlood', 'explainResults'])],
    extra: [task('spin', '검체 원심분리', ['spinSamples']), task('samples', '검체 정리', ['organizeSamples']), task('reception', '검체 접수', ['ltReceive', 'ltLabelCheck']), task('pipette', '검체 분주', ['ltPipette']), task('culture', '혈액 배양 확인', ['ltCulture']), task('reagent', '시약 관리', ['ltReagent']), task('verify', '결과 확인·위험 수치 보고', ['ltVerify', 'ltCritical']), task('waste', '폐기물 처리', ['ltDispose']), task('report', '검사 보고서 작성', ['writeReport']), boss('실장님께 결과 보고')],
    work: ['runBloodTest', 'statSample', 'examineSlides', 'spinSamples', 'organizeSamples', 'ltReceive', 'ltLabelCheck', 'ltPipette', 'ltCulture', 'ltReagent', 'ltVerify', 'ltCritical', 'ltDispose', 'writeReport', 'readArchive', 'drawBlood', 'explainResults'],
    skill: 'logic',
    floors: { tile: 'monoTile', carpet: 'creamTile', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  radiographer: {
    careerId: 'radiographer',
    windowless: ['xrayMachine', 'ctScanner', 'mriScanner', 'linacMachine'],
    name: '영상의학센터',
    icon: '☢️',
    // A radiology department in its three bands (2026-11-04, the layout audit, replacing one imaging room with everything in it):
    // the patients' corridor along the front with the waiting bench, the changing booth and the restroom; a row of scan rooms
    // each walled on its own (two X-ray rooms, the CT with its injector, the MRI behind its screening room, where metal comes
    // off before zone IV), a door to each from both sides; behind them the staff corridor, its consoles against the lead-glass
    // wall of the room each runs (one between the two X-ray rooms) and the reading desks. Radiotherapy is another department in
    // a real hospital; here it keeps its own shielded wing at the east end, the linac reached through a maze passage from its
    // control room, as a bunker is built (the workFurniture/radiographer.ts pieces, 2026-10-27).
    tiles: () =>
      patch(
        building(
          [
            [2, 2, 18, 3, 'tile'], [2, 5, 4, 8, 'tile'], [6, 5, 8, 8, 'tile'], [10, 5, 13, 8, 'tile'], [15, 5, 18, 8, 'tile'], [2, 10, 18, 13, 'tile'],
            [20, 2, 23, 6, 'carpet'], [23, 8, 23, 13, 'carpet'], [20, 8, 21, 13, 'tile'],
          ],
          [[2, 4], [8, 4], [10, 4], [15, 4], [3, 9], [7, 9], [11, 9], [17, 9], [23, 7], [22, 13], [19, 13], [12, 14]],
        ),
        [
          // The MRI's screening room off the patients' corridor; the restroom in the corner.
          [14, 10, 'wall'], [14, 11, 'wall'], [15, 12, 'wall'], [16, 12, 'door'], [17, 12, 'wall'], [18, 12, 'wall'],
          [2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door'],
        ],
      ),
    restrooms: [[2, 12, 3, 13]],
    objects: [
      // The staff corridor: the reading desk, the X-ray rooms' console between them, the CT's and the MRI's, the radiologist's desks.
      o('xrayViewer', 3, 3, 'up'), o('rgControlDesk', 5, 3, 'up'), o('rgControlDesk', 11, 3, 'up'), o('officeDesk', 13, 3, 'up'), o('rgControlDesk', 16, 3, 'up'), o('officeDesk', 18, 3, 'up'),
      // The scan rooms.
      o('xrayMachine', 3, 5), o('rgApronRack', 2, 8, 'up'),
      o('xrayMachine', 6, 5), o('rgApronRack', 8, 8, 'up'),
      o('ctScanner', 11, 5), o('rgInjector', 13, 5),
      o('mriScanner', 16, 5),
      o('rgChangeBooth', 15, 10), o('rgWarnSign', 18, 10),
      // The patients' corridor.
      o('rgChangeBooth', 5, 10), o('rgWarnSign', 2, 10), o('rgWarnSign', 10, 10), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 8, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('drWaitSeat', 10, 13, 'up'), o('officeDesk', 12, 10), o('plant', 13, 10),
      o('toilet', 2, 12, 'right'), o('sink', 2, 13, 'right'),
      // The bunker: the linac; its control room with the console and a changing booth.
      o('linacMachine', 21, 3), o('rgControlDesk', 20, 8), o('rgChangeBooth', 20, 10, 'right'),
    ],
    coworkers: crew(['채영상 실장', '구단층 방사선사', '서자기 방사선사'], ['#37474f', '#546e7a', '#78909c']),
    clients: [{ noun: '촬영 환자', socials: ['positionPatient', 'calmPatient'], spots: [[6, 12], [8, 12], [10, 12]], max: 2, every: 45, patience: 120 }],
    alarm: { notice: '🚨 응급 CT 요청이 들어왔어요! CT 스캐너로 가세요', done: '🌀 응급 CT를 바로 찍어 진단을 도왔어요! 성과가 크게 올라요', missed: '⌛ 촬영이 늦어 응급실이 다른 센터로 보냈어요 (성과 감소)', interaction: 'urgentScan', every: [180, 300], window: 30 },
    tasks: [task('xray', '엑스레이 촬영', ['takeXray'], 2), task('ct', 'CT·MRI 촬영', ['runCtScan', 'runMriScan']), task('patients', '환자 촬영 준비', ['positionPatient', 'calmPatient'])],
    // Radiotherapy is the 방사선 치료 branch's alone (2026-10-26, at the user's request).
    extra: [
      task('read', '영상 확인', ['readXray', 'rgReviewImages']), gated(task('therapy', '방사선 치료', ['radiationTherapy']), { branch: 1 }), task('report', '촬영 기록 정리', ['writeReport', 'rgDoseLog']), boss('실장님께 촬영 보고'),
      task('prep', '촬영실 준비', ['rgCheckAprons', 'rgLoadInjector', 'rgFoldGowns']),
    ],
    branchTasks: [undefined, [task('therapy', '방사선 치료', ['radiationTherapy'], 2), task('patients', '치료 환자 자세 잡기', ['positionPatient', 'calmPatient']), task('report', '치료 기록 정리', ['writeReport', 'rgDoseLog'])]],
    work: ['takeXray', 'runCtScan', 'runMriScan', 'urgentScan', 'radiationTherapy', 'readXray', 'writeReport', 'positionPatient', 'calmPatient', 'rgReviewImages', 'rgDoseLog', 'rgCheckAprons', 'rgLoadInjector', 'rgFoldGowns'],
    skill: 'logic',
    floors: { tile: 'monoTile', carpet: 'slateStone' },
    wall: 'navyWainscot',
  },
  paramedic: {
    careerId: 'paramedic',
    name: '119 안전센터',
    icon: '🚑',
    // A 119 안전센터 on its street (2026-11-04, the layout audit, replacing one hall of mixed kit and a dispatch room like the 종합상황실's,
    // the ambulance parked on the grass outside). The garage is the middle of the ground floor, open to the street: the ambulance and
    // the 펌프차 stand nose out in their bays and pull straight out under the rolled-up shutters (nothing parked on the apron). Round
    // it, each with its door onto the garage: the 감염관리실 by the ambulance (the washing and disinfecting sink, the kit shelves, the
    // oxygen, the spare cot, the washer for soiled uniforms); the office behind (the dispatch terminals the calls come in on from
    // the 종합상황실, the 구급 활동 일지 board); the 방화복 room; the training room (the CPR manikins); the stairs and the restroom.
    // The public come in at their own door, the 민원 현관, with its AED and seats. Upstairs, for the 24-hour shifts: the men's and
    // women's duty rooms, the showers, the 심신안정실, the kitchen-dining room and the gym.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 4, 9, 'tile'], [2, 11, 4, 13, 'tile'], [6, 2, 11, 4, 'wood'], [13, 2, 15, 4, 'tile'], [17, 2, 23, 8, 'wood'], [17, 10, 23, 10, 'tile'], [17, 11, 20, 13, 'tile'], [22, 12, 23, 13, 'tile']],
          [[5, 8], [3, 14], [5, 12], [7, 5], [14, 5], [16, 7], [16, 11], [21, 13]],
        ),
        // The garage: open ground under the floor above, open to the street (its front is a piece: the shutters rolled up).
        Array.from({ length: 10 * 9 }, (_, i): [number, number, 'grass'] => [6 + (i % 10), 6 + Math.floor(i / 10), 'grass']),
      ),
      ...upstairs(
        [[2, 2, 5, 7, 'wood'], [7, 2, 9, 7, 'wood'], [11, 2, 15, 7, 'tile'], [17, 2, 23, 7, 'carpet'], [2, 9, 9, 13, 'wood'], [11, 9, 15, 13, 'tile'], [17, 9, 23, 13, 'tile']],
        [[3, 8], [8, 8], [13, 8], [20, 8], [10, 11], [16, 11]],
      ),
    ],
    restrooms: [[22, 12, 23, 13]],
    ground: [[5, 5, 16, 14, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The garage: the ambulance by the 감염관리실, the pumper; the open front.
      o('ambulance', 8, 10, 'left'), o('pmPumper', 13, 9), o('pmBayFront', 6, 14),
      // The 감염관리실: the sink, the hand basin, the kit shelves, the oxygen, the spare cot, the washer and dryer.
      o('pmDeconSink', 2, 2), o('nsHandSink', 4, 2), o('medKitShelf', 2, 4, 'right'), o('medKitShelf', 2, 5, 'right'), o('pmOxygenRack', 2, 7, 'right'), o('pmStretcher', 4, 5, 'left'), o('pmLaundry', 2, 9, 'right'),
      // The 민원 현관: the seats, the public AED.
      o('drWaitSeat', 2, 11, 'right'), o('drWaitSeat', 2, 12, 'right'), o('pmAedCabinet', 4, 13, 'left'),
      // The office: the dispatch terminals, the run log board; the 방화복 room's lockers.
      o('plant', 6, 2), o('dispatchDesk', 8, 2), o('dispatchDesk', 9, 2), o('pmLogBoard', 10, 2),
      o('gearLocker', 13, 2), o('gearLocker', 14, 2), o('gearLocker', 15, 2),
      // The training room: the board, the manikins, the trainees' seats.
      o('whiteboard', 19, 2), o('cprManikin', 18, 5), o('cprManikin', 21, 5), o('drWaitSeat', 18, 7, 'up'), o('drWaitSeat', 19, 7, 'up'), o('drWaitSeat', 20, 7, 'up'), o('drWaitSeat', 21, 7, 'up'),
      // The stairs; the restroom.
      o('stairs', 17, 10, 'right'), o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // Upstairs: the duty rooms; the showers; the 심신안정실; the kitchen-dining room; the gym.
      up('bed', 2, 2), up('bed', 4, 2), up('bed', 7, 2), up('bed', 9, 2),
      up('shower', 11, 2), up('shower', 12, 2), up('sink', 15, 4, 'left'),
      up('sofa', 18, 2), up('sofa', 21, 2), up('plant', 23, 7),
      up('fridge', 2, 9), up('coffeeMaker', 4, 9), up('diningTable', 5, 11), up('diningChair', 5, 10), up('diningChair', 6, 10), up('diningChair', 5, 12, 'up'), up('diningChair', 6, 12, 'up'),
      up('treadmill', 11, 9), up('treadmill', 14, 9),
    ],
    coworkers: crew(['홍구조 센터장', '맹응급 구급대원', '하생명 구급대원'], ['#c62828', '#ef5350', '#ff8a80']),
    // In the 민원 현관, by its seats.
    clients: [{ noun: '시민', socials: ['teachCpr', 'checkVitalsCitizen'], spots: [[3, 11], [3, 12]], max: 2, every: 70, patience: 120 }],
    alarm: { notice: '🚨 심정지 환자 신고! 구급차로 출동하세요', done: '🚑 환자를 살려 병원에 무사히 이송했어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 센터 구급차가 갔어요 (성과 감소)', interaction: 'emergencyDispatch', every: [150, 240], window: 20 },
    tasks: [task('cpr', '심폐소생술 훈련', ['cprTraining'], 2), task('kit', '구급 장비 정비', ['restockMedKit', 'checkGear', 'pmOxygenCheck', 'pmAedCheck', 'pmCotCheck', 'pmDecon']), task('log', '출동 기록 정리', ['reviewDispatch', 'pmRunLog'])],
    extra: [task('citizens', '시민 응급처치 교육', ['teachCpr', 'checkVitalsCitizen']), task('fitness', '체력 단련', ['workout']), task('dispatch', '응급 출동', ['emergencyDispatch']), boss('센터장님께 출동 보고')],
    work: ['cprTraining', 'restockMedKit', 'checkGear', 'reviewDispatch', 'emergencyDispatch', 'workout', 'attendMeeting', 'teachCpr', 'checkVitalsCitizen', 'pmOxygenCheck', 'pmAedCheck', 'pmCotCheck', 'pmDecon', 'pmRunLog'],
    skill: 'fitness',
    floors: { tile: 'monoTile', wood: 'oakWood' },
    wall: 'redBrick',
  },
  koreanMedicine: {
    careerId: 'koreanMedicine',
    name: '한의원',
    icon: '🌿',
    // A 한의원 in a street-front unit (2026-11-05, the layout audit, replacing a building on a lawn where patients walked from a
    // corridor of chairs straight into one treatment room, past two pulse desks out in the open, three beds side by side with no
    // curtains, and the 탕전실 only through the treatment room). As a real one, a patient goes in this order: the front desk in the
    // waiting room (the 간호조무사 checks them in; the 대추차 while they wait on the sofas), the 원장's 진료실 behind its door (the
    // pulse desk, the patient's chair beside it, the 동의보감 shelf) for 진맥 and 문진, then through to the treatment room: six beds
    // in two rows, a curtain between each, an infrared lamp at each, the cupping and moxa cart and the basin; out to the waiting room
    // to pay. The 조제실·탕전실 is on the staff side, for the smell and the heat: the 약재장s, the pouch packer, the two 탕전기s and
    // the 약연·작두 seat, its door to the staff room (lockers, the table, the restroom). The patients' restroom is off the waiting room.
    tiles: () =>
      patch(
        building(
          [
            [2, 2, 5, 6, 'wood'], [7, 2, 17, 6, 'wood'], [19, 2, 23, 7, 'tile'], [2, 8, 13, 13, 'wood'],
            [15, 9, 16, 10, 'tile'], [18, 9, 23, 13, 'carpet'], [15, 12, 17, 13, 'carpet'],
          ],
          [[12, 14], [3, 7], [6, 4], [11, 7], [21, 8], [14, 9], [14, 12]],
        ),
        [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
      ),
    restrooms: [[22, 12, 23, 13], [15, 9, 16, 10]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The 원장's 진료실: the 동의보감 shelf, the pulse desk, the patient's chair beside it.
      o('kmDonguiShelf', 2, 2), o('pulseDesk', 3, 4), o('drWaitSeat', 4, 4, 'left'), o('plant', 2, 6),
      // The treatment room: six beds in two rows, a curtain between each, a lamp at each; the cupping cart and the basin.
      o('kmHeatLamp', 7, 2), o('acupunctureBed', 8, 2), o('ptCurtain', 9, 2), o('kmHeatLamp', 10, 2), o('acupunctureBed', 11, 2), o('ptCurtain', 12, 2),
      o('kmHeatLamp', 13, 2), o('acupunctureBed', 14, 2), o('ptCurtain', 15, 2), o('kmHeatLamp', 16, 2), o('acupunctureBed', 17, 2),
      o('acupunctureBed', 8, 5, 'up'), o('kmHeatLamp', 9, 6, 'up'), o('ptCurtain', 10, 5), o('acupunctureBed', 12, 5, 'up'), o('kmHeatLamp', 13, 6, 'up'), o('ptCurtain', 14, 5),
      o('kmCupCart', 15, 6, 'up'), o('nsHandSink', 17, 6, 'up'),
      // The 조제실·탕전실.
      o('herbCabinet', 19, 2), o('herbCabinet', 21, 2), o('kmPouchPacker', 23, 2), o('herbDecoctor', 19, 7, 'up'), o('herbDecoctor', 20, 7, 'up'), o('kmHerbGrinder', 22, 7, 'up'),
      // The waiting room: the front desk, the 대추차, the sofas.
      o('drReception', 8, 8), o('kmTeaStand', 2, 9, 'right'), o('sofa', 2, 12, 'right'), o('sofa', 6, 13, 'up'), o('sofa', 9, 13, 'up'), o('plant', 13, 13),
      // The patients' restroom.
      o('toilet', 16, 9, 'left'), o('sink', 16, 10, 'left'),
      // The staff room: the lockers, the coffee, the fridge, the table, a sofa; its restroom.
      o('clsLockers', 18, 9), o('coffeeMaker', 22, 9), o('fridge', 23, 9), o('diningTable', 19, 11), o('diningChair', 19, 12, 'up'), o('diningChair', 20, 12, 'up'), o('sofa', 16, 13, 'up'),
      o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
      // The sign on the pavement.
      o('kmStreetSign', 14, 15),
    ],
    coworkers: crew(['백초 원장', '송약초 한의사', '이맥 간호조무사'], ['#6d4c41', '#8d6e63', '#a1887f']),
    // In the 진료실, by the beds, in the waiting room.
    clients: [{ noun: '한의원 환자', socials: ['consultPatient', 'explainHerbal'], spots: [[4, 5], [9, 4], [15, 4], [4, 12], [8, 12]], max: 2, every: 45, patience: 150 }],
    alarm: { notice: '🤕 허리를 삐끗한 환자가 실려 왔어요! 침 치료 베드로 가세요', done: '🪡 침 몇 대에 환자가 허리를 폈어요! 성과가 크게 올라요', missed: '⌛ 치료가 늦어 환자가 다른 곳으로 갔어요 (성과 감소)', interaction: 'acuteBackPain', every: [180, 300], window: 40, minLevel: 1 },
    // The 한의대 실습생 neither needles nor makes up prescriptions: decocting and 문진 (2026-10-26, at the user's request).
    tasks: [
      gated(task('needle', '침 치료', ['acupuncture', 'cupping'], 2), { minLevel: 1 }, task('brew', '한약 달이기', ['brewHerbalMed'], 2)),
      task('pulse', '진맥', ['pulseDiagnosis']),
      gated(task('herbs', '한약 조제', ['prepareHerbs']), { minLevel: 1 }, task('consult', '문진 돕기', ['consultPatient'])),
    ],
    extra: [
      task('brew', '한약 달이기', ['brewHerbalMed']), task('patients', '환자 문진', ['consultPatient', 'explainHerbal']), gated(task('back', '급성 요통 치료', ['acuteBackPain']), { minLevel: 1 }), boss('원장님과 처방 검토'),
      task('room', '치료실 준비', ['kmHeatTherapy', 'kmPrepCups']), task('pack', '한약 파우치 포장', ['kmPackPouches']), task('herbwork', '약재 손질', ['kmCutHerbs', 'kmGrindHerbs']), task('classic', '동의보감 공부', ['kmReadDongui']), task('tea', '대기 환자 대추차 대접', ['kmServeTea']),
    ],
    work: ['acupuncture', 'cupping', 'acuteBackPain', 'pulseDiagnosis', 'prepareHerbs', 'brewHerbalMed', 'consultPatient', 'explainHerbal', 'kmHeatTherapy', 'kmPrepCups', 'kmPackPouches', 'kmCutHerbs', 'kmGrindHerbs', 'kmReadDongui', 'kmServeTea'],
    skill: 'logic',
    floors: { wood: 'walnutWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  dietitian: {
    careerId: 'dietitian',
    name: '단체급식실',
    icon: '🥗',
    // A school's 급식실 (2026-11-04, the layout audit, replacing one room where the 국솥s and the dietitian's desk stood beside three
    // four-seat tables, behind a lobby of waiting chairs, with no receiving, prep or washing room). A 급식실 is laid out for one-way
    // flow, its rooms walled apart against cross-contamination: food comes in at the back, is checked and stored, prepared, cooked,
    // served, eaten, and the trays go back to be washed. Here the delivery truck stands in the yard at the side, at the 검수실's door
    // (the inspection bench with its scale and thermometer, the shelves, the walk-in cold room); the 전처리실 (the washing sinks, the
    // prep bench); the 조리실 (three steam kettles, the 보존식 freezer, the prep islands, the hygiene station at the staff's door),
    // whose wall to the dining hall is the 배식대, the cooks behind it and the pupils' tray rail on the hall side, a pass at its end;
    // the dietitian's office and the cooks' changing room off the kitchen, the cooks coming in by their own door. The pupils come
    // straight in from the school at the hall's door, wash their hands, take a tray and queue; a slice of the hall's long tables;
    // the 퇴식구 in the hall's wall, and behind it the 세척실 with the conveyor dishwashers, its own door out to the yard for the waste.
    tiles: () =>
      patch(
        building(
          [[2, 2, 5, 3, 'carpet'], [2, 5, 5, 7, 'carpet'], [7, 2, 13, 7, 'tile'], [15, 2, 19, 4, 'tile'], [15, 6, 19, 7, 'tile'], [2, 9, 13, 13, 'wood'], [15, 9, 19, 13, 'tile']],
          [[6, 3], [1, 6], [6, 6], [20, 3], [17, 5], [14, 7], [17, 8], [20, 12], [12, 14]],
        ),
        [
          // The 배식대 in the kitchen's wall, the pass at its end.
          [8, 8, 'tile'], [9, 8, 'tile'], [10, 8, 'tile'], [11, 8, 'tile'], [12, 8, 'tile'],
          // The pupils' restroom in the hall's corner.
          [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall'], [2, 11, 'door'],
          // The delivery yard at the side.
          ...Array.from({ length: 4 * 14 }, (_, i): [number, number, 'grass'] => [21 + (i % 4), 1 + Math.floor(i / 4), 'grass']),
        ],
      ),
    restrooms: [[2, 12, 3, 13]],
    ground: [[21, 0, 25, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The dietitian's office: two desks with the month's menu over them, the files.
      o('menuDesk', 2, 2), o('menuDesk', 3, 2), o('archiveShelf', 4, 2), o('plant', 5, 2),
      // The cooks' changing room: the lockers, the table.
      o('gjLockers', 2, 5), o('gjLockers', 4, 5), o('diningTable', 3, 7), o('diningChair', 2, 7, 'right'), o('diningChair', 5, 7, 'left'),
      // The 조리실: three kettles, the 보존식 freezer, the hygiene station at the door, two prep islands; the 배식대 in the wall.
      o('bulkCooker', 7, 2), o('bulkCooker', 9, 2), o('bulkCooker', 11, 2), o('dtSampleFridge', 13, 2), o('hygieneStation', 7, 5, 'right'), o('prepCounter', 9, 5), o('prepCounter', 11, 5),
      o('servingLine', 8, 8, 'up'), o('servingLine', 10, 8, 'up'),
      // The 검수실 and store: the shelves, the inspection bench by the yard door, the cold room.
      o('foodStorage', 15, 2), o('foodStorage', 16, 2), o('foodStorage', 17, 2), o('dtInspectBench', 18, 2), o('dtColdRoom', 15, 4, 'up'), o('dtColdRoom', 16, 4, 'up'),
      // The 전처리실: the washing sinks, the prep bench.
      o('kitchenSink', 15, 6), o('kitchenSink', 16, 6), o('prepCounter', 18, 6),
      // The hall: two long tables; the 퇴식구 in the wall, the trays and spoons, the menu, the hand basin at the door; the restroom.
      o('dtMealTable', 5, 10, 'left'), o('dtMealTable', 5, 12, 'left'),
      o('diningChair', 6, 10, 'left'), o('diningChair', 6, 11, 'left'), o('diningChair', 6, 12, 'left'),
      o('dtMealTable', 9, 10, 'left'), o('dtMealTable', 9, 12, 'left'),
      o('diningChair', 8, 10, 'right'), o('diningChair', 8, 11, 'right'), o('diningChair', 8, 12, 'right'), o('diningChair', 10, 10, 'left'), o('diningChair', 10, 12, 'left'), o('diningChair', 10, 13, 'left'),
      o('dtTrayReturn', 13, 10, 'left'), o('dtTrayStand', 13, 12, 'left'), o('nsHandSink', 13, 13, 'left'), o('dtMenuSign', 13, 9, 'left'),
      o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'),
      // The 세척실: the dishwashers behind the 퇴식구, the sinks.
      o('dtDishwasher', 15, 10, 'right'), o('dtDishwasher', 18, 9), o('kitchenSink', 16, 13, 'up'), o('kitchenSink', 17, 13, 'up'),
      // The yard: the delivery truck at the 검수실's door.
      o('dtSupplyTruck', 22, 2),
    ],
    coworkers: crew(['고급식 팀장', '반찬희 조리사', '나영양 영양사'], ['#689f38', '#9ccc65', '#c5e1a5']),
    // In the queue along the 배식대's tray rail.
    clients: [{ noun: '급식 이용자', socials: ['nutritionTalk', 'surveyMeal'], spots: [[8, 9], [9, 9], [10, 9], [11, 9]], max: 3, every: 40, patience: 100 }],
    alarm: { notice: '🧾 구청 위생 검사가 나왔어요! 위생 점검대로 가세요', done: '🧪 위생 검사 만점이에요! 성과가 크게 올라요', missed: '⌛ 준비가 늦어 지적 사항을 받았어요 (성과 감소)', interaction: 'hygieneInspection', every: [180, 300], window: 40 },
    tasks: [task('menu', '식단 짜기', ['planMenu']), task('cook', '조리 점검', ['checkCooking'], 2), task('serve', '배식 관리', ['superviseServing'])],
    extra: [
      task('nutrition', '영양 계산', ['calcNutrition']), task('stock', '식재료 검수', ['checkInventory', 'dtInspectDelivery']), task('diners', '이용자 상담', ['nutritionTalk', 'surveyMeal']), boss('팀장님께 급식 보고'),
      task('sample', '보존식 보관', ['dtKeepSample']), task('waste', '잔반량 조사', ['dtPlateWaste']), task('hygiene', '위생 점검', ['hygieneCheck', 'dtWashCheck']), task('post', '오늘의 메뉴 게시', ['dtPostMenu']),
    ],
    work: ['planMenu', 'calcNutrition', 'checkCooking', 'superviseServing', 'hygieneCheck', 'hygieneInspection', 'checkInventory', 'dtInspectDelivery', 'nutritionTalk', 'surveyMeal', 'dtKeepSample', 'dtPlateWaste', 'dtWashCheck', 'dtPostMenu'],
    skill: 'cooking',
    floors: { tile: 'creamTile', wood: 'oakWood', carpet: 'sageCarpet' },
    wall: 'creamPlain',
  },
  optician: {
    careerId: 'optician',
    name: '안경원',
    icon: '👓',
    // A 안경원 on the street, one unit of a row of shops (2026-11-05, the layout audit, replacing a building on a lawn entered through a
    // corridor of chairs, with three frame cases on the back wall of a big empty floor, the edgers among them and a 검안실 as big as
    // the shop). Through the glass front with its sign the shop is one room: frame cases along both side walls, the back wall and inside
    // the window, the frame table in the middle with its mirror, the try-on mirror; by the door the contact-lens counter that is the
    // till, the staff behind it, and the fitting table where frames are fitted, cleaned and talked over, the customer's chairs at it.
    // At the back, off the shop: the 검안실, small and dark, the refraction unit and the chart at its distance, the autorefractor; the
    // edging room behind glass that customers can watch, its two edgers and the lensometer; the staff room and the restroom.
    // The phone shop next door.
    tiles: () =>
      shopUnit(
        17,
        4,
        [[2, 5, 5, 7, 'carpet'], [7, 5, 10, 8, 'tile'], [12, 5, 13, 7, 'tile'], [15, 6, 16, 7, 'tile'], [2, 9, 16, 13, 'wood']],
        [[3, 8], [12, 8], [14, 7], [12, 14]],
      ),
    restrooms: [[15, 6, 16, 7]],
    windowless: ['eyeTestChart'],
    ground: [[0, 0, 25, 3, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The 검안실; the edging room and its glass; the staff room; the restroom.
      o('eyeTestChart', 2, 5), o('opAutoRefractor', 5, 5),
      o('lensEdger', 7, 5), o('lensEdger', 8, 5), o('opLensMeter', 9, 5), o('opGlassWall', 7, 8), o('opGlassWall', 8, 8), o('opGlassWall', 9, 8),
      o('gjLockers', 12, 5, 'right'), o('coffeeMaker', 13, 5),
      o('toilet', 16, 6, 'left'), o('sink', 16, 7, 'left'),
      // The shop: frame cases round the walls and in the window, the frame table, the mirror; the contact-lens counter and the
      // fitting table by the door.
      o('frameDisplay', 2, 9, 'right'), o('opLensBoard', 2, 11, 'right'), o('plant', 2, 13),
      o('frameDisplay', 4, 9), o('opTryMirror', 6, 9), o('frameDisplay', 13, 9), o('frameDisplay', 16, 9, 'left'), o('frameDisplay', 16, 11, 'left'), o('plant', 16, 13),
      o('opFrameTable', 8, 10), o('opContactCounter', 14, 11, 'right'),
      o('fittingTable', 8, 12, 'up'), o('diningChair', 8, 13, 'up'), o('diningChair', 9, 13, 'up'), o('opUltraCleaner', 10, 12, 'up'),
      // In the window a low table of frames seen from the pavement, not a frame wall with its back to the glass (2026-11-06).
      o('opFrameTable', 4, 13, 'up'),
      // The street: the front; the phone shop next door.
      o('opShopFront', 1, 15), o('opNeighbor', 18, 5),
    ],
    coworkers: crew(['유선명 원장', '안렌즈 안경사', '정시력 안경사'], ['#3949ab', '#5c6bc0', '#9fa8da']),
    clients: [{ noun: '안경원 손님', socials: ['recommendFrames', 'teachLensCare'], spots: [[3, 10], [6, 10], [13, 11], [7, 13]], max: 2, every: 40, patience: 120 }],
    alarm: { notice: '👓 안경이 부러진 손님이 급하게 왔어요! 렌즈 가공기로 가세요', done: '👓 30분 만에 새 안경을 맞춰 드렸어요! 성과가 크게 올라요', missed: '⌛ 너무 오래 걸려 손님이 내일 오기로 했어요 (성과 감소)', interaction: 'rushGlasses', every: [180, 300], window: 40 },
    tasks: [task('exam', '시력 검사', ['eyeExam'], 2), task('lens', '렌즈 가공', ['cutLenses']), task('customers', '손님 응대', ['recommendFrames', 'teachLensCare'])],
    extra: [
      task('fit', '안경 피팅', ['adjustFrames', 'opCleanGlasses']), task('display', '안경테 진열', ['arrangeFrames', 'opTryFrames']), task('rush', '급한 안경 제작', ['rushGlasses']), boss('원장님께 매출 보고'),
      task('pretest', '사전 검사', ['opAutoRefract', 'opReadLens']), task('contacts', '콘택트렌즈 관리', ['opFitContacts', 'opStockContacts']),
    ],
    work: ['eyeExam', 'cutLenses', 'rushGlasses', 'adjustFrames', 'arrangeFrames', 'recommendFrames', 'teachLensCare', 'opAutoRefract', 'opReadLens', 'opFitContacts', 'opStockContacts', 'opTryFrames', 'opCleanGlasses'],
    skill: 'handiness',
    floors: { wood: 'oakWood', carpet: 'slateStone', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  academyTutor: {
    careerId: 'academyTutor',
    name: '입시학원',
    icon: '📚',
    // Two floors of a 상가 on the 학원가 street (2026-11-05, the layout audit, replacing a building on a lawn with one lecture room,
    // the 강사실, the 자습실 and the 인강 studio all in one room and the 상담 table open in the lobby). As a real 입시학원: in off the
    // pavement (the A-frame sign) to the 안내 데스크 where the desk staff greet pupils and parents, the D-day 성적 게시판, the 교재
    // shelf, the stairs and the restroom; a corridor along the floor with the small lecture rooms off it, one class each (the 교탁
    // between the boards, two-seat desks in rows); the 상담실 with its door, where parents hear the 배치표; the 강사실 (교무실) where
    // the 강사 mark, write the 교재 and print the 모의고사. Upstairs, past the phone lockers, the quiet 자습실 of partitioned carrels
    // with the supervisor's desk by its door; the soundproofed 인강 studio, no windows; two more lecture rooms for the 클리닉 classes.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 8, 6, 'carpet'], [10, 2, 16, 6, 'carpet'], [18, 2, 23, 6, 'carpet'], [2, 8, 23, 8, 'tile'], [9, 9, 16, 13, 'tile'], [2, 10, 7, 13, 'carpet'], [18, 10, 23, 13, 'wood']],
          [[5, 7], [13, 7], [21, 7], [5, 9], [20, 9], [12, 14], [15, 11]],
        ),
        // The restroom in the lobby's corner.
        [[14, 11, 'wall'], [16, 11, 'wall'], [14, 12, 'wall'], [14, 13, 'wall']],
      ),
      ...upstairs(
        [[2, 2, 12, 6, 'carpet'], [14, 2, 23, 6, 'carpet'], [2, 8, 23, 8, 'tile'], [9, 9, 16, 13, 'tile'], [2, 10, 7, 13, 'carpet'], [18, 10, 23, 13, 'carpet']],
        [[7, 7], [18, 7], [5, 9], [20, 9]],
      ),
    ],
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    windowless: ['atStudioBoard'],
    objects: [
      // Lecture room 1: the 교탁 between the boards, a row of two-seat desks facing them.
      o('atLectureBoard', 3, 2), o('lecturePodium', 5, 2), o('atLectureBoard', 6, 2),
      o('atLectureDesk', 2, 4), o('atLectureDesk', 4, 4), o('atLectureDesk', 6, 4),
      o('diningChair', 2, 5, 'up'), o('diningChair', 3, 5, 'up'), o('diningChair', 4, 5, 'up'), o('diningChair', 5, 5, 'up'), o('diningChair', 6, 5, 'up'), o('diningChair', 7, 5, 'up'),
      // Lecture room 2.
      o('atLectureBoard', 11, 2), o('lecturePodium', 13, 2), o('atLectureBoard', 14, 2),
      o('atLectureDesk', 10, 4), o('atLectureDesk', 12, 4), o('atLectureDesk', 14, 4),
      o('diningChair', 10, 5, 'up'), o('diningChair', 11, 5, 'up'), o('diningChair', 12, 5, 'up'), o('diningChair', 13, 5, 'up'), o('diningChair', 14, 5, 'up'), o('diningChair', 15, 5, 'up'),
      // Lecture room 3, a smaller class.
      o('atLectureBoard', 18, 2), o('lecturePodium', 20, 2), o('plant', 23, 2),
      o('atLectureDesk', 18, 4), o('atLectureDesk', 22, 4),
      o('diningChair', 18, 5, 'up'), o('diningChair', 19, 5, 'up'), o('diningChair', 22, 5, 'up'), o('diningChair', 23, 5, 'up'),
      // The corridor's ends.
      o('plant', 2, 8), o('salWaterCooler', 23, 8, 'left'),
      // The lobby: the 안내 데스크 facing the door, the D-day 성적 게시판, the 교재 shelf, the stairs up; the restroom.
      o('officeDesk', 11, 11), o('officeDesk', 13, 11), o('atDdayBoard', 16, 9, 'left'), o('atWorkbookShelf', 10, 13, 'up'), o('stairs', 9, 10, 'up'),
      o('toilet', 16, 12, 'left'), o('sink', 16, 13, 'left'),
      // The 상담실: the 상담 table, the parents' chairs, the 배치표 binders.
      o('atConsultTable', 5, 12, 'up'), o('diningChair', 4, 12, 'right'), o('diningChair', 4, 13, 'right'), o('archiveShelf', 2, 10), o('bookshelf', 3, 10), o('plant', 7, 10),
      // The 강사실: the 질문·첨삭 desks, the 기출 binders, the copier that prints the 모의고사.
      o('archiveShelf', 18, 10), o('bookshelf', 19, 10), o('atExamPrinter', 23, 10, 'left'),
      o('tutorDesk', 18, 12), o('tutorDesk', 19, 12), o('tutorDesk', 22, 12), o('tutorDesk', 23, 12), o('coffeeMaker', 21, 10),
      // On the pavement: the sign.
      o('atStreetSign', 10, 15),
      // Upstairs. The 자습실: carrels along the wall and back to back in the middle, the supervisor's desk by the door.
      up('atStudyCarrel', 2, 2), up('atStudyCarrel', 3, 2), up('atStudyCarrel', 4, 2), up('atStudyCarrel', 5, 2), up('atStudyCarrel', 6, 2), up('atStudyCarrel', 7, 2), up('atStudyCarrel', 8, 2), up('atStudyCarrel', 9, 2), up('atStudyCarrel', 10, 2), up('atStudyCarrel', 11, 2), up('atStudyCarrel', 12, 2),
      up('atStudyCarrel', 4, 4, 'up'), up('atStudyCarrel', 5, 4, 'up'), up('atStudyCarrel', 6, 4, 'up'), up('atStudyCarrel', 7, 4, 'up'), up('atStudyCarrel', 8, 4, 'up'), up('atStudyCarrel', 9, 4, 'up'), up('atStudyCarrel', 10, 4, 'up'),
      up('atStudyCarrel', 4, 5), up('atStudyCarrel', 5, 5), up('atStudyCarrel', 6, 5), up('atStudyCarrel', 8, 5), up('atStudyCarrel', 9, 5), up('atStudyCarrel', 10, 5),
      up('officeDesk', 2, 6, 'right'),
      // The 인강 studio: the 전자칠판, the camera with its lights, the editing desk.
      up('atStudioBoard', 17, 2), up('lectureCamera', 18, 5, 'up'), up('studioLight', 16, 5, 'up'), up('studioLight', 20, 5, 'up'), up('officeDesk', 23, 5, 'left'), up('archiveShelf', 14, 2), up('plant', 23, 2),
      // The hall: the phone lockers before the 자습실, the water, a bench.
      up('clsLockers', 12, 9), up('salWaterCooler', 16, 9, 'left'), up('rxWaitBench', 13, 13, 'up'), up('plant', 16, 13),
      // Two small rooms for the 클리닉 classes, a few pupils round a table before the board.
      up('atLectureBoard', 2, 10), up('lecturePodium', 4, 10), up('salMeetingTable', 3, 12), up('diningChair', 3, 13, 'up'), up('diningChair', 4, 13, 'up'), up('diningChair', 6, 12, 'left'),
      up('lecturePodium', 21, 10), up('atLectureBoard', 22, 10), up('salMeetingTable', 19, 12), up('diningChair', 19, 13, 'up'), up('diningChair', 20, 13, 'up'), up('diningChair', 22, 12, 'left'),
    ],
    coworkers: crew(['맹학구 원장', '조수학 강사', '윤국어 강사'], ['#283593', '#3949ab', '#7986cb']),
    clients: [
      { noun: '학생', socials: ['answerQuestion', 'praiseStudent'], spots: [[8, 5], [2, 6], [16, 5], [10, 6]], max: 3, every: 35, patience: 100, age: 'teen' },
      // Parents are seen in the 상담실.
      { noun: '학부모', socials: ['consultParent'], spots: [[3, 12], [3, 13]], max: 1, every: 120, patience: 90 },
    ],
    alarm: { notice: '📝 내일이 시험이라 학생들이 몰려와요! 교탁에서 특강하세요', done: '📝 특강 덕분에 학생들이 자신감을 얻었어요! 성과가 크게 올라요', missed: '⌛ 특강을 못 해 학생들이 실망했어요 (성과 감소)', interaction: 'examCramming', every: [150, 240], window: 40 },
    tasks: [task('lecture', '강의하기', ['lectureClass'], 2), task('grade', '첨삭하기', ['gradeEssays']), task('students', '질문 받아 주기', ['answerQuestion', 'praiseStudent'])],
    extra: [
      task('handouts', '교재 만들기', ['prepareHandouts']), task('online', '인강 촬영', ['recordLecture']), task('parents', '학부모 상담', ['consultParent', 'atAdmissionConsult']), boss('원장님과 커리큘럼 회의'),
      task('study', '자습실 관리', ['atSuperviseStudy']), task('mock', '모의고사 준비', ['atPrintExams', 'atPostScores']),
    ],
    work: ['lectureClass', 'examCramming', 'gradeEssays', 'prepareHandouts', 'recordLecture', 'readArchive', 'answerQuestion', 'praiseStudent', 'consultParent', 'atSuperviseStudy', 'atPrintExams', 'atPostScores', 'atAdmissionConsult'],
    skill: 'charisma',
    floors: { carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  kindergartenTeacher: {
    careerId: 'kindergartenTeacher',
    name: '유치원',
    icon: '🧸',
    // A 유치원 in its own building with its playground beside it (2026-11-05, the layout audit, replacing the hall plan's one big
    // classroom with everything in it, a music room, an adults' toilet behind the staff room, a corridor lobby of waiting chairs
    // and no playground). As a real one: the children come in at the 현관, take off their shoes at the name-labelled 신발장 and
    // have their temperature taken at the health desk while the parent hands them over; along the corridor the classes by age,
    // 햇살반 (만 5세) and 새싹반 (만 4세), each with its morning-circle board, its play corners and the mats laid out for the rest
    // after lunch, and the children's toilet between them (the low potties and basins, a stall for the teachers); the 유희실 that
    // is also the hall, with the stage for the 학예회, the piano, the safety corner and the slide; the 교무실 where the teachers
    // plan and parents are seen at the table. Out of the corridor's end the fenced playground: the climbing frame and slide,
    // the swings, the sandpit and the planters of the little garden, its gate to the street.
    tiles: () =>
      patch(
        building(
          [[2, 2, 7, 6, 'carpet'], [9, 2, 11, 6, 'tile'], [13, 2, 18, 6, 'carpet'], [2, 8, 18, 8, 'wood'], [2, 10, 8, 13, 'wood'], [10, 9, 12, 13, 'tile'], [14, 10, 18, 13, 'wood']],
          [[5, 7], [10, 7], [16, 7], [19, 8], [5, 9], [13, 11], [12, 14], [16, 13]],
        ),
        [
          // The staff restroom in the 교무실's corner.
          [16, 11, 'wall'], [17, 11, 'wall'], [18, 11, 'wall'], [16, 12, 'wall'],
          // The playground beside the building, open air inside its fence.
          ...Array.from({ length: 5 * 14 }, (_, i): [number, number, 'grass'] => [20 + (i % 5), 1 + Math.floor(i / 5), 'grass']),
        ],
      ),
    restrooms: [[17, 12, 18, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // 햇살반: the morning-circle board, the story corner, the craft table, the toys.
      o('kgNuriBoard', 2, 2), o('storyCorner', 5, 2), o('toyBox', 7, 2), o('craftTable', 2, 5), o('bookshelf', 7, 5, 'left'),
      // The children's toilet: the low basins, the potties behind their partition.
      o('ccKidSink', 9, 2, 'right'), o('ccToddlerToilet', 9, 4, 'right'), o('plant', 11, 2),
      // 새싹반: the block mat, the sand table, the nature desk, the rest mats.
      o('blockMat', 13, 2), o('toyBox', 15, 2), o('sandTable', 17, 2), o('kgNatureDesk', 13, 5), o('kgRestMats', 16, 4),
      // The 유희실: the 학예회 stage, the piano, the safety corner, the slide, the toys.
      o('recitalStage', 2, 10), o('piano', 7, 10), o('kgSafetyCorner', 2, 12, 'up'), o('ccSlide', 8, 12, 'up'), o('toyBox', 5, 13, 'up'),
      // The 현관: the health desk, the name-labelled 신발장.
      o('kgHealthDesk', 11, 10), o('kgCubbies', 10, 13, 'up'),
      // The 교무실: the teachers' desks, the sofa where parents are seen; the staff restroom.
      o('officeDesk', 14, 10), o('officeDesk', 18, 10, 'left'), o('sofa', 14, 12, 'right'),
      o('toilet', 18, 13, 'left'), o('sink', 18, 12, 'left'),
      // The playground inside its fence: the climbing frame and slide, the swings, the sandpit, the garden planters.
      o('ccPlayFence', 24, 1), o('ccPlayStructure', 21, 2), o('bsSwing', 21, 7), o('ccSandbox', 21, 10), o('planter', 23, 12), o('planter', 24, 12),
    ],
    coworkers: crew(['배꽃님 원장', '하솔 선생님', '이풀잎 선생님'], ['#f06292', '#ffb74d', '#81c784']),
    clients: [
      { noun: '어린이', socials: ['playWithChild', 'helpWashHands'], spots: [[4, 3], [15, 3], [22, 6], [4, 12]], max: 3, every: 40, patience: 120, age: 'child' },
      // Parents are seen in the 교무실.
      { noun: '학부모', socials: ['talkToParent'], spots: [[15, 12], [15, 13]], max: 1, every: 120, patience: 90 },
    ],
    alarm: { notice: '🎭 학예회 리허설 시간이에요! 학예회 무대로 가세요', done: '🎭 아이들이 율동을 완벽하게 해냈어요! 성과가 크게 올라요', missed: '⌛ 리허설에 늦어 순서가 엉켰어요 (성과 감소)', interaction: 'recitalRehearsal', every: [200, 320], window: 40 },
    tasks: [task('story', '동화·이야기 나누기', ['readStory', 'kgMorningCircle']), task('play', '놀이·탐구 수업', ['craftWithKids', 'buildBlocks', 'sandPlay', 'kgObserveNature'], 2), task('kids', '돌봄·안전 약속', ['playWithChild', 'helpWashHands', 'kgPracticeSafety'])],
    extra: [
      task('dance', '율동 지도', ['leadRecital']), task('music', '피아노 반주', ['playPiano']), task('parents', '학부모 상담', ['talkToParent']), boss('원장님께 하루 보고'),
      task('outdoor', '바깥 놀이 지도', ['ccWatchOutdoor', 'ccSandPlay', 'bsPushSwing', 'ccSpotSlide']), task('potty', '화장실 · 손 씻기 지도', ['ccWashHands', 'ccPottyHelp']),
    ],
    work: ['readStory', 'craftWithKids', 'buildBlocks', 'sandPlay', 'leadRecital', 'recitalRehearsal', 'playPiano', 'playWithChild', 'helpWashHands', 'talkToParent', 'kgMorningCircle', 'kgObserveNature', 'kgPracticeSafety', 'kgHealthLog', 'kgSetMats', 'ccWatchOutdoor', 'ccSandPlay', 'bsPushSwing', 'ccSpotSlide', 'ccWashHands', 'ccPottyHelp'],
    skill: 'charisma',
    floors: { carpet: 'lilacCarpet', wood: 'oakWood', tile: 'creamTile' },
    wall: 'lavenderStripes',
  },
  musicTeacher: {
    careerId: 'musicTeacher',
    name: '음악학원',
    icon: '🎹',
    // A neighbourhood 음악학원 in a two-storey 상가 on the street (2026-11-05, the layout audit, replacing a building on a lawn with
    // two grands, the theory class and the ensemble all in one open hall, two practice booths and a curtained recital stage). As a
    // real one, everything is played behind a closed door. Downstairs: the door off the pavement (the A-frame sign out front) into
    // the 원장's desk, the 신발장 and the parents' sofa, the 콩쿠르 case on the wall; off it the theory room (the 오선 board, the
    // pupils' desks in rows), the 원장's lesson room with the grand, and the stair hall with the score shelves. At the back the
    // ensemble room that is the academy's little recital space (a low stage corner, a few rows of chairs, the upright the
    // accompaniment is practised on, the rental strings), and the teachers' room with the restroom. Upstairs the corridor of ten
    // soundproofed practice rooms, an upright in each, and the second lesson room with its grand. The 발표회 itself is held in a hired hall.
    tiles: () => [
      ...patch(
        building(
          [[2, 9, 7, 13, 'wood'], [9, 9, 16, 13, 'tile'], [18, 9, 23, 13, 'wood'], [2, 2, 10, 7, 'wood'], [12, 2, 16, 7, 'tile'], [18, 2, 23, 7, 'carpet'], [22, 6, 23, 7, 'tile']],
          [[12, 14], [8, 11], [17, 11], [14, 8], [11, 4], [17, 6], [21, 6]],
        ),
        [[21, 5, 'wall'], [22, 5, 'wall'], [23, 5, 'wall'], [21, 7, 'wall']],
      ),
      ...patch(
        upstairs([[2, 2, 17, 7, 'wood'], [19, 2, 23, 7, 'wood']], [[18, 4]]),
        // Only the back half has a floor above; the front is the ground floor's roof.
        Array.from({ length: 24 * 6 }, (_, i): [number, number, 'void'] => [1 + (i % 24), 9 + Math.floor(i / 24), 'void']),
      ),
    ],
    restrooms: [[22, 6, 23, 7]],
    objects: [
      // The lobby: the 원장's desk, the notices, the 콩쿠르 case, the 신발장 by the door, the parents' sofa, the water.
      o('ygFrontDesk', 10, 9), o('posterPop', 9, 12, 'right'), o('mtTrophyShelf', 15, 9), o('mtShoeRack', 13, 13, 'up'), o('sofa', 16, 12, 'left'), o('salWaterCooler', 9, 13, 'right'),
      // The theory room: the 오선 board, two rows of desks facing it, the workbooks.
      o('mtTheoryBoard', 3, 9), o('bookshelf', 7, 9), o('plant', 6, 9),
      o('theoryDesk', 2, 11, 'up'), o('theoryDesk', 3, 11, 'up'), o('theoryDesk', 5, 11, 'up'), o('theoryDesk', 6, 11, 'up'),
      o('theoryDesk', 2, 13, 'up'), o('theoryDesk', 3, 13, 'up'), o('theoryDesk', 5, 13, 'up'), o('theoryDesk', 6, 13, 'up'),
      // The 원장's lesson room: the grand, the metronome stand, the scores, a sofa for a parent sitting in.
      o('lessonPiano', 19, 9), o('mtConductStand', 22, 9), o('bookshelf', 23, 9), o('sofa', 22, 13, 'up'), o('plant', 18, 13),
      // The ensemble room: the stage corner, the chairs facing it, the upright, the strings, the conductor's stand, the rental wall.
      o('mtRecitalCorner', 2, 2), o('piano', 6, 2), o('violin', 9, 2), o('guitar', 10, 2), o('mtConductStand', 6, 5),
      o('diningChair', 2, 5, 'up'), o('diningChair', 3, 5, 'up'), o('diningChair', 4, 5, 'up'), o('diningChair', 2, 7, 'up'), o('diningChair', 3, 7, 'up'), o('diningChair', 4, 7, 'up'),
      o('mtInstrumentWall', 7, 7, 'up'), o('plant', 10, 7),
      // The stair hall: the stairs, the score shelves.
      o('stairs', 16, 2, 'down'), o('archiveShelf', 12, 2), o('archiveShelf', 13, 2), o('plant', 12, 7),
      // The teachers' room and the restroom.
      o('officeDesk', 18, 2), o('officeDesk', 19, 2), o('archiveShelf', 20, 2), o('coffeeMaker', 22, 2), o('fridge', 23, 2), o('sofa', 18, 4, 'right'),
      o('toilet', 23, 6, 'left'), o('sink', 23, 7, 'left'),
      // On the pavement: the sign.
      o('mtStreetSign', 10, 15),
      // Upstairs. The practice corridor: ten rooms, an upright in each; the bench and the water at its end.
      up('mtPracticeRoom', 2, 2), up('mtPracticeRoom', 4, 2), up('mtPracticeRoom', 6, 2), up('mtPracticeRoom', 8, 2), up('mtPracticeRoom', 10, 2), up('mtPracticeRoom', 12, 2),
      up('mtPracticeRoom', 2, 6, 'up'), up('mtPracticeRoom', 4, 6, 'up'), up('mtPracticeRoom', 6, 6, 'up'), up('mtPracticeRoom', 8, 6, 'up'), up('mtPracticeRoom', 10, 6, 'up'),
      up('rxWaitBench', 12, 7, 'up'), up('salWaterCooler', 15, 7, 'up'), up('plant', 14, 2),
      // The second lesson room.
      up('lessonPiano', 20, 2), up('bookshelf', 23, 2), up('diningChair', 23, 6, 'left'), up('plant', 19, 7),
    ],
    coworkers: crew(['한음표 원장', '도레미 강사', '현소리 강사'], ['#4a148c', '#7b1fa2', '#ba68c8']),
    clients: [{ noun: '수강생', socials: ['praiseStudent', 'tuneInstrument'], spots: [[15, 12], [15, 13], [22, 12], [5, 7]], max: 2, every: 40, patience: 120 }],
    alarm: { notice: '🏆 콩쿠르를 앞둔 제자가 급히 레슨을 청했어요! 그랜드 피아노로 가세요', done: '🏆 제자가 자신감을 찾고 돌아갔어요! 성과가 크게 올라요', missed: '⌛ 레슨 시간을 놓쳐 제자가 아쉬워했어요 (성과 감소)', interaction: 'competitionLesson', every: [200, 320], window: 45 },
    tasks: [task('lesson', '피아노 레슨', ['giveLesson'], 2), task('theory', '음악 이론 수업', ['teachTheory', 'mtTheoryClass']), task('students', '수강생 응대', ['praiseStudent', 'tuneInstrument'])],
    extra: [
      task('violin', '바이올린 시범', ['playViolin']), task('guitar', '기타 시범', ['playGuitar']), task('practice', '개인 연습', ['playPiano', 'mtSoloPractice']), boss('원장님과 발표회 회의'),
      task('rooms', '연습실 순회', ['mtPracticeCheck']), task('ensemble', '합주 지휘', ['mtConductEnsemble']), task('strings', '악기 손질', ['mtStringCare']), task('recital', '발표회 사회', ['mtHostRecital']),
    ],
    work: ['giveLesson', 'competitionLesson', 'teachTheory', 'mtTheoryClass', 'playPiano', 'mtSoloPractice', 'mtPracticeCheck', 'mtConductEnsemble', 'mtStringCare', 'mtHostRecital', 'playViolin', 'playGuitar', 'praiseStudent', 'tuneInstrument'],
    skill: 'piano',
    floors: { wood: 'walnutWood', tile: 'creamTile', carpet: 'lilacCarpet' },
    wall: 'oakWainscot',
  },
  drivingInstructor: {
    careerId: 'drivingInstructor',
    name: '운전면허학원',
    icon: '🚗',
    // A 운전면허학원 (2026-11-05, the layout audit, replacing a lawn with a 5 × 9 course board on it, a box for the examiner and an
    // office like a living room): the yard is paved and fenced and the 장내 기능 course runs round it as a lane, driven in order —
    // 출발 on the south lane, up the west lane over the 경사로 (stop on the top, pull away), along the north lane's 가속 구간, down
    // the east lane through the signalled crossing to 종료; inside the loop the training cars in their bays and the T자·S자 pad
    // where parking is taught, the cones, and the road-test car waiting by the gate, so it turns out of its bay straight onto the
    // street on a 도로주행. Students wait under the shade at the start, by the route map and the 합격자 board. The building has two
    // floors: downstairs the 학과 classroom (the 의무 안전 교육, desks in rows before the board), the lobby with the 접수 counter,
    // the 학과시험 kiosk, the seats and the restroom; upstairs the 관제실 whose windows look over the course, where the examiner
    // watches and scores the test, the simulator room and the instructors' rest room.
    tiles: () => [
      ...patch(
        building([[18, 2, 23, 7, 'wood'], [18, 9, 23, 13, 'tile']], [[17, 10], [20, 8], [22, 14], [20, 12]]),
        [
          // The yard is open air up to the building's west wall.
          ...Array.from({ length: 16 * 14 }, (_, i): [number, number, 'grass'] => [1 + (i % 16), 1 + Math.floor(i / 16), 'grass']),
          // The restroom in the lobby's corner.
          [18, 11, 'wall'], [19, 11, 'wall'], [20, 11, 'wall'], [20, 13, 'wall'],
        ],
      ),
      ...patch(
        upstairs([[18, 2, 23, 6, 'carpet'], [22, 8, 23, 13, 'tile'], [18, 8, 20, 10, 'carpet'], [18, 12, 20, 13, 'wood']], [[22, 7], [21, 9], [21, 12]]),
        Array.from({ length: 16 * 14 }, (_, i): [number, number, 'void'] => [1 + (i % 16), 1 + Math.floor(i / 16), 'void']),
      ),
    ],
    restrooms: [[18, 12, 19, 13]],
    ground: [[0, 0, 16, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The yard: the fence, the course's lanes, the 경사로 on the west lane, the signal at the crossing.
      o('diYardFence', 0, 0), o('diCircuit', 1, 1), o('diHill', 1, 5), o('diTrafficLight', 13, 8, 'up'),
      // Inside the loop: the training cars in their bays, the T자·S자 pad, the cones; the road-test car by the gate.
      o('drivingCar', 3, 3), o('drivingCar', 8, 3), o('diCourse', 3, 5),
      o('trafficCone', 4, 9), o('trafficCone', 7, 9), o('trafficCone', 10, 9), o('roadTestCar', 13, 10),
      // By the start: the shaded bench, the route map, the 합격자 board; the equipment wall; the yard's lamps.
      o('diWaitShelter', 9, 13, 'up'), o('diRouteMap', 5, 13, 'up'), o('diPassBoard', 2, 13, 'up'), o('toolWall', 16, 2, 'left'), o('yaLamp', 0, 7), o('yaLamp', 16, 7),
      // The classroom: the board, the lectern, the desks in rows.
      o('whiteboard', 20, 2), o('clsLectern', 18, 2), o('plant', 23, 2),
      o('studentDesk', 18, 4, 'down'), o('studentDesk', 19, 4, 'down'), o('studentDesk', 21, 4, 'down'), o('studentDesk', 22, 4, 'down'), o('studentDesk', 23, 4, 'down'),
      o('studentDesk', 18, 6, 'down'), o('studentDesk', 19, 6, 'down'), o('studentDesk', 21, 6, 'down'), o('studentDesk', 22, 6, 'down'), o('studentDesk', 23, 6, 'down'),
      // The lobby: the 접수 counter, the kiosk, the seats, the stairs; the restroom.
      o('ygFrontDesk', 18, 9), o('diTestKiosk', 21, 9), o('plant', 22, 9), o('drWaitSeat', 21, 11, 'up'), o('drWaitSeat', 21, 13, 'up'), o('stairs', 23, 9, 'down'),
      o('toilet', 18, 12, 'right'), o('sink', 18, 13, 'right'),
      // Upstairs. The 관제실: the examiners' desks at the window over the course, the course plan, the head examiner's desk.
      up('diControlDesk', 18, 3, 'right'), up('diControlDesk', 18, 5, 'right'), up('whiteboard', 20, 2), up('archiveShelf', 23, 2), up('officeDesk', 23, 4, 'left'), up('plant', 23, 6),
      // The simulator room; the instructors' rest room; the hall.
      up('diSimulator', 18, 8), up('diSimulator', 18, 10, 'up'),
      up('coffeeMaker', 18, 12, 'right'), up('sofa', 18, 13, 'up'), up('fridge', 20, 13, 'up'),
      up('salWaterCooler', 23, 8, 'left'), up('archiveShelf', 23, 13, 'left'),
    ],
    coworkers: crew(['방안전 원장', '차바퀴 강사', '노신호 검정원'], ['#f9a825', '#fbc02d', '#1565c0']),
    clients: [{ noun: '수강생', socials: ['calmLearner', 'explainRules'], spots: [[8, 12], [10, 12], [3, 11]], max: 2, every: 50, patience: 120 }],
    alarm: { notice: '📋 기능 시험이 시작돼요! 2층 관제실로 가세요', done: '📋 시험을 공정하게 마쳤어요. 합격자가 많아요! 성과가 크게 올라요', missed: '⌛ 감독이 늦어 시험이 미뤄졌어요 (성과 감소)', interaction: 'superviseExam', every: [180, 300], window: 40 },
    tasks: [task('parking', '주차 연습 지도', ['teachParking'], 2), task('road', '도로 연수', ['roadTraining']), task('course', '코스 정비', ['setupCourse'])],
    extra: [
      task('learners', '수강생 응대', ['calmLearner', 'explainRules'], 2), task('tools', '장비 정리', ['organizeTools']), task('exam', '기능 시험 감독', ['superviseExam']), boss('원장님께 합격률 보고'),
      task('dweller', '시뮬레이터 교육', ['diSimLesson', 'diSimDemo']), task('brief', '도로주행 코스 브리핑', ['diRouteBrief']), task('written', '학과시험 안내', ['diKioskGuide']), task('passes', '합격자 게시', ['diPostPasses']),
    ],
    work: ['teachParking', 'roadTraining', 'setupCourse', 'superviseExam', 'organizeTools', 'calmLearner', 'explainRules', 'diRouteBrief', 'diPostPasses', 'diSimLesson', 'diSimDemo', 'diKioskGuide'],
    skill: 'logic',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  yogaInstructor: {
    careerId: 'yogaInstructor',
    name: '요가·필라테스 스튜디오',
    icon: '🧘',
    // A studio on the ground floor of a 상가 on the street (2026-11-05, the layout audit, replacing a building on a lawn with a
    // corridor lobby of waiting chairs, no changing room and a staff room with a sofa). As a real one: the sign out on the pavement,
    // in at the door to the 안내 데스크 where classes are booked, the 신발장 beside the door (shoes off here), the 인바디 and the
    // restroom; the members change in the women's or the men's changing room off the short corridor (the lockers, a shower), then
    // go barefoot into the yoga room (the teacher's mat at the front between the mirror walls, the members' mats in rows facing it,
    // the singing-bowl corner, the prop rack) or the pilates room (the reformers, the Cadillac). The 원장's room is where new members
    // are seen for the 체형 상담 and the classes are planned.
    tiles: () =>
      patch(
        building(
          [[2, 2, 13, 8, 'wood'], [15, 2, 23, 8, 'wood'], [2, 10, 7, 13, 'wood'], [9, 10, 15, 13, 'tile'], [17, 10, 23, 10, 'tile'], [17, 12, 19, 13, 'tile'], [21, 12, 23, 13, 'tile']],
          [[9, 9], [15, 9], [8, 11], [16, 10], [18, 11], [22, 11], [12, 14], [13, 12]],
        ),
        // The restroom in the lobby's corner.
        [[13, 11, 'wall'], [14, 11, 'wall'], [15, 11, 'wall'], [13, 13, 'wall']],
      ),
    restrooms: [[14, 12, 15, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The yoga room: the teacher's mat between the mirror walls, the members' mats in rows facing it, the singing-bowl corner, the props.
      o('ygMirrorWall', 3, 2), o('yogaMat', 6, 2), o('ygMirrorWall', 9, 2), o('plant', 13, 2),
      o('yogaMat', 3, 5, 'up'), o('yogaMat', 6, 5, 'up'), o('yogaMat', 9, 5, 'up'), o('yogaMat', 12, 5, 'up'),
      o('yogaMat', 4, 8, 'up'), o('yogaMat', 7, 8, 'up'), o('ygSoundCorner', 2, 6, 'right'), o('ygPropRack', 11, 8, 'up'),
      // The pilates room: the reformers, the Cadillac, a mirror wall.
      o('ygMirrorWall', 18, 2), o('reformer', 16, 4), o('reformer', 20, 4), o('reformer', 16, 7), o('ygCadillac', 20, 7), o('plant', 23, 2),
      // The lobby: the 안내 데스크, the 신발장 by the door, the 인바디; the restroom.
      o('ygFrontDesk', 10, 10), o('mtShoeRack', 9, 12, 'right'), o('ygInbody', 11, 13, 'up'),
      o('toilet', 15, 12, 'left'), o('sink', 15, 13, 'left'),
      // The 원장's room: the desk, the 상담 table.
      o('officeDesk', 2, 10), o('archiveShelf', 3, 10), o('diningTable', 4, 12), o('diningChair', 3, 12, 'right'), o('diningChair', 6, 12, 'left'), o('plant', 7, 13),
      // The women's and the men's changing rooms: the lockers and the bench, a shower.
      o('ygLockerWall', 17, 13, 'up'), o('shower', 19, 13, 'up'),
      o('shower', 21, 13, 'up'), o('ygLockerWall', 22, 13, 'up'),
      // On the pavement: the sign.
      o('ygStreetSign', 10, 15),
    ],
    coworkers: crew(['서숨결 원장', '유연한 강사', '차코어 강사'], ['#7e57c2', '#b39ddb', '#80cbc4']),
    clients: [{ noun: '회원', socials: ['alignPosture', 'healthChat'], spots: [[5, 6], [8, 6], [11, 6], [18, 6]], max: 2, every: 45, patience: 120 }],
    alarm: { notice: '🏢 기업 단체 수업 시간이에요! 요가 매트로 가세요', done: '🧘 직원들이 개운해하며 재계약했어요! 성과가 크게 올라요', missed: '⌛ 수업에 늦어 회사가 실망했어요 (성과 감소)', interaction: 'corporateClass', every: [180, 300], window: 40 },
    tasks: [task('yoga', '요가 수업', ['leadYogaClass'], 2), task('pilates', '필라테스 레슨', ['pilatesSession', 'ygCadillacRehab']), task('members', '회원 응대', ['alignPosture', 'healthChat'])],
    extra: [
      task('stretch', '스트레칭 지도', ['guideStretch']), task('class', '단체 수업', ['corporateClass']), task('members2', '자세 교정', ['alignPosture']),
      task('practice', '거울 앞 자세 점검·싱잉볼 명상', ['ygMirrorCheck', 'ygSoundBath'], 2), task('desk', '수업 예약·인바디 상담', ['ygBookClass', 'ygBodyScan'], 2), task('props', '소도구 정리', ['ygTidyProps']),
      boss('원장님과 수업 회의'),
    ],
    work: ['leadYogaClass', 'guideStretch', 'corporateClass', 'pilatesSession', 'alignPosture', 'healthChat', 'ygMirrorCheck', 'ygTidyProps', 'ygSoundBath', 'ygCadillacRehab', 'ygBodyScan', 'ygBookClass'],
    skill: 'fitness',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  courier: {
    careerId: 'courier',
    name: '택배 물류센터',
    icon: '📦',
    // A 택배 서브터미널 (2026-11-05, the layout audit, replacing a brick hall on a lawn with a corridor lobby where customers came
    // in to post parcels, two short conveyors and the 탑차 parked on the grass out front): one steel shed on a paved yard, no
    // windows on the floor, no counter for the public (parcels are handed in at shops and agencies). The main line runs the length
    // of the floor, through the ITS scanner and the wheel sorter, to the drivers' end where boxes are taken off by route; the roll
    // cages stand along the dock wall between the three docks, and each driver's 1톤 탑차 is backed up to a dock, its doors to the
    // opening, so it's loaded straight off the line and pulls forward out onto the street. Behind the line the 구역 shelves, the 배송
    // 현황판, the scanning desk, the scale, the 포장대 and the pallets in from the hub. At the west end the office, the drivers' room
    // and the restroom; the 무인 택배함 on the outside wall.
    tiles: () =>
      patch(
        building(
          [[9, 2, 23, 9, 'carpet'], [2, 2, 7, 5, 'wood'], [5, 7, 7, 9, 'wood'], [2, 8, 3, 9, 'tile']],
          // The office, the drivers' room, the restroom, the staff door; the three docks.
          [[8, 4], [8, 8], [4, 8], [6, 10], [12, 10], [14, 10], [17, 10], [20, 10]],
        ),
        // The shed ends at y 10; the yard in front of it.
        Array.from({ length: 24 * 4 }, (_, i): [number, number, 'grass'] => [1 + (i % 24), 11 + Math.floor(i / 24), 'grass']),
      ),
    restrooms: [[2, 8, 3, 9]],
    windowless: ['conveyorBelt'],
    ground: [[0, 11, 25, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The floor: the main line into the drivers' end (the conveyor station), the roll cages along the dock wall, the docks.
      o('cxMainLine', 10, 7), o('conveyorBelt', 19, 7),
      o('parcelCage', 10, 9, 'up'), o('parcelCage', 11, 9, 'up'), o('parcelCage', 15, 9, 'up'), o('parcelCage', 18, 9, 'up'), o('parcelCage', 21, 9, 'up'), o('parcelCage', 22, 9, 'up'),
      o('cxDock', 13, 9, 'up'), o('cxDock', 16, 9, 'up'), o('cxDock', 19, 9, 'up'),
      // Behind the line: the 구역 shelves, the 배송 현황판, the returns bin, the pallets in from the hub; the scanning desk, the scale, the 포장대.
      o('cxZoneShelf', 9, 2), o('cxZoneShelf', 11, 2), o('cxStatusBoard', 14, 2), o('cxReturnsBin', 17, 2), o('parcelCage', 19, 2), o('parcelCage', 20, 2),
      o('cxPalletJack', 22, 2, 'left'),
      o('scannerDesk', 10, 5), o('parcelScale', 12, 5), o('cxPackStation', 14, 5), o('parcelCage', 18, 5), o('parcelCage', 19, 5), o('cxPalletJack', 21, 5),
      // The office.
      o('officeDesk', 2, 2), o('officeDesk', 4, 2), o('copier', 6, 2), o('archiveShelf', 7, 2), o('whiteboard', 2, 5, 'up'), o('plant', 7, 5),
      // The drivers' room and the restroom.
      o('coffeeMaker', 5, 7), o('fridge', 6, 7), o('diningChair', 5, 9, 'up'), o('armchair', 7, 9, 'up'),
      o('toilet', 2, 8, 'right'), o('sink', 2, 9, 'right'),
      // Out on the yard: the trucks at the docks, the 무인 택배함 on the wall.
      o('deliveryTruck', 14, 12, 'left'), o('deliveryTruck', 17, 12, 'left'), o('deliveryTruck', 20, 12, 'left'),
      o('cxParcelLocker', 2, 11),
    ],
    coworkers: crew(['석물류 센터장', '하빠름 기사', '고성실 기사'], ['#455a64', '#78909c', '#90a4ae']),
    alarm: { notice: '⚡ 당일 특급 배송 주문이 들어왔어요! 택배 차량으로 가세요', done: '⚡ 약속 시간 안에 배송했어요! 성과가 크게 올라요', missed: '⌛ 배송이 늦어 고객이 항의했어요 (성과 감소)', interaction: 'sameDayDelivery', every: [180, 300], window: 40 },
    tasks: [task('sort', '택배 분류', ['sortParcels'], 2), task('deliver', '택배 배송', ['deliverParcels']), task('scan', '송장 스캔', ['scanWaybills'])],
    // No customers at the counter: a 서브터미널 has none (2026-11-05, the layout audit).
    extra: [
      task('stack', '택배 쌓기·상차', ['stackParcels', 'cxLoadTruck', 'cxMovePallet'], 2), task('weigh', '무게 재기', ['weighParcel']),
      task('zone', '구역 분류·반품 확인', ['cxShelveZone', 'cxCheckReturns'], 2), task('pack', '재포장·무인 택배함', ['cxRepack', 'cxFillLocker']), task('status', '배송 현황 확인', ['cxCheckStatus']),
      boss('센터장님께 배송 보고'),
    ],
    work: ['sortParcels', 'stackParcels', 'scanWaybills', 'weighParcel', 'deliverParcels', 'sameDayDelivery', 'cxLoadTruck', 'cxShelveZone', 'cxMovePallet', 'cxRepack', 'cxCheckReturns', 'cxCheckStatus', 'cxFillLocker'],
    skill: 'fitness',
    floors: { carpet: 'concrete', wood: 'oakWood', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  busDriver: {
    careerId: 'busDriver',
    name: '버스 차고지',
    icon: '🚌',
    // A corner of a 공영차고지 (2026-11-04, the layout audit, replacing two buses on a lawn by a farmhouse): the yard is paved, as
    // 80% of a real one is, and fenced, the vehicle gate on the street with its guard booth. Three 11 m buses nose out of their
    // lined bays onto the lane; the garage, open to the yard, has a fourth in for its check, the tool wall and the wash hose at
    // its head; the CNG pump stands under its canopy behind the office; the office by the gate holds the 배차실 (the
    // breathalyser and log at the window, the farebox) and the drivers' rest room (the route board, the lost property, the
    // 안마의자), heated and cooled as the rules ask, and the restroom. The 종점 stop is out on the pavement, not in the yard.
    // Later the same day: the gateway is the whole front of the bays and the garage, the gate folded back and the barrier arm up,
    // and the stop moved along the pavement in front of the office, so every bus pulls 14 m straight out onto the street through nothing.
    tiles: () =>
      patch(
        building(
          [[19, 8, 24, 10, 'wood'], [19, 12, 21, 13, 'tile'], [23, 12, 24, 13, 'tile']],
          [[18, 9], [18, 12], [20, 11], [24, 11]],
        ),
        [
          // Not the house shell: open yard (the garage is its walls, pieces below) and the office by the gate.
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !(x >= 18 && x <= 25 && y >= 7 && y <= 14)),
          ...Array.from({ length: 8 }, (_, i): [number, number, 'wall'] => [18, 7 + i, 'wall']),
          ...Array.from({ length: 8 }, (_, i): [number, number, 'wall'] => [25, 7 + i, 'wall']),
          ...Array.from({ length: 6 }, (_, i): [number, number, 'wall'] => [19 + i, 7, 'wall']),
          ...Array.from({ length: 6 }, (_, i): [number, number, 'wall'] => [19 + i, 14, 'wall']),
          ...Array.from({ length: 6 }, (_, i): [number, number, 'wall'] => [19 + i, 11, 'wall']),
          [22, 12, 'wall'], [22, 13, 'wall'],
          [18, 9, 'door'], [18, 12, 'door'], [20, 11, 'door'], [24, 11, 'door'],
        ],
      ),
    restrooms: [[23, 12, 24, 13]],
    ground: [[0, 0, 25, 14, 'asphalt'], [12, 1, 15, 11, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      o('bdYardFence', 0, 0), o('bdBayLines', 0, 0), o('bdCngCanopy', 18, 1),
      o('cityBus', 1, 0), o('cityBus', 4, 0), o('cityBus', 7, 0), o('washBay', 9, 0),
      // The garage: a bus in for its check, nose out of the door; the tool wall at its head, the spare tyres racked outside. The wash hose by the bays.
      o('bdGarageSide', 11, 0), o('bdGarageSide', 16, 0), o('bdGarageBack', 12, 0),
      o('cityBus', 13, 2), o('toolWall', 12, 1), o('bdTyreRack', 17, 0, 'left'),
      o('bdCngPump', 20, 3),
      // The office: the rest room; the 배차실; the restroom.
      o('routeBoard', 19, 8), o('bdLostFound', 21, 8), o('bdAnmagi', 24, 8, 'left'), o('fridge', 24, 9, 'left'), o('sofa', 21, 10, 'up'),
      o('farebox', 19, 13, 'up'), o('bdDispatchWindow', 20, 13, 'up'),
      o('toilet', 23, 13, 'up'), o('sink', 24, 13, 'up'),
      // The stop on the pavement in front of the office, clear of the gateway the buses pull out through.
      o('bdBusStop', 20, 15),
    ],
    coworkers: crew(['윤노선 운수과장', '신정류 기사', '배환승 기사'], ['#2e7d32', '#43a047', '#66bb6a']),
    clients: [{ noun: '승객', socials: ['giveDirections', 'helpBoarding'], spots: [[19, 16], [22, 15], [23, 16]], max: 2, every: 50, patience: 100 }],
    alarm: { notice: '⏰ 출퇴근 승객이 몰려 증편 운행이 필요해요! 버스로 가세요', done: '🚌 증편 운행으로 승객들이 제때 도착했어요! 성과가 크게 올라요', missed: '⌛ 증편이 늦어 승객 민원이 들어왔어요 (성과 감소)', interaction: 'extraRun', every: [180, 300], window: 40 },
    tasks: [task('route', '노선 운행', ['driveRoute']), task('inspect', '차량 점검', ['inspectBus']), task('fares', '요금 정산', ['settleFares'])],
    extra: [
      task('study', '노선 숙지', ['studyRoute']), task('wash', '차량 세척', ['washEquipment']), task('passengers', '승객 응대', ['giveDirections', 'helpBoarding']),
      task('dispatch', '음주 측정·운행 일지', ['bdBreathTest', 'bdSignLog'], 2), task('fuel', 'CNG 충전', ['bdFuelCng']), task('lost', '분실물 정리', ['bdLogLostItem']),
      boss('과장님께 운행 보고'),
    ],
    work: ['driveRoute', 'inspectBus', 'extraRun', 'settleFares', 'studyRoute', 'washEquipment', 'organizeTools', 'giveDirections', 'helpBoarding', 'bdBreathTest', 'bdSignLog', 'bdFuelCng', 'bdLogLostItem'],
    skill: 'logic',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  taxiDriver: {
    careerId: 'taxiDriver',
    name: '택시 차고지',
    icon: '🚕',
    // A 법인택시 차고지 (2026-11-05, the layout audit, replacing three cabs on a lawn by a farmhouse with a call kiosk in the yard and
    // fares waiting in it): the yard paved and fenced, the gateway its whole front. Two rows of bays, every cab nose to the street;
    // each drives straight out of its bay to the street (a back-row cab between the front row's) and turns into its lane there. Two
    // front-row bays stand empty, their cabs out on the day shift. Behind, under one roof, the 정비·세차장 (a cab up on the lift, the
    // tool wall, the tyres); the wash bay and the yard's LPG 충전기 by the fence. The office by the gate: the 배차실 behind its window
    // onto the yard (the keys after the 음주 측정, the takings paid in), the 운행관리 desk, the 콜·배차 단말 and the 유실물 보관함
    // inside it; the drivers' 휴게실 with the 자판기, and the restroom. Fares aren't picked up in the yard but on the street: the 택시
    // 승강장 is out on the pavement in front of the office.
    tiles: () =>
      patch(
        building([[19, 7, 24, 9, 'wood'], [19, 11, 21, 13, 'wood'], [23, 12, 24, 13, 'tile']], [[18, 9], [18, 12], [20, 10], [22, 13]]),
        [
          // Not the house shell: the open yard and the office by the gate.
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !(x >= 18 && y >= 6)),
          ...Array.from({ length: 9 }, (_, i): [number, number, 'wall'] => [25, 6 + i, 'wall']),
          [25, 6, 'wall'],
        ],
      ),
    restrooms: [[23, 12, 24, 13]],
    ground: [[0, 0, 17, 14, 'asphalt'], [18, 0, 25, 5, 'concrete']],
    objects: [
      o('txYard', 0, 0), o('txCanopy', 18, 0),
      // The bays: the back row, then the front row between the back row's lanes (7 and 15 empty).
      o('taxiCab', 1, 2, 'left'), o('taxiCab', 5, 2, 'left'), o('taxiCab', 9, 2, 'left'), o('taxiCab', 13, 2, 'left'),
      o('taxiCab', 3, 8, 'left'), o('taxiCab', 11, 8, 'left'),
      // The LPG 충전기 and the wash bay by the fence; the 정비·세차장.
      o('txLpgPump', 16, 1, 'left'), o('washBay', 16, 4, 'left'),
      o('carLift', 19, 1), o('toolWall', 21, 1), o('mecTyreRack', 23, 1),
      // The office: the 배차실 window onto the yard; inside the 운행관리 desk, the 콜·배차 단말, the 유실물 보관함.
      o('txDispatchWindow', 17, 7, 'left'),
      o('txLogDesk', 21, 7), o('navTerminal', 24, 7, 'left'), o('txLostShelf', 24, 9, 'left'), o('plant', 19, 7),
      // The 휴게실 and the restroom.
      o('fridge', 19, 11), o('txVending', 21, 11), o('sofa', 19, 13, 'up'),
      o('toilet', 24, 13, 'left'), o('sink', 24, 12, 'left'),
      // The 택시 승강장 on the pavement.
      o('txTaxiRank', 21, 15),
    ],
    coworkers: crew(['정배차 팀장', '오야간 기사', '김모범 기사'], ['#f9a825', '#fbc02d', '#212121']),
    // At the 택시 승강장 on the pavement, clear of the gateway.
    clients: [{ noun: '승객', socials: ['giveDirections', 'smallTalkFare'], spots: [[20, 16], [22, 16], [23, 15]], max: 1, every: 60, patience: 90 }],
    alarm: { notice: '✈️ 공항 가는 예약 콜이 들어왔어요! 택시로 가세요', done: '✈️ 손님이 비행기 시간에 맞춰 도착했어요! 성과가 크게 올라요', missed: '⌛ 콜을 놓쳐 다른 기사가 받았어요 (성과 감소)', interaction: 'airportCall', every: [180, 300], window: 30 },
    tasks: [task('fares', '손님 태우기', ['pickUpFares'], 2), task('calls', '콜 확인', ['checkCalls']), task('wash', '차량 세척', ['washEquipment'])],
    extra: [
      task('passengers', '승객과 대화', ['giveDirections', 'smallTalkFare']), task('tools', '차량 장비 정리', ['organizeTools']), task('airport', '공항 콜', ['airportCall']),
      task('meter', '미터기·표시등 점검', ['txCheckMeter']), task('dispatch', '배차 받기·수입금 입금', ['txGetKeys', 'txDepositFare'], 2), task('lpg', 'LPG 충전', ['txRefuelLpg']),
      task('log', '운행일지·유실물 정리', ['txWriteLog', 'txReadTacho', 'txLostItem'], 2),
      boss('팀장님께 운행 보고'),
    ],
    work: ['pickUpFares', 'airportCall', 'checkCalls', 'washEquipment', 'organizeTools', 'giveDirections', 'smallTalkFare', 'txCheckMeter', 'txGetKeys', 'txDepositFare', 'txRefuelLpg', 'txWriteLog', 'txReadTacho', 'txLostItem'],
    skill: 'charisma',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  subwayDriver: {
    careerId: 'subwayDriver',
    name: '지하철 승무사업소',
    icon: '🚇',
    // A 승무사업소 in a station (2026-11-04, the layout audit, replacing a lawn crossed by a track and a 관제 room in the crew office).
    // Upstairs of the street the platform: the train in beside the screen doors, its cab at the platform's end where a driver takes
    // it over. Below it the 사업소: the locker room; the 점호실 where a driver reports in, is breath-tested with a supervisor there
    // and signs out the key and the day's 다이어; the station's passage up to the platform; the crew room with the 노선도 and the
    // stairs. Upstairs the bunks for the first trains, the restroom and shower, the 지도운영 office and one 모의운전 연습기. 관제 is
    // at the 종합관제센터, the 관제 branch's own lot (branchLots).
    tiles: () => [
      ...building(
        [[2, 2, 23, 8, 'tile'], [2, 10, 4, 13, 'carpet'], [6, 10, 8, 13, 'wood'], [10, 10, 14, 13, 'tile'], [16, 10, 23, 13, 'carpet']],
        [[12, 9], [18, 9], [5, 12], [9, 12], [15, 12], [12, 14]],
      ),
      ...patch(
        upstairs(
          [[2, 10, 22, 10, 'tile'], [2, 12, 7, 13, 'carpet'], [9, 12, 10, 13, 'tile'], [12, 12, 13, 13, 'tile'], [15, 12, 17, 13, 'wood'], [19, 12, 23, 13, 'wood']],
          [[4, 11], [9, 11], [12, 11], [16, 11], [19, 11]],
        ),
        // Only over the 사업소: the platform below is open to the station's height.
        Array.from({ length: 26 * 9 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']),
      ),
    ],
    restrooms: [[9, 30, 10, 31]],
    objects: [
      // The platform.
      o('sbPlatformTrain', 2, 2), o('sbScreenDoors', 2, 5),
      // The locker room; the 점호실; the passage; the crew room and the stairs.
      o('sbLocker', 2, 13, 'up'),
      o('sbRollCall', 6, 10), o('sbKeyCabinet', 8, 13, 'up'), o('sbSafetyBoard', 6, 13, 'up'), o('crewDesk', 7, 13, 'up'),
      o('plant', 14, 10),
      o('stairs', 19, 10, 'right'), o('sbLineMap', 16, 10), o('sofa', 16, 13, 'up'), o('salWaterCooler', 23, 13, 'up'), o('whiteboard', 20, 13, 'up'),
      // Upstairs: the bunks; the restroom; the shower; the office; the simulator.
      up('bed', 2, 12, 'right'), up('bed', 2, 13, 'right'), up('bed', 6, 12, 'right'), up('bed', 6, 13, 'right'),
      up('toilet', 10, 13, 'left'), up('sink', 10, 12, 'left'),
      up('shower', 13, 13, 'left'),
      up('crewDesk', 15, 13, 'up'), up('crewDesk', 17, 13, 'up'),
      up('trainSimulator', 21, 12),
    ],
    coworkers: crew(['한철로 사업소장', '이신호 기관사', '송선로 기관사'], ['#1a237e', '#283593', '#3f51b5']),
    // Waiting on the platform for their train.
    clients: [{ noun: '승객', socials: ['giveDirections', 'announceDelay'], spots: [[7, 7], [11, 7], [15, 7]], max: 2, every: 50, patience: 90 }],
    alarm: { notice: '🚦 운행 중 신호 장애! 열차 운전실로 가서 관제 지시를 받으세요', done: '🚦 관제 지시대로 조치해 운행이 정상화됐어요! 성과가 크게 올라요', missed: '⌛ 조치가 늦어 열차가 줄줄이 지연됐어요 (성과 감소)', interaction: 'signalFault', every: [180, 300], window: 30 },
    // Driving the train is from 부기관사 on; before that the station and the platform (2026-10-26, at the user's request).
    tasks: [gated(task('run', '열차 운행', ['runTrain']), { minLevel: 3 }, task('station', '역 안내·승강장 안전 지키기', ['giveDirections', 'announceDelay'])), task('line', '노선·신호 위치 숙지', ['sbStudyLine']), task('dweller', '모의 훈련', ['simDrive'])],
    extra: [task('rollcall', '출근 점호·음주 측정', ['sbRollCall', 'sbBreathTest']), task('drill', '지적확인·노선 숙지', ['sbSafetyDrill', 'sbStudyLine']), task('prep', '출고 준비', ['sbTakeKey', 'sbChangeUniform']), task('log', '승무 일지', ['writeCrewLog']), task('meeting', '안전 회의', ['attendMeeting']), task('passengers', '승객 안내', ['giveDirections', 'announceDelay']), boss('사업소장님께 운행 보고')],
    work: ['runTrain', 'signalFault', 'simDrive', 'writeCrewLog', 'attendMeeting', 'giveDirections', 'announceDelay', 'sbRollCall', 'sbBreathTest', 'sbTakeKey', 'sbStudyLine', 'sbSafetyDrill', 'sbChangeUniform'],
    branchLots: {
      // The 관제 branch at the 종합관제센터: the control room (the wall of the line, two rows of consoles facing it, the team leader's
      // desk behind), the meeting room where the shift is handed over, the rest room, and the guarded way in.
      1: {
        careerId: 'subwayDriver',
        name: '종합관제센터',
        icon: '🚦',
        tiles: () =>
          patch(
            building(
              [[2, 2, 15, 9, 'tile'], [17, 2, 23, 6, 'carpet'], [17, 8, 23, 13, 'wood'], [2, 11, 15, 13, 'tile']],
              [[8, 10], [16, 4], [16, 12], [12, 14]],
            ),
            [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
          ),
        restrooms: [[22, 12, 23, 13]],
        windowless: ['sbControlWall'],
        objects: [
          o('sbControlWall', 4, 2),
          o('controlPanel', 4, 5), o('controlPanel', 7, 5), o('controlPanel', 10, 5), o('controlPanel', 4, 7), o('controlPanel', 7, 7), o('controlPanel', 10, 7),
          o('crewDesk', 14, 8, 'left'),
          o('whiteboard', 19, 2), o('salMeetingTable', 18, 4), o('salMeetingChair', 18, 5, 'up'), o('salMeetingChair', 19, 5, 'up'), o('salMeetingChair', 20, 5, 'up'),
          o('sofa', 17, 13, 'up'), o('fridge', 23, 8, 'left'), o('coffeeMaker', 23, 9, 'left'), o('salWaterCooler', 20, 8),
          o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
          o('officeDesk', 13, 11), o('plant', 2, 13),
        ],
        coworkers: crew(['한관제 관제팀장', '오신호 관제사', '임노선 관제사'], ['#0d1b3a', '#1a237e', '#283593']),
        alarm: { notice: '🚦 신호 장애가 발생했어요! 관제 콘솔에서 열차를 세우고 지시하세요', done: '🚦 장애 구간을 빠르게 정리해 운행이 정상화됐어요! 성과가 크게 올라요', missed: '⌛ 지시가 늦어 열차가 줄줄이 지연됐어요 (성과 감소)', interaction: 'signalFault', every: [180, 300], window: 30 },
        tasks: [task('monitor', '열차 운행 감시', ['monitorTrains'], 2), task('handover', '교대 인수인계 회의', ['attendMeeting']), chat(1)],
        extra: [task('log', '관제 일지 쓰기', ['writeCrewLog']), boss('관제팀장님께 운행 상황 보고')],
        work: ['monitorTrains', 'signalFault', 'attendMeeting', 'writeCrewLog'],
        skill: 'logic',
        floors: { tile: 'slateStone', carpet: 'sageCarpet', wood: 'oakWood' },
        wall: 'navyWainscot',
      },
    },
    skill: 'logic',
    floors: { tile: 'slateStone', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'navyWainscot',
  },
  seafarer: {
    careerId: 'seafarer',
    name: '해운 항만 사무소',
    icon: '🚢',
    // A coastal ship at the quay, and her company's office ashore (2026-11-04, the layout audit, replacing an office with bridge
    // simulators, which belong to a maritime training centre, and a boat in a puddle). A seafarer's work is the ship: her after part
    // fills the water side of the lot (she runs on west to her bow), the deck walked on, the hold's hatch covers forward, the
    // mooring bitts at the rails and the winch at the stern, the life raft rack; the bridge house aft (the deck runs on past it to the stern), its console along the windows
    // (helm and autopilot, radar, ECDIS, VHF) where the watch is kept, the chart table, the weather fax, the ship's bell. The gangway
    // comes down to the quay, where whoever comes aboard is checked. Ashore the company's office (the cargo plan, the port's traffic
    // screen), the reception with the sailing board, and the crew's rest room with the restroom.
    tiles: () =>
      patch(
        building(
          [[2, 11, 10, 13, 'carpet'], [12, 11, 16, 13, 'tile'], [18, 11, 23, 13, 'wood']],
          [[11, 12], [17, 12], [6, 10], [14, 10], [21, 12], [12, 14]],
        ),
        [
          ...Array.from({ length: 26 * 10 }, (_, i): [number, number, 'water' | 'grass'] => {
            const x = i % 26;
            const y = Math.floor(i / 26);
            const deck = x >= 1 && x <= 24 && y >= 1 && y <= 6;
            const quay = y >= 8;
            return [x, y, deck || quay || (x === 10 && y === 7) ? 'grass' : 'water'];
          }),
          // The bridge house on the deck.
          ...Array.from({ length: 8 }, (_, i): [number, number, 'wall'] => [15 + i, 1, 'wall']),
          ...Array.from({ length: 8 }, (_, i): [number, number, 'wall'] => [15 + i, 5, 'wall']),
          ...[2, 3, 4].flatMap((y): Array<[number, number, 'wall' | 'tile']> => [[15, y, 'wall'], [22, y, 'wall'], ...[16, 17, 18, 19, 20, 21].map((x): [number, number, 'tile'] => [x, y, 'tile'])]),
          [15, 3, 'door' as 'wall'],
          // The shore building's north wall, its doors to the quay; the restroom.
          ...Array.from({ length: 24 }, (_, i): [number, number, 'wall'] => [1 + i, 10, 'wall']),
          [6, 10, 'door' as 'wall'], [14, 10, 'door' as 'wall'],
          [21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 13, 'wall'],
        ],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[1, 1, 24, 6, 'deckSteel'], [10, 7, 10, 7, 'deckSteel'], [0, 8, 25, 9, 'quayConcrete']],
    objects: [
      // The ship: her hull; on deck the hatch covers, the bitts, the stern winch, the life raft rack.
      o('sfHull', 1, 1), o('sfHatch', 3, 2), o('sfMooringBitt', 2, 6, 'up'), o('sfMooringBitt', 13, 6, 'up'), o('sfMooringBitt', 24, 6, 'up'), o('sfWinch', 23, 2, 'left'), o('rescueGear', 13, 1),
      // The bridge: the console, the radar, the chart table, the weather fax, the bell.
      o('sfHelmConsole', 17, 2), o('radarConsole', 21, 2), o('chartTable', 19, 4, 'up'), o('sfWeatherFax', 16, 4, 'up'), o('sfShipBell', 16, 2),
      // The gangway at the quay; the quay's edge.
      o('sfGangway', 11, 8), o('hbQuayEdge', 0, 8),
      // Ashore: the company's office; the reception; the rest room and restroom.
      o('cargoPlanner', 2, 11), o('sfVtsBoard', 8, 11), o('officeDesk', 5, 13, 'up'),
      o('whiteboard', 15, 11), o('officeDesk', 13, 11), o('drWaitSeat', 14, 13, 'up'), o('drWaitSeat', 16, 13, 'up'),
      o('coffeeMaker', 18, 11), o('fridge', 20, 11), o('sofa', 18, 13, 'up'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
    ],
    coworkers: crew(['강파랑 선장', '문등대 1등 항해사', '윤갑판 갑판장'], ['#0d47a1', '#1976d2', '#fafafa']),
    clients: [{ noun: '선원·화주', socials: ['briefCrew', 'negotiateFreight'], spots: [[14, 12], [16, 12]], max: 2, every: 60, patience: 120 }],
    alarm: { notice: '🌀 태풍 피항 명령이에요! 선교로 가서 출항을 지휘하세요', done: '🌀 배와 선원 모두 안전하게 피항했어요! 성과가 크게 올라요', missed: '⌛ 피항 지휘가 늦어 해운사가 경고했어요 (성과 감소)', interaction: 'stormDeparture', every: [200, 320], window: 40 },
    tasks: [task('watch', '항해 당직', ['sfStandWatch'], 2), task('course', '항로 계획', ['plotCourse']), task('board', '현문 승선 확인', ['boardShip'])],
    extra: [task('cargo', '적하 계획', ['planCargo']), task('radar', '레이더·VTS 감시', ['monitorRadar', 'sfVtsWatch']), task('weather', '해상 기상 확인', ['sfCheckWeather']), task('seamanship', '갑판 실습', ['sfTieKnot', 'checkRescueGear', 'sfRingBell']), task('clients', '선원·화주 응대', ['briefCrew', 'negotiateFreight']), boss('선장님께 항해 보고')],
    work: ['sfStandWatch', 'plotCourse', 'planCargo', 'boardShip', 'stormDeparture', 'monitorRadar', 'checkRescueGear', 'attendMeeting', 'briefCrew', 'negotiateFreight', 'sfVtsWatch', 'sfCheckWeather', 'sfTieKnot', 'sfRingBell'],
    skill: 'logic',
    floors: { tile: 'monoTile', carpet: 'slateStone', wood: 'oakWood' },
    wall: 'navyWainscot',
  },
  electrician: {
    careerId: 'electrician',
    name: '전기 공사 업체',
    icon: '🔌',
    // An electrical contractor and the building it's working on (2026-11-04, the layout audit, replacing a hall of wiring boards like a
    // training centre and a waiting lobby). The firm on the left: the office (the boss's and the bookkeeper's desks are the design desks
    // here, the client table, the safety board; registering as a contractor needs an office), the store behind it (shelves, the cable
    // drums stood on end, the tool and protective gear wall, a small test bench, the restroom), its door out to the yard. The site on the
    // right: a room of the building being wired (the cable in the open walls, the distribution board, the ceiling's lights on a ladder)
    // and the building's electrical room, locked, its switchgear stood off the walls (1.5 m clear in front, 0.6 behind), the meters by
    // its door; the crew's room. The van out front.
    tiles: () =>
      patch(
        building(
          [[2, 4, 10, 8, 'tile'], [2, 10, 10, 13, 'wood'], [15, 3, 23, 7, 'carpet'], [15, 9, 19, 13, 'tile'], [21, 9, 23, 13, 'wood']],
          [[6, 9], [11, 6], [4, 14], [14, 5], [17, 8], [22, 8]],
        ),
        [
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !((x >= 1 && x <= 11 && y >= 3 && y <= 14) || (x >= 14 && x <= 24 && y >= 2 && y <= 14))),
          ...Array.from({ length: 11 }, (_, i): [number, number, 'wall'] => [1 + i, 3, 'wall']),
          ...Array.from({ length: 11 }, (_, i): [number, number, 'wall'] => [14 + i, 2, 'wall']),
          ...Array.from({ length: 12 }, (_, i): [number, number, 'wall'] => [11, 3 + i, 'wall']),
          ...Array.from({ length: 13 }, (_, i): [number, number, 'wall'] => [14, 2 + i, 'wall']),
          [11, 6, 'door' as 'wall'], [14, 5, 'door' as 'wall'],
          [8, 4, 'wall'], [8, 5, 'door' as 'wall'], [8, 6, 'wall'], [9, 6, 'wall'], [10, 6, 'wall'],
        ],
      ),
    restrooms: [[9, 4, 10, 5]],
    ground: [[12, 3, 13, 17, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The store.
      o('partsShelf', 2, 4), o('partsShelf', 3, 4), o('cableReel', 5, 4), o('cableReel', 6, 4), o('elSafetyWall', 2, 8, 'up'), o('elTestBench', 7, 8, 'up'),
      o('toilet', 10, 5, 'left'), o('sink', 10, 4, 'left'),
      // The office.
      o('circuitDesk', 2, 10), o('circuitDesk', 3, 10), o('elQuoteDesk', 6, 12, 'up'), o('salMeetingChair', 8, 12, 'left'), o('whiteboard', 9, 10),
      // The site: the room being wired; the electrical room; the crew's room.
      o('wiringBoard', 16, 3), o('wiringBoard', 19, 3), o('switchboard', 22, 3), o('elCeilingRig', 19, 6, 'up'),
      o('switchboard', 16, 11), o('switchboard', 18, 11), o('elMeterPanel', 19, 9),
      o('coffeeMaker', 23, 9, 'left'), o('sofa', 21, 13, 'up'),
      // The van out front.
      o('serviceVan', 15, 15),
    ],
    coworkers: crew(['강전력 소장', '배전선 반장', '오회로 기사'], ['#ffb300', '#ffca28', '#546e7a']),
    // At the client table.
    clients: [{ noun: '공사 의뢰인', socials: ['quoteJob', 'explainWork'], spots: [[8, 11]], max: 1, every: 60, patience: 120 }],
    alarm: { notice: '🔦 아파트 단지가 정전됐어요! 공사 차량으로 출동하세요', done: '💡 전기가 다시 들어왔어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 업체가 고쳤어요 (성과 감소)', interaction: 'blackoutCall', every: [180, 300], window: 40 },
    tasks: [task('wire', '배선 작업', ['wirePanel'], 2), task('site', '현장 시공', ['siteInstall', 'elFitLight']), task('panel', '분전반 점검', ['inspectPanel', 'elInsulation', 'elClamp', 'elMeterCheck'])],
    extra: [task('design', '회로 설계', ['drawCircuit']), task('cable', '전선 재단', ['cutCable']), task('safety', '보호구 점검', ['elPreparePpe']), task('clients', '의뢰인 상담', ['quoteJob', 'explainWork']), boss('소장님께 공사 보고')],
    work: ['wirePanel', 'inspectPanel', 'cutCable', 'drawCircuit', 'siteInstall', 'blackoutCall', 'attendMeeting', 'quoteJob', 'explainWork', 'elFitLight', 'elInsulation', 'elClamp', 'elMeterCheck', 'elPreparePpe'],
    branchLots: {
      // The design and supervision branch at its office (2026-11-04, the standing choice): the engineers' design desks, the drawings
      // board, the plan chest of the jobs' documents, the meeting table where a design is gone over with the client, the restroom; the
      // car to the sites it supervises.
      1: {
        careerId: 'electrician',
        name: '전기 설계·감리 사무소',
        icon: '📐',
        tiles: () =>
          patch(
            building([[2, 2, 15, 13, 'carpet'], [17, 2, 23, 7, 'wood'], [17, 9, 23, 13, 'tile']], [[16, 5], [16, 11], [12, 14]]),
            [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
          ),
        restrooms: [[22, 12, 23, 13]],
        objects: [
          o('circuitDesk', 3, 2), o('circuitDesk', 5, 2), o('circuitDesk', 7, 2), o('circuitDesk', 3, 5), o('circuitDesk', 5, 5), o('circuitDesk', 7, 5),
          o('whiteboard', 11, 2), o('archiveShelf', 14, 2), o('archiveShelf', 15, 2), o('plant', 2, 13),
          o('salMeetingTable', 18, 4), o('salMeetingChair', 18, 3), o('salMeetingChair', 19, 3), o('salMeetingChair', 20, 3), o('salMeetingChair', 18, 5, 'up'), o('salMeetingChair', 19, 5, 'up'), o('salMeetingChair', 20, 5, 'up'),
          o('coffeeMaker', 17, 9), o('fridge', 18, 9), o('sofa', 17, 13, 'up'),
          o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
          o('serviceVan', 15, 15),
        ],
        coworkers: crew(['정설계 감리단장', '하도면 설계 팀장', '윤부하 감리원'], ['#37474f', '#546e7a', '#ffb300']),
        alarm: { notice: '🔦 감리하던 현장이 정전됐대요! 차량으로 가 보세요', done: '💡 원인을 찾아 시공사에 바로잡게 했어요! 성과가 크게 올라요', missed: '⌛ 늦어서 다른 감리원이 갔어요 (성과 감소)', interaction: 'blackoutCall', every: [180, 300], window: 40 },
        tasks: [task('design', '회로 설계', ['drawCircuit'], 2), task('meeting', '설계 협의', ['attendMeeting']), chat(1)],
        extra: [boss('감리단장님께 감리 보고'), task('docs', '감리 서류 정리', ['readArchive'])],
        work: ['drawCircuit', 'attendMeeting', 'blackoutCall', 'readArchive'],
        skill: 'logic',
        floors: { carpet: 'slateStone', wood: 'walnutWood', tile: 'creamTile' },
        wall: 'creamPlain',
      },
    },
    skill: 'handiness',
    floors: { tile: 'monoTile', carpet: 'slateStone', wood: 'oakWood' },
    wall: 'redBrick',
  },
  plumber: {
    careerId: 'plumber',
    name: '설비 업체',
    icon: '🚿',
    // A neighbourhood 설비 shop and a house it's called to (2026-11-04, the layout audit, replacing a workshop of boilers, drain and
    // fixture rigs like a training hall, with a waiting lobby: a plumber's work is in the customer's home, and the shop is passed
    // through). The shop on the left: the counter where jobs are phoned in and parts sold, the day's job board; behind, the pipe racks
    // (4 m lengths), the cutting bench and the threader, the fittings shelves, the restroom; the van out front on its bay. On the right
    // a house with its walls opened where the work is: the bathroom's wall cut back to the leaking pipe (found by pressure, then gas,
    // then listening), the toilet and tap, the boiler in its cupboard, the kitchen sink's drain (camera, spring or jet, camera again),
    // the owner at the kitchen table.
    tiles: () =>
      patch(
        building(
          [[2, 10, 10, 13, 'tile'], [2, 6, 7, 8, 'tile'], [9, 6, 10, 7, 'tile'], [14, 4, 18, 8, 'tile'], [20, 4, 23, 8, 'tile'], [14, 10, 23, 13, 'wood']],
          [[5, 9], [9, 14], [16, 9], [21, 9], [18, 14], [12, 14]],
        ),
        [
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !((x >= 1 && x <= 11 && y >= 5 && y <= 14) || (x >= 13 && x <= 24 && y >= 3 && y <= 14))),
          ...Array.from({ length: 11 }, (_, i): [number, number, 'wall'] => [1 + i, 5, 'wall']),
          ...Array.from({ length: 12 }, (_, i): [number, number, 'wall'] => [13 + i, 3, 'wall']),
          [13, 3, 'wall'], [13, 4, 'wall'],
          [12, 14, 'path' as 'wall'], [8, 6, 'wall'], [8, 7, 'door' as 'wall'], [8, 8, 'wall'], [9, 8, 'wall'], [10, 8, 'wall'],
        ],
      ),
    restrooms: [[9, 6, 10, 7]],
    ground: [[0, 15, 25, 17, 'concrete'], [0, 14, 0, 14, 'concrete']],
    objects: [
      // The shop: the counter and the job board; behind, the pipe racks, the bench, the threader, the shelves.
      o('pbCounter', 4, 12, 'up'), o('whiteboard', 2, 13, 'up'), o('officeDesk', 2, 10),
      o('pbPipeRack', 2, 6), o('pbPipeRack', 4, 6), o('pipeBench', 6, 6), o('pbThreader', 2, 8, 'up'), o('partsShelf', 7, 8, 'up'),
      o('toilet', 10, 7, 'left'), o('sink', 10, 6, 'left'),
      // The house: the bathroom's opened wall, the detector, the toilet and tap; the boiler cupboard; the kitchen sink and table.
      o('pbLeakWall', 14, 4), o('leakDetector', 17, 4), o('pbFixtureRig', 15, 7, 'up'),
      o('boilerUnit', 21, 4), o('partsShelf', 23, 6, 'left'),
      o('pbDrainRig', 14, 10), o('stove', 17, 10), o('fridge', 18, 10), o('diningTable', 20, 12), o('diningChair', 20, 11), o('diningChair', 21, 11), o('sofa', 22, 13, 'up'),
      // The van on its bay.
      o('plumbingVan', 3, 15),
    ],
    coworkers: crew(['한수도 대표', '유배관 반장', '이보일 기사'], ['#1565c0', '#42a5f5', '#90caf9']),
    // The owner of the house being worked on, at the kitchen table.
    clients: [{ noun: '수리 의뢰인', socials: ['quoteJob', 'explainWork'], spots: [[20, 10], [22, 11]], max: 1, every: 60, patience: 120 }],
    alarm: { notice: '🧊 수도관이 터졌다는 긴급 전화예요! 출장 차량으로 가세요', done: '🔧 물이 다시 잘 나와요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 아랫집까지 물이 샜어요 (성과 감소)', interaction: 'burstPipe', every: [180, 300], window: 40 },
    tasks: [task('pipes', '배관 작업', ['cutPipes', 'pbThreadPipe']), task('call', '출장 수리', ['serviceCall']), task('boiler', '보일러 수리', ['repairBoiler'])],
    extra: [task('leak', '누수 탐지', ['testLeak', 'pbFindLeak', 'pbPressureTest']), task('drain', '배수관 뚫기', ['pbSnakeDrain', 'pbCameraDrain']), task('fixture', '위생기구 수리', ['pbFixToilet', 'pbFixFaucet']), task('parts', '부품 정리·판매', ['sortParts', 'pbServeParts', 'pbPickPipe']), task('van', '출장 차량 짐 싣기', ['pbLoadVan']), task('clients', '의뢰인 상담', ['quoteJob', 'explainWork']), boss('대표님께 공사 보고')],
    work: ['cutPipes', 'testLeak', 'repairBoiler', 'serviceCall', 'burstPipe', 'sortParts', 'quoteJob', 'explainWork', 'pbPickPipe', 'pbThreadPipe', 'pbFindLeak', 'pbPressureTest', 'pbSnakeDrain', 'pbCameraDrain', 'pbFixToilet', 'pbFixFaucet', 'pbServeParts', 'pbLoadVan'],
    branchLots: {
      // The building services branch on a new building's site (2026-11-04, the standing choice: a branch working somewhere else has its
      // own lot): a floor of the frame, its plant room with the boilers going in, the working floor with the pipe racks, the cutting
      // bench, the threader and the pressure tester; in the yard the site office container, the rest container, the portable toilet,
      // the van.
      1: {
        careerId: 'plumber',
        name: '신축 건물 설비 현장',
        icon: '🏗️',
        tiles: () =>
          patch(
            building([[2, 2, 8, 7, 'carpet'], [10, 2, 23, 7, 'carpet'], [2, 11, 7, 13, 'tile'], [10, 11, 13, 13, 'tile'], [16, 12, 17, 13, 'tile']], [[9, 4], [16, 8], [5, 10], [12, 10], [16, 11]]),
            [
              ...Array.from({ length: 26 * 6 }, (_, i): [number, number, 'grass'] => [i % 26, 9 + Math.floor(i / 26), 'grass']).filter(([x, y]) => !((x >= 1 && x <= 14 && y >= 10 && y <= 14) || (x >= 15 && x <= 18 && y >= 11 && y <= 14))),
              ...Array.from({ length: 24 }, (_, i): [number, number, 'wall'] => [1 + i, 8, 'wall']),
              [16, 8, 'door' as 'wall'],
              ...Array.from({ length: 14 }, (_, i): [number, number, 'wall'] => [1 + i, 10, 'wall']),
              ...Array.from({ length: 14 }, (_, i): [number, number, 'wall'] => [1 + i, 14, 'wall']),
              [1, 11, 'wall'], [1, 12, 'wall'], [1, 13, 'wall'], [8, 11, 'wall'], [8, 12, 'wall'], [8, 13, 'wall'], [9, 11, 'wall'], [9, 12, 'wall'], [9, 13, 'wall'],
              [14, 11, 'wall'], [14, 12, 'wall'], [14, 13, 'wall'], [5, 10, 'door' as 'wall'], [12, 10, 'door' as 'wall'],
              [15, 11, 'wall'], [16, 11, 'door' as 'wall'], [17, 11, 'wall'], [18, 11, 'wall'], [15, 12, 'wall'], [15, 13, 'wall'], [18, 12, 'wall'], [18, 13, 'wall'],
              [15, 14, 'wall'], [16, 14, 'wall'], [17, 14, 'wall'], [18, 14, 'wall'],
            ],
          ),
        restrooms: [[16, 12, 17, 13]],
        ground: [[0, 9, 25, 17, 'concrete']],
        objects: [
          o('boilerUnit', 3, 2), o('boilerUnit', 5, 2), o('partsShelf', 8, 6, 'left'),
          o('pbPipeRack', 11, 2), o('pbPipeRack', 13, 2), o('pipeBench', 16, 2), o('pbThreader', 19, 2), o('leakDetector', 22, 2),
          o('officeDesk', 2, 11), o('officeDesk', 3, 11), o('whiteboard', 5, 13, 'up'),
          o('coffeeMaker', 10, 11), o('fridge', 11, 11), o('sofa', 10, 13, 'up'),
          o('toilet', 17, 13, 'left'), o('sink', 17, 12, 'left'),
          o('plumbingVan', 20, 12),
        ],
        coworkers: crew(['문설비 현장 소장', '차배관 반장', '고용접 기능공'], ['#455a64', '#1565c0', '#90a4ae']),
        alarm: { notice: '🧊 다른 현장에서 배관이 터졌대요! 출장 차량으로 가세요', done: '🔧 배관을 잡고 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 늦어서 아래층까지 물이 샜어요 (성과 감소)', interaction: 'burstPipe', every: [180, 300], window: 40 },
        tasks: [task('pipes', '배관 자르고 잇기', ['cutPipes', 'pbThreadPipe']), task('boiler', '기계실 보일러 설치', ['repairBoiler']), task('test', '배관 수압 시험', ['testLeak'])],
        extra: [task('stock', '자재 챙기기', ['pbPickPipe', 'sortParts']), task('meeting', '공정 회의', ['attendMeeting']), boss('현장 소장님께 공정 보고')],
        work: ['cutPipes', 'pbThreadPipe', 'repairBoiler', 'testLeak', 'pbPickPipe', 'sortParts', 'burstPipe', 'attendMeeting'],
        skill: 'handiness',
        floors: { carpet: 'concrete', tile: 'creamTile' },
        wall: 'creamPlain',
      },
    },
    skill: 'handiness',
    floors: { tile: 'monoTile', wood: 'oakWood' },
    wall: 'redBrick',
  },
  carpenter: {
    careerId: 'carpenter',
    name: '목공소',
    icon: '🪚',
    // A 가구 공방 in a panel-built factory on the edge of town (2026-11-05, the layout audit, replacing a shop-like building on a lawn
    // with a wooden floor everywhere, its machines scattered over a big empty workshop, the finishing table in the middle of the
    // sawdust and the showroom a corridor of three chairs). The order of the work runs from the yard in: the 1톤 truck in from the
    // timber yard, backed to the lumber pile; the boards in through the two-bay shutter to the lumber store's racks; out onto the
    // concrete workshop floor by the cart to the 수압대패 (a face flat), the table saw (ripped to width), the band saw (curves), the
    // drill press (dowel holes), the benches by the back wall (joinery and glue-up under the clamp wall), every machine piped to
    // the dust collector in the corner. Finishing is done apart, in the walled paint booth with its exhaust fan and filter, the
    // drying rack and the paint store behind (dust and finish don't mix). In front, behind the glass on the street, the showroom
    // that is the office: finished pieces, the wood sample boards, the consultation table where a commission is drawn and priced,
    // the master's desk; the restroom off it.
    tiles: () =>
      patch(
        building(
          [[2, 2, 12, 8, 'carpet'], [14, 2, 17, 6, 'carpet'], [14, 8, 17, 10, 'carpet'], [17, 12, 17, 13, 'carpet'], [2, 10, 12, 13, 'wood'], [14, 12, 15, 13, 'tile']],
          // The lumber store, the booth and the showroom off the workshop; the paint store off the booth; the restroom; the street door; the shutter.
          [[13, 4], [13, 8], [8, 9], [17, 11], [13, 12], [12, 14], [18, 3], [18, 4]],
        ),
        // The building ends at x 18; the yard beside it.
        Array.from({ length: 6 * 14 }, (_, i): [number, number, 'grass'] => [19 + (i % 6), 1 + Math.floor(i / 6), 'grass']),
      ),
    restrooms: [[14, 12, 15, 13]],
    ground: [[19, 0, 25, 14, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The workshop: the clamp wall and the benches along the back, the drill press, the dust collector in the corner; the band saw
      // on the left wall, the table saw with the offcut crate, the 수압대패 by the store door, the cart of boards; the order board by
      // the showroom door.
      o('carpClampRack', 2, 2), o('carpentryBench', 3, 2), o('carpentryBench', 5, 2), o('carpDrillPress', 8, 2), o('carpDustCollector', 12, 2),
      o('carpBandSaw', 2, 5, 'right'), o('tableSaw', 6, 5), o('carpOffcutBin', 7, 5), o('carpJointer', 9, 4), o('carpLumberCart', 10, 7),
      o('carpentryBench', 3, 7), o('carpOrderBoard', 6, 8, 'up'),
      // The lumber store: racks round the walls, a pile just in.
      o('lumberRack', 14, 2), o('lumberRack', 15, 2), o('lumberRack', 16, 2), o('lumberRack', 17, 2), o('lumberRack', 14, 5, 'right'), o('lumberRack', 14, 6, 'right'), o('carpLumberStack', 16, 6),
      // The paint booth: the finishing table, the exhaust fan and filter, the drying racks; the paint store behind.
      o('finishingTable', 15, 8), o('carpBoothFan', 17, 8, 'left'), o('carpDryRack', 14, 10, 'up'), o('carpDryRack', 15, 10, 'up'),
      o('carpPaintShelf', 17, 13, 'up'),
      // The showroom: finished pieces, the sample boards, the consultation table, the master's desk.
      o('carpShowcase', 2, 10), o('carpSampleWall', 4, 10), o('carpSampleWall', 5, 10), o('carpShowcase', 2, 12, 'right'),
      o('diningTable', 8, 12), o('diningChair', 8, 11), o('diningChair', 8, 13, 'up'), o('diningChair', 9, 13, 'up'),
      o('officeDesk', 10, 10), o('coffeeMaker', 11, 10), o('plant', 11, 13),
      o('toilet', 15, 12, 'left'), o('sink', 15, 13, 'left'),
      // The yard: the shutter, the truck backed to the lumber pile, the pallets; the glass front on the street.
      o('carpShutter', 19, 2), o('carpLumberStack', 21, 1), o('carpLumberStack', 23, 3, 'left'), o('carpTruck', 21, 7, 'up'),
      o('carpFront', 1, 15),
    ],
    coworkers: crew(['나무결 공방장', '송대패 목수', '박끌 목수'], ['#6d4c41', '#8d6e63', '#a1887f']),
    // At the consultation table, across from the master.
    clients: [{ noun: '가구 주문 손님', socials: ['quoteJob', 'showSamples'], spots: [[7, 13], [10, 13]], max: 2, every: 60, patience: 120 }],
    alarm: { notice: '🪑 급한 맞춤 가구 주문이 들어왔어요! 목공 작업대로 가세요', done: '🪑 약속한 날 딱 맞춰 납품했어요! 성과가 크게 올라요', missed: '⌛ 납기를 못 맞춰 주문이 취소됐어요 (성과 감소)', interaction: 'rushFurniture', every: [180, 300], window: 45 },
    tasks: [task('cut', '목재 재단', ['cutWood', 'sawBoards'], 2), task('join', '짜맞춤', ['joinWood', 'carpDrillHoles']), task('finish', '오일 마감', ['finishFurniture'])],
    extra: [task('lumber', '목재 들이고 고르기', ['selectLumber', 'carpUnloadLumber']), task('plane', '대패질', ['planeBoard', 'carpJointBoard']), task('band', '곡선 따내기', ['carpBandCut']), task('rush', '맞춤 가구 제작', ['rushFurniture']), task('clients', '손님 상담', ['quoteJob', 'showSamples']), task('orders', '주문 관리', ['carpCheckOrders', 'carpPhotoPiece', 'writeReport']), task('dust', '집진기 비우기', ['carpEmptyDust']), boss('공방장님께 작품 보여 드리기')],
    work: ['cutWood', 'joinWood', 'planeBoard', 'rushFurniture', 'sawBoards', 'selectLumber', 'finishFurniture', 'quoteJob', 'showSamples', 'carpDrillHoles', 'carpEmptyDust', 'carpCheckOrders', 'carpPhotoPiece', 'carpJointBoard', 'carpBandCut', 'carpUnloadLumber', 'writeReport', 'crunchNumbers'],
    skill: 'handiness',
    floors: { carpet: 'concrete', wood: 'walnutWood', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  welder: {
    careerId: 'welder',
    name: '조선소 용접장',
    icon: '🔥',
    // One bay of a shipyard's 블록 조립 공장 by the fitting-out quay (2026-11-05, the layout audit, replacing an open concrete yard on a
    // lawn with a shed-sized block, a small gantry on legs, welding booths in rows and a site office furnished like a living room). Ship
    // blocks are built under cover: the steel hall, its columns and roof trusses, the cladding high on the back and side, the 30-ton
    // overhead crane on its runway over the work. The block is most of the bay: a double bottom 12 m long with its side shell rising
    // behind, the working face in front (B-207) with its staging, the welders at it behind red arc curtains, the portable welding
    // machine and its gas beside them. In the front of the bay the plates come in: the plate gantry over its trestles, the plates waiting,
    // the plasma table burning parts; the grinding stand and the inspection cart by the side; one booth kept for practice and the
    // qualification test. The ship ahead of this one lies at the quay behind, fitting out. In the low building beside: the changing room
    // (lockers, fire-resistant suits, helmets, the protective gear checked out), the 반 사무실 where the crew rests and the day's
    // permits are written (the safety board, the 직장's desks, the long table, the water cooler), the tool and gas crib, the restroom.
    tiles: () =>
      patch(
        building(
          [[17, 4, 23, 6, 'tile'], [17, 8, 20, 13, 'wood'], [22, 8, 23, 10, 'carpet'], [22, 12, 23, 13, 'tile']],
          // The changing room and the 반 사무실 off the hall, the one to the other; the crib and the restroom off the office.
          [[16, 5], [19, 7], [16, 12], [21, 9], [21, 12]],
        ),
        Array.from({ length: 26 * 15 }, (_, i): [number, number, 'water' | 'grass'] => [i % 26, Math.floor(i / 26), Math.floor(i / 26) <= 1 ? 'water' : 'grass']).filter(
          ([x, y]) => x <= 15 || y <= 2 || x === 25,
        ),
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 2, 25, 2, 'quayConcrete'], [0, 3, 15, 14, 'concrete'], [25, 3, 25, 14, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The quay and the ship fitting out; the hall's frame and its overhead crane.
      o('wdQuayShip', 1, 0), o('hbQuayEdge', 0, 2), o('wdShopFrame', 0, 3),
      // The block: the rest of it, the working face, the arc curtains at the seams, the portable welder and its gas.
      o('wdBlockMass', 1, 3), o('wdHullBlock', 5, 6), o('wdWeldScreen', 4, 8), o('wdWeldScreen', 10, 8), o('wdGasCart', 11, 8),
      // By the side: the practice and test booth, the grinding stand, the inspection cart.
      o('weldingBooth', 14, 3), o('grinderStation', 15, 7, 'left'), o('inspectionRig', 15, 9, 'left'),
      // The plates in: the plasma table, the plate gantry over its trestles, the plates waiting.
      o('wdPlasmaTable', 11, 10), o('wdGantry', 1, 12), o('steelPlates', 7, 13), o('steelPlates', 9, 13),
      // The changing room.
      o('wdPpeLocker', 17, 4), o('wdChangeLockers', 20, 4), o('wdChangeLockers', 22, 4),
      // The 반 사무실: the safety and permit board, the 직장's desks, the long table, the water cooler.
      o('wdSafetyBoard', 17, 8), o('officeDesk', 20, 10, 'left'), o('officeDesk', 20, 11, 'left'),
      o('diningTable', 17, 11), o('diningChair', 17, 10), o('diningChair', 18, 10), o('salWaterCooler', 17, 13, 'up'),
      // The tool and gas crib; the restroom.
      o('toolWall', 22, 8),
      o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
    ],
    coworkers: crew(['조강철 직장', '용불꽃 반장', '마철판 용접사'], ['#37474f', '#ff7043', '#546e7a']),
    clients: [{ noun: '현장 감독', socials: ['reportProgress', 'explainWork'], spots: YARD_SPOTS, max: 1, every: 70, patience: 120 }],
    alarm: { notice: '⚓ 진수 전 긴급 보수가 필요해요! 용접 부스로 가세요', done: '⚓ 보수 용접을 완벽히 마쳤어요! 성과가 크게 올라요', missed: '⌛ 보수가 늦어 진수 일정이 밀렸어요 (성과 감소)', interaction: 'urgentWeld', every: [180, 300], window: 40 },
    tasks: [task('weld', '용접', ['weldSeam', 'wdSeamBlock', 'wdTackBlock']), task('cut', '강판 절단', ['cutSteel', 'wdPlasmaCut']), task('grind', '용접부 다듬기', ['grindWelds'])],
    extra: [task('inspect', '용접 검사', ['inspectWeld']), task('tools', '공구 정리', ['organizeTools']), task('gear', '장비·보호구 점검', ['wdCheckGas', 'wdCheckPpe']), task('lift', '크레인 양중', ['wdLiftPlate']), task('safety', '안전 회의·화기 허가', ['wdMorningTalk', 'wdHotPermit']), task('report', '공정 보고', ['reportProgress', 'explainWork']), boss('직장님께 작업 보고')],
    work: ['weldSeam', 'urgentWeld', 'cutSteel', 'grindWelds', 'inspectWeld', 'organizeTools', 'reportProgress', 'explainWork', 'wdTackBlock', 'wdSeamBlock', 'wdCheckGas', 'wdPlasmaCut', 'wdLiftPlate', 'wdCheckPpe', 'wdMorningTalk', 'wdHotPermit', 'writeReport', 'crunchNumbers'],
    skill: 'handiness',
    floors: { wood: 'oakWood', tile: 'monoTile', carpet: 'concrete' },
    wall: 'creamPlain',
  },
  wallpaperer: {
    careerId: 'wallpaperer',
    name: '인테리어 시공 현장',
    icon: '🧱',
    // A flat being redone (2026-11-04, the layout audit, replacing a hall of practice walls like a training school, with a waiting
    // lobby and a staff room). The rooms show the order of the work: the first still in its old paper, measured; the second being
    // lined then papered, the ceiling corner on the ladder; the third papered, its floor going down next (paper goes up before the
    // floor). In the living room the pasting tables, the stock, the tile saws and the foreman's plan; the kitchen; the bathroom being
    // tiled, the other one the crew use. No lobby or staff room: a site has none.
    tiles: () =>
      patch(
        building(
          [[2, 2, 7, 6, 'wood'], [9, 2, 15, 6, 'wood'], [17, 2, 23, 6, 'wood'], [2, 8, 15, 13, 'wood'], [17, 8, 23, 10, 'tile'], [17, 12, 20, 13, 'tile'], [22, 12, 23, 13, 'tile']],
          [[4, 7], [12, 7], [19, 7], [16, 9], [18, 11], [22, 11], [12, 14]],
        ),
        [],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // Room 1, still in its old paper, measured; room 2, being lined and papered, the ceiling corner; room 3, papered, the floor next.
      o('mockWall', 3, 2), o('wlMeasureBay', 6, 2),
      o('mockWall', 10, 2), o('wlCeilingCorner', 13, 2), o('wlWorkLight', 9, 6),
      o('wlFinishRoom', 18, 2), o('wlFloorBay', 19, 4),
      // The living room: the pasting tables, the stock, the tile saws, the foreman's plan, the paint.
      o('wallpaperTable', 4, 9), o('wallpaperTable', 8, 9), o('wlMaterials', 2, 12), o('tileSaw', 13, 9), o('tileSaw', 14, 9), o('wlSitePlan', 2, 8), o('wlPaintWall', 9, 13, 'up'), o('wlWorkLight', 15, 13),
      // The kitchen; the bathroom being tiled; the crew's restroom.
      o('stove', 21, 8), o('kitchenSink', 22, 8), o('fridge', 23, 8),
      o('mockWall', 17, 13, 'up'), o('bathtub', 20, 12),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // Out front: the firm's sign and the truck that brought the paper and tiles.
      o('wlSign', 14, 15), o('serviceVan', 3, 15),
    ],
    coworkers: crew(['문벽지 대표', '윤풀칠 반장', '고타일 기능사'], ['#ff8a65', '#ffab91', '#90a4ae']),
    // Looking round the work.
    clients: [{ noun: '집주인', socials: ['quoteJob', 'showSamples'], spots: [[21, 3], [6, 11], [12, 11]], max: 2, every: 60, patience: 120 }],
    alarm: { notice: '📦 이사 날짜가 당겨졌어요! 시공 벽으로 가서 마감하세요', done: '🧱 하루 만에 깔끔하게 끝냈어요! 성과가 크게 올라요', missed: '⌛ 마감이 늦어 이삿짐이 먼저 들어왔어요 (성과 감소)', interaction: 'moveInDeadline', every: [180, 300], window: 45 },
    tasks: [task('paste', '벽지 풀칠', ['pasteWallpaper'], 2), task('hang', '도배·타일 시공', ['hangWallpaper', 'layTiles', 'wlFloorTile'], 2), task('tiles', '타일 자르기', ['cutTiles'])],
    extra: [task('clients', '집주인 상담', ['quoteJob', 'showSamples']), task('deadline', '마감 시공', ['moveInDeadline']), task('more', '추가 시공', ['layTiles', 'wlPlank', 'wlFloorTile']), task('paint', '페인트칠', ['wlRoll', 'wlCutIn']), task('ceiling', '천장 몰딩 마감', ['wlCeiling']), task('measure', '실측', ['wlLaser', 'wlTape']), task('plan', '도면·자재 확인', ['wlPlan', 'wlStock']), task('walk', '집주인 최종 점검', ['wlWalk']), boss('대표님께 현장 보고')],
    work: ['pasteWallpaper', 'hangWallpaper', 'layTiles', 'cutTiles', 'moveInDeadline', 'quoteJob', 'showSamples', 'wlRoll', 'wlCutIn', 'wlPlank', 'wlFloorTile', 'wlCeiling', 'wlLaser', 'wlTape', 'wlPlan', 'wlStock', 'wlWalk'],
    skill: 'handiness',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  elevatorTech: {
    careerId: 'elevatorTech',
    name: '승강기 서비스센터',
    icon: '🛗',
    // A service centre and a customer's building it looks after (2026-11-04, the layout audit, replacing a training workshop with a
    // full-size mock-up and a rail jig, things an education centre has, and a lobby where a building manager sat waiting). The centre
    // on the left, a small office on the street: the remote monitoring (the board of the lifts it watches, the desks), the rounds
    // board, the inspection records; the parts and safety gear behind; the van out front. The building on the right: its lobby, the
    // lift being serviced behind its barriers, the stairs up; the entrance hall; the management office, where the manager is met.
    // Upstairs (the roof), the machine room above the shaft: the traction machine, the governor and the controller.
    tiles: () => [
      ...patch(
        building(
          [[2, 6, 7, 8, 'tile'], [9, 6, 10, 8, 'tile'], [2, 10, 10, 13, 'carpet'], [14, 2, 23, 7, 'tile'], [14, 9, 17, 13, 'wood'], [19, 9, 23, 13, 'tile']],
          [[6, 9], [9, 9], [6, 14], [23, 8], [18, 11], [21, 14]],
        ),
        [
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !((x >= 1 && x <= 11 && y >= 5 && y <= 14) || (x >= 13 && x <= 24 && y >= 1 && y <= 14))),
          ...Array.from({ length: 11 }, (_, i): [number, number, 'wall'] => [1 + i, 5, 'wall']),
          ...Array.from({ length: 10 }, (_, i): [number, number, 'wall'] => [11, 5 + i, 'wall']),
          ...Array.from({ length: 14 }, (_, i): [number, number, 'wall'] => [13, 1 + i, 'wall']),
        ],
      ),
      ...patch(
        upstairs([[14, 2, 23, 7, 'carpet']], []),
        [
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']).filter(([x, y]) => !(x >= 13 && x <= 24 && y >= 1 && y <= 8)),
          ...Array.from({ length: 12 }, (_, i): [number, number, 'wall'] => [13 + i, 8, 'wall']),
          ...Array.from({ length: 8 }, (_, i): [number, number, 'wall'] => [13, 1 + i, 'wall']),
        ],
      ),
    ],
    restrooms: [[9, 6, 10, 8]],
    ground: [[0, 15, 25, 17, 'concrete'], [12, 0, 12, 14, 'concrete']],
    objects: [
      // The centre: the monitoring wall and desks, the rounds board, the records; the parts and gear behind; the restroom.
      o('etMonitorWall', 2, 10), o('monitorDesk', 2, 12, 'up'), o('monitorDesk', 3, 12, 'up'), o('monitorDesk', 4, 12, 'up'), o('etRoundsBoard', 7, 10), o('etInspectDesk', 8, 12, 'up'),
      o('partsCabinet', 2, 6), o('partsCabinet', 3, 6), o('etSafetyRack', 4, 6),
      o('toilet', 10, 8, 'left'), o('sink', 10, 6, 'left'),
      o('elevatorVan', 3, 15),
      // The building: the lift being serviced behind its barriers, the stairs to the roof; the management office; the hall's notices.
      o('elevatorMockup', 15, 2), o('etServiceBarrier', 15, 4), o('stairs', 19, 7, 'right'),
      o('officeDesk', 15, 9), o('archiveShelf', 14, 9), o('salMeetingChair', 15, 12, 'up'), o('salMeetingChair', 16, 12, 'up'),
      o('whiteboard', 23, 11, 'left'), o('plant', 19, 13),
      // The machine room on the roof, over the shaft: the traction machine, the governor, the controller.
      up('motorBench', 15, 2), up('etGovernor', 17, 2), up('etControlCabinet', 20, 2), up('etSafetyRack', 22, 2),
    ],
    coworkers: crew(['우승강 센터장', '권로프 정비원', '하안전 검사원'], ['#2e7d32', '#43a047', '#455a64']),
    // In the management office.
    clients: [{ noun: '건물 관리소장', socials: ['quoteJob', 'explainWork'], spots: [[15, 11], [16, 11]], max: 1, every: 60, patience: 120 }],
    alarm: { notice: '🆘 엘리베이터 갇힘 신고예요! 서비스 차량으로 출동하세요', done: '🛗 갇힌 분들을 무사히 구출했어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 119가 먼저 구출했어요 (성과 감소)', interaction: 'trappedRescue', every: [180, 300], window: 30 },
    tasks: [task('check', '정기 점검', ['routineCheck']), task('service', '승강기 점검·정비', ['practiceRepair', 'serviceMotor'], 2), task('monitor', '원격 감시', ['remoteMonitor'])],
    extra: [task('parts', '부품 정리', ['orderParts']), task('machine', '기계실 장비 점검', ['etPanelCheck', 'etGovernorTest']), task('dispatch', '갇힘 응대 · 배차', ['etTrapCall', 'etDispatchCrew']), task('load', '장비 · 합격증 챙기기', ['etLoadVan', 'etCheckGear', 'etIssueCert']), task('report', '점검 보고서', ['writeReport']), task('clients', '관리소장 상담', ['quoteJob', 'explainWork']), boss('센터장님께 점검 보고')],
    work: ['routineCheck', 'trappedRescue', 'practiceRepair', 'serviceMotor', 'remoteMonitor', 'orderParts', 'writeReport', 'attendMeeting', 'quoteJob', 'explainWork', 'etTrapCall', 'etLoadVan', 'etPanelCheck', 'etGovernorTest', 'etDispatchCrew', 'etIssueCert', 'etCheckGear'],
    skill: 'handiness',
    floors: { tile: 'monoTile', carpet: 'slateStone' },
    wall: 'creamPlain',
  },
  fisher: {
    careerId: 'fisher',
    name: '어항',
    icon: '🎣',
    // A 어항 (2026-11-04, the layout audit, replacing a 2-tile strip of water with two boat-sized toys and a farmhouse): the harbour's
    // water with a coastal boat (a 9.77톤 one is about 19 m) lying alongside the quay; on the quay the ice plant's chute and the tide
    // board. Behind it the 수협 위판장, a roof on columns over the concrete floor open to the quay, where the catch is laid out in rows
    // of boxes by grade, the captain rings the bell at its entrance and the auctioneer walks from pile to pile, the price board on a
    // column, the live tanks along its side. The buyer's refrigerated truck backs up to it from the road. Beside it the 위판 office,
    // the gear store and the fishermen's rest room with its restroom; the nets mended on the open ground, the squid dried at the
    // lot's edge away from the auction.
    tiles: () =>
      patch(
        building(
          [[17, 8, 19, 10, 'wood'], [17, 12, 19, 13, 'tile'], [21, 8, 23, 13, 'wood']],
          [[16, 9], [16, 12], [22, 7], [22, 11], [12, 14]],
        ),
        [
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'water' | 'grass'] => [i % 26, Math.floor(i / 26), Math.floor(i / 26) <= 4 ? 'water' : 'grass']).filter(([x, y]) => !(x >= 16 && x <= 24 && y >= 7 && y <= 14)),
          [12, 14, 'path'], [21, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'wall'],
        ],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 5, 25, 6, 'quayConcrete'], [0, 7, 15, 14, 'concrete'], [9, 13, 15, 17, 'asphalt']],
    objects: [
      // The water and the quay.
      o('fhBoat', 4, 1), o('hbQuayEdge', 0, 5), o('fhIce', 21, 5), o('fhTideBoard', 1, 6, 'up'), o('fhFloats', 24, 6),
      // The 위판장: the roof, the bell at its entrance, the boxes in rows, the auctioneer's tally table, the price board, the live tanks.
      o('fhMarketRoof', 1, 7), o('fhAuctionBell', 14, 7),
      o('fishCrates', 3, 8), o('fishCrates', 4, 8), o('fishCrates', 5, 8), o('fishCrates', 7, 8), o('fishCrates', 8, 8), o('fishCrates', 9, 8),
      o('fishCrates', 3, 10), o('fishCrates', 4, 10), o('fishCrates', 5, 10), o('fishCrates', 7, 10), o('fishCrates', 8, 10),
      o('fishAuction', 11, 9), o('fhBidBoard', 13, 8), o('fhLiveTank', 1, 9, 'right'), o('fhLiveTank', 1, 11, 'right'),
      o('fhReeferTruck', 13, 13),
      // The nets mended on the open ground; the squid dried at the edge.
      o('netRack', 5, 13), o('netRack', 8, 13), o('fhSquid', 1, 13),
      // The 위판 office; the gear store; the rest room and its restroom.
      o('fhOfficeDesk', 17, 8), o('fhPots', 17, 13, 'up'), o('toolWall', 19, 12, 'left'),
      o('fridge', 21, 8), o('sofa', 23, 8, 'left'), o('coffeeMaker', 21, 10, 'up'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
    ],
    coworkers: crew(['최바다 선장', '윤파도 갑판장', '강물결 선원'], ['#0d47a1', '#1976d2', '#ffb300']),
    // Buyers at the auction floor.
    clients: [{ noun: '수산물 상인', socials: ['haggleFish', 'shareFishTip'], spots: [[6, 11], [10, 12], [12, 11]], max: 2, every: 50, patience: 100 }],
    alarm: { notice: '🐟 고등어 떼가 몰려왔대요! 어선으로 출항하세요', done: '🐟 만선으로 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 출항이 늦어 어군을 놓쳤어요 (성과 감소)', interaction: 'fishRun', every: [150, 240], window: 30 },
    tasks: [task('fishing', '조업', ['goFishingTrip']), task('nets', '그물 손질', ['mendNets', 'fhBaitPots']), task('sort', '어획물 선별', ['sortCatch', 'fhIceCrates', 'fhTankCheck'])],
    extra: [task('auction', '위판', ['sellAtAuction', 'fhPostBid']), task('tools', '장비 정리', ['organizeTools']), task('ready', '출항 준비', ['fhReadyBoat', 'fhReadTide', 'fhLogPort']), task('squid', '오징어 말리기', ['fhHangSquid']), task('traders', '상인 응대', ['haggleFish', 'shareFishTip']), boss('선장님께 어획 보고')],
    work: ['goFishingTrip', 'fishRun', 'fhReadyBoat', 'mendNets', 'fhBaitPots', 'sortCatch', 'fhIceCrates', 'fhTankCheck', 'fhHangSquid', 'sellAtAuction', 'fhPostBid', 'fhReadTide', 'fhLogPort', 'organizeTools', 'haggleFish', 'shareFishTip'],
    skill: 'fishing',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  fishFarmer: {
    careerId: 'fishFarmer',
    name: '양식장',
    icon: '🐟',
    // A 육상 수조식 넙치 양식장 on the coast, as Jeju's are (2026-11-05, the layout audit, replacing a yard of aquarium-sized tanks in
    // the open, abalone cages on the concrete and net pens in a strip of sea: a land farm and a sea farm mixed). The sea along the
    // back and the intake main running out into it to the pump house; the 양식동, a roofed shed of three 8 m round concrete tanks
    // in a row (fed by their auto-feeders, walked round on the rim), the abalone troughs with their shelter plates along its front;
    // the feed store beside it. Off the shed the closed 종묘실 (the fry rack and the small rearing tanks, where the feeding and the
    // checks are done by hand) and the farm office with its sensor terminal and its restroom. In front, by the road, the 선별·출하장
    // under its roof, where the fish are graded, iced and boxed, and the 활어차 backed up to it.
    tiles: () =>
      patch(
        building(
          [[4, 4, 18, 9, 'tile'], [20, 4, 23, 7, 'tile'], [20, 9, 23, 13, 'wood']],
          [[7, 10], [16, 10], [3, 8], [19, 5], [19, 9], [20, 14]],
        ),
        [
          ...Array.from({ length: 26 * 3 }, (_, i): [number, number, 'water' | 'grass'] => [i % 26, Math.floor(i / 26), Math.floor(i / 26) <= 1 ? 'water' : 'grass']),
          ...Array.from({ length: 3 * 12 }, (_, i): [number, number, 'grass'] => [i % 3, 3 + Math.floor(i / 3), 'grass']),
          ...Array.from({ length: 16 * 4 }, (_, i): [number, number, 'grass'] => [3 + (i % 16), 11 + Math.floor(i / 16), 'grass']),
          [21, 12, 'wall'], [21, 13, 'door'], [22, 11, 'wall'], [23, 11, 'wall'],
        ],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 2, 25, 2, 'quayConcrete'], [0, 3, 2, 14, 'concrete'], [3, 11, 18, 14, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The sea wall, the intake main out into the sea; the pump house and the feed store beside the shed.
      o('hbQuayEdge', 0, 2), o('yaIntake', 0, 2), o('yaPump', 0, 3, 'right'), o('yaFeedStore', 0, 6, 'right'), o('yaLamp', 0, 10),
      // The 양식동: the three grow-out tanks, the abalone troughs along the walkway.
      o('yaGrowTank', 4, 4), o('yaGrowTank', 9, 4), o('yaGrowTank', 14, 4),
      o('shellLine', 4, 9, 'up'), o('shellLine', 9, 9, 'up'), o('shellLine', 14, 9, 'up'), o('toolWall', 17, 9, 'up'),
      // The 종묘실: the fry rack, the two rearing tanks.
      o('yaHatchery', 20, 4), o('fishTank', 20, 6, 'up'), o('fishTank', 22, 6, 'up'),
      // The office: the sensor terminal, the desk, the kettle; the restroom.
      o('waterSensor', 23, 9), o('officeDesk', 22, 9), o('coffeeMaker', 21, 11, 'left'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      // The 선별·출하장 by the road: the roof, the grading bars, the harvest table, the ice and boxes; the 활어차 backed up.
      o('yaCanopy', 4, 12), o('yaGrade', 5, 12), o('harvestNet', 8, 12), o('yaShip', 5, 14, 'up'),
      o('yaLiveTruck', 14, 11), o('yaLamp', 17, 12),
    ],
    coworkers: crew(['문물빛 대표', '조수온 기술자', '허전복 관리인'], ['#00838f', '#26c6da', '#80deea']),
    // The buyers looking over the graded fish at the 출하장.
    clients: [{ noun: '활어 상인', socials: ['explainFarming', 'sellFresh'], spots: [[10, 13], [11, 12]], max: 2, every: 60, patience: 120 }],
    alarm: { notice: '🫧 수조 산소가 부족해요! 양식 수조로 가세요', done: '🫧 산소를 채워 물고기들이 다시 힘차게 헤엄쳐요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 일부가 폐사했어요 (성과 감소)', interaction: 'oxygenAlarm', every: [180, 300], window: 30 },
    tasks: [task('feed', '사료 주기', ['feedFish', 'yaFillFeeder'], 2), task('water', '수질 검사', ['checkWater', 'yaCheckPump']), task('shell', '전복 돌보기', ['tendShellfish'])],
    extra: [task('sensor', '센서 감시', ['monitorSensors']), task('harvest', '출하 작업', ['harvestFish', 'yaGradeFish', 'yaPackIce']), task('fry', '치어 돌보기', ['yaTendFry']), task('buyers', '활어 상인 응대', ['explainFarming', 'sellFresh']), boss('대표님께 작황 보고')],
    work: ['feedFish', 'yaFillFeeder', 'checkWater', 'yaCheckPump', 'oxygenAlarm', 'tendShellfish', 'monitorSensors', 'yaTendFry', 'harvestFish', 'yaGradeFish', 'yaPackIce', 'organizeTools', 'explainFarming', 'sellFresh'],
    skill: 'fishing',
    floors: { wood: 'oakWood', tile: 'slateStone' },
    wall: 'creamPlain',
  },
  haenyeo: {
    careerId: 'haenyeo',
    name: '해녀의 집',
    icon: '🤿',
    // A 어촌계's shore on Jeju (2026-11-05, the layout audit, replacing a two-tile strip of sea that read as a canal and a site office on
    // the lawn): the sea is open across the top of the lot to the horizon, breaking on the black lava. Along the waterline the three
    // ledges the women go in from, their floats heaped by one, the tide calendar. Behind them the old bulteok, its fire still lit,
    // and the 해녀 작업장 under its roof, where the catch is cleaned, weighed into the 어촌계's book and iced for the 출하, the tewak
    // and nets mended beside it, the suits hung to dry. On the shore the seaweed drying, stone walls along the road. The 해녀의 집
    // stands on the sea wall: the 해녀 탈의장 on its sea side (the cubbies and hooks, hot showers, the heater, the restroom) and the
    // 해녀의 집 restaurant on its road side, its kitchen and tables, the counter selling the morning's catch at its door.
    tiles: () =>
      patch(
        building([[17, 6, 20, 8, 'tile'], [22, 6, 23, 7, 'tile'], [17, 10, 23, 13, 'wood']], [[16, 7], [21, 7], [16, 13], [20, 14]]),
        [
          // The sea across the top; the shore round the 해녀의 집.
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'water' | 'grass'] => [i % 26, Math.floor(i / 26), Math.floor(i / 26) <= 4 ? 'water' : 'grass']).filter(([x, y]) => y <= 4 || x < 16 || x > 24),
        ],
      ),
    restrooms: [[22, 6, 23, 7]],
    objects: [
      o('hyShore', 0, 5), o('hySea', 15, 14),
      // The waterline: the ledges, the floats, the tide calendar.
      o('diveSpot', 0, 5), o('hyFloats', 2, 5), o('diveSpot', 4, 5), o('diveSpot', 8, 5), o('hyTide', 10, 5),
      // The bulteok; the 작업장 (the scale and its book, the cleaning table, the ice boxes, the tewak frames, the suits drying).
      o('hyFirewood', 5, 7), o('bulteok', 5, 8),
      o('hyWorkShed', 10, 6), o('hyIceBoxes', 14, 6), o('hyScale', 11, 7), o('catchTable', 13, 7), o('tewakRack', 10, 9), o('tewakRack', 11, 9), o('hySuitLine', 13, 9),
      // The shore: the seaweed drying, the stone walls by the road.
      o('hyWeedRack', 1, 10), o('hyWall', 0, 14), o('hyWall', 5, 14),
      // The 해녀의 집. The 탈의장 and its restroom.
      o('hyChangeWall', 17, 6), o('hyChangeWall', 19, 6), o('hyHeater', 17, 8), o('shower', 19, 8, 'up'), o('shower', 20, 8, 'up'),
      o('toilet', 23, 6, 'left'), o('sink', 23, 7, 'left'),
      // The restaurant: two tables, the kitchen; the counter at its door.
      o('diningTable', 17, 11), o('diningChair', 17, 12, 'up'), o('diningChair', 18, 12, 'up'),
      o('diningTable', 20, 11), o('diningChair', 20, 10), o('diningChair', 21, 10), o('diningChair', 20, 12, 'up'), o('diningChair', 21, 12, 'up'),
      o('lineStove', 23, 10, 'left'), o('fridge', 23, 12, 'left'),
      o('hyCounter', 13, 11, 'right'),
    ],
    coworkers: crew(['고순덕 해녀회장', '양미자 상군 해녀', '김해솔 중군 해녀'], ['#ff7043', '#ffab91', '#4fc3f7']),
    // At the counter by the door and in the restaurant.
    clients: [{ noun: '관광객', socials: ['tellHaenyeoStory', 'sellSeafood'], spots: [[12, 12], [19, 13], [22, 11]], max: 2, every: 50, patience: 100 }],
    alarm: { notice: '🐚 소라 채취가 열렸어요! 물질 포인트로 가세요', done: '🐚 망사리가 가득 찼어요! 성과가 크게 올라요', missed: '⌛ 물때를 놓쳤어요 (성과 감소)', interaction: 'seasonOpen', every: [120, 200], window: 30 },
    // A six-hour day in the water: one of each is a day's work.
    tasks: [task('dive', '물질', ['freeDive']), task('clean', '해산물 손질', ['cleanSeafood', 'hyWeigh']), task('gear', '장비 손질', ['repairGear', 'hyHangSuit'])],
    extra: [task('bulteok', '불턱에서 쉬며 이야기', ['warmUp']), task('tourists', '관광객 응대', ['tellHaenyeoStory', 'sellSeafood']), task('season', '소라 채취', ['seasonOpen']), task('tide', '물때 달력 보기', ['hyMarkTide']), task('weed', '미역 말리기', ['hyDryWeed']), task('counter', '식당 상차림', ['hyServe']), boss('해녀회장님께 인사')],
    work: ['freeDive', 'seasonOpen', 'warmUp', 'cleanSeafood', 'repairGear', 'hyHangSuit', 'hyMarkTide', 'hyWeigh', 'hyDryWeed', 'hyServe', 'tellHaenyeoStory', 'sellSeafood'],
    skill: 'fishing',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  forester: {
    careerId: 'forester',
    name: '국유림 관리소',
    icon: '🌲',
    // A 국유림관리소 and the forest it looks after (2026-11-05, the layout audit, replacing a bare dirt yard with the thinning, the
    // lookout and the seedling benches out in the open in front of a farmhouse). The forest fills the lot, pine and oak close
    // together. The 임도 comes in from the street up its east side and along under the ridge; off it, in clearings among the trees,
    // the stands being thinned, the measured pine of the sample plot and the pine-wilt trap, the logs stacked at the landing; below,
    // the 조림지, a logged slope planted in rows of young trees, the pots waiting at its edge. Up the west edge the 등산로 climbs
    // from the trailhead on the street (the 입산 신고대, the trail sign) to the lookout on the bare summit, the work kept apart from it
    // by a 통제선. By the gate the office: the 산불 상황실 (the desk with its radio and map, the patrol board), the 장비 창고 (the
    // saws and brush cutters on the wall, the backpack pumps, rakes and flappers), the 휴게실 and the restroom; the 진화 차량 in the
    // yard nose to the street.
    tiles: () =>
      patch(
        building(
          [[17, 2, 23, 4, 'wood'], [17, 6, 18, 10, 'tile'], [20, 6, 23, 7, 'wood'], [20, 8, 21, 8, 'wood'], [20, 9, 20, 10, 'wood'], [22, 9, 23, 10, 'tile']],
          [[16, 3], [18, 11], [20, 11], [21, 10]],
        ),
        [
          // Not the house shell: the forest and the office by the gate.
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !(x >= 16 && x <= 24 && y >= 1 && y <= 11)),
        ],
      ),
    restrooms: [[22, 9, 23, 10]],
    ground: [[16, 12, 25, 14, 'concrete']],
    objects: [
      o('fgGround', 0, 2), o('fgHills', 0, 0),
      // Under the ridge: the lookout on the summit; off the 임도, the thinning, the sample pine, the trap.
      o('fireWatchTower', 1, 2), o('fgWoodT', 2, 2), o('thinningSite', 4, 2), o('fgMeasure', 7, 2), o('fgPineTrap', 10, 2), o('fgWoodT', 12, 2), o('fgWoodT', 14, 2),
      // The forest south of the 임도: stands, a clearing being thinned, the landing with its logs.
      o('fgWood', 2, 4), o('fgWoodW', 4, 4), o('fgWood', 7, 4), o('fgLogs', 10, 4), o('fgWood', 11, 5),
      o('fgWoodW', 2, 6), o('thinningSite', 6, 6), o('fgWood', 9, 6),
      o('fgWood', 2, 8), o('fgWoodW', 5, 8), o('fgWood', 9, 8), o('fgWood', 11, 7),
      o('fgWoodT', 15, 4, 'left'), o('fgWoodT', 15, 6, 'left'), o('fgWoodT', 15, 8, 'left'), o('fgWoodT', 15, 10, 'left'),
      // The 조림지 and the pots waiting at its edge.
      o('fgPlantation', 4, 10), o('saplingBed', 5, 10), o('saplingBed', 9, 10),
      // The trailhead: the trail sign up the 등산로, the 입산 신고대; the 임도 sign at the road in.
      o('trailSign', 0, 8), o('fgVisitorBoard', 2, 13), o('fgRoadSign', 15, 13),
      // The office: the 산불 상황실; the 장비 창고; the 휴게실 and the restroom.
      o('plant', 17, 2), o('fgDesk', 19, 2), o('fgPatrolBoard', 21, 2),
      o('toolWall', 17, 6), o('fgFireShed', 17, 8, 'right'),
      o('sofa', 20, 6), o('coffeeMaker', 22, 6), o('fridge', 23, 6),
      o('toilet', 23, 9, 'left'), o('sink', 23, 10, 'left'),
      // The 진화 차량 in the yard, nose to the street.
      o('forestTruck', 17, 12, 'left'),
    ],
    coworkers: crew(['임푸른 소장', '송산림 기사', '나도토리 숲해설가'], ['#2e7d32', '#558b2f', '#8d6e63']),
    // Hikers at the trailhead.
    clients: [{ noun: '등산객', socials: ['guideForest', 'warnHikers'], spots: [[1, 13], [0, 12], [1, 11]], max: 2, every: 50, patience: 100 }],
    alarm: { notice: '🔥 산불 신고가 들어왔어요! 진화 차량으로 출동하세요', done: '🌲 초기에 불을 잡아 숲을 지켰어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 헬기가 진화했어요 (성과 감소)', interaction: 'wildfireCall', every: [200, 320], window: 30 },
    tasks: [task('plant', '묘목 심기', ['plantSaplings']), task('thin', '숲가꾸기', ['thinTrees']), task('watch', '산불 감시', ['watchForFire'])],
    extra: [task('trail', '숲길 정비', ['maintainTrail']), task('tools', '장비 정리', ['organizeTools', 'fgCheckGear', 'fgCheckTruck']), task('hikers', '등산객 응대', ['guideForest', 'warnHikers', 'fgSignIn']), task('measure', '표준목 측정', ['fgMeasureTree']), task('trap', '매개충 트랩 확인', ['fgCheckTrap']), task('patrol', '순찰 구역 정하기', ['fgPatrol']), task('log', '산림 일지', ['fgWriteLog']), boss('소장님께 순찰 보고')],
    work: ['plantSaplings', 'thinTrees', 'watchForFire', 'maintainTrail', 'wildfireCall', 'organizeTools', 'fgCheckGear', 'fgCheckTruck', 'fgMeasureTree', 'fgCheckTrap', 'fgPatrol', 'fgSignIn', 'fgWriteLog', 'guideForest', 'warnHikers'],
    skill: 'gardening',
    floors: { wood: 'oakWood', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  convenienceManager: {
    careerId: 'convenienceManager',
    name: '편의점',
    icon: '🏪',
    // A 편의점 on the ground floor of a row of shops (2026-11-05, the layout audit, replacing a building on a lawn entered through a
    // corridor with the window bar in it, the till in the far corner). Through the automatic glass door the shop is one room: the till
    // just inside, beside the door where it sees who comes and goes, the tobacco shelf behind the staff and the hot case at its end,
    // the parcel terminal on the staff's side; the gondolas in two back-to-back rows; along the back wall the lunch chiller and the
    // drinks coolers, filled from the stock room behind them, its door beside them; the window bar along the glass with the hot water
    // and the cup ramen by it, the ATM on the side wall. Behind, staff only: the stock room (the delivery crates, the parcel shelves,
    // spare stock, the freezer), the small office with the ordering terminal and the lockers, and the staff restroom. Parasol tables
    // and the A-board on the pavement; the 분식집 next door.
    tiles: () =>
      shopUnit(
        18,
        1,
        [[2, 2, 10, 4, 'tile'], [12, 2, 14, 4, 'tile'], [16, 3, 17, 4, 'tile'], [2, 6, 17, 13, 'tile']],
        [[10, 5], [13, 5], [15, 4], [12, 14]],
      ),
    restrooms: [[16, 3, 17, 4]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The stock room; the office; the restroom.
      o('cvCrateStack', 2, 2), o('cvParcelRack', 5, 2), o('snackShelf', 7, 2), o('fridge', 9, 2), o('cvCrateStack', 2, 4, 'up'),
      o('orderTablet', 12, 2), o('gjLockers', 13, 2), o('coffeeMaker', 12, 4, 'up'),
      o('toilet', 17, 3, 'left'), o('sink', 17, 4, 'left'),
      // The back wall: the lunch chiller and the drinks coolers backing onto the stock room.
      o('cvLunchChiller', 2, 6), o('drinkCooler', 4, 6), o('drinkCooler', 5, 6), o('drinkCooler', 6, 6), o('drinkCooler', 7, 6), o('drinkCooler', 8, 6), o('drinkCooler', 9, 6),
      o('snackShelf', 11, 6), o('cvMopBin', 14, 6), o('plant', 16, 6),
      // The gondolas, back to back, the end-cap.
      o('snackShelf', 3, 8, 'up'), o('snackShelf', 3, 9), o('snackShelf', 6, 8, 'up'), o('snackShelf', 6, 9), o('snackShelf', 9, 8, 'up'), o('snackShelf', 9, 9), o('cvPromoStand', 12, 8), o('snackShelf', 13, 8, 'up'), o('snackShelf', 13, 9),
      // The till by the door: the hot case, the counter, the tobacco shelf behind, the parcel terminal.
      o('cvHotCase', 15, 10, 'right'), o('storeCounter', 15, 11, 'right'), o('cvCigShelf', 17, 10, 'left'), o('deliveryPOS', 17, 13, 'left'),
      // The window bar, the hot water and ramen; the ATM.
      o('cvWindowBar', 3, 13, 'up'), o('diningChair', 3, 12, 'down'), o('diningChair', 5, 12, 'down'), o('cvHotWater', 7, 13, 'up'), o('cvRamenShelf', 8, 13, 'up'), o('cvAtm', 2, 10, 'right'),
      // Out in front, as there always are; the 분식집 next door.
      o('cvShopFront', 1, 15), o('cvParasolTable', 6, 16), o('cvParasolTable', 15, 16), o('cvABoard', 14, 15), o('cvNeighbor', 19, 6),
    ],
    coworkers: crew(['김본사 SV', '이알바', '박야간'], ['#2e7d32', '#66bb6a', '#a5d6a7']),
    clients: [{ noun: '편의점 손님', socials: ['recommendDeal', 'helpFindItem'], spots: [[14, 11], [14, 12], [5, 7], [8, 10], [4, 12]], max: 3, every: 30, patience: 80 }],
    alarm: { notice: '🍙 점심시간이라 손님 줄이 길어요! 계산대로 가세요', done: '🍙 줄을 금세 줄였어요! 성과가 크게 올라요', missed: '⌛ 손님들이 기다리다 그냥 나갔어요 (성과 감소)', interaction: 'lunchRush', every: [180, 300], window: 30 },
    tasks: [task('till', '계산하기', ['ringUpStore'], 2), task('stock', '상품 진열', ['restockStore', 'stockDrinks', 'cvFaceRamen']), task('order', '발주 넣기', ['placeOrder'])],
    extra: [task('expiry', '유통기한 점검', ['checkSellBy', 'cvCheckLunch']), task('parcel', '택배 접수', ['acceptStoreParcel']), task('customers', '손님 응대', ['recommendDeal', 'helpFindItem', 'cvHelpAtm']), task('delivery', '납품 검수', ['cvCheckDelivery']), task('hot', '온장·온수 챙기기', ['cvFillHotCase', 'cvRefillWater']), task('clean', '매장 청소', ['cvWipeBar', 'cvEmptyBins', 'cvTidyTerrace']), boss('본사 SV님께 매출 보고')],
    work: ['ringUpStore', 'lunchRush', 'restockStore', 'checkSellBy', 'stockDrinks', 'acceptStoreParcel', 'placeOrder', 'recommendDeal', 'helpFindItem', 'cvFillHotCase', 'cvFaceRamen', 'cvRefillWater', 'cvCheckLunch', 'cvWipeBar', 'cvHelpAtm', 'cvCheckDelivery', 'cvEmptyBins', 'cvTidyTerrace'],
    skill: 'charisma',
    floors: { tile: 'creamTile' },
    wall: 'creamPlain',
  },
  insuranceAgent: {
    careerId: 'insuranceAgent',
    name: '보험 지점',
    icon: '🛡️',
    // An insurer's sales branch on a floor of an office building (2026-11-05, the layout audit, replacing a lone building on a lawn
    // with a customer centre's claims desk and children's corner, no room for the morning meeting, a corridor lobby of chairs and
    // the toilet inside the records room). A branch is where the 설계사 (FC) start the day and plan their visits, not where
    // customers come: they are seen at home or at work. In from the street the floor's lift hall and its restroom; through the
    // branch's glass door a small entrance (the sign, a sofa) with the two closed 상담실 for the customers who do come. On the left
    // the 교육장 where the day starts with the 조회 (the branch board with the month's results at the front, the whiteboard, the
    // rows of chairs) and training is given; on the right the FCs' office, rows of desks facing one way, the appointment desk, the
    // leaflets and the visit bags by its door; the 지점장실 behind it, and behind the 교육장 the contract records and the tea.
    tiles: () =>
      building(
        [[2, 2, 7, 9, 'carpet'], [9, 2, 11, 5, 'carpet'], [13, 2, 14, 5, 'carpet'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'carpet'], [2, 11, 7, 13, 'tile'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'wood']],
        [[8, 8], [5, 10], [10, 10], [10, 6], [14, 6], [15, 8], [20, 10], [14, 12], [12, 14]],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The entrance: the sign, the sofa; the two 상담실.
      o('bhBranchSign', 11, 7), o('sofa', 12, 9, 'up'), o('plant', 9, 7),
      o('consultBooth', 9, 2), o('salMeetingChair', 11, 2, 'left'), o('plant', 11, 5),
      o('consultBooth', 13, 2), o('salMeetingChair', 13, 5, 'up'),
      // The 교육장: the branch board, the whiteboard, the rows of chairs facing them.
      o('bhMorningBoard', 3, 2), o('whiteboard', 6, 2),
      o('salMeetingChair', 3, 5, 'up'), o('salMeetingChair', 4, 5, 'up'), o('salMeetingChair', 5, 5, 'up'), o('salMeetingChair', 6, 5, 'up'),
      o('salMeetingChair', 3, 7, 'up'), o('salMeetingChair', 4, 7, 'up'), o('salMeetingChair', 5, 7, 'up'), o('salMeetingChair', 6, 7, 'up'), o('plant', 2, 9),
      // The FCs' office: two rows of desks, the appointment desk, the leaflets, the visit bags.
      o('agentDesk', 17, 3), o('agentDesk', 18, 3), o('agentDesk', 19, 3), o('agentDesk', 20, 3), o('agentDesk', 21, 3),
      o('agentDesk', 17, 6), o('agentDesk', 18, 6), o('agentDesk', 19, 6), o('agentDesk', 20, 6), o('agentDesk', 21, 6),
      o('bhPlannerDesk', 22, 2), o('bhBrochureRack', 17, 9, 'up'), o('bhVisitBag', 21, 9, 'up'), o('plant', 23, 5), o('plant', 23, 9),
      // The contract records and the tea.
      o('coffeeMaker', 2, 11), o('salWaterCooler', 3, 11), o('fridge', 6, 11), o('bhRecordsWall', 2, 13, 'up'), o('archiveShelf', 6, 13, 'up'),
      // The 지점장실.
      o('officeDesk', 22, 11), o('bookshelf', 23, 11), o('sofa', 18, 13, 'up'), o('armchair', 20, 13, 'up'), o('archiveShelf', 18, 11), o('plant', 23, 13),
    ],
    coworkers: crew(['정실적 지점장', '나보장 팀장', '오설계 설계사'], ['#1565c0', '#1e88e5', '#64b5f6']),
    // On the entrance's sofa, or at a 상담실's booth.
    clients: [{ noun: '보험 고객', socials: ['explainPolicy', 'buildRapport'], spots: [[12, 8], [11, 3], [13, 4]], max: 2, every: 50, patience: 120 }],
    alarm: { notice: '💼 중소기업 대표가 단체 보험 상담하러 왔어요! 상담실로 가세요', done: '💼 단체 계약 성사! 성과가 크게 올라요', missed: '⌛ 기다리다 지친 대표가 돌아갔어요 (성과 감소)', interaction: 'bigContract', every: [180, 300], window: 40 },
    tasks: [task('design', '보장 설계', ['designPlan'], 2), task('calls', '고객 관리 전화', ['callClients']), task('consult', '보험 상담', ['insuranceConsult'])],
    extra: [task('morning', '아침 조회 참석', ['attendMeeting', 'bhMorning', 'bhPostResult']), task('clients', '고객 응대', ['explainPolicy', 'buildRapport']), task('report', '실적 보고서', ['readArchive', 'bhFindPolicy']), task('bhVisit', '고객 방문 준비', ['bhBookVisit', 'bhPlanWeek', 'bhPackBag']), task('bhLeaflet', '안내장 챙기기', ['bhBrochureStock', 'bhBrochureHand']), boss('지점장님께 실적 보고')],
    work: ['designPlan', 'callClients', 'insuranceConsult', 'bigContract', 'attendMeeting', 'readArchive', 'explainPolicy', 'buildRapport', 'bhMorning', 'bhPostResult', 'bhBookVisit', 'bhPlanWeek', 'bhBrochureStock', 'bhBrochureHand', 'bhFindPolicy', 'bhPackBag'],
    skill: 'charisma',
    floors: { carpet: 'slateStone', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  callCenter: {
    careerId: 'callCenter',
    name: '고객센터',
    icon: '📞',
    // A call centre on a floor of an office building (2026-11-05, the layout audit, replacing a lone building on a lawn with a
    // visitors' lobby of waiting chairs no caller ever sits in, a records room of paper files, the counsellors' rest a tea corner
    // in that lobby, training a set in the QA room, and the toilet between the call floor and the lobby). No one calls in person:
    // from the floor's lift hall (its restroom beside it) the way in is through the badge gate, the lockers where phones and bags
    // are left, the wall of thanks; then the call floor either side, rows of partitioned seats with the team's lead seat at the end
    // of each row, the binders and the supervisor's listening desk on the left, the board of waiting calls and the quiet booth for
    // the hard calls on the right. Off the gate, the QA room where calls are listened back; behind the floors, the rest room with
    // its door (the law asks for one for phone counsellors: the tea, the massage chair, the sofa) and the training room.
    tiles: () =>
      building(
        [[2, 2, 7, 9, 'carpet'], [9, 2, 14, 5, 'carpet'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'carpet'], [2, 11, 7, 13, 'wood'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'carpet']],
        [[8, 8], [5, 10], [10, 10], [12, 6], [15, 8], [20, 10], [14, 12], [12, 14]],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The way in: the badge gate, the lockers, the wall of thanks, the sign.
      o('sgSpeedGate', 11, 9, 'up'), o('clsLockers', 9, 7), o('csThanksWall', 13, 7), o('csCenterSign', 14, 9),
      // The left call floor: the binders, the supervisor's desk, two rows with the lead's seat at each end.
      o('csFaqShelf', 2, 2), o('csSupervisorDesk', 6, 2),
      o('callBooth', 2, 4), o('callBooth', 3, 4), o('callBooth', 4, 4), o('callBooth', 5, 4), o('csTeamDesk', 6, 4),
      o('callBooth', 2, 7), o('callBooth', 3, 7), o('callBooth', 4, 7), o('callBooth', 5, 7), o('csTeamDesk', 6, 7),
      // The right call floor: the board, the quiet booth, two rows.
      o('callBoard', 18, 2), o('csQuietBooth', 22, 2),
      o('callBooth', 17, 4), o('callBooth', 18, 4), o('callBooth', 19, 4), o('callBooth', 20, 4), o('csTeamDesk', 21, 4),
      o('callBooth', 17, 7), o('callBooth', 18, 7), o('callBooth', 19, 7), o('callBooth', 20, 7), o('csTeamDesk', 21, 7), o('plant', 23, 9),
      // The QA room.
      o('qaDesk', 9, 2), o('qaDesk', 10, 2), o('qaDesk', 11, 2), o('whiteboard', 13, 2), o('plant', 14, 5),
      // The rest room.
      o('csTeaCorner', 2, 11), o('csRestChair', 6, 11), o('sofa', 2, 13, 'up'), o('armchair', 5, 13, 'up'), o('fridge', 7, 13, 'up'),
      // The training room.
      o('whiteboard', 18, 11), o('csRolePlaySet', 21, 11), o('salMeetingChair', 18, 13, 'up'), o('salMeetingChair', 19, 13, 'up'), o('salMeetingChair', 20, 13, 'up'),
    ],
    coworkers: crew(['한경청 센터장', '윤친절 팀장', '서공감 상담원'], ['#6a1b9a', '#8e24aa', '#ba68c8']),
    alarm: { notice: '🚨 서비스 장애로 콜이 폭주하고 있어요! 콜 현황판으로 가세요', done: '📞 대기 콜을 모두 처리했어요! 성과가 크게 올라요', missed: '⌛ 대기 시간이 길어 불만이 쏟아졌어요 (성과 감소)', interaction: 'callSurge', every: [180, 300], window: 30 },
    tasks: [task('calls', '상담 전화 받기', ['answerCalls', 'csHardCall'], 2), task('notes', '상담 이력 정리', ['writeCallNote']), task('queue', '대기 콜 확인', ['checkQueue'])],
    extra: [task('qa', '녹취 검토', ['reviewCalls', 'csListenIn']), task('meeting', '상담 교육 참석', ['attendMeeting']), task('surge', '콜 폭주 대응', ['callSurge']), task('faq', '응대 문구 찾아보기', ['csLookup']), task('role', '상담 역할극', ['csRolePlay']), task('coach', '동료 코칭', ['csCoach']), task('breath', '숨 돌리기', ['csTea', 'csRest']), boss('센터장님과 면담하기')],
    work: ['answerCalls', 'writeCallNote', 'reviewCalls', 'checkQueue', 'callSurge', 'attendMeeting', 'csHardCall', 'csLookup', 'csListenIn', 'csRolePlay', 'csCoach', 'csTea', 'csRest'],
    skill: 'charisma',
    floors: { carpet: 'lilacCarpet', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  nailArtist: {
    careerId: 'nailArtist',
    name: '네일숍',
    icon: '💅',
    // A 네일숍 of about 18평 in a row of shops (2026-11-05, the layout audit, replacing a building on a lawn several times the size:
    // a big floor empty but for the tables on its back wall, a back room nobody could name, a staff room, and a lobby of an idol
    // poster and dining chairs). Through the glass front, its sign, the art samples and the prices in the window, the shop is one room:
    // the reception desk and the waiting loveseat with the design book just inside the door; further in the nail tables, two along
    // the back wall with the steriliser between them and one on the side wall, the colour walls, the sample wall and the parts
    // drawer; the two pedicure chairs in the window corner. Behind a door the one staff room, storeroom and pantry in one, with the
    // restroom off it. The side-dish shop and the hair salon either side.
    tiles: () =>
      shopUnit(
        13,
        6,
        [[2, 7, 6, 9, 'wood'], [2, 10, 12, 13, 'wood'], [8, 7, 9, 8, 'tile'], [11, 7, 12, 8, 'tile']],
        [[8, 9], [10, 8], [12, 14]],
      ),
    restrooms: [[11, 7, 12, 8]],
    ground: [[0, 0, 25, 5, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The nail tables and the steriliser; the colour walls, the parts drawer, the sample wall; the pedicure chairs.
      o('nailTable', 2, 7), o('naSterilizer', 4, 7), o('nailTable', 5, 7), o('nailTable', 2, 9, 'right'), o('polishShelf', 2, 11, 'right'),
      o('naPartsDrawer', 7, 10), o('polishShelf', 9, 10), o('polishShelf', 10, 10), o('naArtWall', 11, 10),
      o('pedicureChair', 2, 12, 'right'), o('pedicureChair', 2, 13, 'right'),
      // The reception and the waiting loveseat by the door.
      o('naReception', 10, 12, 'up'), o('naWaitSofa', 6, 13, 'up'), o('plant', 8, 13),
      // The staff room and the restroom.
      o('coffeeMaker', 8, 7), o('fridge', 9, 7), o('toilet', 12, 7, 'left'), o('sink', 12, 8, 'left'),
      // The street: the front; the shops either side.
      o('naShopFront', 1, 15), o('naNeighborA', 14, 6), o('naNeighborB', 19, 6),
    ],
    coworkers: crew(['윤손끝 원장', '하젤리 실장', '도큐티클 네일리스트'], ['#ec407a', '#f48fb1', '#ce93d8']),
    clients: [{ noun: '네일 손님', socials: ['pickDesign', 'nailChat'], spots: [[3, 12], [3, 13], [6, 12], [7, 12]], max: 2, every: 40, patience: 120 }],
    alarm: { notice: '💍 웨딩 네일 예약 손님이 왔어요! 네일 테이블로 가세요', done: '💍 신부가 손톱 사진을 몇 장이나 찍었어요! 성과가 크게 올라요', missed: '⌛ 예약 시간을 놓쳐 손님이 화났어요 (성과 감소)', interaction: 'weddingNails', every: [180, 300], window: 40 },
    tasks: [task('mani', '젤 네일 시술', ['doManicure', 'nailChat'], 2), task('art', '네일 아트', ['nailArt']), task('customers', '손님 응대', ['pickDesign', 'nailChat'])],
    extra: [task('pedi', '페디큐어', ['doPedicure']), task('polish', '컬러 정리', ['arrangePolish']), task('wedding', '웨딩 네일', ['weddingNails']), task('sterilize', '도구 소독', ['naSterilizeTools']), task('samples', '아트 샘플 만들기', ['naUpdateSamples']), task('parts', '스톤·파츠 정리', ['naSortParts']), task('booking', '예약 관리', ['naBooking']), boss('원장님께 디자인 보여 드리기')],
    work: ['doManicure', 'nailArt', 'weddingNails', 'doPedicure', 'arrangePolish', 'pickDesign', 'nailChat', 'naSterilizeTools', 'naUpdateSamples', 'naSortParts', 'naBooking'],
    skill: 'painting',
    floors: { wood: 'oakWood', carpet: 'lilacCarpet', tile: 'creamTile' },
    wall: 'lavenderStripes',
  },
  esthetician: {
    careerId: 'esthetician',
    name: '에스테틱',
    icon: '💆',
    // A 피부관리실 in a row of shops (2026-11-05, the layout audit, replacing a building on a lawn whose lobby was a corridor of three
    // chairs, with the consultation desk and the welcome tea in the middle of an open hall of three beds side by side, and no changing
    // room or shower). As a real one: through the glass door the reception, the front desk facing the door with the waiting sofa by
    // it, the consultation desk with the skin analyser beside it where the course is planned, the welcome-tea table at the window
    // and the home-care shelf; the customers' restroom off it. Through a door behind, a quiet corridor, the 앰플 bench at one end and
    // the towel warmer at the other, and off it the treatment rooms, windowless and dim: two of two beds with a curtain between them
    // and a towel warmer in each, the VIP room of one bed with its own changing screen, and the changing room with the lockers, the
    // gown screen and the shower. The pharmacy next door.
    tiles: () =>
      shopUnit(
        19,
        2,
        [[2, 3, 5, 6, 'carpet'], [7, 3, 10, 6, 'carpet'], [12, 3, 14, 6, 'carpet'], [16, 3, 18, 6, 'tile'], [2, 8, 18, 8, 'wood'], [2, 10, 18, 13, 'wood']],
        [[3, 7], [8, 7], [13, 7], [17, 7], [9, 9], [16, 13], [12, 14]],
        [[16, 11, 'wall'], [17, 11, 'wall'], [18, 11, 'wall'], [16, 12, 'wall'], [17, 12, 'tile'], [18, 12, 'tile'], [17, 13, 'tile'], [18, 13, 'tile']],
      ),
    restrooms: [[17, 12, 18, 13]],
    windowless: ['facialBed', 'clsLockers'],
    ground: [[0, 0, 25, 1, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The treatment rooms: two beds and a curtain between, a towel warmer; the VIP room; the changing room and its shower.
      o('facialBed', 2, 3), o('ptCurtain', 3, 3), o('facialBed', 4, 3), o('estTowelCabinet', 5, 3),
      o('facialBed', 7, 3), o('ptCurtain', 8, 3), o('facialBed', 9, 3), o('estTowelCabinet', 10, 3),
      o('facialBed', 12, 3), o('estChangingScreen', 14, 3), o('plant', 14, 6),
      o('clsLockers', 16, 3), o('shower', 18, 5, 'left'), o('estChangingScreen', 16, 6, 'up'),
      // The corridor: the 앰플 bench and the towel warmer at its ends.
      o('serumShelf', 2, 8, 'right'), o('estTowelCabinet', 18, 8, 'left'),
      // The reception: the home-care shelf, the welcome tea at the window, the consultation desk and the analyser, the waiting sofa,
      // the front desk facing the door.
      o('estRetailShelf', 2, 10, 'right'), o('lamp', 2, 13),
      o('estClientChair', 3, 13, 'up'), o('estTeaTable', 4, 13, 'up'), o('estClientChair', 5, 13, 'up'),
      o('estConsultDesk', 7, 12, 'up'), o('estClientChair', 7, 13, 'up'), o('estClientChair', 8, 13, 'up'), o('skinAnalyzer', 9, 12),
      o('sofa', 10, 10), o('estReception', 14, 11, 'up'), o('plant', 18, 10),
      o('toilet', 18, 13, 'left'), o('sink', 18, 12, 'left'),
      // The street: the front; the pharmacy next door.
      o('estShopFront', 1, 15), o('estNeighbor', 20, 2),
    ],
    coworkers: crew(['채윤기 원장', '하보습 실장', '진진정 관리사'], ['#f8bbd0', '#ffffff', '#b2dfdb']),
    // At the welcome tea, the consultation desk and the waiting sofa.
    clients: [{ noun: '관리 고객', socials: ['skinConsult', 'relaxChat'], spots: [[3, 12], [5, 12], [6, 13], [9, 13], [12, 10]], max: 2, every: 45, patience: 120 }],
    alarm: { notice: '👑 VIP 예약 고객이 도착했어요! 관리 베드로 가세요', done: '👑 VIP 고객이 연간 회원권을 끊었어요! 성과가 크게 올라요', missed: '⌛ 오래 기다리게 해 고객이 실망했어요 (성과 감소)', interaction: 'vipSpa', every: [180, 300], window: 40 },
    tasks: [task('facial', '얼굴 관리', ['doFacial'], 2), task('massage', '마사지', ['massageTherapy']), task('clients', '피부 상담', ['skinConsult', 'relaxChat'])],
    extra: [task('analyze', '피부 진단', ['analyzeSkin']), task('serum', '맞춤 앰플 조제', ['mixSerum']), task('vip', 'VIP 관리', ['vipSpa']), task('towels', '핫타월·가운 준비', ['estWarmTowels', 'estFoldGowns']), task('plan', '맞춤 관리 프로그램 짜기', ['estCarePlan']), task('tea', '웰컴 티 대접', ['estBrewTea']), task('homecare', '홈케어 제품 진열', ['estArrangeHomecare']), boss('원장님께 고객 보고')],
    work: ['doFacial', 'massageTherapy', 'vipSpa', 'analyzeSkin', 'mixSerum', 'skinConsult', 'relaxChat', 'estWarmTowels', 'estFoldGowns', 'estCarePlan', 'estBrewTea', 'estArrangeHomecare'],
    skill: 'charisma',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'creamPlain',
  },
  makeupArtist: {
    careerId: 'makeupArtist',
    name: '메이크업 숍',
    icon: '💄',
    // A wedding and event 메이크업 숍 in a row of shops (2026-11-05, the layout audit, replacing a building on a lawn whose lobby was a
    // corridor of three chairs with no desk, its big hall three vanities and an effects table in the middle of empty floor). As a real
    // one: through the glass door the front desk where the booking is made and paid, the waiting sofa, the cosmetics cases; the
    // customers' restroom off it. Through a door the make-up room: five vanities in a row along the mirror wall, the brush steriliser
    // at the end, and facing them the hair-styling chairs (a wedding shop does the hair too) with the tool carts between; the
    // personal-colour corners with their ring lights at either end. Off it the dressing room where the bride and the 한복 client change
    // (the gown and veil on their form, the rack, the changing screen, a chair), and the back room where the effects work for shoots is
    // done and the staff take their break. The bridal shop next door.
    tiles: () =>
      shopUnit(
        19,
        2,
        [[2, 3, 12, 9, 'wood'], [14, 3, 18, 5, 'carpet'], [14, 7, 18, 9, 'tile'], [2, 11, 18, 13, 'wood']],
        [[13, 4], [13, 8], [8, 10], [16, 13], [12, 14]],
        [[17, 11, 'wall'], [18, 11, 'wall'], [16, 12, 'wall'], [17, 12, 'tile'], [18, 12, 'tile'], [17, 13, 'tile'], [18, 13, 'tile']],
      ),
    restrooms: [[17, 12, 18, 13]],
    ground: [[0, 0, 25, 1, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The make-up room: the vanities along the mirror wall and the steriliser; the hair chairs facing them, the carts between; the
      // ring-light corners.
      o('makeupStation', 2, 3), o('makeupStation', 4, 3), o('makeupStation', 6, 3), o('makeupStation', 8, 3), o('makeupStation', 10, 3), o('muBrushSterilizer', 12, 3),
      o('salonStation', 3, 9, 'up'), o('cosmeticCart', 4, 9, 'up'), o('salonStation', 5, 9, 'up'), o('cosmeticCart', 6, 9, 'up'), o('salonStation', 10, 9, 'up'), o('cosmeticCart', 11, 9, 'up'),
      o('muRingDesk', 2, 6, 'right'), o('muClientChair', 3, 6, 'left'), o('muRingDesk', 12, 6, 'left'), o('muClientChair', 11, 6, 'right'),
      // The dressing room; the effects and staff room.
      o('muBridalCorner', 14, 3), o('wardrobeRack', 16, 3), o('estChangingScreen', 18, 3), o('armchair', 18, 5, 'left'),
      o('specialFxTable', 15, 7), o('coffeeMaker', 17, 7), o('fridge', 18, 7), o('sofa', 16, 9, 'up'),
      // The front: the cosmetics cases, the waiting sofa, the front desk; the restroom.
      o('muProductDisplay', 2, 11, 'right'), o('plant', 2, 13), o('sofa', 4, 13, 'up'), o('muReception', 9, 12, 'up'), o('muProductDisplay', 13, 11), o('plant', 16, 11, 'left'),
      o('toilet', 18, 13, 'left'), o('sink', 18, 12, 'left'),
      // The street: the front; the bridal shop next door.
      o('muShopFront', 1, 15), o('muNeighbor', 20, 2),
    ],
    coworkers: crew(['오윤광 원장', '배섀도 실장', '나블러셔 아티스트'], ['#ad1457', '#ec407a', '#212121']),
    // At the ring-light corners, in the dressing room and on the waiting sofa.
    clients: [{ noun: '메이크업 손님', socials: ['colorMatch', 'calmBride'], spots: [[3, 7], [11, 7], [17, 5], [4, 12], [5, 12]], max: 2, every: 45, patience: 120 }],
    alarm: { notice: '👰 신부 메이크업 예약 시간이에요! 화장대로 가세요', done: '👰 신부가 거울을 보고 감동했어요! 성과가 크게 올라요', missed: '⌛ 시간에 쫓겨 다른 아티스트가 맡았어요 (성과 감소)', interaction: 'brideMakeup', every: [180, 300], window: 40 },
    tasks: [task('makeup', '메이크업', ['applyMakeup'], 2), task('fx', '특수 분장 연습', ['specialEffects']), task('clients', '손님 응대', ['colorMatch', 'calmBride'])],
    extra: [task('brushes', '브러시 세척·소독', ['washMakeupBrushes', 'muSterilizeBrushes']), task('wardrobe', '의상·베일 맞춰 보기', ['tryOutfits', 'muFitVeil']), task('bride', '신부 메이크업', ['brideMakeup']), task('portfolio', '포트폴리오 올리기', ['muPortfolioPost']), task('drapes', '퍼스널 컬러 준비', ['muDrapeKit']), task('cosmetics', '화장품 진열 정리', ['muRestockCosmetics']), boss('원장님께 작품 보여 드리기')],
    work: ['applyMakeup', 'brideMakeup', 'washMakeupBrushes', 'specialEffects', 'tryOutfits', 'colorMatch', 'calmBride', 'muSterilizeBrushes', 'muFitVeil', 'muPortfolioPost', 'muDrapeKit', 'muRestockCosmetics'],
    skill: 'painting',
    floors: { wood: 'walnutWood', carpet: 'lilacCarpet', tile: 'creamTile' },
    wall: 'lavenderStripes',
  },
  bodyguard: {
    careerId: 'bodyguard',
    name: '경호 업체',
    icon: '🕶️',
    // A 경호 업체's office as one is (2026-11-05, the layout audit, replacing a lone house on a lawn that was mostly a checked gym, the
    // radio rack and the suit lockers among its mats and treadmills, a lobby of idol posters and kitchen chairs and the car on the grass).
    // In from the street the reception, the firm's name on its wall and a sofa, and the 상담실 off it where a client's risks are talked
    // over; down the corridor behind, the 사무실 (the desks, the schedule board), the 작전·상황실 (the route table, the briefing screen,
    // the CCTV and radio desk), the 장비실 where the radios and earpieces charge and the 탈의실 with the suits; the 훈련실, half the size it
    // was, for the mats, the screening gate and a treadmill, its restroom in the corner. The escort car in its bay beside the building,
    // nose to the street, so it drives straight out; the firm's sign on the pavement.
    tiles: () =>
      patch(
        building(
          [[2, 2, 8, 5, 'carpet'], [10, 2, 14, 5, 'carpet'], [16, 2, 18, 5, 'tile'], [20, 2, 23, 5, 'wood'], [2, 7, 23, 7, 'tile'], [2, 9, 8, 13, 'tile'], [10, 9, 14, 13, 'wood'], [16, 9, 18, 13, 'carpet']],
          [[8, 6], [12, 6], [17, 6], [21, 6], [7, 8], [12, 8], [15, 10], [12, 14]],
        ),
        [
          // The escort car's bay east of the building.
          ...Array.from({ length: 5 * 7 }, (_, i): [number, number, 'grass'] => [20 + (i % 5), 8 + Math.floor(i / 5), 'grass']),
          // The restroom in the training room's corner, its door in its own wall.
          [2, 11, 'door'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall'],
        ],
      ),
    restrooms: [[2, 12, 3, 13]],
    windowless: ['bgCommandDesk'],
    ground: [[20, 8, 24, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The 사무실: the desks, the schedule board.
      o('officeDesk', 3, 2), o('officeDesk', 5, 2), o('officeDesk', 7, 2), o('officeDesk', 3, 5, 'up'), o('whiteboard', 5, 5, 'up'), o('plant', 2, 5),
      // The 작전·상황실: the route table, the briefing screen, the CCTV and radio desk.
      o('routeMapTable', 11, 3), o('bgBriefScreen', 13, 2), o('bgCommandDesk', 10, 5, 'up'),
      // The 장비실: the radios and earpieces on charge. The 탈의실: the suits.
      o('radioRack', 16, 2), o('radioRack', 17, 2), o('plant', 18, 2),
      o('bgSuitLocker', 20, 2), o('bgSuitLocker', 21, 2), o('bgSuitLocker', 22, 2), o('plant', 23, 5),
      // The 훈련실: the mats, the screening gate, a treadmill; the restroom.
      o('sparringMat', 5, 9), o('sparringMat', 5, 13, 'up'), o('treadmill', 8, 9), o('bgMetalGate', 7, 13, 'up'),
      o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'),
      // The reception: the desk, the firm's name on the wall, the sofa.
      o('bgLogoWall', 13, 9), o('officeDesk', 10, 10, 'right'), o('naWaitSofa', 13, 13, 'up'), o('plant', 14, 11),
      // The 상담실: the low table, the client's sofa, the guard's armchair.
      o('diningTable', 17, 11), o('sofa', 17, 12, 'up'), o('armchair', 17, 10),
      // The escort car's bay; the firm's sign.
      o('escortCar', 22, 10, 'left'), o('bgFrontSign', 14, 15),
    ],
    coworkers: crew(['강철벽 대표', '문방패 팀장', '서그늘 경호원'], ['#212121', '#263238', '#37474f']),
    // In the 상담실, on the sofa across the table.
    clients: [{ noun: '의뢰인', socials: ['assessThreat', 'briefClient'], spots: [[17, 13], [18, 13]], max: 1, every: 70, patience: 120 }],
    alarm: { notice: '🎤 긴급 행사 경호 요청이에요! 경호 차량으로 출동하세요', done: '🕶️ 행사를 무사히 마쳤어요! 의뢰인이 크게 만족했어요. 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 팀이 투입됐어요 (성과 감소)', interaction: 'eventSecurity', every: [200, 320], window: 40 },
    tasks: [task('defense', '호신술 훈련', ['practiceDefense'], 2), task('escort', '수행 경호', ['escortVIP']), task('plan', '경호 동선 계획', ['planRoute'])],
    extra: [task('radio', '무전 장비 점검', ['checkRadios', 'bgRadioRelay']), task('fitness', '체력 단련', ['workout']), task('clients', '의뢰인 상담', ['assessThreat', 'briefClient']), task('cctv', '상황실 CCTV 관제', ['bgWatchCctv']), task('schedule', 'VIP 일정 브리핑', ['bgScheduleBrief']), task('suit', '경호 복장 갖추기', ['bgSuitUp']), task('screening', '검색대 훈련', ['bgScreeningDrill', 'bgTrayCheck']), boss('대표님께 경호 보고')],
    work: ['practiceDefense', 'planRoute', 'checkRadios', 'escortVIP', 'eventSecurity', 'workout', 'attendMeeting', 'assessThreat', 'briefClient', 'bgWatchCctv', 'bgRadioRelay', 'bgScheduleBrief', 'bgSuitUp', 'bgScreeningDrill', 'bgTrayCheck'],
    skill: 'fitness',
    floors: { tile: 'monoTile', carpet: 'slateStone', wood: 'oakWood' },
    wall: 'navyWainscot',
  },
  securityGuard: {
    careerId: 'securityGuard',
    name: '빌딩 보안실',
    icon: '🏢',
    // The ground floor of an office tower as the guards work it (2026-11-05, the layout audit, replacing a lone house on a lawn that was all
    // security office: a speed gate leading into a wall, the CCTV room and the 방재실 as two big rooms, the restroom in the CCTV room's
    // corner and a lobby of three chairs). In from the street the lobby is the biggest room: the guard's desk by the door where visitors
    // are signed in and given a pass, lost property beside it, the visitors' restroom; across it the line of speed gates, and past them
    // the lift hall with the patrol checkpoint. Off the lobby the 방재센터, one closed room where the CCTV wall, the fire panel, the
    // alarm panel, the radios on charge, the key cabinet and the patrol logs are kept; behind the lift hall the guards' rest room (the
    // lockers, the cot for the night shift, the table and the kettle). Outside, the car park's ramp with the barrier and its booth; the
    // tower's name on the pavement.
    tiles: () =>
      patch(
        building([[2, 2, 6, 6, 'tile'], [8, 2, 14, 7, 'tile'], [2, 8, 17, 13, 'tile'], [16, 2, 23, 6, 'wood']], [[4, 7], [15, 4], [12, 14]]),
        [
          // The car park's ramp east of the tower.
          ...Array.from({ length: 6 * 7 }, (_, i): [number, number, 'grass'] => [19 + (i % 6), 8 + Math.floor(i / 6), 'grass']),
          // The visitors' restroom in the lobby's corner, its door in its own wall.
          [2, 11, 'door'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall'],
        ],
      ),
    restrooms: [[2, 12, 3, 13]],
    windowless: ['sgFirePanel'],
    ground: [[19, 8, 24, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The 방재센터: the CCTV wall and the radios, the patrol logs, the alarm panel, the fire panel, the key cabinet.
      o('securityMonitor', 2, 2), o('securityMonitor', 4, 2), o('sgRadioDock', 6, 2), o('patrolLog', 2, 4), o('patrolLog', 4, 4),
      o('alarmPanel', 6, 4, 'left'), o('sgFirePanel', 2, 6, 'up'), o('keyCabinet', 6, 6, 'left'),
      // The lobby: the guard's desk by the door, lost property, the restroom; the speed gates across it.
      o('sgVisitorDesk', 5, 10, 'up'), o('sgLostFound', 2, 9, 'right'), o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'), o('plant', 17, 13), o('plant', 13, 13), o('htlLoungeSofa', 15, 12, 'up'), o('htlLoungeSofa', 15, 10), o('plant', 17, 10),
      o('plant', 8, 7), o('sgSpeedGate', 9, 7), o('sgSpeedGate', 11, 7),
      // The lift hall: the lifts, the patrol checkpoint.
      o('bldLift', 9, 2), o('bldLift', 12, 2), o('sgCheckpoint', 8, 4, 'right'), o('plant', 14, 6),
      // The guards' rest room: the lockers, the cot, the kettle and fridge, the table.
      o('clsLockers', 16, 2), o('clsLockers', 18, 2), o('fridge', 21, 2), o('coffeeMaker', 22, 2), o('bed', 23, 2),
      o('diningTable', 19, 5), o('diningChair', 19, 4), o('diningChair', 20, 4), o('diningChair', 19, 6, 'up'), o('diningChair', 20, 6, 'up'),
      // Outside: the car park's barrier and booth; the tower's sign.
      o('sgParkingGate', 20, 11), o('sgTowerSign', 14, 15),
    ],
    coworkers: crew(['안지킴 실장', '최야간 반장', '정순찰 보안요원'], ['#263238', '#37474f', '#455a64']),
    // At the guard's desk, stood to be signed in.
    clients: [{ noun: '방문객', socials: ['issuePass', 'giveDirections'], spots: [[5, 11], [6, 11]], max: 2, every: 60, patience: 90 }],
    alarm: { notice: '🚨 침입 경보가 울렸어요! 경보반으로 가세요', done: '🚨 확인해 보니 이상 없어요. 침착한 대응이었어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 경찰이 먼저 출동했어요 (성과 감소)', interaction: 'intrusionAlert', every: [180, 300], window: 30 },
    tasks: [task('cctv', 'CCTV 관제', ['watchCameras'], 2), task('patrol', '건물 순찰', ['buildingPatrol', 'sgTagCheckpoint']), task('log', '순찰 일지', ['writePatrolLog'])],
    extra: [task('keys', '출입 키 관리', ['manageKeys']), task('alarms', '방범·방재 설비 점검', ['testAlarms', 'sgFireCheck', 'sgGateCheck']), task('visitors', '방문객 응대', ['issuePass', 'giveDirections', 'sgIssueBadge']), task('radio', '무전 교신 점검', ['sgRadioCheck']), task('lost', '분실물 접수', ['sgLogLostItem']), boss('실장님께 근무 보고')],
    work: ['watchCameras', 'buildingPatrol', 'writePatrolLog', 'manageKeys', 'testAlarms', 'intrusionAlert', 'issuePass', 'giveDirections', 'sgIssueBadge', 'sgGateCheck', 'sgFireCheck', 'sgRadioCheck', 'sgLogLostItem', 'sgTagCheckpoint'],
    skill: 'logic',
    floors: { tile: 'monoTile' },
    wall: 'navyWainscot',
  },
  flightAttendant: {
    careerId: 'flightAttendant',
    name: '승무원 브리핑 센터',
    icon: '🛫',
    // An airline's 운항승무원센터 by the airport (2026-11-05, the layout audit, replacing a building on a lawn with a corridor lobby of
    // three chairs and the grooming mirror, one briefing room with the lockers in it, and the "gate" a booth on the grass by the road).
    // A cabin crew's day goes through it in order: in at the glass front to the crew lounge, shown up at the show-up desk (ID read,
    // breath tested) under the day's flight board; through to the locker room, the uniform and grooming checked at the mirrors, the
    // flight bag packed; into one of the two small briefing rooms, each crew round its table before its screen; out of the front to
    // the crew bus waiting nose to the street in its bay beside the door, which takes them to the aircraft. The training hall of the airline's own
    // building (mock cabin, galley, slide, safety demonstration kit) is on the same floor; the airport's fence and an airliner at its
    // stand are behind the lot.
    tiles: () =>
      patch(
        building(
          [[2, 2, 10, 8, 'tile'], [12, 2, 18, 5, 'carpet'], [12, 7, 18, 8, 'wood'], [14, 10, 18, 13, 'carpet'], [2, 10, 12, 10, 'tile'], [4, 11, 12, 11, 'tile'], [5, 12, 12, 13, 'tile'], [2, 12, 3, 13, 'tile']],
          // The training hall, the locker room and the second briefing room off the lounge; the first off the locker room; the restroom;
          // the front door.
          [[5, 9], [12, 9], [13, 11], [13, 6], [2, 11], [12, 14]],
        ),
        // The building ends at x 19; the crew bus's bay beside it.
        Array.from({ length: 5 * 14 }, (_, i): [number, number, 'grass'] => [20 + (i % 5), 1 + Math.floor(i / 5), 'grass']),
      ),
    restrooms: [[2, 12, 3, 13]],
    ground: [[20, 0, 25, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // Beyond the back fence, the airport.
      o('faApronView', 0, 0),
      // The training hall: the mock cabin and its galley, the slide, the safety demonstration kit.
      o('cabinMockup', 2, 2), o('faGalley', 9, 2, 'left'), o('evacSlide', 6, 6), o('safetyDemoKit', 2, 6),
      // The two briefing rooms: each crew's screen and table.
      o('faBriefBoard', 12, 2, 'right'), o('faBriefTable', 14, 2), o('faBriefBoard', 18, 10, 'left'), o('faBriefTable', 15, 11),
      // The locker room: the lockers, the grooming mirrors.
      o('faCrewLocker', 13, 8, 'up'), o('faGroomCorner', 16, 8, 'up'),
      // The crew lounge: the show-up desk under the flight board, the coffee, the sofas.
      o('faShowUpDesk', 6, 10), o('faFlightBoard', 9, 10), o('coffeeMaker', 11, 10),
      o('sofa', 5, 13, 'up'), o('sofa', 8, 13, 'up'), o('plant', 11, 13),
      o('toilet', 3, 13, 'up'), o('sink', 3, 12, 'left'),
      // The crew bus in its bay, nose to the street; the front.
      o('crewGate', 22, 8, 'left'), o('faFront', 1, 15),
    ],
    coworkers: crew(['한하늘 캐빈 매니저', '유미소 사무장', '진구름 승무원'], ['#1565c0', '#1e88e5', '#90caf9']),
    alarm: { notice: '🛫 아픈 승무원 대신 비행할 사람이 필요해요! 크루 버스로 가세요', done: '🛫 무사히 비행을 마쳤어요! 성과가 크게 올라요', missed: '⌛ 다른 대기 승무원이 대신 탔어요 (성과 감소)', interaction: 'standbyFlight', every: [200, 320], window: 40 },
    tasks: [task('flight', '비행 근무', ['workFlight']), task('service', '기내 서비스 연습', ['cabinService', 'faLoadCart'], 2), task('safety', '안전 시범', ['safetyDemo'])],
    extra: [task('brief', '비행 전 브리핑', ['faPreflightBrief', 'faFlightQuiz']), task('evac', '비상 탈출 훈련', ['evacDrill']), task('announce', '기내 방송 연습', ['cabinAnnounce']), task('uniform', '쇼업·유니폼 점검', ['faShowUp', 'faGroomCheck']), task('calm', '불안한 승객 응대', ['faCalmPassenger']), task('bag', '비행 가방 꾸리기', ['faPackBag']), boss('캐빈 매니저님께 비행 보고')],
    work: ['workFlight', 'standbyFlight', 'cabinService', 'cabinAnnounce', 'evacDrill', 'safetyDemo', 'faPreflightBrief', 'faFlightQuiz', 'faGroomCheck', 'faLoadCart', 'faCalmPassenger', 'faPackBag', 'faShowUp'],
    skill: 'empathy',
    floors: { carpet: 'sageCarpet', tile: 'creamTile', wood: 'oakWood' },
    wall: 'navyWainscot',
  },
  voiceActor: {
    careerId: 'voiceActor',
    windowless: ['dubbingBooth', 'narrationDesk', 'vaFoleyTable'],
    name: '녹음 스튜디오',
    icon: '🎙️',
    // A dubbing studio on one floor of a building in town (2026-11-04, the layout audit, replacing the hall plan's big windowed room
    // where the dubbing mics, the narration desks and the foley table stood together, with no control room glass, and a booth seen
    // through glass in the mixing room). A dub is recorded in one big soundproof room: the cast before the screen showing the
    // picture, sharing a few mics, a new actor at the back watching; through the glass the control room, the engineer at the
    // console, the director beside, the client on the sofa behind. A one-person booth with its own small control room for
    // narration and ads. Below: the foley room, the actors' room where the script is read through first (the cast board, the
    // rack of scripts, the mirror, the tea), the lobby, the kitchen and restroom. The booths and the foley room have no windows.
    tiles: () =>
      patch(
        building(
          [[2, 2, 9, 7, 'carpet'], [11, 2, 15, 7, 'wood'], [17, 2, 19, 7, 'carpet'], [21, 2, 23, 7, 'wood'], [2, 9, 4, 13, 'carpet'], [6, 9, 10, 13, 'wood'], [12, 9, 15, 13, 'tile'], [17, 9, 23, 13, 'tile']],
          [[8, 8], [12, 8], [20, 6], [21, 8], [5, 11], [11, 11], [16, 11], [12, 14]],
        ),
        [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 0, 25, 17, 'concrete']],
    objects: [
      // The dubbing room: the ensemble line before the picture, the two mic positions in their foam bays on the back wall, the
      // stand where a new actor watches, foam, the glass.
      o('sgFoamWall', 2, 2, 'right'), o('vaEnsembleLine', 3, 2), o('sgBoothWindow', 9, 3, 'left'),
      o('dubbingBooth', 2, 7, 'up'), o('dubbingBooth', 5, 7, 'up'), o('scriptStand', 8, 6, 'up'),
      // Its control room: the glass, the console turned to it, the director's desk, the client's sofa.
      o('sgControlWindow', 11, 3, 'right'), o('mixingConsole', 12, 3, 'right'), o('vaCrewDesk', 14, 5, 'left'), o('sofa', 14, 2),
      // The narration booth and its control room.
      o('narrationDesk', 17, 2), o('narrationDesk', 18, 2), o('sgBoothWindow', 19, 4, 'left'), o('sgFoamWall', 17, 7, 'up'),
      o('sgControlWindow', 21, 4, 'right'), o('officeDesk', 22, 4, 'right'), o('naWaitSofa', 22, 7, 'up'), o('plant', 23, 2),
      // The foley room.
      o('vaFoleyTable', 2, 9), o('sgFoamWall', 2, 13, 'up'),
      // The actors' room: the script rack, the mirror, the cast and session board, the table read, the tea corner.
      o('vaScriptRack', 6, 9), o('whiteboard', 9, 9), o('voiceMirror', 10, 13, 'up'), o('scriptTable', 7, 12, 'up'), o('salMeetingChair', 8, 13, 'up'), o('vaTeaCorner', 6, 13, 'up'),
      // The lobby, the kitchen, the restroom.
      o('officeDesk', 13, 9), o('plant', 15, 9), o('vaStudioSign', 14, 12), o('drWaitSeat', 14, 13, 'up'), o('drWaitSeat', 15, 13, 'up'),
      o('coffeeMaker', 17, 9), o('fridge', 18, 9), o('diningTable', 18, 12), o('diningChair', 18, 13, 'up'), o('diningChair', 19, 13, 'up'),
      o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
    ],
    coworkers: crew(['고음색 연출가', '나울림 선배 성우', '도목청 성우'], ['#4527a0', '#7e57c2', '#b39ddb']),
    // The client watches the session from the sofa behind the console, or the ad's from the narration control room.
    clients: [{ noun: '녹음 의뢰인', socials: ['directorNote'], spots: [[14, 3], [22, 6]], max: 1, every: 60, patience: 120 }],
    alarm: { notice: '🔴 방송 직전에 대사 수정이 들어왔어요! 더빙 부스로 가세요', done: '🔴 한 번에 재녹음을 끝냈어요! 성과가 크게 올라요', missed: '⌛ 다른 성우가 대신 녹음했어요 (성과 감소)', interaction: 'urgentDub', every: [180, 300], window: 30 },
    tasks: [task('dub', '캐릭터 더빙', ['dubCharacter'], 2), task('script', '대본 분석', ['studyScript']), task('warmup', '발성 연습', ['voiceWarmup'])],
    extra: [task('narr', '내레이션 녹음', ['recordNarration']), task('mix', '녹음본 확인', ['mixAlbum']), task('client', '의뢰인과 의견 나누기', ['directorNote']), task('ensemble', '단체 더빙', ['vaEnsemble', 'vaWalla']), task('foley', '효과음 만들기', ['vaFoleySteps', 'vaFoleyProps']), task('tea', '목 관리하기', ['vaTea']), task('take', '좋은 테이크 고르기', ['vaPickTake']), task('part', '배역 대본 찾기', ['vaPickScript']), boss('연출가님께 녹음본 들려 드리기')],
    work: ['dubCharacter', 'urgentDub', 'studyScript', 'voiceWarmup', 'recordNarration', 'mixAlbum', 'directorNote', 'vaEnsemble', 'vaWalla', 'vaFoleySteps', 'vaFoleyProps', 'vaPickScript', 'vaPickTake', 'vaTea'],
    skill: 'charisma',
    floors: { carpet: 'slateStone', tile: 'creamTile', wood: 'walnutWood' },
    wall: 'navyWainscot',
  },
  announcer: {
    careerId: 'announcer',
    windowless: ['anNewsSet', 'tsControlDesk', 'onAirBooth', 'mixingConsole', 'anRecordBooth'],
    name: '방송국 아나운서실',
    icon: '📺',
    // Two floors of a broadcaster's building (2026-11-05, the layout audit, replacing a small building on a lawn whose news studio held
    // the monitor wall, the run-down board and the script desks, with no control room, the radio booths, the makeup corner and the sofa
    // in one room and a lobby of three chairs). In past the lobby's security gate and desk to the corridor. Downstairs what goes on
    // air: the news studio, windowless, with only the anchor desks before the set and the cameras with their prompters; the control
    // room (부조정실) beside it through the glass, where the PD cues the anchor from the monitor wall, the run-down and the vision
    // mixer; the makeup room the anchor goes through first, and the guests' green room (the sofa, the monitor, the mirror); the
    // restroom at the corridor's end. Upstairs where the announcers work: the 아나운서실 with its rows of desks where the scripts are
    // read through and the head's desk, and beside it the practice room (the mirrors, the pronunciation shelves, the reading table);
    // the radio booth and its control room side by side through the glass; the narration booth; the lounge.
    tiles: () => [
      ...building(
        [[2, 2, 12, 9, 'carpet'], [14, 2, 18, 6, 'carpet'], [20, 2, 23, 6, 'tile'], [14, 8, 20, 8, 'tile'], [14, 9, 15, 13, 'tile'], [2, 11, 12, 13, 'tile'], [22, 8, 23, 9, 'tile'], [17, 10, 21, 13, 'carpet'], [22, 11, 23, 13, 'carpet']],
        [[13, 8], [16, 7], [20, 7], [21, 8], [17, 9], [13, 12], [12, 14]],
      ),
      ...upstairs(
        [[2, 2, 12, 8, 'carpet'], [2, 10, 12, 13, 'wood'], [14, 2, 17, 6, 'carpet'], [19, 2, 23, 6, 'carpet'], [14, 8, 23, 8, 'tile'], [14, 9, 15, 13, 'tile'], [17, 10, 19, 13, 'carpet'], [21, 10, 23, 13, 'tile']],
        [[13, 8], [13, 11], [15, 7], [21, 7], [18, 9], [22, 9]],
      ),
    ],
    restrooms: [[22, 8, 23, 9]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The news studio: the set, the anchor desks, the cameras with their prompters, the lights; the window into the control room.
      o('anNewsSet', 3, 2), o('anchorDesk', 3, 3), o('anchorDesk', 5, 3), o('studioLight', 7, 4), o('anCamera', 3, 6), o('anCamera', 6, 6), o('sgBoothWindow', 12, 4, 'left'),
      // The standing presenter's video wall and its camera; the interview table.
      o('bigTv', 9, 2), o('anCamera', 9, 6), o('debateTable', 9, 8), o('diningChair', 8, 8, 'right'), o('diningChair', 11, 8, 'left'), o('studioLight', 2, 5),
      // The control room: the monitor wall, the run-down, the vision mixer.
      o('anMonitorWall', 14, 2), o('anRundownBoard', 17, 2), o('tsControlDesk', 14, 4),
      // The makeup room.
      o('anMakeupCorner', 20, 2), o('wardrobeRack', 22, 5, 'up'), o('plant', 23, 2),
      // The restroom.
      o('toilet', 23, 9, 'left'), o('sink', 23, 8, 'left'),
      // The green room: the monitor, the sofa and armchair, the mirror, the coffee.
      o('tv', 18, 10), o('sofa', 18, 13, 'up'), o('armchair', 20, 13, 'up'), o('makeupMirror', 23, 11, 'left'), o('coffeeMaker', 22, 13, 'up'),
      // The lobby: the lifts, the security gate by the corridor's door, the visitors' desk, the seats; the stairs up.
      o('bldLift', 2, 11, 'right'), o('sgSpeedGate', 11, 11, 'left'), o('sgVisitorDesk', 5, 13, 'up'), o('drWaitSeat', 8, 13, 'up'), o('drWaitSeat', 9, 13, 'up'),
      o('stairs', 15, 10, 'up'),
      // Upstairs, the 아나운서실: two rows of desks, the head's and the deputy's desks, the archive.
      up('prompterDesk', 3, 3), up('prompterDesk', 4, 3), up('prompterDesk', 6, 3), up('prompterDesk', 7, 3),
      up('prompterDesk', 3, 6), up('prompterDesk', 4, 6), up('prompterDesk', 6, 6), up('prompterDesk', 7, 6),
      up('officeDesk', 10, 3), up('officeDesk', 10, 6), up('archiveShelf', 12, 3, 'left'), up('archiveShelf', 12, 5, 'left'), up('plant', 2, 8),
      // The practice room: the mirrors, the pronunciation shelves, the table where scripts are read aloud together, the whiteboard.
      up('anDictionMirror', 3, 10), up('anDictionMirror', 5, 10), up('pronunciationShelf', 2, 12, 'right'), up('pronunciationShelf', 2, 13, 'right'),
      up('salMeetingTable', 8, 12), up('salMeetingChair', 8, 11), up('salMeetingChair', 9, 11), up('salMeetingChair', 10, 11), up('salMeetingChair', 7, 12, 'right'), up('whiteboard', 12, 12, 'left'),
      // The radio booth and its control room, the glass between them.
      up('onAirBooth', 14, 3), up('sgBoothWindow', 17, 3, 'left'),
      up('sgControlWindow', 19, 5, 'right'), up('mixingConsole', 20, 3, 'right'), up('plant', 23, 2),
      // The narration booth; the lounge.
      up('anRecordBooth', 18, 12),
      up('coffeeMaker', 21, 10), up('fridge', 23, 10), up('salWaterCooler', 21, 13, 'up'), up('sofa', 22, 13, 'up'),
    ],
    coworkers: crew(['백정확 아나운서 국장', '유창한 메인 앵커', '나또박 아나운서'], ['#0d47a1', '#1976d2', '#64b5f6']),
    // Guests wait in the green room.
    clients: [{ noun: '출연 게스트', socials: ['guestInterview'], spots: [[18, 12], [19, 12]], max: 1, every: 60, patience: 120 }],
    alarm: { notice: '🚨 속보가 들어왔어요! 앵커 데스크로 가세요', done: '🚨 침착하고 정확하게 속보를 전했어요! 성과가 크게 올라요', missed: '⌛ 다른 아나운서가 속보를 전했어요 (성과 감소)', interaction: 'breakingNews', every: [180, 300], window: 30, minLevel: 1 },
    // The 아나운서 지망생 practises reading, no news on air yet (2026-10-26, at the user's request).
    tasks: [gated(task('news', '뉴스 진행', ['readHeadlines'], 2), { minLevel: 1 }, task('practice', '원고 낭독 연습', ['drillPronunciation', 'editScript'], 2)), task('script', '원고 다듬기', ['editScript']), task('pron', '발음 연습', ['drillPronunciation', 'anMouthDrill'])],
    extra: [gated(task('radio', '라디오 진행', ['hostRadioShow']), { minLevel: 1 }), task('meeting', '런다운 편집 회의', ['anEditMeeting']), task('watch', '방송 모니터링', ['anWatchAir']), task('prompt', '프롬프터 점검', ['anCheckPrompter']), task('ready', '방송 전 분장·의상', ['anGetReady']), gated(task('narr', '내레이션 녹음', ['anNarrate']), { minLevel: 1 }), gated(task('guest', '게스트 인터뷰', ['guestInterview']), { minLevel: 1 }), boss('국장님께 방송 평가 받기')],
    work: ['readHeadlines', 'breakingNews', 'editScript', 'drillPronunciation', 'hostRadioShow', 'anEditMeeting', 'anWatchAir', 'anCheckPrompter', 'anMouthDrill', 'anGetReady', 'anNarrate', 'readArchive', 'guestInterview'],
    skill: 'charisma',
    floors: { carpet: 'slateStone', tile: 'creamTile' },
    wall: 'navyWainscot',
  },
  meteorologist: {
    careerId: 'meteorologist',
    name: '기상청 예보실',
    icon: '🌦️',
    // A regional weather office (2026-11-04, the layout audit, replacing a forecast room of two terminals with the radar and the
    // typhoon table loose in the middle, a green-screen weather set (the caster's work, which is the 방송국's: meteorologist@0),
    // a public lobby open onto the forecast room, and the observation garden squeezed against the building by the road).
    // The forecasters work round the clock in four shifts, at rows of desks before the wall of charts, satellite and radar; the
    // room is behind the lobby's guard desk. Beside the lobby the press briefing room, where a forecaster explains a warning to
    // the reporters. Upstairs the forecast discussion room (the afternoon's video call with the other offices, the typhoon
    // table), the duty room with its beds for the night shift, the records and the chief's desk. Out of the lobby's side door,
    // inside its fence and well clear of the building, the observation field (the screen, the rain gauge, the wind mast), and
    // the 비양소 where a radiosonde is readied and its balloon filled and sent up.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 15, 8, 'tile'], [2, 10, 5, 13, 'carpet'], [7, 10, 15, 13, 'tile']],
          [[13, 9], [6, 11], [16, 10], [12, 14]],
        ),
        [
          ...Array.from({ length: 8 * 14 }, (_, i): [number, number, 'grass'] => [17 + (i % 8), 1 + Math.floor(i / 8), 'grass']),
          [14, 11, 'wall'], [15, 11, 'wall'], [13, 12, 'wall'], [13, 13, 'door'],
        ],
      ),
      ...patch(
        upstairs([[2, 2, 15, 8, 'carpet'], [2, 10, 6, 13, 'wood'], [8, 10, 11, 13, 'tile'], [13, 10, 15, 13, 'carpet']], [[8, 9], [7, 12], [12, 12]]),
        Array.from({ length: 8 * 14 }, (_, i): [number, number, 'void'] => [17 + (i % 8), 1 + Math.floor(i / 8), 'void']),
      ),
    ],
    restrooms: [[14, 12, 15, 13]],
    ground: [[0, 15, 25, 17, 'concrete'], [17, 10, 18, 10, 'concrete'], [19, 10, 23, 13, 'concrete']],
    objects: [
      // The forecast room: the wall of charts, satellite and radar; two rows of forecasters' desks facing it.
      o('forecastWall', 3, 2), o('forecastWall', 6, 2), o('forecastWall', 9, 2), o('forecastWall', 12, 2), o('plant', 15, 2),
      o('modelTerminal', 3, 5), o('modelTerminal', 5, 5), o('weatherStation', 7, 5), o('weatherStation', 9, 5), o('modelTerminal', 11, 5),
      o('modelTerminal', 4, 7), o('officeDesk', 6, 7), o('metPublicDesk', 8, 7), o('officeDesk', 11, 7),
      // The press briefing room: the backdrop, the lectern facing the reporters' seats.
      o('metPressBackdrop', 2, 10), o('pressPodium', 3, 11), o('salMeetingChair', 2, 13, 'up'), o('salMeetingChair', 3, 13, 'up'), o('salMeetingChair', 5, 13, 'up'),
      // The lobby: the stairs, the guard desk, the restroom.
      o('stairs', 8, 10, 'right'), o('icBadgeDesk', 10, 12), o('plant', 7, 13),
      o('toilet', 15, 13, 'left'), o('sink', 15, 12, 'left'),
      // The observation field inside its fence: the garden, the 비양소 and its launch pad.
      o('metFieldFence', 17, 1), o('metObsGarden', 20, 3), o('metSondeHut', 19, 10), o('balloonLauncher', 22, 11),
      // Upstairs. The discussion room: the table with its screen for the video call, the typhoon table, the board.
      up('metBriefTable', 5, 4), up('salMeetingChair', 4, 4, 'right'), up('salMeetingChair', 4, 5, 'right'), up('salMeetingChair', 8, 4, 'left'), up('salMeetingChair', 8, 5, 'left'),
      up('metTyphoonTable', 11, 4), up('whiteboard', 11, 2), up('plant', 15, 2),
      // The duty room, the records and the chief's desk.
      up('bed', 2, 10), up('bed', 4, 10), up('gjLockers', 2, 13, 'up'), up('coffeeMaker', 5, 13, 'up'), up('fridge', 6, 10),
      up('archiveShelf', 13, 10), up('archiveShelf', 14, 10), up('archiveShelf', 15, 10), up('officeDesk', 15, 12, 'left'),
    ],
    coworkers: crew(['하늘빛 예보국장', '구바람 선임 예보관', '윤햇살 예보분석관'], ['#0277bd', '#4fc3f7', '#ffca28']),
    // Reporters are seen in the briefing room.
    clients: [{ noun: '취재 기자', socials: ['explainForecast'], spots: [[2, 12], [5, 12]], max: 1, every: 70, patience: 120 }],
    alarm: { notice: '⛈️ 집중호우가 다가와요! 예보 상황판으로 가서 특보를 내세요', done: '⛈️ 제때 특보를 내 피해를 줄였어요! 성과가 크게 올라요', missed: '⌛ 특보가 늦어 비판을 받았어요 (성과 감소)', interaction: 'severeWeather', every: [180, 300], window: 30 },
    tasks: [task('chart', '일기도 분석', ['analyzeChart'], 2), task('model', '수치 예보', ['runModel']), task('obs', '고층 관측', ['metPrepSonde', 'launchBalloon'])],
    extra: [task('radar', '레이더 확인', ['checkWeather']), task('press', '언론 브리핑', ['pressConference']), task('meeting', '예보 토의', ['metHourlyBrief']), task('typhoon', '태풍 진로', ['metTrackTyphoon']), task('garden', '지상 관측', ['metReadScreen', 'metRainGauge']), task('calls', '예보 문의 전화', ['metAnswerPhone']), boss('예보국장님께 예보 보고')],
    work: ['analyzeChart', 'severeWeather', 'runModel', 'launchBalloon', 'metPrepSonde', 'checkWeather', 'pressConference', 'metHourlyBrief', 'metTrackTyphoon', 'metReadScreen', 'metRainGauge', 'metAnswerPhone', 'readArchive', 'explainForecast'],
    skill: 'science',
    floors: { tile: 'monoTile', carpet: 'sageCarpet', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  smartFarmer: {
    careerId: 'smartFarmer',
    windowless: ['vfLettuceRack', 'vfBerryRack', 'vfCleanEntry'],
    name: '스마트팜',
    icon: '🌱',
    // 층층잎팜, an indoor vertical farm in a factory building (2026-11-05, the layout audit, replacing a grow room with four racks
    // against the back wall and an empty floor, a hygiene stand in the lobby that led straight in, and the restroom in the packing
    // room). The grow room, shut and windowless, is filled with the LED racks back to back in rows, an aisle before each, the trial
    // bed at the end; the only way in is from the lobby through the 전실 (the gowns, the hand basin and boot dip, the air shower).
    // The seedlings come in from the 육묘·양액실 beside it (the dosing unit, the germination chamber, the sowing bench) and the
    // crop goes out to the packing room (the packing line, the cold store). In front the lobby where visitors are shown the farm
    // and sit, with the stairs; the 관제실 where the climate is run from and the week's harvest planned. Upstairs the staff room and
    // the restroom.
    tiles: () => [
      ...building(
        [[2, 2, 14, 9, 'tile'], [16, 2, 23, 5, 'tile'], [16, 7, 23, 9, 'tile'], [2, 11, 4, 13, 'tile'], [6, 11, 14, 13, 'wood'], [16, 11, 23, 13, 'carpet']],
        [[3, 10], [5, 12], [12, 14], [15, 3], [15, 8], [15, 12]],
      ),
      ...patch(
        upstairs([[6, 11, 14, 13, 'wood'], [3, 12, 4, 13, 'tile']], [[5, 12]]),
        [
          ...Array.from({ length: 26 * 10 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']),
          ...Array.from({ length: 9 * 5 }, (_, i): [number, number, 'void'] => [16 + (i % 9), 10 + Math.floor(i / 9), 'void']),
        ],
      ),
    ],
    restrooms: [[3, 30, 4, 31]],
    objects: [
      // The grow room: four rows of racks back to back, an aisle before each; the trial bed at the end.
      o('vfLettuceRack', 3, 2), o('vfLettuceRack', 6, 2), o('vfLettuceRack', 9, 2), o('vfBerryRack', 12, 2),
      o('vfLettuceRack', 3, 4, 'up'), o('vfLettuceRack', 6, 4, 'up'), o('vfLettuceRack', 9, 4, 'up'), o('vfBerryRack', 12, 4, 'up'),
      o('vfLettuceRack', 3, 5), o('vfLettuceRack', 6, 5), o('vfBerryRack', 9, 5), o('vfBerryRack', 12, 5),
      o('vfLettuceRack', 3, 7, 'up'), o('vfLettuceRack', 6, 7, 'up'), o('vfBerryRack', 9, 7, 'up'), o('vfBerryRack', 12, 7, 'up'),
      o('vfLowBed', 6, 9, 'up'),
      // The 전실: the gowns, the basin, the air shower.
      o('vfCleanEntry', 2, 13, 'up'),
      // The 육묘·양액실 and the packing room.
      o('vfDoser', 16, 2), o('vfSeedChamber', 21, 2), o('vfSowBench', 20, 5, 'up'),
      o('vfPackTable', 17, 7), o('vfColdStore', 22, 7),
      // The lobby: the farm's board, the seats, the stairs.
      o('vfFarmSign', 8, 11), o('plant', 13, 11), o('drWaitSeat', 11, 13, 'up'), o('drWaitSeat', 13, 13, 'up'), o('stairs', 6, 13, 'right'),
      // The 관제실: the climate console, the plan board, the desks and the files.
      o('vfEnvConsole', 16, 11), o('vfPlanBoard', 18, 11), o('officeDesk', 21, 11), o('officeDesk', 22, 11), o('archiveShelf', 23, 13, 'left'),
      // Upstairs: the staff room; the restroom.
      up('coffeeMaker', 14, 11, 'left'), up('fridge', 14, 12, 'left'), up('diningTable', 11, 12), up('diningChair', 11, 11), up('diningChair', 12, 11), up('sofa', 6, 11),
      up('toilet', 3, 13, 'right'), up('sink', 3, 12, 'right'),
    ],
    coworkers: crew(['이잎새 농장장', '박양액 재배사', '정센서 제어 담당'], ['#2e7d32', '#66bb6a', '#00897b']),
    // Visitors seated in the lobby.
    clients: [{ noun: '견학 손님', socials: ['vfExplainFarm', 'vfExplainData'], spots: [[11, 12], [13, 12]], max: 1, every: 70, patience: 120 }],
    alarm: { notice: '🚨 양액 농도와 재배실 온도가 틀어졌어요! 양액기로 가서 잡으세요', done: '🚨 제때 잡아 작물이 무사해요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 한 층의 잎이 시들었어요 (성과 감소)', interaction: 'vfFixNutrient', every: [180, 300], window: 35 },
    tasks: [task('crop', '작물 살피기', ['vfInspectLeaves', 'vfPollinate'], 2), task('dose', '양액 관리', ['vfMixNutrient', 'vfCalibrate']), task('climate', '환경 제어', ['vfSetClimate'])],
    extra: [task('harvest', '수확', ['vfHarvestLettuce', 'vfPickBerry']), task('pack', '포장·품질 검사', ['vfPackBox', 'vfBrix']), task('seed', '파종·육묘', ['vfSow', 'vfMoveSeedlings']), task('bed', '베드 청소', ['vfCleanGutter']), task('cold', '저온 입고', ['vfStockCold']), task('plan', '수확 계획', ['vfPlanHarvest']), task('entry', '위생 전실 점검', ['vfGownUp']), task('guest', '견학 안내', ['vfExplainFarm', 'vfExplainData']), boss('농장장님께 생육 보고')],
    work: ['vfInspectLeaves', 'vfHarvestLettuce', 'vfPickBerry', 'vfPollinate', 'vfMixNutrient', 'vfCalibrate', 'vfFixNutrient', 'vfSetClimate', 'vfSow', 'vfMoveSeedlings', 'vfCleanGutter', 'vfPackBox', 'vfBrix', 'vfStockCold', 'vfPlanHarvest', 'vfGownUp', 'vfExplainFarm', 'vfExplainData'],
    skill: 'gardening',
    floors: { tile: 'aquaTile', wood: 'oakWood', carpet: 'sageCarpet' },
    wall: 'creamPlain',
  },
  semiconductor: {
    careerId: 'semiconductor',
    windowless: ['fbLitho', 'fbWetBench', 'fbCoater', 'fbEtchRow'],
    name: '반도체 팹',
    icon: '🔬',
    // In from the street past the site's security gate to the engineers' office (2026-11-05, the layout audit: before, a lobby
    // with a sofa stood where the engineers work, and the gas room opened off it with the restroom inside). The office is where a
    // process or equipment engineer spends much of the day: the desks with their yield and SPC charts, the yield board where the
    // week's numbers are argued, the pantry corner, the restroom. From it a door to the gowning room, the suits, and from there
    // only the air shower, a 1 × 2 booth with a door at each end, into the cleanroom (FOUP rail, tool row, robot, wet bench,
    // defect review) and off that the yellow-lit photo bay, neither with windows. The chemical and gas room is shut off from
    // where people work: its only door is outside, with the warning sign, by the bulk gas tank and the exhaust scrubber.
    tiles: () =>
      building(
        [[2, 2, 15, 7, 'tile'], [17, 2, 23, 7, 'carpet'], [2, 9, 3, 13, 'wood'], [4, 12, 6, 13, 'wood'], [7, 9, 9, 13, 'wood'], [5, 9, 5, 10, 'tile'], [11, 9, 18, 10, 'wood'], [11, 11, 15, 13, 'wood'], [17, 12, 18, 13, 'wood'], [20, 9, 23, 13, 'wood']],
        [[5, 8], [5, 11], [10, 12], [16, 5], [17, 11], [21, 14], [12, 14]],
      ),
    restrooms: [[17, 12, 18, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      o('fbStocker', 2, 2), o('fbFoupRail', 4, 2), o('fbEtchRow', 10, 2), o('fbEtchRow', 13, 2),
      o('fbWaferRobot', 3, 5), o('fbWetBench', 7, 5), o('fbMicroscope', 11, 6),
      o('fbAmberBank', 17, 2), o('fbLitho', 18, 2), o('fbCoater', 21, 2), o('fbReticleRack', 23, 2),
      // The gas and chemical room, its door outside.
      o('fbChemCabinet', 21, 9), o('fbSpillStation', 20, 9),
      o('fbFabSign', 2, 9), o('fbGownBench', 7, 9), o('fbStickyMat', 5, 13), o('fbAirShower', 5, 9),
      // The engineers' office: the yield board, the desks, the pantry corner; the restroom.
      o('fbYieldBoard', 11, 9), o('officeDesk', 14, 9), o('officeDesk', 15, 9), o('officeDesk', 16, 9), o('fridge', 17, 9), o('coffeeMaker', 18, 9),
      o('officeDesk', 14, 11), o('officeDesk', 15, 11), o('plant', 15, 13),
      o('toilet', 18, 12, 'left'), o('sink', 18, 13, 'left'),
      // Outside: the security gate by the way in; the warning sign on the gas room's door, the gas tank and the scrubber.
      o('fbSiteGate', 13, 15), o('fbGasWarning', 20, 15), o('fbGasYard', 22, 15),
    ],
    cleanroom: { zone: [[8, 4], [20, 4], [5, 9]], shower: { x: 5, y: 9 }, robe: { x: 5, y: 11 } },
    // A line operator works beside the engineers, off their ladder (2026-11-02): the line's own work is theirs.
    coworkers: [...crew(['강수율 공정 기술 총괄', '문장비 선임 장비 엔지니어', '백정렬 공정 엔지니어'], ['#eceff1', '#cfd8dc', '#b0bec5']), { name: '오가동', shirt: '#90a4ae', skin: '#eac09a', hair: '#2b1b10', staff: '라인 오퍼레이터' }],
    alarm: { notice: '📉 수율이 갑자기 떨어졌어요! 수율 회의 보드로 가서 원인을 좁히세요', done: '📉 문제 로트를 멈추고 원인을 찾았어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 불량 웨이퍼가 더 나왔어요 (성과 감소)', interaction: 'fbYieldAlarm', every: [180, 300], window: 40, minLevel: 2 },
    // The player is an engineer: data, conditions and equipment, not feeding the line (2026-11-02; workRoles.ts).
    tasks: [
      gated(task('defect', '불량 판독과 데이터 확인', ['fbDefect'], 2), { minLevel: 1 }, task('defect', '판독표대로 불량 맞춰 보기', ['fbDefect'])),
      gated(task('yield', '수율 숫자 살피기', ['fbYield']), { minLevel: 1 }),
      gated(task('tools', '맡은 장비·가스 상태 점검', ['fbGas', 'fbTeach']), { minLevel: 2 }),
    ],
    extra: [task('gown', '방진복·에어샤워', ['fbGown', 'fbShower']), gated(task('gas', '가스·약액 점검', ['fbGas']), { minLevel: 1 }), boss('총괄님께 수율 보고')],
    branchTasks: [
      [task('recipe', '공정 조건 바꿔 시험하기', ['fbRecipe'], 2), task('defect', '불량 위치로 원인 좁히기', ['fbDefect']), task('yield', '수율 회의', ['fbYield'])],
      [task('chamber', '챔버 정비하기', ['fbChamber']), task('robot', '운반 로봇 맞추기', ['fbTeach']), task('reticle', '레티클 교체', ['fbReticle'])],
    ],
    branchExtra: [
      [task('gown', '방진복·에어샤워', ['fbGown', 'fbShower']), task('reticle', '노광 설비 쪽과 맞춰 보기', ['fbReticle']), boss('총괄님께 수율 보고'), chat(1)],
      [task('gown', '방진복·에어샤워', ['fbGown', 'fbShower']), task('gas', '가스·약액 점검', ['fbGas']), boss('총괄님께 장비 상태 보고'), chat(1)],
    ],
    work: ['fbExpose', 'fbReticle', 'fbCoat', 'fbFoup', 'fbTeach', 'fbRecipe', 'fbChamber', 'fbWet', 'fbDefect', 'fbYield', 'fbYieldAlarm', 'fbGas', 'fbGown', 'fbShower'],
    skill: 'logic',
    floors: { tile: 'aquaTile', carpet: 'creamTile', wood: 'slateStone' },
    wall: 'creamPlain',
  },
  aiResearcher: {
    careerId: 'aiResearcher',
    name: '인공지능 연구소',
    icon: '🤖',
    // A research lab on an office floor (2026-11-04, the layout audit, replacing a lone building whose toilet stood in the middle of
    // the researchers' desks, whose GPU racks shared a room with a sink, and whose lobby was a corridor of waiting chairs). The way
    // in is the lobby: the reception desk and the speed gate to the lab, a sofa and the lab's sign, the restroom off it. Through the
    // gate, the open desk floor: the training desks with their loss curves, the labelling desks, the desks for writing, the model
    // map, the printer and the paper cart. On the right the glass meeting room (the table, the discussion board) and the seminar
    // space where results and demos are shown (the demo screen, the results wall, the poster board, seats for visitors); behind it
    // the GPU room, windowless and cooled, entered only from the lab. On the left, off the lobby and the desks, the pantry: the
    // coffee, the water, the fridge, a table, and the reading corner.
    windowless: ['arGpuRack'],
    tiles: () =>
      building(
        [[2, 2, 15, 8, 'carpet'], [2, 10, 7, 13, 'wood'], [9, 10, 15, 13, 'tile'], [17, 2, 23, 4, 'carpet'], [17, 6, 23, 9, 'carpet'], [20, 11, 23, 13, 'tile'], [17, 12, 18, 13, 'tile']],
        [[5, 9], [12, 9], [8, 11], [16, 4], [16, 8], [20, 10], [16, 13], [12, 14]],
      ),
    restrooms: [[17, 12, 18, 13]],
    objects: [
      // The desk floor.
      o('arTrainDesk', 3, 2), o('arTrainDesk', 6, 2), o('arTrainDesk', 9, 2), o('arModelMap', 12, 2), o('arPaperCart', 15, 2),
      o('arLabelStation', 3, 5), o('arLabelStation', 6, 5), o('officeDesk', 9, 5), o('officeDesk', 10, 5), o('arPrinter', 15, 5), o('plant', 2, 8),
      // The meeting room.
      o('salMeetingTable', 19, 3), o('salMeetingChair', 18, 3, 'right'),
      o('salMeetingChair', 19, 4, 'up'), o('salMeetingChair', 20, 4, 'up'), o('arPaperBoard', 23, 2, 'left'),
      // The seminar space.
      o('arDemoScreen', 17, 6), o('arEvalWall', 21, 6), o('drWaitSeat', 18, 9, 'up'), o('drWaitSeat', 19, 9, 'up'), o('arPosterBoard', 21, 9, 'up'),
      // The GPU room.
      o('dcCrac', 22, 11), o('arGpuRack', 20, 13, 'up'), o('arGpuRack', 22, 13, 'up'),
      // The lobby and its restroom.
      o('lobbyDesk', 9, 12), o('sgSpeedGate', 13, 10), o('sofa', 14, 12, 'up'), o('arLabSign', 9, 10),
      o('toilet', 18, 12, 'left'), o('sink', 18, 13, 'left'),
      // The pantry.
      o('coffeeMaker', 2, 10), o('salWaterCooler', 3, 10), o('fridge', 4, 10), o('diningTable', 3, 12), o('diningChair', 3, 13, 'up'), o('diningChair', 4, 13, 'up'), o('arReadingNook', 6, 12, 'up'),
    ],
    coworkers: crew(['한결이 연구소장', '서정답 서비스 팀장', '노라벨 선임 연구원'], ['#3949ab', '#00897b', '#78909c']),
    // In the seminar space, by the seats facing the demo.
    clients: [{ noun: '시연 참관객', socials: ['arExplainDemo', 'arExplainLimit'], spots: [[18, 8], [19, 8]], max: 1, every: 70, patience: 120 }],
    alarm: { notice: '🚨 서비스가 엉뚱한 답을 내놓는다는 신고가 쏟아져요! 시연 화면으로 가세요', done: '🚨 이전 모델로 되돌리고 오답을 고쳤어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 오답이 널리 퍼졌어요 (성과 감소)', interaction: 'arWrongAlarm', every: [180, 300], window: 40 },
    tasks: [task('train', '모델 학습', ['arTrain', 'arTune'], 2), task('label', '데이터 라벨링', ['arLabel', 'arAudit']), task('paper', '논문 토론', ['arDiscuss'])],
    extra: [task('read', '논문 읽기', ['arRead']), task('eval', '평가 결과 정리', ['arEval']), task('gpu', 'GPU 랙 살피기', ['arGpuCheck', 'arGpuSwap']), task('demo', '시연·오답 찾기', ['arDemo', 'arAskTest']), task('poster', '포스터 발표', ['arPoster', 'arPin']), task('visitor', '참관객 응대', ['arExplainDemo', 'arExplainLimit']), boss('연구소장님께 실험 결과 보고')],
    work: ['arTrain', 'arTune', 'arLabel', 'arAudit', 'arDiscuss', 'arGpuCheck', 'arGpuSwap', 'arDemo', 'arAskTest', 'arWrongAlarm', 'arEval', 'arRead', 'arPoster', 'arPin', 'arExplainDemo', 'arExplainLimit'],
    skill: 'programming',
    floors: { carpet: 'lilacCarpet', wood: 'creamTile', tile: 'monoTile' },
    wall: 'creamPlain',
  },
  selfDriving: {
    careerId: 'selfDriving',
    name: '자율주행차 개발 센터',
    icon: '🚗',
    // A development centre with its test course out of doors (2026-11-04, the layout audit, replacing a full-size car lapping a small
    // indoor oval in a room with no door, a garage with no way out and a coffee machine in it, and a toilet among the log desks). The
    // building on the left, two floors. Downstairs the garage on its outside wall, open on the course: the second test car on the
    // lift, nose to the opening, so it drives straight out onto the course; the calibration targets on their rail, the sensor shelf,
    // the charger, the safety board where the run is briefed. The lobby: the reception desk and the gate, the stairs, the restroom.
    // Upstairs the engineers' office, where most of the work is: the monitoring wall with the car out on the course, the log-analysis
    // desk, the labelling desk, the coders' desks; the meeting room with the coffee and the water. Outside, on the paved yard, the course:
    // a small mock city's loop with its crossing, signal and stop line, the dummy on its rail and the stop post (as at a city-like
    // proving ground, the real runs going out on the roads of a pilot zone).
    tiles: () => [
      ...patch(
        building([[2, 2, 10, 6, 'tile'], [2, 8, 10, 13, 'tile'], [9, 8, 10, 9, 'tile']], [[7, 7], [9, 10], [11, 12]]),
        [
          // Open yard right of the building.
          ...Array.from({ length: 13 * 14 }, (_, i): [number, number, 'grass'] => [12 + (i % 13), 1 + Math.floor(i / 13), 'grass']),
          // The garage's opening onto the course.
          [11, 2, 'tile'], [11, 3, 'tile'], [11, 4, 'tile'],
          // The restroom in the lobby's corner.
          [8, 8, 'wall'], [8, 9, 'wall'], [8, 10, 'wall'], [10, 10, 'wall'],
        ],
      ),
      ...patch(
        upstairs([[2, 2, 10, 7, 'carpet'], [2, 9, 3, 13, 'carpet'], [5, 9, 10, 13, 'carpet']], [[3, 8], [4, 13]]),
        Array.from({ length: 13 * 14 }, (_, i): [number, number, 'void'] => [12 + (i % 13), 1 + Math.floor(i / 13), 'void']),
      ),
    ],
    restrooms: [[9, 8, 10, 9]],
    ground: [[12, 0, 25, 14, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The garage: the car on the lift nose to the opening, the calibration targets, the safety board, the sensors, the charger.
      o('sdGarage', 5, 2), o('sdCalibBoard', 2, 2), o('sdSensorShelf', 2, 6, 'up'), o('sdCharger', 5, 6, 'up'), o('sdSafetyBoard', 8, 6, 'up'), o('sdGarageShell', 6, 6),
      // The lobby: the reception desk, the gate, the stairs, the sign; the restroom.
      o('lobbyDesk', 4, 8), o('sgSpeedGate', 5, 12), o('stairs', 3, 9, 'down'), o('sdSign', 2, 13), o('plant', 10, 13),
      o('toilet', 9, 8), o('sink', 10, 8),
      // The course on the yard, street lights at its corners.
      o('sdTrack', 13, 1), o('yaLamp', 13, 8), o('yaLamp', 24, 8),
      // Upstairs. The engineers' office: the monitoring wall, the log desk, the labelling desk, the coders' desks.
      up('officeDesk', 2, 2), up('sdMonitorWall', 4, 2), up('sdLogDesk', 7, 2), up('plant', 10, 2),
      up('sdLabelStation', 2, 5), up('officeDesk', 5, 5), up('officeDesk', 6, 5), up('officeDesk', 8, 5), up('officeDesk', 9, 5),
      // The meeting room, its coffee and water.
      up('salMeetingTable', 6, 11), up('salMeetingChair', 6, 10), up('salMeetingChair', 7, 10), up('salMeetingChair', 8, 10),
      up('salMeetingChair', 6, 12, 'up'), up('salMeetingChair', 7, 12, 'up'), up('salMeetingChair', 8, 12, 'up'), up('whiteboard', 10, 10, 'left'),
      up('coffeeMaker', 10, 13, 'up'), up('salWaterCooler', 9, 13, 'up'),
    ],
    coworkers: crew(['도유진 센터장', '이센서 시험 주행 팀장', '정라벨 인지 엔지니어'], ['#00838f', '#f57c00', '#455a64']),
    alarm: { notice: '🚨 시험차가 보행자 모형을 못 보고 달려요! 비상 정지 기둥으로 가세요', done: '🚨 비상 정지로 모형 앞에서 세웠어요! 성과가 크게 올라요', missed: '⌛ 정지가 늦어 모형을 들이받았어요 (성과 감소)', interaction: 'sdEStop', every: [180, 300], window: 40 },
    tasks: [task('ride', '시험 주행 타기', ['sdRide']), task('log', '주행 기록 분석', ['sdLog', 'sdFix'], 2), task('label', '도로 장면 라벨링', ['sdLabel', 'sdAudit'])],
    extra: [task('calib', '센서 보정', ['sdCalib']), task('dummy', '건널목 시험 준비', ['sdDummy']), task('hood', '시험차 정비', ['sdHood', 'sdUnder']), task('lidar', '라이다 청소', ['sdLidar']), task('brief', '안전 브리핑', ['sdBrief']), boss('센터장님께 시험 결과 보고')],
    work: ['sdRide', 'sdDummy', 'sdEStop', 'sdCalib', 'sdLog', 'sdFix', 'sdLabel', 'sdAudit', 'sdHood', 'sdUnder', 'sdLidar', 'sdBrief'],
    skill: 'programming',
    floors: { tile: 'monoTile', carpet: 'sageCarpet' },
    wall: 'creamPlain',
  },
  dataCenter: {
    careerId: 'dataCenter',
    windowless: ['dcServerRack', 'dcNocWall', 'dcSpareShelf', 'dcUps'],
    name: '데이터센터',
    icon: '🖥️',
    // One building of 구름다리데이터's campus (2026-11-05, the layout audit, replacing a lone building whose lobby opened by an
    // ordinary door straight into the data hall, the badge door a prop against the lobby wall, the hall with windows, the spare
    // parts and the restroom in the lobby, and nothing outside). A data centre is a windowless box and its halls are reached only
    // through security: in from the street the lobby, where a visitor signs in at the security desk and leaves the phone in a
    // locker; the man-trap, one person at a time between the outer door and the badge door; then the data hall, hall 3 of many,
    // its racks turned so the aisles run towards the camera (cold, hot, cold), the cooling units along its side, a raised floor
    // tile up. Off it, the NOC with its wall of graphs where the shift watches everything, the staging room where spares and new
    // servers are unpacked (the parts shelves, the crash cart), and the electrical room (the UPS, its batteries, the gas
    // suppression bottles). Out in the fenced plant yard the emergency generator, the cooling tower and the chiller.
    tiles: () =>
      patch(
        building(
          [[2, 2, 12, 8, 'tile'], [14, 2, 18, 5, 'carpet'], [14, 7, 18, 8, 'wood'], [2, 10, 7, 13, 'wood'], [9, 10, 15, 13, 'tile'], [17, 12, 18, 13, 'tile']],
          [[13, 4], [13, 7], [5, 9], [12, 11], [16, 12], [12, 14]],
        ),
        [
          // The plant yard beside the building.
          ...Array.from({ length: 5 * 14 }, (_, i): [number, number, 'grass'] => [20 + (i % 5), 1 + Math.floor(i / 5), 'grass']),
          // The man-trap: the outer door from the lobby, the badge door in the opening to the hall.
          [11, 10, 'wall'], [11, 11, 'wall'], [14, 10, 'wall'], [14, 11, 'wall'], [13, 11, 'wall'], [12, 9, 'tile'], [13, 9, 'tile'],
        ],
      ),
    restrooms: [[17, 12, 18, 13]],
    ground: [[20, 0, 25, 14, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The lobby: the security desk by the man-trap, the lockers, the site board; the restroom.
      o('dcSecurityDesk', 10, 12, 'up'), o('clsLockers', 14, 13, 'up'), o('dcSiteSign', 15, 10),
      o('toilet', 18, 13, 'left'), o('sink', 18, 12, 'left'),
      // The man-trap's inner door.
      o('dcBadgeDoor', 12, 9),
      // The data hall: the cooling units, the rows of racks (the disks, the patch frame in the hot aisle), the floor tile, the hall's number.
      o('dcCrac', 2, 2, 'right'), o('dcCrac', 2, 6, 'right'),
      o('dcServerRack', 4, 2, 'left'), o('dcDiskRack', 4, 5, 'left'), o('dcServerRack', 7, 2, 'right'), o('dcPatchFrame', 7, 5, 'left'),
      o('dcServerRack', 10, 2, 'left'), o('dcServerRack', 10, 5, 'left'), o('dcFloorTile', 5, 2), o('dcHallSign', 12, 2),
      // The NOC.
      o('dcNocWall', 14, 2), o('dcNocDesk', 15, 4), o('lamp', 18, 5),
      // The staging room.
      o('dcSpareShelf', 16, 7), o('dcCrashCart', 14, 8, 'up'),
      // The electrical room.
      o('dcUps', 2, 13, 'up'), o('dcBatteryRack', 5, 13, 'up'), o('dcGasBank', 2, 10), o('lamp', 7, 10),
      // The plant yard: its fence, the generator, the cooling tower, the chiller.
      o('dcYardFence', 20, 14), o('dcGenerator', 21, 2), o('dcCoolingTower', 21, 7), o('dcChiller', 21, 10, 'left'),
    ],
    coworkers: crew(['한가동 운영 총괄', '조냉각 시설 엔지니어', '서패치 서버 엔지니어'], ['#37474f', '#546e7a', '#263238']),
    alarm: { notice: '🚨 냉각기가 멈춰 통로 온도가 오르고 있어요! 냉각기로 가세요', done: '🚨 예비 펌프를 돌려 온도를 잡았어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 서버 일부가 멈췄어요 (성과 감소)', interaction: 'dcCoolAlarm', every: [180, 300], window: 40 },
    tasks: [task('disk', '고장 디스크 교체', ['dcSwapDisk']), task('noc', '관제·장애 티켓', ['dcWatch', 'dcTicket'], 2), task('facility', '냉각·전원 점검', ['dcChillerCheck', 'dcUpsTest'])],
    extra: [task('patrol', '서버 통로 순찰', ['dcPatrol']), task('patch', '케이블 연결·정리', ['dcPatch', 'dcTidy']), task('floor', '이중 바닥 점검', ['dcLift']), task('crash', '먹통 서버 살리기', ['dcCart']), task('crac', '항온항습기 관리', ['dcFilter', 'dcCracSet']), task('batt', '축전지 점검', ['dcBatt']), task('door', '보안 구역 확인', ['dcBadge']), task('handover', '인수인계', ['dcHandover']), boss('총괄님께 야간 근무 보고')],
    work: ['dcPatrol', 'dcSwapDisk', 'dcPatch', 'dcTidy', 'dcLift', 'dcCart', 'dcFilter', 'dcCracSet', 'dcChillerCheck', 'dcCoolAlarm', 'dcUpsTest', 'dcBatt', 'dcWatch', 'dcTicket', 'dcHandover', 'dcBadge'],
    skill: 'programming',
    floors: { tile: 'monoTile', carpet: 'sageCarpet', wood: 'slateStone' },
    wall: 'creamPlain',
  },
  roboticist: {
    careerId: 'roboticist',
    name: '로봇 연구소',
    icon: '🦿',
    // 한걸음로보틱스's research lab (2026-11-05, the layout audit, replacing a hall and a lobby where visitors sat on three kitchen
    // chairs by the showcase, with no room of desks for the researchers though most of the work is done at them, and the parts
    // shelves, a sofa, a fridge and the toilet all in one back room). In from the street a small lobby: the security desk and the
    // case with the company's first gripper. The test hall, the testbed: the arm in its safety cage, the walking robot's course,
    // the serving robot's dock and taped loop, and behind the line a few chairs where visitors watch the demonstrations. Off it the
    // electronics workshop (the soldering and assembly bench, the 3D printers), the parts store (the bins of servos and boards,
    // the spare legs), and the meeting room with the test board where the week's results are gone over. From the lobby the
    // researchers' office: the simulation wall and its desk, a row of desks where the code is written and the data read, the
    // coffee in its corner, the restroom.
    tiles: () =>
      patch(
        building(
          [[2, 2, 14, 8, 'tile'], [16, 2, 23, 3, 'wood'], [16, 5, 23, 8, 'carpet'], [2, 10, 7, 13, 'tile'], [9, 10, 13, 13, 'tile'], [15, 10, 23, 13, 'carpet']],
          [[15, 3], [15, 6], [19, 9], [5, 9], [9, 9], [14, 12], [12, 14]],
        ),
        // The restroom in the office's corner.
        [[21, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'wall'], [22, 11, 'door']],
      ),
    restrooms: [[22, 12, 23, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lobby: the security desk, the showcase, the lab's board.
      o('lobbyDesk', 11, 10), o('rlShowcase', 9, 13, 'up'), o('rlLabSign', 13, 13),
      // The test hall: the arm's cage, the walking course, the serving robot's dock; the visitors' chairs behind the line.
      o('rlArmCell', 2, 2), o('rlQuadCourse', 8, 2), o('rlChargeDock', 10, 6, 'up'), o('plant', 14, 2),
      o('salMeetingChair', 3, 8, 'up'), o('salMeetingChair', 4, 8, 'up'), o('salMeetingChair', 7, 8, 'up'),
      // The electronics workshop.
      o('rlAssemblyBench', 2, 13, 'up'), o('rlPrinter', 6, 13, 'up'), o('rlPrinter', 7, 13, 'up'), o('lamp', 2, 10),
      // The parts store.
      o('rlPartsShelf', 17, 2), o('rlLegRack', 20, 2), o('plant', 23, 2),
      // The meeting room and the test board.
      o('salMeetingTable', 17, 7), o('salMeetingChair', 17, 6), o('salMeetingChair', 18, 6), o('salMeetingChair', 19, 6),
      o('salMeetingChair', 17, 8, 'up'), o('salMeetingChair', 18, 8, 'up'), o('rlReviewBoard', 21, 5), o('plant', 23, 8),
      // The researchers' office: the simulation wall, the desks, the coffee; the restroom.
      o('rlSimulatorStation', 15, 10), o('researchDesk', 15, 13, 'up'), o('researchDesk', 16, 13, 'up'), o('researchDesk', 17, 13, 'up'), o('researchDesk', 18, 13, 'up'),
      o('researchDesk', 19, 13, 'up'), o('researchDesk', 20, 13, 'up'), o('coffeeMaker', 23, 10, 'left'),
      o('toilet', 22, 13, 'up'), o('sink', 23, 13, 'up'),
    ],
    coworkers: crew(['강한손 연구소장', '조관절 선임 로봇 엔지니어', '이경로 서비스 로봇 엔지니어'], ['#37587a', '#ef7d22', '#546e7a']),
    // On the chairs behind the test hall's line.
    clients: [{ noun: '시연 참관객', socials: ['rlExplainDemo', 'rlExplainSafety'], spots: [[3, 7], [4, 7], [7, 7]], max: 1, every: 70, patience: 120 }],
    alarm: { notice: '🚨 참관객 앞에서 사족 로봇이 오작동해요! 보행 시험장으로 가세요', done: '🚨 멈춰 세우고 원인을 고쳐 시연을 끝까지 마쳤어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 시연이 중단됐어요 (성과 감소)', interaction: 'rlDemoAlarm', every: [180, 300], window: 40 },
    tasks: [task('arm', '로봇 팔 시운전·위치 가르치기', ['rlArmRun', 'rlTeach'], 2), task('walk', '사족 로봇 보행 시험', ['rlWalk']), task('build', '납땜·서보 조립', ['rlSolder', 'rlServo'])],
    extra: [task('serve', '서빙 로봇 시험', ['rlServe']), task('dweller', '시뮬레이션 맞추기', ['rlSim', 'rlCode']), task('safety', '안전 시험', ['rlCurtain']), task('leg', '다리 관절 점검', ['rlLegCheck']), task('dock', '충전 접점 점검', ['rlDock']), task('print', '브래킷 출력', ['rlPrint']), task('log', '시험 결과 정리', ['rlLog']), task('visitor', '참관객 안내', ['rlExplainDemo', 'rlExplainSafety']), boss('연구소장님께 시험 결과 보고')],
    work: ['rlArmRun', 'rlTeach', 'rlCurtain', 'rlWalk', 'rlLegCheck', 'rlDemoAlarm', 'rlSolder', 'rlServo', 'rlServe', 'rlDock', 'rlSim', 'rlCode', 'rlLog', 'rlPrint', 'rlExplainDemo', 'rlExplainSafety', 'writePaper'],
    skill: 'handiness',
    floors: { tile: 'monoTile', carpet: 'sageCarpet', wood: 'slateStone' },
    wall: 'creamPlain',
  },
  greenEnergy: {
    careerId: 'greenEnergy',
    name: '태양광·풍력 발전 단지',
    icon: '☀️',
    // 바람해에너지's site (2026-11-05, the layout audit, replacing a turbine a few metres from two panel rows on an open lawn, the
    // restroom and the sofa in the inverter room and the coffee in the control room): fenced all round, the gate open at the track in.
    // The wind farm is along the ridge beyond, far off; the one turbine on the site stands in the back corner by the wind crew's
    // training ground (the nacelle mock-up, the harness locker, the weather mast), a gravel track and the cable trench between them
    // and the solar field, three long rows of panels. By the gate the 관리동: the 종합 상황실 with its screens and desk; the
    // 인버터·접속반실, high voltage, nothing in it but the inverters and its own locked door on the outside; the staff's 휴게실 and
    // the restroom. In front of it the substation in its fence and the battery container beside it.
    tiles: () =>
      patch(
        building([[17, 2, 23, 4, 'wood'], [20, 6, 23, 7, 'tile'], [17, 6, 18, 10, 'wood'], [19, 9, 20, 10, 'wood'], [22, 9, 23, 10, 'tile']], [[16, 3], [16, 7], [24, 7], [21, 10]]),
        [
          // Not the house shell: the open site and the 관리동.
          ...Array.from({ length: 26 * 15 }, (_, i): [number, number, 'grass'] => [i % 26, Math.floor(i / 26), 'grass']).filter(([x, y]) => !(x >= 16 && x <= 24 && y >= 1 && y <= 11)),
          ...Array.from({ length: 9 }, (_, i): [number, number, 'wall'] => [16 + i, 11, 'wall']),
        ],
      ),
    restrooms: [[22, 9, 23, 10]],
    ground: [[16, 12, 25, 14, 'concrete']],
    objects: [
      o('geGround', 0, 0), o('geRidge', 3, 0),
      // The wind crew's corner: the turbine, the nacelle mock-up, the harness locker, the weather mast.
      o('geTurbine', 0, 0), o('geNacelleMock', 4, 0), o('gePpeRack', 10, 0), o('geMast', 13, 1),
      // The solar field: three long rows; the wash cart, the spare modules and a cable drum by the track.
      o('geSolarRow', 0, 6), o('geSolarRow', 6, 6), o('geSolarRow', 0, 9), o('geSolarRow', 6, 9), o('geSolarRow', 0, 12), o('geSolarRow', 6, 12),
      o('geWashCart', 13, 7), o('geModulePallet', 13, 10), o('geCableDrum', 14, 12), o('geSiteSign', 15, 14),
      // The 관리동: the 종합 상황실; the 인버터·접속반실; the 휴게실 and the restroom.
      o('geControlDesk', 19, 2), o('plant', 17, 2),
      o('geInverterBank', 20, 6),
      o('coffeeMaker', 18, 6), o('sofa', 17, 8, 'right'), o('fridge', 17, 10, 'right'),
      o('toilet', 23, 9, 'left'), o('sink', 23, 10, 'left'),
      // The substation in its fence, the battery container beside it.
      o('geSubstation', 16, 12), o('geBatteryBox', 21, 12),
    ],
    coworkers: crew(['한바람 단지장', '윤해별 태양광 기술자', '도풍력 풍력 기술자'], ['#2e8b57', '#f5c518', '#2f6fa8']),
    clients: [{ noun: '견학 손님', socials: ['geExplainSolar', 'geExplainSafety'], spots: YARD_SPOTS, max: 1, every: 70, patience: 120 }],
    alarm: { notice: '🌀 태풍이 다가와요! 풍력 터빈으로 가서 설비를 점검하세요', done: '🌀 날개를 눕히고 잠가 설비를 지켜 냈어요! 성과가 크게 올라요', missed: '⌛ 점검이 늦어 터빈 일부가 손상됐어요 (성과 감소)', interaction: 'geTyphoon', every: [180, 300], window: 40 },
    tasks: [task('panel', '패널 청소·열화상 점검', ['geWash', 'geScan'], 2), task('wind', '터빈 점검', ['geDoor', 'geTorque', 'geOil']), task('power', '인버터·배터리 점검', ['geRead', 'geVolts'])],
    extra: [task('climb', '사다리 훈련', ['geClimb']), task('filter', '냉각 필터 교체', ['geFilter']), task('bms', '셀 균등 충전', ['geBms']), task('dispatch', '발전량 예측', ['geDispatch']), task('mast', '기상 기록 확인', ['geMast']), task('fence', '변전 설비 순시', ['geFence']), task('ppe', '안전 장구 점검', ['geHarness']), task('guest', '견학 안내', ['geExplainSolar', 'geExplainSafety']), boss('단지장님께 발전량 보고')],
    work: ['geWash', 'geScan', 'geDoor', 'geTyphoon', 'geClimb', 'geTorque', 'geOil', 'geRead', 'geFilter', 'geVolts', 'geBms', 'geDispatch', 'geMast', 'geFence', 'geHarness', 'geExplainSolar', 'geExplainSafety'],
    skill: 'handiness',
    floors: { wood: 'oakWood', tile: 'monoTile' },
    wall: 'creamPlain',
  },
  gameDeveloper: {
    careerId: 'gameDeveloper',
    name: '게임 회사',
    icon: '🕹️',
    // 스타포지's floor of an office building (2026-11-05, the layout audit, replacing a lone building on a lawn whose lobby of kitchen
    // chairs and a coffee maker took more than half its width, five PCs for the whole studio, the QA seats in the planning room,
    // and a back room of paper archive shelves with the snack bar). In from the street is the floor's lift hall, the restroom off
    // it; through the glass door the reception counter and the case of the studio's figures and awards. The dev floor is most of
    // the floor: an island each for the programmers and the artists (the concept artist's pen display at its end), the planners'
    // row under the level map, the bug board on the back wall, the lead's desk; the build servers behind their own door in its
    // corner. Off it the QA room (the play-test seats, the rack of phones and tablets, the QA board where the bugs are triaged) and
    // the meeting room where the build is shown and the sprint planned; the pantry (the snack bar, the coffee, the fridge, a table).
    tiles: () =>
      patch(
        building(
          [[2, 2, 16, 9, 'carpet'], [18, 2, 23, 7, 'carpet'], [18, 9, 23, 13, 'wood'], [2, 11, 7, 13, 'tile'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile']],
          [[17, 5], [17, 9], [5, 10], [12, 10], [14, 12], [12, 14]],
        ),
        // The build servers' room in the dev floor's corner.
        [[14, 2, 'wall'], [14, 3, 'door'], [14, 4, 'wall'], [15, 4, 'wall'], [16, 4, 'wall'], [15, 2, 'tile'], [16, 2, 'tile'], [15, 3, 'tile'], [16, 3, 'tile']],
      ),
    restrooms: [[15, 12, 16, 13]],
    windowless: ['gdBuildServer'],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall and the floor's restroom; the building's sign out on the pavement.
      o('bldLift', 9, 12, 'right'), o('plant', 13, 11), o('plant', 13, 13), o('gdTowerSign', 10, 15),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // Inside the glass door: the reception counter, the figure case.
      o('gdReception', 13, 8, 'right'), o('gdFigureCase', 9, 9, 'up'), o('plant', 11, 9),
      // The build servers.
      o('gdBuildServer', 15, 2), o('gdBuildServer', 16, 2),
      // The dev floor: the programmers' island, the artists' island, the planners' row under the level map, the bug board, the lead's desk.
      o('devStation', 3, 4, 'up'), o('devStation', 4, 4, 'up'), o('devStation', 5, 4, 'up'), o('devStation', 3, 5), o('devStation', 4, 5), o('devStation', 5, 5),
      o('gdArtStation', 8, 4, 'up'), o('devStation', 9, 4, 'up'), o('devStation', 10, 4, 'up'), o('devStation', 8, 5), o('devStation', 9, 5), o('devStation', 10, 5),
      o('devStation', 3, 8, 'up'), o('devStation', 4, 8, 'up'), o('devStation', 5, 8, 'up'), o('levelBoard', 2, 6, 'right'),
      o('bugBoard', 7, 2), o('plant', 2, 2), o('plant', 12, 2), o('devStation', 16, 6, 'left'),
      // The QA room: the play-test seats, the device rack, the QA board.
      o('playtestBooth', 18, 2), o('playtestBooth', 19, 2), o('playtestBooth', 20, 2), o('playtestBooth', 21, 2), o('gdDeviceRig', 22, 2),
      o('playtestBooth', 20, 6, 'up'), o('playtestBooth', 21, 6, 'up'), o('plant', 18, 7), o('plant', 23, 7),
      // The meeting room: the table, the whiteboard, the screen.
      o('salMeetingTable', 19, 11), o('salMeetingChair', 19, 10), o('salMeetingChair', 20, 10), o('salMeetingChair', 21, 10),
      o('salMeetingChair', 19, 12, 'up'), o('salMeetingChair', 20, 12, 'up'), o('salMeetingChair', 21, 12, 'up'), o('whiteboard', 22, 9), o('projector', 23, 11, 'left'),
      // The pantry.
      o('gdSnackBar', 2, 11), o('coffeeMaker', 6, 11), o('fridge', 7, 13, 'up'), o('diningTable', 4, 13), o('diningChair', 6, 13, 'left'), o('sofa', 2, 13, 'up'),
    ],
    coworkers: crew(['장레벨 게임 디렉터', '오버그 리드 프로그래머', '최픽셀 기획자'], ['#4527a0', '#212121', '#7e57c2']),
    alarm: { notice: '🔥 라이브 서버에 큰 버그가 생겼어요! 개발용 PC로 가세요', done: '🔥 긴급 패치로 바로 고쳤어요! 성과가 크게 올라요', missed: '⌛ 패치가 늦어 서버 점검을 했어요 (성과 감소)', interaction: 'hotfix', every: [180, 300], window: 40 },
    tasks: [task('code', '게임 기능 만들기', ['codeGameplay'], 2), task('test', '빌드 테스트', ['playtestBuild', 'gdDeployBuild']), task('bugs', '버그 분류', ['triageBugs', 'gdDeviceTest'])],
    // The paper archive went with the shelves (a studio's design documents are on its wiki): the art review is a task of its own.
    extra: [task('level', '레벨 설계', ['designLevel']), task('meeting', '스프린트 회의', ['attendMeeting']), task('art', '원화 피드백 주기', ['gdReviewArt']), boss('디렉터님께 빌드 보여 드리기')],
    work: ['codeGameplay', 'hotfix', 'playtestBuild', 'triageBugs', 'designLevel', 'attendMeeting', 'gdDeployBuild', 'gdDeviceTest', 'gdReviewArt'],
    skill: 'programming',
    floors: { carpet: 'lilacCarpet', tile: 'monoTile' },
    wall: 'creamPlain',
  },
  interpreter: {
    careerId: 'interpreter',
    name: '통번역 사무소',
    icon: '🌐',
    // A 통번역 회사 in a unit of an office building (2026-11-05, the layout audit, replacing a lone building on a lawn with two
    // simultaneous booths facing a little meeting table, a corridor lobby of waiting chairs and a notary's counter like a public
    // office's, no meeting room or head's office, and the restroom among the booths). A simultaneous booth belongs in a conference
    // hall and is hired in with it; an agency has at most one to practise in. In from the street the floor's lift hall and its
    // restroom; through the glass door a small reception (the counter where documents for translation and 번역공증 are handed
    // in, the agency's sign, a sofa) with the meeting room off it, where clients go over the terms and the fee and consecutive
    // interpreting is rehearsed round the table. On the right the 번역실: the translators' desks pushed together in an island
    // under the wall of dictionaries and glossaries, the board of terms, the work shared out on the whiteboard, the copier, and the
    // head's office in its corner where the translations are checked; the pantry behind. On the left the interpreters' room: the
    // practice booth, the corner where a rendition is recorded and played back, their desks and the glossaries; the 자료실 of
    // reference files behind it.
    tiles: () =>
      patch(
        building(
          [[2, 2, 7, 9, 'carpet'], [9, 2, 14, 5, 'carpet'], [9, 7, 14, 9, 'tile'], [16, 2, 23, 9, 'wood'], [2, 11, 7, 13, 'carpet'], [9, 11, 13, 13, 'tile'], [15, 12, 16, 13, 'tile'], [18, 11, 23, 13, 'wood']],
          [[8, 8], [5, 10], [11, 6], [15, 8], [10, 10], [20, 10], [14, 12], [12, 14]],
        ),
        [[20, 2, 'wall'], [20, 3, 'wall'], [20, 4, 'door'], [20, 5, 'wall'], [20, 6, 'wall'], [21, 6, 'wall'], [22, 6, 'wall'], [23, 6, 'wall']],
      ),
    restrooms: [[15, 12, 16, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The lift hall; the floor's restroom.
      o('bldLift', 12, 11), o('plant', 9, 11),
      o('toilet', 16, 13, 'left'), o('sink', 16, 12, 'left'),
      // The reception: the counter where documents and 공증 requests are handed in, the sign, the sofa.
      o('ipNotaryCounter', 12, 7), o('ipOfficeSign', 9, 7), o('sofa', 13, 9, 'up'), o('plant', 14, 7),
      // The meeting room: the table where consecutive interpreting is rehearsed and clients are met, the chairs at its ends.
      o('ipMeetingTable', 11, 3), o('salMeetingChair', 10, 3, 'right'), o('salMeetingChair', 10, 4, 'right'), o('salMeetingChair', 14, 3, 'left'), o('salMeetingChair', 14, 4, 'left'),
      // The 번역실: the dictionaries and glossaries, the island of desks, the board of terms, the whiteboard, the copier.
      o('glossaryShelf', 16, 2), o('glossaryShelf', 17, 2), o('glossaryShelf', 18, 2), o('glossaryShelf', 19, 2),
      o('translationDesk', 16, 4, 'up'), o('ipMateDesk', 17, 4, 'up'), o('translationDesk', 18, 4, 'up'), o('ipMateDesk', 16, 5), o('translationDesk', 17, 5), o('translationDesk', 18, 5),
      o('ipTermBoard', 21, 7), o('whiteboard', 18, 9, 'up'), o('copier', 16, 9, 'up'), o('plant', 23, 9),
      // The head's office.
      o('officeDesk', 22, 2), o('bookshelf', 23, 2), o('armchair', 23, 5, 'left'), o('plant', 21, 5),
      // The pantry.
      o('coffeeMaker', 18, 11), o('salWaterCooler', 19, 11), o('fridge', 18, 13, 'up'), o('diningTable', 21, 12), o('diningChair', 21, 13, 'up'), o('diningChair', 22, 13, 'up'),
      // The interpreters' room: the practice booth, the recording corner, their desks, the glossaries.
      o('interpretBooth', 2, 2), o('ipPracticeCorner', 5, 2),
      o('translationDesk', 3, 6, 'up'), o('translationDesk', 4, 6, 'up'), o('ipMateDesk', 3, 7), o('ipMateDesk', 4, 7), o('bookshelf', 7, 5, 'left'),
      o('glossaryShelf', 2, 9, 'up'), o('glossaryShelf', 3, 9, 'up'), o('plant', 7, 9),
      // The 자료실.
      o('archiveShelf', 2, 11), o('archiveShelf', 3, 11), o('archiveShelf', 6, 11),
      o('archiveShelf', 2, 13, 'up'), o('archiveShelf', 3, 13, 'up'), o('archiveShelf', 5, 13, 'up'), o('archiveShelf', 6, 13, 'up'),
    ],
    coworkers: crew(['서다국 대표', '이동시 통역사', '문정확 번역가'], ['#00695c', '#26a69a', '#80cbc4']),
    // On the reception's sofa, or at the meeting room's table.
    clients: [{ noun: '의뢰인', socials: ['clarifyTerms'], spots: [[12, 9], [9, 3], [9, 4]], max: 1, every: 60, patience: 120 }],
    alarm: { notice: '🌐 국제회의 통역사가 갑자기 아파요! 통역 부스로 가세요', done: '🌐 회의를 완벽하게 통역했어요! 성과가 크게 올라요', missed: '⌛ 다른 통역사가 급히 투입됐어요 (성과 감소)', interaction: 'urgentInterpret', every: [180, 300], window: 40 },
    tasks: [task('translate', '문서 번역', ['translateDoc'], 2), task('interpret', '통역 연습', ['practiceInterpret']), task('glossary', '용어집 정리', ['buildGlossary'])],
    extra: [task('client', '의뢰인과 용어 확인', ['clarifyTerms']), task('meeting', '번역 회의', ['attendMeeting']), task('archive', '참고 자료 찾기', ['readArchive']), task('terms', '용어 게시판 정리', ['ipPinTerm']), task('consecutive', '순차 통역', ['ipConsecutive']), task('notary', '번역 공증', ['ipNotarise']), task('record', '내 통역 녹음해 듣기', ['ipRecord']), boss('대표님께 번역 감수 받기')],
    work: ['translateDoc', 'practiceInterpret', 'urgentInterpret', 'buildGlossary', 'attendMeeting', 'readArchive', 'clarifyTerms', 'ipPinTerm', 'ipConsecutive', 'ipNotarise', 'ipRecord'],
    skill: 'language',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  librarian: {
    careerId: 'librarian',
    name: '시립 도서관',
    icon: '📚',
    // A 시립 도서관 of two floors (2026-11-05, the layout audit, replacing the hall plan's reading room with one row of six stacks
    // along its back wall and the loan desk in its far corner, a big children's room with a rug and one shelf in it, a staff room
    // with a sofa, no 정리실 and no 열람실, and the book drop indoors). As a real one: the book drop out on the pavement by the door
    // for when it's shut; in at the entrance hall, the 대출·반납 데스크 facing the door with the returns truck behind it, the
    // search kiosk, the periodicals, the stairs and the restroom. Off the hall the 종합자료실, the stacks in parallel ranges in
    // 분류 order and the reading tables along the windows; and the 어린이자료실, picture-book shelves round the walls, the
    // story-time rug, a low reading table and floor seating. Upstairs the 열람실 of partitioned desks for study, past the
    // lockers; the 정리실 where new books are catalogued and labelled, old ones scanned and mended and the returns sorted; and
    // the staff's rest room behind it.
    tiles: () => [
      ...patch(
        building(
          [[2, 2, 15, 8, 'wood'], [2, 10, 15, 13, 'tile'], [17, 2, 23, 13, 'carpet']],
          [[6, 9], [10, 9], [16, 10], [12, 14], [13, 12]],
        ),
        // The restroom in the hall's corner.
        [[13, 11, 'wall'], [14, 11, 'wall'], [15, 11, 'wall'], [13, 13, 'wall']],
      ),
      ...upstairs(
        [[2, 2, 15, 8, 'carpet'], [2, 10, 8, 13, 'tile'], [10, 10, 23, 13, 'wood'], [17, 2, 23, 8, 'wood']],
        [[5, 9], [9, 11], [20, 9]],
      ),
    ],
    restrooms: [[14, 12, 15, 13]],
    ground: [[0, 15, 25, 17, 'concrete']],
    objects: [
      // The 종합자료실: the reading tables along the windows; the stacks in parallel ranges, the 분류 numbers in order.
      o('libReadingChair', 3, 2), o('libReadingTable', 3, 3), o('libReadingChair', 4, 4, 'up'),
      o('libReadingChair', 3, 5), o('libReadingTable', 3, 6), o('libReadingChair', 4, 7, 'up'),
      o('libraryStacks', 8, 2), o('libraryStacks', 10, 2), o('libraryStacks', 12, 2), o('libraryStacks', 14, 2),
      o('libraryStacks', 8, 4, 'up'), o('libraryStacks', 10, 4, 'up'), o('libraryStacks', 12, 4, 'up'),
      o('libraryStacks', 8, 5), o('libraryStacks', 10, 5), o('libraryStacks', 12, 5),
      o('libraryStacks', 8, 7, 'up'), o('libraryStacks', 10, 7, 'up'), o('libraryStacks', 12, 7, 'up'), o('plant', 15, 8),
      // The entrance hall: the loan desk facing the door with the returns truck, the search kiosk, the periodicals, the stairs up; the restroom.
      o('circulationDesk', 9, 12, 'up'), o('libBookCart', 11, 12, 'up'), o('libSearchKiosk', 8, 10), o('bookshelf', 2, 10), o('bookshelf', 3, 10), o('stairs', 3, 13, 'left'),
      o('toilet', 15, 12, 'left'), o('sink', 15, 13, 'left'),
      // The 어린이자료실: picture-book shelves round the walls, the story rug, a low table, floor seating.
      o('libPictureShelf', 17, 2), o('libPictureShelf', 19, 2), o('libPictureShelf', 21, 2), o('plant', 23, 2),
      o('libPictureShelf', 23, 4, 'left'), o('libPictureShelf', 23, 7, 'left'), o('libPictureShelf', 17, 4, 'right'), o('libPictureShelf', 17, 6, 'right'), o('storyRug', 19, 5),
      o('libReadingChair', 23, 9), o('libReadingTable', 22, 10), o('libReadingChair', 22, 11, 'up'),
      o('libReadingChair', 19, 9), o('libReadingTable', 19, 10), o('libReadingChair', 20, 11, 'up'), o('bhKidsCorner', 17, 13, 'up'), o('sofa', 22, 13, 'up'),
      // Out on the pavement: the 24-hour book drop.
      o('libReturnBox', 13, 15),
      // Upstairs. The 열람실: partitioned desks along the wall and back to back, the duty desk by the door; the lockers in the hall.
      up('atStudyCarrel', 2, 2), up('atStudyCarrel', 3, 2), up('atStudyCarrel', 4, 2), up('atStudyCarrel', 5, 2), up('atStudyCarrel', 6, 2), up('atStudyCarrel', 7, 2), up('atStudyCarrel', 8, 2), up('atStudyCarrel', 9, 2), up('atStudyCarrel', 10, 2), up('atStudyCarrel', 11, 2), up('atStudyCarrel', 12, 2), up('atStudyCarrel', 13, 2),
      up('atStudyCarrel', 4, 4, 'up'), up('atStudyCarrel', 5, 4, 'up'), up('atStudyCarrel', 6, 4, 'up'), up('atStudyCarrel', 7, 4, 'up'), up('atStudyCarrel', 8, 4, 'up'), up('atStudyCarrel', 9, 4, 'up'), up('atStudyCarrel', 10, 4, 'up'), up('atStudyCarrel', 11, 4, 'up'),
      up('atStudyCarrel', 4, 5), up('atStudyCarrel', 5, 5), up('atStudyCarrel', 6, 5), up('atStudyCarrel', 7, 5), up('atStudyCarrel', 8, 5), up('atStudyCarrel', 9, 5), up('atStudyCarrel', 10, 5), up('atStudyCarrel', 11, 5),
      up('officeDesk', 6, 8, 'up'), up('plant', 15, 2), up('clsLockers', 7, 10), up('salWaterCooler', 2, 10),
      // The 정리실: the cataloguing PCs, the scanner, the new books on their carts and shelves, the mending desk.
      up('catalogStation', 10, 10), up('catalogStation', 11, 10), up('scanStation', 13, 10), up('archiveShelf', 15, 10), up('archiveShelf', 16, 10),
      up('libBookCart', 12, 13, 'up'), up('libBookCart', 14, 13, 'up'), up('officeDesk', 18, 10), up('officeDesk', 19, 10), up('archiveShelf', 23, 11, 'left'), up('plant', 23, 13),
      // The staff's rest room.
      up('coffeeMaker', 17, 2), up('fridge', 18, 2), up('sofa', 21, 2), up('diningTable', 18, 5), up('diningChair', 18, 6, 'up'), up('diningChair', 19, 6, 'up'), up('plant', 23, 8),
    ],
    coworkers: crew(['서책방 관장', '나목록 사서', '유열람 사서'], ['#6d4c41', '#a1887f', '#d7ccc8']),
    clients: [{ noun: '도서관 이용자', socials: ['recommendBook', 'findReference'], spots: [[2, 2], [5, 4], [2, 5], [5, 7], [21, 11]], max: 3, every: 40, patience: 120 }],
    alarm: { notice: '🏫 초등학생 단체 견학이 왔어요! 대출 데스크로 가세요', done: '🏫 아이들이 책을 한 아름 빌려 갔어요! 성과가 크게 올라요', missed: '⌛ 안내가 늦어 견학이 어수선했어요 (성과 감소)', interaction: 'fieldTripClass', every: [180, 300], window: 40 },
    tasks: [task('desk', '대출 반납', ['checkoutBooks'], 2), task('catalog', '분류·목록', ['catalogBooks']), task('shelve', '책 정리', ['shelveBooks'])],
    extra: [task('program', '독서 프로그램', ['readingProgram']), task('digital', '자료 디지털화', ['digitizeArchive']), task('patrons', '이용자 도움', ['recommendBook', 'findReference']), task('returns', '반납 도서 정리', ['libEmptyReturns', 'libSortReturns']), task('kiosk', '신착 도서 안내', ['libUpdateKiosk']), task('storybook', '그림책 고르기', ['libPickStorybook']), task('study', '열람실 둘러보기', ['atSuperviseStudy']), boss('관장님께 운영 보고')],
    work: ['checkoutBooks', 'fieldTripClass', 'catalogBooks', 'shelveBooks', 'readingProgram', 'digitizeArchive', 'recommendBook', 'findReference', 'libEmptyReturns', 'libSortReturns', 'libUpdateKiosk', 'libPickStorybook', 'atSuperviseStudy'],
    skill: 'logic',
    floors: { wood: 'oakWood', carpet: 'sageCarpet', tile: 'creamTile' },
    wall: 'oakWainscot',
  },
  tourGuide: {
    careerId: 'tourGuide',
    name: '여행사',
    icon: '🗺️',
    // A 여행사 on the ground floor of a row of shops (2026-11-05, the layout audit, replacing a building on a lawn whose customers waited
    // on a corridor of chairs to be seen at a paperwork counter, with a briefing room the biggest in the building and nearly empty, and
    // the coach parked at the office door). Behind the glass front with its sign and the package posters, the shop floor is where trips
    // are sold: three consultation tables, the agent on the office side and the customers across, going over the itinerary and the
    // quote; the brochure racks, the past groups' photo wall, the passport and visa counter, two seats for whoever's waiting. Behind,
    // the 기획 office where packages are put together and booked (desks, the big map, the files), a small meeting room (table, board,
    // map) and the guides' prep room: the flags, radios, name tags and luggage tags on the gear table, the travel insurance files, the
    // restroom off it. A guide's work is mostly elsewhere: the day's coach waits at the kerb, the agency's picket marking the 집결지
    // where the group is counted aboard; it drives off along the street.
    tiles: () =>
      shopUnit(
        18,
        2,
        [[2, 3, 7, 7, 'carpet'], [9, 3, 12, 7, 'carpet'], [14, 3, 17, 4, 'wood'], [14, 5, 14, 7, 'wood'], [16, 6, 17, 7, 'tile'], [2, 9, 17, 13, 'wood']],
        // The office, the meeting room and the prep room off the shop floor; the restroom off the prep room; the street door.
        [[5, 8], [11, 8], [14, 8], [16, 5], [12, 14]],
      ),
    restrooms: [[16, 6, 17, 7]],
    ground: [[0, 0, 25, 1, 'asphalt'], [19, 14, 25, 14, 'concrete'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The 기획 office: the big map, the files, the planners' desks.
      o('travelMap', 2, 3), o('archiveShelf', 7, 3), o('itineraryDesk', 2, 5), o('itineraryDesk', 3, 5), o('itineraryDesk', 4, 5), o('tgMateDesk', 6, 5), o('tgMateDesk', 7, 5),
      // The meeting room: the board and the map, the table.
      o('whiteboard', 9, 3), o('travelMap', 11, 3), o('diningTable', 10, 5), o('diningChair', 9, 5, 'right'), o('diningChair', 10, 6, 'up'), o('diningChair', 11, 6, 'up'),
      // The guides' prep room: the insurance files, the gear table; the restroom.
      o('archiveShelf', 14, 3), o('tgGearTable', 16, 3), o('toilet', 17, 6, 'left'), o('sink', 17, 7, 'left'),
      // The shop floor: three consultation tables, the agent behind each and two customers' chairs across.
      o('diningTable', 3, 12), o('diningChair', 3, 11), o('diningChair', 3, 13, 'up'), o('diningChair', 4, 13, 'up'),
      o('diningTable', 6, 12), o('diningChair', 6, 11), o('diningChair', 6, 13, 'up'), o('diningChair', 7, 13, 'up'),
      o('diningTable', 9, 12), o('diningChair', 9, 11), o('diningChair', 9, 13, 'up'), o('diningChair', 10, 13, 'up'),
      // The agency's board, the photo wall, the passport counter, the brochure racks, the waiting seats.
      o('tgAgencySign', 2, 9), o('tgPhotoWall', 16, 9), o('tgDocCounter', 14, 11), o('tgBrochureRack', 17, 11, 'left'), o('drWaitSeat', 14, 13, 'up'), o('drWaitSeat', 15, 13, 'up'), o('plant', 17, 13),
      // The street: the front, the shop next door, the coach at the kerb and the meeting point's picket.
      o('tgFront', 1, 15), o('tgNeighbor', 19, 3), o('tgMeetSign', 21, 14), o('tourBus', 19, 16),
    ],
    coworkers: crew(['안여정 대표', '박인솔 팀장', '김해설 가이드'], ['#00897b', '#26a69a', '#ffb74d']),
    // At the consultation tables, across from the agents.
    clients: [{ noun: '여행 손님', socials: ['recommendTrip', 'explainCustoms'], spots: [[2, 13], [5, 13], [8, 13]], max: 3, every: 50, patience: 120 }],
    alarm: { notice: '🚩 외국인 단체 관광객 가이드가 펑크 났어요! 관광버스로 가세요', done: '🚩 단체 관광을 멋지게 마쳤어요! 성과가 크게 올라요', missed: '⌛ 다른 가이드가 급히 투입됐어요 (성과 감소)', interaction: 'vipTour', every: [200, 320], window: 40 },
    tasks: [task('tour', '관광 안내', ['leadTour']), task('plan', '여행 일정 짜기', ['draftItinerary'], 2), task('study', '관광지 공부', ['studySites'])],
    extra: [task('clients', '손님 상담', ['recommendTrip', 'explainCustoms']), task('meeting', '상품 회의', ['attendMeeting']), task('archive', '여행 후기 정리', ['readArchive']), task('board', '탑승 안내', ['tgBoarding']), task('brochure', '안내 책자 채우기', ['tgRestock']), task('visa', '여권·사증 서류 확인', ['tgVisa']), task('gear', '수하물·장비 준비', ['tgTags', 'tgRadio']), task('photos', '단체 사진 정리', ['tgPinPhoto']), boss('대표님께 투어 보고')],
    work: ['leadTour', 'vipTour', 'draftItinerary', 'studySites', 'attendMeeting', 'readArchive', 'recommendTrip', 'explainCustoms', 'tgBoarding', 'tgRestock', 'tgVisa', 'tgTags', 'tgRadio', 'tgPinPhoto'],
    skill: 'charisma',
    floors: { carpet: 'sageCarpet', tile: 'creamTile', wood: 'oakWood' },
    wall: 'creamPlain',
  },
  weddingPlanner: {
    careerId: 'weddingPlanner',
    name: '웨딩 컨설팅',
    icon: '💒',
    // A 웨딩 컨설팅 on the ground floor of a row of shops (2026-11-05, the layout audit, replacing a building on a lawn entered through a
    // corridor of chairs, its consultations open in one big room, a dress shop's rails and fitting podium in a showroom, and a ceremony
    // arch on the grass out front). Behind the glass front the 안내 데스크 by the door and the sample lounge where couples wait and look:
    // the 스드메 package wall (studio, dress, make-up samples and tiers), the album and invitation shelf, the bouquet and decor samples,
    // the guest table set as at a hall, the florist's table where the bouquet samples are made up. Budgets are talked over in private: two
    // small consultation rooms off the lounge, the planner on the wall side of the table and the couple on the loveseat across. Behind,
    // the planners' office: the week's ceremony board, the budget desks, and the go-bag for the 웨딩홀 (the hall's photo and model, the cue
    // sheet and headset) that the planner takes to run a ceremony there; dresses are fitted at the partner dress shops, not here.
    tiles: () =>
      shopUnit(
        18,
        2,
        [[2, 3, 5, 6, 'carpet'], [7, 3, 10, 6, 'carpet'], [12, 3, 17, 6, 'wood'], [2, 8, 17, 10, 'wood'], [2, 11, 14, 13, 'wood'], [16, 12, 17, 13, 'tile']],
        // The two consultation rooms and the office off the lounge; the restroom; the street door.
        [[4, 7], [9, 7], [12, 7], [16, 11], [12, 14]],
      ),
    restrooms: [[16, 12, 17, 13]],
    ground: [[0, 0, 25, 1, 'asphalt'], [0, 15, 25, 17, 'concrete']],
    objects: [
      // The consultation rooms: the planner's chair against the wall, the table, the couple's loveseat across it.
      o('weddingConsult', 3, 4, 'up'), o('wpCoupleSofa', 3, 5, 'up'), o('plant', 2, 3),
      o('weddingConsult', 8, 4, 'up'), o('wpCoupleSofa', 8, 5, 'up'), o('plant', 10, 3),
      // The office: the ceremony board, the budget desks, the go-bag for the hall, the coffee.
      o('wpScheduleBoard', 12, 3), o('budgetDesk', 14, 3), o('budgetDesk', 15, 3), o('ceremonyArch', 16, 3), o('budgetDesk', 14, 6, 'up'), o('budgetDesk', 15, 6, 'up'), o('archiveShelf', 13, 6, 'up'), o('coffeeMaker', 17, 6, 'left'),
      // The sample lounge: the package wall, the bouquet samples, the albums and invitations, the florist's table, the guest table.
      o('wpPackageBoard', 2, 8), o('decorSample', 5, 8), o('wpAlbumShelf', 7, 8), o('flowerTable', 10, 8), o('wpTableSetting', 16, 8),
      // By the door the front desk; the waiting sofa and the table where albums are leafed through; the restroom.
      o('wpFrontDesk', 13, 9), o('sofa', 2, 12, 'right'), o('diningTable', 7, 12), o('diningChair', 7, 13, 'up'), o('diningChair', 8, 13, 'up'), o('plant', 14, 13),
      o('toilet', 17, 12, 'left'), o('sink', 17, 13, 'left'),
      // The street front, the shop next door.
      o('wpFront', 1, 15), o('tgNeighbor', 19, 3),
    ],
    coworkers: crew(['채축복 대표', '한설렘 실장', '오반지 플래너'], ['#ec407a', '#f8bbd0', '#fafafa']),
    // In the consultation rooms, beside the loveseat; on the lounge sofa.
    clients: [{ noun: '예비 부부', socials: ['hearWishes', 'showPortfolio'], spots: [[2, 5], [5, 5], [7, 5], [10, 5], [3, 12]], max: 2, every: 50, patience: 120 }],
    alarm: { notice: '💒 오늘 본식 담당 플래너가 못 온대요! 본식 출장 준비대에서 큐시트를 챙겨 웨딩홀로 가세요', done: '💒 결혼식을 완벽하게 진행했어요! 성과가 크게 올라요', missed: '⌛ 다른 플래너가 급히 맡았어요 (성과 감소)', interaction: 'weddingDay', every: [200, 320], window: 40 },
    tasks: [task('consult', '예비 부부 상담', ['consultCouple'], 2), task('budget', '예산 짜기', ['planBudget']), task('decor', '식장 장식 구상', ['styleCeremony', 'wpSetTable'])],
    extra: [task('ceremony', '결혼식 진행', ['runCeremony']), task('clients', '예비 부부 맞이', ['hearWishes', 'showPortfolio']), task('flowers', '꽃장식 만들기', ['arrangeFlowers', 'wrapBouquet']), task('package', '스드메 패키지 정리', ['wpSwapSamples']), task('schedule', '예식 일정 정리', ['wpCheckSchedule']), task('invite', '청첩장 샘플 고르기', ['wpPickInvitation']), boss('대표님께 진행 보고')],
    work: ['consultCouple', 'planBudget', 'styleCeremony', 'runCeremony', 'weddingDay', 'hearWishes', 'showPortfolio', 'arrangeFlowers', 'wrapBouquet', 'wpSwapSamples', 'wpCheckSchedule', 'wpPickInvitation', 'wpSetTable', 'readArchive'],
    skill: 'charisma',
    floors: { wood: 'oakWood', carpet: 'lilacCarpet', tile: 'creamTile' },
    wall: 'roseStripes',
  },
};
