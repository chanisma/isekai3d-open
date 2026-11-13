import { isYoung } from './babies';
import { CAREER_BY_ID } from './careers';
import type { Game } from './game';
import type { Dweller } from './types';

/**
 * Guide tips for a first game, after 참고 게임's tutorial tips (tutorials/tutorial_tip.py): each tip
 * points at one part of the screen, says what it is and what to try, and is satisfied by doing it
 * (`gameplay_test`) or by moving on (`cancelable`). A tip waits for the tips it requires
 * (`required_tip_groups`) and for its part of the screen to be there (`required_ui_list`). The
 * texts and order are ours, written for students playing for the first time.
 */
export interface TipCtx {
  game: Game;
  /** The dweller panel tab open. */
  tab: string;
  mode: 'live' | 'buy';
  /** Whether a part of the screen is showing (a CSS selector), so a tip can point at it. */
  present: (selector: string) => boolean;
}

export interface TipDef {
  id: string;
  title: string;
  text: string;
  /** What to try, when doing it moves the guide on (참고 게임 action_text). */
  action?: string;
  /** The part of the screen pointed at; none = a card in the middle (참고 게임 STANDARD display). */
  target?: string;
  requires?: string[];
  /** When the tip makes sense at all (e.g. only for a dweller old enough to work). */
  when?: (c: TipCtx) => boolean;
  /** Done by doing it (참고 게임 gameplay_test). Tips without one move on with "다음". */
  done?: (c: TipCtx) => boolean;
}

const dweller = (c: TipCtx) => c.game.activeDweller;
const canWork = (c: TipCtx) => !isYoung(dweller(c).age) || dweller(c).age === 'teen';
const working = (s: Dweller) => !!(s.job && !CAREER_BY_ID[s.job.careerId]?.school) || !!s.partTime;

