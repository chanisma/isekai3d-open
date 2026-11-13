import { describe, expect, it } from 'vitest';
import { levelOf } from './careers';
import { Game } from './game';
import { awayReason } from './neighbourhood';
import { STAR_ID } from './stars';

/** Two dwellers of the household in `career`, the first followed to their first shift. */
function twoDoctors() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#e53935', skin: '#f8d9c0', hair: '#2b1b10' },
    ],
    () => 0.4,
  );
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  const [a, b] = g.state.dwellers;
  for (const s of [a, b]) {
    g.acceptJob(s.id, 'doctor');
    g.setFollowWork(s.id, true);
  }
  const lvl = levelOf(a.job!);
  let day = Math.floor(g.state.time / 1440) + 1;
  while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
  g.state.time = day * 1440 + lvl.start - 61;
  for (const s of [a, b]) s.job!.lastWorkDay = day - 1;
  return { g, a, b };
}

describe('stars (stars.ts, 2026-10-25)', () => {
  it('a star works beside the first dweller of the field only, with their own face, name and skills', () => {
    const { g, a, b } = twoDoctors();
    expect(g.starsFor(a, 'doctor').map((t) => t.name)).toEqual(['서이안']);
    // The second doctor of the household never meets him at work.
    expect(g.starsFor(b, 'doctor')).toEqual([]);
    expect(g.state.starOwners?.ian).toBe(a.id);
    for (let t = 0; t < 75; t += 0.5) g.step(0.5);
    const onA = g.workGames.get(a.id)!.state.dwellers.find((s) => s.id === STAR_ID.ian);
    expect(onA?.face).toBe('star_ian');
    expect(onA?.skills.medicine).toBe(9);
    expect(g.workGames.get(b.id)!.state.dwellers.some((s) => s.id === STAR_ID.ian)).toBe(false);
    // He isn't one of the ordinary colleagues either.
    expect((g.state.townies ?? []).filter((t) => t.workmate?.careerId === 'doctor' && !t.star).every((t) => t.id !== STAR_ID.ian)).toBe(true);
  });

  it('the celebrity is a friend at most; the others can be more', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.4);
    const me = g.state.dwellers[0];
    expect(g.romanceBlocked(me, { id: STAR_ID.lumina })).toContain('친구로만');
    expect(g.romanceBlocked(me, { id: STAR_ID.ian })).toBeNull();
  });
});

describe('a playable star comes home (2026-10-26, at the user\'s request: 함께 살기, 결혼)', () => {
  /** The household's doctor, and 서이안 (met at work) as a guest in the living room after his shift. */
  function ianOver(starId: 'ian' | 'lumina', careerId: string) {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.4);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const me = g.state.dwellers[0];
    g.acceptJob(me.id, careerId);
    expect(g.starsFor(me, careerId).map((t) => t.id)).toEqual([STAR_ID[starId]]);
    // A free evening of theirs (the star keeps the job's hours).
    const t = g.state.townies!.find((x) => x.id === STAR_ID[starId])!;
    let at = g.state.time;
    while (awayReason(t, at)) at += 30;
    g.state.time = at;
    g.inviteOver(me.id, t.id);
    for (let m = 0; m < 180 && g.dweller(t.id)?.npc?.role !== 'guest'; m += 0.5) g.step(0.5);
    const v = g.dweller(t.id)!;
    expect(v.npc?.role).toBe('guest');
    v.npc!.until = g.state.time + 600;
    v.queue = [];
    v.run = null;
    Object.assign(me, { x: 11, y: 11, queue: [], run: null });
    Object.assign(v, { x: 12, y: 11 });
    const rel = g.relationship(me.id, v.id);
    rel.friend = 60;
    rel.romance = 70;
    return { g, me, v, rel };
  }

  it('서이안 marries in and stays: family now, never back at work as a colleague', () => {
    const { g, me, v, rel } = ianOver('ian', 'nurse');
    rel.flags.push('partner');
    expect(g.socialMenu(me, v).find((o) => o.id === 'propose')?.disabled).toBeUndefined();
    rel.flags.push('engaged');
    g.enqueue(me.id, { kind: 'social', targetId: v.id, socialId: 'marry', autonomous: false });
    for (let m = 0; m < 35; m += 0.5) g.step(0.5);
    expect(rel.flags).toContain('married');
    expect(v.npc).toBeUndefined();
    expect(g.household().map((s) => s.id)).toContain(STAR_ID.ian);
    expect(v.face).toBe('star_ian');
    expect(g.starsFor(me, 'nurse')).toEqual([]);
    expect(g.state.townies!.some((t) => t.id === STAR_ID.ian)).toBe(false);
  });

  it('윤자인 can be asked to move in as a partner', () => {
    const g0 = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.4);
    expect(g0.romanceBlocked(g0.state.dwellers[0], { id: STAR_ID.jain })).toBeNull();
  });

  it('루미나 comes over as a friend but won\'t date, marry or move in', () => {
    const { g, me, v, rel } = ianOver('lumina', 'singer');
    rel.flags.push('partner', 'engaged');
    expect(g.dateBlocker(me, v.id)).toContain('친구로만');
    g.rng = () => 0;
    g.enqueue(me.id, { kind: 'social', targetId: v.id, socialId: 'askMoveIn', autonomous: false });
    for (let m = 0; m < 10; m += 0.5) g.step(0.5);
    expect(v.npc).toBeDefined();
    expect(g.toasts.some((t) => t.text.includes('친구로만'))).toBe(true);
  });
});
