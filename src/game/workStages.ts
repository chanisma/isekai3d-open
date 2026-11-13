import { CAREER_BY_ID } from './careers';
import { getDef } from './catalog';
import type { InteractionDef, Job, Needs, SkillKey } from './types';
import type { WorkTask, WorkplaceDef } from './workplace';
import { hasSeniorWork } from './workRoles';
import { STAGE_ACTION_DATA } from './workStageData';

/**
 * Work that follows the job's stage (ours, at the user's request; 참고 게임's Get to Work active careers
 * give each career level its own daily tasks, and base-game career levels their own daily task):
 * - 입문 (the shared rungs): learning the basics beside a senior;
 * - 실무 (the back half of a shared ladder of four rungs or more; 2026-10-26, at the user's request —
 *   a 개발 팀장 or 전문의 was still "learning beside a senior"): doing the job alone, no branch yet;
 * - 전문 (a branch's rungs): the branch's own specialised work;
 * - 리더 (the top two rungs): leading people, planning, deciding — a branch's own leader's work
 *   (`lead0`, `lead1`) where the branches lead differently, else the career's (2026-10-26, at the user's request).
 * Every workplace has one action for each (stations it already has, `workStageData.ts`), the day's
 * tasks add the stage's work, and the actions of a stage not reached yet show locked.
 */

export type WorkStage = 0 | 1 | 2;
export const STAGE_INFO: Record<WorkStage, { label: string; icon: string; desc: string }> = {
  0: { label: '입문', icon: '🌱', desc: '선배 곁에서 기본기를 익혀요' },
  1: { label: '전문', icon: '🛠️', desc: '갈래의 전문 업무를 맡아요' },
  2: { label: '리더', icon: '🧭', desc: '사람과 일을 이끌어요' },
};
/** 실무: stage 1 before the branch (the back half of the shared rungs), and a part-time job's middle rung. */
export const PRACTICE_INFO = { label: '실무', icon: '💼', desc: '맡은 일을 혼자 해내요' };

/** Where a job sits, as the day's work sees it; `level` is the rung, when known. */
export interface StageAt {
  stage: WorkStage;
  branch?: number;
  level?: number;
}

/** Whether a stage is 실무: stage 1 before the branch, or a part-time ladder's middle (no branches). */
export function isPractice(at: StageAt, careerId?: string): boolean {
  if (at.stage !== 1) return false;
  return at.branch === undefined || (!!careerId && !!CAREER_BY_ID[careerId] && !CAREER_BY_ID[careerId].branches?.length);
}

/** The label, icon and line for where a job sits (실무 shown as its own stage). */
export function stageInfo(at: StageAt, careerId?: string): { label: string; icon: string; desc: string } {
  const info = isPractice(at, careerId) ? PRACTICE_INFO : STAGE_INFO[at.stage];
  const own = careerId ? CAREER_STAGES[careerId] : undefined;
  if (!own) return info;
  const words = at.stage === 0 ? own.entry : at.stage === 2 ? own.lead : isPractice(at, careerId) ? own.practice ?? own.expert : own.expert;
  return { ...info, ...words };
}

/** What a task is about, for sorting the day's list (ours). */
export type TaskKind = 'core' | 'people' | 'team' | 'record' | 'learn' | 'lead' | 'urgent';
export const TASK_KIND: Record<TaskKind, { label: string; icon: string }> = {
  core: { label: '핵심 업무', icon: '🔧' },
  people: { label: '사람 응대', icon: '🙋' },
  team: { label: '협업', icon: '🤝' },
  record: { label: '기록·행정', icon: '📝' },
  learn: { label: '배우기', icon: '📚' },
  lead: { label: '이끌기', icon: '🧭' },
  urgent: { label: '긴급', icon: '🚨' },
};

export interface StageAction {
  career: string;
  /** 입문, 실무 (`common`: before the branch), a branch's work, the leader's (the career's, or one branch's). */
  stage: 'junior' | 'common' | 'branch0' | 'branch1' | 'branch2' | 'lead' | 'lead0' | 'lead1';
  station: string;
  key: string;
  label: string;
  icon: string;
  duration: number;
  skill: SkillKey;
  effects: Partial<Needs>;
  task: string;
  kind: TaskKind;
}

/**
 * Stages set rung by rung (2026-11-02, at the user's request), where the rule below would misplace them:
 * e 입문, p 실무, x 전문, l 리더. A career's branch can start before its work is a specialist's (a 외과 레지던트
 * has a specialty and is still in training), so below 전문 the branch isn't part of the stage.
 */
