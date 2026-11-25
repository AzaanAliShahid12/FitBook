import { useState } from 'react';
import { CalendarCheck, ClipboardCheck, Download, ListOrdered, ScrollText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { api, tokenStore } from '@/lib/api';
import { fmtDateTime } from '@/lib/time';

type ReportKind = 'bookings' | 'waitlists' | 'attendance';

async function downloadReport(kind: ReportKind, from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/reports/${kind}?${params}`, {
    headers: { Authorization: `Bearer ${tokenStore.access}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `fitbook-${kind}-report.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => (await api.get('/admin/audit-logs', { params: { limit: 15 } })).data.data as {
      id: string; action: string; entity: string; createdAt: string;
      user?: { name: string; role: string } | null;
    }[],
  });

  const reports: { kind: ReportKind; title: string; description: string; icon: React.ReactNode }[] = [
    { kind: 'bookings', title: 'Bookings report', description: 'Every booking with member, class, reference, status and timestamps.', icon: <CalendarCheck className="h-6 w-6" /> },
    { kind: 'waitlists', title: 'Waitlist report', description: 'All waitlist entries with positions, statuses and promotion times.', icon: <ListOrdered className="h-6 w-6" /> },
    { kind: 'attendance', title: 'Attendance report', description: 'Attendance records marked by instructors, per member and class.', icon: <ClipboardCheck className="h-6 w-6" /> },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black tracking-tight">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">Export studio data as CSV for your records, in Excel/Sheets-ready format.</p>

      <Card className="mt-6 flex flex-wrap items-end gap-4 p-5">
        <div>
          <Label>From date</Label>
          <Input type="date" className="mt-1.5" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To date</Label>
          <Input type="date" className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="pb-2 text-sm text-muted-foreground">Leave dates empty to export everything.</p>
      </Card>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.kind} className="p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 dark:text-lime-400">{r.icon}</span>
            <h2 className="mt-4 font-bold">{r.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
            <Button className="mt-5 w-full" variant="outline" onClick={() => downloadReport(r.kind, from, to)}><Download /> Download CSV</Button>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h2 className="flex items-center gap-2 font-bold"><ScrollText className="h-5 w-5 text-lime-600" /> Audit log — latest admin activity</h2>
        <div className="mt-4 space-y-2">
          {(auditLogs ?? []).length === 0 && <p className="text-sm text-muted-foreground">No audit entries yet. Admin actions like creating classes, promotions and cancellations are recorded here.</p>}
          {(auditLogs ?? []).map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm">
              <p>
                <span className="font-bold">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground"> · {log.entity}</span>
              </p>
              <p className="text-xs text-muted-foreground">{log.user ? `${log.user.name} (${log.user.role.toLowerCase()})` : 'System'} · {fmtDateTime(log.createdAt)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
