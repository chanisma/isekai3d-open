import type { ObjectDef } from '../types';

/**
 * New furniture for the painters' studio (화실; 2026-10-27 workplace pipeline, at the user's request):
 * what a working studio was missing — the model stand with a still life set up under its lamp for
 * the easels round it, the taboret on casters with the palette, the tubes and the brush jars, the
 * paint-spattered sink the brushes are washed in, the bench where canvas is stretched and work is
 * framed, the rack of canvases (and the wire rack drying the day's sheets), and the crit wall the
 * work is pinned up on to be talked over and an exhibition hung on paper. The ids start `pnt`.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'pntStillLife', name: '정물대', price: 0, w: 1, h: 1, icon: '🍎', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pntArrangeStillLife', label: '정물 배치하기', icon: '🍎', duration: 15, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'pntPaintCart', name: '물감 카트', price: 0, w: 1, h: 1, icon: '🎨', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pntMixPaint', label: '물감 조색하기', icon: '🎨', duration: 15, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'pntBrushSink', name: '붓 세척 싱크', price: 0, w: 1, h: 1, icon: '🖌️', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pntWashBrushes', label: '붓 빨기', icon: '🖌️', duration: 10, effects: { hygiene: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'pntFramingTable', name: '캔버스·액자 작업대', price: 0, w: 2, h: 1, icon: '🖼️', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pntStretchCanvas', label: '캔버스 천 씌우기', icon: '🔨', duration: 20, effects: { energy: -0.05 }, skill: { key: 'handiness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
      { id: 'pntFrameWork', label: '작품 액자에 넣기', icon: '🖼️', duration: 15, effects: { fun: 0.05 }, skill: { key: 'painting', rate: 1 / 220 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'pntCanvasRack', name: '캔버스 랙', price: 0, w: 2, h: 1, icon: '🗄️', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
  { id: 'pntCritWall', name: '크리틱 벽', price: 0, w: 2, h: 1, icon: '📌', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  // The store and the gallery (2026-11-05, the layout audit): what the studio was missing besides its easels — the shelves of paint,
  // canvas and solvent, the rack the wet canvases dry in, the gallery's hung walls with their captions, a sculpture on its plinth, the
  // bench to look from, and the studio's sign on the pavement.
  { id: 'pntSupplyShelf', name: '물감·재료 선반', price: 0, w: 2, h: 1, icon: '🧴', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
  { id: 'pntDryingRack', name: '유화 건조대', price: 0, w: 2, h: 1, icon: '🖼️', color: '#6d4c41', category: 'decor', unlisted: true, interactions: [] },
  { id: 'pntGalleryWall', name: '소품 전시 벽·캡션', price: 0, w: 2, h: 1, icon: '🖼️', color: '#fafafa', category: 'decor', unlisted: true, interactions: [] },
  { id: 'pntPlinth', name: '조각 좌대', price: 0, w: 1, h: 1, icon: '🗿', color: '#f5f5f5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'pntGalleryBench', name: '전시실 벤치', price: 0, w: 2, h: 1, icon: '🪑', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
  { id: 'pntSign', name: '화실 입간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#37474f', category: 'decor', unlisted: true, interactions: [] },
];
