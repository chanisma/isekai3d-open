import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import '../slots.css';

/**
 * A question before something big (2026-10-20), in the save slots' look instead of the browser's
 * own confirm box: a navy band with the title, a line or two, and the two answers. Put on the page
 * itself (a portal), so the top bar's frame doesn't clip it.
 */
export function ConfirmDialog({ icon, title, children, ok, onOk, onCancel }: { icon: IconName; title: string; children: ReactNode; ok: string; onOk: () => void; onCancel: () => void }) {
  return createPortal(
    <div className="modal-backdrop slots-backdrop" onClick={onCancel}>
      <div className="modal confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title">
          <Icon name={icon} /> {title}
        </h2>
        <div className="confirm-body">{children}</div>
        <div className="modal-actions confirm-actions">
          <button className="ghost" onClick={onCancel}>
            취소
          </button>
          <button className="primary" onClick={onOk} autoFocus>
            {ok}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
