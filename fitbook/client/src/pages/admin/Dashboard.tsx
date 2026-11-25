import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarDays, ListOrdered, TrendingUp, Users, XCircle, GraduationCap, Dumbbell } from 'lucide-react';
import { useAnalytics, useClasses } from '@/hooks/useData';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityMeter } from '@/components/AvailabilityMeter';
import { fmtDate, fmtTime } from '@/lib/time';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useAnalytics();
  const { data: upcoming } = useClasses({ limit: 5, sort: 'date_asc' }, true);
  const t = analytics?.totals;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">The whole studio at a glance — bookings, waitlists and occupancy in real time.</p>
      </div>

      {isLoading || !t ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon={<Users className="h-5 w-5" />} label="Total members" value={t.totalMembers} />
            <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Instructors" value={t.totalInstructors} />
            <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Total bookings" value={t.totalBookings} sub={`${t.cancelledBookings} cancelled`} />
            <StatCard icon={<ListOrdered className="h-5 w-5" />} label="Active waitlists" value={t.activeWaitlists} sub={`${analytics.promotionRate}% promotion rate`} />
            <StatCard icon={<Dumbbell className="h-5 w-5" />} label="Total classes" value={t.totalClasses} />
            <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Upcoming classes" value={t.upcomingClasses} />
            <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Occupancy rate" value={`${analytics.occupancyRate}%`} sub="Average fill across classes" />
            <StatCard icon={<XCircle className="h-5 w-5" />} label="Cancelled bookings" value={t.cancelledBookings} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Booking trend — last 14 days</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.bookingTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                      <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" name="Bookings" stroke="#84cc16" fill="#84cc16" fillOpacity={0.25} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Most popular classes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {analytics.popularClasses.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
                {analytics.popularClasses.map((p, i) => (
                  <div key={p.classId} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-lime-400 dark:bg-zinc-800">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.bookings} confirmed bookings</p>
                    </div>
                  </div>
                ))}
                <Link to="/admin/analytics" className="inline-block pt-1 text-sm font-semibold text-lime-700 hover:underline dark:text-lime-400">Full analytics →</Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Next classes on the schedule</CardTitle>
              <Link to="/admin/classes" className="text-sm font-semibold text-lime-700 hover:underline dark:text-lime-400">Manage classes</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(upcoming?.data ?? []).map((c) => (
                <div key={c.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{c.title}</p>
                      {c.isFull ? <Badge variant="amber">Full</Badge> : <Badge variant="lime">{c.availableSeats} seats left</Badge>}
                      {c.waitlistCount > 0 && <Badge variant="zinc">{c.waitlistCount} waiting</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{fmtDate(c.startTime)} · {fmtTime(c.startTime)} · {c.instructor?.name}</p>
                  </div>
                  <div className="w-full max-w-xs"><AvailabilityMeter cls={c} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
