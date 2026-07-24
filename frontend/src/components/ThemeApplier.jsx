import { useEffect } from 'react';
import { useSchool } from '../hooks/useSchool.jsx';

const FONT_SIZES = { small: '14px', medium: '16px', large: '18px' };

/**
 * Applies the school's saved Appearance settings (accent color + font size)
 * to the WHOLE app at runtime.
 *
 * The accent recolours every `primary-*` Tailwind utility the UI is built on
 * (solid backgrounds, text, borders, rings and — critically — all gradient
 * `from/via/to` stops), plus a set of `--brand-*` CSS variables that the
 * sidebar and other bespoke gradients consume directly. Changing the colour
 * therefore repaints the sidebar, headers, buttons, badges and accents across
 * the entire site instantly, with no reload.
 *
 * Font size scales all rem-based typography via the root font-size.
 */
export default function ThemeApplier() {
  const { school } = useSchool();
  const accent   = school?.primaryColor || '#1d4ed8';
  const fontSize = school?.fontSize || 'medium';

  // Font size → root font-size (rem units scale everything)
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZES[fontSize] || FONT_SIZES.medium;
    return () => { document.documentElement.style.fontSize = ''; };
  }, [fontSize]);

  // Accent → override the primary utility classes + expose brand variables
  useEffect(() => {
    const id = 'brand-theme';
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }

    const mix = (pct, other) => `color-mix(in srgb, ${accent} ${pct}%, ${other})`;
    // Shade ramp derived from the single accent colour.
    const fromPos = 'var(--tw-gradient-from-position)';
    const toPos   = 'var(--tw-gradient-to-position)';
    const viaPos  = 'var(--tw-gradient-via-position)';

    el.textContent = `
      :root{
        --brand:${accent};
        --brand-light:${mix(72, 'white')};
        --brand-50:${mix(10, 'white')};
        --brand-100:${mix(18, 'white')};
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

      /* ── Text ──────────────────────────────────────────────────────── */
      .text-primary-500,.text-primary-600,.text-primary-700,.text-primary-800{color:var(--brand)!important;}
      .hover\\:text-primary-600:hover,.hover\\:text-primary-700:hover{color:var(--brand-dark)!important;}

      /* ── Borders ───────────────────────────────────────────────────── */
      .border-primary-300,.border-primary-400,.border-primary-500,.border-primary-600{border-color:var(--brand)!important;}

      /* ── Rings ─────────────────────────────────────────────────────── */
      .ring-primary-200,.ring-primary-500,.focus\\:ring-primary-200:focus{--tw-ring-color:var(--brand)!important;}

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
  }, [accent]);

  return null;
}