export const TIPS: TipDef[] = [
  {
    id: 'welcome',
    title: '환영해요! 「고등학생이었던 내가 이세계에서는 사회인?」',
    text: '캐릭터들의 하루를 돌보며 여러 가지 일과 꿈을 겪어 보는 게임이에요. 화면 곳곳을 짧게 안내할게요. 언제든 "안내 끄기"로 그만 볼 수 있고, 위쪽 ❓ 안내로 다시 켤 수 있어요.',
  },
  {
    id: 'portraits',
    title: '지금 돌보는 캐릭터',
    text: '초상화를 누르거나 Tab 키로 다른 캐릭터를 골라요. 테두리 색은 지금 감정이에요. 일하러 가 있으면 🏢, 욕구가 바닥나면 ❗가 떠요.',
    target: '.panel.hud .portraits',
    requires: ['welcome'],
  },
  {
    id: 'needs',
    title: '욕구 6가지',
    text: '배고픔·에너지·생리현상·위생·재미·사교예요. 막대가 노랗거나 빨개지면 채워 줘야 해요. 막대를 누르면 자세히 보여요.',
    target: '.need-strip',
    requires: ['portraits'],
  },
  {
    id: 'order',
    title: '물건을 눌러 행동 시키기',
    text: '냉장고·침대·컴퓨터 같은 물건을 누르면 할 수 있는 행동이 나와요. 다른 캐릭터를 누르면 이야기할 수 있어요.',
    action: '집 안의 물건을 눌러 행동을 하나 골라 보세요.',
    target: '.canvas-wrap',
    requires: ['needs'],
    done: (c) => dweller(c).queue.some((a) => !a.autonomous),
  },
  {
    id: 'queue',
    title: '할 일 목록',
    text: '시킨 일은 왼쪽 위에 차례로 쌓여요. 누르면 취소돼요. "자율"이 붙은 일은 캐릭터가 스스로 고른 일이에요.',
    target: '.queue',
    requires: ['order'],
  },
  {
    id: 'mood',
    title: '감정과 기분',
    text: '지금 감정과, 그 감정을 만든 일들이에요. 동그라미 테두리는 남은 시간만큼 줄어들어요. 마우스를 올리면 무엇인지 알려 줘요.',
    target: '.mood-tray',
    // Not after "queue": the list is only there while there's something to do, so it may come later.
    requires: ['order'],
  },
  {
    id: 'speed',
    title: '시간 빠르게',
    text: '▶ 보통, ▶▶ 빠르게, ▶▶▶ 아주 빠르게예요. Space로 멈추고, 숫자 1·2·3으로도 바꿔요.',
    action: '▶▶나 ▶▶▶를 눌러 보세요.',
    target: '.speeds',
    requires: ['mood'],
    done: (c) => c.game.state.speed >= 2,
  },
  {
    id: 'controls',
    title: '조작법 보기',
    text: '집 왼쪽 아래 ⌨ 버튼을 누르면 조작법이 모두 나와요. 시점 돌리기(Q·E, 오른쪽 버튼 끌기), 기울이기(R·F), 옮기기(WASD), 확대(휠) 같은 것을 언제든 다시 볼 수 있어요.',
    action: '⌨ 버튼을 눌러 조작법을 열어 보세요.',
    target: '.keys-btn',
    requires: ['speed'],
    done: (c) => c.present('.keys-pop'),
  },
  {
    id: 'tabs',
    title: '캐릭터를 자세히 보기',
    text: '성격·열망·직업·역량·관계·가방·휴대폰 탭에서 캐릭터의 모든 것을 볼 수 있어요. 키보드 O·Y·G·J·L·R·I·P로도 열려요.',
    action: '욕구 말고 다른 탭을 하나 눌러 보세요.',
    target: '.hud-tabs',
    requires: ['controls'],
    done: (c) => c.tab !== 'needs',
  },
  {
    id: 'aspiration',
    title: '하고 싶은 것 (열망)',
    text: '캐릭터가 해 보고 싶은 것을 골라요. 아직 꿈이 없으면 "나를 찾아가는 여행"으로 시작해도 괜찮아요. 꿈은 언제든 바꿀 수 있고, 해 온 것은 남아요.',
    action: '금색 열망 칸을 눌러 하나 골라 보세요.',
    target: '.asp-chip',
    requires: ['tabs'],
    when: (c) => !dweller(c).npc && dweller(c).age !== 'toddler',
    done: (c) => !!dweller(c).aspiration,
  },
  {
    id: 'explore',
    title: '진로 탐색',
    text: '직업 탭의 🧭 진로 탐색에서 직업마다 필요한 역량과 그 역량이 왜 중요한지 볼 수 있어요. 마음에 드는 직업은 ⭐ 관심 직업으로 찜해 두세요.',
    action: '직업 탭에서 🧭 진로 탐색을 열고 직업 하나를 눌러 보세요.',
    target: '.hud-tabs',
    requires: ['aspiration'],
    when: canWork,
    done: (c) => (dweller(c).explored?.length ?? 0) > 0,
  },
  {
    id: 'job',
    title: '일 구하기',
    text: '컴퓨터를 눌러 "구직"으로 일을 찾아요. 청소년은 아르바이트를 할 수 있어요. 일터를 따라가면 그 일을 직접 해 볼 수 있어요.',
    action: '컴퓨터에서 일을 하나 구해 보세요. (나중에 해도 돼요)',
    target: '.canvas-wrap',
    requires: ['explore'],
    when: canWork,
    done: (c) => c.game.household().some(working),
  },
  {
    id: 'buy',
    title: '집 꾸미기',
    text: '🛒 구매 모드에서 가구를 사서 놓고, 벽과 바닥을 꾸밀 수 있어요.',
    action: '🛒 구매를 누르거나 B 키를 눌러 보세요.',
    target: '.modes',
    requires: ['job'],
    done: (c) => c.mode === 'buy',
  },
  {
    id: 'buyHow',
    title: '물건 놓기',
    text: '카탈로그에서 물건을 고르고 집을 눌러 놓아요. R로 돌리고, 놓인 물건을 누르면 옮기거나 팔 수 있어요.',
    action: '다 보면 🧍 라이브를 누르거나 B 키로 돌아가요.',
    target: '.catalog',
    requires: ['buy'],
    when: (c) => c.mode === 'buy',
    done: (c) => c.mode === 'live',
  },
  {
    id: 'notices',
    title: '알림',
    text: '중요한 일은 오른쪽 아래 알림으로 와요. 금색은 특별한 순간, 빨강은 급한 일이에요. 알림을 누르면 그 캐릭터로 바뀌고, 🔔 알림에서 지난 것을 다시 봐요.',
    target: '.log-wrap',
    requires: ['buyHow'],
  },
  {
    id: 'freeWill',
    title: '자율 행동',
    text: '켜 두면 캐릭터가 스스로 욕구를 채우고 하고 싶은 일을 해요. 끄면 모든 걸 직접 시켜야 해요. 욕구 탭의 "하고 싶은 것"에서 캐릭터가 무엇을 하고 싶어 하는지 볼 수 있어요.',
    target: '.freewill',
    requires: ['notices'],
  },
  {
    id: 'end',
    title: '안내 끝!',
    text: '이제 마음껏 살아 보세요. 게임 방법은 위쪽 ❓ 안내로 언제든 다시 볼 수 있어요.',
    requires: ['freeWill'],
  },
];

export const TIP_BY_ID: Record<string, TipDef> = Object.fromEntries(TIPS.map((t) => [t.id, t]));

/**
 * The tip to show now: the first one not yet done whose required tips are done (or skipped as not
 * making sense) and whose part of the screen is showing.
 */
export function currentTip(done: readonly string[], c: TipCtx): TipDef | null {
  const finished = new Set(done);
  for (const t of TIPS) {
    if (finished.has(t.id)) continue;
    // A tip that doesn't apply to this dweller counts as done for the ones after it.
    if (t.when && !t.when(c)) {
      finished.add(t.id);
      continue;
    }
    if (t.requires?.some((r) => !finished.has(r))) continue;
    if (t.target && !c.present(t.target)) continue;
    return t;
  }
  return null;
}

/** How far along the guide is, for "3/16". */
export function tipNumber(id: string): number {
  return TIPS.findIndex((t) => t.id === id) + 1;
}
