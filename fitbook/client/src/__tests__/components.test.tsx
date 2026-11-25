import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClassCard } from '@/components/ClassCard';
import { BookingActions } from '@/components/BookingActions';
import Login from '@/pages/public/Login';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import type { FitnessClass } from '@/types';

vi.mock('@/hooks/useData', () => ({
  useMyBookings: () => ({ data: { data: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 1 } } }),
  useMyWaitlist: () => ({ data: [] }),
}));

vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/contexts/AuthContext')>();
  return {
    ...original,
    useAuth: () => ({
      user: { id: 'u1', name: 'Test Member', email: 't@test.dev', role: 'MEMBER', isActive: true, emailVerified: true, createdAt: new Date().toISOString() },
      loading: false,
      login: vi.fn(), register: vi.fn(), logout: vi.fn(), refreshUser: vi.fn(), setUser: vi.fn(),
    }),
  };
});

const baseClass: FitnessClass = {
  id: 'c1', title: 'Morning Flow Yoga', description: 'A calming flow.',
  categoryId: 'cat1', instructorId: 'i1', roomId: 'r1', image: '',
  date: '2030-01-02', startTime: '2030-01-02T18:00:00.000Z', endTime: '2030-01-02T19:00:00.000Z',
  duration: 60, capacity: 20, price: 0, difficulty: 'ALL_LEVELS', status: 'PUBLISHED',
  cancellationDeadlineHours: 2, waitlistEnabled: true, waitlistLimit: 50, autoPromote: true,
  isRecurring: false, createdAt: '2030-01-01T00:00:00.000Z',
  confirmedCount: 12, waitlistCount: 0, availableSeats: 8, isFull: false,
  category: { id: 'cat1', name: 'Yoga', color: '#84cc16' },
  room: { id: 'r1', name: 'Studio A', location: 'Ground Floor', capacity: 30 },
  instructor: { id: 'i1', name: 'Sarah Khan' },
};

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter>{node}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('ClassCard', () => {
  it('shows class info and available seats', () => {
    wrap(<ClassCard cls={baseClass} />);
    expect(screen.getByText('Morning Flow Yoga')).toBeInTheDocument();
    expect(screen.getByText(/8 spots available/)).toBeInTheDocument();
    expect(screen.getByText(/12\/20 booked/)).toBeInTheDocument();
  });

  it('shows a Full – Join Waitlist badge when the class is full', () => {
    wrap(<ClassCard cls={{ ...baseClass, confirmedCount: 20, availableSeats: 0, isFull: true, waitlistCount: 3 }} />);
    expect(screen.getByText(/Full – Join Waitlist/)).toBeInTheDocument();
    expect(screen.getByText(/20\/20 booked/)).toBeInTheDocument();
  });
});

describe('BookingActions', () => {
  it('offers booking when seats are available', () => {
    wrap(<BookingActions cls={baseClass} />);
    expect(screen.getByRole('button', { name: /Book this class/ })).toBeInTheDocument();
  });

  it('offers the waitlist when the class is full', () => {
    wrap(<BookingActions cls={{ ...baseClass, confirmedCount: 20, availableSeats: 0, isFull: true, waitlistCount: 2 }} />);
    expect(screen.getByRole('button', { name: /Join waitlist/ })).toBeInTheDocument();
  });

  it('opens a confirmation dialog before booking', () => {
    wrap(<BookingActions cls={baseClass} />);
    fireEvent.click(screen.getByRole('button', { name: /Book this class/ }));
    expect(screen.getByText('Confirm your booking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm booking' })).toBeInTheDocument();
  });
});

describe('Login form', () => {
  it('renders email and password fields and validates input', async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    );
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'not-an-email' } });
    const form = screen.getByRole('button', { name: 'Log in' }).closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText(/Enter a valid email/)).toBeInTheDocument();
  });
});
