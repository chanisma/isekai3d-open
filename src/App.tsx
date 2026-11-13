import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { formatClock } from './game/util';
import { CommuteScene, prepareCommute } from './ui/CommuteScene';
import { Game } from './game/game';
import { hasSave, lastSlot, loadGame, saveGame, setLastSlot, type Slot } from './game/save';
import { SaveSlots } from './ui/SaveSlots';
import { SaveCloud, saveCloud, useSaveCloud } from './cloud/saveCloud';
import type { DwellerSpec } from './game/types';
import { rotateDir } from './game/world';
import { BuyCatalog } from './ui/BuyCatalog';
import { GameView, type Placing } from './ui/GameView';
import { CareerEventModal } from './ui/CareerEventModal';
import { FollowModal } from './ui/FollowModal';
import { EpisodeModal } from './ui/EpisodeModal';
import { WorkResultModal } from './ui/WorkResultModal';
import { LotSwitch } from './ui/LotSwitch';
import { PackNotice } from './ui/PackNotice';
import { JobModal } from './ui/JobModal';
import { PANEL_TABS, DwellerPanel, tabsFor, type PanelTab } from './ui/DwellerPanel';
import { StartScreen } from './ui/StartScreen';
import { TopBar } from './ui/TopBar';
import { useGame } from './ui/useGame';
import { WorkplaceTour } from './ui/WorkplaceTour';
import { MotionLab } from './ui/MotionLab';
import { AssetGallery } from './ui/AssetGallery';
import { Wardrobe } from './ui/Wardrobe';
import { Guide } from './ui/Guide';
import { NeighbourCall } from './ui/NeighbourCall';
import { Isekai3dCloud } from './cloud/isekai3dCloud';
import { PlayPass } from './cloud/playPass';
import { Arcade } from './ui/Arcade';
import { usePass } from './ui/PlayTime';
import { useStockSettle } from './ui/StockPhone';

export default function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [touring, setTouring] = useState(false);
  const [lab, setLab] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [wardrobe, setWardrobe] = useState(false);
  // The arcade first (a coin = a day's play, cloud/playPass.ts); 'leaving' while it fades over the title.
  const [pass, setPass] = useState<PlayPass | null>(null);
  const [arcade, setArcade] = useState<'on' | 'leaving' | 'off'>('on');
  useEffect(() => {
    let live = true;
    void PlayPass.open().then((p) => live && setPass(p));
    return () => {
      live = false;
    };
  }, []);
  // Back at the title with today's play used up (at any speed): the arcade for a coin, not straight
  // back into a game that can't run (2026-10-25). The game's own count went into the pass as it closed.
  useEffect(() => {
    if (!game && pass && !pass.problem && pass.left <= 0 && arcade === 'off') setArcade('on');
  }, [game, pass, arcade]);
  // The save slots on the student's account too, in 스페이스기전 학생 (never waited on).
  const cloud = useSaveCloud();
  useEffect(() => {
    void SaveCloud.connect();
  }, []);

  const arcadeLayer = arcade !== 'off' && (
    <Arcade
      pass={pass}
      leaving={arcade === 'leaving'}
      onEnter={() => {
        setArcade('leaving');
        window.setTimeout(() => setArcade('off'), 700);
      }}
    />
  );
  if (arcade === 'on') return arcadeLayer;
  return (
    <>
      {screen()}
      {arcadeLayer}
    </>
  );

  function screen() {
    if (touring) return <WorkplaceTour onClose={() => setTouring(false)} />;
    if (lab) return <MotionLab onClose={() => setLab(false)} />;
    if (gallery) return <AssetGallery onClose={() => setGallery(false)} />;
    if (wardrobe) return <Wardrobe onClose={() => setWardrobe(false)} />;
    if (!game) {
      return (
        <StartScreen
          onTour={() => setTouring(true)}
          onLab={() => setLab(true)}
          onGallery={() => setGallery(true)}
          onWardrobe={() => setWardrobe(true)}
          canContinue={hasSave() || !!cloud?.remote.size}
          admin={!!pass?.status.admin}
          // The slot played is where the game saves from now on (save.ts lastSlot).
          onContinue={(slot: Slot) => {
            const state = loadGame(slot);
            if (!state) return;
            setLastSlot(slot);
            setGame(new Game(state));
          }}
          onNew={(specs: DwellerSpec[], lifespan, guide, slot: Slot) => {
            // A new story starts in a studio flat of their own (lots.ts STUDIO).
            const g = Game.create(specs, undefined, lifespan, 'studio');
            g.state.tips = { on: guide, done: [] };
            setLastSlot(slot);
            saveGame(g.state, slot, { urgent: true });
            setGame(g);
          }}
        />
      );
    }
    return (
      <Playing
        game={game}
        pass={pass!}
        // Back to the title, the story kept in its slot (a new story picks a slot of its own).
        onQuit={() => {
          saveGame(game.state, undefined, { urgent: true });
          setGame(null);
        }}
      />
    );
  }
}

