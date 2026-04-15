interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="help-modal panel"
        role="dialog"
        aria-modal="true"
        aria-label="Help and usage guide"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Help</p>
            <h2>How To Use The Dashboard</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="help-grid">
          <article className="help-card">
            <strong>1. Create or connect</strong>
            <p>
              Use Session Startup to create a new simulation or connect to a
              saved session from the dropdown list.
            </p>
          </article>
          <article className="help-card">
            <strong>2. Run the session</strong>
            <p>
              Choose a turn count, run the next turns, and watch balances,
              status, and replay update.
            </p>
          </article>
          <article className="help-card">
            <strong>3. Settle rounds</strong>
            <p>
              Advance the round when you want the backend custody interest
              policy applied.
            </p>
          </article>
          <article className="help-card">
            <strong>4. Inspect state</strong>
            <p>
              Use the connected workspace to review balances, custody, market
              exposure, and the audit trail in one place.
            </p>
          </article>
          <article className="help-card">
            <strong>5. Custody overview</strong>
            <p>
              Custody Overview shows banker-led custody totals, principal,
              accrued interest, and the trader&apos;s currently redeemable
              balance with the banker.
            </p>
          </article>
          <article className="help-card">
            <strong>6. Market visibility</strong>
            <p>
              Market Visibility shows the current opportunity board and any
              trader market positions that are still shaping session exposure.
            </p>
          </article>
          <article className="help-card">
            <strong>7. Audit history</strong>
            <p>
              Filter the Audit Trail by treasury, messages, actions, or
              transfers, and limit the view to recent events when the log grows.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
