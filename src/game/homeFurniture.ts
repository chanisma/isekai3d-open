import type { BuyFn, BuyRoom } from './buyCategories';
import type { InteractionDef, ObjectDef } from './types';

/**
 * More to buy for the house (2026-11-01, at the user's request: what a dweller likes had little to go with
 * it): pieces first made for workplaces, looked over one by one so that nobody else appears in using them
 * (no drawn or VRoid helper in their builders), no job's signs on them, and fit for a home, under a home's
 * name and words for what's done with them. Each is its own def `home_<id>`, drawn as the work piece
 * (`lookOf`, furniture3d.ts) and keeping the interaction's id, so the hands and the motions are the same.
 */
interface HomePiece {
  of: string;
  name: string;
  price: number;
  fn: BuyFn;
  rooms: BuyRoom[];
  /** The work piece's interaction, what it's called at home, and the liked activity it counts as (preferences.ts). */
  does: Array<[id: string, label: string, activity: string]>;
}

const P = (of: string, name: string, price: number, fn: BuyFn, rooms: BuyRoom[], ...does: HomePiece['does']): HomePiece => ({ of, name, price, fn, rooms, does });

export const HOME_PIECES: HomePiece[] = [
  // 운동
  P('pullUpBar', '철봉', 280, 'activity', ['living', 'outdoor'], ['doPullUps', '턱걸이하기', 'fitness']),
  P('weightRack', '웨이트 랙', 720, 'activity', ['living', 'outdoor'], ['liftWeights', '웨이트 트레이닝', 'fitness']),
  P('activityMat', '운동 매트', 140, 'activity', ['living', 'kids'], ['leadActivity', '매트 운동하기', 'fitness']),
  P('dnStretchCorner', '스트레칭 코너', 320, 'activity', ['living', 'bedroom'], ['dnFoamRoll', '폼롤러로 몸 풀기', 'fitness']),
  P('sparringMat', '호신술 매트', 260, 'activity', ['living', 'outdoor'], ['practiceDefense', '호신술 연습하기', 'fitness']),
  P('pingpongTable', '탁구대', 640, 'fun', ['living', 'outdoor'], ['playPingPong', '탁구 연습하기', 'fitness']),
  // 춤
  P('danceMirror', '연습용 전신 거울', 480, 'activity', ['living', 'bedroom'], ['practiceChoreo', '안무 연습하기', 'dancing']),
  P('balletBarre', '발레 바', 360, 'activity', ['living', 'bedroom'], ['stretchRoutine', '발레 스트레칭하기', 'dancing']),
  // 그림
  P('sketchTable', '스케치 테이블', 320, 'activity', ['study', 'bedroom'], ['sketch', '스케치하기', 'painting']),
  P('studioEasel', '큰 이젤', 420, 'activity', ['study', 'living'], ['paintCommission', '큰 그림 그리기', 'painting']),
  P('pntStillLife', '정물대', 130, 'activity', ['study', 'living'], ['pntArrangeStillLife', '정물 꾸미기', 'painting']),
  P('pntPaintCart', '물감 카트', 190, 'activity', ['study'], ['pntMixPaint', '물감 섞어 보기', 'painting']),
  // 글·공부·과학
  P('writingDesk', '집필 책상', 460, 'surface', ['study', 'bedroom'], ['writeManuscript', '원고 쓰기', 'writing']),
  P('plotDesk', '구상 책상', 320, 'surface', ['study'], ['writePlot', '이야기 구상하기', 'writing']),
  P('libBookCart', '북트럭', 210, 'storage', ['study', 'living'], ['libSortReturns', '책 정리하기', 'reading']),
  P('formulaBoard', '수식 칠판', 280, 'activity', ['study', 'kids'], ['deriveFormula', '칠판에 수식 풀어 보기', 'science']),
  P('researchDesk', '연구용 책상', 420, 'surface', ['study'], ['writePaper', '연구 노트 쓰기', 'science']),
  // 사진·방송
  P('studioCamera', '삼각대 카메라', 520, 'electronics', ['study', 'living'], ['shootProducts', '소품 사진 찍기', 'photography']),
  P('selfieWall', '포토월', 240, 'decor', ['bedroom', 'living'], ['selfieShoot', '셀카 찍기', 'photography']),
  P('photoEditStation', '사진 보정 컴퓨터', 780, 'electronics', ['study'], ['editPhotos', '사진 보정하기', 'photography']),
  P('streamingSetup', '방송 장비', 860, 'electronics', ['bedroom', 'study'], ['liveStream', '라이브 방송하기', 'onlineChat']),
  P('contentDesk', '콘텐츠 책상', 340, 'surface', ['study', 'bedroom'], ['planContent', '콘텐츠 기획하기', 'onlineChat']),
  // 무대·꾸미기
  P('scriptTable', '대본 테이블', 300, 'surface', ['living', 'study'], ['readScript', '대본 읽기', 'comedy']),
  P('stCostumeRack', '의상 행거', 210, 'storage', ['bedroom'], ['stPickCostume', '재미있는 옷 골라 보기', 'comedy']),
  P('makeupMirror', '조명 거울', 300, 'decor', ['bedroom', 'bathroom'], ['practiceExpressions', '거울 보며 표정 연습하기', 'comedy']),
  P('sgDressingTable', '화장대', 460, 'surface', ['bedroom'], ['sgStagePrep', '화장하고 꾸미기', 'resting']),
  P('mannequin', '의상 마네킹', 240, 'decor', ['bedroom', 'study'], ['dressMannequin', '마네킹 옷 입히기', 'artViewing']),
  // 쉬기·마시기
  P('bdAnmagi', '안마의자', 1180, 'comfort', ['living', 'bedroom'], ['bdRestAnma', '안마의자에서 쉬기', 'resting']),
  P('hsTeaTable', '작은 티 테이블', 200, 'surface', ['living', 'bedroom'], ['hsServeTea', '차 한잔 내리기', 'resting']),
  P('estTeaTable', '다기 테이블', 260, 'surface', ['living'], ['estBrewTea', '천천히 차 우리기', 'resting']),
  P('txVending', '커피 자판기', 620, 'appliance', ['kitchen', 'living'], ['txVendCoffee', '자판기 커피 뽑기', 'resting']),
  P('critWineTrolley', '와인 카트', 380, 'surface', ['kitchen', 'living'], ['critDecantWine', '와인 디캔팅하기', 'mixology']),
  // 음악·식물·정리
  P('recordCrate', '레코드 상자', 170, 'storage', ['living', 'study'], ['digRecords', '음반 고르기', 'music']),
  P('rarePlantCase', '식물 진열장', 390, 'decor', ['living', 'study'], ['studySpecimens', '식물 관찰하기', 'gardening']),
  P('ccCubbies', '신발장', 190, 'storage', ['living', 'kids'], ['ccTidyCubbies', '신발 정리하기', 'cleaning']),
  P('estChangingScreen', '옷 가림막', 170, 'decor', ['bedroom', 'bathroom'], ['estFoldGowns', '옷 개어 놓기', 'cleaning']),
];

