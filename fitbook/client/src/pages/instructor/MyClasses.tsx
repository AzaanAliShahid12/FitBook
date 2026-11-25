import { useState } from 'react';
import { ChevronDown, ClipboardCheck, Dumbbell, ListOrdered, Users } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClassBookings, useClassWaitlist, useInstructorClasses } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError } from '@/lib/api';
import { fmtDate, fmtTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Attendance, FitnessClass } from '@/types';

const ATTENDANCE_OPTIONS: Attendance['status'][] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

function ClassPanel({ cls }: { cls: FitnessClass }) {
  const [open, setOpen] = useState(false);
  const { data: bookings, isLoading } = useClassBookings(open ? cls.id : undefined);
  const { data: waitlist } = useClassWaitlist(open ? cls.id : undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mark = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: Attendance['status'] }) =>
      api.post('/instructor/attendance', { bookingId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-bookings', cls.id] });
      queryClient.invalidateQueries({ queryKey: ['instructor-stats'] });
      toast({ variant: 'success', title: 'Attendance saved' });
    },
    onError: (e) => toast({ variant: 'error', title: 'Could not save attendance', description: apiError(e) }),
  });

  const confirmed = (bookings ?? []).filter((b) => b.status === 'CONFIRMED');
  const waiting = (waitlist ?? []).filter((w) => w.status === 'WAITING');

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-secondary/40 sm:flex-row sm:items-center">
        <img src={cls.image || ''} alt="" className="h-20 w-full rounded-xl object-cover sm:w-32" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{cls.title}</p>
            <Badge variant="zinc">{cls.category?.name}</Badge>
            {cls.status === 'CANCELLED' ? <Badge variant="red">Cancelled</Badge> : cls.status === 'DRAFT' ? <Badge variant="amber">Draft</Badge> : <Badge variant="lime">{cls.status.toLowerCase()}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtDate(cls.startTime)} · {fmtTime(cls.startTime)} – {fmtTime(cls.endTime)} · {cls.room?.name} · Capacity {cls.capacity}
          </p>
        </div>
        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Users className="h-4 w-4" /> Participants
          <ChevronDown className={cn('h-5 w-5 transition', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="border-t p-4">
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <ClipboardCheck className="h-4 w-4" /> Participants & attendance ({confirmed.length})
                </h3>
                {confirmed.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No confirmed participants yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {confirmed.map((b) => (
                      <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5">
                        <Avatar name={b.user?.name ?? 'Member'} src={b.user?.profileImage} className="h-9 w-9 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{b.user?.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{b.user?.email} · Ref {b.bookingReference}</p>
                        </div>
                        <div className="flex gap-1">
                          {ATTENDANCE_OPTIONS.map((s) => (
                            <button
                              key={s}
                              onClick={() => mark.mutate({ bookingId: b.id, status: s })}
                              disabled={mark.isPending}
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[11px] font-bold transition',
                                b.attendance?.status === s
                                  ? s === 'PRESENT' ? 'bg-lime-500 text-zinc-950'
                                    : s === 'ABSENT' ? 'bg-red-500 text-white'
                                    : s === 'LATE' ? 'bg-amber-500 text-zinc-950'
                                    : 'bg-sky-500 text-white'
                                  : 'bg-secondary text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <ListOrdered className="h-4 w-4" /> Waitlist ({waiting.length})
                </h3>
                {waiting.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Nobody is waiting for this class.</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {waiting.map((w) => (
                      <li key={w.id} className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-lime-400 dark:bg-zinc-800">{w.position}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{w.user?.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{w.user?.email}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <Button variant="outline" className="mt-4 w-full" onClick={() => setOpen(false)}>Close panel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function InstructorClasses() {
  const { data: classes, isLoading } = useInstructorClasses();
  const sorted = [...(classes ?? [])].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black tracking-tight">My classes</h1>
      <p className="mt-1 text-sm text-muted-foreground">Open a class to see participants, the waitlist and to mark attendance.</p>
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></>
        ) : sorted.length === 0 ? (
          <EmptyState icon={<Dumbbell className="h-7 w-7" />} title="No classes assigned yet" description="An admin will assign classes to you. They will appear here with their participants." />
        ) : (
          sorted.map((c) => <ClassPanel key={c.id} cls={c} />)
        )}
      </div>
    </div>
  );
}
