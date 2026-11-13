import type { WorkplaceDef } from './workplace';
import { boss, building, chat, crew, o, patch, task, up, upstairs } from './workplaceKit';

/** Branch lots for public service and administration (branchLots.ts), by career id and branch number. */
export const PUBLIC_LOTS: Record<string, Partial<Record<number, WorkplaceDef>>> = {
  teacher: {
    // The 교육 전문직 branch at the 교육지원청 (2026-11-04, the branch lots): a 장학사 no longer teaches a class, but looks after
    // twenty-odd schools from an office. Along the back the 교육장실 (the desk, the sofa visitors are received on), the 장학협의실
    // where 교장 · 교감 come for 컨설팅, and the 교육지원과: the 장학사' desks in an island, the board of the district's schools,
    // the shelves of 공문 and 장학자료, the copier. In front the 민원실 (two counters, the certificate kiosk, the form stand, the
    // waiting seats) for parents and the public, the lobby, the 행정지원과 (budget and buildings), the pantry and the restroom.
    1: {
      careerId: 'teacher',
      name: '새솔교육지원청',
      icon: '🏫',
      tiles: () =>
        patch(
          building(
            [[2, 2, 5, 8, 'carpet'], [7, 2, 11, 8, 'wood'], [13, 2, 23, 8, 'carpet'], [2, 10, 8, 13, 'tile'], [10, 10, 13, 13, 'tile'], [15, 10, 18, 13, 'wood'], [20, 10, 23, 13, 'tile']],
            [[6, 5], [12, 5], [11, 9], [13, 9], [9, 12], [14, 12], [19, 12], [12, 14]],
          ),
          [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The 교육장실.
        o('teacherDesk', 3, 3), o('flagStand', 2, 2), o('bookshelf', 5, 2), o('sofa', 3, 7, 'up'), o('plant', 5, 8),
        // The 장학협의실: the table with 교장 · 교감 across it, the projector, the whiteboard.
        o('whiteboard', 8, 2), o('projector', 10, 2), o('salMeetingTable', 8, 5),
        o('salMeetingChair', 8, 4), o('salMeetingChair', 9, 4), o('salMeetingChair', 10, 4), o('salMeetingChair', 8, 6, 'up'), o('salMeetingChair', 9, 6, 'up'), o('salMeetingChair', 10, 6, 'up'),
        // The 교육지원과: the shelves, the schools board, the island of 장학사 desks, the 장학관's desk, the copier.
        o('archiveShelf', 13, 2), o('archiveShelf', 14, 2), o('archiveShelf', 16, 2), o('edSchoolBoard', 20, 2), o('plant', 23, 2), o('copier', 23, 4, 'left'),
        o('teacherDesk', 15, 5, 'up'), o('teacherDesk', 16, 5, 'up'), o('teacherDesk', 17, 5, 'up'), o('teacherDesk', 15, 6), o('teacherDesk', 16, 6), o('teacherDesk', 17, 6),
        o('teacherDesk', 21, 6), o('plant', 23, 8),
        // The 민원실.
        o('civilCounter', 3, 10), o('civilCounter', 5, 10), o('juTicket', 7, 10), o('juKiosk', 8, 10), o('juFormStand', 2, 13, 'up'),
        o('drWaitSeat', 5, 13, 'up'), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'),
        // The lobby, the 행정지원과, the pantry, the restroom.
        o('plant', 10, 13),
        o('officeDesk', 15, 10), o('officeDesk', 16, 10), o('officeDesk', 18, 11, 'left'), o('salSupplyCabinet', 16, 13, 'up'),
        o('coffeeMaker', 20, 10, 'right'), o('fridge', 23, 10, 'left'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      ],
      coworkers: crew(['정다솜 장학관', '오세린 장학사', '남궁현 주무관'], ['#37474f', '#5c6bc0', '#90a4ae']),
      clients: [
        // 교장 · 교감 in for 컨설팅, across the 협의실 table.
        { noun: '교장·교감', socials: ['answerQuestion'], spots: [[11, 4], [7, 6]], max: 1, every: 80, patience: 150 },
        // Parents and the public at the 민원실.
        { noun: '학부모 민원인', socials: ['answerQuestion'], spots: [[5, 12], [6, 12], [7, 12]], max: 2, every: 60, patience: 120 },
      ],
      alarm: { notice: '🚨 관내 학교에서 학교폭력 긴급 보고가 들어왔어요! 학교 현황판에서 대응하세요', done: '🏫 학교와 함께 빠르게 수습했어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 학부모 항의가 커졌어요 (성과 감소)', interaction: 'edSchoolIncident', every: [200, 320], window: 45 },
      tasks: [task('doc', '학교에 보낼 공문 쓰기', ['teacher_officialDoc'], 2), task('plan', '학교 교육 계획 검토하기', ['planLesson']), task('visit', '찾아가는 컨설팅 일정 잡기', ['edVisitPlan'])],
      extra: [task('results', '학력 평가 결과 검토하기', ['gradePapers']), task('meeting', '교장·교감 협의회 준비하기', ['attendMeeting', 'rehearsePresentation']), task('archive', '장학 자료 찾기', ['readArchive']), task('copies', '연수 자료 복사하기', ['makeCopies']), boss('교육장님께 장학 결과 보고하기'), chat(2)],
      work: ['teacher_officialDoc', 'planLesson', 'gradePapers', 'edVisitPlan', 'edSchoolIncident', 'attendMeeting', 'rehearsePresentation', 'readArchive', 'makeCopies', 'answerQuestion'],
      skill: 'writing',
      floors: { carpet: 'sageCarpet', wood: 'oakWood', tile: 'creamTile' },
      wall: 'creamPlain',
    },
  },
  socialWorker: {
    // The 사회복지 공무원 branch at a 행정복지센터's 맞춤형복지팀 (2026-11-04, the branch lots): the 복지 side made big, the general
    // 민원 small, so it isn't the civil servant's 주민센터. Along the back the team's office (the case desks, the shelves of 공문,
    // the board of households at risk from the 단전 · 단수 alerts), the 사례회의실, and the store of donated goods and the food
    // market's stock. In front the hall: the 복지 상담 booth and its waiting seats on the left, the number machine, the form stand,
    // two general counters and the kiosk on the right; behind its corridor the two closed 상담실 and the restroom. The visiting car
    // out front, for the households that can't come in.
    1: {
      careerId: 'socialWorker',
      name: '새솔동 행정복지센터 맞춤형복지팀',
      icon: '🤝',
      tiles: () =>
        building(
          [[2, 2, 11, 8, 'tile'], [13, 2, 17, 8, 'carpet'], [19, 2, 23, 8, 'wood'], [2, 10, 12, 13, 'tile'], [14, 10, 23, 10, 'tile'], [14, 12, 16, 13, 'carpet'], [18, 12, 20, 13, 'carpet'], [22, 12, 23, 13, 'tile']],
          [[6, 9], [12, 5], [20, 9], [13, 10], [15, 11], [19, 11], [22, 11], [12, 14]],
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The team's office: the case desks, the shelves, the risk board, the 팀장's desk, the copier.
        o('caseDesk', 3, 3), o('caseDesk', 5, 3), o('caseDesk', 7, 3), o('caseDesk', 9, 3), o('archiveShelf', 2, 6, 'right'), o('archiveShelf', 2, 7, 'right'),
        o('whiteboard', 4, 8, 'up'), o('officeDesk', 9, 6), o('copier', 11, 7, 'left'), o('plant', 11, 2),
        // The 사례회의실.
        o('salMeetingTable', 14, 5), o('salMeetingChair', 14, 4), o('salMeetingChair', 15, 4), o('salMeetingChair', 16, 4), o('salMeetingChair', 14, 6, 'up'), o('salMeetingChair', 15, 6, 'up'), o('salMeetingChair', 16, 6, 'up'), o('plant', 17, 2),
        // The store: donated goods, the relief cage, the food market's fridge.
        o('donationShelf', 20, 2), o('donationShelf', 21, 2), o('donationShelf', 22, 2), o('juReliefCage', 23, 4, 'left'), o('fridge', 23, 7, 'left'),
        // The hall: the 복지 상담 booth and its seats; the number machine and form stand; the general counters and kiosk.
        o('juWelfareBooth', 2, 10), o('plant', 2, 13), o('drWaitSeat', 5, 13, 'up'), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'),
        o('juTicket', 8, 10), o('juFormStand', 9, 13, 'up'), o('civilCounter', 10, 10), o('civilCounter', 11, 10), o('juKiosk', 9, 10),
        // The two 상담실 behind the corridor: a table and two chairs each.
        o('diningTable', 14, 13), o('diningChair', 14, 12), o('diningChair', 16, 13, 'left'),
        o('diningTable', 18, 13), o('diningChair', 18, 12), o('diningChair', 20, 13, 'left'),
        o('toilet', 22, 13, 'up'), o('sink', 23, 13, 'up'),
        // The visiting car.
        o('welfareVan', 15, 15),
      ],
      coworkers: crew(['임예준 복지팀장', '진솔 사회복지주무관', '양미래 사례관리사'], ['#2e7d32', '#66bb6a', '#a5d6a7']),
      // Residents in for 기초생활 or 긴급지원, waiting by the booth.
      clients: [{ noun: '복지 상담 주민', socials: ['listenToElder', 'explainBenefits'], spots: [[5, 12], [6, 12], [7, 12]], max: 2, every: 50, patience: 150 }],
      alarm: { notice: '📞 단전·단수 알림이 뜬 1인 가구와 연락이 안 돼요! 방문 차량으로 가세요', done: '🏠 무사하셨어요. 긴급지원도 바로 연결했어요! 성과가 크게 올라요', missed: '⌛ 방문이 늦어져 걱정을 끼쳤어요 (성과 감소)', interaction: 'checkOnElder', every: [200, 320], window: 45 },
      tasks: [task('case', '사례 관리', ['manageCase'], 2), task('note', '상담 기록 쓰기', ['writeCaseNote']), task('welfare', '복지 상담 부스 상담', ['juWelfare'])],
      extra: [task('meeting', '사례 회의', ['attendMeeting']), task('donations', '후원 물품 정리', ['sortDonations']), task('relief', '긴급 구호 물품 점검', ['juReliefCheck']), task('archive', '지난 기록 찾기', ['readArchive']), task('visit', '위기가구 방문', ['checkOnElder']), boss('팀장님께 사례 보고')],
      work: ['manageCase', 'writeCaseNote', 'juWelfare', 'attendMeeting', 'sortDonations', 'juReliefCheck', 'readArchive', 'checkOnElder', 'issueCertificate', 'juHelp', 'listenToElder', 'explainBenefits'],
      skill: 'writing',
      floors: { tile: 'creamTile', carpet: 'sageCarpet', wood: 'oakWood' },
      wall: 'creamPlain',
    },
  },
  civilServant: {
    // The 정책 기획 branch at a ministry in the government complex (2026-11-04, the branch lots): one 과 on one floor. Along the back
    // the 국장실, the 정책기획과 itself (the 사무관 and 주무관 desks in an island, the 과장's desk at the far end, the shelves, the
    // cabinet and the copier) and the big meeting room where the 업무 보고 is held. In front the lobby behind its security gates
    // (the visitors' desk where a pass is issued, the visitors' chairs, the restroom), the small meeting room where 관계 기관 and
    // groups are met, and the staff pantry. The official car out front.
    1: {
      careerId: 'civilServant',
      name: '정부새솔청사 정책기획과',
      icon: '🏛️',
      tiles: () =>
        patch(
          building(
            [[2, 2, 5, 8, 'carpet'], [7, 2, 17, 8, 'tile'], [19, 2, 23, 8, 'carpet'], [2, 10, 13, 13, 'tile'], [15, 10, 18, 13, 'carpet'], [20, 10, 23, 13, 'wood']],
            [[6, 5], [18, 5], [11, 9], [23, 9], [14, 11], [12, 14]],
          ),
          [[2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door']],
        ),
      restrooms: [[2, 12, 3, 13]],
      objects: [
        // The 국장실.
        o('officeDesk', 3, 3), o('flagStand', 2, 2), o('bookshelf', 5, 2), o('sofa', 3, 7, 'up'), o('plant', 5, 8),
        // The 정책기획과: the desk island, the 과장's desk, the shelves, the cabinet, the copier.
        o('officeDesk', 9, 4, 'up'), o('officeDesk', 10, 4, 'up'), o('officeDesk', 11, 4, 'up'), o('officeDesk', 9, 5), o('officeDesk', 10, 5), o('officeDesk', 11, 5),
        o('officeDesk', 16, 4, 'left'), o('archiveShelf', 12, 2), o('archiveShelf', 13, 2), o('archiveShelf', 14, 2), o('salSupplyCabinet', 7, 8, 'up'), o('copier', 13, 8, 'up'), o('plant', 17, 8),
        // The meeting room: the whiteboard and projector, the long table.
        o('whiteboard', 20, 2), o('projector', 22, 2), o('salMeetingTable', 20, 5),
        o('salMeetingChair', 20, 4), o('salMeetingChair', 21, 4), o('salMeetingChair', 22, 4), o('salMeetingChair', 20, 6, 'up'), o('salMeetingChair', 21, 6, 'up'), o('salMeetingChair', 22, 6, 'up'),
        // The lobby: the gates, the guard's desk, the visitors' chairs; the restroom.
        o('sgSpeedGate', 10, 12), o('icBadgeDesk', 5, 10), o('salMeetingChair', 8, 10), o('salMeetingChair', 9, 10), o('plant', 8, 13), o('plant', 13, 13),
        o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
        // The small meeting room.
        o('salMeetingTable', 16, 11), o('salMeetingChair', 18, 10), o('salMeetingChair', 16, 12, 'up'), o('salMeetingChair', 17, 12, 'up'), o('salMeetingChair', 18, 12, 'up'),
        // The pantry.
        o('coffeeMaker', 20, 10), o('fridge', 21, 10), o('salWaterCooler', 22, 10), o('sofa', 21, 13, 'up'), o('plant', 23, 13),
        // Out front: the official car, the flower beds.
        o('escortCar', 15, 15), o('plant', 9, 15), o('plant', 10, 15),
      ],
      coworkers: crew(['한기획 과장', '류정책 사무관', '서예산 주무관'], ['#455a64', '#7986cb', '#90a4ae']),
      // Visitors from 관계 기관 and groups: waiting in the lobby, then the small meeting room.
      clients: [{ noun: '관계 기관 담당자', socials: ['guideCivil', 'calmComplainant'], spots: [[8, 11], [9, 11], [17, 10], [15, 12]], max: 2, every: 60, patience: 140 }],
      alarm: { notice: '🏛️ 장관님 긴급 보고가 잡혔어요! 대회의실 프로젝터로 가세요', done: '📊 보고를 잘 마치고 지시를 받아 왔어요! 성과가 크게 올라요', missed: '⌛ 보고에 늦어 과장님이 대신 들어갔어요 (성과 감소)', interaction: 'executiveReport', every: [200, 320], window: 45 },
      tasks: [task('report', '국회 자료 요구 답변서 쓰기', ['writeReport'], 2), task('data', '통계로 정책 효과 따져 보기', ['crunchNumbers']), task('meeting', '과 회의', ['attendMeeting'])],
      extra: [task('rules', '법령·지난 자료 찾기', ['readArchive']), task('copies', '보고 자료 복사하기', ['makeCopies']), task('rehearse', '보고 연습하기', ['rehearsePresentation']), task('pass', '방문증 내주기', ['icIssueBadge']), task('supplies', '문서 파쇄·비품 정리', ['salShredDocs', 'salStockSupplies']), boss('과장님께 결재받기'), chat(1)],
      work: ['writeReport', 'crunchNumbers', 'attendMeeting', 'readArchive', 'makeCopies', 'rehearsePresentation', 'executiveReport', 'icIssueBadge', 'salShredDocs', 'salStockSupplies', 'guideCivil', 'calmComplainant'],
      skill: 'logic',
      floors: { carpet: 'sageCarpet', tile: 'creamTile', wood: 'oakWood' },
      wall: 'creamPlain',
    },
  },
  conservationist: {
    // The 환경 관리자 branch at a national park office (2026-11-04, the branch lots), chosen over a regional environment office
    // because the park's work can be seen. The building is pulled forward to leave the back for the forest: the trail's entrance
    // from the back door, the hikers' sign-in stand, the trail sign and the fire tools shed under the ridge. Inside along the back
    // the 소장실, the 자원보전과 (the water test benches, the camera-trap desk, the herbarium, the field gear), the 재난안전
    // 상황실 (the trail cameras on the big screen, the patrol board, the rescue lockers) and a small meeting room. In front the
    // 탐방지원센터: the information desk, the stream display and the park model, the waiting seats; the pantry and the restroom.
    // The patrol jeep out front.
    0: {
      careerId: 'conservationist',
      name: '솔재산 국립공원사무소',
      icon: '🌲',
      tiles: () =>
        patch(
          building(
            [[2, 5, 4, 8, 'carpet'], [6, 5, 13, 8, 'tile'], [15, 5, 20, 8, 'tile'], [22, 5, 23, 8, 'carpet'], [2, 10, 15, 13, 'wood'], [17, 10, 23, 13, 'tile']],
            [[5, 6], [14, 6], [21, 7], [8, 9], [15, 9], [16, 12], [12, 14]],
          ),
          [
            ...Array.from({ length: 24 * 3 }, (_, i): [number, number, 'grass'] => [1 + (i % 24), 1 + Math.floor(i / 24), 'grass']),
            [12, 4, 'door' as 'grass'],
            [22, 11, 'wall' as 'grass'], [23, 11, 'wall' as 'grass'], [21, 12, 'wall' as 'grass'], [21, 13, 'door' as 'grass'],
          ],
        ),
      restrooms: [[22, 12, 23, 13]],
      // The trail up from the back door, stone steps into the forest.
      ground: [[12, 2, 12, 3, 'slateStone']],
      objects: [
        // Under the ridge: the sign-in stand, the trail sign, the forest road sign, the fire tools shed.
        o('fgHills', 4, 0), o('fgVisitorBoard', 8, 2), o('trailSign', 11, 2), o('fgRoadSign', 14, 2), o('fgFireShed', 19, 2), o('fgLogs', 2, 3),
        // The 소장실.
        o('officeDesk', 3, 5), o('sofa', 2, 8, 'up'), o('plant', 4, 8),
        // The 자원보전과.
        o('waterTestBench', 7, 5), o('waterTestBench', 9, 5), o('ecoCameraDesk', 6, 8, 'up'), o('ecoHerbarium', 9, 8, 'up'), o('ecoFieldRack', 11, 8, 'up'),
        // The 상황실.
        o('situationWall', 16, 5), o('fgPatrolBoard', 20, 5, 'left'), o('officeDesk', 16, 8, 'up'), o('icGearLocker', 18, 8, 'up'),
        // The meeting room.
        o('diningTable', 23, 6, 'left'), o('diningChair', 23, 5), o('diningChair', 23, 8, 'up'),
        // The 탐방지원센터.
        o('ecoStreamDisplay', 2, 10), o('fgDesk', 5, 12, 'up'), o('archSiteModel', 11, 10), o('drWaitSeat', 8, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('drWaitSeat', 10, 13, 'up'), o('plant', 14, 13),
        // The pantry and the restroom.
        o('coffeeMaker', 17, 10), o('fridge', 18, 10), o('sofa', 17, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The patrol jeep.
        o('ecoJeep', 15, 15),
      ],
      coworkers: crew(['윤솔재 소장', '고산들 자원보전과장', '하늘빛 재난안전 담당'], ['#2e7d32', '#558b2f', '#ef6c00']),
      clients: [{ noun: '탐방객', socials: ['ecoEducation', 'answerNature'], spots: [[8, 12], [9, 12], [10, 12]], max: 2, every: 50, patience: 120 }],
      alarm: { notice: '🆘 탐방로에서 조난 신고! 상황실 화면에서 위치를 잡으세요', done: '⛑️ 조난자를 찾아 무사히 데려왔어요! 성과가 크게 올라요', missed: '⌛ 위치를 늦게 잡아 119가 먼저 찾았어요 (성과 감소)', interaction: 'crisisResponse', every: [200, 320], window: 45 },
      tasks: [task('water', '계곡 수질 검사하기', ['testWater'], 2), task('camera', '무인카메라로 멸종위기종 살피기', ['ecoReviewCamera']), task('patrol', '탐방로 순찰 계획', ['fgPatrol'])],
      extra: [task('trail', '탐방로 정비', ['maintainTrail']), task('signin', '입산 신고 확인', ['fgSignIn']), task('gear', '현장 장비 점검', ['ecoCheckGear', 'fgCheckGear']), task('survey', '현장 조사 나가기', ['fieldSurvey', 'ecoLoadSurveyGear']), task('herbarium', '식물 표본 만들기', ['ecoMountPlant']), task('screens', '탐방로 CCTV 살피기', ['monitorSituation']), task('display', '생태 전시 준비', ['ecoPrepareTour']), boss('소장님께 보고하기')],
      work: ['testWater', 'logData', 'ecoReviewCamera', 'fgPatrol', 'maintainTrail', 'fgSignIn', 'ecoCheckGear', 'fgCheckGear', 'fieldSurvey', 'ecoLoadSurveyGear', 'ecoMountPlant', 'monitorSituation', 'crisisResponse', 'ecoPrepareTour', 'ecoEducation', 'answerNature'],
      skill: 'law',
      floors: { carpet: 'sageCarpet', tile: 'creamTile', wood: 'oakWood' },
      wall: 'oakWainscot',
    },
    // The 해양 생물학자 branch at a coastal marine research institute (2026-11-04, the layout audit: the branch had no lot of its own and
    // used the 생태 연구 센터, with no sea, no boat, no diving and three tanks in a back room). Laid out as the coast's real institutes
    // are, on the water with their own pier, the wet work downstairs and the dry work upstairs. The sea along the back and the research
    // boat at the quay; on the quay the bitts, the CTD winch that lowers the sensor and the water bottles, the nets and pots. Off the
    // quay the diving room (the dive kit, the wetsuits drying, the air compressor, the shower) and the tank hall (two round rearing
    // tanks fed round the clock by the seawater plant: intake, sand filter, UV, chiller). Between them the wet lab (the tanks the fish
    // are counted in, the water test benches, the measuring and dissecting board) and the lobby where school groups come to the touch
    // tank and the display, with the stairs. Upstairs the dry lab (microscopes for the plankton, the sample freezers, the analyser), the
    // researchers' office, the meeting room that is also the staff room, the director's office and the restroom. The survey car out front.
    1: {
      careerId: 'conservationist',
      name: '한빛해양연구소',
      icon: '🌊',
      tiles: () => [
        ...patch(
          building(
            [[2, 8, 5, 13, 'tile'], [7, 8, 10, 13, 'tile'], [12, 8, 15, 13, 'wood'], [17, 8, 23, 13, 'tile']],
            [[6, 10], [11, 12], [16, 10], [12, 14]],
          ),
          [
            // The sea and the quay along the back, the building's back wall on the quay with its two doors.
            ...Array.from({ length: 26 * 7 }, (_, i): [number, number, 'water' | 'grass'] => [i % 26, Math.floor(i / 26), Math.floor(i / 26) <= 3 ? 'water' : 'grass']),
            ...Array.from({ length: 24 }, (_, i): [number, number, 'wall'] => [1 + i, 7, 'wall']),
            [4, 7, 'door' as 'wall'], [19, 7, 'door' as 'wall'],
          ],
        ),
        ...patch(
          upstairs(
            [[2, 8, 6, 10, 'tile'], [4, 11, 6, 11, 'tile'], [8, 8, 11, 11, 'carpet'], [15, 8, 18, 11, 'wood'], [20, 8, 23, 11, 'carpet'], [5, 13, 23, 13, 'wood'], [13, 10, 13, 12, 'wood'], [2, 12, 3, 13, 'tile']],
            [[5, 12], [10, 12], [16, 12], [21, 12], [4, 13]],
          ),
          [
            ...Array.from({ length: 26 * 7 }, (_, i): [number, number, 'void'] => [i % 26, Math.floor(i / 26), 'void']),
            ...Array.from({ length: 24 }, (_, i): [number, number, 'wall'] => [1 + i, 7, 'wall']),
          ],
        ),
      ],
      restrooms: [[2, 30, 3, 31]],
      ground: [[0, 4, 25, 6, 'quayConcrete'], [0, 15, 25, 17, 'concrete']],
      objects: [
        // The sea and the quay: the boat alongside, bow east to open water; the quay edge, the bitts, the CTD winch, the nets and pots.
        o('mrResearchBoat', 8, 1), o('hbQuayEdge', 0, 4), o('sfMooringBitt', 9, 4), o('sfMooringBitt', 14, 4), o('sfMooringBitt', 19, 4),
        o('mrCtdDavit', 2, 4), o('mrNetPile', 21, 6, 'up'),
        // The diving room: the dive kit, the air compressor, the wetsuits drying, the shower.
        o('cgDiveRack', 2, 8), o('ffAirCompressor', 5, 9, 'left'), o('cgWetsuitRack', 2, 13, 'up'), o('shower', 5, 13),
        // The wet lab: the survey tanks, the measuring board, the water test benches.
        o('specimenTank', 7, 8), o('specimenTank', 8, 8), o('specimenTank', 10, 11, 'left'), o('mrMeasureBoard', 10, 8, 'left'),
        o('waterTestBench', 7, 13, 'up'), o('waterTestBench', 9, 13, 'up'),
        // The lobby: the stairs, the display, the touch tank.
        o('stairs', 13, 10, 'up'), o('plant', 12, 8), o('mrExhibit', 14, 8), o('aquarium', 15, 11, 'left'),
        // The tank hall: the round rearing tanks, the seawater plant, a tank of the season's specimens.
        o('mrRoundTank', 18, 10), o('mrRoundTank', 21, 10), o('mrSeawaterPlant', 22, 8), o('specimenTank', 17, 13, 'up'),
        // The survey car.
        o('ecoJeep', 15, 15),
        // Upstairs. The dry lab: the microscopes, the analyser, the sample freezers.
        up('microscopeBench', 2, 8), up('microscopeBench', 3, 8), up('analyzerMachine', 5, 8), up('specimenFreezer', 6, 10, 'left'), up('specimenFreezer', 6, 11, 'left'),
        // The researchers' office.
        up('researchDesk', 8, 8), up('researchDesk', 9, 8), up('researchDesk', 8, 11, 'up'), up('researchDesk', 9, 11, 'up'), up('archiveShelf', 11, 8, 'left'),
        // The meeting room, also the staff room.
        up('salMeetingTable', 16, 9), up('salMeetingChair', 16, 10, 'up'), up('salMeetingChair', 17, 10, 'up'), up('salMeetingChair', 18, 10, 'up'),
        up('coffeeMaker', 18, 8, 'left'),
        // The director's office; the restroom.
        up('officeDesk', 22, 9), up('archiveShelf', 23, 8), up('plant', 20, 8), up('sofa', 20, 10, 'right'),
        up('toilet', 2, 12, 'right'), up('sink', 2, 13, 'right'),
      ],
      coworkers: crew(['한바다 연구소장', '윤물결 선임연구원', '도해조 연구선 선장'], ['#0d47a1', '#00838f', '#37474f']),
      // School groups at the touch tank and the display.
      clients: [{ noun: '견학 온 학생', socials: ['ecoEducation', 'answerNature'], spots: [[14, 9], [14, 11], [14, 12]], max: 2, every: 60, patience: 120, age: 'child' }],
      alarm: { notice: '🌊 적조·고수온 특보! 연구선으로 긴급 채수 조사 나가세요', done: '🧪 적조 해역 시료를 제때 떠 왔어요! 성과가 크게 올라요', missed: '⌛ 출항이 늦어 다른 기관이 먼저 채수했어요 (성과 감소)', interaction: 'mrUrgentSampling', every: [200, 320], window: 45 },
      tasks: [task('fish', '어류 개체 수 조사', ['monitorSpecies', 'mrMeasureFish'], 2), task('tanks', '사육 수조 관리(먹이·수질)', ['mrFeedTank', 'feedSpecies']), task('cruise', '연구선 출항 채집', ['mrSampleCruise', 'mrCastCtd'])],
      extra: [
        task('dive', '과학잠수 준비·장비 세척', ['cgGearUp', 'cgRegCheck', 'cgRinseSuit', 'ffFillAir']), task('plankton', '현미경 플랑크톤 분석', ['examineSlides']), task('samples', '시료 냉동 보관', ['storeSamples']),
        task('water', '해수 수질 분석', ['testWater', 'logData']), task('seawater', '해수 설비 점검', ['mrCheckSeawater']), task('boat', '출항 전 연구선 점검', ['mrBoatCheck', 'sfTieKnot']),
        task('paper', '논문 쓰기', ['writePaper']), task('archive', '지난 조사 자료 찾기', ['readArchive']), task('exhibit', '전시·견학 준비', ['mrPrepareExhibit']), task('meeting', '연구 회의', ['salTableMeeting']),
        boss('연구소장님께 조사 결과 보고하기'), chat(1),
      ],
      work: [
        'monitorSpecies', 'feedSpecies', 'mrMeasureFish', 'mrFeedTank', 'mrSampleCruise', 'mrUrgentSampling', 'mrBoatCheck', 'mrCastCtd', 'mrCheckSeawater', 'mrPrepareExhibit',
        'cgGearUp', 'cgRegCheck', 'cgRinseSuit', 'ffFillAir', 'examineSlides', 'storeSamples', 'testWater', 'logData', 'sfTieKnot', 'writePaper', 'readArchive', 'salTableMeeting', 'ecoEducation', 'answerNature',
      ],
      skill: 'fishing',
      floors: { tile: 'aquaTile', wood: 'oakWood', carpet: 'sageCarpet' },
      wall: 'creamPlain',
    },
  },
  politician: {
    // The 사회 운동가 branch at a civic group's office (2026-11-04, the branch lots): a small rented office in an old building. Along
    // the back the 사무국 (the activists' desks, the campaign board, the map of local issues), the 운영위 room (the 상임대표's
    // desk and the meeting table) and the education room where members' classes are held (the whiteboard and projector, rows of
    // chairs). In front the 시민 상담 창구 where people come to report what's happened to them, the lobby, the room of materials
    // (the shelves, the copier, the files), the pantry and the restroom. Signature drives and press conferences are held outside,
    // at the signature stand on the pavement with its stand-up sign.
    1: {
      careerId: 'politician',
      name: '함께여는 시민모임',
      icon: '📣',
      tiles: () =>
        patch(
          building(
            [[2, 2, 10, 8, 'wood'], [12, 2, 16, 8, 'carpet'], [18, 2, 23, 8, 'wood'], [2, 10, 7, 13, 'tile'], [9, 10, 13, 13, 'tile'], [15, 10, 17, 13, 'wood'], [19, 10, 23, 13, 'tile']],
            [[10, 9], [13, 9], [17, 5], [19, 9], [8, 12], [14, 12], [18, 11], [12, 14]],
          ),
          [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The 사무국.
        o('campaignDesk', 3, 3), o('campaignDesk', 5, 3), o('campaignDesk', 7, 3), o('campaignDesk', 3, 6), o('campaignDesk', 5, 6), o('polDistrictMap', 2, 8, 'up'), o('whiteboard', 8, 2), o('plant', 10, 2),
        // The 운영위 room: the 상임대표's desk, the meeting table.
        o('campaignDesk', 15, 3), o('salMeetingTable', 13, 6), o('salMeetingChair', 13, 5), o('salMeetingChair', 14, 5), o('salMeetingChair', 15, 5), o('salMeetingChair', 13, 7, 'up'), o('salMeetingChair', 14, 7, 'up'), o('salMeetingChair', 15, 7, 'up'),
        // The education room.
        o('whiteboard', 20, 2), o('projector', 22, 2), o('diningChair', 19, 5, 'up'), o('diningChair', 20, 5, 'up'), o('diningChair', 21, 5, 'up'), o('diningChair', 22, 5, 'up'), o('diningChair', 19, 7, 'up'), o('diningChair', 20, 7, 'up'), o('diningChair', 21, 7, 'up'), o('diningChair', 22, 7, 'up'),
        // The 시민 상담 창구.
        o('polPetitionDesk', 5, 11, 'up'), o('diningChair', 5, 12, 'up'), o('diningChair', 6, 12, 'up'), o('polPetitionCabinet', 2, 10), o('plant', 2, 13),
        // The lobby; the materials room; the pantry and the restroom.
        o('plant', 9, 13),
        o('bookshelf', 15, 10), o('bookshelf', 16, 10), o('copier', 17, 13, 'left'),
        o('coffeeMaker', 20, 10), o('fridge', 23, 10, 'left'), o('sofa', 19, 12, 'right'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // Outside: the signature stand, a chair for whoever stops to sign, the stand-up sign.
        o('actSignBooth', 5, 15), o('diningChair', 7, 15), o('cvABoard', 9, 15),
      ],
      coworkers: crew(['한누리 상임대표', '송바름 사무국장', '조아라 활동가'], ['#c62828', '#ef6c00', '#ffb300']),
      clients: [
        // Citizens come in to report what's happened to them.
        { noun: '제보하러 온 시민', socials: ['hearComplaint'], spots: [[5, 13], [6, 13]], max: 1, every: 60, patience: 150 },
        // Passers-by at the signature table.
        { noun: '서명하는 시민', socials: ['persuadeVoter'], spots: [[7, 16]], max: 1, every: 50, patience: 80 },
      ],
      alarm: { notice: '📣 긴급 현안이 터졌어요! 사무실 앞에서 기자 회견을 여세요', done: '📣 성명이 기사로 크게 났어요! 성과가 크게 올라요', missed: '⌛ 회견을 놓쳐 목소리를 못 냈어요 (성과 감소)', interaction: 'actStreetCampaign', every: [200, 320], window: 60 },
      tasks: [task('voters', '시민 목소리 듣기', ['hearComplaint', 'polLogComplaint'], 2), task('policy', '정책 제안서 쓰기', ['draftPolicy'], 2), task('signatures', '거리 서명 운동', ['actCollectSign', 'persuadeVoter'])],
      extra: [task('lecture', '시민 강좌 준비하기', ['rehearsePresentation']), task('district', '지역 현안·제보 서류 챙기기', ['polDistrictPlan', 'polFilePetitions']), task('meeting', '활동가 회의', ['attendMeeting']), task('copies', '성명서·자료집 복사하기', ['makeCopies']), boss('상임대표님께 활동 보고하기'), chat(1)],
      work: ['hearComplaint', 'persuadeVoter', 'polLogComplaint', 'draftPolicy', 'actCollectSign', 'actStreetCampaign', 'rehearsePresentation', 'polDistrictPlan', 'polFilePetitions', 'attendMeeting', 'makeCopies'],
      skill: 'empathy',
      floors: { wood: 'oakWood', carpet: 'lilacCarpet', tile: 'creamTile' },
      wall: 'redBrick',
    },
  },
  diplomat: {
    // The 국제기구 branch at an international organisation's office, a floor of an office tower (2026-11-04, the branch lots). Along
    // the back the head of office's room, the conference room (the table with the member states' delegates across it, their flags
    // behind, the interpreters' booth), the video conference room where headquarters is called, and the documents room. In front
    // the experts' open office (desks under the world clocks), the reception with its security desk and visitors' chairs, the
    // lounge and the restroom. Flags out front.
    1: {
      careerId: 'diplomat',
      name: '아시아태평양 물자원협력기구 사무소',
      icon: '🌐',
      tiles: () =>
        patch(
          building(
            [[2, 2, 5, 8, 'carpet'], [7, 2, 15, 8, 'carpet'], [17, 2, 20, 8, 'carpet'], [22, 2, 23, 8, 'wood'], [2, 10, 8, 13, 'carpet'], [10, 10, 14, 13, 'tile'], [16, 10, 23, 13, 'wood']],
            [[4, 9], [11, 9], [18, 9], [22, 9], [9, 11], [15, 12], [12, 14]],
          ),
          [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The head of office's room.
        o('diplomatDesk', 3, 3), o('flagStand', 2, 2), o('bookshelf', 5, 2), o('sofa', 2, 7, 'up'),
        // The conference room.
        o('dpFlagRow', 7, 4, 'right'), o('negotiationTable', 10, 4), o('dpDelegateChair', 10, 3), o('dpDelegateChair', 11, 3), o('dpDelegateChair', 12, 3), o('dpDelegateChair', 10, 5, 'up'), o('dpDelegateChair', 11, 5, 'up'), o('dpDelegateChair', 12, 5, 'up'),
        o('dpInterpreterBooth', 14, 7, 'left'), o('plant', 7, 2), o('plant', 15, 2),
        // The video conference room.
        o('anMonitorWall', 20, 3, 'left'), o('salMeetingTable', 18, 3, 'left'), o('salMeetingChair', 17, 3, 'right'), o('salMeetingChair', 17, 4, 'right'), o('plant', 17, 8),
        // The documents room.
        o('archiveShelf', 22, 2), o('archiveShelf', 23, 4, 'left'), o('archiveShelf', 23, 5, 'left'), o('archiveShelf', 23, 6, 'left'), o('archiveShelf', 23, 7, 'left'),
        // The open office.
        o('dpWorldClocks', 5, 10), o('diplomatDesk', 2, 10), o('diplomatDesk', 3, 10), o('diplomatDesk', 7, 10), o('diplomatDesk', 2, 13, 'up'), o('diplomatDesk', 3, 13, 'up'), o('diplomatDesk', 5, 13, 'up'), o('plant', 8, 13),
        // The reception.
        o('sgVisitorDesk', 12, 10), o('salMeetingChair', 10, 13, 'up'), o('salMeetingChair', 11, 13, 'up'), o('plant', 14, 13),
        // The lounge and the restroom.
        o('coffeeMaker', 16, 10), o('fridge', 17, 10), o('sofa', 17, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The flags out front.
        o('flagStand', 8, 15), o('flagStand', 9, 15), o('flagStand', 10, 15),
      ],
      coworkers: crew(['아만다 리 사무소장', '구하은 사업 담당관', '라훌 메타 정책 전문가'], ['#1a237e', '#3949ab', '#00897b']),
      // Member states' delegates: waiting at the reception, then across the conference table.
      clients: [{ noun: '회원국 대표', socials: ['cultureExchange', 'negotiateTreaty'], spots: [[10, 12], [11, 12], [9, 3], [13, 5]], max: 2, every: 70, patience: 160 }],
      alarm: { notice: '🌐 회원국에서 재난 지원 요청이 왔어요! 긴급 회의를 열러 회의실로 가세요', done: '🤝 지원 계획을 하루 만에 합의했어요! 성과가 크게 올라요', missed: '⌛ 회의에 늦어 본부가 대신 정했어요 (성과 감소)', interaction: 'emergencySummit', every: [200, 320], window: 60 },
      tasks: [task('research', '지역 협력 정책 분석하기', ['studyRegion'], 2), task('translate', '회의 문서 번역하기', ['translateDocs']), task('talks', '회원국 실무 협의', ['conductTalks'])],
      extra: [task('interpret', '회의 통역 돕기', ['dpInterpret']), task('archive', '사업 자료 찾기', ['readArchive']), task('flags', '회원국 깃발 정리', ['adjustFlags']), boss('사무소장님께 보고하기'), chat(1)],
      work: ['studyRegion', 'translateDocs', 'conductTalks', 'dpInterpret', 'readArchive', 'adjustFlags', 'emergencySummit', 'cultureExchange', 'negotiateTreaty'],
      skill: 'logic',
      floors: { carpet: 'sageCarpet', tile: 'creamTile', wood: 'walnutWood' },
      wall: 'creamPlain',
    },
  },
  secretAgent: {
    // The 해외 정보관 branch at an embassy (2026-11-04, the branch lots, the user's choice of the plan's alternative B): a floor of
    // our embassy in the capital of an invented country, 아르테니아. An 정보관 is posted with a diplomat's title and works inside the
    // embassy: along the back the 정무과 (the diplomats' desks, the 출입 관리대 by the door to the secure area) and the secure
    // area itself, without windows (the analysis terminals, the safe, the signals seat where headquarters is heard, the situation
    // screen, the shredder). In front the consular hall (the counters, the number machine, the form stand, the waiting seats and the
    // restroom), the room where local contacts are met, the pantry beside it. The embassy car out front.
    0: {
      careerId: 'secretAgent',
      windowless: ['icDocSafe'],
      name: '주아르테니아 대한민국 대사관',
      icon: '🗂️',
      tiles: () =>
        patch(
          building(
            [[2, 2, 11, 8, 'carpet'], [13, 2, 23, 8, 'carpet'], [2, 10, 13, 13, 'tile'], [15, 10, 18, 13, 'carpet'], [20, 10, 23, 13, 'tile']],
            [[12, 5], [9, 9], [14, 11], [19, 13], [12, 14]],
          ),
          [[2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door']],
        ),
      restrooms: [[2, 12, 3, 13]],
      objects: [
        // The 정무과.
        o('flagStand', 2, 2), o('diplomatDesk', 3, 3), o('diplomatDesk', 5, 3), o('diplomatDesk', 7, 3), o('diplomatDesk', 3, 6), o('diplomatDesk', 5, 6), o('archiveShelf', 9, 2), o('archiveShelf', 10, 2), o('icBadgeDesk', 11, 6, 'left'), o('plant', 2, 8),
        // The secure area.
        o('situationWall', 15, 2), o('icSignalDesk', 18, 2), o('icEvidenceBoard', 20, 2), o('icDocSafe', 23, 2), o('shredder', 23, 4, 'left'),
        o('intelDesk', 19, 5), o('intelDesk', 20, 5), o('intelDesk', 21, 5), o('archiveShelf', 13, 8, 'up'), o('archiveShelf', 14, 8, 'up'),
        // The consular hall and its restroom.
        o('civilCounter', 5, 10), o('civilCounter', 6, 10), o('juTicket', 8, 10), o('flagStand', 13, 10), o('juFormStand', 10, 13, 'up'),
        o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 8, 13, 'up'),
        o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
        // The meeting room.
        o('salMeetingTable', 16, 11), o('salMeetingChair', 18, 10), o('salMeetingChair', 16, 12, 'up'), o('salMeetingChair', 17, 12, 'up'), o('salMeetingChair', 18, 12, 'up'),
        // The pantry.
        o('coffeeMaker', 21, 10), o('fridge', 22, 10), o('sofa', 21, 13, 'up'),
        // The embassy car.
        o('escortCar', 15, 15),
      ],
      coworkers: crew(['진태하 공사참사관', '백서윤 1등서기관', '오민결 2등서기관'], ['#212121', '#37474f', '#546e7a']),
      // Local contacts, met in the meeting room.
      clients: [{ noun: '현지 협력관', socials: ['debriefSource', 'shareIntel'], spots: [[17, 10], [15, 12]], max: 1, every: 80, patience: 150 }],
      alarm: { notice: '📨 본부 긴급 전문이에요! 보안 구역 상황 화면으로 가세요', done: '🛡️ 전문대로 바로 조치하고 회신했어요! 성과가 크게 올라요', missed: '⌛ 회신이 늦어 본부의 질책을 받았어요 (성과 감소)', interaction: 'crisisResponse', every: [200, 320], window: 45 },
      tasks: [task('analyze', '현지 정세 분석하기', ['analyzeIntel'], 2), task('brief', '본부 보고 전문 쓰기', ['writeBriefing']), task('signal', '본부 교신 듣기', ['icDecodeSignal'])],
      extra: [task('situation', '현지 언론·상황 살피기', ['monitorSituation']), task('secure', '보안 문서 관리', ['icFileSecret', 'shredDocs']), task('board', '단서 보드 정리', ['icPinThread', 'icReviewBoard']), task('door', '보안 구역 출입 관리', ['icIssueBadge']), task('cover', '정무 업무 돕기', ['studyRegion', 'translateDocs']), boss('공사참사관님께 보고')],
      work: ['analyzeIntel', 'writeBriefing', 'icDecodeSignal', 'monitorSituation', 'crisisResponse', 'icFileSecret', 'shredDocs', 'icPinThread', 'icReviewBoard', 'icIssueBadge', 'studyRegion', 'translateDocs', 'readArchive', 'debriefSource', 'shareIntel'],
      skill: 'charisma',
      floors: { carpet: 'slateStone', tile: 'creamTile' },
      wall: 'navyWainscot',
    },
  },
};
