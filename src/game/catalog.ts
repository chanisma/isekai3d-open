import { UPGRADES, UPGRADE_COST, UPGRADE_TIME } from './upgrades';
import type { Category, InteractionDef, ObjectDef } from './types';
import { KOREA_OBJECTS } from './catalogKorea';
import { WORK_FURNITURE } from './workFurniture';
import { ALL_RUG_DEFS, CLEANING_TOOLS, homeFromWork } from './homeFurniture';
import { LEARN } from './constants';

/** While asleep fun and social don't drain (참고 게임 MoodBuff_Hidden_Asleep); the body slows down too. */
const SLEEP_DECAY = { hunger: 0.5, bladder: 0.6, fun: 0, social: 0, hygiene: 0.6 };

/**
 * Eating a serving of cooked food, sitting down (참고 게임 generic_consume_food: dining, living and sofa
 * seating all score 4; attention cost 0.25, so a chat across the table fits on top).
 */
const EAT: InteractionDef = { id: 'eat', label: '식사하기', icon: '🍽️', duration: 30, effects: { hunger: 2.6 }, pose: 'on', requires: 'hasFood', special: 'eat', chatty: true, leavesDish: true };

/** 참고 게임 birthday cake (BirthdayCake_*): made at the fridge, candles blown out to age up, then slices for everyone (price, time and slices ours). */
const BAKE_CAKE: InteractionDef = { id: 'bakeCake', label: '생일 케이크 만들기', icon: '🎂', duration: 40, effects: { fun: 0.2 }, skill: { key: 'cooking', rate: LEARN.chore }, cost: 20, special: 'bakeCake', requires: 'cakeWanted', pose: 'front' };

/** Job education at home for a dweller whose job it is (InteractionDef.withJob): a quarter faster than the basics. */
const JOB_STUDY = LEARN.practice * 1.25;

