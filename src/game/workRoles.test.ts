import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkResultModal } from '../ui/WorkResultModal';
import { onBreak, rankOptions } from './autonomy';
import { careerRequest, toCareerEvent } from './aiQuestions';
import { CAREER_EVENTS, fieldNote } from './careerEvents';
import { CAREER_BY_ID, levelOf, levelsOf } from './careers';
import { getDef } from './catalog';
import { colleaguesFor } from './colleagues';
import { Game } from './game';
import type { Townie } from './visitors';
import { WORK_ROLES, allowedWork, colleagueAt, colleagueRung, colleagueTag, hasSeniorWork, placeColleague, roleAt, roleKeyOf, shortTitle, workVariant, type RoleKey } from './workRoles';
import { WORKPLACES } from './workplace';
import { gateOf, stageActions, stageInfo, stageLock, stageOf, stageTasks, type StageAt } from './workStages';

const PILOT = ['semiconductor', 'doctor', 'teacher'];
/** Careers that must stay exactly as they were. */
const OTHERS = ['nurse', 'police', 'lawyer', 'tech', 'vet', 'aiResearcher', 'firefighter'];
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** The interaction ids a workplace's own lot can do. */
const onLot = (careerId: string) => new Set(WORKPLACES[careerId].objects.flatMap((o) => getDef(o.defId).interactions.map((i) => i.id)));
const coworkers = (g: Game) => g.state.dwellers.filter((s) => s.npc?.role === 'coworker');
const atWorkIds = (g: Game, dweller: Parameters<typeof rankOptions>[1]) =>
  rankOptions(g, dweller).flatMap((c) => {
    if (c.action.kind !== 'interact') return [];
    const { objectUid, interactionId } = c.action;
    const obj = g.object(objectUid);
    const inter = obj && g.interaction(obj, interactionId);
    return inter?.requires === 'atWork' ? [interactionId] : [];
  });

function employed(careerId: string, level = 0) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.1);
  const dweller = g.state.dwellers[0];
  g.acceptJob(dweller.id, careerId);
  dweller.job!.level = level;
  return { g, dweller };
}

