import { useState, useEffect, useRef } from 'react';
import { SERVER_URL } from '../config/env.js';
import { Loader2, Send, Search, X, Users2, Paperclip, FileText, Mail, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Modal, Button, useToast } from './ui';
import { ROLE_LABEL } from '../config/access.js';
import { chatAPI, attachmentAPI, outboundAPI } from '../services/api';

const API_BASE = SERVER_URL;
const fileUrl = (u) => (u?.startsWith('http') ? u : `${API_BASE}${u}`);
const isImg = (t) => String(t || '').startsWith('image/');

const RESULT_TONE = { sent: 'text-emerald-600', simulated: 'text-blue-500', failed: 'text-red-500', 'no-email': 'text-slate-400', 'no-phone': 'text-slate-400' };

// Staff tool: send Email / WhatsApp (with attachments) to selected people.
export default function OutboundCompose({ open, onClose }) {
  const toast = useToast();
  const [status, setStatus]     = useState({ email: false, whatsapp: false });
  const [recipients, setRecipients] = useState([]);
  const [picked, setPicked]     = useState([]);
  const [q, setQ]               = useState('');
  const [channels, setChannels] = useState({ email: true, whatsapp: false });
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [atts, setAtts]         = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');
  const [results, setResults]   = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setResults(null); setErr(''); setPicked([]); setBody(''); setSubject(''); setAtts([]); setQ('');
    outboundAPI.status().then(r => setStatus(r.data)).catch(() => {});
    chatAPI.recipients().then(r => setRecipients(r.data || [])).catch(() => {});
  }, [open]);

  const filtered = recipients.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) && !picked.some(p => p._id === r._id));

  const onAttach = async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try { for (const f of files) { const fd = new FormData(); fd.append('file', f); const r = await attachmentAPI.upload(fd); setAtts(a => [...a, r.data]); } }
    catch (er) { toast.error(er.message); } finally { setUploading(false); }
  };

  const send = async () => {
    setErr('');
    const chans = Object.keys(channels).filter(c => channels[c]);
    if (!picked.length) return setErr('Select at least one recipient.');
    if (!chans.length) return setErr('Choose at least one channel.');
    if (!body.trim() && !atts.length) return setErr('Write a message or attach a file.');
    setBusy(true);
    try {
      const r = await outboundAPI.send({ recipients: picked.map(p => p._id), channels: chans, subject, body, attachments: atts });
      setResults(r.data); toast.success('Messages dispatched');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const ChannelToggle = ({ id, icon: Icon, label }) => {
    const live = status[id];
    const on = channels[id];
    return (
      <button onClick={() => setChannels(c => ({ ...c, [id]: !c[id] }))}
        className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
          ${on ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-primary-50'}`}>
        <Icon size={16}/> {label}
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${on ? 'bg-white/20' : (live ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}`}>
          {live ? 'Live' : 'Sandbox'}
        </span>
      </button>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Email / WhatsApp" size="lg">
      {results ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={18}/> <span className="font-medium">Dispatch complete</span></div>
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50/70 text-left"><th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Recipient</th><th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Email</th><th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">WhatsApp</th></tr></thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-t border-slate-50">
                    <td className="px-3 py-2 text-slate-700">{r.name}</td>
                    <td className={`px-3 py-2 font-medium ${RESULT_TONE[r.email] || 'text-slate-300'}`}>{r.email || '—'}</td>
                    <td className={`px-3 py-2 font-medium ${RESULT_TONE[r.whatsapp] || 'text-slate-300'}`}>{r.whatsapp || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">“Sandbox” means the channel isn't configured yet, so it was simulated (logged) — configure SMTP / WhatsApp in the backend env to send for real.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setResults(null)}>Send another</Button>
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm">{err}</div>}

          {/* Channels */}
          <div className="flex gap-2">
            <ChannelToggle id="email" icon={Mail} label="Email"/>
            <ChannelToggle id="whatsapp" icon={MessageCircle} label="WhatsApp"/>
          </div>

          {/* Recipients */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Recipients</label>
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {picked.map(p => (
                  <span key={p._id} className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                    {p.name} <span className="text-blue-100">· {ROLE_LABEL[p.role] || p.role}</span>
                    <button onClick={() => setPicked(picked.filter(x => x._id !== p._id))} className="hover:bg-white/20 rounded-full p-0.5"><X size={12}/></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff & parents…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200"/>
            </div>
            {q && (
              <div className="mt-2 max-h-40 overflow-y-auto scrollbar-thin border border-slate-100 rounded-xl">
                {filtered.length === 0 ? <div className="p-3 text-sm text-slate-400 flex items-center gap-2"><Users2 size={14}/> No matches.</div>
                  : filtered.slice(0, 30).map(u => (
                    <button key={u._id} onClick={() => { setPicked([...picked, u]); setQ(''); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-50 text-left border-b border-slate-50 last:border-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                      <span className="text-sm text-slate-700">{u.name} <span className="text-xs text-slate-400">· {ROLE_LABEL[u.role] || u.role}</span></span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (email)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Write your message…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-y"/>

          {/* Attachments */}
          <div>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={onAttach} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"/>
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {uploading ? <Loader2 size={14} className="animate-spin"/> : <Paperclip size={14}/>} Attach files
              </button>
              {atts.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs pl-2 pr-1 py-1 rounded-lg">
                  {isImg(a.type) ? <img src={fileUrl(a.url)} alt="" className="w-5 h-5 rounded object-cover"/> : <FileText size={13}/>}
                  <span className="truncate max-w-[120px]">{a.name}</span>
                  <button onClick={() => setAtts(atts.filter((_, j) => j !== i))} className="hover:bg-slate-200 rounded p-0.5"><X size={12}/></button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon={busy ? Loader2 : Send} loading={busy} onClick={send}>Send</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
