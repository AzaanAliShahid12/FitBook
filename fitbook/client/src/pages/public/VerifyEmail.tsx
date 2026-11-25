import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { api, apiError } from '@/lib/api';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'working' | 'ok' | 'fail'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setState('fail'); setMessage('No verification token found in this link.'); return; }
    api.post('/auth/verify-email', { token })
      .then(() => setState('ok'))
      .catch((e) => { setState('fail'); setMessage(apiError(e, 'This verification link is invalid or has expired')); });
  }, [params]);

  return (
    <AuthShell title="Email verification">
      <div className="rounded-2xl border p-6 text-center">
        {state === 'working' && <p className="text-sm text-muted-foreground">Verifying your email…</p>}
        {state === 'ok' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-lime-600" />
            <p className="mt-3 font-semibold">Email verified</p>
            <p className="mt-1 text-sm text-muted-foreground">Your account is fully activated.</p>
          </>
        )}
        {state === 'fail' && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 font-semibold">Verification failed</p>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </>
        )}
        <Link to="/login"><Button className="mt-5">Go to login</Button></Link>
      </div>
    </AuthShell>
  );
}
