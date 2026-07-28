import { useState, useEffect } from 'react';
import { optionSetAPI } from '../services/api';

/**
 * Shared access to the school's configurable dropdown lists (Settings → Dropdown
 * Options). One fetch is shared across every component via a module-level cache,
 * so dozens of dropdowns don't each hit the network.
 *
 *   const { get } = useOptions();
 *   get('bloodGroups', ['A+','B+'])   // returns the list, or the fallback if unset
 */
let cache = null;          // resolved array of option sets
let inflight = null;       // de-dupes concurrent fetches
const listeners = new Set();

async function load(force = false) {
  if (cache && !force) return cache;
  if (!inflight) {
    inflight = optionSetAPI.getAll()
      .then(r => { cache = r.data || []; return cache; })
      .catch(() => { cache = cache || []; return cache; })
      .finally(() => { inflight = null; });
  }
  const data = await inflight;
  listeners.forEach(fn => fn(data));
  return data;
}

export function invalidateOptions() { cache = null; return load(true); }

export function useOptions() {
  const [sets, setSets] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    const onData = (data) => { if (alive) { setSets(data); setLoading(false); } };
    listeners.add(onData);
    load().then(onData);
    return () => { alive = false; listeners.delete(onData); };
  }, []);

  const get = (key, fallback = []) => {
    const set = sets.find(s => s.key === key);
    return set && set.options?.length ? set.options : fallback;
  };

  return { sets, get, loading, refresh: invalidateOptions };
}
