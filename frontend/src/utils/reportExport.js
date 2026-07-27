// Reusable report export — PDF (branded, via the existing print pipeline) and
// Excel (CSV, zero-dependency, opens in Excel). No external libraries.
//
// A "column" is: { key, label, value?(row)->string, pdf?(row)->html, total? }
//   • value(row) — cell text for CSV + PDF (defaults to row[key])
//   • pdf(row)   — raw HTML cell for the PDF only (e.g. a coloured badge)
//   • total      — 'sum' to auto-total a numeric column in the footer
//
// `totals` is an optional array of { label, value } shown as a summary band.

import { format } from 'date-fns';
import { buildPrintPage, openPrintWindow } from '../components/print/PrintComponents.jsx';

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Date-range helpers (shared by the picker, table filters and exports) ──────
// A null from/to means "All time" (no filtering).
export const inDateRange = (d, from, to) => {
  if (!from || !to) return true;
  if (!d) return false;
  const t = new Date(d).getTime();
  return !isNaN(t) && t >= from.getTime() && t <= to.getTime();
};
export const rangeLabel = (from, to) =>
  (!from || !to) ? 'All time' : `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`;
export const rangeSlug = (from, to) =>
  (!from || !to) ? 'all-time' : `${format(from, 'yyyy-MM-dd')}_to_${format(to, 'yyyy-MM-dd')}`;

const esc = (s = '') => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cellText = (col, row) => {
  const v = col.value ? col.value(row) : row[col.key];
  return v == null ? '' : String(v);
};

// ── CSV / Excel ──────────────────────────────────────────────────────────────
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv({ filename, title, columns, rows, totals }) {
  const lines = [];
  if (title) lines.push(csvCell(title));
  lines.push(columns.map(c => csvCell(c.label)).join(','));
  rows.forEach(r => lines.push(columns.map(c => csvCell(cellText(c, r))).join(',')));
  if (totals?.length) {
    lines.push('');
    totals.forEach(t => lines.push(`${csvCell(t.label)},${csvCell(t.value)}`));
  }
  // Prepend a BOM so Excel reads UTF-8 (currency symbols, names) correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const name = (filename || title || 'report').replace(/[^\w.-]+/g, '-');
  triggerDownload(blob, name.endsWith('.csv') ? name : `${name}.csv`);
}

// ── PDF (branded print page → "Save as PDF") ─────────────────────────────────
export function printReport({ school, title, subtitle, columns, rows, totals, docType }) {
  const th = columns.map(c => `<th style="text-align:${c.align || 'left'}">${esc(c.label)}</th>`).join('');
  const body = rows.length
    ? rows.map(r => `<tr>${columns.map(c =>
        `<td style="text-align:${c.align || 'left'}">${c.pdf ? c.pdf(r) : esc(cellText(c, r))}</td>`
      ).join('')}</tr>`).join('')
    : `<tr><td colspan="${columns.length}" style="text-align:center;color:#94a3b8;padding:20px;">No records for this period.</td></tr>`;

  const totalsBand = totals?.length
    ? `<div class="info-grid" style="grid-template-columns:repeat(${Math.min(totals.length, 4)},1fr);margin-top:14px;">
        ${totals.map(t => `<div class="info-item"><label>${esc(t.label)}</label><span>${esc(t.value)}</span></div>`).join('')}
      </div>`
    : '';

  const meta = subtitle
    ? `<div style="text-align:center;color:#64748b;font-size:12px;margin:-6px 0 14px;">${esc(subtitle)}</div>`
    : '';

  const content = `${meta}
    <table>
      <thead><tr>${th}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    ${totalsBand}
    <div style="margin-top:10px;font-size:11px;color:#94a3b8;">Total records: ${rows.length}</div>`;

  openPrintWindow(buildPrintPage(content, school, title, docType));
}

// Convenience: sum a numeric column across rows (ignores non-numbers).
export const sumBy = (rows, key) =>
  rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
