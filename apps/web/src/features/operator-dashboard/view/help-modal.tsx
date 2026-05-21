interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpSections = [
  {
    icon: 'add_circle',
    title: 'Create or connect',
    body: 'Use Session Startup to create a new simulation or connect to a saved session from the dropdown list.',
  },
  {
    icon: 'play_arrow',
    title: 'Run the session',
    body: 'Choose a turn count, run the next turns, and watch balances, status, and replay update.',
  },
  {
    icon: 'gavel',
    title: 'Settle rounds',
    body: 'Advance the round when you want custody interest and market settlement effects applied.',
  },
  {
    icon: 'troubleshoot',
    title: 'Inspect state',
    body: 'Review balances, custody, market exposure, and the audit trail in one place.',
  },
  {
    icon: 'account_balance',
    title: 'Custody overview',
    body: "Custody Overview shows banker-led custody totals, principal, accrued interest, and the trader's currently redeemable balance with the banker.",
  },
  {
    icon: 'visibility',
    title: 'Market visibility',
    body: 'Market Visibility shows the current opportunity board and any trader market positions.',
  },
  {
    icon: 'history',
    title: 'Audit history',
    body: 'Filter the Audit Trail by treasury, market, messages, actions, or transfers, and limit the view to recent events or recent rounds.',
    className: 'help-card-wide',
  },
];

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
        <div className="help-modal-header">
          <div>
            <p className="panel-kicker">Help</p>
            <h2>How To Use The Dashboard</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close help"
            onClick={onClose}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="help-grid">
          {helpSections.map((section, index) => (
            <article
              key={section.title}
              className={
                section.className
                  ? `help-card ${section.className}`
                  : 'help-card'
              }
            >
              <div className="help-card-heading">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {section.icon}
                </span>
                <strong>
                  {index + 1}. {section.title}
                </strong>
              </div>
              <p>{section.body}</p>
            </article>
          ))}
        </div>

        <footer className="help-modal-footer">
          <button
            className="action-button primary"
            type="button"
            onClick={onClose}
          >
            Acknowledge
          </button>
        </footer>
      </section>
    </div>
  );
}
