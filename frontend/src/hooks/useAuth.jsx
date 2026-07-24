import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      setUser(JSON.parse(saved));
      // verify token is still valid
      authAPI.me()
        .then(res => { setUser(res.user); localStorage.setItem('user', JSON.stringify(res.user)); })
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Permission check used by nav + route guards. This is a UX layer only — the
  // backend independently enforces the same matrix on every request, so a user
  // who forges access still gets 403s. When permissions haven't loaded yet we
  // stay optimistic (the server remains the gate) to avoid a blank UI flicker.
  const can = (module) => {
    if (!module) return true;
    const perms = user?.permissions;
    if (!Array.isArray(perms)) return true;
    return perms.includes(module);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
