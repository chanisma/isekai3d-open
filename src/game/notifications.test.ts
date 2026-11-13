import { describe, expect, it } from 'vitest';
import { Game } from './game';
import type { Dweller } from './types';

const two = () =>
  Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    () => 0.5,
  );

describe('notifications after 참고 게임 (UiDialogNotification, ScreenSlam)', () => {
  it('knows which dweller a notification is about, so their face shows', () => {
    const g = two();
    const [a, b] = g.state.dwellers;
    g.notify(`${b.name}의 요리 스킬이 3레벨이 됐어요! 🎉`, 'good');
    expect(g.toasts.at(-1)!.dwellerId).toBe(b.id);
    g.notify(`${a.name}와 ${b.name}이 친해졌어요`, 'good');
    expect(g.toasts.at(-1)!.dwellerId).toBe(a.id);
    g.notify('🧹 가정부가 매일 오도록 했어요', 'info');
    expect(g.toasts.at(-1)!.dwellerId).toBeUndefined();
  });

  it('marks dangers as urgent', () => {
    const g = two();
    g.notify('🔥 불이 번지고 있어요!', 'bad');
    expect(g.toasts.at(-1)!.look).toBe('urgent');
    g.notify('이번에는 아기가 생기지 않았어요', 'info');
    expect(g.toasts.at(-1)!.look).toBeUndefined();
  });

  it('slams a big moment only for the selected dweller, unless the whole household shares it', () => {
    const g = two();
    const [a, b] = g.state.dwellers;
    g.setActive(a.id);
    g.notify(`${b.name} 승진`, 'good', { dwellerId: b.id, look: 'moment', slam: { title: '승진!', icon: '💼' } });
    expect(g.slam).toBeNull();
    g.notify(`${a.name} 승진`, 'good', { dwellerId: a.id, look: 'moment', slam: { title: '승진!', icon: '💼' } });
    expect(g.slam?.title).toBe('승진!');
    g.notify('아기', 'good', { dwellerId: b.id, slam: { title: '아기가 태어났어요!', icon: '👶', household: true } });
    expect(g.slam?.title).toBe('아기가 태어났어요!');
  });

  it('makes a promotion a special moment with a slam', () => {
    const g = two();
    const a = g.state.dwellers[0];
    g.setActive(a.id);
    g.acceptJob(a.id, 'culinary');
    a.job!.performance = 100;
    for (const k of Object.keys(a.skills)) (a.skills as Record<string, number>)[k] = 10;
    (g as unknown as { evaluateCareer(s: Dweller): void }).evaluateCareer(a);
    const t = g.toasts.at(-1)!;
    expect(t.look).toBe('moment');
    expect(t.dwellerId).toBe(a.id);
    expect(g.slam?.title).toBe('승진!');
  });
});
