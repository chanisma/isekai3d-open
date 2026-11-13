import { describe, expect, it } from 'vitest';
import { ASPIRATION_BY_ID, aspirationsFor, goalMet } from './aspirations';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('aspirations for the newer skills (참고 게임 tracks)', () => {
  it('counts fixes and upgrades towards their goals', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      ],
      () => 0.5,
    );
    g.state.freeWill = false;
    const [a] = g.state.dwellers;
    expect(ASPIRATION_BY_ID.mischiefMaker).toBeUndefined();
    g.setAspiration(a.id, 'nerdBrain');
    const tv = g.state.objects.find((o) => o.defId === 'tv')!;
    tv.wear = 10;
    a.skills.handiness = 10;
    g.enqueue(a.id, { kind: 'interact', objectUid: tv.uid, interactionId: 'repair', autonomous: false });
    run(g, 60);
    expect(a.aspiration?.counters?.fixes).toBe(1);
    const fix = ASPIRATION_BY_ID.nerdBrain.milestones[0].goals[0];
    expect(goalMet(g, a, fix)).toBe(true);
  });

  it("gives children 참고 게임's child aspirations, and the gift trait when one is done", () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }, { name: '지우', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    const [a, kid] = g.state.dwellers;
    expect(aspirationsFor('child').map((x) => x.label)).toEqual(['마음껏 그리고 상상하기', '궁금한 건 다 알아보기', '신나게 뛰어놀기', '친구들과 어울리기']);
    expect(aspirationsFor(undefined).some((x) => x.child)).toBe(false);
    kid.age = 'child';
    g.setAspiration(kid.id, 'childMotor');
    kid.aspiration!.counters = { playBars_playful: 1, playBars: 5, hangBars: 3 };
    kid.skills.motor = 10;
    g.checkAspiration(kid);
    expect(kid.aspiration!.milestone).toBe(3);
    expect(kid.traits).toContain('physicallyGifted');
    expect(a.traits).not.toContain('physicallyGifted');
  });
});
