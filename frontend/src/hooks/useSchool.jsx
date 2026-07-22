import { createContext, useContext, useState, useEffect } from 'react';
import { schoolAPI } from '../services/api';
import { useAuth } from './useAuth.jsx';

const SchoolContext = createContext(null);

export function SchoolProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [school, setSchool]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSchool = async () => {
    try {
      const res = await schoolAPI.get();
      setSchool(res.data);
    } catch(e) {
      console.warn('School not configured yet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchSchool();
    else setLoading(false);
  }, [isAuthenticated]);

  const refresh = () => fetchSchool();

  // Helpers for stamps/prints
  const getStampUrl  = () => school?.stamp  ? `http://localhost:5000${school.stamp}`  : null;
  const getLogoUrl   = () => school?.logo   ? `http://localhost:5000${school.logo}`   : null;
  const getSchoolName = () => school?.name  || 'School Management System';
  const getPrincipal  = () => school?.principal || 'Principal';

  return (
    <SchoolContext.Provider value={{
      school, loading, refresh,
      getStampUrl, getLogoUrl, getSchoolName, getPrincipal,
    }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
