import { createContext, useContext, useState, useEffect } from 'react';
import { noticeAPI } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Fee payments pending approval', text: '5 fee payments pending approval', detail: 'There are 5 fee payments awaiting your approval. Review and confirm them in the Fee Management section to update collection records.', time: '2m ago', read: false, type: 'warning', link: '/fees' },
    { id: 2, title: 'New admission request', text: 'New admission request received', detail: 'A new admission application has been submitted. Open Admissions to review the applicant details and move them through the pipeline.', time: '15m ago', read: false, type: 'info', link: '/admissions' },
    { id: 3, title: 'Exam schedule uploaded', text: 'Exam schedule uploaded', detail: 'The examination schedule has been published. You can view or edit the exams and generate result cards from the Examinations section.', time: '1h ago', read: true, type: 'info', link: '/exams' },
    { id: 4, title: 'Monthly attendance report ready', text: 'Monthly attendance report ready', detail: 'The monthly attendance report has been generated and is ready to review in Reports & Analytics.', time: '2h ago', read: true, type: 'success', link: '/reports' },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, read: true })));
  const markRead = (id) => setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));

  return (
    <AppContext.Provider value={{ sidebarOpen, setSidebarOpen, notifications, unreadCount, markAllRead, markRead }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
