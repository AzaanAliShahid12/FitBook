import { useState } from 'react';
import { Download, Search, XCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminBookings } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError, tokenStore } from '@/lib/api';
import { fmtDate, fmtTime } from '@/lib/time';
import type { Booking } from '@/types';

export default function AdminBookings() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useAdminBookings({ search: search || undefined, status: status || undefined, page, limit: 12 });

  const cancel = useMutation({
    mutationFn: (b: Booking) => api.post(`/bookings/${b.id}/cancel`, { reason: 'Cancelled by admin' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] });
      setCancelling(null);
      toast({ variant: 'success', title: 'Booking cancelled', description: res.data.data.promotedBooking ? 'The seat was promoted to the next waitlisted member automatically.' : undefined });
    },
    onError: (e) => { setCancelling(null); toast({ variant: 'error', title: 'Cancellation failed', description: apiError(e) }); },
  });

  const exportCsv = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/reports/bookings`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fitbook-bookings.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Booking management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every booking across the studio. Cancelling a booking triggers automatic waitlist promotion.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by member, email or reference…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select className="w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Booked</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-6"><Skeleton className="h-40" /></td></tr>
              ) : (data?.data.length ?? 0) === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No bookings match your filters.</td></tr>
              ) : (
                data!.data.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3 font-mono text-xs font-bold">{b.bookingReference}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold leading-tight">{b.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{b.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold leading-tight">{b.fitnessClass?.title}</p>
                      <p className="text-xs text-muted-foreground">{b.fitnessClass?.instructor?.name}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(b.fitnessClass?.startTime ?? '')} · {fmtTime(b.fitnessClass?.startTime ?? '')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(b.bookedAt)}</td>
                    <td className="px-4 py-3">{b.status === 'CONFIRMED' ? <Badge variant="lime">Confirmed</Badge> : <Badge variant="red">Cancelled</Badge>}</td>
                    <td className="px-4 py-3">
                      {b.status === 'CONFIRMED' && (
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setCancelling(b)}><XCircle /> Cancel</Button>
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
          <span className="text-sm text-muted-foreground">Page {page} of {data.pagination.totalPages} · {data.pagination.total} bookings</span>
          <Button variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <ConfirmDialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} onConfirm={() => cancelling && cancel.mutate(cancelling)}
        title="Cancel this booking?" confirmLabel="Yes, cancel booking" destructive busy={cancel.isPending}>
        {cancelling && <p>Cancel <strong className="text-foreground">{cancelling.user?.name}</strong>'s booking for <strong className="text-foreground">{cancelling.fitnessClass?.title}</strong>? If the class has a waitlist, the seat is promoted to the next member automatically.</p>}
      </ConfirmDialog>
    </div>
  );
}
