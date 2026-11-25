import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { FieldError } from '@/components/AuthShell';
import { useCategories, useInstructors, useRooms } from '@/hooks/useData';
import type { FitnessClass } from '@/types';

const schema = z.object({
  title: z.string().min(3, 'At least 3 characters'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Select a category'),
  instructorId: z.string().min(1, 'Select an instructor'),
  roomId: z.string().optional(),
  image: z.string().optional(),
  date: z.string().min(1, 'Pick a date'),
  start: z.string().min(1, 'Start time'),
  end: z.string().min(1, 'End time'),
  capacity: z.coerce.number().int().min(1).max(500),
  price: z.coerce.number().min(0),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  cancellationDeadlineHours: z.coerce.number().int().min(0).max(168),
  waitlistEnabled: z.boolean(),
  waitlistLimit: z.coerce.number().int().min(0).max(1000),
  autoPromote: z.boolean(),
  isRecurring: z.boolean(),
  occurrences: z.coerce.number().int().min(1).max(52),
});
export type ClassFormData = z.infer<typeof schema>;

function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function ClassFormDialog({ open, onClose, initial, onSubmit, busy }: {
  open: boolean;
  onClose: () => void;
  initial?: FitnessClass | null;
  onSubmit: (data: ClassFormData) => void;
  busy: boolean;
}) {
  const { data: categories } = useCategories();
  const { data: instructors } = useInstructors();
  const { data: rooms } = useRooms();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClassFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      difficulty: 'ALL_LEVELS', status: 'PUBLISHED', capacity: 20, price: 0,
      cancellationDeadlineHours: 2, waitlistEnabled: true, waitlistLimit: 50,
      autoPromote: true, isRecurring: false, occurrences: 4,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      reset({
        title: initial.title, description: initial.description ?? '', categoryId: initial.categoryId,
        instructorId: initial.instructorId, roomId: initial.roomId ?? '', image: initial.image ?? '',
        date: initial.date.slice(0, 10), start: toTimeInput(initial.startTime), end: toTimeInput(initial.endTime),
        capacity: initial.capacity, price: Number(initial.price), difficulty: initial.difficulty,
        status: initial.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
        cancellationDeadlineHours: initial.cancellationDeadlineHours, waitlistEnabled: initial.waitlistEnabled,
        waitlistLimit: initial.waitlistLimit, autoPromote: initial.autoPromote, isRecurring: false, occurrences: 1,
      });
    } else {
      reset({
        title: '', description: '', categoryId: '', instructorId: '', roomId: '', image: '',
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), start: '10:00', end: '11:00',
        capacity: 20, price: 0, difficulty: 'ALL_LEVELS', status: 'PUBLISHED',
        cancellationDeadlineHours: 2, waitlistEnabled: true, waitlistLimit: 50, autoPromote: true,
        isRecurring: false, occurrences: 4,
      });
    }
  }, [open, initial, reset]);

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Edit class' : 'Create class'} className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Class name</Label>
          <Input className="mt-1.5" placeholder="e.g. Morning Flow Yoga" {...register('title')} />
          <FieldError message={errors.title?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea className="mt-1.5" placeholder="What is this class about?" {...register('description')} />
        </div>
        <div>
          <Label>Category</Label>
          <Select className="mt-1.5" {...register('categoryId')}>
            <option value="">Select category…</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <FieldError message={errors.categoryId?.message} />
        </div>
        <div>
          <Label>Instructor</Label>
          <Select className="mt-1.5" {...register('instructorId')}>
            <option value="">Select instructor…</option>
            {(instructors ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
          <FieldError message={errors.instructorId?.message} />
        </div>
        <div>
          <Label>Room</Label>
          <Select className="mt-1.5" {...register('roomId')}>
            <option value="">No room</option>
            {(rooms ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </div>
        <div>
          <Label>Image URL</Label>
          <Input className="mt-1.5" placeholder="https://…" {...register('image')} />
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" className="mt-1.5" {...register('date')} />
          <FieldError message={errors.date?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start</Label>
            <Input type="time" className="mt-1.5" {...register('start')} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="time" className="mt-1.5" {...register('end')} />
          </div>
        </div>
        <div>
          <Label>Max capacity</Label>
          <Input type="number" className="mt-1.5" {...register('capacity')} />
          <FieldError message={errors.capacity?.message} />
        </div>
        <div>
          <Label>Price (Rs)</Label>
          <Input type="number" className="mt-1.5" {...register('price')} />
        </div>
        <div>
          <Label>Difficulty</Label>
          <Select className="mt-1.5" {...register('difficulty')}>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="ALL_LEVELS">All levels</option>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select className="mt-1.5" {...register('status')}>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </Select>
        </div>
        <div>
          <Label>Cancellation deadline (hours before)</Label>
          <Input type="number" className="mt-1.5" {...register('cancellationDeadlineHours')} />
        </div>
        <div>
          <Label>Waitlist limit</Label>
          <Input type="number" className="mt-1.5" {...register('waitlistLimit')} />
        </div>
        {!initial && (
          <>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-lime-600" {...register('isRecurring')} /> Weekly recurring class
            </label>
            <div>
              <Label>Occurrences (weeks)</Label>
              <Input type="number" className="mt-1.5" {...register('occurrences')} />
            </div>
          </>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-lime-600" {...register('waitlistEnabled')} /> Waitlist enabled
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-lime-600" {...register('autoPromote')} /> Automatic waitlist promotion
          </label>
        </div>
        <div className="flex gap-3 pt-1 sm:col-span-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create class'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function formToPayload(data: ClassFormData) {
  const [sh, sm] = data.start.split(':').map(Number);
  const [eh, em] = data.end.split(':').map(Number);
  const [y, mo, d] = data.date.split('-').map(Number);
  const startTime = new Date(Date.UTC(y, mo - 1, d, sh, sm)).toISOString();
  const endTime = new Date(Date.UTC(y, mo - 1, d, eh, em)).toISOString();
  return {
    title: data.title,
    description: data.description || undefined,
    categoryId: data.categoryId,
    instructorId: data.instructorId,
    roomId: data.roomId || undefined,
    image: data.image || undefined,
    date: data.date,
    startTime,
    endTime,
    capacity: data.capacity,
    price: data.price,
    difficulty: data.difficulty,
    status: data.status,
    cancellationDeadlineHours: data.cancellationDeadlineHours,
    waitlistEnabled: data.waitlistEnabled,
    waitlistLimit: data.waitlistLimit,
    autoPromote: data.autoPromote,
    isRecurring: data.isRecurring,
    recurrenceRule: data.isRecurring ? `WEEKLY:${data.occurrences}` : undefined,
  };
}