export const CATALOG: ObjectDef[] = [
  {
    id: 'bed',
    name: '침대',
    price: 300,
    w: 1,
    h: 2,
    icon: '🛏️',
    color: '#90caf9',
    category: 'comfort',
    interactions: [
      { id: 'sleep', label: '잠자기', icon: '💤', duration: 720, untilFull: 'energy', effects: { energy: 0.26 }, decayMul: SLEEP_DECAY, pose: 'on', buffs: [{ id: 'wellRested', chance: 1 }] },
      { id: 'nap', clears: ['dazed', 'scared'], label: '낮잠 자기', icon: '😪', duration: 90, effects: { energy: 0.2 }, decayMul: SLEEP_DECAY, pose: 'on' },
    ],
  },
  {
    id: 'doubleBed',
    name: '더블 침대',
    price: 650,
    w: 2,
    h: 2,
    seats: 2,
    icon: '🛏️',
    color: '#90caf9',
    category: 'comfort',
    interactions: [
      { id: 'sleep', label: '잠자기', icon: '💤', duration: 720, untilFull: 'energy', effects: { energy: 0.26 }, decayMul: SLEEP_DECAY, pose: 'on', buffs: [{ id: 'wellRested', chance: 1 }] },
      { id: 'nap', clears: ['dazed', 'scared'], label: '낮잠 자기', icon: '😪', duration: 90, effects: { energy: 0.2 }, decayMul: SLEEP_DECAY, pose: 'on' },
    ],
  },
  {
    id: 'deluxeBed',
    name: '고급 침대',
    price: 900,
    w: 1,
    h: 2,
    restfulness: 3.5,
    icon: '🛏️',
    color: '#b39ddb',
    category: 'comfort',
    interactions: [
      { id: 'sleep', label: '잠자기', icon: '💤', duration: 720, untilFull: 'energy', effects: { energy: 0.26 }, decayMul: SLEEP_DECAY, pose: 'on', buffs: [{ id: 'wellRested', chance: 1 }] },
      { id: 'nap', clears: ['dazed', 'scared'], label: '낮잠 자기', icon: '😪', duration: 90, effects: { energy: 0.2 }, decayMul: SLEEP_DECAY, pose: 'on' },
    ],
  },
  {
    id: 'deluxeDoubleBed',
    name: '고급 더블 침대',
    price: 1600,
    w: 2,
    h: 2,
    seats: 2,
    restfulness: 4.5,
    icon: '🛏️',
    color: '#b39ddb',
    category: 'comfort',
    interactions: [
      { id: 'sleep', label: '잠자기', icon: '💤', duration: 720, untilFull: 'energy', effects: { energy: 0.26 }, decayMul: SLEEP_DECAY, pose: 'on', buffs: [{ id: 'wellRested', chance: 1 }] },
      { id: 'nap', clears: ['dazed', 'scared'], label: '낮잠 자기', icon: '😪', duration: 90, effects: { energy: 0.2 }, decayMul: SLEEP_DECAY, pose: 'on' },
    ],
  },
  {
    id: 'sofa',
    name: '소파',
    price: 350,
    w: 2,
    h: 1,
    seats: 2,
    icon: '🛋️',
    color: '#a1887f',
    category: 'comfort',
    interactions: [
      { id: 'relax', chatty: true, label: '앉아서 쉬기', icon: '😌', duration: 30, effects: { energy: 0.12, fun: 0.3 }, pose: 'on' },
      { id: 'watchTv', chatty: true, label: 'TV 보기', icon: '📺', duration: 60, effects: { fun: 1.3, energy: 0.05 }, pose: 'on', requires: 'tvNearby', buffs: [{ id: 'comedy', chance: 0.7 }], utility: { power: 0.01 } },
      EAT,
      { id: 'nap', clears: ['dazed'], label: '소파에서 낮잠', icon: '😪', duration: 60, effects: { energy: 0.17 }, decayMul: SLEEP_DECAY, pose: 'on' },
    ],
  },
  {
    id: 'armchair',
    name: '안락의자',
    price: 150,
    w: 1,
    h: 1,
    icon: '🪑',
    color: '#8d6e63',
    category: 'comfort',
    interactions: [
      { id: 'relax', chatty: true, label: '앉아서 쉬기', icon: '😌', duration: 30, effects: { energy: 0.1, fun: 0.25 }, pose: 'on' },
      EAT,
      { id: 'watchTv', chatty: true, label: 'TV 보기', icon: '📺', duration: 60, effects: { fun: 1.2, energy: 0.04 }, pose: 'on', requires: 'tvNearby', buffs: [{ id: 'comedy', chance: 0.7 }], utility: { power: 0.01 } },
    ],
  },
  {
    id: 'fridge',
    name: '냉장고',
    price: 400,
    w: 1,
    h: 1,
    icon: '🧊',
    color: '#eceff1',
    category: 'kitchen',
    cookingQuality: 5.5,
    interactions: [
      { id: 'snack', chatty: true, label: '간식 먹기', icon: '🍪', duration: 12, effects: { hunger: 2.2 }, cost: 5, pose: 'front', utility: { power: 0.02 }, leavesDish: true },
      { id: 'quickMeal', chatty: true, label: '간편식 먹기', icon: '🥪', duration: 30, effects: { hunger: 2.2 }, cost: 12, pose: 'front', utility: { power: 0.02 }, leavesDish: true },
      BAKE_CAKE,
    ],
  },
  {
    id: 'deluxeFridge',
    name: '고급 양문형 냉장고',
    price: 1500,
    w: 2,
    h: 1,
    icon: '🧊',
    color: '#90a4ae',
    category: 'kitchen',
    cookingQuality: 13,
    interactions: [
      { id: 'snack', chatty: true, label: '간식 먹기', icon: '🍪', duration: 12, effects: { hunger: 2.2 }, cost: 5, pose: 'front', utility: { power: 0.02 }, leavesDish: true },
      { id: 'quickMeal', chatty: true, label: '간편식 먹기', icon: '🥪', duration: 30, effects: { hunger: 2.2 }, cost: 12, pose: 'front', utility: { power: 0.02 }, leavesDish: true },
      BAKE_CAKE,
    ],
  },
  {
    id: 'stove',
    name: '가스레인지',
    price: 350,
    w: 1,
    h: 1,
    icon: '🍳',
    color: '#ffab91',
    category: 'kitchen',
    cookingQuality: 5.5,
    interactions: [
      { id: 'cook', label: '요리하기', icon: '🍲', duration: 30, effects: { fun: 0.2 }, advertise: { hunger: 2.6, fun: 0.2 }, serves: 1, skill: { key: 'cooking', rate: LEARN.chore }, cost: 10, pose: 'front', utility: { power: 0.05 } },
      { id: 'cookFamily', label: '가족 식사 만들기', icon: '🍛', duration: 45, effects: { fun: 0.2 }, advertise: { hunger: 2.6, fun: 0.2 }, serves: 4, countAs: 'cook', skill: { key: 'cooking', rate: LEARN.chore }, cost: 40, pose: 'front', utility: { power: 0.05 } },
      // 참고 게임 gourmet recipes (CraftingSkill_07/10, ingredients 13-35): the Gourmet Cooking skill, a better meal.
      { id: 'cookGourmet', label: '고급 요리 만들기', icon: '🍽️', duration: 60, effects: { fun: 0.25 }, advertise: { hunger: 2.6, fun: 0.25 }, serves: 4, countAs: 'cook', skill: { key: 'gourmet', rate: LEARN.chore }, cost: 35, pose: 'front', utility: { power: 0.05 } },
    ],
  },
  {
    id: 'deluxeStove',
    name: '고급 가스레인지',
    price: 1200,
    w: 1,
    h: 1,
    icon: '🍳',
    color: '#ffcc80',
    category: 'kitchen',
    cookingQuality: 11.5,
    interactions: [
      { id: 'cook', label: '요리하기', icon: '🍲', duration: 30, effects: { fun: 0.2 }, advertise: { hunger: 2.6, fun: 0.2 }, serves: 1, skill: { key: 'cooking', rate: LEARN.chore }, cost: 10, pose: 'front', utility: { power: 0.05 } },
      { id: 'cookFamily', label: '가족 식사 만들기', icon: '🍛', duration: 45, effects: { fun: 0.2 }, advertise: { hunger: 2.6, fun: 0.2 }, serves: 4, countAs: 'cook', skill: { key: 'cooking', rate: LEARN.chore }, cost: 40, pose: 'front', utility: { power: 0.05 } },
      // 참고 게임 gourmet recipes (CraftingSkill_07/10, ingredients 13-35): the Gourmet Cooking skill, a better meal.
      { id: 'cookGourmet', label: '고급 요리 만들기', icon: '🍽️', duration: 60, effects: { fun: 0.25 }, advertise: { hunger: 2.6, fun: 0.25 }, serves: 4, countAs: 'cook', skill: { key: 'gourmet', rate: LEARN.chore }, cost: 35, pose: 'front', utility: { power: 0.05 } },
    ],
  },
  {
    id: 'toilet',
    name: '변기',
    price: 200,
    w: 1,
    h: 1,
    icon: '🚽',
    color: '#fafafa',
    category: 'bathroom',
    interactions: [
      { id: 'use', label: '볼일 보기', icon: '🚽', duration: 12, untilFull: 'bladder', effects: { bladder: 10 }, pose: 'on', utility: { water: 0.03 } },
    ],
  },
  {
    id: 'shower',
    name: '샤워기',
    price: 450,
    w: 1,
    h: 1,
    icon: '🚿',
    color: '#80deea',
    category: 'bathroom',
    interactions: [
      { id: 'shower', label: '샤워하기', icon: '🚿', duration: 25, untilFull: 'hygiene', effects: { hygiene: 5, energy: 0.05 }, pose: 'on', buffs: [{ id: 'showerBrisk', chance: 0.5 }, { id: 'showerThought', chance: 0.3 }], utility: { water: 0.05, power: 0.02 } },
      { id: 'showerSteamy', label: '뜨거운 샤워하기', icon: '🔥', duration: 25, untilFull: 'hygiene', effects: { hygiene: 5, energy: 0.05 }, moods: ['flirty'], pose: 'on', buffs: [{ id: 'steamyShower', chance: 1 }], utility: { water: 0.06, power: 0.03 } },
      { id: 'showerThoughtful', label: '생각에 잠겨 샤워하기', icon: '💭', duration: 30, untilFull: 'hygiene', effects: { hygiene: 4.5, energy: 0.05 }, moods: ['focused', 'sad'], pose: 'on', buffs: [{ id: 'showerThought', chance: 1 }], utility: { water: 0.05, power: 0.02 } },
      { id: 'showerBrisk', label: '빠른 샤워하기', icon: '⚡', duration: 15, untilFull: 'hygiene', effects: { hygiene: 6 }, moods: ['energized'], pose: 'on', buffs: [{ id: 'showerBrisk', chance: 1 }], utility: { water: 0.04, power: 0.02 } },
      { id: 'showerCold', label: '찬물 샤워하기', icon: '🧊', duration: 20, untilFull: 'hygiene', effects: { hygiene: 5 }, moods: ['angry', 'flirty'], clears: ['angry', 'flirty'], pose: 'on', utility: { water: 0.05 } },
    ],
  },
  {
    id: 'sink',
    name: '세면대',
    price: 100,
    w: 1,
    h: 1,
    icon: '🚰',
    color: '#b0bec5',
    category: 'bathroom',
    interactions: [{ id: 'wash', label: '손 씻기', icon: '🫧', duration: 4, effects: { hygiene: 3 }, pose: 'front', utility: { water: 0.03 } }],
  },
  {
    id: 'tv',
    name: 'TV',
    price: 500,
    w: 2,
    h: 1,
    icon: '📺',
    color: '#37474f',
    category: 'fun',
    interactions: [
      { id: 'watch', shared: true, chatty: true, label: '서서 TV 보기', icon: '📺', duration: 45, effects: { fun: 1.0, energy: -0.03 }, pose: 'front', range: 3, buffs: [{ id: 'comedy', chance: 0.7 }], utility: { power: 0.01 } },
      // 참고 게임's working out to the TV: fitness for every house, slower than a treadmill.
      { id: 'tvWorkout', label: '운동 채널 따라 하기', icon: '🤸', duration: 30, effects: { fun: 0.3, energy: -0.2, hygiene: -0.2 }, skill: { key: 'fitness', rate: LEARN.light }, countAs: 'workout', pose: 'front', range: 3, utility: { power: 0.01 } },
    ],
  },
  {
    id: 'bigTv',
    name: '대형 평면 TV',
    price: 1600,
    w: 2,
    h: 1,
    icon: '📺',
    color: '#212121',
    category: 'fun',
    // 참고 게임 object_tvSurfaceHIGH2x1_01: Fun x2.24, power x0.44 (vs LOW_01 x1, x1.2).
    funMul: 2.24,
    powerMul: 0.37,
    interactions: [
      { id: 'watch', shared: true, chatty: true, label: '서서 TV 보기', icon: '📺', duration: 45, effects: { fun: 1.0, energy: -0.03 }, pose: 'front', range: 3, buffs: [{ id: 'comedy', chance: 0.7 }], utility: { power: 0.01 } },
      // 참고 게임's working out to the TV: fitness for every house, slower than a treadmill.
      { id: 'tvWorkout', label: '운동 채널 따라 하기', icon: '🤸', duration: 30, effects: { fun: 0.3, energy: -0.2, hygiene: -0.2 }, skill: { key: 'fitness', rate: LEARN.light }, countAs: 'workout', pose: 'front', range: 3, utility: { power: 0.01 } },
    ],
  },
  {
    id: 'stereo',
    name: '오디오',
    price: 300,
    w: 1,
    h: 1,
    icon: '🎵',
    color: '#ce93d8',
    category: 'fun',
    interactions: [
      { id: 'listen', shared: true, chatty: true, label: '음악 듣기', icon: '🎶', duration: 40, effects: { fun: 1.0 }, pose: 'front', range: 2, buffs: [{ id: 'music', chance: 1 }], utility: { power: 0.01 } },
      { id: 'dance', shared: true, label: '춤추기', icon: '💃', duration: 30, effects: { fun: 1.6, energy: -0.15, hygiene: -0.1 }, skill: { key: 'dancing', rate: LEARN.light }, pose: 'front', range: 2, buffs: [{ id: 'music', chance: 0.6 }], utility: { power: 0.01 } },
      // Ours: each skill has something to practise it on purpose; dancing for fun teaches less.
      { id: 'dancePractice', label: '안무 연습하기', icon: '🩰', duration: 45, effects: { fun: 0.4, energy: -0.2, hygiene: -0.15 }, skill: { key: 'dancing', rate: LEARN.practice }, pose: 'front', range: 2, utility: { power: 0.01 } },
    ],
  },
  // Singing and DJ mixing at home (ours, after City Living's karaoke machine and Get Together's DJ booth).
  {
    id: 'karaoke',
    name: '노래방 기계',
    price: 450,
    w: 1,
    h: 1,
    icon: '🎤',
    color: '#7e57c2',
    category: 'fun',
    interactions: [
      { id: 'singKaraoke', shared: true, label: '노래 부르기', icon: '🎤', duration: 30, effects: { fun: 0.9, social: 0.2 }, skill: { key: 'singing', rate: LEARN.practice }, pose: 'front', range: 2, utility: { power: 0.01 } },
    ],
  },
  {
    id: 'djBooth',
    name: 'DJ 부스',
    price: 650,
    w: 2,
    h: 1,
    icon: '🎧',
    color: '#212121',
    category: 'fun',
    interactions: [
      { id: 'mixTracks', label: '음악 믹싱하기', icon: '🎧', duration: 40, effects: { fun: 0.8 }, skill: { key: 'djMixing', rate: LEARN.practice }, pose: 'front', utility: { power: 0.01 } },
      { id: 'playSet', label: '클럽 공연하기', icon: '🎛️', duration: 40, effects: { fun: 0.5, energy: -0.1 }, skill: { key: 'djMixing', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
      { id: 'peakTimeSet', label: '피크 타임 공연하기', icon: '🔥', duration: 45, effects: { fun: 0.6, energy: -0.15 }, skill: { key: 'djMixing', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    // 참고 게임 object_Telescope: Logic (Mental for children) and Fun; stars only come out at night.
    id: 'telescope',
    name: '망원경',
    price: 550,
    w: 1,
    h: 1,
    icon: '🔭',
    color: '#5c6bc0',
    category: 'skill',
    interactions: [
      { id: 'stargaze', label: '별 보기', icon: '✨', duration: 60, effects: { fun: 0.8 }, skill: { key: 'logic', rate: LEARN.light }, requires: 'night', pose: 'front', buffs: [{ id: 'vastUniverse', chance: 0.6 }] },
      { id: 'observeSkies', label: '하늘 관찰하기', icon: '🔭', duration: 45, effects: { fun: 0.6 }, skill: { key: 'logic', rate: LEARN.light }, pose: 'front' },
      { id: 'watchNeighbors', label: '이웃 염탐하기', icon: '👀', duration: 30, effects: { fun: 1.0 }, skill: { key: 'mischief', rate: LEARN.light }, pose: 'front', buffs: [{ id: 'spySuccess', chance: 0.35 }, { id: 'nothingToSee', chance: 0.25 }, { id: 'naughtyNeighbors', chance: 0.2 }, { id: 'sawSomething', chance: 0.2 }] },
    ],
  },
  {
    // 참고 게임 object_chess_table: ponder alone (Chess_PonderMoves) or play a two-player game (Chess_Social).
    id: 'chessTable',
    name: '체스 테이블',
    price: 350,
    w: 1,
    h: 1,
    icon: '♟️',
    color: '#8d6e63',
    category: 'skill',
    interactions: [
      { id: 'playChess', label: '체스 두기', icon: '♟️', duration: 120, players: 2, effects: { fun: 0.8, social: 0.8 }, skill: { key: 'logic', rate: LEARN.practice }, pose: 'front', seated: true },
      { id: 'ponder', label: '수에 대해 생각하기', icon: '🤔', duration: 45, effects: { fun: 0.6 }, skill: { key: 'logic', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'chessPonder', chance: 0.6 }] },
    ],
  },
  {
    id: 'computer',
    name: '컴퓨터',
    price: 800,
    w: 1,
    h: 1,
    icon: '💻',
    color: '#455a64',
    category: 'skill',
    interactions: [
      { id: 'game', label: '게임하기', icon: '🎮', duration: 60, effects: { fun: 1.4, energy: -0.04 }, skill: { key: 'videoGaming', rate: LEARN.light }, pose: 'front', buffs: [{ id: 'epicGame', chance: 0.15 }, { id: 'highScore', chance: 0.5 }], utility: { power: 0.007 } },
      // Ours: practising to get better (ranked games, replays) teaches more than playing for fun.
      { id: 'gameTraining', label: '게임 실력 연습하기', icon: '🕹️', duration: 60, effects: { fun: 0.4, energy: -0.05 }, skill: { key: 'videoGaming', rate: LEARN.practice }, pose: 'front', utility: { power: 0.007 } },
      { id: 'chat', label: '온라인 채팅', icon: '⌨️', duration: 30, effects: { social: 0.8, fun: 0.3 }, pose: 'front', utility: { power: 0.007 } },
      { id: 'writeBook', label: '책 쓰기', icon: '✍️', duration: 120, effects: { fun: -0.05 }, skill: { key: 'writing', rate: LEARN.practice }, pose: 'front', utility: { power: 0.007 } },
      { id: 'study', label: '코딩 기초 공부', withJob: { label: '개발 실무 공부하기', rate: JOB_STUDY }, icon: '💾', duration: 60, effects: { fun: -0.1 }, skill: { key: 'programming', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'accomplished', chance: 0.35 }, { id: 'brainFried', chance: 0.25 }], utility: { power: 0.007 } },
      // Ours (2026-11-01): the other way of learning to code at home: following along, the code growing on the screen.
      { id: 'tutorial', label: '코딩 튜토리얼 따라 하기', withJob: { label: '실무 프로젝트 튜토리얼 하기', rate: JOB_STUDY }, icon: '📘', duration: 45, effects: { fun: 0.05 }, skill: { key: 'programming', rate: LEARN.practice }, countAs: 'study', pose: 'front', utility: { power: 0.007 } },
      { id: 'onlineLanguage', label: '화상 외국어 회화', icon: '🌐', duration: 45, effects: { social: 0.3, fun: 0.1 }, skill: { key: 'language', rate: LEARN.practice }, pose: 'front', utility: { power: 0.007 } },
      { id: 'economyNews', label: '경제 뉴스 보기', icon: '📈', duration: 30, effects: { fun: 0.05 }, skill: { key: 'business', rate: LEARN.light }, pose: 'front', utility: { power: 0.007 } },
      { id: 'translateGig', label: '번역 일감 하기', icon: '📝', duration: 90, effects: { fun: -0.1 }, skill: { key: 'language', rate: LEARN.light }, special: 'translate', minSkill: ['language', 3], pose: 'front', utility: { power: 0.007 } },
      { id: 'findJob', label: '구직하기', icon: '📰', duration: 10, effects: {}, special: 'findJob', autonomous: false, requires: 'unemployed', pose: 'front', utility: { power: 0.007 } },
      { id: 'quitJob', label: '퇴사하기', icon: '🚪', duration: 2, effects: {}, special: 'quitJob', autonomous: false, requires: 'employed', pose: 'front' },
    ],
  },
  {
    id: 'gamingComputer',
    name: '고성능 컴퓨터',
    price: 2200,
    w: 1,
    h: 1,
    icon: '💻',
    color: '#7e57c2',
    category: 'skill',
    // 참고 게임 object_Computer_High: Fun x2.99 (base object_Computer x1.33), brokenness x0.125, power x0.44.
    funMul: 2.25,
    wearMul: 0.125,
    powerMul: 0.37,
    interactions: [
      { id: 'game', label: '게임하기', icon: '🎮', duration: 60, effects: { fun: 1.4, energy: -0.04 }, skill: { key: 'videoGaming', rate: LEARN.light }, pose: 'front', buffs: [{ id: 'epicGame', chance: 0.15 }, { id: 'highScore', chance: 0.5 }], utility: { power: 0.007 } },
      // Ours: practising to get better (ranked games, replays) teaches more than playing for fun.
      { id: 'gameTraining', label: '게임 실력 연습하기', icon: '🕹️', duration: 60, effects: { fun: 0.4, energy: -0.05 }, skill: { key: 'videoGaming', rate: LEARN.practice }, pose: 'front', utility: { power: 0.007 } },
      { id: 'chat', label: '온라인 채팅', icon: '⌨️', duration: 30, effects: { social: 0.8, fun: 0.3 }, pose: 'front', utility: { power: 0.007 } },
      { id: 'writeBook', label: '책 쓰기', icon: '✍️', duration: 120, effects: { fun: -0.05 }, skill: { key: 'writing', rate: LEARN.practice }, pose: 'front', utility: { power: 0.007 } },
      { id: 'study', label: '코딩 기초 공부', withJob: { label: '개발 실무 공부하기', rate: JOB_STUDY }, icon: '💾', duration: 60, effects: { fun: -0.1 }, skill: { key: 'programming', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'accomplished', chance: 0.35 }, { id: 'brainFried', chance: 0.25 }], utility: { power: 0.007 } },
      // Ours (2026-11-01): the other way of learning to code at home: following along, the code growing on the screen.
      { id: 'tutorial', label: '코딩 튜토리얼 따라 하기', withJob: { label: '실무 프로젝트 튜토리얼 하기', rate: JOB_STUDY }, icon: '📘', duration: 45, effects: { fun: 0.05 }, skill: { key: 'programming', rate: LEARN.practice }, countAs: 'study', pose: 'front', utility: { power: 0.007 } },
      { id: 'onlineLanguage', label: '화상 외국어 회화', icon: '🌐', duration: 45, effects: { social: 0.3, fun: 0.1 }, skill: { key: 'language', rate: LEARN.practice }, pose: 'front', utility: { power: 0.007 } },
      { id: 'economyNews', label: '경제 뉴스 보기', icon: '📈', duration: 30, effects: { fun: 0.05 }, skill: { key: 'business', rate: LEARN.light }, pose: 'front', utility: { power: 0.007 } },
      { id: 'translateGig', label: '번역 일감 하기', icon: '📝', duration: 90, effects: { fun: -0.1 }, skill: { key: 'language', rate: LEARN.light }, special: 'translate', minSkill: ['language', 3], pose: 'front', utility: { power: 0.007 } },
      { id: 'findJob', label: '구직하기', icon: '📰', duration: 10, effects: {}, special: 'findJob', autonomous: false, requires: 'unemployed', pose: 'front', utility: { power: 0.007 } },
      { id: 'quitJob', label: '퇴사하기', icon: '🚪', duration: 2, effects: {}, special: 'quitJob', autonomous: false, requires: 'employed', pose: 'front' },
    ],
  },
  {
    id: 'bookshelf',
    name: '책장',
    price: 250,
    w: 1,
    h: 1,
    icon: '📚',
    color: '#6d4c41',
    category: 'skill',
    interactions: [
      { id: 'read', label: '소설 읽기', icon: '📖', duration: 45, effects: { fun: 0.9 }, pose: 'front', buffs: [{ id: 'stimulatingRead', chance: 0.8 }] },
      // Studying from a book is practice (ours: 참고 게임's skill books teach under half of cooking itself;
      // here everyday meals are the chore and the book the way to get better on purpose).
      { id: 'cookbook', label: '요리책 공부', icon: '🍳', duration: 60, effects: { fun: -0.05 }, skill: { key: 'cooking', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'bookInspiration', chance: 0.6 }] },
      // Ours: a garden only asks for a few minutes a day; studying it can be done any time.
      { id: 'gardenBook', label: '원예 책 공부', icon: '🌱', duration: 60, effects: { fun: -0.05 }, skill: { key: 'gardening', rate: LEARN.practice }, pose: 'front' },
      { id: 'gourmetBook', label: '고급 요리 레시피 연구', icon: '📖', duration: 60, effects: { fun: -0.05 }, skill: { key: 'gourmet', rate: LEARN.practice }, pose: 'front' },
      // Ours: skills every house can start on (39 career levels need logic, 45 empathy).
      { id: 'readLogic', label: '논리 퍼즐 책 풀기', icon: '🧩', duration: 60, effects: { fun: 0 }, skill: { key: 'logic', rate: LEARN.practice }, pose: 'front' },
      { id: 'readPsychology', label: '심리학 책 읽기', icon: '💗', duration: 60, effects: { fun: -0.05 }, skill: { key: 'empathy', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'bookInspiration', chance: 0.3 }] },
    ],
  },
  {
    id: 'mirror',
    name: '거울',
    price: 150,
    w: 1,
    h: 1,
    icon: '🪞',
    color: '#cfd8dc',
    category: 'skill',
    interactions: [
      { id: 'psychUp', label: '스스로 사기 충전하기', icon: '💪', duration: 8, effects: {}, moods: ['bored', 'embarrassed', 'sad', 'stressed', 'uncomfortable'], pose: 'front', buffs: [{ id: 'psychedUp', chance: 1 }] },
      { id: 'sillyFace', label: '우스꽝스러운 표정 짓기', icon: '🤪', duration: 5, effects: { fun: 1.5 }, moods: ['playful'], pose: 'front', buffs: [{ id: 'sillyFace', chance: 1 }] },
      { id: 'gussyUp', label: '몸단장하기', icon: '💄', duration: 20, effects: { hygiene: 0.5 }, pose: 'front', autonomous: false, buffs: [{ id: 'gussiedUp', chance: 1 }] },
      { id: 'calmDown', label: '진정하려고 애쓰기', icon: '😮‍💨', duration: 30, effects: {}, moods: ['angry', 'stressed'], clears: ['angry', 'stressed'], pose: 'front' },
      { id: 'practiceRomance', label: '작업 멘트 연습하기', icon: '😏', duration: 30, effects: { fun: 0.2 }, moods: ['confident', 'flirty'], skill: { key: 'charisma', rate: LEARN.practice }, pose: 'front' },
      { id: 'practiceComedy', label: '코미디 쇼 연습하기', icon: '🤡', duration: 40, effects: { fun: 0.6 }, skill: { key: 'comedy', rate: LEARN.practice }, pose: 'front' },
      { id: 'speech', label: '연설 연습', icon: '🗣️', duration: 45, effects: { fun: -0.05, social: 0.1 }, skill: { key: 'charisma', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'admireSelf', chance: 0.5 }] },
      // Ours: a new hair style picked in the edit window (the colour takes the salon).
      { id: 'styleHair', label: '머리 손질하기…', icon: '💇', duration: 15, effects: { hygiene: 0.2 }, pose: 'front', autonomous: false, special: 'restyle', restyle: 'hair', buffs: [{ id: 'freshHair', chance: 0.5 }] },
    ],
  },
  {
    // 참고 게임 dresser "Change Outfit" / "Plan Outfit": the clothes picked first, put on at the wardrobe.
    id: 'clothesCabinet',
    name: '옷장',
    price: 280,
    w: 1,
    h: 1,
    icon: '👔',
    color: '#a1887f',
    category: 'skill',
    interactions: [{ id: 'changeClothes', label: '옷 갈아입기…', icon: '👕', duration: 6, effects: {}, pose: 'front', autonomous: false, special: 'restyle', restyle: 'clothes', buffs: [{ id: 'newLook', chance: 1 }] }],
  },
  {
    // 참고 게임 object_CoffeeMaker: a cup brings Caffeinated (Energized 1, Energy decay x0.25).
    id: 'coffeeMaker',
    name: '커피 메이커',
    price: 150,
    w: 1,
    h: 1,
    icon: '☕',
    color: '#4e342e',
    category: 'kitchen',
    interactions: [
      { id: 'drinkCoffee', chatty: true, label: '커피 마시기', icon: '☕', duration: 15, effects: { hunger: 0.2 }, advertise: { energy: 1.6, hunger: 0.2 }, cost: 3, pose: 'front', cooldownBuff: 'caffeinated', utility: { power: 0.01, water: 0.01 } },
      // At work, the break room's snacks and lunch boxes by the coffee (탕비실): every work lot has a coffee maker, not all a fridge (ours, 2026-10-25).
      { id: 'pantrySnack', chatty: true, label: '탕비실 간식 먹기', icon: '🍙', duration: 20, effects: { hunger: 2.2 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // 참고 게임 object_bar: mix a drink (Mixology) and pour a round for whoever's around.
    id: 'bar',
    name: '홈 바',
    price: 650,
    w: 2,
    h: 1,
    icon: '🍹',
    color: '#6d4c41',
    category: 'kitchen',
    interactions: [
      { id: 'mixDrink', label: '음료 만들기', icon: '🍹', duration: 25, effects: { fun: 0.5 }, skill: { key: 'mixology', rate: LEARN.practice }, pose: 'front', cooldownBuff: 'drinkCooldown' },
      // The restaurant's bar: the bartender branch's work, there only (2026-10-26, at the user's request).
      { id: 'mixCocktail', label: '칵테일 만들기', icon: '🍸', duration: 20, effects: { fun: 0.2 }, skill: { key: 'mixology', rate: 1 / 120 }, requires: 'atWork', pose: 'front', workStage: { career: 'culinary', stage: 1, branch: 1 } },
    ],
  },
  {
    id: 'kitchenSink',
    name: '주방 싱크대',
    price: 250,
    w: 1,
    h: 1,
    icon: '🍽️',
    color: '#d7ccc8',
    category: 'kitchen',
    interactions: [
      { id: 'washDishes', label: '설거지하기', icon: '🧽', duration: 12, effects: { hygiene: -0.05 }, special: 'washDishes', requires: 'hasDishes', pose: 'front', utility: { water: 0.04 } },
      { id: 'wash', label: '손 씻기', icon: '🫧', duration: 4, effects: { hygiene: 3 }, pose: 'front', utility: { water: 0.03 } },
    ],
  },
  {
    id: 'lamp',
    name: '스탠드 조명',
    price: 80,
    w: 1,
    h: 1,
    icon: '💡',
    color: '#f3e5c0',
    category: 'decor',
    interactions: [],
    env: { emotion: 'happy', score: 5 },
  },
  {
    id: 'paintingLandscape',
    name: '풍경화',
    price: 150,
    w: 1,
    h: 1,
    icon: '🖼️',
    color: '#8fbf6a',
    category: 'decor',
    interactions: [{ id: 'viewArt', chatty: true, label: '감상하기', icon: '👀', duration: 15, effects: { fun: 0.6 }, pose: 'front' }],
    env: { emotion: 'happy', score: 20 },
  },
  {
    id: 'paintingAbstract',
    name: '추상화',
    price: 180,
    w: 1,
    h: 1,
    icon: '🎨',
    color: '#64b5f6',
    category: 'decor',
    interactions: [{ id: 'viewArt', chatty: true, label: '감상하기', icon: '👀', duration: 15, effects: { fun: 0.6 }, pose: 'front' }],
    env: { emotion: 'inspired', score: 20 },
  },
  {
    id: 'posterPop',
    name: '팝아트 포스터',
    price: 120,
    w: 1,
    h: 1,
    icon: '🃏',
    color: '#f06292',
    category: 'decor',
    interactions: [{ id: 'viewArt', chatty: true, label: '감상하기', icon: '👀', duration: 15, effects: { fun: 0.6 }, pose: 'front' }],
    env: { emotion: 'playful', score: 20 },
  },
  {
    id: 'paintingMaster',
    name: '걸작 초상화',
    price: 1500,
    w: 1,
    h: 1,
    icon: '👑',
    color: '#c9a54a',
    category: 'decor',
    interactions: [{ id: 'viewArt', chatty: true, label: '감상하기', icon: '👀', duration: 15, effects: { fun: 0.6 }, pose: 'front' }],
    env: { emotion: 'confident', score: 120 },
  },
  {
    id: 'aquarium',
    name: '열대어 어항',
    price: 400,
    w: 2,
    h: 1,
    icon: '🐠',
    color: '#4fc3f7',
    category: 'fun',
    interactions: [{ id: 'watchFish', shared: true, label: '물고기 구경하기', icon: '🐠', duration: 20, effects: { fun: 0.6 }, pose: 'front', range: 2 }],
    env: { emotion: 'focused', score: 20 },
  },
  {
    // Between floors (참고 게임 stairs, a routing portal): walked up from the foot, out at the head on the floor above.
    id: 'stairs',
    name: '계단',
    price: 600,
    w: 1,
    // Four tiles long, a house's flight (참고 게임's straight stairs): 3 m up over 3.5 m, about 40°.
    h: 4,
    icon: '🪜',
    color: '#a1887f',
    category: 'decor',
    interactions: [],
    walkable: true,
  },
  {
    // Garden: were painted into the lawn at fixed spots; now placed, moved and sold like anything (ours).
    id: 'tree',
    name: '나무',
    price: 300,
    w: 1,
    h: 1,
    icon: '🌳',
    color: '#4ca345',
    category: 'decor',
    interactions: [],
    env: { emotion: 'happy', score: 6 },
  },
  {
    id: 'bush',
    name: '덤불',
    price: 80,
    w: 1,
    h: 1,
    icon: '🌿',
    color: '#3f8f3a',
    category: 'decor',
    interactions: [],
    env: { emotion: 'happy', score: 3 },
  },
  {
    id: 'plant',
    name: '화분',
    price: 60,
    w: 1,
    h: 1,
    icon: '🪴',
    color: '#a5d6a7',
    category: 'decor',
    interactions: [],
    env: { emotion: 'happy', score: 10 },
  },
  {
    id: 'diningTable',
    name: '식탁',
    price: 200,
    w: 2,
    h: 1,
    icon: '🍽️',
    color: '#a1887f',
    category: 'kitchen',
    interactions: [],
  },
  {
    id: 'diningChair',
    name: '식탁 의자',
    price: 60,
    w: 1,
    h: 1,
    icon: '🪑',
    color: '#8d6e63',
    category: 'comfort',
    interactions: [
      { id: 'relax', chatty: true, label: '앉아서 쉬기', icon: '😌', duration: 20, effects: { energy: 0.06, fun: 0.1 }, pose: 'on' },
      EAT,
      { id: 'homework', label: '숙제하기', icon: '📚', duration: 100, effects: { fun: -0.1 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'student', pose: 'on' },
    ],
  },
  {
    id: 'smokeAlarm',
    name: '화재경보기',
    price: 50,
    w: 1,
    h: 1,
    icon: '🚨',
    color: '#eceff1',
    category: 'decor',
    interactions: [],
  },
  {
    id: 'treadmill',
    name: '러닝머신',
    price: 450,
    w: 1,
    h: 2,
    icon: '🏃',
    color: '#546e7a',
    category: 'skill',
    interactions: [
      { id: 'workout', label: '운동하기', icon: '🏃', duration: 45, effects: { fun: 0.3, energy: -0.25, hygiene: -0.3 }, skill: { key: 'fitness', rate: LEARN.practice }, pose: 'on', utility: { power: 0.01 } },
    ],
  },
  {
    id: 'easel',
    name: '이젤',
    price: 350,
    w: 1,
    h: 1,
    icon: '🎨',
    color: '#a1887f',
    category: 'skill',
    interactions: [
      { id: 'paint', label: '그림 그리기', icon: '🎨', duration: 90, effects: { fun: 0.5 }, skill: { key: 'painting', rate: LEARN.practice }, pose: 'front' },
    ],
  },
  {
    // 참고 게임 object_Piano_Grand, piano_Practice ("연습하기"); our upright takes two tiles.
    id: 'piano',
    name: '피아노',
    price: 1200,
    w: 2,
    h: 1,
    icon: '🎹',
    color: '#3e2723',
    category: 'skill',
    interactions: [
      { id: 'playPiano', label: '피아노 연습하기', icon: '🎹', duration: 45, effects: { fun: 1.0 }, skill: { key: 'piano', rate: LEARN.practice }, pose: 'front', seated: true },
    ],
  },
  {
    // 참고 게임 violin: the Violin skill (Inspired), soothing or scintillating strings, a sad song when Sad.
    id: 'violin',
    name: '바이올린',
    price: 400,
    w: 1,
    h: 1,
    icon: '🎻',
    color: '#8d4e2a',
    category: 'skill',
    interactions: [
      { id: 'playViolin', label: '바이올린 연주하기', icon: '🎻', duration: 45, effects: { fun: 1.0 }, skill: { key: 'violin', rate: LEARN.practice }, pose: 'front' },
    ],
  },
  {
    // A camera on a tripod (참고 게임 Photography, a minor skill; photos sell to publications).
    id: 'camera',
    name: '카메라',
    price: 350,
    w: 1,
    h: 1,
    icon: '📷',
    color: '#424242',
    category: 'skill',
    interactions: [
      { id: 'takePhoto', label: '사진 찍기', icon: '📸', duration: 40, effects: { fun: 0.6 }, skill: { key: 'photography', rate: LEARN.practice }, pose: 'front' },
    ],
  },
  {
    id: 'guitar',
    name: '기타',
    price: 250,
    w: 1,
    h: 1,
    icon: '🎸',
    color: '#d7a86e',
    category: 'skill',
    interactions: [
      { id: 'playGuitar', label: '기타 연주하기', icon: '🎸', duration: 45, effects: { fun: 1.0 }, skill: { key: 'guitar', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'music', chance: 0.5 }] },
    ],
  },
  {
    // 참고 게임 toddler beds (bed_Toddler): a toddler sleeps here; the bassinet is for babies.
    id: 'toddlerBed',
    name: '유아용 침대',
    price: 250,
    w: 1,
    h: 2,
    icon: '🧸',
    color: '#f8bbd0',
    category: 'comfort',
    interactions: [
      { id: 'toddlerNap', label: '낮잠 자기', icon: '😴', duration: 120, untilFull: 'energy', effects: { energy: 0.35 }, decayMul: SLEEP_DECAY, requires: 'toddler', pose: 'on' },
    ],
  },
  {
    id: 'bassinet',
    name: '아기 요람',
    price: 200,
    w: 1,
    h: 1,
    icon: '🧺',
    color: '#f3e5ab',
    category: 'comfort',
    interactions: [
      { id: 'feedBaby', label: '분유 먹이기', icon: '🍼', duration: 15, effects: { social: 0.3 }, skill: { key: 'empathy', rate: LEARN.chore }, baby: { hunger: 5 }, requires: 'hasBaby', pose: 'front' },
      { id: 'changeBaby', label: '기저귀 갈기', icon: '🧷', duration: 8, effects: { hygiene: -0.2 }, baby: { hygiene: 10 }, requires: 'hasBaby', pose: 'front' },
      { id: 'cuddleBaby', label: '안아 주기', icon: '🤱', duration: 20, effects: { social: 1.0, fun: 0.4 }, skill: { key: 'empathy', rate: LEARN.chore }, baby: { social: 4, fun: 2 }, requires: 'hasBaby', pose: 'front' },
    ],
  },
  {
    // 참고 게임 object_RocketShip: build it up, then fly off on an adventure.
    id: 'rocketShip',
    name: '로켓선',
    price: 2500,
    w: 2,
    h: 2,
    icon: '🚀',
    color: '#eceff1',
    category: 'skill',
    interactions: [
      { id: 'buildRocket', label: '로켓 조립하기', icon: '🔩', duration: 120, effects: { fun: 0.2 }, skill: { key: 'rocketScience', rate: LEARN.practice }, requires: 'rocketUnbuilt', pose: 'front' },
      // 참고 게임's rocket upgrades teach Rocket Science too; ours keeps a built rocket to work on (the build
      // alone is a few hours, and the astronaut's science branch asks for level 10).
      { id: 'tuneRocket', label: '로켓 정비·개량하기', icon: '🔧', duration: 60, effects: { fun: 0.1 }, skill: { key: 'rocketScience', rate: LEARN.practice }, requires: 'rocketReady', pose: 'front' },
      { id: 'launchRocket', label: '우주 탐사하기', icon: '🚀', duration: 5, effects: {}, requires: 'rocketReady', autonomous: false, pose: 'front' },
    ],
  },
  {
    // A garden pond to fish in (참고 게임 fishing spots on lots; the pond itself is ours).
    id: 'pond',
    name: '낚시 연못',
    price: 600,
    w: 2,
    h: 2,
    icon: '🎣',
    color: '#4fc3f7',
    category: 'fun',
    env: { emotion: 'happy', score: 2 },
    interactions: [
      { id: 'fish', label: '낚시하기', icon: '🎣', duration: 90, effects: { fun: 0.6 }, skill: { key: 'fishing', rate: LEARN.practice }, pose: 'front' },
    ],
  },
  {
    // 참고 게임 object_MonkeyBars: play (Fun 1.4, Motor) or hang out on top (Fun 0.6), children only.
    id: 'monkeyBars',
    name: '정글짐',
    price: 400,
    w: 2,
    h: 1,
    icon: '🐒',
    color: '#e53935',
    category: 'fun',
    interactions: [
      { id: 'playBars', label: '정글짐에서 놀기', icon: '🐒', duration: 40, effects: { fun: 1.4, hygiene: -0.05 }, skill: { key: 'motor', rate: 1 / 90 }, requires: 'child', pose: 'front', buffs: [{ id: 'monkeyKing', chance: 0.6 }] },
      { id: 'hangBars', chatty: true, label: '정글짐에 걸터앉기', icon: '🙃', duration: 30, effects: { fun: 0.6 }, skill: { key: 'motor', rate: 1 / 200 }, requires: 'child', pose: 'front' },
    ],
  },
  {
    id: 'toyBox',
    name: '장난감 상자',
    price: 120,
    w: 1,
    h: 1,
    icon: '🧸',
    color: '#ef9a9a',
    category: 'fun',
    interactions: [
      // 참고 게임 toy_Play: Fun and the Creativity skill.
      { id: 'playToys', label: '장난감 가지고 놀기', icon: '🧸', duration: 30, effects: { fun: 1.6, social: 0.1 }, skill: { key: 'creativity', rate: 1 / 90 }, requires: 'child', pose: 'front' },
    ],
  },
  {
    // 참고 게임 mailbox_PayBills advertises StaticCommodity_PayBills (2) to free will.
    id: 'mailbox',
    name: '우편함',
    price: 50,
    w: 1,
    h: 1,
    icon: '📬',
    color: '#3d6fb6',
    category: 'decor',
    interactions: [
      { id: 'payBills', label: '청구서 납부하기', icon: '💸', duration: 3, effects: {}, special: 'payBills', requires: 'billDue', pose: 'front' },
    ],
  },
  {
    id: 'planter',
    name: '텃밭 화분',
    price: 100,
    w: 1,
    h: 1,
    icon: '🪴',
    color: '#8d6e63',
    category: 'skill',
    interactions: [
      { id: 'plantSeeds', label: '씨앗 심기', icon: '🌱', duration: 15, effects: { fun: 0.2 }, cost: 10, skill: { key: 'gardening', rate: LEARN.practice }, special: 'plant', requires: 'emptyPlanter', pose: 'front' },
      { id: 'waterPlant', label: '물 주기', icon: '💧', duration: 6, effects: { fun: 0.1 }, skill: { key: 'gardening', rate: LEARN.practice }, special: 'water', requires: 'thirsty', pose: 'front' },
      { id: 'weedPlant', label: '잡초 뽑기', icon: '🌿', duration: 10, effects: { fun: 0.1, hygiene: -0.2 }, skill: { key: 'gardening', rate: LEARN.practice }, special: 'weed', requires: 'weedy', pose: 'front' },
      { id: 'harvest', label: '수확하기', icon: '🧺', duration: 8, effects: { fun: 0.4 }, skill: { key: 'gardening', rate: LEARN.practice }, special: 'harvest', requires: 'ripe', pose: 'front' },
    ],
  },
  {
    // 참고 게임 bathtub: a relaxing bath (Bathtub-Relax, Happy) or a bubble bath (Bathtub-Bubbles, Playful 2).
    id: 'bathtub',
    name: '욕조',
    price: 600,
    w: 1,
    h: 2,
    icon: '🛁',
    color: '#e3f2fd',
    category: 'bathroom',
    interactions: [
      { id: 'takeBath', clears: ['dazed'], label: '목욕하기', icon: '🛁', duration: 45, untilFull: 'hygiene', effects: { hygiene: 3, energy: 0.1, fun: 0.4 }, pose: 'on', buffs: [{ id: 'bathRelax', chance: 1 }], utility: { water: 0.08, power: 0.02 } },
      { id: 'bubbleBath', clears: ['dazed'], label: '거품 목욕하기', icon: '🫧', duration: 50, untilFull: 'hygiene', effects: { hygiene: 3, fun: 1.0 }, cost: 5, pose: 'on', buffs: [{ id: 'bubbles', chance: 1 }], utility: { water: 0.08, power: 0.02 } },
    ],
  },
  {
    id: 'birthdayCake',
    name: '생일 케이크',
    price: 0,
    w: 1,
    h: 1,
    icon: '🎂',
    color: '#f8bbd0',
    category: 'kitchen',
    unlisted: true,
    interactions: [
      { id: 'blowCandles', label: '불어서 촛불 끄기', icon: '🕯️', duration: 5, effects: { fun: 0.5 }, special: 'blowCandles', requires: 'canAgeUp', pose: 'front' },
      { id: 'eatCake', chatty: true, label: '케이크 먹기', icon: '🍰', duration: 15, effects: { hunger: 2, fun: 0.3 }, special: 'eatCake', requires: 'cakeBlown', pose: 'front', leavesDish: true },
    ],
  },
  {
    // 참고 게임 swimming pool (built in 참고 게임's build mode; here a ready-made pool). swim-laps: Fun and
    // Fitness (motor for children); Buff_Pool_Happy_RelaxingSwim "즐거운 수영" afterwards. Price ours.
    id: 'pool',
    name: '수영장',
    price: 2000,
    w: 3,
    h: 2,
    icon: '🏊',
    color: '#4fc3f7',
    category: 'fun',
    seats: 3,
    interactions: [
      { id: 'swim', chatty: true, label: '수영하기', icon: '🏊', duration: 45, effects: { fun: 1.0, energy: -0.15, hygiene: 0.2 }, skill: { key: 'fitness', rate: LEARN.practice }, pose: 'on', buffs: [{ id: 'relaxingSwim', chance: 1 }] },
    ],
  },
  {
    // 참고 게임 object_WoodworkingTable "목공 작업대": Handiness; recipes in woodwork.ts. Price ours.
    id: 'woodworkingTable',
    name: '목공 작업대',
    price: 300,
    w: 2,
    h: 1,
    icon: '🪚',
    color: '#a1887f',
    category: 'skill',
    interactions: [
      { id: 'woodwork', label: '목공 작업하기', icon: '🪵', duration: 60, effects: { fun: 0.4, hygiene: -0.05 }, skill: { key: 'handiness', rate: LEARN.practice }, special: 'woodwork', pose: 'front' },
    ],
  },
  {
    // Ours (2026-11-01): somewhere to practise handiness at home, without a broken thing: a bench with a vice. Price ours.
    id: 'homeToolBench',
    name: '집 공구 작업대',
    price: 380,
    w: 2,
    h: 1,
    icon: '🔧',
    color: '#8a6a48',
    category: 'skill',
    interactions: [
      { id: 'benchFile', label: '바이스에 물려 줄질 연습하기', withJob: { label: '정밀 가공 연습하기', rate: JOB_STUDY }, icon: '🔧', duration: 45, effects: { fun: 0.2, hygiene: -0.03 }, skill: { key: 'handiness', rate: LEARN.practice }, pose: 'front' },
      { id: 'benchFix', label: '작은 물건 고쳐 보기', withJob: { label: '기계 부품 정비 연습하기', rate: JOB_STUDY }, icon: '🔩', duration: 40, effects: { fun: 0.25 }, skill: { key: 'handiness', rate: LEARN.practice }, pose: 'front' },
    ],
  },
  {
    // 참고 게임 microscope "현미경": Microscope_Research (Logic, 45 minutes, 1% 과학에서 영감 얻음) and
    // Microscope_Analyze* (10 minutes, 80% a new 현미경 사진). Price ours.
    id: 'microscope',
    name: '현미경',
    price: 900,
    w: 1,
    h: 1,
    icon: '🔬',
    color: '#78909c',
    category: 'skill',
    interactions: [
      { id: 'research', label: '현미경으로 들여다보기', withJob: { label: '표본 관찰 기록하기', rate: JOB_STUDY }, icon: '🔬', duration: 45, effects: { fun: 0.3 }, skill: { key: 'science', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'scienceInspired', chance: 0.01 }] },
      { id: 'analyze', label: '현미경으로 표본 살펴보기', withJob: { label: '표본 정밀 분석하기', rate: JOB_STUDY }, icon: '🧫', duration: 10, effects: { fun: 0.4 }, skill: { key: 'science', rate: LEARN.practice }, special: 'analyze', requires: 'hasSample', pose: 'front' },
    ],
  },
  {
    // A desk to study at (ours): the competencies careers rest on that no 참고 게임 object trains. Teens do homework here too.
    id: 'studyDesk',
    name: '공부 책상',
    price: 250,
    w: 1,
    h: 1,
    icon: '📖',
    color: '#8d6e63',
    category: 'skill',
    interactions: [
      { id: 'studyMedicine', label: '의학 상식 읽기', withJob: { label: '임상 사례 공부하기', rate: JOB_STUDY }, icon: '🩺', duration: 60, effects: { fun: -0.1 }, skill: { key: 'medicine', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }, { id: 'brainFried', chance: 0.05 }] },
      { id: 'studyScience', label: '과학 교양서 읽기', withJob: { label: '최신 논문 읽기', rate: JOB_STUDY }, icon: '🔬', duration: 60, effects: { fun: -0.1 }, skill: { key: 'science', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }, { id: 'brainFried', chance: 0.05 }] },
      { id: 'studyLaw', label: '법 상식 읽기', withJob: { label: '법률 실무 공부하기', rate: JOB_STUDY }, icon: '⚖️', duration: 60, effects: { fun: -0.1 }, skill: { key: 'law', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }, { id: 'brainFried', chance: 0.05 }] },
      { id: 'studyBusiness', label: '경제 기초 읽기', withJob: { label: '경영 사례 분석하기', rate: JOB_STUDY }, icon: '📊', duration: 60, effects: { fun: -0.1 }, skill: { key: 'business', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }, { id: 'brainFried', chance: 0.05 }] },
      { id: 'studyLeadership', label: '리더십 책 읽기', withJob: { label: '조직 운영 사례 공부하기', rate: JOB_STUDY }, icon: '🧭', duration: 60, effects: { fun: -0.1 }, skill: { key: 'leadership', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }, { id: 'brainFried', chance: 0.05 }] },
      { id: 'studyLanguage', label: '외국어 기초 공부하기', withJob: { label: '업무 외국어 공부하기', rate: JOB_STUDY }, icon: '🌐', duration: 60, effects: { fun: -0.1 }, skill: { key: 'language', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }, { id: 'brainFried', chance: 0.05 }] },
      // Ours (2026-11-01): more than one way to study these at home: a book of cases, a workbook of the road's rules.
      { id: 'readCaseBook', label: '생활 법률 사례집 읽기', withJob: { label: '판례집 정리하기', rate: JOB_STUDY }, icon: '⚖️', duration: 45, effects: { fun: -0.05 }, skill: { key: 'law', rate: LEARN.practice }, countAs: 'studyLaw', pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }, { id: 'brainFried', chance: 0.05 }] },
      { id: 'roadRulesBook', label: '도로 규칙 문제집 풀기', withJob: { label: '운행 규정 심화 문제 풀기', rate: JOB_STUDY }, icon: '🚦', duration: 45, effects: { fun: -0.05 }, skill: { key: 'driving', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }, { id: 'brainFried', chance: 0.05 }] },
      { id: 'homework', label: '숙제하기', icon: '📚', duration: 100, effects: { fun: -0.1 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'student', pose: 'front' },
    ],
  },
  {
    // Ours: an anatomy model for the health careers.
    id: 'anatomyModel',
    name: '인체 모형',
    price: 400,
    w: 1,
    h: 1,
    icon: '🫀',
    color: '#ffccbc',
    category: 'skill',
    interactions: [
      { id: 'learnAnatomy', label: '인체 구조 알아보기', withJob: { label: '해부 구조 익히기', rate: JOB_STUDY }, icon: '🫀', duration: 45, effects: { fun: 0.1 }, skill: { key: 'medicine', rate: LEARN.practice }, pose: 'front' },
      { id: 'firstAidPractice', label: '기초 응급처치 익히기', withJob: { label: '응급 술기 훈련하기', rate: JOB_STUDY }, icon: '🩹', duration: 30, effects: { fun: 0.05 }, skill: { key: 'medicine', rate: LEARN.practice }, pose: 'front' },
    ],
  },
  {
    // Ours: a chemistry set (참고 게임's is a later pack).
    id: 'chemistrySet',
    name: '과학 실험 세트',
    price: 450,
    w: 1,
    h: 1,
    icon: '⚗️',
    color: '#90a4ae',
    category: 'skill',
    interactions: [
      { id: 'runExperiment', label: '실험하기', withJob: { label: '실험 프로토콜대로 재현하기', rate: JOB_STUDY }, icon: '⚗️', duration: 45, effects: { fun: 0.3 }, skill: { key: 'science', rate: LEARN.practice }, special: 'experiment', pose: 'front', buffs: [{ id: 'scienceInspired', chance: 0.05 }] },
    ],
  },
  {
    // Ours: a driving simulator rig.
    id: 'drivingSim',
    name: '운전 시뮬레이터',
    price: 900,
    w: 2,
    h: 1,
    icon: '🚗',
    color: '#212121',
    category: 'skill',
    interactions: [
      { id: 'drivePractice', label: '기초 운전 연습하기', withJob: { label: '실전 코스 주행 훈련하기', rate: JOB_STUDY }, icon: '🚗', duration: 45, effects: { fun: 0.4 }, skill: { key: 'driving', rate: LEARN.practice }, pose: 'front', utility: { power: 0.01 } },
    ],
  },
  {
    // Ours: a whiteboard at home for setting goals and practising talks.
    id: 'planningBoard',
    name: '가정용 화이트보드',
    price: 150,
    w: 1,
    h: 1,
    icon: '📋',
    color: '#eceff1',
    category: 'skill',
    interactions: [
      { id: 'planGoals', label: '목표·계획 세우기', icon: '🎯', duration: 30, effects: { fun: 0.05 }, skill: { key: 'leadership', rate: LEARN.practice }, pose: 'front', buffs: [{ id: 'studyDone', chance: 0.3 }] },
      { id: 'presentationPractice', label: '발표 연습하기', icon: '🗣️', duration: 40, effects: { fun: 0.1 }, skill: { key: 'leadership', rate: LEARN.practice }, pose: 'front' },
    ],
  },
  {
    // Ours: a business board game (buy, build, trade), more fun than a textbook.
    id: 'businessBoardGame',
    name: '경영 보드게임',
    price: 300,
    w: 1,
    h: 1,
    icon: '🎲',
    color: '#2e7d32',
    category: 'skill',
    interactions: [
      { id: 'playTycoon', chatty: true, label: '경영 보드게임 하기', withJob: { label: '사업 전략 짜 보기', rate: LEARN.practice }, icon: '🎲', duration: 45, effects: { fun: 0.6 }, skill: { key: 'business', rate: LEARN.light }, pose: 'front' },
    ],
  },
  {
    // 참고 게임 grill "그릴": 핫도그 (recipe_Food_Homestyle_Grill_HotDog, Homestyle Cooking 0; §5 single, §25 for a group). Price ours.
    id: 'grill',
    name: '그릴',
    price: 450,
    w: 1,
    h: 1,
    icon: '🍖',
    color: '#455a64',
    category: 'kitchen',
    interactions: [
      { id: 'grill', label: '그릴에서 요리하기 (핫도그)', icon: '🌭', duration: 25, effects: { fun: 0.3 }, advertise: { hunger: 2.4, fun: 0.3 }, serves: 1, skill: { key: 'cooking', rate: LEARN.chore }, cost: 5, pose: 'front' },
      { id: 'grillFamily', label: '그릴에서 요리하기 (핫도그 여럿)', icon: '🌭', duration: 40, effects: { fun: 0.3 }, advertise: { hunger: 2.4, fun: 0.3 }, serves: 4, countAs: 'cook', skill: { key: 'cooking', rate: LEARN.chore }, cost: 25, pose: 'front' },
    ],
  },
  {
    // 참고 게임 object_Fireplace "벽난로": Fireplace_Light / _PutOut, Fireplace_WarmSelf "몸 덥히기";
    // lit, Broadcaster_Fireplace_CozyFire gives "아늑한 난로" and _CauseFire may light things in front. Price ours.
    id: 'fireplace',
    name: '벽난로',
    price: 800,
    w: 2,
    h: 1,
    icon: '🔥',
    color: '#8d6e63',
    category: 'comfort',
    interactions: [
      { id: 'lightFire', label: '불 피우기', icon: '🔥', duration: 5, effects: {}, special: 'lightFire', requires: 'fireOut', autonomous: false, pose: 'front' },
      { id: 'putOutFire', label: '불 끄기', icon: '🧯', duration: 5, effects: {}, special: 'putOutFire', requires: 'fireLit', autonomous: false, pose: 'front' },
      { id: 'warmSelf', chatty: true, shared: true, label: '몸 덥히기', icon: '🙌', duration: 20, effects: { fun: 0.5, social: 0.1 }, requires: 'fireLit', range: 2, pose: 'front' },
    ],
  },
  {
    // 참고 게임 object_HighChair "유아용 의자": a grown-up sets out food (HighChair_CleanAndServeFood), the toddler eats (price ours).
    id: 'highChair',
    name: '유아용 의자',
    price: 150,
    w: 1,
    h: 1,
    icon: '🪑',
    color: '#ffcc80',
    category: 'kitchen',
    interactions: [
      { id: 'serveHighChair', label: '유아용 의자에 밥 차려 주기', icon: '🥣', duration: 5, effects: { social: 0.2 }, cost: 5, special: 'serveHighChair', requires: 'toddlerHungry', pose: 'front' },
      { id: 'eatHighChair', label: '유아용 의자에서 먹기', icon: '🥣', duration: 20, effects: { hunger: 5, fun: 0.3 }, special: 'eatHighChair', requires: 'highChairServed', pose: 'on' },
    ],
  },
  {
    // 참고 게임 object_toddler_pottyChair "유아 변기": practice for potty training, with the odd accident (buff_Object_Potty_Accident "용변 사고"). Price ours.
    id: 'pottyChair',
    name: '유아 변기',
    price: 80,
    w: 1,
    h: 1,
    icon: '🚽',
    color: '#81d4fa',
    category: 'bathroom',
    interactions: [
      { id: 'usePotty', label: '유아 변기 쓰기', icon: '🚽', duration: 10, effects: { fun: 0.2 }, skill: { key: 'potty', rate: 1 / 40 }, special: 'usePotty', requires: 'pottyReady', pose: 'on' },
    ],
  },
  // ---- Workplace furniture (workplace.ts; only on work lots, not for sale).
  {
    id: 'workstation', name: '업무용 컴퓨터', price: 0, w: 1, h: 1, icon: '🖥️', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeCode', label: '코드 작성하기', icon: '⌨️', duration: 45, effects: { fun: -0.05 }, skill: { key: 'programming', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'fixBugs', label: '버그 수정하기', icon: '🐛', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'checkMail', label: '업무 메일 확인하기', icon: '📧', duration: 15, effects: { social: 0.2 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'whiteboard', name: '화이트보드', price: 0, w: 2, h: 1, icon: '📋', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'attendMeeting', shared: true, chatty: true, label: '회의 참석하기', icon: '🗣️', duration: 40, effects: { social: 0.4 }, skill: { key: 'charisma', rate: 1 / 200 }, range: 2, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lineStove', name: '업소용 화구', price: 0, w: 1, h: 1, icon: '🔥', color: '#78909c', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'cookOrder', label: '주문 요리 만들기', icon: '🍳', duration: 30, effects: { fun: 0.1 }, skill: { key: 'cooking', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'prepCounter', name: '조리대', price: 0, w: 2, h: 1, icon: '🔪', color: '#b0bec5', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'prepIngredients', label: '재료 손질하기', icon: '🔪', duration: 20, effects: { fun: -0.05 }, skill: { key: 'cooking', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
      { id: 'tasteDish', label: '맛 보기', icon: '🥄', duration: 10, effects: { hunger: 1 }, skill: { key: 'cooking', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'servingPass', name: '서빙 창구', price: 0, w: 1, h: 2, icon: '🛎️', color: '#cfd8dc', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'plateDish', label: '요리 플레이팅하기', icon: '🍽️', duration: 15, effects: { fun: 0.1 }, skill: { key: 'cooking', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'studioEasel', name: '작업용 이젤', price: 0, w: 1, h: 1, icon: '🖼️', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'paintCommission', label: '의뢰 작품 그리기', icon: '🎨', duration: 60, effects: { fun: 0.3 }, skill: { key: 'painting', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sketchTable', name: '스케치 테이블', price: 0, w: 2, h: 1, icon: '✏️', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sketch', label: '스케치하기', icon: '✏️', duration: 25, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
      { id: 'cleanBrushes', label: '붓 정리하기', icon: '🖌️', duration: 10, effects: { hygiene: -0.1 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'medStation', name: '진료용 컴퓨터', price: 0, w: 1, h: 1, icon: '💻', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeChart', label: '진료 기록 작성하기', icon: '🗂️', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'drPatientList', label: '환자 명단 정리하기', icon: '📋', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 140 }, requires: 'atWork', pose: 'front', workStage: { career: 'doctor', stage: 0 } },
      { id: 'reviewLabs', label: '검사 결과 분석하기', icon: '🧪', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'xrayViewer', name: '엑스레이 판독기', price: 0, w: 2, h: 1, icon: '🩻', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'readXray', label: '엑스레이 판독하기', icon: '🩻', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'hospitalBed', name: '병상', price: 0, w: 1, h: 2, icon: '🛏️', color: '#e0f2f1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'makeHospitalBed', label: '병상 정리하기', icon: '🛏️', duration: 15, effects: { hygiene: -0.05 }, requires: 'atWork', pose: 'front' },
      { id: 'drDrawBlood', label: '환자 채혈하기', icon: '🩸', duration: 15, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 140 }, requires: 'atWork', pose: 'front', workStage: { career: 'doctor', stage: 0 } },
    ],
  },
  {
    id: 'surgeryTable', name: '수술대', price: 0, w: 2, h: 1, icon: '🩺', color: '#80cbc4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'performSurgery', label: '수술 집도하기', icon: '🔪', duration: 90, effects: { fun: -0.05, energy: -0.1 }, skill: { key: 'handiness', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
      { id: 'emergencySurgery', label: '응급 수술하기', icon: '🚑', duration: 60, effects: { energy: -0.15 }, skill: { key: 'handiness', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'medCabinet', name: '약품 보관장', price: 0, w: 1, h: 1, icon: '💊', color: '#e3f2fd', category: 'skill', unlisted: true,
    interactions: [
      { id: 'prepareMeds', label: '약 준비하기', icon: '💊', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
      { id: 'restockSupplies', label: '의료 물품 정리하기', icon: '📦', duration: 15, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
      { id: 'drPrepTheatre', label: '수술 기구 준비하기', icon: '🧰', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 140 }, requires: 'atWork', pose: 'front', workStage: { career: 'doctor', stage: 0 } },
    ],
  },
  {
    id: 'policeDesk', name: '사건 데스크', price: 0, w: 1, h: 1, icon: '🗄️', color: '#5c6bc0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'fileReport', label: '사건 보고서 작성하기', icon: '📝', duration: 35, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'searchRecords', label: '범죄 기록 조회하기', icon: '🔎', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'evidenceTable', name: '증거 분석대', price: 0, w: 2, h: 1, icon: '🔬', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'analyzeEvidence', label: '증거 분석하기', icon: '🔬', duration: 40, effects: { fun: 0.1 }, skill: { key: 'logic', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'trainingDummy', name: '훈련용 인형', price: 0, w: 1, h: 1, icon: '🥋', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrestDrill', label: '체포술 훈련하기', icon: '🥋', duration: 30, effects: { fun: 0.1, energy: -0.2, hygiene: -0.2 }, skill: { key: 'fitness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'patrolCar', name: '순찰차', price: 0, w: 2, h: 1, icon: '🚓', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'patrol', label: '순찰 나가기', icon: '🚓', duration: 60, effects: { fun: 0.1, energy: -0.05 }, skill: { key: 'fitness', rate: 1 / 150 }, requires: 'atWork', offLot: true, pose: 'front' },
      { id: 'respondCall', label: '신고 출동하기', icon: '🚨', duration: 45, effects: { fun: 0.2, energy: -0.1 }, skill: { key: 'fitness', rate: 1 / 100 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'fireTruck', name: '소방차', price: 0, w: 2, h: 3, icon: '🚒', color: '#e53935', category: 'skill', unlisted: true,
    interactions: [
      { id: 'inspectTruck', label: '소방차 점검하기', icon: '🔧', duration: 30, effects: { hygiene: -0.1 }, skill: { key: 'handiness', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'respondFire', label: '화재 출동하기', icon: '🚨', duration: 60, effects: { energy: -0.25, hygiene: -0.3 }, skill: { key: 'fitness', rate: 1 / 90 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'hoseRack', name: '호스 걸이', price: 0, w: 1, h: 1, icon: '🧯', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [
      { id: 'rollHose', label: '호스 정리하기', icon: '🧯', duration: 15, effects: { energy: -0.05 }, skill: { key: 'fitness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'gearLocker', name: '방화복 보관함', price: 0, w: 1, h: 1, icon: '🦺', color: '#ffb300', category: 'skill', unlisted: true,
    interactions: [
      { id: 'checkGear', label: '장비 점검하기', icon: '🦺', duration: 15, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'fireDrill', name: '소방 훈련 타워', price: 0, w: 2, h: 1, icon: '🪜', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'fireDrill', label: '소방 훈련하기', icon: '🪜', duration: 40, effects: { fun: 0.1, energy: -0.25, hygiene: -0.3 }, skill: { key: 'fitness', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'chalkboard', name: '칠판', price: 0, w: 2, h: 1, icon: '📚', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [
      { id: 'teachLesson', label: '수업하기', icon: '📚', duration: 45, effects: { social: 0.3, energy: -0.05 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'teacher_openLesson', label: '공개 수업하기', icon: '🎓', duration: 40, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front', workStage: { career: 'teacher', stage: 1, branch: 2 } },
    ],
  },
  {
    id: 'teacherDesk', name: '교사용 책상', price: 0, w: 1, h: 1, icon: '🗒️', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'gradePapers', label: '시험지 채점하기', icon: '✏️', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'teacher_officialDoc', label: '공문 처리하기', icon: '📨', duration: 25, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 90 }, requires: 'atWork', pose: 'front', workStage: { career: 'teacher', stage: 1 } },
      { id: 'planLesson', label: '수업 계획 세우기', icon: '🗒️', duration: 30, effects: { fun: 0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'studentDesk', name: '학생 책상', price: 0, w: 1, h: 1, icon: '📓', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'checkHomework', label: '숙제 검사하기', icon: '📓', duration: 10, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lawDesk', name: '변호사 책상', price: 0, w: 1, h: 1, icon: '📄', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'draftBrief', label: '소송 서류 작성하기', icon: '📄', duration: 40, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'reviewCase', label: '사건 기록 검토하기', icon: '🗂️', duration: 25, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lawLibrary', name: '법률 서가', price: 0, w: 1, h: 1, icon: '📚', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'researchCases', label: '판례 조사하기', icon: '🔎', duration: 35, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'courtPodium', name: '변론대', price: 0, w: 1, h: 1, icon: '🎙️', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'argueCase', label: '변론 연습하기', icon: '🎙️', duration: 25, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'attendTrial', label: '재판 출석하기', icon: '⚖️', duration: 60, effects: { social: 0.3, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'judgeBench', name: '판사석', access: 'any', price: 0, w: 2, h: 1, icon: '🔨', color: '#3e2723', category: 'skill', unlisted: true,
    interactions: [
      { id: 'reviewVerdict', label: '판결문 검토하기', icon: '🔨', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'draftingTable', name: '제도판', price: 0, w: 1, h: 1, icon: '📐', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'draftBlueprint', label: '설계도 그리기', icon: '📐', duration: 45, effects: { fun: 0.1 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'sketchFacade', label: '입면 스케치하기', icon: '✏️', duration: 25, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'cadStation', name: '설계용 컴퓨터', price: 0, w: 1, h: 1, icon: '🖥️', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'renderDesign', label: '3D 설계하기', icon: '🖥️', duration: 40, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'modelTable', name: '모형 작업대', price: 0, w: 2, h: 1, icon: '🏗️', color: '#bcaaa4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'buildModel', label: '건축 모형 만들기', icon: '🏗️', duration: 50, effects: { fun: 0.2 }, skill: { key: 'handiness', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'siteVan', name: '현장 차량', price: 0, w: 2, h: 1, icon: '🚐', color: '#fbc02d', category: 'skill', unlisted: true,
    interactions: [
      { id: 'siteVisit', label: '공사 현장 점검하기', icon: '🦺', duration: 50, effects: { energy: -0.1, hygiene: -0.2 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'vetTable', name: '동물 진료대', price: 0, w: 2, h: 1, icon: '🐾', color: '#b2dfdb', category: 'skill', unlisted: true,
    interactions: [
      { id: 'disinfectTable', label: '진료대 소독하기', icon: '🧴', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'kennel', name: '입원 케이지', price: 0, w: 1, h: 1, icon: '🐕', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'feedAnimals', label: '입원 동물 돌보기', icon: '🦴', duration: 20, effects: { fun: 0.3 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sewingMachine', name: '재봉틀', price: 0, w: 1, h: 1, icon: '🧵', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sewGarment', label: '옷 바느질하기', icon: '🧵', duration: 40, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'alterGarment', label: '옷 수선하기', icon: '🪡', duration: 20, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'fabricTable', name: '재단대', price: 0, w: 2, h: 1, icon: '✂️', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cutFabric', label: '원단 재단하기', icon: '✂️', duration: 25, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mannequin', name: '마네킹', price: 0, w: 1, h: 1, icon: '👗', color: '#f8bbd0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dressMannequin', label: '마네킹 피팅하기', icon: '👗', duration: 20, effects: { fun: 0.15 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'runway', name: '런웨이', price: 0, w: 1, h: 3, icon: '👠', color: '#fce4ec', category: 'skill', unlisted: true,
    interactions: [
      { id: 'walkRunway', label: '런웨이 워킹 연습하기', icon: '🚶', duration: 15, effects: { fun: 0.3 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
      { id: 'runShow', label: '패션쇼 리허설 진행하기', icon: '👠', duration: 45, effects: { social: 0.3, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 80 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'photoBackdrop', name: '촬영 배경지', price: 0, w: 3, h: 1, icon: '🎀', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeSet', label: '촬영 세트 꾸미기', icon: '🎀', duration: 20, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'studioLight', name: '스튜디오 조명', price: 0, w: 1, h: 1, icon: '💡', color: '#616161', category: 'skill', unlisted: true,
    interactions: [
      { id: 'setUpLights', label: '조명 세팅하기', icon: '💡', duration: 15, effects: { fun: -0.05 }, skill: { key: 'photography', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'studioCamera', name: '삼각대 카메라', price: 0, w: 1, h: 1, icon: '📷', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'shootProducts', label: '제품 사진 찍기', icon: '📷', duration: 35, effects: { fun: 0.15 }, skill: { key: 'photography', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'testShots', label: '테스트 촬영하기', icon: '📸', duration: 15, effects: { fun: 0.1 }, skill: { key: 'photography', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'photoEditStation', name: '보정용 컴퓨터', price: 0, w: 1, h: 1, icon: '🖼️', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'editPhotos', label: '사진 보정하기', icon: '🖼️', duration: 35, effects: { fun: 0.05 }, skill: { key: 'photography', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'darkroomSink', name: '현상대', price: 0, w: 2, h: 1, icon: '🎞️', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'developFilm', label: '필름 현상하기', icon: '🎞️', duration: 30, effects: { fun: 0.1 }, skill: { key: 'photography', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'pressScooter', name: '취재용 스쿠터', price: 0, w: 1, h: 1, icon: '🛵', color: '#1e88e5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'coverEvent', label: '현장 촬영 나가기', icon: '📰', duration: 50, effects: { fun: 0.2, energy: -0.1 }, skill: { key: 'photography', rate: 1 / 80 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'salonStation', name: '미용 의자', price: 0, w: 1, h: 1, icon: '💇', color: '#ce93d8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cleanStation', label: '자리 정리하기', icon: '🧹', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
      { id: 'sharpenScissors', label: '가위 손질하기', icon: '✂️', duration: 10, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
      { id: 'vipStyling', label: 'VIP 손님 스타일링하기', icon: '💐', duration: 45, effects: { social: 0.3 }, skill: { key: 'painting', rate: 1 / 80 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    // A full-flat shampoo bed, the basin at its front where the stylist stands (2026-10-27): the dye is
    // mixed at the colour bar and the towels done at the towel steamer now (workFurniture/hairStylist.ts).
    id: 'shampooSink', name: '샴푸대', price: 0, w: 1, h: 2, icon: '🚿', color: '#b39ddb', category: 'skill', unlisted: true,
    interactions: [
      { id: 'shampooHair', label: '샴푸해 드리기', icon: '🫧', duration: 20, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
      { id: 'hsScalpCare', label: '두피 스파 마사지하기', icon: '💆', duration: 25, effects: { social: 0.2, fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'salonCounter', name: '살롱 안내 데스크', price: 0, w: 1, h: 1, icon: '📅', color: '#8e24aa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bookAppointments', label: '예약 관리하기', icon: '📅', duration: 15, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'productShelf', name: '헤어 제품 진열대', price: 0, w: 1, h: 1, icon: '🧴', color: '#f3e5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'restockProducts', label: '헤어 제품 진열하기', icon: '🧴', duration: 15, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'flightSimulator', name: '비행 시뮬레이터', price: 0, w: 4, h: 4, icon: '🕹️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'simTraining', label: '비행 시뮬레이터 훈련하기', icon: '🕹️', duration: 45, effects: { fun: 0.3 }, skill: { key: 'logic', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'emergencyDrill', label: '비상 절차 훈련하기', icon: '🚨', duration: 30, effects: { fun: 0.1, energy: -0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'briefingTable', name: '브리핑 테이블', price: 0, w: 4, h: 3, icon: '🗺️', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'flightBriefing', label: '비행 브리핑하기', icon: '🗺️', duration: 20, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'weatherStation', name: '기상 레이더', price: 0, w: 1, h: 1, icon: '🌦️', color: '#0277bd', category: 'skill', unlisted: true,
    interactions: [
      { id: 'checkWeather', label: '기상 확인하기', icon: '🌦️', duration: 15, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'opsDesk', name: '운항 관리 데스크', price: 0, w: 3, h: 2, icon: '📋', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'fileFlightPlan', label: '비행 계획서 제출하기', icon: '📋', duration: 25, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'boardingGate', name: '탑승구', price: 0, w: 9, h: 2, icon: '🛫', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'preflightCheck', label: '비행 전 점검하기', icon: '🔧', duration: 20, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'flyRoute', label: '운항 나가기', icon: '✈️', duration: 120, effects: { fun: 0.15, energy: -0.12 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'chemistryBench', name: '실험대', price: 0, w: 2, h: 1, icon: '⚗️', color: '#b2ebf2', category: 'skill', unlisted: true,
    interactions: [
      { id: 'runExperiment', label: '실험하기', icon: '⚗️', duration: 40, effects: { fun: 0.15 }, skill: { key: 'logic', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'analyzeSamples', label: '시료 분석하기', icon: '🧪', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'formulaBoard', name: '수식 칠판', price: 0, w: 2, h: 1, icon: '🧮', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'deriveFormula', label: '수식 유도하기', icon: '🧮', duration: 30, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'specimenFreezer', name: '시료 냉동고', price: 0, w: 1, h: 1, icon: '🧊', color: '#e1f5fe', category: 'skill', unlisted: true,
    interactions: [
      { id: 'storeSamples', label: '시료 보관하기', icon: '🧊', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'inventionBench', name: '발명 작업대', price: 0, w: 2, h: 1, icon: '🛠️', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'buildPrototype', label: '발명품 만들기', icon: '🛠️', duration: 50, effects: { fun: 0.2 }, skill: { key: 'handiness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'tinkerParts', label: '부품 손보기', icon: '🔩', duration: 20, effects: { fun: 0.1 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'labControl', name: '실험 제어반', price: 0, w: 2, h: 1, icon: '🎛️', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'monitorExperiment', label: '실험 데이터 모니터링', icon: '📈', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'stabilizeExperiment', label: '실험 장치 안정화하기', icon: '🎛️', duration: 30, effects: { energy: -0.1 }, skill: { key: 'logic', rate: 1 / 80 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'researchDesk', name: '연구용 책상', price: 0, w: 1, h: 1, icon: '📑', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writePaper', label: '논문 쓰기', icon: '📑', duration: 40, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'filmSet', name: '촬영 세트', price: 0, w: 3, h: 2, icon: '🎬', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'rehearseScene', label: '장면 리허설하기', icon: '🎭', duration: 30, effects: { fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'filmScene', label: '촬영하기', icon: '🎬', duration: 45, effects: { fun: 0.2, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'movieCamera', name: '영화 카메라', price: 0, w: 1, h: 1, icon: '🎥', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'reviewTakes', label: '촬영본 모니터하기', icon: '🎥', duration: 15, effects: { fun: 0.1 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'stuntMat', name: '액션 매트', price: 0, w: 2, h: 1, icon: '🤸', color: '#1565c0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'practiceStunt', label: '액션 연습하기', icon: '🤸', duration: 30, effects: { fun: 0.2, energy: -0.25, hygiene: -0.2 }, skill: { key: 'fitness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'makeupMirror', name: '분장 거울', price: 0, w: 1, h: 1, icon: '💄', color: '#fce4ec', category: 'skill', unlisted: true,
    interactions: [
      { id: 'getMakeup', label: '분장하기', icon: '💄', duration: 15, effects: { fun: 0.1 }, requires: 'atWork', pose: 'front' },
      { id: 'practiceExpressions', label: '표정 연기 연습하기', icon: '🎭', duration: 20, effects: { fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'scriptTable', name: '대본 테이블', price: 0, w: 2, h: 1, icon: '📜', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'readScript', label: '대본 읽기', icon: '📜', duration: 25, effects: { fun: 0.05 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'acTableRead', label: '대본 리딩 참석하기', icon: '🗣️', duration: 30, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'campaignDesk', name: '의원실 책상', price: 0, w: 1, h: 1, icon: '🗳️', color: '#5c6bc0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'callVoters', label: '유권자에게 전화하기', icon: '📞', duration: 25, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'draftPolicy', label: '정책 문서 작성하기', icon: '📄', duration: 35, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'speechPodium', name: '연단', price: 0, w: 1, h: 1, icon: '🎤', color: '#3e2723', category: 'skill', unlisted: true,
    interactions: [
      { id: 'giveSpeech', label: '연설하기', icon: '🎤', duration: 30, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'pressConference', label: '기자 회견하기', icon: '📢', duration: 40, effects: { social: 0.3, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'debateTable', name: '토론 테이블', price: 0, w: 2, h: 1, icon: '🗣️', color: '#795548', category: 'skill', unlisted: true,
    interactions: [
      { id: 'debatePractice', label: '토론 연습하기', icon: '🗣️', duration: 25, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'editorDesk', name: '편집 데스크', price: 0, w: 1, h: 1, icon: '📰', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeReview', label: '리뷰 쓰기', icon: '📝', duration: 40, effects: { fun: 0.05 }, skill: { key: 'writing', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'researchTrends', label: '트렌드 조사하기', icon: '🔎', duration: 20, effects: { fun: 0.1 }, skill: { key: 'writing', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'fileReview', label: '마감 원고 넘기기', icon: '📰', duration: 30, effects: { energy: -0.1 }, skill: { key: 'writing', rate: 1 / 80 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'tastingTable', name: '시식 테이블', price: 0, w: 2, h: 1, icon: '🍽️', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'tasteCourse', label: '코스 요리 시식하기', icon: '🍽️', duration: 30, effects: { hunger: 1.2, fun: 0.2 }, skill: { key: 'gourmet', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wineRack', name: '와인 셀러', price: 0, w: 1, h: 1, icon: '🍷', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'rateWine', label: '와인 테이스팅', icon: '🍷', duration: 15, effects: { fun: 0.2 }, skill: { key: 'mixology', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'artPedestal', name: '작품 전시대', price: 0, w: 1, h: 1, icon: '🗿', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'appraiseArt', label: '작품 감정하기', icon: '🖼️', duration: 25, effects: { fun: 0.15 }, skill: { key: 'painting', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'archiveShelf', name: '자료 서가', price: 0, w: 1, h: 1, icon: '🗄️', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      // Used by offices of every kind, not just magazines (2026-10-26, at the user's request).
      { id: 'readArchive', label: '지난 자료 찾아보기', icon: '🗄️', duration: 20, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'contentDesk', name: '콘텐츠 책상', price: 0, w: 1, h: 1, icon: '💡', color: '#f8bbd0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'planContent', label: '콘텐츠 기획하기', icon: '💡', duration: 30, effects: { fun: 0.1 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'replyComments', label: '댓글 관리하기', icon: '💬', duration: 15, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'videoEditStation', name: '영상 편집 컴퓨터', price: 0, w: 1, h: 1, icon: '🎞️', color: '#311b92', category: 'skill', unlisted: true,
    interactions: [
      { id: 'editVideo', label: '영상 편집하기', icon: '🎞️', duration: 40, effects: { fun: 0.05 }, skill: { key: 'programming', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'streamingSetup', name: '방송 장비', price: 0, w: 1, h: 1, icon: '🎙️', color: '#212121', category: 'skill', unlisted: true,
    interactions: [
      { id: 'liveStream', label: '라이브 방송하기', icon: '📡', duration: 40, effects: { social: 0.4, fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'trendingLive', label: '화제의 순간 라이브', icon: '🔥', duration: 30, effects: { social: 0.5, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'selfieWall', name: '포토월', price: 0, w: 2, h: 1, icon: '🤳', color: '#ff80ab', category: 'skill', unlisted: true,
    interactions: [
      { id: 'selfieShoot', label: '셀카 콘텐츠 찍기', icon: '🤳', duration: 20, effects: { fun: 0.2 }, skill: { key: 'photography', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'trendBoard', name: '트렌드 보드', price: 0, w: 2, h: 1, icon: '📊', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'analyzeMetrics', label: '조회수 분석하기', icon: '📊', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'obstacleCourse', name: '장애물 코스', price: 0, w: 3, h: 1, icon: '🧗', color: '#795548', category: 'skill', unlisted: true,
    interactions: [
      { id: 'runObstacles', label: '장애물 코스 달리기', icon: '🧗', duration: 30, effects: { fun: 0.1, energy: -0.3, hygiene: -0.3 }, skill: { key: 'fitness', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'pullUpBar', name: '철봉', price: 0, w: 1, h: 1, icon: '💪', color: '#9e9e9e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'doPullUps', label: '턱걸이하기', icon: '💪', duration: 15, effects: { energy: -0.2, hygiene: -0.2 }, skill: { key: 'fitness', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'flagPole', name: '국기 게양대', price: 0, w: 1, h: 1, icon: '🚩', color: '#bdbdbd', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drillMarch', label: '제식 훈련하기', icon: '🚩', duration: 20, effects: { energy: -0.1 }, skill: { key: 'fitness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'gearRack', name: '장비 보관대', price: 0, w: 1, h: 1, icon: '🎒', color: '#556b2f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'maintainGear', label: '장비 정비하기', icon: '🔧', duration: 25, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mapTable', name: '작전 지도 테이블', price: 0, w: 2, h: 1, icon: '🗺️', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'planMission', label: '작전 계획 세우기', icon: '🗺️', duration: 35, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'radioStation', name: '무전기', price: 0, w: 1, h: 1, icon: '📻', color: '#33691e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'radioComms', label: '무전 교신하기', icon: '📻', duration: 15, effects: { social: 0.2 }, skill: { key: 'logic', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'armyTruck', name: '군용 트럭', price: 0, w: 2, h: 1, icon: '🚛', color: '#556b2f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'deployMission', label: '작전 출동하기', icon: '🚁', duration: 60, effects: { energy: -0.2, hygiene: -0.3 }, skill: { key: 'fitness', rate: 1 / 80 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'gardenBed', name: '화단', price: 0, w: 2, h: 1, icon: '🌷', color: '#795548', category: 'skill', unlisted: true,
    interactions: [
      { id: 'tendBeds', label: '화단 가꾸기', icon: '🌷', duration: 35, effects: { fun: 0.2, hygiene: -0.1 }, skill: { key: 'gardening', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'pruneShrubs', label: '가지치기', icon: '✂️', duration: 20, effects: { fun: 0.1 }, skill: { key: 'gardening', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'rarePlantCase', name: '희귀 식물 진열장', price: 0, w: 1, h: 1, icon: '🪴', color: '#a5d6a7', category: 'skill', unlisted: true,
    interactions: [
      { id: 'studySpecimens', label: '희귀 식물 관찰하기', icon: '🔍', duration: 25, effects: { fun: 0.15 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'greenhouseControl', name: '온실 제어반', price: 0, w: 1, h: 1, icon: '🌡️', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'adjustClimate', label: '온습도 조절하기', icon: '🌡️', duration: 10, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
      { id: 'stormPrep', label: '폭우 대비하기', icon: '🌧️', duration: 30, effects: { energy: -0.1 }, skill: { key: 'gardening', rate: 1 / 90 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'flowerTable', name: '꽃꽂이 테이블', price: 0, w: 2, h: 1, icon: '💐', color: '#f8bbd0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeFlowers', label: '꽃꽂이하기', icon: '💐', duration: 30, effects: { fun: 0.3 }, skill: { key: 'painting', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'wrapBouquet', label: '꽃다발 포장하기', icon: '🎀', duration: 15, effects: { fun: 0.1 }, skill: { key: 'gardening', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'pottingBench', name: '분갈이 작업대', price: 0, w: 2, h: 1, icon: '🪴', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'repotPlants', label: '분갈이하기', icon: '🪴', duration: 25, effects: { fun: 0.1, hygiene: -0.15 }, skill: { key: 'gardening', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'graftPlants', label: '접목하기', icon: '🌿', duration: 35, effects: { fun: 0.1 }, skill: { key: 'gardening', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'robotBench', name: '로봇 조립대', price: 0, w: 2, h: 1, icon: '🤖', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'assembleRobot', label: '로봇 조립하기', icon: '🤖', duration: 45, effects: { fun: 0.2 }, skill: { key: 'handiness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'calibrateSensors', label: '센서 보정하기', icon: '🎚️', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'circuitStation', name: '회로 작업대', price: 0, w: 1, h: 1, icon: '🔌', color: '#26a69a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'solderCircuit', label: '회로 납땜하기', icon: '🔌', duration: 25, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'testRig', name: '시험 장비', price: 0, w: 2, h: 1, icon: '🧰', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stressTest', label: '내구성 시험하기', icon: '🧰', duration: 30, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'serverRack', name: '서버 랙', price: 0, w: 1, h: 1, icon: '🖧', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'debugFirmware', label: '펌웨어 디버깅하기', icon: '🐞', duration: 35, effects: { fun: -0.05 }, skill: { key: 'programming', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'productionPanel', name: '생산 라인 제어반', price: 0, w: 2, h: 1, icon: '🏭', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'monitorLine', label: '생산 라인 점검하기', icon: '📟', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
      { id: 'fixProductionLine', label: '생산 라인 긴급 수리', icon: '⚠️', duration: 40, effects: { energy: -0.15, hygiene: -0.1 }, skill: { key: 'handiness', rate: 1 / 80 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'waterTestBench', name: '수질 검사대', price: 0, w: 2, h: 1, icon: '💧', color: '#b3e5fc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'testWater', label: '수질 검사하기', icon: '💧', duration: 30, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'logData', label: '조사 기록 정리하기', icon: '📓', duration: 20, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'seedlingNursery', name: '묘목장', price: 0, w: 2, h: 1, icon: '🌱', color: '#795548', category: 'skill', unlisted: true,
    interactions: [
      { id: 'plantSeedlings', label: '묘목 기르기', icon: '🌱', duration: 35, effects: { fun: 0.2, hygiene: -0.1 }, skill: { key: 'gardening', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'specimenTank', name: '해양 생물 수조', price: 0, w: 1, h: 1, icon: '🐠', color: '#0288d1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'monitorSpecies', label: '하천 생물 관찰하기', icon: '🔍', duration: 25, effects: { fun: 0.2 }, skill: { key: 'fishing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'feedSpecies', label: '생물 먹이 주기', icon: '🐟', duration: 10, effects: { fun: 0.2 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'recycleStation', name: '재활용 분류대', price: 0, w: 2, h: 1, icon: '♻️', color: '#43a047', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sortRecycling', label: '재활용 분류하기', icon: '♻️', duration: 20, effects: { hygiene: -0.1 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ecoJeep', name: '현장 조사 차량', price: 0, w: 2, h: 1, icon: '🚙', color: '#689f38', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ecoLoadSurveyGear', label: '조사 장비 싣고 출발 점검하기', icon: '🧭', duration: 25, effects: { fun: 0.1 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'ecoLoadCleanupGear', label: '정화 장비 싣고 안전 점검하기', icon: '♻️', duration: 25, effects: { fun: 0.1 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'fieldSurvey', label: '현장 조사 나가기', icon: '🧭', duration: 45, effects: { fun: 0.2, energy: -0.1 }, skill: { key: 'gardening', rate: 1 / 120 }, requires: 'atWork', offLot: true, pose: 'front' },
      { id: 'cleanupMission', label: '해안 정화 작업', icon: '🌊', duration: 60, effects: { energy: -0.2, hygiene: -0.4 }, skill: { key: 'gardening', rate: 1 / 100 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'materialLibrary', name: '자재 샘플장', price: 0, w: 1, h: 1, icon: '🧱', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'chooseMaterials', label: '자재 고르기', icon: '🧱', duration: 20, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'moodBoard', name: '무드보드', price: 0, w: 2, h: 1, icon: '🖼️', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'makeMoodBoard', label: '무드보드 만들기', icon: '🖼️', duration: 30, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sampleTable', name: '샘플 테이블', price: 0, w: 2, h: 1, icon: '🎨', color: '#bcaaa4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeSamples', label: '샘플 배치하기', icon: '🎨', duration: 15, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'showroomSet', name: '쇼룸 공간', price: 0, w: 3, h: 2, icon: '🛋️', color: '#efebe9', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stageRoom', label: '쇼룸 연출하기', icon: '🛋️', duration: 40, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'decorVan', name: '인테리어 현장 차량', price: 0, w: 2, h: 1, icon: '🚐', color: '#ffab91', category: 'skill', unlisted: true,
    interactions: [
      { id: 'idLoadReveal', label: '공개 현장 샘플·조명 싣기', icon: '📦', duration: 28, effects: { fun: 0.1 }, skill: { key: 'handiness', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
      { id: 'revealDay', label: '리모델링 공개하기', icon: '🏠', duration: 50, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'officeDesk', name: '사무용 책상', price: 0, w: 1, h: 1, icon: '💼', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeReport', label: '보고서 작성하기', icon: '📝', duration: 35, effects: { fun: -0.1 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'crunchNumbers', label: '엑셀 자료 정리하기', icon: '📊', duration: 30, effects: { fun: -0.1 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'copier', name: '복사기', price: 0, w: 1, h: 1, icon: '🖨️', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'makeCopies', label: '복사하기', icon: '🖨️', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'projector', name: '회의실 프로젝터', price: 0, w: 1, h: 1, icon: '📽️', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'rehearsePresentation', label: '발표 연습하기', icon: '🗣️', duration: 20, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'executiveReport', label: '임원 보고하기', icon: '📊', duration: 40, effects: { energy: -0.15 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'memorialAltar', name: '추모 제단', price: 0, w: 3, h: 1, icon: '🕯️', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeAltar', label: '제단 꾸미기', icon: '💐', duration: 25, effects: { fun: 0.05 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'leadMemorial', label: '추모식 진행하기', icon: '🕯️', duration: 45, effects: { social: 0.3, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'wreathStand', name: '조화 스탠드', price: 0, w: 1, h: 1, icon: '💮', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeWreath', label: '조화 정리하기', icon: '💮', duration: 15, effects: { fun: 0.05 }, skill: { key: 'gardening', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'prepTable', name: '안치실 작업대', price: 0, w: 2, h: 1, icon: '⚱️', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'prepareCasket', label: '관 준비하기', icon: '⚱️', duration: 40, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'tidyPrepRoom', label: '안치실 정리하기', icon: '🧹', duration: 15, effects: { hygiene: -0.1 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'funeralDesk', name: '장례 상담 책상', price: 0, w: 1, h: 1, icon: '📋', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'planFuneral', label: '장례 일정 세우기', icon: '📋', duration: 30, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'writeEulogy', label: '추도사 쓰기', icon: '✒️', duration: 30, effects: { fun: 0.05 }, skill: { key: 'writing', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'clubSpeaker', name: '클럽 스피커', access: 'any', price: 0, w: 1, h: 1, icon: '🔊', color: '#212121', category: 'fun', unlisted: true,
    interactions: [
      { id: 'checkSound', label: '음향 점검하기', icon: '🔊', duration: 10, effects: { fun: 0.05 }, skill: { key: 'djMixing', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'recordCrate', name: '레코드 상자', price: 0, w: 1, h: 1, icon: '💿', color: '#5d4037', category: 'fun', unlisted: true,
    interactions: [
      { id: 'digRecords', label: '음반 고르기', icon: '💿', duration: 15, effects: { fun: 0.2 }, skill: { key: 'djMixing', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'danceMirror', name: '연습실 거울', price: 0, w: 2, h: 1, icon: '🪞', color: '#e1f5fe', category: 'skill', unlisted: true,
    interactions: [
      { id: 'practiceChoreo', label: '안무 연습하기', icon: '💃', duration: 40, effects: { fun: 0.3, energy: -0.2, hygiene: -0.2 }, skill: { key: 'dancing', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'balletBarre', name: '발레 바', price: 0, w: 3, h: 1, icon: '🩰', color: '#bcaaa4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stretchRoutine', label: '스트레칭하기', icon: '🧘', duration: 15, effects: { energy: -0.05 }, skill: { key: 'fitness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'performStage', name: '공연 무대', price: 0, w: 5, h: 3, icon: '🎭', color: '#6a1b9a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'rehearseStage', label: '무대 리허설하기', icon: '🎭', duration: 30, effects: { fun: 0.2, energy: -0.15 }, skill: { key: 'dancing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'performShow', label: '공연하기', icon: '🌟', duration: 45, effects: { fun: 0.4, energy: -0.25 }, skill: { key: 'dancing', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'concertStage', name: '콘서트 무대', price: 0, w: 3, h: 2, icon: '🎤', color: '#311b92', category: 'skill', unlisted: true,
    interactions: [
      { id: 'soundcheck', label: '무대 리허설하기', icon: '🎙️', duration: 30, effects: { fun: 0.2 }, skill: { key: 'singing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'liveConcert', label: '라이브 공연하기', icon: '🌟', duration: 45, effects: { fun: 0.4, energy: -0.2 }, skill: { key: 'singing', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'vocalPiano', name: '연습용 피아노', price: 0, w: 2, h: 1, icon: '🎹', color: '#212121', category: 'skill', unlisted: true,
    interactions: [
      { id: 'vocalWarmup', label: '발성 연습하기', icon: '🎶', duration: 20, effects: { fun: 0.1 }, skill: { key: 'singing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'recordingMic', name: '녹음 마이크', price: 0, w: 1, h: 1, icon: '🎙️', color: '#424242', category: 'skill', unlisted: true,
    interactions: [
      { id: 'recordVocals', label: '녹음하기', icon: '🎙️', duration: 40, effects: { fun: 0.2 }, skill: { key: 'singing', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mixingConsole', name: '믹싱 콘솔', price: 0, w: 2, h: 1, icon: '🎚️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mixAlbum', label: '음반 믹싱 확인하기', icon: '🎚️', duration: 20, effects: { fun: 0.1 }, skill: { key: 'djMixing', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lyricDesk', name: '작사 책상', price: 0, w: 1, h: 1, icon: '✒️', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeLyrics', label: '작사하기', icon: '✒️', duration: 30, effects: { fun: 0.1 }, skill: { key: 'writing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'diplomatDesk', name: '외교관 책상', price: 0, w: 1, h: 1, icon: '🗂️', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'translateDocs', label: '외교 문서 번역하기', icon: '📄', duration: 35, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'studyRegion', label: '정세 분석하기', icon: '🗺️', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'negotiationTable', name: '회담 테이블', access: 'any', price: 0, w: 3, h: 1, icon: '🤝', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'conductTalks', label: '실무 협상하기', icon: '🤝', duration: 40, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'emergencySummit', label: '긴급 정상 회담', icon: '🌐', duration: 50, effects: { social: 0.3, energy: -0.15 }, skill: { key: 'charisma', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'flagStand', name: '국기 스탠드', price: 0, w: 1, h: 1, icon: '🎌', color: '#bdbdbd', category: 'decor', unlisted: true,
    interactions: [
      { id: 'adjustFlags', label: '국기 정렬하기', icon: '🎌', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'receptionBuffet', name: '리셉션 뷔페', price: 0, w: 2, h: 1, icon: '🥂', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'hostReception', label: '리셉션 주최하기', icon: '🥂', duration: 30, effects: { social: 0.5, hunger: 0.5 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'gamingRig', name: '방송용 게이밍 PC', price: 0, w: 1, h: 1, icon: '🕹️', color: '#212121', category: 'skill', unlisted: true,
    interactions: [
      { id: 'streamGame', label: '게임 방송하기', icon: '🕹️', duration: 45, effects: { fun: 0.4 }, skill: { key: 'videoGaming', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'readChat', label: '채팅 읽어 주기', icon: '💬', duration: 15, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
      { id: 'donationEvent', label: '후원 이벤트 방송', icon: '💸', duration: 30, effects: { fun: 0.4, social: 0.3 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'mukbangTable', name: '먹방 테이블', price: 0, w: 2, h: 1, icon: '🍜', color: '#ffcc80', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mukbangStream', label: '먹방 하기', icon: '🍜', duration: 30, effects: { hunger: 1.5, fun: 0.3 }, skill: { key: 'comedy', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'greenScreen', name: '그린 스크린', price: 0, w: 2, h: 1, icon: '🟩', color: '#43a047', category: 'skill', unlisted: true,
    interactions: [
      { id: 'filmSkit', label: '콩트 촬영하기', icon: '🎬', duration: 30, effects: { fun: 0.4 }, skill: { key: 'comedy', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'climbingWall', name: '인공 암벽', price: 0, w: 3, h: 1, icon: '🧗', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'climbWall', label: '암벽 오르기', icon: '🧗', duration: 30, effects: { fun: 0.3, energy: -0.3, hygiene: -0.3 }, skill: { key: 'fitness', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'skateRamp', name: '스케이트 램프', price: 0, w: 4, h: 2, icon: '🛹', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'skateTricks', label: '스케이트보드 묘기', icon: '🛹', duration: 25, effects: { fun: 0.4, energy: -0.2 }, skill: { key: 'fitness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'windTunnel', name: '윈드 터널', price: 0, w: 2, h: 2, icon: '🌀', color: '#4fc3f7', category: 'skill', unlisted: true,
    interactions: [
      { id: 'indoorSkydive', label: '실내 스카이다이빙', icon: '🌀', duration: 25, effects: { fun: 0.5, energy: -0.2 }, skill: { key: 'fitness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'gearBench', name: '장비 작업대', price: 0, w: 2, h: 1, icon: '🎒', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'packParachute', label: '낙하산 접기', icon: '🪂', duration: 20, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'checkRopes', label: '로프 점검하기', icon: '🪢', duration: 15, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'jumpPlane', name: '경비행기', price: 0, w: 2, h: 1, icon: '🛩️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'skydiveJump', label: '스카이다이빙 점프하기', icon: '🪂', duration: 60, effects: { fun: 0.6, energy: -0.2 }, skill: { key: 'fitness', rate: 1 / 60 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'meditationMat', name: '명상 매트', price: 0, w: 2, h: 1, icon: '🧘', color: '#a5d6a7', category: 'skill', unlisted: true,
    interactions: [
      { id: 'leadMeditation', label: '명상 지도하기', icon: '🧘', duration: 20, effects: { fun: 0.1 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sandTray', name: '모래 놀이 상자', price: 0, w: 1, h: 1, icon: '🏖️', color: '#ffe0b2', category: 'skill', unlisted: true,
    interactions: [
      { id: 'prepPlayTherapy', label: '놀이 치료 준비하기', icon: '🧸', duration: 15, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'notesDesk', name: '상담사 책상', price: 0, w: 1, h: 1, icon: '🗒️', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeNotes', label: '상담 기록 정리하기', icon: '🗒️', duration: 25, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'studyCase', label: '사례 연구하기', icon: '📚', duration: 30, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'crisisPhone', name: '위기 상담 전화기', price: 0, w: 1, h: 1, icon: '📞', color: '#e57373', category: 'skill', unlisted: true,
    interactions: [
      { id: 'crisisCall', label: '위기 상담하기', icon: '📞', duration: 30, effects: { social: 0.3, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'screenplayDesk', name: '시나리오 책상', price: 0, w: 1, h: 1, icon: '📝', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeScreenplay', label: '시나리오 쓰기', icon: '📝', duration: 40, effects: { fun: 0.1 }, skill: { key: 'writing', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'storyboardWall', name: '콘티 보드', price: 0, w: 2, h: 1, icon: '🗒️', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drawStoryboard', label: '콘티 그리기', icon: '✏️', duration: 30, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'editingSuite', name: '영화 편집실 장비', price: 0, w: 2, h: 1, icon: '🎞️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'editFilm', label: '영화 편집하기', icon: '🎞️', duration: 40, effects: { fun: 0.05 }, skill: { key: 'photography', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'colorGrade', label: '색 보정하기', icon: '🎨', duration: 20, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'screeningScreen', name: '상영관 스크린', price: 0, w: 3, h: 1, icon: '🎦', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'reviewDailies', label: '촬영본 시사하기', icon: '🎦', duration: 20, effects: { fun: 0.2 }, skill: { key: 'writing', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'hostPremiere', label: '시사회 진행하기', icon: '🎞️', duration: 45, effects: { social: 0.4, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'catwalk', name: '워킹 연습 라인', price: 0, w: 4, h: 1, icon: '👠', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'catwalkPractice', label: '워킹 연습하기', icon: '🚶', duration: 25, effects: { fun: 0.2, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'walkFashionShow', label: '쇼 직전 워킹 리허설', icon: '👠', duration: 40, effects: { fun: 0.4, energy: -0.15 }, skill: { key: 'charisma', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'posingSpot', name: '포즈 스팟', price: 0, w: 2, h: 1, icon: '📸', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'practicePoses', label: '포즈 연습하기', icon: '💁', duration: 20, effects: { fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'portfolioShoot', label: '프로필 촬영하기', icon: '📸', duration: 25, effects: { fun: 0.2 }, skill: { key: 'photography', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wardrobeRack', name: '의상 행거', price: 0, w: 2, h: 1, icon: '👗', color: '#bcaaa4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'tryOutfits', label: '의상 피팅하기', icon: '👗', duration: 15, effects: { fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'toyWorkbench', name: '장난감 작업대', price: 0, w: 2, h: 1, icon: '🪵', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'carveToy', label: '나무 장난감 깎기', icon: '🪵', duration: 40, effects: { fun: 0.2 }, skill: { key: 'handiness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'paintToy', label: '장난감 색칠하기', icon: '🖌️', duration: 25, effects: { fun: 0.3 }, skill: { key: 'painting', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'plushTable', name: '봉제 작업대', price: 0, w: 2, h: 1, icon: '🧸', color: '#f8bbd0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sewPlush', label: '봉제 인형 만들기', icon: '🧸', duration: 35, effects: { fun: 0.2 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'playtestMat', name: '놀이 테스트 매트', price: 0, w: 2, h: 1, icon: '🪀', color: '#81d4fa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'playtestToys', label: '장난감 놀이 테스트', icon: '🪀', duration: 20, effects: { fun: 0.6 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wrapStation', name: '포장대', price: 0, w: 2, h: 1, icon: '🎁', color: '#ef9a9a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wrapGifts', label: '선물 포장하기', icon: '🎀', duration: 15, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
      { id: 'rushOrder', label: '긴급 주문 처리하기', icon: '🎁', duration: 40, effects: { energy: -0.15 }, skill: { key: 'handiness', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'toyShelf', name: '장난감 진열장', price: 0, w: 1, h: 1, icon: '🧩', color: '#ffcc80', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeToys', label: '장난감 진열하기', icon: '🧩', duration: 10, effects: { fun: 0.1 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bakeryOven', name: '제빵 오븐', price: 0, w: 1, h: 1, icon: '🍞', color: '#8d6e63', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'bakeBread', label: '빵 굽기', icon: '🍞', duration: 40, effects: { fun: 0.1 }, skill: { key: 'cooking', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'doughTable', name: '반죽대', price: 0, w: 2, h: 1, icon: '🥖', color: '#d7ccc8', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'kneadDough', label: '반죽하기', icon: '🥖', duration: 25, effects: { energy: -0.1 }, skill: { key: 'cooking', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'shapePastry', label: '페이스트리 모양 잡기', icon: '🥐', duration: 20, effects: { fun: 0.1 }, skill: { key: 'cooking', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'bkScoreLoaves', label: '바게트에 쿠프 내기', icon: '🔪', duration: 15, effects: { fun: 0.1 }, skill: { key: 'cooking', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'decorTable', name: '케이크 데코 테이블', price: 0, w: 2, h: 1, icon: '🎂', color: '#fce4ec', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'decorateCake', label: '케이크 데코레이션', icon: '🎂', duration: 35, effects: { fun: 0.3 }, skill: { key: 'painting', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'customCakeRush', label: '맞춤 케이크 완성하기', icon: '🎂', duration: 40, effects: { fun: 0.2, energy: -0.1 }, skill: { key: 'cooking', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'displayCase', name: '빵 진열대', price: 0, w: 2, h: 1, icon: '🥐', color: '#fff8e1', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'arrangeDisplay', label: '진열대 채우기', icon: '🥐', duration: 10, effects: { fun: 0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dentalChair', name: '치과 진료 의자', price: 0, w: 1, h: 2, icon: '🦷', color: '#4dd0e1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'prepareChair', label: '진료 의자 준비하기', icon: '🧻', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
      { id: 'emergencyTooth', label: '응급 치료하기', icon: '😖', duration: 40, effects: { energy: -0.1 }, skill: { key: 'handiness', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'sterilizer', name: '기구 소독기', price: 0, w: 1, h: 1, icon: '♨️', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sterilizeTools', label: '기구 소독하기', icon: '♨️', duration: 15, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dentalLabBench', name: '치과 기공대', price: 0, w: 2, h: 1, icon: '🦷', color: '#e0e0e0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'makeDentalMold', label: '치아 본뜨기', icon: '🦷', duration: 25, effects: { fun: 0.1 }, skill: { key: 'handiness', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dispensingTable', name: '조제대', price: 0, w: 2, h: 1, icon: '⚗️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dispenseMeds', label: '조제하기', icon: '💊', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'urgentPrescription', label: '응급 처방 조제', icon: '🚑', duration: 30, effects: { energy: -0.1 }, skill: { key: 'logic', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'pharmacyShelf', name: '약품 진열장', price: 0, w: 1, h: 1, icon: '🧴', color: '#e8f5e9', category: 'skill', unlisted: true,
    interactions: [
      { id: 'organizeStock', label: '재고 정리하기', icon: '📦', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
      { id: 'checkExpiry', label: '유통기한 점검하기', icon: '📅', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'pharmacyCounter', name: '약국 계산대', price: 0, w: 2, h: 1, icon: '💊', color: '#a5d6a7', category: 'skill', unlisted: true,
    interactions: [
      { id: 'checkPrescription', label: '처방전 검토하기', icon: '📄', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'rxExplainMeds', label: '약 건네며 복약 설명하기', icon: '💊', duration: 20, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'tellerWindow', name: '은행 창구', price: 0, w: 1, h: 1, icon: '🏦', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'processTransaction', label: '입출금 업무 처리', icon: '💵', duration: 20, effects: { social: 0.2 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'countCash', label: '시재 맞추기', icon: '🧮', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'loanDesk', name: '대출 상담 책상', price: 0, w: 1, h: 1, icon: '📑', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'reviewLoan', label: '대출 서류 심사', icon: '📑', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'creditReport', label: '신용 분석하기', icon: '📊', duration: 25, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'tradingTerminal', name: '금융 단말기', price: 0, w: 1, h: 1, icon: '📈', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'monitorMarket', label: '시장 동향 분석', icon: '📈', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'vaultDoor', name: '금고', price: 0, w: 2, h: 1, icon: '🔐', color: '#9e9e9e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'auditVault', label: '금고 점검하기', icon: '🔐', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'vipDesk', name: 'VIP 상담 책상', price: 0, w: 1, h: 1, icon: '💼', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'prepareVipReport', label: '자산 보고서 준비', icon: '📝', duration: 25, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'vipBanking', label: 'VIP 자산 상담', icon: '💼', duration: 40, effects: { social: 0.3, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'accountingDesk', name: '회계 책상', price: 0, w: 1, h: 1, icon: '🧮', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'reconcileBooks', label: '장부 대조하기', icon: '📒', duration: 35, effects: { fun: -0.1 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'prepareTaxReturn', label: '세무 신고서 작성', icon: '🧾', duration: 30, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'deadlineFiling', label: '마감 신고 처리', icon: '⏰', duration: 40, effects: { energy: -0.15 }, skill: { key: 'logic', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'shredder', name: '문서 파쇄기', price: 0, w: 1, h: 1, icon: '🗑️', color: '#616161', category: 'skill', unlisted: true,
    interactions: [
      { id: 'shredDocs', label: '문서 파쇄하기', icon: '🗑️', duration: 10, effects: { fun: 0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'realtorDesk', name: '중개사 책상', price: 0, w: 1, h: 1, icon: '🏠', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'draftContract', label: '계약서 작성하기', icon: '📝', duration: 30, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'searchListings', label: '매물 검색하기', icon: '🔎', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'listingBoard', name: '매물 게시판', price: 0, w: 2, h: 1, icon: '📌', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'updateListings', label: '매물 게시판 정리', icon: '📌', duration: 15, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'realtorCar', name: '회사 차', price: 0, w: 2, h: 1, icon: '🚙', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'reReadyTour', label: '손님 태울 차 준비하기', icon: '🚙', duration: 15, effects: { social: 0.15 }, skill: { key: 'charisma', rate: 1 / 170 }, requires: 'atWork', pose: 'front' },
      { id: 'propertyTour', label: '현장 안내하기', icon: '🏡', duration: 50, effects: { social: 0.4, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'carLift', name: '차량 리프트', price: 0, w: 2, h: 3, icon: '🚗', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'repairEngine', label: '엔진 수리하기', icon: '🔧', duration: 45, effects: { hygiene: -0.2 }, skill: { key: 'handiness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'changeTires', label: '타이어 교체하기', icon: '🛞', duration: 20, effects: { hygiene: -0.1, energy: -0.1 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'emergencyRepair', label: '긴급 수리하기', icon: '🚨', duration: 40, effects: { hygiene: -0.2, energy: -0.15 }, skill: { key: 'handiness', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
      { id: 'mecObdScan', label: 'OBD 스캐너로 진단하기', icon: '🔌', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'diagnosticComputer', name: '차량 진단기', price: 0, w: 1, h: 1, icon: '💻', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'runDiagnostics', label: '차량 진단하기', icon: '📟', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'toolWall', name: '공구 벽', price: 0, w: 2, h: 1, icon: '🧰', color: '#b71c1c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'organizeTools', label: '공구 정리하기', icon: '🧰', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'partsShelf', name: '부품 선반', price: 0, w: 1, h: 1, icon: '⚙️', color: '#607d8b', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sortParts', label: '부품 정리하기', icon: '⚙️', duration: 15, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'cropField', name: '밭', price: 0, w: 3, h: 1, icon: '🥬', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'tendCrops', label: '작물 돌보기', icon: '🌱', duration: 35, effects: { fun: 0.15, hygiene: -0.2 }, skill: { key: 'gardening', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'harvestCrops', label: '수확하기', icon: '🧺', duration: 25, effects: { fun: 0.2, energy: -0.1 }, skill: { key: 'gardening', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'coverCrops', label: '작물 덮기', icon: '⛈️', duration: 30, effects: { energy: -0.15, hygiene: -0.2 }, skill: { key: 'gardening', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'tractor', name: '트랙터', price: 0, w: 2, h: 2, icon: '🚜', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [
      { id: 'plowField', label: '트랙터로 밭 갈기', icon: '🚜', duration: 40, effects: { fun: 0.2, hygiene: -0.2 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'packingTable', name: '포장대', price: 0, w: 2, h: 1, icon: '📦', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'packProduce', label: '농산물 포장하기', icon: '📦', duration: 20, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'seedShelf', name: '씨앗 선반', price: 0, w: 1, h: 1, icon: '🌰', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sortSeeds', label: '씨앗 고르기', icon: '🌰', duration: 15, effects: { fun: 0.05 }, skill: { key: 'gardening', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'farmStand', name: '농산물 가판대', price: 0, w: 2, h: 1, icon: '🥕', color: '#ffcc80', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeStand', label: '가판대 정리하기', icon: '🥕', duration: 10, effects: { fun: 0.05 }, requires: 'atWork', pose: 'front' },
      { id: 'fmSellProduce', label: '제철 채소 달아 판매하기', icon: '🥬', duration: 25, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'fmGuideTour', label: '손님에게 농장 안내하기', icon: '🌱', duration: 25, effects: { social: 0.2 }, skill: { key: 'gardening', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'designDesk', name: '디자인 PC', price: 0, w: 1, h: 1, icon: '🖥️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'designLayout', label: '레이아웃 디자인', icon: '🖥️', duration: 40, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'retouchImage', label: '이미지 보정하기', icon: '🖌️', duration: 20, effects: { fun: 0.05 }, skill: { key: 'photography', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
      { id: 'rushRevision', label: '긴급 수정 작업', icon: '🚨', duration: 40, effects: { energy: -0.15 }, skill: { key: 'painting', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'largePrinter', name: '대형 프린터', price: 0, w: 2, h: 1, icon: '🖨️', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'printProofs', label: '시안 출력하기', icon: '🖨️', duration: 10, effects: { fun: 0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'drawingTabletDesk', name: '작화용 태블릿 책상', price: 0, w: 1, h: 1, icon: '✍️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drawEpisode', label: '원고 그리기', icon: '✍️', duration: 45, effects: { fun: 0.15 }, skill: { key: 'painting', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'colorPanels', label: '채색하기', icon: '🎨', duration: 30, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'deadlineUpload', label: '마감 원고 업로드', icon: '⏰', duration: 40, effects: { energy: -0.15 }, skill: { key: 'painting', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'plotDesk', name: '스토리 책상', price: 0, w: 1, h: 1, icon: '📓', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writePlot', label: '스토리 구상하기', icon: '📓', duration: 30, effects: { fun: 0.1 }, skill: { key: 'writing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'frontDesk', name: '프런트 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'checkInGuests', label: '체크인 처리', icon: '🔑', duration: 20, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'answerPhone', label: '예약 전화 받기', icon: '📞', duration: 15, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
      { id: 'vipCheckIn', label: 'VIP 체크인', icon: '👑', duration: 40, effects: { social: 0.4, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'conciergeDesk', name: '컨시어지 데스크', price: 0, w: 1, h: 1, icon: '🗺️', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'planItinerary', label: '관광 일정 짜 주기', icon: '🗺️', duration: 20, effects: { social: 0.2 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'luggageCart', name: '짐 카트', price: 0, w: 1, h: 1, icon: '🧳', color: '#ffd54f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'deliverLuggage', label: '짐 옮기기', icon: '🧳', duration: 20, effects: { energy: -0.15 }, skill: { key: 'fitness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'hotelBed', name: '객실 침대', price: 0, w: 2, h: 2, icon: '🛏️', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'makeUpRoom', label: '객실 정비하기', icon: '🛏️', duration: 25, effects: { hygiene: -0.1 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'minibar', name: '미니바', price: 0, w: 1, h: 1, icon: '🍫', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'restockMinibar', label: '미니바 채우기', icon: '🍫', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'linenShelf', name: '린넨 선반', price: 0, w: 1, h: 1, icon: '🧺', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'foldLinens', label: '시트 정리하기', icon: '🧺', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'tattooChair', name: '타투 시술 의자', price: 0, w: 1, h: 2, icon: '🖋️', color: '#212121', category: 'skill', unlisted: true,
    interactions: [
      { id: 'prepareStation', label: '시술대 준비하기', icon: '🧤', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
      { id: 'liveTattooDemo', label: '라이브 시연', icon: '🎨', duration: 45, effects: { fun: 0.3, energy: -0.1 }, skill: { key: 'painting', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'flashWall', name: '타투 도안 벽', price: 0, w: 2, h: 1, icon: '🖼️', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'drawFlash', label: '도안 그리기', icon: '✏️', duration: 30, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'talkShowSet', name: '토크쇼 세트', price: 0, w: 3, h: 2, icon: '🎙️', color: '#6a1b9a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'rehearseShow', label: '진행 리허설', icon: '🎙️', duration: 30, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'goLive', label: '생방송 진행하기', icon: '🔴', duration: 45, effects: { social: 0.5, energy: -0.15 }, skill: { key: 'charisma', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'newsDesk', name: '뉴스 데스크', price: 0, w: 2, h: 1, icon: '📰', color: '#1a237e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'readNews', label: '뉴스 원고 연습', icon: '📰', duration: 25, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'cueCardTable', name: '큐카드 책상', price: 0, w: 1, h: 1, icon: '🗒️', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'prepareCueCards', label: '큐카드 준비하기', icon: '🗒️', duration: 15, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'radioBooth', name: '라디오 부스', price: 0, w: 2, h: 1, icon: '📻', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'hostRadio', label: '라디오 진행하기', icon: '📻', duration: 40, effects: { social: 0.4, fun: 0.2 }, skill: { key: 'comedy', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'missionConsole', name: '관제 콘솔', price: 0, w: 2, h: 1, icon: '🖥️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'monitorLaunch', label: '발사 데이터 모니터링', icon: '📡', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'stationComms', label: '우주정거장과 교신하기', icon: '🛰️', duration: 20, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'resolveAnomaly', label: '이상 신호 대응하기', icon: '🚨', duration: 40, effects: { energy: -0.15 }, skill: { key: 'logic', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'spacecraftMockup', name: '우주선 훈련 모형', price: 0, w: 3, h: 2, icon: '🚀', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dockingDrill', label: '도킹 절차 훈련', icon: '🛸', duration: 40, effects: { fun: 0.2 }, skill: { key: 'rocketScience', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'evaDrill', label: '우주 유영 절차 연습', icon: '👨‍🚀', duration: 30, effects: { energy: -0.15 }, skill: { key: 'fitness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'centrifuge', name: '원심 가속기', price: 0, w: 2, h: 2, icon: '🌀', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'gForceTraining', label: '중력 가속도 훈련', icon: '🌀', duration: 30, effects: { energy: -0.25, fun: 0.1 }, skill: { key: 'fitness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'spacesuitDisplay', name: '훈련용 우주복', price: 0, w: 1, h: 1, icon: '🧑‍🚀', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'checkSpacesuit', label: '우주복 점검하기', icon: '🔧', duration: 20, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'sprintTrack', name: '스프린트 레인', price: 0, w: 3, h: 1, icon: '🏃', color: '#e57373', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sprintDrill', label: '스프린트 훈련', icon: '🏃', duration: 30, effects: { energy: -0.3, hygiene: -0.2 }, skill: { key: 'fitness', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'weightRack', name: '웨이트 랙', price: 0, w: 2, h: 1, icon: '🏋️', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'liftWeights', label: '웨이트 트레이닝', icon: '🏋️', duration: 30, effects: { energy: -0.25, hygiene: -0.2 }, skill: { key: 'fitness', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'tacticsBoard', name: '작전판', price: 0, w: 2, h: 1, icon: '📋', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [
      { id: 'studyPlays', label: '작전 분석하기', icon: '📋', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'physioTable', name: '물리 치료대', price: 0, w: 1, h: 2, icon: '💆', color: '#b2dfdb', category: 'skill', unlisted: true,
    interactions: [
      { id: 'getPhysio', label: '물리 치료 받기', icon: '💆', duration: 30, effects: { energy: 0.3, fun: 0.1 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'teamBus', name: '구단 버스', price: 0, w: 2, h: 1, icon: '🚌', color: '#1b5e20', category: 'skill', unlisted: true,
    interactions: [
      { id: 'playMatch', label: '경기 출전하기', icon: '🏟️', duration: 60, effects: { fun: 0.4, energy: -0.3 }, skill: { key: 'fitness', rate: 1 / 50 }, requires: 'workAlarm', offLot: true, pose: 'front' },
      // The kit bags loaded into the luggage bay before an away game (2026-10-27 workplace pipeline).
      { id: 'athLoadKit', label: '원정 장비 싣기', icon: '🧳', duration: 20, effects: { energy: -0.1 }, skill: { key: 'fitness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'salesPhoneDesk', name: '영업용 책상', price: 0, w: 1, h: 1, icon: '📞', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'coldCall', label: '영업 전화 돌리기', icon: '📞', duration: 25, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'writeProposal', label: '제안서 쓰기', icon: '📝', duration: 30, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'contractTable', name: '계약 테이블', price: 0, w: 2, h: 1, icon: '🖋️', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'reviewContract', label: '계약서 검토하기', icon: '📄', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'closeDeal', label: '대형 계약 체결하기', icon: '🤝', duration: 40, effects: { social: 0.5, energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'sampleShelf', name: '제품 샘플 진열대', price: 0, w: 1, h: 1, icon: '📦', color: '#ffcc80', category: 'skill', unlisted: true,
    interactions: [
      { id: 'prepareSamples', label: '제품 샘플 준비하기', icon: '📦', duration: 15, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'standupMic', name: '스탠드 마이크', price: 0, w: 1, h: 1, icon: '🎤', color: '#424242', category: 'skill', unlisted: true,
    interactions: [
      { id: 'tellJokes', label: '스탠드업 연습하기', icon: '🎤', duration: 30, effects: { fun: 0.4 }, skill: { key: 'comedy', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'clubStage', name: '클럽 무대', price: 0, w: 3, h: 2, icon: '🎭', color: '#b71c1c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'rehearseSet', label: '무대 리허설하기', icon: '🎭', duration: 30, effects: { fun: 0.2, energy: -0.1 }, skill: { key: 'comedy', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'headlineShow', label: '메인 공연하기', icon: '🌟', duration: 45, effects: { fun: 0.5, energy: -0.2 }, skill: { key: 'comedy', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'jokeDesk', name: '대본 책상', price: 0, w: 1, h: 1, icon: '📝', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeJokes', label: '개그 대본 쓰기', icon: '📝', duration: 30, effects: { fun: 0.2 }, skill: { key: 'comedy', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'intelDesk', name: '정보 분석 단말기', price: 0, w: 1, h: 1, icon: '🗂️', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'analyzeIntel', label: '첩보 분석하기', icon: '🔎', duration: 35, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'writeBriefing', label: '정보 보고서 작성', icon: '📄', duration: 30, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'situationWall', name: '상황실 대형 화면', price: 0, w: 2, h: 1, icon: '🖥️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'monitorSituation', label: '상황 모니터링', icon: '📡', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'crisisResponse', label: '긴급 상황 대응', icon: '🚨', duration: 40, effects: { energy: -0.15 }, skill: { key: 'logic', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'cyberTerminal', name: '사이버 보안 단말기', price: 0, w: 1, h: 1, icon: '🛡️', color: '#1b5e20', category: 'skill', unlisted: true,
    interactions: [
      { id: 'traceHacker', label: '해킹 시도 추적', icon: '🛡️', duration: 35, effects: { fun: 0.1 }, skill: { key: 'programming', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'writingDesk', name: '집필 책상', price: 0, w: 1, h: 1, icon: '✒️', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeManuscript', label: '원고 쓰기', icon: '📖', duration: 45, effects: { fun: 0.1 }, skill: { key: 'writing', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'writeArticle', label: '기사 쓰기', icon: '📰', duration: 30, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'breakingStory', label: '특종 기사 쓰기', icon: '⚡', duration: 40, effects: { energy: -0.15 }, skill: { key: 'writing', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'proofTable', name: '교정 테이블', price: 0, w: 2, h: 1, icon: '🖍️', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'proofread', label: '교정 보기', icon: '🖍️', duration: 30, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lookbookSet', name: '룩북 촬영 세트', price: 0, w: 3, h: 1, icon: '📸', color: '#f8bbd0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'shootLookbook', label: '룩북 촬영하기', icon: '📸', duration: 35, effects: { fun: 0.3 }, skill: { key: 'photography', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'sponsoredShoot', label: '협찬 촬영하기', icon: '✨', duration: 45, effects: { fun: 0.3, energy: -0.15 }, skill: { key: 'photography', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'styleDesk', name: '스타일 칼럼 책상', price: 0, w: 1, h: 1, icon: '👗', color: '#f48fb1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'writeStyleColumn', label: '패션 칼럼 쓰기', icon: '✍️', duration: 35, effects: { fun: 0.1 }, skill: { key: 'writing', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
      { id: 'planOutfits', label: '코디 기획하기', icon: '🧥', duration: 25, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'espressoMachine', name: '에스프레소 머신', price: 0, w: 1, h: 1, icon: '☕', color: '#9e9e9e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pullEspresso', label: '에스프레소 추출하기', icon: '☕', duration: 15, effects: { fun: 0.05 }, skill: { key: 'mixology', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'latteArt', label: '라테 아트 하기', icon: '🎨', duration: 20, effects: { fun: 0.2 }, skill: { key: 'mixology', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
      { id: 'groupOrder', label: '단체 주문 만들기', icon: '🧾', duration: 40, effects: { energy: -0.15 }, skill: { key: 'mixology', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'cafeCounter', name: '카페 계산대', price: 0, w: 2, h: 1, icon: '🧾', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'takeOrders', label: '주문 받기', icon: '🧾', duration: 20, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'beanRoaster', name: '원두 그라인더', price: 0, w: 1, h: 1, icon: '🫘', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'grindBeans', label: '원두 분쇄하기', icon: '🫘', duration: 15, effects: { fun: -0.05 }, skill: { key: 'mixology', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'fryer', name: '튀김기', price: 0, w: 1, h: 1, icon: '🍟', color: '#b0bec5', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'fryFries', label: '감자튀김 튀기기', icon: '🍟', duration: 15, effects: { hygiene: -0.1 }, skill: { key: 'cooking', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'grillTop', name: '버거 그릴', price: 0, w: 1, h: 1, icon: '🍔', color: '#616161', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'grillBurgers', label: '버거 굽기', icon: '🍔', duration: 20, effects: { hygiene: -0.1 }, skill: { key: 'cooking', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'rushHour', label: '밀린 주문 처리하기', icon: '🔥', duration: 40, effects: { energy: -0.2, hygiene: -0.15 }, skill: { key: 'cooking', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'burgerCounter', name: '주문 카운터', price: 0, w: 2, h: 1, icon: '🧾', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [
      { id: 'serveTray', label: '주문 내주기', icon: '🍱', duration: 15, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'trashStation', name: '분리수거대', price: 0, w: 1, h: 1, icon: '🗑️', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'clearTrays', label: '테이블 정리하기', icon: '🧽', duration: 15, effects: { hygiene: -0.1 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'clothesShelf', name: '의류 진열대', price: 0, w: 1, h: 1, icon: '👕', color: '#bcaaa4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'foldClothes', label: '옷 개어 진열하기', icon: '👕', duration: 20, effects: { fun: -0.05 }, skill: { key: 'charisma', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
      { id: 'restockShelves', label: '재고 채우기', icon: '📦', duration: 20, effects: { energy: -0.1 }, skill: { key: 'fitness', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'checkoutCounter', name: '계산대', price: 0, w: 2, h: 1, icon: '💳', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ringUp', label: '계산하기', icon: '💳', duration: 15, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'flashSale', label: '세일 손님 계산하기', icon: '🏷️', duration: 40, effects: { social: 0.3, energy: -0.15 }, skill: { key: 'charisma', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'fittingRoom', name: '피팅룸', price: 0, w: 1, h: 1, icon: '🚪', color: '#ce93d8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'tidyFittingRoom', label: '피팅룸 정리하기', icon: '🧹', duration: 15, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
      { id: 'rtPassSize', label: '다른 사이즈 건네주기', icon: '📏', duration: 15, effects: { social: 0.15 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'storyCorner', name: '동화 코너 매트', price: 0, w: 2, h: 1, icon: '📚', color: '#fff176', category: 'skill', unlisted: true,
    interactions: [
      { id: 'readStory', label: '동화 읽어 주기', icon: '📖', duration: 25, effects: { social: 0.3, fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'craftTable', name: '만들기 책상', price: 0, w: 2, h: 1, icon: '✂️', color: '#ffcc80', category: 'skill', unlisted: true,
    interactions: [
      { id: 'craftWithKids', label: '만들기 활동하기', icon: '✂️', duration: 30, effects: { fun: 0.3 }, skill: { key: 'painting', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'napMats', name: '낮잠 매트', price: 0, w: 2, h: 1, icon: '😴', color: '#90caf9', category: 'skill', unlisted: true,
    interactions: [
      { id: 'settleNap', label: '낮잠 재우기', icon: '🌙', duration: 25, effects: { fun: -0.05 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'sootheCrying', label: '우는 아이 달래기', icon: '🤗', duration: 30, effects: { energy: -0.1 }, skill: { key: 'charisma', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'snackCounter', name: '간식대', price: 0, w: 1, h: 1, icon: '🧃', color: '#a5d6a7', category: 'kitchen', unlisted: true,
    interactions: [
      { id: 'prepareSnack', label: '간식 준비하기', icon: '🍎', duration: 20, effects: { fun: 0.05 }, skill: { key: 'cooking', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'lawnMower', name: '잔디 깎는 기계', price: 0, w: 1, h: 1, icon: '🌱', color: '#43a047', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mowLawn', label: '잔디 깎기', icon: '🌱', duration: 30, effects: { energy: -0.2, hygiene: -0.2 }, skill: { key: 'gardening', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wheelbarrow', name: '외바퀴 수레', price: 0, w: 1, h: 1, icon: '🛒', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'haulSoil', label: '흙 나르기', icon: '🪨', duration: 25, effects: { energy: -0.25, hygiene: -0.2 }, skill: { key: 'fitness', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'materialPile', name: '자재 더미', price: 0, w: 2, h: 1, icon: '🧱', color: '#bf360c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'stackBricks', label: '벽돌 쌓기', icon: '🧱', duration: 30, effects: { energy: -0.2, hygiene: -0.15 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'coverMaterials', label: '자재에 덮개 씌우기', icon: '⛈️', duration: 30, effects: { energy: -0.15 }, skill: { key: 'fitness', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'scrimStation', name: '연습용 게이밍 PC', price: 0, w: 1, h: 1, icon: '🎮', color: '#212121', category: 'skill', unlisted: true,
    interactions: [
      { id: 'scrimPractice', label: '스크림 연습하기', icon: '🎮', duration: 45, effects: { fun: 0.3 }, skill: { key: 'videoGaming', rate: 1 / 70 }, requires: 'atWork', pose: 'front' },
      { id: 'soloQueue', label: '개인 랭크 연습하기', icon: '🏅', duration: 30, effects: { fun: 0.3 }, skill: { key: 'videoGaming', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'replayScreen', name: '경기 분석 스크린', price: 0, w: 2, h: 1, icon: '📺', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'reviewReplay', label: '경기 영상 분석하기', icon: '📺', duration: 30, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'teamVan', name: '게임단 차량', price: 0, w: 2, h: 1, icon: '🚐', color: '#311b92', category: 'skill', unlisted: true,
    interactions: [
      { id: 'leagueMatch', label: '리그 경기 출전하기', icon: '🏆', duration: 60, effects: { fun: 0.4, energy: -0.2 }, skill: { key: 'videoGaming', rate: 1 / 50 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  {
    id: 'urn',
    name: '유골함',
    price: 50,
    w: 1,
    h: 1,
    icon: '⚱️',
    color: '#b0a089',
    category: 'decor',
    interactions: [
      { id: 'mourn', label: '애도하기', icon: '🕯️', duration: 20, effects: { social: 0.4 }, moods: ['sad'], pose: 'front' },
    ],
  },
  {
    id: 'burglarAlarm',
    name: '도난 경보기',
    price: 250,
    w: 1,
    h: 1,
    icon: '🚨',
    color: '#ffcdd2',
    category: 'decor',
    interactions: [],
  },
];

// Work-lot furniture kept in its own file (catalogKorea.ts).
CATALOG.push(...KOREA_OBJECTS);
// Furniture made workplace by workplace (workFurniture/).
CATALOG.push(...WORK_FURNITURE);
// For the house: the cleaning tools, and work pieces that suit a home (homeFurniture.ts).
CATALOG.push(...CLEANING_TOOLS, ...ALL_RUG_DEFS);
CATALOG.push(...homeFromWork((id) => CATALOG.find((d) => d.id === id)));

export const CATALOG_BY_ID: Record<string, ObjectDef> = Object.fromEntries(CATALOG.map((d) => [d.id, d]));

export const CATEGORY_LABEL: Record<Category, string> = {
  comfort: '편의',
  kitchen: '주방',
  bathroom: '욕실',
  fun: '오락',
  skill: '자기계발',
  decor: '장식',
};

/** Plumbing and appliances wear out with use and can break (참고 게임 commodity_Object_Brokenness). */
export const WEARABLE = new Set(['camera', 'telescope', 'toilet', 'shower', 'bathtub', 'sink', 'kitchenSink', 'coffeeMaker', 'stove', 'fridge', 'deluxeStove', 'deluxeFridge', 'tv', 'bigTv', 'computer', 'gamingComputer', 'stereo']);
/** 참고 게임 loot_Statistic_Breakage_Shower: each use has a 67% chance to take 6.7 off; broken at ≤30. */
export const WEAR_CHANCE = 0.67;
export const WEAR_PER_USE = 6.7;
export const BROKEN_AT = 30;

const REPAIR: InteractionDef = { id: 'repair', label: '수리하기', icon: '🔧', duration: 120, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: LEARN.chore }, special: 'repair', requires: 'broken', pose: 'front' };

/** 참고 게임 object_RepairElectrical: these can shock whoever fixes them. */
export const ELECTRONICS = new Set(['tv', 'bigTv', 'computer', 'gamingComputer', 'stereo']);

/** Objects dwellers can watch from a nearby sofa. */
export const TVS = new Set(['tv', 'bigTv']);

/**
 * Minutes a repair takes by handiness (참고 게임 goal_completion_time curve: level 1 120, 10 40) and the
 * chance an electronics repair ends in a shock (Loot_Repair_Death_Electrocution: 30% to level 4,
 * 15% to 9, 10% at 10; nobody dies here).
 */
export function repairTime(handiness: number): number {
  const level = Math.max(1, Math.min(10, Math.floor(handiness)));
  return 120 - ((level - 1) * 80) / 9;
}
export function shockChance(handiness: number): number {
  const level = Math.floor(handiness);
  return level >= 10 ? 0.1 : level >= 5 ? 0.15 : 0.3;
}
for (const def of CATALOG) if (WEARABLE.has(def.id)) def.interactions.push(REPAIR);

/**
 * Fixtures that get grimy with use (참고 게임 commodity_dirtiness on toilets, showers, tubs and sinks:
 * -100..100, Dirty_Dirty at -50 or below; clean again above 50). How much a use soils them is ours.
 */
export const SOILABLE = new Set(['toilet', 'shower', 'bathtub', 'sink', 'kitchenSink']);
export const DIRT_PER_USE = 12;
export const DIRTY_AT = -50;
/** 참고 게임 toilet_Clean / shower_Clean: about 8 a minute back towards spotless (ours: 10). */
export const CLEAN_RATE = 10;
const CLEAN: InteractionDef = { id: 'clean', label: '청소하기', icon: '🧽', duration: 25, effects: { hygiene: -0.05 }, special: 'clean', requires: 'dirty', pose: 'front' };
for (const def of CATALOG) if (SOILABLE.has(def.id)) def.interactions.push(CLEAN);
/** A materialistic dweller admiring what they own (참고 게임 object_Materialistic_AdmirePossessions; which objects, ours: §400 and up). */
const ADMIRE: InteractionDef = { id: 'admireStuff', label: '물건 감상하기', icon: '💎', duration: 10, effects: { fun: 0.4 }, requires: 'materialistic', pose: 'front' };
for (const def of CATALOG) if (def.price >= 400) def.interactions.push(ADMIRE);
for (const u of UPGRADES) {
  for (const id of u.objects) {
    CATALOG_BY_ID[id]?.interactions.push({ id: `upgrade_${u.id}`, label: `업그레이드: ${u.label}`, icon: '🛠️', duration: UPGRADE_TIME, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: LEARN.practice }, special: 'upgrade', upgrade: u.id, requires: 'upgradable', autonomous: false, cost: UPGRADE_COST, pose: 'front' });
  }
}

export function getDef(defId: string): ObjectDef {
  const def = CATALOG_BY_ID[defId];
  if (!def) throw new Error(`Unknown object ${defId}`);
  return def;
}
