// Central brand-theme injector.
//
// Shared by the authenticated <ThemeApplier> AND the pre-auth <Login> screen so
// a school's accent colour recolours BOTH the app and its sign-in page with one
// source of truth.
//
// It writes a single <style id="brand-theme"> tag that:
//   • exposes the accent as a small `--brand-*` shade ramp (consumed directly by
//     the sidebar, the login gradient and other bespoke gradients), and
//   • overrides every `primary-*` Tailwind utility the UI is built on (solid
//     backgrounds, text, borders, rings and all gradient from/via/to stops).
// Changing the colour therefore repaints buttons, headers, badges, the sidebar
// and the login screen instantly, with no reload.

export const FONT_SIZES = { small: '14px', medium: '16px', large: '18px' };
export const DEFAULT_ACCENT = '#1d4ed8';
const STORAGE_KEY = 'brandAccent';

/** Last accent applied on this browser (survives refresh + logout). */
export function savedAccent() {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
}

/**
 * The live accent as a concrete hex string — for places that can't use CSS
 * classes (e.g. Recharts fills/strokes). Read at RENDER time (not module load)
 * so it reflects the applied theme.
 */
export function brandColor() {
  if (typeof window === 'undefined') return DEFAULT_ACCENT;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
  return v || savedAccent() || DEFAULT_ACCENT;
}

/**
 * Inject / update the brand theme.
 * @param {string} accent    Hex accent colour (falls back to the default blue).
 * @param {string} [fontSize] 'small' | 'medium' | 'large'. Omit to leave the
 *                            root font-size untouched (e.g. on the login screen).
 */
export function applyBrandTheme(accent = DEFAULT_ACCENT, fontSize) {
  const color = accent || DEFAULT_ACCENT;
  // Remember the accent so a hard refresh (which wipes this injected <style>)
  // and the pre-auth login screen can restore it instantly, with no flash.
  try { localStorage.setItem(STORAGE_KEY, color); } catch { /* ignore */ }
  const id = 'brand-theme';
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }

  const mix = (pct, other) => `color-mix(in srgb, ${color} ${pct}%, ${other})`;
  const fromPos = 'var(--tw-gradient-from-position)';
  const toPos   = 'var(--tw-gradient-to-position)';
  const viaPos  = 'var(--tw-gradient-via-position)';

  el.textContent = `
    :root{
      --brand:${color};
      --brand-light:${mix(72, 'white')};
      --brand-50:${mix(10, 'white')};
      --brand-100:${mix(18, 'white')};
      --brand-mid:${mix(90, 'black')};
      --brand-dark:${mix(82, 'black')};
      --brand-darker:${mix(58, 'black')};
    }

    /* ── Solid backgrounds ─────────────────────────────────────────── */
    .bg-primary-50{background-color:var(--brand-50)!important;}
    .bg-primary-500{background-color:var(--brand-light)!important;}
    .bg-primary-600{background-color:var(--brand)!important;}
    .bg-primary-700{background-color:var(--brand-dark)!important;}
    .hover\\:bg-primary-600:hover{background-color:var(--brand)!important;}
    .hover\\:bg-primary-700:hover{background-color:var(--brand-dark)!important;}

    /* ── Solid backgrounds (light + hover) ─────────────────────────── */
    .bg-primary-100{background-color:var(--brand-100)!important;}
    .hover\\:bg-primary-50:hover{background-color:var(--brand-50)!important;}
    .hover\\:bg-primary-100:hover{background-color:var(--brand-100)!important;}

    /* ── Text ──────────────────────────────────────────────────────── */
    .text-primary-400,.text-primary-500,.text-primary-600,.text-primary-700,.text-primary-800{color:var(--brand)!important;}
    .hover\\:text-primary-600:hover,.hover\\:text-primary-700:hover{color:var(--brand-dark)!important;}

    /* ── Borders (incl. focus variant used by inputs) ──────────────── */
    .border-primary-300,.border-primary-400,.border-primary-500,.border-primary-600{border-color:var(--brand)!important;}
    .focus\\:border-primary-400:focus,.focus\\:border-primary-500:focus{border-color:var(--brand)!important;}

    /* ── Rings (light + focus variants) ────────────────────────────── */
    .ring-primary-200,.ring-primary-500,.focus\\:ring-primary-200:focus{--tw-ring-color:var(--brand)!important;}
    .ring-primary-100,.focus\\:ring-primary-100:focus{--tw-ring-color:var(--brand-100)!important;}

    /* ── Gradient FROM stops ───────────────────────────────────────── */
    .from-primary-50{--tw-gradient-from:var(--brand-50) ${fromPos}!important;}
    .from-primary-500,.from-primary-600{--tw-gradient-from:var(--brand) ${fromPos}!important;}
    .from-primary-700{--tw-gradient-from:var(--brand-dark) ${fromPos}!important;}
    .from-primary-800{--tw-gradient-from:var(--brand-darker) ${fromPos}!important;}
    .hover\\:from-primary-700:hover{--tw-gradient-from:var(--brand-dark) ${fromPos}!important;}
    .hover\\:from-primary-800:hover{--tw-gradient-from:var(--brand-darker) ${fromPos}!important;}

    /* ── Gradient VIA stops ────────────────────────────────────────── */
    .via-primary-600{--tw-gradient-stops:var(--tw-gradient-from), var(--brand) ${viaPos}, var(--tw-gradient-to)!important;}
    .via-primary-700{--tw-gradient-stops:var(--tw-gradient-from), var(--brand-dark) ${viaPos}, var(--tw-gradient-to)!important;}

    /* ── Gradient TO stops ─────────────────────────────────────────── */
    .to-primary-500{--tw-gradient-to:var(--brand-light) ${toPos}!important;}
    .to-primary-600{--tw-gradient-to:var(--brand) ${toPos}!important;}
    .to-primary-700{--tw-gradient-to:var(--brand-dark) ${toPos}!important;}
    .to-primary-800{--tw-gradient-to:var(--brand-darker) ${toPos}!important;}
    .hover\\:to-primary-600:hover{--tw-gradient-to:var(--brand) ${toPos}!important;}
  `;

  if (fontSize) {
    document.documentElement.style.fontSize = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  }
}
