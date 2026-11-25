import { useAnalytics } from '@/hooks/useData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent><div className="h-72">{children}</div></CardContent>
    </Card>
  );
}

const tooltipStyle = { borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: 13 };

export default function AdminAnalytics() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>;
  }

  const conversion = [
    { name: 'Promoted', value: data.totals.activeWaitlists + Math.round(data.totals.activeWaitlists * (data.promotionRate / 100)) },
    { name: 'Still waiting', value: data.totals.activeWaitlists },
  ];
  void conversion;

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Real numbers from the live database — occupancy {data.occupancyRate}%, waitlist promotion rate {data.promotionRate}%.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Booking trend (14 days)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.bookingTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" name="Bookings" stroke="#84cc16" fill="#84cc16" fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cancellations vs waitlist joins (14 days)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.cancellationTrend.map((c, i) => ({ date: c.date, cancellations: c.count, waitlistJoins: data.waitlistTrend[i]?.count ?? 0 }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="cancellations" name="Cancellations" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="waitlistJoins" name="Waitlist joins" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Classes by category">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.categoryDistribution} dataKey="classes" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {data.categoryDistribution.map((c) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Capacity utilisation by class">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.capacityUtilization} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="title" tick={{ fontSize: 12 }} width={110} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Utilisation']} />
              <Bar dataKey="utilization" name="Utilisation" fill="#84cc16" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Weekly attendance (present, last 7 days)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.weeklyAttendance}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Present" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader><CardTitle>Instructor performance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.instructorPerformance.length === 0 && <p className="text-sm text-muted-foreground">No instructor data yet.</p>}
            {data.instructorPerformance.map((i) => (
              <div key={i.instructorId} className="flex items-center justify-between rounded-xl border px-4 py-3">
                <p className="font-semibold">{i.name}</p>
                <p className="text-sm text-muted-foreground"><span className="font-black text-foreground">{i.classes}</span> classes taught/scheduled</p>
              </div>
            ))}
            <div className="rounded-xl bg-lime-500/10 px-4 py-3 text-sm">
              <p className="font-bold">Waitlist health</p>
              <p className="mt-0.5 text-muted-foreground">
                {data.totals.activeWaitlists} members are waiting right now, and {data.promotionRate}% of resolved waitlist entries ended in a promotion — freed seats are being refilled, not wasted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
