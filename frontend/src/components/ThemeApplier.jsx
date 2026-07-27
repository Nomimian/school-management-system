import { useEffect } from 'react';
import { useSchool } from '../hooks/useSchool.jsx';
import { applyBrandTheme } from '../config/theme.js';

/**
 * Applies the signed-in school's saved Appearance settings (accent colour +
 * font size) to the WHOLE app at runtime.
 *
 * The heavy lifting lives in config/theme.js (`applyBrandTheme`) which is shared
 * with the pre-auth Login screen, so the accent recolours the app and the
 * sign-in page from a single source of truth. See that file for the full list
 * of utilities/variables it drives.
 */
export default function ThemeApplier() {
  const { school } = useSchool();
  const accent   = school?.primaryColor || '#1d4ed8';
  const fontSize = school?.fontSize || 'medium';

  useEffect(() => {
    applyBrandTheme(accent, fontSize);
    return () => { document.documentElement.style.fontSize = ''; };
  }, [accent, fontSize]);

  return null;
}
