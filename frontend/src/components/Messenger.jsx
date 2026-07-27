import { useState, useEffect, useRef, useCallback } from 'react';
import { SERVER_URL } from '../config/env.js';
import {
  Loader2, Send, Plus, Search, ArrowLeft, MessageSquare, X, Users2, Paperclip, FileText, Download,
} from 'lucide-react';
import { Card, Button, Modal, useToast } from './ui';
import { useAuth } from '../hooks/useAuth.jsx';
import { ROLE_LABEL } from '../config/access.js';
import { chatAPI, attachmentAPI } from '../services/api';

const API_BASE = SERVER_URL;
const fileUrl = (u) => (u?.startsWith('http') ? u : `${API_BASE}${u}`);
const isImg = (t) => String(t || '').startsWith('image/');

function Attachments({ items, mine }) {
  if (!items?.length) return null;
  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {items.map((a, i) => isImg(a.type) ? (
        <a key={i} href={fileUrl(a.url)} target="_blank" rel="noreferrer" className="block">
          <img src={fileUrl(a.url)} alt={a.name} className="max-w-[220px] max-h-52 rounded-lg border border-black/10 object-cover"/>
        </a>
      ) : (
        <a key={i} href={fileUrl(a.url)} target="_blank" rel="noreferrer" download
          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs max-w-[240px] ${mine ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          <FileText size={14} className="flex-shrink-0"/>
          <span className="truncate flex-1">{a.name}</span>
          <Download size={13} className="flex-shrink-0"/>
        </a>
      ))}
    </div>
  );
}

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
};
const titleOf = (c, meId) => {
  if (c.subject) return c.subject;
  const others = (c.others || c.participants || []).filter(p => String(p._id) !== String(meId));
  return others.map(p => p.name).join(', ') || 'Conversation';
};

export default function Messenger() {
  const { user } = useAuth();
  const meId = user?.id;
  const toast = useToast();

  const [convos, setConvos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread]     = useState(null);   // { conversation, messages }
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [pending, setPending]   = useState([]);   // uploaded attachments awaiting send
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  const loadConvos = useCallback(async () => {
    try { const r = await chatAPI.conversations(); setConvos(r.data || []); }
    catch (e) { /* silent on poll */ }
    finally { setLoading(false); }
  }, []);

  const loadThread = useCallback(async (id, quiet) => {
    if (!quiet) setLoadingThread(true);
    try { const r = await chatAPI.getConvo(id); setThread(r.data); }
    catch (e) { toast.error(e.message); setActiveId(null); }
    finally { setLoadingThread(false); }
  }, [toast]);

  // Initial + poll the inbox every 15s.
  useEffect(() => { loadConvos(); const t = setInterval(loadConvos, 15000); return () => clearInterval(t); }, [loadConvos]);

  // Load + poll the open thread every 8s.
  useEffect(() => {
    setPending([]); setDraft('');
    if (!activeId) { setThread(null); return; }
    loadThread(activeId);
    const t = setInterval(() => loadThread(activeId, true), 8000);
    return () => clearInterval(t);
  }, [activeId, loadThread]);

  // Auto-scroll to newest message.
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [thread?.messages?.length]);

  const openConvo = (id) => setActiveId(id);

  const send = async () => {
    const body = draft.trim();
    if ((!body && !pending.length) || !activeId) return;
    const atts = pending;
    setSending(true); setDraft(''); setPending([]);
    try {
      await chatAPI.sendMessage(activeId, body, atts);
      await loadThread(activeId, true);
      loadConvos();
    } catch (e) { toast.error(e.message); setDraft(body); setPending(atts); }
    finally { setSending(false); }
  };

  const onAttach = async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData(); fd.append('file', f);
        const r = await attachmentAPI.upload(fd);
        setPending((p) => [...p, r.data]);
      }
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const onCreated = async (convo) => {
    setComposeOpen(false);
    await loadConvos();
    setActiveId(convo._id);
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex h-[calc(100vh-230px)] min-h-[420px]">
        {/* Conversation list */}
        <div className={`w-full sm:w-80 border-r border-slate-100 flex-col ${activeId ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-display font-bold text-slate-800">Messages</span>
            <Button size="sm" variant="primary" icon={Plus} onClick={() => setComposeOpen(true)}>New</Button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex items-center gap-2 justify-center text-slate-400 py-10 text-sm"><Loader2 size={15} className="animate-spin"/> Loading…</div>
            ) : convos.length === 0 ? (
              <div className="text-center text-slate-400 py-12 px-4 text-sm">
                <MessageSquare size={26} className="mx-auto mb-2 text-slate-300"/>
                No conversations yet. Start one with “New”.
              </div>
            ) : convos.map(c => (
              <button key={c._id} onClick={() => openConvo(c._id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-primary-50/50 transition-colors ${activeId === c._id ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 text-sm truncate flex-1">{titleOf(c, meId)}</span>
                  {c.unread > 0 && <span className="bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{c.unread}</span>}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{c.lastMessage || 'No messages yet'}</div>
                <div className="text-[10px] text-slate-300 mt-0.5">{timeAgo(c.lastMessageAt)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className={`flex-1 flex-col ${activeId ? 'flex' : 'hidden sm:flex'}`}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare size={34} className="mb-3 text-slate-300"/>
              <p className="text-sm">Select a conversation to read messages.</p>
            </div>
          ) : loadingThread ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-primary-600"/></div>
          ) : thread && (
            <>
              <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                <button className="sm:hidden text-slate-400" onClick={() => setActiveId(null)}><ArrowLeft size={18}/></button>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{titleOf(thread.conversation, meId)}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {(thread.conversation.participants || []).filter(p => String(p._id) !== String(meId)).map(p => `${p.name} (${ROLE_LABEL[p.role] || p.role})`).join(', ')}
                    {thread.conversation.aboutStudent && ` · about ${thread.conversation.aboutStudent.name}`}
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-slate-50/40">
                {thread.messages.map(m => {
                  const mine = String(m.sender?._id) === String(meId);
                  return (
                    <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white text-slate-700 rounded-bl-md border border-slate-100'}`}>
                        {!mine && <div className="text-[11px] font-semibold text-primary-600 mb-0.5">{m.sender?.name}</div>}
                        {m.body && <div className="leading-relaxed whitespace-pre-wrap break-words">{m.body}</div>}
                        <Attachments items={m.attachments} mine={mine}/>
                        <div className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{timeAgo(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
                {thread.messages.length === 0 && <div className="text-center text-slate-400 text-sm py-8">No messages yet — say hello 👋</div>}
              </div>

              <div className="border-t border-slate-100">
                {pending.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 pt-3">
                    {pending.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs pl-2 pr-1 py-1 rounded-lg">
                        {isImg(a.type) ? <img src={fileUrl(a.url)} alt="" className="w-5 h-5 rounded object-cover"/> : <FileText size={13}/>}
                        <span className="truncate max-w-[120px]">{a.name}</span>
                        <button onClick={() => setPending(p => p.filter((_, j) => j !== i))} className="hover:bg-slate-200 rounded p-0.5"><X size={12}/></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="p-3 flex items-end gap-2">
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={onAttach}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"/>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach file"
                    className="p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50">
                    {uploading ? <Loader2 size={18} className="animate-spin"/> : <Paperclip size={18}/>}
                  </button>
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1} placeholder="Type a message…"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    className="flex-1 resize-none px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 max-h-28"/>
                  <Button variant="primary" icon={sending ? Loader2 : Send} loading={sending} onClick={send} disabled={!draft.trim() && !pending.length}>Send</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} onCreated={onCreated}/>}
    </Card>
  );
}

