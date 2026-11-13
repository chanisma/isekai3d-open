import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { getDef } from '../game/catalog';
import { BUILD_COST, type BuildTool, type Game, type MenuOption } from '../game/game';
import { placementOrigin, roomUnder, dwellerDrawPos, type RenderUi } from '../game/render';
import { LotView, setBodyStyle, type BodyStyle, type PickHit, type WallMode } from '../view3d/lot3d';
import type { Dir, P } from '../game/types';
import { josa } from '../game/util';
import { edgeKey, edgeTiles, lineDistance, nearestSide, type Side } from '../game/walls';
import { MAP_H, MAP_W, idx, objectAt, rotateDir } from '../game/world';
import { ActionQueue } from './ActionQueue';
import { ScreenSlam, Toasts } from './Toasts';
import { Icon, type IconName } from './Icon';

const DwellerStyler = lazy(() => import('./DwellerStyler'));

export interface Placing {
  defId: string;
  dir: Dir;
  movingUid?: number;
  /** Repainting rooms instead of placing furniture. */
  paint?: { part: 'wall' | 'floor'; style: string };
  /** Building walls, doors and floors tile by tile. */
  build?: BuildTool;
  /** Setting down something from storage (its uid there). */
  stored?: number;
}

interface Menu {
  left: number;
  top: number;
  title: string;
  options: MenuOption[];
  onPick: (id: string) => void;
  /** The category opened in a grouped menu. */
  group?: string;
  /** Where it was clicked, for the ring of bubbles. */
  at: { x: number; y: number };
}

/** Up to this many rows open as 참고 게임's ring of bubbles; more fall back to a list. */
const RING_MAX = 8;
/**
 * A category opened has room for more round the ring, so one more line or two (a colleague's
 * «고민 들어 주기», «기쁜 소식 듣기») doesn't turn the same menu into a list (2026-11-01).
 */
const RING_MAX_GROUP = 12;
const ringFits = (menu: Menu) => menuRows(menu).length <= (menu.group ? RING_MAX_GROUP : RING_MAX);

/** Longer menus open as categories first, like 참고 게임's pie menu. */
const GROUP_AFTER = 10;

/** What a menu shows right now: the options themselves, or (for a long menu) its categories. */
function menuRows(menu: Menu): Array<{ kind: 'option'; o: MenuOption } | { kind: 'group'; name: string; count: number } | { kind: 'back' }> {
  const grouped = menu.options.length > GROUP_AFTER && menu.options.some((o) => o.group);
  if (!grouped) return menu.options.map((o) => ({ kind: 'option' as const, o }));
  if (menu.group) return [{ kind: 'back' as const }, ...menu.options.filter((o) => o.group === menu.group).map((o) => ({ kind: 'option' as const, o }))];
  const names = [...new Set(menu.options.flatMap((o) => (o.group ? [o.group] : [])))];
  return [
    ...menu.options.filter((o) => !o.group).map((o) => ({ kind: 'option' as const, o })),
    ...names.map((name) => ({ kind: 'group' as const, name, count: menu.options.filter((o) => o.group === name).length })),
  ];
}

/**
 * 참고 게임's pie menu: the name of what was clicked in the middle and the options as bubbles fanned out
 * in two arcs, right and left of it (a category opens its own, with "뒤로" first). Kept inside the
 * lot; a greyed option tells why on hover.
 */
