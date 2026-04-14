import type { ReactNode } from 'react';

interface CardShellProps {
  children: ReactNode;
  className?: string;
}

interface CardHeaderProps {
  kicker: string;
  title: string;
  actions?: ReactNode;
  compact?: boolean;
}

interface CardCollapseButtonProps {
  isExpanded: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
}

interface CardBodyProps {
  children: ReactNode;
  isExpanded: boolean;
  className?: string;
}

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function CardShell({ children, className }: CardShellProps) {
  return (
    <section className={joinClasses('panel card-shell', className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  kicker,
  title,
  actions,
  compact = false,
}: CardHeaderProps) {
  return (
    <div
      className={joinClasses('panel-header', compact ? 'compact' : undefined)}
    >
      <div>
        <p className="panel-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {actions ? <div className="panel-header-actions">{actions}</div> : null}
    </div>
  );
}

export function CardCollapseButton({
  isExpanded,
  expandLabel,
  collapseLabel,
  onToggle,
}: CardCollapseButtonProps) {
  return (
    <button
      className="icon-button"
      aria-label={isExpanded ? collapseLabel : expandLabel}
      type="button"
      onClick={onToggle}
    >
      {isExpanded ? '−' : '+'}
    </button>
  );
}

export function CardBody({ children, isExpanded, className }: CardBodyProps) {
  return (
    <div
      className={joinClasses(
        'card-body',
        isExpanded ? 'expanded' : 'collapsed',
        className,
      )}
      aria-hidden={!isExpanded}
    >
      <div className="card-body-inner">{children}</div>
    </div>
  );
}
