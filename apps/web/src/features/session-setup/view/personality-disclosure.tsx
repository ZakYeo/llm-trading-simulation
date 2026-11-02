import { useId, useState, type ReactNode } from 'react';

export function PersonalityDisclosure({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <div className="personality-disclosure">
      <button
        type="button"
        className="personality-toggle"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
      >
        <span aria-hidden="true" className="disclosure-chevron"></span>{' '}
        Customize {name} personality
      </button>
      <div
        className="personality-expansion"
        data-expanded={expanded}
        id={id}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="personality-expansion-inner">{children}</div>
      </div>
    </div>
  );
}
