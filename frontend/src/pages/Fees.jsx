import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../config/env.js';
import { DollarSign, Search, Plus, CheckCircle, Clock, AlertCircle, Loader2, RefreshCw, Printer, FileText } from 'lucide-react';
import { feeAPI, studentAPI } from '../services/api';
import { useSchool } from '../hooks/useSchool.jsx';
import { useOptions } from '../hooks/useOptions.js';
import { buildPrintPage, openPrintWindow, stampEnabled } from '../components/print/PrintComponents.jsx';
import { SectionHeader, Card, Badge, Button, Modal, Input, Avatar, useToast, Dropdown, EmptyState, TableSkeleton } from '../components/ui';
import { ReportMenu } from '../components/ReportMenu.jsx';
import { DateRangePicker } from '../components/DateRangePicker.jsx';
import { inDateRange, rangeLabel, rangeSlug } from '../utils/reportExport.js';
import { startOfMonth, endOfMonth, endOfDay } from 'date-fns';

const statusColors = { Paid:'green', Pending:'orange', Overdue:'red', Partial:'purple' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = MONTHS[new Date().getMonth()];

export default function Fees() {
  const toast = useToast();
  const navigate = useNavigate();
  const { school } = useSchool();
  const { get: opt } = useOptions();
  const PAY_METHODS = opt('paymentMethods', ['Cash','Bank Transfer','Online','Cheque']);
  const [fees, setFees]           = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('');
  const [modalOpen, setModal]     = useState(false);
  const [receiptModal, setReceipt]= useState(false);
  const [selected, setSelected]   = useState(null);
  const [students, setStudents]   = useState([]);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ student:'', month:CURRENT_MONTH, year:CURRENT_YEAR, amount:'', paid:'', method:'Cash' });
  // Collect-payment dialog (opened from "Mark Paid" on a challan)
  const [payOpen, setPayOpen]     = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm]     = useState({ method:'Cash', amount:'', paidDate:new Date().toISOString().slice(0,10) });
  const [payingNow, setPaying]    = useState(false);
  // Date-range filter — also scopes the SERVER fetch so only the selected window
  // loads (default: current month), then drives the statement export.
  const [range, setRange] = useState({ from: startOfMonth(new Date()), to: endOfDay(endOfMonth(new Date())) });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from: range.from.toISOString(), to: range.to.toISOString() };
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      const [feesRes, statsRes] = await Promise.all([feeAPI.getAll(params), feeAPI.getStats({ year:CURRENT_YEAR })]);
      setFees(feesRes.data || []);
      setStats(statsRes.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, search, range]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    studentAPI.getAll({ limit:200 }).then(r => setStudents(r.data||[])).catch(console.error);
  }, []);

  // Server already scoped to the range; this is a harmless client-side re-filter.
  const filteredFees = fees.filter(f => inDateRange(f.createdAt, range.from, range.to));

  const repExpected  = filteredFees.reduce((s,f) => s + (f.amount||0), 0);
  const repCollected = filteredFees.reduce((s,f) => s + (f.paid||0), 0);
  const REPORT_COLS = [
    { key:'date',    label:'Date',    value:r => r.createdAt?.slice(0,10) || '—' },
    { key:'student', label:'Student', value:r => r.student?.name || '—' },
    { key:'class',   label:'Class',   value:r => r.student?.class || '—' },
    { key:'period',  label:'Month',   value:r => `${r.month} ${r.year}` },
    { key:'amount',  label:'Total (Rs)',   align:'right', value:r => (r.amount||0).toLocaleString() },
    { key:'paid',    label:'Paid (Rs)',    align:'right', value:r => (r.paid||0).toLocaleString() },
    { key:'balance', label:'Balance (Rs)', align:'right', value:r => (r.balance||0).toLocaleString() },
    { key:'status',  label:'Status',  value:r => r.status,
      pdf:r => `<span class="badge badge-${(r.status||'').toLowerCase()}">${r.status||''}</span>` },
    { key:'method',  label:'Method',  value:r => r.method || '—' },
  ];
  const REPORT_TOTALS = [
    { label:'Records',     value:filteredFees.length },
    { label:'Expected',    value:`Rs ${repExpected.toLocaleString()}` },
    { label:'Collected',   value:`Rs ${repCollected.toLocaleString()}` },
    { label:'Outstanding', value:`Rs ${(repExpected-repCollected).toLocaleString()}` },
  ];

  // Open the collect-payment dialog for a challan (default: clear the balance)
  const openPay = (fee) => {
    const balance = Math.max(0, (fee.amount || 0) - (fee.paid || 0));
    setPayTarget(fee);
    setPayForm({ method: fee.method || 'Cash', amount: balance, paidDate: new Date().toISOString().slice(0,10) });
    setPayOpen(true);
  };

  const confirmPayment = async () => {
    if (!payTarget) return;
    const balance = Math.max(0, (payTarget.amount || 0) - (payTarget.paid || 0));
    const amt = payForm.amount === '' ? balance : Math.max(0, Number(payForm.amount) || 0);
    if (amt <= 0) return toast.error('Enter an amount greater than 0.');
    setPaying(true);
    try {
      const res = await feeAPI.markPaid(payTarget._id, { method: payForm.method, amount: amt, paidDate: payForm.paidDate });
      setPayOpen(false);
      await fetchAll();
      // Show the receipt straight away so it can be printed.
      setSelected(res.data);
      setReceipt(true);
      toast.success(res.data?.status === 'Paid' ? 'Payment recorded — receipt ready' : `Partial payment recorded — balance Rs ${(res.data?.balance||0).toLocaleString()}`);
    } catch(e) { toast.error(e.message || 'Could not record payment'); }
    finally { setPaying(false); }
  };

  // Derived preview of the invoice being recorded (total vs paid → status/balance)
  const pvTotal   = Number(form.amount) || 0;
  const pvPaid    = form.paid === '' ? pvTotal : Math.max(0, Number(form.paid) || 0);
  const pvStatus  = pvPaid <= 0 ? 'Pending' : pvPaid >= pvTotal ? 'Paid' : 'Partial';
  const pvBalance = Math.max(pvTotal - pvPaid, 0);

  const recordPayment = async () => {
    if (!form.student) return toast.error('Please select a student.');
    if (pvTotal <= 0)  return toast.error('Enter a valid total fee amount.');
    setSaving(true);
    try {
      await feeAPI.create({
        student: form.student, month: form.month, year: form.year, method: form.method,
        amount: pvTotal, paid: pvPaid, balance: pvBalance, status: pvStatus,
        dueDate: new Date(), paidDate: pvPaid > 0 ? new Date() : undefined,
      });
      setModal(false);
      setForm({ student:'', month:CURRENT_MONTH, year:CURRENT_YEAR, amount:'', paid:'', method:'Cash' });
      fetchAll();
      toast.success(
        pvStatus === 'Paid' ? 'Payment recorded'
          : pvStatus === 'Partial' ? `Partial payment recorded — balance Rs ${pvBalance.toLocaleString()}`
          : 'Invoice created (pending)'
      );
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const totalCollected = repCollected;
  const totalExpected  = repExpected;
  const totalBalance   = totalExpected - totalCollected;

  const printReceipt = (r) => {
    const statusBadge = `<span class="badge badge-${(r.status||'').toLowerCase()}">${r.status}</span>`;
    // Note: the official stamp is rendered once by buildPrintPage's header
    // (honouring the "show stamp on fee" toggle) — no separate body stamp here.
    const content = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-size:13px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-bottom:6px;">Receipt Details</div>
          <div class="info-grid" style="grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div class="info-item"><label>Receipt No</label><span>${r.receiptNo||'—'}</span></div>
            <div class="info-item"><label>Status</label><span>${statusBadge}</span></div>
            <div class="info-item"><label>Date Issued</label><span>${new Date().toLocaleDateString('en-PK')}</span></div>
          </div>
        </div>
      </div>
      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">Student Information</h3>
      <div class="info-grid">
        <div class="info-item"><label>Student Name</label><span>${r.student?.name||'—'}</span></div>
        <div class="info-item"><label>Class</label><span>${r.student?.class||'—'}</span></div>
        <div class="info-item"><label>Roll No</label><span>${r.student?.rollNumber||'—'}</span></div>
        <div class="info-item"><label>Student ID</label><span>${r.student?.studentId||'—'}</span></div>
      </div>
      <h3 style="font-size:13px;font-weight:bold;color:#475569;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">Fee Details — ${r.month} ${r.year}</h3>
      <table>
        <thead><tr><th>Fee Head</th><th style="text-align:right">Amount</th><th style="text-align:right">Discount</th><th style="text-align:right">Payable</th></tr></thead>
        <tbody>
          ${(r.items?.length ? r.items : [{ name:`School Fee – ${r.month} ${r.year}`, amount:r.amount, discount:0 }]).map(it => `
            <tr>
              <td>${it.name}</td>
              <td style="text-align:right">Rs ${(it.amount||0).toLocaleString()}</td>
              <td style="text-align:right">Rs ${(it.discount||0).toLocaleString()}</td>
              <td style="text-align:right">Rs ${((it.amount||0)-(it.discount||0)).toLocaleString()}</td>
            </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="3" style="text-align:right;font-weight:bold;">Total Payable</td>
          <td style="text-align:right;font-weight:bold;">Rs ${(r.amount||0).toLocaleString()}</td>
        </tr></tfoot>
      </table>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 14px;border-radius:6px;display:flex;justify-content:space-between;font-size:13px;">
        <span>Payment Method: <strong>${r.method||'—'}</strong></span>
        <span>Date Paid: <strong>${r.paidDate?.slice(0,10)||'—'}</strong></span>
        <span style="font-size:15px;font-weight:bold;color:#065f46;">Amount Paid: Rs ${(r.paid||0).toLocaleString()}</span>
      </div>
      <div class="sig-row">
        <div class="sig-box">
          <div style="font-weight:600;font-size:12px;color:#1e293b;margin-bottom:2px;">${r.recordedBy?.name || ''}</div>
          <div class="sig-line"></div><div class="sig-label">Received By</div>
        </div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Accountant</div></div>
        <div class="sig-box"><div class="sig-line"></div><div class="sig-label">${school?.principal||'Principal'}</div></div>
      </div>
      <div style="text-align:center;margin-top:10px;font-size:10px;color:#94a3b8;font-style:italic;">
        This is an official fee receipt. Please retain for your records.
      </div>`;
    openPrintWindow(buildPrintPage(content, school, 'Fee Receipt', 'fee'));
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Fee Management"
        subtitle="Manage student fee records and payments"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker from={range.from} to={range.to} onApply={(from,to)=>setRange({from,to})} />
            <ReportMenu
              title={`Fee Collection Statement — ${rangeLabel(range.from, range.to)}`}
              subtitle={school?.name}
              filename={`fees-${rangeSlug(range.from, range.to)}`}
              columns={REPORT_COLS} rows={filteredFees} totals={REPORT_TOTALS} docType="fee" />
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchAll}>Refresh</Button>
            <Button variant="secondary" size="sm" icon={FileText}  onClick={() => navigate('/fees/generate')}>Generate Challan</Button>
            <Button variant="primary"   size="sm" icon={Plus}      onClick={() => setModal(true)}>Record Payment</Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Expected',  val:`Rs ${(totalExpected/1000).toFixed(0)}K`, icon:DollarSign, color:'bg-blue-50 text-blue-700 border-blue-200' },
          { label:'Total Collected', val:`Rs ${(totalCollected/1000).toFixed(0)}K`, icon:CheckCircle, color:'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label:'Total Pending',   val:`Rs ${(totalBalance/1000).toFixed(0)}K`,  icon:Clock, color:'bg-orange-50 text-orange-700 border-orange-200' },
          { label:'Collection Rate', val:totalExpected ? `${Math.round((totalCollected/totalExpected)*100)}%` : '—', icon:AlertCircle, color:'bg-purple-50 text-purple-700 border-purple-200' },
        ].map(i => (
          <div key={i.label} className={`rounded-2xl border p-5 flex items-center gap-4 ${i.color}`}>
            <i.icon size={24} className="flex-shrink-0"/>
            <div><div className="text-xl font-display font-bold">{i.val}</div><div className="text-xs font-medium mt-0.5">{i.label}</div></div>
          </div>
        ))}
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input placeholder="Search student, class…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200"/>
          </div>
          <Dropdown value={filterStatus} onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
            <option value="">All Status</option>
            {['Paid','Pending','Overdue','Partial'].map(s => <option key={s}>{s}</option>)}
          </Dropdown>
        </div>

        <div className="overflow-x-auto">
          {loading ? <TableSkeleton rows={6} cols={9}/> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Student','Class','Month','Amount','Paid','Balance','Status','Due Date','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFees.map(r => (
                  <tr key={r._id} className="border-b border-slate-50 hover:bg-primary-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.student?.name||'?'} size="sm"/>
                        <span className="font-medium text-slate-700">{r.student?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="blue">{r.student?.class}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{r.month} {r.year}</td>
                    <td className="px-4 py-3 font-medium">Rs {r.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">Rs {r.paid?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-500 font-medium">Rs {r.balance?.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant={statusColors[r.status]}>{r.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.dueDate?.slice(0,10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.status !== 'Paid' && (
                          <button onClick={() => openPay(r)} className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2.5 py-1 rounded-lg font-medium">Mark Paid</button>
                        )}
                        <button onClick={() => { setSelected(r); setReceipt(true); }} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2.5 py-1 rounded-lg font-medium">Receipt</button>
                        <button onClick={() => printReceipt(r)} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1"><Printer size={12}/> Print</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filteredFees.length === 0 && (
            <EmptyState icon={DollarSign} title="No fee records in this range"
              subtitle={fees.length ? 'Try widening the date range (e.g. “All time”) to see more records.' : 'Record a payment to start tracking fees, dues and receipts.'} />
          )}
        </div>
      </Card>

      {/* Record Payment Modal */}
      <Modal open={modalOpen} onClose={() => setModal(false)} title="Record Fee Payment" size="md">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Student</label>
            <Dropdown value={form.student} onChange={e => setForm({...form, student:e.target.value})}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">Select student</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.class})</option>)}
            </Dropdown>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Month</label>
              <Dropdown value={form.month} onChange={e => setForm({...form, month:e.target.value})}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m}>{m}</option>)}
              </Dropdown>
            </div>
            <Input label="Year" type="number" value={form.year} onChange={e => setForm({...form, year:Number(e.target.value)})}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Total Fee (Rs)" type="number" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} placeholder="5000"/>
            <Input label="Amount Paid Now" type="number" value={form.paid} onChange={e => setForm({...form, paid:e.target.value})} placeholder="Full if blank"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Payment Method</label>
            <Dropdown value={form.method} onChange={e => setForm({...form, method:e.target.value})}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
              {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
            </Dropdown>
          </div>

          {/* Live preview: status + balance so partial payments are unambiguous */}
          {pvTotal > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">This invoice:</span>
                <Badge variant={statusColors[pvStatus]}>{pvStatus}</Badge>
              </div>
              <div className="text-sm text-slate-600">
                Paid <strong className="text-emerald-600">Rs {pvPaid.toLocaleString()}</strong>
                {pvBalance > 0 && <> · Balance <strong className="text-red-500">Rs {pvBalance.toLocaleString()}</strong></>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={recordPayment} disabled={saving}>{saving ? 'Saving…' : 'Record Payment'}</Button>
          </div>
        </div>
      </Modal>

      {/* Collect Payment Modal — opened from "Mark Paid" on a challan */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Collect Payment" size="sm">
        {payTarget && (() => {
          const balance = Math.max(0, (payTarget.amount || 0) - (payTarget.paid || 0));
          const items = payTarget.items?.length ? payTarget.items : [{ name:`School Fee – ${payTarget.month} ${payTarget.year}`, amount:payTarget.amount, discount:0 }];
          const amt = payForm.amount === '' ? balance : Math.max(0, Number(payForm.amount) || 0);
          const willBe = amt >= balance ? 'Paid' : amt > 0 ? 'Partial' : 'Pending';
          return (
            <div className="space-y-4">
              {/* Challan summary */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{payTarget.student?.name}</span>
                  <Badge variant="blue">{payTarget.student?.class}</Badge>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((it,i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-1.5 text-slate-600">{it.name}</td>
                        <td className="px-4 py-1.5 text-right text-slate-700">Rs {((it.amount||0)-(it.discount||0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/70"><td className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase">{payTarget.month} {payTarget.year} · Total</td><td className="px-4 py-1.5 text-right font-bold text-slate-800">Rs {(payTarget.amount||0).toLocaleString()}</td></tr>
                    {payTarget.paid > 0 && <tr><td className="px-4 py-1.5 text-xs text-slate-400 uppercase">Already paid</td><td className="px-4 py-1.5 text-right text-emerald-600">Rs {payTarget.paid.toLocaleString()}</td></tr>}
                    <tr><td className="px-4 py-1.5 text-xs font-semibold text-red-500 uppercase">Balance</td><td className="px-4 py-1.5 text-right font-bold text-red-500">Rs {balance.toLocaleString()}</td></tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Payment Method</label>
                  <Dropdown value={payForm.method} onChange={e => setPayForm({...payForm, method:e.target.value})}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200">
                    {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                  </Dropdown>
                </div>
                <Input label="Amount Received" type="number" value={payForm.amount} onChange={e => setPayForm({...payForm, amount:e.target.value})} placeholder={String(balance)}/>
                <div className="col-span-2">
                  <Input label="Payment Date" type="date" value={payForm.paidDate} onChange={e => setPayForm({...payForm, paidDate:e.target.value})}/>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm">
                <span className="text-slate-500">After this payment:</span>
                <Badge variant={statusColors[willBe]}>{willBe}</Badge>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button variant="primary" icon={payingNow ? Loader2 : CheckCircle} onClick={confirmPayment} disabled={payingNow}>{payingNow ? 'Saving…' : 'Confirm Payment'}</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Receipt Modal — premium, school-branded */}
      <Modal open={receiptModal} onClose={() => setReceipt(false)} title="Fee Receipt" size="sm">
        {selected && (
          <div className="space-y-4">
            {/* Branded header */}
            <div className="relative rounded-2xl p-5 text-white overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${school?.primaryColor||'#1d4ed8'}, ${school?.primaryColor||'#1d4ed8'}bb)` }}>
              <div className="flex items-center gap-3">
                {school?.logo
                  ? <img src={`${SERVER_URL}${school.logo}`} alt="" className="w-11 h-11 rounded-xl object-contain bg-white/90 p-1"/>
                  : <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">{school?.shortName?.charAt(0)||school?.name?.charAt(0)||'S'}</div>}
                <div className="min-w-0">
                  <div className="text-lg font-display font-bold leading-tight truncate">{school?.name || 'School'}</div>
                  <div className="text-white/70 text-xs truncate">{school?.address || school?.city || ''}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-white/80 text-xs uppercase tracking-widest">Official Fee Receipt</span>
                <span className="text-xs font-mono bg-white/15 px-2 py-0.5 rounded-md">{selected.receiptNo || 'UNPAID'}</span>
              </div>
            </div>

            {/* Amount highlight */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Amount Paid</div>
                <div className="text-2xl font-display font-bold text-slate-800">Rs {selected.paid?.toLocaleString() || 0}</div>
              </div>
              <Badge variant={statusColors[selected.status]}>{selected.status}</Badge>
            </div>

            <div className="space-y-2">
              {[
                ['Student', selected.student?.name],
                ['Class', selected.student?.class],
                ['Fee Month', `${selected.month} ${selected.year}`],
                ['Total Amount', `Rs ${selected.amount?.toLocaleString()}`],
                ['Balance', `Rs ${(selected.balance||0).toLocaleString()}`],
                ['Method', selected.method||'—'],
                ['Paid Date', selected.paidDate?.slice(0,10)||'—'],
                ['Due Date', selected.dueDate?.slice(0,10)||'—'],
                ['Received By', selected.recordedBy?.name||'—'],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-slate-50 text-sm last:border-0">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-700">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setReceipt(false)}>Close</Button>
              <Button variant="print" icon={Printer} onClick={() => printReceipt(selected)}>Print Receipt</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
