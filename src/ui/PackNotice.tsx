import { useState } from 'react';
import { openPackDownload, packLine, usePack, type PackStatus } from '../view3d/pack';

/** The character pack doesn't fit this game: why dwellers are shape figures, and the new pack's installer. */
export function PackNotice() {
  const pack = usePack();
  const [closed, setClosed] = useState(false);
  if (!pack || pack.state === 'ok' || closed) return null;
  return (
    <div className="pack-notice" role="status">
      <span>🧍 {packLine(pack)}</span>
      <PackButtons pack={pack} />
      <button className="ghost small" onClick={() => setClosed(true)} aria-label="알림 닫기" title="닫기">
        ✕
      </button>
    </div>
  );
}

/** Getting the new pack, and once it's installed, looking again (the server lists it from the next load). */
export function PackButtons({ pack }: { pack: PackStatus }) {
  const [said, setSaid] = useState('');
  if (pack.state === 'ok' || pack.state === 'newer') return null;
  return (
    <span className="pack-btns">
      {pack.download ? (
        <button className="primary small" onClick={() => void openPackDownload(pack).then((m) => setSaid(m || '설치 파일을 받아 «설치하기»를 실행한 뒤 다시 확인해 주세요.'))}>
          새 팩 받기
        </button>
      ) : (
        <span className="muted small">받는 곳은 스페이스기전에 연결되면 보여요.</span>
      )}
      <button className="ghost small" onClick={() => location.reload()} title="설치를 마쳤으면 게임을 다시 불러와요 (지금까지 한 것은 저장돼요)">
        다시 확인
      </button>
      {said && <span className="muted small">{said}</span>}
      {pack.download?.note && <span className="muted small">{pack.download.note}</span>}
    </span>
  );
}
