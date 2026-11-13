import { useState } from 'react';
import { FIGURE_QUALITIES, figureQuality, setFigureQuality, type FigureQuality } from '../view3d/figureQuality';
import type { Lifespan } from '../game/babies';
import type { DwellerSpec } from '../game/types';
import { slotInfo, type Slot } from '../game/save';
import { ThemeToggle } from './TopBar';
import { CharacterCreator } from './CharacterCreator';
import { SaveSlots, type SlotMode } from './SaveSlots';
import titleBg from '../assets/title/title-bg.jpg';
import { Icon } from './Icon';
import { PackButtons } from './PackNotice';
import { STARS } from '../game/stars';
import { packLine, usePack } from '../view3d/pack';

interface Props {
  /** A story is saved in some slot. */
  canContinue: boolean;
  /** A 스페이스기전 admin (or the dev server): the tools for making the game show in the settings. */
  admin: boolean;
  onContinue: (slot: Slot) => void;
  onNew: (specs: DwellerSpec[], lifespan: Lifespan, guide: boolean, slot: Slot) => void;
  /** Opens the workplace tour (a tool for while the game is being made). */
  onTour?: () => void;
  /** The 3D motion lab (src/ui/MotionLab.tsx), for trying how characters use each piece of furniture. */
  onLab?: () => void;
  /** Every asset in 3D (src/ui/AssetGallery.tsx). */
  onGallery?: () => void;
  /** Trying on clothes and hair in 3D (src/ui/Wardrobe.tsx). */
  onWardrobe?: () => void;
}

/** Where the title image's three buttons are, in parts of the image (it's 1672×941). */
const TITLE_BUTTONS = { start: 562, continue: 648, settings: 731 } as const;

/**
 * The start (docs/ref-game/11-ui.md §6): the title picture with its START, CONTINUE and SETTINGS; a new
 * story picks one of the three save slots (save.ts), then makes its one character
 * (CharacterCreator.tsx); CONTINUE picks the story to go on with.
 */
export function StartScreen({ canContinue, admin, onContinue, onNew, onTour, onLab, onGallery, onWardrobe }: Props) {
  const [slots, setSlots] = useState<SlotMode | null>(null);
  const [newSlot, setNewSlot] = useState<Slot | null>(null);
  const [settings, setSettings] = useState(false);

  if (newSlot) {
    return (
      <CharacterCreator
        overwriting={!slotInfo(newSlot).empty}
        onBack={() => setNewSlot(null)}
        onDone={(spec, lifespan, guide) => onNew([spec], lifespan, guide, newSlot)}
      />
    );
  }

  const at = (top: number) => ({ top: `${(top / 941) * 100}%` });
  const tools = admin && (onTour || onLab || onGallery || onWardrobe);
  return (
    <div className="title-screen">
      {/* The title image (made for the game, 2026-10-19): START, CONTINUE and SETTINGS are drawn in it; the buttons lie over them. */}
      <div className="title-art">
        <img src={titleBg} alt="고등학생이었던 내가 이세계에서는 사회인? — 평범한 고등학생이었던 나, 지금은… 이세계의 사회인?!" draggable={false} />
        <button className="title-hot" style={at(TITLE_BUTTONS.start)} onClick={() => setSlots('new')} aria-label="START 새로운 이야기가 시작됩니다 — 새 캐릭터 만들기" title="새 캐릭터를 만들어 새로운 이야기를 시작해요" />
        <button
          className="title-hot"
          style={at(TITLE_BUTTONS.continue)}
          disabled={!canContinue}
          onClick={() => setSlots('load')}
          aria-label="CONTINUE 이어하기"
          title={canContinue ? '저장한 이야기를 이어서 해요' : '아직 저장한 이야기가 없어요'}
        />
        <button className="title-hot" style={at(TITLE_BUTTONS.settings)} onClick={() => setSettings(true)} aria-label="SETTINGS 환경 설정" title="환경 설정" />
      </div>
      {slots && (
        <SaveSlots
          mode={slots}
          onClose={() => setSlots(null)}
          onPick={(slot) => {
            setSlots(null);
            if (slots === 'new') setNewSlot(slot);
            else onContinue(slot);
          }}
        />
      )}
      {settings && (
        <div className="modal-backdrop" onClick={() => setSettings(false)}>
          <div className="modal title-settings" role="dialog" aria-label="환경 설정" onClick={(e) => e.stopPropagation()}>
            <h2>⚙️ 환경 설정</h2>
            <div className="title-settings-row">
              <span>화면</span>
              <ThemeToggle />
            </div>
            <div className="title-settings-row">
              <span>인물 품질</span>
              <select defaultValue={figureQuality()} onChange={(e) => setFigureQuality(e.target.value as FigureQuality)} aria-label="인물 품질" title="근무지에 나오는 사람들을 어떻게 그릴지 정해요. 화면이 느리면 낮춰 보세요.">
                {FIGURE_QUALITIES.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
            <PackRow />
            {/* The stars' VRoid Hub characters ask to be credited (game/stars.ts). */}
            <div className="title-settings-row pack-row">
              <span>캐릭터 모델</span>
              <span className="pack-row-body muted small">{STARS.map((s) => `${s.name}: ${s.credit}`).join(' · ')}</span>
            </div>
            {/* Tools for making the game: a 스페이스기전 admin only (PlayPass status.admin; on the dev server, everyone). */}
            {tools && (
              <>
                <div className="tour-group">개발용 (관리자만 보여요)</div>
                <div className="menu-btns">
                  {onTour && (
                    <button className="ghost" onClick={onTour} title="저장과 상관없이 모든 근무지를 하나씩 열어 봐요">
                      <Icon name="work" /> 근무지 둘러보기
                    </button>
                  )}
                  {onLab && (
                    <button className="ghost" onClick={onLab} title="욕구가 줄지 않는 집에서 가구마다 캐릭터의 동작을 하나씩 해 봐요">
                      <Icon name="lab" /> 동작 실험실
                    </button>
                  )}
                  {onGallery && (
                    <button className="ghost" onClick={onGallery} title="게임의 모든 가구를 3D로 하나씩 돌려 봐요">
                      <Icon name="puzzle" /> 에셋 갤러리
                    </button>
                  )}
                  {onWardrobe && (
                    <button className="ghost" onClick={onWardrobe} title="헤어와 옷을 바꿔 입혀 보고, 피팅룸에서 갈아입는 모습을 봐요">
                      <Icon name="shirt" /> 옷장
                    </button>
                  )}
                </div>
              </>
            )}
            <div className="styler-foot">
              <button className="primary" onClick={() => setSettings(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The character pack in the settings: how it stands, and the new pack's installer when it doesn't fit (view3d/pack.ts). */
function PackRow() {
  const pack = usePack();
  if (!pack) return null;
  return (
    <div className="title-settings-row pack-row">
      <span>3D 캐릭터 팩</span>
      <span className="pack-row-body">
        <span className="muted small">{packLine(pack)}</span>
        <PackButtons pack={pack} />
      </span>
    </div>
  );
}
