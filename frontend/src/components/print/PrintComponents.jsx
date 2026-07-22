import { useSchool } from '../../hooks/useSchool.jsx';

const API_BASE = 'http://localhost:5000';

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM STAMP ENGINE  —  shapes: 'circle' | 'square' | 'rectangle'
//  • Long names NEVER collapse/overlap:
//      – circle  → name arc-fits precisely (exact per-char spacing)
//      – square  → name wraps up to 3 lines, font auto-scales to fit width
//      – rectangle → name wraps up to 2 lines, font auto-scales
//  • Crisp double border, uppercase letter-spaced typography, official-seal feel
//  • One builder feeds BOTH the on-screen component and every print window
// ─────────────────────────────────────────────────────────────────────────────
export const STAMP_SHAPES = ['circle', 'square', 'rectangle'];

const escXml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svgText = (x, y, str, fs, color, { weight = 'bold', spacing = 0, family = 'Arial,Helvetica,sans-serif' } = {}) =>
  `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="central"
    fill="${color}" font-size="${fs.toFixed(2)}" font-family="${family}" font-weight="${weight}"
    letter-spacing="${spacing.toFixed(2)}">${escXml(str)}</text>`;

// Greedy word-wrap that shrinks the font until `text` fits within `maxLines` × `maxWidth`.
function fitWrapped(text, maxWidth, maxLines, maxFS, minFS, charRatio = 0.56) {
  const words = String(text || '').toUpperCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], fontSize: minFS };
  for (let fs = maxFS; fs >= minFS; fs -= 0.5) {
    const maxChars = Math.max(1, Math.floor(maxWidth / (fs * charRatio)));
    const lines = [];
    let cur = '', tooWide = false;
    for (const w of words) {
      if (w.length > maxChars) { tooWide = true; break; }
      const cand = cur ? `${cur} ${w}` : w;
      if (cand.length <= maxChars) cur = cand;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (!tooWide && lines.length <= maxLines) return { lines, fontSize: fs };
  }
  // fallback: hard-wrap at min font, clip to maxLines
  const maxChars = Math.max(1, Math.floor(maxWidth / (minFS * charRatio)));
  const lines = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length <= maxChars) cur = cand;
    else { lines.push(cur); cur = w; if (lines.length === maxLines) { cur = ''; break; } }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return { lines, fontSize: minFS };
}

