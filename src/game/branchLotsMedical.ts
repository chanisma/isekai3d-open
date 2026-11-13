import type { Tile } from './types';
import type { WorkplaceDef } from './workplace';
import { boss, building, chat, crew, o, patch, task, up, upstairs } from './workplaceKit';

/** A run of tiles along a row or down a column, all one kind (a wall line, a strip of water). */
const row = (x0: number, x1: number, y: number, t: Tile): Array<[number, number, Tile]> => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y, t]);
const col = (x: number, y0: number, y1: number, t: Tile): Array<[number, number, Tile]> => Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i, t]);

/** Branch lots for medicine and science (branchLots.ts), by career id and branch number. */
export const MEDICAL_LOTS: Record<string, Partial<Record<number, WorkplaceDef>>> = {
  paramedic: {
    // The 병원 응급실 branch at a regional emergency centre (2026-11-04, the branch lots). The ambulances come in under the canopy on the
    // left, straight into triage, where the crew's handover desk stands by the kit and the KTAS board; the two negative-pressure
    // isolation rooms open off triage through their own anteroom, so a feverish patient never crosses the ER. Along the back the
    // resuscitation room (two bays, the crash cart between them) and the critical area's monitored beds; in the middle the nurses'
    // station with the light box, the general and children's beds round it; walk-in patients and families come in by their own door
    // to the reception and its seats, the restroom off it. The helipad is the pilot's (pilot@1), so none here.
    1: {
      careerId: 'paramedic',
      name: '한빛대학병원 권역응급의료센터',
      icon: '🏥',
      tiles: () =>
        patch(
          building(
            [
              [2, 2, 3, 4, 'tile'], [5, 2, 6, 4, 'tile'], [2, 6, 6, 6, 'tile'], [8, 2, 12, 6, 'tile'], [14, 2, 23, 6, 'tile'],
              [2, 8, 7, 13, 'tile'], [9, 8, 16, 13, 'tile'], [18, 8, 23, 13, 'carpet'],
            ],
            [[3, 5], [5, 5], [4, 7], [10, 7], [15, 7], [8, 10], [17, 10], [4, 14], [12, 14], [20, 14]],
          ),
          [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
        ),
      restrooms: [[22, 12, 23, 13]],
      ground: [[0, 15, 9, 17, 'concrete']],
      objects: [
        // The isolation rooms, a bed and a monitor each; the anteroom's hand basin.
        o('hospitalBed', 2, 2), o('drBedsideMonitor', 3, 2), o('hospitalBed', 6, 2), o('drBedsideMonitor', 5, 2), o('nsHandSink', 2, 6, 'right'),
        // The resuscitation room: two bays, the crash cart between their heads, the monitors, the treatment cart and the drugs.
        o('hospitalBed', 9, 2), o('erResusCart', 10, 2), o('hospitalBed', 11, 2), o('drBedsideMonitor', 8, 2), o('drBedsideMonitor', 12, 2),
        o('drTreatCart', 8, 6), o('medCabinet', 12, 6, 'left'),
        // The critical area: four monitored beds along the wall, the drips between them, a basin.
        o('hospitalBed', 14, 2), o('drBedsideMonitor', 15, 2), o('nsIvPole', 16, 2), o('hospitalBed', 17, 2), o('drBedsideMonitor', 18, 2), o('nsIvPole', 19, 2),
        o('hospitalBed', 20, 2), o('drBedsideMonitor', 21, 2), o('nsIvPole', 22, 2), o('hospitalBed', 23, 2), o('nsHandSink', 23, 6, 'left'),
        // Triage: the kit shelves, the KTAS board, the crew's handover desk, the oxygen; a cot back from a run.
        o('medKitShelf', 2, 8), o('medKitShelf', 3, 8), o('erTriageSign', 5, 8), o('dispatchDesk', 6, 8), o('pmOxygenRack', 7, 8), o('pmStretcher', 5, 12),
        // The nurses' station with the light box and the computer; the general and children's beds round it.
        o('nsNurseStation', 10, 10), o('medStation', 13, 10), o('xrayViewer', 13, 8),
        o('hospitalBed', 9, 12, 'up'), o('drBedsideMonitor', 10, 13, 'up'), o('hospitalBed', 14, 12, 'up'), o('nsIvPole', 15, 13, 'up'), o('hospitalBed', 16, 12, 'up'),
        // Reception and the families' seats; the restroom.
        o('drReception', 18, 8), o('drWaitSeat', 19, 11, 'up'), o('drWaitSeat', 20, 11, 'up'), o('drWaitSeat', 23, 9, 'left'), o('drWaitSeat', 23, 10, 'left'), o('plant', 18, 13),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // The ambulance bay under the canopy.
        o('ambulance', 2, 15), o('ambulance', 10, 15),
      ],
      coworkers: crew(['채응급 운영실장', '도분류 응급구조사', '남소생 간호사'], ['#c62828', '#ef5350', '#90caf9']),
      // Walk-in patients and their families, at the reception's seats.
      clients: [{ noun: '응급실 환자·보호자', socials: ['checkVitalsCitizen'], spots: [[19, 10], [20, 10], [22, 10]], max: 2, every: 60, patience: 120 }],
      alarm: { notice: '🚑 구급대가 심정지 환자를 싣고 온대요! 소생실로 가세요', done: '🫀 심장이 다시 뛰기 시작했어요! 성과가 크게 올라요', missed: '⌛ 준비가 늦어 다른 의료진이 맡았어요 (성과 감소)', interaction: 'erResuscitate', every: [150, 240], window: 20 },
      tasks: [task('handover', '구급대 환자 인계받기', ['reviewDispatch']), task('watch', '중증 환자 감시', ['drCheckMonitor', 'nsHangIv'], 2), task('kit', '분류소 장비 채우기', ['restockMedKit', 'pmCotCheck', 'pmOxygenCheck'])],
      extra: [task('notes', '응급실 기록 정리', ['nsNursingNotes', 'writeChart']), task('xray', '영상 같이 보기', ['readXray']), task('hands', '손 위생', ['nsWashHands']), task('walkins', '내원 환자 활력징후 재기', ['checkVitalsCitizen']), boss('운영실장님께 보고'), chat(1)],
      work: [
        'reviewDispatch', 'drCheckMonitor', 'nsHangIv', 'restockMedKit', 'pmCotCheck', 'pmOxygenCheck', 'nsNursingNotes', 'writeChart', 'readXray', 'nsWashHands', 'checkVitalsCitizen',
        'erResuscitate', 'paramedic_triagePractice', 'paramedic_reviewCalls',
      ],
      skill: 'fitness',
      floors: { tile: 'creamTile', carpet: 'slateStone' },
      wall: 'creamPlain',
    },
  },
  pharmacist: {
    // The 제약 연구원 branch at a drug company's central research institute (2026-11-04, the branch lots). The researchers' offices are
    // kept apart from the labs (no eating or drinking in a lab): downstairs the clinical development team with its trial-data terminal,
    // the researchers' office, the meeting room where the projects are gone over at the whiteboard, and the lobby with the reception,
    // the visitors' seats, a coffee corner, the stairs and the restroom. Upstairs the labs off one corridor: synthesis (two fume hoods,
    // the bench, the gas cylinders, the safety corner), analysis (the HPLC benches), formulation (the weighing and dispensing bench, the
    // tablet press, the coating bench); across the corridor the cell lab (the biosafety cabinet, the incubator, a microscope) and the
    // store of reagents, sample freezers and waste.
    1: {
      careerId: 'pharmacist',
      name: '한빛제약 중앙연구소',
      icon: '🧪',
      tiles: () => [
        ...patch(
          building([[2, 2, 8, 7, 'carpet'], [10, 2, 16, 7, 'carpet'], [18, 2, 23, 7, 'wood'], [2, 9, 23, 13, 'tile']], [[5, 8], [11, 8], [20, 8], [12, 14]]),
          [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
        ),
        ...upstairs(
          [[2, 2, 8, 6, 'tile'], [10, 2, 15, 6, 'tile'], [17, 2, 23, 6, 'tile'], [2, 8, 23, 9, 'tile'], [2, 11, 9, 13, 'tile'], [11, 11, 23, 13, 'tile']],
          [[5, 7], [12, 7], [20, 7], [5, 10], [18, 10]],
        ),
      ],
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The clinical development team: desks, the trial-data terminal, the files.
        o('researchDesk', 2, 2), o('researchDesk', 3, 2), o('researchDesk', 6, 2), o('researchDesk', 7, 2), o('rxCheckTerminal', 8, 4, 'left'), o('archiveShelf', 2, 7, 'up'), o('archiveShelf', 3, 7, 'up'),
        // The researchers' office.
        o('officeDesk', 10, 2), o('officeDesk', 11, 2), o('officeDesk', 14, 2), o('officeDesk', 15, 2), o('archiveShelf', 16, 5, 'left'), o('plant', 16, 7),
        // The meeting room: the whiteboard, the table and its chairs.
        o('whiteboard', 19, 2), o('salMeetingTable', 19, 5), o('salMeetingChair', 19, 4), o('salMeetingChair', 20, 4), o('salMeetingChair', 21, 4),
        o('salMeetingChair', 19, 6, 'up'), o('salMeetingChair', 20, 6, 'up'), o('salMeetingChair', 21, 6, 'up'),
        // The lobby: the stairs, the reception, the visitors' seats, the coffee corner; the restroom.
        o('stairs', 13, 9, 'left'), o('officeDesk', 6, 13, 'up'), o('drWaitSeat', 2, 13, 'up'), o('drWaitSeat', 3, 13, 'up'), o('plant', 2, 9), o('plant', 10, 13),
        o('coffeeMaker', 18, 9), o('fridge', 19, 9), o('salWaterCooler', 23, 9), o('sofa', 18, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // Upstairs. Synthesis: the fume hoods, the bench, the gas cylinders, the safety corner.
        up('sciFumeHood', 2, 2), up('sciFumeHood', 4, 2), up('chemistryBench', 6, 2), up('sciGasRack', 8, 2), up('sciSafetyCorner', 2, 6, 'right'),
        // Analysis: the HPLC benches.
        up('sciInstrumentBench', 10, 2), up('sciInstrumentBench', 13, 2), up('officeDesk', 15, 5, 'left'),
        // Formulation: weighing and dispensing, the tablet press, coating.
        up('dispensingTable', 17, 2), up('phTabletPress', 20, 2), up('chemistryBench', 22, 2),
        // The cell lab; the store of reagents, sample freezers and waste.
        up('bioSafetyCabinet', 2, 13, 'up'), up('ltIncubator', 5, 13, 'up'), up('microscopeBench', 9, 13, 'up'),
        up('ltReagentStore', 11, 13, 'up'), up('specimenFreezer', 14, 13, 'up'), up('specimenFreezer', 15, 13, 'up'), up('ltBioBin', 17, 13, 'up'), up('sciSafetyCorner', 23, 8, 'left'),
      ],
      coworkers: crew(['한신약 개발본부장', '유합성 수석연구원', '진제형 연구원'], ['#1565c0', '#fafafa', '#90caf9']),
      alarm: { notice: '📞 임상시험 병원에서 시험약이 급히 더 필요하대요! 2층 제제연구실 조제대로 가세요', done: '💊 시험약을 제때 만들어 보냈어요! 성과가 크게 올라요', missed: '⌛ 늦어서 임상시험 일정이 밀렸어요 (성과 감소)', interaction: 'urgentPrescription', every: [180, 300], window: 45 },
      tasks: [task('synth', '후보 물질 합성', ['sciHoodSynthesis', 'runExperiment'], 2), task('assay', 'HPLC 분석', ['sciReadSpectrum', 'analyzeSamples']), task('formulate', '제형 연구', ['phPressTablets', 'dispenseMeds'])],
      extra: [
        task('cells', '세포 실험', ['bscWork', 'ltCulture']), task('paper', '연구 노트·보고서 쓰기', ['writePaper', 'writeReport']), task('trial', '임상 자료 조회', ['rxLookupDrugs']), task('samples', '시료·시약 보관', ['storeSamples', 'ltReagent']),
        task('safety', '실험실 보호구 착용', ['sciGearUp']), task('meeting', '연구 회의', ['attendMeeting', 'salTableMeeting']), boss('본부장님께 연구 보고'),
      ],
      work: [
        'sciHoodSynthesis', 'runExperiment', 'sciReadSpectrum', 'sciRunCentrifuge', 'analyzeSamples', 'phPressTablets', 'dispenseMeds', 'bscWork', 'ltCulture', 'examineSlides', 'writePaper', 'writeReport',
        'rxLookupDrugs', 'storeSamples', 'ltReagent', 'ltDispose', 'sciGearUp', 'attendMeeting', 'salTableMeeting', 'urgentPrescription', 'pharmacist_trialData', 'pharmacist_labMeeting',
      ],
      skill: 'logic',
      floors: { carpet: 'slateStone', wood: 'walnutWood', tile: 'creamTile' },
      wall: 'creamPlain',
    },
  },
  labTechnician: {
    // The 연구·검역 branch at a national airport quarantine station (2026-11-04, the branch lots). Arrivals cross the screening hall:
    // the thermal camera's desk picks out a fever, the quarantine desk checks it again, the health questionnaire is filled in at its
    // stand and a sample taken at the hatch, the travellers waiting on the seats. A traveller who may carry an infection goes through
    // the side door to the isolation rooms, each with its own way out to the ambulance. Behind the hall the lab where the samples are
    // opened in the biosafety cabinet and run for the genes, its sample fridges and waste; the vector room where the mosquitoes caught
    // round the airport are named under the microscope; the researchers' office with the result desk and the staff restroom.
    1: {
      careerId: 'labTechnician',
      name: '국립한빛공항검역소',
      icon: '✈️',
      tiles: () =>
        patch(
          building(
            [[2, 2, 9, 7, 'tile'], [11, 2, 14, 7, 'tile'], [16, 2, 23, 7, 'carpet'], [2, 9, 16, 13, 'tile'], [18, 9, 23, 9, 'tile'], [18, 11, 19, 13, 'tile'], [21, 11, 23, 13, 'tile']],
            [[6, 8], [12, 8], [16, 8], [17, 9], [19, 10], [22, 10], [22, 14], [12, 14]],
          ),
          [[21, 2, 'wall'], [21, 3, 'wall'], [21, 4, 'wall'], [22, 4, 'door'], [23, 4, 'wall']],
        ),
      restrooms: [[22, 2, 23, 3]],
      windowless: ['analyzerMachine'],
      objects: [
        // The lab: the gene analyser, the pipetting bench, the biosafety cabinet, the sample fridges; reagents and waste.
        o('analyzerMachine', 2, 2), o('ltPipetteBench', 4, 2), o('bioSafetyCabinet', 6, 2), o('sampleFridge', 8, 2), o('sampleFridge', 9, 2), o('ltReagentStore', 2, 7, 'up'), o('ltBioBin', 9, 7, 'up'),
        // The vector room: the microscopes, the freezer of caught mosquitoes.
        o('microscopeBench', 11, 2), o('microscopeBench', 12, 2), o('specimenFreezer', 14, 2),
        // The researchers' office: desks, the result desk; the restroom in its corner.
        o('officeDesk', 16, 2), o('officeDesk', 18, 2), o('officeDesk', 20, 2), o('ltVerifyDesk', 19, 7, 'up'),
        o('toilet', 22, 2), o('sink', 23, 2),
        // The screening hall: the thermal camera's desk, the quarantine desk, the questionnaire stand, the sample hatch, the seats.
        o('qrThermalGate', 3, 9), o('officeDesk', 7, 9), o('juFormStand', 9, 9), o('ltReception', 14, 9), o('plant', 11, 9),
        o('drWaitSeat', 3, 13, 'up'), o('drWaitSeat', 4, 13, 'up'), o('drWaitSeat', 5, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 8, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('plant', 16, 13),
        // The isolation rooms.
        o('hospitalBed', 18, 11), o('hospitalBed', 23, 11), o('drBedsideMonitor', 21, 11),
        // The quarantine van.
        o('siteVan', 15, 15),
      ],
      coworkers: crew(['방역진 검역소장', '윤유전 보건연구관', '서매개 검역관'], ['#00695c', '#26a69a', '#80cbc4']),
      // Arrivals waiting on the seats for their questionnaire to be checked or a sample taken.
      clients: [{ noun: '입국 여행객', socials: ['explainResults', 'drawBlood'], spots: [[3, 12], [5, 12], [8, 12]], max: 2, every: 45, patience: 100 }],
      alarm: { notice: '🌡️ 입국자 중 고열 환자가 있어요! 열화상 검역대로 가서 격리실로 안내하세요', done: '🧪 격리하고 검체를 받아 바로 검사했어요! 성과가 크게 올라요', missed: '⌛ 늦어서 고열 환자가 검역대를 지나쳤어요 (성과 감소)', interaction: 'qrIsolateTraveler', every: [180, 300], window: 30 },
      tasks: [task('screen', '입국자 발열 감시', ['qrScreen'], 2), task('pcr', '검체 유전자 검사', ['bscWork', 'ltPipette', 'runBloodTest']), task('vector', '모기 매개체 감시', ['examineSlides'])],
      extra: [
        task('samples', '검체 보관', ['organizeSamples', 'storeSamples']), task('receive', '검체 접수', ['ltReceive', 'ltLabelCheck']), task('verify', '결과 확인·보고', ['ltVerify', 'ltCritical']), task('forms', '건강상태 질문서 안내', ['juFormHelp', 'juFormStock']),
        task('report', '검역 보고서 쓰기', ['writeReport']), task('waste', '감염성 폐기물 처리', ['ltDispose', 'ltReagent']), task('travelers', '입국 여행객 응대', ['explainResults', 'drawBlood']), boss('검역소장님께 보고'),
      ],
      work: [
        'qrScreen', 'qrIsolateTraveler', 'bscWork', 'ltPipette', 'runBloodTest', 'examineSlides', 'organizeSamples', 'storeSamples', 'ltReceive', 'ltLabelCheck', 'ltVerify', 'ltCritical', 'juFormHelp', 'juFormStock',
        'writeReport', 'ltDispose', 'ltReagent', 'explainResults', 'drawBlood', 'labTechnician_researchReport', 'labTechnician_labWorkflow',
      ],
      skill: 'logic',
      floors: { tile: 'creamTile', carpet: 'slateStone' },
      wall: 'creamPlain',
    },
  },
  koreanMedicine: {
    // The 한의학 연구 branch at a Korean medicine research institute (2026-11-04, the branch lots). A hall runs up from the door with the
    // rooms off it. On the left the herbarium of standard specimens (the drug cabinets, the pressed-plant cases) and the researchers'
    // office with the 동의보감 shelf and a meeting table. On the right the standard decoction lab (two decocters, so one can be watched
    // while the other runs, the pouch packer, the grinding seat), the analysis room (the HPLC bench, the fume hood, the analyser) and the
    // clinical research room where a trial's participants have their pulse and constitution measured, its restroom off it; the
    // participants wait on the hall's seats. The herb garden out front.
    1: {
      careerId: 'koreanMedicine',
      name: '한빛한의학연구원',
      icon: '🌿',
      tiles: () =>
        building(
          [[2, 2, 10, 6, 'wood'], [2, 8, 10, 13, 'wood'], [12, 2, 14, 13, 'tile'], [16, 2, 23, 5, 'tile'], [16, 7, 23, 9, 'tile'], [16, 11, 20, 13, 'wood'], [22, 12, 23, 13, 'tile']],
          [[11, 4], [11, 10], [15, 3], [15, 8], [15, 12], [21, 12], [12, 14]],
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The herbarium: the drug cabinets, the pressed-plant cases.
        o('herbCabinet', 2, 2), o('herbCabinet', 4, 2), o('herbCabinet', 6, 2), o('ecoHerbarium', 8, 2), o('ecoHerbarium', 3, 6, 'up'), o('plant', 10, 6),
        // The office: desks, the 동의보감 shelf, the meeting table.
        o('researchDesk', 2, 8), o('researchDesk', 3, 8), o('researchDesk', 5, 8), o('researchDesk', 6, 8), o('kmDonguiShelf', 8, 8),
        o('salMeetingTable', 6, 13), o('salMeetingChair', 6, 12), o('salMeetingChair', 7, 12), o('salMeetingChair', 8, 12),
        // The hall: the coffee, the participants' seats.
        o('coffeeMaker', 12, 2), o('plant', 14, 2), o('drWaitSeat', 14, 9, 'left'), o('drWaitSeat', 14, 10, 'left'),
        // The decoction lab.
        o('herbDecoctor', 16, 2), o('herbDecoctor', 17, 2), o('kmPouchPacker', 18, 2), o('kmHerbGrinder', 20, 2), o('hygieneStation', 23, 5, 'left'),
        // The analysis room.
        o('sciInstrumentBench', 18, 7), o('sciFumeHood', 20, 7), o('analyzerMachine', 22, 7),
        // The clinical research room: the pulse desk, the participants' seats; its restroom.
        o('pulseDesk', 16, 11, 'right'), o('drWaitSeat', 18, 13, 'up'), o('drWaitSeat', 19, 13, 'up'),
        o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
        // The herb garden out front.
        o('gardenBed', 2, 15), o('gardenBed', 5, 15), o('gardenBed', 8, 15),
      ],
      coworkers: crew(['백본초 원장', '허탕전 책임연구원', '이맥진 연구원'], ['#6d4c41', '#8d6e63', '#d7ccc8']),
      // A trial's participants, on the hall's seats and in the clinical room.
      clients: [{ noun: '임상시험 참여자', socials: ['consultPatient'], spots: [[18, 12], [19, 12], [13, 9], [13, 10]], max: 2, every: 60, patience: 120 }],
      alarm: { notice: '⚠️ 유통 약재에서 성분 이상 신고가 들어왔어요! 분석실 자동 분석기로 가세요', done: '🔬 원인 성분을 찾아 회수를 도왔어요! 성과가 크게 올라요', missed: '⌛ 분석이 늦어 다른 기관이 먼저 밝혔어요 (성과 감소)', interaction: 'statSample', every: [180, 300], window: 40 },
      tasks: [task('decoct', '표준 탕전 실험', ['brewHerbalMed'], 2), task('assay', '약재 성분 분석', ['sciReadSpectrum', 'sciHoodSynthesis']), task('specimen', '약재 표본 관리', ['prepareHerbs', 'ecoMountPlant'])],
      extra: [
        task('pulse', '참여자 맥진·체질 측정', ['pulseDiagnosis']), task('paper', '논문 쓰기', ['writePaper']), task('classic', '고문헌 연구', ['kmReadDongui']), task('herbwork', '약재 손질', ['kmCutHerbs', 'kmGrindHerbs']),
        task('pack', '시험약 파우치 포장', ['kmPackPouches']), task('participants', '임상시험 참여자 문진', ['consultPatient']), task('meeting', '연구 회의', ['salTableMeeting']), boss('원장님께 연구 보고'),
      ],
      work: [
        'brewHerbalMed', 'sciReadSpectrum', 'sciRunCentrifuge', 'sciHoodSynthesis', 'prepareHerbs', 'ecoMountPlant', 'pulseDiagnosis', 'writePaper', 'kmReadDongui', 'kmCutHerbs', 'kmGrindHerbs', 'kmPackPouches',
        'consultPatient', 'salTableMeeting', 'hygieneCheck', 'statSample', 'koreanMedicine_herbResearch', 'koreanMedicine_researchMeeting',
      ],
      skill: 'logic',
      floors: { wood: 'walnutWood', tile: 'creamTile' },
      wall: 'oakWainscot',
    },
  },
  dietitian: {
    // The 임상 영양 branch in a hospital's nutrition department (2026-11-04, the branch lots), the kitchen downstairs and a ward upstairs.
    // The kitchen runs in order from the goods-in end: the cold room and the stores, the big cookers for the ordinary meals, the
    // preparation and therapeutic-diet counters (diabetic, low-salt, soft), the preserved-sample freezer; the tray line where each
    // patient's tray is set by its card and slid into the meal carts; the dish room behind. The department's office with the menu and
    // diet-order desks, the outpatients' counselling room (its restroom off it), and the hall with the ward lift and the stairs.
    // Upstairs a ward: three rooms of two beds, the nurses' station across the corridor, the ward pantry where the carts wait, the
    // families' sofa.
    1: {
      careerId: 'dietitian',
      name: '한빛병원 영양팀',
      icon: '🍱',
      tiles: () => [
        ...patch(
          building(
            [[2, 2, 16, 7, 'tile'], [18, 2, 23, 7, 'tile'], [2, 9, 8, 13, 'carpet'], [10, 9, 16, 13, 'tile'], [18, 9, 23, 13, 'wood']],
            [[17, 4], [16, 8], [9, 11], [17, 11], [12, 14]],
          ),
          [[22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door']],
        ),
        ...upstairs([[2, 2, 6, 7, 'tile'], [8, 2, 12, 7, 'tile'], [14, 2, 18, 7, 'tile'], [20, 2, 23, 7, 'tile'], [2, 9, 23, 13, 'tile']], [[4, 8], [9, 8], [16, 8], [21, 8]]),
      ],
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The kitchen: the cold room and the stores, the cookers, the preparation and diet counters, the sample freezer, the hygiene station by the door.
        o('dtColdRoom', 2, 2), o('foodStorage', 3, 2), o('foodStorage', 4, 2), o('bulkCooker', 6, 2), o('bulkCooker', 8, 2), o('prepCounter', 11, 2), o('prepCounter', 13, 2), o('dtSampleFridge', 15, 2),
        o('hygieneStation', 16, 6, 'left'),
        // The tray line and the carts.
        o('servingLine', 6, 5), o('servingLine', 8, 5), o('hdMealCart', 11, 6), o('hdMealCart', 12, 6),
        // The dish room.
        o('dtDishwasher', 19, 2), o('dtTrayReturn', 22, 2),
        // The office: the diet-order and menu desks, the files.
        o('menuDesk', 2, 9), o('menuDesk', 4, 9), o('archiveShelf', 7, 9),
        // The hall: the ward lift, the stairs.
        o('nsElevator', 10, 9), o('stairs', 12, 9, 'right'), o('plant', 16, 13),
        // The counselling room: the dietitian's desk, the patients' seats; the restroom.
        o('officeDesk', 19, 9), o('drWaitSeat', 19, 12, 'up'), o('drWaitSeat', 20, 12, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
        // Upstairs, the ward. Three rooms of two beds.
        up('hospitalBed', 3, 2), up('nsIvPole', 4, 2), up('hospitalBed', 5, 2),
        up('hospitalBed', 8, 2), up('drBedsideMonitor', 9, 2), up('hospitalBed', 11, 2), up('nsIvPole', 12, 2),
        up('hospitalBed', 14, 2), up('drBedsideMonitor', 15, 2), up('hospitalBed', 17, 2), up('nsIvPole', 18, 2),
        // The ward pantry: the carts waiting, the counter.
        up('hdMealCart', 20, 2), up('hdMealCart', 21, 2), up('prepCounter', 22, 2),
        // The lift, the nurses' station, the families' sofa.
        up('nsElevator', 10, 9), up('nsNurseStation', 4, 11, 'up'), up('medStation', 8, 12), up('nsHandSink', 2, 13, 'up'), up('sofa', 19, 13, 'up'), up('salWaterCooler', 23, 9),
      ],
      coworkers: crew(['고영양 영양부장', '한치료 임상영양사', '문조리 조리장'], ['#558b2f', '#9ccc65', '#fafafa']),
      // Outpatients sent for diet counselling.
      clients: [{ noun: '외래 영양상담 환자', socials: ['nutritionTalk'], spots: [[19, 11], [20, 11]], max: 1, every: 60, patience: 120 }],
      alarm: { notice: '🧾 수술 환자의 식이 처방이 급히 바뀌었어요! 배식 전에 배식차 트레이를 바꾸세요', done: '🍱 바뀐 식이대로 제때 올라갔어요! 성과가 크게 올라요', missed: '⌛ 늦어서 예전 식사가 병동에 올라갔어요 (성과 감소)', interaction: 'dtSwapTray', every: [180, 300], window: 40 },
      tasks: [task('diet', '치료식 조리 점검', ['checkCooking'], 2), task('trays', '트레이 세팅·배식 관리', ['superviseServing']), task('menu', '치료식 식단 짜기', ['planMenu'])],
      extra: [
        task('nutrition', '영양 계산', ['calcNutrition']), task('stock', '식재료 검수', ['checkInventory']), task('sample', '보존식 보관', ['dtKeepSample']), task('wash', '식판 세척 점검', ['dtWashCheck', 'dtPlateWaste']),
        task('hygiene', '위생 점검', ['hygieneCheck']), task('prep', '치료식 재료 손질', ['prepIngredients']), task('ward', '병동 환자 기록 확인', ['nsNursingNotes', 'writeChart']), task('clients', '외래 영양상담', ['nutritionTalk']), boss('영양부장님께 보고'),
      ],
      work: [
        'checkCooking', 'superviseServing', 'planMenu', 'calcNutrition', 'checkInventory', 'dtKeepSample', 'dtWashCheck', 'dtPlateWaste', 'hygieneCheck', 'prepIngredients', 'nsNursingNotes', 'writeChart',
        'nutritionTalk', 'dtSwapTray', 'dietitian_therapeuticDiet', 'dietitian_mealBudget',
      ],
      skill: 'cooking',
      floors: { tile: 'creamTile', carpet: 'sageCarpet', wood: 'oakWood' },
      wall: 'creamPlain',
    },
  },
  vet: {
    // The 야생동물 수의사 branch at a province's wildlife rescue centre (2026-11-04, the branch lots). A hurt animal is handed in at the
    // reception, where the centre's education panels are; behind it the surgery, the treatment and X-ray room, the ward of cages for
    // birds and mammals, the food preparation room and the post-mortem and lab room. A corridor runs from the reception to the back
    // door and the yard, where the animals get well away from people: the long netted flight cage where a mended owl or hawk flies before
    // it's let go, the pens for deer and raccoon dogs, the waterbirds' pond. The rescue van waits out front.
    1: {
      careerId: 'vet',
      name: '한빛도 야생동물구조센터',
      icon: '🦉',
      tiles: () =>
        patch(
          building(
            [[2, 6, 4, 9, 'tile'], [6, 6, 10, 9, 'tile'], [12, 6, 12, 9, 'tile'], [14, 6, 17, 9, 'tile'], [19, 6, 20, 9, 'tile'], [22, 6, 23, 9, 'tile'], [2, 11, 16, 13, 'carpet'], [18, 11, 23, 13, 'wood']],
            [[5, 7], [3, 10], [8, 10], [12, 10], [15, 10], [19, 10], [21, 9], [17, 12], [12, 14]],
          ),
          [
            // The yard behind, its pond; the back wall and door.
            ...[1, 2, 3, 4].flatMap((y) => row(0, 25, y, 'grass')),
            ...[1, 2, 3].flatMap((y) => row(21, 23, y, 'water')),
            [12, 5, 'door'],
            // The restroom off the staff room.
            [22, 11, 'wall'], [23, 11, 'wall'], [21, 12, 'wall'], [21, 13, 'door'],
          ],
        ),
      restrooms: [[22, 12, 23, 13]],
      objects: [
        // The yard: the flight cage, the pens.
        o('wrFlightCage', 1, 1), o('wrPen', 13, 1), o('wrPen', 17, 1),
        // The surgery.
        o('medCabinet', 4, 9, 'up'), o('vetSurgeryTable', 2, 7),
        // Treatment and X-ray: the table, the X-ray table, the scale, the computer.
        o('vetTable', 7, 6), o('vtXrayTable', 9, 6), o('vtScale', 6, 9, 'right'), o('medStation', 10, 9, 'left'),
        // The ward: cages for birds and mammals.
        o('kennel', 14, 6), o('kennel', 15, 6), o('kennel', 16, 6), o('kennel', 17, 6), o('kennel', 14, 9, 'up'), o('kennel', 17, 9, 'up'),
        // Food preparation.
        o('fridge', 19, 6), o('prepCounter', 20, 6, 'left'),
        // Post-mortem and the lab.
        o('microscopeBench', 22, 6), o('sampleFridge', 23, 6), o('ltBioBin', 23, 9, 'left'),
        // The reception: the education panel, the citizens' seats, the desk.
        o('ecoStreamDisplay', 2, 13, 'up'), o('drWaitSeat', 6, 13, 'up'), o('drWaitSeat', 7, 13, 'up'), o('drWaitSeat', 9, 13, 'up'), o('drWaitSeat', 10, 13, 'up'), o('officeDesk', 14, 13, 'up'), o('plant', 16, 13),
        // The staff room; the restroom.
        o('coffeeMaker', 18, 11), o('fridge', 21, 11, 'left'), o('sofa', 18, 13, 'up'),
        o('toilet', 23, 12, 'left'), o('sink', 23, 13, 'left'),
        // The rescue van.
        o('wrRescueVan', 14, 15),
      ],
      coworkers: crew(['조야생 진료팀장', '남재활 재활관리사', '한구조 수의사'], ['#558b2f', '#7cb342', '#aed581']),
      // Citizens who bring in a hurt animal they found.
      clients: [{ noun: '구조 신고 시민', socials: ['examinePet', 'adviseOwner'], spots: [[6, 12], [9, 12], [10, 12]], max: 2, every: 60, patience: 120, pets: ['🦉', '🦅', '🦝', '🕊️', '🐢'] }],
      alarm: { notice: '🚨 도로에서 고라니가 다쳤다는 신고예요! 구조 차량으로 출동하세요', done: '🚐 고라니를 구조해 센터로 데려왔어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 다른 기관이 데려갔어요 (성과 감소)', interaction: 'wrRescueRun', every: [200, 320], window: 40 },
      tasks: [task('ward', '입원 동물 돌보기', ['feedAnimals'], 2), task('rehab', '맹금류 재활 훈련', ['wrFlightTrain']), task('treat', '구조 동물 처치', ['disinfectTable', 'vtTakeXray'])],
      extra: [
        task('food', '먹이 준비', ['prepIngredients']), task('surgery', '수술', ['performSurgery']), task('lab', '임상병리 검사', ['examineSlides']), task('chart', '진료 기록', ['writeChart']), task('weigh', '체중 재기', ['vtWeighPet']),
        task('meds', '약품 챙기기', ['prepareMeds', 'restockSupplies']), task('citizens', '구조 신고 시민 응대', ['examinePet', 'adviseOwner']), boss('진료팀장님께 보고'),
      ],
      work: [
        'feedAnimals', 'wrFlightTrain', 'disinfectTable', 'vtTakeXray', 'prepIngredients', 'performSurgery', 'examineSlides', 'writeChart', 'reviewLabs', 'vtWeighPet', 'prepareMeds', 'restockSupplies', 'organizeSamples',
        'examinePet', 'adviseOwner', 'wrRescueRun', 'vet_wildRehab', 'vet_clinicBudget',
      ],
      skill: 'logic',
      floors: { tile: 'aquaTile', carpet: 'sageCarpet', wood: 'oakWood' },
      wall: 'creamPlain',
    },
  },
  coastGuard: {
    // The 경비함정 branch at the coast guard's own pier (2026-11-04, the branch lots), laid out as the seafarer's lot: the patrol ship
    // fills the water side, her bow to the west. On deck the bitts at her rails; the bridge house amidships with the helm console along
    // its windows, the radar, the VHF desk, the chart table and the bell, where the watch plots the course and repeats the orders; aft
    // the fast boat on its davit and the rescue gear. The gangway comes down to the pier, where the duty ship (09:00 to 09:00) keeps the
    // pier's watch from the building ashore: the duty room with the board of the ships and the access desk, the store of rescue and
    // dive gear, the crew's room and the restroom.
    1: {
      careerId: 'coastGuard',
      name: '해경 전용부두 · 3012함',
      icon: '🚢',
      tiles: () =>
        patch(
          building([[2, 11, 10, 13, 'carpet'], [12, 11, 16, 13, 'tile'], [18, 11, 23, 13, 'wood']], [[11, 12], [17, 12], [6, 10], [14, 10], [21, 12], [12, 14]]),
          [
            // The water, the deck over it, the pier.
            ...Array.from({ length: 26 * 10 }, (_, i): [number, number, Tile] => {
              const x = i % 26;
              const y = Math.floor(i / 26);
              // The deck narrows to the bow at the west.
              const deck = y >= 1 && y <= 6 && x <= 24 && x >= [0, 3, 2, 1, 1, 2, 3][y];
              return [x, y, deck || y >= 8 || (x === 10 && y === 7) ? 'grass' : 'water'];
            }),
            // The bridge house on the deck.
            ...row(7, 16, 1, 'wall'), ...row(7, 16, 5, 'wall'), ...col(7, 2, 4, 'wall'), ...col(16, 2, 4, 'wall'), ...[2, 3, 4].flatMap((y) => row(8, 15, y, 'tile')),
            [16, 3, 'door'],
            // The shore building's north wall, its doors to the pier; the restroom.
            ...row(1, 24, 10, 'wall'), [6, 10, 'door'], [14, 10, 'door'],
            [21, 11, 'wall'], [22, 11, 'wall'], [23, 11, 'wall'], [21, 13, 'wall'],
          ],
        ),
      restrooms: [[22, 12, 23, 13]],
      ground: [[3, 1, 24, 1, 'deckSteel'], [2, 2, 24, 2, 'deckSteel'], [1, 3, 24, 4, 'deckSteel'], [2, 5, 24, 5, 'deckSteel'], [3, 6, 24, 6, 'deckSteel'], [10, 7, 10, 7, 'deckSteel'], [0, 8, 25, 9, 'quayConcrete']],
      objects: [
        // The ship: her hull; the bitts at her rails.
        o('cgPatrolHull', 3, 1), o('sfMooringBitt', 4, 6, 'up'), o('sfMooringBitt', 19, 6, 'up'), o('sfMooringBitt', 24, 6, 'up'),
        // The bridge: the radar, the helm console, the VHF desk, the bell, the chart table.
        o('radarConsole', 8, 2), o('sfHelmConsole', 9, 2), o('cgVhfDesk', 13, 2), o('sfShipBell', 15, 2), o('chartTable', 10, 4, 'up'),
        // Aft: the fast boat on its davit, the rescue gear, the dive gear.
        o('cgRhibDavit', 20, 2), o('rescueGear', 18, 1), o('cgDiveRack', 23, 1),
        // The gangway at the pier; the pier's edge.
        o('sfGangway', 11, 8), o('hbQuayEdge', 0, 8),
        // Ashore: the duty room (the whiteboard, the board of the ships, the access desk); the store; the crew's room and restroom.
        o('whiteboard', 2, 11), o('cgSeaMap', 8, 11), o('officeDesk', 5, 13, 'up'),
        o('rescueGear', 12, 11), o('rescueGear', 13, 11), o('cgWetsuitRack', 15, 11),
        o('coffeeMaker', 18, 11), o('fridge', 20, 11), o('sofa', 18, 13, 'up'),
        o('toilet', 23, 13, 'left'), o('sink', 23, 12, 'left'),
      ],
      coworkers: crew(['한경비 함장', '오항해 부장', '진갑판 경사'], ['#0d47a1', '#1565c0', '#455a64']),
      alarm: { notice: '🚤 불법 조업 어선 무리가 나타났어요! 고속단정으로 단속 나가세요', done: '🚤 불법 어선을 나포하고 돌아왔어요! 성과가 크게 올라요', missed: '⌛ 출동이 늦어 어선들이 달아났어요 (성과 감소)', interaction: 'cgIntercept', every: [200, 320], window: 30 },
      tasks: [task('watch', '함교 항해 당직', ['sfStandWatch', 'monitorRadar'], 2), task('radio', 'VHF 무선 당직', ['cgVhfWatch', 'cgVhfCall']), task('mooring', '계류·현문 당직', ['sfTieKnot', 'boardShip'])],
      extra: [
        task('chart', '항로 계획', ['plotCourse']), task('sector', '경비 해역 브리핑', ['cgSectorBrief', 'cgMarkVessel']), task('gear', '구조·잠수 장비 점검', ['checkRescueGear', 'cgGearUp', 'cgRegCheck']), task('wetsuit', '잠수복 정리', ['cgRinseSuit']),
        task('bell', '당직 교대 타종', ['sfRingBell']), task('log', '당직 일지 쓰기', ['writeReport']), task('meeting', '부두 당직 회의', ['attendMeeting']), boss('함장님께 보고'),
      ],
      work: [
        'sfStandWatch', 'monitorRadar', 'cgVhfWatch', 'cgVhfCall', 'sfTieKnot', 'boardShip', 'plotCourse', 'cgSectorBrief', 'cgMarkVessel', 'checkRescueGear', 'cgGearUp', 'cgRegCheck', 'cgRinseSuit', 'sfRingBell',
        'writeReport', 'attendMeeting', 'cgIntercept', 'coastGuard_plotCourse', 'coastGuard_commandDrill',
      ],
      skill: 'fitness',
      floors: { tile: 'monoTile', carpet: 'slateStone', wood: 'oakWood' },
      wall: 'navyWainscot',
    },
  },
};
