import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_CREDENTIALS: Record<string, string> = {
  leo: '2225',
  cristina: 'biomag2026',
  testuser: 'biomag',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('biomag_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        const savedUsername = parsedUser?.username?.trim().toLowerCase();
        if (savedUsername && savedUsername in VALID_CREDENTIALS) {
          setUser({ ...parsedUser, username: savedUsername, isAuthenticated: true });
        } else {
          localStorage.removeItem('biomag_user');
        }
      } catch {
        localStorage.removeItem('biomag_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    const normalizedUsername = username.trim().toLowerCase();
    const expectedPassword = VALID_CREDENTIALS[normalizedUsername];

    if (expectedPassword && password === expectedPassword) {
      const newUser: User = { username: normalizedUsername, isAuthenticated: true };
      setUser(newUser);
      localStorage.setItem('biomag_user', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('biomag_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
