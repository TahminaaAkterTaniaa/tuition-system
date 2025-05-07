import { create } from 'zustand';

// Define a custom User interface for our store
interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  image?: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user, error: null }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, error: null }),
}));
