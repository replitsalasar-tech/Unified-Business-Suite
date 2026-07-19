import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TokenUser } from '@workspace/api-client-react';
import { useRefreshToken, useLogoutUser, setAuthTokenGetter } from '@workspace/api-client-react';

interface AuthContextType {
  user: TokenUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: TokenUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TokenUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const refreshMutation = useRefreshToken();
  const logoutMutation = useLogoutUser();

  // Wire up the fetch client interceptor
  useEffect(() => {
    setAuthTokenGetter(() => accessToken);
    return () => setAuthTokenGetter(null);
  }, [accessToken]);

  // Initial load: check for refresh token and try to get a new access token
  useEffect(() => {
    const initializeAuth = async () => {
      const savedRefreshToken = localStorage.getItem('refreshToken');
      const savedUser = localStorage.getItem('user');

      if (savedRefreshToken && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          const res = await refreshMutation.mutateAsync({ data: { refreshToken: savedRefreshToken } });
          setAccessToken(res.accessToken);
        } catch (error) {
          console.error('Failed to refresh token on load', error);
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newAccessToken: string, newRefreshToken: string, newUser: TokenUser) => {
    setAccessToken(newAccessToken);
    setUser(newUser);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await logoutMutation.mutateAsync({ data: { refreshToken } });
      } catch (error) {
        console.error('Logout error', error);
      }
    }
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!accessToken, isLoading, login, logout }}>
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
