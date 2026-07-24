// ─── TRANSPORT PAGE ───────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useToast, useConfirm, Dropdown } from '../components/ui';
import { Plus, Bus, Loader2, Trash2, MapPin, User, BookOpen, Eye } from 'lucide-react';
import { transportAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, Select, EmptyState } from '../components/ui';
import { useClasses } from '../hooks/useClasses';

function ViewField({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="font-medium text-slate-700 mt-1">{children}</div>
    </div>
  );
}

export function Transport() {
  const toast = useToast();
  const confirm = useConfirm();
  const [routes, setRoutes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const blankRoute = {
    routeName:'', routeNo:'',
    driver:{ name:'', phone:'', cnic:'', licenseNo:'' },
    vehicle:{ type:'Bus', regNo:'', capacity:40, model:'' },
    stops:[], morningTime:'07:30', eveningTime:'14:00',
  };
  const [form, setForm] = useState(blankRoute);
  const [newStop, setNewStop] = useState({ stopName:'', time:'', fare:'' });

  const openCreate = () => { setEditId(null); setForm(blankRoute); setNewStop({ stopName:'', time:'', fare:'' }); setModal(true); };
  const openEdit = (r) => {
    setEditId(r._id);
    setForm({
      routeName: r.routeName||'', routeNo: r.routeNo||'',
      driver:{ name:r.driver?.name||'', phone:r.driver?.phone||'', cnic:r.driver?.cnic||'', licenseNo:r.driver?.licenseNo||'' },
      vehicle:{ type:r.vehicle?.type||'Bus', regNo:r.vehicle?.regNo||'', capacity:r.vehicle?.capacity||40, model:r.vehicle?.model||'' },
      stops: r.stops||[], morningTime:r.morningTime||'07:30', eveningTime:r.eveningTime||'14:00',
    });
    setNewStop({ stopName:'', time:'', fare:'' });
    setModal(true);
  };

  const fetchRoutes = async () => {
    setLoading(true);
    try { const res = await transportAPI.getRoutes(); setRoutes(res.data||[]); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchRoutes(); }, []);

  const addStop = () => {
    if (!newStop.stopName) return;
    setForm(f => ({...f, stops:[...f.stops, {...newStop, fare:Number(newStop.fare)}]}));
    setNewStop({ stopName:'', time:'', fare:'' });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) { await transportAPI.updateRoute(editId, form); toast.success('Route updated'); }
      else { await transportAPI.createRoute(form); toast.success('Route added'); }
      setModal(false); fetchRoutes();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Transport Management" subtitle={`${routes.length} routes active`}
        action={<Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Add Route</Button>}/>

      {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-500"/></div> : routes.length===0 ? (
        <EmptyState icon={Bus} title="No routes yet" subtitle="Add your first transport route to start managing pickups and drop-offs."
          action={<Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Add Route</Button>}/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map(r => (
            <Card key={r._id} hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Bus size={20} className="text-white"/></div>
                <Badge variant="blue">Route {r.routeNo||'—'}</Badge>
              </div>
              <h3 className="font-display font-bold text-slate-800 mb-1">{r.routeName}</h3>
              <div className="space-y-1.5 text-sm text-slate-500 mb-3">
                <div className="flex items-center gap-2"><User size={12}/>{r.driver?.name||'No driver'} · {r.driver?.phone||'—'}</div>
                <div className="flex items-center gap-2"><MapPin size={12}/>{r.stops?.length||0} stops · Cap. {r.vehicle?.capacity||0}</div>
              </div>
              <div className="flex gap-2 text-xs mb-3">
                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium">🌅 {r.morningTime}</span>
                <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg font-medium">🌆 {r.eveningTime}</span>
              </div>
              {r.stops?.length > 0 && (
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  {r.stops.slice(0,3).map((s,i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-slate-500">
                      <span>• {s.stopName}</span>
                      <span className="text-slate-400">Rs {s.fare}</span>
                    </div>
                  ))}
                  {r.stops.length > 3 && <div className="text-xs text-slate-400">+{r.stops.length-3} more stops</div>}
                </div>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={()=>setViewItem(r)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 py-1.5 rounded-lg font-medium"><Eye size={12}/>View</button>
                <button onClick={()=>openEdit(r)} className="flex-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 py-1.5 rounded-lg font-medium">Edit</button>
                <button onClick={async()=>{if(!(await confirm({title:'Remove route?',message:`Delete route "${r.routeName}"? This cannot be undone.`,tone:'danger',confirmText:'Remove'})))return;await transportAPI.deleteRoute(r._id);toast.success('Route removed');fetchRoutes();}} className="flex-1 text-xs bg-red-50 text-red-500 hover:bg-red-100 py-1.5 rounded-lg font-medium">Remove</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Transport Route':'Add Transport Route'} size="lg">
        <div className="space-y-5">
          <div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Route Info</div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Route Name" value={form.routeName} onChange={e=>setForm({...form,routeName:e.target.value})} placeholder="e.g. Gulberg Route"/>
              <Input label="Route No." value={form.routeNo} onChange={e=>setForm({...form,routeNo:e.target.value})} placeholder="R-01"/>
              <Input label="Morning Time" value={form.morningTime} onChange={e=>setForm({...form,morningTime:e.target.value})}/>
              <Input label="Evening Time" value={form.eveningTime} onChange={e=>setForm({...form,eveningTime:e.target.value})}/>
            </div>
          </div>
          <div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Driver Info</div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Driver Name" value={form.driver.name} onChange={e=>setForm({...form,driver:{...form.driver,name:e.target.value}})}/>
              <Input label="Driver Phone" value={form.driver.phone} onChange={e=>setForm({...form,driver:{...form.driver,phone:e.target.value}})}/>
              <Input label="Driver CNIC" value={form.driver.cnic} onChange={e=>setForm({...form,driver:{...form.driver,cnic:e.target.value}})} placeholder="XXXXX-XXXXXXX-X"/>
              <Input label="License No." value={form.driver.licenseNo} onChange={e=>setForm({...form,driver:{...form.driver,licenseNo:e.target.value}})}/>
            </div>
          </div>
          <div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Vehicle Info</div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Vehicle Type" value={form.vehicle.type} onChange={e=>setForm({...form,vehicle:{...form.vehicle,type:e.target.value}})}>
                {['Bus','Van','Coaster','Car'].map(t=><option key={t}>{t}</option>)}
              </Select>
              <Input label="Model" value={form.vehicle.model} onChange={e=>setForm({...form,vehicle:{...form.vehicle,model:e.target.value}})} placeholder="e.g. Toyota Hiace 2020"/>
              <Input label="Vehicle Reg No." value={form.vehicle.regNo} onChange={e=>setForm({...form,vehicle:{...form.vehicle,regNo:e.target.value}})} placeholder="ABC-123"/>
              <Input label="Capacity" type="number" value={form.vehicle.capacity} onChange={e=>setForm({...form,vehicle:{...form.vehicle,capacity:Number(e.target.value)}})}/>
            </div>
          </div>
          <div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Stops</div>
            <div className="flex gap-2 mb-2">
              <input value={newStop.stopName} onChange={e=>setNewStop({...newStop,stopName:e.target.value})} placeholder="Stop name"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              <input value={newStop.time} onChange={e=>setNewStop({...newStop,time:e.target.value})} placeholder="Time"
                className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              <input value={newStop.fare} onChange={e=>setNewStop({...newStop,fare:e.target.value})} placeholder="Fare" type="number"
                className="w-20 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              <Button variant="primary" size="sm" onClick={addStop}>+</Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {form.stops.map((s,i)=>(
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-slate-700">• {s.stopName}</span>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>{s.time}</span><span>Rs {s.fare}</span>
                    <button onClick={()=>setForm(f=>({...f,stops:f.stops.filter((_,j)=>j!==i)}))} className="text-red-400 hover:text-red-600">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editId?'Update Route':'Save Route'}</Button>
          </div>
        </div>
      </Modal>

      {viewItem && (
        <Modal open onClose={()=>setViewItem(null)} title="Route Details" size="md">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0"><Bus size={22} className="text-white"/></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-slate-800 text-lg leading-tight">{viewItem.routeName}</h3>
                <div className="mt-1.5"><Badge variant="blue" dot>Route {viewItem.routeNo||'—'}</Badge></div>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Driver</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ViewField label="Driver Name">{viewItem.driver?.name||'—'}</ViewField>
                <ViewField label="Driver Phone">{viewItem.driver?.phone||'—'}</ViewField>
                <ViewField label="Driver CNIC">{viewItem.driver?.cnic||'—'}</ViewField>
                <ViewField label="License No.">{viewItem.driver?.licenseNo||'—'}</ViewField>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Vehicle</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ViewField label="Vehicle Type">{viewItem.vehicle?.type||'—'}</ViewField>
                <ViewField label="Reg No.">{viewItem.vehicle?.regNo||'—'}</ViewField>
                <ViewField label="Capacity">{viewItem.vehicle?.capacity||'—'}</ViewField>
                <ViewField label="Model">{viewItem.vehicle?.model||'—'}</ViewField>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Timings</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ViewField label="Morning Time">🌅 {viewItem.morningTime||'—'}</ViewField>
                <ViewField label="Evening Time">🌆 {viewItem.eveningTime||'—'}</ViewField>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Stops ({viewItem.stops?.length||0})</div>
              {viewItem.stops?.length ? (
                <div className="space-y-1">
                  {viewItem.stops.map((s,i)=>(
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5 text-sm">
                      <span className="text-slate-700">• {s.stopName}</span>
                      <div className="flex items-center gap-4 text-slate-400">
                        <span>{s.time||'—'}</span><span>Rs {s.fare}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-sm text-slate-400">No stops added.</div>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── HOMEWORK PAGE ────────────────────────────────────────────────────────────
import { homeworkAPI, teacherAPI } from '../services/api';

export function Homework() {
  const toast = useToast();
  const confirm = useConfirm();
  const [hw, setHw]           = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState(null);
  const [filterClass, setFilterClass] = useState('');
  const blankHw = { title:'', description:'', class:'', subject:'', teacher:'', dueDate:'', totalMarks:10 };
  const [form, setForm] = useState(blankHw);
  const { names: classes } = useClasses();

  const openCreate = () => { setEditId(null); setForm(blankHw); setModal(true); };
  const openEdit = (h) => {
    setEditId(h._id);
    setForm({
      title:h.title||'', description:h.description||'', class:h.class||'', subject:h.subject||'',
      teacher:h.teacher?._id||h.teacher||'', dueDate:h.dueDate?.slice(0,10)||'', totalMarks:h.totalMarks||10,
    });
    setModal(true);
  };

  const fetchHw = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClass) params.class = filterClass;
      const [hwRes, tRes] = await Promise.all([homeworkAPI.getAll(params), teacherAPI.getAll()]);
      setHw(hwRes.data||[]); setTeachers(tRes.data||[]);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchHw(); }, [filterClass]);

  const save = async () => {
    setSaving(true);
    try {
      if (editId) { await homeworkAPI.update(editId, form); toast.success('Homework updated'); }
      else { await homeworkAPI.create(form); toast.success('Homework assigned'); }
      setModal(false); fetchHw();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const statusColor = { Active:'green', Expired:'red', Graded:'blue' };

  return (
    <div className="space-y-5">
      <SectionHeader title="Homework & Assignments" subtitle={`${hw.length} assignments`}
        action={<Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Assign Homework</Button>}/>

      <div className="flex gap-3">
        <Dropdown value={filterClass} onChange={e=>setFilterClass(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
          <option value="">All Classes</option>
          {classes.map(c=><option key={c}>{c}</option>)}
        </Dropdown>
      </div>

      {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-500"/></div> : hw.length===0 ? (
        <EmptyState icon={BookOpen} title="No homework yet" subtitle="Assign homework or classwork and it will appear here for the selected class."
          action={<Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Assign Homework</Button>}/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hw.map(h => (
            <Card key={h._id} hover className="p-5">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="blue">{h.class}</Badge>
                <Badge variant={statusColor[h.status]||'gray'}>{h.status}</Badge>
              </div>
              <h3 className="font-display font-bold text-slate-800 mb-1">{h.title}</h3>
              <div className="text-sm text-primary-600 font-medium mb-2">{h.subject}</div>
              {h.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{h.description}</p>}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span>📅 Due: <strong className="text-slate-600">{h.dueDate?.slice(0,10)}</strong></span>
                <span>📝 {h.totalMarks} marks</span>
              </div>
              {h.teacher && <div className="text-xs text-slate-500 border-t border-slate-100 pt-2">👤 {h.teacher?.name}</div>}
              <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                <button onClick={()=>openEdit(h)} className="flex-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 py-1.5 rounded-lg font-medium">Edit</button>
                <button onClick={async()=>{if(!(await confirm({title:'Delete homework?',message:`Delete "${h.title}"? This cannot be undone.`,tone:'danger',confirmText:'Delete'})))return;await homeworkAPI.delete(h._id);toast.success('Homework deleted');fetchHw();}}
                  className="flex-1 text-xs bg-red-50 text-red-500 hover:bg-red-100 py-1.5 rounded-lg font-medium">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Homework':'Assign Homework'} size="md">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Homework title"/>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Class</label>
              <Dropdown value={form.class} onChange={e=>setForm({...form,class:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">Select</option>{classes.map(c=><option key={c}>{c}</option>)}
              </Dropdown>
            </div>
            <Input label="Subject" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="e.g. Mathematics"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Teacher</label>
            <Dropdown value={form.teacher} onChange={e=>setForm({...form,teacher:e.target.value})}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">Select teacher</option>
              {teachers.map(t=><option key={t._id} value={t._id}>{t.name}</option>)}
            </Dropdown>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due Date" type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/>
            <Input label="Total Marks" type="number" value={form.totalMarks} onChange={e=>setForm({...form,totalMarks:Number(e.target.value)})}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} placeholder="Homework details…"
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{editId?'Update':'Assign'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── MESSAGING PAGE ───────────────────────────────────────────────────────────
import { messageAPI } from '../services/api';
import { Send, MessageSquare } from 'lucide-react';

export function Messaging() {
  const toast = useToast();
  const confirm = useConfirm();
  const [msgs, setMsgs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({ title:'', body:'', type:'In-App', audience:'All', targetClass:'' });
  const { names: classes } = useClasses();

  const fetchMsgs = async () => {
    setLoading(true);
    try { const res = await messageAPI.getAll(); setMsgs(res.data||[]); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchMsgs(); }, []);

  const send = async () => {
    setSaving(true);
    try { await messageAPI.send(form); toast.success('Message sent'); setModal(false); fetchMsgs(); }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const typeColors = { 'In-App':'blue', SMS:'green', WhatsApp:'teal', Email:'purple' };
  const audienceColors = { All:'purple', Students:'blue', Parents:'green', Teachers:'orange', Staff:'red' };

  return (
    <div className="space-y-5">
      <SectionHeader title="Communication Center" subtitle={`${msgs.length} messages sent`}
        action={<Button variant="primary" size="sm" icon={Send} onClick={()=>setModal(true)}>Send Message</Button>}/>

      {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-500"/></div> : msgs.length===0 ? (
        <EmptyState icon={MessageSquare} title="No messages yet" subtitle="Send announcements, SMS, or WhatsApp messages to students, parents, and staff."
          action={<Button variant="primary" size="sm" icon={Send} onClick={()=>setModal(true)}>Send Message</Button>}/>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {msgs.map(m => (
            <Card key={m._id} hover className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0"><MessageSquare size={18} className="text-blue-600"/></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800">{m.title}</h3>
                    <Badge variant={typeColors[m.type]||'blue'}>{m.type}</Badge>
                    <Badge variant={audienceColors[m.audience]||'gray'}>{m.audience}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{m.body}</p>
                  <div className="text-xs text-slate-400 mt-1.5 flex gap-3">
                    <span>📨 {m.recipients} recipients</span>
                    <span>🕐 {new Date(m.sentAt).toLocaleString()}</span>
                    {m.sentBy?.name && <span>👤 {m.sentBy.name}</span>}
                  </div>
                </div>
                <button onClick={async()=>{if(!(await confirm({title:'Delete message?',message:`Delete "${m.title}"? This cannot be undone.`,tone:'danger',confirmText:'Delete'})))return;await messageAPI.delete(m._id);toast.success('Message deleted');fetchMsgs();}}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 flex-shrink-0"><Trash2 size={14}/></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Send Message" size="md">
        <div className="space-y-4">
          <Input label="Title / Subject" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Message subject"/>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Message</label>
            <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={4} placeholder="Type your message here…"
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Send via</label>
              <Dropdown value={form.type} onChange={e=>setForm({...form,type:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {['In-App','SMS','WhatsApp','Email'].map(t=><option key={t}>{t}</option>)}
              </Dropdown>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Send to</label>
              <Dropdown value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {['All','Students','Parents','Teachers','Staff','Class'].map(a=><option key={a}>{a}</option>)}
              </Dropdown>
            </div>
          </div>
          {form.audience==='Class' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Target Class</label>
              <Dropdown value={form.targetClass} onChange={e=>setForm({...form,targetClass:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">Select class</option>
                {classes.map(c=><option key={c}>{c}</option>)}
              </Dropdown>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button variant="primary" icon={Send} onClick={send} loading={saving}>{saving?'Sending…':'Send Message'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── PROMOTIONS PAGE ──────────────────────────────────────────────────────────
import { promotionAPI, studentAPI as stuAPI } from '../services/api';
import { ArrowRight, CheckCircle } from 'lucide-react';

export function Promotions() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [year, setYear]         = useState(`${new Date().getFullYear()}-${new Date().getFullYear()+1}`);
  const [promotions, setPromotions] = useState({});
  const [filterClass, setFilter]    = useState('');
  const [toClass, setToClass]       = useState('');

  const { names: classes } = useClasses();

  // Default the current-class filter to the first real class once loaded.
  useEffect(() => {
    if (!filterClass && classes.length) setFilter(classes[0]);
  }, [classes, filterClass]);

  useEffect(() => {
    if (!filterClass) return;
    setLoading(true);
    stuAPI.getAll({ class: filterClass, limit:100 })
      .then(r => {
        setStudents(r.data||[]);
        const initial = {};
        (r.data||[]).forEach(s => { initial[s._id] = { student:s._id, fromClass:s.class, toClass:toClass||'', status:'Promoted' }; });
        setPromotions(initial);
      })
      .catch(console.error).finally(()=>setLoading(false));
  }, [filterClass]);

  // Applying a target class updates every student's toClass in one go.
  const applyToClass = (val) => {
    setToClass(val);
    setPromotions(prev => {
      const n = {...prev};
      Object.keys(n).forEach(id => { n[id] = {...n[id], toClass: val}; });
      return n;
    });
  };

  const promote = async () => {
    if (Object.values(promotions).some(p => p.status==='Promoted' && !p.toClass)) {
      toast.error('Select a target "To Class" for every promoted student first');
      return;
    }
    setSaving(true);
    try {
      await promotionAPI.promote({ promotions: Object.values(promotions), academicYear: year });
      setSaved(true); setTimeout(()=>setSaved(false),3000);
      toast.success('Promotions processed');
    } catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Student Promotions" subtitle="Promote or detain students to the next class"/>
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Year</label>
            <input value={year} onChange={e=>setYear(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Class</label>
            <Dropdown value={filterClass} onChange={e=>setFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {classes.map(c=><option key={c}>{c}</option>)}
            </Dropdown>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Promote To Class</label>
            <Dropdown value={toClass} onChange={e=>applyToClass(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">Select target class</option>
              {classes.map(c=><option key={c}>{c}</option>)}
              <option value="Passed Out">Passed Out</option>
            </Dropdown>
          </div>
          <Button variant="primary" icon={saving?Loader2:CheckCircle} onClick={promote} loading={saving} className="self-end">
            {saving?'Processing…':saved?'Promoted! ✓':'Process Promotions'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-slate-800">{filterClass} — {students.length} students</h3>
          <div className="flex gap-2">
            <button onClick={()=>setPromotions(p=>{const n={...p};students.forEach(s=>{n[s._id]={...n[s._id],status:'Promoted'}});return n;})}
              className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-200">Promote All</button>
            <button onClick={()=>setPromotions(p=>{const n={...p};students.forEach(s=>{n[s._id]={...n[s._id],status:'Detained'}});return n;})}
              className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-200">Detain All</button>
          </div>
        </div>
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-500"/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">{['Student','Roll No','From Class','To Class','Status'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {students.map(s => {
                  const p = promotions[s._id] || {};
                  return (
                    <tr key={s._id} className="border-b border-slate-50 hover:bg-blue-50/30">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.rollNumber}</td>
                      <td className="px-4 py-3"><Badge variant="blue">{s.class}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ArrowRight size={12} className="text-slate-400"/>
                          <Dropdown value={p.toClass||''} onChange={e=>setPromotions(prev=>({...prev,[s._id]:{...prev[s._id],toClass:e.target.value}}))}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 w-36">
                            <option value="">Select</option>
                            {classes.map(c=><option key={c}>{c}</option>)}
                            <option value="Passed Out">Passed Out</option>
                          </Dropdown>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Dropdown value={p.status||'Promoted'} onChange={e=>setPromotions(prev=>({...prev,[s._id]:{...prev[s._id],status:e.target.value}}))}
                          className={`px-2 py-1 text-xs rounded-lg border font-semibold ${p.status==='Promoted'?'bg-emerald-50 text-emerald-700 border-emerald-200':p.status==='Detained'?'bg-red-50 text-red-600 border-red-200':'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          <option>Promoted</option><option>Detained</option><option>Left</option>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── CERTIFICATES PAGE ────────────────────────────────────────────────────────
import { certificateAPI } from '../services/api';
import { FileText, Printer } from 'lucide-react';
import { useSchool } from '../hooks/useSchool.jsx';
import { generateStampHTML, stampEnabled } from '../components/print/PrintComponents.jsx';

export function Certificates() {
  const toast = useToast();
  const confirm = useConfirm();
  const { school }            = useSchool();
  const [certs, setCerts]     = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ student:'', type:'Character', issuedBy:'Principal', content:'' });
  const [previewCert, setPreview] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [certH, setCertH] = useState(420);

  const certTypes = ['Character','Leaving','Bonafide','Transfer','Merit'];

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [certsRes, stuRes] = await Promise.all([certificateAPI.getAll(), stuAPI.getAll({limit:200})]);
      setCerts(certsRes.data||[]); setStudents(stuRes.data||[]);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{ fetchAll(); },[]);

  const defaultContent = {
    Character: 'This is to certify that the above-named student has been a student of this school. During their tenure, they have demonstrated excellent character and conduct.',
    Leaving: 'This is to certify that the above-named student has been a student of this school. They are leaving the school in good standing.',
    Bonafide: 'This is to certify that the above-named student is a bonafide student of this school and is currently enrolled in the mentioned class.',
    Transfer: 'This is to certify that the above-named student is being transferred from this institution. Their conduct and academic record have been satisfactory.',
    Merit: 'This is to certify that the above-named student has excelled academically and has been awarded this certificate in recognition of their outstanding performance.',
  };

  const handleTypeChange = (type) => {
    setForm(f => ({...f, type, content: defaultContent[type]||''}));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await certificateAPI.create(form); setCerts(prev=>[res.data,...prev]); toast.success('Certificate issued'); setModal(false);
      setForm({ student:'', type:'Character', issuedBy:'Principal', content:'' });   // reset for next issue
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async (cert) => {
    if (!(await confirm({title:'Delete certificate?',message:`Delete the ${cert.type} certificate for "${cert.student?.name||'this student'}"? This cannot be undone.`,tone:'danger',confirmText:'Delete'}))) return;
    try { await certificateAPI.delete(cert._id); setCerts(prev=>prev.filter(c=>c._id!==cert._id)); toast.success('Certificate deleted'); }
    catch(e) { toast.error(e.message); }
  };

  // Single source of truth for the certificate document — used by BOTH the
  // on-screen preview (iframe) and the print window, so what you see == what prints.
  const buildCertHTML = (cert, forPrint) => {
    const stu = cert.student || {};
    const color = school?.primaryColor || '#1d4ed8';
    const gold = '#b8912f';
    const logoUrl = school?.logo ? `http://localhost:5000${school.logo}` : '';
    const stampHtml = stampEnabled(school, 'cert') ? generateStampHTML(school, 96) : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cert.type} Certificate — ${school?.name||'School'}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:Georgia,'Times New Roman',serif;color:#1e293b;background:${forPrint?'#eef2f9':'#fff'};padding:${forPrint?'24px':'6px'};}
      .cert{position:relative;max-width:${forPrint?'900px':'100%'};margin:0 auto;background:#fff;padding:14px;
        ${forPrint?'box-shadow:0 12px 44px rgba(15,23,42,.14);':''}}
      .frame{border:3px solid ${color};padding:6px;}
      .frame-inner{border:1px solid ${gold};padding:40px 48px;position:relative;overflow:hidden;}
      .corner{position:absolute;width:34px;height:34px;border:3px solid ${gold};}
      .c-tl{top:10px;left:10px;border-right:none;border-bottom:none;}
      .c-tr{top:10px;right:10px;border-left:none;border-bottom:none;}
      .c-bl{bottom:10px;left:10px;border-right:none;border-top:none;}
      .c-br{bottom:10px;right:10px;border-left:none;border-top:none;}
      .wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.05;
        font-size:120px;font-weight:bold;color:${color};transform:rotate(-16deg);pointer-events:none;letter-spacing:6px;}
      .head{display:flex;align-items:center;justify-content:center;gap:14px;text-align:center;}
      .logo{width:58px;height:58px;object-fit:contain;}
      .school{font-size:26px;font-weight:bold;color:${color};letter-spacing:.5px;}
      .addr{font-size:11px;color:#64748b;font-family:Arial,sans-serif;margin-top:2px;}
      .title{text-align:center;margin:26px 0 6px;font-size:32px;font-weight:bold;letter-spacing:3px;
        text-transform:uppercase;color:#1e293b;}
      .title span{color:${gold};}
      .rule{width:180px;height:3px;margin:6px auto 22px;background:linear-gradient(90deg,transparent,${gold},transparent);}
      .body{text-align:center;line-height:2.1;font-size:16px;position:relative;z-index:1;}
      .name{font-size:24px;font-weight:bold;color:${color};display:inline-block;border-bottom:1px dotted ${gold};padding:0 8px;}
      .meta{font-family:Arial,sans-serif;font-size:12px;color:#64748b;margin-top:6px;}
      .desc{max-width:640px;margin:14px auto 0;font-size:15px;color:#334155;}
      .foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:52px;position:relative;z-index:1;}
      .sig{text-align:center;font-family:Arial,sans-serif;}
      .sig .line{border-top:1.5px solid #334155;width:170px;margin-bottom:5px;}
      .sig .role{font-size:11px;color:#64748b;}
      .stamp{opacity:.92;}
      .serial{position:absolute;top:14px;right:16px;font-family:Arial,sans-serif;font-size:10px;color:#94a3b8;z-index:2;}
      @media print{body{background:#fff;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.cert{box-shadow:none;max-width:900px;}}
    </style></head><body>
    <div class="cert"><div class="frame"><div class="frame-inner">
      <span class="corner c-tl"></span><span class="corner c-tr"></span><span class="corner c-bl"></span><span class="corner c-br"></span>
      <div class="serial">Serial No: ${cert.serialNo || '—'}</div>
      <div class="wm">${(school?.shortName || school?.name || '').toUpperCase()}</div>
      <div class="head">
        ${logoUrl ? `<img class="logo" src="${logoUrl}"/>` : ''}
        <div><div class="school">${school?.name || 'School'}</div>
        <div class="addr">${[school?.address || school?.city, school?.phone].filter(Boolean).join(' · ')}</div></div>
      </div>
      <div class="title">Certificate of <span>${cert.type}</span></div>
      <div class="rule"></div>
      <div class="body">
        <div>This is to certify that</div>
        <div style="margin:10px 0;"><span class="name">${stu.name || '—'}</span></div>
        <div class="meta">Class ${stu.class || '—'} · Roll No. ${stu.rollNumber || '—'} · Student ID ${stu.studentId || '—'}</div>
        <p class="desc">${cert.content || ''}</p>
        <div class="meta" style="margin-top:16px;">Issued on ${new Date(cert.issueDate).toLocaleDateString('en-PK',{year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div class="foot">
        <div class="sig"><div class="line"></div><div class="role">Class Teacher</div></div>
        <div class="stamp">${stampHtml}</div>
        <div class="sig"><div class="line"></div><div class="role">${cert.issuedBy || school?.principal || 'Principal'}</div></div>
      </div>
    </div></div></div>
    ${forPrint ? '<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),700);}</script>' : ''}
    </body></html>`;
  };

  const printCert = (cert) => {
    const win = window.open('','_blank','width=980,height=760');
    if (!win) { toast.error('Please allow popups to print.'); return; }
    win.document.write(buildCertHTML(cert, true));
    win.document.close(); win.focus();
  };

  const typeIcon = { Character:'🏆', Leaving:'👋', Bonafide:'📋', Transfer:'🔄', Merit:'⭐' };

  return (
    <div className="space-y-5">
      <SectionHeader title="Certificates" subtitle={`${certs.length} certificates issued`}
        action={<Button variant="primary" size="sm" icon={Plus} onClick={()=>setModal(true)}>Issue Certificate</Button>}/>

      {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-500"/></div> : certs.length===0 ? (
        <EmptyState icon={FileText} title="No certificates yet" subtitle="Issue character, leaving, bonafide, transfer, or merit certificates and print them here."
          action={<Button variant="primary" size="sm" icon={Plus} onClick={()=>setModal(true)}>Issue Certificate</Button>}/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map(c => (
            <Card key={c._id} hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-xl">{typeIcon[c.type]||'📄'}</div>
                <Badge variant="purple">{c.type}</Badge>
              </div>
              <h3 className="font-display font-bold text-slate-800">{c.student?.name||'—'}</h3>
              <div className="text-sm text-slate-500 mt-0.5">{c.student?.class} · {c.student?.rollNumber}</div>
              <div className="font-mono text-xs text-slate-400 mt-1">{c.serialNo}</div>
              <div className="text-xs text-slate-400 mt-2">{new Date(c.issueDate).toLocaleDateString()}</div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={()=>setViewItem(c)} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 py-1.5 rounded-lg font-medium"><Eye size={12}/>View</button>
                <button onClick={()=>printCert(c)} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 py-1.5 rounded-lg font-medium"><Printer size={12}/>Print</button>
                <button onClick={()=>remove(c)} className="flex items-center justify-center gap-1.5 text-xs bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium"><Trash2 size={12}/></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Issue Certificate" size="md">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Student</label>
            <Dropdown value={form.student} onChange={e=>setForm({...form,student:e.target.value})}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">Select student</option>
              {students.map(s=><option key={s._id} value={s._id}>{s.name} ({s.class})</option>)}
            </Dropdown>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Certificate Type</label>
              <Dropdown value={form.type} onChange={e=>handleTypeChange(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {certTypes.map(t=><option key={t}>{t}</option>)}
              </Dropdown>
            </div>
            <Input label="Issued By" value={form.issuedBy} onChange={e=>setForm({...form,issuedBy:e.target.value})}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Certificate Content</label>
            <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} rows={5}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{saving?'Issuing…':'Issue Certificate'}</Button>
          </div>
        </div>
      </Modal>

      {viewItem && (
        <Modal open onClose={()=>setViewItem(null)} title={`${viewItem.type} Certificate — ${viewItem.student?.name||''}`} size="xl">
          <div className="space-y-4">
            {/* Exact certificate preview — iframe auto-sizes to content so there is no inner scrollbar */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
              <iframe
                title="Certificate preview"
                srcDoc={buildCertHTML(viewItem, false)}
                scrolling="no"
                onLoad={(e) => {
                  try {
                    const doc = e.target.contentWindow.document;
                    const h = Math.ceil(doc.body.scrollHeight);
                    if (h && Math.abs(h - certH) > 2) setCertH(h);
                  } catch { /* ignore cross-origin (won't happen for srcDoc) */ }
                }}
                className="w-full block"
                style={{ height: certH, border: 'none', overflow: 'hidden' }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={()=>setViewItem(null)}>Close</Button>
              <Button variant="primary" icon={Printer} onClick={()=>printCert(viewItem)}>Print Certificate</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
