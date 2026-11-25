import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNotifications } from '@/hooks/useData';
import { fmtDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotifications(1, 8);
  const queryClient = useQueryClient();
  const unread = data?.unread ?? 0;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} className="flex items-center gap-1 text-xs font-semibold text-lime-700 hover:underline dark:text-lime-400">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(data?.data ?? []).length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>}
            {(data?.data ?? []).map((n) => (
              <div key={n.id} className={cn('border-b px-4 py-3 last:border-0', !n.isRead && 'bg-lime-500/5')}>
                <p className="text-sm font-semibold leading-tight">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{fmtDateTime(n.createdAt)}</p>
              </div>
            ))}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block bg-secondary/60 px-4 py-2.5 text-center text-sm font-semibold hover:bg-secondary">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
