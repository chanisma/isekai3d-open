import { getDef } from '../game/catalog';
import { Game } from '../game/game';
import type { LotPlan, RoomSpec } from '../game/lots';
import type { Dir, DwellerSpec } from '../game/types';

/**
 * The motion lab's house (src/ui/MotionLab.tsx; ours, a tool for while the 3D is being made): one
 * of each kind of furniture a household uses, in a bedroom, a bathroom, a kitchen and a long living
 * room, so every way a dweller meets furniture (lying, sitting, standing at a counter, at a desk…) can
 * be tried in turn. Two grown-ups, a woman and a man, so both VRoid characters show.
 */
const o = (defId: string, x: number, y: number, dir: Dir = 'down') => ({ defId, x, y, dir });
const room = (x0: number, y0: number, x1: number, y1: number, tile: RoomSpec['tile'], floor: string, wall: string): RoomSpec => ({ x0, y0, x1, y1, tile, floor, wall });

export const LAB_PLAN: LotPlan = {
  id: 'motionLab',
  name: '동작 실험실',
  desc: '가구마다 캐릭터의 동작을 하나씩 확인하는 집 (개발용)',
  shell: [1, 1, 24, 14],
  rooms: [
    room(2, 2, 9, 7, 'carpet', 'lilacCarpet', 'lavenderStripes'),
    room(11, 2, 15, 7, 'tile', 'aquaTile', 'aquaTiles'),
    room(17, 2, 23, 7, 'tile', 'creamTile', 'creamPlain'),
    room(2, 9, 23, 13, 'wood', 'oakWood', 'oakWainscot'),
  ],
  doors: [
    { x: 5, y: 8 },
    { x: 12, y: 8 },
    { x: 21, y: 8 },
    { x: 12, y: 14 },
  ],
  frontDoor: { x: 12, y: 14 },
  streetY: 16,
  windows: [
    { x: 3, y: 1 },
    { x: 7, y: 1 },
    { x: 13, y: 1 },
    { x: 20, y: 1 },
    { x: 4, y: 14 },
    { x: 18, y: 14 },
  ],
  objects: [
    // Bedroom
    o('bed', 2, 2),
    o('doubleBed', 4, 2),
    o('mirror', 7, 2),
    o('bookshelf', 8, 2),
    o('lamp', 9, 2),
    o('armchair', 9, 6, 'left'),
    o('clothesCabinet', 2, 5, 'right'),
    // A baby's bassinet; a toddler's bed and toys.
    o('bassinet', 6, 2),
    o('toddlerBed', 3, 2),
    o('toyBox', 5, 6, 'up'),
    // Bathroom
    o('toilet', 11, 2),
    o('sink', 12, 2),
    o('shower', 13, 2),
    o('bathtub', 15, 2),
    o('pottyChair', 11, 6, 'up'),
    // Kitchen
    o('fridge', 17, 2),
    o('stove', 18, 2),
    o('kitchenSink', 19, 2),
    o('prepCounter', 20, 2),
    o('coffeeMaker', 23, 2),
    o('diningTable', 20, 5),
    o('diningChair', 20, 4),
    o('diningChair', 21, 4),
    o('diningChair', 20, 6, 'up'),
    o('diningChair', 21, 6, 'up'),
    o('highChair', 22, 5, 'down'),
    // Living room, along the back wall…
    o('tv', 3, 9),
    o('computer', 6, 9),
    o('studyDesk', 8, 9),
    o('piano', 10, 9),
    o('easel', 13, 9),
    o('guitar', 15, 9),
    o('stereo', 17, 9),
    o('aquarium', 18, 9),
    o('telescope', 23, 9),
    // …and the front.
    o('sofa', 3, 13, 'up'),
    o('armchair', 6, 13, 'up'),
    o('camera', 10, 13, 'up'),
    o('chessTable', 15, 12),
    o('treadmill', 21, 12),
    o('plant', 2, 9),
    o('lamp', 23, 13),
    // The cleaning tools, the floor in front of each kept clear to work on.
    o('vacuumCleaner', 8, 13, 'up'),
    o('broomSet', 17, 13, 'up'),
    o('mopBucket', 19, 13, 'up'),
    o('cleaningCart', 14, 9),
  ],
  extraBeds: [],
  start: [
    { x: 11, y: 11 },
    { x: 13, y: 11 },
  ],
  kind: '단독주택',
  traits: [],
  value: 0,
};

