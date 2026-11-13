import { useEffect, useState } from 'react';
import { PlayMeter } from './PlayTime';
import { LIFE_EVENT_LABEL, type LifeEvent } from '../game/aiQuestions';
import type { Game } from '../game/game';
import type { Isekai3dCloud } from '../cloud/isekai3dCloud';
import { DevQuestions } from './DevQuestions';
import { ThoughtDialog } from './ThoughtDialog';
import titleLogo from '../assets/title/title-logo.webp';
import { clockInfo, formatClock } from '../game/util';
import { TinyFace, selectable } from './Toasts';
import { Icon } from './Icon';
import { ConfirmDialog } from './ConfirmDialog';
import { lastSlot } from '../game/save';

interface Props {
  game: Game;
  mode: 'live' | 'buy';
  onMode: (m: 'live' | 'buy') => void;
  onSave: () => void;
  onQuit: () => void;
  /** Today's play used up: to the arcade for a coin (the game stays as it is). */
  onCoin?: () => void;
  /** The way to 스페이스기전, when the game runs in 스페이스기전 학생 (src/cloud/isekai3dCloud.ts). */
  cloud?: Isekai3dCloud | null;
}

/** Whether the AI questions can come, and the switch for 스페이스기전 keeping what's known of the player. */
function CloudLine({ cloud }: { cloud: Isekai3dCloud }) {
  const [, redraw] = useState(0);
  const [asking, setAsking] = useState(false);
  const s = cloud.status;
  return (
    <div className="log-item info">
      {s.note ?? (s.deliveredToday ? '✨ 오늘의 AI 질문을 받았어요. 내일 또 올 수 있어요' : '✨ 하루에 한 번까지, 내 선택을 보고 만든 AI 질문이 올 수 있어요')}
      {s.signedIn && (
        <label className="cloud-memory">
          <input
            type="checkbox"
            checked={s.memory}
            disabled={asking}
            onChange={async (e) => {
              const on = e.target.checked;
              if (!on && !window.confirm('스페이스기전에 쌓인 나의 선택 기록을 지울까요? 이 게임 안의 기록은 남아요.')) return;
              setAsking(true);
              await cloud.setMemory(on);
              setAsking(false);
              redraw((n) => n + 1);
            }}
          />{' '}
          스페이스기전에 나의 선택 기억하기 <span className="muted">(나와 담임·학년부장 선생님이 볼 수 있어요)</span>
        </label>
      )}
    </div>
  );
}

/** Pause and the three speeds as round icon buttons, like 참고 게임's time controls. */
const SPEED_ICONS = [
  <svg key="0" viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.4" height="12" rx="1" /><rect x="11.6" y="4" width="3.4" height="12" rx="1" /></svg>,
  <svg key="1" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4.5v11l8.5-5.5z" /></svg>,
  <svg key="2" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5v10l7-5zM10 5v10l7-5z" /></svg>,
  <svg key="3" viewBox="0 0 20 20" aria-hidden="true"><path d="M1 5.5v9l5.5-4.5zM7 5.5v9l5.5-4.5zM13 5.5v9l5.5-4.5z" /></svg>,
];
const SPEED_NAMES = ['일시 정지', '보통', '빠르게', '아주 빠르게'];

/** Light (after 참고 게임) or the earlier dark look; remembered in this browser only. */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  return (
    <button
      className="ghost"
      title={dark ? '밝은 화면으로' : '어두운 화면으로'}
      onClick={() => {
        const next = !dark;
        setDark(next);
        if (next) document.documentElement.dataset.theme = 'dark';
        else delete document.documentElement.dataset.theme;
        try {
          localStorage.setItem('isekai3d.theme', next ? 'dark' : 'light');
        } catch {
          // Storage may be off (private window); the theme just won't be remembered.
        }
      }}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}