describe('the role table (workRoles.ts)', () => {
  it.each(PILOT)('%s: every rung of the ladder is in the row of its stage, and nothing else', (id) => {
    const career = CAREER_BY_ID[id];
    const expected = new Map<RoleKey, string[]>();
    const add = (job: { careerId: string; level: number; branch?: number }, title: string) => {
      const key = roleKeyOf(stageOf(job));
      expected.set(key, [...(expected.get(key) ?? []), title]);
    };
    career.levels.forEach((l, level) => add({ careerId: id, level }, l.title));
    career.branches!.forEach((b, branch) => b.levels.forEach((l, i) => add({ careerId: id, level: career.levels.length + i, branch }, l.title)));
    const roles = WORK_ROLES[id].roles;
    expect(Object.keys(roles).sort()).toEqual([...expected.keys()].sort());
    for (const [key, titles] of expected) expect(roles[key]!.titles, `${id} ${key}`).toEqual(titles);
  });

  it.each(PILOT)('%s: the work listed is real work, on this lot; the people it sees to are the workplace’s', (id) => {
    for (const [key, role] of Object.entries(WORK_ROLES[id].roles)) {
      // A branch that works somewhere else (workplace.ts branchLots) does its work at its own lot.
      const def = (/^(?:branch|lead)\d$/.test(key) && WORKPLACES[id].branchLots?.[Number(key.slice(-1))]) || WORKPLACES[id];
      const lot = new Set(def.objects.flatMap((o) => getDef(o.defId).interactions.map((i) => i.id)));
      const clients = new Set(def.clients?.flatMap((c) => c.socials));
      expect(role.does.length, `${id} ${key}`).toBeGreaterThan(0);
      for (const w of role.does) {
        expect(def.work, `${id} ${key} ${w}`).toContain(w);
        expect(lot.has(w), `${id} ${key} ${w} on the lot`).toBe(true);
      }
      for (const s of role.socials ?? []) expect(clients.has(s), `${id} ${key} ${s}`).toBe(true);
      for (const part of [role.tasks, role.judges]) expect(part.length).toBeGreaterThan(0);
      expect(role.asks).toBeTruthy();
    }
  });

  it.each(PILOT)('%s: the rows say what level does what, and the top doesn’t do the check of the bottom', (id) => {
    const r = WORK_ROLES[id].roles;
    expect(r.junior!.does).not.toEqual(r.lead0!.does);
    // A leader's own stage action is theirs alone; a junior doesn't have it.
    const lead = stageActions(id).filter((a) => a.stage.startsWith('lead')).map((a) => `${a.career}_${a.key}`);
    for (const w of lead) expect(r.junior!.does).not.toContain(w);
    expect(lead.some((w) => r.lead0!.does.includes(w))).toBe(true);
  });

  it.each(PILOT)('%s: at least two pieces show the same work differently at 입문, 전문 and 리더', (id) => {
    const lot = WORKPLACES[id].objects.map((o) => getDef(o.defId));
    const pieces = new Set<string>();
    for (const [inter, v] of Object.entries(WORK_ROLES[id].variants)) {
      const piece = lot.find((d) => d.interactions.some((i) => i.id === inter));
      expect(piece, inter).toBeTruthy();
      // A place borrowed for a pose is that piece's own.
      for (const x of Object.values(v)) if (x.spotAs) expect(piece!.interactions.map((i) => i.id), x.spotAs).toContain(x.spotAs);
      if (v.entry && v.expert && v.lead && new Set([v.entry.label, v.expert.label, v.lead.label]).size === 3) pieces.add(piece!.id);
    }
    expect(pieces.size).toBeGreaterThanOrEqual(2);
  });

  it.each(PILOT)('%s: the notes say where it came from and name no company', (id) => {
    const text = JSON.stringify(WORK_ROLES[id]);
    expect(WORK_ROLES[id].source.length).toBeGreaterThan(40);
    expect(text).not.toMatch(/삼성|하이닉스|SK|TSMC|인텔|서울대|세브란스/);
  });

  it('every title fits a name tag', () => {
    for (const id of PILOT) for (const role of Object.values(WORK_ROLES[id].roles)) for (const t of role.titles) expect(shortTitle(id, t).length, t).toBeLessThanOrEqual(10);
    expect(shortTitle('doctor', '내과 레지던트')).toBe('내과 전공의');
  });
});

