import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 인공지능 연구소 (2026-11-01, a new career and workplace at the user's request): desks with a training dashboard whose loss
 * really falls, a labelling station, a whiteboard for arguing over papers, a small GPU rack, a demo screen whose invented
 * assistant sometimes answers wrongly, a wall of results, a corner for reading printed papers and a poster board.
 * Drawn in view3d/workplaces/aiResearcher.ts (with aiResearcherMotion.ts). The company, models and assistant are made up.
 */
const job = (id: string, label: string, icon: string, duration: number, effects: InteractionDef['effects'], key: NonNullable<InteractionDef['skill']>['key'], rate: number): InteractionDef => ({
  id,
  label,
  icon,
  duration,
  effects,
  skill: { key, rate: 1 / rate },
  requires: 'atWork',
  pose: 'front',
});

export const OBJECTS: ObjectDef[] = [
  {
    id: 'arTrainDesk', name: '학습 현황 책상', price: 0, w: 2, h: 1, icon: '📉', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [job('arTrain', '모델 학습 돌리고 곡선 지켜보기', '📉', 30, { fun: -0.03 }, 'programming', 90), job('arTune', '학습 설정 고치기', '⌨️', 28, { fun: -0.03 }, 'programming', 100)],
  },
  {
    id: 'arLabelStation', name: '데이터 라벨링 책상', price: 0, w: 2, h: 1, icon: '🖼️', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [job('arLabel', '이미지에 상자 치고 이름 붙이기', '🖼️', 25, { fun: -0.05 }, 'logic', 130), job('arAudit', '라벨 검수하기', '✅', 22, { fun: -0.03 }, 'logic', 120)],
  },
  { id: 'arPaperBoard', name: '논문 토론 화이트보드', price: 0, w: 3, h: 1, icon: '📝', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('arDiscuss', '논문 수식 풀며 토론하기', '📝', 30, { social: 0.2 }, 'logic', 90)] },
  {
    id: 'arGpuRack', name: '소형 GPU 랙', price: 0, w: 2, h: 1, icon: '🖥️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [job('arGpuCheck', '랙 온도 재고 작업 배정하기', '🌡️', 22, { fun: -0.03 }, 'programming', 130), job('arGpuSwap', 'GPU 카드 교체하기', '🔧', 28, { energy: -0.08 }, 'programming', 120)],
  },
  {
    id: 'arDemoScreen', name: '시연 화면', price: 0, w: 3, h: 1, icon: '💬', color: '#1a237e', category: 'skill', unlisted: true,
    interactions: [
      job('arDemo', '사내 시연하기', '💬', 28, { social: 0.25 }, 'programming', 110),
      job('arAskTest', '질문 넣어 오답 찾기', '❓', 25, { fun: 0.03 }, 'logic', 110),
      { ...job('arWrongAlarm', '서비스 오답 소동 수습하기', '🚨', 40, { energy: -0.15 }, 'programming', 60), requires: 'workAlarm' },
    ],
  },
  { id: 'arEvalWall', name: '평가 결과 벽', price: 0, w: 3, h: 1, icon: '📊', color: '#455a64', category: 'skill', unlisted: true, interactions: [job('arEval', '평가 결과 비교해 붙이기', '📊', 25, { fun: -0.03 }, 'logic', 100)] },
  { id: 'arReadingNook', name: '논문 읽는 코너', price: 0, w: 2, h: 2, icon: '📄', color: '#8d6e63', category: 'skill', unlisted: true, interactions: [job('arRead', '출력한 논문 읽기', '📄', 30, { energy: 0.03 }, 'logic', 100)] },
  {
    id: 'arPosterBoard', name: '포스터 세션 보드', price: 0, w: 2, h: 1, icon: '📌', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [job('arPoster', '포스터 앞에서 발표하기', '🎤', 25, { social: 0.25 }, 'logic', 110), job('arPin', '새 포스터 붙이기', '📌', 15, { fun: 0.02 }, 'logic', 200)],
  },
  { id: 'arPrinter', name: '논문 프린터', price: 0, w: 1, h: 1, icon: '🖨️', color: '#cfd8dc', category: 'decor', unlisted: true, interactions: [] },
  { id: 'arPaperCart', name: '논문·교재 카트', price: 0, w: 1, h: 1, icon: '📚', color: '#78909c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'arModelMap', name: '모델 구조도 패널', price: 0, w: 2, h: 1, icon: '🧩', color: '#283593', category: 'decor', unlisted: true, interactions: [] },
  { id: 'arLabSign', name: '연구소 입구 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#1a237e', category: 'decor', unlisted: true, interactions: [] },
];
