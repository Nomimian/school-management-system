import { useState, useEffect } from 'react';
import { Plus, Award, Trash2, Pencil, ClipboardCheck } from 'lucide-react';
import { examAPI, studentAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, Modal, Input, Avatar, EmptyState, TableSkeleton, useToast, useConfirm } from '../components/ui';
import { useClasses } from '../hooks/useClasses';

const statusColors = { Upcoming:'blue', Completed:'green', Ongoing:'orange' };
const emptyForm = { name:'', class:'', subject:'', startDate:'', endDate:'', totalMarks:100, passMark:40, status:'Upcoming' };

export default function Exams() {
  const toast = useToast();
  const confirm = useConfirm();
  const { names: classes } = useClasses();
  const [exams, setExams]       = useState([]);
  const [results, setResults]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [tab, setTab]           = useState('exams');
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [resultModal, setResultModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [resultForm, setResultForm] = useState({ student:'', marks:'', remarks:'' });

  const fetchExams = async () => {
    setLoading(true);
    try { const res = await examAPI.getAll(); setExams(res.data||[]); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchExams(); }, []);
  useEffect(() => {
    studentAPI.getAll({ limit:200 }).then(r => setStudents(r.data||[])).catch(console.error);
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (exam) => {
    setEditing(exam);
    setForm({
      name: exam.name || '',
      class: exam.class || '',
      subject: exam.subject || '',
      startDate: exam.startDate?.slice(0,10) || '',
      endDate: exam.endDate?.slice(0,10) || '',
      totalMarks: exam.totalMarks ?? 100,
      passMark: exam.passMark ?? 40,
      status: exam.status || 'Upcoming',
    });
    setModal(true);
  };

  const saveExam = async () => {
    setSaving(true);
    try {
      if (editing) { await examAPI.update(editing._id, form); toast.success('Exam updated'); }
      else { await examAPI.create(form); toast.success('Exam created'); }
      setModal(false);
      setEditing(null);
      fetchExams();
    }
    catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const deleteExam = async (id) => {
    if (!(await confirm({ title:'Delete exam?', message:'This will remove the exam and its results.', tone:'danger', confirmText:'Delete' }))) return;
    try { await examAPI.delete(id); fetchExams(); toast.success('Exam deleted'); }
    catch(e) { toast.error(e.message); }
  };

  const openResults = async (exam) => {
    setSelectedExam(exam);
    setTab('results');
    setResultsLoading(true);
    try {
      const res = await examAPI.getResults(exam._id);
      setResults(res.data||[]);
    } catch(e) { toast.error(e.message); setResults([]); }
    finally { setResultsLoading(false); }
  };

  const addResult = async () => {
    if (!selectedExam) { toast.error('Select an exam first'); return; }
    setSaving(true);
    try {
      await examAPI.addResult(selectedExam._id, { ...resultForm, marks: Number(resultForm.marks) });
      const res = await examAPI.getResults(selectedExam._id);
      setResults(res.data||[]);
      setResultModal(false);
      setResultForm({ student:'', marks:'', remarks:'' });
      toast.success('Result added');
    } catch(e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const gradeColor = (g) => {
    if (!g) return 'bg-slate-100 text-slate-500';
    if (g.includes('+')) return 'bg-emerald-100 text-emerald-700';
    if (g === 'F') return 'bg-red-100 text-red-600';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Examinations"
        subtitle="Manage exams, schedules and results"
        action={
          <div className="flex gap-2">
            {tab === 'results' && selectedExam && (
              <Button variant="secondary" size="sm" onClick={() => setTab('exams')}>← Back to Exams</Button>
            )}
            {tab === 'results' && selectedExam && (
              <Button variant="success" size="sm" icon={Plus} onClick={() => setResultModal(true)}>Add Result</Button>
            )}
            {tab === 'exams' && (
              <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Create Exam</Button>
            )}
          </div>
        }
      />

      <div className="flex gap-2">
        {['exams','results'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tab===t ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'}`}>
            {t === 'results' ? `Results${selectedExam ? ` – ${selectedExam.name}` : ''}` : 'Exams'}
          </button>
        ))}
      </div>

      {tab === 'exams' && (
        <>
          {loading ? (
            <Card><TableSkeleton rows={6} cols={4}/></Card>
          ) : exams.length === 0 ? (
            <Card>
              <EmptyState
                icon={Award}
                title="No exams created yet"
                subtitle="Schedule your first examination to start tracking marks and results."
                action={<Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Create Exam</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map(e => (
                <Card key={e._id} hover className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-blue-500 flex items-center justify-center">
                      <Award size={20} className="text-white"/>
                    </div>
                    <Badge variant={statusColors[e.status]||'gray'} dot>{e.status}</Badge>
                  </div>
                  <h3 className="font-display font-bold text-slate-800 mb-1">{e.name}</h3>
                  <div className="text-sm text-slate-500 mb-3">{e.class}{e.subject ? ` · ${e.subject}` : ''}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-4">
                    <div><span className="text-slate-400">Start: </span>{e.startDate?.slice(0,10)}</div>
                    <div><span className="text-slate-400">End: </span>{e.endDate?.slice(0,10)}</div>
                    <div><span className="text-slate-400">Total Marks: </span>{e.totalMarks}</div>
                    <div><span className="text-slate-400">Pass Mark: </span>{e.passMark}</div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button onClick={() => openResults(e)}
                      className="flex-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 py-1.5 rounded-lg font-medium">View Results</button>
                    <button onClick={() => openEdit(e)} title="Edit exam"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={14}/></button>
                    <button onClick={() => deleteExam(e._id)} title="Delete exam"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'results' && !selectedExam && (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No exam selected"
            subtitle="Pick an exam from the Exams tab and click “View Results” to see and record marks."
            action={<Button variant="secondary" size="sm" onClick={() => setTab('exams')}>Browse Exams</Button>}
          />
        </Card>
      )}

      {tab === 'results' && selectedExam && (
        <Card>
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-display font-bold text-slate-800">
              {selectedExam?.name || 'Results'} — {selectedExam?.class}
            </h3>
          </div>
          {resultsLoading ? <TableSkeleton rows={6} cols={7}/> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Student','Class','Marks','Percentage','Grade','Status','Remarks'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r._id} className="border-b border-slate-50 hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.student?.name||'?'} size="sm"/>
                        <div>
                          <div className="font-medium text-slate-800">{r.student?.name}</div>
                          <div className="text-xs text-slate-400">{r.student?.rollNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="blue">{r.student?.class}</Badge></td>
                    <td className="px-4 py-3 font-bold text-center text-slate-700">{r.marks}/{selectedExam?.totalMarks||100}</td>
                    <td className="px-4 py-3 font-semibold text-center text-primary-600">
                      {((r.marks / (selectedExam?.totalMarks||100)) * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={r.isPassed ? 'green' : 'red'}>{r.isPassed ? 'Pass' : 'Fail'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{r.remarks||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length === 0 && (
              <EmptyState
                icon={ClipboardCheck}
                title="No results added yet"
                subtitle="Record a student's marks for this exam to build the results sheet."
                action={<Button variant="success" size="sm" icon={Plus} onClick={() => setResultModal(true)}>Add Result</Button>}
              />
            )}
          </div>
          )}
        </Card>
      )}

      {/* Create / Edit Exam Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Edit Exam' : 'Create Exam'} size="md">
        <div className="space-y-4">
          <Input label="Exam Name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. Mid-Term Examination"/>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Class</label>
              <select value={form.class} onChange={e => setForm({...form, class:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Subject" value={form.subject} onChange={e => setForm({...form, subject:e.target.value})} placeholder="e.g. Mathematics"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.startDate} onChange={e => setForm({...form, startDate:e.target.value})}/>
            <Input label="End Date"   type="date" value={form.endDate}   onChange={e => setForm({...form, endDate:e.target.value})}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Total Marks" type="number" value={form.totalMarks} onChange={e => setForm({...form, totalMarks:Number(e.target.value)})}/>
            <Input label="Pass Mark" type="number" value={form.passMark} onChange={e => setForm({...form, passMark:Number(e.target.value)})}/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <select value={form.status} onChange={e => setForm({...form, status:e.target.value})}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              {['Upcoming','Ongoing','Completed'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setModal(false); setEditing(null); }}>Cancel</Button>
            <Button variant="primary" onClick={saveExam} loading={saving}>{editing ? 'Save Changes' : 'Create Exam'}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Result Modal */}
      <Modal open={resultModal} onClose={() => setResultModal(false)} title={`Add Result – ${selectedExam?.name||''}`} size="md">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Student</label>
            <select value={resultForm.student} onChange={e => setResultForm({...resultForm, student:e.target.value})}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">Select student</option>
              {students.filter(s => !selectedExam?.class || s.class === selectedExam.class).map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.rollNumber})</option>
              ))}
            </select>
          </div>
          <Input label={`Marks (out of ${selectedExam?.totalMarks||100})`} type="number"
            value={resultForm.marks} onChange={e => setResultForm({...resultForm, marks:e.target.value})}
            placeholder={`0–${selectedExam?.totalMarks||100}`}/>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Remarks (optional)</label>
            <textarea value={resultForm.remarks} onChange={e => setResultForm({...resultForm, remarks:e.target.value})}
              rows={2} placeholder="Any remarks…"
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-slate-50 resize-none"/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setResultModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={addResult} loading={saving}>Save Result</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