describe('rungs that differ from their row', () => {
  it.each(PILOT)('%s: each is a real rung, doing real work on this lot', (id) => {
    const career = CAREER_BY_ID[id];
    const titles = [...career.levels, ...career.branches!.flatMap((b) => b.levels)].map((l) => l.title);
    const def = WORKPLACES[id];
    const lot = onLot(id);
    for (const [title, own] of Object.entries(WORK_ROLES[id].rungs ?? {})) {
      expect(titles, title).toContain(title);
      for (const w of own.does ?? []) {
        expect(def.work, `${title} ${w}`).toContain(w);
        expect(lot.has(w), `${title} ${w} on the lot`).toBe(true);
      }
    }
  });

  it('a student isn’t an intern, a 교감 isn’t a 장학사', () => {
    const student = roleAt('doctor', { stage: 0, rung: '의대 실습생' })!;
    const intern = roleAt('doctor', { stage: 0, rung: '인턴' })!;
    expect(student.does).not.toEqual(intern.does);
    expect(student.does).not.toContain('drScrubIn');
    expect(intern.does).toContain('drScrubIn');
    // A resident writes the chart and an older one may take small operations; an intern neither.
    expect(intern.does).not.toContain('writeChart');
    expect(roleAt('doctor', { stage: 1, rung: '외과 레지던트' })!.does).toContain('writeChart');
    expect(roleAt('doctor', { stage: 1, rung: '외과 레지던트' })!.does).not.toContain('performSurgery');
    expect(roleAt('doctor', { stage: 1, rung: '외과 수석 레지던트' })!.does).toContain('performSurgery');
    expect(roleAt('teacher', { stage: 2, branch: 0, rung: '교감' })!.asks).toBe('교장');
    expect(roleAt('teacher', { stage: 1, branch: 1, rung: '장학사' })!.tasks.join()).toContain('교육청');
  });

  it('a specialty starts at residency, and a resident is still in training', () => {
    expect(CAREER_BY_ID.doctor.levels.map((l) => l.title)).toEqual(['의대 실습생', '인턴']);
    expect(stageOf({ careerId: 'doctor', level: 2, branch: 0 })).toEqual({ stage: 1 });
    expect(stageOf({ careerId: 'doctor', level: 4, branch: 0 })).toEqual({ stage: 1, branch: 0 });
    expect(stageOf({ careerId: 'doctor', level: 8, branch: 0 })).toEqual({ stage: 1, branch: 0 });
    expect(stageOf({ careerId: 'doctor', level: 9, branch: 1 })).toEqual({ stage: 2, branch: 1 });
    expect(levelsOf(CAREER_BY_ID.doctor, 0).at(-1)!.title).toBe('병원장');
    expect(levelsOf(CAREER_BY_ID.doctor, 1).at(-1)!.title).toBe('병원장');
  });

  it('past 부장 교사 the real paths, of their own lengths, and no professor', () => {
    const c = CAREER_BY_ID.teacher;
    expect(c.branches!.map((b) => b.levels.map((l) => l.title))).toEqual([['교감', '교장'], ['장학사', '장학관', '교육장'], ['수석교사']]);
    expect(stageOf({ careerId: 'teacher', level: 5, branch: 2 })).toEqual({ stage: 1, branch: 2 });
    expect(stageOf({ careerId: 'teacher', level: 5, branch: 0 })).toEqual({ stage: 2, branch: 0 });
    expect(stageOf({ careerId: 'teacher', level: 5, branch: 1 })).toEqual({ stage: 1, branch: 1 });
  });

  it('a school’s colleagues don’t include people who work at the education office', () => {
    for (let id = 1; id < 200; id++) {
      const r = colleagueRung('teacher', 1, id)!;
      if (r.branch !== undefined) expect(r.branch).toBe(2);
    }
  });

  it('stages are called what they are in the job, and other jobs keep the general words', () => {
    expect(stageInfo({ stage: 1 }, 'doctor').label).toBe('전공의 수련');
    expect(stageInfo({ stage: 1, branch: 0 }, 'doctor').label).toBe('전문의·교수');
    expect(stageInfo({ stage: 1 }, 'tech').label).toBe('실무');
    expect(stageInfo({ stage: 2, branch: 0 }, 'tech').label).toBe('리더');
  });

  it('a line operator isn’t a rung towards engineer', () => {
    const titles = [0, 1].flatMap((b) => levelsOf(CAREER_BY_ID.semiconductor, b).map((l) => l.title));
    expect(titles).not.toContain('라인 오퍼레이터');
    expect(CAREER_BY_ID.semiconductor.levels).toHaveLength(1);
  });
});

