import type { Tile } from './types';
import type { WorkplaceDef } from './workplace';
import { boss, building, chat, crew, o, patch, task, up, upstairs } from './workplaceKit';

/** The restroom in a room's bottom-right corner (inside 22..23 × 12..13), its door in the wall on its left. */
const RESTROOM_SE: Array<[number, number, Tile]> = [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']];
/** The restroom in a room's bottom-left corner (inside 2..3 × 12..13), its door in the wall on its right. */
const RESTROOM_SW: Array<[number, number, Tile]> = [[2, 11, 'wall'], [3, 11, 'wall'], [4, 12, 'wall'], [4, 13, 'door']];

/** Branch lots for culture, media and business (branchLots.ts), by career id and branch number. */
export const MEDIA_LOTS: Record<string, Partial<Record<number, WorkplaceDef>>> = {
  entertainer: {
    // The 음악가 branch at a concert hall (2026-11-04, the branch lots). Downstairs the hall: the stage at the back with the grand piano
    // on its left, the front rows of the house before it and the lobby with the box office; the stage's wing on the right, where the
    // stage manager calls the cues from the console, opens onto the back corridor, the instrument store with its loading door to the
    // street where the instrument lorry pulls up, and the stairs. Upstairs what the players use before they go on: the orchestra's
    // rehearsal hall (the conductor's stand before the rows of chairs), two soundproofed practice rooms with a piano each, the score
    // library, the dressing room and the players' lounge. So the day runs score library, practice room, rehearsal hall, stage.
    0: {
      careerId: 'entertainer',
      name: '한빛아트센터 콘서트홀',
      icon: '🎻',
      windowless: ['performStage'],
      tiles: () => [
        ...patch(
          building(
            [[2, 2, 15, 9, 'wood'], [2, 6, 15, 9, 'carpet'], [2, 11, 15, 13, 'tile'], [17, 2, 23, 5, 'wood'], [17, 7, 23, 13, 'tile']],
            [[8, 10], [16, 3], [20, 6], [16, 12], [19, 14], [12, 14]],
          ),
          RESTROOM_SE,
        ),
        ...upstairs(
          [[2, 2, 13, 8, 'wood'], [2, 10, 6, 13, 'carpet'], [8, 10, 13, 13, 'tile'], [15, 2, 18, 5, 'carpet'], [20, 2, 23, 5, 'carpet'], [15, 7, 23, 13, 'wood']],
          [[14, 8], [4, 9], [10, 9], [14, 12], [16, 6], [22, 6]],
        ),
      ],
      restrooms: [[22, 12, 23, 13]],
      ground: [[16, 15, 24, 17, 'asphalt']],
      objects: [
        // The stage: the grand piano, the stage itself, a violin left on its stand and a music stand in the wing's light.
        o('lessonPiano', 2, 2), o('performStage', 6, 2), o('violin', 12, 2), o('mtConductStand', 14, 2),
        // The front rows of the house.
        o('diningChair', 3, 6, 'up'), o('diningChair', 4, 6, 'up'), o('diningChair', 5, 6, 'up'), o('diningChair', 11, 6, 'up'), o('diningChair', 12, 6, 'up'), o('diningChair', 13, 6, 'up'),
        o('dnHouseSeats', 3, 8, 'up'), o('dnHouseSeats', 11, 8, 'up'),
        // The lobby: the box office, the posters, a sofa.
        o('officeDesk', 3, 13, 'up'), o('enPosterWall', 5, 11), o('plant', 15, 11), o('sofa', 14, 13, 'up'),
        // The wing: the stage manager's console and cue board.
        o('enSoundConsole', 18, 2), o('tsCueBoard', 21, 2), o('lamp', 23, 2),
        // The instrument store: the stairs, the instrument walls, the restroom.
        o('stairs', 17, 8, 'down'), o('mtInstrumentWall', 22, 7), o('mtInstrumentWall', 23, 9, 'left'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The instrument lorry at the loading door.
        o('deliveryTruck', 17, 16),
        // Upstairs. The rehearsal hall: the conductor's stand before the rows of chairs, the piano, the instrument wall.
        up('mtConductStand', 7, 3, 'up'), up('lessonPiano', 11, 2), up('mtInstrumentWall', 2, 2),
        up('diningChair', 4, 5, 'up'), up('diningChair', 5, 5, 'up'), up('diningChair', 6, 5, 'up'), up('diningChair', 8, 5, 'up'), up('diningChair', 9, 5, 'up'), up('diningChair', 10, 5, 'up'),
        up('diningChair', 3, 7, 'up'), up('diningChair', 5, 7, 'up'), up('diningChair', 6, 7, 'up'), up('diningChair', 8, 7, 'up'), up('diningChair', 9, 7, 'up'), up('diningChair', 11, 7, 'up'),
        // The practice rooms.
        up('piano', 16, 2), up('piano', 21, 2),
        // The score library.
        up('archiveShelf', 2, 10), up('archiveShelf', 3, 10), up('archiveShelf', 5, 10), up('archiveShelf', 6, 10), up('officeDesk', 2, 13, 'up'), up('copier', 6, 13, 'up'),
        // The dressing room.
        up('wardrobeRack', 8, 10), up('enVanity', 8, 13, 'up'), up('sgDressingTable', 11, 13, 'up'),
        // The players' lounge.
        up('sofa', 15, 13, 'up'), up('coffeeMaker', 23, 7, 'left'), up('salWaterCooler', 23, 9, 'left'), up('plant', 23, 13),
      ],
      coworkers: crew(['서지휘 예술감독', '한현악 악장', '민건반 피아니스트'], ['#4a148c', '#7b1fa2', '#ce93d8']),
      // The audience in the front rows, before the concert.
      clients: [{ noun: '관객', socials: ['signAutograph'], spots: [[2, 6], [4, 7], [12, 7], [14, 6]], max: 2, every: 60, patience: 120 }],
      alarm: { notice: '🎻 협연자가 아파서 대타가 필요해요! 1층 무대로 가세요', done: '👏 대타 협연에 객석이 일어나 박수를 쳤어요! 성과가 크게 올라요', missed: '⌛ 늦어서 다른 연주자가 대신 무대에 섰어요 (성과 감소)', interaction: 'performShow', every: [200, 320], window: 40 },
      tasks: [task('rehearse', '무대 리허설', ['rehearseStage', 'enSoundCheck'], 2), task('ensemble', '단원 합주', ['mtConductEnsemble']), task('practice', '개인 연습', ['playPiano', 'playViolin'])],
      extra: [
        task('score', '악보 찾아 챙기기', ['readArchive']), task('strings', '악기 손질', ['mtStringCare']), task('cue', '무대 큐 맞추기', ['tsGiveCue']), task('dress', '분장·연주복 챙기기', ['enPreShow', 'sgStagePrep', 'tryOutfits']),
        task('audience', '관객 사인회', ['signAutograph']), task('lesson', '후배 피아노 봐 주기', ['giveLesson']), boss('예술감독님과 프로그램 회의'), chat(1),
      ],
      work: [
        'rehearseStage', 'performShow', 'enSoundCheck', 'mtConductEnsemble', 'playPiano', 'playViolin', 'readArchive', 'mtStringCare', 'tsGiveCue', 'enPreShow', 'sgStagePrep', 'tryOutfits', 'giveLesson', 'writeReport',
        'signAutograph', 'entertainer_composeJingle', 'entertainer_lineupPlan',
      ],
      skill: 'piano',
      floors: { wood: 'walnutWood', carpet: 'lilacCarpet', tile: 'creamTile' },
      wall: 'oakWainscot',
    },
  },
  actor: {
    // The 뮤지컬 배우 branch at a musical theatre (2026-11-04, the branch lots). Downstairs the theatre: the stage with its wings, the
    // flats stood in the stage-left wing; the orchestra pit before it (the conductor's stand turned to the stage, the keyboard, a violin);
    // the rows of the house and the lobby with the box office and the posters. Behind the stage-right wing the backstage corridor where
    // the stage manager's console and cue board are, the quick-change rack and the costume racks, and behind it the set store and the
    // stairs. Upstairs the rehearsal hall (the mirror wall, the piano for the numbers, the reading table), the dressing room's row of
    // mirrors, the wardrobe and the actors' lounge. A day runs reading, numbers at the piano, blocking, the run-through, the show.
    1: {
      careerId: 'actor',
      name: '한빛뮤지컬극장',
      icon: '🎭',
      windowless: ['performStage'],
      tiles: () => [
        ...patch(
          building(
            [[2, 2, 15, 9, 'wood'], [5, 6, 11, 6, 'tile'], [2, 7, 15, 9, 'carpet'], [2, 11, 15, 13, 'tile'], [17, 2, 23, 8, 'wood'], [17, 10, 23, 13, 'tile']],
            [[8, 10], [16, 3], [20, 9], [16, 12], [12, 14]],
          ),
          RESTROOM_SW,
        ),
        ...upstairs(
          [[2, 2, 13, 8, 'wood'], [2, 10, 8, 13, 'tile'], [10, 10, 13, 13, 'carpet'], [15, 2, 23, 13, 'wood']],
          [[14, 4], [5, 9], [9, 12], [14, 12]],
        ),
      ],
      restrooms: [[2, 12, 3, 13]],
      objects: [
        // The stage and its stage-left wing with the flats.
        o('performStage', 6, 2), o('pntCanvasRack', 2, 2), o('fmCostumeRack', 12, 2),
        // The orchestra pit: the keyboard, the conductor's stand, a violin.
        o('piano', 6, 6), o('mtConductStand', 9, 6), o('violin', 10, 6),
        // The house.
        o('diningChair', 3, 7, 'up'), o('diningChair', 4, 7, 'up'), o('diningChair', 5, 7, 'up'), o('diningChair', 11, 7, 'up'), o('diningChair', 12, 7, 'up'), o('diningChair', 13, 7, 'up'),
        o('dnHouseSeats', 3, 9, 'up'), o('dnHouseSeats', 11, 9, 'up'),
        // The lobby: the box office, the posters; the restroom.
        o('officeDesk', 7, 13, 'up'), o('enPosterWall', 13, 11), o('plant', 15, 13),
        o('toilet', 2, 13, 'right'), o('sink', 2, 12, 'right'),
        // Backstage: the stage manager's console and cue board, the quick-change rack, the costume racks.
        o('enSoundConsole', 18, 2), o('tsCueBoard', 20, 2), o('mdBackstageRack', 22, 2), o('dnCostumeRack', 23, 5, 'left'), o('acCostume', 17, 6, 'right'),
        // The set store and the stairs.
        o('stairs', 18, 13, 'left'), o('pntCanvasRack', 17, 10), o('pntCanvasRack', 22, 10),
        // Upstairs. The rehearsal hall: the mirror wall, the piano, the reading table and its chairs.
        up('danceMirror', 3, 2), up('danceMirror', 5, 2), up('danceMirror', 7, 2), up('vocalPiano', 11, 2),
        up('scriptTable', 6, 6), up('diningChair', 5, 6, 'right'), up('diningChair', 8, 6, 'left'),
        // The dressing room's mirrors.
        up('makeupMirror', 2, 10), up('makeupMirror', 3, 10), up('makeupMirror', 4, 10), up('enVanity', 7, 10), up('sofa', 2, 13, 'up'),
        // The wardrobe.
        up('wardrobeRack', 10, 10), up('acCostume', 12, 10), up('dnCostumeRack', 12, 13, 'up'),
        // The actors' lounge.
        up('sofa', 16, 2), up('sofa', 19, 2), up('coffeeMaker', 23, 2), up('fridge', 22, 2), up('salWaterCooler', 23, 8, 'left'), up('plant', 15, 8),
      ],
      coworkers: crew(['문연출 연출', '강주연 배우', '오앙상 배우'], ['#880e4f', '#ec407a', '#f8bbd0']),
      // The audience in the house before the curtain.
      clients: [{ noun: '관객', socials: ['signAutograph', 'fanSelfie'], spots: [[2, 7], [4, 8], [12, 8], [14, 7]], max: 2, every: 60, patience: 120 }],
      alarm: { notice: '🎭 주연 배우가 목이 쉬었어요! 커버로 무대에 서세요', done: '🎭 커버 공연에 커튼콜 박수가 쏟아졌어요! 성과가 크게 올라요', missed: '⌛ 늦어서 다른 커버 배우가 무대에 섰어요 (성과 감소)', interaction: 'performShow', every: [200, 320], window: 40 },
      tasks: [task('number', '넘버 발성 연습', ['vocalWarmup'], 2), task('blocking', '안무·동선 연습', ['practiceChoreo', 'rehearseStage'], 2), task('reading', '대본 리딩', ['readScript', 'acTableRead'])],
      extra: [
        task('makeup', '분장하기', ['getMakeup', 'enPreShow']), task('costume', '의상 피팅·퀵체인지', ['acCostumeFit', 'mdQuickChange', 'dnFitCostume']), task('cue', '무대 큐 맞추기', ['tsGiveCue', 'enSoundCheck']),
        task('face', '표정 연기 연습', ['practiceExpressions']), task('fans', '관객 응대', ['signAutograph', 'fanSelfie']), boss('연출님과 장면 상의'), chat(1),
      ],
      work: [
        'vocalWarmup', 'practiceChoreo', 'rehearseStage', 'performShow', 'readScript', 'acTableRead', 'getMakeup', 'practiceExpressions', 'enPreShow', 'acCostumeFit', 'mdQuickChange', 'dnFitCostume', 'tryOutfits',
        'tsGiveCue', 'enSoundCheck', 'fmCheckProps', 'playPiano', 'signAutograph', 'fanSelfie', 'actor_musicalNumber', 'actor_castReading',
      ],
      skill: 'singing',
      floors: { wood: 'walnutWood', carpet: 'lilacCarpet', tile: 'monoTile' },
      wall: 'navyWainscot',
    },
  },
  dj: {
    // The 음악 프로듀서 branch at a commercial recording studio (2026-11-04, the branch lots). Along the back the three rooms of the
    // studio proper: the vocal booth with its foam and its window, the control room between (the console turned to the booth's glass,
    // the monitors, the producer's sofa at the back) and the live room for the band (the drums and amps corner, a guitar, the piano),
    // both reached only through the control room. In front the lounge where the artists wait and the contracts are gone over, with the
    // kitchen counter and the front desk; on the right two producers' rooms (desk, keys, monitors) and the restroom. The van out front.
    1: {
      careerId: 'dj',
      name: '한빛사운드 녹음 스튜디오',
      icon: '🎚️',
      windowless: ['recordingMic', 'mixingConsole', 'ycBandCorner'],
      tiles: () =>
        patch(
          building(
            [[2, 2, 5, 5, 'carpet'], [7, 2, 14, 5, 'wood'], [16, 2, 23, 5, 'carpet'], [2, 7, 15, 13, 'wood'], [17, 7, 23, 9, 'wood'], [17, 11, 23, 13, 'wood']],
            [[6, 4], [15, 3], [10, 6], [16, 8], [16, 12], [12, 14]],
          ),
          RESTROOM_SE,
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The vocal booth: the foam, the mic, the window to the control room, the booth for the quick retakes.
        o('sgFoamWall', 2, 2), o('recordingMic', 3, 3), o('sgBoothWindow', 5, 2, 'left'), o('dubbingBooth', 2, 5, 'up'),
        // The control room: the window, the console turned to it, the monitors, the gold records, the producer's sofa.
        o('sgControlWindow', 7, 2, 'right'), o('mixingConsole', 8, 3, 'right'), o('clubSpeaker', 8, 2), o('sgGoldRecords', 11, 2), o('sofa', 12, 5, 'up'),
        // The live room: the band corner, a guitar, the piano, an amp.
        o('ycBandCorner', 17, 2), o('guitar', 21, 2), o('vocalPiano', 22, 4, 'up'), o('clubSpeaker', 23, 2),
        // The lounge: the artists' sofa, the contract table, the kitchen counter, the front desk.
        o('sofa', 2, 7), o('armchair', 4, 8, 'left'), o('contractTable', 6, 9), o('salMeetingChair', 6, 8), o('salMeetingChair', 7, 8),
        o('coffeeMaker', 13, 7), o('fridge', 14, 7), o('recordCrate', 15, 9, 'left'), o('officeDesk', 15, 10, 'left'), o('plant', 2, 13),
        // The producers' rooms: desks, keys, monitors.
        o('ncProducerDesk', 18, 7), o('clubSpeaker', 20, 7), o('lyricDesk', 21, 7), o('recordCrate', 23, 9, 'left'),
        o('clubSpeaker', 17, 11), o('ncProducerDesk', 18, 11), o('piano', 17, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The van.
        o('siteVan', 15, 16),
      ],
      coworkers: crew(['장비트 대표 프로듀서', '송믹스 엔지니어', '하보컬 디렉터'], ['#212121', '#00838f', '#80deea']),
      // Singers and rappers come in to record, waiting in the lounge first.
      clients: [{ noun: '녹음하러 온 가수', socials: ['hypeCrowd'], spots: [[2, 8], [3, 8]], max: 1, every: 70, patience: 150 }],
      alarm: { notice: '⏰ 오늘 밤 음원 발매인데 보컬 한 줄을 다시 따야 해요! 녹음 부스로 가세요', done: '🎙️ 마감 전에 다시 녹음해 믹스까지 끝냈어요! 성과가 크게 올라요', missed: '⌛ 늦어서 발매가 미뤄졌어요 (성과 감소)', interaction: 'urgentDub', every: [200, 320], window: 40 },
      tasks: [task('record', '보컬 녹음 디렉팅', ['recordVocals', 'mixAlbum'], 2), task('sketch', '곡 스케치·편곡', ['ncMakeEdit', 'playPiano']), task('session', '세션 합주 맞추기', ['ycCoachBand', 'playGuitar'])],
      extra: [
        task('lyrics', '가사 다듬기', ['writeLyrics']), task('monitor', '모니터 스피커 점검', ['checkSound']), task('refs', '레퍼런스 음반 고르기', ['digRecords']), task('contract', '계약서 검토', ['reviewContract']),
        task('meeting', '아티스트 미팅', ['salTableMeeting', 'hypeCrowd']), task('warmup', '가수 발성 봐 주기', ['vocalWarmup']), boss('대표님과 발매 일정 회의'), chat(1),
      ],
      work: [
        'recordVocals', 'mixAlbum', 'urgentDub', 'ncMakeEdit', 'playPiano', 'ycCoachBand', 'playGuitar', 'writeLyrics', 'checkSound', 'digRecords', 'reviewContract', 'salTableMeeting', 'vocalWarmup', 'writeReport',
        'hypeCrowd', 'dj_composeTrack', 'dj_albumContract',
      ],
      skill: 'djMixing',
      floors: { wood: 'walnutWood', carpet: 'slateStone' },
      wall: 'navyWainscot',
    },
  },
  photographer: {
    // The 사진 기자 branch at a daily newspaper's newsroom (2026-11-04, the branch lots). On the left the photo desk: the reporters' editing
    // computers in rows, the desk chief's computer beside the big selection monitor, the camera and lens lockers, a tripod for testing
    // gear; through the door the newsroom's shared side, where the editors pick the day's pictures round the meeting table and the pages
    // are laid out under the deadline board. The lobby with its security gate and visitors' desk, and the staff lounge with the restroom.
    // Out on the street the scene of the day: a press conference's podium behind a line of cones, the photographers' scooter and car.
    0: {
      careerId: 'photographer',
      name: '한빛일보 편집국 사진부',
      icon: '📰',
      tiles: () =>
        patch(
          building(
            [[2, 2, 11, 8, 'carpet'], [13, 2, 23, 8, 'carpet'], [2, 10, 15, 13, 'tile'], [17, 10, 23, 13, 'wood']],
            [[6, 9], [12, 5], [16, 12], [18, 9], [12, 14]],
          ),
          RESTROOM_SE,
        ),
      restrooms: [[22, 12, 23, 13]],
      ground: [[15, 15, 24, 17, 'concrete']],
      objects: [
        // The photo desk: the reporters' computers, the chief's computer and the selection monitor, the lockers, a tripod, the photo server.
        o('photoEditStation', 2, 2), o('photoEditStation', 4, 2), o('photoEditStation', 6, 2), o('photoEditStation', 9, 2), o('phSelectMonitor', 10, 2),
        o('photoEditStation', 2, 5), o('photoEditStation', 4, 5), o('photoEditStation', 6, 5),
        o('archiveShelf', 2, 8, 'up'), o('archiveShelf', 3, 8, 'up'), o('studioCamera', 9, 7, 'down'), o('serverRack', 11, 8, 'up'),
        // The newsroom: the meeting table, the deadline board, the layout desks, the editor's desk.
        o('salMeetingTable', 16, 4), o('salMeetingChair', 16, 3), o('salMeetingChair', 17, 3), o('salMeetingChair', 18, 3), o('salMeetingChair', 16, 5, 'up'), o('salMeetingChair', 17, 5, 'up'), o('salMeetingChair', 18, 5, 'up'),
        o('wrtDeadlineBoard', 20, 2), o('editorDesk', 23, 4, 'left'), o('wrtLayoutDesk', 23, 6, 'left'), o('wrtLayoutDesk', 14, 8, 'up'), o('wrtLayoutDesk', 15, 8, 'up'), o('plant', 13, 2),
        // The lobby: the visitors' desk, the gate.
        o('sgVisitorDesk', 2, 13, 'up'), o('sgSpeedGate', 8, 13, 'up'), o('plant', 15, 10),
        // The lounge; the restroom.
        o('salWaterCooler', 17, 10), o('fridge', 19, 10), o('coffeeMaker', 20, 10), o('sofa', 17, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The scene on the street: the podium, the press line, the scooter and the paper's car.
        o('pressPodium', 20, 16, 'up'), o('trafficCone', 17, 17, 'up'), o('trafficCone', 18, 17, 'up'), o('trafficCone', 21, 17, 'up'), o('trafficCone', 22, 17, 'up'),
        o('pressScooter', 14, 15), o('siteVan', 7, 16),
      ],
      coworkers: crew(['구렌즈 사진부장', '한셔터 사진기자', '문지면 편집기자'], ['#37474f', '#78909c', '#b0bec5']),
      alarm: { notice: '📸 큰 화재가 났어요! 취재 스쿠터로 현장에 출동하세요', done: '📰 내일 1면에 실릴 사진을 건졌어요! 성과가 크게 올라요', missed: '⌛ 늦어서 다른 신문사가 먼저 찍었어요 (성과 감소)', interaction: 'coverEvent', every: [200, 320], window: 45 },
      tasks: [task('edit', '보도 사진 고르고 보정하기', ['editPhotos'], 2), task('select', '사진 선정 회의', ['phShotSelect', 'salTableMeeting']), task('layout', '지면 배치 확인', ['wrtCheckLayout', 'wrtCheckDeadlines'])],
      extra: [task('test', '장비 테스트 촬영', ['testShots']), task('archive', '지난 사진 자료 찾기', ['readArchive']), task('field', '현장 취재 출동', ['coverEvent']), boss('사진부장님께 오늘 사진 보고'), chat(1)],
      work: ['editPhotos', 'phShotSelect', 'salTableMeeting', 'wrtCheckLayout', 'wrtCheckDeadlines', 'testShots', 'readArchive', 'coverEvent', 'photographer_photoCaption', 'photographer_photoDesk'],
      skill: 'photography',
      floors: { carpet: 'slateStone', tile: 'creamTile', wood: 'oakWood' },
      wall: 'creamPlain',
    },
  },
  meteorologist: {
    // The 기상캐스터 branch at a broadcaster's newsroom (2026-11-04, the branch lots). The news studio fills the left: the anchor desk
    // before its set, the chroma-key wall beside the weather map where the caster stands, the cameras with their prompters, the lights and
    // the return monitor turned to the caster. Off it the control room with the vision mixer and the monitor wall, and the newsroom's
    // weather team: the radar and satellite computer, the model terminal, the script desks, the forecast table where the day's forecast is
    // talked over. The makeup room and the restroom behind, the lobby where visitors wait. Out front the OB van and a camera set up for a
    // report from the street when a storm comes.
    0: {
      careerId: 'meteorologist',
      name: '한빛방송 보도국 날씨 스튜디오',
      icon: '📺',
      windowless: ['anNewsSet', 'tsControlDesk'],
      tiles: () =>
        patch(
          building(
            [[2, 2, 13, 8, 'carpet'], [15, 2, 23, 5, 'tile'], [15, 7, 23, 10, 'carpet'], [2, 10, 13, 13, 'tile'], [15, 12, 23, 13, 'tile']],
            [[14, 3], [14, 7], [6, 9], [19, 6], [17, 11], [14, 12], [12, 14]],
          ),
          RESTROOM_SE,
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The studio: the set and the anchor desk; the chroma-key wall and the weather map; the cameras, the lights, the return monitor.
        o('anNewsSet', 2, 2), o('anchorDesk', 3, 3), o('greenScreen', 8, 2), o('weatherSet', 10, 2), o('studioLight', 7, 4), o('studioLight', 12, 4),
        o('anCamera', 4, 6), o('anCamera', 10, 6), o('anMonitorWall', 9, 8, 'up'),
        // The control room.
        o('tsControlDesk', 17, 2), o('anMonitorWall', 21, 2),
        // The weather team: the radar and satellite computer, the model terminal, the script desks, the forecast table, the chart wall.
        o('modelTerminal', 16, 7), o('weatherStation', 17, 7), o('prompterDesk', 21, 7), o('prompterDesk', 22, 7), o('metBriefTable', 18, 9, 'up'), o('forecastWall', 15, 9, 'right'), o('officeDesk', 23, 9, 'left'),
        // The makeup room; the restroom.
        o('anMakeupCorner', 15, 13, 'up'), o('coffeeMaker', 20, 12, 'left'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The lobby: the reception, the visitors' seats.
        o('lobbyDesk', 2, 12), o('drWaitSeat', 8, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('plant', 13, 10), o('posterPop', 11, 10),
        // The OB van and the street camera.
        o('siteVan', 16, 16), o('studioCamera', 20, 16, 'down'),
      ],
      coworkers: crew(['윤보도 보도국장', '최앵커 앵커', '서구름 기상팀장'], ['#0d47a1', '#1976d2', '#4fc3f7']),
      // Visitors on a studio tour.
      clients: [{ noun: '견학객', socials: ['explainForecast'], spots: [[8, 12], [9, 12]], max: 1, every: 70, patience: 120 }],
      alarm: { notice: '🌀 태풍 특보가 떴어요! 앵커 데스크에서 긴급 날씨 특보를 전하세요', done: '🌀 차분하고 정확하게 특보를 전했어요! 성과가 크게 올라요', missed: '⌛ 늦어서 다른 캐스터가 특보를 전했어요 (성과 감소)', interaction: 'breakingNews', every: [180, 300], window: 30 },
      tasks: [task('data', '기상 자료·레이더 확인', ['checkWeather', 'runModel'], 2), task('script', '날씨 원고 다듬기', ['editScript']), task('onair', '날씨 생방송', ['presentWeather'])],
      extra: [
        task('chart', '일기도 분석', ['analyzeChart']), task('brief', '예보 토의 참석', ['metHourlyBrief']), task('ready', '방송 전 분장·의상', ['anGetReady']), task('prompt', '프롬프터 원고 맞추기', ['anCheckPrompter']),
        task('watch', '방송 모니터링', ['anWatchAir', 'tsCheckAir']), task('visitors', '견학객에게 날씨 설명', ['explainForecast']), boss('국장님께 원고 보고'),
      ],
      work: [
        'checkWeather', 'runModel', 'editScript', 'presentWeather', 'breakingNews', 'analyzeChart', 'metHourlyBrief', 'anGetReady', 'anCheckPrompter', 'anWatchAir', 'tsCheckAir', 'tsSwitchShots', 'explainForecast', 'writeReport',
        'meteorologist_writeScript', 'meteorologist_leadBriefing',
      ],
      skill: 'charisma',
      floors: { carpet: 'slateStone', tile: 'monoTile' },
      wall: 'navyWainscot',
    },
  },
  socialMedia: {
    // The 홍보 전문가 branch at a PR agency (2026-11-04, the branch lots). The account executives' floor fills the left: rows of desks
    // where the morning's coverage is clipped and the press releases written, the monitoring wall of news and social feeds beside
    // them. Off it the glass meeting room (the client's campaign on the trend board, the projector for the crisis briefing), the head's
    // office, and the pantry with the clients' sample shelf and the restroom. The lobby has the agency's logo wall and the sofa where the
    // client's people wait. A taxi out front for the press lunches.
    1: {
      careerId: 'socialMedia',
      name: '빛나래 PR 컨설팅',
      icon: '📣',
      tiles: () =>
        patch(
          building(
            [[2, 2, 13, 8, 'carpet'], [15, 2, 23, 6, 'carpet'], [15, 8, 23, 10, 'wood'], [2, 10, 13, 13, 'tile'], [15, 12, 23, 13, 'tile']],
            [[14, 4], [14, 8], [8, 9], [14, 12], [12, 14]],
          ),
          RESTROOM_SE,
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The AE floor: two rows of desks, the monitoring wall, the copier, the whiteboard.
        o('contentDesk', 3, 2), o('contentDesk', 4, 2), o('contentDesk', 5, 2), o('contentDesk', 7, 2), o('contentDesk', 8, 2), o('contentDesk', 9, 2),
        o('contentDesk', 3, 5), o('contentDesk', 4, 5), o('contentDesk', 5, 5), o('contentDesk', 7, 5), o('contentDesk', 8, 5), o('contentDesk', 9, 5),
        o('smReactionWall', 11, 2), o('copier', 13, 6, 'left'), o('whiteboard', 2, 8, 'up'), o('plant', 13, 2),
        // The meeting room: the table and chairs, the trend board, the projector.
        o('salMeetingTable', 17, 4), o('salMeetingChair', 17, 3), o('salMeetingChair', 18, 3), o('salMeetingChair', 19, 3), o('salMeetingChair', 17, 5, 'up'), o('salMeetingChair', 18, 5, 'up'), o('salMeetingChair', 19, 5, 'up'),
        o('trendBoard', 21, 2), o('projector', 23, 4, 'left'),
        // The head's office.
        o('officeDesk', 19, 8), o('archiveShelf', 16, 8), o('bookshelf', 21, 8), o('sofa', 22, 10, 'up'), o('plant', 15, 10),
        // The pantry and sample shelf; the restroom.
        o('coffeeMaker', 15, 13, 'up'), o('fridge', 16, 13, 'up'), o('smPrShelf', 18, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The lobby: the logo wall, the reception, the clients' sofa.
        o('prLogoWall', 5, 10), o('officeDesk', 9, 13, 'up'), o('sofa', 2, 12, 'right'), o('plant', 13, 10),
        // The taxi.
        o('taxiCab', 16, 16),
      ],
      coworkers: crew(['한소통 대표', '이기사 AE 팀장', '박클립 AE'], ['#e65100', '#fb8c00', '#ffcc80']),
      // The client's people waiting in the lobby.
      clients: [{ noun: '고객사 담당자', socials: ['pitchCampaign', 'negotiateDeal'], spots: [[3, 12], [3, 13]], max: 1, every: 80, patience: 150 }],
      alarm: { notice: '🔥 고객사 제품 논란 기사가 떴어요! 회의실에서 고객사에 위기 대응안을 보고하세요', done: '🧯 입장문과 대응안이 통해 논란이 가라앉았어요! 성과가 크게 올라요', missed: '⌛ 대응이 늦어 기사가 퍼졌어요 (성과 감소)', interaction: 'executiveReport', every: [180, 300], window: 40 },
      tasks: [task('monitor', '아침 언론 모니터링·클리핑', ['smCheckReaction', 'replyComments'], 2), task('release', '보도자료 아이템 기획', ['planContent']), task('meeting', '고객사 회의', ['salTableMeeting', 'rehearsePresentation'])],
      extra: [
        task('metrics', '캠페인 반응 분석', ['analyzeMetrics']), task('brainstorm', '아이템 브레인스토밍', ['attendMeeting']), task('report', '고객사 월간 보고서', ['writeReport']), task('kits', '기자 배포 자료 복사', ['makeCopies']),
        task('client', '고객사 담당자 응대', ['pitchCampaign', 'negotiateDeal']), boss('대표님께 캠페인 보고'), chat(1),
      ],
      work: [
        'smCheckReaction', 'replyComments', 'planContent', 'salTableMeeting', 'rehearsePresentation', 'analyzeMetrics', 'attendMeeting', 'writeReport', 'makeCopies', 'readArchive', 'executiveReport', 'pitchCampaign',
        'negotiateDeal', 'socialMedia_pressRelease', 'socialMedia_campaignBudget',
      ],
      skill: 'writing',
      floors: { carpet: 'slateStone', wood: 'oakWood', tile: 'creamTile' },
      wall: 'creamPlain',
    },
  },
  sales: {
    // The 투자자 branch at a venture capital firm (2026-11-04, the branch lots). The associates' desks on the left, where deals are
    // sourced and the due diligence done at the market terminals; the IR room on the right, where a startup pitches to the big screen and
    // the table. Below it the investment committee's room (the partners round the table, the head of it at its terminal), the managing
    // partner's office with the safe, the small meeting room where a founder sits across the contract table, and the pantry and restroom.
    // The lobby has the fund's logo and the wall of its portfolio companies, and the sofa where founders wait to pitch.
    1: {
      careerId: 'sales',
      name: '새벽별벤처스',
      icon: '📈',
      tiles: () =>
        patch(
          building(
            [[2, 2, 11, 8, 'carpet'], [13, 2, 23, 6, 'carpet'], [14, 8, 19, 10, 'wood'], [21, 8, 23, 10, 'wood'], [2, 10, 12, 13, 'tile'], [14, 12, 16, 13, 'carpet'], [18, 12, 23, 13, 'tile']],
            [[6, 9], [12, 4], [18, 7], [20, 8], [18, 11], [13, 13], [12, 14]],
          ),
          RESTROOM_SE,
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The associates' desks: the market terminals, the desks, the files, the shredder.
        o('tradingTerminal', 3, 2), o('tradingTerminal', 5, 2), o('tradingTerminal', 7, 2), o('tradingTerminal', 9, 2),
        o('officeDesk', 3, 5), o('officeDesk', 5, 5), o('officeDesk', 7, 5), o('officeDesk', 9, 5), o('archiveShelf', 11, 6, 'left'), o('shredder', 2, 8, 'up'), o('plant', 11, 2),
        // The IR room: the pitch screen, the table and its chairs, the projector.
        o('salesPresentation', 14, 2), o('salMeetingTable', 19, 3, 'left'), o('salMeetingChair', 18, 3, 'right'), o('salMeetingChair', 18, 4, 'right'), o('salMeetingChair', 18, 5, 'right'),
        o('salMeetingChair', 20, 3, 'left'), o('salMeetingChair', 20, 4, 'left'), o('salMeetingChair', 20, 5, 'left'), o('projector', 23, 4, 'left'),
        // The investment committee: the table, the partners' chairs, the chair's terminal at its head.
        o('negotiationTable', 15, 9), o('salMeetingChair', 15, 8), o('salMeetingChair', 16, 8),
        o('tradingTerminal', 19, 9, 'left'),
        // The managing partner's office and the safe.
        o('vipDesk', 22, 8), o('bookshelf', 23, 8), o('vaultDoor', 22, 10, 'up'),
        // The small meeting room: the contract table and its chairs.
        o('contractTable', 14, 12), o('salMeetingChair', 16, 12, 'left'),
        // The pantry; the restroom.
        o('salWaterCooler', 18, 13, 'up'), o('coffeeMaker', 19, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The lobby: the fund's logo wall, the portfolio wall, the reception, the founders' sofa.
        o('vcLogoWall', 3, 10), o('vcPortfolioWall', 8, 10), o('officeDesk', 10, 13, 'up'), o('sofa', 2, 12, 'right'), o('plant', 12, 10),
        // The taxi.
        o('taxiCab', 16, 16),
      ],
      coworkers: crew(['정심사 대표 파트너', '유실사 심사역', '노딜 심사역'], ['#1a237e', '#3949ab', '#9fa8da']),
      // Founders waiting to pitch.
      clients: [{ noun: '스타트업 대표', socials: ['negotiateDeal'], spots: [[3, 12], [3, 13]], max: 1, every: 80, patience: 150 }],
      alarm: { notice: '📈 경쟁 VC가 먼저 텀시트를 냈대요! 소회의실 계약 테이블에서 오늘 투자를 확정하세요', done: '🤝 우리가 리드 투자자가 됐어요! 성과가 크게 올라요', missed: '⌛ 결정이 늦어 경쟁 VC가 딜을 가져갔어요 (성과 감소)', interaction: 'closeDeal', every: [200, 320], window: 45 },
      tasks: [task('sourcing', '딜 소싱·시장 분석', ['monitorMarket'], 2), task('ir', '스타트업 IR 듣기', ['salTableMeeting']), task('memo', '투자 심사 보고서 쓰기', ['writeReport', 'crunchNumbers'])],
      extra: [
        task('contract', '투자 계약서 검토', ['reviewContract']), task('terms', '투자 조건 협상', ['conductTalks']), task('lp', '출자자 보고서 준비', ['prepareVipReport']), task('files', '실사 자료 정리', ['readArchive', 'shredDocs']),
        task('founders', '스타트업 대표 면담', ['negotiateDeal']), task('pitch', 'IR 발표 자료 검토', ['salesPresentProduct', 'rehearsePresentation']), boss('대표 파트너님께 딜 보고'),
      ],
      work: [
        'monitorMarket', 'salTableMeeting', 'writeReport', 'crunchNumbers', 'reviewContract', 'closeDeal', 'conductTalks', 'prepareVipReport', 'readArchive', 'shredDocs', 'auditVault', 'negotiateDeal',
        'salesPresentProduct', 'rehearsePresentation', 'sales_dueDiligence', 'sales_investmentCommittee',
      ],
      skill: 'logic',
      floors: { carpet: 'slateStone', wood: 'walnutWood', tile: 'creamTile' },
      wall: 'creamPlain',
    },
  },
  athletic: {
    // The 피트니스 branch at a personal-training gym (2026-11-04, the branch lots), the floor for training downstairs and the changing
    // rooms upstairs. Downstairs one open floor: the free weights on the left with the posing mirror beside the racks, the cable and
    // bar station, the treadmills along the windows, and in the middle the PT zone where it's seen from the treadmills (the mats, the
    // balls); the stairs along the back. In front the counter with the body-composition scanner and the members' sofa, and the
    // consultation room where a member's programme is drawn up. Upstairs the men's and women's changing rooms with lockers and showers,
    // the stretching zone with the foam rollers, the trainers' room and the restroom.
    1: {
      careerId: 'athletic',
      name: '파워업 PT 스튜디오',
      icon: '🏋️',
      tiles: () => [
        ...building([[2, 2, 23, 9, 'wood'], [2, 11, 13, 13, 'tile'], [15, 11, 23, 13, 'carpet']], [[5, 10], [14, 12], [12, 14]]),
        ...patch(
          upstairs([[2, 2, 8, 7, 'tile'], [10, 2, 16, 7, 'tile'], [2, 9, 16, 13, 'wood'], [18, 2, 23, 6, 'carpet'], [18, 8, 23, 13, 'wood']], [[5, 8], [13, 8], [17, 10], [20, 7]]),
          RESTROOM_SE,
        ),
      ],
      restrooms: [[22, 30, 23, 31]],
      objects: [
        // The free weights and the posing mirror.
        o('weightRack', 2, 2), o('weightRack', 4, 2), o('weightRack', 6, 2), o('ygMirrorWall', 8, 2),
        // The cable and bar station.
        o('ptStallBars', 12, 2), o('pullUpBar', 14, 2),
        // The treadmills along the windows.
        o('treadmill', 17, 2), o('treadmill', 18, 2), o('treadmill', 19, 2), o('treadmill', 20, 2), o('athHydration', 23, 2),
        // The PT zone: the mats and the balls.
        o('yogaMat', 8, 6), o('yogaMat', 11, 6), o('exerciseBall', 14, 6), o('exerciseBall', 15, 6), o('athAgility', 9, 9, 'up'),
        o('weightRack', 2, 6), o('weightRack', 4, 6),
        // The stairs.
        o('stairs', 19, 9, 'right'),
        // The counter: the desk, the scanner, the members' sofa, the trophies.
        o('ygFrontDesk', 9, 13, 'up'), o('ygInbody', 13, 11, 'left'), o('sofa', 2, 12, 'right'), o('athTrophyCase', 5, 13, 'up'),
        // The consultation room.
        o('officeDesk', 17, 11), o('diningChair', 17, 13, 'up'), o('whiteboard', 20, 11), o('archiveShelf', 23, 11, 'left'), o('plant', 15, 13),
        // Upstairs. The changing rooms: lockers, showers, a bench.
        up('athLockers', 2, 2), up('athLockers', 4, 2), up('shower', 7, 2), up('shower', 8, 2), up('rxWaitBench', 3, 5),
        up('athLockers', 10, 2), up('athLockers', 12, 2), up('shower', 15, 2), up('shower', 16, 2), up('rxWaitBench', 11, 5),
        // The stretching zone.
        up('yogaMat', 2, 9), up('yogaMat', 8, 12, 'up'), up('exerciseBall', 11, 12, 'up'), up('dnStretchCorner', 14, 12, 'up'), up('dnStretchCorner', 2, 12, 'up'),
        // The trainers' room.
        up('officeDesk', 19, 2), up('officeDesk', 21, 2), up('sofa', 22, 6, 'up'), up('fridge', 18, 6, 'up'),
        // The hall and the restroom.
        up('athHydration', 23, 8, 'left'), up('plant', 18, 13),
        up('toilet', 23, 13, 'left'), up('sink', 23, 12, 'left'),
      ],
      coworkers: crew(['강근육 관장', '윤코어 트레이너', '배스쿼트 트레이너'], ['#1b5e20', '#43a047', '#a5d6a7']),
      alarm: { notice: '🏢 근처 회사에서 단체 PT를 신청했어요! PT 존 매트로 가세요', done: '💪 단체 수업이 대성공이라 회원 등록이 늘었어요! 성과가 크게 올라요', missed: '⌛ 늦어서 다른 트레이너가 수업을 맡았어요 (성과 감소)', interaction: 'corporateClass', every: [200, 320], window: 40 },
      tasks: [task('pt', '회원 PT 수업', ['ptBandExercise', 'guideStretch'], 2), task('weights', '프리웨이트 지도·시범', ['liftWeights'], 2), task('scan', '인바디 측정·상담', ['ygBodyScan'])],
      extra: [
        task('cardio', '유산소 운동', ['workout']), task('pullups', '턱걸이 훈련', ['doPullUps']), task('pose', '거울 보며 자세 점검', ['ygMirrorCheck']), task('desk', 'PT 예약 받기', ['ygBookClass']), task('recover', '폼롤러로 회복', ['dnFoamRoll']),
        task('lockers', '탈의실·음료 정리', ['athTidyLockers', 'athFillBottles']), task('records', '회원 운동 기록 정리', ['writeReport']), boss('관장님과 면담하기'),
      ],
      work: [
        'ptBandExercise', 'guideStretch', 'liftWeights', 'ygBodyScan', 'workout', 'doPullUps', 'ygMirrorCheck', 'ygBookClass', 'dnFoamRoll', 'dnSplitStretch', 'athTidyLockers', 'athFillBottles', 'guideExercise',
        'writeReport', 'corporateClass', 'athletic_clientProgram', 'athletic_coachContest',
      ],
      skill: 'fitness',
      floors: { wood: 'oakWood', tile: 'creamTile', carpet: 'sageCarpet' },
      wall: 'creamPlain',
    },
  },
};