// ── CIRCLE (classic official seal) ────────────────────────────────────────────
function circleStamp({ name, shortName, city, regNo, established, tagline, color, size }) {
  const c = color, cx = size / 2, cy = size / 2;
  // Concentric layout with clear breathing room:
  //   outer solid ring  →  gap  →  curved name band (textR)  →  gap  →  inner dotted ring
  const outerR = size / 2 - size * 0.03;   // solid outer ring
  const textR  = outerR * 0.855;           // curved text sits just inside the outer ring
  const innerR = outerR * 0.64;            // dotted ring pulled well inward (gap below the text)
  const CHAR = 0.56;        // glyph width ≈ fontSize × CHAR
  const SPACING = 1.24;     // extra spacing between letters (premium, airy feel)
  const STEP = CHAR * SPACING;

  const nameTxt = String(name || 'SCHOOL').toUpperCase().trim();
  const botTxt  = String(tagline || city || 'OFFICIAL SEAL').toUpperCase().trim();

  // Arc budgets. Kept ≤160° each so the top name and bottom tagline both stop
  // ~10° short of the side dots (at 3 & 9 o'clock) — they can never meet/overlap.
  const TOP_DEG = 160, BOT_DEG = 160;

  // Font size that fills (up to maxFS) the allotted arc for this text length.
  const arcFS = (txt, maxDeg, maxFS) => {
    if (!txt) return maxFS;
    const fs = ((maxDeg * Math.PI) / 180 * textR) / (txt.length * STEP);
    return Math.min(fs, maxFS);
  };
  const topFS = arcFS(nameTxt, TOP_DEG, size * 0.072);
  const botFS = arcFS(botTxt, BOT_DEG, size * 0.06);

  // Curved text. φ measured clockwise from 12 o'clock → x = cx + r·sinφ, y = cy − r·cosφ.
  // Top text reads L→R with upright letters. Bottom text sits on its OWN baseline
  // (rotated 180°) so it also reads upright L→R — the correct official-seal convention.
  // The arc span is HARD-CAPPED at maxDeg: for very long names the letters compress
  // (and the glyph size shrinks to match) so the text can NEVER wrap/overlap.
  const place = (text, fs, atBottom, maxDeg) => {
    if (!text) return '';
    const maxRad = (maxDeg * Math.PI) / 180;
    const step = Math.min((fs * STEP) / textR, maxRad / text.length); // never exceed the arc
    const drawFs = Math.min(fs, (step * textR) / CHAR);               // keep glyphs from touching
    const total = text.length * step;
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const phi = atBottom
        ? Math.PI + total / 2 - (i + 0.5) * step   // bottom arc, left → right
        : -total / 2 + (i + 0.5) * step;           // top arc, left → right
      const x = cx + textR * Math.sin(phi);
      const y = cy - textR * Math.cos(phi);
      const rot = (phi * 180) / Math.PI + (atBottom ? 180 : 0);
      out += `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="central"
        fill="${c}" font-size="${drawFs.toFixed(2)}" font-family="Arial,Helvetica,sans-serif" font-weight="bold"
        transform="rotate(${rot.toFixed(2)},${x.toFixed(2)},${y.toFixed(2)})">${escXml(text[i])}</text>`;
    }
    return out;
  };

  let center = String(shortName || '').toUpperCase().slice(0, 5);
  if (!center) center = nameTxt.split(/\s+/).map(w => w[0]).join('').slice(0, 4);
  const ctrFS = Math.min(size * 0.17, 26);
  const subTxt = established ? `EST. ${established}` : (regNo ? String(regNo).slice(0, 18) : '');
  const subFS = Math.min(size * 0.05, 8);

  const dots = [0, 180].map(d => {
    const a = (d * Math.PI) / 180, x = cx + textR * Math.cos(a), y = cy + textR * Math.sin(a);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(size * 0.02).toFixed(2)}" fill="${c}"/>`;
  }).join('');

  const circ = 2 * Math.PI * innerR, seg = (circ / 46).toFixed(2);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
    <circle cx="${cx}" cy="${cy}" r="${outerR.toFixed(2)}" fill="none" stroke="${c}" stroke-width="${(size * 0.03).toFixed(2)}"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR.toFixed(2)}" fill="none" stroke="${c}" stroke-width="${(size * 0.011).toFixed(2)}" stroke-dasharray="${seg} ${seg}"/>
    ${place(nameTxt, topFS, false, TOP_DEG)}
    ${place(botTxt, botFS, true, BOT_DEG)}
    ${dots}
    ${svgText(cx, cy - (subTxt ? ctrFS * 0.18 : 0), center, ctrFS, c, { spacing: size * 0.022 })}
    ${subTxt ? svgText(cx, cy + ctrFS * 0.62, subTxt, subFS, c, { weight: 'normal', spacing: size * 0.02 }) : ''}
  </svg>`;
}

// ── SQUARE / RECTANGLE (bordered seal, name wraps — great for long names) ─────
function boxStamp({ name, shortName, city, regNo, established, tagline, color, size, ratio, radius }) {
  const c = color;
  const W = size, H = Math.round(size * ratio);
  const pad = size * 0.11;
  const inset = size * 0.055;
  const contentW = W - pad * 2;

  const nameTxt = String(name || 'SCHOOL').toUpperCase().trim();
  const label   = String(tagline || 'OFFICIAL SEAL').toUpperCase().trim().slice(0, 24);
  const sub      = [city, established ? `EST. ${established}` : '', regNo]
    .filter(Boolean).map(s => String(s).toUpperCase()).join('   ·   ').slice(0, 46);

  const maxLines = ratio < 0.75 ? 2 : 3;
  const { lines, fontSize } = fitWrapped(nameTxt, contentW, maxLines, size * 0.155, size * 0.072);
  const labelFS = size * 0.055, subFS = size * 0.05, nameLH = fontSize * 1.14;

  // Vertical stack, centered
  const items = [];
  items.push({ str: label, fs: labelFS, weight: 'bold', sp: size * 0.03, h: labelFS * 1.4 });
  items.push({ gap: size * 0.03 });
  lines.forEach(l => items.push({ str: l, fs: fontSize, weight: 'bold', sp: size * 0.006, h: nameLH }));
  if (sub) { items.push({ gap: size * 0.025 }); items.push({ divider: true, h: size * 0.05 }); items.push({ gap: size * 0.02 }); items.push({ str: sub, fs: subFS, weight: 'normal', sp: size * 0.006, h: subFS * 1.4 }); }

  const total = items.reduce((s, i) => s + (i.h || i.gap || 0), 0);
  let y = (H - total) / 2, inner = '';
  for (const it of items) {
    if (it.gap) { y += it.gap; continue; }
    if (it.divider) {
      const dw = W * 0.30, my = y + it.h / 2;
      inner += `<line x1="${(W / 2 - dw / 2).toFixed(2)}" y1="${my.toFixed(2)}" x2="${(W / 2 + dw / 2).toFixed(2)}" y2="${my.toFixed(2)}" stroke="${c}" stroke-width="${(size * 0.008).toFixed(2)}"/>`;
      y += it.h; continue;
    }
    inner += svgText(W / 2, y + it.h / 2, it.str, it.fs, c, { weight: it.weight, spacing: it.sp });
    y += it.h;
  }

  const bw = size * 0.03, o = size * 0.02;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
    <rect x="${o}" y="${o}" width="${(W - o * 2).toFixed(2)}" height="${(H - o * 2).toFixed(2)}" rx="${radius}" fill="none" stroke="${c}" stroke-width="${bw.toFixed(2)}"/>
    <rect x="${inset}" y="${inset}" width="${(W - inset * 2).toFixed(2)}" height="${(H - inset * 2).toFixed(2)}" rx="${(radius * 0.7).toFixed(2)}" fill="none" stroke="${c}" stroke-width="${(size * 0.009).toFixed(2)}"/>
    ${inner}
  </svg>`;
}