export function TopBar({ game, mode, onMode, onSave, onQuit, cloud, onCoin }: Props) {
  const { day, weekdayLabel, minuteOfDay } = clockInfo(game.state.time);
  // The 처음 화면 button's question, in the game's own window (not the browser's confirm).
  const [leaving, setLeaving] = useState(false);
  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand-logo" src={titleLogo} alt="고등학생이었던 내가 이세계에서는 사회인?" />
      </div>
      <div className="clock">
        <span className="day">
          {day + 1}일차 ({weekdayLabel})
        </span>
        <span className="time">{formatClock(minuteOfDay)}</span>
      </div>
      <div className="speeds" role="group" aria-label="게임 속도">
        {SPEED_ICONS.map((icon, i) => (
          <button key={i} className={game.state.speed === i ? 'on' : ''} onClick={() => game.setSpeed(i)} title={i === 0 ? '일시 정지 (Space)' : `${SPEED_NAMES[i]} (${i})`} aria-label={SPEED_NAMES[i]}>
            {icon}
          </button>
        ))}
        {/* A badge, not a box of its own, so nothing moves when it comes and goes. */}
        {game.isUltra() && <span className="ultra">초고속</span>}
      </div>
      <PlayMeter game={game} onCoin={onCoin} />
      <div className="money">§ {Math.floor(game.state.money).toLocaleString()}</div>
      <div className="modes" role="group" aria-label="모드">
        <button className={mode === 'live' ? 'on' : ''} onClick={() => onMode('live')} title="라이브">
          <Icon name="live" /> <span className="tb-label">라이브</span>
        </button>
        <button className={mode === 'buy' ? 'on' : ''} onClick={() => onMode('buy')} title="구매 (B)">
          <Icon name="shop" /> <span className="tb-label">구매</span>
        </button>
      </div>
      <label className="freewill" title="캐릭터가 스스로 할 일을 고르기">
        <input type="checkbox" checked={game.state.freeWill} onChange={() => game.toggleFreeWill()} />
        <span className="tb-label">자율 행동</span>
      </label>
      <div className="spacer" />
      {game.economy.bill && (
        <button
          className={`bill ${game.economy.bill.warned ? 'late' : ''}`}
          onClick={() => game.payBill()}
          title={game.economy.bill.cut.length ? '납부하면 전기·물이 다시 들어와요' : '이틀 안에 내지 않으면 전기가 끊겨요'}
        >
          <Icon name="bill" /> 공과금 §{game.economy.bill.amount} 납부
          {game.economy.bill.cut.includes('power') && (
            <>
              {' · '}
              <Icon name="noPower" /> 단전
            </>
          )}
          {game.economy.bill.cut.includes('water') && (
            <>
              {' · '}
              <Icon name="noWater" /> 단수
            </>
          )}
        </button>
      )}
      <button className={`ghost ${game.state.tips?.on ? 'on' : ''}`} onClick={() => game.setGuide(!game.state.tips?.on)} title="화면 곳곳을 차례로 알려 주는 안내 켜기·끄기">
        <Icon name="guide" /> <span className="tb-label">안내</span>
      </button>
      {cloud?.status.dev && <DevMenu game={game} cloud={cloud} />}
      <Thoughts game={game} />
      <PlayerKnowledgeView game={game} cloud={cloud ?? null} />
      <ThemeToggle />
      <NotificationLog game={game} />
      <button className="ghost" onClick={onSave} title="저장">
        <Icon name="save" /> <span className="tb-label">저장</span>
      </button>
      <button className="ghost" title="저장하고 처음 화면으로 (다른 이야기는 그대로)" onClick={() => setLeaving(true)}>
        <Icon name="home" /> <span className="tb-label">처음 화면</span>
      </button>
      {leaving && (
        <ConfirmDialog
          icon="home"
          title="처음 화면으로 갈까요?"
          ok="저장하고 처음 화면으로"
          onCancel={() => setLeaving(false)}
          onOk={() => {
            setLeaving(false);
            onQuit();
          }}
        >
          <p>
            지금 이야기는 <b>{lastSlot()}번 칸</b>에 저장돼요. 처음 화면의 CONTINUE에서 이어서 할 수 있고, 다른 칸의 이야기는 그대로 남아요.
          </p>
        </ConfirmDialog>
      )}
    </header>
  );
}

/**
 * A bell that opens the recent notifications, newest first, with the game day and time: 참고 게임's
 * notification wall, with each dweller's face and a filter by dweller.
 */