function Playing({ game, pass, onQuit }: { game: Game; pass: PlayPass; onQuit: () => void }) {
  useGame(game);
  usePass(pass);
  // The stock app's orders waiting for a real close get it every few minutes (ui/StockPhone.tsx).
  useStockSettle(game);
  // The save slots, opened from the top bar's 저장.
  const [saving, setSaving] = useState(false);
  // Today's play used up: the arcade over the game for a coin, then back into the game as it was.
  const [coin, setCoin] = useState<'off' | 'on' | 'leaving'>('off');
  // Today's coins count this game's play; when they're used up, time stops (Game.playLeft).
  useEffect(() => {
    pass.attach(game);
    return () => pass.detach();
  }, [pass, game]);
  // In 스페이스기전 학생, the way to the AI questions and the player's knowledge kept there (none elsewhere).
  const [cloud, setCloud] = useState<Isekai3dCloud | null>(null);
  useEffect(() => {
    let live = true;
    void Isekai3dCloud.connect(game).then((c) => {
      if (!live) return;
      game.cloud = c;
      setCloud(c);
    });
    return () => {
      live = false;
      game.cloud = null;
    };
  }, [game]);
  const [mode, setMode] = useState<'live' | 'buy'>('live');
  // Following dwellers to work, or building on land bought: which lot is on screen (a work lot by its worker's id).
  const [view, setView] = useState<'home' | 'site' | number>('home');
  const site = game.siteGame;
  const workIds = [...game.workGames.keys()];
  const workKey = workIds.join(',');
  const shown = typeof view === 'number' ? game.workGames.get(view) ?? game : view === 'site' && site ? site : game;
  // The dweller panel's open tab (참고 게임 dweller info panel), kept while switching dwellers.
  const [tab, setTab] = useState<PanelTab>('needs');
  const seenWork = useRef<number[]>([]);
  // On the way to another lot: a small window over the lot just left, frozen and with time stopped, while the next gets ready unseen.
  const [moving, setMoving] = useState<{ to: 'home' | 'site' | number; who: number; place: string; icon: string; doing: string; seconds: number; speed: number } | null>(null);
  const arrive = (to: 'home' | 'site' | number, speed: number) => {
    // Time runs on arrival, unless something's waiting for an answer or building is what's going on.
    // The window goes first: while it's up, time is held stopped every frame.
    // Together with the view: a frame of the old lot between them and everything just loaded is thrown away.
    flushSync(() => {
      setMoving(null);
      setView(to);
    });
    game.state.speed = game.modalOpen() || game.state.pausedForBuy !== undefined ? 0 : speed || 1;
    setPlacing(null);
    if (typeof to === 'number') {
      switchMode('live');
      setTab('work');
    } else {
      setTab((t) => (t === 'work' ? 'needs' : t));
      // Building on the land is buy mode: time stops; home again, it runs as before.
      if (to === 'site') game.enterBuyMode();
      else if (mode !== 'buy') game.leaveBuyMode();
    }
  };
  const goTo = (to: 'home' | 'site' | number, doing: string, seconds: number) => {
    const st = typeof to === 'number' ? game.workStatus(to) : undefined;
    const who = typeof to === 'number' ? to : game.state.activeDwellerId;
    const speed = game.state.speed;
    if (!game.dweller(who)) return arrive(to, speed);
    const place = to === 'home' ? '집' : to === 'site' ? '새 땅' : st?.def.name ?? '직장';
    const icon = to === 'home' ? '🏠' : to === 'site' ? '🏗️' : st?.def.icon ?? '🏢';
    setMoving({ to, who, place, icon, doing, seconds, speed });
  };
  // Got ready while nothing's going on, so the first trip needn't stop for it.
  useEffect(() => {
    const id = window.setTimeout(() => prepareCommute(game.household().filter((s) => s.age !== 'baby')), 2500);
    return () => window.clearTimeout(id);
  }, [game]);
  useEffect(() => {
    const ids = workKey ? workKey.split(',').map(Number) : [];
    const fresh = ids.filter((id) => !seenWork.current.includes(id));
    seenWork.current = ids;
    // Off to work with the dweller in hand: go along, the work tab first; back home when that shift ends.
    if (fresh.includes(game.state.activeDwellerId)) {
      goTo(game.state.activeDwellerId, '출근 중', 3);
    } else if (typeof view === 'number' && !ids.includes(view)) {
      setView('home');
      setTab((t) => (t === 'work' ? 'needs' : t));
    }
  }, [workKey, view, game]);
  const [placing, setPlacing] = useState<Placing | null>(null);
  // Land sold or moved into: back home (where time runs again unless in buy mode).
  useEffect(() => {
    if (!site && view === 'site') {
      setView('home');
      if (mode !== 'buy') game.leaveBuyMode();
    }
  }, [site, view, mode, game]);

  const switchMode = useCallback(
    (m: 'live' | 'buy') => {
      // Time stops in buy mode (참고 게임) and runs again on leaving it.
      if (m === 'live') game.leaveBuyMode();
      else game.enterBuyMode();
      setMode(m);
      setPlacing(null);
    },
    [game],
  );

  // Dev builds expose the game for poking at from the console (e.g. __game.state.time = 1320).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = game;
  }, [game]);

  // Autosave every 30 s and when leaving the page.
  useEffect(() => {
    const save = () => saveGame(game.state);
    // Leaving the page: what's still to go up to the server goes now.
    const leave = () => {
      saveGame(game.state, undefined, { urgent: true });
      saveCloud()?.flushAll();
    };
    const id = window.setInterval(save, 30_000);
    window.addEventListener('beforeunload', leave);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('beforeunload', leave);
    };
  }, [game]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') {
        e.preventDefault();
        game.setSpeed(game.state.speed === 0 ? 1 : 0);
      } else if (e.key === '1' || e.key === '2' || e.key === '3') {
        game.setSpeed(Number(e.key));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const dwellers = game.household().filter((s) => s.age !== 'baby');
        const i = dwellers.findIndex((s) => s.id === game.state.activeDwellerId);
        game.setActive(dwellers[(i + 1) % dwellers.length].id);
      } else if (e.key === 'b' || e.key === 'B') {
        switchMode(mode === 'buy' ? 'live' : 'buy');
      } else if ((e.key === 'r' || e.key === 'R') && placing) {
        setPlacing({ ...placing, dir: rotateDir(placing.dir) });
      } else if (e.key === 'Escape') {
        setPlacing(null);
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        // 참고 게임's panel keys: O needs, Y simology, G aspiration, J career, L skills, R relationships, I inventory.
        const t = PANEL_TABS.find((x) => x.key === e.key.toLowerCase());
        if (t && tabsFor(shown.activeDweller, shown !== game).includes(t.id)) setTab(t.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, shown, mode, placing, switchMode]);

  return (
    <div className="app">
      <TopBar
        game={game}
        mode={mode}
        onMode={switchMode}
        onSave={() => setSaving(true)}
        onCoin={() => setCoin('on')}
        onQuit={onQuit}
        cloud={cloud}
      />
      <div className={`layout ${mode === 'buy' || shown === site ? 'with-catalog' : ''}`}>
        {/* On the land being built on no one lives yet: the household's panel stays. */}
        {/* Nobody left (the whole family gone, the last visitor away): no panel to show. */}
        {(shown === site ? game : shown).activeDweller && <DwellerPanel game={shown === site ? game : shown} root={shown === game || shown === site ? undefined : game} tab={tab} onTab={setTab} />}
        <GameView game={shown} preparing={moving ? (typeof moving.to === 'number' ? game.workGames.get(moving.to) ?? game : moving.to === 'site' && site ? site : game) : undefined} driver={shown === game ? undefined : game} mode={shown === game ? mode : shown === site ? 'buy' : 'live'} placing={placing} setPlacing={setPlacing}>
          <PackNotice />
          <LotSwitch
            game={game}
            view={view}
            onView={(v) => {
              if (v !== view && !moving) goTo(v, '이동 중', 1.5);
            }}
          />
        </GameView>
        {(mode === 'buy' || shown === site) && <BuyCatalog game={shown === site ? site! : game} placing={placing} setPlacing={setPlacing} />}
      </div>
      {shown === game && <Guide game={game} tab={tab} mode={mode} />}
      {shown === game && <NeighbourCall game={game} />}
      {game.jobOffer && <JobModal game={game} dwellerId={game.jobOffer.dwellerId} />}
      {game.state.careerEvent && <CareerEventModal key={`${game.state.careerEvent.eventId}:${game.state.careerEvent.at}`} game={game} />}
      {!game.state.careerEvent && game.state.followAsks?.length && <FollowModal game={game} />}
      {!game.state.careerEvent && !game.state.followAsks?.length && !game.state.workResult && game.state.episode && <EpisodeModal key={game.state.episode.sceneId} game={game} />}
      {!game.state.careerEvent && game.state.workResult && <WorkResultModal game={game} />}
      {coin !== 'off' && (
        <Arcade
          pass={pass}
          leaving={coin === 'leaving'}
          onBack={() => setCoin('off')}
          onEnter={() => {
            pass.sync();
            setCoin('leaving');
            window.setTimeout(() => setCoin('off'), 700);
          }}
        />
      )}
      {saving && (
        <SaveSlots
          mode="save"
          current={lastSlot()}
          onClose={() => setSaving(false)}
          onPick={(slot) => {
            setSaving(false);
            setLastSlot(slot);
            if (saveGame(game.state, slot, { urgent: true })) game.notify(`${slot}번 칸에 기록했어요`, 'good');
            else game.notify('저장에 실패했어요', 'bad');
            game.emit();
          }}
        />
      )}
      {moving && game.dweller(moving.who) && (
        <CommuteScene
          dweller={game.dweller(moving.who)!}
          place={moving.place}
          icon={moving.icon}
          doing={moving.doing}
          seconds={moving.seconds}
          home={typeof moving.to !== 'number'}
          clock={formatClock(game.state.time % 1440)}
          onDone={() => arrive(moving.to, moving.speed)}
        />
      )}
    </div>
  );
}
