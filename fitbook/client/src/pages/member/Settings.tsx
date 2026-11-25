import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { FieldError } from '@/components/AuthShell';
import { api, apiError } from '@/lib/api';

const schema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

const PREF_KEY = 'fitbook_notif_prefs';

export default function Settings() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(() => {
    try { return { promotions: true, reminders: true, announcements: true, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; }
    catch { return { promotions: true, reminders: true, announcements: true }; }
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const changePassword = async (data: FormData) => {
    try {
      await api.post('/auth/me/change-password', data);
      reset();
      toast({ variant: 'success', title: 'Password changed', description: 'Please log in again with your new password.' });
      await logout();
      navigate('/login');
    } catch (e) {
      toast({ variant: 'error', title: 'Password change failed', description: apiError(e) });
    }
  };

  const savePref = (key: keyof typeof prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
    toast({ variant: 'success', title: 'Preference saved' });
  };

  const Toggle = ({ label, description, prefKey }: { label: string; description: string; prefKey: keyof typeof prefs }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => savePref(prefKey, !prefs[prefKey])}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${prefs[prefKey] ? 'bg-lime-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
        aria-label={label}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[prefKey] ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Appearance, notifications and account security.</p>
      </div>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-bold">{dark ? <Moon className="h-5 w-5 text-lime-600" /> : <Sun className="h-5 w-5 text-lime-600" />} Appearance</h2>
        <div className="mt-2 flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold">Dark mode</p>
            <p className="text-xs text-muted-foreground">Easier on the eyes for evening workouts.</p>
          </div>
          <Button variant="outline" onClick={toggle}>{dark ? 'Switch to light' : 'Switch to dark'}</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold">Notification preferences</h2>
        <p className="text-xs text-muted-foreground">Saved on this device. In-app notifications for bookings and promotions always stay on so you never miss a seat.</p>
        <div className="mt-2 divide-y">
          <Toggle label="Waitlist promotions" description="Alert me the moment I am promoted from a waitlist." prefKey="promotions" />
          <Toggle label="Class reminders" description="Remind me about upcoming booked classes." prefKey="reminders" />
          <Toggle label="Announcements" description="Studio news and new class announcements." prefKey="announcements" />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-lime-600" /> Change password</h2>
        <form onSubmit={handleSubmit(changePassword)} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Current password</Label>
            <Input type="password" className="mt-1.5" {...register('currentPassword')} />
            <FieldError message={errors.currentPassword?.message} />
          </div>
          <div>
            <Label>New password</Label>
            <Input type="password" className="mt-1.5" {...register('newPassword')} />
            <FieldError message={errors.newPassword?.message} />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" className="mt-1.5" {...register('confirmPassword')} />
            <FieldError message={errors.confirmPassword?.message} />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating…' : 'Update password'}</Button>
            <p className="mt-2 text-xs text-muted-foreground">Changing your password signs out all sessions, including this one.</p>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold">Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">Signed in as {user?.email} ({user?.role.toLowerCase()}).</p>
        <Button variant="outline" className="mt-4 text-red-600 hover:text-red-700" onClick={async () => { await logout(); navigate('/login'); }}>
          <LogOut /> Log out everywhere
        </Button>
      </Card>
    </div>
  );
}
