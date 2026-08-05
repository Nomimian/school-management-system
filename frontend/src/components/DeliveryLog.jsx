import { useState, useEffect, useCallback } from 'react';
import { Mail, MessageCircle, Smartphone, RefreshCw, CheckCircle2, XCircle, MinusCircle, FlaskConical, Inbox } from 'lucide-react';
import { Modal, Button } from './ui';
import { outboundAPI } from '../services/api';

// Delivery-log viewer — a read-only window over the backend MessageLog: every
// external Email / WhatsApp / SMS the system attempted (manual broadcasts +
// automated absence / fee reminders), with the outcome. Answers "was the parent
// actually notified?". Data comes from GET /api/outbound/log.

const CHANNEL = {
  email:    { label: 'Email',    Icon: Mail },
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle },
  sms:      { label: 'SMS',      Icon: Smartphone },
};
const STATUS = {
  sent:      { label: 'Sent',      Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  simulated: { label: 'Simulated', Icon: FlaskConical, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  failed:    { label: 'Failed',    Icon: XCircle,      cls: 'bg-red-50 text-red-600 border-red-200' },
  skipped:   { label: 'Skipped',   Icon: MinusCircle,  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};
const EVENT = { outbound: 'Broadcast', absence: 'Absence', 'fee-reminder': 'Fee reminder', notification: 'Notification' };

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
};

const selectCls = 'px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200';

export default function DeliveryLog({ open, onClose }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState('');
  const [status, setStatus]   = useState('');
  const [event, setEvent]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (channel) params.channel = channel;
      if (status)  params.status  = status;
      if (event)   params.event   = event;
      const r = await outboundAPI.log(params);
      setItems(r.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [channel, status, event]);

  useEffect(() => { if (open) load(); }, [open, load]);

  return (
    <Modal open={open} onClose={onClose} title="Delivery log" size="xl">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={channel} onChange={e => setChannel(e.target.value)} className={selectCls} aria-label="Filter by channel">
            <option value="">All channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="simulated">Simulated</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
          <select value={event} onChange={e => setEvent(e.target.value)} className={selectCls} aria-label="Filter by event">
            <option value="">All events</option>
            <option value="outbound">Broadcast</option>
            <option value="absence">Absence</option>
            <option value="fee-reminder">Fee reminder</option>
          </select>
          <Button variant="secondary" size="sm" icon={RefreshCw} loading={loading} onClick={load}>Refresh</Button>
          <span className="ml-auto text-xs text-slate-400">{items.length} record{items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto max-h-[55vh] overflow-y-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left sticky top-0 z-10">
                  {['When', 'Recipient', 'Channel', 'Event', 'Status', 'Detail'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-slate-400">
                      <Inbox size={26} className="mx-auto mb-2 opacity-70"/>
                      {loading ? 'Loading…' : 'No delivery records yet.'}
                    </td>
                  </tr>
                ) : items.map(n => {
                  const ch = CHANNEL[n.channel] || { label: n.channel, Icon: Mail };
                  const st = STATUS[n.status] || { label: n.status, Icon: MinusCircle, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                  const who = n.name || n.student?.name || n.user?.name || n.to || '—';
                  const detail = (n.status === 'failed' || n.status === 'skipped') ? n.error : n.providerId;
                  return (
                    <tr key={n._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap" title={new Date(n.createdAt).toLocaleString()}>{timeAgo(n.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-slate-700 font-medium truncate max-w-[180px]">{who}</div>
                        {n.to && <div className="text-xs text-slate-400 truncate max-w-[180px]">{n.to}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 whitespace-nowrap"><ch.Icon size={14} className="text-slate-400"/> {ch.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{EVENT[n.event] || n.event}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${st.cls}`}>
                          <st.Icon size={12}/> {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[220px] truncate" title={detail || ''}>{detail || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          “Simulated” means that channel isn’t configured yet, so the message was logged only — configure SMTP / WhatsApp / Twilio in the backend to send for real. Records are kept for 180 days.
        </p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
