import { prisma } from '../config/db';

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastDays(n: number) {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
}

export async function getAnalytics() {
  const now = new Date();
  const [
    totalMembers, totalInstructors, totalClasses, totalBookings, upcomingClasses,
    completedClasses, cancelledBookings, activeWaitlists, promotedCount, resolvedWaitlist,
    classesWithCounts, popularClassesRaw, categoryRaw, instructorRaw,
    bookingsRecent, cancellationsRecent, waitlistRecent, attendanceRecent,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'MEMBER' } }),
    prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
    prisma.fitnessClass.count(),
    prisma.booking.count(),
    prisma.fitnessClass.count({ where: { status: 'PUBLISHED', startTime: { gte: now } } }),
    prisma.fitnessClass.count({ where: { endTime: { lt: now }, status: { not: 'CANCELLED' } } }),
    prisma.booking.count({ where: { status: 'CANCELLED' } }),
    prisma.waitlistEntry.count({ where: { status: 'WAITING' } }),
    prisma.waitlistEntry.count({ where: { status: 'PROMOTED' } }),
    prisma.waitlistEntry.count({ where: { status: { in: ['PROMOTED', 'EXPIRED', 'CANCELLED'] } } }),
    prisma.fitnessClass.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, capacity: true, _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } } },
    }),
    prisma.booking.groupBy({ by: ['classId'], where: { status: 'CONFIRMED' }, _count: { _all: true }, orderBy: { _count: { classId: 'desc' } }, take: 5 }),
    prisma.fitnessClass.groupBy({ by: ['categoryId'], _count: { _all: true } }),
    prisma.fitnessClass.groupBy({ by: ['instructorId'], _count: { _all: true }, orderBy: { _count: { instructorId: 'desc' } }, take: 5 }),
    prisma.booking.findMany({ where: { createdAt: { gte: new Date(Date.now() - 14 * 86400000) } }, select: { createdAt: true } }),
    prisma.booking.findMany({ where: { status: 'CANCELLED', cancelledAt: { gte: new Date(Date.now() - 14 * 86400000) } }, select: { cancelledAt: true } }),
    prisma.waitlistEntry.findMany({ where: { joinedAt: { gte: new Date(Date.now() - 14 * 86400000) } }, select: { joinedAt: true } }),
    prisma.attendance.findMany({ where: { markedAt: { gte: new Date(Date.now() - 7 * 86400000) }, status: 'PRESENT' }, select: { markedAt: true } }),
  ]);

  const occupancyRate = classesWithCounts.length
    ? Math.round(
        (classesWithCounts.reduce((sum, c) => sum + (c.capacity ? c._count.bookings / c.capacity : 0), 0) /
          classesWithCounts.length) * 100
      )
    : 0;

  const popularClassIds = popularClassesRaw.map((p) => p.classId);
  const popularClassesData = await prisma.fitnessClass.findMany({
    where: { id: { in: popularClassIds } },
    select: { id: true, title: true },
  });
  const popularClasses = popularClassesRaw.map((p) => ({
    classId: p.classId,
    title: popularClassesData.find((c) => c.id === p.classId)?.title ?? 'Class',
    bookings: p._count._all,
  }));

  const categories = await prisma.category.findMany({ where: { id: { in: categoryRaw.map((c) => c.categoryId) } } });
  const categoryDistribution = categoryRaw.map((c) => ({
    name: categories.find((x) => x.id === c.categoryId)?.name ?? 'Category',
    color: categories.find((x) => x.id === c.categoryId)?.color ?? '#84cc16',
    classes: c._count._all,
  }));

  const instructors = await prisma.user.findMany({
    where: { id: { in: instructorRaw.map((i) => i.instructorId) } },
    select: { id: true, name: true },
  });
  const instructorPerformance = instructorRaw.map((i) => ({
    instructorId: i.instructorId,
    name: instructors.find((u) => u.id === i.instructorId)?.name ?? 'Instructor',
    classes: i._count._all,
  }));

  const trend = (dates: (Date | null)[], days: string[]) =>
    days.map((day) => ({ date: day, count: dates.filter((d) => d && dayKey(d) === day).length }));

  const days14 = lastDays(14);
  const days7 = lastDays(7);

  const capacityUtilization = await Promise.all(
    classesWithCounts.slice(0, 8).map(async (c) => {
      const cls = await prisma.fitnessClass.findUnique({ where: { id: c.id }, select: { title: true } });
      return {
        title: cls?.title ?? 'Class',
        capacity: c.capacity,
        booked: c._count.bookings,
        utilization: c.capacity ? Math.round((c._count.bookings / c.capacity) * 100) : 0,
      };
    })
  );

  return {
    totals: {
      totalMembers, totalInstructors, totalClasses, totalBookings, upcomingClasses,
      completedClasses, cancelledBookings, activeWaitlists,
    },
    promotionRate: resolvedWaitlist ? Math.round((promotedCount / resolvedWaitlist) * 100) : 0,
    occupancyRate,
    popularClasses,
    categoryDistribution,
    instructorPerformance,
    capacityUtilization,
    bookingTrend: trend(bookingsRecent.map((b) => b.createdAt), days14),
    cancellationTrend: trend(cancellationsRecent.map((b) => b.cancelledAt), days14),
    waitlistTrend: trend(waitlistRecent.map((w) => w.joinedAt), days14),
    weeklyAttendance: trend(attendanceRecent.map((a) => a.markedAt), days7),
  };
}