describe('colleagues at their level', () => {
  it.each(PILOT)('%s: a workplace has a spread, the boss at the top, whatever the ids', (id) => {
    const def = WORKPLACES[id];
    for (let seed = 1; seed < 25; seed++) {
      const mates = colleaguesFor(def, [], seeded(seed * 97), 0, () => true, ((n) => () => n++)(seed * 1000)).filter((t) => !t.workmate!.staff);
      const rows = mates.map((t) => colleagueAt(t)!);
      expect(new Set(rows.map((r) => roleKeyOf(r))).size, `seed ${seed}`).toBe(mates.length);
      expect(mates.filter((t) => t.workmate!.boss).map((t) => colleagueAt(t)!.stage)).toEqual([2]);
      expect(rows.some((r) => r.stage === 0)).toBe(true);
    }
  });

  it.each(PILOT)('%s: the title on the tag is the townie’s own rung', (id) => {
    const def = WORKPLACES[id];
    for (const t of colleaguesFor(def, [], seeded(7), 0, () => false, () => 0)) {
      if (t.workmate!.staff) continue;
      const at = colleagueAt(t)!;
      const job = t.job!;
      const rung = levelsOf(CAREER_BY_ID[id], job.branch)[job.level];
      expect(rung, t.name).toBeTruthy();
      if (t.workmate!.boss) {
        // The boss's title is in their name, and is the rung they're on.
        expect(at.title).toBeUndefined();
        expect(rung.title.endsWith(t.name.split(' ').pop()!)).toBe(true);
      } else {
        expect(at.title).toBe(shortTitle(id, rung.title));
        expect(roleAt(id, at)!.titles).toContain(rung.title);
      }
    }
  });

  it('the tag reads as asked', () => {
    const t = { id: 5, job: { careerId: 'doctor', level: 2, branch: 1 }, workmate: { careerId: 'doctor', slot: 2 } };
    expect(colleagueAt(t)!.title).toBe('내과 전공의');
    expect(colleagueTag('한도윤', colleagueAt(t)!.title!)).toBe('한도윤 · 내과 전공의');
  });

  it.each(PILOT)('%s: a free colleague’s choice of work is their level’s', (id) => {
    const g = Game.workplaceTour(id, seeded(41));
    for (const mate of coworkers(g)) {
      const allowed = allowedWork(id, mate.npc!.rung)!;
      const ids = atWorkIds(g, mate);
      expect(ids.length, mate.name).toBeGreaterThan(0);
      for (const w of ids) expect(allowed.has(w), `${mate.name} ${w}`).toBe(true);
    }
  });

  it.each(PILOT)('%s: with no station for their level free, a colleague works as they always did', (id) => {
    const g = Game.workplaceTour(id, seeded(43));
    const mate = coworkers(g).find((s) => !s.npc!.boss)!;
    const allowed = allowedWork(id, mate.npc!.rung)!;
    g.state.objects = g.state.objects.filter((o) => !getDef(o.defId).interactions.some((i) => allowed.has(i.id)));
    const ids = atWorkIds(g, mate);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.some((w) => !allowed.has(w))).toBe(true);
  });

  it('a patient goes to someone whose level sees to it, when one is free', () => {
    expect(roleAt('doctor', { stage: 0 })!.socials ?? []).not.toContain('diagnosePatient');
    const g = Game.workplaceTour('doctor', seeded(13));
    const [junior, senior] = [0, 1].map((n) => coworkers(g).filter((s) => !s.npc!.boss)[n]);
    // Someone past residency, whichever this draw gave.
    Object.assign(senior.npc!, { rung: { stage: 1, branch: 0, title: '외과 전문의', rung: '외과 전문의' } });
    expect(junior.npc!.rung!.stage).toBe(0);
    expect(roleAt('doctor', senior.npc!.rung!)!.socials).toContain('diagnosePatient');
    // The junior stands right beside them: today the nearest would go.
    const client = JSON.parse(JSON.stringify(junior));
    Object.assign(client, { id: 987654, x: junior.x + 1, y: junior.y, queue: [], npc: { role: 'client', until: 1e9, serves: 'doctor', wants: 'diagnosePatient', arrived: -1e6 } });
    Object.assign(senior, { x: junior.x + 12, y: junior.y });
    g.state.dwellers.push(client);
    (g as unknown as { colleaguesSeeToClients(d: unknown): void }).colleaguesSeeToClients(WORKPLACES.doctor);
    expect(client.npc.claimedBy).toBe(senior.id);
  });
});

describe('on shift', () => {
  const ids = (g: Game, mate: Parameters<typeof rankOptions>[1]) => rankOptions(g, mate).flatMap((c) => (c.action.kind === 'interact' ? [c.action.interactionId] : [c.action.kind]));

  it.each(PILOT)('%s: a colleague works; a break is a break and never a nap or a novel', (id) => {
    const g = Game.workplaceTour(id, seeded(51));
    for (const mate of coworkers(g)) {
      const allowed = allowedWork(id, mate.npc!.rung)!;
      const start = Math.floor(g.state.time);
      // The next minute this far into their cycle of breaks.
      const inCycle = (minute: number) => { let t = start; while ((t + mate.id * 37) % 150 !== minute) t++; return t; };
      g.state.time = inCycle(60);
      expect(onBreak(mate.id, g.state.time)).toBe(false);
      for (const k of Object.keys(mate.needs) as Array<keyof typeof mate.needs>) mate.needs[k] = 90;
      const working = ids(g, mate);
      expect(working.length, mate.name).toBeGreaterThan(0);
      for (const w of working) expect(allowed.has(w), `${mate.name} ${w}`).toBe(true);
      g.state.time = inCycle(5);
      expect(onBreak(mate.id, g.state.time)).toBe(true);
      expect(ids(g, mate).some((w) => allowed.has(w))).toBe(true);
      for (const w of ['nap', 'read', 'readLogic', 'readPsychology']) expect(ids(g, mate)).not.toContain(w);
    }
  });

  it('other careers’ colleagues choose as they always did', () => {
    expect(allowedWork('nurse', undefined)).toBeNull();
  });
});

