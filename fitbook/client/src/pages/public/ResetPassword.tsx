import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthShell, FieldError } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { api, apiError } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password: data.password, confirmPassword: data.confirmPassword });
      setDone(true);
    } catch (e) { setError(apiError(e, 'This reset link is invalid or has expired')); }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you have not used before.">
      {!token ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10">This page needs a reset link. Request one from the forgot password page.</p>
      ) : done ? (
        <div className="rounded-2xl border bg-lime-500/10 p-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-lime-600" />
          <p className="mt-3 font-semibold">Password updated</p>
          <p className="mt-1 text-sm text-muted-foreground">You can now log in with your new password.</p>
          <Link to="/login"><Button className="mt-4">Go to login</Button></Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" className="mt-1.5" {...register('password')} />
            <FieldError message={errors.password?.message} />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type="password" className="mt-1.5" {...register('confirmPassword')} />
            <FieldError message={errors.confirmPassword?.message} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Updating…' : 'Reset password'}</Button>
        </form>
      )}
    </AuthShell>
  );
}
