import { create } from 'zustand';

interface AuthState {
    user: any | null;
    isAuthenticated: boolean;
    login: (user: any, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: !!localStorage.getItem('access_token'),
    login: (user, token) => {
        localStorage.setItem('access_token', token);
        set({ user, isAuthenticated: true });
    },
    logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, isAuthenticated: false });
    },
}));
