import type { ObjectDef } from '../types';

/**
 * New furniture for the 영화 제작사 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean film production company has besides its writers' desks, its camera, its editing suite and
 * its screening room — the audition corner (a grey backdrop with the actor's tape mark in front of
 * it, a stool, a camcorder on its tripod and the casting table with the headshots), the production
 * board with the 촬영 일정 and the day's call sheet, the wall of the company's own films' posters,
 * the props and costume rack, a little test set (a room's corner under its lights) to block a scene
 * on, the ADR booth where a guide track is voiced to picture, the screening room's seats, and the
 * folding chairs auditioning actors wait on. The company (별빛필름) and its films are made up. Drawn
 * in view3d/workplaces/filmmaker.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'fmCastingCorner', name: '오디션 촬영 코너', price: 0, w: 2, h: 2, icon: '🎭', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'fmReviewHeadshots', label: '배우 프로필 검토하기', icon: '📸', duration: 20, effects: { fun: 0.05 }, skill: { key: 'charisma', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'fmScheduleBoard', name: '촬영 일정 보드', price: 0, w: 2, h: 1, icon: '🗓️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'fmCallSheet', label: '일일 촬영 계획표 짜기', icon: '🗓️', duration: 20, effects: { fun: -0.02 }, skill: { key: 'leadership', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'fmPosterWall', name: '개봉작 포스터 월', price: 0, w: 2, h: 1, icon: '🎞️', color: '#212121', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'fmCostumeRack', name: '소품·의상 랙', price: 0, w: 2, h: 1, icon: '👗', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'fmCheckProps', label: '소품·의상 챙기기', icon: '👗', duration: 15, effects: { fun: 0.05 }, skill: { key: 'painting', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'fmSetCorner', name: '테스트 촬영 세트', price: 0, w: 3, h: 2, icon: '🎬', color: '#bcaaa4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'fmBlockScene', label: '배우 동선 잡기', icon: '🎭', duration: 25, effects: { fun: 0.1 }, skill: { key: 'leadership', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'fmAdrBooth', name: '후시 녹음 부스', price: 0, w: 2, h: 1, icon: '🎙️', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'fmRecordAdr', label: '가이드 더빙 녹음하기', icon: '🎙️', duration: 25, effects: { fun: 0.1, energy: -0.05 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'fmCinemaSeat', name: '시사실 좌석', price: 0, w: 1, h: 1, icon: '💺', color: '#8e1b25', category: 'comfort', unlisted: true,
    interactions: [
      { id: 'fmWatchCut', label: '편집본 감상하기', icon: '🎞️', duration: 30, effects: { fun: 0.25, energy: 0.03 }, skill: { key: 'writing', rate: 1 / 200 }, requires: 'atWork', pose: 'on' },
    ],
  },
  {
    id: 'fmAuditionChair', name: '오디션 대기 의자', price: 0, w: 1, h: 1, icon: '🪑', color: '#37474f', category: 'decor', unlisted: true,
    interactions: [],
  },
];
