import { describe, expect, it } from 'vitest';
import { levelOf } from './careers';
import { Game } from './game';
import { CATALOG_BY_ID } from './catalog';
import { WORKPLACES, WORK_SOCIALS, dailyTasks, type WorkTask } from './workplace';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** A tech worker whose next shift is about to begin, set to be followed to work. */
function tech(rng: () => number = () => 0.5) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], rng);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  const dweller = g.state.dwellers[0];
  g.acceptJob(dweller.id, 'tech');
  g.setFollowWork(dweller.id, true);
  const lvl = levelOf(dweller.job!);
  // The next working day, just before the carpool.
  let day = Math.floor(g.state.time / 1440) + 1;
  while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
  g.state.time = day * 1440 + lvl.start - 61;
  dweller.job!.lastWorkDay = day - 1;
  return { g, dweller, lvl };
}

describe('workplaces (Get to Work style active careers, ours)', () => {
  it('follows the dweller to a work lot with coworkers, a boss and the day’s tasks', () => {
    const { g, dweller } = tech();
    run(g, 75);
    expect(dweller.away).toBeTruthy();
    expect(g.workGames.get(dweller.id)).toBeDefined();
    const work = g.workGames.get(dweller.id)!;
    expect(work.state.workplace!.careerId).toBe('tech');
    expect(work.state.dwellers.filter((s) => s.npc?.role === 'coworker')).toHaveLength(3);
    expect(work.state.dwellers.some((s) => s.npc?.boss)).toBe(true);
    // The job's own tasks, the stage's work (a new hire learns from a senior) and one extra.
    expect(work.state.workplace!.tasks.length).toBe(WORKPLACES.tech.tasks.length + 2);
    expect(work.state.workplace!.tasks.some((t) => t.kind === 'learn')).toBe(true);
    expect(work.state.objects.some((o) => o.defId === 'workstation')).toBe(true);
    // Home and work keep the same clock.
    run(g, 10);
    expect(work.state.time).toBe(g.state.time);
  });

  it('work done on the lot ticks off tasks and becomes the shift’s performance', () => {
    const { g, dweller, lvl } = tech();
    run(g, 75);
    const work = g.workGames.get(dweller.id)!;
    const worker = work.dweller(dweller.id)!;
    const desk = work.state.objects.find((o) => o.defId === 'workstation')!;
    for (let i = 0; i < 2; i++) work.enqueue(worker.id, { kind: 'interact', objectUid: desk.uid, interactionId: 'writeCode', autonomous: false });
    run(g, 120);
    const code = work.state.workplace!.tasks.find((t) => t.id === 'code')!;
    expect(code.count).toBe(2);
    expect(g.workStatus(dweller.id)!.points).toBeGreaterThan(0);
    const before = dweller.job!.performance;
    // Skills learnt at work come home with the dweller at the end of the shift.
    run(g, lvl.end - lvl.start + 10);
    expect(g.workGames.size).toBe(0);
    expect(dweller.away).toBeNull();
    expect(dweller.skills.programming).toBeGreaterThan(0);
    expect(dweller.job!.performance).toBeGreaterThan(before);
  });

  it('can leave early, at the cost 참고 게임 charges for it', () => {
    const { g, dweller } = tech();
    run(g, 75);
    const money = g.state.money;
    g.finishWorkplace(dweller.id, true);
    expect(g.workGames.size).toBe(0);
    expect(dweller.away).toBeNull();
    expect(g.state.money).toBeLessThan(money + 200);
  });

  it('keeps colleagues as friends from one day to the next', () => {
    const { g, dweller } = tech(() => 0.1);
    run(g, 75);
    const work = g.workGames.get(dweller.id)!;
    const mate = work.state.dwellers.find((s) => s.npc?.role === 'coworker' && !s.npc.boss)!;
    work.relationship(dweller.id, mate.id).friend = 42;
    g.finishWorkplace(dweller.id, true);
    expect(g.relationship(dweller.id, mate.id).friend).toBe(42);
  });

  it('asks at the first shift whether to go along; every time turns the toggle on', () => {
    const { g, dweller } = tech();
    delete dweller.job!.follow;
    g.state.speed = 2;
    run(g, 75);
    expect(g.state.followAsks).toEqual([{ dwellerId: dweller.id, slot: 'job' }]);
    expect(g.state.speed).toBe(0);
    expect(g.workGames.size).toBe(0);
    g.answerFollow('always');
    expect(dweller.job!.follow).toBe(true);
    expect(g.workGames.get(dweller.id)).toBeDefined();
    expect(g.state.followAsks).toBeUndefined();
    expect(g.state.speed).toBe(2);
  });

  it('not going along leaves the toggle off and the shift to the rabbit hole', () => {
    const { g, dweller, lvl } = tech();
    delete dweller.job!.follow;
    run(g, 75);
    g.answerFollow('no');
    expect(dweller.job!.follow).toBe(false);
    expect(g.workGames.size).toBe(0);
    run(g, lvl.end - lvl.start + 10);
    expect(dweller.away).toBeNull();
    expect(g.state.followAsks).toBeUndefined();
  });

  it('this once opens the work lot but leaves the toggle off', () => {
    const { g, dweller } = tech();
    delete dweller.job!.follow;
    run(g, 75);
    g.answerFollow('once');
    expect(dweller.job!.follow).toBe(false);
    expect(g.workGames.get(dweller.id)).toBeDefined();
  });

  it('two dwellers at work at once each have their own work lot, stepped along with home', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '서연', shirt: '#e53935', skin: '#f8d9c0', hair: '#2b1b10' },
      ],
      () => 0.5,
    );
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a, b] = g.state.dwellers;
    for (const s of [a, b]) {
      g.acceptJob(s.id, 'tech');
      g.setFollowWork(s.id, true);
    }
    const lvl = levelOf(a.job!);
    let day = Math.floor(g.state.time / 1440) + 1;
    while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
    g.state.time = day * 1440 + lvl.start - 61;
    for (const s of [a, b]) s.job!.lastWorkDay = day - 1;
    run(g, 75);
    expect([...g.workGames.keys()].sort()).toEqual([a.id, b.id].sort());
    expect(g.state.workSessions).toHaveLength(2);
    expect(g.workGames.get(a.id)).not.toBe(g.workGames.get(b.id));
    run(g, 10);
    for (const s of [a, b]) expect(g.workGames.get(s.id)!.state.time).toBe(g.state.time);
    // One leaving early leaves the other at work.
    g.finishWorkplace(a.id, true);
    expect(a.away).toBeNull();
    expect(g.workGames.has(b.id)).toBe(true);
    run(g, lvl.end - lvl.start);
    expect(g.workGames.size).toBe(0);
    expect(g.state.workSessions).toBeUndefined();
    expect(b.away).toBeNull();
  });

  it('a save from before more than one work lot keeps its shift', () => {
    const { g, dweller } = tech();
    run(g, 75);
    const state = JSON.parse(JSON.stringify(g.state));
    state.workSession = state.workSessions[0];
    delete state.workSessions;
    const loaded = new Game(state, () => 0.5);
    expect(loaded.workGames.get(dweller.id)).toBeDefined();
    expect(loaded.state.workSession).toBeUndefined();
  });
});