/** Done at home it teaches nothing: folding clothes isn't handiness, whatever it was as a spa's work. */
const NO_SKILL = new Set(['estFoldGowns']);

export const homeId = (of: string) => `home_${of}`;

/** The home defs of `HOME_PIECES`, from the work pieces they're drawn as. */
export function homeFromWork(byId: (id: string) => ObjectDef | undefined): ObjectDef[] {
  return HOME_PIECES.flatMap((p) => {
    const work = byId(p.of);
    if (!work) return [];
    const interactions = p.does.flatMap(([id, label]): InteractionDef[] => {
      const inter = work.interactions.find((i) => i.id === id);
      if (!inter) return [];
      const { requires: _atWork, skill, ...own } = inter;
      return [{ ...own, label, ...(skill && !NO_SKILL.has(id) ? { skill } : {}) }];
    });
    return [{ ...work, id: homeId(p.of), name: p.name, price: p.price, unlisted: false, interactions, lookOf: p.of }];
  });
}

/** Which liked activity each interaction of `HOME_PIECES` is (preferences.ts `ACTIVITIES`). */
export const HOME_ACTIVITY: Record<string, string> = Object.fromEntries(HOME_PIECES.flatMap((p) => p.does.map(([id, , activity]) => [id, activity])));

/** The cleaning tools (ours): what's done with them clears the house's mess (Game: `cleanHouse`). */
const TIDY: Pick<InteractionDef, 'effects' | 'special' | 'pose' | 'autonomous'> = { effects: { fun: -0.04, hygiene: -0.03 }, special: 'cleanHouse', pose: 'front', autonomous: false };
export const CLEANING_TOOLS: ObjectDef[] = [
  { id: 'broomSet', name: '빗자루 세트', price: 45, w: 1, h: 1, icon: '🧹', color: '#c9a77c', category: 'decor', interactions: [{ id: 'sweepFloor', label: '바닥 쓸기', icon: '🧹', duration: 20, ...TIDY }] },
  { id: 'mopBucket', name: '대걸레와 양동이', price: 80, w: 1, h: 1, icon: '🧹', color: '#42a5f5', category: 'decor', interactions: [{ id: 'mopFloor', label: '걸레질하기', icon: '🧹', duration: 25, ...TIDY, utility: { water: 0.02 } }] },
  { id: 'vacuumCleaner', name: '진공청소기', price: 260, w: 1, h: 1, icon: '🌀', color: '#ef5350', category: 'decor', interactions: [{ id: 'vacuumFloor', label: '청소기 돌리기', icon: '🌀', duration: 15, ...TIDY, utility: { power: 0.03 } }] },
  { id: 'cleaningCart', name: '청소 도구함', price: 190, w: 1, h: 1, icon: '🧴', color: '#26a69a', category: 'decor', interactions: [{ id: 'tidyRoom', label: '구석구석 청소하기', icon: '🧽', duration: 30, ...TIDY }] },
];
/** Rugs (2026-11-01, at the user's request): in the build tab, drawn by view3d/rugs.ts through `lookOf` by weave. */
const rug = (id: string, name: string, price: number, w: number, h: number, color: string, look: string): ObjectDef => ({ id, name, price, w, h, icon: '🧺', color, category: 'decor', interactions: [], walkable: true, flat: true, lookOf: look });
const WEAVES: ObjectDef[] = ['rugWool', 'rugStriped', 'rugRound', 'rugPersian', 'rugRunner', 'rugBath', 'rugPlay'].map((id) => ({ id, name: id, price: 0, w: 1, h: 1, icon: '🧺', color: '#c9a77c', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true }));
export const RUGS: ObjectDef[] = [
  rug('rugWoolCream', '크림색 양모 러그', 180, 2, 2, '#e8dcc4', 'rugWool'),
  rug('rugWoolGrey', '회색 양모 러그', 240, 3, 2, '#9aa3ab', 'rugWool'),
  rug('rugWoolNavy', '남색 큰 러그', 360, 3, 3, '#34507c', 'rugWool'),
  rug('rugStripedBlue', '파란 줄무늬 러그', 200, 3, 2, '#5b8db8', 'rugStriped'),
  rug('rugStripedRed', '붉은 줄무늬 러그', 200, 2, 2, '#c0615a', 'rugStriped'),
  rug('rugRoundSage', '세이지색 둥근 러그', 220, 2, 2, '#9cb59a', 'rugRound'),
  rug('rugRoundPink', '분홍 둥근 러그', 220, 2, 2, '#e8a7b8', 'rugRound'),
  rug('rugRoundBig', '큰 둥근 러그', 340, 3, 3, '#c9a77c', 'rugRound'),
  rug('rugPersianRed', '붉은 무늬 카펫', 620, 3, 2, '#8e2f2f', 'rugPersian'),
  rug('rugPersianBlue', '푸른 무늬 카펫', 820, 3, 3, '#2c4a78', 'rugPersian'),
  rug('rugRunnerGreen', '초록 복도 러너', 150, 1, 3, '#55806a', 'rugRunner'),
  rug('rugRunnerTan', '베이지 복도 러너', 130, 1, 2, '#c9b08a', 'rugRunner'),
  rug('rugBathAqua', '욕실 매트', 40, 1, 1, '#9fd8d6', 'rugBath'),
  rug('rugBathWhite', '하얀 발 매트', 40, 1, 1, '#f3f1ea', 'rugBath'),
  rug('rugPlaymat', '놀이 매트', 170, 2, 2, '#fafafa', 'rugPlay'),
];
export const ALL_RUG_DEFS = [...WEAVES, ...RUGS];

