import { CAREER_BY_ID } from '../game/careers';
import type { Game } from '../game/game';
import { josa } from '../game/util';
import { WORKPLACES } from '../game/workplace';

/**
 * A dweller off to their first shift at a workplace: go along this once, every shift (the job tab's
 * toggle turns on), or not (the shift is worked out of sight, and the toggle can turn it on later).
 */
export function FollowModal({ game }: { game: Game }) {
  const ask = game.state.followAsks?.[0];
  const dweller = ask && game.dweller(ask.dwellerId);
  const job = dweller && game.jobIn(dweller, ask.slot);
  if (!dweller || !job) return null;
  const career = CAREER_BY_ID[job.careerId];
  const place = WORKPLACES[job.careerId]?.name ?? career.name;
  return (
    <div className="modal-backdrop">
      <div className="modal follow-ask">
        <h2>
          {career.icon} 첫 출근 <span className="muted">· {dweller.name} ({career.name})</span>
        </h2>
        <p>
          {josa(dweller.name, '이/가')} {place}에 처음 출근해요. 따라가서 일하는 모습을 볼까요?
        </p>
        <p className="muted small">따라가면 근무지가 따로 열리고, 화면 오른쪽 위 동그라미로 집과 근무지를 오갈 수 있어요. 따라가지 않으면 근무는 보이지 않는 곳에서 계산돼요.</p>
        <div className="career-event-choices">
          <button className="offer" onClick={() => game.answerFollow('always')}>
            <b>항상 따라가기</b>
            <span className="muted small">직업 탭의 «출근할 때 따라가기»가 켜져요</span>
          </button>
          <button className="offer" onClick={() => game.answerFollow('once')}>
            <b>이번만 따라가기</b>
          </button>
          <button className="offer" onClick={() => game.answerFollow('no')}>
            <b>따라가지 않기</b>
            <span className="muted small">나중에 직업 탭에서 켤 수 있어요</span>
          </button>
        </div>
      </div>
    </div>
  );
}
