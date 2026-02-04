import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from './api';
import type { User } from './types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const { user } = await authApi.me();
          setUser(user);
        } catch {
          
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (loginInput: string, password: string) => {
    const { user, token: newToken } = await authApi.login(loginInput, password);
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(user);
  };

  const register = async (username: string, email: string, password: string) => {
    const { user, token: newToken } = await authApi.register(username, email, password);
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
