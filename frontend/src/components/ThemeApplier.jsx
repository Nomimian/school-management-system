import { useEffect } from 'react';
import { useSchool } from '../hooks/useSchool.jsx';

const FONT_SIZES = { small: '14px', medium: '16px', large: '18px' };

/**
 * Applies the school's saved Appearance settings (accent color + font size)
 * to the whole app at runtime. Accent recolours the Tailwind `primary`
 * utilities that the UI is built on (solid, text, border, gradient, ring).
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

  // Accent → override the primary utility classes used across the app
  useEffect(() => {
    const id = 'brand-theme';
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    const darker = `color-mix(in srgb, ${accent} 82%, black)`;
    el.textContent = `
      :root { --brand: ${accent}; --brand-dark: ${darker}; }
      .bg-primary-600,.bg-primary-500{background-color:var(--brand)!important;}
      .hover\\:bg-primary-700:hover,.hover\\:bg-primary-600:hover{background-color:var(--brand-dark)!important;}
      .text-primary-600,.text-primary-700,.text-primary-800{color:var(--brand)!important;}
      .hover\\:text-primary-700:hover{color:var(--brand-dark)!important;}
      .border-primary-600,.border-primary-500,.border-primary-400{border-color:var(--brand)!important;}
      .ring-primary-500,.focus\\:ring-primary-200:focus{--tw-ring-color:var(--brand)!important;}
      .from-primary-600,.from-primary-700{--tw-gradient-from:var(--brand) var(--tw-gradient-from-position)!important;}
      .to-primary-500,.to-primary-600{--tw-gradient-to:var(--brand) var(--tw-gradient-to-position)!important;}
      .hover\\:from-primary-700:hover{--tw-gradient-from:var(--brand-dark) var(--tw-gradient-from-position)!important;}
      .hover\\:to-primary-600:hover{--tw-gradient-to:var(--brand-dark) var(--tw-gradient-to-position)!important;}
    `;
  }, [accent]);

  return null;
}
