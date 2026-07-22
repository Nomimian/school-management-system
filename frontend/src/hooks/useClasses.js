import { useState, useEffect } from 'react';
import { classAPI } from '../services/api';

/**
 * Shared source of truth for the school's class list.
 * Returns { classes: [{_id,name,...}], names: ['Grade 6-A', ...], loading, refresh }.
 * Use `names` to populate class dropdowns/filters — never hardcode class arrays.
 */
export function useClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await classAPI.getAll();
      setClasses(res.data || []);
    } catch { /* silent — pages handle empty gracefully */ }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return { classes, names: classes.map(c => c.name), loading, refresh };
}