describe('someone off the ladder', () => {
  const operator = () => colleaguesFor(WORKPLACES.semiconductor, [], seeded(9), 0, () => false, () => 0).find((t) => t.workmate!.staff)!;

  it('a fab has a line operator, whose work is the line’s and no engineer’s', () => {
    const t = operator();
    const at = colleagueAt(t)!;
    expect(at.title).toBe('라인 오퍼레이터');
    const allowed = allowedWork('semiconductor', at)!;
    const line = ['fbFoup', 'fbWet', 'fbCoat', 'fbExpose'];
    for (const w of line) expect(allowed.has(w), w).toBe(true);
    expect(allowed.has('fbRecipe')).toBe(false);
    for (const key of Object.values(WORK_ROLES.semiconductor.roles)) for (const w of line) expect(key.does).not.toContain(w);
    // They stay off the ladder whatever happens to the list.
    const before = { ...t.job };
    placeColleague(WORKPLACES.semiconductor, t);
    expect(t.job).toEqual(before);
    for (const w of line) expect(WORKPLACES.semiconductor.work).toContain(w);
  });

  it('an old save gets one in the empty slot, without touching the others', () => {
    const def = WORKPLACES.semiconductor;
    const first = colleaguesFor(def, [], seeded(9), 0, () => false, () => 0);
    const without = first.filter((t) => !t.workmate!.staff);
    const again = colleaguesFor(def, [...without], seeded(10), 0, () => false, () => 0);
    expect(again.filter((t) => !t.workmate!.staff).map((t) => t.id)).toEqual(without.map((t) => t.id));
    expect(again.filter((t) => t.workmate!.staff)).toHaveLength(1);
  });

  it('the player, an engineer, isn’t asked to feed the line', () => {
    const line = new Set(['fbFoup', 'fbWet', 'fbCoat', 'fbExpose']);
    for (const at of [{ stage: 0, level: 0 }, { stage: 0, level: 1 }, { stage: 1, level: 2 }, { stage: 1, branch: 0 }, { stage: 1, branch: 1 }, { stage: 2, branch: 0 }] as StageAt[])
      for (let i = 0; i < 12; i++) {
        const tasks = stageTasks(WORKPLACES.semiconductor, seeded(i + 1), at);
        for (const t of tasks) for (const w of t.does ?? []) expect(line.has(w), `${JSON.stringify(at)} ${w}`).toBe(false);
      }
  });
});