// Stamps are always circular.
function buildStamp(opts) {
  return circleStamp(opts);
}

// Border-radius + height for an UPLOADED stamp image (always circular).
const imgShapeStyle = () => ({ radius: '50%', h: undefined });

const stampProps = (school, size) => ({
  name:      school.stampText || school.name,
  shortName: school.shortName,
  city:      school.city,
  regNo:     school.registrationNo,
  established: school.established,
  tagline:   school.tagline,
  color:     school.primaryColor || '#1d4ed8',
  size,
});

// ─────────────────────────────────────────────────────────────────────────────
// REACT COMPONENT — the school stamp is always a circular seal
// ─────────────────────────────────────────────────────────────────────────────
export function SchoolStamp({ size = 120, opacity = 0.92, className = '' }) {
  const { school } = useSchool();
  if (!school) return null;

  if (school.stamp) {
    return (
      <img
        src={`${API_BASE}${school.stamp}`}
        alt="Official Stamp"
        style={{ width: size, height: size, opacity, borderRadius: '50%' }}
        className={`object-contain ${className}`}
      />
    );
  }

  const svg = buildStamp(stampProps(school, size));
  return (
    <div
      style={{ opacity, display: 'inline-block', flexShrink: 0, lineHeight: 0 }}
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT HEADER (React UI)
// ─────────────────────────────────────────────────────────────────────────────
export function PrintHeader({ title, subtitle, showStamp = true }) {
  const { school } = useSchool();
  const logoUrl = school?.logo ? `${API_BASE}${school.logo}` : null;
  return (
    <div className="print-header flex items-center gap-4 pb-4 mb-4 border-b-2 border-slate-300">
      {logoUrl
        ? <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain flex-shrink-0"/>
        : <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {school?.shortName?.charAt(0) || school?.name?.charAt(0) || 'S'}
          </div>
      }
      <div className="flex-1 text-center">
        <div className="text-2xl font-bold text-slate-800 leading-tight">{school?.name || 'School'}</div>
        {school?.address && <div className="text-sm text-slate-500 mt-0.5">{school.address}</div>}
        <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-3">
          {school?.phone   && <span>📞 {school.phone}</span>}
          {school?.email   && <span>✉ {school.email}</span>}
          {school?.website && <span>🌐 {school.website}</span>}
        </div>
        {title    && <div className="mt-2 bg-slate-700 text-white text-sm font-semibold py-1 px-4 rounded inline-block">{title}</div>}
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      </div>
      {showStamp && school?.showStampOnFee !== false && (
        <div className="flex-shrink-0"><SchoolStamp size={80}/></div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAMP HTML STRING (for print windows)
// ─────────────────────────────────────────────────────────────────────────────
export function generateStampHTML(school, size = 88) {
  if (!school) return '';
  if (school.stamp) {
    return `<img src="${API_BASE}${school.stamp}"
      style="width:${size}px;height:${size}px;border-radius:50%;object-fit:contain;" alt="stamp"/>`;
  }
  return buildStamp(stampProps(school, size));
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD FULL PRINT PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function buildPrintPage(contentHtml, school = {}, title = '') {
  const color     = school?.primaryColor || '#1d4ed8';
  const logoUrl   = school?.logo ? `${API_BASE}${school.logo}` : null;
  const stampHtml = generateStampHTML(school, 88);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title} – ${school?.name || 'School'}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#f1f5f9;}
    .page{max-width:820px;margin:0 auto;padding:0;background:#fff;position:relative;
      box-shadow:0 10px 40px rgba(15,23,42,.10);border-radius:10px;overflow:hidden;}
    .accent-bar{height:7px;background:linear-gradient(90deg,${color},${color}aa);}
    .page-inner{padding:26px 30px;position:relative;z-index:1;}
    .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      pointer-events:none;z-index:0;opacity:.04;font-size:76px;font-weight:800;color:${color};
      transform:rotate(-18deg);text-transform:uppercase;letter-spacing:4px;white-space:nowrap;}
    .doc-header{display:flex;align-items:center;gap:18px;padding-bottom:14px;
      border-bottom:2px solid ${color};margin-bottom:18px;}
    .school-logo{width:70px;height:70px;object-fit:contain;border-radius:10px;}
    .logo-placeholder{width:70px;height:70px;border-radius:14px;background:linear-gradient(135deg,${color},${color}cc);
      color:#fff;font-size:28px;font-weight:bold;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px ${color}55;}
    .school-info{flex:1;text-align:center;}
    .school-name{font-size:23px;font-weight:800;color:#0f172a;letter-spacing:.3px;}
    .school-address{font-size:11px;color:#64748b;margin-top:3px;}
    .school-contact{font-size:10px;color:#94a3b8;margin-top:2px;}
    .doc-title{background:${color};color:#fff;padding:5px 22px;border-radius:99px;
      font-size:12px;font-weight:bold;display:inline-block;margin-top:8px;text-transform:uppercase;letter-spacing:1px;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;
      background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:12px;}
    .info-item label{font-size:10px;color:#94a3b8;text-transform:uppercase;
      letter-spacing:.5px;display:block;margin-bottom:1px;}
    .info-item span{font-size:13px;font-weight:600;color:#1e293b;}
    table{width:100%;border-collapse:collapse;margin-bottom:12px;}
    th{background:${color};color:#fff;padding:7px 10px;text-align:left;
      font-size:11px;text-transform:uppercase;letter-spacing:.5px;}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;}
    tr:nth-child(even) td{background:#f8fafc;}
    .badge{display:inline-block;padding:2px 9px;border-radius:99px;font-size:10px;font-weight:bold;}
    .badge-paid{background:#d1fae5;color:#065f46;}
    .badge-pending{background:#fef3c7;color:#92400e;}
    .badge-overdue{background:#fee2e2;color:#991b1b;}
    .badge-partial{background:#ede9fe;color:#4c1d95;}
    .sig-row{display:flex;justify-content:space-between;margin-top:44px;gap:16px;}
    .sig-box{flex:1;text-align:center;}
    .sig-line{border-top:1px solid #475569;margin-bottom:5px;height:30px;}
    .sig-label{font-size:10px;color:#64748b;}
    .doc-footer{text-align:center;margin-top:20px;padding-top:8px;
      border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff;}
      .no-print{display:none!important;}
      .page{box-shadow:none;border-radius:0;max-width:100%;}
    }
  </style>
</head>
<body>
<div class="page">
  <div class="accent-bar"></div>
  <div class="watermark">${escXml(school?.shortName || school?.name || '')}</div>
  <div class="page-inner">
    <div class="doc-header">
      ${logoUrl
        ? `<img src="${logoUrl}" class="school-logo" alt="Logo"/>`
        : `<div class="logo-placeholder">${school?.shortName?.charAt(0) || school?.name?.charAt(0) || 'S'}</div>`
      }
      <div class="school-info">
        <div class="school-name">${school?.name || 'School'}</div>
        <div class="school-address">${school?.address || ''}</div>
        <div class="school-contact">
          ${school?.phone    ? `📞 ${school.phone}` : ''}
          ${school?.email    ? `&nbsp;·&nbsp;✉ ${school.email}` : ''}
          ${school?.website  ? `&nbsp;·&nbsp;🌐 ${school.website}` : ''}
          ${school?.registrationNo ? `&nbsp;·&nbsp;Reg: ${school.registrationNo}` : ''}
        </div>
        <span class="doc-title">${title}</span>
      </div>
      <div style="flex-shrink:0;">${stampHtml}</div>
    </div>

    ${contentHtml}

    <div class="doc-footer">
      <strong>${school?.name || 'School'}</strong>${school?.tagline ? ` — ${school.tagline}` : ''}
      &nbsp;·&nbsp; Printed ${new Date().toLocaleString('en-PK')}
      &nbsp;·&nbsp; This is a system-generated document and does not require a physical signature unless stamped.
    </div>
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800);}</script>
</body></html>`;
}

export function openPrintWindow(htmlContent) {
  const win = window.open('', '_blank', 'width=920,height=720');
  if (!win) { alert('Please allow popups for printing.'); return; }
  win.document.write(htmlContent);
  win.document.close();
}
