import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, MapPin, Signal, Users, ListOrdered, ShieldCheck, Timer } from 'lucide-react';
import { useClass } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { useMyBookings, useMyWaitlist } from '@/hooks/useData';
import { BookingActions } from '@/components/BookingActions';
import { AvailabilityMeter, seatsBadge } from '@/components/AvailabilityMeter';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtDateLong, fmtTime } from '@/lib/time';
import { subscribeToClass, unsubscribeFromClass } from '@/lib/socket';

export default function ClassDetails() {
  const { id } = useParams();
  const { data: cls, isLoading } = useClass(id);
  const { user } = useAuth();
  useMyBookings('CONFIRMED', 1, 100);
  useMyWaitlist();

  useEffect(() => {
    if (id) subscribeToClass(id);
    return () => { if (id) unsubscribeFromClass(id); };
  }, [id]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-72 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }
  if (!cls) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <p className="font-bold">Class not found</p>
        <Link to="/explore" className="mt-2 inline-block text-sm font-semibold text-lime-700 hover:underline dark:text-lime-400">Back to explore</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link to="/explore" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All classes
      </Link>

      <div className="relative overflow-hidden rounded-3xl">
        <img src={cls.image || ''} alt={cls.title} className="h-64 w-full object-cover sm:h-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-zinc-900">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: cls.category?.color || '#84cc16' }} />
              {cls.category?.name}
            </span>
            {seatsBadge(cls)}
            <Badge variant="zinc" className="bg-white/90 text-zinc-900"><Signal className="h-3 w-3" /> {cls.difficulty.replace('_', ' ')}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{cls.title}</h1>
          <p className="mt-1 text-sm text-zinc-200">{fmtDateLong(cls.startTime)} · {fmtTime(cls.startTime)} – {fmtTime(cls.endTime)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-bold">About this class</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{cls.description || 'A professionally coached session suitable for all fitness levels. Arrive 10 minutes early, bring water and a towel.'}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-secondary/70 p-3.5">
                <CalendarDays className="mb-1.5 h-5 w-5 text-lime-600" />
                <p className="font-bold">{fmtDateLong(cls.startTime).split(',')[0]}</p>
                <p className="text-xs text-muted-foreground">{fmtDateLong(cls.startTime)}</p>
              </div>
              <div className="rounded-xl bg-secondary/70 p-3.5">
                <Clock className="mb-1.5 h-5 w-5 text-lime-600" />
                <p className="font-bold">{fmtTime(cls.startTime)}</p>
                <p className="text-xs text-muted-foreground">{cls.duration} minutes</p>
              </div>
              <div className="rounded-xl bg-secondary/70 p-3.5">
                <MapPin className="mb-1.5 h-5 w-5 text-lime-600" />
                <p className="font-bold">{cls.room?.name || 'Studio'}</p>
                <p className="text-xs text-muted-foreground">{cls.room?.location || 'Main location'}</p>
              </div>
              <div className="rounded-xl bg-secondary/70 p-3.5">
                <Users className="mb-1.5 h-5 w-5 text-lime-600" />
                <p className="font-bold">{cls.capacity} spots</p>
                <p className="text-xs text-muted-foreground">{cls.confirmedCount} booked so far</p>
              </div>
              <div className="rounded-xl bg-secondary/70 p-3.5">
                <ListOrdered className="mb-1.5 h-5 w-5 text-lime-600" />
                <p className="font-bold">{cls.waitlistCount} waiting</p>
                <p className="text-xs text-muted-foreground">Smart waitlist {cls.waitlistEnabled ? 'enabled' : 'disabled'}</p>
              </div>
              <div className="rounded-xl bg-secondary/70 p-3.5">
                <Timer className="mb-1.5 h-5 w-5 text-lime-600" />
                <p className="font-bold">{cls.cancellationDeadlineHours}h policy</p>
                <p className="text-xs text-muted-foreground">Free cancellation window</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold">Your instructor</h2>
            <div className="mt-3 flex items-start gap-4">
              <Avatar name={cls.instructor?.name ?? 'Instructor'} src={cls.instructor?.profileImage} className="h-14 w-14 text-base" />
              <div>
                <p className="font-bold">{cls.instructor?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {cls.instructor?.instructorProfile?.experienceYears
                    ? `${cls.instructor.instructorProfile.experienceYears} years of coaching experience`
                    : 'Certified FitBook instructor'}
                </p>
                {cls.instructor?.instructorProfile?.bio && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{cls.instructor.instructorProfile.bio}</p>}
                {(cls.instructor?.instructorProfile?.specialties?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cls.instructor!.instructorProfile!.specialties.map((s) => <Badge key={s} variant="lime">{s}</Badge>)}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-lime-600" /> Cancellation & waitlist policy</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Cancel free of charge up to {cls.cancellationDeadlineHours} hours before the class starts.</li>
              <li>When a booked member cancels, the seat goes automatically to the first person on the waitlist — fairly, in join order.</li>
              <li>If you are promoted from the waitlist, your booking is confirmed instantly and you are notified right away.</li>
              <li>Capacity is enforced by the system — a class can never be overbooked.</li>
            </ul>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24 p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-3xl font-black">{cls.price > 0 ? `Rs ${Number(cls.price).toLocaleString()}` : 'Free'}</p>
              </div>
              {seatsBadge(cls)}
            </div>
            <div className="mt-5">
              <AvailabilityMeter cls={cls} />
              <p className="mt-2 text-xs text-muted-foreground">
                {cls.isFull
                  ? cls.waitlistEnabled
                    ? `${cls.waitlistCount} member${cls.waitlistCount === 1 ? '' : 's'} on the waitlist. Join now — promotions are automatic.`
                    : 'This class is fully booked.'
                  : `${cls.availableSeats} of ${cls.capacity} spots still open. Availability updates live.`}
              </p>
            </div>
            <div className="mt-5">
              <BookingActions cls={cls} />
            </div>
            {!user && <p className="mt-3 text-center text-xs text-muted-foreground">Takes 10 seconds — no payment needed to reserve.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