export const CLEANING_IDS = ['broomSet', 'mopBucket', 'vacuumCleaner', 'cleaningCart'];
export const CLEANING_ACTS = ['sweepFloor', 'mopFloor', 'vacuumFloor', 'tidyRoom'];

/** Where they show in the buy catalog (buyCategories.ts). */
export const HOME_BUY: Record<string, { fn: BuyFn; rooms: BuyRoom[] }> = {
  ...Object.fromEntries(HOME_PIECES.map((p) => [homeId(p.of), { fn: p.fn, rooms: p.rooms }])),
  broomSet: { fn: 'misc', rooms: ['kitchen', 'bathroom', 'living'] },
  mopBucket: { fn: 'misc', rooms: ['bathroom', 'kitchen'] },
  vacuumCleaner: { fn: 'misc', rooms: ['living', 'bedroom'] },
  cleaningCart: { fn: 'misc', rooms: ['bathroom', 'kitchen', 'living'] },
  ...Object.fromEntries(RUGS.map((r) => [r.id, { fn: 'decor' as const, rooms: (r.lookOf === 'rugBath' ? ['bathroom'] : r.lookOf === 'rugPlay' ? ['kids', 'living'] : r.lookOf === 'rugRunner' ? ['living'] : ['living', 'bedroom', 'study']) as BuyRoom[] }])),
};
