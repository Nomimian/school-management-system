import { useState, useRef, useEffect } from 'react';
import { Search, Printer, Download, Award, Loader2, Star } from 'lucide-react';
import { reportCardAPI, examAPI, studentAPI } from '../services/api';
import { SectionHeader, Card, Badge, Button, useToast } from '../components/ui';
import { useSchool } from '../hooks/useSchool.jsx';

const gradeColor = (g) => {
  if (!g) return '#64748b';
  if (g === 'A+' || g === 'A') return '#059669';
  if (g === 'B+' || g === 'B') return '#2563eb';
  if (g === 'C')               return '#d97706';
  if (g === 'D')               return '#ea580c';
  return '#dc2626';
};

export default function ResultCard() {
  const toast = useToast();
  const { school } = useSchool();
  const [students, setStudents]     = useState([]);
  const [exams, setExams]           = useState([]);
  const [searchStudent, setSearch]  = useState('');
  const [selectedStudent, setStudent] = useState('');
  const [selectedExams, setSelExams]  = useState([]);
  const [reportCard, setReportCard]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [generating, setGenerating]   = useState(false);
  const printRef = useRef();

  const searchStudents = async (q) => {
    setSearch(q);
    if (q.length < 2) { setStudents([]); return; }
    const res = await studentAPI.getAll({ search: q, limit: 10 });
    setStudents(res.data || []);
  };

  const loadExams = async () => {
    const res = await examAPI.getAll();
    setExams(res.data || []);
  };

  useEffect(() => { loadExams(); }, []);

  const generate = async () => {
    if (!selectedStudent) { toast.error('Please select a student.'); return; }
    setGenerating(true);
    try {
      const params = { studentId: selectedStudent };
      if (selectedExams.length) params.examIds = selectedExams.join(',');
      const res = await reportCardAPI.generate(params);
      setReportCard(res.data);
      toast.success('Report card generated');
    } catch(e) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Report Card</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Arial', sans-serif; color: #1e293b; }
        .rc { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align:center; border-bottom: 3px solid #1d4ed8; padding-bottom:16px; margin-bottom:16px; }
        .school-name { font-size:24px; font-weight:bold; color:#1d4ed8; }
        .report-title { font-size:16px; color:#64748b; margin-top:4px; }
        .student-info { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; background:#f8fafc; padding:12px; border-radius:8px; }
        .info-item label { font-size:10px; color:#94a3b8; text-transform:uppercase; }
        .info-item span { font-size:13px; font-weight:600; }
        table { width:100%; border-collapse:collapse; margin-bottom:16px; }
        th { background:#1d4ed8; color:white; padding:8px; text-align:left; font-size:11px; text-transform:uppercase; }
        td { padding:8px; border-bottom:1px solid #e2e8f0; font-size:12px; }
        tr:nth-child(even) { background:#f8fafc; }
        .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
        .summary-item { text-align:center; padding:12px; border-radius:8px; background:#f1f5f9; }
        .summary-item .val { font-size:20px; font-weight:bold; }
        .summary-item .lbl { font-size:10px; color:#64748b; }
        .grade-badge { display:inline-block; padding:3px 8px; border-radius:20px; font-weight:bold; font-size:12px; }
        .footer { text-align:center; margin-top:20px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; }
        .signature-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:30px; }
        .sig-line { text-align:center; }
        .sig-line .line { border-top:1px solid #334155; margin-bottom:4px; }
        .sig-line .name { font-size:11px; color:#64748b; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      </style></head><body>
      <div class="rc">${content}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const rc = reportCard;

  return (
    <div className="space-y-5">
      <SectionHeader title="Result Card Generator" subtitle="Generate and print student report cards"/>

      {/* Controls */}
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          {/* Student Search */}
          <div className="sm:col-span-2 flex flex-col gap-1.5 relative">
            <label className="text-sm font-medium text-slate-700">Search Student</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={searchStudent} onChange={e=>searchStudents(e.target.value)} placeholder="Type student name to search…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
            </div>
            {students.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 border border-slate-200 rounded-xl bg-white shadow-float overflow-hidden max-h-60 overflow-y-auto scrollbar-thin">
                {students.map(s => (
                  <button key={s._id} onClick={()=>{ setStudent(s._id); setSearch(s.name+' – '+s.class); setStudents([]); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-xs font-bold">{s.name[0]}</div>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.class} · {s.rollNumber}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="primary" icon={generating ? Loader2 : Award} onClick={generate} disabled={generating || !selectedStudent} className="self-end">
            {generating ? 'Generating…' : 'Generate Report Card'}
          </Button>
        </div>

        {/* Exam filter — toggle chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">Include Exams</label>
            <span className="text-xs text-slate-400">
              {selectedExams.length === 0 ? 'All exams included' : `${selectedExams.length} selected`}
              {selectedExams.length > 0 && (
                <button onClick={()=>setSelExams([])} className="ml-2 text-primary-600 hover:underline">Clear</button>
              )}
            </span>
          </div>
          {exams.length === 0 ? (
            <div className="text-sm text-slate-400 py-2">No exams found. Create exams first.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {exams.map(ex => {
                const on = selectedExams.includes(ex._id);
                return (
                  <button key={ex._id}
                    onClick={()=>setSelExams(on ? selectedExams.filter(id=>id!==ex._id) : [...selectedExams, ex._id])}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                      ${on ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:bg-blue-50'}`}>
                    {ex.name} <span className={on?'text-blue-100':'text-slate-400'}>· {ex.class}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Report Card Preview */}
      {rc && (
        <>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>Print</Button>
          </div>

          {/* Printable Area */}
          <div ref={printRef} className="bg-white rounded-3xl shadow-float border border-blue-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 p-6 text-white text-center">
              <div className="text-2xl font-display font-bold tracking-wide">{school?.name || 'School Management System'}</div>
              <div className="text-blue-200 text-sm mt-1">Academic Report Card</div>
              <div className="text-blue-300 text-xs mt-0.5">
                {[school?.address || school?.city, school?.phone, school?.email].filter(Boolean).join(' · ')}
              </div>
            </div>

            {/* Student Info */}
            <div className="p-5 bg-blue-50/50 border-b border-blue-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  ['Student Name', rc.student?.name],
                  ['Student ID',   rc.student?.studentId],
                  ['Class',        rc.student?.class],
                  ['Roll No.',     rc.student?.rollNumber],
                  ['Gender',       rc.student?.gender],
                  ['Session',      '2024–2025'],
                  ['Result Date',  new Date(rc.summary?.resultDate).toLocaleDateString()],
                  ['Class Rank',   rc.summary?.rank ? `${rc.summary.rank} / ${rc.summary.totalStudents}` : '—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{k}</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Table */}
            <div className="p-5">
              {rc.examResults?.map(({ exam, results }) => (
                <div key={exam?._id || exam?.name} className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="font-display font-bold text-slate-800">{exam?.name}</div>
                    <Badge variant="blue">{exam?.class}</Badge>
                    <div className="text-xs text-slate-400">{exam?.startDate?.slice(0,10)}</div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary-600 text-white">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold">Subject</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold">Total Marks</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold">Obtained</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold">Percentage</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold">Grade</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => {
                          const pct = ((r.marks / (exam?.totalMarks || 100)) * 100).toFixed(1);
                          return (
                            <tr key={r._id} className={i%2===0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="px-4 py-2.5 font-medium text-slate-700">{exam?.subject || 'General'}</td>
                              <td className="px-4 py-2.5 text-center text-slate-600">{exam?.totalMarks || 100}</td>
                              <td className="px-4 py-2.5 text-center font-bold text-slate-800">{r.marks}</td>
                              <td className="px-4 py-2.5 text-center font-semibold" style={{color: pct >= 60 ? '#059669' : '#dc2626'}}>{pct}%</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background: gradeColor(r.grade)}}>{r.grade}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`text-xs font-semibold ${r.isPassed ? 'text-emerald-600' : 'text-red-500'}`}>{r.isPassed ? '✓ Pass' : '✗ Fail'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {(!rc.examResults || rc.examResults.length === 0) && (
                <div className="text-center py-8 text-slate-400">No exam results found for this student.</div>
              )}
            </div>

            {/* Summary */}
            <div className="px-5 pb-5">
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-5 border border-blue-100">
                <div className="text-center font-display font-bold text-slate-700 mb-4">Overall Performance Summary</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {[
                    { label:'Total Marks',  val: rc.summary?.totalMax || 0,         color:'text-slate-700' },
                    { label:'Marks Obtained', val: rc.summary?.totalObtained || 0,  color:'text-primary-700' },
                    { label:'Percentage',   val: `${rc.summary?.percentage || 0}%`, color: rc.summary?.percentage >= 60 ? 'text-emerald-600' : 'text-red-500' },
                    { label:'GPA',          val: rc.summary?.gpa?.toFixed(1) || '—', color:'text-purple-600' },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-white rounded-xl p-3 shadow-sm">
                      <div className={`text-2xl font-display font-bold ${s.color}`}>{s.val}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-display font-bold"
                      style={{background: gradeColor(rc.summary?.grade)}}>
                      {rc.summary?.grade}
                    </div>
                    <div>
                      <div className="font-display font-bold text-slate-800 text-lg">{rc.summary?.remarks}</div>
                      <div className="text-slate-400 text-sm">Final Result: {rc.summary?.passed ? '✓ Promoted' : '✗ Detained'}</div>
                    </div>
                  </div>
                  {rc.summary?.rank && (
                    <div className="text-center">
                      <div className="text-2xl font-display font-bold text-orange-500">#{rc.summary.rank}</div>
                      <div className="text-xs text-slate-400">Class Rank</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-8 mt-8 pt-6">
                {['Class Teacher','Examination Controller','Principal'].map(role => (
                  <div key={role} className="text-center">
                    <div className="border-b border-slate-400 mb-2 h-8"/>
                    <div className="text-xs text-slate-500 font-medium">{role}</div>
                  </div>
                ))}
              </div>

              <div className="text-center text-xs text-slate-300 mt-4">
                This is a computer-generated report card. · {school?.name || 'School'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