// ── New conversation modal ───────────────────────────────────────────────────
function ComposeModal({ onClose, onCreated }) {
  const toast = useToast();
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    chatAPI.recipients().then(r => setRecipients(r.data || [])).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  const filtered = recipients.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) && !picked.some(p => p._id === r._id));
  const toggle = (u) => setPicked([...picked, u]);
  const remove = (id) => setPicked(picked.filter(p => p._id !== id));

  const create = async () => {
    setErr('');
    if (!picked.length) return setErr('Choose at least one recipient.');
    if (!body.trim()) return setErr('Write a message.');
    setBusy(true);
    try {
      const r = await chatAPI.createConvo({ participants: picked.map(p => p._id), subject, body });
      toast.success('Message sent'); onCreated(r.data);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="New Message">
      {err && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm mb-4">{err}</div>}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">To</label>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {picked.map(p => (
                <span key={p._id} className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                  {p.name} <span className="text-blue-100">· {ROLE_LABEL[p.role] || p.role}</span>
                  <button onClick={() => remove(p._id)} className="hover:bg-white/20 rounded-full p-0.5"><X size={12}/></button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto scrollbar-thin border border-slate-100 rounded-xl">
            {loading ? <div className="p-3 text-sm text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Loading…</div>
              : filtered.length === 0 ? <div className="p-3 text-sm text-slate-400 flex items-center gap-2"><Users2 size={14}/> No people found.</div>
              : filtered.slice(0, 30).map(u => (
                <button key={u._id} onClick={() => toggle(u)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-50 text-left border-b border-slate-50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                  <div className="text-sm text-slate-700">{u.name} <span className="text-xs text-slate-400">· {ROLE_LABEL[u.role] || u.role}</span></div>
                </button>
              ))}
          </div>
        </div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (optional)"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200"/>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Write your message…"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-y"/>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={busy ? Loader2 : Send} loading={busy} onClick={create}>Send Message</Button>
      </div>
    </Modal>
  );
}
