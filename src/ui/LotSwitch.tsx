import type { Game } from '../game/game';
import { Icon } from './Icon';

/**
 * Where to look, at the lot's top right: home, each dweller's work lot (by their name) and land being
 * built on, a circle each. Only there while there's somewhere other than home to go.
 */
export function LotSwitch({ game, view, onView }: { game: Game; view: 'home' | 'site' | number; onView: (v: 'home' | 'site' | number) => void }) {
  const works = [...game.workGames.keys()];
  if (!works.length && !game.siteGame) return null;
  return (
    <nav className="lot-switch" aria-label="장소">
      <button className={view === 'home' ? 'on' : ''} onClick={() => onView('home')} title="집">
        <span className="ls-dot">
          <Icon name="home" />
        </span>
        <span className="ls-name">집</span>
      </button>
      {works.map((id) => {
        const st = game.workStatus(id);
        const name = game.dweller(id)?.name ?? '';
        const left = st ? Math.max(0, Math.ceil((st.end - game.state.time) / 60)) : 0;
        return (
          <button key={id} className={`${view === id ? 'on' : ''} ${st?.alarm ? 'alarm' : ''}`} onClick={() => onView(id)} title={`${name} · ${st?.def.name ?? ''} (퇴근까지 ${left}시간)`}>
            <span className="ls-dot">{st?.def.icon}</span>
            <span className="ls-name">{name}</span>
          </button>
        );
      })}
      {game.siteGame && (
        <button className={view === 'site' ? 'on' : ''} onClick={() => onView('site')} title="새 땅 (짓는 중)">
          <span className="ls-dot">
            <Icon name="site" />
          </span>
          <span className="ls-name">새 땅</span>
        </button>
      )}
    </nav>
  );
}