/** A dweller in `careerId` whose next shift is about to begin, set to be followed to work. */
function worker(careerId: string, rng: () => number = () => 0.5) {
  const g = Game.create([{ name: '서연', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], rng);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  const dweller = g.state.dwellers[0];
  g.acceptJob(dweller.id, careerId);
  g.setFollowWork(dweller.id, true);
  const lvl = levelOf(dweller.job!);
  let day = Math.floor(g.state.time / 1440) + 1;
  while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
  g.state.time = day * 1440 + lvl.start - 61;
  dweller.job!.lastWorkDay = day - 1;
  return { g, dweller, lvl };
}

describe('workplaces for the careers after expansion packs and mods (ours)', () => {
  it('every career with a workplace has the furniture its tasks need', () => {
    for (const def of Object.values(WORKPLACES)) {
      const inters = new Set(def.objects.flatMap((o) => CATALOG_BY_ID[o.defId].interactions.map((i) => i.id)));
      const socials = new Set(WORK_SOCIALS.filter((s) => s.work!.includes(def.careerId)).map((s) => s.id));
      // Every list a day can be drawn from: the branches' own, and what an entry worker does instead.
      const chain = (t: WorkTask | undefined): WorkTask[] => (t ? [t, ...chain(t.instead)] : []);
      const lists = [def.tasks, def.extra, ...(def.branchTasks ?? []), ...(def.branchExtra ?? [])];
      for (const t of lists.flatMap((l) => l ?? []).flatMap(chain)) {
        for (const d of t.does ?? []) {
          expect(inters.has(d) || socials.has(d), `${def.careerId}: ${d}`).toBe(true);
          expect(def.work, `${def.careerId}: ${d} counts as work`).toContain(d);
        }
      }
      for (const c of def.clients ?? []) for (const s of c.socials) expect(socials.has(s), `${def.careerId}: ${s}`).toBe(true);
      if (def.alarm) expect(inters.has(def.alarm.interaction)).toBe(true);
    }
  });

  it('colleagues see to whoever the worker leaves waiting, the boss not among them, and it isn’t the worker’s', () => {
    const { g, dweller } = worker('doctor', () => 0.3);
    run(g, 75);
    const work = g.workGames.get(dweller.id)!;
    const before = work.state.workplace!.served ?? 0;
    const doc = work.dweller(dweller.id)!;
    let saw = false;
    for (let m = 0; m < 240 && !saw; m++) {
      doc.queue = [];
      run(g, 1);
      const claimed = work.state.dwellers.find((s) => s.npc?.role === 'client' && s.npc.claimedBy !== undefined);
      if (claimed) {
        saw = true;
        expect(work.dweller(claimed.npc!.claimedBy!)?.npc?.boss).toBeFalsy();
        // Nobody else starts on them meanwhile.
        expect(work.socialMenu(doc, claimed).map((o) => o.id)).toEqual([]);
      }
    }
    expect(saw).toBe(true);
    run(g, 60);
    expect(work.state.workplace!.served ?? 0).toBe(before);
    expect(work.state.dwellers.some((s) => s.npc?.role === 'client' && s.npc.leaving)).toBeDefined();
  });

  it('whoever comes in to be seen to shows on the day’s list, in every job they come to', () => {
    for (const def of Object.values(WORKPLACES)) {
      for (const spec of def.clients ?? []) {
        const tasks = dailyTasks(def, () => 0);
        expect(spec.socials.some((s) => tasks.some((t) => t.does?.includes(s))), `${def.careerId}: ${spec.noun}`).toBe(true);
      }
    }
  });

  it('patients come into the hospital, and seeing to them is the doctor’s work', () => {
    const { g, dweller } = worker('doctor', () => 0.3);
    run(g, 75);
    const work = g.workGames.get(dweller.id)!;
    expect(work.state.workplace!.careerId).toBe('doctor');
    // On their own in the hospital: colleagues see to patients left waiting (the test after this).
    work.state.dwellers = work.state.dwellers.filter((s) => s.npc?.role !== 'coworker');
    run(g, 60);
    const patients = work.state.dwellers.filter((s) => s.npc?.role === 'client');
    expect(patients.length).toBeGreaterThan(0);
    const p = patients[0];
    const doc = work.dweller(dweller.id)!;
    // Only what they came for is on the menu.
    const menu = work.socialMenu(doc, p).map((m) => m.id);
    expect(menu).toEqual([p.npc!.wants]);
    doc.skills.logic = 8;
    // (In no particular mood: how a mood bears on it is moodEffects', tested with it.)
    doc.buffs = [];
    for (const k of ['hunger', 'energy', 'bladder', 'hygiene', 'fun', 'social'] as const) doc.needs[k] = 90;
    const before = work.state.workplace!.points;
    work.enqueue(doc.id, { kind: 'social', targetId: p.id, socialId: p.npc!.wants!, autonomous: false });
    run(g, 40);
    expect(work.state.workplace!.served).toBe(1);
    expect(work.state.workplace!.points).toBeGreaterThan(before);
    expect(work.state.workplace!.tasks.find((t) => t.id === 'patients')!.count).toBe(1);
    // Nobody remembers the patients at home.
    g.finishWorkplace(dweller.id, true);
    expect(Object.keys(g.state.relationships).some((k) => k.split('-').some((id) => Number(id) >= 5000))).toBe(false);
  });

  it('pupils come to the teacher’s classroom, pet owners to the vet with their animal', () => {
    const t = worker('teacher', () => 0.3);
    run(t.g, 160);
    const pupils = t.g.workGames.get(t.dweller.id)!.state.dwellers.filter((s) => s.npc?.role === 'client');
    expect(pupils.length).toBeGreaterThan(0);
    expect(pupils.every((p) => p.age === 'child' && p.name.includes('학생'))).toBe(true);
    const v = worker('vet', () => 0.3);
    run(v.g, 160);
    const owners = v.g.workGames.get(v.dweller.id)!.state.dwellers.filter((s) => s.npc?.role === 'client');
    expect(owners.length).toBeGreaterThan(0);
    expect(owners.every((p) => /[🐶🐱🐰🐹🦜] 보호자/u.test(p.name))).toBe(true);
  });

  it('travellers come in at the airport’s baggage claim, not off the street, and leave by the street', () => {
    expect(WORKPLACES.customsOfficer.clients![0].enterAt).toEqual([7, 2]);
    const { g, dweller } = worker('customsOfficer', () => 0.3);
    run(g, 75);
    const work = g.workGames.get(dweller.id)!;
    const first = new Map<number, { x: number; y: number }>();
    const before = new Set(work.state.dwellers.map((s) => s.id));
    for (let t = 0; t < 120; t += 0.5) {
      g.step(0.5);
      for (const s of work.state.dwellers) if (s.npc?.role === 'client' && !before.has(s.id) && !first.has(s.id)) first.set(s.id, { x: s.x, y: s.y });
    }
    expect(first.size).toBeGreaterThan(0);
    // Seen first in the hall (y < 5), nowhere near the road (y ≥ 15).
    for (const p of first.values()) expect(p.y).toBeLessThan(5);
    // A job without `enterAt` still brings them from the street.
    const d = worker('doctor', () => 0.3);
    run(d.g, 75);
    const hospital = d.g.workGames.get(d.dweller.id)!;
    const seen = new Map<number, number>();
    const had = new Set(hospital.state.dwellers.map((s) => s.id));
    for (let t = 0; t < 120; t += 0.5) {
      d.g.step(0.5);
      for (const s of hospital.state.dwellers) if (s.npc?.role === 'client' && !had.has(s.id) && !seen.has(s.id)) seen.set(s.id, s.y);
    }
    expect(seen.size).toBeGreaterThan(0);
    for (const y of seen.values()) expect(y).toBeGreaterThan(13);
  });

  it('a trial is answered in the courtroom on the lot, not by leaving it', () => {
    const { g, dweller } = worker('lawyer', () => 0.4);
    run(g, 75);
    const work = g.workGames.get(dweller.id)!;
    const wp = work.state.workplace!;
    wp.nextAlarm = work.state.time;
    run(g, 1);
    expect(wp.alarm).toBeTruthy();
    const podium = work.state.objects.find((o) => o.defId === 'courtPodium')!;
    const me = work.dweller(dweller.id)!;
    work.enqueue(me.id, { kind: 'interact', objectUid: podium.uid, interactionId: 'attendTrial', autonomous: false });
    let seen = true;
    for (let i = 0; i < 90 && wp.alarm; i++) {
      run(g, 1);
      if (work.performing(me)?.inter.offLot) seen = false;
    }
    expect(seen).toBe(true);
    expect(wp.alarm).toBeUndefined();
    expect(wp.tasks.some((t) => t.id === 'trial') ? wp.tasks.find((t) => t.id === 'trial')!.count : 1).toBe(1);
  });

  it('a fire call-out comes in, and answering it in the truck counts big; leaving it costs', () => {
    const { g, dweller } = worker('firefighter', () => 0.4);
    run(g, 75);
    const work = g.workGames.get(dweller.id)!;
    const wp = work.state.workplace!;
    for (let i = 0; i < 400 && !wp.alarm; i++) run(g, 1);
    expect(wp.alarm).toBeTruthy();
    const ff = work.dweller(dweller.id)!;
    const truck = work.state.objects.find((o) => o.defId === 'fireTruck')!;
    // Colleagues can't take the worker's call.
    const mate = work.state.dwellers.find((s) => s.npc?.role === 'coworker')!;
    expect(work.objectMenu(mate, truck).some((i) => i.id === 'respondFire')).toBe(false);
    expect(work.objectMenu(work.dweller(dweller.id)!, truck).some((i) => i.id === 'respondFire')).toBe(true);
    const before = wp.points;
    work.enqueue(ff.id, { kind: 'interact', objectUid: truck.uid, interactionId: 'respondFire', autonomous: false });
    let hidden = false;
    for (let i = 0; i < 90 && wp.alarm; i++) {
      run(g, 1);
      if (work.performing(ff)?.inter.offLot) hidden = true;
    }
    expect(hidden).toBe(true);
    expect(wp.alarm).toBeUndefined();
    expect(wp.points).toBeGreaterThanOrEqual(before + 10);
    expect(wp.tasks.find((t) => t.id === 'fire')!.count).toBe(1);
    // The next call, left alone, goes to another crew and costs a little.
    for (let i = 0; i < 400 && !wp.alarm; i++) run(g, 1);
    if (wp.alarm) {
      const p = wp.points;
      run(g, 60);
      expect(wp.points).toBeLessThan(p);
    }
  });
});
