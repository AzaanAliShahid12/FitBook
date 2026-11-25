import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { CheckCircle2 } from 'lucide-react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1600&auto=format&fit=crop"
          alt="People training in a modern gym"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-zinc-950/20" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="text-3xl font-black leading-tight">Your Next Workout.<br />Your Spot. Your Schedule.</p>
          <ul className="mt-5 space-y-2 text-sm text-zinc-200">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-400" /> Real-time seat availability</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-400" /> Smart waitlist with automatic promotion</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-400" /> Instant booking notifications</li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block"><Logo /></Link>
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-500">{message}</p>;
}
