import { useState } from 'react';
import { GraduationCap, Plus, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInstructors } from '@/hooks/useData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Avatar } from '@/components/Avatar';
import { FieldError } from '@/components/AuthShell';
import { useToast } from '@/contexts/ToastContext';
import { api, apiError } from '@/lib/api';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  experienceYears: z.coerce.number().int().min(0).max(60),
});
type FormData = z.infer<typeof schema>;

export default function AdminInstructors() {
  const [open, setOpen] = useState(false);
  const { data: instructors, isLoading } = useInstructors();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { experienceYears: 1 },
  });

  const create = useMutation({
    mutationFn: (d: FormData) => api.post('/instructors', {
      name: d.name, email: d.email, password: d.password, phone: d.phone || undefined,
      bio: d.bio || undefined, experienceYears: d.experienceYears,
      specialties: (d.specialties ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setOpen(false); reset();
      toast({ variant: 'success', title: 'Instructor added', description: 'They can log in with the email and password you set.' });
    },
    onError: (e) => toast({ variant: 'error', title: 'Could not add instructor', description: apiError(e) }),
  });

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Instructors</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your coaching team. Instructors see only their own classes, participants and attendance.</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}><Plus /> Add instructor</Button>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56" />)
        ) : (instructors?.length ?? 0) === 0 ? (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="No instructors yet" description="Add your first instructor to start assigning classes." actionLabel="Add instructor" onAction={() => setOpen(true)} />
          </div>
        ) : (
          instructors!.map((i) => (
            <Card key={i.id} className="p-6">
              <div className="flex items-start gap-4">
                <Avatar name={i.name} src={i.profileImage} className="h-14 w-14 text-base" />
                <div className="min-w-0">
                  <p className="font-bold leading-tight">{i.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{i.email}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600">
                    <Star className="h-3.5 w-3.5" fill="currentColor" /> {i.instructorProfile?.rating?.toFixed(1) ?? 'New'} · {i.instructorProfile?.experienceYears ?? 0} yrs experience
                  </p>
                </div>
              </div>
              {i.instructorProfile?.bio && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{i.instructorProfile.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(i.instructorProfile?.specialties ?? []).map((s) => <Badge key={s} variant="lime">{s}</Badge>)}
              </div>
              <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
                <span className="font-black text-foreground">{i._count?.classesTeaching ?? 0}</span> classes assigned
              </p>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add instructor">
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input className="mt-1.5" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" className="mt-1.5" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input type="password" className="mt-1.5" {...register('password')} />
            <FieldError message={errors.password?.message} />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input className="mt-1.5" {...register('phone')} />
          </div>
          <div>
            <Label>Experience (years)</Label>
            <Input type="number" className="mt-1.5" {...register('experienceYears')} />
          </div>
          <div>
            <Label>Specialties (comma separated)</Label>
            <Input className="mt-1.5" placeholder="Yoga, Pilates" {...register('specialties')} />
          </div>
          <div className="sm:col-span-2">
            <Label>Bio</Label>
            <Textarea className="mt-1.5" {...register('bio')} />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={create.isPending}>{create.isPending ? 'Adding…' : 'Add instructor'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
