import { useEffect, useRef, useState } from 'react';
import type { PlayPass } from '../cloud/playPass';
import { ArcadeScene } from '../view3d/arcadeScene';
import { coinPriceLabel, perCoinLabel, playLeftLabel, usePass } from './PlayTime';
import '../arcade.css';
import { Icon } from './Icon';

/**
 * The arcade the game opens on (2026-10-20): a coin in, the camera into the screen, and the title
 * (StartScreen, the same picture) takes over. A coin is a day's play (cloud/playPass.ts).
 */
export function Arcade({ pass, leaving, onEnter, onBack }: { pass: PlayPass | null; leaving: boolean; onEnter: () => void; onBack?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ArcadeScene | null>(null);
  const [busy, setBusy] = useState<'' | 'coin' | 'in'>('');
  const [error, setError] = useState('');
  /** Signing in (the program's browser sign-in under way): asked again every few seconds. */
  const [signing, setSigning] = useState('');
  usePass(pass);
  useEffect(() => {
    if (!signing || !pass) return;
    const id = window.setInterval(() => void pass.refresh(), 3000);
    const stop = window.setTimeout(() => setSigning(''), 180_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [signing, pass]);
  useEffect(() => {
    if (signing && pass && !pass.problem) setSigning('');
  }, [signing, pass, pass?.problem]);

  useEffect(() => {
    const scene = new ArcadeScene(canvasRef.current!);
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
  }, []);

  const s = pass?.status;
  const left = pass?.left ?? 0;
  useEffect(() => {
    // While a coin is on its way the label waits for it (insert sets it when the coin is in).
    if (!busy) sceneRef.current?.setLabel(left > 0 && s ? `CREDIT ${s.coins}` : 'INSERT COIN');
  }, [left, s, busy]);

  const goIn = async () => {
    setBusy('in');
    await sceneRef.current?.zoomIn();
    onEnter();
  };

  const insert = async () => {
    if (!pass) return;
    setBusy('coin');
    setError('');
    const r = await pass.insert();
    if (!r.ok) {
      setBusy('');
      setError(r.error);
      return;
    }
    await sceneRef.current?.insertCoin();
    sceneRef.current?.setLabel(`CREDIT ${pass.status.coins}`);
    await new Promise((done) => setTimeout(done, 450));
    await goIn();
  };

  const problem = pass?.problem;
  const canInsert = !!s && s.nextPrice !== null && !problem;
  return (
    <div className={`arcade ${leaving ? 'leaving' : ''} ${busy ? 'busy' : ''}`}>
      <canvas ref={canvasRef} className="arcade-canvas" aria-label="오락기 — 동전을 넣으면 게임이 시작돼요" />
      {/* Come from a game in play (today's play used up): back to it without a coin, to look round. */}
      {onBack && !busy && (
        <button className="arcade-back" onClick={onBack}>
          <Icon name="arrowLeft" /> 게임으로 돌아가기
        </button>
      )}
      {!busy && (
        <div className="arcade-ui">
          {!pass ? (
            <p className="arcade-line">오락기를 켜는 중…</p>
          ) : problem === 'needsApp' ? (
            <p className="arcade-line">이 게임은 스페이스기전 학생 프로그램에서 스페이스기전에 로그인해서 할 수 있어요.</p>
          ) : problem === 'signedOut' ? (
            <>
              <p className="arcade-line">{signing || '다른 스페이스기전 앱처럼, 스페이스기전에 로그인해야 오락기를 켤 수 있어요.'}</p>
              <button
                className="arcade-coin"
                disabled={!!signing}
                onClick={async () => {
                  const r = await pass.signIn();
                  if (r.ok) setSigning(`${r.message} 로그인하면 여기서 바로 이어져요.`);
                  else setError(r.message);
                }}
              >
                <span className="ac-main">스페이스기전 로그인</span>
                <span className="ac-sub">{signing ? '로그인을 기다리는 중…' : '구글 계정으로 로그인해요'}</span>
              </button>
            </>
          ) : problem ? (
            <>
              <p className="arcade-line">스페이스기전에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.</p>
              <button className="arcade-coin ghost" onClick={() => void pass.refresh()}>
                다시 확인
              </button>
            </>
          ) : (
            <>
              {left > 0 ? (
                <button className="arcade-coin" onClick={() => void goIn()}>
                  <span className="ac-main">▶ 이어서 하기</span>
                  <span className="ac-sub">오늘 남은 시간 {playLeftLabel(left)}</span>
                </button>
              ) : canInsert ? (
                <button className="arcade-coin" onClick={() => void insert()}>
                  <span className="ac-main"><i className="coin-ico" aria-hidden /> 동전 넣기</span>
                  <span className="ac-sub">{coinPriceLabel(s!.nextPrice, s!.coins === 0)}</span>
                </button>
              ) : (
                <p className="arcade-line">오늘 넣을 수 있는 동전을 모두 썼어요. 내일 다시 만나요!</p>
              )}
              <div className="arcade-facts">
                <span className="af-coins" aria-label={`오늘 넣은 동전 ${s!.coins}개, 최대 ${s!.maxCoins}개`}>
                  {Array.from({ length: s!.maxCoins }, (_, i) => (
                    <i key={i} className={i < s!.coins ? 'used' : ''} />
                  ))}
                  <span>오늘 {s!.coins}/{s!.maxCoins}</span>
                </span>
                <span>동전 하나 = 게임 속 {perCoinLabel(s!.perCoin)}</span>
                {s!.wallet !== null && <span>내 코인 {s!.wallet}</span>}
                {left > 0 && canInsert && (
                  <button className="af-more" onClick={() => void insert()}>
                    <i className="coin-ico" aria-hidden /> 하나 더 넣기 · {coinPriceLabel(s!.nextPrice, false)}
                  </button>
                )}
              </div>
            </>
          )}
          {error && <p className="arcade-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