describe('the same furniture, different work', () => {
  const tour = (id: string, at: StageAt) => Game.workplaceTour(id, seeded(3), at);
  const menuAt = (g: Game, defId: string) => {
    const worker = g.dweller(g.state.workplace!.workerId)!;
    const obj = g.state.objects.find((o) => o.defId === defId)!;
    return { worker, obj, menu: g.objectMenu(worker, obj) };
  };
  const labelOf = (g: Game, defId: string, inter: string) => menuAt(g, defId).menu.find((m) => m.id === inter)!;
  const CASES: Array<[string, string, string]> = [
    ['semiconductor', 'fbMicroscope', 'fbDefect'],
    ['semiconductor', 'fbYieldBoard', 'fbYield'],
    ['doctor', 'xrayViewer', 'readXray'],
    ['doctor', 'medStation', 'writeChart'],
    ['teacher', 'teacherDesk', 'gradePapers'],
    ['teacher', 'chalkboard', 'teachLesson'],
  ];

  it.each(CASES)('%s %s %s: its own label at 입문, 전문 and 리더', (id, piece, inter) => {
    const v = WORK_ROLES[id].variants[inter];
    expect(labelOf(tour(id, { stage: 0 }), piece, inter).label).toBe(v.entry!.label);
    expect(labelOf(tour(id, { stage: 1, branch: 0 }), piece, inter).label).toBe(v.expert!.label);
    expect(labelOf(tour(id, { stage: 2, branch: 0 }), piece, inter).label).toBe(v.lead!.label);
  });

  it('the queue and the colleague’s own work are named at their level too', () => {
    const g = Game.workplaceTour('semiconductor', seeded(5));
    const boss = coworkers(g).find((s) => s.npc!.boss)!;
    const obj = g.state.objects.find((o) => o.defId === 'fbYieldBoard')!;
    g.enqueue(boss.id, { kind: 'interact', objectUid: obj.uid, interactionId: 'fbYield', autonomous: false });
    expect(g.actionLabel(boss.queue[0]).label).toBe('어느 공정부터 손볼지 정하기');
    expect(g.workVariantOf(boss, g.interaction(obj, 'fbYield')!)!.spotAs).toBe('semiconductor_leadYield');
  });

  it.each(PILOT)('%s: past 입문, the junior’s work is open as the senior’s version', (id) => {
    const junior = stageActions(id).find((a) => a.stage === 'junior')!;
    const seen = WORK_ROLES[id].seniors[`${id}_${junior.key}`];
    expect(seen).toBeTruthy();
    expect(stageLock({ career: id, ...gateOf(junior) }, { stage: 1, branch: 0 })).toBeNull();
    const g = tour(id, { stage: 2, branch: 0 });
    const opt = labelOf(g, junior.station, `${id}_${junior.key}`);
    expect(opt.disabled).toBeUndefined();
    expect(opt.label).toBe(seen.label);
    // At 입문 it's still the junior's own.
    expect(labelOf(tour(id, { stage: 0 }), junior.station, `${id}_${junior.key}`).label).toBe(junior.label);
  });
});

