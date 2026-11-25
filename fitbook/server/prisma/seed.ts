import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Class times are stored as UTC wall-clock ("studio time") and displayed as-is. */
function at(dayOffset: number, hour: number, minute = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hour, minute));
}
function dayOnly(dayOffset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
}

const img = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1200&auto=format&fit=crop`;

async function main() {
  console.log('Seeding FitBook demo data...');

  // Clean slate (order matters because of foreign keys)
  await prisma.attendance.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.fitnessClass.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.memberProfile.deleteMany();
  await prisma.instructorProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.room.deleteMany();

  // ----- Categories -----
  const categoryData = [
    ['Yoga', '#84cc16'], ['Pilates', '#06b6d4'], ['Zumba', '#f59e0b'], ['HIIT', '#ef4444'],
    ['Strength Training', '#8b5cf6'], ['Cardio', '#ec4899'], ['Cycling', '#3b82f6'],
    ['Boxing', '#f97316'], ['Dance', '#d946ef'], ['Stretching', '#10b981'],
  ] as const;
  const categories: Record<string, string> = {};
  for (const [name, color] of categoryData) {
    const c = await prisma.category.create({ data: { name, color } });
    categories[name] = c.id;
  }

  // ----- Rooms -----
  const roomData = [
    ['Studio A', 'Ground Floor', 30], ['Studio B', 'First Floor', 20],
    ['Main Hall', 'Ground Floor', 40], ['Cycling Room', 'Basement', 16], ['Boxing Arena', 'First Floor', 18],
  ] as const;
  const rooms: Record<string, string> = {};
  for (const [name, location, capacity] of roomData) {
    const r = await prisma.room.create({ data: { name, location, capacity } });
    rooms[name] = r.id;
  }

  // ----- Users -----
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const instructorHash = await bcrypt.hash('Trainer@123', 12);
  const memberHash = await bcrypt.hash('Member@123', 12);

  const admin = await prisma.user.create({
    data: { name: 'FitBook Admin', email: 'admin@fitbook.app', passwordHash: adminHash, role: 'ADMIN', emailVerified: true },
  });
  void admin;

  const instructorData = [
    { name: 'Sarah Khan', email: 'sarah@fitbook.app', bio: 'Certified yoga and Pilates instructor with a decade of studio experience.', specialties: ['Yoga', 'Pilates', 'Stretching'], experienceYears: 10 },
    { name: 'David Miller', email: 'david@fitbook.app', bio: 'Strength and conditioning coach. HIIT specialist focused on safe, progressive training.', specialties: ['HIIT', 'Strength Training', 'Cardio'], experienceYears: 8 },
    { name: 'Ayesha Rahman', email: 'ayesha@fitbook.app', bio: 'Dance fitness instructor bringing energy to every Zumba and dance session.', specialties: ['Zumba', 'Dance', 'Cycling'], experienceYears: 6 },
  ];
  const instructors: Record<string, string> = {};
  for (const i of instructorData) {
    const u = await prisma.user.create({
      data: {
        name: i.name, email: i.email, passwordHash: instructorHash, role: 'INSTRUCTOR', emailVerified: true,
        instructorProfile: { create: { bio: i.bio, specialties: i.specialties, experienceYears: i.experienceYears, rating: 4.8 } },
      },
    });
    instructors[i.name] = u.id;
  }

  const memberNames = [
    'Ahmed Raza', 'Sara Malik', 'Ali Hassan', 'Fatima Noor', 'Usman Tariq', 'Zainab Iqbal',
    'Bilal Ahmed', 'Hira Shahid', 'Omar Farooq', 'Mahnoor Fatima', 'Hamza Sheikh', 'Areeba Khan',
    'Talha Mehmood', 'Iqra Aslam', 'Hassan Raza', 'Daniyal Ahmad', 'Maryam Siddiqui', 'Shahzaib Ali',
    'Nimra Tariq', 'Fahad Hussain', 'Laiba Noor', 'Saad Rehman', 'Eman Fatima', 'Abdullah Khan',
  ];
  const members: { id: string; name: string; email: string }[] = [];
  for (let i = 0; i < memberNames.length; i++) {
    const email = i === 0 ? 'member@fitbook.app' : `member${i + 1}@fitbook.app`;
    const u = await prisma.user.create({
      data: {
        name: memberNames[i], email, passwordHash: memberHash, role: 'MEMBER', emailVerified: true,
        memberProfile: { create: { goals: 'Stay fit and consistent' } },
      },
    });
    members.push({ id: u.id, name: u.name, email: u.email });
  }
  const byName = (name: string) => members.find((m) => m.name === name)!;

  // ----- Classes -----
  type ClassSeed = {
    title: string; category: string; instructor: string; room: string; image: string;
    day: number; start: [number, number]; durationMin: number; capacity: number;
    price: number; difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
    description: string;
  };
  const classSeeds: ClassSeed[] = [
    { title: 'Morning Flow Yoga', category: 'Yoga', instructor: 'Sarah Khan', room: 'Studio A', image: img('photo-1544367567-0f2fcb009e0b'), day: 1, start: [18, 0], durationMin: 60, capacity: 20, price: 0, difficulty: 'ALL_LEVELS', description: 'A calming vinyasa flow to build strength, balance and flexibility. Our most popular class — it fills up fast, so the smart waitlist is on.' },
    { title: 'Power Pilates', category: 'Pilates', instructor: 'Sarah Khan', room: 'Studio B', image: img('photo-1518611012118-696072aa579a'), day: 1, start: [7, 30], durationMin: 45, capacity: 16, price: 500, difficulty: 'INTERMEDIATE', description: 'Core-focused Pilates that tones and strengthens with controlled, precise movements.' },
    { title: 'HIIT Burn', category: 'HIIT', instructor: 'David Miller', room: 'Main Hall', image: img('photo-1517963879433-6ad2b056d712'), day: 0, start: [19, 0], durationMin: 40, capacity: 24, price: 600, difficulty: 'ADVANCED', description: 'High-intensity intervals that torch calories and boost endurance. Bring water — you will need it.' },
    { title: 'Zumba Dance Party', category: 'Zumba', instructor: 'Ayesha Rahman', room: 'Main Hall', image: img('photo-1517130038641-a77d04ed8b3c'), day: 2, start: [18, 30], durationMin: 55, capacity: 30, price: 400, difficulty: 'ALL_LEVELS', description: 'Latin rhythms, easy choreography and a party atmosphere. Fitness that does not feel like work.' },
    { title: 'Strength Fundamentals', category: 'Strength Training', instructor: 'David Miller', room: 'Studio A', image: img('photo-1534438327276-14e5300c3a48'), day: 2, start: [8, 0], durationMin: 60, capacity: 18, price: 700, difficulty: 'BEGINNER', description: 'Learn the big lifts with perfect form: squat, deadlift, press and row, coached step by step.' },
    { title: 'Spin & Sweat', category: 'Cycling', instructor: 'Ayesha Rahman', room: 'Cycling Room', image: img('photo-1558611848-73f7eb4001a1'), day: 3, start: [7, 0], durationMin: 45, capacity: 16, price: 550, difficulty: 'INTERMEDIATE', description: 'Rhythm-based indoor cycling with climbs, sprints and endurance blocks set to music.' },
    { title: 'Boxing Basics', category: 'Boxing', instructor: 'David Miller', room: 'Boxing Arena', image: img('photo-1549719386-74dfcbf7dbed'), day: 3, start: [19, 30], durationMin: 60, capacity: 18, price: 650, difficulty: 'BEGINNER', description: 'Footwork, jab-cross combinations and bag rounds. Wraps provided for first-timers.' },
    { title: 'Evening Stretch & Mobility', category: 'Stretching', instructor: 'Sarah Khan', room: 'Studio B', image: img('photo-1552196563-55cd4e45efb3'), day: 4, start: [20, 0], durationMin: 40, capacity: 20, price: 0, difficulty: 'ALL_LEVELS', description: 'Unwind with deep stretching and mobility work — the perfect end to a training week.' },
    { title: 'Core Crusher', category: 'Cardio', instructor: 'David Miller', room: 'Studio A', image: img('photo-1571019613454-1cb2f99b2d8b'), day: 5, start: [9, 0], durationMin: 30, capacity: 22, price: 350, difficulty: 'INTERMEDIATE', description: 'Thirty focused minutes of core and conditioning circuits. Short, sharp, effective.' },
    { title: 'Full Body Circuit', category: 'Cardio', instructor: 'Ayesha Rahman', room: 'Main Hall', image: img('photo-1574680096145-d05b474e2155'), day: 6, start: [10, 0], durationMin: 50, capacity: 26, price: 500, difficulty: 'ALL_LEVELS', description: 'Stations-based full body training mixing strength and cardio for a complete workout.' },
  ];

  const classes: Record<string, string> = {};
  for (const c of classSeeds) {
    const startTime = at(c.day, c.start[0], c.start[1]);
    const endTime = new Date(startTime.getTime() + c.durationMin * 60000);
    const created = await prisma.fitnessClass.create({
      data: {
        title: c.title, description: c.description, categoryId: categories[c.category],
        instructorId: instructors[c.instructor], roomId: rooms[c.room], image: c.image,
        date: dayOnly(c.day), startTime, endTime, duration: c.durationMin, capacity: c.capacity,
        price: c.price, difficulty: c.difficulty, status: 'PUBLISHED',
        cancellationDeadlineHours: 2, waitlistEnabled: true, waitlistLimit: 50, autoPromote: true,
      },
    });
    classes[c.title] = created.id;
  }

  // A past class (yesterday) with attendance, for instructor/analytics history
  const pastStart = at(-1, 7, 0);
  const pastClass = await prisma.fitnessClass.create({
    data: {
      title: 'Morning Flow Yoga', description: 'Yesterday’s sunrise session.', categoryId: categories['Yoga'],
      instructorId: instructors['Sarah Khan'], roomId: rooms['Studio A'], image: img('photo-1544367567-0f2fcb009e0b'),
      date: dayOnly(-1), startTime: pastStart, endTime: new Date(pastStart.getTime() + 60 * 60000),
      duration: 60, capacity: 20, price: 0, difficulty: 'ALL_LEVELS', status: 'COMPLETED',
    },
  });

  let refCounter = 1000;
  const ref = () => `FB-SEED${refCounter++}`;
  async function book(userId: string, classId: string) {
    return prisma.booking.create({ data: { userId, classId, bookingReference: ref(), status: 'CONFIRMED' } });
  }

  // ----- Demo scenario: Morning Flow Yoga is FULL (20/20) with a 3-person waitlist -----
  const yogaId = classes['Morning Flow Yoga'];
  const confirmedForYoga = members.filter((m) => !['Ahmed Raza', 'Sara Malik', 'Ali Hassan'].includes(m.name)).slice(0, 20);
  for (const m of confirmedForYoga) await book(m.id, yogaId);

  const waitlistNames = ['Ahmed Raza', 'Sara Malik', 'Ali Hassan'];
  for (let i = 0; i < waitlistNames.length; i++) {
    await prisma.waitlistEntry.create({
      data: { userId: byName(waitlistNames[i]).id, classId: yogaId, position: i + 1, status: 'WAITING' },
    });
  }

  // ----- Other bookings (variety, none of these classes full) -----
  await book(byName('Ahmed Raza').id, classes['HIIT Burn']);
  await book(byName('Ahmed Raza').id, classes['Power Pilates']);
  await book(byName('Sara Malik').id, classes['Zumba Dance Party']);
  await book(byName('Ali Hassan').id, classes['Strength Fundamentals']);
  await book(byName('Fatima Noor').id, classes['Spin & Sweat']);
  await book(byName('Fatima Noor').id, classes['Power Pilates']);
  await book(byName('Usman Tariq').id, classes['Boxing Basics']);
  await book(byName('Zainab Iqbal').id, classes['Evening Stretch & Mobility']);
  await book(byName('Bilal Ahmed').id, classes['Full Body Circuit']);
  await book(byName('Hira Shahid').id, classes['Core Crusher']);
  // One cancelled booking for history/trends
  await prisma.booking.create({
    data: {
      userId: byName('Omar Farooq').id, classId: classes['HIIT Burn'], bookingReference: ref(),
      status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Schedule change',
    },
  });

  // ----- Attendance for yesterday's class -----
  const pastAttendees = members.slice(3, 9);
  for (let i = 0; i < pastAttendees.length; i++) {
    const b = await prisma.booking.create({
      data: { userId: pastAttendees[i].id, classId: pastClass.id, bookingReference: ref(), status: 'CONFIRMED' },
    });
    const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT'] as const;
    await prisma.attendance.create({
      data: {
        bookingId: b.id, classId: pastClass.id, userId: pastAttendees[i].id,
        instructorId: instructors['Sarah Khan'], status: statuses[i], markedAt: new Date(pastStart.getTime() + 3600000),
      },
    });
  }

  // ----- Starter notifications for the demo member -----
  const ahmed = byName('Ahmed Raza');
  await prisma.notification.createMany({
    data: [
      { userId: ahmed.id, title: 'Booking confirmed', message: 'Your spot in HIIT Burn is confirmed.', type: 'BOOKING_CONFIRMED', metadata: { classId: classes['HIIT Burn'] } },
      { userId: ahmed.id, title: 'Added to waitlist', message: 'You are #1 on the waitlist for Morning Flow Yoga. We will promote you automatically if a seat opens.', type: 'WAITLIST_JOINED', metadata: { classId: yogaId } },
      { userId: byName('Sara Malik').id, title: 'Added to waitlist', message: 'You are #2 on the waitlist for Morning Flow Yoga.', type: 'WAITLIST_JOINED', metadata: { classId: yogaId } },
    ],
  });

  console.log('Seed complete:');
  console.log('  Admin:      admin@fitbook.app / Admin@123');
  console.log('  Instructor: sarah@fitbook.app / Trainer@123');
  console.log('  Member:     member@fitbook.app / Member@123 (Ahmed — waitlist #1 for the full Yoga class)');
  console.log(`  Classes: ${classSeeds.length + 1}, Members: ${members.length}, Yoga: 20/20 booked + 3 waitlisted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
