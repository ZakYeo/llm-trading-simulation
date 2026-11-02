import { useEffect, useRef, type ReactNode } from 'react';

/** Native disclosure with dismissal and focus return for header popovers. */
export function Disclosure({
  label,
  children,
  accessibleName = label,
}: {
  label: ReactNode;
  accessibleName?: string | ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = ref.current;
    function dismiss(event: KeyboardEvent | PointerEvent) {
      if (!details?.open) return;
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        event.preventDefault();
        details.open = false;
        details.querySelector('summary')?.focus();
      } else if (
        event instanceof PointerEvent &&
        event.target instanceof Node &&
        !details.contains(event.target)
      ) {
        details.open = false;
      }
    }
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', dismiss);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', dismiss);
    };
  }, []);
  return (
    <details ref={ref} className="header-disclosure">
      <summary
        role="button"
        aria-label={
          typeof accessibleName === 'string' ? accessibleName : undefined
        }
      >
        {label}
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="disclosure-panel">{children}</div>
    </details>
  );
}
