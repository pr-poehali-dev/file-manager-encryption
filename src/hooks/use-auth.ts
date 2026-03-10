import { create } from 'zustand';
import { auth as authApi, getToken, setToken, clearToken } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
  role: string;
  is_active: boolean;
  created_at: string;
  balance: number;
  currency: string;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
  clearError: () => void;
}

const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: '',
  isAuthenticated: false,
  isAdmin: false,

  login: async (email, password) => {
    set({ loading: true, error: '' });
    try {
      const data = await authApi.login(email, password);
      setToken(data.token);
      set({ user: data.user, isAuthenticated: true, isAdmin: data.user.role === 'admin', loading: false });
    } catch (e: any) {
      set({ error: e.error || 'Ошибка входа', loading: false });
      throw e;
    }
  },

  register: async (email, password, name) => {
    set({ loading: true, error: '' });
    try {
      const data = await authApi.register(email, password, name);
      setToken(data.token);
      set({ user: data.user, isAuthenticated: true, isAdmin: data.user.role === 'admin', loading: false });
    } catch (e: any) {
      set({ error: e.error || 'Ошибка регистрации', loading: false });
      throw e;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    clearToken();
    set({ user: null, isAuthenticated: false, isAdmin: false });
  },

  loadProfile: async () => {
    const token = getToken();
    if (!token) return;
    set({ loading: true });
    try {
      const data = await authApi.profile();
      set({ user: data.user, isAuthenticated: true, isAdmin: data.user.role === 'admin', loading: false });
    } catch {
      clearToken();
      set({ user: null, isAuthenticated: false, isAdmin: false, loading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await authApi.updateProfile(data);
      set({ user: res.user });
    } catch (e: any) {
      set({ error: e.error || 'Ошибка обновления' });
    }
  },

  clearError: () => set({ error: '' }),
}));

export default useAuth;
