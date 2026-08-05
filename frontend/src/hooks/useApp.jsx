import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

// App-wide UI state. Notifications are NOT kept here — the bell (<NotificationBell>)
// is fully API-backed and owns its own state, so this only holds shared UI chrome.
export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  return (
    <AppContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
