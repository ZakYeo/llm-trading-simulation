import { useEffect, useRef, type ReactNode } from 'react';

/** Reopen controls when entering the desktop layout, whose summary is hidden. */
export function ResponsiveDisclosure({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    function revealOnDesktop() {
      if (desktop.matches && ref.current) ref.current.open = true;
    }
    revealOnDesktop();
    desktop.addEventListener('change', revealOnDesktop);
    return () => desktop.removeEventListener('change', revealOnDesktop);
  }, []);
  return (
    <details ref={ref} className="execution-disclosure" open>
      <summary>Run turns &amp; settlement</summary>
      {children}
    </details>
  );
}
