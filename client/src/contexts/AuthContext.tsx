import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  const { data: authData } = useQuery({
    queryKey: ['/api/auth/status'],
    queryFn: async () => {
      const res = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch auth status');
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: true
  });

  const login = () => {
    // Use relative path to ensure correct domain in both dev and prod
    window.location.href = '/auth/google';
  };

  const logout = async () => {
    try {
      // Use relative path for logout as well
      await fetch('/auth/logout', { credentials: 'include' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    if (authData !== undefined) {
      setIsLoading(false);
    }
  }, [authData]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authData?.isAuthenticated ?? false,
        user: authData?.user ?? null,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}