import { createContext, useContext, useState, useEffect } from 'react';
import { saAPI } from '../services/saApi.js';

const SAContext = createContext(null);

export function SAProvider({ children }) {
  const [saUser, setSaUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    const saved = localStorage.getItem('sa_user');
    if (token && saved) {
      setSaUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await saAPI.login({ email, password });
    localStorage.setItem('sa_token', res.token);
    localStorage.setItem('sa_user', JSON.stringify(res.user));
    setSaUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    setSaUser(null);
  };

  // Impersonate a school — saves school token and redirects to main app
  const impersonate = async (schoolId) => {
    const res = await saAPI.impersonate(schoolId);
    // Save as main app token
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    if (res.school) localStorage.setItem('school', JSON.stringify(res.school));
    // Redirect to the school app (mounted at the site root)
    window.location.href = '/';
  };

  return (
    <SAContext.Provider value={{
      saUser, loading,
      isAuthenticated: !!saUser,
      login, logout, impersonate,
    }}>
      {children}
    </SAContext.Provider>
  );
}

export function useSA() {
  return useContext(SAContext);
}
