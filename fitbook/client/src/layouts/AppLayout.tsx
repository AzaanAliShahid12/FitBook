import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Compass, CalendarCheck, ListOrdered, CalendarDays, Bell, User as UserIcon,
  Settings, LogOut, Menu, X, Moon, Sun, Search, Dumbbell, Users, GraduationCap, DoorOpen,
  BarChart3, FileBarChart, ClipboardList, ChevronDown,
} from 'lucide-react';
import { useAuth, homePathForRole } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { NotificationBell } from '@/components/NotificationBell';
import { useRealtime } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';

interface NavItem { to: string; label: string; icon: ReactNode; }

function navForRole(role?: string): NavItem[] {
  if (role === 'ADMIN') {
    return [
      { to: '/admin', label: 'Admin Dashboard', icon: <LayoutDashboard /> },
      { to: '/admin/classes', label: 'Manage Classes', icon: <Dumbbell /> },
      { to: '/admin/bookings', label: 'Bookings', icon: <ClipboardList /> },
      { to: '/admin/waitlist', label: 'Waitlist', icon: <ListOrdered /> },
      { to: '/admin/members', label: 'Members', icon: <Users /> },
      { to: '/admin/instructors', label: 'Instructors', icon: <GraduationCap /> },
      { to: '/admin/rooms', label: 'Rooms & Categories', icon: <DoorOpen /> },
      { to: '/admin/analytics', label: 'Analytics', icon: <BarChart3 /> },
      { to: '/admin/reports', label: 'Reports', icon: <FileBarChart /> },
      { to: '/notifications', label: 'Notifications', icon: <Bell /> },
      { to: '/profile', label: 'Profile', icon: <UserIcon /> },
      { to: '/settings', label: 'Settings', icon: <Settings /> },
    ];
  }
  if (role === 'INSTRUCTOR') {
    return [
      { to: '/instructor', label: 'Dashboard', icon: <LayoutDashboard /> },
      { to: '/instructor/classes', label: 'My Classes', icon: <Dumbbell /> },
      { to: '/calendar', label: 'Schedule', icon: <CalendarDays /> },
      { to: '/explore', label: 'Explore Classes', icon: <Compass /> },
      { to: '/notifications', label: 'Notifications', icon: <Bell /> },
      { to: '/profile', label: 'Profile', icon: <UserIcon /> },
      { to: '/settings', label: 'Settings', icon: <Settings /> },
    ];
  }
  return [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { to: '/explore', label: 'Explore Classes', icon: <Compass /> },
    { to: '/bookings', label: 'My Bookings', icon: <CalendarCheck /> },
    { to: '/waitlist', label: 'My Waitlist', icon: <ListOrdered /> },
    { to: '/calendar', label: 'Calendar', icon: <CalendarDays /> },
    { to: '/notifications', label: 'Notifications', icon: <Bell /> },
    { to: '/profile', label: 'Profile', icon: <UserIcon /> },
    { to: '/settings', label: 'Settings', icon: <Settings /> },
  ];
}

function mobileNavForRole(role?: string): NavItem[] {
  if (role === 'ADMIN') {
    return [
      { to: '/admin', label: 'Home', icon: <LayoutDashboard /> },
      { to: '/admin/classes', label: 'Classes', icon: <Dumbbell /> },
      { to: '/admin/bookings', label: 'Bookings', icon: <ClipboardList /> },
      { to: '/admin/waitlist', label: 'Waitlist', icon: <ListOrdered /> },
    ];
  }
  if (role === 'INSTRUCTOR') {
    return [
      { to: '/instructor', label: 'Home', icon: <LayoutDashboard /> },
      { to: '/instructor/classes', label: 'Classes', icon: <Dumbbell /> },
      { to: '/calendar', label: 'Schedule', icon: <CalendarDays /> },
      { to: '/explore', label: 'Explore', icon: <Compass /> },
    ];
  }
  return [
    { to: '/dashboard', label: 'Home', icon: <LayoutDashboard /> },
    { to: '/explore', label: 'Explore', icon: <Compass /> },
    { to: '/bookings', label: 'Bookings', icon: <CalendarCheck /> },
    { to: '/waitlist', label: 'Waitlist', icon: <ListOrdered /> },
  ];
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navForRole(user?.role);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-2 pt-6">
        <Link to={homePathForRole(user?.role)} onClick={onNavigate}><Logo /></Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/dashboard' || item.to === '/instructor'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition [&_svg]:h-[18px] [&_svg]:w-[18px]',
                isActive ? 'bg-lime-500/15 font-semibold text-lime-800 dark:text-lime-300' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            {item.icon} {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name ?? 'User'} src={user?.profileImage} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user?.name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{user?.role.toLowerCase()} account</p>
          </div>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useRealtime();

  useEffect(() => { setDrawer(false); }, [location.pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const mobileItems = mobileNavForRole(user?.role);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-card lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-zinc-950/60" onClick={() => setDrawer(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-72 bg-card shadow-2xl">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-5 rounded-full p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <button className="rounded-full p-2 hover:bg-secondary lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Link to={homePathForRole(user?.role)} className="lg:hidden"><Logo compact /></Link>
            <form
              className="relative mx-auto hidden w-full max-w-md sm:block"
              onSubmit={(e) => { e.preventDefault(); navigate(`/explore${search ? `?q=${encodeURIComponent(search)}` : ''}`); }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search classes, categories…"
                className="h-10 w-full rounded-full border bg-background pl-9 pr-4 text-sm outline-none transition focus:border-lime-500 focus:ring-2 focus:ring-lime-500/25"
              />
            </form>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <button onClick={toggle} className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Toggle theme">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <NotificationBell />
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center gap-1 rounded-full p-1 hover:bg-secondary">
                  <Avatar name={user?.name ?? 'User'} src={user?.profileImage} className="h-9 w-9" />
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                </button>
                {profileOpen && (
                  <div className="animate-fade-in absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border bg-card py-1.5 shadow-xl">
                    <div className="border-b px-4 py-2.5">
                      <p className="truncate text-sm font-bold">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm hover:bg-secondary">Profile</Link>
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm hover:bg-secondary">Settings</Link>
                    <LogoutButton />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children ?? <Outlet />}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="grid grid-cols-5">
            {mobileItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/dashboard' || item.to === '/instructor'}
                className={({ isActive }) =>
                  cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium [&_svg]:h-5 [&_svg]:w-5',
                    isActive ? 'text-lime-700 dark:text-lime-400' : 'text-muted-foreground')
                }
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
            <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground">
              <Menu className="h-5 w-5" /> More
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <button
      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-secondary"
      onClick={async () => { await logout(); navigate('/login'); }}
    >
      Log out
    </button>
  );
}