describe('a line on how it usually goes, after a question', () => {
  const pilotEvents = CAREER_EVENTS.filter((e) => e.careers.some((c) => PILOT.includes(c)));

  it('every event of the three careers has one, soft and short, and no verdict', () => {
    expect(pilotEvents.length).toBe(12);
    for (const e of pilotEvents) {
      expect(e.insight, e.id).toBeTruthy();
      expect(e.insight!.length, e.id).toBeLessThanOrEqual(90);
      expect(e.insight!, e.id).not.toMatch(/정답|틀렸|오답|잘못/);
    }
  });

  it('shows in the result whichever answer was chosen, and changes nothing else', () => {
    for (const choice of [0, 1]) {
      const { g, dweller } = employed('doctor');
      g.state.careerEvent = { dwellerId: dweller.id, slot: 'job', eventId: 'doc_night', at: g.state.time };
      g.answerCareerEvent(choice);
      expect(g.state.workResult!.insight).toBe(`현장에서는 보통 ${CAREER_EVENTS.find((e) => e.id === 'doc_night')!.insight}`);
      expect(g.state.workResult!.chose).toBeTruthy();
    }
  });

  it('the result window shows it', () => {
    const { g, dweller } = employed('teacher');
    g.state.careerEvent = { dwellerId: dweller.id, slot: 'job', eventId: 'tea_parent', at: g.state.time };
    g.answerCareerEvent(1);
    const html = renderToStaticMarkup(WorkResultModal({ game: g }));
    expect(html).toContain('현장에서는 보통 상담은 미리 시간을 정해서');
  });

  it('an answer given by the dweller alone only goes to the log, as ever', () => {
    const { g, dweller } = employed('doctor');
    g.state.careerEvent = { dwellerId: dweller.id, slot: 'job', eventId: 'doc_night', at: g.state.time };
    g.answerCareerEvent(0, true);
    expect(g.state.workResult).toBeUndefined();
  });

  const aiCard = (extra: object = {}) => ({
    text: '{n:이/가} 맡은 환자의 기록에서 앞뒤가 맞지 않는 곳을 찾았어요.',
    choices: [
      { label: '바로 묻기', approach: 'self', win: { text: '금방 풀렸어요.', perf: 7 } },
      { label: '함께 보기', approach: 'together', win: { text: '같이 찾았어요.', perf: 7 } },
      { label: '기록해 두기', approach: 'safe', win: { text: '나중에 확인했어요.', perf: 7 } },
    ],
    ...extra,
  });

  it('an AI card shows one only if the server sent one; a bad one is left off and the card stands', () => {
    const job = employed('doctor').dweller.job!;
    expect(toCareerEvent('a', aiCard(), job)!.insight).toBeUndefined();
    expect(toCareerEvent('b', aiCard({ insight: '위 연차에게 먼저 물어봐요.' }), job)!.insight).toBe('위 연차에게 먼저 물어봐요.');
    expect(toCareerEvent('c', aiCard({ insight: 42 }), job)!.insight).toBeUndefined();
    expect(toCareerEvent('d', aiCard({ insight: '술자리에서 풀어요. 그렇게들 해요.' }), job)).toBeTruthy();
    expect(toCareerEvent('d', aiCard({ insight: '술자리에서 풀어요. 그렇게들 해요.' }), job)!.insight).toBeUndefined();
    expect(fieldNote('현장에서는 보통 위 연차에게 물어요.')).toBe('현장에서는 보통 위 연차에게 물어요.');
    // Played through.
    const { g, dweller } = employed('doctor');
    const ai = toCareerEvent('e', aiCard({ insight: '위 연차에게 먼저 물어봐요.' }), dweller.job!)!;
    g.state.careerEvent = { dwellerId: dweller.id, slot: 'job', eventId: ai.id, at: g.state.time, ai };
    g.answerCareerEvent(0);
    expect(g.state.workResult!.insight).toBe('현장에서는 보통 위 연차에게 먼저 물어봐요.');
    const plain = toCareerEvent('f', aiCard(), dweller.job!)!;
    g.closeWorkResult();
    g.state.careerEvent = { dwellerId: dweller.id, slot: 'job', eventId: plain.id, at: g.state.time, ai: plain };
    g.answerCareerEvent(0);
    expect(g.state.workResult!.insight).toBeUndefined();
  });

  it('the request asks for one for the three careers only', () => {
    for (const id of PILOT) {
      const { dweller } = employed(id);
      expect(careerRequest(dweller, dweller.job!, undefined, []).context).toHaveProperty('insight');
    }
    for (const id of OTHERS) {
      const { dweller } = employed(id);
      expect(careerRequest(dweller, dweller.job!, undefined, []).context).not.toHaveProperty('insight');
    }
  });
});

describe('old saves', () => {
  /** A colleague as an old save has them: a random level of the shared ladder. */
  const oldMate = (id: number, careerId: string, slot: number, level: number, boss = false): Townie =>
    ({ id, name: boss ? '강민호 과장' : '임태윤', home: `work:${careerId}`, job: { careerId, level }, workmate: { careerId, slot, ...(boss ? { boss: true } : {}) }, traits: [] }) as unknown as Townie;

  it.each(PILOT)('%s: colleagues from before come to a fitting rung, friendships and ids kept, and stay there', (id) => {
    const def = WORKPLACES[id];
    // (Someone off the ladder is new since then: drawn into their own slot, below.)
    const ladder = def.coworkers.filter((c) => !c.staff);
    const townies = ladder.map((c, i) => oldMate(9000 + i, id, i, Math.min(2, i + 1), !!c.boss));
    const mates = colleaguesFor(def, townies, seeded(1), 0, () => false, () => 0).filter((t) => !t.workmate!.staff);
    expect(mates.map((t) => t.id)).toEqual(ladder.map((_, i) => 9000 + i));
    const first = mates.map((t) => ({ ...t.job }));
    for (const t of mates) {
      expect(colleagueAt(t)).toBeTruthy();
      expect(levelsOf(CAREER_BY_ID[id], t.job!.branch)[t.job!.level]).toBeTruthy();
    }
    expect(new Set(mates.map((t) => roleKeyOf(colleagueAt(t)!))).size).toBe(mates.length);
    expect(colleaguesFor(def, townies, seeded(2), 0, () => false, () => 0).filter((t) => !t.workmate!.staff).map((t) => t.job)).toEqual(first);
  });

  it('a shift saved before this goes on: no rung means no title and work as before', () => {
    const g = Game.workplaceTour('doctor', seeded(9));
    const saved = JSON.parse(JSON.stringify(g.state));
    for (const s of saved.dwellers) if (s.npc) delete s.npc.rung;
    const back = new Game(saved, seeded(9));
    const mate = coworkers(back)[1];
    expect(mate.npc!.rung).toBeUndefined();
    expect(back.workAtOf(mate)).toBeNull();
    expect(allowedWork('doctor', mate.npc!.rung)).toBeNull();
    const obj = back.state.objects.find((o) => o.defId === 'xrayViewer')!;
    expect(back.workVariantOf(mate, back.interaction(obj, 'readXray')!)).toBeUndefined();
    expect(atWorkIds(back, mate).length).toBeGreaterThan(0);
    for (let t = 0; t < 20; t += 0.5) back.step(0.5);
  });

  it('a saved card answered after the update: an old written event gets the line, an AI card without one doesn’t', () => {
    const { g, dweller } = employed('semiconductor');
    const saved = JSON.parse(JSON.stringify({ ...g.state, careerEvent: { dwellerId: dweller.id, slot: 'job', eventId: 'fab_hold', at: g.state.time } }));
    const back = new Game(saved, () => 0.1);
    back.answerCareerEvent(1);
    expect(back.state.workResult!.insight).toContain('현장에서는 보통');
  });

  it('a colleague who moved in keeps a job the game can read', () => {
    const def = WORKPLACES.doctor;
    const boss = colleaguesFor(def, [], seeded(4), 0, () => false, () => 0).find((t) => t.workmate!.boss)!;
    const job = boss.job!;
    expect(levelOf({ ...job, performance: 0 } as Parameters<typeof levelOf>[0]).title).toBe(levelsOf(CAREER_BY_ID.doctor, job.branch)[job.level].title);
  });
});

