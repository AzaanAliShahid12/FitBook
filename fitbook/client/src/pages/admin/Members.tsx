import { useState } from 'react';
import { Eye, Search, UserX } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMembers } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/time';
import type { User } from '@/types';

export default function AdminMembers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<User | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useMembers({ search: search || undefined, page, limit: 12 });

  const openDetail = async (u: User) => {
    setViewing(u);
    setDetail(null);
    try {
      const res = await api.get(`/members/${u.id}`);
      setDetail(res.data.data);
    } catch { setDetail(null); }
  };

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setDeactivating(null);
      toast({ variant: 'success', title: 'Member deactivated', description: 'They can no longer log in. Booking history is kept.' });
    },
    onError: (e) => { setDeactivating(null); toast({ variant: 'error', title: 'Could not deactivate', description: apiError(e) }); },
  });

  const detailBookings = (detail?.bookings as { id: string; bookingReference: string; status: string; fitnessClass?: { title: string; startTime: string } }[] | undefined) ?? [];
  const detailWaitlist = (detail?.waitlistEntries as { id: string; position: number; status: string; fitnessClass?: { title: string } }[] | undefined) ?? [];

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black tracking-tight">Members</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everyone registered as a member. View their bookings and waitlist activity, or deactivate an account.</p>

      <div className="relative mt-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search members…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Bookings</th>
                <th className="px-4 py-3 font-semibold">Waitlists</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-6"><Skeleton className="h-40" /></td></tr>
              ) : (data?.data.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No members found.</td></tr>
              ) : (
                data!.data.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} src={m.profileImage} className="h-9 w-9 text-xs" />
                        <div>
                          <p className="font-semibold leading-tight">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                    <td className="px-4 py-3">{m._count?.bookings ?? 0}</td>
                    <td className="px-4 py-3">{m._count?.waitlistEntries ?? 0}</td>
                    <td className="px-4 py-3">
                      {m.isActive ? <Badge variant="lime">Active</Badge> : <Badge variant="red">Deactivated</Badge>}
                      {!m.emailVerified && <Badge variant="amber" className="ml-1.5">Unverified</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openDetail(m)}><Eye /> View</Button>
                        {m.isActive && <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeactivating(m)}><UserX /></Button>}
                      </div>
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
          <span className="text-sm text-muted-foreground">Page {page} of {data.pagination.totalPages} · {data.pagination.total} members</span>
          <Button variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing ? viewing.name : 'Member'} className="max-w-xl">
        {viewing && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={viewing.name} src={viewing.profileImage} className="h-16 w-16 text-lg" />
              <div>
                <p className="font-bold">{viewing.email}</p>
                <p className="text-sm text-muted-foreground">{viewing.phone || 'No phone'} · Joined {fmtDate(viewing.createdAt)}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recent bookings</h3>
              {detailBookings.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No bookings yet.</p> : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {detailBookings.slice(0, 8).map((b) => (
                    <li key={b.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span>{b.fitnessClass?.title} <span className="text-xs text-muted-foreground">({b.bookingReference})</span></span>
                      {b.status === 'CONFIRMED' ? <Badge variant="lime">Confirmed</Badge> : <Badge variant="red">Cancelled</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Waitlist entries</h3>
              {detailWaitlist.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No waitlist entries.</p> : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {detailWaitlist.slice(0, 8).map((w) => (
                    <li key={w.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span>{w.fitnessClass?.title}</span>
                      <Badge variant="zinc">{w.status} {w.status === 'WAITING' ? `#${w.position}` : ''}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={Boolean(deactivating)} onClose={() => setDeactivating(null)} onConfirm={() => deactivating && deactivate.mutate(deactivating.id)}
        title="Deactivate this member?" confirmLabel="Deactivate account" destructive busy={deactivate.isPending}>
        {deactivating && <p><strong className="text-foreground">{deactivating.name}</strong> ({deactivating.email}) will no longer be able to log in. Their booking history stays intact for your records.</p>}
      </ConfirmDialog>
    </div>
  );
}
