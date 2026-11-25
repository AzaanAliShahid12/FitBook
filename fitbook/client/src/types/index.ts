export type Role = 'ADMIN' | 'INSTRUCTOR' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: string | null;
  phone?: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  memberProfile?: MemberProfile | null;
  instructorProfile?: InstructorProfile | null;
  _count?: { bookings: number; waitlistEntries: number; classesTeaching: number };
}

export interface MemberProfile {
  id: string;
  goals?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  emergencyContact?: string | null;
}

export interface InstructorProfile {
  id: string;
  bio?: string | null;
  specialties: string[];
  experienceYears: number;
  rating: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  _count?: { classes: number };
}

export interface Room {
  id: string;
  name: string;
  location?: string | null;
  capacity: number;
  _count?: { classes: number };
}

export interface FitnessClass {
  id: string;
  title: string;
  description?: string | null;
  categoryId: string;
  instructorId: string;
  roomId?: string | null;
  image?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  capacity: number;
  price: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  bookingOpenAt?: string | null;
  bookingCloseAt?: string | null;
  cancellationDeadlineHours: number;
  waitlistEnabled: boolean;
  waitlistLimit: number;
  autoPromote: boolean;
  isRecurring: boolean;
  createdAt: string;
  confirmedCount: number;
  waitlistCount: number;
  availableSeats: number;
  isFull: boolean;
  category?: Category;
  room?: Room | null;
  instructor?: { id: string; name: string; email?: string; profileImage?: string | null; instructorProfile?: InstructorProfile | null };
  _count?: { bookings: number; waitlistEntries: number };
}

export interface Booking {
  id: string;
  userId: string;
  classId: string;
  status: 'CONFIRMED' | 'CANCELLED';
  bookingReference: string;
  bookedAt: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  fitnessClass?: FitnessClass;
  user?: { id: string; name: string; email: string; profileImage?: string | null; phone?: string | null };
  attendance?: Attendance | null;
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  classId: string;
  position: number;
  status: 'WAITING' | 'PROMOTED' | 'CANCELLED' | 'EXPIRED';
  joinedAt: string;
  promotedAt?: string | null;
  fitnessClass?: FitnessClass;
  user?: { id: string; name: string; email: string; profileImage?: string | null };
  peopleAhead?: number;
  totalWaiting?: number;
}

export interface Attendance {
  id: string;
  bookingId: string;
  classId: string;
  userId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  markedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Analytics {
  totals: {
    totalMembers: number; totalInstructors: number; totalClasses: number; totalBookings: number;
    upcomingClasses: number; completedClasses: number; cancelledBookings: number; activeWaitlists: number;
  };
  promotionRate: number;
  occupancyRate: number;
  popularClasses: { classId: string; title: string; bookings: number }[];
  categoryDistribution: { name: string; color: string; classes: number }[];
  instructorPerformance: { instructorId: string; name: string; classes: number }[];
  capacityUtilization: { title: string; capacity: number; booked: number; utilization: number }[];
  bookingTrend: { date: string; count: number }[];
  cancellationTrend: { date: string; count: number }[];
  waitlistTrend: { date: string; count: number }[];
  weeklyAttendance: { date: string; count: number }[];
}
