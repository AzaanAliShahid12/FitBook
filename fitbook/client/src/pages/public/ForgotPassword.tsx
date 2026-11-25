import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { api, apiError } from '@/lib/api';
import { MailCheck } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.data.devResetToken) setDevToken(res.data.data.devResetToken);
      setSent(true);
    } catch (err) {
      setError(apiError(err));
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your account email and we will send you a reset link.">
      {sent ? (
        <div className="rounded-2xl border bg-lime-500/10 p-5 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-lime-600" />
          <p className="mt-3 font-semibold">Check your email</p>
          <p className="mt-1 text-sm text-muted-foreground">If an account exists for {email}, a password reset link is on its way. The link expires in 1 hour.</p>
          {devToken && (
            <p className="mt-4 break-all rounded-lg bg-card p-3 text-left text-xs">
              <span className="font-bold">Demo mode (email not configured):</span>{' '}
              <Link className="text-lime-700 underline dark:text-lime-400" to={`/reset-password?token=${devToken}`}>Open the reset link</Link>
            </p>
          )}
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-lime-700 hover:underline dark:text-lime-400">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5" />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button>
          <p className="text-center text-sm text-muted-foreground">Remembered it? <Link to="/login" className="font-semibold text-lime-700 hover:underline dark:text-lime-400">Log in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
