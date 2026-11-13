import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDef } from '../game/catalog';
import type { Game } from '../game/game';
import { LOT_PLANS, planObjects, planTiles, type LotPlan, type Tenure } from '../game/lots';
import { LOT_TRAIT_BY_ID } from '../game/lotTraits';
import type { Tile } from '../game/types';
import { LEVEL_TILES, MAP_H, MAP_W, dims } from '../game/world';
import { Icon } from './Icon';

const TILE_COLOR: Record<Tile, string> = {
  grass: '#9ccc65',
  water: '#2f7f9e',
  path: '#c9c3b6',
  wall: '#6d5d4b',
  door: '#b08b65',
  wood: '#d7a46c',
  tile: '#e3ecef',
  carpet: '#b39ddb',
  void: 'transparent',
};

/** A small plan of a home, each floor side by side, with its furniture as coloured blocks. */
function PlanMap({ plan, scale = 6 }: { plan: LotPlan; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const floors = plan.upper ? 2 : 1;
  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    const tiles = planTiles(plan);
    const objects = planObjects(plan, 2, 1);
    for (let f = 0; f < floors; f++) {
      const ox = f * (MAP_W * scale + 8);
      for (let i = 0; i < LEVEL_TILES; i++) {
        const t = tiles[f * LEVEL_TILES + i];
        if (!t || t === 'void') continue;
        g.fillStyle = TILE_COLOR[t];
        g.fillRect(ox + (i % MAP_W) * scale, Math.floor(i / MAP_W) * scale, scale, scale);
      }
      for (const o of objects) {
        if (Math.floor(o.y / MAP_H) !== f) continue;
        const def = getDef(o.defId);
        const { w, h } = dims(def, o.dir);
        g.fillStyle = def.color;
        g.fillRect(ox + o.x * scale + 1, (o.y % MAP_H) * scale + 1, w * scale - 2, h * scale - 2);
      }
    }
  }, [plan, floors, scale]);
  return <canvas ref={ref} className="plan-map" width={floors * MAP_W * scale + (floors - 1) * 8} height={MAP_H * scale} aria-label={`${plan.name} 도면`} />;
}

const bedrooms = (plan: LotPlan) => {
  const sleeps = planObjects(plan, 2, 1).reduce((n, o) => n + (/bed/i.test(o.defId) ? getDef(o.defId).seats ?? 1 : 0), 0);
  return sleeps;
};

