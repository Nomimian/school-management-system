import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, AlertTriangle, Info, CheckCircle2, MessageSquare } from 'lucide-react';
import { notificationAPI } from '../services/api';

const ICON = {
  warning: { Icon: AlertTriangle, tint: 'bg-amber-50',   color: 'text-amber-500' },
  info:    { Icon: Info,          tint: 'bg-blue-50',    color: 'text-blue-500' },
  success: { Icon: CheckCircle2,  tint: 'bg-emerald-50', color: 'text-emerald-500' },
  message: { Icon: MessageSquare, tint: 'bg-purple-50',  color: 'text-purple-500' },
};
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
};

// Self-contained notification bell backed by the API (polls every 20s).
// `dark` renders the trigger for a dark header (parent portal).
export default function NotificationBell({ dark = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const loadCount = useCallback(async () => {
    try { const r = await notificationAPI.unreadCount(); setUnread(r.count || 0); } catch { /* ignore */ }
  }, []);
  const loadList = useCallback(async () => {
    try { const r = await notificationAPI.list(); setItems(r.data || []); } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCount(); const t = setInterval(loadCount, 20000); return () => clearInterval(t); }, [loadCount]);
  useEffect(() => { if (open) loadList(); }, [open, loadList]);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => { await notificationAPI.markAllRead(); setItems(i => i.map(x => ({ ...x, read: true }))); setUnread(0); };
  const openItem = async (n) => {
    if (!n.read) { try { await notificationAPI.markRead(n._id); } catch {} setUnread(u => Math.max(0, u - 1)); setItems(i => i.map(x => x._id === n._id ? { ...x, read: true } : x)); }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label="Notifications"
        className={`relative p-2.5 rounded-xl transition-colors ${dark ? 'text-white hover:bg-white/15' : 'text-slate-500 hover:bg-primary-50 hover:text-primary-700'}`}>
        <Bell size={18}/>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-float border border-slate-100 z-50 text-slate-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-display font-semibold text-sm">Notifications</span>
            {items.some(n => !n.read) && (
              <button onClick={markAll} className="text-primary-600 text-xs flex items-center gap-1"><Check size={12}/> Mark all read</button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto scrollbar-thin">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">No notifications</li>}
            {items.map(n => {
              const st = ICON[n.type] || ICON.info;
              return (
                <li key={n._id}>
                  <button onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 flex gap-3 items-start hover:bg-primary-50/60 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}>
                    <span className={`w-8 h-8 rounded-xl ${st.tint} flex items-center justify-center flex-shrink-0`}><st.Icon size={15} className={st.color}/></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 font-medium truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
