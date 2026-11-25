import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api, tokenStore } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; confirmPassword: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.access) { setUser(null); setLoading(false); return; }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
      connectSocket();
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshUser(); }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: u, accessToken, refreshToken } = res.data.data;
    tokenStore.set(accessToken, refreshToken);
    setUser(u);
    connectSocket();
    return u as User;
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; confirmPassword: string; phone?: string }) => {
    const res = await api.post('/auth/register', data);
    const { user: u, accessToken, refreshToken } = res.data.data;
    tokenStore.set(accessToken, refreshToken);
    setUser(u);
    connectSocket();
    return u as User;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', { refreshToken: tokenStore.refresh }); } catch { /* ignore */ }
    tokenStore.clear();
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function homePathForRole(role?: string) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'INSTRUCTOR') return '/instructor';
  return '/dashboard';
}
