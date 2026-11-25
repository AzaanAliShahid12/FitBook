import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, Dumbbell, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorClasses, useInstructorStats } from '@/hooks/useData';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { AvailabilityMeter } from '@/components/AvailabilityMeter';
import { fmtDate, fmtTime } from '@/lib/time';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { data: stats } = useInstructorStats();
  const { data: classes, isLoading } = useInstructorClasses();
  const upcoming = (classes ?? []).filter((c) => new Date(c.startTime).getTime() >= Date.now() && c.status === 'PUBLISHED');

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Welcome, Coach {user?.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your classes, participants and attendance — all in one place.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={<Dumbbell className="h-5 w-5" />} label="Total classes" value={stats?.totalClasses ?? '—'} />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Upcoming sessions" value={stats?.upcomingClasses ?? '—'} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Confirmed participants" value={stats?.totalParticipants ?? '—'} sub="Across all your classes" />
        <StatCard icon={<ClipboardCheck className="h-5 w-5" />} label="Attendance marked" value={stats?.attendanceMarked ?? '—'} sub="Records you have taken" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Your upcoming sessions</CardTitle>
          <Link to="/instructor/classes" className="text-sm font-semibold text-lime-700 hover:underline dark:text-lime-400">Manage classes</Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <><Skeleton className="h-24" /><Skeleton className="h-24" /></>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={<Dumbbell className="h-7 w-7" />} title="No upcoming sessions" description="When an admin schedules classes for you, they will appear here." />
          ) : (
            upcoming.slice(0, 5).map((c) => (
              <Link key={c.id} to="/instructor/classes" className="flex flex-col gap-3 rounded-2xl border p-4 transition hover:shadow-md sm:flex-row sm:items-center">
                <img src={c.image || ''} alt="" className="h-20 w-full rounded-xl object-cover sm:w-32" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{c.title}</p>
                    <Badge variant="zinc">{c.category?.name}</Badge>
                    {(c._count?.waitlistEntries ?? 0) > 0 && <Badge variant="amber">{c._count?.waitlistEntries} waitlisted</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{fmtDate(c.startTime)} · {fmtTime(c.startTime)} · {c.room?.name}</p>
                  <div className="mt-2.5 max-w-sm">
                    <AvailabilityMeter cls={{ ...c, confirmedCount: c._count?.bookings ?? 0, waitlistCount: c._count?.waitlistEntries ?? 0, availableSeats: c.capacity - (c._count?.bookings ?? 0), isFull: (c._count?.bookings ?? 0) >= c.capacity }} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
