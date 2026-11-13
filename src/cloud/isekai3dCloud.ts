import type { Game } from '../game/game';
import type { CloudPort, exploreRequest, lifeRequest, careerRequest } from '../game/aiQuestions';
import type { PlayerKnowledge } from '../game/knowledge';

/**
 * The way to 스페이스기전 for a game running in 스페이스기전 학생 (docs/ref-game/08-knowledge.md §6): the
 * program's own little server takes `POST /api/isekai3d/<what>` on the game's address and passes it
 * on with the student's session (D:/NEIS_helper app/core/isekai3d_server.py). Elsewhere (the dev
 * server, the web) there's no such server and the game goes on with its written cards.
 *
 * The server keeps the day's one question (isekai3d_question_take) and makes three at a time
 * (isekai3d-question); here we only ask, and never keep the game waiting.
 */

export interface CloudStatus {
  /** Signed in to 스페이스기전 in 스페이스기전 학생. */
  signedIn: boolean;
  /** Agreed to the privacy policy (on the 스페이스기전 web). */
  consent: boolean;
  /** Lets 스페이스기전 keep what's known of the player. */
  memory: boolean;
  deliveredToday: boolean;
  /** Why the questions aren't coming, for the player. */
  note?: string;
  /** A 스페이스기전 admin: the game shows its 🛠 test menu (never a student). */
  dev?: boolean;
}

interface Reply {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
}

