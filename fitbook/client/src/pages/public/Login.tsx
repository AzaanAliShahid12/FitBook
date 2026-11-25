import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthShell, FieldError } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useAuth, homePathForRole } from '@/contexts/AuthContext';
import { apiError } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

const demoAccounts = [
  { label: 'Member demo', email: 'member@fitbook.app', password: 'Member@123' },
  { label: 'Instructor demo', email: 'sarah@fitbook.app', password: 'Trainer@123' },
  { label: 'Admin demo', email: 'admin@fitbook.app', password: 'Admin@123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const user = await login(data.email, data.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || homePathForRole(user.role), { replace: true });
    } catch (e) {
      setError(apiError(e, 'Invalid email or password'));
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to book classes, manage your waitlist and track your training.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" className="mt-1.5" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" className="mt-1.5" {...register('password')} />
          <FieldError message={errors.password?.message} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 rounded accent-lime-600" {...register('rememberMe')} /> Remember me
          </label>
          <Link to="/forgot-password" className="font-semibold text-lime-700 hover:underline dark:text-lime-400">Forgot password?</Link>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Logging in…' : 'Log in'}</Button>
      </form>

      <div className="mt-6 rounded-2xl border bg-secondary/50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Demo accounts — tap to fill</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {demoAccounts.map((a) => (
            <button
              key={a.email}
              onClick={() => { setValue('email', a.email); setValue('password', a.password); }}
              className="rounded-full border bg-card px-3 py-1.5 text-xs font-semibold hover:border-lime-500"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to FitBook? <Link to="/register" className="font-semibold text-lime-700 hover:underline dark:text-lime-400">Create an account</Link>
      </p>
    </AuthShell>
  );
}
