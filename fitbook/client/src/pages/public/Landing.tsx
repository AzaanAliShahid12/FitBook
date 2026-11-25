import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarCheck, ChevronDown, Clock3, ListOrdered, Moon, Sparkles, Sun,
  Ticket, TrendingUp, Users, Zap, ShieldCheck, BellRing,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { ClassCard } from '@/components/ClassCard';
import { ClassCardSkeleton } from '@/components/ui/skeleton';
import { useAuth, homePathForRole } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCategories, useClasses } from '@/hooks/useData';
import { cn } from '@/lib/utils';

const steps = [
  { icon: <Ticket className="h-6 w-6" />, title: 'Find & book in seconds', text: 'Browse live class schedules with real seat counts. One tap and your spot is locked in — no phone calls, no guesswork.' },
  { icon: <ListOrdered className="h-6 w-6" />, title: 'Full? Join the smart waitlist', text: 'When a class fills up, join the waitlist and keep your place in line. Your position updates live as the queue moves.' },
  { icon: <BellRing className="h-6 w-6" />, title: 'Get promoted automatically', text: 'The moment someone cancels, the next person on the waitlist is promoted instantly and notified. The seat is never wasted.' },
];

const benefits = [
  { icon: <Clock3 className="h-5 w-5" />, title: 'Real-time availability', text: 'Seat counts update the second anything changes — for everyone, everywhere, without refreshing.' },
  { icon: <ShieldCheck className="h-5 w-5" />, title: 'Never overbooked', text: 'Capacity is enforced in the database itself. A 20-person class holds exactly 20 people. Always.' },
  { icon: <TrendingUp className="h-5 w-5" />, title: 'Fair by design', text: 'Waitlist order is strictly first-come, first-served. No favourites, no jumping the queue.' },
  { icon: <Users className="h-5 w-5" />, title: 'For studios of any size', text: 'Gyms, yoga studios, dance schools and independent instructors — one system for classes, bookings and waitlists.' },
];

const testimonials = [
  { name: 'Mahnoor F.', role: 'Yoga member', text: 'My favourite yoga class is always full, but the waitlist got me in three times this month. I get a notification and my spot is just… booked.' },
  { name: 'Daniyal A.', role: 'HIIT regular', text: 'I can see exactly how many spots are left before I leave home. No more showing up to a packed class and being turned away.' },
  { name: 'Studio Bloom', role: 'Partner studio (demo)', text: 'Cancellations used to mean empty mats. Now every freed seat refills itself automatically from the waitlist.' },
];

const faqs = [
  { q: 'How does the smart waitlist work?', a: 'When a class is full, you can join its waitlist. You get a position in line. If a booked member cancels, the system instantly promotes the first person in line, confirms their booking and notifies them — automatically, in real time.' },
  { q: 'Can a class ever be overbooked?', a: 'No. Capacity is enforced with database transactions when you book, so even if fifty people tap "Book" for the last seat at the same moment, exactly one succeeds.' },
  { q: 'How late can I cancel?', a: 'Each class has its own cancellation window (often 2 hours before start). Cancel inside the window and your seat goes straight to the waitlist.' },
  { q: 'Do I need to pay online?', a: 'No — FitBook reserves your spot. Paid classes are settled at the studio, so booking stays fast and commitment-free.' },
  { q: 'I run a studio. Can I manage classes myself?', a: 'Yes. Admins and instructors get full dashboards: class creation, capacity and waitlist settings, participant lists, attendance, analytics and reports.' },
];

