import type { Game } from '../game/game';
import { post } from './isekai3dCloud';

/**
 * The arcade's coins (2026-10-20, docs/ref-game/11-ui.md §8): the game opens on an arcade machine, and a
 * coin is a day's play — one in-game day (1440 game minutes). That's at most about 10 real minutes:
 * a whole day at 보통 (2 game minutes a second) takes 12, waking hours at 빠르게 with the night
 * skipped 3–4. A Korean day's first coin is free, the next ones cost the coins of 스페이스기전's
 * wallet (the 다마고찌's and the academy's), and three is the most. What's left doesn't carry over.
 *
 * In 스페이스기전 학생 the server keeps the count and takes the coins (isekai3d_play_*, through the
 * program's bridge, isekai3dCloud.ts). Elsewhere (the web) the same rules are kept in this browser
 * with no price; on the dev server there's no limit on coins, as for a 스페이스기전 admin.
 */
export const PLAY_RULES = {
  /** Game minutes a coin buys. */
  perCoin: 1440,
  maxCoins: 3,
  /** 스페이스기전 coins for every coin after the day's first. */
  price: 5,
} as const;

export interface PlayStatus {
  /** The Korean day (YYYY-MM-DD) the count is for. */
  day: string;
  coins: number;
  maxCoins: number;
  perCoin: number;
  /** Game minutes played today. */
  used: number;
  /** Game minutes bought today (coins × perCoin). */
  budget: number;
  /** What the next coin costs; null when today's coins are all in. */
  nextPrice: number | null;
  /** 스페이스기전 coins in the wallet (null away from 스페이스기전). */
  wallet: number | null;
  admin: boolean;
}

/** Where the count is kept: the 스페이스기전 server, or this browser. */
export type PassWhere = 'cloud' | 'local';

/**
 * Why the arcade can't take a coin right now, for the player: signed out of 스페이스기전, its server
 * not answering, or (2026-10-20, at the user's request: like 스페이스기전's other games, only signed
 * in) not in 스페이스기전 학생 at all.
 */
export type PassProblem = 'signedOut' | 'offline' | 'needsApp';

const LOCAL_KEY = 'isekai3d-play-v1';
/**
 * In 스페이스기전 학생: the most of today's play this PC has counted (2026-10-26, the user found a coin's
 * time come back: a count that didn't reach the server — a failed send, or the window closed first —
 * left the server behind, and the next look at it gave the time back). The server's count is never
 * taken lower than this, and is sent again until it agrees.
 */
const CLOUD_KEY = 'isekai3d-play-cloud-v1';

function readMark(day: string): number {
  try {
    const d = JSON.parse(localStorage.getItem(CLOUD_KEY) ?? 'null') as { day: string; used: number } | null;
    return d && d.day === day ? Number(d.used) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeMark(day: string, used: number) {
  try {
    if (used > readMark(day)) localStorage.setItem(CLOUD_KEY, JSON.stringify({ day, used: Math.round(used) }));
  } catch {
    // kept for this visit only
  }
}

/** The server's count, never below what this PC knows was played today. */
function merged(d: Record<string, unknown>): PlayStatus {
  const s = fromServer(d);
  return { ...s, used: Math.min(s.budget, Math.max(s.used, readMark(s.day))) };
}
/** How often what's been played is told to the server (real ms), and on every coin and stop. */
const REPORT_MS = 30_000;

export function koreaDay(at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

function fromServer(d: Record<string, unknown>): PlayStatus {
  return {
    day: String(d.day ?? koreaDay()),
    coins: Number(d.coins) || 0,
    maxCoins: Number(d.maxCoins) || PLAY_RULES.maxCoins,
    perCoin: Number(d.perCoin) || PLAY_RULES.perCoin,
    used: Number(d.used) || 0,
    budget: Number(d.budget) || 0,
    nextPrice: d.nextPrice === null || d.nextPrice === undefined ? null : Number(d.nextPrice),
    wallet: d.wallet === null || d.wallet === undefined ? null : Number(d.wallet),
    admin: !!d.admin,
  };
}

function errorOf(data: Record<string, unknown> | null, fallback: string): string {
  const m = data && (data.message ?? data.error);
  return typeof m === 'string' && m ? m : fallback;
}

interface LocalDay {
  day: string;
  coins: number;
  used: number;
}

function readLocal(): LocalDay {
  const today = koreaDay();
  try {
    const d = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') as LocalDay | null;
    if (d && d.day === today) return { day: today, coins: Number(d.coins) || 0, used: Number(d.used) || 0 };
  } catch {
    // no storage (a private window): today starts empty
  }
  return { day: today, coins: 0, used: 0 };
}

function writeLocal(d: LocalDay) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(d));
  } catch {
    // kept for this visit only
  }
}

