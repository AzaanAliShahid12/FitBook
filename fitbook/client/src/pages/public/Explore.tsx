import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Search, SlidersHorizontal, Dumbbell } from 'lucide-react';
import { useCategories, useClasses, useInstructors } from '@/hooks/useData';
import { ClassCard } from '@/components/ClassCard';
import { ClassCardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fmtDate, fmtTime } from '@/lib/time';
import { AvailabilityMeter, seatsBadge } from '@/components/AvailabilityMeter';
import { Link } from 'react-router-dom';

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const { data: categories } = useCategories();
  const { data: instructors } = useInstructors();

  const filters = useMemo(() => ({
    search: params.get('q') || undefined,
    categoryId: params.get('category') || undefined,
    instructorId: params.get('instructor') || undefined,
    date: params.get('date') || undefined,
    availability: params.get('availability') || undefined,
    difficulty: params.get('difficulty') || undefined,
    sort: params.get('sort') || 'date_asc',
    page, limit: 12,
  }), [params, page]);

  const { data, isLoading } = useClasses(filters);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
    setPage(1);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Explore classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live availability — seats update in real time as people book and cancel.</p>
        </div>
        <div className="flex overflow-hidden rounded-lg border">
          <button onClick={() => setView('grid')} className={cn('p-2.5', view === 'grid' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-muted-foreground')} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setView('list')} className={cn('p-2.5', view === 'list' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-muted-foreground')} aria-label="List view"><List className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => set('category', '')}
          className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition', !filters.categoryId ? 'border-lime-500 bg-lime-500 text-zinc-950' : 'hover:border-lime-500')}
        >All</button>
        {(categories ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => set('category', c.id)}
            className={cn('flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition', filters.categoryId === c.id ? 'border-lime-500 bg-lime-500 text-zinc-950' : 'hover:border-lime-500')}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} /> {c.name}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search classes…" className="pl-9" value={filters.search ?? ''} onChange={(e) => set('q', e.target.value)} />
        </div>
        <Input type="date" value={filters.date ?? ''} onChange={(e) => set('date', e.target.value)} aria-label="Filter by date" />
        <Select value={filters.instructorId ?? ''} onChange={(e) => set('instructor', e.target.value)} aria-label="Filter by instructor">
          <option value="">All instructors</option>
          {(instructors ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
        <Select value={filters.availability ?? ''} onChange={(e) => set('availability', e.target.value)} aria-label="Filter by availability">
          <option value="">Any availability</option>
          <option value="available">Seats available</option>
          <option value="full">Full classes</option>
          <option value="waitlist">Waitlist open</option>
        </Select>
        <Select value={filters.sort ?? 'date_asc'} onChange={(e) => set('sort', e.target.value)} aria-label="Sort classes">
          <option value="date_asc">Soonest first</option>
          <option value="date_desc">Latest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="popular">Most popular</option>
        </Select>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <ClassCardSkeleton key={i} />)}</div>
        ) : (data?.data.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Dumbbell className="h-7 w-7" />}
            title="No classes match your filters"
            description="Try a different date, category or instructor — new classes are added regularly."
            actionLabel="Clear filters"
            onAction={() => { setParams({}); setPage(1); }}
          />
        ) : view === 'grid' ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data!.data.map((cls) => <ClassCard key={cls.id} cls={cls} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {data!.data.map((cls) => (
              <Link key={cls.id} to={`/classes/${cls.id}`} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 transition hover:shadow-md sm:flex-row sm:items-center">
                <img src={cls.image || ''} alt={cls.title} className="h-28 w-full rounded-xl object-cover sm:w-44" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{cls.title}</h3>
                    {seatsBadge(cls)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{fmtDate(cls.startTime)} · {fmtTime(cls.startTime)} · {cls.duration} min · {cls.instructor?.name} · {cls.room?.name}</p>
                  <div className="mt-3 max-w-md"><AvailabilityMeter cls={cls} /></div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black">{cls.price > 0 ? `Rs ${Number(cls.price).toLocaleString()}` : 'Free'}</p>
                  <p className="text-xs text-muted-foreground">{cls.category?.name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {data.pagination.totalPages}</span>
          <Button variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" /> Availability is live — this page updates automatically when seats open or fill.
      </p>
    </div>
  );
}