export default function Landing() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const { data: featured, isLoading } = useClasses({ limit: 6, sort: 'popular' });
  const { data: categories } = useCategories();
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="ml-8 hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/explore" className="hover:text-foreground">Explore classes</Link>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#waitlist" className="hover:text-foreground">Smart waitlist</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Toggle theme">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {user ? (
              <Link to={homePathForRole(user.role)}><Button>Open my dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Log in</Button></Link>
                <Link to="/register"><Button>Get started</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2000&auto=format&fit=crop"
          alt="Athlete training in a modern fitness studio"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/85 via-zinc-950/60 to-zinc-950/25" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-lime-300">
              <Sparkles className="h-3.5 w-3.5" /> Live booking + smart waitlist
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] text-white sm:text-6xl">
              Your Next Workout.<br />Your Spot. <span className="text-lime-400">Your Schedule.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-200">
              Book fitness classes effortlessly, secure your spot in real time, and never miss a session. If a class fills up, our smart waitlist keeps you in the game.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/explore"><Button size="lg">Explore classes <ArrowRight /></Button></Link>
              <Link to="/register"><Button size="lg" variant="dark" className="bg-white text-zinc-950 hover:bg-zinc-200">Get started free</Button></Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-zinc-300">
              <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-lime-400" /> Real-time seats</span>
              <span className="flex items-center gap-2"><ListOrdered className="h-4 w-4 text-lime-400" /> Automatic promotions</span>
              <span className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-lime-400" /> Free cancellation window</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight">How FitBook works</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Three steps between you and your next class — even when the class is "full".</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-3xl border bg-card p-7">
              <span className="absolute right-6 top-5 text-5xl font-black text-zinc-100 dark:text-zinc-800">{i + 1}</span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500 text-zinc-950">{s.icon}</span>
              <h3 className="relative mt-4 text-lg font-bold">{s.title}</h3>
              <p className="relative mt-1.5 leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured classes */}
      <section className="border-y bg-zinc-50 py-20 dark:bg-zinc-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Featured classes</h2>
              <p className="mt-1 text-muted-foreground">Live from the schedule — watch the seat counts move in real time.</p>
            </div>
            <Link to="/explore"><Button variant="outline">View all classes <ArrowRight /></Button></Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <ClassCardSkeleton key={i} />)
              : (featured?.data ?? []).map((cls) => <ClassCard key={cls.id} cls={cls} />)}
          </div>
        </div>
      </section>

      {/* Smart waitlist */}
      <section id="waitlist" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-lime-700 dark:text-lime-400">
              <ListOrdered className="h-3.5 w-3.5" /> The smart waitlist
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight">"Full" doesn't mean<br />you're out of luck.</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              People cancel. Life happens. With FitBook, a cancelled seat never sits empty: the first person on the waitlist is promoted automatically, their booking is confirmed on the spot, and everyone behind them moves up a place — all in real time, all without staff lifting a finger.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {['Strict first-come, first-served order', 'Instant notification when you are promoted', 'Positions update live as the queue moves', 'One promotion per freed seat — never overbooked'].map((t) => (
                <li key={t} className="flex items-center gap-2.5 font-medium"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-500 text-[11px] font-black text-zinc-950">✓</span>{t}</li>
              ))}
            </ul>
            <Link to="/explore" className="mt-7 inline-block"><Button size="lg">Try it on a live class <ArrowRight /></Button></Link>
          </div>
          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-bold">Morning Flow Yoga — 6:00 PM</p>
            <p className="text-xs text-muted-foreground">Capacity 20 · Confirmed 20 · Waitlist live demo</p>
            <div className="mt-4 space-y-2">
              {[
                { pos: 1, name: 'Ahmed', status: 'Promoted — seat confirmed', tone: 'bg-lime-500/15 text-lime-800 dark:text-lime-300' },
                { pos: 2, name: 'Sara', status: 'Now position 1 — waiting', tone: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
                { pos: 3, name: 'Ali', status: 'Now position 2 — waiting', tone: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
              ].map((r) => (
                <div key={r.name} className="flex items-center justify-between rounded-xl border px-4 py-3">
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-lime-400 dark:bg-zinc-800">{r.pos}</span>
                    {r.name}
                  </span>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', r.tone)}>{r.status}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-secondary/70 p-3.5 text-xs leading-relaxed text-muted-foreground">
              One member cancels → Ahmed is promoted in the same instant, Sara and Ali move up, and the class stays at exactly 20 confirmed. Try it yourself with the demo accounts.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-y bg-zinc-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-black">Train your way</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {(categories ?? []).map((c) => (
              <Link
                key={c.id}
                to={`/explore?category=${c.id}`}
                className="flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-semibold transition hover:border-lime-400 hover:text-lime-300"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} /> {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-black tracking-tight">Built for members and studios</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-3xl border bg-card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700 dark:text-lime-400">{b.icon}</span>
              <h3 className="mt-3.5 font-bold">{b.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials (demo content) */}
      <section className="border-y bg-zinc-50 py-20 dark:bg-zinc-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-black tracking-tight">What people say</h2>
          <p className="mt-1 text-center text-xs uppercase tracking-wide text-muted-foreground">Demo testimonials</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-3xl border bg-card p-6">
                <blockquote className="leading-relaxed text-muted-foreground">“{t.text}”</blockquote>
                <figcaption className="mt-4">
                  <p className="font-bold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-black tracking-tight">Simple pricing</h2>
        <p className="mt-1 text-center text-muted-foreground">Booking is always free for members. Studios pay per location — demo pricing.</p>
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
          {[
            { name: 'Member', price: 'Free', points: ['Unlimited bookings', 'Smart waitlist', 'Real-time notifications'] },
            { name: 'Studio', price: 'Rs 4,999/mo', points: ['Unlimited classes', 'Waitlist automation', 'Analytics & reports'], highlight: true },
            { name: 'Instructor', price: 'Rs 1,499/mo', points: ['Own schedule', 'Participant lists', 'Attendance tracking'] },
          ].map((p) => (
            <div key={p.name} className={cn('rounded-3xl border bg-card p-7 text-center', p.highlight && 'border-lime-500 shadow-lg shadow-lime-500/10')}>
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{p.name}</p>
              <p className="mt-2 text-3xl font-black">{p.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {p.points.map((pt) => <li key={pt}>{pt}</li>)}
              </ul>
              <Link to="/register"><Button className="mt-6 w-full" variant={p.highlight ? 'default' : 'outline'}>Get started</Button></Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="text-center text-3xl font-black tracking-tight">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f, i) => (
            <div key={f.q} className="overflow-hidden rounded-2xl border bg-card">
              <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="flex w-full items-center justify-between px-5 py-4 text-left font-bold">
                {f.q}
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition', openFaq === i && 'rotate-180')} />
              </button>
              {openFaq === i && <p className="px-5 pb-5 leading-relaxed text-muted-foreground">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-zinc-950 py-12 text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center sm:px-6">
          <Logo className="[&_span:last-child]:text-white" />
          <p className="max-w-md text-sm">Dynamic class booking with a smart waitlist — built for gyms, studios and instructors who hate empty seats.</p>
          <div className="flex gap-6 text-sm font-medium">
            <Link to="/explore" className="hover:text-lime-300">Explore</Link>
            <Link to="/login" className="hover:text-lime-300">Log in</Link>
            <Link to="/register" className="hover:text-lime-300">Register</Link>
          </div>
          <p className="text-xs text-zinc-500">© {new Date().getFullYear()} FitBook. Demo project — no real bookings or payments.</p>
        </div>
      </footer>
    </div>
  );
}
