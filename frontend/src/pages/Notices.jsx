import { useState, useEffect, useMemo } from 'react';
import { Plus, Bell, Trash2, Pencil, Eye } from 'lucide-react';
import { noticeAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, EmptyState, Skeleton, useToast, useConfirm } from '../components/ui';
import { useAuth } from '../hooks/useAuth.jsx';

const priorityColors = { High:'red', Medium:'orange', Low:'blue' };
const audienceColors = { All:'purple', Students:'blue', Parents:'green', Teachers:'orange' };
const AUDIENCES = ['All','Students','Parents','Teachers'];
const PRIORITIES = ['High','Medium','Low'];

const emptyForm = (author) => ({ title:'', content:'', audience:'All', priority:'Medium', author: author || '' });

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="font-medium text-slate-700 mt-1">{children}</div>
    </div>
  );
}

export default function Notices() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState(null); // notice being edited, or null for create
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm]       = useState(emptyForm(user?.name));
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchNotices = async () => {
    setLoading(true);
    try { const res = await noticeAPI.getAll(); setNotices(res.data||[]); }
    catch(e) { console.error(e); toast.error(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchNotices(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm(user?.name)); setModal(true); };
  const openEdit = (n) => {
    setEditing(n);
    setForm({ title:n.title||'', content:n.content||'', audience:n.audience||'All', priority:n.priority||'Medium', author:n.author||user?.name||'' });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) { await noticeAPI.update(editing._id, form); toast.success('Notice updated'); }
      else { await noticeAPI.create(form); toast.success('Notice published'); }
      setModal(false); setEditing(null); setForm(emptyForm(user?.name)); fetchNotices();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async (n) => {
    const ok = await confirm({ title:'Delete notice?', message:`"${n.title}" will be permanently removed.`, tone:'danger', confirmText:'Delete' });
    if (!ok) return;
    try { await noticeAPI.delete(n._id); toast.success('Notice deleted'); fetchNotices(); }
    catch(e) { toast.error(e.message); }
  };

  const filtered = useMemo(() => notices.filter(n =>
    (audienceFilter==='All' || n.audience===audienceFilter) &&
    (priorityFilter==='All' || n.priority===priorityFilter)
  ), [notices, audienceFilter, priorityFilter]);

  const selectCls = 'px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200';

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Notices & Announcements"
        subtitle={`${notices.length} notices published`}
        action={<Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>New Notice</Button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audience</span>
          <select value={audienceFilter} onChange={e=>setAudienceFilter(e.target.value)} className={selectCls}>
            {['All',...AUDIENCES.filter(a=>a!=='All')].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</span>
          <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className={selectCls}>
            <option value="All">All</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({length:4}).map((_,i) => (
            <Card key={i} className="p-5"><div className="flex items-start gap-4">
              <Skeleton className="w-10 h-10 rounded-2xl"/>
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3"/><Skeleton className="h-3 w-2/3"/><Skeleton className="h-3 w-1/4"/></div>
            </div></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell}
          title={notices.length===0 ? 'No notices yet' : 'No notices match these filters'}
          subtitle={notices.length===0 ? 'Publish your first announcement to keep everyone informed.' : 'Try changing the audience or priority filter.'}
          action={notices.length===0 ? <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>New Notice</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(n => (
            <Card key={n._id} hover className="p-5">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.priority==='High' ? 'bg-red-100' : n.priority==='Medium' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  <Bell size={18} className={n.priority==='High' ? 'text-red-500' : n.priority==='Medium' ? 'text-orange-500' : 'text-blue-500'}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-slate-800">{n.title}</h3>
                    <Badge variant={priorityColors[n.priority]||'gray'} dot>{n.priority}</Badge>
                    <Badge variant={audienceColors[n.audience]||'gray'}>{n.audience}</Badge>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{n.content}</p>
                  <div className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleDateString()} · {n.author}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setViewItem(n)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors"><Eye size={15}/></button>
                  <button onClick={() => openEdit(n)} className="p-2 rounded-xl hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-colors"><Pencil size={15}/></button>
                  <button onClick={() => remove(n)} className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={15}/></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editing ? 'Edit Notice' : 'Create Notice'} size="md">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="Notice title"/>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Content</label>
            <textarea value={form.content} onChange={e => setForm({...form, content:e.target.value})} rows={4} placeholder="Write notice content…"
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-slate-50 focus:bg-white resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Audience</label>
              <select value={form.audience} onChange={e => setForm({...form, audience:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {AUDIENCES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <Input label="Author" value={form.author} onChange={e => setForm({...form, author:e.target.value})}/>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editing ? 'Save Changes' : 'Publish Notice'}</Button>
          </div>
        </div>
      </Modal>

      {viewItem && (
        <Modal open onClose={() => setViewItem(null)} title="Notice Details" size="md">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${viewItem.priority==='High' ? 'bg-red-100' : viewItem.priority==='Medium' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                <Bell size={22} className={viewItem.priority==='High' ? 'text-red-500' : viewItem.priority==='Medium' ? 'text-orange-500' : 'text-blue-500'}/>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-slate-800 text-lg leading-tight">{viewItem.title}</h3>
                <div className="mt-1.5"><Badge variant={priorityColors[viewItem.priority]||'gray'} dot>{viewItem.priority} Priority</Badge></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Audience"><Badge variant={audienceColors[viewItem.audience]||'gray'}>{viewItem.audience}</Badge></Field>
              <Field label="Priority"><Badge variant={priorityColors[viewItem.priority]||'gray'} dot>{viewItem.priority}</Badge></Field>
              <Field label="Author">{viewItem.author||'—'}</Field>
              <Field label="Created Date">{viewItem.createdAt ? new Date(viewItem.createdAt).toLocaleDateString() : '—'}</Field>
              <Field label="Content" full><p className="leading-relaxed whitespace-pre-wrap font-normal text-slate-600">{viewItem.content||'—'}</p></Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