function NotificationLog({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [who, setWho] = useState<number | null>(null);
  const unread = game.log.filter((t) => t.id > seen).length;
  const urgent = game.log.some((t) => t.id > seen && t.look === 'urgent');
  const people = game.household().filter((s) => s.age !== 'baby' && game.log.some((t) => t.dwellerId === s.id));
  return (
    <div className="log-wrap">
      <button
        className="ghost"
        onClick={() => {
          setOpen(!open);
          setSeen(game.log.at(-1)?.id ?? 0);
        }}
        title="알림 기록"
      >
        <Icon name="bell" /> <span className="tb-label">알림</span>
        {unread > 0 && !open ? <span className={`log-badge ${urgent ? 'urgent' : ''}`}>{unread}</span> : null}
      </button>
      {open && (
        <div className="log-panel">
          {game.log.length === 0 && <div className="muted">아직 알림이 없어요</div>}
          {people.length > 1 && (
            <div className="log-filter">
              <button className={who === null ? 'on' : ''} onClick={() => setWho(null)}>
                모두
              </button>
              {people.map((p) => (
                <button key={p.id} className={who === p.id ? 'on' : ''} onClick={() => setWho(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {[...game.log].reverse().filter((t) => who === null || t.dwellerId === who).map((t) => {
            const c = t.time !== undefined ? clockInfo(t.time) : null;
            const pick = selectable(game, t);
            return (
              <div key={t.id} className={`log-item ${t.kind} ${t.look ?? ''} ${pick ? 'pick' : ''}`} onClick={pick ? () => game.setActive(t.dwellerId!) : undefined}>
                <TinyFace game={game} dwellerId={t.dwellerId} />
                {c && (
                  <small className="muted">
                    {c.day + 1}일차 {formatClock(c.minuteOfDay)}
                  </small>
                )}
                <span>{t.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * What the game has come to know about the player from their answers at work (knowledge.ts): the
 * insights, how they tend to answer, and the latest answers.
 */
/**
 * 🛠 Testing the AI questions (a 스페이스기전 admin only — the server says who, students never see it):
 * ask for each kind now, and clear my question records so the one-a-day limit starts over.
 */
function DevMenu({ game, cloud }: { game: Game; cloud: Isekai3dCloud }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [, redraw] = useState(0);
  useEffect(() => cloud.onChange(() => redraw((n) => n + 1)), [cloud]);
  const dweller = game.activeDweller;
  const id = dweller?.id ?? -1;
  return (
    <div className="log-wrap">
      <button className="ghost" onClick={() => setOpen(!open)} title="AI 질문 시험 (관리자만 보여요)">
        <Icon name="dev" />
      </button>
      {open && (
        <div className="log-panel dev-menu">
          <div className="muted">AI 질문 시험 · {dweller ? `${dweller.name}(으)로` : '캐릭터를 골라 주세요'} · 오늘 {cloud.status.deliveredToday ? '받음' : '아직'}</div>
          <div className="dev-row">
            <button onClick={() => game.devCareerCard(id)}><Icon name="devCard" /> 근무 카드 지금</button>
            <button onClick={() => game.devThought(id, 'explore')}><Icon name="compass" /> 진로 질문</button>
          </div>
          <div className="dev-row">
            {(Object.keys(LIFE_EVENT_LABEL) as LifeEvent[]).map((e) => (
              <button key={e} onClick={() => game.devThought(id, 'life', e)}>
                <Icon name="thought" /> {LIFE_EVENT_LABEL[e]}
              </button>
            ))}
          </div>
          <div className="dev-row">
            <button onClick={() => setAll(true)}><Icon name="devList" /> 만든 질문 모두 보기</button>
          </div>
          <div className="muted small">관리자는 한도 없이 누를 때마다 새로 만들어요.</div>
          {cloud.trace && <div className="log-item info">{cloud.trace}</div>}
        </div>
      )}
      {all && <DevQuestions cloud={cloud} onClose={() => setAll(false)} />}
    </div>
  );
}

/** Questions to think about from the 스페이스기전 AI waiting for the player (ThoughtDialog). */
function Thoughts({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const n = game.state.thoughts?.length ?? 0;
  if (!n && !open) return null;
  return (
    <>
      <button className="ghost on" onClick={() => setOpen(true)} title="스페이스기전 AI가 건넨, 정답 없는 생각 질문">
        <Icon name="thought" /> {n}
      </button>
      {open && <ThoughtDialog game={game} onClose={() => setOpen(false)} />}
    </>
  );
}

function PlayerKnowledgeView({ game, cloud }: { game: Game; cloud: Isekai3dCloud | null }) {
  const [open, setOpen] = useState(false);
  const k = game.state.player;
  if (!k?.episodes.length && !cloud) return null;
  const t = k?.tally ?? {};
  return (
    <div className="log-wrap">
      <button className="ghost" onClick={() => setOpen(!open)} title="질문에 답한 선택으로 쌓인, 플레이어에 대한 지식">
        <Icon name="brain" /> <span className="tb-label">나의 선택</span>
      </button>
      {open && (
        <div className="log-panel">
          <div className="muted">근무 중 질문에 직접 답한 {t.card ?? 0}번의 선택에서 알게 된 것 (캐릭터가 스스로 답한 것은 빼요)</div>
          {cloud && <CloudLine cloud={cloud} />}
          {!k?.episodes.length && <div className="muted">아직 답한 질문이 없어요</div>}
          {k && k.insights
            .filter((i) => i.dwellerId === undefined)
            .map((i) => (
              <div key={i.id} className="log-item good">
                💡 {i.txt}
              </div>
            ))}
          {k && [...new Set(k.insights.filter((i) => i.dwellerId !== undefined && (!i.game || i.game === game.state.key)).map((i) => i.dwellerId!))].map((id) => (
            <div key={id}>
              <div className="muted">{game.dweller(id)?.name ?? '예전 가족'}의 일에서:</div>
              {k.insights
                .filter((i) => i.dwellerId === id && (!i.game || i.game === game.state.key))
                .map((i) => (
                  <div key={i.id} className="log-item good">
                    💡 {i.txt}
                  </div>
                ))}
            </div>
          ))}
          <div className="muted">
            도전 {t['card.risky'] ?? 0} · 안전 {t['card.safe'] ?? 0} · 잘 풀림 {t['card.won'] ?? 0} / 안 풀림 {t['card.lost'] ?? 0}
            {(t['honest.yes'] ?? 0) + (t['honest.no'] ?? 0) > 0 && ` · 정직의 갈림길 ${(t['honest.yes'] ?? 0) + (t['honest.no'] ?? 0)}번 중 정직 ${t['honest.yes'] ?? 0}`}
          </div>
          {[...(k?.episodes ?? [])]
            .reverse()
            .slice(0, 8)
            .map((e) => (
              <div key={e.id} className="log-item info" title={`중요도 ${e.imp}`}>
                {e.txt}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