/** What the lab's house leaves out: the better versions, and the things too big for it, row by row in one long room. */
const MORE = ['deluxeBed', 'deluxeDoubleBed', 'fireplace', 'deluxeFridge', 'deluxeStove', 'bar', 'grill', 'bigTv', 'gamingComputer', 'karaoke', 'djBooth', 'violin', 'planter', 'woodworkingTable', 'homeToolBench', 'microscope', 'anatomyModel', 'chemistrySet', 'drivingSim', 'planningBoard', 'businessBoardGame', 'toyBox', 'monkeyBars', 'pond', 'pool', 'rocketShip', 'mailbox', 'paintingLandscape', 'urn'];
function morePlan(): LotPlan {
  const objects: LotPlan['objects'] = [];
  let x = 2;
  let y = 2;
  let row = 1;
  for (const id of MORE) {
    const d = getDef(id);
    if (x + d.w > 24) {
      x = 2;
      y += row + 1;
      row = 1;
    }
    objects.push(o(id, x, y));
    x += d.w + 1;
    row = Math.max(row, d.h);
  }
  return { ...LAB_PLAN, id: 'motionLabMore', name: '동작 실험실 2', rooms: [room(2, 2, 23, 13, 'wood', 'oakWood', 'oakWainscot')], doors: [{ x: 12, y: 14 }], objects, start: [{ x: 22, y: 13 }, { x: 23, y: 13 }] };
}

const SPECS: DwellerSpec[] = [
  { name: '서연', gender: 'female', shirt: '#f48fb1', skin: '#f6d7c3', hair: '#5d4037', hairStyle: 'long', outfit: 'dress' },
  { name: '민준', gender: 'male', shirt: '#64b5f6', skin: '#eac0a2', hair: '#3e2723' },
  // A toddler (made a toddler below), for the toddler bed, the high chair, the potty and the toys.
  { name: '하린', gender: 'female', shirt: '#ffcc80', skin: '#f6d7c3', hair: '#5d4037', hairStyle: 'twintails', outfit: 'dress' },
  // A baby (made one below), for the bassinet.
  { name: '도윤', gender: 'male', shirt: '#a5d6a7', skin: '#f6d7c3', hair: '#5d4037' },
];

/**
 * A fresh lab on a lot: 'lab' (the house above), 'home:<plan id>' (one of the homes, upstairs and
 * all) or 'work:<career id>' (a workplace with its staff, the visitor standing in for the worker).
 * 'more' is the rest of what a home can have (MORE). Nobody ages, there's money, and nothing happens on its own.
 */
export function labGame(lot = 'lab'): Game {
  const [kind, id] = lot.split(':');
  const g = kind === 'work' ? Game.workplaceTour(id) : Game.create(SPECS, Math.random, 'off', kind === 'home' ? id : kind === 'more' ? morePlan() : LAB_PLAN);
  g.state.freeWill = false;
  g.stagesOpen = true;
  g.state.money = 1_000_000;
  const toddler = g.state.dwellers.find((s) => s.name === '하린' && !s.npc);
  if (toddler) Object.assign(toddler, { age: 'toddler', bornAt: g.state.time });
  const baby = g.state.dwellers.find((s) => s.name === '도윤' && !s.npc);
  const cradle = g.state.objects.find((b) => b.defId === 'bassinet');
  if (baby) Object.assign(baby, { age: 'baby', bornAt: g.state.time }, cradle ? { x: cradle.x, y: cradle.y, bassinetUid: cradle.uid } : {});
  // Midday at home, for daylight (a workplace keeps its working hours).
  if (kind !== 'work') g.state.time = Math.floor(g.state.time / 1440) * 1440 + 12 * 60;
  return g;
}

/**
 * Keeps the lab still: needs held halfway (so nothing urgent comes up, and what fills a need runs
 * on instead of stopping when it's full), food on the table, the money topped up.
 */
export function holdLab(g: Game) {
  for (const s of g.state.dwellers) for (const k of Object.keys(s.needs) as Array<keyof typeof s.needs>) s.needs[k] = 60;
  if (g.servingsLeft() < 4) (g.state.food ??= []).push({ servings: 6, madeAt: g.state.time, cookId: 1, quality: 2 });
  if (g.state.money < 100_000) g.state.money = 1_000_000;
}
