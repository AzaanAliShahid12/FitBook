import { useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page, 15);
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markRead = useMutation({ mutationFn: (id: string) => api.put(`/notifications/${id}/read`), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => api.put('/notifications/read-all'), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/notifications/${id}`), onSuccess: invalidate });

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.unread ? `${data.unread} unread` : 'You are all caught up.'} Booking confirmations, waitlist promotions and class updates land here in real time.
          </p>
        </div>
        {(data?.unread ?? 0) > 0 && (
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}><CheckCheck /> Mark all as read</Button>
        )}
      </div>

      <div className="mt-6 space-y-2.5">
        {isLoading ? (
          <><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></>
        ) : (data?.data.length ?? 0) === 0 ? (
          <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications" description="When you book, join a waitlist or get promoted, it will show up here instantly." />
        ) : (
          data!.data.map((n) => (
            <Card
              key={n.id}
              className={cn('flex gap-3 p-4 transition', !n.isRead && 'border-lime-500/50 bg-lime-500/5')}
            >
              <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', n.isRead ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-lime-500')} />
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => !n.isRead && markRead.mutate(n.id)}>
                <p className="font-bold leading-tight">{n.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(n.createdAt)} · {n.type.replace(/_/g, ' ').toLowerCase()}</p>
              </div>
              <button onClick={() => remove.mutate(n.id)} className="self-start rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-red-500" aria-label="Delete notification">
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {data.pagination.totalPages}</span>
          <Button variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
