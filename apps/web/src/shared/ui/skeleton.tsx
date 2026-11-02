export function Skeleton({
  label,
  rows = 3,
}: {
  label: string;
  rows?: number;
}) {
  return (
    <div
      className="skeleton-region"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true" className="skeleton-content">
        {Array.from({ length: rows }, (_, index) => (
          <div className="skeleton-card" key={index}>
            <span className="skeleton-line skeleton-heading" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-short" />
          </div>
        ))}
      </div>
    </div>
  );
}
