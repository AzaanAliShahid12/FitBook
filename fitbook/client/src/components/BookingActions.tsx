import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ListOrdered, LogIn, Ticket, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { ConfirmDialog } from './ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMyBookings, useMyWaitlist } from '@/hooks/useData';
import { api, apiError, apiErrorCode } from '@/lib/api';
import { fmtDateTime } from '@/lib/time';
import type { FitnessClass } from '@/types';

/** Book / Join Waitlist / Cancel controls for one class, driven by live data. */
export function BookingActions({ cls, size = 'lg' }: { cls: FitnessClass; size?: 'lg' | 'default' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmBook, setConfirmBook] = useState(false);
  const [confirmJoin, setConfirmJoin] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: myBookings } = useMyBookings('CONFIRMED', 1, 100);
  const { data: myWaitlist } = useMyWaitlist();
  const myBooking = user ? myBookings?.data.find((b) => b.classId === cls.id && b.status === 'CONFIRMED') : undefined;
  const myEntry = user ? myWaitlist?.find((e) => e.classId === cls.id && e.status === 'WAITING') : undefined;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    queryClient.invalidateQueries({ queryKey: ['class', cls.id] });
    queryClient.invalidateQueries({ queryKey: ['availability', cls.id] });
    queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['my-waitlist'] });
  };

  const book = useMutation({
    mutationFn: () => api.post('/bookings', { classId: cls.id }),
    onSuccess: (res) => {
      invalidate();
      setConfirmBook(false);
      toast({ variant: 'success', title: 'Booking confirmed!', description: `Reference ${res.data.data.booking.bookingReference}` });
    },
    onError: (e) => {
      setConfirmBook(false);
      if (apiErrorCode(e) === 'CLASS_FULL') {
        toast({ variant: 'info', title: 'Class just filled up', description: 'Join the waitlist and we will promote you automatically when a seat opens.' });
        invalidate();
      } else {
        toast({ variant: 'error', title: 'Booking failed', description: apiError(e) });
      }
    },
  });

  const join = useMutation({
    mutationFn: () => api.post(`/waitlist/${cls.id}/join`),
    onSuccess: (res) => {
      invalidate();
      setConfirmJoin(false);
      toast({ variant: 'success', title: 'You are on the waitlist', description: `Position #${res.data.data.entry.position} for ${cls.title}` });
    },
    onError: (e) => { setConfirmJoin(false); toast({ variant: 'error', title: 'Could not join waitlist', description: apiError(e) }); },
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/bookings/${myBooking!.id}/cancel`, {}),
    onSuccess: (res) => {
      invalidate();
      setConfirmCancel(false);
      const promoted = res.data.data.promotedBooking;
      toast({
        variant: 'success', title: 'Booking cancelled',
        description: promoted ? 'Your seat was automatically offered to the next person on the waitlist.' : 'Your seat has been released.',
      });
    },
    onError: (e) => { setConfirmCancel(false); toast({ variant: 'error', title: 'Cancellation failed', description: apiError(e) }); },
  });

  const leave = useMutation({
    mutationFn: () => api.delete(`/waitlist/${myEntry!.id}/leave`),
    onSuccess: () => { invalidate(); toast({ variant: 'success', title: 'Left the waitlist', description: `You left the waitlist for ${cls.title}.` }); },
    onError: (e) => toast({ variant: 'error', title: 'Could not leave waitlist', description: apiError(e) }),
  });

  if (cls.status === 'CANCELLED') {
    return <Button size={size} variant="secondary" className="w-full" disabled><XCircle /> This class was cancelled</Button>;
  }

  if (!user) {
    return (
      <Button size={size} className="w-full" onClick={() => navigate('/login', { state: { from: `/classes/${cls.id}` } })}>
        <LogIn /> Log in to book
      </Button>
    );
  }

  if (myBooking) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl bg-lime-500/15 px-4 py-3 text-sm font-semibold text-lime-800 dark:text-lime-300">
          <CheckCircle2 className="h-5 w-5" /> You are booked — Ref {myBooking.bookingReference}
        </div>
        <Button size={size} variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={() => setConfirmCancel(true)}>
          Cancel booking
        </Button>
        <ConfirmDialog
          open={confirmCancel} onClose={() => setConfirmCancel(false)} onConfirm={() => cancel.mutate()}
          title="Cancel this booking?" confirmLabel="Yes, cancel booking" destructive busy={cancel.isPending}
        >
          <p><strong className="text-foreground">{cls.title}</strong> · {fmtDateTime(cls.startTime)}</p>
          <p className="mt-2">Cancellation is free up to {cls.cancellationDeadlineHours} hours before the class. Your seat will be offered automatically to the next person on the waitlist.</p>
        </ConfirmDialog>
      </div>
    );
  }

  if (myEntry) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
          <ListOrdered className="h-5 w-5" /> You are #{myEntry.position} on the waitlist
        </div>
        <Button size={size} variant="outline" className="w-full" onClick={() => leave.mutate()} disabled={leave.isPending}>
          {leave.isPending ? 'Leaving…' : 'Leave waitlist'}
        </Button>
      </div>
    );
  }

  if (cls.isFull) {
    return (
      <>
        <Button size={size} className="w-full" onClick={() => setConfirmJoin(true)} disabled={!cls.waitlistEnabled}>
          <ListOrdered /> {cls.waitlistEnabled ? `Join waitlist (${cls.waitlistCount} waiting)` : 'Class full'}
        </Button>
        <ConfirmDialog
          open={confirmJoin} onClose={() => setConfirmJoin(false)} onConfirm={() => join.mutate()}
          title="Join the waitlist?" confirmLabel="Join waitlist" busy={join.isPending}
        >
          <p><strong className="text-foreground">{cls.title}</strong> is full right now ({fmtDateTime(cls.startTime)}).</p>
          <p className="mt-2">You will be position #{cls.waitlistCount + 1}. If anyone cancels, the seat is yours automatically — we will notify you instantly, no refresh needed.</p>
        </ConfirmDialog>
      </>
    );
  }

  return (
    <>
      <Button size={size} className="w-full" onClick={() => setConfirmBook(true)}>
        <Ticket /> Book this class — {cls.availableSeats} spot{cls.availableSeats === 1 ? '' : 's'} left
      </Button>
      <ConfirmDialog
        open={confirmBook} onClose={() => setConfirmBook(false)} onConfirm={() => book.mutate()}
        title="Confirm your booking" confirmLabel="Confirm booking" busy={book.isPending}
      >
        <p><strong className="text-foreground">{cls.title}</strong> · {fmtDateTime(cls.startTime)}</p>
        <p className="mt-2">Free cancellation up to {cls.cancellationDeadlineHours} hours before the class starts. {cls.price > 0 ? `Pay Rs ${Number(cls.price).toLocaleString()} at the studio.` : 'This class is free.'}</p>
      </ConfirmDialog>
    </>
  );
}
