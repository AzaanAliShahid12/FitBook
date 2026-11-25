import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, User, Signal } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { AvailabilityMeter, seatsBadge } from './AvailabilityMeter';
import { fmtDate, fmtTime, relativeDay } from '@/lib/time';
import type { FitnessClass } from '@/types';

export function ClassCard({ cls }: { cls: FitnessClass }) {
  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/classes/${cls.id}`} className="block">
        <div className="relative h-44 overflow-hidden">
          <img
            src={cls.image || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1200&auto=format&fit=crop'}
            alt={cls.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-zinc-900 backdrop-blur">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: cls.category?.color || '#84cc16' }} />
              {cls.category?.name}
            </span>
          </div>
          <div className="absolute bottom-3 left-3">{seatsBadge(cls)}</div>
          <div className="absolute bottom-3 right-3 rounded-full bg-zinc-950/70 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur">
            {cls.price > 0 ? `Rs ${Number(cls.price).toLocaleString()}` : 'Free'}
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h3 className="line-clamp-1 text-base font-bold leading-snug">{cls.title}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" /> {cls.instructor?.name}
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <Signal className="h-3.5 w-3.5" /> {cls.difficulty.replace('_', ' ').toLowerCase()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-lime-600" /> {relativeDay(cls.startTime)} · {fmtDate(cls.startTime)}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-lime-600" /> {fmtTime(cls.startTime)} · {cls.duration}m</span>
            <span className="col-span-2 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-lime-600" /> {cls.room?.name || 'Studio'}{cls.room?.location ? ` — ${cls.room.location}` : ''}</span>
          </div>
          <AvailabilityMeter cls={cls} />
        </div>
      </Link>
    </Card>
  );
}

export function DifficultyBadge({ level }: { level: FitnessClass['difficulty'] }) {
  return <Badge variant="zinc">{level.replace('_', ' ')}</Badge>;
}