const RUNG_STAGES: Record<string, string | string[]> = {
  doctor: 'eeppxxxxxll',
  semiconductor: 'eepxxll',
  // By branch: 학교 관리직, 교육 전문직, 수석교사.
  teacher: ['eeeppll', 'eeeppxll', 'eeeppx'],
};
export const hasRungStages = (careerId: string) => !!RUNG_STAGES[careerId];

/** What the stages are called in a job, where the general words would misdescribe them (a resident isn't "on their own"). */
const CAREER_STAGES: Record<string, { entry: StageWords; practice?: StageWords; expert: StageWords; lead: StageWords }> = {
  doctor: {
    entry: { label: '실습·인턴', desc: '지도받으며 의사의 기본을 익혀요' },
    practice: { label: '전공의 수련', desc: '전공 과에서 지도받으며 환자를 돌봐요' },
    expert: { label: '전문의·교수', desc: '맡은 환자를 책임지고 후배를 지도해요' },
    lead: { label: '과장·병원장', desc: '과나 병원을 꾸려 가요' },
  },
  semiconductor: {
    entry: { label: '인턴·신입', desc: '정해진 절차대로 하며 라인을 익혀요' },
    practice: { label: '주니어', desc: '맡은 공정이나 장비의 데이터를 살펴요' },
    expert: { label: '엔지니어', desc: '원인을 찾고 조건을 바꿔 시험해요' },
    lead: { label: '책임자', desc: '어느 문제부터 손볼지 정해요' },
  },
  teacher: {
    entry: { label: '교생·초임', desc: '수업을 맡아 하며 교사의 일을 익혀요' },
    practice: { label: '경력 교사', desc: '담임과 학교 일을 맡아 꾸려 가요' },
    expert: { label: '수석·장학', desc: '수업과 학교 교육을 살피고 도와요' },
    lead: { label: '학교·지역 책임자', desc: '학교나 지역의 교육을 책임져요' },
  },
};
interface StageWords {
  label: string;
  desc: string;
}

/** Where a job sits: its stage, and its branch once it has one. */
export function stageOf(job: Pick<Job, 'careerId' | 'level' | 'branch'> | null | undefined): { stage: WorkStage; branch?: number } {
  const c = job && CAREER_BY_ID[job.careerId];
  if (!c || !job) return { stage: 0 };
  const rungs = RUNG_STAGES[job.careerId];
  if (rungs) {
    const row = typeof rungs === 'string' ? rungs : rungs[job.branch ?? 0];
    const r = row[Math.min(job.level, row.length - 1)];
    if (r === 'e') return { stage: 0 };
    if (r === 'p' || job.branch === undefined) return { stage: r === 'l' ? 2 : 1 };
    return { stage: r === 'l' ? 2 : 1, branch: job.branch };
  }
  const shared = c.levels.length;
  if (!c.branches?.length) {
    // Part-time ladders have no branches. Three rungs (all of them now) are 입문, 실무, 리더 — the top
    // rung used to need n > 3 and was never reached (2026-10-26, at the user's request); a longer one
    // keeps its first third 입문 and its last two rungs 리더.
    const n = shared;
    if (n <= 3) return { stage: job.level >= n - 1 ? 2 : job.level >= 1 ? 1 : 0, branch: 0 };
    return { stage: job.level >= n - 2 ? 2 : job.level >= Math.ceil(n / 3) ? 1 : 0, branch: 0 };
  }
  if (job.level < shared || job.branch === undefined) {
    // The back half of four or more shared rungs is 실무 (stage 1, no branch yet), the front half 입문.
    return { stage: shared >= PRACTICE_FROM && Math.min(job.level, shared - 1) >= Math.ceil(shared / 2) ? 1 : 0 };
  }
  const n = shared + c.branches[job.branch].levels.length;
  return { stage: job.level >= n - 2 ? 2 : 1, branch: job.branch };
}

/** Shared ladders this long or longer split into 입문 and 실무. */
export const PRACTICE_FROM = 4;

/** The stage (and branch) a stage action is for. */
export function gateOf(a: Pick<StageAction, 'stage'>): { stage: WorkStage; branch?: number } {
  switch (a.stage) {
    case 'junior':
      return { stage: 0 };
    case 'common':
      return { stage: 1 };
    case 'lead':
      return { stage: 2 };
    case 'lead0':
    case 'lead1':
      return { stage: 2, branch: a.stage === 'lead0' ? 0 : 1 };
    default:
      return { stage: 1, branch: Number(a.stage.slice(-1)) };
  }
}

