import { useState, useEffect } from 'react';
import { Search, Plus, Library, BookOpen, Layers, CheckCircle2, BookMarked, Pencil, Eye } from 'lucide-react';
import { bookAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, StatCard, TableSkeleton, EmptyState, useToast, useConfirm, Dropdown } from '../components/ui';

const CATEGORIES = ['Science','Language','Social','Technology','Religious','Literature'];

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="font-medium text-slate-700 mt-1">{children}</div>
    </div>
  );
}

export default function LibraryPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [books, setBooks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm]       = useState({ title:'', author:'', category:'', copies:1, available:1, isbn:'' });

  const categoryColors = { Science:'blue', Language:'green', Social:'orange', Technology:'purple', Religious:'teal', Literature:'pink' };

  const fetchBooks = async () => {
    setLoading(true);
    try { const res = await bookAPI.getAll({ search, ...(category ? { category } : {}) }); setBooks(res.data||[]); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchBooks(); }, [search, category]);

  const openAdd = () => {
    setEditing(null);
    setForm({ title:'', author:'', category:'', copies:1, available:1, isbn:'' });
    setModal(true);
  };
  const openEdit = (b) => {
    setEditing(b._id);
    setForm({ title:b.title||'', author:b.author||'', category:b.category||'', copies:b.copies??1, available:b.available??0, isbn:b.isbn||'' });
    setModal(true);
  };

  const saveBook = async () => {
    setSaving(true);
    try {
      if (editing) {
        await bookAPI.update(editing, { ...form, copies:Number(form.copies), available:Number(form.available) });
        toast.success('Book updated');
      } else {
        await bookAPI.create({ ...form, copies:Number(form.copies), available:Number(form.copies) });
        toast.success('Book added');
      }
      setModal(false); fetchBooks();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const issue = async (id) => {
    try { await bookAPI.issue(id); fetchBooks(); toast.success('Book issued'); }
    catch(e) { toast.error(e.message); }
  };
  const ret = async (id) => {
    try { await bookAPI.return(id); fetchBooks(); toast.success('Book returned'); }
    catch(e) { toast.error(e.message); }
  };
  const remove = async (id) => {
    if (!(await confirm({ title:'Delete book?', message:'This removes the book from the library.', tone:'danger', confirmText:'Delete' }))) return;
    try { await bookAPI.delete(id); fetchBooks(); toast.success('Book removed'); }
    catch(e) { toast.error(e.message); }
  };

  const totalCopies = books.reduce((s,b)=>s+b.copies,0);
  const available   = books.reduce((s,b)=>s+b.available,0);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Library Management"
        subtitle={`${books.length} titles · ${available} available`}
        action={<Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Add Book</Button>}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BookOpen}    label="Total Titles" value={books.length} color="blue" />
        <StatCard icon={Layers}      label="Total Copies" value={totalCopies}  color="purple" />
        <StatCard icon={CheckCircle2} label="Available"    value={available}    color="green" />
        <StatCard icon={BookMarked}  label="Issued"        value={totalCopies-available} color="orange" />
      </div>
      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
          <div className="relative max-w-xs flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search books…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"/>
          </div>
          <Dropdown value={category} onChange={e=>setCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </Dropdown>
        </div>
        {loading ? <TableSkeleton rows={6} cols={6} /> : books.length === 0 ? (
          <EmptyState icon={Library} title="No books found"
            subtitle={search||category ? 'Try adjusting your search or filter.' : 'Add your first book to the library.'}
            action={<Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Add Book</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">{['Title','Author','Category','ISBN','Copies','Available','Issued','Action'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {books.map(b => {
                  const issued = b.copies - b.available;
                  return (
                    <tr key={b._id} className="border-b border-slate-50 hover:bg-blue-50/40">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-12 rounded-lg bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center flex-shrink-0"><Library size={14} className="text-white"/></div><span className="font-medium text-slate-800 max-w-[180px] leading-tight">{b.title}</span></div></td>
                      <td className="px-4 py-3 text-slate-600">{b.author}</td>
                      <td className="px-4 py-3"><Badge variant={categoryColors[b.category]||'blue'}>{b.category}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{b.isbn}</td>
                      <td className="px-4 py-3 text-center font-medium">{b.copies}</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-bold">{b.available}</td>
                      <td className="px-4 py-3 text-center"><span className={`font-medium ${issued>0?'text-orange-500':'text-slate-300'}`}>{issued}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={()=>setViewItem(b)} className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded-lg font-medium inline-flex items-center gap-1"><Eye size={11}/>View</button>
                          <button disabled={b.available===0} onClick={()=>issue(b._id)} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-40 px-2.5 py-1 rounded-lg font-medium">Issue</button>
                          <button disabled={b.available>=b.copies} onClick={()=>ret(b._id)} className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40 px-2.5 py-1 rounded-lg font-medium">Return</button>
                          <button onClick={()=>openEdit(b)} className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded-lg font-medium inline-flex items-center gap-1"><Pencil size={11}/>Edit</button>
                          <button onClick={()=>remove(b._id)} className="text-xs bg-red-50 text-red-500 hover:bg-red-100 px-2.5 py-1 rounded-lg font-medium">Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title={editing ? 'Edit Book' : 'Add New Book'} size="md">
        <div className="space-y-4">
          <Input label="Book Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Enter book title"/>
          <Input label="Author" value={form.author} onChange={e=>setForm({...form,author:e.target.value})} placeholder="Author name"/>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Dropdown value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">Select</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </Dropdown>
            </div>
            <Input label="No. of Copies" type="number" value={form.copies} onChange={e=>setForm({...form,copies:e.target.value})}/>
          </div>
          {editing && <Input label="Available Copies" type="number" value={form.available} onChange={e=>setForm({...form,available:e.target.value})}/>}
          <Input label="ISBN" value={form.isbn} onChange={e=>setForm({...form,isbn:e.target.value})} placeholder="978-0-XXX"/>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveBook} loading={saving}>{editing ? 'Save Changes' : 'Add Book'}</Button>
          </div>
        </div>
      </Modal>

      {viewItem && (
        <Modal open onClose={()=>setViewItem(null)} title="Book Details" size="md">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-16 rounded-lg bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center flex-shrink-0"><Library size={20} className="text-white"/></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-slate-800 text-lg leading-tight">{viewItem.title}</h3>
                <div className="text-sm text-slate-500 mt-0.5">by {viewItem.author||'—'}</div>
                <div className="mt-1.5"><Badge variant={(viewItem.available>0)?'green':'red'} dot>{viewItem.available>0 ? 'Available' : 'All Issued'}</Badge></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title">{viewItem.title||'—'}</Field>
              <Field label="Author">{viewItem.author||'—'}</Field>
              <Field label="Category"><Badge variant={categoryColors[viewItem.category]||'blue'}>{viewItem.category||'—'}</Badge></Field>
              <Field label="ISBN"><span className="font-mono text-xs">{viewItem.isbn||'—'}</span></Field>
              <Field label="Total Copies">{viewItem.copies}</Field>
              <Field label="Available"><span className="text-emerald-600 font-bold">{viewItem.available}</span></Field>
              <Field label="Issued"><span className="text-orange-500 font-bold">{viewItem.copies - viewItem.available}</span></Field>
              <Field label="Book ID"><span className="font-mono text-xs">{viewItem._id}</span></Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
