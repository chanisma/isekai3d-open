import type { Tile } from './types';
import type { WorkplaceDef } from './workplace';
import { boss, building, chat, crew, o, patch, task, up, upstairs } from './workplaceKit';

/** Every tile of a rectangle (x0..x1, y0..y1), one kind: a yard, a forest floor. */
const rect = (x0: number, y0: number, x1: number, y1: number, t: Tile): Array<[number, number, Tile]> => {
  const out: Array<[number, number, Tile]> = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y, t]);
  return out;
};

/** Branch lots for safety, care and sites (branchLots.ts), by career id and branch number. */
export const SAFETY_LOTS: Record<string, Partial<Record<number, WorkplaceDef>>> = {
  police: {
    // The 특공대 branch at a provincial police SWAT base (2026-11-04, the layout audit, replacing a kill house of knee-high partitions
    // and boxing dummies that read as a dojo, a range along the yard fence firing at the kennels, and a van parked sideways by a gate
    // it couldn't drive out of). Laid out as a real base is (본관, 훈련동, 견사; the range indoors for the noise): the day runs from
    // the armoury to the briefing, into the kill house and the range, out to the tower, and back to stand by.
    // The main block, two floors. Downstairs along the back the armoury (the lockers, the locked rifle cabinet, the cleaning bench),
    // the bomb squad's room (the suit and the robot, the X-ray reading desk, the report desk) and the detection team's room; along
    // the front the 5분 대기조's stand-by room (the situation screen, the radio, the sofa), the garage between it and the lobby with the
    // tactical van nose to the street (it pulls straight out on a call; the bomb squad's door opens at its back), and the lobby with
    // the duty desk and the stairs. Upstairs the gym (weights, the bar, treadmills, the mat for arrest drills), the operations
    // briefing room (the long table, the situation screen) off the corridor, the bunk room, the 제대장실 and the shower and restroom.
    // The yard behind its fence: the kill house, windowless, two rooms and an entry hall with six doors to clear, a target in each;
    // the indoor range along the east edge, firing north; the rappel tower, the obstacle course, the dogs' kennels along the fence,
    // the gate and its guard post. No clients: a secure site.
    1: {
      careerId: 'police',
      name: '한빛경찰청 경찰특공대',
      icon: '🛡️',
      windowless: ['trainingDummy', 'miFiringRange'],
      tiles: () => [
        ...patch(
          building(
            [[2, 2, 4, 6, 'carpet'], [6, 2, 9, 6, 'tile'], [11, 2, 13, 6, 'tile'], [2, 8, 4, 13, 'wood'], [6, 8, 8, 14, 'grass'], [10, 8, 13, 13, 'tile']],
            [[4, 7], [7, 7], [12, 7], [5, 10], [14, 12], [12, 14]],
          ),
          [
            // The yard, east of the main block.
            ...rect(15, 1, 24, 14, 'grass'),
            // The kill house: its outline on the main block's wall, two rooms behind an entry hall.
            ...rect(15, 1, 21, 1, 'wall'), ...rect(20, 2, 20, 9, 'wall'), ...rect(15, 9, 19, 9, 'wall'), ...rect(15, 2, 19, 8, 'carpet'),
            [17, 2, 'wall'], [17, 3, 'door'], [17, 4, 'wall'], [15, 5, 'wall'], [16, 5, 'door'], [17, 5, 'wall'], [18, 5, 'door'], [19, 5, 'wall'],
            [17, 9, 'door'], [20, 7, 'door'],
            // The indoor range along the lot's east edge.
            ...rect(22, 1, 25, 1, 'wall'), ...rect(22, 13, 25, 13, 'wall'), ...rect(22, 2, 22, 12, 'wall'), ...rect(25, 2, 25, 12, 'wall'), ...rect(23, 2, 24, 12, 'carpet'),
            [22, 12, 'door'],
          ],
        ),
        ...patch(
          upstairs(
            [[2, 2, 6, 6, 'wood'], [8, 2, 13, 6, 'carpet'], [2, 8, 13, 8, 'tile'], [13, 9, 13, 11, 'tile'], [2, 10, 5, 13, 'carpet'], [7, 10, 8, 13, 'wood'], [10, 10, 11, 10, 'tile'], [10, 12, 11, 13, 'tile']],
            [[5, 7], [12, 7], [3, 9], [7, 9], [10, 9], [10, 11]],
          ),
          rect(15, 1, 25, 14, 'void'),
        ),
      ],
      restrooms: [[10, 30, 11, 31]],
      ground: [[6, 8, 8, 14, 'concrete'], [15, 1, 25, 14, 'concrete'], [0, 15, 25, 17, 'concrete']],
      objects: [
        // The armoury: the lockers, the rifle cabinet, the cleaning bench.
        o('policeGearLocker', 2, 2), o('policeGearLocker', 3, 2), o('policeGearLocker', 4, 2), o('policeGearLocker', 2, 4, 'right'),
        o('swatArmoryRack', 2, 5, 'right'), o('miMaintBench', 4, 4, 'left'),
        // The bomb squad's room: the suit and the robot, the X-ray reading desk, the report desk, the manuals.
        o('swatEodRig', 6, 2), o('swatXrayDesk', 8, 2), o('officeDesk', 9, 5, 'left'), o('archiveShelf', 6, 6, 'up'),
        // The detection team's room: the dogs' gear, the handlers' desk.
        o('swatK9GearShelf', 11, 2), o('plant', 13, 2), o('officeDesk', 13, 4, 'left'),
        // The stand-by room: the situation screen on the back wall, the radio, the sofa, the coffee.
        o('policeDispatchConsole', 2, 8), o('radioStation', 2, 10, 'right'), o('sofa', 2, 12, 'right'), o('coffeeMaker', 4, 13, 'up'),
        // The garage: the tactical van, nose to the street.
        o('swatVan', 8, 9, 'left'),
        // The lobby: the stairs, the duty desk, the water.
        o('stairs', 13, 8), o('policeDesk', 10, 8), o('salWaterCooler', 11, 8), o('plant', 10, 13),
        // The kill house: a man-shaped target and a steel plate in each room, a target in the hall.
        o('trainingDummy', 15, 2), o('swatSteelTarget', 16, 2), o('swatSteelTarget', 18, 2), o('trainingDummy', 19, 2),
        o('trainingDummy', 19, 8, 'left'), o('swatSteelTarget', 15, 8),
        // The range: the firing line at the south end, the targets against the north wall.
        o('miFiringRange', 23, 2),
        // The yard: the rappel tower, the obstacle course, the kennels along the fence; the guard post by the gate; the fence.
        o('swatRappelTower', 15, 10), o('obstacleCourse', 18, 11), o('swatK9Kennel', 15, 14, 'up'), o('miGuardPost', 22, 14), o('swatCompoundFence', 24, 14),
        // Upstairs. The gym: the weights, the bar, the treadmills, the mat.
        up('weightRack', 2, 2), up('pullUpBar', 4, 2), up('treadmill', 6, 2), up('icDefenseMat', 2, 5, 'up'), up('treadmill', 6, 5),
        // The operations briefing room: the team along the table facing the screen, the briefer between them, the whiteboard.
        up('salMeetingTable', 9, 4), up('salMeetingChair', 9, 3), up('salMeetingChair', 10, 3), up('salMeetingChair', 11, 3), up('salMeetingChair', 8, 4, 'right'),
        up('situationWall', 9, 6, 'up'), up('whiteboard', 13, 4, 'left'),
        // The bunk room; the 제대장실; the shower and the restroom.
        up('bed', 2, 10), up('bed', 2, 12), up('bed', 5, 10), up('bed', 5, 12), up('policeGearLocker', 4, 13, 'left'),
        up('plant', 8, 10), up('officeDesk', 8, 11, 'left'), up('archiveShelf', 8, 13, 'left'),
        up('shower', 11, 10), up('toilet', 10, 13, 'up'), up('sink', 11, 13, 'up'),
      ],
      coworkers: crew(['강철민 제대장', '윤방패 팀장', '서진입 대원'], ['#212121', '#37474f', '#455a64']),
      alarm: { notice: '🚨 인질 농성 신고! 5분 대기조는 차고의 전술 차량으로 출동하세요', done: '🛡️ 인질을 무사히 구하고 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 제대가 투입됐어요 (성과 감소)', interaction: 'swatDeploy', every: [200, 320], window: 40 },
      tasks: [task('cqb', '킬하우스 진입·제압 훈련', ['arrestDrill'], 2), task('fitness', '체력 단련', ['liftWeights', 'doPullUps', 'runObstacles']), task('gear', '개인 장비 점검', ['policeCheckGear'])],
      extra: [
        task('rappel', '레펠 하강 훈련', ['swatRappel']), task('k9', '탐지견 수색 훈련', ['swatK9Train']), task('eod', '폭발물 처리 훈련', ['swatEodDrill']), task('shoot', '영점 사격', ['miZeroRifle']),
        task('rifle', '총기 손질', ['miCleanRifle']), task('spar', '체포술 대련', ['icSparTraining']), task('watch', '상황 대기·무전', ['monitorSituation', 'radioComms']), task('brief', '작전 브리핑', ['salTableMeeting']),
        task('report', '훈련 일지 쓰기', ['writeReport', 'fileReport']), boss('제대장님께 훈련 보고'), chat(1),
      ],
      work: [
        'arrestDrill', 'liftWeights', 'doPullUps', 'runObstacles', 'policeCheckGear', 'swatRappel', 'swatK9Train', 'swatEodDrill', 'miZeroRifle', 'miCleanRifle', 'icSparTraining', 'monitorSituation',
        'radioComms', 'salTableMeeting', 'writeReport', 'fileReport', 'swatDeploy', 'police_tacticalDrill', 'police_counterTerrorBrief',
      ],
      skill: 'fitness',
      floors: { wood: 'oakWood', tile: 'monoTile', carpet: 'slateStone' },
      wall: 'navyWainscot',
    },
  },
  sanitationWorker: {
    // The 자원순환 branch at a city's recycling centre (2026-11-04, the branch lots), in the order the waste goes through it. The lorry
    // is weighed at the weighbridge house by the gate, backs into the tipping hall and tips into the hopper; the belt lifts the load to
    // the hand-sorting platform upstairs, where the sorters stand both sides of the long line and pull out each material (and any
    // battery, into its bin) down its chute; downstairs in the baling hall the chutes fill their bays, the baler presses each material
    // into bales and the bales are stacked to go out. Upstairs too the quality room, where samples off the line are weighed for how much
    // was clean, and the visitors' corridor along the platform. Downstairs the office, where visiting residents and pupils are met
    // before they go round, and the crew's room with its lockers, shower and restroom.
    1: {
      careerId: 'sanitationWorker',
      name: '한빛시 자원순환센터',
      icon: '♻️',
      tiles: () => [
        ...patch(
          building(
            [[2, 2, 10, 13, 'tile'], [12, 2, 23, 7, 'tile'], [12, 9, 16, 13, 'carpet'], [18, 9, 23, 13, 'wood']],
            [[6, 14], [11, 5], [12, 8], [17, 11], [12, 14]],
          ),
          // The tipping hall's wide door, its shutter rolled up, so the lorry drives straight out to the street.
          [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door'], [2, 14, 'tile'], [3, 14, 'tile'], [4, 14, 'tile']],
        ),
        ...upstairs([[2, 2, 16, 9, 'tile'], [18, 2, 23, 9, 'tile'], [2, 11, 23, 13, 'carpet']], [[17, 4], [5, 10], [20, 10]]),
      ],
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The tipping hall: the hopper, the belt rising to the platform, the lorry that's just tipped; the bulky waste, a pile to clear.
        o('rcHopper', 2, 2), o('rcConveyor', 5, 2), o('garbageTruck', 2, 4, 'right'), o('materialPile', 8, 6), o('snBulkYard', 7, 13, 'up'), o('washBay', 10, 13, 'up'),
        // The baling hall: the chutes' bays, the baler, the bales stacked; the tools, a bench for what's left over.
        o('rcDropBays', 12, 2), o('rcBaler', 17, 2), o('rcBales', 20, 2), o('rcBales', 22, 2), o('rcBales', 20, 7, 'up'), o('toolWall', 14, 7, 'up'), o('recycleStation', 22, 7, 'up'),
        // The office: the stairs, the visitors' seats, the desk and the files.
        o('stairs', 13, 9, 'left'), o('drWaitSeat', 13, 11), o('drWaitSeat', 14, 11), o('officeDesk', 16, 12, 'left'), o('archiveShelf', 16, 13, 'left'),
        // The crew's room: the lockers, the shower, the coffee, the sofa; the restroom.
        o('snLocker', 18, 9), o('washBay', 22, 9), o('coffeeMaker', 23, 9), o('sofa', 18, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The weighbridge house at the gate.
        o('rcScaleHouse', 8, 15),
        // Upstairs. The sorting platform: the two lines, the battery bin, the safety corner.
        up('recycleSorter', 3, 4), up('recycleSorter', 7, 4), up('recycleSorter', 3, 7), up('recycleSorter', 7, 7), up('rcBatteryBin', 12, 4), up('sciSafetyCorner', 2, 2),
        // The quality room: the desk, the scale, the files, the sample bench.
        up('officeDesk', 18, 2), up('parcelScale', 20, 2), up('archiveShelf', 22, 2), up('recycleStation', 20, 7, 'up'),
        // The visitors' corridor.
        up('plant', 2, 13), up('plant', 23, 13),
      ],
      coworkers: crew(['고순환 센터장', '배선별 반장', '마분리 주무관'], ['#2e7d32', '#66bb6a', '#a5d6a7']),
      // Residents and pupils come to see round, met in the office first.
      clients: [{ noun: '견학 온 주민', socials: ['explainSorting'], spots: [[13, 12], [14, 12]], max: 2, every: 80, patience: 120 }],
      alarm: { notice: '🔥 선별대에 리튬 배터리가 섞여 연기가 나요! 2층 폐배터리 분리함으로 가세요', done: '🧯 배터리를 꺼내 불을 껐어요! 성과가 크게 올라요', missed: '⌛ 늦어서 선별 라인을 멈추고 소방서를 불렀어요 (성과 감소)', interaction: 'rcBatteryFire', every: [180, 300], window: 30 },
      tasks: [task('sort', '수선별', ['sortRecycling'], 2), task('tip', '반입 쓰레기 확인', ['rcCheckLoad']), task('bale', '베일 압축', ['rcBale'])],
      extra: [
        task('weigh', '계근', ['rcWeighTruck']), task('truck', '수거 차량 하차·점검', ['collectRoute', 'snCheckGate']), task('wash', '장비 세척', ['washEquipment']), task('tools', '공구 정리', ['organizeTools']),
        task('gear', '조끼·장갑 챙기기', ['snGearUp']), task('report', '반입·반출 실적 정리', ['writeReport']), task('visitors', '견학 안내', ['explainSorting']), boss('센터장님께 보고'), chat(1),
      ],
      work: [
        'sortRecycling', 'rcCheckLoad', 'rcBale', 'rcWeighTruck', 'collectRoute', 'snCheckGate', 'washEquipment', 'organizeTools', 'snGearUp', 'writeReport', 'explainSorting', 'rcBatteryFire',
        'sanitationWorker_analyzeWaste', 'sanitationWorker_planRoutes',
      ],
      skill: 'fitness',
      floors: { tile: 'slateStone', carpet: 'sageCarpet', wood: 'oakWood' },
      wall: 'creamPlain',
    },
  },
  carpenter: {
    // The 건축 목공 branch on a shop floor being fitted out (2026-11-04, the branch lots), the stages of the work laid out from left to
    // right in their order: the slab chalked and levelled with the laser; the ceiling being framed, the hangers down from the slab and
    // the timber grid on them, a stretch boarded already; the walls being boarded; the stud walls going up
    // with their door frames, ready to hand to the paperers and tilers. The carpenters' bench stands in front of the ceiling work.
    // Along the front the timber, the plasterboard and the cutting: the racks, the saw, the offcuts. In the corner the site office (the
    // drawing, the programme on the board, where the supervisor or the client's designer is met) and the site's restroom; the truck out
    // front.
    0: {
      careerId: 'carpenter',
      name: '한빛상가 3층 내장 목공 현장',
      icon: '📏',
      tiles: () =>
        patch(building([[2, 2, 23, 8, 'tile'], [2, 9, 15, 13, 'tile'], [17, 10, 23, 13, 'wood']], [[16, 11], [12, 14]]), [
          [22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door'],
        ]),
      restrooms: [[22, 12, 23, 13]],
      ground: [[0, 15, 11, 17, 'concrete']],
      objects: [
        // The work in its order: the chalk and the laser; the ceiling framed; the boards; the studs and the door frames.
        o('wlMeasureBay', 2, 2), o('wlWorkLight', 5, 2),
        o('cpCeilingFrame', 7, 2), o('wlWorkLight', 11, 2),
        o('cpBoardWall', 13, 2), o('cpBoardStack', 16, 2),
        o('cpStudWall', 19, 2), o('wlWorkLight', 23, 2),
        // The carpenters' bench in front of the ceiling work; the next room's stud wall going up behind the boarding.
        o('carpentryBench', 8, 6), o('wlWorkLight', 12, 6), o('cpStudWall', 18, 6),
        // Along the front: the timber, the plasterboard, the saw, the offcuts, a barrow.
        o('lumberRack', 2, 10, 'right'), o('lumberRack', 2, 11, 'right'), o('materialPile', 2, 13, 'up'), o('cpBoardStack', 8, 13, 'up'),
        o('tableSaw', 12, 10), o('carpOffcutBin', 13, 10), o('carpClampRack', 14, 10), o('wheelbarrow', 15, 13, 'up'),
        // The site office: the desk, the programme, the drawing, the supervisor's chairs; the restroom.
        o('officeDesk', 17, 10), o('whiteboard', 18, 10), o('wlSitePlan', 17, 13, 'up'), o('salMeetingChair', 19, 13, 'up'), o('salMeetingChair', 21, 11, 'left'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The truck out front.
        o('siteVan', 3, 15),
      ],
      coworkers: crew(['문각재 반장', '천달대 목수', '석보드 목수'], ['#8d6e63', '#a1887f', '#ffb74d']),
      // The supervisor or the client's designer, met in the site office.
      clients: [{ noun: '감리·인테리어 실장', socials: ['quoteJob', 'showSamples'], spots: [[19, 12], [20, 11]], max: 1, every: 70, patience: 120 }],
      alarm: { notice: '📏 천장 레벨이 안 맞대요! 마감 전에 천장 틀로 가서 바로잡으세요', done: '📐 레벨을 다시 잡아 천장이 반듯해졌어요! 성과가 크게 올라요', missed: '⌛ 늦어서 붙인 석고보드를 다시 뜯어야 해요 (성과 감소)', interaction: 'cpFixLevel', every: [180, 300], window: 40 },
      tasks: [task('frame', '천장 틀 짜기', ['cpFrameCeiling'], 2), task('board', '석고보드 붙이기', ['cpHangBoard']), task('cut', '각재 재단', ['sawBoards', 'cutWood'])],
      extra: [
        task('mark', '먹매김·레벨 보기', ['wlLaser', 'wlTape']), task('studs', '벽체·문틀 세우기', ['cpSetFrame']), task('plan', '도면 확인', ['wlPlan']), task('lumber', '자재 고르기', ['selectLumber']),
        task('cover', '자재 덮기', ['coverMaterials']), task('meeting', '공정 회의', ['attendMeeting']), task('log', '작업 일보 쓰기', ['writeReport']), task('client', '감리·실장 응대', ['quoteJob', 'showSamples']),
        boss('반장님께 보고'), chat(1),
      ],
      work: [
        'cpFrameCeiling', 'cpHangBoard', 'cpSetFrame', 'cpFixLevel', 'sawBoards', 'cutWood', 'joinWood', 'planeBoard', 'wlLaser', 'wlTape', 'wlPlan', 'selectLumber', 'coverMaterials', 'attendMeeting',
        'writeReport', 'quoteJob', 'showSamples', 'carpenter_buildFrame', 'carpenter_teachJoinery',
      ],
      skill: 'handiness',
      floors: { tile: 'slateStone', wood: 'oakWood' },
      wall: 'creamPlain',
    },
  },
  careWorker: {
    // The 재가 방문 요양 branch (2026-11-04, the branch lots): a home-care centre on the left and, next door, the home of an older client
    // the care worker visits. The centre has the office where each client's care plan and the visit schedule are kept and the visits
    // recorded, and in front the table where families are met, the welfare aids shown to them, a restroom. The home has its front door
    // with a rail inside it, the living room and kitchen (the rail along the wall, the dining table, the sofa and TV), the bedroom with
    // the care bed and the wheelchair, and the bathroom fitted with grab rails and a shower chair. The centre's car out front.
    1: {
      careerId: 'careWorker',
      name: '한빛재가복지센터 · 이웃 어르신 댁',
      icon: '🏠',
      tiles: () =>
        patch(
          building(
            [[2, 2, 12, 7, 'carpet'], [2, 9, 12, 13, 'wood'], [14, 2, 18, 6, 'wood'], [20, 2, 23, 6, 'tile'], [14, 8, 23, 13, 'wood']],
            [[7, 8], [16, 7], [21, 7], [18, 14], [12, 14]],
          ),
          [[3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'wall'], [2, 11, 'door']],
        ),
      restrooms: [[2, 12, 3, 13]],
      objects: [
        // The centre's office: the case desks, the schedule board, the visit schedule and the files, the coffee.
        o('caseDesk', 3, 3), o('caseDesk', 5, 3), o('caseDesk', 7, 3), o('officeDesk', 3, 6, 'up'), o('whiteboard', 9, 2), o('archiveShelf', 11, 2), o('archiveShelf', 12, 2), o('coffeeMaker', 12, 6, 'left'),
        // The front: the aids shown to families, the table where they're met; the restroom.
        o('cwAidShelf', 2, 9), o('plant', 12, 9),
        o('salMeetingTable', 8, 12), o('salMeetingChair', 8, 11), o('salMeetingChair', 9, 11), o('salMeetingChair', 7, 12, 'right'), o('salMeetingChair', 11, 12, 'left'),
        o('toilet', 2, 13, 'up'), o('sink', 3, 13, 'up'),
        // The home. The bedroom: the care bed, the wheelchair, the wardrobe.
        o('careBed', 15, 2), o('cwWheelchair', 17, 2), o('linenShelf', 18, 2),
        // The bathroom: the tub, the grab-railed toilet and the shower chair, the basin.
        o('bathtub', 20, 2), o('cwHomeBathAid', 22, 2), o('sink', 23, 5, 'left'),
        // The living room and kitchen: the rails, the TV, the sofa, the armchair; the cooker, the sink, the fridge, the table.
        o('walkingRail', 14, 9, 'right'), o('walkingRail', 14, 5, 'right'), o('tv', 17, 8), o('sofa', 17, 12, 'up'), o('armchair', 15, 12, 'up'),
        o('stove', 22, 8), o('kitchenSink', 23, 8), o('fridge', 23, 10, 'left'), o('diningTable', 21, 11), o('diningChair', 21, 12, 'up'), o('diningChair', 22, 12, 'up'), o('diningChair', 23, 11, 'left'),
        // The centre's car.
        o('welfareVan', 3, 15),
      ],
      coworkers: crew(['정다정 센터장', '오방문 요양보호사', '한사랑 사회복지사'], ['#00897b', '#4db6ac', '#80cbc4']),
      clients: [
        // Families come to the centre to talk over the care.
        { noun: '상담 온 보호자', socials: ['updateFamily', 'comfortFamily'], spots: [[7, 13], [11, 13]], max: 1, every: 80, patience: 120 },
        // A son or daughter dropping in at the home while the care worker is there.
        { noun: '어르신 가족', socials: ['updateFamily'], spots: [[21, 13], [22, 13]], max: 1, every: 120, patience: 90 },
      ],
      alarm: { notice: '📞 어르신이 넘어지셨대요! 바로 방문해서 안방으로 가세요', done: '🛏️ 다치신 데 없이 침대로 모셨어요! 성과가 크게 올라요', missed: '⌛ 방문이 늦어 보호자가 119를 불렀어요 (성과 감소)', interaction: 'fallResponse', every: [180, 300], window: 40 },
      tasks: [task('care', '어르신 돌봄 드리기', ['assistCare', 'turnPatient'], 2), task('walk', '이동 보조', ['walkWithElder']), task('record', '방문 기록 쓰기', ['writeCaseNote'])],
      extra: [
        task('bath', '목욕 도와드리기', ['cwHomeBathe']), task('meal', '식사 차려 드리기', ['cook']), task('dishes', '설거지', ['washDishes']), task('linen', '이불 정리', ['foldLinens']),
        task('plan', '급여 계획 확인', ['manageCase', 'readArchive']), task('meeting', '센터 사례 회의', ['attendMeeting']), task('family', '보호자 상담', ['updateFamily', 'comfortFamily']), boss('센터장님께 방문 보고'),
        chat(1),
      ],
      work: [
        'assistCare', 'turnPatient', 'walkWithElder', 'writeCaseNote', 'cwHomeBathe', 'cook', 'washDishes', 'foldLinens', 'manageCase', 'readArchive', 'attendMeeting', 'updateFamily', 'comfortFamily',
        'fallResponse', 'careWorker_homeTransfer', 'careWorker_visitSchedule',
      ],
      skill: 'charisma',
      floors: { carpet: 'sageCarpet', wood: 'oakWood', tile: 'aquaTile' },
      wall: 'creamPlain',
    },
  },
  forester: {
    // The 숲 해설·치유 branch at a national healing forest (2026-11-04, the branch lots). The forest is the place, so the building is
    // small (like the landscaping site, an exception to the lot's building filling it): the healing centre in the lower left, where
    // a group checks in at the lobby and has its blood pressure and stress measured before and after, its restroom off the lobby. From
    // its side door the barrier-free deck road loops through the trees: the trail sign at its start, the meditation ground and the
    // singing bowls inside the loop, the wind-bathing hammocks, the 편백 foot bath by the centre where a programme ends. Up the hill
    // behind, the fire lookout and the fire tools; the ridges beyond. The visitors' sign-in stand and the fire truck by the road.
    1: {
      careerId: 'forester',
      name: '국립 솔재 치유의 숲',
      icon: '🌲',
      tiles: () => {
        const t = building([[2, 8, 5, 13, 'wood'], [7, 8, 12, 13, 'wood']], [[6, 12], [13, 10], [12, 14]]);
        return patch(t, [
          // Everything but the centre is forest.
          ...rect(1, 1, 24, 6, 'grass'), ...rect(14, 7, 24, 14, 'grass'),
          // The restroom off the lobby.
          [9, 8, 'wall'], [9, 9, 'wall'], [9, 10, 'wall'], [7, 10, 'wall'], [8, 10, 'door'],
        ]);
      },
      restrooms: [[7, 8, 8, 9]],
      ground: [[0, 15, 11, 17, 'asphalt']],
      objects: [
        // The ridges behind; the lookout and the fire tools up the hill; the stands of trees.
        o('fgHills', 0, 0), o('fireWatchTower', 3, 3), o('fgFireShed', 6, 3), o('fhGrove', 9, 2), o('fhGrove', 1, 5), o('tree', 12, 2), o('fhGrove', 16, 0), o('fhGrove', 20, 0), o('tree', 24, 1),
        // The deck road's loop.
        o('fhDeck', 14, 3), o('fhDeck', 18, 3), o('fhDeck', 14, 8), o('fhDeck', 18, 8), o('fhDeck', 14, 4, 'right'), o('fhDeck', 21, 4, 'right'),
        // Inside it: the meditation ground, the singing bowls, the hammocks.
        o('meditationMat', 16, 5), o('ygSoundCorner', 16, 7, 'up'), o('fhHammock', 19, 4), o('fhHammock', 19, 7, 'up'),
        // Outside it: more trees.
        o('fhGrove', 24, 4), o('fhGrove', 24, 9), o('fhGrove', 20, 10), o('tree', 23, 12), o('tree', 18, 13), o('tree', 23, 7),
        // The trail sign at the start, the bench, the foot bath by the centre.
        o('trailSign', 14, 11, 'up'), o('ghBenchSofa', 16, 12, 'up'), o('fhFootTub', 14, 13, 'up'),
        // The healing centre. The measuring room: the body scan, the blood pressure chair, the desk, the seats.
        o('ygInbody', 2, 8), o('rxBpChair', 4, 8), o('officeDesk', 5, 10, 'left'), o('drWaitSeat', 2, 13, 'up'), o('drWaitSeat', 3, 13, 'up'),
        // The lobby: the reception, the participants' seats; the restroom.
        o('drReception', 10, 8), o('drWaitSeat', 12, 10, 'left'), o('drWaitSeat', 12, 11, 'left'), o('plant', 7, 13),
        o('toilet', 7, 8), o('sink', 8, 8),
        // By the road: the visitors' sign-in, the fire truck.
        o('fgVisitorBoard', 14, 15), o('forestTruck', 18, 15),
      ],
      coworkers: crew(['송편백 센터장', '나숲결 산림치유지도사', '임솔향 숲해설가'], ['#2e7d32', '#558b2f', '#8d6e63']),
      // A programme's group, in the lobby and on the bench at the deck road's start.
      clients: [{ noun: '치유 프로그램 참가자', socials: ['guideForest', 'warnHikers'], spots: [[11, 10], [11, 11], [16, 11], [17, 11]], max: 3, every: 50, patience: 120 }],
      alarm: { notice: '🔥 숲에서 연기가 보여요! 진화 차량으로 출동하세요', done: '🌲 초기에 불을 잡아 치유의 숲을 지켰어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 헬기가 진화했어요 (성과 감소)', interaction: 'wildfireCall', every: [200, 320], window: 30 },
      tasks: [task('program', '산림치유 프로그램', ['ygSoundBath', 'leadMeditation'], 2), task('measure', '건강 측정', ['ygBodyScan', 'rxTakeBp']), task('foot', '편백 족욕 안내', ['fhFootBath'])],
      extra: [
        task('trail', '데크로드 점검', ['maintainTrail']), task('fire', '산불 감시', ['watchForFire']), task('gear', '진화 장비 점검', ['fgCheckGear', 'fgCheckTruck']), task('signin', '입산 신고 받기', ['fgSignIn']),
        task('log', '프로그램 기록', ['writeReport']), task('guests', '참가자 숲 해설', ['guideForest', 'warnHikers']), boss('센터장님께 보고'), chat(1),
      ],
      work: [
        'ygSoundBath', 'leadMeditation', 'ygBodyScan', 'rxTakeBp', 'fhFootBath', 'maintainTrail', 'watchForFire', 'fgCheckGear', 'fgCheckTruck', 'fgSignIn', 'writeReport', 'guideForest', 'warnHikers',
        'wildfireCall', 'forester_guideForest', 'forester_planFireDrill',
      ],
      skill: 'gardening',
      floors: { wood: 'oakWood' },
      wall: 'oakWainscot',
    },
  },
};