export const actionId = (a: StageAction) => `${a.career}_${a.key}`;
const BY_CAREER = new Map<string, StageAction[]>();
for (const a of STAGE_ACTION_DATA) {
  if (!BY_CAREER.has(a.career)) BY_CAREER.set(a.career, []);
  BY_CAREER.get(a.career)!.push(a);
}
export const stageActions = (careerId: string): StageAction[] => BY_CAREER.get(careerId) ?? [];

/**
 * The stage actions that are the job's work at a stage: 입문's; 실무's (입문's where the career has
 * none); the branch's; at 리더 the branch's and the leader's (the branch's own, else the career's).
 */
export function stageActionsAt(careerId: string, at: StageAt): StageAction[] {
  const own = stageActions(careerId);
  const pick = (stage: StageAction['stage']) => own.find((a) => a.stage === stage);
  const out: Array<StageAction | undefined> = [];
  if (at.stage === 0) out.push(pick('junior'));
  else if (at.stage === 1 && at.branch === undefined) out.push(pick('common') ?? pick('junior'));
  else {
    const b = at.branch === 1 ? 1 : 0;
    out.push(pick(at.branch === 2 ? 'branch2' : b ? 'branch1' : 'branch0'));
    if (at.stage === 2) out.push(pick(b ? 'lead1' : 'lead0') ?? pick('lead'));
  }
  return out.filter((a): a is StageAction => !!a);
}

/**
 * Whether the worker may do a stage action: the junior's is for 입문 only (a leader doesn't need
 * showing the ropes), 실무's from 실무 on, a branch's from 전문 in that branch (not before the branch
 * is chosen), a leader's at 리더 (a branch leader's in that branch). Null when allowed; otherwise
 * the reason it's locked. Where the career has a senior's version of the junior's work (workRoles.ts, the
 * pilot's three), it stays open past 입문 as that version.
 */
export function stageLock(gate: NonNullable<InteractionDef['workStage']>, at: StageAt): string | null {
  if (gate.stage === 0) return at.stage === 0 || hasSeniorWork(gate.career) ? null : '입문 단계의 일이에요';
  if (at.stage < gate.stage) return `🔒 ${(CAREER_STAGES[gate.career] ? stageInfo({ stage: gate.stage as WorkStage, branch: gate.branch }, gate.career) : STAGE_INFO[gate.stage as WorkStage]).label} 단계부터`;
  if (gate.branch !== undefined && at.branch === undefined) return '갈래를 정한 뒤의 일이에요';
  if (gate.branch !== undefined && gate.branch !== at.branch) return '다른 갈래의 일이에요';
  return null;
}

/** Puts the stage actions on their stations and into each workplace's work (once, at load). */
export function installStageActions(workplaces: Record<string, WorkplaceDef>) {
  for (const a of STAGE_ACTION_DATA) {
    const wp = workplaces[a.career];
    if (!wp) continue;
    const id = actionId(a);
    const def = getDef(a.station);
    if (def.interactions.some((i) => i.id === id)) continue;
    def.interactions.push({
      id,
      label: a.label,
      icon: a.icon,
      duration: a.duration,
      effects: a.effects,
      skill: { key: a.skill, rate: 1 / 90 },
      requires: 'atWork',
      pose: 'front',
      workStage: { career: a.career, ...gateOf(a) },
    });
    for (const lot of stageLots(wp, a.stage)) if (!lot.work.includes(id)) lot.work.push(id);
  }
}

/**
 * The lots a stage's action is done at: a branch's own where it has one (a 관제사's at the 관제센터), the career's for the rest; a
 * leader of the whole career at both.
 */
export function stageLots(wp: WorkplaceDef, stage: StageAction['stage']): WorkplaceDef[] {
  const m = /^(?:branch|lead)(\d)$/.exec(stage);
  const own = m ? wp.branchLots?.[Number(m[1])] : undefined;
  if (own) return [own];
  if (stage === 'lead') return [wp, ...Object.values(wp.branchLots ?? {}).filter((l): l is WorkplaceDef => !!l)];
  return [wp];
}

