import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Download } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyBookings } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError } from '@/lib/api';
import { fmtDate, fmtDateTime, fmtTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Booking } from '@/types';

export default function MyBookings() {
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const { data, isLoading } = useMyBookings(undefined, 1, 100);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cancel = useMutation({
    mutationFn: (b: Booking) => api.post(`/bookings/${b.id}/cancel`, {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['my-waitlist'] });
      setCancelling(null);
      toast({
        variant: 'success', title: 'Booking cancelled',
        description: res.data.data.promotedBooking ? 'Your seat was automatically given to the next person on the waitlist.' : 'Your seat has been released.',
      });
    },
    onError: (e) => { setCancelling(null); toast({ variant: 'error', title: 'Cancellation failed', description: apiError(e) }); },
  });

  const now = Date.now();
  const all = data?.data ?? [];
  const upcoming = all.filter((b) => b.status === 'CONFIRMED' && new Date(b.fitnessClass?.startTime ?? '').getTime() >= now);
  const history = all.filter((b) => !(b.status === 'CONFIRMED' && new Date(b.fitnessClass?.startTime ?? '').getTime() >= now));
  const shown = tab === 'upcoming' ? upcoming : history;

  const downloadSummary = (b: Booking) => {
    const text = [
      'FitBook — Booking Summary', '==========================',
      `Class: ${b.fitnessClass?.title}`, `When: ${fmtDateTime(b.fitnessClass?.startTime ?? '')}`,
      `Instructor: ${b.fitnessClass?.instructor?.name}`, `Room: ${b.fitnessClass?.room?.name}`,
      `Reference: ${b.bookingReference}`, `Status: ${b.status}`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = `fitbook-booking-${b.bookingReference}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black tracking-tight">My bookings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your confirmed classes, references and history.</p>

      <div className="mt-5 inline-flex rounded-xl border bg-card p-1">
        {(['upcoming', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('rounded-lg px-4 py-2 text-sm font-semibold capitalize transition', tab === t ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-muted-foreground hover:text-foreground')}
          >
            {t} ({t === 'upcoming' ? upcoming.length : history.length})
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="h-7 w-7" />}
            title={tab === 'upcoming' ? 'No upcoming bookings' : 'No booking history yet'}
            description={tab === 'upcoming' ? 'Find a class you like and grab your spot.' : 'Cancelled and past classes will appear here.'}
            actionLabel={tab === 'upcoming' ? 'Explore classes' : undefined}
            onAction={tab === 'upcoming' ? () => { window.location.href = '/explore'; } : undefined}
          />
        ) : (
          shown.map((b) => (
            <Card key={b.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <img src={b.fitnessClass?.image || ''} alt="" className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-36" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/classes/${b.classId}`} className="font-bold hover:underline">{b.fitnessClass?.title}</Link>
                  {b.status === 'CONFIRMED'
                    ? <Badge variant="lime">Confirmed</Badge>
                    : <Badge variant="red">Cancelled</Badge>}
                  {b.attendance && <Badge variant="sky">Attendance: {b.attendance.status}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fmtDate(b.fitnessClass?.startTime ?? '')} · {fmtTime(b.fitnessClass?.startTime ?? '')} – {fmtTime(b.fitnessClass?.endTime ?? '')} · {b.fitnessClass?.instructor?.name} · {b.fitnessClass?.room?.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ref <span className="font-bold text-foreground">{b.bookingReference}</span> · Booked {fmtDate(b.bookedAt)}
                  {b.status === 'CANCELLED' && b.cancelledAt ? ` · Cancelled ${fmtDate(b.cancelledAt)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadSummary(b)}><Download /> Summary</Button>
                {tab === 'upcoming' && b.status === 'CONFIRMED' && (
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setCancelling(b)}>Cancel</Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(cancelling)} onClose={() => setCancelling(null)}
        onConfirm={() => cancelling && cancel.mutate(cancelling)}
        title="Cancel this booking?" confirmLabel="Yes, cancel booking" destructive busy={cancel.isPending}
      >
        {cancelling && (
          <>
            <p><strong className="text-foreground">{cancelling.fitnessClass?.title}</strong> · {fmtDateTime(cancelling.fitnessClass?.startTime ?? '')}</p>
            <p className="mt-2">
              Cancellation is free up to {cancelling.fitnessClass?.cancellationDeadlineHours} hours before the class.
              Heads up: if this class has a waitlist, your seat will be offered automatically to the next person in line.
            </p>
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
