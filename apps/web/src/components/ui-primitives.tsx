import type { ElementType, ReactNode } from 'react';

type Tone = 'neutral' | 'primary' | 'secondary' | 'tertiary' | 'error';
type SurfaceLevel = 'canvas' | 'panel' | 'inset' | 'raised';

interface PrimitiveProps {
  children: ReactNode;
  className?: string;
}

interface SurfaceProps extends PrimitiveProps {
  as?: ElementType;
  level?: SurfaceLevel;
}

interface ClusterProps extends PrimitiveProps {
  align?: 'start' | 'center' | 'end';
  justify?: 'start' | 'between' | 'end';
}

interface StatusDotProps {
  tone?: Tone;
}

interface StatusBadgeProps extends PrimitiveProps {
  tone?: Tone;
}

interface DataLabelProps {
  label: string;
  value: ReactNode;
  className?: string;
}

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function UiSurface({
  as: Component = 'section',
  children,
  className,
  level = 'panel',
}: SurfaceProps) {
  return (
    <Component
      className={joinClasses('ui-surface', `ui-surface-${level}`, className)}
    >
      {children}
    </Component>
  );
}

export function UiStack({ children, className }: PrimitiveProps) {
  return <div className={joinClasses('ui-stack', className)}>{children}</div>;
}

export function UiCluster({
  align = 'center',
  children,
  className,
  justify = 'start',
}: ClusterProps) {
  return (
    <div
      className={joinClasses(
        'ui-cluster',
        `ui-cluster-align-${align}`,
        `ui-cluster-justify-${justify}`,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function UiStatusDot({ tone = 'primary' }: StatusDotProps) {
  return <span className={`ui-status-dot ui-dot-${tone}`} aria-hidden="true" />;
}

export function UiStatusBadge({
  children,
  className,
  tone = 'primary',
}: StatusBadgeProps) {
  return (
    <span
      className={joinClasses('ui-status-badge', `ui-badge-${tone}`, className)}
    >
      <UiStatusDot tone={tone} />
      {children}
    </span>
  );
}

export function UiDataLabel({ className, label, value }: DataLabelProps) {
  return (
    <div className={joinClasses('ui-data-label', className)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
