import { useEffect, useState } from 'react';
import { SLOTS, deleteSave, slotInfo, type Slot, type SlotInfo } from '../game/save';
import { latestSaveCloud, useSaveCloud, type SaveCloud, type SlotSync } from '../cloud/saveCloud';
import { Icon } from './Icon';
import '../slots.css';

/**
 * The three save slots as a book of records (2026-10-20): to go on with a story (load), to start a
 * new one somewhere (new), or to save the one being played (save). A slot with a story in it asks
 * before it's written over; a story can be wiped from the load view. In 스페이스기전 학생 each card
 * says whether its story is on the student's account too (cloud/saveCloud.ts), and a story kept
 * only there (another PC's) shows and can be gone on with.
 */
export type SlotMode = 'load' | 'new' | 'save';

const TITLE: Record<SlotMode, string> = { load: '이어서 할 이야기', new: '새 이야기를 남길 자리', save: '이야기 기록하기' };
const LEAD: Record<SlotMode, string> = {
  load: '이어서 할 기록을 골라요.',
  new: '새 이야기를 어느 칸에 남길까요? 다른 칸의 이야기는 그대로 남아요.',
  save: '지금 이야기를 어느 칸에 기록할까요?',
};
const NUMERAL: Record<Slot, string> = { 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ' };
const SYNC: Record<SlotSync, [string, string]> = {
  synced: ['서버에 저장됨', '이 PC와 스페이스기전 계정에 같은 기록이 있어요'],
  local: ['이 PC에만', '아직 스페이스기전 계정에 올라가지 않았어요'],
  localNewer: ['이 PC가 더 최근', '곧 스페이스기전 계정에도 올라가요'],
  server: ['서버에 있음', '다른 PC에서 기록한 이야기예요. 고르면 받아 와요'],
  serverNewer: ['서버가 더 최근', '다른 PC에서 더 나중에 기록했어요. 이어하면 그 기록을 받아 와요'],
};

/** A slot's card: this PC's story, or the server's when only it has one (another PC's). */
function infoOf(slot: Slot, cloud: SaveCloud | null): SlotInfo {
  const here = slotInfo(slot);
  const there = cloud?.remote.get(slot);
  if (!here.empty || !there) return here;
  return { slot, empty: false, people: there.summary.people ?? [], day: there.summary.day ?? 1, money: there.summary.money ?? 0, savedAt: there.savedAt };
}

function when(at?: number) {
  if (!at) return '';
  const d = new Date(at);
  return d.toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function SlotCard({ info, mode, current, sync, onPick, onWipe }: { info: SlotInfo; mode: SlotMode; current?: Slot; sync: SlotSync | null; onPick: () => void; onWipe: () => void }) {
  const [asking, setAsking] = useState<'' | 'over' | 'wipe'>('');
  const mine = current === info.slot;
  const usable = mode !== 'load' || !info.empty;
  const pick = () => {
    if (!usable) return;
    // Writing over another story asks first; saving into the story's own slot doesn't.
    if (!info.empty && mode !== 'load' && !(mode === 'save' && mine)) setAsking('over');
    else onPick();
  };
  const names = info.people.map((p) => p.name);
  return (
    <div className={`slot-card ${info.empty ? 'empty' : ''} ${mine ? 'mine' : ''} ${usable ? '' : 'off'}`}>
      <button className="slot-face" onClick={pick} disabled={!usable || !!asking} aria-label={`${info.slot}번 칸${info.empty ? ' (비어 있음)' : ` · ${names.join(', ')} · ${info.day}일차`}`}>
        <span className="slot-num" aria-hidden>
          {NUMERAL[info.slot]}
        </span>
        {mine && <span className="slot-badge">지금 이야기</span>}
        {sync && (
          <span className={`slot-sync ${sync}`} title={SYNC[sync][1]}>
            {SYNC[sync][0]}
          </span>
        )}
        {info.empty ? (
          <span className="slot-blank">
            <Icon name="compass" />
            <span>빈 기록</span>
          </span>
        ) : (
          <>
            <span className="slot-people" aria-hidden>
              {info.people.slice(0, 4).map((p, i) => (
                <span key={i} className="slot-head" style={{ background: p.skin }}>
                  <span className="hair" style={{ background: p.hair }} />
                  <span className="shirt" style={{ background: p.shirt }} />
                </span>
              ))}
              {info.people.length === 0 && <span className="slot-head gone" />}
            </span>
            <span className="slot-names">{names.length ? (names.length > 2 ? `${names[0]} 외 ${names.length - 1}명` : names.join(' · ')) : '남은 가족이 없어요'}</span>
            <span className="slot-stats">
              <span>{info.day}일차</span>
              <span>§ {info.money.toLocaleString()}</span>
            </span>
            {info.savedAt && <span className="slot-when">{when(info.savedAt)} 기록</span>}
          </>
        )}
      </button>
      {asking && (
        <div className="slot-ask" role="alertdialog" aria-label="확인">
          <p>{asking === 'wipe' ? '이 이야기를 지울까요? 되돌릴 수 없어요.' : mode === 'new' ? '이 칸의 이야기를 지우고 새로 시작할까요?' : '이 칸의 이야기 위에 기록할까요?'}</p>
          <div>
            <button className="ghost small" onClick={() => setAsking('')}>
              취소
            </button>
            <button
              className="primary small danger"
              onClick={() => {
                const w = asking;
                setAsking('');
                if (w === 'wipe') onWipe();
                else onPick();
              }}
            >
              {asking === 'wipe' ? '지우기' : mode === 'new' ? '지우고 시작' : '덮어서 기록'}
            </button>
          </div>
        </div>
      )}
      {mode === 'load' && !info.empty && !asking && (
        <button className="slot-wipe" onClick={() => setAsking('wipe')} title="이 이야기 지우기">
          <Icon name="close" /> 지우기
        </button>
      )}
    </div>
  );
}

export function SaveSlots({ mode, current, onPick, onClose }: { mode: SlotMode; current?: Slot; onPick: (slot: Slot) => void; onClose: () => void }) {
  const [, redraw] = useState(0);
  const [pulling, setPulling] = useState(false);
  const cloud = useSaveCloud();
  // The server's slots as they are now (another PC may have saved since); never waited on.
  useEffect(() => {
    void cloud?.refresh();
  }, [cloud]);
  const infos = SLOTS.map((s) => infoOf(s, cloud));
  const pick = async (slot: Slot) => {
    // Going on with a story: the server's copy first if it was saved later (or only it has one) —
    // with the server's slots as they are now, waited for (never this PC's older copy by a quick click).
    if (mode === 'load') {
      setPulling(true);
      const c = await latestSaveCloud();
      if (c) await c.pullIfNewer(slot);
      setPulling(false);
    }
    onPick(slot);
  };
  return (
    <div className="modal-backdrop slots-backdrop" onClick={onClose}>
      <div className="modal slots" role="dialog" aria-modal="true" aria-labelledby="slots-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="slots-title">
          <Icon name="devList" /> {TITLE[mode]}
          <button className="ghost small slots-close" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </h2>
        <p className="slots-lead">{pulling ? '스페이스기전에서 기록을 받아 오는 중…' : LEAD[mode]}</p>
        <div className="slot-row">
          {infos.map((info) => (
            <SlotCard
              key={info.slot}
              info={info}
              mode={mode}
              current={current}
              sync={cloud ? cloud.status(info.slot) : null}
              onPick={() => void pick(info.slot)}
              onWipe={() => {
                deleteSave(info.slot);
                void cloud?.remove(info.slot);
                redraw((n) => n + 1);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
