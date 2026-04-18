/**
 * Auth store — manages authentication state via Zustand.
 * Persists token to localStorage for session continuity.
 */

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar: string | null;
  bio: string;
  date_joined: string;
  follower_count?: number;
  following_count?: number;
  blog_count?: number;
  is_journalist?: boolean;
}

const JOURNALIST_ROLES = ['JOURNALIST', 'EDITOR', 'ADMIN', 'SUPERADMIN'];

function enrichUser(user: AuthUser): AuthUser {
  return { ...user, is_journalist: JOURNALIST_ROLES.includes(user.role) };
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (perm: string) => boolean;
}

const ROLE_HIERARCHY = ['READER', 'JOURNALIST', 'EDITOR', 'ADMIN', 'SUPERADMIN'];

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('mp_token'),
  isAuthenticated: !!localStorage.getItem('mp_token'),
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem('mp_token', token);
    set({ user: enrichUser(user), token, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    localStorage.removeItem('mp_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  hasPermission: (requiredRole: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'SUPERADMIN') return true;
    const userLevel = ROLE_HIERARCHY.indexOf(user.role);
    const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
    return userLevel >= requiredLevel;
  },
}));