/** A task's kind, from what counts towards it. */
export function taskKind(t: WorkTask, def: WorkplaceDef): TaskKind {
  if (t.kind) return t.kind;
  if (t.social) return 'team';
  const does = t.does ?? [];
  if (def.alarm && does.includes(def.alarm.interaction)) return 'urgent';
  if (does.some((id) => def.clients?.some((c) => c.socials.includes(id)))) return 'people';
  if (does.includes('attendMeeting')) return 'team';
  if (does.includes('readArchive') || /보고|일지|기록|서류|정리|문서|목록/.test(t.label)) return 'record';
  return 'core';
}

/**
 * Whether a task fits where the job sits (2026-10-26, at the user's request): from its stage and rung
 * (licensed work isn't for the unlicensed first rungs; a trainee doesn't fly the route) and only in
 * its branch. When it doesn't, its `instead` (an entry task that does) or nothing. An unknown rung
 * (looking round a lot by stage) counts as the stage's lowest: 입문's first, past 입문 any.
 */
export function fitTask(t: WorkTask, at: StageAt): WorkTask | undefined {
  const level = at.level ?? (at.stage >= 1 ? Infinity : 0);
  const fits = (t.minStage === undefined || at.stage >= t.minStage) && (t.minLevel === undefined || level >= t.minLevel) && (t.branch === undefined || (at.stage >= 1 && at.branch === t.branch));
  if (fits) return t;
  return t.instead && fitTask(t.instead, at);
}

/** How many of the day's customers a task of seeing to them asks for. */
const CLIENT_TASK_NEED = 2;

/** What a leader's "report to the boss" becomes: hearing the team's report (2026-10-26, at the user's request). */
export const HEAR_REPORT: WorkTask = { id: 'hearReport', label: '팀원에게 진행 상황 보고 받기', social: 'coworker', need: 1, count: 0, kind: 'lead' };

/**
 * The day's tasks at a stage: the job's own tasks — the branch's own where it has them, each fitted
 * to the stage and rung (`fitTask`), a leader doing a little less of the hands-on work — the stage's
 * work, and one of the extras that fit (not one already on the list). At 리더 nobody above is
 * reported to: the boss's task becomes hearing the team's report.
 */
export function stageTasks(def: WorkplaceDef, rng: () => number, at: StageAt): WorkTask[] {
  const fit = (ts: WorkTask[]) => ts.map((t) => fitTask(t, at)).filter((t): t is WorkTask => !!t);
  const inBranch = at.stage >= 1 && at.branch !== undefined;
  const lead = (t: WorkTask): WorkTask => (at.stage === 2 && t.social === 'boss' ? HEAR_REPORT : t);
  const own = fit((inBranch && def.branchTasks?.[at.branch!]) || def.tasks).map(lead);
  const core = own.map((t) => ({ ...t, need: at.stage === 2 ? Math.max(1, t.need - 1) : t.need }));
  // Whoever comes in to be seen to counts on the day's list (2026-11-01, at the user's request): in many
  // jobs seeing to them was on no task, or only on an extra drawn now and then, so a customer served ticked nothing.
  // (Not on a branch's own list: a judge has no clients, whoever else comes in.)
  for (const spec of inBranch && def.branchTasks?.[at.branch!] ? [] : def.clients ?? []) {
    // None of it on the list: a task of its own (some of it may be left off on purpose: a student doctor takes histories, and doesn't diagnose).
    if (!spec.socials.some((s) => core.some((t) => t.does?.includes(s)))) core.push({ id: `clients_${spec.socials[0]}`, label: `${spec.noun} 응대`, does: [...spec.socials], need: CLIENT_TASK_NEED, count: 0 });
    // A task that's only this: one customer shouldn't finish a whole day's worth.
    for (const t of core) if (t.does?.length && t.does.every((d) => spec.socials.includes(d))) t.need = Math.max(t.need, CLIENT_TASK_NEED);
  }
  const extras = fit((inBranch && def.branchExtra?.[at.branch!]) || def.extra)
    .map(lead)
    .filter((t) => !core.some((c) => c.id === t.id));
  const extra = extras.length ? [extras[Math.floor(rng() * extras.length)]] : [];
  const staged = stageActionsAt(def.careerId, at).map((a): WorkTask => ({ id: `stage_${a.key}`, label: a.task, does: [actionId(a)], need: 1, count: 0, kind: a.kind }));
  return [...core, ...staged, ...extra].map(({ minStage, minLevel, branch, instead, ...t }) => ({ ...t, count: 0, kind: t.kind ?? taskKind(t, def) }));
}
