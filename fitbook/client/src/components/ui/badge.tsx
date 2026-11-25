import { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      lime: 'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300',
      zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
      amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
      sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
      violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
      outline: 'border text-foreground',
    },
  },
  defaultVariants: { variant: 'zinc' },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
