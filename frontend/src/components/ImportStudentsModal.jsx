import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, ArrowRight, Users } from 'lucide-react';
import { studentAPI } from '../services/api';
import { Modal, Button, Badge, useToast } from './ui';

/**
 * Bulk-import students from an Excel/CSV file.
 *   upload → preview (parsed server-side, mapped, with a summary) → confirm → result.
 * Recognises the school's ExportExcel columns plus common aliases; required
 * fields left blank are filled with random values (shown in the summary).
 */
export default function ImportStudentsModal({ open, onClose, onImported }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [step, setStep]       = useState('upload');   // upload | preview | result
  const [busy, setBusy]       = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult]   = useState(null);
  const [fileName, setFileName] = useState('');

  const reset = () => { setStep('upload'); setBusy(false); setPreview(null); setResult(null); setFileName(''); };
  const close = () => { reset(); onClose(); };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await studentAPI.importPreview(fd);
      setPreview(res.data);
      setStep('preview');
    } catch (err) { toast.error(err.message || 'Could not read the file'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const res = await studentAPI.import(preview.rows);
      setResult(res.data);
      setStep('result');
      onImported?.();
      toast.success(res.message || 'Imported');
    } catch (err) { toast.error(err.message || 'Import failed'); }
    finally { setBusy(false); }
  };

  const s = preview?.summary;

  return (
    <Modal open={open} onClose={close} title="Import Students from Excel" size="lg">
      {/* Step 1 — upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-primary-300 hover:bg-primary-50/30 transition-all">
            {busy ? <Loader2 size={34} className="text-primary-500 animate-spin"/> : <UploadCloud size={34} className="text-primary-500"/>}
            <div className="text-center">
              <div className="font-semibold text-slate-700">{busy ? 'Reading file…' : 'Click to choose an Excel / CSV file'}</div>
              <div className="text-xs text-slate-400 mt-1">.xlsx, .xls or .csv · up to 5 MB · up to 3000 rows</div>
            </div>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onPick}/>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="font-semibold text-slate-600 mb-1">Recognised columns</div>
            RegistrationNum, StudentName, Class, Section, Gender, StudentDOB, Religion, BloodGroup,
            FatherName, FatherNum, HomeAddress, FeeDiscount (and common aliases like Name, Grade, DOB, Phone).
            Missing Name / Class / Gender are auto-filled so no row is lost.
          </div>
        </div>
      )}

      {/* Step 2 — preview */}
      {step === 'preview' && s && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileSpreadsheet size={16} className="text-emerald-500"/> {fileName} · sheet “{preview.sheet}”
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Total rows', s.total, 'text-slate-700'],
              ['New', s.willCreate, 'text-emerald-600'],
              ['Update existing', s.willUpdate, 'text-blue-600'],
              ['Auto-filled fields', s.randomFills, 'text-amber-600'],
            ].map(([k, v, c]) => (
              <div key={k} className="rounded-xl border border-slate-200 p-3 text-center">
                <div className={`text-2xl font-display font-bold ${c}`}>{v}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{k}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview (first 20)</div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="text-left text-xs text-slate-400">
                  {['#','Reg No','Name','Class','Sec','Gender','Guardian'].map(h => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5 text-slate-500">{r.studentId || '—'}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-700">{r.name}</td>
                      <td className="px-3 py-1.5"><Badge variant="blue">{r.class}</Badge></td>
                      <td className="px-3 py-1.5 text-slate-500">{r.section || '—'}</td>
                      <td className="px-3 py-1.5 text-slate-500">{r.gender}</td>
                      <td className="px-3 py-1.5 text-slate-500">{r.guardian?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <Button variant="secondary" onClick={reset}>Choose another file</Button>
            <Button variant="primary" icon={busy ? Loader2 : ArrowRight} onClick={doImport} disabled={busy}>
              {busy ? 'Importing…' : `Import ${s.total} student${s.total === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — result */}
      {step === 'result' && result && (
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={28} className="text-emerald-600"/></div>
          <h3 className="font-display font-bold text-slate-800 text-lg">Import complete</h3>
          <div className="flex justify-center gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2"><div className="text-xl font-bold text-emerald-700">{result.created}</div><div className="text-xs text-emerald-600">Created</div></div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2"><div className="text-xl font-bold text-blue-700">{result.updated}</div><div className="text-xs text-blue-600">Updated</div></div>
            {result.skipped > 0 && <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2"><div className="text-xl font-bold text-slate-600">{result.skipped}</div><div className="text-xs text-slate-500">Skipped</div></div>}
          </div>
          <div className="flex justify-center gap-2 pt-1">
            <Button variant="secondary" onClick={reset} icon={Users}>Import more</Button>
            <Button variant="primary" onClick={close}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
