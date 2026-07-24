import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Pencil, X } from 'lucide-react';
import { eventAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, EmptyState, useToast, useConfirm, Dropdown } from '../components/ui';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TYPES = ['Meeting','Exam','Event','Finance','Holiday'];
const typeColors = { Meeting:'bg-blue-100 text-blue-700', Exam:'bg-red-100 text-red-600', Event:'bg-emerald-100 text-emerald-700', Finance:'bg-orange-100 text-orange-700', Holiday:'bg-purple-100 text-purple-700' };

const emptyForm = { title:'', date:'', time:'', type:'Event' };

export default function Calendar() {
  const toast = useToast();
  const confirm = useConfirm();
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth());
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(emptyForm);

  const fetchEvents = async () => {
    setLoading(true);
    try { const res = await eventAPI.getAll(); setEvents(res.data||[]); }
    catch(e) { console.error(e); toast.error(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchEvents(); }, []);

  const openCreate = (date='') => { setEditing(null); setForm({ ...emptyForm, date }); setModal(true); };
  const openEdit = (ev) => {
    setEditing(ev);
    setForm({ title:ev.title||'', date:ev.date?.slice(0,10)||'', time:ev.time||'', type:ev.type||'Event' });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) { await eventAPI.update(editing._id, form); toast.success('Event updated'); }
      else { await eventAPI.create(form); toast.success('Event added'); }
      setModal(false); setEditing(null); setForm(emptyForm); fetchEvents();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async (ev) => {
    const ok = await confirm({ title:'Remove event?', message:`"${ev.title}" will be permanently deleted.`, tone:'danger', confirmText:'Remove' });
    if (!ok) return;
    try { await eventAPI.delete(ev._id); toast.success('Event removed'); fetchEvents(); }
    catch(e) { toast.error(e.message); }
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = now.toISOString().slice(0,10);

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return events.filter(e => e.date?.slice(0,10) === dateStr);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const upcoming = events.filter(e=>e.date>=new Date().toISOString()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);

  return (
    <div className="space-y-5">
      <SectionHeader title="School Calendar" subtitle="Events, exams and important dates"
        action={<Button variant="primary" size="sm" icon={Plus} onClick={()=>openCreate()}>Add Event</Button>}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-blue-50 text-slate-500"><ChevronLeft size={18}/></button>
            <h3 className="font-display font-bold text-slate-800 text-lg">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-blue-50 text-slate-500"><ChevronRight size={18}/></button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d=><div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`}/>;
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayEvents = getEventsForDay(day);
              const isToday = dateStr === todayStr;
              const isSun = idx%7===0;
              return (
                <button type="button" key={day} onClick={()=>openCreate(dateStr)} title="Add event on this day"
                  className={`text-left min-h-[64px] rounded-xl p-1.5 border transition-all cursor-pointer ${isToday?'bg-primary-600 border-primary-500 text-white hover:brightness-110':isSun?'bg-red-50 border-red-100 hover:bg-red-100':'bg-white border-slate-100 hover:bg-blue-50 hover:border-blue-200'}`}>
                  <div className={`text-sm font-bold mb-1 ${isToday?'text-white':isSun?'text-red-400':'text-slate-700'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0,2).map(ev=>(
                      <div key={ev._id} className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${isToday?'bg-white/20 text-white':typeColors[ev.type]||'bg-blue-100 text-blue-700'}`}>{ev.title}</div>
                    ))}
                    {dayEvents.length>2 && <div className={`text-[9px] ${isToday?'text-white/70':'text-slate-400'}`}>+{dayEvents.length-2} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-bold text-slate-800 mb-4">Upcoming Events</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({length:5}).map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming events" subtitle="Add an event to see it here."
              action={<Button variant="primary" size="sm" icon={Plus} onClick={()=>openCreate()}>Add Event</Button>}/>
          ) : (
            <div className="space-y-3">
              {upcoming.map(ev=>(
                <div key={ev._id} className="flex gap-3 items-start group">
                  <div className={`text-center min-w-[44px] rounded-xl p-2 ${typeColors[ev.type]||'bg-blue-100 text-blue-700'}`}>
                    <div className="text-lg font-display font-bold leading-none">{ev.date?.slice(8,10)}</div>
                    <div className="text-[9px] font-semibold uppercase">{MONTHS[parseInt(ev.date?.slice(5,7))-1]?.slice(0,3)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 leading-tight">{ev.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={ev.type==='Exam'?'red':ev.type==='Meeting'?'blue':'green'}>{ev.type}</Badge>
                      {ev.time && <span className="text-xs text-slate-400">{ev.time}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={()=>openEdit(ev)} className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={13}/></button>
                    <button onClick={()=>remove(ev)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"><X size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title={editing ? 'Edit Event' : 'Add Event'} size="sm">
        <div className="space-y-4">
          <Input label="Event Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Annual Sports Day"/>
          <Input label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
          <Input label="Time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} placeholder="e.g. 9:00 AM – 12:00 PM"/>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Event Type</label>
            <Dropdown value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {TYPES.map(t=><option key={t}>{t}</option>)}
            </Dropdown>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editing ? 'Save Changes' : 'Add Event'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
