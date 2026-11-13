import { WORK_TYPES, type WorkType } from '../game/careerTypes';
import { workTypeGuide } from '../game/workGuide';

/**
 * What counts for a "하고 싶은 일 해 보기" aspiration's goals (workGuide.ts): the activities that
 * are close to that kind of work, the skills it needs, and the jobs where a day's work counts.
 */
export function WorkTypeGuide({ type }: { type: WorkType }) {
  const t = WORK_TYPES[type];
  const g = workTypeGuide(type);
  return (
    <details className="asp-guide">
      <summary>
        {t.icon} {t.label}에는 어떤 게 있나요?
      </summary>
      <p>
        <b>{t.label}에 가까운 활동</b> <small className="muted">(할 때마다 하나씩 세요)</small>
        <br />
        {g.activities.join(' · ')}
      </p>
      <p>
        <b>필요한 역량</b> <small className="muted">(이 중 하나의 레벨)</small>
        <br />
        {g.skills.join(' · ')}
      </p>
      <p>
        <b>{t.label}의 일터</b> <small className="muted">(이 직업으로 일한 날을 세요)</small>
        <br />
        {g.jobs.join(' · ')}
      </p>
    </details>
  );
}
