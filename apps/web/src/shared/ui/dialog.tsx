import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({
  title,
  children,
  onClose,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={drawer ? 'dialog detail-drawer' : 'dialog'}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <header className="section-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="quiet-button"
            onClick={onClose}
            autoFocus
            aria-label={`Close ${title}`}
          >
            Close ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
