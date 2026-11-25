import { Link } from 'react-router-dom';
import { ListOrdered } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyWaitlist } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError } from '@/lib/api';
import { fmtDateTime } from '@/lib/time';
import type { WaitlistEntry } from '@/types';

const statusBadge = (e: WaitlistEntry) => {
  switch (e.status) {
    case 'WAITING': return <Badge variant="amber">Waiting</Badge>;
    case 'PROMOTED': return <Badge variant="lime">Promoted — booked!</Badge>;
    case 'EXPIRED': return <Badge variant="zinc">Expired</Badge>;
    default: return <Badge variant="red">Cancelled</Badge>;
  }
};

export default function MyWaitlist() {
  const { data, isLoading } = useMyWaitlist();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const leave = useMutation({
    mutationFn: (entryId: string) => api.delete(`/waitlist/${entryId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({ variant: 'success', title: 'Left the waitlist' });
    },
    onError: (e) => toast({ variant: 'error', title: 'Could not leave', description: apiError(e) }),
  });

  const active = (data ?? []).filter((e) => e.status === 'WAITING');
  const past = (data ?? []).filter((e) => e.status !== 'WAITING');

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black tracking-tight">My waitlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">Positions update live. When a seat opens, the first in line is promoted automatically — no action needed from you.</p>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <><Skeleton className="h-32" /><Skeleton className="h-32" /></>
        ) : active.length === 0 ? (
          <EmptyState
            icon={<ListOrdered className="h-7 w-7" />}
            title="You are not on any waitlist"
            description="When a class you want is full, join its waitlist and we will hold your place in line."
            actionLabel="Find a class"
            onAction={() => { window.location.href = '/explore'; }}
          />
        ) : (
          active.map((e) => (
            <Card key={e.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-zinc-900 text-lime-400 dark:bg-zinc-800">
                  <span className="text-lg font-black leading-none">#{e.position}</span>
                  <span className="text-[10px] font-semibold uppercase">position</span>
                </span>
                <img src={e.fitnessClass?.image || ''} alt="" className="hidden h-16 w-24 rounded-xl object-cover sm:block" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/classes/${e.classId}`} className="font-bold hover:underline">{e.fitnessClass?.title}</Link>
                  {statusBadge(e)}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fmtDateTime(e.fitnessClass?.startTime ?? '')} · {e.fitnessClass?.instructor?.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.peopleAhead === 0 ? 'You are next in line — any cancellation promotes you.' : `${e.peopleAhead} ${e.peopleAhead === 1 ? 'person' : 'people'} ahead of you`} · {e.totalWaiting} on this waitlist in total
                </p>
              </div>
              <Button variant="outline" className="shrink-0 text-red-600 hover:text-red-700" onClick={() => leave.mutate(e.id)} disabled={leave.isPending}>
                Leave waitlist
              </Button>
            </Card>
          ))
        )}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-bold">History</h2>
          <div className="mt-3 space-y-3">
            {past.map((e) => (
              <Card key={e.id} className="flex flex-wrap items-center gap-3 p-4 opacity-80">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{e.fitnessClass?.title}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(e.fitnessClass?.startTime ?? '')} · Joined {fmtDateTime(e.joinedAt)}</p>
                </div>
                {statusBadge(e)}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
