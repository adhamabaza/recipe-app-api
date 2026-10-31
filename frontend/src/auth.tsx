import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api, authEvent, getToken, setToken, errorMessage } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, updateUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    window.addEventListener(authEvent, changed);
    window.addEventListener('storage', changed);
    return () => {
      window.removeEventListener(authEvent, changed);
      window.removeEventListener('storage', changed);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) {
      updateUser(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api.me().then((profile) => {
      if (active) updateUser(profile);
    }).catch((failure: unknown) => {
      if (active) {
        updateUser(null);
        setError(errorMessage(failure));
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  async function login(email: string, password: string) {
    const result = await api.login(email, password);
    setLoading(true);
    setToken(result.token);
  }

  function logout() {
    updateUser(null);
    setError('');
    setToken(null);
  }

  return <AuthContext.Provider value={{ user, loading, error, login, logout, updateUser, refresh: () => setRevision((value) => value + 1) }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required.');
  return context;
}

export function ProtectedRoute() {
  const { user, loading, error, refresh, logout } = useAuth();
  const location = useLocation();
  if (loading) return <main className="shell"><p role="status">Checking your account…</p></main>;
  if (error && getToken()) return <main className="shell"><p role="alert">{error}</p><button onClick={refresh}>Try again</button> <button className="secondary" onClick={logout}>Back to login</button></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