function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]) {
  return [headers.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
}

function range(from?: string, to?: string) {
  const where: { gte?: Date; lte?: Date } = {};
  if (from) where.gte = new Date(from);
  if (to) where.lte = new Date(to);
  return Object.keys(where).length ? where : undefined;
}

export async function bookingsReportCsv(from?: string, to?: string) {
  const createdAt = range(from, to);
  const bookings = await prisma.booking.findMany({
    where: createdAt ? { createdAt } : {},
    include: { user: { select: { name: true, email: true } }, fitnessClass: { select: { title: true, startTime: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return toCsv(
    ['Booking ID', 'Reference', 'Member', 'Email', 'Class', 'Class Time', 'Status', 'Booked At', 'Cancelled At'],
    bookings.map((b) => [b.id, b.bookingReference, b.user.name, b.user.email, b.fitnessClass.title, b.fitnessClass.startTime.toISOString(), b.status, b.bookedAt.toISOString(), b.cancelledAt?.toISOString() ?? ''])
  );
}

export async function waitlistReportCsv(from?: string, to?: string) {
  const joinedAt = range(from, to);
  const entries = await prisma.waitlistEntry.findMany({
    where: joinedAt ? { joinedAt } : {},
    include: { user: { select: { name: true, email: true } }, fitnessClass: { select: { title: true } } },
    orderBy: { joinedAt: 'desc' },
  });
  return toCsv(
    ['Entry ID', 'Member', 'Email', 'Class', 'Position', 'Status', 'Joined At', 'Promoted At'],
    entries.map((e) => [e.id, e.user.name, e.user.email, e.fitnessClass.title, e.position, e.status, e.joinedAt.toISOString(), e.promotedAt?.toISOString() ?? ''])
  );
}

export async function attendanceReportCsv(from?: string, to?: string) {
  const markedAt = range(from, to);
  const records = await prisma.attendance.findMany({
    where: markedAt ? { markedAt } : {},
    include: { user: { select: { name: true, email: true } }, fitnessClass: { select: { title: true } } },
    orderBy: { markedAt: 'desc' },
  });
  return toCsv(
    ['Record ID', 'Member', 'Email', 'Class', 'Status', 'Marked At'],
    records.map((a) => [a.id, a.user.name, a.user.email, a.fitnessClass.title, a.status, a.markedAt.toISOString()])
  );
}
