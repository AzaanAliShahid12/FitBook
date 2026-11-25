import { cn } from '@/lib/utils';

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  if (src) {
    const url = src.startsWith('http') ? src : `${import.meta.env.VITE_SOCKET_URL || ''}${src}`;
    return <img src={url} alt={name} className={cn('h-10 w-10 rounded-full object-cover', className)} />;
  }
  return (
    <span className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-lime-400 dark:bg-zinc-800', className)}>
      {initials}
    </span>
  );
}
