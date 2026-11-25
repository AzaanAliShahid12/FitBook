import { ReactNode } from 'react';
import { Button } from './ui/button';

export function EmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: ReactNode; title: string; description?: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 dark:text-lime-400">{icon}</div>
      <h3 className="text-base font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