/** Moving house (참고 게임 Move Household; renting after For Rent): the homes on offer, what each would come to. */
export function HomeMarket({ game, onClose }: { game: Game; onClose: () => void }) {
  const [pick, setPick] = useState<{ id: string; tenure: Tenure } | null>(null);
  const [take, setTake] = useState(true);
  const current = game.plan;
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal home-market" role="dialog" aria-label="집 구하기" onClick={(e) => e.stopPropagation()}>
        <header className="home-market-head">
          <h2>🏠 집 구하기</h2>
          <button className="ghost small" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>
        <p className="muted">
          지금 집: <b>{current.name}</b> ({game.lot.rent ? `월세 §${game.lot.rent}/주` : `가치 §${game.lotValue}`}). 이사하면{' '}
          {game.lot.rent ? '보증금을 돌려받아요' : '집(지은 벽·바닥 포함)을 팔고 그 값을 받아요'}. 어느 집이든 월세로 살거나 사서 살 수 있어요. 새 집은 가구가 갖춰져 있고, 빈 땅에는 직접 지어요.
        </p>
        <label className="home-take">
          <input type="checkbox" checked={take} onChange={(e) => setTake(e.target.checked)} /> 우리 가구 가져가기: 📦 보관함에 담아 가서 새 집에 무료로 다시 놓아요 (끄면 가구를 팔아요)
        </label>
        <div className="home-list">
          {LOT_PLANS.map((plan) => {
            const here = plan.id === current.id;
            const picked = pick?.id === plan.id ? pick : null;
            const offer = game.homeOffer(plan.id, take, picked?.tenure ?? 'own');
            const rentOffer = game.homeOffer(plan.id, take, 'rent');
            const buyOffer = game.homeOffer(plan.id, take, 'own');
            return (
              <article key={plan.id} className={`home-card ${picked ? 'on' : ''}`}>
                <div className="home-card-head">
                  <b>{plan.name}</b>
                  <span className="chip">{plan.kind}</span>
                  {here && <span className="chip on">지금 집 · {game.lot.rent ? '월세' : '우리 집'}</span>}
                </div>
                <PlanMap plan={plan} />
                <p className="muted">{plan.desc}</p>
                <ul className="home-facts">
                  <li>{!plan.shell ? '건물·가구 없음 · 이사하면 직접 지어요' : `${plan.upper ? '2층' : '1층'} · 침대 ${bedrooms(plan)}자리`}</li>
                  <li>부지 특성: {plan.traits.length ? plan.traits.map((id) => `${LOT_TRAIT_BY_ID[id].icon} ${LOT_TRAIT_BY_ID[id].label}`).join(', ') : '없음 (이사한 뒤 3개까지 고를 수 있어요)'}</li>
                  {plan.rent ? <li>월세 §{plan.rent}/주 · 보증금 §{plan.rent} (벽·부지 특성은 못 바꿔요)</li> : null}
                  {plan.price ? <li>매매 §{plan.price} (가치 §{plan.value})</li> : null}
                </ul>
                {!plan.shell ? (
                  game.siteGame ? (
                    <p className="muted">짓고 있는 땅이 있어요. 위쪽 🏗️ 새 땅 탭에서 지은 뒤 이사해요.</p>
                  ) : (
                    <button
                      className="primary"
                      disabled={game.state.money < (plan.price ?? 0)}
                      onClick={() => {
                        if (game.buyLand()) onClose();
                      }}
                    >
                      땅 사기 (먼저 짓고 이사)
                    </button>
                  )
                ) : picked ? (
                  <div className="home-confirm">
                    <div>
                      {here ? '돌려받는 보증금' : '받는 돈'} §{offer.proceeds} − {picked.tenure === 'rent' ? '보증금' : '집값'} §{offer.cost} = {here ? '산 뒤' : '이사 뒤'} §{offer.after}
                    </div>
                    <button
                      className="primary"
                      disabled={!offer.ok}
                      onClick={() => {
                        if (game.moveTo(plan.id, take, picked.tenure)) onClose();
                      }}
                    >
                      {here ? '이 집 사기' : picked.tenure === 'rent' ? '월세로 이사하기' : '사서 이사하기'}
                    </button>
                    <button className="ghost" onClick={() => setPick(null)}>
                      취소
                    </button>
                  </div>
                ) : here ? (
                  // Renting here: it can be bought from the landlord.
                  game.lot.rent ? (
                    <button className="primary" disabled={!buyOffer.ok} title={buyOffer.reason} onClick={() => setPick({ id: plan.id, tenure: 'own' })}>
                      {buyOffer.ok ? `이 집 사기 §${plan.price}` : buyOffer.reason}
                    </button>
                  ) : null
                ) : (
                  <div className="home-tenure">
                    <button className="ghost" disabled={!rentOffer.ok} title={rentOffer.reason} onClick={() => setPick({ id: plan.id, tenure: 'rent' })}>
                      {rentOffer.ok ? `월세로 이사 §${plan.rent}/주` : rentOffer.reason}
                    </button>
                    <button className="primary" disabled={!buyOffer.ok} title={buyOffer.reason} onClick={() => setPick({ id: plan.id, tenure: 'own' })}>
                      {buyOffer.ok ? `사서 이사 §${plan.price}` : buyOffer.reason}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The phone's home section: where the household lives, and a way to look for another place. */
export function HomeSection({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const plan = game.plan;
  return (
    <section>
      <h3>
        우리 집 <span className="muted">· 이사·월세</span>
      </h3>
      <div className="service-row">
        <span>
          {plan.name} · {game.lot.rent ? `월세 §${game.lot.rent}/주 (공과금과 함께 내요)` : `가치 §${game.lotValue}`}
        </span>
        <button className="pizza-btn" onClick={() => setOpen(true)}>
          <Icon name="home" /> 집 구하기
        </button>
      </div>
      {open && <HomeMarket game={game} onClose={() => setOpen(false)} />}
    </section>
  );
}