function localStatus(d: LocalDay): PlayStatus {
  const admin = import.meta.env.DEV;
  return {
    day: d.day,
    coins: d.coins,
    maxCoins: PLAY_RULES.maxCoins,
    perCoin: PLAY_RULES.perCoin,
    used: Math.min(d.used, d.coins * PLAY_RULES.perCoin),
    budget: d.coins * PLAY_RULES.perCoin,
    nextPrice: admin || d.coins < PLAY_RULES.maxCoins ? 0 : null,
    wallet: null,
    admin,
  };
}

export class PlayPass {
  status: PlayStatus;
  /** Set when the arcade can't count (signed out of 스페이스기전, or its server didn't answer). */
  problem: PassProblem | null = null;
  private game: Game | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastReport = 0;
  /** What the server is known to have (a send that failed leaves it as it was, to be sent again). */
  private reported = 0;
  private reporting = false;
  private readonly flush = () => {
    this.take();
    void this.report(true, true);
  };
  private listeners = new Set<() => void>();

  private constructor(readonly where: PassWhere, status: PlayStatus) {
    this.status = status;
  }

  /** The pass for this run: 스페이스기전's when the game is in 스페이스기전 학생, else this browser's. */
  static async open(): Promise<PlayPass> {
    if (!import.meta.env.DEV) {
      const r = await post('play/status');
      // A bridge that answers: the count is the server's, even when it can't count yet.
      if (r.status === 401) return Object.assign(new PlayPass('cloud', localStatus({ day: koreaDay(), coins: 0, used: 0 })), { problem: 'signedOut' as const });
      if (r.ok && r.data) {
        const pass = new PlayPass('cloud', merged(r.data));
        pass.reported = fromServer(r.data).used; // behind this PC's count: sent again below
        void pass.report(true);
        return pass;
      }
      if (r.status !== 0 && r.status !== 404 && r.status !== 405) {
        return Object.assign(new PlayPass('cloud', localStatus({ day: koreaDay(), coins: 0, used: 0 })), { problem: 'offline' as const });
      }
    }
    // Built and opened anywhere else: the game is played signed in to 스페이스기전, in 스페이스기전 학생.
    if (!import.meta.env.DEV) return Object.assign(new PlayPass('local', localStatus({ day: koreaDay(), coins: 0, used: 0 })), { problem: 'needsApp' as const });
    return new PlayPass('local', localStatus(readLocal()));
  }

