import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCategories, useClasses, useInstructors, useMyBookings } from '@/hooks/useData';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtTime, todayKey } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { FitnessClass } from '@/types';

function monthRange(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

export default function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
  const [view, setView] = useState<'month' | 'week'>('month');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  });
  const [categoryId, setCategoryId] = useState('');
  const [instructorId, setInstructorId] = useState('');

  const { data: categories } = useCategories();
  const { data: instructors } = useInstructors();
  const { data: myBookings } = useMyBookings('CONFIRMED', 1, 200);
  const bookedIds = useMemo(() => new Set((myBookings?.data ?? []).map((b) => b.classId)), [myBookings]);

  const range = view === 'month'
    ? monthRange(cursor.year, cursor.month)
    : { from: weekStart, to: new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10) };

  const { data, isLoading } = useClasses({
    dateFrom: range.from, dateTo: range.to, limit: 200,
    categoryId: categoryId || undefined, instructorId: instructorId || undefined, sort: 'date_asc',
  });
  const classes = data?.data ?? [];
  const byDay = useMemo(() => {
    const map = new Map<string, FitnessClass[]>();
    for (const c of classes) {
      const key = c.startTime.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return map;
  }, [classes]);

  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const moveMonth = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };
  const moveWeek = (delta: number) => {
    setWeekStart(new Date(new Date(weekStart).getTime() + delta * 7 * 86400000).toISOString().slice(0, 10));
  };

  // Build month grid cells (Mon-first)
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const startOffset = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(Date.UTC(cursor.year, cursor.month, d)).toISOString().slice(0, 10));
    return out;
  }, [cursor]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => new Date(new Date(weekStart).getTime() + i * 86400000).toISOString().slice(0, 10)),
    [weekStart]
  );

  const classChip = (c: FitnessClass) => (
    <Link
      key={c.id}
      to={`/classes/${c.id}`}
      className="block truncate rounded-md border-l-4 bg-secondary/70 px-1.5 py-1 text-[11px] font-medium leading-tight transition hover:bg-secondary"
      style={{ borderLeftColor: c.category?.color || '#84cc16' }}
      title={`${c.title} — ${fmtTime(c.startTime)}`}
    >
      <span className="font-bold">{fmtTime(c.startTime)}</span> {c.title}
      {bookedIds.has(c.id) && <span className="ml-1 rounded bg-lime-500 px-1 text-[9px] font-bold text-zinc-950">BOOKED</span>}
      {c.isFull && <span className="ml-1 rounded bg-amber-500 px-1 text-[9px] font-bold text-zinc-950">FULL</span>}
    </Link>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every class, colour-coded by category. Tap a class to view details and book.</p>
        </div>
        <div className="inline-flex rounded-xl border bg-card p-1">
          {(['month', 'week'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn('rounded-lg px-4 py-2 text-sm font-semibold capitalize', view === v ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-muted-foreground')}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => (view === 'month' ? moveMonth(-1) : moveWeek(-1))}><ChevronLeft /></Button>
          <p className="min-w-44 text-center font-bold">
            {view === 'month' ? monthLabel : `${weekDays[0]} → ${weekDays[6]}`}
          </p>
          <Button variant="outline" size="icon" onClick={() => (view === 'month' ? moveMonth(1) : moveWeek(1))}><ChevronRight /></Button>
        </div>
        <Select className="w-auto" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select className="w-auto" value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
          <option value="">All instructors</option>
          {(instructors ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
        <div className="ml-auto hidden flex-wrap gap-1.5 md:flex">
          {(categories ?? []).slice(0, 6).map((c) => (
            <Badge key={c.id} variant="zinc"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</Badge>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="mt-5 h-[480px]" />
      ) : view === 'month' ? (
        <div className="mt-5 overflow-hidden rounded-2xl border bg-card">
          <div className="grid grid-cols-7 border-b bg-secondary/60 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <div key={i} className={cn('min-h-[104px] border-b border-r p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0', day === todayKey() && 'bg-lime-500/10')}>
                {day && (
                  <>
                    <p className={cn('px-1 text-xs font-bold', day === todayKey() ? 'text-lime-700 dark:text-lime-400' : 'text-muted-foreground')}>
                      {Number(day.slice(8))}{day === todayKey() ? ' · Today' : ''}
                    </p>
                    <div className="mt-1 space-y-1">
                      {(byDay.get(day) ?? []).slice(0, 3).map(classChip)}
                      {(byDay.get(day) ?? []).length > 3 && (
                        <p className="px-1 text-[11px] font-semibold text-muted-foreground">+{(byDay.get(day) ?? []).length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => (
            <div key={day} className={cn('rounded-2xl border bg-card p-3', day === todayKey() && 'border-lime-500')}>
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {new Date(day).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}
              </p>
              <p className="text-lg font-black leading-tight">{day.slice(8)}</p>
              <div className="mt-2 space-y-1.5">
                {(byDay.get(day) ?? []).length === 0 && <p className="text-xs text-muted-foreground">No classes</p>}
                {(byDay.get(day) ?? []).map(classChip)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
