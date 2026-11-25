import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500 shadow-sm">
        <Zap className="h-5 w-5 text-zinc-950" fill="currentColor" />
      </span>
      {!compact && (
        <span className="text-xl font-black tracking-tight">
          Fit<span className="text-lime-600 dark:text-lime-400">Book</span>
        </span>
      )}
    </span>
  );
}
