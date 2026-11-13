import { describe, expect, it } from 'vitest';
import type { CloudPort } from './aiQuestions';
import { levelOf } from './careers';
import { readEpisode } from './episodes';
import { Game } from './game';

const OUTLINE = {
  title: '새벽의 서버실',
  genre: '직장 미스터리',
  logline: '서버가 밤마다 꺼지는 이유를 쫓는 이야기',
  cast: [
    { key: 'c801', name: '김지훈', role: '팀장', gender: 'male', new: false },
    { key: 'n1', name: '한소희', role: '보안 감사관', gender: 'female', new: true },
  ],
  beats: ['서버가 꺼진다', '범인을 쫓는다', '진실이 드러난다'],
  ending: '팀이 하나가 된다',
};
const SCENE = {
  title: '꺼진 불빛',
  place: '서버실',
  lines: [
    { who: 'narration', text: '새벽 세 시, 서버실 불이 꺼졌어요.' },
    { who: 'c801', text: '{n}, 어제 마지막으로 나간 사람이 누구죠?' },
    { who: 'n1', text: '오늘부터 이 팀을 감사하게 됐어요.' },
    { who: 'me', text: '제가 확인해 볼게요.' },
  ],
  question: '{n:은/는} 어떻게 할까요?',
  choices: [
    { text: '기록을 뒤져 본다', effects: { perf: 5, friend: { c801: 6 }, mood: 'focused' } },
    { text: '감사관에게 먼저 묻는다', result: '{n:이/가} 묻자 감사관이 뜻밖에 웃으며 비밀을 하나 알려 줘요.', effects: { perf: -2, friend: { n1: 10 } } },
  ],
  free: { effects: {} },
  final: false,
};

/** A fake 스페이스기전 that has one scene ready. */
function fakeCloud(log: string[]): CloudPort {
  return {
    careerCard: () => {},
    thought: () => {},
    answered: () => {},
    knowledgeChanged: () => {},
    episodes: {
      take: (_req, found) => {
        log.push('take');
        found({ sceneId: 's1', episodeId: 'e1', idx: 0, scene: SCENE, outline: OUTLINE });
      },
      fill: () => log.push('fill'),
      answer: (id, choice, text) => log.push(`answer ${id} ${choice} ${text}`),
    },
  };
}

function techWorker(log: string[]) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.4);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  g.cloud = fakeCloud(log);
  const dweller = g.state.dwellers[0];
  g.acceptJob(dweller.id, 'tech');
  g.setFollowWork(dweller.id, false);
  return { g, dweller };
}

function toShift(g: Game, dweller: ReturnType<typeof techWorker>['dweller']) {
  const lvl = levelOf(dweller.job!);
  let day = Math.floor(g.state.time / 1440) + 1;
  while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
  g.state.time = day * 1440 + lvl.start - 61;
  dweller.job!.lastWorkDay = day - 1;
  return day;
}

describe('work episodes (episodes.ts, 2026-10-25)', () => {
  it('reads the server’s scene again, and turns down one that won’t do', () => {
    expect(readEpisode(OUTLINE, SCENE)?.scene.choices).toHaveLength(2);
    expect(readEpisode(OUTLINE, { ...SCENE, choices: [SCENE.choices[0]] })).toBeNull();
    // A line by someone not in the cast is dropped.
    expect(readEpisode(OUTLINE, { ...SCENE, lines: [...SCENE.lines, { who: 'c999', text: '누구?' }] })?.scene.lines).toHaveLength(4);
  });

  it('the first shift writes the season ahead; an episode day has a scene instead of the card, and the decision counts', () => {
    const log: string[] = [];
    const { g, dweller } = techWorker(log);
    const day = toShift(g, dweller);
    for (let t = 0; t < 75; t += 0.5) g.step(0.5);
    expect(log).toContain('fill');
    expect(dweller.job!.episodeDay).toBe(day + 1);
    // The next working day: the scene an hour in, no card.
    dweller.away = null;
    toShift(g, dweller);
    for (let t = 0; t < 75 + 60; t += 0.5) g.step(0.5);
    expect(g.state.careerEvent).toBeUndefined();
    expect(g.state.episode?.sceneId).toBe('s1');
    expect(g.state.speed).toBe(0);
    // Someone new to the story is at work now, theirs.
    const newcomer = g.state.townies!.find((t) => t.episodeKey === 'e1:n1')!;
    expect(newcomer.name).toBe('한소희');
    expect(newcomer.episodeOf).toBe(dweller.id);
    const before = dweller.job!.performance;
    g.answerEpisode(1);
    expect(dweller.job!.performance).toBe(before - 2);
    expect(g.relationship(dweller.id, newcomer.id).friend).toBeGreaterThanOrEqual(10);
    expect(log.some((l) => l === 'answer s1 1 null')).toBe(true);
    expect(g.state.episode).toBeUndefined();
    expect(dweller.job!.episodeDay).toBeGreaterThanOrEqual(Math.floor(g.state.time / 1440) + 2);
    // What it came to, on screen (2026-10-26): the choice, what happened, and what it changed.
    expect(g.state.workResult).toMatchObject({
      kind: 'episode',
      chose: '감사관에게 먼저 묻는다',
      text: `${dweller.name}${dweller.name.endsWith('준') ? '이' : '가'} 묻자 감사관이 뜻밖에 웃으며 비밀을 하나 알려 줘요.`,
      perf: -2,
      friends: [{ name: '한소희', n: 10 }],
      next: 'scene',
    });
    expect(g.state.speed).toBe(0);
    g.closeWorkResult();
    expect(g.state.workResult).toBeUndefined();
  });

  it('the player’s own words go to the server and count a little', () => {
    const log: string[] = [];
    const { g, dweller } = techWorker(log);
    toShift(g, dweller);
    dweller.job!.episodeDay = 0;
    for (let t = 0; t < 75 + 60; t += 0.5) g.step(0.5);
    const before = dweller.job!.performance;
    g.answerEpisode(null, '팀장님께 솔직하게 말한다');
    expect(dweller.job!.performance).toBe(before + 2);
    expect(log).toContain('answer s1 null 팀장님께 솔직하게 말한다');
  });

  it('followed to work, someone new to the story walks onto the lot that day (2026-10-26)', () => {
    const log: string[] = [];
    const { g, dweller } = techWorker(log);
    g.setFollowWork(dweller.id, true);
    toShift(g, dweller);
    dweller.job!.episodeDay = 0;
    for (let t = 0; t < 75 + 60 && !g.state.episode; t += 0.5) g.step(0.5);
    expect(g.state.episode?.sceneId).toBe('s1');
    const work = g.workGames.get(dweller.id)!;
    const newcomer = g.state.townies!.find((t) => t.episodeKey === 'e1:n1')!;
    const there = work.state.dwellers.find((s) => s.id === newcomer.id);
    expect(there?.name).toBe('한소희');
    expect(there?.npc?.role).toBe('coworker');
    expect(there?.npc?.until).toBe(work.state.workplace!.end);
    g.answerEpisode(1);
    // The friendship the scene gave is the one at work too.
    expect(work.relationship(dweller.id, newcomer.id).friend).toBeGreaterThanOrEqual(10);
    // Taking the same scene again doesn't bring a second of her.
    expect(work.state.dwellers.filter((s) => s.name === '한소희')).toHaveLength(1);
  });
});
