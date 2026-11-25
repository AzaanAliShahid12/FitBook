import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CheckCircle2, ListOrdered, Sparkles, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses, useMyBookings, useMyWaitlist, useNotifications } from '@/hooks/useData';
import { StatCard } from '@/components/StatCard';
import { ClassCard } from '@/components/ClassCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton, ClassCardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { fmtDate, fmtDateTime, fmtTime, todayKey } from '@/lib/time';
import { cn } from '@/lib/utils';

export default function MemberDashboard() {
  const { user } = useAuth();
  const { data: bookings, isLoading: bookingsLoading } = useMyBookings('CONFIRMED', 1, 100);
  const { data: allBookings } = useMyBookings(undefined, 1, 100);
  const { data: waitlist } = useMyWaitlist();
  const { data: notifications } = useNotifications(1, 5);
  const { data: recommended, isLoading: recLoading } = useClasses({ limit: 3, sort: 'popular', availability: 'available' });

  const now = Date.now();
  const upcoming = (bookings?.data ?? []).filter((b) => new Date(b.fitnessClass?.startTime ?? '').getTime() >= now);
  const completed = (allBookings?.data ?? []).filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.fitnessClass?.startTime ?? '').getTime() < now
  ).length;
  const activeWaitlist = (waitlist ?? []).filter((w) => w.status === 'WAITING');
  const monthBookings = (allBookings?.data ?? []).filter((b) => b.bookedAt.slice(0, 7) === todayKey().slice(0, 7)).length;

  // Weekly strip (next 7 days) with booking dots
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const count = upcoming.filter((b) => (b.fitnessClass?.startTime ?? '').slice(0, 10) === key).length;
    return { key, label: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }), day: d.getUTCDate(), count, isToday: i === 0 };
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Assalam-o-Alaikum, {user?.name.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is your training at a glance. Seats and waitlist positions update live.</p>
        </div>
        <Link to="/explore"><Button size="lg"><Ticket /> Quick book a class</Button></Link>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Upcoming classes" value={upcoming.length} sub="Confirmed & ahead of you" />
        <StatCard icon={<Ticket className="h-5 w-5" />} label="Bookings this month" value={monthBookings} sub="Keep the streak going" />
        <StatCard icon={<ListOrdered className="h-5 w-5" />} label="Waitlist positions" value={activeWaitlist.length} sub={activeWaitlist.length ? `Best position: #${Math.min(...activeWaitlist.map((w) => w.position))}` : 'No active waitlists'} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Classes completed" value={completed} sub="Sessions attended so far" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Upcoming booked classes</CardTitle>
              <Link to="/bookings" className="text-sm font-semibold text-lime-700 hover:underline dark:text-lime-400">View all</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookingsLoading ? (
                <><Skeleton className="h-24" /><Skeleton className="h-24" /></>
              ) : upcoming.length === 0 ? (
                <EmptyState icon={<CalendarCheck className="h-7 w-7" />} title="No upcoming classes" description="Book your next session and it will show up here." actionLabel="Explore classes" onAction={() => { window.location.href = '/explore'; }} />
              ) : (
                upcoming.slice(0, 4).map((b) => (
                  <Link key={b.id} to={`/classes/${b.classId}`} className="flex gap-4 rounded-2xl border p-3.5 transition hover:shadow-md">
                    <img src={b.fitnessClass?.image || ''} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold leading-tight">{b.fitnessClass?.title}</p>
                        <Badge variant="lime">Confirmed</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {fmtDate(b.fitnessClass?.startTime ?? '')} · {fmtTime(b.fitnessClass?.startTime ?? '')} · {b.fitnessClass?.instructor?.name} · {b.fitnessClass?.room?.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Booking ref: <span className="font-semibold text-foreground">{b.bookingReference}</span></p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-lime-600" /> Recommended for you</h2>
              <Link to="/explore" className="flex items-center gap-1 text-sm font-semibold text-lime-700 hover:underline dark:text-lime-400">Explore <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {recLoading
                ? Array.from({ length: 3 }).map((_, i) => <ClassCardSkeleton key={i} />)
                : (recommended?.data ?? []).map((cls) => <ClassCard key={cls.id} cls={cls} />)}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Your week</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {week.map((d) => (
                  <div key={d.key} className={cn('rounded-xl py-2.5', d.isToday ? 'bg-lime-500 text-zinc-950' : 'bg-secondary/70')}>
                    <p className="text-[11px] font-semibold uppercase">{d.label}</p>
                    <p className="text-base font-black leading-tight">{d.day}</p>
                    <p className={cn('mx-auto mt-1 h-1.5 w-1.5 rounded-full', d.count ? (d.isToday ? 'bg-zinc-950' : 'bg-lime-500') : 'bg-transparent')} />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">Dots mark days with booked classes.</p>
            </CardContent>
          </Card>

          {activeWaitlist.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Waitlist watch</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {activeWaitlist.map((w) => (
                  <Link key={w.id} to={`/classes/${w.classId}`} className="block rounded-xl border p-3.5 transition hover:shadow-sm">
                    <p className="text-sm font-bold leading-tight">{w.fitnessClass?.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{fmtDateTime(w.fitnessClass?.startTime ?? '')}</p>
                    <p className="mt-2 inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                      Position #{w.position} · {w.peopleAhead} ahead of you
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Recent activity</CardTitle>
              <Link to="/notifications" className="text-sm font-semibold text-lime-700 hover:underline dark:text-lime-400">All</Link>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {(notifications?.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No activity yet — your booking updates will appear here.</p>}
              {(notifications?.data ?? []).map((n) => (
                <div key={n.id} className="flex gap-3">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-lime-500')} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{n.title}</p>
                    <p className="line-clamp-2 text-[13px] text-muted-foreground">{n.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
