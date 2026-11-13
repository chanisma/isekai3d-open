import type { ObjectDef } from '../types';

/**
 * New furniture for the city library (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 시립 도서관 has besides its loan desk, stacks, cataloguing PC, scanner and story corner — the
 * long reading tables with their green-shaded lamps and the wooden chairs at them (where the users
 * sit, and are brought a book or a search slip), the 자료 검색 kiosk with the shelf map, the book truck
 * of returns waiting to be sorted, the 24-hour book drop by the door, and the low face-out shelf of
 * picture books in the children's room. Drawn in view3d/workplaces/librarian.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'libReadingTable', name: '열람 테이블', price: 0, w: 2, h: 1, icon: '📖', color: '#c8a27a', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'libReadingChair', name: '열람석 의자', price: 0, w: 1, h: 1, icon: '🪑', color: '#a1887f', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'libSearchKiosk', name: '자료 검색대', price: 0, w: 1, h: 1, icon: '🔎', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'libUpdateKiosk', label: '신착 도서 안내 올리기', icon: '🔎', duration: 15, effects: { fun: -0.02 }, skill: { key: 'programming', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'libBookCart', name: '반납 도서 북트럭', price: 0, w: 1, h: 1, icon: '🛒', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'libSortReturns', label: '반납 도서 분류하기', icon: '🔢', duration: 20, effects: { fun: -0.03 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'libReturnBox', name: '무인 도서 반납함', price: 0, w: 1, h: 1, icon: '📦', color: '#1e88e5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'libEmptyReturns', label: '반납함 비우기', icon: '📦', duration: 15, effects: { energy: -0.03 }, skill: { key: 'fitness', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'libPictureShelf', name: '그림책 서가', price: 0, w: 2, h: 1, icon: '🧸', color: '#ffe082', category: 'skill', unlisted: true,
    interactions: [
      { id: 'libPickStorybook', label: '읽어 줄 그림책 고르기', icon: '📗', duration: 15, effects: { fun: 0.1 }, skill: { key: 'charisma', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
