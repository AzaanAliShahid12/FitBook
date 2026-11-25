import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

/** Keeps the UI live: seat counts, waitlist positions and notifications update without a refresh. */
export function useRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onAvailability = (payload: { classId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class', payload.classId] });
      queryClient.invalidateQueries({ queryKey: ['availability', payload.classId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    };
    const onNotification = (n: { type: string; title: string; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (n.type === 'WAITLIST_PROMOTED') {
        toast({ variant: 'success', title: 'You got the spot!', description: n.message });
      }
    };
    const onPromoted = () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-waitlist'] });
    };
    const onPosition = () => queryClient.invalidateQueries({ queryKey: ['my-waitlist'] });

    socket.on('class:availabilityUpdated', onAvailability);
    socket.on('class:bookingConfirmed', onAvailability);
    socket.on('class:bookingCancelled', onAvailability);
    socket.on('class:capacityChanged', onAvailability);
    socket.on('notification:new', onNotification);
    socket.on('waitlist:promoted', onPromoted);
    socket.on('waitlist:positionUpdated', onPosition);
    socket.on('waitlist:joined', onAvailability);
    return () => {
      socket.off('class:availabilityUpdated', onAvailability);
      socket.off('class:bookingConfirmed', onAvailability);
      socket.off('class:bookingCancelled', onAvailability);
      socket.off('class:capacityChanged', onAvailability);
      socket.off('notification:new', onNotification);
      socket.off('waitlist:promoted', onPromoted);
      socket.off('waitlist:positionUpdated', onPosition);
      socket.off('waitlist:joined', onAvailability);
    };
  }, [user, queryClient, toast]);
}