/** `keepalive`: still sent as the window closes (the arcade's last count). */
export async function post(what: string, body: unknown = {}, keepalive = false): Promise<Reply> {
  try {
    const r = await fetch(`/api/isekai3d/${what}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive });
    const data = r.headers.get('Content-Type')?.includes('application/json') ? ((await r.json()) as Record<string, unknown> | null) : null;
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** One question made for an admin testing (isekai3d_dev_questions). */
export interface DevQuestion {
  id: string;
  kind: 'career' | 'life' | 'explore';
  contextKey: string;
  /** Sorted out by the server from the context: the job and rung of a work card, the moment of a life question. */
  careerId: string | null;
  careerLevel: number | null;
  /** junior 입문 · expert 전문 · leader 리더, and the branch's name. */
  careerStage: string | null;
  careerBranch: string | null;
  lifeEvent: string | null;
  model: string | null;
  batch: string;
  card: { text?: string; options?: string[]; choices?: Array<Record<string, unknown>> };
  createdAt: string;
  deliveredAt: string | null;
  answeredAt: string | null;
  choice: number | null;
  text: string | null;
}

type Req = ReturnType<typeof careerRequest> | ReturnType<typeof lifeRequest> | ReturnType<typeof exploreRequest>;

export class Isekai3dCloud implements CloudPort {
  status: CloudStatus;
  /** What the last ask did, for the 🛠 test menu. */
  trace = '';
  private version = 0;
  private busy = new Set<string>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();

  private constructor(private game: Game, status: CloudStatus) {
    this.status = status;
  }

  /**
   * The cloud for this game, if it runs where there is one: null on the dev server or the web
   * (no bridge), else one that may still say why it can't ask (not signed in, no consent).
   */
  static async connect(game: Game): Promise<Isekai3dCloud | null> {
    // The dev server has no bridge (it would only answer 404 into the console).
    if (import.meta.env.DEV) return null;
    const r = await post('status', { p_context_key: null });
    if (r.status === 0 || r.status === 404 || r.status === 405 || !r.data) return null;
    if (r.status === 401) return new Isekai3dCloud(game, { signedIn: false, consent: false, memory: false, deliveredToday: false, note: '스페이스기전 학생에서 로그인하면 AI 질문을 받을 수 있어요' });
    if (!r.ok) return null;
    const d = r.data;
    const cloud = new Isekai3dCloud(game, {
      signedIn: true,
      consent: !!d.consent,
      memory: d.memory !== false,
      deliveredToday: !!d.deliveredToday,
      dev: !!d.dev,
      note: d.consent ? undefined : '스페이스기전 웹에서 개인정보 처리 동의를 하면 AI 질문을 받을 수 있어요',
    });
    await cloud.load();
    return cloud;
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
  private changed() {
    for (const fn of this.listeners) fn();
  }

  private get usable() {
    return this.status.signedIn && this.status.consent;
  }

  canMakeCards() {
    return !!this.usable && (!this.status.deliveredToday || !!this.status.dev);
  }

  /** What 스페이스기전 keeps of the player, merged into this game's, and the merged copy kept again. */
  private async load() {
    const r = await post('knowledge/get');
    if (!r.ok || !r.data) return;
    this.version = Number(r.data.version) || 0;
    this.status.memory = r.data.memory !== false;
    if (this.status.memory) {
      this.game.mergeRemoteKnowledge(r.data.knowledge as PlayerKnowledge);
      this.knowledgeChanged();
    }
  }

  /**
   * Today's question for this context: one made before and not used yet first, else three made and
   * the first of them (2026-10-25: an admin's too, so what was made gets used). `fresh`: three made
   * first anyway (🛠 testing what the AI makes now). `found` when it comes.
   */
  private ask(req: Req, found: (id: string, card: unknown) => void, fresh = false) {
    const say = (t: string) => {
      this.trace = `${req.contextKey}: ${t}`;
      this.changed();
    };
    if (!this.usable) return say(this.status.note ?? '쓸 수 없어요');
    // 관리자는 한도 없이 받는다 (서버도 관리자에게는 한도를 두지 않는다). 새로 만들고 받는 것은 🛠 시험(fresh)만.
    const dev = !!this.status.dev;
    if (this.status.deliveredToday && !dev) return say('오늘은 이미 받았어요');
    if (this.busy.has(req.contextKey)) return say('이미 묻는 중이에요');
    this.busy.add(req.contextKey);
    say('묻는 중…');
    void (async () => {
      try {
        if (fresh) {
          say('만드는 중…');
          const made = await post('question/fill', req);
          if (!made.ok) return say(`만들지 못했어요 (${String(made.data?.error ?? made.status)})`);
        }
        for (let round = fresh ? 1 : 0; round < 2; round++) {
          const r = await post('question/take', { p_context_key: req.contextKey });
          const status = r.data?.status;
          if (status === 'card' && typeof r.data?.id === 'string') {
            if (!dev) this.status.deliveredToday = true;
            say(fresh ? '받았어요 — 만든 질문은 «만든 질문 모두 보기»에' : '받았어요');
            return found(r.data.id, r.data.card);
          }
          if (status === 'daily_done') {
            this.status.deliveredToday = true;
            return say('오늘은 이미 받았어요');
          }
          if (status !== 'empty' || round) return say(`받지 못했어요 (${String(r.data?.error ?? status ?? r.status)})`);
          // None waiting: three made (the server lets this be only when none wait, a few times a day)
          say('만드는 중…');
          const made = await post('question/fill', req);
          if (made.data?.code === 'CONSENT_REQUIRED') {
            this.status.consent = false;
            this.status.note = '스페이스기전 웹에서 개인정보 처리 동의를 하면 AI 질문을 받을 수 있어요';
            return say(this.status.note);
          }
          if (!made.ok) return say(`만들지 못했어요 (${String(made.data?.error ?? made.status)})`);
        }
      } finally {
        this.busy.delete(req.contextKey);
      }
    })();
  }

  careerCard(req: ReturnType<typeof careerRequest>, found: (id: string, card: unknown) => void, fresh = false) {
    this.ask(req, found, fresh);
  }

  thought(req: ReturnType<typeof lifeRequest> | ReturnType<typeof exploreRequest>, found: (id: string, card: unknown) => void) {
    // An admin's questions to think about are still made new each time (only work cards changed, 2026-10-25).
    this.ask(req, found, !!this.status.dev);
  }

  /**
   * Work episodes (game/episodes.ts) through the program's bridge: the next scene (isekai3d_episode_take,
   * two a day), the next one written ahead (isekai3d-episode — the server keeps it even if the game
   * closes before it's done), the decision kept. None where 스페이스기전 can't be used.
   */
  get episodes(): CloudPort['episodes'] {
    if (!this.usable) return undefined;
    return {
      take: (req, found, none) => {
        const r0 = req as { gameKey: string; career: { id: string } };
        void post('episode/take', { p_game_key: r0.gameKey, p_career: r0.career.id }).then((r) => {
          const d = r.data;
          if (r.ok && d?.status === 'scene' && typeof d.sceneId === 'string') found({ sceneId: d.sceneId, episodeId: String(d.episodeId), idx: Number(d.idx) || 0, scene: d.scene, outline: d.outline });
          else none();
        });
      },
      fill: (req) => {
        const key = `episode:${(req as { gameKey: string }).gameKey}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        void post('episode/fill', req).then((r) => {
          this.busy.delete(key);
          this.trace = `${key}: ${r.ok ? String(r.data?.status ?? 'ok') : String(r.data?.error ?? r.status)}`;
          this.changed();
        });
      },
      answer: (sceneId, choice, text) => void post('episode/answer', { p_scene_id: sceneId, p_choice: choice, p_text: text }),
    };
  }

  answered(id: string, choice: number | null, text?: string) {
    void post('question/answer', { p_id: id, p_choice: choice, p_text: text ?? null });
  }

  knowledgeChanged() {
    if (!this.status.signedIn || !this.status.memory) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.save(), 3000);
  }

  /** Keeps the player's knowledge; if another game or PC kept theirs first, the two are merged and kept. */
  private async save(again = true) {
    const k = this.game.state.player;
    if (!k) return;
    const r = await post('knowledge/save', { p_version: this.version, p_knowledge: k });
    if (!r.ok || !r.data) return;
    if (r.data.memory === false) {
      this.status.memory = false;
      return this.changed();
    }
    this.version = Number(r.data.version) || this.version;
    if (r.data.conflict && again) {
      this.game.mergeRemoteKnowledge(r.data.knowledge as PlayerKnowledge);
      await this.save(false);
    }
  }

  /** 🛠 (admins): every question made for me, newest first (cards, and what I answered). */
  async devQuestions(): Promise<DevQuestion[]> {
    const r = await post('dev/questions', { p_limit: 120 });
    return r.ok && Array.isArray(r.data) ? (r.data as unknown as DevQuestion[]) : [];
  }

  /** Lets 스페이스기전 keep (or forget) what's known of the player. Off forgets what's kept there. */
  async setMemory(on: boolean) {
    const r = await post('memory', { p_enabled: on });
    if (!r.ok) return;
    this.status.memory = on;
    this.version += 1;
    if (on) this.knowledgeChanged();
    this.changed();
  }
}
