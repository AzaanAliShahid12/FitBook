import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Analytics, Booking, Category, FitnessClass, Pagination, Room, User, WaitlistEntry } from '@/types';

export interface ClassFilters {
  search?: string; categoryId?: string; instructorId?: string; date?: string;
  dateFrom?: string; dateTo?: string; availability?: string; difficulty?: string;
  sort?: string; page?: number; limit?: number; status?: string;
}

function cleanParams(params: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== null) out[k] = String(v);
  return out;
}

export function useClasses(filters: ClassFilters = {}, admin = false) {
  return useQuery({
    queryKey: ['classes', admin ? 'admin' : 'public', filters],
    queryFn: async () => {
      const res = await api.get(admin ? '/admin/classes' : '/classes', { params: cleanParams(filters as Record<string, unknown>) });
      return res.data as { data: FitnessClass[]; pagination: Pagination };
    },
  });
}

export function useClass(id: string | undefined) {
  return useQuery({
    queryKey: ['class', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get(`/classes/${id}`)).data.data as FitnessClass,
  });
}

export function useClassAvailability(id: string | undefined) {
  return useQuery({
    queryKey: ['availability', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get(`/classes/${id}/availability`)).data.data as {
      classId: string; capacity: number; confirmedCount: number; availableSeats: number; waitlistCount: number; isFull: boolean;
    },
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get('/categories')).data.data as Category[] });
}

export function useRooms() {
  return useQuery({ queryKey: ['rooms'], queryFn: async () => (await api.get('/rooms')).data.data as Room[] });
}

export function useInstructors() {
  return useQuery({ queryKey: ['instructors'], queryFn: async () => (await api.get('/instructors')).data.data as User[] });
}

export function useMyBookings(status?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['my-bookings', status, page, limit],
    queryFn: async () => {
      const res = await api.get('/bookings/my', { params: cleanParams({ status, page, limit }) });
      return res.data as { data: Booking[]; pagination: Pagination };
    },
  });
}

export function useMyWaitlist() {
  return useQuery({
    queryKey: ['my-waitlist'],
    queryFn: async () => (await api.get('/waitlist/my')).data.data as WaitlistEntry[],
  });
}

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: async () => {
      const res = await api.get('/notifications', { params: { page, limit } });
      return res.data as { data: import('@/types').AppNotification[]; pagination: Pagination; unread: number };
    },
  });
}

export function useAnalytics() {
  return useQuery({ queryKey: ['analytics'], queryFn: async () => (await api.get('/admin/analytics')).data.data as Analytics });
}

export function useAdminBookings(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ['admin-bookings', params],
    queryFn: async () => {
      const res = await api.get('/admin/bookings', { params: cleanParams(params) });
      return res.data as { data: Booking[]; pagination: Pagination };
    },
  });
}

export function useAdminWaitlist(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ['admin-waitlist', params],
    queryFn: async () => {
      const res = await api.get('/admin/waitlist', { params: cleanParams(params) });
      return res.data as { data: WaitlistEntry[]; pagination: Pagination };
    },
  });
}

export function useMembers(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: async () => {
      const res = await api.get('/members', { params: cleanParams(params) });
      return res.data as { data: User[]; pagination: Pagination };
    },
  });
}

export function useInstructorClasses() {
  return useQuery({ queryKey: ['instructor-classes'], queryFn: async () => (await api.get('/instructor/classes')).data.data as FitnessClass[] });
}

export function useInstructorStats() {
  return useQuery({
    queryKey: ['instructor-stats'],
    queryFn: async () => (await api.get('/instructor/stats')).data.data as {
      totalClasses: number; upcomingClasses: number; totalParticipants: number; attendanceMarked: number;
    },
  });
}

export function useClassBookings(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-bookings', classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/bookings`)).data.data as Booking[],
  });
}

export function useClassWaitlist(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-waitlist', classId],
    enabled: Boolean(classId),
    queryFn: async () => (await api.get(`/classes/${classId}/waitlist`)).data.data as WaitlistEntry[],
  });
}
