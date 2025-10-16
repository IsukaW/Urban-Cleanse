import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/auth/api';
import type { User } from '../services/auth/type';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          const storedUser = authService.getCurrentUser();
          if (storedUser) {
            setUser(storedUser);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      if (response.success) {
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      // Pass through the error message from authService
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    try {
      const response = await authService.register({ name, email, password, role });
      if (response.success) {
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      // Pass through the error message from authService
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