function PieRing({ menu, wrap, onGroup, onPick }: { menu: Menu; wrap: HTMLDivElement | null; onGroup: (g: string | undefined) => void; onPick: (id: string) => void }) {
  const rows = menuRows(menu);
  const right = Math.ceil(rows.length / 2);
  const STEP = 42;
  const half = ((right - 1) * STEP) / 2;
  const w = wrap?.clientWidth ?? 800;
  const h = wrap?.clientHeight ?? 600;
  const x = Math.max(230, Math.min(w - 230, menu.at.x));
  const y = Math.max(half + 34, Math.min(h - half - 34, menu.at.y));
  return (
    <div className="pie-radial" style={{ left: x, top: y }} key={menu.group ?? ''}>
      <div className="pie-center">{menu.group ? `${menu.title} · ${menu.group.split(' ').slice(1).join(' ')}` : menu.title}</div>
      {rows.map((row, i) => {
        // Alternate right and left, top to bottom, each column bowed out like an arc.
        const side = i % 2 === 0 ? 'r' : 'l';
        const k = Math.floor(i / 2);
        const count = side === 'r' ? right : rows.length - right;
        const dy = (k - (count - 1) / 2) * STEP;
        const bow = half ? 22 * (1 - (dy / (half + STEP / 2)) ** 2) : 22;
        const style = { left: side === 'r' ? 34 + bow : -34 - bow, top: dy, animationDelay: `${i * 22}ms` };
        const cls = `pie-bubble ${side}`;
        if (row.kind === 'back')
          return (
            <button key="__back" className={`${cls} group`} style={style} onClick={(e) => (e.stopPropagation(), onGroup(undefined))}>
              <span className="pie-icon">
                <Icon name="arrowLeft" />
              </span>
              <span>뒤로</span>
            </button>
          );
        if (row.kind === 'group') {
          const [icon, ...name] = row.name.split(' ');
          return (
            <button key={`__g${row.name}`} className={`${cls} group`} style={style} onClick={(e) => (e.stopPropagation(), onGroup(row.name))}>
              <span className="pie-icon">{icon}</span>
              <span>{name.join(' ')}</span>
              <small>{row.count} ▸</small>
            </button>
          );
        }
        const o = row.o;
        return (
          <button key={o.id} className={cls} style={style} disabled={!!o.disabled} title={o.disabled ?? o.note ?? o.label} onClick={() => onPick(o.id)}>
            <span className="pie-icon">{o.disabled ? '🔒' : o.icon}</span>
            <span className="pie-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  game: Game;
  /** The game whose clock runs everything (home), when the lot shown is a workplace. */
  driver?: Game;
  /** Hands over the 3D view once it's made (the motion lab points its camera). */
  onView?: (view: LotView | null) => void;
  /** The lot to build unseen, behind a still of what was on screen; everything else stays on `game`, and time stands still. */
  preparing?: Game;
  mode: 'live' | 'buy';
  placing: Placing | null;
  setPlacing: (p: Placing | null) => void;
  /** Laid over the lot (the circles switching between home and the work lots). */
  children?: ReactNode;
}

const WALL_MODES: Array<[WallMode, IconName, string]> = [
  ['up', 'build', '벽 올리기'],
  ['cut', 'wallsCut', '벽 잘라 보기'],
  ['down', 'wallsDown', '벽 내리기'],
];

/** The controls, shown from the round button at the lot's bottom left. */
const LIVE_KEYS: Array<[string, string]> = [
  ['물건 클릭', '행동 고르기'],
  ['바닥 클릭', '이동하기'],
  ['캐릭터 클릭', '교류하기'],
  ['오른쪽 버튼 끌기 · Q / E', '시점 돌리기'],
  ['R / F', '위에서 · 옆에서 보기'],
  ['WASD · 가운데 버튼 끌기', '시점 옮기기'],
  ['휠 · Z / X', '확대 · 축소'],
  ['Home', '처음 시점'],
  ['Space', '일시정지'],
  ['1 / 2 / 3', '속도'],
  ['Tab', '캐릭터 바꾸기'],
  ['B', '구매 모드'],
];
const BUY_KEYS: Array<[string, string]> = [
  ['카탈로그 → 클릭', '물건 놓기'],
  ['R', '돌리기'],
  ['우클릭 · Esc', '취소'],
  ['놓은 물건 클릭', '돌리기 · 옮기기 · 팔기'],
  ['오른쪽 버튼 끌기', '시점 돌리기'],
];

export function GameView({ game, preparing, driver, mode, placing, setPlacing, onView, children }: Props) {
  const preparingRef = useRef(preparing);
  preparingRef.current = preparing;
  const curtain = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<LotView | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<RenderUi>({ mode, hover: null, placing, level: 0 });
  // The floor shown (참고 게임's floor up/down): follows the active dweller until the player picks one.
  const [level, setLevel] = useState(0);
  const follow = useRef(true);
  const followed = useRef(game.state.activeDwellerId);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [walls, setWalls] = useState<WallMode>('cut');
  const [body, setBody] = useState<BodyStyle>('vroid');
  // Characters still on their way (a gold glow on the lot, and a line saying so).
  const [coming, setComing] = useState(0);
  const [keysOpen, setKeysOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [styling, setStyling] = useState<{ dwellerId: number; mode: 'clothes' | 'hair'; uid: number; interactionId: string } | null>(null);
  /** A camera drag: the middle button (or Shift) pans, the right button (or Alt) turns and tilts. */
  const drag = useRef<{ x: number; y: number; kind: 'pan' | 'orbit'; moved: number } | null>(null);
  /** Set when a drag moved the camera, so letting go doesn't also count as a click (or a right click's cancel). */
  const orbited = useRef(false);

  uiRef.current.mode = mode;
  uiRef.current.placing = placing;

  useEffect(() => setMenu(null), [mode]);

  // The still goes up before any frame of the next lot is drawn.
  const hiding = !!preparing;
  useLayoutEffect(() => {
    if (hiding && curtain.current) viewRef.current?.still(curtain.current);
    if (hiding) setMenu(null);
  }, [hiding]);

  // The 3D lot (src/view3d), made once for the view and kept across lots and modes.
  useEffect(() => {
    let view: LotView;
    try {
      view = new LotView(hostRef.current!);
    } catch {
      setFailed(true);
      return;
    }
    viewRef.current = view;
    // Dev builds expose the view for poking at from the console (like __game).
    if (import.meta.env.DEV) (window as unknown as { __view?: LotView }).__view = view;
    onView?.(view);
    setWalls(view.walls);
    setBody(view.body);
    view.onLoading = setComing;
    const ro = new ResizeObserver(() => view.resize());
    ro.observe(hostRef.current!);
    return () => {
      ro.disconnect();
      view.dispose();
      viewRef.current = null;
      onView?.(null);
    };
  }, []);

  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      const root = driver ?? game;
      if (!preparingRef.current) root.update((now - last) / 1000);
      else if (root.state.speed !== 0) {
        // Stopped, and shown as stopped, whatever else sets it going meanwhile; App puts it back on arrival.
        root.state.speed = 0;
        root.emit();
      }
      last = now;
      // Live mode follows the active dweller up and down the stairs (again once another dweller is picked).
      if (followed.current !== game.state.activeDwellerId) {
        followed.current = game.state.activeDwellerId;
        follow.current = true;
      }
      const active = game.dweller(game.state.activeDwellerId);
      if (uiRef.current.mode === 'live' && follow.current && active && !active.away) {
        const at = Math.floor(Math.round(active.y) / MAP_H);
        if (at !== uiRef.current.level) {
          uiRef.current.level = at;
          setLevel(at);
        }
      }
      viewRef.current?.frame(preparingRef.current ?? game, uiRef.current, dt, root.state.speed === 0);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [game, driver]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(null);
        setKeysOpen(false);
      }
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const view = viewRef.current;
      if (!view || e.ctrlKey || e.metaKey || e.altKey) return;
      // 참고 게임's camera keys: Q/E turn, R/F or Page Up/Down tilt, WASD or the arrows move, Z/X zoom, Home back to the start.
      const k = e.key.toLowerCase();
      if (k === 'q' || k === 'e') view.rotate(k === 'q' ? -1 : 1);
      else if (k === 'z' || k === 'x') view.zoomBy(k === 'z' ? 1 / 1.25 : 1.25);
      else if ((k === 'r' && !uiRef.current.placing) || k === 'pageup') view.tilt(0.12);
      else if (k === 'f' || k === 'pagedown') view.tilt(-0.12);
      else if (k === 'home') view.home();
      else {
        const step = ({ w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] } as Record<string, [number, number]>)[k];
        if (!step) return;
        e.preventDefault();
        view.pan(-step[0], -step[1], false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The controls card closes on a click anywhere else.
  useEffect(() => {
    if (!keysOpen) return;
    const away = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest('.keys-help')) setKeysOpen(false);
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [keysOpen]);

  const pickAt = (e: React.MouseEvent) => viewRef.current?.pick(e.clientX, e.clientY, uiRef.current.level ?? 0) ?? null;
  const toWorld = (e: React.MouseEvent): { f: P; t: P } => {
    const hit = pickAt(e);
    return hit ? { f: hit.f, t: hit.t } : { f: { x: -1, y: -1 }, t: { x: -1, y: -1 } };
  };

  /** The corner of the grid nearest a point (where the wall tool's lines start and end). */
  const corner = (f: P): P => ({ x: Math.round(f.x), y: Math.round(f.y) });
  /**
   * The edge a wall, door, window or remove tool points at: the wall under the pointer (not the
   * floor seen past it), else the line nearest the pointer on the floor; for taking down, only a
   * line with something on it, close to the pointer. Null if none.
   */
  const targetEdge = (hit: PickHit | null, tool: BuildTool | undefined): string | null => {
    if (!hit || !tool || !['wall', 'door', 'window', 'remove'].includes(tool)) return null;
    if (hit.edge && tool !== 'wall') return hit.edge;
    const k = edgeKey(hit.t.x, hit.t.y, nearestSide(hit.f.x, hit.f.y));
    if (!k) return null;
    if (tool === 'remove') return lineDistance(hit.f.x, hit.f.y) < 0.3 && game.walls[k] ? k : null;
    return k;
  };
  /** An edge's tile and side, as the build calls take it. */
  const edgeAt = (key: string): [number, number, Side] => {
    const [, b] = edgeTiles(key);
    return [b.x, b.y, key.endsWith('n') ? 'n' : 'w'];
  };
  /** A drag of the remove tool along a wall has just taken it down: the click that ends it does nothing more. */
  const dragDone = useRef(false);

  /** Keeps the menu inside the stage, moving it up when it grows (a category opened). */
  const fitMenu = (m: Menu): Menu => {
    const h = wrapRef.current!.getBoundingClientRect().height;
    return { ...m, top: Math.max(4, Math.min(m.top, h - (menuRows(m).length * 38 + 44))) };
  };
  const pieRef = useRef<HTMLDivElement>(null);
  // Then by its real size once drawn: long hints can make rows taller than the estimate.
  useLayoutEffect(() => {
    const pie = pieRef.current;
    const wrap = wrapRef.current;
    if (!menu || !pie || !wrap) return;
    const w = wrap.getBoundingClientRect();
    const top = Math.max(4, Math.min(menu.top, w.height - pie.offsetHeight - 4));
    const left = Math.max(4, Math.min(menu.left, w.width - pie.offsetWidth - 4));
    if (top !== menu.top || left !== menu.left) setMenu({ ...menu, top, left });
  }, [menu]);

  const openMenu = (e: React.MouseEvent, title: string, options: MenuOption[], onPick: (id: string) => void) => {
    const r = wrapRef.current!.getBoundingClientRect();
    const left = Math.min(e.clientX - r.left, r.width - 210);
    setMenu(fitMenu({ left: Math.max(4, left), top: e.clientY - r.top, title, options, onPick, at: { x: e.clientX - r.left, y: e.clientY - r.top } }));
  };

  const onClick = (e: React.MouseEvent) => {
    if (orbited.current) {
      orbited.current = false;
      return;
    }
    if (menu) {
      setMenu(null);
      return;
    }
    const hit = pickAt(e);
    if (!hit) return;
    const { f, t } = hit;
    const level = uiRef.current.level ?? 0;
    const onLot = t.x >= 0 && t.x < MAP_W && t.y >= level * MAP_H && t.y < (level + 1) * MAP_H;
    if (mode === 'buy') return onLot || hit.uid !== undefined || hit.edge ? onBuyClick(e, t, hit) : undefined;

    const active = game.activeDweller;
    const clickedDweller = game.state.dwellers.find((s) => {
      if (s.away || s.age === 'baby') return false;
      if (hit.dwellerId !== undefined) return s.id === hit.dwellerId;
      const p = dwellerDrawPos(game, s);
      return Math.hypot(p.x - f.x, p.y - f.y) < 0.45;
    });
    if (clickedDweller && clickedDweller.id !== active.id) {
      const options: MenuOption[] = clickedDweller.npc ? [] : [{ id: '__select', label: `${clickedDweller.name} 조종하기`, icon: '👆' }];
      if (!active.away) options.push(...game.socialMenu(active, clickedDweller));
      openMenu(e, clickedDweller.name, options, (id) => {
        if (id === '__select') game.setActive(clickedDweller.id);
        else if (id === '__join') game.askToJoin(active.id, clickedDweller.id);
        else if (id === '__plead') game.pleadForLife(active.id);
        else if (id === '__firstAid') game.firstAid(active.id, clickedDweller.id);
        else game.enqueue(active.id, { kind: 'social', targetId: clickedDweller.id, socialId: id, autonomous: false });
      });
      return;
    }
    if (clickedDweller) return;
    if (active.age === 'baby') return;
    if (!onLot && hit.uid === undefined) return;
    if (active.away) {
      game.notify(`${josa(active.name, '은/는')} 지금 회사에 있어요`, 'info');
      game.emit();
      return;
    }
    if (game.puddleAt(t.x, t.y) && !game.fireAt(t.x, t.y)) {
      openMenu(e, '웅덩이', [{ id: 'mop', label: '웅덩이 닦기', icon: '🧽' }], () =>
        game.enqueue(active.id, { kind: 'mop', x: t.x, y: t.y, autonomous: false }),
      );
      return;
    }
    if (game.fireAt(t.x, t.y)) {
      openMenu(e, '불', [{ id: 'extinguish', label: '불 끄기', icon: '🧯' }], () =>
        game.enqueue(active.id, { kind: 'extinguish', x: t.x, y: t.y, autonomous: false }),
      );
      return;
    }
    const obj = (hit.uid !== undefined ? game.state.objects.find((o) => o.uid === hit.uid) : undefined) ?? objectAt(game.state.objects, t.x, t.y);
    if (obj) {
      const options = game.objectMenu(active, obj);
      if (options.length === 0) return;
      openMenu(e, getDef(obj.defId).name, options, (id) => {
        // The wardrobe and the mirror: the new look is picked first, put on when the dweller gets there.
        const restyle = getDef(obj.defId).interactions.find((i) => i.id === id)?.restyle;
        if (restyle) setStyling({ dwellerId: active.id, mode: restyle, uid: obj.uid, interactionId: id });
        else game.enqueue(active.id, { kind: 'interact', objectUid: obj.uid, interactionId: id, autonomous: false });
      });
      return;
    }
    if (!game.blocked[idx(t.x, t.y)]) game.enqueue(active.id, { kind: 'goto', x: t.x, y: t.y, autonomous: false });
  };

  const onBuyClick = (e: React.MouseEvent, t: P, hit: PickHit) => {
    const uid = hit.uid;
    // The room and wall tools build on release (onMouseUp), from where the drag began.
    if (placing?.build === 'room' || placing?.build === 'wall') return;
    if (dragDone.current) {
      dragDone.current = false;
      return;
    }
    // Doors and windows go in the wall pointed at; the remove tool takes down what's on the edge
    // pointed at (a door or window out of its wall, else the wall), else takes up the floor.
    const edge = targetEdge(hit, placing?.build);
    if (placing?.build === 'door' || placing?.build === 'window') {
      if (edge) game.buildEdge(placing.build, ...edgeAt(edge));
      return;
    }
    if (placing?.build === 'remove' && edge) {
      game.buildEdge('remove', ...edgeAt(edge));
      return;
    }
    if (placing?.build) {
      if (!game.buildAt(placing.build, t.x, t.y) && game.state.money >= BUILD_COST[placing.build]) {
        game.notify('여기에는 지을 수 없어요', 'bad');
        game.emit();
      }
      return;
    }
    if (placing?.paint) {
      game.paintRoom(roomUnder(game, t), placing.paint.part, placing.paint.style);
      return;
    }
    if (placing) {
      const o = placementOrigin(placing.defId, placing.dir, t);
      const ok =
        placing.movingUid !== undefined
          ? game.move(placing.movingUid, o.x, o.y, placing.dir)
          : placing.stored !== undefined
            ? game.placeStored(placing.stored, o.x, o.y, placing.dir)
            : game.buy(placing.defId, o.x, o.y, placing.dir);
      if (ok) setPlacing(null);
      return;
    }
    const obj = (uid !== undefined ? game.state.objects.find((o) => o.uid === uid) : undefined) ?? objectAt(game.state.objects, t.x, t.y);
    if (!obj) return;
    const def = getDef(obj.defId);
    openMenu(
      e,
      def.name,
      [
        { id: 'rotate', label: '회전', icon: '🔄' },
        { id: 'move', label: '옮기기', icon: '✋' },
        { id: 'store', label: '보관함에 넣기', icon: '📦' },
        { id: 'sell', label: `팔기 (+§${Math.floor(def.price * 0.8)})`, icon: '💰' },
      ],
      (id) => {
        if (id === 'rotate') {
          if (!game.move(obj.uid, obj.x, obj.y, rotateDir(obj.dir))) {
            game.notify('회전할 공간이 없거나 사용 중이에요', 'bad');
            game.emit();
          }
        } else if (id === 'move') {
          if (game.isObjectBusy(obj.uid)) {
            game.notify('누군가 사용 중이에요', 'bad');
            game.emit();
          } else setPlacing({ defId: obj.defId, dir: obj.dir, movingUid: obj.uid });
        } else if (id === 'store') game.store(obj.uid);
        else if (id === 'sell') game.sell(obj.uid);
      },
    );
  };

  return (
    <main className="stage">
      <div className="canvas-wrap" ref={wrapRef}>
        <div
          ref={hostRef}
          className={`lot3d-host ${mode === 'buy' ? 'buy' : ''}`}
          onClick={onClick}
          onWheel={(e) => {
            // Smooth for a trackpad's small steps, a notch at a time for a wheel; towards the pointer.
            const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
            viewRef.current?.zoomBy(Math.exp(Math.max(-240, Math.min(240, d)) * 0.0015), e.clientX, e.clientY);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (orbited.current) {
              orbited.current = false;
              return;
            }
            setMenu(null);
            setPlacing(null);
          }}
          onMouseDown={(e) => {
            // The middle button (or Shift) drags the view along; the right button (or Alt) turns and tilts it.
            const kind = e.button === 1 || (e.button === 0 && e.shiftKey) ? 'pan' : e.button === 2 || (e.button === 0 && e.altKey) ? 'orbit' : null;
            if (kind) {
              e.preventDefault();
              drag.current = { x: e.clientX, y: e.clientY, kind, moved: 0 };
              orbited.current = false;
              return;
            }
            // The room tool: press at one corner, drag to the other (참고 게임's room tool).
            if (mode === 'buy' && placing?.build === 'room' && e.button === 0) uiRef.current.roomFrom = toWorld(e).t;
            // The wall tool: press at a corner of the grid, drag along the line to another (참고 게임's wall tool).
            if (mode === 'buy' && placing?.build === 'wall' && e.button === 0) uiRef.current.wallFrom = corner(toWorld(e).f);
            // The remove tool pressed on a wall: dragged along it, the walls on the line come down.
            if (mode === 'buy' && placing?.build === 'remove' && e.button === 0) {
              const hit = pickAt(e);
              const edge = targetEdge(hit, 'remove');
              uiRef.current.removeFrom = edge && hit ? corner(hit.wallF ?? hit.f) : null;
            }
          }}
          onMouseUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (d) {
              if (d.moved > 4) orbited.current = true;
              return;
            }
            const from = uiRef.current.roomFrom;
            uiRef.current.roomFrom = null;
            if (mode === 'buy' && placing?.build === 'room' && from && e.button === 0) {
              const t = toWorld(e).t;
              game.buildRoom(from.x, from.y, t.x, t.y);
            }
            const removeFrom = uiRef.current.removeFrom;
            uiRef.current.removeFrom = null;
            if (mode === 'buy' && placing?.build === 'remove' && removeFrom && e.button === 0) {
              const hit = pickAt(e);
              const to = hit ? corner(hit.wallF ?? hit.f) : removeFrom;
              // A drag along the wall (a click on it is the click's to do).
              if (to.x !== removeFrom.x || to.y !== removeFrom.y) {
                game.removeWalls(removeFrom.x, removeFrom.y, to.x, to.y);
                dragDone.current = true;
              }
            }
            const wallFrom = uiRef.current.wallFrom;
            uiRef.current.wallFrom = null;
            if (mode === 'buy' && placing?.build === 'wall' && wallFrom && e.button === 0) {
              const { f, t } = toWorld(e);
              const to = corner(f);
              // A click without a drag puts up the one wall on the edge nearest the pointer.
              if (to.x === wallFrom.x && to.y === wallFrom.y) game.buildEdge('wall', t.x, t.y, nearestSide(f.x, f.y));
              else game.buildWalls(wallFrom.x, wallFrom.y, to.x, to.y);
            }
          }}
          onMouseMove={(e) => {
            const d = drag.current;
            if (d) {
              const dx = e.clientX - d.x;
              const dy = e.clientY - d.y;
              if (d.kind === 'pan') viewRef.current?.pan(dx, dy);
              else viewRef.current?.orbit(dx, dy);
              drag.current = { ...d, x: e.clientX, y: e.clientY, moved: d.moved + Math.abs(dx) + Math.abs(dy) };
              return;
            }
            const hit = pickAt(e);
            const f = hit?.f ?? { x: -1, y: -1 };
            const t = hit?.t ?? { x: -1, y: -1 };
            const level = uiRef.current.level ?? 0;
            uiRef.current.hover = t.x >= 0 && t.x < MAP_W && t.y >= level * MAP_H && t.y < (level + 1) * MAP_H ? t : null;
            uiRef.current.at = uiRef.current.removeFrom && hit?.wallF ? hit.wallF : uiRef.current.hover ? f : null;
            uiRef.current.edge = mode === 'buy' ? targetEdge(hit, placing?.build) : null;
            // Drag to lay floor or path, or take it up (walls are drawn, and taken down, from corner to corner).
            const tileTool = placing?.build === 'floor' || placing?.build === 'path' || (placing?.build === 'remove' && !uiRef.current.removeFrom && !uiRef.current.edge);
            if (uiRef.current.hover && mode === 'buy' && tileTool && e.buttons === 1) game.buildAt(placing!.build!, t.x, t.y);
          }}
          onMouseLeave={() => {
            uiRef.current.hover = null;
            uiRef.current.edge = null;
            // A drag let go of off the lot is called off.
            uiRef.current.removeFrom = uiRef.current.wallFrom = uiRef.current.roomFrom = null;
            drag.current = null;
          }}
        >
          {failed && <p className="lot3d-failed">이 브라우저에서는 3D 화면(WebGL)을 쓸 수 없어요.</p>}
        </div>
        {preparing && <canvas className="lot-curtain" ref={curtain} />}
        {game.levels > 1 && (
          <div className="floor-ctl" role="radiogroup" aria-label="층">
            {Array.from({ length: game.levels }, (_, i) => game.levels - 1 - i).map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={level === l}
                className={level === l ? 'on' : ''}
                title={`${l + 1}층 보기`}
                onClick={() => {
                  uiRef.current.level = l;
                  setLevel(l);
                  const a = game.dweller(game.state.activeDwellerId);
                  follow.current = !!a && Math.floor(Math.round(a.y) / MAP_H) === l;
                }}
              >
                {l + 1}층
              </button>
            ))}
          </div>
        )}
        <div className="keys-help">
          <button
            className={`keys-btn ${keysOpen ? 'on' : ''}`}
            title="조작법"
            aria-label="조작법"
            aria-expanded={keysOpen}
            onClick={() => setKeysOpen((o) => !o)}
          >
            <Icon name="keys" />
          </button>
          {keysOpen && (
            <div className="keys-pop" role="dialog" aria-label="조작법">
              <h3>{mode === 'live' ? '생활 모드 조작법' : '구매 모드 조작법'}</h3>
              <dl>
                {(mode === 'live' ? LIVE_KEYS : BUY_KEYS).map(([k, what]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
        <div className="zoom-ctl cam-ctl">
          <button onClick={() => viewRef.current?.rotate(-1)} title="왼쪽으로 돌리기 (Q · 오른쪽 버튼 끌기)">
            <Icon name="rotateLeft" />
          </button>
          <button onClick={() => viewRef.current?.rotate(1)} title="오른쪽으로 돌리기 (E · 오른쪽 버튼 끌기)">
            <Icon name="rotateRight" />
          </button>
          <button onClick={() => viewRef.current?.tilt(0.15)} title="위에서 보기 (R)">
            <Icon name="tiltTop" />
          </button>
          <button onClick={() => viewRef.current?.tilt(-0.15)} title="옆에서 보기 (F)">
            <Icon name="tiltSide" />
          </button>
          <button onClick={() => viewRef.current?.zoomBy(1 / 1.3)} title="확대 (휠, Z)">
            <Icon name="zoomIn" />
          </button>
          <button onClick={() => viewRef.current?.zoomBy(1.3)} title="축소 (휠, X)">
            <Icon name="zoomOut" />
          </button>
          <button onClick={() => viewRef.current?.home()} title="처음 시점으로 (Home)">
            <Icon name="camera" />
          </button>
          {WALL_MODES.map(([m, icon, label]) => (
            <button
              key={m}
              className={walls === m ? 'on' : ''}
              title={label}
              aria-pressed={walls === m}
              onClick={() => {
                if (viewRef.current) viewRef.current.walls = m;
                setWalls(m);
              }}
            >
              <Icon name={icon} />
            </button>
          ))}
          <button
            title={body === 'vroid' ? 'VRoid 캐릭터 · 눌러서 도형 캐릭터로 (가벼워요)' : '도형 캐릭터 · 눌러서 VRoid 캐릭터로'}
            onClick={() => {
              const next: BodyStyle = body === 'vroid' ? 'shape' : 'vroid';
              setBodyStyle(next);
              if (viewRef.current) viewRef.current.body = next;
              setBody(next);
            }}
          >
            <Icon name={body === 'vroid' ? 'live' : 'shape'} />
          </button>
        </div>
        {children}
        {mode === 'live' && game.activeDweller && <ActionQueue game={game} />}
        {coming > 0 && !preparing && body === 'vroid' && (
          <div className="lot-loading" role="status">
            <span className="lot-spin" aria-hidden /> 캐릭터를 불러오는 중… {coming > 1 ? `(${coming}명)` : ''}
          </div>
        )}
        <Toasts game={game} />
        {styling && game.dweller(styling.dwellerId) && (
          <Suspense fallback={null}>
            <DwellerStyler
              game={game}
              dweller={game.dweller(styling.dwellerId)!}
              mode={styling.mode}
              onCancel={() => setStyling(null)}
              onDone={(look) => {
                game.enqueue(styling.dwellerId, { kind: 'interact', objectUid: styling.uid, interactionId: styling.interactionId, autonomous: false, look });
                setStyling(null);
              }}
            />
          </Suspense>
        )}
        <ScreenSlam game={game} />
        {menu && ringFits(menu) && <PieRing menu={menu} wrap={wrapRef.current} onGroup={(group) => setMenu({ ...menu, group })} onPick={(id) => (setMenu(null), menu.onPick(id))} />}
        {menu && !ringFits(menu) && (
          <div className="pie" ref={pieRef} style={{ left: menu.left, top: menu.top }}>
            <div className="pie-title">{menu.group ? `${menu.title} · ${menu.group}` : menu.title}</div>
            {menuRows(menu).map((row) => {
              if (row.kind === 'back')
                return (
                  <button key="__back" className="pie-group" onClick={(e) => (e.stopPropagation(), setMenu(fitMenu({ ...menu, group: undefined })))}>
                    <span className="pie-icon">
                <Icon name="arrowLeft" />
              </span>
                    <span>뒤로</span>
                  </button>
                );
              if (row.kind === 'group') {
                const [icon, ...name] = row.name.split(' ');
                return (
                  <button key={`__g${row.name}`} className="pie-group" onClick={(e) => (e.stopPropagation(), setMenu(fitMenu({ ...menu, group: row.name })))}>
                    <span className="pie-icon">{icon}</span>
                    <span>{name.join(' ')}</span>
                    <small>{row.count} ▸</small>
                  </button>
                );
              }
              const o = row.o;
              return (
                <button
                  key={o.id}
                  disabled={!!o.disabled}
                  title={o.disabled ?? o.note}
                  onClick={() => {
                    setMenu(null);
                    menu.onPick(o.id);
                  }}
                >
                  <span className="pie-icon">{o.icon}</span>
                  <span>{o.label}</span>
                  {(o.disabled ?? o.note) && <small>{o.disabled ?? o.note}</small>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
