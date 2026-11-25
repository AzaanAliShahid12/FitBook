import { useState } from 'react';
import { Ban, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClasses } from '@/hooks/useData';
import { ClassFormDialog, formToPayload, type ClassFormData } from './ClassForm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError } from '@/lib/api';
import { fmtDate, fmtTime } from '@/lib/time';
import type { FitnessClass } from '@/types';

const statusVariant = (s: FitnessClass['status']) =>
  s === 'PUBLISHED' ? 'lime' : s === 'CANCELLED' ? 'red' : s === 'DRAFT' ? 'amber' : 'sky';

export default function ManageClasses() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FitnessClass | null>(null);
  const [cancelling, setCancelling] = useState<FitnessClass | null>(null);
  const [deleting, setDeleting] = useState<FitnessClass | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useClasses({ search: search || undefined, status: status || undefined, page, limit: 10, sort: 'date_asc' }, true);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const save = useMutation({
    mutationFn: async (form: ClassFormData) => {
      const payload = formToPayload(form);
      if (editing) return api.put(`/classes/${editing.id}`, payload);
      return api.post('/classes', payload);
    },
    onSuccess: (res) => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
      toast({
        variant: 'success',
        title: editing ? 'Class updated' : 'Class created',
        description: !editing && Array.isArray(res.data.data) && res.data.data.length > 1 ? `${res.data.data.length} weekly sessions were created.` : undefined,
      });
    },
    onError: (e) => toast({ variant: 'error', title: 'Could not save class', description: apiError(e) }),
  });

  const cancelClass = useMutation({
    mutationFn: (id: string) => api.post(`/classes/${id}/cancel`),
    onSuccess: (res) => {
      invalidate();
      setCancelling(null);
      toast({ variant: 'success', title: 'Class cancelled', description: `${res.data.data.releasedBookings} bookings released, ${res.data.data.expiredWaitlist} waitlist entries closed. Members were notified.` });
    },
    onError: (e) => { setCancelling(null); toast({ variant: 'error', title: 'Could not cancel class', description: apiError(e) }); },
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); toast({ variant: 'success', title: 'Class deleted' }); },
    onError: (e) => { setDeleting(null); toast({ variant: 'error', title: 'Could not delete class', description: apiError(e) }); },
  });

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Manage classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, edit, publish and cancel classes. Instructor and room conflicts are checked automatically.</p>
        </div>
        <Button size="lg" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Create class</Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search classes…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select className="w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </Select>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></>
        ) : (data?.data.length ?? 0) === 0 ? (
          <EmptyState icon={<Plus className="h-7 w-7" />} title="No classes found" description="Create your first class or adjust the filters." actionLabel="Create class" onAction={() => { setEditing(null); setFormOpen(true); }} />
        ) : (
          data!.data.map((c) => (
            <Card key={c.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
              <img src={c.image || ''} alt="" className="h-24 w-full rounded-xl object-cover lg:w-40" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{c.title}</p>
                  <Badge variant={statusVariant(c.status) as never}>{c.status}</Badge>
                  <Badge variant="zinc">{c.category?.name}</Badge>
                  {c.isRecurring && <Badge variant="violet">Recurring</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fmtDate(c.startTime)} · {fmtTime(c.startTime)} – {fmtTime(c.endTime)} · {c.instructor?.name} · {c.room?.name || 'No room'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.confirmedCount}/{c.capacity} booked · {c.waitlistCount} on waitlist · {c.price > 0 ? `Rs ${Number(c.price).toLocaleString()}` : 'Free'} · Cancel up to {c.cancellationDeadlineHours}h before
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil /> Edit</Button>
                {c.status !== 'CANCELLED' && (
                  <Button variant="outline" size="sm" className="text-amber-700 hover:text-amber-800" onClick={() => setCancelling(c)}><Ban /> Cancel class</Button>
                )}
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleting(c)}><Trash2 /> Delete</Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {data.pagination.totalPages}</span>
          <Button variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <ClassFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} initial={editing} onSubmit={(d) => save.mutate(d)} busy={save.isPending} />

      <ConfirmDialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} onConfirm={() => cancelling && cancelClass.mutate(cancelling.id)}
        title="Cancel this class?" confirmLabel="Yes, cancel class" destructive busy={cancelClass.isPending}>
        {cancelling && <p>All {cancelling.confirmedCount} confirmed bookings for <strong className="text-foreground">{cancelling.title}</strong> will be released and {cancelling.waitlistCount} waitlist entries closed. Every affected member is notified immediately.</p>}
      </ConfirmDialog>

      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteClass.mutate(deleting.id)}
        title="Delete this class?" confirmLabel="Delete permanently" destructive busy={deleteClass.isPending}>
        {deleting && <p><strong className="text-foreground">{deleting.title}</strong> will be removed permanently. Classes with booking history cannot be deleted — cancel them instead.</p>}
      </ConfirmDialog>
    </div>
  );
}
