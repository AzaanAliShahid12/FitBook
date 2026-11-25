import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute';

import Landing from '@/pages/public/Landing';
import Login from '@/pages/public/Login';
import Register from '@/pages/public/Register';
import ForgotPassword from '@/pages/public/ForgotPassword';
import ResetPassword from '@/pages/public/ResetPassword';
import VerifyEmail from '@/pages/public/VerifyEmail';
import Explore from '@/pages/public/Explore';
import ClassDetails from '@/pages/public/ClassDetails';

import MemberDashboard from '@/pages/member/Dashboard';
import MyBookings from '@/pages/member/MyBookings';
import MyWaitlist from '@/pages/member/MyWaitlist';
import CalendarPage from '@/pages/member/Calendar';
import Notifications from '@/pages/member/Notifications';
import Profile from '@/pages/member/Profile';
import Settings from '@/pages/member/Settings';

import InstructorDashboard from '@/pages/instructor/Dashboard';
import InstructorClasses from '@/pages/instructor/MyClasses';

import AdminDashboard from '@/pages/admin/Dashboard';
import ManageClasses from '@/pages/admin/ManageClasses';
import AdminBookings from '@/pages/admin/Bookings';
import AdminWaitlist from '@/pages/admin/Waitlist';
import AdminMembers from '@/pages/admin/Members';
import AdminInstructors from '@/pages/admin/Instructors';
import AdminRooms from '@/pages/admin/Rooms';
import AdminAnalytics from '@/pages/admin/Analytics';
import AdminReports from '@/pages/admin/Reports';

function Shell({ children, roles }: { children: React.ReactNode; roles?: ('ADMIN' | 'INSTRUCTOR' | 'MEMBER')[] }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Explore + details use the app shell when logged in, plain pages when not */}
      <Route path="/explore" element={<ExploreOrShell />} />
      <Route path="/classes/:id" element={<ClassDetailsOrShell />} />

      {/* Member */}
      <Route path="/dashboard" element={<Shell roles={['MEMBER']}><MemberDashboard /></Shell>} />
      <Route path="/bookings" element={<Shell roles={['MEMBER']}><MyBookings /></Shell>} />
      <Route path="/waitlist" element={<Shell roles={['MEMBER']}><MyWaitlist /></Shell>} />

      {/* Shared (all roles) */}
      <Route path="/calendar" element={<Shell><CalendarPage /></Shell>} />
      <Route path="/notifications" element={<Shell><Notifications /></Shell>} />
      <Route path="/profile" element={<Shell><Profile /></Shell>} />
      <Route path="/settings" element={<Shell><Settings /></Shell>} />

      {/* Instructor */}
      <Route path="/instructor" element={<Shell roles={['INSTRUCTOR']}><InstructorDashboard /></Shell>} />
      <Route path="/instructor/classes" element={<Shell roles={['INSTRUCTOR']}><InstructorClasses /></Shell>} />

      {/* Admin */}
      <Route path="/admin" element={<Shell roles={['ADMIN']}><AdminDashboard /></Shell>} />
      <Route path="/admin/classes" element={<Shell roles={['ADMIN']}><ManageClasses /></Shell>} />
      <Route path="/admin/bookings" element={<Shell roles={['ADMIN']}><AdminBookings /></Shell>} />
      <Route path="/admin/waitlist" element={<Shell roles={['ADMIN']}><AdminWaitlist /></Shell>} />
      <Route path="/admin/members" element={<Shell roles={['ADMIN']}><AdminMembers /></Shell>} />
      <Route path="/admin/instructors" element={<Shell roles={['ADMIN']}><AdminInstructors /></Shell>} />
      <Route path="/admin/rooms" element={<Shell roles={['ADMIN']}><AdminRooms /></Shell>} />
      <Route path="/admin/analytics" element={<Shell roles={['ADMIN']}><AdminAnalytics /></Shell>} />
      <Route path="/admin/reports" element={<Shell roles={['ADMIN']}><AdminReports /></Shell>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useAuth } from '@/contexts/AuthContext';
function ExploreOrShell() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? (
    <AppLayout><Explore /></AppLayout>
  ) : (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><Explore /></div>
  );
}
function ClassDetailsOrShell() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? (
    <AppLayout><ClassDetails /></AppLayout>
  ) : (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><ClassDetails /></div>
  );
}