describe('every other career is exactly as it was', () => {
  it.each(OTHERS)('%s', (id) => {
    expect(WORK_ROLES[id]).toBeUndefined();
    expect(hasSeniorWork(id)).toBe(false);
    // Its colleagues: the old draw.
    const def = WORKPLACES[id];
    const mates = colleaguesFor(def, [], seeded(21), 0, () => false, () => 0);
    const top = CAREER_BY_ID[id].levels.length - 1;
    for (const t of mates) {
      expect(t.job!.branch).toBeUndefined();
      if (t.workmate!.boss) expect(t.job!.level).toBe(top);
      else expect(t.job!.level).toBeLessThanOrEqual(Math.min(top, 3));
      expect(colleagueAt(t)).toBeUndefined();
      const before = { ...t.job };
      placeColleague(def, t);
      expect(t.job).toEqual(before);
    }
    expect(colleagueRung(id, 0, 5)).toBeNull();
    // No rung on the lot, no title, the choice of work unfiltered.
    const g = Game.workplaceTour(id, seeded(21));
    for (const m of coworkers(g)) {
      expect(m.npc!.rung).toBeUndefined();
      expect(rankOptions(g, m).every((c) => c.fit === undefined)).toBe(true);
    }
    // The junior's work still locks past 입문.
    const junior = stageActions(id).find((a) => a.stage === 'junior');
    if (junior) expect(stageLock({ career: id, ...gateOf(junior) }, { stage: 1, branch: 0 })).toBe('입문 단계의 일이에요');
    // The labels at every stage are what the catalogue says.
    for (const at of [{ stage: 0 }, { stage: 1, branch: 0 }, { stage: 2, branch: 1 }] as StageAt[]) {
      const lot = Game.workplaceTour(id, seeded(22), at);
      const worker = lot.dweller(lot.state.workplace!.workerId)!;
      for (const obj of lot.state.objects)
        for (const m of lot.objectMenu(worker, obj)) {
          const inter = lot.interaction(obj, m.id)!;
          expect(m.label.startsWith(inter.label), m.id).toBe(true);
          expect(m.icon).toBe(inter.icon);
        }
      expect(workVariant(id, { id: 'anything' }, at)).toBeUndefined();
    }
    // Its questions: no insight.
    for (const e of CAREER_EVENTS.filter((x) => x.careers.includes(id))) expect(e.insight, e.id).toBeUndefined();
  });
});