  /** Opens 스페이스기전 학생's own sign-in (Google, in the browser); the game is told nothing of the account. */
  async signIn(): Promise<{ ok: boolean; message: string }> {
    const r = await post('auth/start');
    const m = r.data && (r.data.message ?? r.data.error);
    return { ok: r.ok, message: typeof m === 'string' && m ? m : r.ok ? '브라우저에서 구글 로그인을 마쳐 주세요.' : '로그인을 시작하지 못했어요.' };
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
  private changed() {
    for (const fn of this.listeners) fn();
  }

  /** Game minutes left today. */
  get left(): number {
    return Math.max(0, this.status.budget - this.status.used);
  }

  /** Asks again (after signing in, or when the day may have turned). */
  async refresh(): Promise<void> {
    if (this.where === 'local') {
      this.status = localStatus(readLocal());
    } else {
      const r = await post('play/status');
      if (r.ok && r.data) {
        this.status = merged(r.data);
        this.reported = fromServer(r.data).used;
        this.problem = null;
      } else {
        this.problem = r.status === 401 ? 'signedOut' : 'offline';
      }
    }
    if (this.where === 'local') this.reported = this.status.used;
    else void this.report(true);
    this.pushToGame();
    this.changed();
  }

  /** Puts a coin in. The error is the player's to read (no coins, today's three used, signed out). */
  async insert(): Promise<{ ok: true } | { ok: false; error: string }> {
    this.take();
    if (this.where === 'local') {
      const d = readLocal();
      if (localStatus(d).nextPrice === null) return { ok: false, error: `오늘은 동전을 ${PLAY_RULES.maxCoins}번 모두 넣었어요. 내일 다시 만나요!` };
      d.coins += 1;
      writeLocal(d);
      this.status = localStatus(d);
    } else {
      await this.report(true);
      const r = await post('play/insert');
      if (!r.ok || !r.data) {
        if (r.status === 401) this.problem = 'signedOut';
        this.changed();
        return { ok: false, error: r.status === 401 ? '스페이스기전 학생에서 로그인해야 동전을 넣을 수 있어요.' : errorOf(r.data, '동전을 넣지 못했어요. 잠시 뒤에 다시 해 주세요.') };
      }
      this.status = merged(r.data);
      this.reported = fromServer(r.data).used;
      this.problem = null;
      void this.report(true);
    }
    if (this.where === 'local') this.reported = this.status.used;
    this.pushToGame();
    this.changed();
    return { ok: true };
  }

  /** Puts today's count into the game again (back from the arcade over it). */
  sync() {
    this.take();
    this.pushToGame();
    this.changed();
  }

  /** Counts this game's play against today's coins (the game stops when they run out). */
  attach(game: Game) {
    this.detach();
    this.game = game;
    game.played = 0;
    this.pushToGame();
    this.timer = setInterval(() => void this.tick(), 1000);
    // The window closing: the last count still goes (keepalive).
    if (typeof window !== 'undefined') window.addEventListener('pagehide', this.flush);
  }

  detach() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this.flush);
    if (this.game) {
      this.take();
      void this.report(true);
      this.game.playLeft = null;
    }
    this.game = null;
  }

  /** What the game played since the last look, into today's count. */
  private take() {
    const g = this.game;
    if (!g || g.played <= 0) return;
    this.status = { ...this.status, used: Math.min(this.status.budget, this.status.used + g.played) };
    g.played = 0;
    if (this.where === 'cloud') writeMark(this.status.day, this.status.used);
    if (this.where === 'local') {
      const d = readLocal();
      if (d.day === this.status.day) writeLocal({ ...d, used: Math.max(d.used, Math.round(this.status.used)) });
    }
  }

  private pushToGame() {
    if (this.game) this.game.playLeft = this.left;
  }

  private async tick() {
    const before = this.left;
    this.take();
    // The day turned while playing: today's count starts again (a coin to go on).
    if (this.status.day !== koreaDay()) {
      await this.report(true);
      await this.refresh();
      return;
    }
    // Out of time: told now. (A send that failed is sent again on the next tick: report clears lastReport.)
    if (this.left === 0 && before > 0) await this.report(true);
    else await this.report(false);
    if (this.left !== before) this.changed();
  }

  private async report(now: boolean, keepalive = false) {
    if (this.where !== 'cloud' || this.problem) return;
    const used = Math.round(this.status.used);
    if (used <= this.reported) return;
    if (!now && Date.now() - this.lastReport < REPORT_MS) return;
    // One at a time (unless the window is closing); a later tick sends what's new.
    if (this.reporting && !keepalive) return;
    this.reporting = true;
    this.lastReport = Date.now();
    try {
      const r = await post('play/use', { p_used: used }, keepalive);
      // Only what the server took counts as told; a failed send goes again next tick.
      if (r.ok) this.reported = Math.max(this.reported, used);
      else this.lastReport = 0;
    } finally {
      this.reporting = false;
    }
  }
}
