import { useState } from 'react';
import { ArrowUpCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminWaitlist, useClasses } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError } from '@/lib/api';
import { fmtDate, fmtTime } from '@/lib/time';
import type { WaitlistEntry } from '@/types';

const badgeFor = (s: WaitlistEntry['status']) =>
  s === 'WAITING' ? <Badge variant="amber">Waiting</Badge>
  : s === 'PROMOTED' ? <Badge variant="lime">Promoted</Badge>
  : s === 'EXPIRED' ? <Badge variant="zinc">Expired</Badge>
  : <Badge variant="red">Cancelled</Badge>;

export default function AdminWaitlist() {
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [promoting, setPromoting] = useState<WaitlistEntry | null>(null);
  const [removing, setRemoving] = useState<WaitlistEntry | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: classes } = useClasses({ limit: 100 }, true);
  const { data, isLoading } = useAdminWaitlist({ classId: classId || undefined, status: status || undefined, page, limit: 15 });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] });
    queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['classes'] });
  };

  const promote = useMutation({
    mutationFn: (id: string) => api.post(`/admin/waitlist/${id}/promote`),
    onSuccess: () => { invalidate(); setPromoting(null); toast({ variant: 'success', title: 'Member promoted', description: 'A confirmed booking was created and the member notified.' }); },
    onError: (e) => { setPromoting(null); toast({ variant: 'error', title: 'Promotion failed', description: apiError(e) }); },
  });

  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/admin/waitlist/${id}/retry-promotion`),
    onSuccess: (res) => {
      invalidate();
      toast({ variant: res.data.data.promoted ? 'success' : 'info', title: res.data.data.promoted ? 'Promotion processed' : 'No seat available yet', description: res.data.data.message });
    },
    onError: (e) => toast({ variant: 'error', title: 'Retry failed', description: apiError(e) }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/waitlist/${id}`),
    onSuccess: () => { invalidate(); setRemoving(null); toast({ variant: 'success', title: 'Waitlist entry removed' }); },
    onError: (e) => { setRemoving(null); toast({ variant: 'error', title: 'Could not remove entry', description: apiError(e) }); },
  });

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black tracking-tight">Waitlist management</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every queue across the studio. Promotions normally happen automatically the moment a seat frees up — manual controls are here when you need them.</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Select className="w-auto min-w-52" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
          <option value="">All classes</option>
          {(classes?.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.title} — {fmtDate(c.startTime)}</option>)}
        </Select>
        <Select className="w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="WAITING">Waiting</option>
          <option value="PROMOTED">Promoted</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </Select>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-6"><Skeleton className="h-40" /></td></tr>
              ) : (data?.data.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No waitlist entries match your filters.</td></tr>
              ) : (
                data!.data.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      {e.status === 'WAITING'
                        ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-lime-400 dark:bg-zinc-800">{e.position}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold leading-tight">{e.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{e.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold leading-tight">{e.fitnessClass?.title}</p>
                      <p className="text-xs text-muted-foreground">{e.fitnessClass ? `${fmtDate(e.fitnessClass.startTime)} · ${fmtTime(e.fitnessClass.startTime)}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(e.joinedAt)}</td>
                    <td className="px-4 py-3">{badgeFor(e.status)}</td>
                    <td className="px-4 py-3">
                      {e.status === 'WAITING' && (
                        <div className="flex flex-wrap gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => setPromoting(e)}><ArrowUpCircle /> Promote</Button>
                          <Button variant="outline" size="sm" onClick={() => retry.mutate(e.id)} disabled={retry.isPending}><RefreshCw /> Retry</Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setRemoving(e)}><Trash2 /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {data.pagination.totalPages} · {data.pagination.total} entries</span>
          <Button variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <ConfirmDialog open={Boolean(promoting)} onClose={() => setPromoting(null)} onConfirm={() => promoting && promote.mutate(promoting.id)}
        title="Promote this member?" confirmLabel="Promote to confirmed booking" busy={promote.isPending}>
        {promoting && <p><strong className="text-foreground">{promoting.user?.name}</strong> will get a confirmed booking for <strong className="text-foreground">{promoting.fitnessClass?.title}</strong> immediately — only possible if a seat is free. They will be notified right away.</p>}
      </ConfirmDialog>

      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing.id)}
        title="Remove from waitlist?" confirmLabel="Remove entry" destructive busy={remove.isPending}>
        {removing && <p><strong className="text-foreground">{removing.user?.name}</strong> will lose position #{removing.position} for <strong className="text-foreground">{removing.fitnessClass?.title}</strong>, and everyone behind them moves up.</p>}
      </ConfirmDialog>
    </div>
  );
}
