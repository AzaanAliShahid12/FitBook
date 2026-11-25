import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import type { FitnessClass } from '@/types';

export function seatsBadge(cls: Pick<FitnessClass, 'availableSeats' | 'capacity' | 'waitlistEnabled' | 'status'>) {
  if (cls.status === 'CANCELLED') return <Badge variant="red">Cancelled</Badge>;
  if (cls.availableSeats === 0) {
    return cls.waitlistEnabled ? <Badge variant="amber">Full – Join Waitlist</Badge> : <Badge variant="red">Fully Booked</Badge>;
  }
  if (cls.availableSeats <= 5) return <Badge variant="amber">{cls.availableSeats} spots left</Badge>;
  return <Badge variant="lime">{cls.availableSeats} spots available</Badge>;
}

export function AvailabilityMeter({ cls, className }: { cls: FitnessClass; className?: string }) {
  const pct = cls.capacity ? Math.min(100, Math.round((cls.confirmedCount / cls.capacity) * 100)) : 0;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{cls.confirmedCount}/{cls.capacity} booked</span>
        <span>{cls.availableSeats > 0 ? `${cls.availableSeats} left` : 'Full'}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={cn('h-full rounded-full transition-all duration-500', pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-lime-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
